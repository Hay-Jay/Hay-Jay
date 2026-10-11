/**
 * The yard (world/homeYard.js): lawn, fence, trees, path, mailbox, driveway. Checked as geometry in the world frame: where things are, that none of it
 * overlaps the house or blocks its own gates, that it is cheap (a handful of merged meshes), only shown in the overhead views, and released with the interior.
 */
import './helpers/canvas-stub.js';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildInterior } from '../src/world/interiors.js';
import { planYard, buildYard } from '../src/world/homeYard.js';
import { lotOf } from '../src/core/lot.js';
import { HOMES, STUDIO, BUNGALOW, WALL_T } from '../src/data/homes.js';

const near = (a, b, d = 1e-6) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(d);
const inside = (r, x, z, tol = 1e-6) => x >= r.x0 - tol && x <= r.x1 + tol && z >= r.z0 - tol && z <= r.z1 + tol;
const grow = (r, d) => ({ x0: r.x0 - d, z0: r.z0 - d, x1: r.x1 + d, z1: r.z1 + d });
/** Every vertex of a mesh in world space. */
function worldVerts(mesh) { mesh.updateWorldMatrix(true, false); const a = mesh.geometry.attributes.position, v = new THREE.Vector3(), out = []; for (let i = 0; i < a.count; i++) out.push(v.fromBufferAttribute(a, i).applyMatrix4(mesh.matrixWorld).clone()); return out; }
const detail = (yard) => yard.getObjectByName('yard-detail').children;
/** World-space vertices of everything drawn in one colour (parts that differ only in colour share a mesh and carry their colour per vertex). */
function vertsOfColour(yard, hex) {
  const want = new THREE.Color(hex), out = [], v = new THREE.Vector3();
  for (const m of detail(yard)) {
    m.updateWorldMatrix(true, false); const a = m.geometry.attributes.position, c = m.geometry.attributes.color;
    for (let i = 0; i < a.count; i++) if (Math.abs(c.getX(i) - want.r) < 1e-5 && Math.abs(c.getY(i) - want.g) < 1e-5 && Math.abs(c.getZ(i) - want.b) < 1e-5) out.push(v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld).clone());
  }
  return out;
}
const FENCE_COLOURS = ['#f7f2e8', '#efe8d8', '#e4dac4', '#c9a878'];

describe('which homes get a yard', () => {
  it('only the Bungalow: the Studio and One-bedroom have none (and so no stage dressing to hide)', () => {
    expect(planYard(STUDIO)).toBeNull(); expect(planYard(HOMES.onebed)).toBeNull(); expect(buildYard(STUDIO, { mat: () => null, track: (o) => o })).toBeNull();
    for (const id of ['studio', 'onebed']) { const it0 = buildInterior('apartment', { layout: HOMES[id] }); expect(it0.yard, id).toBeNull(); expect(it0.parts.yard).toBeNull(); }
    const b = buildInterior('apartment', { layout: BUNGALOW }); expect(b.yard).toBeTruthy(); expect(b.yard.isGroup).toBe(true); expect(b.parts.yard).toBe(b.yard); expect(b.group.children).toContain(b.yard);
  });
  it('is shown in every overhead mode and hidden while walking', () => {
    const b = buildInterior('apartment', { layout: BUNGALOW }); expect(b.yard.visible).toBe(false);
    b.setOverhead(true); expect(b.yard.visible).toBe(true); for (const m of ['up', 'cut', 'down']) { b.setWallMode(m); expect(b.yard.visible, m).toBe(true); }
    b.setOverhead(false); expect(b.yard.visible).toBe(false); b.setWallMode('cut'); expect(b.yard.visible, 'a mode picked while walking is not shown while walking').toBe(false);
  });
});

