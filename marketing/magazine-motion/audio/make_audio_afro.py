"""The afro version of the magazine motion ad's soundtrack: an original afro-house / amapiano-flavoured instrumental on the film's own
grid (120 BPM, a beat is 0.5 s and a bar 2 s; bar 1 is the drop at 2.0 s, the final hit is bar 12 at 24.0 s), under the same sound
effects as the trap version.

Everything here is synthesised and written for this film: the log-drum bass line, the chords (Am9 - Fmaj9 - Dm7 - E7sus/E7), the
kalimba motif and the whistle hook. Nothing is taken from, or modelled on, any real song (no samples, stems, melodies or vocals).

    python3 audio/make_audio.py         # first: the trap version, which also writes the effects (audio/sfx.wav, audio/events.json)
    python3 audio/make_audio_afro.py    # music.wav, sfx.wav, mix-premaster.wav, events.json in audio/afro/

The effects are the trap version's audio/sfx.wav, unchanged (same events, same timings). The music ducks under the slams, stamps,
impacts and booms with the same shape M.finish() uses for the trap mix, but the ducking is done here, with a short smooth attack
(no clicks). At the two payoffs (the drop at 2.0 and the final hit at 24.0) it does not duck at all: a harder kick and log-drum
note, a sub drop, a clap and a doubled crash land with the boom, and those are the two loudest moments of the music, 3 dB or more
over anything in the bar before. It also dips 2.5 dB under the riffle's page flaps and the split-flap board's clacks.

The mix is built for phone speakers as well as headphones: the keys (rootless voicings), pad and congas are kept out of the
250-500 Hz box, the bus has a little presence at 2-3 kHz, the whistle lead has some flute body and sits under the groove, and the
log drum carries a saturated mid band so it is still heard on a speaker that plays nothing of its fundamental.
"""
import json
import os
import sys

import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as sg

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'afro')
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
import mcsound as M  # noqa: E402

DUR = 26.0
M.setup(DUR, bpm=120, bar1=2.0, seed=1810)
SR, STEP, BAR, N = M.SR, M.STEP, M.BAR, M.N
tt, hz, place, bt, lp, hp, bp = M.tt, M.hz, M.place, M.bt, M.lp, M.hp, M.bp
R = np.random.default_rng(1810)          # humanising (velocities), separate from the kit's noise generator
SWING = 0.016                            # the off-16ths sit 16 ms late: a light afro-house swing
MUSIC_OVER_SFX = 3.0                     # the music sits this many LU above the effects, after ducking (the trap mix: 3.1)
LOG_DRIVE, LOG_GRIT = 5.0, 1.6           # the log drum's parallel saturated mid band: drive and level
HITS = (2.0, 24.0)                       # the two payoffs: the drop (THE VISION ISSUE) and the final hit (monochrome.com.ng)


def at(bar, step):
    """Time of a 16th step, swung: odd steps are pushed late."""
    s = float(step)
    odd = abs(s - round(s)) < 1e-9 and int(round(s)) % 2 == 1
    return bt(bar, s) + (SWING if odd else 0.0)


def is_hit(t):
    return min(abs(t - h) for h in HITS) < 1e-6


def hv(v, spread=0.08):
    return v * (1 + R.uniform(-spread, spread))


def shelf(x, f, gain_db, kind='low'):
    """A shelving EQ (RBJ biquad, slope 1): boost or cut everything below (kind='low') or above (kind='high') f by gain_db."""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    cw, al = np.cos(w), np.sin(w) / 2 * np.sqrt(2)
    s = 1 if kind == 'low' else -1
    b = [A * ((A + 1) - s * (A - 1) * cw + 2 * np.sqrt(A) * al), s * 2 * A * ((A - 1) - s * (A + 1) * cw),
         A * ((A + 1) - s * (A - 1) * cw - 2 * np.sqrt(A) * al)]
    a = [(A + 1) + s * (A - 1) * cw + 2 * np.sqrt(A) * al, -s * 2 * ((A - 1) + s * (A + 1) * cw),
         (A + 1) + s * (A - 1) * cw - 2 * np.sqrt(A) * al]
    return sg.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def peq(x, f, gain_db, q=0.8):
    """A peaking EQ (RBJ biquad): gain_db at f, bandwidth set by q."""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]
    a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return sg.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


# ======================================================================================================================================
# INSTRUMENTS (all synthesised here)
# ======================================================================================================================================
def kick4():
    """A short, round four-on-the-floor kick (tuned low, out of the log drum's way after 0.15 s)."""
    n = int(0.28 * SR)
    t = tt(n)
    f = 50 + 100 * np.exp(-t * 42) + 70 * np.exp(-t * 380)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    click = hp(M.noise(n), 3000) * np.exp(-t * 650) * 0.3
    return M.fade_edges(np.tanh(1.7 * (body + click)) * 0.92, 0.0004, 0.02)


def sub_drop(dur=1.3):
    """Under the two payoffs (the drop and the final hit): a sine that falls from about 54 Hz to 36 Hz and dies away."""
    n = int(dur * SR)
    t = tt(n)
    f = 36 + 18 * np.exp(-t * 3.2)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.004) * np.exp(-t * 2.0)
    return M.fade_edges(np.tanh(1.4 * y) / np.tanh(1.4), 0.0005, 0.08)


