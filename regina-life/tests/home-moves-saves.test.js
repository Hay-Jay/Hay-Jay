/**
 * Multi-room homes: the Studio against the frozen pre-multi-room rules (tests/legacy-home.js), saves, and moving house (placement rules over layouts are in home-rules.test.js).
 * docs/HOMES.md section 9 ("Rules (A)"): differential equivalence on the Studio, old saves load identically, caps per layout, sanitize is idempotent,
 * a move is all-or-nothing and costs exactly the price, nothing is ever deleted, per-room paint survives a move.
 */
import './helpers/canvas-stub.js';
import { describe, it, expect } from 'vitest';
import * as H from '../src/core/home.js';
import * as LEG from './legacy-home.js';
import { planMove, upgradeHome, tierOptions } from '../src/core/move.js';
import { sanitize } from '../src/core/sanitize.js';
import { lotOf } from '../src/core/lot.js';
import { HOMES, HOME_ORDER, STUDIO, BUNGALOW, ONEBED } from '../src/data/homes.js';
import { FURNITURE, MAX_PLACED, MAX_OWNED_EACH, ROOM } from '../src/data/furniture.js';
import { RATE_LIMIT } from '../src/core/ledger.js';
import { makeStore, loadSave, ownAll, rng, deepCopy, ALL_IDS } from './helpers/home-env.js';

const TYPES = ALL_IDS.filter((t) => FURNITURE[t]);
const stateOf = (placed, owned, layout = 'studio') => ({ souvenirs: [], home: { layout, owned: owned ?? Object.fromEntries(TYPES.map((t) => [t, 99])), placed: deepCopy(placed) } });
/** A random, mostly valid Studio fill built with the LEGACY rules (so both implementations start from the same, legacy-valid placed list). */
function legacyFill(seed, n) {
  const r = rng(seed), s = stateOf([]), store = { state: s, commit() {}, ledger: null };
  const placed = [];
  for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
    const type = TYPES[Math.floor(r() * TYPES.length)], x = Math.round((ROOM.x0 + r() * (ROOM.x1 - ROOM.x0)) * 4) / 4, z = Math.round((ROOM.z0 + r() * (ROOM.z1 - ROOM.z0)) * 4) / 4, rot = Math.floor(r() * 4);
    s.home.placed = placed;
    const c = LEG.canPlace(s, type, x, z, rot); if (c.ok) { placed.push({ id: `l${seed}_${i++}`, type, x: c.x, z: c.z, rot }); }
  }
  void store; return placed;
}

describe('the Studio behaves exactly as before (differential test against the frozen legacy rules)', () => {
  it('canPlace agrees on random placements: empty room and three seeded fills, on and off the grid, in and out of the room', () => {
    let compared = 0;
    for (const [seed, fill] of [[1, 0], [2, 8], [3, 14], [4, 22]]) {
      const placed = legacyFill(seed, fill), s = stateOf(placed), r = rng(1000 + seed);
      for (let i = 0; i < 1500; i++) {
        const type = TYPES[Math.floor(r() * TYPES.length)], x = (r() - 0.5) * 11, z = (r() - 0.5) * 13, rot = Math.floor(r() * 4), ignore = placed.length && r() < 0.2 ? placed[Math.floor(r() * placed.length)].id : null;
        expect(H.canPlace(s, type, x, z, rot, ignore), `${type} ${x.toFixed(2)},${z.toFixed(2)} r${rot} fill ${fill}`).toEqual(LEG.canPlace(s, type, x, z, rot, ignore)); compared++;
      }
    }
    expect(compared).toBe(6000);
  });
  it('agrees on junk input and on souvenir posters', () => {
    const s = stateOf([]), junk = [[NaN, 0], [0, Infinity], ['1', 2], [null, 0], [1e308, 0], [0, -1e308]];
    for (const [x, z] of junk) for (const t of ['armchair', 'poster_banff', 'nope', undefined, 7]) { const a = H.canPlace(s, t, x, z, 0), b = LEG.canPlace(s, t, x, z, 0); expect(a.ok, `${t} ${x} ${z}`).toBe(b.ok); }
    for (const rot of [-1, 4, 1.5, NaN, '2']) expect(H.canPlace(s, 'armchair', 0, 0, rot).ok).toBe(LEG.canPlace(s, 'armchair', 0, 0, rot).ok);
    s.souvenirs = ['banff']; for (const [x, z] of [[0, 0], [-4, -5], [3.2, 4.4]]) expect(H.canPlace(s, 'poster_banff', x, z, 0).ok).toBe(LEG.canPlace(s, 'poster_banff', x, z, 0).ok);
  });
  it('repairHome and accessibleKeys agree on tampered saves (random pieces dropped anywhere)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = rng(seed * 7), placed = []; for (let i = 0; i < 6 + Math.floor(r() * 18); i++) placed.push({ id: `t${i}`, type: TYPES[Math.floor(r() * TYPES.length)], x: Math.round((r() * 8 - 4) * 4) / 4, z: Math.round((r() * 10 - 5) * 4) / 4, rot: Math.floor(r() * 4) });
      const mk = () => ({ state: stateOf(placed), commit() {} }), a = mk(), b = mk();
      expect([...H.accessibleKeys(a.state)].sort()).toEqual([...LEG.accessibleKeys(b.state)].sort());
      expect(H.repairHome(a)).toBe(LEG.repairHome(b)); expect(a.state.home.placed.map((p) => p.id)).toEqual(b.state.home.placed.map((p) => p.id));
    }
  });
  it('the Studio baseline is the legacy baseline, and every layout key list starts at the entrance', () => {
    expect([...lotOf(STUDIO).baseline].sort()).toEqual([...LEG.BASELINE_KEYS].sort()); expect(H.BASELINE_KEYS.slice().sort()).toEqual(LEG.BASELINE_KEYS.slice().sort());
    for (const id of HOME_ORDER) expect(lotOf(HOMES[id]).keyPoints[0].n).toBe('entrance');
  });
});

