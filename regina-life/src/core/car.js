/**
 * Your own car: buy one from Prairie Motors (Autos app), then drive it anywhere outdoors in Regina (G, or the Drive chip). Driving is free;
 * a car is a one-off purchase you can sell back for half. Prices are game-paced (a few weeks of shifts), not real sticker prices.
 * Pure rules over a Store.
 */
import { own, clampNum } from './util.js';
import { notify, tally } from './game.js';
import { fmtMoney } from './ledger.js';

/** speed: top speed in m/s (about 50 to 65 km/h in town); boost with Shift. */
export const CARS = {
  hatch:  { id: 'hatch',  name: 'Used Hatchback',  icon: '🚗', price: 120000, speed: 14, blurb: 'Older, a little rusty, starts every winter morning. Mostly.', shape: 'hatch' },
  sedan:  { id: 'sedan',  name: 'City Sedan',      icon: '🚙', price: 280000, speed: 16, blurb: 'Comfy seats, heated mirrors, cup holders for days.', shape: 'sedan' },
  pickup: { id: 'pickup', name: 'Prairie Pickup',  icon: '🛻', price: 450000, speed: 17, blurb: 'Big, tough and very Saskatchewan. Fits a whole sofa.', shape: 'pickup' },
};
export const CAR_COLORS = ['#c0392b', '#1f5fa8', '#2e7d4f', '#f2f0ea', '#24262b', '#e0a526'];
export const SELL_BACK = 0.5;

export function sanitizeCar(c) {
  if (!c || typeof c !== 'object' || !own(CARS, c.model)) return null;
  return { model: c.model, color: Number.isInteger(c.color) && c.color >= 0 && c.color < CAR_COLORS.length ? c.color : 0, since: clampNum(c.since, 0, 4e12, 0) };
}
export const carOf = (s) => sanitizeCar(s.car);
export function buyCar(store, model, color = 0, now = store.now()) {
  const s = store.state; if (!own(CARS, model)) return { ok: false, error: 'Unknown car' };
  if (carOf(s)) return { ok: false, error: 'You already own a car. Sell it first.' };
  const c = CARS[model]; if (store.ledger.balance < c.price) return { ok: false, error: `You need ${fmtMoney(c.price)}.` };
  const r = store.ledger.debit(c.price, `Prairie Motors: ${c.name}`, { category: 'purchase' }); if (!r.ok) return r;
  s.car = sanitizeCar({ model, color, since: now });
  notify(store, { app: 'autos', title: `${c.icon} Your ${c.name} is ready!`, body: 'Outside, press G or tap Drive to get in. Drive anywhere in Regina.' });
  tally(s, 'cars'); store.commit('car'); return { ok: true, car: s.car };
}
export function sellCar(store) {
  const s = store.state, c = carOf(s); if (!c) return { ok: false, error: 'You do not own a car.' };
  const refund = Math.floor(CARS[c.model].price * SELL_BACK);
  store.ledger.credit(refund, `Prairie Motors buy-back: ${CARS[c.model].name}`, { category: 'income' });
  s.car = null; store.commit('car'); store.commit('bank'); return { ok: true, refund };
}
export function repaintCar(store, color) {
  const s = store.state, c = carOf(s); if (!c) return { ok: false, error: 'You do not own a car.' };
  if (!(Number.isInteger(color) && color >= 0 && color < CAR_COLORS.length)) return { ok: false, error: 'Unknown colour' };
  c.color = color; s.car = c; store.commit('car'); return { ok: true };
}
