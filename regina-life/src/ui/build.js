import * as THREE from 'three';
import './build.css';
import { ROOM, FLOORS } from '../data/furniture.js';
import { layoutOf } from '../data/homes.js';
import { own } from '../core/util.js';
import { lotOf, roomAt } from '../core/lot.js';
import { itemDef, footprint, ownedTypes, availableToPlace, canPlace, placeFurniture, moveFurniture, removeFurniture, styleOf } from '../core/home.js';

const TEXT_TARGET = (t) => t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);
/** Placement snap in metres (core/home.js snaps piece centres to multiples of this). */
export const SNAP = 0.25;

/**
 * Floor-grid geometry: flat [x0, z0, x1, z1, ...] segment lists, clipped to the room. Every line sits on a multiple of the placement snap, so
 * what you see is exactly where centres can land; `major` lines (every metre) are listed separately so they can be drawn stronger.
 * `rooms` is one rect or an array of rects (a multi-room home: the place rect of every room); each rect gets its own clipped lines.
 */
export function gridLines(rooms = ROOM, step = SNAP, major = 1) {
  const eps = 1e-6, minor = [], maj = [], ticks = (a, b) => { const out = []; for (let k = Math.ceil(a / step - eps); k * step <= b + eps; k++) out.push(+(k * step).toFixed(6)); return out; };
  const isMajor = (v) => Math.abs(v / major - Math.round(v / major)) < eps;
  for (const room of Array.isArray(rooms) ? rooms : [rooms]) {
    for (const x of ticks(room.x0, room.x1)) (isMajor(x) ? maj : minor).push(x, room.z0, x, room.z1);
    for (const z of ticks(room.z0, room.z1)) (isMajor(z) ? maj : minor).push(room.x0, z, room.x1, z);
  }
  return { minor, major: maj };
}
/** The outline of one rect or an array of rects as a flat segment list (four segments per rect). */
export function borderLines(rooms = ROOM) {
  const out = [];
  for (const r of Array.isArray(rooms) ? rooms : [rooms]) out.push(r.x0, r.z0, r.x1, r.z0, r.x1, r.z0, r.x1, r.z1, r.x1, r.z1, r.x0, r.z1, r.x0, r.z1, r.x0, r.z0);
  return out;
}
/** Grid line colour that reads on the current floor: dark lines on light floors, white lines on dark ones. */
export function gridColorFor(hex) {
  const c = new THREE.Color(hex || '#b08a62'), lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return lum > 0.4 ? '#24323b' : '#ffffff';
}
const GRID_FADE_S = 0.22;
/**
 * A grid overlay on the home's floor that fades in/out. `group` goes in the scene; `set(true)` fades in, `set(false)` fades out
 * (`instant` skips the fade, and reduced-motion users never get one). `raf` is injectable for tests.
 * Three layers (minor, major, border), each ONE merged geometry across all rooms: `rooms` (an array of place rects; `room` for a single one; default the
 * Studio's) feeds them, `setRooms(rects, ids)` swaps them (ids name the rooms for setRoomColors), `setColor(hex)` colours every room's lines alike and
 * `setRoomColors({ [roomId]: hex })` tints each room's lines on its own (dark lines on a light floor, white on a dark one).
 */
