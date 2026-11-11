"""Soundtrack for the Sunday countdown promo. Two mixes on one schedule (../timeline.js, which index.html reads too):

  1. the film's own soundtrack: an original cinematic hip-hop anthem at 154 BPM (77 half-time) in C minor, plus the effects;
  2. effects only, mixed to sit under a licensed 154 BPM song added in the app: tight hits, short tails, no beeps or hums, no bed.

Everything is synthesised (instruments and effects from ../../lib/mcsound.py); no samples, no third-party music. The film is cut on
the half-time beat (hb = 60/77 s): bar 1 at 0, the drop at hb 12 (9.3506 s, bar 4), the final hit at hb 32 (24.9351 s, bar 9).
The music sits exactly on that grid; each effect starts on the first video frame at or after its beat, where its picture lands.

    python3 audio/make_audio.py   # music.wav, sfx.wav, mix-premaster.wav, events.json, sfx-only-premaster.wav in audio/

Harmony (original): intro Cm | Ab Eb | Bb Fm G (silence) - drop Cm | Ab | Eb Bb | Cm (thin, under the phone) | Ab Bb | C (major).
"""
import json
import os
import sys

import numpy as np
import scipy.io.wavfile as wf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
import mcsound as M  # noqa: E402

TL = json.loads(open(os.path.join(HERE, '..', 'timeline.js')).read().split('=', 1)[1].strip().rstrip(';'))
HB, FPS = TL['hb'], TL['fps']
DUR = TL['frames'] / FPS
M.setup(DUR, bpm=TL['bpm'], bar1=0.0, seed=1810)
SR, N = M.SR, M.N
fr, place, ev, hz, tt = M.fr, M.place, M.ev, M.hz, M.tt
T = lambda h: h * HB                 # half-time beats -> seconds (the music's exact grid)
E = lambda h: fr(T(h))               # the frame an event on beat h lands on (index.html's E)
T_CLOCK = T(TL['clock_hb'])          # the clock reads 24:00:00 here and flips on every whole second after it
SC = {n: (E(a), E(b)) for n, a, b in TL['scenes']}

# ==================================================================================================================================
# THE MUSIC
# ==================================================================================================================================
VOICE = {'Cm': [55, 60, 63, 67], 'Ab': [56, 60, 63, 68], 'Eb': [55, 58, 63, 67], 'Bb': [53, 58, 62, 65],
         'Fm': [53, 56, 60, 65], 'G': [55, 59, 62, 67], 'C': [55, 60, 64, 67]}
LOW = {'Cm': [48, 55], 'Ab': [44, 51], 'Eb': [51, 58], 'Bb': [46, 53], 'Fm': [41, 48], 'G': [43, 50], 'C': [48, 55]}
R808 = {'Cm': 36, 'Ab': 32, 'Eb': 39, 'Bb': 34, 'Fm': 29, 'G': 31, 'C': 36}
INTRO = [(0, 4, 'Cm'), (4, 6, 'Ab'), (6, 8, 'Eb'), (8, 9, 'Bb'), (9, 10, 'Fm'), (10, 11.5, 'G')]
MAIN = [(12, 16, 'Cm'), (16, 20, 'Ab'), (20, 22, 'Eb'), (22, 24, 'Bb'), (24, 28, 'Cm'), (28, 30, 'Ab'), (30, 32, 'Bb'), (32, 36.2, 'C')]
chord = lambda h: next(c for a, b, c in INTRO + MAIN if a <= h < b) if any(a <= h < b for a, b, c in INTRO + MAIN) else 'Cm'

drums, bass, keys, choir, strings, brass, lead, fx = (M.buf() for _ in range(8))
kicks = []

