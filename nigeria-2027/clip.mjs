// "Receipts": screenshots real news articles for the videos, at 3x resolution.
// For each entry in clips.json it saves, under assets/clips/:
//   <id>-head.png   headline, date/byline and the top of the article photo
//   <id>-quote.png  the paragraph that contains the key sentence
//   <id>.json       where that sentence sits in the quote image (the video draws an
//                   animated highlighter over it), plus outlet, title and URL.
//   node clip.mjs            -> every clip that doesn't exist yet
//   node clip.mjs --force    -> redo all;  node clip.mjs <id> -> just one
// Short excerpts with the outlet credited, used for news commentary and fact-checking.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'assets', 'clips');
mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));
const clips = JSON.parse(readFileSync(path.join(here, 'clips.json'), 'utf8'))
  .filter(c => (!only.length || only.includes(c.id)) && (force || only.length || !existsSync(path.join(out, `${c.id}.json`))));

const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
// Phone-width layout at 3x: text wraps narrow, so it stays big and sharp when scaled up in the 1080px video.
const VW = 600;
const ctx = await browser.newContext({ viewport: { width: VW, height: 1400 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'en-NG',
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' });
let failed = 0;

for (const c of clips) {
  const page = await ctx.newPage();
  try {
    await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3500);
    const info = await page.evaluate(({ find, headline }) => {
      // strip ads, popups and sticky bars
      document.querySelectorAll('iframe, ins, .adsbygoogle, [id^="google_ads"], [class*="advert"], [id*="advert"], [class*="cookie"], [id*="cookie"], [class*="popup"], [class*="newsletter"]').forEach(e => e.remove());
      for (const e of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(e);
        if (cs.position === 'fixed' || cs.position === 'sticky') e.remove();
      }
      document.documentElement.style.scrollBehavior = 'auto';
      const h1 = document.querySelector('article h1, h1.entry-title, h1');
      if (!h1) return { error: 'no headline' };
      const norm = s => s.replace(/\s+/g, ' ').toLowerCase();
      const paras = [...document.querySelectorAll('article p, .entry-content p, .post-content p, main p, p')];
      if (headline) {
        const sy = scrollY, b = h1.getBoundingClientRect(), r = document.createRange(); r.selectNodeContents(h1);
        const col = h1.parentElement.getBoundingClientRect().width > 300 ? h1.parentElement.getBoundingClientRect() : b;
        return { headline: true, h1: { x: b.left, y: b.top + sy, w: b.width, h: b.height }, col: { x: col.left, y: col.top + sy, w: col.width, h: col.height },
          rects: [...r.getClientRects()].filter(q => q.width > 2).map(q => ({ x: q.left, y: q.top + sy, w: q.width, h: q.height })), title: h1.textContent.trim(), date: '', sentence: h1.textContent.trim() };
      }
      const visible = el => { const b = el.getBoundingClientRect(); return b.width > 250 && b.height > 18 && getComputedStyle(el).visibility !== 'hidden'; };
      const p = paras.find(el => visible(el) && find.some(f => norm(el.textContent).includes(norm(f))));
      if (!p) return { error: 'phrase not found: ' + find.join(' | ') };
      // map text nodes -> offsets, then highlight the whole sentence containing the phrase
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const nodes = []; let full = '';
      for (let n; (n = walker.nextNode());) { nodes.push([n, full.length]); full += n.textContent; }
      const lower = full.toLowerCase().replace(/\s/g, ' ');
      const f = find.map(x => x.toLowerCase()).find(x => lower.includes(x));
      let start = lower.indexOf(f), end = start + f.length;
      while (start > 0 && !/[.!?]\s/.test(full.slice(start - 2, start))) start--;
      const stop = full.slice(end).search(/[.!?](\s|$)/);
      end = stop < 0 ? full.length : end + stop + 1;
      const at = off => { for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i][1] <= off) return [nodes[i][0], Math.min(off - nodes[i][1], nodes[i][0].textContent.length)]; };
      const r = document.createRange(); r.setStart(...at(start)); r.setEnd(...at(end));
      const sy = scrollY;
      const box = el => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top + sy, w: b.width, h: b.height }; };
      const col = box(h1.parentElement.getBoundingClientRect().width > 300 ? h1.parentElement : h1);
      const pb = box(p);
      const rects = [...r.getClientRects()].filter(q => q.width > 2).map(q => ({ x: q.left, y: q.top + sy, w: q.width, h: q.height }));
      const meta = document.querySelector('meta[property="article:published_time"]')?.content || document.querySelector('time')?.getAttribute('datetime') || '';
      return { h1: box(h1), col, p: pb, rects, title: h1.textContent.trim(), date: meta, sentence: full.slice(start, end).trim() };
    }, { find: c.find || [], headline: !!c.headline });
    if (info.error) throw new Error(info.error);

    const pad = 16;
    if (info.headline) info.p = info.h1;
    const left = Math.max(0, Math.min(info.col.x, info.h1.x) - pad);
    const width = Math.min(VW - left, Math.max(info.col.w, info.h1.w) + pad * 2);
    const headTop = Math.max(0, info.h1.y - (c.above ?? 90));
    const headClip = { x: left, y: headTop, width, height: info.h1.h + (c.above ?? 90) + (c.below ?? 470) };
    const qClip = { x: Math.max(0, info.p.x - pad), y: Math.max(0, info.p.y - pad), width: Math.min(VW - Math.max(0, info.p.x - pad), info.p.w + pad * 2), height: info.p.h + pad * 2 };
    await page.screenshot({ path: path.join(out, `${c.id}-head.png`), clip: headClip, fullPage: true });
    const target = info.headline ? headClip : qClip;
    if (!info.headline) await page.screenshot({ path: path.join(out, `${c.id}-quote.png`), clip: qClip, fullPage: true });
    const rel = info.rects.map(q => ({ x: (q.x - target.x) / target.width, y: (q.y - target.y) / target.height, w: q.w / target.width, h: q.h / target.height }));
    writeFileSync(path.join(out, `${c.id}.json`), JSON.stringify({ id: c.id, outlet: c.outlet, url: c.url, title: info.title, date: c.date || info.date.slice(0, 10), sentence: info.sentence,
      head: { w: headClip.width, h: headClip.height }, quote: info.headline ? null : { w: qClip.width, h: qClip.height }, marksOn: info.headline ? 'head' : 'quote', marks: rel }, null, 1));
    console.log(`ok   ${c.id}: "${info.sentence.slice(0, 90)}"`);
  } catch (e) {
    failed++; console.log(`FAIL ${c.id}: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
// bundle every clip's metadata for the studio (works from file:// too)
const all = {};
for (const c of JSON.parse(readFileSync(path.join(here, 'clips.json'), 'utf8'))) {
  const f = path.join(out, `${c.id}.json`);
  if (existsSync(f)) all[c.id] = JSON.parse(readFileSync(f, 'utf8'));
}
writeFileSync(path.join(out, 'clips.js'), '// Generated by clip.mjs\nwindow.CLIPS = ' + JSON.stringify(all) + ';\n');
process.exitCode = failed ? 1 : 0;
