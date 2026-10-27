import * as THREE from 'three';
import { buildCharacter } from '../player/character.js';
import { DEFAULT_LOOK, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from '../data/catalog.js';
import { PET_KINDS } from '../core/pets.js';
import { hashStr, mulberry32 } from '../core/rng.js';

/**
 * Who is home with you: your pet (a little procedural dog or cat that trots after you and wags) and, once you live together, your partner
 * (a resident drawn with the same character builder, pottering about the room). Only drawn inside your own home.
 */
export function buildPet(kind, color) {
  const root = new THREE.Group(), geos = [], mats = [];
  const M = (c, rough = 0.85) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: rough }); mats.push(m); return m; };
  const mesh = (g, m, parent, x = 0, y = 0, z = 0) => { geos.push(g); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const dog = kind === 'dog', fur = M(color), dark = M('#1b1412', 0.5), light = M(new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45));
  const s = dog ? 1 : 0.78;
  const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);
  const torso = mesh(new THREE.CapsuleGeometry(0.13, 0.32, 6, 12).rotateX(Math.PI / 2), fur, body, 0, 0.33, 0); torso.scale.set(1, 0.95, 1);
  const head = new THREE.Group(); head.position.set(0, 0.5, 0.27); body.add(head);
  mesh(new THREE.SphereGeometry(0.13, 16, 12), fur, head);
  if (dog) { mesh(new THREE.CapsuleGeometry(0.06, 0.08, 4, 8).rotateX(Math.PI / 2), light, head, 0, -0.04, 0.12); mesh(new THREE.SphereGeometry(0.03, 8, 6), dark, head, 0, -0.02, 0.2); }
  else { mesh(new THREE.SphereGeometry(0.06, 10, 8), light, head, 0, -0.04, 0.09).scale.set(1.3, 0.8, 0.8); mesh(new THREE.SphereGeometry(0.015, 8, 6), M('#e08a9a'), head, 0, -0.02, 0.135); }
  for (const x of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.022, 8, 6), dark, head, x * 0.05, 0.03, 0.11);
    if (dog) { const ear = mesh(new THREE.CapsuleGeometry(0.035, 0.08, 4, 8), fur, head, x * 0.11, 0.02, -0.01); ear.rotation.z = x * 0.35; ear.scale.set(1, 1, 0.5); }
    else { const ear = mesh(new THREE.ConeGeometry(0.05, 0.09, 4), fur, head, x * 0.07, 0.12, 0); ear.rotation.z = x * -0.25; }
  }
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const g = new THREE.Group(); g.position.set(x * 0.08, 0.28, z * 0.15); body.add(g); mesh(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), fur, g, 0, -0.14, 0); legs.push(g); }
  const tail = new THREE.Group(); tail.position.set(0, 0.4, -0.28); body.add(tail);
  const t = mesh(new THREE.CapsuleGeometry(dog ? 0.03 : 0.022, dog ? 0.18 : 0.3, 4, 8), fur, tail, 0, 0.1, -0.03); t.rotation.x = -0.5;
  let ph = Math.random() * 6;
  return {
    root,
    /** speed in m/s; happy wags faster */
    update(dt, speed, happy = true) {
      ph += dt * (4 + speed * 5); const step = Math.min(1, speed / 1.5);
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * step; });
      tail.rotation.z = Math.sin(ph * (happy ? 2.6 : 0.8)) * (happy ? 0.6 : 0.15); tail.rotation.x = happy ? 0 : 0.5;
      head.rotation.x = speed < 0.1 ? Math.sin(ph * 0.3) * 0.08 : 0; body.position.y = Math.abs(Math.sin(ph)) * 0.02 * step;
    },
    dispose() { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); },
  };
}

/** A stable look for a resident (they have no saved look): seeded by their id. */
export function residentLook(id) {
  const r = mulberry32(hashStr('look:' + id)), fem = r() < 0.5;
  return { ...DEFAULT_LOOK, frame: fem ? 'female' : 'male', skin: Math.floor(r() * SKIN_TONES.length), hairColor: Math.floor(r() * HAIR_COLORS.length),
    hair: fem ? ['long', 'bob', 'ponytail', 'curly', 'braids'][Math.floor(r() * 5)] : HAIR_STYLES[Math.floor(r() * 4)], lips: fem ? 1 + Math.floor(r() * 3) : 0, expression: 'smile',
    top: ['tee_white', 'tee_coral', 'sweater_cream', 'hoodie_grey'][Math.floor(r() * 4)], bottom: fem && r() < 0.5 ? 'skirt_denim' : 'jeans_blue', height: 0.95 + r() * 0.08 };
}

