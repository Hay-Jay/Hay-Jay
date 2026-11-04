/**
 * Bundle up (docs/AMAZING.md D10): out on a Regina winter street your character pulls on the warmest things you OWN. It only changes how you are
 * drawn outdoors; your saved outfit stays exactly as you picked it, and indoors you wear it again. Nothing is bought or handed out here.
 * Pure rules: look + wardrobe + weather in, a look out.
 */
import { CLOTHES } from '../data/catalog.js';

export const BUNDLE_AT = -5;    // °C and colder: toque and a warm top
export const SCARF_AT = -15;    // °C and colder: add a scarf
const WARM_TOP = { puffer: 4, jacket: 3, sweater: 2, hoodie: 2 };
const WARM_HEAD = { trapper: 3, toque: 2, beanie: 1 };   // a ball cap or a bucket hat is no use at -20

const owned = (wardrobe, slot, ok) => (Array.isArray(wardrobe) ? wardrobe : []).map((id) => CLOTHES[id]).filter((c) => c && c.slot === slot && ok(c));
// warmest first (style, then the dearer coat: the parka beats the field jacket), then id so the pick never flickers
const best = (list) => list.sort((a, b) => (WARM_TOP[b.style] || 0) - (WARM_TOP[a.style] || 0) || b.price - a.price || (a.id < b.id ? -1 : 1))[0] ?? null;

/** True when it is cold enough out to bundle up. temp in °C (null = unknown, never). */
export const bundleWeather = (temp, outdoors = true) => outdoors && Number.isFinite(temp) && temp <= BUNDLE_AT;

/** The look to draw: the player's own look, with warm owned pieces swapped in when it is cold outside. Returns the same object if nothing changes. */
export function bundledLook(look, wardrobe, { temp, outdoors = true, on = true } = {}) {
  if (!on || !look || !bundleWeather(temp, outdoors)) return look;
  const out = { ...look }; let changed = false;
  if (!WARM_TOP[CLOTHES[look.top]?.style]) { const t = best(owned(wardrobe, 'top', (c) => WARM_TOP[c.style])); if (t) { out.top = t.id; changed = true; } }
  if (!WARM_HEAD[CLOTHES[look.head]?.style]) { const h = owned(wardrobe, 'head', (c) => WARM_HEAD[c.style]).sort((a, b) => WARM_HEAD[b.style] - WARM_HEAD[a.style] || (a.id < b.id ? -1 : 1))[0]; if (h) { out.head = h.id; changed = true; } }
  if (temp <= SCARF_AT && CLOTHES[look.neck]?.style !== 'scarf') { const n = owned(wardrobe, 'neck', (c) => c.style === 'scarf').sort((a, b) => (a.id < b.id ? -1 : 1))[0]; if (n) { out.neck = n.id; changed = true; } }
  return changed ? out : look;
}

/** Is this look dressed for the cold (a warm top and a warm hat)? Moodlets use it. */
export const dressedWarm = (look) => !!WARM_TOP[CLOTHES[look?.top]?.style] && !!WARM_HEAD[CLOTHES[look?.head]?.style];

/** What is still missing for the cold, from what you own: [] when you are set. Used for a one-line hint. */
export function bundleGaps(look, wardrobe) {
  const gaps = [];
  if (!WARM_TOP[CLOTHES[look?.top]?.style] && !owned(wardrobe, 'top', (c) => WARM_TOP[c.style]).length) gaps.push('a warm coat');
  if (!WARM_HEAD[CLOTHES[look?.head]?.style] && !owned(wardrobe, 'head', (c) => WARM_HEAD[c.style]).length) gaps.push('a toque');
  return gaps;
}
