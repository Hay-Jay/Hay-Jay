#!/usr/bin/env node
// MONOCHROME® — NEGATIVE (multi-page). Static site generator. Node 22, no dependencies.
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

// ---- helpers -----------------------------------------------------------------------------------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = v => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(v);
const pad = n => String(n).padStart(2, '0');
const safeUrl = u => { try { return encodeURI(decodeURI(u)); } catch { return u; } };
const sized = (src, w) => !/^https?:/.test(src) ? src : `${safeUrl(src)}${src.includes('?') ? '&' : '?'}width=${w}`;
const read = (...p) => readFileSync(join(SRC, ...p), 'utf8');
const trunc = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,.;:-]+\S*$/, '') + '…'; };
const jsonLd = obj => `<script type="application/ld+json">\n${JSON.stringify(obj).replace(/</g, '\\u003c')}\n</script>`;

const CAT = { top: 'Top', bottom: 'Bottom', accessory: 'Object', gift: 'Gift card' };
const CAT_PLURAL = { top: 'Tops', bottom: 'Bottoms', accessory: 'Objects', gift: 'Gift cards' };
const NOUN = { all: ['piece', 'pieces'], top: ['top', 'tops'], bottom: ['bottom', 'bottoms'], accessory: ['object', 'objects'], gift: ['gift card', 'gift cards'] };

// ---- the product model (same ordering rules as the single-page concept) --------------------------
const HERO = { 'monochrome-sweatshirt': 4 }; // its first frame is half black fabric
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
const sizeText = x => x.sizes.length ? x.sizes.slice(0, 7).join(' ') : (x.t === 'gift' ? 'Choose amount' : 'One size');
const zoomy = x => x.t === 'accessory' && /ring/i.test(x.h);
const leadImg = x => x.imgs[x.hero];
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

// ---- pages ---------------------------------------------------------------------------------------
const PAGES = [
  { key: 'home', path: '', folio: '01', nav: 'Cover', mag: 'Cover' },
  { key: 'shop', path: 'shop/', folio: '02', nav: 'Shop', mag: 'The Index' },
  { key: 'lookbook', path: 'lookbook/', folio: '03', nav: 'Lookbook', mag: 'Lookbook' },
  { key: 'about', path: 'about/', folio: '04', nav: 'About', mag: 'The Formula' },
  { key: 'shipping', path: 'shipping/', folio: '05', nav: 'Shipping', mag: 'Distribution' },
  { key: 'faq', path: 'faq/', folio: '06', nav: 'FAQ', mag: 'Letters' },
  { key: 'contact', path: 'contact/', folio: '07', nav: 'Contact', mag: 'Colophon' }
];
const pageByKey = Object.fromEntries(PAGES.map(p => [p.key, p]));

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
const NAV_BAR = ['shop', 'lookbook', 'about', 'shipping', 'faq', 'contact'];
const navLink = (ctx, p, current, cls = '', label = p.nav) =>
  `<a${cls ? ` class="${cls}"` : ''} href="${esc(ctx.href(p.path))}"${current === p.key ? ' aria-current="page"' : ''}>${label}</a>`;
function navFragments(ctx, current) {
  const bar = NAV_BAR.map(k => navLink(ctx, pageByKey[k], current, '', `<span class="mono n-no" aria-hidden="true">${pageByKey[k].folio}</span>${pageByKey[k].nav}`)).join('');
  const menu = PAGES.map(p => `<li><a href="${esc(ctx.href(p.path))}"${current === p.key ? ' aria-current="page"' : ''}><span class="mono">${p.folio}</span><b>${p.nav}</b><i class="mono">${p.key === 'home' ? 'Issue 01' : p.mag}</i></a></li>`).join('');
  const foot = PAGES.map(p => navLink(ctx, p, current)).join('');
  return { nav_bar: bar, nav_menu: menu, nav_foot: foot };
}

// ---- image fragments ---------------------------------------------------------------------------------------
function imgTag(im, { alt, cls = 'ph', widths = [480, 720, 1080], sizes = '100vw', eager = false, id = '' }) {
  const mid = widths[Math.floor(widths.length / 2)];
  return `<img class="${cls}"${id}${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" draggable="false" src="${esc(sized(im.src, mid))}" srcset="${widths.map(w => `${esc(sized(im.src, w))} ${w}w`).join(', ')}" sizes="${sizes}" width="${im.w || 1000}" height="${im.h || 1000}" alt="${esc(alt)}">`;
}
const greaseVars = n => `--ga:${46 + (n * 7) % 9}deg;--gb:${-(50 + (n * 5) % 11)}deg;--gy:${(n * 3) % 7 - 3}px;--gc:${(n * 11) % 17 - 8}deg`;

