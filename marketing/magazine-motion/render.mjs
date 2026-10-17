// node render.mjs [--frames 0,60,120-129] [--stilldir dir] [--fps 30] [--out film.mp4] [--variant preorder]
// Renders index.html frame by frame (render(t) sets the whole stage for second t) and pipes JPEG frames to ffmpeg.
// With --frames it only writes those frames as PNG stills (for checking), next to the film or in --stilldir.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = +arg('fps', 30), VARIANT = arg('variant', ''), STILLS = arg('frames', '');
const OUT = resolve(here, arg('out', `magazine-motion-9x16${VARIANT ? '-' + VARIANT : ''}-master.mp4`));
const STILLDIR = resolve(here, arg('stilldir', '.'));
const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.error('PAGE ERROR', e.message));
p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
await p.goto(pathToFileURL(join(here, 'index.html')).href + (VARIANT ? `?variant=${VARIANT}` : ''), { waitUntil: 'load' });
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); window.fitAll(); });
const DUR = await p.evaluate(() => window.DUR);
// warm-up: visit every scene once so every image is decoded and rasterised before the first real frame
for (const t of await p.evaluate(() => window.WARM)) { await p.evaluate(t => window.render(t), t); await p.screenshot({ type: 'jpeg', quality: 10 }); }

if (STILLS) {
  mkdirSync(STILLDIR, { recursive: true });
  const list = STILLS.split(',').flatMap(s => { const [a, z] = s.split('-').map(Number); return z >= a ? Array.from({ length: z - a + 1 }, (_, i) => a + i) : [a]; });
  for (const f of list) {
    await p.evaluate(t => window.render(t), f / FPS);
    writeFileSync(join(STILLDIR, `still-${VARIANT ? VARIANT + '-' : ''}${String(f).padStart(4, '0')}.png`), await p.screenshot({ type: 'png' }));
  }
  console.log('stills', list.length, '->', STILLDIR);
  await b.close(); process.exit(0);
}

const N = Math.round(DUR * FPS);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
  '-metadata', 'title=MONOCHROME Magazine — The Vision Issue', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < N; f++) {
  await p.evaluate(t => window.render(t), f / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(`frame ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await b.close();
console.log('wrote', OUT, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
