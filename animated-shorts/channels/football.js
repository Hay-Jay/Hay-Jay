// Channel: football debates (Messi vs Ronaldo), stadium setting with a live scoreboard
CAP_HI = '#38f28b';
const FR = rng(21);
const CROWD = Array.from({ length: 260 }, () => ({ x: FR() * W, y: 330 + FR() * 420, c: ['#e84a5f', '#4aa8ff', '#ffd54a', '#ffffff', '#7a5cff'][Math.floor(FR() * 5)], ph: FR() * 6 }));
let POINTS = [];   // [{t, who}]
const MESSI = { shirt: '#75b9ff', stripes: '#ffffff', num: '10', name: 'MESSI', hair: '#5a3a1e', beard: true, skin: '#f2c7a0', shorts: '#1b2a4a' };
const CR7 = { shirt: '#d9213a', stripes: null, num: '7', name: 'RONALDO', hair: '#1a1a1a', beard: false, skin: '#e7b48a', shorts: '#14532d' };

chInit = tl => {
  POINTS = [];
  for (const ln of tl.lines) {
    const pts = ln.words.filter(w => /^point/i.test(w.w));
    if (!pts.length) continue;
    const who = /messi/i.test(ln.text.split(/point/i).pop()) ? 'M' : 'R';
    POINTS.push({ t: pts[pts.length - 1].s, who });
  }
};
function score(t) { let m = 0, r = 0; for (const p of POINTS) if (t >= p.t + 0.25) p.who === 'M' ? m++ : r++; return [m, r]; }

drawBg = function (t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#060b1f'); g.addColorStop(0.45, '#0f1d4a'); g.addColorStop(1, '#0a2a12');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // floodlights
  for (const fx of [120, 960]) {
    const lg = ctx.createRadialGradient(fx, 220, 10, fx, 220, 520);
    lg.addColorStop(0, 'rgba(255,255,230,.55)'); lg.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, 900);
    ctx.fillStyle = '#e8eefc'; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) circle(fx - 45 + j * 30, 200 + i * 28, 10, '#fffbe0');
  }
  // crowd
  ctx.fillStyle = '#141b33'; ctx.fillRect(0, 320, W, 450);
  for (const c of CROWD) circle(c.x, c.y + Math.max(0, Math.sin(t * 6 + c.ph)) * -8, 11, c.c);
  for (let i = 0; i < 6; i++) { const fl = Math.sin(t * 13 + i * 7) > 0.97; if (fl) circle(80 + i * 180, 400 + (i % 2) * 120, 20, 'rgba(255,255,255,.9)'); }
  ctx.fillStyle = '#1d2747'; ctx.fillRect(0, 760, W, 30);
  // pitch with stripes
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#2f9e44' : '#37b24d'; ctx.fillRect(0, 790 + i * 95, W, 95); }
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(540, 1350, 320, 110, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 1350); ctx.lineTo(W, 1350); ctx.stroke();
};

