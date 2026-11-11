/* MONOCHROME® — the bag: slide-in drawer, quantity changes, add to bag (AJAX), live header count.
   Works with the Shopify Cart API (/cart/add.js, /cart/change.js, /cart.js) and the Section Rendering API. Without JavaScript every
   control is a plain link or form that goes to the cart page. Exposes MC.cart = { add, change, open, close, refresh, setCount, isOpen, stamp }.
   Also the product cards' two small enhancements (they are on most pages): the size sheet closing on a pick, the hover photo loading late.
   Adding something plays a short sequence: a rubber stamp thunks onto the button that was used, the bag count bumps, then the drawer
   slides in (all instant with reduced motion). */
(() => {
  'use strict';
  const MC = window.MC = window.MC || {};
  const R = MC.routes || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const drawer = $('#mcDrawer'), panel = $('#mcDrawerPanel');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const CART = R.cart || '/cart';
  let lastFocus = null, hideT = 0, openT = 0, busy = false;

  const getJson = async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(opts.headers || {}) } });
    let d = null; try { d = await r.json(); } catch { /* not JSON */ }
    if (!r.ok) { const e = new Error((d && (d.description || d.message)) || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
    return d;
  };

  function setCount(n) {
    const up = typeof MC.cartCount === 'number' && n > MC.cartCount;
    MC.cartCount = n;
    $$('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = !n; });
    $$('[data-cart-count-text]').forEach(el => { el.textContent = n; });
    $$('[data-cart-count]').forEach(el => { const a = el.closest('a, button'); if (a) a.setAttribute('aria-label', `Bag, ${n} ${n === 1 ? 'item' : 'items'}`); });
    if (up && !reduce) bump();
  }
  // the count in the header jumps, and the bag button flashes
  function bump() {
    $$('[data-cart-count], [data-cart-count-text]').forEach(el => {
      const host = el.closest('a, button');
      [el, host].forEach(x => { if (!x) return; x.classList.remove('bag-bump'); void x.offsetWidth; x.classList.add('bag-bump'); });
      setTimeout(() => { el.classList.remove('bag-bump'); if (host) host.classList.remove('bag-bump'); }, 900);
    });
  }
  // a rubber stamp lands on the element that was used ("Added"); it sits above everything, so it works on any button
  function stamp(el, text = 'Added') {
    if (reduce || !el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
    // the stamp is inked on the button's own colour, so it covers the label instead of fighting it
    let dark = false, bg = '';
    for (let x = el; x && x !== document.documentElement; x = x.parentElement) {
      const c = getComputedStyle(x).backgroundColor, m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c);
      if (m && (m[4] === undefined || +m[4] > 0.5)) { dark = (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 < 0.45; bg = `rgb(${m[1]}, ${m[2]}, ${m[3]})`; break; }
    }
    const w = document.createElement('span');
    w.className = 'add-stamp'; w.setAttribute('aria-hidden', 'true');
    w.style.left = (r.left + r.width / 2) + 'px'; w.style.top = (r.top + r.height / 2) + 'px';
    w.style.fontSize = Math.max(15, Math.min(r.height * 0.48, 32)) + 'px';
    const s = document.createElement('span');
    s.className = 'stamp in' + (dark ? ' white' : ''); s.style.setProperty('--r', '-6deg'); s.textContent = text;
    if (bg) s.style.backgroundColor = bg;
    w.append(s); document.body.append(w);
    el.classList.remove('is-thunk'); void el.offsetWidth; el.classList.add('is-thunk');
    setTimeout(() => { w.classList.add('out'); el.classList.remove('is-thunk'); }, 1050);
    setTimeout(() => w.remove(), 1500);
  }

  // ---- drawer ------------------------------------------------------------------------------
  const isOpen = () => !!drawer && drawer.classList.contains('open');
  function open() {
    if (!drawer || isOpen()) return;
    const mp = $('#magpop'); if (mp && !mp.hidden) { const c = $('[data-close]', mp); if (c) c.click(); }
    const mn = $('#menu.open'); if (mn) { const c = $('[data-close]', mn); if (c) c.click(); }
    clearTimeout(hideT); lastFocus = document.activeElement;
    drawer.hidden = false; void drawer.offsetWidth;
    drawer.classList.add('open', 'opening'); root.classList.add('drawer-lock'); MC.drawerOpen = true;
    clearTimeout(openT); openT = setTimeout(() => drawer.classList.remove('opening'), 1200);
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
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // opts.from: the button that was used (gets the stamp); opts.open === false keeps the drawer shut
  async function add(data, opts = {}) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData ? {} : { 'Content-Type': 'application/json' };
    const item = await getJson(R.cartAdd ? R.cartAdd + '.js' : '/cart/add.js', { method: 'POST', body, headers });
    const t0 = performance.now(), show = !reduce && !!opts.from;
    if (show) stamp(opts.from);
    const cartP = getJson('/cart.js'), freshP = refresh();
    const cart = await cartP;
    if (show) await wait(Math.max(0, 330 - (performance.now() - t0))); // the count bumps as the stamp lands
    setCount(cart.item_count);
    await freshP;
    if (show && !isOpen()) await wait(Math.max(0, 760 - (performance.now() - t0)));
    if (MC.page !== 'cart' && opts.open !== false) open();
    flagLine(item);
    const first = item && (item.items ? item.items[0] : item);
    say(`${(first && (first.product_title || first.title)) || 'Item'} added to your bag.`);
    return item;
  }
  // screen readers hear what the stamp shows
  let live = null;
  function say(msg) {
    if (!live) { live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('role', 'status'); document.body.append(live); }
    live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60);
  }
  // the line that was just added flashes once in the drawer / on the cart page
  function flagLine(item) {
    if (reduce || !item) return;
    const ids = (item.items ? item.items : [item]).map(i => String(i.variant_id || i.id));
    $$('.ln[data-vid]').filter(l => ids.includes(l.dataset.vid)).forEach(l => { l.classList.remove('is-new'); void l.offsetWidth; l.classList.add('is-new'); });
  }
  async function change(line, quantity) {
    if (busy) return null; busy = true;
    const row = $$(`.ln[data-line="${line}"]`); row.forEach(r => r.classList.add('is-busy'));
    try {
      // the line's own key, not its position: automatic discounts can split or merge lines, which shifts positions
      const key = row.length && row[0].dataset.key, qty = Math.max(0, +quantity || 0);
      const cart = await getJson(R.cartChange ? R.cartChange + '.js' : '/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(key ? { id: key, quantity: qty } : { line: +line, quantity: qty }) });
      setCount(cart.item_count);
      await refresh();
      return cart;
    } catch (e) { showError(e.message); return null; }
    finally { busy = false; row.forEach(r => r.classList.remove('is-busy')); }
  }
  MC.cart = { add, change, open, close, refresh, setCount, isOpen, stamp };

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
      // a card's size sheet closes as soon as a size is picked, so the bag that opens next is not covered; the stamp lands on the photo
      let from = ad;
      const pop = ad.closest('[popover]');
      if (pop) { try { if (pop.matches(':popover-open')) { pop.hidePopover(); from = $('.card-ph', pop.closest('.card') || document) || ad; } } catch { /* no popovers */ } }
      ad.classList.add('mc-add-pending');
      try { await add({ id: +ad.dataset.mcAdd, quantity: 1 }, { from }); }
      catch (err) {
        // Shopify said no (sold out...): the bag page explains; network trouble: let the browser post the form itself
        if (!err.status && ad.form && ad.form.requestSubmit) ad.form.requestSubmit(ad);
        else window.location.href = ad.getAttribute('href') || CART;
      }
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
  // product cards: the second photo (a <template>) loads on the first mouse hover and fades in once it has arrived
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const card = e.target.closest && e.target.closest('.card'), t = card && $('template.ph2-t', card);
    const img = t && t.content.querySelector('img'); if (!img) return;
    img.loading = 'eager';
    img.addEventListener('load', () => img.classList.add('ok'), { once: true });
    t.replaceWith(img);
    if (img.complete && img.naturalWidth) img.classList.add('ok');
  }, { passive: true });
  window.addEventListener('pageshow', e => {
    const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (!e.persisted && !(nav && nav.type === 'back_forward')) return;
    getJson('/cart.js').then(c => { setCount(c.item_count); return refresh(); }).catch(() => {});
  });
})();
