/**
 * Errands: order food, groceries and help around the house from your phone. Pure over a Store, like gigs and the ledger:
 *
 *   orderFood(store, restaurantId, items, now)   pay the menu prices + a delivery fee; the meal arrives in your bag after FOOD_SECS
 *   orderGroceries(store, items, now)            Market groceries at the Market's own (policy) price + a delivery fee
 *   bookService(store, serviceId, now)           pay up front; its effect lands on your needs when the pro is done
 *   tickErrands(store, now)                      deliver everything that is due; returns what arrived (for toasts)
 *   orderStage(order, now)                       'preparing' | 'onway' | 'arrived' and a 0..1 progress, for the UI
 *
 * Prices always come from the catalog, never from the caller. Orders are paid when placed and can never be lost: anything due
 * while the game was closed arrives the next time it ticks.
 */
import { FOOD } from '../data/catalog.js';
import { RESTAURANT_BY_ID, SERVICE_BY_ID, DELIVERY_FEE, GROCERY_FEE, FOOD_SECS, GROCERY_SECS, MAX_ACTIVE, MAX_ITEMS } from '../data/errands.js';
import { priceFor, notify, tally, addSkill } from './game.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clamp = (v) => Math.max(0, Math.min(100, v));
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
let _n = 0;

export function sanitizeErrands(e) {
  const ok = isObj(e);
  const valid = (o) => isObj(o) && typeof o.id === 'string' && o.id.length < 40 && ['food', 'groceries', 'service'].includes(o.kind)
    && Number.isFinite(o.at) && Number.isFinite(o.due) && o.due >= o.at && Number.isInteger(o.total) && o.total >= 0
    && (o.kind === 'service' ? own(SERVICE_BY_ID, o.service) : isObj(o.items) && Object.keys(o.items).length > 0 && Object.entries(o.items).every(([k, q]) => own(FOOD, k) && Number.isInteger(q) && q > 0 && q <= MAX_ITEMS));
  const clean = (o) => ({ id: o.id, kind: o.kind, from: String(o.from ?? '').slice(0, 40), icon: String(o.icon ?? '').slice(0, 4), at: o.at, due: o.due, total: o.total, done: !!o.done,
    ...(o.kind === 'service' ? { service: o.service } : { items: { ...o.items } }) });
  const orders = ok && Array.isArray(e.orders) ? e.orders.filter(valid).map(clean) : [];
  return { orders: [...orders.filter((o) => !o.done).slice(0, MAX_ACTIVE), ...orders.filter((o) => o.done).slice(0, 10)], total: ok && Number.isInteger(e.total) && e.total >= 0 ? Math.min(e.total, 1e6) : 0 };
}
const state = (store) => (store.state.errands = sanitizeErrands(store.state.errands));
export const activeOrders = (s) => sanitizeErrands(s.errands).orders.filter((o) => !o.done);
export const pastOrders = (s) => sanitizeErrands(s.errands).orders.filter((o) => o.done);

/** Validate a basket {foodId: qty} against what is allowed in it. */
function basket(items, allowed) {
  if (!isObj(items)) return { error: 'Your basket is empty' };
  const out = {}; let n = 0;
  for (const [id, q] of Object.entries(items)) {
    if (!Number.isInteger(q) || q < 0) return { error: 'Invalid quantity' };
    if (!q) continue;
    if (!allowed(id)) return { error: 'That is not on the menu' };
    out[id] = q; n += q;
  }
  if (!n) return { error: 'Your basket is empty' };
  if (n > MAX_ITEMS) return { error: `Up to ${MAX_ITEMS} items per order` };
  return { items: out, count: n };
}
const describe = (items) => Object.entries(items).map(([id, q]) => `${FOOD[id].name}${q > 1 ? ` ×${q}` : ''}`).join(', ');

function place(store, order, memo, category, now) {
  const e = state(store);
  if (e.orders.filter((o) => !o.done).length >= MAX_ACTIVE) return { ok: false, error: `You already have ${MAX_ACTIVE} orders on the way` };
  const id = `er_${now.toString(36)}_${(_n++).toString(36)}`;
  const r = store.ledger.debit(order.total, memo.slice(0, 80), { category, ref: id });
  if (!r.ok) return r;
  e.orders.unshift({ id, at: now, done: false, ...order });
  e.total++;
  tally(store.state, 'errands');
  store.commit('errands');
  return { ok: true, order: e.orders[0] };
}

