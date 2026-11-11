// node tools/check.mjs  — Shopify's own theme-check on theme/ (syntax, unknown filters/objects, schema, missing snippets/assets, translations...).
import { themeCheckRun } from '@shopify/theme-check-node';
import { DEFAULT_THEME_DIR } from './lib/util.mjs';
const root = process.argv[2] || DEFAULT_THEME_DIR;
const { offenses } = await themeCheckRun(root, undefined, m => { if (process.env.VERBOSE) console.error(m); });
const sev = ['ERROR', 'WARN ', 'info '];
const rel = u => u.replace('file://' + root + '/', '');
let counts = [0, 0, 0];
for (const o of offenses.sort((a, b) => a.severity - b.severity || rel(a.uri).localeCompare(rel(b.uri)))) {
  counts[o.severity]++;
  console.log(`${sev[o.severity]} ${rel(o.uri)}:${o.start.line + 1} [${o.check}] ${o.message}`);
}
console.log(`-- ${counts[0]} errors, ${counts[1]} warnings, ${counts[2]} info`);
process.exit(counts[0] ? 1 : 0);
