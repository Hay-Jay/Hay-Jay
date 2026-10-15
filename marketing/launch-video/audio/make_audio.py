"""Soundtrack for the MONOCHROME launch film: an original rage / trap instrumental (150 BPM, C# minor: distorted gliding 808s,
FM bells, rolling hats, a detuned saw lead) and sound effects placed on the film's own animation times (index.html).

Everything is synthesised here; no samples, no third-party music.

    python3 make_audio.py            # writes music.wav, sfx.wav, mix-premaster.wav and events.json next to this file

master.sh then loudness-normalises the mix and puts it on the video.
"""
import json
import os

import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as sg

SR = 48000
DUR = 24.0
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(1983)

# ---- musical grid: 150 BPM, bar 1 starts at 0.8 s so the drop lands on the cut at 2.4 s ------------------------------------------------
BPM = 150
BEAT = 60 / BPM          # 0.4 s
STEP = BEAT / 4          # a 16th, 0.1 s
BAR = BEAT * 4           # 1.6 s
T0 = 0.8


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


# ======================================================================================================================================
# ARRANGEMENT
# ======================================================================================================================================
# chords: name -> (808 root midi, pad notes, chord tones for the lead riff (root, third, fifth, passing below))
CH = {
    'Cm': (37, [49, 52, 56, 59], (73, 76, 80, 71)),   # C#m7
    'A':  (33, [45, 49, 52, 56], (69, 73, 76, 68)),   # Amaj7
    'B':  (35, [47, 51, 54, 57], (71, 75, 78, 69)),   # B7
}
LOOP = ['Cm', 'Cm', 'A', 'B']
BELLS = {  # 16th step -> midi, one bar per chord
    'Cm': [(0, 80), (3, 76), (6, 85), (8, 80), (10, 83), (12, 80), (14, 78)],
    'Cm2': [(0, 80), (3, 76), (6, 85), (8, 87), (10, 85), (12, 83), (14, 80)],
    'A': [(0, 81), (3, 76), (6, 85), (8, 81), (10, 83), (12, 81), (14, 76)],
    'B': [(0, 83), (3, 78), (6, 87), (8, 83), (10, 85), (12, 87), (14, 90)],
}
RIFF = [(0, 0), (2, 0), (3, 1), (5, 0), (6, 2), (8, 2), (10, 1), (11, 0), (13, 3), (14, 0)]


def chord_of(bar):
    if bar <= 1:
        return 'Cm'
    return LOOP[(bar - 2) % 4]


# sections (bar numbers on the 150 BPM grid; the film's cuts are at 2.4, 4.8, 8.4, 15.0, 20.6)
FULL = set(range(2, 10)) | {11, 12, 14}
HOOK = set(range(6, 10)) | {14}
PHONE_BAR = 10          # 15.2-16.8: the beat plays through a phone speaker
OUTRO_BAR = 13          # 20.0-21.6: thins out after the 20.6 cut, rises into the last drop
LAST = 15               # 23.2: the final hit


