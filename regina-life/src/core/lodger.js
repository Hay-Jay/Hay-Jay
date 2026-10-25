/**
 * A lodger in the Bungalow's den (docs/AMAZING.md section 5): steady rent for owners of a house with a spare room. Paid once per Regina day you
 * play (never for days away, never retroactively), only while the lodger is in. The lodger is a labelled NPC. Pure rules over a Store.
 */
import { dayKey } from './daily.js';

export const LODGER_PAY = 2500;   // P$25 a day played: about a third of an entry shift (ECONOMY)
export const LODGER_LAYOUTS = new Set(['bungalow']);
export const LODGER_NAME = 'Robin (NPC lodger)';
export function sanitizeLodger(l) { const ok = l && typeof l === 'object'; return { on: !!(ok && l.on), last: ok && typeof l.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.last) ? l.last : '' }; }
export const canHaveLodger = (s) => LODGER_LAYOUTS.has(typeof s?.home?.layout === 'string' ? s.home.layout : 'studio');
export function setLodger(store, on) {
  const s = store.state; if (on && !canHaveLodger(s)) return { ok: false, error: 'You need a home with a spare room (the Bungalow\'s den).' };
  s.lodger = { ...sanitizeLodger(s.lodger), on: !!on }; store.commit('lodger'); return { ok: true };
}
/** Collect today's rent if it is due. Returns the amount paid (0 if none). */
export function collectRent(store, now = store.now()) {
  const s = store.state, l = (s.lodger = sanitizeLodger(s.lodger)), d = dayKey(now);
  if (!l.on || !canHaveLodger(s) || l.last === d) return 0;
  const r = store.ledger.credit(LODGER_PAY, `Rent from ${LODGER_NAME}`, { category: 'income', ref: `rent:${d}` });
  l.last = d; store.commit('bank'); return r.ok ? LODGER_PAY : 0;
}
