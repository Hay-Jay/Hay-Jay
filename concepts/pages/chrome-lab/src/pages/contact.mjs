import { ic } from '../partials/icons.mjs';
import { newsletter } from '../partials/newsletter.mjs';

export default function contact(ctx) {
  const body = `
  <section class="ed-head" aria-labelledby="contactH">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${ctx.href('')}">Home</a></li><li aria-current="page">Contact</li></ol></nav>
      <span class="eyebrow">06 / SIGNAL</span>
      <h1 id="contactH" class="chrome-h"><span>SEND A</span> <span>SIGNAL.</span></h1>
      <p class="lead">Questions about sizing, a custom piece or a collab? Write to us. Want to hear about drops first? Leave your email.</p>
    </div>
  </section>

  <section class="ed-sec" aria-label="Ways to reach us">
    <div class="wrap contact-grid">
      <div class="contact-news">
        <span class="eyebrow">DROP ALERTS</span>
        <h2 class="h2">Stay in orbit</h2>
        <p class="sec-p">Pieces are made in small runs and some do not return. Leave your email and we will tell you when something new lands.</p>
        ${newsletter(ctx, { id: 'news', cls: 'news-lg' })}
      </div>
      <ul class="channels">
        <li><a class="tile glass" href="mailto:info.mccanada@gmail.com"><div><span class="mono">EMAIL</span><strong>info.mccanada@gmail.com</strong><em>Sizing, custom pieces, collabs, orders</em></div>${ic('ne')}</a></li>
        <li><a class="tile glass" href="https://www.instagram.com/monochrome.ca/" target="_blank" rel="noopener"><div><span class="mono">INSTAGRAM</span><strong>@monochrome.ca</strong><em>New pieces and behind the scenes</em></div>${ic('ne')}</a></li>
        <li><a class="tile glass" href="${ctx.store('/')}" data-store="/" target="_blank" rel="noopener"><div><span class="mono">STORE</span><strong>monochrome.com.ng</strong><em>Bag, checkout and order tracking</em></div>${ic('ne')}</a></li>
        <li><a class="tile glass" href="https://www.eventbrite.ca/e/monochrome-fashion-show-2025-black-white-chrome-tickets-1571923969909" target="_blank" rel="noopener"><div><span class="mono">ARCHIVE / EVENT</span><strong>Monochrome Fashion Show 2025</strong><em>On Eventbrite</em></div>${ic('ne')}</a></li>
      </ul>
    </div>
  </section>

  <section class="ed-sec" aria-labelledby="helpH">
    <div class="wrap two">
      <div class="sec-head"><span class="eyebrow">BEFORE YOU WRITE</span><h2 id="helpH" class="h2">Quick answers</h2></div>
      <ul class="quick">
        <li><a class="glass" href="${ctx.href('faq/')}"><b>FAQ</b><span>Ordering, sizing, drops and custom orders</span>${ic('right')}</a></li>
        <li><a class="glass" href="${ctx.href('shipping/')}"><b>Shipping</b><span>Destinations, Nigeria, Canada and rates</span>${ic('right')}</a></li>
        <li><a class="glass" href="${ctx.href('shipping/#returns')}"><b>Returns</b><span>Exchanges and the store policy</span>${ic('right')}</a></li>
      </ul>
    </div>
  </section>`;

  return {
    path: 'contact/', key: 'contact', section: 'contact', gl: 'ambient', hud: 'CH.06 SIGNAL',
    title: 'Contact & Drop Alerts — MONOCHROME®',
    description: 'Contact MONOCHROME® by email (info.mccanada@gmail.com) or Instagram (@monochrome.ca), and join the drop alerts to hear about new pieces first.',
    css: ['editorial'], js: [],
    body
  };
}
