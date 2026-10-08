/** Home decorating: buying, placing and removing furniture; paint & flooring. Validated rules (no trusting the editor UI). */
import { FURNITURE, POSTER_SIZE, isPoster, WALLS, FLOORS, WALL_PRICE, FLOOR_PRICE, SELL_RATIO, MAX_PLACED, ROOM, KEEPOUT, FIXTURES, KEY_POINTS } from '../data/furniture.js';
import { own } from './util.js';
import { DESTINATION_BY_ID } from '../data/destinations.js';

const GRID = 0.25, snap = (v) => Math.round(v / GRID) * GRID;
let _uid = 0; const uid = () => `f${Date.now().toString(36)}${(_uid++).toString(36)}`;
export const itemDef = (type) => (typeof type !== 'string' ? null : isPoster(type) ? (own(DESTINATION_BY_ID, type.slice(7)) ? { id: type, name: `${DESTINATION_BY_ID[type.slice(7)].name} poster`, ...POSTER_SIZE, solid: false, price: 0, poster: true } : null) : own(FURNITURE, type) ? FURNITURE[type] : null);
export const footprint = (type, rot) => { const d = itemDef(type); return rot % 2 ? { w: d.d, d: d.w } : { w: d.w, d: d.d }; };
const rect = (x, z, w, d) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
const hit = (a, b) => a.x0 < b.x1 - 1e-6 && a.x1 > b.x0 + 1e-6 && a.z0 < b.z1 - 1e-6 && a.z1 > b.z0 + 1e-6;

export function ownedCount(s, type) { if (!itemDef(type)) return 0; if (isPoster(type)) return (s.souvenirs || []).includes(type.slice(7)) ? 1 : 0; const n = own(s.home?.owned, type) ? s.home.owned[type] : 0; return Number.isInteger(n) && n > 0 ? n : 0; }
export const placedCount = (s, type) => (Array.isArray(s.home?.placed) ? s.home.placed : []).filter((p) => p.type === type).length;
export const availableToPlace = (s, type) => ownedCount(s, type) - placedCount(s, type);
export const ownedTypes = (s) => [...Object.keys(FURNITURE), ...(s.souvenirs || []).map((d) => `poster_${d}`)].filter((t) => ownedCount(s, t) > 0);

/* ---------- walkability: a placement must never wall the player in or cut them off from a fixture ---------- */
const CELL = 0.25, PLAYER_R = 0.38, COLS = Math.round((ROOM.x1 - ROOM.x0) / CELL), ROWS = Math.round((ROOM.z1 - ROOM.z0) / CELL);
const cx = (c) => ROOM.x0 + (c + 0.5) * CELL, cz = (r) => ROOM.z0 + (r + 0.5) * CELL;
const distToRect = (x, z, r) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
function walkable(obstacles) {
  const free = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const x = cx(c), z = cz(r); let ok = 1; for (const o of obstacles) if (distToRect(x, z, o) < PLAYER_R) { ok = 0; break; } free[r * COLS + c] = ok; }
  return free;
}
/** Which key points can the player still reach from the entrance? */
function accessible(obstacles) {
  const free = walkable(obstacles), seen = new Uint8Array(COLS * ROWS), start = KEY_POINTS[0];
  // the entrance spot itself can sit within the player's radius of the desk: start from the nearest free cell (within 0.7 m)
  let best = -1, bd = 0.7; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const d = Math.hypot(cx(c) - start.x, cz(r) - start.z); if (free[r * COLS + c] && d < bd) { bd = d; best = r * COLS + c; } }
  const out = new Set(); if (best < 0) return out;
  const q = [best]; seen[best] = 1;
  while (q.length) { const i = q.pop(), r = (i / COLS) | 0, c = i % COLS; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) continue; const j = nr * COLS + nc; if (free[j] && !seen[j]) { seen[j] = 1; q.push(j); } } }
  for (const k of KEY_POINTS) { let hit = false; for (let r = 0; r < ROWS && !hit; r++) for (let c = 0; c < COLS; c++) if (seen[r * COLS + c] && Math.hypot(cx(c) - k.x, cz(r) - k.z) <= 1.1) { hit = true; break; } if (hit) out.add(k.n); }
  return out;
}
const solidRects = (s, ignoreId = null) => (Array.isArray(s.home?.placed) ? s.home.placed : []).filter((p) => p.id !== ignoreId && itemDef(p.type)?.solid).map((p) => { const f = footprint(p.type, p.rot); return rect(p.x, p.z, f.w, f.d); });
/** Key points reachable with the empty room (the reference every arrangement is compared with). */
const BASELINE = accessible(FIXTURES);
const missingKeys = (obstacles) => { const a = accessible(obstacles); return [...BASELINE].filter((n) => !a.has(n)); };
/** Names of the apartment fixtures the player can currently walk to from the entrance (for tests & the soft-lock check). */
export const accessibleKeys = (s) => [...accessible([...FIXTURES, ...solidRects(s)])];
export const BASELINE_KEYS = [...BASELINE];
/** Moves furniture to storage (latest first) until every normally-reachable fixture is reachable again. Returns how many pieces were stored. */
export function repairHome(store) {
  const h = store.state.home; if (!h || !Array.isArray(h.placed)) return 0; let n = 0;
  while (missingKeys([...FIXTURES, ...solidRects(store.state)]).length) { const i = [...h.placed].map((p, k) => [p, k]).reverse().find(([p]) => itemDef(p.type)?.solid)?.[1]; if (i == null) break; h.placed.splice(i, 1); n++; }
  if (n) store.commit('home'); return n;
}

