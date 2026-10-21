// Small shared helpers for the MONOCHROME harness (Node 22, stdlib only).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS_DIR = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
export const THEME_REPO = join(TOOLS_DIR, '..');
export const DEFAULT_THEME_DIR = join(THEME_REPO, 'theme');
export const FIXTURES_DIR = join(TOOLS_DIR, 'fixtures');
export const CACHE_DIR = join(TOOLS_DIR, '.cache');
export const PROTOTYPE_DIR = '/home/user/Hay-Jay/concepts/pages/classified';

export const md5 = s => createHash('md5').update(String(s)).digest('hex');
export const sha1 = s => createHash('sha1').update(String(s)).digest('hex');
export const md5_12 = s => md5(s).slice(0, 12);
export const hashNum = (s, mod = 900000000) => parseInt(md5(s).slice(0, 8), 16) % mod;

/** Removes /* ... *\/ and // ... comments outside of JSON strings (Shopify allows a leading comment block in JSON files). */
export function stripJsonComments(text) {
  let out = '', i = 0, inStr = false;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\') { out += text[i + 1] ?? ''; i += 2; continue; }
      if (c === '"') inStr = false;
      i++;
    } else if (c === '"') { inStr = true; out += c; i++; }
    else if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; }
    else if (c === '/' && n === '/') { const e = text.indexOf('\n', i + 2); i = e < 0 ? text.length : e; }
    else { out += c; i++; }
  }
  return out;
}

/** JSON.parse that accepts Shopify's commented JSON. Throws an Error whose message names the file and position. */
export function parseShopifyJson(text, file = '') {
  const clean = stripJsonComments(String(text).replace(/^﻿/, ''));
  try { return JSON.parse(clean); }
  catch (e) {
    const m = /position (\d+)/.exec(e.message);
    let where = '';
    if (m) {
      const pos = +m[1], upto = clean.slice(0, pos), line = upto.split('\n').length, col = pos - upto.lastIndexOf('\n');
      where = ` (line ${line}, column ${col})`;
    }
    const err = new Error(`${file ? file + ': ' : ''}invalid JSON${where}: ${e.message}`);
    err.jsonError = true;
    throw err;
  }
}

export const readText = f => readFileSync(f, 'utf8');
export function readJson(file, fallback = undefined) {
  if (!existsSync(file)) { if (fallback !== undefined) return fallback; throw new Error(`missing file ${file}`); }
  return parseShopifyJson(readText(file), file);
}

export function walk(dir, filter = () => true) {
  const out = [];
  if (!existsSync(dir)) return out;
  (function rec(d) {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name), st = statSync(p);
      if (st.isDirectory()) rec(p);
      else if (filter(p)) out.push(p);
    }
  })(dir);
  return out;
}
export const rel = (root, p) => relative(root, p).split(sep).join('/');

export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const escapeAttr = escapeHtml;
export const stripHtml = s => String(s ?? '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]*>/gi, '');
export const handleize = s => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const isNil = v => v === null || v === undefined;
export const isBlank = v => isNil(v) || v === false || (typeof v === 'string' && /^\s*$/.test(v)) || (Array.isArray(v) && v.length === 0);
export const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
export const uniq = a => [...new Set(a)];
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const titleCase = s => String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Parses --key value / --flag / --key=value style arguments. `multi` names may repeat. */
export function parseArgs(argv, { boolean = [], multi = [], alias = {} } = {}) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    let [k, v] = a.slice(2).split(/=(.*)/s, 2);
    k = alias[k] || k;
    if (boolean.includes(k)) { out[k] = v === undefined ? true : v !== 'false'; continue; }
    if (v === undefined) v = argv[++i];
    if (multi.includes(k)) (out[k] ||= []).push(v); else out[k] = v;
  }
  return out;
}

export function formatDuration(ms) { return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`; }
export function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
export function padL(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
