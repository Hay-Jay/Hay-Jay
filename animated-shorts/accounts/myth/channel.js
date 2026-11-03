// Channel: Greek mythology, hosted by Glaux, Athena's owl.
// Look: a moonlit temple for the host, and story scenes painted like animated red-figure Greek vases.
CAP_HI = '#ffd36b';
Object.assign(FX, { blur: 4, shutter: 0.6, grain: 0.045, vignette: 0.55, grade: { color: '#ffb35c', op: 'soft-light', alpha: 0.12 }, punch: false });
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
    tongueBand(-400, 1500, 110);
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
function namePlate(str, x, y, k = 1, size = 48) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(easeBack(k), easeBack(k));
  ctx.font = `900 ${size}px ${SERIF}`; const w = ctx.measureText(str).width + size * 1.25;
  ctx.beginPath(); ctx.roundRect(-w / 2, -size * 0.8, w, size * 1.6, 8); ctx.fillStyle = 'rgba(19,11,7,.88)'; ctx.fill();
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
// palette for the figure being drawn (stone statues and marble swap it)
let PAL = { fill: CLAY, ink: INK, hair: HAIR };
const STONE = { fill: '#a39d92', ink: '#3b3732', hair: '#7d776e' };
const MARBLE_PAL = { fill: '#ece4d4', ink: '#7c7062', hair: '#cfc4b0' };
function limb(ax, ay, a1, l1, a2, l2, w1, w2) {
  const kx = ax + Math.sin(a1) * l1, ky = ay + Math.cos(a1) * l1, ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
  for (const [col, extra] of [[PAL.ink, 6], [PAL.fill, 0]]) {
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.lineWidth = w1 + extra; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = w2 + extra; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
  }
  return [ex, ey, kx, ky];
}
// Each character is a preset: robe length, hair, beard, headgear, wings.
const PRESET = {
  zeus: { robe: 'mid', hair: 'curly', beard: 1, wreath: true },
  poseidon: { robe: 'mid', hair: 'curly', beard: 1 },
  hades: { robe: 'long', hair: 'curly', beard: 1, crown: true },
  laocoon: { robe: 'long', hair: 'curly', beard: 0.8, wreath: true },
  prometheus: { robe: 'short', hair: 'curly', beard: 0.6 },
  daedalus: { robe: 'short', hair: 'curly', beard: 0.75 },
  human: { robe: 'short', hair: 'short' },
  icarus: { robe: 'short', hair: 'short' },
  hero: { robe: 'short', hair: 'short', helmet: 'corinthian' },
  paris: { robe: 'short', hair: 'short', helmet: 'phrygian' },
  apollo: { robe: 'drape', hair: 'long', wreath: true },
  pandora: { robe: 'long', hair: 'bun', female: true },
  maiden: { robe: 'long', hair: 'long', female: true },
  persephone: { robe: 'long', hair: 'long', female: true, wreath: true },
  medusa: { robe: 'long', hair: 'snakes', female: true },
  gorgon: { robe: 'mid', hair: 'snakes', female: true, wings: 0.7 },
  athena: { robe: 'long', hair: 'long', female: true, helmet: 'corinthian' },
  demeter: { robe: 'long', hair: 'bun', female: true, veil: true },
  thetis: { robe: 'long', hair: 'long', female: true },
};
// feathered wings fixed at the shoulder. spread 0 folded .. 1 open; o.flap animates, o.loss (0..1) strips feathers
function featherWings(ax, ay, spread, o) {
  const t = o.t, flap = (o.flap || 0) * Math.sin(t * (o.flapSpeed || 9)) * 0.35, loss = o.loss || 0;
  for (const [layer, len, n, off] of [[0, 230, 9, -0.06], [1, 150, 8, 0.06]]) {
    for (let i = 0; i < n; i++) {
      if (layer === 0 && i / n > 1 - loss * 1.05) continue;
      const u = i / (n - 1), a = lerp(lerp(-0.7, 0.05, spread), lerp(0.35, 1.95, spread), u) + flap * (0.4 + u) + off;
      const l = len * (0.55 + 0.45 * Math.sin(Math.PI * (0.25 + 0.75 * u)));
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(-l / 2, 0, l / 2, 15 - layer * 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = layer ? PAL.fill : '#c26a33'; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-l + 8, 0); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
  }
}
function snakeHair(t) {
  for (let k = 0; k < 9; k++) {
    const a0 = lerp(-2.7, 0.15, k / 8), bx = Math.cos(a0) * 36 - 4, by = Math.sin(a0) * 38 - 10;
    const pts = [[bx, by]];
    for (let j = 1; j <= 8; j++) {
      const u = j / 8, w = Math.sin(t * 5 + k * 1.3 - u * 5) * 0.55;
      const a = a0 + w * u + (k < 4 ? -0.2 : 0.15) * u;
      const p = pts[pts.length - 1]; pts.push([p[0] + Math.cos(a) * 10, p[1] + Math.sin(a) * 10]);
    }
    for (const [col, wd] of [[PAL.ink, 11], [PAL.fill === CLAY ? '#b8d26a' : PAL.fill, 6]]) {
      ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.lineCap = 'round'; ctx.stroke();
    }
    const [hx, hy] = pts[pts.length - 1];
    ctx.beginPath(); ctx.ellipse(hx, hy, 8, 5.5, Math.atan2(hy - pts[7][1], hx - pts[7][0]), 0, Math.PI * 2);
    ctx.fillStyle = PAL.fill === CLAY ? '#9cba4a' : PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.stroke();
  }
}
function rod(x0, y0, x1, y1, w) { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = w + 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = PAL.fill; ctx.lineWidth = w; ctx.stroke(); ctx.restore(); }
// props held in a hand. ang = direction the prop points (0 = straight up, + = forward)
function handProp(kind, hx, hy, ang, o) {
  const t = o.t;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  ctx.strokeStyle = PAL.ink; ctx.fillStyle = PAL.fill; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'spear' || kind === 'trident' || kind === 'bident') {
    rod(0, 150, 0, -250, 6);
    if (kind === 'spear') { ctx.beginPath(); ctx.moveTo(0, -300); ctx.quadraticCurveTo(12, -268, 0, -246); ctx.quadraticCurveTo(-12, -268, 0, -300); ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); }
    else {
      const xs = kind === 'trident' ? [-22, 0, 22] : [-14, 14];
      rod(xs[0], -250, xs[xs.length - 1], -250, 5);
      for (const px of xs) { rod(px, -250, px, -300, 5); rod(px - 7, -288, px, -306, 3); rod(px + 7, -288, px, -306, 3); }
    }
  } else if (kind === 'sword') {
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(0, -120); ctx.quadraticCurveTo(26, -140, 22, -110); ctx.lineTo(6, -14); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    if (o.glint) glow(4, -90, 70, 'rgba(255,250,220,.8)', o.glint);
  } else if (kind === 'bow') {
    const d = o.draw || 0;
    for (const [c, w] of [[PAL.ink, 11], [PAL.fill, 6]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, -110); ctx.quadraticCurveTo(46, 0, 0, 110); ctx.stroke(); }
    ctx.strokeStyle = PAL.fill; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(-70 * d, 0); ctx.lineTo(0, 110); ctx.stroke();
    if (o.arrowNocked) { rod(-70 * d, 0, 70, 0, 4); ctx.fillStyle = PAL.fill; ctx.beginPath(); ctx.moveTo(70, -9); ctx.lineTo(88, 0); ctx.lineTo(70, 9); ctx.fill(); }
  } else if (kind === 'torch') {
    rod(0, 50, 0, -60, 7); ctx.restore();
    const fx = hx + Math.sin(ang) * 60, fy = hy - Math.cos(ang) * 60; flame(fx, fy, 30, t, hx); glow(fx, fy - 30, 260, 'rgba(255,150,50,.55)', 1); return;
  } else if (kind === 'wheat') {
    for (let k = -2; k <= 2; k++) { ctx.save(); ctx.rotate(k * 0.12); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, -130); ctx.stroke();
      for (let g = 0; g < 6; g++) { ctx.beginPath(); ctx.ellipse(g % 2 ? 6 : -6, -100 - g * 9, 4, 8, g % 2 ? 0.4 : -0.4, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); } ctx.restore(); }
  } else if (kind === 'pomegranate') {
    ctx.restore(); pomegranate(hx, hy - 20, 26, 0, t); return;
  } else if (kind === 'seed') {
    ctx.restore(); glow(hx, hy - 6, 60, 'rgba(255,40,60,.8)', 0.8 + 0.2 * Math.sin(t * 6)); circle(hx, hy - 6, 9, '#e0213a'); circle(hx - 3, hy - 9, 3, '#ffd0d6'); return;
  } else if (kind === 'flower') {
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -60); ctx.stroke(); ctx.restore(); narcissus(hx + Math.sin(ang) * 64, hy - Math.cos(ang) * 64, 16, t); return;
  } else if (kind === 'babyHeel') {
    ctx.restore(); ctx.save(); ctx.translate(hx, hy);
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.fillStyle = PAL.fill;
    ctx.beginPath(); ctx.ellipse(0, 50, 20, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 108, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(-6, -6); ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = PAL.fill; ctx.lineWidth = 5; ctx.stroke();
    if (o.heelGlow) { glow(-6, -6, 70, 'rgba(255,90,60,.9)', o.heelGlow); ctx.strokeStyle = '#ff5a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-6, -6, 22, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore(); return;
  }
  ctx.restore();
}
function shieldAt(x, y, r, emblem, t) {
  ctx.save(); ctx.translate(x, y);
  if (emblem === 'mirror') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 4, 0, 0, r); g.addColorStop(0, '#fff6e0'); g.addColorStop(0.5, '#d9b06a'); g.addColorStop(1, '#8a5a1a');
    circle(0, 0, r, g);
  } else { circle(0, 0, r, PAL.fill); }
  ctx.lineWidth = 5; ctx.strokeStyle = PAL.ink; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();
  if (emblem === 'owl') { ctx.fillStyle = PAL.ink; circle(-12, -6, 9, PAL.ink); circle(12, -6, 9, PAL.ink); circle(-12, -6, 4, PAL.fill); circle(12, -6, 4, PAL.fill); ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(4, 6); ctx.lineTo(0, 16); ctx.fill(); }
  else if (emblem === 'star') { ctx.fillStyle = PAL.ink; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? 14 : 34; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill(); }
  else if (emblem === 'gorgon') { ctx.save(); ctx.scale(0.55, 0.55); snakeHair(t); ctx.restore(); circle(0, 0, 18, PAL.fill); ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
// kind: a PRESET name. o: {t, f (1 right / -1 left), walk, phase, armF:[a,b], armB:[a,b], lean, headTilt, hold, holdB, propAng, propAngB,
//   wings, flap, loss, pal, alpha, emblem, draw, arrowNocked, glint, heelGlow}
function fig(kind, x, y, s, o) {
  const P = Object.assign({}, PRESET[kind] || PRESET.human, o.style || {});
  const t = o.t, f = o.f || 1, wk = o.walk || 0, ph = o.phase ?? t * 7;
  const prevPal = PAL; PAL = Object.assign({ fill: CLAY, ink: INK, hair: HAIR }, o.pal || {});
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s); ctx.lineJoin = 'round';
  if (o.alpha !== undefined) ctx.globalAlpha = clamp(o.alpha);
  const hipX = 0, hipY = -205;
  const wg = o.wings ?? P.wings;
  if (wg) featherWings(-14, -318, wg, o);
  const legs = side => {
    const a = side * 0.45 * Math.sin(ph) * wk + (o.legSpread || 0) * side, bend = wk * 0.7 * (1 - Math.cos(ph + (side > 0 ? 0 : Math.PI))) / 2;
    const [fx, fy] = limb(hipX + side * 6, hipY, a, 104, a - bend, 100, 32, 25);
    ctx.fillStyle = PAL.fill; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(fx + 14, fy + 4, 22, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  legs(-1); legs(1);
  ctx.save(); ctx.translate(hipX, hipY); ctx.rotate(o.lean || 0); ctx.translate(-hipX, -hipY);
  // back arm (+ anything held in it except a shield, which goes in front of the body)
  const armB = o.armB || [-0.15 - 0.4 * Math.sin(ph) * wk, -0.4];
  const [bx, by] = limb(-4, -318, armB[0], 78, armB[1], 72, 24, 19);
  circle(bx, by, 12, PAL.fill);
  if (o.holdB && o.holdB !== 'shield') handProp(o.holdB, bx, by, o.propAngB ?? 0, o);
  if (o.hold === 'scepter') { ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx, by - 170); ctx.lineTo(bx, by + 150); ctx.stroke(); circle(bx, by - 175, 12, PAL.fill); }
  // robe
  const sway = Math.sin(ph) * 14 * wk + Math.sin(t * 2) * 4;
  const robe = { long: [-6, 78], mid: [-50, 84], short: [-112, 66], drape: [-150, 60] }[P.robe];
  if (robe) {
    const [hem, half] = robe;
    ctx.beginPath(); ctx.moveTo(-50, P.robe === 'drape' ? -230 : -330); ctx.lineTo(54, P.robe === 'drape' ? -230 : -330); ctx.lineTo(half + sway, hem); ctx.quadraticCurveTo(sway, hem + 12, -half + sway * 0.6, hem); ctx.closePath();
    ctx.fillStyle = PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 2.6;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 12, -218); ctx.quadraticCurveTo(k * 18 + sway * 0.4, (hem - 218) / 2 - 100, k * 22 + sway * 0.8, hem - 6); ctx.stroke(); }
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, -222); ctx.lineTo(44, -222); ctx.stroke();
    if (P.robe === 'mid') { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-50, -330); ctx.quadraticCurveTo(10, -270, 60, -150); ctx.stroke(); }
  }
  // torso
  ctx.beginPath(); ctx.moveTo(-42, -334); ctx.quadraticCurveTo(-48, -270, -34, -206); ctx.lineTo(38, -206); ctx.quadraticCurveTo(60, -270, 52, -334); ctx.closePath();
  ctx.fillStyle = PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.stroke();
  ctx.lineWidth = 2.6;
  if (P.robe === 'short' || P.robe === 'drape') { ctx.beginPath(); ctx.arc(30, -300, 20, 0.3, 1.7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-30, -330); ctx.quadraticCurveTo(10, -290, 44, -322); ctx.stroke(); }
  else { for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-30 + k * 8, -330); ctx.quadraticCurveTo(k * 10, -280, 30 + k * 4, -226); ctx.stroke(); } }
  // head
  ctx.save(); ctx.translate(12, -392); ctx.rotate(o.headTilt || 0);
  const longLocks = () => { const sw = Math.sin(t * 2.2) * 6; ctx.beginPath(); ctx.moveTo(-26, -20); ctx.quadraticCurveTo(-58 + sw, 40, -44 + sw, 120); ctx.lineTo(-20 + sw * 0.5, 118); ctx.quadraticCurveTo(-26, 50, -8, 10); ctx.closePath(); ctx.fillStyle = PAL.hair; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.stroke(); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-30 + k * 6, 0); ctx.quadraticCurveTo(-44 + k * 6 + sw, 60, -34 + k * 6 + sw, 110); ctx.lineWidth = 1.8; ctx.stroke(); } };
  if (P.hair === 'bun' || P.hair === 'long') longLocks();
  if (P.veil) { ctx.beginPath(); ctx.moveTo(24, -40); ctx.quadraticCurveTo(-30, -70, -56, 0); ctx.quadraticCurveTo(-70, 80, -60, 150); ctx.lineTo(-20, 150); ctx.quadraticCurveTo(-30, 60, -10, -10); ctx.closePath(); ctx.fillStyle = PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.stroke(); }
  tracePath(HEAD_PATH); ctx.fillStyle = PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.moveTo(13, -8); ctx.quadraticCurveTo(21, -15, 29, -8); ctx.quadraticCurveTo(21, -3, 13, -8); ctx.fill();
  if (o.eyeGlow) { glow(21, -8, 70, o.eyeGlow, 1); circle(21, -8, 5, '#eaffd0'); }
  ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(10, -19); ctx.quadraticCurveTo(22, -24, 32, -16); ctx.stroke();
  ctx.beginPath(); ctx.arc(-6, 2, 7, -1.2, 1.6); ctx.stroke();
  const curls = (pts, r) => { ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.2; for (const [cx, cy] of pts) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 5); ctx.stroke(); } };
  if (P.hair === 'curly' || P.hair === 'short') {
    ctx.beginPath(); ctx.moveTo(26, -36); ctx.quadraticCurveTo(0, -60, -30, -40); ctx.quadraticCurveTo(-48, -10, -26, P.hair === 'short' ? 20 : 36); ctx.quadraticCurveTo(-14, 0, -6, -12); ctx.quadraticCurveTo(10, -30, 26, -36);
    ctx.fillStyle = PAL.hair; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.stroke();
    curls([[-20, -36], [-34, -18], [-30, 4], [0, -44], [-10, -22]], 6);
  }
  if (P.hair === 'bun' || P.hair === 'long') {
    ctx.beginPath(); ctx.moveTo(26, -36); ctx.quadraticCurveTo(0, -58, -30, -40); ctx.quadraticCurveTo(-46, -16, -30, 10); ctx.quadraticCurveTo(-12, -8, 26, -36); ctx.fillStyle = PAL.hair; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.stroke();
    if (P.hair === 'bun') { circle(-40, -30, 20, PAL.hair); ctx.beginPath(); ctx.arc(-40, -30, 20, 0, 7); ctx.stroke(); curls([[-40, -30], [-46, -38]], 7); }
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(20, -38); ctx.quadraticCurveTo(-6, -50, -26, -34); ctx.stroke();
    circle(-4, 14, 4, PAL.ink);
  }
  if (P.hair === 'snakes') { ctx.beginPath(); ctx.moveTo(26, -36); ctx.quadraticCurveTo(0, -56, -30, -38); ctx.quadraticCurveTo(-42, -16, -28, 8); ctx.quadraticCurveTo(-12, -8, 26, -36); ctx.fillStyle = PAL.hair; ctx.fill(); snakeHair(t); }
  if (P.beard) {
    const long = P.beard;
    ctx.beginPath(); ctx.moveTo(34, 22); ctx.quadraticCurveTo(34, 50 * long + 20, 22, 60 * long + 26); ctx.quadraticCurveTo(0, 62 * long + 20, -8, 30); ctx.quadraticCurveTo(-4, 10, 8, 12); ctx.quadraticCurveTo(22, 28, 34, 22);
    ctx.fillStyle = PAL.hair; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.stroke();
    curls([[20, 40], [6, 34], [14, 56 * long]], 5);
  }
  if (P.wreath) { ctx.fillStyle = PAL.ink; for (let k = 0; k < 7; k++) { ctx.save(); ctx.translate(-34 + k * 9, -44 + Math.abs(k - 3) * 2); ctx.rotate(-0.6 + k * 0.2); ctx.beginPath(); ctx.ellipse(0, -8, 4, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
  if (P.crown) { ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.moveTo(-34, -40); for (let k = 0; k <= 6; k++) { ctx.lineTo(-34 + k * 10, -40 - (k % 2 ? 0 : 26)); } ctx.lineTo(28, -36); ctx.closePath(); ctx.fill(); }
  if (P.helmet === 'corinthian') {
    ctx.beginPath(); ctx.moveTo(30, -26); ctx.quadraticCurveTo(26, -58, -6, -60); ctx.quadraticCurveTo(-46, -56, -42, 0); ctx.lineTo(-30, 34); ctx.lineTo(-12, 30); ctx.quadraticCurveTo(-16, -6, 0, -24); ctx.quadraticCurveTo(14, -32, 30, -26);
    ctx.fillStyle = PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-40, -50); ctx.quadraticCurveTo(-14, -128, 32, -70); ctx.quadraticCurveTo(-10, -96, -36, -46); ctx.fillStyle = PAL.ink; ctx.fill();
    ctx.strokeStyle = PAL.fill; ctx.lineWidth = 1.6; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-34 + k * 8, -60 - Math.sin(k / 7 * Math.PI) * 30); ctx.lineTo(-30 + k * 8, -52 - Math.sin(k / 7 * Math.PI) * 18); ctx.stroke(); }
  }
  if (P.helmet === 'phrygian') {
    ctx.beginPath(); ctx.moveTo(30, -24); ctx.quadraticCurveTo(30, -70, -10, -66); ctx.quadraticCurveTo(10, -96, 40, -78); ctx.quadraticCurveTo(14, -110, -26, -70); ctx.quadraticCurveTo(-50, -40, -40, 40); ctx.lineTo(-18, 40); ctx.quadraticCurveTo(-20, -10, 0, -24); ctx.closePath();
    ctx.fillStyle = PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-20 + k * 10, -50, 4, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
  if (o.holdB === 'shield') shieldAt(bx + 18, by - 10, 80, o.emblem || 'star', t);
  // front arm + held prop
  const armF = o.armF || [0.15 + 0.4 * Math.sin(ph) * wk, 0.5];
  const [hx, hy] = limb(16, -318, armF[0], 78, armF[1], 72, 24, 19);
  circle(hx, hy, 12, PAL.fill);
  if (o.hold && o.hold !== 'scepter') handProp(o.hold, hx, hy, o.propAng ?? 0, o);
  ctx.restore();
  ctx.restore();
  PAL = prevPal;
  const ang = o.lean || 0, toWorld = (lx, ly) => { const rx = hipX + (lx - hipX) * Math.cos(ang) - (ly - hipY) * Math.sin(ang), ry = hipY + (lx - hipX) * Math.sin(ang) + (ly - hipY) * Math.cos(ang); return [x + rx * s * f, y + ry * s]; };
  return { hand: toWorld(hx, hy), handB: toWorld(bx, by), head: toWorld(24, -392) };
}

