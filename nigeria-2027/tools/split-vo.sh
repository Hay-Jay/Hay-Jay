#!/bin/bash
# Split vo/_full/<id>.mp3 into vo/<id>/NN.mp3 at scene-line boundaries (word-aligned).
# Needs a Python with faster-whisper: set ALIGN_PY (default python3) and ALIGN_SCRIPT.
id=$1; here=$(cd "$(dirname "$0")/.." && pwd)
node -e "global.window={VIDEOS:[],NARRATION:{}}; require('$here/dossier.js'); process.stdout.write(JSON.stringify(window.NARRATION['$id'].map(l=>l[1])))" > /tmp/lines-$id.json
"${ALIGN_PY:-python3}" "${ALIGN_SCRIPT:-$here/tools/align_split.py}" /tmp/lines-$id.json "$here/vo/_full/$id.mp3" "$here/vo/$id"
