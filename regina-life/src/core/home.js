/**
 * Home decorating: buying, placing and removing furniture; paint & flooring. Validated rules (no trusting the editor UI). Everything that depends
 * on the house is layout-aware through layoutOf(state) (data/homes.js) and the pure geometry in core/lot.js; the Studio behaves exactly as it
 * did before multi-room homes (tests/legacy-home.js is the frozen old copy the differential test compares with).
 * LAYERING: data/homes.js <- core/lot.js <- core/home.js <- core/move.js <- core/sanitize.js. Nothing evaluated at module load here may call into lot.js.
 */
import { FURNITURE, POSTER_SIZE, isPoster, WALLS, FLOORS, wallPrice, floorPrice, sellPrice, MAX_OWNED_EACH, KEY_POINTS, HOME_FX, HOME_CAPS, POSTER_FX, TV_SEAT_KINDS, tvSeatFactor } from '../data/furniture.js';
import { layoutOf } from '../data/homes.js';
import { own } from './util.js';
import { lotOf, reachableKeys, rectAt, rectsHit, rectInside } from './lot.js';
import { DESTINATION_BY_ID } from '../data/destinations.js';

const GRID = 0.25, snap = (v) => Math.round(v / GRID) * GRID;
let _uid = 0; const uid = () => `f${Date.now().toString(36)}${(_uid++).toString(36)}`;
export const itemDef = (type) => (typeof type !== 'string' ? null : isPoster(type) ? (own(DESTINATION_BY_ID, type.slice(7)) ? { id: type, name: `${DESTINATION_BY_ID[type.slice(7)].name} poster`, ...POSTER_SIZE, solid: false, price: 0, poster: true } : null) : own(FURNITURE, type) ? FURNITURE[type] : null);
export const footprint = (type, rot) => { const d = itemDef(type); return rot % 2 ? { w: d.d, d: d.w } : { w: d.w, d: d.d }; };
/** How many pieces this house holds (60 / 85 / 110): the layout's own cap, the Studio's being the long-standing MAX_PLACED. */
export const maxPlaced = (s) => layoutOf(s).maxPlaced;
const placedOf = (s) => (Array.isArray(s?.home?.placed) ? s.home.placed : []);

export function ownedCount(s, type) { if (!itemDef(type)) return 0; if (isPoster(type)) return (s.souvenirs || []).includes(type.slice(7)) ? 1 : 0; const n = own(s.home?.owned, type) ? s.home.owned[type] : 0; return Number.isInteger(n) && n > 0 ? n : 0; }
export const placedCount = (s, type) => placedOf(s).filter((p) => p.type === type).length;
export const availableToPlace = (s, type) => ownedCount(s, type) - placedCount(s, type);
export const ownedTypes = (s) => [...Object.keys(FURNITURE), ...(s.souvenirs || []).map((d) => `poster_${d}`)].filter((t) => ownedCount(s, t) > 0);
/** Owned but not placed, per type (the "+N in storage" list) and in total (free souvenir posters count as owned). */
export const storageItems = (s) => ownedTypes(s).map((type) => ({ type, n: availableToPlace(s, type) })).filter((x) => x.n > 0);
export const storageCount = (s) => storageItems(s).reduce((n, x) => n + x.n, 0);

