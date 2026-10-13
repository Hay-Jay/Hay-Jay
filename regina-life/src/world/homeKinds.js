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
import { kit as modelKit } from './furnitureModels.js';

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

/* ---------------------------------------------------------------- the multi-room kinds (package B2)
 * Drawn with the modelling kit of world/furnitureModels.js: every part is queued, then baked into ONE mesh per material (a toilet is 3 draw calls, not 12),
 * with materials shared across the whole interior through the framework's k.mat and geometries tracked for disposal. Same warm, bright palette as the Studio.
 * Every model fits its FIXTURE_KINDS w x d footprint (tests/home-kinds.test.js pins the tolerance and lists the few deliberate overhangs). */
const WARM = { cream: '#f1ece0', oak: '#c9a878', wood: '#a67c52', walnut: '#6b4f36', brass: '#c9a24a', steel: '#c0c4c8', dark: '#2b2e33', china: '#f4f6f7', sage: '#8fae95', teal: '#4a8f96', clay: '#c4694a', mustard: '#e0b04a' };
const lite = (hex, l) => `#${new THREE.Color(hex).offsetHSL(0, 0, l).getHexString()}`;

/** Bake `draw(m)` (queued modelling-kit parts, local coordinates) into one mesh per material under `g`. */
function bakeFixture(g, k, draw) {
  const m = modelKit((color, o) => k.mat(color, { roughness: o.r ?? 0.8, metalness: o.mt ?? 0, flatShading: !!o.f, vertexColors: !!o.vc, ...(o.e ? { emissive: new THREE.Color(o.e), emissiveIntensity: o.ei ?? 0.8 } : {}), ...(o.op != null ? { transparent: true, opacity: o.op } : {}) }), { vertexColors: true });
  draw(m);
  const baked = m.bake(false); baked.name = 'baked'; baked.traverse((o) => { if (o.geometry) k.track(o.geometry); });
  g.add(baked); return baked;
}

registerFixtureKind('toilet', (g, k) => bakeFixture(g, k, (m) => {   // back (the cistern) to -z, the seat opens towards +z
  const china = WARM.china;
  m.ce(0.26, 0.4, 0.3, china, 0, 0, -0.04, 16);                                            // pedestal
  m.ce(0.38, 0.56, 0.15, china, 0, 0.28, 0.08, 18);                                        // bowl
  m.ce(0.37, 0.5, 0.035, '#fbfbf8', 0, 0.43, 0.1, 18); m.ce(0.25, 0.34, 0.006, '#cfd9dd', 0, 0.465, 0.12, 14);   // seat ring and the water in the bowl
  m.b(0.4, 0.4, 0.17, china, 0, 0.38, -0.29); m.b(0.42, 0.03, 0.19, '#fbfbf8', 0, 0.76, -0.29);   // cistern and its lid
  m.c(0.032, 0.032, 0.01, WARM.steel, 0, 0.79, -0.29, 10, { mt: 0.8, r: 0.25 });          // flush button
}), { blob: false });

registerFixtureKind('vanity', (g, k) => bakeFixture(g, k, (m) => {   // cabinet with a basin, back to -z, doors facing +z
  const body = '#b48c62', door = lite(body, 0.07), top = '#f1efe9';
  m.b(1.14, 0.08, 0.5, WARM.dark, 0, 0, -0.02);                                            // plinth
  m.b(1.2, 0.74, 0.55, body, 0, 0.08, 0);                                                  // carcass
  for (const sx of [-1, 1]) { m.b(0.56, 0.62, 0.012, door, sx * 0.29, 0.14, 0.281); m.b(0.02, 0.1, 0.014, WARM.brass, sx * 0.05, 0.5, 0.287, { mt: 0.5 }); }
  m.b(1.2, 0.04, 0.55, top, 0, 0.82, 0); m.b(1.2, 0.12, 0.03, top, 0, 0.86, -0.26);       // worktop and splash-back
  m.ce(0.5, 0.36, 0.008, '#e3edf1', 0, 0.86, 0.04, 20); m.ce(0.4, 0.27, 0.004, '#bfe0ec', 0, 0.867, 0.04, 18, { op: 0.9, r: 0.2 });   // basin and its water
  m.c(0.018, 0.018, 0.1, WARM.steel, 0, 0.86, -0.17, 8, { mt: 0.9, r: 0.2 }); m.cz(0.11, 0.011, WARM.steel, 0, 0.955, -0.12, 8, { mt: 0.9, r: 0.2 });   // tap
  m.c(0.03, 0.026, 0.09, '#e8a0a0', -0.44, 0.86, -0.12, 10); m.c(0.024, 0.024, 0.11, '#6fb3a0', 0.44, 0.86, -0.16, 10); m.b(0.26, 0.05, 0.18, '#ead9bb', 0.36, 0.86, 0.1);   // cup, soap pump, folded towel
}), { blob: false });

