/* MONOCHROME® — NEGATIVE (editorial concept)
   Static, no build. Data from data/products.js, storefront from config.js. */
(() => {
  'use strict';

  // ---- Config & helpers ----------------------------------------------------
  const STORE_URL = ((window.MONOCHROME_CONFIG || {}).storeUrl || 'https://monochrome.com.ng').replace(/\/$/, '');
  const CURRENCY = 'CAD';
  const LOCALE = 'en-CA';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = v => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(v);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');
  const DATA = window.MONOCHROME_DATA || { products: [], collections: [], store: {} };
  // Shopify's CDN resizes on request.
  const sized = (src, w) => !/^https?:/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}width=${w}`;
  const isHeic = src => /\.heic(\?|$)/i.test(src);
  const safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, STORE_URL).href)); } catch { return ''; } };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const noHover = () => matchMedia('(hover: none)').matches;
  if (reduce) document.documentElement.classList.add('reduce');
  const CAT = { top: 'Top', bottom: 'Bottom', accessory: 'Object', gift: 'Gift card' };

  // Point every data-store link at the storefront.
  $$('[data-store]').forEach(a => { a.href = STORE_URL + a.dataset.store; });
  const news = $('#news');
  if (news) {
    news.action = `${STORE_URL}/contact#contact_form`;
    news.addEventListener('submit', () => { $('#newsNote').textContent = 'Opening the store in a new tab to finish your signup.'; });
  }
  $('#year').textContent = new Date().getFullYear();

  // ---- Product model -------------------------------------------------------
  const items = DATA.products.map(p => {
    const imgs = p.images.map(i => i.src);
    const ok = imgs.filter(s => !isHeic(s));
    const list = ok.length ? ok : imgs;
    return {
      n: p.title, p: p.price, pMax: p.priceMax, t: p.category, avail: p.available, sizes: (p.sizes || []).map(s => String(s).toUpperCase()),
      u: `${STORE_URL}/products/${p.handle}`, h: p.handle, d: p, imgs: list,
      isNew: (p.collections || []).includes('new-arrivals'),
      rank: (p.collections || []).includes('new-arrivals') ? 2 : (p.collections || []).length ? 1 : 0,
      pub: Date.parse(p.publishedAt) || 0
    };
  }).sort((a, b) => b.avail - a.avail);
  const byHandle = h => items.find(x => x.h === h);
  const priceText = x => (x.pMax > x.p ? 'From ' : '') + fmt(x.p);
  const sizeText = x => x.sizes.length ? x.sizes.slice(0, 7).join(' ') : (x.t === 'gift' ? 'Choose amount' : 'One size');
  const photo = (x, i, w) => sized(x.imgs[Math.min(i, x.imgs.length - 1)] || '', w);

  // images that fail to load simply hide, never leaving a broken icon
  document.addEventListener('error', e => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && img.classList.contains('ph')) img.style.visibility = 'hidden';
  }, true);

  // ---- Reveals (always released: observer + failsafe) -------------------------
  const rvEls = $$('.rv, .rv-lines');
  const rvIo = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rvIo.unobserve(e.target); } }), { rootMargin: '0px 0px -5% 0px', threshold: 0.05 })
    : null;
  rvEls.forEach(el => (rvIo && !reduce) ? rvIo.observe(el) : el.classList.add('in'));
  const releaseVisible = () => rvEls.forEach(el => {
    if (el.classList.contains('in')) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('in');
  });
  setTimeout(releaseVisible, 2500);
  addEventListener('load', () => setTimeout(releaseVisible, 800));
  let rvT = 0; addEventListener('scroll', () => { clearTimeout(rvT); rvT = setTimeout(releaseVisible, 250); }, { passive: true });

  // ---- Cover, note figure ---------------------------------------------------
  function plateFig(host, handle, idx, w, eager) {
    const x = byHandle(handle); if (!x) return null;
    host.insertAdjacentHTML('afterbegin',
      `<a class="ph-link" href="${esc(x.u)}" data-h="${esc(x.h)}" target="_blank" rel="noopener" aria-label="Open ${esc(x.n)}"><img class="ph" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false" src="${esc(safeUrl(photo(x, idx, w)))}" alt="${esc(x.n)}, photograph"></a>`);
    return x;
  }
  const cv = plateFig($('#coverPhoto'), 'white-monochrome-jersey', 1, 1500, true);
  if (cv) {
    $('#coverCap').innerHTML = `Cover — <a href="${esc(cv.u)}" data-h="${esc(cv.h)}">${esc(cv.n)}</a>, ${fmt(cv.p)} CAD. <span class="hint-fine">Hover the photograph to expose it.</span><span class="hint-touch">Press and hold the photograph to expose it.</span>`;
  }
  const nf = plateFig($('#noteFig .note-img'), 'monochrome-pants-chain', 1, 1000, false);
  if (nf) $('#noteFig figcaption').innerHTML = `<span>Fig. A — ${esc(nf.n)}</span><span>${fmt(nf.p)} CAD</span>`;

  // ---- Tickers --------------------------------------------------------------
  function regionNames() {
    const codes = (DATA.store && DATA.store.shipsTo) || [];
    let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* codes only */ }
    const names = codes.map(c => { try { return (dn && dn.of(c)) || c; } catch { return c; } });
    const first = ['Nigeria', 'Canada'];
    return [...first.filter(n => names.includes(n)), ...names.filter(n => !first.includes(n)).sort()];
  }
  const TICK = {
    cover: ['Wear the unknown', 'Issue 01', 'Black / white / chrome', `${items.length} pieces`, 'Prices in CAD', 'The Unknown'],
    note: ['No colour', 'No noise', 'Two tones', 'One finish', 'Small runs', 'Wear the unknown'],
    ship: ['Delivering to', ...regionNames()]
  };
  const tickers = $$('[data-ticker]');
  function buildTickers() {
    tickers.forEach(el => {
      const words = TICK[el.dataset.ticker] || [];
      const unit = words.map(w => `<span>${esc(w)}</span>`).join('');
      el.innerHTML = `<div class="tk">${unit}</div>`;
      const tk = el.firstElementChild;
      let guard = 0; while (tk.offsetWidth < innerWidth * 1.05 && guard++ < 14) tk.insertAdjacentHTML('beforeend', unit);
      el.insertAdjacentHTML('beforeend', tk.outerHTML.replace('class="tk"', 'class="tk" aria-hidden="true"'));
      el.style.animationDuration = Math.max(20, tk.offsetWidth / 38) + 's';
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildTickers); else buildTickers();
  buildTickers();
  if ('IntersectionObserver' in window) {
    const tio = new IntersectionObserver(es => es.forEach(e => { e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; }), { rootMargin: '100px' });
    tickers.forEach(t => tio.observe(t));
  }

  // ---- Counters ----------------------------------------------------------------
  const countries = (DATA.store && DATA.store.shipsTo || []).length;
  const statEls = $$('.num[data-to]');
  statEls.forEach(el => {
    if (el.id === 'statCountries') el.dataset.to = countries || 29;
    if (el.dataset.to === '23') el.dataset.to = items.length;
    el.textContent = el.dataset.pad ? pad(el.dataset.to) : el.dataset.to;
  });
  function runCounter(el) {
    const to = +el.dataset.to, padn = el.dataset.pad;
    const out = v => (padn ? pad(v) : String(v));
    if (reduce || to === 0) { el.textContent = out(to); return; }
    const t0 = performance.now(), dur = 1500;
    (function step(now) {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = out(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step); else el.textContent = out(to);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } }), { threshold: 0.7 });
    statEls.forEach(el => cio.observe(el));
  }

  // ---- Running head: folio follows the page, tone follows the spread under the bar ----
  const folioNo = $('#folioNo'), folioName = $('#folioName'), bar = $('#bar');
  const spreads = $$('.spread[data-page]');
  let folioRaf = 0, lastFolio = null, lastTone = null;
  function folioUpdate() {
    folioRaf = 0;
    const mid = innerHeight * 0.45, probe = 23;
    let page = null, tone = null;
    for (const s of spreads) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) page = s;
      if (r.top <= probe && r.bottom > probe) tone = s;
    }
    if (page && page !== lastFolio) { lastFolio = page; folioNo.textContent = page.dataset.page || ''; folioName.textContent = page.dataset.name || ''; }
    const t = tone && tone.classList.contains('paper') ? 'paper' : 'ink';
    if (t !== lastTone) { lastTone = t; bar.classList.toggle('tone-paper', t === 'paper'); }
  }
  const folioQueue = () => { if (!folioRaf) folioRaf = requestAnimationFrame(folioUpdate); };
  addEventListener('scroll', folioQueue, { passive: true }); addEventListener('resize', folioQueue); folioUpdate();

  // ---- Paper / ink toggle ----------------------------------------------------------
  const inv = $('#invert');
  inv.addEventListener('click', () => {
    const on = document.documentElement.classList.toggle('neg');
    inv.setAttribute('aria-pressed', on);
  });

  // ---- Exposure lens: true colour under the pointer (hold on touch) ---------------
  const lensMap = new WeakMap();
  let lens = null, lastPt = { x: 0, y: 0 }, suppressClick = 0;
  function lensFor(xp) {
    let s = lensMap.get(xp); if (s) return s;
    const base = $('img.ph', xp); if (!base) return null;
    const col = document.createElement('img');
    col.className = 'ph col'; col.alt = ''; col.setAttribute('aria-hidden', 'true'); col.decoding = 'async'; col.draggable = false;
    const ring = document.createElement('i'); ring.className = 'xp-ring'; ring.setAttribute('aria-hidden', 'true');
    xp.append(col, ring);
    s = { col, ring, base, x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0 };
    lensMap.set(xp, s); return s;
  }
  function lensStart(xp, x, y, touch) {
    if (xp.classList.contains('dev')) return;
    const s = lensFor(xp); if (!s) return;
    if (lens && lens.xp !== xp) lensKill();
    const src = s.base.currentSrc || s.base.src;
    if (s.col.dataset.src !== src) { s.col.dataset.src = src; s.col.src = src; }
    const r = xp.getBoundingClientRect();
    s.tr = clamp(Math.min(r.width, r.height) * 0.27, 62, 150) * (touch ? 1.35 : 1);
    s.tx = x; s.ty = y;
    if (!lens) { s.x = x; s.y = y; s.r = 0; }
    const wasIdle = !lens || !lens.on;
    lens = { xp, s, on: true };
    xp.classList.add('lens-on'); if (!touch) xp.classList.add('lens-fine');
    if (wasIdle) requestAnimationFrame(lensTick);
  }
  function lensMove(x, y) { if (lens && lens.on) { lens.s.tx = x; lens.s.ty = y; } }
  function lensStop() { if (lens) { lens.on = false; lens.s.tr = 0; } }
  function lensKill() {
    if (!lens) return;
    lens.xp.classList.remove('lens-on'); lens.s.r = 0; lens = null;
  }
  function lensTick() {
    if (!lens) return;
    const { xp, s } = lens;
    s.x += (s.tx - s.x) * 0.22; s.y += (s.ty - s.y) * 0.22; s.r += (s.tr - s.r) * 0.18;
    const cr = s.col.getBoundingClientRect(), xr = xp.getBoundingClientRect();
    s.col.style.setProperty('--lx', (s.x - cr.left).toFixed(1) + 'px');
    s.col.style.setProperty('--ly', (s.y - cr.top).toFixed(1) + 'px');
    s.col.style.setProperty('--lr', s.r.toFixed(1) + 'px');
    const d = s.r * 2;
    s.ring.style.width = s.ring.style.height = d.toFixed(1) + 'px';
    s.ring.style.transform = `translate(${(s.x - xr.left - s.r).toFixed(1)}px, ${(s.y - xr.top - s.r).toFixed(1)}px)`;
    if (!lens.on && s.r < 0.8) { lensKill(); return; }
    requestAnimationFrame(lensTick);
  }
  const xpAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.xp') : null; };
  if (fine) {
    document.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      lastPt = { x: e.clientX, y: e.clientY };
      const xp = e.target.closest ? e.target.closest('.xp') : null;
      if (xp && !xp.classList.contains('dev')) {
        if (!lens || lens.xp !== xp || !lens.on) lensStart(xp, e.clientX, e.clientY, false); else lensMove(e.clientX, e.clientY);
      } else lensStop();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', lensStop);
    // when the page moves under a resting pointer, hand the lens to whatever is now beneath it
    let sRaf = 0;
    addEventListener('scroll', () => {
      if (sRaf) return; sRaf = requestAnimationFrame(() => {
        sRaf = 0; if (!lastPt.x && !lastPt.y) return;
        const xp = xpAt(lastPt.x, lastPt.y);
        if (xp && !xp.classList.contains('dev')) { if (!lens || lens.xp !== xp || !lens.on) lensStart(xp, lastPt.x, lastPt.y, false); }
        else lensStop();
      });
    }, { passive: true });
  }
  // touch: press and hold
  let tp = null;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const xp = e.target.closest ? e.target.closest('.xp') : null; if (!xp || xp.classList.contains('dev')) return;
    tp = { xp, id: e.pointerId, x: e.clientX, y: e.clientY, on: false };
    tp.t = setTimeout(() => { if (!tp) return; tp.on = true; lensStart(xp, tp.x, tp.y, true); if (navigator.vibrate) try { navigator.vibrate(8); } catch { /* ignore */ } }, 300);
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (!tp || e.pointerId !== tp.id) return;
    if (tp.on) { lensMove(e.clientX, e.clientY); return; }
    if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 9) { clearTimeout(tp.t); tp = null; }
  }, { passive: true });
  const tpEnd = e => {
    if (!tp || (e && e.pointerId !== tp.id)) return;
    clearTimeout(tp.t);
    if (tp.on) { lensStop(); suppressClick = performance.now() + 450; }
    tp = null;
  };
  document.addEventListener('pointerup', tpEnd, { passive: true });
  document.addEventListener('pointercancel', tpEnd, { passive: true });
  document.addEventListener('touchmove', e => { if (tp && tp.on && e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.xp') && (tp || noHover())) e.preventDefault(); });
  document.addEventListener('click', e => { if (suppressClick > performance.now()) { e.preventDefault(); e.stopPropagation(); } }, true);

  // ---- The index: table of contents + contact sheet ---------------------------------
  let filter = 'all', sort = 'featured', view = 'toc';
  const SORTS = {
    featured: (a, b) => b.avail - a.avail || b.rank - a.rank || b.p - a.p,
    new: (a, b) => b.avail - a.avail || b.pub - a.pub,
    low: (a, b) => b.avail - a.avail || a.p - b.p,
    high: (a, b) => b.avail - a.avail || b.p - a.p
  };
  // stable plate numbers: the position in the default (featured) order, kept through any sort or filter
  items.slice().sort(SORTS.featured).forEach((x, i) => { x.no = i + 1; });
  const NOUN = { all: ['piece', 'pieces'], top: ['top', 'tops'], bottom: ['bottom', 'bottoms'], accessory: ['object', 'objects'], gift: ['gift card', 'gift cards'] };
  const toc = $('#toc'), sheet = $('#sheet'), sheetWrap = $('#sheetWrap');

  // filter counts + total
  $$('.filter').forEach(b => { const f = b.dataset.filter; $('sup', b).textContent = f === 'all' ? items.length : items.filter(x => x.t === f).length; });
  $('#idxTotal').textContent = `(${items.length})`;

  function drawIndex() {
    const data = items.filter(x => filter === 'all' || x.t === filter).sort(SORTS[sort]);
    const n = data.length, noun = NOUN[filter][n === 1 ? 0 : 1];
    const inStock = data.filter(x => x.avail).length;
    $('#count').textContent = `${n} ${noun}${n ? ` — ${inStock} in stock` : ''}`;
    plateHide();
    toc.classList.remove('hov');
    if (!n) {
      toc.innerHTML = '<li class="empty mono">Nothing in this section right now. Check back for the next issue.</li>';
      sheet.innerHTML = '<p class="empty mono">Nothing in this section right now. Check back for the next issue.</p>';
      return;
    }
    toc.innerHTML = data.map((x, i) => `
      <li class="trow trow-new${x.avail ? '' : ' sold'}" style="--i:${Math.min(i, 14)}" data-h="${esc(x.h)}">
        <a class="trow-a" href="${esc(x.u)}" data-h="${esc(x.h)}" target="_blank" rel="noopener">
          <span class="t-no mono">${pad(x.no)}</span>
          <span class="t-name">${esc(x.n)}${x.isNew ? '<em>new</em>' : ''}</span>
          <span class="t-meta mono"><span class="t-cat">${CAT[x.t] || x.t}</span><span class="t-sz">${esc(sizeText(x))}</span>${x.avail ? '' : '<span class="t-st">Sold out</span>'}</span>
          <span class="t-price mono${x.avail ? '' : ' t-sold'}">${priceText(x)}<small>CAD</small></span>
        </a>
      </li>`).join('');
    const feat = filter === 'all' && (sort === 'featured' || sort === 'new') && n >= 8;
    sheet.innerHTML = data.map((x, i) => `
      <a class="frame frame-new${feat && i === 0 ? ' feat' : ''}${x.avail ? '' : ' sold'}${x.isNew ? ' isnew' : ''}" style="--i:${Math.min(i, 14)}" data-h="${esc(x.h)}" href="${esc(x.u)}" target="_blank" rel="noopener">
        <div class="film" aria-hidden="true"><span>MC-01 / ${pad(x.no)}</span><span>${pad(x.no)}A</span></div>
        <div class="xp${zoomy(x) ? ' zoom' : ''}"><img class="ph" loading="lazy" decoding="async" draggable="false" src="${esc(safeUrl(photo(x, 0, feat && i === 0 ? 1000 : 720)))}" alt="${esc(x.n)}"></div>
        <div class="cap">
          <span class="no mono">${pad(x.no)}</span><b>${esc(x.n)}</b>
          <span class="pr">${priceText(x)} <small>CAD</small></span>
          <span class="sz">${esc(sizeText(x))}</span>
          ${x.avail ? '' : '<span class="st">Sold out</span>'}
        </div>
      </a>`).join('');
  }
  function setFilter(f) {
    filter = f;
    $$('.filter').forEach(b => { const on = b.dataset.filter === f; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    drawIndex();
  }
  function setView(v) {
    view = v;
    $$('.view').forEach(b => { const on = b.dataset.view === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    toc.hidden = v !== 'toc'; sheetWrap.hidden = v !== 'sheet';
    plateHide();
    if (lookbookReady) requestAnimationFrame(lbMeasure);
  }
  $$('.filter').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
  $('#sort').addEventListener('change', e => { sort = e.target.value; drawIndex(); });
  $$('.view').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  // cover teasers jump to a filtered index
  $$('[data-go]').forEach(a => a.addEventListener('click', () => { setFilter(a.dataset.go); setView('toc'); }));

  // ---- Pointer plate over index titles ------------------------------------------------
  const plate = $('#plate'), plateImg = $('#plateImg'), plateCap = $('#plateCap');
  const zoomy = x => x.t === 'accessory' && /ring/i.test(x.h);
  const P = { x: 0, y: 0, tx: 0, ty: 0, rot: 0, on: false, raf: 0, h: null };
  function plateHide() {
    P.on = false; P.h = null; plate.classList.remove('on', 'sharp');
    $$('.trow.hot', toc).forEach(r => r.classList.remove('hot'));
    toc.classList.remove('hov');
  }
  function plateShow(row, x, y) {
    const h = row.dataset.h; const it = byHandle(h); if (!it) return;
    $$('.trow.hot', toc).forEach(r => { if (r !== row) r.classList.remove('hot'); });
    row.classList.add('hot'); toc.classList.add('hov');
    if (P.h !== h) {
      P.h = h;
      plate.classList.remove('sharp');
      plateImg.onload = () => { if (P.h === h) requestAnimationFrame(() => plate.classList.add('sharp')); };
      plateImg.src = safeUrl(photo(it, 0, 640));
      plateImg.alt = ''; plate.classList.toggle('zoom', zoomy(it));
      plateCap.textContent = `No. ${row.querySelector('.t-no').textContent} — ${CAT[it.t] || ''} — ${priceText(it)} CAD`;
      if (plateImg.complete && plateImg.naturalWidth) requestAnimationFrame(() => plate.classList.add('sharp'));
    }
    P.tx = x; P.ty = y;
    if (!P.on) { P.x = x; P.y = y; P.on = true; plate.classList.add('on'); if (!P.raf) P.raf = requestAnimationFrame(plateTick); }
  }
  function plateTick() {
    const w = plate.offsetWidth, hgt = plate.offsetHeight;
    let ax = P.tx + 34, ay = P.ty - hgt * 0.5;
    if (ax + w > innerWidth - 14) ax = P.tx - w - 34;
    ay = clamp(ay, 58, innerHeight - hgt - 40);
    const px = P.x;
    P.x += (ax - P.x) * 0.13; P.y += (ay - P.y) * 0.13;
    P.rot += (clamp((P.x - px) * 0.9, -7, 7) - P.rot) * 0.15;
    plate.style.transform = `translate3d(${P.x.toFixed(1)}px, ${P.y.toFixed(1)}px, 0) rotate(${P.rot.toFixed(2)}deg)`;
    if (P.on || Math.abs(ax - P.x) > 1) P.raf = requestAnimationFrame(plateTick); else P.raf = 0;
  }
  if (fine) {
    toc.addEventListener('pointermove', e => {
      const row = e.target.closest('.trow'); if (!row || !row.dataset.h) { plateHide(); return; }
      plateShow(row, e.clientX, e.clientY);
    });
    toc.addEventListener('pointerleave', plateHide);
    addEventListener('scroll', () => { if (P.on) { const el = document.elementFromPoint(lastPt.x, lastPt.y); const row = el && el.closest && el.closest('.trow'); if (row) plateShow(row, lastPt.x, lastPt.y); else plateHide(); } }, { passive: true });
    // keyboard focus shows the plate beside the row
    toc.addEventListener('focusin', e => { const a = e.target.closest('.trow-a'); if (!a) return; const r = a.getBoundingClientRect(); plateShow(a.parentNode, clamp(r.left + r.width * 0.66, 100, innerWidth - 100), clamp(r.top + r.height / 2, 120, innerHeight - 120)); });
    toc.addEventListener('focusout', e => { if (!toc.contains(e.relatedTarget)) plateHide(); });
    // warm the cache once the index is near
    if ('IntersectionObserver' in window) {
      const wio = new IntersectionObserver(es => { if (es[0].isIntersecting) { wio.disconnect(); const warm = () => items.forEach(x => { const i = new Image(); i.src = safeUrl(photo(x, 0, 640)); }); if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 800 }); else setTimeout(warm, 300); } }, { rootMargin: '800px 0px' });
      wio.observe(toc);
    }
  }

  // touch: tap a title to unfold its plate
  function unfoldRow(row) {
    const it = byHandle(row.dataset.h); if (!it) return;
    const a = $('.trow-a', row);
    const open = row.classList.contains('open');
    $$('.trow.open', toc).forEach(r => { if (r !== row) { r.classList.remove('open'); $('.trow-a', r).setAttribute('aria-expanded', 'false'); } });
    if (!$('.t-more', row)) {
      row.insertAdjacentHTML('beforeend', `<div class="t-more"><div class="t-more-in"><div class="t-more-box">
        <div class="xp${zoomy(it) ? ' zoom' : ''}"><img class="ph" loading="lazy" decoding="async" draggable="false" src="${esc(safeUrl(photo(it, 0, 700)))}" alt="${esc(it.n)}"></div>
        <dl class="mono"><div><dt>Section</dt><dd>${CAT[it.t] || ''}</dd></div><div><dt>Price</dt><dd>${priceText(it)} CAD</dd></div><div><dt>Sizes</dt><dd>${esc(sizeText(it))}</dd></div>
        <a class="t-open mono" href="${esc(it.u)}" data-h="${esc(it.h)}">Open the piece</a></dl></div></div></div>`);
    }
    requestAnimationFrame(() => { row.classList.toggle('open', !open); a.setAttribute('aria-expanded', String(!open)); });
  }

  // ---- Lookbook strip ------------------------------------------------------------------
  const LOOKS = [
    ['monochrome-acid-washed-black', 3, '4/5', 1.0, '0px'],
    ['white-monochrome-jersey', 2, '3/2', .72, '7vh'],
    ['monochrome-sweatshirt', 1, '3/4', 1.0, '-3vh'],
    ['monochrome-cargo-skirt', 1, '4/3', .62, '10vh'],
    ['black-monochrome-jersey', 3, '4/5', .92, '-4vh'],
    ['monochrome-pants-chain', 1, '1/1', .68, '8vh'],
    ['acid-washed-monochrome-hoodie', 3, '4/5', .86, '-6vh'],
    ['monochrome-cargo-shorts-black', 2, '3/4', .96, '2vh'],
    ['monochrome-sleeveless-crop-top', 2, '3/2', .6, '9vh'],
    ['monochrome-cross-necklace', 2, '4/5', .84, '-5vh'],
    ['monochrome-acid-washed-grey', 3, '3/2', .64, '8vh'],
    ['royal-black', 0, '1/1', .56, '-2vh']
  ].map(l => ({ x: byHandle(l[0]), i: l[1], ar: l[2], k: l[3], mt: l[4] })).filter(l => l.x);
  const lbTrack = $('#lbTrack'), lbSec = $('#lookbook'), lbPin = $('#lbPin');
  let lookbookReady = false;
  lbTrack.innerHTML = `
    <div class="lb-intro"><h2 aria-label="Lookbook"><span aria-hidden="true">Look</span><span class="ital" aria-hidden="true">book</span></h2>
      <p class="mono">${LOOKS.length} frames from the issue. <span class="lb-how">Keep scrolling.</span> Click a frame to open the piece.</p></div>
    ${LOOKS.map((l, n) => `
    <a class="lb-fig" href="${esc(l.x.u)}" data-h="${esc(l.x.h)}" style="--k:${l.k};--ar:${l.ar};--mt:${l.mt}" target="_blank" rel="noopener">
      <span class="lb-no" aria-hidden="true">${pad(n + 1)}</span>
      <div class="xp"><img class="ph" ${n < 3 ? '' : 'loading="lazy"'} decoding="async" draggable="false" src="${esc(safeUrl(photo(l.x, l.i, 1000)))}" alt="${esc(l.x.n)}, lookbook photograph ${n + 1}"></div>
      <span class="lb-cap mono"><b>Fig. ${pad(n + 1)}</b><span>${esc(l.x.n)}</span><span>${priceText(l.x)}</span></span>
    </a>`).join('')}
    <div class="lb-out"><span class="mono">End of the lookbook</span><a href="#index">The<br>index<span class="arr" aria-hidden="true"></span></a></div>`;
  const lbFigs = $$('.lb-fig', lbTrack);
  const lb = { pinned: false, travel: 0, p: 0 };
  const lbNo = $('#lbNo'), lbBar = $('#lbBar'), lbHint = $('#lbHint');
  const setNo = k => { const t = `Fig. ${pad(k + 1)} / ${pad(LOOKS.length)}`; if (lbNo.textContent !== t) lbNo.textContent = t; };
  function lbModeCheck() {
    const want = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches && !reduce;
    lb.pinned = want;
    lbSec.classList.toggle('pinned', want);
    if (want) { lbTrack.removeAttribute('tabindex'); lbTrack.scrollLeft = 0; lbHint.textContent = 'Scroll'; }
    else { lbTrack.tabIndex = 0; lbSec.style.height = ''; lbTrack.style.transform = ''; lbHint.textContent = 'Swipe'; }
    $('.lb-how').textContent = want ? 'Keep scrolling.' : 'Swipe sideways.';
    lbMeasure();
  }
  function lbMeasure() {
    lookbookReady = true;
    lbFigs.forEach(f => { f._cx = f.offsetLeft + f.offsetWidth / 2; });
    if (!lb.pinned) { lbUpdate(); return; }
    const last = lbTrack.lastElementChild;
    lb.travel = Math.max(0, last.offsetLeft + last.offsetWidth + parseFloat(getComputedStyle(lbTrack).paddingLeft) + 8 - innerWidth);
    lbSec.style.height = (lbPin.offsetHeight || innerHeight) + lb.travel + 'px';
    lbUpdate();
  }
  function lbUpdate() {
    let view0 = 0, w = innerWidth;
    if (lb.pinned) {
      const top = lbSec.getBoundingClientRect().top;
      const p = lb.travel > 0 ? clamp(-top / lb.travel, 0, 1) : 0;
      lb.p = p; view0 = p * lb.travel;
      lbTrack.style.transform = `translate3d(${(-view0).toFixed(1)}px,0,0)`;
    } else {
      const max = lbTrack.scrollWidth - lbTrack.clientWidth;
      lb.p = max > 0 ? lbTrack.scrollLeft / max : 0; view0 = lbTrack.scrollLeft; w = lbTrack.clientWidth;
    }
    lbBar.style.setProperty('--p', lb.p.toFixed(4));
    let best = 0, bd = 1e9;
    lbFigs.forEach((f, k) => {
      const c = f._cx - view0 - w / 2, d = Math.abs(c);
      if (d < bd) { bd = d; best = k; }
      if (Math.abs(c) < w) f.style.setProperty('--pk', clamp(-c / w * 9, -6, 6).toFixed(2));
    });
    setNo(best);
  }
  let lbRaf = 0;
  const lbQueue = () => { if (!lbRaf) lbRaf = requestAnimationFrame(() => { lbRaf = 0; lbUpdate(); }); };
  addEventListener('scroll', () => { if (lb.pinned) lbQueue(); }, { passive: true });
  lbTrack.addEventListener('scroll', () => { if (!lb.pinned) lbQueue(); }, { passive: true });
  lbPin.addEventListener('scroll', () => { lbPin.scrollLeft = 0; });
  // keyboard focus on an off-screen frame scrolls the page to bring it in
  lbTrack.addEventListener('focusin', e => {
    if (!lb.pinned) return; const f = e.target.closest('.lb-fig'); if (!f) return;
    lbPin.scrollLeft = 0;
    const p = clamp((f._cx - innerWidth / 2) / (lb.travel || 1), 0, 1);
    const secTop = scrollY + lbSec.getBoundingClientRect().top + (lb.p * lb.travel);
    scrollTo({ top: secTop + p * lb.travel, behavior: 'auto' });
  });
  const lbMq = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  (lbMq.addEventListener ? lbMq.addEventListener('change', lbModeCheck) : lbMq.addListener(lbModeCheck));
  addEventListener('resize', () => { lbMeasure(); buildTickersDebounced(); });
  let tkT = 0; const buildTickersDebounced = () => { clearTimeout(tkT); tkT = setTimeout(buildTickers, 250); };
  lbModeCheck();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lbMeasure);
  addEventListener('load', () => {
    lbMeasure();
    // a shared #hash link is resolved before the lookbook has its pinned height, so land on it again
    if (location.hash.length > 1) { try { const t = document.querySelector(location.hash); if (t) t.scrollIntoView({ behavior: 'auto' }); } catch { /* invalid selector */ } }
  });
  // images settling can nudge layout
  $$('img', lbTrack).forEach(im => im.addEventListener('load', () => { if (lb.pinned) lbMeasure(); }, { once: true }));

  // ---- Drifting numerals ------------------------------------------------------------------
  const drifts = $$('[data-drift]');
  if (drifts.length && !reduce) {
    let dRaf = 0;
    const dr = () => { dRaf = 0; drifts.forEach(el => { const r = el.parentNode.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return; el.style.transform = `translate3d(${(r.top * parseFloat(el.dataset.drift) * 1.4).toFixed(1)}px,0,0)`; }); };
    addEventListener('scroll', () => { if (!dRaf) dRaf = requestAnimationFrame(dr); }, { passive: true }); dr();
  }

  // ---- Contents overlay --------------------------------------------------------------------
  const menu = $('#menu'), menuBtn = $('#menuBtn');
  let menuT = 0;
  function openMenu() {
    clearTimeout(menuT); menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => { requestAnimationFrame(() => { menu.classList.add('open'); const f = $('.menu-x', menu); if (f) f.focus(); }); });
  }
  function closeMenu(restore = true) {
    menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    menuT = setTimeout(() => { menu.hidden = true; }, reduce ? 0 : 620);
    if (restore) menuBtn.focus();
  }
  menuBtn.addEventListener('click', () => (menu.hidden || !menu.classList.contains('open')) ? openMenu() : closeMenu());
  menu.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closeMenu();
    const a = e.target.closest('a'); if (a && a.getAttribute('href') && a.getAttribute('href').startsWith('#')) closeMenu(false);
  });

  // ---- Product spread --------------------------------------------------------------------------
  const pdp = $('#pdp'), pdpMain = $('#pdpMain'), pdpImg = $('#pdpImg');
  let cur = null, sel = [], shot = 0, lastFocus = null, pdpT = 0;
  const variantFor = () => cur.variants.find(v => v.options.length === sel.length && v.options.every((o, i) => o === sel[i]));
  const hasChoice = () => cur.options.length && !(cur.options.length === 1 && cur.options[0].values.length === 1 && /default/i.test(cur.options[0].values[0]));

  function showShot(i) {
    const n = cur.images.length; if (!n) return;
    shot = (i + n) % n;
    pdpImg.style.visibility = '';
    pdpImg.src = safeUrl(sized(cur.images[shot].src, 1200));
    pdpImg.alt = `${cur.title}, photograph ${shot + 1} of ${n}`;
    const s = lensMap.get(pdpMain); if (s) { s.col.dataset.src = ''; if (lens && lens.xp === pdpMain) lensKill(); }
    $('#pdpCount').textContent = `${pad(shot + 1)} / ${pad(n)}`;
    $$('#pdpThumbs button').forEach((b, k) => { b.classList.toggle('on', k === shot); b.setAttribute('aria-current', k === shot ? 'true' : 'false'); });
  }
  function drawOpts() {
    const v = variantFor();
    $('#pdpOpts').innerHTML = hasChoice() ? cur.options.map((o, oi) => o.values.length < 2 ? '' : `
      <div class="opt"><span class="opt-name">${esc(o.name)}<b>${esc(sel[oi] || '')}</b></span><div class="chips" role="group" aria-label="${esc(o.name)}">${o.values.map(val => {
        const ok = cur.variants.some(x => x.available && x.options[oi] === val && x.options.every((ov, k) => k === oi || ov === sel[k]));
        return `<button type="button" class="chip${sel[oi] === val ? ' on' : ''}" data-o="${oi}" data-v="${esc(val)}"${ok ? '' : ' disabled'} aria-pressed="${sel[oi] === val}">${esc(val)}</button>`;
      }).join('')}</div></div>`).join('') : '';
    const buy = $('#pdpBuy'), can = !!(v && v.available);
    if (can) { buy.href = `${STORE_URL}/cart/${v.id}:1`; } else { buy.removeAttribute('href'); }
    $('#pdpBuyT').textContent = can ? 'Add to bag' : 'Sold out';
    buy.setAttribute('aria-disabled', can ? 'false' : 'true');
    $('#pdpAlert').hidden = can;
    $('#pdpPrice').innerHTML = `${esc(fmt(v ? v.price : cur.price))}<small>CAD</small>`;
  }
  function openPdp(h) {
    cur = DATA.products.find(p => p.handle === h); if (!cur) return;
    clearTimeout(pdpT);
    const first = cur.variants.find(v => v.available) || cur.variants[0];
    sel = first ? first.options.slice() : [];
    lastFocus = document.activeElement;
    plateHide(); lensKill();
    pdpMain.classList.remove('dev'); $('#pdpDev').setAttribute('aria-pressed', 'false');
    const it = byHandle(h);
    $('#pdpType').textContent = `${(CAT[cur.category] || cur.category)} — No. ${pad(it ? it.no : 0)}`;
    $('#pdpCredits').innerHTML = [['Plate', `No. ${pad(it ? it.no : 0)}`], ['Section', CAT[cur.category] || cur.category], ['Sizes', it ? sizeText(it) : ''], ['Photographs', pad(cur.images.length)], ['Delivery', 'Calculated at checkout']].map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('');
    $('#pdpTitle').textContent = cur.title;
    $('#pdpDesc').textContent = (cur.description || '').trim();
    $('#pdpPage').href = `${STORE_URL}/products/${cur.handle}`;
    $('#pdpThumbs').innerHTML = cur.images.map((im, k) => `<button type="button" aria-label="Photograph ${k + 1}"><img loading="lazy" draggable="false" src="${esc(safeUrl(sized(im.src, 160)))}" alt=""><b>${pad(k + 1)}</b></button>`).join('');
    showShot(0); drawOpts();
    pdp.hidden = false; document.documentElement.style.overflow = 'hidden';
    pdp.scrollTop = 0; $('.pdp-r', pdp).scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { pdp.classList.add('open'); $('.pdp-x', pdp).focus({ preventScroll: true }); }));
  }
  function closePdp() {
    pdp.classList.remove('open'); lensKill();
    if (menu.hidden) document.documentElement.style.overflow = '';
    pdpT = setTimeout(() => { pdp.hidden = true; }, reduce ? 0 : 680);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  pdp.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closePdp();
    const chip = e.target.closest('.chip'); if (chip && !chip.disabled) { sel[+chip.dataset.o] = chip.dataset.v; drawOpts(); return; }
    const th = e.target.closest('#pdpThumbs button'); if (th) showShot([...th.parentNode.children].indexOf(th));
    if (e.target.closest('#pdpAlert')) { closePdp(); }
    if (e.target.closest('#pdpBuy[aria-disabled="true"]')) e.preventDefault();
  });
  $('#pdpDev').addEventListener('click', () => {
    const on = pdpMain.classList.toggle('dev'); $('#pdpDev').setAttribute('aria-pressed', on); lensKill();
  });
  // swipe the main photograph
  let sx0 = null;
  pdpMain.addEventListener('pointerdown', e => { sx0 = e.clientX; });
  pdpMain.addEventListener('pointerup', e => { if (sx0 != null && Math.abs(e.clientX - sx0) > 50 && e.pointerType !== 'mouse') showShot(shot + (e.clientX < sx0 ? 1 : -1)); sx0 = null; });
  pdpMain.addEventListener('pointercancel', () => { sx0 = null; });

  document.addEventListener('keydown', e => {
    if (!menu.hidden && menu.classList.contains('open')) {
      if (e.key === 'Escape') return closeMenu();
      if (e.key === 'Tab') trap(e, menu);
      return;
    }
    if (pdp.hidden) return;
    if (e.key === 'Escape') return closePdp();
    if (e.key === 'ArrowRight' && !e.target.closest('input,select')) showShot(shot + 1);
    if (e.key === 'ArrowLeft' && !e.target.closest('input,select')) showShot(shot - 1);
    if (e.key === 'Tab') trap(e, pdp);
  });
  function trap(e, root) {
    const f = $$('button:not(:disabled),a[href]', root).filter(x => !x.hidden && x.offsetParent !== null && x.getAttribute('aria-disabled') !== 'true');
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || !root.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && (document.activeElement === z || !root.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
  }

  // product links open the product spread (modified clicks still go to the store)
  document.addEventListener('click', e => {
    if (e.defaultPrevented) return;
    const a = e.target.closest('a[data-h]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (a.classList.contains('trow-a') && noHover()) { e.preventDefault(); unfoldRow(a.parentNode); return; }
    e.preventDefault(); openPdp(a.dataset.h);
  });

  drawIndex();
  setView('toc');
})();
