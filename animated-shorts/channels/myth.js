// Channel: Greek mythology, hosted by Glaux, Athena's little owl
CAP_HI = '#ffd166';
const MR = rng(44);
const MSTARS = Array.from({ length: 90 }, () => ({ x: MR() * W, y: MR() * 900, r: 1 + MR() * 2.5, ph: MR() * 6 }));
const GOLD = '#e8b84a';

function meander(y, h) {
  ctx.fillStyle = '#1a1030'; ctx.fillRect(0, y, W, h);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 6; ctx.beginPath();
  const u = h * 0.7, y0 = y + h * 0.15;
  for (let x = -u; x < W + u; x += u) {
    ctx.moveTo(x, y0 + u); ctx.lineTo(x, y0); ctx.lineTo(x + u * 0.75, y0); ctx.lineTo(x + u * 0.75, y0 + u * 0.6);
    ctx.lineTo(x + u * 0.3, y0 + u * 0.6); ctx.lineTo(x + u * 0.3, y0 + u * 0.3);
  }
  ctx.stroke();
}
drawBg = function (t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120a2e'); g.addColorStop(0.5, '#2b1752'); g.addColorStop(1, '#4a2a5e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of MSTARS) circle(s.x, s.y, s.r, `rgba(255,240,200,${0.5 + 0.4 * Math.sin(t * 2 + s.ph)})`);
  // temple silhouette
  ctx.fillStyle = 'rgba(255,230,190,.08)';
  ctx.beginPath(); ctx.moveTo(60, 1180); ctx.lineTo(540, 980); ctx.lineTo(1020, 1180); ctx.fill();
  for (let i = 0; i < 7; i++) ctx.fillRect(100 + i * 140, 1190, 60, 560);
  ctx.fillRect(60, 1180, 960, 30); ctx.fillRect(40, 1740, 1000, 40);
  meander(1780, 70);
  ctx.fillStyle = '#120a20'; ctx.fillRect(0, 1850, W, 70);
};

// Glaux the owl, with a golden laurel wreath
function owl(x, y, s, o) {
  const t = o.t, mood = o.mood || 'happy';
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 8); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const BR = '#8a5a3c', BRD = '#5a3622', CR = '#f1dcb5';
  // wings
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 125, 20); ctx.rotate(side * (0.15 + (o.flap ? Math.abs(Math.sin(t * 10)) * 0.6 : 0)));
    ctx.beginPath(); ctx.ellipse(0, 40, 55, 120, 0, 0, Math.PI * 2); ctx.fillStyle = BRD; ctx.fill(); ctx.restore();
  }
  // body
  ctx.beginPath(); ctx.ellipse(0, 30, 150, 175, 0, 0, Math.PI * 2); ctx.fillStyle = BR; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = BRD; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 80, 95, 110, 0, 0, Math.PI * 2); ctx.fillStyle = CR; ctx.fill();
  ctx.strokeStyle = '#c9a77a'; ctx.lineWidth = 5;
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { ctx.beginPath(); ctx.arc(c * 40 + (r % 2) * 20 - 10, 50 + r * 40, 14, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
  // feet
  for (const fx of [-50, 50]) for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(fx + k * 16, 200, 9, 18, k * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#f2a33a'; ctx.fill(); }
  // ear tufts
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 70, -120); ctx.lineTo(side * 135, -190); ctx.lineTo(side * 120, -95); ctx.fillStyle = BR; ctx.fill(); }
  // face disc + eyes
  const blink = ((t + 0.9) % 3.9) < 0.13 ? 0.12 : 1;
  for (const ex of [-55, 55]) {
    circle(ex, -50, 62, CR);
    ctx.save(); ctx.translate(ex, -50); ctx.scale(1, mood === 'wise' ? 0.55 * blink : blink);
    circle(0, 0, 46, '#ffb627'); circle((o.look || 0) * 8, 0, mood === 'shocked' ? 16 : 26, '#1a0f05'); circle(-9, -10, 9, '#fff');
    ctx.restore();
  }
  // beak (opens with the voice)
  const m = clamp(o.talk || 0);
  ctx.fillStyle = '#f2a33a';
  ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(20, -10); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill();
  if (m > 0.08) { ctx.beginPath(); ctx.moveTo(-14, 12 + m * 4); ctx.lineTo(14, 12 + m * 4); ctx.lineTo(0, 30 + m * 22); ctx.closePath(); ctx.fillStyle = '#d9822b'; ctx.fill(); }
  // laurel wreath
  ctx.strokeStyle = GOLD; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, -40, 150, 1.12 * Math.PI, 1.88 * Math.PI); ctx.stroke();
  for (let k = 0; k <= 10; k++) {
    const a = (1.12 + 0.76 * k / 10) * Math.PI;
    ctx.save(); ctx.translate(Math.cos(a) * 150, -40 + Math.sin(a) * 150); ctx.rotate(a + (k < 5 ? -0.6 : 0.6));
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 24, 0, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
// a Greek storage jar (pithos)
function pithos(x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const lid = o.lid || 0;
  ctx.beginPath(); ctx.moveTo(-70, -200); ctx.bezierCurveTo(-90, -150, -200, -120, -190, 20); ctx.bezierCurveTo(-180, 160, -90, 220, -60, 230);
  ctx.lineTo(60, 230); ctx.bezierCurveTo(90, 220, 180, 160, 190, 20); ctx.bezierCurveTo(200, -120, 90, -150, 70, -200); ctx.closePath();
  const g = ctx.createLinearGradient(-190, 0, 190, 0); g.addColorStop(0, '#8a3d1c'); g.addColorStop(0.4, '#c8693a'); g.addColorStop(1, '#6e2c12');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#3a1608'; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#1b0b04'; ctx.fillRect(-200, -60, 400, 60);
  ctx.strokeStyle = '#e9b072'; ctx.lineWidth = 5; ctx.beginPath();
  for (let xx = -200; xx < 200; xx += 40) { ctx.moveTo(xx, -10); ctx.lineTo(xx, -50); ctx.lineTo(xx + 28, -50); ctx.lineTo(xx + 28, -22); ctx.lineTo(xx + 12, -22); }
  ctx.stroke();
  ctx.fillStyle = '#1b0b04'; ctx.fillRect(-200, 110, 400, 18); ctx.restore();
  ctx.beginPath(); ctx.roundRect(-82, -225, 164, 32, 10); ctx.fillStyle = '#7a3418'; ctx.fill(); ctx.stroke();
  // lid
  ctx.save(); ctx.translate(lid * 120, -235 - lid * 120); ctx.rotate(lid * 0.8);
  ctx.beginPath(); ctx.ellipse(0, 0, 80, 18, 0, 0, Math.PI * 2); ctx.fillStyle = '#5e2610'; ctx.fill(); ctx.stroke();
  circle(0, -18, 14, '#5e2610'); ctx.restore();
  ctx.restore();
}
function box(x, y, s, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.fillStyle = '#9c6b3c'; ctx.fillRect(-120, -80, 240, 160); ctx.fillStyle = '#b8834f'; ctx.fillRect(-130, -110, 260, 40);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 8; ctx.strokeRect(-120, -80, 240, 160); ctx.strokeRect(-130, -110, 260, 40);
  circle(0, -10, 16, GOLD); ctx.restore();
}
function cross(x, y, r, p) {
  if (p <= 0) return;
  ctx.lineCap = 'round'; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 22;
  const a = easeOut(p * 2), b = easeOut(p * 2 - 1);
  ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x - r + 2 * r * a, y - r + 2 * r * a); ctx.stroke();
  if (b > 0) { ctx.beginPath(); ctx.moveTo(x + r, y - r); ctx.lineTo(x + r - 2 * r * b, y - r + 2 * r * b); ctx.stroke(); }
}

