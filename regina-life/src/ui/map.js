import { DISTRICTS, POIS, mapRoads, lakePolygon, PARK_RECT, PITCH, GRID, ROAD_W, CAT_ICON } from '../world/cityData.js';

const ROADS = mapRoads(), LAKE = lakePolygon();
const THEME = { bg: '#161b24', block: '#1f2733', park: '#1c3a2c', water: '#1d4a6b', road: '#3a4455', art: '#59657a', label: '#c9d3e3', pin: '#ffb347', me: '#4da3ff', dest: '#ff5a5f' };

/** 2D city map used by the minimap, the full-screen map and the phone Maps app. */
export class MapView {
  constructor(canvas, { mode = 'full', onSelect = null, getState } = {}) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.mode = mode; this.onSelect = onSelect; this.getState = getState;
    this.cx = 0; this.cz = 300; this.scale = mode === 'mini' ? 0.55 : 0.12; this.selected = null; this.follow = mode === 'mini';
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.pointers = new Map(); this.moved = 0;
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
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.moved = 0; this.follow = false; });
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
    const old = this.scale; this.scale = Math.min(2.2, Math.max(0.035, this.scale * f));
    if (e) { const r = this.c.getBoundingClientRect(), mx = e.clientX - r.left - r.width / 2, mz = e.clientY - r.top - r.height / 2; this.cx += mx / old - mx / this.scale; this.cz += mz / old - mz / this.scale; }
  }
  _tap(e) {
    const r = this.c.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    let best = null, bd = 28;
    for (const p of POIS) { const [px, py] = this.toScreen(p.x, p.z); const d = Math.hypot(px - sx, py - sy); if (d < bd) { bd = d; best = p; } }
    if (best) { this.selected = best.id; this.onSelect?.(best); }
    else { const x = (sx - this.w / 2) / this.scale + this.cx, z = (sy - this.h / 2) / this.scale + this.cz; this.selected = null; this.onSelect?.({ id: 'custom', name: 'Dropped pin', cat: 'pin', x, z }); }
  }
  toScreen(x, z) { return [(x - this.cx) * this.scale + this.w / 2, (z - this.cz) * this.scale + this.h / 2]; }
  focus(x, z, scale) { this.cx = x; this.cz = z; if (scale) this.scale = scale; this.follow = false; }

  draw() {
    this.resize(); if (!this.w) return;
    const g = this.g, st = this.getState(), s = this.scale;
    if (this.follow) { this.cx = st.x; this.cz = st.z; }
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = THEME.bg; g.fillRect(0, 0, this.w, this.h);
    const P = (x, z) => this.toScreen(x, z);
    // park
    let [a, b] = P(PARK_RECT.x0, PARK_RECT.z0), [c2, d] = P(PARK_RECT.x1, PARK_RECT.z1);
    g.fillStyle = THEME.park; g.fillRect(a, b, c2 - a, d - b);
    // district tints
    if (this.mode !== 'mini' || s > 0.3) for (const dd of DISTRICTS) { if (dd.detail === 'playable') continue; const [x, y] = P(dd.x, dd.z); g.fillStyle = dd.color + '22'; g.beginPath(); g.arc(x, y, dd.r * s, 0, 7); g.fill(); }
    // blocks
    if (s > 0.08) {
      g.fillStyle = THEME.block;
      for (let i = GRID.i0; i < GRID.i1; i++) for (let j = GRID.j0; j < GRID.j1; j++) {
        const [x0, y0] = P(i * PITCH + ROAD_W / 2, j * PITCH + ROAD_W / 2), [x1, y1] = P((i + 1) * PITCH - ROAD_W / 2, (j + 1) * PITCH - ROAD_W / 2);
        if (x1 < 0 || y1 < 0 || x0 > this.w || y0 > this.h) continue; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    // lake
    g.fillStyle = THEME.water; g.beginPath(); LAKE.forEach(([x, z], i) => { const [px, py] = P(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill();
    // roads
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of ROADS) {
      g.strokeStyle = r.kind === 'arterial' ? THEME.art : THEME.road; g.lineWidth = Math.max(r.kind === 'arterial' ? 2 : 1, (r.kind === 'arterial' ? 16 : 12) * s);
      g.beginPath(); r.pts.forEach(([x, z], i) => { const [px, py] = P(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    }
    // road names when zoomed in
    if (this.mode !== 'mini' && s > 0.5) {
      g.fillStyle = '#7f8ba0'; g.font = '600 10px system-ui'; g.textAlign = 'center';
      for (const r of ROADS) { if (r.pts.length !== 2 || r.pts[1][1] - r.pts[0][1] === 0 && r.pts[1][0] - r.pts[0][0] === 0) continue; const [p0, p1] = r.pts; const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2; const [px, py] = P(mx, mz); if (px > 0 && px < this.w && py > 0 && py < this.h) g.fillText(r.name, px, py - 3); }
    }
    // district labels
    if (this.mode !== 'mini') {
      g.textAlign = 'center';
      for (const dd of DISTRICTS) { const [x, y] = P(dd.x, dd.z); if (s < 0.3) { g.font = `700 ${s < 0.08 ? 11 : 12}px system-ui`; g.fillStyle = THEME.label; g.globalAlpha = 0.85; g.fillText(dd.name.toUpperCase(), x, y); g.globalAlpha = 1; } }
    }
    // destination route
    const dest = st.dest;
    if (dest) {
      const [mx, my] = P(st.x, st.z), [dx, dy] = P(dest.x, dest.z);
      g.setLineDash([8, 7]); g.strokeStyle = THEME.dest; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, my); g.lineTo(dx, dy); g.stroke(); g.setLineDash([]);
    }
    // POIs
    const showAll = this.mode !== 'mini' && s > 0.05 || this.mode === 'mini' && s > 0.4;
    for (const p of POIS) {
      const [x, y] = P(p.x, p.z); if (x < -20 || y < -20 || x > this.w + 20 || y > this.h + 20) continue;
      if (this.mode === 'mini' && !(p.cat === 'shop' || p.cat === 'home' || p.id === st.dest?.id)) { if (Math.hypot(x - this.w / 2, y - this.h / 2) > Math.min(this.w, this.h) * 0.46) continue; }
      if (!showAll && p.cat === 'district') continue;
      if (this.mode !== 'mini' && s < 0.3 && (p.cat === 'shop' || p.cat === 'home') && this.selected !== p.id && st.dest?.id !== p.id) continue;
      const sel = this.selected === p.id || st.dest?.id === p.id;
      g.fillStyle = sel ? THEME.dest : THEME.pin; g.beginPath(); g.arc(x, y, this.mode === 'mini' ? 5 : sel ? 9 : 7, 0, 7); g.fill();
      g.strokeStyle = '#0008'; g.lineWidth = 2; g.stroke();
      if (this.mode !== 'mini' && ((this.mode === 'full' ? s > 0.07 : s > 0.45) || sel)) { g.font = '600 11px system-ui'; g.fillStyle = '#e8eefc'; g.textAlign = 'left'; g.fillText(CAT_ICON[p.cat] + ' ' + p.name, x + 11, y + 4); }
    }
    if (dest && dest.id === 'custom') { const [x, y] = P(dest.x, dest.z); g.fillStyle = THEME.dest; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
    // player
    const [px, py] = P(st.x, st.z);
    g.save(); g.translate(px, py); g.rotate(-st.yaw + Math.PI); // yaw 0 faces +z (south = down on map)
    g.fillStyle = THEME.me + '33'; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill();
    g.fillStyle = THEME.me; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
    if (this.mode === 'mini') { g.strokeStyle = '#ffffff30'; g.lineWidth = 2; g.strokeRect(1, 1, this.w - 2, this.h - 2); g.fillStyle = '#fff9'; g.font = '700 10px system-ui'; g.textAlign = 'center'; g.fillText('N', this.w / 2, 11); }
    // scale bar
    if (this.mode !== 'mini') { const m = s > 0.6 ? 100 : s > 0.2 ? 500 : 2000, len = m * s; g.fillStyle = '#fff9'; g.fillRect(14, this.h - 22, len, 3); g.font = '600 10px system-ui'; g.textAlign = 'left'; g.fillText(m >= 1000 ? `${m / 1000} km` : `${m} m`, 14, this.h - 28); }
  }
}
