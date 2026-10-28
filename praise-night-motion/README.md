# Praise Night — motion loops for LED wall & livestream

Animated versions of the Praise Night with Pastor Ayo flyer (Christ Embassy Regina Group Church).

| File (in `output/`) | Use it for | Length |
|---|---|---|
| `praise-night-loop-1920x1080.mp4` | Pre-service, walk-in, LED wall, stream holding screen | 20 s seamless loop |
| `praise-night-intermission-loop-1920x1080.mp4` | Breaks — "INTERMISSION · WE'LL BE RIGHT BACK" | 20 s seamless loop |
| `praise-night-intermission-countdown-5min-1920x1080.mp4` | Timed breaks — counts down to 00:00 | 5 min, starts at 05:00 and ends on 00:00 (play once) |

**Motion:** a slow push-in, a gold light sweep across "PRAISE NIGHT", soft glow on the gold and lens flares, twinkling stars, and rising gold sparkles. Each element repeats exactly every 20 s, so the loop has no visible jump.

## Playing it

- **ProPresenter:** add the loop as a video cue and set Playback to *Loop*.
- **OBS:** add a *Media Source* and tick *Loop*. You can also tick *Restart playback when source becomes active*.
- **vMix / Resolume:** set the clip to loop.
- **Countdown:** play it once. It ends on 00:00. Then cut back to the live camera.

All files are H.264 1080p30 MP4s. They play on almost any media server and can go straight into a stream.

## Re-rendering (different LED size, different countdown)

Requires Python 3 with Pillow and numpy, plus ffmpeg.

```bash
python3 render.py                                   # everything at 1920x1080
python3 render.py --width 3840 --height 2160        # 4K
python3 render.py --countdown 600                   # 10-minute countdown
python3 render.py --only main --seconds 30          # longer main loop only
```

If your LED processor uses an odd size such as 2560×1440 or a 16:9 slice of a wider wall, pass that width and height. The flyer art is 16:9, so a wall with a very different shape will need the art re-laid out.
