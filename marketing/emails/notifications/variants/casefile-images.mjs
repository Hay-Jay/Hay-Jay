// node casefile-images.mjs
// Renders the props for variants/casefile.liquid ("THE CASE FILE" order confirmation) into ../img/casefile-*.png|gif.
// Everything is drawn in Chromium with the theme's own woff2 fonts (Stardos Stencil, Courier Prime, Special Elite) and the
// launch stamps' worn-ink mask, at 2x the size the email shows it, then palette-quantized (and the stamp assembled into a
// play-once GIF) by the short Python/PIL step at the bottom. Nothing in these images is order-specific: all order data in the
// email is live text.
//
//   casefile-stamp.gif      APPROVED, thunks onto the form once (the site's stamp animation), ends on the stamped frame
//   casefile-stamp.png      the same stamp, still (served to Outlook for Windows, which only shows a GIF's first frame)
//   casefile-clip.png       the top of a paper clip, as it pokes out above a sheet or a photograph
//   casefile-ladder.png     the clearance ladder at L5
//   casefile-barcode.png    a barcode sticker for the file header
//   casefile-tick.png       a red hand tick for the chain of custody
//   casefile-sign.png       the Requisitions Desk signature
//   casefile-seal.png       the desk's round rubber stamp (fictional: MONOCHROME BUREAU, no real agency)
//   casefile-tape.png       DO NOT CROSS tape across the desk
//   casefile-grain.png      photocopy grain, tiled behind the paper (decorative; the paper colour is a flat bgcolor)
//   casefile-wordmark.png   the white wordmark on a plate of desk black: invisible on the desk, but it keeps the logo
//                           readable if a dark-mode client flips the desk to white
import { chromium } from '../../../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'img');
const RAW = join(tmpdir(), 'casefile-raw');
const ASSETS = join(here, '../../../../shopify-theme/theme/assets');
const DISTRESS = join(here, '../../../countdown-xo/assets/distress.png');
const WORDMARK = join(here, '../../img/wordmark-white.png');   // the launch emails' white wordmark, 480 x 43
rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const b64 = f => readFileSync(f).toString('base64');
const font = (fam, file, w = 400) => `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64(join(ASSETS, file))}) format('woff2');font-weight:${w};}`;
const RED = '#e0281c';           // stamp red, as in the launch emails' stamps
const INK = '#141414';

const CSS = `
${font('Stencil', 'mc-font-stardos-stencil-700.woff2', 700)}
${font('Mono', 'mc-font-courier-prime-400.woff2', 400)}
${font('Mono', 'mc-font-courier-prime-700.woff2', 700)}
${font('Type', 'mc-font-special-elite-400.woff2', 400)}
html,body{margin:0;padding:0;background:transparent;}
.box{position:relative;overflow:hidden;}
.worn{-webkit-mask-image:url(data:image/png;base64,${b64(DISTRESS)});-webkit-mask-size:360px;}
`;

// ---- APPROVED stamp: one block, drawn at any scale for the thunk frames ----------------------------------------------------
const STAMP_W = 480, STAMP_H = 280;  // 2x of 240 x 140
const stampHTML = (s = 1, dx = 0, dy = 0, worn = true) => `
<div class="box" id="el" style="width:${STAMP_W}px;height:${STAMP_H}px;">
  <div class="${worn ? 'worn' : ''}" style="position:absolute;left:50%;top:50%;transform:translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(-9deg) scale(${s});
       color:${RED};border:8px solid ${RED};border-radius:11px;padding:8px 22px 10px;text-align:center;white-space:nowrap;">
    <div style="position:absolute;inset:7px;border:3px solid ${RED};border-radius:5px;"></div>
    <div style="font:700 16px/1 Mono;letter-spacing:6px;padding:8px 0 5px;">&#9733; REQUISITIONS DESK &#9733;</div>
    <div style="font:700 66px/1 Stencil;letter-spacing:5px;padding:3px 0 0 5px;">APPROVED</div>
    <div style="font:700 14px/1 Mono;letter-spacing:5px;padding:6px 0 7px;border-top:3px solid ${RED};margin:2px 12px 0;">MONOCHROME BUREAU &middot; MB-7</div>
  </div>
</div>`;
// the thunk: in from 2.3x, faint, slams to 0.93, rebounds, settles (the site's @keyframes thunk, as frames)
const THUNK = [
  { s: 2.3, o: 0.22, d: 3 }, { s: 1.7, o: 0.45, d: 3 }, { s: 1.22, o: 0.75, d: 3 },
  { s: 0.93, o: 1, d: 5, dx: 2, dy: 2 }, { s: 1.035, o: 1, d: 5, dx: -1 }, { s: 0.995, o: 1, d: 5 },
];

