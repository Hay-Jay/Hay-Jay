// node make_images.mjs            ->  img/oc-*.png|gif   (the props of order-confirmation.liquid)
// ONLY=oc-stamp,oc-tape node make_images.mjs   renders just those.
//
// Every prop is drawn in Chromium at 2x the size the email shows it, with the theme's own woff2 fonts (Stardos Stencil,
// Courier Prime, Special Elite) and the launch stamps' worn-ink mask, then packed by the short Python/PIL step at the bottom
// (palette PNGs; the stamp as a 1-bit-alpha GIF). Deterministic: same input, same files. Nothing here is order-specific:
// every piece of order data in the email is live text.
//
//   oc-stamp.gif     RECEIVED, red ink on transparency. Frame 0 is the landed stamp (20 ms) so first-frame-only clients
//                    (Outlook for Windows, iOS Low Power) still show it; then it thunks on once like the site's .stamp.in
//   oc-tape.png      the site's hazard ticker as a strip of tape across the room; the print starts and ends on a //
//   oc-hazard.png    the hazard edge on top of VIEW YOUR ORDER (stays put if a dark mode repaints the button)
//   oc-bag-top.png   evidence bag: zip, write-on label, glare. Opaque (room in the corners), so the cell behind it can
//   oc-bag-bot.png   carry the bag colour for images-off without showing square corners
//   oc-tag-a.png     exhibit tag tops: chamfer, punched hole, a strip of the site's evidence-board tape. Only the ROOM
//   oc-tag-b.png     around the paper is drawn; the paper is transparent, so a dark mode that darkens the tag darkens it too
//   oc-rcpt-top.png  thermal receipt torn edges (room drawn, paper transparent, same reason)
//   oc-rcpt-bot.png
//   oc-barcode-k.png receipt barcode, black on an opaque receipt-white sticker (survives an inverted receipt)
//   oc-barcode-w.png white barcode for the dark plates
//   oc-ladder.png    clearance ladder at L4, white
//   oc-tick.png      the custody box, ticked by hand in red ink
//   oc-dot.gif       the blinking red "Now" light of the custody log, on transparency (no panel colour baked in, so a
//                    dark mode that lightens the panel doesn't leave a black square around it)
//   oc-sign.png      the Requisitions Desk signature, light ink with a thin dark halo on transparency: reads on the dark
//                    room and still reads when Gmail's full inversion turns the room light
//   oc-wordmark.png  the MONOCHROME wordmark (marketing/emails/img/wordmark-white.png) on an opaque #0d0d0d plate the
//                    colour of the dossier bar: invisible as a plate normally, a dark badge if the bar gets inverted
import { chromium } from '../../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'img');
const FONTS = join(here, '..', '..', '..', 'shopify-theme', 'theme', 'assets');
const DISTRESS = join(here, '..', '..', 'countdown-xo', 'assets', 'distress.png');   // the launch stamps' worn-ink mask
const TMP = join(tmpdir(), 'oc-images-build');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

// colours: must match order-confirmation.liquid
const ROOM = '#171717';     // the evidence room (the email card)
const PANEL = '#0d0d0d';    // inset panels (plate, custody log, footer)
const BAG = '#262626', EDGE = '#6a6a6a';
const RED = '#ff3b30';      // signal red: the stamp, the tick, the status light
const INK = '#0a0a0a';

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
.worn{-webkit-mask-image:url(data:image/png;base64,${readFileSync(DISTRESS).toString('base64')});-webkit-mask-size:180px}
`;

// deterministic barcode bars, same LCG as the theme's snippets/mc-barcode.liquid
function barcode(seed, w, h, fill, bg = null) {
  let x = 0, d = '', s = (seed * 40503 + 7) % 4294967296;
  const step = () => (s = Number((BigInt(s) * 1664525n + 1013904223n) % 4294967296n));
  const pad = bg ? 4 : 0;
  x = pad;
  for (let n = 0; n < 200; n++) {
    step(); const bw = Math.floor(s * 3.4 / 4294967296) + 1;
    step(); const gap = Math.floor(s * 2.6 / 4294967296) + 1;
    if (x + bw > w - pad) break;
    d += `M${x} ${pad ? 3 : 0}h${bw}v${h - (pad ? 6 : 0)}h-${bw}z`;
    x += bw + gap;
    if (x >= w - pad - 2) break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}<path d="${d}" fill="${fill}"/></svg>`;
}

