// Dev server: renders the theme on request with the emulator and a stateful fake cart API.
//   node tools/serve.mjs [--port 9292]
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Shop } from './engine.mjs';
import { parseArgs, DEFAULT_THEME_DIR, FIXTURES_DIR } from './lib/util.mjs';

const args = parseArgs(process.argv.slice(2));
const PORT = +(args.port || 9292);
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const PAGE_SUFFIX = { about: 'about', lookbook: 'lookbook', shipping: 'shipping', faq: 'faq', contact: 'contact', model: 'contact', 'model-ambassador': 'portfolio' };
const PAGE_TITLES = { about: 'Mission', lookbook: 'Evidence', shipping: 'Routes', faq: 'Debrief', contact: 'Contact', model: 'Model signup form', 'model-ambassador': 'MEET THE TEAM' };
const TEAM = '<p><em><strong>MANAGEMENT</strong></em></p><p>Deji - C.E.O</p><p>Ayodele - C.E.O.</p><p>Jide - CREATIVE DIRECTOR</p><p><em><strong>MODELS/AMBASSADOR</strong></em></p><p>Okonkwo Princess</p><p>Freida Moses</p>';

const shop = new Shop();
let queue = Promise.resolve();
const serial = fn => (queue = queue.then(fn, fn));

const body = req => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const parseBody = (buf, type) => {
  const s = buf.toString('utf8');
  if (/json/.test(type || '')) { try { return JSON.parse(s); } catch { return {}; } }
  const o = {}; for (const [k, v] of new URLSearchParams(s)) { if (k.endsWith('[]')) (o[k] ||= []).push(v); else o[k] = v; } return o;
};
const props = o => { const p = {}; for (const [k, v] of Object.entries(o)) { const m = /^properties\[(.+)\]$/.exec(k); if (m) p[m[1]] = v; } return p; };

