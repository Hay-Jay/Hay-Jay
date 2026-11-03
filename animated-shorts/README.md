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

## Folder layout: one folder per account

```
accounts/
  naija/      account.json  channel.js  episodes/*.json   Nigerian history (Ìjàpá the tortoise)
  football/   account.json  channel.js  episodes/*.json   Messi vs Ronaldo debates
  whatif/     account.json  channel.js  episodes/*.json   What-ifs (Orbit the robot)
  myth/       account.json  channel.js  episodes/*.json   Greek mythology (Glaux the owl)
  ocean/      account.json  channel.js  episodes/*.json   spare: animal facts (Inky the octopus)
build/<account>/<episode>/<episode>.mp4                   finished videos, kept apart per account
```

- `account.json`: the account's profile kit (name ideas, bio, hashtags, posting days, house rule, colour).
- `channel.js`: the host character, background and scenes for that account.
- `episodes/*.json`: one script per video, with its TikTok caption and YouTube title and description.

The shared engine (captions, titles, props, render loop) is in `engine.js`.

## Make videos

```bash
pip install edge-tts numpy pillow
./make.sh accounts/naija/episodes/naija-name.json   # one video
./make.sh accounts/football/episodes/*.json         # every video for one account
```

Each video is saved to `build/<account>/<episode>/`. The voice track is cached, so re-rendering after a visual change skips text-to-speech.

## Studio page

```bash
python3 make_hub.py
```

This builds `build/hub/index.html`, a page with one section per account: its videos (watch and save), copy buttons for every caption, the profile kit, and posted status for TikTok and YouTube. Publish it again after adding videos to update the same link.

## How a video is made
1. `make_voice.py` voices each line with text-to-speech and records the timing of every word.
2. `render.js` draws each frame of `scenes.html?ch=<account>` in headless Chromium and pipes the frames to ffmpeg.
3. `mix.py` adds sound effects synced to the scenes, plus the account's music style.
4. `make.sh` combines the video and audio into the final MP4 (-14 LUFS).

## New episodes
Copy an episode JSON in the account's `episodes/` folder and change the lines. Each line uses a `scene`, which is a drawing function in that account's `channel.js` (`S.<name>`), with optional sound cues in `EV.<name>`. Use `wl(line, 'word')` to time an animation to the moment a word is spoken. A new topic needs new scene functions; the host, captions, background and props are reused.
