import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { setLodger, collectRent, LODGER_PAY, sanitizeLodger } from '../src/core/lodger.js';
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store; beforeEach(() => { t = Date.parse('2026-10-25T18:00:00Z'); store = new Store(mem(), () => t); });
describe('lodger', () => {
  it('only with a spare room; rent once per day played, never for days away', () => {
    expect(setLodger(store, true).ok).toBe(false); store.state.home.layout = 'bungalow'; expect(setLodger(store, true).ok).toBe(true);
    const b0 = store.state.bank.balance; expect(collectRent(store, t)).toBe(LODGER_PAY); expect(collectRent(store, t + 3600e3)).toBe(0);
    t += 10 * 86400e3; expect(collectRent(store, t)).toBe(LODGER_PAY); expect(store.state.bank.balance).toBe(b0 + 2 * LODGER_PAY);   // ten days away: one day's rent, not ten
  });
  it('no rent when the lodger is out or you moved to a smaller home', () => {
    store.state.home.layout = 'bungalow'; setLodger(store, false); expect(collectRent(store, t)).toBe(0);
    setLodger(store, true); store.state.home.layout = 'onebed'; expect(collectRent(store, t)).toBe(0);
    expect(sanitizeLodger({ on: 'yes', last: 'x' })).toEqual({ on: true, last: '' });
  });
});
