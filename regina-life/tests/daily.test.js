import { describe, it, expect } from 'vitest';
import { Store } from '../src/core/store.js';
import { dailyStatus, claimDaily, dayKey, prevDayKey, REWARD_CENTS, validDaily } from '../src/core/daily.js';

const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => delete m[k] }; };
const T0 = Date.parse('2026-10-08T18:00:00Z'), DAY = 86400000;
const mk = () => new Store(mem(), () => T0);

describe('daily reward', () => {
  it('first claim pays day 1 and credits the ledger in cents', () => {
    const s = mk(), before = s.state.bank.balance, r = claimDaily(s, T0);
    expect(r).toMatchObject({ ok: true, day: 1, amount: REWARD_CENTS[0] }); expect(s.state.bank.balance).toBe(before + REWARD_CENTS[0]);
  });
  it('cannot be claimed twice on the same Regina day', () => {
    const s = mk(); claimDaily(s, T0); const bal = s.state.bank.balance;
    expect(claimDaily(s, T0 + 3600e3).ok).toBe(false); expect(s.state.bank.balance).toBe(bal);
  });
  it('consecutive days build the streak up to day 7, then wrap to day 1', () => {
    const s = mk(); const days = [];
    for (let i = 0; i < 9; i++) days.push(claimDaily(s, T0 + i * DAY).day);
    expect(days).toEqual([1, 2, 3, 4, 5, 6, 7, 1, 2]);
  });
  it('missing a day resets the streak', () => {
    const s = mk(); claimDaily(s, T0); claimDaily(s, T0 + DAY); expect(claimDaily(s, T0 + 4 * DAY).day).toBe(1);
  });
  it('status reports what is ready and never a negative or huge amount', () => {
    const s = mk(); expect(dailyStatus(s.state, T0)).toMatchObject({ ready: true, day: 1 });
    claimDaily(s, T0); expect(dailyStatus(s.state, T0)).toMatchObject({ ready: false, amount: 0 });
    expect(Math.max(...REWARD_CENTS)).toBeLessThanOrEqual(2500);
  });
  it('uses the Regina calendar day (CST has no daylight saving)', () => {
    expect(dayKey(Date.parse('2026-10-09T05:30:00Z'))).toBe('2026-10-08'); expect(dayKey(Date.parse('2026-10-09T06:30:00Z'))).toBe('2026-10-09');
    expect(prevDayKey('2026-03-01')).toBe('2026-02-28');
  });
  it('a corrupt save value is repaired, not trusted', () => {
    expect(validDaily({ last: 'tomorrow', streak: 99 })).toBe(false);
    const st = mk(); st.state.daily = { last: 'x', streak: -5 }; expect(dailyStatus(st.state, T0).day).toBe(1);
  });
});