S.hook = ({ t, lt, ln, talk }) => {
  title("PANDORA'S BOX?", 280, lt + 0.35, 115, '#ffd166');
  box(540, 640, 1.3, easeBack((lt + 0.25) / 0.5));
  cross(540, 640, 200, clamp((lt - wlLast(ln, 'box', 0.85)) / 0.5));
  owl(540, 1150, 0.95, { t, talk, mood: 'wise' });
};
EV.hook = ln => [{ t: wlLast(ln, 'box', 0.85), type: 'buzz' }];

S.jar = ({ t, lt, ln, talk }) => {
  title('IT WAS A JAR', 270, lt, 120, '#ffd166');
  pithos(540, 690, 1.05 * easeBack(lt / 0.45));
  pill(540, 990, 'πίθος · PITHOS', '#ffd166', '#111', 46, popIn(lt, wl(ln, 'pithos', 0.8) - 0.1));
  owl(540, 1180, 0.75, { t, talk });
};
EV.jar = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'pithos', 0.8) - 0.1, type: 'ding' }];

S.fire = ({ t, lt, ln, talk }) => {
  title('A PUNISHMENT', 270, lt, 120, '#ff8c5a');
  const kz = popIn(lt, wl(ln, 'zeus', 0.05));
  emoji('⚡', 290, 560, 190 * kz, Math.sin(t * 9) * 0.12); pill(290, 720, 'ZEUS', '#fff', '#111', 44, kz);
  const kp = popIn(lt, wl(ln, 'prometheus', 0.5) - 0.1);
  emoji('🔥', 790, 560, 190 * kp, Math.sin(t * 7) * 0.08); pill(790, 720, 'PROMETHEUS', '#fff', '#111', 40, kp);
  const kh = popIn(lt, wl(ln, 'humans', 0.85) - 0.1);
  emoji('🧍', 640, 870, 90 * kh); emoji('🧍‍♀️', 740, 870, 90 * kh); emoji('🧍', 840, 870, 90 * kh);
  if (kz > 0 && kp > 0) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 10; ctx.setLineDash([18, 12]); ctx.beginPath(); ctx.moveTo(420, 560); ctx.lineTo(660, 560); ctx.stroke(); ctx.setLineDash([]); }
  owl(540, 1180, 0.75, { t, talk, look: Math.sin(t) });
};
EV.fire = ln => [{ t: wl(ln, 'zeus', 0.05), type: 'bonk' }, { t: wl(ln, 'prometheus', 0.5) - 0.1, type: 'whoosh' }, { t: wl(ln, 'humans', 0.85) - 0.1, type: 'pop' }];

