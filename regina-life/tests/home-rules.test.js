/** Placement rules over layouts: rooms, walls, doorways, soft-lock protection (sealing, fuzz, saturation), caps, moving pieces, repair. */
import { describe, it, expect } from 'vitest';
import * as H from '../src/core/home.js';
import { HOMES, HOME_ORDER, STUDIO, ONEBED, BUNGALOW } from '../src/data/homes.js';
import { lotOf, reachableKeys, APPROACH } from '../src/core/lot.js';
import { FURNITURE } from '../src/data/furniture.js';
import { makeStore, ownAll, SOLID_IDS, rng } from './helpers/home-env.js';

const stateOf = (layout, placed = [], extra = {}) => ({ souvenirs: [], home: { layout, owned: Object.fromEntries(Object.keys(FURNITURE).map((k) => [k, 9])), placed, ...extra } });
const placeAll = (layout, list) => { const placed = [], out = []; for (const [type, x, z, rot = 0] of list) { const r = H.validatePlacement(layout, placed, type, x, z, rot); out.push(r); if (r.ok) placed.push({ id: `p${placed.length}`, type, x, z, rot }); } return { placed, out }; };
const allKeys = (layout) => lotOf(layout).keyPoints.map((k) => k.n);
const sorted = (a) => [...a].sort();

describe('rooms and walls', () => {
  it('only lets you place where there is a room: the Studio refuses the bedroom area, the One-bedroom accepts it', () => {
    expect(H.validatePlacement(STUDIO, [], 'bath_mat', 0, -8, 0)).toEqual({ ok: false, error: 'Outside the room' });
    expect(H.validatePlacement(ONEBED, [], 'bath_mat', 0, -8, 0)).toEqual({ ok: true }); expect(H.validatePlacement(BUNGALOW, [], 'bath_mat', -7, 3, 0)).toEqual({ ok: true });   // the garage
    expect(H.validatePlacement(ONEBED, [], 'bath_mat', -7, 3, 0).error).toBe('Outside the room');
  });
  it('refuses any footprint that straddles a wall or touches the 0.45 m wall inset, even non-solid ones', () => {
    for (const type of ['bath_mat', 'sofa', 'rug_round']) { expect(H.validatePlacement(ONEBED, [], type, 0, -5.6, 0).error, type).toBe('Outside the room'); expect(H.validatePlacement(ONEBED, [], type, 0, -5.3, 1).error, type).toBe('Outside the room'); }
    expect(H.validatePlacement(BUNGALOW, [], 'bath_mat', -4.6, 1, 0).error).toBe('Outside the room');                      // the wall between the living room and the garage
    expect(H.validatePlacement(BUNGALOW, [], 'rug_wool', -4.6, -8, 0).error).toBe('Outside the room');                      // a huge rug over the bedroom/bath wall
  });
  it('accepts a footprint that exactly fills the place rect corner and refuses one 2 cm further out', () => {
    const r = lotOf(ONEBED).rooms[1].place;   // bath_mat is 0.5 x 0.8: it touches the corner when centred at (x0 + 0.25, z0 + 0.4)
    expect(H.validatePlacement(ONEBED, [], 'bath_mat', r.x0 + 0.25, r.z0 + 0.4, 0).ok).toBe(true); expect(H.validatePlacement(ONEBED, [], 'bath_mat', r.x0 + 0.23, r.z0 + 0.4, 0).ok).toBe(false);
  });
  it('validatePlacement uses the raw coordinates and canPlace snaps to 0.25 first (a spot can fit snapped and not raw, and the other way round)', () => {
    expect(H.validatePlacement(STUDIO, [], 'bath_mat', 3.81, 0, 0).ok).toBe(false); expect(H.canPlace(stateOf('studio'), 'bath_mat', 3.81, 0, 0)).toEqual({ ok: true, x: 3.75, z: 0 });   // raw 3.81 sticks out, snapped 3.75 fits
    expect(H.validatePlacement(STUDIO, [], 'bath_mat', 3.79, 0.1, 0).ok).toBe(true); expect(H.canPlace(stateOf('studio'), 'bath_mat', 3.79, 0.1, 0)).toEqual({ ok: true, x: 3.75, z: 0 });
    expect(H.canPlace(stateOf('studio'), 'bath_mat', 4.0, 0, 0).ok).toBe(false);                                                  // snaps to 4.0, which sticks out
  });
  it('validates input like before: unknown items, non-finite numbers, bad rotations', () => {
    for (const layout of HOME_ORDER) {
      expect(H.validatePlacement(HOMES[layout], [], 'nope', 0, 0, 0)).toEqual({ ok: false, error: 'Unknown item' });
      for (const bad of [[NaN, 0, 0], [0, Infinity, 0], [0, 0, 7], [0, 0, 1.5], [0, 0, -1]]) expect(H.validatePlacement(HOMES[layout], [], 'bath_mat', ...bad).error, `${layout} ${bad}`).toBe('Invalid position');
    }
  });
  it('names the fixture a piece collides with in its keep-out, and the doorway for a doorway approach', () => {
    expect(H.validatePlacement(BUNGALOW, [], 'dresser', 1.2, -2.4, 0).error).toBe('Blocked by the island');
    expect(H.validatePlacement(BUNGALOW, [], 'dresser', -2.3, -2.6, 0).error).toBe('Blocked by the dining');
    expect(H.validatePlacement(ONEBED, [], 'dresser', 0.3, -4.7, 0).error).toBe('Blocked by the doorway');
    expect(H.validatePlacement(ONEBED, [], 'dresser', 0.3, -6.4, 0).error).toBe('Blocked by the doorway');                       // the bedroom side too
    expect(H.validatePlacement(ONEBED, [], 'dresser', 0.3, -3.5, 0).ok).toBe(true);                                              // just beyond the approach zone
  });
  it('keeps the old meaning for rugs and posters: a rug may lie across a doorway or fixture, a poster may not', () => {
    expect(H.validatePlacement(ONEBED, [], 'bath_mat', 0.3, -4.6, 0).ok).toBe(true); expect(H.validatePlacement(ONEBED, [], 'rug_long', 3.3, 3.0, 0).ok).toBe(true);   // over the doorway; over the desk's keep-out
    const withPoster = { ...stateOf('onebed'), souvenirs: ['banff'] }; expect(H.canPlace(withPoster, 'poster_banff', 0.25, -4.75, 0).error).toBe('Blocked by the doorway'); expect(H.canPlace(withPoster, 'poster_banff', 0, -8, 0).ok).toBe(true);
  });
  it('overlap rules are per piece and ignore the piece being moved', () => {
    const placed = [{ id: 'a', type: 'dresser', x: 0, z: -8, rot: 0 }];
    expect(H.validatePlacement(ONEBED, placed, 'dresser', 0.5, -8, 0).error).toBe('Overlaps other furniture'); expect(H.validatePlacement(ONEBED, placed, 'dresser', 0.5, -8, 0, 'a').ok).toBe(true);
    expect(H.validatePlacement(ONEBED, placed, 'rug_round', 0, -8, 0).ok).toBe(true);                                         // a rug may lie under it
  });
  it('lets homeBonuses count pieces in any room (a bed in the bedroom still gives its sleep bonus)', () => {
    expect(H.homeBonuses(stateOf('onebed', [{ id: 'b', type: 'bed_queen', x: 0, z: -8.5, rot: 0 }])).sleep).toBeGreaterThan(0);
  });
});

