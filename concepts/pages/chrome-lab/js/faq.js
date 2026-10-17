/* MONOCHROME® — /faq/. Live filter over the accordion answers. Every answer is real HTML (<details>), so the page works without this. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const input = $('#faqQ'), count = $('#faqCount'), none = $('#faqNone');
  if (!input) return;
  const items = $$('.faq-group details').map(d => ({ d, group: d.closest('.faq-group'), text: norm(d.textContent), wasOpen: d.open, byUs: false }));
  const groups = $$('.faq-group');
  const jump = $$('.jump a');
  function norm(s) { return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  function run() {
    const toks = norm(input.value).split(' ').filter(Boolean);
    let n = 0;
    items.forEach(it => {
      const hit = !toks.length || toks.every(t => it.text.includes(t));
      it.d.hidden = !hit;
      if (hit) n++;
    });
    // few matches: open them so the answer is already on screen; clearing the search puts everything back as it was
    const few = toks.length && n <= 3;
    items.forEach(it => {
      if (few && !it.d.hidden && !it.d.open) { it.d.open = true; it.byUs = true; }
      else if ((!few || it.d.hidden) && it.byUs) { it.d.open = false; it.byUs = false; }
    });
    groups.forEach((g, i) => {
      const any = $$('details', g).some(d => !d.hidden);
      g.hidden = !any;
      if (jump[i]) jump[i].parentElement.hidden = false;
      if (jump[i]) jump[i].classList.toggle('dim', !any);
    });
    none.hidden = n > 0;
    count.textContent = toks.length ? `${String(n).padStart(2, '0')} of ${String(items.length).padStart(2, '0')} answers` : '';
  }
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { input.value = ''; run(); } });
  run();
})();
