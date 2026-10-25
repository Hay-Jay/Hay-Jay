/**
 * The Goodnight card's numbers (docs/AMAZING.md G9): what today was worth, read from the ledger's own history (so it can never disagree with the
 * bank), for the Regina day of `now`. Pure.
 */
import { dayKey } from './daily.js';

/** Regina midnight for the Regina day of `now` (Saskatchewan keeps CST, UTC-6, all year). */
export const reginaMidnight = (now) => Date.parse(dayKey(now) + 'T06:00:00Z');

export function dayTally(s, now) {
  const start = reginaMidnight(now), rows = (Array.isArray(s?.bank?.history) ? s.bank.history : []).filter((h) => h && Number.isFinite(h.t) && Number.isFinite(h.amount) && h.t >= start && h.t <= now);
  const earned = rows.filter((h) => h.type === 'credit').reduce((a, h) => a + h.amount, 0), spent = rows.filter((h) => h.type === 'debit').reduce((a, h) => a + h.amount, 0);
  const groups = new Map();
  for (const h of rows) if (h.type === 'credit') { const k = String(h.memo || 'Income').replace(/:.*$/, '').replace(/ · .*$/, '').slice(0, 40); groups.set(k, (groups.get(k) ?? 0) + h.amount); }
  const top = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([memo, amount]) => ({ memo, amount }));
  return { earned, spent, net: earned - spent, count: rows.length, top };
}
