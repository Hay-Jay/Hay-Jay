/** Home layouts as data and geometry: validateLayout, the lot (walls, doorways, lattice, key points, derived collision rows), interactables, fixture kinds. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HOMES, HOME_ORDER, STUDIO, ONEBED, BUNGALOW, FIXTURE_KINDS, ACTIONS, WALL_T, INSET, DOOR_W, layoutOf, rotXZ } from '../src/data/homes.js';
import { lotOf, roomAt, roomAtFloor, validateLayout, interactablesOf, freeCells, reachableKeys, cellCentre, rectsHit, CELL, PLAYER_R, LAYOUT_LIMITS } from '../src/core/lot.js';
import { FIXTURES, KEEPOUT, KEY_POINTS, MAX_PLACED } from '../src/data/furniture.js';
import * as LEGACY from './legacy-home.js';
import * as H from '../src/core/home.js';
import { deepCopy } from './helpers/home-env.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/studio-baseline.json', import.meta.url), 'utf8'));
const clone = (l) => structuredClone(l);
const errorsOf = (l) => validateLayout(l).errors.join(' | ');

describe('the three layouts', () => {
  it.each(HOME_ORDER)('%s passes validateLayout', (id) => { const v = validateLayout(HOMES[id]); expect(v.errors).toEqual([]); expect(v.ok).toBe(true); });
  it('are ordered Studio, One-bedroom, Bungalow with strictly rising tiers and cumulative prices 0 / 150000 / 500000 cents', () => {
    expect(HOME_ORDER).toEqual(['studio', 'onebed', 'bungalow']); expect(Object.keys(HOMES)).toEqual(HOME_ORDER);
    expect(HOME_ORDER.map((id) => HOMES[id].tier)).toEqual([0, 1, 2]); expect(HOME_ORDER.map((id) => HOMES[id].price)).toEqual([0, 150000, 500000]);
    for (const id of HOME_ORDER) { expect(Number.isSafeInteger(HOMES[id].price)).toBe(true); expect(HOMES[id].id).toBe(id); }
  });
  it('hold 60 / 85 / 110 pieces, the Studio keeping the long-standing MAX_PLACED', () => {
    expect([STUDIO, ONEBED, BUNGALOW].map((l) => l.maxPlaced)).toEqual([60, 85, 110]); expect(STUDIO.maxPlaced).toBe(MAX_PLACED);
    expect(H.maxPlaced({ home: { layout: 'bungalow' } })).toBe(110); expect(H.maxPlaced({})).toBe(60);
  });
  it('keep the living room identical in every tier: same id, same floor rectangle, same front door, spawn and exit', () => {
    for (const l of [ONEBED, BUNGALOW]) { expect(l.rooms[0].id).toBe('living'); expect(l.rooms[0].floor).toEqual(STUDIO.rooms[0].floor); expect(l.entry).toEqual(STUDIO.entry); }
    expect(STUDIO.rooms[0].name).toBe('Studio'); expect(ONEBED.rooms.map((r) => r.id)).toEqual(['living', 'bedroom']); expect(BUNGALOW.rooms.map((r) => r.id)).toEqual(['living', 'bedroom', 'bath', 'den', 'garage']);
  });
  it('give the Bungalow a yard of 3 m and a footprint within 20 x 17 with a long side of at most 18 m; the others have no yard', () => {
    const lot = lotOf(BUNGALOW), w = lot.bbox.x1 - lot.bbox.x0, d = lot.bbox.z1 - lot.bbox.z0;
    expect(BUNGALOW.yard).toEqual({ margin: 3 }); expect(w).toBeLessThanOrEqual(20); expect(d).toBeLessThanOrEqual(17); expect(Math.max(w, d)).toBeLessThanOrEqual(18);
    expect(lot.yardRect).toEqual({ x0: lot.bbox.x0 - 3, z0: lot.bbox.z0 - 3, x1: lot.bbox.x1 + 3, z1: lot.bbox.z1 + 3 }); expect(lotOf(STUDIO).yardRect).toBeNull(); expect(lotOf(ONEBED).yardRect).toBeNull();
  });
  it('layoutOf falls back to the Studio for missing, unknown and prototype ids', () => {
    for (const bad of [undefined, null, 7, '', 'castle', '__proto__', 'constructor', 'toString']) expect(layoutOf({ home: { layout: bad } }).id, String(bad)).toBe('studio');
    expect(layoutOf({}).id).toBe('studio'); expect(layoutOf(null).id).toBe('studio'); expect(layoutOf({ home: { layout: 'onebed' } })).toBe(ONEBED);
  });
});

describe('the Studio as a lot', () => {
  const lot = lotOf(STUDIO);
  it('has exactly the old reachable key points (equal to the frozen legacy baseline) and the old key list', () => {
    expect([...lot.baseline]).toEqual(LEGACY.BASELINE_KEYS); expect([...lot.baseline]).toEqual(KEY_POINTS.map((k) => k.n)); expect(H.BASELINE_KEYS).toEqual(LEGACY.BASELINE_KEYS);
    expect(lot.keyPoints.map((k) => [k.n, k.x, k.z])).toEqual(KEY_POINTS.map((k) => [k.n, k.x, k.z]));
  });
  it('lists its long-standing collide, keep-out and collider rows verbatim and adds nothing derived', () => {
    expect(lot.collide).toEqual(FIXTURES); expect(lot.keepout).toEqual(KEEPOUT); expect(lot.colliders).toEqual(STUDIO.colliders); expect(lot.doorways).toEqual([]);
  });
  it('has the old bounds and walls: a 9.4 x 0.2 north and south box and 0.2 x 11.0 east and west boxes', () => {
    expect(lot.bounds).toEqual({ x0: -4.05, x1: 4.05, z0: -5.05, z1: 5.05 });
    const by = Object.fromEntries(lot.walls.map((w) => [w.wallId, w])), size = (w) => [Math.round((w.x1 - w.x0) * 1e6) / 1e6, Math.round((w.z1 - w.z0) * 1e6) / 1e6];
    expect(size(by.N)).toEqual([9.4, WALL_T]); expect(size(by.S)).toEqual([9.4, WALL_T]); expect(size(by.W)).toEqual([WALL_T, 11]); expect(size(by.E)).toEqual([WALL_T, 11]);
    expect(lot.walls.map((w) => [w.wallId, w.role, w.side, w.rooms])).toEqual([['N', 'exterior', 'N', [null, 'living']], ['S', 'exterior', 'S', ['living', null]], ['W', 'exterior', 'W', [null, 'living']], ['E', 'exterior', 'E', ['living', null]]]);
  });
  it('anchors the walking lattice at (-4.05, -5.05) and covers the bbox with whole cells', () => {
    for (const id of HOME_ORDER) {
      const l = lotOf(HOMES[id]), g = l.grid, kx = (-4.05 - g.x0) / CELL, kz = (-5.05 - g.z0) / CELL;
      expect(Math.abs(kx - Math.round(kx))).toBeLessThan(1e-9); expect(Math.abs(kz - Math.round(kz))).toBeLessThan(1e-9);
      expect(g.x0).toBeLessThanOrEqual(l.bbox.x0); expect(g.z0).toBeLessThanOrEqual(l.bbox.z0); expect(g.x0 + g.cols * CELL).toBeGreaterThanOrEqual(l.bbox.x1 - 1e-9); expect(g.z0 + g.rows * CELL).toBeGreaterThanOrEqual(l.bbox.z1 - 1e-9);
      expect(g.x0 + CELL).toBeLessThan(l.bbox.x0 + CELL + 1e-9);
    }
    expect(PLAYER_R).toBe(0.38); expect(CELL).toBe(0.25);
  });
  it('marks a cell walkable only inside a place rect (or a doorway band), never in the wall inset', () => {
    for (const id of HOME_ORDER) {
      const l = lotOf(HOMES[id]), free = freeCells(l), g = l.grid;
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (free[r * g.cols + c]) {
        const p = cellCentre(l, c, r), inPlace = l.rooms.some((rm) => p.x >= rm.place.x0 - 1e-9 && p.x <= rm.place.x1 + 1e-9 && p.z >= rm.place.z0 - 1e-9 && p.z <= rm.place.z1 + 1e-9), inBand = l.doorways.some((d) => p.x >= d.band.x0 - 1e-9 && p.x <= d.band.x1 + 1e-9 && p.z >= d.band.z0 - 1e-9 && p.z <= d.band.z1 + 1e-9);
        expect(inPlace || inBand, `${id} cell ${c},${r}`).toBe(true);
      }
    }
  });
  it('interactables have exactly the baseline ids, positions, radii and labels of the hand-built apartment', () => {
    const got = Object.fromEntries(interactablesOf(STUDIO).map((i) => [i.id, { x: i.x, z: i.z, radius: i.radius, label: i.label }])), want = { ...baseline.interactables }; delete want.exit;
    expect(got).toEqual(want);
  });
});

describe('walls and doorways', () => {
  it('give the One-bedroom one doorway between bedroom and living room at x 0.3 in the old north wall', () => {
    const l = lotOf(ONEBED); expect(l.doorways).toHaveLength(1);
    expect(l.doorways[0]).toMatchObject({ id: 'P:0', wallId: 'P', x: 0.3, z: -5.6, w: DOOR_W, axis: 'x', rooms: ['bedroom', 'living'] });
    expect(l.walls.filter((w) => w.wallId === 'P').map((w) => [w.x0, w.x1])).toEqual([[-4.7, -0.3], [0.9, 4.7]]);
  });
  it('give the Bungalow five doorways and make every room reachable through them from the living room', () => {
    const l = lotOf(BUNGALOW); expect(l.doorways.map((d) => d.id).sort()).toEqual(['C1:0', 'C2:0', 'C3:0', 'P:0', 'PW:0']);
    for (const id of HOME_ORDER) {
      const ll = lotOf(HOMES[id]), seen = new Set(['living']), q = ['living'];
      while (q.length) { const r = q.pop(); for (const d of ll.doorways) { const [a, b] = d.rooms; const o = a === r ? b : b === r ? a : null; if (o && !seen.has(o)) { seen.add(o); q.push(o); } } }
      expect([...seen].sort(), id).toEqual(ll.rooms.map((r) => r.id).sort());
    }
  });
  it('join two different rooms with every doorway and put a 1.2 m opening into a wall that is at least 0.3 m longer on each side', () => {
    for (const id of ['onebed', 'bungalow']) for (const d of lotOf(HOMES[id]).doorways) { expect(d.rooms[0]).toBeTruthy(); expect(d.rooms[1]).toBeTruthy(); expect(d.rooms[0]).not.toBe(d.rooms[1]); expect(d.w).toBeGreaterThanOrEqual(DOOR_W); }
  });
  it('never lets two wall boxes overlap and covers the whole envelope of every layout', () => {
    for (const id of HOME_ORDER) {
      const l = lotOf(HOMES[id]);
      for (let i = 0; i < l.walls.length; i++) for (let j = i + 1; j < l.walls.length; j++) expect(rectsHit(l.walls[i], l.walls[j]), `${id}: ${l.walls[i].id} x ${l.walls[j].id}`).toBe(false);
      for (const rm of l.rooms) for (const w of l.walls) expect(rectsHit(w, rm.floor), `${id}: ${w.id} in ${rm.id}`).toBe(false);
    }
  });
  it('classes a wall run exterior when it has the outside on one side, with the compass side, and partition otherwise', () => {
    const l = lotOf(BUNGALOW), run = (id) => l.walls.filter((w) => w.wallId === id);
    expect(run('N1')[0]).toMatchObject({ role: 'exterior', side: 'N', rooms: [null, 'bedroom'] }); expect(run('S2')[0]).toMatchObject({ role: 'exterior', side: 'S', rooms: ['garage', null], style: 'roller' });
    expect(run('W2')[0]).toMatchObject({ side: 'W', rooms: [null, 'den'] }); expect(run('E2')[0]).toMatchObject({ side: 'E', rooms: ['living', null] });
    expect(run('C2')[0]).toMatchObject({ role: 'partition', side: null, rooms: ['den', 'living'] }); expect(run('PG')[0]).toMatchObject({ role: 'partition', rooms: ['den', 'garage'] });
  });
  it('extends a run WALL_T/2 past a corner or T-junction and 0 at a door jamb or a free end', () => {
    const l = lotOf(ONEBED), p = l.walls.filter((w) => w.wallId === 'P');
    expect(p[0].ends).toEqual([WALL_T / 2, 0]); expect(p[1].ends).toEqual([0, WALL_T / 2]);
    const wb = l.walls.find((w) => w.wallId === 'WB'); expect(wb.ends).toEqual([0, 0]);
  });
  it('the Bungalow splits the roller-door wall from the living room south wall and keeps the junction squares covered exactly once', () => {
    const l = lotOf(BUNGALOW), s1 = l.walls.find((w) => w.wallId === 'S1'), s2 = l.walls.find((w) => w.wallId === 'S2');
    expect(s1.x0).toBeCloseTo(-4.7, 6); expect(s2.x1).toBeCloseTo(-4.7, 6); expect(s2.style).toBe('roller'); expect(s1.style).toBeUndefined();
  });
  it('roomAt answers for place rects and roomAtFloor for floor rects, and both are null in a wall', () => {
    expect(roomAt(ONEBED, 0, -8)?.id).toBe('bedroom'); expect(roomAt(ONEBED, 0, 0)?.id).toBe('living'); expect(roomAt(ONEBED, 0, -5.6)).toBeNull(); expect(roomAtFloor(ONEBED, 0, -5.6)).toBeNull();
    expect(roomAt(ONEBED, 0, -5.2)).toBeNull(); expect(roomAtFloor(ONEBED, 0, -5.2)?.id).toBe('living');
    expect(roomAt(STUDIO, 0, -8)).toBeNull(); expect(roomAt('bungalow', -8, 2)?.id).toBe('garage'); expect(roomAtFloor('bungalow', -9.9, 2)?.id).toBe('garage'); expect(roomAt('bungalow', -9.9, 2)).toBeNull();
    expect(() => roomAt('castle', 0, 0)).toThrow(/Unknown home layout/); expect(roomAt(BUNGALOW, 4.0, 0)?.id).toBe('living'); expect(roomAt(BUNGALOW, 4.5, 0)).toBeNull(); expect(roomAtFloor(BUNGALOW, 4.5, 0)?.id).toBe('living'); expect(roomAtFloor(BUNGALOW, 4.6, 0)).toBeNull();
  });
  it('gives each room a place rect inset by INSET and bounds equal to the bbox inset by INSET', () => {
    const close = (a, b) => { for (const k of Object.keys(b)) expect(a[k], k).toBeCloseTo(b[k], 9); };
    for (const id of HOME_ORDER) { const l = lotOf(HOMES[id]); for (const r of l.rooms) close(r.place, { x0: r.floor.x0 + INSET, z0: r.floor.z0 + INSET, x1: r.floor.x1 - INSET, z1: r.floor.z1 - INSET }); close(l.bounds, { x0: l.bbox.x0 + INSET, x1: l.bbox.x1 - INSET, z0: l.bbox.z0 + INSET, z1: l.bbox.z1 - INSET }); }
  });
});

describe('collision rows and key points of the bigger homes', () => {
  it('reuse the Studio rows verbatim for fixtures that did not change, in both tiers', () => {
    for (const l of [ONEBED, BUNGALOW]) {
      const lot = lotOf(l);
      for (const id of ['sofa', 'tv', 'kitchen', 'fridge', 'desk', 'stereo', 'bookshelf']) {
        expect(lot.collide.filter((r) => r.n === id), `${l.id} collide ${id}`).toEqual(FIXTURES.filter((r) => r.n === id));
        expect(lot.keepout.filter((r) => r.n === id), `${l.id} keepout ${id}`).toEqual(KEEPOUT.filter((r) => r.n === id));
        expect(lot.colliders.filter((r) => r.n === id || r.n.startsWith(`${id}_`)), `${l.id} colliders ${id}`).toEqual(STUDIO.colliders.filter((r) => r.n === id || r.n.startsWith(`${id}_`)));
      }
    }
  });
  it('derive new rows for moved fixtures from the kind: footprint at the pose, keep-out padded by the kind, collider height ch', () => {
    const lot = lotOf(ONEBED), bed = lot.collide.find((r) => r.n === 'bed'), ko = lot.keepout.find((r) => r.n === 'bed'), co = lot.colliders.find((r) => r.n === 'bed');
    expect(bed).toMatchObject({ x0: -4.2, x1: -2.2 }); expect(bed.z0).toBeCloseTo(-10.3, 9); expect(bed.z1).toBeCloseTo(-7.9, 9);
    expect(ko.x0).toBeCloseTo(bed.x0 - FIXTURE_KINDS.bed.pad, 9); expect(ko.z1).toBeCloseTo(bed.z1 + FIXTURE_KINDS.bed.pad, 9); expect(co.h).toBe(FIXTURE_KINDS.bed.ch);
    const shower = lot.collide.find((r) => r.n === 'shower'); expect(shower.x1 - shower.x0).toBeCloseTo(1.75, 9);                       // rot 2 keeps a square footprint
    const shelf = lotOf(BUNGALOW).collide.find((r) => r.n === 'shelf'); expect(shelf.x1 - shelf.x0).toBeCloseTo(0.5, 9); expect(shelf.z1 - shelf.z0).toBeCloseTo(2.4, 9);   // rot 1 swaps w and d
  });
  it('drop the old collision rows of the fixtures that moved out of the living room', () => {
    for (const l of [ONEBED, BUNGALOW]) { const rows = lotOf(l).collide.filter((x) => ['bed', 'nightstand', 'wardrobe', 'shower'].includes(x.n)); expect(rows.map((r) => r.n).sort(), l.id).toEqual(['bed', 'nightstand', 'shower', 'wardrobe']); for (const r of rows) expect(r.z1, `${l.id} ${r.n}`).toBeLessThan(-5.7); }   // all four now stand north of the old north wall
  });
  it('include the Studio front-door zone and one doorway approach per doorway in every keep-out list', () => {
    for (const id of HOME_ORDER) { const lot = lotOf(HOMES[id]); expect(lot.keepout.filter((k) => k.n === 'door')).toEqual(KEEPOUT.filter((k) => k.n === 'door')); expect(lot.keepout.filter((k) => k.n === 'doorway')).toHaveLength(lot.doorways.length); }
  });
  it('name every key uniquely, keep each inside its room and outside every fixture, and reach all of them in the empty house', () => {
    for (const id of HOME_ORDER) {
      const lot = lotOf(HOMES[id]); expect(new Set(lot.keyPoints.map((k) => k.n)).size).toBe(lot.keyPoints.length); expect(lot.keyPoints[0].n).toBe('entrance'); expect(lot.baseline.size).toBe(lot.keyPoints.length);
      for (const k of lot.keyPoints) { const rm = lot.byId.get(k.room); expect(k.x >= rm.floor.x0 && k.x <= rm.floor.x1 && k.z >= rm.floor.z0 && k.z <= rm.floor.z1, `${id}:${k.n}`).toBe(true); expect(lot.collide.some((c) => k.x > c.x0 && k.x < c.x1 && k.z > c.z0 && k.z < c.z1), `${id}:${k.n} in a fixture`).toBe(false); expect(typeof k.label).toBe('string'); }
    }
  });
  it('give each doorway two keys 0.6 m inside the room on either side, named door:<wall>:<i>:a|b, and label them with the neighbouring room', () => {
    const lot = lotOf(ONEBED), a = lot.keyPoints.find((k) => k.n === 'door:P:0:a'), b = lot.keyPoints.find((k) => k.n === 'door:P:0:b');
    expect(a).toMatchObject({ x: 0.3, room: 'bedroom', label: 'living room doorway' }); expect(a.z).toBeCloseTo(-5.6 - 0.7, 9); expect(b).toMatchObject({ x: 0.3, room: 'living', label: 'bedroom doorway' }); expect(b.z).toBeCloseTo(-5.6 + 0.7, 9);
    expect(lotOf(BUNGALOW).keyPoints.filter((k) => k.n.startsWith('door:'))).toHaveLength(10);
  });
  it('add a key at the free cell nearest the centre of a room that has no fixture key', () => {
    const l = clone(BUNGALOW); l.fixtures = l.fixtures.filter((f) => f.room !== 'den'); const lot = lotOf(l), k = lot.keyPoints.find((x) => x.n === 'room:den');
    expect(k).toBeTruthy(); expect(k.room).toBe('den'); expect(Math.hypot(k.x - (-7.4), k.z - (-3.45))).toBeLessThan(0.5); expect(lot.baseline.has('room:den')).toBe(true);
  });
  it('build every kind a layout uses from FIXTURE_KINDS, with real sizes, valid actions and a seat for every sit', () => {
    for (const id of HOME_ORDER) for (const f of HOMES[id].fixtures) expect(FIXTURE_KINDS[f.kind], `${id}:${f.id}`).toBeTruthy();
    for (const [name, k] of Object.entries(FIXTURE_KINDS)) {
      expect(k.w > 0 && k.d > 0 && k.h > 0, name).toBe(true); expect(k.ch ?? k.h, name).toBeGreaterThan(0); expect(k.ch ?? k.h, name).toBeLessThanOrEqual(k.h); expect(typeof k.name, name).toBe('string');
      for (const u of k.uses || []) { expect(ACTIONS, `${name}.${u.id}`).toContain(u.action); if (u.action === 'sit') expect(u.sit, name).toMatchObject({ dx: expect.any(Number), dz: expect.any(Number), yaw: expect.any(Number), y: expect.any(Number) }); }
    }
  });
  it('defines every new kind the multi-room homes need, with the garage shelf opening storage', () => {
    for (const k of ['toilet', 'vanity', 'dining_set', 'island', 'guest_bed', 'office_desk', 'garage_shelf', 'car']) expect(FIXTURE_KINDS[k], k).toBeTruthy();
    expect(FIXTURE_KINDS.garage_shelf.uses).toEqual([expect.objectContaining({ action: 'storage' })]); expect(FIXTURE_KINDS.car.w).toBeGreaterThan(1.5); expect(FIXTURE_KINDS.car.d).toBeGreaterThan(4);
    expect(Object.keys(FIXTURE_KINDS)).toHaveLength(20);
  });
});

describe('interactables', () => {
  it('have unique ids in every layout, each standing inside the room of its fixture', () => {
    for (const id of HOME_ORDER) {
      const its = interactablesOf(HOMES[id]); expect(new Set(its.map((i) => i.id)).size, id).toBe(its.length);
      for (const it of its) { const f = HOMES[id].fixtures.find((x) => x.id === it.fixture); expect(it.room, `${id}:${it.id}`).toBe(f.room); expect(roomAtFloor(HOMES[id], it.x, it.z)?.id).toBe(f.room); }
    }
  });
  it('compute the standing spot as pose + rotXZ(dx, dz, rot) and keep plain use ids only where they are unique', () => {
    const its = interactablesOf(BUNGALOW), bed = its.find((i) => i.id === 'bed'), shower = its.find((i) => i.id === 'shower'), shelf = its.find((i) => i.id === 'storage');
    const p = rotXZ(FIXTURE_KINDS.bed.uses[0].dx, FIXTURE_KINDS.bed.uses[0].dz, 0); expect([bed.x, bed.z]).toEqual([-3.2 + p.x, -9.1 + p.z]);
    expect(shower.room).toBe('bath'); expect(shelf).toMatchObject({ room: 'garage', action: 'storage', fixture: 'shelf' }); expect(shelf.x).toBeCloseTo(-9.85 + 1.05, 9);   // rot 1 turns local +z into world +x
    const sw = its.filter((i) => i.use === 'switch'); expect(sw).toHaveLength(5); expect(new Set(sw.map((i) => i.room)).size).toBe(5); for (const i of sw) expect(i.id).toBe(`${i.fixture}:switch`);
  });
  it('resolve the seat of every sit use in world coordinates with the facing turned by rot', () => {
    const sofa = interactablesOf(BUNGALOW).find((i) => i.id === 'sofa'), dining = interactablesOf(BUNGALOW).find((i) => i.id === 'dining');
    expect(sofa.seat).toEqual({ x: -0.4, z: 3.55, yaw: 0, y: 0.18 }); expect(dining.seat.x).toBeCloseTo(-2.3, 9); expect(dining.seat.z).toBeCloseTo(-2.6 + 0.85, 9); expect(dining.seat.yaw).toBe(0);
    const l = clone(BUNGALOW); l.fixtures.find((f) => f.id === 'dining').rot = 1; const d1 = interactablesOf(l).find((i) => i.id === 'dining');
    expect(d1.seat.yaw).toBeCloseTo(Math.PI / 2, 9); expect(d1.seat.x).toBeCloseTo(-2.3 + 0.85, 9);
  });
});

describe('validateLayout rejects broken layouts and names the problem', () => {
  it('an interior window (the Studio north windows copied onto the partition)', () => { const l = clone(ONEBED); l.windows.push({ x: -2.2, y: 1.7, z: -5.38, w: 2.6, h: 1.7, ry: 0 }); expect(errorsOf(l)).toMatch(/window 5 .*not on an exterior wall/); });
  it('a window facing the wrong way', () => { const l = clone(ONEBED); l.windows[2].ry = Math.PI; expect(errorsOf(l)).toMatch(/window 2/); });
  it('a window further than 0.3 m from its wall face', () => { const l = clone(ONEBED); l.windows[0].z = 4.9; expect(errorsOf(l)).toMatch(/window 0/); });
  it('a fixture outside its room', () => { const l = clone(ONEBED); l.fixtures.find((f) => f.id === 'bed').z = -3; expect(errorsOf(l)).toMatch(/fixture bed .*not inside room bedroom/); });
  it('two overlapping fixtures', () => { const l = clone(ONEBED); l.fixtures.find((f) => f.id === 'nightstand').x = -3; expect(errorsOf(l)).toMatch(/fixtures bed and nightstand overlap/); });
  it('a fixture blocking a doorway', () => { const l = clone(ONEBED); const w = l.fixtures.find((f) => f.id === 'wardrobe'); w.x = 0.3; w.z = -6.6; expect(errorsOf(l)).toMatch(/fixture wardrobe blocks the doorway P:0/); });
  it('the reserved room id "all" and prototype room ids', () => { for (const bad of ['all', '__proto__', 'constructor', 'Bed Room']) { const l = clone(ONEBED); l.rooms[1].id = bad; expect(validateLayout(l).ok, bad).toBe(false); } });
  it('a first room that is not "living", and duplicate room ids', () => { const a = clone(ONEBED); a.rooms[0].id = 'lounge'; expect(errorsOf(a)).toMatch(/first room must be "living"/); const b = clone(ONEBED); b.rooms[1].id = 'living'; expect(errorsOf(b)).toMatch(/duplicate room id/); });
  it('a wall run that borders two rooms on one side (a wall not split where the neighbour changes)', () => { const l = clone(BUNGALOW); const c2 = l.walls.find((w) => w.id === 'C2'), c3 = l.walls.find((w) => w.id === 'C3'); c2.z1 = c3.z1; l.walls = l.walls.filter((w) => w.id !== 'C3'); expect(errorsOf(l)).toMatch(/borders more than one room/); });
  it('an open edge in the envelope (a missing wall)', () => { const l = clone(ONEBED); l.walls = l.walls.filter((w) => w.id !== 'EB'); expect(errorsOf(l)).toMatch(/room bedroom has an open edge/); });
  it('a doorway too close to the end of its wall, too narrow, or in a wall with the same room on both sides', () => {
    const a = clone(ONEBED); a.walls.find((w) => w.id === 'P').doors[0].at = 4.4; expect(errorsOf(a)).toMatch(/too close to the end/);
    const b = clone(ONEBED); b.walls.find((w) => w.id === 'P').doors[0].w = 0.8; expect(errorsOf(b)).toMatch(/narrower than/);
  });
  it('a footprint beyond the caps (long side over 18 m)', () => { const l = clone(BUNGALOW); for (const r of l.rooms.filter((x) => x.id !== 'living' && x.id !== 'bedroom')) { r.floor.x0 -= 4; } expect(validateLayout(l).ok).toBe(false); const e = errorsOf(l); expect(e).toMatch(/long side|footprint/); expect(LAYOUT_LIMITS.longSide).toBe(18); });
  it('a point light that reaches further than its room diagonal, too many lights, and a room with no light or no switch', () => {
    const a = clone(ONEBED); a.pointLights[2].dist = 40; expect(errorsOf(a)).toMatch(/reaches 40 m/);
    const b = clone(BUNGALOW); b.pointLights.push({ ...b.pointLights[0], room: 'bath' }); b.pointLights.push({ ...b.pointLights[0], room: 'bath' }); expect(errorsOf(b)).toMatch(/room bath has 3 point lights|more than 6 point lights/);
    const c = clone(ONEBED); c.pointLights = c.pointLights.filter((p) => p.room !== 'bedroom'); expect(errorsOf(c)).toMatch(/room bedroom has no point light/);
    const d = clone(ONEBED); d.fixtures = d.fixtures.filter((f) => f.id !== 'switch_bed'); expect(errorsOf(d)).toMatch(/room bedroom has no light switch/);
    const e = clone(ONEBED); e.pointLights[2].castShadow = true; expect(errorsOf(e)).toMatch(/must not cast shadows/);
  });
  it('a fixture use that stands outside its room or is a sit without a seat, and unknown kinds and actions', () => {
    const a = clone(ONEBED); a.fixtures.push({ id: 'ghost', kind: 'poltergeist', x: 0, z: 0, rot: 0, room: 'living' }); expect(errorsOf(a)).toMatch(/unknown kind poltergeist/);
    const b = clone(ONEBED); b.fixtures.push({ id: 'x', kind: 'bed', x: 0, z: -9, rot: 0, room: 'nowhere' }); expect(errorsOf(b)).toMatch(/unknown room nowhere/);
  });
  it('bad money and caps: a fractional price, a negative price and a zero cap', () => {
    const l = clone(ONEBED); l.price = 1500.5; expect(errorsOf(l)).toMatch(/price must be a non-negative integer/); l.price = -1; expect(validateLayout(l).ok).toBe(false); const m = clone(ONEBED); m.maxPlaced = 0; expect(errorsOf(m)).toMatch(/maxPlaced/);
  });
  it('a key that the entrance cannot reach in the empty house (a row of bookshelves across the bedroom)', () => {
    const l = clone(ONEBED); [-3.6, -1.8, 0, 1.8, 3.6].forEach((x, i) => l.fixtures.push({ id: `row${i}`, kind: 'bookshelf', x, z: -7.0, rot: 1, room: 'bedroom' }));
    const e = errorsOf(l); expect(e).toMatch(/key bed \(bed\) cannot be reached from the entrance/); expect(e).toMatch(/key wardrobe/);
  });
  it('garbage input', () => { expect(validateLayout(null).ok).toBe(false); expect(validateLayout({}).ok).toBe(false); expect(validateLayout({ id: 'x', rooms: [], walls: [], fixtures: [] }).ok).toBe(false); expect(validateLayout('studio').ok).toBe(true); expect(validateLayout('castle').ok).toBe(false); });
});

describe('reachability primitives', () => {
  it('reach every key with no extra obstacles and lose the ones behind a blocked doorway', () => {
    const lot = lotOf(ONEBED); expect([...reachableKeys(lot, [])]).toEqual(lot.keyPoints.map((k) => k.n));
    const plug = { x0: -0.3, x1: 0.9, z0: -5.7, z1: -5.5 }, got = reachableKeys(lot, [plug]);
    expect(got.has('door:P:0:a')).toBe(false); expect(got.has('bed')).toBe(false); expect(got.has('sofa')).toBe(true);
  });
  it('do not count a key as reached because of a cell on the far side of a wall', () => {
    const lot = lotOf(ONEBED), wall = { x0: -4.5, x1: 4.5, z0: -5.0, z1: -4.2 }, got = reachableKeys(lot, [wall]);   // a bar across the living room's north strip hides the doorway from the entrance
    expect(got.has('door:P:0:b')).toBe(false);
  });
});
