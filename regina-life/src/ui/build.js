import * as THREE from 'three';
import { itemDef, footprint, ownedTypes, availableToPlace, canPlace, placeFurniture, moveFurniture, removeFurniture } from '../core/home.js';

const TEXT_TARGET = (t) => t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);

/**
 * Build mode (Sims-style): overhead camera over your apartment; tap a piece from storage, tap the floor to place it.
 * Tap an existing piece to pick it up and move it; R rotates; Delete stores it; Esc deselects, then exits.
 * Every placement is validated by core/home.js (bounds, fixtures, overlaps, and that you can still walk everywhere).
 */
export class BuildMode {
  constructor({ canvas, camera, scene, store, panels, audio, toast, isBlocked = () => false, onStart, onStop, onLayout }) {
    Object.assign(this, { canvas, camera, scene, store, panels, audio, toast, isBlocked, onStart, onStop, onLayout });
    this.active = false; this.sel = null; this.rot = 0; this.pt = null; this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.hit = new THREE.Vector3();
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#34c98b', transparent: true, opacity: 0.45, depthWrite: false })); this.ghost.visible = false; this.ghost.renderOrder = 5; scene.add(this.ghost);
    this.el = document.getElementById('build'); this.itemsEl = document.getElementById('b-items'); this.hintEl = document.getElementById('b-hint');
    document.getElementById('b-done').onclick = () => this.stop();
    document.getElementById('b-rot').onclick = () => this.rotate();
    document.getElementById('b-del').onclick = () => this.removeSel();
    document.getElementById('b-shop').onclick = () => panels.furnitureShop(() => this.refresh());
    document.getElementById('b-style').onclick = () => panels.styleMenu(() => this.refresh());
    this.itemsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (!b) return; this.select({ type: b.dataset.type, id: null }); this.audio?.blip('tick'); });
    this._down = null;
    canvas.addEventListener('pointerdown', (e) => { if (!this.active || panels.open || e.button === 2) return; this._down = { x: e.clientX, y: e.clientY, id: e.pointerId }; this._move(e); });
    canvas.addEventListener('pointermove', (e) => { if (this.active && !panels.open) this._move(e); });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.active || panels.open || !this._down || this._down.id !== e.pointerId) { this._down = null; return; }
      const d = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y); this._down = null; if (d < 8) { this._move(e); this.click(false); }
    });
    canvas.addEventListener('pointercancel', () => { this._down = null; });
    // secondary button: handled ONCE here (pointerup ignores button 2). Touch long-press is ignored — use the Store button.
    canvas.addEventListener('contextmenu', (e) => { if (!this.active) return; e.preventDefault(); if (e.pointerType === 'touch' || panels.open) return; this._move(e); this.click(true); });
    // capture phase: we see the key BEFORE the panel/phone handlers close anything, so Esc on a panel never also exits build mode
    addEventListener('keydown', (e) => {
      if (!this.active || panels.open || this.isBlocked() || TEXT_TARGET(e.target) || e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'r') this.rotate(); else if (k === 'delete' || k === 'backspace' || k === 'x') this.removeSel();
      else if (k === 'escape') { if (this.sel) { this.select(null); } else this.stop(); }
    }, true);
    addEventListener('resize', () => this.active && this._layout());
  }
  get state() { return this.store.state; }
  start() { this.active = true; this.sel = null; this.rot = 0; this.el.hidden = false; document.body.classList.add('building'); this.refresh(); this.onStart?.(); this.toast('Build mode · tap a piece below, then tap the floor', 'info'); }
  stop() { if (!this.active) return; this.active = false; this.el.hidden = true; this.ghost.visible = false; document.body.classList.remove('building'); this.sel = null; this.onStop?.(); }
  _layout() { this.onLayout?.(Math.min(0.6, (this.el.offsetHeight + 14) / Math.max(1, innerHeight))); }
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
    const types = ownedTypes(s).filter((t) => availableToPlace(s, t) > 0 || this.sel?.type === t);
    this.itemsEl.innerHTML = types.length ? types.map((t) => { const d = itemDef(t), n = availableToPlace(s, t); return `<button class="bchip ${this.sel?.type === t ? 'on' : ''}" data-type="${t}"><span class="sw" style="background:${d.color ?? '#e8d9a8'}"></span>${d.name}${n > 0 ? ` <b>×${n}</b>` : ' <b>(moving)</b>'}</button>`; }).join('') : '<span class="bempty">Nothing in storage — open the 🛋️ Shop to buy furniture. Posters from trips are free.</span>';
    this.hintEl.textContent = this.sel ? (this.sel.id ? 'Tap a spot to move it · R rotate · Del store · Esc cancel' : 'Tap the floor to place · R rotate · Esc cancel') : 'Tap a piece below — or tap placed furniture to move it';
    this._layout();
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
    const g = this.ghost; if (!this.sel || !this.pt) { g.visible = false; return; }
    const d = itemDef(this.sel.type); if (!d) { g.visible = false; return; }
    const f = footprint(this.sel.type, this.rot), c = canPlace(this.state, this.sel.type, this.pt.x, this.pt.z, this.rot, this.sel.id);
    g.visible = true; g.scale.set(f.w, Math.max(0.06, d.h), f.d); g.position.set(c.ok ? c.x : Math.round(this.pt.x * 4) / 4, Math.max(0.03, d.h) / 2, c.ok ? c.z : Math.round(this.pt.z * 4) / 4);
    g.material.color.set(c.ok ? '#34c98b' : '#ff5a5f'); this.lastCheck = c; this.hintEl.dataset.err = c.ok ? '' : c.error;
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
