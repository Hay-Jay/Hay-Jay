/**
 * Fixture builders for home layouts: kind -> (g, kit, ctx) => void. B1 registers the Studio's kinds here (refactored out of the old hand-built
 * apartment, same geometry and numbers); package B2 adds the new kinds (toilet, vanity, dining_set, island, guest_bed, office_desk, garage_shelf, car...).
 *
 * A builder only creates VISUALS, in LOCAL coordinates, parented to the group `g` that the framework (world/homeBuilder.js) has placed at the
 * fixture's pose with `g.rotation.y = rot * PI / 2`. It never creates colliders, interactables, ambient blobs or lights: the framework derives the
 * collider from the layout's rows, the interactables from FIXTURE_KINDS[kind].uses (positions via rotXZ) and the blob from the footprint.
 *   g    : THREE.Group at the pose.
 *   kit  : the LOCAL helper kit (every coordinate is relative to the pose and every mesh is parented to `g`):
 *            k.box(w, h, d, color | material, x, y, z, { mo, cast })   y is the BOTTOM of the box; cast defaults to false
 *            k.add(geometry, material, x, y, z, { cast = true, recv = true })   y is the centre
 *            k.mat(color, opts) / k.basic(color, opts)   (standard / basic material; equal ones are shared inside one interior)
 *            k.label(text, w, h, x, y, z, ry, { bg, accent, sub })   a sign texture on a plane
 *            k.track(obj)    dispose `obj` (a texture, geometry, material) with the interior; returns obj
 *            k.animate(fn)   fn(dt, env, ctx) runs every frame while the interior is shown
 *            k.g             the group itself
 *   ctx  : { pose: {x, z, rot}, kind, def: FIXTURE_KINDS[kind], fixture, layout, room, rnd, fx }.  `fx` is a plain object that belongs to this one
 *          fixture: whatever a builder stores there (the TV screen state, for instance) is what the fixture's action handler works with.
 * `meta` (third argument of registerFixtureKind) tunes what the framework adds around the builder:
 *   blob: false                           no ambient-occlusion blob under the piece
 *   blob: { w, d, op, dx, dz }            a tuned blob (size, opacity and offset from the pose, in local coordinates)
 *   (omitted)                             a footprint-sized blob (def.w + 0.2 by def.d + 0.2, opacity 0.3)
 * A test asserts Object.keys(FIXTURE_BUILDERS) equals Object.keys(FIXTURE_KINDS) once B2 has landed.
 */
import * as THREE from 'three';

export const FIXTURE_BUILDERS = {};
export const FIXTURE_META = {};
/** Register (or replace) the builder for a kind. */
export function registerFixtureKind(kind, fn, meta = {}) { FIXTURE_BUILDERS[kind] = fn; FIXTURE_META[kind] = meta; return fn; }

const glow = (hex, ei) => ({ emissive: new THREE.Color(hex), emissiveIntensity: ei });
const BOOKS = ['#a3312f', '#223458', '#3e5b43', '#d8cdb4', '#8e6bd8'];

/* ---------------------------------------------------------------- the Studio's kinds (local coordinates = world minus the Studio pose) */

registerFixtureKind('bed', (g, k) => {
  k.box(2.0, 0.4, 2.4, '#5b4331', 0, 0, 0); k.box(1.9, 0.22, 2.3, '#f1ede6', 0, 0.4, 0); k.box(1.92, 0.12, 1.2, '#3e5b7a', 0, 0.62, 0.4);
  k.box(0.7, 0.14, 0.4, '#ffffff', -0.35, 0.62, -1.0); k.box(0.7, 0.14, 0.4, '#ffffff', 0.35, 0.62, -1.0); k.box(2.0, 1.1, 0.12, '#5b4331', 0, 0, -1.22);
}, { blob: { w: 2.2, d: 2.6, op: 0.45 } });

registerFixtureKind('nightstand', (g, k) => {
  k.box(0.5, 0.5, 0.5, '#5b4331', 0, 0, 0); k.box(0.2, 0.3, 0.2, '#f6e9b8', 0, 0.5, 0, { mo: glow('#ffd98a', 0.5) });
}, { blob: false });

registerFixtureKind('sofa', (g, k) => {
  k.box(2.6, 0.45, 1.0, '#44505f', 0, 0, 0); k.box(2.6, 0.55, 0.28, '#3b4553', 0, 0.4, 0.4);
  for (const s of [-1, 1]) k.box(0.25, 0.7, 1.0, '#3b4553', s * 1.3, 0, 0);
}, { blob: { w: 2.8, d: 1.2, op: 0.4 } });