/** Subtotal for a restaurant basket, or the error. Menu prices are fixed (the mayor's grocery policy is for groceries). */
export function foodQuote(restaurantId, items) {
  const r = RESTAURANT_BY_ID[restaurantId]; if (!r) return { error: 'Unknown restaurant' };
  const b = basket(items, (id) => r.menu.includes(id)); if (b.error) return b;
  const sub = Object.entries(b.items).reduce((a, [id, q]) => a + FOOD[id].price * q, 0);
  return { ...b, sub, fee: DELIVERY_FEE, total: sub + DELIVERY_FEE };
}
export function orderFood(store, restaurantId, items, now = Date.now()) {
  const q = foodQuote(restaurantId, items); if (q.error) return { ok: false, error: q.error };
  const r = RESTAURANT_BY_ID[restaurantId];
  return place(store, { kind: 'food', from: r.name, icon: r.icon, items: q.items, total: q.total, due: now + FOOD_SECS * 1000 }, `${r.name}: ${describe(q.items)}`, 'food', now);
}

export function groceryQuote(store, items) {
  const b = basket(items, (id) => own(FOOD, id) && FOOD[id].shelf !== 'takeout'); if (b.error) return b;
  const sub = Object.entries(b.items).reduce((a, [id, q]) => a + priceFor(store, id) * q, 0);
  return { ...b, sub, fee: GROCERY_FEE, total: sub + GROCERY_FEE };
}
export function orderGroceries(store, items, now = Date.now()) {
  const q = groceryQuote(store, items); if (q.error) return { ok: false, error: q.error };
  return place(store, { kind: 'groceries', from: 'Prairie Corner Market', icon: '🛒', items: q.items, total: q.total, due: now + GROCERY_SECS * 1000 }, `Grocery delivery: ${describe(q.items)}`, 'groceries', now);
}

export function bookService(store, serviceId, now = Date.now()) {
  const sv = SERVICE_BY_ID[serviceId]; if (!sv) return { ok: false, error: 'Unknown service' };
  if (activeOrders(store.state).some((o) => o.service === serviceId)) return { ok: false, error: `${sv.name} is already booked` };
  return place(store, { kind: 'service', from: sv.name, icon: sv.icon, service: sv.id, total: sv.price, due: now + sv.secs * 1000 }, `${sv.name}`, 'services', now);
}

/** Deliver everything that is due. Returns [{ order, text }] for what arrived. */
export function tickErrands(store, now = Date.now()) {
  if (!store.state.errands?.orders?.some((o) => !o.done && o.due <= now)) return [];
  const e = state(store), s = store.state, out = [];
  for (const o of e.orders) {
    if (o.done || o.due > now) continue;
    o.done = true;
    let text;
    if (o.kind === 'service') {
      const sv = SERVICE_BY_ID[o.service];
      for (const [k, v] of Object.entries(sv.fx)) s.needs[k] = clamp((s.needs[k] ?? 50) + v);
      if (sv.skill) addSkill(store, sv.skill[0], sv.skill[1]);
      text = sv.done;
    } else {
      for (const [id, q] of Object.entries(o.items)) s.inventory[id] = Math.min(99, (s.inventory[id] || 0) + q);
      text = o.kind === 'food' ? `Your ${o.from} order is here. It's in your bag: eat it from the Inventory app.` : 'Your groceries are here. They are in your bag and fridge.';
    }
    notify(store, { app: 'errands', title: `${o.icon} ${o.kind === 'service' ? `${o.from} done` : 'Delivered'}`, body: text });
    out.push({ order: o, text });
  }
  // keep the newest finished orders only
  const active = e.orders.filter((o) => !o.done), done = e.orders.filter((o) => o.done).sort((a, b) => b.due - a.due).slice(0, 10);
  e.orders = [...active, ...done];
  store.commit('errands'); store.commit('inventory'); store.commit('needs');
  return out;
}

export function orderStage(o, now = Date.now()) {
  if (o.done || now >= o.due) return { stage: 'arrived', p: 1, label: o.kind === 'service' ? 'Done' : 'Arrived' };
  const p = Math.max(0, Math.min(1, (now - o.at) / Math.max(1, o.due - o.at))), left = Math.ceil((o.due - now) / 1000);
  const eta = left >= 60 ? `${Math.ceil(left / 60)} min` : `${left} s`;
  if (o.kind === 'service') return { stage: p < 0.25 ? 'preparing' : 'onway', p, label: p < 0.25 ? `On the way to you · ${eta}` : `Working on it · ${eta}` };
  return { stage: p < 0.5 ? 'preparing' : 'onway', p, label: `${p < 0.5 ? (o.kind === 'food' ? 'Kitchen is cooking' : 'Packing your bags') : 'Courier is on the way'} · ${eta}` };
}
