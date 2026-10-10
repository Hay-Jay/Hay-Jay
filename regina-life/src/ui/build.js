import * as THREE from 'three';
import './build.css';
import { ROOM, FLOORS } from '../data/furniture.js';
import { own } from '../core/util.js';
import { itemDef, footprint, ownedTypes, availableToPlace, canPlace, placeFurniture, moveFurniture, removeFurniture } from '../core/home.js';

const TEXT_TARGET = (t) => t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);
/** Placement snap in metres (core/home.js snaps piece centres to multiples of this). */
export const SNAP = 0.25;

/**
 * Floor-grid geometry: flat [x0, z0, x1, z1, ...] segment lists, clipped to the room. Every line sits on a multiple of the placement snap, so
 * what you see is exactly where centres can land; `major` lines (every metre) are listed separately so they can be drawn stronger.
 */
export function gridLines(room = ROOM, step = SNAP, major = 1) {
  const eps = 1e-6, minor = [], maj = [], ticks = (a, b) => { const out = []; for (let k = Math.ceil(a / step - eps); k * step <= b + eps; k++) out.push(+(k * step).toFixed(6)); return out; };
  const isMajor = (v) => Math.abs(v / major - Math.round(v / major)) < eps;
  for (const x of ticks(room.x0, room.x1)) (isMajor(x) ? maj : minor).push(x, room.z0, x, room.z1);
  for (const z of ticks(room.z0, room.z1)) (isMajor(z) ? maj : minor).push(room.x0, z, room.x1, z);
  return { minor, major: maj };
}
/** Grid line colour that reads on the current floor: dark lines on light floors, white lines on dark ones. */
export function gridColorFor(hex) {
  const c = new THREE.Color(hex || '#b08a62'), lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return lum > 0.4 ? '#24323b' : '#ffffff';
}
const GRID_FADE_S = 0.22;
/**
 * A grid overlay on the apartment floor that fades in/out. `group` goes in the scene; `set(true)` fades in, `set(false)` fades out
 * (`instant` skips the fade, and reduced-motion users never get one). `raf` is injectable for tests.
 */
export function makeFloorGrid({ room = ROOM, y = 0.045, raf = globalThis.requestAnimationFrame?.bind(globalThis), reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  const group = new THREE.Group(); group.visible = false; group.name = 'floor-grid'; group.position.y = y;
  const { minor, major } = gridLines(room), mk = (flat, opacity, color = '#ffffff') => {
    const pos = new Float32Array((flat.length / 2) * 3); for (let i = 0; i < flat.length / 2; i++) { pos[i * 3] = flat[i * 2]; pos[i * 3 + 2] = flat[i * 2 + 1]; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ls = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })); ls.userData.max = opacity; ls.renderOrder = 4; group.add(ls); return ls;
  };
  const border = [room.x0, room.z0, room.x1, room.z0, room.x1, room.z0, room.x1, room.z1, room.x1, room.z1, room.x0, room.z1, room.x0, room.z1, room.x0, room.z0];
  const layers = [mk(minor, 0.2), mk(major, 0.5), mk(border, 0.9, '#34c98b')];
  let level = 0, target = 0, pending = false, last = 0;
  const apply = () => { for (const l of layers) l.material.opacity = l.userData.max * level; group.visible = level > 0.01; };
  const tick = (now) => {
    pending = false; const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; const d = target - level;
    level = Math.abs(d) <= dt / GRID_FADE_S ? target : level + Math.sign(d) * dt / GRID_FADE_S; apply(); if (level !== target) { pending = true; raf(tick); }
  };
  return {
    group, get level() { return level; }, get target() { return target; },
    set(on, instant = false) {
      target = on ? 1 : 0; if (level === target) { apply(); return; }
      if (instant || typeof raf !== 'function' || reduced()) { level = target; apply(); return; }
      if (!pending) { pending = true; last = typeof performance !== 'undefined' ? performance.now() : 0; raf(tick); }
    },
    setColor(hex) { for (const l of layers.slice(0, 2)) l.material.color.set(hex); },
    dispose() { for (const l of layers) { l.geometry.dispose(); l.material.dispose(); } group.removeFromParent?.(); },
  };
}

const storedCount = (s) => ownedTypes(s).reduce((n, t) => n + Math.max(0, availableToPlace(s, t)), 0);

