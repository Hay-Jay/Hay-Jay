# MONOCHROME — The Vision Issue: 24 hours to Sunday

The 24-hour countdown promo for the **Sunday 18 October 2026, 12:00 Regina** launch (19:00 Lagos, 14:00 Toronto, 19:00 London). Post it on **Saturday 17 October at 12:00 Regina**, exactly 24 hours before. 1080×1920, 30 fps, 26.3 s.

It is the first countdown promo (`../countdown-promo`) with the new date. The inside pages are gone, so nothing from inside the magazine is shown. The stamps now render, and the cut is on the beat of a 155 BPM song: every scene starts on a bar line.

| File | Use |
|---|---|
| `countdown-xo-9x16-sfx-only.mp4` | Sound effects only: the clock, the stamps, the slams. Post it and add a song in the app, or keep it as the fallback. |
| `countdown-xo-9x16-song.mp4` | The effects over the client's own copy of a 155 BPM instrumental (XO Tour Llif3), made with `audio/mix_song.py`. **Not in git**: the song is the client's licensed copy. |

| Bars (155 BPM) | Time | On screen |
|---|---|---|
| 1–2 | 0–3.1 s | PRIORITY TRANSMISSION, then T-MINUS / 24 / HOURS on beats 4, 5 and 6. |
| 3–5 | 3.1–7.7 s | **The drop:** the split-flap clock slams in at **24:00:00** and runs. *The Vision Issue — declassified in*, Sunday 18 October, 12:00 Regina time. |
| 6–8 | 7.7–12.4 s | The cover sealed in an evidence bag: redaction bars, a laser scan, CLASSIFIED (beat 24), the tag *Sealed until 18.10 — 12:00 Regina*, a peek through a lens, then DENIED (beat 29). |
| 9–11 | 12.4–17.0 s | Regina SUN 12:00, Lagos SUN 19:00, Toronto SUN 14:00, London SUN 19:00, one every three beats. |
| 12–14 | 17.0–21.7 s | The countdown page on a phone. The screenshots are real, and the page's clock reads 00:23:59:47 … :42, the same as the film's clock. LIVE NOW, a tap on *Pre-order a copy*, PRE-ORDERS OPEN. |
| 15–17 | 21.7–26.3 s | 24 HOURS. · the clock still running · *Watch it hit zero* · monochrome.com.ng · *Pre-orders open — $10 CAD* · Sunday 18 October — 12:00 Regina · ships to 29 countries. |

The clock reads 24:00:00 at the drop (3.10 s) and loses one second per real second, down to 23:59:37 on the last frame. After the drop the frame gives a small kick on every bar line.

## Posting with the song in the app

Post `countdown-xo-9x16-sfx-only.mp4`, add the song, and slide it so the beat drops in on the white flash at 3.10 s (the clock slamming in). The cuts then follow its bars: 7.74, 12.39, 17.03 and 21.68 s.

## How it's made

- **`index.html`** is the first promo's animation. `toU(t)` lays its timeline on the 155 BPM grid: the cold open over two bars, every other scene over three. The split-flap clock runs on real time. The stamp's worn-ink mask is inlined as a data: URI, because Chromium blocks mask images loaded from files under `file://`; that is why the first promo's stamps never showed.
- **`capture-site.mjs`** took the phone screenshots from the local theme preview, with the browser's clock frozen at the seconds the film's clock shows while the phone is on screen.
- **`audio/make_audio.py`** writes the effects (`audio/sfx.wav`, `audio/events.json`), moved onto the new timeline with the same mapping. There is no music in it.
- **`audio/mix_song.py SONG`** measures the song's tempo and stretches it to exactly 155 BPM if needed, with the pitch kept. It finds the bar where the beat drops in, snaps to the kick's attack, and starts the song so that moment lands on the film's drop. It ducks the song a little under the big hits, puts the effects on top, and writes `audio/mix-premaster.wav`. `--drop SECONDS` picks the moment by hand.
- **`audio/master.sh`** sets one static gain and limits the peaks, so the hits stay on top. It masters to -14 LUFS (the effects-only cut to -15.5) with a true peak of -1 dBTP or lower, measured on the encoded file.

```
cd marketing/countdown-xo
ln -s ../../shopify-theme/tools/node_modules node_modules                 # once
node ../../shopify-theme/tools/serve.mjs --port 9292 &                    # only to re-take the phone screenshots
node capture-site.mjs                                                     # then stop the server
node render.mjs --out countdown-xo-9x16-master.mp4                        # about 8 minutes
python3 audio/make_audio.py
ffmpeg -i countdown-xo-9x16-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -an silent.mp4
audio/master.sh silent.mp4 countdown-xo-9x16-sfx-only.mp4 audio/sfx.wav -15.5
python3 audio/mix_song.py audio/song.mp3                                  # the client's instrumental
audio/master.sh silent.mp4 countdown-xo-9x16-song.mp4
rm silent.mp4
```