// one contact-sheet frame (shop sheet, home strip, related plates)
function frame(ctx, x, { i = 0, sizes = '(min-width:1500px) 20vw, (min-width:900px) 25vw, (min-width:700px) 33vw, 50vw', feat = false, data = false, widths = [360, 540, 720, 1080] } = {}) {
  const im = leadImg(x);
  const attrs = data ? ` data-h="${esc(x.h)}" data-n="${esc((x.n + ' ' + (x.d.type || '') + ' ' + CAT_PLURAL[x.t]).toLowerCase())}" data-cat="${x.t}" data-p="${x.p}" data-pub="${x.pub}" data-rank="${x.rank}" data-av="${x.avail ? 1 : 0}" data-no="${x.no}" data-f="${featuredOrder.indexOf(x)}"` : '';
  return `<a class="frame${feat ? ' feat' : ''}${x.avail ? '' : ' sold'}${x.isNew ? ' isnew' : ''}" style="--i:${Math.min(i, 14)};${greaseVars(x.no)}"${attrs} href="${esc(ctx.href('products/' + x.h + '/'))}">
  <div class="film" aria-hidden="true"><span>MC-01 / ${pad(x.no)}</span><span>${pad(x.no)}A</span></div>
  <div class="xp${zoomy(x) ? ' zoom' : ''}">${imgTag(im, { alt: x.n, sizes, widths })}${x.avail ? '' : '<span class="grease" aria-hidden="true"><i></i></span>'}</div>
  <div class="cap"><span class="no mono">${pad(x.no)}</span><b>${esc(x.n)}</b><span class="pr">${priceText(x)} <small>CAD</small></span><span class="sz">${esc(sizeText(x))}</span>${x.avail ? '' : '<span class="st">Sold out</span>'}</div>
</a>`;
}

// ---- page: common context -----------------------------------------------------------------------------------
const SITE_NAME = 'MONOCHROME®';
function pageContext(path, key, meta, extra = {}) {
  const ctx = makeCtx(path);
  const canonical = `${SITE}/${path}`;
  const og = meta.ogImage || `${SITE}/assets/emblem.webp`;
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
    bar_tone: meta.tone === 'paper' ? ' tone-paper' : '',
    body_class: `pg-${key}`,
    page_js: meta.js ? `<script src="${esc(ctx.asset('js/' + meta.js + '.js'))}" defer></script>` : '',
    page_folio: meta.folio || '',
    year: String(new Date().getFullYear()),
    nav_home_current: key === 'home' ? ' aria-current="page"' : '',
    store_cart: esc(STORE + '/cart'),
    store_url: esc(STORE),
    base_path: esc(basePath),
    countries: String(nCountries),
    pieces: String(nPieces),
    // font preloads are CORS requests, which browsers refuse on file:// - the preview build skips them
    font_preload: preview ? '' : ['BodoniModa-normal-400-900-latin', 'DMMono-normal-400-latin'].map(f => `<link rel="preload" href="${esc(ctx.asset('assets/fonts/' + f + '.woff2'))}" as="font" type="font/woff2" crossorigin>`).join('\n'),
    foot_ticker: tickerHtml(['Delivering to', ...countryNames]),
    news_action: esc(STORE + '/contact#contact_form'),
    ...extra
  });
  return ctx;
}

function tickerHtml(words) {
  return `<div class="ticker" aria-hidden="true"><div class="ticker-t" data-ticker><div class="tk">${words.map(w => `<span>${esc(w)}</span>`).join('')}</div></div></div>`;
}

