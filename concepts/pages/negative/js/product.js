/* PRODUCT — a plate. The page is server-rendered; this adds the gallery stage, the option chips
   (variant -> price, availability, cart permalink) and "Develop colour". */
(() => {
  'use strict';
  const MC = window.MC, { $, $$, fmt, pad, esc } = MC;
  const dataEl = $('#pdata'); if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const STORE = MC.store || data.store;

  // ---- variants ---------------------------------------------------------------------
  const sel = data.sel.slice();
  let chosen = false; // until the shopper picks something, a ranged price keeps its "From"
  const variantFor = () => data.variants.find(v => v.o.length === sel.length && v.o.every((o, i) => o === sel[i]));
  const buy = $('#buy'), buyT = $('#buyT'), priceEl = $('#price'), stockEl = $('#stock');
  function sync() {
    const v = variantFor();
    $$('.chip').forEach(ch => {
      const oi = +ch.dataset.o, val = ch.dataset.v, on = sel[oi] === val;
      const ok = data.variants.some(x => x.a && x.o[oi] === val && x.o.every((ov, k) => k === oi || ov === sel[k]));
      ch.classList.toggle('on', on); ch.setAttribute('aria-pressed', String(on)); ch.disabled = !ok;
    });
    $$('fieldset.opt').forEach(fs => { const b = $('legend b', fs); if (b) b.textContent = sel[+fs.dataset.o] || ''; });
    const can = !!(v && v.a);
    if (buy && buy.tagName === 'A') {
      if (can) { buy.href = `${STORE}/cart/${v.id}:1`; buy.removeAttribute('aria-disabled'); buyT.textContent = 'Add to bag'; }
      else { buy.removeAttribute('href'); buy.setAttribute('aria-disabled', 'true'); buyT.textContent = 'Sold out'; }
    }
    if (priceEl) priceEl.innerHTML = `${esc(data.range && !chosen ? 'From ' + fmt(data.min) : fmt(v ? v.p : data.min))}<small>CAD</small>`;
    if (stockEl && data.variants.some(x => x.a)) {
      stockEl.classList.toggle('out', !can); stockEl.classList.toggle('in', can);
      $('span', stockEl).textContent = can ? 'In stock' : 'Sold out';
    }
  }
  $$('.chip').forEach(ch => ch.addEventListener('click', () => {
    if (ch.disabled) return;
    sel[+ch.dataset.o] = ch.dataset.v; chosen = true; sync();
  }));
  sync();

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
  show(0);

  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!shots.length || n < 2 || $('#menu.open')) return;
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1);
  });

  // swipe the plate (touch and pen; a mouse never swipes)
  const stage = $('.stage');
  let sx = null;
  if (stage) {
    stage.addEventListener('pointerdown', e => { sx = e.pointerType === 'mouse' ? null : e.clientX; });
    stage.addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 50) show(cur + (e.clientX < sx ? 1 : -1)); sx = null; });
    stage.addEventListener('pointercancel', () => { sx = null; });
  }

  // ---- Develop colour: the keyboard- and touch-friendly twin of the lens -------------------------
  const dev = $('#dev');
  if (dev) dev.addEventListener('click', () => {
    const on = dev.getAttribute('aria-pressed') !== 'true';
    dev.setAttribute('aria-pressed', String(on));
    $$('.shot .xp').forEach(x => x.classList.toggle('dev', on));
    MC.lensKill();
  });
})();
