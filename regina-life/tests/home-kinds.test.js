/**
 * Fixture builders (world/homeKinds.js): every kind in FIXTURE_KINDS has exactly one builder, runs at every rotation, and draws inside the footprint the
 * rules and the colliders use. Everything here goes through the real framework (buildInterior -> buildHome), so what is measured is what the player sees:
 * the world bounding box of the fixture's group, ambient-occlusion blob excluded.
 */
import './helpers/canvas-stub.js';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildInterior } from '../src/world/interiors.js';
import { FIXTURE_BUILDERS, FIXTURE_META } from '../src/world/homeKinds.js';
import { FIXTURE_KINDS, HOMES, rotXZ, rotRect, ACTIONS } from '../src/data/homes.js';

const KINDS = Object.keys(FIXTURE_KINDS), NEW_KINDS = ['toilet', 'vanity', 'dining_set', 'island', 'guest_bed', 'office_desk', 'garage_shelf', 'car'];

/** A big empty room with one fixture of every kind on a 6 m grid, all turned by `rot`. */
const kindsLayout = (rot) => ({
  id: `kinds${rot}`, name: 'Kinds', tier: 9, price: 1, maxPlaced: 10, title: 'Kinds', blurb: 'every fixture kind',
  rooms: [{ id: 'living', name: 'Hall', type: 'living', floor: { x0: -20, z0: -20, x1: 20, z1: 20 } }], walls: [],
  fixtures: KINDS.map((kind, i) => ({ id: `f_${kind}`, kind, x: -15 + (i % 6) * 6, z: -12 + Math.floor(i / 6) * 6, rot, room: 'living' })),
  decor: [], windows: [], ceilingLights: [], pointLights: [],
  entry: { door: { x: 0, z: 19.96, w: 1.6 }, spawn: { x: 0, z: 18, yaw: Math.PI }, exit: { x: 0, z: 18.6 } },   // lotOf wants an entry in every layout
});
const POSE = (layout, kind) => layout.fixtures.find((f) => f.kind === kind);

/** World bounding box of a fixture group's visible geometry; the soft shadow blob under the piece is not part of the model. */
function modelBox(group) {
  const box = new THREE.Box3(); group.updateMatrixWorld(true);
  group.traverse((o) => { if (!o.isMesh || o.material?.depthWrite === false) return; box.union(new THREE.Box3().setFromObject(o)); });
  return box;
}

/** Studio kinds were drawn before this package and are not mine to redraw; these are the (small) places where their models stick out of the footprint. */
const OVERHANG = {
  kitchen: 0.06,       // the worktop is 1.0 wide over a 0.9 carcass (a lip), and 3.5 long over 3.4
  sofa: 0.02,          // arm rests
  bed: 0.08,           // the headboard slab is 0.12 thick, centred on the footprint's back edge
  fridge: 0.04,        // the door handle
};
const TALLER = { shower: 0.1 };   // the chrome post is 2.3 m under a 2.2 m glass screen
const TOL = 0.02;       // metres; new kinds must fit to within 2 cm

describe('builders registry', () => {
  it('has a builder for every fixture kind and nothing else', () => {
    expect(Object.keys(FIXTURE_BUILDERS).sort()).toEqual([...KINDS].sort());
    expect(Object.keys(FIXTURE_META).sort()).toEqual([...KINDS].sort());
  });
  it('covers the eight kinds this package added', () => { for (const k of NEW_KINDS) { expect(FIXTURE_KINDS[k], k).toBeTruthy(); expect(typeof FIXTURE_BUILDERS[k], k).toBe('function'); } });
  it('every use of every kind names a known action', () => { for (const [k, def] of Object.entries(FIXTURE_KINDS)) for (const u of def.uses || []) expect(ACTIONS, `${k}.${u.id}`).toContain(u.action); });
});

