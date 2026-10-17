"""src/*.html -> dist/*.html with the image placeholder __IMG__ replaced by where the images are hosted.

    python3 build.py https://cdn.shopify.com/s/files/1/.../files      # one base URL for every image, or
    python3 build.py                                                  # per-image URLs from img-urls.json {"e1-clock.gif": "https://..."}
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
base = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else None
urls = json.load(open(os.path.join(HERE, 'img-urls.json'))) if base is None else {}
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
for name in sorted(os.listdir(os.path.join(HERE, 'src'))):
    html = open(os.path.join(HERE, 'src', name), encoding='utf-8').read()
    html = re.sub(r'__IMG__/([\w.-]+)', lambda m: f'{base}/{m.group(1)}' if base else urls[m.group(1)], html)
    assert '__IMG__' not in html and '{{ unsubscribe_url }}' in html and '{{ open_tracking }}' in html, name
    open(os.path.join(HERE, 'dist', name), 'w', encoding='utf-8').write(html)
    print('dist/' + name, len(html.encode()) // 1024, 'KB')
