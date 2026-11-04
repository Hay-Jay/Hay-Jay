import * as THREE from 'three';
import { buildCharacter } from '../player/character.js';
import { DEFAULT_LOOK, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from '../data/catalog.js';
import { mulberry32, hashStr } from '../core/rng.js';
import { VIGNETTE_BY_ID, vignetteLine } from '../core/vignettes.js';
import { outfitForTemp } from './npcs.js';

/**
 * City scenes in the world (core/vignettes.js says who is out): each is a labelled NPC holding an activity pose (player/poses.js) at a spot main.js
 * picks from the built city, with a few props of its own (an easel, a guitar case, snow or leaf piles). Children of `parent` (the city group), so
 * they step out with the city indoors and in the creator's studio.
 *   spots = { id: { x, z, yaw, y?, sit? } }
 */
export class Vignettes {
  constructor(parent, spots) { this.parent = parent; this.spots = spots; this.actors = new Map(); this.key = ''; }
  has(id) { return this.actors.has(id); }
  /** Bring the scenes that are out now into the world, dressed for `temp`, and send the rest home (rebuilt only when that changes). */
  sync(ids, temp) {
    const key = ids.filter((id) => this.spots[id]).join(',') + '|' + Math.round((Number.isFinite(temp) ? temp : 10) / 8);
    if (key === this.key) return; this.key = key;
    for (const a of this.actors.values()) { this.parent.remove(a.g); a.ch.dispose(); a.dispose(); }
    this.actors.clear();
    for (const id of ids) { const sp = this.spots[id], v = VIGNETTE_BY_ID[id]; if (sp && v) this.actors.set(id, this._actor(id, v, sp, temp)); }
  }
  _actor(id, v, sp, temp) {
    const rnd = mulberry32(hashStr('vignette:' + id));
    const look = { ...DEFAULT_LOOK, skin: Math.floor(rnd() * SKIN_TONES.length), hair: HAIR_STYLES[Math.floor(rnd() * (HAIR_STYLES.length - 1))], hairColor: Math.floor(rnd() * HAIR_COLORS.length), expression: 'smile', ...outfitForTemp(temp, rnd) };
    const g = new THREE.Group(); g.position.set(sp.x, 0, sp.z); g.rotation.y = sp.yaw; this.parent.add(g);
    const ch = buildCharacter(look, { detail: 0.5 }); ch.root.position.y = sp.y ?? 0; g.add(ch.root);
    ch.motion({ sitting: !!sp.sit, pose: v.pose, poseT: 1e9, poseAge: rnd() * 6 });
    const geos = [], mats = [], M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }); mats.push(m); return m; };
    const add = (geo, mat, x, y, z) => { geos.push(geo); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    if (id === 'painter') {   // an easel in front, the canvas facing the painter
      const wood = M('#9a6a3c'); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.04, 1.5, 0.04), wood, s * 0.28, 0.75, 0.95).rotation.z = s * -0.12;
      add(new THREE.BoxGeometry(0.04, 1.4, 0.04), wood, 0, 0.7, 1.12).rotation.x = -0.25; add(new THREE.BoxGeometry(0.62, 0.04, 0.08), wood, 0, 0.82, 0.93);
      add(new THREE.BoxGeometry(0.66, 0.5, 0.03), M('#fbf6ea'), 0, 1.1, 0.9); add(new THREE.BoxGeometry(0.5, 0.18, 0.005), M('#7fbde0'), 0, 1.22, 0.88); add(new THREE.BoxGeometry(0.5, 0.12, 0.005), M('#93bf6a'), 0, 1.0, 0.88);
    }
    if (id === 'busker') {   // an open guitar case at their feet
      add(new THREE.BoxGeometry(0.42, 0.08, 1.0), M('#2a2f38'), 0.15, 0.04, 0.7); add(new THREE.BoxGeometry(0.36, 0.02, 0.92), M('#b2382a'), 0.15, 0.085, 0.7);
    }
    if (id === 'shoveller') for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(0.35 + k * 0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#f4f7fb'), 0.9 + k * 0.15, 0, -0.6 - k * 0.7).scale.set(1.3, 0.55, 1);
    if (id === 'raker') { const leaf = M('#d9822b'), leaf2 = M('#b8542a'); for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), k % 2 ? leaf2 : leaf, -1.2 + k * 1.1, 0, 1.4 + (k % 2) * 0.4).scale.set(1.2, 0.5, 1); }
    return { g, ch, k: Math.floor(rnd() * 3), x: sp.x, z: sp.z, dispose: () => { geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); } };
  }
  update(dt, playerPos) {
    for (const a of this.actors.values()) { const d = Math.hypot(a.x - playerPos.x, a.z - playerPos.z); a.g.visible = d < 220; if (d < 170) a.ch.update(dt); }
  }
  /** The scene within reach, for the "Say hi" prompt. */
  nearest(pos, max = 2.8) {
    let best = null, bd = max;
    for (const [id, a] of this.actors) { const d = Math.hypot(a.x - pos.x, a.z - pos.z); if (d < bd) { bd = d; best = { id, x: a.x, z: a.z, who: VIGNETTE_BY_ID[id].who, icon: VIGNETTE_BY_ID[id].icon }; } }
    return best;
  }
  /** Say hi: they wave and answer (a different line each time). */
  greet(id, c) { const a = this.actors.get(id); if (!a) return ''; a.ch.gesture('wave', 1.4); return vignetteLine(id, c, a.k++); }
}
