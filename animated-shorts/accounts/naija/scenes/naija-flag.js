// Episode: A student designed Nigeria's flag
// Michael Taiwo Akinkunmi (1936–2023): a Nigerian student in Britain, 1959 competition, nearly 3,000 entries,
// green for agriculture and white for peace and unity, the judges removed his red sun, £100 prize, flag raised 1 October 1960.

S.hook = ({ t, lt, ln }) => {
  const stu = wl(ln, 'student', 0.4), cut = wl(ln, 'cut', 0.75);
  camera(540, 900, lerp(1.1, 1.0, easeOut(lt / 2)));
  popWorld(t, () => {
    ctx.lineWidth = 16; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(250, 1290); ctx.lineTo(250, 500); ctx.stroke();
    ngFlag(470, 640, 440, 260, t, easeBack(clamp((lt + 0.2) / 0.5)));
    person('student', 760, 1290, 0.95, { t, alpha: clamp((lt - stu + 0.2) / 0.3), armL: [0.4, 0.2], armR: [1.6, 2.6] });
  }, { pattern: 'leaves', pal: 'green', cx: 470, cy: 760 });
  popText('WHO DESIGNED THIS?', 540, 330, 88, lt + 0.2, { color: '#fff4dc' });
  if (lt > stu) tag('A STUDENT', 760, 760, clamp((lt - stu) / 0.3), { size: 50 });
  if (lt > cut - 0.1) burstBadge('CUT!', 300, 1060, 140, clamp((lt - cut + 0.1) / 0.25), { size: 72, color: '#d6246e', ink: '#fff4dc' });
};
EV.hook = ln => [{ t: 0.05, type: 'whoosh' }, { t: wl(ln, 'student', 0.4) - 0.1, type: 'pop' }, { t: wl(ln, 'cut', 0.75) - 0.1, type: 'stamp' }];

S.advert = ({ t, lt, ln }) => {
  const ta = wl(ln, 'taiwo', 0.25), saw = wl(ln, 'saw', 0.55), des = wl(ln, 'design', 0.7);
  const [shot, st] = shotOf(lt, [saw - 0.1]);
  if (shot === 0) {
    camera(lerp(520, 560, easeInOut(st / 4)), 920, lerp(1.0, 1.1, easeInOut(st / 4)));
    popWorld(t, () => {
      ctx.save(); ctx.globalAlpha = 0.9; skyline(-200, 1300, 1290, t, 4, { min: 160, max: 420 }); ctx.restore();
      person('student', 540, 1290, 1.1, { t, hold: 'paper', armR: [1.2, 2.4], armL: [0.9, 2.2], look: 1 });
    }, { pattern: 'waves', pal: 'indigo', cy: 820, disc: 320 });
    burstBadge('1959', 820, 420, 140, clamp(st / 0.3), { size: 80, color: '#f2b705' });
    tag('TAIWO AKINKUNMI', 540, 330, clamp((lt - ta) / 0.3), { size: 50 });
    if (lt > ta + 1.2) tag('STUDYING IN BRITAIN', 540, 1230, clamp((lt - ta - 1.2) / 0.3), { size: 40, bg: '#1f3fbf', ink: '#fff4dc' });
  } else {
    camera(540, 900, lerp(1.3, 1.1, easeOut(st / 2)));
    whip(st, 1);
    popWorld(t, () => {
      newspaper(540, 880, 1.15, -0.04, 'DESIGN THE FLAG!', clamp((lt - des + 0.2) / 0.3), { title: 'NEWSPAPER', dateline: 'COMPETITION · 1959', hsize: 40 });
    }, { pattern: 'diamonds', pal: 'sunset', cy: 880 });
    popText('FOR A NEW NATION', 540, 330, 88, st - 0.6, { color: '#f2b705' });
  }
};
EV.advert = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'saw', 0.55) - 0.1, type: 'whoosh' }, { t: wl(ln, 'design', 0.7) - 0.2, type: 'stamp' }];

