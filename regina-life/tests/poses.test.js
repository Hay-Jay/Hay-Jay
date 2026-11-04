import { describe, it, expect } from 'vitest';
import { POSES, ACTIVITY_POSE, GIG_POSE, PROP_NAMES, UPPER_KEYS, LOWER_KEYS, applyPose } from '../src/player/poses.js';
import { ACTIVITIES } from '../src/core/game.js';
import { GIG_KINDS } from '../src/data/gigs.js';

const KEYS = [...UPPER_KEYS, ...LOWER_KEYS];
const idle = () => Object.fromEntries(KEYS.map((k) => [k, k === 'hipsY' ? 0.92 : 0]));
describe('activity poses', () => {
  it('every activity and every odd job has a pose (grocery runs carry the bag instead)', () => {
    for (const id of Object.keys(ACTIVITIES)) expect(POSES[ACTIVITY_POSE[id]], id).toBeTruthy();
    for (const g of GIG_KINDS) { expect(Object.keys(GIG_POSE)).toContain(g.id); if (GIG_POSE[g.id]) expect(POSES[GIG_POSE[g.id]], g.id).toBeTruthy(); }
  });
  it('every pose keeps the body in a sane range for a long while', () => {
    for (const [name, p] of Object.entries(POSES)) for (let t = 0; t < 30; t += 0.37) {
      const T = idle(); expect(applyPose(name, t, T)).toBe(p);
      for (const k of KEYS) { expect(Number.isFinite(T[k]), `${name}.${k}`).toBe(true); if (k !== 'hipsY') expect(Math.abs(T[k]), `${name}.${k} at ${t}`).toBeLessThan(3.2); }
      expect(T.hipsY).toBeGreaterThan(0.4); expect(T.hipsY).toBeLessThan(1);
    }
  });
  it('props are ones the character can build', () => { for (const p of Object.values(POSES)) for (const n of p.props ?? []) expect(PROP_NAMES).toContain(n); });
  it('a pose you can walk with only moves the upper body; the rest give way to walking', () => {
    for (const [name, p] of Object.entries(POSES)) {
      const T = idle(), before = { ...T }, r = applyPose(name, 1.3, T, { walking: 1 });
      if (!p.walk) { expect(r, name).toBeNull(); expect(T).toEqual(before); continue; }
      for (const k of LOWER_KEYS) expect(T[k], `${name} touched ${k}`).toBe(before[k]);
    }
  });
  it('seated, a pose leaves the legs to the seat', () => { const T = idle(), before = { ...T }; applyPose('guitar', 2, T, { sitting: true }); for (const k of LOWER_KEYS) expect(T[k]).toBe(before[k]); });
  it('unknown names do nothing', () => { const T = idle(), before = { ...T }; expect(applyPose('toString', 1, T)).toBeNull(); expect(applyPose('nope', 1, T)).toBeNull(); expect(T).toEqual(before); });
});
