"""*.liquid -> dist/*.liquid, the files to paste into Shopify, with __NIMG__/ replaced by the images' Shopify CDN URLs.

    python3 build.py      # URLs from img-urls.json {"oc-stamp.gif": "https://cdn.shopify.com/..."}
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
urls = json.load(open(os.path.join(HERE, 'img-urls.json')))
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
for name in sorted(n for n in os.listdir(HERE) if n.endswith('.liquid')):
    src = open(os.path.join(HERE, name), encoding='utf-8').read()
    out = re.sub(r'__NIMG__/([\w.-]+)', lambda m: urls[m.group(1)], src)
    assert '__NIMG__' not in out and '{{ order_status_url }}' in out, name
    open(os.path.join(HERE, 'dist', name), 'w', encoding='utf-8').write(out)
    print('dist/' + name, len(out.encode()) // 1024, 'KB')
