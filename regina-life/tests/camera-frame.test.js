/** The overhead build camera: the pure buildFrame(), the rig's frame/focus state, and a real projection check that the whole home fits the free screen. */
import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three';
import { CameraRig, buildFrame, orbitFrame } from '../src/player/cameraRig.js';
import { lotOf } from '../src/core/lot.js';
import { HOMES, STUDIO } from '../src/data/homes.js';

/** The camera height formula exactly as it was hard-coded for the Studio before multi-room homes (copied, not imported, so it is a real reference). */
const oldHeight = (aspect, inset, top) => {
  const th = Math.tan(THREE.MathUtils.degToRad(23)), f = THREE.MathUtils.clamp(1 - (inset || 0) - (top || 0), 0.4, 1);
  return Math.max(5.9 / (th * f), 5.0 / (th * aspect));
};
const oldPos = (aspect, inset, top) => { const hgt = oldHeight(aspect, inset, top); return { x: 0, y: hgt, z: 2 + hgt * 0.06, lookX: 0, lookZ: 0.2 }; };
const SCREENS = [[1100, 680], [390, 780], [1920, 1080], [820, 1180], [320, 640]];
const BARS = [[0, 0], [0.18, 0.15], [0.22, 0.12], [0.6, 0.24], [0.9, 0.5]];
const STUDIO_BBOX = lotOf(STUDIO).bbox;

describe('buildFrame: the Studio reproduces the old numbers exactly', () => {
  it('the Studio bbox is the 9 x 11 m floor, centred on the origin', () => {
    expect(STUDIO_BBOX).toEqual({ x0: -4.5, z0: -5.5, x1: 4.5, z1: 5.5 });
  });
  it('matches the old formula for every screen shape and bar size (height, z offset, look point)', () => {
    for (const [W, H] of SCREENS) for (const [inset, top] of BARS) {
      const aspect = W / H, got = buildFrame(STUDIO_BBOX, { aspect, inset, top }), want = oldPos(aspect, inset, top);
      expect(got, `${W}x${H} inset ${inset} top ${top}`).toEqual(want);
    }
  });
  it('the half extents the formula uses are 5.9 (depth) and 5.0 (width) for the Studio', () => {
    const th = Math.tan(THREE.MathUtils.degToRad(23)), a = buildFrame(STUDIO_BBOX, { aspect: 100 }), b = buildFrame(STUDIO_BBOX, { aspect: 0.2 });
    expect(a.y).toBe(5.9 / th);             // very wide screen: the room's depth decides
    expect(b.y).toBe(5.0 / (th * 0.2));     // very narrow screen: its width decides
  });
  it('inset and top shrink the usable height but never below 40% of the screen', () => {
    const base = buildFrame(STUDIO_BBOX, { aspect: 10 }).y;
    expect(buildFrame(STUDIO_BBOX, { aspect: 10, inset: 0.3, top: 0.1 }).y).toBeCloseTo(base / 0.6, 9);
    expect(buildFrame(STUDIO_BBOX, { aspect: 10, inset: 0.9, top: 0.5 }).y).toBeCloseTo(base / 0.4, 9);
  });
  it('defaults: square screen, no bars, 46 degrees; a different fov moves the camera accordingly', () => {
    const d = buildFrame(STUDIO_BBOX);
    expect(d).toEqual(buildFrame(STUDIO_BBOX, { aspect: 1, inset: 0, top: 0, fovDeg: 46 }));
    const narrow = buildFrame(STUDIO_BBOX, { aspect: 100, fovDeg: 30 }); expect(narrow.y).toBeCloseTo(5.9 / Math.tan(THREE.MathUtils.degToRad(15)), 9);
  });
});

