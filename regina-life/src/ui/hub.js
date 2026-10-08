import * as THREE from 'three';
import { poiById } from '../world/cityData.js';
import { spreadRects } from './maplayout.js';

const CLOSE = ['lofts', 'market', 'threads', 'fitness', 'cityhall', 'scarth', 'victoriapark'];
const FAR = ['leg', 'bridge', 'wascana', 'stadium', 'uofr', 'airport', 'harbour', 'cathedral', 'northcentral', 'rochdale', 'east', 'south'];
// target/dist are only the starting guess: fit() reframes each level so every pin sits between the header and the card
const VIEW = {
  close: { target: new THREE.Vector3(20, 0, 5), dist: 440, fov: 34, pinY: 22 },
  far:   { target: new THREE.Vector3(500, 0, 450), dist: 12500, fov: 32, pinY: 90 },
};
const DIR = new THREE.Vector3(0.2, 1.05, 0.72).normalize(); // camera sits south-east and above → north is "up" on screen
const UP = THREE.Object3D.DEFAULT_UP;
const PIN = 46, R = PIN / 2 - 2, LIFT = 12, LABEL_H = 24, SEL_EXTRA = 90; // pin footprint, circle radius, gap between circle and the real spot, label row, extra card height once a place is selected

/**
 * Home screen: a tilted overhead view of the city with tappable emoji pins (the "pick where you start" screen).
 * Pins are plain DOM elements projected from world space each frame, then spread apart so none overlap, with a thin
 * leader line down to the real spot. The camera is auto-framed so every pin fits between the header and the card.
 */
