/**
 * Home layouts: the fixed shells a player can live in (Studio -> One-bedroom -> Bungalow). Pure data (no THREE, no DOM) so the same file runs
 * in the browser, in tests and, later, on a server. docs/HOMES.md is the whole design; this file is the shared contract.
 *
 * COORDINATES: metres. +x east, +z south (towards the camera in the overhead view; the overhead camera never rotates, so north is always up),
 * y up. The origin is the centre of the Studio's room, so everything ever placed in the Studio keeps its coordinates when you move up.
 * `rot` is a quarter turn (0..3) with the meaning furniture already has: three.js `rotation.y = rot * PI / 2`, so a local +z offset becomes
 * world +x at rot 1. Use rotXZ() below for every local -> world offset; never re-derive it.
 *
 * DEFINITIONS
 *   floor rect : a room's walkable floor, to the wall faces (the Studio's is x -4.5..4.5, z -5.5..5.5).
 *   place rect : the floor rect inset by INSET on every side. Furniture and the player stay inside place rects.
 *   bbox       : the union of the floor rects (camera framing, the lawn). Excludes wall thickness and the yard.
 *   bounds     : the bbox inset by INSET, the one rectangle player.bounds / rig.bounds clamp to (the Studio: +-4.05 x +-5.05). Partitions are
 *                colliders, never bounds.
 *   walls      : axis-aligned centre-lines, WALL_T thick. A wall with `doors` is split into solid runs around each doorway (a doorway is
 *                {at, w}: `at` is the coordinate along the wall, `w` the opening). A run's box extends WALL_T/2 past an end that lies on
 *                another wall's centre-line (corner or T-junction) and 0 at a door jamb or a free end. Every doorway gets a floor threshold.
 *   fixtures   : fixed built-ins (bed, kitchen, shower...). They block walking, cannot be moved, and own the interactables.
 *   collide    : RULES rectangles (what the placement rules treat as solid). colliders: PHYSICS rectangles with heights (what the player
 *                bumps into). The Studio lists both because they have always differed slightly; derived layouts use one list for both.
 *   keyPoints  : spots the player must always be able to reach from the entrance (first = the entrance).
 *   yard       : `{ margin }` metres of scenery around the bbox (not walkable). Absent for the Studio.
 *
 * LAYOUT SHAPE (see core/lot.js lotOf for everything derived from it):
 *   { id, name, tier, price (cumulative home value, cents), maxPlaced, title, blurb, yard?,
 *     rooms: [{ id, name, type, floor }],            first room is always 'living' (the Studio room); ids are stable across tiers and never 'all'
 *     walls: [{ id, x0, z0, x1, z1, doors?: [{ at, w }], style?, exterior? }],   one entry per stretch between the same two rooms (or a room and the
 *                outside): split a wall where its neighbour changes. `style: 'roller'` marks the garage's decorative roller-door wall.
 *     entry: { door, spawn, exit },                  the same front door, spawn and exit in every layout
 *     fixtures: [{ id, kind, x, z, rot, room }],     poses; collide/colliders/keepout rows are derived from FIXTURE_KINDS (the Studio lists its own)
 *     decor: [...], windows: [{ x, y, z, w, h, ry }], ceilingLights: [{ x, z, w, d, room }], pointLights: [{ x, y, z, intensity, color, dist, room }] }
 * Wall junctions: a wall extends WALL_T/2 past an end on another wall's centre-line, so where two walls cross, the HORIZONTAL one owns the 0.2 m
 * square and the vertical ones stop at its faces; two horizontal walls that meet end-to-end in a line stop at each other's end (no overlap).
 */
import { FIXTURES, KEEPOUT, KEY_POINTS, MAX_PLACED } from './furniture.js';
import { own } from '../core/util.js';

export const WALL_T = 0.2;   // wall thickness
export const INSET = 0.45;   // furniture and the player keep this far from a wall face
export const DOOR_W = 1.2;   // interior doorway width (the player is 0.76 wide)
export const DOOR_H = 2.2;   // doorway height (a lintel fills the wall above it)
export const CEIL_H = 3.3;   // ceiling height (matches world/interiors.js H)

