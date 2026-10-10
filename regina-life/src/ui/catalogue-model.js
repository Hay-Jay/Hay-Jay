/**
 * Pure view-model for the Buy sheet ("Catalogue"): (state, tab, balance) -> tabs and card models. No DOM, no THREE, no ledger writes
 * except the three thin action wrappers at the bottom (which only call the validated rules in core/home.js).
 * Reads the furniture data DEFENSIVELY: CATEGORIES / sizeLabel / tierStars exist once the expanded catalogue lands and have local fallbacks.
 */
import * as FD from '../data/furniture.js';
import { itemDef, ownedCount, availableToPlace, ownedTypes, buyFurniture, sellFurniture, setStyle } from '../core/home.js';

const X = { ...FD }; // a plain copy so optional exports can be missing without a build warning
export const TAB_DESIGN = 'design', TAB_STORAGE = 'in-storage', TAB_MORE = 'more';
const FURN = () => X.FURNITURE ?? {};
const norm = (s) => String(s ?? '').trim().toLowerCase();
const EMOJI = { seating: '🛋️', tables: '🪑', storage: '🗄️', decor: '🪴', rugs: '🟫', sleep: '🛏️', kitchen: '🍳', bath: '🛁', comfort: '🛋️', fun: '🎮', skills: '📚', light: '💡', lighting: '💡' };

/* ---------- data helpers (with fallbacks for the pre-expansion catalogue) ---------- */
export const sellRatio = () => (Number.isFinite(X.SELL_RATIO) ? X.SELL_RATIO : 0.5);
export const sellPct = () => Math.round(sellRatio() * 100);
export const sellPriceOf = (price) => Math.floor((Number(price) || 0) * sellRatio());
export const bannerText = () => `Selling pays ${sellPct()}% of list price. Pieces you own but have not placed wait in storage.`;
export const needText = (shortBy, fmt) => `Need ${fmt(shortBy)} more`;

/** Footprint tag like '2x1' (longer side first). Uses the data module's sizeLabel when it exists. */
export function sizeOf(def) {
  if (typeof X.sizeLabel === 'function') { try { const s = X.sizeLabel(def); if (s) return String(s); } catch { /* fall through */ } }
  const TILE = 0.75, a = Math.max(1, Math.round((def.w || 0) / TILE)), b = Math.max(1, Math.round((def.d || 0) / TILE));
  return `${Math.max(a, b)}x${Math.min(a, b)}`;
}
/** Quality tier 1..4. */
export function starsOf(def) {
  let n = def.tier ?? 1;
  if (typeof X.tierStars === 'function') { try { n = X.tierStars(def); } catch { /* keep def.tier */ } }
  n = Math.round(Number(n)); return Number.isFinite(n) ? Math.min(4, Math.max(1, n)) : 1;
}

/** Category list, 'Design' first: the data module's CATEGORIES, or one derived from each item's `cat` field. */
export function categories() {
  let list = Array.isArray(X.CATEGORIES) && X.CATEGORIES.length ? X.CATEGORIES.map((c) => ({ id: String(c.id), label: String(c.label ?? c.id), emoji: c.emoji ?? EMOJI[norm(c.id)] ?? '' }))
    : [...new Set(Object.values(FURN()).map((f) => f.cat).filter(Boolean))].map((c) => ({ id: String(c), label: String(c), emoji: EMOJI[norm(c)] ?? '📦' }));
  const isDesign = (c) => norm(c.id) === TAB_DESIGN || norm(c.label) === TAB_DESIGN;
  const design = list.find(isDesign) ?? { id: TAB_DESIGN, label: 'Design', emoji: '🎨' };
  list = [{ ...design, id: TAB_DESIGN, emoji: design.emoji || '🎨' }, ...list.filter((c) => !isDesign(c))];
  return list;
}
const inCategory = (def, c) => norm(def.cat) === norm(c.id) || norm(def.cat) === norm(c.label);
/** Furniture whose `cat` matches none of the categories (so nothing is ever unreachable). */
const orphans = (cats) => Object.values(FURN()).filter((d) => !cats.some((c) => c.id !== TAB_DESIGN && inCategory(d, c)));