def log_line(notes):
    """The log drum: one monophonic line. notes: (t, midi, length s, glide_from_midi or None, bend semitones over the tail, vel
    [, body: >1 holds the note longer, for the two payoffs]).
    A pitched, hollow tone (fundamental plus a 2nd and 3rd harmonic that ring for about 0.2 s), a short upward pitch blip for the
    knock, a woody click on top, and glides between notes. A saturated copy, band-passed to 750-1800 Hz, runs in parallel under
    the dry tone so the line still reads on a phone speaker, which plays nothing of the 55-165 Hz fundamental."""
    f = np.full(N, hz(33))
    amp = np.zeros(N)
    harm = np.zeros(N)
    knock = np.zeros((N, 2))
    notes = sorted(notes)
    for k, note in enumerate(notes):
        t0, m, ln, g, bend, vel = note[:6]
        body = note[6] if len(note) > 6 else 1.0
        i0 = int(round(t0 * SR))
        i1 = int(min(DUR, t0 + ln) * SR)
        if k + 1 < len(notes):
            i1 = min(i1, int(round(notes[k + 1][0] * SR)))
        n = i1 - i0
        if n <= 0:
            continue
        x = tt(n)
        tgt = hz(m)
        fr_ = np.full(n, tgt)
        if g is not None:
            fr_ = tgt * (hz(g) / tgt) ** np.exp(-x / 0.045)                  # glide in from another note
        if bend:
            tail = min(0.3, ln * 0.6)
            fr_ = fr_ * 2 ** (bend / 12 * np.clip((x - (n / SR - tail)) / tail, 0, 1) ** 2)
        fr_ = fr_ * (1 + 0.16 * np.exp(-x / 0.005))                           # the knock: a quick pitch blip
        f[i0:i1] = fr_
        e = np.minimum(1, x / 0.0015) * (0.32 + 0.68 * np.exp(-x / (0.13 * body))) * np.exp(-x / (0.9 * body))
        r = min(int(0.022 * SR), n)
        e[-r:] *= np.linspace(1, 0, r)
        amp[i0:i1] = e * vel
        harm[i0:i1] = np.exp(-x / 0.2)
        nk = int(0.05 * SR)
        xk = tt(nk)
        wood = bp(M.noise(nk), 700, 2600) * np.exp(-xk * 230) * 0.22 + np.sin(2 * np.pi * tgt * 5.03 * xk) * np.exp(-xk * 130) * 0.16
        place(knock, t0, wood * vel)
    ph = 2 * np.pi * np.cumsum(f) / SR
    raw = np.sin(ph) + harm * (0.62 * np.sin(2 * ph + 0.4) + 0.34 * np.sin(3 * ph + 0.9))
    y = np.tanh(2.1 * raw * amp) / np.tanh(2.1)
    y = hp(y, 32, order=2)
    y = y + 0.12 * bp(y, 400, 1200)                                          # a little mid, above the low-mid mud
    grit = bp(np.tanh(LOG_DRIVE * y + 0.25) - np.tanh(0.25), 750, 1800, order=2)  # the parallel saturated band (odd and even harmonics)
    grit = grit * lp(np.clip((175.0 / f) ** 1.4, 1.0, 5.2), 40)              # a low note has fewer harmonics up there: lift it (A1 x5)
    y = lp(y + LOG_GRIT * grit, 3800)
    return M.pan2(y, 0) + knock


def shaker(vel=1.0):
    n = int(0.09 * SR)
    t = tt(n)
    e = np.minimum(1, t / 0.007) * np.exp(-np.maximum(t - 0.007, 0) * 62)
    g2 = np.zeros(n)
    i = int(0.004 * SR)
    g2[i:] = e[:n - i] * 0.5                                                  # a second grain of beads, just behind
    y = bp(M.noise(n), 3000, 12500) * (e + g2)
    return M.fade_edges(y * vel * 0.6, 0.0005, 0.01)


SHAKERS = [shaker() for _ in range(8)]


def ohat(vel=1.0):
    n = int(0.17 * SR)
    t = tt(n)
    sq = sum(np.sign(np.sin(2 * np.pi * fq * t + i)) for i, fq in enumerate(M.HAT_F))
    x = bp(sq * 0.35 + M.noise(n) * 0.65, 7000, 15500)
    return M.fade_edges(x * np.exp(-t * 21) * vel * 0.5, 0.001, 0.02)


def skin(f0, decay, vel=1.0, slap=0.0, dur=0.4):
    """A hand drum: a membrane with a pitch drop and two inharmonic modes; slap adds the crack of the palm."""
    n = int(dur * SR)
    t = tt(n)
    ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.2 * np.exp(-t * 55))) / SR
    body = np.sin(ph) * np.exp(-t * decay) + 0.28 * np.sin(1.59 * ph + 0.3) * np.exp(-t * decay * 1.8) \
        + 0.12 * np.sin(2.14 * ph) * np.exp(-t * decay * 2.6)
    hit = bp(M.noise(n), 1200, 6500) * np.exp(-t * (170 if slap < 0.5 else 85)) * (0.14 + 0.7 * slap)
    return M.fade_edges(np.tanh(1.3 * (body + hit)) * vel, 0.0004, 0.02)


def conga_lo(v=1.0):
    return skin(200, 13, v)


