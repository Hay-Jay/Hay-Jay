// node tools/e2e.mjs — end-to-end checks of the theme on the dev server (:9292): navigation, register, product buy flow, bag, popup, forms, no-JS.
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:' + (process.env.PORT || 9292);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = []; const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: opts.w || 1440, height: opts.h || 900 }, javaScriptEnabled: opts.js !== false, hasTouch: (opts.w || 1440) < 700, isMobile: (opts.w || 1440) < 700 });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); p.errs = [];
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400 && !r.url().includes('/nope')) p.errs.push(`http ${r.status()} ${r.url()}`); });
  return p;
}
const T = async (label, fn) => { try { await fn(); } catch (e) { ok(label + ' (threw)', false, String(e.message).split('\n')[0]); } };
await fetch(BASE + '/cart/clear.js');
// 1. every page loads without errors
const p0 = await page();
for (const u of ['/', '/collections/all', '/collections/all?c=print', '/collections/frontpage', '/products/monochrome-sweatshirt', '/products/white-monochrome-jersey', '/products/monochrome-gift-cards', '/products/custom-monochrome-jersey', '/products/monochrome-magazine-the-vision-issue-print', '/pages/lookbook', '/pages/about', '/pages/shipping', '/pages/faq', '/pages/contact', '/pages/model', '/pages/model-ambassador', '/cart', '/search?q=ring', '/collections', '/account/login']) {
  p0.errs = []; const r = await p0.goto(BASE + u); await p0.waitForTimeout(700);
  ok(`load ${u}`, r.status() === 200 && !p0.errs.length, p0.errs.join(' | '));
}
// 2. register: filter print, search, view toggle
await T('2. register: filter print, search, view toggle', async () => {
await p0.goto(BASE + '/collections/all?c=print'); await p0.waitForTimeout(600);
const vis = await p0.$$eval('#toc .trow', rs => rs.filter(r => r.offsetParent !== null).length);
ok('register ?c=print shows only print rows', vis === 1, `visible ${vis}`);
await p0.goto(BASE + '/collections/all'); await p0.fill('#q', 'ring'); await p0.waitForTimeout(400);
const rings = await p0.$$eval('#toc .trow', rs => rs.filter(r => r.offsetParent !== null).length);
ok('register search "ring"', rings >= 5, `visible ${rings}`);
});
// 3. product buy flow
let p1;
await T('3. product buy flow', async () => {
p1 = await page();
await p1.goto(BASE + '/products/monochrome-sweatshirt'); await p1.waitForTimeout(800);
const before = await p1.inputValue('#variantId');
await p1.click('.chip[data-v="L"]'); await p1.waitForTimeout(200);
const after = await p1.inputValue('#variantId');
ok('size chip changes the variant id', before !== after, `${before} -> ${after}`);
ok('URL carries ?variant', p1.url().includes('variant=' + after));
await p1.click('[data-pq="1"]'); await p1.click('#buy'); await p1.waitForSelector('#mcDrawer.open', { timeout: 5000 }).catch(() => {});
ok('add to bag opens the drawer', await p1.$('#mcDrawer.open') !== null);
const cnt = await p1.textContent('[data-cart-count]');
ok('header count shows 2', cnt.trim() === '2', cnt);
const lines = await p1.$$eval('#mcDrawer .ln', l => l.length);
ok('drawer lists 1 line', lines === 1, String(lines));
await p1.click('#mcDrawer [data-q="1"]'); await p1.waitForTimeout(800);
ok('drawer + raises quantity to 3', (await p1.inputValue('#mcDrawer [data-line-qty]')) === '3');
await p1.keyboard.press('Escape'); await p1.waitForTimeout(600);
ok('Esc closes the drawer', await p1.$('#mcDrawer.open') === null);
ok('product page: no console errors', !p1.errs.length, p1.errs.join(' | '));
});
// 4. sold out product: button disabled
await T('4. sold out product: button disabled', async () => {
await p1.goto(BASE + '/products/monochrome-compass-necklace'); await p1.waitForTimeout(500);
ok('sold-out product: buy disabled', await p1.$eval('#buy', b => b.disabled));
});
// 5. magazine from home section
let p2;
await T('5. magazine from home section', async () => {
p2 = await page();
await p2.goto(BASE + '/'); await p2.waitForTimeout(800);
// the intro covers the first visit for ~3 s: a click on it only skips it, it never reaches the page underneath
const introUp = await p2.$('.intro') !== null;
if (introUp) { const c0i = (await (await fetch(BASE + '/cart.js')).json()).item_count; await p2.mouse.click(720, 450); await p2.waitForTimeout(600);
  ok('a click on the intro skips it without following the link underneath', (await (await fetch(BASE + '/cart.js')).json()).item_count === c0i && new URL(p2.url()).pathname === '/'); }
await p2.waitForSelector('.intro', { state: 'detached', timeout: 5000 }).catch(() => {});
const c0 = (await (await fetch(BASE + '/cart.js')).json()).item_count;
await p2.hover('#vision [data-mc-add]'); await p2.waitForTimeout(500);
ok('hovering an add link does not change the bag', (await (await fetch(BASE + '/cart.js')).json()).item_count === c0);
await p2.click('#vision [data-mc-add]'); await p2.waitForSelector('#mcDrawer.open', { timeout: 5000 }).catch(() => {});
const magLine = await p2.$$eval('#mcDrawer .ln-t', l => l.map(x => x.textContent));
ok('home magazine button adds the magazine', magLine.some(t => /magazine/i.test(t)), magLine.join(','));
ok('the magazine is added once', (await (await fetch(BASE + '/cart.js')).json()).item_count === c0 + 1);
});
// 6. cart page: change and remove
await T('6. cart page: change and remove', async () => {
await p2.goto(BASE + '/cart'); await p2.waitForTimeout(600);
const n1 = await p2.$$eval('.cart-lines .ln', l => l.length);
await p2.hover('.cart-lines .ln [data-remove]'); await p2.waitForTimeout(500);
ok('hovering remove does not change the bag', (await p2.$$eval('.cart-lines .ln', l => l.length)) === n1 && (await (await fetch(BASE + '/cart.js')).json()).items.length === n1);
await p2.click('.cart-lines .ln [data-remove]'); await p2.waitForTimeout(1000);
const n2 = await p2.$$eval('.cart-lines .ln', l => l.length);
ok('cart page: remove a line', n2 === n1 - 1, `${n1} -> ${n2}`);
ok('cart page: no console errors', !p2.errs.length, p2.errs.join(' | '));
});
// 7. popup appears on the home page (fast-forward: delay 9s)
let p3;
await T('7. popup appears on the home page (fast-forward: delay 9s)', async () => {
p3 = await page();
await p3.goto(BASE + '/'); await p3.waitForSelector('#magpop.open', { timeout: 16000 }).catch(() => {});
ok('magazine pop-up opens on the home page', await p3.$('#magpop.open') !== null);
});
// 8. command palette + declassify
let p4;
await T('8. command palette + declassify', async () => {
await p3.keyboard.press('Escape'); await p3.waitForTimeout(300);
await p3.keyboard.press('/'); await p3.waitForTimeout(700); await p3.keyboard.type('hood'); await p3.waitForTimeout(900);
const hits = await p3.$$eval('#jumpList a', a => a.map(x => x.textContent));
ok('command palette finds the hoodie (live catalogue)', hits.some(t => /hoodie/i.test(t)), hits.slice(0, 3).join(' / '));
p4 = await page({ w: 390, h: 844 });
await p4.goto(BASE + '/pages/about'); await p4.waitForTimeout(500); await p4.click('#menuBtn'); await p4.waitForTimeout(700); await p4.click('#declassMenu'); await p4.waitForTimeout(300);
ok('phone: in-menu Declassify switch', await p4.evaluate(() => document.documentElement.classList.contains('declass')));
});
// 9. no-JS: product form posts and lands on the cart
let p5;
await T('9. no-JS: product form posts and lands on the cart', async () => {
await fetch(BASE + '/cart/clear.js');
p5 = await page({ js: false });
await p5.goto(BASE + '/products/royal-black'); await p5.click('#buy'); await p5.waitForLoadState('load');
ok('no-JS: add to bag lands on the cart with the item', p5.url().endsWith('/cart') && (await p5.$$('.cart-lines .ln')).length === 1, p5.url());
});
for (const [s, n, x] of results) console.log(s, n, x ? '— ' + x : '');
console.log(`${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
await b.close();
