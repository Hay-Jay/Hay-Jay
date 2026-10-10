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
 * Fixture kinds. Geometry is built in LOCAL coordinates at rot 0 (see world/homeBuilder.js); `w` x `d` is the footprint centred on the pose,
 * `h` the height. `uses` are the interactables the kind owns: `dx, dz` is the standing spot relative to the pose (rotates with `rot`),
 * `action` names the handler in the builder (sleep, sit, tv, cook, fridge, computer, radio, wardrobe, read, shower, lights, storage...).
 * `pad` is the extra keep-out margin (metres) used when keep-out rectangles are derived rather than listed. `ch` is the collider height
 * (defaults to `h`); `solid: false` kinds (the wall switch) get no collider or keep-out; `y` is the mount height of a wall-mounted piece.
 * Interactable ids: `use.id` when unique within the layout, otherwise `<fixture.id>:<use.id>` (the Studio keeps its plain ids).
 */
export const FIXTURE_KINDS = {
  bed:        { w: 2.0,  d: 2.4,  h: 1.1,  pad: 0.1, uses: [{ id: 'bed', dx: 1.2, dz: 0.6, radius: 1.9, label: 'Sleep', action: 'sleep' }] },
  nightstand: { w: 0.5,  d: 0.5,  h: 0.8,  pad: 0.1 },
  sofa:       { w: 2.86, d: 1.04, h: 1.0,  pad: 0.1, uses: [{ id: 'sofa', dx: 0, dz: -1.0, radius: 1.5, label: 'Sit on sofa', action: 'sit', sit: { dx: 0, dz: -0.05, yaw: 0, y: 0.18 } }] },
  tv_unit:    { w: 1.8,  d: 0.45, h: 1.6,  pad: 0.1, uses: [{ id: 'tv', dx: 0, dz: 1.2, radius: 2.0, label: 'Watch TV', action: 'tv' }] },
  kitchen:    { w: 0.9,  d: 3.4,  h: 1.0,  pad: 0.1, uses: [{ id: 'stove', dx: -1.0, dz: 0.6, radius: 1.5, label: 'Cook a quick meal', action: 'cook' }] },
  fridge:     { w: 0.9,  d: 0.85, h: 1.9,  pad: 0.1, uses: [{ id: 'fridge', dx: -1.2, dz: 0, radius: 1.8, label: 'Open fridge / eat', action: 'fridge' }] },
  desk_pc:    { w: 1.8,  d: 0.8,  h: 1.3,  pad: 0.1, uses: [{ id: 'computer', dx: 0, dz: -0.7, radius: 1.6, label: 'Use computer', action: 'computer' }] },
  stereo:     { w: 0.6,  d: 0.35, h: 0.4,  pad: 0.1, uses: [{ id: 'stereo', dx: 0, dz: 0.95, radius: 1.5, label: 'Radio', action: 'radio' }] },
  wardrobe:   { w: 1.5,  d: 0.65, h: 2.3,  pad: 0.1, uses: [{ id: 'wardrobe', dx: 0, dz: 1.05, radius: 1.6, label: 'Open wardrobe', action: 'wardrobe' }] },
  bookshelf:  { w: 0.4,  d: 1.8,  h: 2.0,  pad: 0.1, uses: [{ id: 'books', dx: 0.95, dz: 0.1, radius: 1.5, label: 'Read a book', action: 'read' }] },
  shower:     { w: 1.75, d: 1.75, h: 2.2,  pad: 0.1, uses: [{ id: 'shower', dx: 1.3, dz: 0, radius: 1.5, label: 'Take a shower', action: 'shower' }] },
  switch:     { w: 0.1,  d: 0.03, h: 0.16, pad: 0, solid: false, y: 1.2, uses: [{ id: 'switch', dx: -0.1, dz: -0.77, radius: 1.2, label: 'Toggle lights', action: 'lights' }] },
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
  ceilingLights: [{ x: 0, z: -1.5, w: 1.2, d: 1.2 }, { x: 0, z: 2.5, w: 1.2, d: 1.2 }],
  pointLights: [{ x: 0, y: 2.9, z: -1.5, intensity: 15, color: '#ffeccc', dist: 16 }, { x: 0, y: 2.9, z: 2.5, intensity: 12, color: '#ffeccc', dist: 14 }],
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

/** All layouts by id. (onebed and bungalow are added by the multi-room work; see docs/HOMES.md.) */
export const HOMES = { studio: STUDIO };
/** Tier order, smallest first. */
export const HOME_ORDER = ['studio'];

/** The layout a save is living in (an unknown or missing id means the Studio, so old saves just work). */
export const layoutOf = (state) => (typeof state?.home?.layout === 'string' && own(HOMES, state.home.layout) ? HOMES[state.home.layout] : STUDIO);