const written = [];
function emit(path, ctx, body, file = 'index.html') {
  const html = tpl(read('partials', 'layout.html'), { ...ctx, body: '\u0000BODY\u0000' }).replace('\u0000BODY\u0000', () => body);
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
// HOME — the cover
// ===================================================================================================================
{
  const key = 'home', ctx0 = makeCtx('');
  const cover = byHandle('white-monochrome-jersey');
  const coverIm = cover.imgs[1] || cover.imgs[0];
  const PICKS = [['black-monochrome-jersey', 3], ['acid-washed-monochrome-hoodie', 5], ['monochrome-cargo-shorts-black', 0], ['monochrome-pants-chain', 1], ['royal-black', 0]]
    .map(([h, i]) => ({ x: byHandle(h), i })).filter(p => p.x);
  const pickFrames = PICKS.map(({ x, i }, n) => {
    const im = x.imgs[Math.min(i, x.imgs.length - 1)];
    return `<a class="frame${x.avail ? '' : ' sold'}" style="--i:${n};${greaseVars(x.no)}" href="${esc(ctx0.href('products/' + x.h + '/'))}">
  <div class="film" aria-hidden="true"><span>MC-01 / ${pad(x.no)}</span><span>${pad(x.no)}A</span></div>
  <div class="xp${zoomy(x) ? ' zoom' : ''}">${imgTag(im, { alt: `${x.n}, photograph`, sizes: '(min-width:1100px) 19vw, (min-width:700px) 30vw, 60vw', widths: [360, 540, 720, 1080] })}</div>
  <div class="cap"><span class="no mono">${pad(x.no)}</span><b>${esc(x.n)}</b><span class="pr">${priceText(x)} <small>CAD</small></span><span class="sz">${esc(sizeText(x))}</span></div>
</a>`;
  }).join('\n');
  const meta = {
    title: 'MONOCHROME® — Black, white and chrome. Wear the unknown.',
    description: `MONOCHROME® Issue 01, The Unknown: black, white and chrome clothing, rings and chains in small runs. ${nPieces} pieces in CAD, delivered to ${nCountries} countries including Nigeria and Canada.`,
    tone: 'ink', css: 'home', js: null, folio: '01', ogImage: sized(coverIm.src, 1200),
    jsonld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'MONOCHROME', url: SITE + '/', logo: SITE + '/assets/emblem.webp', sameAs: ['https://www.instagram.com/monochrome.ca/'], email: 'info.mccanada@gmail.com' },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' }]
  };
  const ctx = pageContext('', key, meta, {
    cover_href: esc(ctx0.href('products/' + cover.h + '/')),
    cover_name: esc(cover.n),
    cover_price: fmt(cover.p),
    cover_img: imgTag(coverIm, { alt: `${cover.n}, photograph`, sizes: '(min-width:900px) 44vw, 74vw', widths: [640, 960, 1280, 1800], eager: true }),
    pick_frames: pickFrames,
    n_tops: String(countsBy('top')), n_bottoms: String(countsBy('bottom')), n_objects: String(countsBy('accessory')),
    ticker_cover: tickerHtml(['Wear the unknown', 'Issue 01', 'Black / white / chrome', `${nPieces} pieces`, 'Prices in CAD', 'The Unknown']),
    ticker_ship: tickerHtml(['Delivering to', ...countryNames]),
    ng_note: shipsNG ? 'Nigeria is on the list.' : ''
  });
  emit('', ctx, tpl(read('pages', 'home.html'), ctx));
}

