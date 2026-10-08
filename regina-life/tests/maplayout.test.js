import { describe, it, expect } from 'vitest';
import { spreadRects, clusterPoints, placeLabels, clipSegment, overlaps } from '../src/ui/maplayout.js';

const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const anyOverlap = (rs, gap = 0) => { for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (overlaps(rs[i], rs[j], gap)) return [i, j]; return null; };
const inside = (rs, b) => rs.every((r) => r.x - r.w / 2 >= b.x0 - 1e-6 && r.x + r.w / 2 <= b.x1 + 1e-6 && r.y - r.h / 2 >= b.y0 - 1e-6 && r.y + r.h / 2 <= b.y1 + 1e-6);

describe('spreadRects', () => {
  it('leaves already-separate rects where they are', () => {
    const rs = [{ x: 100, y: 100, w: 46, h: 46 }, { x: 300, y: 200, w: 46, h: 46 }];
    spreadRects(rs, { x0: 0, y0: 0, x1: 500, y1: 400 });
    expect(rs[0]).toMatchObject({ x: 100, y: 100 }); expect(rs[1]).toMatchObject({ x: 300, y: 200 });
  });
  it('separates two identical rects stacked on one spot', () => {
    const rs = [{ x: 200, y: 200, w: 46, h: 46 }, { x: 200, y: 200, w: 46, h: 46 }];
    spreadRects(rs, { x0: 0, y0: 0, x1: 500, y1: 400 });
    expect(anyOverlap(rs)).toBeNull();
  });
  it('is deterministic', () => {
    const mk = () => [{ x: 50, y: 50, w: 46, h: 46 }, { x: 60, y: 55, w: 46, h: 46 }, { x: 70, y: 60, w: 46, h: 46 }];
    const a = spreadRects(mk(), { x0: 0, y0: 0, x1: 300, y1: 300 }), b = spreadRects(mk(), { x0: 0, y0: 0, x1: 300, y1: 300 });
    expect(a.map((r) => [r.x, r.y])).toEqual(b.map((r) => [r.x, r.y]));
  });
  it('keeps rects inside the bounds even when the request is outside', () => {
    const b = { x0: 10, y0: 90, x1: 400, y1: 300 }, rs = [{ x: -50, y: 1000, w: 46, h: 46 }, { x: 900, y: -30, w: 46, h: 46 }];
    spreadRects(rs, b); expect(inside(rs, b)).toBe(true);
  });
  it('resolves the crowded "All Regina" case: 13 labelled pins, four of them within a few px of each other', () => {
    const b = { x0: 6, y0: 99, x1: 1094, y1: 400 };
    const spots = [[540, 300], [548, 296], [560, 292], [552, 280], [200, 330], [150, 150], [900, 330], [850, 120], [480, 200], [420, 340], [700, 360], [320, 230], [610, 150]];
    const w = [150, 120, 160, 130, 170, 120, 140, 130, 150, 130, 160, 140, 120];
    const rs = spots.map(([x, y], i) => ({ x, y, w: w[i], h: 70 }));
    spreadRects(rs, b);
    expect(anyOverlap(rs)).toBeNull(); expect(inside(rs, b)).toBe(true);
  });
  it('resolves 13 labelled pins on a phone-sized area (no labels, 46 px pins)', () => {
    const b = { x0: 6, y0: 120, x1: 384, y1: 420 }, rand = lcg(7);
    const rs = Array.from({ length: 13 }, (_, i) => ({ x: 120 + rand() * 150, y: 200 + rand() * 120, w: 46, h: 46 }));
    spreadRects(rs, b); expect(anyOverlap(rs)).toBeNull(); expect(inside(rs, b)).toBe(true);
  });
  it('property: random layouts at up to ~45% fill never overlap and stay inside', () => {
    const rand = lcg(42), b = { x0: 0, y0: 0, x1: 800, y1: 400 };
    for (let trial = 0; trial < 60; trial++) {
      const n = 3 + Math.floor(rand() * 12), rs = [];
      for (let i = 0; i < n; i++) rs.push({ x: 300 + rand() * 200, y: 120 + rand() * 160, w: 46 + rand() * 110, h: 46 + (rand() < 0.5 ? 24 : 0) });
      const fill = rs.reduce((a, r) => a + r.w * r.h, 0) / (800 * 400); if (fill > 0.45) continue;
      spreadRects(rs, b);
      expect(anyOverlap(rs), `trial ${trial} n=${n}`).toBeNull(); expect(inside(rs, b)).toBe(true);
    }
  });
});

