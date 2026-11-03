// Channel: ocean facts, hosted by Inky the octopus
// ---------- background ----------
const R = rng(7);
const BUBBLES = Array.from({ length: 28 }, () => ({ x: R() * W, sp: 60 + R() * 130, r: 6 + R() * 18, ph: R() }));
const WEEDS = [70, 175, 1010, 905].map(x => ({ x, h: 260 + R() * 200, ph: R() * 6 }));
drawBg = function (t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a86e8'); g.addColorStop(0.5, '#0d45a0'); g.addColorStop(1, '#06204f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x0 = 120 + i * 170, sw = 0.05 * Math.sin(t * 0.6 + i * 1.7);
    ctx.beginPath(); ctx.moveTo(x0 - 30, -20); ctx.lineTo(x0 + 30, -20);
    ctx.lineTo(x0 + 260 + sw * 900, H * 0.8); ctx.lineTo(x0 + 80 + sw * 900, H * 0.8); ctx.closePath();
    ctx.fillStyle = `rgba(190,230,255,${0.045 + 0.02 * Math.sin(t + i)})`; ctx.fill();
  }
  ctx.restore();
  for (const b of BUBBLES) {
    const y = H + 60 - ((t * b.sp + b.ph * (H + 120)) % (H + 120));
    const x = b.x + 22 * Math.sin(t * 1.4 + b.ph * 9);
    ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
    circle(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.25, 'rgba(255,255,255,.5)');
  }
  for (const w of WEEDS) {
    ctx.beginPath(); ctx.moveTo(w.x, 1800);
    for (let j = 1; j <= 12; j++) { const u = j / 12; ctx.lineTo(w.x + Math.sin(t * 1.3 + w.ph + u * 3) * 40 * u, 1800 - w.h * u); }
    ctx.strokeStyle = '#1f9d6b'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = '#3fd18f'; ctx.lineWidth = 8; ctx.stroke();
  }
  const sg = ctx.createLinearGradient(0, 1720, 0, H); sg.addColorStop(0, '#f3d08a'); sg.addColorStop(1, '#c9974e');
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 1745 + 18 * Math.sin(x / 140) + 8 * Math.sin(x / 47));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = sg; ctx.fill();
  for (const [x, y] of [[160, 1830], [420, 1860], [700, 1820], [930, 1870]]) circle(x, y, 9, 'rgba(160,110,50,.45)');
}

