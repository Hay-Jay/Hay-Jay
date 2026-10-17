// node tools/parity.mjs [--only home,shop] [--w 1440 --h 900] — theme (dev server) vs prototype preview build: full-page pixel diff.
// Prototype preview build (photos bundled): $PROTO_PREVIEW, default scratchpad pg-classified. Needs `node tools/serve.mjs` on :9292.
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { parseArgs, CACHE_DIR } from './lib/util.mjs';

const a = parseArgs(process.argv.slice(2));
const PROTO = process.env.PROTO_PREVIEW || '/tmp/claude-0/-home-user-Hay-Jay/a51d8e86-d332-53ce-afbb-5d7b804e2b7b/scratchpad/pg-classified';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); let f = join(PROTO, u); if (u.endsWith('/')) f = join(f, 'index.html'); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(9393);
const PAIRS = [
  ['home', '/', '/index.html'], ['shop', '/collections/all', '/shop/index.html'],
  ['product-sweat', '/products/monochrome-sweatshirt', '/products/monochrome-sweatshirt/index.html'],
  ['product-gift', '/products/monochrome-gift-cards', '/products/monochrome-gift-cards/index.html'],
  ['product-mag', '/products/monochrome-magazine-the-vision-issue-print', '/products/monochrome-magazine-the-vision-issue-print/index.html'],
  ['product-ring', '/products/royal-black', '/products/royal-black/index.html'],
  ['lookbook', '/pages/lookbook', '/lookbook/index.html'], ['about', '/pages/about', '/about/index.html'],
  ['shipping', '/pages/shipping', '/shipping/index.html'], ['faq', '/pages/faq', '/faq/index.html'], ['contact', '/pages/contact', '/contact/index.html'], ['404', '/nope', '/404.html']
];
const only = a.only ? String(a.only).split(',') : null;
const W = +(a.w || 1440), H = +(a.h || 900);
mkdirSync(join(CACHE_DIR, 'parity'), { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function shot(base, path, hide = '') {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce', hasTouch: W < 700, isMobile: W < 700 });
  const p = await ctx.newPage();
  await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(1200);
  if (hide) await p.addStyleTag({ content: hide });
  await p.evaluate(() => { document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }); document.querySelectorAll('[data-clock]').forEach(e => { e.textContent = '00:00:00'; }); });
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } scrollTo(0, 0); });
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelectorAll('[data-clock]').forEach(e => { e.textContent = '00:00:00'; }); });
  const buf = await p.screenshot({ fullPage: true }); await ctx.close(); return PNG.sync.read(buf);
}
for (const [name, tp, pp] of PAIRS) {
  if (only && !only.includes(name)) continue;
  const t = await shot('http://localhost:' + (a.port || 9292), tp, '.pl-qtyrow, .pl-pay, #message { display: none !important; }'), q = await shot('http://localhost:9393', pp);
  const w = Math.max(t.width, q.width), h = Math.max(t.height, q.height);
  const pad = img => { const o = new PNG({ width: w, height: h }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0); return o; };
  const A = pad(t), B = pad(q), D = new PNG({ width: w, height: h });
  const n = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.12 });
  writeFileSync(join(CACHE_DIR, 'parity', `${name}-${W}-diff.png`), PNG.sync.write(D));
  writeFileSync(join(CACHE_DIR, 'parity', `${name}-${W}-theme.png`), PNG.sync.write(t));
  writeFileSync(join(CACHE_DIR, 'parity', `${name}-${W}-proto.png`), PNG.sync.write(q));
  console.log(`${name.padEnd(14)} theme ${t.width}x${t.height}  proto ${q.width}x${q.height}  diff ${(100 * n / (w * h)).toFixed(3)}%${t.height !== q.height ? '  HEIGHT DIFFERS by ' + (t.height - q.height) : ''}`);
}
await b.close(); srv.close();