describe('the plan of the Bungalow\'s yard', () => {
  const plan = planYard(BUNGALOW), lot = lotOf(BUNGALOW);
  it('knows the lot: the lawn is the yard rect (footprint + 3 m), the house stands in its hole', () => {
    expect(plan.yardRect).toEqual(lot.yardRect); expect(plan.hole.x0).toBeCloseTo(lot.bbox.x0 - WALL_T / 2, 9); expect(plan.house.z1).toBeCloseTo(lot.bbox.z1 + WALL_T, 9);
    expect(plan.door).toMatchObject({ side: 'S', nx: 0, nz: 1, x: 3.2 });
  });
  it('is deterministic (a layout always gets the same yard) and different layouts do not share trees', () => {
    expect(planYard(BUNGALOW)).toEqual(plan);
    const other = planYard({ ...BUNGALOW, id: 'bungalow2' }); expect(JSON.stringify(other.trees)).not.toBe(JSON.stringify(plan.trees));
  });
  it('runs a stepping-stone path from the doorstep to the lawn edge, in a straight line out of the door, stones close enough to step between', () => {
    const p = plan.path; expect(p.length).toBeGreaterThanOrEqual(3);
    expect(p[0].z - plan.house.z1).toBeLessThan(1.3); expect(plan.yardRect.z1 - p[p.length - 1].z).toBeLessThan(0.7);
    for (let i = 0; i < p.length; i++) { expect(Math.abs(p[i].x - plan.door.x), 'stays on the door line').toBeLessThan(0.15); expect(inside(plan.yardRect, p[i].x, p[i].z)).toBe(true); expect(inside(plan.house, p[i].x, p[i].z)).toBe(false); if (i) expect(p[i].z - p[i - 1].z).toBeLessThan(0.65); }
  });
  it('opens the fence at the path (1.3 m) and at the garage (3.8 m), nowhere else', () => {
    expect(plan.gates).toEqual([{ side: 'S', at: 3.2, w: 1.3 }, { side: 'S', at: -7.4, w: 3.8 }]);
  });
  it('runs a driveway from the outside of the roller door to the lawn edge, centred on the garage', () => {
    const d = plan.drive, garage = BUNGALOW.rooms.find((r) => r.id === 'garage').floor;
    near((d.x0 + d.x1) / 2, (garage.x0 + garage.x1) / 2, 1e-6); near(d.z0, 5.6 + WALL_T / 2); near(d.z1, plan.yardRect.z1); expect(d.axis).toBe('z'); expect(d.x1 - d.x0).toBeGreaterThan(car().w);
    function car() { return { w: 1.9 }; }
  });
  it('plants two to four trees well clear of the house, the path, the driveway and the mailbox', () => {
    expect(plan.trees.length).toBeGreaterThanOrEqual(2); expect(plan.trees.length).toBeLessThanOrEqual(4);
    for (const t of plan.trees) {
      expect(inside(grow(plan.fence, -0.3), t.x, t.z), 'inside the fence').toBe(true);
      const dx = Math.max(plan.house.x0 - t.x, 0, t.x - plan.house.x1), dz = Math.max(plan.house.z0 - t.z, 0, t.z - plan.house.z1);
      expect(Math.hypot(dx, dz), 'canopy (radius <= 1) clears the wall').toBeGreaterThan(1.1);
      for (const p of plan.path) expect(Math.hypot(p.x - t.x, p.z - t.z)).toBeGreaterThan(1.5);
      expect(Math.hypot(plan.mailbox.x - t.x, plan.mailbox.z - t.z)).toBeGreaterThan(1.5);
      if (plan.drive) expect(inside(grow(plan.drive, 1.2), t.x, t.z)).toBe(false);
    }
  });
  it('puts the mailbox at the lawn edge beside the path, away from the driveway', () => {
    const m = plan.mailbox; near(m.z, plan.yardRect.z1 - 0.2); expect(m.x).toBeGreaterThan(plan.door.x); expect(Math.abs(m.x - plan.door.x)).toBeLessThan(2.5);
  });
});