def conga_hi(v=1.0, slap=False):
    return skin(258, 30 if slap else 16, v, 1.0 if slap else 0.0)


def bongo(v=1.0, high=True):
    return skin(560 if high else 410, 27, v, 0.25, 0.25)


def rim(vel=1.0):
    n = int(0.08 * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * 1720 * t) * np.exp(-t * 85) * 0.6 + np.sin(2 * np.pi * 520 * t) * np.exp(-t * 140) * 0.4 \
        + bp(M.noise(n), 2500, 9000) * np.exp(-t * 380) * 0.6
    return M.fade_edges(np.tanh(1.5 * y) * vel, 0.0003, 0.01)


def clave(vel=1.0):
    n = int(0.12 * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * 2480 * t) * np.exp(-t * 48) + 0.18 * np.sin(2 * np.pi * 6450 * t) * np.exp(-t * 140)
    return M.fade_edges(y * np.minimum(1, t / 0.0007) * vel * 0.7, 0.0003, 0.01)


def ep_note(f, dur, vel=1.0):
    """An electric piano (tine) note: 1:1 FM whose brightness follows the velocity and dies away, a little bark on the attack."""
    rel = 0.2
    n = int((dur + rel) * SR)
    t = tt(n)
    idx = (0.5 + 1.5 * vel) * np.exp(-t / 0.32) + 0.25
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    bark = np.sin(2 * np.pi * f * 7.0 * t) * np.exp(-t * 60) * 0.1 * vel if f * 7 < 14000 else 0
    e = np.minimum(1, t / 0.003) * np.exp(-t / 1.9)
    i = int(dur * SR)
    e[i:] *= np.exp(-(t[i:] - dur) / 0.06)
    return M.fade_edges(np.tanh(1.2 * (car + bark) * e) / 1.2 * vel, 0.0005, 0.02)


def pluck(f, vel=1.0, dur=0.7):
    """Kalimba / marimba: a woody fundamental, a 3.93x overtone that dies quickly, a hint of a 9.2x, a tiny click."""
    n = int(dur * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.3) + 0.3 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.045)
    if f * 9.2 < 16000:
        y = y + 0.1 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.014)
    y = y + bp(M.noise(n), 2000, 7000) * np.exp(-t * 900) * 0.12
    return M.fade_edges(np.tanh(1.1 * y * np.minimum(1, t / 0.0008)) * vel, 0.0002, 0.03)


def pad_chord(midis, dur):
    n = int(dur * SR)
    x = sum(M.supersaw_note(hz(m), dur, voices=5, spread=0.13) for m in midis) / len(midis)
    e = np.minimum(1, tt(n) / 0.35) * np.minimum(1, (n - np.arange(n)) / (0.4 * SR))
    return x * e[:, None]


def whistle_line(notes):
    """A whistle / wooden-flute lead: a tone with a little 2nd, 3rd and 4th harmonic (so it isn't a bare sine), a scoop into each
    note, glides between joined notes, vibrato that grows as a note is held, and breath noise riding on the pitch.
    notes: (t, midi, length s, vel)."""
    f = np.full(N, 880.0)
    a = np.zeros(N)
    notes = sorted(notes)
    for k, (t0, m, ln, vel) in enumerate(notes):
        i0 = int(round(t0 * SR))
        i1 = int(min(DUR, t0 + ln) * SR)
        if k + 1 < len(notes):
            i1 = min(i1, int(round(notes[k + 1][0] * SR)))
        n = i1 - i0
        if n <= 0:
            continue
        x = tt(n)
        tgt = hz(m)
        joined = k > 0 and abs(notes[k - 1][0] + notes[k - 1][2] - t0) < 0.03
        if joined:
            fr_ = tgt * (hz(notes[k - 1][1]) / tgt) ** np.exp(-x / 0.03)
        else:
            fr_ = tgt * 2 ** (-0.6 / 12 * np.exp(-x / 0.04))
        vib = 2 ** (24 / 1200 * np.clip((x - 0.14) / 0.3, 0, 1) * np.sin(2 * np.pi * 5.6 * x))
        f[i0:i1] = fr_ * vib
        e = np.minimum(1, x / (0.006 if joined else 0.018))
        r = min(int(0.035 * SR), n)
        e[-r:] *= np.linspace(1, 0, r) ** 1.5
        a[i0:i1] = e * vel
    a = lp(a, 60)                                                             # no clicks at the joins
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.22 * np.sin(2 * ph + 0.3) + 0.12 * np.sin(3 * ph + 0.7) + 0.045 * np.sin(4 * ph + 1.1)) * a
    breath = M.sweep_bp(M.noise(N), f * 0.82, f * 1.22) * a * 0.22 + hp(M.noise(N), 4000) * a * 0.015
    return M.pan2(tone + breath, 0.05)


# ======================================================================================================================================
# THE CHART: one chord per section, written for this film
# ======================================================================================================================================
HALF = {0: ('Am', 'Am'), 1: ('Am', 'Am'), 2: ('F', 'F'), 3: ('Dm', 'Dm'), 4: ('Esus', 'E7'), 5: ('Am', 'Am'), 6: ('F', 'F'),
        7: ('Dm', 'Dm'), 8: ('Esus', 'E7'), 9: ('Am', 'Am'), 10: ('F', 'F'), 11: ('Dm', 'E7'), 12: ('Am', 'Am')}
