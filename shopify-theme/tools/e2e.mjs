// node tools/e2e.mjs — end-to-end checks of the theme on the dev server (:9292): navigation, the photo-grid shop, card quick add (hover and
// the phone sheet), product buy flow and sticky bar, bag and its free-magazine nudge, home photo stack, corner card, menu search, no-JS, no sideways scroll, the home intro.
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:' + (process.env.PORT || 9292);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = []; const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: opts.w || 1440, height: opts.h || 900 }, javaScriptEnabled: opts.js !== false, hasTouch: (opts.w || 1440) < 700, isMobile: (opts.w || 1440) < 700 });
  if (!opts.intro) await ctx.addInitScript(() => { try { sessionStorage.setItem('mcl-seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); p.errs = [];
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400 && !r.url().includes('/nope')) p.errs.push(`http ${r.status()} ${r.url()}`); });
  return p;
}
const T = async (label, fn) => { try { await fn(); } catch (e) { ok(label + ' (threw)', false, String(e.message).split('\n')[0]); } };
const cart = async () => (await fetch(BASE + '/cart.js')).json();
const addApi = async (handle, k = 0) => { const pr = await (await fetch(`${BASE}/products/${handle}.js`)).json(); const v = pr.variants.filter(x => x.available)[k]; await fetch(BASE + '/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, quantity: 1 }) }); return v; };
// cards of the shop grid that are on screen (not filtered out)
const shownCards = p => p.$$eval('#grid .card', cs => cs.filter(c => c.offsetParent !== null).map(c => c.dataset.cat));
const gridCols = p => p.$eval('#grid', g => getComputedStyle(g).gridTemplateColumns.split(' ').length);
await fetch(BASE + '/cart/clear.js');
// 1. every page loads without errors
const p0 = await page();
for (const u of ['/', '/collections/all', '/collections/all?c=print', '/collections/all?v=list', '/collections/frontpage', '/collections/new-arrivals', '/products/monochrome-sweatshirt', '/products/white-monochrome-jersey', '/products/monochrome-gift-cards', '/products/custom-monochrome-jersey', '/products/monochrome-magazine-the-vision-issue-print', '/pages/lookbook', '/pages/about', '/pages/shipping', '/pages/faq', '/pages/contact', '/pages/model', '/pages/model-ambassador', '/pages/vision-issue', '/cart', '/search?q=ring', '/collections', '/account/login']) {
  p0.errs = []; const r = await p0.goto(BASE + u); await p0.waitForTimeout(700);
  ok(`load ${u}`, r.status() === 200 && !p0.errs.length, p0.errs.join(' | '));
}
// 2. shop: a photo grid first; filter (?c= and the tabs), search, list view
await T('2. shop: photo grid, filter, search, view toggle', async () => {
await p0.goto(BASE + '/collections/all?c=print'); await p0.waitForTimeout(600);
const vis = await shownCards(p0);
ok('shop ?c=print shows only the print card', vis.length === 1 && vis[0] === 'print', `visible ${vis.join(',')}`);
await p0.goto(BASE + '/collections/all'); await p0.waitForTimeout(500);
const g = await p0.evaluate(() => { const c = document.querySelector('#grid .card'), im = c && c.querySelector('.card-ph img'); return { cards: document.querySelectorAll('#grid .card').length, grid: getComputedStyle(document.querySelector('#grid')).display, toc: getComputedStyle(document.querySelector('#toc')).display, top: im ? im.getBoundingClientRect().top : 1e9, imgs: [...document.querySelectorAll('#grid .card-ph img:not(.ph2)')].every(i => i.srcset && i.sizes && i.width && i.height) }; });
ok('shop: every product is a photo card, the name list is hidden', g.cards === 24 && g.grid === 'grid' && g.toc === 'none', JSON.stringify(g));
ok('shop: the first photo starts in the first screen (1440)', g.top < 900, String(Math.round(g.top)));
ok('shop: card photos have srcset, sizes, width and height', g.imgs);
ok('shop: 4 columns at 1440', (await gridCols(p0)) === 4, String(await gridCols(p0)));
await p0.fill('#q', 'ring'); await p0.waitForTimeout(400);
const rings = await shownCards(p0);
ok('shop search "ring"', rings.length >= 5 && rings.every(c => c === 'accessory'), `visible ${rings.length}`);
await p0.fill('#q', ''); await p0.waitForTimeout(300);
await p0.click('.sh-chip[data-filter="top"]'); await p0.waitForTimeout(400);
const tops = await shownCards(p0);
ok('shop: the Tops tab shows only tops and puts ?c=top in the URL', tops.length > 0 && tops.every(c => c === 'top') && p0.url().includes('c=top'), `${tops.length} ${p0.url()}`);
ok('shop: the Tops tab is pressed', await p0.$eval('.sh-chip[data-filter="top"]', e => e.getAttribute('aria-pressed')) === 'true');
await p0.click('.sh-view[data-view="list"]'); await p0.waitForTimeout(400);
ok('shop: list view swaps the grid for the name list (?v=list)', await p0.evaluate(() => getComputedStyle(document.querySelector('#grid')).display === 'none' && getComputedStyle(document.querySelector('#toc')).display !== 'none') && p0.url().includes('v=list'), p0.url());
await p0.goto(BASE + '/collections/new-arrivals'); await p0.waitForTimeout(500);
const na = await p0.evaluate(() => ({ tools: !!document.querySelector('#tools'), mine: document.querySelectorAll('#grid .card').length, more: document.querySelectorAll('.sh-more .card').length }));
ok('small collection (New in): no toolbar, its pieces, then more on file', !na.tools && na.mine === 2 && na.more >= 4, JSON.stringify(na));
const pp = await page({ w: 390, h: 844 });
await pp.goto(BASE + '/collections/all'); await pp.waitForTimeout(600);
const top390 = await pp.$eval('#grid .card .card-ph img', i => i.getBoundingClientRect().top);
ok('phone: 2 photo columns, the first photo in the first screen', (await gridCols(pp)) === 2 && top390 < 844, `${await gridCols(pp)} cols, top ${Math.round(top390)}`);
await pp.context().close();
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
ok('home: no intro screen in the way', await p2.$('.intro') === null);
const c0 = (await cart()).item_count;
await p2.hover('#vision [data-mc-add]'); await p2.waitForTimeout(500);
ok('hovering an add link does not change the bag', (await cart()).item_count === c0);
await p2.click('#vision [data-mc-add]'); await p2.waitForSelector('#mcDrawer.open', { timeout: 5000 }).catch(() => {});
const magLine = await p2.$$eval('#mcDrawer .ln-t', l => l.map(x => x.textContent));
ok('home magazine button adds the magazine', magLine.some(t => /magazine/i.test(t)), magLine.join(','));
ok('the magazine is added once', (await cart()).item_count === c0 + 1);
});
// 6. cart page: change and remove
await T('6. cart page: change and remove', async () => {
await p2.goto(BASE + '/cart'); await p2.waitForTimeout(600);
// + on the cart page re-renders the page (Shopify section ids are template--<id>__main, never just 'main')
const q0 = +(await p2.inputValue('.cart-lines .ln [data-line-qty]'));
await p2.click('.cart-lines .ln [data-q="1"]'); await p2.waitForTimeout(1200);
ok('cart page: + updates the page', +(await p2.inputValue('.cart-lines .ln [data-line-qty]')) === q0 + 1 && !(await p2.$('.cart-lines .ln.is-busy')), `${q0} -> ${await p2.inputValue('.cart-lines .ln [data-line-qty]')}`);
ok('cart page: focus stays on the + button', await p2.evaluate(() => !!document.activeElement && document.activeElement.matches('[data-q="1"]')));
await p2.fill('.cart-lines .ln [data-line-qty]', '1'); await p2.press('.cart-lines .ln [data-line-qty]', 'Enter'); await p2.waitForTimeout(1200);
ok('cart page: Enter in a quantity box updates, never checks out', new URL(p2.url()).pathname === '/cart' && (await p2.inputValue('.cart-lines .ln [data-line-qty]')) === '1', p2.url());
const n1 = await p2.$$eval('.cart-lines .ln', l => l.length);
await p2.hover('.cart-lines .ln [data-remove]'); await p2.waitForTimeout(500);
ok('hovering remove does not change the bag', (await p2.$$eval('.cart-lines .ln', l => l.length)) === n1 && (await cart()).items.length === n1);
await p2.click('.cart-lines .ln [data-remove]'); await p2.waitForTimeout(1000);
const n2 = await p2.$$eval('.cart-lines .ln', l => l.length);
ok('cart page: remove a line', n2 === n1 - 1, `${n1} -> ${n2}`);
ok('cart page: no console errors', !p2.errs.length, p2.errs.join(' | '));
await fetch(BASE + '/cart/clear.js'); await p2.goto(BASE + '/cart'); await p2.waitForTimeout(500);
const cols = await p2.$eval('.cart-picks .sheet', e => getComputedStyle(e).gridTemplateColumns.split(' ').length).catch(() => 0);
ok('empty bag: suggestions sit in a 4-column grid', cols === 4, String(cols));
});
// 7. the magazine corner card: never on the home page; on a browsing page it opens by itself (delay 8 s), once per visitor;
//    on phones it is a slim bottom bar and never shows on the shop page
let p3;
await T('7. corner card: not on home, opens on the shop page', async () => {
await fetch(BASE + '/cart/clear.js');
p3 = await page();
await p3.goto(BASE + '/'); await p3.waitForTimeout(500);
ok('corner card: none on the home page', await p3.$('#magpop') === null);
await p3.goto(BASE + '/collections/all'); await p3.waitForSelector('#magpop.open', { timeout: 12000 }).catch(() => {});
ok('corner card opens on the shop page within 12 s', await p3.$('#magpop.open') !== null);
ok('corner card: the page stays usable (no backdrop, no scroll lock)', await p3.evaluate(() => !document.documentElement.style.overflow && document.querySelector('#magpop').getAttribute('aria-modal') === 'false'));
await p3.click('#magpop [data-close]'); await p3.waitForTimeout(700);
ok('corner card: Close hides it and it is remembered', await p3.evaluate(() => document.querySelector('#magpop').hidden && Object.keys(localStorage).some(k => k.startsWith('mc-magpop-'))));
await p3.goto(BASE + '/products/monochrome-sweatshirt'); await p3.waitForTimeout(300);
ok('corner card: not on product pages', await p3.$('#magpop') === null);
// phones: a slim bar along the bottom, and never on the shop (or lookbook) pages, where it would cover the photos
const pm = await page({ w: 390, h: 844 });
await pm.goto(BASE + '/collections/all'); await pm.evaluate(() => scrollTo(0, innerHeight * 1.5)); await pm.waitForTimeout(9500);
ok('phone corner card: never on the shop page', await pm.evaluate(() => !document.querySelector('#magpop.open')));
await pm.goto(BASE + '/pages/about'); await pm.evaluate(() => scrollTo(0, innerHeight * 1.5));
await pm.waitForSelector('#magpop.open', { timeout: 12000 }).catch(() => {}); await pm.waitForTimeout(700);
const bar = await pm.evaluate(() => { const m = document.querySelector('#magpop.open'); if (!m) return null; const r = m.querySelector('.mp-card').getBoundingClientRect(), a = m.querySelector('.mp-add'); return { h: Math.round(r.height), bottom: Math.round(r.bottom), vh: innerHeight, w: Math.round(r.width), form: !!a.form && /\/cart\/add$/.test(new URL(a.form.action).pathname) }; });
ok('phone corner card: a slim bar along the bottom (about page); Add is a /cart/add form', !!bar && bar.h <= 64 && bar.bottom === bar.vh && bar.w === 390 && bar.form, JSON.stringify(bar));
await pm.context().close();
});
// 8. command palette + declassify; the menu search
let p4;
await T('8. command palette + declassify', async () => {
await p3.goto(BASE + '/pages/about'); await p3.waitForTimeout(500);
await p3.keyboard.press('/'); await p3.waitForTimeout(700); await p3.keyboard.type('hood'); await p3.waitForTimeout(900);
const hits = await p3.$$eval('#jumpList a', a => a.map(x => x.textContent));
ok('command palette finds the hoodie (live catalogue)', hits.some(t => /hoodie/i.test(t)), hits.slice(0, 3).join(' / '));
await p3.keyboard.press('Escape'); await p3.waitForTimeout(200); await p3.keyboard.press('Escape'); await p3.waitForTimeout(700);
await p3.click('#findBtn'); await p3.waitForSelector('#menu.open', { timeout: 3000 }).catch(() => {});
ok('menu search: Search opens the menu with the cursor in the search box', await p3.evaluate(() => document.querySelector('#menu').classList.contains('open') && document.activeElement && document.activeElement.id === 'jump' && document.querySelector('#findBtn').getAttribute('aria-expanded') === 'true'));
await p3.keyboard.type('cargo skirt'); await p3.waitForTimeout(900);
ok('menu search: results are a listbox with an active option', await p3.evaluate(() => { const j = document.querySelector('#jump'); return j.getAttribute('aria-expanded') === 'true' && !!document.getElementById(j.getAttribute('aria-activedescendant')); }));
// Enter searches (the first row is "See all results"); a result opens only once the arrow keys have moved onto it
await Promise.all([p3.waitForURL('**/search?**', { timeout: 5000 }).catch(() => {}), p3.keyboard.press('Enter')]);
ok('menu search: Enter shows all results (the search page)', new URL(p3.url()).pathname === '/search' && new URL(p3.url()).searchParams.get('q') === 'cargo skirt', p3.url());
await p3.click('#findBtn'); await p3.waitForSelector('#menu.open', { timeout: 3000 }).catch(() => {});
await p3.keyboard.type('cargo skirt'); await p3.waitForTimeout(900); await p3.keyboard.press('ArrowDown');
await Promise.all([p3.waitForURL('**/products/**', { timeout: 5000 }).catch(() => {}), p3.keyboard.press('Enter')]);
ok('menu search: ArrowDown then Enter opens the highlighted product', new URL(p3.url()).pathname === '/products/monochrome-cargo-skirt', p3.url());
p4 = await page({ w: 390, h: 844 });
await p4.goto(BASE + '/pages/about'); await p4.waitForTimeout(500); await p4.click('#menuBtn'); await p4.waitForTimeout(700); await p4.click('#declassMenu'); await p4.waitForTimeout(300);
ok('phone: in-menu Declassify switch', await p4.evaluate(() => document.documentElement.classList.contains('declass')));
});
// 9. no-JS: product form posts and lands on the cart; the shop grid and a card quick add work too
let p5;
// the pages above are done: close them so the dev server (one request at a time) only serves this one
for (const x of [p1, p2, p3, p4]) if (x) await x.context().close().catch(() => {});
await T('9. no-JS: product form posts and lands on the cart', async () => {
await fetch(BASE + '/cart/clear.js');
// the dev server answers one request at a time: let it finish the photos the closed pages still asked for before timing a form post
for (let i = 0; i < 60; i++) { const t = Date.now(); await fetch(BASE + '/cart.js'); if (Date.now() - t < 300) break; }
p5 = await page({ js: false }); p5.setDefaultTimeout(15000); // form posts are full page loads
await p5.goto(BASE + '/products/royal-black');
// late in a full run the one-at-a-time dev server can keep this page busy for a while: allow 30 s (it takes about 0.3 s on its own)
await Promise.all([p5.waitForURL('**/cart', { timeout: 30000 }), p5.click('#buy', { noWaitAfter: true, timeout: 30000 })]); await p5.waitForLoadState('load');
ok('no-JS: add to bag lands on the cart with the item', p5.url().endsWith('/cart') && (await p5.$$('.cart-lines .ln')).length === 1, p5.url());
await p5.goto(BASE + '/collections/all');
const nj = await p5.evaluate(() => ({ cards: [...document.querySelectorAll('#grid .card')].filter(c => c.offsetParent !== null).length, photos: [...document.querySelectorAll('#grid .card-ph img:not(.ph2)')].filter(i => i.offsetParent !== null).length }));
ok('no-JS: the shop shows all 24 photo cards', nj.cards === 24 && nj.photos === 24, JSON.stringify(nj));
await p5.hover('#grid .card[data-h="monochrome-sweatshirt"] .card-ph');
await Promise.all([p5.waitForURL('**/cart').catch(() => {}), p5.click('#grid .card[data-h="monochrome-sweatshirt"] .qa-b:text-is("M")')]);
ok('no-JS: a size in a card posts to the bag', new URL(p5.url()).pathname === '/cart' && (await cart()).items.some(i => /sweatshirt/i.test(i.title) && /M$/.test(i.title)), p5.url());
await p5.goto(BASE + '/');
ok('no-JS home: the top print of the stack is a link, the flip controls stay hidden', await p5.evaluate(() => { const a = document.querySelector('.hs-card[data-pos="0"] .hs-a'); return !!a && a.offsetParent !== null && document.querySelector('[data-hs-ctl]').hidden; }));
});
// 10. card quick add on desktop: the sizes slide up on hover (or keyboard focus) and one click adds that size
await T('10. card quick add: hover (desktop)', async () => {
await fetch(BASE + '/cart/clear.js');
const p = await page();
await p.goto(BASE + '/collections/all'); await p.waitForTimeout(700);
const card = '#grid .card[data-h="monochrome-sweatshirt"]';
const vis = () => p.$eval(card + ' .qa-p', e => getComputedStyle(e).visibility);
const v0 = await vis();
const h0 = await p.$eval(card, c => !c.querySelector('img.ph2') && !!c.querySelector('template.ph2-t'));
await p.hover(card + ' .card-ph'); await p.waitForTimeout(450);
ok('hover photo: loaded only on the first hover', h0 && await p.$eval(card, c => !!c.querySelector('img.ph2') && !c.querySelector('template.ph2-t')));
ok('quick add: the sizes are hidden until the card is hovered', v0 === 'hidden' && (await vis()) === 'visible', `${v0} -> ${await vis()}`);
await p.click(card + ' .qa-b:text-is("L")'); await p.waitForSelector('#mcDrawer.open', { timeout: 5000 }).catch(() => {});
const c1 = await cart();
ok('quick add: a size click adds that size and opens the bag', await p.$('#mcDrawer.open') !== null && c1.items.length === 1 && / - L$/.test(c1.items[0].title), c1.items.map(i => i.title).join(','));
ok('quick add: the card is stamped "In bag"', await p.$(card + ' .card-added') !== null);
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
const one = '#grid .card[data-h="black-trinity-ring"]';
await p.hover(one + ' .card-ph'); await p.waitForTimeout(450);
await p.click(one + ' .qa-one .qa-b'); await p.waitForSelector('#mcDrawer.open', { timeout: 5000 }).catch(() => {});
ok('quick add: a one-size piece adds with one click', (await cart()).items.some(i => /trinity ring/i.test(i.title)) && (await p.textContent('[data-cart-count]')).trim() === '2');
await p.keyboard.press('Escape'); await p.waitForTimeout(600); await p.mouse.move(2, 2);
// keyboard: two Tab stops per card (the link, then "+"); "+" opens the sizes as a sheet, so they are not one Tab stop each
const kc = '#grid .card[data-h="monochrome-cargo-skirt"]';
await p.$eval(kc, e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
await p.focus(kc + ' .card-a'); await p.waitForFunction(s => +getComputedStyle(document.querySelector(s + ' .qa-go')).opacity > 0.9, kc, { timeout: 3000 }).catch(() => {});
const kv = await p.$eval(kc, c => ({ go: +getComputedStyle(c.querySelector('.qa-go')).opacity, strip: getComputedStyle(c.querySelector('.qa-p')).visibility }));
await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(500); await p.keyboard.press('Tab');
ok('quick add: keyboard focus on a card shows "+", which opens its sizes', kv.go > 0.9 && kv.strip === 'hidden' && await p.$eval(kc + ' .qa-p', e => e.matches(':popover-open')) && await p.evaluate(s => document.activeElement.matches(s + ' .qa-p .qa-b'), kc), JSON.stringify(kv));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
ok('quick add: no quick add on gift cards or personalised pieces', !(await p.$('#grid .card[data-h="monochrome-gift-cards"] .card-qa')) && !(await p.$('#grid .card[data-h="custom-monochrome-jersey"] .card-qa')));
ok('quick add (desktop): no console errors', !p.errs.length, p.errs.join(' | '));
await p.context().close();
});
// 11. card quick add on phones: "+" opens a size sheet (popover dialog); a size closes it and adds
await T('11. card quick add: phone sheet', async () => {
await fetch(BASE + '/cart/clear.js');
const p = await page({ w: 390, h: 844 });
await p.goto(BASE + '/collections/all'); await p.waitForTimeout(700);
const card = '#grid .card[data-h="monochrome-cargo-skirt"]';
// html has scroll-behavior: smooth; bring the card up instantly and let the cards' entrance settle, so taps land at once
await p.$eval(card, e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(1200);
const go = await p.$eval(card + ' .qa-go', e => { const r = e.getBoundingClientRect(); return [r.width, r.height, e.getAttribute('aria-label')]; });
ok('phone quick add: "+" is a 44px+ button with a name', go[0] >= 44 && go[1] >= 44 && /cargo skirt/i.test(go[2] || ''), JSON.stringify(go));
const open = () => p.$eval(card + ' .qa-p', e => e.matches(':popover-open'));
await p.tap(card + ' .qa-go'); await p.waitForTimeout(500);
ok('phone quick add: "+" opens the size sheet (a labelled dialog)', (await open()) && await p.$eval(card + ' .qa-p', e => e.getAttribute('role') === 'dialog' && !!e.getAttribute('aria-label')));
await p.tap(card + ' .qa-x'); await p.waitForTimeout(500);
ok('phone quick add: the close button shuts the sheet', !(await open()));
await p.tap(card + ' .qa-go'); await p.waitForTimeout(500);
await p.tap(card + ' .qa-p .qa-b:text-is("M")'); await p.waitForSelector('#mcDrawer.open', { timeout: 5000 }).catch(() => {});
const c1 = await cart();
ok('phone quick add: a size closes the sheet, adds it and opens the bag', !(await open()) && await p.$('#mcDrawer.open') !== null && c1.items.length === 1 && / - M$/.test(c1.items[0].title), c1.items.map(i => i.title).join(','));
ok('phone quick add: no console errors', !p.errs.length, p.errs.join(' | '));
await p.context().close();
});
// 12. product page on phones: a sticky Add to bag bar from the start, out of the way while the main button is on screen
await T('12. product sticky bar', async () => {
await fetch(BASE + '/cart/clear.js');
const p = await page({ w: 390, h: 844 });
await p.goto(BASE + '/products/monochrome-sweatshirt'); await p.waitForTimeout(700);
const st = () => p.$eval('#plSticky', e => ({ on: e.classList.contains('on'), inert: e.inert }));
const s0 = await st(), pick0 = (await p.textContent('#plsBuy')).trim();
await p.tap('.chip[data-v="M"]'); await p.waitForTimeout(200);
await p.evaluate(() => document.querySelector('#buy').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(500);
const sMid = await st();
await p.evaluate(() => window.scrollTo({ top: document.querySelector('#plBuy').getBoundingClientRect().bottom + scrollY + 400, behavior: 'instant' })); await p.waitForTimeout(500);
const s1 = await st();
ok('sticky bar: shown from load ("Choose size" until a size is picked), hidden while Add to bag is on screen, back after', s0.on && !s0.inert && pick0 === 'Choose size' && !sMid.on && sMid.inert && s1.on && !s1.inert, JSON.stringify([s0, pick0, sMid, s1]));
ok('sticky bar: names the chosen size and price', /^M · \$/.test((await p.textContent('#plsMeta')).trim()), await p.textContent('#plsMeta'));
await p.tap('#plsBuy'); await p.waitForSelector('#mcDrawer.open', { timeout: 5000 }).catch(() => {});
const c1 = await cart();
ok('sticky bar: Add to bag adds the chosen size and opens the bag', await p.$('#mcDrawer.open') !== null && c1.items.length === 1 && / - M$/.test(c1.items[0].title), c1.items.map(i => i.title).join(','));
ok('sticky bar: no console errors', !p.errs.length, p.errs.join(' | '));
await p.context().close();
const d = await page();
await d.goto(BASE + '/products/monochrome-sweatshirt'); await d.waitForTimeout(500);
await d.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await d.waitForTimeout(500);
ok('sticky bar: never on desktop', !(await d.$eval('#plSticky', e => e.classList.contains('on'))));
await d.context().close();
});
// 13. the free-magazine nudge in the bag: offered with a jersey or hoodie, one tap adds the magazine
await T('13. free-magazine nudge', async () => {
await fetch(BASE + '/cart/clear.js'); await addApi('monochrome-sweatshirt');
const p = await page();
await p.goto(BASE + '/pages/about'); await p.waitForTimeout(500);
await p.click('.bar-bag'); await p.waitForSelector('#mcDrawer.open', { timeout: 4000 }).catch(() => {});
ok('nudge: not offered without a jersey or hoodie', await p.$('#mcDrawer .offer') === null);
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
await fetch(BASE + '/cart/clear.js'); await addApi('white-monochrome-jersey');
await p.reload(); await p.waitForTimeout(500);
await p.click('.bar-bag'); await p.waitForSelector('#mcDrawer.open', { timeout: 4000 }).catch(() => {});
ok('nudge: the drawer offers the free Vision Issue with a jersey', await p.$eval('#mcDrawer .offer', e => e.offsetParent !== null && /jersey/i.test(e.textContent)).catch(() => false));
await p.click('#mcDrawer .offer-go'); await p.waitForTimeout(1800);
const c1 = await cart();
ok('nudge: one tap adds the magazine and the offer turns into a confirmation', c1.items.some(i => /magazine/i.test(i.title)) && c1.item_count === 2 && await p.$('#mcDrawer .offer') === null && await p.$('#mcDrawer .offer-ok') !== null, c1.items.map(i => i.title).join(','));
await fetch(BASE + '/cart/clear.js'); await addApi('acid-washed-monochrome-hoodie');
await p.goto(BASE + '/cart'); await p.waitForTimeout(500);
ok('nudge: the bag page offers it with a hoodie too', await p.$eval('.cart-main .offer', e => /hoodie/i.test(e.textContent)).catch(() => false));
ok('nudge: no console errors', !p.errs.length, p.errs.join(' | '));
await p.context().close();
await fetch(BASE + '/cart/clear.js');
});
// 14. home cover: the photo stack flips with the buttons, the arrow keys and a drag
await T('14. home photo stack', async () => {
const p = await page();
await p.goto(BASE + '/'); await p.waitForTimeout(900);
const num = () => p.textContent('[data-hs-i]');
const st = await p.evaluate(() => { const r = document.querySelector('[data-hs]'); return { on: r.classList.contains('on'), ctl: !document.querySelector('[data-hs-ctl]').hidden, n: r.querySelectorAll('.hs-card').length, focusable: [...r.querySelectorAll('.hs-a')].filter(a => a.tabIndex >= 0).length, role: r.getAttribute('aria-roledescription') }; });
ok('stack: armed, with flip controls and only the top print focusable', st.on && st.ctl && st.n >= 2 && st.focusable === 1 && !!st.role, JSON.stringify(st));
const top0 = await p.$eval('.hs-card[data-pos="0"] .hs-a', a => a.getAttribute('href'));
await p.click('[data-hs-next]'); await p.waitForTimeout(800);
const top1 = await p.$eval('.hs-card[data-pos="0"] .hs-a', a => a.getAttribute('href'));
ok('stack: Next brings the next print to the top', (await num()) === '02' && top1 !== top0 && /2 of/.test(await p.textContent('[data-hs-live]')), `${await num()} ${top0} -> ${top1}`);
await p.click('[data-hs-prev]'); await p.waitForTimeout(800);
ok('stack: Previous brings it back', (await num()) === '01' && await p.$eval('.hs-card[data-pos="0"] .hs-a', a => a.getAttribute('href')) === top0);
await p.focus('[data-hs-next]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
ok('stack: the arrow keys flip it', (await num()) === '02', await num());
const r = await p.$eval('.hs-card[data-pos="0"]', e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
await p.mouse.move(r.x, r.y); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(r.x + i * 22, r.y + 2); await p.mouse.up(); await p.waitForTimeout(900);
ok('stack: a drag throws the top print and does not open its link', (await num()) === '03' && new URL(p.url()).pathname === '/', `${await num()} ${p.url()}`);
ok('stack: no console errors', !p.errs.length, p.errs.join(' | '));
await p.context().close();
});
// 15. no sideways scrolling on phones
await T('15. no sideways scroll', async () => {
for (const w of [320, 390]) {
  const p = await page({ w, h: 800 });
  const wide = [];
  for (const u of ['/', '/collections/all', '/products/monochrome-sweatshirt', '/cart', '/pages/about']) {
    await p.goto(BASE + u); await p.waitForTimeout(400);
    const sw = await p.evaluate(w => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - w, w);
    if (sw > 0) wide.push(`${u} +${sw}px`);
  }
  ok(`no sideways scroll at ${w}px`, !wide.length, wide.join(', '));
  await p.context().close();
}
});
// 16. the Top Secret File intro: on a first visit to the home page only, gone by itself, skipped by a tap, once per session, never without JS
await T('16. intro', async () => {
const p = await page({ intro: true });
await p.goto(BASE + '/'); await p.waitForTimeout(300);
ok('intro: plays on a first visit to the home page', await p.$eval('#mcl', o => getComputedStyle(o).display !== 'none').catch(() => false));
ok('intro: the page behind waits (html.mcl-on)', await p.evaluate(() => document.documentElement.classList.contains('mcl-on')));
await p.waitForSelector('#mcl', { state: 'detached', timeout: 5000 }).catch(() => {});
ok('intro: removes itself within 4.5 s', !(await p.$('#mcl')) && !(await p.evaluate(() => document.documentElement.classList.contains('mcl-on'))));
await p.goto(BASE + '/'); await p.waitForTimeout(300);
ok('intro: plays once per session', !(await p.$('#mcl')));
const q = await page({ intro: true, w: 390, h: 844 });
await q.goto(BASE + '/'); await q.waitForTimeout(400);
await q.mouse.click(195, 400);
const sk = await q.evaluate(() => { const o = document.getElementById('mcl'); const an = document.getAnimations().filter(a => /^mcf/.test(a.animationName));
  return { through: !o || getComputedStyle(o).pointerEvents === 'none', jumped: !o || an.every(a => a.playState === 'finished' || a.currentTime >= 1900) }; });
ok('intro: a tap jumps to the reveal and lets taps through', sk.through && sk.jumped, JSON.stringify(sk));
await q.waitForSelector('#mcl', { state: 'detached', timeout: 3000 }).catch(() => {});
ok('intro: gone after the skipped reveal', !(await q.$('#mcl')));
ok('intro: no console errors', !p.errs.length && !q.errs.length, [...p.errs, ...q.errs].join(' | '));
const r = await page({ intro: true });
await r.goto(BASE + '/products/monochrome-sweatshirt'); await r.waitForTimeout(300);
ok('intro: not on other pages', !(await r.$('#mcl')));
const n = await page({ intro: true, js: false });
await n.goto(BASE + '/'); await n.waitForTimeout(300);
ok('intro: hidden without JS', await n.$eval('#mcl', o => getComputedStyle(o).display === 'none').catch(() => true));
for (const x of [p, q, r, n]) await x.context().close();
});
for (const [s, n, x] of results) console.log(s, n, x ? '— ' + x : '');
console.log(`${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
await b.close();
