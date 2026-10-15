"""Shared sound kit for the MONOCHROME films: the instruments and effects of marketing/launch-video/audio/make_audio.py, plus a
configurable beat (build_beat) and the mix and stems writer (finish). Everything is synthesised: no samples, no third-party music.

    import sys; sys.path.insert(0, '../../lib'); import mcsound as M
    M.setup(dur=27.2, bpm=150, bar1=0.8)
"""
import json
import os

import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as sg

SR = 48000
DUR = 24.0
N = int(SR * DUR)
rng = np.random.default_rng(1983)

# ---- musical grid: 150 BPM, bar 1 starts at 0.8 s so the drop lands on the cut at 2.4 s ------------------------------------------------
BPM = 150
BEAT = 60 / BPM          # 0.4 s
STEP = BEAT / 4          # a 16th, 0.1 s
BAR = BEAT * 4           # 1.6 s
T0 = 0.8


def setup(dur, bpm=150, bar1=0.8, seed=1983):
    """Length of the film, tempo and where bar 1 starts. Call before anything else."""
    global DUR, N, BPM, BEAT, STEP, BAR, T0, rng
    DUR, N, BPM, T0 = float(dur), int(SR * float(dur)), bpm, bar1
    BEAT = 60 / BPM; STEP = BEAT / 4; BAR = BEAT * 4
    rng = np.random.default_rng(seed)
    EVENTS.clear()


FPS = 30


def fr(t):
    """The time of the first video frame at or after t: effects start on the frame where their picture lands."""
    import math
    return math.ceil(t * FPS - 1e-6) / FPS


def bt(bar, step=0.0):
    """Time of a 16th step inside a bar (bar 1 starts at T0)."""
    return T0 + (bar - 1) * BAR + step * STEP


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


# ---- buffers and placement ------------------------------------------------------------------------------------------------------------
def buf():
    return np.zeros((N, 2))


def pan2(x, pan):
    """Constant-power pan of a mono signal: -1 left, 0 centre, 1 right."""
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def place(b, t, sig, gain=1.0, pan=0.0):
    if sig.ndim == 1:
        sig = pan2(sig, pan)
    i = int(round(t * SR))
    if i >= N:
        return
    j0 = max(0, -i)
    i = max(0, i)
    n = min(len(sig) - j0, N - i)
    if n > 0:
        b[i:i + n] += sig[j0:j0 + n] * gain


def env_ad(n, a=0.002, d=0.2):
    t = tt(n)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))


def fade_edges(x, fi=0.002, fo=0.01):
    n = len(x)
    e = np.ones(n)
    a, b = int(fi * SR), int(fo * SR)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if b:
        e[-b:] = np.minimum(e[-b:], np.linspace(1, 0, b))
    return x * (e if x.ndim == 1 else e[:, None])


def bp(x, lo, hi, order=2):
    return sg.sosfilt(sg.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x, axis=0)


def hp(x, f, order=2):
    return sg.sosfilt(sg.butter(order, f / (SR / 2), 'high', output='sos'), x, axis=0)


def lp(x, f, order=2):
    return sg.sosfilt(sg.butter(order, min(f, SR / 2 * 0.95) / (SR / 2), 'low', output='sos'), x, axis=0)


def sweep_lp(x, f_of_t, block=256, order=2):
    """Low-pass whose cutoff follows f_of_t (an array of N cutoffs, Hz), processed in blocks with carried filter state."""
    y = np.zeros_like(x)
    zi = None
    for s in range(0, len(x), block):
        fc = float(np.clip(f_of_t[min(s, len(f_of_t) - 1)], 40, SR / 2 * 0.95))
        sos = sg.butter(order, fc / (SR / 2), 'low', output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2, x.shape[1]))
        y[s:s + block], zi = sg.sosfilt(sos, x[s:s + block], axis=0, zi=zi)
    return y


