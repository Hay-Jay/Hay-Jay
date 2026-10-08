import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const CHUNK = 320;
const key = (x, z) => `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;

/** Collects geometries grouped by chunk + material and merges them to a handful of draw calls per chunk. */
export class Batcher {
  constructor() { this.buckets = new Map(); }
  add(matId, geo, x, z) {
    const k = `${key(x, z)}|${matId}`;
    let b = this.buckets.get(k);
    if (!b) this.buckets.set(k, (b = { chunk: key(x, z), matId, cx: Math.floor(x / CHUNK), cz: Math.floor(z / CHUNK), geos: [] }));
    b.geos.push(geo);
  }
  /** @returns {{mesh:THREE.Mesh, chunk:string, cx:number, cz:number}[]} */
  build(materials, { cast = new Set(), receive = true } = {}) {
    const out = [];
    for (const b of this.buckets.values()) {
      const merged = mergeGeometries(b.geos.map((g) => (g.index ? g.toNonIndexed() : g)), false);
      b.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere(); merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, materials[b.matId]);
      mesh.castShadow = cast.has(b.matId); mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      out.push({ mesh, chunk: b.chunk, cx: b.cx, cz: b.cz });
    }
    return out;
  }
}

const tint = (geo, color) => {
  const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
};
export { tint };

export const TILE_W = 16, TILE_H = 14;
/** Axis-aligned box with facade UVs scaled so windows keep a constant real-world size. Y from y0 to y0+h. */
export function facadeBox(x0, z0, x1, z1, h, color = '#ffffff', y0 = 0, uvScale = 1) {
  const w = x1 - x0, d = z1 - z0;
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k, u = uv.getX(i), v = uv.getY(i);
    if (f < 2) uv.setXY(i, (u * d) / TILE_W * uvScale, (v * h) / TILE_H);
    else if (f < 4) uv.setXY(i, 0.02, 0.02);
    else uv.setXY(i, (u * w) / TILE_W * uvScale, (v * h) / TILE_H);
  }
  return tint(g, color);
}
export function plainBox(x0, z0, x1, z1, h, color = '#ffffff', y0 = 0) {
  const g = new THREE.BoxGeometry(x1 - x0, h, z1 - z0);
  g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 4, uv.getY(i) * (z1 - z0) / 4);
  return tint(g, color);
}
/** Gable roof prism over rect; ridge along x when alongX. */
export function gableRoof(x0, z0, x1, z1, y0, rise, color, alongX = true, over = 0.5) {
  x0 -= over; z0 -= over; x1 += over; z1 += over;
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, yt = y0 + rise;
  let p; // 6 verts: 4 eaves + 2 ridge
  if (alongX) p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, yt, mz], [x1, yt, mz]];
  else p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [mx, yt, z0], [mx, yt, z1]];
  const tris = alongX
    ? [[0, 1, 5], [0, 5, 4], [3, 4, 5], [3, 5, 2], [0, 4, 3], [1, 2, 5]]
    : [[0, 4, 5], [0, 5, 3], [1, 2, 5], [1, 5, 4], [0, 1, 4], [3, 5, 2]];
  const pos = []; for (const t of tris) for (const i of t) pos.push(...p[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0.5), 2));
  g.computeVertexNormals();
  return tint(g, color);
}
/** Flat quad strip along a segment: u across (0..1), v along (length / period). */
export function stripQuad(ax, az, bx, bz, width, y, period = 8) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len, hw = width / 2;
  const v = len / period;
  const pos = [ax + nx * hw, y, az + nz * hw, ax - nx * hw, y, az - nz * hw, bx - nx * hw, y, bz - nz * hw, bx + nx * hw, y, bz + nz * hw];
  const uvs = [0, 0, 1, 0, 1, v, 0, v];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  // winding so it faces +y
  return g;
}
