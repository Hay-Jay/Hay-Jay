"""Soundtrack for the 24-hour countdown promo: an original trap beat at 120 BPM (a second is two beats, so the clock's clack falls on
the beat and every cut lands on a bar) and effects placed on index.html's animation times. Kit: marketing/lib/mcsound.py.

    python3 audio/make_audio.py     # music.wav, sfx.wav, mix-premaster.wav, events.json in audio/
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
import mcsound as M  # noqa: E402

DUR = 24.0
M.setup(DUR, bpm=120, bar1=2.0)      # bar 1 is the clock slamming in at 2.0; bars are 2 s: 2, 4, 6 … 22
fr, place, ev, bt = M.fr, M.place, M.ev, M.bt

music, kicks = M.build_beat({
    'last': 12,                                   # 24.0: past the end, so no separate final hit
    'full': {1, 2, 5, 6, 7, 8, 10, 11},
    'thin': {3, 4, 9},                            # the sealed bag and the redacted pages: 808, kick and clap only
    'hook': {5, 6, 10, 11},                       # the lead over the cities and the end card
    'backbeat': True, 'hat16': True,
    'intro_until': 2.0,
    'stabs': [(1.1, 0.7), (1.35, 1.0), (1.6, 0.7)],          # T-MINUS / 24 / HOURS land
    'fills': [bt(2, 12), bt(9, 12)],
    'crashes': [2.0, 10.0, 16.0, 20.0],
    'risers': [(0.6, 1.95, 0.35), (18.6, 19.95, 0.4)],
    'revcyms': [(2.0, 1.1, 0.4), (10.0, 0.8, 0.3), (20.0, 1.0, 0.4)],
    'gaps': [(1.95, 2.0), (19.95, 20.0)],
    'muffle': [(14.0, 16.0, 450, 3400, ('drums', 'bass', 'bells', 'pad', 'lead'))],   # the beat through the phone on screen
    'end_fade': 23.4,
})

S = M.buf()
P = lambda t, sig, g=1.0, pan=0.0: place(S, fr(t), sig, g, pan)

# ---- 0-2 cold open --------------------------------------------------------------------------------------------------------------
P(0.15, M.scan(1.75), 0.25); ev(0.15, 'scan', 'signal wave')
M.typing('Priority transmission', 0.05, 0.55, S, vel=0.35, name='Priority transmission')
M.typing('Incoming — Monochrome Bureau', 0.45, 0.85, S, vel=0.25, name='Incoming')
for t_, nm, g in ((1.1, 'T-MINUS', 0.6), (1.35, '24', 0.8), (1.6, 'HOURS', 0.6)):
    P(t_, M.slam(), g); ev(t_, 'slam', nm)
P(1.35, M.boom(0.7, 1.0), 0.35)

# ---- the clock: slams in at 2.0, then a clack on every second -------------------------------------------------------------------
P(2.0, M.flap_clack(1.0, heavy=True), 0.9); P(2.0, M.boom(0.9, 1.3), 0.5); ev(2.0, 'clock', 'clock slams in at 24:00:00')
for n in range(3, 24):
    g = 0.62 if n < 6 else 0.4 if n < 14 else 0.28 if n < 18 else 0.4 if n < 20 else 0.55
    P(float(n), M.flap_clack(), g, pan=0.05)
    ev(float(n), 'tick', f'{24 * 3600 - (n - 2):d} s left')
M.typing('The Vision Issue', 2.1, 2.4, S, vel=0.25, name='The Vision Issue')
P(2.6, M.slam(0.8), 0.5); ev(2.6, 'slam', 'Declassified in')
P(5.5, M.whoosh(0.5, 0.35, 400, 4000), 0.45); ev(5.5, 'whoosh', 'clock flies to the top')

# ---- 6-10 the sealed cover ------------------------------------------------------------------------------------------------------
P(6.0, M.zap(), 0.3)
P(6.0, M.whoosh(0.45, 0.28, 250, 3000), 0.5); P(6.3, M.stamp_thump(0.6), 0.45); ev(6.3, 'card', 'evidence bag lands')
for a in (6.45, 6.58, 6.71):
    P(a, M.whoosh(0.14, 0.08, 1800, 6000), 0.22); ev(a + 0.12, 'swish', 'redaction bar')
P(6.55, M.scan(1.85), 0.35); ev(6.55, 'scan', 'laser scan')
P(7.64, M.stamp_thump(), 0.85); ev(7.64, 'stamp', 'CLASSIFIED')
P(8.0, M.whoosh(0.35, 0.25, 600, 3500), 0.3); P(8.3, M.page_turn(0.6, 0.2), 0.4); ev(8.3, 'card', 'tag swings in')
P(8.45, M.beep(1760, 0.08), 0.3); P(8.5, M.shimmer(0.6, f0=2400, f1=6200), 0.4); ev(8.45, 'beep', 'peek lens opens')
P(9.15, M.beep(660, 0.12), 0.45); P(9.32, M.beep(660, 0.12), 0.45); P(9.15, M.stamp_thump(), 0.7); ev(9.15, 'stamp', 'DENIED')

# ---- 10-14 four cities --------------------------------------------------------------------------------------------------------
for i, (t_, city) in enumerate(((10.0, 'Regina'), (11.0, 'Lagos'), (12.0, 'Toronto'), (13.0, 'London'))):
    P(t_, M.whoosh(0.3, 0.15, 300, 4200), 0.45, pan=-0.3 + 0.2 * i)
    P(t_ + 0.16, M.slam(0.9), 0.55); ev(t_ + 0.16, 'slam', city)
    P(t_ + 0.2, M.beep(2093, 0.1, 0.7), 0.22, pan=0.3)
    if i < 3:
        P(t_ + 0.78, M.whoosh(0.22, 0.18, 1200, 5000), 0.2)
P(10.0, M.zap(), 0.3)

# ---- 14-18 the countdown on a phone -----------------------------------------------------------------------------------------------
P(14.0, M.zap(), 0.25)
P(14.0, M.whoosh(0.45, 0.35, 200, 2600), 0.5); P(14.4, M.stamp_thump(0.4), 0.3); ev(14.4, 'card', 'phone lands')
P(14.85, M.swipe(0.6), 0.9); ev(14.85, 'swipe', 'scroll')
P(15.95, M.tap(1.0), 0.6); ev(15.95, 'tap', 'tap')
P(16.5, M.swipe(0.7), 0.9); ev(16.5, 'swipe', 'scroll')

# ---- 18-20 the inside pages, redacted ---------------------------------------------------------------------------------------------
P(18.0, M.zap(), 0.3)
for j, w in enumerate(('STYLE', 'PLAY', 'CULTURE')):
    t_ = 18.0 + j * 0.5
    P(t_ + 0.1, M.slam(), 0.6); ev(t_ + 0.1, 'slam', w)
    P(t_ + 0.24, M.stamp_thump(0.7), 0.5); ev(t_ + 0.24, 'stamp', 'REDACTED')
    P(t_, M.shutter(0.8), 0.3)
P(19.58, M.slam(), 0.55); ev(19.58, 'slam', 'STYLE + PLAY + CULTURE')
P(19.76, M.stamp_thump(), 0.8); ev(19.76, 'stamp', '20 PAGES SEALED')

# ---- 20-24 end card --------------------------------------------------------------------------------------------------------------
P(20.0, M.boom(1.0, 1.4), 0.55); P(20.0, M.zap(), 0.3); ev(20.0, 'boom', 'end card')
P(20.09, M.slam(), 0.65); ev(20.09, 'slam', '24 HOURS.')
M.typing('Watch it hit zero', 20.3, 20.75, S, vel=0.3, name='Watch it hit zero')
P(20.9, M.slam(0.9), 0.6); ev(20.9, 'slam', 'monochrome.com.ng')
P(21.15, M.whoosh(0.35, 0.25, 600, 3500), 0.3); P(21.45, M.tap(0.7), 0.3); ev(21.45, 'click', 'Pre-orders open')
P(22.4, M.shimmer(0.7, f0=2400, f1=6600), 0.4); ev(22.4, 'shimmer', 'light across 24 HOURS.')

f = np.ones(M.N)
i = int(23.4 * M.SR)
f[i:] = np.linspace(1, 0, M.N - i) ** 1.6
S *= f[:, None]

peak = M.finish(music, S, HERE, extra={'clock': 'reads 24:00:00 at 2.0 s and loses a second per second; clack on each whole second'}, duck_kinds=('slam', 'stamp', 'impact', 'boom', 'clock'))
print('peak before norm', round(peak, 3), 'events', len(M.EVENTS))
