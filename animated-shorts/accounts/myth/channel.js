// Channel: Greek mythology, hosted by Glaux, Athena's owl.
// Look: a moonlit temple for the host, and story scenes painted like animated red-figure Greek vases.
CAP_HI = '#ffd36b';
Object.assign(FX, { blur: 4, shutter: 0.6, grain: 0.075, vignette: 0.55, grade: { color: '#ffb35c', op: 'soft-light', alpha: 0.12 }, punch: false });
drawBg = () => {};

const SERIF = '"Cinzel", "DejaVu Serif", serif';
const GREEK = '"DejaVu Serif", serif';
const CLAY = '#d9803f', CLAY_L = '#eea05f', GLAZE = '#130b07', INK = '#1a0d06', HAIR = '#6a3014';
const MR = rng(44);
const STARS = Array.from({ length: 140 }, () => ({ x: -160 + MR() * 1400, y: -240 + MR() * 1500, r: 0.8 + MR() * 2.4, ph: MR() * 6 }));

// ======================= worlds =======================
const skyC = () => cached('sky', 1400, 2400, (w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#07061a'); g.addColorStop(0.35, '#1a1140'); g.addColorStop(0.58, '#3b2258'); g.addColorStop(0.72, '#7a3f5e'); g.addColorStop(0.8, '#c0704f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (const [x, y, r, c] of [[300, 500, 520, 'rgba(120,60,200,.18)'], [1050, 800, 600, 'rgba(200,80,160,.12)'], [700, 300, 400, 'rgba(60,90,220,.14)']]) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  }
});
const mountC = () => cached('mount', 1800, 900, (w, h) => {
  const ridge = (base, amp, seed, col, peak) => {
    const R = rng(seed); ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 30) { const pk = peak ? Math.exp(-Math.pow((x - peak) / 260, 2)) * 330 : 0; ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x / 170 + seed)) - R() * 18 - pk); }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  ridge(560, 120, 3, '#3a2654', 820);
  // snow on the Olympus peak, lit by the moon
  ctx.save(); ctx.beginPath(); ctx.moveTo(700, 300); ctx.lineTo(820, 140); ctx.lineTo(960, 320); ctx.lineTo(880, 290); ctx.lineTo(820, 330); ctx.lineTo(760, 290); ctx.closePath();
  ctx.fillStyle = 'rgba(230,220,255,.55)'; ctx.fill(); ctx.restore();
  const mist = ctx.createLinearGradient(0, 420, 0, 700); mist.addColorStop(0, 'rgba(190,120,150,0)'); mist.addColorStop(1, 'rgba(190,120,150,.45)');
  ctx.fillStyle = mist; ctx.fillRect(0, 420, w, 300);
  ridge(720, 90, 9, '#24173c', 0);
});
function column(x, top, bottom, wdt, lightL, lightR) {
  const g = ctx.createLinearGradient(x - wdt / 2, 0, x + wdt / 2, 0);
  g.addColorStop(0, lightL); g.addColorStop(0.35, '#e9dfcf'); g.addColorStop(0.7, '#b9ab95'); g.addColorStop(1, lightR);
  ctx.fillStyle = g; ctx.fillRect(x - wdt / 2, top + 40, wdt, bottom - top - 40);
  ctx.strokeStyle = 'rgba(80,60,40,.28)'; ctx.lineWidth = 3;
  for (let k = 1; k < 6; k++) { const fx = x - wdt / 2 + k * wdt / 6; ctx.beginPath(); ctx.moveTo(fx, top + 46); ctx.lineTo(fx, bottom - 6); ctx.stroke(); }
  ctx.fillStyle = '#d8ccb6'; ctx.beginPath(); ctx.moveTo(x - wdt / 2, top + 42); ctx.quadraticCurveTo(x, top + 8, x + wdt / 2, top + 42); ctx.fill();
  ctx.fillStyle = '#efe6d6'; ctx.fillRect(x - wdt / 2 - 18, top, wdt + 36, 22);
  ctx.fillStyle = '#c7b9a2'; ctx.fillRect(x - wdt / 2 - 8, bottom - 14, wdt + 16, 14);
}
const templeC = () => cached('temple', 1700, 1250, (w, h) => {
  // pediment + architrave
  ctx.fillStyle = '#cdbfa8'; ctx.beginPath(); ctx.moveTo(60, 250); ctx.lineTo(w / 2, 40); ctx.lineTo(w - 60, 250); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a99a83'; ctx.beginPath(); ctx.moveTo(140, 236); ctx.lineTo(w / 2, 80); ctx.lineTo(w - 140, 236); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e4dac8'; ctx.fillRect(40, 250, w - 80, 60);
  ctx.fillStyle = '#7a3b1c'; ctx.fillRect(40, 310, w - 80, 46);
  ctx.strokeStyle = '#e7b766'; ctx.lineWidth = 6; ctx.beginPath();
  for (let x = 50; x < w - 70; x += 46) { ctx.moveTo(x, 348); ctx.lineTo(x, 318); ctx.lineTo(x + 34, 318); ctx.lineTo(x + 34, 340); ctx.lineTo(x + 14, 340); ctx.lineTo(x + 14, 328); }
  ctx.stroke();
  ctx.fillStyle = '#d9cdb8'; ctx.fillRect(40, 356, w - 80, 26);
  // inner shadow behind the colonnade
  const sg = ctx.createLinearGradient(0, 380, 0, h); sg.addColorStop(0, '#1d1328'); sg.addColorStop(1, '#2c1d33');
  ctx.fillStyle = sg; ctx.fillRect(80, 382, w - 160, h - 520);
  for (let i = 0; i < 7; i++) column(150 + i * 233, 382, h - 150, 120, '#6f6273', '#5d4f5f');
  // steps
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#bfb19a' : '#d5c9b3'; ctx.fillRect(40 - k * 26, h - 150 + k * 37, w - 80 + k * 52, 37); }
});
const fgColC = () => cached('fgcol', 300, 2300, (w, h) => { column(150, 60, h, 240, '#4a3d48', '#30262f'); });
const floorC = () => cached('floor', 1700, 760, (w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a4a52'); g.addColorStop(1, '#1b1219');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,240,220,.06)'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const y = 20 + Math.pow(i / 8, 1.6) * (h - 20); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * 70, 0); ctx.lineTo(w / 2 + i * 260, h); ctx.stroke(); }
});
function torch(x, y, t, s = 1) {
  ctx.fillStyle = '#3b2a1c'; ctx.fillRect(x - 8 * s, y, 16 * s, 70 * s);
  ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.moveTo(x - 26 * s, y); ctx.lineTo(x + 26 * s, y); ctx.lineTo(x + 14 * s, y + 24 * s); ctx.lineTo(x - 14 * s, y + 24 * s); ctx.fill();
  flame(x, y + 2, 34 * s, t, x);
  glow(x, y - 20 * s, 260 * s * (0.9 + 0.1 * noise1(t * 9 + x)), 'rgba(255,150,60,.55)', 1);
}
function flame(x, y, s, t, seed = 0) {
  ctx.save(); ctx.translate(x, y);
  for (const [k, col] of [[1, '#ff6a1a'], [0.72, '#ffb02e'], [0.42, '#fff1b0']]) {
    const f = noise1(t * 8 + seed + k * 3) - 0.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.5 * k, 0);
    ctx.quadraticCurveTo(-s * 0.6 * k, -s * 0.9 * k, f * s * 0.5, -s * 2.1 * k);
    ctx.quadraticCurveTo(s * 0.6 * k, -s * 0.9 * k, s * 0.5 * k, 0); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }
  ctx.restore();
}
function templeWorld(t, o = {}) {
  layer(0.08, () => {
    ctx.drawImage(skyC(), -160, -240);
    for (const s of STARS) { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 2.2 + s.ph); circle(s.x, s.y, s.r, '#fff6e0'); }
    ctx.globalAlpha = 1;
    glow(830, 380, 330, 'rgba(255,236,190,.35)'); circle(830, 380, 92, '#fbf1d6'); circle(800, 360, 16, 'rgba(200,190,170,.5)'); circle(860, 410, 22, 'rgba(200,190,170,.45)');
  });
  layer(0.25, () => ctx.drawImage(mountC(), -360, 380));
  layer(0.6, () => {
    ctx.drawImage(templeC(), -310, 420);
    for (const tx of [120, 960]) torch(tx, 1080, t, 1);
  });
  layer(1, () => {
    ctx.drawImage(floorC(), -310, 1540);
    godRays(830, 300, 0.32, 0.5, 6, 1500, 'rgba(255,240,210,.22)', 0.6, t);
    particles(5, 40, t, { x0: 0, x1: 1080, y0: 500, y1: 1700, vy: -12, vx: 6, size: 2.2, color: 'rgba(255,230,190,.9)', wobble: 30, life: 6, alpha: 0.7 });
    if (o.main) o.main();
  });
  if (o.fg !== false) layer(1.6, () => { ctx.drawImage(fgColC(), -170, -200); ctx.drawImage(fgColC(), 950, -200); }, { blur: 7 });
  layer(1.2, () => particles(8, 18, t, { x0: 0, x1: 1080, y0: 800, y1: 1800, vy: -50, size: 2.5, color: 'rgba(255,140,60,1)', core: '#ffd28a', glow: true, life: 3.5, wobble: 40, alpha: 0.8 }));
}

