import * as THREE from 'three';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Third-person camera: orbit with damped follow, over-the-shoulder offset, occlusion avoidance against
 * the collision grid, speed-based FOV kick, optional auto-recentre and selfie / creator framing modes.
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera; this.yaw = Math.PI; this.pitch = 0.28; this.dist = 5.2; this.targetDist = 5.2;
    this.minDist = 1.6; this.maxDist = 11; this.pos = new THREE.Vector3(0, 3, 10); this.look = new THREE.Vector3();
    this.mode = 'follow'; this.autoCenter = true; this.indoor = false; this.bounds = null; this.grid = null;
    this.shoulder = 0.42; this.fov = 62; this.idle = 0; this.orbitSpin = 0;
    this._v = new THREE.Vector3();
  }
  snapBehind(playerYaw) { this.yaw = playerYaw + Math.PI; }
  update(dt, input, player, { speedNorm = 0, sensitivity = 1 } = {}) {
    const l = input.consumeLook(), z = input.consumeZoom();
    this.yaw -= l.dx * 0.0046 * sensitivity; this.pitch += l.dy * 0.0036 * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.25, 1.25);
    if (z) this.targetDist = THREE.MathUtils.clamp(this.targetDist + z, this.minDist, this.indoor ? 5.5 : this.maxDist);
    if (this.mode === 'creator') { this.targetDist = 2.35; this.pitch = 0.06; if (!l.dx) this.yaw += dt * 0.35; }
    if (this.mode === 'selfie') { this.targetDist = 1.9; }
    // gentle auto-recentre while running forward and not touching the camera
    if (this.autoCenter && this.mode === 'follow' && speedNorm > 0.2 && input.idleLookMs > 1800 && !player.sitting) {
      const behind = player.yaw + Math.PI; this.yaw += wrap(behind - this.yaw) * Math.min(1, dt * 0.7 * speedNorm);
    }
    this.dist += (this.targetDist - this.dist) * (1 - Math.exp(-dt * 8));
    const sit = player.sitting ? -0.5 : 0;
    const head = this._v.set(player.pos.x, (player.sitting ? 1.15 : 1.5) + (this.mode === 'creator' ? -0.1 : 0), player.pos.z);
    // look target eases (smooth follow)
    this.look.lerp(head, 1 - Math.exp(-dt * 16));
    const yaw = this.mode === 'selfie' ? this.yaw + Math.PI * 0 : this.yaw;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dirX = Math.sin(yaw) * cp, dirY = sp, dirZ = Math.cos(yaw) * cp;
    const shoulder = this.mode === 'follow' ? this.shoulder * Math.min(1, this.dist / 4) : 0;
    const rx = Math.cos(yaw) * shoulder, rz = -Math.sin(yaw) * shoulder;
    const want = new THREE.Vector3(this.look.x + dirX * this.dist + rx, this.look.y + dirY * this.dist, this.look.z + dirZ * this.dist + rz);
    want.y = Math.max(want.y, 0.35);
    if (this.indoor && this.bounds) {
      const b = this.bounds; want.x = THREE.MathUtils.clamp(want.x, b.x0 - 0.15, b.x1 + 0.15); want.z = THREE.MathUtils.clamp(want.z, b.z0 - 0.15, b.z1 + 0.15); want.y = Math.min(want.y, 2.95);
    }
    // occlusion: pull the camera in front of whatever blocks the line from the player's head
    let t = 1;
    if (this.grid) {
      t = this.grid.rayBlocked(this.look.x, this.look.y, this.look.z, want.x, want.y, want.z);
      if (t < 1) t = Math.max(0.08, t - 0.035 / Math.max(0.5, this.dist));
    }
    const safe = new THREE.Vector3().lerpVectors(this.look, want, t);
    // snap in instantly when blocked, ease out when clear
    const k = t < 1 ? 1 : 1 - Math.exp(-dt * 9);
    this.pos.lerp(safe, this.pos.distanceTo(safe) > 40 ? 1 : k);
    if (t < 1) this.pos.copy(safe);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look.x, this.look.y + 0.05 + sit, this.look.z);
    const tf = this.mode === 'follow' ? 62 + speedNorm * 9 : this.mode === 'creator' ? 38 : 48;
    this.fov += (tf - this.fov) * (1 - Math.exp(-dt * 5));
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }
  snap(player) { this.look.set(player.pos.x, 1.5, player.pos.z); this.pos.set(player.pos.x + Math.sin(this.yaw) * this.dist, 3, player.pos.z + Math.cos(this.yaw) * this.dist); }
}
