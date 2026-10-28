#!/usr/bin/env python3
"""Render the Praise Night flyer as a seamless motion loop for LED walls and streaming.

Usage:
    python3 render.py                      # main loop + intermission loop + 5 min countdown
    python3 render.py --only main          # just the main loop
    python3 render.py --width 3840 --height 2160 --countdown 600

Every animated element is periodic over the loop length, so the video can be
set to repeat forever in ProPresenter / OBS / Resolume / vMix without a visible jump.
"""
import argparse
import math
import os
import subprocess
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "praise-night-flyer.webp")
FONT = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FONT_SEMI = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"

# Positions measured on the 1672x941 source flyer.
SRC_W, SRC_H = 1672, 941
TITLE_BOX = (560, 430, 1100, 850)          # "PRAISE NIGHT with Pastor Ayo" lettering
EMPTY_BOX = (605, 839, 1040, 917)          # dark placeholder panel under the title
FLARES = [(1466, 502, 1.0), (468, 592, 0.8), (1130, 588, 0.55), (205, 710, 0.4), (1630, 700, 0.4)]

G = {}  # per-worker state


def load_layers(w, h, intermission):
    sx, sy = w / SRC_W, h / SRC_H
    src = Image.open(SRC).convert("RGB")
    hi = src.resize((w * 2, h * 2), Image.LANCZOS)
    a = np.asarray(src.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255

    # Gold lettering mask: warm, bright pixels inside the title area.
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gold = np.clip((r - b - 0.25) * 3, 0, 1) * np.clip((r - 0.45) * 3, 0, 1)
    box = np.zeros_like(gold)
    x0, y0, x1, y1 = TITLE_BOX
    box[int(y0 * sy):int(y1 * sy), int(x0 * sx):int(x1 * sx)] = 1
    box = np.asarray(Image.fromarray((box * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(30 * sx))).astype(np.float32) / 255
    gold_title = gold * box

    # Warm highlights anywhere (flares, gold rims) -> soft bloom that breathes.
    lum = a.mean(2)
    warm_hi = np.clip((lum - 0.55) * 2.5, 0, 1) * np.clip((r - b) * 4, 0, 1)
    bloom = np.asarray(Image.fromarray((warm_hi * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(14 * sx))).astype(np.float32) / 255
    bloom = bloom[..., None] * np.array([1.0, 0.75, 0.35], np.float32)

    # Zoom anchor = centre of the placeholder panel, so text placed there stays put.
    ex0, ey0, ex1, ey1 = EMPTY_BOX
    anchor = ((ex0 + ex1) / 2 * sx, (ey0 + ey1) / 2 * sy)

    text = None
    if intermission:
        text = make_intermission_text(w, h, sx, sy)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rng = np.random.default_rng(7)
    n = int(170 * (w * h) / (1920 * 1080))
    parts = dict(
        x=rng.uniform(0, w, n), y0=rng.uniform(0, h, n),
        cycles=rng.integers(1, 4, n),            # whole trips per loop -> seamless
        sway=rng.uniform(4, 18, n) * sx, sway_k=rng.integers(1, 4, n),
        size=rng.choice([1.2, 1.8, 2.5, 3.5, 5.0], n, p=[.35, .3, .2, .1, .05]) * sx,
        tw_k=rng.integers(2, 7, n), tw_ph=rng.uniform(0, 2 * math.pi, n),
        bright=rng.uniform(0.35, 1.0, n),
    )
    G.update(w=w, h=h, sx=sx, hi=hi, gold=gold_title[..., None], bloom=bloom,
             anchor=anchor, text=text, xx=xx, yy=yy, parts=parts,
             sprites={}, flare=make_flare(int(150 * sx)))


def make_intermission_text(w, h, sx, sy):
    """RGBA layer with INTERMISSION centred in the empty panel."""
    ex0, ey0, ex1, ey1 = [v * s for v, s in zip(EMPTY_BOX, (sx, sy, sx, sy))]
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    size = int(34 * sy)
    font = ImageFont.truetype(FONT, size)
    word, track = "INTERMISSION", int(size * 0.32)
    widths = [d.textlength(c, font=font) for c in word]
    total = sum(widths) + track * (len(word) - 1)
    x = (ex0 + ex1) / 2 - total / 2
    y = ey0 + (ey1 - ey0) * 0.08
    for c, cw in zip(word, widths):
        d.text((x, y), c, font=font, fill=(255, 214, 120, 255))
        x += cw + track
    arr = np.asarray(layer).astype(np.float32) / 255
    glow = np.asarray(layer.filter(ImageFilter.GaussianBlur(10 * sx))).astype(np.float32) / 255
    return arr, glow


def make_flare(size):
    """Four-point star with soft core, additive RGB."""
    c = size / 2
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) - c
    r = np.hypot(x, y) / c
    core = np.exp(-(r * 9) ** 2) + 0.35 * np.exp(-(r * 3.5) ** 2)
    spike = (np.exp(-(y / (c * 0.012)) ** 2) * np.exp(-np.abs(x) / (c * 0.45)) +
             np.exp(-(x / (c * 0.012)) ** 2) * np.exp(-np.abs(y) / (c * 0.35)))
    s = np.clip(core + 0.9 * spike, 0, 1.5)
    return s[..., None] * np.array([1.0, 0.85, 0.55], np.float32)


def sprite(radius):
    key = round(radius, 1)
    if key not in G["sprites"]:
        n = int(radius * 4) | 1
        c = n // 2
        y, x = np.mgrid[0:n, 0:n].astype(np.float32) - c
        g = np.exp(-(x * x + y * y) / (2 * (radius * 0.6) ** 2))
        G["sprites"][key] = g[..., None] * np.array([1.0, 0.8, 0.45], np.float32)
    return G["sprites"][key]


def add(frame, spr, cx, cy, amt):
    h, w = frame.shape[:2]
    sh, sw = spr.shape[:2]
    x0, y0 = int(cx) - sw // 2, int(cy) - sh // 2
    fx0, fy0, fx1, fy1 = max(x0, 0), max(y0, 0), min(x0 + sw, w), min(y0 + sh, h)
    if fx0 >= fx1 or fy0 >= fy1:
        return
    frame[fy0:fy1, fx0:fx1] += spr[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0] * amt


def render_frame(args):
    i, n_frames, out_dir = args
    w, h, sx = G["w"], G["h"], G["sx"]
    p = i / n_frames                      # loop phase 0..1
    T = 2 * math.pi * p

    # 1. Slow breathing push-in (1.000 -> 1.035 -> 1.000) anchored on the panel.
    z = 1 + 0.0175 * (1 - math.cos(T))
    ax, ay = G["anchor"]
    # Map output pixel (u,v) -> hi-res source: ((u-ax)/z + ax) * 2
    inv = 2 / z
    coeffs = (inv, 0, 2 * ax * (1 - 1 / z), 0, inv, 2 * ay * (1 - 1 / z))
    base = G["hi"].transform((w, h), Image.AFFINE, coeffs, Image.BILINEAR)
    f = np.asarray(base).astype(np.float32) / 255

    # Masks are low-frequency; a nearest lookup keeps them locked to the zoomed picture.
    mx, my = (G["xx"] - ax) / z + ax, (G["yy"] - ay) / z + ay
    mxi = np.clip(mx.astype(np.int32), 0, w - 1)
    myi = np.clip(my.astype(np.int32), 0, h - 1)
    gold = G["gold"][myi, mxi]
    bloom = G["bloom"][myi, mxi]

    # 2. Bloom on warm highlights breathes twice per loop.
    f += bloom * (0.18 + 0.14 * math.sin(2 * T))

    # 3. Gold shimmer sweeps across the lettering 4x per loop.
    sweeps = 4
    sp = (p * sweeps) % 1
    t = sp / 0.38                          # sweep takes 38% of each slot, then rests
    if t < 1:
        x0, _, x1, _ = TITLE_BOX
        pos = (x0 - 120 + (x1 - x0 + 240) * (t * t * (3 - 2 * t))) * sx
        d = (mx + (my - 600 * sx) * 0.45) - pos
        band = np.exp(-(d / (34 * sx)) ** 2) + 0.35 * np.exp(-(d / (95 * sx)) ** 2)
        f += gold * band[..., None] * np.array([1.0, 0.95, 0.8], np.float32) * 0.9
    # constant gentle gleam on the gold
    f += gold * 0.06 * (1 + math.sin(4 * T)) * np.array([1.0, 0.8, 0.4], np.float32)

    # 4. Twinkling lens flares.
    flare = G["flare"]
    for k, (fx, fy, s) in enumerate(FLARES):
        tw = 0.55 + 0.45 * math.sin(T * (2 + k % 3) + k * 1.7)
        cx = ((fx * sx - ax) * z + ax)
        cy = ((fy * G["h"] / SRC_H - ay) * z + ay)
        add(f, flare, cx, cy, s * tw * 0.9)

    # 5. Rising gold sparkles (screen space, gives depth against the zoom).
    P = G["parts"]
    travel = h + 40 * sx
    ys = (P["y0"] - p * P["cycles"] * travel) % travel - 20 * sx
    xs = P["x"] + P["sway"] * np.sin(T * P["sway_k"] + P["tw_ph"])
    tw = 0.5 + 0.5 * np.sin(T * P["tw_k"] + P["tw_ph"])
    fade = np.clip(1 - ys / h, 0, 1) ** 0.6   # brighter as they rise
    for j in range(len(ys)):
        a = P["bright"][j] * tw[j] * (0.35 + 0.65 * fade[j])
        if a > 0.03:
            add(f, sprite(P["size"][j]), xs[j], ys[j], a)

    # 6. Optional INTERMISSION text with a soft pulsing glow.
    if G["text"] is not None:
        arr, glow = G["text"]
        ga = glow[..., 3:4] * (0.55 + 0.45 * math.sin(2 * T))
        f += ga * np.array([1.0, 0.7, 0.25], np.float32) * 0.9
        f = f * (1 - arr[..., 3:4]) + arr[..., :3] * arr[..., 3:4]

    f = np.clip(f, 0, 1)
    Image.fromarray((f * 255 + 0.5).astype(np.uint8)).save(
        os.path.join(out_dir, f"{i:05d}.png"), compress_level=1)
    return i


def init_worker(w, h, intermission):
    load_layers(w, h, intermission)


def render_loop(name, w, h, fps, seconds, intermission, workdir):
    n = fps * seconds
    frames = os.path.join(workdir, name)
    os.makedirs(frames, exist_ok=True)
    with Pool(os.cpu_count(), initializer=init_worker, initargs=(w, h, intermission)) as pool:
        for k, _ in enumerate(pool.imap_unordered(render_frame, [(i, n, frames) for i in range(n)], 4)):
            if k % 60 == 0:
                print(f"  {name}: {k}/{n}", flush=True)
    return frames


def encode(frames, fps, out, vf=None, extra_in=None, duration=None, crf=18):
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    if extra_in:
        cmd += extra_in
    cmd += ["-framerate", str(fps), "-i", os.path.join(frames, "%05d.png")]
    if vf:
        cmd += ["-vf", vf]
    if duration:
        cmd += ["-t", str(duration)]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print("  wrote", out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--seconds", type=int, default=20, help="loop length")
    ap.add_argument("--countdown", type=int, default=300, help="countdown length in seconds")
    ap.add_argument("--only", choices=["main", "intermission"], default=None)
    ap.add_argument("--out", default=os.path.join(HERE, "output"))
    ap.add_argument("--work", default=os.path.join(HERE, ".frames"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    tag = f"{a.width}x{a.height}"
    w, h = a.width, a.height

    if a.only in (None, "main"):
        print("Rendering main loop")
        fr = render_loop("main", w, h, a.fps, a.seconds, False, a.work)
        encode(fr, a.fps, os.path.join(a.out, f"praise-night-loop-{tag}.mp4"))

    if a.only in (None, "intermission"):
        print("Rendering intermission loop")
        fr = render_loop("intermission", w, h, a.fps, a.seconds, True, a.work)
        sx, sy = w / SRC_W, h / SRC_H
        cx = (EMPTY_BOX[0] + EMPTY_BOX[2]) / 2 * sx
        line2_y = EMPTY_BOX[1] * sy + (EMPTY_BOX[3] - EMPTY_BOX[1]) * sy * 0.58
        fs = int(24 * sy)
        style = (f"fontfile={FONT_SEMI}:fontsize={fs}:fontcolor=white@0.92:"
                 f"shadowcolor=0x000000@0.6:shadowx=0:shadowy=2:y={line2_y:.0f}")
        rbb = f"drawtext={style}:text='WE\\'LL BE RIGHT BACK':x={cx:.0f}-tw/2"
        encode(fr, a.fps, os.path.join(a.out, f"praise-night-intermission-loop-{tag}.mp4"), vf=rbb)

        # Countdown: loop the intermission frames and draw mm:ss from c:00, holding 00:00 for the last second.
        c = a.countdown
        clock = (f"%{{eif\\:trunc(({c}-t+0.999)/60)\\:d\\:2}}\\:%{{eif\\:mod(trunc({c}-t+0.999)\\,60)\\:d\\:2}}")
        cd = f"drawtext={style}:text='WE START AGAIN IN  {clock}':x={cx:.0f}-tw/2"
        encode(fr, a.fps, os.path.join(a.out, f"praise-night-intermission-countdown-{c // 60}min-{tag}.mp4"),
               vf=cd, extra_in=["-stream_loop", "-1"], duration=c + 1, crf=26)  # keeps 5 min under 100 MB


if __name__ == "__main__":
    main()
