import { ic } from '../partials/icons.mjs';
import { card } from '../partials/card.mjs';
import { newsletter } from '../partials/newsletter.mjs';
import { FEATURED } from '../lib/store.mjs';
import { jsonLd } from '../lib/util.mjs';

export default function home(ctx) {
  const { app } = ctx;
  const n = app.items.length, dest = app.dest;
  const picks = FEATURED.map(h => app.byHandle(h)).filter(Boolean).slice(0, 4);
  const body = `
  <!-- CH.00 ARRIVAL -->
  <section class="hero" id="top" aria-labelledby="heroH">
    <div class="hero-top">
      <span class="mono">MONOCHROME® LAB / BLACK · WHITE · CHROME</span>
      <span class="mono hero-scroll">SCROLL ${ic('down')}</span>
    </div>
    <img class="hero-emblem" src="${ctx.asset('assets/emblem-a.webp')}" alt="" width="299" height="322">
    <div class="hero-main">
      <h1 class="hero-h" id="heroH"><span class="hl hl1 chrome">WEAR THE</span> <span class="hl hl2 chrome">UNKNOWN</span></h1>
      <div class="hero-foot">
        <p class="hero-p">Clothing and objects in two tones and one finish. Walk the gallery, browse the shop and check out on the store.</p>
        <div class="actions">
          <a class="btn solid" href="${ctx.href('gallery/')}">Enter the gallery ${ic('right')}</a>
          <a class="btn ghost glass" href="${ctx.href('shop/')}">Shop all ${n}</a>
        </div>
        <dl class="spec glass">
          <div><dt>Pieces</dt><dd>${n}</dd></div>
          <div><dt>Pricing</dt><dd>CAD</dd></div>
          <div><dt>Ships to</dt><dd>${dest.count}</dd></div>
        </dl>
      </div>
    </div>
  </section>

  <!-- 01 NOW SHOWING -->
  <section class="featured" id="featured" aria-labelledby="featH">
    <div class="wrap">
      <div class="sec-head split">
        <div><span class="eyebrow">01 / NOW SHOWING</span><h2 id="featH" class="chrome-h"><span>FRESH FROM</span> <span>THE LAB.</span></h2></div>
        <div class="sec-side">
          <p class="sec-p">Four pieces to start with. Every one has its own page with photos, sizes and a direct line to checkout.</p>
          <a class="btn ghost glass" href="${ctx.href('shop/')}">See all ${n} pieces ${ic('right')}</a>
        </div>
      </div>
      <ul class="fstrip">
        ${picks.map((x, i) => `<li>${card(ctx, x, i, { sizes: '(min-width:1100px) 22vw, (min-width:760px) 44vw, 46vw' })}</li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <!-- 02 THE FORMULA (teaser) -->
  <section class="brand-t" id="brand" aria-labelledby="brandH">
    <div class="wrap brand-grid">
      <div class="brand-copy">
        <span class="eyebrow">02 / THE FORMULA</span>
        <h2 id="brandH" class="chrome-h"><span>NO COLOUR.</span> <span>NO NOISE.</span></h2>
        <p class="lead">Fashion stripped down to contrast: black, white and a liquid chrome edge. Every piece stands alone and mixes with everything else you own.</p>
        <a class="btn ghost glass" href="${ctx.href('about/')}">Read the formula ${ic('right')}</a>
      </div>
      <ul class="mini-spec">
        <li class="glass"><b class="sp-n chrome">01</b><div><h3>Two tones</h3><p>One strict palette, so everything mixes.</p></div><span class="sw" aria-hidden="true"><i style="background:#050505"></i><i style="background:#f2f2f2"></i></span></li>
        <li class="glass"><b class="sp-n chrome">02</b><div><h3>Small runs</h3><p>Limited drops. Not on everyone else.</p></div><span class="sw" aria-hidden="true"><i class="tick"></i><i class="tick"></i><i class="tick"></i></span></li>
        <li class="glass"><b class="sp-n chrome">03</b><div><h3>Chrome finish</h3><p>Hardware and details that catch light.</p></div><span class="sw" aria-hidden="true"><i class="mirror"></i></span></li>
      </ul>
    </div>
  </section>

  <!-- 03 WORLDWIDE (teaser) -->
  <section class="world-t" id="world" aria-labelledby="worldH">
    <div class="wrap">
      <span class="eyebrow">03 / WORLDWIDE</span>
      <h2 id="worldH" class="chrome-h"><span>SHIPS</span> <span>WORLDWIDE.</span></h2>
      <div class="world-row">
        <p class="sec-p">Orders leave from ${app.cfgStore.city}, ${app.cfgStore.province}, Canada for ${dest.count} destinations, Nigeria included. Standard shipping inside Canada is free. Everywhere else the rate is calculated at checkout from your address.</p>
        <ul class="world-chips" aria-label="Highlighted destinations">
          <li class="chip-d home"><b>CA</b>${dest.name('CA')}<em>Free standard shipping</em></li>
          <li class="chip-d home"><b>NG</b>${dest.name('NG')}<em>Rate at checkout</em></li>
          <li class="chip-d more"><b>+${dest.count - 2}</b>more destinations</li>
        </ul>
        <a class="btn ghost glass" href="${ctx.href('shipping/')}">Shipping &amp; returns ${ic('right')}</a>
      </div>
    </div>
  </section>

  <!-- 04 SIGNAL -->
  <section class="signal" id="signal" aria-labelledby="signalH">
    <div class="wrap signal-grid">
      <div>
        <span class="eyebrow">04 / SIGNAL</span>
        <h2 id="signalH" class="chrome-h"><span>STAY IN</span> <span>ORBIT.</span></h2>
      </div>
      <div class="signal-form">
        <p class="sec-p">New drops are small and some do not return. Leave your email and we will tell you first.</p>
        ${newsletter(ctx, { id: 'news' })}
        <p class="signal-links"><a href="${ctx.href('contact/')}">More ways to reach us ${ic('right')}</a></p>
      </div>
    </div>
  </section>`;

  const after = `
<!-- FINALE: unveiled chrome moment (3D mode only). The blob re-forms into the emblem behind it. -->
<div class="finale" id="finale" aria-hidden="true">
  <span class="mono fin-t">WEAR THE UNKNOWN</span>
  <span class="mono fin-t">END OF TRANSMISSION</span>
</div>`;

  return {
    path: '', key: 'home', section: '', gl: 'hero', hud: 'CH.00 ARRIVAL',
    title: 'MONOCHROME® — Wear the Unknown',
    description: `MONOCHROME® is a black, white and chrome clothing and accessories brand. Browse tops, bottoms, rings and chains, walk the 3D gallery, and check out on the store. Ships worldwide, Nigeria included.`,
    css: ['home'], js: [],
    body, afterMain: after,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'MONOCHROME', url: ctx.abs(''), logo: ctx.abs('assets/emblem.webp'), sameAs: ['https://www.instagram.com/monochrome.ca/'], email: 'info.mccanada@gmail.com' },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'MONOCHROME®', url: ctx.abs('') }
    ]
  };
}
