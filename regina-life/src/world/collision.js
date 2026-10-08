/** Spatial-hash of axis-aligned rectangles (x/z) with heights. Used for player collision and camera occlusion. */
export class CollisionGrid {
  constructor(cell = 48) { this.cell = cell; this.map = new Map(); this.rects = []; }
  _k(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
  add(x0, z0, x1, z1, h = 10, tag = null) {
    const r = { x0, z0, x1, z1, h, tag };
    this.rects.push(r);
    const c = this.cell;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++)
      for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
        const k = this._k(ix, iz); let a = this.map.get(k); if (!a) this.map.set(k, (a = [])); a.push(r);
      }
    return r;
  }
  /** Remove every rect added with this tag (used to rebuild dynamic furniture colliders). */
  removeTag(tag) {
    this.rects = this.rects.filter((r) => r.tag !== tag);
    for (const [k, a] of this.map) { const f = a.filter((r) => r.tag !== tag); if (f.length) this.map.set(k, f); else this.map.delete(k); }
  }
  query(x0, z0, x1, z1) {
    const c = this.cell, out = new Set();
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++)
      for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
        const a = this.map.get(this._k(ix, iz)); if (a) for (const r of a) out.add(r);
      }
    return out;
  }
  /** Push a circle out of any overlapping rect. Mutates pos {x,z}. Returns true if it collided. */
  resolve(pos, radius) {
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      for (const r of this.query(pos.x - radius, pos.z - radius, pos.x + radius, pos.z + radius)) {
        const cx = Math.max(r.x0, Math.min(pos.x, r.x1)), cz = Math.max(r.z0, Math.min(pos.z, r.z1));
        let dx = pos.x - cx, dz = pos.z - cz; const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        hit = true;
        if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (radius - d) / d; pos.x += dx * k; pos.z += dz * k; }
        else { // centre inside rect: eject through nearest face
          const l = pos.x - r.x0, rr = r.x1 - pos.x, t = pos.z - r.z0, b = r.z1 - pos.z, m = Math.min(l, rr, t, b);
          if (m === l) pos.x = r.x0 - radius; else if (m === rr) pos.x = r.x1 + radius; else if (m === t) pos.z = r.z0 - radius; else pos.z = r.z1 + radius;
        }
      }
    }
    return hit;
  }
  /** Distance fraction (0..1) along ray at which it first enters a rect (below its height), or 1. */
  rayBlocked(ox, oy, oz, tx, ty, tz) {
    const minx = Math.min(ox, tx), maxx = Math.max(ox, tx), minz = Math.min(oz, tz), maxz = Math.max(oz, tz);
    let best = 1;
    const dx = tx - ox, dy = ty - oy, dz = tz - oz;
    for (const r of this.query(minx, minz, maxx, maxz)) {
      let t0 = 0, t1 = 1;
      const slab = (o, d, lo, hi) => {
        if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
        let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b); return t0 <= t1;
      };
      if (slab(ox, dx, r.x0, r.x1) && slab(oy, dy, 0, r.h) && slab(oz, dz, r.z0, r.z1) && t0 < best) best = t0;
    }
    return best;
  }
}
