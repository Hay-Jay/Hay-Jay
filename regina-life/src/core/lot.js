/**
 * Pure geometry for home layouts (docs/HOMES.md sections 3 and 4): everything the rules, the builder and the tests need to know about a
 * layout, derived once per layout object and cached. No THREE, no DOM, no state; imports only data/ and core/util.js, so it runs unchanged
 * in the browser, in vitest and on a server.
 *
 *   lotOf(layout | id)  -> the lot (see buildLot for the fields)
 *   roomAt(layout,x,z)  -> the room whose PLACE rect holds the point (furniture centres, footprints)   | null
 *   roomAtFloor(...)    -> the room whose FLOOR rect holds the point (where the player is)              | null
 *   validateLayout(l)   -> { ok, errors[] }   the checks every shipped layout must pass
 *   interactablesOf(l)  -> every fixture use at its world position, with its unique id
 *   freeCells / reachableKeys: the grid and flood-fill primitives, parametrised by an extra obstacle list (placed furniture)
 *
 * WALKABILITY. One lattice for every layout: cells of CELL metres anchored at (-4.05, -5.05) (the Studio's old grid corner), extended in whole
 * cells to cover the bbox. A cell is walkable only if its centre is inside some room's place rect or a doorway band, and is not within
 * PLAYER_R of a wall run, a fixture collide rect or a placed solid. Keys (spots the player must always reach) are supported by a reachable
 * cell within KEY_REACH of the key that lies in the key's own room (floor rect) or in a doorway band, so a key never counts because of a
 * cell on the far side of a wall.
 */
import { HOMES, STUDIO, FIXTURE_KINDS, ACTIONS, WALL_T, INSET, DOOR_W, rotXZ } from '../data/homes.js';
import { own } from './util.js';

export const CELL = 0.25;          // walkability lattice step, metres
export const PLAYER_R = 0.38;      // the player's walking radius (the one copy: home.js and the controller import this)
export const KEY_REACH = 1.1;      // a key point is reached when a reachable cell is this close (and in its room)
export const APPROACH = 1.0;       // depth of the doorway keep-out in each room, measured from the wall face
export const ANCHOR = { x: -4.05, z: -5.05 };
/** Hard limits every layout must respect (validateLayout). The long side is capped so the whole house stays readable on a phone. */
export const LAYOUT_LIMITS = { footprintW: 20, footprintD: 17, longSide: 18, pointLightsPerRoom: 2, pointLightsPerLayout: 6, lightDistFactor: 1.15, doorMin: DOOR_W };
export const RESERVED_ROOM_IDS = ['all'];

const EPS = 1e-6, H = WALL_T / 2;
const r9 = (v) => Math.round(v * 1e9) / 1e9;
const rot4 = (r) => ((Math.trunc(r) % 4) + 4) % 4;
export const rectAt = (x, z, w, d) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
export const rectsHit = (a, b) => a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.z0 < b.z1 - EPS && a.z1 > b.z0 + EPS;
export const rectInside = (r, o, tol = EPS) => r.x0 >= o.x0 - tol && r.x1 <= o.x1 + tol && r.z0 >= o.z0 - tol && r.z1 <= o.z1 + tol;
const inRect = (x, z, r, tol = 1e-9) => x >= r.x0 - tol && x <= r.x1 + tol && z >= r.z0 - tol && z <= r.z1 + tol;
const distToRect = (x, z, r) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
const grow = (r, d) => ({ x0: r.x0 - d, z0: r.z0 - d, x1: r.x1 + d, z1: r.z1 + d });
const inset = (f, d) => ({ x0: r9(f.x0 + d), z0: r9(f.z0 + d), x1: r9(f.x1 - d), z1: r9(f.z1 - d) });
const resolve = (l) => (typeof l === 'string' ? (own(HOMES, l) ? HOMES[l] : null) : l && typeof l === 'object' ? l : null);
const kindOf = (k) => (own(FIXTURE_KINDS, k) ? FIXTURE_KINDS[k] : null);
const footprintOf = (def, rot) => (rot4(rot) % 2 ? { w: def.d, d: def.w } : { w: def.w, d: def.d });

const CACHE = new WeakMap();
/** The derived lot for a layout object (or a HOMES id), cached per object. Treat the result as read-only. */
export function lotOf(layout) {
  const L = resolve(layout); if (!L || !Array.isArray(L.rooms)) throw new Error(`Unknown home layout: ${String(layout)}`);
  let lot = CACHE.get(L); if (!lot) { lot = buildLot(L); CACHE.set(L, lot); } return lot;
}

