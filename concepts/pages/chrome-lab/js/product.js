/* MONOCHROME® — product pages. The page is fully server-rendered (title, price, photos, options, JSON-LD); this makes it live:
   photo gallery (buttons, thumbnails, arrow keys, swipe), option chips that pick the variant, price + availability, and the
   Add to bag link (${storeUrl}/cart/${variantId}:1). A sold-out variant has no buy link at all. */
(() => {
  'use strict';
  const MC = window.MC;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const raw = $('#pdata');
  if (!raw) return;
  let P;
  try { P = JSON.parse(raw.textContent); } catch { return; }

  /* ---------------------------------------------------------------- photos */
  const shots = $$('#shots li'), thumbs = $$('#thumbs button'), counter = $('#shotCount'), stage = $('#stageMain'), strip = $('#thumbs');
  let shot = 0;
  const thumbFade = () => {
    if (!strip) return;
    strip.classList.toggle('more-r', strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 6);
    strip.classList.toggle('more-l', strip.scrollLeft > 6);
  };
  function showShot(i, byUser) {
    const n = shots.length; if (n < 2) return;
    shot = (i + n) % n;
    shots.forEach((li, k) => {
      li.classList.toggle('on', k === shot);
      li.setAttribute('aria-hidden', k === shot ? 'false' : 'true');
      const im = $('img', li);
      if (k === shot && im && im.loading === 'lazy') im.loading = 'eager';
    });
    // warm the neighbours so the next photo is already there
    [shot + 1, shot - 1].forEach(k => { const im = $('img', shots[(k + n) % n]); if (im && im.loading === 'lazy') im.loading = 'eager'; });
    thumbs.forEach((b, k) => { b.classList.toggle('on', k === shot); b.setAttribute('aria-current', k === shot ? 'true' : 'false'); });
    if (counter) counter.textContent = `${MC.pad2(shot + 1)} / ${MC.pad2(n)}`;
    const tb = thumbs[shot];
    if (tb && strip && strip.scrollWidth > strip.clientWidth) {
      const a = tb.getBoundingClientRect(), b = strip.getBoundingClientRect();
      if (a.left < b.left + 8 || a.right > b.right - 8) strip.scrollTo({ left: strip.scrollLeft + (a.left - b.left) - (b.width - a.width) / 2, behavior: MC.reduce ? 'auto' : 'smooth' });
    }
    thumbFade();
    if (byUser) stage.dataset.touched = '1';
  }
  if (shots.length > 1) {
    shots.forEach((li, k) => li.setAttribute('aria-hidden', k === 0 ? 'false' : 'true'));
    $('#shotPrev').addEventListener('click', () => showShot(shot - 1, true));
    $('#shotNext').addEventListener('click', () => showShot(shot + 1, true));
    thumbs.forEach((b, k) => b.addEventListener('click', () => showShot(k, true)));
    if (strip) { strip.addEventListener('scroll', thumbFade, { passive: true }); thumbFade(); }
    // arrow keys step through the photos while focus is on the gallery
    $('#stage').addEventListener('keydown', e => {
      if (e.target.closest('input,select,textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); showShot(shot + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); showShot(shot - 1, true); }
    });
    // swipe / drag
    let x0 = null, y0 = 0, moved = false;
    stage.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; moved = false; });
    stage.addEventListener('pointermove', e => { if (x0 != null && Math.abs(e.clientX - x0) > 10) moved = true; }, { passive: true });
    stage.addEventListener('pointerup', e => {
      if (x0 == null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (moved && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) showShot(shot + (dx < 0 ? 1 : -1), true);
      x0 = null;
    });
    stage.addEventListener('pointercancel', () => { x0 = null; });
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', `Photo gallery, ${shots.length} photos. Use the left and right arrow keys.`);
  }

  /* --------------------------------------------------------------- variants */
  const buy = $('#buy'), sold = $('#sold'), avail = $('#pAvail'), price = $('#pPrice'), barPrice = $('#barPrice');
  const opts = $$('.chip').length ? $('#opts') : null;
  const first = P.variants.find(v => v.available) || P.variants[0];
  let sel = first ? first.options.slice() : [];
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const variantFor = s => P.variants.find(v => same(v.options, s));

  function pick(oi, val) {
    const want = sel.slice(); want[oi] = val;
    if (variantFor(want) && variantFor(want).available) { sel = want; return; }
    // that combination is not for sale: keep the new value and move the other options to the closest variant that is
    let best = null, bs = -1;
    for (const v of P.variants) {
      if (!v.available || v.options[oi] !== val) continue;
      const score = v.options.reduce((n, o, k) => n + (o === sel[k] ? 1 : 0), 0);
      if (score > bs) { bs = score; best = v; }
    }
    if (best) sel = best.options.slice();
  }

  function draw() {
    const v = variantFor(sel);
    const can = !!(v && v.available);
    $$('.chip').forEach(c => {
      const oi = +c.dataset.o, val = c.dataset.v;
      const on = sel[oi] === val;
      // a chip is enabled when picking it leaves a variant that can be bought (the picker moves the other options if it has to)
      const ok = P.variants.some(x => x.available && x.options[oi] === val);
      c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); c.disabled = !ok;
    });
    $$('.opt-name', opts || document).forEach((n, i) => {
      const oi = P.shown[i]; let em = $('em', n);
      if (!em) { em = document.createElement('em'); n.appendChild(em); }
      em.textContent = sel[oi] === undefined ? '' : sel[oi];
    });
    const shown = v ? v.price : first ? first.price : 0;
    if (price) price.textContent = MC.fmt(shown);
    if (barPrice) barPrice.textContent = MC.fmt(shown);
    if (avail) { avail.dataset.state = can ? 'in' : 'out'; $('span', avail).textContent = can ? 'In stock' : 'Sold out'; }
    if (buy) {
      if (can) { buy.href = `${MC.store}/cart/${v.id}:1`; buy.hidden = false; if (sold) sold.hidden = true; }
      else { buy.removeAttribute('href'); buy.hidden = true; if (sold) sold.hidden = false; }
    }
    document.documentElement.dataset.variant = v ? v.id : '';
  }
  if (opts) opts.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c || c.disabled) return;
    pick(+c.dataset.o, c.dataset.v); draw();
  });
  draw();

})();
