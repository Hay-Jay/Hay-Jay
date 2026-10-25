/** The Pumpkin Walk (core/festivals.js): on the last three days of October, a 90-second hunt for nine pumpkins, paid once a day, a prize toque. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { PUMPKIN, PUMPKIN_AREA, PUMPKIN_PAY, pumpkinOn, pumpkinSoon, pumpkinSpots, startHunt, findPumpkin, endHunt, huntToday } from '../src/core/festivals.js';
import { CLOTHES } from '../src/data/catalog.js';
import { sanitize } from '../src/core/sanitize.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const at = (iso) => Date.parse(iso);
let t, store;
beforeEach(() => { t = at('2026-10-31T19:00:00Z'); store = new Store(mem(), () => t); });

describe('when', () => {
  it('runs 29 to 31 October, Regina dates, every year; announced up to 3 days ahead', () => {
    expect(pumpkinOn(at('2026-10-29T07:00:00Z'))).toBe(true); expect(pumpkinOn(at('2026-10-29T05:00:00Z'))).toBe(false);   // 23:00 on the 28th in Regina
    expect(pumpkinOn(at('2027-10-30T18:00:00Z'))).toBe(true); expect(pumpkinOn(at('2026-11-01T18:00:00Z'))).toBe(false);
    expect(pumpkinSoon(at('2026-10-26T18:00:00Z'))).toBe(3); expect(pumpkinSoon(at('2026-10-31T18:00:00Z'))).toBe(0); expect(pumpkinSoon(at('2026-10-20T18:00:00Z'))).toBeNull();
  });
  it('nine spots, seeded per year, all inside the park, spread out', () => {
    const a = pumpkinSpots(2026), b = pumpkinSpots(2026), c = pumpkinSpots(2027);
    expect(a).toEqual(b); expect(a).not.toEqual(c); expect(a.length).toBe(PUMPKIN.count);
    for (const p of a) { expect(p.x).toBeGreaterThan(PUMPKIN_AREA.x0); expect(p.x).toBeLessThan(PUMPKIN_AREA.x1); expect(p.z).toBeGreaterThan(PUMPKIN_AREA.z0); expect(p.z).toBeLessThan(PUMPKIN_AREA.z1); expect(Math.hypot(p.x - PUMPKIN_AREA.cx, p.z - PUMPKIN_AREA.cz)).toBeGreaterThan(10); }
    for (const p of a) for (const q of a) if (p !== q) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(8);
  });
});
describe('the hunt', () => {
  it('find all nine in time: P$15 and the Pumpkin toque, once a day', () => {
    expect(startHunt(store, t).ok).toBe(true); const b0 = store.state.bank.balance;
    for (const p of pumpkinSpots(2026)) { t += 5000; expect(findPumpkin(store, p.i, p, t).ok).toBe(true); }
    const r = endHunt(store, t); expect(r).toMatchObject({ ok: true, found: 9, pay: 1500, prize: 'toque_pumpkin' });
    expect(store.state.bank.balance).toBe(b0 + 1500); expect(store.state.wardrobe).toContain('toque_pumpkin'); expect(CLOTHES.toque_pumpkin.price).toBe(0);
    expect(startHunt(store, t).ok).toBe(false); expect(endHunt(store, t).ok).toBe(false);
  });
  it('the clock and the distance are checked; time up pays P$1 a pumpkin', () => {
    startHunt(store, t); const s = pumpkinSpots(2026);
    expect(findPumpkin(store, 0, { x: s[0].x + 9, z: s[0].z }, t + 1000).ok).toBe(false);
    expect(findPumpkin(store, 0, s[0], t + 1000).ok).toBe(true); expect(findPumpkin(store, 0, s[0], t + 2000).ok).toBe(false);
    expect(findPumpkin(store, 1, s[1], t + 2000).ok).toBe(true);
    expect(endHunt(store, t + 3000).ok).toBe(false);   // still running, not all found
    expect(findPumpkin(store, 2, s[2], t + PUMPKIN.secs * 1000 + 1).ok).toBe(false);
    expect(endHunt(store, t + PUMPKIN.secs * 1000 + 1)).toMatchObject({ ok: true, found: 2, pay: PUMPKIN_PAY(2), prize: null });
  });
  it('no hunt outside the festival; a new day allows a new hunt; corrupt state is ignored', () => {
    expect(startHunt(store, at('2026-10-20T18:00:00Z')).ok).toBe(false);
    startHunt(store, t); endHunt(store, t + PUMPKIN.secs * 1000 + 1); t = at('2026-10-30T19:00:00Z'); expect(huntToday(store.state, t)).toBeNull();
    store.state.festivals.pumpkinHunt = { day: 'x', found: 'lots' }; expect(huntToday(store.state, t)).toBeNull();
    expect(sanitize({ festivals: { pumpkinHunt: 5, hack: 1 } }).festivals).toEqual({});
  });
});
