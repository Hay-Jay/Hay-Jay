#!/usr/bin/env node
// MONOCHROME® — CLASSIFIED (multi-page). Static site generator. Node 22, no dependencies.
// A work of fiction: THE MONOCHROME BUREAU / DIVISION OF WEARABLES is an invented agency for a clothing brand.
//
//   node scripts/build.mjs                  generate the pages next to src/ (clean folder URLs)
//   node scripts/build.mjs <dir>            same, but write into <dir> (static assets are copied there)
//   node scripts/build.mjs --preview --out <dir>
//                                           preview build: every folder link is explicit (.../index.html),
//                                           so it works from file:// and on hosts without directory indexes
//   --base-path /sub/                       only used by 404.html (see README): where the site root lives
//
// Reads  : config.js, data/products.js, src/partials/*.html, src/pages/*.html
// Writes : index.html, shop/, products/<handle>/, lookbook/, about/, shipping/, faq/, contact/,
//          404.html, sitemap.xml, robots.txt
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

// ---- arguments ---------------------------------------------------------------------------------
const argv = process.argv.slice(2);
let preview = false, outArg = null, basePath = '/';
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--preview') preview = true;
  else if (a === '--out') outArg = argv[++i];
  else if (a === '--base-path') basePath = argv[++i];
  else if (!a.startsWith('--')) outArg = a;
}
if (!basePath.startsWith('/')) basePath = '/' + basePath;
if (!basePath.endsWith('/')) basePath += '/';
const OUT = outArg ? resolve(process.cwd(), outArg) : ROOT;
const IDX = preview ? 'index.html' : '';

// ---- config + data -----------------------------------------------------------------------------
const evalWindow = file => { const w = {}; vm.runInNewContext(readFileSync(file, 'utf8'), { window: w }); return w; };
const CFG = evalWindow(join(ROOT, 'config.js')).MONOCHROME_CONFIG || {};
const STORE = String(CFG.storeUrl || 'https://monochrome.com.ng').replace(/\/$/, '');
const SITE = String(CFG.siteUrl || 'https://monochrome.com.ng').replace(/\/$/, '');
const DATA = evalWindow(join(ROOT, 'data', 'products.js')).MONOCHROME_DATA;
const STORE_HOST = (() => { try { return new URL(STORE).host; } catch { return STORE; } })();

// ---- helpers -----------------------------------------------------------------------------------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = v => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(v);
const pad = n => String(n).padStart(2, '0');
const pad3 = n => String(n).padStart(3, '0');
const safeUrl = u => { try { return encodeURI(decodeURI(u)); } catch { return u; } };
const sized = (src, w) => !/^https?:/.test(src) ? src : `${safeUrl(src)}${src.includes('?') ? '&' : '?'}width=${w}`;
const read = (...p) => readFileSync(join(SRC, ...p), 'utf8');
const trunc = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,.;:-]+\S*$/, '') + '…'; };
const jsonLd = obj => `<script type="application/ld+json">\n${JSON.stringify(obj).replace(/</g, '\\u003c')}\n</script>`;

const CAT = { top: 'Top', bottom: 'Bottom', accessory: 'Hardware', gift: 'Gift card', print: 'Print' };
const CAT_PLURAL = { top: 'Tops', bottom: 'Bottoms', accessory: 'Hardware', gift: 'Gift cards', print: 'Print' };

// ---- the product model ---------------------------------------------------------------------------
const HERO = { 'monochrome-sweatshirt': 4 }; // its first frame is half black fabric
// THE HOMEPAGE PICTURE: swap the product handle and the photo number (0 = the product's first photo) to change it
const HOME_COVER = { handle: 'white-monochrome-jersey', image: 0 };
const items = DATA.products.map(p => {
  const imgs = p.images.slice();
  return {
    d: p, h: p.handle, n: p.title.trim(), p: p.price, pMax: p.priceMax, t: p.category, avail: p.available,
    sizes: (p.sizes || []).map(s => String(s).toUpperCase()), imgs,
    hero: Math.min(HERO[p.handle] || 0, Math.max(0, imgs.length - 1)),
    isNew: (p.collections || []).includes('new-arrivals'),
    rank: (p.collections || []).includes('new-arrivals') ? 2 : (p.collections || []).length ? 1 : 0,
    pub: Date.parse(p.publishedAt) || 0
  };
}).sort((a, b) => b.avail - a.avail);
const FEATURED = (a, b) => b.avail - a.avail || b.rank - a.rank || b.p - a.p;
const featuredOrder = items.slice().sort(FEATURED);
featuredOrder.forEach((x, i) => { x.no = i + 1; });
const byHandle = h => items.find(x => x.h === h);
const priceText = x => (x.pMax > x.p ? 'From ' : '') + fmt(x.p);
const sizeText = x => x.sizes.length ? x.sizes.slice(0, 7).join(' ') : (x.t === 'gift' ? 'Choose amount' : x.t === 'print' ? 'Single issue' : 'One size');
const zoomy = x => x.t === 'accessory' && /ring/i.test(x.h);
const leadImg = x => x.imgs[x.hero];
const fileNo = x => 'MC-' + pad3(x.no);
const nPieces = items.length;
const countsBy = t => items.filter(x => x.t === t).length;

// ---- countries -----------------------------------------------------------------------------------
const REGION = {
  NG: 'Africa', CA: 'North America', US: 'North America',
  AE: 'Middle East', IL: 'Middle East',
  AU: 'Oceania', NZ: 'Oceania',
  HK: 'Asia', JP: 'Asia', KR: 'Asia', MY: 'Asia', SG: 'Asia'
};
const regionOf = c => REGION[c] || 'Europe';
const dn = new Intl.DisplayNames(['en'], { type: 'region' });
const shipsTo = (DATA.store.shipsTo || []).map(c => ({ code: c, name: dn.of(c) || c, region: regionOf(c) }));
const countryNames = [...shipsTo.filter(c => c.code === 'NG'), ...shipsTo.filter(c => c.code === 'CA'), ...shipsTo.filter(c => c.code !== 'NG' && c.code !== 'CA').sort((a, b) => a.name.localeCompare(b.name))].map(c => c.name);
const nCountries = shipsTo.length;
const shipsNG = shipsTo.some(c => c.code === 'NG');
// the copy names Nigeria and Canada as delivery countries: it may only say so while the store data says so
for (const code of ['NG', 'CA']) if (!shipsTo.some(c => c.code === code)) throw new Error(`data.store.shipsTo no longer lists ${code}: review the pages that name Nigeria and Canada before building`);

// ---- pages ---------------------------------------------------------------------------------------
// level = how many rungs of the (fictional) clearance ladder the page asks for
const PAGES = [
  { key: 'home', path: '', folio: 1, nav: 'Briefing', doc: 'Mission briefing', level: 5 },
  { key: 'shop', path: 'shop/', folio: 2, nav: 'Assets', doc: 'Asset register', level: 3 },
  { key: 'lookbook', path: 'lookbook/', folio: 3, nav: 'Evidence', doc: 'Surveillance exhibits', level: 4 },
  { key: 'about', path: 'about/', folio: 4, nav: 'Mission', doc: 'Mission and rules of engagement', level: 5 },
  { key: 'shipping', path: 'shipping/', folio: 5, nav: 'Routes', doc: 'Extraction routes', level: 3 },
  { key: 'faq', path: 'faq/', folio: 6, nav: 'Debrief', doc: 'Debrief transcript', level: 2 },
  { key: 'contact', path: 'contact/', folio: 7, nav: 'Report in', doc: 'Secure channel', level: 1 }
];
const pageByKey = Object.fromEntries(PAGES.map(p => [p.key, p]));
const N_PAGES = PAGES.length;
const docNo = p => 'MC-' + (100 + p.folio);