/** Local (dx, dz) at rot 0 -> world offset for a quarter-turn `rot`: three.js rotation.y = rot * PI / 2 (x' = x cos + z sin, z' = -x sin + z cos). */
export const rotXZ = (dx, dz, rot = 0) => { const r = ((Math.trunc(rot) % 4) + 4) % 4; return r === 0 ? { x: dx, z: dz } : r === 1 ? { x: dz, z: -dx } : r === 2 ? { x: -dx, z: -dz } : { x: -dz, z: dx }; };
/** A local rect {x0,z0,x1,z1} (centred wherever) rotated about the pose origin by `rot`, as a normalised rect. */
export const rotRect = (rc, rot = 0) => { const a = rotXZ(rc.x0, rc.z0, rot), b = rotXZ(rc.x1, rc.z1, rot); return { x0: Math.min(a.x, b.x), z0: Math.min(a.z, b.z), x1: Math.max(a.x, b.x), z1: Math.max(a.z, b.z) }; };

/** The closed list of fixture actions. Each one maps to a handler the builder wires to an existing ctx.ui function (or the catalogue for 'storage'). */
export const ACTIONS = ['sleep', 'sit', 'tv', 'cook', 'fridge', 'computer', 'radio', 'wardrobe', 'read', 'shower', 'lights', 'storage'];

/**
 * Fixture kinds: every kind a layout can build in (world/homeKinds.js has exactly one builder per key here). Geometry is built in LOCAL
 * coordinates at rot 0 (see world/homeBuilder.js); `w` x `d` is the footprint centred on the pose, `h` the visual height, `ch` the collider height
 * (what the camera and the player bump into; low for beds and sofas), `name` the plain noun used in messages. `pad` is the extra keep-out margin
 * (metres) used when keep-out rectangles are derived rather than listed; `solid: false` kinds (the wall switch) get no collider or keep-out;
 * `y` is the mount height of a wall-mounted piece.
 * `uses` are the interactables the kind owns: `dx, dz` is the standing spot relative to the pose (rotates with `rot`, see rotXZ), `action` names
 * the handler in the builder (ACTIONS below), `noun` (default: the kind's `name`) is what a blocked path "blocks the way to". A 'sit' use also
 * carries `sit: { dx, dz, yaw, y }`: the seat relative to the pose and the facing at rot 0 (yaw 0 faces the local -z side, as the Studio sofa does).
 * FRONTS at rot 0 (the side you stand on): bed east (+x), sofa north (-z), tv_unit south (+z), kitchen and fridge west (-x), desk_pc and office_desk
 * north, stereo south, wardrobe south, bookshelf east, shower east, guest_bed east, garage_shelf south, dining_set south; toilet and vanity have
 * their back to -z. A switch plate sits on a wall whose room is to its north: you stand at pose + rotXZ(-0.1, -0.77, rot).
 * Interactable ids: `use.id` when unique within the layout, otherwise `<fixture.id>:<use.id>` (the Studio keeps its plain ids).
 */
