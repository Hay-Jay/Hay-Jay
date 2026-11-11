// node kit/src/render.cjs  -> kit/*.png  (exact pixel sizes)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'kit.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const out = path.join(__dirname, '..'); const dirs = { pfp:'profile', pfp2:'profile', banner:'banner', og:'banner' };
  for (const id of await p.$$eval('.board', els => els.map(e => e.id))) {
    const sub = id.startsWith('c-') ? 'covers' : id.startsWith('h-') ? 'highlights' : dirs[id];
    fs.mkdirSync(path.join(out, sub), { recursive: true });
    const name = id === 'pfp' ? 'profile-photo-monogram' : id === 'pfp2' ? 'profile-photo-wordmark' : id === 'banner' ? 'banner-1500x500' : id === 'og' ? 'share-card-1200x630' : id.replace(/^[ch]-/, '');
    await (await p.$('#' + id)).screenshot({ path: path.join(out, sub, name + '.png') }); console.log(sub + '/' + name);
  }
  await b.close(); })();
