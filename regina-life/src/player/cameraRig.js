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
/**
 * The Home view's "living dollhouse" camera: the home seen in 3/4 from `pitch` radians above the horizon and `yaw` radians round from the south
 * (positive = from the south-east). At zoom 1 the distance is the smallest one at which every corner of the home's box (floor to wall top, `wallH`)
 * projects inside the free part of the screen (between the `top` and `inset` bars, with a small margin): the same promise buildFrame makes for the
 * straight-down view, kept for any aspect and any turn. `zoom` scales that distance; zooming in past 0.85 drifts the look point towards `focus` (the
 * player), so the wheel or a pinch takes you to your character. Pure; returns { x, y, z, lookX, lookY, lookZ, fit }.
 */
export const ORBIT = Object.freeze({ yaw: 0.32, pitch: 0.95, zoom: 1, minYaw: -0.85, maxYaw: 0.85, minPitch: 0.6, maxPitch: 1.3, minZoom: 0.38, maxZoom: 1.25 });
export function orbitFit(bbox, { aspect = 1, inset = 0, top = 0, fovDeg = 46, yaw = ORBIT.yaw, pitch = ORBIT.pitch, wallH = 2.6, margin = 0.94 } = {}) {
  const cx = (bbox.x0 + bbox.x1) / 2, cz = (bbox.z0 + bbox.z1) / 2, ly = 0.6, f = THREE.MathUtils.clamp(1 - inset - top, 0.15, 1);
  const tv = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)), th = tv * aspect, cp = Math.cos(pitch);
  const dir = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];                       // from the look point towards the camera
  const fw = [-dir[0], -dir[1], -dir[2]], rl = Math.hypot(fw[2], fw[0]), rt = [-fw[2] / rl, 0, fw[0] / rl];   // right = forward x up
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  // the walls on the camera's side are cut to 0.9 m (world/homeWalls.js cutSidesFor: the south one, plus east or west once the view turns), so a corner where
  // both walls are cut only needs its low top in view: framing the full 2.6 m there would leave a band of empty lawn
  const cutE = yaw > 0.12, cutW = yaw < -0.12;
  const pts = []; for (const x of [bbox.x0, bbox.x1]) for (const z of [bbox.z0, bbox.z1]) {
    const low = z === bbox.z1 && ((x === bbox.x1 && cutE) || (x === bbox.x0 && cutW)), h = low ? Math.min(wallH, 0.9) : wallH;
    for (const y of [0, h]) pts.push([x - cx, y - ly, z - cz]);
  }
  const fits = (d) => pts.every((p) => {
    const v = [p[0] - dir[0] * d, p[1] - dir[1] * d, p[2] - dir[2] * d], depth = v[0] * fw[0] + v[1] * fw[1] + v[2] * fw[2]; if (depth <= 0.1) return false;
    const sx = (v[0] * rt[0] + v[1] * rt[1] + v[2] * rt[2]) / (depth * th), sy = (v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / (depth * tv);
    return Math.abs(sx) <= margin && Math.abs(sy) <= f * margin;
  });
  let lo = 1, hi = 400; for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return hi;
}
export function orbitFrame(bbox, { aspect = 1, inset = 0, top = 0, fovDeg = 46, yaw = ORBIT.yaw, pitch = ORBIT.pitch, zoom = ORBIT.zoom, focus = null, fit = null } = {}) {
  const d0 = fit ?? orbitFit(bbox, { aspect, inset, top, fovDeg, yaw, pitch }), d = d0 * zoom;
  const cx = (bbox.x0 + bbox.x1) / 2, cz = (bbox.z0 + bbox.z1) / 2, k = focus ? THREE.MathUtils.clamp((0.85 - zoom) / 0.4, 0, 1) : 0;
  const lx = cx + (focus ? (focus.x - cx) * k : 0), lz = cz + (focus ? (focus.z - cz) * k : 0), ly = 0.6 + 0.5 * k;
  const cp = Math.cos(pitch);
  return { x: lx + Math.sin(yaw) * cp * d, y: ly + Math.sin(pitch) * d, z: lz + Math.cos(yaw) * cp * d, lookX: lx, lookY: ly, lookZ: lz, fit: d0 };
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
    this.orbit = false; this.resetOrbit(); this.spinHold = 0;   // orbit: the Home view's 3/4 camera (build mode proper stays top-down for precise placing)
    this._v = new THREE.Vector3();
  }
  resetOrbit() { this.orbitYaw = ORBIT.yaw; this.orbitPitch = ORBIT.pitch; this.orbitZoom = ORBIT.zoom; }
  /** The overhead camera's goal right now: the top-down build frame, or the orbiting 3/4 dollhouse view. */
  _goal(player) {
    if (!this.orbit) { const fr = this._frame(); return { x: fr.x, y: fr.y, z: fr.z, lookX: fr.lookX, lookY: 0, lookZ: fr.lookZ }; }
    const box = this.buildFocus ?? this.buildBBox, o = { aspect: this.camera.aspect, inset: this.buildInset || 0, top: this.buildTop || 0, yaw: this.orbitYaw, pitch: this.orbitPitch };
    const key = `${box.x0},${box.z0},${box.x1},${box.z1}|${o.aspect.toFixed(3)}|${o.inset.toFixed(3)}|${o.top.toFixed(3)}|${o.yaw.toFixed(3)}|${o.pitch.toFixed(3)}`;
    if (this._fitKey !== key) { this._fitKey = key; this._fit = orbitFit(box, o); }   // the fit only changes when the frame, the bars or the turn do
    return orbitFrame(box, { ...o, zoom: this.orbitZoom, focus: player?.pos ?? null, fit: this._fit });
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
  snapBuild(player) { if (this.mode !== 'build') return; const g = this._goal(player); this.pos.set(g.x, g.y, g.z); this.buildLook.set(g.lookX, g.lookY, g.lookZ); this.fov = 46; }
  update(dt, input, player, { speedNorm = 0, sensitivity = 1 } = {}) {
    if (this.mode === 'build') {           // overhead "dollhouse" view for the home editor
      const l = input.consumeLook(), zm = input.consumeZoom();
      if (this.orbit) {                     // Home view: drag to turn the dollhouse, wheel or pinch to zoom (the playtests found the camera ignored the mouse)
        const C = THREE.MathUtils.clamp;
        this.orbitYaw = C(this.orbitYaw - l.dx * 0.0042 * sensitivity, ORBIT.minYaw, ORBIT.maxYaw);
        this.orbitPitch = C(this.orbitPitch + l.dy * 0.003 * sensitivity, ORBIT.minPitch, ORBIT.maxPitch);
        if (zm) this.orbitZoom = C(this.orbitZoom * Math.exp(zm * 0.12), ORBIT.minZoom, ORBIT.maxZoom);
        this.yaw = this.orbitYaw;           // walking stays camera-relative: "up" walks away from the camera
      }
      // fit the whole home (or the focused room) into the part of the screen the build bar does not cover
      const g = this._goal(player), top = this.buildTop || 0, k = 1 - Math.exp(-dt * 6);
      this.pos.lerp(this._v.set(g.x, g.y, g.z), k); this.buildLook.lerp(this._v.set(g.lookX, g.lookY, g.lookZ), k);
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
    if (this.mode === 'creator') { this.targetDist = 2.35; this.pitch = 0.06; this.spinHold -= dt; if (!l.dx && this.spinHold <= 0) this.yaw += dt * 0.35; }   // a slow turntable that waits while you drag it round yourself
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
