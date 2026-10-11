/**
 * Wall modes (world/homeWalls.js): what each of 'walk' | 'up' | 'cut' | 'down' does to every wall piece by role and side, proven on a synthetic set of
 * pieces and on the real One-bedroom, Bungalow and Studio; plus the room name decals and the roller door.
 */
import './helpers/canvas-stub.js';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildInterior } from '../src/world/interiors.js';
import { applyWallMode, wallHeightIn, WALL_MODES, CUT_H, labelSpot, sideOfNormal, sideOfPoint } from '../src/world/homeWalls.js';
import { HOMES, CEIL_H, DOOR_H, WALL_T } from '../src/data/homes.js';

const near = (a, b, d = 1e-6) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(d);
const topOf = (m) => { m.updateWorldMatrix(true, false); return new THREE.Box3().setFromObject(m).max.y; };
const build = (id) => buildInterior('apartment', { layout: HOMES[id] });

/* ------------------------------------------------------------------------------------------------ the rules */
describe('wallHeightIn: the one table of the four modes', () => {
  const T = (role, side = null) => ({ role, side });
  it('walk and up: every wall stands full height', () => {
    for (const mode of ['walk', 'up']) for (const t of [T('exterior', 'N'), T('exterior', 'S'), T('exterior', 'E'), T('exterior', 'W'), T('partition'), T('lintel')]) expect(wallHeightIn(mode, t), `${mode} ${t.role}${t.side ?? ''}`).toBe(CEIL_H);
  });
  it('cut: partitions and the south exterior wall go to 0.9 m, lintels vanish, the other outer walls stay', () => {
    expect(CUT_H).toBe(0.9);
    expect(wallHeightIn('cut', T('partition'))).toBe(0.9); expect(wallHeightIn('cut', T('exterior', 'S'))).toBe(0.9); expect(wallHeightIn('cut', T('lintel'))).toBe(0);
    for (const s of ['N', 'E', 'W']) expect(wallHeightIn('cut', T('exterior', s)), s).toBe(CEIL_H);
  });
  it('down: nothing stands', () => { for (const t of [T('exterior', 'N'), T('exterior', 'S'), T('partition'), T('lintel')]) expect(wallHeightIn('down', t)).toBe(0); });
  it('the four modes are exactly walk, up, cut, down', () => { expect(WALL_MODES).toEqual(['walk', 'up', 'cut', 'down']); });
  it('reads a window or sign side off the wall normal, and a door side off its place in the footprint', () => {
    expect([0, Math.PI, Math.PI / 2, -Math.PI / 2, 2 * Math.PI, -Math.PI].map(sideOfNormal)).toEqual(['N', 'S', 'W', 'E', 'N', 'S']);
    const bbox = { x0: -4.5, z0: -5.5, x1: 4.5, z1: 5.5 };
    expect([sideOfPoint(bbox, 3.2, 5.46), sideOfPoint(bbox, 0, -5.6), sideOfPoint(bbox, 4.6, 0), sideOfPoint(bbox, -4.6, 0)]).toEqual(['S', 'N', 'E', 'W']);
  });
});

