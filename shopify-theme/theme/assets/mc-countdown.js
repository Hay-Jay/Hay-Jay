/* COUNTDOWN — the priority transmission (sections/mc-countdown.liquid). Split-flap T-minus clock, decryption bar and cover blur that
   clear as the launch nears, press-and-hold peek, decrypting headline, intercepted-transmissions log, launch times in other cities,
   add-to-calendar, share, and the declassification at zero. Without JavaScript the page still shows the date, the signup and the cover. */
(() => {
  'use strict';
  const cd = document.getElementById('cd');
  if (!cd) return;
  const $ = (s, r = cd) => r.querySelector(s), $$ = (s, r = cd) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LAUNCH = Date.parse(cd.dataset.launch), START = Date.parse(cd.dataset.start);
  if (!Number.isFinite(LAUNCH)) return;
  const pad = n => String(n).padStart(2, '0');

  // ---- split-flap digits ---------------------------------------------------------------------------------------
  const flaps = {};
  $$('.cd-u').forEach(u => { flaps[u.dataset.u] = $$('.fd', u); });
  function setDigit(fd, v) {
    const old = fd.dataset.v;
    if (old === v) return;
    const [t, b, ft, fb] = fd.children;
    fd.dataset.v = v;
    if (old === undefined || reduce) { t.textContent = b.textContent = ft.textContent = fb.textContent = v; return; }
    t.textContent = v; ft.textContent = old; fb.textContent = v; b.textContent = old;
    fd.classList.remove('go'); void fd.offsetWidth; fd.classList.add('go');
    clearTimeout(fd._t); fd._t = setTimeout(() => { b.textContent = v; ft.textContent = v; fd.classList.remove('go'); }, 660);
  }
  function setUnit(k, n) { const s = pad(Math.min(99, n)); (flaps[k] || []).forEach((fd, i) => setDigit(fd, s[i])); }

  // ---- the clock ----------------------------------------------------------------------------------------------------
  const bar = $('[data-cd-bar]'), pct = $('[data-cd-pct]'), sr = $('[data-cd-sr]'), utc = $('[data-cd-utc]'), bag = $('[data-cd-bag]');
  let live = cd.classList.contains('is-live'), lastSr = -1;
  function tick() {
    const now = Date.now(), left = Math.max(0, LAUNCH - now);
    const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
    setUnit('d', d); setUnit('h', h); setUnit('m', m); setUnit('s', s);
    // the screen-reader line changes once a minute, not every second
    const mins = Math.ceil(left / 6e4);
    if (sr && mins !== lastSr) { lastSr = mins; sr.textContent = left ? `${d} days, ${h} hours and ${m} minutes until the launch.` : 'The issue is declassified.'; }
    const k = Number.isFinite(START) && LAUNCH > START ? Math.min(1, Math.max(0, (now - START) / (LAUNCH - START))) : 0;
    if (bar) bar.style.width = `${(k * 100).toFixed(2)}%`;
    if (pct) pct.textContent = `${Math.floor(k * 100)}%`;
    if (bag) bag.style.setProperty('--blur', `${(16 - 13 * k).toFixed(1)}px`);
    if (utc) { const n = new Date(now); utc.textContent = `UTC ${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}:${pad(n.getUTCSeconds())}`; }
    scopeLevel = .25 + k * .75;
    if (!left && !live) declassify();
  }

  // ---- launch moment in the visitor's time and in the listed cities -------------------------------------------------------
  const when = new Date(LAUNCH);
  const local = $('[data-cd-local]');
  try { if (local) local.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(when); } catch { /* keep the server text */ }
  const cities = $('[data-cd-cities]');
  if (cities) {
    cities.innerHTML = (cd.dataset.cities || '').split(';').map(x => x.split('|')).filter(x => x.length === 2).map(([name, tz]) => {
      try { return `<span>${name.trim()} <b>${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', weekday: 'short', timeZone: tz.trim() }).format(when)}</b></span>`; } catch { return ''; }
    }).join('');
  }
  const tag = $('.cd-tag');
  if (tag) { try { const regina = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Regina' }).formatToParts(when).reduce((o, p) => (o[p.type] = p.value, o), {}); tag.lastChild.textContent = `Sealed until ${regina.day}.${regina.month} — ${regina.hour}:${regina.minute} Regina`; } catch { /* keep */ } }

  // ---- the headline decrypts itself, then glitches now and then ------------------------------------------------------------
  // Each letter keeps its own box and a glitch glyph is drawn over it, so the headline never reflows.
  const hx = $('[data-scramble]'), GLYPHS = '#%&@$ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const cells = [];
  if (hx) {
    const words = hx.textContent.trim().split(/\s+/);
    hx.textContent = '';
    words.forEach((word, wi) => {
      if (wi) hx.append(' ');
      const w = document.createElement('span'); w.className = 'w';
      for (const ch of word) { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.append(c); cells.push(c); }
      hx.append(w);
    });
  }
  function scramble(dur, only) {
    if (reduce || !cells.length) return;
    const t0 = performance.now(), idx = only || cells.map((_, i) => i), n = cells.length;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      for (const i of idx) {
        const c = cells[i];
        if (k >= (only ? 0 : i / n) * .7 + .3) c.classList.remove('gl');
        else { c.dataset.g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; c.classList.add('gl'); }
      }
      if (k < 1) requestAnimationFrame(step); else for (const i of idx) cells[i].classList.remove('gl');
    };
    requestAnimationFrame(step);
  }
  if (cells.length) {
    scramble(1600);
    if (!reduce) setInterval(() => {
      if (document.hidden) return;
      scramble(380, Array.from({ length: 3 }, () => Math.floor(Math.random() * cells.length)));
    }, 7000);
  }

  // ---- intercepted transmissions: lines type out one after another, then the log rolls over -----------------------------------------
  const log = $('[data-cd-log]');
  if (log) {
    const items = $$('li', log), texts = items.map(li => li.dataset.line || li.textContent);
    let i = 0;
    const stamp = () => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`; };
    const show = () => {
      if (!items.length) return;
      if (i >= items.length) { items.forEach(li => li.classList.remove('on')); i = 0; }
      const li = items[i], text = texts[i];
      li.classList.add('on');
      if (reduce) { li.innerHTML = `<span class="ts">${stamp()}</span>&gt; ${escapeHtml(text)}`; i++; setTimeout(show, 2600); return; }
      let n = 0; const ts = stamp();
      const typeIt = () => {
        n++;
        li.innerHTML = `<span class="ts">${ts}</span>&gt; ${escapeHtml(text.slice(0, n))}${n < text.length ? '<i class="cur"></i>' : ''}`;
        if (n < text.length) setTimeout(typeIt, 22 + Math.random() * 30); else { i++; setTimeout(show, 1700); }
      };
      typeIt();
    };
    show();
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ---- the oscilloscope: the signal grows as the launch nears -----------------------------------------------------------------------
  let scopeLevel = .3;
  const cv = $('[data-cd-scope]');
  if (cv && cv.getContext) {
    const c = cv.getContext('2d');
    const draw = now => {
      const w = cv.width, h = cv.height;
      c.clearRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1;
      for (let x = 0; x <= w; x += 45) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
      c.strokeStyle = '#ececec'; c.lineWidth = 2; c.shadowColor = 'rgba(255,255,255,.6)'; c.shadowBlur = 8;
      c.beginPath();
      const t = (reduce ? 0 : now) / 1000;
      for (let x = 0; x <= w; x += 3) {
        const p = x / w;
        const y = h / 2 + Math.sin(p * 22 + t * 4) * h * .18 * scopeLevel + Math.sin(p * 61 - t * 7) * h * .1 * scopeLevel + (Math.sin(p * 173 + t * 13) * h * .06 * scopeLevel);
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke(); c.shadowBlur = 0;
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  // ---- peek: hover (mouse) or press and hold (touch) opens a sharp lens on the sealed cover ---------------------------------------------
  if (bag) {
    const lens = e => { const r = bag.querySelector('.cd-cover').getBoundingClientRect(); bag.style.setProperty('--lx', `${((e.clientX - r.left) / r.width) * 100}%`); bag.style.setProperty('--ly', `${((e.clientY - r.top) / r.height) * 100}%`); };
    let hold = 0;
    bag.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { bag.classList.add('peek'); lens(e); } });
    bag.addEventListener('pointermove', e => { if (bag.classList.contains('peek')) lens(e); });
    bag.addEventListener('pointerleave', () => { bag.classList.remove('peek'); clearTimeout(hold); });
    bag.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { lens(e); hold = setTimeout(() => bag.classList.add('peek'), 160); } });
    ['pointerup', 'pointercancel'].forEach(t => bag.addEventListener(t, e => { if (e.pointerType !== 'mouse') { clearTimeout(hold); bag.classList.remove('peek'); } }));
    bag.addEventListener('contextmenu', e => e.preventDefault());
    bag.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); bag.style.setProperty('--lx', '50%'); bag.style.setProperty('--ly', '45%'); bag.classList.toggle('peek'); } });
  }

  // ---- calendar and share ------------------------------------------------------------------------------------------------------------
  const title = cd.dataset.title || 'MONOCHROME — launch', url = cd.dataset.url || location.href;
  const icsDate = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const gcal = $('[data-cd-gcal]');
  if (gcal) gcal.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${icsDate(LAUNCH)}/${icsDate(LAUNCH + 36e5)}&details=${encodeURIComponent('Declassification of The Vision Issue. ' + url)}&location=${encodeURIComponent(url)}`;
  const ics = $('[data-cd-ics]');
  if (ics) ics.addEventListener('click', () => {
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MONOCHROME//Countdown//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${LAUNCH}-countdown@${location.host}`, `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(LAUNCH)}`, `DTEND:${icsDate(LAUNCH + 36e5)}`,
      `SUMMARY:${title.replace(/[,;]/g, ' ')}`, `DESCRIPTION:Declassification of The Vision Issue. ${url}`, `URL:${url}`,
      'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:The Vision Issue drops in 15 minutes', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'monochrome-vision-issue.ics';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Calendar file saved');
  });
  const share = $('[data-cd-share]'), toastEl = $('[data-cd-toast]');
  let toastT = 0;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.textContent = ''; }, 2600); }
  if (share) share.addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title, text: 'The Vision Issue is sealed until the clock runs out.', url }); return; } catch { /* closed */ return; } }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
  });

  // ---- pre-order / buy: into the bag without leaving the page (the form still posts to /cart/add without JS) ---------------------------
  const buyForm = $('.cd-buyform');
  if (buyForm) buyForm.addEventListener('submit', async e => {
    const MC = window.MC;
    if (!MC || !MC.cart || !MC.cart.add) return;
    e.preventDefault();
    const btn = buyForm.querySelector('.cd-buy');
    if (!btn || btn.disabled || btn.classList.contains('mc-add-pending')) return;
    btn.classList.add('mc-add-pending');
    try { await MC.cart.add(new FormData(buyForm)); }
    catch { buyForm.submit(); }
    finally { btn.classList.remove('mc-add-pending'); }
  });

  // ---- zero: declassified ---------------------------------------------------------------------------------------------------------------
  function declassify() {
    live = true;
    cd.classList.add('is-live');
    $$('.cd-cta [hidden]').forEach(el => { el.hidden = false; });
    $$('[data-cd-po]').forEach(el => el.remove());
    const btn = $('.cd-buy'), bl = $('[data-cd-buy-l]');
    if (bl && btn && !btn.disabled) bl.textContent = 'Requisition a copy';
    scramble(900);
  }

  tick();
  if (!live || LAUNCH > Date.now()) {
    // align to the second so every flap turns together
    setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));
  }
})();