describe('buildFrame: the other homes', () => {
  const ONEBED = lotOf(HOMES.onebed).bbox, BUNG = lotOf(HOMES.bungalow).bbox, th = Math.tan(THREE.MathUtils.degToRad(23));
  it('the One-bedroom frame is centred on its 9 x 16.2 m footprint (landscape 1100x680)', () => {
    const asp = 1100 / 680, f = buildFrame(ONEBED, { aspect: asp, inset: 0.18, top: 0.15 });
    expect(f.x).toBe(0); expect(f.lookX).toBe(0); expect(f.lookZ).toBeCloseTo(-2.4, 9);                // centre z = (-10.7 + 5.5) / 2 = -2.6, plus 0.2
    expect(f.y).toBeCloseTo((8.1 + 0.4) / (th * 0.67), 9); expect(f.z).toBeCloseTo(-2.6 + 2 + 0.06 * f.y, 9);
    expect(f.y).toBeCloseTo(29.8877, 3);
  });
  it('the One-bedroom frame in portrait (390x780): the depth still decides, the camera is a touch higher', () => {
    const asp = 390 / 780, f = buildFrame(ONEBED, { aspect: asp, inset: 0.22, top: 0.12 });
    expect(f.y).toBeCloseTo(Math.max((8.1 + 0.4) / (th * 0.66), (4.5 + 0.5) / (th * asp)), 9); expect(f.y).toBeCloseTo(30.3405, 3);
  });
  it('the Bungalow frame (20 x 17 m footprint, centre -2.8, -2.6): landscape and portrait references', () => {
    const l = buildFrame(BUNG, { aspect: 1100 / 680, inset: 0.18, top: 0.15 }), p = buildFrame(BUNG, { aspect: 390 / 780, inset: 0.22, top: 0.12 });
    expect(l.x).toBeCloseTo(-2.8, 9); expect(l.lookX).toBeCloseTo(-2.8, 9); expect(l.lookZ).toBeCloseTo(-2.4, 9);
    expect(l.y).toBeCloseTo(29.8877, 3); expect(l.z).toBeCloseTo(1.1933, 3);
    expect(p.y).toBeCloseTo((7.3 + 0.5) / (th * (390 / 780)), 9); expect(p.y).toBeCloseTo(36.7513, 3);     // portrait: the 14.6 m width decides
    expect(p.y).toBeGreaterThan(l.y);
  });
  it('every home fits the free part of the screen: the four floor corners project inside the band the bars leave', () => {
    for (const id of ['studio', 'onebed', 'bungalow']) {
      const bbox = lotOf(HOMES[id]).bbox;
      for (const [W, H] of SCREENS.slice(0, 3)) for (const [inset, top] of [[0, 0], [0.18, 0.15], [0.22, 0.12]]) {
        const fr = buildFrame(bbox, { aspect: W / H, inset, top }), cam = new THREE.PerspectiveCamera(46, W / H, 0.1, 400);
        cam.position.set(fr.x, fr.y, fr.z); cam.lookAt(fr.lookX, 0, fr.lookZ); cam.setViewOffset(W, H, 0, Math.round(((inset - top) * H) / 2), W, H); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
        for (const [x, z] of [[bbox.x0, bbox.z0], [bbox.x1, bbox.z0], [bbox.x0, bbox.z1], [bbox.x1, bbox.z1]]) {
          const v = new THREE.Vector3(x, 0, z).project(cam), px = ((v.x + 1) / 2) * W, py = ((1 - v.y) / 2) * H, tag = `${id} ${W}x${H} inset ${inset} top ${top} corner ${x},${z}`;
          expect(px, tag).toBeGreaterThanOrEqual(0); expect(px, tag).toBeLessThanOrEqual(W);
          expect(py, tag).toBeGreaterThanOrEqual(top * H - 1); expect(py, tag).toBeLessThanOrEqual((1 - inset) * H + 1);
        }
      }
    }
  });
});

