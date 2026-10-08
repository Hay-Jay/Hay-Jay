import { ic } from '../partials/icons.mjs';
import { CAT, CAT_KEYS } from '../lib/store.mjs';
import { esc, sized, pad2 } from '../lib/util.mjs';

export default function about(ctx) {
  const { app } = ctx;
  const dest = app.dest, st = app.cfgStore;
  const per = CAT_KEYS.map(k => {
    const list = app.featured.filter(x => x.t === k);
    return { k, label: CAT[k], n: list.length, pic: list.find(x => x.main) };
  });
  const body = `
  <section class="ed-head" aria-labelledby="aboutH">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${ctx.href('')}">Home</a></li><li aria-current="page">About</li></ol></nav>
      <span class="eyebrow">03 / THE FORMULA</span>
      <h1 id="aboutH" class="chrome-h"><span>NO COLOUR.</span> <span>NO NOISE.</span></h1>
      <p class="lead">MONOCHROME® strips fashion down to contrast: black, white and a liquid chrome edge. Every piece is made to stand on its own and to be worn with everything else you own.</p>
    </div>
  </section>

  <section class="ed-sec" aria-labelledby="palH">
    <div class="wrap">
      <div class="sec-head"><span class="eyebrow">THE PALETTE</span><h2 id="palH" class="h2">Three materials of light</h2></div>
      <ul class="palette">
        <li class="glass pal-black"><span class="pal-sw" aria-hidden="true"></span><h3>Black</h3><p>The base tone. It takes the light and gives nothing back, so everything placed against it reads clearly.</p><span class="mono">#050505</span></li>
        <li class="glass pal-white"><span class="pal-sw" aria-hidden="true"></span><h3>White</h3><p>The contrast. A hard edge of white cuts through the dark and keeps a look sharp from across the street.</p><span class="mono">#F2F2F2</span></li>
        <li class="glass pal-chrome"><span class="pal-sw" aria-hidden="true"></span><h3>Chrome</h3><p>The finish. Rings, chains, necklaces and small details that catch whatever light is in the room.</p><span class="mono">MIRROR</span></li>
      </ul>
    </div>
  </section>

  <section class="ed-sec" aria-labelledby="ruleH">
    <div class="wrap rules-grid">
      <div class="sec-head"><span class="eyebrow">THE FORMULA</span><h2 id="ruleH" class="h2">Four rules</h2><p class="sec-p">The brand runs on a short list, and every drop is measured against it.</p></div>
      <ol class="rules">
        <li class="glass"><b class="sp-n chrome">01</b><div><h3>Two tones</h3><p>A strict palette means every piece mixes with every other piece. You never have to ask whether it goes.</p></div></li>
        <li class="glass"><b class="sp-n chrome">02</b><div><h3>Small runs</h3><p>Pieces are made in limited drops, so what you wear is not on everyone else. Some pieces return. Some do not.</p></div></li>
        <li class="glass"><b class="sp-n chrome">03</b><div><h3>Chrome finish</h3><p>Hardware, objects and details with a mirror edge. They are there to catch the light, not to shout.</p></div></li>
        <li class="glass"><b class="sp-n chrome">04</b><div><h3>Made to mix</h3><p>Tops, bottoms and objects are one system. Put a chain over a hoodie or a ring with a jersey and it still reads as one outfit.</p></div></li>
      </ol>
    </div>
  </section>

  <section class="ed-sec statement" aria-labelledby="stmtH">
    <div class="wrap">
      <span class="eyebrow">THE LINE</span>
      <h2 id="stmtH" class="chrome-h"><span>WEAR THE</span> <span>UNKNOWN.</span></h2>
      <p class="lead">It is the brief for every drop: pieces that do not explain themselves. No colour to decode and nothing to match. You bring the rest.</p>
    </div>
  </section>

  <section class="ed-sec" aria-labelledby="labH">
    <div class="wrap">
      <div class="sec-head split"><div><span class="eyebrow">WHAT IS IN THE LAB</span><h2 id="labH" class="h2">${app.items.length} pieces, four kinds</h2></div><a class="btn ghost glass" href="${ctx.href('shop/')}">Open the shop ${ic('right')}</a></div>
      <ul class="kinds">
        ${per.map((c, i) => `<li><a class="kind glass" href="${ctx.href(`shop/?c=${c.k}`)}">
          <span class="kind-pic">${c.pic ? `<img loading="lazy" decoding="async" data-img src="${esc(sized(c.pic.main.src, 600))}" alt="${esc(c.pic.n)}" width="600" height="750">` : ''}</span>
          <span class="mono">${pad2(i + 1)} / KIND</span><b>${c.label}</b><span class="kind-n">${pad2(c.n)} ${c.n === 1 ? 'piece' : 'pieces'} ${ic('ne')}</span>
        </a></li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <section class="ed-sec" aria-labelledby="fromH">
    <div class="wrap two">
      <div class="sec-head"><span class="eyebrow">WHERE FROM, WHERE TO</span><h2 id="fromH" class="h2">From ${st.city} to ${dest.count} destinations</h2></div>
      <div class="glass panel">
        <p>MONOCHROME® is based in ${st.city}, ${st.province}, Canada. The store ships worldwide, including Nigeria, and shoppers pay in Canadian dollars.</p>
        <p>Shipping rates are calculated at checkout from your address. Standard shipping inside Canada is free.</p>
        <div class="actions"><a class="btn solid" href="${ctx.href('shipping/')}">Shipping &amp; returns ${ic('right')}</a><a class="btn ghost glass" href="${ctx.href('gallery/')}">Walk the gallery</a></div>
        <a class="event mono" href="https://www.eventbrite.ca/e/monochrome-fashion-show-2025-black-white-chrome-tickets-1571923969909" target="_blank" rel="noopener">ARCHIVE / EVENT: MONOCHROME FASHION SHOW 2025 ${ic('ne')}</a>
      </div>
    </div>
  </section>`;

  return {
    path: 'about/', key: 'about', section: 'about', gl: 'ambient', hud: 'CH.03 FORMULA',
    title: 'About — The Formula — MONOCHROME®',
    description: 'The MONOCHROME® formula: black, white and chrome, two tones, small runs and a mirror finish. Pieces made to stand alone and mix with everything. Based in Regina, Canada, shipping worldwide.',
    css: ['editorial'], js: [],
    body
  };
}
