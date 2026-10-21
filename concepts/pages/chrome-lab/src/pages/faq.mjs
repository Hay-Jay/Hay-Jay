import { ic } from '../partials/icons.mjs';
import { esc } from '../lib/util.mjs';

export default function faq(ctx) {
  const { app } = ctx;
  const dest = app.dest, st = app.cfgStore;
  const groups = [
    ['ordering', 'Ordering', [
      ['Where do I buy?', `Every piece is sold through the Monochrome store. Open a product page here, pick your size and press Add to bag. That puts the piece in your bag on the store, where you check out.`],
      ['Which currency are prices in?', `Every price on this site is in Canadian dollars (CAD), the same as the store. If your card is in another currency, your bank handles the conversion.`],
      ['Do you do custom orders or collaborations?', `Yes, we are open to it. Custom pieces, a collab or a bulk order: email info.mccanada@gmail.com with the details and we will get back to you. The custom jersey takes up to 10 characters; email us with any follow-up questions.`],
      ['Are drops limited?', `Yes. Pieces are made in small runs and some do not return. Join the drop alerts on the contact page to hear about new releases first.`]
    ]],
    ['shipping', 'Shipping', [
      ['Do you ship to Nigeria and the rest of the world?', `Yes. The store ships from ${st.city}, Canada to ${dest.count} destinations, including Nigeria, Canada, the United States and the United Kingdom. The full list is on the <a href="${ctx.href('shipping/')}">shipping page</a>.`],
      ['How much is shipping?', `Standard shipping inside Canada is free. For every other destination the rate is calculated at checkout from your address, so you see the exact cost before you pay.`],
      ['How long does delivery take?', `Delivery time depends on where you are and which shipping option you choose at checkout. The options for your address are shown there before you pay, and we do not quote delivery times on this site.`]
    ]],
    ['sizing', 'Sizing &amp; returns', [
      ['How does sizing work?', `Each product page lists the sizes for that piece, and a size that is sold out cannot be selected. If you are between two sizes, going up is the safe choice, and you can message us if you want a recommendation. See the <a href="${ctx.href('shipping/#size')}">size guidance</a>.`],
      ['What if it does not fit?', `Contact us soon after your order arrives with your order number. The final terms are in the store's <a href="${ctx.store('/policies/refund-policy')}" data-store="/policies/refund-policy" target="_blank" rel="noopener">returns policy</a>; there is a summary on the <a href="${ctx.href('shipping/#returns')}">shipping page</a>.`]
    ]],
    ['brand', 'The brand', [
      ['What does MONOCHROME® make?', `Tops, bottoms, rings, chains, necklaces and gift cards, all in black, white and chrome. The <a href="${ctx.href('about/')}">about page</a> explains the formula.`],
      ['Where are you based?', `${st.city}, ${st.province}, Canada. Orders ship from there.`]
    ]]
  ];
  const qs = groups.flatMap(g => g[2]);
  const strip = h => h.replace(/<[^>]+>/g, '');
  const body = `
  <section class="faq-sec" aria-labelledby="faqH">
    <div class="wrap faq-grid">
      <div class="faq-rail">
        <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${ctx.href('')}">Home</a></li><li aria-current="page">FAQ</li></ol></nav>
        <span class="eyebrow">05 / HELP</span>
        <h1 id="faqH" class="chrome-h"><span>QUESTIONS.</span> <span>ANSWERED.</span></h1>
        <div class="faq-find js-only glass">
          <label class="mono" for="faqQ">SEARCH THE ${qs.length} ANSWERS</label>
          <div class="faq-find-row">${ic('search')}<input id="faqQ" type="search" placeholder="Try &ldquo;Nigeria&rdquo;, &ldquo;size&rdquo; or &ldquo;returns&rdquo;" autocomplete="off" spellcheck="false" aria-controls="faqList"></div>
          <p class="faq-count mono" id="faqCount" role="status" aria-live="polite"></p>
        </div>
        <ol class="jump" aria-label="Jump to a topic">${groups.map(([id, label, items], gi) => `<li><a href="#${id}"><span class="mono">${String(gi + 1).padStart(2, '0')}</span>${label}<em class="mono">${String(items.length).padStart(2, '0')}</em></a></li>`).join('')}</ol>
        <aside class="faq-side glass" aria-label="Still have a question?">
          <span class="mono">STILL CURIOUS?</span>
          <p>Ask about sizing, custom pieces or a collab and we will get back to you.</p>
          <div class="actions"><a class="btn solid" href="mailto:info.mccanada@gmail.com">Email us ${ic('ne')}</a>
          <a class="btn ghost glass" href="https://www.instagram.com/monochrome.ca/" target="_blank" rel="noopener">@monochrome.ca ${ic('ne')}</a></div>
        </aside>
      </div>
      <div class="faq-groups" id="faqList">
        ${groups.map(([id, label, items], gi) => `<section class="faq-group" id="${id}" aria-labelledby="${id}-h">
          <h2 class="faq-h" id="${id}-h"><span class="mono">${String(gi + 1).padStart(2, '0')}</span>${label}</h2>
          <div class="faq-list">
          ${items.map(([q, a]) => `<details class="glass"><summary>${esc(q)}</summary><p>${a}</p></details>`).join('\n          ')}
          </div>
        </section>`).join('\n        ')}
        <aside class="faq-side faq-end glass" aria-label="Still have a question?">
          <span class="mono">STILL CURIOUS?</span>
          <p>Ask about sizing, custom pieces or a collab and we will get back to you.</p>
          <div class="actions"><a class="btn solid" href="mailto:info.mccanada@gmail.com">Email us ${ic('ne')}</a>
          <a class="btn ghost glass" href="https://www.instagram.com/monochrome.ca/" target="_blank" rel="noopener">@monochrome.ca ${ic('ne')}</a></div>
        </aside>
        <p class="faq-none glass" id="faqNone" hidden>Nothing matches that. Try a shorter word, or <a href="mailto:info.mccanada@gmail.com">email us</a>.</p>
      </div>
    </div>
  </section>`;

  return {
    path: 'faq/', key: 'faq', section: 'faq', gl: 'ambient', hud: 'CH.05 Q&A',
    title: 'FAQ — MONOCHROME®',
    description: `Answers about ordering, shipping to Nigeria and ${dest.count - 1} other destinations, sizing, returns and drops at MONOCHROME®. Prices in CAD.`,
    css: ['editorial'], js: ['faq'],
    body,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: qs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a).replace(/&amp;/g, '&') } }))
    }]
  };
}
