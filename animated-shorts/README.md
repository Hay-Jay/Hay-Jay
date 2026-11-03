# Animated Shorts

Turns a short script into a finished vertical (1080×1920) animated video with voiceover, word-by-word captions, sound effects and background music. The output is ready for TikTok, YouTube Shorts and Instagram Reels.

Starring **Inky**, an original octopus character.

## Make a video

```bash
pip install edge-tts numpy
./make.sh episodes/octopus-hearts.json
```

The output goes to `build/<episode>/`:
- `<episode>.mp4`: the finished video, loudness-normalized to -14 LUFS
- `post.txt`: the TikTok caption, YouTube title and description
- `thumb.png`, `mid.png`: preview stills

## How it works
1. `make_voice.py` voices each line with text-to-speech and records the timing of every word.
2. `render.js` draws each frame of `scenes.html` in headless Chromium and pipes the frames to ffmpeg.
3. `mix.py` adds pops, dings and whooshes in sync with the scenes, plus a quiet synthesized music bed.
4. `make.sh` combines the video and audio into the final MP4.

## New episodes
Copy an episode JSON and change the lines. Each line uses a `scene`, which is a drawing function in `scenes.html` (`S.<name>`), with optional sound cues in `EV.<name>`. A new topic needs new scene functions. The character, captions, background and props can be reused.