// ---- generated decoration (all inline SVG / markup, no images) -----------------------------------------------
const seedRnd = seed => { let s = 7; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
function barcode(seed, w = 160, h = 28) {
  const rnd = seedRnd(seed); let x = 0, d = '';
  while (x < w - 4) { const bw = 1 + Math.floor(rnd() * 3.4), gap = 1 + Math.floor(rnd() * 2.6); if (x + bw > w) break; d += `M${x} 0h${bw}v${h}h-${bw}z`; x += bw + gap; }
  return `<svg class="bc" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}
const ladder = n => `<span class="ladder" role="img" aria-label="Clearance level ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;
const camTime = n => `${pad(1 + (n * 7) % 5)}:${pad((n * 13) % 60)}:${pad((n * 29) % 60)}`;
const camCoord = n => `N ${(12 + ((n * 37) % 180) / 10).toFixed(4)} W ${(135 + ((n * 53) % 150) / 10).toFixed(4)}`;
const cam = (n, { ex = '', rec = true, live = false } = {}) => `<span class="cam" aria-hidden="true"><i class="cam-x"></i><span class="cam-tl">${rec ? '<b class="rec"></b>' : ''}CAM ${pad(n)}</span><span class="cam-tr"${live ? ' data-clock' : ''}>${camTime(n)}</span><span class="cam-bl">${camCoord(n)}</span><span class="cam-br">${esc(ex)}</span></span>`;
function fileHead({ file, doc, page, level, extra = '' }) {
  return `<div class="filehead mono"><span class="fh-c"><b>File no.</b>${esc(file)}</span><span class="fh-c"><b>Document</b>${esc(doc)}</span><span class="fh-c"><b>Page</b>${page} of ${N_PAGES}${extra}</span><span class="fh-c fh-clr"><b>Clearance</b>${ladder(level)}<em>L${level}</em></span><span class="fh-bc">${barcode(file)}</span></div>`;
}
const MARK = 'Top secret // Eyes only // Monochrome Bureau';

// ---- template engine -------------------------------------------------------------------------------
// {{name}} -> ctx[name]; {{href:shop/?c=top}} -> relative page link; {{asset:css/base.css}} -> relative file link;
// {{> partial}} -> src/partials/partial.html
function makeCtx(path, extra = {}) {
  const depth = path.split('/').filter(Boolean).length;
  const root = '../'.repeat(depth);
  const href = (p = '') => {
    const m = String(p).match(/^([^?#]*)(.*)$/);
    const base = m[1], rest = m[2];
    if (base === '' || base.endsWith('/')) return (root + base + IDX + rest) || './';
    return root + base + rest;
  };
  return { root, idx: IDX, depth, href, asset: p => root + p, store: STORE, ...extra };
}
function tpl(str, ctx) {
  str = str.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => tpl(read('partials', n + '.html'), ctx));
  return str.replace(/\{\{([\w-]+)(?::([^}]*))?\}\}/g, (all, name, arg) => {
    if (arg !== undefined) {
      if (name === 'href') return esc(ctx.href(arg));
      if (name === 'asset') return esc(ctx.asset(arg));
      throw new Error(`unknown template function ${name}`);
    }
    if (!(name in ctx)) throw new Error(`template variable {{${name}}} is not defined`);
    return ctx[name];
  });
}

// ---- navigation fragments ------------------------------------------------------------------------------
const NAV_BAR = ['home', 'shop', 'lookbook', 'about', 'shipping', 'faq', 'contact'];
function navFragments(ctx, current) {
  const bar = NAV_BAR.map(k => { const p = pageByKey[k]; return `<a class="tab" href="${esc(ctx.href(p.path))}"${current === p.key ? ' aria-current="page"' : ''}><span class="tab-no" aria-hidden="true">${pad(p.folio)}</span><span class="tab-t">${p.nav}</span></a>`; }).join('');
  const menu = PAGES.map(p => `<li><a href="${esc(ctx.href(p.path))}"${current === p.key ? ' aria-current="page"' : ''}><span class="mono">${pad(p.folio)}</span><b>${p.nav}</b><i class="mono">${p.doc}</i></a></li>`).join('');
  const foot = PAGES.map(p => `<a href="${esc(ctx.href(p.path))}"${current === p.key ? ' aria-current="page"' : ''}>${p.nav}</a>`).join('');
  return { nav_bar: bar, nav_menu: menu, nav_foot: foot };
}

// ---- image fragments ---------------------------------------------------------------------------------------
function imgTag(im, { alt, cls = 'ph', widths = [480, 720, 1080], sizes = '100vw', eager = false, id = '' }) {
  const mid = widths[Math.floor(widths.length / 2)];
  return `<img class="${cls}"${id}${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" draggable="false" src="${esc(sized(im.src, mid))}" srcset="${widths.map(w => `${esc(sized(im.src, w))} ${w}w`).join(', ')}" sizes="${sizes}" width="${im.w || 1000}" height="${im.h || 1000}" alt="${esc(alt)}">`;
}
const tilt = n => `--rot:${(((n * 7) % 9) - 4) * 0.28}deg`;

// one asset card (register photo sheet, home picks, related assets)
function card(ctx, x, { i = 0, sizes = '(min-width:1500px) 20vw, (min-width:900px) 25vw, (min-width:700px) 33vw, 50vw', feat = false, data = false, widths = [360, 540, 720, 1080], pic = null } = {}) {
  const im = pic ?? leadImg(x);
  const attrs = data ? ` data-h="${esc(x.h)}" data-n="${esc((x.n + ' ' + (x.d.type || '') + ' ' + CAT_PLURAL[x.t] + ' ' + fileNo(x)).toLowerCase())}" data-cat="${x.t}" data-p="${x.p}" data-pub="${x.pub}" data-rank="${x.rank}" data-av="${x.avail ? 1 : 0}" data-no="${x.no}" data-f="${featuredOrder.indexOf(x)}"` : '';
  return `<a class="card${feat ? ' feat' : ''}${x.avail ? '' : ' sold'}${x.isNew ? ' isnew' : ''}" style="--i:${Math.min(i, 14)};${tilt(x.no)}"${attrs} href="${esc(ctx.href('products/' + x.h + '/'))}">
  <span class="card-hd mono" aria-hidden="true"><span>${fileNo(x)}</span><span>${x.isNew ? 'New asset' : 'Asset'}</span></span>
  <div class="xp${zoomy(x) ? ' zoom' : ''}">${imgTag(im, { alt: x.n, sizes, widths })}${x.avail ? '' : '<span class="stamp white sm" style="--r:-11deg" aria-hidden="true">Out of stock</span>'}</div>
  <div class="cap"><span class="no mono">${fileNo(x)}</span><b>${esc(x.n)}</b><span class="pr">${priceText(x)} <small>CAD</small></span><span class="sz">${esc(sizeText(x))}</span>${x.avail ? '' : '<span class="st">Sold out</span>'}</div>
</a>`;
}

// ---- the magazine (a print product: featured on the briefing, offered in a pop-up, listed in the register) ----------------------
const MAG = items.find(x => x.t === 'print' && x.avail) || null;
const magFacts = x => {
  const t = String(x.d.description || '');
  const m = t.match(/Volume\s+(\d+)\s*[·•.\-]\s*Issue\s+(\d+)\s*[·•.\-]\s*(\d+)\s+pages/i);
  const blurb = t.split(/Volume\s+\d+/i)[0].replace(/\s+/g, ' ').trim();
  return { vol: m ? m[1] : '', issue: m ? m[2] : '', pages: m ? m[3] : '', blurb };
};
const magLine = f => ['Print', f.vol && `Vol. ${f.vol}`, f.issue && `Issue ${f.issue}`, f.pages && `${f.pages} pages`].filter(Boolean).join(' — ');
const magVariant = x => x.d.variants.find(v => v.available) || x.d.variants[0];
const magCart = x => `${STORE}/cart/${magVariant(x).id}:1`;
function magSection(ctx) {
  if (!MAG) return '';
  const f = magFacts(MAG), im = leadImg(MAG), page = ctx.href('products/' + MAG.h + '/');
  return `  <!-- INCOMING INTEL: the magazine -------------------------------------------------------------- -->
  <section class="spread dark mag" id="vision" aria-labelledby="magH">
    <div class="wrap mag-grid">
      <div class="mag-copy">
        <p class="kick mono"><b class="rec" aria-hidden="true"></b> Incoming transmission</p>
        <h2 class="h2 rv" id="magH">${esc(MAG.n.replace(/^MONOCHROME Magazine\s*[—-]\s*/i, '').replace(/\s*\(Print\)\s*$/i, ''))}</h2>
        <p class="mag-sub mono">${esc(magLine(f))}</p>
        <p class="mag-blurb rv">${esc(f.blurb)}</p>
        <p class="mag-cta">
          <a class="btn" data-store="/cart/${magVariant(MAG).id}:1" href="${esc(magCart(MAG))}">Requisition a copy<i class="arr" aria-hidden="true"></i></a>
          <a class="btn ghost" href="${esc(page)}">Open the file</a>
        </p>
        <p class="mag-note mono"><span>${fmt(MAG.p)} CAD</span><span>Printed copy</span><span>Delivered to ${nCountries} countries${shipsNG ? ', Nigeria included' : ''}. Rate calculated at checkout</span></p>
      </div>
      <figure class="mag-fig">
        <a class="mag-cover" href="${esc(page)}" aria-label="Open ${esc(MAG.n)}">
          <span class="mag-clip clip" aria-hidden="true"></span>
          ${imgTag(im, { alt: `${MAG.n}, front cover`, cls: 'mag-img', sizes: '(min-width:900px) 34vw, 78vw', widths: [480, 720, 1080] })}
          <span class="stamp white sm mag-stamp" style="--r:-9deg" aria-hidden="true">New intel</span>
        </a>
        <figcaption class="mono">Exhibit M / ${fileNo(MAG)}. The one file we declassified in full colour.</figcaption>
      </figure>
    </div>
  </section>
`;
}
// the pop-up offer: markup on a few pages, timing and memory in core.js (it never shows without JavaScript)
const POPUP_KEYS = new Set(['home', 'shop', 'lookbook', 'about', 'shipping', 'faq']);
function magPopup(ctx, key) {
  if (!MAG || !POPUP_KEYS.has(key)) return '';
  const f = magFacts(MAG), im = leadImg(MAG), page = ctx.href('products/' + MAG.h + '/');
  const short = f.blurb.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  return `<aside class="magpop" id="magpop" role="dialog" aria-modal="true" aria-labelledby="magpopT" data-key="${esc(MAG.h)}" hidden>
  <div class="mp-back" data-close></div>
  <div class="mp-card paper" tabindex="-1">
    <button class="mp-x mono" type="button" data-close aria-label="Close this message">Close<span>Esc</span></button>
    <p class="mp-kick mono"><b class="rec" aria-hidden="true"></b> Incoming transmission — new intel</p>
    <div class="mp-body">
      <a class="mp-cover" href="${esc(page)}" tabindex="-1" aria-hidden="true">${imgTag(im, { alt: '', cls: 'mp-img', sizes: '(min-width:700px) 260px, 38vw', widths: [260, 400, 640] })}</a>
      <div class="mp-copy">
        <h2 class="mp-t" id="magpopT">${esc(MAG.n.replace(/^MONOCHROME Magazine\s*[—-]\s*/i, '').replace(/\s*\(Print\)\s*$/i, ''))}</h2>
        <p class="mp-meta mono">${esc(magLine(f))}</p>
        <p class="mp-line">${esc(short)}</p>
        <p class="mp-price mono"><b>${fmt(MAG.p)}</b> CAD <span>Printed copy</span></p>
        <p class="mp-cta">
          <a class="btn" data-store="/cart/${magVariant(MAG).id}:1" href="${esc(magCart(MAG))}">Order your copy<i class="arr" aria-hidden="true"></i></a>
          <a class="btn ghost" href="${esc(page)}">Read the brief</a>
        </p>
        <button class="mp-later mono" type="button" data-close>Not now</button>
      </div>
    </div>
  </div>
</aside>`;
}

// phrases the search boxes type out on their own: only phrases that really match something in the register
const HINT_POOL = ['acid wash', 'hoodie', 'necklace', 'white jersey', 'cargo shorts', 'signet ring', 'magazine', 'black jersey', 'chain', 'gift card', 'sweatshirt', 'trinity ring'];
const hintHay = items.map(x => `${x.n} ${x.d.type || ''} ${CAT_PLURAL[x.t]}`.toLowerCase().replace(/-/g, ' '));
const SEARCH_HINTS = HINT_POOL.filter(h => hintHay.some(t => h.split(' ').every(w => t.includes(w))));
const hintsAttr = esc(SEARCH_HINTS.join('|'));

// ---- page: common context -----------------------------------------------------------------------------------
const SITE_NAME = 'MONOCHROME®';
function pageContext(path, key, meta, extra = {}) {
  const ctx = makeCtx(path);
  const canonical = `${SITE}/${path}`;
  const og = meta.ogImage || `${SITE}/assets/emblem.webp`;
  const pg = pageByKey[meta.current ?? key];
  const level = meta.level ?? (pg ? pg.level : 0);
  const folio = meta.folio ?? (pg ? pg.folio : 0);
  Object.assign(ctx, navFragments(ctx, meta.current ?? key), {
    key,
    title: esc(meta.title),
    description: esc(meta.description),
    canonical: esc(canonical),
    robots: meta.noindex ? '<meta name="robots" content="noindex">' : '',
    og_type: meta.ogType || 'website',
    og_image: esc(og),
    twitter_card: meta.ogImage ? 'summary_large_image' : 'summary',
    css: meta.css || key,
    css_href: esc(ctx.asset('css/' + (meta.css || key) + '.css')),
    head_extra: meta.headExtra || '',
    jsonld: (meta.jsonld || []).map(jsonLd).join('\n'),
    body_class: `pg-${key}`,
    page_js: meta.js ? `<script src="${esc(ctx.asset('js/' + meta.js + '.js'))}" defer></script>` : '',
    folio: String(folio || '—'),
    pages_total: String(N_PAGES),
    level: String(level),
    ladder_html: ladder(level),
    mark: MARK,
    filehead: meta.fh ? fileHead({ level, page: folio, ...meta.fh }) : '',
    foot_file: meta.footFile || (pg ? docNo(pg) : 'MC-404'),
    year: String(new Date().getFullYear()),
    nav_home_current: key === 'home' ? ' aria-current="page"' : '',
    store_cart: esc(STORE + '/cart'),
    store_url: esc(STORE),
    store_host: esc(STORE_HOST),
    base_path: esc(basePath),
    countries: String(nCountries),
    pieces: String(nPieces),
    // font preloads are CORS requests, which browsers refuse on file:// - the preview build skips them
    font_preload: preview ? '' : ['BigShouldersDisplay-normal-100-900-latin', 'CourierPrime-normal-400-latin', 'StardosStencil-normal-700-latin'].map(f => `<link rel="preload" href="${esc(ctx.asset('assets/fonts/' + f + '.woff2'))}" as="font" type="font/woff2" crossorigin>`).join('\n'),
    foot_ticker: tickerHtml(['Delivering to', ...countryNames]),
    foot_barcode: barcode((pg ? docNo(pg) : 'MC-404') + 'foot', 220, 34),
    news_action: esc(STORE + '/contact#contact_form'),
    mag_popup: meta.noPopup ? '' : magPopup(ctx, key),
    search_hints: hintsAttr,
    ...extra
  });
  return ctx;
}

function tickerHtml(words, cls = '') {
  return `<div class="ticker${cls ? ' ' + cls : ''}" aria-hidden="true"><div class="ticker-t" data-ticker><div class="tk">${words.map(w => `<span>${esc(w)}</span>`).join('')}</div></div></div>`;
}

// the radar scope: a stylised distribution scope (not a map), with the two field offices as blips
function radar() {
  const ticks = Array.from({ length: 72 }, (_, i) => { const a = i * 5, long = i % 6 === 0; return `<line x1="200" y1="${long ? 6 : 10}" x2="200" y2="${long ? 20 : 16}" transform="rotate(${a} 200 200)"/>`; }).join('');
  const rr = seedRnd('radar-dots');
  const dots = Array.from({ length: 70 }, () => { const a = rr() * Math.PI * 2, d = 30 + Math.sqrt(rr()) * 150; return `<circle cx="${(200 + Math.cos(a) * d).toFixed(1)}" cy="${(200 + Math.sin(a) * d).toFixed(1)}" r="${(0.9 + rr() * 1.3).toFixed(1)}"/>`; }).join('');
  return `<div class="radar" aria-hidden="true">
  <svg viewBox="0 0 400 400" focusable="false"><g class="rd-ring"><circle cx="200" cy="200" r="190"/><circle cx="200" cy="200" r="142"/><circle cx="200" cy="200" r="95"/><circle cx="200" cy="200" r="48"/></g><g class="rd-axis"><path d="M200 6V394M6 200H394"/><path d="M63 63 337 337M337 63 63 337" class="rd-diag"/></g><g class="rd-tick">${ticks}</g><g class="rd-dots">${dots}</g><g class="rd-lbl"><text x="200" y="40" text-anchor="middle">N</text><text x="368" y="205" text-anchor="middle">E</text><text x="200" y="372" text-anchor="middle">S</text><text x="32" y="205" text-anchor="middle">W</text></g></svg>
  <i class="rd-sweep"></i>
  <span class="blip b-ng"><b>NG</b><em>Field office</em></span>
  <span class="blip b-ca"><b>CA</b><em>Home base</em></span>
</div>`;
}

const written = [];
function emit(path, ctx, body, file = 'index.html', post = h => h) {
  const html = post(tpl(read('partials', 'layout.html'), { ...ctx, body: '\u0000BODY\u0000' }).replace('\u0000BODY\u0000', () => body));
  const dir = join(OUT, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), html);
  written.push(join(path, file));
}

// ---- reset previously generated output ------------------------------------------------------------------------
for (const p of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'products', 'shop', 'lookbook', 'about', 'shipping', 'faq', 'contact']) rmSync(join(OUT, p), { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
if (OUT !== ROOT) {
  for (const d of ['assets', 'css', 'js', 'data']) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });
  for (const f of ['config.js', 'site.webmanifest', 'netlify.toml']) if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
}

// ===================================================================================================================
// HOME — the classified mission briefing
// ===================================================================================================================
{
  const key = 'home', ctx0 = makeCtx('');
  const cover = byHandle(HOME_COVER.handle) || byHandle('white-monochrome-jersey') || items[0];
  const coverIm = cover.imgs[HOME_COVER.image] || cover.imgs[0];
  const PICKS = [['black-monochrome-jersey', 3], ['acid-washed-monochrome-hoodie', 5], ['monochrome-cargo-shorts-black', 0], ['monochrome-pants-chain', 1], ['royal-black', 0]]
    .map(([h, i]) => ({ x: byHandle(h), i })).filter(p => p.x);
  const pickCards = PICKS.map(({ x, i }, n) => card(ctx0, x, { i: n, pic: x.imgs[Math.min(i, x.imgs.length - 1)], sizes: '(min-width:1100px) 19vw, (min-width:700px) 30vw, 60vw' })).join('\n');
  const meta = {
    title: 'OPERATION: WEAR THE UNKNOWN — Mission briefing — MONOCHROME® Bureau',
    description: `Operation: Wear the Unknown. MONOCHROME® Division of Wearables issues black, white and chrome clothing, rings and chains in small runs. ${nPieces} assets in CAD, delivered to ${nCountries} countries including Nigeria and Canada.`,
    css: 'home', js: null, ogImage: sized(coverIm.src, 1200),
    fh: { file: docNo(pageByKey.home), doc: 'Mission briefing' },
    jsonld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'MONOCHROME', url: SITE + '/', logo: SITE + '/assets/emblem.webp', sameAs: ['https://www.instagram.com/monochrome.ca/'], email: 'info.mccanada@gmail.com' },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' }]
  };
  const price = (() => { const v = items.filter(x => x.t !== 'gift').map(x => x.p), n = x => Number.isInteger(x) ? String(x) : x.toFixed(2); return `CAD ${n(Math.min(...v))} – ${n(Math.max(...v))}`; })();
  const ctx = pageContext('', key, meta, {
    cover_href: esc(ctx0.href('products/' + cover.h + '/')),
    cover_name: esc(cover.n),
    cover_price: fmt(cover.p),
    cover_file: fileNo(cover),
    cover_img: imgTag(coverIm, { alt: `${cover.n}, photograph`, sizes: '(min-width:900px) 40vw, 80vw', widths: [640, 960, 1280, 1800], eager: true }),
    cover_cam: cam(1, { ex: 'Exhibit 01', live: true }),
    pick_cards: pickCards,
    mag_section: magSection(ctx0),
    n_tops: String(countsBy('top')), n_bottoms: String(countsBy('bottom')), n_hardware: String(countsBy('accessory')), n_print: String(countsBy('print')),
    ticker_cover: tickerHtml(['Wear the unknown', 'Do not cross', 'Operation: Wear the Unknown', 'Black / white / chrome', ...(MAG ? ['New intel: the Vision Issue'] : []), `${nPieces} assets on file`, 'Prices in CAD'], 'hazard'),
    radar: radar(),
    price_span: price,
    bc_cover: barcode('MC-101cover', 200, 34)
  });
  emit('', ctx, tpl(read('pages', 'home.html'), ctx));
}

