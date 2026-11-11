// node tools/shot.mjs /cart out.png [--w 1440] [--h 900] [--full] [--click "#mcDrawer"] [--wait 800] [--port 9292] [--nojs] [--scroll 0]
// Screenshots a route of the dev server and prints console errors, page errors and failed requests.
import { chromium } from 'playwright-core';
import { parseArgs } from './lib/util.mjs';
const a = parseArgs(process.argv.slice(2), { boolean: ['full', 'nojs', 'mobile'], multi: ['click'] });
const [route, out] = a._;
const w = +(a.w || 1440), h = +(a.h || 900);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +(a.dpr || 1), reducedMotion: 'reduce', javaScriptEnabled: !a.nojs, hasTouch: w < 700, isMobile: w < 700 });
const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 200)));
p.on('requestfailed', r => errs.push('failed: ' + r.url().slice(0, 120)));
p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(`http ${r.status()}: ${r.url().slice(0, 120)}`); });
await p.goto(`http://localhost:${a.port || 9292}${route}`, { waitUntil: 'load' });
await p.waitForTimeout(+(a.wait || 900));
for (const c of a.click || []) { await p.click(c); await p.waitForTimeout(700); }
if (a.full) {
  await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }));
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(700);
}
if (a.scroll) { await p.evaluate(y => scrollTo(0, y), +a.scroll); await p.waitForTimeout(400); }
await p.screenshot({ path: out, fullPage: !!a.full });
console.log(errs.length ? errs.join('\n') : 'no console errors');
await b.close();
