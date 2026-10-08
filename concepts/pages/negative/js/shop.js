/* SHOP — the index: filter (?c=), sort (?s=), search (?q=) and view (?v=) on pre-rendered rows and frames.
   Everything is in the HTML already; this only re-orders and hides. */
(() => {
  'use strict';
  const MC = window.MC, { $, $$, esc, clamp, noHover, fine, sized, safeUrl } = MC;
  const root = document.documentElement;
  const toc = $('#toc'), sheet = $('#sheet'), plate = $('#plate'), plateImg = $('#plateImg'), plateCap = $('#plateCap');
  const countEl = $('#count'), emptyEl = $('#empty'), sortEl = $('#sort'), qEl = $('#q');
  if (!toc || !sheet) return;

  const CATS = ['top', 'bottom', 'accessory', 'gift'];
  const NOUN = { all: ['piece', 'pieces'], top: ['top', 'tops'], bottom: ['bottom', 'bottoms'], accessory: ['object', 'objects'], gift: ['gift card', 'gift cards'] };
  const SORTS = {
    featured: (a, b) => a.f - b.f,
    new: (a, b) => b.av - a.av || b.pub - a.pub,
    low: (a, b) => b.av - a.av || a.p - b.p,
    high: (a, b) => b.av - a.av || b.p - a.p
  };
  const FEAT_SIZES = '(min-width:700px) 50vw, 100vw';
  const FRAME_SIZES = '(min-width:1500px) 20vw, (min-width:900px) 25vw, (min-width:700px) 33vw, 50vw';

  // model: one entry per piece, pointing at its row (index view) and its frame (contact sheet)
  const rows = $$('.trow', toc), frames = $$('.frame', sheet);
  const model = rows.map(row => {
    const d = row.dataset;
    return { row, frame: frames.find(f => f.dataset.h === d.h), h: d.h, n: d.n, cat: d.cat, p: +d.p, pub: +d.pub, av: +d.av, f: +d.f };
  });

  // ---- state <-> URL ---------------------------------------------------------------
  const defaultView = () => matchMedia('(hover: none), (max-width: 699px)').matches ? 'sheet' : 'index';
  const state = { c: 'all', s: 'featured', q: '', v: root.dataset.view || defaultView(), explicitView: false };
  function readUrl() {
    const q = new URLSearchParams(location.search);
    const c = q.get('c'), s = q.get('s'), v = q.get('v');
    state.c = CATS.includes(c) ? c : 'all';
    state.s = SORTS[s] ? s : 'featured';
    state.q = (q.get('q') || '').slice(0, 60);
    state.explicitView = v === 'sheet' || v === 'index';
    state.v = state.explicitView ? v : defaultView();
  }
  function writeUrl(push) {
    const q = new URLSearchParams();
    if (state.c !== 'all') q.set('c', state.c);
    if (state.s !== 'featured') q.set('s', state.s);
    if (state.q) q.set('q', state.q);
    if (state.explicitView) q.set('v', state.v);
    const qs = q.toString(), url = location.pathname + (qs ? '?' + qs : '') + location.hash;
    if (url === location.pathname + location.search + location.hash) return;
    try { history[push ? 'pushState' : 'replaceState'](null, '', url); } catch { /* sandboxed: the page still works without URL sync */ }
  }

  // ---- render ------------------------------------------------------------------------
  function apply() {
    const q = state.q.trim().toLowerCase();
    root.dataset.view = state.v;
    if (state.c === 'all') delete root.dataset.c; else root.dataset.c = state.c;
    $$('.filter').forEach(b => { const on = b.dataset.filter === state.c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    $$('.view').forEach(b => { const on = b.dataset.view === state.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    sortEl.value = state.s;
    if (qEl && qEl.value !== state.q) qEl.value = state.q;

    const sorted = model.slice().sort(SORTS[state.s]);
    const shown = sorted.filter(m => (state.c === 'all' || m.cat === state.c) && (!q || q.split(/\s+/).every(t => m.n.includes(t))));
    const showSet = new Set(shown);
    let i = 0;
    for (const m of sorted) {
      const on = showSet.has(m);
      m.row.hidden = !on; if (m.frame) m.frame.hidden = !on;
      toc.appendChild(m.row); if (m.frame) sheet.appendChild(m.frame); // moving a node re-runs its entrance
      if (on) { const k = Math.min(i++, 14); m.row.style.setProperty('--i', k); if (m.frame) m.frame.style.setProperty('--i', k); }
    }
    // the lead frame is larger while the sheet is in its natural order
    const lead = shown.length >= 8 && state.c === 'all' && !q && (state.s === 'featured' || state.s === 'new') ? shown[0] : null;
    for (const m of model) if (m.frame) {
      const feat = m === lead; m.frame.classList.toggle('feat', feat);
      const im = $('img', m.frame); if (im) im.sizes = feat ? FEAT_SIZES : FRAME_SIZES;
    }
    const n = shown.length, inStock = shown.filter(m => m.av).length;
    const noun = NOUN[state.c][n === 1 ? 0 : 1];
    countEl.textContent = n ? `${n} ${noun}${q ? ` matching “${state.q.trim()}”` : ''} — ${inStock} in stock` : `0 ${NOUN[state.c][1]}${q ? ` matching “${state.q.trim()}”` : ''}`;
    emptyEl.hidden = n > 0;
    toc.hidden = !n; sheet.parentNode.hidden = false;
    if (!n) { toc.hidden = true; }
    plateHide();
    if (sheetWrapEmpty()) { /* nothing to show */ }
  }
  const sheetWrapEmpty = () => { const w = sheet.parentNode; const none = model.every(m => m.frame ? m.frame.hidden : true); w.style.display = none ? 'none' : ''; return none; };

  // ---- controls --------------------------------------------------------------------------
  $$('.filter').forEach(b => b.addEventListener('click', () => { state.c = b.dataset.filter; apply(); writeUrl(true); }));
  sortEl.addEventListener('change', () => { state.s = sortEl.value; apply(); writeUrl(true); });
  $$('.view').forEach(b => b.addEventListener('click', () => { state.v = b.dataset.view; state.explicitView = true; apply(); writeUrl(true); }));
  let qT = 0;
  if (qEl) qEl.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => { state.q = qEl.value; apply(); writeUrl(false); }, 120); });
  const reset = $('#emptyReset');
  if (reset) reset.addEventListener('click', () => { state.c = 'all'; state.q = ''; if (qEl) qEl.value = ''; apply(); writeUrl(true); });
  addEventListener('popstate', () => { readUrl(); apply(); });
  // pages restored from the back/forward cache keep their state; a plain reload re-reads the URL
  addEventListener('pageshow', e => { if (e.persisted) { readUrl(); apply(); } });

  // ---- pointer plate over index titles (desktop) ----------------------------------------------
  const P = { x: 0, y: 0, tx: 0, ty: 0, rot: 0, on: false, raf: 0, h: null, rowFor: null, minX: 0, rowL: 0, kb: false };
  let lastPt = { x: 0, y: 0 };
  function plateHide() {
    P.on = false; P.h = null; P.rowFor = null; plate.classList.remove('on', 'sharp');
    $$('.trow.hot', toc).forEach(r => r.classList.remove('hot'));
    toc.classList.remove('hov');
  }
  function plateShow(row, x, y) {
    const a = $('.trow-a', row); if (!a) return;
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
      P.minX = rg.getBoundingClientRect().right + 30; P.rowL = a.getBoundingClientRect().left;
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
    plate.style.transform = `translate3d(${P.x.toFixed(1)}px, ${P.y.toFixed(1)}px, 0) rotate(${P.rot.toFixed(2)}deg)`;
    if (P.on || Math.abs(ax - P.x) > 1) P.raf = requestAnimationFrame(plateTick); else P.raf = 0;
  }
  if (fine) {
    toc.addEventListener('pointermove', e => {
      lastPt = { x: e.clientX, y: e.clientY };
      const row = e.target.closest('.trow'); if (!row || !row.dataset.h) { plateHide(); return; }
      P.kb = false; plateShow(row, e.clientX, e.clientY);
    });
    toc.addEventListener('pointerleave', plateHide);
    addEventListener('scroll', () => { if (P.on && !P.kb) { const el = document.elementFromPoint(lastPt.x, lastPt.y); const row = el && el.closest && el.closest('.trow'); if (row) plateShow(row, lastPt.x, lastPt.y); else plateHide(); } }, { passive: true });
    // keyboard focus shows the plate beside the row
    toc.addEventListener('focusin', e => { const a = e.target.closest('.trow-a'); if (!a) return; P.kb = true; const r = a.getBoundingClientRect(); plateShow(a.parentNode, clamp(r.left + r.width * 0.66, 100, innerWidth - 100), clamp(r.top + r.height / 2, 120, innerHeight - 120)); });
    toc.addEventListener('focusout', e => { if (!toc.contains(e.relatedTarget)) plateHide(); });
    // warm the cache once the index is near
    if ('IntersectionObserver' in window) {
      const wio = new IntersectionObserver(es => { if (es[0].isIntersecting) { wio.disconnect(); const warm = () => $$('.trow-a', toc).forEach(a => { const i = new Image(); i.src = safeUrl(sized(a.dataset.img, 640)); }); if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 800 }); else setTimeout(warm, 300); } }, { rootMargin: '800px 0px' });
      wio.observe(toc);
    }
  }

  // ---- touch: tap a title to unfold its plate; "Open the piece" is the real link -----------------
  function unfoldRow(row) {
    const a = $('.trow-a', row), d = a.dataset;
    const open = row.classList.contains('open');
    $$('.trow.open', toc).forEach(r => { if (r !== row) { r.classList.remove('open'); $('.trow-a', r).setAttribute('aria-expanded', 'false'); } });
    if (!$('.t-more', row)) {
      row.insertAdjacentHTML('beforeend', `<div class="t-more"><div class="t-more-in"><div class="t-more-box">
        <div class="xp${d.zoom === '1' ? ' zoom' : ''}"><img class="ph" loading="lazy" decoding="async" draggable="false" src="${esc(safeUrl(sized(d.img, 700)))}" alt="${esc($('.t-name', row).firstChild.textContent)}"></div>
        <dl class="mono"><div><dt>Section</dt><dd>${esc(d.catLabel)}</dd></div><div><dt>Price</dt><dd>${esc(d.price)} CAD</dd></div><div><dt>Sizes</dt><dd>${esc(d.sizes)}</dd></div>
        <a class="t-open mono" href="${esc(a.getAttribute('href'))}">Open the piece</a></dl></div></div></div>`);
    }
    requestAnimationFrame(() => { row.classList.toggle('open', !open); a.setAttribute('aria-expanded', String(!open)); });
  }
  toc.addEventListener('click', e => {
    const a = e.target.closest('.trow-a'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (noHover()) { e.preventDefault(); unfoldRow(a.parentNode); }
  });

  readUrl();
  apply();
  // a normal (clean) URL was loaded: keep it clean; a stale ?c= value is dropped from the address bar
  writeUrl(false);
})();
