import * as THREE from 'three';
import { POIS, poiById, DISTRICTS } from '../world/cityData.js';

const CLOSE = ['lofts', 'market', 'threads', 'fitness', 'cityhall', 'scarth', 'victoriapark'];
const FAR = ['leg', 'bridge', 'wascana', 'stadium', 'uofr', 'airport', 'harbour', 'cathedral', 'northcentral', 'rochdale', 'east', 'south'];
const VIEW = {
  close: { target: new THREE.Vector3(20, 0, 5), dist: 440, fov: 34 },
  far:   { target: new THREE.Vector3(500, 0, 450), dist: 12500, fov: 32 },
};
const DIR = new THREE.Vector3(0.2, 1.05, 0.72).normalize(); // camera sits south-east and above → north is "up" on screen

/**
 * Home screen: a tilted overhead view of the city with tappable emoji pins (the "pick where you start" screen).
 * Pins are plain DOM elements projected from world space each frame.
 */
export class Hub {
  constructor({ pinsEl, cardEl, onSelect, onZoom }) {
    this.pinsEl = pinsEl; this.cardEl = cardEl; this.onSelect = onSelect; this.onZoom = onZoom;
    this.level = 'close'; this.active = false; this.selected = null; this.t = 0;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.fov = VIEW.close.fov; this.snapNext = true;
    this._v = new THREE.Vector3(); this.pins = new Map();
    pinsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-pin]'); if (!b) return; if (b.dataset.pin === 'downtown') this.setLevel('close'); else this.select(this.selected === b.dataset.pin ? null : b.dataset.pin); });
  }
  show() { this.active = true; this.snapNext = true; this.render(); }
  hide() { this.active = false; }
  setLevel(l) { this.level = l; this.selected = null; this.render(); this.onSelect?.(null, null); this.onZoom?.(l); }
  select(id) { this.selected = id; this.pinsEl.querySelectorAll('.pin').forEach((p) => p.classList.toggle('sel', p.dataset.pin === id)); this.renderCard(); this.onSelect?.(id ? this.info() : null, id); }
  render() {
    const ids = this.level === 'close' ? CLOSE : FAR;
    const mk = (id, emoji, name, open, x, z) => `<button class="pin ${open ? 'open' : ''}" data-pin="${id}" aria-label="${name}"><span class="pe">${emoji}</span><span class="pl">${name}</span></button>`;
    let html = ids.map((id) => { const p = poiById[id]; return mk(id, p.emoji, p.name.replace(/ \(Home\)/, ''), p.state === 'open'); }).join('');
    if (this.level === 'far') html += mk('downtown', '🏙️', 'Downtown Regina', true);
    this.pinsEl.innerHTML = html;
    this.pins = new Map([...this.pinsEl.querySelectorAll('.pin')].map((el) => [el.dataset.pin, { el, p: el.dataset.pin === 'downtown' ? { x: 0, z: 0 } : poiById[el.dataset.pin] }]));
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
  /** Drive the camera + pin layout. camera: THREE.PerspectiveCamera */
  update(dt, camera, w, h) {
    this.t += dt; const v = VIEW[this.level];
    const sway = Math.sin(this.t * 0.12) * 0.12, dir = this._v.copy(DIR).applyAxisAngle(THREE.Object3D.DEFAULT_UP, sway);
    const wantPos = dir.multiplyScalar(v.dist).add(v.target), k = this.snapNext ? 1 : 1 - Math.exp(-dt * 2.2);
    this.pos.lerp(wantPos, k); this.look.lerp(v.target, k); this.fov += (v.fov - this.fov) * k; this.snapNext = false;
    camera.position.copy(this.pos); camera.lookAt(this.look);
    // scale the clip planes with distance so far views keep enough depth precision (otherwise the lake z-fights the park)
    const d = this.pos.distanceTo(this.look), near = Math.max(3, d * 0.12), far = d * 4 + 6000;
    if (Math.abs(camera.near - near) > near * 0.02) { camera.near = near; camera.far = far; camera.updateProjectionMatrix(); }
    if (Math.abs(camera.fov - this.fov) > 0.01) { camera.fov = this.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    for (const { el, p } of this.pins.values()) {
      const s = this._v.set(p.x, this.level === 'close' ? 22 : 90, p.z).project(camera);
      const vis = s.z < 1 && Math.abs(s.x) < 1.05 && Math.abs(s.y) < 1.05;
      el.style.display = vis ? '' : 'none';
      if (vis) el.style.transform = `translate(${((s.x + 1) / 2) * w}px, ${((1 - s.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }
}
export const HUB_LEVELS = VIEW;