export class Hub {
  constructor({ pinsEl, cardEl, onSelect, onZoom }) {
    this.pinsEl = pinsEl; this.cardEl = cardEl; this.onSelect = onSelect; this.onZoom = onZoom;
    this.topEl = pinsEl.parentElement?.querySelector('.hub-top') ?? null;
    this.level = 'close'; this.active = false; this.selected = null; this.t = 0;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.fov = VIEW.close.fov; this.snapNext = true;
    this._v = new THREE.Vector3(); this.pins = new Map();
    this.fitted = { close: null, far: null }; this.dirty = true; this.safe = null; this._fitCam = new THREE.PerspectiveCamera();
    pinsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-pin]'); if (!b) return; if (b.dataset.pin === 'downtown') this.setLevel('close'); else this.select(this.selected === b.dataset.pin ? null : b.dataset.pin); });
    addEventListener('resize', () => { this.dirty = true; });
    document.fonts?.ready?.then(() => { this.dirty = true; }); // header/card heights change once the web fonts land
  }
  show() { this.active = true; this.snapNext = true; this.dirty = true; this.render(); }
  hide() { this.active = false; }
  setLevel(l) { this.level = l; this.selected = null; this.dirty = true; this.render(); this.onSelect?.(null, null); this.onZoom?.(l); }
  select(id) { this.selected = id; this.pinsEl.querySelectorAll('.pin').forEach((p) => p.classList.toggle('sel', p.dataset.pin === id)); this.renderCard(); this.onSelect?.(id ? this.info() : null, id); } // no refit: the pin area already leaves room for the taller 'selected' card
  render() {
    const ids = this.level === 'close' ? CLOSE : FAR;
    const mk = (id, emoji, name, open) => `<button class="pin ${open ? 'open' : ''}" data-pin="${id}" aria-label="${name}"><span class="pe">${emoji}</span><span class="pl">${name}</span></button>`;
    const items = ids.map((id) => { const p = poiById[id]; return { id, html: mk(id, p.emoji, p.name.replace(/ \(Home\)/, ''), p.state === 'open'), p, name: p.name.replace(/ \(Home\)/, '') }; });
    if (this.level === 'far') items.push({ id: 'downtown', html: mk('downtown', '🏙️', 'Downtown Regina', true), p: { x: 0, z: 0 }, name: 'Downtown Regina' });
    this.pinsEl.dataset.level = this.level;
    this.pinsEl.innerHTML = `<svg class="leaders" aria-hidden="true">${items.map((i) => `<g data-l="${i.id}"><line/><circle r="4"/></g>`).join('')}</svg>` + items.map((i) => i.html).join('');
    this.pins = new Map(items.map((i) => {
      const el = this.pinsEl.querySelector(`.pin[data-pin="${i.id}"]`), l = this.pinsEl.querySelector(`[data-l="${i.id}"]`);
      return [i.id, { el, p: i.p, line: l.firstElementChild, dot: l.lastElementChild, lw: el.querySelector('.pl').offsetWidth || i.name.length * 6.6 + 22, x: null, y: 0 }];
    }));
    this.renderCard();
  }
  renderCard() {
    const id = this.selected; if (!id) { this.cardEl.classList.remove('sel'); return; }
    this.cardEl.classList.add('sel');
  }
  info() {
    const id = this.selected; if (!id) return null;
    if (id === 'downtown') return { name: 'Downtown Regina', emoji: '🏙️', blurb: 'Scarth Street, Victoria Ave and your neighbourhood. Zoom in to pick a building.', open: true, downtown: true };
    const p = poiById[id]; return { name: p.name, emoji: p.emoji, blurb: p.blurb, open: p.state === 'open' };
  }

  /** Names under the pins only where there is room for them: wide screens in the close-up (the far view is an overview; names show on hover/tap). */
  _labelH(w) { return w >= 900 && this.level === 'close' ? LABEL_H : 0; }

  /** The screen area pins may occupy: below the header chips, beside or above the card (which grows when a place is selected). */
  _measure(w, h) {
    const top = this.topEl?.getBoundingClientRect(), card = this.cardEl.getBoundingClientRect();
    const side = card.width > 0 && card.width < w * 0.7 && card.left > w * 0.35; // landscape phones park the card at the side
    // the card grows when a place is selected; reserve that room up front so selecting a pin never reflows the map
    const cardTop = card.top ? card.top - (side || this.cardEl.classList.contains('sel') ? 0 : SEL_EXTRA) : h;
    const safe = { x0: 6, x1: side ? card.left - 8 : w - 6, y0: (top?.bottom ?? 0) + 8, y1: side ? h - 8 : Math.min(h, cardTop) - 8, fixed: [] };
    if (!side && safe.y1 - safe.y0 < 150) { // squashed window: use the full height but make the card a wall the pins must go around
      safe.y1 = h - 8; if (card.width && h > cardTop) safe.fixed.push({ x: (card.left + card.right) / 2, y: (cardTop + h) / 2, w: card.width, h: h - cardTop });
    }
    return safe;
  }
  /** Find a camera target and distance that puts every pin's real spot inside the safe area. */
  _fit(w, h) {
    const v = VIEW[this.level], safe = this.safe = this._measure(w, h), labels = w >= 900 ? LABEL_H : 0;
    const pts = [...this.pins.values()].map((q) => new THREE.Vector3(q.p.x, v.pinY, q.p.z));
    if (!pts.length) return;
    const ax0 = safe.x0 + PIN / 2, ax1 = safe.x1 - PIN / 2, ay0 = safe.y0 + LIFT + PIN, ay1 = safe.y1 + LIFT - labels;
    const tgt = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3()); tgt.y = 0;
    const cam = this._fitCam; cam.fov = v.fov; cam.aspect = w / h; cam.near = 1; cam.far = 1e6; cam.updateProjectionMatrix();
    const fwd = new THREE.Vector3(-DIR.x, 0, -DIR.z).normalize(), right = new THREE.Vector3().crossVectors(fwd, UP).normalize(), tmp = new THREE.Vector3();
    let dist = v.dist;
    for (let i = 0; i < 24; i++) {
      cam.position.copy(DIR).multiplyScalar(dist).add(tgt); cam.lookAt(tgt); cam.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) { const s = tmp.copy(p).project(cam), x = ((s.x + 1) / 2) * w, y = ((1 - s.y) / 2) * h; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const k = Math.max((x1 - x0) / Math.max(1, ax1 - ax0), (y1 - y0) / Math.max(1, ay1 - ay0));
      dist = Math.min(40000, Math.max(120, dist * Math.min(1.45, Math.max(0.7, k))));
      const ppm = h / 2 / (Math.tan((v.fov * Math.PI) / 360) * dist), dx = (ax0 + ax1) / 2 - (x0 + x1) / 2, dy = (ay0 + ay1) / 2 - (y0 + y1) / 2;
      tgt.addScaledVector(right, -dx / ppm).addScaledVector(fwd, dy / (ppm * DIR.y));
    }
    this.fitted[this.level] = { target: tgt, dist: dist * 1.04 };
  }

  /** Drive the camera + pin layout. camera: THREE.PerspectiveCamera */
  update(dt, camera, w, h) {
    this.t += dt; const v = VIEW[this.level];
    if (this.dirty && w) { this._fit(w, h); this.dirty = false; }
    const f = this.fitted[this.level] ?? v;
    // the camera holds still once framed: pins are laid out from fixed anchors, so they never shuffle or drift
    const wantPos = this._v.copy(DIR).multiplyScalar(f.dist).add(f.target), k = this.snapNext ? 1 : 1 - Math.exp(-dt * 2.2);
    this.pos.lerp(wantPos, k); this.look.lerp(f.target, k); this.fov += (v.fov - this.fov) * k; this.snapNext = false;
    camera.position.copy(this.pos); camera.lookAt(this.look);
    // scale the clip planes with distance so far views keep enough depth precision (otherwise the lake z-fights the park)
    const d = this.pos.distanceTo(this.look), near = Math.max(3, d * 0.12), far = d * 4 + 6000;
    if (Math.abs(camera.near - near) > near * 0.02) { camera.near = near; camera.far = far; camera.updateProjectionMatrix(); }
    if (Math.abs(camera.fov - this.fov) > 0.01) { camera.fov = this.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    this._layoutPins(dt, camera, w, h);
  }

  _layoutPins(dt, camera, w, h) {
    const list = [...this.pins.values()]; if (!list.length) return;
    const safe = this.safe ?? this._measure(w, h), labels = this._labelH(w), y = this.level === 'close' ? VIEW.close.pinY : VIEW.far.pinY;
    const rects = list.map((q) => {
      const s = this._v.set(q.p.x, y, q.p.z).project(camera);
      q.front = s.z < 1; q.ax = ((s.x + 1) / 2) * w; q.ay = ((1 - s.y) / 2) * h;
      return { x: q.ax, y: q.ay - LIFT - R + labels / 2, w: labels ? Math.max(PIN, q.lw + 8) : PIN, h: PIN + labels };
    });
    // the camera holds still once framed, so the anchors rarely change: only re-solve the layout when they (or the safe area) do
    const sig = `${labels}|${safe.x0},${safe.y0},${safe.x1},${safe.y1}|${safe.fixed.map((f) => [f.x, f.y, f.w, f.h].join()).join(';')}|` + list.map((q) => `${q.ax.toFixed(1)},${q.ay.toFixed(1)}`).join(';');
    if (sig !== this._sig || !this._spread) { spreadRects(rects, safe, { fixed: safe.fixed }); this._spread = rects.map((r) => ({ x: r.x, y: r.y })); this._sig = sig; }
    else this._spread.forEach((r, i) => { rects[i].x = r.x; rects[i].y = r.y; });
    const k = dt > 0 && list[0].x !== null ? 1 - Math.exp(-dt * 16) : 1;
    list.forEach((q, i) => {
      const r = rects[i];
      if (q.x === null) { q.x = r.x; q.y = r.y; } else { q.x += (r.x - q.x) * k; q.y += (r.y - q.y) * k; }
      const cx = q.x, cy = q.y - labels / 2, vis = q.front && q.ax > -40 && q.ax < w + 40 && q.ay > -40 && q.ay < h + 40;
      q.el.style.display = vis ? '' : 'none'; q.line.parentNode.style.display = vis ? '' : 'none';
      if (!vis) return;
      q.el.style.transform = `translate(${cx - PIN / 2 + 2}px, ${cy - PIN / 2 + 2}px)`;
      const bx = cx, by = cy + R, len = Math.hypot(q.ax - bx, q.ay - by);
      q.line.setAttribute('x1', bx); q.line.setAttribute('y1', by); q.line.setAttribute('x2', q.ax); q.line.setAttribute('y2', q.ay);
      q.line.style.opacity = len > 2 ? 1 : 0; q.dot.setAttribute('cx', q.ax); q.dot.setAttribute('cy', q.ay);
    });
  }
}
export const HUB_LEVELS = VIEW;
