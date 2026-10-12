/**
 * Data-driven home interior (package B1). `buildHome(layout, kit)` turns a layout from data/homes.js (rooms, walls with doorways, fixtures, windows,
 * lights, decor) into THREE objects, colliders and interactables. `kit` is the closure helper set world/interiors.js `buildInterior` already has
 * (group, colliders, interactables, lights, windows, animated, disposables, mat, add, blob, label, ceilingLight, point, windowPane).
 * docs/HOMES.md section 5 is the contract; "Decisions (package B1)" at the end of that file records where this file had to choose.
 *
 * Two halves: `deriveHome(layout)` is PURE geometry (no THREE; wall runs, doorways, colliders, interactable positions, so it is easy to test),
 * `buildHome` makes the scene from it. The wall/doorway derivation here follows the same rules as `lotOf` (docs/HOMES.md section 3); it is kept in
 * one function on purpose, so that it can be swapped for `lotOf(layout)` when core/lot.js lands.
 */
import * as THREE from 'three';
import { WALL_T, INSET, DOOR_H, CEIL_H, rotXZ, rotRect, FIXTURE_KINDS, HOMES } from '../data/homes.js';
import { WALLS, FLOORS, KIND_ACTIVITY } from '../data/furniture.js';
import { own } from '../core/util.js';
import { mulberry32 } from '../core/rng.js';
import { itemDef } from '../core/home.js';
import { tileTexture, woodTexture } from './textures.js';
import { furnitureModel } from './furnitureModels.js';
import { FIXTURE_BUILDERS, FIXTURE_META } from './homeKinds.js';
import { WALL_MODES, applyWallMode, buildWallExtras, sideOfNormal, sideOfPoint } from './homeWalls.js';
import { buildYard } from './homeYard.js';

const EPS = 1e-6, T = WALL_T;
export const SHELL = { wall: '#e9e3d6', ceil: '#f4f2ec', trim: '#ffffff', sill: '#a89a84' };
const CAMERA_CUT_H = 0.9, TRIM_H = 0.12, TRIM_T = 0.05, TRIM_OFF = 0.03, DOOR_VIS_H = 2.4, DOOR_VIS_T = 0.08, LIGHT_ON = 1.4;

/* =========================================================================================== pure geometry (no THREE) */

const inRect = (r, x, z) => x >= r.x0 - EPS && x <= r.x1 + EPS && z >= r.z0 - EPS && z <= r.z1 + EPS;
const placeOf = (r) => ({ x0: r.floor.x0 + INSET, z0: r.floor.z0 + INSET, x1: r.floor.x1 - INSET, z1: r.floor.z1 - INSET });
/** The room whose floor rect contains the point (null outside every room). Use this for "which room is the player in". */
export const roomAtFloor = (layout, x, z) => { for (const r of layout.rooms) if (inRect(r.floor, x, z)) return r; return null; };
/** The room whose place rect (floor inset by INSET) contains the point. */
export const roomAtPlace = (layout, x, z) => { for (const r of layout.rooms) if (inRect(placeOf(r), x, z)) return r; return null; };
const nearestRoom = (layout, x, z) => {
  let best = layout.rooms[0], bd = Infinity;
  for (const r of layout.rooms) { const f = r.floor, d = Math.hypot(Math.max(f.x0 - x, 0, x - f.x1), Math.max(f.z0 - z, 0, z - f.z1)); if (d < bd) { bd = d; best = r; } }
  return best;
};
/** The room a point belongs to: the one that contains it, else the nearest (windows, doors and lights sit on or just outside a wall face). */
const roomIdAt = (layout, x, z) => (roomAtFloor(layout, x, z) ?? nearestRoom(layout, x, z)).id;

const axisOf = (w) => (Math.abs(w.z0 - w.z1) < EPS ? 'x' : Math.abs(w.x0 - w.x1) < EPS ? 'z' : null);
const pt = (axis, along, perp) => (axis === 'x' ? { x: along, z: perp } : { x: perp, z: along });

/**
 * Wall runs, doorways and the rest of the geometry a layout implies. Pure and cached per layout object.
 *   walls     : one entry per solid run of a wall (a wall with doorways is split around them; a run is also split where the room on one of its faces
 *               changes): { id, wallId, axis, c (perp centre-line), s0, s1 (along range, centre-line to centre-line / to the jamb), ends: [e0, e1]
 *               (how far the box extends past s0 / s1: WALL_T/2 at a corner or T-junction, 0 at a door jamb or a free end), x0, z0, x1, z1 (the box),
 *               rooms: [roomOnNegSide, roomOnPosSide] (null = outside), role: 'exterior' | 'partition', side: 'N' | 'S' | 'E' | 'W' | null }
 *   doorways  : { wallId, i, x, z, w, axis, rooms: [a, b] }
 *   colliders : physics rectangles { n, x0, z0, x1, z1, h } (the layout's `colliders` rows, else derived from the fixture kinds)
 *   wallRects : the collider rect of every run that needs one (a run on the outer edge of the bbox is already covered by `bounds`; the Studio has none)
 *   interactables : every use of every fixture, world position via rotXZ, ids unique per the rule in data/homes.js
 */
