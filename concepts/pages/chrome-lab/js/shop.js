/* MONOCHROME® — /shop/. Progressive enhancement on top of the pre-rendered grid: category filter + sort, synced to the URL
   (?c=top|bottom|accessory|gift and ?s=new|low|high), with back/forward support. Without this file the page is a complete product list. */
(() => {
  'use strict';
  const MC = window.MC;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const grid = $('#products'), count = $('#count'), empty = $('#empty'), sortEl = $('#sort');
  if (!grid) return;
  const cards = $$('.card', grid);
  const CATS = ['top', 'bottom', 'accessory', 'gift'];
  const LABEL = { top: 'Tops', bottom: 'Bottoms', accessory: 'Objects', gift: 'Gift cards' };
  const SORTS = ['featured', 'new', 'low', 'high'];
  const cmp = {
    featured: (a, b) => +a.dataset.ord - +b.dataset.ord,
    new: (a, b) => b.dataset.avail - a.dataset.avail || b.dataset.pub - a.dataset.pub || +a.dataset.ord - +b.dataset.ord,
    low: (a, b) => b.dataset.avail - a.dataset.avail || a.dataset.price - b.dataset.price || +a.dataset.ord - +b.dataset.ord,
    high: (a, b) => b.dataset.avail - a.dataset.avail || b.dataset.price - a.dataset.price || +a.dataset.ord - +b.dataset.ord
  };
  const bigCard = cards.find(c => c.classList.contains('feat')) || null;
  const state = { c: 'all', s: 'featured' };

  const read = () => {
    let c = 'all', s = 'featured';
    try { const q = new URLSearchParams(location.search); if (CATS.includes(q.get('c'))) c = q.get('c'); if (SORTS.includes(q.get('s'))) s = q.get('s'); } catch { /* defaults */ }
    return { c, s };
  };
  const query = ({ c, s }) => { const q = new URLSearchParams(); if (c !== 'all') q.set('c', c); if (s !== 'featured') q.set('s', s); const t = q.toString(); return t ? '?' + t : ''; };

  function render(next, { animate = false } = {}) {
    state.c = next.c; state.s = next.s;
    // sort: reorder the real DOM nodes (so tab order and reading order match what you see)
    const sorted = [...cards].sort(cmp[state.s]);
    const frag = document.createDocumentFragment();
    sorted.forEach(c => frag.appendChild(c));
    grid.appendChild(frag);
    // filter: the CSS rule on html[data-f] hides non-matching cards; also set [hidden] so the state does not depend on that rule alone
    if (state.c === 'all') root.removeAttribute('data-f'); else root.setAttribute('data-f', state.c);
    let n = 0, first = null;
    sorted.forEach(c => {
      const show = state.c === 'all' || c.dataset.cat === state.c;
      c.hidden = !show;
      if (show) { n++; if (!first) first = c; }
      c.querySelector('.idx').textContent = show ? MC.pad2(n) : c.querySelector('.idx').textContent;
    });
    // the wide first card only belongs to the default view
    if (bigCard) bigCard.classList.toggle('feat', state.c === 'all' && state.s === 'featured');
    $$('.filter').forEach(b => { const on = b.dataset.filter === state.c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    if (sortEl && sortEl.value !== state.s) sortEl.value = state.s;
    const what = state.c === 'all' ? 'pieces' : (n === 1 ? LABEL[state.c].toLowerCase().replace(/s$/, '') : LABEL[state.c].toLowerCase());
    count.textContent = `${MC.pad2(n)} ${what} / prices in CAD`;
    empty.hidden = n > 0;
    grid.hidden = n === 0;
    document.title = (state.c === 'all' ? 'Shop all ' + cards.length + ' pieces' : `Shop ${LABEL[state.c].toLowerCase()} (${n})`) + ' — MONOCHROME®';
    if (animate && !MC.reduce && grid.animate) {
      cards.filter(c => !c.hidden).forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: Math.min(i, 12) * 28, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    }
  }

  function go(next, push = true) {
    if (next.c === state.c && next.s === state.s) return;
    render(next, { animate: true });
    if (push) { try { history.pushState({ c: next.c, s: next.s }, '', location.pathname + query(next) + location.hash); } catch { /* file:// or sandboxed: the state still works, only the URL does not follow */ } }
  }

  $('#toolbar').addEventListener('click', e => { const b = e.target.closest('.filter'); if (b) go({ c: b.dataset.filter, s: state.s }); });
  if (sortEl) sortEl.addEventListener('change', () => go({ c: state.c, s: sortEl.value }));
  const reset = $('#emptyReset'); if (reset) reset.addEventListener('click', () => go({ c: 'all', s: state.s }));
  addEventListener('popstate', () => render(read(), { animate: true }));
  // links elsewhere on the site point here with ?c=...; honour them when the page is restored from the back/forward cache too
  addEventListener('pageshow', e => { if (e.persisted) render(read()); });

  render(read());
  grid.dataset.ready = '1';
})();