/* ------------------------------------------------------------------------------------------- synthetic pieces */
describe('applyWallMode on a synthetic set of wall pieces', () => {
  const wall = (role, side) => { const g = new THREE.BoxGeometry(2, CEIL_H, 0.2).translate(0, CEIL_H / 2, 0), m = new THREE.Mesh(g, new THREE.MeshBasicMaterial()); m.userData.wall = { role, side }; return m; };
  const lintel = () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, CEIL_H - DOOR_H, 0.2).translate(0, (CEIL_H - DOOR_H) / 2, 0), new THREE.MeshBasicMaterial()); m.position.y = DOOR_H; m.userData.wall = { role: 'lintel', side: null }; return m; };
  const opening = (role, side, y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, h, 0.1), new THREE.MeshBasicMaterial()); m.position.y = y; m.userData.wall = { role, side }; return m; };
  const mk = () => ({
    walls: [wall('exterior', 'N'), wall('exterior', 'S'), wall('exterior', 'E'), wall('exterior', 'W'), wall('partition', null)], lintels: [lintel()],
    trims: [new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.05), new THREE.MeshBasicMaterial())],
    openings: [opening('window', 'N', 1.7, 1.7), opening('window', 'S', 1.7, 1.7), opening('door', 'S', 1.2, 2.4), opening('sign', 'E', 1.7, 0.9), opening('window', null, 1.7, 1.0)],
    ceilings: [new THREE.Mesh(), new THREE.Mesh()], ceilFixtures: [new THREE.Mesh()], yard: new THREE.Group(), labels: new THREE.Group(),
  });
  const state = (p) => ({ walls: p.walls.map((m) => [m.visible, +m.scale.y.toFixed(4)]), lintel: [p.lintels[0].visible, p.lintels[0].scale.y], trim: p.trims[0].visible, open: p.openings.map((m) => m.visible), ceil: p.ceilings.every((c) => c.visible), fix: p.ceilFixtures[0].visible, yard: p.yard.visible, labels: p.labels.visible });
  const cutS = +(CUT_H / CEIL_H).toFixed(4);

  it('walk: full walls, ceiling and its fixtures, no yard, no labels', () => {
    const p = mk(); applyWallMode(p, 'walk');
    expect(state(p)).toEqual({ walls: [[true, 1], [true, 1], [true, 1], [true, 1], [true, 1]], lintel: [true, 1], trim: true, open: [true, true, true, true, true], ceil: true, fix: true, yard: false, labels: false });
  });
  it('up: full walls, ceiling and its fixtures hidden, yard and labels shown', () => {
    const p = mk(); applyWallMode(p, 'up');
    expect(state(p)).toEqual({ walls: [[true, 1], [true, 1], [true, 1], [true, 1], [true, 1]], lintel: [true, 1], trim: true, open: [true, true, true, true, true], ceil: false, fix: false, yard: true, labels: true });
  });
  it('cut: the south wall and the partition at 0.9 m, N/E/W full, lintel gone, what hangs on a lowered wall gone, the door lowered', () => {
    const p = mk(); applyWallMode(p, 'cut');
    expect(state(p).walls).toEqual([[true, 1], [true, cutS], [true, 1], [true, 1], [true, cutS]]);   // N S E W partition
    expect(p.lintels[0].visible).toBe(false); expect(p.trims[0].visible).toBe(true);
    expect(p.openings.map((m) => m.visible)).toEqual([true, false, true, true, false]);   // north window stays; south window, the sign on the east wall stays; window on a partition goes
    const door = p.openings[2]; near(topOf(door), CUT_H); near(new THREE.Box3().setFromObject(door).min.y, 0);   // lowered with its wall, still on the floor
    expect(p.ceilings.every((c) => !c.visible) && !p.ceilFixtures[0].visible && p.yard.visible && p.labels.visible).toBe(true);
    // pieces keep their real heights: a lowered wall is 0.9 m tall in the world, a full one 3.3
    near(topOf(p.walls[1]), CUT_H); near(topOf(p.walls[0]), CEIL_H); near(topOf(p.walls[4]), CUT_H);
  });
  it('down: no walls, no lintels, no skirting, nothing hung on them', () => {
    const p = mk(); applyWallMode(p, 'down');
    expect(p.walls.every((m) => !m.visible) && !p.lintels[0].visible && !p.trims[0].visible && p.openings.every((m) => !m.visible)).toBe(true);
    expect(p.ceilings.every((c) => !c.visible) && p.yard.visible && p.labels.visible).toBe(true);
  });
  it('goes from any mode to any other and always comes back exactly (nothing is left lowered, squashed or hidden)', () => {
    const fresh = state((() => { const p = mk(); applyWallMode(p, 'walk'); return p; })());
    for (const a of WALL_MODES) for (const b of WALL_MODES) {
      const p = mk(); applyWallMode(p, a); applyWallMode(p, b); const once = state(p); applyWallMode(p, b); expect(state(p), `${a}->${b} twice`).toEqual(once);
      applyWallMode(p, 'walk'); expect(state(p), `${a}->${b}->walk`).toEqual(fresh);
      near(p.openings[2].position.y, 1.2); near(p.openings[2].scale.y, 1);
    }
  });
  it('ignores an unknown mode and missing parts', () => {
    const p = mk(); applyWallMode(p, 'up'); const before = state(p); applyWallMode(p, 'sideways'); applyWallMode(p, undefined); applyWallMode(null, 'cut'); applyWallMode({}, 'cut'); expect(state(p)).toEqual(before);
  });
});