export function makeFloorGrid({ room = ROOM, rooms = null, y = 0.045, raf = globalThis.requestAnimationFrame?.bind(globalThis), reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  const group = new THREE.Group(); group.visible = false; group.name = 'floor-grid'; group.position.y = y;
  const mk = (opacity, color = '#ffffff', tinted = true) => {
    const ls = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, vertexColors: tinted }));
    ls.userData.max = opacity; ls.renderOrder = 4; group.add(ls); return ls;
  };
  const layers = [mk(0.2), mk(0.5), mk(0.9, '#34c98b', false)];
  let rects = [], ids = [], owner = [[], [], []], base = '#ffffff', tint = null, level = 0, target = 0, pending = false, last = 0;
  /** Replace a layer's geometry with the flat segment list. */
  const fill = (layer, flat) => {
    const n = flat.length / 2, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = flat[i * 2]; pos[i * 3 + 2] = flat[i * 2 + 1]; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (layer.material.vertexColors) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    layer.geometry.dispose(); layer.geometry = geo;
  };
  const paint = () => {
    const c = new THREE.Color();
    for (const [li, l] of layers.slice(0, 2).entries()) {
      const att = l.geometry.getAttribute('color'); if (!att) continue;
      if (tint) {
        l.material.color.set('#ffffff');
        for (let i = 0; i < att.count; i++) { c.set(tint[ids[owner[li][i]]] ?? base); att.setXYZ(i, c.r, c.g, c.b); }
      } else { l.material.color.set(base); att.array.fill(1); }
      att.needsUpdate = true;
    }
  };
  const apply = () => { for (const l of layers) l.material.opacity = l.userData.max * level; group.visible = level > 0.01; };
  const setRooms = (list, roomIds = null) => {
    const src = Array.isArray(list) ? list : [list];
    rects = src.filter((r) => r && [r.x0, r.z0, r.x1, r.z1].every(Number.isFinite));
    ids = rects.map((r, i) => (Array.isArray(roomIds) ? roomIds[src.indexOf(r)] : r.id) ?? String(i));
    rects = rects.map((r) => ({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1 })); tint = null;
    const per = rects.map((r) => ({ g: gridLines(r), b: borderLines(r) })), picks = [(p) => p.g.minor, (p) => p.g.major, (p) => p.b];
    layers.forEach((l, i) => { fill(l, per.flatMap(picks[i])); owner[i] = per.flatMap((p, k) => new Array(picks[i](p).length / 2).fill(k)); });
    paint();
  };
  setRooms(rooms ?? room);
  const tick = (now) => {
    pending = false; const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; const d = target - level;
    level = Math.abs(d) <= dt / GRID_FADE_S ? target : level + Math.sign(d) * dt / GRID_FADE_S; apply(); if (level !== target) { pending = true; raf(tick); }
  };
  return {
    group, get level() { return level; }, get target() { return target; }, get rooms() { return rects.map((r, i) => ({ ...r, id: ids[i] })); },
    set(on, instant = false) {
      target = on ? 1 : 0; if (level === target) { apply(); return; }
      if (instant || typeof raf !== 'function' || reduced()) { level = target; apply(); return; }
      if (!pending) { pending = true; last = typeof performance !== 'undefined' ? performance.now() : 0; raf(tick); }
    },
    setRooms,
    setColor(hex) { base = hex; tint = null; paint(); },
    setRoomColors(map) { tint = map && typeof map === 'object' ? { ...map } : null; paint(); },
    dispose() { for (const l of layers) { l.geometry.dispose(); l.material.dispose(); } group.removeFromParent?.(); },
  };
}