LOGR = {'Am': 33, 'F': 41, 'Dm': 38, 'Esus': 40, 'E7': 40}                   # log drum roots: A1, F2, D2, E2
EPV = {'Am': [60, 64, 67, 71], 'F': [57, 60, 64, 67], 'Dm': [53, 57, 60, 65],                  # rootless (the log drum has the root):
       'Esus': [57, 59, 62, 64], 'E7': [56, 59, 62, 65]}                                         # Am9 C E G B, Fmaj9 A C E G, Dm7 F A C F,
                                                                                                 # E7sus4 A B D E, E7(b9) G# B D F
PADV = {'Am': [57, 64, 67, 72], 'F': [53, 60, 64, 69], 'Dm': [50, 57, 62, 69], 'Esus': [52, 59, 64, 69], 'E7': [52, 59, 62, 68]}
KAL = {'Am': [69, 72, 76, 79, 81], 'F': [69, 72, 76, 77, 81], 'Dm': [69, 72, 74, 77, 81], 'Esus': [69, 71, 74, 76, 81],
       'E7': [68, 71, 74, 76, 80]}


def chord(bar, step):
    h = HALF[bar]
    return h[0] if step < 8 else h[1]


# log drum patterns: (step, semitones over the chord's root, length in steps, glide from (semitones) or None, tail bend, vel)
LOG = {
    'A': [(0, 0, 2, None, 0, 1.0), (3, 12, 2, None, 0, .85), (6, 7, 2, None, 0, .9), (10, 12, 1, 7, 0, .8), (11, 7, 2, None, 0, .85),
          (14, 0, 2, None, 0, .8)],
    'B': [(0, 0, 3, None, 0, 1.0), (3, 7, 1, None, 0, .8), (6, 12, 2, None, 0, .9), (9, 7, 1, None, 0, .75), (10, 0, 2, None, 0, .85),
          (13, 12, 1, None, 0, .8), (14, 7, 2, 12, 0, .85)],
    'stac': [(0, 0, 1, None, 0, 1.0), (2, 12, 1, None, 0, .75), (3, 7, 1, None, 0, .8), (6, 0, 1, None, 0, .9), (7, 12, 1, None, 0, .7),
             (10, 7, 1, None, 0, .85), (11, 12, 1, None, 0, .75), (14, 0, 1, None, 0, .85), (15, 12, 1, None, 0, .7)],
    'long': [(0, 0, 5, None, 0, .95), (6, 7, 3, None, 0, .8), (10, 12, 6, 7, -5, .85)],
    'split': [(0, 0, 2, None, 0, 1.0), (3, 12, 2, None, 0, .85), (6, 7, 2, None, 0, .85), (8, 0, 2, None, 0, .95), (11, 12, 1, None, 0, .8),
              (13, 7, 1, None, 0, .8), (14, 12, 2, None, 0, .85)],
}
# electric piano: (step, length in steps, vel)
EP = {
    'A': [(0, 5, .9), (6, 3, .7), (10, 5, .8)],
    'B': [(0, 3, .85), (3, 3, .65), (6, 4, .75), (11, 4, .7)],
    'split': [(0, 5, .9), (6, 2, .65), (8, 5, .85), (14, 2, .6)],
    'stabs': [(0, 1, .85), (3, 1, .6), (6, 1, .75), (10, 1, .7), (11, 1, .55), (14, 1, .7)],
    'long': [(0, 9, .7), (10, 6, .6)],
}
# kalimba: (step, chord tone, vel, length s)
KP = {
    'A': [(0, 0, 1.0), (2, 2, .7), (3, 4, .85), (6, 3, .8), (8, 1, .7), (10, 2, .75), (11, 4, .9), (14, 3, .7)],
    'B': [(0, 4, 1.0), (2, 2, .7), (4, 3, .6), (6, 1, .85), (8, 4, .8), (9, 3, .6), (11, 2, .85), (13, 0, .7), (14, 2, .7)],
    'eighths': [(2 * k, i, .85 if k % 2 == 0 else .6) for k, i in enumerate([0, 4, 3, 2, 0, 4, 1, 2])],
    'stac': [(2 * k, i, .8) for k, i in enumerate([0, 2, 0, 3, 0, 2, 4, 2])],
}
KAL_LEN = {'eighths': 0.4, 'stac': 0.22}                                       # note length (s); 0.7 otherwise
# the whistle hook: (step, midi, length in steps)
W_AM = [(0, 81, 1.5), (2, 84, 1), (3, 81, 2.5), (6, 79, 1), (7, 76, 3), (10, 79, 1), (11, 81, 1), (12, 84, 2), (14, 83, 2)]
W_E = [(0, 83, 1.5), (2, 81, 1), (3, 83, 2.5), (6, 86, 1.5), (8, 88, 2), (10, 86, 1), (11, 83, 1), (12, 80, 3.5)]
W_AM2 = W_AM[:7] + [(12, 84, 1.5), (14, 88, 2)]
W_END = [(0, 81, 1.5), (2, 84, 1), (3, 86, 2.5), (6, 84, 1), (7, 81, 1), (8, 83, 2), (10, 80, 1), (11, 83, 1), (12, 86, 2), (14, 88, 1.4)]

