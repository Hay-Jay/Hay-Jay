import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FURNITURE, POSTER_SIZE, isPoster } from '../data/furniture.js';

const sh = (hex, l) => `#${new THREE.Color(hex).offsetHSL(0, 0, l).getHexString()}`; // lighter (+) / darker (-) copy of a colour
const m = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const bx = (g, w, h, d, color, x, y, z, o) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(color, o)); me.position.set(x, y + h / 2, z); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/**
 * Tiny modelling kit: every part is queued with its transform and baked into ONE mesh per material (few draw calls per piece).
 * Positions are metres from the floor-centre of the footprint; box/cylinder/sphere `y` is the part's BOTTOM.
 * Material options: e = emissive colour, ei = emissive strength, op = opacity, r = roughness, mt = metalness, f = flat shading.
 */
function kit() {
  const parts = [], mats = new Map(), tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const mk = (color, o = {}) => {
    const key = `${color}|${o.e || ''}|${o.ei ?? ''}|${o.op ?? ''}|${o.r ?? ''}|${o.mt ?? ''}|${o.f ? 1 : 0}`; let mat = mats.get(key);
    if (!mat) { mat = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.8, metalness: o.mt ?? 0, flatShading: !!o.f, ...(o.e ? { emissive: new THREE.Color(o.e), emissiveIntensity: o.ei ?? 0.8 } : {}), ...(o.op != null ? { transparent: true, opacity: o.op } : {}) }); mats.set(key, mat); }
    return mat;
  };
  const put = (geo, color, x, y, z, o = {}) => { geo.applyMatrix4(tmp.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(o.rx || 0, o.ry || 0, o.rz || 0)), one)); parts.push({ geo, mat: mk(color, o) }); };
  const k = {
    b: (w, h, d, col, x, y, z, o) => put(new THREE.BoxGeometry(w, h, d), col, x, y + h / 2, z, o),
    c: (rt, rb, h, col, x, y, z, seg = 16, o) => put(new THREE.CylinderGeometry(rt, rb, h, seg), col, x, y + h / 2, z, o),
    /** Elliptical cylinder with a w x d footprint. */
    ce: (w, d, h, col, x, y, z, seg = 16, o) => { const geo = new THREE.CylinderGeometry(0.5, 0.5, h, seg); geo.scale(w, 1, d); put(geo, col, x, y + h / 2, z, o); },
    /** Cylinder lying along x / z, centred at y. */
    cx: (len, r, col, x, y, z, seg = 10, o) => put(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), col, x, y, z, o),
    cz: (len, r, col, x, y, z, seg = 10, o) => put(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2), col, x, y, z, o),
    s: (w, h, d, col, x, y, z, o) => put(new THREE.SphereGeometry(0.5, o?.lo ? 8 : 16, o?.lo ? 6 : 12).scale(w, h, d), col, x, y + h / 2, z, o), // o.lo = fewer facets for small things
    ico: (w, h, d, col, x, y, z, o) => put(new THREE.IcosahedronGeometry(0.5, 1).scale(w, h, d), col, x, y + h / 2, z, { f: true, ...o }),
    cone: (r, h, col, x, y, z, seg = 6, o) => put(new THREE.ConeGeometry(r, h, seg), col, x, y + h / 2, z, o),
    /** A round rod between two points. */
    rod: (a, b2, r, col, o, seg = 6) => {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b2), dir = B.clone().sub(A), len = dir.length(), geo = new THREE.CylinderGeometry(r, r, len, seg);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())); const mid = A.add(B).multiplyScalar(0.5); put(geo, col, mid.x, mid.y, mid.z, o);
    },
    /** Merge all queued parts into one mesh per material (`cast`: whether the piece casts shadows; flat rugs and mats do not). */
    bake: (cast = true) => {
      const g = new THREE.Group(), by = new Map(); for (const p of parts) { const a = by.get(p.mat) || by.set(p.mat, []).get(p.mat); a.push(p); }
      for (const [mat, list] of by) {
        const geo = mergeGeometries(list.map((p) => (p.geo.index ? p.geo.toNonIndexed() : p.geo)), false); list.forEach((p) => p.geo.dispose());
        const me = new THREE.Mesh(geo, mat); me.castShadow = cast; me.receiveShadow = true; g.add(me);
      }
      return g;
    },
  };
  return k;
}

/* ---------- builders: (k, def) => void. tier (1-4) changes cushions, trim, legs and finish. ---------- */
const DARK = '#2b2e33', WOOD = '#8a6a48', BRASS = '#c9a24a', STEEL = '#c0c4c8';
const legs4 = (k, w, d, lh, lw, col, inset = 0.06) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(lw, lh, lw, col, sx * (w / 2 - inset), 0, sz * (d / 2 - inset)); };

