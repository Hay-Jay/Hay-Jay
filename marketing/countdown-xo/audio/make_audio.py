"""Sound effects for the Sunday countdown promo (countdown-xo). The film is the first countdown promo's animation laid on a 155 BPM
grid (index.html's WARP: every scene starts on a bar line), so the effects are written in the original film's seconds (u) and moved
onto the new timeline with the same mapping. The split-flap clock runs on real seconds: its clack is placed in real time.

There is no music here. The song goes on with audio/mix_song.py, or in the app over the effects-only cut.

    python3 audio/make_audio.py     # sfx.wav and events.json in audio/
"""
import json
import os
import sys

import numpy as np
import scipy.io.wavfile as wf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
import mcsound as M  # noqa: E402

BPM = 155
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = 790 / 30
T_CLOCK = 2 * BAR                       # the clock slams in reading 24:00:00 (the drop, bar 3)
M.setup(DUR, bpm=BPM, bar1=0.0, seed=1810)
fr, place = M.fr, M.place

# index.html's WARP, inverted: (u0, u1, t0, t1)
SEG = [(0, 2, 0, 2 * BAR), (2, 6, 2 * BAR, 5 * BAR), (6, 10, 5 * BAR, 8 * BAR), (10, 14, 8 * BAR, 11 * BAR), (14, 18, 11 * BAR, 14 * BAR),
       (20, 24, 14 * BAR, 17 * BAR)]


def T(u):
    """The real time (s) of the original film's moment u."""
    for u0, u1, t0, t1 in SEG:
        if u <= u1 or (u0, u1) == (20, 24):
            return t0 + (u - u0) * (t1 - t0) / (u1 - u0)
    raise ValueError(u)


def K(u):
    """How many real seconds one u-second lasts at u (for sounds that run across a stretch of the film)."""
    for u0, u1, t0, t1 in SEG:
        if u <= u1:
            return (t1 - t0) / (u1 - u0)
    return 3 * BAR / 4


S = M.buf()
EV = []


def P(u, sig, g=1.0, pan=0.0):
    place(S, fr(T(u)), sig, g, pan)


def E(u, kind, note):
    EV.append({'t': round(fr(T(u)), 3), 'kind': kind, 'note': note})


def typing(text, u0, u1, vel=0.3, name=''):
    t0, t1 = T(u0), T(u1)
    for c in range(len(text)):
        if text[c] == ' ':
            continue
        tc = t0 + (t1 - t0) * (c + 0.5) / len(text)
        place(S, fr(tc), M.sfx_click(M.rng.uniform(0.7, 1.0)), vel, pan=M.rng.uniform(-0.1, 0.1))
    EV.append({'t': round(fr(t0), 3), 'kind': 'typing', 'note': name or text})


# ---- cold open (two bars): PRIORITY TRANSMISSION, then T-MINUS / 24 / HOURS on beats 4, 5 and 6 -------------------------------------
P(0.15, M.scan(1.75 * K(1)), 0.22); E(0.15, 'scan', 'signal wave')
typing('Priority transmission', 0.05, 0.55, 0.35, 'Priority transmission')
typing('Incoming — Monochrome Bureau', 0.45, 0.85, 0.25, 'Incoming')
for u, nm, g in ((1.0, 'T-MINUS', 0.6), (1.25, '24', 0.8), (1.5, 'HOURS', 0.6)):
    P(u, M.slam(), g); E(u, 'slam', nm)
P(1.25, M.boom(0.7, 1.0), 0.35)
P(1.85, M.glitch(0.12), 0.25)                                    # the 24 jitters before the drop

# ---- the drop (bar 3): the clock slams in at 24:00:00 ---------------------------------------------------------------------------
P(2.0, M.flap_clack(1.0, heavy=True), 0.9); P(2.0, M.boom(0.9, 1.3), 0.55); P(2.0, M.zap(), 0.25); E(2.0, 'clock', 'the clock slams in at 24:00:00')
typing('The Vision Issue', 2.1, 2.4, 0.22, 'The Vision Issue')
typing('Declassified in', 2.3, 2.6, 0.22, 'Declassified in')
P(2 + 2 / 3, M.slam(0.8), 0.5); E(2 + 2 / 3, 'slam', 'Sunday 18 October')
P(5.5, M.whoosh(0.5 * K(5), 0.35, 400, 4000), 0.45); E(5.5, 'whoosh', 'the clock flies to the top')

# ---- the clock's clack on every real second while a clock is on screen ------------------------------------------------------------
for n in range(1, 40):
    tc = T_CLOCK + n
    if tc >= DUR - 0.05:
        break
    if tc < 5 * BAR:
        g = 0.55                                                # the big clock
    elif tc < 11 * BAR:
        g = 0.3                                                 # the corner clock over the bag and the cities
    elif tc < 14 * BAR:
        g = 0.16                                                # the page's own clock on the phone
    else:
        g = 0.42                                                # the end card's clock
    place(S, fr(tc), M.flap_clack(), g, pan=0.05)
    EV.append({'t': round(fr(tc), 3), 'kind': 'tick', 'note': f'{86400 - n} s left'})