/* ---------- walls ---------- */
/** Solid runs and doorways of a layout's walls. A run extends WALL_T/2 past an end that lies on another wall's centre-line (corner or T-junction), 0 at a door jamb or a free end. */
function wallRuns(L, rooms) {
  const walls = L.walls.map((w) => ({ ...w, horiz: Math.abs(w.z1 - w.z0) < EPS }));
  const roomIdAt = (x, z) => rooms.find((r) => inRect(x, z, r.floor))?.id ?? null;
  const joined = (w, px, pz) => walls.some((o) => o !== w && o.horiz !== w.horiz && (o.horiz
    ? Math.abs(pz - o.z0) < EPS && px >= Math.min(o.x0, o.x1) - H - EPS && px <= Math.max(o.x0, o.x1) + H + EPS
    : Math.abs(px - o.x0) < EPS && pz >= Math.min(o.z0, o.z1) - H - EPS && pz <= Math.max(o.z0, o.z1) + H + EPS));
  const runs = [], doorways = [];
  for (const w of walls) {
    const c = w.horiz ? w.z0 : w.x0, lo = w.horiz ? Math.min(w.x0, w.x1) : Math.min(w.z0, w.z1), hi = w.horiz ? Math.max(w.x0, w.x1) : Math.max(w.z0, w.z1);
    const at = (a, b) => (w.horiz ? { x: a, z: b } : { x: b, z: a });                // (along, across) -> world
    const ends = (a) => { const p = at(a, c); return joined(w, p.x, p.z) ? H : 0; };
    const doors = (w.doors || []).map((d, i) => ({ ...d, i })).sort((p, q) => p.at - q.at);
    const cuts = []; let cur = lo, curJamb = false;
    for (const d of doors) { const a = d.at - d.w / 2, b = d.at + d.w / 2; if (a - cur > EPS) cuts.push([cur, a, curJamb, true]); cur = b; curJamb = true; }
    if (hi - cur > EPS) cuts.push([cur, hi, curJamb, false]);
    cuts.forEach(([a, b, aJamb, bJamb], k) => {
      const e0 = aJamb ? 0 : ends(a), e1 = bJamb ? 0 : ends(b), mid = (a + b) / 2, n = at(mid, c - H - 0.1), p = at(mid, c + H + 0.1);
      const rm = [roomIdAt(n.x, n.z), roomIdAt(p.x, p.z)], exterior = rm[0] === null || rm[1] === null;
      const run = w.horiz ? { x0: r9(a - e0), x1: r9(b + e1), z0: r9(c - H), z1: r9(c + H) } : { x0: r9(c - H), x1: r9(c + H), z0: r9(a - e0), z1: r9(b + e1) };
      runs.push({ id: `${w.id}.${k}`, wallId: w.id, run: k, ...run, axis: w.horiz ? 'x' : 'z', c, a, b, ends: [e0, e1], rooms: rm,
        role: exterior ? 'exterior' : 'partition', side: exterior ? (w.horiz ? (rm[0] === null ? 'N' : 'S') : (rm[0] === null ? 'W' : 'E')) : null, ...(w.style ? { style: w.style } : {}) });
    });
    (w.doors || []).forEach((d, i) => {
      const p = at(d.at, c), n = at(d.at, c - H - 0.1), q = at(d.at, c + H + 0.1), band = w.horiz ? { x0: d.at - d.w / 2, x1: d.at + d.w / 2, z0: c - H - INSET, z1: c + H + INSET } : { x0: c - H - INSET, x1: c + H + INSET, z0: d.at - d.w / 2, z1: d.at + d.w / 2 };
      const approach = w.horiz ? { x0: band.x0, x1: band.x1, z0: c - H - APPROACH, z1: c + H + APPROACH } : { x0: c - H - APPROACH, x1: c + H + APPROACH, z0: band.z0, z1: band.z1 };
      doorways.push({ id: `${w.id}:${i}`, wallId: w.id, i, x: p.x, z: p.z, w: d.w, axis: w.horiz ? 'x' : 'z', rooms: [roomIdAt(n.x, n.z), roomIdAt(q.x, q.z)], band, approach });
    });
  }
  return { runs, doorways };
}