function bed(k, { w, d, h, color, tier: t }) {
  if (t === 1) { // floor mattress
    k.b(w, 0.17, d, '#e9e5dc', 0, 0, 0); k.b(w - 0.04, 0.06, d * 0.6, color, 0, 0.17, d * 0.2); k.b(w - 0.04, 0.062, 0.14, sh(color, -0.1), 0, 0.17, d * 0.12);
    k.b(w * 0.62, 0.08, 0.3, '#f6f3ec', 0, 0.17, -d / 2 + 0.24); return;
  }
  const fh = [0, 0.26, 0.3, 0.34][t - 1], mh = 0.22, duv = ['', '#cfd8e3', '#e8ecf2', '#c4cce4'][t - 1];
  k.b(w, fh, d, t === 2 ? color : sh(color, -0.04), 0, 0, 0); // frame (wood platform / upholstered base)
  k.b(w - 0.06, mh, d - 0.08, '#f1eee6', 0, fh, 0.02); // mattress
  k.b(w - 0.04, 0.05, d * 0.62, duv, 0, fh + mh - 0.01, d * 0.17); k.b(w - 0.04, 0.052, 0.14, sh(duv, -0.12), 0, fh + mh - 0.01, -d * 0.1); // duvet with a folded band
  k.b(w, h, 0.1, color, 0, 0, -d / 2 + 0.05); // headboard (top = h)
  if (t >= 3) k.b(w, fh + 0.14, 0.06, color, 0, 0, d / 2 - 0.03); // footboard
  if (t === 4) { k.b(w - 0.24, h - 0.4, 0.03, sh(color, 0.08), 0, 0.3, -d / 2 + 0.115); for (const sx of [-1, 1]) k.b(0.05, 0.05, 0.05, BRASS, sx * (w / 2 - 0.1), h - 0.05, -d / 2 + 0.05, { mt: 0.5 }); }
  const n = w > 1.3 ? 2 : 1; for (let i = 0; i < n; i++) k.b(n === 2 ? w / 2 - 0.14 : 0.5, 0.12, 0.3, '#f6f3ec', n === 2 ? (i ? 1 : -1) * (w / 4) : 0, fh + mh, -d / 2 + 0.3);
  if (t === 4) k.b(w - 0.1, 0.05, 0.4, sh(duv, -0.2), 0, fh + mh - 0.01, d / 2 - 0.3); // throw at the foot
}
function nightstand(k, { w, d, h, color }) {
  legs4(k, w, d, 0.1, 0.04, sh(color, -0.2), 0.05); k.b(w, h - 0.13, d - 0.02, color, 0, 0.1, -0.01); k.b(w, 0.03, d, sh(color, 0.08), 0, h - 0.03, 0);
  k.b(w - 0.08, 0.17, 0.01, sh(color, -0.07), 0, 0.3, d / 2 - 0.015); k.b(w - 0.08, 0.17, 0.01, sh(color, -0.07), 0, 0.12, d / 2 - 0.015); k.b(0.1, 0.02, 0.01, DARK, 0, 0.375, d / 2 - 0.005); k.b(0.1, 0.02, 0.01, DARK, 0, 0.195, d / 2 - 0.005);
}
function chair(k, { w, d, h, color, tier: t }) {
  const sy = Math.round(h * 50) / 100, leg = t >= 3 ? sh(color, -0.12) : '#4d3a29';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { if (t >= 3) k.c(0.014, 0.024, sy - 0.05, leg, sx * (w / 2 - 0.04), 0, sz * (d / 2 - 0.04), 6); else k.b(0.04, sy - 0.05, 0.04, leg, sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03)); }
  k.b(w, 0.05, d, color, 0, sy - 0.05, 0); k.b(w, h - sy, 0.04, color, 0, sy, -d / 2 + 0.02);
  k.b(w - 0.06, 0.04, d - 0.1, sh(color, t >= 3 ? 0.1 : 0.05), 0, sy, 0.02); if (t >= 2) k.b(w - 0.12, h - sy - 0.12, 0.02, sh(color, 0.1), 0, sy + 0.04, -d / 2 + 0.05);
}
function dtable(k, { id, w, d, h, color, tier: t }) {
  const dark = sh(color, -0.22);
  if (id === 'table_bistro') { k.ce(w, d, 0.026, color, 0, h - 0.03, 0, 20); k.ce(w - 0.1, d - 0.1, 0.004, sh(color, 0.1), 0, h - 0.004, 0, 20); k.c(0.03, 0.03, h - 0.06, DARK, 0, 0.03, 0, 8); k.c(0.2, 0.24, 0.03, DARK, 0, 0, 0, 16); return; }
  k.b(w, 0.034, d, color, 0, h - 0.04, 0); k.b(w - 0.16, 0.006, d - 0.16, sh(color, 0.09), 0, h - 0.006, 0); // top with a lighter inlay
  if (t === 2) { legs4(k, w, d, h - 0.04, 0.07, dark, 0.09); k.b(w - 0.3, 0.06, 0.03, dark, 0, h - 0.1, d / 2 - 0.12); return; }
  for (const sx of [-1, 1]) k.b(0.06, h - 0.04, d - 0.24, dark, sx * (w / 2 - 0.22), 0, 0); k.b(w - 0.44, 0.05, 0.06, dark, 0, 0.22, 0); k.b(w - 0.44, 0.08, d - 0.3, sh(color, -0.08), 0, h - 0.12, 0); // trestle base
}
function island(k, { id, w, d, h, color }) {
  if (id === 'cart') {
    const frame = '#d4d0c6'; k.b(w, 0.03, d, '#c9a878', 0, h - 0.03, 0); for (const y of [0.08, 0.42]) k.b(w - 0.06, 0.025, d - 0.06, color, 0, y, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.b(0.03, h - 0.09, 0.03, frame, sx * (w / 2 - 0.03), 0.06, sz * (d / 2 - 0.03)); k.c(0.03, 0.03, 0.06, DARK, sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03), 8); }
    k.s(0.2, 0.1, 0.2, '#c25b5b', -0.1, 0.445, 0, { lo: true }); k.b(0.18, 0.12, 0.12, '#f1ece0', 0.14, 0.105, 0); k.b(w - 0.06, 0.02, 0.02, STEEL, 0, 0.6, d / 2 - 0.03); return;
  }
  k.b(w - 0.12, 0.08, d - 0.1, DARK, 0, 0, -0.01); k.b(w - 0.1, h - 0.13, d - 0.06, color, 0, 0.08, -0.03); k.b(w, 0.038, d, '#e8e4dc', 0, h - 0.05, 0); // counter overhang
  for (const sx of [-1, 1]) { k.b(w / 2 - 0.12, h - 0.25, 0.012, sh(color, 0.07), sx * (w / 4 - 0.01), 0.14, d / 2 - 0.05); k.b(0.02, 0.14, 0.014, BRASS, sx * 0.04, 0.55, d / 2 - 0.04, { mt: 0.5 }); }
  k.b(0.3, 0.012, 0.18, '#8a6a48', w / 2 - 0.3, h - 0.012, 0.0); // board on the counter
}
function hamper(k, { w, d, h, color }) {
  k.ce(w * 0.92, d * 0.92, h - 0.07, color, 0, 0, 0, 8); for (const y of [0.1, 0.24, 0.38]) k.ce(w * 0.94, d * 0.94, 0.025, sh(color, -0.1), 0, y, 0, 8);
  k.ce(w, d, 0.04, sh(color, 0.07), 0, h - 0.07, 0, 8); k.ce(w * 0.9, d * 0.9, 0.03, '#f1ece0', 0, h - 0.03, 0, 8); // lid
}
function bathmat(k, { w, d, color }) { k.b(w, 0.016, d, color, 0, 0, 0); k.b(w - 0.1, 0.002, d - 0.1, sh(color, 0.12), 0, 0.016, 0); for (const z of [-0.2, 0, 0.2]) k.b(w - 0.18, 0.002, 0.05, color, 0, 0.018, z); }
function bcab(k, { w, d, h, color }) {
  k.b(w - 0.04, 0.06, d - 0.06, '#9aa0a6', 0, 0, 0); k.b(w, h - 0.06, d - 0.02, color, 0, 0.06, -0.01);
  k.b(w - 0.08, 0.7, 0.012, '#cfe3ee', 0, 0.84, d / 2 - 0.015, { mt: 0.4, r: 0.2 }); k.b(0.05, 0.6, 0.014, '#e8f3f8', -0.1, 0.89, d / 2 - 0.014, { r: 0.2 }); // mirror door
  for (const sx of [-1, 1]) { k.b(w / 2 - 0.05, 0.55, 0.012, sh(color, -0.05), sx * (w / 4 - 0.005), 0.2, d / 2 - 0.015); k.b(0.02, 0.1, 0.012, STEEL, sx * 0.04, 0.58, d / 2 - 0.005, { mt: 0.5 }); }
  k.b(0.2, 0.012, 0.012, STEEL, 0, 1.25, d / 2 - 0.005, { mt: 0.5 });
}
function washer(k, { w, d, h, color }) {
  k.b(w, h - 0.03, d - 0.01, color, 0, 0, -0.005); k.b(w, 0.03, d - 0.01, '#c5cad1', 0, h - 0.03, -0.005);
  k.b(w - 0.1, 0.1, 0.01, DARK, 0, h - 0.16, d / 2 - 0.01); k.c(0.025, 0.025, 0.01, STEEL, 0.12, h - 0.14, d / 2 - 0.005, 10, { rx: Math.PI / 2 });
  k.cz(0.012, 0.21, '#9aa0a6', 0, 0.37, d / 2 - 0.004, 20); k.cz(0.016, 0.16, '#6a8fa8', 0, 0.37, d / 2 - 0.001, 20, { op: 0.8, r: 0.2 });
}
function tub(k, { w, d, h, color }) {
  const f = h - 0.08; for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.c(0.05, 0.04, 0.08, BRASS, sx * (w / 2 - 0.15), 0, sz * (d / 2 - 0.12), 8, { mt: 0.5 });
  for (const sz of [-1, 1]) k.b(w, f, 0.09, color, 0, 0.08, sz * (d / 2 - 0.045)); for (const sx of [-1, 1]) k.b(0.09, f, d - 0.18, color, sx * (w / 2 - 0.045), 0.08, 0);
  k.b(w - 0.18, 0.06, d - 0.18, '#e2e7ec', 0, 0.08, 0); k.b(w - 0.2, 0.008, d - 0.2, '#9fd2e8', 0, 0.38, 0, { op: 0.75, r: 0.2 });
  for (const sz of [-1, 1]) k.b(w, 0.02, 0.13, sh(color, -0.05), 0, h - 0.02, sz * (d / 2 - 0.065)); for (const sx of [-1, 1]) k.b(0.13, 0.02, d - 0.26, sh(color, -0.05), sx * (w / 2 - 0.065), h - 0.02, 0);
  k.c(0.02, 0.02, 0.09, STEEL, w / 2 - 0.1, h - 0.1, 0, 8, { mt: 0.6 }); k.cx(0.14, 0.014, STEEL, w / 2 - 0.17, h - 0.03, 0, 8, { mt: 0.6 });
}
function sofa(k, { id, w, d, h, color, tier: t }) {
  if (id === 'sectional') { // L-shaped leather sectional with a chaise on the right
    const lg = 0.1, md = 1.0, cw = 1.0, aw = 0.18, c2 = sh(color, 0.06), seat = lg + 0.22;
    for (const [x, z] of [[-w / 2 + 0.12, -d / 2 + 0.12], [w / 2 - 0.12, -d / 2 + 0.12], [-w / 2 + 0.12, -d / 2 + md - 0.12], [w / 2 - cw + 0.12, d / 2 - 0.12], [w / 2 - 0.12, d / 2 - 0.12]]) k.c(0.03, 0.03, lg, STEEL, x, 0, z, 6, { mt: 0.6 });
    k.b(w, 0.22, md, sh(color, -0.05), 0, lg, -d / 2 + md / 2); k.b(cw, 0.22, d - md, sh(color, -0.05), w / 2 - cw / 2, lg, -d / 2 + md + (d - md) / 2);
    k.b(aw, 0.46, md, color, -w / 2 + aw / 2, lg, -d / 2 + md / 2); k.b(0.16, 0.42, d, color, w / 2 - 0.08, lg, 0);
    k.b(w - aw, h - seat, 0.2, color, aw / 2, seat, -d / 2 + 0.1); // back (top = h)
    const mw = w - aw - cw; for (let i = 0; i < 2; i++) k.b(mw / 2 - 0.02, 0.12, md - 0.22, c2, -w / 2 + aw + mw / 4 + (i * mw) / 2, seat, -d / 2 + 0.2 + (md - 0.22) / 2);
    k.b(cw - 0.18, 0.12, d - 0.21, c2, w / 2 - cw / 2 - 0.08, seat, -d / 2 + 0.2 + (d - 0.21) / 2); // chaise cushion
    for (let i = 0; i < 3; i++) k.b((w - aw - 0.16) / 3 - 0.04, 0.3, 0.12, c2, -w / 2 + aw + 0.02 + ((w - aw - 0.16) / 3) * (i + 0.5), seat + 0.12, -d / 2 + 0.26);
    k.b(0.34, 0.34, 0.1, '#d9b44a', -w / 2 + aw + 0.28, seat + 0.12, -d / 2 + 0.4); k.b(0.34, 0.3, 0.1, '#3e6a9e', w / 2 - 0.45, seat + 0.12, -d / 2 + 0.4); return;
  }
  const P = [{ lg: 0.1, base: 0.16, arm: 0.08, back: 0.1, n: 1 }, { lg: 0.1, base: 0.2, arm: 0.13, back: 0.16, n: 2 }, { lg: 0.12, base: 0.22, arm: 0.16, back: 0.2, n: 3 }][t - 1] || { lg: 0.12, base: 0.22, arm: 0.16, back: 0.2, n: 3 };
  const { lg, base, arm: aw, back: bt, n } = P, seat = lg + base, c2 = sh(color, 0.07), iw = w - 2 * aw;
  if (t === 1) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(0.06, lg, 0.06, WOOD, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08)); } else for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.c(0.025, 0.02, lg, t >= 3 ? DARK : WOOD, sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1), 6);
  k.b(w, base, d, sh(color, -0.05), 0, lg, 0); for (const sx of [-1, 1]) k.b(aw, base + (t === 1 ? 0.12 : 0.22), d, t === 1 ? WOOD : color, sx * (w / 2 - aw / 2), lg, 0);
  k.b(iw, h - seat, bt, t === 1 ? c2 : color, 0, seat, -d / 2 + bt / 2); // back (top = h)
  const cwid = iw / n; for (let i = 0; i < n; i++) k.b(cwid - 0.02, t === 1 ? 0.1 : 0.12, d - bt - 0.01, c2, -iw / 2 + cwid * (i + 0.5), seat, (bt - 0.01) / 2);
  if (t >= 2) for (let i = 0; i < n; i++) k.b(cwid - 0.05, Math.min(0.3, h - seat - 0.16), 0.12, sh(color, 0.11), -iw / 2 + cwid * (i + 0.5), seat + 0.12, -d / 2 + bt + 0.06);
  if (t >= 3) { for (const sx of [-1, 1]) k.b(aw + 0.01, 0.03, d, sh(color, -0.08), sx * (w / 2 - aw / 2), lg + base + 0.22, 0); k.b(0.34, 0.32, 0.1, '#d9b44a', iw / 2 - 0.25, seat + 0.12, -d / 2 + bt + 0.2); }
}
function beanbag(k, { w, d, h, color }) {
  k.s(w, h, d, color, 0, 0, 0, { r: 0.95 }); k.s(w * 0.5, h * 0.18, d * 0.5, sh(color, -0.1), 0, h * 0.7, 0, { r: 0.95 }); k.b(0.14, 0.04, 0.03, sh(color, 0.15), w * 0.3, h * 0.55, -d * 0.2); // dimple + carry handle
}
function armchair(k, { id, w, d, h, color, tier: t }) {
  const c3 = sh(color, 0.08);
  if (id === 'lounge') { // wooden-framed leather lounge chair
    const wd = '#6a4a33'; for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.c(0.022, 0.032, 0.3, wd, sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07), 6);
    k.b(w, 0.06, d, wd, 0, 0.3, 0); k.b(w - 0.2, 0.16, d - 0.24, color, 0, 0.36, 0.08); k.b(w - 0.1, h - 0.4, 0.16, color, 0, 0.4, -d / 2 + 0.08); k.b(w - 0.3, 0.14, 0.2, c3, 0, h - 0.14, -d / 2 + 0.12);
    for (const sx of [-1, 1]) { k.b(0.07, 0.03, d - 0.1, wd, sx * (w / 2 - 0.035), 0.5, 0); k.b(0.05, 0.14, 0.05, wd, sx * (w / 2 - 0.035), 0.36, 0.1); } return;
  }
  const lg = 0.1, base = 0.26, seat = lg + base, aw = id === 'recliner' ? 0.2 : 0.18;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(0.06, lg, 0.06, '#3d2a1d', sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1));
  k.b(w, base, d, sh(color, -0.04), 0, lg, 0); for (const sx of [-1, 1]) k.b(aw, 0.24 + (t >= 3 ? 0.04 : 0), d, color, sx * (w / 2 - aw / 2), seat, 0);
  k.b(w, h - seat, 0.2, color, 0, seat, -d / 2 + 0.1); k.b(w - 2 * aw, 0.13, d - 0.3, c3, 0, seat, 0.08); k.b(w - 2 * aw - 0.04, 0.3, 0.1, c3, 0, seat + 0.13, -d / 2 + 0.25);
  if (id === 'recliner') { k.b(w - 2 * aw, 0.2, 0.28, sh(color, -0.08), 0, lg + 0.04, d / 2 - 0.14); k.b(w - 2 * aw - 0.1, 0.22, 0.12, c3, 0, h - 0.34, -d / 2 + 0.22); k.b(0.05, 0.05, 0.1, DARK, w / 2 - 0.05, seat + 0.04, d / 2 - 0.1); }
}
function ctable(k, { id, w, d, h, color }) {
  if (id === 'coffee_marble') { k.b(w, 0.04, d, color, 0, h - 0.04, 0, { r: 0.35 }); k.b(w, 0.012, 0.012, BRASS, 0, h - 0.052, d / 2 - 0.006, { mt: 0.6 }); for (const sx of [-1, 1]) k.c(0.13, 0.15, h - 0.04, BRASS, sx * (w / 2 - 0.3), 0, 0, 8, { mt: 0.5, r: 0.4 }); k.b(0.25, 0.002, 0.04, '#b8b4ac', -0.2, h - 0.002, 0.1); k.b(0.2, 0.002, 0.03, '#b8b4ac', 0.25, h - 0.002, -0.12); return; }
  k.b(w, 0.04, d, color, 0, h - 0.04, 0); k.b(w - 0.16, 0.025, d - 0.12, sh(color, -0.06), 0, 0.1, 0); legs4(k, w, d, h - 0.04, 0.05, '#2d2118', 0.06); k.c(0.07, 0.06, 0.08, '#e8d9a8', w / 2 - 0.22, 0.125, 0.0, 10);
}
function stable(k, { w, d, h, color }) { k.ce(w, d, 0.03, color, 0, h - 0.03, 0, 20); k.c(0.03, 0.03, h - 0.06, '#3d2f22', 0, 0.03, 0, 8); k.c(0.18, 0.2, 0.03, '#3d2f22', 0, 0, 0, 16); }
function tv(k, { w, d, h, color, tier: t }) {
  const sy = [0.26, 0.3, 0.34, 0.36][t - 1], stand = ['#8f6f4e', '#6b4f36', '#3b3f46', '#e8e4dc'][t - 1], pw = w - 0.08, y0 = sy + 0.04;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(0.05, 0.08, 0.05, sh(stand, -0.2), sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.05));
  k.b(w, sy - 0.08, d, stand, 0, 0.08, 0); k.b(w / 2 - 0.1, sy - 0.16, 0.012, sh(stand, -0.08), -w / 4, 0.12, d / 2 - 0.005); k.b(w / 2 - 0.1, sy - 0.16, 0.012, sh(stand, -0.08), w / 4, 0.12, d / 2 - 0.005);
  k.b(0.18, 0.04, 0.1, DARK, 0, sy, -0.04); k.b(pw, h - y0, 0.05, color, 0, y0, -0.04); k.b(pw - 0.05, h - y0 - 0.05, 0.01, '#14263a', 0, y0 + 0.025, -0.012, { e: '#0d2540', ei: 0.4, r: 0.25 }); k.b((pw - 0.05) * 0.28, h - y0 - 0.05, 0.011, '#223c5a', pw * 0.18, y0 + 0.025, -0.011, { e: '#0d2540', ei: 0.4, r: 0.25 });
  if (t >= 3) k.b(pw * 0.6, 0.06, 0.1, '#0c0d10', 0, sy, d / 2 - 0.1);
}
function audio(k, { id, w, d, h, color }) {
  if (id === 'turntable') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.c(0.02, 0.03, 0.3, color, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.07), 6);
    k.b(w, 0.45, d - 0.01, color, 0, 0.3, -0.005); k.b(w - 0.1, 0.06, d - 0.06, DARK, 0, 0.75, 0); k.b(w - 0.1, 0.1, 0.06, color, 0, 0.75, -d / 2 + 0.05);
    k.c(0.15, 0.15, 0.02, '#16181c', -0.2, 0.81, 0.02, 20); k.c(0.12, 0.12, 0.004, '#c25b5b', -0.2, 0.83, 0.02, 20); k.rod([0.0, 0.835, -0.1], [-0.12, 0.832, 0.08], 0.006, STEEL, { mt: 0.6 });
    for (const sx of [-1, 1]) k.b(0.34, 0.3, 0.01, '#c9b79a', sx * 0.28, 0.36, d / 2 - 0.01); k.b(0.18, 0.04, 0.01, '#14161a', 0, 0.6, d / 2 - 0.01); k.c(0.025, 0.025, 0.01, BRASS, 0.07, 0.62, d / 2 - 0.005, 8, { rx: Math.PI / 2, mt: 0.5 }); return;
  }
  k.b(w, h - 0.03, d - 0.02, color, 0, 0, -0.01); k.b(w, 0.03, d - 0.02, '#8a5a36', 0, h - 0.03, -0.01);
  for (const sx of [-1, 1]) k.cz(0.012, 0.15, '#14161a', sx * 0.22, 0.35, d / 2 - 0.016, 18); k.b(0.3, 0.05, 0.01, '#4ae0d0', 0, 0.56, d / 2 - 0.005, { e: '#4ae0d0', ei: 0.8 });
}
function game(k, { id, w, d, h, color }) {
  if (id === 'pool') {
    const wood = '#6a4a33', rail = '#4a3322', fy = 0.78; for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(0.14, 0.62, 0.14, wood, sx * (w / 2 - 0.2), 0, sz * (d / 2 - 0.15));
    k.b(w - 0.2, 0.08, d - 0.2, sh(wood, -0.1), 0, 0.52, 0); k.b(w, 0.18, d, wood, 0, 0.6, 0); k.b(w - 0.24, 0.012, d - 0.24, color, 0, fy, 0); // cabinet + felt
    for (const sz of [-1, 1]) { k.b(w, 0.07, 0.12, rail, 0, fy, sz * (d / 2 - 0.06)); k.b(w - 0.24, 0.03, 0.04, sh(color, -0.1), 0, fy + 0.012, sz * (d / 2 - 0.14)); }
    for (const sx of [-1, 1]) { k.b(0.12, 0.07, d - 0.24, rail, sx * (w / 2 - 0.06), fy, 0); k.b(0.04, 0.03, d - 0.24, sh(color, -0.1), sx * (w / 2 - 0.14), fy + 0.012, 0); }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) k.c(0.06, 0.06, 0.004, '#0b0b0d', x * (w / 2 - 0.14), fy + 0.012, z * (d / 2 - 0.12), 10);
    [['#f2c200', 0.5, 0], ['#c0392b', 0.56, 0.03], ['#2f6fb3', 0.56, -0.03], ['#e8e4dc', -0.7, 0], ['#14161a', 0.62, 0], ['#2fb37a', 0.62, 0.06], ['#8e44ad', 0.62, -0.06], ['#e67e22', 0.5, 0.06]].forEach(([c, x, z]) => k.s(0.056, 0.056, 0.056, c, x, fy + 0.012, z, { r: 0.3, lo: true }));
    return;
  }
  if (id === 'foosball') {
    const wood = '#6a4a33'; for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(0.07, 0.65, 0.07, '#3a3f47', sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08));
    for (const sz of [-1, 1]) k.b(w, 0.25, 0.06, wood, 0, 0.65, sz * (d / 2 - 0.03)); for (const sx of [-1, 1]) k.b(0.06, 0.25, d - 0.12, wood, sx * (w / 2 - 0.03), 0.65, 0);
    k.b(w - 0.12, 0.2, d - 0.12, color, 0, 0.65, 0); for (let i = 0; i < 4; i++) { const x = -0.48 + i * 0.32; k.cz(d, 0.012, STEEL, x, 0.87, 0, 6, { mt: 0.6 }); for (const z of i % 2 ? [-0.15, 0.15] : [-0.22, 0, 0.22]) k.b(0.035, 0.1, 0.03, i < 2 ? '#c0392b' : '#2f6fb3', x, 0.77, z); for (const sz of [-1, 1]) k.b(0.045, 0.04, 0.09, DARK, x, 0.85, sz * (d / 2 - 0.05)); }
    return;
  }
  // arcade cabinet
  const bw = w - 0.02; k.b(bw, 0.78, d, color, 0, 0, 0); for (const sx of [-1, 1]) k.b(0.012, 0.78, d - 0.2, '#e0426a', sx * (w / 2 - 0.006), 0, -0.05);
  k.b(bw, 0.06, 0.4, '#1d1d2b', 0, 0.78, d / 2 - 0.2); k.c(0.012, 0.012, 0.09, STEEL, -0.15, 0.84, d / 2 - 0.2, 6); k.s(0.05, 0.05, 0.05, '#c0392b', -0.15, 0.93, d / 2 - 0.2, { lo: true }); for (let i = 0; i < 3; i++) k.c(0.022, 0.022, 0.015, ['#f2c200', '#2fb37a', '#2f6fb3'][i], 0.0 + i * 0.07, 0.84, d / 2 - 0.2, 10);
  k.b(bw, 0.74, 0.55, color, 0, 0.84, -d / 2 + 0.275); k.b(bw - 0.12, 0.5, 0.012, '#0b1c33', 0, 0.96, -d / 2 + 0.556, { e: '#2a6adf', ei: 0.6, r: 0.2 }); k.b(bw, 0.2, 0.55, '#ffcf3f', 0, h - 0.2, -d / 2 + 0.275, { e: '#ffcf3f', ei: 0.7 }); k.b(bw - 0.14, 0.1, 0.012, color, 0, h - 0.15, -d / 2 + 0.556);
  k.b(0.08, 0.03, 0.012, '#f2c200', 0.2, 0.62, d / 2 - 0.006);
}
function mat(k, { w, d, h, color }) { k.b(w, h - 0.004, d, color, 0, 0, 0); k.b(0.02, 0.004, d - 0.12, sh(color, 0.22), 0, h - 0.004, 0); k.b(w - 0.12, 0.004, 0.02, sh(color, 0.22), 0, h - 0.004, d / 2 - 0.12); }
function weights(k, { id, w, d, h, color }) {
  if (id === 'bench') {
    const x0 = -w / 2 + 0.35, len = w - 0.35, mx = x0 + len / 2, bx0 = -w / 2 + 0.15;
    k.b(len, 0.08, 0.3, color, mx, 0.38, 0); k.b(len - 0.1, 0.04, 0.08, DARK, mx, 0.34, 0); for (const x of [x0 + 0.15, w / 2 - 0.15]) { k.b(0.06, 0.04, 0.5, DARK, x, 0, 0); k.b(0.04, 0.3, 0.04, DARK, x, 0.04, 0); }
    k.b(0.06, 0.04, d, DARK, bx0, 0, 0); for (const sz of [-1, 1]) k.b(0.05, 0.9, 0.05, DARK, bx0, 0.04, sz * 0.2); // squat uprights
    k.cz(d, 0.015, STEEL, bx0, 0.95, 0, 8, { mt: 0.6 }); for (const sz of [-1, 1]) { k.cz(0.04, 0.15, DARK, bx0, 0.95, sz * (d / 2 - 0.05), 14); k.cz(0.046, 0.1, '#c0392b', bx0, 0.95, sz * (d / 2 - 0.05), 14); }
    return;
  }
  for (const sx of [-1, 1]) k.b(0.04, h, d, DARK, sx * (w / 2 - 0.02), 0, 0); for (const y of [0.17, 0.43]) k.b(w - 0.08, 0.03, d, sh(DARK, 0.08), 0, y, 0); k.b(w, 0.04, d, DARK, 0, h - 0.04, 0);
  [0.17, 0.43].forEach((y, row) => { for (let i = 0; i < 5; i++) { const r = 0.045 + (row ? 0.02 : 0) + i * 0.007, x = -0.24 + i * 0.12; k.cx(0.1, 0.012, STEEL, x, y + 0.03 + r, 0, 6, { mt: 0.6 }); for (const sx of [-1, 1]) k.cx(0.035, r, row ? '#c0392b' : '#3a6fb0', x + sx * 0.03, y + 0.03 + r, 0, 12); } });
}
function cardio(k, { id, w, d, h, color }) {
  if (id === 'treadmill') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(0.08, 0.05, 0.08, DARK, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06));
    k.b(w, 0.14, d, color, 0, 0.05, 0); k.b(w - 0.26, 0.015, d - 0.55, '#111316', 0, 0.19, -0.12); for (const sx of [-1, 1]) k.b(0.1, 0.03, d - 0.3, sh(color, 0.22), sx * (w / 2 - 0.05), 0.19, -0.05);
    k.b(w, 0.28, 0.3, color, 0, 0.19, d / 2 - 0.15); for (const sx of [-1, 1]) { k.b(0.05, 0.98, 0.05, DARK, sx * (w / 2 - 0.08), 0.19, d / 2 - 0.2); k.b(0.04, 0.04, 0.65, STEEL, sx * (w / 2 - 0.08), 0.95, d / 2 - 0.2 - 0.325, { mt: 0.5 }); }
    k.b(w - 0.1, 0.12, 0.08, '#1a1c20', 0, 1.18, d / 2 - 0.2); k.b(w - 0.3, 0.07, 0.01, '#4ae0d0', 0, 1.2, d / 2 - 0.2 + 0.044, { e: '#4ae0d0', ei: 0.7 }); return;
  }
  const fz = d / 2 - 0.2; // exercise bike, front = +z
  for (const z of [-1, 1]) k.b(w, 0.05, 0.08, DARK, 0, 0, z * (d / 2 - 0.04)); k.b(0.08, 0.08, d - 0.3, color, 0, 0.22, 0); k.b(0.07, 0.78, 0.07, color, 0, 0.05, fz); k.b(0.05, 0.5, 0.05, color, 0, 0.22, -0.2);
  k.b(0.24, 0.07, 0.22, DARK, 0, 0.72, -0.25); k.cx(0.07, 0.2, '#8a8f98', 0, 0.26, fz, 18); for (const sx of [-1, 1]) k.b(0.1, 0.03, 0.07, DARK, sx * 0.2, 0.2, fz);
  k.b(0.05, 0.17, 0.05, color, 0, 0.83, fz); k.b(0.4, 0.04, 0.05, DARK, 0, 1.0, fz); k.b(0.2, 0.1, 0.06, '#1a1c20', 0, 1.0, fz - 0.05);
}
function desk(k, { w, d, h, color }) {
  const wd = sh(color, -0.18); k.b(w, 0.035, d, color, 0, h - 0.04, 0); k.b(0.5, 0.005, 0.32, '#3a3f47', -0.2, h - 0.005, 0.05);
  k.b(0.04, h - 0.04, d - 0.08, wd, -w / 2 + 0.05, 0, 0); k.b(0.34, h - 0.04, d - 0.08, wd, w / 2 - 0.2, 0, 0); k.b(w - 0.5, 0.35, 0.02, wd, -0.1, 0.3, -d / 2 + 0.05);
  for (let i = 0; i < 2; i++) { k.b(0.3, 0.2, 0.012, color, w / 2 - 0.2, 0.08 + i * 0.28, d / 2 - 0.034); k.b(0.1, 0.02, 0.012, DARK, w / 2 - 0.2, 0.17 + i * 0.28, d / 2 - 0.006); }
}
function shelf(k, { w, d, h, color }) {
  const n = 5, th = 0.03, step = (h - th) / n, bc = ['#a3312f', '#223458', '#3e5b43', '#d8cdb4', '#8e6bd8', '#c98a2a', '#3a8fb7'];
  k.b(w, h, 0.02, sh(color, -0.12), 0, 0, -d / 2 + 0.01); for (const sx of [-1, 1]) k.b(th, h, d, color, sx * (w / 2 - th / 2), 0, 0); for (let i = 0; i <= n; i++) k.b(w - 2 * th, th, d - 0.02, sh(color, 0.04), 0, i * step, 0.01);
  for (let r = 0; r < n; r++) { let x = -w / 2 + th + 0.03, j = 0; while (x < w / 2 - th - 0.14) { const bw = 0.04 + ((r * 7 + j * 3) % 4) * 0.012, bh = 0.2 + ((r * 3 + j * 5) % 5) * 0.018; if ((r === 1 || r === 3) && j > 4 && j < 7) { x += 0.1; j++; continue; } k.b(bw, bh, 0.22, bc[(r + j * 2) % bc.length], x + bw / 2, r * step + th, 0.0); x += bw + 0.004; j++; } }
  k.b(0.14, 0.12, 0.14, '#e8e4dc', w / 2 - 0.25, 1 * step + th, 0.0); k.b(0.14, 0.12, 0.14, '#c98a2a', -w / 2 + 0.3, 3 * step + th, 0.0);
}
function easel(k, { w, d, h, color }) {
  for (const sx of [-1, 1]) k.b(0.04, h - 0.1, 0.04, color, sx * (w / 2 - 0.02), 0, d / 2 - 0.02); k.b(0.04, h - 0.25, 0.04, color, 0, 0, -d / 2 + 0.02); k.b(0.04, 0.04, d - 0.04, color, 0, 1.2, -0.0);
  k.b(w - 0.08, 0.04, 0.04, sh(color, -0.1), 0, h - 0.1, d / 2 - 0.02); k.b(0.14, 0.06, 0.05, DARK, 0, h - 0.06, d / 2 - 0.025); k.b(w - 0.08, 0.03, 0.05, color, 0, 0.5, d / 2 - 0.025); k.b(w - 0.08, 0.03, 0.04, sh(color, -0.1), 0, 0.5 + 0.03, d / 2 - 0.02);
  k.b(0.5, 0.55, 0.02, '#f4efe4', 0, 0.56, d / 2 - 0.045); k.b(0.44, 0.24, 0.004, '#7fb7d9', 0, 0.9, d / 2 - 0.033); k.b(0.44, 0.15, 0.004, '#4c8a46', 0, 0.6, d / 2 - 0.033); k.b(0.08, 0.08, 0.005, '#f2c200', 0.12, 0.98, d / 2 - 0.031);
}
function piano(k, { w, d, h, color }) {
  for (const sx of [-1, 1]) k.b(0.1, 0.72, d - 0.1, color, sx * (w / 2 - 0.05), 0, -0.0); k.b(w - 0.2, 0.1, d, color, 0, 0.72, 0); k.b(w - 0.2, 0.08, 0.12, color, 0, 0.82, -d / 2 + 0.06);
  const kw = w - 0.3, ow = kw / 3, ww = ow / 7; k.b(kw, 0.014, 0.2, '#f4efe4', 0, 0.82, d / 2 - 0.14); for (let o = 0; o < 3; o++) for (const i of [1, 2, 4, 5, 6]) k.b(0.016, 0.016, 0.12, '#101114', -kw / 2 + o * ow + i * ww, 0.834, d / 2 - 0.2);
  k.b(0.3, 0.02, 0.1, '#2b2e33', w / 2 - 0.3, 0.82, -d / 2 + 0.2); k.b(0.05, 0.01, 0.05, '#4ae0d0', w / 2 - 0.35, 0.84, -d / 2 + 0.2, { e: '#4ae0d0', ei: 0.8 }); k.b(0.4, 0.03, 0.1, DARK, 0, 0.05, d / 2 - 0.15); k.b(0.04, 0.05, 0.04, DARK, 0, 0.0, d / 2 - 0.15);
}
function lamp(k, { id, w, d, h, color }) {
  const glow = { e: '#ffe2a0', ei: 0.9, op: 0.95 };
  if (id === 'lamp_paper') { k.c(0.12, 0.14, 0.03, DARK, 0, 0, 0); k.c(0.012, 0.012, 0.6, DARK, 0, 0.03, 0, 6); k.s(w, 0.55, d, color, 0, h - 0.55, 0, { e: '#ffe2a0', ei: 0.7 }); k.c(0.06, 0.06, 0.02, DARK, 0, h - 0.025, 0, 8); return; }
  if (id === 'lamp_tripod') {
    for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i * 2 * Math.PI) / 3; k.rod([0.27 * Math.cos(a), 0, 0.27 * Math.sin(a)], [0, 1.12, 0], 0.014, '#8a6a48'); }
    k.c(0.02, 0.02, 0.25, DARK, 0, 1.12, 0, 6); k.c(0.22, w / 2, 0.3, color, 0, 1.35, 0, 20, glow); return;
  }
  if (id === 'lamp_arc') {
    k.b(0.4, 0.08, d, '#e6e2da', -w / 2 + 0.2, 0, 0, { r: 0.35 }); const P = [[-0.275, 0.08], [-0.275, 1.5], [-0.22, 1.8], [-0.08, 1.95], [0.12, 1.985], [0.3, 1.9], [0.325, 1.78]];
    for (let i = 0; i < P.length - 1; i++) k.rod([P[i][0], P[i][1], 0], [P[i + 1][0], P[i + 1][1], 0], 0.015, DARK, { mt: 0.5 }); k.c(0.07, 0.15, 0.28, color, 0.325, 1.5, 0, 16, glow); return;
  }
  k.c(0.18, 0.2, 0.04, DARK, 0, 0, 0, 14); k.c(0.02, 0.02, 1.42, DARK, 0, 0.04, 0, 6); k.c(0.14, 0.2, 0.28, color, 0, h - 0.28, 0, 16, glow);
}
function hearth(k, { w, d, h, color }) {
  const fw = w * 0.64, pw = (w - fw) / 2, fz = d / 2 - 0.06; // 0.12 m deep surround around a recessed firebox
  k.b(w, h - 0.06, d - 0.12, sh(color, -0.1), 0, 0, -0.06); k.b(w, 0.16, 0.12, color, 0, 0, d / 2 - 0.06); k.b(w, 0.19, 0.12, color, 0, 0.6, d / 2 - 0.06); for (const sx of [-1, 1]) k.b(pw, 0.44, 0.12, color, sx * (fw / 2 + pw / 2), 0.16, d / 2 - 0.06);
  k.b(w, 0.06, d, '#e8e4dc', 0, h - 0.06, 0); k.b(fw, 0.44, 0.006, '#14100e', 0, 0.16, d / 2 - 0.123); k.cx(0.5, 0.035, '#5b3d2a', 0, 0.2, fz, 8); k.b(0.5, 0.02, 0.06, '#ff7a2f', 0, 0.17, fz, { e: '#ff7a2f', ei: 1 });
  [[-0.14, 0.18], [0, 0.26], [0.14, 0.16]].forEach(([x, fh]) => k.cone(0.05, fh, '#ffb02e', x, 0.22, fz - 0.01, 5, { e: '#ff8a1e', ei: 1 })); k.b(fw, 0.44, 0.004, '#aaccee', 0, 0.16, d / 2 - 0.002, { op: 0.22, r: 0.1 });
  for (const sx of [-1, 1]) k.b(0.012, 0.3, 0.006, sh(color, 0.15), sx * (fw / 2 + pw / 2), 0.23, d / 2 + 0.0 - 0.003); // vent slots on the pillars
}
function plant(k, { id, w, d, h, color }) {
  const l2 = sh(color, 0.08), pot = '#8a5a36';
  if (id === 'plant_pothos') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.b(0.025, 0.34, 0.025, WOOD, sx * 0.13, 0, sz * 0.13); k.b(0.3, 0.02, 0.3, WOOD, 0, 0.34, 0); k.c(0.13, 0.1, 0.2, '#e8e0d0', 0, 0.36, 0, 12); k.ico(w, 0.3, d, color, 0, 0.45, 0);
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + 0.3, x = 0.16 * Math.cos(a), z = 0.16 * Math.sin(a); k.b(0.02, 0.26 + (i % 3) * 0.04, 0.02, l2, x, 0.3 - (i % 3) * 0.04, z); k.ico(0.09, 0.07, 0.09, l2, x, 0.26 - (i % 3) * 0.04, z); } return;
  }
  if (id === 'plant_palm') {
    k.c(0.2, 0.16, 0.3, '#b8a58a', 0, 0, 0, 12); k.c(0.17, 0.17, 0.01, '#3b2a1d', 0, 0.3, 0, 12); k.rod([0, 0.3, 0], [0, 1.62, 0], 0.02, '#5b4330');
    for (let i = 0; i < 6; i++) { const a = (i * 2 * Math.PI) / 6, tx = 0.12 * Math.cos(a), tz = 0.12 * Math.sin(a), ty = 1.3 + (i % 2) * 0.12; k.rod([0, 0.4, 0], [tx, ty, tz], 0.012, '#5b8a46'); k.ico(0.3, 0.09, 0.16, i % 2 ? l2 : color, 0.2 * Math.cos(a) - 0.0, ty - 0.02, 0.2 * Math.sin(a), { ry: -a }); }
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; k.rod([0, 0.4, 0], [0.18 * Math.cos(a), 0.92, 0.18 * Math.sin(a)], 0.011, '#5b8a46'); k.ico(0.3, 0.08, 0.16, i % 2 ? color : l2, 0.25 * Math.cos(a), 0.9, 0.25 * Math.sin(a), { ry: -a }); }
    k.ico(0.34, 0.2, 0.34, l2, 0, 1.6, 0); return;
  }
  if (id === 'plant_tree') {
    k.c(0.28, 0.22, 0.4, '#c9c3b4', 0, 0, 0, 12); k.c(0.25, 0.25, 0.01, '#3b2a1d', 0, 0.4, 0, 12); k.c(0.04, 0.06, 1.0, '#6b5846', 0, 0.4, 0, 7);
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.4; k.rod([0, 1.1, 0], [0.16 * Math.cos(a), 1.5, 0.16 * Math.sin(a)], 0.018, '#6b5846'); }
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; k.ico(0.45, 0.4, 0.45, i % 2 ? color : l2, 0.225 * Math.cos(a), 1.15 + (i % 2) * 0.3, 0.225 * Math.sin(a)); }
    k.ico(0.55, 0.5, 0.55, l2, 0, 1.5, 0); return;
  }
  k.c(0.22, 0.17, 0.34, pot, 0, 0, 0, 12); k.c(0.2, 0.2, 0.01, '#3b2a1d', 0, 0.34, 0, 12); k.c(0.025, 0.035, 0.7, '#5b4330', 0, 0.34, 0, 6);
  k.ico(w, 0.38, d, color, 0, 0.6, 0); k.ico(w * 0.84, 0.36, d * 0.84, l2, 0, 0.86, 0); k.ico(w * 0.55, 0.28, d * 0.55, color, 0, 1.02, 0);
}
function mirror(k, { w, d, h, color }) {
  for (const sx of [-1, 1]) k.b(0.06, 0.04, d, DARK, sx * (w / 2 - 0.08), 0, 0); k.b(w, h - 0.04, 0.04, color, 0, 0.04, 0); k.b(w - 0.08, h - 0.12, 0.01, '#cfe3ee', 0, 0.08, 0.025, { mt: 0.4, r: 0.2 }); k.b(0.05, h - 0.32, 0.011, '#e8f3f8', -0.12, 0.2, 0.025, { r: 0.2 }); k.b(0.04, 0.9, 0.04, color, 0, 0.2, -0.055);
}
function aquarium(k, { w, d, h, color }) {
  const cab = sh(color, -0.3); k.b(w, 0.6, d - 0.01, cab, 0, 0, -0.005); for (const sx of [-1, 1]) k.b(w / 2 - 0.08, 0.46, 0.012, sh(cab, 0.07), sx * (w / 4), 0.07, d / 2 - 0.011); for (const sx of [-1, 1]) k.b(0.02, 0.1, 0.012, BRASS, sx * 0.04, 0.38, d / 2 - 0.006);
  k.b(w, 0.03, d, DARK, 0, 0.6, 0); k.b(w - 0.04, 0.41, d - 0.04, '#9fd8ee', 0, 0.63, 0, { op: 0.35, r: 0.1 }); k.b(w - 0.08, 0.04, d - 0.08, '#e8d9a8', 0, 0.63, 0);
  k.ico(0.22, 0.12, 0.16, '#8a8f98', -0.3, 0.66, 0.02); k.ico(0.16, 0.09, 0.12, '#6f7378', 0.25, 0.66, -0.05); for (const [x, z, hh] of [[-0.4, -0.05, 0.28], [0.38, 0.05, 0.22], [0.0, -0.1, 0.3]]) { k.rod([x, 0.67, z], [x + 0.03, 0.67 + hh, z], 0.012, '#4c8a46'); k.ico(0.1, 0.06, 0.06, '#4c8a46', x + 0.03, 0.62 + hh, z); }
  k.s(0.1, 0.05, 0.03, '#f08a24', 0.1, 0.85, 0.05, { lo: true }); k.s(0.08, 0.045, 0.03, '#f2c200', -0.2, 0.95, -0.05, { lo: true }); k.s(0.07, 0.04, 0.03, '#f08a24', 0.3, 0.78, 0.0, { lo: true });
  k.b(w, 0.05, d, DARK, 0, h - 0.05, 0); k.b(w - 0.2, 0.01, d - 0.2, '#fff7d6', 0, h - 0.06, 0, { e: '#fff7d6', ei: 0.9 });
}
function clock(k, { w, d, h, color }) {
  const c2 = sh(color, 0.05); k.b(w, 0.25, d, color, 0, 0, 0); k.b(w - 0.12, 1.0, d - 0.06, color, 0, 0.25, 0); k.b(w - 0.28, 0.75, 0.01, '#140f0c', 0, 0.35, d / 2 - 0.03 + 0.004); k.cz(0.012, 0.07, BRASS, 0, 0.55, d / 2 - 0.03 + 0.012, 14, { mt: 0.5 }); k.b(0.012, 0.4, 0.008, BRASS, 0, 0.55, d / 2 - 0.03 + 0.012, { mt: 0.5 });
  k.b(w, 0.5, d, c2, 0, 1.25, 0); k.cz(0.014, 0.15, '#f4efe4', 0, 1.5, d / 2 - 0.004, 20); k.b(0.012, 0.11, 0.004, DARK, 0, 1.5, d / 2 + 0.002); k.b(0.09, 0.012, 0.004, DARK, 0.04, 1.5, d / 2 + 0.002);
  k.b(w - 0.1, 0.12, d - 0.06, color, 0, 1.75, 0); k.c(0.025, 0.025, 0.08, BRASS, 0, 1.87, 0, 8, { mt: 0.5 });
}
function trunk(k, { w, d, h, color }) {
  const lid = sh(color, -0.08); k.b(w, 0.27, d - 0.01, color, 0, 0, 0); k.b(w, 0.1, d - 0.01, lid, 0, 0.27, 0); k.b(w - 0.1, 0.08, d - 0.12, lid, 0, 0.37, 0);
  for (const x of [-0.28, 0.28]) k.b(0.05, 0.37, d, STEEL, x, 0, 0, { mt: 0.5 }); k.b(0.08, 0.09, 0.012, BRASS, 0, 0.22, d / 2 - 0.006, { mt: 0.5 });
}
function cube(k, { w, d, h, color }) {
  const th = 0.03, iw = (w - 3 * th) / 2; k.b(w, h, 0.01, sh(color, -0.1), 0, 0, -d / 2 + 0.005); for (const sx of [-1, 1]) k.b(th, h, d, color, sx * (w / 2 - th / 2), 0, 0);
  for (const y of [0, h / 2 - th / 2, h - th]) k.b(w, th, d, color, 0, y, 0); k.b(th, h - 2 * th, d, color, 0, th, 0);
  k.b(0.31, 0.28, 0.3, '#3a8fb7', iw / 2 + th / 2, th, 0.0); k.b(0.31, 0.26, 0.3, '#c98a2a', -(iw / 2 + th / 2), h / 2 + th / 2, 0.0); k.b(0.31, 0.04, 0.3, sh('#c98a2a', 0.1), -(iw / 2 + th / 2), h / 2 + th / 2 + 0.26, 0.0); k.ico(0.16, 0.14, 0.16, '#4c8a46', iw / 2 + th / 2, h / 2 + th / 2 + 0.1, 0.0); k.c(0.06, 0.05, 0.1, '#e8e4dc', iw / 2 + th / 2, h / 2 + th / 2, 0, 10);
}
function dresser(k, { w, d, h, color }) {
  const c2 = sh(color, -0.08), rh = (h - 0.17) / 3; legs4(k, w, d, 0.1, 0.05, sh(color, -0.25), 0.07); k.b(w, h - 0.13, d - 0.02, color, 0, 0.1, -0.01); k.b(w, 0.03, d, sh(color, 0.07), 0, h - 0.03, 0);
  for (let i = 0; i < 3; i++) { const y = 0.12 + i * rh; k.b(w - 0.08, rh - 0.02, 0.01, c2, 0, y, d / 2 - 0.015); k.b(0.18, 0.025, 0.01, '#2b2118', 0, y + rh / 2 - 0.02, d / 2 - 0.005); }
}
function tvunit(k, { w, d, h, color }) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.c(0.02, 0.03, 0.12, sh(color, -0.25), sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.07), 6); k.b(w, 0.34, d - 0.01, color, 0, 0.12, -0.005); k.b(w, 0.04, d, sh(color, 0.07), 0, h - 0.04, 0);
  k.b(0.5, 0.26, 0.006, '#1d1a17', 0, 0.16, d / 2 - 0.013); k.b(0.46, 0.012, 0.1, sh(color, 0.1), 0, 0.28, d / 2 - 0.06); k.b(0.14, 0.05, 0.1, '#14161a', 0.0, 0.29, d / 2 - 0.06);
  for (const sx of [-1, 1]) { const dw = (w - 0.5 - 0.06) / 2; k.b(dw, 0.28, 0.012, sh(color, -0.07), sx * (0.25 + 0.03 + dw / 2), 0.15, d / 2 - 0.011); k.b(0.02, 0.12, 0.012, BRASS, sx * (0.25 + 0.03 + 0.04), 0.27, d / 2 - 0.006, { mt: 0.5 }); }
}
function wardrobe(k, { w, d, h, color }) {
  const c2 = sh(color, -0.06); k.b(w - 0.06, 0.08, d - 0.06, sh(color, -0.3), 0, 0, 0); k.b(w, h - 0.18, d - 0.01, color, 0, 0.08, -0.005); k.b(w, 0.1, d, sh(color, 0.05), 0, h - 0.1, 0);
  for (const sx of [-1, 1]) { k.b(w / 2 - 0.03, h - 0.36, 0.012, c2, sx * (w / 4), 0.14, d / 2 - 0.011); k.b(w / 2 - 0.15, h - 0.56, 0.004, sx < 0 ? '#cfe3ee' : sh(color, 0.06), sx * (w / 4), 0.24, d / 2 - 0.003, sx < 0 ? { mt: 0.4, r: 0.2 } : {}); k.b(0.02, 0.3, 0.02, BRASS, sx * 0.04, 1.0, d / 2 - 0.01, { mt: 0.5 }); }
}
function sideboard(k, { w, d, h, color }) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.c(0.018, 0.03, 0.2, sh(color, -0.2), sx * (w / 2 - 0.12), 0, sz * (d / 2 - 0.07), 6); k.b(w, 0.6, d - 0.01, color, 0, 0.2, -0.005); k.b(w, 0.05, d, sh(color, 0.08), 0, 0.8, 0);
  const dw = (w - 0.1) / 4; for (let i = 0; i < 4; i++) { const x = -w / 2 + 0.05 + dw * (i + 0.5); k.b(dw - 0.02, 0.5, 0.012, i % 2 ? sh(color, 0.07) : sh(color, -0.03), x, 0.25, d / 2 - 0.011); k.b(0.02, 0.1, 0.012, BRASS, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), 0.55, d / 2 - 0.006, { mt: 0.5 }); }
}
function rug(k, { id, w, d, color }) {
  const cr = '#e8d9a8', gold = '#d8b45a';
  if (id === 'rug_round') { k.ce(w, d, 0.016, color, 0, 0, 0, 36); k.ce(w * 0.72, d * 0.72, 0.002, cr, 0, 0.016, 0, 36); k.ce(w * 0.4, d * 0.4, 0.002, color, 0, 0.018, 0, 36); return; }
  if (id === 'rug_long') { k.b(w, 0.016, d, color, 0, 0, 0); k.b(w - 0.16, 0.002, d - 0.16, cr, 0, 0.016, 0); for (let i = 0; i < 6; i++) k.b(w - 0.3, 0.002, 0.1, color, 0, 0.018, -d / 2 + 0.3 + i * ((d - 0.6) / 5)); return; }
  if (id === 'rug_shag') { k.b(w, 0.036, d, sh(color, -0.04), 0, 0, 0); const n = 12; for (let i = 0; i < n; i++) k.b(w - 0.06, 0.014, d / n - 0.03, i % 2 ? sh(color, -0.07) : sh(color, 0.05), 0, 0.036, -d / 2 + (d / n) * (i + 0.5)); return; }
  k.b(w, 0.02, d, color, 0, 0, 0); k.b(w - 0.2, 0.004, d - 0.2, gold, 0, 0.02, 0); k.b(w - 0.4, 0.004, d - 0.4, color, 0, 0.024, 0); k.b(1.1, 0.002, 1.1, gold, 0, 0.028, 0, { ry: Math.PI / 4 }); for (const sz of [-1, 1]) k.b(w - 0.2, 0.004, 0.04, cr, 0, 0.02, sz * (d / 2 - 0.03));
}

