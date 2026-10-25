/**
 * "First day in Regina" (docs/AMAZING.md G3): six small steps that walk a new player through every core loop, each with a small P$ thank-you,
 * and a party when the card is full. Pure rules over a Store, server-portable like the ledger.
 *
 * Steps are DERIVED from what the save already records (a placed piece, something owned, a meal eaten, a shift worked, a place visited, the daily
 * gift opened), so a step can never be ticked by the UI alone and old saves that already did a thing get it ticked (and paid) once. Pay goes through
 * the ledger with a per-step ref, and the save remembers what it paid, so nothing is ever paid twice.
 */
export const ONBOARDING_STEPS = Object.freeze([
  { id: 'gift',  icon: '🎁', title: 'Open your daily gift',          hint: 'Tap the green + next to your money.',          reward: 300,  tab: null },
  { id: 'place', icon: '🛋️', title: 'Make it yours: place a piece',  hint: 'Buy tab: pick something, tap a spot on the floor.', reward: 500, tab: 'buy' },
  { id: 'eat',   icon: '🍞', title: 'Eat something',                 hint: 'Buy groceries at Prairie Corner Market, then eat from the fridge.', reward: 300, tab: 'map' },
  { id: 'visit', icon: '🗺️', title: 'Visit a place in the city',     hint: 'Map tab: tap a place, then Walk or Cab.',       reward: 500,  tab: 'map' },
  { id: 'job',   icon: '📱', title: 'Get a job',                     hint: 'Phone → Jobs → Apply. They call you back.',     reward: 500,  tab: 'phone' },
  { id: 'shift', icon: '💼', title: 'Work your first shift',         hint: 'Clock in at your workplace and finish the tasks.', reward: 1000, tab: null },
]);
export const ONBOARDING_BONUS = 2000;   // the whole card: P$20, about a third of an entry shift (ECONOMY: P$66)
const IDS = new Set(ONBOARDING_STEPS.map((s) => s.id));

/** Has the save done step `id` yet? Read only from what the rules already record. */
export function stepDone(s, id) {
  switch (id) {
    case 'gift': return !!s.daily?.last;
    case 'place': return (s.home?.placed?.length ?? 0) > 0;
    case 'eat': return (s.stats?.eaten ?? 0) > 0;
    case 'visit': return (s.stats?.visits ?? 0) > 0;
    case 'job': return !!s.job?.active;
    case 'shift': return (s.job?.active?.shifts ?? 0) > 0 || (s.stats?.shifts ?? 0) > 0;
    default: return false;
  }
}
export function sanitizeOnboarding(o) {
  const ok = o && typeof o === 'object' && !Array.isArray(o);
  const ids = (a) => [...new Set((Array.isArray(a) ? a : []).filter((x) => typeof x === 'string' && IDS.has(x)))];
  return { done: ids(ok && o.done), paid: ids(ok && o.paid), bonus: !!(ok && o.bonus), hidden: !!(ok && o.hidden), min: !!(ok && o.min), seenDone: !!(ok && o.seenDone) };
}
/** The card's state right now: steps with done flags, the next step, progress and whether it is complete. */
export function onboardingStatus(s) {
  const o = sanitizeOnboarding(s.onboarding), steps = ONBOARDING_STEPS.map((st) => ({ ...st, done: o.done.includes(st.id) }));
  const next = steps.find((st) => !st.done) ?? null;
  return { steps, next, count: o.done.length, total: steps.length, complete: !next, hidden: o.hidden, min: o.min, bonus: o.bonus };
}
/**
 * Tick every step the save has now done, pay each one once, and the bonus when the card is full. Returns the steps newly completed
 * ([{ id, title, reward }]) and `finished` when this call completed the card, so the UI can celebrate exactly once.
 */
export function updateOnboarding(store) {
  const s = store.state, o = (s.onboarding = sanitizeOnboarding(s.onboarding)), fresh = [];
  for (const st of ONBOARDING_STEPS) {
    if (o.done.includes(st.id) || !stepDone(s, st.id)) continue;
    o.done.push(st.id);
    if (!o.paid.includes(st.id)) {
      const r = store.ledger.credit(st.reward, `First day in Regina · ${st.title}`, { category: 'income', ref: `onboard:${st.id}` });
      if (r.ok || r.error === 'Duplicate transaction') o.paid.push(st.id);
    }
    fresh.push({ id: st.id, title: st.title, icon: st.icon, reward: st.reward });
  }
  let finished = false;
  if (o.done.length === ONBOARDING_STEPS.length && !o.bonus) {
    const r = store.ledger.credit(ONBOARDING_BONUS, 'First day in Regina · all done!', { category: 'income', ref: 'onboard:all' });
    if (r.ok || r.error === 'Duplicate transaction') { o.bonus = true; finished = true; }
  }
  if (fresh.length || finished) store.commit('bank');
  return { fresh, finished };
}
