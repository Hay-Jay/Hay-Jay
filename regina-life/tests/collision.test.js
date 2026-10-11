/** world/collision.js: the multi-room extensions (tags with y0, remove, rayBlocked with skip/only) and the behaviour every old caller relies on. */
import { describe, it, expect } from 'vitest';
import { CollisionGrid } from '../src/world/collision.js';

describe('CollisionGrid extensions', () => {
  it('keeps the old add() contract: y0 defaults to 0, tag to null, and garbage is still rejected', () => {
    const g = new CollisionGrid(8), r = g.add(0, 0, 2, 2, 3);
    expect(r).toMatchObject({ x0: 0, z0: 0, x1: 2, z1: 2, h: 3, tag: null, y0: 0 });
    expect(g.add(NaN, 0, 1, 1)).toBeNull(); expect(g.add(0, 0, -1, 1)).toBeNull(); expect(g.add(0, 0, 1e9, 1)).toBeNull();
    expect(g.rayBlocked(-5, 1, 1, 5, 1, 1)).toBeCloseTo(0.5, 9);   // the old six-argument call
  });

  it('stores y0 and the ray only hits a rect inside its y range', () => {
    const g = new CollisionGrid(8); g.add(0, 0, 2, 2, 3, 'beam', 2.0);   // a lintel-like rect from 2.0 to 3.0 m
    expect(g.rects[0].y0).toBe(2);
    expect(g.rayBlocked(-3, 1.0, 1, 5, 1.0, 1)).toBe(1);               // walking under it
    expect(g.rayBlocked(-3, 2.5, 1, 5, 2.5, 1)).toBeCloseTo(3 / 8, 9);   // at lintel height it is in the way
    expect(g.rayBlocked(-3, 3.5, 1, 5, 3.5, 1)).toBe(1);               // above it
    expect(g.rayBlocked(-3, 0.5, 1, 5, 4.5, 1)).toBeLessThan(1);        // a rising ray enters it from below
    const bad = new CollisionGrid(8).add(0, 0, 1, 1, 3, 't', -4); expect(bad.y0).toBe(0); expect(new CollisionGrid(8).add(0, 0, 1, 1, 3, 't', NaN).y0).toBe(0);
  });

  it('skip ignores rects by tag (one tag or a list) and only considers just those', () => {
    const g = new CollisionGrid(8); g.add(0, -1, 1, 1, 3, 'wall'); g.add(4, -1, 5, 1, 3, 'furn'); g.add(8, -1, 9, 1, 3);
    const ray = (o = {}) => g.rayBlocked(-2, 1, 0, 12, 1, 0, o);
    expect(ray()).toBeCloseTo(2 / 14, 9);
    expect(ray({ skip: 'wall' })).toBeCloseTo(6 / 14, 9); expect(ray({ skip: ['wall', 'furn'] })).toBeCloseTo(10 / 14, 9); expect(ray({ skip: ['wall', 'furn', null] })).toBe(1);
    expect(ray({ only: 'wall' })).toBeCloseTo(2 / 14, 9); expect(ray({ only: 'furn' })).toBeCloseTo(6 / 14, 9); expect(ray({ only: 'nothing' })).toBe(1);
    expect(ray({ only: ['furn', 'wall'], skip: 'wall' })).toBeCloseTo(6 / 14, 9);   // skip wins over only
    expect(ray({ only: null, skip: null })).toBeCloseTo(2 / 14, 9);
  });

  it('a doorway between two wall runs lets an only:wall ray through (line of sight) while the wall blocks it', () => {
    const g = new CollisionGrid(8); g.add(-5, -0.1, -0.6, 0.1, 3.3, 'wall'); g.add(0.6, -0.1, 5, 0.1, 3.3, 'wall');
    expect(g.rayBlocked(-2, 0.9, -3, -2, 0.9, 3, { only: 'wall' })).toBeCloseTo(2.9 / 6, 9);   // it enters the 0.2 thick run at z = -0.1
    expect(g.rayBlocked(0, 0.9, -3, 0, 0.9, 3, { only: 'wall' })).toBe(1);
    expect(g.rayBlocked(-2, 0.9, -3, -2, 0.9, 3, { skip: 'wall' })).toBe(1);   // what the walk camera uses
  });

  it('remove() takes one rect out of the lists and the hash cells and leaves the others alone', () => {
    const g = new CollisionGrid(8), a = g.add(0, 0, 30, 2, 2, 'furn'), b = g.add(1, 0, 3, 2, 2, 'furn');   // a spans several cells
    expect(g.remove(a)).toBe(true); expect(g.rects).toEqual([b]);
    expect(g.query(20, 0, 25, 1).size).toBe(0); expect(g.query(1, 0, 3, 2).has(b)).toBe(true);
    expect(g.remove(a)).toBe(false); expect(g.remove(null)).toBe(false); expect(g.remove({ x0: 0 })).toBe(false);
    const p = { x: 2, z: 1 }; expect(g.resolve(p, 0.3)).toBe(true);   // b still collides
    g.remove(b); expect(g.resolve({ x: 2, z: 1 }, 0.3)).toBe(false); expect(g.map.size).toBe(0);
  });

  it('removeTag still works next to remove()', () => {
    const g = new CollisionGrid(8); g.add(0, 0, 1, 1, 1, 'furn'); const keep = g.add(5, 5, 6, 6, 1, 'wall'); g.add(2, 2, 3, 3, 1, 'furn');
    g.removeTag('furn'); expect(g.rects).toEqual([keep]);
  });
});
