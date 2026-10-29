// Render scene.html frame-by-frame to MP4 with headless Chromium + ffmpeg.
// node render.mjs [--mode main|intermission] [--scale 1|2] [--fps 30] [--workers 4] [--frames a,b,c --out dir]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');   // works with a global install too
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const mode = arg('mode', 'main'), scale = +arg('scale', 1), fps = +arg('fps', 30), workers = +arg('workers', 4);
const only = arg('frames', null);
const W = 1920 * scale, H = 1080 * scale;

const browser = await chromium.launch();
const url = `file://${here}/scene.html?capture=1&mode=${mode}`;
const pages = await Promise.all(Array.from({ length: workers }, async () => {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  await p.goto(url + `&scale=${scale}`); await p.evaluate(() => window.ready); return p;
}));
const L = await pages[0].evaluate(() => window.LOOP_SECONDS);
const n = Math.round(L * fps);
const shot = async (p, i) => { await p.evaluate(t => window.renderAt(t), i / fps); return p.screenshot({ type: 'png' }); };

if (only) {
  const out = arg('out', '.'); fs.mkdirSync(out, { recursive: true });
  for (const i of only.split(',').map(Number)) fs.writeFileSync(path.join(out, `${mode}-${i}.png`), await shot(pages[0], i));
  await browser.close(); process.exit(0);
}

fs.mkdirSync(path.join(here, 'output'), { recursive: true });
const outFile = path.join(here, 'output', `praise-night-${mode}-loop-${W}x${H}.mp4`);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(arg('crf', 18)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });

// render in parallel, write to ffmpeg in order
const buf = new Map(); let next = 0, issued = 0; const t0 = Date.now();
const flush = async () => { while (buf.has(next)) { const b = buf.get(next); buf.delete(next); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); next++; if (next % 90 === 0) console.log(`${mode}: ${next}/${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`); } };
await Promise.all(pages.map(async p => { while (issued < n) { const i = issued++; buf.set(i, await shot(p, i)); await flush(); } }));
await flush(); ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('wrote', outFile);