describe('saves', () => {
  it('a save from before multi-room homes loads as a Studio with identical furniture, paint and balance', () => {
    const placed = legacyFill(9, 10), old = { bank: { balance: 123456 }, home: { owned: Object.fromEntries(TYPES.map((t) => [t, 3])), placed, wall: 'sage', floor: 'walnut' } };
    const k = loadSave(old); const h = k.state.home;
    expect(h.layout).toBe('studio'); expect(h.rooms).toEqual({}); expect(h.placed.map((p) => JSON.stringify(p))).toEqual(placed.map((p) => JSON.stringify(p))); expect(h.wall).toBe('sage'); expect(h.floor).toBe('walnut'); expect(k.state.bank.balance).toBe(123456);
    expect(h.walls).toContain('sage'); expect(h.floors).toContain('walnut');   // the grandfathering of the current paint into the owned lists
  });
  it('an unknown or hostile layout id means the Studio', () => {
    for (const bad of ['__proto__', 'constructor', 'toString', 'mansion', 7, null, {}]) expect(loadSave({ home: { layout: bad, owned: {}, placed: [] } }).state.home.layout, String(bad)).toBe('studio');
  });
  it('a paid-for move survives reload: layout, per-room paint and every piece, for each tier', () => {
    for (const id of HOME_ORDER) {
      const { store, tick } = makeStore({ layout: id }), lay = HOMES[id]; ownAll(store, 2);
      const placed = []; for (const t of ['rug_round', 'rug_long']) { const lot = lotOf(lay), room = lot.rooms[lot.rooms.length - 1], p = room.place; placed.push({ id: `${t}_a`, type: t, x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2, rot: 0 }); }
      store.state.home.placed = placed;
      if (lay.rooms.length > 1) { tick(); expect(H.setStyle(store, 'wall', 'sage', lay.rooms[1].id).ok).toBe(true); }
      const again = loadSave(deepCopy(store.state)); expect(again.state.home.layout).toBe(id); expect(again.state.home.placed.map((p) => p.type)).toEqual(placed.map((p) => p.type)); expect(again.state.home.rooms).toEqual(store.state.home.rooms);
      const once = sanitize(deepCopy(again.state)); expect(sanitize(deepCopy(once))).toEqual(once);   // idempotent
    }
  });
  it('the cap is per layout: a 100-piece Bungalow save keeps 100 and the same Studio save keeps 60', () => {
    const owned = { bath_mat: MAX_OWNED_EACH, yoga_mat: MAX_OWNED_EACH }, mk = (layout) => {
      const lot = lotOf(HOMES[layout]), room = lot.rooms[0], pl = room.place, placed = [];
      for (let i = 0; placed.length < 100; i++) placed.push({ id: `c${i}`, type: i % 2 ? 'yoga_mat' : 'bath_mat', x: pl.x0 + 0.45 + (i % 11) * 0.7, z: pl.z0 + 1.0 + Math.floor(i / 11) * 0.7, rot: 0 });   // an 11 x 10 grid of small non-solid pieces inside the living room
      return loadSave({ home: { layout, owned, placed } }).state.home.placed.length;
    };
    expect(MAX_PLACED).toBe(60); expect(STUDIO.maxPlaced).toBe(60); expect(mk('studio')).toBe(60); expect(mk('bungalow')).toBe(100); expect(BUNGALOW.maxPlaced).toBe(110);
  });
  it('drops pieces that straddle a doorway, sit inside a wall, or lie outside every room, and unknown or unowned room styles', () => {
    const lot = lotOf(ONEBED), d = lot.doorways[0], owned = { rug_round: 3, armchair: 2 };
    const placed = [{ id: 'ok', type: 'rug_round', x: 0, z: 0, rot: 0 }, { id: 'door', type: 'armchair', x: d.x, z: d.z, rot: 0 }, { id: 'out', type: 'rug_round', x: 30, z: 0, rot: 0 }, { id: 'wall', type: 'armchair', x: 0, z: -5.6, rot: 0 }];
    const h = loadSave({ home: { layout: 'onebed', owned, placed, rooms: { bedroom: { wall: 'forest' }, ghost: { wall: 'sage' }, living: { floor: 'nope' } } } }).state.home;
    expect(h.placed.map((p) => p.id)).toEqual(['ok']); expect(Object.keys(h.rooms)).not.toContain('ghost'); expect(h.rooms.living?.floor).toBeUndefined(); expect(h.rooms.bedroom?.wall).toBeUndefined();   // forest is known but not owned
  });
});

