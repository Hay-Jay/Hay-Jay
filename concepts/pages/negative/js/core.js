/* MONOCHROME® — NEGATIVE (multi-page). Behaviour shared by every page:
   links (MC.url), invert toggle, contents overlay + find, exposure lens, reveals, tickers, counters,
   running-head tone, prefetch. Page-specific code lives in shop.js, product.js, lookbook.js, contact.js. */
(() => {
  'use strict';

  // ---- Site helpers ----------------------------------------------------------
  // window.MC = {root, idx} is written into every page's <head> by the generator:
  // root is the relative path back to the site root ('', '../', '../../'), idx is '' (clean URLs) or 'index.html' (preview build).
  const MC = window.MC = window.MC || { root: '', idx: '' };
  clearTimeout(window.__mcRv); // core is running: the reveal failsafe is no longer needed
  const CFG = window.MONOCHROME_CONFIG || {};
  const STORE = String(CFG.storeUrl || 'https://monochrome.com.ng').replace(/\/$/, '');
  MC.store = STORE;
  MC.url = p => {
    const m = String(p || '').match(/^([^?#]*)(.*)$/);
    return m[1] === '' || m[1].endsWith('/') ? (MC.root + m[1] + MC.idx + m[2]) || './' : MC.root + m[1] + m[2];
  };
  MC.asset = p => MC.root + p;
  const $ = MC.$ = (s, r = document) => r.querySelector(s);
  const $$ = MC.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  MC.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MC.fmt = v => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(v);
  MC.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  MC.pad = n => String(n).padStart(2, '0');
  MC.sized = (src, w) => !/^https?:/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}width=${w}`;
  MC.safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, document.baseURI).href)); } catch { return ''; } };
  MC.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  MC.fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  MC.noHover = () => matchMedia('(hover: none)').matches;
  const { clamp, pad, esc, reduce, fine, noHover } = MC;
  const root = document.documentElement;
  if (reduce) root.classList.add('reduce');

  // Anything pointing at the Shopify storefront follows config.js (the generator already wrote the same default).
  $$('[data-store]').forEach(a => { a.href = STORE + a.dataset.store; });
  $$('form.news').forEach(f => {
    f.action = `${STORE}/contact#contact_form`;
    f.addEventListener('submit', () => { const n = $('.news-note', f); if (n) n.textContent = 'Opening the store in a new tab to finish your signup.'; });
  });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

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

  // ---- Tickers ----------------------------------------------------------------
  const tickers = $$('[data-ticker]');
  function buildTickers() {
    tickers.forEach(el => {
      if (!el._unit) el._unit = el.firstElementChild ? el.firstElementChild.innerHTML : '';
      const unit = el._unit;
      el.innerHTML = `<div class="tk">${unit}</div>`;
      const tk = el.firstElementChild;
      let guard = 0; while (tk.offsetWidth < innerWidth * 1.05 && guard++ < 14) tk.insertAdjacentHTML('beforeend', unit);
      el.insertAdjacentHTML('beforeend', tk.outerHTML.replace('class="tk"', 'class="tk" aria-hidden="true"'));
      el.style.animationDuration = Math.max(20, tk.offsetWidth / 38) + 's';
    });
  }
  if (tickers.length) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildTickers);
    buildTickers();
    if ('IntersectionObserver' in window) {
      const tio = new IntersectionObserver(es => es.forEach(e => { e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; }), { rootMargin: '100px' });
      tickers.forEach(t => tio.observe(t));
    }
    let tkT = 0; addEventListener('resize', () => { clearTimeout(tkT); tkT = setTimeout(buildTickers, 250); });
  }

  // ---- Counters (the final number is already in the HTML) ------------------------
  const statEls = $$('.num[data-to]');
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
  if (statEls.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } }), { threshold: 0.7 });
    statEls.forEach(el => cio.observe(el));
  }

  // ---- Running head: its tone follows the spread (paper or ink) under it ---------------
  const bar = $('#bar');
  const spreads = $$('.spread[data-tone]');
  let toneRaf = 0, lastTone = null;
  function toneUpdate() {
    toneRaf = 0;
    const probe = 23; let hit = null;
    for (const s of spreads) { const r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { hit = s; break; } }
    if (!hit) return;
    const t = hit.classList.contains('paper') ? 'paper' : 'ink';
    if (t !== lastTone) { lastTone = t; bar.classList.toggle('tone-paper', t === 'paper'); }
  }
  const toneQueue = () => { if (!toneRaf) toneRaf = requestAnimationFrame(toneUpdate); };
  if (bar && spreads.length) { addEventListener('scroll', toneQueue, { passive: true }); addEventListener('resize', toneQueue); toneUpdate(); }

  // ---- Paper / ink toggle: global, remembered ------------------------------------------
  const inv = $('#invert');
  if (inv) {
    inv.setAttribute('aria-pressed', String(root.classList.contains('neg')));
    inv.addEventListener('click', () => {
      const on = root.classList.toggle('neg');
      inv.setAttribute('aria-pressed', String(on));
      try { localStorage.setItem('mc-neg', on ? '1' : '0'); } catch { /* storage blocked: the toggle still works for this page */ }
    });
    addEventListener('storage', e => {
      if (e.key !== 'mc-neg') return;
      const on = e.newValue === '1'; root.classList.toggle('neg', on); inv.setAttribute('aria-pressed', String(on));
    });
  }

  // ---- Exposure lens: true colour under the pointer (hold on touch) ------------------------
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
  MC.lensKill = lensKill;
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
    root.addEventListener('pointerleave', lensStop);
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

  // ---- Drifting numerals -------------------------------------------------------------------
  const drifts = $$('[data-drift]');
  if (drifts.length && !reduce) {
    let dRaf = 0;
    const dr = () => { dRaf = 0; drifts.forEach(el => { const r = el.parentNode.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return; el.style.transform = `translate3d(${(r.top * parseFloat(el.dataset.drift) * 1.4).toFixed(1)}px,0,0)`; }); };
    addEventListener('scroll', () => { if (!dRaf) dRaf = requestAnimationFrame(dr); }, { passive: true }); dr();
  }

  // ---- Contents overlay + command bar (find a page or a piece) -------------------------------
  const menu = $('#menu'), menuBtn = $('#menuBtn'), jump = $('#jump'), jList = $('#jumpList'), jNone = $('#jumpNone');
  let menuT = 0, catalog = null, catPromise = null, jItems = [], jSel = -1;
  const menuOpen = () => !menu.hidden && menu.classList.contains('open');
  function openMenu(focusFind) {
    clearTimeout(menuT); menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true');
    root.style.overflow = 'hidden';
    loadCatalog();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      menu.classList.add('open');
      const f = focusFind ? jump : $('.menu-x', menu); if (f) f.focus({ preventScroll: true });
    }));
  }
  function closeMenu(restore = true) {
    menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    root.style.overflow = '';
    menuT = setTimeout(() => { menu.hidden = true; }, reduce ? 0 : 620);
    if (restore) menuBtn.focus({ preventScroll: true });
  }
  function pageEntries() {
    const nav = $$('.menu-list a', menu).map(a => ({ type: 'Page', title: a.querySelector('b').textContent, href: a.getAttribute('href'), meta: a.querySelector('.mono:last-child') ? a.querySelector('i').textContent : '', kw: '' }));
    const extra = [
      ['Page', 'Tops', 'shop/?c=top', 'The Index', 'shirts tee jersey hoodie sweatshirt crop'],
      ['Page', 'Bottoms', 'shop/?c=bottom', 'The Index', 'cargo shorts skirt pants'],
      ['Page', 'Objects', 'shop/?c=accessory', 'The Index', 'rings chains necklace jewellery jewelry accessories'],
      ['Page', 'Gift cards', 'shop/?c=gift', 'The Index', 'gift card voucher present'],
      ['Page', 'Returns & exchanges', 'shipping/#returns', 'Distribution', 'refund return exchange policy'],
      ['Page', 'Size guidance', 'shipping/#sizing', 'Distribution', 'size sizing fit measurements'],
      ['Page', 'Subscribe', 'contact/#subscribe', 'Colophon', 'newsletter email drop alerts signup']
    ].map(([type, title, href, meta, kw]) => ({ type, title, href: MC.url(href), meta, kw }));
    const kwMap = { shop: 'index store buy products collection', lookbook: 'photos photographs film strip', about: 'story brand formula', shipping: 'delivery nigeria canada countries returns refund distribution', faq: 'questions help letters answers', contact: 'email instagram colophon' };
    nav.forEach(n => { const k = Object.keys(kwMap).find(x => n.title.toLowerCase() === x); if (k) n.kw = kwMap[k]; });
    const ext = [
      { type: 'Store', title: 'Bag', href: STORE + '/cart', meta: 'Opens the store', kw: 'cart checkout' },
      { type: 'Social', title: '@monochrome.ca', href: 'https://www.instagram.com/monochrome.ca/', meta: 'Instagram', kw: 'instagram social' },
      { type: 'Mail', title: 'info.mccanada@gmail.com', href: 'mailto:info.mccanada@gmail.com', meta: 'Email', kw: 'email contact mail' }
    ];
    return [...nav, ...extra, ...ext];
  }
  function loadCatalog() {
    if (catPromise) return catPromise;
    catPromise = new Promise(resolve => {
      const done = () => {
        const D = window.MONOCHROME_DATA;
        const prods = D ? D.products.map((p, i) => ({ type: 'Piece', title: p.title.trim(), href: MC.url(`products/${p.handle}/`), meta: (p.priceMax > p.price ? 'From ' : '') + MC.fmt(p.price) + (p.available ? '' : ' — sold out'), kw: `${p.handle} ${p.category} ${p.type || ''} ${p.sizes.join(' ')}`.toLowerCase() })) : [];
        catalog = [...pageEntries(), ...prods]; resolve(catalog);
        if (jump && jump.value) renderJump();
      };
      if (window.MONOCHROME_DATA) return done();
      const s = document.createElement('script'); s.src = MC.asset('data/products.js'); s.onload = done; s.onerror = done; document.head.appendChild(s);
    });
    return catPromise;
  }
  function score(it, toks) {
    const t = it.title.toLowerCase(), hay = `${t} ${it.kw} ${it.type.toLowerCase()} ${(it.meta || '').toLowerCase()}`;
    let sc = 0;
    for (const k of toks) {
      if (!hay.includes(k)) return -1;
      sc += t.startsWith(k) ? 6 : t.includes(' ' + k) ? 4 : t.includes(k) ? 3 : 1;
    }
    return sc + (it.type === 'Page' ? 1 : 0);
  }
  function renderJump() {
    const q = jump.value.trim().toLowerCase();
    menu.classList.toggle('searching', !!q);
    if (!q || !catalog) { jList.hidden = true; jList.innerHTML = ''; jNone.hidden = true; jItems = []; jSel = -1; jump.setAttribute('aria-expanded', 'false'); jump.removeAttribute('aria-activedescendant'); return; }
    const toks = q.split(/\s+/);
    jItems = catalog.map(it => ({ it, s: score(it, toks) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s).slice(0, 12).map(x => x.it);
    jSel = jItems.length ? 0 : -1;
    jList.innerHTML = jItems.map((it, i) => `<li role="presentation"><a class="jump-i" role="option" id="j${i}" aria-selected="${i === 0}" href="${esc(it.href)}"${/^https?:/.test(it.href) ? ' target="_blank" rel="noopener"' : ''}><span class="mono">${esc(it.type)}</span><b>${esc(it.title)}</b><span class="mono">${esc(it.meta || '')}</span></a></li>`).join('');
    jList.hidden = !jItems.length; jNone.hidden = !!jItems.length;
    jump.setAttribute('aria-expanded', String(!!jItems.length));
    if (jItems.length) jump.setAttribute('aria-activedescendant', 'j0'); else jump.removeAttribute('aria-activedescendant');
  }
  function jumpMove(d) {
    if (!jItems.length) return;
    jSel = (jSel + d + jItems.length) % jItems.length;
    $$('.jump-i', jList).forEach((a, i) => a.setAttribute('aria-selected', String(i === jSel)));
    const a = $('#j' + jSel); jump.setAttribute('aria-activedescendant', 'j' + jSel); if (a) a.scrollIntoView({ block: 'nearest' });
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', e => { e.preventDefault(); menuOpen() ? closeMenu() : openMenu(false); });
    menu.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) return closeMenu();
      const a = e.target.closest('a'); if (a && a.getAttribute('href') && a.getAttribute('href').startsWith('#')) closeMenu(false);
    });
    if (jump) {
      jump.addEventListener('input', () => { loadCatalog().then(renderJump); renderJump(); });
      jump.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); jumpMove(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); jumpMove(-1); }
        else if (e.key === 'Enter') { const a = $('#j' + Math.max(0, jSel)); if (a && jItems.length) { e.preventDefault(); a.click(); } }
      });
    }
    const trap = (e, rootEl) => {
      const f = $$('button:not(:disabled),a[href],input', rootEl).filter(x => !x.hidden && x.offsetParent !== null && x.getAttribute('aria-disabled') !== 'true');
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || !rootEl.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !rootEl.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', e => {
      if (menuOpen()) {
        if (e.key === 'Escape') { if (jump && jump.value) { jump.value = ''; renderJump(); jump.focus(); return; } return closeMenu(); }
        if (e.key === 'Tab') trap(e, menu);
        return;
      }
      const typing = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === '/') { e.preventDefault(); openMenu(true); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openMenu(true); }
    });
    // arriving through a link that opens the contents overlay (#contents on pages with no JS is the footer)
    menuBtn.addEventListener('pointerenter', () => { loadCatalog(); }, { once: true });
  }

  // ---- Instant prefetch: warm the page under the pointer / finger / focus -----------------------
  const warmed = new Set();
  function warm(a) {
    try {
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (!/^https?:|^file:/.test(u.protocol) || u.origin !== location.origin) return;
      u.hash = '';
      if (u.href === location.href.split('#')[0] || warmed.has(u.href)) return;
      warmed.add(u.href);
      const l = document.createElement('link'); l.rel = 'prefetch'; l.as = 'document'; l.href = u.href; document.head.appendChild(l);
    } catch { /* prefetch is only ever a hint */ }
  }
  let warmT = 0;
  document.addEventListener('pointerover', e => { const a = e.target.closest && e.target.closest('a[href]'); if (!a || e.pointerType === 'touch') return; clearTimeout(warmT); warmT = setTimeout(() => warm(a), 35); }, { passive: true });
  document.addEventListener('focusin', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a) warm(a); });
  document.addEventListener('touchstart', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a) warm(a); }, { passive: true });
})();