/* ---------- walkability: a placement must never wall the player in or cut them off from a fixture ---------- */
/** Footprint rects of the placed pieces that block walking (everything solid except `ignoreId`). */
const solidRects = (placed, ignoreId = null) => placed.filter((p) => p.id !== ignoreId && itemDef(p.type)?.solid).map((p) => { const f = footprint(p.type, p.rot); return rectAt(p.x, p.z, f.w, f.d); });
/** Key points that are reachable in the empty house but not with these extra obstacles. */
const missingKeys = (lot, extra) => { const a = reachableKeys(lot, extra); return [...lot.baseline].filter((n) => !a.has(n)); };
const keyLabel = (lot, n) => lot.keyPoints.find((k) => k.n === n)?.label ?? n;
/** Names of the key points (the entrance and every fixture, doorway and room) the player can currently walk to from the entrance (for tests and the soft-lock check). */
export const accessibleKeys = (s) => [...reachableKeys(lotOf(layoutOf(s)), solidRects(placedOf(s)))];
/** The Studio's key names (its listed KEY_POINTS; every one is reachable in the empty Studio, which a test locks against lotOf(STUDIO).baseline). */
export const BASELINE_KEYS = KEY_POINTS.map((k) => k.n);
/** Moves furniture to storage (latest first) until every normally-reachable key point is reachable again. Returns how many pieces were stored. */
export function repairHome(store) {
  const h = store.state.home; if (!h || !Array.isArray(h.placed)) return 0; const lot = lotOf(layoutOf(store.state)); let n = 0;
  while (missingKeys(lot, solidRects(h.placed)).length) { const i = [...h.placed].map((p, k) => [p, k]).reverse().find(([p]) => itemDef(p.type)?.solid)?.[1]; if (i == null) break; h.placed.splice(i, 1); n++; }
  if (n) store.commit('home'); return n;
}

/**
 * Check a placement against a layout and the pieces already `placed`, at the RAW coordinates given (no snapping: saves are validated as stored).
 * `ignoreId` lets you validate moving an already-placed piece. Returns { ok } or { ok: false, error }.
 */
export function validatePlacement(layout, placed, type, x, z, rot = 0, ignoreId = null) {
  const def = itemDef(type); if (!def) return { ok: false, error: 'Unknown item' };
  if (![x, z, rot].every(Number.isFinite) || !Number.isInteger(rot) || rot < 0 || rot > 3) return { ok: false, error: 'Invalid position' };
  const lot = lotOf(layout), f = footprint(type, rot), r = rectAt(x, z, f.w, f.d);
  if (!lot.rooms.some((rm) => rectInside(r, rm.place)) || lot.walls.some((w) => rectsHit(r, w))) return { ok: false, error: 'Outside the room' };
  if (def.solid || def.poster) for (const k of lot.keepout) if (rectsHit(r, k)) return { ok: false, error: `Blocked by the ${k.n}` };   // rugs and mats may lie on fixtures; posters and solids may not
  if (def.solid) for (const p of placed) { if (p.id === ignoreId) continue; const pd = itemDef(p.type); if (!pd?.solid) continue; const pf = footprint(p.type, p.rot); if (rectsHit(r, rectAt(p.x, p.z, pf.w, pf.d))) return { ok: false, error: 'Overlaps other furniture' }; }
  if (def.solid) {
    const others = solidRects(placed, ignoreId), gone = missingKeys(lot, [...others, r]);
    if (gone.length) { const before = missingKeys(lot, others), worse = gone.filter((n) => !before.includes(n)); if (worse.length) return { ok: false, error: `Blocks the way to the ${keyLabel(lot, worse[0])}` }; }
  }
  return { ok: true };
}
/** Check a placement in the player's own house: snaps to the 0.25 m grid, then validatePlacement. On success returns { ok, x, z } (the snapped spot). */
export function canPlace(s, type, x, z, rot = 0, ignoreId = null) {
  const sx = Number.isFinite(x) ? snap(x) : x, sz = Number.isFinite(z) ? snap(z) : z, v = validatePlacement(layoutOf(s), placedOf(s), type, sx, sz, rot, ignoreId);
  return v.ok ? { ok: true, x: sx, z: sz } : v;
}
export function buyFurniture(store, type) {
  const def = own(FURNITURE, type) ? FURNITURE[type] : null; if (!def) return { ok: false, error: 'Unknown item' };
  if (ownedCount(store.state, type) >= MAX_OWNED_EACH) return { ok: false, error: `You can own up to ${MAX_OWNED_EACH} of one item` };
  const r = store.ledger.debit(def.price, `Furniture: ${def.name}`, { category: 'purchase' }); if (!r.ok) return r;
  const h = (store.state.home ||= { owned: {}, placed: [] }); h.owned ||= {}; h.owned[type] = ownedCount(store.state, type) + 1; store.commit('home'); return { ok: true };
}
export function placeFurniture(store, type, x, z, rot = 0) {
  const s = store.state, h = (s.home ||= { owned: {}, placed: [] }); h.placed ||= [];
  if (availableToPlace(s, type) < 1) return { ok: false, error: 'You have none of those in storage' };
  const cap = maxPlaced(s); if (h.placed.length >= cap) return { ok: false, error: `You can place up to ${cap} items` };
  const c = canPlace(s, type, x, z, rot); if (!c.ok) return c;
  const item = { id: uid(), type, x: c.x, z: c.z, rot }; h.placed.push(item); store.commit('home'); return { ok: true, item };
}
export function moveFurniture(store, id, x, z, rot) {
  const s = store.state, p = s.home?.placed?.find((i) => i.id === id); if (!p) return { ok: false, error: 'Not placed' };
  const c = canPlace(s, p.type, x, z, rot ?? p.rot, id); if (!c.ok) return c; p.x = c.x; p.z = c.z; p.rot = rot ?? p.rot; store.commit('home'); return { ok: true, item: p };
}
export function removeFurniture(store, id) {
  const h = store.state.home, i = h?.placed?.findIndex((p) => p.id === id); if (i == null || i < 0) return { ok: false, error: 'Not placed' };
  const [it] = h.placed.splice(i, 1); store.commit('home'); return { ok: true, item: it };
}
export function sellFurniture(store, type) {
  const s = store.state, def = own(FURNITURE, type) ? FURNITURE[type] : null; if (!def) return { ok: false, error: 'Cannot sell that' };
  if (availableToPlace(s, type) < 1) return { ok: false, error: 'Remove it from the room first' };
  const refund = sellPrice(def.price), r = store.ledger.credit(refund, `Sold: ${def.name}`, { category: 'income' }); if (!r.ok) return r;
  s.home.owned[type]--; if (!s.home.owned[type]) delete s.home.owned[type]; store.commit('home'); return { ok: true, refund };
}

