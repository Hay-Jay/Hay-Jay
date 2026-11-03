// Channel: Nigerian history, hosted by Ìjàpá the tortoise.
// Look: Ankara wax-print pop-art. Bold outlines, wax-print patterns on backgrounds and clothes, comic bursts and halftone dots.
CAP_HI = '#ffd23a';
Object.assign(FX, { blur: 4, shutter: 0.55, grain: 0.025, vignette: 0.28, grade: null, punch: false });
drawBg = () => {};

const POP = '"Lilita One", "Inter", "DejaVu Sans", sans-serif';
const K = '#17111c';                       // outline ink
const NG = '#008751';
const PALS = {
  sunset: ['#f26b1d', '#f2b705', '#d6246e', '#1f4ed8', '#fff4dc'],
  indigo: ['#1f3fbf', '#0aa3a3', '#f2b705', '#d6246e', '#fff4dc'],
  green: ['#0f9d58', '#f2b705', '#fff4dc', '#f26b1d', '#0b5d3a'],
  magenta: ['#d6246e', '#f26b1d', '#f2b705', '#1f3fbf', '#fff4dc'],
  teal: ['#0aa3a3', '#f2b705', '#d6246e', '#1f3fbf', '#fff4dc'],
  dusk: ['#3a2a6e', '#d6246e', '#f2b705', '#0aa3a3', '#fff4dc'],
  somber: ['#3b3340', '#7a5a4a', '#b08a5a', '#2a2a3a', '#e8dcc8'],
};

// ======================= Ankara wax-print patterns =======================
function tile(kind, palName) {
  const p = PALS[palName] || PALS.sunset;
  return cached(`tile-${kind}-${palName}`, 240, 240, (w, h) => {
    const o = (fn) => { ctx.lineWidth = 5; ctx.strokeStyle = K; fn(); };
    if (kind === 'rings') {
      ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
      for (const [cx, cy] of [[60, 60], [180, 180], [180, -60], [-60, 180], [300, 60], [60, 300]]) {
        [[54, p[1]], [40, p[2]], [26, p[3]], [12, p[4]]].forEach(([r, c]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); o(() => ctx.stroke()); });
      }
      for (const [cx, cy] of [[180, 60], [60, 180]]) { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 7, 0, Math.PI * 2); ctx.fillStyle = p[4]; ctx.fill(); } circle(cx, cy, 14, p[3]); }
    } else if (kind === 'leaves') {
      ctx.fillStyle = p[1]; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        ctx.save(); ctx.translate(30 + i * 60, 30 + j * 60); ctx.rotate((i + j) % 2 ? 0.8 : -0.8);
        ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2); ctx.fillStyle = (i + j) % 2 ? p[0] : p[2]; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = K; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      }
    } else if (kind === 'diamonds') {
      ctx.fillStyle = p[2]; ctx.fillRect(0, 0, w, h);
      for (let i = -1; i < 3; i++) for (let j = -1; j < 3; j++) {
        const cx = 60 + i * 120 + (j % 2 ? 60 : 0), cy = 60 + j * 120;
        ctx.beginPath(); ctx.moveTo(cx, cy - 56); ctx.lineTo(cx + 56, cy); ctx.lineTo(cx, cy + 56); ctx.lineTo(cx - 56, cy); ctx.closePath();
        ctx.fillStyle = (i + j) % 2 ? p[0] : p[3]; ctx.fill(); o(() => ctx.stroke());
        circle(cx, cy, 14, p[4]); circle(cx, cy, 6, K);
      }
    } else if (kind === 'waves') {
      ctx.fillStyle = p[3]; ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 5; r++) { ctx.beginPath(); for (let x = 0; x <= w; x += 6) ctx.lineTo(x, r * 60 + 30 + Math.sin(x / w * Math.PI * 4) * 16); ctx.lineWidth = 16; ctx.strokeStyle = r % 2 ? p[0] : p[1]; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = K; ctx.stroke(); }
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) circle(30 + i * 60, j * 60, 6, p[4]);
    } else if (kind === 'suns') {
      ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
      for (const [cx, cy] of [[60, 60], [180, 180], [180, -60], [-60, 180], [300, 60], [60, 300]]) {
        ctx.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? 30 : 52; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = p[1]; ctx.fill(); o(() => ctx.stroke());
        circle(cx, cy, 22, p[3]); circle(cx, cy, 9, p[4]);
      }
      for (const [cx, cy] of [[180, 60], [60, 180]]) { circle(cx, cy, 16, p[2]); circle(cx, cy, 6, p[4]); }
    }
  });
}
function pat(kind, palName, scale = 1, ox = 0, oy = 0) {
  const pt = ctx.createPattern(tile(kind, palName), 'repeat');
  pt.setTransform(new DOMMatrix().translate(ox, oy).scale(scale));
  return pt;
}
const HALFTONE = () => cached('halftone', 1080, 1920, (w, h) => {
  ctx.fillStyle = K;
  for (let y = 0; y < h; y += 22) for (let x = (y / 22 % 2) * 11; x < w; x += 22) {
    const d = Math.hypot((x - w / 2) / w, (y - h * 0.45) / h), r = clamp((d - 0.38) * 22, 0, 8.5);
    if (r > 0.3) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  }
});