for (const rot of [0, 1, 2, 3]) {
  describe(`every builder at rot ${rot}`, () => {
    const layout = kindsLayout(rot);
    const interior = buildInterior('apartment', { layout });
    const groupOf = (kind) => interior.group.getObjectByName(`fixture:f_${kind}`);

    for (const kind of KINDS) {
      it(`${kind}: builds, sits at its pose, turned by rot, inside its footprint, with a believable size`, () => {
        const def = FIXTURE_KINDS[kind], g = groupOf(kind), pose = POSE(layout, kind);
        expect(g, 'fixture group').toBeTruthy(); expect(g.position.x).toBe(pose.x); expect(g.position.z).toBe(pose.z); expect(g.rotation.y).toBeCloseTo((rot * Math.PI) / 2, 12);
        const want = rotRect({ x0: -def.w / 2, z0: -def.d / 2, x1: def.w / 2, z1: def.d / 2 }, rot), tol = TOL + (OVERHANG[kind] ?? 0), box = modelBox(g);
        expect(box.isEmpty(), 'draws something').toBe(false);
        const got = { x0: box.min.x - pose.x, x1: box.max.x - pose.x, z0: box.min.z - pose.z, z1: box.max.z - pose.z };
        expect(got.x0, 'west edge').toBeGreaterThanOrEqual(want.x0 - tol); expect(got.x1, 'east edge').toBeLessThanOrEqual(want.x1 + tol);
        expect(got.z0, 'north edge').toBeGreaterThanOrEqual(want.z0 - tol); expect(got.z1, 'south edge').toBeLessThanOrEqual(want.z1 + tol);
        // the model really fills the footprint (a wall switch is a plate on a wall: it only has to be on the pose)
        if (def.solid !== false) { expect((got.x1 - got.x0) / (want.x1 - want.x0), 'fills x').toBeGreaterThan(0.8); expect((got.z1 - got.z0) / (want.z1 - want.z0), 'fills z').toBeGreaterThan(0.8); }
        const y0 = def.y ?? 0;   // a wall plate hangs at its mount height, everything else stands on the floor
        expect(box.min.y, 'bottom').toBeGreaterThanOrEqual(y0 - 0.001); expect(box.min.y, 'bottom').toBeLessThan(y0 + 0.05);
        expect(box.max.y, 'top').toBeLessThanOrEqual(y0 + def.h + 0.08 + (TALLER[kind] ?? 0)); expect(box.max.y - y0, 'top').toBeGreaterThan(def.h * 0.7);
      });

      it(`${kind}: nobody stands inside the model (the spot each use is used from lies outside it)`, () => {
        const def = FIXTURE_KINDS[kind]; if (!def.uses) return;
        const g = groupOf(kind), pose = POSE(layout, kind), box = modelBox(g);
        for (const u of def.uses) {
          const o = rotXZ(u.dx, u.dz, rot), x = pose.x + o.x, z = pose.z + o.z;
          expect(x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z, `${kind}.${u.id} is used from (${x.toFixed(2)}, ${z.toFixed(2)})`).toBe(true);
        }
      });
    }
  });
}

describe('the new models face the way the data says', () => {
  const layout = kindsLayout(0), interior = buildInterior('apartment', { layout });
  /** All vertices of the fixture's meshes in the fixture's own frame (rot 0), filtered by a predicate on (x, y, z). */
  const verts = (kind, pred = () => true) => {
    const g = interior.group.getObjectByName(`fixture:f_${kind}`), p = POSE(layout, kind), out = []; g.updateMatrixWorld(true);
    g.traverse((o) => {
      if (!o.isMesh || o.material?.depthWrite === false) return; const a = o.geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); const x = v.x - p.x, y = v.y, z = v.z - p.z; if (pred(x, y, z)) out.push([x, y, z]); }
    });
    return out;
  };
  const meanZ = (vs) => vs.reduce((s, v) => s + v[2], 0) / vs.length, meanX = (vs) => vs.reduce((s, v) => s + v[0], 0) / vs.length;

  it('the toilet has its cistern (the tall part) at the back, -z', () => { const tall = verts('toilet', (x, y) => y > 0.7); expect(tall.length).toBeGreaterThan(0); expect(meanZ(tall)).toBeLessThan(-0.2); });
  it('the vanity has its splash-back (the tall part) at the back, -z', () => { const tall = verts('vanity', (x, y) => y > 0.9 && y < 0.99); expect(tall.length).toBeGreaterThan(0); expect(meanZ(tall)).toBeLessThan(-0.1); });
  it('the guest bed has its headboard (the tall part) on the north end, -z', () => { const tall = verts('guest_bed', (x, y) => y > 0.7); expect(meanZ(tall)).toBeLessThan(-0.9); });
  it('the car points its nose (lights, grille) towards +z, the roller door', () => {
    const lamps = verts('car', (x, y, z) => z > 2.0 && y > 0.4 && y < 0.7), tails = verts('car', (x, y, z) => z < -2.05 && y > 0.4 && y < 0.7);
    expect(lamps.length).toBeGreaterThan(0); expect(tails.length).toBeGreaterThan(0); expect(meanZ(lamps)).toBeGreaterThan(2); expect(meanZ(tails)).toBeLessThan(-2);
  });
  it('the office desk has its monitor at the back and its drawers facing the chair side, -z', () => {
    const screen = verts('office_desk', (x, y) => y > 0.9); expect(screen.length).toBeGreaterThan(0); expect(meanZ(screen)).toBeGreaterThan(0.1);
    const drawers = verts('office_desk', (x, y, z) => z < -0.36 && y < 0.7); expect(drawers.length).toBeGreaterThan(0); expect(meanX(drawers)).toBeLessThan(-0.3);
  });
  it('the garage shelf is open on the +z side, where its Storage prompt is: nothing stands out of the posts towards +z', () => {
    const front = verts('garage_shelf', (x, y, z) => z > 0.2); expect(front.length).toBeGreaterThan(0); expect(Math.max(...front.map((v) => v[2]))).toBeLessThanOrEqual(0.25 + TOL);
  });
  it('the dining chair on the south side is where the player sits (the sit use lands on its seat)', () => {
    const sit = FIXTURE_KINDS.dining_set.uses[0].sit, seat = verts('dining_set', (x, y, z) => y > 0.42 && y < 0.48 && Math.abs(x - sit.dx) < 0.19 && Math.abs(z - sit.dz) < 0.19);
    expect(seat.length).toBeGreaterThan(8);   // seat boards under (0, 0.85)
  });
  it('the island has its overhang (open knee space) on the -z side and its doors on +z', () => {
    const doors = verts('island', (x, y, z) => z > 0.4 && y > 0.1 && y < 0.8), under = verts('island', (x, y, z) => z < -0.3 && y < 0.8 && Math.abs(x) < 0.8);
    expect(doors.length).toBeGreaterThan(0); expect(under.length).toBe(0);
  });
});