/* ---------- paint and flooring ---------- */
const styleTable = (kind) => (kind === 'wall' ? WALLS : kind === 'floor' ? FLOORS : null);
const baseStyle = (kind) => (kind === 'wall' ? 'cream' : 'oak');
/** What a style costs right now: { ok, owned, price (list), cost (0 once owned) }. The one place that prices paint and flooring: the UI shows `cost`, setStyle charges it. */
export function styleQuote(s, kind, key) {
  const table = styleTable(kind); if (!table || !own(table, key)) return { ok: false, owned: false, price: 0, cost: 0 };
  const list = s?.home?.[kind + 's'], owned = Array.isArray(list) ? list.includes(key) : key === baseStyle(kind), price = kind === 'wall' ? wallPrice(key) : floorPrice(key);
  return { ok: true, owned, price, cost: owned ? 0 : price };
}
/** The wall paint and floor a room shows: its own override if the house has several rooms and the key is valid, else the house default. */
export function styleOf(s, roomId = null) {
  const h = s?.home ?? {}, layout = layoutOf(s), pick = (kind) => {
    const table = styleTable(kind), room = roomId != null && layout.rooms.length > 1 && own(h.rooms, roomId) && h.rooms[roomId] && typeof h.rooms[roomId] === 'object' ? h.rooms[roomId][kind] : null;
    if (typeof room === 'string' && own(table, room)) return room;
    return typeof h[kind] === 'string' && own(table, h[kind]) ? h[kind] : baseStyle(kind);
  };
  return { wall: pick('wall'), floor: pick('floor') };
}
/**
 * Paint/flooring: pay the first time you pick an option (once per style key for the whole house); free to switch back to ones you own.
 * `roomId` null sets the house default AND clears every per-room override of that kind; a room id (an own id of the current layout, else
 * 'Unknown room') sets that room only. Single-room layouts never write `rooms`. Returns { ok, paid } (paid = cents charged, 0 when owned).
 */
