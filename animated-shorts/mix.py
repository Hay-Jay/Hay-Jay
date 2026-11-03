"""Step 3: mix voice + sound effects + a light synthesized music bed into mix.wav."""
import json, os, subprocess, sys, wave
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
    t = lambda d: np.arange(int(d * SR)) / SR
    lp = lambda x, k: np.convolve(x, np.ones(k) / k, mode="same")
    if kind == "boom":
        tt = t(1.4); f = 40 + 55 * np.exp(-tt * 6)
        return 0.75 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3) + 0.25 * lp(rnd.standard_normal(len(tt)), 60) * np.exp(-tt * 18)
    if kind == "stamp":
        tt = t(0.35); f = 70 + 90 * np.exp(-tt * 25)
        return 0.7 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14) + 0.35 * lp(rnd.standard_normal(len(tt)), 6) * np.exp(-tt * 60)
    if kind == "chime":
        tt = t(2.6)
        return 0.22 * sum(a * np.sin(2 * np.pi * 880 * r * tt) * np.exp(-tt * d) for r, a, d in [(1, 1, 1.6), (2.76, 0.5, 3), (5.4, 0.25, 5), (1.5, 0.4, 2)])
    if kind == "thunder":
        tt = t(3.2); n = rnd.standard_normal(len(tt))
        crack = (n - lp(n, 8)) * np.exp(-tt * 25)
        rumble = lp(lp(n, 120), 60) * 9 * np.exp(-tt * 1.1) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * tt + 2 * np.sin(2 * np.pi * 0.7 * tt)))
        return 0.55 * crack + 0.9 * rumble
    if kind == "shimmer":
        out = np.zeros(int(1.2 * SR))
        for _ in range(28):
            s0 = int(rnd.uniform(0, 0.8) * SR); f = rnd.uniform(1800, 5200); tt = t(0.25)
            seg = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18); out[s0:s0 + len(seg)] += seg[:len(out) - s0]
        return 0.07 * out
    if kind == "firewhoosh":
        tt = t(1.0); n = rnd.standard_normal(len(tt)); band = lp(n, 10) - lp(n, 60)
        crackle = (rnd.random(len(tt)) > 0.9985) * rnd.uniform(-1, 1, len(tt)); crackle = lp(crackle, 3) * 3
        return 1.6 * band * np.sin(np.pi * tt / 1.0) ** 1.5 + 0.5 * crackle * np.exp(-tt * 1.5)
    if kind == "smokeburst":
        tt = t(1.8); n = lp(rnd.standard_normal(len(tt)), 40)
        return 2.2 * n * np.minimum(1, tt / 0.08) * np.exp(-tt * 1.6) + 0.5 * sfx("boom", rnd)[:len(tt)]
    if kind == "hush":
        tt = t(1.4); n = rnd.standard_normal(len(tt)); air = n - lp(n, 4)
        return 0.05 * air * np.sin(np.pi * tt / 1.4)
    if kind == "quill":
        tt = t(1.3); n = rnd.standard_normal(len(tt)); hi = n - lp(n, 3)
        return 0.06 * hi * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * tt))) * np.minimum(1, (1.3 - tt) * 4)
    return np.zeros(1)


def reverb(x, secs=2.2, wet=0.32, seed=7):
    r = np.random.default_rng(seed); n = int(secs * SR)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / secs)); ir = np.convolve(ir, np.ones(6) / 6, mode="same")
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n; F = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:len(x)]
    return (1 - wet) * x + wet * y * 0.6


def harp(freq, dur, rnd, decay=0.997):
    n = int(dur * SR); N = max(2, int(SR / freq)); buf = rnd.uniform(-1, 1, N); buf = np.convolve(buf, [0.3, 0.4, 0.3], mode="same")
    out = np.empty(n)
    for i in range(0, n, N):
        out[i:i + N] = buf[:min(N, n - i)]; buf = decay * 0.5 * (buf + np.roll(buf, -1))
    return out * np.exp(-np.arange(n) / SR * 1.2)