export const FIXTURE_KINDS = {
  bed:        { name: 'bed',          w: 2.0,  d: 2.4,  h: 1.1,  ch: 0.4,  pad: 0.1, uses: [{ id: 'bed', dx: 1.2, dz: 0.6, radius: 1.9, label: 'Sleep', action: 'sleep' }] },
  nightstand: { name: 'nightstand',   w: 0.5,  d: 0.5,  h: 0.8,  ch: 0.5,  pad: 0.1 },
  sofa:       { name: 'sofa',         w: 2.86, d: 1.04, h: 1.0,  ch: 0.55, pad: 0.1, uses: [{ id: 'sofa', dx: 0, dz: -1.0, radius: 1.5, label: 'Sit on sofa', action: 'sit', sit: { dx: 0, dz: -0.05, yaw: 0, y: 0.18 } }] },
  tv_unit:    { name: 'TV',           w: 1.8,  d: 0.45, h: 1.6,  ch: 0.5,  pad: 0.1, uses: [{ id: 'tv', dx: 0, dz: 1.2, radius: 2.0, label: 'Watch TV', action: 'tv' }] },
  kitchen:    { name: 'kitchen',      w: 0.9,  d: 3.4,  h: 1.0,  ch: 0.9,  pad: 0.1, uses: [{ id: 'stove', dx: -1.0, dz: 0.6, radius: 1.5, label: 'Cook a quick meal', action: 'cook', noun: 'stove' }] },
  fridge:     { name: 'fridge',       w: 0.9,  d: 0.85, h: 1.9,  ch: 1.9,  pad: 0.1, uses: [{ id: 'fridge', dx: -1.2, dz: 0, radius: 1.8, label: 'Open fridge / eat', action: 'fridge' }] },
  desk_pc:    { name: 'computer desk', w: 1.8, d: 0.8,  h: 1.3,  ch: 0.8,  pad: 0.1, uses: [{ id: 'computer', dx: 0, dz: -0.7, radius: 1.6, label: 'Use computer', action: 'computer', noun: 'computer' }] },
  stereo:     { name: 'stereo',       w: 0.6,  d: 0.35, h: 0.4,  ch: 0.35, pad: 0.1, uses: [{ id: 'stereo', dx: 0, dz: 0.95, radius: 1.5, label: 'Radio', action: 'radio' }] },
  wardrobe:   { name: 'wardrobe',     w: 1.5,  d: 0.65, h: 2.3,  ch: 2.3,  pad: 0.1, uses: [{ id: 'wardrobe', dx: 0, dz: 1.05, radius: 1.6, label: 'Open wardrobe', action: 'wardrobe' }] },
  bookshelf:  { name: 'bookshelf',    w: 0.4,  d: 1.8,  h: 2.0,  ch: 2.0,  pad: 0.1, uses: [{ id: 'books', dx: 0.95, dz: 0.1, radius: 1.5, label: 'Read a book', action: 'read' }] },
  shower:     { name: 'shower',       w: 1.75, d: 1.75, h: 2.2,  ch: 2.2,  pad: 0.1, uses: [{ id: 'shower', dx: 1.3, dz: 0, radius: 1.5, label: 'Take a shower', action: 'shower' }] },
  switch:     { name: 'light switch', w: 0.1,  d: 0.03, h: 0.16, ch: 0.16, pad: 0,   solid: false, y: 1.2, uses: [{ id: 'switch', dx: -0.1, dz: -0.77, radius: 1.2, label: 'Toggle lights', action: 'lights' }] },
  /* ---- new in the multi-room homes ---- */
  toilet:       { name: 'toilet',         w: 0.45, d: 0.75, h: 0.8,  ch: 0.8,  pad: 0.1 },
  vanity:       { name: 'vanity',         w: 1.2,  d: 0.55, h: 1.0,  ch: 1.0,  pad: 0.1 },
  dining_set:   { name: 'dining table',   w: 1.8,  d: 1.9,  h: 0.9,  ch: 0.78, pad: 0.1, uses: [{ id: 'dining', dx: 0, dz: 1.55, radius: 1.4, label: 'Sit at the table', action: 'sit', sit: { dx: 0, dz: 0.85, yaw: 0, y: 0.2 } }] },
  island:       { name: 'kitchen island', w: 2.0,  d: 0.9,  h: 0.95, ch: 0.92, pad: 0.1 },
  guest_bed:    { name: 'guest bed',      w: 1.4,  d: 2.1,  h: 0.9,  ch: 0.4,  pad: 0.1, uses: [{ id: 'guest_bed', dx: 1.25, dz: 0.5, radius: 1.8, label: 'Nap on the guest bed', action: 'sleep' }] },
  office_desk:  { name: 'office desk',    w: 1.6,  d: 0.8,  h: 1.25, ch: 0.8,  pad: 0.1, uses: [{ id: 'office', dx: 0, dz: -0.75, radius: 1.6, label: 'Work at the desk', action: 'computer', noun: 'desk' }] },
  garage_shelf: { name: 'storage shelf',  w: 2.4,  d: 0.5,  h: 1.9,  ch: 1.9,  pad: 0.1, uses: [{ id: 'storage', dx: 0, dz: 1.05, radius: 1.7, label: 'Open storage', action: 'storage' }] },
  car:          { name: 'car',            w: 1.9,  d: 4.4,  h: 1.5,  ch: 1.4,  pad: 0.1 },
};

/**
 * The Studio ("Unit 204"): exactly today's apartment. `collide`, `keepout` and `keyPoints` are the long-standing constants from
 * data/furniture.js (every old save and test depends on them), so they are listed rather than derived.
 */