// ---- paper clip, top only: the rest of it is behind the sheet ------------------------------------------------------------
const clipHTML = `
<div class="box" id="el" style="width:56px;height:100px;">
<svg width="56" height="100" viewBox="0 0 56 100" style="position:absolute;left:0;top:0;">
  <defs>
    <linearGradient id="st" x1="0" x2="1"><stop offset="0" stop-color="#5a5a5a"/><stop offset=".4" stop-color="#f4f4f4"/><stop offset=".62" stop-color="#9c9c9c"/><stop offset="1" stop-color="#464646"/></linearGradient>
  </defs>
  <g transform="rotate(-8 28 100)">
    <path d="M13 112 V27 A14 14 0 0 1 41 27 V112 M21 112 V38 A6 6 0 0 1 33 38 V112" fill="none" stroke="#2a2a2a" stroke-width="9" stroke-linecap="round" opacity=".5"/>
    <path d="M13 112 V27 A14 14 0 0 1 41 27 V112 M21 112 V38 A6 6 0 0 1 33 38 V112" fill="none" stroke="url(#st)" stroke-width="6" stroke-linecap="round"/>
    <path d="M14.6 106 V27 A12.4 12.4 0 0 1 27 14.6" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>
  </g>
</svg></div>`;

// ---- clearance ladder, L5 ---------------------------------------------------------------------------------------------------
const ladderHTML = `
<div class="box" id="el" style="width:76px;height:28px;display:flex;align-items:flex-end;gap:4px;">
  ${[10, 14, 18, 22, 28].map(h => `<i style="display:block;width:12px;height:${h}px;background:${INK};"></i>`).join('')}
</div>`;

// ---- barcode sticker (bars from the theme's mc-barcode LCG) --------------------------------------------------------------
function bars(seed, total, h) {
  let s = (seed * 40503 + 7) % 4294967296, x = 0, out = '';
  const next = () => (s = (Number((BigInt(s) * 1664525n + 1013904223n) % 4294967296n)));
  for (let n = 0; n < 120; n++) {
    const bw = Math.floor(next() * 3.4 / 4294967296) + 1;
    const gap = Math.floor(next() * 2.6 / 4294967296) + 1;
    if (x + bw > total) break;
    out += `<rect x="${x * 2}" y="0" width="${bw * 2}" height="${h}"/>`;
    x += bw + gap;
    if (x >= total - 4) break;
  }
  return out;
}
const barcodeHTML = `
<div class="box" id="el" style="width:236px;height:84px;">
  <div style="position:absolute;left:6px;top:8px;width:220px;height:66px;background:#f7f7f5;border:2px solid #9a9a9a;border-radius:5px;transform:rotate(1.6deg);
       box-shadow:0 1px 0 rgba(0,0,0,.25);">
    <svg width="196" height="38" viewBox="0 0 196 38" style="position:absolute;left:12px;top:8px;fill:${INK};">${bars(7, 98, 38)}</svg>
    <div style="position:absolute;left:12px;right:10px;bottom:5px;font:700 12px/1 Mono;letter-spacing:2.6px;color:${INK};white-space:nowrap;">MB-7 &middot; REQUISITION</div>
  </div>
</div>`;

// ---- red tick -----------------------------------------------------------------------------------------------------------------
const tickHTML = `
<div class="box" id="el" style="width:44px;height:44px;">
<svg width="44" height="44" viewBox="0 0 44 44"><path d="M6 24 C10 26 13 30 17 37 C22 24 29 13 40 4" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
</div>`;

