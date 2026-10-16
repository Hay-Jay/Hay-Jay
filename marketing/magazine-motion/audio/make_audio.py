"""Soundtrack for the magazine motion ad: an original trap beat at 120 BPM (a beat is 0.5 s and a bar 2 s, bar 1 is the drop at 2.0 s,
the final hit is bar 12 at 24.0 s) and effects placed on the frames of index.html's animation. Kit: marketing/lib/mcsound.py.
The beat is the countdown promo's (backbeat, sixteenth hats) on new chords (C#m – A – E – B), a new lead riff and new bell lines.

    python3 audio/make_audio.py     # music.wav, sfx.wav, mix-premaster.wav, events.json in audio/
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
import mcsound as M  # noqa: E402

DUR = 26.0
M.setup(DUR, bpm=120, bar1=2.0, seed=2026)
fr, place, ev, bt = M.fr, M.place, M.ev, M.bt
clamp = lambda v, a=0.0, b=1.0: min(b, max(a, v))

# ---- the music --------------------------------------------------------------------------------------------------------------------
M.RIFF = [(0, 0), (2, 2), (3, 1), (5, 3), (6, 2), (8, 0), (10, 1), (11, 2), (13, 3), (14, 1)]
M.BELLS.update({
    'Cm': [(0, 80), (2, 76), (4, 85), (7, 83), (8, 80), (11, 76), (12, 83), (14, 85)],
    'Cm2': [(0, 80), (2, 76), (4, 85), (7, 88), (8, 87), (11, 85), (12, 83), (14, 80)],
    'A': [(0, 81), (2, 76), (4, 85), (7, 88), (8, 85), (11, 81), (12, 80), (14, 76)],
    'E': [(0, 83), (2, 80), (4, 87), (7, 88), (8, 87), (11, 83), (12, 80), (14, 83)],
    'B': [(0, 83), (2, 78), (4, 87), (7, 90), (8, 87), (11, 85), (12, 83), (14, 82)],
})
music, kicks = M.build_beat({
    'loop': ['Cm', 'A', 'E', 'B'],
    'last': 12,                                   # 24.0: the final hit (kick, 808, bells and a crash on E)
    'full': {1, 2, 3, 4, 5, 7, 9, 10, 11},
    'thin': {6, 8},                               # fashion show and play lab: 808, kick and clap only
    'hook': {1, 4, 5, 9, 10, 11},                 # the lead: the drop, the orbit, the 77 file, camera roll, facts, end
    'backbeat': True, 'hat16': True,
    'stabs': [(1.0, 0.8)],                        # VOL. 001
    'fills': [bt(4, 12), bt(7, 12), bt(10, 12)],  # into the zoom-through, the play lab and the end
    'crashes': [2.0, 10.0, 14.0, 18.0, 22.0],
    'risers': [(0.35, 1.95, 0.42), (9.05, 9.97, 0.3), (21.1, 21.97, 0.32)],
    'revcyms': [(2.0, 1.1, 0.4), (10.0, 0.8, 0.3), (24.0, 1.0, 0.38)],
    'gaps': [(1.95, 2.0), (23.93, 24.0)],
    'end_fade': 25.15,
})

# the cold open (before bar 1): a C#m pad and a bell arpeggio opening from a low-pass, under the riser
intro = M.buf()
for j, m in enumerate((73, 76, 80, 83, 85, 88, 92)):
    place(intro, 0.08 + 0.25 * j, M.bell_st(M.hz(m), 1.2), 0.26)
n = int(2.0 * M.SR)
chord = sum(M.supersaw_note(M.hz(m), 2.0, voices=3, spread=0.12) for m in (49, 52, 56, 59)) / 4
chord *= np.minimum(1, M.tt(n) / 0.6)[:, None] * np.minimum(1, (n - np.arange(n)) / (0.05 * M.SR))[:, None]
place(intro, 0.0, chord, 0.4)
sub = np.sin(2 * np.pi * M.hz(37) * M.tt(n)) * np.minimum(1, M.tt(n) / 0.8) * np.minimum(1, (n - np.arange(n)) / (0.05 * M.SR))
place(intro, 0.0, sub, 0.25)
tline = M.tt(M.N)
intro = M.sweep_lp(intro, np.where(tline < 2.0, 500 * (12000 / 500) ** np.clip(tline / 1.9, 0, 1) ** 2, 20000))
intro += M.conv_stereo(intro, M.reverb_ir(1.6)) * 0.25
music['intro'] = intro

# ---- the effects ------------------------------------------------------------------------------------------------------------------
S = M.buf()
P = lambda t, sig, g=1.0, pan=0.0: place(S, fr(t), sig, g, pan)


def flap(vel=1.0, dur=0.07, bright=1.0):
    """A single page snapping past in a riffle: a paper slap and a little air."""
    nn = int(dur * M.SR)
    t = M.tt(nn)
    slap = M.bp(M.noise(nn), 700 * bright, 6500 * bright) * np.exp(-t * 90)
    thup = np.sin(2 * np.pi * (160 + 60 * M.rng.random()) * t) * np.exp(-t * 70) * 0.5
    return np.tanh((slap + thup) * 1.3) * vel


def zip_(dur, f0=700, f1=5200, vel=1.0):
    """A line drawing itself: a band of noise sweeping up, with a little stutter."""
    nn = int(dur * M.SR)
    t = M.tt(nn)
    k = t / dur
    fc = f0 * (f1 / f0) ** k
    y = M.sweep_bp(M.noise(nn), fc * 0.7, np.minimum(fc * 1.5, 20000))
    trem = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 34 * t))
    return M.fade_edges(y * trem * np.sin(np.pi * k) ** 0.6 * vel, 0.004, 0.03)


def scribble(dur=0.12, vel=1.0):
    """A marker going round an answer."""
    nn = int(dur * M.SR)
    t = M.tt(nn)
    y = M.bp(M.noise(nn), 2200, 7000) * (0.55 + 0.45 * np.sin(2 * np.pi * 28 * t) ** 2)
    return M.fade_edges(y * vel, 0.005, 0.03)


def ticks(t0, dur, count, ease_inv, vel=0.25, bright=5200):
    """A rolling counter: one click each time it passes a whole number (times from the film's easing)."""
    for nidx in range(1, count + 1):
        u = ease_inv(nidx / count)
        P(t0 + dur * u, M.sfx_click(0.6 + 0.4 * M.rng.random(), bright), vel, pan=M.rng.uniform(-0.15, 0.15))


inv_o3 = lambda y: 1 - (1 - y) ** (1 / 3)

# 0–2 the cold open: rings, the sphere, the name tracking in, VOL. 001, the rush through the rings
P(0.0, M.shimmer(0.9, f0=1600, f1=5200), 0.3); ev(0.0, 'shimmer', 'rings draw on')
M.typing('Incoming — Monochrome Bureau', 0.05, 0.5, S, vel=0.22, name='Incoming — Monochrome Bureau')
for j, (a, pan) in enumerate(((0.32, -0.5), (0.85, 0.5), (1.25, -0.4), (1.55, 0.45), (1.75, -0.3))):
    P(a, M.whoosh(0.32 - 0.04 * j, 0.14, 500, 5200), 0.22 + 0.04 * j, pan=pan); ev(a, 'whoosh', 'the sphere streaks past')
for i in range(10):
    P(0.31 + i * 0.045, M.sfx_click(0.8, 3600), 0.3, pan=(i - 4.5) * 0.08)
ev(0.31, 'typing', 'MONOCHROME tracks in')
for i in range(8):
    P(0.7 + i * 0.04, M.sfx_click(0.6, 6000), 0.18, pan=(i - 3.5) * 0.08)
P(1.0, M.slam(0.9), 0.6); P(1.0, M.boom(0.5, 0.9), 0.3); ev(1.0, 'slam', 'VOL. 001')
for i in range(6):
    P(0.65 + 0.19 * i, M.beep(3136 + 260 * (i % 3), 0.05, 0.5), 0.08, pan=0.4 * (-1) ** i)
M.typing('The Vision Issue', 1.1, 1.4, S, vel=0.18, name='The Vision Issue')
P(1.45, M.whoosh(0.55, 0.5, 300, 7000), 0.45); ev(1.45, 'whoosh', 'rush through the rings')

# 2–4 the drop: the magazine spins in from deep space and lands; THE / VISION / ISSUE slam on the beats
P(2.0, M.boom(1.0, 1.4), 0.6); P(2.0, M.zap(), 0.3); ev(2.0, 'boom', 'the drop')
P(2.0, M.whoosh(0.55, 0.42, 180, 3200), 0.5); ev(2.0, 'whoosh', 'the magazine spins in')
for a in (2.08, 2.2, 2.33):
    P(a, M.whoosh(0.14, 0.07, 900, 4200), 0.16)
P(2.0, M.slam(), 0.55); ev(2.0, 'slam', 'THE')
P(2.5, M.stamp_thump(0.8), 0.6); P(2.5, M.slam(), 0.55); ev(2.5, 'slam', 'VISION, the magazine lands')
P(3.0, M.slam(), 0.55); ev(3.0, 'slam', 'ISSUE')
P(3.0, M.shimmer(0.5, f0=2600, f1=7200), 0.35); ev(3.0, 'shimmer', 'light across the cover')
P(3.82, M.whoosh(0.35, 0.28, 600, 5000), 0.35, pan=0.3); ev(3.82, 'whoosh', 'the type flies out')

# 4–6 the riffle: every leaf a flap, timed from the film (forward through the issue, back to 05), then the push into page 05
P(4.0, M.whoosh(0.95, 0.85, 400, 5200), 0.25); ev(4.0, 'riffle', 'the thumb runs through the issue')
for i in range(9):                                        # forward: p = 8.8 (l / .95)^1.5, leaf i turns over p in [.9 i, .9 i + 1.6]
    l_of = lambda p: 0.95 * (p / 8.8) ** (1 / 1.5)
    a, b = 4.0 + l_of(0.9 * i), 4.0 + l_of(0.9 * i + 1.6)
    if i == 0:
        P(a, M.page_turn(0.9, b - a), 0.6); ev(a, 'page', 'the cover opens')
    else:
        P(a, M.page_turn(0.6, max(0.08, b - a)), 0.32, pan=-0.1 * (i % 3 - 1))
        P(b - 0.01, flap(0.9), 0.38, pan=-0.25); ev(b, 'page', f'leaf {i + 1} lands')
for i in range(8, 1, -1):                                 # back: q = 9 - 7 o3(u), u over .95–1.38; leaf i lands back at q = i
    u = inv_o3((9 - i) / 7)
    tl = 4.0 + 0.95 + 0.43 * u
    P(tl - 0.02, flap(0.8, bright=1.2), 0.34, pan=0.25); ev(tl, 'page', f'leaf {i + 1} back')
P(4.95, M.whoosh(0.4, 0.12, 2400, 600), 0.22)
P(5.3, M.whoosh(0.7, 0.62, 250, 3600), 0.42); ev(5.3, 'whoosh', 'push into page 05')

# 6–8 the team: the cards pop off the page and land in a grid; MEET / THE / DREAM / TEAM
P(6.0, M.stamp_thump(0.5), 0.35); ev(6.0, 'impact', 'page 05 fills the frame')
for i, x in enumerate((177, 419, 661, 903, 298, 540, 782)):
    ti = 6.0 + 0.08 + i * 0.055
    pan = (x - 540) / 540 * 0.6
    P(ti, M.whoosh(0.22, 0.08, 1400, 6200), 0.2, pan=pan)
    P(ti + 0.3, M.tap(0.8), 0.32, pan=pan); ev(ti + 0.3, 'card', f'portrait {i + 1} lands')
for a, w in ((6.5, 'MEET'), (6.75, 'THE'), (7.0, 'DREAM'), (7.5, 'TEAM')):
    P(a, M.slam(0.9 if w != 'THE' else 0.7), 0.55); ev(a, 'slam', w)
M.typing('One vision / many talents', 7.1, 7.45, S, vel=0.18, name='One vision / many talents')
P(7.25, M.shimmer(0.5, f0=2400, f1=6800), 0.3); ev(7.25, 'shimmer', 'light across the cards')
P(7.6, M.whoosh(0.4, 0.37, 300, 4800), 0.4); ev(7.6, 'whoosh', 'the cards collapse into the orbit')

# 8–10 the orbit: the ring bursts out; it kicks round 45° on every beat; STYLE / PLAY / CULTURE
P(8.0, M.boom(0.7, 1.0), 0.4); P(8.0, M.whoosh(0.4, 0.06, 4000, 400), 0.35); ev(8.0, 'boom', 'the ring bursts out')
for b, w in enumerate(('STYLE', 'PLAY', 'CULTURE', 'STYLE + PLAY + CULTURE')):
    a = 8.0 + 0.5 * b
    P(a, M.slam(0.85), 0.5); ev(a, 'slam', w)
    P(a, M.whoosh(0.32, 0.1, 800, 4400), 0.26, pan=0.5 * (-1) ** b)
for i in range(15):
    P(8.04 + i * 0.025, M.sfx_click(0.5, 4800), 0.12, pan=(i - 7) * 0.06)
P(9.0, M.shimmer(0.45, f0=2600, f1=7000), 0.25)
P(9.7, M.whoosh(0.32, 0.3, 300, 7500), 0.5); ev(9.7, 'whoosh', 'zoom through page 08')

# 10–12 the 77 file: the numerals draw on and slam; the photo slides in in panels; FILE 77
P(10.0, M.zap(), 0.35); P(10.0, M.boom(0.6, 0.9), 0.35); ev(10.0, 'impact', 'into the 77 file')
P(10.0, zip_(0.45, 500, 3200), 0.3); P(10.1, zip_(0.42, 600, 3600), 0.25, pan=0.3); ev(10.0, 'draw', '77 draws on')
for i in range(11):
    P(10.04 + i * 0.03, M.sfx_click(0.5, 4200), 0.1)
M.typing('P.08 — Number one energy', 10.2, 10.55, S, vel=0.15, name='P.08 label')
for i in range(4):                                        # the panels slide in (d = .42 + .04 i), flush by 10.84
    P(10.42 + 0.04 * i, M.whoosh(0.22, 0.1, 500, 4200), 0.24, pan=-0.45 + 0.3 * i)
P(10.5, M.slam(), 0.75); P(10.5, M.boom(0.9, 1.2), 0.45); ev(10.5, 'slam', '77 slams')
P(11.5, M.stamp_thump(), 0.75); ev(11.5, 'stamp', 'FILE 77')
for i in range(4):
    P(11.74 + 0.03 * i, M.whoosh(0.2, 0.12, 600, 3800), 0.2, pan=-0.45 + 0.3 * i)

# 12–14 fashion show: blinds slide in, the slats flip, the lines track across
for j in range(0, 12, 3):
    P(11.87 + 0.02 * j, M.whoosh(0.3, 0.1, 400, 4400), 0.24, pan=0.5 * (-1) ** (j // 3)); ev(11.87 + 0.02 * j, 'whoosh', 'blinds slide in')
P(12.1, M.whoosh(0.5, 0.25, 300, 3800), 0.35, pan=0.6); ev(12.1, 'whoosh', 'ONE NIGHT. tracks in')
P(12.35, M.whoosh(0.5, 0.25, 300, 3800), 0.35, pan=-0.6); ev(12.35, 'whoosh', 'A WHOLE WORLD. tracks in')
M.typing('P.13 — Fashion show / Regina', 12.2, 12.55, S, vel=0.15, name='P.13 label')
for j in range(12):
    P(12.98 + 0.025 * j + 0.15, M.flap_clack(0.55), 0.22, pan=-0.3 + 0.05 * j); ev(13.13 + 0.025 * j, 'flip', f'slat {j + 1}')
P(13.45, M.whoosh(0.4, 0.3, 500, 6000), 0.3, pan=-0.5); P(13.55, M.whoosh(0.4, 0.3, 500, 6000), 0.3, pan=0.5)
P(13.72, M.whoosh(0.32, 0.22, 400, 4600), 0.3); ev(13.72, 'whoosh', 'blinds slide out')

# 14–16 the split-flap board: slams in, then every tile clacks as it lands, on the beats
P(14.0, M.flap_clack(1.0, heavy=True), 0.9); P(14.0, M.boom(0.8, 1.1), 0.45); ev(14.0, 'clock', 'the board slams in')
M.typing('All 20 pages', 14.05, 14.3, S, vel=0.18, name='All 20 pages')
for beat in (14.5, 15.0, 15.5):
    for i in range(20):
        r, c = divmod(i, 4)
        d = (r + c) * 0.028
        P(beat + d + 0.01, M.flap_clack(0.7 + 0.3 * M.rng.random()), 0.42 if i == 0 else 0.2, pan=-0.4 + 0.27 * c)
    ev(beat, 'flip', 'every tile flips (a ripple of clacks)')
for i in range(20):
    r, c = divmod(i, 4)
    P(15.5 + (r + c) * 0.028 + 0.14, M.sfx_click(0.5, 5600), 0.08, pan=-0.4 + 0.27 * c)
P(15.6, M.whoosh(0.25, 0.2, 2500, 900), 0.22)
P(15.74, M.whoosh(0.28, 0.26, 300, 7200), 0.45); ev(15.74, 'whoosh', 'page 10 flies out of the board')

# 16–18 play lab: the crossword fills, the maze solves itself, the quiz gets circled
P(16.0, M.slam(0.85), 0.55); ev(16.0, 'slam', 'PLAY LAB')
for nidx in range(12):
    P(16.02 + nidx * 0.012, M.tap(0.5), 0.12, pan=(nidx % 6 - 2.5) * 0.12)
for m in range(14):
    P(16.18 + 0.046 * m, M.typewriter_key(0.8 + 0.2 * M.rng.random()), 0.3, pan=M.rng.uniform(-0.2, 0.2))
ev(16.18, 'typing', 'THE VISION ISSUE fills the crossword')
for m, nm in ((2, 'THE'), (8, 'VISION'), (13, 'ISSUE')):
    a = 16.18 + 0.046 * m + 0.04
    P(a, M.beep(1568 if m < 13 else 2093, 0.12, 0.8), 0.18); ev(a, 'beep', f'{nm} complete')
M.typing('01 Across — A clear picture of the future', 16.2, 16.65, S, vel=0.1, name='clue')
P(16.85, M.whoosh(0.18, 0.12, 600, 3600), 0.35); ev(16.85, 'whoosh', 'whip to the maze')
P(17.0, zip_(0.38, 600, 4800), 0.4); ev(17.0, 'draw', 'the maze solves itself')
P(17.38, M.whoosh(0.14, 0.1, 600, 3600), 0.35); ev(17.38, 'whoosh', 'whip to the quiz')
for i in range(3):
    a = 17.5 + 0.125 * i
    P(a, scribble(0.12), 0.3, pan=-0.1); P(a + 0.08, M.beep(1760, 0.07, 0.7), 0.16); ev(a, 'tick', f'answer {i + 1} circled')
P(17.86, M.whoosh(0.16, 0.12, 900, 5200), 0.35)

# 18–20 camera roll: a shutter on every beat; the strip races three frames between beats
P(18.02, M.beep(1320, 0.09, 0.8), 0.14); ev(18.02, 'beep', 'REC')
for b in range(4):
    a = 18.0 + 0.5 * b
    P(a, M.shutter(), 0.55); ev(a, 'shutter', f'frame {b + 1}')
    P(a + 0.06, M.whoosh(0.44, 0.22, 500, 5000), 0.28, pan=0.45 * (-1) ** b)

# 20–22 the facts, with rolling counters
P(20.0, M.slam(), 0.6); P(20.0, M.boom(0.6, 0.9), 0.3); ev(20.0, 'slam', '20 PAGES')
ticks(20.0, 0.42, 20, inv_o3, 0.18)
P(20.5, M.stamp_thump(), 0.75); ev(20.5, 'stamp', 'PRINTED COPY')
P(21.0, M.slam(), 0.6); ev(21.0, 'slam', '$10 CAD')
ticks(21.0, 0.30, 10, inv_o3, 0.18)
P(21.5, M.slam(), 0.6); ev(21.5, 'slam', '29 COUNTRIES')
ticks(21.5, 0.15, 29, inv_o3, 0.12)                       # 29 reads by 21.65 and holds to the exit
for j in range(4):
    P(20.05 + 0.5 * j, M.whoosh(0.3, 0.06, 4200, 1200), 0.14, pan=0.4 * (-1) ** j)
P(21.84, M.whoosh(0.2, 0.14, 400, 4200), 0.3, pan=-0.4); ev(21.86, 'whoosh', 'the facts wipe out')

# 22–26 the end: the magazine flies in, closes, spins once, settles inside its orbit; OUT NOW; the final hit on 24.0
P(21.92, M.whoosh(0.3, 0.24, 200, 2800), 0.4); ev(21.93, 'whoosh', 'the magazine flies in')
P(22.0, M.page_turn(0.9, 0.3), 0.55); P(22.29, M.stamp_thump(0.6), 0.4); ev(22.29, 'impact', 'the cover shuts')
P(22.3, M.whoosh(0.8, 0.4, 200, 2600), 0.4); ev(22.3, 'whoosh', 'one spin')
P(22.45, M.shimmer(0.4, f0=2000, f1=5200), 0.2); ev(22.45, 'shimmer', 'wordmark wipes on')
P(22.85, M.shimmer(0.5, f0=1600, f1=4800), 0.22); ev(22.85, 'shimmer', 'the orbit draws on')
P(23.0, M.slam(), 0.65); ev(23.0, 'slam', 'OUT NOW')
P(23.05, M.shimmer(0.5, f0=2600, f1=7200), 0.32)
P(23.5, M.whoosh(0.3, 0.2, 600, 3800), 0.22); P(23.6, M.tap(0.7), 0.25)
M.typing('Requisition your copy', 23.52, 23.9, S, vel=0.18, name='Requisition your copy')
P(24.0, M.boom(1.0, 1.6), 0.75); P(24.0, M.slam(), 0.7); ev(24.0, 'boom', 'the final hit: monochrome.com.ng')
P(24.02, M.shimmer(0.6, f0=2600, f1=7600), 0.35)
P(24.5, M.slam(0.7), 0.42); P(24.5, M.tap(0.8), 0.2); ev(24.5, 'slam', 'the price line (out now) / the launch date (pre-order)')
for i in range(5):
    a = 23.2 + 0.37 * i + (0.6 if i > 2 else 0) + 0.25
    P(a, M.beep(3520 - 220 * (i % 2), 0.06, 0.5), 0.07, pan=0.5 * (-1) ** i)
P(24.9, M.shimmer(0.5, f0=2800, f1=7000), 0.18)

fade = np.ones(M.N)
i0 = int(25.15 * M.SR)
fade[i0:] = np.linspace(1, 0, M.N - i0) ** 1.6
S *= fade[:, None]

peak = M.finish(music, S, HERE, extra={'film': 'magazine motion ad, 26 s, 30 fps; bar 1 (the drop) at 2.0 s, final hit at 24.0 s'},
                duck_kinds=('slam', 'stamp', 'impact', 'boom', 'clock'))
print('peak before norm', round(peak, 3), 'events', len(M.EVENTS))