describe('moving house', () => {
  const funded = (layout = 'studio', balance = 5e8) => { const k = makeStore({ layout, balance }); ownAll(k.store, 2); return k; };
  const snapshot = (st) => JSON.stringify({ h: st.state.home, b: st.state.bank.balance });

  it('is refused, without touching anything, for unknown ids, hostile ids, the same tier and downgrades', () => {
    const { store } = funded('onebed'), before = snapshot(store);
    for (const bad of ['mansion', '__proto__', 'constructor', 'hasOwnProperty', '', null, undefined, 3, {}, 'onebed', 'studio']) { expect(upgradeHome(store, bad).ok, String(bad)).toBe(false); expect(planMove(store.state, bad).ok).toBe(false); }
    expect(snapshot(store)).toBe(before);
  });
  it('is refused when you cannot afford it, and again without touching anything', () => {
    const { store } = funded('studio', 149999), before = snapshot(store); const r = upgradeHome(store, 'onebed');
    expect(r.ok).toBe(false); expect(snapshot(store)).toBe(before);
    store.state.bank.balance = 150000; expect(upgradeHome(store, 'onebed').ok).toBe(true); expect(store.state.bank.balance).toBe(0);   // exact funds is enough
  });
  it('costs exactly the difference in home value: Studio -> Bungalow is 5,000 in one go or 1,500 + 3,500 in two', () => {
    const a = funded('studio'), b = funded('studio'); const a0 = a.store.state.bank.balance;
    expect(upgradeHome(a.store, 'bungalow').ok).toBe(true); expect(a0 - a.store.state.bank.balance).toBe(500000);
    const b0 = b.store.state.bank.balance; expect(upgradeHome(b.store, 'onebed').ok).toBe(true); b.tick(); expect(upgradeHome(b.store, 'bungalow').ok).toBe(true); expect(b0 - b.store.state.bank.balance).toBe(500000);
    expect(tierOptions(a.store.state).find((t) => t.id === 'bungalow')).toMatchObject({ current: true });
  });
  it('is all-or-nothing when the ledger refuses (rate limit) or a store listener throws', () => {
    const { store, tick } = funded('studio'); store.state.home.placed = [{ id: 'k1', type: 'rug_round', x: 0, z: 0, rot: 0 }];
    for (let i = 0; i < RATE_LIMIT.count + 5; i++) store.ledger.debit(1, 'noise', { category: 'purchase' });
    const before = snapshot(store), r = upgradeHome(store, 'onebed'); expect(r.ok).toBe(false); expect(snapshot(store)).toBe(before);
    tick(RATE_LIMIT.windowMs + 1000); store.listeners.add(() => { throw new Error('listener boom'); }); expect(() => upgradeHome(store, 'onebed')).not.toThrow();
    expect(store.state.home.layout).toBe('onebed');   // a throwing subscriber must not undo or half-apply the move
  });
  it('never deletes an owned item: what does not fit simply waits in storage, and the plan matches what happens', () => {
    const { store } = funded('studio'), lot = lotOf(STUDIO); store.state.bank.balance = 5e8;
    store.state.home.placed = [{ id: 'a', type: 'rug_round', x: 0, z: 1, rot: 0 }, { id: 'b', type: 'armchair', x: 1, z: 1, rot: 0 }, { id: 'c', type: 'plant', x: -3.5, z: -0.5, rot: 0 }];
    const owned = deepCopy(store.state.home.owned), plan = planMove(store.state, 'bungalow'), bal = store.state.bank.balance;
    expect(plan.ok).toBe(true); expect(plan.carried + plan.storedCount).toBe(3); expect(plan.price).toBe(500000); void lot;
    const r = upgradeHome(store, 'bungalow'); expect(r.ok).toBe(true); expect(r.carried).toBe(plan.carried); expect(store.state.home.placed).toHaveLength(plan.carried);
    expect(store.state.home.owned).toEqual(owned); expect(bal - store.state.bank.balance).toBe(500000);
    for (const p of store.state.home.placed) expect(H.validatePlacement(BUNGALOW, store.state.home.placed.filter((q) => q !== p), p.type, p.x, p.z, p.rot).ok).toBe(true);   // everything kept is valid where it stands
    expect(H.storageCount(store.state)).toBe(Object.values(owned).reduce((a, b) => a + b, 0) - plan.carried);
  });
  it('keeps the Studio paint: the whole house starts out in it, and a per-room choice survives the next move', () => {
    const { store, tick } = funded('studio'); expect(H.setStyle(store, 'wall', 'sage').ok).toBe(true); tick();
    expect(upgradeHome(store, 'onebed').ok).toBe(true); tick();
    expect(H.styleOf(store.state, 'living').wall).toBe('sage'); expect(H.styleOf(store.state, 'bedroom').wall).toBe('sage');
    expect(H.setStyle(store, 'floor', 'walnut', 'bedroom').ok).toBe(true); tick();
    expect(store.state.home.rooms.bedroom.floor).toBe('walnut'); expect(H.styleOf(store.state, 'living').floor).toBe(store.state.home.floor);
    expect(upgradeHome(store, 'bungalow').ok).toBe(true); expect(store.state.home.rooms.bedroom.floor).toBe('walnut'); expect(H.styleOf(store.state, 'bedroom').floor).toBe('walnut');
    expect(H.setStyle(store, 'floor', 'oak').ok).toBe(true); expect(store.state.home.rooms.bedroom?.floor).toBeUndefined();   // "All rooms" clears the overrides of that kind
  });
  it('paint is charged once per style for the whole house, not once per room', () => {
    const { store, tick } = funded('bungalow'), b0 = store.state.bank.balance;
    const r1 = H.setStyle(store, 'wall', 'forest', 'bedroom'); tick(); const r2 = H.setStyle(store, 'wall', 'forest', 'den'); tick(); const r3 = H.setStyle(store, 'wall', 'forest');
    expect(r1.ok && r2.ok && r3.ok).toBe(true); expect(r1.paid).toBeGreaterThan(0); expect(r2.paid ?? 0).toBe(0); expect(r3.paid ?? 0).toBe(0); expect(b0 - store.state.bank.balance).toBe(r1.paid);
    expect(H.setStyle(store, 'wall', 'forest', 'attic').ok).toBe(false); expect(H.setStyle(store, 'wall', 'forest', '__proto__').ok).toBe(false);
  });
  it('a single-room home never writes per-room overrides', () => {
    const { store } = funded('studio'); expect(H.setStyle(store, 'wall', 'sage', 'living').ok).toBe(true); expect(store.state.home.rooms).toEqual({}); expect(store.state.home.wall).toBe('sage');
  });
});
