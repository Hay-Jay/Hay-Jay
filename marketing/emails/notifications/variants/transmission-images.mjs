// node transmission-images.mjs
// Renders the images for variants/transmission.liquid ("THE SECURE TRANSMISSION" order confirmation) into ../img/transmission-*.
// Frames and props are drawn in Chromium with the theme's own woff2 fonts (Big Shoulders Display, Courier Prime, Special Elite,
// Stardos Stencil) and the launch stamps' worn-ink mask; the short Python/PIL step at the bottom quantizes them to small palettes
// and assembles the GIF. Nothing in these images is order-specific: every piece of order data in the email is live text.
// Deterministic: a seeded PRNG drives the scramble, so the same script always gives the same files.
//
//   transmission-decrypt.gif    the hero: a Bureau screen decrypting "REQUISITION RECEIVED." out of redaction bars and
//                               scrambled glyphs, a teleprinter line typing THANK YOU FOR YOUR ORDER, AGENT. STOP., and a red
//                               CONFIRMED stamp. Plays once and ends on the stamped frame. 600 x 330.
//   transmission-decrypt.png    that last frame, still (served to Outlook for Windows, which only ever shows a GIF's first frame)
//   transmission-wordmark.png   the white wordmark on a plate of desk black (keeps the logo readable if a client flips the desk)
//   transmission-ladder.png     the clearance ladder at L5
//   transmission-dmx.png        REQUISITION MANIFEST printed by a 9-pin dot-matrix head, for the top of the printout
//   transmission-sprocket.png   one tractor-feed sprocket hole, tiled down the printout's margins
//   transmission-tear-top.png   the printout's torn top edge (desk above, transparent paper below)
//   transmission-tear-bot.png   the torn bottom edge
//   transmission-tape.png       a strip of punched teleprinter tape. The holes are real ITA2 (Baudot) code for
//                               ZCZC MONOCHROME BUREAU REQUISITIONS DESK END OF TRANSMISSION NNNN
//   transmission-wheel.png      the Bureau's cipher wheel around the MONOCHROME emblem, with a signal-red index
import { chromium } from '../../../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'img');
const RAW = process.env.TRANSMISSION_RAW || join(tmpdir(), 'transmission-raw');
const ASSETS = join(here, '../../../../shopify-theme/theme/assets');
const DISTRESS = join(here, '../../../countdown-xo/assets/distress.png');
const WORDMARK = join(here, '../../img/wordmark-white.png');   // the launch emails' white wordmark, 480 x 43
rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const b64 = f => readFileSync(f).toString('base64');
const font = (fam, file, w = '400') => `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64(join(ASSETS, file))}) format('woff2');font-weight:${w};}`;
const RED = '#ff3b30';           // the launch emails' signal red
const DESK = '#0d0d0d';          // the email's desk (card) colour; plates and holes are painted in it
const SCREEN = '#0a0a0a';

const CSS = `
${font('Head', 'mc-font-big-shoulders-display.woff2', '100 900')}
${font('Mono', 'mc-font-courier-prime-400.woff2', '400')}
${font('Mono', 'mc-font-courier-prime-700.woff2', '700')}
${font('Type', 'mc-font-special-elite-400.woff2', '400')}
${font('Stencil', 'mc-font-stardos-stencil-700.woff2', '700')}
html,body{margin:0;padding:0;background:transparent;}
*{box-sizing:border-box;}
.worn{-webkit-mask-image:url(data:image/png;base64,${b64(DISTRESS)});-webkit-mask-size:300px;}
`;

// ---- seeded PRNG ----------------------------------------------------------------------------------------------------------------
let seed = 0x5eed7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = s => s[Math.floor(rnd() * s.length)];

// =================================================================================================================================
// 1. THE DECRYPT GIF
// =================================================================================================================================
const W = 600, H = 330;
const L1 = 'REQUISITION', L2 = 'RECEIVED.';
const TTY = '> THANK YOU FOR YOUR ORDER, AGENT. STOP.';
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@*/<>=+?';
const HL_X = 30, HL_Y = 64, HL_SIZE = 96, HL_LH = 83;