// ===================================================================================================================
// SHOP — the asset register
// ===================================================================================================================
{
  const key = 'shop', ctx0 = makeCtx('shop/');
  const rows = featuredOrder.map((x, i) => {
    const im = leadImg(x);
    return `<li class="trow${x.avail ? '' : ' sold'}" style="--i:${Math.min(i, 14)}" data-h="${esc(x.h)}" data-n="${esc((x.n + ' ' + (x.d.type || '') + ' ' + CAT_PLURAL[x.t] + ' ' + fileNo(x)).toLowerCase())}" data-cat="${x.t}" data-p="${x.p}" data-pub="${x.pub}" data-rank="${x.rank}" data-av="${x.avail ? 1 : 0}" data-no="${x.no}" data-f="${i}">
  <a class="trow-a" href="${esc(ctx0.href('products/' + x.h + '/'))}" data-img="${esc(safeUrl(im.src))}" data-zoom="${zoomy(x) ? 1 : 0}" data-cap="${fileNo(x)} — ${CAT[x.t]} — ${esc(priceText(x))} CAD${x.avail ? '' : ' — Sold out'}" data-sizes="${esc(sizeText(x))}" data-cat-label="${CAT[x.t]}" data-price="${esc(priceText(x))}" data-file="${fileNo(x)}">
    <span class="t-no mono">${fileNo(x)}</span>
    <span class="t-name">${esc(x.n)}${x.isNew ? '<em>new</em>' : ''}</span>
    <span class="t-meta mono"><span class="t-cat">${CAT[x.t]}</span><span class="t-sz">${esc(sizeText(x))}</span>${x.avail ? '<span class="t-ok">Approved</span>' : '<span class="t-st">Sold out</span>'}</span>
    <span class="t-price mono${x.avail ? '' : ' t-sold'}">${priceText(x)}<small>CAD</small></span>
  </a>
</li>`;
  }).join('\n');
  const feat = featuredOrder.length >= 8;
  const cards = featuredOrder.map((x, i) => card(ctx0, x, { i, feat: feat && i === 0, data: true, widths: [360, 540, 720, 1080, 1400], sizes: i === 0 ? '(min-width:700px) 50vw, 100vw' : undefined })).join('\n');
  const filt = (f, label) => `<button class="filter${f === 'all' ? ' on' : ''}" data-filter="${f}" type="button" aria-pressed="${f === 'all'}">${label}<sup>${f === 'all' ? nPieces : countsBy(f)}</sup></button>`;
  const meta = {
    title: `Asset Register — all ${nPieces} assets on file — MONOCHROME® Bureau`,
    description: `The MONOCHROME® asset register: every item of field equipment on file. Tops, bottoms, rings, chains, necklaces and gift cards in black, white and chrome. Filter by category, sort by price, search by name. Prices in CAD.`,
    css: 'shop', js: 'shop',
    fh: { file: docNo(pageByKey.shop), doc: 'Asset register', extra: ` — ${nPieces} assets` },
    headExtra: `<script>(function(){try{var q=new URLSearchParams(location.search),c=q.get('c'),d=document.documentElement;if(/^(top|bottom|accessory|gift|print)$/.test(c))d.dataset.c=c;var v=q.get('v');if(v!=='sheet'&&v!=='index')v=matchMedia('(hover: none), (max-width: 699px)').matches?'sheet':'index';d.dataset.view=v}catch(e){}})()</script>`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Asset Register — all assets', url: `${SITE}/shop/`, mainEntity: { '@type': 'ItemList', numberOfItems: nPieces, itemListElement: featuredOrder.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/products/${x.h}/`, name: x.n })) } }]
  };
  const ctx = pageContext('shop/', key, meta, {
    shop_rows: rows, shop_cards: cards, total: String(nPieces),
    filters: [filt('all', 'All assets'), filt('top', 'Tops'), filt('bottom', 'Bottoms'), filt('accessory', 'Hardware'), filt('gift', 'Gift cards'), filt('print', 'Print')].join('\n        '),
    in_stock: String(items.filter(x => x.avail).length)
  });
  emit('shop/', ctx, tpl(read('pages', 'shop.html'), ctx));
}