// ---- vase world: the story painted on a pot, red-figure style ----
const vaseC = () => cached('vase', 1500, 2400, (w, h) => {
  ctx.fillStyle = GLAZE; ctx.fillRect(0, 0, w, h);
  const R = rng(3);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '255,200,150' : '0,0,0'},${0.02 + R() * 0.03})`; ctx.beginPath(); ctx.arc(R() * w, R() * h, 2 + R() * 14, 0, 7); ctx.fill(); }
  const curve = ctx.createLinearGradient(0, 0, w, 0);
  curve.addColorStop(0, 'rgba(0,0,0,.75)'); curve.addColorStop(0.3, 'rgba(0,0,0,0)'); curve.addColorStop(0.7, 'rgba(0,0,0,0)'); curve.addColorStop(1, 'rgba(0,0,0,.75)');
  ctx.fillStyle = curve; ctx.fillRect(0, 0, w, h);
});
function meanderBand(x0, x1, y, hgt) {
  ctx.fillStyle = GLAZE; ctx.fillRect(x0, y, x1 - x0, hgt);
  ctx.strokeStyle = CLAY; ctx.lineWidth = hgt * 0.1; ctx.lineCap = 'square';
  const u = hgt * 0.8;
  ctx.beginPath();
  for (let x = x0; x < x1; x += u * 1.25) {
    const yy = y + hgt * 0.1;
    ctx.moveTo(x, yy + u); ctx.lineTo(x, yy); ctx.lineTo(x + u, yy); ctx.lineTo(x + u, yy + u * 0.7); ctx.lineTo(x + u * 0.35, yy + u * 0.7); ctx.lineTo(x + u * 0.35, yy + u * 0.35); ctx.lineTo(x + u * 0.65, yy + u * 0.35);
    ctx.moveTo(x, yy + u); ctx.lineTo(x + u * 1.25, yy + u);
  }
  ctx.stroke();
  ctx.fillStyle = CLAY; ctx.fillRect(x0, y - 6, x1 - x0, 5); ctx.fillRect(x0, y + hgt + 1, x1 - x0, 5);
}
function tongueBand(x0, x1, y) {
  ctx.fillStyle = CLAY; ctx.fillRect(x0, y + 60, x1 - x0, 5);
  for (let x = x0; x < x1; x += 46) { ctx.beginPath(); ctx.ellipse(x + 23, y + 26, 17, 30, 0, 0, Math.PI * 2); ctx.fillStyle = CLAY; ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 23, y + 30, 9, 20, 0, 0, Math.PI * 2); ctx.fillStyle = GLAZE; ctx.fill(); }
}
function vaseWorld(t, main, o = {}) {
  layer(0.15, () => ctx.drawImage(vaseC(), -210, -240));
  layer(1, () => {
    tongueBand(-400, 1500, 190);
    meanderBand(-400, 1500, 1290, 64);
    if (main) main();
  });
  // glossy highlight on the curved pot surface, moving slower than the painting
  layer(0.45, () => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(160, 0, 420, 0); g.addColorStop(0, 'rgba(255,220,180,0)'); g.addColorStop(0.5, 'rgba(255,220,180,.05)'); g.addColorStop(1, 'rgba(255,220,180,0)');
    ctx.fillStyle = g; ctx.fillRect(160, -300, 260, 2600); ctx.restore();
  });
  if (o.tint) { ctx.save(); ctx.fillStyle = o.tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
// Greek name inscription next to a figure, the way vase painters labelled them
function inscription(str, x, y, size, k = 1, vertical = false) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(x, y); if (vertical) ctx.rotate(-Math.PI / 2);
  ctx.font = `700 ${size}px ${GREEK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = CLAY_L;
  ctx.fillText(str, 0, 0); ctx.restore();
}
function namePlate(str, x, y, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(easeBack(k), easeBack(k));
  ctx.font = `900 48px ${SERIF}`; const w = ctx.measureText(str).width + 60;
  ctx.beginPath(); ctx.roundRect(-w / 2, -38, w, 76, 8); ctx.fillStyle = 'rgba(19,11,7,.88)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#e7b766'; ctx.stroke();
  ctx.fillStyle = '#f6d58a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, 3); ctx.restore();
}

