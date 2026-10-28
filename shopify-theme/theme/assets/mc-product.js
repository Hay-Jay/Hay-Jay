/* PRODUCT — the page is server-rendered by Shopify (sections/mc-product.liquid); this adds the photo strip controls (arrows,
   thumbnails, keys, counter), the full-screen zoom, the size tabs (variant -> price, stock, hidden variant id, URL), the quantity
   stepper, Add to bag (AJAX into the bag drawer, with a stamp) and the sticky Add to bag bar on phones.
   Without JavaScript the strip still swipes, each photo links to its full size, options are a <select> and the form posts to /cart/add. */
(() => {
  'use strict';
  const MC = window.MC, { $, $$, pad, esc } = MC;
  const dataEl = $('#pdata'); if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const form = document.getElementById(data.form) || $('form.pl-form');
  const root = document.documentElement;
  const reduce = MC.reduce;
  const smooth = () => (reduce ? 'auto' : 'smooth');

  // ---- photo strip ------------------------------------------------------------------------------------------------
  const track = $('#galTrack'), slides = $$('.gal-slide'), thumbs = $$('.gal-th'), n = slides.length;
  const countEl = $('#galCount'), strip = $('#galThumbs');
  let cur = 0;
  const imgOf = i => $('img.ph:not(.col)', slides[i]);
  function mark(i) {
    if (i === cur && countEl && countEl.dataset.ok) return;
    cur = i; if (countEl) { countEl.textContent = pad(i + 1); countEl.dataset.ok = '1'; }
    thumbs.forEach((t, k) => t.setAttribute('aria-current', String(k === i)));
    // the neighbours load before they are swiped to
    [i - 1, i + 1].forEach(k => { const im = imgOf((k + n) % n); if (im && im.loading === 'lazy') im.loading = 'eager'; });
    const t = thumbs[i];
    if (t && strip) {
      const vert = strip.scrollHeight > strip.clientHeight + 4;
      if (vert) strip.scrollTo({ top: t.offsetTop - strip.clientHeight / 2 + t.offsetHeight / 2, behavior: smooth() });
      else strip.scrollTo({ left: t.offsetLeft - strip.clientWidth / 2 + t.offsetWidth / 2, behavior: smooth() });
    }
  }
  // while the strip glides to a photo, the photos it passes do not count as "current"
  let target = -1, targetT = 0;
  function go(i, how) {
    if (!track || n < 2) return;
    i = (i + n) % n;
    target = i; clearTimeout(targetT); targetT = setTimeout(() => { target = -1; }, 1500);
    track.scrollTo({ left: i * track.clientWidth, behavior: how || smooth() });
    mark(i); MC.lensKill();
  }
  if (track) {
    let raf = 0;
    const settle = () => {
      const k = Math.min(n - 1, Math.max(0, Math.round(track.scrollLeft / (track.clientWidth || 1))));
      if (target >= 0) { if (k !== target) return; target = -1; }
      mark(k);
    };
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; settle(); }); }, { passive: true });
    track.addEventListener('scrollend', () => { target = -1; settle(); });
    // keep the current photo in place when the strip changes width (rotation, resize)
    addEventListener('resize', () => { track.scrollTo({ left: cur * track.clientWidth, behavior: 'auto' }); });
    mark(0);
  }
  thumbs.forEach(t => t.addEventListener('click', e => { e.preventDefault(); go(+t.dataset.i); }));
  $$('.gal-stage .gal-prev').forEach(b => b.addEventListener('click', () => go(cur - 1)));
  $$('.gal-stage .gal-next').forEach(b => b.addEventListener('click', () => go(cur + 1)));

  // ---- the zoom view: full screen, in true colour --------------------------------------------------------------------------
  const lb = $('#plLb'), lbStage = $('#lbStage'), lbImg = $('#lbImg'), lbCount = $('#lbCount');
  let lbI = 0, lbFrom = null, lbHide = 0;
  const lbOpen = () => !!lb && !lb.hidden;
  function lbShow(i) {
    lbI = (i + n) % n; unzoom();
    const a = $('.gal-xp', slides[lbI]), small = imgOf(lbI);
    // the photo already on screen first, the full size as soon as it arrives
    if (small) {
      const w = +small.getAttribute('width'), h = +small.getAttribute('height');
      if (w && h) { lbImg.width = w; lbImg.height = h; }
      lbImg.src = small.currentSrc || small.src;
    }
    if (a) { const full = new Image(); const want = lbI; full.onload = () => { if (want === lbI) lbImg.src = full.src; }; full.src = a.href; }
    if (lbCount) lbCount.textContent = `${pad(lbI + 1)} / ${pad(n)}`;
  }
  function openLb(i) {
    if (!lb || !n) return;
    clearTimeout(lbHide); lbFrom = document.activeElement;
    lb.hidden = false; void lb.offsetWidth; lb.classList.add('open'); root.classList.add('lb-lock');
    lbShow(i); MC.lensKill();
    const x = $('[data-lb-close]', lb); if (x) x.focus({ preventScroll: true });
  }
  function closeLb() {
    if (!lbOpen()) return;
    lb.classList.remove('open'); root.classList.remove('lb-lock');
    lbHide = setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, reduce ? 0 : 250);
    if (lbI !== cur) go(lbI, 'auto');
    const back = $('.gal-xp', slides[lbI]) || lbFrom;
    if (back && back.focus) back.focus({ preventScroll: true });
  }
  function unzoom() { if (lbStage) { lbStage.classList.remove('zoomed'); lbImg.style.width = ''; } }
  function zoomAt(cx, cy) {
    const r = lbImg.getBoundingClientRect(); if (!r.width) return;
    const fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    const w = Math.max(r.width * 2.2, Math.min(lbImg.naturalWidth || 0, r.width * 3.2));
    lbStage.classList.add('zoomed'); lbImg.style.width = w + 'px';
    const h = w * (r.height / r.width);
    lbStage.scrollLeft = fx * w - lbStage.clientWidth / 2; lbStage.scrollTop = fy * h - lbStage.clientHeight / 2;
  }
  $$('.gal-xp').forEach(a => a.addEventListener('click', e => { if (e.defaultPrevented) return; e.preventDefault(); openLb(+a.dataset.i); }));
  const zb = $('#galZoom'); if (zb) zb.addEventListener('click', () => openLb(cur));
  if (lb) {
    lb.addEventListener('click', e => {
      if (e.target.closest('[data-lb-close]')) { closeLb(); return; }
      const nav = e.target.closest('[data-lb]'); if (nav) { lbShow(lbI + +nav.dataset.lb); return; }
      if (e.target === lbImg) { if (lbStage.classList.contains('zoomed')) unzoom(); else zoomAt(e.clientX, e.clientY); return; }
      if (e.target === lbStage && !lbStage.classList.contains('zoomed')) closeLb();
    });
    // a mouse pans the zoomed photo by moving; fingers pan it by scrolling
    lbStage.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !lbStage.classList.contains('zoomed')) return;
      const r = lbStage.getBoundingClientRect();
      lbStage.scrollLeft = ((e.clientX - r.left) / r.width) * (lbStage.scrollWidth - lbStage.clientWidth);
      lbStage.scrollTop = ((e.clientY - r.top) / r.height) * (lbStage.scrollHeight - lbStage.clientHeight);
    });
    // swipe between photos when not zoomed
    let sx = null, sy = 0, suppress = 0;
    lbStage.addEventListener('pointerdown', e => { sx = e.pointerType === 'mouse' || lbStage.classList.contains('zoomed') ? null : e.clientX; sy = e.clientY; });
    lbStage.addEventListener('pointerup', e => {
      const dx = e.clientX - sx;
      if (sx != null && n > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - sy) * 1.4) { lbShow(lbI + (dx < 0 ? 1 : -1)); suppress = performance.now() + 400; }
      sx = null;
    });
    lbStage.addEventListener('pointercancel', () => { sx = null; });
    lbStage.addEventListener('click', e => { if (suppress > performance.now()) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  document.addEventListener('keydown', e => {
    if (lbOpen()) {
      if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
      else if (e.key === 'ArrowRight' && n > 1) { e.preventDefault(); lbShow(lbI + 1); }
      else if (e.key === 'ArrowLeft' && n > 1) { e.preventDefault(); lbShow(lbI - 1); }
      else if (e.key === 'Tab') {
        const f = $$('button', lb).filter(b => b.offsetParent !== null);
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && (document.activeElement === z || !lb.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
      }
      return;
    }
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || n < 2) return;
    if ($('#menu.open') || MC.drawerOpen || (MC.popupOpen && MC.popupOpen())) return;
    if (e.target.closest && e.target.closest('input,select,textarea,[contenteditable]')) return;
    if (e.key === 'ArrowRight') go(cur + 1);
    else if (e.key === 'ArrowLeft') go(cur - 1);
  });

  // ---- variants ----------------------------------------------------------------------------------------------------------------
  const sel = data.sel.slice();
  let chosen = !!data.chosen; // until the shopper picks something, a ranged price keeps its "From"
  const variantFor = () => data.variants.find(v => v.o.length === sel.length && v.o.every((o, i) => o === sel[i]));
  const idInput = $('#variantId'), buy = $('#buy'), buyT = $('#buyT'), priceEl = $('#priceV'), wasEl = $('#priceWas'), stockEl = $('#stock');
  const alertLink = $('#alertLink'), pay = $('.pl-pay'), sticky = $('#plSticky'), sBuy = $('#plsBuy'), sMeta = $('#plsMeta');
  function sync() {
    const v = variantFor();
    $$('.chip').forEach(ch => {
      const oi = +ch.dataset.o, val = ch.dataset.v, on = sel[oi] === val;
      const ok = data.variants.some(x => x.a && x.o[oi] === val); // a tab is disabled only when nothing with that value is left
      ch.classList.toggle('on', on); ch.setAttribute('aria-pressed', String(on)); ch.disabled = !ok;
    });
    $$('fieldset.opt').forEach(fs => { const b = $('legend b', fs); if (b) b.textContent = sel[+fs.dataset.o] || ''; });
    const can = !!(v && v.a);
    if (idInput && v) idInput.value = v.id;
    [buy, sBuy].forEach(b => { if (!b) return; b.disabled = !can; b.setAttribute('aria-disabled', String(!can)); });
    if (buyT) buyT.textContent = can ? 'Add to bag' : 'Sold out';
    if (sBuy) sBuy.textContent = can ? 'Add to bag' : 'Sold out';
    if (alertLink) alertLink.hidden = can;
    if (pay) pay.hidden = !can;
    // prices come formatted by Shopify in the shopper's currency (Markets may convert from CAD)
    const shown = data.range && !chosen ? 'From ' + data.from : (v ? v.m : data.from);
    if (priceEl) priceEl.textContent = shown;
    if (wasEl) { const c = v && !(data.range && !chosen) ? v.c : ''; wasEl.textContent = c; wasEl.hidden = !c; }
    if (sMeta) {
      const picked = sel.filter((_, i) => data.options[i] && data.options[i].values.length > 1).join(' / '), m = v ? v.m : data.from;
      sMeta.textContent = (picked && picked !== m ? picked + ' · ' : '') + m;
    }
    if (stockEl && data.variants.some(x => x.a)) {
      stockEl.classList.toggle('out', !can); stockEl.classList.toggle('in', can);
      $('span', stockEl).textContent = can ? 'In stock' : 'Sold out';
    }
    if (chosen && v) {
      try { history.replaceState(history.state, '', `${location.pathname}?variant=${v.id}`); } catch { /* sandboxed */ }
      if (v.i >= 0 && v.i < n) go(v.i);
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

  // ---- quantity + Add to bag ------------------------------------------------------------------------------------------------------------
  $$('[data-pq]').forEach(b => b.addEventListener('click', () => {
    const inp = form && form.querySelector('input[name=quantity]'); if (!inp) return;
    inp.value = Math.max(1, (+inp.value || 1) + (+b.dataset.pq));
  }));
  let pending = false;
  if (form) form.addEventListener('submit', async e => {
    if (!MC.cart || !window.fetch) return; // no bag script: the form posts normally and lands on the cart page
    e.preventDefault();
    if (!buy || buy.disabled || pending) return;
    const from = e.submitter && e.submitter.matches && e.submitter.matches('button') ? e.submitter : buy;
    const err = $('.pl-err', form.closest('.pl-r') || document); if (err) err.hidden = true;
    pending = true; [buy, sBuy].forEach(b => b && b.classList.add('is-adding'));
    try { await MC.cart.add(new FormData(form), { from }); }
    catch (er) {
      if (er && er.status) { // Shopify said no (sold out, not enough stock)
        if (err) { err.textContent = er.message; err.hidden = false; if (from === sBuy) err.scrollIntoView({ block: 'center', behavior: smooth() }); }
      } else form.submit(); // network trouble: let the browser post it
    } finally { pending = false; [buy, sBuy].forEach(b => b && b.classList.remove('is-adding')); }
  });

  // ---- phones: the sticky bar appears once the main Add to bag has scrolled up out of view -------------------------------------------------
  const buyRow = $('#plBuy');
  if (sticky && buyRow) {
    const phone = matchMedia('(max-width: 899px)');
    let raf = 0, was = null;
    // measured on scroll rather than observed: a jump (back button, anchor, restored scroll) must show it too
    const set = () => {
      raf = 0;
      const on = phone.matches && buyRow.getBoundingClientRect().bottom < 0 && data.variants.some(x => x.a);
      if (on === was) return; was = on;
      sticky.classList.toggle('on', on); sticky.inert = !on; root.classList.toggle('buy-pin', on);
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(set); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); set();
    // the sticky bar names the product and size; a tap on that part goes back up to the size tabs
    const t = $('.pls-t', sticky);
    if (t) { t.style.cursor = 'pointer'; t.addEventListener('click', () => { const o = $('#opts') || buyRow; o.scrollIntoView({ block: 'center', behavior: smooth() }); }); }
  }
})();