def music_myth(total):
    """Epic-ancient bed: harp arpeggios, a slow string pad and a frame drum, with reverb."""
    rnd = np.random.default_rng(5)
    out = np.zeros(int(total * SR) + 4 * SR)
    midi = lambda m: 440 * 2 ** ((m - 69) / 12)
    chords = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]   # Dm, Bb, C, A
    bpm = 76; beat = 60 / bpm; bar = 4 * beat
    def put(s, x, g):
        k = min(len(x), len(out) - s)
        if k > 0: out[s:s + k] += g * x[:k]
    nbars = int(total / bar) + 1
    for b in range(nbars):
        ch = chords[b % 4]; s = int(b * bar * SR)
        # strings: detuned harmonic-rich tones with slow attack
        tt = np.arange(int((bar + 1.0) * SR)) / SR; env = np.minimum(1, tt / 0.9) * np.minimum(1, (bar + 1.0 - tt) / 0.9)
        pad = np.zeros(len(tt))
        for m in ch + [ch[0] - 12]:
            for det in (0.997, 1.0, 1.004):
                f = midi(m) * det; vib = 1 + 0.003 * np.sin(2 * np.pi * 5 * tt)
                ph = 2 * np.pi * np.cumsum(f * vib) / SR
                pad += sum(np.sin(h * ph) / h for h in range(1, 6))
        put(s, np.convolve(pad, np.ones(8) / 8, mode="same") * env / 14, 0.55)
        # harp arpeggio, eighth notes up and down two octaves
        notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 24, ch[0] + 24, ch[2] + 12]
        for k, nn in enumerate(notes):
            put(s + int(k * beat / 2 * SR), harp(midi(nn), 1.6, rnd), 0.32)
        # frame drum on 1 and the "and" of 3
        for at, g in ((0, 0.9), (2.5, 0.5)):
            tt2 = np.arange(int(0.6 * SR)) / SR; f = 55 + 70 * np.exp(-tt2 * 20)
            drum = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt2 * 7) + 0.15 * np.convolve(rnd.standard_normal(len(tt2)), np.ones(30) / 30, mode="same") * np.exp(-tt2 * 30)
            put(s + int(at * beat * SR), drum, g)
    out = reverb(out[:int(total * SR)], 2.6, 0.38)
    fade = np.minimum(1, (total - np.arange(len(out)) / SR) / 1.5)
    return out * np.clip(fade, 0, 1)


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


def user_track(style, total):
    """Use your own music if a file is in assets/music/<account>/ (mp3/wav/m4a). The first file, looped and faded."""
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "music", style)
    files = sorted(f for f in (os.listdir(d) if os.path.isdir(d) else []) if f.lower().endswith((".mp3", ".wav", ".m4a", ".ogg")))
    if not files:
        return None
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(d, files[0]), "-f", "s16le", "-ac", "1", "-ar", str(SR), "pipe:1"], capture_output=True, check=True)
    x = np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768
    n = int(total * SR)
    x = np.tile(x, n // max(1, len(x)) + 1)[:n]
    fade = np.minimum(1, (total - np.arange(n) / SR) / 1.5)
    print(f"  music: {files[0]}")
    return x * np.clip(fade, 0, 1)


def main(out):
    voice = read(os.path.join(out, "voice.wav"))
    total = len(voice) / SR
    mixd = voice.copy()
    style = json.load(open(os.path.join(out, "timeline.json"))).get("channel", "ocean")
    rnd = np.random.default_rng(3)
    fx = np.zeros_like(voice)
    for e in json.load(open(os.path.join(out, "events.json"))):
        s = sfx(e["type"], rnd); i = max(0, int(e["t"] * SR))
        n = min(len(s), len(fx) - i)
        if n > 0: fx[i:i + n] += s[:n]
    mixd += reverb(fx, 1.8, 0.25) if style == "myth" else fx
    track = user_track(style, total)
    if track is not None:
        m, level = track, 0.22
    elif style == "myth":
        m, level = music_myth(total), 0.16
    else:
        m, level = music(total, style)
    m = np.pad(m, (0, max(0, len(mixd) - len(m))))[:len(mixd)]
    # duck the music under the narration
    venv = np.convolve(np.abs(voice), np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
    duck = 1 - 0.45 * np.clip(venv / 0.06, 0, 1)
    mixd += level * duck * m / max(1e-6, np.abs(m).max())
    mixd *= 0.95 / np.abs(mixd).max()
    with wave.open(os.path.join(out, "mix.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mixd * 32767).astype(np.int16).tobytes())
    print("  mixed audio")


if __name__ == "__main__":
    main(sys.argv[1])
