// Episode: Why Abuja replaced Lagos
// 1976: Murtala Mohammed's government chooses a central, ethnically neutral site (Decree No. 6, the Federal Capital Territory);
// the Central Area was planned by Kenzo Tange; the capital officially moves on 12 December 1991. Lagos remains the largest city.

S.hook = ({ t, lt, ln }) => {
  const ab = wlLast(ln, 'abuja', 0.8);
  camera(540, 900, lerp(1.0, 1.06, lt / 4));
  popWorld(t, () => {
    ngMap(MAP);
    cityPin('lagos', 'LAGOS', clamp((lt - 0.2) / 0.3), MAP, { color: '#f26b1d', dx: 40, dy: -120 });
    if (lt > ab - 0.2) { cityPin('abuja', 'ABUJA', clamp((lt - ab + 0.2) / 0.3), MAP, { color: '#0f9d58', dx: 0, dy: -120 });
      const [x0, y0] = mapXY(...CITIES.lagos), [x1, y1] = mapXY(...CITIES.abuja), u = clamp((lt - ab) / 0.6);
      ctx.save(); ctx.setLineDash([20, 14]); ctx.lineWidth = 10; ctx.strokeStyle = '#fff4dc'; ctx.beginPath(); ctx.moveTo(x0, y0 - 40); ctx.quadraticCurveTo((x0 + x1) / 2 - 60, (y0 + y1) / 2 - 200, lerp(x0, x1, u), lerp(y0, y1, u) - 40); ctx.stroke(); ctx.restore(); }
  }, { pattern: 'rings', pal: 'teal', burst: false, ground: false });
  popText('LAGOS', 540, 300, 120, lt + 0.2, { color: '#f26b1d' });
  popText('→ ABUJA?', 540, 430, 120, lt - ab + 0.3, { color: '#2fd38a' });
};
EV.hook = ln => [{ t: 0.2, type: 'pop' }, { t: wlLast(ln, 'abuja', 0.8) - 0.2, type: 'pop' }];

S.lagos = ({ t, lt, ln }) => {
  const ov = wl(ln, 'overcrowded', 0.4), edge = wl(ln, 'edge', 0.6);
  const [shot, st] = shotOf(lt, [edge - 0.2]);
  if (shot === 0) {
    camera(lerp(480, 600, easeInOut(st / 3)), 980, lerp(1.0, 1.1, easeInOut(st / 3)));
    popWorld(t, () => {
      skyline(-300, 1400, 1290, t, 9, { min: 220, max: 560 });
      road(1290, t, { speed: 40 });
      const cols = ['#f2b705', '#d6246e', '#1f3fbf', '#0aa3a3', '#f26b1d'];
      for (let i = 0; i < 6; i++) car(-120 + i * 230 + Math.sin(t * 2 + i) * 6, 1440 + (i % 2) * 120, 0.6, t * 0.1, { color: cols[i % 5] });
    }, { pattern: 'diamonds', pal: 'sunset', burst: false, ground: false });
    burstBadge('1970s', 820, 420, 140, clamp(st / 0.3), { size: 72, color: '#f2b705' });
    if (lt > ov - 0.1) tag('OVERCROWDED', 380, 560, clamp((lt - ov + 0.1) / 0.3), { size: 60, bg: '#d6246e', ink: '#fff4dc' });
  } else {
    camera(500, 960, lerp(1.0, 1.2, easeInOut(st / 2)));
    whip(st, -1);
    popWorld(t, () => {
      ngMap(MAP);
      cityPin('lagos', 'LAGOS', 1, MAP, { color: '#f26b1d', dx: 60, dy: 70 });
      const [x, y] = mapXY(...CITIES.lagos); ctx.save(); ctx.lineWidth = 8; ctx.strokeStyle = '#f2b705'; ctx.beginPath(); ctx.arc(x, y - 40, 90 + Math.sin(t * 6) * 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }, { pattern: 'rings', pal: 'teal', burst: false, ground: false });
    tag('AT THE EDGE, IN THE SOUTH WEST', 540, 330, clamp(st / 0.3), { size: 40 });
  }
};
EV.lagos = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'overcrowded', 0.4) - 0.1, type: 'stamp' }, { t: wl(ln, 'edge', 0.6) - 0.2, type: 'whoosh' }];

S.choose = ({ t, lt, ln }) => {
  const cen = wl(ln, 'centre', 0.45), land = wl(ln, 'land', 0.65), eth = wl(ln, 'ethnic', 0.9);
  camera(540, 900, lerp(1.0, 1.14, easeInOut(clamp((lt - cen + 0.3) / 1.2))));
  popWorld(t, () => {
    ngMap(MAP);
    const k = clamp((lt - cen + 0.2) / 0.4), [x, y] = mapXY(...CITIES.abuja);
    if (k > 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(t); ctx.lineWidth = 9; ctx.strokeStyle = '#d6246e'; ctx.beginPath(); ctx.arc(0, 0, 120 * (2 - easeOut(k)), 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(150, 0); ctx.stroke(); } ctx.restore(); }
    cityPin('abuja', null, clamp((lt - cen) / 0.3), MAP, { color: '#0f9d58' });
  }, { pattern: 'leaves', pal: 'green', burst: false, ground: false });
  burstBadge('1976', 820, 420, 140, clamp(lt / 0.3), { size: 80, color: '#f2b705' });
  tag('RIGHT IN THE CENTRE', 380, 330, clamp((lt - cen) / 0.3), { size: 46 });
  if (lt > land - 0.1) tag('NEUTRAL GROUND', 540, 1240, clamp((lt - land + 0.1) / 0.3), { size: 52, bg: '#0f9d58', ink: '#fff4dc' });
};
EV.choose = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'centre', 0.45) - 0.2, type: 'ding' }, { t: wl(ln, 'land', 0.65) - 0.1, type: 'pop' }];

