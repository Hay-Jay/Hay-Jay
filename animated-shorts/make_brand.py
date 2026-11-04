"""Brand kit per account: an 800x800 profile picture (TikTok + YouTube) and a 2560x1440 YouTube banner.

    python3 make_brand.py      ->  build/brand/<account>/profile.png, banner.png

Art comes from each account's closing host scene (build/<account>/<episode>/host.png or host.jpg).
The banner keeps its name and avatar inside YouTube's 1546x423 safe area, so nothing is cropped on phones.
"""
import json, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = {
    "myth": os.path.join(HERE, "assets/fonts/Cinzel-Black.ttf"),
    "naija": os.path.join(HERE, "assets/fonts/LilitaOne-Regular.ttf"),
}
DEFAULT_FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
ACCENT = {"naija": (242, 183, 5), "football": (56, 242, 139), "whatif": (94, 240, 255), "myth": (242, 196, 90), "ocean": (182, 156, 255)}


def host_image(acc):
    d = os.path.join(HERE, "build", acc["id"], acc.get("host_episode", ""))
    for f in ([acc["host_image"]] if acc.get("host_image") else []) + ["host.png", "host.jpg", "thumb.png"]:
        if os.path.exists(os.path.join(d, f)):
            return Image.open(os.path.join(d, f)).convert("RGB")
    raise SystemExit(f"no host art for {acc['id']}: render an episode first")


def fit_font(path, text, max_w, start):
    size = start
    while size > 20:
        f = ImageFont.truetype(path, size)
        if f.getbbox(text)[2] <= max_w:
            return f
        size -= 4
    return ImageFont.truetype(path, size)


def outlined(draw, xy, text, font, fill, stroke=(15, 12, 18), sw=10, anchor="lm"):
    draw.text(xy, text, font=font, fill=fill, stroke_width=sw, stroke_fill=stroke, anchor=anchor)


def main():
    for acc_dir in sorted(os.listdir(os.path.join(HERE, "accounts"))):
        p = os.path.join(HERE, "accounts", acc_dir, "account.json")
        if not os.path.exists(p):
            continue
        acc = json.load(open(p))
        out = os.path.join(HERE, "build", "brand", acc["id"]); os.makedirs(out, exist_ok=True)
        im, fy, bc = host_image(acc), acc.get("host_focus_y", 1050), acc.get("brand_crop", {})
        # profile picture: host centred, round-safe (platforms crop to a circle)
        half = bc.get("profile_half", 400); py = bc.get("profile_y", fy)
        top = max(0, min(1920 - 2 * half, py - half))
        prof = im.crop((540 - half, top, 540 + half, top + 2 * half)).resize((800, 800), Image.LANCZOS)
        prof.save(os.path.join(out, "profile.png"))
        # banner: blurred scene behind, avatar + name + tagline inside the safe area
        bg_top = bc.get("banner_top", max(0, min(1920 - 760, fy - 460)))
        bg = im.crop((0, bg_top, 1080, bg_top + 608)).resize((2560, 1440), Image.LANCZOS).filter(ImageFilter.GaussianBlur(18))
        shade = Image.new("RGB", bg.size, (12, 10, 16)); bg = Image.blend(bg, shade, 0.45)
        d = ImageDraw.Draw(bg)
        sx0, sy0, sx1, sy1 = 1280 - 773, 720 - 211, 1280 + 773, 720 + 211
        av = prof.resize((360, 360), Image.LANCZOS)
        mask = Image.new("L", (360, 360), 0); ImageDraw.Draw(mask).ellipse((0, 0, 359, 359), fill=255)
        ax, ay = sx0 + 40, 720 - 180
        acc_col = ACCENT.get(acc["id"], (255, 255, 255))
        d.ellipse((ax - 12, ay - 12, ax + 372, ay + 372), fill=acc_col)
        bg.paste(av, (ax, ay), mask)
        font_path = FONTS.get(acc["id"], DEFAULT_FONT)
        name = acc.get("brand_name", acc["label"])
        tx, max_w = ax + 420, sx1 - (ax + 420) - 20
        nf = fit_font(font_path, name.upper() if acc["id"] == "myth" else name, max_w, 150)
        outlined(d, (tx, 680), name.upper() if acc["id"] == "myth" else name, nf, (255, 248, 232), sw=12)
        tf = fit_font(DEFAULT_FONT, acc.get("tagline", ""), max_w, 64)
        outlined(d, (tx, 800), acc.get("tagline", ""), tf, acc_col, sw=8)
        if acc.get("days"):
            sf = ImageFont.truetype(DEFAULT_FONT, 44)
            outlined(d, (tx, 880), "New videos every day" if len(acc["days"]) == 7 else "New videos " + " · ".join(acc["days"]), sf, (230, 226, 240), sw=6)
        bg.save(os.path.join(out, "banner.png"))
        print(f"  {acc['id']}: profile.png, banner.png -> {out}")


if __name__ == "__main__":
    main()
