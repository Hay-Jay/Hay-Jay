// node tools/live-fixes.mjs — re-checks, on the real store's preview link, the problems found by the first round of testing.
import { launch, previewContext, open, STORE } from './lib/live.mjs';
const b = await launch();
const res = []; const ok = (n, c, x = '') => res.push([c ? 'PASS' : 'FAIL', n, x]);
const T = async (n, fn) => { try { await fn(); } catch (e) { ok(n + ' (threw)', false, String(e.message).split('\n')[0]); } };

// currency: this machine is served USD by Shopify Markets
await T('currency', async () => {
  const ctx = await previewContext(b, { w: 1440, reduce: true });
  const p = await open(ctx, '/products/monochrome-sweatshirt');
  const cur = await p.evaluate(() => window.MC && MC.currency);
  const price = await p.textContent('#price');
  ok('product price labelled with the shopper currency', cur && price.includes(cur) && !(cur !== 'CAD' && price.includes('CAD')), `${cur}: ${price}`);
  await p.click('.chip[data-v="L"]').catch(() => {}); await p.waitForTimeout(300);
  const price2 = await p.textContent('#price');
  ok('price after picking a size keeps Shopify formatting', price2.includes(cur) && /\d/.test(price2), price2);
  const ld = await p.$$eval('script[type="application/ld+json"]', s => s.map(x => x.textContent).join(' '));
  ok('JSON-LD priceCurrency matches', ld.includes(`"priceCurrency": "${cur}"`) || ld.includes(`"priceCurrency":"${cur}"`));
  const body = await p.textContent('body');
  ok('no "CAD" left on the page when not in CAD', cur === 'CAD' || !/\bCAD\b/.test(body.replace(/Canadian dollars/g, '')), (body.match(/.{30}\bCAD\b.{10}/) || [''])[0]);
  const p2 = await open(ctx, '/collections/all?currency=CAD');
  ok('register shows CAD when the shopper is in CAD', (await p2.textContent('.trow .t-price')).includes('CAD'));
  await ctx.close();
});
// command palette: live catalogue
await T('palette', async () => {
  const ctx = await previewContext(b, { w: 1440, reduce: true });
  const p = await open(ctx, '/pages/about');
  await p.keyboard.press('/'); await p.waitForTimeout(800); await p.keyboard.type('hoodie'); await p.waitForTimeout(1800);
  const hits = await p.$$eval('#jumpList a', a => a.map(x => x.textContent));
  ok('command palette lists live products', hits.some(t => /hoodie/i.test(t) && /Asset/i.test(t)), hits.slice(0, 3).join(' | '));
  await ctx.close();
});
// product page layout
await T('product', async () => {
  const ctx = await previewContext(b, { w: 390, h: 844, reduce: true });
  const p = await open(ctx, '/products/custom-monochrome-jersey');
  await p.mouse.wheel(0, 600); await p.waitForTimeout(800);
  const h = await p.$eval('.pl-buy', e => e.getBoundingClientRect().height);
  ok('phone pinned buy bar is short', h < 130, `${Math.round(h)}px`);
  const chatHidden = await p.evaluate(() => { const c = document.querySelector('shopify-chat'); return !c || getComputedStyle(c).visibility === 'hidden'; });
  ok('chat launcher steps aside while the buy bar is pinned (phone)', chatHidden);
  const inForm = await p.evaluate(() => [...document.querySelectorAll('.pl-app')].map(a => !!a.closest('form')));
  ok('app blocks render inside the product form', inForm.length >= 1 && inForm.every(Boolean), JSON.stringify(inForm));
  const sweat = await open(ctx, '/products/monochrome-sweatshirt');
  const gap = await sweat.$$eval('.pl-app', a => a.filter(x => getComputedStyle(x).display !== 'none' && !x.querySelector('.tpo_has-option-set') && x.querySelector('.easify-product-options')).length);
  ok('empty Easify wrapper hidden', gap === 0, String(gap));
  await ctx.close();
  const d = await previewContext(b, { w: 1440, reduce: true });
  const so = await open(d, '/products/monochrome-compass-necklace');
  ok('sold out: no quantity stepper on desktop', await so.$eval('.pl-qtyrow', e => getComputedStyle(e).display === 'none'));
  const kl = await open(d, '/products/monochrome-sweatshirt?currency=CAD', { wait: 3000 });
  const pos = await kl.evaluate(() => { const k = [...document.querySelectorAll('.pl-app')].find(a => /klarna/i.test(a.innerHTML)); const f = document.querySelector('footer, .foot'); return k ? { y: Math.round(k.getBoundingClientRect().top + scrollY), buy: Math.round(document.querySelector('#buy').getBoundingClientRect().top + scrollY) } : null; });
  ok('Klarna messaging sits by the buy button', pos && Math.abs(pos.y - pos.buy) < 400, JSON.stringify(pos));
  await d.close();
});
// bag: scroll lock + chat hidden
await T('bag', async () => {
  const ctx = await previewContext(b, { w: 1440, reduce: true });
  const p = await open(ctx, '/products/royal-black', { wait: 2500 });
  await p.evaluate(() => document.querySelectorAll('shopify-forms-embed').forEach(e => e.remove())); // the store's sign-up pop-up, closed as a shopper would
  await p.click('#buy'); await p.waitForSelector('#mcDrawer.open', { timeout: 8000 });
  await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({ lock: getComputedStyle(document.documentElement).overflow, chat: (() => { const c = document.querySelector('shopify-chat'); return c ? getComputedStyle(c).visibility : 'none'; })() }));
  ok('open bag locks page scroll', st.lock === 'hidden', st.lock);
  ok('chat launcher hidden behind the open bag', st.chat === 'hidden' || st.chat === 'none', st.chat);
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  ok('chat launcher back after closing the bag', await p.evaluate(() => { const c = document.querySelector('shopify-chat'); return !c || getComputedStyle(c).visibility !== 'hidden'; }));
  await p.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
  await ctx.close();
});
// register, search, titles
await T('register', async () => {
  const ctx = await previewContext(b, { w: 1440, reduce: true });
  const p = await open(ctx, '/collections/all');
  ok('register title', (await p.title()).startsWith('Asset Register — MONOCHROME'), await p.title());
  const img = await p.$eval('.trow-a', a => a.dataset.img);
  ok('register preview photos are sized', /width=720/.test(img), img.slice(-60));
  const fp = await open(ctx, '/collections/frontpage');
  const chips = await fp.$$eval('.filter sup', s => s.map(x => x.textContent));
  ok('no empty filter chips on a small collection', !chips.slice(1).includes('0'), chips.join(','));
  const s = await open(ctx, '/search?q=%22ring%22');
  ok('search title not double-escaped', !(await s.title()).includes('&quot;'), await s.title());
  const z = await open(ctx, '/search?q=zzqqzz');
  ok('empty search shows no empty board', (await z.$('.board')) === null);
  await ctx.close();
});
// home: magazine text, intro tap, two pop-ups, snapchat
await T('home', async () => {
  const ctx = await previewContext(b, { w: 390, h: 844 });
  const p = await open(ctx, '/', { wait: 600 });
  if (await p.$('.intro')) { await p.mouse.click(195, 600); await p.waitForTimeout(800); ok('tap on the intro stays on the home page', new URL(p.url()).pathname === '/', p.url()); }
  const blurb = await p.$eval('#vision', e => e.textContent).catch(() => '');
  ok('magazine blurb has spaces between sentences', !/[a-z]\.[A-Z]/.test(blurb.replace(/\s+/g, ' ')), (blurb.match(/[a-z]\.[A-Z].{0,20}/) || [''])[0]);
  await p.waitForTimeout(15000);
  const st = await p.evaluate(() => {
    const fe = document.querySelector('shopify-forms-embed'), ov = fe && fe.shadowRoot && fe.shadowRoot.querySelector('[data-layout="overlay"]');
    const forms = !!(ov && ov.getBoundingClientRect().height > 0 && getComputedStyle(ov).display !== 'none');
    return { forms, mag: !!document.querySelector('#magpop.open') };
  });
  ok('never two pop-ups at once', !(st.forms && st.mag), JSON.stringify(st));
  const snap = await p.$eval('a[href*="snapchat"]', a => a.href).catch(() => '');
  ok('snapchat link', snap.includes('snapchat.com/add/monochrome.ca'), snap);
  await ctx.close();
});
// policy page width
await T('policy', async () => {
  const ctx = await previewContext(b, { w: 390, h: 844, reduce: true });
  const p = await open(ctx, '/policies/privacy-policy');
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('privacy policy fits a phone', over <= 1, `${over}px`);
  await ctx.close();
});
await b.close();
for (const [s, n, x] of res) console.log(s, n, x ? '— ' + x : '');
console.log(`${res.filter(r => r[0] === 'PASS').length}/${res.length} passed`);
