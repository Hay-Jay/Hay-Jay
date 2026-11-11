#!/usr/bin/env bash
# Loudness-normalise the soundtrack (-14 LUFS, true peak -1 dBTP: what Instagram and TikTok play back at) and put it on the film.
#   ./master.sh <silent-video.mp4> <out.mp4> [mix.wav]
# Writes soundtrack.wav (the mastered mix) next to this script. Run make_audio.py first.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
video="$1"; out="$2"; mix="${3:-$here/mix-premaster.wav}"
target=(I=-14 TP=-1 LRA=11)

# pass 1: measure
stats=$(ffmpeg -hide_banner -nostats -i "$mix" -af "loudnorm=$(IFS=:; echo "${target[*]}"):print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
# pass 2: apply (linear when the measured range allows it), then a brick-wall limiter as a safety net
ffmpeg -hide_banner -loglevel error -y -i "$mix" -af "loudnorm=$(IFS=:; echo "${target[*]}"):measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,alimiter=limit=0.89:attack=1:release=40:level=false,aresample=48000" \
  -c:a pcm_s24le "$here/soundtrack.wav"

ffmpeg -hide_banner -loglevel error -y -i "$video" -i "$here/soundtrack.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -shortest -movflags +faststart "$out"
echo "wrote $out"
ffmpeg -hide_banner -nostats -i "$out" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E 'I:|Peak:'
