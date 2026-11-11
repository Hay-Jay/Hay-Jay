// node tools/render.mjs --template product --handle monochrome-sweatshirt [--out file.html] [--strict] [--cart sample]
import { writeFileSync } from 'node:fs';
import { Shop } from './engine.mjs';
import { parseArgs } from './lib/util.mjs';

const a = parseArgs(process.argv.slice(2), { boolean: ['strict', 'quiet'] });
const shop = new Shop();
if (a.cart === 'sample') shop.cart = { items: [{ handle: 'monochrome-sweatshirt', variant_id: shop.productDrops.get('monochrome-sweatshirt').variants[1].id, quantity: 2 }, { handle: 'royal-black', variant_id: shop.productDrops.get('royal-black').variants[0].id, quantity: 1 }, { handle: 'custom-monochrome-jersey', variant_id: shop.productDrops.get('custom-monochrome-jersey').variants[0].id, quantity: 1, properties: { Name: 'KING', Number: '7' } }], note: '', attributes: {} };
const name = a.template || 'index';
const opts = { product: a.handle && /^product/.test(name) ? a.handle : undefined, collection: /^collection/.test(name) ? (a.handle || 'all') : undefined, query: a.q ? { q: a.q } : {}, path: a.path || '/' };
if (/^page/.test(name)) opts.page = { handle: a.handle || 'page', title: a.title || 'Page', content: a.content || '<p>Page body</p>', url: `/pages/${a.handle || 'page'}`, template_suffix: name.split('.')[1] || '' };
try {
  const html = await shop.renderTemplate(name, opts);
  if (a.out) writeFileSync(a.out, html); else if (!a.quiet) process.stdout.write(html);
  console.error(shop.warnings.format());
  process.exit(shop.warnings.exitCode(a.strict));
} catch (e) { console.error('RENDER FAILED:', e.message); console.error(shop.warnings.format()); process.exit(2); }