// ======================= worlds =======================
// popWorld: a wax-print backdrop, an optional colour disc or sunburst behind the subject, and a ground band.
function popWorld(t, main, o = {}) {
  const palName = o.pal || 'sunset', p = PALS[palName];
  layer(0.12, () => {
    ctx.fillStyle = pat(o.pattern || 'rings', palName, o.patScale || 1.25, t * 6, t * 3);
    ctx.fillRect(-300, -300, 1700, 2500);
    ctx.fillStyle = `rgba(23,17,28,${o.dim ?? 0.35})`; ctx.fillRect(-300, -300, 1700, 2500);
  });
  layer(0.4, () => {
    if (o.burst !== false) {
      const cx = o.cx ?? 540, cy = o.cy ?? 860, R = o.R ?? 760;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.12);
      for (let k = 0; k < 24; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, k / 24 * Math.PI * 2, (k + 0.5) / 24 * Math.PI * 2); ctx.closePath(); ctx.fillStyle = k % 2 ? (o.ray1 || p[1]) : (o.ray2 || p[0]); ctx.globalAlpha = 0.85; ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
      circle(cx, cy, (o.disc ?? 330), o.discColor || p[4]); ctx.lineWidth = 12; ctx.strokeStyle = K; ctx.beginPath(); ctx.arc(cx, cy, o.disc ?? 330, 0, Math.PI * 2); ctx.stroke();
    }
  });
  layer(1, () => {
    if (o.ground !== false) {
      ctx.fillStyle = o.groundColor || p[3]; ctx.fillRect(-400, 1290, 2000, 700);
      ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = pat(o.pattern || 'rings', palName, 0.9); ctx.fillRect(-400, 1346, 2000, 700); ctx.restore();
      ctx.fillStyle = pat(o.groundPattern || 'diamonds', o.groundPal || palName, 0.6); ctx.fillRect(-400, 1290, 2000, 56);
      ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(-400, 1290); ctx.lineTo(1600, 1290); ctx.moveTo(-400, 1346); ctx.lineTo(1600, 1346); ctx.stroke();
    }
    if (main) main();
  });
  if (o.halftone !== false) { ctx.save(); ctx.globalAlpha = 0.22; ctx.drawImage(HALFTONE(), 0, 0); ctx.restore(); }
  if (o.tint) { ctx.save(); ctx.fillStyle = o.tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

// ======================= type =======================
function popText(str, x, y, size, lt, o = {}) {
  if (lt < 0) return;
  ctx.save(); ctx.font = `${size}px ${POP}`;
  const full = ctx.measureText(str).width, fit = Math.min(1, (o.maxW || 960) / full);
  ctx.translate(x, y); ctx.scale(fit, fit); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const x0 = -full / 2, step = o.step ?? 0.03;
  for (let i = 0; i < str.length; i++) {
    const k = easeBack(clamp((lt - i * step) / 0.22)); if (k <= 0) continue;
    const xi = x0 + ctx.measureText(str.slice(0, i)).width, rot = (i % 2 ? 1 : -1) * 0.04;
    ctx.save(); ctx.translate(xi, 0); ctx.rotate(rot * (o.wobble ?? 1)); ctx.scale(k, k);
    ctx.fillStyle = K; ctx.fillText(str[i], size * 0.06, size * 0.08);
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = K; ctx.strokeText(str[i], 0, 0);
    ctx.fillStyle = o.color || '#fff4dc'; ctx.fillText(str[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
function burstBadge(str, x, y, r, k, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -0.08) + (1 - k) * 0.6); ctx.scale(easeBack(k), easeBack(k));
  ctx.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, rr = i % 2 ? r * 0.78 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
  ctx.fillStyle = K; ctx.save(); ctx.translate(10, 12); ctx.fill(); ctx.restore();
  ctx.fillStyle = o.color || '#f2b705'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.stroke();
  ctx.font = `${o.size || r * 0.5}px ${POP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = String(str).split('\n');
  lines.forEach((ln, i) => { const yy = (i - (lines.length - 1) / 2) * (o.size || r * 0.5) * 1.02; ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.strokeText(ln, 0, yy + 4); ctx.fillStyle = o.ink || K; ctx.fillText(ln, 0, yy + 4); });
  ctx.restore();
}
function tag(str, x, y, k = 1, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.03); ctx.scale(easeBack(k), easeBack(k));
  ctx.font = `${o.size || 44}px ${POP}`; const w = ctx.measureText(str).width + 50, h = (o.size || 44) * 1.55;
  ctx.fillStyle = K; ctx.fillRect(-w / 2 + 8, -h / 2 + 8, w, h);
  ctx.fillStyle = o.bg || '#fff4dc'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = o.ink || K; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, 3); ctx.restore();
}
// comic panel: a framed inset with a hard shadow
function panel(x, y, w, h, k, draw, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(easeBack(k), easeBack(k));
  ctx.fillStyle = K; ctx.fillRect(-w / 2 + 14, -h / 2 + 14, w, h);
  ctx.fillStyle = o.bg || '#fff4dc'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); draw(w, h); ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.restore();
}

// ======================= host: Ìjàpá =======================
function ijapa(x, y, s, o) {
  const t = o.t, m = mouthAt(t), mood = o.mood || 'happy', SK = '#86cf4f', SKD = '#4f9a2a';
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2.2) * 6); ctx.rotate(o.tilt || 0); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(23,17,28,.35)'; ctx.beginPath(); ctx.ellipse(0, 200, 250, 30, 0, 0, Math.PI * 2); ctx.fill();
  const foot = (fx, fy) => { ctx.beginPath(); ctx.ellipse(fx, fy, 54, 40, 0, 0, Math.PI * 2); ctx.fillStyle = SK; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.stroke(); for (let k = -1; k <= 1; k++) circle(fx + k * 18, fy + 30, 6, '#f6f0dc'); };
  foot(-170, 175); foot(170, 175);
  // shell with an Ankara print
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 120, 240, 175, 0, Math.PI, 0); ctx.closePath(); ctx.clip();
  ctx.fillStyle = pat('rings', o.shellPal || 'magenta', 0.75, t * 4, 0); ctx.fillRect(-260, -80, 520, 220);
  ctx.strokeStyle = K; ctx.lineWidth = 7;
  for (const [hx, hy, r] of [[0, 20, 62], [-140, 80, 52], [140, 80, 52]]) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ctx.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.8); } ctx.closePath(); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, 120, 240, 175, 0, Math.PI, 0); ctx.closePath(); ctx.lineWidth = 11; ctx.strokeStyle = K; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-252, 104, 504, 40, 20); ctx.fillStyle = '#f2b705'; ctx.fill(); ctx.lineWidth = 9; ctx.stroke();
  // arms (front flippers): 0 down, 1 raised
  for (const side of [-1, 1]) {
    const r = side < 0 ? (o.armL || 0) : (o.armR || 0);
    ctx.save(); ctx.translate(side * 185, 60); ctx.rotate(side * (-0.3 - r * 2.0 + (r > 0.5 ? Math.sin(t * 8) * 0.12 : 0)));
    ctx.beginPath(); ctx.ellipse(side * 10, 70, 38, 80, 0, 0, Math.PI * 2); ctx.fillStyle = SK; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.stroke();
    ctx.restore();
  }
  // neck + head
  const bob = Math.sin(t * 2.2) * 5;
  ctx.beginPath(); ctx.roundRect(-55, -40 + bob, 110, 120, 44); ctx.fillStyle = SK; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.stroke();
  ctx.save(); ctx.translate((o.look || 0) * 8, -110 + bob); ctx.rotate((o.look || 0) * 0.05);
  ctx.beginPath(); ctx.ellipse(0, 0, 130, 112, 0, 0, Math.PI * 2); ctx.fillStyle = SK; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-30, -40, 60, 30, -0.3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
  // fila cap, green-white-green
  ctx.save(); ctx.translate(-12, -96); ctx.rotate(-0.16);
  ctx.beginPath(); ctx.moveTo(-104, 22); ctx.quadraticCurveTo(-96, -62, 12, -70); ctx.quadraticCurveTo(118, -60, 104, 22); ctx.closePath();
  ctx.save(); ctx.clip(); ctx.fillStyle = NG; ctx.fillRect(-110, -80, 76, 110); ctx.fillStyle = '#ffffff'; ctx.fillRect(-34, -80, 70, 110); ctx.fillStyle = NG; ctx.fillRect(36, -80, 80, 110); ctx.restore();
  ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.stroke(); ctx.restore();
  // eyes + round glasses
  const blink = ((t + 1.1) % 3.9) < 0.12;
  for (const ex of [-48, 48]) {
    ctx.save(); ctx.translate(ex, -4);
    if (blink || (mood === 'wink' && ex > 0 && (t % 2.4) < 0.5)) { ctx.beginPath(); ctx.moveTo(-20, 2); ctx.quadraticCurveTo(0, 12, 20, 2); ctx.lineWidth = 7; ctx.strokeStyle = K; ctx.stroke(); }
    else { circle(0, 0, 27, '#ffffff'); circle((o.look || 0) * 7, 3, mood === 'shock' ? 9 : 14, K); circle((o.look || 0) * 7 - 4, -2, 4.5, '#ffffff'); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(ex, -4, 38, 0, Math.PI * 2); ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-10, -10); ctx.quadraticCurveTo(0, -20, 10, -10); ctx.lineWidth = 7; ctx.stroke();
  const browY = mood === 'shock' ? -66 : mood === 'sad' ? -50 : -58;
  for (const ex of [-48, 48]) { ctx.beginPath(); ctx.moveTo(ex - 26, browY + (mood === 'sad' ? (ex < 0 ? 8 : -8) * -1 : 0)); ctx.lineTo(ex + 26, browY + (mood === 'sad' ? (ex < 0 ? -8 : 8) * -1 : 0)); ctx.lineWidth = 9; ctx.stroke(); }
  ctx.globalAlpha = 0.5; circle(-88, 42, 18, '#ff6b8a'); circle(88, 42, 18, '#ff6b8a'); ctx.globalAlpha = 1;
  // mouth, shaped by the sound being spoken
  const op = m.open * 34, wd = 22 + m.wide * 18 - m.round * 8;
  if (op > 3) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 54, wd, 4 + op, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a1222'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = K; ctx.stroke(); ctx.clip();
    ctx.beginPath(); ctx.ellipse(0, 54 + (4 + op) * 0.8, wd * 0.7, 12, 0, 0, Math.PI * 2); ctx.fillStyle = '#ff6b8a'; ctx.fill(); ctx.restore();
  } else if (mood === 'sad') { ctx.beginPath(); ctx.arc(0, 74, 24, 1.15 * Math.PI, 1.85 * Math.PI); ctx.lineWidth = 8; ctx.stroke(); }
  else if (mood === 'shock') { ctx.beginPath(); ctx.ellipse(0, 56, 14, 18, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a1222'; ctx.fill(); ctx.lineWidth = 7; ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, 36, 32, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 8; ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

// ======================= people (front-facing pop-art) =======================
const SKIN = { a: '#5a341c', b: '#7a4a2a', c: '#8f5a34', d: '#a86d40', e: '#f1c9a5', f: '#efd2b0' };
const PEOPLE = {
  flora: { skin: 'e', look: 'dress', top: '#5b2a6e', bottom: '#5b2a6e', head: 'hat', hair: '#7a4a1e', mouth: 'smile' },
  lugard: { skin: 'f', look: 'suit', top: '#efe6d2', bottom: '#efe6d2', tie: '#2a2a3a', head: 'pith', facial: 'moustache', hair: '#6a5a4a' },
  student: { skin: 'b', look: 'student', top: '#ffffff', bottom: '#2a2a3a', tie: '#1f3fbf', hair: '#17111c' },
  official: { skin: 'f', look: 'suit', top: '#2f3446', bottom: '#2f3446', tie: '#d6246e', hair: '#5a4a3a' },
  judge: { skin: 'c', look: 'agbada', pattern: 'diamonds', pal: 'indigo', head: 'fila', hair: '#17111c' },
  gowon: { skin: 'c', look: 'uniform', top: '#5c6b3a', bottom: '#4a5630', head: 'peaked', hair: '#17111c' },
  ojukwu: { skin: 'b', look: 'uniform', top: '#5c6b3a', bottom: '#4a5630', head: 'beret', facial: 'beard', hair: '#17111c' },
  soldier: { skin: 'b', look: 'uniform', top: '#5c6b3a', bottom: '#4a5630', head: 'helmet', hair: '#17111c' },
  amina: { skin: 'b', look: 'royal', pattern: 'suns', pal: 'magenta', head: 'crown', hair: '#17111c', female: true },
  architect: { skin: 'f', look: 'suit', top: '#3a3a44', bottom: '#3a3a44', tie: '#f2b705', hair: '#17111c', glasses: true },
  driver: { skin: 'a', look: 'buba', pattern: 'leaves', pal: 'teal', head: 'fila', hair: '#17111c' },
  woman: { skin: 'c', look: 'wrapper', pattern: 'rings', pal: 'sunset', head: 'gele', hair: '#17111c', female: true },
  man: { skin: 'b', look: 'buba', pattern: 'waves', pal: 'indigo', head: 'fila', hair: '#17111c' },
  elder: { skin: 'a', look: 'agbada', pattern: 'suns', pal: 'green', head: 'fila', hair: '#ddd', facial: 'beard' },
};
function person(kind, x, y, s, o = {}) {
  const P = Object.assign({}, PEOPLE[kind] || PEOPLE.man, o.style || {}), t = o.t || 0, skin = SKIN[P.skin] || P.skin;
  const fillTop = P.pattern ? pat(P.pattern, P.pal || 'sunset', 0.45) : P.top;
  ctx.save(); ctx.translate(x, y + (o.hop ? -Math.abs(Math.sin(t * 8 + x)) * 30 * o.hop : 0)); ctx.scale(s * (o.f || 1), s);
  if (o.alpha !== undefined) ctx.globalAlpha = clamp(o.alpha);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = K;
  const wk = o.walk || 0, ph = t * 8;
  // legs
  const legC = P.look === 'uniform' ? P.bottom : P.pattern && P.look === 'buba' ? fillTop : (P.bottom || '#2a2a3a');
  for (const side of [-1, 1]) {
    const sw = Math.sin(ph + (side > 0 ? 0 : Math.PI)) * 0.35 * wk;
    ctx.save(); ctx.translate(side * 30, -230); ctx.rotate(sw);
    ctx.beginPath(); ctx.roundRect(-22, 0, 44, 220, 18); ctx.fillStyle = legC; ctx.fill(); ctx.lineWidth = 8; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(side * 10, 224, 36, 18, 0, 0, Math.PI * 2); ctx.fillStyle = P.look === 'uniform' ? '#1f1a14' : '#3a2416'; ctx.fill(); ctx.lineWidth = 7; ctx.stroke();
    ctx.restore();
  }
  // arms (behind long robes) — angles: 0 down, + outward/up
  const arm = (side, a, b, front) => {
    const sx = side * 82, sy = -392;
    const kx = sx + Math.sin(side * a) * 92, ky = sy + Math.cos(a) * 92, hx = kx + Math.sin(side * b) * 84, hy = ky + Math.cos(b) * 84;
    const sleeve = P.look === 'uniform' || P.look === 'suit' || P.look === 'student' ? P.top : fillTop;
    for (const [c, wd] of [[K, 44], [sleeve, 32]]) { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(kx, ky); ctx.lineTo(hx, hy); ctx.stroke(); }
    circle(hx, hy, 19, skin); ctx.lineWidth = 7; ctx.strokeStyle = K; ctx.beginPath(); ctx.arc(hx, hy, 19, 0, Math.PI * 2); ctx.stroke();
    return [hx, hy];
  };
  const aL = o.armL || [0.15 + Math.sin(ph) * 0.2 * wk, 0.1], aR = o.armR || [0.15 - Math.sin(ph) * 0.2 * wk, 0.1];
  const robe = P.look === 'agbada' || P.look === 'royal' || P.look === 'dress';
  let hL, hR;
  if (robe) { hL = arm(-1, ...aL); hR = arm(1, ...aR); }
  // body
  ctx.lineWidth = 9; ctx.strokeStyle = K;
  if (P.look === 'agbada' || P.look === 'royal') {
    ctx.beginPath(); ctx.moveTo(-78, -410); ctx.lineTo(78, -410); ctx.lineTo(170, -150); ctx.quadraticCurveTo(0, -120, -170, -150); ctx.closePath(); ctx.fillStyle = fillTop; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-90, -160); ctx.lineTo(90, -160); ctx.lineTo(100, -20); ctx.lineTo(-100, -20); ctx.closePath(); ctx.fillStyle = fillTop; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-30, -410); ctx.lineTo(0, -340); ctx.lineTo(30, -410); ctx.lineWidth = 6; ctx.stroke();
    if (P.look === 'royal') { ctx.beginPath(); ctx.roundRect(-80, -380, 160, 120, 24); ctx.fillStyle = '#c9922e'; ctx.fill(); ctx.lineWidth = 8; ctx.stroke(); for (let k = 0; k < 3; k++) circle(-40 + k * 40, -320, 10, '#d6246e'); }
  } else if (P.look === 'dress') {
    ctx.beginPath(); ctx.moveTo(-60, -410); ctx.lineTo(60, -410); ctx.lineTo(70, -250); ctx.quadraticCurveTo(150, -100, 140, -10); ctx.lineTo(-140, -10); ctx.quadraticCurveTo(-150, -100, -70, -250); ctx.closePath(); ctx.fillStyle = P.top; ctx.fill(); ctx.stroke();
    ctx.lineWidth = 4; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 20, -240); ctx.quadraticCurveTo(k * 40, -120, k * 52, -14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-70, -262); ctx.lineTo(70, -262); ctx.lineWidth = 8; ctx.stroke();
    circle(0, -395, 10, '#f2b705');
  } else if (P.look === 'wrapper') {
    ctx.beginPath(); ctx.moveTo(-80, -410); ctx.lineTo(80, -410); ctx.lineTo(90, -250); ctx.lineTo(-90, -250); ctx.closePath(); ctx.fillStyle = fillTop; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-96, -252); ctx.lineTo(96, -252); ctx.lineTo(104, -10); ctx.lineTo(-104, -10); ctx.closePath(); ctx.fillStyle = pat('diamonds', P.pal || 'sunset', 0.4); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-82, -410); ctx.lineTo(82, -410); ctx.lineTo(74, -215); ctx.lineTo(-74, -215); ctx.closePath(); ctx.fillStyle = P.look === 'buba' ? fillTop : P.top; ctx.fill(); ctx.stroke();
    if (P.look === 'suit' || P.look === 'student') {
      if (P.look === 'suit') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-24, -410); ctx.lineTo(0, -330); ctx.lineTo(24, -410); ctx.fill(); ctx.lineWidth = 5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-40, -410); ctx.lineTo(-6, -300); ctx.moveTo(40, -410); ctx.lineTo(6, -300); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, -404); ctx.lineTo(-12, -330); ctx.lineTo(0, -300); ctx.lineTo(12, -330); ctx.closePath(); ctx.fillStyle = P.tie || '#d6246e'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
    }
    if (P.look === 'uniform') { ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-74, -250); ctx.lineTo(74, -250); ctx.stroke(); ctx.fillStyle = '#c9a43a'; ctx.fillRect(-12, -262, 24, 24); ctx.strokeRect(-12, -262, 24, 24); for (const sx of [-1, 1]) { ctx.strokeRect(sx * 40 - 18, -370, 36, 30); ctx.fillStyle = '#c9a43a'; ctx.fillRect(sx * 70 - 18, -414, 36, 12); } }
  }
  if (!robe) { hL = arm(-1, ...aL); hR = arm(1, ...aR); }
  // neck + head
  ctx.fillStyle = skin; ctx.beginPath(); ctx.roundRect(-22, -440, 44, 40, 10); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = K; ctx.stroke();
  ctx.save(); ctx.translate(0, -500); ctx.rotate(o.tilt || 0);
  if (P.head === 'gele') { ctx.beginPath(); ctx.moveTo(-90, -30); ctx.quadraticCurveTo(-120, -110, -30, -120); ctx.quadraticCurveTo(10, -170, 60, -110); ctx.quadraticCurveTo(140, -100, 96, -20); ctx.closePath(); ctx.fillStyle = pat('suns', P.pal || 'magenta', 0.35); ctx.fill(); ctx.lineWidth = 8; ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 0, 66, 74, 0, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 8; ctx.stroke();
  for (const ex of [-66, 66]) { ctx.beginPath(); ctx.ellipse(ex, 6, 12, 18, 0, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 6; ctx.stroke(); }
  if (P.hair && !['gele', 'pith', 'peaked', 'beret', 'helmet', 'crown', 'hat'].includes(P.head)) { ctx.beginPath(); ctx.ellipse(0, -44, 66, 34, 0, Math.PI, 0); ctx.fillStyle = P.hair; ctx.fill(); ctx.lineWidth = 6; ctx.stroke(); }
  if (P.head === 'hat') { ctx.beginPath(); ctx.ellipse(0, -50, 100, 22, -0.08, 0, Math.PI * 2); ctx.fillStyle = '#2a1a2e'; ctx.fill(); ctx.lineWidth = 7; ctx.stroke(); ctx.beginPath(); ctx.roundRect(-56, -110, 112, 64, 16); ctx.fill(); ctx.stroke(); circle(46, -70, 16, '#d6246e'); ctx.beginPath(); ctx.arc(46, -70, 16, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(-54, 20, 18, 40, 0.2, 0, Math.PI * 2); ctx.fillStyle = P.hair; ctx.fill(); ctx.stroke(); }
  // face
  const blink = ((t + x * 0.01) % 3.3) < 0.12;
  for (const ex of [-24, 24]) { if (blink) { ctx.beginPath(); ctx.moveTo(ex - 11, 0); ctx.lineTo(ex + 11, 0); ctx.lineWidth = 6; ctx.stroke(); } else { circle(ex, 0, 13, '#fff'); circle(ex + (o.look || 0) * 4, 2, 7, K); } }
  if (P.glasses) { ctx.lineWidth = 5; for (const ex of [-24, 24]) { ctx.beginPath(); ctx.arc(ex, 0, 19, 0, Math.PI * 2); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke(); }
  ctx.lineWidth = 6; for (const ex of [-24, 24]) { ctx.beginPath(); ctx.moveTo(ex - 14, -22 - (o.mood === 'shock' ? 8 : 0)); ctx.lineTo(ex + 14, -22 - (o.mood === 'sad' ? (ex < 0 ? -6 : 6) : 0) - (o.mood === 'shock' ? 8 : 0)); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(10, 24, -2, 28); ctx.lineWidth = 5; ctx.stroke();
  const mood = o.mood || P.mouth || 'smile';
  if (mood === 'shock') { ctx.beginPath(); ctx.ellipse(0, 44, 11, 14, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a1222'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke(); }
  else if (mood === 'sad') { ctx.beginPath(); ctx.arc(0, 58, 18, 1.2 * Math.PI, 1.8 * Math.PI); ctx.lineWidth = 6; ctx.stroke(); }
  else if (mood === 'cheer') { ctx.beginPath(); ctx.arc(0, 34, 22, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#4a1222'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke(); }
  else if (mood === 'flat') { ctx.beginPath(); ctx.moveTo(-14, 42); ctx.lineTo(14, 42); ctx.lineWidth = 6; ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, 30, 20, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 6; ctx.stroke(); }
  if (P.facial === 'moustache') { ctx.beginPath(); ctx.moveTo(-30, 34); ctx.quadraticCurveTo(-14, 20, 0, 30); ctx.quadraticCurveTo(14, 20, 30, 34); ctx.quadraticCurveTo(14, 28, 0, 36); ctx.quadraticCurveTo(-14, 28, -30, 34); ctx.fillStyle = P.hair; ctx.fill(); ctx.lineWidth = 4; ctx.stroke(); }
  if (P.facial === 'beard') { ctx.beginPath(); ctx.moveTo(-62, 10); ctx.quadraticCurveTo(-60, 80, 0, 86); ctx.quadraticCurveTo(60, 80, 62, 10); ctx.quadraticCurveTo(40, 50, 20, 46); ctx.lineTo(-20, 46); ctx.quadraticCurveTo(-40, 50, -62, 10); ctx.fillStyle = P.hair; ctx.fill(); ctx.lineWidth = 5; ctx.stroke(); }
  // headgear
  ctx.lineWidth = 8;
  if (P.head === 'fila') { ctx.beginPath(); ctx.moveTo(-62, -36); ctx.quadraticCurveTo(-56, -96, 10, -100); ctx.quadraticCurveTo(76, -94, 64, -36); ctx.closePath(); ctx.fillStyle = P.pattern ? pat(P.pattern, P.pal || 'sunset', 0.35) : '#d6246e'; ctx.fill(); ctx.stroke(); }
  if (P.head === 'pith') { ctx.beginPath(); ctx.ellipse(0, -46, 96, 20, 0, 0, Math.PI * 2); ctx.fillStyle = '#efe6d2'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -60, 62, 54, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-60, -52); ctx.lineTo(60, -52); ctx.lineWidth = 6; ctx.stroke(); }
  if (P.head === 'peaked') { ctx.beginPath(); ctx.ellipse(0, -62, 74, 30, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a5630'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -40, 60, 14, 0, 0, Math.PI); ctx.fillStyle = K; ctx.fill(); circle(0, -66, 12, '#c9a43a'); }
  if (P.head === 'beret') { ctx.beginPath(); ctx.ellipse(-12, -56, 80, 34, -0.2, 0, Math.PI * 2); ctx.fillStyle = '#2a2a2a'; ctx.fill(); ctx.stroke(); circle(30, -60, 10, '#c9a43a'); }
  if (P.head === 'helmet') { ctx.beginPath(); ctx.ellipse(0, -36, 80, 66, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#5c6b3a'; ctx.fill(); ctx.stroke(); }
  if (P.head === 'crown') { ctx.beginPath(); ctx.moveTo(-70, -40); ctx.quadraticCurveTo(0, -150, 70, -40); ctx.closePath(); ctx.fillStyle = pat('suns', 'magenta', 0.35); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-66, -40); ctx.lineTo(66, -40); ctx.lineWidth = 14; ctx.strokeStyle = '#c9922e'; ctx.stroke(); for (let k = -2; k <= 2; k++) circle(k * 24, -40, 6, '#d6246e'); ctx.strokeStyle = K; }
  ctx.restore();
  if (o.hold) heldProp(o.hold, o.holdSide === 'L' ? hL : hR, o);
  ctx.restore();
  return { L: [x + hL[0] * s * (o.f || 1), y + hL[1] * s], R: [x + hR[0] * s * (o.f || 1), y + hR[1] * s] };
}
function heldProp(kind, [hx, hy], o) {
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(o.propAng || 0); ctx.lineCap = 'round'; ctx.strokeStyle = K;
  if (kind === 'spear') { for (const [c, w] of [[K, 16], ['#8a5a2a', 9]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 160); ctx.lineTo(0, -300); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, -370); ctx.quadraticCurveTo(22, -320, 0, -296); ctx.quadraticCurveTo(-22, -320, 0, -370); ctx.fillStyle = '#d9d9e0'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.stroke(); }
  if (kind === 'shield') { ctx.beginPath(); ctx.ellipse(0, 0, 80, 120, 0, 0, Math.PI * 2); ctx.fillStyle = pat('diamonds', 'sunset', 0.35); ctx.fill(); ctx.lineWidth = 9; ctx.stroke(); }
  if (kind === 'paper') { ctx.rotate(-0.15); ctx.fillStyle = '#fbf6e8'; ctx.fillRect(-70, -110, 140, 170); ctx.lineWidth = 6; ctx.strokeRect(-70, -110, 140, 170); ctx.lineWidth = 4; for (let r = 0; r < 6; r++) { ctx.beginPath(); ctx.moveTo(-50, -80 + r * 24); ctx.lineTo(50, -80 + r * 24); ctx.stroke(); } }
  if (kind === 'flag') { ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(0, -300); ctx.stroke(); ngFlag(110, -240, 200, 120, o.t || 0, 1); }
  if (kind === 'pen') { ctx.rotate(0.5); ctx.fillStyle = '#1f3fbf'; ctx.fillRect(-8, -70, 16, 80); ctx.lineWidth = 5; ctx.strokeRect(-8, -70, 16, 80); }
  ctx.restore();
}
function crowd(x0, x1, y, n, t, seed, o = {}) {
  const R = rng(seed), kinds = ['woman', 'man', 'driver', 'elder', 'woman', 'man'], pals = ['sunset', 'indigo', 'green', 'magenta', 'teal'], pts = ['rings', 'leaves', 'diamonds', 'waves', 'suns'], skins = ['a', 'b', 'c', 'd'];
  const list = Array.from({ length: n }, (_, i) => ({ x: lerp(x0, x1, (i + 0.5) / n) + (R() - 0.5) * 40, k: kinds[Math.floor(R() * kinds.length)], pal: pals[Math.floor(R() * pals.length)], pt: pts[Math.floor(R() * pts.length)], sk: skins[Math.floor(R() * skins.length)], s: 0.5 + R() * 0.12, ph: R() * 6 }));
  for (const c of list) person(c.k, c.x, y, (o.scale || 1) * c.s, { t: t + c.ph, style: { pal: c.pal, pattern: c.pt, skin: c.sk }, hop: o.cheer ? 0.6 : 0, armL: o.cheer ? [2.6 + Math.sin(t * 8 + c.ph) * 0.2, 2.9] : undefined, armR: o.cheer ? [2.6 + Math.cos(t * 8 + c.ph) * 0.2, 2.9] : undefined, mood: o.mood || (o.cheer ? 'cheer' : 'smile') });
}

// ======================= props =======================
function ngFlag(x, y, w, h, t, k = 1, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const N = 24;
  for (let i = 0; i < N; i++) {
    const u = i / N, xx = -w / 2 + u * w, dy = Math.sin(t * 5 - u * 6) * 12 * u;
    ctx.fillStyle = u < 1 / 3 || u >= 2 / 3 ? NG : '#ffffff'; ctx.fillRect(xx, -h / 2 + dy, w / N + 1, h);
  }
  if (o.sun) { const dy = Math.sin(t * 5 - 3) * 6; ctx.save(); ctx.translate(0, dy); ctx.fillStyle = '#e0242c'; for (let k2 = 0; k2 < 16; k2++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(-5, -h * 0.17); ctx.lineTo(0, -h * 0.3); ctx.lineTo(5, -h * 0.17); ctx.fill(); } circle(0, 0, h * 0.16, '#e0242c'); ctx.restore(); }
  ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}
function biafraFlag(x, y, w, h, t, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const N = 24;
  for (let i = 0; i < N; i++) { const u = i / N, xx = -w / 2 + u * w, dy = Math.sin(t * 5 - u * 6) * 12 * u; [['#d7262e', 0], ['#17111c', 1], ['#0f8a3c', 2]].forEach(([c, r]) => { ctx.fillStyle = c; ctx.fillRect(xx, -h / 2 + r * h / 3 + dy, w / N + 1, h / 3 + 1); }); }
  // half of a yellow sun, rising from the green
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h / 2 + h / 6); ctx.clip();
  const sy = h / 6; ctx.fillStyle = '#f2b705'; circle(0, sy, h * 0.14, '#f2b705');
  for (let r = 0; r < 11; r++) { const a = Math.PI + (r + 0.5) / 11 * Math.PI; ctx.save(); ctx.translate(0, sy); ctx.rotate(a + Math.PI / 2); ctx.beginPath(); ctx.moveTo(-5, -h * 0.16); ctx.lineTo(0, -h * 0.29); ctx.lineTo(5, -h * 0.16); ctx.fill(); ctx.restore(); }
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.restore();
}
function newspaper(x, y, s, rot, headline, hk = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = K; ctx.fillRect(-190, -235, 400, 490);
  ctx.fillStyle = '#fbf6e8'; ctx.fillRect(-200, -250, 400, 490); ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.strokeRect(-200, -250, 400, 490);
  ctx.fillStyle = K; ctx.font = `900 42px "DejaVu Serif", serif`; ctx.textAlign = 'center'; ctx.fillText(o.title || 'THE TIMES', 0, -195);
  ctx.font = `700 21px "DejaVu Serif", serif`; ctx.fillText(o.dateline || 'LONDON · 8 JANUARY 1897', 0, -160); ctx.fillRect(-180, -145, 360, 5);
  if (headline && hk > 0) { ctx.save(); ctx.translate(0, -92); ctx.scale(easeBack(hk), easeBack(hk)); ctx.fillStyle = '#f2b705'; ctx.fillRect(-160, -36, 320, 66); ctx.lineWidth = 6; ctx.strokeRect(-160, -36, 320, 66); ctx.fillStyle = K; ctx.font = `${o.hsize || 52}px ${POP}`; ctx.fillText(headline, 0, 16); ctx.restore(); }
  ctx.fillStyle = '#b7ae9c'; for (let r = 0; r < 9; r++) { ctx.fillRect(-180, -36 + r * 30, 170, 12); ctx.fillRect(10, -36 + r * 30, 170, 12); }
  ctx.restore();
}
// simplified Nigeria outline (lon, lat) and its two great rivers
const NG_POLY = [[2.7, 6.4], [2.75, 7.9], [3.1, 9.1], [3.6, 10.3], [3.6, 11.7], [4.0, 12.6], [4.2, 13.5], [5.5, 13.85], [6.8, 13.1], [7.8, 13.35], [9.0, 12.85], [10.6, 13.0], [12.3, 13.1], [13.6, 13.6], [14.2, 13.1], [14.6, 12.2], [14.2, 11.2], [13.5, 10.1], [13.2, 9.0], [12.4, 8.4], [11.8, 7.0], [11.0, 6.5], [9.8, 6.1], [8.9, 5.0], [8.5, 4.6], [7.0, 4.4], [6.0, 4.3], [5.4, 5.2], [4.5, 6.3], [3.4, 6.4]];
const NIGER = [[3.6, 11.9], [4.2, 10.8], [4.8, 9.2], [5.6, 8.8], [6.75, 7.8], [6.8, 6.2], [6.2, 4.9]];
const BENUE = [[12.8, 9.3], [11.5, 9.2], [10.3, 8.5], [8.5, 7.7], [6.75, 7.8]];
const CITIES = { lagos: [3.38, 6.52], abuja: [7.49, 9.06], zaria: [7.7, 11.1], kano: [8.52, 12.0], enugu: [7.5, 6.45], kaduna: [7.44, 10.52] };
const MAP = { x: 540, y: 820, s: 62 };
function mapXY(lon, lat, m = MAP) { return [m.x + (lon - 8.65) * m.s, m.y - (lat - 9.1) * m.s]; }
function ngMap(m = MAP, o = {}) {
  ctx.save(); ctx.beginPath(); NG_POLY.forEach(([a, b], i) => { const [x, y] = mapXY(a, b, m); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
  ctx.save(); ctx.translate(14, 16); ctx.fillStyle = K; ctx.fill(); ctx.restore();
  ctx.fillStyle = o.fill || pat('leaves', 'green', 0.5); ctx.fill(); ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = K; ctx.stroke();
  if (o.region) { ctx.save(); ctx.clip(); ctx.beginPath(); o.region.forEach(([a, b], i) => { const [x, y] = mapXY(a, b, m); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = o.regionFill || 'rgba(214,36,110,.85)'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function river(pts, m, prog, w = 16) {
  ctx.beginPath(); const n = Math.max(1, Math.floor(prog * (pts.length - 1) * 20));
  for (let i = 0; i <= n; i++) { const f = i / 20, k = Math.min(pts.length - 2, Math.floor(f)), u = f - k; const [a, b] = pts[k], [c, d] = pts[k + 1]; const [x, y] = mapXY(lerp(a, c, u), lerp(b, d, u), m); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w + 10; ctx.strokeStyle = K; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = '#2f8cff'; ctx.stroke();
}
function cityPin(name, label, k, m = MAP, o = {}) {
  if (k <= 0) return; const [x, y] = mapXY(...CITIES[name], m);
  ctx.save(); ctx.translate(x, y); ctx.scale(easeBack(k), easeBack(k));
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-30, -40, -26, -76, 0, -76); ctx.bezierCurveTo(26, -76, 30, -40, 0, 0); ctx.fillStyle = o.color || '#d6246e'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = K; ctx.stroke(); circle(0, -50, 11, '#fff4dc');
  ctx.restore();
  if (label) tag(label, x + (o.dx ?? 0), y + (o.dy ?? -120), k, { size: o.size || 38, bg: o.bg || '#fff4dc' });
}
function car(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.f || 1), s); ctx.lineJoin = 'round'; ctx.strokeStyle = K;
  const b = Math.abs(Math.sin(t * 14 + x)) * 4;
  ctx.translate(0, -b);
  ctx.beginPath(); ctx.moveTo(-170, -40); ctx.lineTo(-150, -110); ctx.lineTo(-70, -170); ctx.lineTo(60, -170); ctx.lineTo(120, -110); ctx.lineTo(180, -96); ctx.lineTo(186, -36); ctx.closePath();
  ctx.fillStyle = o.color || '#f2b705'; ctx.fill(); ctx.lineWidth = 9; ctx.stroke();
  ctx.fillStyle = '#bfe3ff'; ctx.beginPath(); ctx.moveTo(-130, -110); ctx.lineTo(-64, -156); ctx.lineTo(-4, -156); ctx.lineTo(-4, -110); ctx.closePath(); ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -110); ctx.lineTo(10, -156); ctx.lineTo(56, -156); ctx.lineTo(104, -110); ctx.closePath(); ctx.fill(); ctx.stroke();
  // driver, sitting on the side the steering wheel is on
  const dx = o.wheelLeft ? 50 : -70; circle(dx, -128, 20, '#7a4a2a'); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(dx, -128, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(150, -86, 26, 18); ctx.strokeRect(150, -86, 26, 18);
  for (const wx of [-100, 110]) { ctx.save(); ctx.translate(wx, -30); ctx.rotate(t * 10); circle(0, 0, 38, K); circle(0, 0, 18, '#d9d9e0'); ctx.lineWidth = 5; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function road(y, t, o = {}) {
  ctx.fillStyle = '#3a3640'; ctx.fillRect(-400, y, 2000, 360); ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(1600, y); ctx.stroke();
  ctx.fillStyle = '#f2b705'; for (let x = -400 - ((t * (o.speed || 300)) % 160); x < 1600; x += 160) ctx.fillRect(x, y + 168, 90, 18);
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(-400, y + 14, 2000, 8); ctx.fillRect(-400, y + 338, 2000, 8);
}
function calendarCard(day, month, year, x, y, k, o = {}) {
  panel(x, y, 300, 330, k, (w, h) => {
    ctx.fillStyle = o.top || '#d6246e'; ctx.fillRect(-w / 2, -h / 2, w, 96); ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2 + 96); ctx.lineTo(w / 2, -h / 2 + 96); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff4dc'; ctx.font = `56px ${POP}`; ctx.fillText(month, 0, -h / 2 + 52);
    ctx.fillStyle = K; ctx.font = `150px ${POP}`; ctx.fillText(day, 0, 20); ctx.font = `48px ${POP}`; ctx.fillText(year, 0, 122);
  }, { rot: o.rot ?? 0.04 });
}
function skyline(x0, x1, base, t, seed, o = {}) {
  const R = rng(seed); let x = x0;
  while (x < x1) {
    const w = 60 + R() * 90, h = (o.min || 120) + R() * (o.max || 380), c = ['#d6246e', '#1f3fbf', '#f26b1d', '#0aa3a3', '#f2b705'][Math.floor(R() * 5)];
    ctx.fillStyle = c; ctx.fillRect(x, base - h, w, h); ctx.lineWidth = 7; ctx.strokeStyle = K; ctx.strokeRect(x, base - h, w, h);
    ctx.fillStyle = 'rgba(255,244,220,.85)'; for (let wy = base - h + 18; wy < base - 20; wy += 34) for (let wx = x + 12; wx < x + w - 16; wx += 26) if (R() > 0.35) ctx.fillRect(wx, wy, 12, 16);
    x += w + 6;
  }
}
function asoRock(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-320, 0); ctx.bezierCurveTo(-300, -200, -160, -380, 0, -390); ctx.bezierCurveTo(180, -380, 300, -220, 330, 0); ctx.closePath();
  ctx.fillStyle = '#8a7a6a'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.stroke();
  ctx.lineWidth = 5; for (const [a, b, c, d] of [[-150, -250, -100, -60], [40, -330, 90, -120], [180, -200, 220, -40]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2 + 30, (b + d) / 2, c, d); ctx.stroke(); }
  ctx.restore();
}
function dome(x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = K; ctx.lineWidth = 8;
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(-120, -160, 240, 160); ctx.strokeRect(-120, -160, 240, 160);
  ctx.beginPath(); ctx.arc(0, -160, 100, Math.PI, 0); ctx.closePath(); ctx.fillStyle = col || '#f2b705'; ctx.fill(); ctx.stroke();
  for (const mx of [-150, 150]) { ctx.fillStyle = '#fff4dc'; ctx.fillRect(mx - 14, -330, 28, 330); ctx.strokeRect(mx - 14, -330, 28, 330); ctx.beginPath(); ctx.moveTo(mx - 18, -330); ctx.lineTo(mx, -380); ctx.lineTo(mx + 18, -330); ctx.closePath(); ctx.fillStyle = col || '#f2b705'; ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function banknote(x, y, s, label, sub, col, k = 1, rot = 0) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * easeBack(k), s * easeBack(k));
  ctx.fillStyle = K; ctx.fillRect(-190, -100, 400, 220);
  ctx.fillStyle = col; ctx.fillRect(-200, -110, 400, 220); ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.strokeRect(-200, -110, 400, 220);
  ctx.strokeRect(-180, -90, 360, 180); circle(-110, 0, 54, 'rgba(255,244,220,.6)'); ctx.beginPath(); ctx.arc(-110, 0, 54, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = K; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `64px ${POP}`; ctx.fillText(label, 60, -14); ctx.font = `30px ${POP}`; ctx.fillText(sub, 60, 46);
  ctx.restore();
}
function earthWall(x0, x1, y, h, t) {
  ctx.fillStyle = '#b5652e'; ctx.beginPath(); ctx.moveTo(x0, y);
  for (let x = x0; x <= x1; x += 40) ctx.lineTo(x, y - h - Math.sin(x / 90) * 18 - (x % 160 < 40 ? 30 : 0));
  ctx.lineTo(x1, y); ctx.closePath(); ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.stroke();
  ctx.lineWidth = 4; for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(x0, y - r * h / 4); ctx.lineTo(x1, y - r * h / 4 + 6); ctx.stroke(); }
  ctx.fillStyle = 'rgba(23,17,28,.25)'; for (let k = 0; k < 40; k++) ctx.fillRect(x0 + hash1(k) * (x1 - x0), y - hash1(k + 9) * h, 14, 8);
}
function popHorse(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.f || 1), s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = K;
  const g = o.gallop || 0, ph = t * 10;
  const leg = (lx, a) => { ctx.save(); ctx.translate(lx, -190); ctx.rotate(a); ctx.lineWidth = 40; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 180); ctx.stroke(); ctx.lineWidth = 28; ctx.strokeStyle = o.color || '#f6f0e4'; ctx.stroke(); ctx.fillStyle = K; ctx.fillRect(-18, 176, 36, 22); ctx.restore(); };
  leg(-120, Math.sin(ph) * 0.4 * g); leg(110, Math.sin(ph + 2) * 0.4 * g);
  ctx.beginPath(); ctx.ellipse(0, -240, 190, 90, 0, 0, Math.PI * 2); ctx.fillStyle = o.color || '#f6f0e4'; ctx.fill(); ctx.lineWidth = 10; ctx.stroke();
  ctx.fillStyle = pat('suns', 'magenta', 0.35); ctx.beginPath(); ctx.ellipse(-10, -300, 120, 50, 0, Math.PI, 0); ctx.fill(); ctx.lineWidth = 7; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(120, -280); ctx.lineTo(220, -420); ctx.lineTo(300, -380); ctx.lineTo(290, -340); ctx.lineTo(220, -330); ctx.lineTo(170, -220); ctx.closePath(); ctx.fillStyle = o.color || '#f6f0e4'; ctx.fill(); ctx.lineWidth = 10; ctx.stroke();
  circle(250, -385, 7, K); ctx.beginPath(); ctx.moveTo(210, -420); ctx.lineTo(214, -455); ctx.lineTo(232, -424); ctx.fillStyle = o.color || '#f6f0e4'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-190, -260); ctx.quadraticCurveTo(-270, -220 + Math.sin(t * 6) * 14, -250, -120); ctx.lineWidth = 22; ctx.strokeStyle = K; ctx.stroke();
  leg(-90, -Math.sin(ph) * 0.4 * g); leg(140, -Math.sin(ph + 2) * 0.4 * g);
  ctx.restore();
}
function blockadeShip(x, y, s, t) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2 + x) * 5); ctx.scale(s, s); ctx.strokeStyle = K; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-200, -40); ctx.lineTo(200, -40); ctx.lineTo(160, 30); ctx.lineTo(-170, 30); ctx.closePath(); ctx.fillStyle = '#5a6270'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a8290'; ctx.fillRect(-60, -110, 120, 70); ctx.strokeRect(-60, -110, 120, 70); ctx.fillRect(-20, -160, 30, 50); ctx.strokeRect(-20, -160, 30, 50);
  ctx.restore();
}
function flame(x, y, s, t, seed = 0) {
  ctx.save(); ctx.translate(x, y);
  for (const [k, col] of [[1, '#f26b1d'], [0.72, '#f2b705'], [0.42, '#fff4dc']]) {
    const f = noise1(t * 8 + seed + k * 3) - 0.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.5 * k, 0); ctx.quadraticCurveTo(-s * 0.6 * k, -s * 0.9 * k, f * s * 0.5, -s * 2.1 * k); ctx.quadraticCurveTo(s * 0.6 * k, -s * 0.9 * k, s * 0.5 * k, 0); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); if (k === 1) { ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.stroke(); }
  }
  ctx.restore();
}
function sea(y, t) { ctx.fillStyle = pat('waves', 'indigo', 0.6, t * 30, 0); ctx.fillRect(-400, y, 2000, 800); ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(1600, y); ctx.stroke(); }

// ======================= shared closing scene =======================
// ctaScene(top line, big line): Ìjàpá waves goodbye; episodes can pass their own question.
function ctaScene(top = 'FOLLOW FOR MORE', big = 'NAIJA HISTORY', o = {}) {
  return ({ t, lt }) => {
    camera(540, 960, lerp(1.15, 1.0, easeOut(lt / 1)));
    popWorld(t, () => { ijapa(540, 1170, 1.05, { t, armR: 0.85, mood: lt > 1.2 ? 'wink' : 'happy', shellPal: o.shellPal }); }, { pattern: o.pattern || 'suns', pal: o.pal || 'green', cy: 1020 });
    popText(top, 540, 330, 88, lt + 0.1, { color: '#f2b705' });
    popText(big, 540, 450, 104, lt - 0.2, { color: '#fff4dc' });
    ctx.save(); ctx.translate(540, 600); const p = pulse(t, 70); ctx.scale(p, p); tag('FOLLOW +', 0, 0, easeOut(clamp((lt - 0.5) / 0.3)), { size: 58, bg: '#d6246e', ink: '#fff4dc' }); ctx.restore();
  };
}
S.cta = ctaScene();
EV.cta = () => [{ t: 0.1, type: 'pop' }, { t: 0.5, type: 'ding' }];
