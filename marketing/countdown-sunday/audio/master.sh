#!/usr/bin/env bash
# Loudness-normalise the soundtrack (-14 LUFS, true peak -1 dBTP: what Instagram and TikTok play back at) and put it on the film.
#   ./master.sh <silent-video.mp4> <out.mp4> [mix.wav]
# Writes soundtrack.wav (the mastered mix) next to this script. Run make_audio.py first.
# The AAC encoder overshoots on sharp transients (clacks, clicks, slams), so the peak is measured on the encoded file: while it is
# above -1 dBTP, the limiter's ceiling comes down by the excess and the soundtrack is mastered and muxed again (loudness hardly moves).
# A spiky mix (the effects-only cut) can come out of loudnorm under -14 LUFS, so the loudness of the encoded file is measured too:
# while it is more than 0.25 LU short, the shortfall goes on as gain into the limiter and the pass runs again.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
video="$1"; out="$2"; mix="${3:-$here/mix-premaster.wav}"
target=(I=-14 TP=-1 LRA=11)
pre="lowpass=f=16500:poles=2"                       # AAC drops the top anyway; band-limiting first keeps the limiter honest

# pass 1: measure
stats=$(ffmpeg -hide_banner -nostats -i "$mix" -af "$pre,loudnorm=$(IFS=:; echo "${target[*]}"):print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
summary() { ffmpeg -hide_banner -nostats -i "$1" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary; }

lim=0.82; gain=0
for try in 1 2 3 4 5 6 7 8; do
  # pass 2: apply (linear when the measured range allows it), then a brick-wall limiter at 4x oversampling
  ffmpeg -hide_banner -loglevel error -y -i "$mix" -af "$pre,loudnorm=$(IFS=:; echo "${target[*]}"):measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,volume=${gain}dB,aresample=192000,alimiter=limit=$lim:attack=1:release=40:level=false,aresample=48000" \
    -c:a pcm_s24le "$here/soundtrack.wav"
  ffmpeg -hide_banner -loglevel error -y -i "$video" -i "$here/soundtrack.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 \
    -shortest -movflags +faststart "$out"
  sum=$(summary "$out")
  tp=$(echo "$sum" | sed -n 's/.*Peak: *\([-0-9.]*\) dBFS.*/\1/p')
  li=$(echo "$sum" | sed -n 's/^ *I: *\([-0-9.]*\) LUFS.*/\1/p')
  peak_ok=$(awk -v p="$tp" 'BEGIN { print (p <= -1.0) }'); loud_ok=$(awk -v i="$li" 'BEGIN { print (i >= -14.25) }')
  [ "$peak_ok" = 1 ] && [ "$loud_ok" = 1 ] && break
  if [ "$loud_ok" = 0 ]; then gain=$(awk -v g="$gain" -v i="$li" 'BEGIN { printf "%.2f", g + (-14.0 - i) }'); echo "  encoded loudness $li LUFS; gain into the limiter up to $gain dB"; fi
  if [ "$peak_ok" = 0 ]; then lim=$(awk -v l="$lim" -v p="$tp" 'BEGIN { printf "%.4f", l * 10 ^ (0.7 * (-1.1 - p) / 20) }'); echo "  encoded peak $tp dBTP; limiter ceiling down to $lim"; fi
done
echo "wrote $out"
ffmpeg -hide_banner -nostats -i "$out" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E 'I:|Peak:'