export function setStyle(store, kind, key, roomId = null) {
  const table = styleTable(kind); if (!table) return { ok: false, error: 'Unknown style' };
  const s = store.state, h = (s.home ||= { owned: {}, placed: [] });
  if (!own(table, key)) return { ok: false, error: 'Unknown style' };
  const layout = layoutOf(s);
  if (roomId != null && !(typeof roomId === 'string' && layout.rooms.some((r) => r.id === roomId))) return { ok: false, error: 'Unknown room' };
  if (layout.rooms.length < 2) roomId = null;
  const q = styleQuote(s, kind, key), owned = (Array.isArray(h[kind + 's']) ? h[kind + 's'] : (h[kind + 's'] = [baseStyle(kind)]));
  let paid = 0;
  if (!owned.includes(key)) { if (q.price > 0) { const r = store.ledger.debit(q.price, `${kind === 'wall' ? 'Paint' : 'Flooring'}: ${table[key][0]}`, { category: 'purchase' }); if (!r.ok) return r; paid = q.price; } owned.push(key); }
  if (roomId == null) { h[kind] = key; if (h.rooms && typeof h.rooms === 'object') for (const id of Object.keys(h.rooms)) { const o = h.rooms[id]; if (o && typeof o === 'object') { delete o[kind]; if (!Object.keys(o).length) delete h.rooms[id]; } } }
  else { h.rooms = h.rooms && typeof h.rooms === 'object' && !Array.isArray(h.rooms) ? h.rooms : {}; h.rooms[roomId] = { ...(own(h.rooms, roomId) && h.rooms[roomId] && typeof h.rooms[roomId] === 'object' ? h.rooms[roomId] : {}), [kind]: key }; }
  store.commit('home'); return { ok: true, paid };
}

/* ---------- what the room does for you ---------- */
const BONUS_ZERO = () => ({ sleep: 0, comfort: 0, fun: 0, skill: 0, mood: 0 });
/**
 * Gameplay value of the PLACED furniture (stored pieces and unowned ones count for nothing). Pure over the state.
 * Returns { sleep, comfort, fun, skill, mood }: the first four are fractions (0.2 = +20%), mood is flat points; every value is >= 0 and
 * hard-capped by HOME_CAPS. Pieces of one kind stack best-first with each repeat worth `rep` times the previous one (diminishing returns);
 * a TV is only as fun as the best seat in the room (tvSeatFactor). `skill` (optional) = 'fitness' | 'charisma' | 'cooking' counts only the
 * gear that trains that skill; omitted, it counts all skill gear.
 */
export function homeBonuses(state, skill = null) {
  const placed = Array.isArray(state?.home?.placed) ? state.home.placed : [], used = {}, groups = {}; let seat = 0;
  for (const p of placed) {
    const type = p?.type, def = itemDef(type); if (!def) continue;
    used[type] = (used[type] || 0) + 1; if (used[type] > ownedCount(state, type)) continue; // placed beyond what you own is ignored
    let fx = null, v = 0, key = def.kind;
    if (def.poster) { fx = POSTER_FX; v = POSTER_FX.v; key = 'poster'; } else if (own(HOME_FX, def.kind)) { fx = HOME_FX[def.kind]; v = fx.v[Math.min(4, Math.max(1, def.tier | 0)) - 1]; }
    if (TV_SEAT_KINDS.includes(def.kind)) seat = Math.max(seat, def.tier | 0);
    if (!fx || !(v > 0) || (fx.stat === 'skill' && skill != null && fx.skill !== skill)) continue;
    (groups[key] ||= { fx, vals: [] }).vals.push(v);
  }
  const raw = BONUS_ZERO();
  for (const [key, g] of Object.entries(groups)) {
    g.vals.sort((a, b) => b - a); let sum = 0, k = 1; for (const v of g.vals) { sum += v * k; k *= g.fx.rep; }
    raw[g.fx.stat] += key === 'tv' ? sum * tvSeatFactor(seat) : sum;
  }
  const out = BONUS_ZERO(); for (const k of Object.keys(out)) out[k] = Math.round(Math.min(HOME_CAPS[k], raw[k]) * 1000) / 1000;
  return out;
}
