import * as THREE from 'three';
import { poiById, ALBERT_X } from './cityData.js';
import { signTexture } from './textures.js';

/** Hand-built landmarks. Returns radii around districts that the housing generator should keep clear. */
export function buildLandmarks({ group, add, colliders, building, tint, plainBox, facadeBox, trees, rnd }) {
  const skip = {};
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const mesh = (geo, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; group.add(m); return m; };

  /* ----- Legislative Building (Wascana Centre) ----- */
  {
    const L = poiById.leg, cx = L.x, cz = L.z + 20;
    const stone = std('#d6cdb8'), roofMat = std('#6f8f86', { metalness: 0.2 }), dark = std('#8d8571');
    // lawn + steps
    mesh(new THREE.BoxGeometry(150, 0.5, 90), std('#b9b3a2'), cx, 0.25, cz + 5, false);
    mesh(new THREE.BoxGeometry(110, 7, 36), stone, cx, 3.5 + 0.5, cz);                    // main block
    mesh(new THREE.BoxGeometry(150, 9, 22), stone, cx, 4.5 + 0.5, cz + 14);               // long façade wings
    mesh(new THREE.BoxGeometry(60, 12, 28), stone, cx, 6 + 0.5, cz - 4);                  // central
    // colonnade
    for (let k = -8; k <= 8; k++) mesh(new THREE.CylinderGeometry(0.9, 1.0, 9, 12), stone, cx + k * 5.2, 5, cz - 8 - 3.3, true);
    mesh(new THREE.BoxGeometry(90, 2.5, 5), stone, cx, 10.2, cz - 11.4);                  // entablature
    // dome drum + dome
    mesh(new THREE.CylinderGeometry(11, 12.5, 14, 28), stone, cx, 19, cz - 4);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; mesh(new THREE.CylinderGeometry(0.5, 0.5, 11, 8), dark, cx + Math.cos(a) * 11.6, 19.5, cz - 4 + Math.sin(a) * 11.6, false); }
    mesh(new THREE.SphereGeometry(11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), roofMat, cx, 26, cz - 4);
    mesh(new THREE.CylinderGeometry(1.6, 2, 6, 12), stone, cx, 38, cz - 4);
    mesh(new THREE.SphereGeometry(1.4, 12, 8), std('#e3c15a', { metalness: 0.7, roughness: 0.3 }), cx, 41.8, cz - 4);
    // wing pavilions with copper roofs
    for (const s of [-1, 1]) {
      mesh(new THREE.BoxGeometry(24, 13, 26), stone, cx + s * 62, 7, cz + 6);
      mesh(new THREE.ConeGeometry(15, 6, 4).rotateY(Math.PI / 4), roofMat, cx + s * 62, 16.4, cz + 6);
    }
    colliders.add(cx - 76, cz - 22, cx + 76, cz + 28, 12);
    // reflecting walkways
    mesh(new THREE.BoxGeometry(14, 0.12, 120), std('#cfc8b5'), cx, 0.1, cz - 80, false);
    skip.wascana = 0;
    // flag poles
    for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.1, 0.12, 14, 6), std('#c7c7c7'), cx + s * 24, 7, cz - 40, true);
  }

  /* ----- Mosaic Stadium ----- */
  {
    const S = poiById.stadium;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(92, 70, 26, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.7, side: THREE.DoubleSide }));
    ring.position.set(S.x, 13, S.z); ring.castShadow = ring.receiveShadow = true; group.add(ring);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(70, 52, 14, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#2c5b3a', roughness: 0.9, side: THREE.DoubleSide }));
    bowl.position.set(S.x, 7, S.z); group.add(bowl);
    const field = new THREE.Mesh(new THREE.BoxGeometry(110, 0.4, 56), new THREE.MeshStandardMaterial({ color: '#3f8f4b', roughness: 1 })); field.position.set(S.x, 0.2, S.z); field.receiveShadow = true; group.add(field);
    for (let k = -5; k <= 5; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 54), new THREE.MeshBasicMaterial({ color: '#f0f0f0' })); l.position.set(S.x + k * 10, 0.45, S.z); group.add(l); }
    const roof = new THREE.Mesh(new THREE.TorusGeometry(80, 2, 8, 48).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8b1a1a', roughness: 0.5 })); roof.position.set(S.x, 27, S.z); group.add(roof);
    // colliders: approximate ring wall with 16 boxes
    for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2, x = S.x + Math.cos(a) * 85, z = S.z + Math.sin(a) * 85; colliders.add(x - 11, z - 11, x + 11, z + 11, 20); }
    skip.stadium = 170;
  }

  /* ----- Airport ----- */
  {
    const A = poiById.airport;
    const runway = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 2200), std('#2b2c30')); runway.position.set(A.x, 0.12, A.z + 150); runway.receiveShadow = true; group.add(runway);
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 22), new THREE.MeshBasicMaterial({ color: '#f1f1ee' }), 80);
    const o = new THREE.Object3D(); for (let k = 0; k < 80; k++) { o.position.set(A.x, 0.26, A.z - 900 + k * 28 + 150); o.updateMatrix(); dash.setMatrixAt(k, o.matrix); } group.add(dash);
    const tx = A.x + 120, tz = A.z - 40;
    mesh(new THREE.BoxGeometry(110, 10, 34), std('#d8dde3', { metalness: 0.2 }), tx, 5, tz);
    mesh(new THREE.BoxGeometry(112, 1.2, 36), std('#555b63'), tx, 10.6, tz);
    mesh(new THREE.BoxGeometry(100, 6, 1), std('#2f4a63', { metalness: 0.5, roughness: 0.2 }), tx, 4.2, tz + 17.2, false);
    const t = signTexture('REGINA INTERNATIONAL', { w: 512, h: 96, accent: '#4d9be6', bg: '#0f1b2b' });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(40, 7.5), new THREE.MeshBasicMaterial({ map: t })); sign.position.set(tx, 13, tz + 18.2); group.add(sign);
    colliders.add(tx - 56, tz - 18, tx + 56, tz + 18, 12);
    // tower
    mesh(new THREE.CylinderGeometry(3, 4, 30, 10), std('#cfd3d8'), tx + 80, 15, tz - 30); mesh(new THREE.CylinderGeometry(6, 4, 5, 10), std('#2f4a63', { metalness: 0.5 }), tx + 80, 32, tz - 30);
    colliders.add(tx + 75, tz - 35, tx + 85, tz - 25, 34);
    skip.airport = 640;
  }

  /* ----- University of Regina campus ----- */
  {
    const U = poiById.uofr;
    const quad = [[-70, -40, 38, 14, 4, 'brick'], [-70, 20, 38, 18, 5, 'concrete'], [20, -40, 46, 16, 3, 'concrete'], [20, 6, 40, 18, 6, 'brick'], [-10, 60, 54, 20, 4, 'glass'], [-130, -10, 30, 30, 3, 'stucco']];
    quad.forEach(([dx, dz, w, d, floors, style]) => building({ x0: U.x + dx, z0: U.z + dz, x1: U.x + dx + w, z1: U.z + dz + d, floors, style, color: '#ffffff', roofColor: '#4a4a4f' }));
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(130, 90).rotateX(-Math.PI / 2), std('#86ad5e')); lawn.position.set(U.x - 20, 0.08, U.z + 20); lawn.receiveShadow = true; group.add(lawn);
    for (let k = 0; k < 40; k++) trees.push({ x: U.x - 80 + rnd() * 160, z: U.z - 60 + rnd() * 140, s: 0.7 + rnd() * 0.6 });
    skip.uofr = 260;
  }

  /* ----- Harbour Landing big-box retail strip ----- */
  {
    const H = poiById.harbour;
    [[0, 0, 80, 46], [95, 0, 56, 40], [0, 70, 64, 36], [80, 70, 90, 40]].forEach(([dx, dz, w, d]) =>
      building({ x0: H.x + dx - 40, z0: H.z + dz - 20, x1: H.x + dx - 40 + w, z1: H.z + dz - 20 + d, floors: 2, style: 'stucco', color: '#f4f0e6', roofColor: '#3b3e44', storefront: true }));
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(260, 190).rotateX(-Math.PI / 2), std('#3a3b3f')); lot.position.set(H.x + 50, 0.1, H.z + 40); lot.receiveShadow = true; group.add(lot);
    skip.harbour = 200;
  }

  /* ----- Downtown towers with names (skyline anchors) ----- */
  return { skip };
}