registerFixtureKind('island', (g, k) => bakeFixture(g, k, (m) => {   // doors face +z, the breakfast overhang faces -z
  const cab = '#d7d2c6';
  m.b(1.9, 0.78, 0.5, cab, 0, 0.08, 0.15); m.b(1.84, 0.08, 0.44, WARM.dark, 0, 0, 0.15);   // carcass and plinth
  for (let i = 0; i < 4; i++) { const x = -0.7125 + i * 0.475; m.b(0.45, 0.66, 0.012, lite(cab, 0.05), x, 0.14, 0.406); m.b(0.11, 0.02, 0.014, WARM.brass, x + (i % 2 ? -0.14 : 0.14), 0.7, 0.412, { mt: 0.5 }); }
  for (const sx of [-1, 1]) m.b(0.04, 0.82, 0.4, WARM.wood, sx * 0.96, 0.04, -0.25);       // side panels under the overhang
  m.b(2.0, 0.045, 0.9, '#ece7dd', 0, 0.86, 0);                                             // worktop, a lip all round the cabinet
  m.b(0.5, 0.022, 0.32, WARM.oak, 0.55, 0.905, 0.08); m.b(0.28, 0.07, 0.1, '#d9a45a', 0.55, 0.927, 0.08, { r: 0.9 });   // chopping board and a loaf
  m.ce(0.3, 0.3, 0.05, '#d9553f', -0.6, 0.905, 0.0, 14); m.s(0.08, 0.08, 0.08, '#f0a030', -0.65, 0.925, -0.02, { lo: true }); m.s(0.08, 0.08, 0.08, '#e0584a', -0.55, 0.925, 0.03, { lo: true }); m.s(0.08, 0.08, 0.08, '#8cc05a', -0.6, 0.94, 0.0, { lo: true });
}), { blob: { w: 2.1, d: 1.0, op: 0.3 } });

registerFixtureKind('dining_set', (g, k) => bakeFixture(g, k, (m) => {   // a table with four chairs; the south chair (z +0.75) is the one you sit in
  const top = '#b88a5a', leg = lite(top, -0.2);
  m.b(1.3, 0.05, 0.85, top, 0, 0.71, 0); m.b(1.14, 0.006, 0.69, lite(top, 0.08), 0, 0.76, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.b(0.07, 0.71, 0.07, leg, sx * 0.58, 0, sz * 0.34);
  m.b(1.0, 0.04, 0.05, leg, 0, 0.6, 0);                                                   // stretcher
  const chair = (x, z, back) => {   // `back`: the side the backrest is on ('n' | 's' | 'e' | 'w'); the seat is 0.40 square
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.b(0.035, 0.43, 0.035, leg, x + sx * 0.17, 0, z + sz * 0.17);
    m.b(0.4, 0.04, 0.4, WARM.sage, x, 0.43, z); m.b(0.34, 0.03, 0.34, lite(WARM.sage, 0.09), x, 0.47, z);
    const ns = back === 'n' || back === 's', sgn = back === 'n' || back === 'w' ? -1 : 1;
    if (ns) { m.b(0.4, 0.43, 0.035, top, x, 0.47, z + sgn * 0.1825); m.b(0.3, 0.2, 0.012, lite(WARM.sage, 0.09), x, 0.6, z + sgn * 0.158); } else { m.b(0.035, 0.43, 0.4, top, x + sgn * 0.1825, 0.47, z); m.b(0.012, 0.2, 0.3, lite(WARM.sage, 0.09), x + sgn * 0.158, 0.6, z); }
  };
  chair(0, -0.75, 'n'); chair(0, 0.75, 's'); chair(-0.7, 0, 'w'); chair(0.7, 0, 'e');
  m.ce(0.22, 0.22, 0.05, WARM.clay, 0, 0.766, 0, 14); m.s(0.09, 0.09, 0.09, '#f0b030', -0.04, 0.8, 0.01, { lo: true }); m.s(0.09, 0.09, 0.09, '#8cc05a', 0.05, 0.8, -0.02, { lo: true });   // fruit bowl
  for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) m.ce(0.2, 0.2, 0.012, WARM.china, x, 0.766, z, 14);   // plates
}), { blob: { w: 2.0, d: 2.1, op: 0.3 } });