/** Total pieces owned but not placed (posters included). */
export const storageCount = (s) => ownedTypes(s).reduce((n, t) => n + Math.max(0, availableToPlace(s, t)), 0);

/** Tab strip: Design, every category, (More if needed), then the synthetic 'In storage' tab with its count. */
export function tabList(s) {
  const cats = categories(), tabs = cats.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji, kind: c.id === TAB_DESIGN ? 'design' : 'category' }));
  if (orphans(cats).length) tabs.push({ id: TAB_MORE, label: 'More', emoji: '✨', kind: 'category' });
  tabs.push({ id: TAB_STORAGE, label: 'In storage', emoji: '📦', kind: 'storage', count: storageCount(s) });
  return tabs;
}
/** Tab to show when asked for an unknown one: the first furniture category (or Design if there are none). */
export const defaultTab = () => (categories()[1] ?? categories()[0]).id;
export const hasTab = (s, id) => tabList(s).some((t) => t.id === id);

/* ---------- cards ---------- */
const byTierPrice = (a, b) => a.stars - b.stars || a.price - b.price || a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1);

/** One furniture card. `price` is the list price in cents; `sellPrice` is what selling a stored copy pays. */
export function pieceCard(def, s, balance) {
  const price = Math.max(0, Math.floor(def.price) || 0), owned = ownedCount(s, def.id), inStorage = Math.max(0, availableToPlace(s, def.id));
  return {
    kind: 'piece', id: def.id, name: def.name, cat: def.cat ?? '', color: def.color ?? '#e8d9a8', poster: !!def.poster,
    price, sizeLabel: sizeOf(def), stars: starsOf(def), owned, inStorage,
    canAfford: balance >= price, shortBy: Math.max(0, price - balance), sellPrice: def.poster ? 0 : sellPriceOf(price), canSell: !def.poster,
  };
}
/** Wall/floor swatches: `price` is the first-time price (list), `cost` what applying it costs right now (0 once owned). */
export function designCards(s, balance) {
  const h = s.home ?? {}, ownedW = Array.isArray(h.walls) ? h.walls : ['cream'], ownedF = Array.isArray(h.floors) ? h.floors : ['oak'];
  const mk = (kind, key, name, color, material, price, ownedList, cur) => {
    const owned = ownedList.includes(key), cost = owned ? 0 : price;
    return { kind, id: `${kind}:${key}`, key, name, color, material, price, owned, active: cur === key, cost, canAfford: balance >= cost, shortBy: Math.max(0, cost - balance) };
  };
  return {
    walls: Object.entries(X.WALLS ?? {}).map(([k, [n, c]]) => mk('wall', k, n, c, null, X.WALL_PRICE ?? 0, ownedW, h.wall)),
    floors: Object.entries(X.FLOORS ?? {}).map(([k, [n, m, c]]) => mk('floor', k, n, c, m, X.FLOOR_PRICE ?? 0, ownedF, h.floor)),
  };
}
/** Owned-but-unplaced pieces as cards (each with inStorage > 0). */
export function storageCards(s, balance) {
  return ownedTypes(s).filter((t) => availableToPlace(s, t) > 0).map((t) => pieceCard(itemDef(t), s, balance)).filter((c) => c.inStorage > 0).sort(byTierPrice);
}

