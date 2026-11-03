"""Step 3: mix voice + sound effects + a light synthesized music bed into mix.wav."""
import json, os, sys, wave
import numpy as np

SR = 24000


def read(path):
    with wave.open(path) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def tone(f0, f1, dur, decay, harm=0.0):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + harm * np.sin(2 * ph)) * np.exp(-t * decay)


def sfx(kind, rnd):
    if kind == "pop":
        return 0.45 * tone(900, 260, 0.11, 35)
    if kind == "bonk":
        return 0.5 * tone(260, 110, 0.3, 14, 0.4)
    if kind == "ding":
        t = np.arange(int(0.9 * SR)) / SR
        return 0.25 * (np.sin(2 * np.pi * 1318 * t) + 0.35 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 5)
    if kind == "buzz":
        t = np.arange(int(0.32 * SR)) / SR
        return 0.14 * np.sign(np.sin(2 * np.pi * 140 * t)) * np.minimum(1, (0.32 - t) * 20)
    if kind == "flat":
        t = np.arange(int(1.3 * SR)) / SR
        return 0.11 * np.sin(2 * np.pi * 1000 * t) * np.minimum(1, t * 40) * np.minimum(1, (1.3 - t) * 8)
    if kind == "whoosh":
        n = int(0.38 * SR)
        x = np.convolve(rnd.standard_normal(n), np.ones(12) / 12, mode="same")
        x = x - np.convolve(x, np.ones(80) / 80, mode="same")
        return 0.9 * x * np.sin(np.pi * np.arange(n) / n) ** 2
    return np.zeros(1)


# Music presets per channel: tempo, chord loop (MIDI notes), pluck vs pad, drum style
MUSIC = {
    "ocean":    dict(bpm=104, chords=[[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], pad=False, drums=None, level=0.07),
    "naija":    dict(bpm=112, chords=[[55, 59, 62, 67], [60, 64, 67, 72], [62, 66, 69, 74], [55, 59, 62, 67]], pad=False, drums="afro", level=0.09),
    "football": dict(bpm=126, chords=[[57, 60, 64, 69], [53, 57, 60, 65], [60, 64, 67, 72], [55, 59, 62, 67]], pad=False, drums="four", level=0.09),
    "whatif":   dict(bpm=84,  chords=[[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], pad=True, drums=None, level=0.08),
    "myth":     dict(bpm=78,  chords=[[50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60], [45, 49, 52, 57]], pad=False, drums=None, level=0.08),
}


def music(total, style):
    p = MUSIC.get(style, MUSIC["ocean"])
    out = np.zeros(int(total * SR) + 3 * SR)
    midi = lambda m: 440 * 2 ** ((m - 69) / 12)
    pattern = [0, 1, 2, 3, 2, 1, 2, 3]
    step = 60 / p["bpm"] / 2
    rnd = np.random.default_rng(1)

    def put(s, x, g):
        n = min(len(x), len(out) - s)
        if n > 0: out[s:s + n] += g * x[:n]

    i = 0
    while i * step < total:
        chord = p["chords"][(i // 8) % len(p["chords"])]
        s = int(i * step * SR)
        if p["pad"]:
            if i % 8 == 0:
                d = 8 * step + 0.5
                t = np.arange(int(d * SR)) / SR
                env = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6)
                x = sum(np.sin(2 * np.pi * midi(n) * t) + 0.3 * np.sin(2 * np.pi * midi(n) * 1.003 * t) for n in chord)
                put(s, x * env / len(chord), 0.9)
            if i % 2 == 0:
                note = chord[pattern[(i // 2) % 8]] + 24
                t = np.arange(int(0.8 * SR)) / SR
                put(s, np.sin(2 * np.pi * midi(note) * t) * np.exp(-t * 4), 0.25)
        else:
            note = chord[pattern[i % 8]] + 12
            t = np.arange(int(0.5 * SR)) / SR
            put(s, (np.sin(2 * np.pi * midi(note) * t) + 0.2 * np.sin(4 * np.pi * midi(note) * t)) * np.exp(-t * 7), 0.5)
        if i % 8 == 0:
            t = np.arange(int(2.0 * SR)) / SR
            put(s, np.sin(2 * np.pi * midi(chord[0] - 24) * t) * np.exp(-t * 1.5), 0.6)
        if p["drums"]:
            t = np.arange(int(0.25 * SR)) / SR
            kick = np.sin(2 * np.pi * np.cumsum(60 + 90 * np.exp(-t * 30)) / SR) * np.exp(-t * 12)
            hat = np.diff(rnd.standard_normal(int(0.05 * SR)), prepend=0) * np.exp(-np.arange(int(0.05 * SR)) / SR * 80)
            if p["drums"] == "four":
                if i % 2 == 0: put(s, kick, 0.9)
                if i % 4 == 2: put(s, np.diff(rnd.standard_normal(int(0.15 * SR)), prepend=0) * np.exp(-np.arange(int(0.15 * SR)) / SR * 25), 0.25)
                if i % 2 == 1: put(s, hat, 0.18)
            else:  # afro: kick on 1 and the "and" of 2, shaker on every 8th, clave-like tick
                if i % 8 in (0, 3, 4): put(s, kick, 0.8)
                put(s, hat, 0.14 if i % 2 else 0.08)
                if i % 8 in (2, 5, 7):
                    tt = np.arange(int(0.06 * SR)) / SR
                    put(s, np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt * 60), 0.12)
        i += 1
    out = out[:int(total * SR)]
    fade = np.minimum(1, (total - np.arange(len(out)) / SR) / 1.2)
    return out * np.clip(fade, 0, 1), p["level"]


def main(out):
    voice = read(os.path.join(out, "voice.wav"))
    total = len(voice) / SR
    mixd = voice.copy()
    rnd = np.random.default_rng(3)
    for e in json.load(open(os.path.join(out, "events.json"))):
        s = sfx(e["type"], rnd); i = max(0, int(e["t"] * SR))
        n = min(len(s), len(mixd) - i)
        if n > 0: mixd[i:i + n] += s[:n]
    style = json.load(open(os.path.join(out, "timeline.json"))).get("channel", "ocean")
    m, level = music(total, style)
    m = np.pad(m, (0, max(0, len(mixd) - len(m))))[:len(mixd)]
    mixd += level * m / max(1e-6, np.abs(m).max())
    mixd *= 0.95 / np.abs(mixd).max()
    with wave.open(os.path.join(out, "mix.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mixd * 32767).astype(np.int16).tobytes())
    print("  mixed audio")


if __name__ == "__main__":
    main(sys.argv[1])
