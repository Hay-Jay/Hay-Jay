import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/rng.js';
import { Batcher, CHUNK, facadeBox, plainBox, gableRoof, stripQuad, tint } from './batch.js';
import { facadeTextures, asphaltTexture, intersectionTexture, concreteTexture, grassTexture, glowTexture, signTexture } from './textures.js';
import { CollisionGrid } from './collision.js';
import { PITCH, ROAD_W, GRID, DISTRICTS, POIS, ALBERT_X, lakePolygon, PARK_RECT, poiById, OUTER_ROADS, ISLAND } from './cityData.js';
import { buildLandmarks } from './landmarks.js';
import { BILLBOARDS, DAY_PRICE, THEMES, rotationFor } from '../data/billboards.js';
import { drawBillboard } from './textures.js';

const R2 = ROAD_W / 2;
const PALETTES = {
  siding: ['#ece6d8', '#cfdbe4', '#ddcbb2', '#bccdb4', '#dbbcab', '#cbc7dc', '#e8d6a8'],
  brick: ['#ffffff', '#f3dccb', '#dcb9a3', '#e9c8b4'],
  glass: ['#ffffff', '#cfe4ff', '#d9ffe9', '#ffe9cf', '#c8d6e8'],
  concrete: ['#ffffff', '#ececec', '#dfe3e6'],
  stucco: ['#ffffff', '#f5ead6', '#eadfc8'],
};
const ROOFS = ['#3d3a38', '#4a4340', '#2f3438', '#5a4a40', '#44484d'];

