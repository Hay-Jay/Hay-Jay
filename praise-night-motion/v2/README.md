# Praise Night: animated redesign (v2)

This is a full motion redesign of the Praise Night with Pastor Ayo flyer. It uses only the flyer's own words, photos and colours: navy and royal blue, gold, the globe, the Canadian flag and music.

## Files

| File | Use it for |
|---|---|
| `output/praise-night-main-loop-1920x1080.mp4` | Walk-in, LED wall, stream holding screen. 30 s seamless loop. |
| `output/praise-night-intermission-loop-1920x1080.mp4` | Breaks. Every 5 s, "with Pastor Ayo" and an animated **INTERMISSION** badge take turns. 30 s seamless loop. |
| `scene.html` | The live animation itself, for an OBS Browser Source (see below). |

## What moves

- Stage lights sweep from the top, with god-rays turning behind the globe and drifting haze.
- The Canadian flag waves in the upper left.
- The four photo cards float and tilt in 3D. Every 7.5 s they flip in a cascade, so each card shows the next photo. A light runs around their gold frames and a gleam sweeps across them.
- Pastor Ayo has a pulsing gold and blue halo and a rim light.
- The globe rotates. City lights twinkle, and gold network lines carry light pulses between them. A pulse ring goes out on each musical bar, and a flare travels along the horizon.
- Three gold ribbons have light comets racing along them.
- **PRAISE NIGHT** has gold lettering with a treble-clef "I". The letters move in a wave, a light sweep crosses them, sparkles glint on the edges, and the whole title pulses to the beat.
- The "Pastor Ayo" flourish draws itself in and out, and the header rules extend and shimmer.
- An equalizer pulses to a 96 BPM beat. Gold music notes float up, and sparkles and bokeh drift.

## OBS

**Option A, the MP4:** add a *Media Source*, choose the MP4 and tick **Loop**.

**Option B, live and endless:** add a *Browser Source* and tick **Local file**. Choose `scene.html` and set width **1920**, height **1080**. Keep the whole `v2` folder together, because the page loads its fonts and photos from `assets/`.
- Intermission: untick *Local file* and use the URL `file:///…/v2/scene.html?mode=intermission`.
- 4K canvas: add `?scale=2` and set the source to 3840×2160.

## ProPresenter / Resolume / vMix

Use the MP4 files and set them to loop.

## Re-rendering

You need Node with Playwright (and its Chromium browser) plus ffmpeg.

```bash
node render.mjs --mode main
node render.mjs --mode intermission
node render.mjs --mode main --scale 2      # 3840x2160
```
