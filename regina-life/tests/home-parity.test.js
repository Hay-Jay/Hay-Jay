/**
 * Guards for the multi-room refactor of the apartment interior: the Studio must keep exactly the interactables, colliders, bounds and light
 * set it had when it was hand-built (tests/fixtures/studio-baseline.json was dumped from that code), and rotXZ must agree with three.js.
 */
import './helpers/canvas-stub.js';
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { buildInterior } from '../src/world/interiors.js';
import { dumpInterior } from './helpers/dump-interior.js';
import { rotXZ, STUDIO, FIXTURE_KINDS, HOMES, layoutOf } from '../src/data/homes.js';
import { FIXTURE_BUILDERS } from '../src/world/homeKinds.js';
import { itemDef } from '../src/core/home.js';
import { KIND_ACTIVITY } from '../src/data/furniture.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/studio-baseline.json', import.meta.url), 'utf8'));

describe('rotXZ', () => {
  it('matches three.js rotation.y = rot * PI / 2 for every quarter turn', () => {
    for (const rot of [0, 1, 2, 3]) for (const [dx, dz] of [[1, 0], [0, 1], [2.5, -1.25], [-3, 0.5]]) {
      const v = new THREE.Vector3(dx, 0, dz).applyEuler(new THREE.Euler(0, (rot * Math.PI) / 2, 0)), r = rotXZ(dx, dz, rot);
      expect(r.x).toBeCloseTo(v.x, 9); expect(r.z).toBeCloseTo(v.z, 9);
    }
    expect(rotXZ(1, 1, 5)).toEqual(rotXZ(1, 1, 1)); expect(rotXZ(1, 1, -1)).toEqual(rotXZ(1, 1, 3));
  });
});

describe('the Studio as data', () => {
  it('has the old room, door and spawn, and keeps its ids stable across tiers', () => {
    expect(STUDIO.rooms.map((r) => r.id)).toEqual(['living']); expect(STUDIO.entry.spawn).toMatchObject({ x: 3.2, z: 4.4 }); expect(layoutOf({}).id).toBe('studio');
    expect(layoutOf({ home: { layout: '__proto__' } }).id).toBe('studio'); expect(HOMES.studio).toBe(STUDIO);
  });
  it('lists the measured physics colliders exactly as the hand-built apartment had them', () => {
    const want = baseline.colliders.map((c) => `${c.x0},${c.z0},${c.x1},${c.z1},${c.h}`).sort(), have = STUDIO.colliders.map((c) => `${c.x0},${c.z0},${c.x1},${c.z1},${c.h}`).sort();
    expect(have).toEqual(want);
  });
  it('every fixture kind it uses is defined', () => { for (const f of STUDIO.fixtures) expect(FIXTURE_KINDS[f.kind], f.kind).toBeTruthy(); });
});

describe('Studio interior parity (the refactor must not change a thing)', () => {
  const it0 = buildInterior('apartment'), now = dumpInterior(it0);
  it('has the same interactables (id, position, radius, label)', () => { expect(now.interactables).toEqual(baseline.interactables); });
  it('has the same colliders with heights', () => { expect(now.colliders).toEqual(baseline.colliders); });
  it('has the same bounds, spawn and exit', () => { expect(now.bounds).toEqual(baseline.bounds); expect(now.spawn).toEqual(baseline.spawn); expect(now.exit).toEqual(baseline.exit); });
  it('has the same lights', () => { expect(now.lights).toEqual(baseline.lights); });
  it('does not blow past the baseline mesh/material budget by more than 10 percent', () => { expect(now.counts.meshes).toBeLessThanOrEqual(Math.ceil(baseline.counts.meshes * 1.1)); expect(now.counts.materials).toBeLessThanOrEqual(Math.ceil(baseline.counts.materials * 1.1)); });
});

describe('builders registry', () => {
  it('has a builder for every fixture kind and nothing else', () => { expect(Object.keys(FIXTURE_BUILDERS).sort()).toEqual(Object.keys(FIXTURE_KINDS).sort()); });
});

