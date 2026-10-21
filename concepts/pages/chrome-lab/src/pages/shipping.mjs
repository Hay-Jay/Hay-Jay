import { ic } from '../partials/icons.mjs';
import { globe } from '../partials/globe.mjs';
import { esc } from '../lib/util.mjs';

export default function shipping(ctx) {
  const { app } = ctx;
  const dest = app.dest, st = app.cfgStore;
  const others = dest.count - 2;
  const body = `
  <section class="ship-hero" aria-labelledby="shipH">
    <div class="wrap ship-grid">
      <div class="ship-copy">
        <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${ctx.href('')}">Home</a></li><li aria-current="page">Shipping</li></ol></nav>
        <span class="eyebrow">04 / ROUTES</span>
        <h1 id="shipH" class="chrome-h"><span>SHIPS</span> <span>WORLDWIDE.</span></h1>
        <p class="lead">Orders leave from ${st.city}, ${st.province}, Canada. The store delivers to ${dest.count} destinations, Nigeria included.</p>
        <ul class="route-cards">
          <li class="glass rc-ca"><b class="rc-code chrome" aria-hidden="true">CA</b><div><span class="mono">ORIGIN / CANADA</span><h2>Free standard shipping</h2><p>Orders to anywhere in Canada ship free with standard shipping. The checkout confirms it for your address.</p></div></li>
          <li class="glass rc-ng"><b class="rc-code chrome" aria-hidden="true">NG</b><div><span class="mono">DELIVERED / NIGERIA</span><h2>Nigeria is on the route</h2><p>The store delivers to Nigeria. The rate is calculated at checkout from your address, so you see the cost before you pay.</p></div></li>
        </ul>
      </div>
      ${globe(ctx, dest)}
    </div>
  </section>

  <section class="ed-sec rest-sec" aria-label="Everywhere else">
    <div class="wrap">
      <div class="rest glass">
        <div class="rest-copy"><span class="mono">+${others} / REST OF THE WORLD</span><h2 class="h2">Calculated at checkout</h2><p>Every other destination below works the same way: enter your address at checkout and the store shows the shipping rate before you pay. We do not quote prices or delivery times on this page.</p></div>
        <dl class="facts">
          <div><dt>Origin</dt><dd>${st.city}, ${st.province}, Canada</dd></div>
          <div><dt>Destinations</dt><dd>${dest.count}</dd></div>
          <div><dt>Pricing</dt><dd>Canadian dollars (CAD)</dd></div>
          <div><dt>Shipping rates</dt><dd>Calculated at checkout</dd></div>
        </dl>
      </div>
    </div>
  </section>

  <section class="ed-sec" aria-labelledby="destH">
    <div class="wrap">
      <div class="sec-head split"><div><span class="eyebrow">DESTINATIONS / ${dest.count}</span><h2 id="destH" class="h2">Where the store delivers</h2></div>
        <p class="sec-p">Canada and Nigeria are highlighted. The list comes straight from the store's shipping settings.</p></div>
      <div class="dest glass">
        <ul class="dest-list" aria-label="Destinations">
          ${dest.sorted.map(c => `<li${c === 'CA' ? ' class="home"' : c === 'NG' ? ' class="home ng"' : ''}><b>${esc(c)}</b>${esc(dest.name(c))}</li>`).join('\n          ')}
        </ul>
      </div>
    </div>
  </section>

  <section class="ed-sec" aria-labelledby="howH">
    <div class="wrap">
      <div class="sec-head"><span class="eyebrow">HOW IT WORKS</span><h2 id="howH" class="h2">From bag to doorstep</h2></div>
      <ol class="steps">
        <li class="glass"><b class="chrome">01</b><h3>Pick your pieces</h3><p>Choose your size or option on the product page and press Add to bag. It opens your bag on the Monochrome store.</p></li>
        <li class="glass"><b class="chrome">02</b><h3>Enter your address</h3><p>At checkout the store reads your destination and shows the shipping rate for it.</p></li>
        <li class="glass"><b class="chrome">03</b><h3>Pay in CAD</h3><p>All prices are in Canadian dollars. If your card is in another currency, your bank converts it.</p></li>
        <li class="glass"><b class="chrome">04</b><h3>Delivery</h3><p>The delivery options for your address are shown at checkout. The store's shipping policy has the details.</p></li>
      </ol>
      <p class="fine">The store's own terms always apply: <a href="${ctx.store('/policies/shipping-policy')}" data-store="/policies/shipping-policy" target="_blank" rel="noopener">shipping policy ${ic('ne')}</a></p>
    </div>
  </section>

  <section class="ed-sec" id="returns" aria-labelledby="retH">
    <div class="wrap two">
      <div class="sec-head"><span class="eyebrow">RETURNS &amp; EXCHANGES</span><h2 id="retH" class="h2">If it is not right</h2></div>
      <div class="glass panel">
        <p>If something does not fit or is not what you expected, contact us soon after your order arrives and include your order number.</p>
        <ul class="tick-list">
          <li>Tell us whether you would like an exchange or a return.</li>
          <li>Keep the piece in the condition you received it while we sort it out.</li>
          <li>The store's returns policy has the final word on what can be returned, when and at whose cost.</li>
        </ul>
        <div class="actions"><a class="btn solid" href="${ctx.store('/policies/refund-policy')}" data-store="/policies/refund-policy" target="_blank" rel="noopener">Returns policy ${ic('ne')}</a><a class="btn ghost glass" href="mailto:info.mccanada@gmail.com">Email us</a></div>
      </div>
    </div>
  </section>

  <section class="ed-sec" id="size" aria-labelledby="sizeH">
    <div class="wrap two">
      <div class="sec-head"><span class="eyebrow">SIZE GUIDANCE</span><h2 id="sizeH" class="h2">Finding your size</h2></div>
      <div class="glass panel">
        <p>Every product page lists the sizes for that piece, and a size that is sold out cannot be selected. We do not publish measurements here. If you are between two sizes, going up is the safe choice.</p>
        <ul class="tick-list">
          <li><b>Tops and bottoms:</b> choose from the sizes listed on the product page.</li>
          <li><b>Rings:</b> listed in numbered sizes. Check a ring you already wear before you order.</li>
          <li><b>Chains and necklaces:</b> choose the option shown on the product page.</li>
          <li><b>Gift cards:</b> no size. Choose an amount.</li>
        </ul>
        <p>Still not sure? Message us on Instagram or email and tell us what you usually wear. We will help you choose.</p>
        <div class="actions"><a class="btn ghost glass" href="${ctx.href('contact/')}">Contact us ${ic('right')}</a><a class="btn ghost glass" href="${ctx.href('faq/#sizing')}">Sizing FAQ</a></div>
      </div>
    </div>
  </section>`;

  return {
    path: 'shipping/', key: 'shipping', section: 'shipping', gl: 'ambient', hud: 'CH.04 ROUTES',
    title: 'Shipping, Returns & Sizing — MONOCHROME®',
    description: `MONOCHROME® ships worldwide from ${st.city}, Canada to ${dest.count} destinations, Nigeria included. Free standard shipping in Canada, rates calculated at checkout elsewhere. Returns and size guidance.`,
    css: ['editorial'], js: [],
    body
  };
}
