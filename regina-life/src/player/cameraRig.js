import * as THREE from 'three';
import { STUDIO } from '../data/homes.js';
import { lotOf } from '../core/lot.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Where the overhead ("dollhouse") camera sits to show `bbox` (a floor rect {x0, z0, x1, z1}) in the part of the screen the UI does not cover.
 * Pure (no THREE objects, no DOM) so it is testable and one function serves update(), snapBuild() and the tests (docs/HOMES.md section 6).
 *   aspect  camera width / height          inset  fraction of the screen height covered at the bottom (build bar, Buy sheet)
 *   top     fraction covered at the top (HUD, Home view chips)                      fovDeg  vertical field of view (the build view uses 46)
 * Returns the camera position {x, y, z} and the ground point it looks at {lookX, lookZ}. The camera is tilted a hair (2 m + 6% of its height
 * towards the south) so walls read as a dollhouse; the half extents get 0.4 m (depth) and 0.5 m (width) of margin. For the Studio floor rect
 * (x -4.5..4.5, z -5.5..5.5) this reproduces the original hard-coded numbers exactly (5.9 and 5.0 metre half extents, centre 0, look z 0.2).
 */
export function buildFrame(bbox, { aspect = 1, inset = 0, top = 0, fovDeg = 46 } = {}) {
  const hw = (bbox.x1 - bbox.x0) / 2, hd = (bbox.z1 - bbox.z0) / 2, cx = (bbox.x0 + bbox.x1) / 2, cz = (bbox.z0 + bbox.z1) / 2;
  const th = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)), f = THREE.MathUtils.clamp(1 - inset - top, 0.4, 1);
  const y = Math.max((hd + 0.4) / (th * f), (hw + 0.5) / (th * aspect));
  return { x: cx, y, z: cz + 2 + 0.06 * y, lookX: cx, lookZ: cz + 0.2 };
}
/** The Studio's floor rect: the build frame until a layout says otherwise (so Studio behaviour and tests do not change). */
const STUDIO_BBOX = () => ({ ...lotOf(STUDIO).bbox });

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
    this.buildBBox = STUDIO_BBOX(); this.buildFocus = null; this.buildLook = new THREE.Vector3(0, 0, 0.2);
    this._v = new THREE.Vector3();
  }
  /** The floor rect the overhead view frames (the union of the home's room floor rects: lotOf(layout).bbox). Defaults to the Studio's. */
  setBuildFrame(bbox) { this.buildBBox = bbox ? { x0: bbox.x0, z0: bbox.z0, x1: bbox.x1, z1: bbox.z1 } : STUDIO_BBOX(); }
  /** Frame one room's floor rect instead of the whole house (null = the whole house again). The camera eases there like it does for any frame change. */
  setBuildFocus(rect) { this.buildFocus = rect ? { x0: rect.x0, z0: rect.z0, x1: rect.x1, z1: rect.z1 } : null; }
  /** The overhead frame right now: the focused room if any, else the whole house, fitted to the free part of the screen. */
  _frame() { return buildFrame(this.buildFocus ?? this.buildBBox, { aspect: this.camera.aspect, inset: this.buildInset || 0, top: this.buildTop || 0 }); }
  /** Leave the overhead view: restore the normal projection. */
  endBuild() { this._vo = null; this.buildTop = 0; this.camera.clearViewOffset(); }
  snapBehind(playerYaw) { this.yaw = playerYaw + Math.PI; }
  /** Camera height that fits the home (or the focused room) into the part of the screen the bars/sheet do not cover. */
  _buildHeight() { return this._frame().y; }
  /** Jump the overhead camera straight to where it is easing to (tests and screenshots use it so a slow frame rate cannot leave it mid-glide). */
  snapBuild() { if (this.mode !== 'build') return; const fr = this._frame(); this.pos.set(fr.x, fr.y, fr.z); this.buildLook.set(fr.lookX, 0, fr.lookZ); this.fov = 46; }
  update(dt, input, player, { speedNorm = 0, sensitivity = 1 } = {}) {
    if (this.mode === 'build') {           // overhead "dollhouse" view for the home editor
      input.consumeLook(); input.consumeZoom();
      // fit the whole home (or the focused room) into the part of the screen the build bar does not cover
      const fr = this._frame(), top = this.buildTop || 0, k = 1 - Math.exp(-dt * 6);
      this.pos.lerp(this._v.set(fr.x, fr.y, fr.z), k); this.buildLook.lerp(this._v.set(fr.lookX, 0, fr.lookZ), k);
      this.camera.position.copy(this.pos); this.camera.lookAt(this.buildLook);
      const W = innerWidth, H = innerHeight, y = Math.round((((this.buildInset || 0) - top) * H) / 2), key = `${W}x${H}:${y}`;
      if (this._vo !== key) { this._vo = key; this.camera.setViewOffset(W, H, 0, y, W, H); }
      this.fov += (46 - this.fov) * (1 - Math.exp(-dt * 5)); if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
      return;
    }
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
      // Indoors the camera passes through partition walls (tag 'wall'): the interior cuts the one between the head and the camera instead (setCameraCut), so a wall in
      // another room never drags the camera onto the player's nose. Furniture still blocks it. (The Studio has no wall rects, so nothing changes there.)
      t = this.grid.rayBlocked(this.look.x, this.look.y, this.look.z, want.x, want.y, want.z, this.indoor ? { skip: 'wall' } : undefined);
      if (t < 1) t = Math.max(0.08, t - 0.035 / Math.max(0.5, this.dist));
    }
    const safe = new THREE.Vector3().lerpVectors(this.look, want, t);
    // snap in instantly when blocked, ease out when clear
    const k = t < 1 ? 1 : 1 - Math.exp(-dt * 9);
    this.pos.lerp(safe, this.pos.distanceTo(safe) > 40 ? 1 : k);
    if (t < 1) this.pos.copy(safe);
    this._clampIndoor(this.pos);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look.x, this.look.y + 0.05 + sit, this.look.z);
    const tf = this.mode === 'follow' ? 62 + speedNorm * 9 : this.mode === 'creator' ? 38 : 48;
    this.fov += (tf - this.fov) * (1 - Math.exp(-dt * 5));
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }
  /** Never let the camera leave the room it's in (walls aren't colliders). */
  _clampIndoor(v) { if (!this.indoor || !this.bounds) return; const b = this.bounds; v.x = THREE.MathUtils.clamp(v.x, b.x0 - 0.15, b.x1 + 0.15); v.z = THREE.MathUtils.clamp(v.z, b.z0 - 0.15, b.z1 + 0.15); v.y = Math.min(v.y, 2.95); }
  snap(player) { this.look.set(player.pos.x, 1.5, player.pos.z); this.pos.set(player.pos.x + Math.sin(this.yaw) * this.dist, 3, player.pos.z + Math.cos(this.yaw) * this.dist); this._clampIndoor(this.pos); }
}
