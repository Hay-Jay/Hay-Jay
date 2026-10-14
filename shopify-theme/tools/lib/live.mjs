// Helpers for checking the uploaded theme on the real store before it is published: every page is opened with
// ?preview_theme_id=<id>, which Shopify remembers in a cookie for the rest of the browser context.
import { chromium } from 'playwright-core';

export const STORE = process.env.STORE || 'https://monochrome.com.ng';
export const THEME_ID = process.env.THEME_ID || '189220749566';

export async function launch() {
  return chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  });
}

/** A browser context already on the preview theme. Phone sizes get touch and a mobile user agent. */
export async function previewContext(browser, { w = 1440, h = 900, js = true } = {}) {
  const phone = w < 700;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: js, hasTouch: phone, isMobile: phone, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(`${STORE}/?preview_theme_id=${THEME_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.close();
  return ctx;
}

/** Opens a path on the preview theme and records page errors, console errors and failed requests on page.errs. */
export async function open(ctx, path, { wait = 1200 } = {}) {
  const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.errs = [];
  p.on('pageerror', e => p.errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console: ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400 && new URL(r.url()).host.endsWith('monochrome.com.ng')) p.errs.push(`http ${r.status()} ${r.url()}`); });
  const sep = path.includes('?') ? '&' : '?';
  const res = await p.goto(`${STORE}${path}${sep}preview_theme_id=${THEME_ID}`, { waitUntil: 'load', timeout: 60000 });
  p.status = res ? res.status() : 0;
  await p.waitForTimeout(wait);
  const html = await p.content();
  p.themeOk = html.includes(`"id":${THEME_ID}`);
  p.liquidErrors = [...html.matchAll(/Liquid (?:syntax )?error[^<]{0,200}/gi)].map(m => m[0]);
  return p;
}