/* ---------- the lot ---------- */
function buildLot(L) {
  const rooms = L.rooms.map((r) => ({ ...r, place: inset(r.floor, INSET) })), byId = new Map(rooms.map((r) => [r.id, r]));
  const bbox = rooms.reduce((b, r) => ({ x0: Math.min(b.x0, r.floor.x0), z0: Math.min(b.z0, r.floor.z0), x1: Math.max(b.x1, r.floor.x1), z1: Math.max(b.z1, r.floor.z1) }), { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity });
  const bounds = { x0: r9(bbox.x0 + INSET), x1: r9(bbox.x1 - INSET), z0: r9(bbox.z0 + INSET), z1: r9(bbox.z1 - INSET) };
  const yardRect = L.yard && Number.isFinite(L.yard.margin) ? grow(bbox, L.yard.margin) : null;
  const { runs: walls, doorways } = wallRuns(L, rooms);
  const fixtures = Array.isArray(L.fixtures) ? L.fixtures : [];

  /* collision rows: listed (the Studio) or derived from the kinds, reusing the Studio's long-standing rows for fixtures that did not change */
  const same = (f) => { const s = L === STUDIO ? null : STUDIO.fixtures.find((q) => q.id === f.id); return s && s.kind === f.kind && s.x === f.x && s.z === f.z && rot4(s.rot || 0) === rot4(f.rot || 0) ? s : null; };
  const collide = [], colliders = [], keepout = [];
  for (const f of fixtures) {
    const def = kindOf(f.kind); if (!def || def.solid === false) continue;
    if (same(f)) {
      collide.push(...STUDIO.collide.filter((r) => r.n === f.id)); colliders.push(...STUDIO.colliders.filter((r) => r.n === f.id || r.n.startsWith(`${f.id}_`))); keepout.push(...STUDIO.keepout.filter((r) => r.n === f.id)); continue;
    }
    const fp = footprintOf(def, f.rot || 0), rc = rectAt(f.x, f.z, fp.w, fp.d), pad = def.pad ?? 0.1;
    collide.push({ n: f.id, ...rc }); colliders.push({ n: f.id, ...rc, h: def.ch ?? def.h }); keepout.push({ n: f.id, ...grow(rc, pad) });
  }
  if (Array.isArray(L.collide)) { collide.length = 0; collide.push(...L.collide); }
  if (Array.isArray(L.colliders)) { colliders.length = 0; colliders.push(...L.colliders); }
  if (Array.isArray(L.keepout)) { keepout.length = 0; keepout.push(...L.keepout); }
  for (const d of doorways) keepout.push({ n: 'doorway', ...d.approach });
  if (!keepout.some((k) => k.n === 'door')) keepout.push(STUDIO.keepout.find((k) => k.n === 'door'));

  /* the lattice */
  const mx0 = -Math.ceil((ANCHOR.x - bbox.x0) / CELL - 1e-9), mz0 = -Math.ceil((ANCHOR.z - bbox.z0) / CELL - 1e-9);
  const cols = Math.ceil((bbox.x1 - (ANCHOR.x + mx0 * CELL)) / CELL - 1e-9), rows = Math.ceil((bbox.z1 - (ANCHOR.z + mz0 * CELL)) / CELL - 1e-9);
  const grid = { x0: ANCHOR.x + mx0 * CELL, z0: ANCHOR.z + mz0 * CELL, mx0, mz0, cols, rows, cell: CELL };
  const lot = { layout: L, id: L.id, bbox, bounds, yardRect, rooms, byId, walls, doorways, collide, colliders, keepout, grid, keyPoints: [], interactables: [], baseline: new Set(), freeBase: null, _keyInfo: [] };

  /* base walkable mask: the domain (place rects + doorway bands) minus wall runs and fixtures */
  const free = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = cx(grid, c), z = cz(grid, r);
    free[r * cols + c] = rooms.some((rm) => inRect(x, z, rm.place)) || doorways.some((d) => inRect(x, z, d.band)) ? 1 : 0;
  }
  stamp(free, grid, walls); stamp(free, grid, collide); lot.freeBase = free;

  /* interactables (world positions of every use) */
  lot.interactables = buildInteractables(L, fixtures, rooms);

  /* key points: the entrance, one per fixture use, two per doorway, one for any room that has none */
  const keys = [{ n: 'entrance', x: L.entry.spawn.x, z: L.entry.spawn.z, room: roomIdOfFloor(rooms, L.entry.spawn.x, L.entry.spawn.z) ?? rooms[0].id, label: 'entrance' }];
  if (Array.isArray(L.keyPoints)) { keys.length = 0; for (const k of L.keyPoints) keys.push({ n: k.n, x: k.x, z: k.z, room: k.room ?? roomIdOfFloor(rooms, k.x, k.z) ?? rooms[0].id, label: k.label ?? k.n }); }
  else {
    for (const f of fixtures) { const def = kindOf(f.kind); if (!def?.uses) continue; for (const u of def.uses) { const p = rotXZ(u.dx, u.dz, f.rot || 0); keys.push({ n: def.uses.length === 1 ? f.id : `${f.id}.${u.id}`, x: r9(f.x + p.x), z: r9(f.z + p.z), room: f.room, label: u.noun ?? def.name }); } }
  }
  for (const d of doorways) {
    const nm = (id) => (byId.get(id)?.name ?? '').toLowerCase() || 'next room', off = H + 0.6;
    const a = d.axis === 'x' ? { x: d.x, z: d.z - off } : { x: d.x - off, z: d.z }, b = d.axis === 'x' ? { x: d.x, z: d.z + off } : { x: d.x + off, z: d.z };
    if (d.rooms[0]) keys.push({ n: `door:${d.wallId}:${d.i}:a`, x: a.x, z: a.z, room: d.rooms[0], label: `${nm(d.rooms[1])} doorway` });
    if (d.rooms[1]) keys.push({ n: `door:${d.wallId}:${d.i}:b`, x: b.x, z: b.z, room: d.rooms[1], label: `${nm(d.rooms[0])} doorway` });
  }
  for (const rm of rooms) {
    if (keys.some((k) => k.room === rm.id && !k.n.startsWith('door:'))) continue;
    const mx = (rm.floor.x0 + rm.floor.x1) / 2, mz = (rm.floor.z0 + rm.floor.z1) / 2; let best = null, bd = Infinity;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (!free[r * cols + c]) continue; const x = cx(grid, c), z = cz(grid, r); if (!inRect(x, z, rm.place)) continue; const d = Math.hypot(x - mx, z - mz); if (d < bd) { bd = d; best = { x, z }; } }
    if (best) keys.push({ n: `room:${rm.id}`, x: r9(best.x), z: r9(best.z), room: rm.id, label: rm.name.toLowerCase() });
  }
  lot.keyPoints = keys;
  lot._keyInfo = keys.map((k) => { const rm = byId.get(k.room); return { floor: rm ? rm.floor : bbox, bands: doorways.filter((d) => d.rooms.includes(k.room)).map((d) => d.band) }; });
  lot.baseline = reachableKeys(lot, []);
  return lot;
}

