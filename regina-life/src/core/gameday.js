/**
 * Game day at the football stadium: the (fictional) Regina Prairie Storm play at home three days a week (Wednesday, Friday and Saturday,
 * Regina calendar). Buy a ticket from the stadium's place card, watch the game, and cheer: a big lift to fun and mood, more if the home side
 * wins. Each game's result is seeded by its date, so everyone in Regina sees the same score. Your first game comes with a free fan jersey.
 * Pure rules over a Store.
 */
import { dayKey } from './daily.js';
import { mulberry32, hashStr } from './rng.js';
import { addSkill, tally } from './game.js';
import { fmtMoney } from './ledger.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
export const HOME_TEAM = { name: 'Prairie Storm', city: 'Regina', icon: '🟢' };
/** Visiting sides: real cities, fictional teams. */
export const VISITORS = [
  { name: 'Calgary Chinooks', icon: '🔴' }, { name: 'Winnipeg Bison', icon: '🔵' }, { name: 'Edmonton Oilcats', icon: '🟠' },
  { name: 'Saskatoon Bridges', icon: '🟣' }, { name: 'Hamilton Forge', icon: '🟡' }, { name: 'BC Orcas', icon: '⚫' },
];
export const GAME_WEEKDAYS = [3, 5, 6];          // Wednesday, Friday, Saturday
export const TICKET_PRICE = 4500;                // P$45: an upper-bowl seat
export const JERSEY_ID = 'jersey_storm';
export const WATCH_SECS = 8;

const weekdayOf = (key) => new Date(key + 'T12:00:00Z').getUTCDay();
export const isGameDay = (now) => GAME_WEEKDAYS.includes(weekdayOf(dayKey(now)));
/** Days until the next home game (0 = today), up to a week ahead. */
export function nextGameIn(now) { for (let k = 0; k < 8; k++) if (isGameDay(now + k * 86400000)) return k; return null; }

/** Today's (or that day's) matchup and final score. Pure and seeded by the date. */
export function matchup(key) {
  const r = mulberry32(hashStr('storm:' + key)), away = VISITORS[Math.floor(r() * VISITORS.length)];
  const pts = () => [3, 7, 7, 7, 3, 6, 0, 7, 1][Math.floor(r() * 9)];
  let home = 0, vis = 0; const plays = [];
  for (let q = 1; q <= 4; q++) {
    const h = pts() + (r() < 0.55 ? pts() : 0), v = pts() + (r() < 0.45 ? pts() : 0); home += h; vis += v;
    plays.push(q === 4 && home === vis ? null : `Q${q}: ${HOME_TEAM.name} ${home}, ${away.name.split(' ').pop()} ${vis}`);
  }
  if (home === vis) { home += 3; plays[3] = `Overtime field goal! ${HOME_TEAM.name} ${home}, ${away.name.split(' ').pop()} ${vis}`; }
  return { key, away, home, vis, win: home > vis, plays: plays.filter(Boolean) };
}
export function sanitizeGameday(g) {
  const ok = g && typeof g === 'object', key = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  return { ticket: key(ok && g.ticket), watched: key(ok && g.watched), games: Math.floor(Number.isFinite(ok && g.games) ? Math.max(0, Math.min(1e5, g.games)) : 0), wins: Math.floor(Number.isFinite(ok && g.wins) ? Math.max(0, Math.min(1e5, g.wins)) : 0) };
}
export function gamedayStatus(s, now) {
  const g = sanitizeGameday(s.gameday), k = dayKey(now), on = isGameDay(now);
  return { on, today: on ? matchup(k) : null, nextIn: nextGameIn(now), hasTicket: on && g.ticket === k, watched: g.watched === k, games: g.games, wins: g.wins };
}
export function buyTicket(store, now = store.now()) {
  const s = store.state, st = gamedayStatus(s, now);
  if (!st.on) return { ok: false, error: `No home game today. Next one is in ${st.nextIn} day${st.nextIn === 1 ? '' : 's'}.` };
  if (st.watched) return { ok: false, error: 'You already watched today\'s game.' };
  if (st.hasTicket) return { ok: false, error: 'You already have a ticket for today.' };
  const r = store.ledger.debit(TICKET_PRICE, `Game ticket: ${HOME_TEAM.name} vs ${st.today.away.name}`, { category: 'purchase' }); if (!r.ok) return { ok: false, error: `A ticket is ${fmtMoney(TICKET_PRICE)}.` };
  s.gameday = { ...sanitizeGameday(s.gameday), ticket: dayKey(now) }; store.commit('gameday'); return { ok: true };
}
/** Watch today's game (needs today's ticket). Applies the cheering and returns the result. */
export function watchGame(store, now = store.now()) {
  const s = store.state, st = gamedayStatus(s, now);
  if (!st.on) return { ok: false, error: 'No home game today.' };
  if (st.watched) return { ok: false, error: 'You already watched today\'s game.' };
  if (!st.hasTicket) return { ok: false, error: 'Buy a ticket first.' };
  if (s.needs.energy < 15) return { ok: false, error: "You're too tired. Rest first." };
  const m = st.today, n = s.needs;
  n.fun = clamp((n.fun ?? 60) + 35); n.mood = clamp(n.mood + (m.win ? 18 : 8)); n.energy = clamp(n.energy - 10); n.hunger = clamp(n.hunger - 8);
  const g = sanitizeGameday(s.gameday); g.watched = st.today.key; g.games++; if (m.win) g.wins++; s.gameday = g;
  let jersey = false; if (!s.wardrobe.includes(JERSEY_ID)) { s.wardrobe.push(JERSEY_ID); jersey = true; }
  addSkill(store, 'charisma', 4); tally(s, 'games'); store.commit('needs'); store.commit('gameday');
  return { ok: true, ...m, jersey };
}
