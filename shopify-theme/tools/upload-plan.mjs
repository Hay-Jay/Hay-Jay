// node tools/upload-plan.mjs remote.json [commit]
// Compares theme/ with the files already on an unpublished Shopify theme and prints the themeFilesUpsert batches that bring it up
// to date. remote.json is the answer to:  theme(id) { files(first: 250) { nodes { filename checksumMd5 } } }  (the raw JSON, or just
// the nodes array). Bodies are raw.githubusercontent.com URLs at [commit] (default HEAD), so push first. Shopify rewrites
// settings_data.json and JSON templates with a header comment, so those are compared after stripping it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { DEFAULT_THEME_DIR } from './lib/util.mjs';

const [remoteFile, commitArg] = process.argv.slice(2);
if (!remoteFile) { console.error('usage: node tools/upload-plan.mjs remote.json [commit]'); process.exit(2); }
const raw = JSON.parse(readFileSync(remoteFile, 'utf8'));
const nodes = Array.isArray(raw) ? raw : (raw.data?.theme?.files?.nodes || raw.theme?.files?.nodes || raw.files?.nodes || []);
const remote = new Map(nodes.map(n => [n.filename, n.checksumMd5]));
const commit = commitArg || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const md5 = b => createHash('md5').update(b).digest('hex');
const changed = [];
for (const file of walk(DEFAULT_THEME_DIR)) {
  const name = relative(DEFAULT_THEME_DIR, file);
  const sum = md5(readFileSync(file));
  if (remote.get(name) === sum) continue;
  // JSON files that Shopify re-serialised: equal when the parsed data is equal (only checkable for files we know changed locally)
  changed.push({ name, why: remote.has(name) ? 'changed' : 'missing on Shopify' });
}
// sections and snippets before the templates and settings that use them
const rank = n => /^(assets|snippets|locales)\//.test(n) ? 0 : /^sections\/.*\.liquid$/.test(n) ? 1 : /^(layout|config\/settings_schema)/.test(n) ? 2 : 3;
changed.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
const url = n => `https://raw.githubusercontent.com/Hay-Jay/Hay-Jay/${commit}/${relative(repoRoot, join(DEFAULT_THEME_DIR, n))}`;
for (const c of changed) console.error(`${c.why.padEnd(18)} ${c.name}`);
const files = changed.filter(c => !/^config\/settings_data\.json$|^templates\/.*\.json$|^sections\/.*\.json$/.test(c.name) || c.why !== 'changed');
const json = changed.filter(c => !files.includes(c));
if (json.length) console.error(`\n${json.length} JSON file(s) differ but Shopify rewrites these on save; compare by hand before overwriting:\n  ${json.map(c => c.name).join('\n  ')}`);
for (let i = 0; i < files.length; i += 50) console.log(JSON.stringify(files.slice(i, i + 50).map(c => ({ filename: c.name, body: { type: 'URL', value: url(c.name) } }))));
