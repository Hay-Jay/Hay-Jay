# MONOCHROME — The Vision Issue: 24-hour countdown promo

A 24-second vertical video (1080×1920, 30 fps, H.264 + AAC) to post on **Friday 16 October at 12:00 Regina time**, exactly 24 hours before the launch. It sends people to the countdown page and to pre-orders.

| File | Use |
|---|---|
| `countdown-24h-9x16.mp4` | The promo with its soundtrack. |
| `countdown-24h-9x16-sfx-only.mp4` | Sound effects only (the clock's clack, stamps, whooshes), for posting with a licensed track from the app. |

| Time | On screen |
|---|---|
| 0–2 s | PRIORITY TRANSMISSION, then T-MINUS 24 HOURS. |
| 2–6 s | A split-flap clock slams in at 24:00:00 and ticks down, one flap and one clack per second. |
| 6–10 s | The cover, sealed in an evidence bag: a laser scan, a CLASSIFIED stamp, the tag "Sealed until 17.10 — 12:00 Regina". A peek lens shows a glimpse, then DENIED. |
| 10–14 s | The launch in four cities: Regina SAT 12:00, Lagos SAT 19:00, Toronto SAT 14:00, London SAT 19:00. |
| 14–18 s | The countdown page itself on a phone. The screenshots are real, and the page's clock agrees with the film's. |
| 18–20 s | Three inside pages, blurred and redacted: Style, Play, Culture. |
| 20–24 s | 24 HOURS. · the clock still running · Watch it hit zero · monochrome.com.ng · Pre-orders open — $10 CAD. |

The clock reads 24:00:00 at 2 s and loses one second per second of film, so it is honest: it is 24 hours to go.

## How it's made

- **`index.html`** renders any moment of the film.
- **`capture-site.mjs`** took the phone screenshots from the local theme preview, with the browser's clock set to exactly 24 hours before the launch.
- **`audio/make_audio.py`** writes the soundtrack. It is an original trap beat at 120 BPM, chosen so that a second is two beats: the clock's clack lands on the beat, and every cut lands on a bar. Instruments and effects come from `../lib/mcsound.py`, and everything is synthesised.

```
cd marketing/countdown-promo
ln -s ../../shopify-theme/tools/node_modules node_modules                 # once
node render.mjs --out countdown-24h-9x16-master.mp4                       # about 5 minutes
python3 audio/make_audio.py
ffmpeg -i countdown-24h-9x16-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -an silent.mp4
audio/master.sh silent.mp4 countdown-24h-9x16.mp4
audio/master.sh silent.mp4 countdown-24h-9x16-sfx-only.mp4 audio/sfx.wav
```
