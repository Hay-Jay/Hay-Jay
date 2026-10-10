/**
 * End-to-end smoke test: serves the production build, boots the game in headless Chromium (software WebGL),
 * walks through title → creator → play → phone → enter buildings → job loop, and fails on any console/page error.
 * Screenshots are written to .scratch/shots (git-ignored).
 *   npm run build && npm run smoke
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), '.scratch', 'shots'); mkdirSync(OUT, { recursive: true });
const find = () => { const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; if (!existsSync(root)) return undefined; const d = readdirSync(root).find((x) => x.startsWith('chromium')); return d ? join(root, d, 'chrome-linux', 'chrome') : undefined; };
const exe = process.env.CHROME_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : find());
const mobile = process.argv.includes('--mobile');
const STOP_AFTER = process.env.SMOKE_STOP_AFTER; // dev aid: SMOKE_STOP_AFTER='step name' ends the run after that step

const server = await createServer({ server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' }); await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 680 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|open-meteo|net::ERR/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
await page.route('**/api.open-meteo.com/**', (r) => r.abort()); // force the simulated-weather path in CI

const tag = mobile ? 'm-' : '';
const shot = async (name) => { await page.screenshot({ path: join(OUT, `${tag}${name}.png`) }); console.log('  shot', name); };
const step = async (name, fn) => { try { await fn(); console.log('PASS', name); } catch (e) { errors.push(`STEP ${name}: ${e.message}`); console.log('FAIL', name, e.message); } if (STOP_AFTER && name === STOP_AFTER) { console.log('STOPPING after', name); await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0); } };
const wait = (ms) => page.waitForTimeout(ms);
// Software WebGL renders at a few fps, so wait until the game loop has actually picked an interaction target before pressing E.
const pressE = async (re) => { await page.waitForFunction((src) => new RegExp(src, 'i').test(window.__regina.getTarget()?.label || ''), re, { timeout: 30000 }); await page.keyboard.press('e'); };

await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' });
await step('loads to title', async () => { await page.waitForSelector('#title.on', { timeout: 90000 }); await wait(800); await shot('01-title'); });
// Home-screen map: every pin readable. Measures the real DOM boxes (pin circle + visible name) against each other, the header and the card.
const auditPins = () => page.evaluate(() => {
  const box = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }), hit = (a, b) => a.x0 < b.x1 - 1 && a.x1 > b.x0 + 1 && a.y0 < b.y1 - 1 && a.y1 > b.y0 + 1;
  const live = [...document.querySelectorAll('.pin')].filter((p) => p.style.display !== 'none' && p.offsetParent !== null);
  const pins = live.map((p) => {
    const e = box(p.querySelector('.pe').getBoundingClientRect()), l = p.querySelector('.pl'), lr = getComputedStyle(l).opacity > 0.5 ? box(l.getBoundingClientRect()) : null;
    return { id: p.dataset.pin, x0: e.x0, y0: e.y0, x1: lr ? Math.max(e.x1, lr.x1) : e.x1, y1: lr ? lr.y1 : e.y1 };
  });
  const blockers = [...document.querySelectorAll('.hub-top .brandpill, .hub-top .chip, .hub-card, #topbar, #chiprow button, #navbar')].filter((e) => e.offsetParent !== null).map((e) => ({ ...box(e.getBoundingClientRect()), name: e.id || e.className.split(' ')[0] || e.tagName }));
  const bad = [];
  // a pin the player cannot tap (something opaque on top of it) is as bad as an overlap
  live.forEach((p) => { const r = p.querySelector('.pe').getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (t?.closest('.pin') !== p) bad.push(`${p.dataset.pin} is not tappable (covered by ${t ? (t.id ? '#' + t.id : '') + '.' + String(t.className).split(' ')[0] + ' in ' + (t.closest('[id]')?.id || '?') : 'nothing'})`); });
  pins.forEach((a, i) => { pins.slice(i + 1).forEach((b) => hit(a, b) && bad.push(`${a.id} overlaps ${b.id}`)); blockers.forEach((b) => hit(a, b) && bad.push(`${a.id} under ${b.name}`)); if (a.x0 < 0 || a.y0 < 0 || a.x1 > innerWidth || a.y1 > innerHeight) bad.push(`${a.id} off-screen`); });
  return { n: pins.length, bad };
});
// software WebGL can spend seconds on one frame (e.g. right after a resize), so wait until the hub has really consumed the snap + refit instead of sleeping
await page.addStyleTag({ content: '.pin .pl,.pin .pe{transition:none !important}' }); // measure real layout, not a label mid-fade (software WebGL barely ticks CSS transitions)
const settleHub = async () => { await page.evaluate(() => { __regina.hub.snapNext = true; }); await page.waitForFunction(() => !__regina.hub.snapNext && !__regina.hub.dirty, null, { timeout: 90000 }); await wait(300); };
await step('home map: pins do not overlap or hide', async () => {
  await settleHub(); let r = await auditPins(); if (r.n !== 7 || r.bad.length) throw new Error('close view: ' + JSON.stringify(r));
  await page.click('#hub-zoom'); await wait(400); await settleHub(); r = await auditPins(); await shot('01b-home-map-far'); if (r.n !== 13 || r.bad.length) throw new Error('far view: ' + JSON.stringify(r));
  await page.$eval('.pin[data-pin="leg"]', (e) => e.click()); await wait(400); await settleHub(); r = await auditPins(); if (r.bad.length) throw new Error('far view with a place selected: ' + JSON.stringify(r));
  await page.click('#hub-zoom'); await wait(400); await settleHub(); r = await auditPins(); if (r.n !== 7 || r.bad.length) throw new Error('back to close view: ' + JSON.stringify(r));
  await page.$eval('.pin[data-pin="market"]', (e) => e.click()); await wait(400); await settleHub(); r = await auditPins(); await shot('01c-home-map-selected'); if (r.bad.length) throw new Error('close view with a place selected: ' + JSON.stringify(r));
  await page.$eval('.pin[data-pin="market"]', (e) => e.click()); await wait(300); // deselect
});
await step('home map: landscape phone keeps every pin visible and tappable', async () => {
  const vp = page.viewportSize();
  await page.setViewportSize({ width: 740, height: 360 }); await wait(500); await settleHub();
  let r = await auditPins(); await shot('01d-home-map-landscape'); if (r.n !== 7 || r.bad.length) throw new Error('landscape close view: ' + JSON.stringify(r));
  await page.click('#hub-zoom'); await wait(400); await settleHub(); r = await auditPins(); if (r.n !== 13 || r.bad.length) throw new Error('landscape far view: ' + JSON.stringify(r));
  await page.click('#hub-zoom'); await wait(400);
  await page.setViewportSize(vp); await wait(500); await settleHub();
});
await step('new life → creator', async () => { await page.click('#btn-new'); await page.waitForSelector('.panel.char', { timeout: 5000 }); await wait(1200); await shot('02-creator'); });
await step('creator customisation', async () => {
  await page.click('.panel.char [data-tab="hair"]'); await page.click('.panel.char [data-k="hair"][data-v="afro"]'); await wait(300);
  await page.click('.panel.char [data-tab="face"]'); await page.click('.panel.char [data-k="facialHair"][data-v="full"]'); await page.click('.panel.char [data-k="skin"][data-v="5"]'); await wait(500); await shot('03-creator-face');
  await page.click('.panel.char [data-tab="outfit"]'); await wait(200); await page.fill('[data-name]', 'Riley'); await page.click('.panel.char [data-rand]'); await wait(300); await page.click('.panel.char [data-done]');
});
await step('gameplay starts', async () => { await page.waitForFunction(() => window.__regina?.mode === 'play'); await page.evaluate(() => { __regina.store.state.flags = { daniCall: true, offerCall: true, disableEvents: true }; }); await wait(1500); await shot('04-play'); });
await step('daylight + movement + camera', async () => {
  await page.evaluate(() => __regina.setTime('2026-07-15T18:30:00Z')); await wait(1500); await shot('04b-day');
  const p0 = await page.evaluate(() => ({ x: __regina.player.pos.x, z: __regina.player.pos.z }));
  await page.keyboard.down('w');
  await page.waitForFunction((p) => Math.hypot(__regina.player.pos.x - p.x, __regina.player.pos.z - p.z) > 2, p0, { timeout: 40000 });
  await page.keyboard.up('w'); await shot('05-moving');
  await page.keyboard.down('Shift'); await page.keyboard.down('d'); await wait(2500); await page.keyboard.up('d'); await page.keyboard.up('Shift');
  const m = await page.evaluate(() => __regina.info()); console.log('  render info', JSON.stringify(m));
});
await step('phone lock → home', async () => {
  await page.keyboard.press('p'); await wait(900); await shot('06-phone-lock');
  await page.keyboard.press('Enter'); await wait(700); await shot('07-phone-home');
});
for (const app of ['messages', 'bank', 'jobs', 'maps', 'weather', 'calendar', 'inventory', 'settings', 'contacts', 'phone', 'photos']) {
  await step('app ' + app, async () => { await page.evaluate((a) => __regina.phone.openApp(a), app); await wait(700); if (['messages', 'bank', 'jobs', 'maps', 'weather', 'settings'].includes(app)) await shot('app-' + app); await page.evaluate(() => __regina.phone.closeApp(true)); });
}
await step('messages send + NPC reply', async () => {
  await page.evaluate(() => __regina.phone.openApp('messages')); await page.click('[data-th="dani"]'); await page.fill('.composer input', 'hey, I am hungry'); await page.keyboard.press('Enter'); await wait(4200);
  const n = await page.evaluate(() => __regina.store.state.messages.dani.length); if (n < 2) throw new Error('no reply, n=' + n); await shot('08-messages');
  await page.evaluate(() => __regina.phone.closeApp(true));
});
await step('incoming call UI', async () => { await page.evaluate(() => __regina.phone.incomingCall('dani')); await wait(700); await shot('09-call'); await page.click('.callov [data-c="accept"]'); await wait(900); await shot('09b-call-active'); await page.click('.callov [data-c="end"]'); await wait(300); });
await step('control + notification centre', async () => {
  await page.evaluate(() => { if (__regina.phone.call) __regina.phone.endCall(true); }); await wait(300); if (!(await page.evaluate(() => __regina.phone.isOpen))) await page.keyboard.press('p'); await wait(800); await page.click('.sb-right'); await wait(600); await shot('10-control'); await page.click('.sb-right'); await page.click('.sb-left'); await wait(600); await shot('11-notifs'); await page.click('.sb-left'); });
await step('close phone', async () => {
  await page.keyboard.press('p'); await page.waitForFunction(() => { const ph = document.getElementById('phone'); return !__regina.phone.isOpen && (!ph || ph.getBoundingClientRect().top >= innerHeight - 1 || ph.getBoundingClientRect().left >= innerWidth - 1); }, null, { timeout: 60000 }); await wait(300);   // software GL barely ticks the slide-away transition: wait until the phone really left the screen
});
await step('map tab: bright overview, place card, walk there', async () => {
  await page.keyboard.press('m'); await page.waitForFunction(() => __regina.mapOverview, null, { timeout: 60000 });
  await page.evaluate(() => { __regina.ovHub.snapNext = true; }); await page.waitForFunction(() => !__regina.ovHub.snapNext && !__regina.ovHub.dirty, null, { timeout: 90000 }); await wait(500);
  const nav = await page.$eval('#navbar [data-tab="map"]', (b) => b.classList.contains('on')); if (!nav) throw new Error('Map tab is not highlighted');
  let r = await auditPins(); await shot('12-map'); if (r.n < 7 || r.bad.length) throw new Error('overview: ' + JSON.stringify(r));
  await page.$eval('.ovmap .pin[data-pin="market"]', (e) => e.click()); await wait(600); await page.waitForFunction(() => document.getElementById('ov-card').classList.contains('sel'), null, { timeout: 20000 });
  await page.evaluate(() => { __regina.ovHub.snapNext = true; }); await page.waitForFunction(() => !__regina.ovHub.snapNext && !__regina.ovHub.dirty, null, { timeout: 90000 }); await wait(500);
  r = await auditPins(); await shot('12a-map-place'); if (r.bad.length) throw new Error('overview with a place card: ' + JSON.stringify(r));
  const txt = await page.$eval('#ov-place', (e) => e.innerText); if (!/Prairie Corner Market/.test(txt) || !/Walk/.test(txt) || !/Cab/.test(txt)) throw new Error('place card content: ' + txt);
  await page.click('#ov-place [data-go="walk"]'); await wait(500);
  const st = await page.evaluate(() => ({ ov: __regina.mapOverview, dest: __regina.store.state.destination?.id })); if (st.ov || st.dest !== 'market') throw new Error('walk should close the map and set the destination: ' + JSON.stringify(st));
  await page.evaluate(() => { __regina.store.state.destination = null; });
});
await step('wallet: daily reward can be claimed once', async () => {
  const bal = () => page.evaluate(() => __regina.store.state.bank.balance); const b0 = await bal();
  await page.click('#tb-plus'); await page.waitForSelector('.panel button.primary', { timeout: 10000 }); await shot('12c-wallet');
  await page.click('.panel button.primary'); await wait(400); const b1 = await bal(); if (b1 <= b0) throw new Error(`reward not credited: ${b0} -> ${b1}`);
  await page.click('#tb-plus'); await wait(500); const again = await page.$$eval('.panel button.primary', (b) => b.map((x) => x.textContent)); if (again.some((t) => /Claim/.test(t))) throw new Error('reward offered twice');
  await page.keyboard.press('Escape'); await wait(300);
});
await step('full 2D map: badges never overlap, clusters zoom in', async () => {
  await page.evaluate(() => __regina.openMap2D()); await wait(800); await shot('12d-map2d');
  const hits = () => page.evaluate(() => __regina.fullMap()._hits.map((h) => ({ x: h.x, y: h.y, r: h.r, n: h.group?.items.length ?? 1, name: h.poi?.name })));
  const clash = (hs) => { for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) if (Math.hypot(hs[i].x - hs[j].x, hs[i].y - hs[j].y) < hs[i].r + hs[j].r - 1) return `${hs[i].name ?? 'cluster'} / ${hs[j].name ?? 'cluster'}`; return null; };
  let hs = await hits(); if (!hs.length) throw new Error('no places drawn'); const c = clash(hs); if (c) throw new Error('overlapping badges at default zoom: ' + c);
  const over = await page.evaluate(() => { const c = document.getElementById('map-canvas').getBoundingClientRect(); return [document.getElementById('map-close'), document.querySelector('.map-zoom')].map((e) => { const b = e.getBoundingClientRect(); return { x0: b.left - c.left, y0: b.top - c.top, x1: b.right - c.left, y1: b.bottom - c.top }; }); });
  const under = (list) => list.filter((h) => over.some((o) => h.x + h.r > o.x0 && h.x - h.r < o.x1 && h.y + h.r > o.y0 && h.y - h.r < o.y1)).map((h) => h.name ?? 'cluster');
  const u1 = under(hs); if (u1.length) throw new Error('badges under the map controls at default zoom: ' + u1.join(', '));
  const cl = hs.find((h) => h.n > 1); if (!cl) throw new Error('expected a cluster of the downtown places at the default zoom');
  const box = await page.$eval('#map-canvas', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top]; });
  await page.mouse.click(box[0] + cl.x, box[1] + cl.y); await page.waitForFunction(() => !__regina.fullMap()._fly, null, { timeout: 30000 }); await wait(400); await shot('12b-map-zoomed');
  hs = await hits(); const u2 = under(hs); if (u2.length) throw new Error('badges under the map controls after zooming: ' + u2.join(', ')); const c2 = clash(hs); if (c2) throw new Error('overlapping badges after tapping a cluster: ' + c2); if (hs.filter((h) => h.n === 1).length < cl.n) throw new Error(`cluster of ${cl.n} did not split into places`);
  await page.evaluate(() => __regina.closeMap2D());
});
await step('enter market via door', async () => {
  await page.evaluate(() => __regina.tp(30, 9.8));
  await page.waitForFunction(() => /Market/.test(__regina.getTarget()?.label || ''), null, { timeout: 20000 }).catch(() => {});
  const t = await page.evaluate(() => __regina.getTarget()?.label); if (!/Market/.test(t || '')) throw new Error('no door prompt: ' + t + ' ' + (await page.evaluate(() => JSON.stringify(__regina.dbg()))));
  await shot('13-door-prompt'); await page.keyboard.press('e'); await page.waitForFunction(() => __regina.inInterior === 'market', null, { timeout: 8000 }); await wait(1200); await shot('14-market');
});
await step('buy groceries', async () => {
  await page.evaluate(() => { __regina.player.pos.x = -2.9; __regina.player.pos.z = 1.35; });
  await page.waitForFunction(() => /Browse/.test(__regina.getTarget()?.label || ''), null, { timeout: 20000 }).catch(() => {});
  const t = await page.evaluate(() => __regina.getTarget()?.label); if (!/Browse/.test(t || '')) throw new Error('no shelf prompt: ' + t);
  await page.keyboard.press('e'); await page.waitForSelector('.panel.shop'); await shot('15-shop');
  const shown = await page.$eval('[data-buy]', (el) => Math.round(parseFloat(el.parentElement.querySelector('span').textContent.replace(/[^0-9.]/g, ' ').trim().split(' ')[0]) * 100));
  const b0 = await page.evaluate(() => __regina.store.state.bank.balance); await page.click('[data-buy]'); await wait(200);
  const b1 = await page.evaluate(() => __regina.store.state.bank.balance); if (b1 >= b0) throw new Error('balance did not drop'); if (b0 - b1 !== shown) throw new Error(`shelf showed ${shown} but charged ${b0 - b1}`); await page.click('.panel .x');
});
await step('job loop: apply → hire → shift → paid', async () => {
  await page.evaluate(async () => { const G = __regina.G, s = __regina.store; G.applyForJob(s, 'retail'); s.state.job.application.offerAt = 0; G.tickJobs(s); G.acceptOffer(s); });
  await page.evaluate(() => { __regina.player.pos.x = 3.6; __regina.player.pos.z = 5.4; }); await wait(300);
  await pressE('clock in|talk|staff'); await page.waitForSelector('.panel.menu'); await page.click('.panel.menu .btn.primary'); await wait(300);
  const total = await page.evaluate(() => __regina.store.state.job.shift.tasksTotal);
  for (let i = 0; i < total; i++) {
    await page.evaluate(() => { __regina.player.pos.x = 4.2; __regina.player.pos.z = -5.9; }); await wait(300); await pressE('pick up'); await wait(200);
    if (i === 0) await shot('16-carrying');
    const pos = await page.evaluate(() => __regina.stationTarget());
    if (!pos) throw new Error('no station target helper');
    await page.evaluate((p) => { __regina.player.pos.x = p.x; __regina.player.pos.z = p.z; }, pos); await wait(300); await pressE('stock'); await wait(250);
  }
  await page.evaluate(() => { __regina.player.pos.x = 3.6; __regina.player.pos.z = 5.4; }); await wait(300);
  const bal0 = await page.evaluate(() => __regina.store.state.bank.balance);
  await pressE('clock out'); await wait(400);
  const done = await page.evaluate(() => __regina.store.state.job.shift);
  // anti-exploit: instant finish must be refused
  if (!done) throw new Error('instant pay was allowed (shift cleared)');
  await page.evaluate(() => { __regina.store.state.job.shift.startedAt -= 120000; }); // simulate time passing
  await pressE('clock out'); await wait(400);
  const bal1 = await page.evaluate(() => __regina.store.state.bank.balance); if (bal1 <= bal0) throw new Error('not paid');
  await shot('17-paid');
});
await step('exit market', async () => { await page.evaluate(() => __regina.exitInterior()); await page.waitForFunction(() => __regina.inInterior === null); await wait(600); });
await step('apartment interior', async () => { await page.evaluate(() => __regina.enterInterior('apartment')); await page.waitForFunction(() => __regina.inInterior === 'apartment'); await wait(1300); await shot('18-apartment'); await page.evaluate(() => { __regina.player.pos.x = -2; __regina.player.pos.z = -2.6; }); await wait(900); await shot('18b-apartment-bed'); await page.evaluate(() => __regina.exitInterior()); await wait(900); });
await step('threads interior', async () => { await page.evaluate(() => __regina.enterInterior('threads')); await page.waitForFunction(() => __regina.inInterior === 'threads'); await wait(1300); await shot('19-threads'); await page.evaluate(() => __regina.exitInterior()); await wait(900); });
await step('home screen (hub)', async () => {
  // covered earlier by the title step; here we just make sure the hub API exists
  const ok = await page.evaluate(() => !!__regina.hub && typeof __regina.news === 'function'); if (!ok) throw new Error('hub missing');
});
await step('life event card + validated choice', async () => {
  await page.evaluate(async () => { const m = await import('/src/core/events.js'); __regina.tp(0, 6); m.issueEvent(__regina.store, 'busker'); __regina.showEvent(m.EVENT_BY_ID.busker); });
  await page.waitForSelector('.panel.event'); await shot('20a-event');
  const b0 = await page.evaluate(() => __regina.store.state.bank.balance);
  await page.click('.panel.event [data-i="0"]'); await page.waitForSelector('.panel.event [data-ok]'); await shot('20b-event-result');
  const b1 = await page.evaluate(() => __regina.store.state.bank.balance); if (b1 !== b0 - 300) throw new Error(`tip not charged ${b0} -> ${b1}`);
  await page.click('.panel.event [data-ok]'); await page.waitForFunction(() => !document.querySelector('.panel.event'));
});
await step('news + life + ads apps', async () => {
  await page.evaluate(() => { __regina.phone.open(); });
  for (const a of ['news', 'life', 'ads']) { await page.evaluate((x) => __regina.phone.openApp(x), a); await wait(800); await shot('app-' + a); await page.evaluate(() => __regina.phone.closeApp(true)); }
  await page.evaluate(() => __regina.phone.close());
});
await step('book a billboard and see it update', async () => {
  const r = await page.evaluate(async () => { const m = await import('/src/core/ads.js'); __regina.store.state.bank.balance = Math.max(__regina.store.state.bank.balance, 5e6); const b0 = __regina.store.ledger.balance; const res = m.buyAd(__regina.store, 'downtown-north', 1, 'Best bannock in Regina!', 'sunset'); __regina.ctx.refreshBillboards(); return { res, spent: b0 - __regina.store.ledger.balance }; });
  if (!r.res.ok || r.spent !== r.res.price) throw new Error('booking failed ' + JSON.stringify(r));
  await page.evaluate(() => { __regina.tp(-30, -574); __regina.rig.yaw = 0; __regina.rig.pitch = 0.1; });
  await page.waitForFunction(() => /Billboard/.test(__regina.getTarget()?.label || ''), null, { timeout: 20000 }).catch(() => {});
  const t = await page.evaluate(() => __regina.getTarget()?.label); if (!/Billboard/.test(t || '')) throw new Error('no billboard prompt: ' + t);
  await shot('21-billboard'); await page.keyboard.press('e'); await wait(900); await shot('22-ads-from-board'); await page.evaluate(() => __regina.phone.close());
});
await step('gym: treadmill trains fitness', async () => {
  await page.evaluate(() => __regina.enterInterior('gym')); await page.waitForFunction(() => __regina.inInterior === 'gym'); await wait(1300); await shot('23-gym');
  await page.evaluate(() => { __regina.store.state.needs.energy = 90; __regina.player.pos.x = -1.5; __regina.player.pos.z = -2.2; });
  await page.waitForFunction(() => /treadmill/i.test(__regina.getTarget()?.label || ''), null, { timeout: 20000 }).catch(() => {});
  const t = await page.evaluate(() => __regina.getTarget()?.label); if (!/treadmill/i.test(t || '')) throw new Error('no treadmill prompt: ' + t);
  await page.keyboard.press('e'); await page.waitForSelector('.prog-panel'); await shot('24-activity'); await page.waitForFunction(() => !document.querySelector('.prog-panel'), null, { timeout: 30000 });
  const f = await page.evaluate(() => __regina.store.state.skills.fitness); if (!(f >= 10)) throw new Error('fitness not trained: ' + f);
  await page.evaluate(() => __regina.exitInterior()); await page.waitForFunction(() => __regina.inInterior === null); await wait(600);
});
await step('apartment shower restores hygiene', async () => {
  await page.evaluate(() => __regina.enterInterior('apartment')); await page.waitForFunction(() => __regina.inInterior === 'apartment'); await wait(1000);
  await page.evaluate(() => { __regina.store.state.needs.hygiene = 5; __regina.player.pos.x = -2.2; __regina.player.pos.z = 3.8; });
  await pressE('shower'); await page.waitForSelector('.prog-panel'); await page.waitForFunction(() => !document.querySelector('.prog-panel'), null, { timeout: 30000 });
  const h = await page.evaluate(() => __regina.store.state.needs.hygiene); if (h < 90) throw new Error('hygiene ' + h);
  await shot('25-apartment-shower'); await page.evaluate(() => __regina.exitInterior()); await page.waitForFunction(() => __regina.inInterior === null); await wait(600);
});
const openApp = async (id) => { await page.evaluate((x) => __regina.phone.openApp(x), id); await wait(700); };
await step('friends by @username (NPC residents)', async () => {
  await page.evaluate(() => { __regina.store.state.needs.energy = 90; }); await openApp('social');
  await page.click('[data-tab="find"]'); await page.fill('#soq', '@kaya'); await wait(300);
  await page.click('[data-add="kaya"]'); await wait(400); await shot('30-social-find');
  await page.click('[data-tab="friends"]'); await page.click('[data-f="kaya"]'); await wait(400); await shot('31-friend');
  const l0 = await page.evaluate(() => __regina.store.state.friends.kaya.level);
  await page.click('[data-h="walk"]'); await wait(400);
  const l1 = await page.evaluate(() => __regina.store.state.friends.kaya.level); if (!(l1 > l0)) throw new Error(`friendship did not grow ${l0} -> ${l1}`);
  await page.evaluate(() => __regina.phone.closeApp(true)); await page.evaluate(() => __regina.phone.close());
});
await step('town hall: vote + campaign', async () => {
  await openApp('townhall'); await wait(300); await shot('32-townhall');
  await page.click('[data-vote]'); await page.waitForSelector('.panel.menu'); await shot('32b-vote-confirm'); await page.click('.panel.menu .btn.primary'); await wait(400);
  const v = await page.evaluate(() => __regina.store.state.politics.vote); if (!v) throw new Error('vote not recorded');
  const b0 = await page.evaluate(() => __regina.store.state.bank.balance); await page.click('[data-don="1000"]'); await wait(300);
  const b1 = await page.evaluate(() => __regina.store.state.bank.balance); if (b1 !== b0 - 1000) throw new Error('donation not charged'); await shot('33-townhall-voted');
  await page.evaluate(() => { __regina.phone.closeApp(true); __regina.phone.close(); });
});
await step('city hall interior: flyers for your candidate', async () => {
  await page.evaluate(() => __regina.enterInterior('cityhall')); await page.waitForFunction(() => __regina.inInterior === 'cityhall'); await wait(1300); await shot('34-cityhall');
  const p0 = await page.evaluate(() => __regina.store.state.politics.points);
  await page.evaluate(() => { __regina.player.pos.x = -4.2; __regina.player.pos.z = 2.4; }); await pressE('flyers'); await page.waitForSelector('.prog-panel'); await page.waitForFunction(() => !document.querySelector('.prog-panel'), null, { timeout: 30000 });
  const p1 = await page.evaluate(() => __regina.store.state.politics.points); if (!(p1 > p0)) throw new Error('flyers did not raise campaign strength');
  await page.evaluate(() => __regina.exitInterior()); await page.waitForFunction(() => __regina.inInterior === null); await wait(600);
});
await step('intercity trip with scenario + souvenir', async () => {
  await openApp('trips'); await wait(300); await shot('35-trips');
  const b0 = await page.evaluate(() => __regina.store.state.bank.balance);
  await page.click('[data-go="moosejaw|bus"]'); await page.waitForSelector('.prog-panel'); await page.waitForSelector('.panel.event', { timeout: 40000 }); await shot('36-trip-event');
  await page.click('.panel.event [data-i="2"]'); await page.waitForSelector('.panel.event [data-ok]'); await page.click('.panel.event [data-ok]'); await page.waitForFunction(() => !document.querySelector('.panel.event'));
  const r = await page.evaluate(async () => ({ b: __regina.store.state.bank.balance, trips: __regina.store.state.trips.length, sou: __regina.store.state.souvenirs, fare: (await import('/src/data/destinations.js')).DESTINATION_BY_ID.moosejaw.modes.bus.fare })); if (r.b !== b0 - r.fare || r.trips !== 1 || !r.sou.includes('moosejaw')) throw new Error('trip not recorded ' + JSON.stringify(r));
});
await step('radio plays (generative) and stops', async () => {
  await openApp('radio'); await page.click('[data-st="lofi"]'); await wait(1500);
  const st = await page.evaluate(() => ({ s: __regina.radio.station, t: __regina.radio.nowTitle, ctx: __regina.radio.audio.ctx?.state })); if (st.s !== 'lofi') throw new Error('radio did not start ' + JSON.stringify(st));
  await shot('37-radio'); await page.click('[data-stop]'); await wait(300);
  if (await page.evaluate(() => __regina.radio.playing)) throw new Error('radio did not stop'); await page.evaluate(() => { __regina.phone.closeApp(true); __regina.phone.close(); });
});
await step('build mode: buy, place, paint', async () => {
  await page.evaluate(async () => { const H = await import('/src/core/home.js'); __regina.store.state.bank.balance = 500000; H.buyFurniture(__regina.store, 'armchair'); H.buyFurniture(__regina.store, 'plant'); H.buyFurniture(__regina.store, 'rug_round'); __regina.store.state.souvenirs.push('banff'); });
  await page.evaluate(() => __regina.enterInterior('apartment')); await page.waitForFunction(() => __regina.inInterior === 'apartment'); await wait(1200);
  await page.evaluate(() => __regina.build.start()); await wait(1800); await shot('38-build-empty');
  const frames = (n) => page.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const settle = async () => { await page.evaluate(() => __regina.settleBuildCam()); await frames(3); };   // the overhead camera glides after the sheet opens/closes; jump to its resting place so pixels map to the floor
  const pxAt = (x, z) => page.evaluate(([x, z]) => { const v = new (window.__regina.camera.position.constructor)(x, 0, z).project(window.__regina.camera); const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }; }, [x, z]);
  // the pieces we already own wait in storage: open the Buy sheet's "In storage" shelf, tap Place, then tap the floor
  for (const [type, x, z] of [['armchair', 0.5, 1.0], ['plant', -3.5, -0.4], ['poster_banff', -0.7, -3.2]]) {
    await page.click('#b-stored'); await page.waitForSelector(`.cat-sheet [data-act="place"][data-id="${type}"]`, { timeout: 30000 }); if (type === 'armchair') await shot('38b-catalogue-storage');
    await page.click(`.cat-sheet [data-act="place"][data-id="${type}"]`); await page.waitForFunction(() => !__regina.catalogue.isOpen && !!__regina.build.sel, null, { timeout: 30000 });
    await settle(); const p = await pxAt(x, z); await page.mouse.move(p.x, p.y); await wait(250); await page.mouse.click(p.x, p.y); await wait(400);
  }
  // Buy sheet: Esc hides the sheet only (not build mode), and tapping a card buys it through the validated rules and hands it over to place
  await page.click('#b-buy'); await page.waitForSelector('.cat-sheet [data-act="buy"]', { timeout: 30000 }); await shot('38c-catalogue-buy'); await page.keyboard.press('Escape'); await wait(500);
  if (!(await page.evaluate(() => __regina.build.active))) throw new Error('Esc on the Buy sheet also exited build mode');
  if (await page.evaluate(() => __regina.catalogue.isOpen)) throw new Error('Esc should hide the Buy sheet');
  const b0 = await page.evaluate(() => __regina.store.state.bank.balance); await page.click('#b-buy'); await page.waitForSelector('.cat-sheet [data-act="buy"]:not(.is-poor)', { timeout: 30000 });
  const want = await page.$eval('.cat-sheet [data-act="buy"]:not(.is-poor)', (el) => ({ id: el.dataset.id, label: el.getAttribute('aria-label') })); await page.click(`.cat-sheet [data-act="buy"][data-id="${want.id}"]`);
  await page.waitForFunction(() => !__regina.catalogue.isOpen && !!__regina.build.sel, null, { timeout: 30000 });
  const b1 = await page.evaluate(() => __regina.store.state.bank.balance); if (b1 >= b0) throw new Error('buying from the catalogue did not charge: ' + b0 + ' -> ' + b1 + ' ' + want.label);
  await page.keyboard.press('Escape'); await wait(300);
  const placed = await page.evaluate(() => __regina.store.state.home.placed.map((i) => i.type)); if (placed.length !== 3) throw new Error('expected 3 placed, got ' + placed.join(','));
  // blocked placement is refused (on top of the bed)
  await page.click('#b-stored'); await page.waitForSelector('.cat-sheet [data-act="place"][data-id="rug_round"]', { timeout: 30000 }); await page.click('.cat-sheet [data-act="place"][data-id="rug_round"]');
  await page.waitForFunction(() => !__regina.catalogue.isOpen && !!__regina.build.sel, null, { timeout: 30000 }); await settle(); const pb = await pxAt(-3.2, -3.9); await page.mouse.move(pb.x, pb.y); await wait(250); await page.mouse.click(pb.x, pb.y); await wait(300);
  if ((await page.evaluate(() => __regina.store.state.home.placed.length)) !== 3) throw new Error('a rug was placed on top of the bed');
  await page.keyboard.press('Escape'); await wait(300);
  // Design tab: paint and floors through the same sheet
  await page.evaluate(() => { __regina.store.state.bank.balance = Math.max(__regina.store.state.bank.balance, 5e6); });
  await page.click('#b-buy'); await page.waitForSelector('#cat-tab-design', { timeout: 30000 }); await page.click('#cat-tab-design'); await page.waitForSelector('.cat-sheet [data-act="style"][data-kind="wall"][data-key="sage"]', { timeout: 30000 });
  await page.click('.cat-sheet [data-act="style"][data-kind="wall"][data-key="sage"]'); await wait(300); await page.click('.cat-sheet [data-act="style"][data-kind="floor"][data-key="walnut"]'); await wait(500); await shot('38d-catalogue-design');
  await page.keyboard.press('Escape'); await wait(600);
  await shot('39-build-furnished');
  await page.evaluate(() => __regina.build.stop()); await wait(1500); await shot('40-home-furnished');
  if (await page.evaluate(() => __regina.store.state.home.wall) !== 'sage') throw new Error('paint not saved');
  await page.evaluate(() => __regina.exitInterior()); await page.waitForFunction(() => __regina.inInterior === null); await wait(600);
});
await step('placed treadmill is usable at home and trains fitness', async () => {
  const spot = await page.evaluate(async () => {
    const H = await import('/src/core/home.js'), st = __regina.store; st.state.bank.balance = Math.max(st.state.bank.balance, 5e6);
    if (!H.buyFurniture(st, 'treadmill').ok) return null;
    for (let z = 4.5; z >= -4.5; z -= 0.5) for (let x = -3.5; x <= 3.5; x += 0.5) if (H.canPlace(st.state, 'treadmill', x, z, 0).ok && H.placeFurniture(st, 'treadmill', x, z, 0).ok) return { x, z };
    return null;
  });
  if (!spot) throw new Error('no room for a treadmill');
  await page.evaluate(() => __regina.enterInterior('apartment')); await page.waitForFunction(() => __regina.inInterior === 'apartment'); await wait(1000);
  const f0 = await page.evaluate(() => { __regina.store.state.needs.energy = 90; return __regina.store.state.skills.fitness || 0; });
  await page.evaluate((sp) => { __regina.player.pos.x = sp.x; __regina.player.pos.z = sp.z + 1.4; }, spot);
  await pressE('treadmill'); await page.waitForSelector('.prog-panel'); await page.waitForFunction(() => !document.querySelector('.prog-panel'), null, { timeout: 30000 });
  const f1 = await page.evaluate(() => __regina.store.state.skills.fitness || 0); if (!(f1 > f0)) throw new Error(`home treadmill did not train fitness: ${f0} -> ${f1}`);
  await page.evaluate(() => __regina.exitInterior()); await page.waitForFunction(() => __regina.inInterior === null); await wait(600);
});
await step('home tab: live dollhouse view, edit chip, back outside', async () => {
  await page.click('#navbar [data-tab="home"]'); await page.waitForFunction(() => __regina.inInterior === 'apartment' && __regina.homeView, null, { timeout: 60000 }); await wait(2500);
  const on = await page.$eval('#navbar [data-tab="home"]', (b) => b.classList.contains('on')); if (!on) throw new Error('Home tab is not highlighted');
  const chips = await page.$$eval('#chiprow [data-chip]', (b) => b.map((x) => x.dataset.chip)); if (!['edit', 'paint', 'out'].every((c) => chips.includes(c))) throw new Error('home chips: ' + chips);
  await shot('40b-home-tab');
  // the player can still walk around the dollhouse; screen-left is world -x (A), and the entrance is hemmed in by the desk to the north
  const p0 = await page.evaluate(() => ({ x: __regina.player.pos.x, z: __regina.player.pos.z })); await page.keyboard.down('a'); await page.waitForFunction((p) => Math.hypot(__regina.player.pos.x - p.x, __regina.player.pos.z - p.z) > 0.8, p0, { timeout: 40000 }); await page.keyboard.up('a');
  const moved = await page.evaluate((p) => __regina.player.pos.x - p.x, p0); if (moved > -0.3) throw new Error('A should walk left (-x) in the dollhouse view, dx=' + moved);
  await page.click('#chiprow [data-chip="edit"]'); await page.waitForFunction(() => __regina.build.active, null, { timeout: 20000 }); await wait(800); await page.evaluate(() => __regina.build.stop()); await wait(800);
  if (!(await page.evaluate(() => __regina.homeView))) throw new Error('finishing an edit should return to the dollhouse view');
  await page.click('#chiprow [data-chip="out"]'); await page.waitForFunction(() => __regina.inInterior === null, null, { timeout: 60000 }); await wait(800);
  if (await page.evaluate(() => __regina.homeView)) throw new Error('home view should end when you go outside');
});
await step('night + snow rendering', async () => { await page.evaluate(() => { __regina.tp(0, 6); __regina.setWeather({ kind: 'snow', temp: -18, text: 'Snow', cloud: 90 }); __regina.store.state.settings.timeMode = 'fast'; }); await wait(1500); await shot('20-weather'); });
await step('fps sanity', async () => { const q = await page.evaluate(() => __regina.qLevel()); console.log('  quality level', q); });

await browser.close(); await server.close();
if (errors.length) { console.log('\nERRORS:\n' + errors.join('\n---\n')); process.exit(1); }
console.log('\nALL SMOKE STEPS PASSED');
