"""Build the studio page: one section per account with its videos, captions and profile kit.

    python3 make_hub.py        ->  build/hub/index.html  (+ videos/ and posters/ beside it)

Reads accounts/<id>/account.json, accounts/<id>/episodes/*.json and the finished
videos in build/<id>/<episode>/<episode>.mp4. Episodes that are not built yet are skipped.
"""
import glob, json, os, shutil, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "build", "hub")
LIMIT = 15_000_000  # per-file limit for the published page


def duration(path):
    s = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                             capture_output=True, text=True, check=True).stdout)
    return f"{int(s // 60)}:{int(round(s % 60)):02d}"


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    accounts, files = [], {}
    for acc_path in glob.glob(os.path.join(HERE, "accounts", "*", "account.json")):
        acc = json.load(open(acc_path))
        eps = []
        for ep_path in sorted(glob.glob(os.path.join(os.path.dirname(acc_path), "episodes", "*.json"))):
            name = os.path.splitext(os.path.basename(ep_path))[0]
            src_dir = os.path.join(HERE, "build", acc["id"], name)
            mp4 = os.path.join(src_dir, name + ".mp4")
            if not os.path.exists(mp4):
                print(f"  skip {acc['id']}/{name} (not built yet)")
                continue
            ep = json.load(open(ep_path)); post = ep.get("post", {})
            video_rel, poster_rel = f"videos/{acc['id']}/{name}.mp4", f"posters/{acc['id']}/{name}.jpg"
            os.makedirs(os.path.join(OUT, os.path.dirname(video_rel)), exist_ok=True)
            os.makedirs(os.path.join(OUT, os.path.dirname(poster_rel)), exist_ok=True)
            if os.path.getsize(mp4) > LIMIT:   # smaller web copy so the page can host it
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mp4, "-c:v", "libx264", "-preset", "slow", "-crf", "23",
                                "-maxrate", "3200k", "-bufsize", "6400k", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart",
                                os.path.join(OUT, video_rel)], check=True)
            else:
                shutil.copy(mp4, os.path.join(OUT, video_rel))
            Image.open(os.path.join(src_dir, "thumb.png")).convert("RGB").resize((360, 640), Image.LANCZOS) \
                .save(os.path.join(OUT, poster_rel), quality=82)
            if not acc.get("avatar") :
                fy = acc.get("avatar_focus_y", 1050); half = 330
                av_rel = f"posters/{acc['id']}/avatar.jpg"
                Image.open(os.path.join(src_dir, "thumb.png")).convert("RGB").crop((540 - half, fy - half, 540 + half, fy + half)) \
                    .resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, av_rel), quality=85)
                acc["avatar"] = av_rel; files[av_rel] = os.path.join(OUT, av_rel)
            files[video_rel] = os.path.join(OUT, video_rel)
            files[poster_rel] = os.path.join(OUT, poster_rel)
            eps.append(dict(id=name, title=ep.get("title", name), video=video_rel, poster=poster_rel,
                            file=(name if name.startswith(acc["id"]) else f"{acc['id']}-{name}") + ".mp4", duration=duration(mp4),
                            tiktok=post.get("caption", ""), yt_title=post.get("youtube_title", ""),
                            yt_desc=post.get("youtube_description", "")))
        acc["episodes"] = eps
        accounts.append(acc)
    accounts.sort(key=lambda a: a.get("order", 99))
    data = json.dumps({"accounts": accounts}, ensure_ascii=False).replace("</", "<\\/")
    html = open(os.path.join(HERE, "hub", "template.html")).read().replace("/*__DATA__*/null", data)
    open(os.path.join(OUT, "index.html"), "w").write(html)
    json.dump({k: os.path.abspath(v) for k, v in files.items()}, open(os.path.join(OUT, "files.json"), "w"), indent=1)
    total = sum(os.path.getsize(v) for v in files.values())
    print(f"  {sum(len(a['episodes']) for a in accounts)} videos across {len(accounts)} accounts, {total/1e6:.1f} MB -> {OUT}/index.html")


if __name__ == "__main__":
    main()
