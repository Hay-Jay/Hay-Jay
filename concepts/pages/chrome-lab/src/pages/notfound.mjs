import { ic } from '../partials/icons.mjs';

export default function notfound(ctx) {
  const body = `
  <section class="nf" aria-labelledby="nfH">
    <div class="wrap">
      <img class="nf-emblem" src="${ctx.asset('assets/emblem-a.webp')}" alt="" width="120" height="129">
      <span class="eyebrow">ERROR 404</span>
      <h1 id="nfH" class="chrome-h"><span>LOST IN</span> <span>THE UNKNOWN.</span></h1>
      <p class="lead">That page does not exist, or it has moved.</p>
      <div class="actions">
        <a class="btn solid" href="${ctx.href('')}">Back home ${ic('right')}</a>
        <a class="btn ghost glass" href="${ctx.href('shop/')}">Shop all</a>
        <button class="btn ghost glass js-only" type="button" data-cmd>Search ${ic('search')}</button>
      </div>
    </div>
  </section>`;
  return {
    path: '404.html', key: 'notfound', section: '', gl: 'ambient', hud: 'ERR.404', noindex: true,
    title: 'Page not found — MONOCHROME®',
    description: 'This MONOCHROME® page does not exist. Head back home, to the shop or the gallery.',
    css: ['editorial'], js: [],
    body
  };
}
