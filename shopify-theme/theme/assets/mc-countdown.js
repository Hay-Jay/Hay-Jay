/* COUNTDOWN — the priority transmission (sections/mc-countdown.liquid). Split-flap T-minus clock, decryption bar and cover blur that
   clear as the launch nears, press-and-hold peek, decrypting headline, intercepted-transmissions log, launch times in other cities,
   add-to-calendar, share, pre-order, and the declassification at zero.
   The server renders the real remaining time, so the page reads right before this runs and without it. In the theme editor the
   section is re-initialised on shopify:section:load. A visitor can pause the motion (stored); reduced motion is honoured. */
(() => {
  'use strict';
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let stop = null;
  const boot = root => {
    const cd = root && (root.id === 'cd' ? root : root.querySelector && root.querySelector('#cd'));
    if (!cd) return;
    if (stop) stop();
    stop = init(cd);
  };
  boot(document);
  document.addEventListener('shopify:section:load', e => boot(e.target));
  document.addEventListener('shopify:section:unload', e => { if (stop && e.target.querySelector && e.target.querySelector('#cd')) { stop(); stop = null; } });

  function init(cd) {
    const $ = (s, r = cd) => r.querySelector(s), $$ = (s, r = cd) => [...r.querySelectorAll(s)];
    const pad = n => String(n).padStart(2, '0');
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

    // ---- housekeeping: everything started here is stopped by the returned function -----------------------------------------
    let alive = true;
    const timers = new Set(), offs = [];
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
    const on = (el, type, fn, opt) => { if (!el) return; el.addEventListener(type, fn, opt); offs.push(() => el.removeEventListener(type, fn, opt)); };

    // ---- motion: off with reduced motion, or when the visitor pauses it -------------------------------------------------------
    let still = false;
    try { still = localStorage.getItem('mc-cd-still') === '1'; } catch { /* storage blocked */ }
    const calm = () => mq.matches || still;
    const stillBtn = $('[data-cd-still]');
    const applyStill = () => {
      cd.classList.toggle('is-still', still);
      if (stillBtn) { stillBtn.setAttribute('aria-pressed', String(still)); const l = stillBtn.querySelector('[data-l]'); if (l) l.textContent = still ? 'Resume motion' : 'Pause motion'; }
    };
    applyStill();
    on(stillBtn, 'click', () => {
      still = !still;
      try { localStorage.setItem('mc-cd-still', still ? '1' : '0'); } catch { /* fine */ }
      applyStill(); motionChanged();
    });
    on(mq, 'change', () => motionChanged());

    // ---- time: the server's epoch is the source of truth; the visitor's clock is corrected if it is far off ------------------
    const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n * 1000 : NaN; };
    const LAUNCH = num(cd.dataset.launchS) || Date.parse(cd.dataset.launch);
    const START = num(cd.dataset.startS) || Date.parse(cd.dataset.start);
    const hasLaunch = Number.isFinite(LAUNCH);
    let skew = 0;
    const now = () => Date.now() + skew;
    if (hasLaunch && window.fetch) {
      fetch(location.pathname, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' }).then(r => {
        const d = Date.parse(r.headers.get('date') || '');
        if (Number.isFinite(d) && Math.abs(d + 500 - Date.now()) > 5000) { skew = d + 500 - Date.now(); if (alive) tick(); }
      }).catch(() => { /* keep the local clock */ });
    }

    // ---- split-flap digits -------------------------------------------------------------------------------------------------
    const flaps = {};
    $$('.cd-u').forEach(u => { flaps[u.dataset.u] = $$('.fd', u); });
    function setDigit(fd, v) {
      const old = fd.dataset.v;
      if (old === v) return;
      const [t, b, ft, fb] = fd.children;
      fd.dataset.v = v;
      if (old === undefined || calm()) { t.textContent = b.textContent = ft.textContent = fb.textContent = v; return; }
      t.textContent = v; ft.textContent = old; fb.textContent = v; b.textContent = old;
      fd.classList.remove('go'); void fd.offsetWidth; fd.classList.add('go');
      clearTimeout(fd._t); fd._t = setTimeout(() => { b.textContent = v; ft.textContent = v; fd.classList.remove('go'); }, 660);
    }
    function setUnit(k, n) {
      const list = flaps[k];
      if (!list || !list.length) return;
      const s = pad(n);
      while (list.length < s.length) {   // more than 99 days: a third flap
        const c = list[0].cloneNode(true); c.removeAttribute('data-v'); c.classList.remove('go');
        list[0].before(c); list.unshift(c);
      }
      list.forEach((fd, i) => setDigit(fd, s.padStart(list.length, '0')[i]));
    }

    // ---- the clock ----------------------------------------------------------------------------------------------------------
    const bar = $('[data-cd-bar]'), pct = $('[data-cd-pct]'), sr = $('[data-cd-sr]'), say = $('[data-cd-say]'), utc = $('[data-cd-utc]'), bag = $('[data-cd-bag]');
    let live = cd.classList.contains('is-live'), lastMin = -1, said = null;
    const MILESTONES = [86400, 43200, 21600, 10800, 3600, 1800, 600, 300, 60, 10];
    const phrase = total => {
      if (total <= 0) return 'The issue is declassified.';
      if (total < 60) return 'Less than a minute until the launch.';
      const d = Math.floor(total / 86400), h = Math.floor(total / 3600) % 24, m = Math.floor(total / 60) % 60;
      const parts = [d && plural(d, 'day'), h && plural(h, 'hour'), m && plural(m, 'minute')].filter(Boolean);
      return `${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]} until the launch.`;
    };
    function tick() {
      const t = now();
      const total = hasLaunch ? Math.max(0, Math.ceil((LAUNCH - t) / 1000)) : 0;
      // whole seconds, rounded up: the clock reads zero on the same tick that declassifies
      setUnit('d', Math.floor(total / 86400)); setUnit('h', Math.floor(total / 3600) % 24); setUnit('m', Math.floor(total / 60) % 60); setUnit('s', total % 60);
      // the readable sentence stays current (once a minute); the announcement speaks only at milestones
      const minute = Math.ceil(total / 60);
      if (sr && minute !== lastMin) { lastMin = minute; sr.textContent = phrase(total); }
      const ms = MILESTONES.find(x => total <= x && total > x - 1);
      if (say && ms && said !== ms) { said = ms; say.textContent = phrase(total); }
      const k = total === 0 ? 1 : (Number.isFinite(START) && LAUNCH > START ? Math.min(1, Math.max(0, (t - START) / (LAUNCH - START))) : 0);
      const p = `${Math.floor(k * 100)}%`;
      if (pct && pct.textContent !== p) { pct.textContent = p; if (bar) bar.style.width = `${(k * 100).toFixed(1)}%`; }
      if (bag) bag.style.setProperty('--blur', `${(16 - 13 * k).toFixed(1)}px`);
      if (utc) { const n = new Date(t); utc.textContent = `UTC ${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}:${pad(n.getUTCSeconds())}`; }
      scopeLevel = .25 + k * .75;
      if (hasLaunch && total === 0 && !live) declassify();
    }
    // re-aligned to the second on every tick, so a sleeping laptop or a background tab catches up on its own
    const loop = () => { tick(); later(loop, 1015 - (now() % 1000)); };
    on(document, 'visibilitychange', () => { if (!document.hidden) tick(); });

    // ---- launch moment in the visitor's time and in the listed cities --------------------------------------------------------
    if (hasLaunch) {
      const when = new Date(LAUNCH);
      const local = $('[data-cd-local]');
      try {
        if (local) {
          const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(when);
          const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(when);
          local.textContent = `${day}, `;
          const nb = document.createElement('span'); nb.className = 'nb'; nb.textContent = `${time} your time`; local.append(nb);
        }
      } catch { /* keep the server text */ }
      $$('[data-cd-cities] [data-tz]').forEach(span => {
        const b = span.querySelector('b');
        try { if (b) b.textContent = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: span.dataset.tz }).format(when); }
        catch { console.warn('Countdown: unknown time zone', span.dataset.tz); }
      });
    }

    // ---- the headline decrypts itself, then glitches now and then --------------------------------------------------------------
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
      if (calm() || !cells.length) return;
      const t0 = performance.now(), idx = only || cells.map((_, i) => i), n = cells.length;
      const step = ts => {
        if (!alive) return;
        const k = Math.min(1, (ts - t0) / dur);
        for (const i of idx) {
          const c = cells[i];
          if (k >= (only ? 0 : i / n) * .7 + .3) c.classList.remove('gl');
          else { c.dataset.g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; c.classList.add('gl'); }
        }
        if (k < 1) requestAnimationFrame(step); else for (const i of idx) cells[i].classList.remove('gl');
      };
      requestAnimationFrame(step);
    }
    const glitch = () => {
      if (!document.hidden && onScreen) scramble(380, Array.from({ length: 3 }, () => Math.floor(Math.random() * cells.length)));
      later(glitch, 7000);
    };

    // ---- intercepted transmissions: lines type out one after another, then the log rolls over ---------------------------------
    // Every line keeps its full text in place (the untyped part is transparent), so the log never changes height.
    const log = $('[data-cd-log]');
    const items = log ? $$('li', log) : [];
    const stamp = () => { const n = new Date(now()); return `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`; };
    let logI = 0, logRun = 0;
    const fill = (li, n) => {
      const tx = li.querySelector('.tx'), text = li.dataset.line || '';
      if (!tx) return;
      if (n >= text.length) { tx.textContent = text; return; }
      const cur = document.createElement('i'); cur.className = 'cur';
      const rest = document.createElement('span'); rest.className = 'rest'; rest.textContent = text.slice(n);
      tx.replaceChildren(document.createTextNode(text.slice(0, n)), cur, rest);
    };
    function runLog() {
      const run = ++logRun;
      if (!items.length) return;
      if (calm()) {   // everything at once, nothing moving
        items.forEach(li => { const ts = li.querySelector('.ts'); if (ts && ts.textContent.includes('-')) ts.textContent = stamp(); fill(li, Infinity); li.classList.add('on'); });
        return;
      }
      const show = () => {
        if (run !== logRun) return;
        if (logI >= items.length) { items.forEach(li => li.classList.remove('on')); logI = 0; }
        const li = items[logI], text = li.dataset.line || '', ts = li.querySelector('.ts');
        if (ts) ts.textContent = stamp();
        fill(li, 0); li.classList.add('on');
        let n = 0;
        const typeIt = () => {
          if (run !== logRun) return;
          n++; fill(li, n);
          if (n < text.length) later(typeIt, 22 + Math.random() * 30); else { logI++; later(show, logI >= items.length ? 4200 : 1700); }
        };
        typeIt();
      };
      show();
    }

    // ---- the oscilloscope: the signal grows as the launch nears (drawn only while on screen) ------------------------------------
    let scopeLevel = .3, raf = 0, lastDraw = 0, onScreen = true;
    const cv = $('[data-cd-scope]'), c2 = cv && cv.getContext ? cv.getContext('2d') : null;
    const size = () => {
      if (!cv) return;
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    };
    function draw(ts = 0) {
      raf = 0;
      if (!c2 || !alive) return;
      const w = cv.width, h = cv.height, dpr = Math.min(2, window.devicePixelRatio || 1);
      c2.clearRect(0, 0, w, h);
      c2.strokeStyle = 'rgba(255,255,255,.14)'; c2.lineWidth = dpr;
      const gx = Math.max(24, Math.round(45 * dpr));
      c2.beginPath();
      for (let x = 0; x <= w; x += gx) { c2.moveTo(x + .5, 0); c2.lineTo(x + .5, h); }
      c2.moveTo(0, h / 2); c2.lineTo(w, h / 2); c2.stroke();
      const t = (calm() ? 0 : ts) / 1000, pts = [];
      for (let x = 0; x <= w; x += 3 * dpr) {
        const p = x / w;
        pts.push([x, h / 2 + Math.sin(p * 22 + t * 4) * h * .18 * scopeLevel + Math.sin(p * 61 - t * 7) * h * .1 * scopeLevel + Math.sin(p * 173 + t * 13) * h * .06 * scopeLevel]);
      }
      // a wide faint stroke under the line instead of shadowBlur
      for (const [lw, col] of [[6 * dpr, 'rgba(255,255,255,.14)'], [2 * dpr, '#ececec']]) {
        c2.strokeStyle = col; c2.lineWidth = lw; c2.beginPath();
        pts.forEach(([x, y], i) => (i ? c2.lineTo(x, y) : c2.moveTo(x, y)));
        c2.stroke();
      }
      lastDraw = ts;
      scheduleDraw();
    }
    function scheduleDraw() {
      if (!c2 || raf || !alive || calm() || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(ts => { if (ts - lastDraw < 33) { raf = 0; raf = requestAnimationFrame(draw); } else draw(ts); });   // about 30 fps
    }

    // ---- the orbit (SVG animation) and the CSS animations rest when off screen, hidden or paused --------------------------------
    const orbit = $('.cd-orbit');
    const syncMotion = () => {
      const run = !calm() && onScreen && !document.hidden;
      cd.classList.toggle('cd-off', !onScreen);
      if (orbit && orbit.pauseAnimations) run ? orbit.unpauseAnimations() : orbit.pauseAnimations();
      if (run) scheduleDraw(); else if (c2 && !raf) draw(0);
    };
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); syncMotion(); }, { rootMargin: '80px' });
      io.observe($('.cd-grid') || cd);
    }
    let ro = null;
    if (cv && 'ResizeObserver' in window) { ro = new ResizeObserver(() => { size(); if (!raf) draw(lastDraw); }); ro.observe(cv); }
    on(document, 'visibilitychange', syncMotion);
    function motionChanged() {
      syncMotion();
      runLog();
      $$('.fd.go').forEach(fd => fd.classList.remove('go'));
      if (calm()) cells.forEach(c => c.classList.remove('gl'));
    }

    // ---- peek: hover (mouse), press and hold (touch) or Enter (keyboard) opens a sharp lens on the sealed cover ----------------------
    if (bag) {
      const setPeek = v => { bag.classList.toggle('peek', v); bag.setAttribute('aria-pressed', String(v)); };
      const lens = e => { const r = bag.querySelector('.cd-cover').getBoundingClientRect(); bag.style.setProperty('--lx', `${((e.clientX - r.left) / r.width) * 100}%`); bag.style.setProperty('--ly', `${((e.clientY - r.top) / r.height) * 100}%`); };
      let hold = 0;
      // the sharp copy is the same file as the blurred one (same srcset), so the first peek never shows an empty lens
      on(bag, 'pointerenter', e => { if (e.pointerType === 'mouse') { setPeek(true); lens(e); } });
      on(bag, 'pointermove', e => { if (bag.classList.contains('peek')) lens(e); });
      on(bag, 'pointerleave', () => { setPeek(false); clearTimeout(hold); });
      on(bag, 'pointerdown', e => { if (e.pointerType !== 'mouse') { lens(e); hold = setTimeout(() => setPeek(true), 160); } });
      ['pointerup', 'pointercancel'].forEach(t => on(bag, t, e => { if (e.pointerType !== 'mouse') { clearTimeout(hold); setPeek(false); } }));
      on(bag, 'contextmenu', e => e.preventDefault());
      on(bag, 'keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); bag.style.setProperty('--lx', '50%'); bag.style.setProperty('--ly', '45%'); setPeek(!bag.classList.contains('peek')); }
        else if (e.key === 'Escape') setPeek(false);
      });
      on(bag, 'blur', () => setPeek(false));
      offs.push(() => clearTimeout(hold));
    }

    // ---- calendar and share --------------------------------------------------------------------------------------------------
    const title = cd.dataset.title || 'MONOCHROME — launch', url = cd.dataset.url || location.href;
    const icsDate = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/[;,]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
    // RFC 5545: lines longer than 75 octets fold onto continuation lines that start with a space
    const fold = line => {
      const out = []; let cur = '', bytes = 0;
      for (const ch of line) {
        const b = new TextEncoder().encode(ch).length;
        if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
        cur += ch; bytes += b;
      }
      out.push(cur);
      return out.join('\r\n ');
    };
    const gcal = $('[data-cd-gcal]');
    if (gcal && hasLaunch) gcal.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${icsDate(LAUNCH)}/${icsDate(LAUNCH + 36e5)}&details=${encodeURIComponent('Declassification of The Vision Issue. ' + url)}&location=${encodeURIComponent(url)}`;
    const toastEl = $('[data-cd-toast]');
    let toastT = 0;
    function toast(msg, ms = 2600) { if (!toastEl) return; toastEl.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.textContent = ''; }, ms); }
    offs.push(() => clearTimeout(toastT));
    on($('[data-cd-ics]'), 'click', () => {
      if (!hasLaunch) return;
      const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MONOCHROME//Countdown//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
        `UID:${LAUNCH}-countdown@${location.host}`, `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(LAUNCH)}`, `DTEND:${icsDate(LAUNCH + 36e5)}`,
        `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText('Declassification of The Vision Issue. ' + url)}`, `URL:${url}`,
        'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:The Vision Issue drops in 15 minutes', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR']
        .map(fold).join('\r\n') + '\r\n';
      const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (ios) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body); return; }   // iOS opens it in Calendar
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' })); a.download = 'monochrome-vision-issue.ics';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 40000);
      toast('Calendar file ready. Open it to add the event.');
    });
    on($('[data-cd-share]'), 'click', async () => {
      const text = live ? 'The Vision Issue is out.' : 'The Vision Issue is sealed until the clock runs out.';
      if (navigator.share) {
        try { await navigator.share({ title, text, url }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }   // closed by the visitor; anything else falls through to copying
      }
      try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url, 12000); }
    });

    // ---- pre-order / buy: into the bag without leaving the page (the form still posts to /cart/add without JS) ---------------------
    const buyForm = $('.cd-buyform');
    on(buyForm, 'submit', async e => {
      const MC = window.MC;
      if (!MC || !MC.cart || !MC.cart.add) return;
      e.preventDefault();
      const btn = buyForm.querySelector('.cd-buy');
      if (!btn || btn.disabled || btn.classList.contains('mc-add-pending')) return;
      btn.classList.add('mc-add-pending');
      try { await MC.cart.add(new FormData(buyForm)); }
      catch (er) { if (er && er.status) toast(er.message || 'This copy is not available right now.', 6000); else buyForm.submit(); }   // Shopify said no: say why; offline: post the form
      finally { btn.classList.remove('mc-add-pending'); }
    });

    // ---- after a signup the confirmation (or the error) gets focus, so it is heard ---------------------------------------------
    const ok = $('.cd-ok'), err = $('#cd-signal-email[aria-invalid="true"]');
    if (ok) { ok.focus({ preventScroll: true }); ok.scrollIntoView({ block: 'center' }); }
    else if (err && /customer_posted|contact_posted|#cd-signal/.test(location.href)) err.focus();

    // ---- zero: declassified ------------------------------------------------------------------------------------------------
    function declassify() {
      live = true;
      cd.classList.add('is-live');
      $$('.cd-cta [hidden]').forEach(el => { el.hidden = false; });
      $$('[data-cd-po]').forEach(el => el.remove());
      const btn = $('.cd-buy'), bl = $('[data-cd-buy-l]');
      if (bl && btn && !btn.disabled) bl.textContent = 'Requisition a copy';
      $$('[data-live]').forEach(el => { el.textContent = el.dataset.live; });
      if (say) say.textContent = 'The issue is declassified.';
      scramble(900);
    }

    // ---- go ---------------------------------------------------------------------------------------------------------------
    cd.classList.add('cd-ready');
    size();
    loop();
    scramble(1600);
    if (cells.length) later(glitch, 7000);
    runLog();
    syncMotion();
    if (c2) draw(0);

    return () => {
      alive = false; logRun++;
      timers.forEach(clearTimeout); timers.clear();
      if (raf) cancelAnimationFrame(raf);
      offs.forEach(f => f()); offs.length = 0;
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      $$('.fd').forEach(fd => clearTimeout(fd._t));
    };
  }
})();
