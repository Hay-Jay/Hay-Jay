import { describe, it, expect } from 'vitest';
import { homeLots, currentLot } from '../src/core/homeLots.js';
import { HOME_LOTS } from '../src/data/homeLots.js';
import { HOME_ORDER } from '../src/data/homes.js';
import { planMove } from '../src/core/move.js';
import { poiById } from '../src/world/cityData.js';

const at = (layout) => ({ home: { layout, owned: {}, placed: [] } });
describe('home lots on the map', () => {
  it('every home has a lot with a door and a wall to hang it on', () => {
    for (const id of HOME_ORDER) { const l = HOME_LOTS[id]; expect(l, id).toBeTruthy(); for (const v of [l.door.x, l.door.z, l.face.x, l.face.z]) expect(Number.isFinite(v)).toBe(true); expect(Math.hypot(l.door.nx, l.door.nz)).toBe(1); }
    expect(HOME_LOTS.studio.door).toMatchObject({ x: poiById.lofts.x, z: poiById.lofts.z });   // the Studio is the Lofts on the map and in the city
  });
  it('one home, the rest for sale or left behind, priced like the Homes app', () => {
    for (const cur of HOME_ORDER) {
      const lots = homeLots(at(cur)); expect(lots.filter((l) => l.status === 'home')).toHaveLength(1); expect(currentLot(at(cur)).id).toBe(cur);
      for (const l of lots.filter((x) => x.status === 'sale')) expect(l.price).toBe(planMove(at(cur), l.id).price);
      for (const l of lots.filter((x) => x.status !== 'sale')) expect(l.price).toBe(0);
    }
    expect(homeLots(at('studio')).map((l) => l.status)).toEqual(['home', 'sale', 'sale']);
    expect(homeLots(at('onebed')).map((l) => l.status)).toEqual(['past', 'home', 'sale']);
    expect(homeLots(at('bungalow')).map((l) => l.status)).toEqual(['past', 'past', 'home']);
  });
  it('the home pin says so; a broken save falls back to the Studio', () => {
    expect(currentLot(at('bungalow')).name).toBe('Lakeview Bungalow (Home)'); expect(currentLot({}).id).toBe('studio'); expect(currentLot({ home: { layout: 'castle' } }).id).toBe('studio');
  });
});
