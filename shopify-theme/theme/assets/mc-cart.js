/* MONOCHROME® — the bag: slide-in drawer, quantity changes, add to bag (AJAX), live header count.
   Works with the Shopify Cart API (/cart/add.js, /cart/change.js, /cart.js) and the Section Rendering API. Without JavaScript every
   control is a plain link or form that goes to the cart page. Exposes MC.cart = { add, change, open, close, refresh }. */
(() => {
  'use strict';
  const MC = window.MC = window.MC || {};
  const R = MC.routes || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const drawer = $('#mcDrawer'), panel = $('#mcDrawerPanel');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const CART = R.cart || '/cart';
  let lastFocus = null, hideT = 0, busy = false;

  const getJson = async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(opts.headers || {}) } });
    let d = null; try { d = await r.json(); } catch { /* not JSON */ }
    if (!r.ok) { const e = new Error((d && (d.description || d.message)) || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
    return d;
  };

  function setCount(n) {
    MC.cartCount = n;
    $$('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = !n; });
    $$('[data-cart-count-text]').forEach(el => { el.textContent = n; });
    const b = $('.bar-bag'); if (b) b.setAttribute('aria-label', `Bag, ${n} ${n === 1 ? 'item' : 'items'}`);
  }

  // ---- drawer ------------------------------------------------------------------------------
  const isOpen = () => !!drawer && drawer.classList.contains('open');
  function open() {
    if (!drawer) return;
    const mp = $('#magpop'); if (mp && !mp.hidden) { const c = $('[data-close]', mp); if (c) c.click(); }
    const mn = $('#menu.open'); if (mn) { const c = $('[data-close]', mn); if (c) c.click(); }
    clearTimeout(hideT); lastFocus = document.activeElement;
    drawer.hidden = false; void drawer.offsetWidth;
    drawer.classList.add('open'); root.classList.add('drawer-lock'); MC.drawerOpen = true;
    setTimeout(() => { const f = $('.dr-go, .dr-empty .btn', drawer) || panel; if (f) f.focus({ preventScroll: true }); }, reduce ? 0 : 60);
  }
  function close(restore = true) {
    if (!drawer || !isOpen()) return;
    drawer.classList.remove('open'); root.classList.remove('drawer-lock'); MC.drawerOpen = false;
    hideT = setTimeout(() => { drawer.hidden = true; }, reduce ? 0 : 480);
    if (restore && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch { /* element gone */ } }
  }
  if (drawer) {
    drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('a[href],button:not(:disabled),input:not(:disabled)', panel).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === panel)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !panel.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    });
  }

  // ---- refreshing what the shopper sees -----------------------------------------------------------
  async function refresh() {
    const jobs = [];
    if (drawer) jobs.push(fetch(`${R.home || '/'}?sections=mc-cart-drawer`, { headers: { Accept: 'application/json' } }).then(r => r.json()).then(d => {
      if (d && d['mc-cart-drawer']) { const keep = document.activeElement && panel.contains(document.activeElement) ? document.activeElement.getAttribute('data-line-qty') : null; panel.innerHTML = d['mc-cart-drawer']; if (keep !== null) { const el = $(`[data-line-qty][data-line="${keep}"]`, panel); if (el) el.focus({ preventScroll: true }); } }
    }));
    const page = $('#shopify-section-main');
    if (MC.page === 'cart' && page) jobs.push(fetch(`${CART}?section_id=main`).then(r => r.text()).then(html => {
      const t = document.createElement('template'); t.innerHTML = html.trim(); const next = t.content.firstElementChild;
      if (next) { const had = document.activeElement && page.contains(document.activeElement); page.replaceWith(next); if (had) { const h = $('#cartH'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } }
    }));
    await Promise.all(jobs);
  }

  function showError(msg) {
    const host = MC.page === 'cart' ? $('.cart-main') : $('.dr-lines', panel) || $('.dr-head', panel);
    $$('.cart-err').forEach(n => n.remove());
    if (!host) return;
    const p = document.createElement('p'); p.className = 'cart-err mono'; p.setAttribute('role', 'alert'); p.textContent = msg;
    host.prepend(p);
  }

  // ---- API ---------------------------------------------------------------------------------------------------
  async function add(data) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData ? {} : { 'Content-Type': 'application/json' };
    const item = await getJson(R.cartAdd ? R.cartAdd + '.js' : '/cart/add.js', { method: 'POST', body, headers });
    const cart = await getJson('/cart.js');
    setCount(cart.item_count);
    await refresh();
    if (MC.page !== 'cart') open();
    return item;
  }
  async function change(line, quantity) {
    if (busy) return null; busy = true;
    const row = $$(`.ln[data-line="${line}"]`); row.forEach(r => r.classList.add('is-busy'));
    try {
      const cart = await getJson(R.cartChange ? R.cartChange + '.js' : '/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line: +line, quantity: Math.max(0, +quantity || 0) }) });
      setCount(cart.item_count);
      await refresh();
      return cart;
    } catch (e) { row.forEach(r => r.classList.remove('is-busy')); showError(e.message); return null; }
    finally { busy = false; }
  }
  MC.cart = { add, change, open, close, refresh, setCount, isOpen };

  // ---- controls ----------------------------------------------------------------------------------------------
  document.addEventListener('click', async e => {
    const q = e.target.closest('[data-q]');
    if (q) { const wrap = q.closest('[data-qty]'), inp = $('[data-line-qty]', wrap); if (!inp) return; e.preventDefault(); change(inp.dataset.line, (+inp.value || 0) + (+q.dataset.q)); return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) { e.preventDefault(); change(rm.dataset.line, 0); return; }
    const op = e.target.closest('[data-cart-open]');
    if (op && drawer && MC.page !== 'cart') { e.preventDefault(); open(); return; }
    const ad = e.target.closest('[data-mc-add]');
    if (ad) {
      e.preventDefault(); if (ad.classList.contains('mc-add-pending')) return;
      ad.classList.add('mc-add-pending');
      try { await add({ id: +ad.dataset.mcAdd, quantity: 1 }); }
      catch (err) { window.location.href = ad.getAttribute('href') || CART; }
      finally { ad.classList.remove('mc-add-pending'); }
    }
  });
  document.addEventListener('change', e => {
    const inp = e.target.closest('[data-line-qty]');
    if (inp) change(inp.dataset.line, inp.value);
  });
  window.addEventListener('pageshow', e => { if (e.persisted) getJson('/cart.js').then(c => setCount(c.item_count)).catch(() => {}); });
})();
