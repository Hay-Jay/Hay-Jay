/**
 * Daily gift: a small, honest "thanks for coming back" on a card of seven stamps. It is deliberately modest (a coffee up to a nice lunch) so it
 * never replaces working, and it is free to everyone, so it is not pay-to-win.
 *
 * The card advances one stamp per Regina day you visit and NEVER resets: missing a day only means missing that day's gift. (The old rule reset a
 * streak to day 1 after a missed day, which is the textbook dark pattern: "a missed day costs the user the reward progression". docs/AMAZING.md G4.)
 * Pure over a Store; the day is the Regina calendar day. (Once there is a server, claims are validated there.)
 */
export const REWARD_CENTS = [800, 800, 1000, 1000, 1200, 1500, 3000];
const TZ = 'America/Regina', KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const dayKey = (now) => new Date(now).toLocaleDateString('en-CA', { timeZone: TZ });
export const prevDayKey = (key) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
export const validDaily = (d) => d && typeof d === 'object' && (d.last === '' || KEY_RE.test(d.last)) && Number.isInteger(d.streak) && d.streak >= 0 && d.streak <= REWARD_CENTS.length;

/** What the player would get today: { ready, day (1-7, the stamp today's claim fills), amount, streak (stamps on the card), next }. */
export function dailyStatus(state, now) {
  const d = validDaily(state.daily) ? state.daily : { last: '', streak: 0 }, today = dayKey(now);
  if (d.last === today) return { ready: false, day: d.streak, amount: 0, streak: d.streak, next: REWARD_CENTS[d.streak % REWARD_CENTS.length] };
  const day = (d.streak % REWARD_CENTS.length) + 1;   // the next stamp, however long you were away
  return { ready: true, day, amount: REWARD_CENTS[day - 1], streak: d.streak % REWARD_CENTS.length, next: REWARD_CENTS[day - 1] };
}

export function claimDaily(store, now = Date.now()) {
  const st = dailyStatus(store.state, now); if (!st.ready) return { ok: false, error: 'Already claimed today — come back tomorrow.' };
  const r = store.ledger.credit(st.amount, `Daily gift · stamp ${st.day} of 7`, { category: 'income' }); if (!r.ok) return r;
  store.state.daily = { last: dayKey(now), streak: st.day }; store.commit('bank');
  return { ok: true, day: st.day, amount: st.amount };
}
