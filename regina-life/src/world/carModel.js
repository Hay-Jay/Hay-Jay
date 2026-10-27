import * as THREE from 'three';

/** The player's own car: a chunky, friendly low-poly hatchback, sedan or pickup in the paint you picked. Faces +z. */
export function buildCar(shape, paint) {
  const root = new THREE.Group(), geos = [], mats = [];
  const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.4, metalness: o.metal ?? 0.15, emissive: o.emissive ?? '#000000' }); mats.push(m); return m; };
  const box = (w, h, d, m, x, y, z, r = 0) => { const g = new THREE.BoxGeometry(w, h, d); geos.push(g); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.x = r; o.castShadow = true; root.add(o); return o; };
  const body = M(paint), glass = M('#2c3a4a', { rough: 0.15, metal: 0.4 }), tyre = M('#202226', { rough: 0.9 }), trim = M('#d9dcdf', { metal: 0.6, rough: 0.3 });
  const lamp = M('#fff4cf', { emissive: '#6b5b2a' }), tail = M('#c0392b', { emissive: '#4a0e08' });
  const L = shape === 'pickup' ? 4.9 : shape === 'sedan' ? 4.5 : 3.9, W = shape === 'pickup' ? 1.95 : 1.8;
  box(W, 0.62, L, body, 0, 0.72, 0);                                                                       // lower body
  if (shape === 'pickup') {
    box(W - 0.08, 0.72, 1.8, body, 0, 1.38, 0.55); box(W - 0.2, 0.5, 0.05, glass, 0, 1.44, 1.46); box(W - 0.2, 0.42, 0.05, glass, 0, 1.44, -0.36);
    box(W, 0.4, 0.08, body, 0, 1.2, -2.41); for (const x of [-1, 1]) box(0.08, 0.4, 2.0, body, x * (W / 2 - 0.04), 1.2, -1.4);      // the bed
  } else {
    const cl = shape === 'sedan' ? 2.3 : 2.1, cz = shape === 'sedan' ? -0.1 : -0.35;
    box(W - 0.12, 0.62, cl, body, 0, 1.33, cz);
    box(W - 0.24, 0.5, 0.05, glass, 0, 1.36, cz + cl / 2 + 0.01); box(W - 0.24, 0.46, 0.05, glass, 0, 1.36, cz - cl / 2 - 0.01);
    for (const x of [-1, 1]) box(0.05, 0.42, cl - 0.3, glass, x * ((W - 0.12) / 2 + 0.01), 1.38, cz);
  }
  for (const x of [-1, 1]) { box(0.32, 0.16, 0.05, lamp, x * (W / 2 - 0.3), 0.82, L / 2 + 0.01); box(0.3, 0.14, 0.05, tail, x * (W / 2 - 0.28), 0.84, -L / 2 - 0.01); }
  box(W - 0.3, 0.12, 0.06, trim, 0, 0.5, L / 2 + 0.02); box(W - 0.3, 0.12, 0.06, trim, 0, 0.5, -L / 2 - 0.02);
  const wheels = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const g = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16).rotateZ(Math.PI / 2); geos.push(g);
    const w = new THREE.Mesh(g, tyre); w.position.set(x * (W / 2 - 0.05), 0.38, z * (L / 2 - 0.8)); w.castShadow = true; root.add(w); wheels.push(w);
    const hg = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 10).rotateZ(Math.PI / 2); geos.push(hg); const h = new THREE.Mesh(hg, trim); w.add(h);
  }
  let roll = 0;
  return {
    root, length: L, width: W,
    /** seat offset for the driver (local), so the character sits behind the wheel */
    seat: { x: -0.38, y: -0.2, z: shape === 'pickup' ? 0.5 : 0.05 },
    update(dt, speed, steer = 0) { roll += (speed * dt) / 0.38; wheels.forEach((w, i) => { w.rotation.x = roll; if (i < 2) w.rotation.y = steer * 0.45; }); },
    dispose() { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); },
  };
}