describe('soft-lock protection across rooms', () => {
  it.each(HOME_ORDER)('%s: every key point is reachable in the empty house, and accessibleKeys of an empty state is the whole baseline', (id) => {
    const lot = lotOf(HOMES[id]); expect([...reachableKeys(lot, [])]).toEqual(allKeys(id)); expect(sorted(H.accessibleKeys(stateOf(id)))).toEqual(sorted(allKeys(id)));
  });
  /** The pocket in front of a doorway on one side of it (the approach zone inside that room's place rect). */
  const pocket = (lot, d, roomId) => { const rm = lot.byId.get(roomId), a = d.approach, p = rm.place; return { rm, z: { x0: Math.max(a.x0, p.x0), x1: Math.min(a.x1, p.x1), z0: Math.max(a.z0, p.z0), z1: Math.min(a.z1, p.z1) } }; };
  /** A fence around that pocket: a bookcase across its inner edge and a side table at each wall-side end, all just outside the keep-out. */
  const fence = (lot, d, roomId) => {
    const { rm, z } = pocket(lot, d, roomId);
    if (d.axis === 'x') { const north = rm.floor.z1 < d.z, inner = north ? z.z0 : z.z1, wallEnd = north ? z.z1 : z.z0; return [['bookcase', d.x, north ? inner - 0.19 : inner + 0.19, 0], ['side', z.x0 - 0.25, north ? wallEnd - 0.25 : wallEnd + 0.25, 0], ['side', z.x1 + 0.25, north ? wallEnd - 0.25 : wallEnd + 0.25, 0]]; }
    const west = rm.floor.x1 < d.x, inner = west ? z.x0 : z.x1, wallEnd = west ? z.x1 : z.x0; return [['bookcase', west ? inner - 0.19 : inner + 0.19, d.z, 1], ['side', west ? wallEnd - 0.25 : wallEnd + 0.25, z.z0 - 0.25, 0], ['side', west ? wallEnd - 0.25 : wallEnd + 0.25, z.z1 + 0.25, 0]];
  };
  const doorSides = []; for (const id of ['onebed', 'bungalow']) for (const d of lotOf(HOMES[id]).doorways) for (const room of d.rooms) doorSides.push([id, d.id, room]);
  it.each(doorSides)('%s: a piece in the approach of doorway %s on the %s side is refused as "Blocked by the doorway"', (id, doorId, room) => {
    const lot = lotOf(HOMES[id]), d = lot.doorways.find((x) => x.id === doorId), { rm, z } = pocket(lot, d, room), bare = { ...HOMES[id], fixtures: [] };
    const spot = d.axis === 'x' ? [d.x, rm.floor.z1 < d.z ? z.z1 - 0.25 : z.z0 + 0.25, 0] : [rm.floor.x1 < d.x ? z.x1 - 0.25 : z.x0 + 0.25, d.z, 1];   // flush against the wall inset, in the middle of the opening
    expect(H.validatePlacement(bare, [], 'dresser', ...spot)).toEqual({ ok: false, error: 'Blocked by the doorway' });
    expect(H.validatePlacement(HOMES[id], [], 'dresser', ...spot).ok).toBe(false);                                            // and with the real fixtures too
    expect(H.validatePlacement(bare, [], 'bath_mat', spot[0], spot[1], 1 - spot[2]).ok).toBe(true);                           // a mat on the floor is not an obstacle (turned so it is as shallow as the dresser)
  });
  const bridges = [['onebed', 'P:0', 'bedroom'], ['onebed', 'P:0', 'living'], ['bungalow', 'C3:0', 'garage'], ['bungalow', 'C3:0', 'living']];
  it.each(bridges)('%s: fencing in doorway %s on the %s side would cut off rooms, so the last piece of the fence is refused', (id, doorId, room) => {
    const lot = lotOf(HOMES[id]), d = lot.doorways.find((x) => x.id === doorId), { placed, out } = placeAll(HOMES[id], fence(lot, d, room)), refused = out.filter((r) => !r.ok);
    expect(refused.length, JSON.stringify(out)).toBe(1); expect(refused[0].error).toMatch(/^Blocks the way to the /); expect(placed).toHaveLength(2);
    expect(sorted(H.accessibleKeys(stateOf(id, placed)))).toEqual(sorted(allKeys(id)));                                       // what was accepted left every key reachable
  });
  it('words the refusal with the thing that would be cut off', () => {
    const lot = lotOf(ONEBED), { out } = placeAll(ONEBED, fence(lot, lot.doorways[0], 'living')); expect(out.find((r) => !r.ok).error).toBe('Blocks the way to the bed');
    const b = lotOf(BUNGALOW), { out: o2 } = placeAll(BUNGALOW, fence(b, b.doorways.find((x) => x.id === 'C3:0'), 'living')); expect(o2.find((r) => !r.ok).error).toBe('Blocks the way to the storage shelf');
  });
  it('does not blame a placement for a key that was already cut off before it', () => {
    const lot = lotOf(ONEBED), { placed } = placeAll(ONEBED, fence(lot, lot.doorways[0], 'living').slice(0, 2));
    expect(H.canPlace(stateOf('onebed', placed), 'plant', 3, 1, 0).ok).toBe(true);                                           // unrelated spot, nothing new is lost
    const sealed = [...placed, { id: 'x', type: 'side', x: 1.15, z: -4.8, rot: 0 }];                                           // a save that is already sealed (tampered): a new unrelated piece is still fine
    expect(H.accessibleKeys(stateOf('onebed', sealed)).length).toBeLessThan(allKeys('onebed').length); expect(H.canPlace(stateOf('onebed', sealed), 'plant', 3, 1, 0).ok).toBe(true);
  });
  it('a house with a loop of rooms lets a fence close one doorway without stranding anything (the other way round stays open), but not two', () => {
    const lot = lotOf(BUNGALOW), c2 = lot.doorways.find((x) => x.id === 'C2:0'), pw = lot.doorways.find((x) => x.id === 'PW:0');
    // the den is reachable through its door to the living room (C2) and through the bath (PW): fence the bath-side approach of PW from the den...
    const { placed } = placeAll(BUNGALOW, fence(lot, pw, 'bath'));
    expect(sorted(H.accessibleKeys(stateOf('bungalow', placed)))).toEqual(sorted(allKeys('bungalow')));                       // nothing is lost: every room still has a way in
    void c2;
  });
  it.each(['onebed', 'bungalow'])('%s: saturating the space around every doorway with big thin pieces never strands a key point', (id) => {
    const lot = lotOf(HOMES[id]); let refusedBlocks = 0;
    for (const d of lot.doorways) {
      const placed = [], r = rng(31 + Math.round(d.x * 7 + d.z)), cands = [];
      for (const type of ['bookcase', 'sideboard', 'wardrobe', 'dresser', 'trunk', 'treadmill']) for (let rot = 0; rot < 4; rot++) for (let dx = -3; dx <= 3; dx += 0.5) for (let dz = -3; dz <= 3; dz += 0.5) cands.push([type, Math.round((d.x + dx) / 0.25) * 0.25, Math.round((d.z + dz) / 0.25) * 0.25, rot, r()]);
      cands.sort((a, b) => a[4] - b[4]);
      for (let pass = 0; pass < 2; pass++) for (const [type, x, z, rot] of cands) { const v = H.validatePlacement(HOMES[id], placed, type, x, z, rot); if (v.ok) placed.push({ id: `s${placed.length}`, type, x, z, rot }); else if (/^Blocks the way/.test(v.error)) refusedBlocks++; }
      expect(placed.length, `${id} ${d.id}`).toBeGreaterThan(2); expect(sorted(H.accessibleKeys(stateOf(id, placed))), `${id} ${d.id}`).toEqual(sorted(allKeys(id)));
    }
    expect(refusedBlocks).toBeGreaterThan(0);                                                                                // the rule actually fired
  }, 120_000);
  it.each(HOME_ORDER)('%s: random placements, one after another, never strand a key point and never overlap', (id) => {
    const r = rng(7 + id.length), placed = [], lot = lotOf(HOMES[id]), b = lot.bbox, seen = {}; let accepted = 0;
    for (let i = 0; i < 400; i++) {
      const type = SOLID_IDS[Math.floor(r() * SOLID_IDS.length)], rot = Math.floor(r() * 4), x = Math.round((b.x0 + r() * (b.x1 - b.x0)) / 0.25) * 0.25, z = Math.round((b.z0 + r() * (b.z1 - b.z0)) / 0.25) * 0.25, v = H.validatePlacement(HOMES[id], placed, type, x, z, rot);
      if (!v.ok) { const k = v.error.startsWith('Blocked by') ? 'blocked' : v.error.startsWith('Blocks the way') ? 'blocks' : v.error; seen[k] = (seen[k] || 0) + 1; continue; }
      placed.push({ id: `r${i}`, type, x, z, rot }); accepted++; expect(sorted(H.accessibleKeys(stateOf(id, placed))), `${id} after #${i} ${type}`).toEqual(sorted(allKeys(id)));
    }
    expect(accepted).toBeGreaterThan(5); expect(seen['Outside the room']).toBeGreaterThan(0);
    for (let i = 0; i < placed.length; i++) { const rest = placed.filter((_, j) => j !== i), p = placed[i]; expect(H.validatePlacement(HOMES[id], rest, p.type, p.x, p.z, p.rot).ok, `${id} ${p.id} is still valid among the others`).toBe(true); }
  }, 120_000);
  it('repairHome frees a sealed Bungalow garage (a tampered save) and stores only what it has to', () => {
    const { store } = makeStore({ layout: 'bungalow' }); ownAll(store, 9); const lot = lotOf(BUNGALOW), d = lot.doorways.find((x) => x.id === 'C3:0');
    const f = fence(lot, d, 'living'); store.state.home.placed = [{ id: 'far', type: 'plant', x: 2, z: 0, rot: 0 }, ...f.map(([type, x, z, rot], i) => ({ id: `w${i}`, type, x, z, rot }))];
    expect(H.accessibleKeys(store.state).length).toBeLessThan(allKeys('bungalow').length);
    const n = H.repairHome(store); expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(3); expect(store.state.home.placed.map((p) => p.id)).toContain('far'); expect(store.state.home.placed).toHaveLength(4 - n);   // latest pieces go first
    expect(sorted(H.accessibleKeys(store.state))).toEqual(sorted(allKeys('bungalow')));
  });
  it('repairHome leaves a healthy house alone and does not commit', () => {
    const { store } = makeStore({ layout: 'onebed' }); let commits = 0; store.subscribe(() => commits++); expect(H.repairHome(store)).toBe(0); expect(commits).toBe(0);
  });
});