# ---- felt piano: the motif in the cold open, one note for each face that lights up, the build, a callback under the phone -------
PIANO = [  # (hb, midi, velocity, length in hb)
    (0, 48, .42, 4), (0, 55, .32, 4), (.5, 67, .5, 1), (1, 75, .58, 1), (1.75, 74, .42, .5), (2, 72, .55, 1), (2.5, 67, .4, 1),
    (3, 70, .48, 1), (3.5, 72, .5, 1.5),
    (4, 44, .4, 2), (4, 72, .5, 1), (4.5, 75, .5, 1), (5, 79, .5, 1), (5.5, 80, .52, 1),
    (6, 39, .42, 2), (6, 70, .4, 1), (6, 79, .55, 1), (6.5, 82, .5, 1), (7, 79, .5, 1), (7.5, 75, .5, 1.5),
    (8, 46, .45, 1), (8, 74, .55, 1), (8, 77, .5, 1), (8.5, 82, .38, .5),
    (9, 41, .45, 1), (9, 72, .5, 1), (9, 80, .55, 1), (9.5, 77, .42, .5),
    (10, 43, .45, 1.5), (10, 74, .4, .5), (10, 79, .44, .5), (10.5, 74, .44, .5), (10.5, 79, .48, .5), (11, 74, .48, .25), (11, 79, .52, .25),
    (11.25, 74, .52, .2), (11.25, 79, .55, .2), (11.375, 74, .54, .15), (11.375, 79, .57, .15),
    (24.5, 67, .5, 1), (25, 75, .55, 1), (25.75, 74, .45, .5), (26, 72, .52, 1), (26.5, 67, .44, 1), (27, 70, .5, 1), (27.5, 72, .5, 1),
    (32, 48, .5, 4), (32, 60, .45, 4), (32, 64, .45, 4), (32, 67, .45, 4), (33, 76, .38, 2), (33.5, 79, .34, 2), (34, 84, .3, 2.5),
]
for h, m, v, ln in PIANO:
    sig = M.felt_piano(hz(m), dur=min(3.2, T(ln) + 1.4), vel=v, bright=0.9 if m < 60 else 1.0)
    place(keys, T(h), sig, 1.0, pan=np.clip((m - 66) / 40, -0.35, 0.35))

# ---- the choir: a wordless 'aah' swelling through the intro; stabs and a quiet bed after the drop; a big C major at the end -------
for i, (a, b, c) in enumerate(INTRO):
    d = T(b) - T(a) + 0.45
    vel = (.3, .46, .56, .66, .62, .68)[i]
    place(choir, T(a) - (0.0 if i == 0 else 0.25), M.aah_pad(VOICE[c], d + (0 if i == 0 else 0.25), vel, attack=2.2 if i == 0 else .35, release=.45, seed=30 + i))
for a, b, c in MAIN:
    if c in ('C',) or 24 <= a < 28:
        continue
    place(choir, T(a), M.aah_pad(VOICE[c], T(b) - T(a) + .3, .46, attack=.08, release=.3, seed=40 + int(a)))
STABS = [12, 13, 14, 15, 16, 18, 20, 21, 22, 23, 28, 29.5, 30, 31]       # bar downbeats, words, the cities
for h in STABS:
    c = chord(h)
    place(choir, T(h), M.aah_pad(VOICE[c] + [VOICE[c][1] + 12], .5, 1.0, attack=.012, release=.32, seed=60 + int(h * 4)))
place(choir, T(32), M.aah_pad([48] + VOICE['C'] + [72, 76], DUR - T(32), .85, attack=.015, release=1.6, seed=99))

# ---- strings: in under the faces, growing to the gap; a bed after the drop; the final chord ----------------------------------------
for i, (a, b, c) in enumerate(INTRO[1:]):
    vel = (.16, .22, .3, .36, .46)[i]
    place(strings, T(a) - .1, M.string_pad(LOW[c] + [VOICE[c][2]], T(b) - T(a) + .4, vel, attack=.3 if i else .9, release=.35, seed=70 + i))
for a, b, c in MAIN:
    vel = .28 if a < 24 else .1 if a < 28 else .34 if a < 32 else .42
    place(strings, T(a), M.string_pad(LOW[c] + VOICE[c][1:3], (DUR - T(a)) if c == 'C' else T(b) - T(a) + .3, vel, attack=.05 if a in (12, 28, 32) else .2,
                                      release=1.4 if c == 'C' else .3, cutoff=2600 if a >= 28 else 2000, seed=80 + int(a)))

# ---- brass-like stabs on the hits; a rising line over the end card that lands on the final C -------------------------------------
for h in [12, 14, 16, 18, 20, 21, 22, 23, 28, 29.5, 30, 31]:
    c = chord(h)
    place(brass, T(h), M.brass_stab([m - 12 for m in VOICE[c]] + [R808[c] + 24], .5, .7, seed=110 + int(h * 4)))
