/** The walk camera in a multi-room home: partition walls (tag 'wall') never drag it onto the player's nose, furniture still does (docs/HOMES.md section 5/6). */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../src/player/cameraRig.js';
import { CollisionGrid } from '../src/world/collision.js';

const input = { consumeLook: () => ({ dx: 0, dy: 0 }), consumeZoom: () => 0, idleLookMs: 0 };
/** A rig 3.2 m behind a player at the origin, looking along -z from +z (yaw 0 puts the camera at +z), with a grid. */
function setup(addRects, { indoor = true } = {}) {
  const grid = new CollisionGrid(8); addRects(grid);
  const rig = new CameraRig(new THREE.PerspectiveCamera(62, 1.6, 0.25, 100));
  rig.mode = 'follow'; rig.indoor = indoor; rig.bounds = { x0: -10, x1: 10, z0: -10, z1: 10 }; rig.grid = grid; rig.yaw = 0; rig.pitch = 0.46; rig.targetDist = 3.2; rig.dist = 3.2; rig.autoCenter = false;
  const player = { pos: new THREE.Vector3(0, 0, 0), sitting: null, yaw: Math.PI };
  rig.snap(player); for (let i = 0; i < 90; i++) rig.update(1 / 60, input, player);
  return { rig, player };
}
const dist = (rig, player) => Math.hypot(rig.camera.position.x - player.pos.x, rig.camera.position.z - player.pos.z);

describe('CameraRig: the walk camera and partition walls', () => {
  it('with nothing in the way the camera sits at its full distance behind the player', () => {
    const { rig, player } = setup(() => {});
    expect(dist(rig, player)).toBeGreaterThan(2.2);
  });
  it('a full-height partition wall behind the player does not pull the camera in (indoors)', () => {
    const wall = (g) => g.add(-4, 1.0, 4, 1.2, 3.3, 'wall');         // 1 m behind the player: the old rule dropped the camera to ~1 m
    const free = setup(() => {}), walled = setup(wall);
    expect(dist(walled.rig, walled.player)).toBeCloseTo(dist(free.rig, free.player), 1);
  });
  it('furniture (any other tag, or none) still blocks the camera', () => {
    for (const tag of [null, 'furn']) {
      const { rig, player } = setup((g) => g.add(-4, 1.0, 4, 1.2, 3.3, tag)), free = setup(() => {});
      expect(dist(rig, player), String(tag)).toBeLessThan(dist(free.rig, free.player) - 0.8);
    }
  });
  it('outdoors (indoor false) walls are ordinary obstacles: nothing skips them', () => {
    const { rig, player } = setup((g) => g.add(-4, 1.0, 4, 1.2, 3.3, 'wall'), { indoor: false }), free = setup(() => {}, { indoor: false });
    expect(dist(rig, player)).toBeLessThan(dist(free.rig, free.player) - 0.8);
  });
});
