// node evidence-images.mjs  ->  ../img/evidence-*.png|gif
// Renders every static prop of the "Evidence Locker" order confirmation (variants/evidence.liquid) at 2x, with the theme's own
// woff2 fonts, then packs them as palette PNGs / GIFs with PIL (python3). Deterministic: same input, same files.
//
// Dark-mode note: props that touch a light "paper" cell with live text on it (tag tops, receipt edges) are drawn as the ROOM
// around the paper, with the paper itself left transparent. The paper colour comes from the cell behind the image, so when
// Gmail's dark mode darkens that cell the prop darkens with it instead of leaving a white cap on a dark tag.
import { chromium } from '../../../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'img');
const FONTS = join(here, '..', '..', '..', '..', 'shopify-theme', 'theme', 'assets');
const TMP = join(tmpdir(), 'evidence-images-build');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const ROOM = '#171717';     // the evidence room (email body background) - must match evidence.liquid
const PANEL = '#0d0d0d';    // inset panels (custody log, footer)
const RED = '#ff3b30';
const f = n => pathToFileURL(join(FONTS, n)).href;
const FACES = `
@font-face{font-family:'Stardos Stencil';font-weight:700;src:url(${f('mc-font-stardos-stencil-700.woff2')}) format('woff2')}
@font-face{font-family:'Courier Prime';font-weight:400;src:url(${f('mc-font-courier-prime-400.woff2')}) format('woff2')}
@font-face{font-family:'Courier Prime';font-weight:700;src:url(${f('mc-font-courier-prime-700.woff2')}) format('woff2')}
@font-face{font-family:'Special Elite';font-weight:400;src:url(${f('mc-font-special-elite-400.woff2')}) format('woff2')}
@font-face{font-family:'Big Shoulders Display';font-weight:100 900;src:url(${f('mc-font-big-shoulders-display.woff2')}) format('woff2')}
html,body{margin:0;padding:0;background:transparent}
svg{display:block}
*{box-sizing:border-box}
.s{position:relative;overflow:hidden}
`;
// the theme's worn rubber-stamp ink (mc-base.css --rough), seedable
const rough = (seed = 4, freq = 0.5, cut = 2.05) => `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='r' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' seed='${seed}'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 7 0 0 0 -${cut}'/></filter><rect width='180' height='180' filter='url(%23r)'/></svg>`
).replace(/%2523/g, '%23')}")`;