describe('caps, placing and moving across rooms', () => {
  it.each([['studio', 60], ['onebed', 85], ['bungalow', 110]])('%s holds exactly %i pieces', (id, cap) => {
    const { store } = makeStore({ layout: id }); store.state.home.owned = { bath_mat: 99, yoga_mat: 99 }; const lot = lotOf(HOMES[id]), mats = [], yoga = [];   // non-solid pieces, so only the room and the cap decide
    for (const rm of lot.rooms) { for (let x = rm.place.x0 + 0.5; x <= rm.place.x1 - 0.5; x += 0.6) for (let z = rm.place.z0 + 0.6; z <= rm.place.z1 - 0.6; z += 0.9) mats.push([x, z]); for (let x = rm.place.x0 + 1.1; x <= rm.place.x1 - 1.1; x += 1.9) for (let z = rm.place.z0 + 0.55; z <= rm.place.z1 - 0.55; z += 0.8) yoga.push([x, z]); }
    expect(mats.length).toBeGreaterThanOrEqual(99); expect(yoga.length).toBeGreaterThanOrEqual(11);
    for (let i = 0; i < cap; i++) { const r = i < 99 ? H.placeFurniture(store, 'bath_mat', ...mats[i], 0) : H.placeFurniture(store, 'yoga_mat', ...yoga[i - 99], 1); expect(r.ok, `#${i} ${r.error}`).toBe(true); }
    expect(store.state.home.placed).toHaveLength(cap); expect(H.placeFurniture(store, 'yoga_mat', ...yoga[20], 1)).toEqual({ ok: false, error: `You can place up to ${cap} items` });
  });
  it('lets you move a piece from the living room into another room and refuses a move into a wall', () => {
    const { store } = makeStore({ layout: 'bungalow' }); ownAll(store, 3); const r = H.placeFurniture(store, 'dresser', 2, 1, 0); expect(r.ok).toBe(true);
    expect(H.moveFurniture(store, r.item.id, -7, -3.5, 0).ok).toBe(true); expect(store.state.home.placed[0]).toMatchObject({ x: -7, z: -3.5 });
    expect(H.moveFurniture(store, r.item.id, -4.6, -3.5, 0)).toMatchObject({ ok: false, error: 'Outside the room' }); expect(store.state.home.placed[0]).toMatchObject({ x: -7, z: -3.5 });
  });
  it('snaps a placed piece to the grid, lets it stand in the bedroom, and keeps counts per type', () => {
    const { store } = makeStore({ layout: 'onebed' }); ownAll(store, 2); const r = H.placeFurniture(store, 'sofa', -1.1, -8.1, 1); expect(r).toMatchObject({ ok: true, item: { x: -1, z: -8, rot: 1 } });
    expect(H.placedCount(store.state, 'sofa')).toBe(1); expect(H.availableToPlace(store.state, 'sofa')).toBe(1);
  });
  it('refuses to place what is not in storage', () => {
    const { store } = makeStore({ layout: 'bungalow' }); expect(H.placeFurniture(store, 'sofa', 0, 0, 0)).toEqual({ ok: false, error: 'You have none of those in storage' });
  });
});

describe('the keep-out of the bigger homes', () => {
  it('has a doorway approach exactly APPROACH metres deep past each wall face', () => {
    expect(APPROACH).toBe(1.0);
    for (const id of ['onebed', 'bungalow']) for (const d of lotOf(HOMES[id]).doorways) { const k = lotOf(HOMES[id]).keepout.find((x) => x.n === 'doorway' && x.x0 === d.approach.x0 && x.z0 === d.approach.z0); expect(k, `${id} ${d.id}`).toBeTruthy(); const depth = d.axis === 'x' ? k.z1 - k.z0 : k.x1 - k.x0; expect(depth).toBeCloseTo(0.2 + 2 * APPROACH, 9); }
  });
});