const BUILD = { bed, bedside: nightstand, chair, dtable, island, hamper, bathmat, bcab, washer, tub, sofa, beanbag, armchair, ctable, stable, tv, audio, game, mat, weights, cardio, desk, shelf, easel, piano, lamp, hearth, plant, mirror, aquarium, clock, trunk, cube, dresser, tvunit, wardrobe, sideboard, rug };
/** Furniture kinds that have a hand-built model (every catalogue kind must be here; a test enforces it). */
export const MODEL_KINDS = Object.keys(BUILD);

/** Scale (within +-12%) and centre a built model so its bounding box is exactly the catalogue footprint; a no-op for accurate builders. */
function fit(inner, def) {
  inner.updateMatrixWorld(true); let box = new THREE.Box3().setFromObject(inner, true), size = box.getSize(new THREE.Vector3());
  const s = [[def.w, size.x], [def.h, size.y], [def.d, size.z]].map(([want, got]) => (got > 1e-6 ? Math.min(1.12, Math.max(0.88, want / got)) : 1));
  if (s.some((v) => Math.abs(v - 1) > 0.004)) { inner.scale.set(s[0], s[1], s[2]); inner.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(inner, true); }
  const c = box.getCenter(new THREE.Vector3()); inner.position.set(-c.x, -box.min.y, -c.z);
}

