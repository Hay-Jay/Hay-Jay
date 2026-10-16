# MONOCHROME Magazine — The Vision Issue: motion ad

A 26-second vertical motion ad (1080×1920, 30 fps, H.264 + AAC) for Reels, TikTok and Stories. It replaces the page-by-page launch ad in `../magazine-launch/`. The magazine is a 3D object: it spins in, riffles open, and its pages fly, flip and orbit. Nothing on screen holds still.

| File | Use |
|---|---|
| `magazine-motion-9x16.mp4` | Launch day and after. It ends on **OUT NOW · Requisition your copy · monochrome.com.ng**. |
| `magazine-motion-9x16-preorder.mp4` | Before the launch. It ends on **PRE-ORDER NOW · Reserve your copy · monochrome.com.ng · Out Saturday 17 October · 12:00 Regina**, with the price and shipping line under it. |
| `magazine-motion-9x16-sfx-only.mp4` | The out-now cut with sound effects only, for posting with a licensed track from the app. |

| Time | On screen |
|---|---|
| 0–2 s | Black. Orbit rings draw on, a chrome sphere streaks round them, MONOCHROME / MAGAZINE / VOL. 001 tracks in, and the camera rushes through the rings. |
| 2–4 s | The drop. The closed magazine spins in from deep space and lands. THE / VISION / ISSUE slam in around it on the beats (VISION is an outline in front of the cover), and a light sweep crosses the cover. |
| 4–6 s | The magazine opens and riffles through the whole issue in about a second. A page counter runs with it. It snaps back to page 05, and the camera pushes into The Team. |
| 6–8 s | The seven portraits lift off page 05 as cards and land in a grid. MEET THE DREAM TEAM lands word by word. |
| 8–10 s | Eight pages orbit the cover, kicking round on every beat. STYLE / PLAY / CULTURE change on each beat, then the camera zooms through page 08. |
| 10–12 s | The 77 File. Giant 77s draw on and slam, the jersey photo slides in as panels, and a FILE 77 stamp lands. |
| 12–14 s | Fashion show. The stage photo comes in through sliding blinds, which flip to a closer shot. ONE NIGHT. / A WHOLE WORLD. track across. |
| 14–16 s | A split-flap board of all 20 pages, every tile flipping on the beat, a nod to the countdown promo. It settles on 01–20, and page 10 flies out. |
| 16–18 s | Play Lab. The crossword fills with THE VISION ISSUE. The camera whips to the maze, which solves itself (the real route, traced from page 12), then to the quiz, where the right answers get circled. |
| 18–20 s | Camera roll. Film strips of pages 15–16 race diagonally under a REC viewfinder, with a shutter flash on every beat. |
| 20–22 s | The facts, with rolling counters: 20 PAGES · PRINTED COPY · $10 CAD · 29 COUNTRIES. The stack stays centred as it grows, and holds for a moment before the magazine pushes it off. |
| 22–26 s | The magazine flies in open, closes, spins once and settles inside its orbit. Then OUT NOW, the button, monochrome.com.ng on the final hit at 24 s, and the price line at 24.5 s (in the pre-order cut, the launch date). |

All the photos and pages are the client's own, from the PDF. They are cropped, moved, flipped and lit, but never redrawn. The team cards are crops of page 05. The quiz answers come from the answer key on page 19.

## How it's made

- **`index.html`** renders any moment of the film. The 3D is CSS: the magazine is ten two-sided leaves round a spine, each leaf in two hinged halves so a page can bend as it turns. The pages sit in `assets/mag/` at three sizes (1445 px, 720 px and 360 px wide).
- **`render.mjs`** steps the page at 30 fps in headless Chromium and pipes the frames to ffmpeg.
- **`audio/make_audio.py`** writes the soundtrack:
  - an original trap beat at 120 BPM, so a beat is half a second and every section is one bar
  - the same backbeat and sixteenth hats as the countdown promo, on new chords (C#m – A – E – B), with a new lead riff and new bell lines
  - effects placed on the film's frames: a flap for every page in the riffle, a clack for every split-flap tile, whooshes on the spins and zooms, slams on the words, ticks on the counters and shutters on the camera roll
  - instruments and effects from `../lib/mcsound.py`; everything is synthesised, with no samples and no vocals.
- **`audio/master.sh`** brings the mix to -14 LUFS and puts it on the film. AAC overshoots on sharp clacks and clicks, so the script measures the encoded file and goes again until it reads -1 dBTP or less and within 0.25 LU of -14 LUFS. It lowers the limiter for a high peak and adds gain for a quiet cut, such as the effects-only one.

```
cd marketing/magazine-motion
ln -s ../../shopify-theme/tools/node_modules node_modules                 # once
node render.mjs --out magazine-motion-9x16-master.mp4                     # about 7 minutes
node render.mjs --variant preorder --out magazine-motion-9x16-preorder-master.mp4
python3 audio/make_audio.py                                               # needs numpy and scipy
for v in "" -preorder; do
  ffmpeg -i magazine-motion-9x16$v-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -an silent$v.mp4
  audio/master.sh silent$v.mp4 magazine-motion-9x16$v.mp4
done
audio/master.sh silent.mp4 magazine-motion-9x16-sfx-only.mp4 audio/sfx.wav
```

`node render.mjs --frames 60,300,120-129` writes single stills for checking (add `--stilldir` to put them elsewhere). Add `?variant=preorder` to preview the pre-order end card in a browser, and press space to play.

**Before posting:** the client's cover (page 01) reads "REGINA / OCT 2025", and the launch is 17 October 2026. The film shows the cover large in the drop, the orbit and the end card. Ask the client to confirm the year or send a corrected cover. If they send one, replace `assets/mag/01.jpg` and `assets/mag/md/01.jpg` (and `sm/01.jpg`), then render again.