registerFixtureKind('tv_unit', (g, k, ctx) => {
  k.box(1.8, 0.5, 0.45, '#2a2420', 0, 0, 0);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 144; const tg = canvas.getContext('2d');
  const tex = k.track(new THREE.CanvasTexture(canvas)); tex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = k.track(new THREE.MeshBasicMaterial({ map: tex }));
  k.box(1.7, 0.98, 0.06, '#101114', 0, 0.62, -0.1); k.add(new THREE.PlaneGeometry(1.6, 0.9), screenMat, 0, 1.1, -0.06, { cast: false });
  const tv = ctx.fx.tv = { on: false, t: 0, show: 0, draw() {
    if (!tv.on) { tg.fillStyle = '#050608'; tg.fillRect(0, 0, 256, 144); tex.needsUpdate = true; return; }
    const hues = [[30, 60, 120], [200, 230, 260], [340, 10, 40]][tv.show % 3];
    const gr = tg.createLinearGradient(0, 0, 256, 144); gr.addColorStop(0, `hsl(${hues[0] + tv.t * 20},70%,40%)`); gr.addColorStop(1, `hsl(${hues[1] + tv.t * 30},70%,25%)`); tg.fillStyle = gr; tg.fillRect(0, 0, 256, 144);
    tg.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 5; i++) tg.fillRect(((tv.t * 40 + i * 60) % 300) - 20, 30 + i * 18, 70, 10);
    tg.fillStyle = '#fff'; tg.font = '700 14px sans-serif'; tg.fillText(['PRAIRIE NEWS NOW', 'HOCKEY NIGHT', 'COOKING W/ BANNOCK'][tv.show % 3], 12, 128); tex.needsUpdate = true;
  }, off() { tv.on = false; tv.draw(); } };
  tv.draw();
  k.animate((dt) => { tv.t += dt * 0.5; if (tv.on) { tg.save(); tv.draw(); tg.restore(); } });
}, { blob: false });

registerFixtureKind('kitchen', (g, k) => {
  k.box(0.9, 0.9, 3.4, '#d7d2c6', 0, 0, 0); k.box(1.0, 0.05, 3.5, '#4a4f55', 0, 0.9, 0); k.box(0.5, 0.02, 0.5, '#9aa3ad', 0, 0.95, -1.2, { mo: { metalness: 0.8 } });
  k.box(0.8, 0.04, 0.6, '#25272b', 0, 0.95, 0.5);
  for (let i = 0; i < 4; i++) k.add(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), k.mat('#555'), -0.15 + (i % 2) * 0.28, 1.0, 0.65 - Math.floor(i / 2) * 0.3);
}, { blob: { w: 1.0, d: 5, op: 0.3, dx: 0.1, dz: 0.8 } });   // one long soft shadow under the counter run and the fridge beside it

registerFixtureKind('fridge', (g, k) => {
  k.box(0.9, 1.9, 0.85, '#d8dde2', 0, 0, 0, { mo: { metalness: 0.5, roughness: 0.35 } }); k.box(0.03, 0.5, 0.04, '#999999', -0.47, 1.0, -0.25);
}, { blob: false });

registerFixtureKind('desk_pc', (g, k) => {
  k.box(1.8, 0.05, 0.8, '#7a5a3e', 0, 0.74, 0);
  for (const [dx, dz] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]]) k.box(0.06, 0.74, 0.06, '#3d2f22', dx, 0, dz);
  k.box(0.7, 0.42, 0.04, '#111214', 0, 0.95, 0.2); k.add(new THREE.PlaneGeometry(0.64, 0.36), k.basic('#4aa8ff'), 0, 1.16, 0.18, { cast: false }).rotation.y = Math.PI;
  k.box(0.04, 0.2, 0.04, '#111111', 0, 0.79, 0.22); k.box(0.5, 0.02, 0.18, '#2a2c30', 0, 0.8, -0.15);
}, { blob: false });

registerFixtureKind('stereo', (g, k) => {
  k.box(0.6, 0.35, 0.35, '#2b2e33', 0, 0, 0); k.box(0.5, 0.04, 0.02, '#4ae0d0', 0, 0.26, 0.18, { mo: glow('#4ae0d0', 0.8) });
}, { blob: false });

registerFixtureKind('wardrobe', (g, k) => {
  k.box(1.5, 2.3, 0.65, '#a98e6f', 0, 0, 0); k.box(0.03, 2.1, 0.03, '#2b2118', 0, 0.1, 0.33);
}, { blob: { w: 1.5, d: 0.7, op: 0.3 } });

registerFixtureKind('bookshelf', (g, k) => {
  k.box(0.4, 2.0, 1.8, '#6b4f36', 0, 0, 0);
  for (let r = 0; r < 5; r++) for (let i = 0; i < 7; i++) k.box(0.22, 0.28, 0.07, BOOKS[(r + i) % 5], 0.07, 0.1 + r * 0.38, -0.7 + i * 0.2);
}, { blob: false });

registerFixtureKind('shower', (g, k) => {
  const glass = { transparent: true, opacity: 0.25, roughness: 0.05 };
  k.box(1.7, 0.05, 1.7, '#cfe3ea', 0, 0, 0, { mo: { roughness: 0.3 } });
  k.box(0.05, 2.2, 1.7, '#bfe6ff', 0.85, 0, 0, { mo: glass }); k.box(1.7, 2.2, 0.05, '#bfe6ff', 0, 0, -0.85, { mo: glass });
  k.box(0.06, 2.3, 0.06, '#9aa3ad', -0.8, 0, 0.8, { mo: { metalness: 0.9, roughness: 0.2 } });
  k.add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14), k.mat('#c8ced6', { metalness: 0.9, roughness: 0.2 }), -0.7, 2.2, 0.7);
}, { blob: false });

registerFixtureKind('switch', (g, k) => { k.box(0.1, 0.16, 0.03, '#f3f3f3', 0, 1.2, 0); }, { blob: false });