const jobs = [];
const png = (name, w, h, html, colors = 32) => jobs.push({ name, w, h, kind: 'png', colors, frames: [{ html }] });

// ---- 1. RECEIVED stamp ------------------------------------------------------------------------------------------------
// 240 x 150 in the email. Bigger secondary type than a desk stamp would have, so it still reads at 124 px on a phone.
const stamp = (scale = 1, dx = 0, dy = 0) => `
<div class="s" style="width:240px;height:150px">
  <div class="worn" style="position:absolute;left:50%;top:50%;transform:translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(-8deg) scale(${scale * 0.86});
       color:${RED};border:4.5px solid ${RED};border-radius:6px;padding:7px 13px 6px;text-align:center;white-space:nowrap">
    <div style="position:absolute;inset:3.5px;border:1.6px solid ${RED};border-radius:3px"></div>
    <div style="font:700 10.5px/1 'Courier Prime';letter-spacing:.24em;padding:4px 0 0 .24em">MONOCHROME BUREAU</div>
    <div style="font:700 40px/1 'Stardos Stencil';letter-spacing:.04em;padding:5px 0 3px .04em">RECEIVED</div>
    <div style="font:700 9.5px/1 'Courier Prime';letter-spacing:.24em;padding:5px 0 4px .24em;border-top:1.6px solid ${RED};margin:0 6px">REQUISITIONS DESK</div>
  </div>
</div>`;
// the site's @keyframes thunk as frames: in from 2.3x and faint, slam to .92, rebound, settle. o < 1 is drawn as an
// ordered-dither half-ink in the packer; d is the frame time in ms
const THUNK = [
  { s: 2.3, o: 0.22, d: 40 }, { s: 1.7, o: 0.45, d: 40 }, { s: 1.22, o: 0.75, d: 40 },
  { s: 0.92, o: 1, d: 60, dx: 1.5, dy: 1.5 }, { s: 1.04, o: 1, d: 60, dx: -0.5 }, { s: 0.995, o: 1, d: 50 },
];
jobs.push({ name: 'oc-stamp', w: 240, h: 150, kind: 'stamp', frames: [
  { html: stamp(1) },
  ...THUNK.map(t => ({ html: stamp(t.s, t.dx || 0, t.dy || 0), o: t.o, ms: t.d })),
], thunk: THUNK });

// ---- 2. tape: the site's hazard ticker (.ticker.hazard) laid across the room ----------------------------------------------
// The print is spread edge to edge with space-between, so the visible strip starts and ends on a // and never mid-word.
const TAPE = ['//', 'Do not cross', '//', 'Evidence', '//', 'Wear the unknown', '//'];
png('oc-tape', 600, 56, `
<div class="s" style="width:600px;height:56px">
  <div style="position:absolute;left:-30px;right:-30px;top:11px;height:34px;transform:rotate(-1.3deg);background:#0b0b0b;
       border-top:6px solid transparent;border-bottom:6px solid transparent;
       border-image:repeating-linear-gradient(-45deg,#080808 0 7px,#ececec 7px 14px) 6;box-shadow:0 2px 3px rgba(0,0,0,.6);
       display:flex;align-items:center;justify-content:space-between;padding:0 37px 0 35px;
       font:700 13.5px/1 'Courier Prime';letter-spacing:.2em;text-transform:uppercase;color:#ececec;white-space:nowrap">
    ${TAPE.map(t => `<span style="${t === '//' ? 'color:#8a8a8a;letter-spacing:0' : ''}">${t}</span>`).join('')}
  </div>
</div>`, 32);

// ---- 3. hazard edge on the button -------------------------------------------------------------------------------------------
png('oc-hazard', 520, 8, `<div class="s" style="width:520px;height:8px;background:repeating-linear-gradient(-45deg,#080808 0 6px,#ececec 6px 12px)"></div>`, 16);