place(brass, T(32), M.brass_stab([48, 55, 60, 64, 67], 1.6, .9, seed=150))
LEAD = [(28, 75, .75), (28.75, 77, .25), (29, 79, .75), (29.75, 80, .25), (30, 82, .75), (30.75, 80, .25), (31, 79, .5), (31.5, 82, .25)]
for h, m, ln in LEAD:
    place(lead, T(h), M.brass_stab([m, m - 12], T(ln) * 1.05, .6, seed=170 + int(h * 4)))
place(lead, T(32), M.brass_stab([84, 72], 1.4, .75, seed=190))

# ---- drums and the 808: half-time (snare on 2 and 4 of the 77 bar), hats at 154 -------------------------------------------------
K, SN, CL, ST = M.kick(), M.snare_big(), M.clap(), M.stomp()
HATS = {v: M.hat(False, v) for v in (0.4, 0.55, 0.7, 0.9)}
OH = M.hat(True, 0.75)
BARS = [(12, 'drop'), (16, 'full'), (20, 'cities'), (24, 'thin'), (28, 'end')]
notes808 = []
for h0, kind in BARS:
    kp = {'drop': [0, .75, 2, 2.5], 'full': [0, .75, 2.5, 3.25], 'cities': [0, .75, 1, 2, 2.5, 3], 'thin': [0, 2.5], 'end': [0, .75, 2.5, 3.25]}[kind]
    for s in kp:
        h = h0 + s
        if kind == 'end' and h >= 31.75:
            continue
        place(drums, T(h), K, 0.95 if s in (0, 2) else 0.8)
        kicks.append(T(h))
        c = chord(h)
        glide = R808[c] + 12 if s == 2.5 else None
        notes808.append((T(h), R808[c], T(2), glide))          # each note rings on until the next one
    for s in (1, 3):
        h = h0 + s
        if kind == 'thin':
            place(drums, T(h), CL, 0.45)
        else:
            place(drums, T(h), SN, 0.8); place(drums, T(h), CL, 0.68); place(drums, T(h), ST, 0.55)
    if kind != 'thin':
        for k in range(16):
            h = h0 + k * .25
            if kind == 'end' and h >= 31:
                continue
            v = 0.9 if k % 4 == 0 else 0.7 if k % 2 == 0 else 0.55
            place(drums, T(h), HATS[v], 0.85, pan=0.25)
        place(drums, T(h0 + 1.5), OH, 0.4, pan=-0.25)
        if kind in ('full', 'cities'):
            for k in range(4):                                        # a 32nd roll into the next bar
                place(drums, T(h0 + 3.5 + k * .125), HATS[0.4 if k < 2 else 0.7], 0.8, pan=0.3)
    else:
        for k in range(8):
            place(drums, T(h0 + k * .5), HATS[0.4], 0.35, pan=0.25)
# the build into the final hit: snare sixteenths then thirty-seconds over hb 31-31.75, a beat of air, then the hit
for k in range(4):
    place(drums, T(31 + k * .125), SN, 0.18 + .05 * k, pan=(-1) ** k * .15)
for k in range(4):
    place(drums, T(31.5 + k * .0625), SN, 0.3 + .05 * k, pan=(-1) ** k * .15)
# the final hit: kick, a long 808 sliding down onto C, a crash
place(drums, T(32), K, 1.0); kicks.append(T(32))
notes808.append((T(32), 36, DUR - T(32), 48))
for h in (12, 16, 20, 28, 32):
    place(fx, T(h), M.crash(), 1.0 if h in (12, 32) else 0.7)
bass = M.pan2(M.line_808(sorted(set(notes808)), drive=3.2, decay=0.9), 0)

# intro sub: the roots, very low, under the strings
sub = np.zeros(N)
for a, b, c in INTRO:
    i0, i1 = int(T(a) * SR), int(T(b) * SR)
    x = tt(i1 - i0)
    sub[i0:i1] += np.sin(2 * np.pi * hz(R808[c] + 12) * x) * np.minimum(1, x / .3) * np.minimum(1, (i1 - i0 - np.arange(i1 - i0)) / (.05 * SR))
sub *= np.clip(np.arange(N) / SR / T(11.5), 0, 1) ** 1.5
bass += M.pan2(sub * 0.35, 0)