registerFixtureKind('guest_bed', (g, k) => bakeFixture(g, k, (m) => {   // headboard at -z, you get in from the east (+x)
  const pine = '#c9a878';
  m.b(1.4, 0.26, 2.1, lite(pine, -0.08), 0, 0, 0); m.b(1.34, 0.2, 2.0, '#f1ede6', 0, 0.26, 0.02);   // frame and mattress
  m.b(1.4, 0.9, 0.1, pine, 0, 0, -1.0); m.b(1.2, 0.5, 0.03, lite(pine, 0.08), 0, 0.3, -0.935); m.b(1.4, 0.4, 0.06, pine, 0, 0, 1.02);   // headboard (panelled), footboard
  m.b(1.36, 0.08, 1.35, WARM.sage, 0, 0.44, 0.2); m.b(1.38, 0.082, 0.16, lite(WARM.sage, -0.12), 0, 0.44, -0.18);   // quilt with a folded band
  m.b(0.56, 0.12, 0.36, '#ffffff', -0.3, 0.46, -0.72); m.b(0.56, 0.12, 0.36, '#fbe8c8', 0.3, 0.46, -0.72);   // pillows
  m.b(1.3, 0.1, 0.36, WARM.mustard, 0, 0.5, 0.72);                                         // blanket folded at the foot
}), { blob: { w: 1.6, d: 2.3, op: 0.4 } });

registerFixtureKind('office_desk', (g, k) => bakeFixture(g, k, (m) => {   // you sit on the -z side; the monitor faces -z
  const oak = '#c8a36f', frame = '#3d3f45';
  m.b(1.6, 0.04, 0.8, oak, 0, 0.7, 0);
  m.b(0.5, 0.7, 0.72, lite(WARM.wood, -0.02), -0.55, 0, 0);                                // drawer pedestal
  for (let i = 0; i < 3; i++) { m.b(0.44, 0.19, 0.012, lite(WARM.wood, 0.06), -0.55, 0.05 + i * 0.22, -0.366); m.b(0.14, 0.02, 0.014, WARM.brass, -0.55, 0.15 + i * 0.22, -0.372, { mt: 0.5 }); }
  m.b(0.05, 0.7, 0.72, frame, 0.76, 0, 0); m.b(1.0, 0.4, 0.02, lite(WARM.wood, -0.05), 0.2, 0.3, 0.34);   // steel end frame, modesty panel
  m.b(0.22, 0.02, 0.16, frame, 0.1, 0.74, 0.2); m.b(0.04, 0.12, 0.03, frame, 0.1, 0.76, 0.22);   // monitor foot and neck
  m.b(0.74, 0.44, 0.04, '#111214', 0.1, 0.84, 0.24); m.b(0.68, 0.38, 0.01, '#6ec0ff', 0.1, 0.87, 0.215, { e: '#4aa8ff', ei: 0.7 });
  m.b(0.45, 0.02, 0.15, '#2a2c30', 0.1, 0.74, -0.14); m.b(0.07, 0.025, 0.11, '#2a2c30', 0.5, 0.74, -0.14);   // keyboard, mouse
  m.c(0.07, 0.07, 0.02, frame, 0.66, 0.74, 0.27, 12); m.rod([0.66, 0.75, 0.27], [0.58, 1.0, 0.16], 0.012, frame); m.cone(0.07, 0.1, WARM.mustard, 0.55, 0.98, 0.12, 10);   // desk lamp
  m.b(0.25, 0.035, 0.33, '#f6f1e6', -0.5, 0.74, -0.05); m.b(0.2, 0.012, 0.26, '#cfe3ee', -0.46, 0.775, -0.02);   // papers
  m.c(0.04, 0.035, 0.09, WARM.clay, -0.15, 0.74, 0.2, 10);                                  // mug
}), { blob: false });