// static grain (light specks, like the site's --grain-l), drawn once as an SVG turbulence
const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 -.18'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const screenHTML = `
<div id="scr" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${SCREEN};font-family:Mono;">
  <div style="position:absolute;inset:0;background:radial-gradient(120% 95% at 50% 45%,#161616 0%,#0b0b0b 62%,#050505 100%);"></div>
  <div style="position:absolute;inset:0;background-image:${grain};opacity:.32;"></div>
  ${['left:12px;top:12px;border-left:2px solid;border-top:2px solid', 'right:12px;top:12px;border-right:2px solid;border-top:2px solid',
     'left:12px;bottom:12px;border-left:2px solid;border-bottom:2px solid', 'right:12px;bottom:12px;border-right:2px solid;border-bottom:2px solid']
     .map(s => `<div style="position:absolute;width:18px;height:18px;color:#bcbcbc;${s};"></div>`).join('')}
  <div style="position:absolute;left:30px;right:30px;top:22px;height:14px;font:700 10.5px/14px Mono;letter-spacing:2.2px;color:#bdbdbd;text-transform:uppercase;white-space:nowrap;">
    <span id="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${RED};margin-right:7px;vertical-align:0;"></span>RX <span style="color:#6d6d6d;">//</span> Secure channel MC-7
    <span style="position:absolute;right:0;top:0;"><span id="stat">Receiving</span>
      <span id="segs" style="display:inline-block;vertical-align:-1px;margin:0 6px 0 8px;"></span><span id="pct" style="display:inline-block;width:30px;text-align:right;">00%</span></span>
  </div>
  <div style="position:absolute;left:30px;right:30px;top:46px;height:1px;background:rgba(255,255,255,.2);"></div>
  <div id="hl" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;"></div>
  <div id="bars" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;"></div>
  <div id="tty" style="position:absolute;left:30px;top:264px;height:22px;font:400 17px/22px Type;color:#e6e6e6;white-space:nowrap;"></div>
  <div style="position:absolute;left:30px;right:30px;top:296px;height:1px;background:rgba(255,255,255,.2);"></div>
  <div style="position:absolute;left:30px;right:30px;top:303px;font:700 9.5px/12px Mono;letter-spacing:2.2px;color:#7d7d7d;text-transform:uppercase;white-space:nowrap;">
    Monochrome Bureau <span style="color:#4a4a4a;">//</span> Requisitions desk<span style="position:absolute;right:0;">Msg 01 of 01</span></div>
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.34) 0 1px,transparent 1px 3px);pointer-events:none;"></div>
  <div id="stamp" style="position:absolute;left:358px;top:146px;width:214px;height:100px;"></div>
  <div id="glitch" style="position:absolute;inset:0;"></div>
</div>`;

// stamp markup, like the site's .stamp: Stardos Stencil, double border, worn ink
const stampHTML = (s, o) => `<div class="worn" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-9deg) scale(${s});opacity:${o};
  color:${RED};border:3.5px solid ${RED};border-radius:5px;padding:6px 11px 4px;text-align:center;white-space:nowrap;">
  <div style="position:absolute;inset:3.5px;border:1.2px solid ${RED};border-radius:3px;"></div>
  <div style="font:700 7.5px/1 Mono;letter-spacing:2.6px;padding:2px 0 3px;">&#9733; MONOCHROME BUREAU &#9733;</div>
  <div style="font:700 28px/1 Stencil;letter-spacing:2.5px;padding:0 0 0 2.5px;">CONFIRMED</div>