def build_music():
    drums, bass, bells, lead, pad, fx = buf(), buf(), buf(), buf(), buf(), buf()
    kicks = []           # times, for the sidechain
    notes808 = []

    K, CL = kick(), clap()
    hats = {v: hat(False, v) for v in (0.45, 0.6, 0.75, 0.9, 1.0)}
    ohat = hat(True, 0.8)

    for bar in range(1, LAST + 1):
        ch = chord_of(bar)
        root, padn, tones = CH[ch]
        t_bar = bt(bar)

        # --- drums + 808 ----------------------------------------------------------------------------------------------------------
        if bar in FULL or bar == PHONE_BAR or bar == OUTRO_BAR:
            alt = bar % 2 == 0
            pat = [(0, root, 0.62, None), (7, root, 0.28, None), (10, root + 12, 0.38, root), (14, root - 5 if alt else root + 7, 0.2, None)]
            if bar == OUTRO_BAR:
                pat = [(0, root, 0.6, None), (6, root + 12, 0.75, root)]       # holds over the 20.6 cut
            if bar == 5:
                pat = [(0, root, 0.62, None), (7, root, 0.28, None), (10, root + 12, 0.38, root), (12, root + 12, 0.4, root - 12)]
            if bar == 9:
                pat = pat[:3] + [(13, root + 12, 0.25, root + 5)]
            for s, m, ln, g in pat:
                tm = bt(bar, s)
                notes808.append((tm, m, ln, g))
                if s in (0, 7, 10) or bar == OUTRO_BAR:
                    place(drums, tm, K, 0.95 if s == 0 else 0.8)
                    kicks.append(tm)
            # clap on beat 3 (half-time), a ghost on the last 16th of every other bar
            if bar != OUTRO_BAR or True:
                place(drums, bt(bar, 8), CL, 0.75)
            if bar % 2 == 1 and bar not in (5, OUTRO_BAR):
                place(drums, bt(bar, 15), CL, 0.22, pan=0.15)
            # hats: 8ths with rolls; triplets or 32nds on the last beat every other bar
            for s in range(0, 16, 2):
                v = 0.9 if s % 4 == 0 else 0.6
                if bar % 2 == 0 and s >= 12:
                    continue
                place(drums, bt(bar, s), hats[v], 1.0, pan=0.28)
            if bar % 2 == 0:
                if bar % 4 == 0:   # 32nd roll, rising
                    for k in range(8):
                        place(drums, bt(bar, 12 + k * 0.5), hats[0.45 if k < 4 else 0.75], 0.9, pan=0.28 + 0.03 * k)
                else:              # 16th triplets
                    for k in range(6):
                        place(drums, bt(bar, 12 + k * 4 / 6), hats[0.6], 1.0, pan=0.22)
            if bar in HOOK:
                place(drums, bt(bar, 6), ohat, 0.55, pan=-0.3)
                place(drums, bt(bar, 14), ohat, 0.4, pan=-0.3)

        # --- bells: every bar except the last ----------------------------------------------------------------------------------------
        if bar < LAST:
            key = 'Cm2' if (ch == 'Cm' and bar % 2 == 1 and bar > 1) else ch
            for s, m in BELLS[key]:
                acc = 1.0 if s in (0, 6) else 0.78
                place(bells, bt(bar, s), bell_st(hz(m), 1.4), 0.32 * acc)

        # --- rage lead in the hook bars ---------------------------------------------------------------------------------------------
        if bar in HOOK:
            for s, d in RIFF:
                m = tones[d]
                note = supersaw_note(hz(m), STEP * 0.92)
                note = fade_edges(note, 0.002, 0.012)
                place(lead, bt(bar, s), note, 0.5)
                place(lead, bt(bar, s), supersaw_note(hz(m - 12), STEP * 0.92) * 0.6, 0.5)

        # --- pad: the chord, long, dark ------------------------------------------------------------------------------------------------
        if bar < LAST:
            n = int(BAR * SR * 1.05)
            chord = sum(supersaw_note(hz(m), BAR * 1.05, voices=3, spread=0.12) for m in padn) / len(padn)
            e = np.minimum(1, tt(n) / 0.25)[:, None] * np.minimum(1, (n - np.arange(n)) / (0.15 * SR))[:, None]
            place(pad, t_bar, chord * e, 0.55)

    # pickup: the pad and a reversed bell swell into bar 1
    rb = bell_st(hz(80), 0.8)[::-1]
    place(bells, T0 - 0.8, rb * np.linspace(0, 1, len(rb))[:, None], 0.35)

    # last hit at 23.2: kick, long 808, a bell chord
    tl = bt(LAST)
    notes808.append((tl, 37, 0.85, 49))
    place(drums, tl, K, 1.0)
    kicks.append(tl)
    for m in (73, 80, 85, 92):
        place(bells, tl, bell_st(hz(m), 1.6), 0.24)

    # drum fill into the hook (8.4-8.8, the cut into the evidence board) and into the last drop (21.2-21.6)
    for t0f in (bt(5, 12), bt(OUTRO_BAR, 12)):
        for k in range(8):
            place(drums, t0f + k * STEP / 2, CL, 0.12 + 0.05 * k, pan=(-1) ** k * 0.2)

    bass = pan2(line_808(notes808), 0)

    # ---- sidechain: pad, lead and bells duck under each kick ------------------------------------------------------------------------
    duck = np.ones(N)
    x = tt(int(0.22 * SR))
    curve = 1 - 0.55 * np.exp(-x / 0.07)
    for k in kicks:
        i = int(k * SR)
        n = min(len(curve), N - i)
        duck[i:i + n] = np.minimum(duck[i:i + n], curve[:n])
    for b_, d in ((pad, 1.0), (lead, 0.8), (bells, 0.35)):
        b_ *= (1 - d * (1 - duck))[:, None]

    # ---- tone shaping ------------------------------------------------------------------------------------------------------------
    pad = hp(lp(pad, 1100), 120)
    lead = np.tanh(2.2 * lp(lead, 6500)) * 0.55
    rv = reverb_ir(1.9)
    bells = bells + conv_stereo(bells, rv) * 0.32 + pingpong(bells, d=BEAT * 0.75, fb=0.38, tone=3500) * 0.5
    lead = lead + conv_stereo(lead, rv) * 0.18
    drums = drums + conv_stereo(hp(drums, 600), reverb_ir(0.9, seed=5)) * 0.08

    # intro: bells and pad behind a low-pass that opens up to the drop
    tline = tt(N)
    f_intro = np.where(tline < 2.4, 380 * (16000 / 380) ** np.clip((tline - 0.0) / 2.33, 0, 1) ** 2.2, 20000)
    bells = sweep_lp(bells, f_intro)
    pad = sweep_lp(pad, np.where(tline < 2.4, f_intro * 0.6, 20000))

    # intro hats come in at 1.6 and roll up to the drop
    for k in range(4):
        place(drums, 1.6 + k * BEAT / 2, hats[0.6], 0.9, pan=0.28)
    for k in range(8):
        place(drums, 2.0 + k * STEP / 2 * 0.8, hats[0.45 if k < 4 else 0.75], 0.8 + 0.03 * k, pan=0.3)

    music = {'drums': drums, 'bass': bass * 0.5, 'bells': bells * 0.85, 'lead': lead * 0.55, 'pad': pad * 0.45, 'fx': fx}

    # ---- riser, reverse cymbal and the pre-drop gap ------------------------------------------------------------------------------
    def riser(t0, t1, gain=0.35):
        n = int((t1 - t0) * SR)
        x = tt(n)
        k = x / (t1 - t0)
        fc = 400 * (9000 / 400) ** k
        y = sweep_bp(noise(n), fc * 0.7, np.minimum(fc * 1.4, 20000))
        tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.2 * k)) / SR) * 0.25
        return pan2((y * 0.8 + tone) * k ** 2, 0) * gain

    def rev_cym(t_peak, dur=1.0, gain=0.35):
        n = int(dur * SR)
        x = hp(noise(n), 5000) * np.exp(-tt(n) * 4.5)
        x = x[::-1]
        st = np.stack([x, np.roll(x, 37)], axis=1)
        place(music['fx'], t_peak - dur, st, gain)

    place(music['fx'], 1.0, riser(1.0, 2.33), 1.0)
    rev_cym(2.4, 1.1, 0.4)
    rev_cym(bt(6), 0.8, 0.3)
    place(music['fx'], bt(OUTRO_BAR, 6), riser(bt(OUTRO_BAR, 6), bt(14) - 0.03, 0.4), 1.0)
    rev_cym(bt(14), 1.0, 0.4)
    # crashes on the drops
    def crash():
        n = int(1.8 * SR)
        x = bp(noise(n), 3000, 16000) * np.exp(-tt(n) * 2.2)
        return np.stack([x, np.roll(x, 53)], axis=1) * 0.35
    for tc in (2.4, bt(6), bt(11), bt(14), bt(LAST)):
        place(music['fx'], tc, crash(), 1.0)

    # gaps: a breath before each drop
    def gap(a, b, keep=('fx',)):
        i, j = int(a * SR), int(b * SR)
        r = int(0.004 * SR)
        g = np.ones(N)
        g[i:j] = 0
        g[i - r:i] = np.linspace(1, 0, r)
        g[j:j + r] = np.linspace(0, 1, r)
        for k_, v in music.items():
            if k_ not in keep:
                v *= g[:, None]
    gap(2.33, 2.4)
    gap(bt(14) - 0.05, bt(14))

    # the 15.0 cut: drums stop for a beat, then bar 10 plays through a phone speaker (the phone on screen)
    i15, i152, i168 = int(15.0 * SR), int(bt(PHONE_BAR) * SR), int(bt(11) * SR)
    for k_ in ('drums', 'lead'):
        music[k_][i15:i152] *= np.linspace(1, 0, i152 - i15)[:, None] ** 3
    for k_ in ('drums', 'bass', 'bells', 'pad'):
        seg_ = music[k_][i152:i168].copy()
        tel = bp(seg_, 450, 3400, order=3) * 1.6
        tel = np.tanh(tel * 1.5) / 1.5
        xf = int(0.02 * SR)
        w = np.ones(len(seg_))
        w[:xf] = np.linspace(0, 1, xf)
        w[-xf:] = np.linspace(1, 0, xf)
        music[k_][i152:i168] = seg_ * (1 - w)[:, None] + tel * w[:, None]

    # the 20.6 cut: drums and lead drop away, the 808 and bells ring on into the riser
    i206, i216 = int(20.6 * SR), int(bt(14) * SR)
    for k_ in ('drums', 'lead'):
        music[k_][i206:i216] *= 0.0
    music['bells'][i206:i216] = lp(music['bells'][i206:i216], 1800) * 1.1

    # end: everything but the last hit and the tails fades after 23.2; silence by 24.0
    tl_i = int(tl * SR)
    fade = np.ones(N)
    fade[int(23.55 * SR):] = np.linspace(1, 0, N - int(23.55 * SR)) ** 1.6
    for v in music.values():
        v *= fade[:, None]
    return music, kicks