describe('the plan on a house whose door is not on the south', () => {
  const east = { ...BUNGALOW, id: 'eastdoor', walls: BUNGALOW.walls.filter((w) => w.style !== 'roller'), entry: { door: { x: 4.46, z: 2.0, w: 1.6 }, spawn: { x: 3.4, z: 2, yaw: -Math.PI / 2 }, exit: { x: 3.9, z: 2 } } };
  it('runs the path east, to the east lawn edge, on the door\'s line', () => {
    const p = planYard(east); expect(p.door).toMatchObject({ side: 'E', nx: 1, nz: 0 }); expect(p.drive).toBeNull();
    expect(p.path.length).toBeGreaterThanOrEqual(3); for (const s of p.path) { near(s.z, 2.0, 0.15); expect(s.x).toBeGreaterThan(p.house.x1); expect(s.x).toBeLessThan(p.yardRect.x1); }
    expect(p.gates).toEqual([{ side: 'E', at: 2.0, w: 1.3 }]); near(p.mailbox.x, p.yardRect.x1 - 0.2);
    const g = buildYard(east, { mat: (c, o) => new THREE.MeshStandardMaterial({ color: c }), track: (o) => o }); expect(g.getObjectByName('yard-detail').children.length).toBeGreaterThan(1); expect(vertsOfColour(g, '#cfc7b8').length, 'stones').toBeGreaterThan(0);
  });
});