// ===================================================================================================================
// PRODUCT pages — one field-equipment dossier per handle, same path as the Shopify store
// ===================================================================================================================
function relatedFor(x) {
  const same = featuredOrder.filter(y => y !== x && y.t === x.t);
  const rest = featuredOrder.filter(y => y !== x && y.t !== x.t);
  const pick = [...same.filter(y => y.avail), ...rest.filter(y => y.avail), ...same.filter(y => !y.avail), ...rest.filter(y => !y.avail)];
  return pick.slice(0, 4);
}
const hasChoice = p => p.options.length && !(p.options.length === 1 && p.options[0].values.length === 1 && /default/i.test(p.options[0].values[0]));
const AV = 'https://schema.org/InStock', OOS = 'https://schema.org/OutOfStock';

for (const x of items) {
  const p = x.d, path = `products/${x.h}/`, ctx0 = makeCtx(path), key = 'product';
  const canonical = `${SITE}/${path}`;
  const first = p.variants.find(v => v.available) || p.variants[0];
  const sel = first ? first.options.slice() : [];
  const variantAvail = (oi, val) => p.variants.some(v => v.available && v.options[oi] === val);

  // options, printed as field-size tabs
  const opts = hasChoice(p) ? p.options.map((o, oi) => {
    if (o.values.length < 2) return `<div class="opt opt-fixed"><span class="opt-name">${esc(o.name)}<b>${esc(o.values[0])}</b></span></div>`;
    return `<fieldset class="opt" data-o="${oi}"><legend class="opt-name">${esc(o.name)}<b>${esc(sel[oi] || '')}</b></legend><div class="chips">${o.values.map(val =>
      `<button type="button" class="chip${sel[oi] === val ? ' on' : ''}" data-o="${oi}" data-v="${esc(val)}" aria-pressed="${sel[oi] === val}"${variantAvail(oi, val) ? '' : ' disabled'}><i aria-hidden="true">${esc(o.name)}</i><b>${esc(val)}</b></button>`).join('')}</div></fieldset>`;
  }).join('') : '';

  // gallery (stacked and complete without JS; one photograph at a time with JS)
  const shots = x.imgs.map((im, k) => `<li class="shot${k === 0 ? ' on' : ''}" data-i="${k}"><div class="xp" style="--ar:${im.w || 1}/${im.h || 1}">${imgTag(im, { alt: `${x.n}, photograph ${k + 1} of ${x.imgs.length}`, sizes: '(min-width:900px) 56vw, 100vw', widths: [640, 960, 1280, 1800], eager: k === 0 })}</div></li>`).join('');
  const thumbs = x.imgs.length > 1 ? x.imgs.map((im, k) => `<button type="button" class="th${k === 0 ? ' on' : ''}" data-i="${k}" aria-label="Photograph ${k + 1} of ${x.imgs.length}"${k === 0 ? ' aria-current="true"' : ''}><img loading="lazy" decoding="async" draggable="false" src="${esc(sized(im.src, 160))}" width="64" height="80" alt=""><b>${pad(k + 1)}</b></button>`).join('') : '';

  const prev = featuredOrder[(x.no - 2 + nPieces) % nPieces], next = featuredOrder[x.no % nPieces];
  const turn = y => `${fileNo(y)} ${esc(y.n)}`;
  const priceNow = first ? first.price : p.price;
  const range = p.priceMax > p.price;
  const buy = x.avail
    ? `<a class="buy" id="buy" href="${esc(STORE + '/products/' + x.h)}"><span id="buyT">Requisition: buy on the store</span><i class="arr" aria-hidden="true"></i></a>`
    : `<span class="buy" id="buy" aria-disabled="true"><span id="buyT">Requisition denied: sold out</span></span>
      <a class="mono pl-alert" href="${esc(ctx0.href('contact/#subscribe'))}">Get alerts when the next drop is cleared</a>`;
  const ogImg = sized(leadImg(x).src, 1200);
  const catLabel = CAT[x.t], plural = CAT_PLURAL[x.t];
  const descText = (p.description || '').trim();
  const metaDesc = descText
    ? `${x.n}, asset ${fileNo(x)}: ${trunc(descText, 90)} ${priceText(x)} CAD. Delivered to ${nCountries} countries including Nigeria and Canada.`
    : `${x.n} by MONOCHROME®, asset ${fileNo(x)}: a ${catLabel.toLowerCase()} in black, white and chrome. ${priceText(x)} CAD. Delivered to ${nCountries} countries including Nigeria and Canada.`;
  const offer = v => ({ '@type': 'Offer', url: canonical, price: Number(v.price).toFixed(2), priceCurrency: 'CAD', availability: v.available ? AV : OOS, itemCondition: 'https://schema.org/NewCondition', sku: String(v.id), name: v.options.join(' / ') });
  const offers = p.variants.length === 1 ? offer(p.variants[0]) : p.variants.map(offer);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Product', name: x.n, description: descText || `${x.n}, a ${catLabel.toLowerCase()} from MONOCHROME®.`, sku: x.h, category: catLabel, brand: { '@type': 'Brand', name: 'MONOCHROME' }, url: canonical, image: x.imgs.slice(0, 6).map(im => sized(im.src, 1200)), offers },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Briefing', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Asset Register', item: SITE + '/shop/' },
      { '@type': 'ListItem', position: 3, name: plural, item: `${SITE}/shop/?c=${x.t}` }, { '@type': 'ListItem', position: 4, name: x.n, item: canonical }] }
  ];
  const pdata = { h: x.h, store: STORE, range, min: p.price, options: p.options.map(o => ({ name: o.name, values: o.values })), variants: p.variants.map(v => ({ id: v.id, o: v.options, p: v.price, a: v.available ? 1 : 0 })), sel };
  const rel = relatedFor(x).map((y, i) => card(ctx0, y, { i, sizes: '(min-width:1100px) 22vw, (min-width:700px) 33vw, 50vw', widths: [360, 540, 720, 1080] })).join('\n');
  const meta = {
    title: `${x.n} — Asset ${fileNo(x)} — Field-equipment dossier — MONOCHROME®`, description: metaDesc, css: 'product', js: 'product', ogType: 'product', ogImage: ogImg, jsonld: ld, current: 'shop', level: 4, footFile: fileNo(x),
    fh: { file: fileNo(x), doc: 'Asset dossier', extra: ` — sheet ${x.no} of ${nPieces}` }
  };
  const ctx = pageContext(path, key, meta, {
    h: esc(x.h), title_h: esc(x.n), no: pad3(x.no), file_no: fileNo(x), total: pad(nPieces), cat: catLabel, cat_plural: plural, cat_key: x.t,
    new_flag: x.isNew ? ' — New' : '',
    price_now: esc(fmt(priceNow)), price_cad: 'CAD', price_text: esc(range ? 'From ' + fmt(p.price) : fmt(priceNow)),
    stock_text: x.avail ? 'In stock' : 'Sold out', stock_cls: x.avail ? 'in' : 'out',
    stamp_cls: x.avail ? 'ok' : 'oos', stamp_text: x.avail ? 'Approved for field use' : 'Out of stock',
    desc: descText ? `<div class="pl-brief"><p class="mono brief-k">Briefing note</p><p class="pl-desc">${esc(descText)}</p></div>` : '',
    opts, shots, thumbs, buy, n_shots: String(x.imgs.length), n_shots_pad: pad(x.imgs.length),
    sizes_text: esc(sizeText(x)), related: rel,
    prev_href: esc(ctx0.href('products/' + prev.h + '/')), prev_label: turn(prev), next_href: esc(ctx0.href('products/' + next.h + '/')), next_label: turn(next),
    shop_cat_href: esc(ctx0.href('shop/?c=' + x.t)),
    pdata: JSON.stringify(pdata).replace(/</g, '\\u003c'),
    ship_note: `Ships to ${nCountries} countries, Nigeria and Canada included. Rate calculated at checkout.`,
    thumbs_block: thumbs ? `<div class="thumbs" id="thumbs" role="group" aria-label="Photographs">${thumbs}</div>` : '',
    count_block: `<span id="shotCount">01 / ${pad(x.imgs.length)}</span>`,
    stage_cam: cam(x.no, { ex: 'Exhibit ' + fileNo(x), live: true }),
    bc_asset: barcode(fileNo(x), 220, 40),
    store_product: esc(STORE + '/products/' + x.h),
    store_link: x.avail ? `<a class="mono link-line pl-store" href="${esc(STORE + '/products/' + x.h)}" rel="noopener">View on the store<span class="arr" aria-hidden="true"></span></a>` : ''
  });
  emit(path, ctx, tpl(read('pages', 'product.html'), ctx));
}

