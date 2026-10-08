import { ic } from './icons.mjs';
import { NAV } from './header.mjs';

export function footer(ctx, page) {
  const year = new Date().getFullYear();
  return `<footer class="foot">
<div class="foot-in">
  <div class="foot-mark" aria-hidden="true"><span class="chrome">MONOCHROME<sup>®</sup></span></div>
  <div class="foot-cols">
    <div class="foot-brand">
      <img class="emblem" src="${ctx.asset('assets/emblem-a.webp')}" alt="" width="48" height="52" loading="lazy">
      <img class="fword" src="${ctx.asset('assets/wordmark-a.webp')}" alt="Monochrome" width="120" height="11" loading="lazy">
      <span class="mono">WEAR THE UNKNOWN</span>
      <p class="foot-cad mono">PRICES IN CAD</p>
    </div>
    <nav class="foot-nav" aria-label="Footer">
      <span class="mono foot-h">SITE</span>
      <a href="${ctx.href('')}">Home</a>
      ${NAV.map(([, label, to]) => `<a href="${ctx.href(to)}">${label}</a>`).join('\n      ')}
    </nav>
    <nav class="foot-nav" aria-label="Store policies">
      <span class="mono foot-h">STORE</span>
      <a href="${ctx.store('/policies/shipping-policy')}" data-store="/policies/shipping-policy">Shipping policy</a>
      <a href="${ctx.store('/policies/refund-policy')}" data-store="/policies/refund-policy">Returns policy</a>
      <a href="${ctx.store('/policies/privacy-policy')}" data-store="/policies/privacy-policy">Privacy</a>
      <a href="${ctx.store('/cart')}" data-store="/cart">Bag</a>
    </nav>
    <nav class="foot-nav" aria-label="Contact">
      <span class="mono foot-h">SIGNAL</span>
      <a href="https://www.instagram.com/monochrome.ca/" target="_blank" rel="noopener">Instagram ${ic('ne')}</a>
      <a href="mailto:info.mccanada@gmail.com">info.mccanada@gmail.com</a>
      <a href="${ctx.href('contact/')}">Drop alerts</a>
    </nav>
  </div>
  <p class="foot-base mono">© <span id="year">${year}</span> MONOCHROME®. All rights reserved. Prices in CAD.</p>
</div>
</footer>`;
}