# risers and reverse cymbals into the drop, the end card and the final hit
place(fx, T(10), M.riser(T(10), T(11.5), .13), 1.0)
place(fx, T(11.5) - T(1.6), M.rev_cym(T(1.6)), .2)
place(fx, T(27), M.riser(T(27), T(28), .22), 1.0)
place(fx, T(28) - .8, M.rev_cym(.8), .3)
place(fx, T(31), M.riser(T(31), T(31.75), .3), 1.0)
place(fx, T(31.75) - 1.0, M.rev_cym(1.0), .38)

# ---- sidechain, space, the silences, the phone, the fade ----------------------------------------------------------------------
duck = np.ones(N)
curve = 1 - 0.5 * np.exp(-tt(int(0.25 * SR)) / 0.08)
for k in kicks:
    i = int(k * SR)
    n = min(len(curve), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], curve[:n])
for b_, d in ((choir, .8), (strings, .9), (brass, .3), (keys, .25), (lead, .3)):
    b_ *= (1 - d * (1 - duck))[:, None]
hall = M.reverb_ir(2.8, pre=0.03, damp=5200, seed=21)
choir += M.conv_stereo(choir, hall) * 0.42
strings += M.conv_stereo(strings, hall) * 0.32
keys = keys + M.conv_stereo(keys, hall) * 0.38 + M.pingpong(keys, d=T(.75), fb=.3, tone=2600) * 0.18
brass += M.conv_stereo(brass, hall) * 0.22
lead += M.conv_stereo(lead, hall) * 0.25
drums += M.conv_stereo(M.hp(drums, 500), M.reverb_ir(1.1, seed=5)) * 0.1
choir = M.hp(choir, 140)
strings = M.hp(strings, 60)

tline = tt(N)
# under the phone: the beat goes thin and dark
cut = np.where((tline >= T(24)) & (tline < T(28)), 3500.0, 20000.0)
cut = np.convolve(cut, np.ones(int(.04 * SR)) / int(.04 * SR), mode='same')
drums = M.sweep_lp(drums, cut)
music = {'drums': drums * 1.15, 'bass': bass * 0.8, 'keys': keys * 0.4, 'choir': choir * 0.48, 'strings': strings * 0.4,
         'brass': brass * 0.85, 'lead': lead * 0.3, 'fx': fx * 0.62}


def gate(a, b, ramp=0.008):
    g = np.ones(N)
    i, j, r = int(a * SR), int(b * SR), int(ramp * SR)
    g[i:j] = 0
    g[max(0, i - r):i] = np.linspace(1, 0, i - max(0, i - r))
    g[j:j + r] = np.linspace(0, 1, len(g[j:j + r]))
    return g


g1 = gate(T(11.5), T(12))            # the held breath before the drop: nothing at all
g2 = gate(T(31.75), T(32))           # a sixteenth of air before the final hit
fade = np.ones(N)
i0 = int(T(33.5) * SR)
fade[i0:] = np.linspace(1, 0, N - i0) ** 1.5
for k_, v in music.items():
    v *= (g1 * fade)[:, None]
    if k_ != 'fx':
        v *= g2[:, None]

# ==================================================================================================================================
# THE EFFECTS: S for the film's soundtrack, S2 for the effects-only cut (tight, no tonal beeps or hums)
# ==================================================================================================================================
S, S2 = M.buf(), M.buf()


def P(t, sig, g=1.0, pan=0.0, alt=None, g2=None, exact=False):
    """Both mixes (alt: a different sound for the effects-only cut; None there means the same one).
    exact: in the film's mix the sound starts on the beat itself (t), with the music's kick, up to a frame before its picture."""
    place(S, t if exact else fr(t), sig, g, pan)
    place(S2, fr(t), sig if alt is None else alt, g if g2 is None else g2, pan)


def PF(t, sig, g=1.0, pan=0.0):
    """The film's soundtrack only (tonal or long effects that would fight a song)."""
    place(S, fr(t), sig, g, pan)


def typing(text, t0, t1, vel=0.22, name='', key=M.typewriter_key):
    """Keys as index.html reveals the letters: letter c appears when round(len * k) passes c."""
    for c in range(len(text)):
        if text[c] == ' ':
            continue
        tc = t0 + (t1 - t0) * (c + 0.5) / len(text)
        P(tc, key(M.rng.uniform(0.7, 1.0)), vel, pan=M.rng.uniform(-0.1, 0.1))
    ev(t0, 'typing', name or text)