// ---- signature: a quick, confident scrawl, ink with a faint paper halo so it survives a dark-mode inversion ---------------
const SIG = 'M22 74 C 30 50, 40 22, 48 14 C 54 8, 58 16, 52 30 C 44 50, 30 72, 34 76 C 40 80, 58 40, 70 30 C 76 26, 74 40, 66 48 C 60 54, 56 58, 62 58 C 72 58, 80 46, 88 46 C 94 46, 88 60, 96 60 C 104 60, 108 44, 116 44 C 122 44, 116 60, 124 60 C 132 60, 138 36, 146 22 C 140 46, 136 62, 146 62 C 156 62, 162 46, 172 46 C 180 46, 174 60, 184 60 C 196 60, 204 40, 214 40 C 222 40, 214 58, 226 58 C 238 58, 246 48, 254 46 M 18 88 C 80 78, 170 74, 286 64';
const signHTML = `
<div class="box" id="el" style="width:300px;height:100px;">
<svg width="300" height="100" viewBox="0 0 300 100">
  <path d="${SIG}" fill="none" stroke="#f4f4f2" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
  <path d="${SIG}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="276" cy="40" r="3.6" fill="${INK}"/>
</svg></div>`;

// ---- round desk seal (fictional bureau) ---------------------------------------------------------------------------------------
const sealHTML = `
<div class="box" id="el" style="width:216px;height:216px;">
 <div class="worn" style="position:absolute;inset:0;transform:rotate(14deg);opacity:.9;">
  <svg width="216" height="216" viewBox="0 0 216 216" style="color:${INK};">
    <defs><path id="ring" d="M108 108 m-76 0 a76 76 0 1 1 152 0 a76 76 0 1 1 -152 0"/></defs>
    <circle cx="108" cy="108" r="100" fill="none" stroke="currentColor" stroke-width="7"/>
    <circle cx="108" cy="108" r="92" fill="none" stroke="currentColor" stroke-width="2.4"/>
    <circle cx="108" cy="108" r="56" fill="none" stroke="currentColor" stroke-width="2.4"/>
    <text font-family="Mono" font-weight="700" font-size="19" letter-spacing="3.1" fill="currentColor"><textPath href="#ring" startOffset="0">MONOCHROME BUREAU &#9733; REQUISITIONS DESK &#9733; REGINA &#9733;</textPath></text>
    <text x="108" y="104" text-anchor="middle" font-family="Stencil" font-weight="700" font-size="40" fill="currentColor" letter-spacing="2">MB-7</text>
    <text x="108" y="132" text-anchor="middle" font-family="Mono" font-weight="700" font-size="16" letter-spacing="5" fill="currentColor">FILED</text>
  </svg>
 </div>
</div>`;

// ---- DO NOT CROSS tape, laid across the desk at a slight angle --------------------------------------------------------------
const TAPE_TXT = 'Do not cross &nbsp;//&nbsp; Requisition approved &nbsp;//&nbsp; Eyes only &nbsp;//&nbsp; ';
const tapeHTML = `
<div class="box" id="el" style="width:1200px;height:120px;">
  <div style="position:absolute;left:-60px;right:-60px;top:26px;height:66px;transform:rotate(-2.2deg);
       background:repeating-linear-gradient(-45deg,#0a0a0a 0 15px,#ededed 15px 30px);border-top:3px solid #ededed;border-bottom:3px solid #ededed;
       box-shadow:0 5px 0 rgba(0,0,0,.45);">
    <div style="position:absolute;left:0;right:0;top:11px;bottom:11px;background:#ededed;color:#0a0a0a;display:flex;align-items:center;justify-content:center;
         font:700 23px/1 Mono;letter-spacing:6px;text-transform:uppercase;white-space:nowrap;overflow:hidden;">${TAPE_TXT.repeat(4)}</div>
  </div>
</div>`;

// ---- grain: the theme's --grain-d photocopy speckle --------------------------------------------------------------------------
const grainHTML = `
<div class="box" id="el" style="width:200px;height:200px;">
<svg width="200" height="200"><filter id="n" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 -.2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
</div>`;