// ===================================================================================================================
// LOOKBOOK — the evidence wall (URL stays /lookbook/)
// ===================================================================================================================
{
  const key = 'lookbook', ctx0 = makeCtx('lookbook/');
  const LOOKS = [
    ['monochrome-acid-washed-black', 3, '4/5', 1.0, '0px'], ['white-monochrome-jersey', 2, '3/2', .72, '7vh'], ['monochrome-sweatshirt', 1, '3/4', 1.0, '-3vh'],
    ['monochrome-cargo-skirt', 1, '4/3', .62, '10vh'], ['black-monochrome-jersey', 3, '4/5', .92, '-4vh'], ['monochrome-pants-chain', 1, '1/1', .68, '8vh'],
    ['acid-washed-monochrome-hoodie', 3, '4/5', .86, '-6vh'], ['monochrome-cargo-shorts-black', 2, '3/4', .96, '2vh'], ['monochrome-sleeveless-crop-top', 2, '3/2', .6, '9vh'],
    ['monochrome-cross-necklace', 2, '4/5', .84, '-5vh'], ['monochrome-acid-washed-grey', 3, '3/2', .64, '8vh'], ['royal-black', 0, '1/1', .56, '-2vh']
  ].map(l => ({ x: byHandle(l[0]), i: l[1], ar: l[2], k: l[3], mt: l[4] })).filter(l => l.x);
  const L = n => String.fromCharCode(65 + n);
  const figs = LOOKS.map((l, n) => {
    const im = l.x.imgs[Math.min(l.i, l.x.imgs.length - 1)];
    return `<a class="lb-fig" href="${esc(ctx0.href('products/' + l.x.h + '/'))}" style="--k:${l.k};--ar:${l.ar};--mt:${l.mt};--tilt:${((n * 5) % 7 - 3) * .35}deg" aria-label="Exhibit ${L(n)}, ${esc(l.x.n)}, ${esc(priceText(l.x))} CAD. Open the asset dossier">
      <span class="lb-pin-dot" aria-hidden="true"></span>
      <span class="lb-no" aria-hidden="true">${L(n)}</span>
      <div class="xp">${imgTag(im, { alt: `${l.x.n}, surveillance exhibit ${L(n)}`, sizes: '(min-width:900px) 50vh, 70vw', widths: [480, 720, 1000, 1400], eager: n < 2 })}${cam(n + 2, { ex: 'Exhibit ' + L(n) })}</div>
      <span class="lb-cap mono" aria-hidden="true"><b>Exhibit ${L(n)}</b><span>${esc(l.x.n)}</span><span>${esc(priceText(l.x))}</span></span>
    </a>`;
  }).join('\n');
  const last = L(LOOKS.length - 1);
  const meta = {
    title: `Evidence — surveillance exhibits A to ${last} — MONOCHROME® Bureau`,
    description: `${LOOKS.length} surveillance exhibits from Operation: Wear the Unknown: jerseys, hoodies, cargo, chains and rings shot dark, shown in black and white. Open any exhibit to see the asset.`,
    css: 'lookbook', js: 'lookbook',
    fh: { file: docNo(pageByKey.lookbook), doc: 'Surveillance exhibits', extra: ` — ${LOOKS.length} exhibits` },
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ImageGallery', name: 'MONOCHROME® Evidence: surveillance exhibits', url: `${SITE}/lookbook/` }]
  };
  const ctx = pageContext('lookbook/', key, meta, { lb_figs: figs, lb_count: String(LOOKS.length), lb_count_pad: pad(LOOKS.length), lb_last: last });
  emit('lookbook/', ctx, tpl(read('pages', 'lookbook.html'), ctx));
}

