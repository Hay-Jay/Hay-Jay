/**
 * Guards for the multi-room refactor of the apartment interior: the Studio must keep exactly the interactables, colliders, bounds and light
 * set it had when it was hand-built (tests/fixtures/studio-baseline.json was dumped from that code), and rotXZ must agree with three.js.
 */
import './helpers/canvas-stub.js';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { buildInterior } from '../src/world/interiors.js';
import { dumpInterior } from './helpers/dump-interior.js';
import { rotXZ, STUDIO, FIXTURE_KINDS, HOMES, layoutOf } from '../src/data/homes.js';
import { FIXTURE_BUILDERS } from '../src/world/homeKinds.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/studio-baseline.json', import.meta.url), 'utf8'));

describe('rotXZ', () => {
  it('matches three.js rotation.y = rot * PI / 2 for every quarter turn', () => {
    for (const rot of [0, 1, 2, 3]) for (const [dx, dz] of [[1, 0], [0, 1], [2.5, -1.25], [-3, 0.5]]) {
      const v = new THREE.Vector3(dx, 0, dz).applyEuler(new THREE.Euler(0, (rot * Math.PI) / 2, 0)), r = rotXZ(dx, dz, rot);
      expect(r.x).toBeCloseTo(v.x, 9); expect(r.z).toBeCloseTo(v.z, 9);
    }
    expect(rotXZ(1, 1, 5)).toEqual(rotXZ(1, 1, 1)); expect(rotXZ(1, 1, -1)).toEqual(rotXZ(1, 1, 3));
  });
});

describe('the Studio as data', () => {
  it('has the old room, door and spawn, and keeps its ids stable across tiers', () => {
    expect(STUDIO.rooms.map((r) => r.id)).toEqual(['living']); expect(STUDIO.entry.spawn).toMatchObject({ x: 3.2, z: 4.4 }); expect(layoutOf({}).id).toBe('studio');
    expect(layoutOf({ home: { layout: '__proto__' } }).id).toBe('studio'); expect(HOMES.studio).toBe(STUDIO);
  });
  it('lists the measured physics colliders exactly as the hand-built apartment had them', () => {
    const want = baseline.colliders.map((c) => `${c.x0},${c.z0},${c.x1},${c.z1},${c.h}`).sort(), have = STUDIO.colliders.map((c) => `${c.x0},${c.z0},${c.x1},${c.z1},${c.h}`).sort();
    expect(have).toEqual(want);
  });
  it('every fixture kind it uses is defined', () => { for (const f of STUDIO.fixtures) expect(FIXTURE_KINDS[f.kind], f.kind).toBeTruthy(); });
});

describe('Studio interior parity (the refactor must not change a thing)', () => {
  const it0 = buildInterior('apartment'), now = dumpInterior(it0);
  it('has the same interactables (id, position, radius, label)', () => { expect(now.interactables).toEqual(baseline.interactables); });
  it('has the same colliders with heights', () => { expect(now.colliders).toEqual(baseline.colliders); });
  it('has the same bounds, spawn and exit', () => { expect(now.bounds).toEqual(baseline.bounds); expect(now.spawn).toEqual(baseline.spawn); expect(now.exit).toEqual(baseline.exit); });
  it('has the same lights', () => { expect(now.lights).toEqual(baseline.lights); });
  it('does not blow past the baseline mesh/material budget by more than 10 percent', () => { expect(now.counts.meshes).toBeLessThanOrEqual(Math.ceil(baseline.counts.meshes * 1.1)); expect(now.counts.materials).toBeLessThanOrEqual(Math.ceil(baseline.counts.materials * 1.1)); });
});

describe('builders registry', () => {
  it.skip('has a builder for every fixture kind and nothing else (enabled once B1/B2 land the registry)', () => { expect(Object.keys(FIXTURE_BUILDERS).sort()).toEqual(Object.keys(FIXTURE_KINDS).sort()); });
});
