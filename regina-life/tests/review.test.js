/** Regression tests for the milestone-3 adversarial review (each block names the finding it locks down). */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store, SAVE_KEY } from '../src/core/store.js';
import * as G from '../src/core/game.js';
import * as S from '../src/core/social.js';
import * as P from '../src/core/politics.js';
import * as H from '../src/core/home.js';
import { travel } from '../src/core/travel.js';
import { rollEvent, resolveEvent, issueEvent, PENDING_TTL_MS } from '../src/core/events.js';
import { CollisionGrid } from '../src/world/collision.js';
import { KEEPOUT, FIXTURES, KEY_POINTS } from '../src/data/furniture.js';
import { mulberry32 } from '../src/core/rng.js';

const mem = (init) => { const m = new Map(init ? [[SAVE_KEY, typeof init === 'string' ? init : JSON.stringify(init)]] : []); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store; beforeEach(() => { t = 1_700_000_000_000; store = new Store(mem(), () => t); });
const loadSave = (patch) => { const base = JSON.parse(JSON.stringify(new Store(mem(), () => t).state)); return new Store(mem({ ...base, ...patch }), () => t); };

describe('finding 1: events cannot be replayed or forged', () => {
  it('refuses events the game never issued', () => {
    const b0 = store.ledger.balance;
    for (let i = 0; i < 40; i++) expect(resolveEvent(store, 'snowbank', 0, t).ok).toBe(false);
    expect(store.ledger.balance).toBe(b0);
  });
  it('an issued event resolves exactly once', () => {
    issueEvent(store, 'snowbank', t); expect(resolveEvent(store, 'snowbank', 0, t).ok).toBe(true);
    expect(resolveEvent(store, 'snowbank', 0, t).ok).toBe(false);
  });
  it('wrong id, expired token and bad choices are refused without consuming the token', () => {
    issueEvent(store, 'snowbank', t);
    expect(resolveEvent(store, 'wind', 0, t).ok).toBe(false); expect(resolveEvent(store, 'snowbank', 1.5, t).ok).toBe(false); expect(resolveEvent(store, 'snowbank', 9, t).ok).toBe(false);
    expect(resolveEvent(store, 'snowbank', 0, t + PENDING_TTL_MS + 1).ok).toBe(false);
    issueEvent(store, 'snowbank', t); expect(resolveEvent(store, 'snowbank', 0, t + 1000).ok).toBe(true);
  });
  it('rollEvent and travel issue their own events; prototype keys are not events', () => {
    const ev = rollEvent(store, { where: 'street', temp: 10, night: 0.2, season: 'spring' }, () => 0, t); expect(store.state.pendingEvent.id).toBe(ev.id);
    expect(resolveEvent(store, ev.id, 0, t).ok).toBe(true);
    const r = travel(store, 'banff', 'flight', t, () => 0); expect(r.ok).toBe(true); expect(store.state.pendingEvent.id).toBe('trip_banff'); expect(resolveEvent(store, 'trip_banff', 2, t).ok).toBe(true);
    expect(issueEvent(store, 'constructor', t)).toBe(false); expect(resolveEvent(store, '__proto__', 0, t).ok).toBe(false);
  });
});

describe('finding 2: furniture can never seal the apartment', () => {
  const buy = (type) => { store.state.bank.balance = 1e8; H.buyFurniture(store, type); };
  it('fixture geometry is consistent: every fixture sits inside a keep-out, and every key point is reachable in an empty room', () => {
    for (const f of FIXTURES) expect(KEEPOUT.some((k) => k.x0 <= f.x0 + 1e-6 && k.z0 <= f.z0 + 1e-6 && k.x1 >= f.x1 - 1e-6 && k.z1 >= f.z1 - 1e-6), f.n).toBe(true);
    expect(H.BASELINE_KEYS.sort()).toEqual(KEY_POINTS.map((k) => k.n).sort());
  });
  it('rejects the exact placements that sealed the entrance', () => {
    buy('dresser'); buy('bookcase');
    expect(H.canPlace(store.state, 'dresser', 1.5, 4.25, 1)).toMatchObject({ ok: false, error: expect.stringMatching(/Blocks the way/) });
    expect(H.canPlace(store.state, 'bookcase', 1.75, 4.25, 1)).toMatchObject({ ok: false });
    expect(H.placeFurniture(store, 'dresser', 1.5, 4.25, 1).ok).toBe(false); expect(store.state.home.placed).toHaveLength(0);
  });
  it('still allows ordinary decorating, and keeps every fixture reachable', () => {
    buy('armchair'); buy('plant'); buy('bookcase');
    expect(H.placeFurniture(store, 'armchair', 0.5, 1.0, 0).ok).toBe(true); expect(H.placeFurniture(store, 'plant', -3.5, -0.4, 0).ok).toBe(true); expect(H.placeFurniture(store, 'bookcase', -0.7, -3.2, 0).ok).toBe(true);
    expect(H.accessibleKeys(store.state).sort()).toEqual(H.BASELINE_KEYS.sort());
  });
  it('a move may not seal the way either, and pieces already sealing are not blamed', () => {
    buy('dresser'); const p = H.placeFurniture(store, 'dresser', 0, 1, 0).item; expect(H.moveFurniture(store, p.id, 1.5, 4.25, 1).ok).toBe(false);
  });
  it('repairHome frees a legacy/tampered sealed apartment', () => {
    store.state.home.owned.dresser = 1; store.state.home.placed.push({ id: 'x1', type: 'dresser', x: 1.5, z: 4.25, rot: 1 });
    expect(H.accessibleKeys(store.state).length).toBeLessThan(H.BASELINE_KEYS.length);
    expect(H.repairHome(store)).toBeGreaterThan(0); expect(H.accessibleKeys(store.state).sort()).toEqual(H.BASELINE_KEYS.sort());
  });
});

describe('finding 3: corrupt and old saves load safely', () => {
  it('drops unknown furniture, absurd coordinates and non-array placed; keeps good items', () => {
    const st = loadSave({ home: { owned: { constructor: 3, armchair: 2, plant: -4, dresser: 1.5 }, wall: 'constructor', floor: 'lava', placed: [
      { id: 'a', type: 'armchair', x: 0.5, z: 1, rot: 0 }, { id: 'b', type: 'sofa_of_doom', x: 0, z: 0, rot: 0 }, { id: 'c', type: 'armchair', x: 1e300, z: 0, rot: 0 }, { id: 'a', type: 'armchair', x: 0, z: 0, rot: 0 }, { id: 'd', type: 'plant', x: 0, z: 0, rot: 9 }, { id: 'e', type: 'plant', x: NaN, z: 0, rot: 0 }] } });
    expect(st.state.home.placed.map((p) => p.id)).toEqual(['a']); expect(st.state.home.owned).toEqual({ armchair: 2 }); expect(st.state.home.wall).toBe('cream'); expect(st.state.home.floor).toBe('oak');
    expect(loadSave({ home: { placed: 'oak', owned: [] } }).state.home.placed).toEqual([]);
  });
  it('the collision grid refuses runaway boxes instead of freezing', () => {
    const g = new CollisionGrid(8), t0 = Date.now(); expect(g.add(0, 0, 1e300, 1, 1)).toBeNull(); expect(g.add(NaN, 0, 1, 1)).toBeNull(); expect(g.add(0, 0, 5e5, 5e5)).toBeNull(); expect(Date.now() - t0).toBeLessThan(200); expect(g.add(0, 0, 2, 2).x1).toBe(2);
  });
  it('old milestone-1/2 saves load with every new field defaulted', () => {
    const old = { v: 1, created: t, started: true, player: { name: 'Riley', look: {} }, bank: { balance: 123456, history: [] }, needs: { energy: 50, hunger: 50, mood: 50 }, inventory: { bread: 2 }, job: {} };
    const st = new Store(mem(old), () => t).state;
    expect(st.player.name).toBe('Riley'); expect(st.bank.balance).toBe(123456); expect(st.friends).toEqual({}); expect(st.home.placed).toEqual([]); expect(st.politics).toBeNull(); expect(st.skills.fitness).toBe(0); expect(st.needs.hygiene).toBe(82); expect(st.inventory).toEqual({ bread: 2 });
    expect(P.ensurePolitics(new Store(mem(old), () => t), t).term).toBe(1);
  });
  it('tampered friends, partner, politics, trips and balances are normalised', () => {
    const st = loadSave({ bank: { balance: -5e9, history: 'x' }, friends: { constructor: { level: 99 }, tobi: { level: 1e9, status: 'dating' }, kaya: 'oops' }, partner: 'kaya',
      politics: { term: 'x' }, trips: [{ dest: 'mars', mode: 'bus', t: 1 }, { dest: 'banff', mode: 'flight', t: 5 }], souvenirs: ['banff', 'banff', 'atlantis'], radio: { station: 'doom', volume: 99 }, needs: { energy: 1e9, hunger: -5, mood: 'x' }, ads: { x: { until: 1 }, 'victoria-east': { text: 'hi', until: 9e12, theme: 'nope' } } }).state;
    expect(st.bank.balance).toBe(0); expect(Array.isArray(st.bank.history)).toBe(true); expect(Object.keys(st.friends)).toEqual(['tobi']); expect(st.friends.tobi.level).toBe(100); expect(st.partner).toBeNull(); expect(st.friends.tobi.status).toBeNull();
    expect(st.politics).toBeNull(); expect(st.trips).toHaveLength(1); expect(st.souvenirs).toEqual(['banff']); expect(st.radio.volume).toBe(1); expect(st.needs.energy).toBe(100); expect(st.needs.hunger).toBe(0); expect(st.needs.mood).toBe(60); expect(Object.keys(st.ads)).toEqual(['victoria-east']); expect(st.ads['victoria-east'].theme).toBe('prairie');
    expect(() => { H.repairHome(new Store(mem(), () => t)); S.maybePing(loadSave({ friends: { tobi: { level: 3 } } }), () => 0, t + 1e6); }).not.toThrow();
  });
});

describe('finding 4: UI price/wage sources match what the rules charge', () => {
  it('wageFor equals the payout and priceFor equals the debit', () => {
    P.ensurePolitics(store, t); store.state.politics.mayor.policy = 'fair_wages';
    G.applyForJob(store, 'retail'); store.state.job.application.offerAt = 0; G.tickJobs(store); G.acceptOffer(store); G.startShift(store); for (let i = 0; i < 4; i++) G.completeTask(store);
    const lvl = G.currentLevel(store.state.job.active), shown = G.wageFor(store, lvl); const real = store.now; store.now = () => t + 600000; const bal = store.ledger.balance; const r = G.finishShift(store); store.now = real;
    expect(shown).toBe(10450); expect(r.pay).toBe(shown); expect(store.ledger.balance).toBe(bal + shown);
    store.state.politics.mayor.policy = 'cheap_groceries'; const price = G.priceFor(store, 'milk'), b1 = store.ledger.balance; G.buyItem(store, 'milk'); expect(b1 - store.ledger.balance).toBe(price);
  });
});

describe('finding 7: lookups never reach Object.prototype', () => {
  it('paint/flooring', () => { const b = store.ledger.balance; expect(H.setStyle(store, 'wall', 'constructor').ok).toBe(false); expect(H.setStyle(store, 'placed', 'oak').ok).toBe(false); expect(H.setStyle(store, 'wall', '__proto__').ok).toBe(false); expect(store.ledger.balance).toBe(b); expect(Array.isArray(store.state.home.placed)).toBe(true); });
  it('furniture', () => { for (const k of ['constructor', '__proto__', 'toString']) { expect(H.buyFurniture(store, k).ok).toBe(false); expect(H.placeFurniture(store, k, 0, 0, 0).ok).toBe(false); expect(H.canPlace(store.state, k, 0, 0, 0).ok).toBe(false); expect(H.sellFurniture(store, k).ok).toBe(false); } expect(store.state.home.placed).toEqual([]); });
  it('friends and hangouts', () => { S.addFriend(store, 'tobi', t); expect(S.hangout(store, 'tobi', 'constructor', t + 1e5).ok).toBe(false); expect(S.hangout(store, 'constructor', 'coffee', t).ok).toBe(false); expect(S.gift(store, 'tobi', 'constructor', t).ok).toBe(false); expect(S.askOut(store, 'constructor').ok).toBe(false); });
  it('activities and travel', () => { expect(G.doActivity(store, 'constructor').ok).toBe(false); expect(G.doActivity(store, '__proto__').ok).toBe(false); expect(travel(store, 'constructor', 'bus', t).ok).toBe(false); expect(travel(store, 'banff', 'constructor', t).ok).toBe(false); });
  it('residents are only reachable once befriended', () => {
    expect(G.sendMessage(store, 'tobi', 'hi', { reply: false })).toBe(false); expect(G.transferTo(store, 'tobi', 500).ok).toBe(false);
    S.addFriend(store, 'tobi', t); expect(G.sendMessage(store, 'tobi', 'hi', { reply: false })).toBe(true); expect(G.transferTo(store, 'tobi', 500).ok).toBe(true);
  });
});

describe('finding 8: campaigning is a real, rate-limited action', () => {
  it('needs a vote, costs energy, has a cooldown, and respects the cap', () => {
    P.ensurePolitics(store, t);
    expect(G.doActivity(store, 'canvass').ok).toBe(false); expect(P.canvass(store, t).ok).toBe(false);
    P.vote(store, P.slateFor(1)[0].id, t); const e0 = store.state.needs.energy;
    expect(P.canvass(store, t).ok).toBe(true); expect(store.state.needs.energy).toBeLessThan(e0); expect(store.state.politics.points).toBeCloseTo(0.6, 5);
    for (let i = 0; i < 10; i++) P.canvass(store, t + 1000 * i); expect(store.state.politics.points).toBeCloseTo(0.6, 5); // cooldown blocks the farm
    t += 31_000; expect(P.canvass(store, t).ok).toBe(true);
    store.state.needs.energy = 10; t += 31_000; expect(P.canvass(store, t).ok).toBe(false);
  });
  it('does not charge for a donation that would barely help', () => {
    P.ensurePolitics(store, t); P.vote(store, P.slateFor(1)[0].id, t); store.state.politics.points = 5.9; const b = store.ledger.balance;
    expect(P.donate(store, 5000, t).ok).toBe(false); expect(store.ledger.balance).toBe(b);
  });
});

describe('finding 15: one dating threshold everywhere', () => {
  it('Good friend == date-ready, and the message never shows N/N', () => {
    expect(S.relName(S.DATE_LEVEL)).toBe('Good friend'); expect(S.relName(S.DATE_LEVEL - 0.01)).toBe('Friend');
    S.addFriend(store, 'kaya', t); store.state.friends.kaya.level = 59.9; expect(S.askOut(store, 'kaya').error).toMatch(/\(59\/60\)/);
    store.state.friends.kaya.level = 60; expect(S.askOut(store, 'kaya').ok).toBe(true);
  });
});