const derived = new WeakMap();
export function deriveHome(layout) {
  const hit = derived.get(layout); if (hit) return hit;
  if (!layout || !Array.isArray(layout.rooms) || !layout.rooms.length) throw new Error('home layout needs at least one room');
  const rooms = layout.rooms.map((r) => ({ ...r, place: placeOf(r) }));
  const L = { ...layout, rooms };   // roomAtFloor wants rooms; the derived rooms carry `place`
  const bbox = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity };
  for (const r of rooms) { bbox.x0 = Math.min(bbox.x0, r.floor.x0); bbox.z0 = Math.min(bbox.z0, r.floor.z0); bbox.x1 = Math.max(bbox.x1, r.floor.x1); bbox.z1 = Math.max(bbox.z1, r.floor.z1); }
  const bounds = { x0: bbox.x0 + INSET, x1: bbox.x1 - INSET, z0: bbox.z0 + INSET, z1: bbox.z1 - INSET };

  /* ---- walls: centre-lines first, then runs ---- */
  const lines = (layout.walls || []).map((w) => {
    const axis = axisOf(w); if (!axis) throw new Error(`wall ${w.id}: walls must be axis-aligned`);
    const c = axis === 'x' ? w.z0 : w.x0, a0 = axis === 'x' ? Math.min(w.x0, w.x1) : Math.min(w.z0, w.z1), a1 = axis === 'x' ? Math.max(w.x0, w.x1) : Math.max(w.z0, w.z1);
    return { w, axis, c, a0, a1 };
  });
  /** Does the point (along, perp) of a wall of `axis` lie on the centre-line of some OTHER, perpendicular wall? (corner or T-junction) */
  const onJunction = (self, along, perp) => lines.some((o) => o !== self && o.axis !== self.axis && Math.abs(o.c - along) < EPS && perp >= o.a0 - T / 2 - EPS && perp <= o.a1 + T / 2 + EPS);
  const faceRoom = (axis, c, along, side) => { const p = pt(axis, along, c + side * (T / 2 + 0.05)); return roomAtFloor(L, p.x, p.z)?.id ?? null; };
  const walls = [], doorways = [];
  for (const ln of lines) {
    const { w, axis, c, a0, a1 } = ln;
    const doors = (w.doors || []).filter((d) => d && Number.isFinite(d.at) && d.w > 0).map((d, i) => ({ ...d, i, lo: d.at - d.w / 2, hi: d.at + d.w / 2 })).sort((p, q) => p.at - q.at);
    for (const d of doors) {
      const p = pt(axis, d.at, c);
      doorways.push({ wallId: w.id, i: d.i, x: p.x, z: p.z, w: d.w, axis, rooms: [faceRoom(axis, c, d.at, -1), faceRoom(axis, c, d.at, 1)] });
    }
    let cur = a0, k0 = 'end'; const pieces = [];
    for (const d of doors) { if (d.lo - cur > EPS) pieces.push({ s0: cur, s1: d.lo, k0, k1: 'jamb' }); cur = Math.max(cur, d.hi); k0 = 'jamb'; }
    if (a1 - cur > EPS) pieces.push({ s0: cur, s1: a1, k0, k1: 'end' });
    // split a piece where the room on one of its faces changes (floor edges of rooms that touch a face of the wall)
    const cuts = [];
    for (const r of rooms) {
      const f = r.floor, lo = axis === 'x' ? f.x0 : f.z0, hi = axis === 'x' ? f.x1 : f.z1, p0 = axis === 'x' ? f.z0 : f.x0, p1 = axis === 'x' ? f.z1 : f.x1;
      if ([c - T / 2, c + T / 2].some((face) => Math.abs(p0 - face) < 0.06 || Math.abs(p1 - face) < 0.06)) cuts.push(lo, hi);
    }
    const out = [];
    for (const p of pieces) {
      const inner = [...new Set(cuts.map((v) => Math.round(v * 1e6) / 1e6))].filter((v) => v > p.s0 + T / 2 + EPS && v < p.s1 - T / 2 - EPS).sort((a, b) => a - b);
      const xs = [p.s0, ...inner, p.s1];
      for (let i = 0; i < xs.length - 1; i++) out.push({ s0: xs[i], s1: xs[i + 1], k0: i === 0 ? p.k0 : 'split', k1: i === xs.length - 2 ? p.k1 : 'split' });
    }
    const kept = [];
    for (const p of out) {
      const e0 = p.k0 === 'end' && onJunction(ln, p.s0, c) ? T / 2 : 0, e1 = p.k1 === 'end' && onJunction(ln, p.s1, c) ? T / 2 : 0;
      const mid = (p.s0 + p.s1) / 2, rooms2 = [faceRoom(axis, c, mid, -1), faceRoom(axis, c, mid, 1)];
      if (!rooms2[0] && !rooms2[1] && p.s1 - p.s0 < T + 0.05) continue;   // the sliver of an exterior wall behind a partition's end: the partition's own box fills it
      kept.push({ p, e0, e1, rooms2 });
    }
    kept.forEach(({ p, e0, e1, rooms2 }, n) => {
      const role = rooms2[0] && rooms2[1] ? 'partition' : 'exterior';
      const side = role === 'partition' ? null : !rooms2[0] ? (axis === 'x' ? 'N' : 'W') : (axis === 'x' ? 'S' : 'E');
      const a = p.s0 - e0, b = p.s1 + e1, box = axis === 'x' ? { x0: a, x1: b, z0: c - T / 2, z1: c + T / 2 } : { x0: c - T / 2, x1: c + T / 2, z0: a, z1: b };
      walls.push({ id: kept.length > 1 ? `${w.id}.${n}` : w.id, wallId: w.id, axis, c, s0: p.s0, s1: p.s1, ends: [e0, e1], ...box, rooms: rooms2, role, side });
    });
  }
  // a run that lies on the outer edge of the bbox is already held in by `bounds`; every other run (partitions, notches of an L-shaped house) is a collider
  const wallRects = walls.filter((r) => {
    if (r.role === 'partition') return true;
    const inner = r.rooms[0] ? r.c - T / 2 : r.c + T / 2;   // the face that looks into the room
    const edge = r.axis === 'x' ? (r.side === 'N' ? bbox.z0 : bbox.z1) : (r.side === 'W' ? bbox.x0 : bbox.x1);
    return Math.abs(inner - edge) > 0.02;
  }).map((r) => ({ id: r.id, x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, h: CEIL_H }));

  /* ---- fixtures: colliders and interactables ---- */
  const fixtures = (layout.fixtures || []).map((f) => {
    const def = FIXTURE_KINDS[f.kind]; if (!def || !own(FIXTURE_KINDS, f.kind)) throw new Error(`fixture ${f.id}: unknown kind ${f.kind}`);
    return { ...f, rot: f.rot ?? 0, def, room: f.room ?? roomIdAt(L, f.x, f.z) };
  });
  const colliders = Array.isArray(layout.colliders) ? layout.colliders.map((c) => ({ ...c })) : fixtures.filter((f) => f.def.solid !== false).map((f) => {
    const r = rotRect({ x0: -f.def.w / 2, z0: -f.def.d / 2, x1: f.def.w / 2, z1: f.def.d / 2 }, f.rot);
    return { n: f.id, x0: f.x + r.x0, z0: f.z + r.z0, x1: f.x + r.x1, z1: f.z + r.z1, h: f.def.ch ?? f.def.h };
  });
  const useCount = new Map(); for (const f of fixtures) for (const u of f.def.uses || []) useCount.set(u.id, (useCount.get(u.id) || 0) + 1);
  const interactables = [];
  for (const f of fixtures) for (const u of f.def.uses || []) {
    const o = rotXZ(u.dx, u.dz, f.rot), x = f.x + o.x, z = f.z + o.z;
    interactables.push({ id: useCount.get(u.id) > 1 ? `${f.id}:${u.id}` : u.id, fixture: f.id, use: u, action: u.action, x, z, radius: u.radius, label: u.label, room: roomIdAt(L, x, z) });
  }

  /* ---- lights, windows, decor, entry ---- */
  const inRoom = (e) => ({ ...e, room: e.room ?? roomIdAt(L, e.x, e.z) });
  const entry = layout.entry || {};
  let doorAxis = 'x', bestD = Infinity;   // the front door lies in the wall nearest to it: its width runs along that wall
  if (entry.door) for (const ln of lines) {
    const along = ln.axis === 'x' ? entry.door.x : entry.door.z, perp = ln.axis === 'x' ? entry.door.z : entry.door.x;
    const d = Math.hypot(Math.max(ln.a0 - along, 0, along - ln.a1), Math.abs(perp - ln.c)); if (d < bestD) { bestD = d; doorAxis = ln.axis; }
  }
  const out = {
    layout, id: layout.id, rooms, bbox, bounds, walls, doorways, wallRects, fixtures, colliders, interactables,
    windows: (layout.windows || []).map(inRoom), ceilingLights: (layout.ceilingLights || []).map(inRoom), pointLights: (layout.pointLights || []).map(inRoom),
    decor: (layout.decor || []).map(inRoom),
    entry: { door: entry.door ? { ...entry.door, axis: doorAxis, room: roomIdAt(L, entry.door.x, entry.door.z) } : null, spawn: entry.spawn ? { ...entry.spawn } : null, exit: entry.exit ? { ...entry.exit } : null },
  };
  derived.set(layout, out);
  return out;
}

