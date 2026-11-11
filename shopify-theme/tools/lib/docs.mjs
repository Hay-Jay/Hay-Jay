// Shopify's own Liquid reference data (filters, tags, objects and their properties), downloaded once from
// Shopify/theme-liquid-docs into fixtures/liquid-docs. It lets the emulator tell "this is a typo" from "documented by
// Shopify but not emulated here".
import { join } from 'node:path';
import { FIXTURES_DIR, readJson } from './util.mjs';

let cached;
export function loadDocs() {
  if (cached) return cached;
  const dir = join(FIXTURES_DIR, 'liquid-docs');
  const filters = new Map(), tags = new Map(), objects = new Map();
  for (const f of readJson(join(dir, 'filters.json'), [])) filters.set(f.name, f);
  for (const t of readJson(join(dir, 'tags.json'), [])) tags.set(t.name, t);
  for (const o of readJson(join(dir, 'objects.json'), [])) {
    if (!objects.has(o.name)) objects.set(o.name, { ...o, props: new Set((o.properties || []).map(p => p.name)) });
  }
  cached = {
    filters, tags, objects,
    isFilter: n => filters.has(n),
    isTag: n => tags.has(n),
    isObject: n => objects.has(n),
    globalObjects: new Set([...objects.values()].filter(o => o.access && o.access.global).map(o => o.name)),
    hasProperty: (obj, prop) => !!objects.get(obj)?.props.has(prop)
  };
  return cached;
}