# what plays in each section (bar 1 = the drop at 2.0; the film changes section every bar)
ALL = dict(kick=1, clap=1, shk=1, oh=1, conga='A', rim=1, log='A', ep='A', kal='A', pad=1, lead=None)
SECTION = {
    1: {**ALL, 'lead': W_AM},                                                            # 2-4 the drop
    2: {**ALL, 'ep': 'B', 'kal': 'eighths'},                                             # 4-6 the riffle: the page flaps carry the rush
    3: {**ALL, 'log': 'B', 'kal': 'B'},                                                  # 6-8 the team
    4: {**ALL, 'log': 'split', 'ep': 'split', 'lead': W_E},                              # 8-10 the orbit
    5: {**ALL, 'lead': W_AM},                                                            # 10-12 the 77 file
    6: {**ALL, 'oh': 0, 'conga': None, 'clap': 0, 'log': 'B', 'ep': 'long', 'kal': 'B'},  # 12-14 fashion show: lighter
    7: {**ALL, 'log': 'stac', 'ep': 'stabs', 'kal': None, 'pad': 0},                     # 14-16 the split-flap board: the clacks and
                                                                                         # the staccato log drum are the percussion
    8: {**ALL, 'oh': 0, 'conga': None, 'log': 'split', 'ep': 'split', 'pad': 0},          # 16-18 play lab
    9: {**ALL, 'lead': W_AM2},                                                           # 18-20 camera roll
    10: {**ALL, 'kick': 0, 'clap': 0, 'oh': 0, 'conga': None, 'log': 'long', 'ep': 'long', 'kal': None},  # 20-22 the facts: thinner
    11: {**ALL, 'log': 'split', 'ep': 'split', 'lead': W_END},                           # 22-24 the end card
}
CONGA = {
    'A': [(2, 'hi', .8), (5, 'lo', .9), (9, 'slap', .7), (11, 'hi', .85), (13, 'lo', .8), (15, 'slap', .45)],
}
# hand-drum fills over the last beat of a bar, three different ones: (step, drum, vel)
FILLS = {
    'climb': [(12, 'lo', .55), (13, 'lo', .6), (14, 'hi', .6), (14.5, 'bl', .55), (15, 'bh', .65), (15.5, 'slap', .75)],  # 16ths into 32nds
    'call': [(12, 'slap', .7), (13, 'hi', .5), (13.5, 'hi', .55), (14, 'lo', .65), (15, 'bl', .6), (15.5, 'bh', .7)],     # slap, answer
    'flams': [(13, 'hi', .7), (14, 'lo', .7), (15, 'slap', .75), (15.5, 'bh', .6)],                                        # four flammed hits
}
HAND_PAN = {'hi': -0.4, 'lo': -0.25, 'slap': -0.4, 'bh': 0.45, 'bl': 0.35}

# ======================================================================================================================================
# PLAYING IT
# ======================================================================================================================================
stem = {k: M.buf() for k in ('kick', 'log', 'perc', 'keys', 'kal', 'pad', 'lead', 'fx')}
hands = M.buf()                                                               # congas and bongos: their own bus, EQ'd, then into perc
lead_dbl = M.buf()                                                            # a soft kalimba an octave under the lead
K = kick4()
kicks, lognotes, leadnotes = [], [], []
LAST = 12                                                                     # the final hit, 24.0


def hand(kind, v):
    return {'hi': lambda: conga_hi(v), 'lo': lambda: conga_lo(v), 'slap': lambda: conga_hi(v, True),
            'bh': lambda: bongo(v, True), 'bl': lambda: bongo(v, False)}[kind]()


def fill(bar, name, gain, flam=False):
    """A hand-drum fill over the last beat of a bar, into the next section (a flam puts a soft grace note 18 ms ahead of each hit)."""
    for s, kind, v in FILLS[name]:
        if flam:
            place(hands, bt(bar, s) - 0.018, hand(kind, v * 0.45), gain, pan=HAND_PAN[kind] + 0.1)
        place(hands, bt(bar, s), hand(kind, v), gain, pan=HAND_PAN[kind])


