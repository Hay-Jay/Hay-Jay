(() => {
  'use strict';

  // ---- Config ---------------------------------------------------------
  // Product data comes from data/products.js (a snapshot of the Shopify store, refreshed by scripts/sync-products.mjs).
  const STORE_URL = ((window.MONOCHROME_CONFIG || {}).storeUrl || 'https://monochrome.com.ng').replace(/\/$/, ''); // Shopify storefront (set in config.js)
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
  // Drop-alert form posts straight to the Shopify store's customer form (same fields as a Shopify theme's newsletter box).
  const news = $('#news');
  if (news) { news.action = `${STORE_URL}/contact#contact_form`; news.addEventListener('submit', () => { $('#newsNote').textContent = 'Opening the store in a new tab to finish your signup.'; }); }
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
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); cur.classList.toggle('big', !!e.target.closest('a,button,summary,.rail')); }, { passive: true });
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
      i3: main ? sized(main, 800) : '',
      isNew: p.collections.includes('new-arrivals'),
      rank: p.collections.includes('new-arrivals') ? 2 : p.collections.length ? 1 : 0,
      pub: Date.parse(p.publishedAt) || 0,
      d: p, h: p.handle
    };
  }).sort((a, b) => b.avail - a.avail);

  // ---- Shop grid ------------------------------------------------------
  let filter = 'all', sort = 'featured';
  const SORTS = {
    featured: (a, b) => b.avail - a.avail || b.rank - a.rank || b.p - a.p,
    new: (a, b) => b.avail - a.avail || b.pub - a.pub,
    low: (a, b) => b.avail - a.avail || a.p - b.p,
    high: (a, b) => b.avail - a.avail || b.p - a.p
  };
  const LABEL = { all: 'pieces', top: 'tops', bottom: 'bottoms', accessory: 'objects', gift: 'gift cards' };
  const priceText = x => (x.pMax > x.p ? 'From ' : '') + fmt(x.p);
  const cardIo = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); cardIo.unobserve(e.target); } }), { threshold: .08 }) : null;

  function drawStore() {
    const data = items.filter(x => filter === 'all' || x.t === filter).sort(SORTS[sort]);
    const bigFirst = filter === 'all' && (sort === 'featured' || sort === 'new') && data.length >= 8 && data[0].avail;
    $('#count').textContent = `${data.length} ${data.length === 1 ? LABEL[filter].replace(/s$/, '') : LABEL[filter]}`;
    $('#products').innerHTML = data.length ? data.map((x, n) => `
      <a class="card${bigFirst && n === 0 ? ' feat' : ''}${x.avail ? '' : ' sold'}" style="--d:${n % 4}" data-h="${esc(x.h)}" href="${esc(x.u)}" target="_blank" rel="noopener">
        <div class="pic">
          <img data-img loading="lazy" decoding="async" src="${esc(safeUrl(x.i))}" alt="${esc(x.n)}">
          ${x.i2 ? `<img class="alt" loading="lazy" decoding="async" src="${esc(safeUrl(x.i2))}" alt="">` : ''}
        </div>
        <span class="idx">${String(n + 1).padStart(2, '0')}</span>
        ${x.avail ? (x.isNew ? '<span class="tag">NEW</span>' : '') : '<span class="tag">SOLD OUT</span>'}
        <span class="price">${priceText(x)}</span>
        <div class="info"><b>${esc(x.n)}</b>${x.sizes.length ? `<span class="sizes">${x.sizes.slice(0, 7).map(s => `<i>${esc(s)}</i>`).join('')}</span>` : ''}</div>
      </a>`).join('') : '<p class="empty">Nothing in this category right now. Check back soon.</p>';
    $$('#products .card').forEach(c => cardIo ? cardIo.observe(c) : c.classList.add('in'));
  }
  $$('.filter').forEach(b => b.addEventListener('click', () => {
    $$('.filter').forEach(x => x.classList.remove('on')); b.classList.add('on');
    filter = b.dataset.filter; drawStore();
  }));
  $('#sort').addEventListener('change', e => { sort = e.target.value; drawStore(); });

  // ---- The Drop (featured rail) --------------------------------------
  const rail = $('#rail');
  function drawRail() {
    const feat = items.filter(x => x.avail && x.i && x.t !== 'gift').sort((a, b) => b.rank - a.rank || b.pub - a.pub || b.p - a.p).slice(0, 8);
    rail.innerHTML = feat.map((x, n) => `
      <a class="rcard" data-h="${esc(x.h)}" href="${esc(x.u)}" target="_blank" rel="noopener" draggable="false">
        <div class="rpic"><img data-img draggable="false" src="${esc(safeUrl(x.i3 || x.i))}" alt="${esc(x.n)}"></div>
        <span class="rnum">${String(n + 1).padStart(2, '0')}</span>
        <div class="rmeta"><b>${esc(x.n)}</b><span>${priceText(x)}${x.isNew ? ' · NEW' : ''}<i class="go" aria-hidden="true">→</i></span></div>
      </a>`).join('');
    railTick();
  }
  function railTick() {
    const max = rail.scrollWidth - rail.clientWidth, mid = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    $('#railBar').style.setProperty('--p', Math.max(.12, max > 0 ? rail.scrollLeft / max : 1));
    if (reduceMotion) return;
    $$('.rcard', rail).forEach(c => { const r = c.getBoundingClientRect(); c.style.setProperty('--px', `${-((r.left + r.width / 2 - mid) / r.width) * 38}px`); });
  }
  rail.addEventListener('scroll', () => requestAnimationFrame(railTick), { passive: true });
  addEventListener('resize', railTick);
  const step = d => rail.scrollBy({ left: d * (rail.querySelector('.rcard')?.offsetWidth + 14 || 300), behavior: reduceMotion ? 'auto' : 'smooth' });
  $('#railPrev').onclick = () => step(-1); $('#railNext').onclick = () => step(1);
  rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  // mouse drag (touch uses native scrolling)
  let dx0 = null, sl0 = 0, moved = false;
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; dx0 = e.clientX; sl0 = rail.scrollLeft; moved = false; });
  addEventListener('pointermove', e => { if (dx0 == null) return; const d = e.clientX - dx0; if (Math.abs(d) > 5) { moved = true; rail.classList.add('drag'); } if (moved) rail.scrollLeft = sl0 - d; });
  addEventListener('pointerup', () => { if (dx0 == null) return; dx0 = null; rail.classList.remove('drag'); setTimeout(() => { moved = false; }, 0); });
  rail.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); return; } const c = e.target.closest('.rcard'); if (!c || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); openPdp(c.dataset.h); }, true);

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

  drawStore(); drawRail();
})();
