/**
 * Pure 2D layout helpers shared by the home-screen pins and the canvas maps (no DOM, no three.js).
 * They are what keeps pins and labels from piling on top of each other.
 */

/** Do two centre-based rects {x,y,w,h} overlap (with an optional gap)? */
export const overlaps = (a, b, gap = 0) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap;

/**
 * Give every centre-based rect {x,y,w,h} its own space: rects that already have room stay exactly where they asked
 * to be; the rest take the nearest free slot (searching outward, preferring straight up since pins hang above their
 * spot), always inside `bounds` {x0,y0,x1,y1}. `fixed` rects (e.g. the player marker) are obstacles that never move. Mutates and returns the rects; each gets `ox/oy` = its requested spot.
 * Deterministic and always finds room when any exists, so a slowly moving scene never flickers or stacks pins.
 */
export function spreadRects(rects, bounds, { gap = 4, step = 6, fixed = [], maxRadius = 520 } = {}) {
  const clamp = (r, x, y) => [Math.min(bounds.x1 - r.w / 2, Math.max(bounds.x0 + r.w / 2, x)), Math.min(bounds.y1 - r.h / 2, Math.max(bounds.y0 + r.h / 2, y))];
  const fits = (r, x, y) => x - r.w / 2 >= bounds.x0 && x + r.w / 2 <= bounds.x1 && y - r.h / 2 >= bounds.y0 && y + r.h / 2 <= bounds.y1;
  for (const r of rects) { r.ox = r.x; r.oy = r.y; [r.x, r.y] = clamp(r, r.x, r.y); r.cx = r.x; r.cy = r.y; }
  // rects nobody else wants the spot of are placed first and never move
  const wanted = rects.map((r, i) => fixed.some((f) => overlaps({ x: r.cx, y: r.cy, w: r.w, h: r.h }, f, gap)) || rects.some((o, j) => j !== i && overlaps({ x: r.cx, y: r.cy, w: r.w, h: r.h }, { x: o.cx, y: o.cy, w: o.w, h: o.h }, gap)));
  const order = rects.map((_, i) => i).sort((a, b) => (wanted[a] - wanted[b]) || a - b), placed = fixed.slice();
  const free = (r, x, y) => placed.every((o) => !overlaps({ x, y, w: r.w, h: r.h }, o, gap));
  for (const i of order) {
    const r = rects[i];
    if (!free(r, r.cx, r.cy)) {
      let found = null;
      const maxR = Math.min(maxRadius, Math.hypot(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0));
      for (let rho = step; rho <= maxR && !found; rho += step) {
        const n = Math.max(8, Math.round((2 * Math.PI * rho) / step));
        for (let m = 0; m < n && !found; m++) {
          const th = -Math.PI / 2 + (m % 2 ? 1 : -1) * Math.ceil(m / 2) * ((2 * Math.PI) / n), x = r.cx + rho * Math.cos(th), y = r.cy + rho * Math.sin(th);
          if (fits(r, x, y) && free(r, x, y)) found = [x, y];
        }
      }
      if (found) [r.x, r.y] = found; // else the area is genuinely full: leave it at its (clamped) spot rather than lose it
    }
    placed.push(r);
  }
  for (const r of rects) { delete r.cx; delete r.cy; }
  return rects;
}

/**
 * Greedy screen-space clustering. `pts` = [{ sx, sy, pinned? }], highest priority first (the caller sorts).
 * Pinned points (selected place, destination) stay on their own. Returns [{ items, sx, sy }].
 */
export function clusterPoints(pts, radius) {
  const out = [];
  for (const p of pts) {
    const host = p.pinned ? null : out.find((c) => !c.pinned && Math.hypot(c.sx - p.sx, c.sy - p.sy) < radius);
    if (host) {
      host.items.push(p);
      host.sx = host.items.reduce((a, q) => a + q.sx, 0) / host.items.length;
      host.sy = host.items.reduce((a, q) => a + q.sy, 0) / host.items.length;
    } else out.push({ items: [p], sx: p.sx, sy: p.sy, pinned: !!p.pinned });
  }
  return out;
}

const hit = (a, b, pad) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

/**
 * Place text labels without collisions. labels = [{ id, w, h, prio, ax, ay, ar?, sides? }]: the label hangs off the
 * anchor point (ax,ay) with radius `ar`, trying each of `sides` (right, left, above, below, center) in order.
 * `blockers` are rects {x0,y0,x1,y1} that are already taken (pins). Higher `prio` is placed first; a label that
 * fits nowhere is dropped rather than drawn on top of something. Returns [{ id, x, y, side }] (x,y = top-left).
 */
export function placeLabels(labels, bounds, blockers = [], pad = 2) {
  const taken = blockers.slice(), placed = [];
  const order = labels.map((l, i) => [l, i]).sort((a, b) => b[0].prio - a[0].prio || a[1] - b[1]);
  for (const [l] of order) {
    const r = l.ar ?? 0, gap = 4;
    for (const side of l.sides ?? ['right', 'left', 'above', 'below']) {
      const x = side === 'right' ? l.ax + r + gap : side === 'left' ? l.ax - r - gap - l.w : l.ax - l.w / 2;
      const y = side === 'above' ? l.ay - r - gap - l.h : side === 'below' ? l.ay + r + gap : l.ay - l.h / 2;
      const box = { x0: x, y0: y, x1: x + l.w, y1: y + l.h };
      if (box.x0 < bounds.x0 || box.y0 < bounds.y0 || box.x1 > bounds.x1 || box.y1 > bounds.y1) continue;
      if (taken.some((t) => hit(box, t, pad))) continue;
      taken.push(box); placed.push({ id: l.id, x, y, side }); break;
    }
  }
  return placed;
}

/** Liang–Barsky: the part of segment (x0,y0)→(x1,y1) inside [0,w]×[0,h], or null. */
export function clipSegment(x0, y0, x1, y1, w, h) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0], [dx, w - x0], [-dy, y0], [dy, h - y0]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}