def sweep_bp(x, lo, hi, block=128):
    """Band-pass of a mono signal whose corner frequencies (arrays, Hz, one per sample) move, with carried filter state."""
    y = np.zeros_like(x)
    zi = None
    for s in range(0, len(x), block):
        k = min(s, len(x) - 1)
        a = float(np.clip(lo[k], 30, SR / 2 * 0.9))
        b = float(np.clip(hi[k], a * 1.2, SR / 2 * 0.95))
        sos = sg.butter(2, [a / (SR / 2), b / (SR / 2)], 'band', output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        y[s:s + block], zi = sg.sosfilt(sos, x[s:s + block], zi=zi)
    return y


def noise(n):
    return rng.standard_normal(n)


def saw(f, n, phase0=0.0):
    """Band-limited (polyBLEP) sawtooth with a per-sample frequency array or constant."""
    f = np.broadcast_to(np.asarray(f, float), (n,))
    dt = f / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    # polyBLEP around the wrap
    m1 = ph < dt
    x = ph[m1] / dt[m1]
    y[m1] -= x + x - x * x - 1
    m2 = ph > 1 - dt
    x = (ph[m2] - 1) / dt[m2]
    y[m2] -= x * x + x + x + 1
    return y


def reverb_ir(rt60=1.8, pre=0.018, damp=5500, seed=3):
    r = np.random.default_rng(seed)
    n = int((rt60 * 1.2) * SR)
    t = tt(n)
    e = np.exp(-6.91 * t / rt60)
    ir = r.standard_normal((n, 2)) * e[:, None]
    ir = lp(ir, damp)
    # darker as it decays
    ir = ir * (1 - 0.5 * np.minimum(1, t / rt60))[:, None]
    ir = np.concatenate([np.zeros((int(pre * SR), 2)), ir])
    ir[int(pre * SR)] += [0.5, 0.35]
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def conv_stereo(x, ir):
    y = np.zeros((len(x), 2))
    for c in range(2):
        y[:, c] = sg.fftconvolve(x[:, c], ir[:, c])[:len(x)]
    return y


def pingpong(x, d=0.3, fb=0.45, taps=6, tone=4000):
    y = np.zeros_like(x)
    src = lp(x.mean(axis=1), tone)
    for k in range(1, taps + 1):
        dl = int(round(d * k * SR))
        if dl >= len(x):
            break
        g = fb ** k
        side = 0 if k % 2 else 1
        y[dl:, side] += src[:len(x) - dl] * g
    return y


# ======================================================================================================================================
# INSTRUMENTS
# ======================================================================================================================================
def kick(dur=0.32, punch=1.0):
    n = int(dur * SR)
    t = tt(n)
    f = 46 + 150 * np.exp(-t * 38)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    click = hp(noise(n), 2500) * np.exp(-t * 420) * 0.5 * punch
    return np.tanh(1.8 * (body + click)) * 0.9


def clap(dur=0.45):
    n = int(dur * SR)
    t = tt(n)
    nz = bp(noise(n), 900, 5200)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022, 0.031]):
        i = int(off * SR)
        e[i:] += np.exp(-(t[:n - i]) * (160 if k < 3 else 16)) * (0.8 if k < 3 else 1.0)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 38) * 0.45
    snap = hp(noise(n), 3500) * np.exp(-t * 70) * 0.35
    return np.tanh(1.4 * (nz * e * 0.55 + body + snap))


HAT_F = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * 1.65


def hat(open_=False, vel=1.0):
    dur = 0.32 if open_ else 0.06
    n = int(dur * SR)
    t = tt(n)
    sq = sum(np.sign(np.sin(2 * np.pi * f * t + i)) for i, f in enumerate(HAT_F))
    x = bp(sq * 0.4 + noise(n) * 0.6, 6800, 15500, order=2)
    e = np.exp(-t * (9 if open_ else 75))
    return x * e * vel * 0.55


def fm_bell(f, dur=1.5, idx=3.2, ratio=3.5):
    n = int(dur * SR)
    t = tt(n)
    mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t * 5.5)
    car = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 3.2)
    shine = np.sin(2 * np.pi * f * 2.756 * t) * np.exp(-t * 9) * 0.28
    tick = np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 60) * 0.18
    return fade_edges((car + shine + tick) * np.minimum(1, t / 0.0015), 0.0005, 0.05)


