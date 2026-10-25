import { describe, it, expect } from 'vitest';
import { whereIs, residentsAt } from '../src/core/routines.js';
import { ROUTINES, RESIDENTS } from '../src/data/residents.js';
import { poiById } from '../src/world/cityData.js';
describe('resident routines', () => {
  it('every resident has a routine and every place is a real place', () => {
    for (const r of RESIDENTS) expect(ROUTINES[r.id], r.id).toBeTruthy();
    for (const rows of Object.values(ROUTINES)) for (const [days, h0, h1, place] of rows) { expect(['wk', 'we', 'all']).toContain(days); expect(h1).toBeGreaterThan(h0); expect(poiById[place], place).toBeTruthy(); }
  });
  it('learnable: same time, same place; weekends differ; nobody out at 3 am', () => {
    expect(whereIs('mei', { weekday: 2, hour: 7 }).place).toBe('market'); expect(whereIs('mei', { weekday: 2, hour: 7 })).toEqual(whereIs('mei', { weekday: 4, hour: 8 }));
    expect(whereIs('tobi', { weekday: 6, hour: 20 }).place).toBe('scarth'); expect(whereIs('tobi', { weekday: 3, hour: 20 })).toBeNull();
    for (const id of Object.keys(ROUTINES)) expect(whereIs(id, { weekday: 2, hour: 3 })).toBeNull();
  });
  it('rain sends people indoors; residentsAt lists who is there', () => {
    expect(whereIs('kaya', { weekday: 2, hour: 12, kind: 'rain' })).toBeNull();
    expect(residentsAt('scarth', { weekday: 2, hour: 12 }).map((x) => x.res.id)).toContain('kaya');
    expect(residentsAt('scarth', { weekday: 2, hour: 12, kind: 'snow' })).toEqual([]);
  });
});
