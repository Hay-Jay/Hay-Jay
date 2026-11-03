// Episode: The day Nigeria switched sides of the road
// Nigeria drove on the left under British rule and changed to the right on 2 April 1972; its neighbours Benin, Niger, Chad and
// Cameroon drive on the right; Ghana switched on 4 August 1974; the naira replaced the Nigerian pound on 1 January 1973.

// top-down road with two lanes; lane -1 = left, +1 = right
function topRoad(t) {
  ctx.fillStyle = '#3a3640'; ctx.fillRect(300, -400, 480, 2400); ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.strokeRect(300, -400, 480, 2400);
  ctx.fillStyle = '#f2b705'; for (let y = -400 + ((t * 420) % 180); y < 2000; y += 180) ctx.fillRect(530, y, 20, 100);
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(316, -400, 8, 2400); ctx.fillRect(756, -400, 8, 2400);
}
function topCar(x, y, col, t, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineWidth = 8; ctx.strokeStyle = K;
  ctx.fillStyle = K; ctx.fillRect(-68, -90, 22, 50); ctx.fillRect(46, -90, 22, 50); ctx.fillRect(-68, 50, 22, 50); ctx.fillRect(46, 50, 22, 50);
  ctx.beginPath(); ctx.roundRect(-56, -120, 112, 240, 40); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-42, -70, 84, 60, 14); ctx.fillStyle = '#bfe3ff'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-40, 40, 80, 40, 12); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function sign(x, y, txt, col, k = 1) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(easeBack(k), easeBack(k));
  ctx.lineWidth = 12; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 230); ctx.stroke();
  circle(0, 0, 96, col); ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.stroke(); circle(0, 0, 72, '#fff4dc');
  ctx.fillStyle = K; ctx.font = `30px ${POP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; txt.split('\n').forEach((l, i, a) => ctx.fillText(l, 0, (i - (a.length - 1) / 2) * 32));
  ctx.restore();
}

S.hook = ({ t, lt, ln }) => {
  const sw = wl(ln, 'switched', 0.55);
  const u = easeInOut(clamp((lt - sw + 0.1) / 0.7));
  camera(540, 960, lerp(1.0, 1.08, lt / 4));
  popWorld(t, () => {
    topRoad(t);
    topCar(lerp(420, 660, u), 1000, '#f2b705', t, 1.2, Math.sin(u * Math.PI) * 0.4);
    if (u > 0 && u < 1) { ctx.save(); ctx.lineWidth = 14; ctx.strokeStyle = '#d6246e'; ctx.beginPath(); ctx.moveTo(420, 800); ctx.lineTo(660, 800); ctx.stroke(); for (const [x, d] of [[660, 1], [420, -1]]) { ctx.beginPath(); ctx.moveTo(x, 800); ctx.lineTo(x - d * 34, 774); ctx.moveTo(x, 800); ctx.lineTo(x - d * 34, 826); ctx.stroke(); } ctx.restore(); }
  }, { pattern: 'leaves', pal: 'teal', burst: false, ground: false });
  burstBadge('1972', 820, 470, 140, clamp(lt / 0.3), { size: 80, color: '#f2b705' });
  popText('EVERY CAR', 540, 320, 110, lt + 0.1, { color: '#fff4dc' });
  if (lt > sw) burstBadge('SWITCHED\nSIDES!', 250, 1250, 160, clamp((lt - sw) / 0.3), { size: 46, color: '#d6246e', ink: '#fff4dc' });
};
EV.hook = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'switched', 0.55) - 0.1, type: 'whoosh' }, { t: wl(ln, 'switched', 0.55) + 0.3, type: 'stamp' }];

S.left = ({ t, lt, ln }) => {
  const lf = wl(ln, 'left', 0.7);
  camera(540, 960, 1.05);
  whip(lt, 1);
  popWorld(t, () => {
    topRoad(t);
    topCar(420, 1100 - ((t * 120) % 200), '#1f3fbf', t, 1.2);
    topCar(660, 400 + ((t * 120) % 200), '#d6246e', t, 1.2, Math.PI);
    sign(190, 760, 'KEEP\nLEFT', '#d7262e', clamp((lt - lf + 0.2) / 0.3));
  }, { pattern: 'waves', pal: 'indigo', burst: false, ground: false });
  tag('UNDER BRITISH RULE', 540, 330, clamp(lt / 0.3), { size: 50 });
  if (lt > lf - 0.1) tag('DRIVE ON THE LEFT', 540, 1240, clamp((lt - lf + 0.1) / 0.3), { size: 52, bg: '#d7262e', ink: '#fff4dc' });
};
EV.left = ln => [{ t: 0.0, type: 'whoosh' }, { t: wl(ln, 'left', 0.7) - 0.2, type: 'pop' }];

S.neighbours = ({ t, lt, ln }) => {
  const m = { x: 540, y: 880, s: 46 };
  const cues = [['benin', 'BENIN', 2.2, 8.4, -120, 0], ['niger', 'NIGER', 7.5, 14.6, 0, -40], ['chad', 'CHAD', 14.8, 13.6, 80, -60], ['cameroon', 'CAMEROON', 13.6, 7.0, 120, 40]];
  const right = wlLast(ln, 'right', 0.95);
  camera(540, 880, lerp(1.0, 1.05, lt / 5));
  popWorld(t, () => {
    ngMap(m);
    cues.forEach(([w, label, lon, lat, dx, dy], i) => {
      const at = wl(ln, w, 0.25 + i * 0.12), k = clamp((lt - at) / 0.3); if (k <= 0) return;
      const [x, y] = mapXY(lon, lat, m); tag(label, x + dx, y + dy, k, { size: 40, bg: ['#f26b1d', '#f2b705', '#0aa3a3', '#d6246e'][i] });
      if (lt > right - 0.2) tag('→ RIGHT', x + dx, y + dy + 70, clamp((lt - right + 0.2) / 0.3), { size: 30, bg: '#0f9d58', ink: '#fff4dc' });
    });
  }, { pattern: 'rings', pal: 'sunset', burst: false, ground: false });
  popText('THE NEIGHBOURS', 540, 330, 100, lt);
};
EV.neighbours = ln => [{ t: wl(ln, 'benin', 0.25), type: 'pop' }, { t: wl(ln, 'niger', 0.37), type: 'pop' }, { t: wl(ln, 'chad', 0.49), type: 'pop' }, { t: wl(ln, 'cameroon', 0.61), type: 'pop' }, { t: wlLast(ln, 'right', 0.95) - 0.2, type: 'ding' }];

S.switch = ({ t, lt, ln }) => {
  const apr = wl(ln, 'april', 0.25), ch = wl(ln, 'changed', 0.6);
  const u = easeInOut(clamp((lt - ch + 0.2) / 0.8));
  camera(540, 960, 1.05);
  whip(lt, -1);
  popWorld(t, () => {
    topRoad(t);
    topCar(lerp(420, 660, u), 1100 - ((t * 120) % 200), '#1f3fbf', t, 1.2, Math.sin(u * Math.PI) * 0.35);
    topCar(lerp(660, 420, u), 400 + ((t * 120) % 200), '#d6246e', t, 1.2, Math.PI - Math.sin(u * Math.PI) * 0.35);
    sign(890, 1100, 'KEEP\nRIGHT', '#0f9d58', clamp((lt - ch) / 0.3));
  }, { pattern: 'leaves', pal: 'green', burst: false, ground: false });
  calendarCard('2', 'APR', '1972', 190, 560, clamp((lt - apr + 0.1) / 0.3), { top: NG, rot: -0.05 });
  popText('OVERNIGHT!', 600, 330, 110, lt - ch, { color: '#f2b705' });
};
EV.switch = ln => [{ t: 0.0, type: 'whoosh' }, { t: wl(ln, 'april', 0.25) - 0.1, type: 'pop' }, { t: wl(ln, 'changed', 0.6) - 0.2, type: 'whoosh' }];

S.ghana = ({ t, lt, ln }) => {
  const gh = wl(ln, 'ghana', 0.1), yr = wlLast(ln, '1974', 0.95);
  camera(540, 900, lerp(1.1, 1.0, easeOut(lt / 1.5)));
  whip(lt, 1);
  popWorld(t, () => {
    ctx.save(); ctx.translate(540, 820); const N = 20, w = 520, h = 340;
    for (let i = 0; i < N; i++) { const u = i / N, dy = Math.sin(t * 5 - u * 6) * 10 * u; [['#ce1126', 0], ['#fcd116', 1], ['#006b3f', 2]].forEach(([c, r]) => { ctx.fillStyle = c; ctx.fillRect(-w / 2 + u * w, -h / 2 + r * h / 3 + dy, w / N + 1, h / 3 + 1); }); }
    ctx.fillStyle = K; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 22 : 54; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    ctx.lineWidth = 9; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.restore();
  }, { pattern: 'suns', pal: 'sunset', cy: 820, disc: 330 });
  popText('GHANA TOO', 540, 330, 110, lt - gh + 0.2, { color: '#fff4dc' });
  burstBadge('1974', 800, 1170, 140, clamp((lt - yr + 0.5) / 0.3), { size: 80, color: '#f2b705' });
};
EV.ghana = ln => [{ t: 0.0, type: 'whoosh' }, { t: wl(ln, 'ghana', 0.1), type: 'pop' }];

S.naira = ({ t, lt, ln }) => {
  const pd = wl(ln, 'pound', 0.45), na = wlLast(ln, 'naira', 0.95);
  camera(540, 900, lerp(1.0, 1.08, lt / 4.5));
  popWorld(t, () => {
    const k1 = clamp((lt - pd + 0.4) / 0.3), x = lt > na - 0.5 ? clamp((lt - na + 0.5) / 0.5) : 0;
    banknote(540 - x * 260, 760 + x * 80, 1.15 - x * 0.35, '£1', 'NIGERIAN POUND', '#b8c9a2', k1, -0.06);
    if (x > 0.3) { const [a, b] = [540 - x * 260, 760 + x * 80]; ctx.save(); ctx.lineWidth = 16; ctx.strokeStyle = '#d6246e'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a - 120, b - 80); ctx.lineTo(a + 120, b + 80); ctx.stroke(); ctx.restore(); }
    if (lt > na - 0.3) {
      const k = clamp((lt - na + 0.3) / 0.3); ctx.save(); ctx.translate(640, 820); ctx.scale(easeBack(k), easeBack(k)); ctx.rotate(0.05);
      ctx.fillStyle = K; ctx.fillRect(-200, -110, 420, 240); ctx.fillStyle = '#2fd38a'; ctx.fillRect(-210, -120, 420, 240); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.strokeRect(-210, -120, 420, 240); ctx.strokeRect(-190, -100, 380, 200);
      ctx.fillStyle = K; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold 120px "DejaVu Sans", sans-serif`; ctx.fillText('₦', -90, 6); ctx.font = `56px ${POP}`; ctx.fillText('NAIRA', 80, 6); ctx.restore();
    }
  }, { pattern: 'diamonds', pal: 'green', cy: 820 });
  burstBadge('1973', 820, 420, 140, clamp(lt / 0.3), { size: 80, color: '#f2b705' });
  popText('NEW MONEY', 400, 330, 104, lt - 0.2, { color: '#fff4dc' });
};
EV.naira = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'pound', 0.45) - 0.4, type: 'pop' }, { t: wlLast(ln, 'naira', 0.95) - 0.3, type: 'ding' }];

S.cta = ctaScene('DID YOUR PARENTS', 'REMEMBER IT?', { pal: 'teal' });
