import * as THREE from 'three';
import { buildCharacter } from '../player/character.js';
import { DEFAULT_LOOK, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, FACE_SHAPES, BODY_TYPES } from '../data/catalog.js';
import { PITCH, ROAD_W } from './cityData.js';
import { mulberry32 } from '../core/rng.js';

/** Weather-responsive outfit for NPCs (and a shared helper for tests). */
export function outfitForTemp(temp, rnd = Math.random) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  if (temp <= -15) return { top: 'jacket_black', bottom: 'jeans_black', shoes: 'boots_brown', head: pick(['toque_red', 'toque_grey']), neck: 'scarf_plaid' };
  if (temp <= -3) return { top: pick(['jacket_black', 'jacket_green']), bottom: pick(['jeans_blue', 'jeans_black']), shoes: 'boots_brown', head: pick(['toque_grey', 'none_head']), neck: 'none_neck' };
  if (temp <= 8) return { top: pick(['hoodie_grey', 'hoodie_red', 'sweater_cream', 'jacket_green']), bottom: pick(['jeans_blue', 'chino_tan', 'jogger_grey']), shoes: pick(['sneaker_black', 'boots_brown']), head: 'none_head', neck: 'none_neck' };
  if (temp <= 18) return { top: pick(['hoodie_grey', 'tee_navy', 'sweater_cream']), bottom: pick(['jeans_blue', 'chino_tan']), shoes: 'sneaker_black', head: 'none_head', neck: 'none_neck' };
  return { top: pick(['tee_white', 'tee_black', 'tee_navy']), bottom: pick(['shorts_khaki', 'chino_tan', 'jeans_blue']), shoes: 'sneaker_white', head: pick(['none_head', 'cap_navy']), face_acc: pick(['none_face', 'shades']) };
}

const LINES = [
  (c) => `Hey! ${c.temp <= -5 ? "It's freezing, eh?" : c.temp >= 22 ? 'Beautiful day, eh?' : 'Nice day for a walk.'}`,
  () => 'Have you been down to Wascana yet? The lake is lovely.',
  () => "Prairie Corner Market's bannock is the best in town.",
  () => 'Go Riders! 💚',
  (c) => (c.night ? "Quiet night downtown, isn't it?" : 'Busy morning on Victoria Ave!'),
  () => 'Careful on the crosswalks — Regina drivers are friendly, mostly.',
];

export class Pedestrians {
  constructor(scene, { count = 14, temp = 15 } = {}) {
    this.scene = scene; this.list = [];
    const rnd = mulberry32(777), R2 = ROAD_W / 2;
    for (let n = 0; n < count; n++) {
      const bi = Math.floor(rnd() * 5) - 2, bj = Math.floor(rnd() * 5) - 2; // blocks near the spawn
      const x0 = bi * PITCH + R2 - 1.5, x1 = (bi + 1) * PITCH - R2 + 1.5, z0 = bj * PITCH + R2 - 1.5, z1 = (bj + 1) * PITCH - R2 + 1.5;
      const loop = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], start = Math.floor(rnd() * 4), dir = rnd() < 0.5 ? 1 : -1;
      const a = loop[start], b = loop[(start + dir + 4) % 4];
      const t = rnd();
      const look = { ...DEFAULT_LOOK, skin: Math.floor(rnd() * SKIN_TONES.length), hair: HAIR_STYLES[Math.floor(rnd() * HAIR_STYLES.length)], hairColor: Math.floor(rnd() * HAIR_COLORS.length), face: FACE_SHAPES[Math.floor(rnd() * 4)], body: BODY_TYPES[Math.floor(rnd() * 4)], facialHair: rnd() < 0.2 ? 'stubble' : 'none', expression: rnd() < 0.6 ? 'smile' : 'neutral', height: 0.94 + rnd() * 0.12, ...outfitForTemp(temp, rnd), face_acc: 'none_face' };
      Object.assign(look, outfitForTemp(temp, rnd));
      const ch = buildCharacter(look, { detail: 0.45 });
      ch.root.position.set(a[0] + (b[0] - a[0]) * t, 0, a[1] + (b[1] - a[1]) * t);
      scene.add(ch.root);
      this.list.push({ ch, baseLook: look, loop, idx: (start + dir + 4) % 4, dir, speed: 1.2 + rnd() * 0.7, wait: 0, rnd, x: ch.root.position.x, z: ch.root.position.z, yaw: 0, lookSeed: n });
    }
  }
  /** Re-dress everyone when the weather changes. */
  redress(temp) {
    for (const n of this.list) {
      const pos = n.ch.root.position.clone(), yaw = n.ch.root.rotation.y;
      this.scene.remove(n.ch.root); n.ch.dispose();
      const base = { ...n.baseLook, face_acc: 'none_face', neck: 'none_neck', head: 'none_head', ...outfitForTemp(temp, n.rnd) }; n.baseLook = base;
      n.ch = buildCharacter({ ...base }, { detail: 0.45 }); n.ch.root.position.copy(pos); n.ch.root.rotation.y = yaw; this.scene.add(n.ch.root);
    }
  }
  setVisible(v) { this.hidden = !v; for (const n of this.list) n.ch.root.visible = v; }
  update(dt, playerPos) {
    this.list.forEach((n, i) => {
      if (i >= (this.limit ?? 99)) { n.ch.root.visible = false; return; }
      const d = Math.hypot(n.x - playerPos.x, n.z - playerPos.z);
      n.ch.root.visible = d < 260;
      if (d > 320) return; // out of range: freeze
      if (n.wait > 0) { n.wait -= dt; n.ch.motion({ speed: 0 }); n.ch.update(dt); return; }
      const tgt = n.loop[n.idx], dx = tgt[0] - n.x, dz = tgt[1] - n.z, l = Math.hypot(dx, dz);
      if (l < 0.6) { n.idx = (n.idx + n.dir + 4) % 4; if (n.rnd() < 0.25) n.wait = 2 + n.rnd() * 5; return; }
      const want = Math.atan2(dx, dz); n.yaw += Math.atan2(Math.sin(want - n.yaw), Math.cos(want - n.yaw)) * Math.min(1, dt * 6);
      n.x += (dx / l) * n.speed * dt; n.z += (dz / l) * n.speed * dt;
      n.ch.root.position.set(n.x, 0, n.z); n.ch.root.rotation.y = n.yaw; n.ch.motion({ speed: n.speed }); n.ch.update(dt);
    });
  }
  nearest(pos, max = 2.6) {
    let best = null, bd = max;
    for (const n of this.list) { const d = Math.hypot(n.x - pos.x, n.z - pos.z); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  greet(n, ctx) { n.wait = 4; const dx = ctx.px - n.x, dz = ctx.pz - n.z; n.yaw = Math.atan2(dx, dz); n.ch.root.rotation.y = n.yaw; n.ch.gesture('wave', 1.6); return LINES[Math.floor(Math.random() * LINES.length)](ctx); }
}