// ---------- characters & props ----------
// Inky the octopus. o: {t, talk, mood:'happy'|'shocked'|'tired', swim, walk, wave, rot, look}
function octo(x, y, s, o) {
  const t = o.t, BODY = '#b15cf6', DARK = '#6d22c4', LIGHT = '#e6c9ff';
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const bx = -119 + i * 34, by = 72, swim = o.swim || 0, walk = o.walk || 0;
    const dir = lerp(Math.PI / 2 + (i - 3.5) * 0.4, Math.PI / 2 + (i - 3.5) * 0.07, swim);
    const L = 230, N = 12, pts = [[bx, by]];
    let px = bx, py = by;
    for (let j = 1; j <= N; j++) {
      const u = j / N;
      let a = dir + Math.sin(t * 3.2 + i * 0.45 - u * 4) * 0.28 * u + (i - 3.5) * 0.05 * u * (1 - swim * 0.5) + swim * Math.sin(t * 9 + i) * 0.14 * u;
      if (walk) { const side = (i - 3.5) / 3.5; a = lerp(a, Math.PI / 2 - side * 1.15 * (1 - u) + Math.sin(t * 7 + i * Math.PI) * 0.3 * u, walk); }
      if (o.wave && i === 7) a = lerp(a, -0.9 - u * 0.6 + Math.sin(t * 9) * 0.6 * u, o.wave);
      px += Math.cos(a) * L / N; py += Math.sin(a) * L / N; pts.push([px, py]);
    }
    for (const [col, extra] of [[DARK, 9], [BODY, 0]]) {
      ctx.strokeStyle = col;
      for (let j = 1; j < pts.length; j++) {
        ctx.lineWidth = lerp(42, 10, j / N) + extra;
        ctx.beginPath(); ctx.moveTo(...pts[j - 1]); ctx.lineTo(...pts[j]); ctx.stroke();
      }
    }
    for (let j = 2; j < pts.length; j += 2) circle(pts[j][0], pts[j][1], lerp(8, 3, j / N), LIGHT);
  }
  // head
  const g = ctx.createRadialGradient(-55, -110, 20, 0, -30, 210);
  g.addColorStop(0, LIGHT); g.addColorStop(0.35, BODY); g.addColorStop(1, DARK);
  ctx.beginPath(); ctx.ellipse(0, -30, 150, 162 + Math.sin(t * 2) * 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = DARK; ctx.stroke();
  for (const [sx, sy, r] of [[-70, -120, 15], [62, -140, 11], [98, -80, 9], [-104, -60, 9]]) circle(sx, sy, r, 'rgba(109,34,196,.45)');
  // eyes
  const mood = o.mood || 'happy';
  const blink = ((t + 0.7) % 3.6) < 0.13 ? 0.12 : 1;
  const er = mood === 'shocked' ? 50 : 41;
  for (const ex of [-58, 58]) {
    ctx.save(); ctx.translate(ex, 0); ctx.scale(1, blink);
    ctx.beginPath(); ctx.ellipse(0, 0, er * 0.9, er * 1.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a0b4d'; ctx.stroke();
    const pr = mood === 'shocked' ? 13 : 21, lx = (o.look || 0) * 10;
    circle(lx, 5, pr, '#1a0b2e'); circle(lx - pr * 0.35, 5 - pr * 0.4, pr * 0.36, '#fff');
    if (mood === 'tired') {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, er * 0.9, er * 1.05, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = BODY; ctx.fillRect(-er, -er * 1.2, er * 2, er * 1.15); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-er * 0.85, -3); ctx.lineTo(er * 0.85, -3); ctx.lineWidth = 7; ctx.strokeStyle = DARK; ctx.stroke();
    }
    ctx.restore();
    if (mood === 'shocked') { ctx.beginPath(); ctx.arc(ex, -40, 34, 1.15 * Math.PI, 1.85 * Math.PI); ctx.lineWidth = 9; ctx.strokeStyle = DARK; ctx.stroke(); }
  }
  ctx.globalAlpha = 0.55;
  for (const cx of [-102, 102]) { ctx.beginPath(); ctx.ellipse(cx, 45, 22, 13, 0, 0, Math.PI * 2); ctx.fillStyle = '#ff7eb6'; ctx.fill(); }
  ctx.globalAlpha = 1;
  // mouth (driven by the voice volume)
  const m = clamp(o.talk || 0);
  if (m > 0.08) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 64, 20 + m * 8, 5 + m * 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a0d2e'; ctx.fill(); ctx.clip();
    ctx.beginPath(); ctx.ellipse(0, 64 + (5 + m * 26) * 0.75, 17, 11, 0, 0, Math.PI * 2); ctx.fillStyle = '#ff6b9a'; ctx.fill();
    ctx.restore();
  } else if (mood === 'shocked') {
    ctx.beginPath(); ctx.ellipse(0, 66, 14, 18, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a0d2e'; ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, 46, 24, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 8; ctx.strokeStyle = DARK; ctx.stroke();
  }
  if (mood === 'tired') {
    for (const [dx, ph] of [[150, 0], [-160, 0.5]]) {
      const p = (t * 1.1 + ph) % 1, dy = -100 + p * 70;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath(); ctx.moveTo(dx, dy - 22); ctx.quadraticCurveTo(dx + 14, dy, dx, dy + 8); ctx.quadraticCurveTo(dx - 14, dy, dx, dy - 22);
      ctx.fillStyle = '#9be7ff'; ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// ---------- scenes (one per voiced line) ----------
S.hook = ({ t, lt, ln, talk }) => {
  const q = wl(ln, 'quits', 0.6), dead = lt > q;
  title('3 HEARTS?!', 300, lt + 0.35, 140);
  [[300, 650, 0.35], [540, 570, 0.55], [780, 650, 0.75]].forEach(([x, y, at], i) => {
    const kk = easeBack((lt - at) / 0.3);
    const isDead = i === 1 && dead;
    const shake = isDead ? Math.sin(t * 60) * 10 * clamp(1 - (lt - q) / 0.5) : 0;
    heart(x + shake, y, (i === 1 ? 160 : 125) * kk, isDead ? 1 : pulse(t + i * 0.13, 100), isDead ? '#7b8191' : '#ff3b5c', { face: !isDead, dead: isDead });
  });
  octo(540, 1050 + Math.sin(t * 2) * 12, 1.15 * lerp(0.6, 1, easeBack((lt + 0.3) / 0.5)), { t, talk, mood: dead ? 'shocked' : 'happy' });
};
EV.hook = ln => [{ t: 0.35, type: 'pop' }, { t: 0.55, type: 'pop' }, { t: 0.75, type: 'pop' }, { t: wl(ln, 'quits', 0.6), type: 'bonk' }];

S.gills = ({ t, lt, talk }) => {
  title('2 GILL HEARTS', 290, lt, 110);
  [250, 830].forEach((x, si) => {
    gill(x, 480, t);
    for (let j = 0; j < 6; j++) {
      const p = (t * 0.9 + j / 6) % 1;
      circle(x + Math.sin(p * 6 + j) * 10, lerp(660, 500, p), 11, mix('#8a93a8', '#38e1ff', p));
    }
    for (let j = 0; j < 3; j++) {
      const p = (t * 0.55 + j / 3 + si * 0.17) % 1;
      ctx.globalAlpha = 1 - p; ctx.font = `900 44px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText('O₂', x + (si ? 1 : -1) * (100 + 20 * Math.sin(p * 7)), 470 - p * 140); ctx.globalAlpha = 1;
    }
    const kk = easeBack((lt - 0.15) / 0.3);
    heart(x, 715, 115 * kk, pulse(t + si * 0.2, 110), '#ff3b5c', { face: true });
    pill(x, 820, 'GILL HEART', '#fff', '#6d22c4', 36, kk);
  });
  octo(540, 1090, 0.95, { t, talk, look: Math.sin(t * 1.5) });
};
EV.gills = () => [{ t: 0.15, type: 'pop' }];

S.main = ({ t, lt, talk }) => {
  for (let j = 0; j < 18; j++) {
    const a = j / 18 * Math.PI * 2;
    for (let m = 0; m < 3; m++) {
      const p = (t * 0.7 + m / 3 + j * 0.05) % 1, r = lerp(120, 430, p);
      circle(540 + Math.cos(a) * r, 640 + Math.sin(a) * r * 0.9, 13 * (1 - p) + 3, `rgba(56,225,255,${1 - p})`);
    }
  }
  octo(540, 1130, 1.0, { t, talk });
  const kk = easeBack(lt / 0.35);
  heart(540, 640, 240 * kk, pulse(t, 90), '#ff3b5c', { face: true });
  pill(540, 850, 'MAIN HEART', '#FFE14D', '#111', 44, kk);
  title('HEART #3', 270, lt, 130);
};
EV.main = () => [{ t: 0.05, type: 'pop' }];

S.stop = ({ t, lt, ln, talk }) => {
  const st = wl(ln, 'stops', 0.6), stopped = lt > st;
  monitor(140, 290, 800, 330, t, lt, st);
  if (stopped) {
    const k = easeBack((lt - st) / 0.3);
    ctx.save(); ctx.translate(540, 720); ctx.rotate(-0.05); ctx.scale(k, k);
    pill(0, 0, 'STOPPED!', '#ff2d2d', '#fff', 70, 1); ctx.restore();
  }
  const sx = 540 + 300 * Math.sin(lt * 1.6), sy = 1100 + 50 * Math.sin(lt * 3.2), vx = Math.cos(lt * 1.6);
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  for (let j = 0; j < 4; j++) {
    const yy = sy - 120 + j * 70, len = 90 + 40 * Math.sin(t * 9 + j);
    ctx.beginPath(); ctx.moveTo(sx - vx * 230, yy); ctx.lineTo(sx - vx * (230 + len), yy); ctx.stroke();
  }
  octo(sx, sy, 0.85, { t, talk, swim: 1, rot: vx * 0.35, mood: stopped ? 'shocked' : 'happy' });
  if (stopped) {
    const a = 0.22 * (0.6 + 0.4 * Math.sin(t * 10));
    const g = ctx.createRadialGradient(540, 960, 500, 540, 960, 1150);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
};
EV.stop = ln => [{ t: wl(ln, 'stops', 0.6), type: 'flat' }];

S.tired = ({ t, lt, d, ln, talk }) => {
  const m = wl(ln, 'most', 0.5);
  if (lt < m) {
    title('EXHAUSTED', 290, lt, 130, '#ffb4c6');
    ctx.save(); ctx.translate(540, 600);
    ctx.beginPath(); ctx.roundRect(-150, -75, 300, 150, 24); ctx.lineWidth = 16; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(158, -30, 26, 60, 8); ctx.fillStyle = '#fff'; ctx.fill();
    if (Math.sin(t * 9) > -0.3) { ctx.beginPath(); ctx.roundRect(-130, -55, 48, 110, 10); ctx.fillStyle = '#ff3b3b'; ctx.fill(); }
    ctx.restore();
    octo(540, 1080 + Math.sin(t * 1.5) * 25, 1.05, { t, talk, mood: 'tired', rot: Math.sin(t * 1.5) * 0.05 });
  } else {
    capY = 820;
    const k = lt - m;
    title('CRAWL > SWIM', 300, k, 125);
    pill(540, 560, 'WAY LESS TIRING', '#4ade80', '#111', 46, easeBack((k - 0.2) / 0.3));
    const x = lerp(260, 820, clamp(k / Math.max(0.5, d - m)));
    octo(x, 1470 - Math.abs(Math.sin(t * 7)) * 10, 0.95, { t, talk, walk: 1, look: 1 });
  }
};
EV.tired = ln => [{ t: wl(ln, 'most', 0.5) - 0.05, type: 'whoosh' }];

S.blood = ({ t, lt, ln, talk }) => {
  const b = wl(ln, 'blue', 0.25), cu = wl(ln, 'copper', 0.55), fe = wl(ln, 'iron', 0.75);
  title('BLUE BLOOD?!', 270, lt, 120, '#5fd4ff');
  if (lt < b) {
    drop(540, 580, 120, '#8a93a8', 1);
    ctx.font = `900 120px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText('?', 540, 625);
  } else {
    drop(540, 580 + Math.sin(t * 3) * 8, 125, '#1e90ff', easeBack((lt - b) / 0.35));
  }
  tile(320, 860, 'Cu', 'COPPER', '#d4773a', easeBack((lt - cu) / 0.3));
  tile(760, 860, 'Fe', 'IRON', '#7b8494', easeBack((lt - fe) / 0.3), clamp((lt - fe - 0.3) / 0.5));
  octo(540, 1150, 0.88, { t, talk, mood: lt < b + 0.8 ? 'shocked' : 'happy' });
};
EV.blood = ln => [{ t: wl(ln, 'blue', 0.25), type: 'pop' }, { t: wl(ln, 'copper', 0.55), type: 'ding' }, { t: wl(ln, 'iron', 0.75) + 0.3, type: 'buzz' }];

S.cta = ({ t, lt, talk }) => {
  title('WEIRD ANIMAL FACTS', 300, lt, 100);
  const k = easeBack((lt - 0.1) / 0.35);
  ctx.save(); ctx.translate(540, 560); const p = pulse(t, 70); ctx.scale(p, p);
  pill(0, 0, 'FOLLOW +', '#ff2d55', '#fff', 72, k); ctx.restore();
  octo(540, 1060, 1.2 * lerp(0.7, 1, easeBack((lt + 0.2) / 0.4)), { t, talk, wave: 1 });
};
EV.cta = () => [{ t: 0.1, type: 'ding' }];

