// Channel: Nigerian history, hosted by Ìjàpá the tortoise
CAP_HI = '#7CFF8A';
const NG = '#008751';
const NR = rng(11);
const DOTS = Array.from({ length: 40 }, () => ({ x: NR() * W, y: NR() * 1700, r: 10 + NR() * 26, ph: NR() * 6 }));

drawBg = function (t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ffb347'); g.addColorStop(0.55, '#f07b2a'); g.addColorStop(1, '#a8431d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // adire-style indigo pattern, very faint
  ctx.save(); ctx.globalAlpha = 0.09; ctx.strokeStyle = '#3b1b6e'; ctx.lineWidth = 6;
  for (let y = -60; y < H; y += 120) for (let x = ((y / 120) % 2) * 60 - 60; x < W + 60; x += 120) {
    ctx.beginPath(); ctx.arc(x, y + Math.sin(t * 0.5 + x) * 4, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  circle(820, 520, 210, 'rgba(255,240,180,.35)');
  for (const d of DOTS) circle(d.x, d.y + Math.sin(t + d.ph) * 10, d.r * 0.25, 'rgba(255,255,255,.18)');
  // savanna ground + palm trees
  ctx.fillStyle = '#5a8f2e'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 1730 + 20 * Math.sin(x / 170)); ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = '#3f6e1c'; ctx.fillRect(0, 1830, W, 90);
  for (const [px, h] of [[80, 380], [990, 330]]) {
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, 1760); ctx.quadraticCurveTo(px + 30, 1760 - h / 2, px + 10, 1760 - h); ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(t * 1.2 + k) * 0.05;
      ctx.strokeStyle = '#2f7a1f'; ctx.lineWidth = 22;
      ctx.beginPath(); ctx.moveTo(px + 10, 1760 - h);
      ctx.quadraticCurveTo(px + 10 + Math.cos(a) * 110, 1760 - h + Math.sin(a) * 110 - 20, px + 10 + Math.cos(a) * 190, 1760 - h + Math.sin(a) * 150 + 60); ctx.stroke();
    }
  }
};