describe('CameraRig: build frame and focus', () => {
  const aspect = 1100 / 680, mk = () => { const rig = new CameraRig(new THREE.PerspectiveCamera(46, aspect, 0.1, 400)); rig.mode = 'build'; rig.buildInset = 0.18; rig.buildTop = 0.15; return rig; };
  const input = { consumeLook: () => ({ dx: 0, dy: 0 }), consumeZoom: () => 0 };
  afterEach(() => { delete globalThis.innerWidth; delete globalThis.innerHeight; });

  it('by default it frames the Studio exactly as before', () => {
    const rig = mk(); rig.snapBuild(); const w = oldPos(aspect, 0.18, 0.15);
    expect(rig.pos.x).toBe(0); expect(rig.pos.y).toBe(w.y); expect(rig.pos.z).toBe(w.z); expect(rig.buildLook.toArray()).toEqual([0, 0, 0.2]); expect(rig.fov).toBe(46);
  });
  it('snapBuild does nothing outside build mode', () => {
    const rig = mk(); rig.mode = 'follow'; const p = rig.pos.clone(); rig.snapBuild(); expect(rig.pos.equals(p)).toBe(true);
  });
  it('setBuildFrame(bbox) moves the frame; setBuildFrame(null) goes back to the Studio', () => {
    const rig = mk(), bb = lotOf(HOMES.bungalow).bbox; rig.setBuildFrame(bb); rig.snapBuild(); const f = buildFrame(bb, { aspect, inset: 0.18, top: 0.15 });
    expect(rig.pos.toArray()).toEqual([f.x, f.y, f.z]); expect(rig.buildLook.toArray()).toEqual([f.lookX, 0, f.lookZ]);
    rig.setBuildFrame(null); rig.snapBuild(); expect(rig.pos.y).toBe(oldHeight(aspect, 0.18, 0.15));
  });
  it('the rig keeps its own copy of the rect it was given', () => {
    const rig = mk(), bb = { x0: -1, z0: -1, x1: 1, z1: 1 }; rig.setBuildFrame(bb); bb.x1 = 99; rig.snapBuild(); expect(rig.pos.x).toBe(0);
  });
  it('setBuildFocus(rect) frames that room; setBuildFocus(null) shows the whole house again', () => {
    const rig = mk(), lot = lotOf(HOMES.bungalow), bed = lot.rooms.find((r) => r.id === 'bedroom').floor; rig.setBuildFrame(lot.bbox);
    rig.snapBuild(); const whole = rig.pos.clone();
    rig.setBuildFocus(bed); rig.snapBuild(); const f = buildFrame(bed, { aspect, inset: 0.18, top: 0.15 });
    expect(rig.pos.toArray()).toEqual([f.x, f.y, f.z]); expect(rig.pos.y).toBeLessThan(whole.y / 1.8); expect(rig.pos.x).toBeCloseTo(0, 9);   // the 9 x 5 m bedroom, much closer
    rig.setBuildFocus(null); rig.snapBuild(); expect(rig.pos.toArray()).toEqual(whole.toArray());
  });
  it('a focused room fills the free screen: the 390x780 bungalow rooms render at 30 px/m or better', () => {
    const lot = lotOf(HOMES.bungalow), W = 390, H = 780, asp = W / H, inset = 0.22, top = 0.12, th = Math.tan(THREE.MathUtils.degToRad(23));
    for (const r of lot.rooms) {
      const fr = buildFrame(r.floor, { aspect: asp, inset, top }), pxPerM = H / 2 / (th * fr.y);
      expect(pxPerM, r.id).toBeGreaterThanOrEqual(30);
    }
    const whole = buildFrame(lot.bbox, { aspect: asp, inset, top }); expect(H / 2 / (th * whole.y), 'the whole house').toBeLessThan(30);   // which is why the focus strip exists
  });
  it('update() eases the camera and its look point to the new frame, and stays put once there', () => {
    globalThis.innerWidth = 1100; globalThis.innerHeight = 680;
    const rig = mk(), player = { pos: new THREE.Vector3(), sitting: null }; rig.snapBuild();
    const bb = lotOf(HOMES.onebed).bbox; rig.setBuildFrame(bb); const target = buildFrame(bb, { aspect, inset: 0.18, top: 0.15 });
    rig.update(1 / 60, input, player); expect(rig.pos.y).toBeGreaterThan(oldHeight(aspect, 0.18, 0.15)); expect(rig.pos.y).toBeLessThan(target.y); expect(rig.buildLook.z).toBeLessThan(0.2); expect(rig.buildLook.z).toBeGreaterThan(target.lookZ);
    for (let i = 0; i < 400; i++) rig.update(1 / 60, input, player);
    expect(rig.pos.y).toBeCloseTo(target.y, 3); expect(rig.pos.z).toBeCloseTo(target.z, 3); expect(rig.buildLook.z).toBeCloseTo(target.lookZ, 3);
    const p = rig.pos.clone(); rig.update(1 / 60, input, player); expect(rig.pos.distanceTo(p)).toBeLessThan(1e-3);
  });
  it('the camera really looks at the frame centre: the Studio centre projects to the middle of the free band', () => {
    globalThis.innerWidth = 1100; globalThis.innerHeight = 680;
    const rig = mk(), player = { pos: new THREE.Vector3(), sitting: null }; rig.snapBuild(); for (let i = 0; i < 60; i++) rig.update(1 / 60, input, player);
    rig.camera.updateMatrixWorld(true); const v = new THREE.Vector3(0, 0, 0.2).project(rig.camera), py = ((1 - v.y) / 2) * 680;
    expect(py).toBeCloseTo((0.15 * 680 + (1 - 0.18) * 680) / 2, 0); expect(v.x).toBeCloseTo(0, 6);
  });
});