// ===================================================================================================================
// SHOP — the index
// ===================================================================================================================
{
  const key = 'shop', ctx0 = makeCtx('shop/');
  const rows = featuredOrder.map((x, i) => {
    const im = leadImg(x);
    return `<li class="trow${x.avail ? '' : ' sold'}" style="--i:${Math.min(i, 14)}" data-h="${esc(x.h)}" data-n="${esc((x.n + ' ' + (x.d.type || '') + ' ' + CAT_PLURAL[x.t]).toLowerCase())}" data-cat="${x.t}" data-p="${x.p}" data-pub="${x.pub}" data-rank="${x.rank}" data-av="${x.avail ? 1 : 0}" data-no="${x.no}" data-f="${i}">
  <a class="trow-a" href="${esc(ctx0.href('products/' + x.h + '/'))}" data-img="${esc(safeUrl(im.src))}" data-zoom="${zoomy(x) ? 1 : 0}" data-cap="No. ${pad(x.no)} — ${CAT[x.t]} — ${esc(priceText(x))} CAD${x.avail ? '' : ' — Sold out'}" data-sizes="${esc(sizeText(x))}" data-cat-label="${CAT[x.t]}" data-price="${esc(priceText(x))}">
    <span class="t-no mono">${pad(x.no)}</span>
    <span class="t-name">${esc(x.n)}${x.isNew ? '<em>new</em>' : ''}</span>
    <span class="t-meta mono"><span class="t-cat">${CAT[x.t]}</span><span class="t-sz">${esc(sizeText(x))}</span>${x.avail ? '' : '<span class="t-st">Sold out</span>'}</span>
    <span class="t-price mono${x.avail ? '' : ' t-sold'}">${priceText(x)}<small>CAD</small></span>
  </a>
</li>`;
  }).join('\n');
  const feat = featuredOrder.length >= 8;
  const frames = featuredOrder.map((x, i) => frame(ctx0, x, { i, feat: feat && i === 0, data: true, widths: [360, 540, 720, 1080, 1400], sizes: i === 0 ? '(min-width:700px) 50vw, 100vw' : undefined })).join('\n');
  const filt = (f, label) => `<button class="filter${f === 'all' ? ' on' : ''}" data-filter="${f}" type="button" aria-pressed="${f === 'all'}">${label}<sup>${f === 'all' ? nPieces : countsBy(f)}</sup></button>`;
  const meta = {
    title: `The Index — Shop all ${nPieces} pieces — MONOCHROME®`,
    description: `Every MONOCHROME® piece in one index: tops, bottoms, rings, chains, necklaces and gift cards in black, white and chrome. Filter by category and sort by price. Prices in CAD.`,
    tone: 'paper', css: 'shop', js: 'shop', folio: '02',
    headExtra: `<script>(function(){try{var q=new URLSearchParams(location.search),c=q.get('c'),d=document.documentElement;if(/^(top|bottom|accessory|gift)$/.test(c))d.dataset.c=c;var v=q.get('v');if(v!=='sheet'&&v!=='index')v=matchMedia('(hover: none), (max-width: 699px)').matches?'sheet':'index';d.dataset.view=v}catch(e){}})()</script>`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'The Index — all pieces', url: `${SITE}/shop/`, mainEntity: { '@type': 'ItemList', numberOfItems: nPieces, itemListElement: featuredOrder.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/products/${x.h}/`, name: x.n })) } }]
  };
  const ctx = pageContext('shop/', key, meta, {
    shop_rows: rows, shop_frames: frames, total: String(nPieces),
    filters: [filt('all', 'All'), filt('top', 'Tops'), filt('bottom', 'Bottoms'), filt('accessory', 'Objects'), filt('gift', 'Gift cards')].join('\n        '),
    in_stock: String(items.filter(x => x.avail).length)
  });
  emit('shop/', ctx, tpl(read('pages', 'shop.html'), ctx));
}

// ===================================================================================================================
// PRODUCT pages — one per handle, same path as the Shopify store
// ===================================================================================================================
function relatedFor(x) {
  const same = featuredOrder.filter(y => y !== x && y.t === x.t);
  const rest = featuredOrder.filter(y => y !== x && y.t !== x.t);
  const pick = [...same.filter(y => y.avail), ...rest.filter(y => y.avail), ...same.filter(y => !y.avail), ...rest.filter(y => !y.avail)];
  return pick.slice(0, 4);
}
const isDefaultOpt = (p, o) => p.options.length === 1 && o.values.length === 1 && /default/i.test(o.values[0]);
const hasChoice = p => p.options.length && !(p.options.length === 1 && p.options[0].values.length === 1 && /default/i.test(p.options[0].values[0]));
const AV = 'https://schema.org/InStock', OOS = 'https://schema.org/OutOfStock';

for (const x of items) {
  const p = x.d, path = `products/${x.h}/`, ctx0 = makeCtx(path), key = 'product';
  const canonical = `${SITE}/${path}`;
  const first = p.variants.find(v => v.available) || p.variants[0];
  const sel = first ? first.options.slice() : [];
  const variantAvail = (oi, val) => p.variants.some(v => v.available && v.options[oi] === val && v.options.every((ov, k) => k === oi || ov === sel[k]));

  // options, printed as size labels
  const opts = hasChoice(p) ? p.options.map((o, oi) => {
    if (o.values.length < 2) return `<div class="opt opt-fixed"><span class="opt-name">${esc(o.name)}<b>${esc(o.values[0])}</b></span></div>`;
    return `<fieldset class="opt" data-o="${oi}"><legend class="opt-name">${esc(o.name)}<b>${esc(sel[oi] || '')}</b></legend><div class="chips">${o.values.map(val =>
      `<button type="button" class="chip${sel[oi] === val ? ' on' : ''}" data-o="${oi}" data-v="${esc(val)}" aria-pressed="${sel[oi] === val}"${variantAvail(oi, val) ? '' : ' disabled'}><i aria-hidden="true">${esc(o.name)}</i><b>${esc(val)}</b></button>`).join('')}</div></fieldset>`;
  }).join('') : '';

  // gallery (stacked and complete without JS; one plate at a time with JS)
  const shots = x.imgs.map((im, k) => `<li class="shot${k === 0 ? ' on' : ''}" data-i="${k}"><div class="xp" style="--ar:${im.w || 1}/${im.h || 1}">${imgTag(im, { alt: `${x.n}, photograph ${k + 1} of ${x.imgs.length}`, sizes: '(min-width:900px) 56vw, 100vw', widths: [640, 960, 1280, 1800], eager: k === 0 })}</div></li>`).join('');
  const thumbs = x.imgs.length > 1 ? x.imgs.map((im, k) => `<button type="button" class="th${k === 0 ? ' on' : ''}" data-i="${k}" aria-label="Photograph ${k + 1} of ${x.imgs.length}"${k === 0 ? ' aria-current="true"' : ''}><img loading="lazy" decoding="async" draggable="false" src="${esc(sized(im.src, 160))}" width="64" height="80" alt=""><b>${pad(k + 1)}</b></button>`).join('') : '';

  const prev = featuredOrder[(x.no - 2 + nPieces) % nPieces], next = featuredOrder[x.no % nPieces];
  const turn = y => `${pad(y.no)} ${esc(y.n)}`;
  const priceNow = first ? first.price : p.price;
  const range = p.priceMax > p.price;
  const buy = x.avail
    ? `<a class="buy" id="buy" href="${esc(STORE + '/products/' + x.h)}"><span id="buyT">Buy on the store</span><i class="arr" aria-hidden="true"></i></a>`
    : `<span class="buy" id="buy" aria-disabled="true"><span id="buyT">Sold out</span></span>
      <a class="mono pl-alert" href="${esc(ctx0.href('contact/#subscribe'))}">Get drop alerts for the next issue</a>`;
  const ogImg = sized(leadImg(x).src, 1200);
  const catLabel = CAT[x.t], plural = CAT_PLURAL[x.t];
  const descText = (p.description || '').trim();
  const metaDesc = descText
    ? `${x.n} — ${trunc(descText, 90)} ${priceText(x)} CAD. Delivered to ${nCountries} countries including Nigeria and Canada.`
    : `${x.n} by MONOCHROME®: a ${catLabel.toLowerCase()} in black, white and chrome. ${priceText(x)} CAD. Delivered to ${nCountries} countries including Nigeria and Canada.`;
  const offer = v => ({ '@type': 'Offer', url: canonical, price: Number(v.price).toFixed(2), priceCurrency: 'CAD', availability: v.available ? AV : OOS, itemCondition: 'https://schema.org/NewCondition', sku: String(v.id), name: v.options.join(' / ') });
  const offers = p.variants.length === 1 ? offer(p.variants[0]) : p.variants.map(offer);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Product', name: x.n, description: descText || `${x.n}, a ${catLabel.toLowerCase()} from MONOCHROME®.`, sku: x.h, category: catLabel, brand: { '@type': 'Brand', name: 'MONOCHROME' }, url: canonical, image: x.imgs.slice(0, 6).map(im => sized(im.src, 1200)), offers },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Cover', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'The Index', item: SITE + '/shop/' },
      { '@type': 'ListItem', position: 3, name: plural, item: `${SITE}/shop/?c=${x.t}` }, { '@type': 'ListItem', position: 4, name: x.n, item: canonical }] }
  ];
  const pdata = { h: x.h, store: STORE, range, min: p.price, options: p.options.map(o => ({ name: o.name, values: o.values })), variants: p.variants.map(v => ({ id: v.id, o: v.options, p: v.price, a: v.available ? 1 : 0 })), sel };
  const rel = relatedFor(x).map((y, i) => frame(ctx0, y, { i, sizes: '(min-width:1100px) 22vw, (min-width:700px) 33vw, 50vw', widths: [360, 540, 720, 1080] })).join('\n');
  const meta = { title: `${x.n} — ${catLabel} No. ${pad(x.no)} — MONOCHROME®`, description: metaDesc, tone: 'ink', css: 'product', js: 'product', ogType: 'product', ogImage: ogImg, jsonld: ld, current: 'shop', folio: '02.' + pad(x.no) };
  const ctx = pageContext(path, key, meta, {
    h: esc(x.h), title_h: esc(x.n), no: pad(x.no), total: pad(nPieces), cat: catLabel, cat_plural: plural, cat_key: x.t,
    new_flag: x.isNew ? ' — New' : '',
    price_now: esc(fmt(priceNow)), price_cad: 'CAD', price_text: esc(range ? 'From ' + fmt(p.price) : fmt(priceNow)),
    stock_text: x.avail ? 'In stock' : 'Sold out', stock_cls: x.avail ? 'in' : 'out',
    desc: descText ? `<p class="pl-desc">${esc(descText)}</p>` : '',
    opts, shots, thumbs, buy, n_shots: String(x.imgs.length), n_shots_pad: pad(x.imgs.length),
    sizes_text: esc(sizeText(x)), related: rel,
    prev_href: esc(ctx0.href('products/' + prev.h + '/')), prev_label: turn(prev), next_href: esc(ctx0.href('products/' + next.h + '/')), next_label: turn(next),
    shop_cat_href: esc(ctx0.href('shop/?c=' + x.t)),
    pdata: JSON.stringify(pdata).replace(/</g, '\\u003c'),
    ship_note: `Ships to ${nCountries} countries, Nigeria and Canada included. Rate calculated at checkout.`,
    thumbs_block: thumbs ? `<div class="thumbs" id="thumbs" role="group" aria-label="Photographs">${thumbs}</div>` : '',
    count_block: x.imgs.length > 1 ? `<span id="shotCount">01 / ${pad(x.imgs.length)}</span>` : `<span id="shotCount">01 / 01</span>`,
    store_product: esc(STORE + '/products/' + x.h),
    store_link: x.avail ? `<a class="mono link-line pl-store" href="${esc(STORE + '/products/' + x.h)}" rel="noopener">View on the store<span class="arr" aria-hidden="true"></span></a>` : ''
  });
  emit(path, ctx, tpl(read('pages', 'product.html'), ctx));
}

// ===================================================================================================================
// LOOKBOOK
// ===================================================================================================================
{
  const key = 'lookbook', ctx0 = makeCtx('lookbook/');
  const LOOKS = [
    ['monochrome-acid-washed-black', 3, '4/5', 1.0, '0px'], ['white-monochrome-jersey', 2, '3/2', .72, '7vh'], ['monochrome-sweatshirt', 1, '3/4', 1.0, '-3vh'],
    ['monochrome-cargo-skirt', 1, '4/3', .62, '10vh'], ['black-monochrome-jersey', 3, '4/5', .92, '-4vh'], ['monochrome-pants-chain', 1, '1/1', .68, '8vh'],
    ['acid-washed-monochrome-hoodie', 3, '4/5', .86, '-6vh'], ['monochrome-cargo-shorts-black', 2, '3/4', .96, '2vh'], ['monochrome-sleeveless-crop-top', 2, '3/2', .6, '9vh'],
    ['monochrome-cross-necklace', 2, '4/5', .84, '-5vh'], ['monochrome-acid-washed-grey', 3, '3/2', .64, '8vh'], ['royal-black', 0, '1/1', .56, '-2vh']
  ].map(l => ({ x: byHandle(l[0]), i: l[1], ar: l[2], k: l[3], mt: l[4] })).filter(l => l.x);
  const figs = LOOKS.map((l, n) => {
    const im = l.x.imgs[Math.min(l.i, l.x.imgs.length - 1)];
    return `<a class="lb-fig" href="${esc(ctx0.href('products/' + l.x.h + '/'))}" style="--k:${l.k};--ar:${l.ar};--mt:${l.mt}" aria-label="Fig. ${pad(n + 1)}, ${esc(l.x.n)}, ${esc(priceText(l.x))} CAD. Open the piece">
      <span class="lb-no" aria-hidden="true">${pad(n + 1)}</span>
      <div class="xp">${imgTag(im, { alt: `${l.x.n}, lookbook photograph ${n + 1}`, sizes: '(min-width:900px) 50vh, 70vw', widths: [480, 720, 1000, 1400], eager: n < 2 })}</div>
      <span class="lb-cap mono" aria-hidden="true"><b>Fig. ${pad(n + 1)}</b><span>${esc(l.x.n)}</span><span>${esc(priceText(l.x))}</span></span>
    </a>`;
  }).join('\n');
  const meta = {
    title: 'Lookbook — Issue 01, The Unknown — MONOCHROME®',
    description: `${LOOKS.length} frames from MONOCHROME® Issue 01: jerseys, hoodies, cargo, chains and rings shot dark, shown in black and white. Open any frame to see the piece.`,
    tone: 'ink', css: 'lookbook', js: 'lookbook', folio: '03',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ImageGallery', name: 'MONOCHROME® Lookbook, Issue 01', url: `${SITE}/lookbook/` }]
  };
  const ctx = pageContext('lookbook/', key, meta, { lb_figs: figs, lb_count: String(LOOKS.length), lb_count_pad: pad(LOOKS.length) });
  emit('lookbook/', ctx, tpl(read('pages', 'lookbook.html'), ctx));
}

// ===================================================================================================================
// ABOUT
// ===================================================================================================================
{
  const key = 'about', ctx0 = makeCtx('about/');
  const fig = (h, i, alt, sizes, cls = '') => { const x = byHandle(h), im = x.imgs[Math.min(i, x.imgs.length - 1)]; return { x, html: imgTag(im, { alt: alt || `${x.n}, photograph`, sizes, widths: [480, 720, 1080, 1400] }) }; };
  const a = fig('acid-washed-monochrome-hoodie', 5, 'Model in the acid-washed Monochrome hoodie against a dark grey curtain', '(min-width:900px) 34vw, 86vw');
  const b = fig('royal-black', 0, 'A black stone signet ring set in chrome', '(min-width:900px) 24vw, 70vw');
  const c = fig('black-monochrome-jersey', 3, 'Model in the black Monochrome jersey, hands at her glasses', '(min-width:900px) 40vw, 90vw');
  const meta = {
    title: 'About — The Formula: black, white and chrome — MONOCHROME®',
    description: `The MONOCHROME® formula: black, white and chrome, made in small runs and made to mix. The story behind ${nPieces} pieces of clothing, rings and chains.`,
    tone: 'paper', css: 'about', js: null, folio: '04',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'The Formula', url: `${SITE}/about/` }]
  };
  const ctx = pageContext('about/', key, meta, {
    fig_a: a.html, fig_a_name: esc(a.x.n), fig_a_price: esc(fmt(a.x.p)), fig_a_href: esc(ctx0.href('products/' + a.x.h + '/')),
    fig_b: b.html, fig_b_name: esc(b.x.n), fig_b_price: esc(fmt(b.x.p)), fig_b_href: esc(ctx0.href('products/' + b.x.h + '/')),
    fig_c: c.html, fig_c_name: esc(c.x.n), fig_c_price: esc(fmt(c.x.p)), fig_c_href: esc(ctx0.href('products/' + c.x.h + '/')),
    n_tops: String(countsBy('top')), n_bottoms: String(countsBy('bottom')), n_objects: String(countsBy('accessory')), n_gift: String(countsBy('gift')),
    store_city: esc(`${DATA.store.city}, ${DATA.store.province}`)
  });
  emit('about/', ctx, tpl(read('pages', 'about.html'), ctx));
}

// ===================================================================================================================
// SHIPPING — Distribution
// ===================================================================================================================
{
  const key = 'shipping';
  const rowsAlpha = shipsTo.slice().sort((a, b) => a.name.localeCompare(b.name));
  const table = rowsAlpha.map((c, i) => {
    const hi = c.code === 'NG' ? ' nigeria' : c.code === 'CA' ? ' canada' : '';
    const rate = c.code === 'CA' ? 'Free standard shipping' : 'Calculated at checkout';
    return `<tr class="${hi.trim()}"><td class="c-no mono">${pad(i + 1)}</td><th scope="row" class="c-name">${esc(c.name)}${c.code === 'NG' ? '<em>featured</em>' : c.code === 'CA' ? '<em>home market</em>' : ''}</th><td class="c-code mono">${c.code}</td><td class="c-reg mono">${c.region}</td><td class="c-rate mono">${rate}</td></tr>`;
  }).join('\n');
  const regions = [...new Set(rowsAlpha.map(c => c.region))].sort();
  const meta = {
    title: `Shipping & returns — Distribution to ${nCountries} countries — MONOCHROME®`,
    description: `MONOCHROME® delivers to ${nCountries} countries including Nigeria and Canada. Rates are calculated at checkout; Canada gets free standard shipping. Returns, exchanges and size guidance.`,
    tone: 'paper', css: 'shipping', js: null, folio: '05',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Distribution: shipping and returns', url: `${SITE}/shipping/` }]
  };
  const ctx = pageContext('shipping/', key, meta, {
    country_rows: table, regions_text: esc(regions.join(', ')), n_regions: String(regions.length),
    policy_ship: esc(STORE + '/policies/shipping-policy'), policy_refund: esc(STORE + '/policies/refund-policy'), policy_privacy: esc(STORE + '/policies/privacy-policy'), policy_terms: esc(STORE + '/policies/terms-of-service'),
    ng_flag: shipsNG ? 'Nigeria' : 'Nigeria (not currently listed)'
  });
  emit('shipping/', ctx, tpl(read('pages', 'shipping.html'), ctx));
}

// ===================================================================================================================
// FAQ — Letters
// ===================================================================================================================
{
  const key = 'faq', ctx0 = makeCtx('faq/');
  const ngLine = shipsNG ? `Yes. Nigeria is on the delivery list, together with ${nCountries - 1} other countries (the full list is on the <a href="${esc(ctx0.href('shipping/'))}">Shipping page</a>). The rate for your address is calculated at checkout.` : `See the <a href="${esc(ctx0.href('shipping/'))}">Shipping page</a> for the current delivery list.`;
  const gift = items.find(x => x.t === 'gift');
  const giftAmounts = gift ? gift.d.variants.map(v => fmt(v.price)).join(', ') : '';
  const QA = [
    ['Where do I buy?', `Every piece is sold through the Monochrome store. Open any piece in the <a href="${esc(ctx0.href('shop/'))}">index</a>, pick your size and use Add to bag. Checkout happens on the store.`],
    ['Do you ship to Nigeria?', ngLine],
    ['How much is shipping and how long does it take?', `Shipping is calculated at checkout from your address, so you see the rate for your country before you pay. Canada gets free standard shipping. You will get an email update once your order ships.`],
    ['How does sizing work?', `Tops have a relaxed cut and run true to size. If you are between sizes, go up. Every piece lists the sizes it comes in, and rings are sold by ring size. Message us if you want a recommendation. There is more on the <a href="${esc(ctx0.href('shipping/#sizing'))}">Shipping page</a>.`],
    ['Which currency are prices in?', `All prices on this site are in Canadian dollars (CAD), the store’s base currency. Your card issuer converts at checkout if your card is in another currency.`],
    ['Returns and exchanges', `If something does not fit, contact us soon after your order arrives with your order number. Items should be unworn and in original condition. The final terms are in the store’s <a href="${esc(STORE + '/policies/refund-policy')}">refund policy</a>.`],
    ['Are drops limited?', `Yes. Pieces are made in small runs and some do not return. Sold-out pieces stay in the index, crossed out, so you can see what you missed. Subscribe on the <a href="${esc(ctx0.href('contact/#subscribe'))}">Colophon page</a> to hear about the next issue first.`],
    ['How do gift cards work?', gift ? `The gift card comes in four amounts (${giftAmounts} CAD). Choose one on the <a href="${esc(ctx0.href('products/' + gift.h + '/'))}">gift card page</a>; the recipient chooses their own piece.` : 'Ask us by email.'],
    ['Can I order a custom jersey?', `The Custom Monochrome Jersey takes up to 10 characters. Please contact us with your details before you order so we can answer any follow-up questions.`],
    ['A piece I want is sold out. Will it come back?', `Some pieces return and some do not. We cannot promise either way. The quickest way to find out is to subscribe to drop alerts or to message us on Instagram.`],
    ['Custom orders, collaborations and bulk orders', `Interested in custom pieces, a collab or a bulk order? Email <a href="mailto:info.mccanada@gmail.com">info.mccanada@gmail.com</a> with the details and we will get back to you.`]
  ];
  const strip = h => h.replace(/<[^>]+>/g, '');
  const faqHtml = QA.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary><span class="mono q-no">Q.${pad(i + 1)}</span><b>${esc(q)}</b><i class="pm" aria-hidden="true"></i></summary><div class="ans"><span class="mono a-lbl" aria-hidden="true">A.</span><p>${a}</p></div></details>`).join('\n');
  const meta = {
    title: 'Letters — Questions, answered — FAQ — MONOCHROME®',
    description: `Answers on shipping to Nigeria and ${nCountries - 1} other countries, sizing, returns, gift cards, custom jerseys and limited drops at MONOCHROME®. Prices in CAD.`,
    tone: 'ink', css: 'faq', js: null, folio: '06',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: QA.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) }]
  };
  const ctx = pageContext('faq/', key, meta, { faq_items: faqHtml, n_q: String(QA.length), n_q_pad: pad(QA.length) });
  emit('faq/', ctx, tpl(read('pages', 'faq.html'), ctx));
}

