/* MONOCHROME® home page behaviour (a work of fiction, see the footer). Loaded once, by layout/theme.liquid on the home template.
   - Cover photo stack [data-hs]: drag or swipe the top print away (it slides under the pile), or use the arrows / arrow keys.
   - Lookbook film [data-film]: drifts slowly in a loop, drags sideways with a mouse, swipes natively on touch; stops for hover, focus,
     touch and the Pause button, and never drifts with reduced motion.
   - Magazine cover [data-hm-tilt]: tilts towards the pointer with a glare (fine pointers only, no reduced motion). Its own hook, so
     core.js's [data-tilt] (the about page's pinned prints) never tilts it a second time.
   Everything here only enhances server-rendered links and forms: without it the page still works. */
(() => {
  'use strict';
  if (window.__mcHome) return;
  window.__mcHome = true;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pad = n => String(n).padStart(2, '0');

  // ---- cover: the photo stack ------------------------------------------------------------------------------------------
  function stack(root) {
    const pile = $('[data-hs-pile]', root), cards = $$('.hs-card', root);
    const ctl = $('[data-hs-ctl]', root);
    if (!pile || cards.length < 2 || !ctl) return;
    const num = $('[data-hs-i]', root), live = $('[data-hs-live]', root);
    const T = reduce ? 0 : 340;
    let order = cards.slice(), busy = false, drag = null, dragged = false, touched = false;
    root.classList.add('on');
    ctl.hidden = false;

    function paint(announce) {
      // a print that goes under the pile leaves the tab order; if it had focus, the new top print takes it
      const had = pile.contains(document.activeElement);
      order.forEach((c, i) => {
        c.dataset.pos = i;
        const a = $('.hs-a', c);
        if (i === 0) { a.removeAttribute('tabindex'); a.removeAttribute('aria-hidden'); }
        else { a.tabIndex = -1; a.setAttribute('aria-hidden', 'true'); }
      });
      if (had) { const a = $('.hs-a', order[0]); if (a && document.activeElement !== a) a.focus({ preventScroll: true }); }
      const at = cards.indexOf(order[0]) + 1;
      if (num) num.textContent = pad(at);
      if (announce && live) {
        const txt = s => { const e = $(s, order[0]); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
        live.textContent = `${at} of ${cards.length}: ${txt('.hs-cap b')}, ${txt('.hs-pr')}`;
      }
    }
    function settle(c) { c.style.removeProperty('--dx'); c.style.removeProperty('--dr'); }
    // the top print flies off to one side, then slides back in under the pile
    function next(dir = 1, announce = true) {
      if (busy) return;
      busy = true; touched = true;
      const c = order[0];
      c.style.setProperty('--fx', dir > 0 ? '118%' : '-118%');
      c.style.setProperty('--fr', dir > 0 ? '15deg' : '-15deg');
      c.classList.remove('drag', 'nudge');
      c.classList.add('fly');
      setTimeout(() => {
        order.push(order.shift());
        settle(c);
        c.classList.remove('fly');
        paint(announce);
        setTimeout(() => { busy = false; }, T * 0.6);
      }, T);
    }
    // the bottom print comes back on top from the left
    function prev() {
      if (busy) return;
      busy = true; touched = true;
      const c = order[order.length - 1];
      c.style.transition = 'none';
      c.style.setProperty('--fx', '-118%');
      c.style.setProperty('--fr', '-15deg');
      c.classList.add('fly');
      order.unshift(order.pop());
      paint(true);
      void c.offsetWidth;
      c.style.transition = '';
      c.classList.remove('fly');
      setTimeout(() => { busy = false; }, T);
    }
    $('[data-hs-next]', root).addEventListener('click', () => next(1));
    $('[data-hs-prev]', root).addEventListener('click', prev);
    root.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    // drag / swipe the top print: horizontal moves only, vertical moves stay a page scroll (touch-action: pan-y)
    pile.addEventListener('pointerdown', e => {
      const c = order[0];
      if (busy || (e.pointerType === 'mouse' && e.button !== 0) || !c.contains(e.target)) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, t: performance.now(), c };
      dragged = false;
    });
    pile.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.moved = true;
        try { drag.c.setPointerCapture(e.pointerId); } catch (x) { /* not capturable */ }
        drag.c.classList.remove('nudge');
        drag.c.classList.add('drag');
      }
      drag.dx = dx;
      drag.c.style.setProperty('--dx', dx + 'px');
      drag.c.style.setProperty('--dr', (dx * 0.045).toFixed(2) + 'deg');
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      dragged = true;
      setTimeout(() => { dragged = false; }, 60);
      const w = d.c.offsetWidth || 300, v = Math.abs(d.dx || 0) / Math.max(1, performance.now() - d.t);
      if (Math.abs(d.dx || 0) > Math.min(110, w * 0.28) || (v > 0.6 && Math.abs(d.dx) > 30)) next(d.dx > 0 ? 1 : -1);
      else { d.c.classList.remove('drag'); settle(d.c); }
    };
    pile.addEventListener('pointerup', end);
    pile.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) { drag.c.classList.remove('drag'); settle(drag.c); drag = null; } });
    // a drag is not a click on the link underneath
    pile.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    pile.addEventListener('dragstart', e => e.preventDefault());

    paint(false);
    // once, when the stack first comes into view: the top print wiggles to say it moves
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => {
        if (!es.some(x => x.isIntersecting)) return;
        io.disconnect();
        setTimeout(() => { if (!touched && !busy && !drag) { const c = order[0]; c.classList.add('nudge'); setTimeout(() => c.classList.remove('nudge'), 1300); } }, 1700);
      }, { threshold: 0.6 });
      io.observe(pile);
    }
  }

  // ---- lookbook: the film strip ----------------------------------------------------------------------------------------
  function film(root) {
    const row = $('[data-film-row]', root);
    if (!row) return;
    const frames = $$('.hl-fr', row);
    if (frames.length < 2) return;
    const section = root.closest('section') || root;
    const btn = $('[data-film-toggle]', section);
    const drift = !reduce;
    const SPEED = 0.028; // px per ms
    let grab = null, moved = false, firstClone = null;
    let pos = 0, mine = -1, raf = 0, last = 0, playing = true, over = false, inView = false, until = 0;
    const hold = ms => { until = performance.now() + ms; };
    const span = () => (firstClone ? firstClone.offsetLeft - frames[0].offsetLeft : 0);
    root.classList.add('on');
    if (drift) {
      root.classList.add('drift');
      // one copy of the frames follows the originals, so the roll loops without a seam
      frames.forEach(f => {
        const c = f.cloneNode(true);
        c.classList.add('hl-clone');
        c.setAttribute('aria-hidden', 'true');
        c.removeAttribute('data-shopify-editor-block');
        c.inert = true;
        $$('a', c).forEach(a => { a.tabIndex = -1; });
        row.append(c);
      });
      firstClone = $('.hl-clone', row);
    }

    // mouse drag (touch keeps its native swipe)
    row.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') { hold(3500); return; }
      if (e.button !== 0) return;
      grab = { x: e.clientX, s: row.scrollLeft, id: e.pointerId };
      moved = false;
    });
    row.addEventListener('pointermove', e => {
      if (!grab || e.pointerId !== grab.id) return;
      const dx = e.clientX - grab.x;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) { moved = true; root.classList.add('grabbing'); try { row.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } }
      row.scrollLeft = grab.s - dx;
    });
    const release = () => { if (!grab) return; grab = null; root.classList.remove('grabbing'); hold(1800); };
    row.addEventListener('pointerup', release);
    row.addEventListener('pointercancel', release);
    row.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    row.addEventListener('dragstart', e => e.preventDefault());
    if (!drift) return; // reduced motion: a plain strip you scroll or drag

    const running = () => playing && !over && !grab && !document.hidden && performance.now() > until;
    function tick(now) {
      raf = 0;
      const dt = Math.min(250, now - (last || now));
      last = now;
      if (running()) {
        const w = span();
        pos += dt * SPEED;
        if (w > 0 && pos >= w) pos -= w;
        row.scrollLeft = pos;
        mine = row.scrollLeft;
      }
      if (inView) raf = requestAnimationFrame(tick);
    }
    const start = () => { if (!raf && inView) { last = 0; raf = requestAnimationFrame(tick); } };
    // the visitor scrolled (wheel, swipe, keys, drag): follow them, wrap at the seams, pause a moment
    row.addEventListener('scroll', () => {
      const s = row.scrollLeft;
      if (Math.abs(s - mine) < 2) return;
      const w = span();
      let to = s;
      if (w > 0 && s >= w) to = s - w;
      else if (w > 0 && s <= 0) to = w;
      if (to !== s) { row.scrollLeft = to; if (grab) grab.s += to - s; }
      pos = row.scrollLeft;
      mine = pos;
      hold(2600);
    }, { passive: true });
    row.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') over = true; });
    row.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') over = false; });
    row.addEventListener('focusin', () => { over = true; });
    row.addEventListener('focusout', () => { over = false; });
    if (btn) {
      btn.hidden = false;
      // a toggle: the name stays "Pause…", aria-pressed says whether it is paused
      btn.addEventListener('click', () => {
        playing = !playing;
        btn.setAttribute('aria-pressed', String(!playing));
        if (playing) { pos = row.scrollLeft; until = 0; start(); }
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { inView = es.some(x => x.isIntersecting); if (inView) start(); }, { rootMargin: '80px 0px' }).observe(row);
    } else { inView = true; start(); }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  }

  // ---- magazine: the cover tilts towards the pointer -----------------------------------------------------------------------
  function tilt(el) {
    if (reduce || !fine) return;
    const box = $('.hm-tilt', el) || el;
    let raf = 0, px = 0.5, py = 0.5;
    const paint = () => {
      raf = 0;
      box.style.setProperty('--tx', ((px - 0.5) * 16).toFixed(2) + 'deg');
      box.style.setProperty('--ty', ((0.5 - py) * 12).toFixed(2) + 'deg');
      box.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      box.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    };
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.classList.add('tilting');
      if (!raf) raf = requestAnimationFrame(paint);
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('tilting');
      ['--tx', '--ty', '--gx', '--gy'].forEach(p => box.style.removeProperty(p));
    });
  }

  const boot = () => {
    $$('[data-hs]').forEach(stack);
    $$('[data-film]').forEach(film);
    $$('[data-hm-tilt]').forEach(tilt);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