describe('orbitFrame: the Home view\'s 3/4 dollhouse camera', () => {
  it('every home, every screen, every turn: all eight corners of the home (floor and wall tops) project inside the free band', () => {
    for (const id of ['studio', 'onebed', 'bungalow']) {
      const bbox = lotOf(HOMES[id]).bbox;
      for (const [W, H] of SCREENS) for (const [inset, top] of [[0.055, 0.15], [0.22, 0.12], [0.6, 0.1]]) for (const yaw of [-0.85, -0.3, 0, 0.32, 0.85]) for (const pitch of [0.6, 0.95, 1.3]) {
        const o = orbitFrame(bbox, { aspect: W / H, inset, top, yaw, pitch }), cam = new THREE.PerspectiveCamera(46, W / H, 0.1, 600);
        cam.position.set(o.x, o.y, o.z); cam.lookAt(o.lookX, o.lookY, o.lookZ); cam.setViewOffset(W, H, 0, Math.round(((inset - top) * H) / 2), W, H); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
        for (const x of [bbox.x0, bbox.x1]) for (const z of [bbox.z0, bbox.z1]) for (const y of [0, 2.6]) {
          const v = new THREE.Vector3(x, y, z).project(cam), px = ((v.x + 1) / 2) * W, py = ((1 - v.y) / 2) * H, tag = `${id} ${W}x${H} bars ${inset}/${top} yaw ${yaw} pitch ${pitch} corner ${x},${y},${z}`;
          expect(px, tag).toBeGreaterThanOrEqual(-1); expect(px, tag).toBeLessThanOrEqual(W + 1);
          expect(py, tag).toBeGreaterThanOrEqual(top * H - 2); expect(py, tag).toBeLessThanOrEqual((1 - inset) * H + 2);
        }
      }
    }
  });
  it('the fit is tight (not miles away): some corner is near an edge', () => {
    const bbox = lotOf(STUDIO).bbox, W = 390, H = 780, o = orbitFrame(bbox, { aspect: W / H, inset: 0.12, top: 0.15 }), far = orbitFrame(bbox, { aspect: W / H, inset: 0.12, top: 0.15, fit: o.fit * 1.2 });
    expect(Math.hypot(far.x - far.lookX, far.y - far.lookY, far.z - far.lookZ)).toBeGreaterThan(Math.hypot(o.x - o.lookX, o.y - o.lookY, o.z - o.lookZ));
    expect(o.fit).toBeLessThan(60); expect(o.fit).toBeGreaterThan(8);
  });
  it('zooming in drifts the look point to the player; zoom 1 looks at the middle of the home', () => {
    const bbox = lotOf(HOMES.bungalow).bbox, cx = (bbox.x0 + bbox.x1) / 2, p = { x: 3, z: 2 };
    expect(orbitFrame(bbox, { aspect: 1.6, focus: p }).lookX).toBeCloseTo(cx, 9);
    const near = orbitFrame(bbox, { aspect: 1.6, focus: p, zoom: 0.4 }); expect(near.lookX).toBeCloseTo(3, 6); expect(near.lookZ).toBeCloseTo(2, 6);
  });
  it('the rig uses it only in orbit mode; build mode stays straight down', () => {
    const rig = new CameraRig(new THREE.PerspectiveCamera(46, 1.6, 0.1, 400)); rig.mode = 'build'; globalThis.innerWidth = 1100; globalThis.innerHeight = 680;
    rig.snapBuild(); expect(rig.buildLook.y).toBe(0); const down = rig.pos.clone();
    rig.orbit = true; rig.snapBuild({ pos: new THREE.Vector3() }); expect(rig.buildLook.y).toBeCloseTo(0.6, 6); expect(rig.pos.distanceTo(down)).toBeGreaterThan(1);
    delete globalThis.innerWidth; delete globalThis.innerHeight;
  });
});