const cx = (g, c) => ANCHOR.x + (c + g.mx0 + 0.5) * CELL, cz = (g, r) => ANCHOR.z + (r + g.mz0 + 0.5) * CELL;
const roomIdOfFloor = (rooms, x, z) => rooms.find((r) => inRect(x, z, r.floor))?.id ?? null;
/** Clears every cell whose centre is within PLAYER_R of any of the rects. */
function stamp(free, g, rects) {
  for (const o of rects) {
    const c0 = Math.max(0, Math.floor((o.x0 - PLAYER_R - g.x0) / CELL) - 1), c1 = Math.min(g.cols - 1, Math.ceil((o.x1 + PLAYER_R - g.x0) / CELL) + 1);
    const r0 = Math.max(0, Math.floor((o.z0 - PLAYER_R - g.z0) / CELL) - 1), r1 = Math.min(g.rows - 1, Math.ceil((o.z1 + PLAYER_R - g.z0) / CELL) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (free[r * g.cols + c] && distToRect(cx(g, c), cz(g, r), o) < PLAYER_R) free[r * g.cols + c] = 0;
  }
}
/** The walkable mask (1 = a player can stand there) once the extra rects (placed furniture) are added to the layout's own obstacles. */
export function freeCells(lot, extra = []) { const free = lot.freeBase.slice(); stamp(free, lot.grid, extra); return free; }
/** World centre of cell (c, r). */
export const cellCentre = (lot, c, r) => ({ x: cx(lot.grid, c), z: cz(lot.grid, r) });
/**
 * Which key points can the player reach from the entrance with these extra obstacles? Returns a Set of key names in key order. The walk starts
 * at the free cell nearest the entrance (within 0.7 m: the spawn can sit within the player's radius of the desk).
 */
export function reachableKeys(lot, extra = []) {
  const g = lot.grid, { cols, rows } = g, free = freeCells(lot, extra), seen = new Uint8Array(cols * rows), start = lot.keyPoints[0], out = new Set();
  let best = -1, bd = 0.7;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (!free[r * cols + c]) continue; const d = Math.hypot(cx(g, c) - start.x, cz(g, r) - start.z); if (d < bd) { bd = d; best = r * cols + c; } }
  if (best < 0) return out;
  const q = [best]; seen[best] = 1;
  while (q.length) { const i = q.pop(), r = (i / cols) | 0, c = i % cols; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue; const j = nr * cols + nc; if (free[j] && !seen[j]) { seen[j] = 1; q.push(j); } } }
  lot.keyPoints.forEach((k, ki) => {
    const info = lot._keyInfo[ki], c0 = Math.max(0, Math.floor((k.x - KEY_REACH - g.x0) / CELL) - 1), c1 = Math.min(cols - 1, Math.ceil((k.x + KEY_REACH - g.x0) / CELL) + 1), r0 = Math.max(0, Math.floor((k.z - KEY_REACH - g.z0) / CELL) - 1), r1 = Math.min(rows - 1, Math.ceil((k.z + KEY_REACH - g.z0) / CELL) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!seen[r * cols + c]) continue; const x = cx(g, c), z = cz(g, r);
      if (Math.hypot(x - k.x, z - k.z) <= KEY_REACH && (inRect(x, z, info.floor) || info.bands.some((b) => inRect(x, z, b)))) { out.add(k.n); return; }
    }
  });
  return out;
}

