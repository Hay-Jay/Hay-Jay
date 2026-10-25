/** The Goodnight card's tally (core/goodnight.js) reads the ledger history for the Regina day only. */
import { describe, it, expect } from 'vitest';
import { dayTally, reginaMidnight } from '../src/core/goodnight.js';

const T = Date.parse('2026-10-25T23:00:00Z');   // 17:00 in Regina
const tx = (t, type, amount, memo) => ({ t, type, amount, memo });
describe('goodnight tally', () => {
  it('sums today\'s credits and debits and groups income by source', () => {
    const mid = reginaMidnight(T); expect(new Date(mid).toISOString()).toBe('2026-10-25T06:00:00.000Z');
    const s = { bank: { history: [tx(mid - 1, 'credit', 9999, 'Yesterday'), tx(mid + 10, 'credit', 6600, 'Payroll: Prairie Corner Market'), tx(mid + 20, 'credit', 6600, 'Payroll: Prairie Corner Market'), tx(mid + 30, 'credit', 1800, 'Odd job: Shovel a walk'), tx(mid + 40, 'debit', 499, 'Market: Chips'), tx(T + 1, 'credit', 5, 'Future')] } };
    const r = dayTally(s, T); expect(r.earned).toBe(15000); expect(r.spent).toBe(499); expect(r.net).toBe(14501); expect(r.count).toBe(4);
    expect(r.top[0]).toEqual({ memo: 'Payroll', amount: 13200 }); expect(r.top[1]).toEqual({ memo: 'Odd job', amount: 1800 });
  });
  it('an empty or broken save gives zeros', () => { expect(dayTally({}, T)).toEqual({ earned: 0, spent: 0, net: 0, count: 0, top: [] }); expect(dayTally({ bank: { history: [null, { t: 'x' }] } }, T).count).toBe(0); });
});
