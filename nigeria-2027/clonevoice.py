# Cloned-voice narration with Chatterbox (local, free). Batch mode so the model loads once.
#   python clonevoice.py jobs.json      jobs = [{"text":..., "out":"x.wav", "ex":0.6, "cfg":0.45}, ...]
# Reference voice: voice-ref/ref.wav (the creator's own recording; kept out of git).
import json, sys, os, torch, torchaudio
from chatterbox.tts import ChatterboxTTS
here = os.path.dirname(os.path.abspath(__file__))
ref = os.path.join(here, 'voice-ref', 'ref.wav')
jobs = json.load(open(sys.argv[1]))
torch.manual_seed(7)
m = ChatterboxTTS.from_pretrained(device='cpu')
for j in jobs:
    w = m.generate(j['text'], audio_prompt_path=ref, exaggeration=j.get('ex', 0.55), cfg_weight=j.get('cfg', 0.45))
    torchaudio.save(j['out'], w, m.sr); print('clone', os.path.basename(os.path.dirname(j['out'])), os.path.basename(j['out']), flush=True)