/* ======================================================================================================= helpers (THREE) */

const wrapAngle = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const matKey = (color, o) => {
  let k = String(color);
  for (const n of Object.keys(o).sort()) { const v = o[n]; if (v && v.isColor) k += `|${n}:#${v.getHexString()}`; else if (v !== null && typeof v === 'object') return null; else k += `|${n}:${v}`; }
  return k;
};
/** Make faces that share a material one draw group (a thin wall box is 1-3 draws instead of 6). The material array stays 6 long, in BoxGeometry order. */
function mergeBoxGroups(geo, mats) {
  geo.clearGroups();
  for (let i = 0; i < 6;) { let j = i + 1; while (j < 6 && mats[j] === mats[i]) j++; geo.addGroup(i * 6, (j - i) * 6, i); i = j; }
}

/** What each fixture action does. (c = the interior ctx main.js hands to run(); h = the interactable's handle.) */
const ACTION_RUN = {
  sleep: (c) => c.ui.sleep(),
  sit: (c, h) => {
    const s = h.use.sit || {}, p = rotXZ(s.dx ?? 0, s.dz ?? 0, h.rot);
    c.player.sitAt({ x: h.pose.x + p.x, z: h.pose.z + p.z, yaw: wrapAngle((h.rot * Math.PI) / 2 + (s.yaw ?? 0)), y: s.y ?? 0, stand: { x: h.x, z: h.z } });
  },
  tv: (c, h) => {
    const tv = h.fx.tv; if (!tv) return;
    if (!tv.on) { tv.on = true; c.audio?.blip('tick'); c.ui.activity('tv'); }
    else c.ui.menu('Television', 'What would you like to do?', [{ label: 'Next channel', run: () => { tv.show++; } }, { label: 'Turn off', run: () => tv.off() }, { label: 'Cancel' }]);
  },
  cook: (c) => c.ui.cook(),
  fridge: (c) => c.ui.openFridge(),
  computer: (c) => c.ui.menu('Computer', 'What would you like to do?', [
    { label: '💼 Browse jobs', run: () => c.ui.openApp('jobs') }, { label: '📰 Read the news', run: () => c.ui.openApp('news') },
    { label: '🛋️ Furniture shop', run: () => c.ui.furnitureShop() }, { label: '🏠 Homes', run: () => c.ui.openApp('homes') },
    { label: '🎨 Redecorate (build mode)', primary: true, run: () => c.ui.build() }, { label: 'Close' }]),
  radio: (c) => c.ui.radioMenu(),
  wardrobe: (c) => c.ui.openWardrobe(),
  read: (c) => c.ui.activity('read'),
  shower: (c) => c.ui.activity('shower'),
  lights: (c, h) => { h.toggleLights(h.room); c.audio?.blip('tick'); },
  storage: (c) => (c.ui.openStorage ?? c.ui.furnitureShop)(),   // the garage shelf opens the Catalogue's "In storage" tab (main.js ui.openStorage); a host without it opens the shop
};
/** Actions whose prompt text changes at runtime. */
const ACTION_LABEL = { tv: (h) => () => (h.fx.tv?.on ? 'Change channel / Off' : h.use.label) };

