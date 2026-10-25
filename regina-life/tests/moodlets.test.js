import { describe, it, expect } from 'vitest';
import { moodlets } from '../src/core/moodlets.js';
describe('moodlets: why you feel this way', () => {
  it('names low needs, the weather and good things, biggest first, at most six', () => {
    const m = moodlets({ needs: { hunger: 5, energy: 90, hygiene: 50, fun: 50, mood: 50 } }, { temp: -22, kind: 'clear', night: 0, home: false, paidToday: 6600 });
    expect(m.map((x) => x.icon)).toContain('🍽️'); expect(m.map((x) => x.icon)).toContain('🥶'); expect(m.map((x) => x.icon)).toContain('💵');
    expect(Math.abs(m[0].v)).toBeGreaterThanOrEqual(Math.abs(m[m.length - 1].v)); expect(m.length).toBeLessThanOrEqual(6);
  });
  it('a warm outfit takes the sting out of the cold; home and rain is cozy', () => {
    expect(moodlets({ needs: {} }, { temp: -20, outfitWarm: true }).find((x) => x.icon === '🥶').v).toBe(0);
    expect(moodlets({ needs: {} }, { kind: 'rain', home: true, cozy: 0.4 }).map((x) => x.icon)).toEqual(expect.arrayContaining(['🌧️', '🛋️']));
  });
  it('an empty save is calm, not an error', () => { expect(Array.isArray(moodlets({}))).toBe(true); expect(moodlets(null)).toEqual([]); });
});