</div>`;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
await page.setContent(`<style>${CSS}</style>${screenHTML}`);
const loadFonts = pg => pg.evaluate(async () => { await Promise.all(['900 108px Head', '400 17px Type', '700 12px Mono', '400 12px Mono', '700 30px Stencil'].map(f => document.fonts.load(f))); await document.fonts.ready; });
await loadFonts(page);

// lay the final headline out once, then pin every character cell, so scrambled glyphs never shift the layout
const cells = await page.evaluate(({ L1, L2, HL_X, HL_Y, HL_SIZE, HL_LH }) => {
  const hl = document.getElementById('hl'), out = [];
  [[L1, 0], [L2, 1]].forEach(([txt, row]) => {
    const line = document.createElement('div');
    line.style.cssText = `position:absolute;left:${HL_X}px;top:${HL_Y + row * HL_LH}px;font:900 ${HL_SIZE}px/${HL_LH}px Head;letter-spacing:1px;white-space:nowrap;`;
    for (const ch of txt) { const s = document.createElement('span'); s.textContent = ch; line.appendChild(s); }
    hl.appendChild(line);
    [...line.children].forEach((s, i) => { const r = s.getBoundingClientRect(); out.push({ ch: txt[i], row, i, x: r.left, w: r.width }); });
    line.remove();
  });
  return out;
}, { L1, L2, HL_X, HL_Y, HL_SIZE, HL_LH });
const lineW = [0, 1].map(row => { const c = cells.filter(c => c.row === row); const l = c[c.length - 1]; return l.x + l.w - HL_X; });

// timeline: per frame, what each cell shows
const F_BARS = 1, F_BREAK = 3, F_SCR = 12, F_TYPE = Math.ceil(TTY.length / 2), F_THUNK = 4;
cells.forEach((c, k) => { c.lock = Math.min(F_SCR - 1, Math.floor((c.i / 11) * (F_SCR - 5) + c.row * 1.5 + rnd() * 3)); c.cur = pick(GLYPHS); });
// redaction bars: one bar per word, split into chunks that drop out during the break-up
const bars = [0, 1].map(row => {
  const n = 7, w = lineW[row] + 10, out = [];
  for (let j = 0; j < n; j++) out.push({ x: HL_X - 6 + (w / n) * j, w: w / n + 0.5, y: HL_Y + row * HL_LH + 12, h: HL_LH - 16, gone: 1 + Math.floor(rnd() * F_BREAK) });
  return out;
}).flat();
const CIPHER = () => Array.from({ length: 7 }, () => Array.from({ length: 5 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ0123456789')).join('')).join(' ');

const frames = [];   // {file, ms}
const shot = async (name, ms) => { const f = join(RAW, name + '.png'); await page.locator('#scr').screenshot({ path: f }); frames.push({ file: f, ms }); };
const setState = st => page.evaluate(st => {
  const hl = document.getElementById('hl');
  hl.innerHTML = st.cells.map(c => c.g ? `<span style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.w}px;text-align:center;font:900 ${c.size}px/${c.lh}px Head;color:${c.col};${c.dx ? `transform:translateX(${c.dx}px);` : ''}">${c.g}</span>` : '').join('');
  document.getElementById('bars').innerHTML = st.bars.map(r => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:#e4e4e4;"></div>`).join('');
  document.getElementById('tty').innerHTML = st.tty;
  document.getElementById('stat').textContent = st.stat;
  document.getElementById('pct').textContent = st.pct;
  document.getElementById('segs').innerHTML = Array.from({ length: 10 }, (_, i) => `<span style="display:inline-block;width:7px;height:9px;margin-left:2px;${i < st.segs ? 'background:#d8d8d8;' : 'border:1px solid #6a6a6a;'}"></span>`).join('');
  document.getElementById('dot').style.visibility = st.dot ? 'visible' : 'hidden';
  document.getElementById('stamp').innerHTML = st.stamp || '';
  document.getElementById('glitch').innerHTML = st.glitch || '';
}, st);

const cellState = (f, opts = {}) => cells.map(c => {
  const y = HL_Y + c.row * HL_LH;
  const locked = f >= c.lock;
  if (c.ch === ' ') return {};
  // unlocked cells change glyph about every other frame (cheaper GIF deltas, and it reads as a rolling cipher, not noise)
  if (!locked && (opts.roll ?? true) && rnd() < 0.5) c.cur = pick(GLYPHS);
  const g = locked ? c.ch : c.cur;
  return { x: c.x, y, w: c.w, g: g.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'), size: HL_SIZE, lh: HL_LH,
    col: locked ? '#f3f3f3' : '#a9a9a9', dx: opts.dx ? opts.dx(c) : 0 };
});
const cursor = '<span style="display:inline-block;width:10px;height:17px;background:#e6e6e6;vertical-align:-3px;margin-left:2px;"></span>';
const ttyLine = n => `${TTY.slice(0, n).replace('>', '&gt;')}${cursor}`;
let cipher = CIPHER();