/* ---------- rooms at a point ---------- */
/** The room whose place rect (where furniture and the player may be) holds the point, or null. */
export function roomAt(layout, x, z) { return lotOf(layout).rooms.find((r) => inRect(x, z, r.place)) ?? null; }
/** The room whose floor rect (wall face to wall face) holds the point, or null. Use this for "which room is the player in". */
export function roomAtFloor(layout, x, z) { return lotOf(layout).rooms.find((r) => inRect(x, z, r.floor)) ?? null; }

/* ---------- interactables ---------- */
const wrapAngle = (a) => { const t = Math.PI * 2; let v = a % t; if (v > Math.PI) v -= t; if (v <= -Math.PI) v += t; return v; };
function buildInteractables(L, fixtures, rooms) {
  const count = {}; for (const f of fixtures) for (const u of kindOf(f.kind)?.uses || []) count[u.id] = (count[u.id] || 0) + 1;
  const out = [];
  for (const f of fixtures) {
    const def = kindOf(f.kind); if (!def?.uses) continue; const rot = f.rot || 0;
    for (const u of def.uses) {
      const p = rotXZ(u.dx, u.dz, rot), x = r9(f.x + p.x), z = r9(f.z + p.z), it = { id: count[u.id] === 1 ? u.id : `${f.id}:${u.id}`, fixture: f.id, use: u.id, kind: f.kind, action: u.action, room: roomIdOfFloor(rooms, x, z) ?? f.room, x, z, radius: u.radius, label: u.label };
      if (u.sit) { const s = rotXZ(u.sit.dx, u.sit.dz, rot); it.seat = { x: r9(f.x + s.x), z: r9(f.z + s.z), yaw: wrapAngle(rot4(rot) * Math.PI / 2 + u.sit.yaw), y: u.sit.y }; }
      out.push(it);
    }
  }
  return out;
}
/** Every fixture use at its world position: [{ id, fixture, use, kind, action, room, x, z, radius, label, seat? }]. Ids follow the uniqueness rule in data/homes.js. */
export function interactablesOf(layout) { return lotOf(layout).interactables; }