# ======================================================================================================================================
# SOUND EFFECTS, on the film's animation times
# ======================================================================================================================================
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


def build_sfx():
    S = buf()
    # ---- S1: the terminal (0-2.4) --------------------------------------------------------------------------------------------------
    place(S, fr(0.1), scan(1.25), 0.32)
    ev(0.1, 'scan', 'fingerprint scan bar')
    place(S, fr(0.06), data_chatter(1.0, 22), 0.16, pan=0.2)
    for t_, f_ in ((0.7, 1046), (1.1, 1046)):
        place(S, fr(t_), beep(f_, 0.06, 0.6), 0.3)
    place(S, fr(0.95), beep(1568, 0.09), 0.38)
    place(S, fr(1.03), beep(2093, 0.14), 0.38)
    ev(0.95, 'beep', 'Identity verified')
    place(S, fr(1.35), beep(1760, 0.09), 0.4)
    place(S, fr(1.43), beep(2637, 0.18), 0.4)
    ev(1.35, 'beep', 'Clearance granted')
    typing('Welcome, operative.', 1.5, 2.0, S, vel=0.5, name='Welcome, operative.')
    # ---- the cuts flash -------------------------------------------------------------------------------------------------------------
    for c in (2.4, 4.8, 8.4, 15.0):
        place(S, fr(c), zap(), 0.32)
        ev(c, 'cut', 'flash')
    # ---- S2: identity (2.4-4.8) ----------------------------------------------------------------------------------------------------
    w = whoosh(0.75, 0.4, 250, 3000)
    trem = 0.7 + 0.3 * np.sin(2 * np.pi * 11 * tt(len(w)))
    place(S, fr(2.4), w * trem, 0.55)
    ev(2.4, 'whoosh', 'emblem spins in')
    place(S, fr(2.7), whoosh(0.6, 0.45, 1500, 7000), 0.25, pan=-0.2)
    ev(2.7, 'swish', 'wordmark wipe')
    place(S, fr(2.9), shimmer(0.6), 0.5, pan=0.15)
    ev(2.9, 'shimmer', 'sheen across the emblem')
    typing('Division of wearables', 3.15, 3.7, S, vel=0.35, name='Division of wearables')
    for t_, p_, nm in ((3.77, -0.25, 'BLACK'), (4.02, 0.25, 'WHITE'), (4.27, 0.0, 'CHROME')):
        place(S, fr(t_), slam(), 0.62, pan=p_)
        ev(t_, 'slam', nm)
    place(S, fr(4.3), shimmer(0.5, f0=3000, f1=8000), 0.55)
    ev(4.3, 'shimmer', 'chrome chip')
    # ---- S3: the briefing (4.8-8.4) ------------------------------------------------------------------------------------------------
    place(S, fr(4.8), whoosh(0.3, 0.2, 600, 4000), 0.25)
    typing('Operation:', 4.95, 5.35, S, key=typewriter_key, vel=0.45, name='Operation:')
    for t_, nm in ((5.52, 'WEAR THE'), (5.84, 'UNKNOWN')):
        place(S, fr(t_), slam(1.0), 0.7)
        place(S, fr(t_ + 0.005), glitch(0.15), 0.45, pan=0.1)
        ev(t_, 'slam+glitch', nm)
    place(S, fr(6.26), stamp_thump(), 0.85)
    ev(6.26, 'stamp', 'TOP SECRET')
    # the lede types out fast: a run of soft keys
    lede = 'Black, white and chrome clothing, made in small runs. 24 pieces on file.'
    typing(lede, 6.4, 7.5, S, vel=0.22, name='lede')
    place(S, fr(7.4), whoosh(0.4, 0.25, 400, 2500), 0.28)
    ev(7.4, 'whoosh', 'shop buttons slide up')
    # ---- S4: the evidence board (8.4-15.0) -----------------------------------------------------------------------------------------
    for i in range(4):
        a = 8.52 + i * 1.6
        side = 1 if i % 2 else -1
        place(S, fr(a - 0.05), whoosh(0.5, 0.18, 300, 4200), 0.55, pan=side * 0.55)
        place(S, fr(a + 0.13), stamp_thump(0.55), 0.35, pan=side * 0.2)
        ev(a + 0.13, 'card', f'card {i + 1} lands')
        place(S, fr(a + 0.62), shutter(), 0.6, pan=side * 0.15)
        ev(a + 0.62, 'shutter', f'card {i + 1} declassifies into colour')
        place(S, fr(a + 0.66), shimmer(0.5, f0=1800, f1=5200), 0.3, pan=side * 0.1)
        place(S, fr(a + 1.21), stamp_thump(), 0.8, pan=side * 0.1)
        ev(a + 1.21, 'stamp', f'card {i + 1} DECLASSIFIED')
    # ---- S5: the new site on a phone (15.0-20.6) ---------------------------------------------------------------------------------
    place(S, fr(15.0), whoosh(0.55, 0.38, 200, 2600), 0.5)
    place(S, fr(15.45), stamp_thump(0.4), 0.3)
    ev(15.0, 'whoosh', 'phone slides up')
    place(S, fr(15.86), stamp_thump(), 0.7, pan=0.2)
    ev(15.86, 'stamp', 'phone stamp')
    for t0_, t1_, txt in ((15.05, 15.45, 'Browse the briefing'), (16.8, 17.2, 'Search the register'), (18.25, 18.65, 'Open the dossier'), (19.5, 19.9, 'Requisition: add to bag')):
        typing(txt, t0_, t1_, S, vel=0.2, pan=-0.1, name=txt)
    for t0_, t1_ in ((15.35, 16.7), (16.85, 18.1), (18.25, 18.85)):
        place(S, fr(t0_), swipe(t1_ - t0_), 0.9, pan=0.1)
        ev(t0_, 'swipe', 'screen scrolls')
    for t_ in (16.75, 18.2):
        place(S, fr(t_), tap(0.7), 0.35)
        ev(t_, 'click', 'next screen')
    place(S, fr(18.95), tap(1.0), 0.6)
    ev(18.95, 'tap', 'Add to bag')
    place(S, fr(19.45), bloop(), 0.4)
    place(S, fr(19.45), whoosh(0.35, 0.2, 700, 3500), 0.25)
    ev(19.45, 'bloop', 'bag slides up')
    # ---- S6: end card (20.6-24) ----------------------------------------------------------------------------------------------------
    place(S, fr(20.6), boom(0.9, 1.6), 0.55)
    place(S, fr(20.6), zap(), 0.3)
    ev(20.6, 'boom', 'cut to the end card')
    place(S, fr(20.6), whoosh(0.5, 0.3, 250, 3000), 0.35)
    place(S, fr(20.7), whoosh(0.55, 0.45, 1500, 7000), 0.22, pan=-0.2)
    place(S, fr(21.46), stamp_thump(), 0.85)
    ev(21.46, 'stamp', 'NEW SITE — NOW LIVE')
    place(S, fr(21.66), boom(1.0, 1.5, 52), 0.7)
    place(S, fr(21.77), slam(), 0.55)
    ev(21.66, 'impact', 'monochrome.com.ng pops in (boom), lands at 21.77 (slam)')
    place(S, fr(22.0), shimmer(0.5, f0=2000, f1=5000), 0.25)
    place(S, fr(22.35), whoosh(0.35, 0.25, 500, 3000), 0.25)
    place(S, fr(22.7), tap(0.6), 0.25)
    ev(22.7, 'click', 'shop button settles')
    # end: fade the effects' tails by 24.0
    f = np.ones(N)
    f[int(23.55 * SR):] = np.linspace(1, 0, N - int(23.55 * SR)) ** 1.6
    S *= f[:, None]
    return S


