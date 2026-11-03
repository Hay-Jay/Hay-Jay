# Animated Shorts

Turns a short script into a finished vertical (1080×1920) animated video with voiceover, word-by-word captions, sound effects and background music. The output is ready for TikTok, YouTube Shorts and Instagram Reels.

## Channels

Each channel has its own host, look, voice and music. The episode file's `channel` field picks one.

| Channel | Host | Voice | Example episode |
|---|---|---|---|
| `naija`: Nigerian history | Ìjàpá the tortoise | Nigerian English (`en-NG-AbeoNeural`) | `episodes/naija-name.json` |
| `football`: Messi vs Ronaldo debates | two cartoon players + live scoreboard | `en-GB-RyanNeural` | `episodes/goat-trophies.json` |
| `whatif`: hypotheticals | Orbit the robot | `en-US-BrianNeural` | `episodes/whatif-moon.json` |
| `myth`: Greek mythology | Glaux the owl | `en-GB-SoniaNeural` | `episodes/myth-pandora.json` |
| `ocean`: animal facts | Inky the octopus | `en-US-AndrewNeural` | `episodes/octopus-hearts.json` |

The shared engine (captions, titles, props, render loop) is in `engine.js`. Each channel's background, host and scenes are in `channels/<name>.js`.

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
Copy an episode JSON and change the lines. Each line uses a `scene`, which is a drawing function in `channels/<channel>.js` (`S.<name>`), with optional sound cues in `EV.<name>`. Use `wl(line, 'word')` to time an animation to the moment a word is spoken. A new topic needs new scene functions. The character, captions, background and props can be reused.