// F0: encrypted, held
await setState({ cells: [], bars, tty: `<span style="color:#6f6f6f;letter-spacing:1px;">${cipher}</span>`, stat: 'Receiving', pct: '00%', segs: 0, dot: true });
await shot('d00', 650);
// break-up: bars drop out chunk by chunk while scrambled glyphs show through
let fi = 1;
for (let f = 1; f <= F_BREAK; f++, fi++) {
  cipher = cipher.split('').map(ch => ch !== ' ' && rnd() < 0.35 ? pick('ABCDEFGHJKLMNPQRSTUVWXYZ0123456789') : ch).join('');
  await setState({ cells: cellState(-1), bars: bars.filter(r => r.gone > f), tty: `<span style="color:#6f6f6f;letter-spacing:1px;">${cipher}</span>`,
    stat: 'Decrypting', pct: String(f * 8).padStart(2, '0') + '%', segs: Math.floor(f * 0.8), dot: f % 2 === 1 });
  await shot('d' + String(fi).padStart(2, '0'), 70);
}
// scramble and lock, left to right
for (let f = 0; f < F_SCR; f++, fi++) {
  const p = Math.round(24 + (76 * (f + 1)) / F_SCR);
  cipher = cipher.split('').map(ch => ch !== ' ' && rnd() < 0.3 ? pick('ABCDEFGHJKLMNPQRSTUVWXYZ0123456789') : ch).join('');
  // the cipher text burns away as the headline locks
  const keep = Math.max(0, Math.round(cipher.length * (1 - (f + 1) / F_SCR)));
  await setState({ cells: cellState(f), bars: [], tty: `<span style="color:#6f6f6f;letter-spacing:1px;">${cipher.slice(cipher.length - keep)}</span>`,
    stat: 'Decrypting', pct: Math.min(99, p) + '%', segs: Math.floor(p / 10), dot: Math.floor(f / 3) % 2 === 0 });
  await shot('d' + String(fi).padStart(2, '0'), 55);
}
// glitch: the second line jumps sideways for one frame, under a white tear line
await setState({ cells: cellState(99, { dx: c => (c.row === 1 ? -8 : 0) }), bars: [], tty: '', stat: 'Decrypted', pct: '100%', segs: 10, dot: true,
  glitch: `<div style="position:absolute;left:0;right:0;top:${HL_Y + HL_LH + 40}px;height:5px;background:#f0f0f0;"></div>` });
await shot('d' + String(fi++).padStart(2, '0'), 70);
await setState({ cells: cellState(99), bars: [], tty: cursor, stat: 'Decrypted', pct: '100%', segs: 10, dot: true });
await shot('d' + String(fi++).padStart(2, '0'), 380);
// teleprinter types the line, two characters a frame
for (let n = 2; n <= TTY.length + 1; n += 2, fi++) {
  await setState({ cells: cellState(99), bars: [], tty: ttyLine(Math.min(n, TTY.length)), stat: 'Decrypted', pct: '100%', segs: 10, dot: true });
  await shot('d' + String(fi).padStart(2, '0'), 42);
}
// stamp thunks on (the site's .stamp "thunk": big, overshoot, settle)
const THUNK = [[1.9, 0.55], [0.93, 0.96], [1.03, 0.95]];
for (const [s, o] of THUNK) {
  await setState({ cells: cellState(99), bars: [], tty: ttyLine(TTY.length), stat: 'Decrypted', pct: '100%', segs: 10, dot: true, stamp: stampHTML(s, o) });
  await shot('d' + String(fi++).padStart(2, '0'), 55);
}
await setState({ cells: cellState(99), bars: [], tty: ttyLine(TTY.length), stat: 'Decrypted', pct: '100%', segs: 10, dot: true, stamp: stampHTML(1, 0.94) });
await shot('d' + String(fi++).padStart(2, '0'), 30000);
console.log('decrypt frames', frames.length, 'line widths', lineW.map(Math.round));