export const STUDIO = {
  id: 'studio', name: 'Studio', tier: 0, price: 0, maxPlaced: MAX_PLACED,
  title: 'Wheat City Lofts · Unit 204',
  blurb: 'One big room: a kitchen along the wall, a bed in the corner, a sofa and TV. Where everyone starts.',
  rooms: [{ id: 'living', name: 'Studio', type: 'living', floor: { x0: -4.5, z0: -5.5, x1: 4.5, z1: 5.5 } }],
  walls: [
    { id: 'N', x0: -4.6, z0: -5.6, x1: 4.6, z1: -5.6, exterior: true }, { id: 'S', x0: -4.6, z0: 5.6, x1: 4.6, z1: 5.6, exterior: true },
    { id: 'W', x0: -4.6, z0: -5.5, x1: -4.6, z1: 5.5, exterior: true }, { id: 'E', x0: 4.6, z0: -5.5, x1: 4.6, z1: 5.5, exterior: true },
  ],
  entry: { door: { x: 3.2, z: 5.46, w: 1.6 }, spawn: { x: 3.2, z: 4.4, yaw: Math.PI }, exit: { x: 3.2, z: 4.9 } },
  fixtures: [
    { id: 'bed', kind: 'bed', x: -3.2, z: -3.9, rot: 0, room: 'living' }, { id: 'nightstand', kind: 'nightstand', x: -1.8, z: -4.9, rot: 0, room: 'living' },
    { id: 'sofa', kind: 'sofa', x: -0.4, z: 3.6, rot: 0, room: 'living' }, { id: 'tv', kind: 'tv_unit', x: -0.4, z: -0.9, rot: 0, room: 'living' },
    { id: 'kitchen', kind: 'kitchen', x: 3.8, z: -3.2, rot: 0, room: 'living' }, { id: 'fridge', kind: 'fridge', x: 3.9, z: -0.9, rot: 0, room: 'living' },
    { id: 'desk', kind: 'desk_pc', x: 3.3, z: 3.6, rot: 0, room: 'living' }, { id: 'stereo', kind: 'stereo', x: 1.3, z: -0.55, rot: 0, room: 'living' },
    { id: 'wardrobe', kind: 'wardrobe', x: 0.9, z: -4.95, rot: 0, room: 'living' }, { id: 'bookshelf', kind: 'bookshelf', x: -4.25, z: 1.2, rot: 0, room: 'living' },
    { id: 'shower', kind: 'shower', x: -3.5, z: 3.8, rot: 0, room: 'living' }, { id: 'switch', kind: 'switch', x: 4.1, z: 4.97, rot: 0, room: 'living' },
  ],
  decor: [
    { kind: 'rug', x: -0.4, z: 0.6, w: 3.6, d: 2.6, color: '#6e4b57' },
    { kind: 'sign', text: 'SASKATCHEWAN · LIVING SKIES', x: 4.46, y: 1.7, z: 1.2, w: 1.6, h: 0.9, ry: -Math.PI / 2 },
  ],
  windows: [{ x: -2.2, y: 1.7, z: -5.38, w: 2.6, h: 1.7, ry: 0 }, { x: 2.2, y: 1.7, z: -5.38, w: 2.6, h: 1.7, ry: 0 }],
  ceilingLights: [{ x: 0, z: -1.5, w: 1.2, d: 1.2, room: 'living' }, { x: 0, z: 2.5, w: 1.2, d: 1.2, room: 'living' }],
  pointLights: [{ x: 0, y: 2.9, z: -1.5, intensity: 15, color: '#ffeccc', dist: 16, room: 'living' }, { x: 0, y: 2.9, z: 2.5, intensity: 12, color: '#ffeccc', dist: 14, room: 'living' }],
  collide: FIXTURES, keepout: KEEPOUT, keyPoints: KEY_POINTS,
  /** What the player actually bumps into (measured from the original hand-built apartment; heights matter to the camera). */
  colliders: [
    { n: 'bookshelf', x0: -4.45, z0: 0.3, x1: -4.05, z1: 2.1, h: 2 }, { n: 'shower', x0: -4.35, z0: 2.9, x1: -2.6, z1: 4.65, h: 2.2 },
    { n: 'bed', x0: -4.2, z0: -5.1, x1: -2.2, z1: -2.7, h: 0.4 }, { n: 'nightstand', x0: -2.05, z0: -5.15, x1: -1.55, z1: -4.65, h: 0.5 },
    { n: 'sofa', x0: -1.7, z0: 3.1, x1: 0.9, z1: 4.1, h: 0.45 }, { n: 'sofa_back', x0: -1.7, z0: 3.86, x1: 0.9, z1: 4.14, h: 0.55 },
    { n: 'tv', x0: -1.3, z0: -1.125, x1: 0.5, z1: -0.675, h: 0.5 }, { n: 'wardrobe', x0: 0.15, z0: -5.275, x1: 1.65, z1: -4.625, h: 2.3 },
    { n: 'stereo', x0: 1, z0: -0.725, x1: 1.6, z1: -0.375, h: 0.35 }, { n: 'desk', x0: 2.4, z0: 3.2, x1: 4.2, z1: 4, h: 0.8 },
    { n: 'kitchen', x0: 3.35, z0: -4.9, x1: 4.25, z1: -1.5, h: 0.9 }, { n: 'fridge', x0: 3.45, z0: -1.325, x1: 4.35, z1: -0.475, h: 1.9 },
  ],
};

