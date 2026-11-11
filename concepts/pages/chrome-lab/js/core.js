/* MONOCHROME® — CHROME LAB (multi-page). Shared page script, loaded on every page.
   Link helper (MC.url), store wiring, menu, prefetch, view-transition hooks, command-bar triggers, HUD / cursor / glass sheen,
   and the loader for the WebGL scene (js/lab3d.js) on pages that use it. Nothing here is required for the page to read correctly. */
(() => {
  'use strict';
  const MC = window.MC || (window.MC = { root: './', idx: '', mode: 'off' });
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = !!MC.reduce;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  // ---- links: every JS-made URL goes through here so the site works under any base path and in the explicit index.html preview build ----
  MC.url = (p = '') => {
    const m = String(p).match(/^([^?#]*)(.*)$/);
    let a = m[1];
    if (a === '' || a.endsWith('/')) a += MC.idx;
    return MC.root + a + m[2];
  };
  MC.asset = p => MC.root + p;

  // ---- config + helpers ----
  const CFG = window.MONOCHROME_CONFIG || {};
  MC.store = (CFG.storeUrl || 'https://monochrome.com.ng').replace(/\/$/, '');
  MC.fmt = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(v);
  MC.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MC.pad2 = n => String(n).padStart(2, '0');
  MC.sized = (src, w) => (!/^https?:/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}width=${w}`);
  MC.safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, document.baseURI).href)); } catch { return ''; } };
  MC.state = { depth: 0, vel: 0, g: 0, camZ: 0 };
  MC.fine = fine;

  // pages are server-rendered with the store URL from config.js; this keeps them in step if config.js is edited without a rebuild
  $$('[data-store]').forEach(a => { a.href = MC.store + a.dataset.store; });
  $$('form[data-store-action]').forEach(f => { f.action = MC.store + f.dataset.storeAction; f.addEventListener('submit', () => { const n = $('.news-note', f); if (n) n.textContent = 'Opening the store in a new tab to finish your signup.'; }); });
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  // broken / unsupported images fall back to the emblem
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && 'img' in img.dataset && !img.classList.contains('fallback')) { img.classList.add('fallback'); img.removeAttribute('srcset'); img.src = MC.asset('assets/emblem.webp'); }
  }, true);

  // ---- menu ----
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  if (nav && menuBtn) {
    const setMenu = open => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.firstElementChild.textContent = open ? 'Close' : 'Menu'; };
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    $('#links').addEventListener('click', e => { if (e.target.closest('a,[data-cmd]')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
    document.addEventListener('pointerdown', e => { if (nav.classList.contains('open') && !e.target.closest('#nav')) setMenu(false); }, { passive: true });
  }

  // ---- prefetch the page under the pointer / focus / finger (same origin only) ----
  if (location.protocol !== 'file:') {
    const seen = new Set();
    const conn = navigator.connection || {};
    const slow = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    const prefetch = a => {
      if (slow || !a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return;
      let u; try { u = new URL(a.href, location.href); } catch { return; }
      if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return;
      u.hash = '';
      const key = u.pathname + u.search;
      if (key === location.pathname + location.search || seen.has(key) || seen.size >= 30) return;
      seen.add(key);
      const l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.href; l.as = 'document';
      document.head.appendChild(l);
    };
    let pt = 0;
    const linkOf = e => (e.target.closest ? e.target.closest('a[href]') : null);
    document.addEventListener('pointerover', e => { const a = linkOf(e); if (a) { clearTimeout(pt); pt = setTimeout(() => prefetch(a), 60); } }, { passive: true });
    document.addEventListener('pointerout', () => clearTimeout(pt), { passive: true });
    document.addEventListener('touchstart', e => { const a = linkOf(e); if (a) prefetch(a); }, { passive: true });
    document.addEventListener('focusin', e => { const a = linkOf(e); if (a) prefetch(a); });
  }

  // ---- cross-document view transitions: the clicked product photo travels to the product page (and back) ----
  let lastCard = null;
  document.addEventListener('click', e => { lastCard = e.target.closest ? e.target.closest('.card') : null; }, true);
  const nameImg = (card, on) => { const im = card && card.querySelector('.pic img:not(.alt)'); if (im) im.style.viewTransitionName = on ? 'pimg' : ''; };
  addEventListener('pageswap', e => {
    try {
      if (!e.viewTransition || !lastCard || !lastCard.isConnected) return;
      nameImg(lastCard, true);
      e.viewTransition.finished.finally(() => nameImg(lastCard, false));
    } catch { /* progressive enhancement only */ }
  });
  addEventListener('pagereveal', e => {
    try {
      if (!e.viewTransition) return;
      const from = navigation.activation && navigation.activation.from && navigation.activation.from.url;
      const h = from && (new URL(from).pathname.match(/\/products\/([^/]+)\/?/) || [])[1];
      if (!h || $('.stage-main')) return;
      const card = $(`.card[data-h="${CSS.escape(h)}"]`);
      if (card) { nameImg(card, true); e.viewTransition.finished.finally(() => nameImg(card, false)); }
    } catch { /* progressive enhancement only */ }
  });

  // ---- command bar (js/palette.js is fetched the first time it is needed) ----
  let palState = 0, palWant = false;
  function loadPalette() {
    if (palState) return;
    palState = 1;
    const s = document.createElement('script');
    s.src = MC.asset('js/palette.js');
    s.onload = () => { palState = 2; if (palWant && MC.palette) MC.palette.open(); };
    s.onerror = () => { palState = 0; };
    document.head.appendChild(s);
  }
  const openPalette = () => { palWant = true; if (MC.palette) MC.palette.open(); else loadPalette(); };
  MC.openPalette = openPalette;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cmd]'); if (b) { e.preventDefault(); openPalette(); } });
  document.addEventListener('keydown', e => {
    const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey)) { e.preventDefault(); openPalette(); }
  });
  // warm it up once the page is idle, so the first open is instant
  (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => { if (!palState) loadPalette(); }, { timeout: 5000 });

  // ---- WebGL scene: only on pages that ask for it (html[data-gl] is hero | tunnel | ambient), only when it can run ----
  MC.glState = 'off';
  const glFail = () => {
    if (MC.glState === 'failed') return;
    MC.glState = 'failed'; MC.gl = false;
    root.classList.remove('gl-on', 'has-canvas'); root.classList.add('no-gl');
    document.dispatchEvent(new CustomEvent('mc:glfailed'));
  };
  MC.glFailed = glFail;
  MC.glReady = api => { MC.api = api; MC.glState = 'ready'; root.classList.add('has-canvas'); document.dispatchEvent(new CustomEvent('mc:glready')); };
  function loadGL() {
    if (!MC.gl || MC.mode === 'off') return;
    MC.glState = 'pending';
    const s = document.createElement('script');
    s.type = 'module'; s.src = MC.asset('js/lab3d.js');
    s.onerror = glFail;
    document.head.appendChild(s);
    // the tunnel page lays itself out around the scene, so give up on it quickly if it never reports back
    if (MC.mode === 'tunnel') setTimeout(() => { if (MC.glState === 'pending') glFail(); }, 9000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadGL); else loadGL();

  // ---- HUD, progress bar, motion layer ----
  const bar = $('#progress'), hudDepth = $('#hudDepth'), hudVel = $('#hudVel'), hudClock = $('#hudClock');
  let clockFmt = null;
  try { clockFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Regina', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch { /* no clock */ }
  let lastHud = 0, lastY = scrollY, skew = 0;
  const heroH = $('.hero-h');
  function ui(now) {
    if (document.hidden) { requestAnimationFrame(ui); return; }
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
    const dy = scrollY - lastY; lastY = scrollY;
    if (heroH && !reduceMotion) { skew += (Math.max(-6, Math.min(6, dy * .08)) - skew) * .12; heroH.style.setProperty('--sk', skew.toFixed(2) + 'deg'); }
    if (now - lastHud > 100) {
      lastHud = now;
      const S = MC.state;
      const depth = MC.glState === 'ready' && MC.mode === 'tunnel' ? S.depth : (h > 0 ? scrollY / h * 100 : 0);
      if (hudDepth) hudDepth.textContent = `DEPTH ${depth.toFixed(1).padStart(5, '0')} M`;
      const v = MC.glState === 'ready' && MC.mode !== 'ambient' ? S.vel : Math.max(-1, Math.min(1, dy / 60));
      if (hudVel) hudVel.textContent = `VEL ${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}`;
      if (hudClock && clockFmt) hudClock.textContent = `REGINA SK ${clockFmt.format(new Date())}`;
    }
    requestAnimationFrame(ui);
  }
  requestAnimationFrame(ui);

  // The chrome-type glint only runs on headings that are on screen, and pauses while the page is scrolling
  // (animating background-clip:text repaints on the main thread, which is what a scrolling frame cannot afford).
  let scrT = 0;
  addEventListener('scroll', () => { if (!root.classList.contains('scrolling')) root.classList.add('scrolling'); clearTimeout(scrT); scrT = setTimeout(() => root.classList.remove('scrolling'), 160); }, { passive: true });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const gio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('lit', e.isIntersecting)), { threshold: .2 });
    $$('.hero-h, .chrome-h, .foot-mark').forEach(el => gio.observe(el));
  }

  // glass sheen follows the pointer; product cards tilt a little; the cursor swells into an OPEN disc over pieces
  if (fine && !reduceMotion) {
    document.addEventListener('pointermove', e => {
      const g = e.target.closest && e.target.closest('.glass');
      if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
      const c = e.target.closest && e.target.closest('.card');
      if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 8 + 'deg'); c.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 8 + 'deg'); }
    }, { passive: true });
    document.addEventListener('pointerout', e => { const c = e.target.closest && e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });

    const cur = $('#cursor'), curTxt = $('#cursorTxt');
    if (cur) {
      let cx = 0, cy = 0, tx = 0, ty = 0, seen = false;
      addEventListener('pointermove', e => {
        tx = e.clientX; ty = e.clientY; if (!seen) { seen = true; cx = tx; cy = ty; }
        cur.classList.add('on');
        const t = e.target;
        const piece = (MC.hoverIdx >= 0 && MC.mode === 'tunnel') || (t.closest && t.closest('.card'));
        const ctl = t.closest && t.closest('a,button,summary,select,label,input');
        cur.classList.toggle('big', !!piece); cur.classList.toggle('sm', !piece && !!ctl);
        if (piece) curTxt.textContent = 'OPEN';
      }, { passive: true });
      document.addEventListener('mouseleave', () => cur.classList.remove('on'));
      (function loop() { if (!document.hidden) { cx += (tx - cx) * .24; cy += (ty - cy) * .24; cur.style.transform = `translate(${cx - cur.offsetWidth / 2}px,${cy - cur.offsetHeight / 2}px)`; } requestAnimationFrame(loop); })();
    }
  }

  // mono labels decode themselves once as they arrive (the text is always present; this only plays on top)
  const GLYPHS = '01<>/\\|+*#%$@';
  const scramble = el => {
    if (reduceMotion || el.dataset.done) return; el.dataset.done = 1;
    const txt = el.textContent; let f = 0;
    const id = setInterval(() => {
      el.textContent = [...txt].map((ch, i) => ch === ' ' || i < f / 2 ? ch : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');
      if (++f > txt.length * 2) { clearInterval(id); el.textContent = txt; }
    }, 26);
  };
  const eio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { scramble(e.target); eio.unobserve(e.target); } }), { threshold: 1 }) : null;
  $$('.eyebrow').forEach(el => eio && eio.observe(el));
})();