function inPoly(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

export function buildCity({ quality = 'high' } = {}) {
  const rnd = mulberry32(20241);
  const group = new THREE.Group(); group.name = 'city';
  const colliders = new CollisionGrid(48);
  const interactables = [];
  const batch = new Batcher();
  const lake = lakePolygon();
  const trees = [];            // {x,z,s}
  let api_seaMat = null;
  const lamps = [];            // {x,z}
  const cars = [];             // {x,z,rot,color}
  const crossings = [];        // {x,z,rot}
  const signals = [];          // {x,z,sx,sz}

  /* ---------------- materials ---------------- */
  const mats = {};
  const facade = (id, opts = {}) => {
    const t = facadeTextures(id, id.length * 3);
    mats[id] = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissive, emissive: new THREE.Color('#fff2d0'), emissiveIntensity: 0, vertexColors: true, roughness: 0.85, metalness: 0.04, ...opts });
  };
  facade('brick'); facade('concrete'); facade('stucco'); facade('siding', { roughness: 0.9 });
  facade('glass', { roughness: 0.28, metalness: 0.35 }); facade('store', { roughness: 0.4, metalness: 0.2 });
  mats.roof = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  mats.trim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const road = asphaltTexture(); road.anisotropy = 8;
  mats.road = new THREE.MeshStandardMaterial({ map: road, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mats.inter = new THREE.MeshStandardMaterial({ map: intersectionTexture(), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const paveTex = concreteTexture('#a9a7a0'); mats.pave = new THREE.MeshStandardMaterial({ map: paveTex, vertexColors: true, roughness: 0.95 });
  const lawnTex = grassTexture('#78a052'); lawnTex.repeat.set(1, 1);
  mats.lawn = new THREE.MeshStandardMaterial({ map: lawnTex, vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const groundTex = grassTexture('#7a9a55'); groundTex.repeat.set(2600, 2600);
  // Subdivided + depth-biased: one huge quad loses depth precision at grazing angles and eats the roads laid 6 cm above it.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(26000, 26000, 104, 104).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
  ground.receiveShadow = true; ground.name = 'ground'; group.add(ground);

  const castSet = new Set(['brick', 'concrete', 'stucco', 'siding', 'glass', 'store', 'roof', 'trim']);

  /* ---------------- helpers ---------------- */
  const add = (id, geo, x, z) => batch.add(id, geo, x, z);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  function building({ x0, z0, x1, z1, floors, style, color, roofColor, flat = true, ridgeX, parapet = true, collide = true, storefront = false }) {
    const h = floors * 3.5, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    add(style, facadeBox(x0, z0, x1, z1, h, color), cx, cz);
    if (storefront) add('store', facadeBox(x0 - 0.25, z0 - 0.25, x1 + 0.25, z1 + 0.25, 4.2, '#ffffff'), cx, cz);
    if (flat) {
      add('roof', plainBox(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, 0.5, roofColor, h), cx, cz);
      if (parapet) { // parapet lip
        add('trim', plainBox(x0 - 0.3, z0 - 0.3, x1 + 0.3, z0 + 0.1, 0.9, '#b8b6b0', h + 0.5), cx, cz);
        add('trim', plainBox(x0 - 0.3, z1 - 0.1, x1 + 0.3, z1 + 0.3, 0.9, '#b8b6b0', h + 0.5), cx, cz);
      }
      if (floors > 3 && rnd() < 0.8) { // rooftop plant
        const w = Math.min(10, (x1 - x0) * 0.35), d = Math.min(8, (z1 - z0) * 0.3);
        add('trim', plainBox(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 2.6, '#9a9b9c', h + 0.5), cx, cz);
      }
    } else {
      const rise = Math.min((x1 - x0), (z1 - z0)) * 0.32;
      add('roof', gableRoof(x0, z0, x1, z1, h, rise, roofColor, ridgeX), cx, cz);
    }
    if (collide) colliders.add(x0, z0, x1, z1, h + 2);
    return { h, cx, cz };
  }

  function doorOn(b, side, label, enter, id, { sign, accent = '#ffb347', width = 3.4 } = {}) {
    // side: 'n' (door on z0 face, faces -z) | 's' (z1 face, faces +z) | 'e' | 'w'
    const dw = width, dh = 3.0;
    const nx = side === 'e' ? 1 : side === 'w' ? -1 : 0, nz = side === 's' ? 1 : side === 'n' ? -1 : 0;
    const fx = side === 'e' ? b.x1 : side === 'w' ? b.x0 : b.cx, fz = side === 's' ? b.z1 : side === 'n' ? b.z0 : b.cz;
    const alongX = nz !== 0;
    // frame + glass door
    const geo = new THREE.BoxGeometry(alongX ? dw : 0.5, dh, alongX ? 0.5 : dw).translate(fx + nx * 0.05, dh / 2, fz + nz * 0.05);
    add('trim', tint(geo, '#202327'), fx, fz);
    const gx = fx + nx * 0.07, gz = fz + nz * 0.07, gw = (dw - 0.5) / 2, gt = 0.28;
    add('store', facadeBox(gx - (alongX ? gw : gt), gz - (alongX ? gt : gw), gx + (alongX ? gw : gt), gz + (alongX ? gt : gw), dh - 0.4, '#ffffff', 0.1), fx, fz);
    // awning
    const aw = alongX ? plainBox(fx - dw, fz + (nz < 0 ? -2.4 : 0), fx + dw, fz + (nz < 0 ? 0 : 2.4), 0.25, accent, 3.4) : plainBox(fx + (nx < 0 ? -2.4 : 0), fz - dw, fx + (nx < 0 ? 0 : 2.4), fz + dw, 0.25, accent, 3.4);
    add('trim', aw, fx, fz);
    // sign board
    if (sign) {
      const t = signTexture(sign.text, { accent, sub: sign.sub });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25, roughness: 0.6 }));
      m.position.set(fx + nx * 0.4, 4.9, fz + nz * 0.4);
      m.rotation.y = side === 's' ? 0 : side === 'n' ? Math.PI : side === 'e' ? Math.PI / 2 : -Math.PI / 2;
      m.userData.sign = true; group.add(m); signMeshes.push(m);
    }
    const px = fx + nx * 2.6, pz = fz + nz * 2.6;
    interactables.push({ id, kind: 'door', x: px, z: pz, radius: 3.2, label, enter, doorX: fx, doorZ: fz, nx, nz });
    return { x: px, z: pz };
  }
  const signMeshes = [];

  /* ---------------- special (enterable) buildings ---------------- */
  const reserved = [];
  const reserve = (r) => { reserved.push(r); return r; };
  const overlapsReserved = (a) => reserved.some((r) => a.x0 < r.x1 + 4 && a.x1 > r.x0 - 4 && a.z0 < r.z1 + 4 && a.z1 > r.z0 - 4);

  {
    const loft = reserve({ x0: -46, z0: 12, x1: -14, z1: 40 });
    const b = building({ ...loft, floors: 8, style: 'brick', color: '#f1d6c4', roofColor: '#46413e', storefront: true });
    doorOn({ ...loft, ...b }, 'n', 'Enter Wheat City Lofts — Unit 204', 'apartment', 'door_lofts', { sign: { text: 'WHEAT CITY LOFTS', sub: 'Rentals · Unit 204' }, accent: '#e3b93a' });
    const mk = reserve({ x0: 14, z0: 12, x1: 46, z1: 36 });
    const m = building({ ...mk, floors: 2, style: 'stucco', color: '#f3e3c5', roofColor: '#3a3d42', storefront: true });
    doorOn({ ...mk, ...m }, 'n', 'Enter Prairie Corner Market', 'market', 'door_market', { sign: { text: 'PRAIRIE CORNER', sub: 'MARKET · Fresh daily' }, accent: '#3bb273' });
    const gy = reserve({ x0: 122, z0: 12, x1: 154, z1: 36 });
    const gb = building({ ...gy, floors: 2, style: 'glass', color: '#d6e8ff', roofColor: '#2f3438', storefront: true });
    doorOn({ ...gy, ...gb }, 'n', 'Enter Prairie Fitness', 'gym', 'door_gym', { sign: { text: 'PRAIRIE FITNESS', sub: 'Open 24 hours' }, accent: '#3bd6c6' });
    const ch = reserve({ x0: -46, z0: -40, x1: -14, z1: -12 });
    const chb = building({ ...ch, floors: 3, style: 'concrete', color: '#f2eee4', roofColor: '#3a4a68', storefront: true });
    doorOn({ ...ch, ...chb }, 's', 'Enter Regina City Hall', 'cityhall', 'door_cityhall', { sign: { text: 'REGINA CITY HALL', sub: 'Council · Elections' }, accent: '#c9a64e' });
    const th = reserve({ x0: 14, z0: -40, x1: 46, z1: -12 });
    const t = building({ ...th, floors: 2, style: 'concrete', color: '#ededed', roofColor: '#34373b', storefront: true });
    doorOn({ ...th, ...t }, 's', 'Enter Prairie Threads', 'threads', 'door_threads', { sign: { text: 'PRAIRIE THREADS', sub: 'Clothing · Accessories' }, accent: '#8e6bd8' });
  }

  /* ---------------- downtown grid blocks ---------------- */
  const parkBlocks = [];
  for (let bi = GRID.i0; bi < GRID.i1; bi++) for (let bj = GRID.j0; bj < GRID.j1; bj++) {
    const x0 = bi * PITCH + R2, x1 = (bi + 1) * PITCH - R2, z0 = bj * PITCH + R2, z1 = (bj + 1) * PITCH - R2;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const score = Math.hypot(cx / (PITCH * 3.2), cz / (PITCH * 2.3));
    let zone = score < 0.9 ? 'core' : score < 1.6 ? 'mid' : 'res';
    if (bj >= 5) zone = 'res';
    if (zone !== 'core' && rnd() < 0.1 && !(bi === 0 && bj === 0)) zone = 'park';
    const special = reserved.some((r) => r.x0 > x0 && r.x1 < x1 && r.z0 > z0 && r.z1 < z1);
    // ground pad
    const pavedZone = zone === 'core' || zone === 'mid';
    add(pavedZone ? 'pave' : 'lawn', tint(plainBox(x0, z0, x1, z1, pavedZone ? 0.14 : 0.05, pavedZone ? '#d4d2cb' : '#8fb067'), pavedZone ? '#d4d2cb' : '#8fb067'), cx, cz);

    if (zone === 'park') {
      parkBlocks.push({ x0, z0, x1, z1 });
      const n = 14 + Math.floor(rnd() * 8);
      for (let k = 0; k < n; k++) trees.push({ x: x0 + 6 + rnd() * (x1 - x0 - 12), z: z0 + 6 + rnd() * (z1 - z0 - 12), s: 0.8 + rnd() * 0.7 });
      add('pave', plainBox(cx - 1.5, z0, cx + 1.5, z1, 0.16, '#c9c2b0', 0), cx, cz);
      add('pave', plainBox(x0, cz - 1.5, x1, cz + 1.5, 0.16, '#c9c2b0', 0), cx, cz);
      continue;
    }
    const lots = [];
    if (zone === 'core' || zone === 'mid') {
      const nx = zone === 'core' ? 1 + Math.floor(rnd() * 2) : 2, nz = zone === 'core' ? 1 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 2);
      const w = (x1 - x0) / nx, d = (z1 - z0) / nz;
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) lots.push({ x0: x0 + a * w + 2, x1: x0 + (a + 1) * w - 2, z0: z0 + b * d + 2, z1: z0 + (b + 1) * d - 2 });
    }
    if (zone === 'core' || zone === 'mid') {
      for (const lot of lots) {
        if (special && overlapsReserved(lot)) continue;
        const near = 1 - Math.min(1, score);
        const floors = zone === 'core' ? Math.round(7 + near * 16 * rnd() + rnd() * 6) : 3 + Math.floor(rnd() * 5);
        const style = zone === 'core' ? (rnd() < 0.62 ? 'glass' : pick(['concrete', 'brick', 'stucco'])) : pick(['brick', 'stucco', 'concrete', 'brick']);
        const color = pick(PALETTES[style]), roofColor = pick(ROOFS);
        if (zone === 'core' && floors > 12) {
          building({ ...lot, floors: 3, style: pick(['concrete', 'brick']), color: pick(PALETTES.concrete), roofColor, storefront: true, collide: false });
          const inset = 5;
          building({ x0: lot.x0 + inset, z0: lot.z0 + inset, x1: lot.x1 - inset, z1: lot.z1 - inset, floors, style, color, roofColor });
          colliders.add(lot.x0, lot.z0, lot.x1, lot.z1, 12);
          // lift tower base: cover podium roof overlap by simply starting tower at ground (hidden inside)
        } else building({ ...lot, floors, style, color, roofColor, storefront: floors > 2 });
      }
    } else {
      // residential: two rows of houses, front doors toward the street
      for (const side of ['n', 's']) {
        let x = x0 + 3;
        while (x < x1 - 14) {
          const w = 11 + rnd() * 5, d = 10 + rnd() * 3;
          const lot = side === 'n' ? { x0: x, x1: x + w, z0: z0 + 5, z1: z0 + 5 + d } : { x0: x, x1: x + w, z0: z1 - 5 - d, z1: z1 - 5 };
          x += w + 3 + rnd() * 3;
          if (special && overlapsReserved(lot)) continue;
          if (rnd() < 0.07) continue;
          const floors = rnd() < 0.3 ? 2 : 1;
          const b = building({ ...lot, floors: floors + (floors === 1 ? 0.0 : 0), style: 'siding', color: pick(PALETTES.siding), roofColor: pick(ROOFS), flat: false, ridgeX: rnd() < 0.7 });
          // door + step
          const dx = (lot.x0 + lot.x1) / 2 + (rnd() - 0.5) * 3, dzFace = side === 'n' ? lot.z0 : lot.z1, dir = side === 'n' ? -1 : 1;
          add('trim', plainBox(dx - 0.6, dzFace - (dir < 0 ? 0.3 : 0), dx + 0.6, dzFace + (dir < 0 ? 0 : 0.3), 2.2, pick(['#6b3a2a', '#2f4a63', '#2d2f33', '#7a2f2f']), 0), dx, dzFace);
          add('trim', plainBox(dx - 1.1, dzFace + (dir < 0 ? -1.4 : 0), dx + 1.1, dzFace + (dir < 0 ? 0 : 1.4), 0.25, '#b9b4a8', 0), dx, dzFace);
          if (rnd() < 0.5) trees.push({ x: lot.x0 + 2 + rnd() * (lot.x1 - lot.x0 - 4), z: side === 'n' ? lot.z0 - 3 : lot.z1 + 3, s: 0.6 + rnd() * 0.5 });
        }
      }
    }
  }

  /* ---------------- roads (grid) ---------------- */
  const grid = { x0: GRID.i0 * PITCH, x1: GRID.i1 * PITCH, z0: GRID.j0 * PITCH, z1: GRID.j1 * PITCH };
  for (let i = GRID.i0; i <= GRID.i1; i++) for (let j = GRID.j0; j < GRID.j1; j++) {
    const x = i * PITCH, za = j * PITCH + R2, zb = (j + 1) * PITCH - R2;
    add('road', stripQuad(x, za, x, zb, ROAD_W, 0.06), x, (za + zb) / 2);
  }
  for (let j = GRID.j0; j <= GRID.j1; j++) for (let i = GRID.i0; i < GRID.i1; i++) {
    const z = j * PITCH, xa = i * PITCH + R2, xb = (i + 1) * PITCH - R2;
    add('road', stripQuad(xa, z, xb, z, ROAD_W, 0.06), (xa + xb) / 2, z);
  }
  for (let i = GRID.i0; i <= GRID.i1; i++) for (let j = GRID.j0; j <= GRID.j1; j++) {
    const x = i * PITCH, z = j * PITCH;
    add('inter', stripQuad(x, z - R2, x, z + R2, ROAD_W, 0.065, 18), x, z);
    // sidewalk corner pads
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      add('pave', plainBox(x + sx * (R2 - 3) - (sx > 0 ? 0 : 3) + (sx > 0 ? 0 : 0), z + sz * (R2 - 3) - (sz > 0 ? 0 : 3), x + sx * (R2 - 3) + (sx > 0 ? 3 : 0), z + sz * (R2 - 3) + (sz > 0 ? 3 : 0), 0.14, '#b8b6ae', 0), x, z);
    const core = Math.abs(i) <= 4 && j >= -3 && j <= 5;
    if (core) {
      signals.push({ x, z });
      for (const s of [-1, 1]) {
        crossings.push({ x: x + s * (R2 + 1.6), z, rot: 0 }); // across the N–S road, east/west of the intersection
        crossings.push({ x, z: z + s * (R2 + 1.6), rot: Math.PI / 2 });
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lamps.push({ x: x + sx * (R2 - 1), z: z + sz * (R2 - 1) });
  }
  // mid-block lamps + parked cars
  for (let i = GRID.i0; i <= GRID.i1; i++) for (let j = GRID.j0; j < GRID.j1; j++) {
    const x = i * PITCH, zc = j * PITCH + PITCH / 2;
    lamps.push({ x: x + (R2 - 1), z: zc }, { x: x - (R2 - 1), z: zc + 8 });
  }
  for (let j = GRID.j0; j <= GRID.j1; j++) for (let i = GRID.i0; i < GRID.i1; i++) {
    const z = j * PITCH, xc = i * PITCH + PITCH / 2;
    lamps.push({ x: xc, z: z + (R2 - 1) }, { x: xc + 8, z: z - (R2 - 1) });
  }
  const CAR_COLORS = ['#c0392b', '#2c3e50', '#ecf0f1', '#7f8c8d', '#1f6f8b', '#d4a017', '#2d3436', '#8e44ad', '#27ae60', '#bdc3c7'];
  const carSlot = (x, z, rot) => { cars.push({ x, z, rot, color: pick(CAR_COLORS) }); colliders.add(x - (rot ? 2.3 : 1), z - (rot ? 1 : 2.3), x + (rot ? 2.3 : 1), z + (rot ? 1 : 2.3), 1.6); };
  for (let i = -4; i <= 6; i++) for (let j = -3; j <= 5; j++) {
    // along N–S roads
    for (let k = 0; k < 11; k++) for (const s of [-1, 1]) if (rnd() < 0.2) {
      const z = j * PITCH + R2 + 8 + k * 8; if (z > (j + 1) * PITCH - R2 - 8) continue;
      const x = i * PITCH + s * 4.1; if (i === 0 && j === 0 && Math.abs(z) < 30) continue;
      carSlot(x, z, 0);
    }
    for (let k = 0; k < 11; k++) for (const s of [-1, 1]) if (rnd() < 0.2) {
      const x = i * PITCH + R2 + 8 + k * 8; if (x > (i + 1) * PITCH - R2 - 8) continue;
      const z = j * PITCH + s * 4.1; if (j === 0 && i === 0 && Math.abs(x) < 30) continue;
      carSlot(x, z, Math.PI / 2);
    }
  }

  /* ---------------- Wascana: lake, park, bridge, Albert St south ---------------- */
  // shape y = -z so that rotateX(-90°) lays it flat with its normal pointing UP (the old +90° made it face down and get culled)
  const lakeShape = new THREE.Shape(lake.map(([x, z]) => new THREE.Vector2(x, -z)));
  const lakeMesh = new THREE.Mesh(new THREE.ShapeGeometry(lakeShape).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2f6f8f', roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.93, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  lakeMesh.position.y = 0.05; lakeMesh.receiveShadow = true; lakeMesh.name = 'lake'; group.add(lakeMesh);
  // park lawn
  {
    const g = plainBox(PARK_RECT.x0, PARK_RECT.z0, PARK_RECT.x1, PARK_RECT.z1, 0.04, '#9ec06f', 0);
    add('lawn', g, 0, 1100);
  }
  // Albert St south to Leg, over the lake (bridge deck slightly raised)
  add('road', stripQuad(ALBERT_X, grid.z1 + 0, ALBERT_X, 840, ROAD_W, 0.07), ALBERT_X, 800);
  add('road', stripQuad(ALBERT_X, 840, ALBERT_X, 1160, ROAD_W, 0.2), ALBERT_X, 1000);
  add('road', stripQuad(ALBERT_X, 1160, ALBERT_X, 1190, ROAD_W, 0.07), ALBERT_X, 1170);
  for (const s of [-1, 1]) {
    add('trim', plainBox(ALBERT_X + s * (R2 - 0.2) - 0.2, 840, ALBERT_X + s * (R2 - 0.2) + 0.2, 1160, 1.0, '#8c8a85', 0.1), ALBERT_X, 1000);
    colliders.add(ALBERT_X + s * (R2 - 0.2) - 0.25, 840, ALBERT_X + s * (R2 - 0.2) + 0.25, 1160, 1.1);
  }
  // park trees
  for (let n = 0; n < (quality === 'low' ? 350 : 800); n++) {
    const x = PARK_RECT.x0 + rnd() * (PARK_RECT.x1 - PARK_RECT.x0), z = PARK_RECT.z0 + rnd() * (PARK_RECT.z1 - PARK_RECT.z0);
    if (inPoly(x, z, lake) || Math.abs(x - ALBERT_X) < 22 || z < 790) continue;
    if (Math.abs(x - ALBERT_X) < 60 && z > 1160) continue;
    trees.push({ x, z, s: 0.9 + rnd() * 0.9 });
  }
  // park lamps along Albert
  for (let z = 860; z < 1190; z += 32) { lamps.push({ x: ALBERT_X + R2 - 1, z }, { x: ALBERT_X - R2 + 1, z }); }
  // lake shore path
  for (let x = -1500; x < 1900; x += 60) {
    const cz = 985 + Math.sin(x / 380) * 35 + Math.sin(x / 150) * 12;
    if (Math.abs(x - ALBERT_X) > 20) lamps.push({ x, z: cz - 140 + Math.sin(x / 120) * 10 });
  }

  /* ---------------- outer arterials + neighbourhood massing ---------------- */
  const arterialStrip = (a, b, w = 14) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; add('road', stripQuad(a[0], a[1], b[0], b[1], w, 0.06), m[0], m[1]); };
  const longRoad = (pts, w) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1]; const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 300); for (let q = 0; q < n; q++) arterialStrip([ax + ((bx - ax) * q) / n, az + ((bz - az) * q) / n], [ax + ((bx - ax) * (q + 1)) / n, az + ((bz - az) * (q + 1)) / n], w); } };
  for (const r of OUTER_ROADS) longRoad(r.pts, 16);

  // distance from a point to the long roads, so neighbourhood houses never sit on an arterial
  const nearRoad = (x, z, d) => OUTER_ROADS.some((r) => r.pts.some((a, k) => { const b = r.pts[k + 1]; if (!b) return false; const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)) < d; }));
  const hood = (d) => {
    const pitch = 72, half = Math.floor(d.r / pitch);
    const keep = (x, z) => !(x > grid.x0 - 40 && x < grid.x1 + 40 && z > grid.z0 - 40 && z < PARK_RECT.z1 + 40);
    for (let a = -half; a <= half; a++) {
      const x = d.x + a * pitch;
      for (let b = -half; b < half; b++) {
        const zc = d.z + b * pitch + pitch / 2; if (!keep(x, zc)) continue;
        add('road', stripQuad(x, zc - pitch / 2 + 5, x, zc + pitch / 2 - 5, 11, 0.06), x, zc);
      }
    }
    for (let b = -half; b <= half; b++) {
      const z = d.z + b * pitch;
      for (let a = -half; a < half; a++) {
        const xc = d.x + a * pitch + pitch / 2; if (!keep(xc, z)) continue;
        add('road', stripQuad(xc - pitch / 2 + 5, z, xc + pitch / 2 - 5, z, 11, 0.06), xc, z);
      }
    }
    for (let a = -half; a <= half; a++) for (let b = -half; b <= half; b++) {
      const x = d.x + a * pitch, z = d.z + b * pitch; if (!keep(x, z)) continue;
      add('inter', stripQuad(x, z - 5.5, x, z + 5.5, 11, 0.065, 11), x, z);
    }
    const skip = d.skipR ?? 0;
    for (let a = -half; a < half; a++) for (let b = -half; b < half; b++) {
      const bx0 = d.x + a * pitch + 8, bx1 = d.x + (a + 1) * pitch - 8, bz0 = d.z + b * pitch + 8, bz1 = d.z + (b + 1) * pitch - 8;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      if (!keep(cx, cz) || Math.hypot(cx - d.x, cz - d.z) < skip || Math.hypot(cx - d.x, cz - d.z) > d.r) continue;
      if (inPoly(cx, cz, lake)) continue;
      for (const side of [0, 1]) {
        let x = bx0 + 2;
        while (x < bx1 - 12) {
          const w = 9 + rnd() * 4, dd = 9 + rnd() * 3;
          const z0 = side ? bz1 - 4 - dd : bz0 + 4;
          if (rnd() > (d.density ?? 0.82) || nearRoad(x + w / 2, z0 + dd / 2, 18)) { x += w + 3; continue; }
          building({ x0: x, x1: x + w, z0, z1: z0 + dd, floors: rnd() < 0.25 ? 2 : 1, style: 'siding', color: pick(PALETTES.siding), roofColor: pick(ROOFS), flat: false, ridgeX: rnd() < 0.6, collide: Math.hypot(x - 0, z0 - 0) < 4200 });
          if (rnd() < 0.25) trees.push({ x: x + w / 2, z: side ? z0 + dd + 3 : z0 - 3, s: 0.6 + rnd() * 0.5 });
          x += w + 3 + rnd() * 2;
        }
      }
    }
  };
  const extras = buildLandmarks({ group, add, colliders, building, tint, plainBox, facadeBox, trees, rnd, signMeshes, doorOn });
  for (const d of DISTRICTS) {
    if (d.id === 'downtown' || d.id === 'wascana') continue;
    hood({ ...d, skipR: extras.skip[d.id] ?? 0, density: d.id === 'airport' ? 0.3 : d.id === 'uofr' ? 0.35 : 0.82, r: d.r });
  }
  /* ---------------- the island: green belts of trees between the neighbourhoods, a sandy beach, water all round ---------------- */
  const hoods = DISTRICTS.filter((d) => d.id !== 'downtown' && d.id !== 'wascana');
  for (let x = ISLAND.x0 + 60; x < ISLAND.x1 - 40; x += 58) for (let z = ISLAND.z0 + 60; z < ISLAND.z1 - 40; z += 58) {
    const tx = x + (rnd() - 0.5) * 46, tz = z + (rnd() - 0.5) * 46;
    if (tx > grid.x0 - 60 && tx < grid.x1 + 60 && tz > grid.z0 - 60 && tz < PARK_RECT.z1 + 60) continue;          // downtown + Wascana have their own trees
    if (hoods.some((d) => Math.hypot(tx - d.x, tz - d.z) < d.r + 25)) continue;                                      // neighbourhoods have their own
    if (nearRoad(tx, tz, 22) || inPoly(tx, tz, lake)) continue;
    if (rnd() < 0.5 + 0.2 * Math.sin(tx / 380) * Math.cos(tz / 420)) trees.push({ x: tx, z: tz, s: 0.8 + rnd() * 0.9 });   // clumpy, not a uniform grid
  }
  {
    const rr = (path, x0, z0, x1, z1, r) => { path.moveTo(x0 + r, z0); path.lineTo(x1 - r, z0); path.quadraticCurveTo(x1, z0, x1, z0 + r); path.lineTo(x1, z1 - r); path.quadraticCurveTo(x1, z1, x1 - r, z1); path.lineTo(x0 + r, z1); path.quadraticCurveTo(x0, z1, x0, z1 - r); path.lineTo(x0, z0 + r); path.quadraticCurveTo(x0, z0, x0 + r, z0); return path; };
    const flat = (shape, y, color, opts = {}) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, ...opts })); m.position.y = y; m.receiveShadow = true; group.add(m); return m; };
    const I = ISLAND, B = 70;
    const sea = new THREE.Shape(); sea.moveTo(-40000, -40000); sea.lineTo(40000, -40000); sea.lineTo(40000, 40000); sea.lineTo(-40000, 40000); sea.closePath(); sea.holes.push(rr(new THREE.Path(), I.x0 - B, I.z0 - B, I.x1 + B, I.z1 + B, I.r + B));
    const beach = new THREE.Shape(); rr(beach, I.x0 - B, I.z0 - B, I.x1 + B, I.z1 + B, I.r + B); beach.holes.push(rr(new THREE.Path(), I.x0, I.z0, I.x1, I.z1, I.r));
    api_seaMat = flat(sea, 0.09, '#4aa9dc', { roughness: 0.3, metalness: 0.15 }).material; flat(beach, 0.08, '#ecdcab', { roughness: 0.95 });
    // invisible walls at the shore keep you on the island
    colliders.add(I.x0 - 8, I.z0 - 40, I.x1 + 8, I.z0 - 16, 12); colliders.add(I.x0 - 8, I.z1 + 16, I.x1 + 8, I.z1 + 40, 12);
    colliders.add(I.x0 - 40, I.z0 - 8, I.x0 - 16, I.z1 + 8, 12); colliders.add(I.x1 + 16, I.z0 - 8, I.x1 + 40, I.z1 + 8, 12);
  }

  /* ---------------- billboards ---------------- */
  const boards = [];
  {
    const metal = new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: 0.5, metalness: 0.6 });
    for (const b of BILLBOARDS) {
      const mega = b.tier === 'mega', W = mega ? 15 : 10.5, Hh = mega ? 7.5 : 5.25, poleH = mega ? 9 : 6.5;
      const root = new THREE.Group(); root.position.set(b.x, 0, b.z); root.rotation.y = b.yaw; group.add(root);
      for (const sx of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, poleH + Hh * 0.5, 8), metal); pl.position.set(sx * (W * 0.32), (poleH + Hh * 0.5) / 2, -0.4); pl.castShadow = true; root.add(pl); }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, Hh + 0.7, 0.5), metal); frame.position.set(0, poleH + Hh / 2, -0.15); frame.castShadow = true; root.add(frame);
      const cv = document.createElement('canvas'); cv.width = 768; cv.height = Math.round(768 * (Hh / W));
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25, roughness: 0.6 });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), mat); face.position.set(0, poleH + Hh / 2, 0.12); root.add(face);
      const rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw), fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
      colliders.add(b.x - 1.5 - Math.abs(rx) * W * 0.32, b.z - 1.5 - Math.abs(rz) * W * 0.32, b.x + 1.5 + Math.abs(rx) * W * 0.32, b.z + 1.5 + Math.abs(rz) * W * 0.32, poleH);
      const board = { ...b, cv, tex, mat, mega, root, slots: [], slot: 0, priceLabel: `$${(DAY_PRICE[b.tier] / 100).toFixed(0)} / day` };
      boards.push(board);
      interactables.push({ id: 'bb_' + b.id, kind: 'billboard', boardId: b.id, x: b.x + fx * 10, z: b.z + fz * 10, radius: 9, label: `Billboard · ${b.name}` });
    }
  }
  /** Each board rotates the player's ad (if any) with in-game sponsor ads, like a real digital board. */
  const paintBoard = (b) => { const a = b.slots[b.slot % Math.max(1, b.slots.length)]; drawBillboard(b.cv, a, { tier: b.tier, onImage: () => paintBoard(b) }, THEMES); b.tex.needsUpdate = true; };
  const refreshBillboards = (ads = {}, now = Date.now()) => {
    for (const b of boards) { const a = ads[b.id]; b.slots = rotationFor(b, a && a.until > now ? a : null); b.slot = 0; paintBoard(b); }
  };
  let rotT = 0;
  const rotateBoards = (dt, camPos) => {
    rotT += dt; if (rotT < 6) return; rotT = 0;
    for (const b of boards) { if (b.slots.length < 2) continue; if (Math.hypot(b.x - camPos.x, b.z - camPos.z) > 1400 && !overview) continue; b.slot = (b.slot + 1) % b.slots.length; paintBoard(b); }
  };
  /** In the overview map the boards are drawn oversized so the ads read from far away (like the map in the game that inspired this). */
  let overview = false;
  const setOverview = (on) => { overview = on; for (const b of boards) b.root.scale.setScalar(on ? 2.6 : 1); };
  refreshBillboards();

  /* ---------------- instanced props ---------------- */
  const props = new THREE.Group(); group.add(props);
  const dummy = new THREE.Object3D();

  // trees
  let crownMesh;
  {
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 6).translate(0, 1.6, 0), new THREE.MeshStandardMaterial({ color: '#5b4330', roughness: 1 }), trees.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.5, 1).translate(0, 5.1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), trees.length);
    trees.forEach((t, i) => { dummy.position.set(t.x, 0, t.z); dummy.rotation.set(0, rnd() * 6, 0); dummy.scale.set(t.s, t.s * (0.9 + rnd() * 0.3), t.s); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix); crown.setMatrixAt(i, dummy.matrix); });
    trunk.castShadow = crown.castShadow = true; trunk.receiveShadow = crown.receiveShadow = true;
    props.add(trunk, crown); crownMesh = crown;
    trees.forEach((t) => { if (t.s > 0.7) colliders.add(t.x - 0.35, t.z - 0.35, t.x + 0.35, t.z + 0.35, 4); });
  }
  const treeTints = trees.map(() => rnd());
  function recolorTrees(season) {
    const pal = {
      summer: ['#4f7f3a', '#5c8c40', '#467435', '#63934a'], spring: ['#86b45a', '#93bf62', '#7aab52', '#a2c872'],
      autumn: ['#c9822f', '#b3532a', '#d8a53a', '#9c3d24', '#8c9a3a'], winter: ['#9aa6a0', '#8d9892', '#a8b3ae', '#7e8a85'],
    }[season];
    const c = new THREE.Color();
    treeTints.forEach((u, i) => { c.set(pal[Math.floor(u * pal.length) % pal.length]); crownMesh.setColorAt(i, c); });
    crownMesh.instanceColor.needsUpdate = true;
  }

  // street lamps + glow pools
  const lampPoles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 7.2, 6).translate(0, 3.6, 0), new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: 0.6, metalness: 0.5 }), lamps.length);
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: '#ddd', emissive: new THREE.Color('#ffd08a'), emissiveIntensity: 0, roughness: 0.4 });
  const lampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.22, 0.45).translate(0.3, 7.25, 0), lampHeadMat, lamps.length);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffcf86', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(15, 15).rotateX(-Math.PI / 2).translate(0, 0.12, 0), glowMat, lamps.length);
  lamps.forEach((l, i) => { dummy.position.set(l.x, 0, l.z); dummy.rotation.set(0, (i % 2) * Math.PI, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); lampPoles.setMatrixAt(i, dummy.matrix); lampHeads.setMatrixAt(i, dummy.matrix); dummy.rotation.set(0, 0, 0); dummy.position.x += 0.9; dummy.updateMatrix(); pools.setMatrixAt(i, dummy.matrix); });
  lampPoles.castShadow = true; props.add(lampPoles, lampHeads, pools);
  pools.frustumCulled = false; lampPoles.frustumCulled = false; lampHeads.frustumCulled = false;
  // collisions for lamp poles are skipped (thin) – players slide through nothing meaningful

  // parked cars (one merged car mesh, instanced + tinted per car)
  const carGeo = (() => {
    const strip = (g) => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); return n; };
    const body = tint(strip(new THREE.BoxGeometry(1.8, 0.7, 4.3).translate(0, 0.75, 0)), '#ffffff');
    const cabin = tint(strip(new THREE.BoxGeometry(1.6, 0.6, 2.2).translate(0, 1.4, -0.1)), '#3a4654');
    const wheels = [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]].map(([x, z]) => tint(strip(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 10).rotateZ(Math.PI / 2).translate(x, 0.34, z)), '#101010'));
    return mergeGeometries([body, cabin, ...wheels]);
  })();

  // traffic signals
  const sigPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.12, 5.6, 6).translate(0, 2.8, 0), new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.6, metalness: 0.4 }), signals.length * 4);
  const mkLamp = (c) => new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: '#222', emissive: new THREE.Color(c), emissiveIntensity: 2.2 }), signals.length * 4);
  const nsRed = mkLamp('#ff2a1c'), nsGreen = mkLamp('#27e060'), ewRed = mkLamp('#ff2a1c'), ewGreen = mkLamp('#27e060');
  const sigHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 1.2, 0.42).translate(0, 5.0, 0), new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.5 }), signals.length * 4);
  {
    let k = 0;
    signals.forEach((s) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const px = s.x + sx * (R2 - 0.6), pz = s.z + sz * (R2 - 0.6);
        dummy.position.set(px, 0, pz); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); sigPole.setMatrixAt(k, dummy.matrix); sigHeads.setMatrixAt(k, dummy.matrix);
        // two faces: NS lamp offset in z, EW lamp offset in x
        dummy.position.set(px, 5.25, pz - sz * 0.24); dummy.updateMatrix(); nsRed.setMatrixAt(k, dummy.matrix);
        dummy.position.set(px, 4.75, pz - sz * 0.24); dummy.updateMatrix(); nsGreen.setMatrixAt(k, dummy.matrix);
        dummy.position.set(px - sx * 0.24, 5.25, pz); dummy.updateMatrix(); ewRed.setMatrixAt(k, dummy.matrix);
        dummy.position.set(px - sx * 0.24, 4.75, pz); dummy.updateMatrix(); ewGreen.setMatrixAt(k, dummy.matrix);
        k++;
      }
    });
    props.add(sigPole, sigHeads, nsRed, nsGreen, ewRed, ewGreen);
    [sigPole, sigHeads, nsRed, nsGreen, ewRed, ewGreen].forEach((m) => (m.frustumCulled = false));
  }
  // crosswalk stripes
  {
    const cw = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8e8e2', polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), crossings.length * 7);
    let k = 0;
    for (const c of crossings) for (let s = -3; s <= 3; s++) {
      dummy.position.set(c.rot ? c.x + s * 1.6 : c.x, 0.085, c.rot ? c.z : c.z + s * 1.6);
      dummy.rotation.set(0, c.rot, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); cw.setMatrixAt(k++, dummy.matrix);
    }
    cw.frustumCulled = false; props.add(cw);
  }

  /* ---------------- finalise batches ---------------- */
  const chunks = batch.build(mats, { cast: castSet });
  const chunkGroup = new THREE.Group(); group.add(chunkGroup);
  for (const c of chunks) { c.center = new THREE.Vector3((c.cx + 0.5) * CHUNK, 0, (c.cz + 0.5) * CHUNK); chunkGroup.add(c.mesh); }

  /* ---------------- runtime ---------------- */
  const state = { phase: 0, lastChunkCheck: 0, viewDist: 1500 };
  const facadeIds = ['brick', 'concrete', 'stucco', 'siding', 'glass', 'store'];
  let signalPhase = 0;
  const api = {
    group, colliders, interactables, mats, chunks, lamps, trees, signMeshes,
    spawn: { x: -14, z: 4, heading: Math.PI / 2 },
    recolorTrees, billboards: boards, refreshBillboards, setOverview, rotateBoards,
    carsReady: Promise.resolve().then(() => {
      const m = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 }), cars.length);
      const c = new THREE.Color();
      cars.forEach((car, i) => { dummy.position.set(car.x, 0, car.z); dummy.rotation.set(0, car.rot, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); c.set(car.color); m.setColorAt(i, c); });
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; props.add(m);
    }),
    setViewDistance(d) { state.viewDist = d; },
    /** env: { night:0..1, season, snow:0..1 } */
    setEnvironment({ night, season, snow = 0 }) {
      for (const id of facadeIds) mats[id].emissiveIntensity = id === 'store' ? 0.15 + night * 0.55 : night * 0.9;
      for (const b of boards) b.mat.emissiveIntensity = 0.18 + night * 0.7;
      lampHeadMat.emissiveIntensity = night * 3; glowMat.opacity = night * 0.55;
      const white = new THREE.Color('#ffffff');
      groundTex.needsUpdate = false;
      ground.material.color.set('#ffffff').lerp(new THREE.Color(season === 'winter' ? '#e7edf2' : season === 'autumn' ? '#d9c79a' : '#ffffff'), season === 'winter' ? Math.max(0.55, snow) : season === 'autumn' ? 0.55 : 0);
      if (snow > 0.05 || season === 'winter') { ground.material.color.lerp(new THREE.Color('#f4f8fb'), Math.max(snow, season === 'winter' ? 0.7 : 0)); }
      mats.lawn.color.set('#ffffff').lerp(new THREE.Color('#f1f6fa'), Math.max(snow, season === 'winter' ? 0.7 : 0));
      mats.roof.color.set('#ffffff').lerp(new THREE.Color('#dfe7ee'), Math.max(snow, season === 'winter' ? 0.6 : 0) * 0.8);
    },
    update(dt, cam) {
      rotateBoards(dt, cam); state.lastChunkCheck += dt;
      if (state.lastChunkCheck > 0.25) {
        state.lastChunkCheck = 0;
        for (const c of chunks) c.mesh.visible = c.center.distanceTo(cam) < state.viewDist + CHUNK * 0.8;
      }
      signalPhase += dt;
      const ph = signalPhase % 28, nsGo = ph < 12, nsAmber = ph >= 12 && ph < 14, ewGo = ph >= 14 && ph < 26;
      nsGreen.visible = nsGo; nsRed.visible = !nsGo; ewGreen.visible = ewGo; ewRed.visible = !ewGo;
      api.signal = { nsGo, ewGo, nsAmber };
    },
    signal: { nsGo: true, ewGo: false },
  };
  return api;
}