/* ---------- shared pieces of the bigger homes ---------- */
const STUDIO_ROOM = STUDIO.rooms[0].floor;
/** The Studio fixtures that stay exactly where they are in every later tier (their long-standing collide/keepout/colliders rows are reused by id). */
const STAYS = STUDIO.fixtures.filter((f) => !['bed', 'nightstand', 'wardrobe', 'shower'].includes(f.id));
const W = DOOR_W, PI = Math.PI;
/** A window: centre height 1.7 m, `ry` the wall's inward normal (north 0, south PI, west PI/2, east -PI/2), x/z 0.12 m inside the wall face. */
const win = (x, z, w, ry, h = 1.7) => ({ x, y: 1.7, z, w, h, ry });
const STUDIO_DECOR = STUDIO.decor;
const LIGHT = '#ffeccc';

/**
 * The One-bedroom: the Studio room becomes the living room (same floor, door, spawn and exit; bed, wardrobe and shower move out) and a bedroom
 * opens to the north through a doorway in what used to be the Studio's north wall. Rooms 9 x 11 and 9 x 5.
 */
export const ONEBED = {
  id: 'onebed', name: 'One-bedroom', tier: 1, price: 150000, maxPlaced: 85,
  title: 'Cathedral Court · Unit 3B',
  blurb: 'The Studio room becomes your living room, and a real bedroom opens to the north: bed, wardrobe and an en-suite shower.',
  rooms: [
    { id: 'living', name: 'Living room', type: 'living', floor: STUDIO_ROOM },
    { id: 'bedroom', name: 'Bedroom', type: 'bedroom', floor: { x0: -4.5, z0: -10.7, x1: 4.5, z1: -5.7 } },
  ],
  walls: [
    { id: 'N', x0: -4.6, z0: -10.8, x1: 4.6, z1: -10.8 }, { id: 'S', x0: -4.6, z0: 5.6, x1: 4.6, z1: 5.6 },
    { id: 'P', x0: -4.6, z0: -5.6, x1: 4.6, z1: -5.6, doors: [{ at: 0.3, w: W }] },
    { id: 'W', x0: -4.6, z0: -5.5, x1: -4.6, z1: 5.5 }, { id: 'E', x0: 4.6, z0: -5.5, x1: 4.6, z1: 5.5 },
    { id: 'WB', x0: -4.6, z0: -10.7, x1: -4.6, z1: -5.7 }, { id: 'EB', x0: 4.6, z0: -10.7, x1: 4.6, z1: -5.7 },
  ],
  entry: STUDIO.entry,
  fixtures: [
    ...STAYS,
    { id: 'bed', kind: 'bed', x: -3.2, z: -9.1, rot: 0, room: 'bedroom' }, { id: 'nightstand', kind: 'nightstand', x: -1.8, z: -10.1, rot: 0, room: 'bedroom' },
    { id: 'wardrobe', kind: 'wardrobe', x: 0.9, z: -10.15, rot: 0, room: 'bedroom' }, { id: 'shower', kind: 'shower', x: 3.55, z: -9.75, rot: 2, room: 'bedroom' },
    { id: 'switch_bed', kind: 'switch', x: 1.6, z: -5.715, rot: 0, room: 'bedroom' },
  ],
  decor: [...STUDIO_DECOR, { kind: 'rug', x: -0.4, z: -7.7, w: 3.4, d: 2.2, color: '#4f6b8a' }],
  windows: [win(-2.6, 5.38, 2.2, PI), win(0.2, 5.38, 2.2, PI), win(-2.2, -10.58, 2.6, 0), win(4.38, -7.4, 2.0, -PI / 2), win(-4.38, -6.9, 1.4, PI / 2)],
  ceilingLights: [{ x: 0, z: -1.5, w: 1.2, d: 1.2, room: 'living' }, { x: 0, z: 2.5, w: 1.2, d: 1.2, room: 'living' }, { x: 0, z: -8.2, w: 1.2, d: 1.2, room: 'bedroom' }],
  pointLights: [...STUDIO.pointLights, { x: 0, y: 2.9, z: -8.2, intensity: 10, color: LIGHT, dist: 11, room: 'bedroom' }],
};

