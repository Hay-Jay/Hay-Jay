// News momentum: how many distinct news stories (Google News, Nigeria edition) mentioned each candidate
// alongside election words, in each of the last 7 days. Google returns at most 100 stories per query,
// so each day is counted separately (cap: 700 a week). Attention, not support.
// Run: node nigeria-2027/site/momentum.mjs   (rewrites the momentum category in src/ranking.js)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const Q = {
  tinubu:'"Tinubu"', atiku:'"Atiku"', obi:'"Peter Obi"', 'seyi-makinde':'"Seyi Makinde"', 'donald-duke':'"Donald Duke"',
  'sandy-ojang-onor':'"Sandy Onor"', 'sunday-chibuzo-okereke':'("Sunday Okereke" OR "Chibuzo Okereke")', 'omoyele-sowore':'"Sowore"',
  'adewole-adebayo':'"Adewole Adebayo"', 'rufai-adekunle-omo-aje':'("Omo-Aje" OR "Omoaje")', 'aliyu-abbas-bin':'("Bin Abbas" OR "Abbas-Bin")',
  'kabiru-yusuf':'"Kabiru Yusuf"', 'sunday-adenuga':'"Sunday Adenuga"', 'moses-olusoji-adebisi':'"Moses Adebisi"',
  'ada-elizabeth-fredrick-okwori':'"Ada Okwori"', 'nkem-esther-okereke':'("Esther Okereke" OR "Nkem Okereke")', 'peter-ada-agada':'"Peter Agada"',
  'daniel-nwanyanwu':'"Nwanyanwu"'
};
const CTX = '(2027 OR election OR presidential OR campaign OR candidate)';
// Common names: also require the party, so namesakes are not counted.
const PARTY = {'sunday-chibuzo-okereke':'(LP OR "Labour Party")', 'kabiru-yusuf':'(APP OR "Action Peoples Party")', 'sunday-adenuga':'("Boot Party" OR BP)',
  'moses-olusoji-adebisi':'(DLA OR "Democratic Leadership Alliance")', 'ada-elizabeth-fredrick-okwori':'(NDP OR "National Democratic Party")',
  'nkem-esther-okereke':'(NRM OR "National Rescue Movement")', 'peter-ada-agada':'(YPP OR "Young Progressives")', 'aliyu-abbas-bin':'(ADP OR "Action Democratic Party")',
  'daniel-nwanyanwu':'(ZLP OR "Zenith Labour")', 'rufai-adekunle-omo-aje':'(AA OR "Action Alliance")', 'sandy-ojang-onor':'(PDP OR "Peoples Democratic Party")'};
const day = d => d.toISOString().slice(0, 10);
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const end = new Date(); end.setUTCHours(0, 0, 0, 0);            // count the 7 full days before today
const from0 = day(new Date(end - 7 * 864e5)), to0 = day(new Date(end - 864e5));
if (!process.argv.includes('--force') && readFileSync(path.join(here, 'src', 'ranking.js'), 'utf8').includes(`date:'${from0} to ${to0}'`)) {
  console.log(`momentum already counted for ${from0} to ${to0}; skipping (use --force to recount)`); process.exit(0);
}
const raw = {};
for (const [id, q] of Object.entries(Q)) {
  const links = new Set();
  for (let i = 7; i >= 1; i--) {
    const a = new Date(end - i * 864e5), b = new Date(end - (i - 1) * 864e5);
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(`${q} ${PARTY[id] || ''} ${CTX} after:${day(a)} before:${day(b)}`) + '&hl=en-NG&gl=NG&ceid=NG:en';
    let xml = '';
    for (let t = 0; t < 3 && !xml; t++) { try { xml = execFileSync('curl', ['-sS', '-m', '30', url], { encoding: 'utf8' }); } catch { sleep(3000); } }
    for (const m of xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)) links.add(m[1]);
    sleep(1200);
  }
  raw[id] = links.size; console.log(id, links.size);
}
const from = day(new Date(end - 7 * 864e5)), to = day(new Date(end - 864e5));
const file = path.join(here, 'src', 'ranking.js'); let src = readFileSync(file, 'utf8');
const entry = `    {id:'momentum', label:'News momentum', kind:'Attention measure', weight:0.5, all:true, date:'${from} to ${to}', n:'news stories in 7 days (Google News, Nigeria)', src:'momentum',\n      note:'How often each candidate was in the news with election words, counted day by day (max 100 a day). Measures attention, good or bad, not support. Refreshed with every rank update.', raw:${JSON.stringify(raw).replace(/"([a-z-]+)":/g, "'$1':")}, fmt:'count'}`;
if (/\{id:'momentum'[\s\S]*?fmt:'count'\}/.test(src)) src = src.replace(/    \{id:'momentum'[\s\S]*?fmt:'count'\}/, entry);
else src = src.replace(/(fmt:'states'\})(\n  \],)/, `$1,\n${entry}$2`);
writeFileSync(file, src); console.log('momentum written', from, to);
