// Copies the prototype's CSS and JS into theme/assets as mc-*.css / mc-*.js, applying the few edits a Shopify theme needs.
// Re-run whenever the prototype changes:  node tools/sync-assets.mjs
// product.js is NOT synced: the theme has its own (theme/assets/mc-product.js) because the buy flow is a real Shopify form.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROTOTYPE_DIR, DEFAULT_THEME_DIR } from './lib/util.mjs';

const P = join(PROTOTYPE_DIR), A = join(DEFAULT_THEME_DIR, 'assets');
const rd = f => readFileSync(join(P, f), 'utf8');
const wr = (f, s) => writeFileSync(join(A, f), s);
function patch(src, edits, file) {
  for (const [from, to] of edits) {
    if (!src.includes(from)) throw new Error(`${file}: pattern not found: ${from.slice(0, 70)}`);
    src = src.replace(from, () => to);
  }
  return src;
}

// ---- CSS
let base = rd('css/base.css').split('\n').filter(l => !l.startsWith('@font-face')).join('\n');
wr('mc-base.css', base);
for (const n of ['home', 'shop', 'product', 'lookbook', 'about', 'shipping', 'faq', 'contact', 'mobile']) wr(`mc-${n}.css`, rd(`css/${n}.css`));

// ---- core.js
let core = rd('js/core.js');
const start = core.indexOf('  const CFG = window.MONOCHROME_CONFIG');
const end = core.indexOf('  const $ = MC.$');
if (start < 0 || end < 0) throw new Error('core.js: header block not found');
core = core.slice(0, start) + `  // Theme runtime: the layout writes window.MC = {routes, catalogUrl, ...}; every link is a real Shopify URL.
  const ROUTES = MC.routes || {};
  const STORE = '';
  MC.store = STORE;
  const ROUTE_OF = { '': ROUTES.home || '/', 'shop/': ROUTES.shop, 'lookbook/': ROUTES.lookbook, 'about/': ROUTES.about, 'shipping/': ROUTES.shipping, 'faq/': ROUTES.faq, 'contact/': ROUTES.contact };
  MC.url = p => {
    const m = String(p || '').match(/^([^?#]*)(.*)$/), hit = ROUTE_OF[m[1]];
    if (hit) return hit + m[2];
    const prod = /^products\\/([^/]+)\\/?$/.exec(m[1]);
    return (prod ? '/products/' + prod[1] : '/' + m[1]) + m[2];
  };
  MC.asset = p => p;
` + core.slice(end);
core = patch(core, [
  [`  // Anything pointing at the Shopify storefront follows config.js (the generator already wrote the same default).
  $$('[data-store]').forEach(a => { a.href = STORE + a.dataset.store; });
  $$('form.news').forEach(f => {
    f.action = \`\${STORE}/contact#contact_form\`;
    f.addEventListener('submit', () => { const n = $('.news-note', f); if (n) n.textContent = 'Opening the store in a new tab to finish your signup.'; });
  });`,
   `  // newsletter forms are real Shopify customer forms; the page reloads with the confirmation
  $$('form.news').forEach(f => f.addEventListener('submit', () => { const n = $('.news-note', f); if (n) n.textContent = 'Signing you up…'; }));`],
  [`{ type: 'Store', title: 'Bag', href: STORE + '/cart', meta: 'Opens the store', kw: 'cart checkout' }`, `{ type: 'Store', title: 'Bag', href: ROUTES.cart || '/cart', meta: 'Your bag', kw: 'cart checkout bag basket' }`],
  [`      const done = () => {
        const D = window.MONOCHROME_DATA;
        const prods = D ? D.products.map(p => ({ type: 'Asset', title: p.title.trim(), href: MC.url(\`products/\${p.handle}/\`), meta: (p.priceMax > p.price ? 'From ' : '') + MC.fmt(p.price) + (p.available ? '' : ' — sold out'), kw: \`\${p.handle} \${p.category} \${p.type || ''} \${p.sizes.join(' ')}\`.toLowerCase() })) : [];
        catalog = [...pageEntries(), ...prods]; resolve(catalog);
        if (jump && jump.value) renderJump();
      };
      if (window.MONOCHROME_DATA) return done();
      const s = document.createElement('script'); s.src = MC.asset('data/products.js'); s.onload = done; s.onerror = done; document.head.appendChild(s);`,
   `      const done = list => {
        const prods = (list || []).map(p => ({ type: 'Asset', title: p.t, href: p.u, meta: (p.v ? 'From ' : '') + MC.fmt(p.p) + (p.a ? '' : ' — sold out'), kw: \`\${p.h} \${p.c} \${p.ty || ''} \${p.s || ''}\`.toLowerCase() }));
        catalog = [...pageEntries(), ...prods]; resolve(catalog);
        if (jump && jump.value) renderJump();
      };
      // the live catalogue: /collections/all?view=catalog (templates/collection.catalog.liquid), so it is always current
      fetch(MC.catalogUrl || '/collections/all?view=catalog', { headers: { Accept: 'application/json' } }).then(r => r.json()).then(done).catch(() => done([]));`],
  [`    const wait = noHover() ? 12 : 9;`, `    const wait = (+MC.magpopDelay || 9) + (noHover() ? 3 : 0);`],
  [`    if (reduce || MC.page !== 'home' || location.hash) return;`, `    if (reduce || MC.page !== 'home' || location.hash || MC.intro === false) return;`],
], 'core.js');
// never over the open bag
if (!core.includes(`!root.style.overflow && !$('.intro')`)) throw new Error('core.js: ready() pattern not found');
core = core.replace(`!root.style.overflow && !$('.intro')`, `!root.style.overflow && !MC.drawerOpen && !$('.intro')`);
wr('mc-core.js', core);

// ---- images
import { copyFileSync } from 'node:fs';
copyFileSync(join(P, 'assets/wordmark.webp'), join(A, 'mc-wordmark.webp'));
copyFileSync(join(P, 'assets/emblem.webp'), join(A, 'mc-emblem.webp'));

// ---- page scripts
wr('mc-shop.js', rd('js/shop.js'));
wr('mc-lookbook.js', rd('js/lookbook.js'));
console.log('assets synced from', P);