// deterministic barcode, same generator as snippets/mc-barcode.liquid
function barcode(seed, w, h, fill) {
  let x = 0, d = '', s = (seed * 40503 + 7) % 4294967296;
  const step = () => (s = (s * 1664525 + 1013904223) % 4294967296);
  for (let n = 0; n < 160; n++) {
    step(); const bw = Math.floor(s * 3.4 / 4294967296) + 1;
    step(); const gap = Math.floor(s * 2.6 / 4294967296) + 1;
    if (x + bw > w) break;
    d += `M${x} 0h${bw}v${h}h-${bw}z`;
    x += bw + gap;
    if (x >= w - 2) break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="${fill}"/></svg>`;
}

const jobs = [];     // {name, w, h, html, colors, kind:'png'|'gif', frames:[{html,ms}], bg}
const png = (name, w, h, html, colors = 32) => jobs.push({ name, w, h, kind: 'png', colors, frames: [{ html }] });

// ---------------------------------------------------------------------------------------------------------------------
// 1. RECEIVED rubber stamp: thunks on like the site's .stamp.in (scale 2.7 -> .92 -> 1.04 -> 1). Frame 0 is the landed
//    stamp for 20 ms so Outlook (first frame only) still shows it; plays once and rests on the landed stamp.
const stamp = (scale, op, ghost = 0) => `
<div class="s" style="width:240px;height:156px;background:${ROOM}">
  ${ghost ? `<div class="st" style="transform:translate(-50%,-50%) translate(${ghost}px,${-ghost}px) rotate(-9deg) scale(${scale * 1.03});opacity:.18"><div class="t1">Monochrome Bureau</div><div class="t2">RECEIVED</div><div class="t3">Requisitions desk</div></div>` : ''}
  <div class="st" style="transform:translate(-50%,-50%) rotate(-9deg) scale(${scale});opacity:${op}">
    <div class="t1">Monochrome Bureau</div><div class="t2">RECEIVED</div><div class="t3">Requisitions desk</div>
  </div>
</div>
<style>
.st{position:absolute;left:50%;top:50%;color:${RED};border:4.5px solid currentColor;border-radius:6px;padding:9px 14px 8px;text-align:center;white-space:nowrap;
  -webkit-mask-image:${rough(4, .42, 1.9)};-webkit-mask-size:180px 180px}
.st::before{content:"";position:absolute;inset:3px;border:1.4px solid currentColor;border-radius:4px;opacity:.9}
.t1,.t3{font:700 8.4px/1 'Courier Prime';letter-spacing:.26em;text-transform:uppercase}
.t2{font:700 33px/1 'Stardos Stencil';letter-spacing:.05em;margin:5px 0 4px}
</style>`;
jobs.push({ name: 'evidence-stamp', w: 240, h: 156, kind: 'gif', colors: 12, frames: [
  { html: stamp(1, .95), ms: 20 },
  { html: stamp(1, 0), ms: 140 },
  { html: stamp(2.4, .22), ms: 50 },
  { html: stamp(1.55, .66), ms: 50 },
  { html: stamp(.92, .97, 3), ms: 60 },
  { html: stamp(1.03, .96), ms: 60 },
  { html: stamp(1, .95), ms: 4000 },
] });

// ---------------------------------------------------------------------------------------------------------------------
// 2. Tamper-evident seal tape, run edge to edge across the email as dividers. White tape with black print and two red
//    pinstripes (a), and one red tape (b) that seals the receipt.
const TAPE_TXT = 'Evidence &nbsp;&#9632;&nbsp; Do not tamper &nbsp;&#9632;&nbsp; Monochrome Bureau &nbsp;&#9632;&nbsp; ';
const tape = (rot, bg, fg, line, top, serial) => `
<div class="s" style="width:600px;height:52px">
  <div class="tp" style="top:${top}px;transform:rotate(${rot}deg);background:${bg};color:${fg}">
    <i style="top:3px;background:${line}"></i><i style="bottom:3px;background:${line}"></i>
    <span class="sn" style="color:${serial}">N&ordm; 0417&middot;77</span><span class="tx">${TAPE_TXT.repeat(4)}</span>
  </div>
</div>
<style>
.tp{position:absolute;left:-24px;right:-24px;height:28px;display:flex;align-items:center;white-space:nowrap;overflow:hidden;
  box-shadow:0 2px 2px rgba(0,0,0,.55);background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.04) 0 2px,transparent 2px 5px)}
