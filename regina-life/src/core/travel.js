/** Intercity trips: pay a fare, spend energy, get a short scenario with choices and a souvenir. */
import { DESTINATION_BY_ID, TRIP_COOLDOWN_MS } from '../data/destinations.js';
import { EVENTS, issueEvent } from './events.js';
import { own } from './util.js';
import { fmtMoney } from './ledger.js';
import { addSkill, notify } from './game.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
/** Quick Cab fast-travel fare (cents): $4.50 flag drop + $2.50 per km — the 2026 Regina taxi / ride-share range. The map's cab button should call this. */
export const CAB_BASE = 450, CAB_PER_M = 0.25;
export const cabFare = (metres) => CAB_BASE + (Number.isFinite(metres) && metres > 0 ? Math.round(metres * CAB_PER_M) : 0);
export function tripBlocked(store, destId, mode, now = store.now()) {
  const s = store.state, d = own(DESTINATION_BY_ID, destId) ? DESTINATION_BY_ID[destId] : null, m = own(d?.modes, mode) ? d.modes[mode] : null;
  if (!d || !m) return 'That trip is not available';
  if (now - (s.flags?.tripAt || 0) < TRIP_COOLDOWN_MS) return 'You just got back — give it a few minutes.';
  if (s.needs.energy < 25) return "You're too tired to travel. Sleep first.";
  if (store.ledger.balance < m.fare) return `You need ${fmtMoney(m.fare)}.`;
  return null;
}
/** Charge the fare and apply the journey's toll; returns the trip scenario to show. */
export function travel(store, destId, mode, now = store.now(), rnd = Math.random) {
  const bad = tripBlocked(store, destId, mode, now); if (bad) return { ok: false, error: bad };
  const s = store.state, d = DESTINATION_BY_ID[destId], m = d.modes[mode];
  const r = store.ledger.debit(m.fare, `${mode === 'flight' ? 'Flight' : 'Coach'} to ${d.name}`, { category: 'travel' }); if (!r.ok) return r;
  const first = !(s.souvenirs || []).includes(destId);
  s.needs.energy = clamp(s.needs.energy - (mode === 'flight' ? 12 : Math.min(26, 8 + m.mins / 25)));
  s.needs.hunger = clamp(s.needs.hunger - 10); s.needs.hygiene = clamp((s.needs.hygiene ?? 60) - 8); s.needs.fun = clamp((s.needs.fun ?? 50) + 18); s.needs.mood = clamp(s.needs.mood + 8);
  (s.flags ||= {}).tripAt = now; (s.trips ||= []).unshift({ dest: destId, mode, t: now, fare: m.fare }); s.trips.length = Math.min(s.trips.length, 30);
  if (first) { (s.souvenirs ||= []).push(destId); notify(store, { app: 'trips', title: `🎁 Souvenir: ${d.souvenir}`, body: `A ${d.name} poster is now available in your home decorating menu.` }); }
  addSkill(store, 'charisma', 3);
  const pool = EVENTS.filter((e) => e.where.includes('trip:' + destId)), event = pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
  if (event) issueEvent(store, event.id, now);
  store.commit('trips'); return { ok: true, dest: d, mode, mins: m.mins, fare: m.fare, first, event };
}