/**
 * The Bungalow: the Studio room as the living room (now with a kitchen island and a dining table), the bedroom to its north, and a west wing
 * with the bathroom, the den and the garage; every room opens off the living room or the bedroom. A 14.6 x 16.2 m footprint with a yard.
 * Wall junctions: a horizontal wall owns the 0.2 m square where it crosses a vertical one (it extends WALL_T/2 past the centre-line), the vertical
 * walls stop at its faces, so no two boxes overlap. The garage's south wall is the decorative roller door (`style: 'roller'`).
 */
export const BUNGALOW = {
  id: 'bungalow', name: 'Bungalow', tier: 2, price: 500000, maxPlaced: 110, yard: { margin: 3 },
  title: 'Lakeview Bungalow',
  blurb: 'A whole house: dining nook, bedroom, bathroom, den, a garage with storage and a car, and a yard around it.',
  rooms: [
    { id: 'living', name: 'Living room', type: 'living', floor: STUDIO_ROOM },
    { id: 'bedroom', name: 'Bedroom', type: 'bedroom', floor: { x0: -4.5, z0: -10.7, x1: 4.5, z1: -5.7 } },
    { id: 'bath', name: 'Bathroom', type: 'bath', floor: { x0: -10.1, z0: -10.7, x1: -4.7, z1: -5.7 } },
    { id: 'den', name: 'Den', type: 'den', floor: { x0: -10.1, z0: -5.5, x1: -4.7, z1: -1.4 } },
    { id: 'garage', name: 'Garage', type: 'garage', floor: { x0: -10.1, z0: -1.2, x1: -4.7, z1: 5.5 } },
  ],
  walls: [
    { id: 'N1', x0: -4.6, z0: -10.8, x1: 4.6, z1: -10.8 }, { id: 'N2', x0: -10.2, z0: -10.8, x1: -4.7, z1: -10.8 },
    { id: 'E1', x0: 4.6, z0: -10.7, x1: 4.6, z1: -5.7 }, { id: 'E2', x0: 4.6, z0: -5.5, x1: 4.6, z1: 5.5 },
    { id: 'S1', x0: -4.6, z0: 5.6, x1: 4.6, z1: 5.6 }, { id: 'S2', x0: -10.2, z0: 5.6, x1: -4.7, z1: 5.6, style: 'roller' },
    { id: 'W1', x0: -10.2, z0: -10.7, x1: -10.2, z1: -5.7 }, { id: 'W2', x0: -10.2, z0: -5.5, x1: -10.2, z1: -1.4 }, { id: 'W3', x0: -10.2, z0: -1.2, x1: -10.2, z1: 5.5 },
    { id: 'P', x0: -4.6, z0: -5.6, x1: 4.6, z1: -5.6, doors: [{ at: 0.3, w: W }] },
    { id: 'PW', x0: -10.2, z0: -5.6, x1: -4.7, z1: -5.6, doors: [{ at: -7.6, w: W }] },
    { id: 'PG', x0: -10.2, z0: -1.3, x1: -4.6, z1: -1.3 },
    { id: 'C1', x0: -4.6, z0: -10.7, x1: -4.6, z1: -5.7, doors: [{ at: -6.6, w: W }] },
    { id: 'C2', x0: -4.6, z0: -5.5, x1: -4.6, z1: -1.4, doors: [{ at: -2.9, w: W }] },
    { id: 'C3', x0: -4.6, z0: -1.2, x1: -4.6, z1: 5.5, doors: [{ at: 3.4, w: W }] },
  ],
  entry: STUDIO.entry,
  fixtures: [
    ...STAYS,
    { id: 'island', kind: 'island', x: 1.2, z: -2.4, rot: 1, room: 'living' }, { id: 'dining', kind: 'dining_set', x: -2.3, z: -2.6, rot: 0, room: 'living' },
    { id: 'bed', kind: 'bed', x: -3.2, z: -9.1, rot: 0, room: 'bedroom' }, { id: 'nightstand', kind: 'nightstand', x: -1.8, z: -10.1, rot: 0, room: 'bedroom' },
    { id: 'wardrobe', kind: 'wardrobe', x: 0.9, z: -10.15, rot: 0, room: 'bedroom' }, { id: 'switch_bed', kind: 'switch', x: 1.6, z: -5.715, rot: 0, room: 'bedroom' },
    { id: 'shower', kind: 'shower', x: -9.125, z: -9.725, rot: 0, room: 'bath' }, { id: 'vanity', kind: 'vanity', x: -7.2, z: -10.35, rot: 0, room: 'bath' },
    { id: 'toilet', kind: 'toilet', x: -5.5, z: -10.3, rot: 0, room: 'bath' }, { id: 'switch_bath', kind: 'switch', x: -6.0, z: -5.715, rot: 0, room: 'bath' },
    { id: 'guest_bed', kind: 'guest_bed', x: -9.3, z: -4.35, rot: 0, room: 'den' }, { id: 'office', kind: 'office_desk', x: -7.0, z: -1.9, rot: 0, room: 'den' },
    { id: 'switch_den', kind: 'switch', x: -4.715, z: -3.9, rot: 1, room: 'den' },
    { id: 'car', kind: 'car', x: -7.4, z: 2.5, rot: 0, room: 'garage' }, { id: 'shelf', kind: 'garage_shelf', x: -9.85, z: 2.5, rot: 1, room: 'garage' },
    { id: 'switch_garage', kind: 'switch', x: -4.715, z: 2.3, rot: 1, room: 'garage' },
  ],
  decor: [...STUDIO_DECOR, { kind: 'rug', x: -0.4, z: -7.7, w: 3.4, d: 2.2, color: '#4f6b8a' }, { kind: 'rug', x: -7.0, z: -3.6, w: 2.6, d: 1.6, color: '#7a8f6a' }],
  windows: [win(-2.6, 5.38, 2.2, PI), win(0.2, 5.38, 2.2, PI), win(-2.2, -10.58, 2.6, 0), win(4.38, -7.4, 2.0, -PI / 2),
    win(-7.2, -10.58, 1.2, 0), win(-9.98, -7.7, 1.4, PI / 2), win(-9.98, -3.0, 1.6, PI / 2), win(-9.98, 4.6, 1.4, PI / 2)],
  ceilingLights: [{ x: 0, z: -1.5, w: 1.2, d: 1.2, room: 'living' }, { x: 0, z: 2.5, w: 1.2, d: 1.2, room: 'living' }, { x: 0, z: -8.2, w: 1.2, d: 1.2, room: 'bedroom' },
    { x: -7.4, z: -8.2, w: 1.0, d: 1.0, room: 'bath' }, { x: -7.4, z: -3.4, w: 1.0, d: 1.0, room: 'den' }, { x: -7.4, z: 2.5, w: 1.2, d: 1.2, room: 'garage' }],
  pointLights: [...STUDIO.pointLights, { x: 0, y: 2.9, z: -8.2, intensity: 10, color: LIGHT, dist: 11, room: 'bedroom' },
    { x: -7.4, y: 2.9, z: -8.2, intensity: 8, color: LIGHT, dist: 7, room: 'bath' }, { x: -7.4, y: 2.9, z: -3.4, intensity: 8, color: LIGHT, dist: 7, room: 'den' },
    { x: -7.4, y: 2.9, z: 2.5, intensity: 9, color: LIGHT, dist: 9, room: 'garage' }],
};

/** All layouts by id. */
export const HOMES = { studio: STUDIO, onebed: ONEBED, bungalow: BUNGALOW };
/** Tier order, smallest first. */
export const HOME_ORDER = ['studio', 'onebed', 'bungalow'];

/** The layout a save is living in (an unknown or missing id means the Studio, so old saves just work). */
export const layoutOf = (state) => (typeof state?.home?.layout === 'string' && own(HOMES, state.home.layout) ? HOMES[state.home.layout] : STUDIO);
