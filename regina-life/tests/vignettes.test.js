import { describe, it, expect } from 'vitest';
import { VIGNETTES, activeVignettes, vignetteLine } from '../src/core/vignettes.js';
import { POSES } from '../src/player/poses.js';

const day = { hour: 13, temp: 12, kind: 'clear', snow: false, season: 'summer' };
describe('city scenes', () => {
  it('every scene has a pose the character knows and something to say', () => {
    for (const v of VIGNETTES) { expect(POSES[v.pose], v.id).toBeTruthy(); expect(v.lines.length).toBeGreaterThan(0); for (let k = 0; k < 5; k++) expect(vignetteLine(v.id, day, k).length).toBeGreaterThan(3); }
  });
  it('a summer afternoon: busker, reader, painter and a phone call; nobody shovels', () => {
    expect(activeVignettes(day)).toEqual(['busker', 'reader', 'painter', 'caller']);
  });
  it('the weather and the hour decide who is out', () => {
    expect(activeVignettes({ ...day, kind: 'rain' })).toEqual(['caller']);
    expect(activeVignettes({ ...day, hour: 3 })).toEqual([]);
    const snowDay = activeVignettes({ ...day, temp: -12, snow: true, season: 'winter' }); expect(snowDay).toContain('shoveller'); expect(snowDay).not.toContain('painter'); expect(snowDay).not.toContain('reader');
    expect(activeVignettes({ ...day, season: 'autumn' })).toContain('raker'); expect(activeVignettes({ ...day, season: 'autumn', snow: true })).not.toContain('raker');
  });
  it('lines are safe for any index and an unknown scene says nothing', () => {
    expect(vignetteLine('caller', { ...day, temp: -21.4 }, 2)).toMatch(/-21°/); expect(vignetteLine('busker', day, -7)).toBeTruthy(); expect(vignetteLine('nope', day, 1)).toBe('');
  });
});
