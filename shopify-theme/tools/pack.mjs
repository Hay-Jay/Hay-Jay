// node tools/pack.mjs — zips theme/ into dist/monochrome-classified.zip, the layout Shopify's "Upload zip file" and themeCreate expect
// (layout/, templates/, sections/... at the top of the archive, no wrapper folder).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const themeDir = join(root, 'theme'), out = join(root, 'dist', 'monochrome-classified.zip');
const DIRS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];

if (!existsSync(join(themeDir, 'layout/theme.liquid'))) throw new Error('theme/layout/theme.liquid is missing');
// Shopify parses every file with Ruby Liquid on upload and rejects the whole zip on one bad file; check first when Ruby is here
try { execFileSync('ruby', ['-e', 'require "liquid"'], { stdio: 'ignore' }); } catch { console.warn('ruby + liquid gem not found: skipping tools/liquid-check.rb (gem install liquid)'); }
try { execFileSync('ruby', [join(root, 'tools/liquid-check.rb')], { stdio: ['ignore', 'pipe', 'inherit'] }); } catch (e) { if (e.stdout) { process.stdout.write(e.stdout); throw new Error('Liquid that Shopify cannot parse: fix the files above'); } }
execFileSync('node', [join(root, 'tools/limits.mjs'), themeDir], { stdio: 'inherit' });
mkdirSync(dirname(out), { recursive: true });
rmSync(out, { force: true });
// -X drops extra file attributes, -D leaves out directory entries, so the archive only holds theme files
execFileSync('zip', ['-q', '-r', '-X', '-D', out, ...DIRS.filter(d => existsSync(join(themeDir, d))), '-x', '*.DS_Store'], { cwd: themeDir, stdio: 'inherit' });
const files = execFileSync('unzip', ['-Z1', out], { encoding: 'utf8' }).trim().split('\n');
console.log(`${out}\n${files.length} files, ${(statSync(out).size / 1024).toFixed(0)} KB`);
