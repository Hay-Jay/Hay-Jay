import { DISTRICTS, POIS, poiById, mapRoads, lakePolygon, PARK_RECT, PITCH, GRID, ROAD_W } from '../world/cityData.js';
import { clusterPoints, placeLabels, clipSegment, spreadRects } from './maplayout.js';

const ROADS = mapRoads(), LAKE = lakePolygon();
const THEME = { bg: '#161b24', block: '#1f2733', park: '#1c3a2c', water: '#1d4a6b', road: '#3a4455', art: '#59657a', label: '#c9d3e3', pin: '#ffb347', me: '#4da3ff', dest: '#ff5a5f', open: '#2ecc71' };
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
const PRIO = { home: 60, shop: 55, gym: 55, landmark: 40, school: 30, transport: 30, district: 20 };
const shortName = (n) => n.replace(/ \(Home\)/, '');

/**
 * 2D city map used by the minimap, the full-screen map and the phone Maps app.
 * Places are emoji badges; crowded places merge into a numbered cluster you tap to zoom into; labels never overlap.
 */
export class MapView {
  constructor(canvas, { mode = 'full', onSelect = null, getState } = {}) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.mode = mode; this.onSelect = onSelect; this.getState = getState;
    this.cx = 0; this.cz = 300; this.scale = mode === 'mini' ? 0.55 : 0.12; this.selected = null; this.follow = mode === 'mini';
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.pointers = new Map(); this.moved = 0; this._hits = []; this._fly = null;
    if (mode !== 'mini') this._bind();
  }
  resize() {
    const r = this.c.getBoundingClientRect(); if (!r.width) return;
    const w = Math.round(r.width * this.dpr), h = Math.round(r.height * this.dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.w = r.width; this.h = r.height;
  }
  _bind() {
    const c = this.c;
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.moved = 0; this.follow = false; this._fly = null; });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size === 2) { const a = [...this.pointers.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (this._pd) this.zoomBy(d / this._pd); this._pd = d; return; }
      this.moved += Math.abs(dx) + Math.abs(dy); this.cx -= dx / this.scale; this.cz -= dy / this.scale;
    });
    const up = (e) => {
      const had = this.pointers.has(e.pointerId); this.pointers.delete(e.pointerId); this._pd = 0;
      if (had && this.moved < 6 && this.pointers.size === 0) this._tap(e);
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this._pd = 0; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, e); }, { passive: false });
  }
  zoomBy(f, e) {
    const old = this.scale; this.scale = Math.min(2.2, Math.max(0.035, this.scale * f)); this._fly = null;
    if (e) { const r = this.c.getBoundingClientRect(), mx = e.clientX - r.left - r.width / 2, mz = e.clientY - r.top - r.height / 2; this.cx += mx / old - mx / this.scale; this.cz += mz / old - mz / this.scale; }
  }
  _tap(e) {
    const r = this.c.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    let best = null, bd = Infinity;
    for (const h of this._hits) { const d = Math.hypot(h.x - sx, h.y - sy); if (d < Math.max(h.r + 8, 24) && d < bd) { bd = d; best = h; } }
    if (best?.group) { this._zoomToGroup(best.group); return; }
    if (best?.poi) { this.selected = best.poi.id; this.onSelect?.(best.poi); return; }
    const x = (sx - this.w / 2) / this.scale + this.cx, z = (sy - this.h / 2) / this.scale + this.cz; this.selected = null; this.onSelect?.({ id: 'custom', name: 'Dropped pin', cat: 'pin', x, z });
  }
  /** Fly in on a cluster until its places separate (at least 30 px between the closest pair). */
  _zoomToGroup(group) {
    const pts = group.items.map((i) => i.poi), xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    let dmin = Infinity; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z); if (d > 0.5) dmin = Math.min(dmin, d); }
    const extent = Math.max(x1 - x0, z1 - z0, 60), want = (Math.min(this.w, this.h) * 0.5) / extent;
    const scale = Math.max(Math.max(this.scale * 1.7, Math.min(want, this.scale * 6)), Number.isFinite(dmin) ? 30 / dmin : 0);
    this._fly = { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, scale: Math.min(2.2, scale) };
    this.follow = false;
  }
  toScreen(x, z) { return [(x - this.cx) * this.scale + this.w / 2, (z - this.cz) * this.scale + this.h / 2]; }
  focus(x, z, scale) { this.cx = x; this.cz = z; if (scale) this.scale = scale; this.follow = false; this._fly = null; }

  draw() {
    this.resize(); if (!this.w) return;
    const g = this.g, st = this.getState(), s = this.scale, mini = this.mode === 'mini';
    if (this._fly) {
      const now = performance.now(), dt = Math.min(0.1, (now - (this._t ?? now)) / 1000), f = this._fly, k = 1 - Math.exp(-dt * 14); this.cx += (f.cx - this.cx) * k; this.cz += (f.cz - this.cz) * k; this.scale += (f.scale - this.scale) * k;
      if (Math.abs(f.scale - this.scale) < f.scale * 0.01 && Math.hypot(f.cx - this.cx, f.cz - this.cz) < 2 / this.scale) { this.cx = f.cx; this.cz = f.cz; this.scale = f.scale; this._fly = null; }
    }
    this._t = performance.now();
    if (this.follow) { this.cx = st.x; this.cz = st.z; }
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = THEME.bg; g.fillRect(0, 0, this.w, this.h);
    const P = (x, z) => this.toScreen(x, z);
    // park
    let [a, b] = P(PARK_RECT.x0, PARK_RECT.z0), [c2, d] = P(PARK_RECT.x1, PARK_RECT.z1);
    g.fillStyle = THEME.park; g.fillRect(a, b, c2 - a, d - b);
    // district tints
    if (!mini || this.scale > 0.3) for (const dd of DISTRICTS) { if (dd.detail === 'playable') continue; const [x, y] = P(dd.x, dd.z); g.fillStyle = dd.color + '22'; g.beginPath(); g.arc(x, y, dd.r * this.scale, 0, 7); g.fill(); }
    // blocks
    if (this.scale > 0.08) {
      g.fillStyle = THEME.block;
      for (let i = GRID.i0; i < GRID.i1; i++) for (let j = GRID.j0; j < GRID.j1; j++) {
        const [x0, y0] = P(i * PITCH + ROAD_W / 2, j * PITCH + ROAD_W / 2), [x1, y1] = P((i + 1) * PITCH - ROAD_W / 2, (j + 1) * PITCH - ROAD_W / 2);
        if (x1 < 0 || y1 < 0 || x0 > this.w || y0 > this.h) continue; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    // lake
    g.fillStyle = THEME.water; g.beginPath(); LAKE.forEach(([x, z], i) => { const [px, py] = P(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill();
    // roads (the stylised links between districts are drawn faint so they read as context, not as streets)
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of ROADS) {
      g.globalAlpha = r.outer ? 0.4 : 1;
      g.strokeStyle = r.kind === 'arterial' ? THEME.art : THEME.road; g.lineWidth = Math.max(r.kind === 'arterial' ? 2 : 1, (r.kind === 'arterial' ? 16 : 12) * this.scale);
      g.beginPath(); r.pts.forEach(([x, z], i) => { const [px, py] = P(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    }
    g.globalAlpha = 1;
    // destination route
    const dest = st.dest;
    if (dest) {
      const [mx, my] = P(st.x, st.z), [dx, dy] = P(dest.x, dest.z);
      g.setLineDash([8, 7]); g.strokeStyle = THEME.dest; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, my); g.lineTo(dx, dy); g.stroke(); g.setLineDash([]);
    }
    this._hits = [];
    const [px, py] = P(st.x, st.z);

    if (mini) this._drawMiniPois(g, st, P);
    else this._drawPlaces(g, st, P, px, py);

    if (dest && dest.id === 'custom') { const [x, y] = P(dest.x, dest.z); g.fillStyle = THEME.dest; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.stroke(); }
    // player
    g.save(); g.translate(px, py); g.rotate(-st.yaw + Math.PI); // yaw 0 faces +z (south = down on map)
    g.fillStyle = THEME.me + '33'; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill();
    g.fillStyle = THEME.me; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
    if (mini) { g.strokeStyle = '#ffffff30'; g.lineWidth = 2; g.strokeRect(1, 1, this.w - 2, this.h - 2); g.fillStyle = '#fff9'; g.font = '700 10px system-ui'; g.textAlign = 'center'; g.fillText('N', this.w / 2, 11); }
    // scale bar
    if (!mini) { const m = this.scale > 0.6 ? 100 : this.scale > 0.2 ? 500 : 2000, len = m * this.scale; g.fillStyle = '#fff9'; g.fillRect(14, this.h - 22, len, 3); g.font = '600 10px system-ui'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(m >= 1000 ? `${m / 1000} km` : `${m} m`, 14, this.h - 28); }
  }

  _drawMiniPois(g, st, P) {
    const showAll = this.scale > 0.4;
    for (const p of POIS) {
      const [x, y] = P(p.x, p.z); if (x < -20 || y < -20 || x > this.w + 20 || y > this.h + 20) continue;
      if (!(p.cat === 'shop' || p.cat === 'home' || p.id === st.dest?.id)) { if (Math.hypot(x - this.w / 2, y - this.h / 2) > Math.min(this.w, this.h) * 0.46) continue; }
      if (!showAll && p.cat === 'district') continue;
      g.fillStyle = st.dest?.id === p.id ? THEME.dest : THEME.pin; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
      g.strokeStyle = '#0008'; g.lineWidth = 2; g.stroke();
    }
  }

  _badge(g, x, y, emoji, { r = 12, ring = '#0b1020', open = false } = {}) {
    g.fillStyle = '#fff'; g.strokeStyle = ring; g.lineWidth = ring === '#0b1020' ? 2 : 3;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    g.font = `${Math.round(r * 1.1)}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(emoji, x, y + 1);
    if (open) { g.fillStyle = THEME.open; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x + r * 0.72, y - r * 0.72, 4, 0, 7); g.fill(); g.stroke(); }
  }

  /** Emoji pins, clusters and collision-free labels for the full-screen and phone maps. */
  _drawPlaces(g, st, P, px, py) {
    const s = this.scale, W = this.w, H = this.h;
    const items = [];
    for (const p of POIS) {
      const [x, y] = P(p.x, p.z); if (x < -30 || y < -30 || x > W + 30 || y > H + 30) continue;
      const pinned = this.selected === p.id || st.dest?.id === p.id;
      items.push({ poi: p, sx: x, sy: y, pinned, prio: pinned ? 100 : (PRIO[p.cat] ?? 20) + (p.state === 'open' ? 10 : 0) });
    }
    items.sort((u, v) => v.prio - u.prio);
    const groups = clusterPoints(items, this.mode === 'phone' ? 22 : 26);
    // every badge (cluster or single place) gets its own space; the player marker is an obstacle they step around
    const badges = [];
    for (const grp of groups) {
      if (grp.items.length > 1) badges.push({ grp, ax: grp.sx, ay: grp.sy, r: grp.items.length >= 10 ? 16 : 14 });
      else { const it = grp.items[0], sel = this.selected === it.poi.id || st.dest?.id === it.poi.id; badges.push({ it, ax: it.sx, ay: it.sy, r: sel ? 15 : 12, sel }); }
    }
    const rects = badges.map((q) => ({ x: q.ax, y: q.ay, w: q.r * 2 + 4, h: q.r * 2 + 4 }));
    spreadRects(rects, { x0: 2, y0: this.mode === 'full' ? 50 : 2, x1: W - 2, y1: H - 2 }, { fixed: [{ x: px, y: py, w: 34, h: 34 }] });
    badges.forEach((q, i) => { q.x = rects[i].x; q.y = rects[i].y; });
    const blockers = [{ x0: px - 18, y0: py - 18, x1: px + 18, y1: py + 18 }], labels = [];
    const box = (x, y, r) => ({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });
    // leaders from any badge that stepped aside back to its real spot
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.fillStyle = '#fff'; g.lineWidth = 1.5;
    for (const q of badges) if (Math.hypot(q.x - q.ax, q.y - q.ay) > 4) { g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.ax, q.ay); g.stroke(); g.beginPath(); g.arc(q.ax, q.ay, 2.5, 0, 7); g.fill(); }
    // clusters first, then single places on top (selected last of all)
    for (const q of badges.filter((b) => b.grp)) {
      const n = q.grp.items.length;
      g.fillStyle = '#1b2434'; g.strokeStyle = THEME.pin; g.lineWidth = 2.5; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = '800 13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), q.x, q.y + 1);
      blockers.push(box(q.x, q.y, q.r + 2)); this._hits.push({ x: q.x, y: q.y, r: q.r, group: q.grp });
    }
    g.font = '600 11px system-ui';
    for (const q of badges.filter((b) => b.it).sort((u, v) => u.it.prio - v.it.prio)) {
      const it = q.it, p = it.poi;
      this._badge(g, q.x, q.y, p.emoji ?? '📍', { r: q.r, ring: q.sel ? THEME.dest : '#0b1020', open: p.state === 'open' });
      blockers.push(box(q.x, q.y, q.r + 2)); this._hits.push({ x: q.x, y: q.y, r: q.r, poi: p });
      const text = shortName(p.name); g.font = '600 11px system-ui'; labels.push({ id: 'p:' + p.id, kind: 'poi', text, w: g.measureText(text).width + 12, h: 17, prio: it.prio, ax: q.x, ay: q.y, ar: q.r });
    }
    // district names: only the ones without a place pin of the same name (those are labelled by the pin), and only when zoomed out
    if (s < 0.45) for (const dd of DISTRICTS) {
      if (poiById[dd.id]) continue;
      const [x, y] = P(dd.label?.x ?? dd.x, dd.label?.z ?? dd.z), text = dd.name.toUpperCase();
      g.font = '700 11px system-ui'; labels.push({ id: 'd:' + dd.id, kind: 'district', text, w: g.measureText(text).width, h: 14, prio: 12, ax: x, ay: y, ar: 0, sides: ['center'] });
    }
    // street names, rotated along the road, only when zoomed in
    if (s > 0.45) {
      g.font = '600 10px system-ui';
      for (const r of ROADS) {
        if (r.pts.length !== 2) continue;
        const [x0, y0] = P(...r.pts[0]), [x1, y1] = P(...r.pts[1]), seg = clipSegment(x0, y0, x1, y1, W, H); if (!seg) continue;
        const len = Math.hypot(seg[2] - seg[0], seg[3] - seg[1]), tw = g.measureText(r.name).width; if (len < tw + 36) continue;
        let ang = Math.atan2(y1 - y0, x1 - x0); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
        const bw = Math.abs(tw * Math.cos(ang)) + 12 * Math.abs(Math.sin(ang)), bh = Math.abs(tw * Math.sin(ang)) + 12 * Math.abs(Math.cos(ang));
        labels.push({ id: 'r:' + r.name, kind: 'road', text: r.name, ang, tw, w: bw, h: bh, prio: 1, ax: (seg[0] + seg[2]) / 2, ay: (seg[1] + seg[3]) / 2, ar: 0, sides: ['center'] });
      }
    }
    const placed = placeLabels(labels, { x0: 4, y0: this.mode === 'full' ? 54 : 4, x1: W - 4, y1: H - 4 }, blockers), byId = new Map(labels.map((l) => [l.id, l]));
    g.textBaseline = 'middle';
    for (const pl of placed) {
      const l = byId.get(pl.id);
      if (l.kind === 'poi') {
        g.font = '600 11px system-ui'; g.fillStyle = 'rgba(13,17,24,.82)'; g.beginPath(); g.roundRect ? g.roundRect(pl.x, pl.y, l.w, l.h, 8) : g.rect(pl.x, pl.y, l.w, l.h); g.fill();
        g.fillStyle = '#e8eefc'; g.textAlign = 'left'; g.fillText(l.text, pl.x + 6, pl.y + l.h / 2 + 0.5);
      } else if (l.kind === 'district') {
        g.font = '700 11px system-ui'; g.textAlign = 'center'; g.fillStyle = THEME.label; g.globalAlpha = 0.8; g.fillText(l.text, pl.x + l.w / 2, pl.y + l.h / 2); g.globalAlpha = 1;
      } else {
        g.save(); g.translate(pl.x + l.w / 2, pl.y + l.h / 2); g.rotate(l.ang); g.font = '600 10px system-ui'; g.textAlign = 'center';
        g.lineWidth = 3; g.strokeStyle = THEME.bg; g.strokeText(l.text, 0, 0); g.fillStyle = '#8a96ab'; g.fillText(l.text, 0, 0); g.restore();
      }
    }
    g.textBaseline = 'alphabetic';
  }
}
