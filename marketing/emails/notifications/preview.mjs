// node preview.mjs  ->  ../previews/<template>-600.png and -375.png, filled with a sample order (jersey + the free magazine)
import { Liquid } from '../../../shopify-theme/tools/node_modules/liquidjs/dist/liquid.node.mjs';
import { chromium } from '../../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), out = join(here, '..', 'previews');
mkdirSync(out, { recursive: true });
const img = f => pathToFileURL(join(here, '..', '..', 'social', 'src', 'img', f)).href;
const money = c => '$' + (c / 100).toFixed(2);
const liquid = new Liquid();
liquid.registerFilter('money', money);
liquid.registerFilter('money_with_currency', c => money(c) + ' CAD');
liquid.registerFilter('img_url', l => l.image);
const free = { title: 'Free magazine with a jersey or hoodie', target_selection: 'entitled', target_type: 'line_item' };
const lines = [
  { product_id: 1, product: { title: 'MONOCHROME Jersey (Black)' }, variant: { title: 'L' }, quantity: 1, image: img('black-jersey.jpg'),
    properties: {}, discount_allocations: [], original_line_price: 6500, final_line_price: 6500 },
  { product_id: 15418664059134, product: { title: 'MONOCHROME Magazine — The Vision Issue (Print)' }, variant: { title: 'Default Title' }, quantity: 1,
    image: pathToFileURL(join(here, '..', 'img', 'e1-evidence.jpg')).href, properties: { _bundle: 'x' },
    discount_allocations: [{ amount: 1000, discount_application: free }], original_line_price: 1000, final_line_price: 0 },
];
const address = { name: 'Ada Okafor', address1: '12 Admiralty Way', address2: '', city: 'Lekki', province_code: 'LA', zip: '106104', country: 'Nigeria' };
const data = {
  order_name: '#106901', order_status_url: '#status', requires_shipping: true,
  shop: { url: 'https://monochrome.com.ng', name: 'MONOCHROME', email: 'hello@monochrome.com.ng' },
  customer: { first_name: 'Ada' }, line_items: lines, subtotal_line_items: lines,
  subtotal_price: 6500, shipping_price: 1500, tax_price: 0, total_price: 8000,
  discount_applications: [free], shipping_address: address, billing_address: address, shipping_method: { title: 'International Standard' },
};
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const f of readdirSync(here).filter(f => f.endsWith('.liquid'))) {
  const tmp = join(out, '_' + f.replace('.liquid', '.html'));
  writeFileSync(tmp, await liquid.parseAndRender(readFileSync(join(here, f), 'utf8'), data));
  for (const w of [600, 375]) {
    const p = await b.newPage({ viewport: { width: w === 600 ? 640 : 375, height: 900 } });
    await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await p.screenshot({ path: join(out, f.replace('.liquid', `-${w}.png`)), fullPage: true });
    await p.close();
  }
  console.log('previewed', f, (readFileSync(tmp).length / 1024).toFixed(1) + ' KB');
}
await b.close();
