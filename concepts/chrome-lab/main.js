/* MONOCHROME® — CHROME LAB: the DOM layer.
   Products, filters, product view, forms, HUD, cursor. The WebGL scene (lab3d.js) reads window.MC and calls back into it. */
(() => {
  'use strict';

  // ---- Config ---------------------------------------------------------
  const STORE_URL = ((window.MONOCHROME_CONFIG || {}).storeUrl || 'https://monochrome.com.ng').replace(/\/$/, '');
  const CURRENCY = 'CAD';            // must match the store's currency
  const LOCALE = 'en-US';            // en-US renders CAD as "CA$", which is unambiguous for shoppers outside Canada
  const EMBLEM = 'assets/emblem.webp';
  const GL_MAX = 18;                 // pieces in the 3D gallery

  // ---- Helpers --------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const fmt = v => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(v);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');
  const DATA = window.MONOCHROME_DATA || { products: [], collections: [], store: {} };
  // Shopify's CDN resizes on request (HEIC uploads come back as PNG).
  const sized = (src, w) => !/^https?:/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}width=${w}`;
  const isHeic = src => /\.heic(\?|$)/i.test(src);
  const safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, STORE_URL).href)); } catch { return ''; } };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  // Does this browser give us WebGL at all? (a throwaway context, released straight away)
  const canGL = (() => {
    try {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl2') || c.getContext('webgl');
      if (!g) return false;
      const lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return true;
    } catch { return false; }
  })();
  const wantGallery = canGL && !reduceMotion;          // the full 3D tunnel
  if (wantGallery) root.classList.add('gl-on');

  // ---- Static wiring --------------------------------------------------
  $$('[data-store]').forEach(a => { a.href = STORE_URL + a.dataset.store; if (a.classList.contains('btn') || a.classList.contains('tile')) { a.target = '_blank'; a.rel = 'noopener'; } });
  const news = $('#news');
  if (news) { news.action = `${STORE_URL}/contact#contact_form`; news.addEventListener('submit', () => { $('#newsNote').textContent = 'Opening the store in a new tab to finish your signup.'; }); }
  $('#year').textContent = new Date().getFullYear();

  // Broken / unsupported images fall back to the emblem.
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && 'img' in img.dataset && !img.classList.contains('fallback')) { img.classList.add('fallback'); img.src = EMBLEM; }
  }, true);

  // ---- Nav ------------------------------------------------------------
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  const setMenu = open => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.firstElementChild.textContent = open ? 'Close' : 'Menu'; };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $('#links').addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

  // ---- Store state ----------------------------------------------------
  const items = DATA.products.map(p => {
    const imgs = p.images.map(i => i.src);
    const mainIm = p.images.find(i => !isHeic(i.src)) || p.images[0] || null;
    const altIm = p.images.filter(i => !isHeic(i.src))[1] || null;
    const main = mainIm ? mainIm.src : '';
    return {
      n: p.title, p: p.price, pMax: p.priceMax, t: p.category, avail: p.available, sizes: p.sizes,
      u: `${STORE_URL}/products/${p.handle}`,
      i: main ? sized(main, 640) : '',
      i2: altIm ? sized(altIm.src, 640) : '',
      tex: main ? sized(main, 800) : '',
      iw: mainIm ? mainIm.w : 1, ih: mainIm ? mainIm.h : 1,
      isNew: p.collections.includes('new-arrivals'),
      rank: p.collections.includes('new-arrivals') ? 2 : p.collections.length ? 1 : 0,
      pub: Date.parse(p.publishedAt) || 0,
      type: p.type || '',
      d: p, h: p.handle
    };
  }).sort((a, b) => b.avail - a.avail);
  const byHandle = h => items.find(x => x.h === h);
  const priceText = x => (x.pMax > x.p ? 'From ' : '') + fmt(x.p);
  const CAT = { top: 'Tops', bottom: 'Bottoms', accessory: 'Objects', gift: 'Gift card' };

  // Chrome-lab gallery selection: newest and front-page pieces first, no more than three rings,
  // never the same category twice in a row where we can avoid it, gift card as the last frame.
  const gallery = (() => {
    const pool = items.filter(x => x.avail && x.i && x.t !== 'gift').sort((a, b) => b.rank - a.rank || b.pub - a.pub || b.p - a.p);
    let rings = 0;
    const pick = pool.filter(x => { if (/ring/i.test(x.type + ' ' + x.h)) { if (++rings > 3) return false; } return true; }).slice(0, GL_MAX - 1);
    const out = []; let last = '';
    while (pick.length) { let k = pick.findIndex(x => x.t !== last); if (k < 0) k = 0; const [x] = pick.splice(k, 1); out.push(x); last = x.t; }
    const gift = items.find(x => x.t === 'gift' && x.avail && x.i);
    if (gift) out.push(gift);
    return out;
  })();
  root.style.setProperty('--n', gallery.length);

  // ---- Cards (archive grid + gallery fallback) -------------------------
  const cardHtml = (x, n, feat) => `
    <a class="card${feat ? ' feat' : ''}${x.avail ? '' : ' sold'}" data-h="${esc(x.h)}" href="${esc(x.u)}" target="_blank" rel="noopener">
      <div class="pic">
        <img data-img loading="lazy" decoding="async" src="${esc(safeUrl(x.i))}" alt="${esc(x.n)}" width="640" height="800">
        ${x.i2 ? `<img class="alt" data-img loading="lazy" decoding="async" src="${esc(safeUrl(x.i2))}" alt="">` : ''}
        <span class="idx">${pad2(n + 1)}</span>
        ${x.avail ? (x.isNew ? '<span class="tag">NEW</span>' : '') : '<span class="tag">SOLD OUT</span>'}
      </div>
      <div class="info"><b>${esc(x.n)}</b>
        <span class="meta"><span class="price">${priceText(x)}</span>${x.sizes.length ? `<span class="sizes">${x.sizes.slice(0, 6).map(s => `<i>${esc(s)}</i>`).join('')}</span>` : ''}</span>
      </div>
    </a>`;

  // ---- Archive: filter + sort ------------------------------------------
  let filter = 'all', sort = 'featured';
  const SORTS = {
    featured: (a, b) => b.avail - a.avail || b.rank - a.rank || b.p - a.p,
    new: (a, b) => b.avail - a.avail || b.pub - a.pub,
    low: (a, b) => b.avail - a.avail || a.p - b.p,
    high: (a, b) => b.avail - a.avail || b.p - a.p
  };
  const LABEL = { all: 'pieces', top: 'tops', bottom: 'bottoms', accessory: 'objects', gift: 'gift cards' };
  function drawStore() {
    const data = items.filter(x => filter === 'all' || x.t === filter).sort(SORTS[sort]);
    const bigFirst = filter === 'all' && (sort === 'featured' || sort === 'new') && data.length >= 8 && data[0].avail;
    $('#count').textContent = `${pad2(data.length)} ${data.length === 1 ? LABEL[filter].replace(/s$/, '') : LABEL[filter]} / prices in CAD`;
    $('#products').innerHTML = data.length ? data.map((x, n) => cardHtml(x, n, bigFirst && n === 0)).join('') : '<p class="empty">Nothing in this category right now. Check back soon.</p>';
  }
  $$('.filter').forEach(b => b.addEventListener('click', () => {
    $$('.filter').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
    b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
    filter = b.dataset.filter; drawStore();
  }));
  $('#sort').addEventListener('change', e => { sort = e.target.value; drawStore(); });

  // ---- Gallery list: accessible list in 3D mode, DOM grid otherwise -----
  const glList = $('#glList');
  function drawGalleryList(mode) {
    glList.innerHTML = mode === 'gl'
      ? gallery.map((x, i) => `<li><a class="gl-a" data-h="${esc(x.h)}" data-i="${i}" href="${esc(x.u)}" target="_blank" rel="noopener"><b>${esc(x.n)}</b><span>${priceText(x)}${x.avail ? '' : ' / SOLD OUT'}</span></a></li>`).join('')
      : gallery.map((x, i) => `<li>${cardHtml(x, i, false)}</li>`).join('');
  }
  drawGalleryList(wantGallery ? 'gl' : 'grid');

  // ---- Worldwide ------------------------------------------------------
  (() => {
    const codes = (DATA.store && DATA.store.shipsTo) || [];
    let names;
    try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { names = null; }
    const nm = c => { try { return (names && names.of(c)) || c; } catch { return c; } };
    const pin = ['CA', 'NG'];
    const sorted = [...codes].sort((a, b) => (pin.includes(b) - pin.includes(a)) || (pin.includes(a) && pin.includes(b) ? pin.indexOf(a) - pin.indexOf(b) : nm(a).localeCompare(nm(b))));
    $('#destList').innerHTML = sorted.map(c => `<li${c === 'CA' ? ' class="home"' : ''}><b>${esc(c)}</b>${esc(nm(c))}</li>`).join('');
    const n = codes.length || 29;
    ['specDest', 'factDest', 'destCount', 'faqDest'].forEach(id => { const el = $('#' + id); if (el) el.textContent = n; });
    $('#specPieces').textContent = items.length;
  })();

  // ---- Product view ---------------------------------------------------
  const pdp = $('#pdp');
  let cur = null, sel = [], shot = 0, lastFocus = null;
  const variantFor = () => cur.variants.find(v => v.options.length === sel.length && v.options.every((o, i) => o === sel[i]));
  const hasChoice = () => cur.options.length && !(cur.options.length === 1 && cur.options[0].values.length === 1 && /default/i.test(cur.options[0].values[0]));
  const bg = () => $$('main,header.nav,footer,.hud,.cursor,.progress');

  function showShot(i) {
    const n = cur.images.length; if (!n) return;
    shot = (i + n) % n;
    $('#pdpImg').src = safeUrl(sized(cur.images[shot].src, 1000));
    $('#pdpImg').alt = `${cur.title}, photo ${shot + 1} of ${n}`;
    $('#pdpCount').textContent = `${pad2(shot + 1)} / ${pad2(n)}`;
    $$('#pdpThumbs button').forEach((b, k) => { b.classList.toggle('on', k === shot); b.setAttribute('aria-current', k === shot ? 'true' : 'false'); });
  }
  function drawOpts() {
    const v = variantFor();
    $('#pdpOpts').innerHTML = hasChoice() ? cur.options.map((o, oi) => o.values.length < 2 ? '' : `
      <div class="opt" role="group" aria-label="${esc(o.name)}"><span class="opt-name">${esc(o.name)}</span><div class="chips">${o.values.map(val => {
        const ok = cur.variants.some(x => x.available && x.options[oi] === val && x.options.every((ov, k) => k === oi || ov === sel[k]));
        return `<button type="button" class="chip${sel[oi] === val ? ' on' : ''}" data-o="${oi}" data-v="${esc(val)}"${ok ? '' : ' disabled'} aria-pressed="${sel[oi] === val}">${esc(val)}</button>`;
      }).join('')}</div></div>`).join('') : '';
    const buy = $('#pdpBuy'), can = !!(v && v.available);
    buy.href = v ? `${STORE_URL}/cart/${v.id}:1` : `${STORE_URL}/products/${cur.handle}`;
    buy.innerHTML = can ? 'Add to bag <svg class="ic" aria-hidden="true"><use href="#i-ne"/></svg>' : 'Sold out';
    buy.setAttribute('aria-disabled', can ? 'false' : 'true');
    buy.tabIndex = can ? 0 : -1;
    $('#pdpPrice').textContent = fmt(v ? v.price : cur.price);
  }
  function openPdp(h) {
    cur = DATA.products.find(p => p.handle === h); if (!cur) return;
    const first = cur.variants.find(v => v.available) || cur.variants[0];
    sel = first ? first.options.slice() : [];
    lastFocus = document.activeElement;
    $('#pdpType').textContent = ((cur.type || CAT[cur.category] || cur.category) + ' / CAD').toUpperCase();
    $('#pdpTitle').textContent = cur.title;
    $('#pdpDesc').textContent = cur.description;
    $('#pdpPage').href = `${STORE_URL}/products/${cur.handle}`;
    $('#pdpThumbs').innerHTML = cur.images.length > 1 ? cur.images.map((im, k) => `<button type="button" aria-label="Photo ${k + 1}"><img loading="lazy" src="${esc(safeUrl(sized(im.src, 160)))}" alt=""></button>`).join('') : '';
    $('.pdp-main').classList.toggle('single', cur.images.length < 2);
    showShot(0); drawOpts();
    pdp.hidden = false; root.style.overflow = 'hidden'; MC.pdpOpen = true; $('#cursor').classList.remove('big', 'sm');
    bg().forEach(el => el.setAttribute('inert', ''));
    requestAnimationFrame(() => { pdp.classList.add('open'); $('.pdp-x').focus(); });
  }
  function closePdp() {
    pdp.classList.remove('open'); root.style.overflow = ''; MC.pdpOpen = false; $('#cursor').classList.remove('big', 'sm');
    bg().forEach(el => el.removeAttribute('inert'));
    setTimeout(() => { pdp.hidden = true; }, reduceMotion ? 0 : 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  pdp.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closePdp();
    const chip = e.target.closest('.chip'); if (chip) { sel[+chip.dataset.o] = chip.dataset.v; drawOpts(); return; }
    const th = e.target.closest('#pdpThumbs button'); if (th) return showShot([...th.parentNode.children].indexOf(th));
    if (e.target.closest('#pdpPrev')) return showShot(shot - 1);
    if (e.target.closest('#pdpNext')) return showShot(shot + 1);
    const buy = e.target.closest('#pdpBuy'); if (buy && buy.getAttribute('aria-disabled') === 'true') e.preventDefault();
  });
  document.addEventListener('keydown', e => {
    if (pdp.hidden) return;
    if (e.key === 'Escape') return closePdp();
    if (e.key === 'ArrowRight') showShot(shot + 1);
    if (e.key === 'ArrowLeft') showShot(shot - 1);
    if (e.key === 'Tab') {
      const f = $$('button:not(:disabled),a[href]', pdp).filter(x => x.offsetParent && x.getAttribute('aria-disabled') !== 'true');
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  let sx0 = null; const pmain = $('.pdp-main');
  pmain.addEventListener('pointerdown', e => { sx0 = e.clientX; });
  pmain.addEventListener('pointerup', e => { if (sx0 != null && Math.abs(e.clientX - sx0) > 40) showShot(shot + (e.clientX < sx0 ? 1 : -1)); sx0 = null; });
  pmain.addEventListener('pointercancel', () => { sx0 = null; });

  // Cards open the product view (cmd/ctrl-click keeps the normal link).
  const openFromLink = e => {
    const c = e.target.closest('.card,.gl-a'); if (!c || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); openPdp(c.dataset.h);
  };
  $('#products').addEventListener('click', openFromLink);
  glList.addEventListener('click', openFromLink);
  glList.addEventListener('focusin', e => { const a = e.target.closest('.gl-a'); if (a && MC.gl && MC.gl.focusItem) MC.gl.focusItem(+a.dataset.i, true); });

  // ---- Gallery caption + rail (driven by lab3d.js) ----------------------
  const cap = { id: $('#capId'), cat: $('#capCat'), pos: $('#capPos'), title: $('#capTitle'), price: $('#capPrice'), sizes: $('#capSizes'), open: $('#capOpen') };
  const stageEl = $('#glStage');
  let shownIdx = -2;
  function showCaption(i) {
    if (i === shownIdx || i < 0 || !gallery[i]) return;
    shownIdx = i; const x = gallery[i];
    cap.id.textContent = `LAB-${pad2(i + 1)}`;
    cap.cat.textContent = (x.type || CAT[x.t] || x.t).toUpperCase();
    cap.pos.textContent = `${pad2(i + 1)} / ${pad2(gallery.length)}`;
    cap.title.textContent = x.n;
    cap.price.textContent = priceText(x) + (x.avail ? '' : ' / SOLD OUT');
    cap.sizes.textContent = x.sizes.length ? x.sizes.slice(0, 7).join(' ') : (x.t === 'gift' ? 'E-GIFT CARD' : 'ONE SIZE');
    cap.open.dataset.h = x.h;
    $$('#glRail button').forEach((b, k) => b.classList.toggle('on', k === i));
  }
  cap.open.addEventListener('click', () => { if (cap.open.dataset.h) openPdp(cap.open.dataset.h); });
  const rail = $('#glRail');
  rail.innerHTML = gallery.map((x, i) => `<button type="button" tabindex="-1" data-i="${i}"><b>${pad2(i + 1)}</b><i></i></button>`).join('');
  rail.addEventListener('click', e => { const b = e.target.closest('button'); if (b && MC.gl && MC.gl.focusItem) MC.gl.focusItem(+b.dataset.i); });

  // ---- Bridge to the WebGL scene ---------------------------------------
  const MC = window.MC = {
    STORE_URL, fmt, sized, safeUrl, canGL, glMode: wantGallery, reduce: reduceMotion,
    gallery: gallery.map(x => ({ h: x.h, n: x.n, tex: x.tex, w: x.iw, ht: x.ih, t: x.t, avail: x.avail, zoom: /ring/i.test(x.type + ' ' + x.h) && x.iw >= 4500 ? 2 : 1 })),
    openPdp, pdpOpen: false, hoverIdx: -1, focusIdx: 0,
    state: { depth: 0, vel: 0, g: 0, camZ: 0 },
    gl: null, glState: 'pending',
    // called by lab3d.js
    setFocus(i) { MC.focusIdx = i; stageEl.dataset.cap = i % 2 ? 'right' : 'left'; if (MC.hoverIdx < 0) showCaption(i); },
    setHover(i) {
      MC.hoverIdx = i; stageEl.classList.toggle('hover-item', i >= 0);
      showCaption(i >= 0 ? i : MC.focusIdx);
    },
    glReady(api) { MC.gl = api; MC.glState = 'ready'; root.classList.add('has-canvas'); finishLoad(); },
    glFailed() { if (MC.glState === 'failed') return; MC.glState = 'failed'; root.classList.remove('gl-on', 'has-canvas'); drawGalleryList('grid'); finishLoad(); }
  };
  // If the 3D module never reports back (blocked, offline, old browser), fall back to the DOM gallery.
  if (wantGallery) setTimeout(() => { if (MC.glState === 'pending') MC.glFailed(); }, 9000);
  if (!canGL) MC.glState = 'failed';

  drawStore();

  // ---- Loader ---------------------------------------------------------
  const pct = $('#loadPct'); let shown = 0, done = false;
  function finishLoad() {
    if (done) return; done = true; clearInterval(tick);
    if (pct) pct.textContent = 100;
    setTimeout(() => root.classList.add('ready'), 180);
  }
  const tick = setInterval(() => { shown = Math.min(shown + 5 + Math.random() * 8, 96); if (pct) pct.textContent = Math.round(shown); }, 80);
  // ready once the scene has built (or immediately when there is no scene), but never wait long
  setTimeout(finishLoad, wantGallery ? 3400 : 1500);
  if (!canGL) addEventListener('load', finishLoad);

  // ---- Motion layer: progress, HUD, cursor, glass sheen ------------------
  const bar = $('#progress');
  const hudCh = $('#hudCh'), hudDepth = $('#hudDepth'), hudVel = $('#hudVel'), hudClock = $('#hudClock');
  const CH = [['top', 'CH.00 ARRIVAL'], ['formula', 'CH.01 FORMULA'], ['gallery', 'CH.02 GALLERY'], ['browse', 'CH.03 ARCHIVE'], ['routes', 'CH.04 ROUTES'], ['faq', 'CH.05 Q&A'], ['connect', 'CH.06 SIGNAL']]
    .map(([id, label]) => ({ id, label, el: document.getElementById(id), link: $(`#links a[href="#${id}"]`) || (id === 'browse' ? $('#links a[href="#browse"]') : null) }));
  let clockFmt = null;
  try { clockFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Regina', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch { /* no clock */ }
  let lastHud = 0, curCh = '';
  const heroH = $('.hero-h');
  let lastY = scrollY, skew = 0;

  function chapterNow() {
    const mid = innerHeight * .45; let hit = CH[0];
    for (const c of CH) if (c.el && c.el.getBoundingClientRect().top <= mid) hit = c;
    return hit;
  }
  function ui(now) {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    const dy = scrollY - lastY; lastY = scrollY;
    if (heroH && !reduceMotion) { skew += (Math.max(-6, Math.min(6, dy * .08)) - skew) * .12; heroH.style.setProperty('--sk', skew.toFixed(2) + 'deg'); }
    if (now - lastHud > 100) {
      lastHud = now;
      const c = chapterNow();
      if (c.id !== curCh) { curCh = c.id; hudCh.textContent = c.label; $$('#links a').forEach(a => a.classList.toggle('on', a === c.link)); }
      const S = MC.state;
      const depth = MC.glState === 'ready' && MC.glMode ? S.depth : (h > 0 ? scrollY / h * 100 : 0);
      hudDepth.textContent = `DEPTH ${depth.toFixed(1).padStart(5, '0')} M`;
      hudVel.textContent = `VEL ${S.vel >= 0 ? '+' : '-'}${Math.abs(S.vel).toFixed(2)}`;
      if (clockFmt) hudClock.textContent = `REGINA SK ${clockFmt.format(new Date())}`;
    }
    requestAnimationFrame(ui);
  }
  requestAnimationFrame(ui);

  // glass sheen follows the pointer; product cards tilt a little
  if (fine && !reduceMotion) {
    document.addEventListener('pointermove', e => {
      const g = e.target.closest && e.target.closest('.glass');
      if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
      const c = e.target.closest && e.target.closest('.card');
      if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 8 + 'deg'); c.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 8 + 'deg'); }
    }, { passive: true });
    document.addEventListener('pointerout', e => { const c = e.target.closest && e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });

    // cursor: a ring that swells into an OPEN disc over pieces (3D or DOM)
    const cur = $('#cursor'), curTxt = $('#cursorTxt');
    let cx = 0, cy = 0, tx = 0, ty = 0, seen = false;
    addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY; if (!seen) { seen = true; cx = tx; cy = ty; }
      cur.classList.add('on');
      const t = e.target;
      const piece = MC.hoverIdx >= 0 || (t.closest && t.closest('.card,.gl-a'));
      const ctl = t.closest && t.closest('a,button,summary,select,label,input');
      cur.classList.toggle('big', !!piece); cur.classList.toggle('sm', !piece && !!ctl);
      if (piece) curTxt.textContent = 'OPEN';
    }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('on'));
    (function loop() { cx += (tx - cx) * .24; cy += (ty - cy) * .24; cur.style.transform = `translate(${cx - cur.offsetWidth / 2}px,${cy - cur.offsetHeight / 2}px)`; requestAnimationFrame(loop); })();
  }

  // mono labels decode themselves once as they arrive (text is always present; this only plays on top)
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