describe('the yard\'s meshes', () => {
  const b = buildInterior('apartment', { layout: BUNGALOW }), yard = b.yard, plan = yard.userData.plan, lot = lotOf(BUNGALOW);

  it('has a lawn that is flat on the ground, faces up, and leaves a hole exactly where the house is', () => {
    const lawn = yard.getObjectByName('lawn'), pos = lawn.geometry.attributes.position, idx = lawn.geometry.index, a = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
    let area = 0;
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i)); c.fromBufferAttribute(pos, idx.getX(i + 1)); d.fromBufferAttribute(pos, idx.getX(i + 2));
      near(a.y, 0, 1e-9); const n = c.clone().sub(a).cross(d.clone().sub(a)); expect(n.y, 'faces up').toBeGreaterThan(0); area += n.y / 2;
      const gx = (a.x + c.x + d.x) / 3, gz = (a.z + c.z + d.z) / 3; expect(inside(plan.hole, gx, gz, -1e-6), 'no lawn inside the house').toBe(false);
    }
    const W = plan.yardRect.x1 - plan.yardRect.x0, D = plan.yardRect.z1 - plan.yardRect.z0, w = plan.hole.x1 - plan.hole.x0, dd = plan.hole.z1 - plan.hole.z0;
    near(area, W * D - w * dd, 1e-3);
    near(W, lot.bbox.x1 - lot.bbox.x0 + 6, 1e-9); expect(lawn.material.map).toBeTruthy();
  });

  it('keeps the whole fence outside the house (at least 2 m from the walls) and inside the lawn', () => {
    const clear = grow(plan.house, 2.0);
    for (const hex of FENCE_COLOURS) { const vs = vertsOfColour(yard, hex); expect(vs.length, hex).toBeGreaterThan(0); for (const v of vs) { expect(inside(plan.yardRect, v.x, v.z), 'inside the lawn').toBe(true); expect(inside(clear, v.x, v.z), 'not near the house').toBe(false); } }
  });
  it('leaves the fence open at the gates: no picket or rail across the path or the driveway', () => {
    const pickets = vertsOfColour(yard, '#f7f2e8'), rails = vertsOfColour(yard, '#efe8d8'), south = plan.fence.z1;
    for (const vs of [pickets, rails]) for (const v of vs) {
      if (Math.abs(v.z - south) > 0.2) continue;   // only the south run
      for (const g of plan.gates.filter((q) => q.side === 'S')) expect(Math.abs(v.x - g.at) >= g.w / 2 - 0.01, `fence vertex at x ${v.x.toFixed(2)} inside the gate at ${g.at}`).toBe(true);
    }
    // ... and it is closed everywhere else along the south run: a picket every 22 cm
    const xs = [...new Set(pickets.filter((v) => Math.abs(v.z - south) < 0.1 && v.y > 0.5).map((v) => Math.round(v.x * 50) / 50))].sort((p, q) => p - q);
    let maxGap = 0; for (let i = 1; i < xs.length; i++) { const outside = plan.gates.some((g) => g.side === 'S' && xs[i - 1] > g.at - g.w / 2 - 0.2 && xs[i] < g.at + g.w / 2 + 0.2); if (!outside) maxGap = Math.max(maxGap, xs[i] - xs[i - 1]); }
    expect(maxGap).toBeLessThan(0.2);
  });
  it('keeps the stones, driveway and mailbox on the lawn and clear of the house walls', () => {
    for (const hex of ['#cfc7b8', '#bdb9b0', '#d3cbbb']) { const vs = vertsOfColour(yard, hex); expect(vs.length, hex).toBeGreaterThan(0); for (const v of vs) { expect(inside(plan.yardRect, v.x, v.z)).toBe(true); expect(v.y).toBeGreaterThanOrEqual(-1e-6); expect(v.y).toBeLessThan(0.06); } }
    const drive = vertsOfColour(yard, '#bdb9b0'); near(Math.min(...drive.map((v) => v.z)), 5.6 + WALL_T / 2, 1e-4); near(Math.max(...drive.map((v) => v.z)), plan.yardRect.z1, 1e-4);
    for (const v of vertsOfColour(yard, '#2f6fb5')) { expect(v.y).toBeGreaterThan(0.9); expect(v.y).toBeLessThan(1.3); expect(inside(plan.house, v.x, v.z)).toBe(false); }
  });
  it('keeps every tree under 4.5 m and in its own spot (canopy never reaches the wall)', () => {
    const colours = ['#5aa564', '#74b968', '#8cc875', '#7a5a3e', '#6b4f36', '#3c8454', '#47965f', '#52a46a']; let n = 0;
    for (const hex of colours) for (const v of vertsOfColour(yard, hex)) { n++; expect(v.y).toBeLessThan(4.5); expect(inside(grow(plan.house, 0.2), v.x, v.z), 'tree geometry inside the house').toBe(false); }
    expect(n).toBeGreaterThan(100);
    const tallest = Math.max(...colours.flatMap((hex) => vertsOfColour(yard, hex).map((v) => v.y))); expect(tallest).toBeGreaterThan(2.5);
  });
  it('is cheap: a few merged meshes however long the fence is, with no lights, no shadows cast and nothing for the player to bump into', () => {
    let meshes = 0, lights = 0, casters = 0; yard.traverse((o) => { if (o.isMesh) { meshes++; if (o.castShadow) casters++; } if (o.isLight) lights++; });
    expect(meshes).toBeLessThanOrEqual(10); expect(lights).toBe(0); expect(casters).toBe(0);
    const empty = buildInterior('apartment', { layout: { ...BUNGALOW, id: 'bungalow-noyard', yard: undefined } });   // the same house without a yard has exactly the same colliders
    expect(b.colliders.rects.length).toBe(empty.colliders.rects.length);
  });
  it('is released with the interior (lawn texture included)', () => {
    const b2 = buildInterior('apartment', { layout: BUNGALOW }), geos = new Set(), mats = new Set(), texs = new Set();
    b2.yard.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) [].concat(o.material).forEach((m) => { mats.add(m); if (m.map) texs.add(m.map); }); });
    const gone = new Set(); for (const x of [...geos, ...mats, ...texs]) x.addEventListener('dispose', () => gone.add(x));   // (a material may be disposed twice: it counts once)
    b2.dispose(); for (const x of geos) expect(gone.has(x), 'geometry').toBe(true); for (const x of mats) expect(gone.has(x), 'material').toBe(true); for (const x of texs) expect(gone.has(x), 'texture').toBe(true); expect(texs.size).toBe(1);
  });
});
