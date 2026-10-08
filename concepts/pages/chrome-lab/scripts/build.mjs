#!/usr/bin/env node
// MONOCHROME® — CHROME LAB. Static multi-page generator. Node 22, no dependencies.
//
//   node scripts/build.mjs                      writes the site into this folder (clean folder links: /shop/, /products/<handle>/ ...)
//   node scripts/build.mjs --preview --out DIR  builds a self-contained copy into DIR where every folder link is explicit
//                                               (.../index.html), so it also works from file:// and on hosts without directory indexes
//
// Reads config.js and data/products.js (window.* scripts, evaluated in a sandbox), renders every page from src/, and writes
// index.html, shop/, gallery/, about/, shipping/, faq/, contact/, products/<handle>/ x N, 404.html, sitemap.xml, robots.txt and js/search-index.js.
// css/, js/, assets/ are hand-written and just served (or copied, in preview mode).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const PREVIEW = argv.includes('--preview');
const oi = argv.indexOf('--out');
const OUT = oi >= 0 ? path.resolve(argv[oi + 1] || '') : ROOT;
if (PREVIEW && (oi < 0 || !argv[oi + 1])) { console.error('--preview needs --out <dir>'); process.exit(1); }
if (PREVIEW && (OUT === ROOT || ROOT.startsWith(OUT + path.sep))) { console.error('--out must be a folder outside of (and not above) the site folder'); process.exit(1); }

const src = p => path.join(ROOT, 'src', p);
const imp = p => import(pathToFileURL(src(p)).href);

// ---- inputs ----------------------------------------------------------------------------------------------------------------
function windowScript(file) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return sandbox.window;
}
const cfg = { storeUrl: 'https://monochrome.com.ng', siteUrl: 'https://monochrome.com.ng', basePath: '/', ...(windowScript('config.js').MONOCHROME_CONFIG || {}) };
cfg.storeUrl = cfg.storeUrl.replace(/\/$/, '');
cfg.siteUrl = cfg.siteUrl.replace(/\/$/, '');
if (!cfg.basePath.endsWith('/')) cfg.basePath += '/';
const DATA = windowScript('data/products.js').MONOCHROME_DATA;
if (!DATA || !DATA.products || !DATA.products.length) throw new Error('data/products.js has no products');

const { derive, destinations, CAT, CAT_KEYS } = await imp('lib/store.mjs');
const { layout } = await imp('lib/layout.mjs');
const { fmt, sized } = await imp('lib/util.mjs');
const pageMods = {
  home: (await imp('pages/home.mjs')).default,
  shop: (await imp('pages/shop.mjs')).default,
  gallery: (await imp('pages/gallery.mjs')).default,
  about: (await imp('pages/about.mjs')).default,
  shipping: (await imp('pages/shipping.mjs')).default,
  faq: (await imp('pages/faq.mjs')).default,
  contact: (await imp('pages/contact.mjs')).default,
  notfound: (await imp('pages/notfound.mjs')).default,
  product: (await imp('pages/product.mjs')).default
};

const app = { ...derive(DATA), dest: destinations(DATA), cfgStore: DATA.store };

