// node preview.mjs  ->  previews/<email>-600.png, -375.png and -noimg.png (images blocked), from src/ with the local img/ folder
import { chromium } from '../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'previews'), { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const f of readdirSync(join(here, 'src')).filter(f => f.endsWith('.html'))) {
  // Liquid as Shopify would fill it for a subscriber called Ada
  const html = readFileSync(join(here, 'src', f), 'utf8').replaceAll('__IMG__', pathToFileURL(join(here, 'img')).href)
    .replace(/Agent\{% if customer\.first_name != blank %\} \{\{ customer\.first_name \}\}\{% endif %\},/g, 'Agent Ada,')
    .replaceAll('{{ unsubscribe_url }}', '#unsubscribe').replaceAll('{{ open_tracking }}', '');
  const tmp = join(here, 'previews', '_' + f); writeFileSync(tmp, html);
  for (const [w, tag, noimg] of [[640, '600', false], [375, '375', false], [640, 'noimg', true]]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    if (noimg) await p.route('**/*.{png,jpg,gif}', r => r.abort());
    await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await p.screenshot({ path: join(here, 'previews', f.replace('.html', `-${tag}.png`)), fullPage: true });
    await p.close();
  }
  console.log('previewed', f);
}
await b.close();