# ======================================================================================================================================
def main():
    music, kicks = build_music()
    m = sum(music.values())
    sfx = build_sfx()
    # the music steps back a little under the big effects
    duck = np.ones(N)
    for e in EVENTS:
        if e['kind'] in ('slam', 'slam+glitch', 'stamp', 'impact', 'boom'):
            i = int(e['t'] * SR)
            x = tt(int(0.35 * SR))
            c = 1 - 0.45 * np.exp(-x / 0.14)
            n = min(len(c), N - i)
            duck[i:i + n] = np.minimum(duck[i:i + n], c[:n])
    m *= duck[:, None]
    mix = m * 0.55 + sfx * 1.0
    # glue: a touch of bus saturation, then headroom for the loudness pass
    mix = np.tanh(mix * 1.05) / 1.05
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.89
    norm = 0.89 / peak
    for name, data in (('music.wav', m * 0.55 * norm), ('sfx.wav', sfx * 1.0 * norm), ('mix-premaster.wav', mix)):
        wf.write(os.path.join(HERE, name), SR, np.clip(data, -1, 1).astype(np.float32))
    with open(os.path.join(HERE, 'events.json'), 'w') as fh:
        json.dump({'bpm': BPM, 'bar1': T0, 'cuts': [2.4, 4.8, 8.4, 15.0, 20.6], 'events': sorted(EVENTS, key=lambda e: e['t'])}, fh, indent=1)
    print('peak before norm', round(float(peak), 3), 'events', len(EVENTS))


if __name__ == '__main__':
    main()
