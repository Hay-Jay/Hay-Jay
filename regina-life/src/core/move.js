/**
 * Moving house (docs/HOMES.md section 4): Studio -> One-bedroom -> Bungalow. Pure rules over the store, like core/home.js.
 *   planMove(state, tierId)   what a move WOULD do, without touching anything: { ok, price, kept[], stored[], carried, storedCount, ... } | { ok: false, error }
 *   upgradeHome(store, tierId) do it, all-or-nothing: one debit, then the layout and the surviving pieces change, then one commit('home')
 *   tierOptions(state)         one card per home for the Homes app, priced and planned with the same plan
 * Prices are cumulative home value in integer cents (0 / 150000 / 500000); a move costs the difference, so Studio -> Bungalow is 5,000 in one go
 * or 1,500 + 3,500 in two. Nothing is ever deleted: a placed piece that still validates in the new layout (same raw x, z, rot) stays, the rest
 * simply stop being placed (they are still owned, so they wait in storage). No downgrades, no same-tier moves, no rent yet.
 */
import { HOMES, HOME_ORDER, layoutOf } from '../data/homes.js';
import { own } from './util.js';
import { validatePlacement } from './home.js';

const placedOf = (s) => (Array.isArray(s?.home?.placed) ? s.home.placed : []);
const area = (layout) => Math.round(layout.rooms.reduce((a, r) => a + (r.floor.x1 - r.floor.x0) * (r.floor.z1 - r.floor.z0), 0));

/** What moving to `tierId` would do: { ok, from, to, name, title, price, kept, stored, carried, storedCount } or { ok: false, error }. Deterministic and pure. */
export function planMove(state, tierId) {
  if (typeof tierId !== 'string' || !own(HOMES, tierId)) return { ok: false, error: 'Unknown home' };
  const from = layoutOf(state), to = HOMES[tierId];
  if (to.id === from.id) return { ok: false, error: 'Already living there' };
  if (to.tier < from.tier) return { ok: false, error: 'No downgrades' };
  const price = to.price - from.price;
  if (!Number.isSafeInteger(price) || price <= 0) return { ok: false, error: 'No downgrades' };
  const kept = [], stored = [];
  for (const p of placedOf(state)) {
    if (kept.length < to.maxPlaced && validatePlacement(to, kept, p.type, p.x, p.z, p.rot).ok) kept.push(p); else stored.push(p);
  }
  return { ok: true, from: from.id, to: to.id, name: to.name, title: to.title, price, kept, stored, carried: kept.length, storedCount: stored.length };
}

/**
 * Pay for and move into a higher home. All-or-nothing: the plan is computed once, the ledger is debited, and only then does anything change
 * (layout, placed = the pieces that fit, rooms keys that no longer exist are dropped), with a single commit('home'). Any refusal (unknown or
 * same or lower tier, not enough money, ledger error) leaves the state and the balance exactly as they were.
 */
export function upgradeHome(store, tierId) {
  const s = store.state, plan = planMove(s, tierId); if (!plan.ok) return plan;
  const r = store.ledger.debit(plan.price, `Moved to ${HOMES[tierId].name}`, { category: 'purchase' }); if (!r.ok) return r;
  const h = (s.home ||= { owned: {}, placed: [] }), target = HOMES[tierId], rooms = {};
  if (h.rooms && typeof h.rooms === 'object' && !Array.isArray(h.rooms)) for (const rm of target.rooms) if (own(h.rooms, rm.id)) rooms[rm.id] = h.rooms[rm.id];
  h.layout = target.id; h.placed = plan.kept; h.rooms = rooms;
  store.commit('home');
  return { ok: true, price: plan.price, from: plan.from, to: plan.to, name: plan.name, title: plan.title, carried: plan.carried, storedCount: plan.storedCount };
}

/**
 * One card per home, smallest first, for the Homes app:
 * [{ id, name, title, blurb, tier, rooms, roomNames, area (m2), price (cents to move there now; 0 for the current or a lower home), current, owned (you have lived
 *    there: the current home and the lower ones), canMove (a strictly higher home), canAfford, planned: { carried, stored }, error? }]
 */
export function tierOptions(state) {
  const cur = layoutOf(state), balance = Number.isFinite(state?.bank?.balance) ? state.bank.balance : 0;
  return HOME_ORDER.map((id) => {
    const L = HOMES[id], plan = planMove(state, id), canMove = plan.ok;
    return { id, name: L.name, title: L.title, blurb: L.blurb, tier: L.tier, rooms: L.rooms.length, roomNames: L.rooms.map((r) => r.name), area: area(L), price: canMove ? plan.price : 0,
      current: id === cur.id, owned: L.tier <= cur.tier, canMove, canAfford: canMove && balance >= plan.price, planned: { carried: canMove ? plan.carried : 0, stored: canMove ? plan.storedCount : 0 }, ...(canMove ? {} : { error: plan.error }) };
  });
}
