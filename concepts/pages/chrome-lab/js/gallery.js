/* MONOCHROME® — /gallery/, the signature page. The scene is the page (js/lab3d.js, "tunnel" mode); this file is the DOM side of it:
   the caption card, the numbered rail, the keyboard path (a hidden list of real links that moves the scene), the bridge the scene calls
   into (MC.setFocus / setHover / openPiece), and the layout switch between the 3D tunnel and the plain grid.
   No WebGL, reduced motion, a lost context or ?view=grid all leave the grid in place: every piece is a real link to its product page. */
(() => {
  'use strict';
  const MC = window.MC;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stage = $('#glStage'), list = $('#glList');
  const dataEl = $('#mc-gallery');
  if (!stage || !dataEl) return;
  let items = [];
  try { items = JSON.parse(dataEl.textContent); } catch { /* the grid still works without the scene data */ }
  const N = items.length;

  // "Enter the 3D tunnel" is only offered where the tunnel can actually run
  if (MC.canGL && !MC.file && !MC.reduce) root.classList.add('can3d');

  MC.gallery = items;
  MC.focusIdx = 0;
  MC.hoverIdx = -1;
  const href = h => MC.url(`products/${h}/`);
  MC.openPiece = h => { location.href = href(h); };

  // ---- caption card ----
  const cap = { id: $('#capId'), cat: $('#capCat'), pos: $('#capPos'), title: $('#capTitle'), price: $('#capPrice'), sizes: $('#capSizes'), open: $('#capOpen') };
  const nb = t => MC.esc(t).split(' ').map(w => (w.includes('-') ? `<span class="nb">${w}</span>` : w)).join(' ');
  let shown = -2;
  function showCaption(i) {
    if (i === shown || i < 0 || !items[i]) return;
    shown = i;
    const x = items[i];
    cap.id.textContent = `LAB-${MC.pad2(i + 1)}`;
    cap.cat.textContent = (x.type || x.cat || '').toUpperCase();
    cap.pos.textContent = `${MC.pad2(i + 1)} / ${MC.pad2(N)}`;
    cap.title.innerHTML = `<span>${nb(x.n)}</span>`;
    cap.price.textContent = x.price + (x.avail ? '' : ' / SOLD OUT');
    cap.sizes.textContent = x.sizes.length ? x.sizes.join(' ') : (x.t === 'gift' ? 'E-GIFT CARD' : 'ONE SIZE');
    cap.open.href = href(x.h);
    $$('#glRail button').forEach((b, k) => b.classList.toggle('on', k === i));
  }
  MC.setFocus = i => { MC.focusIdx = i; stage.dataset.cap = i % 2 ? 'right' : 'left'; if (MC.hoverIdx < 0) showCaption(i); };
  MC.setHover = i => {
    MC.hoverIdx = i;
    stage.classList.toggle('hover-item', i >= 0);
    showCaption(i >= 0 ? i : MC.focusIdx);
  };
  showCaption(0);

  // ---- rail ----
  const rail = $('#glRail');
  if (rail) {
    rail.innerHTML = items.map((x, i) => `<button type="button" tabindex="-1" data-i="${i}"><b>${MC.pad2(i + 1)}</b><i></i></button>`).join('');
    rail.addEventListener('click', e => { const b = e.target.closest('button'); if (b && MC.api && MC.api.focusItem) MC.api.focusItem(+b.dataset.i); });
  }

  // ---- keyboard: tabbing through the list moves the scene to that piece (Enter opens it, as with any link) ----
  if (list) {
    const links = $$('.card', list);
    links.forEach((a, i) => { a.dataset.i = i; });
    list.addEventListener('focusin', e => {
      const a = e.target.closest('.card');
      if (a && root.classList.contains('gl-on') && MC.api && MC.api.focusItem) MC.api.focusItem(+a.dataset.i, true);
    });
  }

  // ---- back to the start of the page (the finale button) ----
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-top]');
    if (t) { e.preventDefault(); scrollTo({ top: 0, behavior: MC.reduce ? 'auto' : 'smooth' }); const m = $('#main'); if (m) m.focus({ preventScroll: true }); }
  });

  // ---- the grid / 3D switch keeps the page honest if the scene dies mid-way ----
  document.addEventListener('mc:glfailed', () => { root.classList.remove('gl-on'); MC.setHover(-1); });
})();
