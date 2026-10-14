/* MONOCHROME® — CLASSIFIED (multi-page). Behaviour shared by every page (a work of fiction, see the footer):
   links (MC.url), the DECLASSIFY toggle (redaction bars), stamps + reveals, the declassify lens on photographs,
   live camera clocks, tickers, counters, the file index + search overlay, the once-per-session intro on the briefing,
   prefetch. Page-specific code lives in shop.js, product.js and lookbook.js. */
(() => {
  'use strict';

  // ---- Site helpers ----------------------------------------------------------
  // window.MC = {root, idx, page} is written into every page's <head> by the generator:
  // root is the relative path back to the site root ('', '../', '../../'), idx is '' (clean URLs) or 'index.html' (preview build).
  const MC = window.MC = window.MC || { root: '', idx: '' };
  clearTimeout(window.__mcRv); // core is running: the reveal failsafe is no longer needed
  // Theme runtime: the layout writes window.MC = {routes, catalogUrl, ...}; every link is a real Shopify URL.
  const ROUTES = MC.routes || {};
  const STORE = '';
  MC.store = STORE;
  const ROUTE_OF = { '': ROUTES.home || '/', 'shop/': ROUTES.shop, 'lookbook/': ROUTES.lookbook, 'about/': ROUTES.about, 'shipping/': ROUTES.shipping, 'faq/': ROUTES.faq, 'contact/': ROUTES.contact };
  MC.url = p => {
    const m = String(p || '').match(/^([^?#]*)(.*)$/), hit = ROUTE_OF[m[1]];
    if (hit) return hit + m[2];
    const prod = /^products\/([^/]+)\/?$/.exec(m[1]);
    return (prod ? '/products/' + prod[1] : '/' + m[1]) + m[2];
  };
  MC.asset = p => p;
  const $ = MC.$ = (s, r = document) => r.querySelector(s);
  const $$ = MC.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  MC.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MC.fmt = v => { const c = MC.currency || 'CAD'; try { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).format(v); } catch { return Number(v).toFixed(2) + ' ' + c; } };
  MC.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  MC.pad = n => String(n).padStart(2, '0');
  MC.sized = (src, w) => { if (!/^(https?:)?\/\//.test(src)) return src; try { const u = new URL(src, location.href); u.searchParams.set('width', w); return u.href; } catch { return src; } };
  MC.safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, document.baseURI).href)); } catch { return ''; } };
  MC.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  MC.fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  MC.noHover = () => matchMedia('(hover: none)').matches;
  const { clamp, pad, esc, reduce, fine, noHover } = MC;
  const root = document.documentElement;
  if (reduce) root.classList.add('reduce');

  // newsletter forms are real Shopify customer forms; the page reloads with the confirmation
  $$('form.news').forEach(f => f.addEventListener('submit', () => { const n = $('.news-note', f); if (n) n.textContent = 'Signing you up…'; }));
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // images that fail to load simply hide, never leaving a broken icon
  document.addEventListener('error', e => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && img.classList.contains('ph')) img.style.visibility = 'hidden';
  }, true);

  // ---- Reveals + stamps (always released: observer + failsafe) -------------------
  // .rv fades up; .stamp thunks on when it comes into view. Both are an entrance, never a gate.
  const rvEls = $$('.rv, .stamp');
  const rvIo = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rvIo.unobserve(e.target); } }), { rootMargin: '0px 0px -5% 0px', threshold: 0.05 })
    : null;
  rvEls.forEach(el => (rvIo && !reduce) ? rvIo.observe(el) : el.classList.add('in'));
  const releaseVisible = () => rvEls.forEach(el => {
    if (el.classList.contains('in')) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.96 && r.bottom > 0) el.classList.add('in');
  });
  // guaranteed fallback: whatever the visitor has not scrolled to is released a few seconds after load,
  // so every page is complete at rest
  const releaseAll = () => rvEls.forEach(el => el.classList.add('in'));
  setTimeout(releaseVisible, 1200);
  addEventListener('load', () => { setTimeout(releaseVisible, 400); setTimeout(releaseAll, 2600); });
  setTimeout(releaseAll, 5000); // in case load never fires (a stalled image)
  addEventListener('beforeprint', releaseAll);
  let rvRaf = 0; addEventListener('scroll', () => { if (!rvRaf) rvRaf = requestAnimationFrame(() => { rvRaf = 0; releaseVisible(); }); }, { passive: true });

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

  // ---- Live camera clocks: HH:MM:SS counting up (static with reduced motion) ------------------------
  const clocks = $$('[data-clock]');
  if (clocks.length && !reduce) {
    const parse = s => { const m = s.trim().match(/^(\d+):(\d+):(\d+)$/); return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : 0; };
    clocks.forEach(c => { c._t = parse(c.textContent); });
    setInterval(() => {
      if (document.hidden) return;
      clocks.forEach(c => { c._t = (c._t + 1) % 86400; c.textContent = `${pad(Math.floor(c._t / 3600))}:${pad(Math.floor(c._t / 60) % 60)}:${pad(c._t % 60)}`; });
    }, 1000);
  }

  // ---- DECLASSIFY: lift every redaction bar (remembered, guarded) -------------------------------------
  // Redaction bars only ever cover decorative secondary text. Names, prices, sizes and availability are never redacted.
  const dcs = $$('#declass, [data-declass]');
  const popStamp = () => {
    if (reduce) return;
    $$('.stamp-pop').forEach(n => n.remove());
    const s = document.createElement('span');
    s.className = 'stamp white stamp-pop in'; s.setAttribute('aria-hidden', 'true'); s.textContent = 'Declassified';
    document.body.appendChild(s); setTimeout(() => s.remove(), 1600);
  };
  function setDeclass(on, announce) {
    root.classList.toggle('declass', on);
    dcs.forEach(b => b.setAttribute('aria-pressed', String(on)));
    if (announce && on) popStamp();
  }
  if (dcs.length) {
    setDeclass(root.classList.contains('declass'), false);
    dcs.forEach(dc => dc.addEventListener('click', () => {
      const on = !root.classList.contains('declass');
      setDeclass(on, true);
      try { localStorage.setItem('mc-declass', on ? '1' : '0'); } catch { /* storage blocked: the toggle still works for this page */ }
    }));
    addEventListener('storage', e => { if (e.key === 'mc-declass') setDeclass(e.newValue === '1', false); });
  }
  // tap (or Enter / Space) on a single bar lifts or drops just that bar
  document.addEventListener('click', e => { const r = e.target.closest && e.target.closest('.redact'); if (r) r.classList.toggle('lift'); });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('redact')) { e.preventDefault(); e.target.classList.toggle('lift'); }
  });

  // ---- Declassify lens: true colour under the pointer (hold on touch) ----------------------------------
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
  // touch: press and hold (the listener that stops the page scrolling under the lens exists only while a finger is holding)
  let tp = null;
  const blockTouch = e => { if (e.cancelable) e.preventDefault(); };
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const xp = e.target.closest ? e.target.closest('.xp') : null; if (!xp || xp.classList.contains('dev')) return;
    tp = { xp, id: e.pointerId, x: e.clientX, y: e.clientY, on: false };
    tp.t = setTimeout(() => { if (!tp) return; tp.on = true; document.addEventListener('touchmove', blockTouch, { passive: false }); lensStart(xp, tp.x, tp.y, true); if (navigator.vibrate) try { navigator.vibrate(8); } catch { /* ignore */ } }, 300);
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (!tp || e.pointerId !== tp.id) return;
    if (tp.on) { lensMove(e.clientX, e.clientY); return; }
    if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 9) { clearTimeout(tp.t); tp = null; }
  }, { passive: true });
  const tpEnd = e => {
    if (!tp || (e && e.pointerId !== tp.id)) return;
    clearTimeout(tp.t);
    if (tp.on) { lensStop(); suppressClick = performance.now() + 450; document.removeEventListener('touchmove', blockTouch); }
    tp = null;
  };
  document.addEventListener('pointerup', tpEnd, { passive: true });
  document.addEventListener('pointercancel', tpEnd, { passive: true });
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.xp') && (tp || noHover())) e.preventDefault(); });
  document.addEventListener('click', e => { if (suppressClick > performance.now()) { e.preventDefault(); e.stopPropagation(); } }, true);

  // ---- File index overlay + command bar (search the archive for a page or an asset) -----------------------
  const menu = $('#menu'), menuBtn = $('#menuBtn'), jump = $('#jump'), jList = $('#jumpList'), jNone = $('#jumpNone');
  let menuT = 0, catalog = null, catPromise = null, jItems = [], jSel = -1;
  const menuOpen = () => !menu.hidden && menu.classList.contains('open');
  function openMenu(focusFind) {
    clearTimeout(menuT); menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true');
    root.style.overflow = 'hidden'; root.classList.add('menu-up');
    loadCatalog();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      menu.classList.add('open');
      const f = focusFind ? jump : $('.menu-x', menu); if (f) f.focus({ preventScroll: true });
    }));
  }
  function closeMenu(restore = true) {
    menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    root.style.overflow = ''; root.classList.remove('menu-up');
    menuT = setTimeout(() => { menu.hidden = true; }, reduce ? 0 : 620);
    if (restore) menuBtn.focus({ preventScroll: true });
  }
  function pageEntries() {
    const KW = ['briefing cover home operation mission', 'index store buy products collection register assets equipment shop', 'photos photographs film strip evidence exhibits surveillance lookbook', 'story brand formula briefing objectives rules engagement about', 'delivery nigeria canada countries returns refund distribution routes extraction shipping', 'questions help answers debrief faq transcript', 'email instagram report secure channel contact'];
    const nav = $$('.menu-list a', menu).map((a, i) => ({ type: 'Page', title: a.querySelector('b').textContent, href: a.getAttribute('href'), meta: a.querySelector('i') ? a.querySelector('i').textContent : '', kw: KW[i] || '' }));
    const extra = [
      ['Page', 'Tops', 'shop/?c=top', 'Asset register', 'shirts tee jersey hoodie sweatshirt crop'],
      ['Page', 'Bottoms', 'shop/?c=bottom', 'Asset register', 'cargo shorts skirt pants'],
      ['Page', 'Hardware', 'shop/?c=accessory', 'Asset register', 'rings chains necklace jewellery jewelry accessories objects'],
      ['Page', 'Gift cards', 'shop/?c=gift', 'Asset register', 'gift card voucher present'],
      ['Page', 'Print: the Vision Issue', 'shop/?c=print', 'Asset register', 'magazine print issue vision zine read'],
      ['Page', 'Returns & exchanges', 'shipping/#returns', 'Extraction routes', 'refund return exchange policy'],
      ['Page', 'Size guidance', 'shipping/#sizing', 'Extraction routes', 'size sizing fit measurements'],
      ['Page', 'Join the network', 'contact/#subscribe', 'Report in', 'newsletter email drop alerts signup subscribe']
    ].map(([type, title, href, meta, kw]) => ({ type, title, href: MC.url(href), meta, kw }));
    const ext = [
      { type: 'Store', title: 'Bag', href: ROUTES.cart || '/cart', meta: 'Your bag', kw: 'cart checkout bag basket' },
      { type: 'Social', title: '@monochrome.ca', href: 'https://www.instagram.com/monochrome.ca/', meta: 'Instagram', kw: 'instagram social' },
      { type: 'Mail', title: 'info.mccanada@gmail.com', href: 'mailto:info.mccanada@gmail.com', meta: 'Email', kw: 'email contact mail' }
    ];
    return [...nav, ...extra, ...ext];
  }
  function loadCatalog() {
    if (catPromise) return catPromise;
    catPromise = new Promise(resolve => {
      const done = list => {
        const prods = (list || []).map(p => ({ type: 'Asset', title: p.t, href: p.u, meta: (p.v ? 'From ' : '') + MC.fmt(p.p) + (p.a ? '' : ' — sold out'), kw: `${p.h} ${p.c} ${p.ty || ''} ${p.s || ''}`.toLowerCase() }));
        catalog = [...pageEntries(), ...prods]; resolve(catalog);
        if (jump && jump.value) renderJump();
      };
      // the live catalogue: /collections/all?view=catalog (templates/collection.catalog.liquid), so it is always current
      fetch(MC.catalogUrl || '/collections/all?view=catalog', { credentials: 'same-origin' }).then(r => r.ok ? r.text() : '[]').then(t => done(JSON.parse(t))).catch(() => done([]));
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
      if (MC.popupOpen && MC.popupOpen()) return;
      const typing = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === '/') { e.preventDefault(); openMenu(true); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openMenu(true); }
    });
    menuBtn.addEventListener('pointerenter', () => { loadCatalog(); }, { once: true });
  }

  // ---- Self-typing search boxes: the placeholder types a real query, backspaces it, then types the next ------------------
  // The phrases come from the generator (data-hints), each one checked against the catalogue so every suggestion finds something.
  // It runs only while the box is empty, unfocused and on screen; with reduced motion the static placeholder stays.
  function typingHints(input) {
    const hints = (input.dataset.hints || '').split('|').filter(Boolean);
    if (reduce || hints.length < 2) return;
    const base = input.getAttribute('placeholder') || '';
    let timer = 0, w = Math.floor(Math.random() * hints.length), k = 0, phase = 'pause', onScreen = false;
    const set = t => input.setAttribute('placeholder', t);
    const idle = () => onScreen && !document.hidden && document.activeElement !== input && !input.value;
    function stop() { clearTimeout(timer); timer = 0; set(base); }
    function start(delay) { if (!timer && idle()) timer = setTimeout(tick, delay || 0); }
    function tick() {
      timer = 0;
      if (!idle()) { set(base); return; }
      const word = hints[w];
      if (phase === 'pause') { k = 0; phase = 'type'; set('|'); timer = setTimeout(tick, 450); return; }
      if (phase === 'type') {
        k++; set(word.slice(0, k) + '|');
        if (k >= word.length) { phase = 'hold'; timer = setTimeout(tick, 900); return; }
        timer = setTimeout(tick, 80 + Math.random() * 90); return;
      }
      if (phase === 'hold') { set(word); phase = 'hold2'; timer = setTimeout(tick, 380); return; }
      if (phase === 'hold2') { set(word + '|'); phase = 'erase'; timer = setTimeout(tick, 380); return; }
      k--; set(k > 0 ? word.slice(0, k) + '|' : '|');
      if (k <= 0) { phase = 'pause'; w = (w + 1) % hints.length; timer = setTimeout(tick, 380); return; }
      timer = setTimeout(tick, 34);
    }
    input.addEventListener('focus', stop);
    input.addEventListener('input', stop);
    input.addEventListener('blur', () => { phase = 'pause'; start(900); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { phase = 'pause'; start(400); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => { onScreen = e.isIntersecting; if (onScreen) { phase = 'pause'; start(900); } else stop(); })).observe(input);
    }
  }
  $$('input[data-hints]').forEach(typingHints);

  // ---- Incoming transmission: the magazine pop-up -----------------------------------------------------------------
  // Offered once a week per browser (remembered in localStorage, guarded), a few seconds in or when the visitor has read a good way down,
  // never over the intro, the file index or a box they are typing in. Esc, the backdrop, Close and "Not now" all dismiss it.
  const mp = $('#magpop');
  const saveDataEarly = !!(navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || '')));
  if (mp) (function () {
    const KEY = 'mc-magpop-' + mp.dataset.key, WEEK = 7 * 864e5, card = $('.mp-card', mp);
    let stored = true;
    const last = () => { try { return +localStorage.getItem(KEY) || 0; } catch { stored = false; return 0; } };
    if (Date.now() - last() < WEEK) return;
    if (!stored && MC.page !== 'home') return; // cannot remember a dismissal, so only ever offer it on the briefing
    // the cover sits in a hidden box, so a lazy image would only start loading when it opens: fetch it quietly once the page has settled
    const warmCover = () => { if (saveDataEarly) return; const im = $('.mp-img', mp); if (im) im.loading = 'eager'; };
    if (document.readyState === 'complete') setTimeout(warmCover, 1500); else addEventListener('load', () => setTimeout(warmCover, 1500));
    let seconds = 0, shown = false, exit = false, back = null;
    const isOpen = () => mp.classList.contains('open');
    MC.popupOpen = isOpen;
    const foreign = () => {
      const fe = document.querySelector('shopify-forms-embed'), ov = fe && fe.shadowRoot && fe.shadowRoot.querySelector('[data-layout="overlay"]');
      if (ov) { const r = ov.getBoundingClientRect(), cs = getComputedStyle(ov); if (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden') return true; }
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return !!(el && (el.closest('shopify-forms-embed, shopify-chat') || (el.closest('[aria-modal="true"]') && !el.closest('#magpop, #menu, #mcDrawer'))));
    };
    const ready = () => !shown && !document.hidden && !root.style.overflow && !MC.drawerOpen && !$('.intro') && !(menu && menuOpen()) &&
      !(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
    function show() {
      shown = true; back = document.activeElement;
      try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ }
      mp.hidden = false; root.style.overflow = 'hidden'; root.classList.add('mp-open');
      const watch = setInterval(() => {
        if (!isOpen() && shown && mp.hidden) { clearInterval(watch); return; }
        if (isOpen() && foreign()) { clearInterval(watch); hide(); try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } }
      }, 600);
      requestAnimationFrame(() => requestAnimationFrame(() => { mp.classList.add('open'); card.focus({ preventScroll: true }); }));
    }
    function hide() {
      if (!isOpen()) return;
      mp.classList.remove('open'); root.style.overflow = ''; root.classList.remove('mp-open');
      setTimeout(() => { mp.hidden = true; }, reduce ? 0 : 320);
      if (back && back.focus) try { back.focus({ preventScroll: true }); } catch { /* element gone */ }
    }
    mp.addEventListener('click', e => { if (e.target.closest('[data-close]')) hide(); });
    document.addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
      if (e.key !== 'Tab' || foreign()) return;
      const f = $$('a[href],button:not(:disabled)', mp).filter(x => x.offsetParent !== null && x.tabIndex !== -1);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || !mp.contains(document.activeElement) || document.activeElement === card)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !mp.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    });
    if (fine) document.addEventListener('mouseout', e => { if (!e.relatedTarget && e.clientY <= 0 && seconds >= 6) exit = true; });
    const wait = (+MC.magpopDelay || 9) + (noHover() ? 3 : 0);
    const iv = setInterval(() => {
      if (document.hidden) return;
      if (foreign()) { clearInterval(iv); return; }
      seconds++;
      const depth = (scrollY + innerHeight) / Math.max(1, document.documentElement.scrollHeight);
      if ((seconds >= wait || (seconds >= 4 && depth > 0.6) || exit) && ready()) { clearInterval(iv); show(); }
      else if (seconds > 120) clearInterval(iv);
    }, 1000);
  })();

  // ---- Intro: IDENTITY VERIFIED / CLEARANCE GRANTED. Briefing page only, once per session, skippable, never blocks ------
  // The overlay ignores the pointer (pointer-events: none) so nothing underneath is ever blocked; any key, tap, click or scroll
  // dismisses it, it removes itself after a few seconds, and it is not created at all with reduced motion.
  function intro() {
    if (reduce || MC.page !== 'home' || location.hash || MC.intro === false) return;
    try {
      if (sessionStorage.getItem('mc-intro') === '1') return;
      sessionStorage.setItem('mc-intro', '1');
    } catch { return; } // no storage, no way to keep it to once per session: skip it
    const arcs = [[10, 14], [17, 22], [24, 30], [31, 38], [38, 46], [45, 54]].map(([rx, ry], i) => `<ellipse cx="60" cy="76" rx="${rx}" ry="${ry}" style="--i:${i}"/>`).join('');
    const el = document.createElement('div');
    el.className = 'intro'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="in-box"><svg class="in-fp" viewBox="0 0 120 152" focusable="false"><g>${arcs}</g><path d="M60 22v108M36 40c10-8 38-8 48 0M32 112c14 10 42 10 56 0" /></svg><i class="in-scan"></i>
      <p class="in-l1">Identity <b>verified</b></p><p class="in-l2">Clearance <b>granted</b></p><p class="in-l3">Welcome, operative.</p><i class="in-bar"></i><span class="in-skip">${noHover() ? 'Tap anywhere to skip' : 'Press any key to skip'}</span></div>`;
    document.body.appendChild(el);
    let gone = false;
    const off = e => {
      if (gone) return; gone = true;
      if (e && (e.type === 'pointerdown' || e.type === 'touchstart')) { const eat = ev => { ev.preventDefault(); ev.stopPropagation(); }; addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => removeEventListener('click', eat, true), 800); }
      el.classList.add('out'); setTimeout(() => el.remove(), 500); ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(t => removeEventListener(t, off, true)); };
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, off, { capture: true, passive: true }));
    setTimeout(off, 2900);
  }
  intro();

  // ---- Instant prefetch: warm the page under the pointer / finger / focus -----------------------
  const warmed = new Set();
  const saveData = !!(navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || '')));
  function warm(a) {
    try {
      if (saveData) return;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return; // file:// cannot prefetch
      u.hash = '';
      if (['/cart/', '/account/logout', '/checkout', '/challenge', '/password'].some(x => u.pathname.startsWith(x)) || a.hasAttribute('data-no-warm')) return;
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
