import * as THREE from 'three';
import { FURNITURE, POSTER_SIZE, isPoster } from '../data/furniture.js';

const m = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const bx = (g, w, h, d, color, x, y, z, o) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(color, o)); me.position.set(x, y + h / 2, z); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
const cy = (g, rt, rb, h, color, x, y, z, seg = 14, o) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m(color, o)); me.position.set(x, y + h / 2, z); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** Procedural furniture models. Local origin = floor centre of the footprint (w along x, d along z). */
export function furnitureModel(type) {
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
  const def = FURNITURE[type]; if (!def) return g; const { w, d, h, color } = def;
  switch (type) {
    case 'armchair': bx(g, w, 0.4, d, color, 0, 0.1, 0); bx(g, w, 0.55, 0.2, color, 0, 0.4, -d / 2 + 0.1); bx(g, 0.18, 0.3, d, color, -w / 2 + 0.09, 0.4, 0); bx(g, 0.18, 0.3, d, color, w / 2 - 0.09, 0.4, 0); bx(g, w - 0.4, 0.14, d - 0.25, '#c77a4a', 0, 0.5, 0.1); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.06, 0.1, 0.06, '#3d2a1d', sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1)); break;
    case 'beanbag': { const me = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), m(color, { roughness: 0.95 })); me.scale.set(1, 0.7, 1); me.position.y = 0.3; me.castShadow = true; g.add(me); break; }
    case 'chair': bx(g, w, 0.06, d, color, 0, 0.45, 0); bx(g, w, 0.45, 0.05, color, 0, 0.5, -d / 2 + 0.03); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.05, 0.45, 0.05, '#4d3a29', sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05)); break;
    case 'dining': bx(g, w, 0.06, d, color, 0, 0.69, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.08, 0.69, 0.08, '#4d3a29', sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1)); bx(g, 0.3, 0.1, 0.3, '#f1ece0', 0, 0.75, 0); break;
    case 'coffee': bx(g, w, 0.05, d, color, 0, 0.37, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.05, 0.37, 0.05, '#2d2118', sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06)); cy(g, 0.07, 0.06, 0.1, '#e8d9a8', 0.2, 0.42, 0); break;
    case 'side': cy(g, 0.25, 0.22, 0.04, color, 0, 0.5, 0, 20); cy(g, 0.03, 0.03, 0.5, '#3d2f22', 0, 0, 0); cy(g, 0.18, 0.2, 0.03, '#3d2f22', 0, 0, 0, 16); break;
    case 'bookcase': bx(g, w, h, d, color, 0, 0, 0); for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) bx(g, 0.14, 0.26, 0.2, ['#a3312f', '#223458', '#3e5b43', '#d8cdb4', '#8e6bd8'][(r + k) % 5], -w / 2 + 0.2 + k * 0.17, 0.12 + r * 0.36, 0.05); break;
    case 'dresser': bx(g, w, h, d, color, 0, 0, 0); for (let i = 0; i < 3; i++) { bx(g, w - 0.1, 0.24, 0.02, '#8a7155', 0, 0.1 + i * 0.29, d / 2 + 0.005); bx(g, 0.18, 0.03, 0.03, '#2b2118', 0, 0.2 + i * 0.29, d / 2 + 0.03); } break;
    case 'plant': cy(g, 0.22, 0.17, 0.35, '#8a5a36', 0, 0, 0); { const me = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), m(color, { roughness: 1 })); me.position.y = 0.95; me.scale.set(1, 1.2, 1); me.castShadow = true; g.add(me); cy(g, 0.03, 0.04, 0.6, '#5b4330', 0, 0.3, 0, 6); } break;
    case 'lamp': cy(g, 0.18, 0.2, 0.04, '#2b2e33', 0, 0, 0, 14); cy(g, 0.02, 0.02, 1.4, '#2b2e33', 0, 0.04, 0, 6); cy(g, 0.14, 0.2, 0.28, color, 0, 1.4, 0, 14, { emissive: new THREE.Color('#ffe2a0'), emissiveIntensity: 0.9, transparent: true, opacity: 0.95 }); break;
    case 'speaker': bx(g, w, h, d, color, 0, 0, 0); for (const sx of [-1, 1]) { const me = new THREE.Mesh(new THREE.CircleGeometry(0.15, 18), m('#14161a')); me.position.set(sx * 0.22, 0.35, d / 2 + 0.005); g.add(me); } bx(g, 0.3, 0.06, 0.02, '#4ae0d0', 0, 0.56, d / 2 + 0.01, { emissive: new THREE.Color('#4ae0d0'), emissiveIntensity: 0.8 }); break;
    case 'rug_round': cy(g, 1.0, 1.0, 0.025, color, 0, 0, 0, 36); cy(g, 0.7, 0.7, 0.03, '#e8d9a8', 0, 0, 0, 36); cy(g, 0.4, 0.4, 0.035, color, 0, 0, 0, 36); break;
    case 'rug_long': bx(g, w, 0.025, d, color, 0, 0, 0); bx(g, w - 0.2, 0.03, d - 0.2, '#e8d9a8', 0, 0, 0); break;
    default: bx(g, w, h, d, color, 0, 0, 0);
  }
  return g;
}
