/**
 * The modelling kit of world/furnitureModels.js (exported for the home builders): parts queue up and bake into ONE mesh per surface kind, with the colour
 * either on the material (default) or on the vertices (vertexColors, used by every catalogue model and home fixture).
 */
import './helpers/canvas-stub.js';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { kit, furnitureModel, MODEL_KINDS } from '../src/world/furnitureModels.js';
import { FURNITURE } from '../src/data/furniture.js';

const meshes = (g) => { const out = []; g.traverse((o) => { if (o.isMesh) out.push(o); }); return out; };
const colourOf = (mesh, i) => new THREE.Color().fromBufferAttribute(mesh.geometry.attributes.color, i);

describe('kit() with the colour on the material (the default)', () => {
  it('makes one mesh per distinct colour and surface, as before', () => {
    const m = kit(); m.b(1, 1, 1, '#ff0000', 0, 0, 0); m.b(1, 1, 1, '#ff0000', 2, 0, 0); m.b(1, 1, 1, '#00ff00', 4, 0, 0); m.b(1, 1, 1, '#00ff00', 6, 0, 0, { mt: 0.8 });
    const g = m.bake(); expect(meshes(g)).toHaveLength(3);
    for (const me of meshes(g)) { expect(me.material.vertexColors).toBe(false); expect(me.geometry.attributes.color).toBeUndefined(); }
    expect(new Set(meshes(g).map((x) => x.material.color.getHexString()))).toEqual(new Set(['ff0000', '00ff00']));
  });
});

describe('kit(null, { vertexColors: true })', () => {
  it('merges parts that differ only in colour into one mesh with a white material, and keeps a mesh per surface kind', () => {
    const m = kit(null, { vertexColors: true });
    m.b(1, 1, 1, '#ff0000', 0, 0, 0); m.c(0.3, 0.3, 1, '#00ff00', 2, 0, 0); m.s(1, 1, 1, '#0000ff', 4, 0, 0);          // matt: one mesh
    m.b(1, 1, 1, '#c0c4c8', 6, 0, 0, { mt: 0.9, r: 0.2 });                                                               // metal
    m.b(1, 1, 1, '#9ccfe3', 8, 0, 0, { op: 0.4 });                                                                       // glass
    m.b(1, 1, 1, '#ffffff', 10, 0, 0, { e: '#ffcc66', ei: 0.7 });                                                        // glowing
    const ms = meshes(m.bake()); expect(ms).toHaveLength(4);
    for (const me of ms) { expect(me.material.vertexColors).toBe(true); expect(me.material.color.getHexString()).toBe('ffffff'); expect(me.geometry.attributes.color.count).toBe(me.geometry.attributes.position.count); }
    expect(ms.filter((x) => x.material.transparent)).toHaveLength(1); expect(ms.filter((x) => x.material.emissiveIntensity > 0 && x.material.emissive.getHex() !== 0)).toHaveLength(1);
  });
  it('writes each part\'s colour (working colour space, so the picture matches the material colour) on exactly its own vertices', () => {
    const m = kit(null, { vertexColors: true }); m.b(1, 1, 1, '#8a6a48', 0, 0, 0); m.b(1, 1, 1, '#3e5b7a', 3, 0, 0);
    const [me] = meshes(m.bake()), a = me.geometry.attributes.position, brown = new THREE.Color('#8a6a48'), blue = new THREE.Color('#3e5b7a'); let nb = 0, nu = 0;
    for (let i = 0; i < a.count; i++) {
      const want = a.getX(i) < 1.5 ? brown : blue, got = colourOf(me, i); expect(Math.abs(got.r - want.r) + Math.abs(got.g - want.g) + Math.abs(got.b - want.b)).toBeLessThan(1e-5); if (want === brown) nb++; else nu++;
    }
    expect(nb).toBe(36); expect(nu).toBe(36);   // a box is 12 triangles
  });
  it('hands the caller\'s material factory a white colour and vc = true, once per distinct surface', () => {
    const calls = []; const made = new Map();
    const m = kit((color, o) => { calls.push([color, !!o.vc, o.mt ?? 0]); const x = new THREE.MeshBasicMaterial({ color }); made.set(calls.length, x); return x; }, { vertexColors: true });
    m.b(1, 1, 1, '#aa0000', 0, 0, 0); m.b(1, 1, 1, '#00aa00', 2, 0, 0); m.b(1, 1, 1, '#0000aa', 4, 0, 0, { mt: 0.5 });
    const ms = meshes(m.bake()); expect(ms).toHaveLength(2); expect(calls).toEqual([['#ffffff', true, 0], ['#ffffff', true, 0.5]]); expect(new Set(ms.map((x) => x.material)).size).toBe(2);
  });
  it('bakes a model whose geometry has position, normal, uv and colour, all the same length, and disposes the parts it merged', () => {
    const m = kit(null, { vertexColors: true }); m.b(1, 1, 1, '#ff0000', 0, 0, 0); m.ico(1, 1, 1, '#00ff00', 2, 0, 0); m.cone(0.4, 1, '#0000ff', 4, 0, 0); m.rod([0, 0, 0], [0, 1, 0], 0.1, '#ffffff');
    const [me] = meshes(m.bake()), at = me.geometry.attributes, n = at.position.count; expect(n).toBeGreaterThan(100); for (const k of ['normal', 'uv', 'color']) expect(at[k].count, k).toBe(n);
  });
});

describe('every catalogue model with vertex colours', () => {
  const ids = Object.keys(FURNITURE);
  it('is a few meshes (one per surface kind), all on shared white vertex-colour materials, never more than 5', () => {
    let total = 0;
    for (const id of ids) { const ms = meshes(furnitureModel(id)); total += ms.length; expect(ms.length, id).toBeGreaterThan(0); expect(ms.length, id).toBeLessThanOrEqual(5); for (const me of ms) { expect(me.material.vertexColors, id).toBe(true); expect(me.material.map, id).toBeNull(); } }
    expect(total / ids.length, 'average meshes per piece').toBeLessThan(2.6);
  });
  it('still carries the catalogue colour in its geometry (the piece looks like the card in the shop)', () => {
    let have = 0;
    for (const id of ids) { const want = new THREE.Color(FURNITURE[id].color); let hit = false; for (const me of meshes(furnitureModel(id))) { const c = me.geometry.attributes.color; for (let i = 0; i < c.count && !hit; i++) hit = Math.abs(c.getX(i) - want.r) + Math.abs(c.getY(i) - want.g) + Math.abs(c.getZ(i) - want.b) < 0.02; } if (hit) have++; }
    expect(have / ids.length).toBeGreaterThan(0.85);   // nearly every model uses its own colour somewhere (a few use a shade of it)
  });
  it('has a builder kind for every catalogue kind', () => { for (const f of Object.values(FURNITURE)) expect(MODEL_KINDS, f.id).toContain(f.kind); });
});
