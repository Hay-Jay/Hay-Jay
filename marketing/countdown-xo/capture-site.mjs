// node capture-site.mjs [http://localhost:9292]
// Screenshots of the countdown page (/pages/vision-issue) for the phone scene, as a 390x844 phone at 3x with reduced motion.
// Start the local theme preview first:  node ../../shopify-theme/tools/serve.mjs --port 9292
// The launch moment is the page's own (Sunday 18 October 2026, 12:00 Regina = 2026-10-18T12:00:00-06:00). The browser's clock is
// frozen at exact moments 24 hours before it, in Regina's time zone, so the page's own clock reads what the film's clock reads while
// the phone is on screen (bars 12-14 of the 155 BPM grid; the film's clock reads 24:00:00 at the drop, bar 3).
// The page re-syncs to the server's Date header; the HEAD request gets none.
//   assets/site-cd.jpg            the page from the top, 1170 px wide, cropped to 2100 CSS px
//   assets/site-cd-clock-SS.png   the clock row alone at second SS, laid over site-cd.jpg as the film ticks
//   assets/site-cd.js             where things are on the page (CSS px), for index.html
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:9292';
const LAUNCH = Date.parse('2026-10-18T12:00:00-06:00');      // the page's own data-launch (the section default)
// what the film's clock reads while the phone is on screen: 86400 - floor(t - drop), for t in the phone scene
const FPS = 30, BAR = 4 * 60 / 155, drop = 2 * BAR, p0 = 11 * BAR, p1 = 14 * BAR;
const SECS = [];
for (let f = Math.ceil(p0 * FPS - 1e-6); f / FPS < p1; f++) { const ss = (86400 - Math.floor(f / FPS - drop + 1e-6)) % 60; if (!SECS.includes(ss)) SECS.push(ss); }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: 'reduce', timezoneId: 'America/Regina', locale: 'en-CA' });
// the page's clock rounds up: 23:59:SS shows while 86340+SS-1 < launch-now <= 86340+SS; freeze half a second inside that window
const at = ss => LAUNCH - (86340 + ss - 0.5) * 1000;
await ctx.clock.install({ time: at(SECS[0]) - 4000 });
await ctx.route(u => u.pathname.endsWith('/pages/vision-issue'), async r => {
  if (r.request().method() === 'HEAD') return r.fulfill({ status: 200, headers: { 'content-type': 'text/html' }, body: '' });
  return r.continue();
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/pages/vision-issue', { waitUntil: 'load' });
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
await p.waitForTimeout(800);
const read = () => p.evaluate(() => {
  const u = k => [...document.querySelectorAll(`[data-u=${k}] .fd`)].map(f => f.dataset.v).join('');
  return `${u('d')}:${u('h')}:${u('m')}:${u('s')} | ${document.querySelector('[data-cd-local]')?.textContent.replace(/\s+/g, ' ').trim()} | ${[...document.querySelectorAll('[data-cd-cities] [data-tz]')].map(s => s.textContent.replace(/\s+/g, ' ').trim()).join(' / ')} | ${document.querySelector('.cd-tag')?.textContent.replace(/\s+/g, ' ').trim()}`;
});
const clockBox = await p.evaluate(() => { const c = document.querySelector('.cd-clock-wrap') || document.querySelector('.cd-clock'); const r = c.getBoundingClientRect(); return { x: 0, y: Math.floor(r.top + scrollY) - 6, width: 390, height: Math.ceil(r.height) + 44 }; });
const readings = {};
for (const [i, ss] of SECS.entries()) {
  await ctx.clock.pauseAt(at(ss));
  await p.waitForTimeout(150);
  readings[ss] = await read();
  console.log(ss, readings[ss]);
  if (i === 0) {
    // the page from the top to just past the spec table, as a JPEG (2100 CSS px = 6300 px at 3x)
    writeFileSync(join(here, 'assets', 'site-cd.jpg'), await p.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: 390, height: 2100 }, type: 'jpeg', quality: 90 }));
  }
  writeFileSync(join(here, 'assets', `site-cd-clock-${ss}.png`), await p.screenshot({ clip: clockBox, type: 'png' }));
}
const pos = await p.evaluate(() => Object.fromEntries(Object.entries({ clock: '.cd-clock-wrap', buy: '.cd-buy', bag: '[data-cd-bag]', cities: '[data-cd-cities]', log: '[data-cd-log]' }).map(([k, s]) => { const e = document.querySelector(s); if (!e) return [k, null]; const r = e.getBoundingClientRect(); return [k, [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]]; })));
writeFileSync(join(here, 'assets', 'site-cd.js'), `// written by capture-site.mjs: where things are on the captured page (CSS px: x, y, w, h), the clock strip, and what the page read\nwindow.SITE = ${JSON.stringify({ clockBox, pos, secs: SECS, readings }, null, 1)};\n`);
console.log('clock box (CSS px)', JSON.stringify(clockBox), 'positions (CSS px: x, y, w, h)', JSON.stringify(pos), 'errors', errs);
await b.close();