/**
 * Procedural low-poly furniture models. Local origin = floor centre of the footprint (w along x, d along z); the model's bounding box
 * is the catalogue's w x h x d. `opts.fit === false` skips the final correction (tests use it to check the raw builders).
 */
export function furnitureModel(type, opts = {}) {
  const g = new THREE.Group(); g.userData.type = type;
  if (isPoster(type)) {
    const dest = type.slice(7), hue = hash(dest) % 360, c = new THREE.Color().setHSL(hue / 360, 0.55, 0.5), c2 = new THREE.Color().setHSL(((hue + 40) % 360) / 360, 0.6, 0.65);
    bx(g, 0.5, 0.06, 0.1, '#2b2e33', 0, 0, 0);
    bx(g, 0.04, 0.9, 0.04, '#2b2e33', -0.2, 0.05, 0); bx(g, 0.04, 0.9, 0.04, '#2b2e33', 0.2, 0.05, 0);
    bx(g, POSTER_SIZE.w - 0.1, 0.78, 0.05, '#f4efe4', 0, 0.2, 0);
    const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ color: c, emissive: c2, emissiveIntensity: 0.25 })); pr.position.set(0, 0.6, 0.03); g.add(pr);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: c2 })); sun.position.set(0.08, 0.7, 0.032); g.add(sun);
    return g;
  }
  const def = Object.prototype.hasOwnProperty.call(FURNITURE, type) ? FURNITURE[type] : null; if (!def) return g;
  const k = kit(), build = BUILD[def.kind];
  if (build) build(k, def); else k.b(def.w, def.h, def.d, def.color, 0, 0, 0);
  const inner = k.bake(def.h > 0.1); if (opts.fit !== false) fit(inner, def); g.add(inner); return g;
}
