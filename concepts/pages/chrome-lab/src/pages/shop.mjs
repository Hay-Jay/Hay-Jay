import { ic } from '../partials/icons.mjs';
import { card } from '../partials/card.mjs';
import { CAT, CAT_KEYS } from '../lib/store.mjs';
import { pad2 } from '../lib/util.mjs';

export default function shop(ctx) {
  const { app } = ctx;
  const list = app.featured;
  const n = list.length;
  const counts = Object.fromEntries(CAT_KEYS.map(k => [k, list.filter(x => x.t === k).length]));
  const bigFirst = list[0] && list[0].avail && n >= 8;
  const filters = [['all', 'All', n], ...CAT_KEYS.map(k => [k, CAT[k], counts[k]])];
  const body = `
  <section class="shop-head" aria-labelledby="shopH">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${ctx.href('')}">Home</a></li><li aria-current="page">Shop</li></ol></nav>
      <div class="sh-grid">
        <div>
          <span class="eyebrow">01 / THE SHOP</span>
          <h1 id="shopH" class="chrome-h"><span>THE</span> <span>ARCHIVE.</span></h1>
        </div>
        <div class="sh-side">
          <p class="sec-p">Every piece from the Monochrome store, in one place. Open one for photos, sizes and a direct line to checkout. <strong>All prices are in Canadian dollars (CAD).</strong></p>
          <dl class="sh-stats">
            <div><dt>Pieces</dt><dd>${pad2(n)}</dd></div>
            <div><dt>Kinds</dt><dd>${pad2(CAT_KEYS.length)}</dd></div>
            <div><dt>Pricing</dt><dd>CAD</dd></div>
          </dl>
        </div>
      </div>
    </div>
  </section>

  <section class="shop" aria-label="All products">
    <div class="wrap">
      <div class="toolbar glass js-only" id="toolbar">
        <div class="filters" role="group" aria-label="Filter products">
          ${filters.map(([k, label, c], i) => `<button class="filter${i ? '' : ' on'}" data-filter="${k}" type="button" aria-pressed="${i ? 'false' : 'true'}">${label}<sup>${c}</sup></button>`).join('\n          ')}
        </div>
        <div class="sortwrap"><label for="sort" class="mono">SORT</label>
          <select id="sort"><option value="featured">Featured</option><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div>
      </div>
      <p class="count mono" id="count" aria-live="polite" role="status">${pad2(n)} pieces / prices in CAD</p>
      <script>(function(){try{var c=new URLSearchParams(location.search).get('c');if(/^(top|bottom|accessory|gift)$/.test(c))document.documentElement.setAttribute('data-f',c)}catch(e){}})()</script>
      <div class="products" id="products">
        ${list.map((x, i) => card(ctx, x, i, { feat: bigFirst && i === 0, eager: i < 4 })).join('\n        ')}
      </div>
      <div class="empty" id="empty" hidden>
        <p>Nothing in this category right now. Check back soon.</p>
        <button class="btn ghost glass" type="button" id="emptyReset">Show all pieces</button>
      </div>
      <div class="center"><a class="btn ghost glass" href="${ctx.store('/collections/all')}" data-store="/collections/all" target="_blank" rel="noopener">View the complete store ${ic('ne')}</a></div>
    </div>
  </section>`;

  return {
    path: 'shop/', key: 'shop', section: 'shop', gl: 'off', hud: 'CH.01 ARCHIVE',
    title: `Shop all ${n} pieces — MONOCHROME®`,
    description: `Shop all ${n} MONOCHROME® pieces: tops, bottoms, rings, chains, necklaces and gift cards in black, white and chrome. Prices in CAD, shipping worldwide from Canada, Nigeria included.`,
    css: ['shop'], js: ['shop'],
    body,
    jsonld: [
      {
        '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Shop all pieces', url: ctx.abs('shop/'),
        mainEntity: { '@type': 'ItemList', numberOfItems: n, itemListElement: list.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: ctx.abs(`products/${x.h}/`), name: x.n })) }
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: ctx.abs('') }, { '@type': 'ListItem', position: 2, name: 'Shop', item: ctx.abs('shop/') }]
      }
    ]
  };
}