.tp i{position:absolute;left:0;right:0;height:1.5px}
.tx{font:700 12.5px/1 'Courier Prime';letter-spacing:.2em;text-transform:uppercase;padding-left:14px}
.sn{font:700 10px/1 'Courier Prime';letter-spacing:.12em;padding-left:58px}
</style>`;
png('evidence-tape-a', 600, 52, tape(-1.2, '#ececec', '#0a0a0a', RED, 12, RED), 48);
png('evidence-tape-b', 600, 52, tape(1.0, RED, '#f6f6f6', '#f6f6f6', 12, '#0a0a0a'), 48);

// ---------------------------------------------------------------------------------------------------------------------
// 3. Evidence bag around each live product photo: top (zip, label strip) and bottom (heat seal). The sides are table-cell
//    borders, so the bag still frames the photo with images off.
const BAG = '#232323', EDGE = '#555555';
png('evidence-bag-top', 172, 38, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="172" height="38" viewBox="0 0 172 38">
  <defs><pattern id="rib" width="2.5" height="10" patternUnits="userSpaceOnUse"><rect width="1.1" height="10" fill="#4e4e4e"/></pattern>
  <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <path d="M.5 38V7Q.5 .5 7 .5h158q6.5 0 6.5 6.5v31z" fill="${BAG}"/>
  <path d="M1 1.5h170v9H1z" fill="#383838"/><path d="M1 1.5h170v9H1z" fill="url(#rib)"/>
  <path d="M2 2.2h168" stroke="#7a7a7a" stroke-width=".8"/>
  <path d="M1 11h170v2.4H1z" fill="#121212"/><path d="M1 13.6h170" stroke="#606060" stroke-width=".7"/>
  <path d="M7 17h158v15H7z" fill="#ececec"/>
  <path d="M7 31.4h158" stroke="#9a9a9a" stroke-width=".6"/>
  <text x="12" y="27.3" font-family="Courier Prime" font-weight="700" font-size="8.4" letter-spacing="1.9" fill="#0a0a0a">EVIDENCE</text>
  <g fill="#0a0a0a">${[0,2,3,5,8,9,11,13,14,16,19,20,22,25,26,28,30,31,33].map(x => `<rect x="${78 + x}" y="20" width="${x % 3 ? 1 : 1.6}" height="9"/>`).join('')}</g>
  <text x="160" y="27.3" text-anchor="end" font-family="Courier Prime" font-weight="700" font-size="8.4" letter-spacing="1.4" fill="${RED}">SEALED</text>
  <path d="M120 38L150 14h14L136 38z" fill="url(#sh)"/>
  <path d="M.5 38V7Q.5 .5 7 .5h158q6.5 0 6.5 6.5v31" fill="none" stroke="${EDGE}"/>
</svg>`, 32);
png('evidence-bag-bot', 172, 30, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="172" height="30" viewBox="0 0 172 30">
  <defs><pattern id="rib" width="2.5" height="10" patternUnits="userSpaceOnUse"><rect width="1.1" height="10" fill="#474747"/></pattern>
  <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <path d="M.5 0v25.5h171V0z" fill="${BAG}"/>
  <path d="M120 0h24l-20 15h-22z" fill="url(#sh)"/>
  <text x="9" y="11" font-family="Courier Prime" font-weight="700" font-size="5.6" letter-spacing="1.2" fill="#8a8a8a">CHAIN OF CUSTODY ON FILE</text>
  <path d="M1 15h170v10H1z" fill="#2f2f2f"/><path d="M1 15h170v10H1z" fill="url(#rib)"/>
  <path d="M1 15.2h170" stroke="#1a1a1a" stroke-width=".8"/>
  <path d="M.5 0v25.5h171V0" fill="none" stroke="${EDGE}"/>
</svg>`, 32);

// ---------------------------------------------------------------------------------------------------------------------
// 4. Evidence tag top: chamfered paper with a reinforced punch hole and a strip of the site's evidence-board tape.
//    Paper area left transparent (see the dark-mode note at the top).
const tagTop = (w, h, py, at = 0.62, rot = -4) => {
  const paper = `M0 ${py + 9}L9 ${py}H${w - 9}L${w} ${py + 9}V${h}H0z`;
  const tx = Math.round(w * at);
  return `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><pattern id="rib" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="1.6" height="10" fill="#000" fill-opacity=".05"/></pattern></defs>
  <path d="M0 0H${w}V${h}H0z ${paper}" fill="${ROOM}" fill-rule="evenodd"/>
  <circle cx="22" cy="${py + 14}" r="6.6" fill="none" stroke="#bdbdbd" stroke-width="2.6"/>
  <circle cx="22" cy="${py + 14}" r="4.2" fill="${ROOM}"/>
  <g transform="translate(${tx} ${py + 1}) rotate(${rot})">
    <path d="M-38 -8 l2 2 -2 2 2 2 -2 2 2 2 -2 2 2 2 -2 2 H38 l-2 -2 2 -2 -2 -2 2 -2 -2 -2 2 -2 -2 -2 2 -2z" fill="#d6d6d6" fill-opacity=".86"/>
    <path d="M-36 -8H36V10H-36z" fill="url(#rib)"/>
  </g>
</svg>`;
};
png('evidence-tag-top', 330, 30, tagTop(330, 30, 10), 32);
png('evidence-tag-top-2', 330, 30, tagTop(330, 30, 10, 0.4, 3), 32);

// ---------------------------------------------------------------------------------------------------------------------
// 4b. Screw head for the steel locker plate (sits on the plate colour #262626).
png('evidence-screw', 12, 12, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
  <defs><radialGradient id="g" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#d9d9d9"/><stop offset=".55" stop-color="#8d8d8d"/><stop offset="1" stop-color="#3c3c3c"/></radialGradient></defs>
  <rect width="12" height="12" fill="#262626"/>
  <circle cx="6" cy="6" r="4.6" fill="#151515"/><circle cx="6" cy="6" r="4" fill="url(#g)"/>
  <path d="M3.6 4.5l3.9 3.9M8.4 4.6L4.5 8.5" stroke="#2a2a2a" stroke-width="1.1" stroke-linecap="round"/>
</svg>`, 16);