describe('clusterPoints', () => {
  it('merges nearby points and leaves distant ones alone', () => {
    const c = clusterPoints([{ sx: 10, sy: 10 }, { sx: 18, sy: 12 }, { sx: 200, sy: 200 }], 26);
    expect(c.map((q) => q.items.length)).toEqual([2, 1]);
  });
  it('never merges a pinned point into a cluster, nor a point into a pinned one', () => {
    const c = clusterPoints([{ sx: 10, sy: 10, pinned: true }, { sx: 12, sy: 10 }, { sx: 14, sy: 10 }], 26);
    expect(c.map((q) => q.items.length)).toEqual([1, 2]);
  });
  it('puts the highest-priority (first) item at the head of its cluster', () => {
    const c = clusterPoints([{ id: 'a', sx: 0, sy: 0 }, { id: 'b', sx: 5, sy: 0 }], 26);
    expect(c[0].items[0].id).toBe('a');
  });
});

describe('placeLabels', () => {
  const B = { x0: 0, y0: 0, x1: 300, y1: 200 };
  it('uses the first side that fits and never overlaps a blocker', () => {
    const out = placeLabels([{ id: 'a', w: 80, h: 16, prio: 1, ax: 100, ay: 100, ar: 12 }], B, []);
    expect(out[0]).toMatchObject({ id: 'a', side: 'right' });
  });
  it('flips to the left near the right edge', () => {
    const out = placeLabels([{ id: 'a', w: 80, h: 16, prio: 1, ax: 280, ay: 100, ar: 12 }], B, []);
    expect(out[0].side).toBe('left'); expect(out[0].x + 80).toBeLessThanOrEqual(B.x1);
  });
  it('drops a label that fits nowhere instead of drawing it over something', () => {
    const out = placeLabels([{ id: 'a', w: 400, h: 16, prio: 1, ax: 100, ay: 100, ar: 12 }], B, []);
    expect(out).toEqual([]);
  });
  it('higher priority wins a contested spot', () => {
    const l = (id, prio) => ({ id, w: 80, h: 16, prio, ax: 100, ay: 100, ar: 0, sides: ['center'] });
    const out = placeLabels([l('low', 1), l('high', 9)], B, []);
    expect(out.map((o) => o.id)).toEqual(['high']);
  });
  it('placed labels never overlap each other or the blockers', () => {
    const rand = lcg(3), labels = Array.from({ length: 25 }, (_, i) => ({ id: 'l' + i, w: 50 + rand() * 60, h: 16, prio: rand(), ax: 20 + rand() * 260, ay: 20 + rand() * 160, ar: 12 }));
    const blockers = labels.map((l) => ({ x0: l.ax - 12, y0: l.ay - 12, x1: l.ax + 12, y1: l.ay + 12 }));
    const out = placeLabels(labels, B, blockers), boxes = out.map((o) => { const l = labels.find((q) => q.id === o.id); return { x0: o.x, y0: o.y, x1: o.x + l.w, y1: o.y + l.h }; });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) expect(boxes[i].x0 < boxes[j].x1 && boxes[i].x1 > boxes[j].x0 && boxes[i].y0 < boxes[j].y1 && boxes[i].y1 > boxes[j].y0).toBe(false);
      for (const bl of blockers) expect(boxes[i].x0 < bl.x1 && boxes[i].x1 > bl.x0 && boxes[i].y0 < bl.y1 && boxes[i].y1 > bl.y0).toBe(false);
    }
  });
});

describe('clipSegment', () => {
  it('returns the inside part of a segment crossing the box', () => {
    expect(clipSegment(-50, 50, 150, 50, 100, 100)).toEqual([0, 50, 100, 50]);
  });
  it('returns null for a segment fully outside', () => { expect(clipSegment(-50, -50, -10, 300, 100, 100)).toBeNull(); });
  it('keeps a fully-inside segment unchanged', () => { expect(clipSegment(10, 10, 90, 90, 100, 100)).toEqual([10, 10, 90, 90]); });
});
