import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { PLAYER_R } from '../core/lot.js';

const WALK = 3.1, RUN = 7.2, ACCEL = 14;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
/**
 * Where a seated player stands up: the seat's `stand` spot ({x, z}, the standing spot of the use that sat them; the Studio sofa's is the spot in front of it)
 * when it is given and finite, else the old "0.9 m south of the seat" fallback. Pure: returns a new {x, z}.
 */
export function standSpot(sitting, pos) {
  const st = sitting?.stand;
  return st && finite(st.x) && finite(st.z) ? { x: st.x, z: st.z } : { x: pos.x, z: pos.z + 0.9 };
}

/** Player locomotion: camera-relative movement, smooth turning, collision sliding, sit state. */
export class PlayerController {
  constructor(scene, look) {
    this.scene = scene; this.pos = new THREE.Vector3(); this.vel = new THREE.Vector2(); this.yaw = 0; this.speed = 0;
    this.sitting = null; this.carrying = false; this.frozen = false; this.collider = null; this.bounds = null; this.car = null;
    this.setLook(look);
  }
  setLook(look) {
    if (this.char) { this.scene.remove(this.char.root); this.char.dispose(); }
    this.char = buildCharacter(look);
    this.scene.add(this.char.root);
    this.char.motion({ carrying: this.carrying, sitting: !!this.sitting, driving: !!this.car });
    this.syncRoot();
  }
  teleport(x, z, yaw = this.yaw) { this.pos.set(x, 0, z); this.yaw = yaw; this.vel.set(0, 0); this.sitting = null; this.char.motion({ sitting: false, driving: !!this.car }); if (this.car) this.car.speed = 0; this.syncRoot(); }
  syncRoot() {
    if (this.car) {   // behind the wheel: the car sits on the player position, the character in the driver's seat
      const c = this.car.model, sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
      c.root.position.set(this.pos.x, 0, this.pos.z); c.root.rotation.y = this.yaw;
      this.char.root.position.set(this.pos.x + c.seat.x * cs + c.seat.z * sn, c.seat.y, this.pos.z - c.seat.x * sn + c.seat.z * cs); this.char.root.rotation.y = this.yaw; return;
    }
    const y = this.sitting?.y ?? 0; this.char.root.position.set(this.pos.x, y, this.pos.z); this.char.root.rotation.y = this.yaw;
  }
  /** Get in your car (`model` from world/carModel.js, already in the scene). `top` = top speed in m/s. */
  enterCar(model, top = 14) { this.standUp(); this.car = { model, top, speed: 0, steer: 0 }; this.vel.set(0, 0); this.char.motion({ driving: true, speed: 0, carrying: false }); this.syncRoot(); }
  /** Park and step out on the driver's side. Returns the car model (the caller removes it or leaves it parked). */
  exitCar(grid = this.grid) {
    if (!this.car) return null; const m = this.car.model; this.car = null;
    const sn = Math.sin(this.yaw), cs = Math.cos(this.yaw); this.pos.x += -1.6 * cs; this.pos.z -= -1.6 * sn;
    if (grid) grid.resolve(this.pos, PLAYER_R);
    this.char.motion({ driving: false, speed: 0 }); this.syncRoot(); return m;
  }
  get driving() { return !!this.car; }
  _drive(dt, mv, camYaw, grid, run) {
    const c = this.car, fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    const dx = fx * mv.y + rx * mv.x, dz = fz * mv.y + rz * mv.x, mag = Math.min(1, mv.mag);
    let target = 0, steer = 0;
    if (mag > 0.1) {
      const a = wrap(Math.atan2(dx, dz) - this.yaw);
      if (Math.abs(a) < 2.3 || c.speed > 2) { target = c.top * (run ? 1.35 : 1) * mag * Math.max(0.35, Math.cos(Math.min(Math.abs(a), 1.2))); steer = Math.max(-1, Math.min(1, a * 1.6)); }
      else target = -4 * mag;   // pull back: reverse
    }
    const acc = target === 0 ? 7 : Math.sign(target - c.speed) === Math.sign(c.speed) || c.speed === 0 ? 4.5 : 9;
    c.speed += Math.max(-acc * dt, Math.min(acc * dt, target - c.speed)); if (Math.abs(c.speed) < 0.05 && target === 0) c.speed = 0;
    c.steer += (steer - c.steer) * Math.min(1, dt * 8);
    this.yaw = wrap(this.yaw + c.steer * dt * 2.1 * Math.min(1, Math.abs(c.speed) / 4) * Math.sign(c.speed || 1));
    this.pos.x += Math.sin(this.yaw) * c.speed * dt; this.pos.z += Math.cos(this.yaw) * c.speed * dt;
    const mx = this.pos.x, mz = this.pos.z;
    if (grid && grid.resolve(this.pos, 0.95)) {   // a wall or parked car pushes back: lose only the speed that went into it, so you can slide along and pull away
      const along = (this.pos.x - mx) * Math.sin(this.yaw) + (this.pos.z - mz) * Math.cos(this.yaw);
      if (along * Math.sign(c.speed) < -1e-4) c.speed = Math.sign(c.speed) * Math.max(0, Math.abs(c.speed) - Math.abs(along) / Math.max(dt, 1e-3));
    }
    this.speed = Math.abs(c.speed); c.model.update?.(dt, c.speed, c.steer);
    this.char.update(dt); this.syncRoot();
  }
  setCarry(v) { this.carrying = v; this.char.motion({ carrying: v }); }
  gesture(n, d) { this.char.gesture(n, d); }
  /** Sit on a seat: `s` = { x, z, yaw, y, stand?: { x, z } }. `stand` is where standUp() puts the player back (omitted: 0.9 m south of the seat, as before). */
  sitAt(s) { this.sitting = s; this.pos.x = s.x; this.pos.z = s.z; this.yaw = s.yaw; this.vel.set(0, 0); this.char.motion({ sitting: true, speed: 0 }); this.syncRoot(); }
  /** Stand up at the seat's stand spot, then resolve against the collision grid (`grid`, else the one main.js assigned) and the room bounds so the player never lands inside a wall or piece. */
  standUp(grid = this.grid) {
    if (!this.sitting) return;
    const at = standSpot(this.sitting, this.pos); this.sitting = null; this.char.motion({ sitting: false });
    this.pos.x = at.x; this.pos.z = at.z;
    if (grid) grid.resolve(this.pos, PLAYER_R);
    if (this.bounds) { const b = this.bounds; this.pos.x = Math.min(b.x1, Math.max(b.x0, this.pos.x)); this.pos.z = Math.min(b.z1, Math.max(b.z0, this.pos.z)); }
    this.vel.set(0, 0); this.syncRoot();
  }

