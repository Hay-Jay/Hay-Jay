/* Naija 2027 Studio: deterministic, time-driven 9:16 motion graphics.
   Every frame is a pure function of time t, so the renderer can step
   frame by frame and the preview can scrub freely. */
(function () {
  const qs = new URLSearchParams(location.search);
  const stage = document.getElementById('stage');
  const scenesEl = document.getElementById('scenes');
  const barsEl = document.getElementById('bars');
  const blobs = [...document.querySelectorAll('.blob')];
  const render = qs.has('render');
  if (render) document.body.classList.add('render');
  document.getElementById('handle').textContent = qs.get('handle') || window.HANDLE || '#Nigeria2027';

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const eOut = k => 1 - Math.pow(1 - k, 3);
  const eInOut = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const eBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  const fmt = (v, dec, pre, suf) => pre + Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;

  let video, scenes = [], total = 0;

  function build(id) {
    video = VIDEOS.find(v => v.id === id) || VIDEOS[0];
    scenesEl.innerHTML = ''; barsEl.innerHTML = '';
    scenes = []; total = 0;
    video.scenes.forEach(s => {
      const el = document.createElement('section');
      el.className = 'scene ' + (s.cls || '');
      el.innerHTML = s.html;
      scenesEl.appendChild(el);
      const anims = [...el.querySelectorAll('[data-a]')].map(n => ({
        n, a: n.dataset.a, t: +(n.dataset.t || 0),
        d: +(n.dataset.d || ({ count: 1.4, bar: 1.2, pillar: 1.3, ring: 1.6, people: 1.6, type: 1.0 }[n.dataset.a] || .6)),
        text: n.textContent,
        dots: n.dataset.a === 'people' ? [...n.children] : null,
      }));
      scenes.push({ el, start: total, dur: s.dur, mood: s.mood || video.mood || '', anims });
      total += s.dur;
      const b = document.createElement('div'); b.appendChild(document.createElement('i')); barsEl.appendChild(b);
    });
    window.__duration = total;
    seek(0);
  }

  function applyAnim(o, lt) {
    const { n, a, d } = o;
    const k = clamp(lt / d), e = eOut(k);
    const vis = lt >= 0 ? 1 : 0;
    switch (a) {
      case 'up': n.style.opacity = e * vis; n.style.transform = `translateY(${(1 - e) * 90}px)`; break;
      case 'down': n.style.opacity = e * vis; n.style.transform = `translateY(${(e - 1) * 90}px)`; break;
      case 'left': n.style.opacity = e * vis; n.style.transform = `translateX(${(1 - e) * -140}px)`; break;
      case 'right': n.style.opacity = e * vis; n.style.transform = `translateX(${(1 - e) * 140}px)`; break;
      case 'fade': n.style.opacity = e * vis; break;
      case 'pop': { const b = lt < 0 ? 0 : eBack(k); n.style.opacity = clamp(k * 2) * vis; n.style.transform = `scale(${.55 + .45 * b})`; break; }
      case 'stamp': { const s = lt < 0 ? 2.4 : 2.4 - 1.4 * eBack(k); n.style.opacity = clamp(k * 3) * vis; n.style.transform = `rotate(-6deg) scale(${s})`; break; }
      case 'zoom': { n.style.opacity = clamp(k * 2) * vis; n.style.transform = `scale(${1.12 - .12 * eInOut(clamp(lt / 6))})`; break; }
      case 'bar': n.style.width = (e * +n.dataset.w) + '%'; break;
      case 'pillar': n.style.height = (e * +n.dataset.h) + '%'; break;
      case 'ring': { const p = +n.dataset.p, r = +n.getAttribute('r'), C = 2 * Math.PI * r; n.style.strokeDasharray = C; n.style.strokeDashoffset = C * (1 - e * p / 100); break; }
      case 'people': { const want = Math.round(eInOut(k) * +n.dataset.n); o.dots.forEach((dot, i) => dot.classList.toggle('on', i < want)); break; }
      case 'count': {
        const from = +(n.dataset.from || 0), to = +n.dataset.to, dec = +(n.dataset.dec || 0);
        n.textContent = fmt(from + (to - from) * eOut(k), dec, n.dataset.pre || '', n.dataset.suf || '');
        break;
      }
      case 'type': { const s = o.text; n.textContent = s.slice(0, Math.round(s.length * k)); n.style.opacity = vis; break; }
    }
  }

  function seek(t) {
    t = clamp(t, 0, total - 1e-4);
    let idx = scenes.findIndex(s => t < s.start + s.dur); if (idx < 0) idx = scenes.length - 1;
    scenes.forEach((s, i) => {
      const on = i === idx;
      s.el.classList.toggle('on', on);
      const fill = barsEl.children[i].firstChild;
      fill.style.width = (i < idx ? 100 : i > idx ? 0 : clamp((t - s.start) / s.dur) * 100) + '%';
      if (!on) return;
      const lt = t - s.start;
      const kin = eOut(clamp(lt / .4));
      const last = i === scenes.length - 1;
      const kout = last ? 0 : eInOut(clamp((lt - (s.dur - .3)) / .3));
      s.el.style.opacity = kin * (1 - kout);
      s.el.style.transform = `translateY(${(1 - kin) * 40}px) scale(${1 - kout * .04})`;
      s.anims.forEach(o => applyAnim(o, lt - o.t));
      stage.classList.toggle('mood-red', s.mood === 'red');
    });
    blobs.forEach((b, i) => {
      const p = t * (.25 + i * .07);
      b.style.transform = `translate(${Math.sin(p + i * 2) * 140}px, ${Math.cos(p * .8 + i) * 120}px)`;
    });
    window.__t = t;
  }
  window.__seek = seek;
  window.__build = build;
  window.__scenes = () => scenes.map(s => ({ start: s.start, dur: s.dur }));

  // ----- preview UI -----
  const pick = document.getElementById('pick');
  VIDEOS.forEach(v => { const o = document.createElement('option'); o.value = v.id; o.textContent = v.title; pick.appendChild(o); });
  const startId = qs.get('v') || VIDEOS[0].id;
  pick.value = startId;
  build(startId);

  function fit() {
    if (render) return;
    const w = innerWidth, h = innerHeight - 56;
    stage.style.transform = `scale(${Math.min(w / 1080, h / 1920)})`;
  }
  addEventListener('resize', fit); fit();

  if (render) { if (qs.has('t')) seek(+qs.get('t')); window.__ready = document.fonts.ready.then(() => true); return; }

  const playBtn = document.getElementById('play'), scrub = document.getElementById('scrub'), timeEl = document.getElementById('time');
  let playing = false, t0 = 0, base = 0, cur = 0;
  function show(t) { cur = t; seek(t); scrub.value = Math.round(t / total * 1000); timeEl.textContent = t.toFixed(1) + 's'; }
  function loop(now) {
    if (!playing) return;
    const t = base + (now - t0) / 1000;
    if (t >= total) { playing = false; playBtn.textContent = 'Play'; show(total); return; }
    show(t); requestAnimationFrame(loop);
  }
  function play() { if (cur >= total - .05) cur = 0; playing = true; base = cur; t0 = performance.now(); playBtn.textContent = 'Pause'; requestAnimationFrame(loop); }
  playBtn.onclick = () => { if (playing) { playing = false; playBtn.textContent = 'Play'; } else play(); };
  document.getElementById('restart').onclick = () => { show(0); if (!playing) play(); else { base = 0; t0 = performance.now(); } };
  scrub.oninput = () => { playing = false; playBtn.textContent = 'Play'; show(scrub.value / 1000 * total); };
  pick.onchange = () => { playing = false; playBtn.textContent = 'Play'; build(pick.value); history.replaceState(null, '', '?v=' + pick.value); show(0); };
  document.fonts.ready.then(() => { show(0); if (qs.has('autoplay')) play(); });
})();