// ---- more props for the myth episodes ----
function horse(x, y, s, o) {
  const t = o.t, g = o.gallop || 0, wood = !!o.wood, f = o.f || 1;
  const prev = PAL; PAL = wood ? { fill: '#b07a3e', ink: '#2a1608', hair: '#7a4a1e' } : Object.assign({ fill: CLAY, ink: INK, hair: HAIR }, o.pal || {});
  ctx.save(); ctx.translate(x, y - (o.lift || 0)); ctx.scale(s * f, s); ctx.lineJoin = 'round';
  if (o.alpha !== undefined) ctx.globalAlpha = clamp(o.alpha);
  if (wood) {
    ctx.fillStyle = '#5a3a18'; ctx.fillRect(-230, -6, 480, 40); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.strokeRect(-230, -6, 480, 40);
    for (const wx of [-190, -70, 70, 200]) { circle(wx, 40, 30, '#7a4a1e'); ctx.beginPath(); ctx.arc(wx, 40, 30, 0, Math.PI * 2); ctx.stroke(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4 + (o.roll || 0); ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 26, 40 - Math.sin(a) * 26); ctx.lineTo(wx + Math.cos(a) * 26, 40 + Math.sin(a) * 26); ctx.lineWidth = 3; ctx.stroke(); } }
  }
  if (o.wings) featherWings(-10, -262, o.wings, { t, flap: o.flap || 0, flapSpeed: 7 });
  const leg = (lx, a1, a2) => { const [ex, ey] = limb(lx, -175, a1, 88, a2, 92, 28, 18); ctx.fillStyle = PAL.ink; ctx.fillRect(ex - 13, ey - 4, 26, 14); };
  const gp = t * 9;
  leg(-120, wood ? 0.05 : -0.2 + 0.5 * Math.sin(gp) * g, wood ? 0.05 : -0.1 + 0.6 * Math.sin(gp + 1) * g);
  leg(95, wood ? -0.05 : 0.15 + 0.6 * Math.sin(gp + 2) * g, wood ? -0.05 : 0.05 - 0.9 * Math.max(0, Math.sin(gp + 2.6)) * g);
  // tail
  ctx.beginPath(); ctx.moveTo(-150, -230); ctx.quadraticCurveTo(-230, -200 + Math.sin(t * 4) * 10, -210, -80); ctx.quadraticCurveTo(-190, -160, -140, -200); ctx.closePath(); ctx.fillStyle = PAL.hair; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.stroke();
  // body + neck + head
  ctx.beginPath(); ctx.moveTo(-160, -220); ctx.bezierCurveTo(-160, -280, 60, -290, 110, -260); ctx.lineTo(190, -380); ctx.lineTo(214, -392);
  ctx.lineTo(296, -326); ctx.quadraticCurveTo(300, -300, 282, -296); ctx.lineTo(214, -312); ctx.lineTo(150, -200); ctx.bezierCurveTo(120, -140, -120, -140, -160, -200); ctx.closePath();
  ctx.fillStyle = PAL.fill; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(196, -386); ctx.lineTo(204, -420); ctx.lineTo(218, -390); ctx.fill(); ctx.stroke();
  circle(236, -352, 6, PAL.ink); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(282, -312, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = PAL.hair; ctx.beginPath(); ctx.moveTo(110, -262); for (let k = 0; k <= 8; k++) ctx.lineTo(110 + k * 10 - 16, -262 - k * 15 - (k % 2 ? 14 : 0)); ctx.lineTo(196, -386); ctx.lineTo(130, -250); ctx.closePath(); ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.stroke();
  if (wood) {
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-150, -260 + k * 20); ctx.lineTo(130, -260 + k * 20); ctx.stroke(); }
    for (let k = 0; k < 9; k++) circle(-140 + k * 34, -150, 3.5, PAL.ink);
    const hatch = o.hatch || 0;
    ctx.fillStyle = '#1a0d06'; ctx.fillRect(-60, -240, 90, 60);
    ctx.save(); ctx.translate(-60, -180); ctx.rotate(hatch * 1.4); ctx.fillStyle = '#946232'; ctx.fillRect(0, -60, 90, 60); ctx.strokeRect(0, -60, 90, 60); ctx.restore();
  } else {
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-40, -215, 60, 0.6, 2.4); ctx.stroke();
  }
  leg(-95, wood ? -0.05 : 0.2 - 0.5 * Math.sin(gp) * g, wood ? -0.05 : 0.1 - 0.6 * Math.sin(gp + 1) * g);
  leg(120, wood ? 0.05 : -0.15 - 0.6 * Math.sin(gp + 2) * g, wood ? 0.05 : -0.05 + 0.9 * Math.max(0, Math.sin(gp + 2.6)) * g);
  ctx.restore(); PAL = prev;
}
function serpent(x0, y0, x1, y1, t, s, o = {}) {
  const n = 26, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(x0, x1, u) + Math.sin(u * 9 + t * 4 + (o.seed || 0)) * 70 * s * (1 - u * 0.4), lerp(y0, y1, u) + Math.cos(u * 6 + t * 3) * 30 * s]); }
  for (const [col, wd] of [[INK, 54], ['#7c8f3a', 42], ['#a9b85a', 18]]) {
    ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.strokeStyle = col; ctx.lineWidth = wd * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  const [hx, hy] = pts[n], [px, py] = pts[n - 1], a = Math.atan2(hy - py, hx - px);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(18, 0, 46, 28, 0, 0, Math.PI * 2); ctx.fillStyle = '#7c8f3a'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, 6); ctx.lineTo(70 + (o.jaw || 0) * 20, 20 + (o.jaw || 0) * 30); ctx.lineTo(40, 18); ctx.fillStyle = '#3a0d0d'; ctx.fill();
  glow(30, -10, 40, 'rgba(255,220,60,.9)', 1); circle(30, -10, 6, '#fff3a0');
  ctx.restore();
}
function seaBand(y, t, o = {}) {
  const g = ctx.createLinearGradient(0, y, 0, y + 700); g.addColorStop(0, o.top || '#13263a'); g.addColorStop(1, GLAZE);
  ctx.fillStyle = g; ctx.fillRect(-500, y, 2200, 900);
  ctx.strokeStyle = CLAY; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let r = 0; r < 4; r++) {
    const yy = y + 20 + r * 52, sp = (t * (40 - r * 6)) % 120;
    ctx.beginPath();
    for (let x = -540 - sp; x < 1700; x += 120) { ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 30, yy - 26, x + 60, yy - 8); ctx.arc(x + 54, yy - 2, 9, -0.6, Math.PI * 1.2); ctx.moveTo(x + 60, yy); ctx.lineTo(x + 120, yy); }
    ctx.globalAlpha = 1 - r * 0.2; ctx.stroke(); ctx.globalAlpha = 1;
  }
}
function sunDisc(x, y, r, t, heat = 0) {
  glow(x, y, r * 4.5, 'rgba(255,140,40,.55)', 1); glow(x, y, r * 2.2, 'rgba(255,210,120,.7)', 1);
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.15);
  ctx.fillStyle = CLAY_L; for (let k = 0; k < 16; k++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(-14, -r - 6); ctx.lineTo(0, -r - 46 - (k % 2) * 22); ctx.lineTo(14, -r - 6); ctx.fill(); }
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 4, x, y, r); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, '#f2a33a');
  circle(x, y, r, g);
  if (heat) glow(x, y, r * 6, 'rgba(255,90,20,.5)', heat);
}
function maze(x, y, size, t) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = CLAY; ctx.lineWidth = 12; ctx.lineCap = 'square';
  for (let k = 0; k < 5; k++) {
    const h = size / 2 - k * size / 11, gap = (k % 2 ? 1 : -1) * 0.6;
    ctx.beginPath(); ctx.moveTo(-h + h * 0.4 * gap + h * 0.25, -h); ctx.lineTo(h, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.lineTo(-h, -h); ctx.lineTo(-h + h * 0.4 * gap, -h); ctx.stroke();
  }
  ctx.restore();
}
function wheat(x, y, h, wilt, t, seed = 0) {
  const sw = Math.sin(t * 1.5 + seed) * 0.05 * (1 - wilt);
  const col = mix('#eea05f', '#6b5a48', wilt);
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = INK; ctx.lineWidth = 6;
  const tipA = sw + wilt * 2.2 * (seed % 2 ? 1 : -0.7);
  const mx = Math.sin(sw) * h * 0.5, my = -h * 0.55, tx = Math.sin(tipA) * h * 0.45 + mx, ty = my - Math.cos(tipA) * h * 0.45;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
  for (let g = 0; g < 7; g++) {
    const u = g / 7, gx = lerp(mx, tx, 0.5 + u * 0.5), gy = lerp(my, ty, 0.5 + u * 0.5);
    ctx.beginPath(); ctx.ellipse(gx + (g % 2 ? 7 : -7), gy, 5, 11, tipA + (g % 2 ? 0.5 : -0.5), 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
  }
  ctx.restore();
}
function pomegranate(x, y, r, open, t) {
  ctx.save(); ctx.translate(x, y);
  glow(0, 0, r * 2.4, 'rgba(255,60,60,.35)', 1);
  const half = side => {
    ctx.save(); ctx.translate(side * open * r * 0.6, 0); ctx.rotate(side * open * 0.25);
    ctx.beginPath(); ctx.arc(0, 0, r, side > 0 ? -Math.PI / 2 : Math.PI / 2, side > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r); g.addColorStop(0, '#ff6b5a'); g.addColorStop(0.6, '#c1272d'); g.addColorStop(1, '#6e0f16');
    ctx.fillStyle = g; ctx.fill();
    if (open > 0.02) { ctx.save(); ctx.clip(); const pith = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r); pith.addColorStop(0, 'rgba(120,10,30,.9)'); pith.addColorStop(0.85, 'rgba(160,20,40,.9)'); pith.addColorStop(1, 'rgba(246,217,184,1)'); ctx.fillStyle = pith; ctx.fillRect(-r, -r, 2 * r, 2 * r);
      for (let k = 0; k < 14; k++) { const a = k * 2.4, rr = r * 0.25 + (k % 5) * r * 0.13; const sx = side * Math.abs(Math.cos(a) * rr) * 0.8 + side * r * 0.12, sy = Math.sin(a) * rr; glow(sx, sy, 16, 'rgba(255,40,70,.7)', 0.7); circle(sx, sy, r * 0.08, '#e3183a'); circle(sx - 2, sy - 2, r * 0.03, '#ffd0d8'); }
      ctx.restore(); }
    ctx.restore();
  };
  half(-1); half(1);
  if (open < 0.02) { ctx.fillStyle = '#8a1a1e'; ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.92); ctx.lineTo(-r * 0.15, -r * 1.22); ctx.lineTo(0, -r * 1.02); ctx.lineTo(r * 0.15, -r * 1.22); ctx.lineTo(r * 0.25, -r * 0.92); ctx.fill(); circle(-r * 0.35, -r * 0.35, r * 0.12, 'rgba(255,255,255,.35)'); }
  ctx.restore();
}
function narcissus(x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + x) * 0.1);
  ctx.fillStyle = '#f6ecd6'; for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(0, -r * 0.7, r * 0.35, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  circle(0, 0, r * 0.38, '#f2b33a'); ctx.restore();
}
function groundCrack(x, y, w, open, t) {
  if (open <= 0) return;
  glow(x, y - 40, w * 1.4, 'rgba(150,40,220,.55)', open);
  ctx.beginPath(); ctx.moveTo(x - w * open, y);
  for (let k = 0; k <= 10; k++) { const u = k / 10; ctx.lineTo(x - w * open + u * 2 * w * open, y + (k % 2 ? 26 : -18) * open); }
  for (let k = 10; k >= 0; k--) { const u = k / 10; ctx.lineTo(x - w * open + u * 2 * w * open, y + 50 + (k % 2 ? 10 : 30) * open); }
  ctx.closePath(); ctx.fillStyle = '#05010a'; ctx.fill();
}
function ship(x, y, s, t) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2 + x) * 6); ctx.scale(s, s); ctx.rotate(Math.sin(t * 1.6 + x) * 0.03);
  ctx.beginPath(); ctx.moveTo(-170, -30); ctx.quadraticCurveTo(-170, 30, -100, 30); ctx.lineTo(120, 30); ctx.quadraticCurveTo(190, 10, 200, -50); ctx.lineTo(160, -20); ctx.lineTo(-130, -20); ctx.closePath();
  ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
  ctx.lineWidth = 3; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(-100 + k * 30, 10); ctx.lineTo(-120 + k * 30 + Math.sin(t * 5 + k) * 10, 70); ctx.stroke(); }
  rod(10, -20, 10, -220, 6); ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(-70, -200); ctx.quadraticCurveTo(10 + Math.sin(t * 2) * 10, -150, 90, -200); ctx.lineTo(80, -60); ctx.quadraticCurveTo(10, -90, -60, -60); ctx.closePath(); ctx.fillStyle = CLAY_L; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function troyWall(x0, x1, y, h, gate = 0, gx = 540) {
  ctx.fillStyle = '#c2793f'; ctx.fillRect(x0, y - h, x1 - x0, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  for (let r = 0; r * 44 < h; r++) for (let c = 0; c * 90 < x1 - x0 + 90; c++) ctx.strokeRect(x0 + c * 90 - (r % 2) * 45, y - h + r * 44, 90, 44);
  for (const tx of [x0 + 60, gx - 190, gx + 190, x1 - 60]) { ctx.fillStyle = '#b06a34'; ctx.fillRect(tx - 60, y - h - 90, 120, h + 90); ctx.strokeRect(tx - 60, y - h - 90, 120, h + 90); for (let k = 0; k < 4; k++) { ctx.fillRect(tx - 60 + k * 34, y - h - 120, 18, 30); ctx.strokeRect(tx - 60 + k * 34, y - h - 120, 18, 30); } }
  ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.moveTo(gx - 110, y); ctx.lineTo(gx - 110, y - h * 0.62); ctx.quadraticCurveTo(gx, y - h * 0.9, gx + 110, y - h * 0.62); ctx.lineTo(gx + 110, y); ctx.fill();
  for (const side of [-1, 1]) { ctx.save(); ctx.translate(gx + side * 110, y); ctx.scale(Math.cos(gate * 1.3), 1); ctx.fillStyle = '#7a4a1e'; ctx.fillRect(side > 0 ? -110 : 0, -h * 0.68, 110, h * 0.68); ctx.strokeRect(side > 0 ? -110 : 0, -h * 0.68, 110, h * 0.68); ctx.restore(); }
}
function pyre(x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5 - r; c++) { ctx.fillStyle = r % 2 ? '#8a4a1e' : CLAY; ctx.fillRect(-130 + r * 26 + c * 52, -40 - r * 36, 48, 32); ctx.strokeRect(-130 + r * 26 + c * 52, -40 - r * 36, 48, 32); }
  ctx.restore();
  for (let k = 0; k < 5; k++) flame(x - 70 * s + k * 35 * s, y - 150 * s, 60 * s * (0.8 + 0.4 * hash1(k)), t, k * 3);
  glow(x, y - 220 * s, 420 * s, 'rgba(255,140,40,.55)', 1);
}
function scrollIcon(x, y, s, label, k = 1, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * easeBack(k), s * easeBack(k));
  if (o.glow) glow(0, 0, 260, 'rgba(255,200,100,.5)', o.glow);
  ctx.fillStyle = '#f1e2bf'; ctx.fillRect(-120, -150, 240, 300);
  ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 4; ctx.strokeRect(-120, -150, 240, 300);
  for (const yy of [-150, 150]) { ctx.beginPath(); ctx.ellipse(0, yy, 140, 20, 0, 0, Math.PI * 2); ctx.fillStyle = '#d9c49c'; ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(58,36,18,.35)'; ctx.lineWidth = 3; for (let r = 0; r < 7; r++) { ctx.beginPath(); ctx.moveTo(-90, -60 + r * 26); ctx.lineTo(90 - (r % 3) * 30, -60 + r * 26); ctx.stroke(); }
  ctx.font = `900 40px ${SERIF}`; ctx.fillStyle = '#3a2412'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, -100);
  if (o.sub) { ctx.font = `700 26px ${SERIF}`; ctx.fillText(o.sub, 0, 120); }
  ctx.restore();
}
// dark card with a gold border, for quotes and number comparisons
function card(x, y, w, h, title, body, k = 1, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(easeBack(k), easeBack(k)); ctx.globalAlpha = clamp(k * 2);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 18); ctx.fillStyle = o.bg || 'rgba(19,11,7,.92)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = o.border || '#e7b766'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${o.titleSize || 40}px ${SERIF}`; ctx.fillStyle = o.titleColor || '#f6d58a'; ctx.fillText(title, 0, -h / 2 + 46);
  ctx.font = `700 ${o.bodySize || 34}px ${SERIF}`; ctx.fillStyle = o.bodyColor || '#f3e6cc';
  (Array.isArray(body) ? body : [body]).forEach((ln, i) => ctx.fillText(ln, 0, -h / 2 + 108 + i * (o.lineH || 46)));
  ctx.restore();
}
function stamp(str, x, y, st, o = {}) {
  const k = clamp(st / 0.2); if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.08); ctx.scale(lerp(1.8, 1, k), lerp(1.8, 1, k)); ctx.globalAlpha = k;
  ctx.font = `900 ${o.size || 76}px ${SERIF}`; const w = ctx.measureText(str).width + 70;
  ctx.lineWidth = 11; ctx.strokeStyle = o.color || '#d0242c'; ctx.beginPath(); ctx.roundRect(-w / 2, -(o.size || 76) * 0.95, w, (o.size || 76) * 1.9, 18); ctx.stroke();
  ctx.fillStyle = o.color || '#e0303a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, 6); ctx.restore();
}
function parchWorld(t, main) {
  layer(0.15, () => ctx.drawImage(parchC(), -210, -240));
  layer(1, () => main && main());
}
function inkText(str, x, y, size, o = {}) { ctx.save(); ctx.font = `${o.weight || 900} ${size}px ${o.font || SERIF}`; ctx.fillStyle = o.color || '#3a2412'; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; if (o.alpha !== undefined) ctx.globalAlpha = clamp(o.alpha); ctx.fillText(str, x, y); ctx.restore(); }

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