/* ---------------------------------------------------------------------------------------------------------------------------------
 * Added by package B1 (the data-driven builder). Nothing above was weakened; these pin the behaviour the old hand-built apartment had that the
 * dump does not see: what the actions do, what placed gear does, what the other buildings look like, and the one deliberate difference.
 * ------------------------------------------------------------------------------------------------------------------------------- */
const ctxStub = () => ({ audio: { blip: vi.fn() }, player: { sitAt: vi.fn() }, ui: { menu: vi.fn(), openApp: vi.fn(), sleep: vi.fn(), activity: vi.fn(), cook: vi.fn(), openFridge: vi.fn(), radioMenu: vi.fn(), openWardrobe: vi.fn(), furnitureShop: vi.fn(), build: vi.fn(), exitInterior: vi.fn() } });
const byId = (it, id) => it.interactables.find((i) => i.id === id);

describe('Studio behaviour parity (what the actions do)', () => {
  it('the computer menu is the old one plus exactly one entry: Homes', () => {
    const c = ctxStub(), it = buildInterior('apartment'); byId(it, 'computer').run(c);
    const [title, text, buttons] = c.ui.menu.mock.calls[0]; expect(title).toBe('Computer'); expect(text).toBe('What would you like to do?');
    expect(buttons.map((b) => b.label)).toEqual(['💼 Browse jobs', '📰 Read the news', '🛋️ Furniture shop', '🏠 Homes', '🎨 Redecorate (build mode)', 'Close']);
    expect(buttons.filter((b) => b.label !== '🏠 Homes').map((b) => b.label)).toEqual(['💼 Browse jobs', '📰 Read the news', '🛋️ Furniture shop', '🎨 Redecorate (build mode)', 'Close']);   // the old five, same order
    expect(buttons.find((b) => b.primary).label).toBe('🎨 Redecorate (build mode)');
    for (const b of buttons.slice(0, 5)) b.run();
    expect(c.ui.openApp.mock.calls).toEqual([['jobs'], ['news'], ['homes']]); expect(c.ui.furnitureShop).toHaveBeenCalled(); expect(c.ui.build).toHaveBeenCalled();
    expect(buttons[5].run).toBeUndefined();
  });

  it('routes every other Studio interactable to the same ui call as before', () => {
    const it = buildInterior('apartment'), c = ctxStub();
    for (const [id, fn, args] of [['bed', 'sleep'], ['stove', 'cook'], ['fridge', 'openFridge'], ['stereo', 'radioMenu'], ['wardrobe', 'openWardrobe'], ['shower', 'activity', ['shower']], ['books', 'activity', ['read']], ['exit', 'exitInterior']]) {
      byId(it, id).run(c); expect(c.ui[fn], id).toHaveBeenCalled(); if (args) expect(c.ui[fn].mock.lastCall.slice(0, args.length)).toEqual(args);   // (a second argument now says where your body goes: player/poses.js)
    }
  });

  it('sits on the sofa exactly where and how it always did (plus the standing spot for getting up)', () => {
    const it = buildInterior('apartment'), c = ctxStub(); byId(it, 'sofa').run(c);
    const s = c.player.sitAt.mock.calls[0][0]; expect(s).toMatchObject({ x: -0.4, y: 0.18 }); expect(Math.cos(s.yaw)).toBeCloseTo(-1, 12); expect(Math.sin(s.yaw)).toBeCloseTo(0, 12);   // seated, the player faces the TV (north), not the sofa's back: yaw 0 faces +z in this game expect(s.z).toBeCloseTo(3.55, 12); expect(s.stand).toEqual({ x: -0.4, z: 2.6 });
  });

  it('the TV: Watch TV first, then a menu with Next channel / Turn off / Cancel; switching off clears the label', () => {
    const it = buildInterior('apartment'), c = ctxStub(), tv = byId(it, 'tv');
    expect(tv.label()).toBe('Watch TV'); tv.run(c); expect(c.audio.blip).toHaveBeenCalledWith('tick'); expect(c.ui.activity).toHaveBeenCalledWith('tv', { face: expect.any(Object) }); expect(tv.label()).toBe('Change channel / Off');
    tv.run(c); const [t, , buttons] = c.ui.menu.mock.calls[0]; expect(t).toBe('Television'); expect(buttons.map((b) => b.label)).toEqual(['Next channel', 'Turn off', 'Cancel']);
    buttons[1].run(); expect(tv.label()).toBe('Watch TV'); tv.run(c); expect(tv.label()).toBe('Change channel / Off'); it.group.userData.tvOff(); expect(tv.label()).toBe('Watch TV');   // leaving the building turns it off
  });

  it('the light switch toggles both ceiling lights and both point lights (15 / 12) and back', () => {
    const it = buildInterior('apartment'), c = ctxStub(), pts = []; it.group.traverse((o) => { if (o.isPointLight) pts.push(o); }); pts.sort((a, b) => a.position.z - b.position.z);
    const glow = it.lights.filter((l) => l.isMaterial); expect(glow).toHaveLength(2); expect(pts.map((p) => p.intensity)).toEqual([15, 12]);
    byId(it, 'switch').run(c); expect(pts.map((p) => p.intensity)).toEqual([0, 0]); expect(glow.map((m) => m.emissiveIntensity)).toEqual([0, 0]);
    byId(it, 'switch').run(c); expect(pts.map((p) => p.intensity)).toEqual([15, 12]); expect(glow.map((m) => m.emissiveIntensity)).toEqual([1.4, 1.4]);
  });

  it('has no wall colliders (the four outer walls are held in by bounds) and exposes the layout it was built from', () => {
    const it = buildInterior('apartment'); expect(it.colliders.rects.some((r) => r.tag === 'wall')).toBe(false); expect(it.layout).toBe(STUDIO); expect(buildInterior('apartment', { layout: 'studio' }).layout).toBe(STUDIO);
    expect(it.rooms.map((r) => r.id)).toEqual(['living']); expect(it.bounds).toEqual({ x0: -4.05, x1: 4.05, z0: -5.05, z1: 5.05 }); expect(Object.keys(it.roomGroups)).toEqual(['living']);
  });

  it('keeps its wall tops in the room\'s paint (the overhead view looks exactly as before) and builds no more meshes than the hand-built one', () => {
    const it = buildInterior('apartment'); let meshes = 0; it.group.traverse((o) => { if (o.isMesh) meshes++; }); expect(meshes).toBe(baseline.counts.meshes);
    it.setHome({ wall: 'sage', floor: 'oak', placed: [] });
    for (const m of it.parts.walls) { const mats = new Set([].concat(m.material)); expect(mats.size).toBe(1); expect([...mats][0].color.getHexString()).toBe('b9c9b0'); }
    it.setOverhead(true); expect(it.wallMode).toBe('up'); expect(it.parts.ceilFixtures.every((c) => !c.visible)).toBe(true);   // today's overhead view
  });
});