def knock(v, f0=240.0):
    """A short mid-range knock (a damped sine and a puff of band-passed noise) laid on the heartbeat's sub thump."""
    n = int(.09 * SR); x = tt(n)
    body = np.sin(2 * np.pi * f0 * x * (1 + .25 * np.exp(-x / .01))) * np.exp(-x / .032)
    puff = M.bp(M.noise(n), 300, 900) * np.exp(-x / .012) * .5
    return (body + puff) * v


# ---- the heartbeat: lub on the half-time beat, dub a sixteenth later; it speeds up with the montage ------------------------------
for h in TL['heart']:
    v = 0.62 if h < 10 else 0.56
    P(E(h), M.heartbeat(v), 0.9); P(E(h), knock(v), 0.22); ev(E(h), 'heart', f'lub, hb {h}')
    if h < TL['dub_until']:
        P(E(h + .25), M.heartbeat(v, dub=True), 0.9); P(E(h + .25), knock(v * .8, 300.0), 0.18)
    if h < 4:
        P(E(h) + .03, M.beep(1046.5, .07, .6), 0.06, g2=0.035)  # the monitor's blip (C6), quieter in the effects-only cut

# ---- cold open --------------------------------------------------------------------------------------------------------------------
C = TL['cold']
typing('Regina HQ — incoming', T(C['label'][0]), T(C['label'][1]), 0.2, 'Regina HQ — incoming', key=M.sfx_click)
typing('Monochrome Bureau // Vol. 001', T(C['sub'][0]), T(C['sub'][1]), 0.14, 'Monochrome Bureau // Vol. 001', key=M.sfx_click)
typing(C['text'], E(C['line'][0]), E(C['line'][1]), 0.2, C['text'])
P(T(C['out'][0]), M.whoosh(T(.5), T(.45), 2400, 300), 0.16); ev(T(C['out'][0]), 'swish', 'the line goes out of focus')

# ---- the team: a camera flash for every face; ONE TEAM. --------------------------------------------------------------------------
for img, lbl, h in TL['team']['cells']:
    P(E(h), M.shutter(0.7), 0.16, pan=-.2 if TL['team']['cells'].index([img, lbl, h]) % 2 == 0 else .2); ev(E(h), 'shutter', f'{lbl} lights up')
P(E(4), M.whoosh(T(3.5), T(2.8), 160, 900), 0.1)
for w in TL['words']:
    h = w['hb']
    if w['scene'] == 'pages':
        P(E(h), M.slam(), 0.6, alt=M.slam(), g2=0.65); P(E(h), M.boom(.5, 1.0), 0.32, alt=M.heart_boom(.6, .45), g2=0.4)
        ev(E(h), 'slam', w['text'])
    else:
        P(E(h) - .3, M.whoosh(.32, .3, 300, 2600), 0.16)
        P(E(h), M.boom(.45, 1.1), 0.3, alt=M.heart_boom(.55, .45), g2=0.42); P(E(h), M.stamp_thump(.4), 0.2)
        ev(E(h), 'impact', w['text'])
P(E(9), M.shutter(.6), 0.18)
for h, p in TL['flashes']:
    P(E(h), M.shutter(1.0), 0.24, pan=.15 * (-1) ** int(h * 4)); P(E(h), M.page_turn(.6, .14), 0.15)
    ev(E(h), 'shutter', f'page {p} flashes')

# ---- the drop: a white flash, the clock slams in at 24:00:00 -----------------------------------------------------------------------
CK = TL['clock']
P(T(12), M.boom(1.0, 1.7), 0.7, alt=M.heart_boom(1.0, .7), g2=0.85, exact=True); P(T(12), M.zap(), 0.22, exact=True)
ev(E(12), 'boom', 'the drop: white flash')
P(T(12), M.flap_clack(1.0, heavy=True), 0.9, exact=True); ev(E(12), 'clock', 'the clock slams in at 24:00:00')
P(E(12), M.whoosh(.35, .08, 3000, 500), 0.3, pan=-.4); ev(E(12), 'whoosh', 'the tape runs in')
typing('The Vision Issue', T(CK['kicker'][0]), T(CK['kicker'][0]) + .25, 0.16, 'The Vision Issue', key=M.sfx_click)
typing('Vol. 001 // Eyes only', T(CK['kicker'][0]) + .2, T(CK['kicker'][1]), 0.16, 'Vol. 001 // Eyes only', key=M.sfx_click)
for h, w, g in ((CK['tminus'], 'T-MINUS', .66), (CK['hours'], '24 HOURS', .66), (CK['date'], 'SUNDAY 18 OCTOBER / 12:00 REGINA', .5)):
    P(E(h), M.slam(), g); ev(E(h), 'slam', w)
