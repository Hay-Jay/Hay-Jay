// Builds the Shopify-shaped catalogue (prices in integer cents, ids, images, collections) from the prototype snapshot.
// The snapshot is `window.MONOCHROME_DATA` from /concepts/pages/classified/data/products.js, copied to fixtures/catalogue.js.
import vm from 'node:vm';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES_DIR, readText, readJson, md5_12, hashNum, handleize } from './util.mjs';

export const DEFAULT_CATALOGUE_FILE = process.env.MC_CATALOGUE || join(FIXTURES_DIR, 'catalogue.js');
const cents = v => Math.round(Number(v) * 100);

const COLLECTION_DEFAULTS = {
  frontpage: { title: 'Home page', description: '' },
  'new-arrivals': { title: 'NEW ARRIVALS', description: '' }
};

/** Loads and normalises the catalogue. `overrides` = { products: { handle: { available, tags, compare_at_price, variants: { id: {...} } } } }. */
export function loadCatalogue({ file = DEFAULT_CATALOGUE_FILE, overrides = null, inventory = 25 } = {}) {
  const w = {};
  vm.runInNewContext(readText(file), { window: w });
  const data = w.MONOCHROME_DATA;
  if (!data || !Array.isArray(data.products)) throw new Error(`${file}: no window.MONOCHROME_DATA.products`);
  const fileOverrides = readJson(join(FIXTURES_DIR, 'overrides.json'), {});
  const ov = { products: { ...(fileOverrides.products || {}), ...((overrides && overrides.products) || {}) } };
  const store = {
    name: data.store.name || 'Monochrome', url: data.store.url, currency: data.store.currency || 'CAD',
    city: data.store.city, province: data.store.province, country: data.store.country, shipsTo: data.store.shipsTo || [],
    syncedAt: data.syncedAt
  };
  let imageCount = 0;
  const imageByKey = new Map();
  const products = data.products.map((p, index) => {
    const o = ov.products[p.handle] || {};
    const id = 8000000000000 + hashNum(p.handle, 900000000);
    const optionNames = p.options.map(x => x.name);
    const images = p.images.map((im, i) => {
      const key = md5_12(im.src);
      const image = { id: 40000000000000 + hashNum(im.src, 90000000), key, src: im.src, width: im.w, height: im.h, alt: null, position: i + 1, product_id: id };
      imageByKey.set(key, image);
      imageCount++;
      return image;
    });
    const variants = p.variants.map((v, i) => {
      const vo = (o.variants && o.variants[v.id]) || {};
      const available = vo.available ?? (o.available === false ? false : v.available);
      const optionValues = v.options.length ? v.options : ['Default Title'];
      const price = vo.price ?? cents(v.price);
      return {
        id: v.id, position: i + 1, title: optionValues.join(' / '),
        option1: optionValues[0] ?? null, option2: optionValues[1] ?? null, option3: optionValues[2] ?? null,
        options: optionValues, price,
        compare_at_price: vo.compare_at_price ?? o.compare_at_price ?? null,
        available, sku: vo.sku ?? `MC-${String(v.id).slice(-6)}`, barcode: '',
        inventory_quantity: vo.inventory_quantity ?? (available ? inventory : 0),
        inventory_management: 'shopify', inventory_policy: 'deny',
        weight: 300, weight_unit: 'g', requires_shipping: p.category !== 'gift', taxable: true,
        image_index: vo.image_index ?? null
      };
    });
    const isGift = p.category === 'gift';
    return {
      id, handle: p.handle, title: o.title ?? p.title, type: o.type ?? p.type ?? '', vendor: o.vendor ?? store.name,
      tags: o.tags ?? [], category: p.category, template_suffix: o.template_suffix ?? null,
      description_text: p.description || '',
      description: o.description ?? (p.description ? `<p>${p.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : ''),
      published_at: o.published_at ?? p.publishedAt, created_at: o.created_at ?? p.publishedAt,
      collections: p.collections || [], options: optionNames.map((name, i) => ({ name, position: i + 1, values: p.options[i].values })),
      variants, images, gift_card: isGift, index
    };
  });
  const byHandle = new Map(products.map(p => [p.handle, p]));
  const collectionDefs = new Map();
  collectionDefs.set('all', { handle: 'all', title: 'Products', description: '', template_suffix: null });
  for (const c of data.collections || []) collectionDefs.set(c.handle, { handle: c.handle, title: c.title, description: COLLECTION_DEFAULTS[c.handle]?.description || '', template_suffix: null });
  for (const p of products) for (const h of p.collections) if (!collectionDefs.has(h)) collectionDefs.set(h, { handle: h, title: h.replace(/-/g, ' '), description: '', template_suffix: null });
  const extra = readJson(join(FIXTURES_DIR, 'collections.json'), {});
  const collections = [...collectionDefs.values()].map(c => ({ ...c, ...(extra[c.handle] || {}), id: 300000000000 + hashNum(c.handle, 90000000), image_key: null,
    handles: c.handle === 'all' ? products.map(p => p.handle) : products.filter(p => p.collections.includes(c.handle)).map(p => p.handle) }));
  const collectionByHandle = new Map(collections.map(c => [c.handle, c]));
  return { store, products, byHandle, collections, collectionByHandle, imageByKey, imageCount, handleize, file };
}

export const SORT_OPTIONS = [
  { name: 'Featured', value: 'manual' },
  { name: 'Best selling', value: 'best-selling' },
  { name: 'Alphabetically, A-Z', value: 'title-ascending' },
  { name: 'Alphabetically, Z-A', value: 'title-descending' },
  { name: 'Price, low to high', value: 'price-ascending' },
  { name: 'Price, high to low', value: 'price-descending' },
  { name: 'Date, old to new', value: 'created-ascending' },
  { name: 'Date, new to old', value: 'created-descending' }
];

export const priceMin = p => Math.min(...p.variants.map(v => v.price));
export const priceMax = p => Math.max(...p.variants.map(v => v.price));

/** Sorts raw product records like Shopify's collection sort_by values. */
export function sortProducts(list, sortBy) {
  const l = list.slice();
  const t = p => Date.parse(p.published_at) || 0;
  switch (sortBy) {
    case 'title-ascending': return l.sort((a, b) => a.title.localeCompare(b.title));
    case 'title-descending': return l.sort((a, b) => b.title.localeCompare(a.title));
    case 'price-ascending': return l.sort((a, b) => priceMin(a) - priceMin(b));
    case 'price-descending': return l.sort((a, b) => priceMax(b) - priceMax(a));
    case 'created-ascending': return l.sort((a, b) => t(a) - t(b));
    case 'created-descending': return l.sort((a, b) => t(b) - t(a));
    case 'best-selling': return l.sort((a, b) => (a.index * 7 % 11) - (b.index * 7 % 11));
    default: return l;
  }
}