// ===================================================================================================================
// ABOUT — mission briefing, objectives, rules of engagement
// ===================================================================================================================
{
  const key = 'about', ctx0 = makeCtx('about/');
  const fig = (h, i, alt, sizes) => { const x = byHandle(h), im = x.imgs[Math.min(i, x.imgs.length - 1)]; return { x, html: imgTag(im, { alt: alt || `${x.n}, photograph`, sizes, widths: [480, 720, 1080, 1400] }) }; };
  const a = fig('acid-washed-monochrome-hoodie', 5, 'Model in the acid-washed Monochrome hoodie against a dark grey curtain', '(min-width:900px) 34vw, 86vw');
  const b = fig('royal-black', 0, 'A black stone signet ring set in chrome', '(min-width:900px) 24vw, 70vw');
  const c = fig('black-monochrome-jersey', 3, 'Model in the black Monochrome jersey, hands at her glasses', '(min-width:900px) 40vw, 90vw');
  const meta = {
    title: 'Mission — briefing, objectives and rules of engagement — MONOCHROME® Bureau',
    description: `The MONOCHROME® mission: black, white and chrome, made in small runs and made to mix. Objectives and rules of engagement behind ${nPieces} assets of clothing, rings and chains.`,
    css: 'about', js: null,
    fh: { file: docNo(pageByKey.about), doc: 'Mission and rules of engagement' },
    jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Mission briefing', url: `${SITE}/about/` }]
  };
  const ctx = pageContext('about/', key, meta, {
    fig_a: a.html, fig_a_name: esc(a.x.n), fig_a_price: esc(fmt(a.x.p)), fig_a_href: esc(ctx0.href('products/' + a.x.h + '/')), fig_a_cam: cam(4, { ex: 'Exhibit A' }),
    fig_b: b.html, fig_b_name: esc(b.x.n), fig_b_price: esc(fmt(b.x.p)), fig_b_href: esc(ctx0.href('products/' + b.x.h + '/')), fig_b_cam: cam(9, { ex: 'Exhibit B' }),
    fig_c: c.html, fig_c_name: esc(c.x.n), fig_c_price: esc(fmt(c.x.p)), fig_c_href: esc(ctx0.href('products/' + c.x.h + '/')), fig_c_cam: cam(6, { ex: 'Exhibit C' }),
    n_tops: String(countsBy('top')), n_bottoms: String(countsBy('bottom')), n_hardware: String(countsBy('accessory')), n_print: String(countsBy('print')), n_gift: String(countsBy('gift')),
    store_city: esc(`${DATA.store.city}, ${DATA.store.province}`)
  });
  emit('about/', ctx, tpl(read('pages', 'about.html'), ctx));
}