// ---- 4. evidence bag caps ---------------------------------------------------------------------------------------------------
png('oc-bag-top', 172, 38, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="172" height="38" viewBox="0 0 172 38">
  <defs><pattern id="rib" width="2.5" height="10" patternUnits="userSpaceOnUse"><rect width="1.1" height="10" fill="#5a5a5a"/></pattern>
  <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <rect width="172" height="38" fill="${ROOM}"/>
  <path d="M.5 38V7Q.5 .5 7 .5h158q6.5 0 6.5 6.5v31z" fill="${BAG}"/>
  <path d="M1 1.5h170v9H1z" fill="#3c3c3c"/><path d="M1 1.5h170v9H1z" fill="url(#rib)"/>
  <path d="M2 2.2h168" stroke="#8a8a8a" stroke-width=".8"/>
  <path d="M1 11h170v2.4H1z" fill="#121212"/><path d="M1 13.6h170" stroke="#707070" stroke-width=".7"/>
  <path d="M7 17h158v15H7z" fill="#ececec"/>
  <path d="M7 17h4v15H7z" fill="${INK}"/>
  <path d="M7 31.4h158" stroke="#9a9a9a" stroke-width=".6"/>
  <text x="15" y="27.3" font-family="Courier Prime" font-weight="700" font-size="8.4" letter-spacing="1.9" fill="${INK}">EVIDENCE</text>
  <g fill="${INK}">${[0, 2, 3, 5, 8, 9, 11, 13, 14, 16, 19, 20, 22, 25, 26, 28, 30, 31, 33].map(x => `<rect x="${80 + x}" y="20" width="${x % 3 ? 1 : 1.6}" height="9"/>`).join('')}</g>
  <text x="160" y="27.3" text-anchor="end" font-family="Courier Prime" font-weight="700" font-size="8.4" letter-spacing="1.4" fill="${INK}">SEALED</text>
  <path d="M112 38L146 13h16L128 38z" fill="url(#sh)"/>
  <path d="M.5 38V7Q.5 .5 7 .5h158q6.5 0 6.5 6.5v31" fill="none" stroke="${EDGE}"/>
  <path d="M2 37V8Q2 2 8 2" fill="none" stroke="#9a9a9a" stroke-width=".7" stroke-opacity=".7"/>
</svg>`, 48);
png('oc-bag-bot', 172, 30, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="172" height="30" viewBox="0 0 172 30">
  <defs><pattern id="rib" width="2.5" height="10" patternUnits="userSpaceOnUse"><rect width="1.1" height="10" fill="#4e4e4e"/></pattern>
  <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <rect width="172" height="30" fill="${ROOM}"/>
  <path d="M.5 0v25.5h171V0z" fill="${BAG}"/>
  <path d="M112 0h26l-20 15h-24z" fill="url(#sh)"/>
  <text x="9" y="10.5" font-family="Courier Prime" font-weight="700" font-size="5.6" letter-spacing="1.2" fill="#9a9a9a">CHAIN OF CUSTODY ON FILE</text>
  <path d="M1 15h170v10H1z" fill="#333333"/><path d="M1 15h170v10H1z" fill="url(#rib)"/>
  <path d="M1 15.2h170" stroke="#1a1a1a" stroke-width=".8"/>
  <path d="M.5 0v25.5h171V0" fill="none" stroke="${EDGE}"/>
</svg>`, 48);

// ---- 5. exhibit tag tops (paper transparent) ---------------------------------------------------------------------------------
const tagTop = (w, h, py, at, rot) => {
  const paper = `M0 ${py + 9}L9 ${py}H${w - 9}L${w} ${py + 9}V${h}H0z`;
  const tx = Math.round(w * at);
  return `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><pattern id="rib" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="1.6" height="10" fill="#000" fill-opacity=".05"/></pattern></defs>
  <path d="M0 0H${w}V${h}H0z ${paper}" fill="${ROOM}" fill-rule="evenodd"/>
  <circle cx="22" cy="${py + 14}" r="6.6" fill="none" stroke="#bdbdbd" stroke-width="2.6"/>
  <circle cx="22" cy="${py + 14}" r="4.2" fill="${ROOM}"/>
  <g transform="translate(${tx} ${py + 1}) rotate(${rot})">
    <path d="M-38 -8 l2 2 -2 2 2 2 -2 2 2 2 -2 2 2 2 -2 2 H38 l-2 -2 2 -2 -2 -2 2 -2 -2 -2 2 -2 -2 -2 2 -2z" fill="#d6d6d6" fill-opacity=".88"/>
    <path d="M-36 -8H36V10H-36z" fill="url(#rib)"/>
  </g>
</svg>`;
};
png('oc-tag-a', 330, 30, tagTop(330, 30, 10, 0.62, -4), 32);
png('oc-tag-b', 330, 30, tagTop(330, 30, 10, 0.4, 3), 32);

