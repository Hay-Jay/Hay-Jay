# Animated Shorts

Turns a short script into a finished vertical (1080×1920) animated video with voiceover, word-by-word captions, sound effects and background music. The output is ready for TikTok, YouTube Shorts and Instagram Reels.

## Channels

Each channel has its own host, look, voice and music. Each lives in its own folder under `accounts/`.

| Channel | Host | Voice | Example episode |
|---|---|---|---|
| `naija`: Nigerian history | Ìjàpá the tortoise; Ankara wax-print pop-art scenes | Nigerian English (`en-NG-AbeoNeural`) | `accounts/naija/episodes/naija-name.json` |
| `football`: Messi vs Ronaldo debates | two cartoon players + live scoreboard | `en-GB-RyanNeural` | `accounts/football/episodes/goat-trophies.json` |
| `whatif`: hypotheticals | Orbit the robot | `en-US-BrianNeural` | `accounts/whatif/episodes/whatif-moon.json` |
| `myth`: Greek mythology | Glaux the owl; stories painted as animated red-figure vases | `en-GB-SoniaNeural` | `accounts/myth/episodes/myth-pandora.json` |
| `ocean`: animal facts | Inky the octopus | `en-US-AndrewNeural` | `accounts/ocean/episodes/octopus-hearts.json` |

The shared engine (captions, titles, props, render loop) is in `engine.js`. Each channel's background, host and scenes are in `accounts/<account>/channel.js`.

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
- `scenes/<episode>.js` (optional): scenes for one episode only. The Greek mythology account keeps its shared world and characters in `channel.js` and each episode's scenes here.

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

## Cinematic toolkit (engine.js)

Channels can use these on top of the basics (the Greek mythology channel uses all of them):

- `FX`: motion blur (`blur` = sub-frames averaged per frame), `grain`, `vignette` and a colour `grade` applied once per frame.
- `camera(x, y, zoom, rot)`, `shake(t, amount)`, `whip(st, dir)` and `flash(st)` for camera moves and cuts.
- `layer(depth, fn, {blur})`: draw in depth. 0 stays fixed, 1 is the main plane, above 1 is foreground; layers move at different speeds for parallax, and `blur` gives depth of field.
- `shotOf(lt, cuts)`: split one narrated line into several shots, cut on chosen words.
- `cached(key, w, h, fn)`: draw a static background once and reuse it, for speed.
- `glow`, `godRays`, `particles` (dust, embers, sparks) and `goldText` (engraved title with a letter-by-letter reveal).
- `mouthAt(t)`: mouth shape (open, wide, round) from the letters being spoken, for lip-sync.

## Music

Drop a track in `assets/music/<account>/` and that account's videos use it instead of the built-in score. It is looped, faded out at the end, and lowered automatically while the narrator talks. See `assets/README.md`.

## How a video is made
1. `make_voice.py` voices each line with text-to-speech and records the timing of every word.
2. `render.js` draws each frame of `scenes.html?ch=<account>` in headless Chromium and pipes the frames to ffmpeg.
3. `mix.py` adds sound effects synced to the scenes, plus the account's music style.
4. `make.sh` combines the video and audio into the final MP4 (-14 LUFS).

## New episodes
Copy an episode JSON in the account's `episodes/` folder and change the lines. Each line uses a `scene`, which is a drawing function in that account's `channel.js` (`S.<name>`), with optional sound cues in `EV.<name>`. Use `wl(line, 'word')` to time an animation to the moment a word is spoken. A new topic needs new scene functions; the host, captions, background and props are reused.
