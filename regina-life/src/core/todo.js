/**
 * Today in Regina (docs/AMAZING.md G8): three small things to do each Regina day, seeded by the date, read from the lifetime counters (s.stats) so
 * the UI can never tick one by itself. Each pays a little through the ledger, once; all three add a small bonus. A missed day costs nothing: tomorrow
 * simply brings three new ones (no streaks, no withering). The weather picks a bonus task when it matters (snow: shovel a walk).
 */
import { dayKey } from './daily.js';
import { mulberry32, hashStr } from './rng.js';

export const TODO_KINDS = Object.freeze([
  { id: 'activity', icon: '🛋️', title: 'Do something fun at home', stat: 'activities', n: 1 },
  { id: 'eat', icon: '🍽️', title: 'Eat something good', stat: 'eaten', n: 1 },
  { id: 'visit', icon: '🗺️', title: 'Visit a place in the city', stat: 'visits', n: 1 },
  { id: 'gig', icon: '🧰', title: 'Do an odd job', stat: 'gigs', n: 1 },
  { id: 'cook', icon: '🍳', title: 'Cook a meal', stat: 'cooked', n: 1 },
  { id: 'two', icon: '✨', title: 'Do two fun things', stat: 'activities', n: 2 },
  { id: 'shift', icon: '💼', title: 'Work a shift', stat: 'shifts', n: 1, needsJob: true },
]);
export const TODO_PAY = 400, TODO_BONUS = 500;   // P$4 each, P$5 for all three: under a quarter of a shift a day (ECONOMY)

const ok = (o) => o && typeof o === 'object' && !Array.isArray(o);
/** Today's three tasks (deterministic per Regina day; a shift only if you have a job; snow day: the shovel task leads). */
export function todoTasks(s, now, { snow = false } = {}) {
  const r = mulberry32(hashStr('todo:' + dayKey(now))), pool = TODO_KINDS.filter((k) => !k.needsJob || s?.job?.active);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const pick = []; for (const k of pool) { if (pick.length >= 3) break; if (pick.some((p) => p.stat === k.stat)) continue; pick.push(k); }
  if (snow && !pick.some((p) => p.id === 'gig')) pick[2] = { id: 'snowgig', icon: '❄️', title: 'Snow day: shovel a walk (Odd Jobs)', stat: 'gigs', n: 1 };
  return pick;
}
export function sanitizeTodo(t) {
  if (!ok(t) || typeof t.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.day)) return null;
  const base = {}; if (ok(t.base)) for (const [k, v] of Object.entries(t.base)) if (/^[a-z][a-zA-Z0-9]{0,23}$/.test(k) && Number.isFinite(v) && v >= 0) base[k] = Math.floor(v);
  const ids = (a) => [...new Set((Array.isArray(a) ? a : []).filter((x) => typeof x === 'string' && x.length < 16))].slice(0, 6);
  return { day: t.day, base, done: ids(t.done), bonus: !!t.bonus };
}
/** The card right now: { day, tasks: [{ ...kind, progress, done }], count, complete }. Starts today's card if needed (snapshotting the counters). */
export function todoStatus(store, now, opts = {}) {
  const s = store.state, today = dayKey(now); let t = sanitizeTodo(s.todo);
  if (!t || t.day !== today) { t = { day: today, base: { ...(s.stats || {}) }, done: [], bonus: false }; s.todo = t; }
  const tasks = todoTasks(s, now, opts).map((k) => { const p = Math.max(0, (s.stats?.[k.stat] ?? 0) - (t.base[k.stat] ?? 0)); return { ...k, progress: Math.min(k.n, p), done: t.done.includes(k.id) || p >= k.n }; });
  return { day: today, tasks, count: tasks.filter((x) => x.done).length, complete: tasks.every((x) => x.done), bonus: t.bonus };
}
/** Pay newly done tasks once, and the bonus for all three. Returns { fresh: [task], finished }. */
export function updateTodo(store, now, opts = {}) {
  const st = todoStatus(store, now, opts), t = store.state.todo, fresh = [];
  for (const k of st.tasks) {
    if (!k.done || t.done.includes(k.id)) continue;
    t.done.push(k.id); const r = store.ledger.credit(TODO_PAY, `Today in Regina · ${k.title}`, { category: 'income', ref: `todo:${t.day}:${k.id}` }); if (r.ok) fresh.push(k);
  }
  let finished = false;
  if (st.tasks.every((k) => t.done.includes(k.id)) && !t.bonus) { const r = store.ledger.credit(TODO_BONUS, 'Today in Regina · all three!', { category: 'income', ref: `todo:${t.day}:all` }); t.bonus = true; finished = r.ok; }
  if (fresh.length || finished) store.commit('bank');
  return { fresh, finished };
}
