import { ic } from '../partials/icons.mjs';
import { card } from '../partials/card.mjs';
import { jsonScript, fmt } from '../lib/util.mjs';
import { priceText, CAT } from '../lib/store.mjs';

export default function gallery(ctx) {
  const { app } = ctx;
  const g = app.gallery;
  // what the 3D scene and the caption need, no more
  const data = g.map(x => ({
    h: x.h, n: x.n, src: x.main.src, w: x.main.w, ht: x.main.h, t: x.t, type: x.type, cat: CAT[x.t], avail: x.avail,
    price: priceText(x, fmt), sizes: x.sizes.slice(0, 7), zoom: app.isRing(x) && x.main.w >= 4500 ? 2 : 1
  }));
  const body = `
  <section class="gallery" id="gallery" aria-labelledby="galH" style="--n:${g.length}">
    <div class="gl-stage" id="glStage">
      <div class="gl-intro" id="glIntro">
        <span class="eyebrow">02 / THE GALLERY</span>
        <h1 id="galH" class="chrome-h"><span>THE</span> <span>GALLERY</span></h1>
        <p class="gl-sub"><span class="gl-sub-gl">Scroll to travel. Click or tap a piece to open its page.</span><span class="gl-sub-grid">${g.length} pieces from the shop. Open one for sizes and checkout. Prices are in CAD.</span></p>
        <p class="gl-sub-links"><a class="can3d-only" href="${ctx.href('gallery/')}">Enter the 3D tunnel ${ic('right')}</a></p>
      </div>

      <div class="gl-cap glass" id="glCap" aria-hidden="true">
        <div class="cap-top"><span class="mono" id="capId">LAB-01</span><span class="mono" id="capCat">TOPS</span><span class="mono cap-pos" id="capPos">01 / ${String(g.length).padStart(2, '0')}</span></div>
        <h2 class="cap-title" id="capTitle">&nbsp;</h2>
        <div class="cap-row"><b class="cap-price" id="capPrice">&nbsp;</b><span class="cap-sizes" id="capSizes"></span></div>
        <a class="btn solid cap-open" id="capOpen" href="${ctx.href(`products/${g[0].h}/`)}" tabindex="-1">Open piece ${ic('ne')}</a>
      </div>

      <div class="gl-rail" id="glRail" aria-hidden="true"></div>
      <div class="gl-hint mono" id="glHint" aria-hidden="true"><span>SCROLL</span>${ic('down')}</div>
      <div class="gl-tools">
        <a class="gl-skip mono" href="#end">Skip tunnel ${ic('down')}</a>
        <a class="gl-skip mono" href="${ctx.href('gallery/?view=grid')}" data-view-grid>Grid view</a>
      </div>

      <ol class="gl-list" id="glList" aria-label="Featured pieces">
        ${g.map((x, i) => `<li>${card(ctx, x, i, { sizes: '(min-width:1100px) 25vw, (min-width:760px) 33vw, 50vw' })}</li>`).join('\n        ')}
      </ol>
    </div>
  </section>

  <section class="gl-end finale" id="end" aria-labelledby="endH">
    <div class="gl-end-in">
      <span class="eyebrow">END OF TRANSMISSION</span>
      <h2 id="endH" class="chrome-h"><span>WEAR THE</span> <span>UNKNOWN.</span></h2>
      <p class="sec-p">That is the whole collection in one pass. Every piece has its own page, and the shop lists all ${app.items.length} with filters.</p>
      <div class="actions">
        <a class="btn solid" href="${ctx.href('shop/')}">Shop all ${app.items.length} ${ic('right')}</a>
        <a class="btn ghost glass" href="${ctx.href('about/')}">The formula</a>
        <a class="btn ghost glass" href="#main" data-top>Back to the start ${ic('up')}</a>
      </div>
    </div>
  </section>
  ${jsonScript('mc-gallery', data)}`;

  return {
    path: 'gallery/', key: 'gallery', section: 'gallery', gl: 'tunnel', hud: 'CH.02 GALLERY',
    title: 'The Gallery — MONOCHROME®',
    description: `Travel through the MONOCHROME® gallery: a liquid-chrome 3D tunnel of ${g.length} pieces in black, white and chrome. Click any piece to open its page, or switch to the grid view.`,
    css: ['gallery'], js: ['gallery'],
    body,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'The Gallery', url: ctx.abs('gallery/'),
      mainEntity: { '@type': 'ItemList', numberOfItems: g.length, itemListElement: g.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: ctx.abs(`products/${x.h}/`), name: x.n })) }
    }]
  };
}
