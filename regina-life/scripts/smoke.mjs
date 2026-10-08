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
const step = async (name, fn) => { try { await fn(); console.log('PASS', name); } catch (e) { errors.push(`STEP ${name}: ${e.message}`); console.log('FAIL', name, e.message); } };
const wait = (ms) => page.waitForTimeout(ms);

await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' });
await step('loads to title', async () => { await page.waitForSelector('#title.on', { timeout: 90000 }); await wait(800); await shot('01-title'); });
await step('new life → creator', async () => { await page.click('#btn-new'); await page.waitForSelector('.panel.char', { timeout: 5000 }); await wait(1200); await shot('02-creator'); });
await step('creator customisation', async () => {
  await page.click('.panel.char [data-tab="hair"]'); await page.click('.panel.char [data-k="hair"][data-v="afro"]'); await wait(300);
  await page.click('.panel.char [data-tab="face"]'); await page.click('.panel.char [data-k="facialHair"][data-v="full"]'); await page.click('.panel.char [data-k="skin"][data-v="5"]'); await wait(500); await shot('03-creator-face');
  await page.click('.panel.char [data-tab="outfit"]'); await wait(200); await page.fill('[data-name]', 'Riley'); await page.click('.panel.char [data-rand]'); await wait(300); await page.click('.panel.char [data-done]');
});
await step('gameplay starts', async () => { await page.waitForFunction(() => window.__regina?.mode === 'play'); await page.evaluate(() => { __regina.store.state.flags = { daniCall: true, offerCall: true }; }); await wait(1500); await shot('04-play'); });
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
await step('close phone', async () => { await page.keyboard.press('p'); await wait(600); });
await step('full map', async () => { await page.keyboard.press('m'); await wait(800); await shot('12-map'); await page.keyboard.press('m'); });
await step('enter market via door', async () => {
  await page.evaluate(() => __regina.tp(30, 9.8)); await wait(1200);
  const t = await page.evaluate(() => __regina.getTarget()?.label); if (!/Market/.test(t || '')) throw new Error('no door prompt: ' + t);
  await shot('13-door-prompt'); await page.keyboard.press('e'); await page.waitForFunction(() => __regina.inInterior === 'market', null, { timeout: 8000 }); await wait(1200); await shot('14-market');
});
await step('buy groceries', async () => {
  await page.evaluate(() => { __regina.player.pos.x = -2.9; __regina.player.pos.z = 1.35; }); await wait(400);
  const t = await page.evaluate(() => __regina.getTarget()?.label); if (!/Browse/.test(t || '')) throw new Error('no shelf prompt: ' + t);
  await page.keyboard.press('e'); await page.waitForSelector('.panel.shop'); await shot('15-shop');
  const b0 = await page.evaluate(() => __regina.store.state.bank.balance); await page.click('[data-buy]'); await wait(200);
  const b1 = await page.evaluate(() => __regina.store.state.bank.balance); if (b1 >= b0) throw new Error('balance did not drop'); await page.click('.panel .x');
});
await step('job loop: apply → hire → shift → paid', async () => {
  await page.evaluate(async () => { const G = __regina.G, s = __regina.store; G.applyForJob(s, 'retail'); s.state.job.application.offerAt = 0; G.tickJobs(s); G.acceptOffer(s); });
  await page.evaluate(() => { __regina.player.pos.x = 3.6; __regina.player.pos.z = 5.4; }); await wait(400);
  await page.keyboard.press('e'); await page.waitForSelector('.panel.menu'); await page.click('.panel.menu .btn.primary'); await wait(300);
  const total = await page.evaluate(() => __regina.store.state.job.shift.tasksTotal);
  for (let i = 0; i < total; i++) {
    await page.evaluate(() => { __regina.player.pos.x = 4.2; __regina.player.pos.z = -5.9; }); await wait(300); await page.keyboard.press('e'); await wait(200);
    if (i === 0) await shot('16-carrying');
    const pos = await page.evaluate(() => __regina.stationTarget());
    if (!pos) throw new Error('no station target helper');
    await page.evaluate((p) => { __regina.player.pos.x = p.x; __regina.player.pos.z = p.z; }, pos); await wait(300); await page.keyboard.press('e'); await wait(250);
  }
  await page.evaluate(() => { __regina.player.pos.x = 3.6; __regina.player.pos.z = 5.4; }); await wait(300);
  const bal0 = await page.evaluate(() => __regina.store.state.bank.balance);
  await page.keyboard.press('e'); await wait(400);
  const done = await page.evaluate(() => __regina.store.state.job.shift);
  // anti-exploit: instant finish must be refused
  if (!done) throw new Error('instant pay was allowed (shift cleared)');
  await page.evaluate(() => { __regina.store.state.job.shift.startedAt -= 120000; }); // simulate time passing
  await page.keyboard.press('e'); await wait(400);
  const bal1 = await page.evaluate(() => __regina.store.state.bank.balance); if (bal1 <= bal0) throw new Error('not paid');
  await shot('17-paid');
});
await step('exit market', async () => { await page.evaluate(() => __regina.exitInterior()); await page.waitForFunction(() => __regina.inInterior === null); await wait(600); });
await step('apartment interior', async () => { await page.evaluate(() => __regina.enterInterior('apartment')); await page.waitForFunction(() => __regina.inInterior === 'apartment'); await wait(1300); await shot('18-apartment'); await page.evaluate(() => { __regina.player.pos.x = -2; __regina.player.pos.z = -2.6; }); await wait(900); await shot('18b-apartment-bed'); await page.evaluate(() => __regina.exitInterior()); await wait(900); });
await step('threads interior', async () => { await page.evaluate(() => __regina.enterInterior('threads')); await page.waitForFunction(() => __regina.inInterior === 'threads'); await wait(1300); await shot('19-threads'); await page.evaluate(() => __regina.exitInterior()); await wait(900); });
await step('night + snow rendering', async () => { await page.evaluate(() => { __regina.tp(0, 6); __regina.setWeather({ kind: 'snow', temp: -18, text: 'Snow', cloud: 90 }); __regina.store.state.settings.timeMode = 'fast'; }); await wait(1500); await shot('20-weather'); });
await step('fps sanity', async () => { const q = await page.evaluate(() => __regina.qLevel()); console.log('  quality level', q); });

await browser.close(); await server.close();
if (errors.length) { console.log('\nERRORS:\n' + errors.join('\n---\n')); process.exit(1); }
console.log('\nALL SMOKE STEPS PASSED');
