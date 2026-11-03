// Frame-exact animation renderer. window.frame(t) draws time t (seconds) and returns a JPEG.
const W = 1080, H = 1920, FONT = 'Inter, "DejaVu Sans", sans-serif';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let TL, CHUNKS = [], capY = 1440, CAP_HI = '#FFE14D';
const S = {}, EV = {};
let drawBg = () => {}, chInit = () => {}, overlay = () => {};

// ---------- math helpers ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = t => { t = clamp(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const pulse = (t, bpm) => { const p = ((t * bpm / 60) % 1 + 1) % 1; return 1 + 0.14 * Math.exp(-p * 9); };
function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function mix(c1, c2, t) {
  const a = [1, 3, 5].map(i => parseInt(c1.substr(i, 2), 16)), b = [1, 3, 5].map(i => parseInt(c2.substr(i, 2), 16));
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], clamp(t)))).join(',')})`;
}
function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
// like wl, but the last time the word is spoken
function wlLast(ln, word, frac) {
  const w = ln.words.filter(w => w.w.toLowerCase().replace(/[^a-z]/g, '') === word).pop();
  return w ? w.s - ln.start : frac * (ln.end - ln.start);
}
// local time (seconds into the line) at which `word` is spoken
function wl(ln, word, frac) {
  const w = ln.words.find(w => w.w.toLowerCase().replace(/[^a-z]/g, '') === word);
  return w ? w.s - ln.start : frac * (ln.end - ln.start);
}

// ---------- shared props ----------
function emoji(ch, x, y, size, rot = 0) {
  if (size <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `${size}px "Noto Color Emoji"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch, 0, size * 0.05); ctx.restore();
}
function text(str, x, y, size, color = '#fff', o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(o.k ?? 1, o.k ?? 1);
  ctx.font = `${o.weight || 900} ${size}px ${FONT}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.stroke !== false) { ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.2; ctx.strokeStyle = o.stroke || '#111'; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0); ctx.restore();
}
function popIn(lt, at, dur = 0.3) { return easeBack((lt - at) / dur); }
function heartPath() {
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function heart(x, y, size, beat, color = '#ff3b5c', o = {}) {
  if (size <= 0) return;
  ctx.save(); ctx.translate(x, y); const s = size / 34 * beat; ctx.scale(s, s);
  heartPath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-8, -6, 3.6, 2.2, -0.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
  ctx.lineCap = 'round'; ctx.strokeStyle = '#3b0716'; ctx.lineWidth = 1.2;
  if (o.dead) {
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 2, -1); ctx.lineTo(ex + 2, 3); ctx.moveTo(ex + 2, -1); ctx.lineTo(ex - 2, 3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(3, 8); ctx.stroke();
  } else if (o.face) {
    circle(-5, 1, 1.5, '#3b0716'); circle(5, 1, 1.5, '#3b0716');
    ctx.beginPath(); ctx.arc(0, 5, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
}

function title(str, y, lt, size = 120, color = '#FFE14D') {
  const k = easeBack(lt / 0.35); if (k <= 0) return;
  ctx.save(); ctx.font = `900 ${size}px ${FONT}`;
  const w = ctx.measureText(str).width, fit = Math.min(1, 960 / w);
  ctx.translate(540, y); ctx.rotate(Math.sin(lt * 3) * 0.025); ctx.scale(k * fit, k * fit);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22; ctx.strokeStyle = '#111'; ctx.strokeText(str, 0, 0);
  ctx.fillStyle = color; ctx.fillText(str, 0, 0); ctx.restore();
}
function pill(x, y, str, bg, fg, size = 44, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.font = `900 ${size}px ${FONT}`;
  const w = ctx.measureText(str).width + size * 1.2, h = size * 1.6;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = '#111'; ctx.stroke();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, 2); ctx.restore();
}
function gill(x, y, t) {
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.38 + Math.sin(t * 2 + k) * 0.05;
    ctx.save(); ctx.translate(x + Math.cos(a) * 46, y + Math.sin(a) * 40); ctx.rotate(a + Math.PI / 2);
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 46, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8fb1'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#b3134f'; ctx.stroke();
    ctx.restore();
  }
}
function drop(x, y, s, color, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.beginPath(); ctx.moveTo(0, -1.15);
  ctx.bezierCurveTo(0.35, -0.6, 0.75, -0.15, 0.75, 0.3); ctx.arc(0, 0.3, 0.75, 0, Math.PI);
  ctx.bezierCurveTo(-0.75, -0.15, -0.35, -0.6, 0, -1.15); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 0.07; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-0.33, 0.05, 0.11, 0.22, 0.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
  ctx.restore();
}
function tile(x, y, sym, name, color, k, crossed = 0) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.roundRect(-95, -105, 190, 210, 26); ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 9; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 100px ${FONT}`; ctx.fillText(sym, 0, -18);
  ctx.font = `800 32px ${FONT}`; ctx.fillText(name, 0, 70);
  if (crossed > 0) {
    ctx.lineCap = 'round'; ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = 22;
    const c = easeOut(crossed);
    ctx.beginPath(); ctx.moveTo(-110, -120); ctx.lineTo(lerp(-110, 110, c), lerp(-120, 120, c)); ctx.stroke();
    if (crossed > 0.5) { const c2 = easeOut((crossed - 0.5) * 2); ctx.beginPath(); ctx.moveTo(110, -120); ctx.lineTo(lerp(110, -110, c2), lerp(-120, 120, c2)); ctx.stroke(); }
  }
  ctx.restore();
}
function ecg(tt) {
  const p = ((tt * 1.4) % 1 + 1) % 1;
  if (p < 0.1) return 0; if (p < 0.15) return 0.15 * Math.sin((p - 0.1) / 0.05 * Math.PI);
  if (p < 0.2) return 0; if (p < 0.22) return -0.15 * (p - 0.2) / 0.02;
  if (p < 0.25) return lerp(-0.15, 1, (p - 0.22) / 0.03); if (p < 0.28) return lerp(1, -0.35, (p - 0.25) / 0.03);
  if (p < 0.3) return lerp(-0.35, 0, (p - 0.28) / 0.02); if (p < 0.45) return 0;
  if (p < 0.55) return 0.25 * Math.sin((p - 0.45) / 0.1 * Math.PI); return 0;
}
function monitor(x, y, w, h, t, lt, st) {
  const stopped = lt > st;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 30); ctx.fillStyle = '#081a14'; ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = '#cbd5e1'; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 30); ctx.clip();
  ctx.strokeStyle = 'rgba(74,222,128,.13)'; ctx.lineWidth = 2;
  for (let gx = x; gx < x + w; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
  for (let gy = y; gy < y + h; gy += 50) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
  const cy = y + h * 0.62;
  ctx.beginPath();
  for (let px = x + 20; px <= x + w - 20; px += 3) {
    const tt = lt - (x + w - 20 - px) / (w - 40) * 2.2;
    const v = tt > st ? 0 : ecg(tt);
    const py = cy - v * h * 0.42;
    px === x + 20 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeStyle = stopped ? '#ff4d4d' : '#4ade80';
  ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.restore();
  ctx.font = `800 40px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  ctx.fillText('MAIN HEART', x + 40, y + 55);
  heart(x + w - 150, y + 55, 50, stopped ? 1 : pulse(lt, 84), stopped ? '#6b7280' : '#ff3b5c');
  ctx.textAlign = 'right'; ctx.fillStyle = stopped ? '#ff4d4d' : '#4ade80';
  ctx.fillText(stopped ? '0' : '84', x + w - 40, y + 55);
}

// ---------- captions ----------
function buildChunks() {
  CHUNKS = [];
  TL.lines.forEach((ln, li) => {
    const toks = ln.text.split(/\s+/).filter(Boolean);
    const words = ln.words.filter(w => /[a-z0-9]/i.test(w.w));
    const useToks = toks.length === words.length;
    let cur = [];
    words.forEach((w, i) => {
      const raw = useToks ? toks[i] : w.w;
      cur.push({ d: raw.replace(/[.,;:]+$/, '').toUpperCase(), s: w.s });
      if (cur.length === 3 || /[.,?!;:]$/.test(raw) || i === words.length - 1) { CHUNKS.push({ words: cur, start: cur[0].s }); cur = []; }
    });
    const lineEnd = li + 1 < TL.lines.length ? TL.lines[li + 1].start : ln.end + 0.6;
    CHUNKS.forEach((c, i) => { if (c.end === undefined) c.end = (CHUNKS[i + 1] ? CHUNKS[i + 1].start : lineEnd); });
    if (CHUNKS.length) CHUNKS[CHUNKS.length - 1].end = lineEnd;
  });
}
function drawCaptions(t) {
  const ch = CHUNKS.find(c => t >= c.start - 0.05 && t < c.end - 0.05);
  if (!ch) return;
  const size = 84; ctx.font = `900 ${size}px ${FONT}`;
  const sp = ctx.measureText(' ').width, widths = ch.words.map(w => ctx.measureText(w.d).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (widths.length - 1);
  const s = Math.min(1, 940 / total) * lerp(0.75, 1, easeBack((t - ch.start + 0.05) / 0.16));
  ctx.save(); ctx.translate(540, capY); ctx.scale(s, s);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let x = -total / 2;
  ch.words.forEach((w, i) => {
    const cur = t >= w.s && (i === ch.words.length - 1 || t < ch.words[i + 1].s);
    ctx.lineWidth = 20; ctx.strokeStyle = '#111'; ctx.strokeText(w.d, x, 0);
    ctx.fillStyle = cur ? CAP_HI : '#fff'; ctx.fillText(w.d, x, 0);
    x += widths[i] + sp;
  });
  ctx.restore();
}

// ---------- main ----------
function renderAt(t) {
  let li = 0;
  while (li + 1 < TL.lines.length && t >= TL.lines[li + 1].start - 0.05) li++;
  const ln = TL.lines[li];
  const lt = t - ln.start, d = (li + 1 < TL.lines.length ? TL.lines[li + 1].start : TL.duration) - ln.start;
  const talk = TL.env[Math.floor(t * TL.fps)] || 0;
  capY = 1440;
  ctx.save();
  const punch = li === 0 ? 1 : 1 + 0.07 * (1 - easeOut(lt / 0.35));
  ctx.translate(W / 2, H / 2); ctx.scale(punch, punch); ctx.translate(-W / 2, -H / 2);
  drawBg(t);
  (S[ln.scene] || S.cta)({ t, lt, d, ln, talk });
  ctx.restore();
  overlay(t);
  drawCaptions(t);
  // fade to black on the last half second
  const fo = clamp((t - (TL.duration - 0.5)) / 0.5);
  if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
}
window.setup = async tl => { TL = tl; buildChunks(); chInit(tl); await document.fonts.load(`80px "Noto Color Emoji"`); await document.fonts.load(`900 80px Inter`); await document.fonts.load(`800 40px Inter`); };
window.frame = t => { renderAt(t); return cv.toDataURL('image/jpeg', 0.92).split(',')[1]; };
window.sfxEvents = () => {
  const ev = [];
  TL.lines.forEach((ln, i) => {
    if (i > 0) ev.push({ t: ln.start - 0.12, type: 'whoosh' });
    (EV[ln.scene] ? EV[ln.scene](ln) : []).forEach(e => ev.push({ t: ln.start + e.t, type: e.type }));
  });
  return ev;
};
