#!/usr/bin/env bash
# Usage: ./make.sh episodes/octopus-hearts.json [output_dir]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
EP="$1"; NAME="$(basename "$EP" .json)"; OUT="${2:-$HERE/build/$NAME}"
mkdir -p "$OUT"
if [ -f "$OUT/timeline.json" ] && [ "$OUT/timeline.json" -nt "$EP" ]; then echo "1/4 voice (cached)"; else echo "1/4 voice"; python3 "$HERE/make_voice.py" "$EP" "$OUT"; fi
echo "2/4 frames"; node "$HERE/render.js" "$OUT"
echo "3/4 audio";  python3 "$HERE/mix.py" "$OUT"
echo "4/4 encode"
ffmpeg -y -v error -i "$OUT/video.mp4" -i "$OUT/mix.wav" -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/$NAME.mp4"
echo "Done: $OUT/$NAME.mp4"
