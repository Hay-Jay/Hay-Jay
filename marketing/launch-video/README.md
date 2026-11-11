# MONOCHROME — new site launch film

`monochrome-launch-9x16.mp4` is a 24-second vertical film (1080×1920, 30 fps, H.264, about 8 Mbit/s, 25 MB) for Instagram Reels, TikTok and Snapchat Stories. It has its own soundtrack: an original rage/trap instrumental (150 BPM, C# minor, distorted gliding 808s, bells, rolling hi-hats) with sound effects placed on the film's frames. `monochrome-launch-9x16-sfx-only.mp4` has the sound effects alone, for posting with a licensed track from the app's sound library.

| Time | Scene |
|---|---|
| 0–2.4 s | A secure terminal reads the fingerprint: identity verified, clearance granted. |
| 2.4–4.8 s | The emblem spins in, the MonoChrome wordmark wipes on, then Black / White / Chrome. |
| 4.8–8.4 s | The mission briefing page: OPERATION: WEAR THE UNKNOWN, a TOP SECRET stamp and the shop buttons. |
| 8.4–15 s | The evidence board. Four assets (white jersey, black jersey, acid-washed hoodie, sweatshirt) land as polaroids, then declassify into colour. |
| 15–20.6 s | The new site on a phone: briefing, register, dossier, then Add to bag. |
| 20.6–24 s | End card: NEW SITE — NOW LIVE, monochrome.com.ng, shipping and @monochrome.ca. |

The film is made from `index.html`, using the site's own fonts and textures, product photos and real screenshots of the new site. Each frame is a function of time. Open `index.html` in a browser and press space to watch it live.

To change a price, product or line, edit `CARDS` or the text in `index.html`, then re-render:

```
cd marketing/launch-video
ln -s ../../shopify-theme/tools/node_modules node_modules   # once
node render.mjs --out monochrome-launch-9x16-master.mp4                     # about 5 minutes
ffmpeg -i monochrome-launch-9x16-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M \
  -pix_fmt yuv420p -movflags +faststart -an monochrome-launch-9x16.mp4      # the upload-size file
```

`node render.mjs --frames 60,300,600` writes single stills for checking.

## Soundtrack

Everything in it is synthesised by `audio/make_audio.py`. There are no samples and no third-party music, so the video can be posted without licence problems.

- The beat runs at 150 BPM, with bar 1 starting at 0.8 s, so the drop lands on the cut at 2.4 s.
  - At 15 s the beat plays through a "phone speaker" while the phone is on screen.
  - At 20.6 s it drops out and builds into the last hit.
- Each sound effect starts on the frame where its picture lands. `audio/events.json` lists them all: stamps, slams, card landings, the camera shutter, typing, the tap on Add to bag and so on.
- `audio/master.sh` brings the mix to -14 LUFS with true peak at -1 dBTP, the level Instagram and TikTok play at, and puts it on the video.

```
cd marketing/launch-video
python3 audio/make_audio.py                     # music.wav, sfx.wav, mix-premaster.wav, events.json (needs numpy and scipy)
ffmpeg -i monochrome-launch-9x16-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -an silent.mp4
audio/master.sh silent.mp4 monochrome-launch-9x16.mp4                       # beat and effects
audio/master.sh silent.mp4 monochrome-launch-9x16-sfx-only.mp4 audio/sfx.wav  # effects only
```
