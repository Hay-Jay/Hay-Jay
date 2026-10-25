/**
 * The Farmers' Market stall (docs/AMAZING.md section 5): sell what you made. Paintings come from painting at your easel, baked goods from cooking
 * at home (once Cooking reaches level 1). The market runs on Wednesdays and Saturdays, 9:00 to 13:00 Regina time, like the real one; prices rise with
 * the skill behind the craft; at most STALL_DAILY_CAP sales a day so it stays a side hustle. Pure rules over a Store.
 */
import { dayKey } from './daily.js';
import { skillLevel, tally } from './game.js';

export const STALL_DAILY_CAP = 4;
export const CRAFTS = Object.freeze({
  painting: { name: 'Painting', icon: '🖼️', skill: 'charisma', base: 900, per: 300 },
  baked: { name: 'Baked goods', icon: '🥧', skill: 'cooking', base: 600, per: 200 },
});
const MAX_HELD = 12;

/** Is the market on? weekday 0 Sun .. 6 Sat, hour 0..23 (Regina). */
export const marketOpen = ({ weekday, hour }) => (weekday === 3 || weekday === 6) && hour >= 9 && hour < 13;
export const craftPrice = (s, kind) => { const c = CRAFTS[kind]; return c ? c.base + skillLevel(s?.skills?.[c.skill] || 0) * c.per : 0; };
export function sanitizeCrafts(c) {
  const ok = c && typeof c === 'object' && !Array.isArray(c), out = { painting: 0, baked: 0, day: '', sold: 0 };
  if (!ok) return out;
  for (const k of Object.keys(CRAFTS)) out[k] = Number.isInteger(c[k]) && c[k] > 0 ? Math.min(MAX_HELD, c[k]) : 0;
  out.day = typeof c.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.day) ? c.day : ''; out.sold = Number.isInteger(c.sold) && c.sold > 0 ? Math.min(99, c.sold) : 0;
  return out;
}
/** You made something (an easel session, a home-cooked recipe). Returns how many you hold now. */
export function makeCraft(store, kind) {
  const s = store.state; if (!CRAFTS[kind]) return 0; const c = (s.crafts = sanitizeCrafts(s.crafts));
  if (c[kind] < MAX_HELD) c[kind]++; store.commit('crafts'); return c[kind];
}
/** Sell one at the stall. when = { weekday, hour }. */
export function sellCraft(store, kind, when, now = store.now()) {
  const s = store.state, c = (s.crafts = sanitizeCrafts(s.crafts)), d = dayKey(now);
  if (!CRAFTS[kind]) return { ok: false, error: 'Nothing like that to sell.' };
  if (!marketOpen(when)) return { ok: false, error: 'The Farmers\' Market runs Wednesdays and Saturdays, 9 to 1.' };
  if (c[kind] < 1) return { ok: false, error: kind === 'painting' ? 'Paint something at your easel first.' : 'Cook at home first (Cooking level 1 or more).' };
  if (c.day !== d) { c.day = d; c.sold = 0; }
  if (c.sold >= STALL_DAILY_CAP) return { ok: false, error: 'Sold out for today! Come back next market day.' };
  const price = craftPrice(s, kind), r = store.ledger.credit(price, `Farmers' Market: ${CRAFTS[kind].name}`, { category: 'income' }); if (!r.ok) return r;
  c[kind]--; c.sold++; tally(s, 'stallSales'); store.commit('crafts'); store.commit('bank');
  return { ok: true, price, left: c[kind], soldToday: c.sold };
}
