(() => {
  'use strict';

  // ---- Config ---------------------------------------------------------
  // Product data comes from data/products.js (a snapshot of the Shopify store, refreshed by scripts/sync-products.mjs).
  const STORE_URL = 'https://monochrome.com.ng'; // Shopify storefront (cart, checkout, product pages)
  const CURRENCY = 'CAD';                         // must match the store's currency
  const LOCALE = 'en-CA';
  const EMBLEM = 'assets/emblem.webp';

  // ---- Helpers --------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = v => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(v);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DATA = window.MONOCHROME_DATA || { products: [], collections: [] };
  // Shopify's CDN resizes on request. HEIC uploads come back as PNG, so they still display.
  const sized = (src, w) => !/^https?:/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}width=${w}`;
  const isHeic = src => /\.heic(\?|$)/i.test(src);
  const safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, STORE_URL).href)); } catch { return ''; } };

  // Point every data-store link at the storefront.
  $$('[data-store]').forEach(a => { a.href = STORE_URL + a.dataset.store; if (a.classList.contains('btn') || a.classList.contains('social')) { a.target = '_blank'; a.rel = 'noopener'; } });
  $('#year').textContent = new Date().getFullYear();

  // Broken / unsupported images (e.g. .heic) fall back to the emblem.
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && 'img' in img.dataset && !img.classList.contains('fallback')) {
      img.classList.add('fallback'); img.src = EMBLEM;
    }
  }, true);

  // Fade sections in as they scroll into view.
  document.documentElement.classList.add('js');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }) : null;
  $$('.section > *, .foot > *').forEach(el => { el.classList.add('reveal'); io ? io.observe(el) : el.classList.add('in'); });

  // ---- Motion layer ---------------------------------------------------
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Loader: counts up while the page settles, then lifts. Never blocks for more than ~1.4s.
  const pct = $('#loadPct'); let shown = 0, done = false;
  const finish = () => { if (done) return; done = true; if (pct) pct.textContent = 100; setTimeout(() => document.documentElement.classList.add('ready'), 150); };
  const tick = setInterval(() => { shown = Math.min(shown + 7 + Math.random() * 9, 96); if (pct) pct.textContent = Math.round(shown); }, 70);
  const ready = () => { clearInterval(tick); finish(); };
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready);
  setTimeout(ready, 1400);

  // Scroll progress bar
  const bar = $('#progress');
  const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (fine && !reduceMotion) {
    // Cursor: lerped dot that swells over anything clickable
    const cur = $('#cursor'); let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); cur.classList.toggle('big', !!e.target.closest('a,button,summary,.avatar-wrap')); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('on'));
    (function loop() { cx += (tx - cx) * .22; cy += (ty - cy) * .22; cur.style.transform = `translate(${cx - cur.offsetWidth / 2}px,${cy - cur.offsetHeight / 2}px)`; requestAnimationFrame(loop); })();

    // Magnetic buttons
    $$('.btn,.pill').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // 3D tilt on product cards (delegated, since the grid re-renders)
    const grid = $('#products');
    grid.addEventListener('pointermove', e => {
      const c = e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect();
      c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 12 + 'deg');
      c.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 12 + 'deg');
    });
    grid.addEventListener('pointerout', e => { const c = e.target.closest('.card'); if (c) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
  }

  // Big marquee drifts with scroll, in the direction you scroll
  const bwTrack = $$('#bigword span');
  let drift = 0, lastScroll = scrollY;
  if (bwTrack.length && !reduceMotion) {
    (function d() { drift += (scrollY - lastScroll) * .6 + .25; lastScroll = scrollY; const w = bwTrack[2].offsetLeft - bwTrack[0].offsetLeft || 2400; const x = -(((drift % w) + w) % w); bwTrack.forEach(el => { el.style.transform = `translateX(${x}px)`; }); requestAnimationFrame(d); })();
  }

  // Hero spotlight follows the pointer
  const hero = $('.hero');
  if (hero && fine) hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', e.clientX - r.left + 'px'); hero.style.setProperty('--my', e.clientY - r.top + 'px'); });

  // Eyebrow labels decode themselves as they appear
  const GLYPHS = '01<>/\\|+*#%$@';
  const scramble = el => {
    if (reduceMotion || el.dataset.done) return; el.dataset.done = 1;
    const txt = el.textContent; let f = 0;
    const id = setInterval(() => {
      el.textContent = [...txt].map((ch, i) => ch === ' ' || i < f / 2 ? ch : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');
      if (++f > txt.length * 2) { clearInterval(id); el.textContent = txt; }
    }, 28);
  };
  const eio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { scramble(e.target); eio.unobserve(e.target); } }), { threshold: 1 }) : null;
  $$('.eyebrow').forEach(el => eio && eio.observe(el));

  // ---- Store state ----------------------------------------------------
  const items = DATA.products.map(p => {
    const imgs = p.images.map(i => i.src);
    const ok = imgs.filter(s => !isHeic(s));
    const main = ok[0] || imgs[0] || '';
    return {
      n: p.title, p: p.price, pMax: p.priceMax, t: p.category, avail: p.available, sizes: p.sizes,
      u: `${STORE_URL}/products/${p.handle}`,
      i: main ? sized(main, 600) : '',
      i2: ok[1] ? sized(ok[1], 600) : '',
      d: p, h: p.handle
    };
  }).sort((a, b) => b.avail - a.avail);
  const groups = () => ['top', 'bottom', 'accessory'].map(t => items.filter(x => x.t === t && x.avail && x.i));

  // ---- Fit Studio -----------------------------------------------------
  let idx = [0, 0, 0], rot = -5, dragging = false, sx = 0, startRot = 0, challengeTimer = null;
  const selected = () => groups().map((g, i) => g[idx[i] % g.length]);

  function renderFit() {
    const s = selected();
    $('#topOverlay').style.backgroundImage = `linear-gradient(#0003,#0003),url("${s[0].i}")`;
    $('#bottomOverlay').style.backgroundImage = `linear-gradient(#0004,#0004),url("${s[1].i}")`;
    $('#accessory').style.backgroundImage = `url("${s[2].i}")`;
    $('#total').textContent = fmt(s.reduce((a, x) => a + x.p, 0));
    $('#slots').innerHTML = ['Top', 'Bottom', 'Object'].map((label, i) => `
      <div class="slot">
        <div class="slot-top"><span>${label.toUpperCase()}</span><span>LIVE PIECE</span></div>
        <div class="slot-row">
          <button class="arrow" type="button" data-step="${i}:-1" aria-label="Previous ${label.toLowerCase()}">←</button>
          <a class="selected" href="${esc(s[i].u)}" target="_blank" rel="noopener">
            <img data-img src="${esc(safeUrl(s[i].i))}" alt="">
            <span><b>${esc(s[i].n)}</b><small>${fmt(s[i].p)}</small></span>
          </a>
          <button class="arrow" type="button" data-step="${i}:1" aria-label="Next ${label.toLowerCase()}">→</button>
        </div>
      </div>`).join('');
  }

  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    const [i, d] = b.dataset.step.split(':').map(Number), len = groups()[i].length;
    idx[i] = (idx[i] + d + len) % len; renderFit();
  });
  const randomize = () => { idx = groups().map(g => Math.floor(Math.random() * g.length)); renderFit(); };
  $('#random').onclick = randomize;
  $('#shopLook').onclick = () => window.open(selected()[0].u, '_blank', 'noopener');

  const wrap = $('#avatarWrap'), av = $('#avatar');
  wrap.addEventListener('pointerdown', e => { dragging = true; sx = e.clientX; startRot = rot; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener('pointermove', e => {
    if (!dragging) return;
    rot = Math.max(-32, Math.min(32, startRot + (e.clientX - sx) * .12));
    av.style.transform = `${matchMedia('(min-width:820px)').matches ? 'scale(1.22) ' : ''}rotateY(${rot}deg)`;
  });
  ['pointerup', 'pointercancel'].forEach(t => wrap.addEventListener(t, () => { dragging = false; }));

  $('#start').onclick = () => {
    clearInterval(challengeTimer);
    let t = 45; const el = $('#timer'); el.textContent = '00:45'; randomize();
    challengeTimer = setInterval(() => {
      t--; el.textContent = '00:' + String(Math.max(t, 0)).padStart(2, '0');
      if (t <= 0) clearInterval(challengeTimer);
    }, 1000);
  };

  // ---- Store grid -----------------------------------------------------
  let filter = 'all';
  function drawStore() {
    const data = items.filter(x => filter === 'all' || x.t === filter);
    const price = x => (x.pMax > x.p ? 'From ' : '') + fmt(x.p);
    $('#products').innerHTML = data.length ? data.map(x => `
      <a class="card${x.avail ? '' : ' sold'}" data-h="${esc(x.h)}" href="${esc(x.u)}" target="_blank" rel="noopener">
        <div class="pic">
          <img data-img loading="lazy" decoding="async" src="${esc(safeUrl(x.i))}" alt="${esc(x.n)}">
          ${x.i2 ? `<img class="alt" loading="lazy" decoding="async" src="${esc(safeUrl(x.i2))}" alt="">` : ''}
          ${x.avail ? '' : '<span class="badge">SOLD OUT</span>'}
        </div>
        <div class="meta"><b>${esc(x.n)}</b><span><em>${price(x)}</em><em class="stock">${x.sizes.length ? esc(x.sizes[0] + '–' + x.sizes[x.sizes.length - 1]) : (x.avail ? 'IN STOCK' : '')}</em></span></div>
      </a>`).join('') : '<p class="empty">Nothing in this category right now. Check back soon.</p>';
  }
  $$('.filter').forEach(b => b.addEventListener('click', () => {
    $$('.filter').forEach(x => x.classList.remove('on')); b.classList.add('on');
    filter = b.dataset.filter; drawStore();
  }));

  // ---- Product view ---------------------------------------------------
  const pdp = $('#pdp');
  let cur = null, sel = [], shot = 0, lastFocus = null;

  const variantFor = () => cur.variants.find(v => v.options.length === sel.length && v.options.every((o, i) => o === sel[i]));
  const hasChoice = () => cur.options.length && !(cur.options.length === 1 && cur.options[0].values.length === 1 && /default/i.test(cur.options[0].values[0]));

  function showShot(i) {
    const n = cur.images.length; if (!n) return;
    shot = (i + n) % n;
    $('#pdpImg').src = safeUrl(sized(cur.images[shot].src, 1000));
    $('#pdpCount').textContent = `${shot + 1} / ${n}`;
    $$('#pdpThumbs button').forEach((b, k) => b.classList.toggle('on', k === shot));
  }

  function drawOpts() {
    const v = variantFor();
    $('#pdpOpts').innerHTML = hasChoice() ? cur.options.map((o, oi) => o.values.length < 2 ? '' : `
      <div class="opt"><span class="opt-name">${esc(o.name)}</span><div class="chips">${o.values.map(val => {
        // a chip is available when some in-stock variant has this value together with the other current choices
        const ok = cur.variants.some(x => x.available && x.options[oi] === val && x.options.every((ov, k) => k === oi || ov === sel[k]));
        return `<button type="button" class="chip${sel[oi] === val ? ' on' : ''}" data-o="${oi}" data-v="${esc(val)}"${ok ? '' : ' disabled'} aria-pressed="${sel[oi] === val}">${esc(val)}</button>`;
      }).join('')}</div></div>`).join('') : '';
    const buy = $('#pdpBuy'), can = v && v.available;
    buy.href = v ? `${STORE_URL}/cart/${v.id}:1` : `${STORE_URL}/products/${cur.handle}`;
    buy.textContent = can ? 'Add to bag ↗' : 'Sold out';
    buy.setAttribute('aria-disabled', can ? 'false' : 'true');
    $('#pdpPrice').textContent = fmt(v ? v.price : cur.price);
  }

  function openPdp(h) {
    cur = DATA.products.find(p => p.handle === h); if (!cur) return;
    const first = cur.variants.find(v => v.available) || cur.variants[0];
    sel = first ? first.options.slice() : [];
    lastFocus = document.activeElement;
    $('#pdpType').textContent = (cur.type || cur.category).toUpperCase();
    $('#pdpTitle').textContent = cur.title;
    $('#pdpDesc').textContent = cur.description;
    $('#pdpPage').href = `${STORE_URL}/products/${cur.handle}`;
    $('#pdpThumbs').innerHTML = cur.images.map((im, k) => `<button type="button" aria-label="Photo ${k + 1}"><img loading="lazy" src="${esc(safeUrl(sized(im.src, 160)))}" alt=""></button>`).join('');
    showShot(0); drawOpts();
    pdp.hidden = false; document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => { pdp.classList.add('open'); $('.pdp-x').focus(); });
  }
  function closePdp() {
    pdp.classList.remove('open'); document.documentElement.style.overflow = '';
    setTimeout(() => { pdp.hidden = true; }, reduceMotion ? 0 : 300);
    if (lastFocus) lastFocus.focus();
  }

  $('#products').addEventListener('click', e => {
    const c = e.target.closest('.card'); if (!c || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); openPdp(c.dataset.h);
  });
  pdp.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closePdp();
    const chip = e.target.closest('.chip'); if (chip) { sel[+chip.dataset.o] = chip.dataset.v; drawOpts(); return; }
    const th = e.target.closest('#pdpThumbs button'); if (th) showShot([...th.parentNode.children].indexOf(th));
  });
  document.addEventListener('keydown', e => {
    if (pdp.hidden) return;
    if (e.key === 'Escape') return closePdp();
    if (e.key === 'ArrowRight') showShot(shot + 1);
    if (e.key === 'ArrowLeft') showShot(shot - 1);
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = $$('button:not(:disabled),a[href]', pdp).filter(x => x.offsetParent && x.getAttribute('aria-disabled') !== 'true');
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  let sx0 = null; const main = $('.pdp-main');
  main.addEventListener('pointerdown', e => { sx0 = e.clientX; });
  main.addEventListener('pointerup', e => { if (sx0 != null && Math.abs(e.clientX - sx0) > 40) showShot(shot + (e.clientX < sx0 ? 1 : -1)); sx0 = null; });
  main.addEventListener('pointercancel', () => { sx0 = null; });

  drawStore(); renderFit();
})();
