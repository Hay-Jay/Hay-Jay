#!/usr/bin/env node
// Downloads the catalogue photos that are missing from tools/fixtures/photos/ from the public Shopify CDN
// (width 1200, converted to JPEG). Optional: without it the emulator serves a grey placeholder for a missing photo.
//   node tools/fetch-photos.mjs [--width 1200] [--force]
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalogue } from './lib/catalogue.mjs';
import { spawnSync } from 'node:child_process';

// Node's fetch only honours the sandbox proxy when NODE_USE_ENV_PROXY=1 is set at start-up.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } });
  process.exit(r.status ?? 1);
}

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'fixtures', 'photos');
const args = process.argv.slice(2);
const width = Number(args[args.indexOf('--width') + 1]) || 1200;
const force = args.includes('--force');
mkdirSync(dir, { recursive: true });

const have = new Set(readdirSync(dir).map(f => f.split('.')[0]));
const cat = loadCatalogue();
const todo = [];
for (const p of cat.products) for (const im of p.images) if (force || !have.has(im.key)) todo.push(im);

console.log(`${cat.imageCount} catalogue photos, ${todo.length} to download`);
let ok = 0, fail = 0;
const queue = todo.slice();
async function worker() {
  for (let im; (im = queue.shift());) {
    const isPng = /\.png(\?|$)/i.test(im.src);
    const url = im.src + (im.src.includes('?') ? '&' : '?') + `width=${width}` + (isPng ? '' : '&format=jpg');
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      writeFileSync(join(dir, `${im.key}.${isPng ? 'png' : 'jpg'}`), Buffer.from(await r.arrayBuffer()));
      ok++;
    } catch (e) {
      fail++;
      console.error(`  failed ${im.src}: ${e.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
console.log(`downloaded ${ok}, failed ${fail}`);
process.exit(fail ? 1 : 0);