// Ìjàpá: a wise tortoise with round glasses and a green-white-green fila cap
function ijapa(x, y, s, o) {
  const t = o.t;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const SKIN = '#9bc45b', SKD = '#5f8a2a';
  // feet
  for (const [fx, fy] of [[-150, 170], [150, 170], [-120, 60], [120, 60]]) {
    ctx.beginPath(); ctx.ellipse(fx, fy + Math.sin(t * 6 + fx) * (o.walk ? 8 : 0), 50, 38, 0, 0, Math.PI * 2);
    ctx.fillStyle = SKIN; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = SKD; ctx.stroke();
  }
  // shell
  ctx.beginPath(); ctx.ellipse(0, 110, 210, 130, 0, Math.PI, 0); ctx.lineTo(210, 110); ctx.closePath();
  ctx.fillStyle = '#8a5a2b'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#4e2f12'; ctx.stroke();
  ctx.fillStyle = '#b47a3c';
  for (const [hx, hy, r] of [[0, 30, 46], [-105, 70, 38], [105, 70, 38], [-55, 0, 0]]) if (r) {
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ctx.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.8); }
    ctx.closePath(); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#4e2f12'; ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0, 112, 214, 26, 0, 0, Math.PI * 2); ctx.fillStyle = '#d9b16a'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#4e2f12'; ctx.stroke();
  // neck + head
  const bob = Math.sin(t * 2.2) * 6;
  ctx.beginPath(); ctx.roundRect(-48, -20 + bob, 96, 120, 40); ctx.fillStyle = SKIN; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = SKD; ctx.stroke();
  ctx.translate(0, -90 + bob);
  ctx.beginPath(); ctx.ellipse(0, 0, 120, 105, 0, 0, Math.PI * 2);
  const hg = ctx.createRadialGradient(-40, -40, 10, 0, 0, 140); hg.addColorStop(0, '#c8e88f'); hg.addColorStop(1, SKIN);
  ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = SKD; ctx.stroke();
  // fila cap (green-white-green), tilted
  ctx.save(); ctx.translate(-10, -88); ctx.rotate(-0.18);
  ctx.beginPath(); ctx.moveTo(-95, 20); ctx.quadraticCurveTo(-90, -55, 10, -62); ctx.quadraticCurveTo(110, -55, 95, 20); ctx.closePath();
  ctx.save(); ctx.clip();
  ctx.fillStyle = NG; ctx.fillRect(-100, -70, 70, 100); ctx.fillStyle = '#fff'; ctx.fillRect(-30, -70, 64, 100); ctx.fillStyle = NG; ctx.fillRect(34, -70, 70, 100);
  ctx.restore(); ctx.lineWidth = 7; ctx.strokeStyle = '#0b3d22'; ctx.stroke();
  ctx.restore();
  // eyes + glasses
  const blink = ((t + 1.3) % 4.1) < 0.13 ? 0.12 : 1;
  const mood = o.mood || 'happy';
  for (const ex of [-45, 45]) {
    ctx.save(); ctx.translate(ex, -5); ctx.scale(1, blink);
    circle(0, 0, 26, '#fff'); circle((o.look || 0) * 6, 3, mood === 'shocked' ? 9 : 14, '#1b1b1b'); circle(-4, -4, 5, '#fff');
    ctx.restore();
    ctx.beginPath(); ctx.arc(ex, -5, 36, 0, Math.PI * 2); ctx.lineWidth = 7; ctx.strokeStyle = '#3a2410'; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.quadraticCurveTo(0, -18, 9, -8); ctx.lineWidth = 7; ctx.strokeStyle = '#3a2410'; ctx.stroke();
  ctx.globalAlpha = 0.45; circle(-80, 35, 16, '#ff8a8a'); circle(80, 35, 16, '#ff8a8a'); ctx.globalAlpha = 1;
  const m = clamp(o.talk || 0);
  if (m > 0.08) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 52, 26 + m * 6, 4 + m * 22, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a1f12'; ctx.fill(); ctx.clip();
    ctx.beginPath(); ctx.ellipse(0, 52 + (4 + m * 22) * 0.8, 18, 10, 0, 0, Math.PI * 2); ctx.fillStyle = '#ff7b8a'; ctx.fill(); ctx.restore();
  } else if (mood === 'shocked') { ctx.beginPath(); ctx.ellipse(0, 55, 12, 16, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a1f12'; ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, 38, 30, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 8; ctx.strokeStyle = '#3a2410'; ctx.stroke(); }
  ctx.restore();
}

// simplified Nigeria outline (lon, lat)
const NG_POLY = [[2.7, 6.4], [2.75, 7.9], [3.1, 9.1], [3.6, 10.3], [3.6, 11.7], [4.0, 12.6], [4.2, 13.5], [5.5, 13.85], [6.8, 13.1], [7.8, 13.35], [9.0, 12.85], [10.6, 13.0], [12.3, 13.1], [13.6, 13.6], [14.2, 13.1], [14.6, 12.2], [14.2, 11.2], [13.5, 10.1], [13.2, 9.0], [12.4, 8.4], [11.8, 7.0], [11.0, 6.5], [9.8, 6.1], [8.9, 5.0], [8.5, 4.6], [7.0, 4.4], [6.0, 4.3], [5.4, 5.2], [4.5, 6.3], [3.4, 6.4]];
const NIGER = [[3.6, 11.9], [4.2, 10.8], [4.8, 9.2], [5.6, 8.8], [6.75, 7.8], [6.8, 6.2], [6.2, 4.9]];
const BENUE = [[12.8, 9.3], [11.5, 9.2], [10.3, 8.5], [8.5, 7.7], [6.75, 7.8]];
function mapXY(lon, lat, m) { return [m.x + (lon - 8.65) * m.s, m.y - (lat - 9.1) * m.s]; }
function ngMap(m, o = {}) {
  ctx.beginPath(); NG_POLY.forEach(([a, b], i) => { const [x, y] = mapXY(a, b, m); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
  ctx.fillStyle = o.fill || NG; ctx.fill(); ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.stroke();
}
function river(pts, m, prog, w = 14) {
  ctx.beginPath(); const n = Math.max(1, Math.floor(prog * (pts.length - 1) * 20));
  for (let i = 0; i <= n; i++) {
    const f = i / 20, k = Math.min(pts.length - 2, Math.floor(f)), u = f - k;
    const [a, b] = pts[k], [c, d] = pts[k + 1];
    const [x, y] = mapXY(lerp(a, c, u), lerp(b, d, u), m); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w + 8; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = '#2b8cff'; ctx.stroke();
}
function newspaper(x, y, s, rot, headline, hk = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-190, -235, 400, 490);
  ctx.fillStyle = '#f6f0e1'; ctx.fillRect(-200, -250, 400, 490); ctx.lineWidth = 6; ctx.strokeStyle = '#222'; ctx.strokeRect(-200, -250, 400, 490);
  ctx.fillStyle = '#111'; ctx.font = `900 40px "DejaVu Serif", serif`; ctx.textAlign = 'center'; ctx.fillText('THE TIMES', 0, -195);
  ctx.font = `700 22px "DejaVu Serif", serif`; ctx.fillText('LONDON · 8 JANUARY 1897', 0, -160);
  ctx.fillRect(-180, -145, 360, 4);
  if (headline && hk > 0) { ctx.save(); ctx.translate(0, -95); ctx.scale(hk, hk); ctx.fillStyle = '#ffe14d'; ctx.fillRect(-150, -32, 300, 60); ctx.fillStyle = '#111'; ctx.font = `900 50px "DejaVu Serif", serif`; ctx.fillText(headline, 0, 14); ctx.restore(); }
  ctx.fillStyle = '#9a958a';
  for (let r = 0; r < 9; r++) { ctx.fillRect(-180, -40 + r * 30, 170, 12); ctx.fillRect(10, -40 + r * 30, 170, 12); }
  ctx.restore();
}
function portrait(x, y, name, k, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.roundRect(-130, -160, 260, 320, 20); ctx.fillStyle = '#c99a4b'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#6b4a1a'; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-105, -135, 210, 240, 12); ctx.fillStyle = '#efe1c4'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#5b4a3a';
  ctx.beginPath(); ctx.ellipse(0, 120, 95, 80, 0, Math.PI, 0); ctx.fill();
  circle(0, -15, 52, '#5b4a3a');
  if (o.hat) { ctx.beginPath(); ctx.ellipse(0, -60, 90, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-45, -105, 90, 50); }
  if (o.moustache) { ctx.fillStyle = '#efe1c4'; ctx.beginPath(); ctx.ellipse(0, 5, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.restore();
  pill(x, y + 175 * k, name, '#fff', '#111', 34, k);
}
function flag(x, y, w, h, t, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = '#5b3a1e'; ctx.fillRect(-w / 2 - 22, -h / 2 - 20, 16, h * 2.2);
  const N = 30;
  for (let i = 0; i < N; i++) {
    const u = i / N, xx = -w / 2 + u * w, dy = Math.sin(t * 5 - u * 6) * 18 * u;
    ctx.fillStyle = u < 1 / 3 || u >= 2 / 3 ? NG : '#fff';
    const shade = 0.85 + 0.15 * Math.cos(t * 5 - u * 6);
    ctx.filter = `brightness(${shade})`;
    ctx.fillRect(xx, -h / 2 + dy, w / N + 1, h);
  }
  ctx.filter = 'none'; ctx.restore();
}
const MAP = { x: 540, y: 640, s: 62 };

S.hook = ({ t, lt, ln, talk }) => {
  title('NAMED BY A JOURNALIST?!', 280, lt + 0.3, 92, '#fff');
  const k = easeBack((lt + 0.2) / 0.5);
  newspaper(540, 700, 0.95 * k, Math.sin(t * 1.5) * 0.06 + (1 - k) * 3, 'NIGERIA', popIn(lt, 0.6));
  ijapa(540, 1170, 1.05, { t, talk, mood: lt > wl(ln, 'wasnt', 0.6) ? 'shocked' : 'happy' });
};
EV.hook = () => [{ t: 0.6, type: 'pop' }];

S.flora = ({ t, lt, ln, talk }) => {
  title('1897', 270, lt, 160);
  portrait(300, 690, 'FLORA SHAW', popIn(lt, wl(ln, 'flora', 0.5) - 0.1), { hat: true });
  newspaper(780, 700, 0.7 * popIn(lt, wl(ln, 'times', 0.8) - 0.1), 0.08, '', 0);
  emoji('✍️', 600, 900, 110 * popIn(lt, 0.3), Math.sin(t * 6) * 0.15);
  ijapa(540, 1190, 0.85, { t, talk, look: -1 });
};
EV.flora = ln => [{ t: wl(ln, 'flora', 0.5) - 0.1, type: 'pop' }, { t: wl(ln, 'times', 0.8) - 0.1, type: 'pop' }];

S.river = ({ t, lt, ln, talk }) => {
  ngMap(MAP, { fill: 'rgba(0,135,81,.85)' });
  const rv = wl(ln, 'river', 0.5);
  river(NIGER, MAP, clamp((lt - rv + 0.3) / 1.2));
  river(BENUE, MAP, clamp((lt - rv - 0.6) / 1.0), 11);
  if (lt > rv) { const [x, y] = mapXY(4.6, 10.2, MAP); text('RIVER NIGER', x - 10, y, 40, '#fff', { k: popIn(lt, rv), rot: -0.4 }); }
  const k1 = popIn(lt, wl(ln, 'nigeria', 0.3));
  pill(330, 1110, 'NIGER', '#2b8cff', '#fff', 48, k1); text('+', 540, 1110, 70, '#fff', { k: k1 });
  pill(720, 1110, 'IA', '#fff', '#111', 48, k1);
  title('NIGER + IA', 230, lt, 110);
  ijapa(880, 1240, 0.55, { t, talk, look: -1 });
};
EV.river = ln => [{ t: wl(ln, 'nigeria', 0.3), type: 'pop' }, { t: wl(ln, 'river', 0.5), type: 'whoosh' }];

S.lugard = ({ t, lt, ln, talk }) => {
  title('A COLONIAL MARRIAGE', 270, lt, 96, '#fff');
  portrait(290, 700, 'FLORA SHAW', popIn(lt, 0.05), { hat: true });
  portrait(790, 700, 'LORD LUGARD', popIn(lt, wl(ln, 'frederick', 0.35) - 0.1), { moustache: true });
  const kr = popIn(lt, wl(ln, 'married', 0.25));
  emoji('💍', 540, 650, 120 * kr, Math.sin(t * 3) * 0.2);
  pill(540, 800, '1902', '#ffe14d', '#111', 46, kr);
  ijapa(540, 1190, 0.85, { t, talk });
};
EV.lugard = ln => [{ t: wl(ln, 'married', 0.25), type: 'ding' }, { t: wl(ln, 'frederick', 0.35) - 0.1, type: 'pop' }];

S.amalg = ({ t, lt, ln, talk }) => {
  const j = wl(ln, 'joined', 0.3), st = wl(ln, 'stuck', 0.9);
  const sep = 140 * (1 - easeOut((lt - j) / 0.9));
  const [, cutY] = mapXY(0, 8.0, MAP);
  for (const [top, dy, fill, label] of [[true, -sep, '#0a7a48', 'NORTH'], [false, sep, '#18a865', 'SOUTH']]) {
    ctx.save(); ctx.beginPath(); top ? ctx.rect(0, 0, W, cutY) : ctx.rect(0, cutY, W, H); ctx.clip();
    ctx.translate(0, dy); ngMap(MAP, { fill }); ctx.restore();
    if (sep > 20) text(label, 540, (top ? cutY - 150 : cutY + 110) + dy, 64, '#fff');
  }
  title('1914', 250, lt, 160);
  if (lt > st) pill(540, 1080, 'ONE COUNTRY: NIGERIA', '#fff', NG, 50, popIn(lt, st));
  ijapa(880, 1240, 0.55, { t, talk, look: -1 });
};
EV.amalg = ln => [{ t: wl(ln, 'joined', 0.3) + 0.85, type: 'bonk' }, { t: wl(ln, 'stuck', 0.9), type: 'ding' }];

S.indep = ({ t, lt, ln, talk }) => {
  title('INDEPENDENCE!', 270, lt, 120, '#fff');
  flag(540, 640, 560, 300, t, popIn(lt, 0.05, 0.4));
  pill(540, 900, '1 OCTOBER 1960', '#ffe14d', '#111', 56, popIn(lt, wl(ln, 'october', 0.2)));
  const R2 = rng(5);
  for (let i = 0; i < 40; i++) {
    const x = R2() * W, sp = 200 + R2() * 300, ph = R2();
    const y = ((lt * sp + ph * 1600) % 1700) - 100;
    ctx.save(); ctx.translate(x + Math.sin(t * 3 + i) * 30, y); ctx.rotate(t * 4 + i);
    ctx.fillStyle = i % 3 ? NG : '#fff'; ctx.fillRect(-12, -6, 24, 12); ctx.restore();
  }
  ijapa(540, 1200, 0.85, { t, talk, rot: Math.sin(t * 8) * 0.05 });
};
EV.indep = ln => [{ t: 0.05, type: 'ding' }, { t: wl(ln, 'october', 0.2), type: 'pop' }];

S.cta = ({ t, lt, talk }) => {
  title('RENAME NIGERIA?', 290, lt, 110, '#fff');
  emoji('💬', 540, 600, 200 * popIn(lt, 0.1), Math.sin(t * 2) * 0.08);
  ctx.save(); ctx.translate(540, 820); const p = pulse(t, 70); ctx.scale(p, p); pill(0, 0, 'FOLLOW +', '#ff2d55', '#fff', 64, popIn(lt, 0.3)); ctx.restore();
  ijapa(540, 1190, 1.0, { t, talk });
};
EV.cta = () => [{ t: 0.1, type: 'pop' }];
