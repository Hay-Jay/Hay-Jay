/** Home decorating: buying, placing and removing furniture; paint & flooring. Validated rules (no trusting the editor UI). */
import { FURNITURE, POSTER_SIZE, isPoster, WALLS, FLOORS, WALL_PRICE, FLOOR_PRICE, SELL_RATIO, MAX_PLACED, ROOM, KEEPOUT } from '../data/furniture.js';
import { DESTINATION_BY_ID } from '../data/destinations.js';

const GRID = 0.25, snap = (v) => Math.round(v / GRID) * GRID;
let _uid = 0; const uid = () => `f${Date.now().toString(36)}${(_uid++).toString(36)}`;
export const itemDef = (type) => (isPoster(type) ? { id: type, name: `${DESTINATION_BY_ID[type.slice(7)]?.name ?? 'Trip'} poster`, ...POSTER_SIZE, solid: false, price: 0, poster: true } : FURNITURE[type] ?? null);
export const footprint = (type, rot) => { const d = itemDef(type); return rot % 2 ? { w: d.d, d: d.w } : { w: d.w, d: d.d }; };
const rect = (x, z, w, d) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
const hit = (a, b) => a.x0 < b.x1 - 1e-6 && a.x1 > b.x0 + 1e-6 && a.z0 < b.z1 - 1e-6 && a.z1 > b.z0 + 1e-6;

export function ownedCount(s, type) { if (isPoster(type)) return (s.souvenirs || []).includes(type.slice(7)) ? 1 : 0; return s.home?.owned?.[type] || 0; }
export const placedCount = (s, type) => (s.home?.placed || []).filter((p) => p.type === type).length;
export const availableToPlace = (s, type) => ownedCount(s, type) - placedCount(s, type);
export const ownedTypes = (s) => [...Object.keys(FURNITURE), ...(s.souvenirs || []).map((d) => `poster_${d}`)].filter((t) => ownedCount(s, t) > 0);

/** Check a placement. `ignoreId` lets you validate moving an already-placed piece. */
export function canPlace(s, type, x, z, rot = 0, ignoreId = null) {
  const def = itemDef(type); if (!def) return { ok: false, error: 'Unknown item' };
  if (![x, z, rot].every(Number.isFinite) || !Number.isInteger(rot) || rot < 0 || rot > 3) return { ok: false, error: 'Invalid position' };
  const f = footprint(type, rot), r = rect(snap(x), snap(z), f.w, f.d);
  if (r.x0 < ROOM.x0 - 1e-6 || r.x1 > ROOM.x1 + 1e-6 || r.z0 < ROOM.z0 - 1e-6 || r.z1 > ROOM.z1 + 1e-6) return { ok: false, error: 'Outside the room' };
  const clearOnly = def.solid; // rugs/posters may sit anywhere inside the room except right on fixtures that would hide them
  if (def.solid || def.poster) for (const k of KEEPOUT) if (hit(r, k)) return { ok: false, error: `Blocked by the ${k.n}` };
  if (def.solid) for (const p of s.home?.placed || []) { if (p.id === ignoreId) continue; const pd = itemDef(p.type); if (!pd.solid) continue; const pf = footprint(p.type, p.rot); if (hit(r, rect(p.x, p.z, pf.w, pf.d))) return { ok: false, error: 'Overlaps other furniture' }; }
  return { ok: true, x: snap(x), z: snap(z) };
}
export function buyFurniture(store, type) {
  const def = FURNITURE[type]; if (!def) return { ok: false, error: 'Unknown item' };
  const r = store.ledger.debit(def.price, `Furniture: ${def.name}`, { category: 'purchase' }); if (!r.ok) return r;
  const h = (store.state.home ||= { owned: {}, placed: [] }); h.owned ||= {}; h.owned[type] = (h.owned[type] || 0) + 1; store.commit('home'); return { ok: true };
}
export function placeFurniture(store, type, x, z, rot = 0) {
  const s = store.state, h = (s.home ||= { owned: {}, placed: [] }); h.placed ||= [];
  if (availableToPlace(s, type) < 1) return { ok: false, error: 'You have none of those in storage' };
  if (h.placed.length >= MAX_PLACED) return { ok: false, error: `You can place up to ${MAX_PLACED} items` };
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
  const s = store.state, def = FURNITURE[type]; if (!def) return { ok: false, error: 'Cannot sell that' };
  if (availableToPlace(s, type) < 1) return { ok: false, error: 'Remove it from the room first' };
  const refund = Math.floor(def.price * SELL_RATIO), r = store.ledger.credit(refund, `Sold: ${def.name}`, { category: 'income' }); if (!r.ok) return r;
  s.home.owned[type]--; if (!s.home.owned[type]) delete s.home.owned[type]; store.commit('home'); return { ok: true, refund };
}
/** Paint/flooring: pay the first time you pick an option; free to switch back to ones you own. */
export function setStyle(store, kind, key) {
  const s = store.state, table = kind === 'wall' ? WALLS : FLOORS, price = kind === 'wall' ? WALL_PRICE : FLOOR_PRICE, h = (s.home ||= { owned: {}, placed: [] });
  if (!table[key]) return { ok: false, error: 'Unknown style' };
  const owned = (h[kind + 's'] ||= kind === 'wall' ? ['cream'] : ['oak']);
  if (!owned.includes(key)) { const r = store.ledger.debit(price, `${kind === 'wall' ? 'Paint' : 'Flooring'}: ${table[key][0]}`, { category: 'purchase' }); if (!r.ok) return r; owned.push(key); }
  h[kind] = key; store.commit('home'); return { ok: true };
}