// ---- 6. thermal receipt torn edges (paper transparent) -----------------------------------------------------------------------
const teeth = (w, top) => {
  let d = top ? `M0 0H${w}V5` : `M0 12H${w}V7`;
  for (let i = 0, x = w; x >= -6; i++, x -= 6) d += `L${x} ${top ? (i % 2 ? 9 : 4) : (i % 2 ? 3 : 8)}`;
  d += top ? 'L0 0' : 'L0 12';
  return `<svg class="s" xmlns="http://www.w3.org/2000/svg" width="${w}" height="12" viewBox="0 0 ${w} 12"><path d="${d}z" fill="${ROOM}"/></svg>`;
};
png('oc-rcpt-top', 380, 12, teeth(380, true), 4);
png('oc-rcpt-bot', 380, 12, teeth(380, false), 4);

// ---- 7. barcodes, ladder ------------------------------------------------------------------------------------------------------
png('oc-barcode-k', 220, 34, barcode(106, 220, 34, INK, '#f6f6f6'), 4);
png('oc-barcode-w', 180, 26, barcode(77, 180, 26, '#e9e9e9'), 4);
png('oc-ladder', 34, 14, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="34" height="14" viewBox="0 0 34 14">
  ${[5, 7, 9, 11, 14].map((h, i) => i < 4 ? `<rect x="${i * 7}" y="${14 - h}" width="5" height="${h}" fill="#ececec"/>` : `<rect x="${i * 7 + .5}" y="${14 - h + .5}" width="4" height="${h - 1}" fill="none" stroke="#ececec"/>`).join('')}
</svg>`, 8);

// ---- 8. the ticked custody box: a light square ticked in red ink -------------------------------------------------------------
png('oc-tick', 24, 24, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="2" y="6" width="16" height="16" fill="none" stroke="#cfcfcf" stroke-width="2"/>
  <path d="M5 14.5C7 15.5 8.6 17.6 10.2 21C12.8 13.4 16.6 7 22.5 1.8" fill="none" stroke="${RED}" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`, 16);

// ---- 9. blinking status light (transparent: the panel colour is NOT baked in) --------------------------------------------
const dot = on => `
<div class="s" style="width:12px;height:12px">
  <div style="position:absolute;left:1.5px;top:1.5px;width:9px;height:9px;border-radius:50%;background:${on ? RED : '#5a1c18'}"></div>
</div>`;
jobs.push({ name: 'oc-dot', w: 12, h: 12, kind: 'gift', colors: 8, loop: true, frames: [{ html: dot(true), ms: 700 }, { html: dot(false), ms: 450 }] });

// ---- 10. signature: a quick scrawl in light ink, for the dark room ---------------------------------------------------------
const SIG = 'M22 74 C 30 50, 40 22, 48 14 C 54 8, 58 16, 52 30 C 44 50, 30 72, 34 76 C 40 80, 58 40, 70 30 C 76 26, 74 40, 66 48 C 60 54, 56 58, 62 58 C 72 58, 80 46, 88 46 C 94 46, 88 60, 96 60 C 104 60, 108 44, 116 44 C 122 44, 116 60, 124 60 C 132 60, 138 36, 146 22 C 140 46, 136 62, 146 62 C 156 62, 162 46, 172 46 C 180 46, 174 60, 184 60 C 196 60, 204 40, 214 40 C 222 40, 214 58, 226 58 C 238 58, 246 48, 254 46 M 18 88 C 80 78, 170 74, 286 64';
png('oc-sign', 150, 50, `
<svg class="s" xmlns="http://www.w3.org/2000/svg" width="150" height="50" viewBox="0 0 300 100">
  <path d="${SIG}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="276" cy="40" r="6" fill="${INK}"/>
  <path d="${SIG}" fill="none" stroke="#e6e6e6" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="276" cy="40" r="3.8" fill="#e6e6e6"/>
</svg>`, 32);