def bell_st(f, dur=1.5, cents=7):
    a = fm_bell(f * 2 ** (cents / 1200), dur)
    b = fm_bell(f * 2 ** (-cents / 1200), dur)
    return np.stack([a * 0.9 + b * 0.25, b * 0.9 + a * 0.25], axis=1)


def supersaw_note(f, dur, voices=7, spread=0.22):
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for v in range(voices):
        det = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
        x = saw(f * 2 ** (det / 12), n, phase0=rng.random())
        p = -0.8 + 1.6 * v / (voices - 1)
        out += pan2(x, p)
    return out / voices


# ---- the 808: one monophonic line with gliding pitch and retriggered envelope ---------------------------------------------------------
def line_808(notes, drive=1.7, decay=0.5):
    """notes: (t, midi, length_s, glide_from_midi or None)."""
    f = np.zeros(N)
    amp = np.zeros(N)
    notes = sorted(notes)
    for k, (t, m, ln, gfrom) in enumerate(notes):
        i0 = int(t * SR)
        i1 = int(min(DUR, t + ln) * SR)
        if k + 1 < len(notes):
            i1 = min(i1, int(notes[k + 1][0] * SR))
        n = i1 - i0
        if n <= 0:
            continue
        x = tt(n)
        target = hz(m)
        if gfrom is not None:
            fr = target + (hz(gfrom) - target) * np.exp(-x / 0.055)
        else:
            fr = target * (1 + 0.35 * np.exp(-x * 70))  # a little punch at the start
        f[i0:i1] = fr
        e = np.exp(-x / decay)
        rel = int(0.025 * SR)
        if n > rel:
            e[-rel:] *= np.linspace(1, 0, rel)
        a = int(0.003 * SR)
        e[:a] *= np.linspace(0, 1, a)
        amp[i0:i1] = e
    ph = 2 * np.pi * np.cumsum(f) / SR
    raw = np.sin(ph) + 0.12 * np.sin(2 * ph)
    y = np.tanh(drive * raw) / np.tanh(drive) * amp
    y = hp(lp(y, 5200), 28)
    return y


EVENTS = []


def ev(t, kind, note=''):
    EVENTS.append({'t': round(fr(t), 3), 'kind': kind, 'note': note})


def sfx_click(vel=1.0, bright=4200):
    n = int(0.03 * SR)
    t = tt(n)
    x = bp(noise(n), bright * 0.6, min(bright * 1.8, 20000)) * np.exp(-t * 380)
    body = np.sin(2 * np.pi * (1500 + rng.random() * 400) * t) * np.exp(-t * 260) * 0.35
    return (x + body) * vel


def typewriter_key(vel=1.0):
    n = int(0.09 * SR)
    t = tt(n)
    clack = bp(noise(n), 1200, 6000) * np.exp(-t * 160)
    thud = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 55) * 0.6
    return np.tanh((clack + thud) * 1.3) * vel


