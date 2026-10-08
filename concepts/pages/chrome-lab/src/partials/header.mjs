import { ic } from './icons.mjs';

// Primary navigation. `section` is the nav key the current page belongs to (product pages belong to "shop").
export const NAV = [
  ['shop', 'Shop', 'shop/'],
  ['gallery', 'Gallery', 'gallery/'],
  ['about', 'About', 'about/'],
  ['shipping', 'Shipping', 'shipping/'],
  ['faq', 'FAQ', 'faq/'],
  ['contact', 'Contact', 'contact/']
];

export function header(ctx, page) {
  const cur = page.section || '';
  const link = ([key, label, to]) => {
    const exact = page.path === to;
    const attr = exact ? ' aria-current="page" class="on"' : cur === key ? ' aria-current="true" class="on"' : '';
    return `<a href="${ctx.href(to)}"${attr}>${label}</a>`;
  };
  return `<header class="nav" id="nav">
  <a class="brand" href="${ctx.href('')}" aria-label="Monochrome, home"${page.path === '' ? ' aria-current="page"' : ''}>
    <img class="emblem" src="${ctx.asset('assets/emblem-a.webp')}" alt="" width="32" height="34">
    <img class="word" src="${ctx.asset('assets/wordmark-a.webp')}" alt="Monochrome" width="140" height="13">
  </a>
  <nav class="links glass" id="links" aria-label="Primary">
    ${NAV.map(link).join('\n    ')}
    <button class="links-cmd js-only" type="button" data-cmd>Search ${ic('search')}</button>
  </nav>
  <div class="nav-r">
    <button class="pill cmd-btn glass js-only" type="button" data-cmd aria-haspopup="dialog" aria-controls="cmd" aria-label="Search the site and jump to a page or product">${ic('search')}<span class="cmd-t">Search</span><kbd class="cmd-k" aria-hidden="true">/</kbd></button>
    <a class="pill bag glass" href="${ctx.store('/cart')}" data-store="/cart">Bag ${ic('ne')}</a>
    <button class="pill menu-btn glass js-only" id="menuBtn" type="button" aria-expanded="false" aria-controls="links"><span>Menu</span></button>
  </div>
</header>`;
}
