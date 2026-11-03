// Renders every video in videos.js to a 1080x1920 30fps MP4 (TikTok / Reels / Shorts)
// plus one PNG per scene for Instagram carousels.
//   node render.mjs              -> all videos
//   node render.mjs why-obi      -> just one
// Needs: Node 18+, Playwright (with Chromium) and ffmpeg on PATH.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// createRequire also honours NODE_PATH / globally installed Playwright.
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const only = process.argv.slice(2);
mkdirSync(path.join(here, 'videos'), { recursive: true });
mkdirSync(path.join(here, 'stills'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'studio.html')).href + '?render=1');
await page.evaluate(() => window.__ready);
const ids = (await page.evaluate(() => VIDEOS.map(v => v.id))).filter(id => !only.length || only.includes(id));

for (const id of ids) {
  const duration = await page.evaluate(id => { window.__build(id); return window.__duration; }, id);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode?.().catch(() => {}))));
  const frames = Math.round(duration * FPS);
  const out = path.join(here, 'videos', `${id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.__seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) process.stdout.write(`\r${id}: ${i}/${frames}`);
  }
  ff.stdin.end();
  await done;
  console.log(`\r${id}: ${frames} frames -> videos/${id}.mp4`);

  const scenes = await page.evaluate(() => window.__scenes());
  for (const [n, s] of scenes.entries()) {
    await page.evaluate(t => window.__seek(t), s.start + s.dur - (n === scenes.length - 1 ? 0.05 : 0.35));
    await page.screenshot({ path: path.join(here, 'stills', `${id}-${String(n + 1).padStart(2, '0')}.png`) });
  }
}
await browser.close();