// ======================= characters =======================
// Glaux, Athena's owl. o: {t, mood:'calm'|'wise'|'shock'|'scared'|'wink', look, tilt, wingL, wingR (0 folded .. 1 raised), cover (0..1 wing over eyes)}
function owl(x, y, s, o) {
  const t = o.t, m = mouthAt(t), mood = o.mood || 'calm';
  const BR = '#7b4b2c', BRL = '#b07a4c', BRD = '#4a2a17', CREAM = '#efdcb4', FACE = '#e7cf9f';
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2.1) * 6); ctx.rotate(o.tilt || 0); ctx.scale(s, s);
  // perch shadow + scroll perch
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 236, 190, 26, 0, 0, Math.PI * 2); ctx.fill();
  const pg = ctx.createLinearGradient(0, 196, 0, 246); pg.addColorStop(0, '#f1e2bf'); pg.addColorStop(1, '#b9a07a');
  ctx.beginPath(); ctx.roundRect(-200, 200, 400, 42, 21); ctx.fillStyle = pg; ctx.fill();
  for (const ex of [-200, 200]) { circle(ex, 221, 24, '#d9c49c'); circle(ex, 221, 12, '#a88a5c'); }
  const wing = (side, raise) => {
    ctx.save(); ctx.translate(side * 112, -30); ctx.scale(side, 1); ctx.rotate(-raise * 1.9 + Math.sin(t * 2.4 + side) * 0.03);
    for (let k = 4; k >= 0; k--) {
      ctx.save(); ctx.rotate(k * 0.07); ctx.beginPath(); ctx.ellipse(18 + k * 4, 110 + k * 16, 44 - k * 3, 120 - k * 6, 0.12, 0, Math.PI * 2);
      ctx.fillStyle = k % 2 ? BRD : BR; ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = 'rgba(240,215,170,.35)'; ctx.lineWidth = 6;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(20, 60 + k * 42, 34, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
    ctx.restore();
  };
  wing(-1, o.wingL || 0);
  // body
  const bg = ctx.createRadialGradient(-60, -120, 30, 0, 20, 260); bg.addColorStop(0, BRL); bg.addColorStop(0.55, BR); bg.addColorStop(1, BRD);
  ctx.beginPath(); ctx.moveTo(0, -250); ctx.bezierCurveTo(150, -250, 175, -60, 150, 60); ctx.bezierCurveTo(130, 170, 70, 210, 0, 210);
  ctx.bezierCurveTo(-70, 210, -130, 170, -150, 60); ctx.bezierCurveTo(-175, -60, -150, -250, 0, -250); ctx.closePath();
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,170,90,.45)'; ctx.beginPath(); ctx.arc(0, -20, 205, -0.9, 0.5); ctx.stroke();
  // belly with chevron feathers
  ctx.beginPath(); ctx.ellipse(0, 70, 100, 125, 0, 0, Math.PI * 2); ctx.fillStyle = CREAM; ctx.fill();
  ctx.strokeStyle = '#a67a4c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) {
    const cx = c * 34 + (r % 2) * 17, cy = 0 + r * 40; if (Math.hypot(cx / 92, (cy - 70) / 118) > 0.92) continue;
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 4); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx + 10, cy - 4); ctx.stroke();
  }
  // Athenian owl coin pendant
  ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -40, 70, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
  const cg = ctx.createRadialGradient(-6, 18, 2, 0, 24, 26); cg.addColorStop(0, '#fff2c0'); cg.addColorStop(1, '#c9922e');
  circle(0, 26, 22, cg); ctx.strokeStyle = '#8a5e1c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 26, 15, 0, 7); ctx.stroke();
  wing(1, o.wingR || 0);
  // talons
  for (const fx of [-55, 55]) for (let k = -1; k <= 1; k++) {
    ctx.beginPath(); ctx.ellipse(fx + k * 17, 206, 10, 20, k * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#e7a23c'; ctx.fill();
    circle(fx + k * 19, 224, 5, '#2a1a10');
  }
  // head
  ctx.save(); ctx.translate(0, -150); ctx.rotate((o.look || 0) * 0.06);
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 70, -80); ctx.quadraticCurveTo(side * 130, -150 - (mood === 'shock' ? 25 : 0), side * 150, -170 - (mood === 'shock' ? 25 : 0));
    ctx.quadraticCurveTo(side * 140, -100, side * 118, -60); ctx.fillStyle = BR; ctx.fill();
  }
  // facial disc
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.arc(side * 58, 0, 78, 0, Math.PI * 2); ctx.fillStyle = FACE; ctx.fill();
    ctx.strokeStyle = 'rgba(150,100,60,.35)'; ctx.lineWidth = 2;
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(side * 58 + Math.cos(a) * 52, Math.sin(a) * 52); ctx.lineTo(side * 58 + Math.cos(a) * 74, Math.sin(a) * 74); ctx.stroke(); }
  }
  ctx.strokeStyle = BRD; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-58, 0, 80, 0.55 * Math.PI, 1.6 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(58, 0, 80, -0.6 * Math.PI, 0.45 * Math.PI); ctx.stroke();
  // eyes
  const blink = ((t + 0.9) % 3.7) < 0.12;
  const lid = blink ? 1 : ({ calm: 0.18, wise: 0.42, shock: 0, scared: 0.05, wink: 0.18 }[mood] ?? 0.18);
  const pr = mood === 'shock' ? 12 : mood === 'scared' ? 10 : 20;
  for (const side of [-1, 1]) {
    const ex = side * 56;
    ctx.save(); ctx.translate(ex, 4);
    circle(0, 0, 48, '#2a1608');
    const ig = ctx.createRadialGradient(-8, -8, 4, 0, 0, 42); ig.addColorStop(0, '#ffe07a'); ig.addColorStop(0.6, '#f7a823'); ig.addColorStop(1, '#c26a0e');
    circle(0, 0, 41, ig);
    circle((o.look || 0) * 9, 2, pr, '#120803');
    circle(-12, -13, 9, 'rgba(255,255,255,.95)'); circle(12, 12, 4, 'rgba(255,255,255,.7)');
    const l = (mood === 'wink' && side > 0 && (t % 2.4) < 0.5) ? 1 : lid;
    if (l > 0) { ctx.beginPath(); ctx.rect(-52, -52, 104, 104 * l); ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 49, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = BR; ctx.fillRect(-52, -52, 104, 104 * l); ctx.restore();
      ctx.strokeStyle = BRD; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-44, -52 + 104 * l); ctx.lineTo(44, -52 + 104 * l); if (l < 1 && l > 0.05) ctx.stroke(); }
    ctx.restore();
  }
  // brows
  const browA = { calm: 0.1, wise: -0.12, shock: 0.4, scared: 0.45, wink: 0.1 }[mood] ?? 0.1;
  for (const side of [-1, 1]) { ctx.save(); ctx.translate(side * 58, -58); ctx.rotate(side * browA); ctx.beginPath(); ctx.ellipse(0, 0, 50, 11, 0, 0, Math.PI * 2); ctx.fillStyle = BRD; ctx.fill(); ctx.restore(); }
  // beak, opening with the voice
  const open = m.open * 26;
  ctx.fillStyle = '#7d6a4c'; ctx.beginPath(); ctx.moveTo(-14, 52); ctx.lineTo(14, 52); ctx.lineTo(0, 68 + open); ctx.closePath(); ctx.fill();
  if (open > 2) { ctx.beginPath(); ctx.moveTo(-11, 54); ctx.lineTo(11, 54); ctx.lineTo(0, 62 + open); ctx.closePath(); ctx.fillStyle = '#5a1c1c'; ctx.fill(); }
  const bk = ctx.createLinearGradient(-20, 20, 20, 60); bk.addColorStop(0, '#f0d58a'); bk.addColorStop(1, '#a4842f');
  ctx.beginPath(); ctx.moveTo(-22, 26); ctx.quadraticCurveTo(0, 14, 22, 26); ctx.quadraticCurveTo(10, 50, 0, 66); ctx.quadraticCurveTo(-10, 50, -22, 26); ctx.fillStyle = bk; ctx.fill();
  // laurel wreath
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI * (1.06 + 0.88 * k / 12), r = 150;
    ctx.save(); ctx.translate(Math.cos(a) * r, -18 + Math.sin(a) * r * 0.82); ctx.rotate(a + (k < 6 ? -0.7 : 0.7));
    const lg = ctx.createLinearGradient(-10, -24, 10, 24); lg.addColorStop(0, '#fff0b0'); lg.addColorStop(1, '#c98a1f');
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 25, 0, 0, Math.PI * 2); ctx.fillStyle = lg; ctx.fill(); ctx.restore();
  }
  ctx.restore();
  if (o.cover) { ctx.save(); ctx.translate(0, -150); ctx.rotate(-0.15); ctx.translate(0, (1 - o.cover) * 260); ctx.beginPath(); ctx.ellipse(10, 10, 175, 70, 0.1, 0, Math.PI * 2); ctx.fillStyle = BR; ctx.fill();
    ctx.strokeStyle = 'rgba(240,215,170,.35)'; ctx.lineWidth = 6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-90 + k * 60, 40, 30, Math.PI, 2 * Math.PI); ctx.stroke(); } ctx.restore(); }
  ctx.restore();
}

// ---- red-figure people ----
const HEAD_PATH = [['m', -34, -6], ['c', -38, -30, -30, -42, -18, -44], ['c', -4, -48, 14, -46, 24, -36], ['c', 32, -28, 34, -18, 34, -10], ['l', 46, 12], ['l', 35, 15],
  ['l', 38, 20], ['l', 33, 23], ['l', 36, 27], ['c', 36, 34, 32, 40, 24, 41], ['c', 16, 42, 9, 39, 4, 35], ['l', 7, 60], ['l', -16, 60], ['c', -17, 36, -36, 16, -34, -6]];
