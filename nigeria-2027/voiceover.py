"""Generate one narration clip with Microsoft Edge neural TTS.

    python3 voiceover.py <voice> <rate> <text> <out.mp3> [pitch] [volume]

Called by render.mjs for each scene. Needs:  pip install edge-tts
"""
import asyncio
import os
import sys

# Behind a TLS-inspecting proxy, point edge-tts at the proxy's CA bundle
# (it otherwise only trusts certifi's bundle).
bundle = os.environ.get("TTS_CA_BUNDLE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
if bundle:
    import certifi
    certifi.where = lambda: bundle

import edge_tts  # noqa: E402

voice, rate, text, out = sys.argv[1:5]
pitch = sys.argv[5] if len(sys.argv) > 5 else '+0Hz'
volume = sys.argv[6] if len(sys.argv) > 6 else '+0%'
asyncio.run(edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume).save(out))