/* ======================================================================================================= the builder */

/**
 * @param layout a layout from data/homes.js (or any object of that shape)
 * @param kit    the helper set from buildInterior (see the file header)
 * @returns the part of the Interior API that is about homes (buildInterior merges it into the interior it returns)
 */
export function buildHome(layout, kit) {
  const geo = deriveHome(layout);
  const { group, colliders, interactables, lights, windows, animated, disposables } = kit;
  const track = (o) => { disposables.push(o); return o; };
  const matCache = new Map();
  const mat = (color, o = {}) => {   // equal standard materials are shared inside one interior (the old builder made 99 for 105 meshes)
    const key = typeof color === 'string' ? matKey(color, o) : null; if (key && matCache.has(key)) return matCache.get(key);
    const m = kit.mat(color, o); if (key) matCache.set(key, m); return m;
  };
  const basic = (color, o = {}) => track(new THREE.MeshBasicMaterial({ color, ...o }));
  const animate = (fn) => animated.push(fn);
  const hooks = { mat, basic, track, animate };
  const localKit = (g) => ({
    g, ...hooks,
    add: (geom, m, x, y, z, o = {}) => kit.add(geom, m, x, y, z, { ...o, parent: g }),
    box: (w, h, d, color, x, y, z, { mo = {}, cast = false } = {}) => kit.add(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color, mo) : color, x, y + h / 2, z, { parent: g, cast }),
    label: (text, w, h, x, y, z, ry = 0, opts = {}) => kit.label(text, w, h, x, y, z, ry, { ...opts, parent: g }),
  });
  const mk = (name, parent = group) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };

  const wallGroup = mk('walls');
  const roomGroups = {}; for (const r of geo.rooms) roomGroups[r.id] = mk(`room:${r.id}`);
  const parts = { group, wallGroup, rooms: geo.rooms, roomGroups, walls: [], lintels: [], trims: [], ceilings: [], ceilFixtures: [], floors: [], yard: null, openings: [], labels: null };
  const cuttable = [];   // the pieces the walk camera may lower out of its way: partitions and the lintels over their doorways
  const groupOf = (roomId) => roomGroups[roomId] ?? roomGroups[geo.rooms[0].id];

  /* ----- per-room materials: wall paint, floor ----- */
  const trimMat = kit.mat(SHELL.trim, { roughness: 0.6 }), ceilMat = kit.mat(SHELL.ceil, { roughness: 0.95 });
  const wallMat = {}, floorMat = {};
  for (const r of geo.rooms) wallMat[r.id] = kit.mat(SHELL.wall, { roughness: 0.92 });
  const floorTex = {};   // one texture per floor key for the whole house; rooms differ only by which one their material points at
  const floorTexture = (key) => {
    if (floorTex[key]) return floorTex[key];
    const f = FLOORS[key], t = f[1] === 'tile' ? tileTexture(f[2], '#7b808a') : woodTexture(f[2]); t.repeat.set(1, 1); track(t);
    return (floorTex[key] = t);
  };
  const solo = geo.rooms.length === 1;   // a single-room layout (the Studio) caps its wall tops with the room's own paint, exactly as it always did

  /* ----- floors and ceilings ----- */
  for (const r of geo.rooms) {
    const W = r.floor.x1 - r.floor.x0, D = r.floor.z1 - r.floor.z0, cx = (r.floor.x0 + r.floor.x1) / 2, cz = (r.floor.z0 + r.floor.z1) / 2, g = roomGroups[r.id];
    const fg = new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), uv = fg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * W) / 3, (uv.getY(i) * D) / 3);   // (W/3, D/3) repeats, the Studio's 3 x 11/3
    const fm = track(new THREE.MeshStandardMaterial({ map: floorTexture('oak'), roughness: 0.45, metalness: 0.02 })); floorMat[r.id] = fm;
    const fl = kit.add(fg, fm, cx, 0, cz, { cast: false, parent: g }); fl.name = `floor:${r.id}`; parts.floors.push(fl);
    const c = kit.add(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2), ceilMat, cx, CEIL_H, cz, { cast: false, parent: g }); c.name = `ceiling:${r.id}`; parts.ceilings.push(c);
  }

  /* ----- walls: one box per run, the two broad faces take the adjacent rooms' paint ----- */
  const faceMat = (run, side) => wallMat[run.rooms[side] ?? run.rooms[1 - side]] ?? wallMat[geo.rooms[0].id];   // an exterior wall's outside face uses the adjacent room's paint
  const wallBox = (run, { y0 = 0, h = CEIL_H, a, b, role, side, name }) => {
    const len = b - a, mid = (a + b) / 2, neg = faceMat(run, 0), pos = faceMat(run, 1), cap = solo ? neg : trimMat;
    const geom = run.axis === 'x' ? new THREE.BoxGeometry(len, h, T) : new THREE.BoxGeometry(T, h, len); geom.translate(0, h / 2, 0);   // origin at the base: scale.y lowers a wall
    const mats = run.axis === 'x' ? [cap, cap, cap, cap, pos, neg] : [pos, neg, cap, cap, cap, cap];   // +x -x +y -y +z -z; +x/+z face the positive side
    mergeBoxGroups(geom, mats);
    const p = pt(run.axis, mid, run.c), m = kit.add(geom, mats, p.x, y0, p.z, { cast: false, parent: wallGroup });
    m.name = name; m.userData.wall = { role, side, run: run.id }; return m;
  };
  for (const run of geo.walls) {
    const m = wallBox(run, { a: run.axis === 'x' ? run.x0 : run.z0, b: run.axis === 'x' ? run.x1 : run.z1, role: run.role, side: run.side, name: `wall:${run.id}` }); parts.walls.push(m);
    if (run.role === 'partition') cuttable.push({ m, rect: run, lintel: false, goal: 1 });
    run.rooms.forEach((rid, si) => {   // skirting along each face that has a room in front of it, clipped to that room's floor
      if (!rid) return; const f = geo.rooms.find((q) => q.id === rid).floor, lo = Math.max(run.s0, run.axis === 'x' ? f.x0 : f.z0), hi = Math.min(run.s1, run.axis === 'x' ? f.x1 : f.z1);
      if (hi - lo < 0.02) return;
      const off = (si === 0 ? -1 : 1) * (T / 2 + TRIM_OFF), p = pt(run.axis, (lo + hi) / 2, run.c + off);
      const gm = run.axis === 'x' ? new THREE.BoxGeometry(hi - lo, TRIM_H, TRIM_T) : new THREE.BoxGeometry(TRIM_T, TRIM_H, hi - lo);
      parts.trims.push(kit.add(gm, trimMat, p.x, TRIM_H / 2, p.z, { cast: false, parent: groupOf(rid) }));
    });
    if (geo.wallRects.some((w) => w.id === run.id)) { const w = geo.wallRects.find((q) => q.id === run.id); colliders.add(w.x0, w.z0, w.x1, w.z1, w.h, 'wall'); }
  }
  // doorways: a threshold plane in the sill and a lintel (visual only) over the opening
  const sillMat = kit.mat(SHELL.sill, { roughness: 0.6 });
  for (const d of geo.doorways) {
    const sg = (d.axis === 'x' ? new THREE.PlaneGeometry(d.w, T) : new THREE.PlaneGeometry(T, d.w)).rotateX(-Math.PI / 2);
    const sill = kit.add(sg, sillMat, d.x, 0.002, d.z, { cast: false, parent: groupOf(d.rooms[0] ?? d.rooms[1]) }); sill.name = `sill:${d.wallId}:${d.i}`;
    const lo = (d.axis === 'x' ? d.x : d.z) - d.w / 2, hi = lo + d.w, run = { id: `${d.wallId}:${d.i}`, axis: d.axis, c: d.axis === 'x' ? d.z : d.x, rooms: d.rooms };
    const lm = wallBox(run, { y0: DOOR_H, h: CEIL_H - DOOR_H, a: lo, b: hi, role: 'lintel', side: null, name: `lintel:${run.id}` }); parts.lintels.push(lm);
    cuttable.push({ m: lm, lintel: true, goal: 1, rect: d.axis === 'x' ? { x0: lo, x1: hi, z0: d.z - T / 2, z1: d.z + T / 2 } : { x0: d.x - T / 2, x1: d.x + T / 2, z0: lo, z1: hi } });
  }

  /* ----- lights: per room; a switch toggles only its own room, and lights are never added or removed at runtime (intensity only) ----- */
  const lit = {}; for (const r of geo.rooms) lit[r.id] = { on: true, points: [], mats: [] };
  for (const l of geo.ceilingLights) { const m = kit.ceilingLight(l.x, l.z, l.w, l.d, groupOf(l.room)); parts.ceilFixtures.push(m); kit.ceilMeshes?.push(m); lit[l.room].mats.push(m.material); }
  for (const l of geo.pointLights) { const p = kit.point(l.x, l.y, l.z, l.intensity, l.color, l.dist); lit[l.room].points.push({ light: p, base: l.intensity }); }
  const setRoomLights = (roomId, on) => {
    const s = lit[roomId]; if (!s) return; s.on = !!on;
    for (const p of s.points) p.light.intensity = s.on ? p.base : 0;
    for (const m of s.mats) m.emissiveIntensity = s.on ? LIGHT_ON : 0;
  };

  /* ----- windows, decor, front door ----- */
  const hang = (meshes, role, side) => { for (const m of [].concat(meshes)) { m.userData.wall = { role, side }; parts.openings.push(m); } };   // B2: what hangs on a wall follows it in the cutaway modes
  for (const w of geo.windows) { const g = groupOf(w.room), n = g.children.length; kit.windowPane(w.x, w.y, w.z, w.w, w.h, w.ry ?? 0, g); hang(g.children.slice(n), 'window', sideOfNormal(w.ry ?? 0)); }
  for (const d of geo.decor) {
    const g = groupOf(d.room);
    if (d.kind === 'rug') kit.add(new THREE.PlaneGeometry(d.w, d.d).rotateX(-Math.PI / 2), mat(d.color ?? '#6e4b57', { roughness: 1 }), d.x, 0.015, d.z, { cast: false, parent: g });
    else if (d.kind === 'sign') hang(kit.label(d.text, d.w, d.h, d.x, d.y, d.z, d.ry ?? 0, { bg: d.bg ?? '#25456a', accent: d.accent ?? '#ffb347', parent: g }), 'sign', sideOfNormal(d.ry ?? 0));
  }
  const door = geo.entry.door;
  if (door) {
    const w = door.w ?? 1.6, gm = door.axis === 'x' ? new THREE.BoxGeometry(w, DOOR_VIS_H, DOOR_VIS_T) : new THREE.BoxGeometry(DOOR_VIS_T, DOOR_VIS_H, w);
    const dm = kit.add(gm, mat('#6b4f36'), door.x, DOOR_VIS_H / 2, door.z, { cast: false, parent: groupOf(door.room) }); dm.name = 'front-door'; hang(dm, 'door', sideOfPoint(geo.bbox, door.x, door.z));
  }

  /* ----- fixtures ----- */
  for (const c of geo.colliders) colliders.add(c.x0, c.z0, c.x1, c.z1, c.h);
  const fxOf = {};   // fixture id -> its private state object (the TV, ...)
  for (const f of geo.fixtures) {
    const g = new THREE.Group(); g.name = `fixture:${f.id}`; g.position.set(f.x, 0, f.z); g.rotation.y = (f.rot * Math.PI) / 2; groupOf(f.room).add(g);
    const k = localKit(g), fx = (fxOf[f.id] = {}), meta = FIXTURE_META[f.kind] || {};
    const ctx = { pose: { x: f.x, z: f.z, rot: f.rot }, kind: f.kind, def: f.def, fixture: f, layout, room: f.room, rnd: mulberry32(hashStr(f.id)), fx };
    const build = FIXTURE_BUILDERS[f.kind];
    if (build) build(g, k, ctx); else k.box(f.def.w, f.def.h, f.def.d, '#8a8f98', 0, 0, 0);   // a kind nobody has drawn yet still shows up as a plain block
    const blob = meta.blob === undefined ? (f.def.solid === false ? null : { w: f.def.w + 0.2, d: f.def.d + 0.2, op: 0.3 }) : meta.blob;
    if (blob) kit.blob(blob.dx ?? 0, blob.dz ?? 0, blob.w, blob.d, blob.op ?? 0.3, g);
  }
  const toggleLights = (roomId) => setRoomLights(roomId, !lit[roomId]?.on);
  for (const it of geo.interactables) {
    const run = ACTION_RUN[it.action]; if (!run) continue;
    const f = geo.fixtures.find((q) => q.id === it.fixture), h = { use: it.use, fx: fxOf[it.fixture], rot: f.rot, pose: { x: f.x, z: f.z }, x: it.x, z: it.z, room: it.room, toggleLights };
    interactables.push({ id: it.id, x: it.x, z: it.z, radius: it.radius, label: ACTION_LABEL[it.action] ? ACTION_LABEL[it.action](h) : it.label, room: it.room, fixture: it.fixture, run: (ctx) => run(ctx, h) });
  }
  const ex = geo.entry.exit;
  if (ex) interactables.push({ id: 'exit', x: ex.x, z: ex.z, radius: 1.8, label: 'Leave', room: roomIdAt({ rooms: geo.rooms }, ex.x, ex.z), run: (ctx) => ctx.ui.exitInterior() });
  group.userData.tvOff = () => { for (const fx of Object.values(fxOf)) fx.tv?.off(); };

  /* ----- the yard (B2): scenery around the house, overhead views only ----- */
  parts.yard = buildYard(layout, { ...kit, mat, basic, track }) ?? null;
  if (parts.yard) group.add(parts.yard);
  buildWallExtras(parts, geo, { ...kit, mat, basic, track });   // B2: room name decals (2+ rooms) and the garage roller door

  /* ----- camera cut: a partition between the player's head and the walk camera drops out of the way (eased); the rest of the wall stays ----- */
  let mode = 'walk', overhead = false, pick = geo.rooms.length > 1 ? 'cut' : 'up', viewer = null;
  const cutLow = CAMERA_CUT_H / CEIL_H;
  const segHitsRect = (ax, az, bx, bz, r) => {   // 2D segment against a rect (slab test)
    let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
    for (const [o, d, lo, hi] of [[ax, dx, r.x0, r.x1], [az, dz, r.z0, r.z1]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; }
      let u = (lo - o) / d, v = (hi - o) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
    }
    return true;
  };
  const resetCut = () => { for (const c of cuttable) { c.goal = 1; c.m.scale.y = 1; c.m.visible = true; } };
  /** Called by the walk camera every frame with the head and camera positions ({x, z}); null clears. Only acts while walking. */
  const setCameraCut = (head, cam) => {
    if (mode !== 'walk') return;
    for (const c of cuttable) c.goal = head && cam && segHitsRect(head.x, head.z, cam.x, cam.z, c.rect) ? (c.lintel ? 0 : cutLow) : 1;
  };
  animated.push((dt) => {   // about 0.15 s to settle
    if (mode !== 'walk') return; const k = 1 - Math.exp(-dt / 0.05);
    for (const c of cuttable) {
      const y = c.m.scale.y; if (y === c.goal || (c.goal === 1 && y === 1)) continue;
      const n = Math.abs(y - c.goal) < 0.01 ? c.goal : y + (c.goal - y) * k;
      c.m.scale.y = Math.max(0.001, n); c.m.visible = !(c.lintel && n < 0.05);
    }
  });

  /* ----- wall modes ----- */
  const nearby = (roomId) => { const s = new Set([roomId]); for (const d of geo.doorways) if (d.rooms.includes(roomId)) d.rooms.forEach((r) => r && s.add(r)); return s; };
  const roomVisibility = () => {   // walking: only the player's room and the rooms one doorway away are drawn; every overhead mode shows the whole house
    const show = mode === 'walk' && viewer ? nearby(viewer) : null;
    for (const r of geo.rooms) roomGroups[r.id].visible = !show || show.has(r.id);
  };
  const apply = (m) => {
    mode = m; const walk = m === 'walk'; resetCut();
    for (const c of parts.ceilings) c.visible = walk;
    for (const c of parts.ceilFixtures) c.visible = walk;
    if (parts.yard) parts.yard.visible = !walk;
    roomVisibility();
    applyWallMode(parts, m);   // B2: 'cut' and 'down'; it must also restore full walls for 'walk' and 'up'
  };
  const setWallMode = (m) => {
    if (!WALL_MODES.includes(m)) return;
    if (m !== 'walk') pick = m;   // remembered for the next overhead view even while walking, but never shown while walking
    apply(m === 'walk' || overhead ? m : 'walk');
  };
  const setOverhead = (on) => { overhead = !!on; apply(overhead ? pick : 'walk'); };
  const setViewer = (x, z) => { const r = roomAtFloor(geo, x, z); if (r && r.id !== viewer) { viewer = r.id; if (mode === 'walk') roomVisibility(); } return viewer; };
  apply('walk');

  /* ----- decorating: paint, floors and the pieces you placed ----- */
  const styleKey = (home, roomId, kind) => { const o = own(home.rooms, roomId) ? home.rooms[roomId] : null; return o && typeof o[kind] === 'string' ? o[kind] : home[kind]; };
  const paint = (home) => {
    for (const r of geo.rooms) {
      const wk = styleKey(home, r.id, 'wall'), fk = styleKey(home, r.id, 'floor');
      wallMat[r.id].color.set(own(WALLS, wk) ? WALLS[wk][1] : WALLS.cream[1]);
      const tex = floorTexture(own(FLOORS, fk) ? fk : 'oak'); if (floorMat[r.id].map !== tex) { floorMat[r.id].map = tex; floorMat[r.id].needsUpdate = true; }
    }
  };
  const templates = new Map(), templateRes = new Set();   // one baked model per type, cloned per piece (clones share geometry and materials)
  const template = (type) => {
    let t = templates.get(type);
    if (!t) { t = furnitureModel(type); templates.set(type, t); t.traverse((o) => { if (o.geometry) templateRes.add(o.geometry); if (o.material) [].concat(o.material).forEach((m) => templateRes.add(m)); }); }
    return t;
  };
  const pieces = new Map();   // placed id -> { sig, obj, rect, inter }
  const spotOk = (px, pz, ox, oz) => {
    if (!roomAtFloor(geo, px, pz)) return false;
    if (geo.colliders.some((c) => px >= c.x0 && px <= c.x1 && pz >= c.z0 && pz <= c.z1)) return false;
    for (const r of colliders.query(px, pz, px, pz)) if (r.tag === 'wall' && px >= r.x0 && px <= r.x1 && pz >= r.z0 && pz <= r.z1) return false;
    return colliders.rayBlocked(ox, 0.9, oz, px, 0.9, pz, { only: 'wall' }) >= 1;
  };
  const addPiece = (id, it, sig) => {
    const def = itemDef(it.type); if (!def || ![it.x, it.z, it.rot].every(Number.isFinite)) return null;
    const rot = ((Math.trunc(it.rot) % 4) + 4) % 4, room = (roomAtPlace(geo, it.x, it.z) ?? roomAtFloor(geo, it.x, it.z) ?? nearestRoom(geo, it.x, it.z)).id;
    const obj = template(it.type).clone(true); obj.position.set(it.x, 0, it.z); obj.rotation.y = (rot * Math.PI) / 2; groupOf(room).add(obj);
    let rect = null, inter = null;
    if (def.solid) { const w = rot % 2 ? def.d : def.w, d = rot % 2 ? def.w : def.d; rect = colliders.add(it.x - w / 2, it.z - d / 2, it.x + w / 2, it.z + d / 2, def.h, 'furn'); }
    const act = own(KIND_ACTIVITY, def.kind) ? KIND_ACTIVITY[def.kind] : null;
    if (act) {   // stand in front of it (the side the piece faces) so the prompt never fights the piece's own collider; try the other sides when that spot is walled off
      const reach = Math.max(def.w, def.d) / 2 + 0.6;
      for (const r of [rot, (rot + 1) % 4, (rot + 3) % 4, (rot + 2) % 4]) {
        const o = rotXZ(0, reach, r), sx = it.x + o.x, sz = it.z + o.z;
        if (!spotOk(sx, sz, it.x, it.z)) continue;
        inter = { id: `furn_${it.id}`, furn: true, x: sx, z: sz, radius: 1.5, label: `${act[1]} ${def.name.toLowerCase()}`, room: roomIdAt(geo, sx, sz), run: (ctx) => ctx.ui.activity(act[0]) };
        interactables.push(inter); break;
      }
    }
    return { sig, obj, rect, inter };
  };
  const removePiece = (p) => {
    p.obj.parent?.remove(p.obj); if (p.rect) colliders.remove(p.rect);
    if (p.inter) { const i = interactables.indexOf(p.inter); if (i >= 0) interactables.splice(i, 1); }
  };
  const syncPieces = (placed) => {
    const want = new Map(), seen = new Set();
    placed.forEach((it, i) => {
      if (!it || typeof it !== 'object') return;
      let id = String(it.id ?? `i${i}`); while (seen.has(id)) id += '#'; seen.add(id);
      want.set(id, { it: { ...it, id }, sig: `${it.type}|${it.x}|${it.z}|${it.rot}` });
    });
    for (const [id, p] of pieces) { const w = want.get(id); if (!w || w.sig !== p.sig) { removePiece(p); pieces.delete(id); } }
    for (const [id, w] of want) if (!pieces.has(id)) { const p = addPiece(id, w.it, w.sig); if (p) pieces.set(id, p); }
  };
  const mine = (home) => { const id = typeof home.layout === 'string' ? home.layout : 'studio'; return id === geo.id || (geo.id === 'studio' && !own(HOMES, id)); };
  const setHome = (home) => {
    if (!home || typeof home !== 'object' || !mine(home)) return;   // a save that lives in another layout is not ours to draw
    paint(home); syncPieces(Array.isArray(home.placed) ? home.placed : []);
  };
  setHome({ layout: geo.id, wall: 'cream', floor: 'oak', placed: [] });   // the same look the hand-built Studio had before the first setHome

  /* ----- teardown ----- */
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    for (const p of pieces.values()) removePiece(p); pieces.clear();
    for (const r of templateRes) r.dispose?.(); templateRes.clear(); templates.clear();
    for (const l of [...lights]) if (l.isLight) { l.parent?.remove(l); l.dispose?.(); }
    parts.yard?.traverse((o) => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach((m) => m.dispose?.()); });
    group.clear();
  };

  return {
    layout, rooms: geo.rooms, bounds: geo.bounds, spawn: { ...geo.entry.spawn }, exit: { ...geo.entry.exit }, roomGroups, yard: parts.yard, parts, lot: geo,
    setHome, setOverhead, setWallMode, setViewer, setCameraCut, setRoomLights, roomLightsOn: (id) => !!lit[id]?.on,
    get wallMode() { return mode; }, get overheadMode() { return pick; }, get viewerRoom() { return viewer; },
    dispose,
  };
}
