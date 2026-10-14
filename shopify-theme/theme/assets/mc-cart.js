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
    const focusIn = () => { const f = $('.dr-go, .dr-empty .btn', drawer) || panel; if (f) f.focus({ preventScroll: true }); };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(focusIn, reduce ? 0 : 60)));
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
  // which control had focus (line number + kind), so it can be found again in the re-rendered markup
  function focusKey(scope) {
    const a = document.activeElement; if (!a || !scope || !scope.contains(a)) return null;
    const ln = a.closest('.ln');
    const sel = a.matches('[data-q="1"]') ? '[data-q="1"]' : a.matches('[data-q="-1"]') ? '[data-q="-1"]' : a.matches('[data-remove]') ? '[data-remove]' : a.matches('[data-line-qty]') ? '[data-line-qty]' : null;
    return { line: ln ? ln.dataset.line : null, sel };
  }
  function restoreFocus(scope, k, fallback) {
    if (!k || !scope) return;
    const el = (k.line && k.sel && $(`.ln[data-line="${k.line}"] ${k.sel}`, scope)) || $('.ln .ln-t', scope) || $(fallback, scope);
    if (el) { if (el.matches('h1, h2')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  }
  const cartHost = () => { const m = $('#cartMain'); return m ? m.closest('.shopify-section') : null; };
  async function refresh() {
    const jobs = [];
    if (drawer) jobs.push(fetch(`${R.home || '/'}?sections=mc-cart-drawer`, { headers: { Accept: 'application/json' } }).then(r => r.json()).then(d => {
      if (d && d['mc-cart-drawer']) { const k = focusKey(panel); panel.innerHTML = d['mc-cart-drawer']; restoreFocus(panel, k, '.dr-go, .dr-empty .btn, .dr-x'); }
    }));
    const page = MC.page === 'cart' ? cartHost() : null;
    if (page) {
      const sid = page.id.replace(/^shopify-section-/, '');
      jobs.push(fetch(`${CART}?section_id=${encodeURIComponent(sid)}`).then(r => { if (!r.ok) throw new Error('section ' + r.status); return r.text(); }).then(html => {
        const t = document.createElement('template'); t.innerHTML = html.trim(); const next = t.content.firstElementChild;
        if (!next || !next.querySelector('#cartMain')) throw new Error('section markup');
        const k = focusKey(page); page.replaceWith(next); restoreFocus(next, k, '#cartH');
      }).catch(() => { location.reload(); }));
    }
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
    } catch (e) { showError(e.message); return null; }
    finally { busy = false; row.forEach(r => r.classList.remove('is-busy')); }
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
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const inp = e.target.closest && e.target.closest('[data-line-qty]');
    if (inp) { e.preventDefault(); inp.blur(); }
  });
  document.addEventListener('change', e => {
    const inp = e.target.closest('[data-line-qty]');
    if (inp) change(inp.dataset.line, inp.value);
  });
  window.addEventListener('pageshow', e => {
    const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (!e.persisted && !(nav && nav.type === 'back_forward')) return;
    getJson('/cart.js').then(c => { setCount(c.item_count); return refresh(); }).catch(() => {});
  });
})();