def beep(f, dur=0.12, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sign(np.sin(2 * np.pi * f * t))
    return fade_edges(x * np.exp(-t * 8), 0.003, 0.02) * vel


def whoosh(dur, peak, f_lo=300, f_hi=3500, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    k = np.clip(t / dur, 0, 1)
    pk = peak / dur
    env = np.where(k < pk, (k / pk) ** 2, np.exp(-(k - pk) * 7))
    expo = np.where(k < pk, k / pk, np.maximum(0, 1 - (k - pk) * 1.5))
    fc = f_lo * (f_hi / f_lo) ** expo
    y = sweep_bp(noise(n), np.maximum(60, fc * 0.6), np.minimum(fc * 1.7, 20000))
    return y * env * vel


def boom(vel=1.0, dur=1.4, f0=58):
    n = int(dur * SR)
    t = tt(n)
    f = f0 * 0.6 + f0 * np.exp(-t * 7)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    crack = bp(noise(n), 200, 6000) * np.exp(-t * 30) * 0.9
    click = hp(noise(n), 4000) * np.exp(-t * 300) * 0.5
    return np.tanh(1.6 * (sub + crack + click)) * vel


def slam(vel=1.0):
    n = int(0.5 * SR)
    t = tt(n)
    f = 70 + 110 * np.exp(-t * 45)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    crack = bp(noise(n), 700, 7000) * np.exp(-t * 55)
    ring = np.sin(2 * np.pi * 1730 * t) * np.exp(-t * 18) * 0.12 + np.sin(2 * np.pi * 2460 * t) * np.exp(-t * 22) * 0.08
    return np.tanh(1.7 * (body + crack * 0.8 + ring)) * vel


def stamp_thump(vel=1.0):
    n = int(0.28 * SR)
    t = tt(n)
    f = 85 + 70 * np.exp(-t * 60)
    thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26)
    slap = bp(noise(n), 500, 3200) * np.exp(-t * 95) * 0.9
    return np.tanh(1.8 * (thud + slap)) * vel


def shutter(vel=1.0):
    n = int(0.16 * SR)
    t = tt(n)
    y = np.zeros(n)
    for off, g in ((0.0, 1.0), (0.055, 0.8)):
        i = int(off * SR)
        m = n - i
        c = bp(noise(m), 2500, 9000) * np.exp(-tt(m) * 420) + np.sin(2 * np.pi * 3400 * tt(m)) * np.exp(-tt(m) * 140) * 0.3
        y[i:] += c * g
    whirr = bp(noise(n), 800, 2400) * np.exp(-((t - 0.03) / 0.02) ** 2) * 0.35
    return (y + whirr) * vel


def zap(vel=1.0):
    n = int(0.12 * SR)
    t = tt(n)
    f = 3200 * (180 / 3200) ** (t / 0.12)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)
    return (x + hp(noise(n), 3000) * np.exp(-t * 90) * 0.4) * vel