for bar in range(1, LAST):
    S = SECTION[bar]
    for s in range(16):
        ch = chord(bar, s)
        if S['kick'] and s % 4 == 0:
            place(stem['kick'], bt(bar, s), K, (1.4 if is_hit(bt(bar, s)) else 1.0) if s == 0 else 0.92)
            kicks.append(bt(bar, s))
        if S['clap'] and s in (4, 12):
            place(stem['perc'], bt(bar, s), hp(M.clap(), 300), hv(0.32), pan=-0.05)
        if S['shk']:
            place(stem['perc'], at(bar, s), SHAKERS[R.integers(8)], hv((0.55, 0.32, 0.85, 0.4)[s % 4] * 0.55), pan=0.32)
        if S['oh'] and s % 4 == 2:
            place(stem['perc'], at(bar, s), ohat(), hv(0.5), pan=0.18)
        if S['rim'] and s in (3, 6, 10, 14):
            place(stem['perc'], at(bar, s), rim(), hv((0.8, 0.7, 0.85, 0.6)[(3, 6, 10, 14).index(s)] * 0.42), pan=-0.28)
        if S['rim'] and s == (7 if bar % 2 == 0 else 15):
            place(stem['perc'], at(bar, s), clave(), 0.32, pan=0.4)
    if S['conga']:
        for s, kind, v in CONGA[S['conga']]:
            place(hands, at(bar, s), hand(kind, hv(v)), 0.42, pan=HAND_PAN[kind])
    if S['log']:
        for s, iv, ln, g, bend, v in LOG[S['log']]:
            root = LOGR[chord(bar, s)]
            gl = root + g if g is not None else None
            if s == 0 and bar == 1:
                gl = 45                                                       # the drop: the log drum falls an octave into A1
            if s == 0 and bar in (5, 9):
                gl = 40                                                       # E to A
            if s == 0 and is_hit(bt(bar)):
                lognotes.append((at(bar, s), root + iv, 3 * STEP, gl, bend, 1.3, 2.0))   # the drop: harder, and it rings
                continue
            lognotes.append((at(bar, s), root + iv, ln * STEP, gl, bend, hv(v, 0.05)))
    if S['ep']:
        for s, ln, v in EP[S['ep']]:
            for j, m in enumerate(EPV[chord(bar, s)]):
                place(stem['keys'], at(bar, s) + 0.006 * j, ep_note(hz(m), ln * STEP, hv(v)), 1.0, pan=-0.3 + 0.15 * j)
    if S['kal']:
        for s, i, v in KP[S['kal']]:
            f = hz(KAL[chord(bar, s)][i])
            place(stem['kal'], at(bar, s), pluck(f, hv(v), KAL_LEN.get(S['kal'], 0.7)), 0.75 if S['lead'] else 1.0,
                  pan=0.35 * np.sin(1.7 * s + bar))
    if S['pad']:
        for half in (0, 1):
            ch = HALF[bar][half]
            place(stem['pad'], bt(bar, 8 * half), pad_chord(PADV[ch], BAR / 2 + 0.25), 1.0)
    if S['lead']:
        for s, m, ln in S['lead']:
            leadnotes.append((at(bar, s), m, ln * STEP, 1.0))
            place(lead_dbl, at(bar, s), pluck(hz(m - 12), 0.8, 0.45), 1.0, pan=0.05)

# three fills, each different: into the drop (below, in the cold open), into the 77 file, and into the end card (after the 21.5 slam)
fill(4, 'call', 0.75)
fill(10, 'flams', 0.6, flam=True)

# ---- the cold open (bar 0, 0-2 s): filtered keys, kalimba and pad, shakers creeping in, a log-drum hit with VOL. 001 at 1.0 -----
intro = M.buf()
for s, ln, v in EP['A']:
    for j, m in enumerate(EPV['Am']):
        place(intro, at(0, s) + 0.006 * j, ep_note(hz(m), ln * STEP, v * 0.9), 0.9, pan=-0.3 + 0.15 * j)
for s, i, v in KP['A']:
    if s >= 4:
        place(intro, at(0, s), pluck(hz(KAL['Am'][i]), v), 0.8, pan=0.35 * np.sin(1.7 * s))
place(intro, 0.0, pad_chord(PADV['Am'], 2.0), 0.9)
for s in range(4, 16):
    place(stem['perc'], at(0, s), SHAKERS[R.integers(8)], (0.15 + 0.5 * (s - 4) / 11) * (0.55, 0.32, 0.85, 0.4)[s % 4] * 0.6, pan=0.32)
place(stem['kick'], 1.0, K, 0.85)
kicks.append(1.0)
lognotes.append((1.0, 33, 0.45, 45, 0, 0.85))
fill(0, 'climb', 0.45)
tline = tt(N)
intro = M.sweep_lp(intro, np.where(tline < 2.0, 320 * (9000 / 320) ** np.clip(tline / 1.9, 0, 1) ** 2, 20000))

# ---- the final hit, 24.0, and the tail to 26.0 --------------------------------------------------------------------------------------
TF = bt(LAST)
place(stem['kick'], TF, K, 1.4)
kicks.append(TF)
lognotes.append((TF, 33, 1.5, 45, -2, 1.3, 2.5))
for j, m in enumerate(EPV['Am'] + [76]):
    place(stem['keys'], TF + 0.012 * j, ep_note(hz(m), 1.6, 0.85), 1.0, pan=-0.3 + 0.12 * j)
place(stem['pad'], TF, pad_chord(PADV['Am'], 1.9), 1.0)
for j, m in enumerate((69, 72, 76, 79, 81, 84, 88)):
    place(stem['kal'], TF + 0.05 + 0.055 * j, pluck(hz(m), 0.8 - 0.05 * j), 0.8, pan=-0.4 + 0.13 * j)
leadnotes.append((TF, 81, 1.15, 1.0))
for s in range(0, 8):
    place(stem['perc'], at(LAST, s), SHAKERS[R.integers(8)], (0.55, 0.32, 0.85, 0.4)[s % 4] * 0.5 * (1 - s / 9), pan=0.32)
place(hands, 24.5, conga_lo(0.9), 0.45, pan=-0.25)
place(hands, 24.5 + STEP, conga_hi(0.7), 0.35, pan=-0.4)
for h in HITS:                                                                # the payoffs: a sub drop under the kick
    place(stem['kick'], h, sub_drop(), 0.55)

# ---- build the lines, sidechain, space ------------------------------------------------------------------------------------------
stem['log'] = log_line(lognotes)
stem['lead'] = whistle_line(leadnotes) + lead_dbl * 0.3


