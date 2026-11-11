"""Soundtrack for the Vision Issue launch ad: an original rage/trap beat (150 BPM, C# minor) and effects placed from timeline.js,
the schedule index.html renders from. Instruments and effects come from marketing/lib/mcsound.py; everything is synthesised.

    python3 audio/make_audio.py     # music.wav, sfx.wav, mix-premaster.wav, events.json in audio/
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
import mcsound as M  # noqa: E402

src = open(os.path.join(HERE, '..', 'timeline.js'), encoding='utf-8').read()
TL = json.loads(src[src.index('=') + 1:].strip().rstrip(';'))
M.setup(TL['dur'], TL['bpm'], TL['bar1'])
fr, place, ev = M.fr, M.place, M.ev
SLAM, STAMP = 0.12, 0.16          # index.html: a slam lands 0.12 s after it starts, a stamp 0.16 s after

bar = lambda t: round((t - TL['bar1']) / M.BAR) + 1
END = TL['end']
facts = TL['facts']
music, kicks = M.build_beat({
    'last': bar(END['last']),                         # the final hit on the end card (26.4)
    'full': set(range(2, 13)) | {15, 16},             # the drop at 2.4 through the pages, and the end card
    'thin': {13, 14},                                 # the facts card: 808, kick and clap, no hats
    'hook': {6, 7, 8, 15, 16},                        # the lead over the inside pages and the end card
    'intro_until': 2.4,
    'stabs': [(s['t0'], 0.8) for s in TL['shots'] if s.get('cut') == 'strobe'] + [(w[1] + SLAM, 0.7) for w in TL['title']['words']] + [(r[1] + SLAM, 0.6) for r in facts['rows']],
    'fills': [M.bt(5, 12), M.bt(14, 12)],
    'crashes': [2.4, M.bt(6), M.bt(10), END['cover']],
    'risers': [(1.2, 2.33, 0.35), (22.2, END['cover'] - 0.05, 0.4)],
    'revcyms': [(2.4, 1.1, 0.4), (M.bt(6), 0.8, 0.3), (END['cover'], 1.0, 0.4)],
    'gaps': [(2.33, 2.4), (END['cover'] - 0.05, END['cover'])],
    'end_fade': TL['dur'] - 0.5,
})

S = M.buf()
CUT = {
    'drop': lambda t: (place(S, fr(t), M.boom(0.9, 1.4), 0.5), place(S, fr(t), M.zap(), 0.28)),
    'slam': lambda t: place(S, fr(t), M.slam(), 0.65),
    'zap': lambda t: place(S, fr(t), M.zap(), 0.32),
    'shutter': lambda t: place(S, fr(t), M.shutter(), 0.55),
    'strobe': lambda t: (place(S, fr(t), M.glitch(0.12), 0.45), place(S, fr(t), M.zap(0.6), 0.25)),
}
for s in TL['shots']:
    CUT[s['cut']](s['t0'])
    ev(s['t0'], 'cut-' + s['cut'], s['id'])
    for e in s.get('turns', []):                       # the page lands at e; its turn starts TURN before
        place(S, fr(e - TL['turn']), M.page_turn(), 0.6, pan=0.15)
        ev(e, 'page-turn', s['id'])
    for a in s.get('sweeps', []):
        place(S, fr(a), M.shimmer(0.6), 0.5, pan=0.1)
        ev(a, 'shimmer', 'light across the cover')

# the title: three words slam, then the stamp
for w in TL['title']['words']:
    place(S, fr(w[1] + SLAM), M.slam(), 0.6)
    ev(w[1] + SLAM, 'slam', w[0])
place(S, fr(TL['title']['stamp'] + STAMP), M.stamp_thump(), 0.85)
ev(TL['title']['stamp'] + STAMP, 'stamp', 'title stamp')
place(S, fr(TL['cover']['stamp'] + STAMP), M.stamp_thump(), 0.8)
ev(TL['cover']['stamp'] + STAMP, 'stamp', 'FIRST ISSUE')

# captions: each line slams; chips are stamped; the sub line wipes on
for c in TL['captions']:
    for i, line in enumerate(c['lines']):
        place(S, fr(c['t0'] + i * 0.2 + SLAM), M.slam(0.85), 0.5, pan=-0.1)
        ev(c['t0'] + i * 0.2 + SLAM, 'slam', line)
    for ch in c.get('chips', []):
        place(S, fr(ch[1] + STAMP), M.stamp_thump(0.8), 0.6, pan=0.15)
        ev(ch[1] + STAMP, 'stamp', ch[0])
    if c.get('sub'):
        place(S, fr(c['sub'][1]), M.whoosh(0.3, 0.16, 1500, 6000), 0.3)
        ev(c['sub'][1], 'swish', c['sub'][0])

# facts card: each row lands, then the stamp
for r in facts['rows']:
    place(S, fr(r[1] + SLAM), M.slam(0.8), 0.5)
    ev(r[1] + SLAM, 'slam', r[0])
place(S, fr(facts['stamp'] + STAMP), M.stamp_thump(), 0.85)
ev(facts['stamp'] + STAMP, 'stamp', 'facts stamp')

# end card
place(S, fr(END['cover']), M.whoosh(0.4, 0.22, 300, 3500), 0.5)
place(S, fr(END['cover'] + 0.13), M.stamp_thump(0.5), 0.4)
ev(END['cover'] + 0.13, 'card', 'cover drops in')
place(S, fr(END['head'] + SLAM), M.slam(), 0.7)
ev(END['head'] + SLAM, 'slam', 'OUT NOW / PRE-ORDER NOW')
place(S, fr(END['cta']), M.tap(0.8), 0.4)
ev(END['cta'], 'click', 'Requisition your copy')
place(S, fr(END['url'] + SLAM), M.slam(0.9), 0.6)
ev(END['url'] + SLAM, 'slam', 'monochrome.com.ng')
place(S, fr(END['word']), M.shimmer(0.5, f0=2000, f1=5200), 0.35)
place(S, fr(END['sweep']), M.shimmer(0.6, f0=2600, f1=7000), 0.4)
place(S, fr(END['last']), M.boom(1.0, 1.3, 52), 0.6)
ev(END['last'], 'impact', 'last hit')

# fade the effects' tails at the end
import numpy as np  # noqa: E402
f = np.ones(M.N)
i = int((TL['dur'] - 0.5) * M.SR)
f[i:] = np.linspace(1, 0, M.N - i) ** 1.6
S *= f[:, None]

peak = M.finish(music, S, HERE, extra={'source': 'timeline.js'})
print('peak before norm', round(peak, 3), 'events', len(M.EVENTS))