# ---- the sealed cover (three bars) ------------------------------------------------------------------------------------------------
P(6.0, M.zap(), 0.3)
P(6.0, M.whoosh(0.45 * K(6), 0.28, 250, 3000), 0.5); P(6.3, M.stamp_thump(0.6), 0.45); E(6.3, 'card', 'evidence bag lands')
for a in (6.45, 6.58, 6.71):
    P(a, M.whoosh(0.14, 0.08, 1800, 6000), 0.22); E(a + 0.12, 'swish', 'redaction bar')
P(6.55, M.scan(1.85 * K(7)), 0.35); E(6.55, 'scan', 'laser scan')
P(6 + 4 / 3, M.stamp_thump(), 0.85); E(6 + 4 / 3, 'stamp', 'CLASSIFIED')
P(8.0, M.whoosh(0.35, 0.25, 600, 3500), 0.3); P(8 + 1 / 3, M.page_turn(0.6, 0.2), 0.4); E(8 + 1 / 3, 'card', 'tag lands: sealed until 18.10')
P(8.3, M.beep(1760, 0.08), 0.3); P(8.32, M.shimmer(0.6, f0=2400, f1=6200), 0.4); E(8.3, 'beep', 'peek lens opens')
P(9.0, M.beep(660, 0.12), 0.45); P(9.15, M.beep(660, 0.12), 0.45); P(9.0, M.stamp_thump(), 0.75); E(9.0, 'stamp', 'DENIED')

# ---- four cities (three bars, one city every three beats) ----------------------------------------------------------------------
for i, city in enumerate(('Regina', 'Lagos', 'Toronto', 'London')):
    u = 10.0 + i
    P(u, M.whoosh(0.3, 0.15, 300, 4200), 0.45, pan=-0.3 + 0.2 * i)
    P(u + 0.16, M.slam(0.9), 0.55); E(u + 0.16, 'slam', city + ' Sun')
    P(u + 0.2, M.beep(2093, 0.1, 0.7), 0.2, pan=0.3)
P(10.0, M.zap(), 0.3)

# ---- the countdown page on a phone (three bars) -----------------------------------------------------------------------------------
P(14.0, M.zap(), 0.25)
P(14.0, M.whoosh(0.45, 0.35, 200, 2600), 0.5); P(14.4, M.stamp_thump(0.4), 0.3); E(14.4, 'card', 'phone lands')
P(14 + 2 / 3, M.stamp_thump(0.8), 0.6); E(14 + 2 / 3, 'stamp', 'LIVE NOW')
P(14.85, M.swipe(0.6), 0.9); E(14.85, 'swipe', 'scroll')
P(16.0, M.tap(1.0), 0.6); E(16.0, 'tap', 'tap: pre-order a copy')
P(16.5, M.swipe(0.7), 0.9); E(16.5, 'swipe', 'scroll')
P(14 + 10 / 3, M.stamp_thump(0.8), 0.6); E(14 + 10 / 3, 'stamp', 'PRE-ORDERS OPEN')

# ---- the end card (three bars) -----------------------------------------------------------------------------------------------------
P(20.0, M.boom(1.0, 1.4), 0.6); P(20.0, M.zap(), 0.3); P(20.0, M.slam(), 0.65); E(20.0, 'boom', 'end card: 24 HOURS.')
typing('Watch it hit zero', 20.3, 20.75, 0.3, 'Watch it hit zero')
P(20 + 2 / 3, M.slam(0.9), 0.6); E(20 + 2 / 3, 'slam', 'monochrome.com.ng')
P(21.15, M.whoosh(0.35, 0.25, 600, 3500), 0.3); P(21 + 1 / 3, M.tap(0.7), 0.3); E(21 + 1 / 3, 'click', 'Pre-orders open')
P(22.4, M.shimmer(0.7, f0=2400, f1=6600), 0.4); E(22.4, 'shimmer', 'light across 24 HOURS.')

# the effects' tails fade over the last bar
f = np.ones(M.N)
i = int((DUR - 1.2) * M.SR)
f[i:] = np.linspace(1, 0, M.N - i) ** 1.6
S *= f[:, None]

peak = float(np.max(np.abs(S)))
wf.write(os.path.join(HERE, 'sfx.wav'), M.SR, np.clip(S * (0.89 / peak), -1, 1).astype(np.float32))
EV.sort(key=lambda e: e['t'])
json.dump({'film': 'countdown-xo: 790 frames at 30 fps; 155 BPM grid, bar = %.6f s; the drop (clock 24:00:00) at %.4f s' % (BAR, T_CLOCK),
           'bpm': BPM, 'bar': BAR, 'drop': T_CLOCK, 'events': EV}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1)
print('peak', round(peak, 3), 'events', len(EV))
