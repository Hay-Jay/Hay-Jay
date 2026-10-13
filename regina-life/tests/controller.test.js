/** Player controller: sitting down and standing up (the stand spot of the seat, resolved against the grid) and the one shared PLAYER_R. */
import './helpers/canvas-stub.js';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PlayerController, standSpot } from '../src/player/controller.js';
import { CollisionGrid } from '../src/world/collision.js';
import { PLAYER_R } from '../src/core/lot.js';

const look = () => ({ skin: '#c58c6b', hair: '#2b1d14', hairStyle: 0, top: 'tee', topColor: '#3a6ea5', bottom: 'jeans', bottomColor: '#25364f', shoes: '#222', build: 0 });
const mk = () => { const p = new PlayerController(new THREE.Scene(), look()); p.teleport(0, 0, 0); return p; };
const still = { move: { x: 0, y: 0, mag: 0 }, running: false };
const push = { move: { x: 0, y: 1, mag: 1 }, running: false };

describe('standSpot (pure)', () => {
  it('uses the seat\'s stand spot when it is a finite {x, z}', () => {
    expect(standSpot({ x: 1, z: 2, stand: { x: 1.5, z: 3.25 } }, { x: 1, z: 2 })).toEqual({ x: 1.5, z: 3.25 });
  });
  it('falls back to 0.9 m south of the seat only when there is no usable stand spot', () => {
    for (const s of [{}, { stand: null }, { stand: {} }, { stand: { x: 1 } }, { stand: { x: NaN, z: 2 } }, { stand: { x: 'a', z: 2 } }, { stand: { x: Infinity, z: 0 } }, null, undefined]) {
      expect(standSpot(s, { x: 2, z: 1 }), JSON.stringify(s)).toEqual({ x: 2, z: 1.9 });
    }
  });
  it('does not mutate its inputs', () => {
    const s = { stand: { x: 1, z: 2 } }, p = { x: 5, z: 6 }; standSpot(s, p); expect(s).toEqual({ stand: { x: 1, z: 2 } }); expect(p).toEqual({ x: 5, z: 6 });
  });
});

describe('PlayerController sit and stand', () => {
  it('sitAt snaps to the seat, faces it, stops moving; standUp returns to the stand spot', () => {
    const p = mk(); p.vel.set(3, 3);
    p.sitAt({ x: 2, z: -1, yaw: 1.25, y: 0.18, stand: { x: 2, z: 0.2 } });
    expect(p.sitting).toBeTruthy(); expect([p.pos.x, p.pos.z, p.yaw]).toEqual([2, -1, 1.25]); expect([p.vel.x, p.vel.y]).toEqual([0, 0]); expect(p.char.root.position.y).toBe(0.18);
    p.standUp(); expect(p.sitting).toBeNull(); expect([p.pos.x, p.pos.z]).toEqual([2, 0.2]); expect(p.char.root.position.y).toBe(0); expect(p.char.root.position.z).toBe(0.2);
  });
  it('without a stand spot the player steps 0.9 m south, exactly as before', () => {
    const p = mk(); p.sitAt({ x: -1, z: 3, yaw: 0, y: 0.1 }); p.standUp(); expect([p.pos.x, p.pos.z]).toEqual([-1, 3.9]);
  });
  it('standUp when not sitting does nothing', () => {
    const p = mk(); p.teleport(1, 1); p.standUp(); expect([p.pos.x, p.pos.z]).toEqual([1, 1]);
  });
  it('standing up resolves against the grid: a stand spot inside a piece is pushed out by PLAYER_R', () => {
    const grid = new CollisionGrid(), p = mk(); grid.add(1, 0, 2, 1, 1, 'item');            // a 1 x 1 m solid; the stand spot is inside it, near its west face
    p.sitAt({ x: 0, z: 0.5, yaw: 0, y: 0, stand: { x: 1.2, z: 0.5 } }); p.standUp(grid);
    expect(p.pos.x).toBeCloseTo(1 - PLAYER_R, 6); expect(p.pos.z).toBeCloseTo(0.5, 6);
  });
  it('it uses the grid main.js assigned (player.grid) when none is passed, and the room bounds clamp the result', () => {
    const grid = new CollisionGrid(), p = mk(); grid.add(1, 0, 2, 1, 1, 'item'); p.grid = grid; p.bounds = { x0: -4, z0: -5, x1: 4, z1: 5 };
    p.sitAt({ x: 0, z: 0.5, yaw: 0, y: 0, stand: { x: 1.2, z: 0.5 } }); p.standUp(); expect(p.pos.x).toBeCloseTo(1 - PLAYER_R, 6);
    p.sitAt({ x: 3, z: 4.9, yaw: 0, y: 0, stand: { x: 3, z: 5.4 } }); p.standUp(); expect(p.pos.z).toBe(5);   // never outside the room
  });
  it('update() while seated: pushing the stick stands you up at the stand spot with the grid applied; idle keeps you seated', () => {
    const grid = new CollisionGrid(), p = mk(); p.sitAt({ x: 0, z: 0, yaw: 0, y: 0.2, stand: { x: 0, z: 1.5 } });
    p.update(0.016, still, 0, grid); expect(p.sitting).toBeTruthy(); expect([p.pos.x, p.pos.z]).toEqual([0, 0]);
    p.update(0.016, push, 0, grid); expect(p.sitting).toBeNull(); expect(p.pos.x).toBeCloseTo(0, 6); expect(p.pos.z).toBeCloseTo(1.5, 6);
  });
  it('walking resolves collisions with the shared PLAYER_R (0.38 m)', () => {
    expect(PLAYER_R).toBe(0.38);
    const grid = new CollisionGrid(), p = mk(); grid.add(-5, -3, 5, -2, 2, 'wall'); p.teleport(0, -1.5);
    for (let i = 0; i < 120; i++) p.update(1 / 30, { move: { x: 0, y: 1, mag: 1 }, running: false }, 0, grid);   // camYaw 0 + stick up = towards -z
    expect(p.pos.z).toBeCloseTo(-2 + PLAYER_R, 3);
  });
});
