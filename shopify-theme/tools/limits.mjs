// node tools/limits.mjs — schema rules Shopify enforces on upload that theme-check does not: a file that breaks one is dropped
// from the theme without a word (themeCreate) or refused (themeFilesUpsert). Exits 1 when anything breaks a rule.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_THEME_DIR } from './lib/util.mjs';

const root = process.argv[2] || DEFAULT_THEME_DIR;
const bad = [];
const URL_DEFAULTS = ['/collections', '/collections/all'];
function settings(list, where) {
  for (const s of list || []) {
    const id = s.id || s.type;
    if (typeof s.label === 'string' && s.label.length > 70) bad.push(`${where} ${id}: label is ${s.label.length} characters (max 70)`);
    if (s.type === 'url' && 'default' in s && !URL_DEFAULTS.includes(s.default)) bad.push(`${where} ${id}: a url default can only be /collections or /collections/all`);
    if (['product', 'collection', 'image_picker', 'page', 'blog', 'article', 'video'].includes(s.type) && 'default' in s) bad.push(`${where} ${id}: ${s.type} settings cannot have a default`);
    for (const o of s.options || []) if ((o.label || '').length > 70) bad.push(`${where} ${id}: option label over 70 characters`);
  }
}
for (const f of readdirSync(join(root, 'sections')).filter(f => f.endsWith('.liquid'))) {
  const m = /{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema/.exec(readFileSync(join(root, 'sections', f), 'utf8'));
  if (!m) continue;
  const d = JSON.parse(m[1]), where = `sections/${f}`;
  if ((d.name || '').length > 25) bad.push(`${where}: name over 25 characters`);
  settings(d.settings, where);
  for (const b of d.blocks || []) { if ((b.name || '').length > 25) bad.push(`${where} block ${b.type}: name over 25 characters`); settings(b.settings, `${where} block ${b.type}`); }
  for (const p of d.presets || []) if ((p.name || '').length > 25) bad.push(`${where} preset: name over 25 characters`);
}
for (const g of JSON.parse(readFileSync(join(root, 'config/settings_schema.json'), 'utf8'))) settings(g.settings, `settings_schema ${g.name}`);
for (const b of bad) console.log(b);
console.log(`-- ${bad.length} schema limit problem(s)`);
process.exit(bad.length ? 1 : 0);