// ---- 11. wordmark plate: the brand's white wordmark on an opaque plate the colour of the dossier bar -----------------------
const WORDMARK = pathToFileURL(join(here, '..', 'img', 'wordmark-white.png')).href;   // 480 x 43
png('oc-wordmark', 162, 26, `
<div class="s" style="width:162px;height:26px;background:${PANEL}">
  <img src="${WORDMARK}" style="position:absolute;left:6px;top:6.3px;width:150px;height:13.44px">
</div>`, 32);

// ---- render -------------------------------------------------------------------------------------------------------------------
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--force-color-profile=srgb'] });
const manifest = [];
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
    frames.push({ png: out, ms: fr.ms || 0, o: fr.o ?? 1 });
  }
  await page.close();
  manifest.push({ name: j.name, kind: j.kind, colors: j.colors || 0, loop: !!j.loop, frames });
}
await b.close();
writeFileSync(join(TMP, 'manifest.json'), JSON.stringify({ out: OUT, red: RED, jobs: manifest }));

// ---- pack ---------------------------------------------------------------------------------------------------------------------
const PACK = String.raw`
import json, os, sys
import numpy as np
from PIL import Image
m = json.load(open(sys.argv[1]))
red = tuple(int(m['red'][i:i + 2], 16) for i in (1, 3, 5))
bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0

def ink(alpha):
    # one red ink on 1-bit transparency: crisp on any paper, light or inverted. Partial ink is an ordered dither.
    h, w = alpha.shape
    thr = np.tile(bayer, (h // 4 + 1, w // 4 + 1))[:h, :w]
    im = Image.fromarray(np.where(alpha > np.maximum(thr, 0.02), 1, 0).astype(np.uint8), 'P')
    im.putpalette([0, 0, 0] + list(red) + [0, 0, 0] * 254)
    im.info['transparency'] = 0
    return im

for j in m['jobs']:
    ims = [Image.open(f['png']).convert('RGBA') for f in j['frames']]
    ext = '.png' if j['kind'] == 'png' else '.gif'
    dst = os.path.join(m['out'], j['name'] + ext)
    if j['kind'] == 'png':
        ims[0].quantize(colors=j['colors'], method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)
    elif j['kind'] == 'stamp':
        landed = ink((np.asarray(ims[0])[..., 3] / 255.0 > 0.5).astype(float))
        H, W = np.asarray(ims[0]).shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        edge = np.clip(np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy]) / 46.0, 0, 1) ** 1.5
        frames, ms = [landed], [20]   # (a fully blank frame here trips PIL's GIF writer; frame 1 is already faint)
        for f, im in zip(j['frames'][1:], ims[1:]):
            a = np.asarray(im)[..., 3] / 255.0
            a = a * f['o'] * edge if f['o'] < 1 else (a > 0.5).astype(float)
            frames.append(ink(a)); ms.append(f['ms'])
        frames.append(landed); ms.append(3000)
        # no loop key: plays once and rests on the landed stamp
        frames[0].save(dst, save_all=True, append_images=frames[1:], duration=ms, transparency=0, disposal=2, optimize=False)
    elif j['kind'] == 'gift':
        # an animated GIF on 1-bit transparency: palette index 0 is transparent, the rest is a shared palette
        n = j['colors'] - 1
        w, h = ims[0].size
        sheet = Image.new('RGB', (w * len(ims), h))
        for i, im in enumerate(ims): sheet.paste(im.convert('RGB'), (i * w, 0))
        pal = sheet.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        colours = pal.getpalette()[:3 * n]
        fr = []
        for im in ims:
            q = np.asarray(im.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE)).astype(np.uint8) + 1
            q[np.asarray(im)[..., 3] < 128] = 0
            p = Image.fromarray(q, 'P')
            p.putpalette([0, 0, 0] + colours + [0, 0, 0] * (255 - n))
            fr.append(p)
        kw = dict(save_all=True, append_images=fr[1:], duration=[f['ms'] for f in j['frames']], transparency=0, disposal=2, optimize=False)
        if j['loop']: kw['loop'] = 0
        fr[0].save(dst, **kw)
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
    print('%-18s %4d x %-4d %6.1f KB' % (os.path.basename(dst), ims[0].size[0], ims[0].size[1], os.path.getsize(dst) / 1024))
`;
writeFileSync(join(TMP, 'pack.py'), PACK);
process.stdout.write(execFileSync('python3', ['-I', join(TMP, 'pack.py'), join(TMP, 'manifest.json')]).toString());