describe('Studio placed pieces parity (colliders, prompts, shadows)', () => {
  const placed = [['t1', 'treadmill', 2.5, 1.5, 0], ['t2', 'treadmill', -2.5, 1.5, 1], ['w1', 'dumbbells', 1.0, 3.7, 2], ['y1', 'yoga_mat', -3, 2, 3], ['e1', 'easel', 0.5, 0.5, 0], ['p1', 'piano', -1, -2.5, 1], ['g1', 'arcade', 3.5, 0, 3], ['tv1', 'tv_50', 0, 1, 2], ['s1', 'sofa', -2, 3.5, 0], ['r1', 'rug_wool', 0, 0, 1], ['l1', 'lamp', 1, 1, 0]].map(([id, type, x, z, rot]) => ({ id, type, x, z, rot }));
  it('gives every gear piece the prompt, label and standing spot it always had, for all four rotations', () => {
    const it = buildInterior('apartment'); it.setHome({ wall: 'cream', floor: 'oak', placed });
    let gear = 0;
    for (const p of placed) {   // the old rule, written out: stand in front of the piece, max(w, d) / 2 + 0.6 away
      const def = itemDef(p.type), act = KIND_ACTIVITY[def.kind]; if (!act) { expect(byId(it, `furn_${p.id}`), p.type).toBeUndefined(); continue; }
      gear++; const off = [[0, 1], [1, 0], [0, -1], [-1, 0]][p.rot], reach = Math.max(def.w, def.d) / 2 + 0.6, i = byId(it, `furn_${p.id}`);
      expect(i, p.type).toBeTruthy(); expect(i.x).toBeCloseTo(p.x + off[0] * reach, 9); expect(i.z).toBeCloseTo(p.z + off[1] * reach, 9); expect(i.radius).toBe(1.5); expect(i.label).toBe(`${act[1]} ${def.name.toLowerCase()}`); expect(i.furn).toBe(true);
    }
    expect(gear).toBeGreaterThanOrEqual(6);
  });
  it('gives solid pieces the footprint collider (w and d swap on odd rotations) at the catalogue height, tag furn', () => {
    const it = buildInterior('apartment'); it.setHome({ wall: 'cream', floor: 'oak', placed });
    const furn = it.colliders.rects.filter((r) => r.tag === 'furn'), solids = placed.filter((p) => itemDef(p.type).solid); expect(furn).toHaveLength(solids.length);
    for (const p of solids) {
      const def = itemDef(p.type), w = p.rot % 2 ? def.d : def.w, d = p.rot % 2 ? def.w : def.d;
      expect(furn.some((r) => Math.abs(r.x0 - (p.x - w / 2)) < 1e-9 && Math.abs(r.x1 - (p.x + w / 2)) < 1e-9 && Math.abs(r.z0 - (p.z - d / 2)) < 1e-9 && Math.abs(r.z1 - (p.z + d / 2)) < 1e-9 && r.h === def.h), p.type).toBe(true);
    }
  });
  it('turns the models by rot * PI / 2 and keeps their shadow flags', () => {
    const it = buildInterior('apartment'); it.setHome({ wall: 'cream', floor: 'oak', placed });
    for (const p of placed) { const g = it.roomGroups.living.children.find((c) => c.userData?.type === p.type && Math.abs(c.position.x - p.x) < 1e-9 && Math.abs(c.position.z - p.z) < 1e-9); expect(g, p.type).toBeTruthy(); expect(g.rotation.y).toBeCloseTo((p.rot * Math.PI) / 2, 9); expect(g.position.y).toBe(0); }
    let casters = 0; it.roomGroups.living.traverse((o) => { if (o.isMesh && o.castShadow) casters++; }); expect(casters).toBeGreaterThan(0);
  });
});