def duck_shape(depth, tau, attack, hold=0.0):
    """A sidechain dip: down by depth over attack seconds on a raised-cosine curve (no step and no corner in the gain, so no
    click), held for hold seconds, back up with time constant tau, and long enough (7 tau) that it ends within a fraction of a
    percent of unity."""
    x = tt(int((hold + max(0.25, 7 * tau)) * SR))
    ramp = 0.5 - 0.5 * np.cos(np.pi * np.minimum(1, x / attack))
    return 1 - depth * ramp * np.exp(-np.maximum(x - hold, 0) / tau)


def duck_curve(depth, tau, times, attack=0.004):
    d = np.ones(N)
    c = duck_shape(depth, tau, attack)
    for k in times:
        i = int(round(k * SR))
        n = min(len(c), N - i)
        if n > 0:
            d[i:i + n] = np.minimum(d[i:i + n], c[:n])
    return d[:, None]


# the kick's thump comes first, the log drum after it; but not on the two payoffs, where the log drum hits with the kick
stem['log'] *= duck_curve(0.5, 0.05, [k for k in kicks if not is_hit(k)])
stem['pad'] *= duck_curve(0.6, 0.11, kicks)
stem['keys'] *= duck_curve(0.22, 0.08, kicks)
stem['kal'] *= duck_curve(0.15, 0.06, kicks)
hands = shelf(hands, 280, -5, 'low')                                           # the conga bodies, out of the low-mid build-up
stem['perc'] = shelf(stem['perc'] + hands, 2500, 3, 'high')                    # presence, where a phone speaker is loudest
pk_T = 1.5 * np.percentile(np.abs(stem['perc']), 99.9)                          # a soft clip for the few hits where a shaker, an
stem['perc'] = pk_T * np.tanh(stem['perc'] / pk_T)                               # open hat and a rim land together; the groove is untouched

rv = M.reverb_ir(1.7, seed=11)
room = M.reverb_ir(0.55, damp=7000, seed=7)
lfo = np.sin(2 * np.pi * 4.2 * tline)                                          # tine piano auto-pan
stem['keys'] = stem['keys'] * np.stack([1 + 0.22 * lfo, 1 - 0.22 * lfo], axis=1)
stem['keys'] = shelf(hp(stem['keys'] + intro, 230), 500, -3, 'low')             # the keys stay above the log drum and the congas
stem['keys'] = stem['keys'] + 0.4 * bp(stem['keys'], 1800, 4500)                 # presence, for phone speakers
stem['kal'] = stem['kal'] + 0.3 * bp(stem['kal'], 1800, 4500)
stem['keys'] = stem['keys'] + M.conv_stereo(stem['keys'], rv) * 0.26
stem['kal'] = stem['kal'] + M.pingpong(stem['kal'], d=STEP * 3, fb=0.35, taps=5, tone=4200) * 0.3 + M.conv_stereo(stem['kal'], rv) * 0.18
stem['lead'] = stem['lead'] + M.conv_stereo(stem['lead'], rv) * 0.3 + M.pingpong(stem['lead'], d=STEP * 3, fb=0.3, taps=4, tone=3500) * 0.16
stem['perc'] = stem['perc'] + M.conv_stereo(hp(stem['perc'], 300), room) * 0.14
air = M.pan2(M.bp(M.noise(N), 3000, 9000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.23 * tline)), 0) * 0.012
stem['pad'] = hp(lp(stem['pad'], 1700), 250) + air * (np.abs(stem['pad']).max() > 0)
stem['pad'] = stem['pad'] + M.conv_stereo(stem['pad'], rv) * 0.2

# fx: a soft riser into the drop and into the end card, a reverse cymbal into the drop and the final hit, crashes on the big changes
# (the riser into the drop is kept low, so the build tops out well under the drop; the payoffs get a doubled crash and a clap,
# and the crash into the end card at 22.0 is kept light so the final hit at 24.0 stands over it)
for a, b, g in ((0.35, 1.95, 0.21), (21.1, 21.97, 0.24)):
    place(stem['fx'], a, M.riser(a, b, g), 1.0)
for tp, d, g in ((2.0, 1.0, 0.32), (24.0, 0.9, 0.3)):
    place(stem['fx'], tp - d, M.rev_cym(d), g)
for tc, g in ((2.0, 1.1), (10.0, 0.6), (18.0, 0.6), (22.0, 0.3), (24.0, 1.2)):
    place(stem['fx'], tc, M.crash(), g)
    if is_hit(tc):
        place(stem['fx'], tc + 0.009, M.crash()[:, ::-1], g)
        place(stem['fx'], tc, hp(M.clap(), 300), 0.5, pan=-0.05)

# ---- the balance -------------------------------------------------------------------------------------------------------------
GAIN = {'kick': 0.78, 'log': 0.4, 'perc': 1.1, 'keys': 0.19, 'kal': 0.23, 'pad': 0.55, 'lead': 0.13, 'fx': 0.55}
music = {k: v * GAIN[k] for k, v in stem.items()}

# gaps: the music drops out for a breath before the drop and before the final hit (the effects carry on)
for a, b in ((1.95, 2.0), (23.93, 24.0)):
    i, j = int(a * SR), int(b * SR)
    r = int(0.004 * SR)
    g = np.ones(N)
    g[i:j] = 0
    g[i - r:i] = np.linspace(1, 0, r)
    g[j:j + r] = np.linspace(0, 1, r)
    for k_, v in music.items():
        if k_ != 'fx':
            v *= g[:, None]