// ---------------------------------------------------------------------------------------------------------------------
// 5. Thermal receipt: torn top and bottom edges (room drawn, paper transparent).
const teeth = (w, top) => {
  let d = top ? `M0 0H${w}V5` : `M0 12H${w}V7`;
  for (let i = 0, x = w; x >= -6; i++, x -= 6) d += `L${x} ${top ? (i % 2 ? 9 : 4) : (i % 2 ? 3 : 8)}`;
  d += top ? `L0 0` : `L0 12`;
  return `<svg class="s" xmlns="http://www.w3.org/2000/svg" width="${w}" height="12" viewBox="0 0 ${w} 12"><path d="${d}z" fill="${ROOM}"/></svg>`;
};
png('evidence-rcpt-top', 380, 12, teeth(380, true), 4);
png('evidence-rcpt-bot', 380, 12, teeth(380, false), 4);

// ---------------------------------------------------------------------------------------------------------------------
// 6. Barcodes (receipt: black ink, footer: white), clearance ladder, blinking status light.
png('evidence-barcode-k', 220, 34, barcode(106, 220, 34, '#0a0a0a'), 4);
png('evidence-barcode-w', 180, 26, barcode(77, 180, 26, '#e9e9e9'), 4);
png('evidence-ladder', 34, 14, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="34" height="14" viewBox="0 0 34 14">
  ${[5, 7, 9, 11, 14].map((h, i) => i < 4 ? `<rect x="${i * 7}" y="${14 - h}" width="5" height="${h}" fill="#ececec"/>` : `<rect x="${i * 7 + .5}" y="${14 - h + .5}" width="4" height="${h - 1}" fill="none" stroke="#ececec"/>`).join('')}
</svg>`, 8);
const dot = on => `
<div class="s" style="width:12px;height:12px;background:${PANEL}">
  <div style="position:absolute;left:2px;top:2px;width:8px;height:8px;border-radius:50%;background:${on ? RED : '#4a1714'};box-shadow:${on ? `0 0 4px 1px rgba(255,59,48,.55)` : 'none'}"></div>
</div>`;
jobs.push({ name: 'evidence-dot', w: 12, h: 12, kind: 'gif', colors: 16, loop: true, frames: [{ html: dot(true), ms: 700 }, { html: dot(false), ms: 450 }] });

// ---------------------------------------------------------------------------------------------------------------------
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const manifest = [];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;   // ONLY=evidence-stamp node evidence-images.mjs
for (const j of jobs.filter(j => !only || only.includes(j.name))) {
  const page = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
  const frames = [];
  for (const [i, fr] of j.frames.entries()) {
    const file = join(TMP, `${j.name}-${i}.html`);
    writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${FACES}</style>${fr.html}`);
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const out = join(TMP, `${j.name}-${i}.png`);
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    frames.push({ png: out, ms: fr.ms || 0 });
  }
  await page.close();
  manifest.push({ name: j.name, kind: j.kind, colors: j.colors, loop: !!j.loop, frames });
}
await b.close();
writeFileSync(join(TMP, 'manifest.json'), JSON.stringify({ out: OUT, jobs: manifest }));

// ---- pack: palette PNGs (alpha kept) and GIFs with one shared palette per GIF --------------------------------------------
const PACK = String.raw`
import json, os, sys
from PIL import Image
m = json.load(open(sys.argv[1]))
for j in m['jobs']:
    ims = [Image.open(f['png']).convert('RGBA') for f in j['frames']]
    dst = os.path.join(m['out'], j['name'] + ('.gif' if j['kind'] == 'gif' else '.png'))
    if j['kind'] == 'png':
        q = ims[0].quantize(colors=j['colors'], method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        q.save(dst, optimize=True)
    else:
        rgb = [im.convert('RGB') for im in ims]
        w, h = rgb[0].size
        sheet = Image.new('RGB', (w * len(rgb), h))
        for i, im in enumerate(rgb): sheet.paste(im, (i * w, 0))
        pal = sheet.quantize(colors=j['colors'], method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        fr = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in rgb]
        kw = dict(save_all=True, append_images=fr[1:], duration=[f['ms'] for f in j['frames']], optimize=True, disposal=1)
        if j['loop']: kw['loop'] = 0
        fr[0].save(dst, **kw)
    print(f"{os.path.basename(dst):28s} {ims[0].size[0]}x{ims[0].size[1]}  {os.path.getsize(dst)/1024:6.1f} KB")
`;
writeFileSync(join(TMP, 'pack.py'), PACK);
process.stdout.write(execFileSync('python3', ['-I', join(TMP, 'pack.py'), join(TMP, 'manifest.json')]).toString());