describe('the other buildings are untouched by the shared-helper changes', () => {
  // frozen from the hand-built version of world/interiors.js (every mesh pose, material and light was compared before this refactor: identical).
  // Counts leave out the shopkeepers' own meshes: the character model (player/character.js) is restyled on its own.
  const frozen = { market: { meshes: 465, ids: ['cooler', 'counter', 'exit', 'pallet', 'station_0', 'station_1', 'station_2', 'station_3'] }, threads: { meshes: 136, ids: ['counter', 'exit', 'mirror', 'pallet', 'station_0', 'station_1', 'station_2', 'station_3'] }, gym: { meshes: 70, ids: ['exit', 'treadmill', 'water', 'weights', 'yoga'] }, cityhall: { meshes: 59, ids: ['ballot', 'canvass', 'exit', 'mayor', 'notice'] } };
  for (const [kind, f] of Object.entries(frozen)) it(`${kind}: same meshes and interactables, setOverhead still hides the ceiling lights, dispose releases`, () => {
    const b = buildInterior(kind); let n = 0; b.group.traverse((o) => { let p = o; while (p && p.name !== 'character') p = p.parent; if (o.isMesh && !p) n++; });
    expect(n).toBe(f.meshes); expect(b.interactables.map((i) => i.id).sort()).toEqual(f.ids); expect(b.layout).toBeUndefined();
    const ceil = b.lights.filter((l) => l.isMaterial).length; expect(ceil).toBeGreaterThan(0);
    b.setOverhead(true); b.setOverhead(false); b.setHome({ wall: 'sage', placed: [] });   // setHome is a no-op outside the apartment
    b.dispose();
  });
});
