// Wraps naija-decides.html into a standalone index.html for any static host
// (GitHub Pages, Netlify, Vercel). Run:  node nigeria-2027/site/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const body = readFileSync(path.join(here, 'naija-decides.html'), 'utf8');
const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
writeFileSync(path.join(here, 'index.html'), head + body + '</body></html>\n');
console.log('wrote site/index.html');