/** Check a placement. `ignoreId` lets you validate moving an already-placed piece. */
export function canPlace(s, type, x, z, rot = 0, ignoreId = null) {
  const def = itemDef(type); if (!def) return { ok: false, error: 'Unknown item' };
  if (![x, z, rot].every(Number.isFinite) || !Number.isInteger(rot) || rot < 0 || rot > 3) return { ok: false, error: 'Invalid position' };
  const f = footprint(type, rot), r = rect(snap(x), snap(z), f.w, f.d);
  if (r.x0 < ROOM.x0 - 1e-6 || r.x1 > ROOM.x1 + 1e-6 || r.z0 < ROOM.z0 - 1e-6 || r.z1 > ROOM.z1 + 1e-6) return { ok: false, error: 'Outside the room' };
  const clearOnly = def.solid; // rugs/posters may sit anywhere inside the room except right on fixtures that would hide them
  if (def.solid || def.poster) for (const k of KEEPOUT) if (hit(r, k)) return { ok: false, error: `Blocked by the ${k.n}` };
  if (def.solid) for (const p of Array.isArray(s.home?.placed) ? s.home.placed : []) { if (p.id === ignoreId) continue; const pd = itemDef(p.type); if (!pd.solid) continue; const pf = footprint(p.type, p.rot); if (hit(r, rect(p.x, p.z, pf.w, pf.d))) return { ok: false, error: 'Overlaps other furniture' }; }
  if (def.solid) { const gone = missingKeys([...FIXTURES, ...solidRects(s, ignoreId), r]), before = missingKeys([...FIXTURES, ...solidRects(s, ignoreId)]); const worse = gone.filter((n) => !before.includes(n)); if (worse.length) return { ok: false, error: `Blocks the way to the ${worse[0]}` }; }
  return { ok: true, x: snap(x), z: snap(z) };
}
export function buyFurniture(store, type) {
  const def = own(FURNITURE, type) ? FURNITURE[type] : null; if (!def) return { ok: false, error: 'Unknown item' };
  const r = store.ledger.debit(def.price, `Furniture: ${def.name}`, { category: 'purchase' }); if (!r.ok) return r;
  const h = (store.state.home ||= { owned: {}, placed: [] }); h.owned ||= {}; h.owned[type] = ownedCount(store.state, type) + 1; store.commit('home'); return { ok: true };
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
  const s = store.state, def = own(FURNITURE, type) ? FURNITURE[type] : null; if (!def) return { ok: false, error: 'Cannot sell that' };
  if (availableToPlace(s, type) < 1) return { ok: false, error: 'Remove it from the room first' };
  const refund = Math.floor(def.price * SELL_RATIO), r = store.ledger.credit(refund, `Sold: ${def.name}`, { category: 'income' }); if (!r.ok) return r;
  s.home.owned[type]--; if (!s.home.owned[type]) delete s.home.owned[type]; store.commit('home'); return { ok: true, refund };
}
/** Paint/flooring: pay the first time you pick an option; free to switch back to ones you own. */
export function setStyle(store, kind, key) {
  if (kind !== 'wall' && kind !== 'floor') return { ok: false, error: 'Unknown style' };
  const s = store.state, table = kind === 'wall' ? WALLS : FLOORS, price = kind === 'wall' ? WALL_PRICE : FLOOR_PRICE, h = (s.home ||= { owned: {}, placed: [] });
  if (!own(table, key)) return { ok: false, error: 'Unknown style' };
  const owned = (Array.isArray(h[kind + 's']) ? h[kind + 's'] : (h[kind + 's'] = kind === 'wall' ? ['cream'] : ['oak']));
  if (!owned.includes(key)) { const r = store.ledger.debit(price, `${kind === 'wall' ? 'Paint' : 'Flooring'}: ${table[key][0]}`, { category: 'purchase' }); if (!r.ok) return r; owned.push(key); }
  h[kind] = key; store.commit('home'); return { ok: true };
}