// ===================================================================================================================
// CONTACT — Colophon
// ===================================================================================================================
{
  const key = 'contact';
  const meta = {
    title: 'Contact — Colophon & subscribe — MONOCHROME®',
    description: `Contact MONOCHROME®: email info.mccanada@gmail.com or message @monochrome.ca on Instagram. Subscribe for drop alerts on the next issue. Prices in CAD.`,
    tone: 'paper', css: 'contact', js: null, folio: '07',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Colophon and contact', url: `${SITE}/contact/` }]
  };
  const ctx = pageContext('contact/', key, meta, { store_city: esc(`${DATA.store.city}, ${DATA.store.province}, Canada`) });
  emit('contact/', ctx, tpl(read('pages', 'contact.html'), ctx));
}

// ===================================================================================================================
// 404 — served by the host at any missing URL, so it fixes its own base (see README)
// ===================================================================================================================
{
  const key = 'notfound';
  const meta = { title: 'Lost — Page missing from this issue — MONOCHROME®', description: 'This page is missing from the issue. Go back to the cover, the index or the lookbook.', tone: 'ink', css: 'contact', js: null, noindex: true, current: '__none', folio: '404' };
  const ctx = pageContext('', key, meta, {
    // a host serves this file at any missing URL, so it pins its own base (see README) and re-aims its in-page anchors
    head_extra: `<script>(function(){var p=location.pathname;if(/\\/404\\.html$/.test(p)||location.protocol==='file:')return;document.write('<base href="'+location.origin+'${basePath}">');addEventListener('DOMContentLoaded',function(){document.querySelectorAll('a[href^="#"]').forEach(function(a){a.setAttribute('href',location.pathname+location.search+a.getAttribute('href'))})})})()</script>`
  });
  emit('', ctx, tpl(read('pages', '404.html'), ctx), '404.html');
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