// =================================================================================================================================
// 2. PROPS (2x the size the email shows them)
// =================================================================================================================================
const props = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const prop = async (name, w, h, html, bg = 'transparent') => {
  await props.setContent(`<style>${CSS}</style><div id="p" style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${bg};">${html}</div>`);
  await loadFonts(props);
  await props.locator('#p').screenshot({ path: join(RAW, name + '.png'), omitBackground: bg === 'transparent' });
};

// wordmark on a desk plate
await prop('wordmark', 240, 22, `<img src="data:image/png;base64,${b64(WORDMARK)}" style="display:block;width:240px;height:21.5px;margin-top:.25px;">`, DESK);

// clearance ladder L5 (the site's .ladder: 6px bars, heights 5..14)
await prop('ladder', 38, 14, [5, 7, 9, 11, 14].map((hh, i) => `<i style="position:absolute;left:${i * 8}px;bottom:0;width:6px;height:${hh}px;background:#ececec;"></i>`).join(''));

// sprocket hole tile: 22 x 30, hole d=11 in desk black with a pressed-paper rim
await prop('sprocket', 22, 30, `<div style="position:absolute;left:5.5px;top:9.5px;width:11px;height:11px;border-radius:50%;background:${DESK};box-shadow:0 0 0 1px rgba(0,0,0,.18), inset 0 1.5px 0 rgba(0,0,0,.6);"></div>`);

// torn edges: desk above / below a ragged perforation line; the paper side is left transparent (the cell's paper colour shows)
const tear = (top) => {
  const pts = []; let x = 0;
  while (x <= 552) { const nub = (Math.round(x) % 6) < 3; pts.push([x, 5 + (nub ? -1.2 : 0.4) + (rnd() - 0.5) * 1.1]); x += 1.5; }
  const path = top ? `M0 0 H552 V${pts[pts.length - 1][1]} ` + pts.slice().reverse().map(([px, py]) => `L${px} ${py}`).join(' ') + ' Z'
    : `M0 10 H552 V${10 - pts[pts.length - 1][1]} ` + pts.slice().reverse().map(([px, py]) => `L${px} ${10 - py}`).join(' ') + ' Z';
  return `<svg width="552" height="10" viewBox="0 0 552 10" style="display:block"><path d="${path}" fill="${DESK}"/></svg>`;
};
await prop('tear-top', 552, 10, tear(true));
await prop('tear-bot', 552, 10, tear(false));

// dot-matrix header: a 5x7 printer font, each pin a soft dot, struck twice (emphasised print) with a little ribbon wear
const F57 = { A: [0x7C, 0x12, 0x11, 0x12, 0x7C], C: [0x3E, 0x41, 0x41, 0x41, 0x22], E: [0x7F, 0x49, 0x49, 0x49, 0x41], F: [0x7F, 0x09, 0x09, 0x09, 0x01],
  I: [0x00, 0x41, 0x7F, 0x41, 0x00], M: [0x7F, 0x02, 0x0C, 0x02, 0x7F], N: [0x7F, 0x04, 0x08, 0x10, 0x7F], O: [0x3E, 0x41, 0x41, 0x41, 0x3E],
  Q: [0x3E, 0x41, 0x51, 0x21, 0x5E], R: [0x7F, 0x09, 0x19, 0x29, 0x46], S: [0x46, 0x49, 0x49, 0x49, 0x31], T: [0x01, 0x01, 0x7F, 0x01, 0x01],
  U: [0x3F, 0x40, 0x40, 0x40, 0x3F], ' ': [0, 0, 0, 0, 0] };
const DMX = 'REQUISITION MANIFEST', PITCH = 3.2, DOT = 2.7;
let dots = '';
[...DMX].forEach((ch, ci) => F57[ch].forEach((col, cx) => { for (let ry = 0; ry < 7; ry++) if (col & (1 << ry)) {
  const x = ci * 6 * PITCH + cx * PITCH + PITCH / 2, y = ry * PITCH + PITCH / 2 + 1, a = (0.78 + rnd() * 0.22).toFixed(2);
  dots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${DOT / 2}" fill-opacity="${a}"/><circle cx="${(x + 0.8).toFixed(2)}" cy="${y.toFixed(2)}" r="${DOT / 2.2}" fill-opacity="${(a * 0.7).toFixed(2)}"/>`;
} }));
const DMX_W = Math.ceil(DMX.length * 6 * PITCH);
await prop('dmx', DMX_W, 25, `<svg width="${DMX_W}" height="25" style="display:block"><g fill="#161616">${dots}</g></svg>`);