function player(p, x, y, s, o) {
  const t = o.t, jump = o.jump || 0, mood = o.mood || 'neutral';
  const hop = jump ? -Math.abs(Math.sin(t * 7)) * 60 * jump : 0;
  ctx.save(); ctx.translate(x, y + hop); ctx.scale(s * (o.flip ? -1 : 1), s);
  // legs + boots
  for (const lx of [-40, 40]) {
    ctx.fillStyle = p.skin; ctx.fillRect(lx - 18, 120, 36, 120);
    ctx.fillStyle = '#fff'; ctx.fillRect(lx - 20, 170, 40, 60);
    ctx.beginPath(); ctx.roundRect(lx - 28, 230, 62, 30, 12); ctx.fillStyle = '#ffcc00'; ctx.fill();
  }
  ctx.beginPath(); ctx.roundRect(-80, 70, 160, 80, 18); ctx.fillStyle = p.shorts; ctx.fill();
  // arms (raised when celebrating)
  const up = mood === 'happy' ? 1 : 0;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 92, -100); ctx.rotate(side * (up ? -2.4 + Math.sin(t * 9) * 0.2 : 0.25));
    ctx.beginPath(); ctx.roundRect(-22, 0, 44, 150, 22); ctx.fillStyle = p.shirt; ctx.fill();
    circle(0, 150, 24, p.skin); ctx.restore();
  }
  // shirt
  ctx.beginPath(); ctx.roundRect(-100, -130, 200, 220, 40); ctx.fillStyle = p.shirt; ctx.fill();
  if (p.stripes) { ctx.save(); ctx.clip(); ctx.fillStyle = p.stripes; for (let sx = -75; sx < 100; sx += 60) ctx.fillRect(sx, -130, 26, 220); ctx.restore(); }
  ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
  ctx.save(); ctx.scale(o.flip ? -1 : 1, 1); text(p.num, 0, -10, 110, '#fff', { stroke: '#0b1530' }); ctx.restore();
  // head
  ctx.translate(0, -215);
  ctx.fillStyle = p.skin; ctx.fillRect(-26, 40, 52, 50);
  circle(0, 0, 92, p.skin);
  ctx.fillStyle = p.hair; ctx.beginPath(); ctx.ellipse(0, -48, 96, 56, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-10, -70, 80, 40, -0.2, 0, Math.PI * 2); ctx.fill();
  if (p.beard) { ctx.beginPath(); ctx.ellipse(0, 50, 72, 48, 0, 0, Math.PI); ctx.fill(); }
  const blink = ((t + x / 300) % 3.3) < 0.12 ? 0.15 : 1;
  for (const ex of [-32, 32]) { ctx.save(); ctx.translate(ex, -5); ctx.scale(1, blink); circle(0, 0, 16, '#fff'); circle(0, 3, 9, '#1a1a1a'); ctx.restore(); }
  for (const ex of [-32, 32]) { ctx.beginPath(); ctx.moveTo(ex - 18, mood === 'sad' ? -28 : -34); ctx.lineTo(ex + 18, mood === 'sad' ? -36 : -34); ctx.lineWidth = 8; ctx.strokeStyle = p.hair; ctx.stroke(); }
  ctx.lineWidth = 8; ctx.strokeStyle = '#5a1f1f'; ctx.lineCap = 'round'; ctx.beginPath();
  if (mood === 'happy') { ctx.arc(0, 28, 30, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fillStyle = '#5a1f1f'; ctx.fill(); }
  else if (mood === 'sad') ctx.arc(0, 60, 24, 1.2 * Math.PI, 1.8 * Math.PI);
  else { ctx.moveTo(-20, 38); ctx.lineTo(20, 38); }
  ctx.stroke();
  ctx.restore();
  pill(x, y + hop + 300 * s, p.name, '#fff', '#0b1530', 40, 1);
}
function goldBall(x, y, r, k = 1) {
  if (k <= 0) return; r *= k;
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#fff7c2'); g.addColorStop(0.5, '#f5c518'); g.addColorStop(1, '#a87a00');
  circle(x, y, r, g);
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); }
  ctx.closePath(); ctx.fillStyle = 'rgba(120,80,0,.5)'; ctx.fill(); ctx.restore();
}
function grid(n, cx, cy, per, gap, lt, start, draw) {
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / per), c = i % per, cols = Math.min(per, n - r * per);
    draw(cx + (c - (cols - 1) / 2) * gap, cy + r * gap, popIn(lt, start + i * 0.09, 0.25));
  }
}
function pointStamp(lt, at, who) {
  const k = popIn(lt, at, 0.3); if (k <= 0) return;
  ctx.save(); ctx.translate(who === 'M' ? 260 : 820, 1285); ctx.rotate(who === 'M' ? -0.12 : 0.12);
  pill(0, 0, '+1 POINT', '#38f28b', '#0b1530', 54, k); ctx.restore();
}
const pointAt = ln => { const w = ln.words.filter(w => /^point/i.test(w.w)).pop(); return w ? w.s - ln.start : (ln.end - ln.start) * 0.8; };

overlay = t => {
  // persistent scoreboard
  const [m, r] = score(t);
  ctx.save(); ctx.translate(540, 175);
  ctx.beginPath(); ctx.roundRect(-400, -60, 800, 120, 30); ctx.fillStyle = 'rgba(8,12,30,.92)'; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = '#38f28b'; ctx.stroke();
  text('MESSI', -240, 0, 46, '#75b9ff', { stroke: false }); text('RONALDO', 240, 0, 46, '#ff5a6e', { stroke: false });
  ctx.beginPath(); ctx.roundRect(-75, -45, 150, 90, 18); ctx.fillStyle = '#fff'; ctx.fill();
  const last = POINTS.filter(p => t >= p.t + 0.25).pop();
  const bump = last ? 1 + 0.35 * Math.exp(-(t - last.t - 0.25) * 8) : 1;
  text(`${m} - ${r}`, 0, 2, 62, '#0b1530', { stroke: false, k: bump });
  ctx.restore();
};

S.hook = ({ t, lt, ln, talk }) => {
  const k = easeOut((lt + 0.2) / 0.5);
  player(MESSI, lerp(-200, 260, k), 1050, 0.95, { t, mood: 'neutral' });
  player(CR7, lerp(1280, 820, k), 1050, 0.95, { t, mood: 'neutral', flip: true });
  const v = popIn(lt, 0.35, 0.35);
  ctx.save(); ctx.translate(540, 600); ctx.rotate(-0.1 + Math.sin(t * 4) * 0.05);
  text('VS', 0, 0, 200 * v, '#ffe14d', { stroke: '#7a1010' }); ctx.restore();
  title('TROPHIES ONLY', 400, lt - wl(ln, 'trophies', 0.4) + 0.1, 110, '#fff');
};
EV.hook = ln => [{ t: 0.35, type: 'bonk' }, { t: wl(ln, 'trophies', 0.4), type: 'pop' }];