function tracePath(P) { ctx.beginPath(); for (const p of P) { if (p[0] === 'm') ctx.moveTo(p[1], p[2]); else if (p[0] === 'l') ctx.lineTo(p[1], p[2]); else ctx.bezierCurveTo(p[1], p[2], p[3], p[4], p[5], p[6]); } ctx.closePath(); }
function limb(ax, ay, a1, l1, a2, l2, w1, w2) {
  const kx = ax + Math.sin(a1) * l1, ky = ay + Math.cos(a1) * l1, ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
  for (const [col, extra] of [[INK, 6], [CLAY, 0]]) {
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.lineWidth = w1 + extra; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = w2 + extra; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
  }
  return [ex, ey, kx, ky];
}
// kind: 'zeus' | 'prometheus' | 'pandora' | 'human' ; o: {t, f (1 right / -1 left), walk, phase, armF:[a,b], armB:[a,b], lean, hold, reveal (0..1 build-up from light)}
function fig(kind, x, y, s, o) {
  const t = o.t, f = o.f || 1, wk = o.walk || 0, ph = o.phase ?? t * 7;
  const robed = kind === 'zeus' || kind === 'pandora';
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
  ctx.lineJoin = 'round';
  const hipX = 0, hipY = -205;
  // legs
  const legs = side => {
    const a = side * 0.45 * Math.sin(ph) * wk, bend = wk * 0.7 * (1 - Math.cos(ph + (side > 0 ? 0 : Math.PI))) / 2;
    const [fx, fy] = limb(hipX + side * 6, hipY, a, 104, a - bend, 100, 32, 25);
    ctx.fillStyle = CLAY; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(fx + 14, fy + 4, 22, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  ctx.save(); ctx.translate(0, 0);
  legs(-1); legs(1);
  ctx.restore();
  ctx.save(); ctx.translate(hipX, hipY); ctx.rotate(o.lean || 0); ctx.translate(-hipX, -hipY);
  // robe / tunic
  const sway = Math.sin(ph) * 14 * wk + Math.sin(t * 2) * 4;
  if (robed || kind === 'prometheus' || kind === 'human') {
    const hem = kind === 'pandora' ? -6 : kind === 'zeus' ? -50 : -112;
    const half = kind === 'pandora' ? 78 : kind === 'zeus' ? 84 : 66;
    ctx.beginPath(); ctx.moveTo(-50, -330); ctx.lineTo(54, -330); ctx.lineTo(half + sway, hem); ctx.quadraticCurveTo(0 + sway, hem + 12, -half + sway * 0.6, hem); ctx.closePath();
    ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 2.6;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 12, -218); ctx.quadraticCurveTo(k * 18 + sway * 0.4, (hem - 218) / 2 - 100, k * 22 + sway * 0.8, hem - 6); ctx.stroke(); }
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, -222); ctx.lineTo(44, -222); ctx.stroke();
    if (kind === 'zeus') { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-50, -330); ctx.quadraticCurveTo(10, -270, 60, -150); ctx.stroke(); }
  }
  // back arm
  const armB = o.armB || [-0.15 - 0.4 * Math.sin(ph) * wk, -0.4];
  const [bx, by] = limb(-4, -318, armB[0], 78, armB[1], 72, 24, 19);
  circle(bx, by, 12, CLAY);
  if (o.hold === 'scepter') { ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx, by - 170); ctx.lineTo(bx, by + 150); ctx.stroke(); circle(bx, by - 175, 12, CLAY); }
  // torso
  ctx.beginPath(); ctx.moveTo(-42, -334); ctx.quadraticCurveTo(-48, -270, -34, -206); ctx.lineTo(38, -206); ctx.quadraticCurveTo(60, -270, 52, -334); ctx.closePath();
  ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
  ctx.lineWidth = 2.6;
  if (kind === 'prometheus' || kind === 'human') { ctx.beginPath(); ctx.arc(30, -300, 20, 0.3, 1.7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-30, -330); ctx.quadraticCurveTo(10, -290, 44, -322); ctx.stroke(); }
  else { for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-30 + k * 8, -330); ctx.quadraticCurveTo(0 + k * 10, -280, 30 + k * 4, -226); ctx.stroke(); } }
  // head
  ctx.save(); ctx.translate(12, -392); ctx.rotate(o.headTilt || 0);
  if (kind === 'pandora') { ctx.beginPath(); ctx.moveTo(-28, 10); ctx.quadraticCurveTo(-40, 50, -30, 96); ctx.lineTo(-16, 96); ctx.quadraticCurveTo(-22, 50, -12, 16); ctx.fillStyle = HAIR; ctx.fill(); }
  tracePath(HEAD_PATH); ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(13, -8); ctx.quadraticCurveTo(21, -15, 29, -8); ctx.quadraticCurveTo(21, -3, 13, -8); ctx.fill();
  ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(10, -19); ctx.quadraticCurveTo(22, -24, 32, -16); ctx.stroke();
  ctx.beginPath(); ctx.arc(-6, 2, 7, -1.2, 1.6); ctx.stroke();
  const curls = (pts, r) => { ctx.strokeStyle = INK; ctx.lineWidth = 2.2; for (const [cx, cy] of pts) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 5); ctx.stroke(); } };
  if (kind === 'zeus' || kind === 'prometheus' || kind === 'human') {
    ctx.beginPath(); ctx.moveTo(26, -36); ctx.quadraticCurveTo(0, -60, -30, -40); ctx.quadraticCurveTo(-48, -10, -26, kind === 'human' ? 20 : 36); ctx.quadraticCurveTo(-14, 0, -6, -12); ctx.quadraticCurveTo(10, -30, 26, -36);
    ctx.fillStyle = HAIR; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    curls([[-20, -36], [-34, -18], [-30, 4], [0, -44], [-10, -22]], 6);
  }
  if (kind === 'zeus' || kind === 'prometheus') {
    const long = kind === 'zeus' ? 1 : 0.6;
    ctx.beginPath(); ctx.moveTo(34, 22); ctx.quadraticCurveTo(34, 50 * long + 20, 22, 60 * long + 26); ctx.quadraticCurveTo(0, 62 * long + 20, -8, 30); ctx.quadraticCurveTo(-4, 10, 8, 12); ctx.quadraticCurveTo(22, 28, 34, 22);
    ctx.fillStyle = HAIR; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    curls([[20, 40], [6, 34], [14, 56 * long]], 5);
  }
  if (kind === 'zeus') { ctx.fillStyle = INK; for (let k = 0; k < 7; k++) { ctx.save(); ctx.translate(-34 + k * 9, -44 + Math.abs(k - 3) * 2); ctx.rotate(-0.6 + k * 0.2); ctx.beginPath(); ctx.ellipse(0, -8, 4, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
  if (kind === 'pandora') {
    ctx.beginPath(); ctx.moveTo(26, -36); ctx.quadraticCurveTo(0, -58, -30, -40); ctx.quadraticCurveTo(-46, -16, -30, 10); ctx.quadraticCurveTo(-12, -8, 26, -36); ctx.fillStyle = HAIR; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    circle(-40, -30, 20, HAIR); ctx.beginPath(); ctx.arc(-40, -30, 20, 0, 7); ctx.stroke(); curls([[-40, -30], [-46, -38]], 7);
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(20, -38); ctx.quadraticCurveTo(-6, -50, -26, -34); ctx.stroke();
    circle(-4, 14, 4, INK);
  }
  ctx.restore();
  // front arm + held objects
  const armF = o.armF || [0.15 + 0.4 * Math.sin(ph) * wk, 0.5];
  const [hx, hy] = limb(16, -318, armF[0], 78, armF[1], 72, 24, 19);
  circle(hx, hy, 12, CLAY);
  ctx.restore();
  ctx.restore();
  // world-space hand position for props
  const ang = o.lean || 0, lx = 16 + Math.sin(armF[0]) * 78 + Math.sin(armF[1]) * 72, ly = -318 + Math.cos(armF[0]) * 78 + Math.cos(armF[1]) * 72;
  const rx = hipX + (lx - hipX) * Math.cos(ang) - (ly - hipY) * Math.sin(ang), ry = hipY + (lx - hipX) * Math.sin(ang) + (ly - hipY) * Math.cos(ang);
  return { hand: [x + rx * s * f, y + ry * s] };
}
function bolt(x, y, s, rot, t, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * k, s * k);
  glow(0, 0, 160, 'rgba(255,220,120,.9)', 0.8 + 0.2 * Math.sin(t * 20));
  const P = [[0, -120], [18, -60], [6, -54], [26, 0], [8, 0], [24, 60], [0, 120], [-6, 66], [-20, 70], [-8, 4], [-24, 6], [-10, -56], [-24, -54]];
  ctx.beginPath(); P.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
  const g = ctx.createLinearGradient(-20, -120, 20, 120); g.addColorStop(0, '#fffbe6'); g.addColorStop(0.5, '#ffd34d'); g.addColorStop(1, '#ff9a1a');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.restore();
}
function lightning(x0, y0, x1, y1, seed, alpha) {
  if (alpha <= 0) return;
  const R = rng(seed), pts = [[x0, y0]], n = 14;
  for (let i = 1; i < n; i++) { const u = i / n; pts.push([lerp(x0, x1, u) + (R() - 0.5) * 140, lerp(y0, y1, u) + (R() - 0.5) * 30]); }
  pts.push([x1, y1]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.lineJoin = 'round';
  for (const [w, c] of [[38, 'rgba(160,190,255,.35)'], [16, 'rgba(210,225,255,.8)'], [6, '#ffffff']]) {
    ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke();
  }
  ctx.restore();
}
function cloud(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const [cx, cy, r] of [[-90, 10, 60], [-20, -20, 80], [70, 0, 66], [130, 22, 44], [-150, 26, 40]]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.45, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
  ctx.fillStyle = CLAY; ctx.fillRect(-190, 24, 360, 30); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(-190, 54); ctx.lineTo(170, 54); ctx.stroke();
  ctx.restore();
}
// the pithos: a big clay storage jar. lid = 0 closed .. 1 lifted away
function pithos(x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-70, -380); ctx.bezierCurveTo(-90, -330, -190, -300, -180, -160); ctx.bezierCurveTo(-170, -40, -100, -6, -60, 0);
  ctx.lineTo(60, 0); ctx.bezierCurveTo(100, -6, 170, -40, 180, -160); ctx.bezierCurveTo(190, -300, 90, -330, 70, -380); ctx.closePath();
  ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = GLAZE; ctx.fillRect(-200, -300, 400, 52); ctx.fillRect(-200, -70, 400, 22);
  ctx.strokeStyle = CLAY; ctx.lineWidth = 5; ctx.beginPath();
  for (let xx = -200; xx < 200; xx += 42) { ctx.moveTo(xx, -256); ctx.lineTo(xx, -292); ctx.lineTo(xx + 30, -292); ctx.lineTo(xx + 30, -266); ctx.lineTo(xx + 12, -266); ctx.lineTo(xx + 12, -280); }
  ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath();
  for (let xx = -200; xx < 200; xx += 8) ctx.lineTo(xx, -150 + Math.sin(xx / 22) * 14); ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,190,.16)'; ctx.fillRect(-120, -380, 40, 380);
  if (o.gleam !== undefined) { const gx = lerp(-260, 260, o.gleam), g = ctx.createLinearGradient(gx - 70, 0, gx + 70, 0); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.5, 'rgba(255,240,200,.45)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 70, -400, 140, 400); }
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(-84, -400, 168, 26, 8); ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
  const lid = o.lid || 0;
  if (lid < 1) {
    ctx.save(); ctx.translate(-lid * 40, -406 - lid * 70); ctx.rotate(-lid * 0.9);
    ctx.beginPath(); ctx.ellipse(0, 0, 90, 18, 0, 0, Math.PI * 2); ctx.fillStyle = CLAY; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -18, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function goldBox(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x + (o.rattle ? Math.sin(t * 50) * o.rattle * 6 : 0), y); ctx.scale(s, s);
  glow(0, -120, 380, 'rgba(255,190,80,.35)', 0.8 + 0.2 * Math.sin(t * 3));
  const g = ctx.createLinearGradient(-190, -260, 190, 0); g.addColorStop(0, '#fff0b8'); g.addColorStop(0.35, '#e6b04a'); g.addColorStop(1, '#8a5a12');
  ctx.beginPath(); ctx.roundRect(-190, -230, 380, 230, 18); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#5a3a08'; ctx.stroke();
  ctx.strokeStyle = '#7a4f0c'; ctx.lineWidth = 6; ctx.beginPath();
  for (let xx = -170; xx < 160; xx += 46) { ctx.moveTo(xx, -40); ctx.lineTo(xx, -72); ctx.lineTo(xx + 34, -72); ctx.lineTo(xx + 34, -48); ctx.lineTo(xx + 14, -48); ctx.lineTo(xx + 14, -60); }
  ctx.stroke();
  for (const [gx, col] of [[-110, '#d6243a'], [0, '#2a6cf0'], [110, '#d6243a']]) { circle(gx, -150, 22, '#5a3a08'); circle(gx, -150, 16, col); circle(gx - 5, -155, 5, 'rgba(255,255,255,.8)'); }
  const lid = o.lid || 0;
  ctx.save(); ctx.translate(-200, -230); ctx.rotate(-lid * 0.5);
  const lg = ctx.createLinearGradient(0, -90, 0, 0); lg.addColorStop(0, '#fff3c4'); lg.addColorStop(1, '#b77d1f');
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(400, 0); ctx.lineTo(400, -40); ctx.quadraticCurveTo(200, -110, 0, -40); ctx.closePath(); ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#5a3a08'; ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6); ctx.fillStyle = '#ffd77a'; ctx.fillRect(-180, -236, 360, 8); ctx.restore();
  ctx.restore();
}
function spirit(x, y, s, t, eye, seed) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-40, 0);
  ctx.bezierCurveTo(-50, 90, 30 + Math.sin(t * 6 + seed) * 30, 120, 10 + Math.sin(t * 5 + seed) * 50, 230);
  ctx.bezierCurveTo(60, 120, 50, 60, 40, 0); ctx.arc(0, 0, 40, 0, Math.PI, true); ctx.closePath();
  const g = ctx.createLinearGradient(0, -40, 0, 230); g.addColorStop(0, 'rgba(120,60,160,.95)'); g.addColorStop(1, 'rgba(60,20,80,0)');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(210,150,255,.6)'; ctx.stroke(); glow(0, 0, 120, 'rgba(170,80,255,.35)', 1);
  for (const ex of [-14, 14]) { glow(ex, -4, 26, eye, 0.9); circle(ex, -4, 6, '#fff'); }
  ctx.restore();
}
function smoke(cx, cy, age, seed, n = 70) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 2.4, sp = 300 + R() * 700, delay = R() * 0.5, sz = 40 + R() * 90;
    const u = clamp((age - delay) / 1.6); if (u <= 0) continue;
    const d = easeOut(u) * sp, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d - u * 120, r = sz * (0.4 + u * 1.4);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(150,70,190,${0.5 * (1 - u * 0.75)})`); g.addColorStop(0.55, `rgba(90,30,120,${0.3 * (1 - u * 0.75)})`); g.addColorStop(1, 'rgba(30,8,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
function sparkle(x, y, r, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a); ctx.fillStyle = '#fff4c8';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore();
}

// ---- parchment world for the Renaissance scholar ----
const parchC = () => cached('parch', 1500, 2400, (w, h) => {
  ctx.fillStyle = '#e8d2a2'; ctx.fillRect(0, 0, w, h);
  const R = rng(12);
  for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '140,90,40' : '255,245,220'},${0.02 + R() * 0.05})`; ctx.beginPath(); ctx.arc(R() * w, R() * h, 4 + R() * 40, 0, 7); ctx.fill(); }
  const e = ctx.createRadialGradient(w / 2, h / 2, 400, w / 2, h / 2, 1300); e.addColorStop(0, 'rgba(120,70,20,0)'); e.addColorStop(1, 'rgba(110,60,15,.6)');
  ctx.fillStyle = e; ctx.fillRect(0, 0, w, h);
});
function inkLine(fn, wdt = 5) { ctx.save(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = wdt; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); fn(); ctx.stroke(); ctx.restore(); }
function scholarScene(t, st, o) {
  layer(0.15, () => ctx.drawImage(parchC(), -210, -240));
  layer(1, () => {
    // desk
    inkLine(() => { ctx.moveTo(60, 1150); ctx.lineTo(1020, 1150); ctx.moveTo(120, 1150); ctx.lineTo(120, 1330); ctx.moveTo(960, 1150); ctx.lineTo(960, 1330); }, 7);
    // scholar in a cap, writing (ink drawing)
    ctx.save(); ctx.translate(300, 1150);
    ctx.fillStyle = 'rgba(70,40,20,.85)';
    ctx.beginPath(); ctx.moveTo(-130, 0); ctx.quadraticCurveTo(-150, -240, -60, -330); ctx.quadraticCurveTo(10, -360, 70, -320); ctx.quadraticCurveTo(140, -200, 120, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(20, -420, 66, 76, 0.1, 0, Math.PI * 2); ctx.fillStyle = '#e8c9a0'; ctx.fill(); inkLine(() => ctx.ellipse(20, -420, 66, 76, 0.1, 0, Math.PI * 2), 4);
    inkLine(() => { ctx.moveTo(84, -430); ctx.lineTo(100, -400); ctx.lineTo(82, -392); }, 4);
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(10, -478, 86, 34, -0.15, 0, Math.PI * 2); ctx.fill();
    circle(50, -428, 5, '#2a1a10');
    const wr = Math.sin(t * 14) * 10;
    inkLine(() => { ctx.moveTo(60, -280); ctx.quadraticCurveTo(170, -200, 250 + wr, -60); }, 26);
    ctx.restore();
    // quill
    const qx = 560 + ((st * 160) % 220), qy = 1080 + Math.sin(t * 14) * 8;
    inkLine(() => { ctx.moveTo(qx, qy); ctx.lineTo(qx + 70, qy - 190); }, 4);
    ctx.save(); ctx.translate(qx + 70, qy - 190); ctx.rotate(0.35); ctx.beginPath(); ctx.ellipse(0, -40, 18, 70, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,250,240,.9)'; ctx.fill(); ctx.restore();
    inkLine(() => ctx.ellipse(qx + 92, qy - 230, 18, 70, 0.35, 0, Math.PI * 2), 3);
    // open book with the translation being written
    ctx.save(); ctx.translate(700, 1080); ctx.rotate(-0.05);
    ctx.fillStyle = '#f6ead0'; ctx.beginPath(); ctx.moveTo(-240, -20); ctx.quadraticCurveTo(-120, -60, 0, -20); ctx.quadraticCurveTo(120, -60, 240, -20); ctx.lineTo(240, 60); ctx.lineTo(-240, 60); ctx.closePath(); ctx.fill();
    inkLine(() => { ctx.moveTo(0, -20); ctx.lineTo(0, 60); ctx.moveTo(-240, 60); ctx.lineTo(240, 60); }, 3);
    ctx.restore();
    // candle
    ctx.fillStyle = '#efe2c4'; ctx.fillRect(900, 980, 40, 170); inkLine(() => ctx.rect(900, 980, 40, 170), 3);
    flame(920, 980, 22, t, 3); glow(920, 940, 300, 'rgba(255,170,80,.4)', 1);
    if (o.words) o.words();
  });
}

// ======================= scenes =======================
S.hook = ({ t, lt, ln }) => {
  const never = wl(ln, 'never', 0.4), last = wlLast(ln, 'box', 0.85);
  const z = lerp(1.32, 1.12, easeInOut(lt / 2)) + (lt > last ? easeOut((lt - last) / 0.5) * 0.12 : 0);
  camera(540, 900, z);
  shake(t, lt > last ? 18 * Math.exp(-(lt - last) * 6) : 0);
  templeWorld(t, { main: () => {
    // pedestal
    const pg = ctx.createLinearGradient(380, 0, 700, 0); pg.addColorStop(0, '#9c8e7c'); pg.addColorStop(0.4, '#e9dfcf'); pg.addColorStop(1, '#7d6f62');
    ctx.fillStyle = pg; ctx.fillRect(390, 1000, 300, 380); ctx.fillStyle = '#efe6d6'; ctx.fillRect(360, 980, 360, 30); ctx.fillRect(360, 1370, 360, 30);
    goldBox(540, 985, 0.72, t, { rattle: lt < never ? 0.6 : 0.15, lid: 0.04 + 0.03 * Math.sin(t * 9) });
    owl(900, 1120 + 380 * (1 - easeOut((lt - never + 0.3) / 0.5)), 0.6, { t, mood: lt > last ? 'wise' : 'calm', look: -1, tilt: -0.08 });
  } });
  goldText("PANDORA'S BOX", 540, 330, 112, lt + 0.2);
  if (lt > last) {
    const k = clamp((lt - last) / 0.22);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#e0242f'; ctx.lineWidth = 26; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(620, 300); ctx.lineTo(lerp(620, 980, k), lerp(300, 380, k)); ctx.stroke(); ctx.restore();
    goldText('NOT A BOX', 540, 470, 88, lt - last - 0.1, { mid: '#ff7a5a', bot: '#a8201a', top: '#ffd0c0', glow: 'rgba(255,80,60,.5)' });
  }
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'never', 0.4) - 0.2, type: 'whoosh' }, { t: wlLast(ln, 'box', 0.85), type: 'stamp' }];