// punched teleprinter tape, ITA2: tracks 1,2 | feed | 3,4,5
const ITA2 = { A: '11000', B: '10011', C: '01110', D: '10010', E: '10000', F: '10110', G: '01011', H: '00101', I: '01100', J: '11010', K: '11110',
  L: '01001', M: '00111', N: '00110', O: '00011', P: '01101', Q: '11101', R: '01010', S: '10100', T: '00001', U: '11100', V: '01111', W: '11001',
  X: '10111', Y: '10101', Z: '10001', ' ': '00100' };
const MSG = 'ZCZC MONOCHROME BUREAU REQUISITIONS DESK END OF TRANSMISSION NNNN';
const TP = 5.6, TAPE_Y = 5, TAPE_H = 36, TRK = 5.2;   // hole pitch along the tape, tape top, tape height, track spacing (display px)
const trackY = t => TAPE_Y + 5 + t * TRK;            // tracks 0..5: data bits 1, 2 | feed | data bits 3, 4, 5
const cols = Math.ceil(600 / TP) + 1, lead = Math.floor((cols - MSG.length) / 2);
let holes = '';
for (let k = 0; k < cols; k++) {
  const m = k - lead, code = m >= 0 && m < MSG.length ? ITA2[MSG[m]] : '00000', x = 1 + k * TP;   // blank leader both ends
  holes += `<circle cx="${x.toFixed(2)}" cy="${trackY(2).toFixed(2)}" r="1.1"/>`;
  [0, 1, 3, 4, 5].forEach((t, bit) => { if (code[bit] === '1') holes += `<circle cx="${x.toFixed(2)}" cy="${trackY(t).toFixed(2)}" r="1.95"/>`; });
}
const edge = (y, dir) => { let d = `M-2 ${y}`; for (let x = 0; x <= 604; x += 6) d += ` L${x} ${(y + (rnd() - 0.5) * 0.9 * dir).toFixed(2)}`; return d; };
await prop('tape', 600, 46, `<svg width="600" height="46" viewBox="0 0 600 46" style="display:block">
  <defs><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 -.04"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
  <path d="${edge(TAPE_Y, 1)} L604 ${TAPE_Y + TAPE_H} ${edge(TAPE_Y + TAPE_H, -1).replace('M', 'L').split(' L').reverse().join(' L')} Z" fill="#dedede"/>
  <path d="${edge(TAPE_Y, 1)} L604 ${TAPE_Y + TAPE_H} ${edge(TAPE_Y + TAPE_H, -1).replace('M', 'L').split(' L').reverse().join(' L')} Z" fill="#000" filter="url(#g)"/>
  <rect x="0" y="${TAPE_Y + TAPE_H}" width="600" height="2" fill="#000" opacity=".35"/>
  <g fill="${DESK}">${holes}</g>
</svg>`, DESK);

