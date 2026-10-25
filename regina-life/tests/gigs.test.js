/** Odd Jobs (core/gigs.js + data/gigs.js): the board follows the real season and weather, every step is validated, pay is honest and paid once. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { gigBoard, gigConditions, startGig, gigStep, finishGig, abandonGig, buskPay, sanitizeGigs, currentStep, GIG_DAILY_CAP, GIG_MIN_STEP_MS } from '../src/core/gigs.js';
import { GIG_KINDS, GIG_DOORS } from '../src/data/gigs.js';
import { JOBS } from '../src/data/jobs.js';
import { sanitize } from '../src/core/sanitize.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const T0 = Date.parse('2026-10-25T18:00:00Z');   // a Sunday noon in Regina
let t, store;
beforeEach(() => { t = T0; store = new Store(mem(), () => t); });
const SNOW = { season: 'winter', temp: -12, kind: 'snow', hour: 12 }, FALL = { season: 'autumn', temp: 8, kind: 'clear', hour: 12 };
/** Walk every step of the active gig at a believable pace. */
const play = (c) => { let a = store.state.gigs.active; while (a && a.step < a.steps.length) { t += Math.max(GIG_MIN_STEP_MS, (a.steps[a.step].hold || 0) * 1000) + 10; const r = gigStep(store, a.steps[a.step].spot, t); expect(r.ok, r.error).toBe(true); a = store.state.gigs.active; } return finishGig(store, c, t); };

describe('the board', () => {
  it('snow brings shovelling to the top of the board; no snow, no shovelling', () => {
    const snowy = gigBoard(store.state, SNOW, t); expect(snowy[0].kind).toBe('shovel');
    expect(gigBoard(store.state, FALL, t).some((g) => g.kind === 'shovel')).toBe(false);
    expect(gigBoard(store.state, FALL, t)[0].kind).toBe('leaves');   // autumn: rake the elm leaves
    expect(gigConditions({ season: 'winter', temp: -3, kind: 'clear' }).snow).toBe(true);   // snow on the ground in a Regina winter
  });
  it('is deterministic per Regina day, at most four gigs, ids stable, pay in the kind\'s range', () => {
    const a = gigBoard(store.state, FALL, t), b = gigBoard(store.state, FALL, t + 3600e3);
    expect(a.map((g) => g.id)).toEqual(b.map((g) => g.id)); expect(a.length).toBeLessThanOrEqual(4);
    for (const g of a) { const k = GIG_KINDS.find((x) => x.id === g.kind); expect(g.pay).toBeGreaterThanOrEqual(k.pay[0] - 50); expect(g.pay).toBeLessThanOrEqual(k.pay[1] + 50); expect(g.steps.length).toBeGreaterThan(0); }
    expect(gigBoard(store.state, FALL, t + 86400e3).map((g) => g.id)).not.toEqual(a.map((g) => g.id));
  });
  it('no busking in the rain or in the middle of the night', () => {
    expect(gigBoard(store.state, { ...FALL, kind: 'rain' }, t).some((g) => g.kind === 'busk')).toBe(false);
    expect(gigBoard(store.state, { ...FALL, hour: 3 }, t).some((g) => g.kind === 'busk')).toBe(false);
  });
  it('every door is on the downtown grid sidewalk (7 m off an avenue, mid-block)', () => {
    for (const d of GIG_DOORS) { expect(Math.abs(((d.z % 110) + 110) % 110 - 0) === 7 || Math.abs(((d.z % 110) + 110) % 110 - 110) === 7).toBe(true); expect(((d.x % 110) + 110) % 110).toBe(55); expect(d.name).toMatch(/Ave$/); }
  });
});

