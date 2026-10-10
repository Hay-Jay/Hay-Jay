/** Placed furniture helps at home (and only at home): sleep, needs drift, activities and skill XP — all bounded by the catalogue caps. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import * as G from '../src/core/game.js';
import { FURNITURE, HOME_CAPS, KIND_ACTIVITY } from '../src/data/furniture.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let store; beforeEach(() => { store = new Store(mem(), () => 1_700_000_000_000); });
/** Own and place `types` (positions are irrelevant to the bonus maths). */
const furnish = (types) => { const owned = {}; store.state.home.placed = types.map((type, i) => { owned[type] = (owned[type] || 0) + 1; return { id: `p${i}`, type, x: 0, z: 0, rot: 0 }; }); store.state.home.owned = owned; };
const needsAt = (n) => Object.assign(store.state.needs, { energy: 50, hunger: 60, hygiene: 60, fun: 40, mood: 50, ...n });

describe('home effects', () => {
  it('a better bed makes sleeping at home better, and never anywhere else', () => {
    furnish(['bed_king']); needsAt({}); const away = (() => { G.sleep(store); return { ...store.state.needs }; })();
    needsAt({}); G.sleep(store, { home: true }); const home = { ...store.state.needs };
    expect(home.mood).toBeGreaterThan(away.mood); expect(home.hunger).toBeGreaterThanOrEqual(away.hunger); expect(home.energy).toBe(100);
    const none = new Store(mem(), () => 1); none.state.needs.energy = 20; const m0 = none.state.needs.mood; G.sleep(none, { home: true }); expect(none.state.needs.mood - m0).toBe(8);   // no furniture, no bonus
  });
  it('comfort, fun and mood pieces slow the drift of needs only while you are home', () => {
    const run = (home, types) => { furnish(types); needsAt({ energy: 80, fun: 80, mood: 80 }); for (let i = 0; i < 600; i++) G.tickNeeds(store, 1, { home }); return { ...store.state.needs }; };
    const bare = run(true, []), cosy = run(true, ['sofa', 'tv_65', 'plant', 'lamp', 'bed_king']), out = run(false, ['sofa', 'tv_65', 'plant', 'lamp', 'bed_king']);
    expect(cosy.energy).toBeGreaterThan(bare.energy); expect(cosy.fun).toBeGreaterThan(bare.fun); expect(cosy.mood).toBeGreaterThanOrEqual(bare.mood);
    expect(out.energy).toBeCloseTo(bare.energy, 6); expect(out.fun).toBeCloseTo(bare.fun, 6);
  });
  it('bonuses can never beat the caps: even a mansion of gear only slows tiredness by the comfort cap', () => {
    furnish(Array(30).fill('sofa')); needsAt({ energy: 100 }); for (let i = 0; i < 100; i++) G.tickNeeds(store, 1, { home: true }); const lost = 100 - store.state.needs.energy;
    needsAt({ energy: 100 }); furnish([]); for (let i = 0; i < 100; i++) G.tickNeeds(store, 1, { home: true }); const lostBare = 100 - store.state.needs.energy;
    expect(lost).toBeGreaterThanOrEqual(lostBare * (1 - HOME_CAPS.comfort) - 1e-9);
  });
  it('training gear at home adds skill XP; the same activity away from home does not', () => {
    furnish(['treadmill']); needsAt({ energy: 90 });
    const xp = (home) => { store.state.skills = {}; needsAt({ energy: 90 }); expect(G.doActivity(store, 'treadmill', { home }).ok).toBe(true); return store.state.skills.fitness; };
    expect(xp(true)).toBeGreaterThan(xp(false));
  });
  it('the new home activities are real, bounded activities and every usable kind points at one', () => {
    for (const id of ['piano', 'paint', 'gaming']) expect(G.ACTIVITIES[id]).toMatchObject({ secs: expect.any(Number), needs: expect.any(Object) });
    for (const [kind, [act]] of Object.entries(KIND_ACTIVITY)) { expect(G.ACTIVITIES[act], kind).toBeTruthy(); expect(Object.values(FURNITURE).some((f) => f.kind === kind), kind).toBe(true); }
    needsAt({ energy: 5 }); expect(G.doActivity(store, 'piano', { home: true }).ok).toBe(false);   // too tired
    needsAt({ energy: 60, fun: 10 }); expect(G.doActivity(store, 'gaming', { home: true }).ok).toBe(true); expect(store.state.needs.fun).toBeGreaterThan(10);
  });
});
