# MONOCHROME — The Vision Issue: 24 hours to Sunday

A 28-second vertical video (1080×1920, 30 fps, H.264 + AAC) for Reels, TikTok and Stories. Post it exactly 24 hours before the launch: the day before, at 12:00 Regina time. The launch is **Sunday 18 October 2026, 12:00 Regina** (19:00 Lagos, 14:00 Toronto, 19:00 London). It sends people to the countdown page and to pre-orders.

It is the countdown promo the client liked (the split-flap clock, the evidence bag, the four cities, the phone, the chrome type), made slower and more personal at the start, then cut on the tempo of a 154 BPM song (77 BPM half-time).

| File | Use |
|---|---|
| `countdown-sunday-9x16.mp4` | The promo with its own original soundtrack: a cinematic hip-hop anthem at 154 BPM in C minor. |
| `countdown-sunday-9x16-sfx-only.mp4` | Sound effects only (heartbeat, shutters, slams, the clock, stamps), mixed to sit under a song added in the app. Use this one with Power. |

| Time | Beat | On screen |
|---|---|---|
| 0–3.1 s | bar 1 | Regina HQ. Black, grain, a heartbeat on a monitor (one beat per half-time beat). Typed: *Some things are worth the wait.* |
| 3.1–6.2 s | bar 2 | The team from page 05: seven portraits light up one by one, one per eighth note, as the camera pulls back. ONE TEAM. lands at 4.68 s. |
| 6.2–7.0 s | bar 3 | ONE NIGHT.: the fashion show stage (page 13). |
| 7.0–7.8 s | | ONE VISION.: the 77 File (page 08). |
| 7.8–9.0 s | | TWENTY PAGES.: the montage speeds up, with pages 04, 16, 15, 06 and 03 on eighths, then sixteenths. The heartbeat speeds up. |
| 9.0–9.35 s | | Black and silence. |
| **9.35 s** | **bar 4: the drop** | A white flash. The split-flap clock slams in at **24:00:00**. Then T-MINUS (10.13 s), 24 HOURS (10.91 s), Sunday 18 October, 12:00 Regina time (11.69 s). |
| 12.5–15.6 s | bar 5 | The cover is sealed in an evidence bag: redaction bars, a laser scan, a CLASSIFIED stamp (14.03 s) and the tag *Sealed until 18.10 — 12:00 Regina* (14.81 s). |
| 15.6–18.7 s | bar 6 | Regina SUN 12:00, Lagos SUN 19:00, Toronto SUN 14:00, London SUN 19:00, one per beat. |
| 18.7–21.8 s | bar 7 | The countdown page on a phone. The screenshots are real, and the page's clock reads 00:23:59:51 … :48, the same as the film's clock. |
| 21.8–28.1 s | bars 8–9 | TOMORROW. Then the clock, still running (22.60 s), *Sunday 18 October · 12:00 Regina* (23.38 s) and monochrome.com.ng (24.16 s). The final hit comes at **24.94 s**: *Pre-orders open — $10 CAD*. Then *The Vision Issue — Vol. 001 · 20 pages · ships to 29 countries*, and a held, breathing frame to the end. |

The clock reads 24:00:00 at the drop (9.35 s) and loses one second per second of film, down to 23:59:42 on the last frame. So it is honest: at posting time there are 24 hours to go.

## Posting with Power

The song itself is not in either file, because it is licensed through the app's music library. The film is cut on Power's tempo instead: **154 BPM (77 half-time)**. Every cut, word, slam and stamp lands on a half-time beat (0.779 s), an eighth or a sixteenth.

1. Post `countdown-sunday-9x16-sfx-only.mp4`.
2. Add Power from the Instagram or TikTok music library.
3. Slide the song so that one of its big drum hits lands on the **white flash at 9.35 s** (the clock slamming in). From there the cuts follow its beat. The other bar lines are at 12.47, 15.58, 18.70, 21.82 and 24.94 s.
4. Turn the original audio (the effects) down until the song leads. The heartbeat and the hits stay underneath.

## How it's made

- **`timeline.js`** is the schedule, in half-time beats. Both the picture and the sound read it. Seconds = beats × 60/77. Each event lands on the first video frame at or after its beat.
- **`index.html`** renders any moment of the film (`render(t)`). The stamp's worn-ink mask is inlined as a data: URI, so the stamps render under `file://`. The shared SVG gradients live outside every scene.
- **`capture-site.mjs`** took the phone screenshots from the local theme preview. The browser's clock was frozen at the exact moments the film's clock shows while the phone is on screen. It also writes `assets/site-cd.js`, which records where things are on the page and what the page read (`SUN 12:00` etc.).
- **`audio/make_audio.py`** writes both mixes. The music is an original anthem at 154 BPM (77 half-time) in C minor:
  - a felt piano, a heartbeat and a wordless choir swell over Cm, Ab, Eb, Bb, Fm and G;
  - silence before the drop;
  - half-time drums with 154 hats, an 808, choir and brass stabs;
  - a thin bar under the phone, then Ab, Bb and a final C major hit with a long tail.

  The effects-only mix leaves out the monitor blips, beeps, hums, shimmers and the crash, and uses short sub hits in place of long booms. Everything is synthesised with `../lib/mcsound.py`. There are no samples, no recordings and nothing taken from any real song.
- **`audio/master.sh`** brings each mix to -14 LUFS with a true peak of -1 dBTP or lower, measured on the encoded file.

```
cd marketing/countdown-sunday
ln -s ../../shopify-theme/tools/node_modules node_modules                 # once
node ../../shopify-theme/tools/serve.mjs --port 9292 &                    # only to re-take the phone screenshots
node capture-site.mjs                                                     # then stop the server
node render.mjs --out countdown-sunday-9x16-master.mp4                    # about 10 minutes
python3 audio/make_audio.py
ffmpeg -i countdown-sunday-9x16-master.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -an silent.mp4
audio/master.sh silent.mp4 countdown-sunday-9x16.mp4
audio/master.sh silent.mp4 countdown-sunday-9x16-sfx-only.mp4 audio/sfx-only-premaster.wav
rm silent.mp4
```

`node render.mjs --frames 0,281,740-760 --stilldir /tmp/stills` writes single frames as PNGs, for checking.
