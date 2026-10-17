# MONOCHROME Magazine — The Vision Issue: motion ad

A 26-second vertical motion ad (1080×1920, 30 fps, H.264 + AAC) for Reels, TikTok and Stories. It replaces the page-by-page launch ad in `../magazine-launch/`. The magazine is a 3D object: it spins in, riffles open, and its pages fly, flip and orbit. Nothing on screen holds still.

| File | Use |
|---|---|
| `magazine-motion-9x16.mp4` | Launch day and after. It ends on **OUT NOW · Requisition your copy · monochrome.com.ng**. Trap soundtrack. |
| `magazine-motion-9x16-preorder.mp4` | Before the launch. It ends on **PRE-ORDER NOW · Reserve your copy · monochrome.com.ng · Out Sunday 18 October · 12:00 Regina**, with the price and shipping line under it. Trap soundtrack. |
| `magazine-motion-9x16-afro.mp4` | The out-now cut with the afro soundtrack (an original afro-house / amapiano-style instrumental, see below) under the same effects. |
| `magazine-motion-9x16-preorder-afro.mp4` | The pre-order cut with the afro soundtrack. |
| `magazine-motion-9x16-sfx-only.mp4` | The out-now cut with sound effects only, for posting with a licensed track from the app. |
| `magazine-motion-9x16-preorder-sfx-only.mp4` | The pre-order cut with sound effects only, for the same use. |

The launch is **Sunday 18 October 2026 at 12:00 Regina** (18:00 UTC, 19:00 Lagos, 14:00 Toronto, 19:00 London).

**About the afro version.** The client asked for Rema's "TEA" under the ad. We can't use that recording or its instrumental, and we can't recreate it, so the afro version is an original afro-house / amapiano-style track written for this film: a log-drum bass line, four-on-the-floor kick, shakers, congas and a whistle-style hook. No part of it comes from "TEA" or any other song. To use "TEA" itself, post one of the effects-only cuts and add the song inside Instagram or TikTok, if the app offers it to the account. Business accounts often get only a commercial-use library, which may not include it.

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
- **`audio/make_audio_afro.py`** writes the afro soundtrack into `audio/afro/`, on the same grid and under the same effects:
  - an original afro-house / amapiano-style instrumental at 120 BPM in A minor (Am9 – Fmaj9 – Dm9 – E7sus/E7, one chord per section)
  - a synthesised log drum playing its own bass line, with a woody knock and glides; a short four-on-the-floor kick ducks it, so the kick lands first and the log drum follows
  - shakers in swung sixteenths, open hats on the off-beats, congas, bongos, rim and clave, a soft clap on 2 and 4, and three different hand-drum fills: into the drop, into the 77 file and into the end card (after the 29 COUNTRIES slam)
  - rootless tine electric-piano chords, a kalimba/marimba motif, an airy pad, and a whistle / wooden-flute hook, doubled softly by a kalimba an octave down, on the drop, the orbit, the 77 file, the camera roll and the end card
  - it follows the film: a filtered cold open that builds into the drop at 2.0, a lighter riffle and split-flap board (kalimba in eighths or out, a plain or staccato log drum) so the page flaps and clacks read through, thinner facts, the full band on the end card, the final hit at 24.0 and a tail to 26.0
  - the drop and the final hit are the two loudest moments of the music: a harder kick and log-drum note, a sub drop, a clap and a doubled crash, with no ducking there, about 8 dB and 5 dB over anything in the bar before
  - mixed for phone speakers as well as headphones: the low mids are kept clear (keys high-passed at 230 Hz, pad at 250 Hz, conga bodies shelved down), the percussion has presence at 2-3 kHz, the lead sits under the groove, and the log drum carries a saturated 750-1800 Hz band so it is still heard on a speaker with no bass
  - the effects are the trap version's `audio/sfx.wav` and `audio/events.json`, unchanged, so run `make_audio.py` first. The music ducks under the slams and impacts with the trap mix's shape (but a smooth 3-4 ms attack, so no clicks), dips 2.5 dB under the riffle's page flaps and the board's clacks, and sits about 3 LU above the effects.
- **`audio/master.sh`** brings the mix to -14 LUFS and puts it on the film, with one static gain and a limiter for the peaks (it used to use ffmpeg's loudnorm, which can fall back to a slow gain ride that flattens the big moments). AAC overshoots on sharp clacks and clicks, so the script measures the encoded file and goes again until it reads -1 dBTP or less and within 0.25 LU of the target. The afro cuts were mastered with this version; the trap and effects-only cuts were mastered with the earlier one.

```
cd marketing/magazine-motion
ln -s ../../shopify-theme/tools/node_modules node_modules                 # once
node render.mjs --out magazine-motion-9x16-master.mp4                     # about 7 minutes
node render.mjs --variant preorder --out magazine-motion-9x16-preorder-master.mp4
python3 audio/make_audio.py                                               # trap mix + effects; needs numpy and scipy
python3 audio/make_audio_afro.py                                          # afro mix, into audio/afro/ (after make_audio.py)
for v in "" -preorder; do
  ffmpeg -i magazine-motion-9x16$v-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -an silent$v.mp4
  audio/master.sh silent$v.mp4 magazine-motion-9x16$v.mp4
  audio/master.sh silent$v.mp4 magazine-motion-9x16$v-afro.mp4 audio/afro/mix-premaster.wav
  audio/master.sh silent$v.mp4 magazine-motion-9x16$v-sfx-only.mp4 audio/sfx.wav
done
rm silent*.mp4
```

To put a new soundtrack on an existing cut without rendering again, take its picture with `ffmpeg -i magazine-motion-9x16.mp4 -map 0:v -c copy -an silent.mp4` and master onto that.

`node render.mjs --frames 60,300,120-129` writes single stills for checking (add `--stilldir` to put them elsewhere). Add `?variant=preorder` to preview the pre-order end card in a browser, and press space to play.

**Before posting:** the client's cover (page 01) reads "REGINA / OCT 2025", and the launch is 18 October 2026. The film shows the cover large in the drop, the orbit and the end card. Ask the client to confirm the year or send a corrected cover. If they send one, replace `assets/mag/01.jpg` and `assets/mag/md/01.jpg` (and `sm/01.jpg`), then render again.