/* ------------------------------------------------------------------------------------------------ real homes */
describe('wall modes on the real homes', () => {
  const walls = (h) => h.parts.walls, wallsOf = (h, role, side = null) => walls(h).filter((m) => m.userData.wall.role === role && m.userData.wall.side === side);

  for (const id of ['onebed', 'bungalow']) describe(id, () => {
    const hm = build(id);
    hm.setHome({ layout: id, wall: 'cream', floor: 'oak', rooms: {}, placed: [] });
    hm.setOverhead(true);

    it('tags every wall run with its role and side, and has both outer and inner walls', () => {
      expect(walls(hm).length).toBeGreaterThan(4);
      for (const m of walls(hm)) { const w = m.userData.wall; expect(['exterior', 'partition']).toContain(w.role); if (w.role === 'partition') expect(w.side).toBeNull(); else expect(['N', 'S', 'E', 'W']).toContain(w.side); }
      expect(wallsOf(hm, 'partition').length).toBeGreaterThan(0); expect(wallsOf(hm, 'exterior', 'S').length).toBeGreaterThan(0);
    });

    it('defaults to cut when looked at from above: partitions and the south wall at 0.9 m, the other outer walls full, lintels hidden, no ceiling', () => {
      expect(hm.wallMode).toBe('cut');
      for (const m of walls(hm)) { const w = m.userData.wall, low = w.role === 'partition' || w.side === 'S'; near(topOf(m), low ? CUT_H : CEIL_H, 1e-4); expect(m.visible).toBe(true); }
      expect(hm.parts.lintels.length).toBeGreaterThan(0); expect(hm.parts.lintels.every((m) => !m.visible)).toBe(true);
      expect(hm.parts.ceilings.every((c) => !c.visible) && hm.parts.ceilFixtures.every((c) => !c.visible)).toBe(true);
    });

    it('lowers the front door with the south wall and hides south windows, keeping the windows on the walls that stay', () => {
      const door = hm.group.getObjectByName('front-door'); near(topOf(door), CUT_H, 1e-4);
      const win = hm.parts.openings.filter((m) => m.userData.wall.role === 'window');
      expect(win.length).toBeGreaterThan(0);
      for (const m of win) expect(m.visible, `window on ${m.userData.wall.side}`).toBe(m.userData.wall.side !== 'S');
      expect(win.some((m) => m.userData.wall.side === 'S') && win.some((m) => m.userData.wall.side !== 'S' && m.visible)).toBe(true);
    });

    it('up restores full walls and lintels but keeps the ceiling off; down hides every wall, lintel, skirting board and window; walking restores it all', () => {
      hm.setWallMode('up'); expect(hm.wallMode).toBe('up');
      for (const m of walls(hm)) near(topOf(m), CEIL_H, 1e-4); expect(hm.parts.lintels.every((m) => m.visible)).toBe(true); expect(hm.parts.ceilings.every((c) => !c.visible)).toBe(true);
      hm.setWallMode('down'); expect(hm.wallMode).toBe('down');
      expect(walls(hm).every((m) => !m.visible) && hm.parts.lintels.every((m) => !m.visible) && hm.parts.trims.every((m) => !m.visible) && hm.parts.openings.every((m) => !m.visible)).toBe(true);
      hm.setOverhead(false); expect(hm.wallMode).toBe('walk');
      expect(walls(hm).every((m) => m.visible && Math.abs(topOf(m) - CEIL_H) < 1e-4) && hm.parts.lintels.every((m) => m.visible) && hm.parts.trims.every((m) => m.visible) && hm.parts.openings.every((m) => m.visible)).toBe(true);
      expect(hm.parts.ceilings.every((c) => c.visible) && hm.parts.ceilFixtures.every((c) => c.visible)).toBe(true);
      near(topOf(hm.group.getObjectByName('front-door')), 2.4, 1e-4);
      hm.setOverhead(true); expect(hm.wallMode).toBe('down');   // the chosen overhead mode was remembered
    });
  });

  it('the Studio\'s overhead view is still today\'s: every wall full height, ceiling off, front door and window panes untouched', () => {
    const hm = build('studio'); hm.setOverhead(true); expect(hm.wallMode).toBe('up');
    for (const m of walls(hm)) near(topOf(m), CEIL_H, 1e-4);
    expect(hm.parts.openings.every((m) => m.visible)).toBe(true); near(topOf(hm.group.getObjectByName('front-door')), 2.4, 1e-4); expect(hm.parts.labels).toBeNull();
  });

  it('cut also works on the Studio if asked (its four walls are exterior: only the south one is lowered)', () => {
    const hm = build('studio'); hm.setOverhead(true); hm.setWallMode('cut');
    for (const m of walls(hm)) near(topOf(m), m.userData.wall.side === 'S' ? CUT_H : CEIL_H, 1e-4);
    expect(hm.parts.lintels).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------------------------------------ wall-mounted fixtures */
describe('wall-mounted fixtures (the light switches) follow their wall', () => {
  for (const [id, switches] of [['onebed', ['switch_bed']], ['bungalow', ['switch_bed', 'switch_bath', 'switch_den', 'switch_garage']]]) it(`${id}: a switch on a partition is hidden when the partition is cut or gone, shown otherwise`, () => {
    const hm = build(id), g = (name) => hm.group.getObjectByName(`fixture:${name}`);
    for (const sw of switches) {
      expect(g(sw).userData.wall, sw).toEqual({ role: 'mounted', side: null }); expect(hm.parts.openings, sw).toContain(g(sw));
      expect(g(sw).visible).toBe(true);   // walking
      hm.setOverhead(true); expect(g(sw).visible, `${sw} cut`).toBe(false);
      hm.setWallMode('up'); expect(g(sw).visible, `${sw} up`).toBe(true);
      hm.setWallMode('down'); expect(g(sw).visible, `${sw} down`).toBe(false);
      hm.setWallMode('cut'); hm.setOverhead(false); expect(g(sw).visible, `${sw} walking again`).toBe(true);
    }
  });
  it('a kind without a mount height is never treated as wall-mounted', () => {
    const hm = build('bungalow'); for (const m of hm.parts.openings) if (m.userData.wall.role === 'mounted') expect(m.name).toMatch(/^fixture:switch/);
  });
});

/* ------------------------------------------------------------------------------------------------ the roller door */
describe('the garage roller door', () => {
  const hm = build('bungalow');
  const pieces = () => hm.parts.openings.filter((m) => m.name === 'roller-door');
  it('is drawn on both faces of the garage\'s south wall, as a few merged meshes tagged as a door on the south side', () => {
    const ps = pieces(); expect(ps.length).toBeGreaterThan(2); expect(ps.length).toBeLessThan(10);
    const box = new THREE.Box3(); for (const m of ps) { expect(m.userData.wall).toMatchObject({ role: 'door', side: 'S' }); box.union(new THREE.Box3().setFromObject(m)); }
    const garage = HOMES.bungalow.rooms.find((r) => r.id === 'garage').floor, cx = (garage.x0 + garage.x1) / 2;
    near((box.min.x + box.max.x) / 2, cx, 0.1); expect(box.max.x - box.min.x).toBeGreaterThan(3); expect(box.max.x - box.min.x).toBeLessThan(garage.x1 - garage.x0);
    expect(box.min.z).toBeLessThan(5.6 - WALL_T / 2); expect(box.max.z).toBeGreaterThan(5.6 + WALL_T / 2); near(box.min.y, 0, 1e-6); expect(box.max.y).toBeGreaterThan(2.2); expect(box.max.y).toBeLessThan(2.7);
  });
  it('is lowered with the wall in the cutaway and restored for walking', () => {
    hm.setOverhead(true); const top = () => Math.max(...pieces().map(topOf));
    near(top(), CUT_H, 1e-3); hm.setWallMode('up'); expect(top()).toBeGreaterThan(2.2); hm.setWallMode('down'); expect(pieces().every((m) => !m.visible)).toBe(true); hm.setWallMode('cut'); near(top(), CUT_H, 1e-3);
    hm.setOverhead(false); expect(top()).toBeGreaterThan(2.2); expect(pieces().every((m) => m.visible)).toBe(true);
  });
  it('only the layout that asks for one gets one', () => { for (const id of ['studio', 'onebed']) expect(build(id).parts.openings.some((m) => m.name === 'roller-door')).toBe(false); });
});

/* ------------------------------------------------------------------------------------------------ the foundation slab */
describe('the foundation slab', () => {
  for (const id of ['onebed', 'bungalow']) it(`${id}: one slab under the whole footprint (wall faces included), below the floors, never in front of them in depth`, () => {
    const hm = build(id), slab = hm.parts.foundation, b = hm.lot.bbox; expect(slab).toBeTruthy(); expect(slab.name).toBe('foundation');
    const box = new THREE.Box3().setFromObject(slab); near(box.min.x, b.x0 - WALL_T, 1e-6); near(box.max.x, b.x1 + WALL_T, 1e-6); near(box.min.z, b.z0 - WALL_T, 1e-6); near(box.max.z, b.z1 + WALL_T, 1e-6);
    expect(box.max.y).toBeLessThan(0); expect(slab.material.polygonOffset && slab.material.polygonOffsetFactor > 0, 'loses ties against the floors').toBe(true);
    for (const f of hm.parts.floors) expect(f.position.y).toBeGreaterThan(box.max.y);
  });
  it('the Studio has none (its mesh count is pinned to the hand-built apartment)', () => { expect(build('studio').parts.foundation).toBeUndefined(); });
});

/* ------------------------------------------------------------------------------------------------ room labels */
describe('room name decals', () => {
  it('labelSpot picks the free spot nearest the middle and never overlaps an obstacle', () => {
    const room = { place: { x0: 0, z0: 0, x1: 6, z1: 4 } }, w = 1.6;
    expect(labelSpot(room, w, [])).toEqual({ x: 3, z: 2 });
    const blocked = labelSpot(room, w, [{ x0: 2, x1: 4, z0: 1, z1: 3 }]);   // a table in the middle
    expect(Math.abs(blocked.x - 3) > 0.9 || Math.abs(blocked.z - 2) > 0.6).toBe(true);
    const clear = (s, o) => s.x + 0.8 <= o.x0 || s.x - 0.8 >= o.x1 || s.z + 0.23 <= o.z0 || s.z - 0.23 >= o.z1; expect(clear(blocked, { x0: 2, x1: 4, z0: 1, z1: 3 })).toBe(true);
    const full = labelSpot(room, w, [{ x0: -1, x1: 7, z0: -1, z1: 5 }]); expect(full).toEqual({ x: 3, z: 2 });   // nowhere free: the middle
  });

  for (const id of ['onebed', 'bungalow']) describe(id, () => {
    const hm = build(id), labels = hm.parts.labels;
    it('has one flat plate per room, named after it, on the floor inside the room', () => {
      expect(labels).toBeTruthy(); const metas = labels.userData.labels; expect(metas.map((l) => l.room)).toEqual(HOMES[id].rooms.map((r) => r.id));
      for (const { room, mesh } of metas) {
        const r = hm.lot.rooms.find((q) => q.id === room), w = mesh.geometry.parameters.width, d = mesh.geometry.parameters.height;
        expect(mesh.position.y, 'above the thickest rug (the shag rug is 5 cm)').toBeGreaterThan(0.055); expect(mesh.position.y).toBeLessThan(0.1);
        expect(mesh.position.x - w / 2).toBeGreaterThanOrEqual(r.place.x0 - 1e-6); expect(mesh.position.x + w / 2).toBeLessThanOrEqual(r.place.x1 + 1e-6);
        expect(mesh.position.z - d / 2).toBeGreaterThanOrEqual(r.place.z0 - 1e-6); expect(mesh.position.z + d / 2).toBeLessThanOrEqual(r.place.z1 + 1e-6);
        expect(w).toBeGreaterThan(0.8); expect(w).toBeLessThan(3); expect(mesh.material.map).toBeTruthy(); expect(mesh.material.depthWrite).toBe(false);
      }
    });
    it('the plates face up with the text running east-west and its top to the north', () => {
      for (const { mesh } of labels.userData.labels) {
        const g = mesh.geometry, pos = g.attributes.position, uv = g.attributes.uv, nor = g.attributes.normal;
        for (let i = 0; i < pos.count; i++) {
          near(nor.getY(i), 1, 1e-9); near(pos.getY(i), 0, 1e-9);
          expect(uv.getY(i) === 1 ? pos.getZ(i) < 0 : pos.getZ(i) > 0, 'the top of the texture is north (-z)').toBe(true);
          expect(uv.getX(i) === 0 ? pos.getX(i) < 0 : pos.getX(i) > 0, 'the text reads west to east (+x)').toBe(true);
        }
      }
    });
    it('never lie under a fixture', () => {
      for (const { room, mesh } of labels.userData.labels) {
        const w = mesh.geometry.parameters.width, d = mesh.geometry.parameters.height;
        for (const c of hm.lot.colliders) expect(mesh.position.x + w / 2 <= c.x0 || mesh.position.x - w / 2 >= c.x1 || mesh.position.z + d / 2 <= c.z0 || mesh.position.z - d / 2 >= c.z1, `${room} label under ${c.n}`).toBe(true);
      }
    });
    it('show in every overhead mode and hide when walking', () => {
      expect(labels.visible).toBe(false); hm.setOverhead(true); expect(labels.visible).toBe(true);
      for (const m of ['up', 'cut', 'down']) { hm.setWallMode(m); expect(labels.visible, m).toBe(true); }
      hm.setOverhead(false); expect(labels.visible).toBe(false);
    });
    it('are released with the interior', () => {
      const tex = labels.userData.labels.map((l) => l.mesh.material.map), geos = labels.userData.labels.map((l) => l.mesh.geometry), mats = labels.userData.labels.map((l) => l.mesh.material);
      let n = 0; for (const o of [...tex, ...geos, ...mats]) o.addEventListener('dispose', () => n++);
      hm.dispose(); expect(n).toBe(tex.length * 3);
    });
  });

  it('the Studio has no labels, so its overhead view stays exactly as it was', () => { const hm = build('studio'); expect(hm.parts.labels).toBeNull(); let n = 0; hm.group.traverse((o) => { if (o.name === 'room-labels') n++; }); expect(n).toBe(0); });
});
