/** Today in Regina (core/todo.js): three tasks a day from the counters, paid once each, a bonus for all three, nothing lost on a missed day. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { todoTasks, todoStatus, updateTodo, sanitizeTodo, TODO_PAY, TODO_BONUS } from '../src/core/todo.js';
import { tally } from '../src/core/game.js';
import { sanitize } from '../src/core/sanitize.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store;
beforeEach(() => { t = Date.parse('2026-10-25T18:00:00Z'); store = new Store(mem(), () => t); });

describe('today in Regina', () => {
  it('three different tasks, stable for the day, new tomorrow; no shift task without a job', () => {
    const a = todoTasks(store.state, t), b = todoTasks(store.state, t + 3600e3); expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id)); expect(a.length).toBe(3);
    expect(new Set(a.map((x) => x.stat)).size).toBe(3);
    for (let d = 0; d < 30; d++) expect(todoTasks(store.state, t + d * 86400e3).some((x) => x.id === 'shift')).toBe(false);
    const days = new Set(); for (let d = 0; d < 10; d++) days.add(todoTasks(store.state, t + d * 86400e3).map((x) => x.id).join()); expect(days.size).toBeGreaterThan(2);
  });
  it('a snow day brings the shovelling task', () => { expect(todoTasks(store.state, t, { snow: true }).some((x) => x.stat === 'gigs')).toBe(true); });
  it('only what you do after the card starts counts; each pays once; all three pay the bonus', () => {
    tally(store.state, 'activities', 5); tally(store.state, 'eaten', 3);
    const st = todoStatus(store, t); expect(st.count).toBe(0);   // yesterday's counts do not tick today's card
    const b0 = store.state.bank.balance;
    for (const k of st.tasks) tally(store.state, k.stat, k.n);
    const r = updateTodo(store, t); expect(r.fresh.length).toBe(3); expect(r.finished).toBe(true);
    expect(store.state.bank.balance).toBe(b0 + 3 * TODO_PAY + TODO_BONUS);
    expect(updateTodo(store, t).fresh).toEqual([]); expect(store.state.bank.balance).toBe(b0 + 3 * TODO_PAY + TODO_BONUS);
  });
  it('a new day starts a fresh card; a corrupt card is repaired', () => {
    todoStatus(store, t); t += 86400e3; const st = todoStatus(store, t); expect(st.count).toBe(0); expect(store.state.todo.day).toBe('2026-10-26');
    expect(sanitizeTodo({ day: 'x' })).toBeNull(); expect(sanitizeTodo({ day: '2026-10-25', base: { eaten: -1, ok: 2 }, done: ['a', 'a', 5] })).toEqual({ day: '2026-10-25', base: { ok: 2 }, done: ['a'], bonus: false });
    expect(sanitize({ todo: { day: 'nope' } }).todo).toBeNull();
  });
  it('stays small: a full day of tasks is under a quarter of an entry shift', () => { expect(3 * TODO_PAY + TODO_BONUS).toBeLessThan(6600 / 4 + 100); });
});
