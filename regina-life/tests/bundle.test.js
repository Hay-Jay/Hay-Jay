import { describe, it, expect } from 'vitest';
import { bundledLook, bundleWeather, dressedWarm, bundleGaps, BUNDLE_AT, SCARF_AT } from '../src/core/bundle.js';
import { DEFAULT_LOOK, STARTER_WARDROBE } from '../src/data/catalog.js';

const look = { ...DEFAULT_LOOK };   // navy tee, no hat, no scarf
const all = [...STARTER_WARDROBE, 'hoodie_grey', 'jacket_green', 'jacket_black', 'toque_red', 'toque_grey', 'scarf_plaid', 'cap_navy'];
describe('Bundle up', () => {
  it('only when it is cold and you are outside', () => {
    expect(bundleWeather(BUNDLE_AT)).toBe(true); expect(bundleWeather(BUNDLE_AT + 1)).toBe(false); expect(bundleWeather(-20, false)).toBe(false); expect(bundleWeather(null)).toBe(false);
    expect(bundledLook(look, all, { temp: 4 })).toBe(look); expect(bundledLook(look, all, { temp: -20, outdoors: false })).toBe(look); expect(bundledLook(look, all, { temp: -20, on: false })).toBe(look);
  });
  it('pulls on the warmest owned coat and a toque; a scarf only in the deep cold', () => {
    const b = bundledLook(look, all, { temp: -8 }); expect(b).toMatchObject({ top: 'jacket_black', head: 'toque_grey', neck: 'none_neck' }); expect(dressedWarm(b)).toBe(true);
    expect(bundledLook(look, all, { temp: SCARF_AT }).neck).toBe('scarf_plaid');
    expect(look.top).toBe('tee_navy');   // the saved look is never touched
  });
  it('keeps what is already warm, and swaps a ball cap for a toque', () => {
    const own = { ...look, top: 'hoodie_grey', head: 'toque_red' }; expect(bundledLook(own, all, { temp: -30 })).toMatchObject({ top: 'hoodie_grey', head: 'toque_red', neck: 'scarf_plaid' });
    expect(bundledLook({ ...look, head: 'cap_navy' }, all, { temp: -10 }).head).toBe('toque_grey');
  });
  it('never invents clothes you do not own', () => {
    expect(bundledLook(look, STARTER_WARDROBE, { temp: -25 })).toBe(look);
    expect(bundleGaps(look, STARTER_WARDROBE)).toEqual(['a warm coat', 'a toque']); expect(bundleGaps(look, all)).toEqual([]);
    expect(bundledLook(look, ['bogus', null, 'toque_red'], { temp: -10 })).toMatchObject({ top: 'tee_navy', head: 'toque_red' }); expect(bundledLook(look, undefined, { temp: -10 })).toBe(look);
  });
});