fade = np.ones(N)
i0 = int(25.15 * SR)
fade[i0:] = np.linspace(1, 0, N - i0) ** 1.6
for v in music.values():
    v *= fade[:, None]


def lufs(x):
    """Integrated loudness (ITU-R BS.1770: K-weighting, 400 ms blocks, absolute and relative gates)."""
    if x.ndim == 1:
        x = x[:, None]
    y = sg.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x, axis=0)
    y = sg.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], y, axis=0)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.sum(np.mean(y[i:i + blk] ** 2, axis=0)) for i in range(0, len(y) - blk + 1, hop)])
    lv = -0.691 + 10 * np.log10(ms + 1e-20)
    g = ms[lv > -70]
    if not len(g):
        return -99.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    return float(-0.691 + 10 * np.log10(ms[(lv > -70) & (lv > rel)].mean()))


# ---- the effects: the trap version's stem and events, unchanged ------------------------------------------------------------------
sr_, sfx = wf.read(os.path.join(HERE, 'sfx.wav'))
assert sr_ == SR and sfx.shape == (N, 2), 'run make_audio.py first: audio/sfx.wav is missing or the wrong length'
sfx = sfx.astype(np.float64)
with open(os.path.join(HERE, 'events.json')) as fh:
    meta = json.load(fh)
M.EVENTS.extend(meta['events'])

# the music ducks under the big effects with finish()'s shape (down 0.45, back up with a 0.14 s time constant), here with a 3 ms
# attack and a tail that runs out to unity; not at the two payoffs, where the music hits with the impact, not under it
DUCK_KINDS = ('slam', 'stamp', 'impact', 'boom', 'clock')
duck = np.ones(N)
for e in M.EVENTS:
    if e['kind'].startswith(DUCK_KINDS) and not is_hit(e['t']):
        c = duck_shape(0.45, 0.14, 0.003)
        i = int(e['t'] * SR)
        n = min(len(c), N - i)
        duck[i:i + n] = np.minimum(duck[i:i + n], c[:n])
# and a 2.5 dB dip under the page flaps of the riffle and each ripple of split-flap clacks, so they read through the groove
for e in M.EVENTS:
    if (4.0 <= e['t'] < 6.0 and e['kind'] in ('riffle', 'page')) or (14.0 <= e['t'] < 16.0 and e['kind'] == 'flip'):
        c = duck_shape(0.25, 0.12, 0.012, hold=0.22 if e['kind'] == 'flip' else 0.06)
        i = int(e['t'] * SR)
        n = min(len(c), N - i)
        duck[i:i + n] = np.minimum(duck[i:i + n], c[:n])
for k_ in music:
    music[k_] = peq(peq(music[k_], 420, -4.5, 0.7), 2200, 3.5, 0.7) * duck[:, None]   # the bus: less box, more presence

m_sum = sum(music.values())
L_music, L_sfx = lufs(m_sum), lufs(sfx)
music_gain = 10 ** ((L_sfx + MUSIC_OVER_SFX - L_music) / 20)
pk = float(np.max(np.abs(m_sum * music_gain + sfx)))
scale = min(1.0, 0.98 / pk)                                                   # the sum goes into finish()'s soft clipper under 0.98
# finish() normalises its soft-clipped mix to 0.89 and writes the music stem with the same gain: keep that stem under 0.98 too
pm = float(np.max(np.abs(m_sum * music_gain)))
while pm * scale * 0.89 / float(np.max(np.abs(np.tanh(1.05 * scale * (m_sum * music_gain + sfx))))) * 1.05 > 0.98:
    scale *= 0.98
print('loudness (LUFS) of each stem in the music bus:')
for k, v in music.items():
    print(f'  {k:5s} {lufs(v):6.1f}   peak {np.max(np.abs(v)):.3f}')
print(f'  music {L_music:6.1f}   sfx {L_sfx:6.1f}   music gain {music_gain:.3f}   sum peak {pk:.3f}   scale {scale:.3f}')
lo = lambda x: float(np.sqrt(np.mean(lp(x.mean(axis=1), 120, order=4) ** 2)))
print(f'  under 120 Hz (rms): kick {lo(music["kick"]):.4f}  log drum {lo(music["log"]):.4f}  rest {lo(m_sum - music["kick"] - music["log"]):.4f}')

os.makedirs(OUT, exist_ok=True)
if os.environ.get('AFRO_STEMS'):
    d = os.environ['AFRO_STEMS']
    os.makedirs(d, exist_ok=True)
    for k, v in music.items():
        wf.write(os.path.join(d, f'{k}.wav'), SR, (v * music_gain * scale).astype(np.float32))
peak = M.finish(music, sfx * scale, OUT, music_gain=music_gain * scale,
                extra={'film': 'magazine motion ad, 26 s, 30 fps; bar 1 (the drop) at 2.0 s, final hit at 24.0 s',
                       'music': 'afro version (make_audio_afro.py); effects: the trap version\'s sfx.wav'},
                duck_kinds=())                                                # ducked above
print('peak before norm', round(peak, 3), 'events', len(M.EVENTS))
