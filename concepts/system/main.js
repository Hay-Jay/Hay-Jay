/* MONOCHROME OS v1.0 — interface logic (vanilla, no build step).
   Product data: data/products.js (snapshot of the Shopify store). Checkout always happens on the store. */
(() => {
  'use strict';

  // ---- Config ------------------------------------------------------------
  const STORE_URL = ((window.MONOCHROME_CONFIG || {}).storeUrl || 'https://monochrome.com.ng').replace(/\/$/, '');
  const CURRENCY = 'CAD';
  const LOCALE = 'en-CA';
  const EMBLEM = 'assets/emblem.webp';
  const DATA = window.MONOCHROME_DATA || { products: [], collections: [], store: {} };
  const ZONES = (DATA.store && DATA.store.shipsTo) || [];

  // ---- Helpers -----------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const fmt = v => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(v);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const sized = (src, w) => !/^https?:/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}width=${w}`;
  const isHeic = src => /\.heic(\?|$)/i.test(src);
  const safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, STORE_URL).href)); } catch { return ''; } };
  const icon = id => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } } };
  const sess = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage blocked */ } } };

  // Stepped, terminal-style typing. Final text is always set exactly.
  function typeInto(el, text, cps = 70) {
    if (!el) return;
    clearInterval(el._tt);
    if (reduceMotion) { el.textContent = text; return; }
    let i = 0; const step = Math.max(1, Math.round(cps / 30));
    el._tt = setInterval(() => { i += step; if (i >= text.length) { clearInterval(el._tt); el.textContent = text; } else el.textContent = text.slice(0, i); }, 33);
  }
  // Stepped integer count-up that always lands on the exact value.
  function countUp(el, to, steps = 14) {
    clearInterval(el._cu);
    if (reduceMotion) { el.textContent = to; return; }
    let k = 0; el.textContent = 0;
    el._cu = setInterval(() => { k++; if (k >= steps) { clearInterval(el._cu); el.textContent = to; } else el.textContent = Math.round(to * (k / steps) * (k / steps)); }, 46);
  }
  // Broken / unsupported images fall back to the emblem.
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && 'img' in img.dataset && !img.classList.contains('fallback')) { img.classList.add('fallback'); img.src = EMBLEM; }
  }, true);

  // Point every data-store link at the storefront.
  $$('[data-store]').forEach(a => { a.href = STORE_URL + a.dataset.store; if (a.classList.contains('key') || a.classList.contains('chan')) { a.target = '_blank'; a.rel = 'noopener'; } });
  const news = $('#news');
  if (news) { news.action = `${STORE_URL}/contact#contact_form`; news.addEventListener('submit', () => { $('#newsNote').textContent = 'Transmitting. The store opens in a new tab to finish your signup.'; }); }
  $('#year').textContent = new Date().getFullYear();

  // ---- Data model --------------------------------------------------------
  const CAT = { top: { code: 'TOP', label: 'Tops' }, bottom: { code: 'BTM', label: 'Bottoms' }, accessory: { code: 'ACC', label: 'Objects' }, gift: { code: 'GFT', label: 'Gift cards' } };
  const byAge = DATA.products.map(p => p).sort((a, b) => (Date.parse(a.publishedAt) || 0) - (Date.parse(b.publishedAt) || 0) || a.handle.localeCompare(b.handle));
  const idOf = new Map(byAge.map((p, k) => [p.handle, 'MC-' + pad(k + 1, 3)]));

  const items = DATA.products.map(p => {
    const imgs = p.images.map(i => i.src);
    const ok = imgs.filter(s => !isHeic(s));
    const main = ok[0] || imgs[0] || '';
    const total = p.variants.length, avN = p.variants.filter(v => v.available).length;
    const stock = !total ? (p.available ? 'in' : 'out') : avN === 0 ? 'out' : avN < total ? 'part' : 'in';
    return {
      h: p.handle, id: idOf.get(p.handle), n: p.title, p: p.price, pMax: p.priceMax, t: p.category,
      type: (p.type || '').trim(), avail: p.available, stock, avN, total,
      i: main ? sized(main, 640) : '', i2: ok[1] ? sized(ok[1], 640) : '', iL: main ? sized(main, 760) : '',
      isNew: p.collections.includes('new-arrivals'),
      rank: p.collections.includes('new-arrivals') ? 2 : p.collections.length ? 1 : 0,
      pub: Date.parse(p.publishedAt) || 0, d: p
    };
  }).sort((a, b) => b.avail - a.avail);
  const byHandle = Object.fromEntries(items.map(x => [x.h, x]));
  const byId = Object.fromEntries(items.map(x => [x.id.toLowerCase(), x]));
  const N = items.length, IN_STOCK = items.filter(x => x.avail).length;

  const typeLabel = x => (x.type || CAT[x.t].label).toUpperCase();
  const catLine = x => `${CAT[x.t].code} / ${typeLabel(x)}`;
  const priceText = x => (x.pMax > x.p ? 'From ' : '') + fmt(x.p);
  const priceHTML = x => `${esc(priceText(x))}<small>CAD</small>`;
  const dateText = x => x.pub ? new Date(x.pub).toISOString().slice(0, 10) : '----';
  const STOCK = { in: ['In stock', 'IN'], part: ['Limited', 'LTD'], out: ['Sold out', 'OUT'] };
  const led = s => `<i class="led ${s}" aria-hidden="true"></i>`;
  const isDefaultOpt = o => o.name === 'Title' || (o.values.length === 1 && /default/i.test(o.values[0]));
  // The option shown as key-caps on a card: Size first, otherwise the first real choice.
  const primaryOpt = p => {
    const o = p.options;
    let i = o.findIndex(op => /size/i.test(op.name) && op.values.length > 1);
    if (i < 0) i = o.findIndex(op => op.values.length > 1 && !/colou?r|custom/i.test(op.name));
    if (i < 0) i = o.findIndex(op => op.values.length > 1);
    return i;
  };
  const optLabel = name => /denomination/i.test(name) ? 'Value' : name;
  const valAvail = (p, oi, val) => p.variants.some(v => v.available && v.options[oi] === val);

  // ---- Boot sequence -----------------------------------------------------
  const boot = $('#boot');
  let bootDone = false;
  const readyFns = [];
  const onReady = fn => bootDone ? fn() : readyFns.push(fn);
  function finishBoot() {
    if (bootDone) return; bootDone = true;
    sess.set('mc-booted', '1');
    root.classList.add('ready');
    syncRadar();
    readyFns.splice(0).forEach(fn => { try { fn(); } catch (e) { /* keep going */ } });
    const end = () => { root.classList.remove('booting'); boot.setAttribute('inert', ''); };
    if (reduceMotion || !boot) return end();
    boot.classList.add('out');
    boot.addEventListener('animationend', end, { once: true });
    setTimeout(end, 700);
  }
  function runBoot() {
    if (reduceMotion || !boot) { root.classList.remove('booting'); bootDone = true; root.classList.add('ready'); return; }
    const seen = sess.get('mc-booted') === '1';
    const log = $('#bootLog'), fill = $('#bootFill');
    const row = (k, v) => `> ${k} ${'.'.repeat(Math.max(2, 38 - k.length - v.length - 3))} ${v}`;
    const lines = [
      `MONOCHROME OS v1.0 — loading archive… ${N} objects`,
      '(c) 2003-2026 MONOCHROME CORP.',
      '',
      row('POST', 'OK'),
      row('MOUNT /ARCHIVE', `${N} OBJECTS`),
      row('CHROME SHADER', 'OK'),
      row('DELIVERY ROUTES', `${ZONES.length} ZONES`),
      row('CLOCK SYNC', 'REG / LOS'),
      '> READY'
    ];
    const total = lines.join('\n').length;
    let li = 0, ci = 0, out = '', shown = 0, wait = 0;
    const speed = seen ? 14 : 5;
    const id = setInterval(() => {
      if (bootDone) return clearInterval(id);
      if (wait > 0) { wait--; return; }
      if (li >= lines.length) { clearInterval(id); fill.style.width = '100%'; setTimeout(finishBoot, 260); return; }
      const line = lines[li];
      const take = Math.min(speed, line.length - ci);
      ci += take; shown += take;
      log.textContent = out + line.slice(0, ci) + '█';
      if (ci >= line.length) { out += line + '\n'; li++; ci = 0; shown++; wait = line ? 2 : 0; log.textContent = out; }
      fill.style.width = Math.min(100, (shown / total) * 100) + '%';
    }, 16);
    const skip = () => { clearInterval(id); finishBoot(); };
    addEventListener('keydown', skip, { once: true });
    boot.addEventListener('pointerdown', skip, { once: true });
    setTimeout(finishBoot, 7000);
  }
  runBoot();

  // ---- HUD: clocks, uptime, scroll + pointer readouts ---------------------
  const mkFmt = tz => { try { return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); } catch { return null; } };
  const fReg = mkFmt('America/Regina'), fLos = mkFmt('Africa/Lagos');
  const t0 = Date.now();
  const tickClocks = () => {
    const d = new Date();
    if (fReg) { const r = fReg.format(d); $('#clkReg').textContent = r; $('#tReg').textContent = 'REG ' + r; }
    if (fLos) { const l = fLos.format(d); $('#clkLos').textContent = l; $('#tLos').textContent = 'LOS ' + l; }
    const s = Math.floor((Date.now() - t0) / 1000);
    $('#uptime').textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  };
  tickClocks(); setInterval(tickClocks, 1000);

  const sectionEls = $$('[data-sec]');
  const navLinks = $$('.links a');
  const ruler = $('#ruler'), rulerMark = $('#rulerMark');
  let lastSec = '';
  function onScroll() {
    const y = Math.round(scrollY), max = Math.max(1, root.scrollHeight - innerHeight), p = Math.min(1, y / max);
    $('#sbY').textContent = pad(y, 4);
    $('#sbPct').textContent = pad(Math.round(p * 100), 3);
    if (ruler.offsetHeight) { rulerMark.style.transform = `translateY(${Math.round(p * (ruler.offsetHeight - 16) + 8)}px)`; $('#rulerY').textContent = pad(y, 4); }
    let cur = sectionEls[0];
    for (const s of sectionEls) { if (s.getBoundingClientRect().top <= innerHeight * 0.42) cur = s; }
    if (cur && cur.id !== lastSec) {
      lastSec = cur.id;
      $('#sbSec').textContent = cur.dataset.sec; $('#sbSecName').textContent = cur.dataset.name.toUpperCase();
      navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + cur.id));
    }
  }
  let scrollQueued = false;
  addEventListener('scroll', () => { if (scrollQueued) return; scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; onScroll(); }); }, { passive: true });
  addEventListener('resize', onScroll);

  // Pointer coordinates + page-wide crosshair (fine pointers only; toggle in the command palette)
  const xhair = $('#xhair'), xv = $('.xh-v', xhair), xh = $('.xh-h', xhair);
  let xhairOn = store.get('mc-xhair') !== '0';
  const setXhair = on => { xhairOn = on; store.set('mc-xhair', on ? '1' : '0'); if (!on) xhair.classList.remove('on'); };
  if (fine) {
    let px = 0, py = 0, pq = false;
    addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (pq) return; pq = true;
      requestAnimationFrame(() => {
        pq = false;
        $('#sbPtr').textContent = `${pad(Math.round(px), 4)},${pad(Math.round(py), 4)}`;
        if (xhairOn) { xhair.classList.add('on'); xv.style.transform = `translateX(${px}px)`; xh.style.transform = `translateY(${py}px)`; }
      });
    }, { passive: true });
    document.addEventListener('mouseleave', () => xhair.classList.remove('on'));
  }

  // Scroll-linked reveals only switch on after the visitor first scrolls, so the page is always complete at rest.
  ['scroll', 'wheel', 'touchmove', 'keydown'].forEach(ev => addEventListener(ev, () => root.classList.add('sdr'), { once: true, passive: true }));

  // ---- Hero: counters, ticker, radar blips --------------------------------
  const setTo = (id, v) => { const el = $('#' + id); if (el) { el.dataset.to = v; el.textContent = v; } };
  setTo('tObj', N); setTo('tStock', IN_STOCK); setTo('tZones', ZONES.length);
  setTo('sObj', N); setTo('sStock', IN_STOCK); setTo('sZones', ZONES.length);
  $$('[data-count]').forEach(el => { if (!el.dataset.to) el.dataset.to = el.textContent.trim(); });
  onReady(() => { $$('.term [data-count]').forEach((el, i) => setTimeout(() => countUp(el, +el.dataset.to), 1000 + i * 320)); });
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target, +e.target.dataset.to); cio.unobserve(e.target); } }), { threshold: .6 });
    $$('.stats [data-count]').forEach(el => cio.observe(el));
  }
  $('#sbAll').textContent = N; $('#sbVis').textContent = N;
  $('#cmdkIn').placeholder = `type to filter ${N} objects…`;
  $('#cmdkIn').setAttribute('aria-label', `Search ${N} objects or jump to a section`);

  // Ticker tape
  (() => {
    const newest = [...items].sort((a, b) => b.pub - a.pub)[0];
    const set = [
      '<b>SYS</b> ALL SYSTEMS NOMINAL', `<b>ARCHIVE</b> ${N} OBJECTS LOGGED`, `<b>STOCK</b> ${IN_STOCK} IN STOCK`,
      `<b>ROUTES</b> ${ZONES.length} ZONES${ZONES.includes('NG') ? ' · NG OPEN' : ''}`, '<b>CURRENCY</b> CAD',
      '<b>ORIGIN</b> REGINA SK CA', '<b>WEAR THE UNKNOWN</b>', newest ? `<b>LATEST</b> ${newest.id} ${esc(newest.n)}` : '', '<b>FINISH</b> CHROME'
    ].filter(Boolean).map(s => `<span>${s}</span>`).join('');
    $('#tickerTrack').innerHTML = set + set;
  })();

  // Radar: every object is a blip on the sweep (ring = category, ping when the sweep passes)
  const SWEEP_S = 9;
  function buildBlips() {
    const host = $('#blips');
    const ringOf = x => x.t === 'top' ? { r: .94, off: 14 } : x.t === 'accessory' ? { r: .71, off: 6 } : { r: .87, off: 34 };
    const groups = new Map();
    items.forEach(x => { const k = ringOf(x).r; (groups.get(k) || groups.set(k, []).get(k)).push(x); });
    host.innerHTML = [...groups.entries()].map(([r, list]) => {
      const off = ringOf(list[0]).off;
      const sorted = [...list].sort((a, b) => a.pub - b.pub);
      return sorted.map((x, k) => {
        const a = (off + (360 / sorted.length) * k) % 360, rad = a * Math.PI / 180;
        const left = 50 + r * 50 * Math.sin(rad), top = 50 - r * 50 * Math.cos(rad);
        return `<span class="blip ${x.stock}" data-h="${esc(x.h)}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;--pd:${(a / 360 * SWEEP_S).toFixed(2)}s"><i></i></span>`;
      }).join('');
    }).join('');
    const tip = $('#blipTip'), radar = $('#radar');
    host.addEventListener('pointerover', e => {
      const b = e.target.closest('.blip'); if (!b) return;
      const x = byHandle[b.dataset.h];
      tip.textContent = `${x.id} · ${x.n} · ${priceText(x)}`;
      tip.classList.add('on');
      const w = tip.offsetWidth, rw = radar.clientWidth;
      let l = b.offsetLeft + 14, t = b.offsetTop - 30;
      if (l + w > rw) l = b.offsetLeft - w - 14; if (l < 0) l = 0; if (t < 0) t = b.offsetTop + 16;
      tip.style.transform = `translate(${l}px,${t}px)`;
    });
    host.addEventListener('pointerout', e => { if (e.target.closest('.blip')) tip.classList.remove('on'); });
    host.addEventListener('click', e => { const b = e.target.closest('.blip'); if (b) openInspect(b.dataset.h); });
  }
  function syncRadar() {
    try {
      const sw = $('#sweep'); if (!sw || !sw.getAnimations) return;
      [sw, ...$$('.blip')].forEach(el => el.getAnimations().forEach(a => { if (a.animationName === 'spin' || a.animationName === 'ping') a.currentTime = 0; }));
    } catch { /* animation API unavailable */ }
  }
  buildBlips();

  // Section tags type themselves in as they scroll into view
  if ('IntersectionObserver' in window && !reduceMotion) {
    const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const el = e.target; tio.unobserve(el); const t = el.dataset.full; typeInto(el, t, 90); } }), { threshold: 1 });
    $$('.sec-tag span:nth-child(2)').forEach(el => { el.dataset.full = el.textContent; tio.observe(el); });
  }

  // ---- Latest entries (log + preview) ---------------------------------------
  const logItems = [...items].sort((a, b) => b.pub - a.pub).slice(0, 8);
  let logCur = null;
  $('#logList').innerHTML = logItems.map((x, k) => `
    <li><button type="button" class="row" data-h="${esc(x.h)}">
      <span class="no">${pad(k + 1)}</span><span class="id">${x.id}</span><span class="nm">${esc(x.n)}</span>
      <span class="ct dim">${CAT[x.t].code}</span><span class="dt dim">${dateText(x)}</span>
      <span class="stk">${led(x.stock)}${STOCK[x.stock][1]}</span><span class="pr">${esc(priceText(x))}</span><span class="go" aria-hidden="true">${icon('r')}</span>
    </button></li>`).join('');
  function previewLog(h) {
    const x = byHandle[h]; if (!x || logCur === h) return; logCur = h;
    $$('#logList .row').forEach(r => r.classList.toggle('on', r.dataset.h === h));
    const img = $('#lpImg');
    img.dataset.img = ''; img.alt = x.n; img.classList.remove('swap'); void img.offsetWidth; img.classList.add('swap');
    img.src = safeUrl(x.iL || x.i);
    $('#lpId').textContent = x.id; $('#lpName').textContent = x.n; $('#lpType').textContent = catLine(x);
    $('#lpStock').innerHTML = `${led(x.stock)}${STOCK[x.stock][0]}`;
    $('#lpPrice').innerHTML = priceHTML(x);
  }
  $('#logList').addEventListener('pointerover', e => { const r = e.target.closest('.row'); if (r) previewLog(r.dataset.h); });
  $('#logList').addEventListener('focusin', e => { const r = e.target.closest('.row'); if (r) previewLog(r.dataset.h); });
  $('#logList').addEventListener('click', e => { const r = e.target.closest('.row'); if (r) openInspect(r.dataset.h, { from: r }); });
  $('#lpOpen').addEventListener('click', e => { if (logCur) openInspect(logCur, { from: e.currentTarget }); });
  if (logItems[0]) previewLog(logItems[0].h);
  $('#lpPic').addEventListener('pointermove', e => {
    const pic = e.currentTarget, r = pic.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    pic.style.setProperty('--cx', x + 'px'); pic.style.setProperty('--cy', y + 'px');
    $('#lpXy').textContent = `X${pad(Math.round(x), 3)} Y${pad(Math.round(y), 3)}`;
  });

  // ---- Archive: filter, sort, cards ----------------------------------------
  let filter = 'all', sort = 'featured', visible = [];
  const capSel = {};            // handle -> chosen value on the card's key-caps
  const cmp = [];               // handles chosen for compare (max 3)
  const SORTS = {
    featured: (a, b) => b.avail - a.avail || b.rank - a.rank || b.p - a.p,
    new: (a, b) => b.avail - a.avail || b.pub - a.pub,
    low: (a, b) => b.avail - a.avail || a.p - b.p,
    high: (a, b) => b.avail - a.avail || b.p - a.p
  };
  const LABEL = { all: 'objects', top: 'tops', bottom: 'bottoms', accessory: 'objects', gift: 'gift cards' };
  const SORT_NAME = { featured: 'featured', new: 'newest', low: 'price low-high', high: 'price high-low' };
  // filter counts on the keys
  $$('.fkey').forEach(b => { const f = b.dataset.filter; $('i', b).textContent = pad(f === 'all' ? N : items.filter(x => x.t === f).length); });

  function capsHTML(x) {
    const p = x.d, oi = primaryOpt(p);
    if (oi < 0) {
      const o = p.options.find(op => !isDefaultOpt(op));
      return `<div class="caps"><span class="caps-k">${esc(optLabel(o ? o.name : 'Size').toUpperCase().slice(0, 5))}</span><span class="uni">${o ? esc(o.values[0]) : 'One size'}</span></div>`;
    }
    const o = p.options[oi];
    return `<div class="caps" role="group" aria-label="${esc(optLabel(o.name))} for ${esc(x.n)}"><span class="caps-k">${esc(optLabel(o.name).toUpperCase().slice(0, 5))}</span>${o.values.map(v => {
      const ok = valAvail(p, oi, v);
      return `<button type="button" class="cap" data-cap="${esc(v)}" aria-pressed="${capSel[x.h] === v}"${ok ? '' : ' disabled'}>${esc(String(v).replace(/\.00$/, ''))}</button>`;
    }).join('')}</div>`;
  }
  function cardHTML(x, n, total) {
    const tag = x.avail ? (x.isNew ? '<span class="tag">NEW</span>' : '') : '<span class="tag">SOLD OUT</span>';
    return `
    <article class="card${x.avail ? '' : ' sold'}" data-h="${esc(x.h)}" style="--i:${n % 4}">
      <div class="c-head"><span class="c-id">${x.id}</span><span class="c-cat">${esc(catLine(x))}</span><span class="c-idx">${pad(n + 1)}/${pad(total)}</span></div>
      <div class="pic brk" data-open>
        <img data-img class="m" loading="lazy" decoding="async" width="640" height="800" src="${esc(safeUrl(x.i))}" alt="${esc(x.n)}">
        ${x.i2 ? `<img data-img class="a" loading="lazy" decoding="async" width="640" height="800" src="${esc(safeUrl(x.i2))}" alt="">` : ''}
        <span class="xh" aria-hidden="true"><i class="xh-v"></i><i class="xh-h"></i><i class="xh-o"></i><b class="xy">X000 Y000</b></span>
        <span class="scanbar" aria-hidden="true"></span>${tag}
      </div>
      <h3 class="c-title"><a href="${esc(STORE_URL)}/products/${esc(x.h)}" data-open>${esc(x.n)}</a></h3>
      <div class="c-row"><span class="stock">${led(x.stock)}${STOCK[x.stock][0]}</span><span class="price">${priceHTML(x)}</span></div>
      ${capsHTML(x)}
      <div class="c-foot"><button type="button" class="key" data-act="inspect">Inspect${icon('ret')}</button><button type="button" class="key" data-act="cmp" aria-pressed="${cmp.includes(x.h)}" aria-label="Compare ${esc(x.n)}">+ Cmp</button></div>
    </article>`;
  }
  const countFlash = txt => { const c = $('#count'); c.innerHTML = txt; };
  function drawStore() {
    visible = items.filter(x => filter === 'all' || x.t === filter).sort(SORTS[sort]);
    countFlash(`Showing <b>${pad(visible.length)}</b> / ${pad(N)} ${LABEL[filter]} · sort: ${SORT_NAME[sort]}`);
    $('#sbVis').textContent = visible.length; $('#shopCount2').textContent = `${visible.length}/${N} OBJECTS`;
    $('#products').innerHTML = visible.length ? visible.map((x, n) => cardHTML(x, n, visible.length)).join('') : '<p class="empty">No objects in this category right now. Check back soon.</p>';
  }
  function applyFilter(f, scroll) {
    filter = f;
    $$('.fkey').forEach(b => { const on = b.dataset.filter === f; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    drawStore();
    if (scroll) goTo('#archive');
  }
  function applySort(s, scroll) { sort = s; $('#sort').value = s; drawStore(); if (scroll) goTo('#archive'); }
  $$('.fkey').forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
  $('#sort').addEventListener('change', e => applySort(e.target.value));

  const grid = $('#products');
  grid.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const h = card.dataset.h;
    const cap = e.target.closest('.cap');
    if (cap) {
      const v = cap.dataset.cap;
      capSel[h] = capSel[h] === v ? undefined : v;
      $$('.cap', card).forEach(c => c.setAttribute('aria-pressed', capSel[h] === c.dataset.cap));
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'cmp') { toggleCmp(h); return; }
    if (e.target.closest('a') && (e.metaKey || e.ctrlKey || e.shiftKey || e.button)) return;
    if (act || e.target.closest('[data-open]')) { e.preventDefault(); openInspect(h, { pre: capSel[h], from: act || e.target.closest('a') || card }); }
  });
  // crosshair follows the pointer over a photo; coordinates update live
  grid.addEventListener('pointermove', e => {
    const pic = e.target.closest('.pic'); if (!pic || e.pointerType === 'touch') return;
    const r = pic.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    pic.style.setProperty('--cx', x + 'px'); pic.style.setProperty('--cy', y + 'px');
    const xy = $('.xy', pic); if (xy) xy.textContent = `X${pad(Math.round(x), 3)} Y${pad(Math.round(y), 3)}`;
  });
  grid.addEventListener('pointerout', e => {
    const pic = e.target.closest('.pic'); if (!pic || pic.contains(e.relatedTarget)) return;
    pic.style.removeProperty('--cx'); pic.style.removeProperty('--cy');
    const xy = $('.xy', pic); if (xy) xy.textContent = 'X000 Y000';
  });

  // ---- Compare -------------------------------------------------------------
  const tray = $('#cmpTray');
  function toggleCmp(h) {
    const k = cmp.indexOf(h);
    if (k >= 0) cmp.splice(k, 1);
    else if (cmp.length >= 3) { $('#cmpN').textContent = 'MAX 3'; setTimeout(renderCmp, 1200); return; }
    else cmp.push(h);
    renderCmp();
  }
  function renderCmp() {
    tray.hidden = cmp.length === 0;
    $('#cmpN').textContent = cmp.length;
    $('#cmpChips').innerHTML = cmp.map(h => `<span>${byHandle[h].id}</span>`).join('');
    $('#cmpOpen').disabled = cmp.length < 2;
    $('#cmpOpen').textContent = cmp.length < 2 ? 'Pick 2+' : 'Open compare';
    $$('#products [data-act="cmp"]').forEach(b => b.setAttribute('aria-pressed', cmp.includes(b.closest('.card').dataset.h)));
    const ib = $('#inspCmp'); if (cur) { const on = cmp.includes(cur.h); ib.setAttribute('aria-pressed', on); ib.textContent = on ? '− In compare' : '+ Compare'; }
    if (!$('#cmp').hidden) drawCmp();
  }
  function drawCmp() {
    const xs = cmp.map(h => byHandle[h]);
    $('#cmpCount').textContent = xs.length;
    if (!xs.length) { $('#cmpTable').innerHTML = '<tbody><tr><td class="cmp-empty">Nothing to compare yet.</td></tr></tbody>'; return; }
    const row = (k, f) => `<tr><th scope="row">${k}</th>${xs.map(x => `<td>${f(x)}</td>`).join('')}</tr>`;
    $('#cmpTable').innerHTML = `
      <thead><tr><th scope="col"><span class="sr">Attribute</span></th>${xs.map((x, i) => `<th scope="col" style="position:static;width:auto;background:transparent;color:var(--hi)">${String.fromCharCode(65 + i)} / ${x.id}</th>`).join('')}</tr></thead>
      <tbody>
      ${row('Photo', x => `<div class="cp-pic"><img data-img src="${esc(safeUrl(sized(x.d.images.find(i => !isHeic(i.src))?.src || x.d.images[0]?.src || '', 520)))}" alt="${esc(x.n)}" loading="lazy"></div>`)}
      ${row('Title', x => `<span class="cp-t">${esc(x.n)}</span>`)}
      ${row('Type', x => esc(catLine(x)))}
      ${row('Sizes', x => { const oi = primaryOpt(x.d); return oi < 0 ? 'One size' : esc(x.d.options[oi].values.join(' · ')); })}
      ${row('Stock', x => `<span class="st">${led(x.stock)}${STOCK[x.stock][0]}</span><small>${x.avN}/${x.total} variants</small>`)}
      ${row('Price', x => `${esc(priceText(x))} <small>CAD</small>`)}
      ${row('Logged', x => dateText(x))}
      ${row('Action', x => `<span class="cp-act"><button type="button" class="key solid" data-ins="${esc(x.h)}">Inspect</button><button type="button" class="key" data-rm="${esc(x.h)}">Remove</button></span>`)}
      </tbody>`;
  }
  let cmpFrom = null;
  function openCmp() {
    if (cmp.length < 2) return;
    cmpFrom = document.activeElement;
    drawCmp(); const el = $('#cmp'); el.classList.remove('closing'); el.hidden = false; root.style.overflow = 'hidden'; refreshInert();
    requestAnimationFrame(() => { el.classList.add('open'); $('.cmp-panel [data-close]').focus(); });
  }
  function closeCmp(restore = true) {
    const el = $('#cmp'); if (el.hidden || el.classList.contains('closing')) return;
    el.classList.remove('open'); el.classList.add('closing'); refreshInert();
    setTimeout(() => { el.hidden = true; el.classList.remove('closing'); refreshInert(); }, reduceMotion ? 0 : 340);
    if ($('#inspect').hidden || $('#inspect').classList.contains('closing')) root.style.overflow = '';
    if (restore && cmpFrom && document.contains(cmpFrom)) cmpFrom.focus();
  }
  $('#cmpOpen').addEventListener('click', openCmp);
  $('#cmpClear').addEventListener('click', () => { cmp.length = 0; renderCmp(); closeCmp(); });
  $('#cmp').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closeCmp();
    const rm = e.target.closest('[data-rm]'); if (rm) { toggleCmp(rm.dataset.rm); if (cmp.length < 2) closeCmp(); return; }
    const ins = e.target.closest('[data-ins]'); if (ins) { closeCmp(false); openInspect(ins.dataset.ins, { from: cmpFrom }); }
  });

  // ---- Inspect drawer ------------------------------------------------------
  const insp = $('#inspect');
  let cur = null, sel = [], shot = 0, lastFocus = null, navList = [];
  const variantFor = () => cur.d.variants.find(v => v.options.length === sel.length && v.options.every((o, i) => o === sel[i]));
  const hasChoice = () => cur.d.options.some(o => !isDefaultOpt(o) && o.values.length > 1);

  function showShot(i, animate = true) {
    const imgs = cur.d.images, n = imgs.length; if (!n) return;
    shot = (i + n) % n;
    const img = $('#inspImg');
    img.dataset.img = ''; img.classList.remove('fallback');
    img.alt = `${cur.n}, photo ${shot + 1} of ${n}`;
    img.src = safeUrl(sized(imgs[shot].src, 1100));
    if (animate && !reduceMotion) { img.classList.remove('swap'); void img.offsetWidth; img.classList.add('swap'); }
    $('#inspFrameNo').textContent = `FRAME ${pad(shot + 1)}/${pad(n)}`;
    $('#inspFig').classList.toggle('single', n < 2);
    $$('#inspFrames button').forEach((b, k) => { b.setAttribute('aria-current', k === shot); });
    const on = $$('#inspFrames button')[shot]; if (on && on.scrollIntoView) { const fr = $('#inspFrames'); fr.scrollLeft = on.offsetLeft - fr.clientWidth / 2 + on.offsetWidth / 2; }
  }
  function drawSpec() {
    const x = cur, p = x.d, v = variantFor();
    const state = !v ? x.stock : v.available ? 'in' : 'out';
    const rows = [];
    rows.push(['Object ID', esc(x.id), 'meta']);
    rows.push(['Type', `${esc(typeLabel(x))} <small class="inl">/ ${CAT[x.t].code}</small>`]);
    p.options.forEach((o, oi) => {
      if (isDefaultOpt(o)) return;
      if (o.values.length < 2) { rows.push([optLabel(o.name), esc(o.values[0])]); return; }
      const chips = o.values.map(val => {
        const ok = p.variants.some(vr => vr.available && vr.options[oi] === val && vr.options.every((ov, k) => k === oi || ov === sel[k]));
        return `<button type="button" class="chip" data-o="${oi}" data-v="${esc(val)}" aria-pressed="${sel[oi] === val}"${ok ? '' : ' disabled'}>${esc(String(val).replace(/\.00$/, ''))}</button>`;
      }).join('');
      rows.push([optLabel(o.name), `<div class="caps" role="group" aria-label="${esc(optLabel(o.name))}">${chips}</div>`]);
    });
    if (!p.options.some(o => !isDefaultOpt(o))) rows.push(['Size', 'One size']);
    rows.push(['Stock', `<span class="st">${led(state)}${STOCK[state][0]}<small class="inl">${x.avN}/${x.total} variants</small></span>`]);
    rows.push(['Price', `<span class="big">${esc(fmt(v ? v.price : x.p))}<small>CAD</small></span>`]);
    rows.push(['Logged', dateText(x)]);
    rows.push(['Ships to', `${ZONES.length} zones${ZONES.includes('NG') ? ' <small class="inl">/ incl. NG</small>' : ''}`]);
    $('#specBody').innerHTML = rows.map(([k, val, cls]) => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${esc(k)}</th><td>${val}</td></tr>`).join('');
    const buy = $('#inspBuy'), can = v && v.available;
    if (can) buy.href = `${STORE_URL}/cart/${v.id}:1`; else buy.removeAttribute('href');
    $('.buy-t', buy).textContent = can ? 'Add to bag' : 'Sold out';
    buy.setAttribute('aria-disabled', can ? 'false' : 'true');
    if (!can) buy.setAttribute('role', 'link');
    else buy.removeAttribute('role');
  }
  function setHash(id) { try { history.replaceState(null, '', id ? '#' + id.toLowerCase() : location.pathname + location.search); } catch { /* ignore */ } }

  function openInspect(h, opts = {}) {
    const x = byHandle[h]; if (!x) return;
    cur = x; const p = x.d;
    if (insp.hidden) lastFocus = opts.from || document.activeElement;
    navList = visible.includes(x) ? visible : [...items].sort((a, b) => a.id.localeCompare(b.id));
    // choose a variant: honour a size picked on the card, else first in-stock variant
    const oi = primaryOpt(p);
    let first = null;
    if (opts.pre != null && oi >= 0) first = p.variants.find(v => v.available && v.options[oi] === opts.pre) || p.variants.find(v => v.options[oi] === opts.pre);
    first = first || p.variants.find(v => v.available) || p.variants[0];
    sel = first ? first.options.slice() : [];
    $('#inspId').textContent = x.id;
    $('#inspPos').textContent = `${pad(navList.indexOf(x) + 1)}/${pad(navList.length)}`;
    $('#inspSub').textContent = catLine(x);
    $('#inspTitle').textContent = x.n;
    const d = $('#inspDesc'), txt = (p.description || '').trim();
    d.classList.toggle('none', !txt);
    if (txt) typeInto(d, txt, 520); else { clearInterval(d._tt); d.textContent = 'No notes on file.'; }
    $('#inspPage').href = `${STORE_URL}/products/${p.handle}`;
    $('#inspFrames').innerHTML = p.images.map((im, k) => `<li><button type="button" aria-label="Frame ${k + 1} of ${p.images.length}"><img data-img loading="lazy" decoding="async" src="${esc(safeUrl(sized(im.src, 140)))}" alt=""><span>${pad(k + 1)}</span></button></li>`).join('');
    $('#inspFig').classList.remove('raw'); $('#inspRaw').setAttribute('aria-pressed', 'false'); $('#inspRaw').textContent = 'Signal: filtered';
    showShot(0, insp.hidden === false); drawSpec(); renderCmp();
    setHash(x.id);
    if (insp.hidden || insp.classList.contains('closing')) {
      insp.classList.remove('closing'); insp.hidden = false; root.style.overflow = 'hidden'; refreshInert();
      requestAnimationFrame(() => { insp.classList.add('open'); $('#inspX').focus(); });
    }
    $('#inspBody').scrollTop = 0; $('.insp-spec').scrollTop = 0;
  }
  function closeInspect(restore = true) {
    if (insp.hidden || insp.classList.contains('closing')) return;
    insp.classList.remove('open'); insp.classList.add('closing'); refreshInert(); clearInterval($('#inspDesc')._tt);
    if ($('#cmp').hidden) root.style.overflow = '';
    setTimeout(() => { insp.hidden = true; insp.classList.remove('closing'); refreshInert(); }, reduceMotion ? 0 : 360);
    if (/^#mc-\d+$/i.test(location.hash)) setHash('');
    if (restore && lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null) lastFocus.focus();
    cur = null;
  }
  const stepObj = d => { if (!cur || !navList.length) return; const k = (navList.indexOf(cur) + d + navList.length) % navList.length; openInspect(navList[k].h); };
  $('#inspPrev').addEventListener('click', () => stepObj(-1));
  $('#inspNext').addEventListener('click', () => stepObj(1));
  $('#inspCmp').addEventListener('click', () => cur && toggleCmp(cur.h));
  $('#inspRaw').addEventListener('click', e => {
    const raw = $('#inspFig').classList.toggle('raw');
    e.currentTarget.setAttribute('aria-pressed', raw); e.currentTarget.textContent = raw ? 'Signal: raw' : 'Signal: filtered';
  });
  insp.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closeInspect();
    if (e.target.closest('#frPrev')) return showShot(shot - 1);
    if (e.target.closest('#frNext')) return showShot(shot + 1);
    const chip = e.target.closest('.chip'); if (chip) { sel[+chip.dataset.o] = chip.dataset.v; if (!variantFor()) { const f = cur.d.variants.find(v => v.options[+chip.dataset.o] === chip.dataset.v && v.available) || cur.d.variants.find(v => v.options[+chip.dataset.o] === chip.dataset.v); if (f) sel = f.options.slice(); } drawSpec(); return; }
    const th = e.target.closest('#inspFrames button'); if (th) { showShot($$('#inspFrames button').indexOf(th)); return; }
    const buy = e.target.closest('#inspBuy'); if (buy && buy.getAttribute('aria-disabled') === 'true') e.preventDefault();
  });
  let sx0 = null; const fig = $('#inspFig');
  fig.addEventListener('pointerdown', e => { sx0 = e.clientX; });
  fig.addEventListener('pointerup', e => { if (sx0 != null && Math.abs(e.clientX - sx0) > 40) showShot(shot + (e.clientX < sx0 ? 1 : -1)); sx0 = null; });
  fig.addEventListener('pointercancel', () => { sx0 = null; });

  // ---- Command palette -----------------------------------------------------
  const cmdk = $('#cmdk'), cIn = $('#cmdkIn'), cList = $('#cmdkList');
  let cItems = [], cIdx = 0, cFrom = null;
  const SECS = [['Top of page', '#top', '00'], ['Latest entries', '#latest', '01'], ['Archive / shop', '#archive', '02'], ['System manifest', '#manifest', '03'], ['Event log', '#events', '04'], ['Help, FAQ and delivery routes', '#help', '05'], ['Contact + drop alerts', '#contact', '06']];
  const goTo = hash => {
    const el = $(hash); if (!el) return;
    if (hash === '#top') scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true });
  };
  const ACTS = () => [
    { t: 'Show all objects', run: () => applyFilter('all', true) },
    { t: 'Show tops', run: () => applyFilter('top', true) },
    { t: 'Show bottoms', run: () => applyFilter('bottom', true) },
    { t: 'Show objects (rings, chains, necklaces)', run: () => applyFilter('accessory', true) },
    { t: 'Show gift cards', run: () => applyFilter('gift', true) },
    { t: 'Sort: newest first', run: () => applySort('new', true) },
    { t: 'Sort: price low to high', run: () => applySort('low', true) },
    { t: 'Sort: price high to low', run: () => applySort('high', true) },
    { t: 'Sort: featured', run: () => applySort('featured', true) },
    ...(cmp.length >= 2 ? [{ t: `Open compare (${cmp.length})`, run: () => openCmp() }] : []),
    { t: 'Open bag', link: STORE_URL + '/cart' },
    { t: 'Instagram @monochrome.ca', link: 'https://www.instagram.com/monochrome.ca/' },
    { t: 'Email info.mccanada@gmail.com', link: 'mailto:info.mccanada@gmail.com' },
    { t: `Crosshair: ${xhairOn ? 'turn off' : 'turn on'}`, run: () => setXhair(!xhairOn), fine: true }
  ].filter(a => !a.fine || fine);
  const reEsc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hl = (s, tk) => { if (!tk.length) return esc(s); const re = new RegExp('(' + tk.map(reEsc).join('|') + ')', 'gi'); return s.split(re).map((part, i) => i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)).join(''); };
  function buildCmd(q) {
    const tk = q.toLowerCase().split(/\s+/).filter(Boolean);
    const match = hay => tk.every(t => hay.includes(t));
    const objs = items.filter(x => match(`${x.id} ${x.n} ${x.type} ${CAT[x.t].label} ${CAT[x.t].code} ${x.d.sizes.join(' ')} ${x.d.options.map(o => o.values.join(' ')).join(' ')}`.toLowerCase()))
      .map(x => ({ kind: 'OBJ', x, score: (x.id.toLowerCase() === q.toLowerCase() ? 0 : x.n.toLowerCase().startsWith(tk[0] || '') ? 1 : x.id.toLowerCase().includes(tk[0] || '') ? 2 : 3) }))
      .sort((a, b) => a.score - b.score || SORTS.featured(a.x, b.x));
    const secs = SECS.filter(s => match(`go ${s[0]} ${s[1]}`.toLowerCase())).map(s => ({ kind: 'GO', t: s[0], hash: s[1], n: s[2] }));
    const acts = ACTS().filter(a => match(a.t.toLowerCase())).map(a => ({ kind: 'ACT', ...a }));
    const groups = q ? [['Objects', objs], ['Go to', secs], ['Actions', acts]] : [['Go to', secs], ['Actions', acts], ['Objects', objs]];
    return { tk, groups: groups.filter(g => g[1].length) };
  }
  function renderCmd() {
    const q = cIn.value.trim(), { tk, groups } = buildCmd(q);
    cItems = []; let html = '';
    groups.forEach(([name, list]) => {
      html += `<li class="grp" role="presentation">${name} · ${list.length}</li>`;
      list.forEach(it => {
        const i = cItems.push(it) - 1;
        if (it.kind === 'OBJ') {
          const x = it.x;
          html += `<li role="option" id="cmdk-o-${i}" data-i="${i}" aria-selected="false"><span class="k">OBJ</span><span class="t">${hl(x.n, tk)}</span><span class="m">${hl(x.id, tk)} ${led(x.stock)}${esc(priceText(x))}</span></li>`;
        } else if (it.kind === 'GO') {
          html += `<li role="option" id="cmdk-o-${i}" data-i="${i}" aria-selected="false"><span class="k">GO</span><span class="t">${hl(it.t, tk)}</span><span class="m">${it.n === '00' ? 'TOP' : 'SEC ' + it.n}</span></li>`;
        } else {
          html += `<li role="option" id="cmdk-o-${i}" data-i="${i}" aria-selected="false"><span class="k">ACT</span><span class="t mo">${hl(it.t, tk)}</span><span class="m">${it.link ? icon('ne') : icon('r')}</span></li>`;
        }
      });
    });
    cList.innerHTML = html || `<li class="none" role="presentation">No match for "${esc(q)}". Try a name, an ID like MC-017, "ring" or "tops".</li>`;
    $('#cmdkCount').textContent = `${cItems.length} result${cItems.length === 1 ? '' : 's'}`;
    cIdx = 0; selectCmd(0, false);
  }
  function selectCmd(i, scroll = true) {
    if (!cItems.length) { cIn.removeAttribute('aria-activedescendant'); return; }
    cIdx = (i + cItems.length) % cItems.length;
    $$('[role="option"]', cList).forEach(o => o.setAttribute('aria-selected', +o.dataset.i === cIdx));
    const el = $(`#cmdk-o-${cIdx}`); cIn.setAttribute('aria-activedescendant', `cmdk-o-${cIdx}`);
    if (el && scroll) el.scrollIntoView({ block: 'nearest' });
  }
  function openCmd(prefill = '') {
    if (!cmdk.hidden && !cmdk.classList.contains('closing')) return;
    cFrom = document.activeElement; cmdk.classList.remove('closing'); cmdk.hidden = false; refreshInert(); cIn.value = prefill; renderCmd();
    requestAnimationFrame(() => { cmdk.classList.add('open'); cIn.focus(); });
  }
  function closeCmd(restore = true) {
    if (cmdk.hidden || cmdk.classList.contains('closing')) return;
    cmdk.classList.remove('open'); cmdk.classList.add('closing'); refreshInert();
    setTimeout(() => { cmdk.hidden = true; cmdk.classList.remove('closing'); refreshInert(); }, reduceMotion ? 0 : 280);
    if (restore && cFrom && document.contains(cFrom) && cFrom.offsetParent !== null) cFrom.focus();
  }
  function runCmd(i) {
    const it = cItems[i]; if (!it) return;
    if (it.kind === 'OBJ') { closeCmd(false); openInspect(it.x.h, { from: cFrom }); return; }
    if (it.link) { closeCmd(); window.open(it.link, it.link.startsWith('mailto:') ? '_self' : '_blank', 'noopener'); return; }
    closeCmd(false);
    if (insp && !insp.hidden) closeInspect(false);
    if (it.kind === 'GO') setTimeout(() => goTo(it.hash), 30); else it.run();
  }
  cIn.addEventListener('input', renderCmd);
  cList.addEventListener('mousemove', e => { const o = e.target.closest('[role="option"]'); if (o && +o.dataset.i !== cIdx) selectCmd(+o.dataset.i, false); });
  cList.addEventListener('click', e => { const o = e.target.closest('[role="option"]'); if (o) runCmd(+o.dataset.i); });
  cmdk.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCmd(); });
  cmdk.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) { e.preventDefault(); selectCmd(cIdx + 1); }
    else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) { e.preventDefault(); selectCmd(cIdx - 1); }
    else if (e.key === 'PageDown') { e.preventDefault(); selectCmd(Math.min(cItems.length - 1, cIdx + 6)); }
    else if (e.key === 'PageUp') { e.preventDefault(); selectCmd(Math.max(0, cIdx - 6)); }
    else if (e.key === 'Home' && e.target === cIn && e.ctrlKey) { e.preventDefault(); selectCmd(0); }
    else if (e.key === 'End' && e.target === cIn && e.ctrlKey) { e.preventDefault(); selectCmd(cItems.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); runCmd(cIdx); }
    else if (e.key === 'Tab') { e.preventDefault(); const x = $('.cmdk-x'); (document.activeElement === cIn ? x : cIn).focus(); }
  });
  $('#cmdOpen').addEventListener('click', () => openCmd());
  $('#cmdOpen2').addEventListener('click', () => openCmd());
  $$('[data-cmd]').forEach(b => b.addEventListener('click', () => openCmd()));

  // While a dialog is open, everything behind it is inert (no focus, no screen-reader traversal).
  const isOpen = el => !el.hidden && !el.classList.contains('closing');
  function refreshInert() {
    const insp_ = isOpen($('#inspect')), cmp_ = isOpen($('#cmp')), cmdk_ = isOpen($('#cmdk')), any = insp_ || cmp_ || cmdk_;
    ['#main', '.bar-t', '.bar-b', '.foot', '#cmpTray'].forEach(sel => { const el = $(sel); if (el) el.inert = any; });
    $('#inspect').inert = cmdk_; $('#cmp').inert = cmdk_;
  }

  // ---- Global keys ---------------------------------------------------------
  const typing = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk.hidden ? openCmd() : closeCmd(); return; }
    if (!cmdk.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeCmd(); } return; }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target) && insp.hidden && $('#cmp').hidden) { e.preventDefault(); openCmd(); return; }
    if (!$('#cmp').hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeCmp(); }
      else if (e.key === 'Tab') trap(e, $('.cmp-panel'));
      return;
    }
    if (!insp.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeInspect(); }
      else if (typing(e.target)) return;
      else if (e.key === 'ArrowRight') showShot(shot + 1);
      else if (e.key === 'ArrowLeft') showShot(shot - 1);
      else if (e.key === ']') stepObj(1);
      else if (e.key === '[') stepObj(-1);
      else if (e.key === 'Tab') trap(e, $('.insp-panel'));
    }
  });
  function trap(e, scope) {
    const f = $$('button:not(:disabled),a[href],[tabindex="0"],input,select', scope).filter(x => x.offsetParent && x.getAttribute('aria-disabled') !== 'true');
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }

  // ---- Delivery routes -----------------------------------------------------
  (() => {
    let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* names unavailable */ }
    const nameOf = c => { try { return (dn && dn.of(c)) || c; } catch { return c; } };
    const zs = ZONES.map(c => ({ c, n: nameOf(c) })).sort((a, b) => a.n.localeCompare(b.n));
    $('#rtCount').textContent = `${zs.length} ZONES`;
    $('#rtGrid').innerHTML = zs.map(z => `<li><button type="button" class="rt" data-c="${z.c}" aria-pressed="false" aria-label="${esc(z.n)}"><b>${z.c}</b><span>${esc(z.n)}</span></button></li>`).join('');
    const out = $('#rtOut');
    const show = z => {
      $$('.rt').forEach(b => b.setAttribute('aria-pressed', !!z && b.dataset.c === z.c));
      out.innerHTML = z ? `${led('in')}<span>ROUTE OPEN · ${esc(z.n.toUpperCase())} (${z.c})</span>` : '';
    };
    $('#rtGrid').addEventListener('click', e => { const b = e.target.closest('.rt'); if (!b) return; const z = zs.find(x => x.c === b.dataset.c); $('#rtIn').value = z.n; show(z); });
    $('#rtIn').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) { show(null); out.textContent = ''; return; }
      const z = zs.find(x => x.c.toLowerCase() === q) || zs.find(x => x.n.toLowerCase().startsWith(q)) || zs.find(x => x.n.toLowerCase().includes(q));
      if (z) show(z); else { $$('.rt').forEach(b => b.setAttribute('aria-pressed', 'false')); out.innerHTML = `${led('out')}<span>NO ROUTE LISTED FOR "${esc(q.toUpperCase())}". EMAIL US AND WE WILL CHECK.</span>`; }
    });
    const ng = zs.find(z => z.c === 'NG') || zs[0];
    if (ng) show(ng);
  })();

  // ---- Boot-up render + deep link -------------------------------------------
  drawStore(); renderCmp(); onScroll();
  const deep = () => { const m = /^#(mc-\d+)$/i.exec(location.hash); if (m && byId[m[1].toLowerCase()]) openInspect(byId[m[1].toLowerCase()].h); };
  onReady(() => setTimeout(deep, 380));
  addEventListener('hashchange', () => { if (bootDone) deep(); });
  window.__mc = { items, openInspect, goTo };
})();
