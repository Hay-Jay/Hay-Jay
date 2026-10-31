import { ic } from '../partials/icons.mjs';
import { card } from '../partials/card.mjs';
import { CAT, CAT_ONE } from '../lib/store.mjs';
import { esc, fmt, pad2, sized, srcset, nb, trim, jsonScript } from '../lib/util.mjs';

const GENERIC = {
  top: 'Part of the MONOCHROME® tops range: black, white and a chrome edge, made in small runs to mix with the rest of your wardrobe.',
  bottom: 'Part of the MONOCHROME® bottoms range: black, white and a chrome edge, made in small runs to mix with the rest of your wardrobe.',
  accessory: 'A MONOCHROME® object in black, white and chrome. Small runs, made to be worn with everything else you own.',
  gift: 'A MONOCHROME® gift card, redeemable on the Monochrome store.'
};

// A sentence-case pass for store descriptions typed without capitals ("please contact ...").
const sentence = s => s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase());

const hasChoice = p => p.options.length && !(p.options.length === 1 && p.options[0].values.length === 1 && /default/i.test(p.options[0].values[0]));

export default function product(ctx, x) {
  const { app, cfg } = ctx;
  const p = x.d;
  const idx = app.items.indexOf(x);
  const pos = app.featured.indexOf(x);
  const first = p.variants.find(v => v.available) || p.variants[0];
  const sel = first ? first.options.slice() : [];
  const any = p.available;
  const prices = p.variants.map(v => v.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const range = hi > lo;
  const catLabel = CAT[x.t] || x.t;
  const desc = p.description ? sentence(p.description.trim()) : '';
  const lead = desc || GENERIC[x.t] || GENERIC.accessory;
  const dest = app.dest;

  // ---------- gallery (all photos, server-rendered) ----------
  const shots = p.images.map((im, i) => {
    const r = im.w / im.h;
    const w = 1400, h = Math.round(w / r);
    return `<li class="${i === 0 ? 'on' : ''}" style="--bd:url('${esc(sized(im.src, 48))}')">
            <img src="${esc(sized(im.src, w))}" srcset="${srcset(im.src, [700, 1000, 1400, 1800])}" sizes="(min-width:1000px) 54vw, 100vw" alt="${esc(x.n)}, photo ${i + 1} of ${p.images.length}" width="${w}" height="${h}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-img>
          </li>`;
  }).join('\n          ');
  const thumbs = p.images.length > 1 ? p.images.map((im, i) =>
    `<button type="button" class="${i === 0 ? 'on' : ''}" aria-label="Photo ${i + 1} of ${p.images.length}" aria-current="${i === 0}"><img loading="lazy" decoding="async" src="${esc(sized(im.src, 160))}" alt="" width="64" height="76"></button>`).join('') : '';

  // ---------- options (server-rendered, JS makes them live) ----------
  const shown = hasChoice(p) ? p.options.map((o, oi) => ({ o, oi })).filter(({ o }) => o.values.length > 1) : [];
  const chipsHtml = shown.map(({ o, oi }) => `
        <div class="opt" role="group" aria-labelledby="optl-${oi}">
          <span class="opt-name" id="optl-${oi}">${esc(o.name)}</span>
          <div class="chips">${o.values.map(val => {
            const ok = p.variants.some(v => v.available && v.options[oi] === val && v.options.every((ov, k) => k === oi || ov === sel[k]));
            const on = sel[oi] === val;
            return `<button type="button" class="chip${on ? ' on' : ''}" data-o="${oi}" data-v="${esc(val)}"${ok ? '' : ' disabled'} aria-pressed="${on}">${esc(val)}</button>`;
          }).join('')}</div>
        </div>`).join('');
  const staticOpts = hasChoice(p) ? p.options.filter(o => o.values.length > 1).map(o => `<li><b>${esc(o.name)}</b> ${o.values.map(esc).join(', ')}</li>`).join('') : '';

  // ---------- pieces of copy ----------
  const priceNow = first ? first.price : lo;
  const shipNote = dest.has('NG') && dest.has('CA')
    ? `Ships worldwide from ${app.cfgStore.city}, Canada to ${dest.count} destinations, Nigeria included. Shipping rate is calculated at checkout (free standard shipping in Canada).`
    : `Ships from ${app.cfgStore.city}, Canada. Shipping rate is calculated at checkout.`;
  const title = `${x.n} — MONOCHROME®`;
  const metaDesc = trim(`${x.n}${x.type ? ` (${x.type.toLowerCase()})` : ''}, ${range ? 'from ' : ''}${fmt(lo)} CAD. ${lead} ${any ? 'Ships worldwide from Canada, Nigeria included.' : 'Currently sold out.'}`, 158);
  const url = ctx.abs(`products/${x.h}/`);
  const imgs = p.images.map(i => sized(i.src, 1200));
  const offer = v => ({ '@type': 'Offer', url, price: v.price.toFixed(2), priceCurrency: 'CAD', availability: `https://schema.org/${v.available ? 'InStock' : 'OutOfStock'}`, itemCondition: 'https://schema.org/NewCondition' });
  const offers = range
    ? { '@type': 'AggregateOffer', url, priceCurrency: 'CAD', lowPrice: lo.toFixed(2), highPrice: hi.toFixed(2), offerCount: p.variants.length, availability: `https://schema.org/${any ? 'InStock' : 'OutOfStock'}`, offers: p.variants.map(offer) }
    : { ...offer({ price: lo, available: any }) };
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Product', name: x.n, description: lead, url, image: imgs, sku: String(first ? first.id : x.h),
      category: x.type || catLabel, brand: { '@type': 'Brand', name: 'MONOCHROME' }, offers
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ctx.abs('') },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: ctx.abs('shop/') },
        { '@type': 'ListItem', position: 3, name: catLabel, item: ctx.abs(`shop/?c=${x.t}`) },
        { '@type': 'ListItem', position: 4, name: x.n, item: url }
      ]
    }
  ];

  const rel = app.related(x);
  const prev = app.featured[(pos - 1 + app.featured.length) % app.featured.length];
  const next = app.featured[(pos + 1) % app.featured.length];
  const pdata = { h: x.h, currency: 'CAD', range, options: p.options, variants: p.variants.map(v => ({ id: v.id, options: v.options, price: v.price, available: v.available })), shown: shown.map(s => s.oi) };

  const body = `
  <section class="pdp" aria-labelledby="pTitle">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><ol>
        <li><a href="${ctx.href('')}">Home</a></li>
        <li><a href="${ctx.href('shop/')}">Shop</a></li>
        <li><a href="${ctx.href(`shop/?c=${x.t}`)}">${catLabel}</a></li>
        <li aria-current="page">${esc(x.n)}</li>
      </ol></nav>

      <div class="pdp-grid">
        <div class="stage" id="stage" data-count="${p.images.length}" role="group" aria-roledescription="gallery" aria-label="Photos of ${esc(x.n)}">
          <div class="stage-main" id="stageMain">
            <i class="crop tl" aria-hidden="true"></i><i class="crop tr" aria-hidden="true"></i><i class="crop bl" aria-hidden="true"></i><i class="crop br" aria-hidden="true"></i>
            <ol class="shots" id="shots">
          ${shots}
            </ol>
            ${p.images.length > 1 ? `<span class="stage-count mono js-only" id="shotCount" aria-live="polite">01 / ${pad2(p.images.length)}</span>
            <button class="stage-nav prev js-only" id="shotPrev" type="button" aria-label="Previous photo">${ic('left')}</button>
            <button class="stage-nav next js-only" id="shotNext" type="button" aria-label="Next photo">${ic('right')}</button>` : ''}
          </div>
          ${thumbs ? `<div class="thumbs js-only" id="thumbs">${thumbs}</div>` : ''}
        </div>

        <div class="buy">
          <div class="buy-card glass">
            <div class="buy-top"><span class="mono p-type">${esc((x.type || CAT_ONE[x.t] || catLabel).toUpperCase())} / LAB-${pad2(idx + 1)}</span><div class="gl-accent" data-gl-host aria-hidden="true"></div></div>
            <h1 id="pTitle" class="p-title">${nb(x.n)}</h1>
            <p class="p-price"><span class="from">${range ? 'From ' : ''}</span><b id="pPrice">${fmt(priceNow)}</b> <span class="cad">CAD</span></p>
            ${range ? `<p class="p-range">From ${fmt(lo)}. The price depends on the option you choose.</p>` : ''}
            <p class="p-avail" id="pAvail" data-state="${any ? 'in' : 'out'}"><i aria-hidden="true"></i><span>${any ? 'In stock' : 'Sold out'}</span></p>
            ${staticOpts ? `<ul class="opts-static nojs-only">${staticOpts}</ul>` : ''}
            ${shown.length ? `<div class="opts js-only" id="opts">${chipsHtml}
            </div>` : ''}
            <p class="p-desc">${esc(lead)}</p>
            <ul class="notes">
              <li>${ic('star')}<span>${esc(shipNote)} <a href="${ctx.href('shipping/')}">Shipping &amp; returns</a></span></li>
              <li>${ic('star')}<span>Prices are in Canadian dollars (CAD). Checkout happens on the Monochrome store.</span></li>
            </ul>
          </div>
          <div class="buy-bar">
            <p class="bar-price" id="barPrice" aria-hidden="true">${fmt(priceNow)}</p>
            ${any ? `<a class="btn solid buy-js js-only" id="buy" href="${esc(ctx.store(`/cart/${first.id}:1`))}" target="_blank" rel="noopener">Add to bag ${ic('ne')}</a>
            <a class="btn solid buy-nojs nojs-only" href="${esc(ctx.store(`/products/${x.h}`))}" target="_blank" rel="noopener">Buy on the store ${ic('ne')}</a>
            <button class="btn solid" id="sold" type="button" disabled hidden>Sold out</button>`
              : `<button class="btn solid" id="sold" type="button" disabled>Sold out</button>`}
          </div>
          ${any ? '' : `<p class="sold-note">This piece is sold out. <a href="${ctx.href('contact/')}">Get drop alerts</a> or <a href="${ctx.href('shop/')}">browse what is in stock</a>.</p>`}
        </div>
      </div>
    </div>
  </section>

  <section class="pdp-more" aria-label="Shipping, returns and sizing">
    <div class="wrap more-grid">
      <article class="glass"><span class="mono">01 / SHIPPING</span><h2>Worldwide</h2><p>${esc(shipNote)}</p><a href="${ctx.href('shipping/')}">See every destination ${ic('right')}</a></article>
      <article class="glass"><span class="mono">02 / RETURNS</span><h2>If it is not right</h2><p>Contact us soon after your order arrives with your order number. The store's returns policy has the final word.</p><a href="${ctx.href('shipping/#returns')}">Returns &amp; exchanges ${ic('right')}</a></article>
      <article class="glass"><span class="mono">03 / SIZING</span><h2>Finding your size</h2><p>${x.t === 'gift' ? 'Gift cards need no size. Pick an amount above.' : 'Pick from the sizes listed above. Between two sizes, going up is the safe choice. Not sure? Message us and we will help you choose.'}</p><a href="${ctx.href('shipping/#size')}">Size guidance ${ic('right')}</a></article>
    </div>
  </section>

  <section class="related" aria-labelledby="relH">
    <div class="wrap">
      <div class="sec-head split">
        <div><span class="eyebrow">MORE FROM THE LAB</span><h2 id="relH" class="chrome-h"><span>KEEP</span> <span>LOOKING.</span></h2></div>
        <a class="btn ghost glass" href="${ctx.href('shop/')}">All ${app.items.length} pieces ${ic('right')}</a>
      </div>
      <ul class="rel-grid">
        ${rel.map((y, i) => `<li>${card(ctx, y, i)}</li>`).join('\n        ')}
      </ul>
      <nav class="pn" aria-label="Previous and next piece">
        <a class="pn-a prev glass" href="${ctx.href(`products/${prev.h}/`)}" rel="prev"><span class="mono">${ic('left')} PREVIOUS</span><b>${esc(prev.n)}</b></a>
        <a class="pn-a next glass" href="${ctx.href(`products/${next.h}/`)}" rel="next"><span class="mono">NEXT ${ic('right')}</span><b>${esc(next.n)}</b></a>
      </nav>
    </div>
  </section>
  ${jsonScript('pdata', pdata)}`;

  return {
    path: `products/${x.h}/`, key: 'product', section: 'shop', gl: 'ambient', hud: `LAB-${pad2(idx + 1)} ${catLabel.toUpperCase()}`,
    title, description: metaDesc, ogType: 'product', ogTitle: x.n, ogImage: imgs[0],
    css: ['product'], js: ['product'],
    body, jsonld: ld
  };
}
