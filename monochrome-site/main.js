(() => {
  'use strict';

  // ---- Config ---------------------------------------------------------
  const STORE_URL = 'https://monochrome.com.ng'; // Shopify storefront (cart, checkout, product pages)
  const CURRENCY = 'CAD';                         // must match the store's currency
  const LOCALE = 'en-CA';
  const EMBLEM = 'assets/emblem.webp';
  const CDN = 'https://cdn.shopify.com/s/files/1/0691/1252/9150/files/';

  // Shown if the live store feed can't be reached.
  const FALLBACK = [
    { n: 'Custom Monochrome Jersey', p: 44, h: 'custom-monochrome-jersey', i: CDN + 'IMG-20240630-WA0019.jpg?v=1721972141', t: 'top' },
    { n: 'Monochrome Sweatshirt', p: 26, h: 'monochrome-sweatshirt', i: CDN + 'IMG_5033.heic?v=1731100395', t: 'top' },
    { n: 'Cargo Shorts', p: 26, h: 'monochrome-cargo-shorts-black', i: CDN + 'IMG_5354.jpg?v=1718940526', t: 'bottom' },
    { n: 'Cargo Skirt', p: 24, h: 'monochrome-cargo-skirt', i: CDN + 'IMG_5535.jpg?v=1718940999', t: 'bottom' },
    { n: 'Pants Chain', p: 8, h: 'monochrome-pants-chain', i: CDN + 'IMG_5544_3a47fc00-7db5-43f7-b132-c9c80d399caa.jpg?v=1719291849', t: 'accessory' },
    { n: 'Black Trinity Ring', p: 8, h: 'black-trinity-ring', i: CDN + 'IMG_5011.heic?v=1731131203', t: 'accessory' }
  ].map(x => ({ ...x, u: `${STORE_URL}/products/${x.h}` }));

  // ---- Helpers --------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = v => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(v);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => { try { return encodeURI(decodeURI(new URL(u, STORE_URL).href)); } catch { return ''; } };

  // Point every data-store link at the storefront.
  $$('[data-store]').forEach(a => { a.href = STORE_URL + a.dataset.store; if (a.classList.contains('btn') || a.classList.contains('social')) { a.target = '_blank'; a.rel = 'noopener'; } });
  $('#year').textContent = new Date().getFullYear();

  // Broken / unsupported images (e.g. .heic) fall back to the emblem.
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && 'img' in img.dataset && !img.classList.contains('fallback')) {
      img.classList.add('fallback'); img.src = EMBLEM;
    }
  }, true);

  // Fade sections in as they scroll into view.
  document.documentElement.classList.add('js');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }) : null;
  $$('.section > *, .foot > *').forEach(el => { el.classList.add('reveal'); io ? io.observe(el) : el.classList.add('in'); });

  // ---- Store state ----------------------------------------------------
  let items = FALLBACK.slice();
  const groups = () => ['top', 'bottom', 'accessory'].map(t => {
    const g = items.filter(x => x.t === t);
    return g.length ? g : FALLBACK.filter(x => x.t === t);
  });

  // ---- Fit Studio -----------------------------------------------------
  let idx = [0, 0, 0], rot = -5, dragging = false, sx = 0, startRot = 0, challengeTimer = null;
  const selected = () => groups().map((g, i) => g[idx[i] % g.length]);

  function renderFit() {
    const s = selected();
    $('#topOverlay').style.backgroundImage = `linear-gradient(#0003,#0003),url("${s[0].i}")`;
    $('#bottomOverlay').style.backgroundImage = `linear-gradient(#0004,#0004),url("${s[1].i}")`;
    $('#accessory').style.backgroundImage = `url("${s[2].i}")`;
    $('#total').textContent = fmt(s.reduce((a, x) => a + x.p, 0));
    $('#slots').innerHTML = ['Top', 'Bottom', 'Object'].map((label, i) => `
      <div class="slot">
        <div class="slot-top"><span>${label.toUpperCase()}</span><span>LIVE PIECE</span></div>
        <div class="slot-row">
          <button class="arrow" type="button" data-step="${i}:-1" aria-label="Previous ${label.toLowerCase()}">←</button>
          <a class="selected" href="${esc(s[i].u)}" target="_blank" rel="noopener">
            <img data-img src="${esc(safeUrl(s[i].i))}" alt="">
            <span><b>${esc(s[i].n)}</b><small>${fmt(s[i].p)}</small></span>
          </a>
          <button class="arrow" type="button" data-step="${i}:1" aria-label="Next ${label.toLowerCase()}">→</button>
        </div>
      </div>`).join('');
  }

  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    const [i, d] = b.dataset.step.split(':').map(Number), len = groups()[i].length;
    idx[i] = (idx[i] + d + len) % len; renderFit();
  });
  const randomize = () => { idx = groups().map(g => Math.floor(Math.random() * g.length)); renderFit(); };
  $('#random').onclick = randomize;
  $('#shopLook').onclick = () => window.open(selected()[0].u, '_blank', 'noopener');

  const wrap = $('#avatarWrap'), av = $('#avatar');
  wrap.addEventListener('pointerdown', e => { dragging = true; sx = e.clientX; startRot = rot; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener('pointermove', e => {
    if (!dragging) return;
    rot = Math.max(-32, Math.min(32, startRot + (e.clientX - sx) * .12));
    av.style.transform = `${matchMedia('(min-width:820px)').matches ? 'scale(1.22) ' : ''}rotateY(${rot}deg)`;
  });
  ['pointerup', 'pointercancel'].forEach(t => wrap.addEventListener(t, () => { dragging = false; }));

  $('#start').onclick = () => {
    clearInterval(challengeTimer);
    let t = 45; const el = $('#timer'); el.textContent = '00:45'; randomize();
    challengeTimer = setInterval(() => {
      t--; el.textContent = '00:' + String(Math.max(t, 0)).padStart(2, '0');
      if (t <= 0) clearInterval(challengeTimer);
    }, 1000);
  };

  // ---- Store grid -----------------------------------------------------
  let filter = 'all';
  function drawStore() {
    const data = items.filter(x => filter === 'all' || x.t === filter);
    $('#products').innerHTML = data.length ? data.map(x => `
      <a class="card" href="${esc(x.u)}" target="_blank" rel="noopener">
        <div class="pic"><img data-img loading="lazy" decoding="async" src="${esc(safeUrl(x.i))}" alt="${esc(x.n)}"></div>
        <div class="meta"><b>${esc(x.n)}</b><span><em>${fmt(x.p)}</em><em class="stock">IN STOCK</em></span></div>
      </a>`).join('') : '<p class="empty">Nothing in this category right now. Check back soon.</p>';
  }
  $$('.filter').forEach(b => b.addEventListener('click', () => {
    $$('.filter').forEach(x => x.classList.remove('on')); b.classList.add('on');
    filter = b.dataset.filter; drawStore();
  }));

  const classify = p => {
    const s = `${p.title} ${p.product_type || ''}`.toLowerCase();
    if (/ring|chain|necklace|accessor|jewel|object|bag|cap|hat/.test(s)) return 'accessory';
    if (/short|skirt|pant|trouser|jean|bottom/.test(s)) return 'bottom';
    return 'top';
  };

  async function loadStore() {
    try {
      const r = await fetch(`${STORE_URL}/products.json?limit=100`, { mode: 'cors' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const live = j.products.map(p => {
        const vs = p.variants || [], v = vs.find(v => v.available) || vs[0];
        return { n: p.title, p: Number(v?.price || 0), u: `${STORE_URL}/products/${p.handle}`, i: p.images?.[0]?.src || '', t: classify(p), ok: vs.some(v => v.available) };
      }).filter(x => x.ok && x.i);
      if (live.length) items = live;
    } catch { /* keep fallback */ }
    drawStore(); renderFit();
  }

  drawStore(); renderFit(); loadStore();
})();
