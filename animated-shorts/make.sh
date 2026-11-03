#!/usr/bin/env bash
# Build one or more episodes. Each finished video lands in build/<account>/<episode>/.
#   ./make.sh accounts/naija/episodes/naija-name.json      # one episode
#   ./make.sh accounts/football/episodes/*.json            # a whole account
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
[ $# -gt 0 ] || { echo "usage: $0 accounts/<account>/episodes/<episode>.json ..."; exit 1; }
for EP in "$@"; do
  NAME="$(basename "$EP" .json)"
  ACCOUNT="$(basename "$(cd "$(dirname "$EP")/.." && pwd)")"
  OUT="$HERE/build/$ACCOUNT/$NAME"
  mkdir -p "$OUT"
  echo "== $ACCOUNT / $NAME"
  if [ -f "$OUT/timeline.json" ] && [ "$OUT/timeline.json" -nt "$EP" ]; then echo "1/4 voice (cached)"; else echo "1/4 voice"; python3 "$HERE/make_voice.py" "$EP" "$OUT"; fi
  echo "2/4 frames"; node "$HERE/render.js" "$OUT"
  echo "3/4 audio";  python3 "$HERE/mix.py" "$OUT"
  echo "4/4 encode"
  ffmpeg -y -v error -i "$OUT/video.mp4" -i "$OUT/mix.wav" -map 0:v -map 1:a -c:v libx264 -preset slow -crf 22 -tune film -pix_fmt yuv420p \
    -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/$NAME.mp4"
  echo "Done: $OUT/$NAME.mp4"
done