/** Manages the pet and partner meshes in the home scene. */
export class Household {
  constructor() { this.pet = null; this.petKey = ''; this.partner = null; this.partnerKey = ''; this.group = null; this.petPos = new THREE.Vector3(); this.petYaw = 0; this.wander = { t: 0, x: 0, z: 0 }; }
  /** Rebuild if who lives with you changed. `pet` = sanitized pet or null; `partnerId` = resident id or null (only when living together). */
  sync(parent, pet, partnerId, spawn) {
    if (this.group !== parent) { this.clear(); this.group = parent; }
    const pk = pet ? `${pet.kind}|${pet.color}` : '';
    if (pk !== this.petKey) {
      if (this.pet) { this.pet.root.removeFromParent(); this.pet.dispose(); this.pet = null; }
      this.petKey = pk;
      if (pet && parent) { this.pet = buildPet(pet.kind, PET_KINDS[pet.kind].colors[pet.color]); this.petPos.set(spawn.x + 0.8, 0, spawn.z - 0.6); this.pet.root.position.copy(this.petPos); parent.add(this.pet.root); }
    }
    const rk = partnerId || '';
    if (rk !== this.partnerKey) {
      if (this.partner) { this.partner.root.removeFromParent(); this.partner.dispose(); this.partner = null; }
      this.partnerKey = rk;
      if (partnerId && parent) { this.partner = buildCharacter(residentLook(partnerId), { detail: 0.7 }); this.partner.root.position.set(spawn.x - 1.0, 0, spawn.z - 1.2); this.partner.root.rotation.y = Math.PI; parent.add(this.partner.root); this.wander = { t: 2, x: spawn.x - 1, z: spawn.z - 1.2 }; }
    }
  }
  clear() {
    if (this.pet) { this.pet.root.removeFromParent(); this.pet.dispose(); } if (this.partner) { this.partner.root.removeFromParent(); this.partner.dispose(); }
    this.pet = null; this.partner = null; this.petKey = ''; this.partnerKey = ''; this.group = null;
  }
  /** Each frame at home: the pet trots to just behind you; the partner strolls between spots in the room. `grid` resolves walls. */
  update(dt, player, { happy = true, grid = null, bounds = null } = {}) {
    if (this.pet) {
      const tx = player.pos.x - Math.sin(player.yaw) * 0.9 + Math.cos(player.yaw) * 0.5, tz = player.pos.z - Math.cos(player.yaw) * 0.9 - Math.sin(player.yaw) * 0.5;
      const dx = tx - this.petPos.x, dz = tz - this.petPos.z, d = Math.hypot(dx, dz); let sp = 0;
      if (d > 0.35) { sp = Math.min(3.2, d * 2.2); const k = Math.min(1, (sp * dt) / d); this.petPos.x += dx * k; this.petPos.z += dz * k; this.petYaw = Math.atan2(dx, dz); }
      else { const fx = player.pos.x - this.petPos.x, fz = player.pos.z - this.petPos.z; this.petYaw += (Math.atan2(fx, fz) - this.petYaw) * Math.min(1, dt * 3); }
      if (grid) grid.resolve(this.petPos, 0.25); if (bounds) { this.petPos.x = Math.min(bounds.x1, Math.max(bounds.x0, this.petPos.x)); this.petPos.z = Math.min(bounds.z1, Math.max(bounds.z0, this.petPos.z)); }
      this.pet.root.position.copy(this.petPos); this.pet.root.rotation.y = this.petYaw; this.pet.update(dt, sp, happy);
    }
    if (this.partner) {
      const w = this.wander, p = this.partner.root.position; w.t -= dt;
      if (w.t <= 0) { const b = bounds ?? { x0: -3, x1: 3, z0: -3, z1: 3 }; w.x = b.x0 + 0.6 + Math.random() * (b.x1 - b.x0 - 1.2); w.z = b.z0 + 0.6 + Math.random() * (b.z1 - b.z0 - 1.2); w.t = 6 + Math.random() * 6; }
      const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz); let sp = 0;
      if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 1.1) { this.partner.root.rotation.y = Math.atan2(player.pos.x - p.x, player.pos.z - p.z); }   // stop and face you when you are close
      else if (d > 0.3) { sp = 1.1; const k = Math.min(1, (sp * dt) / d), nx = p.x + dx * k, nz = p.z + dz * k, q = new THREE.Vector3(nx, 0, nz); if (grid) grid.resolve(q, 0.3); if (Math.hypot(q.x - nx, q.z - nz) > 0.02) w.t = 0; p.x = q.x; p.z = q.z; this.partner.root.rotation.y = Math.atan2(dx, dz); }
      this.partner.motion({ speed: sp }); this.partner.update(dt);
    }
  }
  get petAt() { return this.pet ? { x: this.petPos.x, z: this.petPos.z } : null; }
  get partnerAt() { return this.partner ? { x: this.partner.root.position.x, z: this.partner.root.position.z } : null; }
}