  update(dt, input, camYaw, grid, slowFactor = 1) {
    const mv = this.frozen ? { x: 0, y: 0, mag: 0 } : input.move;
    if (this.car) { this._drive(dt, mv, camYaw, grid, input.running); return; }
    if (this.sitting) {
      if (mv.mag > 0.3) this.standUp(grid);
      this.char.update(dt); this.syncRoot(); return;
    }
    // camera-relative direction (camera looks along -forward from yaw)
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let dx = fx * mv.y + rx * mv.x, dz = fz * mv.y + rz * mv.x;
    const run = input.running && mv.mag > 0.1 && !this.carrying;
    const target = (run ? RUN : WALK) * mv.mag * slowFactor * (this.carrying ? 0.75 : 1);
    const l = Math.hypot(dx, dz); if (l > 0) { dx /= l; dz /= l; }
    const k = 1 - Math.exp(-ACCEL * dt);
    this.vel.x += (dx * target - this.vel.x) * k; this.vel.y += (dz * target - this.vel.y) * k;
    const sp = Math.hypot(this.vel.x, this.vel.y);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.y * dt;
    if (grid) grid.resolve(this.pos, PLAYER_R);
    if (this.bounds) { const b = this.bounds; this.pos.x = Math.min(b.x1, Math.max(b.x0, this.pos.x)); this.pos.z = Math.min(b.z1, Math.max(b.z0, this.pos.z)); }
    if (sp > 0.25) { const want = Math.atan2(this.vel.x, this.vel.y); this.yaw = wrap(this.yaw + wrap(want - this.yaw) * (1 - Math.exp(-12 * dt))); }
    this.speed = sp;
    this.char.motion({ speed: sp < 0.15 ? 0 : sp });
    this.char.update(dt);
    this.syncRoot();
  }
}
