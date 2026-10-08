/* LOOKBOOK — a horizontal film strip. Wide fine-pointer screens pin the strip and let the page scroll drive it sideways;
   everything else gets a native, swipeable strip. Buttons and arrow keys work in both modes. */
(() => {
  'use strict';
  const MC = window.MC, { $, $$, clamp, pad, reduce } = MC;
  const lbTrack = $('#lbTrack'), lbSec = $('#lookbook'), lbPin = $('#lbPin');
  if (!lbTrack) return;
  const lbFigs = $$('.lb-fig', lbTrack);
  const lb = { pinned: false, travel: 0, run: 0, p: 0, cur: 0 };
  const LB_PACE = 0.56; // page scroll needed per pixel of strip travel
  const lbNo = $('#lbNo'), lbBar = $('#lbBar'), lbHint = $('#lbHint'), prev = $('#lbPrev'), next = $('#lbNext');
  const N = lbFigs.length;
  const mq = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');

  const setNo = k => { lb.cur = k; const t = `Fig. ${pad(k + 1)} / ${pad(N)}`; if (lbNo.textContent !== t) lbNo.textContent = t; if (prev) prev.disabled = k <= 0; if (next) next.disabled = k >= N - 1; };
  function modeCheck() {
    const want = mq.matches && !reduce;
    lb.pinned = want;
    lbSec.classList.toggle('pinned', want);
    if (want) { lbTrack.removeAttribute('tabindex'); lbTrack.scrollLeft = 0; lbHint.textContent = 'Scroll'; }
    else { lbTrack.tabIndex = 0; lbSec.style.height = ''; lbTrack.style.transform = ''; lbHint.textContent = 'Swipe'; }
    $('.lb-how').textContent = want ? 'Keep scrolling.' : 'Swipe sideways.';
    if (prev) prev.hidden = false; if (next) next.hidden = false;
    measure();
  }
  function measure() {
    lbFigs.forEach(f => { f._cx = f.offsetLeft + f.offsetWidth / 2; });
    if (!lb.pinned) { update(); return; }
    const last = lbTrack.lastElementChild;
    lb.travel = Math.max(0, last.offsetLeft + last.offsetWidth + parseFloat(getComputedStyle(lbTrack).paddingLeft) + 8 - innerWidth);
    lb.run = lb.travel * LB_PACE;
    lbSec.style.height = (lbPin.offsetHeight || innerHeight) + lb.run + 'px';
    update();
  }
  function update() {
    let view0 = 0, w = innerWidth;
    if (lb.pinned) {
      const top = lbSec.getBoundingClientRect().top;
      const p = lb.run > 0 ? clamp(-top / lb.run, 0, 1) : 0;
      lb.p = p; view0 = p * lb.travel;
      lbTrack.style.transform = `translate3d(${(-view0).toFixed(1)}px,0,0)`;
    } else {
      const max = lbTrack.scrollWidth - lbTrack.clientWidth;
      lb.p = max > 0 ? lbTrack.scrollLeft / max : 0; view0 = lbTrack.scrollLeft; w = lbTrack.clientWidth;
    }
    lbBar.style.setProperty('--p', lb.p.toFixed(4));
    let best = 0, bd = 1e9;
    lbFigs.forEach((f, k) => {
      const c = f._cx - view0 - w / 2, d = Math.abs(c);
      if (d < bd) { bd = d; best = k; }
      if (Math.abs(c) < w) f.style.setProperty('--pk', clamp(-c / w * 9, -6, 6).toFixed(2));
    });
    setNo(best);
  }
  let raf = 0;
  const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  addEventListener('scroll', () => { if (lb.pinned) queue(); }, { passive: true });
  lbTrack.addEventListener('scroll', () => { if (!lb.pinned) queue(); }, { passive: true });
  lbPin.addEventListener('scroll', () => { lbPin.scrollLeft = 0; });

  // bring frame k to the centre, in whichever mode is active
  function goTo(k) {
    k = clamp(k, 0, N - 1); const f = lbFigs[k]; if (!f) return;
    const behavior = reduce ? 'auto' : 'smooth';
    if (lb.pinned) {
      const p = clamp((f._cx - innerWidth / 2) / (lb.travel || 1), 0, 1);
      const secTop = scrollY + lbSec.getBoundingClientRect().top;
      scrollTo({ top: secTop + p * lb.run, behavior });
    } else {
      lbTrack.scrollTo({ left: f._cx - lbTrack.clientWidth / 2, behavior });
    }
  }
  if (prev) prev.addEventListener('click', () => goTo(lb.cur - 1));
  if (next) next.addEventListener('click', () => goTo(lb.cur + 1));
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || $('#menu.open')) return;
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (!lb.pinned && lbTrack.contains(document.activeElement) && document.activeElement === lbTrack) return; // the focused strip scrolls natively
      e.preventDefault(); goTo(lb.cur + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  // keyboard focus on an off-screen frame scrolls the page to bring it in
  lbTrack.addEventListener('focusin', e => {
    if (!lb.pinned) return; const f = e.target.closest('.lb-fig'); if (!f) return;
    lbPin.scrollLeft = 0;
    const p = clamp((f._cx - innerWidth / 2) / (lb.travel || 1), 0, 1);
    const secTop = scrollY + lbSec.getBoundingClientRect().top;
    scrollTo({ top: secTop + p * lb.run, behavior: 'auto' });
  });
  (mq.addEventListener ? mq.addEventListener('change', modeCheck) : mq.addListener(modeCheck));
  addEventListener('resize', measure);
  modeCheck();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('load', measure);
  // images settling can nudge layout
  $$('img', lbTrack).forEach(im => im.addEventListener('load', () => { if (lb.pinned) measure(); }, { once: true }));
})();
