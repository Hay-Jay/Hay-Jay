#!/usr/bin/env bash
# Bring the soundtrack to a loudness target (default -14 LUFS, true peak -1 dBTP: what Instagram and TikTok play back at) and put it
# on the film.
#   ./master.sh <silent-video.mp4> <out.mp4> [mix.wav] [target LUFS]
# Writes soundtrack.wav (the mastered mix) next to this script. Run make_audio.py first.
# The gain is static: one number for the whole film, then a brick-wall limiter for the peaks. (ffmpeg's loudnorm falls back to a slow
# gain ride when it can't reach the target linearly, which flattened this film's quiet heartbeat opening into its drop.)
# The AAC encoder overshoots on sharp transients, so the encoded file is measured: while its peak is above -1 dBTP, the limiter's
# ceiling comes down by the excess; while its loudness is more than 0.25 LU off the target, the gain moves by the difference.
# The effects-only cut is mixed with big hits over a quiet bed, so it gets a lower target (-15.5) to keep the hits on top.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
video="$1"; out="$2"; mix="${3:-$here/mix-premaster.wav}"; target="${4:--14}"
pre="lowpass=f=16500:poles=2"                       # AAC drops the top anyway; band-limiting first keeps the limiter honest

summary() { ffmpeg -hide_banner -nostats -i "$1" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary; }
loud() { echo "$1" | sed -n 's/^ *I: *\([-0-9.]*\) LUFS.*/\1/p'; }
peak() { echo "$1" | sed -n 's/.*Peak: *\([-0-9.]*\) dBFS.*/\1/p'; }

gain=$(awk -v t="$target" -v i="$(loud "$(summary "$mix")")" 'BEGIN { printf "%.2f", t - i }')
lim=0.82
for try in 1 2 3 4 5 6 7 8; do
  ffmpeg -hide_banner -loglevel error -y -i "$mix" -af "$pre,volume=${gain}dB,aresample=192000,alimiter=limit=$lim:attack=1:release=40:level=false,aresample=48000" \
    -c:a pcm_s24le "$here/soundtrack.wav"
  ffmpeg -hide_banner -loglevel error -y -i "$video" -i "$here/soundtrack.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 \
    -shortest -movflags +faststart "$out"
  sum=$(summary "$out"); tp=$(peak "$sum"); li=$(loud "$sum")
  peak_ok=$(awk -v p="$tp" 'BEGIN { print (p <= -1.0) }'); loud_ok=$(awk -v i="$li" -v t="$target" 'BEGIN { d = i - t; print (d >= -0.25 && d <= 0.25) }')
  [ "$peak_ok" = 1 ] && [ "$loud_ok" = 1 ] && break
  if [ "$loud_ok" = 0 ]; then gain=$(awk -v g="$gain" -v i="$li" -v t="$target" 'BEGIN { printf "%.2f", g + (t - i) }'); echo "  encoded loudness $li LUFS; gain now $gain dB"; fi
  if [ "$peak_ok" = 0 ]; then lim=$(awk -v l="$lim" -v p="$tp" 'BEGIN { printf "%.4f", l * 10 ^ (0.7 * (-1.1 - p) / 20) }'); echo "  encoded peak $tp dBTP; limiter ceiling down to $lim"; fi
done
echo "wrote $out (gain $gain dB, limiter $lim)"
summary "$out" | grep -E 'I:|LRA:|Peak:'