registerFixtureKind('garage_shelf', (g, k, ctx) => bakeFixture(g, k, (m) => {   // open steel shelving, the front (and the Storage prompt) faces +z
  const post = '#4f78a8', ys = [0.1, 0.6, 1.1, 1.6, 1.86];
  for (const x of [-1.175, 0, 1.175]) for (const z of [-0.22, 0.22]) m.b(0.05, 1.9, 0.05, post, x, 0, z);
  for (const y of ys) m.b(2.4, 0.04, 0.5, WARM.oak, 0, y, 0);
  const r = ctx.rnd, boxCols = ['#c89a62', '#b98d57', '#d4a972'], binCols = ['#3a8fb7', '#4a8f96', '#c4694a', '#e0b04a'], canCols = ['#e0b04a', '#c4694a', '#8fae95', '#d9553f'];
  for (const [li, y] of [[0, 0.14], [1, 0.64], [2, 1.14], [3, 1.64]]) {   // contents of each shelf, left to right
    let x = -1.12; const room = li === 3 ? 0.18 : 0.38;   // the top shelf holds low things; nothing goes past the end posts (|x| <= 1.15)
    while (x < 1.0) {
      const t = r(), w = Math.min(0.3 + r() * 0.25, 1.15 - x);
      if (t < 0.34) { m.b(w, room + 0.08, 0.38, boxCols[Math.floor(r() * 3)], x + w / 2, y, 0); m.b(0.05, 0.003, 0.38, '#e8dcc0', x + w / 2, y + room + 0.081, 0); }   // cardboard box with tape
      else if (t < 0.62) { m.b(w, room, 0.36, binCols[Math.floor(r() * 4)], x + w / 2, y, 0, { r: 0.5 }); m.b(w, 0.03, 0.38, lite(binCols[0], 0.1), x + w / 2, y + room, 0); }   // lidded bin
      else if (t < 0.85) { const n = Math.max(1, Math.min(2 + Math.floor(r() * 2), Math.floor(w / 0.17))); for (let i = 0; i < n; i++) m.c(0.075, 0.075, 0.17, canCols[Math.floor(r() * 4)], x + 0.085 + i * 0.17, y, (i % 2) * 0.1 - 0.05, 12, { mt: 0.2 }); }   // paint cans
      else { const tw = Math.min(w, 0.4); m.b(tw, 0.16, 0.2, '#c8102e', x + tw / 2, y, 0); m.b(0.18, 0.04, 0.05, WARM.dark, x + tw / 2, y + 0.16, 0); }   // toolbox
      x += w + 0.06 + r() * 0.1;
    }
  }
}), { blob: { w: 2.5, d: 0.7, op: 0.35 } });

registerFixtureKind('car', (g, k) => bakeFixture(g, k, (m) => {   // a small hatchback with its nose towards +z (the roller door)
  const red = '#d8573c', glass = '#9ccfe3', tyre = '#23252a';
  m.b(1.76, 0.46, 4.1, red, 0, 0.32, 0.05); m.b(1.7, 0.1, 1.15, lite(red, 0.04), 0, 0.78, 1.38);   // body and bonnet
  m.b(1.58, 0.58, 1.96, glass, 0, 0.78, -0.6, { r: 0.3 }); m.b(1.62, 0.06, 1.8, lite(red, 0.06), 0, 1.36, -0.62);   // glasshouse and roof
  for (const z of [0.36, -0.6, -1.56]) m.b(1.62, 0.58, 0.07, red, 0, 0.78, z);                 // A, B and C pillars show as bands across the glass
  m.b(1.5, 0.625, 0.04, glass, 0, 0.8075, 0.6, { rx: -0.695, r: 0.3 }); m.b(1.5, 0.703, 0.04, glass, 0, 0.7385, -1.725, { rx: 0.695, r: 0.3 });   // windscreen, tailgate window
  m.b(1.8, 0.16, 0.2, WARM.dark, 0, 0.25, 2.1); m.b(1.8, 0.16, 0.2, WARM.dark, 0, 0.25, -2.1);   // bumpers
  m.b(0.8, 0.12, 0.04, '#3a3d44', 0, 0.45, 2.1);                                              // grille
  for (const sx of [-1, 1]) { m.b(0.32, 0.13, 0.05, '#fff3c4', sx * 0.62, 0.55, 2.1, { e: '#ffe9a0', ei: 0.6 }); m.b(0.3, 0.1, 0.05, '#d11a2a', sx * 0.66, 0.6, -2.1, { e: '#ff3b3b', ei: 0.5 }); }   // headlamps, tail lights
  m.b(0.5, 0.12, 0.03, '#f4f1e8', 0, 0.4, -2.14);                                              // number plate
  for (const sx of [-1, 1]) { m.b(0.1, 0.1, 0.16, red, sx * 0.9, 0.9, 0.55); for (const sz of [-1, 1]) { m.cx(0.22, 0.32, tyre, sx * 0.84, 0.32, sz * 1.3, 16); m.cx(0.235, 0.17, '#c9ced4', sx * 0.84, 0.32, sz * 1.3, 10, { mt: 0.6, r: 0.3 }); } }   // wing mirrors, wheels with hubcaps
}), { blob: { w: 2.0, d: 4.6, op: 0.45 } });
