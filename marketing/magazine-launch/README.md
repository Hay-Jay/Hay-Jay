# MONOCHROME Magazine — The Vision Issue: launch ad

A 27-second vertical ad (1080×1920, 30 fps, H.264 + AAC) for Reels, TikTok and Stories. It is cut from the magazine's own pages, from the client's PDF.

| File | Use |
|---|---|
| `magazine-launch-9x16.mp4` | Launch day and after. It ends on **OUT NOW · Requisition your copy · monochrome.com.ng**. |
| `magazine-launch-9x16-preorder.mp4` | Before the launch. It ends on **PRE-ORDER NOW · Out Saturday 17 October · 12:00 Regina**. |
| `magazine-launch-9x16-sfx-only.mp4` | The out-now cut with sound effects only, for posting with a licensed track from the app. |

| Time | On screen |
|---|---|
| 0–0.8 s | Four strobe flashes from inside the issue. |
| 0.8–2.4 s | THE VISION ISSUE slams in. |
| 2.4–7.2 s | The cover, a light sweep, a FIRST ISSUE stamp, and the first page turns. |
| 7.2–20 s | The inside, page by page on the beat: Meet the dream team, The 77 File, Play Lab (quiz, crossword, maze), Fashion show, Night in Motion, the camera roll, The Store Edit, Join the Team. |
| 20–23.2 s | Volume 001 · 20 pages · Printed copy · $10 CAD · Ships to 29 countries. |
| 23.2–27.2 s | The end card. |

## How it's made

- **`timeline.js`** is the whole schedule: shots, page turns, camera moves, captions and the end card. Both the picture and the sound read it.
- **`index.html`** renders any moment of the film from it. The magazine pages sit in `assets/mag/` at 1445×1870, rendered from the PDF.
- **`audio/make_audio.py`** writes the soundtrack:
  - an original rage/trap beat at 150 BPM
  - effects placed from the timeline (page turns, shutters, slams, stamps, light sweeps)
  - instruments and effects from `../lib/mcsound.py`; everything is synthesised, with no samples and no third-party music.

```
cd marketing/magazine-launch
ln -s ../../shopify-theme/tools/node_modules node_modules                 # once
node render.mjs --out magazine-launch-9x16-master.mp4                     # about 6 minutes
node render.mjs --variant preorder --out magazine-launch-9x16-preorder-master.mp4
python3 audio/make_audio.py                                               # needs numpy and scipy
for v in "" -preorder; do
  ffmpeg -i magazine-launch-9x16$v-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -an silent$v.mp4
  audio/master.sh silent$v.mp4 magazine-launch-9x16$v.mp4
done
audio/master.sh silent.mp4 magazine-launch-9x16-sfx-only.mp4 audio/sfx.wav
```

`node render.mjs --frames 60,300` writes single stills for checking. Add `?variant=preorder` to preview the pre-order end card in a browser, and press space to play.
