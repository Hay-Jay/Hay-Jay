/**
 * The Regina calendar (docs/AMAZING.md G10), starting with the Pumpkin Walk: an original, recurring festival in Victoria Park on the last three
 * days of October. A note from Dani three days ahead, carved jack-o'-lanterns around the park while it is on, and one optional 90-second hunt a day
 * with a small prize. It comes back every year (nothing is "never again"), and skipping it costs nothing. Pure rules over a Store.
 */
import { dayKey } from './daily.js';
import { mulberry32, hashStr } from './rng.js';
import { tally } from './game.js';

export const PUMPKIN = Object.freeze({ id: 'pumpkin', name: 'Pumpkin Walk', icon: '🎃', where: 'Victoria Park', month: 10, days: [29, 30, 31], count: 9, secs: 90, reach: 2.6 });
export const PUMPKIN_PAY = (found) => (found >= PUMPKIN.count ? 1500 : found * 100);   // P$15 for all nine, P$1 a pumpkin otherwise: a treat, not a job
/** The hunt's area: the Victoria Park block (x -211..-119, z 9..101) and its sidewalks. Kept in sync with world/city.js victoriaPark(). */
export const PUMPKIN_AREA = Object.freeze({ x0: -208, x1: -116, z0: 12, z1: 98, cx: -165, cz: 55 });

const parts = (now) => { const k = dayKey(now); return { y: +k.slice(0, 4), m: +k.slice(5, 7), d: +k.slice(8, 10), key: k }; };
/** Is the Pumpkin Walk on (Regina date)? */
export const pumpkinOn = (now) => { const p = parts(now); return p.m === PUMPKIN.month && PUMPKIN.days.includes(p.d); };
/** Days until it starts (0 while it is on), within the next 3 days; otherwise null. */
export function pumpkinSoon(now) {
  if (pumpkinOn(now)) return 0;
  for (let k = 1; k <= 3; k++) if (pumpkinOn(now + k * 86400000)) return k;
  return null;
}
/** Where this year's nine pumpkins sit: seeded per year, spread round the park (never on the fountain, never in a tree trunk's spot). Pure. */
export function pumpkinSpots(year) {
  const r = mulberry32(hashStr('pumpkins:' + year)), A = PUMPKIN_AREA, out = [];
  for (let i = 0; out.length < PUMPKIN.count && i < 400; i++) {
    const a = (out.length / PUMPKIN.count) * Math.PI * 2 + r() * 0.5, rad = 14 + r() * 26, x = A.cx + Math.cos(a) * rad * 1.15, z = A.cz + Math.sin(a) * rad;
    if (x < A.x0 + 2 || x > A.x1 - 2 || z < A.z0 + 2 || z > A.z1 - 2) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 8)) continue;
    out.push({ i: out.length, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
  }
  return out;
}
const sanitizeHunt = (h) => (h && typeof h === 'object' && typeof h.day === 'string' && Number.isFinite(h.startedAt) && Array.isArray(h.found) ? { day: h.day, startedAt: h.startedAt, found: [...new Set(h.found.filter((i) => Number.isInteger(i) && i >= 0 && i < PUMPKIN.count))], done: !!h.done } : null);
/** Today's hunt state (null if none today). */
export function huntToday(s, now) { const h = sanitizeHunt(s.festivals?.pumpkinHunt); return h && h.day === dayKey(now) ? h : null; }
export function startHunt(store, now = store.now()) {
  const s = store.state; if (!pumpkinOn(now)) return { ok: false, error: 'The Pumpkin Walk is on the last three days of October.' };
  const h = huntToday(s, now); if (h?.done) return { ok: false, error: 'You already did today\'s hunt. Come back tomorrow!' };
  if (h && now - h.startedAt < PUMPKIN.secs * 1000) return { ok: false, error: 'Your hunt is already on!' };
  (s.festivals ||= {}).pumpkinHunt = { day: dayKey(now), startedAt: now, found: [], done: false }; store.commit('festivals');
  return { ok: true, secs: PUMPKIN.secs };
}
/** You are at pumpkin `i` ({x, z} where you stand). Counts only while the clock runs and only within reach. */
export function findPumpkin(store, i, at, now = store.now()) {
  const s = store.state, h = huntToday(s, now); if (!h || h.done) return { ok: false, error: 'Start the hunt at the Pumpkin Walk sign first.' };
  if (now - h.startedAt > PUMPKIN.secs * 1000) return { ok: false, error: 'Time is up!' };
  const p = pumpkinSpots(parts(now).y)[i]; if (!p) return { ok: false, error: 'No pumpkin there.' };
  if (!at || Math.hypot(at.x - p.x, at.z - p.z) > PUMPKIN.reach) return { ok: false, error: 'Get a little closer.' };
  if (h.found.includes(i)) return { ok: false, error: 'Already found that one.' };
  h.found.push(i); s.festivals.pumpkinHunt = h; store.commit('festivals');
  return { ok: true, found: h.found.length, total: PUMPKIN.count };
}
/** End the hunt (time up, or all nine found): pay once per Regina day through the ledger, with the Pumpkin toque for a full card. */
export function endHunt(store, now = store.now()) {
  const s = store.state, h = huntToday(s, now); if (!h || h.done) return { ok: false, error: 'No hunt to finish.' };
  const n = h.found.length; if (n < PUMPKIN.count && now - h.startedAt < PUMPKIN.secs * 1000) return { ok: false, error: 'Keep looking!' };
  h.done = true; s.festivals.pumpkinHunt = h;
  const pay = PUMPKIN_PAY(n); let paid = 0;
  if (pay > 0) { const r = store.ledger.credit(pay, `Pumpkin Walk: ${n} of ${PUMPKIN.count} found`, { category: 'income', ref: `pumpkin:${h.day}` }); if (r.ok) paid = pay; }
  let prize = null; if (n >= PUMPKIN.count && !s.wardrobe.includes('toque_pumpkin')) { s.wardrobe.push('toque_pumpkin'); prize = 'toque_pumpkin'; }
  tally(s, 'pumpkins', n); store.commit('festivals'); store.commit('bank');
  return { ok: true, found: n, pay: paid, prize };
}