S.plan = ({ t, lt, ln }) => {
  const ken = wl(ln, 'kenzo', 0.6), sc = wl(ln, 'scratch', 0.35);
  camera(lerp(560, 520, easeInOut(lt / 5)), 900, lerp(1.0, 1.08, easeInOut(lt / 5)));
  popWorld(t, () => {
    panel(540, 720, 860, 640, clamp(lt / 0.35), (w, h) => {
      ctx.fillStyle = '#1f3fbf'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = 'rgba(255,244,220,.25)'; ctx.lineWidth = 2; for (let x = -w / 2; x < w / 2; x += 40) { ctx.beginPath(); ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2); ctx.stroke(); } for (let y = -h / 2; y < h / 2; y += 40) { ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
      const p = clamp((lt - sc + 0.2) / 2.2); ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      const segs = [[-360, 0, 360, 0], [0, -260, 0, 260], [-300, -180, 300, -180], [-300, 180, 300, 180], [-200, -260, -200, 260], [200, -260, 200, 260]];
      segs.forEach(([a, b, c, d], i) => { const u = clamp(p * segs.length - i); if (u <= 0) return; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(lerp(a, c, u), lerp(b, d, u)); ctx.stroke(); });
      if (p > 0.7) { ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2 * clamp((p - 0.7) / 0.3)); ctx.stroke(); }
    });
    person('architect', 820, 1290, 0.95, { t, alpha: clamp((lt - ken + 0.3) / 0.3), hold: 'paper', armR: [1.0, 1.9] });
  }, { pattern: 'waves', pal: 'indigo', burst: false });
  popText('PLANNED FROM SCRATCH', 540, 330, 82, lt - sc + 0.3, { color: '#f2b705', step: 0.02 });
  if (lt > ken) tag('KENZO TANGE, ARCHITECT', 470, 1180, clamp((lt - ken) / 0.3), { size: 40 });
};
EV.plan = ln => [{ t: 0.1, type: 'quill' }, { t: wl(ln, 'kenzo', 0.6) - 0.2, type: 'pop' }];

S.move = ({ t, lt, ln }) => {
  const dec = wl(ln, 'december', 0.25), mv = wlLast(ln, 'moved', 0.95);
  const drive = easeInOut(clamp((lt - 0.4) / 2.6));
  camera(lerp(420, 660, drive), 980, 1.0);
  popWorld(t, () => {
    ctx.save(); ctx.globalAlpha = 0.95; skyline(-500, 280, 1290, t, 15, { min: 200, max: 460 }); ctx.restore();
    asoRock(1000, 1290, 0.95); dome(1300, 1290, 0.9, '#2fd38a');
    road(1290, t, { speed: 260 });
    car(lerp(100, 980, drive), 1500, 0.9, t, { color: '#0f9d58' });
    ngFlag(lerp(100, 980, drive) + 20, 1300, 90, 54, t, 1);
  }, { pattern: 'suns', pal: 'green', burst: false, ground: false });
  calendarCard('12', 'DEC', '1991', 540, 560, clamp((lt - dec + 0.1) / 0.3), { top: NG });
  popText('THE CAPITAL MOVED!', 540, 330, 90, lt - mv + 0.5, { color: '#fff4dc', step: 0.02 });
};
EV.move = ln => [{ t: wl(ln, 'december', 0.25) - 0.1, type: 'pop' }, { t: 0.4, type: 'whoosh' }, { t: wlLast(ln, 'moved', 0.95) - 0.5, type: 'ding' }];

S.still = ({ t, lt, ln }) => {
  const big = wl(ln, 'biggest', 0.5), hub = wlLast(ln, 'hub', 0.95);
  camera(540, 980, lerp(1.1, 1.0, easeOut(lt / 1.5)));
  popWorld(t, () => {
    skyline(-300, 1400, 1290, t, 23, { min: 260, max: 640 });
    road(1290, t, { speed: 200 });
    for (let i = 0; i < 4; i++) car(((t * 240 + i * 380) % 1600) - 300, 1500, 0.55, t, { color: ['#f2b705', '#d6246e', '#0aa3a3', '#f26b1d'][i] });
  }, { pattern: 'diamonds', pal: 'dusk', burst: false, ground: false, tint: 'rgba(30,20,70,.18)' });
  popText('LAGOS', 540, 330, 140, lt, { color: '#f26b1d' });
  burstBadge('BIGGEST\nCITY', 290, 560, 150, clamp((lt - big) / 0.3), { size: 44, color: '#f2b705' });
  burstBadge('BUSINESS\nHUB', 790, 560, 150, clamp((lt - hub + 0.4) / 0.3), { size: 44, color: '#0aa3a3', ink: '#fff4dc', rot: 0.08 });
};
EV.still = ln => [{ t: wl(ln, 'biggest', 0.5), type: 'pop' }, { t: wlLast(ln, 'hub', 0.95) - 0.4, type: 'pop' }];

S.cta = ctaScene('LAGOS OR ABUJA?', 'TELL ME BELOW', { pal: 'teal' });
