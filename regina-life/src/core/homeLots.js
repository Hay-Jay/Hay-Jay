/**
 * Home lots on the map (docs/AMAZING.md): every home as a place in Regina, seen from where you live now. Pure rules over the state, so the maps,
 * the place cards and the For Sale signs all agree with the Homes app (core/move.js prices the moves).
 *   status 'home' = where you live, 'sale' = a home you could move up to (price = what the move costs you), 'past' = a home you have moved on from
 */
import { HOMES, HOME_ORDER, layoutOf } from '../data/homes.js';
import { HOME_LOTS } from '../data/homeLots.js';

export function homeLots(state) {
  const cur = layoutOf(state);
  return HOME_ORDER.map((id) => {
    const h = HOMES[id], lot = HOME_LOTS[id], status = id === cur.id ? 'home' : h.tier > cur.tier ? 'sale' : 'past';
    return { id, pin: 'home_' + id, status, building: lot.building, unit: lot.unit, title: h.title, name: status === 'home' ? `${lot.building} (Home)` : lot.building,
      emoji: status === 'home' ? '🏠' : lot.emoji, x: lot.door.x, z: lot.door.z, door: lot.door, face: lot.face, area: lot.area, blurb: lot.blurb,
      rooms: h.rooms.length, tier: h.tier, price: status === 'sale' ? h.price - cur.price : 0 };
  });
}
/** The lot you live in. */
export const currentLot = (state) => homeLots(state).find((l) => l.status === 'home');
