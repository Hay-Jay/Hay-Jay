# MONOCHROME — new site launch film

`monochrome-launch-9x16-web.mp4` is a 24-second vertical film (1080×1920, 30 fps, H.264, about 14 Mbit/s) for Instagram Reels, TikTok and Snapchat Stories. It has no soundtrack, so add a sound in the app when you post.

| Time | Scene |
|---|---|
| 0–2.4 s | A secure terminal reads the fingerprint: identity verified, clearance granted. |
| 2.4–4.8 s | The emblem spins in, the MonoChrome wordmark wipes on, then Black / White / Chrome. |
| 4.8–8.4 s | The mission briefing page: OPERATION: WEAR THE UNKNOWN, a TOP SECRET stamp and the shop buttons. |
| 8.4–15 s | The evidence board. Four assets (white jersey, black jersey, hoodie, cargo skirt) land as polaroids, then declassify into colour. |
| 15–20.6 s | The new site on a phone: briefing, register, dossier, then Add to bag. |
| 20.6–24 s | End card: NEW SITE — NOW LIVE, monochrome.com.ng, shipping and @monochrome.ca. |

The film is made from `index.html`, using the site's own fonts and textures, product photos and real screenshots of the new site. Each frame is a function of time. Open `index.html` in a browser and press space to watch it live.

To change a price, product or line, edit `CARDS` or the text in `index.html`, then re-render:

```
cd marketing/launch-video
ln -s ../../shopify-theme/tools/node_modules node_modules   # once
node render.mjs --out monochrome-launch-9x16-master.mp4                     # about 5 minutes
ffmpeg -i monochrome-launch-9x16-master.mp4 -c:v libx264 -preset slow -crf 20 -maxrate 14M -bufsize 28M \
  -pix_fmt yuv420p -movflags +faststart -an monochrome-launch-9x16-web.mp4  # the upload-size file
```

`node render.mjs --frames 60,300,600` writes single stills for checking.
