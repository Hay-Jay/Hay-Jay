"""Step 1: voice every line with text-to-speech and build timeline.json + voice.wav."""
import asyncio, json, os, ssl, subprocess, sys, time, wave
import numpy as np
import edge_tts
import edge_tts.communicate as comm

CA = os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt"
if os.path.exists(CA):  # needed behind TLS-inspecting proxies
    comm._SSL_CTX = ssl.create_default_context(cafile=CA)

SR, FPS = 24000, 30
LEAD, GAP, TAIL = 0.25, 0.16, 1.3


async def tts(text, voice, rate, pitch):
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch,
                             boundary="WordBoundary", proxy=os.environ.get("HTTPS_PROXY"))
    audio, words = b"", []
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"w": ch["text"], "s": ch["offset"] / 1e7,
                          "e": (ch["offset"] + ch["duration"]) / 1e7})
    return audio, words


def decode(mp3):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1",
                        "-ar", str(SR), "pipe:1"], input=mp3, capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768


def main(ep_path, out):
    ep = json.load(open(ep_path))
    os.makedirs(out, exist_ok=True)
    clips, lines, cursor = [], [], LEAD
    for ln in ep["lines"]:
        for attempt in range(5):
            try:
                mp3, words = asyncio.run(tts(ln["text"], ep.get("voice", "en-US-AndrewNeural"),
                                             ep.get("rate", "+0%"), ep.get("pitch", "+0Hz")))
                if mp3:
                    break
            except Exception as e:
                print(f"  retrying TTS ({e.__class__.__name__})")
                time.sleep(2 * (attempt + 1))
        else:
            sys.exit("TTS failed after 5 attempts")
        a = decode(mp3)
        loud = np.where(np.abs(a) > 0.012)[0]
        lo = max(0, loud[0] - int(0.03 * SR)) if len(loud) else 0
        hi = min(len(a), loud[-1] + int(0.08 * SR)) if len(loud) else len(a)
        a = a[lo:hi]
        start = cursor
        shift = start - lo / SR
        clips.append((start, a))
        lines.append({"scene": ln["scene"], "text": ln["text"], "start": round(start, 3),
                      "end": round(start + len(a) / SR, 3),
                      "words": [{"w": w["w"], "s": round(w["s"] + shift, 3), "e": round(w["e"] + shift, 3)}
                                for w in words]})
        cursor = start + len(a) / SR + GAP
        print(f"  voiced: {ln['text'][:50]}... ({len(a)/SR:.2f}s)")
    total = cursor - GAP + TAIL
    voice = np.zeros(int(total * SR) + 1, dtype=np.float32)
    for start, a in clips:
        i = int(start * SR)
        voice[i:i + len(a)] += a
    voice *= 0.9 / max(1e-6, np.abs(voice).max())
    with wave.open(os.path.join(out, "voice.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((voice * 32767).astype(np.int16).tobytes())
    # mouth-movement envelope, one value per video frame
    hop = SR // FPS
    n = int(np.ceil(total * FPS))
    env = np.array([np.sqrt(np.mean(voice[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    env = np.clip(env / (np.percentile(env[env > 0.01], 90) if (env > 0.01).any() else 1), 0, 1)
    env = np.convolve(env, [0.25, 0.5, 0.25], mode="same")
    tl = {"fps": FPS, "width": 1080, "height": 1920, "duration": round(total, 3),
          "title": ep.get("title", ""), "channel": ep.get("channel") or os.path.basename(os.path.dirname(os.path.dirname(os.path.abspath(ep_path)))), "lines": lines, "env": [round(float(x), 3) for x in env]}
    json.dump(tl, open(os.path.join(out, "timeline.json"), "w"))
    if "post" in ep:
        p = ep["post"]
        open(os.path.join(out, "post.txt"), "w").write(
            f"TIKTOK CAPTION:\n{p.get('caption','')}\n\nYOUTUBE TITLE:\n{p.get('youtube_title','')}\n\n"
            f"YOUTUBE DESCRIPTION:\n{p.get('youtube_description','')}\n")
    print(f"  timeline: {total:.1f}s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
