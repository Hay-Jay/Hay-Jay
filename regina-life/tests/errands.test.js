/** Errands (core/errands.js + data/errands.js): order food, groceries and services from the phone; prices from the catalog, paid once, delivered once. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { orderFood, orderGroceries, bookService, tickErrands, foodQuote, orderStage, activeOrders, sanitizeErrands } from '../src/core/errands.js';
import { RESTAURANTS, SERVICES, DELIVERY_FEE, FOOD_SECS, MAX_ACTIVE, MAX_ITEMS } from '../src/data/errands.js';
import { FOOD, MARKET_STOCK } from '../src/data/catalog.js';
import { COMING_SOON, comingSoonByBlock, DISTRICTS, ISLAND } from '../src/world/cityData.js';
import { sanitize } from '../src/core/sanitize.js';
import { consume } from '../src/core/game.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store;
beforeEach(() => { t = Date.parse('2026-10-25T18:00:00Z'); store = new Store(mem(), () => t); });

describe('menus', () => {
  it('every menu item is a takeout FOOD item that never shows up on the Market shelves', () => {
    for (const r of RESTAURANTS) for (const id of r.menu) { expect(FOOD[id]?.shelf).toBe('takeout'); expect(MARKET_STOCK).not.toContain(id); }
    expect(MARKET_STOCK.length).toBeGreaterThan(0);
  });
});

describe('ordering food', () => {
  it('charges menu prices plus the delivery fee, then delivers into the bag once', () => {
    const bal = store.state.bank.balance, q = foodQuote('perogy', { perogies: 2 });
    expect(q.total).toBe(FOOD.perogies.price * 2 + DELIVERY_FEE);
    const r = orderFood(store, 'perogy', { perogies: 2 }, t); expect(r.ok, r.error).toBe(true);
    expect(store.state.bank.balance).toBe(bal - q.total);
    expect(tickErrands(store, t + 1000)).toEqual([]);                    // still cooking
    expect(orderStage(r.order, t + 1000).stage).toBe('preparing');
    const got = tickErrands(store, t + FOOD_SECS * 1000); expect(got.length).toBe(1);
    expect(store.state.inventory.perogies).toBe(2);
    expect(tickErrands(store, t + FOOD_SECS * 2000)).toEqual([]);        // never delivered twice
    expect(consume(store, 'perogies').ok).toBe(true);
  });
  it('refuses things off the menu, empty or oversized baskets, and orders you cannot pay for', () => {
    expect(orderFood(store, 'perogy', { ginger_beef: 1 }, t).ok).toBe(false);
    expect(orderFood(store, 'perogy', {}, t).ok).toBe(false);
    expect(orderFood(store, 'perogy', { perogies: MAX_ITEMS + 1 }, t).ok).toBe(false);
    expect(orderFood(store, 'perogy', { perogies: -1 }, t).ok).toBe(false);
    expect(orderFood(store, 'nope', { perogies: 1 }, t).ok).toBe(false);
    store.state.bank.balance = 100;
    expect(orderFood(store, 'perogy', { perogies: 1 }, t).ok).toBe(false);
  });
  it(`allows at most ${MAX_ACTIVE} orders on the way`, () => {
    for (let k = 0; k < MAX_ACTIVE; k++) expect(orderFood(store, 'pizza', { pizza_slice: 1 }, t + k).ok).toBe(true);
    expect(orderFood(store, 'pizza', { pizza_slice: 1 }, t).ok).toBe(false);
    expect(activeOrders(store.state).length).toBe(MAX_ACTIVE);
  });
});

describe('groceries and services', () => {
  it('delivers groceries but never takeout through the grocery order', () => {
    expect(orderGroceries(store, { ginger_beef: 1 }, t).ok).toBe(false);
    expect(orderGroceries(store, { bread: 1, milk: 2 }, t).ok).toBe(true);
    tickErrands(store, t + 10 * 60e3); expect(store.state.inventory.bread).toBe(1); expect(store.state.inventory.milk).toBe(2);
  });
  it('a booked service lands its effect on your needs when it is done, and cannot be double-booked', () => {
    const sv = SERVICES.find((s) => s.id === 'laundry'); store.state.needs.hygiene = 40;
    expect(bookService(store, 'laundry', t).ok).toBe(true);
    expect(bookService(store, 'laundry', t).ok).toBe(false);
    tickErrands(store, t + sv.secs * 1000); expect(store.state.needs.hygiene).toBe(40 + sv.fx.hygiene);
  });
});

describe('saves', () => {
  it('sanitize keeps valid orders, drops forged ones, and keeps takeout in the bag', () => {
    orderFood(store, 'wok', { ginger_beef: 1 }, t);
    store.state.errands.orders.push({ id: 'x', kind: 'food', at: t, due: t, total: 0, items: { gold_bar: 1 } });
    store.state.inventory.latte = 2;
    const s = sanitize(JSON.parse(JSON.stringify(store.state)));
    expect(s.errands.orders.length).toBe(1); expect(s.inventory.latte).toBe(2);
    expect(sanitizeErrands(null)).toEqual({ orders: [], total: 0 });
  });
});

describe('coming-soon lots', () => {
  it('have unique ids, sit on the island and never inside a neighbourhood', () => {
    expect(new Set(COMING_SOON.map((c) => c.id)).size).toBe(COMING_SOON.length);
    for (const c of COMING_SOON) {
      expect(c.x - c.w / 2 > ISLAND.x0 && c.x + c.w / 2 < ISLAND.x1 && c.z - c.d / 2 > ISLAND.z0 && c.z + c.d / 2 < ISLAND.z1).toBe(true);
      if (!c.block) for (const d of DISTRICTS) expect(Math.hypot(c.x - d.x, c.z - d.z)).toBeGreaterThan(d.r + Math.max(c.w, c.d) / 2);
    }
    expect(Object.keys(comingSoonByBlock).length).toBe(COMING_SOON.filter((c) => c.block).length);
  });
});
