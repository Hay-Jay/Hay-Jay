/* SHOP — the asset register: filter (?c=), sort (?s=), search (?q=) and view (?v=list) on the pre-rendered photo grid and list.
   Everything is in the HTML already; this only re-orders and hides. Also: the sticky toolbar's shadow, the pointer photo of
   the list view, and an "In bag" stamp on a card after a quick add. Loaded on collection pages and by the search section. */
(() => {
  'use strict';
  if (window.__mcShop) return; // the search section loads this file too
  window.__mcShop = true;
  // the search section's tag runs before mc-core.js; wait for MC's helpers in that case
  if (window.MC && window.MC.$) shop(); else document.addEventListener('DOMContentLoaded', shop, { once: true });

  function shop() {
    const MC = window.MC, { $, $$, esc, clamp, noHover, fine, sized, safeUrl, reduce } = MC;
    const root = document.documentElement;

    // ---- quick add: stamp the card once the bag has it (mc-cart.js does the adding) --------------------------------
    document.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('.card [data-mc-add]');
      if (!btn || btn.disabled) return;
      const card = btn.closest('.card'), before = MC.cartCount || 0;
      let seen = btn.classList.contains('mc-add-pending'); // mc-cart.js may have marked it already
      const mo = new MutationObserver(() => {
        if (btn.classList.contains('mc-add-pending')) { seen = true; return; }
        if (!seen) return;
        mo.disconnect();
        if ((MC.cartCount || 0) <= before) return;
        const ph = $('.card-ph', card); if (!ph) return;
        const old = $('.card-added', ph); if (old) old.remove();
        const s = document.createElement('span');
        s.className = 'stamp white sm card-added in'; s.setAttribute('aria-hidden', 'true'); s.textContent = 'In bag';
        ph.appendChild(s);
      });
      mo.observe(btn, { attributes: true, attributeFilter: ['class'] });
      setTimeout(() => mo.disconnect(), 15000);
    });

    // ---- sticky toolbar: a shadow once it is stuck under the header bar ----------------------------------------------
    const tools = $('#tools'), sent = $('#shSent');
    if (tools && sent && 'IntersectionObserver' in window) {
      const bar = parseFloat(getComputedStyle(root).getPropertyValue('--bar')) || 56;
      new IntersectionObserver(es => es.forEach(en => tools.classList.toggle('stuck', !en.isIntersecting && en.boundingClientRect.top < bar + 8)), { rootMargin: `-${bar + 4}px 0px 0px 0px` }).observe(sent);
    }

    const grid = $('#grid'), toc = $('#toc');
    if (!grid || !toc) return; // the search page only needs the part above
    const plate = $('#plate'), plateImg = $('#plateImg'), plateCap = $('#plateCap');
    const countEl = $('#count'), emptyEl = $('#empty'), sortEl = $('#sort'), qEl = $('#q');

    const CATS = ['top', 'bottom', 'accessory', 'gift', 'print'];
    const NOUN = { all: ['piece', 'pieces'], top: ['top', 'tops'], bottom: ['bottom', 'bottoms'], accessory: ['piece of hardware', 'pieces of hardware'], gift: ['gift card', 'gift cards'], print: ['print issue', 'print issues'] };
    const SORTS = {
      featured: (a, b) => a.f - b.f,
      new: (a, b) => b.av - a.av || b.pub - a.pub,
      low: (a, b) => b.av - a.av || a.p - b.p,
      high: (a, b) => b.av - a.av || b.p - a.p
    };

    // model: one entry per piece, pointing at its card (grid) and its row (list)
    const cards = $$('.card', grid), rows = $$('.trow', toc);
    const model = cards.map(card => {
      const d = card.dataset;
      return { card, row: rows.find(r => r.dataset.h === d.h), h: d.h, n: d.n, cat: d.cat, p: +d.p, pub: +d.pub, av: +d.av, f: +d.f };
    });

    // ---- state <-> URL ---------------------------------------------------------------
    const state = { c: 'all', s: 'featured', q: '', v: 'grid' };
    function readUrl() {
      const q = new URLSearchParams(location.search);
      const c = q.get('c'), s = q.get('s'), v = q.get('v');
      state.c = CATS.includes(c) ? c : 'all';
      state.s = SORTS[s] ? s : 'featured';
      state.q = (q.get('q') || '').slice(0, 60);
      state.v = v === 'list' || v === 'index' ? 'list' : 'grid';
    }
    function writeUrl(push) {
      const q = new URLSearchParams(location.search);
      ['c', 's', 'q', 'v'].forEach(k => q.delete(k));
      if (state.c !== 'all') q.set('c', state.c);
      if (state.s !== 'featured') q.set('s', state.s);
      if (state.q) q.set('q', state.q);
      if (state.v === 'list') q.set('v', 'list');
      const qs = q.toString(), url = location.pathname + (qs ? '?' + qs : '') + location.hash;
      if (url === location.pathname + location.search + location.hash) return;
      try { history[push ? 'pushState' : 'replaceState'](null, '', url); } catch { /* sandboxed: the page still works without URL sync */ }
    }

    // ---- render ------------------------------------------------------------------------
    const BASE_TITLE = document.title, CAT_TITLE = { top: 'Tops', bottom: 'Bottoms', accessory: 'Hardware', gift: 'Gift cards', print: 'Print' };
    let lastOrder = model.map(m => m.h).join();
    function apply() {
      const q = state.q.trim().toLowerCase();
      root.dataset.view = state.v;
      document.title = state.c === 'all' ? BASE_TITLE : `${CAT_TITLE[state.c]} — ${BASE_TITLE}`;
      if (state.c === 'all') delete root.dataset.c; else root.dataset.c = state.c;
      $$('.sh-chip').forEach(b => { const on = b.dataset.filter === state.c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      $$('.sh-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.v)));
      // phones: the filter tabs scroll sideways; keep the active one in view
      const fbox = $('#filters'), fon = $('.sh-chip.on');
      if (fbox && fon && fbox.scrollWidth > fbox.clientWidth + 2) {
        const want = fbox.scrollLeft + fon.getBoundingClientRect().left - fbox.getBoundingClientRect().left - 16;
        fbox.scrollTo({ left: Math.max(0, want), behavior: 'auto' });
      }
      if (sortEl) sortEl.value = state.s;
      if (qEl && qEl.value !== state.q) qEl.value = state.q;

      const sorted = model.slice().sort(SORTS[state.s]);
      const shown = sorted.filter(m => (state.c === 'all' || m.cat === state.c) && (!q || q.split(/\s+/).every(t => m.n.includes(t))));
      const showSet = new Set(shown);
      // re-order only when the order changed: moving a node replays its entrance
      const order = sorted.map(m => m.h).join();
      if (order !== lastOrder) { lastOrder = order; for (const m of sorted) { grid.appendChild(m.card); if (m.row) toc.appendChild(m.row); } }
      let i = 0;
      for (const m of sorted) {
        const on = showSet.has(m);
        m.card.hidden = !on; if (m.row) m.row.hidden = !on;
        if (on) { const k = Math.min(i++, 12); m.card.style.setProperty('--i', k); if (m.row) m.row.style.setProperty('--i', k); }
      }
      const n = shown.length, inStock = shown.filter(m => m.av).length;
      const noun = NOUN[state.c][n === 1 ? 0 : 1];
      const match = q ? ` matching “${state.q.trim()}”` : '';
      countEl.textContent = n ? `${n} ${noun}${match}${inStock < n ? ` · ${inStock} in stock` : ''}` : `0 ${NOUN[state.c][1]}${match}`;
      emptyEl.hidden = n > 0;
      grid.hidden = toc.hidden = !n;
      plateHide();
    }

    // ---- controls --------------------------------------------------------------------------
    $$('.sh-chip').forEach(b => b.addEventListener('click', () => { state.c = b.dataset.filter; apply(); writeUrl(true); }));
    if (sortEl) sortEl.addEventListener('change', () => { state.s = sortEl.value; apply(); writeUrl(true); });
    $$('.sh-view').forEach(b => b.addEventListener('click', () => { state.v = b.dataset.view; apply(); writeUrl(true); }));
    let qT = 0;
    if (qEl) {
      qEl.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => { state.q = qEl.value; apply(); writeUrl(false); }, 120); });
      // the search box filters this page live; Enter just closes the phone keyboard
      qEl.form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(qT); state.q = qEl.value; apply(); writeUrl(false); qEl.blur(); });
    }
    const reset = $('#emptyReset');
    if (reset) reset.addEventListener('click', () => { state.c = 'all'; state.q = ''; if (qEl) qEl.value = ''; apply(); writeUrl(true); });
    addEventListener('popstate', () => { readUrl(); apply(); });
    // pages restored from the back/forward cache keep their state; a plain reload re-reads the URL
    addEventListener('pageshow', e => { if (e.persisted) { readUrl(); apply(); } });

    // ---- list view: the photo follows the pointer over the lines (desktop) -----------------------------------------
    const P = { x: 0, y: 0, tx: 0, ty: 0, rot: 0, on: false, raf: 0, h: null, rowFor: null, minX: 0, rowL: 0, kb: false };
    let lastPt = { x: 0, y: 0 };
    function plateHide() {
      if (!plate) return;
      P.on = false; P.h = null; P.rowFor = null; plate.classList.remove('on', 'sharp');
      $$('.trow.hot', toc).forEach(r => r.classList.remove('hot'));
      toc.classList.remove('hov');
    }
    function plateShow(row, x, y) {
      const a = $('.trow-a', row); if (!a || !plate) return;
      $$('.trow.hot', toc).forEach(r => { if (r !== row) r.classList.remove('hot'); });
      row.classList.add('hot'); toc.classList.add('hov');
      const h = row.dataset.h;
      if (P.h !== h) {
        P.h = h;
        plate.classList.remove('sharp');
        plateImg.onload = () => { if (P.h === h) requestAnimationFrame(() => plate.classList.add('sharp')); };
        plateImg.src = safeUrl(sized(a.dataset.img, 640));
        plateImg.alt = ''; plate.classList.toggle('zoom', a.dataset.zoom === '1');
        plateCap.textContent = a.dataset.cap;
        if (plateImg.complete && plateImg.naturalWidth) requestAnimationFrame(() => plate.classList.add('sharp'));
      }
      // keep the plate off the title being read: it floats in the space to the right of the row's text
      const nameEl = $('.t-name', row);
      if (nameEl && P.rowFor !== row) {
        P.rowFor = row;
        const rg = document.createRange(); rg.selectNodeContents(nameEl);
        P.minX = rg.getBoundingClientRect().right + 44; P.rowL = a.getBoundingClientRect().left;
      }
      P.tx = x; P.ty = y;
      if (!P.on) { P.x = Math.min(Math.max(x + 34, P.minX), innerWidth - plate.offsetWidth - 14); P.y = y; P.on = true; plate.classList.add('on'); if (!P.raf) P.raf = requestAnimationFrame(plateTick); }
    }
    function plateTick() {
      const w = plate.offsetWidth, hgt = plate.offsetHeight;
      let ax = Math.max(P.tx + 34, P.minX + (P.tx - P.rowL) * 0.06), ay = P.ty - hgt * 0.5;
      ax = Math.min(ax, innerWidth - w - 14);
      ay = clamp(ay, 58, innerHeight - hgt - 40);
      const px = P.x;
      P.x += (ax - P.x) * 0.13; P.y += (ay - P.y) * 0.13;
      P.rot += (clamp((P.x - px) * 0.9, -7, 7) - P.rot) * 0.15;
      plate.style.transform = `translate3d(${P.x.toFixed(1)}px, ${P.y.toFixed(1)}px, 0) rotate(${(reduce ? 0 : P.rot).toFixed(2)}deg)`;
      if (P.on || Math.abs(ax - P.x) > 1) P.raf = requestAnimationFrame(plateTick); else P.raf = 0;
    }
    if (fine && plate) {
      toc.addEventListener('pointermove', e => {
        lastPt = { x: e.clientX, y: e.clientY };
        const row = e.target.closest('.trow'); if (!row || !row.dataset.h) { plateHide(); return; }
        P.kb = false; plateShow(row, e.clientX, e.clientY);
      });
      toc.addEventListener('pointerleave', plateHide);
      addEventListener('scroll', () => { if (P.on && !P.kb) { const el = document.elementFromPoint(lastPt.x, lastPt.y); const row = el && el.closest && el.closest('.trow'); if (row) plateShow(row, lastPt.x, lastPt.y); else plateHide(); } }, { passive: true });
      // keyboard focus shows the photo beside the row
      toc.addEventListener('focusin', e => { const a = e.target.closest('.trow-a'); if (!a) return; P.kb = true; const r = a.getBoundingClientRect(); plateShow(a.parentNode, clamp(r.left + r.width * 0.66, 100, innerWidth - 100), clamp(r.top + r.height / 2, 120, innerHeight - 120)); });
      toc.addEventListener('focusout', e => { if (!toc.contains(e.relatedTarget)) plateHide(); });
    }

    // ---- list view on touch: tap a line to unfold its photo; "Open" is the real link -----------------------------------
    function unfoldRow(row) {
      const a = $('.trow-a', row), d = a.dataset;
      const open = row.classList.contains('open');
      $$('.trow.open', toc).forEach(r => { if (r !== row) { r.classList.remove('open'); $('.trow-a', r).setAttribute('aria-expanded', 'false'); } });
      if (!$('.t-more', row)) {
        row.insertAdjacentHTML('beforeend', `<div class="t-more"><div class="t-more-in"><div class="t-more-box">
          <div class="xp${d.zoom === '1' ? ' zoom' : ''}"><img class="ph" loading="lazy" decoding="async" draggable="false" src="${esc(safeUrl(sized(d.img, 700)))}" alt="${esc($('.t-name', row).firstChild.textContent)}"></div>
          <dl class="mono"><div><dt>File no.</dt><dd>${esc(d.file)}</dd></div><div><dt>Price</dt><dd>${esc(d.price)} ${esc(MC.currency || '')}</dd></div><div><dt>Sizes</dt><dd>${esc(d.sizes)}</dd></div>
          <a class="t-open mono" href="${esc(a.getAttribute('href'))}">Open</a></dl></div></div></div>`);
      }
      requestAnimationFrame(() => { row.classList.toggle('open', !open); a.setAttribute('aria-expanded', String(!open)); });
    }
    toc.addEventListener('click', e => {
      const a = e.target.closest('.trow-a'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      if (noHover()) { e.preventDefault(); unfoldRow(a.parentNode); }
    });

    readUrl();
    apply();
    // a clean URL stays clean; a stale ?c= value is dropped from the address bar
    writeUrl(false);
  }
})();