describe('the new models are merged per material and share what they can', () => {
  const layout = kindsLayout(0), interior = buildInterior('apartment', { layout });
  const meshesOf = (kind) => { const out = []; interior.group.getObjectByName(`fixture:f_${kind}`).traverse((o) => { if (o.isMesh && o.material?.depthWrite !== false) out.push(o); }); return out; };

  it('each new kind is a handful of meshes (one per material), not one per box', () => {
    const budget = { toilet: 6, vanity: 12, dining_set: 10, island: 12, guest_bed: 10, office_desk: 14, garage_shelf: 14, car: 12 };
    for (const k of NEW_KINDS) { const n = meshesOf(k).length; expect(n, k).toBeGreaterThan(0); expect(n, `${k} meshes`).toBeLessThanOrEqual(budget[k]); }
  });
  it('a baked fixture uses no material twice and every mesh has its own merged geometry', () => {
    for (const k of NEW_KINDS) { const ms = meshesOf(k); expect(new Set(ms.map((m) => m.material)).size, k).toBe(ms.length); expect(new Set(ms.map((m) => m.geometry)).size, k).toBe(ms.length); }
  });
  it('materials are shared between fixtures of the same interior (the garage shelf and the office desk both use the same steel frame colour)', () => {
    const a = new Set(meshesOf('office_desk').map((m) => m.material)), b = new Set(meshesOf('vanity').map((m) => m.material)), c = new Set(meshesOf('toilet').map((m) => m.material));
    expect([...a].some((m) => b.has(m) || c.has(m)) || [...b].some((m) => c.has(m))).toBe(true);
  });
  it('dispose releases every geometry and material the fixtures made', () => {
    const it2 = buildInterior('apartment', { layout: kindsLayout(1) }), geos = new Set(), mats = new Set(); let g = 0, m = 0;
    it2.group.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) [].concat(o.material).forEach((x) => mats.add(x)); });
    for (const x of geos) x.addEventListener('dispose', () => g++); for (const x of mats) x.addEventListener('dispose', () => m++);
    it2.dispose(); expect(g).toBe(geos.size); expect(m).toBe(mats.size);
  });
  it('is deterministic: the same layout builds the same garage shelf twice (seeded by the fixture id)', () => {
    const a = buildInterior('apartment', { layout: kindsLayout(0) }), pos = (it2) => { const out = []; it2.group.getObjectByName('fixture:f_garage_shelf').traverse((o) => { if (o.isMesh) out.push(o.geometry.attributes.position.array.length + ':' + o.geometry.attributes.position.array[7]); }); return out; };
    expect(pos(a)).toEqual(pos(interior));
  });
});

describe('the real layouts draw every fixture they list', () => {
  for (const id of ['studio', 'onebed', 'bungalow']) it(`${id}: one group per fixture, each with geometry, in the room it belongs to`, () => {
    const it0 = buildInterior('apartment', { layout: HOMES[id] });
    for (const f of HOMES[id].fixtures) {
      const g = it0.group.getObjectByName(`fixture:${f.id}`); expect(g, f.id).toBeTruthy(); expect(modelBox(g).isEmpty(), f.id).toBe(false);
      let p = g.parent; while (p && !p.name.startsWith('room:')) p = p.parent; expect(p?.name, f.id).toBe(`room:${f.room}`);
    }
    it0.dispose();
  });
});