// ---- small shared helpers for episode scene files ----
function vaseColumns(x0, x1, ground, h) {
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  ctx.fillStyle = CLAY; ctx.fillRect(x0 - 30, ground - h - 70, x1 - x0 + 60, 44); ctx.strokeRect(x0 - 30, ground - h - 70, x1 - x0 + 60, 44);
  for (let x = x0; x <= x1; x += (x1 - x0) / 2) {
    ctx.fillStyle = CLAY; ctx.fillRect(x - 34, ground - h - 26, 68, h + 26); ctx.strokeRect(x - 34, ground - h - 26, 68, h + 26);
    ctx.lineWidth = 2.5; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 12, ground - h - 20); ctx.lineTo(x + k * 12, ground - 6); ctx.stroke(); } ctx.lineWidth = 4;
    ctx.fillRect(x - 50, ground - h - 40, 100, 18); ctx.strokeRect(x - 50, ground - h - 40, 100, 18);
  }
}
function vaseStars(t, n = 50, seed = 4) { const R = rng(seed); for (let i = 0; i < n; i++) { const x = R() * 1300 - 110, y = 120 + R() * 900; sparkle(x, y, 5 + R() * 6, 0.35 + 0.35 * Math.sin(t * 2 + i)); } }
function arrow(x, y, ang, s = 1, trail = 0, col = 'rgba(255,210,110,.8)') {
  if (trail) for (let k = 1; k < 10; k++) glow(x - Math.cos(ang) * k * 22, y - Math.sin(ang) * k * 22, 40 - k * 3, col, trail * (1 - k / 10));
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  rod(-90, 0, 10, 0, 5);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillStyle = CLAY_L; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(6, -9); ctx.lineTo(6, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = CLAY; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-90, 0); ctx.lineTo(-74, sd * 14); ctx.lineTo(-62, 0); ctx.fill(); }
  ctx.restore();
}
function nightTint(a) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(10,16,48,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// ======================= shared closing scene (every episode ends here) =======================
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