const storedCount = (s) => ownedTypes(s).reduce((n, t) => n + Math.max(0, availableToPlace(s, t)), 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The wall display modes the Walls button cycles through (the names the interior's setWallMode takes; 'walk' is never offered while building). */
export const WALL_MODES = ['up', 'cut', 'down'];
export const WALL_LABEL = { up: 'Walls: Up', cut: 'Walls: Cutaway', down: 'Walls: Down' };
const wsvg = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
/** One pictogram per mode: a room as a box with all its walls, with the front walls cut away, and with every wall lowered to a rim. */
export const WALL_ICON = {
  up: wsvg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>'),
  cut: wsvg('<path d="M4 14l8 4.5 8-4.5-8-4.5z"/><path d="M4 14V7.5L12 3l8 4.5V14"/><path d="M12 9.5V3"/>'),
  down: wsvg('<path d="M3 11.5l9 5 9-5-9-5z"/><path d="M3 11.5v3l9 5 9-5v-3M12 16.5v3"/>'),
};
/** Chip labels of the room focus strip: short, by room type, so five rooms fit a phone. */
const ROOM_SHORT = { living: 'Living', bedroom: 'Bedroom', bath: 'Bath', den: 'Den', garage: 'Garage' };
export const roomChipLabel = (room) => ROOM_SHORT[room.type] ?? room.name;
/** The focus strip: `House` (the whole home) then one chip per room; `focus` is the focused room id, or null for the whole house. */
export function roomChipsHTML(rooms, focus = null) {
  const chip = (id, label, name, on) => `<button type="button" class="b-room${on ? ' on' : ''}" data-act="focus" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${esc(name)}">${esc(label)}</button>`;
  return chip('all', 'House', 'Whole house', focus == null) + rooms.map((r) => chip(r.id, roomChipLabel(r), r.name, focus === r.id)).join('');
}

/**
 * Build mode (Sims-style): overhead camera over your home. The bottom bar is just Buy / Rotate / (Walls) / Store / Done: Buy opens the Catalogue
 * (see ui/catalogue.js), which hands the piece you buy or pull out of storage back via select(); tap the floor to place it with the ghost +
 * floor grid. Tap an existing piece to pick it up and move it; R rotates; Delete stores it; Esc deselects, then exits.
 * Every placement is validated by core/home.js (bounds, fixtures, overlaps, and that you can still walk everywhere).
 *
 * Multi-room homes (docs/HOMES.md section 6): `setLayout(layout)` feeds every room's place rect to the grid; the Walls button (#b-walls) cycles
 * up -> cut -> down and reports it through `onWallMode(mode)`; the focus strip (#b-rooms) calls `onFocus(roomId | null, floorRect | null)`.
 * BuildMode has no interior or camera of its own: main.js wires those two callbacks (interior.setWallMode / rig.setBuildFocus).
 */
export class BuildMode {
  constructor({ canvas, camera, scene, store, panels, audio, toast, isBlocked = () => false, catalogue = null, layout = null, onStart, onStop, onLayout, onWallMode, onFocus, onPlaced }) {
    Object.assign(this, { canvas, camera, scene, store, panels, audio, toast, isBlocked, catalogue, onStart, onStop, onLayout, onWallMode, onFocus, onPlaced });
    this.active = false; this.sel = null; this.rot = 0; this.pt = null; this.lastErr = null; this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.hit = new THREE.Vector3();
    this.wallMode = 'cut'; this.focus = null; this._focusPinned = false; this.lastEdit = null; this._notice = null; this._roomsSig = null;
    this.lot = lotOf(layout ?? layoutOf(store.state));
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#34c98b', transparent: true, opacity: 0.45, depthWrite: false })); this.ghost.visible = false; this.ghost.renderOrder = 5; scene.add(this.ghost);
    this.grid = makeFloorGrid({ rooms: this.lot.rooms.map((r) => ({ ...r.place, id: r.id })) }); scene.add(this.grid.group);
    const $ = (id) => document.getElementById(id);
    this.el = $('build'); this.hintEl = $('b-hint'); this.rotBtn = $('b-rot'); this.delBtn = $('b-del'); this.storedBtn = $('b-stored'); this.storedN = $('b-stored-n');
    this.wallBtn = $('b-walls') ?? null; this.roomsEl = $('b-rooms') ?? null;
    $('b-done').onclick = () => this.stop();
    $('b-rot').onclick = () => this.rotate();
    $('b-del').onclick = () => this.removeSel();
    $('b-buy').onclick = () => this.openCatalogue();
    if (this.storedBtn) this.storedBtn.onclick = () => this.openCatalogue('in-storage');
    if (this.wallBtn) this.wallBtn.onclick = () => this.cycleWalls();
    this.roomsEl?.addEventListener?.('click', (e) => { const b = e.target?.closest?.('[data-act="focus"]'); if (b) this.focusRoom(b.dataset.id === 'all' ? null : b.dataset.id); });
    this._paintWalls(); this._syncChrome();
    this._down = null;
    const blocked = () => panels.open || this.catalogue?.isOpen;
    canvas.addEventListener('pointerdown', (e) => { if (!this.active || blocked() || e.button === 2) return; this._down = { x: e.clientX, y: e.clientY, id: e.pointerId }; this._move(e); });
    canvas.addEventListener('pointermove', (e) => { if (this.active && !blocked()) this._move(e); });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.active || blocked() || !this._down || this._down.id !== e.pointerId) { this._down = null; return; }
      const d = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y); this._down = null; if (d < 8) { this._move(e); this.click(false); }
    });
    canvas.addEventListener('pointercancel', () => { this._down = null; });
    // secondary button: handled ONCE here (pointerup ignores button 2). Touch long-press is ignored — use the Store button.
    canvas.addEventListener('contextmenu', (e) => { if (!this.active) return; e.preventDefault(); if (e.pointerType === 'touch' || blocked()) return; this._move(e); this.click(true); });
    // capture phase: we see the key BEFORE the panel/phone handlers close anything, so Esc on a panel never also exits build mode.
    // The same goes for the Catalogue: an Esc that hid the sheet (or arrives while it is open) is the sheet's, not ours.
    addEventListener('keydown', (e) => {
      if (!this.active || panels.open || this.isBlocked() || TEXT_TARGET(e.target) || e.repeat || this.catalogue?.isOpen || this.catalogue?.closedBy?.(e)) return;
      const k = e.key.toLowerCase();
      if (k === 'r') this.rotate(); else if (k === 'delete' || k === 'backspace' || k === 'x') this.removeSel();
      else if (k === 'escape') { if (this.sel) { this.select(null); } else this.stop(); }
    }, true);
    addEventListener('resize', () => this.active && this._layout());
  }
  get state() { return this.store.state; }
  /** True when the home has 2+ rooms (the Walls button and the focus strip exist only then). */
  get multi() { return this.lot.rooms.length > 1; }
  /** Connect the Buy sheet (or any object with open(tab) / close() / isOpen / height / closedBy(e)). */
  setCatalogue(c) { this.catalogue = c; return this; }
  /** Open the Catalogue (optionally on a tab); without one connected, fall back to the old furniture shop panel. */
  openCatalogue(tab) { if (this.catalogue) this.catalogue.open(tab); else this.panels.furnitureShop?.(() => this.refresh()); }

  /* ---------- the home: grid, walls button, room focus ---------- */
  /**
   * Point build mode at a home (a layout object or id; default: the layout in the saved state). Feeds every room's place rect to the grid, shows or hides the
   * Walls button and the focus strip, and drops the room focus (calling onFocus(null, null) if there was one). start() calls this when the layout id changed,
   * and main.js calls it after moveHome.
   */
  setLayout(layout = layoutOf(this.state)) {
    const lot = lotOf(layout), changed = lot.id !== this.lot.id; this.lot = lot;
    this.grid.setRooms(lot.rooms.map((r) => r.place), lot.rooms.map((r) => r.id));
    if (changed) { this.lastEdit = null; this._focusPinned = false; if (this.focus != null) { this.focus = null; this.onFocus?.(null, null); } }
    this._roomsSig = null; this._syncChrome(); if (this.active) this.refresh();
    return this;
  }
  _syncChrome() { if (this.wallBtn) this.wallBtn.hidden = !this.multi; this.el?.classList?.[this.multi ? 'add' : 'remove']('has-walls'); this._renderRooms(); }
  _renderRooms() {
    const el = this.roomsEl; if (!el) return;
    const show = this.active && this.multi, sig = `${this.lot.id}|${this.focus ?? ''}|${show}`; el.hidden = !show;
    if (sig === this._roomsSig) return; this._roomsSig = sig;
    el.innerHTML = show ? roomChipsHTML(this.lot.rooms, this.focus) : '';
  }
  /**
   * Frame one room (its id) or the whole house (null) and highlight its chip. A tap on the strip counts as the player's choice: after that nothing refocuses
   * until the next build session. `onFocus(roomId | null, floorRect | null)` is how main.js tells the camera (rig.setBuildFocus(rect)).
   */
  focusRoom(id, { user = true } = {}) {
    if (!this.multi) return this;                                  // a one-room home is always shown whole
    const room = id != null ? this.lot.rooms.find((r) => r.id === id) : null; if (user) this._focusPinned = true;
    const rid = room ? room.id : null; if (rid === this.focus) return this;
    this.focus = rid; this._renderRooms(); this.onFocus?.(rid, room ? { ...room.floor } : null);
    return this;
  }
  /** Selecting a piece you have not placed yet focuses the room of the last item you edited, else the living room (unless you chose a view yourself). */
  _autoFocus() {
    if (!this.active || !this.multi || this._focusPinned) return;
    const at = this.lastEdit && roomAt(this.lot.layout, this.lastEdit.x, this.lastEdit.z);
    this.focusRoom(at ? at.id : this.lot.rooms[0].id, { user: false });
  }
  /** Show the wall mode on the button (no callback: main.js uses this to re-apply its session choice after an interior swap). */
  setWallMode(mode) { if (WALL_MODES.includes(mode)) { this.wallMode = mode; this._paintWalls(); } return this; }
  /** Advance up -> cut -> down -> up, say which one it is in the hint line, and tell main.js through onWallMode(mode). A no-op on single-room homes. */
  cycleWalls() {
    if (!this.multi) return this.wallMode;
    const next = WALL_MODES[(WALL_MODES.indexOf(this.wallMode) + 1) % WALL_MODES.length]; this.setWallMode(next);
    this.audio?.blip('tick'); this._announce(WALL_LABEL[next]); this.onWallMode?.(next);
    return next;
  }
  _paintWalls() {
    const b = this.wallBtn; if (!b) return; const mode = this.wallMode, label = WALL_LABEL[mode] ?? WALL_LABEL.cut;
    if (b.dataset) b.dataset.mode = mode; b.setAttribute?.('aria-label', label); b.setAttribute?.('title', label);
    if (b._icon !== mode) { b._icon = mode; b.innerHTML = WALL_ICON[mode] ?? ''; }
  }
  /** A short message in the hint line (a rule error still wins over it). */
  _announce(text, ms = 1800) {
    this._notice = text; clearTimeout(this._noticeT);
    this._noticeT = setTimeout(() => { this._notice = null; this._hint(this.sel ? this.lastErr : null, true); }, ms);
    this._hint(this.sel ? this.lastErr : null, true);
  }

  start(opts = {}) {
    if (layoutOf(this.state).id !== this.lot.id) this.setLayout();
    this.focus = null; this._focusPinned = false; this.lastEdit = null; this._roomsSig = null;
    this.active = true; this.sel = null; this.rot = 0; this.lastErr = null; this.el.hidden = false; document.body.classList.add('building'); this.grid.set(false, true); this._syncChrome(); this.refresh(); this.onStart?.();
    if (!opts.quiet) this.toast('Build mode · tap Buy to shop, or tap furniture to move it', 'info');
  }
  stop() {
    if (!this.active) return; this.active = false; this.el.hidden = true; this.ghost.visible = false; this.grid.set(false, true); this.catalogue?.close?.(); document.body.classList.remove('building'); this.sel = null;
    clearTimeout(this._noticeT); this._notice = null; this._renderRooms();
    if (this.focus != null) { this.focus = null; this.onFocus?.(null, null); }
    this.onStop?.();
  }
  /** Tell main.js how much of the screen the UI covers: onLayout(bottomFraction, topFraction). The bottom is the bar or the open Buy sheet; the top is the room focus strip (0 when it is hidden, i.e. always in the Studio). */
  _layout() { this.onLayout?.(Math.min(0.6, (Math.max(this.el.offsetHeight, this.catalogue?.isOpen ? this.catalogue.height ?? 0 : 0) + 14) / Math.max(1, innerHeight)), this._topInset()); }
  _topInset() {
    const el = this.roomsEl, r = this.active && this.multi && el && !el.hidden ? el.getBoundingClientRect?.() : null;
    return r && r.height > 0 ? Math.min(0.3, (r.bottom + 8) / Math.max(1, innerHeight)) : 0;
  }
  /** Re-measure the bottom inset (the Catalogue calls this as it opens/closes so the room stays framed above it). */
  layout() { if (this.active) this._layout(); }
  select(sel) {
    this.sel = sel; this.rot = sel?.id ? (this.state.home.placed.find((p) => p.id === sel.id)?.rot ?? 0) : this.rot;
    if (sel && !sel.id) this._autoFocus();
    this.refresh(); this._ghost();
  }
  rotate() { if (!this.sel) return; this.rot = (this.rot + 1) % 4; this.audio?.blip('tick'); this._ghost(); }
  _edited(r) { if (r.item) this.lastEdit = { x: r.item.x, z: r.item.z }; }
  removeSel() {
    if (this.sel?.id) { this._edited(removeFurniture(this.store, this.sel.id)); this.toast('Moved to storage', 'info'); this.sel = null; this.refresh(); this._ghost(); return; }
    if (this.sel) return; // a catalogue piece is selected but not placed yet: nothing to store
    const it = this._itemAt(this.pt); if (it) { this._edited(removeFurniture(this.store, it.id)); this.toast('Moved to storage', 'info'); this.refresh(); }
  }
  refresh() {
    const s = this.state;
    // the shop may have sold the last stored copy of the selected piece, or the piece was removed elsewhere
    if (this.sel && !this.sel.id && availableToPlace(s, this.sel.type) < 1) this.sel = null;
    if (this.sel?.id && !s.home.placed.some((p) => p.id === this.sel.id)) this.sel = null;
    const n = storedCount(s), fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
    if (this.storedBtn) { this.storedBtn.hidden = n < 1; if (this.storedN) this.storedN.textContent = String(n); }
    if (this.rotBtn) this.rotBtn.disabled = !this.sel; if (this.delBtn) this.delBtn.disabled = !this.sel?.id;
    this._hintText = this.sel ? (this.sel.id ? `Tap a spot to move it${fine ? ' · R rotate · Del store · Esc cancel' : ''}` : `Tap the floor to place it${fine ? ' · R rotate · Esc cancel' : ''}`) : 'Tap Buy to shop · tap furniture to move it';
    this._hint(this.sel ? this.lastErr : null, true);
    const floorTint = (roomId) => { const f = styleOf(s, roomId).floor; return gridColorFor(own(FLOORS, f) ? FLOORS[f][2] : null); };
    if (this.multi) this.grid.setRoomColors(Object.fromEntries(this.lot.rooms.map((r) => [r.id, floorTint(r.id)]))); else this.grid.setColor(floorTint(this.lot.rooms[0].id));
    this.grid.set(!!this.sel);
    this._layout();
  }
  /** Show the rule that blocks the ghost (red), else a short announcement (Walls: Cutaway), else the normal hint. */
  _hint(err, force = false) {
    const text = err || this._notice || this._hintText || ''; if (!force && this.hintEl.textContent === text && (this.hintEl.dataset.err || '') === (err || '')) return;
    this.hintEl.textContent = text; this.hintEl.dataset.err = err || ''; this.lastErr = err || null;
  }
  _move(e) {
    const r = this.canvas.getBoundingClientRect(), nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    this.ray.setFromCamera({ x: nx, y: ny }, this.camera); this.pt = this.ray.ray.intersectPlane(this.plane, this.hit) ? { x: this.hit.x, z: this.hit.z } : null; this._ghost();
  }
  /** Picking is forgiving: small/flat pieces get a larger tap target, and solid furniture wins over rugs underneath it. */
  _itemAt(pt) {
    if (!pt) return null; let best = null, bs = Infinity;
    for (const p of this.state.home.placed) {
      const d = itemDef(p.type); if (!d) continue; const f = footprint(p.type, p.rot), hw = Math.max(f.w, 0.6) / 2, hd = Math.max(f.d, 0.6) / 2;
      if (Math.abs(pt.x - p.x) > hw || Math.abs(pt.z - p.z) > hd) continue;
      const score = (d.solid ? 0 : 1000) + f.w * f.d; if (score < bs) { bs = score; best = p; }
    }
    return best;
  }
  _ghost() {
    const g = this.ghost; if (!this.sel || !this.pt) { g.visible = false; this._hint(null); return; }
    const d = itemDef(this.sel.type); if (!d) { g.visible = false; this._hint(null); return; }
    const f = footprint(this.sel.type, this.rot), c = canPlace(this.state, this.sel.type, this.pt.x, this.pt.z, this.rot, this.sel.id);
    g.visible = true; g.scale.set(f.w, Math.max(0.06, d.h), f.d); g.position.set(c.ok ? c.x : Math.round(this.pt.x / SNAP) * SNAP, Math.max(0.03, d.h) / 2, c.ok ? c.z : Math.round(this.pt.z / SNAP) * SNAP);
    g.material.color.set(c.ok ? '#34c98b' : '#ff5a5f'); this.lastCheck = c; this._hint(c.ok ? null : c.error);
  }
  click(alt) {
    if (alt) return this.removeSel();
    if (!this.sel) { const it = this._itemAt(this.pt); if (it) { this.select({ type: it.type, id: it.id }); this.audio?.blip('tick'); } return; }
    if (!this.pt) return;
    const r = this.sel.id ? moveFurniture(this.store, this.sel.id, this.pt.x, this.pt.z, this.rot) : placeFurniture(this.store, this.sel.type, this.pt.x, this.pt.z, this.rot);
    if (!r.ok) { this.audio?.blip('error'); this.toast(r.error, 'warn'); return; }
    this.audio?.blip('ok'); this._edited(r); this.onPlaced?.(this.sel.type, this.pt.x, this.pt.z, !!this.sel.id);   // the juice (a thud, a pop) lives in main
    if (this.sel.id || availableToPlace(this.state, this.sel.type) < 1) this.sel = null;
    this.refresh(); this._ghost();
  }
}
