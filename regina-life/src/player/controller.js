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
    this.sitting = null; this.carrying = false; this.frozen = false; this.collider = null; this.bounds = null;
    this.setLook(look);
  }
  setLook(look) {
    const keep = this.char ? (({ pose, poseT, poseAge, hold, holdAge }) => ({ pose, poseT, poseAge, hold, holdAge }))(this.char.A) : {};   // a new outfit mid-activity keeps the pose
    if (this.char) { this.scene.remove(this.char.root); this.char.dispose(); }
    this.char = buildCharacter(look);
    this.scene.add(this.char.root);
    this.char.motion({ carrying: this.carrying, sitting: !!this.sitting && !this.sitting.perch, ...keep });
    this.syncRoot();
  }
  teleport(x, z, yaw = this.yaw) { this.pos.set(x, 0, z); this.yaw = yaw; this.vel.set(0, 0); this.sitting = null; this.char.motion({ sitting: false, driving: false }); this.syncRoot(); }
  syncRoot() { const y = this.sitting?.y ?? 0; this.char.root.position.set(this.pos.x, y, this.pos.z); this.char.root.rotation.y = this.yaw; }
  setCarry(v) { this.carrying = v; this.char.motion({ carrying: v }); }
  gesture(n, d) { this.char.gesture(n, d); }
  /** A timed activity pose (player/poses.js), e.g. pose('guitar', 8). endPose() stops it early. */
  pose(name, secs = 4) { this.char.motion({ pose: name, poseT: secs, poseAge: 0 }); }
  endPose() { this.char.motion({ pose: null, poseT: 0 }); }
  /** An ongoing hold (the phone, a leash, an umbrella, dancing to the radio): hold(null) lets go. */
  hold(name) { if ((this.char.A.hold ?? null) !== (name || null)) this.char.motion({ hold: name || null, holdAge: 0 }); }
  /** Turn to face a point (the piece you are using). */
  face(x, z) { const dx = x - this.pos.x, dz = z - this.pos.z; if (Math.hypot(dx, dz) > 0.05) { this.yaw = Math.atan2(dx, dz); this.syncRoot(); } }
  /** Stand ON something (the treadmill deck): like sitAt, but standing. `s` = { x, z, yaw, y, stand?: { x, z } }; moving or standUp() steps off. */
  perchAt(s) { this.sitting = { ...s, perch: true }; this.pos.x = s.x; this.pos.z = s.z; this.yaw = s.yaw; this.vel.set(0, 0); this.char.motion({ sitting: false, speed: 0 }); this.syncRoot(); }
  /** Sit on a seat: `s` = { x, z, yaw, y, stand?: { x, z } }. `stand` is where standUp() puts the player back (omitted: 0.9 m south of the seat, as before). */
  sitAt(s) { this.sitting = s; this.pos.x = s.x; this.pos.z = s.z; this.yaw = s.yaw; this.vel.set(0, 0); this.char.motion({ sitting: true, speed: 0 }); this.syncRoot(); }
  /** Stand up at the seat's stand spot, then resolve against the collision grid (`grid`, else the one main.js assigned) and the room bounds so the player never lands inside a wall or piece. */
  standUp(grid = this.grid) {
    if (!this.sitting) return;
    const at = standSpot(this.sitting, this.pos); this.sitting = null; this.char.motion({ sitting: false, pose: null });
    this.pos.x = at.x; this.pos.z = at.z;
    if (grid) grid.resolve(this.pos, PLAYER_R);
    if (this.bounds) { const b = this.bounds; this.pos.x = Math.min(b.x1, Math.max(b.x0, this.pos.x)); this.pos.z = Math.min(b.z1, Math.max(b.z0, this.pos.z)); }
    this.vel.set(0, 0); this.syncRoot();
  }

  update(dt, input, camYaw, grid, slowFactor = 1) {
    const mv = this.frozen ? { x: 0, y: 0, mag: 0 } : input.move;
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