function versus(ln, t, lt, titleStr, mWin, drawLeft, drawRight) {
  const pa = pointAt(ln), won = lt > pa;
  title(titleStr, 400, lt, 100, '#ffe14d');
  drawLeft(); drawRight();
  player(MESSI, 260, 1150, 0.7, { t, mood: won ? (mWin ? 'happy' : 'sad') : 'neutral', jump: won && mWin ? 1 : 0 });
  player(CR7, 820, 1150, 0.7, { t, mood: won ? (mWin ? 'sad' : 'happy') : 'neutral', jump: won && !mWin ? 1 : 0, flip: true });
  pointStamp(lt, pa, mWin ? 'M' : 'R');
}
S.ballon = ({ t, lt, ln }) => versus(ln, t, lt, "BALLON D'OR", true,
  () => { grid(8, 260, 560, 4, 88, lt, wl(ln, 'eight', 0.3) - 0.3, (x, y, k) => goldBall(x, y, 36, k)); text('8', 260, 780, 90, '#fff', { k: popIn(lt, wl(ln, 'eight', 0.3)) }); },
  () => { grid(5, 820, 560, 3, 88, lt, wl(ln, 'five', 0.6) - 0.3, (x, y, k) => goldBall(x, y, 36, k)); text('5', 820, 780, 90, '#fff', { k: popIn(lt, wl(ln, 'five', 0.6)) }); });
EV.ballon = ln => [{ t: wl(ln, 'eight', 0.3), type: 'pop' }, { t: wl(ln, 'five', 0.6), type: 'pop' }, { t: pointAt(ln), type: 'ding' }];

S.ucl = ({ t, lt, ln }) => versus(ln, t, lt, 'CHAMPIONS LEAGUE', false,
  () => { grid(4, 260, 570, 2, 105, lt, wl(ln, 'four', 0.6) - 0.3, (x, y, k) => emoji('🏆', x, y, 80 * k)); text('4', 260, 790, 90, '#fff', { k: popIn(lt, wl(ln, 'four', 0.6)) }); },
  () => { grid(5, 820, 570, 3, 95, lt, wl(ln, 'five', 0.3) - 0.3, (x, y, k) => emoji('🏆', x, y, 76 * k)); text('5', 820, 790, 90, '#fff', { k: popIn(lt, wl(ln, 'five', 0.3)) }); });
EV.ucl = ln => [{ t: wl(ln, 'five', 0.3), type: 'pop' }, { t: wl(ln, 'four', 0.6), type: 'pop' }, { t: pointAt(ln), type: 'ding' }];

S.wc = ({ t, lt, ln }) => versus(ln, t, lt, 'WORLD CUP', true,
  () => { const k = popIn(lt, wl(ln, 'lifted', 0.3)); emoji('🏆', 260, 600, 170 * k, Math.sin(t * 5) * 0.1); pill(260, 760, '2022', '#ffe14d', '#111', 44, k); },
  () => { const k = popIn(lt, wl(ln, 'never', 0.6)); text('0', 820, 610, 170, '#fff', { k }); emoji('❌', 820, 760, 70 * k); });
EV.wc = ln => [{ t: wl(ln, 'lifted', 0.3), type: 'pop' }, { t: wl(ln, 'never', 0.6), type: 'buzz' }, { t: pointAt(ln), type: 'ding' }];

S.intl = ({ t, lt, ln }) => versus(ln, t, lt, 'INTERNATIONAL GOALS', false,
  () => { text('?', 260, 620, 150, 'rgba(255,255,255,.5)', { stroke: false }); },
  () => { const k = popIn(lt, wl(ln, 'alltime', 0.35) - 0.2); emoji('⚽', 820, 560, 120 * k, t * 3); pill(820, 700, '#1 ALL-TIME', '#ffe14d', '#111', 44, k); });
EV.intl = ln => [{ t: wl(ln, 'alltime', 0.35) - 0.2, type: 'pop' }, { t: pointAt(ln), type: 'ding' }];

S.draw = ({ t, lt, talk }) => {
  title("IT'S A DRAW?!", 420, lt, 130, '#ffe14d');
  player(MESSI, 260, 1100, 0.8, { t, mood: 'neutral' });
  player(CR7, 820, 1100, 0.8, { t, mood: 'neutral', flip: true });
  const k = popIn(lt, 0.4);
  emoji('🫵', 540, 760, 160 * k, Math.sin(t * 5) * 0.1);
};
EV.draw = () => [{ t: 0.4, type: 'bonk' }];

S.cta = ({ t, lt }) => {
  title('WHO IS YOUR GOAT?', 420, lt, 110, '#fff');
  player(MESSI, 260, 1100, 0.8, { t, mood: 'happy', jump: 0.4 });
  player(CR7, 820, 1100, 0.8, { t, mood: 'happy', jump: 0.4, flip: true });
  emoji('🐐', 540, 680, 150 * popIn(lt, 0.2), Math.sin(t * 3) * 0.15);
  ctx.save(); ctx.translate(540, 860); const p = pulse(t, 70); ctx.scale(p, p); pill(0, 0, 'FOLLOW +', '#ff2d55', '#fff', 56, popIn(lt, 0.4)); ctx.restore();
};
EV.cta = () => [{ t: 0.2, type: 'pop' }];
