// node render.mjs [--out DIR] [--only 1,3]
// Renders stories.html?s=1..4 at 1080x1920 and writes the four Story PNGs (default: the folder above this one).
import { chromium } from '../../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = resolve(here, arg('out', '..'));
const ONLY = arg('only', '1,2,3,4').split(',').map(Number);
const NAMES = { 1: 'story-01-24-hours', 2: 'story-02-pre-order', 3: 'story-03-declassified', 4: 'story-04-cities' };
// the stamp's worn-ink mask, inlined: Chromium refuses mask images loaded from file://
const DISTRESS = 'data:image/png;base64,' + readFileSync(join(here, '../../countdown-xo/assets/distress.png')).toString('base64');

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--force-color-profile=srgb'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.error('PAGE ERROR', e.message));
p.on('requestfailed', r => console.error('MISSING', r.url()));
for (const s of ONLY) {
  await p.goto(pathToFileURL(join(here, 'stories.html')).href + `?s=${s}`, { waitUntil: 'load' });
  await p.evaluate(async d => {
    document.documentElement.style.setProperty('--distress', `url(${d})`);
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  }, DISTRESS);
  const file = join(OUT, NAMES[s] + '.png');
  await p.screenshot({ path: file, type: 'png' });
  console.log('wrote', file);
}
await b.close();