/* ---------- validation ---------- */
const NAME_OK = /^[a-z][a-z0-9_]*$/;
/** The checks every shipped layout must pass. Returns { ok, errors[] } (strings, naming the offending room, fixture or wall). */
export function validateLayout(layout) {
  const L = resolve(layout), errors = []; const err = (m) => errors.push(m);
  if (!L || typeof L !== 'object') return { ok: false, errors: ['not a layout'] };
  if (typeof L.id !== 'string' || !NAME_OK.test(L.id)) err(`layout id ${String(L.id)} is not a plain lowercase id`);
  if (!Array.isArray(L.rooms) || !L.rooms.length) return { ok: false, errors: [...errors, 'no rooms'] };
  if (!Array.isArray(L.walls) || !Array.isArray(L.fixtures)) return { ok: false, errors: [...errors, 'walls and fixtures must be arrays'] };
  if (!Number.isInteger(L.maxPlaced) || L.maxPlaced < 1) err('maxPlaced must be a positive integer');
  if (!Number.isSafeInteger(L.price) || L.price < 0) err('price must be a non-negative integer number of cents');
  if (!Number.isInteger(L.tier) || L.tier < 0) err('tier must be a non-negative integer');
  /* rooms */
  const ids = new Set();
  for (const r of L.rooms) {
    if (typeof r.id !== 'string' || !NAME_OK.test(r.id) || r.id in Object.prototype || RESERVED_ROOM_IDS.includes(r.id)) err(`room id ${String(r.id)} is not allowed`);
    if (ids.has(r.id)) err(`duplicate room id ${r.id}`); ids.add(r.id);
    const f = r.floor; if (!f || ![f.x0, f.z0, f.x1, f.z1].every(Number.isFinite) || f.x1 - f.x0 <= 2 * INSET || f.z1 - f.z0 <= 2 * INSET) err(`room ${r.id} has no usable floor rect`);
  }
  if (errors.length) return { ok: false, errors };
  if (L.rooms[0].id !== 'living') err('the first room must be "living" (stable across tiers)');
  for (let i = 0; i < L.rooms.length; i++) for (let j = i + 1; j < L.rooms.length; j++) { const a = L.rooms[i].floor, b = L.rooms[j].floor; if (rectsHit(grow(a, WALL_T / 2 - 1e-3), grow(b, WALL_T / 2 - 1e-3))) err(`rooms ${L.rooms[i].id} and ${L.rooms[j].id} are closer than a wall's thickness`); }
  let lot; try { lot = lotOf(L); } catch (e) { return { ok: false, errors: [...errors, String(e.message || e)] }; }
  const bw = lot.bbox.x1 - lot.bbox.x0, bd = lot.bbox.z1 - lot.bbox.z0;
  if (Math.max(bw, bd) > LAYOUT_LIMITS.longSide + 1e-6 && L.id !== 'studio') err(`the long side is ${Math.max(bw, bd).toFixed(2)} m, over the ${LAYOUT_LIMITS.longSide} m readability cap`);
  if (bw > LAYOUT_LIMITS.footprintW + 1e-6 || bd > LAYOUT_LIMITS.footprintD + 1e-6) err(`the footprint ${bw.toFixed(2)} x ${bd.toFixed(2)} m is over ${LAYOUT_LIMITS.footprintW} x ${LAYOUT_LIMITS.footprintD}`);
  if (L.yard != null && !(Number.isFinite(L.yard.margin) && L.yard.margin >= 0 && L.yard.margin <= 10)) err('yard.margin must be a number from 0 to 10');
  /* walls: axis-aligned, every run between at most two rooms, no run inside a room, no gaps in the envelope */
  for (const w of L.walls) { if (!(Math.abs(w.z1 - w.z0) < EPS || Math.abs(w.x1 - w.x0) < EPS)) err(`wall ${w.id} is not axis-aligned`); if (!(typeof w.id === 'string' && w.id)) err('a wall has no id'); }
  if (new Set(L.walls.map((w) => w.id)).size !== L.walls.length) err('duplicate wall ids');
  for (const w of L.walls) {
    const horiz = Math.abs(w.z1 - w.z0) < EPS, lo = horiz ? Math.min(w.x0, w.x1) : Math.min(w.z0, w.z1), hi = horiz ? Math.max(w.x0, w.x1) : Math.max(w.z0, w.z1), ds = [...(w.doors || [])].sort((p, q) => p.at - q.at);
    ds.forEach((d, k) => {
      if (!(d.w >= LAYOUT_LIMITS.doorMin - EPS)) err(`wall ${w.id} doorway ${k} is narrower than ${LAYOUT_LIMITS.doorMin} m`);
      if (d.at - d.w / 2 < lo + 0.3 || d.at + d.w / 2 > hi - 0.3) err(`wall ${w.id} doorway ${k} is too close to the end of the wall`);
      if (k && d.at - d.w / 2 < ds[k - 1].at + ds[k - 1].w / 2 + 0.3) err(`wall ${w.id} doorways ${k - 1} and ${k} are too close`);
    });
  }
  for (const run of lot.walls) {
    if (run.rooms[0] === null && run.rooms[1] === null) err(`wall run ${run.id} has no room on either side`);
    if (run.rooms[0] !== null && run.rooms[0] === run.rooms[1]) err(`wall run ${run.id} has the same room on both sides`);
    for (const t of [0.15, 0.5, 0.85]) {
      const m = run.a + (run.b - run.a) * t, n = run.axis === 'x' ? { x: m, z: run.c - H - 0.1 } : { x: run.c - H - 0.1, z: m }, p = run.axis === 'x' ? { x: m, z: run.c + H + 0.1 } : { x: run.c + H + 0.1, z: m };
      if ((roomIdOfFloor(lot.rooms, n.x, n.z) ?? null) !== run.rooms[0] || (roomIdOfFloor(lot.rooms, p.x, p.z) ?? null) !== run.rooms[1]) { err(`wall run ${run.id} borders more than one room on a side (split the wall where the neighbour changes)`); break; }
    }
    for (const rm of lot.rooms) if (rectsHit(run, rm.floor)) err(`wall run ${run.id} cuts into room ${rm.id}`);
    if (Object.hasOwn(L.walls.find((w) => w.id === run.wallId) || {}, 'exterior') && !!L.walls.find((w) => w.id === run.wallId).exterior !== (run.role === 'exterior')) err(`wall ${run.wallId} says exterior=${!!L.walls.find((w) => w.id === run.wallId).exterior} but borders ${run.rooms.join(' / ')}`);
  }
  for (const d of lot.doorways) { if (!d.rooms[0] || !d.rooms[1] || d.rooms[0] === d.rooms[1]) err(`doorway ${d.id} must join two different rooms`); }
  const covered = (x, z) => lot.walls.some((w) => inRect(x, z, grow(w, 0.01))) || lot.doorways.some((d) => inRect(x, z, d.band));
  for (const rm of lot.rooms) {                                                    // the envelope: no open edge around any room
    const f = rm.floor, probes = []; for (let x = f.x0 + 0.05; x < f.x1; x += 0.1) probes.push([x, f.z0 - 0.05], [x, f.z1 + 0.05]); for (let z = f.z0 + 0.05; z < f.z1; z += 0.1) probes.push([f.x0 - 0.05, z], [f.x1 + 0.05, z]);
    const open = probes.find(([x, z]) => !covered(x, z)); if (open) err(`room ${rm.id} has an open edge near (${open[0].toFixed(2)}, ${open[1].toFixed(2)}): no wall there`);
  }
  /* entry */
  const e = L.entry; if (!e || !e.spawn || !e.exit || !e.door) err('entry needs door, spawn and exit');
  else {
    const living = lot.rooms[0]; if (!inRect(e.spawn.x, e.spawn.z, living.place) || !inRect(e.exit.x, e.exit.z, living.place)) err('spawn and exit must be inside the living room');
    if (!lot.walls.some((w) => w.role === 'exterior' && w.rooms.includes('living') && inRect(e.door.x, e.door.z, grow(w, 0.3)))) err('the entry door is not on an exterior wall of the living room');
  }
  /* fixtures */
  const fids = new Set();
  for (const f of L.fixtures) {
    const def = kindOf(f.kind), rm = lot.byId.get(f.room);
    if (typeof f.id !== 'string' || fids.has(f.id)) err(`duplicate or missing fixture id ${String(f.id)}`); fids.add(f.id);
    if (!def) { err(`fixture ${f.id} has unknown kind ${f.kind}`); continue; } if (!rm) { err(`fixture ${f.id} names unknown room ${f.room}`); continue; }
    if (![f.x, f.z].every(Number.isFinite) || !Number.isInteger(f.rot ?? 0) || (f.rot ?? 0) < 0 || (f.rot ?? 0) > 3) err(`fixture ${f.id} has an invalid pose`);
    const fp = footprintOf(def, f.rot || 0), rc = rectAt(f.x, f.z, fp.w, fp.d);
    if (!rectInside(rc, grow(rm.place, 0.5))) err(`fixture ${f.id} (${f.kind}) is not inside room ${f.room}'s place rect (+0.5 m)`);
    for (const u of def.uses || []) {
      const p = rotXZ(u.dx, u.dz, f.rot || 0), x = f.x + p.x, z = f.z + p.z;
      if (!ACTIONS.includes(u.action)) err(`fixture ${f.id} use ${u.id} has unknown action ${u.action}`);
      if (u.action === 'sit' && !u.sit) err(`fixture ${f.id} use ${u.id} is a sit with no seat`);
      if (!inRect(x, z, rm.floor)) err(`fixture ${f.id} use ${u.id} stands outside room ${f.room}`);
      if (lot.collide.some((c) => inRect(x, z, c, -EPS))) err(`fixture ${f.id} use ${u.id} stands inside a fixture`);
    }
  }
  const ci = lot.collide; for (let i = 0; i < ci.length; i++) for (let j = i + 1; j < ci.length; j++) if (rectsHit(ci[i], ci[j])) err(`fixtures ${ci[i].n} and ${ci[j].n} overlap`);
  for (const d of lot.doorways) for (const c of ci) if (rectsHit(c, d.approach)) err(`fixture ${c.n} blocks the doorway ${d.id}`);
  const useIds = lot.interactables.map((i) => i.id); if (new Set(useIds).size !== useIds.length) err('interactable ids are not unique');
  /* keys */
  const kn = lot.keyPoints.map((k) => k.n); if (new Set(kn).size !== kn.length) err('key point names are not unique');
  for (const k of lot.keyPoints) {
    const rm = lot.byId.get(k.room); if (!rm) { err(`key ${k.n} names unknown room ${k.room}`); continue; }
    if (!inRect(k.x, k.z, rm.floor)) err(`key ${k.n} is outside room ${k.room}`);
    if (ci.some((c) => inRect(k.x, k.z, c, -EPS))) err(`key ${k.n} is inside a fixture`);
    if (!lot.baseline.has(k.n)) err(`key ${k.n} (${k.label}) cannot be reached from the entrance in the empty house`);
  }
  /* windows and lights */
  const NORMAL = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 };
  (L.windows || []).forEach((w, i) => {
    if (!(w.w > 0 && w.h > 0 && Number.isFinite(w.x) && Number.isFinite(w.y) && Number.isFinite(w.z))) { err(`window ${i} is malformed`); return; }
    const ok = lot.walls.some((run) => {
      if (run.role !== 'exterior') return false; const ry = NORMAL[run.side], dry = Math.abs(Math.atan2(Math.sin((w.ry || 0) - ry), Math.cos((w.ry || 0) - ry)));
      if (dry > 1e-6) return false;
      const face = run.axis === 'x' ? (run.side === 'N' ? run.c + H : run.c - H) : (run.side === 'W' ? run.c + H : run.c - H), across = run.axis === 'x' ? w.z : w.x, along = run.axis === 'x' ? w.x : w.z;
      return Math.abs(across - face) <= 0.3 && along - w.w / 2 >= run.a - EPS && along + w.w / 2 <= run.b + EPS;
    });
    if (!ok) err(`window ${i} at (${w.x}, ${w.z}) is not on an exterior wall face with the right facing`);
  });
  const perRoom = {};
  for (const p of L.pointLights || []) {
    const rm = lot.byId.get(p.room); if (!rm) { err('a point light names no room'); continue; }
    perRoom[p.room] = (perRoom[p.room] || 0) + 1; if (!inRect(p.x, p.z, rm.floor)) err(`a point light of ${p.room} is outside it`);
    const diag = Math.hypot(rm.floor.x1 - rm.floor.x0, rm.floor.z1 - rm.floor.z0); if (p.dist > diag * LAYOUT_LIMITS.lightDistFactor + 1e-6) err(`a point light of ${p.room} reaches ${p.dist} m, over its room diagonal ${diag.toFixed(1)} m`);
    if (p.castShadow) err('point lights must not cast shadows');
  }
  for (const [rid, n] of Object.entries(perRoom)) if (n > LAYOUT_LIMITS.pointLightsPerRoom) err(`room ${rid} has ${n} point lights (max ${LAYOUT_LIMITS.pointLightsPerRoom})`);
  if ((L.pointLights || []).length > LAYOUT_LIMITS.pointLightsPerLayout) err(`more than ${LAYOUT_LIMITS.pointLightsPerLayout} point lights in the layout`);
  for (const c of L.ceilingLights || []) if (!lot.byId.has(c.room)) err('a ceiling light names no room');
  for (const rm of lot.rooms) {
    if (!perRoom[rm.id]) err(`room ${rm.id} has no point light`);
    if (!L.fixtures.some((f) => f.room === rm.id && (kindOf(f.kind)?.uses || []).some((u) => u.action === 'lights'))) err(`room ${rm.id} has no light switch`);
  }
  return { ok: errors.length === 0, errors };
}
