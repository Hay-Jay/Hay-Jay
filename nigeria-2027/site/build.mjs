// Builds the site from src/:
//   naija-decides.html  (published as a Claude artifact, with img/ and photos/ alongside)
//   index.html          (standalone page for any static host)
// Run:  node nigeria-2027/site/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const r = f => readFileSync(path.join(here, 'src', f), 'utf8');
const app = r('app.js').replace('/*OLD_DATA*/', r('data.js'));
const body = r('head.html') + '\n<script>\n' + app + '\n</script>\n';
writeFileSync(path.join(here, 'naija-decides.html'), body);
const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
writeFileSync(path.join(here, 'index.html'), head + body + '</body></html>\n');
console.log('built naija-decides.html and index.html');