S.entries = ({ t, lt, ln }) => {
  const th = wl(ln, 'thousand', 0.6);
  camera(540, 900, lerp(1.0, 1.08, lt / 2.3));
  popWorld(t, () => {
    const R = rng(8);
    for (let i = 0; i < 46; i++) {
      const x = R() * 1080, delay = R() * 1.2, y = -200 + easeOut(clamp((lt - delay) / 0.8)) * (500 + R() * 800), rot = (R() - 0.5) * 0.8;
      const cols = [['#d6246e', '#f2b705', '#1f3fbf'], ['#0aa3a3', '#fff4dc', '#f26b1d'], ['#f2b705', '#17111c', '#d6246e'], ['#1f3fbf', '#fff4dc', '#0f9d58']][i % 4];
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = K; ctx.fillRect(-56, -36, 120, 80);
      cols.forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(-60 + k * 40, -40, 40, 80); }); ctx.lineWidth = 5; ctx.strokeStyle = K; ctx.strokeRect(-60, -40, 120, 80); ctx.restore();
    }
    const k = clamp((lt - 0.9) / 0.4);
    glow(540, 860, 360, 'rgba(255,240,180,.7)', k);
    ngFlag(540, 860, 360 * easeBack(k) + 0.01, 210 * easeBack(k) + 0.01, t, 1);
  }, { pattern: 'rings', pal: 'teal', cy: 860 });
  burstBadge('≈3,000\nENTRIES', 540, 400, 190, clamp((lt - th + 0.3) / 0.3), { size: 58, color: '#f2b705' });
};
EV.entries = ln => [{ t: 0.1, type: 'whoosh' }, { t: 0.9, type: 'ding' }, { t: wl(ln, 'thousand', 0.6) - 0.3, type: 'pop' }];

S.colours = ({ t, lt, ln }) => {
  const wh = wl(ln, 'white', 0.5);
  camera(540, 880, 1.0);
  popWorld(t, () => {
    ngFlag(540, 860, 760, 460, t, easeOut(clamp(lt / 0.4)));
    const kG = clamp((lt - 0.2) / 0.3), kW = clamp((lt - wh) / 0.3);
    if (kG > 0) for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) { const x = 540 + sx * 255 + (i - 1) * 50; ctx.save(); ctx.globalAlpha = kG; ctx.translate(x, 990); ctx.lineWidth = 8; ctx.strokeStyle = '#f2b705'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -120); ctx.stroke(); for (let g = 0; g < 4; g++) { ctx.beginPath(); ctx.ellipse(g % 2 ? 9 : -9, -110 + g * 22, 8, 16, g % 2 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fillStyle = '#f2b705'; ctx.fill(); } ctx.restore(); }
    if (kW > 0) { ctx.save(); ctx.translate(540, 860); ctx.scale(easeBack(kW), easeBack(kW)); ctx.fillStyle = '#fff4dc'; ctx.strokeStyle = K; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, 70, 40, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(-20, -40, 40, 70, -0.9, 0, Math.PI); ctx.fill(); ctx.stroke(); circle(54, -14, 6, K); ctx.restore(); }
  }, { pattern: 'leaves', pal: 'green', burst: false, ground: false });
  tag('GREEN: LAND & FARMING', 540, 380, clamp((lt - 0.2) / 0.3), { size: 46, bg: NG, ink: '#fff4dc' });
  if (lt > wh) tag('WHITE: PEACE & UNITY', 540, 1240, clamp((lt - wh) / 0.3), { size: 46 });
};
EV.colours = ln => [{ t: 0.2, type: 'pop' }, { t: wl(ln, 'white', 0.5), type: 'pop' }];

