// Channel: "What if" hypotheticals, hosted by Orbit the little robot
CAP_HI = '#5ef0ff';
const WR = rng(33);
const STARS = Array.from({ length: 160 }, () => ({ x: WR() * W, y: WR() * H, r: 1 + WR() * 3, ph: WR() * 6 }));
let darkness = 0;

drawBg = function (t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a0b3d'); g.addColorStop(0.6, '#0b1440'); g.addColorStop(1, '#050816');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const neb = ctx.createRadialGradient(250, 500, 20, 250, 500, 600);
  neb.addColorStop(0, 'rgba(180,80,255,.25)'); neb.addColorStop(1, 'rgba(180,80,255,0)');
  ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
  for (const s of STARS) circle(s.x, s.y, s.r * (0.7 + 0.3 * Math.sin(t * 3 + s.ph)), `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 2 + s.ph)})`);
};

function earth(x, y, r, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt || 0);
  const glow = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.25);
  glow.addColorStop(0, 'rgba(90,180,255,.45)'); glow.addColorStop(1, 'rgba(90,180,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#1f6fe0'; ctx.fill();
  ctx.save(); ctx.clip();
  const land = [[-0.5, -0.3, 0.35, 0.25], [0.1, 0.25, 0.3, 0.38], [0.55, -0.35, 0.28, 0.2], [-0.2, 0.55, 0.22, 0.15], [0.9, 0.2, 0.25, 0.3]];
  const off = (t * 0.12) % 2.4;
  for (const [lx, ly, rx, ry] of land) for (const sh of [0, -2.4]) {
    ctx.beginPath(); ctx.ellipse((lx + off + sh) * r, ly * r, rx * r, ry * r, 0.4, 0, Math.PI * 2); ctx.fillStyle = '#3cc46b'; ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(0, -r * 0.95, r * 0.6, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, r * 0.97, r * 0.5, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  const sh = ctx.createLinearGradient(-r, 0, r, 0); sh.addColorStop(0.5, 'rgba(0,0,30,0)'); sh.addColorStop(1, 'rgba(0,0,30,.55)');
  ctx.fillStyle = sh; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
  if (o.axis) { ctx.strokeStyle = '#ff5ad1'; ctx.lineWidth = 8; ctx.setLineDash([22, 14]); ctx.beginPath(); ctx.moveTo(0, -r * 1.45); ctx.lineTo(0, r * 1.45); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
function moon(x, y, r, k = 1) {
  if (k <= 0) return; r *= k;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#f4f4ef'); g.addColorStop(1, '#a9a9b5');
  const glow = ctx.createRadialGradient(x, y, r, x, y, r * 1.8); glow.addColorStop(0, 'rgba(255,255,230,.3)'); glow.addColorStop(1, 'rgba(255,255,230,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  circle(x, y, r, g);
  for (const [cx, cy, cr] of [[-0.35, -0.2, 0.18], [0.25, 0.3, 0.22], [0.3, -0.35, 0.12], [-0.2, 0.45, 0.1]]) circle(x + cx * r, y + cy * r, cr * r, 'rgba(120,120,135,.45)');
}
// Orbit: a small round robot with a screen face
function robot(x, y, s, o) {
  const t = o.t, fl = Math.sin(t * 2) * 14;
  ctx.save(); ctx.translate(x, y + fl); ctx.rotate(o.rot || Math.sin(t * 1.3) * 0.05); ctx.scale(s, s);
  // jet flame
  ctx.beginPath(); ctx.moveTo(-30, 190); ctx.quadraticCurveTo(0, 270 + Math.sin(t * 30) * 20, 30, 190); ctx.fillStyle = '#ffb02e'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-15, 190); ctx.quadraticCurveTo(0, 235, 15, 190); ctx.fillStyle = '#fff3b0'; ctx.fill();
  ctx.beginPath(); ctx.roundRect(-90, 80, 180, 120, 40); ctx.fillStyle = '#dfe7f5'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#6b7a99'; ctx.stroke();
  circle(0, 140, 22, o.alarm && Math.sin(t * 12) > 0 ? '#ff4d4d' : '#5ef0ff');
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 95, 110); ctx.rotate(side * (o.wave && side > 0 ? -2.2 + Math.sin(t * 9) * 0.4 : 0.4));
    ctx.beginPath(); ctx.roundRect(-16, 0, 32, 90, 16); ctx.fillStyle = '#c3cee3'; ctx.fill(); ctx.stroke(); circle(0, 95, 20, '#6b7a99'); ctx.restore();
  }
  ctx.strokeStyle = '#6b7a99'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, -130); ctx.lineTo(0, -185); ctx.stroke();
  circle(0, -195, 18, Math.sin(t * 5) > 0 ? '#ff5ad1' : '#ff9be6');
  ctx.beginPath(); ctx.roundRect(-140, -135, 280, 220, 70); ctx.fillStyle = '#f2f6fc'; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = '#6b7a99'; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-110, -105, 220, 160, 50); ctx.fillStyle = '#0d1630'; ctx.fill();
  const blink = ((t + 0.4) % 3.4) < 0.12;
  const mood = o.mood || 'happy';
  ctx.fillStyle = '#5ef0ff'; ctx.shadowColor = '#5ef0ff'; ctx.shadowBlur = 20;
  for (const ex of [-48, 48]) {
    if (blink) ctx.fillRect(ex - 22, -40, 44, 7);
    else if (mood === 'shocked') { ctx.beginPath(); ctx.arc(ex, -38, 24, 0, Math.PI * 2); ctx.lineWidth = 9; ctx.strokeStyle = '#5ef0ff'; ctx.stroke(); }
    else if (mood === 'sad') { ctx.beginPath(); ctx.ellipse(ex, -30, 14, 18, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(ex, -38, 16, 24, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // mouth = audio equalizer
  const m = clamp(o.talk || 0);
  for (let i = 0; i < 7; i++) {
    const h = 6 + m * 40 * (0.5 + 0.5 * Math.sin(i * 1.7 + t * 25));
    ctx.fillRect(-56 + i * 17, 20 - h / 2, 10, h);
  }
  ctx.shadowBlur = 0; ctx.restore();
}
function house(x, y, s, lit) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#1b2242'; ctx.fillRect(-120, -100, 240, 160);
  ctx.beginPath(); ctx.moveTo(-145, -95); ctx.lineTo(0, -210); ctx.lineTo(145, -95); ctx.fill();
  ctx.fillStyle = lit ? '#ffd86b' : '#2c355e'; ctx.fillRect(-80, -60, 55, 55); ctx.fillRect(25, -60, 55, 55);
  ctx.restore();
}

S.hook = ({ t, lt, ln, talk }) => {
  const v = wl(ln, 'vanished', 0.6);
  title('WHAT IF...', 270, lt + 0.35, 130, '#5ef0ff');
  earth(540, 760, 230, t);
  const gone = clamp((lt - v) / 0.35);
  if (gone < 1) moon(860, 470, 90 * (1 - gone) + 0.01, 1);
  if (lt > v) {
    const p = clamp((lt - v) / 1.2), R3 = rng(9);
    for (let i = 0; i < 26; i++) { const a = R3() * 6.28, d = 30 + p * (120 + R3() * 220); circle(860 + Math.cos(a) * d, 470 + Math.sin(a) * d, 12 * (1 - p), `rgba(230,230,240,${1 - p})`); }
    text('POOF!', 860, 470, 80, '#fff', { k: popIn(lt, v, 0.25) * (1 - p * 0.6), rot: -0.15 });
  }
  robot(540, 1210, 0.85, { t, talk, mood: lt > v ? 'shocked' : 'happy' });
};
EV.hook = ln => [{ t: wl(ln, 'vanished', 0.6), type: 'whoosh' }, { t: wl(ln, 'vanished', 0.6) + 0.1, type: 'pop' }];

S.night = ({ t, lt, ln, talk }) => {
  const d = wl(ln, 'darker', 0.4), dk = clamp((lt - d + 0.3) / 0.8);
  moon(800, 520, 90, 1 - dk);
  for (const [hx, hs] of [[250, 1], [560, 1.2], [860, 0.9]]) house(hx, 1020, hs, true);
  ctx.fillStyle = '#121735'; ctx.fillRect(0, 1080, W, 120);
  ctx.fillStyle = `rgba(0,0,10,${0.7 * dk})`; ctx.fillRect(0, 0, W, H);
  title('DARKER NIGHTS', 270, lt, 120);
  robot(540, 1170, 0.7, { t, talk, mood: dk > 0.5 ? 'sad' : 'happy' });
  if (dk > 0.5) emoji('🔦', 800, 1130, 90 * popIn(lt, d + 0.6), -0.4);
};
EV.night = ln => [{ t: wl(ln, 'darker', 0.4), type: 'whoosh' }];

S.tides = ({ t, lt, ln, talk }) => {
  title('TINY TIDES', 270, lt, 130);
  const sh = clamp((lt - wl(ln, 'shrink', 0.3)) / 1.2);
  // beach cross-section
  ctx.save(); ctx.beginPath(); ctx.roundRect(110, 400, 860, 560, 40); ctx.clip();
  ctx.fillStyle = '#9bd3ff'; ctx.fillRect(110, 400, 860, 560);
  const amp = lerp(150, 50, easeOut(sh)), lvl = 720 - Math.sin(t * 2.2) * amp;
  ctx.fillStyle = '#e9c27a'; ctx.beginPath(); ctx.moveTo(110, 960); ctx.lineTo(970, 560); ctx.lineTo(970, 960); ctx.fill();
  ctx.fillStyle = 'rgba(30,110,230,.9)'; ctx.beginPath(); ctx.moveTo(110, 960);
  for (let x = 110; x <= 970; x += 20) ctx.lineTo(x, lvl + Math.sin(x / 50 + t * 4) * 10); ctx.lineTo(970, 960); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.roundRect(110, 400, 860, 560, 40); ctx.stroke();
  const pct = Math.round(lerp(100, 33, easeOut(sh)));
  pill(540, 1030, `TIDE SIZE: ${pct}%`, pct < 50 ? '#ffe14d' : '#fff', '#111', 52, 1);
  emoji('☀️', 860, 480, 90 * popIn(lt, wl(ln, 'sun', 0.7)));
  robot(540, 1170, 0.6, { t, talk });
};
EV.tides = ln => [{ t: wl(ln, 'shrink', 0.3), type: 'whoosh' }, { t: wl(ln, 'sun', 0.7), type: 'pop' }];

S.animals = ({ t, lt, ln, talk }) => {
  title('ANIMAL CHAOS', 270, lt, 130, '#ff9be6');
  [['🦉', 220, 560, 'hunt'], ['🐢', 540, 520, 'migrate'], ['🦀', 860, 560, 'breed']].forEach(([e, x, y, w], i) => {
    const k = popIn(lt, wl(ln, w, 0.2 + i * 0.1) - 0.1);
    emoji(e, x + Math.sin(t * 8 + i) * 8 * (k > 0 ? 1 : 0), y, 150 * k, Math.sin(t * 6 + i) * 0.2);
    if (k > 0) text('?', x + 80, y - 80, 80, '#fff', { k, rot: 0.2 });
  });
  const c = wl(ln, 'corals', 0.7), kc = popIn(lt, c - 0.1);
  emoji('🪸', 400, 850, 150 * kc); emoji('🌕', 690, 830, 110 * kc, Math.sin(t) * 0.1);
  if (kc > 0) pill(540, 980, 'CORALS SPAWN BY THE MOON', '#fff', '#111', 38, kc);
  robot(540, 1170, 0.6, { t, talk, mood: 'shocked' });
};
EV.animals = ln => [{ t: wl(ln, 'hunt', 0.2) - 0.1, type: 'pop' }, { t: wl(ln, 'migrate', 0.3) - 0.1, type: 'pop' }, { t: wl(ln, 'breed', 0.4) - 0.1, type: 'pop' }, { t: wl(ln, 'corals', 0.7) - 0.1, type: 'ding' }];

S.tilt = ({ t, lt, ln, talk }) => {
  title('WOBBLY EARTH', 270, lt, 130);
  const wb = clamp((lt - wl(ln, 'wobble', 0.5) + 0.2) / 0.6);
  earth(540, 680, 210, t, { axis: true, tilt: 0.41 + Math.sin(t * 2.5) * 0.5 * wb });
  const ks = popIn(lt, wl(ln, 'climate', 0.85) - 0.2);
  emoji('🥵', 230, 980, 120 * ks, Math.sin(t * 4) * 0.2); emoji('🥶', 850, 980, 120 * ks, -Math.sin(t * 4) * 0.2);
  pill(540, 460, 'MILLIONS OF YEARS', '#ff5ad1', '#fff', 40, popIn(lt, wl(ln, 'millions', 0.2)));
  robot(540, 1170, 0.6, { t, talk, alarm: wb > 0.5, rot: Math.sin(t * 2.5) * 0.15 * wb });
};
EV.tilt = ln => [{ t: wl(ln, 'wobble', 0.5), type: 'bonk' }, { t: wl(ln, 'climate', 0.85) - 0.2, type: 'pop' }];

S.good = ({ t, lt, ln, talk }) => {
  title('GOOD NEWS!', 270, lt, 130, '#7CFF8A');
  earth(260, 700, 150, t);
  const k = popIn(lt, 0.2);
  moon(840, 700, 75, k);
  const ka = popIn(lt, wl(ln, 'drifts', 0.6) - 0.1);
  if (ka > 0) {
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 10; ctx.setLineDash([20, 14]); ctx.beginPath(); ctx.moveTo(430, 700); ctx.lineTo(740, 700); ctx.stroke(); ctx.setLineDash([]);
    pill(590, 870, '+3.8 CM / YEAR', '#ffe14d', '#111', 50, ka);
    ctx.beginPath(); ctx.moveTo(930, 700); ctx.lineTo(970 + Math.sin(t * 5) * 10, 700); ctx.lineWidth = 12; ctx.stroke();
  }
  robot(540, 1170, 0.7, { t, talk, mood: 'happy' });
};
EV.good = ln => [{ t: 0.2, type: 'ding' }, { t: wl(ln, 'drifts', 0.6) - 0.1, type: 'pop' }];

S.cta = ({ t, lt, talk }) => {
  title('WHAT NEXT?', 300, lt, 130, '#5ef0ff');
  emoji('💬', 540, 600, 190 * popIn(lt, 0.1), Math.sin(t * 2) * 0.08);
  ctx.save(); ctx.translate(540, 830); const p = pulse(t, 70); ctx.scale(p, p); pill(0, 0, 'FOLLOW +', '#ff2d55', '#fff', 64, popIn(lt, 0.3)); ctx.restore();
  robot(540, 1210, 0.85, { t, talk, wave: 1 });
};
EV.cta = () => [{ t: 0.1, type: 'pop' }];
