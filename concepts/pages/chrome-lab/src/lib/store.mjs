// Turns data/products.js (a Shopify sync) into the lists the pages need: cards, order, gallery selection, related pieces, countries.
import { isHeic, tidy } from './util.mjs';

export const CAT = { top: 'Tops', bottom: 'Bottoms', accessory: 'Objects', gift: 'Gift cards' };
export const CAT_ONE = { top: 'Top', bottom: 'Bottom', accessory: 'Object', gift: 'Gift card' };
export const CAT_KEYS = ['top', 'bottom', 'accessory', 'gift'];

export const SORTS = {
  featured: (a, b) => b.avail - a.avail || b.rank - a.rank || b.p - a.p,
  new: (a, b) => b.avail - a.avail || b.pub - a.pub,
  low: (a, b) => b.avail - a.avail || a.p - b.p,
  high: (a, b) => b.avail - a.avail || b.p - a.p
};

// Chrome-lab gallery: a curated running order, not a recency sort. It opens on dark model shots, alternates clothes with
// chrome close-ups, keeps to three rings, leaves out the pale ring-on-card photo (it stays in the shop) and ends on the gift card.
// Anything not named here (new drops after a product sync) follows in front-page / newest order.
const ORDER = ['monochrome-sweatshirt', 'royal-black', 'black-monochrome-jersey', 'monochrome-pants-chain', 'acid-washed-monochrome-hoodie',
  'black-signet-ring', 'monochrome-acid-washed-black', 'monochrome-cargo-skirt', 'custom-monochrome-jersey', 'silver-signet-ring',
  'long-sleeve-monochrome-t-shirt', 'monochrome-cargo-shorts-black', 'monochrome-sleeveless-crop-top', 'white-monochrome-jersey',
  'monochrome-acid-washed-grey', 'monochrome-cross-necklace'];
const OFF_MOOD = ['black-trinity-ring'];
export const GL_MAX = 18;

// The four pieces on the home page (dark model shots, one of each kind).
export const FEATURED = ['monochrome-sweatshirt', 'black-monochrome-jersey', 'monochrome-cargo-skirt', 'black-signet-ring'];

export function derive(DATA) {
  const base = DATA.products.map(p => {
    const mainIm = p.images.find(i => !isHeic(i.src)) || p.images[0] || null;
    const altIm = p.images.filter(i => !isHeic(i.src))[1] || null;
    const isNew = p.collections.includes('new-arrivals');
    return {
      h: p.handle, n: tidy(p.title), raw: p.title, p: p.price, pMax: p.priceMax, t: p.category, type: p.type || '', avail: p.available,
      sizes: p.sizes, main: mainIm, alt: altIm, isNew,
      rank: isNew ? 2 : p.collections.length ? 1 : 0,
      pub: Date.parse(p.publishedAt) || 0,
      d: p
    };
  }).sort((a, b) => b.avail - a.avail);

  const featured = [...base].sort(SORTS.featured);
  featured.forEach((x, i) => { x.ord = i; });
  const byHandle = h => base.find(x => x.h === h);

  const isRing = x => /ring/i.test(x.type + ' ' + x.h);
  const gallery = (() => {
    const ok = x => x.avail && x.main && x.t !== 'gift' && !OFF_MOOD.includes(x.h);
    const out = []; let rings = 0;
    const take = x => { if (!x || !ok(x) || out.includes(x)) return; if (isRing(x) && ++rings > 3) return; out.push(x); };
    ORDER.forEach(h => take(byHandle(h)));
    [...base].filter(ok).sort((a, b) => b.rank - a.rank || b.pub - a.pub || b.p - a.p).forEach(x => { if (out.length < GL_MAX - 1) take(x); });
    const gift = base.find(x => x.t === 'gift' && x.avail && x.main);
    if (gift) out.push(gift);
    return out.slice(0, GL_MAX);
  })();

  // related: same kind first (available first), then the rest in featured order
  const related = x => {
    const rest = featured.filter(y => y !== x);
    const same = rest.filter(y => y.t === x.t);
    const other = rest.filter(y => y.t !== x.t);
    return [...same, ...other].sort((a, b) => b.avail - a.avail).slice(0, 4);
  };

  return { items: base, featured, byHandle, gallery, related, isRing };
}

export const priceText = (x, fmt) => (x.pMax > x.p ? 'From ' : '') + fmt(x.p);

// Country names for the shipsTo codes, Canada and Nigeria first.
export function destinations(DATA) {
  const codes = (DATA.store && DATA.store.shipsTo) || [];
  const dn = new Intl.DisplayNames(['en'], { type: 'region' });
  const name = c => dn.of(c) || c;
  const pin = ['CA', 'NG'];
  const sorted = [...codes].sort((a, b) => (pin.includes(b) - pin.includes(a)) || (pin.includes(a) && pin.includes(b) ? pin.indexOf(a) - pin.indexOf(b) : name(a).localeCompare(name(b))));
  return { codes, sorted, name, count: codes.length, has: c => codes.includes(c) };
}