// ---- wordmark on a desk-black plate ------------------------------------------------------------------------------------------
const wordmarkHTML = `
<div class="box" id="el" style="width:440px;height:56px;background:#070707;">
  <img src="data:image/png;base64,${b64(WORDMARK)}" style="position:absolute;left:10px;top:9px;width:420px;height:auto;">
</div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 400 }, deviceScaleFactor: 1 });
async function shot(html, file) {
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#el').screenshot({ path: join(RAW, file), omitBackground: true });
}
for (const [i, f] of THUNK.entries()) await shot(stampHTML(f.s, f.dx || 0, f.dy || 0), `stamp-${i}.png`);
await shot(stampHTML(1), 'stamp-final.png');
await shot(clipHTML, 'clip.png');
await shot(ladderHTML, 'ladder.png');
await shot(barcodeHTML, 'barcode.png');
await shot(tickHTML, 'tick.png');
await shot(signHTML, 'sign.png');
await shot(sealHTML, 'seal.png');
await shot(tapeHTML, 'tape.png');
await shot(grainHTML, 'grain.png');
await shot(wordmarkHTML, 'wordmark.png');
await browser.close();

// ---- quantize, and build the GIF -------------------------------------------------------------------------------------------
const PY = String.raw`
import json, os, sys
import numpy as np
from PIL import Image
raw, out, thunk = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
R = (0xe0, 0x28, 0x1c)

def png8(src, dst, colors):
    im = Image.open(os.path.join(raw, src)).convert('RGBA')
    q = im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save(os.path.join(out, dst), optimize=True)

# stills
png8('stamp-final.png', 'casefile-stamp.png', 16)
png8('clip.png', 'casefile-clip.png', 48)
png8('ladder.png', 'casefile-ladder.png', 8)
png8('barcode.png', 'casefile-barcode.png', 24)
png8('tick.png', 'casefile-tick.png', 12)
png8('sign.png', 'casefile-sign.png', 16)
png8('seal.png', 'casefile-seal.png', 8)
png8('tape.png', 'casefile-tape.png', 24)
png8('grain.png', 'casefile-grain.png', 8)
png8('wordmark.png', 'casefile-wordmark.png', 16)

# the stamp GIF: one red ink and transparency. Partial opacity on the way in is an ordered dither (it reads as a
# half-inked blur at 1x), and the worn-ink holes stay crisp. Frame 0 is the blank sheet for a beat, the last frame holds.
bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
frames, delays = [], []
def ink_frame(alpha):
    h, w = alpha.shape
    thr = np.tile(bayer, (h // 4 + 1, w // 4 + 1))[:h, :w]
    on = alpha > np.maximum(thr, 0.02)
    idx = np.where(on, 1, 0).astype(np.uint8)
    im = Image.fromarray(idx, 'P')
    im.putpalette([0, 0, 0] + list(R) + [0, 0, 0] * 254)
    return im
blank = Image.open(os.path.join(raw, 'stamp-final.png'))
W, H = blank.size
frames.append(ink_frame(np.zeros((H, W)))); delays.append(12)
for i, f in enumerate(thunk):
    a = np.asarray(Image.open(os.path.join(raw, 'stamp-%d.png' % i)).convert('RGBA'))[..., 3] / 255.0
    if f['o'] < 1:
        yy, xx = np.mgrid[0:H, 0:W]
        edge = np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy]) / 46.0
        a = a * f['o'] * np.clip(edge, 0, 1) ** 1.5
    else:
        a = (a > 0.5).astype(float)
    frames.append(ink_frame(a)); delays.append(f['d'])
a = np.asarray(Image.open(os.path.join(raw, 'stamp-final.png')).convert('RGBA'))[..., 3] / 255.0
frames.append(ink_frame((a > 0.5).astype(float))); delays.append(100)
for fr in frames: fr.info['transparency'] = 0
frames[0].save(os.path.join(out, 'casefile-stamp.gif'), save_all=True, append_images=frames[1:], duration=[d * 10 for d in delays],
               transparency=0, disposal=2, optimize=False)
# play once: PIL writes a NETSCAPE loop block only when 'loop' is given, so leaving it out means no repeat
for n in sorted(os.listdir(out)):
    if n.startswith('casefile-'):
        im = Image.open(os.path.join(out, n))
        print('%-24s %5d x %-4d %6.1f KB' % (n, im.size[0], im.size[1], os.path.getsize(os.path.join(out, n)) / 1024))
`;
const r = spawnSync('python3', ['-I', '-c', PY, RAW, OUT, JSON.stringify(THUNK)], { encoding: 'utf8' });
process.stdout.write(r.stdout); process.stderr.write(r.stderr);
if (r.status) process.exit(r.status);
