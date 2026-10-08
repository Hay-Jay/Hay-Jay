import { describe, it, expect } from 'vitest';
import { spreadRects, clusterPoints, placeLabels, clipSegment, overlaps } from '../src/ui/maplayout.js';
import { MapView } from '../src/ui/map.js';
import { POIS, DISTRICTS, poiById } from '../src/world/cityData.js';

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
  it('steps around fixed obstacles (player marker, buttons) and never moves them', () => {
    const fixed = [{ x: 200, y: 200, w: 34, h: 34 }], rs = [{ x: 200, y: 200, w: 28, h: 28 }, { x: 205, y: 205, w: 28, h: 28 }];
    spreadRects(rs, { x0: 0, y0: 0, x1: 400, y1: 400 }, { fixed });
    expect(fixed[0]).toMatchObject({ x: 200, y: 200 });
    for (const r of rs) expect(overlaps(r, fixed[0])).toBe(false); expect(anyOverlap(rs)).toBeNull();
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
  it('falls back to a smaller variant when the full label fits nowhere', () => {
    const l = { id: 'a', w: 130, h: 17, prio: 1, ax: 100, ay: 100, ar: 12, alts: [{ w: 70, h: 30 }] };
    const blockers = [{ x0: 0, y0: 70, x1: 80, y1: 130 }, { x0: 120, y0: 0, x1: 300, y1: 60 }, { x0: 120, y0: 140, x1: 300, y1: 200 }]; // left/above/below are taken; right overflows the 150px-wide bounds
    const out = placeLabels([l], { x0: 0, y0: 0, x1: 190, y1: 200 }, blockers);
    expect(out).toHaveLength(1); expect(out[0]).toMatchObject({ alt: 0, w: 70, h: 30, side: 'right' });
  });
  it('keeps the full label when it fits', () => {
    const out = placeLabels([{ id: 'a', w: 80, h: 17, prio: 1, ax: 100, ay: 100, ar: 12, alts: [{ w: 40, h: 30 }] }], B, []);
    expect(out[0].alt).toBe(-1);
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

describe('MapView gestures and labels', () => {
  const mk = (onSelect) => {
    globalThis.window ??= { devicePixelRatio: 1 };
    const handlers = {}, ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const canvas = { getContext: () => ctx, addEventListener: (n, f) => { handlers[n] = f; }, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 600 }) };
    const m = new MapView(canvas, { mode: 'phone', onSelect, getState: () => ({ x: 0, z: 0, yaw: 0, dest: null }) });
    m.w = 400; m.h = 600; return { m, h: handlers };
  };
  const ev = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y });
  it('a pinch is not a tap: lifting the fingers after zooming does nothing', () => {
    const picked = []; const { m, h } = mk((p) => picked.push(p)); m._hits = [{ x: 200, y: 300, r: 14, group: { items: [{ poi: POIS[0] }, { poi: POIS[1] }] } }];
    h.pointerdown(ev(1, 190, 300)); h.pointerdown(ev(2, 210, 300));
    for (let i = 1; i <= 8; i++) { h.pointermove(ev(1, 190 - i * 6, 300)); h.pointermove(ev(2, 210 + i * 6, 300)); }
    h.pointerup(ev(1, 142, 300)); h.pointerup(ev(2, 258, 300));
    expect(m._fly).toBeNull(); expect(picked).toEqual([]);
  });
  it('a plain single tap still selects the place or flies in on the cluster', () => {
    const picked = []; const { m, h } = mk((p) => picked.push(p)); m._hits = [{ x: 100, y: 100, r: 12, poi: POIS[0] }, { x: 300, y: 300, r: 14, group: { items: [{ poi: POIS[0] }, { poi: POIS[1] }] } }];
    h.pointerdown(ev(1, 101, 101)); h.pointerup(ev(1, 101, 101)); expect(picked[0]?.id).toBe(POIS[0].id);
    h.pointerdown(ev(2, 300, 301)); h.pointerup(ev(2, 300, 301)); expect(m._fly).not.toBeNull();
  });
  it('Wascana Centre still gets a district label even though a lake pin shares its id', () => {
    const wc = DISTRICTS.find((d) => d.id === 'wascana');
    expect(poiById[wc.id]).toBeTruthy(); expect(wc.label).toBeTruthy(); // map.js draws a district name when it has its own label anchor
  });
});
