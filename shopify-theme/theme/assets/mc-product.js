/* PRODUCT — an asset dossier. The page is server-rendered by Shopify (sections/mc-product.liquid); this adds the gallery stage, the option chips
   (variant -> price, availability, hidden variant id, URL), the quantity stepper, "Requisition: Add to bag" (AJAX into the bag drawer) and
   "Declassify photo". Without JavaScript the form posts to /cart/add and every option is a native <select>. */
(() => {
  'use strict';
  const MC = window.MC, { $, $$, fmt, pad, esc } = MC;
  const dataEl = $('#pdata'); if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const form = $('form.pl-form');

  // ---- gallery stage ------------------------------------------------------------------
  const shots = $$('.shot'), thumbs = $$('.th'), n = shots.length, countEl = $('#shotCount'), strip = $('#thumbs');
  let cur = 0;
  function show(i) {
    if (n < 2) return;
    cur = (i + n) % n;
    shots.forEach((s, k) => s.classList.toggle('on', k === cur));
    thumbs.forEach((t, k) => { const on = k === cur; t.classList.toggle('on', on); t.setAttribute('aria-current', on ? 'true' : 'false'); });
    if (countEl) countEl.textContent = `${pad(cur + 1)} / ${pad(n)}`;
    MC.lensKill();
    // load the neighbours before they are asked for
    [cur - 1, cur + 1].forEach(k => { const im = $('img.ph', shots[(k + n) % n]); if (im) im.loading = 'eager'; });
    const t = thumbs[cur]; if (t && strip) strip.scrollTo({ left: t.offsetLeft - strip.clientWidth / 2 + t.offsetWidth / 2, behavior: MC.reduce ? 'auto' : 'smooth' });
  }
  thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));
  if (n > 1) { const bar = $('.pl-bar'); if (bar) bar.classList.add('multi'); }
  show(0);

  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!shots.length || n < 2 || $('#menu.open') || MC.drawerOpen) return;
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1);
  });

  // swipe the plate (touch and pen; a mouse never swipes). A sideways flick turns the plate; a mostly vertical drag is the page scrolling.
  const stage = $('.stage');
  let sx = null, sy = 0;
  if (stage) {
    stage.addEventListener('pointerdown', e => { sx = e.pointerType === 'mouse' ? null : e.clientX; sy = e.clientY; });
    stage.addEventListener('pointerup', e => {
      const dx = e.clientX - sx;
      if (sx != null && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - sy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
      sx = null;
    });
    stage.addEventListener('pointercancel', () => { sx = null; });
  }

  // ---- variants -----------------------------------------------------------------------
  const sel = data.sel.slice();
  let chosen = !!data.chosen; // until the shopper picks something, a ranged price keeps its "From"
  const variantFor = () => data.variants.find(v => v.o.length === sel.length && v.o.every((o, i) => o === sel[i]));
  const idInput = $('#variantId'), buy = $('#buy'), buyT = $('#buyT'), priceEl = $('#price'), stockEl = $('#stock'), stampEl = $('#stamp'), alertLink = $('#alertLink'), pay = $('.pl-pay');
  function sync() {
    const v = variantFor();
    $$('.chip').forEach(ch => {
      const oi = +ch.dataset.o, val = ch.dataset.v, on = sel[oi] === val;
      const ok = data.variants.some(x => x.a && x.o[oi] === val); // a chip is disabled only when nothing with that value is left
      ch.classList.toggle('on', on); ch.setAttribute('aria-pressed', String(on)); ch.disabled = !ok;
    });
    $$('fieldset.opt').forEach(fs => { const b = $('legend b', fs); if (b) b.textContent = sel[+fs.dataset.o] || ''; });
    const can = !!(v && v.a);
    if (idInput && v) idInput.value = v.id;
    if (buy) { buy.disabled = !can; buy.setAttribute('aria-disabled', String(!can)); if (buyT) buyT.textContent = can ? 'Requisition: Add to bag' : 'Requisition denied: sold out'; }
    if (alertLink) alertLink.hidden = can;
    if (pay) pay.hidden = !can;
    if (priceEl) priceEl.innerHTML = `${esc(data.range && !chosen ? 'From ' + fmt(data.min) : fmt(v ? v.p : data.min))}<small>CAD</small>`;
    if (stockEl && data.variants.some(x => x.a)) {
      stockEl.classList.toggle('out', !can); stockEl.classList.toggle('in', can);
      $('span', stockEl).textContent = can ? 'In stock' : 'Sold out';
      if (stampEl) { stampEl.classList.toggle('ok', can); stampEl.classList.toggle('oos', !can); stampEl.textContent = can ? 'Approved for field use' : 'Out of stock'; }
    }
    if (chosen && v) {
      try { history.replaceState(null, '', `${location.pathname}?variant=${v.id}`); } catch { /* sandboxed */ }
      if (v.i >= 0 && v.i < n) show(v.i);
    }
  }
  // picking a value keeps the other choices when that variant exists and is in stock; otherwise the other choices
  // move to the nearest variant that is, so every variant that is in stock can be reached
  function choose(oi, val) {
    const next = sel.slice(); next[oi] = val;
    const exact = data.variants.find(x => x.o.every((o, i) => o === next[i]));
    if (!exact || !exact.a) {
      let best = null, bs = -1;
      for (const x of data.variants) {
        if (!x.a || x.o[oi] !== val) continue;
        const score = x.o.reduce((k, o, i) => k + (i !== oi && o === sel[i] ? 1 : 0), 0);
        if (score > bs) { bs = score; best = x; }
      }
      if (best) next.splice(0, next.length, ...best.o);
    }
    sel.splice(0, sel.length, ...next);
  }
  $$('.chip').forEach(ch => ch.addEventListener('click', () => {
    if (ch.disabled) return;
    choose(+ch.dataset.o, ch.dataset.v); chosen = true; sync();
  }));
  sync();

  // ---- quantity + add to bag -----------------------------------------------------------------------------
  $$('[data-pq]').forEach(b => b.addEventListener('click', () => {
    const inp = $('input[name=quantity]', form); if (!inp) return;
    inp.value = Math.max(1, (+inp.value || 1) + (+b.dataset.pq));
  }));
  if (form) form.addEventListener('submit', async e => {
    if (!MC.cart || !window.fetch) return; // no bag script: the form posts normally and lands on the cart page
    e.preventDefault();
    if (!buy || buy.disabled || buy.classList.contains('mc-add-pending')) return;
    const err = $('.pl-err', form); if (err) err.hidden = true;
    buy.classList.add('mc-add-pending');
    try { await MC.cart.add(new FormData(form)); }
    catch (er) {
      if (er && er.status) { if (err) { err.textContent = er.message; err.hidden = false; } } // Shopify said no (sold out, not enough stock)
      else form.submit(); // network trouble: let the browser post it
    } finally { buy.classList.remove('mc-add-pending'); }
  });

  // phones: the buy bar pins to the bottom of the screen once the visitor has started scrolling
  // (at rest it stays in the flow, so nothing floats over the caption)
  const rootEl = document.documentElement;
  let pinRaf = 0;
  const pinCheck = () => { pinRaf = 0; rootEl.classList.toggle('buy-pin', scrollY > 90); };
  addEventListener('scroll', () => { if (!pinRaf) pinRaf = requestAnimationFrame(pinCheck); }, { passive: true });
  pinCheck();

  // ---- Declassify photo: the keyboard- and touch-friendly twin of the lens -------------------------
  const dev = $('#dev'), devT = $('#devT');
  if (dev) dev.addEventListener('click', () => {
    const on = dev.getAttribute('aria-pressed') !== 'true';
    dev.setAttribute('aria-pressed', String(on));
    if (devT) devT.textContent = on ? 'Re-classify photo' : 'Declassify photo';
    $$('.shot .xp').forEach(x => x.classList.toggle('dev', on));
    MC.lensKill();
  });
})();
