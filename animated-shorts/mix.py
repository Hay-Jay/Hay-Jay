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


def music(total):
    out = np.zeros(int(total * SR) + SR)
    midi = lambda m: 440 * 2 ** ((m - 69) / 12)
    chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]
    pattern = [0, 1, 2, 3, 2, 1, 2, 3]
    step = 60 / 104 / 2
    i = 0
    while i * step < total:
        chord = chords[(i // 8) % 4]
        note = chord[pattern[i % 8]] + 12
        t = np.arange(int(0.5 * SR)) / SR
        n = (np.sin(2 * np.pi * midi(note) * t) + 0.2 * np.sin(4 * np.pi * midi(note) * t)) * np.exp(-t * 7)
        s = int(i * step * SR); out[s:s + len(n)] += 0.5 * n
        if i % 8 == 0:
            t = np.arange(int(2.0 * SR)) / SR
            b = np.sin(2 * np.pi * midi(chord[0] - 24) * t) * np.exp(-t * 1.5)
            out[s:s + len(b)] += 0.6 * b[:len(out) - s]
        i += 1
    out = out[:int(total * SR)]
    fade = np.minimum(1, (total - np.arange(len(out)) / SR) / 1.2)
    return out * np.clip(fade, 0, 1)


def main(out):
    voice = read(os.path.join(out, "voice.wav"))
    total = len(voice) / SR
    mixd = voice.copy()
    rnd = np.random.default_rng(3)
    for e in json.load(open(os.path.join(out, "events.json"))):
        s = sfx(e["type"], rnd); i = max(0, int(e["t"] * SR))
        n = min(len(s), len(mixd) - i)
        if n > 0: mixd[i:i + n] += s[:n]
    m = music(total)
    mixd += 0.07 * m / max(1e-6, np.abs(m).max())
    mixd *= 0.95 / np.abs(mixd).max()
    with wave.open(os.path.join(out, "mix.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mixd * 32767).astype(np.int16).tobytes())
    print("  mixed audio")


if __name__ == "__main__":
    main(sys.argv[1])
