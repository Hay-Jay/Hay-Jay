// node tools/live-crawl.mjs [--out dir] [--w 1440,390] — opens every storefront URL on the preview theme (lib/live.mjs) and reports
// Liquid errors, script errors, failed requests and sideways scrolling. Screenshots go to --out when given.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, previewContext, open, STORE } from './lib/live.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', ''), WIDTHS = arg('w', '1440,390').split(',').map(Number), ONLY = arg('only', '');
if (OUT) mkdirSync(OUT, { recursive: true });

const b = await launch();
const api = await b.newContext();
const json = async u => (await api.request.get(STORE + u)).json();
const products = (await json('/products.json?limit=250')).products.map(p => p.handle);
const collections = (await json('/collections.json?limit=250')).collections.map(c => c.handle);
const pages = ['about', 'lookbook', 'shipping', 'faq', 'contact', 'model', 'model-ambassador'];
const paths = [
  '/', '/collections', '/collections/all', ...['top', 'bottom', 'accessory', 'gift', 'print'].map(c => `/collections/all?c=${c}`),
  ...collections.filter(c => c !== 'all').map(c => `/collections/${c}`),
  ...products.map(h => `/products/${h}`),
  ...pages.map(h => `/pages/${h}`),
  '/cart', '/search?q=ring', '/search?q=zzzz', '/account/login', '/account/register',
  '/policies/shipping-policy', '/policies/refund-policy', '/policies/privacy-policy', '/policies/terms-of-service',
  '/nope-not-a-page', '/collections/all?view=catalog',
].filter(p => !ONLY || p.includes(ONLY));
await api.close();

const report = []; let noise = 0;
for (const w of WIDTHS) {
  const ctx = await previewContext(b, { w, h: w < 700 ? 844 : 900 });
  for (const path of paths) {
    let p;
    try {
      p = await open(ctx, path, { wait: 900 });
      // other people's scripts the store loads on every theme (apps, Shop Pay, analytics): counted, not listed
      const NOISE = /monorail|shopify_pay|preview-bar|web-pixels|teelaunch\.com|shop\.app|Failed to load resource|customer-authentication/i;
      const json = path.includes('view=catalog'), missing = path === '/nope-not-a-page';
      const over = json ? 0 : await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0);
      const errs = p.errs.filter(e => !(missing && /^http 404 .*nope-not-a-page/.test(e)));
      noise += errs.filter(e => NOISE.test(e)).length;
      const issues = [];
      if (!p.themeOk && !json && !path.startsWith('/account')) issues.push('not on preview theme');
      if (p.status >= 400 && !missing) issues.push('status ' + p.status);
      if (missing && p.status !== 404) issues.push('missing page answered ' + p.status);
      if (p.liquidErrors.length) issues.push(...new Set(p.liquidErrors.map(e => e.replace(/=""/g, '').replace(/\s+/g, ' ').slice(0, 160))));
      if (over > 1) issues.push(`scrolls sideways by ${over}px`);
      issues.push(...new Set(errs.filter(e => !NOISE.test(e)).map(e => e.slice(0, 220))));
      report.push({ w, path, issues });
      console.log(`${issues.length ? 'FAIL' : 'ok  '} ${w} ${path}${issues.length ? '\n     ' + issues.join('\n     ') : ''}`);
      if (OUT) await p.screenshot({ path: join(OUT, `${w}${path.replace(/[^\w]+/g, '_')}.png`), fullPage: true }).catch(() => {});
    } catch (e) { report.push({ w, path, issues: ['crawl error ' + e.message.split('\n')[0]] }); console.log(`FAIL ${w} ${path}\n     crawl error ${e.message.split('\n')[0]}`); }
    finally { await p?.close().catch(() => {}); }
  }
  await ctx.close();
}
await b.close();
const failing = report.filter(r => r.issues.length);
console.log(`-- ${report.length - failing.length}/${report.length} clean (${noise} third-party script messages set aside)`);