S.sun = ({ t, lt, ln }) => {
  const red = wl(ln, 'red', 0.35), rem = wl(ln, 'removed', 0.85);
  camera(540, 880, lerp(1.0, 1.12, easeInOut(lt / 4.5)));
  shake(t, lt > rem ? 14 * Math.exp(-(lt - rem) * 6) : 0);
  popWorld(t, () => {
    ngFlag(540, 860, 680, 410, t, 1);
    const k = clamp((lt - red + 0.2) / 0.4) * (1 - clamp((lt - rem) / 0.35));
    if (k > 0) { ctx.save(); ctx.translate(540, 860); ctx.scale(k, k); ctx.fillStyle = '#e0242c'; for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(-9, -72); ctx.lineTo(0, -130); ctx.lineTo(9, -72); ctx.fill(); } circle(0, 0, 66, '#e0242c'); ctx.lineWidth = 7; ctx.strokeStyle = K; ctx.beginPath(); ctx.arc(0, 0, 66, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (lt > rem - 0.3) { const u = clamp((lt - rem + 0.3) / 0.5); ctx.save(); ctx.translate(lerp(900, 560, u), lerp(560, 860, u)); ctx.rotate(-0.6 + Math.sin(t * 20) * 0.2); ctx.lineWidth = 12; ctx.strokeStyle = K; for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s2 * 30, -130); ctx.stroke(); ctx.beginPath(); ctx.arc(s2 * 34, 40, 28, 0, Math.PI * 2); ctx.fillStyle = '#d6246e'; ctx.fill(); ctx.stroke(); } ctx.restore(); }
  }, { pattern: 'diamonds', pal: 'magenta', burst: false, ground: false });
  tag('HIS ORIGINAL', 540, 380, clamp(lt / 0.3), { size: 54 });
  if (lt > rem) burstBadge('REMOVED!', 540, 1240, 160, clamp((lt - rem) / 0.25), { size: 56, color: '#d6246e', ink: '#fff4dc' });
};
EV.sun = ln => [{ t: wl(ln, 'red', 0.35) - 0.2, type: 'pop' }, { t: wl(ln, 'removed', 0.85), type: 'stamp' }];

S.prize = ({ t, lt, ln }) => {
  const pou = wl(ln, 'pounds', 0.4), oc = wl(ln, 'october', 0.6), up = wlLast(ln, 'up', 0.95);
  const [shot, st] = shotOf(lt, [oc - 0.15]);
  if (shot === 0) {
    camera(540, 900, lerp(1.05, 1.0, easeOut(st / 2)));
    popWorld(t, () => { person('student', 330, 1290, 1.0, { t, armL: [2.4, 2.9], armR: [2.4, 2.9], mood: 'cheer', hop: 0.4 }); }, { pattern: 'suns', pal: 'sunset', cx: 330, cy: 820, disc: 280 });
    banknote(720, 820, 1.1, '£100', 'PRIZE', '#9cd67a', clamp((lt - pou + 0.4) / 0.3), -0.08);
    popText('THE WINNER', 540, 330, 96, st);
  } else {
    const rise = easeInOut(clamp(st / 1.6));
    camera(540, lerp(980, 880, rise), lerp(1.1, 1.0, rise));
    whip(st, 1);
    popWorld(t, () => {
      ctx.lineWidth = 16; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(320, 1290); ctx.lineTo(320, 420); ctx.stroke();
      ngFlag(470, lerp(1150, 520, rise), 290, 170, t, 1);
      crowd(-40, 1120, 1300, 9, t, 12, { cheer: lt > up - 0.4, scale: 1.25 });
    }, { pattern: 'suns', pal: 'green', cy: 700, disc: 260 });
    calendarCard('1', 'OCT', '1960', 820, 560, clamp(st / 0.3), { top: NG });
  }
};
EV.prize = ln => [{ t: wl(ln, 'pounds', 0.4) - 0.4, type: 'ding' }, { t: wl(ln, 'october', 0.6) - 0.15, type: 'whoosh' }, { t: wlLast(ln, 'up', 0.95) - 0.4, type: 'pop' }];

S.cta = ctaScene('GREEN WHITE GREEN', 'REMEMBER HIM', { pal: 'green' });
