/**
 * Pure view-model for the phone's Homes app: (state) -> one card per home, plus the move confirmation text and a small floor-plan sketch.
 * No DOM, no THREE, no ledger writes: every number comes from core/move.js (tierOptions, the same plan upgradeHome executes), and the UI
 * only formats it. docs/HOMES.md section 6.
 */
import { tierOptions } from '../core/move.js';
import { HOMES } from '../data/homes.js';
import { fmtMoney as defaultFmt } from '../core/ledger.js';

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * One card per home, smallest first:
 * { id, name, title, blurb, tier, rooms, roomNames, roomsLabel ('2 rooms'), areaLabel ('99 m2'),
 *   badge: 'Current' | 'Owned' | null, current, owned,
 *   canMove (strictly higher: only these get a Move in button), canAfford, price (cents to move there now, 0 when not movable), priceLabel, shortBy (cents), reason ('' | 'Need $x more' | why the move is impossible),
 *   carried, stored (pieces that come along / go to storage), planLabel ('7 pieces come with you and 2 go to storage') }
 */
export function homeCards(state, fmt = defaultFmt) {
  const balance = Number.isFinite(state?.bank?.balance) ? state.bank.balance : 0;
  return tierOptions(state).map((o) => {
    const shortBy = o.canMove ? Math.max(0, o.price - balance) : 0, carried = o.planned?.carried ?? 0, stored = o.planned?.stored ?? 0;
    return {
      id: o.id, name: o.name, title: o.title, blurb: o.blurb, tier: o.tier, rooms: o.rooms, roomNames: o.roomNames,
      roomsLabel: plural(o.rooms, 'room'), areaLabel: `${o.area} m²`,
      badge: o.current ? 'Current' : o.owned ? 'Owned' : null, current: !!o.current, owned: !!o.owned,
      canMove: !!o.canMove, canAfford: !!o.canAfford, price: o.canMove ? o.price : 0, priceLabel: o.canMove ? fmt(o.price) : '',
      shortBy, reason: !o.canMove ? (o.error ?? '') : o.canAfford ? '' : `Need ${fmt(shortBy)} more`,
      carried, stored, planLabel: o.canMove ? planText(carried, stored) : '',
    };
  });
}

/** "7 pieces come with you and 2 go to storage" (with the empty cases said plainly). */
export function planText(carried, stored) {
  if (!carried && !stored) return 'You have nothing placed, so there is nothing to carry';
  if (!stored) return carried === 1 ? 'Your 1 placed piece comes with you' : `All ${carried} of your placed pieces come with you`;
  if (!carried) return `${plural(stored, 'piece')} will go to storage`;
  return `${plural(carried, 'piece')} ${carried === 1 ? 'comes' : 'come'} with you and ${stored} ${stored === 1 ? 'goes' : 'go'} to storage`;
}

/** The arguments of ctx.confirm(title, text, yes) for moving into this card's home: one plain sentence with the price and where the furniture goes. */
export function moveConfirm(card, fmt = defaultFmt) {
  return { title: `Move to the ${card.name}?`, text: `It costs ${fmt(card.price)}; ${planText(card.carried, card.stored).replace(/^./, (c) => c.toLowerCase())}.`, yes: 'Move in' };
}

const ROOM_FILL = { living: '#f1d9a0', bedroom: '#c9ddf2', bath: '#bfe8e0', den: '#d8cdee', garage: '#cdd2d8' };
/**
 * A little floor plan of a home as an SVG string (one rect per room, to scale, north up). Pure string from the layout data; `size` is the box in px.
 */
export function planSvg(layoutOrId, size = 84) {
  const L = typeof layoutOrId === 'string' ? HOMES[layoutOrId] : layoutOrId; if (!L?.rooms?.length) return '';
  const xs = L.rooms.flatMap((r) => [r.floor.x0, r.floor.x1]), zs = L.rooms.flatMap((r) => [r.floor.z0, r.floor.z1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const k = (size - 8) / Math.max(x1 - x0, z1 - z0), ox = (size - (x1 - x0) * k) / 2, oz = (size - (z1 - z0) * k) / 2, f = (v) => Math.round(v * 10) / 10;
  const rects = L.rooms.map((r) => `<rect x="${f(ox + (r.floor.x0 - x0) * k)}" y="${f(oz + (r.floor.z0 - z0) * k)}" width="${f((r.floor.x1 - r.floor.x0) * k)}" height="${f((r.floor.z1 - r.floor.z0) * k)}" rx="1.5" fill="${ROOM_FILL[r.type] ?? '#e6e0d4'}" stroke="#12202a" stroke-width="1.2" data-room="${r.id}"/>`).join('');
  return `<svg class="hm-plan" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${L.rooms.length === 1 ? 'Floor plan: one room' : `Floor plan: ${L.rooms.map((r) => r.name).join(', ')}`}">${rects}</svg>`;
}