def glitch(dur=0.14, vel=1.0):
    n = int(dur * SR)
    x = np.zeros(n)
    i = 0
    while i < n:
        seg_n = int(rng.uniform(0.006, 0.022) * SR)
        kind = rng.integers(3)
        tseg = tt(seg_n)
        if kind == 0:
            s = np.sign(np.sin(2 * np.pi * rng.uniform(300, 2600) * tseg))
        elif kind == 1:
            s = np.repeat(noise(seg_n // 12 + 1), 12)[:seg_n]
        else:
            s = np.zeros(seg_n)
        x[i:i + seg_n] = s[:max(0, min(seg_n, n - i))] * rng.uniform(0.4, 1.0)
        i += seg_n
    return lp(x, 9000) * vel * 0.6


def shimmer(dur=0.6, vel=1.0, f0=2200, f1=6400):
    n = int(dur * SR)
    t = tt(n)
    y = np.zeros(n)
    for k in range(9):
        ts = k / 9 * dur * 0.75
        i = int(ts * SR)
        m = n - i
        f = f0 * (f1 / f0) ** (k / 8)
        y[i:] += np.sin(2 * np.pi * f * tt(m)) * np.exp(-tt(m) * 9) * (0.5 + 0.5 * rng.random())
    return y * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.5 * vel * 0.35


def swipe(dur=1.0, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    k = t / dur
    env = np.sin(np.pi * k) ** 1.5
    return bp(noise(n), 1200, 5200) * env * vel * 0.25


def tap(vel=1.0):
    n = int(0.08 * SR)
    t = tt(n)
    tock = np.sin(2 * np.pi * 1150 * t) * np.exp(-t * 70)
    click = hp(noise(n), 3000) * np.exp(-t * 500) * 0.6
    return (tock + click) * vel


def bloop(vel=1.0):
    a = beep(hz(85), 0.14, 1.0)
    b = beep(hz(92), 0.22, 0.9)
    y = np.zeros(int(0.32 * SR))
    y[:len(a)] += a
    i = int(0.08 * SR)
    y[i:i + len(b)] += b[:len(y) - i]
    return y * vel


def scan(dur, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    pos = (np.sin(np.clip(t / dur, 0, 1) * np.pi * 1.5 - np.pi / 2) + 1) / 2
    f = 520 + 520 * pos
    hum = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    buzz = bp(noise(n), 2000, 7000) * 0.25
    return fade_edges((hum * 0.4 + buzz) * vel, 0.05, 0.15)


def data_chatter(dur, rate=28, vel=1.0):
    n = int(dur * SR)
    y = np.zeros(n)
    tcur = 0.0
    while tcur < dur:
        f = rng.choice([1320, 1760, 2093, 2637, 3136])
        b = beep(f, 0.03, rng.uniform(0.3, 0.8))
        i = int(tcur * SR)
        m = min(len(b), n - i)
        if m > 0:
            y[i:i + m] += b[:m]
        tcur += rng.exponential(1 / rate)
    return y * vel


def typing(text, t0, t1, out, key=sfx_click, vel=0.5, pan=0.0, name=''):
    chars = len(text)
    if chars == 0:
        return
    for c in range(chars):
        # the film reveals round(len * k) characters: character c appears when k passes (c + 0.5) / len
        tc = t0 + (t1 - t0) * (c + 0.5) / chars
        if text[c] == ' ':
            continue
        place(out, fr(tc), key(rng.uniform(0.7, 1.0)), vel, pan=pan + rng.uniform(-0.1, 0.1))
    ev(fr(t0), 'typing', name or text)




# ======================================================================================================================================
# MORE EFFECTS
# ======================================================================================================================================
def page_turn(vel=1.0, dur=0.34):
    """A magazine page turning: the air of the lifting sheet, then the soft slap of it landing (at the end)."""
    n = int(dur * SR)
    t = tt(n)
    k = t / dur
    air = sweep_bp(noise(n), 900 + 2600 * k, 3200 + 5200 * k) * np.sin(np.pi * np.clip(k, 0, 1)) ** 1.4 * 0.55
    crinkle = bp(noise(n), 3500, 9000) * (np.abs(np.sin(2 * np.pi * 37 * t)) ** 6) * np.sin(np.pi * k) * 0.25
    land = np.zeros(n)
    i = int(0.82 * n)
    m = n - i
    land[i:] = (bp(noise(m), 300, 2200) * np.exp(-tt(m) * 60) + np.sin(2 * np.pi * 140 * tt(m)) * np.exp(-tt(m) * 45) * 0.5)
    return (air + crinkle + land * 0.8) * vel


def flap_clack(vel=1.0, heavy=False):
    """A split-flap display leaf falling: a hard plastic tick and a short rattle (heavy: the whole board slamming in)."""
    n = int((0.16 if not heavy else 0.4) * SR)
    t = tt(n)
    y = np.zeros(n)
    for off, g in ((0.0, 1.0), (0.018, 0.55), (0.034, 0.3)) if not heavy else ((0.0, 1.0), (0.012, 0.8), (0.026, 0.7), (0.041, 0.5), (0.06, 0.35)):
        i = int(off * SR)
        m = n - i
        y[i:] += (bp(noise(m), 1800, 7500) * np.exp(-tt(m) * 260) + np.sin(2 * np.pi * (2300 + 300 * rng.random()) * tt(m)) * np.exp(-tt(m) * 180) * 0.35) * g
    body = np.sin(2 * np.pi * (420 if not heavy else 160) * t) * np.exp(-t * (90 if not heavy else 22)) * (0.35 if not heavy else 0.8)
    return np.tanh((y + body) * 1.4) * vel


def riser(t0, t1, gain=0.35):
    n = int((t1 - t0) * SR)
    x = tt(n)
    k = x / (t1 - t0)
    fc = 400 * (9000 / 400) ** k
    y = sweep_bp(noise(n), fc * 0.7, np.minimum(fc * 1.4, 20000))
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.2 * k)) / SR) * 0.25
    return pan2((y * 0.8 + tone) * k ** 2, 0) * gain


def rev_cym(dur=1.0):
    n = int(dur * SR)
    x = hp(noise(n), 5000) * np.exp(-tt(n) * 4.5)
    x = x[::-1]
    return np.stack([x, np.roll(x, 37)], axis=1)


def crash():
    n = int(1.8 * SR)
    x = bp(noise(n), 3000, 16000) * np.exp(-tt(n) * 2.2)
    return np.stack([x, np.roll(x, 53)], axis=1) * 0.35


# ======================================================================================================================================
# A BEAT FOR ANY TIMELINE
# ======================================================================================================================================
CH = {
    'Cm': (37, [49, 52, 56, 59], (73, 76, 80, 71)),   # C#m7
    'A':  (33, [45, 49, 52, 56], (69, 73, 76, 68)),   # Amaj7
    'B':  (35, [47, 51, 54, 57], (71, 75, 78, 69)),   # B7
    'E':  (40, [52, 56, 59, 63], (76, 80, 83, 75)),   # Emaj7
}
BELLS = {
    'Cm': [(0, 80), (3, 76), (6, 85), (8, 80), (10, 83), (12, 80), (14, 78)],
    'Cm2': [(0, 80), (3, 76), (6, 85), (8, 87), (10, 85), (12, 83), (14, 80)],
    'A': [(0, 81), (3, 76), (6, 85), (8, 81), (10, 83), (12, 81), (14, 76)],
    'B': [(0, 83), (3, 78), (6, 87), (8, 83), (10, 85), (12, 87), (14, 90)],
    'E': [(0, 83), (3, 80), (6, 88), (8, 83), (10, 85), (12, 83), (14, 80)],
}
RIFF = [(0, 0), (2, 0), (3, 1), (5, 0), (6, 2), (8, 2), (10, 1), (11, 0), (13, 3), (14, 0)]


def build_beat(cfg):
    """An original rage/trap beat on the grid set by setup(). cfg (bars count from bar 1 at bar1 seconds):
       loop: chord names, one per bar from bar 2 (default C#m C#m A B); last: the bar of the final hit;
       full / thin / hook / bells / pad: sets of bars (thin = 808, kick and clap, no hats);
       intro_until: bells and pad open from a low-pass up to this second; stabs: [(t, vel)] kick + 808 hits off the grid;
       fills / crashes: [t]; risers: [(a, b, gain)]; revcyms: [(t_peak, dur, gain)]; gaps: [(a, b)] silence but effects;
       mute: [(a, b, stems)]; muffle: [(a, b, lo, hi, stems)] a band-passed stretch (a phone speaker, a wall);
       end_fade: second where everything starts to fade to the end; backbeat: claps on 2 and 4 (not half-time);
       hat16: hi-hats on every 16th."""
    loop = cfg.get('loop', ['Cm', 'Cm', 'A', 'B'])
    last = cfg['last']
    full, thin, hook = set(cfg.get('full', ())), set(cfg.get('thin', ())), set(cfg.get('hook', ()))
    bells_on = set(cfg.get('bells', range(1, last)))
    pad_on = set(cfg.get('pad', range(1, last)))
    chord_of = lambda bar: loop[0] if bar <= 1 else loop[(bar - 2) % len(loop)]
    drums, bells, lead, pad, fx = buf(), buf(), buf(), buf(), buf()
    kicks, notes808 = [], []
    K, CL = kick(), clap()
    hats = {v: hat(False, v) for v in (0.45, 0.6, 0.75, 0.9, 1.0)}
    ohat = hat(True, 0.8)
    for bar in range(1, last + 1):
        ch = chord_of(bar)
        root, padn, tones = CH[ch]
        if bar >= last:
            break
        if bar in full or bar in thin:
            alt = bar % 2 == 0
            pat = [(0, root, 0.62, None), (7, root, 0.28, None), (10, root + 12, 0.38, root), (14, root - 5 if alt else root + 7, 0.2, None)]
            if bar in thin:
                pat = [(0, root, 0.9, None), (10, root + 12, 0.5, root)]
            for s, m, ln, g in pat:
                tm = bt(bar, s)
                if tm >= DUR:
                    continue
                notes808.append((tm, m, ln, g))
                if s in (0, 7, 10):
                    place(drums, tm, K, 0.95 if s == 0 else 0.8)
                    kicks.append(tm)
            for s in ((4, 12) if cfg.get('backbeat') else (8,)):
                place(drums, bt(bar, s), CL, 0.75)
            if bar % 2 == 1 and bar in full:
                place(drums, bt(bar, 15), CL, 0.22, pan=0.15)
            if bar in full:
                for s in range(0, 16, 1 if cfg.get('hat16') else 2):
                    if bar % 2 == 0 and s >= 12:
                        continue
                    place(drums, bt(bar, s), hats[0.9 if s % 4 == 0 else (0.6 if s % 2 == 0 else 0.45)], 1.0, pan=0.28)
                if bar % 2 == 0:
                    if bar % 4 == 0:
                        for k in range(8):
                            place(drums, bt(bar, 12 + k * 0.5), hats[0.45 if k < 4 else 0.75], 0.9, pan=0.28 + 0.03 * k)
                    else:
                        for k in range(6):
                            place(drums, bt(bar, 12 + k * 4 / 6), hats[0.6], 1.0, pan=0.22)
            if bar in hook:
                place(drums, bt(bar, 6), ohat, 0.55, pan=-0.3)
                place(drums, bt(bar, 14), ohat, 0.4, pan=-0.3)
        if bar in bells_on:
            key = 'Cm2' if (ch == 'Cm' and bar % 2 == 1 and bar > 1) else ch
            for s, m in BELLS[key]:
                place(bells, bt(bar, s), bell_st(hz(m), 1.4), 0.32 * (1.0 if s in (0, 6) else 0.78))
        if bar in hook:
            for s, d in RIFF:
                m = tones[d]
                place(lead, bt(bar, s), fade_edges(supersaw_note(hz(m), STEP * 0.92), 0.002, 0.012), 0.5)
                place(lead, bt(bar, s), supersaw_note(hz(m - 12), STEP * 0.92) * 0.6, 0.5)
        if bar in pad_on:
            n = int(BAR * SR * 1.05)
            chord = sum(supersaw_note(hz(m), BAR * 1.05, voices=3, spread=0.12) for m in padn) / len(padn)
            e = np.minimum(1, tt(n) / 0.25)[:, None] * np.minimum(1, (n - np.arange(n)) / (0.15 * SR))[:, None]
            place(pad, bt(bar), chord * e, 0.55)
    # stabs off the grid (strobe cuts, words landing)
    for t_, v in cfg.get('stabs', ()):
        place(drums, t_, K, 0.9 * v)
        kicks.append(t_)
        notes808.append((t_, CH[chord_of(1)][0], 0.3, CH[chord_of(1)][0] + 12))
    # the final hit
    tl = bt(last)
    if tl < DUR:
        notes808.append((tl, CH[chord_of(last)][0], min(1.2, DUR - tl), CH[chord_of(last)][0] + 12))
        place(drums, tl, K, 1.0)
        kicks.append(tl)
        for m in (73, 80, 85, 92):
            place(bells, tl, bell_st(hz(m), 1.6), 0.24)
        place(fx, tl, crash(), 1.0)
    for t_ in cfg.get('fills', ()):
        for k in range(8):
            place(drums, t_ + k * STEP / 2, CL, 0.12 + 0.05 * k, pan=(-1) ** k * 0.2)
    bass = pan2(line_808(sorted(set(notes808))), 0)
    # sidechain
    duck = np.ones(N)
    curve = 1 - 0.55 * np.exp(-tt(int(0.22 * SR)) / 0.07)
    for k in kicks:
        i = int(k * SR)
        n = min(len(curve), N - i)
        if n > 0:
            duck[i:i + n] = np.minimum(duck[i:i + n], curve[:n])
    for b_, d in ((pad, 1.0), (lead, 0.8), (bells, 0.35)):
        b_ *= (1 - d * (1 - duck))[:, None]
    pad = hp(lp(pad, 1100), 120)
    lead = np.tanh(2.2 * lp(lead, 6500)) * 0.55
    rv = reverb_ir(1.9)
    bells = bells + conv_stereo(bells, rv) * 0.32 + pingpong(bells, d=BEAT * 0.75, fb=0.38, tone=3500) * 0.5
    lead = lead + conv_stereo(lead, rv) * 0.18
    drums = drums + conv_stereo(hp(drums, 600), reverb_ir(0.9, seed=5)) * 0.08
    iu = cfg.get('intro_until')
    if iu:
        tline = tt(N)
        f_intro = np.where(tline < iu, 380 * (16000 / 380) ** np.clip(tline / max(iu - 0.07, 0.1), 0, 1) ** 2.2, 20000)
        bells = sweep_lp(bells, f_intro)
        pad = sweep_lp(pad, np.where(tline < iu, f_intro * 0.6, 20000))
    music = {'drums': drums, 'bass': bass * 0.5, 'bells': bells * 0.85, 'lead': lead * 0.55, 'pad': pad * 0.45, 'fx': fx}
    for a, b, g in cfg.get('risers', ()):
        place(music['fx'], a, riser(a, b, g), 1.0)
    for tp, d, g in cfg.get('revcyms', ()):
        place(music['fx'], tp - d, rev_cym(d), g)
    for tc in cfg.get('crashes', ()):
        place(music['fx'], tc, crash(), 1.0)
    for a, b, stems in cfg.get('mute', ()):
        i, j = int(a * SR), int(b * SR)
        r = int(0.006 * SR)
        g = np.ones(N); g[i:j] = 0; g[max(0, i - r):i] = np.linspace(1, 0, i - max(0, i - r)); g[j:j + r] = np.linspace(0, 1, len(g[j:j + r]))
        for k_ in stems:
            music[k_] *= g[:, None]
    for a, b in cfg.get('gaps', ()):
        i, j = int(a * SR), int(b * SR)
        r = int(0.004 * SR)
        g = np.ones(N); g[i:j] = 0; g[max(0, i - r):i] = np.linspace(1, 0, i - max(0, i - r)); g[j:j + r] = np.linspace(0, 1, len(g[j:j + r]))
        for k_, v in music.items():
            if k_ != 'fx':
                v *= g[:, None]
    for a, b, lo_, hi_, stems in cfg.get('muffle', ()):
        i, j = int(a * SR), int(b * SR)
        xf = int(0.02 * SR)
        w = np.ones(j - i); w[:xf] = np.linspace(0, 1, xf); w[-xf:] = np.linspace(1, 0, xf)
        for k_ in stems:
            seg_ = music[k_][i:j].copy()
            tel = np.tanh(bp(seg_, lo_, hi_, order=3) * 1.6 * 1.5) / 1.5
            music[k_][i:j] = seg_ * (1 - w)[:, None] + tel * w[:, None]
    ef = cfg.get('end_fade', DUR - 0.45)
    fade = np.ones(N)
    i = int(ef * SR)
    fade[i:] = np.linspace(1, 0, N - i) ** 1.6
    for v in music.values():
        v *= fade[:, None]
    return music, kicks


def finish(music, sfx, outdir, extra=None, music_gain=0.55, duck_kinds=('slam', 'stamp', 'impact', 'boom', 'clock')):
    """Duck the music under the big effects, write music.wav, sfx.wav, mix-premaster.wav and events.json into outdir."""
    import json
    import os
    m = sum(music.values())
    duck = np.ones(N)
    for e in EVENTS:
        if any(e['kind'].startswith(k) for k in duck_kinds):
            i = int(e['t'] * SR)
            c = 1 - 0.45 * np.exp(-tt(int(0.35 * SR)) / 0.14)
            n = min(len(c), N - i)
            if n > 0:
                duck[i:i + n] = np.minimum(duck[i:i + n], c[:n])
    m = m * duck[:, None]
    mix = m * music_gain + sfx * 1.0
    mix = np.tanh(mix * 1.05) / 1.05
    peak = float(np.max(np.abs(mix)))
    norm = 0.89 / peak
    for name, data in (('music.wav', m * music_gain * norm), ('sfx.wav', sfx * norm), ('mix-premaster.wav', mix * norm)):
        wf.write(os.path.join(outdir, name), SR, np.clip(data, -1, 1).astype(np.float32))
    with open(os.path.join(outdir, 'events.json'), 'w') as fh:
        json.dump({'bpm': BPM, 'bar1': T0, 'duration': DUR, **(extra or {}), 'events': sorted(EVENTS, key=lambda e: e['t'])}, fh, indent=1)
    return peak