P(E(CK['fly'][0]), M.whoosh(.45, .4, 500, 4200), 0.3); ev(E(CK['fly'][0]), 'whoosh', 'the clock flies up into the corner')

# ---- the clock's clack on every whole second, wherever a clock is on screen (soft, so it doesn't fight the beat) ------------------
PH = TL['phone']
for n in range(1, 40):
    tc = T_CLOCK + n
    if tc >= DUR:
        break
    t_ = fr(tc)
    if SC['clock'][0] <= t_ < SC['clock'][1]:
        g, what = .34, 'big clock'
    elif SC['bag'][0] <= t_ < SC['cities'][1]:
        g, what = .2, 'corner clock'
    elif SC['phone'][0] <= t_ < E(PH['scroll2'][0]):
        g, what = .1, "the page's clock on the phone"
    elif t_ >= E(TL['end']['clock']):
        g, what = .26, 'end-card clock'
    else:
        continue
    P(tc, M.flap_clack(0.8), g, pan=.05); ev(tc, 'tick', f'{what}: {86400 - n} s left')

# ---- the sealed cover ---------------------------------------------------------------------------------------------------------
B = TL['bag']
P(E(B['land']) - .2, M.whoosh(.25, .2, 300, 3200), 0.3)
P(T(B['land']), M.stamp_thump(.9), 0.6, exact=True); P(T(B['land']), M.boom(.4, .8), 0.25, alt=M.heart_boom(.4, .35), g2=.3, exact=True)
ev(E(B['land']), 'impact', 'the evidence bag slams down')
for h in B['bars']:
    P(E(h), M.whoosh(.14, .08, 1800, 6000), 0.24); ev(E(h), 'swish', 'a redaction bar')
l0, l1 = E(B['laser'][0]), E(B['laser'][1])
PF(l0, M.scan(l1 - l0), 0.3)
place(S2, l0, M.fade_edges(M.sweep_bp(M.noise(int((l1 - l0) * SR)), np.full(int((l1 - l0) * SR), 3000.0), np.full(int((l1 - l0) * SR), 7000.0)) * .25, .05, .15), 0.5)
ev(l0, 'scan', 'laser scan')
P(E(B['stamp']), M.stamp_thump(), 0.88); ev(E(B['stamp']), 'stamp', 'CLASSIFIED')
P(E(B['tag']) - .25, M.whoosh(.3, .24, 600, 3600), 0.28); P(E(B['tag']) - .25, M.page_turn(.7, .25), 0.3); P(E(B['tag']), M.tap(.8), 0.3)
ev(E(B['tag']), 'card', 'the tag lands: sealed until 18.10, 12:00 Regina')

# ---- four cities -----------------------------------------------------------------------------------------------------------------
for i, c in enumerate(TL['cities']):
    P(E(c['hb']) - .12, M.whoosh(.2, .12, 400, 4200), 0.28, pan=-.3 + .2 * i)
    P(E(c['hb']), M.slam(.9), 0.58); ev(E(c['hb']), 'slam', f"{c['name']} {c['time']}")
    PF(E(c['hb']) + .03, M.beep(1568, .08, .6), 0.07, pan=.3)

# ---- the phone ---------------------------------------------------------------------------------------------------------------------
P(E(24), M.whoosh(.32, .28, 200, 2600), 0.45); ev(E(24), 'whoosh', 'the phone rises in')
P(E(PH['land']), M.stamp_thump(.4), 0.3); ev(E(PH['land']), 'card', 'the phone lands')
P(E(PH['stamp1']), M.stamp_thump(), 0.62); ev(E(PH['stamp1']), 'stamp', 'LIVE NOW')
P(E(PH['scroll1'][0]), M.swipe(T(.75)), 0.8); ev(E(PH['scroll1'][0]), 'swipe', 'scroll to the clock')
P(E(PH['tap']), M.tap(1.0), 0.6); ev(E(PH['tap']), 'tap', 'tap: pre-order a copy')
P(E(PH['scroll2'][0]), M.swipe(T(.75)), 0.8); ev(E(PH['scroll2'][0]), 'swipe', 'scroll to the bag')
P(E(PH['stamp2']), M.stamp_thump(), 0.62); ev(E(PH['stamp2']), 'stamp', 'PRE-ORDERS OPEN')

