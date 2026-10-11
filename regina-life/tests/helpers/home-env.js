/** Shared setup for the multi-room home tests (rules, moving, saves, styles): in-memory storage, funded stores in any layout, seeded random pieces. */
import { Store, SAVE_KEY } from '../../src/core/store.js';
import { FURNITURE } from '../../src/data/furniture.js';
import { mulberry32 } from '../../src/core/rng.js';

export const mem = (init) => { const m = new Map(init ? [[SAVE_KEY, JSON.stringify(init)]] : []); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), raw: m }; };
/** A fresh store whose clock the test controls (`clock.t`); ledger calls are rate limited per 10 s, so advance it between bursts of purchases. */
export function makeStore({ layout = 'studio', balance = 5e9, home = {} } = {}) {
  const clock = { t: 1_700_000_000_000 }, store = new Store(mem(), () => clock.t);
  store.state.bank.balance = balance; Object.assign(store.state.home, { layout }, home);
  return { store, clock, tick: (ms = 1500) => { clock.t += ms; } };
}
/** Loads a save the way the game does (merge onto defaults, then sanitize). `patch` is merged over a fresh state's JSON. */
export function loadSave(patch, clock = { t: 1_700_000_000_000 }) {
  const base = JSON.parse(JSON.stringify(new Store(mem(), () => clock.t).state));
  return new Store(mem({ ...base, ...patch }), () => clock.t);
}
/** Gives a store n of every catalogue item (a test may then place whatever it likes). */
export const ownAll = (store, n = 3) => { store.state.home.owned = Object.fromEntries(Object.keys(FURNITURE).map((k) => [k, n])); };
export const SOLID_IDS = Object.values(FURNITURE).filter((f) => f.solid).map((f) => f.id);
export const ALL_IDS = Object.keys(FURNITURE);
export const rng = mulberry32;
export const deepCopy = (v) => JSON.parse(JSON.stringify(v));