describe('doing a gig', () => {
  it('start, walk every step, get paid once through the ledger', () => {
    const g = gigBoard(store.state, SNOW, t)[0], b0 = store.state.bank.balance;
    expect(startGig(store, g.id, SNOW, t).ok).toBe(true); expect(currentStep(store.state).label).toMatch(/Shovel/);
    const r = play(SNOW); expect(r.ok).toBe(true); expect(r.total).toBe(g.pay);
    expect(store.state.bank.balance).toBe(b0 + g.pay); expect(store.state.gigs.done).toContain(g.id); expect(store.state.stats.gigs).toBe(1);
    expect(startGig(store, g.id, SNOW, t).ok).toBe(false);   // once a day
    expect(gigBoard(store.state, SNOW, t)[0].done).toBe(true);
  });
  it('refuses a step from the wrong place or too fast, and an early finish', () => {
    const g = gigBoard(store.state, FALL, t).find((x) => x.kind === 'delivery') ?? gigBoard(store.state, FALL, t)[0]; startGig(store, g.id, FALL, t);
    const st = store.state.gigs.active.steps[0];
    t += 10_000; expect(gigStep(store, { x: st.spot.x + 50, z: st.spot.z }, t).ok).toBe(false);
    expect(gigStep(store, st.spot, t).ok).toBe(true); expect(gigStep(store, store.state.gigs.active.steps[1]?.spot ?? st.spot, t + 100).ok).toBe(false);
    expect(finishGig(store, FALL, t).ok).toBe(false);
  });
  it('one gig at a time, none during a shift, none when exhausted, at most five a day', () => {
    const board = gigBoard(store.state, FALL, t); startGig(store, board[0].id, FALL, t);
    expect(startGig(store, board[1].id, FALL, t).ok).toBe(false); abandonGig(store);
    store.state.job.shift = { id: Object.keys(JOBS)[0], startedAt: t, tasksDone: 0, tasksTotal: 4 }; expect(startGig(store, board[1].id, FALL, t).ok).toBe(false); store.state.job.shift = null;
    store.state.needs.energy = 5; expect(startGig(store, board[1].id, FALL, t).ok).toBe(false); store.state.needs.energy = 90;
    store.state.gigs.done = Array.from({ length: GIG_DAILY_CAP }, (_, i) => `x${i}`); expect(startGig(store, board[1].id, FALL, t).error).toMatch(/plenty/);
  });
  it('a new Regina day clears the done list; the active gig survives a reload', () => {
    const g = gigBoard(store.state, FALL, t)[0]; startGig(store, g.id, FALL, t); store.save();
    const again = new Store(store.storage, () => t); expect(again.state.gigs.active.id).toBe(g.id);
    abandonGig(store); store.state.gigs.done = ['old']; t += 86400e3; const g2 = gigBoard(store.state, FALL, t)[0]; expect(startGig(store, g2.id, FALL, t).ok).toBe(true); expect(store.state.gigs.done).toEqual([]);
  });
});

describe('pay is honest', () => {
  it('busking pays by Charisma, the hour and the weather, within P$5 to P$40', () => {
    expect(buskPay(0, 12, 15, 'clear')).toBeGreaterThan(buskPay(0, 21, 15, 'clear'));
    expect(buskPay(2000, 12, 15, 'clear')).toBeGreaterThan(buskPay(0, 12, 15, 'clear'));
    expect(buskPay(0, 12, -15, 'snow')).toBeLessThan(buskPay(0, 12, 15, 'clear'));
    for (const x of [0, 500, 10000]) for (const h of [8, 12, 17, 21]) for (const tt of [-19, 0, 35]) { const p = buskPay(x, h, tt, 'clear'); expect(p).toBeGreaterThanOrEqual(500); expect(p).toBeLessThanOrEqual(4000); }
  });
  it('no gig out-earns a shift per minute by more than 30% (ECONOMY pace: P$66 for about 3 minutes)', () => {
    const shiftPerMin = 6600 / 3;
    for (const k of GIG_KINDS) if (k.id !== 'busk') expect(k.pay[1] / k.mins, k.id).toBeLessThanOrEqual(shiftPerMin * 1.3);
    expect(4000 / GIG_KINDS.find((k) => k.id === 'busk').mins).toBeLessThanOrEqual(shiftPerMin * 1.3);
  });
});

describe('saves', () => {
  it('a corrupt gigs value is repaired, not trusted', () => {
    expect(sanitizeGigs({ active: { id: 'x', kind: 'nope', steps: [] }, done: [1, 'a', 'a'], day: 'tomorrow', total: -4 })).toEqual({ day: '', done: ['a'], active: null, total: 0, earned: 0 });
    const s = sanitize({ gigs: { active: { id: 'g', kind: 'busk', steps: [{ spot: { x: 1, z: 2 }, label: 'Play' }], step: 0, startedAt: 1, stepAt: 1, pay: 999999 } } });
    expect(s.gigs.active).toBeNull();   // a pay above P$100 is not a gig this game offers
  });
});
