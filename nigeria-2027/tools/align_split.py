# Split one narration into per-scene clips using word timestamps (faster-whisper) matched to the script.
#   python align_split.py <lines.json> <full.mp3> <outdir>
import sys, json, re, subprocess, difflib, numpy as np, os
from faster_whisper import WhisperModel
lines, src, outdir = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
raw = subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-i',src,'-f','s16le','-ac','1','-ar','16000','-'],capture_output=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32)/32768; dur = len(audio)/16000
m = WhisperModel('base.en', device='cpu', compute_type='int8')
segs,_ = m.transcribe(audio, word_timestamps=True, language='en')
tw = [(w.word, w.start, w.end) for s in segs for w in s.words]
norm = lambda t: re.sub(r'[^a-z0-9]', '', t.lower())
T = [norm(w[0]) for w in tw]
S, starts = [], []
for ln in lines:
    starts.append(len(S)); S += [norm(x) for x in ln.split() if norm(x)]
# map script word index -> transcript word index via matching blocks
sm = difflib.SequenceMatcher(None, S, T, autojunk=False)
mp = {}
for a, b, n in sm.get_matching_blocks():
    for k in range(n): mp[a+k] = b+k
cuts = []
for li in range(1, len(lines)):
    si = starts[li]; j = None
    for k in range(si, min(si+6, len(S))):          # first matched word near the start of the line
        if k in mp: j = mp[k] - (k - si); break
    if j is None or j <= 0: raise SystemExit(f'cannot place line {li+1}')
    j = max(1, min(j, len(tw)-1))
    cuts.append(((tw[j-1][2] + tw[j][1]) / 2, tw[j-1][2], tw[j][1]))
os.makedirs(outdir, exist_ok=True)
edges = [0.0] + [c[0] for c in cuts] + [dur]
for i in range(len(lines)):
    a, b = edges[i], edges[i+1]
    out = os.path.join(outdir, f'{i+1:02d}.mp3')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-ss',f'{a:.3f}','-to',f'{b:.3f}','-c:a','libmp3lame','-q:a','2',out], check=True)
    print(f'{i+1}:{a:.1f}-{b:.1f}', end=' ')
print()