// ---- per-page context: relative root prefix and link helpers -----------------------------------------------------------------
function makeCtx(pagePath) {
  const depth = pagePath === '404.html' ? 0 : pagePath.split('/').filter(Boolean).length;
  const root = depth ? '../'.repeat(depth) : './';
  const idx = PREVIEW ? 'index.html' : '';
  const split = p => { const m = String(p).match(/^([^?#]*)(.*)$/); return [m[1], m[2]]; };
  return {
    cfg, app, root, idx, preview: PREVIEW, pagePath,
    // link to another page of this site (relative; folder links get index.html in preview mode)
    href(p = '') { let [a, b] = split(p); if (PREVIEW && (a === '' || a.endsWith('/'))) a += 'index.html'; return root + a + b; },
    asset: p => root + p,
    abs: (p = '') => `${cfg.siteUrl}/${p}`,
    store: p => `${cfg.storeUrl}${p}`
  };
}

// ---- render ------------------------------------------------------------------------------------------------------------------
const files = new Map();   // output path (relative) -> contents
function render(key, pagePath, ...args) {
  const ctx = makeCtx(pagePath);
  const page = pageMods[key](ctx, ...args);
  if (key === 'notfound' && !PREVIEW) page.baseHref = cfg.basePath;
  const out = pagePath === '404.html' ? '404.html' : path.posix.join(pagePath, 'index.html');
  files.set(out, layout(ctx, page));
  return page;
}

const pages = [];
pages.push(render('home', ''));
pages.push(render('shop', 'shop/'));
pages.push(render('gallery', 'gallery/'));
pages.push(render('about', 'about/'));
pages.push(render('shipping', 'shipping/'));
pages.push(render('faq', 'faq/'));
pages.push(render('contact', 'contact/'));
for (const x of app.items) pages.push(render('product', `products/${x.h}/`, x));
render('notfound', '404.html');

// sitemap.xml + robots.txt (always the real siteUrl)
const urls = pages.map(p => `${cfg.siteUrl}/${p.path}`);
files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
files.set('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);

// command-bar index: pages, shop categories and every piece. Paths are relative to the site root; the page script adds the root prefix.
const index = [
  ['page', 'Home', 'Start here', '', 'home arrival hero'],
  ['page', 'Shop', `All ${app.items.length} pieces`, 'shop/', 'shop archive store buy products'],
  ['page', 'Gallery', '3D tunnel of pieces', 'gallery/', 'gallery tunnel 3d showroom'],
  ['page', 'About', 'The formula', 'about/', 'about brand formula story black white chrome'],
  ['page', 'Shipping & returns', 'Worldwide, Nigeria, Canada', 'shipping/', 'shipping delivery nigeria canada worldwide returns size sizing exchange'],
  ['page', 'FAQ', 'Questions answered', 'faq/', 'faq help questions'],
  ['page', 'Contact', 'Email, Instagram, drop alerts', 'contact/', 'contact email instagram newsletter drop alerts signal'],
  ...CAT_KEYS.map(k => ['cat', CAT[k], `Shop / ${app.items.filter(x => x.t === k).length} pieces`, `shop/?c=${k}`, `shop ${k} ${CAT[k].toLowerCase()}`]),
  ...app.featured.map(x => ['piece', x.n, `${(x.type || CAT[x.t]).toString()} / ${x.avail ? fmt(x.p) : 'Sold out'}`, `products/${x.h}/`, `${x.h.replace(/-/g, ' ')} ${x.type} ${CAT[x.t]}`, x.main ? sized(x.main.src, 120) : '']),
  ['store', 'Bag', 'Opens the Monochrome store', '/cart', 'bag cart checkout']
].map(([t, n, s, u, k, i]) => ({ t, n, s, u, k, ...(i ? { i } : {}) }));
files.set('js/search-index.js', `// Generated by scripts/build.mjs. Do not edit by hand.\nwindow.MC_INDEX=${JSON.stringify(index)};\n`);

// ---- write -------------------------------------------------------------------------------------------------------------------
const GENERATED_DIRS = ['products', 'shop', 'gallery', 'about', 'shipping', 'faq', 'contact'];
if (PREVIEW) {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of ['assets', 'css', 'js', 'data']) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
  for (const f of ['config.js', 'site.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
} else {
  for (const d of GENERATED_DIRS) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
}
let bytes = 0;
for (const [rel, text] of files) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
  bytes += Buffer.byteLength(text);
}
console.log(`chrome-lab: ${files.size} files (${pages.length} pages + 404) -> ${OUT}${PREVIEW ? '  [preview: explicit index.html links]' : ''}  ${(bytes / 1024).toFixed(0)} KB`);