// ===================================================================================================================
// SHIPPING — extraction routes
// ===================================================================================================================
{
  const key = 'shipping';
  const rowsAlpha = shipsTo.slice().sort((a, b) => a.name.localeCompare(b.name));
  const table = rowsAlpha.map((c, i) => {
    const hi = c.code === 'NG' ? ' nigeria' : c.code === 'CA' ? ' canada' : '';
    const rate = c.code === 'CA' ? 'Free <span class="r-l">standard </span>shipping' : '<span class="r-l">Calculated </span>at checkout';
    return `<tr class="${hi.trim()}"><td class="c-no mono">${pad(i + 1)}</td><th scope="row" class="c-name">${esc(c.name)}${c.code === 'NG' ? '<em>field office</em>' : c.code === 'CA' ? '<em>home base</em>' : ''}</th><td class="c-code mono">${c.code}</td><td class="c-reg mono">${c.region}</td><td class="c-rate mono">${rate}</td></tr>`;
  }).join('\n');
  const regions = [...new Set(rowsAlpha.map(c => c.region))].sort();
  const meta = {
    title: `Extraction routes — shipping to ${nCountries} countries — MONOCHROME® Bureau`,
    description: `MONOCHROME® delivers to ${nCountries} countries including Nigeria and Canada. Rates are calculated at checkout; Canada gets free standard shipping. Returns, exchanges and size guidance.`,
    css: 'shipping', js: null,
    fh: { file: docNo(pageByKey.shipping), doc: 'Extraction routes', extra: ` — ${nCountries} zones` },
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Extraction routes: shipping and returns', url: `${SITE}/shipping/` }]
  };
  const ctx = pageContext('shipping/', key, meta, {
    country_rows: table, regions_text: esc(regions.join(', ')), n_regions: String(regions.length), radar: radar(),
    policy_ship: esc(STORE + '/policies/shipping-policy'), policy_refund: esc(STORE + '/policies/refund-policy'), policy_privacy: esc(STORE + '/policies/privacy-policy'), policy_terms: esc(STORE + '/policies/terms-of-service'),
    ng_flag: shipsNG ? 'Nigeria' : 'Nigeria (not currently listed)'
  });
  emit('shipping/', ctx, tpl(read('pages', 'shipping.html'), ctx));
}

