import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { marketOpen, craftPrice, makeCraft, sellCraft, sanitizeCrafts, STALL_DAILY_CAP } from '../src/core/stall.js';
import { sanitize } from '../src/core/sanitize.js';
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store; const SAT = { weekday: 6, hour: 10 };
beforeEach(() => { t = Date.parse('2026-10-31T16:00:00Z'); store = new Store(mem(), () => t); });
describe('Farmers\' Market stall', () => {
  it('open Wednesdays and Saturdays, 9 to 1', () => { expect(marketOpen(SAT)).toBe(true); expect(marketOpen({ weekday: 3, hour: 12 })).toBe(true); expect(marketOpen({ weekday: 3, hour: 13 })).toBe(false); expect(marketOpen({ weekday: 1, hour: 10 })).toBe(false); });
  it('make, then sell for a skill-based price, at most four a day', () => {
    for (let i = 0; i < 6; i++) makeCraft(store, 'painting'); const b0 = store.state.bank.balance, p = craftPrice(store.state, 'painting');
    expect(sellCraft(store, 'painting', SAT, t)).toMatchObject({ ok: true, price: p, left: 5 }); expect(store.state.bank.balance).toBe(b0 + p);
    for (let i = 1; i < STALL_DAILY_CAP; i++) expect(sellCraft(store, 'painting', SAT, t).ok).toBe(true);
    expect(sellCraft(store, 'painting', SAT, t).error).toMatch(/Sold out/);
    t += 4 * 86400e3; expect(sellCraft(store, 'painting', { weekday: 3, hour: 10 }, t).ok).toBe(true);   // next market day: a fresh cap
  });
  it('nothing to sell, or market closed: refused, no money', () => { const b0 = store.state.bank.balance; expect(sellCraft(store, 'baked', SAT, t).ok).toBe(false); makeCraft(store, 'baked'); expect(sellCraft(store, 'baked', { weekday: 2, hour: 10 }, t).ok).toBe(false); expect(store.state.bank.balance).toBe(b0); });
  it('skill raises the price; holdings are capped and repaired', () => {
    const lo = craftPrice(store.state, 'baked'); store.state.skills.cooking = 2000; expect(craftPrice(store.state, 'baked')).toBeGreaterThan(lo);
    expect(sanitizeCrafts({ painting: 999, baked: -2, day: 'x', sold: 'lots' })).toEqual({ painting: 12, baked: 0, day: '', sold: 0 });
    expect(sanitize({ crafts: { painting: 3 } }).crafts.painting).toBe(3);
  });
  it('a painting sells for no more than about a shift\'s worth of minutes', () => { store.state.skills.charisma = 10000; expect(craftPrice(store.state, 'painting')).toBeLessThanOrEqual(4000); });
});