// cipher wheel: two rings of letters (the outer one in Stardos Stencil) around the MONOCHROME emblem; signal-red index at the top
const RING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', SHIFT = 7;
const ringText = (r, sz, fam, col, txt, rot = 0) => [...txt].map((ch, i) => {
  const a = (i / txt.length) * 360 + rot;
  return `<text transform="rotate(${a.toFixed(2)} 70 70) translate(70 ${(70 - r).toFixed(2)})" text-anchor="middle" dominant-baseline="central" font-family="${fam}" font-weight="700" font-size="${sz}" fill="${col}">${ch}</text>`;
}).join('');
const ticks = Array.from({ length: 52 }, (_, i) => `<line x1="70" y1="${i % 2 ? 3.8 : 2.6}" x2="70" y2="6.2" stroke="#9a9a9a" stroke-width="${i % 2 ? .6 : 1}" transform="rotate(${(i * 360 / 52).toFixed(2)} 70 70)"/>`).join('');
await prop('wheel', 140, 140, `<svg width="140" height="140" viewBox="0 0 140 140" style="display:block">
  <defs><clipPath id="c"><circle cx="70" cy="70" r="31"/></clipPath>
    <radialGradient id="rim" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#2a2a2a"/><stop offset="1" stop-color="#111"/></radialGradient></defs>
  <circle cx="70" cy="70" r="69" fill="url(#rim)" stroke="#bdbdbd" stroke-width="1.2"/>
  ${ticks}
  <circle cx="70" cy="70" r="55" fill="none" stroke="#7a7a7a" stroke-width=".8"/>
  ${ringText(61.5, 9.6, 'Stencil', '#efefef', RING)}
  <circle cx="70" cy="70" r="46" fill="#0c0c0c" stroke="#5a5a5a" stroke-width=".8"/>
  ${ringText(40.5, 7.2, 'Mono', '#a8a8a8', RING.slice(SHIFT) + RING.slice(0, SHIFT), 0)}
  <circle cx="70" cy="70" r="33.5" fill="none" stroke="#8a8a8a" stroke-width=".8"/>
  <circle cx="70" cy="70" r="31" fill="#000"/>
  <image href="data:image/webp;base64,${b64(join(ASSETS, 'mc-emblem.webp'))}" x="40" y="37.5" width="60" height="64.6" clip-path="url(#c)"/>
  <path d="M70 13.5 L64.6 1.2 H75.4 Z" fill="${RED}"/>
  <line x1="70" y1="13" x2="70" y2="34" stroke="${RED}" stroke-width="1" opacity=".9"/>
</svg>`);
await b.close();

// =================================================================================================================================
// 3. PIL: palettes, GIF assembly
// =================================================================================================================================
const PY = String.raw`
import sys, json, os
from PIL import Image
raw, out, frames = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])

# --- the GIF: one shared 64-colour palette (built from a montage of key frames), no dithering, so unchanged pixels keep their
# index and Pillow's optimizer can store every later frame as a small transparent-padded delta
ims = [Image.open(f['file']).convert('RGB') for f in frames]
keys = [ims[0], ims[3], ims[10], ims[18], ims[-1]]
mont = Image.new('RGB', (keys[0].width, keys[0].height * len(keys)))
for i, k in enumerate(keys): mont.paste(k, (0, i * k.height))
pal = mont.quantize(colors=47, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
q = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in ims]
gif = os.path.join(out, 'transmission-decrypt.gif')
q[0].save(gif, save_all=True, append_images=q[1:], duration=[f['ms'] for f in frames], disposal=1, optimize=True)   # no loop: plays once
ims[-1].quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(out, 'transmission-decrypt.png'), optimize=True)

# --- props: palette PNGs (alpha kept)
def pal_png(name, colors):
    im = Image.open(os.path.join(raw, name + '.png'))
    im = im.convert('RGBA')
    if im.getextrema()[3][0] == 255:
        im.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(out, 'transmission-' + name + '.png'), optimize=True)
    else:
        im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(out, 'transmission-' + name + '.png'), optimize=True)
for name, colors in [('wordmark', 24), ('ladder', 8), ('sprocket', 16), ('tear-top', 8), ('tear-bot', 8), ('dmx', 16), ('tape', 32), ('wheel', 96)]:
    pal_png(name, colors)

tot = 0
for f in sorted(os.listdir(out)):
    if f.startswith('transmission-'):
        p = os.path.join(out, f); im = Image.open(p); kb = os.path.getsize(p) / 1024; tot += kb
        print('  %-28s %4d x %-4d %6.1f KB%s' % (f, im.width, im.height, kb, '  (%d frames)' % im.n_frames if f.endswith('.gif') else ''))
print('  total %.1f KB' % tot)
`;
const r = spawnSync('python3', ['-I', '-c', PY, RAW, OUT, JSON.stringify(frames)], { encoding: 'utf8' });
process.stdout.write(r.stdout); process.stderr.write(r.stderr);
if (r.status) process.exit(r.status);
