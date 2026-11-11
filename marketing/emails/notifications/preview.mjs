// node preview.mjs [file.liquid ...] [--noimg]  ->  ../previews/<name>-<order>-600.png and -375.png
// Renders each Shopify notification template (default: every .liquid here) with three sample orders:
//   full     a jersey plus the free magazine (the bundle offer), shipped to Lagos
//   minimal  no first name, one hoodie, local pickup (no shipping address), GST
//   big      four lines (one ×2, one with visible properties), VISION10 off the order, free shipping, a long address
// __NIMG__/ in a template points at notifications/img/ (swapped for the Shopify CDN URLs when it's built for upload).
import { Liquid } from '../../../shopify-theme/tools/node_modules/liquidjs/dist/liquid.node.mjs';
import { chromium } from '../../../shopify-theme/tools/node_modules/playwright-core/index.mjs';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), out = join(here, '..', 'previews');
mkdirSync(out, { recursive: true });
const args = process.argv.slice(2), noimg = args.includes('--noimg');
const files = args.filter(a => !a.startsWith('--')).map(f => resolve(f));
if (!files.length) files.push(...readdirSync(here).filter(f => f.endsWith('.liquid')).map(f => join(here, f)));
const local = (...p) => pathToFileURL(join(here, '..', ...p)).href;
const money = c => '$' + (Number(c) / 100).toFixed(2);
const liquid = new Liquid();
liquid.registerFilter('money', money);
liquid.registerFilter('money_with_currency', c => money(c) + ' CAD');
liquid.registerFilter('money_without_currency', c => (Number(c) / 100).toFixed(2));
liquid.registerFilter('img_url', l => (l && l.image) || '');
liquid.registerFilter('image_url', l => (l && l.image) || '');

const MAG = 15418664059134;
const jersey = { product_id: 1, title: 'MONOCHROME Jersey (Black) - L', product: { title: 'MONOCHROME Jersey (Black)' }, variant: { title: 'L' }, sku: 'MC-JRS-BLK-L',
  quantity: 1, image: local('..', 'social', 'src', 'img', 'black-jersey.jpg'), properties: {}, discount_allocations: [], original_line_price: 6500, final_line_price: 6500, price: 6500 };
const hoodie = { product_id: 2, title: 'MONOCHROME Hoodie - M', product: { title: 'MONOCHROME Hoodie' }, variant: { title: 'M' }, sku: 'MC-HD-M',
  quantity: 1, image: local('..', 'social', 'src', 'img', 'hoodie.jpg'), properties: {}, discount_allocations: [], original_line_price: 8000, final_line_price: 8000, price: 8000 };
const mag = (extra = {}) => ({ product_id: MAG, title: 'MONOCHROME Magazine — The Vision Issue (Print)', product: { title: 'MONOCHROME Magazine — The Vision Issue (Print)' },
  variant: { title: 'Default Title' }, sku: 'MC-MAG-001', quantity: 1, image: local('img', 'e1-evidence.jpg'), properties: { _bundle: 'x' },
  discount_allocations: [], original_line_price: 1000, final_line_price: 1000, price: 1000, ...extra });
const lagos = { name: 'Ada Okafor', first_name: 'Ada', last_name: 'Okafor', address1: '12 Admiralty Way', address2: '', city: 'Lekki', province: 'Lagos', province_code: 'LA', zip: '106104', country: 'Nigeria', country_code: 'NG', phone: '+234 800 000 0000' };
const shop = { url: 'https://monochrome.com.ng', name: 'MONOCHROME', email: 'hello@monochrome.com.ng', email_logo_url: '', permanent_domain: 'monochrome-ca.myshopify.com' };
const base = { shop, shop_name: 'MONOCHROME', order_status_url: '#status', email: 'ada@example.com', created_at: '2026-10-21T14:32:00-06:00', gateway: 'Shopify Payments', tax_lines: [], transactions: [] };

