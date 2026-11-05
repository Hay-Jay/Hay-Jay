// Builds the site from src/:
//   naija-decides.html  (published as a Claude artifact, with img/ and photos/ alongside)
//   index.html          (standalone page for any static host)
// Run:  node nigeria-2027/site/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const r = f => readFileSync(path.join(here, 'src', f), 'utf8');
const SNAP = process.argv.includes('--snapshot');
if (SNAP) { // append the current points to the ranking history (run after changing any poll numbers)
  const file = path.join(here, 'src', 'ranking.js'); let src = readFileSync(file, 'utf8');
  const RANK = new Function(src + '; return {RANK, rankPoints};')(); const pts = RANK.rankPoints(RANK.RANK); const now = new Date().toISOString();
  const points = Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, v.total]));
  const last = RANK.RANK.history[RANK.RANK.history.length - 1];
  const same = last && Object.keys(points).length === Object.keys(last.points).length && Object.keys(points).every(k => last.points[k] === points[k]);
  if (!same) {
    src = src.replace(/(  history: \[[\s\S]*?)(\n  \]\n\};)/, (m, a, b) => `${a},\n    {at:'${now}', points:${JSON.stringify(points).replace(/"/g, '')}}${b}`);
    src = src.replace(/changed: '[^']*'/, `changed: '${now}'`);
    console.log('snapshot added', points);
  } else console.log('no change in points');
  src = src.replace(/updated: '[^']*'/, `updated: '${now}'`);
  writeFileSync(file, src);
}
const app = r('app.js').replace('/*OLD_DATA*/', r('data.js')).replace('/*RANKING*/', r('ranking.js')).replace('/*NEWS*/', r('news.js')).replace('/*BIOS*/', r('bios.js'));
const body = r('head.html') + '\n<script>\n' + app + '\n</script>\n';
writeFileSync(path.join(here, 'naija-decides.html'), body);
const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Naija Decides 2027: compare the candidates, check the claims</title><meta name="description" content="Neutral, sourced guide to Nigeria&#39;s 16 January 2027 presidential election: all 18 candidates, fact-checks, the live Naija Decides Rank and news every 5 hours."><meta property="og:type" content="website"><meta property="og:site_name" content="Naija Decides"><meta property="og:title" content="Naija Decides 2027"><meta property="og:description" content="Compare all 18 candidates, check the claims, follow the live rank and the latest news. Nigeria votes 16 Jan 2027."><meta property="og:url" content="https://naijadecides.deji.digital/"><meta property="og:image" content="https://naijadecides.deji.digital/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://naijadecides.deji.digital/og.jpg"><link rel="icon" href="icon.png"><link rel="apple-touch-icon" href="icon.png"><meta name="theme-color" content="#020f08"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
writeFileSync(path.join(here, 'index.html'), head + body + '</body></html>\n');
console.log('built naija-decides.html and index.html');
