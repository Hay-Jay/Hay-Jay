/**
 * Daily login reward: a small, honest "thanks for coming back" bonus on a 7-day streak. It is deliberately modest
 * (a coffee up to a nice lunch) so it never replaces working, and it is free to everyone, so it is not pay-to-win.
 * Pure over a Store; the day is the Regina calendar day. (Once there is a server, claims are validated there.)
 */
export const REWARD_CENTS = [500, 500, 800, 800, 1200, 1200, 2500];
const TZ = 'America/Regina', KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const dayKey = (now) => new Date(now).toLocaleDateString('en-CA', { timeZone: TZ });
export const prevDayKey = (key) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
export const validDaily = (d) => d && typeof d === 'object' && (d.last === '' || KEY_RE.test(d.last)) && Number.isInteger(d.streak) && d.streak >= 0 && d.streak <= REWARD_CENTS.length;

/** What the player would get today: { ready, day (1-7), amount } and whether the streak survives. */
export function dailyStatus(state, now) {
  const d = validDaily(state.daily) ? state.daily : { last: '', streak: 0 }, today = dayKey(now);
  if (d.last === today) return { ready: false, day: d.streak, amount: 0, streak: d.streak, next: REWARD_CENTS[d.streak % REWARD_CENTS.length] };
  const continues = d.last === prevDayKey(today), day = continues ? (d.streak % REWARD_CENTS.length) + 1 : 1;
  return { ready: true, day, amount: REWARD_CENTS[day - 1], streak: continues ? d.streak : 0, next: REWARD_CENTS[day - 1] };
}

export function claimDaily(store, now = Date.now()) {
  const st = dailyStatus(store.state, now); if (!st.ready) return { ok: false, error: 'Already claimed today — come back tomorrow.' };
  const r = store.ledger.credit(st.amount, `Daily reward · day ${st.day}`, { category: 'income' }); if (!r.ok) return r;
  store.state.daily = { last: dayKey(now), streak: st.day }; store.commit('bank');
  return { ok: true, day: st.day, amount: st.amount };
}