const bundle = { title: 'Free magazine with a jersey or hoodie', target_selection: 'entitled', target_type: 'line_item', type: 'automatic' };
const fullLines = [jersey, mag({ discount_allocations: [{ amount: 1000, discount_application: bundle }], final_line_price: 0 })];
const vision = { title: 'VISION10', target_selection: 'all', target_type: 'line_item', type: 'discount_code', total_allocated_amount: 2750 };
const freeship = { title: 'Free shipping', target_selection: 'all', target_type: 'shipping_line', type: 'automatic', total_allocated_amount: 1500 };
const bigLines = [
  { ...hoodie, quantity: 2, title: 'MONOCHROME Hoodie - XL', variant: { title: 'XL' }, original_line_price: 16000, final_line_price: 14400, discount_allocations: [{ amount: 1600, discount_application: vision }] },
  { ...jersey, product: { title: 'MONOCHROME Jersey (Black) — Limited Field Edition, Numbered' }, properties: { 'Name on back': 'OKAFOR', Number: '77', _hidden: 'x' },
    original_line_price: 6500, final_line_price: 5850, discount_allocations: [{ amount: 650, discount_application: vision }] },
  mag({ original_line_price: 1000, final_line_price: 900, discount_allocations: [{ amount: 100, discount_application: vision }] }),
  { ...jersey, product_id: 3, title: 'Sticker pack', product: { title: 'Sticker pack' }, variant: { title: 'Default Title' }, image: null, original_line_price: 400, final_line_price: 400, price: 400 },
];
const ORDERS = {
  full: { ...base, order_name: '#106901', name: '#106901', order_number: 106901, customer: { first_name: 'Ada', last_name: 'Okafor', name: 'Ada Okafor' },
    line_items: fullLines, subtotal_line_items: fullLines, requires_shipping: true, subtotal_price: 6500, shipping_price: 1500, tax_price: 0, total_price: 8000,
    total_discounts: 1000, discount_applications: [bundle], shipping_address: lagos, billing_address: lagos, shipping_method: { title: 'International Standard', price: 1500 } },
  minimal: { ...base, order_name: '#106902', name: '#106902', order_number: 106902, email: 'buyer@example.com', customer: { first_name: '', last_name: '', name: '' },
    line_items: [hoodie], subtotal_line_items: [hoodie], requires_shipping: true, subtotal_price: 8000, shipping_price: 0, tax_price: 400, total_price: 8400,
    total_discounts: 0, discount_applications: [], shipping_address: null, billing_address: { ...lagos, name: '', first_name: '', city: 'Regina', province_code: 'SK', country: 'Canada' },
    shipping_method: { title: 'Local pickup — Regina', price: 0 }, tax_lines: [{ title: 'GST', price: 400, rate: 0.05 }] },
  big: { ...base, order_name: '#106903', name: '#106903', order_number: 106903, customer: { first_name: 'Oluwatobiloba', last_name: 'Adeyemi-Williams', name: 'Oluwatobiloba Adeyemi-Williams' },
    line_items: bigLines, subtotal_line_items: bigLines, requires_shipping: true, subtotal_price: 21550, shipping_price: 0, tax_price: 0, total_price: 21550, total_discounts: 4250,
    discount_applications: [vision, freeship],
    shipping_address: { ...lagos, name: 'Oluwatobiloba Adeyemi-Williams', address1: 'Flat 4B, Block 17, Ikota Villa Estate', address2: 'Off Lekki–Epe Expressway, beside the filling station', city: 'Lekki' },
    billing_address: { ...lagos, name: 'Oluwatobiloba Adeyemi-Williams' }, shipping_method: { title: 'International Express (DHL)', price: 0 } },
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const f of files) {
  const name = basename(f, '.liquid'), src = readFileSync(f, 'utf8').replaceAll('__NIMG__/', pathToFileURL(join(here, 'img')).href + '/');
  for (const [key, data] of Object.entries(ORDERS)) {
    const tmp = join(out, `_${name}-${key}.html`), html = await liquid.parseAndRender(src, data);
    writeFileSync(tmp, html);
    for (const w of [600, 375]) {
      const p = await b.newPage({ viewport: { width: w === 600 ? 640 : 375, height: 900 } });
      if (noimg) await p.route(/\.(png|jpe?g|gif|webp)(\?|$)/, r => r.abort());
      await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      await p.screenshot({ path: join(out, `${name}-${key}${noimg ? '-noimg' : ''}-${w}.png`), fullPage: true });
      await p.close();
      if (w === 375 && sw > 375) console.log(`  WARNING ${name}/${key}: ${sw}px wide at 375 (horizontal scroll on phones)`);
    }
    console.log(`previewed ${name}/${key}  ${(html.length / 1024).toFixed(1)} KB`);
  }
}
await b.close();
