"""Lay a song (the client's own file of the instrumental) under the countdown's effects, on the beat.

    python3 audio/mix_song.py SONG [--drop SECONDS_IN_SONG] [--bpm BPM]

The film is cut on a 155 BPM grid and its drop (the clock slamming in at 24:00:00) is bar 3, at 3.097 s. The script
  1. measures the song's tempo near 155 BPM (or takes --bpm) and stretches it to exactly 155 if it is off (pitch kept);
  2. finds the song's beat grid and, unless --drop is given, the bar line where the energy jumps most (the beat dropping in);
  3. starts the song so that bar line lands on the film's drop, so every cut lands on the song's bar lines;
  4. ducks the song a little under the big hits, puts the effects on top and writes audio/mix-premaster.wav for master.sh.
The song file stays out of git (see .gitignore): it is the client's licensed copy, not ours to publish.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as sg

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
FILM_BPM = 155
BAR = 4 * 60 / FILM_BPM
DROP = 2 * BAR
DUR = 790 / 30

ap = argparse.ArgumentParser()
ap.add_argument('song')
ap.add_argument('--drop', type=float, help="the moment in the song (s) that should land on the film's drop")
ap.add_argument('--bpm', type=float, help='the song tempo, if the measurement is off')
ap.add_argument('--gain', type=float, default=0.62, help='song level under the effects')
a = ap.parse_args()


def decode(path, tempo=1.0):
    af = [f'atempo={tempo:.6f}'] if abs(tempo - 1) > 1e-5 else []
    cmd = ['ffmpeg', '-v', 'error', '-i', path] + (['-af', ','.join(af)] if af else []) + ['-f', 'f32le', '-ac', '2', '-ar', str(SR), '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def onset_env(x, hop=480, top=None):
    """Spectral-flux onset strength, 100 frames a second (top: only the bins below this frequency, e.g. the kick and 808)."""
    mono = x.mean(axis=1)
    f, t, Z = sg.stft(mono, SR, nperseg=2048, noverlap=2048 - hop, boundary=None)
    if top:
        Z = Z[f < top]
    mag = np.log1p(np.abs(Z) * 100)
    flux = np.maximum(0, np.diff(mag, axis=1)).sum(axis=0)
    flux = np.concatenate([[0], flux])
    return flux - sg.medfilt(flux, 31), SR / hop


def tempo(env, fps, lo=140.0, hi=170.0):
    """Best tempo in lo..hi: the one whose beat comb collects the most onset energy."""
    best = None
    for bpm in np.arange(lo, hi, 0.02):
        period = fps * 60 / bpm
        n = int(len(env) / period) - 1
        idx = (np.arange(n)[:, None] * period + np.arange(int(period))[None, :]).astype(int)
        score = env[idx].sum(axis=0).max() / n
        if best is None or score > best[0]:
            best = (score, bpm)
    return best[1]


def phase(env, fps, bpm):
    """The offset (s) of the beat grid: where a comb at this tempo collects the most onset energy."""
    period = fps * 60 / bpm
    n = int(len(env) / period) - 1
    idx = (np.arange(n)[:, None] * period + np.arange(int(period))[None, :]).astype(int)
    return int(np.argmax(env[idx].sum(axis=0))) / fps


x0 = decode(a.song)
env, fps = onset_env(x0)
bpm = a.bpm or tempo(env, fps)
stretch = FILM_BPM / bpm
x = decode(a.song, stretch) if abs(stretch - 1) > 0.0005 else x0
env, fps = onset_env(x, top=180)                                     # the grid's phase from the kick and 808, not the hats
ph = phase(env, fps, FILM_BPM)
beats = np.arange(ph, len(x) / SR, 60 / FILM_BPM)

if a.drop is not None:
    drop_t = a.drop / stretch                                         # the given moment, in the stretched song
    drop_t = beats[np.argmin(np.abs(beats - drop_t))]                 # snapped to its nearest beat
else:
    # the bar line (every 4th beat, any of the 4 phases) with the biggest jump in low-end energy from the bar before to the bar after
    lowE = sg.sosfilt(sg.butter(4, 150, 'lp', fs=SR, output='sos'), x.mean(axis=1)) ** 2
    def e(t0, t1):
        i0, i1 = int(max(0, t0) * SR), int(min(len(lowE) / SR, t1) * SR)
        return lowE[i0:i1].mean() + 1e-12 if i1 > i0 else 1e-12
    cand = [b for b in beats if b >= DROP and b + DUR - DROP <= len(x) / SR]
    drop_t = max(cand, key=lambda b: np.log(e(b, b + BAR) / e(b - BAR, b)))
# the analysis frames smear the attack by a few tens of ms: snap the drop to the kick's actual attack within 70 ms
low = np.abs(sg.sosfilt(sg.butter(4, 180, 'lp', fs=SR, output='sos'), x.mean(axis=1)))
w = int(0.002 * SR)
envl = np.convolve(low, np.ones(w) / w, mode='same')
j0, j1 = int((drop_t - 0.07) * SR), int((drop_t + 0.07) * SR)
rise = np.diff(envl[j0:j1])
drop_t = (j0 + int(np.argmax(np.convolve(rise, np.ones(w), mode='same')))) / SR
start = drop_t - DROP                                                 # the song time at the film's frame 0

n = int(DUR * SR)
song = np.zeros((n, 2))
i0 = int(round(start * SR))
src = x[max(0, i0): max(0, i0) + n]
song[max(0, -i0): max(0, -i0) + len(src)] = src[: n - max(0, -i0)]
peak = np.max(np.abs(song)) + 1e-9
song *= 0.9 / peak

# the effects, and a little ducking of the song under the big hits
sr2, fx = wf.read(os.path.join(HERE, 'sfx.wav'))
fx = fx.astype(np.float64)[:n]
duck = np.ones(n)
EV = json.load(open(os.path.join(HERE, 'events.json')))['events']
curve = 1 - 0.38 * np.exp(-np.arange(int(0.5 * SR)) / SR / 0.12)
for e_ in EV:
    if e_['kind'] in ('slam', 'stamp', 'boom', 'clock'):
        j = int(e_['t'] * SR)
        m = min(len(curve), n - j)
        duck[j:j + m] = np.minimum(duck[j:j + m], curve[:m])
duck = sg.lfilter([0.06], [1, -0.94], duck)                          # ~3 ms smoothing, so no clicks
fade = np.ones(n)
k = int((DUR - 1.4) * SR)
fade[k:] = np.linspace(1, 0, n - k) ** 1.5
fin = np.minimum(1, np.arange(n) / (0.02 * SR))                        # a 20 ms fade-in at frame 0
mix = song * (a.gain * duck * fade * fin)[:, None] + fx * 0.8
mix = np.tanh(mix * 1.05) / 1.05
mix *= 0.89 / np.max(np.abs(mix))
wf.write(os.path.join(HERE, 'mix-premaster.wav'), SR, mix.astype(np.float32))
print(f'song tempo {bpm:.2f} BPM -> stretched x{stretch:.5f} to 155; beat phase {ph * stretch:.3f} s; '
      f'song {drop_t * stretch:.2f} s (original timing) lands on the drop at {DROP:.3f} s; the film starts at song {start * stretch:.2f} s')