/** Everything the sheet draws for one tab: { id, label, emoji, kind, sections: [{ id, label, cards }], cards, empty }. */
export function tabView(s, tabId, balance) {
  const tabs = tabList(s), tab = tabs.find((t) => t.id === tabId) ?? tabs.find((t) => t.id === defaultTab()) ?? tabs[0];
  const view = { id: tab.id, label: tab.label, emoji: tab.emoji, kind: tab.kind, sections: [], cards: [], empty: '' };
  if (tab.kind === 'design') {
    const d = designCards(s, balance);
    view.sections = [
      { id: 'walls', label: 'Walls', price: X.WALL_PRICE ?? 0, cards: d.walls },
      { id: 'floors', label: 'Floors', price: X.FLOOR_PRICE ?? 0, cards: d.floors },
    ];
  } else if (tab.kind === 'storage') {
    view.sections = [{ id: 'storage', label: null, cards: storageCards(s, balance) }];
    view.empty = 'Nothing in storage. Pieces you buy and have not placed wait here.';
  } else {
    const cats = categories(), list = tab.id === TAB_MORE ? orphans(cats) : Object.values(FURN()).filter((d) => inCategory(d, cats.find((c) => c.id === tab.id)));
    view.sections = [{ id: tab.id, label: null, cards: list.map((d) => pieceCard(d, s, balance)).sort(byTierPrice) }];
    view.empty = 'Nothing here yet.';
  }
  view.cards = view.sections.flatMap((x) => x.cards);
  return view;
}

/** Spoken label for a card (screen readers get price, size, tier and the affordability hint in one phrase). */
export function cardLabel(c, fmt) {
  if (c.kind === 'wall' || c.kind === 'floor') {
    const what = c.kind === 'wall' ? 'wall paint' : 'flooring';
    return `${c.name} ${what}, ${c.active ? 'in use' : c.owned ? 'owned, free to switch' : fmt(c.price)}${!c.owned && !c.canAfford ? `, ${needText(c.shortBy, fmt)}` : ''}`;
  }
  const bits = [c.name, `size ${c.sizeLabel}`, `quality ${c.stars} of 4`, c.price ? fmt(c.price) : 'free'];
  if (c.owned) bits.push(`you own ${c.owned}${c.inStorage ? `, ${c.inStorage} in storage` : ''}`);
  if (!c.canAfford) bits.push(needText(c.shortBy, fmt));
  return bits.join(', ');
}

/* ---------- small interaction maths (pure, so they are testable without a DOM) ---------- */
/** Wrap-around index: next/previous item in a roving-focus list. */
export const cycleIndex = (len, i, step) => (len > 0 ? (((i + step) % len) + len) % len : 0);
/** Should releasing a drag on the sheet's handle dismiss it? dy px moved down, dt ms elapsed, height px of the sheet. */
export function shouldDismiss({ dy, dt, height }) {
  if (!(dy > 0)) return false;
  const v = dy / Math.max(1, dt);
  return dy > Math.max(80, height * 0.3) || (dy > 36 && v > 0.55);
}

/* ---------- actions: thin wrappers over the validated rules (the UI never touches the ledger) ---------- */
export const balanceOf = (store) => store.ledger.balance;
/** Buy one copy of a catalogue piece. Refuses early (without a ledger call) when the player cannot afford it. */
export function buyPiece(store, id) {
  const def = itemDef(id); if (!def || def.poster || !X.FURNITURE || !Object.prototype.hasOwnProperty.call(X.FURNITURE, id)) return { ok: false, error: 'Unknown item' };
  const bal = balanceOf(store); if (bal < def.price) return { ok: false, error: 'not-enough', shortBy: def.price - bal };
  const r = buyFurniture(store, id); return r.ok ? { ok: true, id, name: def.name, price: def.price } : r;
}
/** Sell one stored copy at the sell ratio. */
export function sellPiece(store, id) { const r = sellFurniture(store, id); return r.ok ? { ...r, id, name: itemDef(id)?.name } : r; }
/** Pay for (first time) and apply a wall paint / floor. */
export function applyStyle(store, kind, key) {
  const table = kind === 'wall' ? X.WALLS : kind === 'floor' ? X.FLOORS : null, e = table && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
  if (!e) return { ok: false, error: 'Unknown style' };
  const list = store.state.home?.[kind + 's'], owned = Array.isArray(list) ? list.includes(key) : (kind === 'wall' ? key === 'cream' : key === 'oak');
  const price = kind === 'wall' ? X.WALL_PRICE : X.FLOOR_PRICE, bal = balanceOf(store);
  if (!owned && bal < price) return { ok: false, error: 'not-enough', shortBy: price - bal };
  const r = setStyle(store, kind, key); return r.ok ? { ok: true, kind, key, name: e[0], paid: owned ? 0 : price } : r;
}