function cartJson() { const c = shop.cartDrop(); return { token: 'fake', note: c.note, attributes: c.attributes, total_price: c.total_price, original_total_price: c.original_total_price, total_discount: 0, item_count: c.item_count, items: c.items.map(i => ({ id: i.id, key: i.key, quantity: i.quantity, title: i.title, product_title: i.product_title, variant_title: i.variant_title, price: i.price, line_price: i.line_price, final_line_price: i.final_line_price, properties: i.properties, url: i.url, image: null, handle: i.handle, product_id: i.product_id, variant_id: i.variant_id })), currency: 'CAD', requires_shipping: true }; }
function addToCart(variantId, qty, properties) {
  const v = [...shop.productDrops.values()].flatMap(p => p.variants).find(x => x.id === +variantId);
  if (!v) return { status: 422, body: { status: 422, message: 'Cannot find variant', description: 'Cannot find variant' } };
  if (!v.available) return { status: 422, body: { status: 422, message: 'Sold out', description: `All ${v.product.title} are sold out.` } };
  const key = JSON.stringify(properties || {});
  const hit = shop.cart.items.find(i => i.variant_id === v.id && JSON.stringify(i.properties || {}) === key);
  if (hit) hit.quantity += qty; else shop.cart.items.push({ handle: v.product.handle, variant_id: v.id, quantity: qty, properties });
  return { status: 200, body: { id: v.id, quantity: qty, title: v.product.title, properties: properties || {}, url: v.url } };
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);
  const query = Object.fromEntries(url.searchParams);
  const send = (code, type, data, headers = {}) => { res.writeHead(code, { 'Content-Type': type, ...headers }); res.end(data); };
  const json = (code, o) => send(code, 'application/json', JSON.stringify(o));

  // static
  let m;
  if ((m = /^\/cdn\/shop\/t\/1\/assets\/(.+)$/.exec(path))) { const f = join(DEFAULT_THEME_DIR, 'assets', m[1]); return existsSync(f) ? send(200, MIME[extname(f)] || 'application/octet-stream', readFileSync(f)) : send(404, 'text/plain', 'no asset'); }
  if ((m = /^\/photos\/([0-9a-f]{12})\.(jpg|png)$/.exec(path))) { for (const ext of ['jpg', 'png']) { const f = join(FIXTURES_DIR, 'photos', `${m[1]}.${ext}`); if (existsSync(f)) return send(200, MIME['.' + ext], readFileSync(f)); } return send(404, 'text/plain', 'no photo'); }

  // cart API
  if (path === '/cart.js') return json(200, cartJson());
  if (path === '/cart/add.js' && req.method === 'POST') { const b = parseBody(await body(req), req.headers['content-type']); const r = addToCart(b.id, +b.quantity || 1, props(b)); return json(r.status, r.body); }
  if ((path === '/cart/change.js' || path === '/cart/update.js') && req.method === 'POST') {
    const b = parseBody(await body(req), req.headers['content-type']);
    if (b.line !== undefined) { const i = +b.line - 1; if (shop.cart.items[i]) { if (+b.quantity <= 0) shop.cart.items.splice(i, 1); else shop.cart.items[i].quantity = +b.quantity; } }
    else if (b.id !== undefined) { const i = shop.cart.items.findIndex(x => x.variant_id === +b.id); if (i >= 0) { if (+b.quantity <= 0) shop.cart.items.splice(i, 1); else shop.cart.items[i].quantity = +b.quantity; } }
    return json(200, cartJson());
  }
  if (path === '/cart/clear.js') { shop.cart.items = []; return json(200, cartJson()); }
  if (path === '/cart/change' && req.method === 'GET') { const i = +query.line - 1; if (shop.cart.items[i]) { if (+query.quantity <= 0) shop.cart.items.splice(i, 1); else shop.cart.items[i].quantity = +query.quantity; } return send(302, 'text/plain', '', { Location: '/cart' }); }
  if (path === '/cart/add' && req.method === 'POST') { const b = parseBody(await body(req), req.headers['content-type']); addToCart(b.id, +b.quantity || 1, props(b)); return send(302, 'text/plain', '', { Location: '/cart' }); }
  if ((m = /^\/cart\/(\d+):(\d+)$/.exec(path))) { addToCart(m[1], +m[2], {}); return send(302, 'text/plain', '', { Location: '/cart' }); }
  if (path === '/cart' && req.method === 'POST') { const b = parseBody(await body(req), req.headers['content-type']); if ('checkout' in b) return send(200, 'text/html', '<h1>Shopify checkout (fake)</h1>'); if (b.updates) b.updates.forEach((q, i) => { if (shop.cart.items[i]) shop.cart.items[i].quantity = +q; }); shop.cart.items = shop.cart.items.filter(i => i.quantity > 0); return send(302, 'text/plain', '', { Location: '/cart' }); }
  if ((m = /^\/products\/([\w-]+)\.js$/.exec(path))) { const p = shop.productDrops.get(m[1]); return p ? json(200, { id: p.id, handle: p.handle, title: p.title, price: p.price, available: p.available, variants: p.variants.map(v => ({ id: v.id, title: v.title, price: v.price, available: v.available, options: v.options })) }) : json(404, { error: 'not found' }); }
  if (path === '/search/suggest.json') { const q = (query.q || '').toLowerCase(); return json(200, { resources: { results: { products: [...shop.productDrops.values()].filter(p => p.title.toLowerCase().includes(q)).map(p => ({ title: p.title, url: p.url, handle: p.handle, price: p.price })) } } }); }

  // pages
  let tpl = null, opts = { path, query };
  if (path === '/') tpl = 'index';
  else if ((m = /^\/collections\/([\w-]+)$/.exec(path))) { tpl = query.view ? 'collection.' + query.view : 'collection'; opts.collection = m[1]; }
  else if (path === '/collections') tpl = 'list-collections';
  else if ((m = /^\/products\/([\w-]+)$/.exec(path))) { const p = shop.productDrops.get(m[1]); if (p) { tpl = 'product' + (p.template_suffix ? '.' + p.template_suffix : ''); opts.product = m[1]; } }
  else if ((m = /^\/pages\/([\w-]+)$/.exec(path))) { const sfx = PAGE_SUFFIX[m[1]]; tpl = sfx ? 'page.' + sfx : 'page'; opts.page = { handle: m[1], title: PAGE_TITLES[m[1]] || m[1], content: m[1] === 'model-ambassador' ? TEAM : '', url: path, template_suffix: sfx || '' }; }
  else if (path === '/cart') tpl = 'cart';
  else if (path === '/search') { tpl = 'search'; const q = (query.q || '').toLowerCase(); const results = [...shop.productDrops.values()].filter(p => !q || p.title.toLowerCase().includes(q)); opts.search = { performed: !!query.q, terms: query.q || '', results, results_count: results.length, filters: [], sort_by: 'relevance', types: ['product'] }; }
  else if (path === '/password') tpl = 'password';
  else if (path.startsWith('/account')) tpl = 'customers/login';
  if (!tpl) { res.statusCode = 404; tpl = '404'; }
  shop.posted = req.method === 'POST' || !!query.customer_posted;
  let html;
  try {
    if (query.sections || query.section_id) {
      if (query.sections) {
        const out = {};
        for (const s of String(query.sections).split(',')) out[s] = await shop.renderSectionFile(s, s, null, {}, { global: true });
        return json(200, out);
      }
      const full = await shop.renderTemplate(tpl, opts);
      const mm = new RegExp(`<div id="shopify-section-${query.section_id}"[\\s\\S]*?(?=<div id="shopify-section-|<footer|</main>|$)`).exec(full);
      return send(200, 'text/html', mm ? mm[0].replace(/<\/div>\s*$/, '</div>') : '');
    }
    html = await shop.renderTemplate(tpl, opts);
  } catch (e) { console.error(e); return send(500, 'text/plain', String(e.stack || e)); }
  if (tpl === '404') return send(404, 'text/html', html);
  return send(200, 'text/html', html);
}

http.createServer((req, res) => { serial(() => route(req, res)).catch(e => { console.error(e); try { res.statusCode = 500; res.end(String(e)); } catch { /* closed */ } }); }).listen(PORT, () => {
  console.error(`theme dev server on http://localhost:${PORT}/  (warnings are printed on exit with Ctrl+C)`);
});
process.on('SIGINT', () => { console.error(shop.warnings.format()); process.exit(0); });
