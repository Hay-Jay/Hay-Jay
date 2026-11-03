// Step 2: render every frame of scenes.html in headless Chromium and pipe to ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

const dir = path.resolve(process.argv[2]);
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json')));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('page error:', e); process.exit(1); });
  const ch = tl.channel || 'ocean', ep = path.basename(dir);
  const epScenes = fs.existsSync(path.join(__dirname, 'accounts', ch, 'scenes', ep + '.js')) ? '&ep=' + ep : '';
  await page.goto('file://' + path.join(__dirname, 'scenes.html') + '?ch=' + ch + epScenes);
  await page.evaluate(tl => window.setup(tl), tl);
  const n = Math.ceil(tl.duration * tl.fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(tl.fps),
    '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium',
    '-crf', '16', path.join(dir, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < n; f++) {
    const b64 = await page.evaluate(t => window.frame(t), f / tl.fps);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 90 === 0) process.stdout.write(`\r  frame ${f}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(await page.evaluate(() => window.sfxEvents())));
  // a few stills for previewing / thumbnails
  for (const [name, t] of [['thumb', 1.6], ['mid', tl.duration * 0.55]]) {
    await page.evaluate(t => window.frame(t), t);
    await page.locator('canvas').screenshot({ path: path.join(dir, name + '.png') });
  }
  await browser.close();
  console.log(`\r  rendered ${n} frames`);
})();