// ===================================================================================================================
// FAQ — the debrief
// ===================================================================================================================
{
  const key = 'faq', ctx0 = makeCtx('faq/');
  const ngLine = shipsNG ? `Yes. Nigeria is on the delivery list, together with ${nCountries - 1} other countries (the full list is on the <a href="${esc(ctx0.href('shipping/'))}">Routes page</a>). The rate for your address is calculated at checkout.` : `See the <a href="${esc(ctx0.href('shipping/'))}">Routes page</a> for the current delivery list.`;
  const gift = items.find(x => x.t === 'gift');
  const giftAmounts = gift ? gift.d.variants.map(v => fmt(v.price)).join(', ') : '';
  const QA = [
    ['Where do I buy?', `Every piece is sold through the Monochrome store. Open any asset in the <a href="${esc(ctx0.href('shop/'))}">register</a>, pick your size and use Add to bag. Checkout happens on the store.`],
    ['Do you ship to Nigeria?', ngLine],
    ['How much is shipping and how long does it take?', `Shipping is calculated at checkout from your address, so you see the rate for your country before you pay. Canada gets free standard shipping. You will get an email update once your order ships.`],
    ['How does sizing work?', `Tops have a relaxed cut and run true to size. If you are between sizes, go up. Every piece lists the sizes it comes in, and rings are sold by ring size. Message us if you want a recommendation. There is more on the <a href="${esc(ctx0.href('shipping/#sizing'))}">Routes page</a>.`],
    ['Which currency are prices in?', `All prices on this site are in Canadian dollars (CAD), the store’s base currency. Your card issuer converts at checkout if your card is in another currency.`],
    ['Returns and exchanges', `If something does not fit, contact us soon after your order arrives with your order number. Items should be unworn and in original condition. The final terms are in the store’s <a href="${esc(STORE + '/policies/refund-policy')}">refund policy</a>.`],
    ['Are drops limited?', `Yes. Pieces are made in small runs and some do not return. Sold-out assets stay in the register, marked out of stock, so you can see what you missed. Join the network on the <a href="${esc(ctx0.href('contact/#subscribe'))}">Report-in page</a> to hear about the next drop first.`],
    ['How do gift cards work?', gift ? `The gift card comes in four amounts (${giftAmounts} CAD). Choose one on the <a href="${esc(ctx0.href('products/' + gift.h + '/'))}">gift card page</a>; the recipient chooses their own piece.` : 'Ask us by email.'],
    ['Can I order a custom jersey?', `The Custom Monochrome Jersey takes up to 10 characters. Please contact us with your details before you order so we can answer any follow-up questions.`],
    ['A piece I want is sold out. Will it come back?', `Some pieces return and some do not. We cannot promise either way. The quickest way to find out is to join the network for drop alerts or to message us on Instagram.`],
    ['Custom orders, collaborations and bulk orders', `Interested in custom pieces, a collab or a bulk order? Email <a href="mailto:info.mccanada@gmail.com">info.mccanada@gmail.com</a> with the details and we will get back to you.`]
  ];
  const strip = h => h.replace(/<[^>]+>/g, '');
  const faqHtml = QA.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary><span class="mono q-no">Q.${pad(i + 1)}</span><b>${esc(q)}</b><i class="pm" aria-hidden="true"></i></summary><div class="ans"><span class="mono a-lbl" aria-hidden="true">A.${pad(i + 1)}</span><p>${a}</p></div></details>`).join('\n');
  const meta = {
    title: 'Debrief — questions answered — FAQ — MONOCHROME® Bureau',
    description: `Answers on shipping to Nigeria and ${nCountries - 1} other countries, sizing, returns, gift cards, custom jerseys and limited drops at MONOCHROME®. Prices in CAD.`,
    css: 'faq', js: null,
    fh: { file: docNo(pageByKey.faq), doc: 'Debrief transcript', extra: ` — ${QA.length} questions` },
    jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: QA.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) }]
  };
  const ctx = pageContext('faq/', key, meta, { faq_items: faqHtml, n_q: String(QA.length), n_q_pad: pad(QA.length) });
  emit('faq/', ctx, tpl(read('pages', 'faq.html'), ctx));
}

// ===================================================================================================================
// CONTACT — report in
// ===================================================================================================================
{
  const key = 'contact';
  const meta = {
    title: 'Report in — secure channel and newsletter — MONOCHROME® Bureau',
    description: `Contact MONOCHROME®: email info.mccanada@gmail.com or message @monochrome.ca on Instagram. Join the network for drop alerts on the next release. Prices in CAD.`,
    css: 'contact', js: null,
    fh: { file: docNo(pageByKey.contact), doc: 'Secure channel' },
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Report in: contact and newsletter', url: `${SITE}/contact/` }]
  };
  const ctx = pageContext('contact/', key, meta, { store_city: esc(`${DATA.store.city}, ${DATA.store.province}, Canada`) });
  emit('contact/', ctx, tpl(read('pages', 'contact.html'), ctx));
}

// ===================================================================================================================
// 404 — a host serves this one file at ANY missing URL (/a/b/c), so relative links would resolve against the wrong folder.
// The page pins its own base (see README, --base-path) and only then requests anything: the preload scanner reads ahead of
// scripts, so stylesheets, scripts and images are written out by the same inline script after <base>, never left in the markup.
// ===================================================================================================================
{
  const key = 'notfound';
  const meta = { title: 'File not found — access denied — MONOCHROME® Bureau', description: 'File not found. This page has been moved, shredded or never existed. Go back to the briefing, the asset register or the evidence wall.', css: 'contact', js: null, noindex: true, current: '__none', level: 0, folio: 404, footFile: 'MC-404' };
  const baseJs = `var p=location.pathname;if(!(/\\/404\\.html$/.test(p)||location.protocol==='file:'))document.write('<base href="'+location.origin+'${basePath}">');`;
  const ctx = pageContext('', key, meta, {
    font_preload: '',
    head_extra: `<script>(function(){${baseJs}addEventListener('DOMContentLoaded',function(){var q=location.pathname;if(/\\/404\\.html$/.test(q)||location.protocol==='file:')return;document.querySelectorAll('a[href^="#"]').forEach(function(a){a.setAttribute('href',q+location.search+a.getAttribute('href'))})})})()</script>`
  });
  const defer = html => {
    const w = tag => `<script>document.write(${JSON.stringify(tag).replace(/</g, '\\u003c')})</script>`;
    html = html.replace(/<link rel="stylesheet" href="[^"]+">/g, t => w(t));
    html = html.replace(/<script src="([^"]+)"( defer)?><\/script>/g, (_, src) => w(`<script src="${src}"></` + 'script>'));
    // images start without a source and receive it once the base is in force
    html = html.replace(/<img ([^>]*?)src="([^"]+)"/g, (_, pre, src) => `<img ${pre}data-src="${src}"`);
    html = html.replace('</body>', `<script>document.querySelectorAll('img[data-src]').forEach(function(i){i.src=i.getAttribute('data-src')})</script>\n<noscript><p style="position:fixed;inset:0;margin:0;padding:96px 16px;background:#070707;color:#eee;font:16px/1.5 monospace">File not found. <a style="color:#fff" href="${SITE}${basePath}">Back to the briefing</a></p></noscript>\n</body>`);
    return html;
  };
  emit('', ctx, tpl(read('pages', '404.html'), ctx), '404.html', defer);
}

// ===================================================================================================================
// sitemap.xml, robots.txt
// ===================================================================================================================
{
  const day = (DATA.syncedAt || new Date().toISOString()).slice(0, 10);
  const urls = [...PAGES.map(p => p.path), ...items.map(x => `products/${x.h}/`)];
  writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}/${u}</loc><lastmod>${day}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  written.push('sitemap.xml', 'robots.txt');
}

console.log(`${preview ? 'Preview build' : 'Build'}: ${written.length} files -> ${OUT}`);