/**
 * Build mode (Sims-style): overhead camera over your apartment. The bottom bar is just Buy / Rotate / Store / Done: Buy opens the Catalogue
 * (see ui/catalogue.js), which hands the piece you buy or pull out of storage back via select(); tap the floor to place it with the ghost +
 * floor grid. Tap an existing piece to pick it up and move it; R rotates; Delete stores it; Esc deselects, then exits.
 * Every placement is validated by core/home.js (bounds, fixtures, overlaps, and that you can still walk everywhere).
 */
export class BuildMode {
  constructor({ canvas, camera, scene, store, panels, audio, toast, isBlocked = () => false, catalogue = null, onStart, onStop, onLayout }) {
    Object.assign(this, { canvas, camera, scene, store, panels, audio, toast, isBlocked, catalogue, onStart, onStop, onLayout });
    this.active = false; this.sel = null; this.rot = 0; this.pt = null; this.lastErr = null; this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.hit = new THREE.Vector3();
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#34c98b', transparent: true, opacity: 0.45, depthWrite: false })); this.ghost.visible = false; this.ghost.renderOrder = 5; scene.add(this.ghost);
    this.grid = makeFloorGrid(); scene.add(this.grid.group);
    const $ = (id) => document.getElementById(id);
    this.el = $('build'); this.hintEl = $('b-hint'); this.rotBtn = $('b-rot'); this.delBtn = $('b-del'); this.storedBtn = $('b-stored'); this.storedN = $('b-stored-n');
    $('b-done').onclick = () => this.stop();
    $('b-rot').onclick = () => this.rotate();
    $('b-del').onclick = () => this.removeSel();
    $('b-buy').onclick = () => this.openCatalogue();
    if (this.storedBtn) this.storedBtn.onclick = () => this.openCatalogue('in-storage');
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
  /** Connect the Buy sheet (or any object with open(tab) / close() / isOpen / height / closedBy(e)). */
  setCatalogue(c) { this.catalogue = c; return this; }
  /** Open the Catalogue (optionally on a tab); without one connected, fall back to the old furniture shop panel. */
  openCatalogue(tab) { if (this.catalogue) this.catalogue.open(tab); else this.panels.furnitureShop?.(() => this.refresh()); }
  start(opts = {}) {
    this.active = true; this.sel = null; this.rot = 0; this.lastErr = null; this.el.hidden = false; document.body.classList.add('building'); this.grid.set(false, true); this.refresh(); this.onStart?.();
    if (!opts.quiet) this.toast('Build mode · tap Buy to shop, or tap furniture to move it', 'info');
  }
  stop() { if (!this.active) return; this.active = false; this.el.hidden = true; this.ghost.visible = false; this.grid.set(false, true); this.catalogue?.close?.(); document.body.classList.remove('building'); this.sel = null; this.onStop?.(); }
  _layout() { this.onLayout?.(Math.min(0.6, (Math.max(this.el.offsetHeight, this.catalogue?.isOpen ? this.catalogue.height ?? 0 : 0) + 14) / Math.max(1, innerHeight))); }
  /** Re-measure the bottom inset (the Catalogue calls this as it opens/closes so the room stays framed above it). */
  layout() { if (this.active) this._layout(); }
  select(sel) { this.sel = sel; this.rot = sel?.id ? (this.state.home.placed.find((p) => p.id === sel.id)?.rot ?? 0) : this.rot; this.refresh(); this._ghost(); }
  rotate() { if (!this.sel) return; this.rot = (this.rot + 1) % 4; this.audio?.blip('tick'); this._ghost(); }
  removeSel() {
    if (this.sel?.id) { removeFurniture(this.store, this.sel.id); this.toast('Moved to storage', 'info'); this.sel = null; this.refresh(); this._ghost(); return; }
    if (this.sel) return; // a catalogue piece is selected but not placed yet: nothing to store
    const it = this._itemAt(this.pt); if (it) { removeFurniture(this.store, it.id); this.toast('Moved to storage', 'info'); this.refresh(); }
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
    this.grid.setColor(gridColorFor(own(FLOORS, s.home?.floor) ? FLOORS[s.home.floor][2] : null));
    this.grid.set(!!this.sel);
    this._layout();
  }
  /** Show the rule that blocks the ghost (red) or the normal hint. */
  _hint(err, force = false) {
    const text = err || this._hintText || ''; if (!force && this.hintEl.textContent === text && (this.hintEl.dataset.err || '') === (err || '')) return;
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
    this.audio?.blip('ok');
    if (this.sel.id || availableToPlace(this.state, this.sel.type) < 1) this.sel = null;
    this.refresh(); this._ghost();
  }
}
