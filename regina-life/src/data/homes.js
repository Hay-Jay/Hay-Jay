/**
 * Home layouts: the fixed shells a player can live in (Studio -> One-bedroom -> Bungalow). Pure data (no THREE, no DOM) so the same file runs
 * in the browser, in tests and, later, on a server. See docs/HOMES.md for the whole design; this file is the shared contract.
 *
 * COORDINATES: metres. +x east, +z south (towards the camera in the overhead view), y up. The origin is the centre of the Studio's room, so
 * everything you ever placed in the Studio keeps its coordinates when you move up. `rot` is a quarter turn (0..3) with the same meaning as
 * for furniture: three.js `rotation.y = rot * PI / 2`, so a local +z offset becomes world +x at rot 1.
 *
 * A LAYOUT is a rectangular footprint cut into ROOMS by thin PARTITION WALLS with DOORWAYS; the outer ring is the EXTERIOR WALL.
 *   floor rect : the walkable floor of a room, measured to the wall faces (the Studio's is x -4.5..4.5, z -5.5..5.5).
 *   place rect : the floor rect inset by INSET on every side. Furniture centres/footprints and the player stay inside a place rect.
 *   walls      : centre-line segments, axis-aligned, WALL_T thick. A wall with `doors` is split into solid runs around each doorway.
 *   fixtures   : the fixed, built-in pieces (bed, kitchen, shower...). They block walking, cannot be moved, and own the interactables.
 *   keyPoints  : the spots the player must always be able to reach from the entrance (first entry = the entrance itself).
 */
import { FIXTURES, KEEPOUT, KEY_POINTS } from './furniture.js';
import { own } from '../core/util.js';

export const WALL_T = 0.2;   // wall thickness
export const INSET = 0.45;   // furniture and the player keep this far from a wall face
export const DOOR_W = 1.2;   // interior doorway width (the player is 0.76 wide)
export const CEIL_H = 3.3;   // ceiling height (matches world/interiors.js H)

/**
 * Fixture kinds. Geometry is built in LOCAL coordinates at rot 0 (see world/homeBuilder.js); `w` x `d` is the footprint centred on the pose,
 * `h` the height. `uses` are the interactables the kind owns: `dx, dz` is the standing spot relative to the pose (rotates with `rot`),
 * `action` names the handler in the builder (sleep, sit, tv, cook, fridge, computer, radio, wardrobe, read, shower, lights, storage...).
 * `pad` is the extra keep-out margin (metres) used when keep-out rectangles are derived rather than listed.
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
  switch:     { w: 0.1,  d: 0.03, h: 0.16, pad: 0,   uses: [{ id: 'switch', dx: -0.1, dz: -0.77, radius: 1.2, label: 'Toggle lights', action: 'lights' }] },
};

/**
 * The Studio ("Unit 204"): exactly today's apartment. `collide`, `keepout` and `keyPoints` are the long-standing constants from
 * data/furniture.js (every old save and test depends on them), so they are listed rather than derived.
 */
export const STUDIO = {
  id: 'studio', name: 'Studio', tier: 0, price: 0, maxPlaced: 60,
  title: 'Wheat City Lofts · Unit 204',
  blurb: 'One big room: a kitchen along the wall, a bed in the corner, a sofa and TV. Where everyone starts.',
  rooms: [{ id: 'main', name: 'Studio', type: 'living', floor: { x0: -4.5, z0: -5.5, x1: 4.5, z1: 5.5 } }],
  walls: [
    { id: 'N', x0: -4.6, z0: -5.6, x1: 4.6, z1: -5.6, exterior: true }, { id: 'S', x0: -4.6, z0: 5.6, x1: 4.6, z1: 5.6, exterior: true },
    { id: 'W', x0: -4.6, z0: -5.5, x1: -4.6, z1: 5.5, exterior: true }, { id: 'E', x0: 4.6, z0: -5.5, x1: 4.6, z1: 5.5, exterior: true },
  ],
  entry: { door: { x: 3.2, z: 5.46, w: 1.6 }, spawn: { x: 3.2, z: 4.4, yaw: Math.PI }, exit: { x: 3.2, z: 4.9 } },
  fixtures: [
    { id: 'bed', kind: 'bed', x: -3.2, z: -3.9, rot: 0, room: 'main' }, { id: 'nightstand', kind: 'nightstand', x: -1.8, z: -4.9, rot: 0, room: 'main' },
    { id: 'sofa', kind: 'sofa', x: -0.4, z: 3.6, rot: 0, room: 'main' }, { id: 'tv', kind: 'tv_unit', x: -0.4, z: -0.9, rot: 0, room: 'main' },
    { id: 'kitchen', kind: 'kitchen', x: 3.8, z: -3.2, rot: 0, room: 'main' }, { id: 'fridge', kind: 'fridge', x: 3.9, z: -0.9, rot: 0, room: 'main' },
    { id: 'desk', kind: 'desk_pc', x: 3.3, z: 3.6, rot: 0, room: 'main' }, { id: 'stereo', kind: 'stereo', x: 1.3, z: -0.55, rot: 0, room: 'main' },
    { id: 'wardrobe', kind: 'wardrobe', x: 0.9, z: -4.95, rot: 0, room: 'main' }, { id: 'bookshelf', kind: 'bookshelf', x: -4.25, z: 1.2, rot: 0, room: 'main' },
    { id: 'shower', kind: 'shower', x: -3.5, z: 3.8, rot: 0, room: 'main' }, { id: 'switch', kind: 'switch', x: 4.1, z: 4.97, rot: 0, room: 'main' },
  ],
  decor: [
    { kind: 'rug', x: -0.4, z: 0.6, w: 3.6, d: 2.6, color: '#6e4b57' },
    { kind: 'sign', text: 'SASKATCHEWAN · LIVING SKIES', x: 4.46, y: 1.7, z: 1.2, w: 1.6, h: 0.9, ry: -Math.PI / 2 },
  ],
  windows: [{ x: -2.2, y: 1.7, z: -5.38, w: 2.6, h: 1.7, ry: 0 }, { x: 2.2, y: 1.7, z: -5.38, w: 2.6, h: 1.7, ry: 0 }],
  ceilingLights: [{ x: 0, z: -1.5, w: 1.2, d: 1.2 }, { x: 0, z: 2.5, w: 1.2, d: 1.2 }],
  pointLights: [{ x: 0, y: 2.9, z: -1.5, intensity: 15, color: '#ffeccc', dist: 16 }, { x: 0, y: 2.9, z: 2.5, intensity: 12, color: '#ffeccc', dist: 14 }],
  collide: FIXTURES, keepout: KEEPOUT, keyPoints: KEY_POINTS,
};

/** All layouts by id. (onebed and bungalow are added by the multi-room work; see docs/HOMES.md.) */
export const HOMES = { studio: STUDIO };
/** Tier order, smallest first. */
export const HOME_ORDER = ['studio'];

/** The layout a save is living in (an unknown or missing id means the Studio, so old saves just work). */
export const layoutOf = (state) => (typeof state?.home?.layout === 'string' && own(HOMES, state.home.layout) ? HOMES[state.home.layout] : STUDIO);