S.open = ({ t, lt, ln, talk }) => {
  const op = wl(ln, 'opened', 0.2);
  const lid = clamp((lt - op) / 0.4);
  title('OOPS.', 270, lt - op, 140, '#ff6b6b');
  pithos(540, 760, 0.85, { lid });
  if (lid > 0) {
    const R4 = rng(3);
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI / 2 + (R4() - 0.5) * 2.2, sp = 250 + R4() * 400, ph = R4();
      const p = ((lt - op) * 0.6 + ph) % 1, d = p * sp;
      circle(540 + Math.cos(a) * d, 560 + Math.sin(a) * d, 26 * (1 - p) + 6, `rgba(40,10,60,${0.85 * (1 - p)})`);
    }
    [['🦠', 'sickness', 260, 520], ['😫', 'work', 820, 520], ['⛈️', 'trouble', 540, 420]].forEach(([e, w, x, y]) => {
      const k = popIn(lt, wl(ln, w, 0.6) - 0.15);
      emoji(e, x + Math.sin(t * 4 + x) * 15, y + Math.cos(t * 3 + x) * 12, 130 * k);
    });
  }
  owl(540, 1180, 0.75, { t, talk, mood: lid > 0 ? 'shocked' : 'happy', flap: lid > 0 ? 1 : 0 });
};
EV.open = ln => [{ t: wl(ln, 'opened', 0.2), type: 'whoosh' }, { t: wl(ln, 'sickness', 0.5) - 0.15, type: 'pop' }, { t: wl(ln, 'work', 0.6) - 0.15, type: 'pop' }, { t: wl(ln, 'trouble', 0.8) - 0.15, type: 'bonk' }];

S.hope = ({ t, lt, ln, talk }) => {
  const h = wl(ln, 'hope', 0.8);
  pithos(540, 760, 0.85, { lid: 1 });
  if (lt > h - 0.2) {
    const k = easeOut((lt - h + 0.2) / 0.8);
    const gl = ctx.createRadialGradient(540, 520, 10, 540, 520, 420 * k);
    gl.addColorStop(0, 'rgba(255,230,140,.9)'); gl.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 100, W, 900);
    emoji('✨', 540, 500 + Math.sin(t * 3) * 10, 120 * k);
    title('HOPE', 330, lt - h + 0.2, 170, '#fff3b0');
  } else title('ONLY ONE THING...', 300, lt, 100, '#ffd166');
  owl(540, 1180, 0.75, { t, talk, mood: 'wise' });
};
EV.hope = ln => [{ t: wl(ln, 'hope', 0.8) - 0.2, type: 'ding' }];

S.box = ({ t, lt, ln, talk }) => {
  const er = wl(ln, 'erasmus', 0.55), mi = wl(ln, 'mistake', 0.85);
  title('WHERE DID THE BOX COME FROM?', 270, lt, 80, '#ffd166');
  const k = popIn(lt, er - 0.15);
  emoji('📜', 270, 600, 170 * k, Math.sin(t * 2) * 0.1); pill(270, 760, 'ERASMUS, 1500s', '#fff', '#111', 38, k);
  pithos(700, 600, 0.45); box(900, 650, 0.45, popIn(lt, wlLast(ln, 'box', 0.7) - 0.1));
  text('→', 805, 640, 90, '#fff', { k: popIn(lt, wlLast(ln, 'box', 0.7) - 0.1) });
  pill(790, 860, 'TRANSLATION FAIL', '#ff3b3b', '#fff', 40, popIn(lt, mi - 0.1));
  owl(540, 1180, 0.75, { t, talk });
};
EV.box = ln => [{ t: wl(ln, 'erasmus', 0.55) - 0.15, type: 'pop' }, { t: wl(ln, 'mistake', 0.85) - 0.1, type: 'buzz' }];

S.cta = ({ t, lt, talk }) => {
  title('MYTHS, CORRECTED', 300, lt, 110, '#ffd166');
  emoji('🏛️', 540, 590, 180 * popIn(lt, 0.1));
  ctx.save(); ctx.translate(540, 820); const p = pulse(t, 70); ctx.scale(p, p); pill(0, 0, 'FOLLOW +', '#ff2d55', '#fff', 64, popIn(lt, 0.3)); ctx.restore();
  owl(540, 1160, 0.9, { t, talk, flap: 1 });
};
EV.cta = () => [{ t: 0.1, type: 'ding' }];