# ---- the end card ---------------------------------------------------------------------------------------------------------------
EN = TL['end']
P(T(EN['tomorrow']), M.boom(.85, 1.2), 0.5, alt=M.heart_boom(.85, .5), g2=0.6, exact=True); P(T(EN['tomorrow']), M.zap(), 0.2, exact=True)
ev(E(EN['tomorrow']), 'boom', 'end card')
P(T(EN['tomorrow']), M.slam(), 0.66, exact=True); ev(E(EN['tomorrow']), 'slam', 'TOMORROW.')
PF(E(EN['tomorrow']) + .03, M.shimmer(.45, f0=2000, f1=5200), 0.16)
P(E(EN['clock']), M.flap_clack(1.0, heavy=True), 0.55); ev(E(EN['clock']), 'clock', 'the end-card clock appears, still running')
P(E(EN['date']), M.slam(.7), 0.45); ev(E(EN['date']), 'slam', 'Sunday 18 October · 12:00 Regina')
P(E(EN['url']), M.slam(), 0.6); ev(E(EN['url']), 'slam', 'monochrome.com.ng')
P(T(EN['hit']), M.boom(1.0, 1.9), 0.7, alt=M.heart_boom(1.0, .75), g2=0.9, exact=True); P(T(EN['hit']), M.slam(), 0.7, exact=True)
P(T(EN['hit']), M.zap(), 0.2, exact=True)               # the music's own crash is the only one (two crashes a frame apart comb)
ev(E(EN['hit']), 'boom', 'the final hit: pre-orders open — $10 CAD')
P(E(EN['ships']) - .1, M.whoosh(.4, .3, 500, 3000), 0.16); ev(E(EN['ships']), 'swish', 'ships to 29 countries')
PF(E(EN['sheen'][0]), M.shimmer(.7, f0=2200, f1=6000), 0.12); PF(E(EN['sheen'][1]), M.shimmer(.7, f0=2200, f1=6000), 0.1)

# the held breath before the drop is silent in both mixes; the effects fade with the music at the very end
for b_ in (S, S2):
    b_ *= gate(E(11.5) + .03, E(12) - .003, .01)[:, None]
    f2 = np.ones(N)
    j0 = int(T(35) * SR)
    f2[j0:] = np.linspace(1, 0, N - j0) ** 1.4
    b_ *= f2[:, None]

if os.environ.get('MC_LEVELS'):             # balance check: K-weighted loudness of every bus in every scene
    import scipy.signal as sg

    def lufs(x):
        x = sg.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
        x = sg.lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x, axis=0)
        return -0.691 + 10 * np.log10(np.sum(np.mean(x ** 2, axis=0)) + 1e-12)
    buses = {**music, 'sfx': S, 'sfx-only': S2}
    print('scene     ' + ''.join(f'{k:>9s}' for k in buses))
    for n_, a_, b_ in TL['scenes']:
        i_, j_ = int(T(a_) * SR), int(min(T(b_), DUR) * SR)
        print(f'{n_:9s} ' + ''.join(f'{lufs(v[i_:j_] * (0.55 if k in music else 1)):9.1f}' for k, v in buses.items()))

# into finish() about 4 dB lower than its default, so its tanh only rounds the very tops; master.sh's limiter does the rest cleanly
peak = M.finish(music, S * 0.6, HERE, music_gain=0.33, extra={
    'film': 'countdown-sunday: 842 frames at 30 fps; cut on 154 BPM (77 half-time): hb = 0.779221 s, the drop at hb 12 = 9.3506 s, final hit hb 32 = 24.9351 s',
    'hb': HB, 'clock': 'reads 24:00:00 at the drop (9.3506 s) and loses a second per second; clack on each whole second while a clock is on screen'},
    duck_kinds=('slam', 'stamp', 'impact', 'boom', 'clock'))
# the effects-only cut: its own level (peak 0.89), written next to the stems
p2 = float(np.max(np.abs(S2)))
wf.write(os.path.join(HERE, 'sfx-only-premaster.wav'), SR, np.clip(S2 * (0.89 / p2), -1, 1).astype(np.float32))
print('peak before norm', round(peak, 3), 'effects-only peak', round(p2, 3), 'events', len(M.EVENTS))