S.jar = ({ t, lt, ln }) => {
  const jar = wl(ln, 'jar', 0.55), pi = wl(ln, 'pithos', 0.85);
  const [shot, st] = shotOf(lt, [jar - 0.1]);
  if (shot === 0) {
    camera(lerp(380, 470, easeInOut(lt / jar)), 860, lerp(1.25, 1.12, easeInOut(lt / jar)));
    // zoom-through from the temple into the painting
    CAM.z *= 1 + 1.5 * Math.pow(1 - clamp(lt / 0.35), 2);
    vaseWorld(t, () => {
      fig('pandora', lerp(120, 430, easeOut(lt / jar)), 1290, 1.45, { t, walk: 1 - clamp((lt - jar + 0.6) / 0.5), phase: lt * 7 });
      inscription('ΠΑΝΔΩΡΑ', 760, 820, 54, clamp(lt / 0.6), true);
    });
    namePlate('HESIOD · c. 700 BC', 540, 330, clamp((lt - 0.3) / 0.4));
  } else {
    camera(560, lerp(980, 760, easeInOut(st / 1.6)), lerp(1.05, 1.2, easeInOut(st / 2)));
    whip(st, -1, 600);
    vaseWorld(t, () => {
      fig('pandora', 300, 1290, 1.3, { t, armF: [0.9, 0.2], headTilt: -0.05 });
      const rise = easeBack(clamp(st / 0.6));
      pithos(700, 1290 + (1 - rise) * 300, 1.35 * (0.6 + 0.4 * rise), { gleam: clamp((st - 0.3) / 0.7) });
    });
    goldText('A JAR', 540, 330, 130, st - 0.1);
    if (lt > pi - 0.15) { goldText('PITHOS', 540, 470, 86, lt - pi + 0.15, { step: 0.05 }); ctx.save(); ctx.font = `italic 700 46px ${GREEK}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,230,180,' + clamp((lt - pi) / 0.4) + ')'; ctx.fillText('πίθος', 540, 560); ctx.restore(); }
  }
};
EV.jar = ln => [{ t: 0.0, type: 'whoosh' }, { t: wl(ln, 'jar', 0.55) - 0.1, type: 'boom' }, { t: wl(ln, 'pithos', 0.85) - 0.1, type: 'chime' }];

S.fire = ({ t, lt, ln }) => {
  const pan = wl(ln, 'pandora', 0.2), aft = wl(ln, 'after', 0.45), gave = wl(ln, 'gave', 0.8);
  const [shot, st] = shotOf(lt, [pan - 0.05, aft - 0.05, gave - 0.1]);
  if (shot === 0) {
    camera(560, 820, lerp(1.0, 1.18, easeInOut(st / 1.2)));
    shake(t, 26 * Math.exp(-st * 5));
    vaseWorld(t, () => {
      cloud(560, 1250, 1.6);
      const z = fig('zeus', 520, 1240, 1.45, { t, armF: [-2.5 + Math.sin(t * 3) * 0.05, -2.9], armB: [-0.3, -0.6], hold: 'scepter' });
      bolt(z.hand[0], z.hand[1] - 40, 0.9, 0.3, t);
      lightning(z.hand[0], z.hand[1] - 100, z.hand[0] - 200, -200, Math.floor(t * 12), 1 - clamp(st / 0.35));
      inscription('ΖΕΥΣ', 200, 760, 58, clamp(st / 0.4), true);
    });
    flash(st, 0.2, '255,250,230', 0.85);
    namePlate('ZEUS', 540, 330, clamp(st / 0.3));
  } else if (shot === 1) {
    camera(540, 900, lerp(1.12, 1.0, easeInOut(st / 1.4)));
    whip(st, 1);
    vaseWorld(t, () => {
      const rv = clamp(st / 0.9);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 1290 - 640 * rv, 1080, 700); ctx.clip();
      fig('pandora', 540, 1290, 1.45, { t, armF: [0.3, 0.6], armB: [-0.2, -0.3] });
      ctx.restore();
      for (let i = 0; i < 26; i++) { const yy = 1290 - 640 * rv + Math.sin(i * 7.7) * 20, xx = 420 + hash1(i) * 260; sparkle(xx, yy, 10 + 10 * hash1(i + 3), (1 - rv * 0.6) * (0.5 + 0.5 * Math.sin(t * 10 + i))); }
      glow(540, 1290 - 640 * rv, 260, 'rgba(255,210,120,.5)', 1 - rv * 0.5);
    });
    namePlate('PANDORA', 540, 330, clamp(st / 0.3));
    if (lt > wl(ln, 'punishment', 0.5) - 0.1) goldText('A PUNISHMENT', 540, 450, 84, lt - wl(ln, 'punishment', 0.5) + 0.1, { mid: '#ff9a6a', bot: '#a8321a' });
  } else if (shot === 2) {
    const runX = lerp(-80, 1160, st / 1.9);
    camera(lerp(420, 660, st / 1.9), 880, 1.08);
    whip(st, 1);
    vaseWorld(t, () => {
      const p = fig('prometheus', runX, 1290, 1.35, { t, walk: 1.4, phase: st * 11, lean: 0.22, armF: [-1.4, -2.2] });
      for (let i = 0; i < 12; i++) glow(p.hand[0] - i * 34, p.hand[1] - 30 + Math.sin(t * 9 + i) * 10, 70 - i * 4, 'rgba(255,140,40,.6)', 1 - i / 12);
      ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(p.hand[0], p.hand[1] + 40); ctx.lineTo(p.hand[0] + 8, p.hand[1] - 50); ctx.stroke();
      flame(p.hand[0] + 8, p.hand[1] - 48, 34, t, 1); glow(p.hand[0], p.hand[1] - 80, 300, 'rgba(255,150,50,.6)', 1);
      particles(17, 30, t, { x0: runX - 400, x1: runX, y0: 700, y1: 1000, vy: -40, vx: -80, size: 3, color: 'rgba(255,150,50,1)', core: '#ffe0a0', glow: true, life: 1.6, wobble: 20 });
      inscription('ΠΡΟΜΗΘΕΥΣ', runX - 60, 600, 46, 1);
    }, { tint: 'rgba(255,120,40,.06)' });
    namePlate('PROMETHEUS', 540, 330, clamp(st / 0.3));
    goldText('STOLE FIRE', 540, 450, 84, st - 0.5, { mid: '#ffb04a' });
  } else {
    camera(560, 900, lerp(1.0, 1.1, easeInOut(st / 1.5)));
    whip(st, 1, 500);
    vaseWorld(t, () => {
      fig('prometheus', 260, 1290, 1.25, { t, armF: [-1.2, -1.6] });
      const hand = [260 + 1.25 * (16 + Math.sin(-1.2) * 78 + Math.sin(-1.6) * 72) * 1, 1290 + 1.25 * (-318 + Math.cos(-1.2) * 78 + Math.cos(-1.6) * 72)];
      flame(hand[0], hand[1] - 10, 30, t, 2);
      const lit = clamp((st - 0.4) / 0.6);
      [[600, 0.9, -1], [760, 0.85, -1], [900, 0.95, -1]].forEach(([hx, sc, f], i) => {
        fig('human', hx, 1290, sc, { t, f, armF: [-1.0 * lit - 0.2, -1.4 * lit], walk: 0 });
        glow(hx - 60, 900, 220, 'rgba(255,150,60,.45)', lit);
      });
      ctx.fillStyle = INK; ctx.fillRect(700, 1262, 120, 26); flame(760, 1262, 40 * lit, t, 4); glow(760, 1200, 320, 'rgba(255,140,50,.6)', lit);
      inscription('ΑΝΘΡΩΠΟΙ', 760, 780, 44, lit);
    }, { tint: 'rgba(255,120,40,.06)' });
    namePlate('HUMANS', 540, 330, clamp(st / 0.3));
  }
};
EV.fire = ln => [{ t: 0, type: 'thunder' }, { t: wl(ln, 'pandora', 0.2) - 0.05, type: 'shimmer' }, { t: wl(ln, 'after', 0.45) - 0.05, type: 'firewhoosh' }, { t: wl(ln, 'gave', 0.8) - 0.1, type: 'whoosh' }];

S.open = ({ t, lt, ln }) => {
  const op = wl(ln, 'opened', 0.2);
  const [shot, st] = shotOf(lt, [op + 0.2]);
  if (shot === 0) {
    camera(600, 900, lerp(1.1, 1.3, easeInOut(st / 1.2)));
    whip(st, -1);
    vaseWorld(t, () => {
      const lift = clamp((lt - op + 0.25) / 0.45);
      fig('pandora', 400, 1290, 1.35, { t, armF: [lerp(0.6, -1.6, lift), lerp(0.3, -1.9, lift)], headTilt: -0.05 });
      pithos(760, 1290, 1.2, { lid: lift * 0.4 });
      glow(760, 800, 220, 'rgba(170,60,255,.6)', lift);
    });
  } else {
    camera(640, lerp(820, 900, easeOut(st / 1)), lerp(1.35, 1.0, easeOut(st / 0.9)));
    shake(t, 22 * Math.exp(-st * 2.5));
    vaseWorld(t, () => {
      fig('pandora', 300, 1290, 1.25, { t, armF: [2.0, 2.85], armB: [1.7, 2.6], lean: -0.14, headTilt: -0.12 });
      pithos(700, 1290, 1.12, { lid: 1 });
      glow(700, 860, 420, 'rgba(170,60,255,.45)', clamp(st / 0.3) * (1 - clamp((st - 2.5) / 1.5)));
      smoke(700, 830, st, 21);
      const sp = [['sickness', 'SICKNESS', '#7dff6a', -1], ['work', 'TOIL', '#ffd23a', 1], ['trouble', 'TROUBLE', '#ff4a4a', 0]];
      sp.forEach(([w, label, eye, dir], i) => {
        const at = wl(ln, w, 0.4 + i * 0.2) - ln.start * 0 - (op + 0.2) - 0.15, u = clamp((st - at) / 1.4);
        if (u <= 0) return;
        const x = 700 + dir * 330 * easeOut(u) + Math.sin(t * 3 + i) * 30, y = 820 - 330 * easeOut(u) - i * 40;
        spirit(x, y, 1.6, t, eye, i * 3);
        namePlate(label, x, y - 110, clamp(u * 3));
      });
    }, { tint: `rgba(60,0,60,${0.25 * clamp(st / 0.6)})` });
  }
};
EV.open = ln => [{ t: wl(ln, 'opened', 0.2) + 0.2, type: 'smokeburst' }, { t: wl(ln, 'sickness', 0.5) - 0.15, type: 'whoosh' }, { t: wl(ln, 'work', 0.65) - 0.15, type: 'whoosh' }, { t: wl(ln, 'trouble', 0.85) - 0.15, type: 'boom' }];

S.hope = ({ t, lt, ln }) => {
  const h = wl(ln, 'hope', 0.8);
  const [shot, st] = shotOf(lt, [h - 0.2]);
  if (shot === 0) {
    camera(700, lerp(900, 860, easeInOut(st / 1.6)), lerp(1.0, 1.7, easeInOut(st / (h - 0.2))));
    vaseWorld(t, () => {
      fig('pandora', 330, 1290, 1.25, { t, armF: [0.4, 0.2], headTilt: 0.12 });
      pithos(700, 1290, 1.12, { lid: 1 });
      smoke(700, 830, 1.6 + lt * 0.3, 21, 30);
    }, { tint: `rgba(10,0,20,${0.35 - 0.25 * clamp(st / 1.2)})` });
    goldText('ONLY ONE THING...', 540, 330, 84, st - 0.1, { step: 0.03 });
  } else {
    camera(540, 900, lerp(0.92, 1.05, easeInOut(st / 2)));
    ctx.fillStyle = '#0b0604'; ctx.fillRect(0, 0, W, H);
    layer(1, () => {
      const r = 420 + 30 * Math.sin(t * 2);
      glow(540, 860, 900, 'rgba(255,190,90,.35)', 1);
      godRays(540, 860, Math.PI, Math.PI * 2, 18, 900, 'rgba(255,220,150,.35)', 0.5 * clamp(st / 0.6), t);
      glow(540, 860, r * 0.55, 'rgba(255,240,200,.95)', 1);
      circle(540, 860, 46 + 4 * Math.sin(t * 4), '#fffbea');
      for (let i = 0; i < 16; i++) { const a = t * 0.6 + i / 16 * Math.PI * 2, rr = 150 + 70 * Math.sin(t * 1.3 + i); sparkle(540 + Math.cos(a) * rr, 860 + Math.sin(a) * rr * 0.7, 10 + 8 * hash1(i), 0.6 + 0.4 * Math.sin(t * 5 + i)); }
      particles(31, 40, t, { x0: 200, x1: 880, y0: 600, y1: 1200, vy: -30, size: 2.5, color: 'rgba(255,220,150,1)', core: '#fff4d0', glow: true, life: 3, wobble: 30 });
    });
    goldText('HOPE', 540, 380, 190, st, { font: '"Cinzel Decorative", "Cinzel", serif', step: 0.08 });
    inscription('ἐλπίς', 540, 520, 54, clamp((st - 0.6) / 0.5));
  }
};
EV.hope = ln => [{ t: 0.05, type: 'hush' }, { t: wl(ln, 'hope', 0.8) - 0.2, type: 'chime' }];

S.box = ({ t, lt, ln }) => {
  const ab = wl(ln, 'about', 0.3), mi = wl(ln, 'mistake', 0.85), bx = wlLast(ln, 'box', 0.7);
  const [shot, st] = shotOf(lt, [ab - 0.05, mi - 0.15]);
  if (shot === 0) {
    camera(540, 960, lerp(1.25, 1.35, easeInOut(st / 2)));
    templeWorld(t, { main: () => owl(540, 1080, 1.05, { t, mood: 'calm', look: Math.sin(t * 1.5) * 0.6, tilt: Math.sin(t * 1.2) * 0.1, wingR: 0.35 + 0.05 * Math.sin(t * 3) }) });
    goldText('SO... THE BOX?', 540, 330, 104, st);
  } else if (shot === 1) {
    camera(lerp(560, 640, easeInOut(st / 3)), 900, lerp(1.0, 1.12, easeInOut(st / 3)));
    whip(st, 1);
    scholarScene(t, st, { words: () => {
      ctx.save(); ctx.translate(700, 1080); ctx.rotate(-0.05);
      const wr = clamp((lt - (ab + 0.2)) / 1.0);
      ctx.font = `italic 700 50px ${GREEK}`; ctx.fillStyle = '#3a2412'; ctx.textAlign = 'center';
      ctx.save(); ctx.beginPath(); ctx.rect(-230, -60, 220 * wr + 10, 120); ctx.clip(); ctx.fillText('πίθος', -120, 20); ctx.restore();
      const cr = clamp((lt - bx + 0.5) / 0.3);
      if (cr > 0) { ctx.strokeStyle = '#a3201a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-200, 6); ctx.lineTo(lerp(-200, -40, cr), 6); ctx.stroke(); }
      const w2 = clamp((lt - bx + 0.2) / 0.8);
      ctx.save(); ctx.beginPath(); ctx.rect(10, -60, 220 * w2, 120); ctx.clip(); ctx.font = `italic 700 50px "DejaVu Serif", serif`; ctx.fillText('pyxis', 120, 20); ctx.restore();
      ctx.restore();
    } });
    namePlate('ERASMUS · 1500s', 540, 330, clamp(st / 0.3));
    if (lt > bx - 0.2) goldText('"PYXIS" = BOX', 540, 470, 80, lt - bx + 0.2, { mid: '#ffcf7a' });
  } else {
    camera(540, 900, lerp(1.0, 1.08, easeOut(st / 1.5)));
    whip(st, -1);
    shake(t, st > 0.6 ? 16 * Math.exp(-(st - 0.6) * 6) : 0);
    vaseWorld(t, () => {
      const mo = easeInOut(clamp(st / 0.7));
      ctx.save(); ctx.globalAlpha = 1 - mo; ctx.translate(540, 1290); ctx.scale(1 + mo * 0.3, 1 - mo * 0.5); pithos(0, 0, 1.15); ctx.restore();
      ctx.save(); ctx.globalAlpha = mo; goldBox(540, 1290, 0.95 * (0.6 + 0.4 * mo), t, {}); ctx.restore();
    });
    if (st > 0.6) {
      const k = clamp((st - 0.6) / 0.2);
      ctx.save(); ctx.translate(540, 470); ctx.rotate(-0.08); ctx.scale(lerp(1.8, 1, k), lerp(1.8, 1, k)); ctx.globalAlpha = k;
      ctx.lineWidth = 12; ctx.strokeStyle = '#d0242c'; ctx.beginPath(); ctx.roundRect(-380, -80, 760, 160, 20); ctx.stroke();
      ctx.font = `900 84px ${SERIF}`; ctx.fillStyle = '#e0303a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('IT STUCK', 0, 6); ctx.restore();
    }
    goldText('500 YEARS LATER...', 540, 300, 76, st - 0.1, { step: 0.025 });
  }
};
EV.box = ln => [{ t: wl(ln, 'about', 0.3) - 0.05, type: 'whoosh' }, { t: wl(ln, 'about', 0.3) + 0.2, type: 'quill' }, { t: wl(ln, 'mistake', 0.85) - 0.15, type: 'whoosh' }, { t: wl(ln, 'mistake', 0.85) + 0.45, type: 'stamp' }];

S.cta = ({ t, lt }) => {
  camera(540, 980, lerp(1.2, 1.08, easeOut(lt / 1.2)));
  templeWorld(t, { main: () => owl(540, 1100, 1.05, { t, mood: lt > 1 ? 'wink' : 'calm', wingL: 0.75 + 0.08 * Math.sin(t * 4), wingR: 0.75 + 0.08 * Math.sin(t * 4 + 1) }) });
  goldText('MYTHS, CORRECTED', 540, 320, 96, lt + 0.1);
  const k = easeBack(clamp((lt - 0.4) / 0.35)), p = pulse(t, 70);
  if (k > 0) {
    ctx.save(); ctx.translate(540, 470); ctx.scale(k * p, k * p);
    ctx.beginPath(); ctx.roundRect(-200, -52, 400, 104, 52); ctx.fillStyle = '#c81e3a'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#f2c45a'; ctx.stroke();
    ctx.font = `900 54px ${SERIF}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FOLLOW +', 0, 4); ctx.restore();
  }
};
EV.cta = () => [{ t: 0.1, type: 'chime' }, { t: 0.4, type: 'boom' }];
