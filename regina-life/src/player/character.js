import * as THREE from 'three';
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTHES } from '../data/catalog.js';
import { POSES, applyPose } from './poses.js';

/**
 * Procedural, fully articulated human character in a soft, friendly "cozy game" style.
 *
 * - Big expressive head (large glossy eyes with lashes, rosy cheeks), smooth tapered limbs with no visible ball joints,
 *   mitten hands with a thumb, and chunky rounded shoes, so the figure reads clearly from the dollhouse camera.
 * - Smooth lathe/capsule anatomy, deformable head (face shapes), eyes with irises, brows, nose, ears,
 *   expressions and blinking.
 * - Customisable skin, hair styles/colours, facial hair, body type, clothing, footwear and accessories.
 * - Layered procedural animation (idle / walk / run / sit / carry / wave / use / cheer) with damped blending so
 *   transitions are natural, plus activity poses and their props (player/poses.js): a timed `pose` and an ongoing `hold`.
 * - Clothing is plain colour only: there is deliberately NO number, logo or text on any garment.
 */

const BODY = {
  slim:     { sh: 0.93, waist: 0.88, arm: 0.036, leg: 0.060, chest: 0.92 },
  average:  { sh: 1.0,  waist: 1.0,  arm: 0.040, leg: 0.066, chest: 1.0 },
  athletic: { sh: 1.1,  waist: 0.95, arm: 0.047, leg: 0.071, chest: 1.1 },
  broad:    { sh: 1.14, waist: 1.18, arm: 0.050, leg: 0.074, chest: 1.14 },
};
const FACE = {
  oval:   { sx: 0.92, sy: 1.13, jaw: 0.88 },
  round:  { sx: 1.0,  sy: 1.02, jaw: 1.04 },
  square: { sx: 0.98, sy: 1.06, jaw: 1.13 },
  heart:  { sx: 0.98, sy: 1.1,  jaw: 0.74 },
};
const HEAD_R = 0.105;
const DEG = Math.PI / 180;

export function resolveLook(look) {
  const g = (id) => CLOTHES[id] ?? null;
  return {
    ...look,
    skinHex: SKIN_TONES[look.skin] ?? SKIN_TONES[2],
    hairHex: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[2],
    eyeHex: EYE_COLORS[look.eyes] ?? EYE_COLORS[0],
    topI: g(look.top), bottomI: g(look.bottom), shoesI: g(look.shoes), headI: g(look.head), faceI: g(look.face_acc), neckI: g(look.neck),
  };
}

export function buildCharacter(lookIn, { detail = 1 } = {}) {
  const look = resolveLook(lookIn);
  const seg = (n) => Math.max(6, Math.round(n * detail));
  const geos = [], mats = [];
  const G = (g) => (geos.push(g), g);
  const matCache = new Map();
  const M = (color, { rough = 0.8, metal = 0, emissive = 0, transparent = false, opacity = 1 } = {}) => {
    const k = `${color}|${rough}|${metal}|${emissive}|${opacity}`;
    if (matCache.has(k)) return matCache.get(k);
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, transparent, opacity });
    if (emissive) m.emissive = new THREE.Color(color).multiplyScalar(emissive);
    mats.push(m); matCache.set(k, m); return m;
  };
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(G(geo), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = false; parent.add(m); return m;
  };
  const joint = (parent, x = 0, y = 0, z = 0) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };
  /** A smooth tapered capsule hanging down from its joint (y = 0 to -len): rounded ends whose radii match the next segment, so bent elbows and knees stay seamless. */
  const taper = (rTop, rBot, len, n = 14) => {
    const pts = [], k = 6;
    for (let i = 0; i <= k; i++) { const a = -Math.PI / 2 + (i / k) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, rBot * Math.cos(a)), -len + rBot * Math.sin(a))); }
    for (let i = 1; i <= k; i++) { const a = (i / k) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, rTop * Math.cos(a)), rTop * Math.sin(a))); }
    return new THREE.LatheGeometry(pts, seg(n));
  };
  /** An open fabric tube (sleeve or trouser leg) from y = 0 down to -len, with a soft rolled hem at the bottom. */
  const tube = (rTop, rBot, len, mat, parent, n = 14, hem = true) => {
    mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg(n), 1, true).translate(0, -len / 2, 0), mat, parent);
    if (hem) mesh(new THREE.TorusGeometry(rBot, Math.min(0.009, rBot * 0.18), 5, seg(n)).rotateX(Math.PI / 2).translate(0, -len, 0), mat, parent);
  };

  const body = BODY[look.body] ?? BODY.average;
  const face = FACE[look.face] ?? FACE.oval;
  const skin = M(look.skinHex, { rough: 0.55, emissive: 0.07 });
  const root = new THREE.Group(); root.name = 'character';
  const scaleGroup = joint(root); scaleGroup.scale.setScalar(look.height ?? 1);
  const hips = joint(scaleGroup, 0, 0.92, 0);

  /* ---------- torso ---------- */
  const profile = (off = 0) => [...(off ? [[0.0, -0.075], [0.15 * body.waist + off, -0.075]] : [[0.0, -0.06], [0.125, -0.06]]), [0.148 + off, 0.04], [0.135 * body.waist + off, 0.2], [0.155 * body.chest + off, 0.34], [0.172 * body.chest + off, 0.42], [0.168 * body.chest + off, 0.475], [0.12 + off, 0.52], [0.062, 0.545]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const torsoGeo = (off, cut = 1) => { const p = profile(off); const g = new THREE.LatheGeometry(cut < 1 ? p.slice(0, -1) : p, seg(28)); g.scale(1.18 * body.sh, 1, 0.74); return g; };
  const spine = joint(hips, 0, 0, 0);
  mesh(torsoGeo(0), skin, spine);
  const neckJ = joint(spine, 0, 0.52, 0);
  mesh(new THREE.CylinderGeometry(0.044, 0.052, 0.1, seg(14)), skin, neckJ, 0, 0.025, 0);
  const headJ = joint(neckJ, 0, 0.095, 0.0); headJ.scale.setScalar(1.3);   // a big head reads as a friendly cozy-game character and stays readable from the dollhouse camera
  const shoulderY = 0.46, shoulderX = 0.205 * body.sh;

  /* ---------- head with face-shape deformation ---------- */
  const headGeo = (radius = HEAD_R, thS = 0, thL = Math.PI, phS = 0, phL = Math.PI * 2, wSeg = 36, hSeg = 24) => {
    const g = new THREE.SphereGeometry(radius, seg(wSeg), seg(hSeg), phS, phL, thS, thL);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = Math.max(0, -y / radius);
      const j = 1 + (face.jaw - 1) * t;
      x *= face.sx * j; z *= 1 - 0.1 * t * (face.jaw < 1 ? 0.6 : 0); y *= face.sy;
      if (y < 0) y *= 1 + 0.05 * (face.jaw - 0.8);
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals(); return g;
  };
  const headY = 0.075;
  const head = joint(headJ, 0, headY, 0);
  mesh(headGeo(), skin, head);
  // ears
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.026, seg(10), seg(8)), skin, head, s * 0.101 * face.sx, -0.008, -0.006); e.scale.set(0.42, 1, 0.72);
    const lobe = mesh(new THREE.SphereGeometry(0.012, seg(8), seg(6)), skin, head, s * 0.103 * face.sx, -0.03, -0.002); lobe.castShadow = false;
  }
  // nose: small and soft, a button rather than a beak
  const nose = mesh(new THREE.SphereGeometry(0.0135, seg(10), seg(8)), M(look.skinHex, { rough: 0.5, emissive: 0.09 }), head, 0, -0.016, 0.101); nose.scale.set(1.1, 0.95, 0.9); nose.castShadow = false;
  // rosy cheeks
  const blush = new THREE.MeshBasicMaterial({ color: '#ff7f86', transparent: true, opacity: 0.22, depthWrite: false }); mats.push(blush);
  for (const s of [-1, 1]) {
    const c = mesh(new THREE.CircleGeometry(0.015, seg(14)), blush, head, s * 0.058 * face.sx, -0.022, 0.084); c.castShadow = false;
    c.rotation.set(0.12, s * 0.62, 0); c.scale.set(1.25, 0.8, 1);
  }

  /* ---------- eyes ---------- */
  const eyeGroup = joint(head, 0, 0.018, 0);
  const eyes = [];
  const lashMat = M('#1b1412', { rough: 0.6 });
  for (const s of [-1, 1]) {
    const eg = joint(eyeGroup, s * 0.04 * face.sx, -0.002, 0.088);
    const w = mesh(new THREE.SphereGeometry(0.021, seg(16), seg(12)), M('#fbf9f6', { rough: 0.2 }), eg); w.scale.set(0.95, 1.1, 0.5); w.castShadow = false;
    const iris = mesh(new THREE.CircleGeometry(0.0145, seg(18)), M(look.eyeHex, { rough: 0.2 }), eg, 0, -0.002, 0.0107); iris.castShadow = false;
    const ring = mesh(new THREE.RingGeometry(0.0128, 0.0147, seg(18)), M('#15100c', { rough: 0.3 }), eg, 0, -0.002, 0.0108); ring.castShadow = false;
    const pupil = mesh(new THREE.CircleGeometry(0.0072, seg(14)), M('#050505', { rough: 0.1 }), eg, 0, -0.002, 0.0109); pupil.castShadow = false;
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' }); mats.push(shine);
    mesh(new THREE.CircleGeometry(0.0042, 10), shine, eg, 0.0045, 0.0045, 0.0111).castShadow = false;
    mesh(new THREE.CircleGeometry(0.002, 8), shine, eg, -0.0045, -0.0068, 0.0111).castShadow = false;
    // upper lash line: a thin dark arc that gives the eye its shape
    const lash = mesh(new THREE.TorusGeometry(0.0205, 0.0026, 5, seg(14), Math.PI * 0.82), lashMat, eg, 0, 0.0005, 0.004); lash.rotation.z = Math.PI * 0.09; lash.scale.set(0.98, 1.12, 1); lash.castShadow = false;
    const flick = mesh(new THREE.CapsuleGeometry(0.0018, 0.007, 2, 4), lashMat, eg, s * 0.0205, 0.009, 0.006); flick.rotation.z = s * -0.9; flick.castShadow = false;
    eyes.push(eg);
  }
  // brows
  const browMat = M(look.hairHex, { rough: 0.9 });
  const brows = [];
  for (const s of [-1, 1]) { const b = mesh(new THREE.CapsuleGeometry(0.0046, 0.03, 4, 6), browMat, head, s * 0.041 * face.sx, 0.054, 0.093); b.rotation.z = Math.PI / 2; b.castShadow = false; brows.push({ m: b, s }); }
  // mouth (rebuilt per expression)
  const lipMat = M('#a65a56', { rough: 0.4 });
  const beardMode = look.facialHair;
  const mouthZ = beardMode === 'full' ? 0.1175 : beardMode === 'stubble' ? 0.1 : 0.0985;
  const mouth = new THREE.Mesh(new THREE.BufferGeometry(), lipMat); mouth.position.set(0, -0.05, mouthZ); mouth.castShadow = false; head.add(mouth);
  const setExpression = (name) => {
    mouth.geometry.dispose();
    let g, browZ = 0, browY = 0.056, browPitch = 0, eyeS = 1;
    switch (name) {
      case 'smile': g = new THREE.TorusGeometry(0.02, 0.0028, 6, 16, Math.PI).rotateZ(Math.PI); g.translate(0, 0.012, 0); browY = 0.058; break;
      case 'serious': g = new THREE.TorusGeometry(0.022, 0.0028, 6, 12, Math.PI * 0.45).rotateZ(Math.PI / 2 - Math.PI * 0.225); g.translate(0, -0.016, 0); browPitch = 0.28; browY = 0.05; break;
      case 'surprised': g = new THREE.TorusGeometry(0.0085, 0.0028, 6, 14); browY = 0.062; eyeS = 1.15; break;
      default: g = new THREE.CapsuleGeometry(0.0028, 0.034, 3, 6).rotateZ(Math.PI / 2);
    }
    mouth.geometry = g;
    brows.forEach(({ m, s }) => { m.position.y = browY; m.rotation.z = Math.PI / 2 + s * browPitch * -1; });
    eyes.forEach((e) => (e.userData.baseScale = eyeS));
    eyes.forEach((e) => e.scale.setScalar(eyeS));
  };

  /* ---------- hair ---------- */
  const hairMat = M(look.hairHex, { rough: 0.78 });
  // A hair cap is a tilted spherical cap: its rim sits at `front` degrees from the crown over the forehead (always above the brows,
  // so the face stays clear) and drops to `back` degrees at the nape.
  const hairCap = (front, back, r = 1.07) => { const g = headGeo(HEAD_R * r, 0, ((front + back) / 2) * DEG); g.rotateX(-((back - front) / 2) * DEG); return mesh(g, hairMat, head, 0, 0.004, -0.002); };
  const addHair = () => {
    switch (look.hair) {
      case 'buzz': hairCap(50, 112, 1.025); break;
      case 'short': hairCap(48, 118, 1.07); { const f = mesh(new THREE.SphereGeometry(0.06, seg(12), seg(8)), hairMat, head, 0.0, 0.088, 0.058); f.scale.set(1.5, 0.45, 0.8); f.rotation.x = 0.4; } break;
      case 'side-part': hairCap(46, 120, 1.08); { const f = mesh(new THREE.SphereGeometry(0.07, seg(12), seg(8)), hairMat, head, -0.03, 0.082, 0.045); f.scale.set(1.45, 0.55, 0.9); f.rotation.set(0.45, 0, -0.35); } break;
      case 'long': { hairCap(50, 135, 1.08); const back = mesh(new THREE.CapsuleGeometry(0.1, 0.3, 6, seg(14)), hairMat, head, 0, -0.17, -0.055); back.scale.set(1.05, 1, 0.62); for (const s of [-1, 1]) { const l = mesh(new THREE.CapsuleGeometry(0.03, 0.22, 4, seg(8)), hairMat, head, s * 0.098, -0.1, 0.0); l.scale.set(0.8, 1, 1.2); } break; }
      case 'bun': hairCap(48, 120, 1.07); mesh(new THREE.SphereGeometry(0.055, seg(14), seg(10)), hairMat, head, 0, 0.128, -0.05); break;
      case 'buns': hairCap(48, 120, 1.07); for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.043, seg(12), seg(10)), hairMat, head, s * 0.072 * face.sx, 0.112, -0.028); break;   // two space buns
      case 'ponytail': { hairCap(46, 122, 1.07); const tail = mesh(new THREE.CapsuleGeometry(0.033, 0.17, 5, seg(10)), hairMat, head, 0, -0.04, -0.152); tail.rotation.x = 0.38; tail.scale.set(1, 1, 0.85);
        const tie = mesh(new THREE.TorusGeometry(0.024, 0.008, 6, 12), M('#e0473e', { rough: 0.6 }), head, 0, 0.045, -0.118); tie.rotation.x = Math.PI / 2 - 0.5; break; }
      case 'bob': { hairCap(44, 130, 1.09); for (const s of [-1, 1]) { const v = mesh(new THREE.CapsuleGeometry(0.05, 0.07, 6, seg(10)), hairMat, head, s * 0.094 * face.sx, -0.045, -0.014); v.scale.set(0.72, 1, 1.15); }
        const b = mesh(new THREE.SphereGeometry(0.1, seg(16), seg(10)), hairMat, head, 0, -0.035, -0.055); b.scale.set(1.08, 0.82, 0.75);
        const f = mesh(new THREE.SphereGeometry(0.06, seg(12), seg(8)), hairMat, head, 0.02, 0.086, 0.058); f.scale.set(1.6, 0.42, 0.8); f.rotation.x = 0.45; break; }
      case 'waves': { hairCap(46, 132, 1.085); for (let k = 0; k < 7; k++) { const a = -1.25 + k * 0.42, c = mesh(new THREE.SphereGeometry(0.05, seg(10), seg(8)), hairMat, head, Math.sin(a) * 0.1 * face.sx, -0.1 - (k % 2) * 0.03, -Math.cos(a) * 0.07); c.scale.set(1, 1.6, 0.9); } break; }
      case 'curly': hairCap(46, 118, 1.06); { for (let k = 0; k < 26; k++) { const th = 0.15 + Math.random() * 1.15, ph = Math.random() * Math.PI * 2; const r = 0.108; const c = mesh(new THREE.SphereGeometry(0.03, seg(8), seg(6)), hairMat, head, Math.sin(th) * Math.cos(ph) * r * face.sx, Math.cos(th) * r * 1.05 + 0.005, Math.sin(th) * Math.sin(ph) * r - 0.012); if (c.position.z > 0.045 && c.position.y < 0.085) c.position.z -= 0.03; } } break;
      case 'afro': { const a = mesh(new THREE.IcosahedronGeometry(0.152, 3), hairMat, head, 0, 0.092, -0.05); a.scale.set(1.04, 0.96, 1.0); break; }
      case 'braids': { hairCap(48, 125, 1.07); for (let k = 0; k < 9; k++) { const ph = Math.PI * (0.5 + (k - 4) * 0.19) + Math.PI / 2 - Math.PI / 2; const a = -Math.PI / 2 + (k - 4) * 0.33; const bx = Math.sin(a) * 0.098, bz = -Math.cos(a) * 0.07 - 0.02; const c = mesh(new THREE.CapsuleGeometry(0.0125, 0.3, 4, 6), hairMat, head, bx, -0.12, bz); c.rotation.x = 0.05; } break; }
      default: break; // bald
    }
  };
  addHair();
  // facial hair
  const fh = look.facialHair;
  if (fh === 'stubble') { const g = headGeo(HEAD_R * 1.012, Math.PI * 0.5, Math.PI * 0.4, Math.PI / 2 - 1.15, 2.3); mesh(g, M(look.hairHex, { rough: 1, transparent: true, opacity: 0.38 }), head).castShadow = false; }
  if (fh === 'full') { const g = headGeo(HEAD_R * 1.05, Math.PI * 0.49, Math.PI * 0.42, Math.PI / 2 - 1.5, 3.0); mesh(g, hairMat, head); }
  if (fh === 'moustache' || fh === 'full') { const m = mesh(new THREE.CapsuleGeometry(0.0085, 0.05, 4, 8), hairMat, head, 0, -0.031, fh === 'full' ? 0.118 : 0.103); m.rotation.z = Math.PI / 2; m.scale.set(1, 1, 0.9); }
  if (fh === 'goatee') { const m = mesh(new THREE.SphereGeometry(0.02, seg(10), seg(8)), hairMat, head, 0, -0.086, 0.088); m.scale.set(1.1, 1.3, 0.8); const m2 = mesh(new THREE.CapsuleGeometry(0.007, 0.042, 4, 8), hairMat, head, 0, -0.031, 0.103); m2.rotation.z = Math.PI / 2; }

  /* ---------- accessories (head / face / neck) ---------- */
  if (look.headI?.style === 'toque') {
    const c = M(look.headI.color, { rough: 0.95 }), R = HEAD_R * 1.1, front = 44, back = 108, th = ((front + back) / 2) * DEG, tilt = -((back - front) / 2) * DEG;
    mesh(headGeo(R, 0, th).rotateX(tilt), c, head, 0, 0.012, -0.004);
    // the folded cuff follows the cap's rim, so it sits on the forehead instead of across the eyes
    const cuff = mesh(new THREE.TorusGeometry(R * Math.sin(th), 0.018, 8, seg(28)).rotateX(Math.PI / 2).translate(0, R * Math.cos(th) * face.sy, 0).rotateX(tilt), c, head, 0, 0.012, -0.004); cuff.scale.set(face.sx, 1, 1);
    mesh(new THREE.SphereGeometry(0.032, seg(12), seg(10)), M('#f1ece0', { rough: 1 }), head, 0, 0.142, -0.03);
  } else if (look.headI?.style === 'beanie') {   // a slouchy knit: the toque's cap and cuff, no pompom, and a soft fold falling back
    const c = M(look.headI.color, { rough: 0.95 }), R = HEAD_R * 1.1, front = 44, back = 110, th = ((front + back) / 2) * DEG, tilt = -((back - front) / 2) * DEG;
    mesh(headGeo(R, 0, th).rotateX(tilt), c, head, 0, 0.012, -0.004);
    const cuff = mesh(new THREE.TorusGeometry(R * Math.sin(th), 0.013, 8, seg(28)).rotateX(Math.PI / 2).translate(0, R * Math.cos(th) * face.sy, 0).rotateX(tilt), c, head, 0, 0.012, -0.004); cuff.scale.set(face.sx, 1, 1);
    const fold = mesh(new THREE.SphereGeometry(0.075, seg(14), seg(10)), c, head, 0, 0.105, -0.075); fold.scale.set(1.25, 0.75, 1.05);
  } else if (look.headI?.style === 'trapper') {   // a trapper hat: a crown with fur ear flaps and a fur front, for the -30 days
    const c = M(look.headI.color, { rough: 0.8 }), fur = M('#efe6d6', { rough: 1 }), R = HEAD_R * 1.12, front = 46, back = 112, th = ((front + back) / 2) * DEG, tilt = -((back - front) / 2) * DEG;
    mesh(headGeo(R, 0, th).rotateX(tilt), c, head, 0, 0.012, -0.004);
    const cuff = mesh(new THREE.TorusGeometry(R * Math.sin(th), 0.024, 8, seg(28)).rotateX(Math.PI / 2).translate(0, R * Math.cos(th) * face.sy, 0).rotateX(tilt), fur, head, 0, 0.012, -0.004); cuff.scale.set(face.sx, 1, 1);
    for (const s of [-1, 1]) { const f = mesh(new THREE.CapsuleGeometry(0.03, 0.07, 4, seg(10)), fur, head, s * 0.112 * face.sx, -0.02, -0.012); f.scale.set(0.75, 1, 1.25); }
  } else if (look.headI?.style === 'bucket') {   // a bucket hat: a soft crown and a sloping brim all the way round
    const c = M(look.headI.color, { rough: 0.9 }), R = HEAD_R * 1.1;
    mesh(headGeo(R, 0, ((50 + 104) / 2) * DEG).rotateX(-((104 - 50) / 2) * DEG), c, head, 0, 0.014, -0.004);
    const bm = new THREE.MeshStandardMaterial({ color: look.headI.color, roughness: 0.9, side: THREE.DoubleSide }); mats.push(bm);
    const brim = mesh(new THREE.CylinderGeometry(0.128, 0.19, 0.05, seg(26), 1, true), bm, head, 0, 0.06, -0.008); brim.rotation.x = -0.12; brim.scale.set(face.sx, 1, 1);
  } else if (look.headI?.style === 'cap') {
    const c = M(look.headI.color, { rough: 0.85 }), R = HEAD_R * 1.08, front = 46, back = 106;
    mesh(headGeo(R, 0, ((front + back) / 2) * DEG).rotateX(-((back - front) / 2) * DEG), c, head, 0, 0.012, -0.004);
    mesh(new THREE.SphereGeometry(0.009, 8, 6), c, head, 0, 0.128, -0.012);
    const brim = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.007, seg(20), 1, false, -Math.PI / 2, Math.PI), c, head, 0, 0.074, 0.058); brim.scale.set(1, 1, 0.95); brim.rotation.x = 0.22;
  }
  if (look.faceI?.style === 'glasses' || look.faceI?.style === 'shades') {
    const fm = M(look.faceI.color, { rough: 0.35, metal: 0.3 });
    for (const s of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.0235, 0.0026, 6, seg(20)), fm, eyeGroup, s * 0.037 * face.sx, 0, 0.105); ring.castShadow = false;
      if (look.faceI.style === 'shades') { const lens = mesh(new THREE.CircleGeometry(0.0235, seg(20)), M('#0a0b0d', { rough: 0.1, metal: 0.4 }), eyeGroup, s * 0.037 * face.sx, 0, 0.106); lens.castShadow = false; }
      const arm = mesh(new THREE.BoxGeometry(0.0025, 0.0025, 0.1), fm, eyeGroup, s * 0.0985 * face.sx, 0.002, 0.058); arm.castShadow = false;
    }
    mesh(new THREE.BoxGeometry(0.02, 0.0028, 0.0028), fm, eyeGroup, 0, 0.006, 0.106).castShadow = false;
  }
  if (look.neckI?.style === 'scarf') {
    const c = M(look.neckI.color, { rough: 1 });
    const t = mesh(new THREE.TorusGeometry(0.066, 0.03, 10, seg(20)).rotateX(Math.PI / 2), c, neckJ, 0, 0.02, 0.0); t.scale.set(1.15, 1, 0.95);
    const tail = mesh(new THREE.BoxGeometry(0.07, 0.24, 0.022), c, spine, 0.075, 0.31, 0.112); tail.rotation.set(0.05, 0.25, 0.22);   // the end tossed over a shoulder, not down the middle
  }

  /* ---------- tops ---------- */
  const topStyle = look.topI?.style ?? 'tee', topCol = look.topI?.color ?? '#999999';
  const fabric = M(topCol, { rough: { jacket: 0.55, puffer: 0.42 }[topStyle] ?? 0.95 });
  const thick = { tee: 0.010, hoodie: 0.024, sweater: 0.02, jacket: 0.026, puffer: 0.042, overshirt: 0.016 }[topStyle] ?? 0.012;
  const torsoR = (y) => { const p = [[-0.075, 0.15 * body.waist], [0.04, 0.148], [0.2, 0.135 * body.waist], [0.34, 0.155 * body.chest], [0.42, 0.172 * body.chest], [0.475, 0.168 * body.chest]]; for (let i = 1; i < p.length; i++) if (y <= p[i][0]) { const u = (y - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * u; } return p[p.length - 1][1]; };
  {
    const g = torsoGeo(thick, 0); g.scale(1, 1, 1); mesh(g, fabric, spine);
    // hem
    const hem = mesh(new THREE.TorusGeometry(0.15 * body.waist + thick, 0.011, 6, seg(28)).rotateX(Math.PI / 2), fabric, spine, 0, -0.072, 0); hem.scale.set(1.18 * body.sh, 1, 0.74);
    if (topStyle === 'hoodie') {
      const hood = mesh(new THREE.SphereGeometry(0.1, seg(16), seg(10), 0, Math.PI * 2, 0, Math.PI * 0.7), fabric, neckJ, 0, 0.0, -0.06); hood.scale.set(1.3, 0.85, 0.9); hood.rotation.x = 0.3;
      mesh(new THREE.BoxGeometry(0.22, 0.09, 0.03), fabric, spine, 0, 0.1, 0.095).rotation.x = -0.08;
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), M('#e8e4da', { rough: 1 }), spine, s * 0.03, 0.4, 0.125);
    }
    if (topStyle === 'jacket') {
      const col = mesh(new THREE.TorusGeometry(0.07, 0.022, 8, seg(18)).rotateX(Math.PI / 2), fabric, neckJ, 0, 0.0, 0); col.scale.set(1.2, 1, 1);
      mesh(new THREE.BoxGeometry(0.006, 0.46, 0.006), M('#b8b8b8', { metal: 0.8, rough: 0.3 }), spine, 0, 0.26, 0.128);
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), M(topCol, { rough: 0.55 }), spine, s * 0.085, 0.12, 0.118);
    }
    if (topStyle === 'sweater') mesh(new THREE.TorusGeometry(0.056, 0.017, 8, seg(18)).rotateX(Math.PI / 2), fabric, neckJ, 0, 0.02, 0);
    if (topStyle === 'puffer') {   // quilted baffles, a zip and a fur-trimmed hood: Regina's winter uniform
      const seam = M(new THREE.Color(topCol).multiplyScalar(0.78).getStyle(), { rough: 0.5 });
      for (const y of [0.06, 0.18, 0.3, 0.41]) mesh(new THREE.TorusGeometry(torsoR(y) + thick * 0.85, 0.009, 5, seg(28)).rotateX(Math.PI / 2), seam, spine, 0, y, 0).scale.set(1.18 * body.sh, 1, 0.74);
      mesh(new THREE.BoxGeometry(0.008, 0.5, 0.008), M('#c9ccd2', { metal: 0.7, rough: 0.3 }), spine, 0, 0.24, torsoR(0.3) * 0.74 + thick + 0.004);
      const hood = mesh(new THREE.SphereGeometry(0.11, seg(16), seg(10), 0, Math.PI * 2, 0, Math.PI * 0.7), fabric, neckJ, 0, 0.0, -0.07); hood.scale.set(1.3, 0.85, 0.9); hood.rotation.x = 0.3;
      const fur = mesh(new THREE.TorusGeometry(0.08, 0.032, 8, seg(20)).rotateX(Math.PI / 2), M('#efe6d6', { rough: 1 }), neckJ, 0, 0.01, -0.01); fur.scale.set(1.28, 1, 1.12);
    }
    if (topStyle === 'overshirt') {   // an open flannel over a tee: the tee shows down the front, a soft collar at the neck
      const inner = M(look.topI?.inner ?? '#ece7dc', { rough: 0.95 });
      mesh(new THREE.BoxGeometry(0.12, 0.4, 0.01), inner, spine, 0, 0.27, torsoR(0.27) * 0.74 + thick + 0.002);
      for (const s of [-1, 1]) { const lap = mesh(new THREE.BoxGeometry(0.035, 0.42, 0.016), fabric, spine, s * 0.068, 0.27, torsoR(0.27) * 0.74 + thick + 0.006); lap.rotation.y = s * -0.35; }   // the open fronts fold back
      for (const s of [-1, 1]) { const col = mesh(new THREE.BoxGeometry(0.06, 0.05, 0.012), fabric, neckJ, s * 0.045, -0.01, 0.06); col.rotation.set(-0.3, 0, s * 0.5); }
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.06, 0.055, 0.008), M(new THREE.Color(topCol).multiplyScalar(0.85).getStyle(), { rough: 0.95 }), spine, s * 0.085, 0.34, torsoR(0.34) * 0.74 + thick + 0.002);
    }
  }

  /* ---------- arms ---------- */
  const longSleeve = topStyle !== 'tee';
  const arms = [];
  const aR = body.arm * 1.08;
  for (const s of [-1, 1]) {
    const sh = joint(spine, s * shoulderX, shoulderY, 0);
    mesh(new THREE.SphereGeometry(aR + thick + 0.004, seg(14), seg(10)), fabric, sh).scale.set(1.02, 0.8, 1.0); // rounded shoulder so tops cover the joint
    const uLen = 0.27, fLen = 0.25, rE = aR * 0.86, rW = aR * 0.66;
    mesh(taper(aR, rE, uLen), skin, sh);
    // sleeve: a short cuffed sleeve for tees, full length otherwise
    const sl = longSleeve ? uLen : uLen * 0.5;
    tube(aR + thick + 0.004, (longSleeve ? rE : aR * 0.95) + thick + 0.006, sl, fabric, sh, 14, !longSleeve);
    const elbow = joint(sh, 0, -uLen, 0);
    mesh(taper(rE, rW, fLen), skin, elbow);
    if (longSleeve) { mesh(new THREE.SphereGeometry(rE + thick * 0.9, seg(12), seg(8)), fabric, elbow); tube(rE + thick * 0.9, rW + thick * 0.8 + 0.004, fLen - 0.02, fabric, elbow); }
    const wrist = joint(elbow, 0, -fLen, 0);
    // mitten hand: a rounded palm, a soft block of fingers and a thumb that points forward
    const palm = mesh(new THREE.SphereGeometry(0.04, seg(12), seg(10)), skin, wrist, 0, -0.04, 0); palm.scale.set(0.82, 1.05, 0.55);
    const fingers = mesh(new THREE.CapsuleGeometry(0.018, 0.03, 4, seg(10)), skin, wrist, 0, -0.08, 0.003); fingers.scale.set(1.7, 1, 0.85);
    const thumb = mesh(new THREE.CapsuleGeometry(0.011, 0.028, 3, 6), skin, wrist, s * -0.026, -0.045, 0.016); thumb.rotation.set(-0.35, 0, s * 0.55);
    arms.push({ sh, elbow, wrist, s });
  }

  /* ---------- legs ---------- */
  const bStyle = look.bottomI?.style ?? 'jeans', bCol = look.bottomI?.color ?? '#334';
  const pants = M(bCol, { rough: bStyle === 'jeans' ? 0.85 : 0.95 });
  const legs = [];
  const hipW = 0.092 * (body.waist * 0.5 + 0.55);
  // pelvis / hip block
  {
    const pe = mesh(new THREE.SphereGeometry(0.15, seg(18), seg(12)), skin, hips, 0, -0.04, 0); pe.scale.set(1.0 * body.waist, 0.62, 0.72);
    const pp = mesh(new THREE.SphereGeometry(0.15 + 0.011, seg(18), seg(12), 0, Math.PI * 2, 0, Math.PI * 0.75), pants, hips, 0, -0.04, 0); pp.scale.set(1.0 * body.waist, 0.7, 0.68);
    mesh(new THREE.CylinderGeometry(0.152 * body.waist, 0.15 * body.waist, 0.06, seg(24)), pants, hips, 0, 0.0, 0).scale.set(1, 1, 0.73);
    mesh(new THREE.TorusGeometry(0.15 * body.waist, 0.007, 6, seg(28)).rotateX(Math.PI / 2), M('#2b2118', { rough: 0.5 }), hips, 0, 0.03, 0).scale.set(1, 1, 0.73);
  }
  const thighLen = 0.45, shinLen = 0.43;
  const shorts = bStyle === 'shorts', skirt = bStyle === 'skirt';
  const legThick = { jeans: 0.011, chino: 0.009, jogger: 0.015, shorts: 0.011, overalls: 0.012 }[bStyle] ?? 0.01;
  if (skirt) {   // an A-line skirt from the waist to just above the knee; the legs below stay bare
    const sk = new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.85, side: THREE.DoubleSide }); mats.push(sk);
    mesh(new THREE.CylinderGeometry(0.155 * body.waist, 0.24 * (0.6 + body.waist * 0.4), 0.42, seg(26), 1, true), sk, hips, 0, -0.19, 0).scale.set(1, 1, 0.8);
    mesh(new THREE.TorusGeometry(0.155 * body.waist, 0.012, 6, seg(26)).rotateX(Math.PI / 2), pants, hips, 0, 0.02, 0).scale.set(1, 1, 0.8);
  }
  if (bStyle === 'overalls') {   // a bib and two straps over whatever top you wear
    const z = (y) => torsoR(y) * 0.74 + thick + 0.006;
    mesh(new THREE.BoxGeometry(0.21, 0.22, 0.016), pants, spine, 0, 0.17, z(0.17));
    for (const s of [-1, 1]) { const st = mesh(new THREE.BoxGeometry(0.035, 0.24, 0.012), pants, spine, s * 0.075, 0.38, z(0.38) - 0.004); st.rotation.set(-0.2, 0, s * -0.12); mesh(new THREE.SphereGeometry(0.011, 8, 6), M('#d9b44a', { metal: 0.7, rough: 0.3 }), spine, s * 0.075, 0.27, z(0.27) + 0.008); }
  }
  const lR = body.leg * 1.08, rK = lR * 0.8, rA = lR * 0.56;
  for (const s of [-1, 1]) {
    const hip = joint(hips, s * hipW, -0.02, 0);
    mesh(taper(lR, rK, thighLen, 16), skin, hip);
    const tl = shorts ? thighLen * 0.55 : thighLen;
    if (!skirt) tube(lR + legThick + 0.004, (shorts ? lR * 0.92 + 0.008 : rK) + legThick + 0.004, tl, pants, hip, 16, shorts);
    const knee = joint(hip, 0, -thighLen, 0);
    mesh(taper(rK, rA, shinLen, 16), skin, knee);
    if (!shorts && !skirt) {
      mesh(new THREE.SphereGeometry(rK + legThick + 0.004, seg(12), seg(8)), pants, knee);
      const hemR = bStyle === 'jogger' ? rA + 0.006 : rK * 0.92 + legThick;   // joggers taper into a cuff, jeans and chinos fall straight
      tube(rK + legThick + 0.004, hemR, shinLen - (bStyle === 'jogger' ? 0.05 : 0.03), pants, knee, 16);
    }
    const ankle = joint(knee, 0, -shinLen, 0);
    // shoes: a chunky rounded upper on a thick sole, with a lighter toe cap and laces
    const st = look.shoesI?.style ?? 'sneaker', sc = look.shoesI?.color ?? '#222';
    const shoeM = M(sc, { rough: st === 'dress' ? 0.3 : 0.65 });
    const sole = M(st === 'sneaker' ? '#f4f4f0' : '#17120e', { rough: 0.8 });
    const tall = st === 'boots' || st === 'winter';
    const upper = mesh(new THREE.SphereGeometry(0.06, seg(16), seg(10)), shoeM, ankle, 0, -0.03, 0.04); upper.scale.set(st === 'dress' ? 0.82 : 0.95, tall ? 0.95 : 0.78, 2.05);
    const so = mesh(new THREE.CapsuleGeometry(0.052, 0.14, 4, seg(12)), sole, ankle, 0, -0.064, 0.043); so.rotation.x = Math.PI / 2; so.scale.set(st === 'dress' ? 0.92 : 1.06, 1, st === 'sneaker' ? 0.42 : 0.28);
    if (st === 'sneaker') {
      const cap = mesh(new THREE.SphereGeometry(0.04, seg(12), seg(8), 0, Math.PI * 2, 0, Math.PI / 2), sole, ankle, 0, -0.046, 0.112); cap.scale.set(1.25, 0.7, 0.95); cap.castShadow = false;
      for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(0.04, 0.005, 0.008), sole, ankle, 0, -0.0 - k * 0.006 + 0.004, 0.035 + k * 0.022).castShadow = false;
    }
    if (tall) mesh(new THREE.CylinderGeometry(0.06, 0.068, 0.15, seg(14)), shoeM, ankle, 0, 0.035, 0);
    if (st === 'winter') mesh(new THREE.TorusGeometry(0.066, 0.024, 6, seg(14)).rotateX(Math.PI / 2), M('#efe6d6', { rough: 1 }), ankle, 0, 0.115, 0);   // the fur cuff of a pac boot
    else mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.05, seg(12)), shoeM, ankle, 0, -0.015, -0.002);
    legs.push({ hip, knee, ankle, s });
  }

  /* ---------- carry prop ---------- */
  const box = new THREE.Mesh(G(new THREE.BoxGeometry(0.32, 0.22, 0.26)), M('#b98d57', { rough: 0.9 }));
  box.position.set(0, 0.2, 0.28); box.castShadow = true; box.visible = false; spine.add(box);

  /* ---------- activity props (player/poses.js): each is built the first time a pose needs it, then shown and hidden ---------- */
  // A builder fills a group and says where it hangs: [parent, position, rotation]. Hand props hang from the wrist (the arm's -y runs down the
  // fingers, +z is the thumb side); chest props hang from the spine.
  const rHand = arms[1].wrist, lHand = arms[0].wrist;
  const part = (geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = mesh(geo, mat, parent, x, y, z); m.rotation.set(rx, ry, rz); return m; };
  const tint = (n) => ['#e0473e', '#2f6fb0', '#f2a93b', '#3a9a6a', '#8e6bd8'][[...String(look.top ?? '')].reduce((a, c) => a + c.charCodeAt(0), n) % 5];
  const PROP_BUILD = {
    book: (g) => { const pg = M('#fbf6ea', { rough: 0.9 }), cv = M(tint(0), { rough: 0.7 });
      for (const sd of [-1, 1]) { const h = new THREE.Group(); h.rotation.y = -sd * 0.32; g.add(h); part(new THREE.BoxGeometry(0.12, 0.165, 0.014), pg, h, sd * 0.062, 0, 0.004); part(new THREE.BoxGeometry(0.126, 0.172, 0.006), cv, h, sd * 0.064, 0, -0.006); }
      return [spine, [0, 0.4, 0.34], [-2.25, 0, 0]]; },
    phone: (g) => { part(new THREE.BoxGeometry(0.072, 0.14, 0.012), M('#1d2228', { rough: 0.35, metal: 0.2 }), g); const sc = new THREE.MeshBasicMaterial({ color: '#9fd8ff' }); mats.push(sc); part(new THREE.PlaneGeometry(0.062, 0.122), sc, g, 0, 0, 0.0065); return [rHand, [0, -0.09, 0.03], [0, 0, 0]]; },
    guitar: (g) => { const wood = M('#c98a4b', { rough: 0.45 }), dark = M('#3a2416', { rough: 0.6 }), steel = M('#d9d4c8', { rough: 0.3, metal: 0.6 });
      part(new THREE.CylinderGeometry(0.15, 0.15, 0.08, seg(22)), wood, g, 0, 0, 0, Math.PI / 2); part(new THREE.CylinderGeometry(0.115, 0.115, 0.08, seg(20)), wood, g, -0.17, 0, 0, Math.PI / 2);
      part(new THREE.CircleGeometry(0.045, seg(16)), dark, g, -0.09, 0, 0.0415); part(new THREE.BoxGeometry(0.05, 0.03, 0.012), dark, g, 0.07, 0, 0.044);
      part(new THREE.BoxGeometry(0.46, 0.048, 0.03), dark, g, -0.5, 0, 0.01); part(new THREE.BoxGeometry(0.1, 0.06, 0.025), dark, g, -0.77, 0, 0.01);
      for (let k = -1; k <= 1; k++) part(new THREE.BoxGeometry(0.8, 0.003, 0.003), steel, g, -0.36, k * 0.012, 0.03);
      return [spine, [0.06, 0.2, 0.19], [0, 0, -0.45], 0.8]; },
    shovel: (g) => { const w = M('#8a5a32', { rough: 0.7 }), bl = M('#e8573f', { rough: 0.5 });
      part(new THREE.CylinderGeometry(0.016, 0.016, 0.9, 8), w, g, 0, -0.45, 0); part(new THREE.BoxGeometry(0.11, 0.03, 0.03), w, g, 0, 0.01, 0);
      part(new THREE.BoxGeometry(0.36, 0.3, 0.02), bl, g, 0, -1.02, 0.04, 0.3); part(new THREE.BoxGeometry(0.36, 0.02, 0.1), bl, g, 0, -1.16, 0.08);
      return [rHand, [0, -0.06, 0], [0.15, 0, 0]]; },
    rake: (g) => { const w = M('#8a5a32', { rough: 0.7 }), t = M('#5d6b74', { rough: 0.4, metal: 0.5 });
      part(new THREE.CylinderGeometry(0.014, 0.014, 1.15, 8), w, g, 0, -0.57, 0); part(new THREE.BoxGeometry(0.46, 0.03, 0.03), t, g, 0, -1.15, 0.02);
      for (let k = 0; k < 7; k++) part(new THREE.BoxGeometry(0.008, 0.09, 0.008), t, g, -0.21 + k * 0.07, -1.19, 0.05, 0.6);
      return [rHand, [0, -0.06, 0], [0.05, 0, 0]]; },
    brush: (g) => { part(new THREE.CylinderGeometry(0.006, 0.008, 0.22, 6), M('#c99a5b', { rough: 0.6 }), g, 0, -0.1, 0); part(new THREE.SphereGeometry(0.012, 8, 6), M(tint(2), { rough: 0.5 }), g, 0, -0.22, 0); return [rHand, [0, -0.06, 0.012], [0, 0, 0]]; },
    palette: (g) => { part(new THREE.CylinderGeometry(0.11, 0.11, 0.012, seg(18)), M('#d9b483', { rough: 0.7 }), g, 0, 0, 0, Math.PI / 2);
      ['#e0473e', '#2f6fb0', '#f2c43b', '#3a9a6a', '#fbf6ea'].forEach((c, k) => part(new THREE.SphereGeometry(0.016, 8, 6), M(c, { rough: 0.4 }), g, Math.cos(k * 1.1) * 0.07, Math.sin(k * 1.1) * 0.07, 0.01));
      return [lHand, [0, -0.08, 0.04], [0, 0, 0]]; },
    flyers: (g) => { part(new THREE.BoxGeometry(0.15, 0.2, 0.03), M('#fbf6ea', { rough: 0.9 }), g); part(new THREE.BoxGeometry(0.15, 0.2, 0.004), M('#ffe27a', { rough: 0.9 }), g, 0, 0, 0.017); return [lHand, [0, -0.09, 0.035], [0, 0, 0]]; },
    flyer: (g) => { part(new THREE.BoxGeometry(0.15, 0.004, 0.21), M('#ffe27a', { rough: 0.9 }), g); return [rHand, [0, -0.1, 0.07], [0, 0, 0]]; },
    dumbbellL: (g) => dumbbell(g, lHand), dumbbellR: (g) => dumbbell(g, rHand),
    cup: (g) => { part(new THREE.CylinderGeometry(0.036, 0.031, 0.095, seg(14)), M('#f4efe6', { rough: 0.4 }), g, 0, 0, 0, Math.PI / 2); part(new THREE.CircleGeometry(0.031, seg(14)), M('#5b3a22', { rough: 0.3 }), g, 0, 0, 0.044); part(new THREE.TorusGeometry(0.022, 0.006, 6, 10), M('#f4efe6', { rough: 0.4 }), g, 0.04, 0, 0, 0, Math.PI / 2); return [rHand, [0, -0.07, 0.045], [0, 0, 0]]; },
    pad: (g) => { const k = M('#2a2f38', { rough: 0.5 }); part(new THREE.BoxGeometry(0.15, 0.05, 0.07), k, g); for (const sd of [-1, 1]) part(new THREE.SphereGeometry(0.035, 10, 8), k, g, sd * 0.07, -0.01, -0.02); part(new THREE.BoxGeometry(0.02, 0.012, 0.02), M('#ffc83d', { rough: 0.4 }), g, 0.035, 0.03, 0.005); return [spine, [0, 0.32, 0.31], [0.55, 0, 0]]; },
    trowel: (g) => { part(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), M('#3a9a6a', { rough: 0.6 }), g, 0, -0.04, 0); part(new THREE.BoxGeometry(0.06, 0.12, 0.008), M('#9aa3ad', { rough: 0.3, metal: 0.6 }), g, 0, -0.15, 0.01); return [rHand, [0, -0.06, 0], [0, 0, 0]]; },
    spoon: (g) => { const w = M('#c99a5b', { rough: 0.6 }); part(new THREE.CylinderGeometry(0.007, 0.007, 0.26, 6), w, g, 0, -0.12, 0); part(new THREE.SphereGeometry(0.022, 8, 6), w, g, 0, -0.26, 0).scale.set(1, 1.3, 0.5); return [rHand, [0, -0.06, 0], [0.2, 0, 0]]; },
    food: (g) => { const b = M('#e2b673', { rough: 0.8 }); part(new THREE.BoxGeometry(0.1, 0.1, 0.022), b, g, 0, 0, -0.018); part(new THREE.BoxGeometry(0.105, 0.105, 0.014), M('#6aa84f', { rough: 0.7 }), g); part(new THREE.BoxGeometry(0.1, 0.1, 0.022), b, g, 0, 0, 0.018); return [rHand, [0, -0.08, 0.045], [0, 0, 0.7]]; },
    leash: (g) => { part(new THREE.TorusGeometry(0.03, 0.008, 6, 12), M('#d9433a', { rough: 0.6 }), g); return [lHand, [0, -0.07, 0], [0, Math.PI / 2, 0]]; },
    umbrella: (g) => { const c = M(tint(1), { rough: 0.6 }), k = M('#2a2f38', { rough: 0.4 });
      part(new THREE.CylinderGeometry(0.009, 0.009, 0.95, 6), k, g, 0, -0.43, 0); part(new THREE.TorusGeometry(0.035, 0.009, 6, 10, Math.PI), k, g, 0, 0.04, 0.035, 0, Math.PI / 2, 0);
      part(new THREE.SphereGeometry(0.58, seg(18), seg(6), 0, Math.PI * 2, 0, Math.PI * 0.42), c, g, 0, -0.68, 0, Math.PI);
      return [rHand, [0, -0.04, 0], [-0.94, 0, -0.36]]; },   // tipped back over the head
  };
  function dumbbell(g, hand) { const k = M('#2f3640', { rough: 0.5, metal: 0.4 }); part(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), k, g, 0, 0, 0, 0, 0, Math.PI / 2); for (const sd of [-1, 1]) part(new THREE.CylinderGeometry(0.045, 0.045, 0.04, seg(12)), k, g, sd * 0.08, 0, 0, 0, 0, Math.PI / 2); return [hand, [0, -0.065, 0], [0, 0, 0]]; }
  const props = {};
  const showProps = (want) => {
    for (const n of want) if (!props[n] && PROP_BUILD[n]) { const g = new THREE.Group(); const [par, p, r, sc = 1] = PROP_BUILD[n](g); g.position.set(...p); g.rotation.set(...r); g.scale.setScalar(sc); par.add(g); props[n] = g; }
    for (const [n, g] of Object.entries(props)) g.visible = want.includes(n);
  };

  /* ---------- animation ---------- */
  const A = {
    phase: Math.random() * 6, t: 0, speed: 0, sitting: false, carrying: false, driving: false,
    gesture: null, gestureT: 0, blink: 2 + Math.random() * 3, lookT: 0,
    pose: null, poseT: 0, poseAge: 0, hold: null, holdAge: 0,   // a timed activity pose and an ongoing hold (player/poses.js)
    cur: {}, tgt: {},
  };
  const J = ['hipsY', 'spineX', 'spineY', 'spineZ', 'headX', 'headY',
    'lShX', 'lShZ', 'lElX', 'rShX', 'rShZ', 'rElX',
    'lLegX', 'lKneeX', 'rLegX', 'rKneeX', 'lAnkX', 'rAnkX', 'lLegZ', 'rLegZ'];
  J.forEach((k) => { A.cur[k] = 0; A.tgt[k] = 0; });
  A.cur.hipsY = 0.92;

  const api = {
    root, look, setExpression, legs, arms, hips, head, A,
    /** World position of a prop that is showing (e.g. the leash handle), else null. */
    propAt(name, out = new THREE.Vector3()) { const g = props[name]; return g?.visible ? g.getWorldPosition(out) : null; },
    motion(o) { Object.assign(A, o); },
    gesture(name, dur = 1.6) { A.gesture = name; A.gestureT = dur; A._gDur = dur; },
    update(dt) {
      A.t += dt;
      const P = A.pose && A.poseT > 0 && Object.prototype.hasOwnProperty.call(POSES, A.pose) ? POSES[A.pose] : null;
      const sp = P?.speed ?? A.speed, walkAmt = THREE.MathUtils.clamp(sp / 1.5, 0, 1), runAmt = THREE.MathUtils.clamp((sp - 2) / 2.6, 0, 1);
      A.phase += dt * Math.PI * 2 * (0.55 + sp * 0.34) * (sp > 0.05 ? 1 : 0);
      const ph = A.phase, T = A.tgt, sw = Math.sin(ph), co = Math.cos(ph);
      const breathe = Math.sin(A.t * 1.6) * 0.012;
      const legAmp = (0.42 + 0.5 * runAmt) * walkAmt, armAmp = (0.38 + 0.6 * runAmt) * walkAmt;
      T.hipsY = 0.92 - Math.abs(sw) * 0.022 * walkAmt * (1 + runAmt) - runAmt * 0.04;
      T.spineX = 0.04 * walkAmt + 0.18 * runAmt + breathe; T.spineY = sw * 0.11 * walkAmt; T.spineZ = Math.sin(A.t * 0.6) * 0.012 * (1 - walkAmt) + co * 0.03 * walkAmt;
      T.headX = -T.spineX * 0.6 + Math.sin(A.t * 0.4) * 0.02; T.headY = Math.sin(A.t * 0.35) * 0.1 * (1 - walkAmt) - T.spineY * 0.8;
      T.lLegX = -sw * legAmp; T.rLegX = sw * legAmp;
      T.lKneeX = 0.06 + Math.max(0, co) * (0.55 + 0.9 * runAmt) * walkAmt; T.rKneeX = 0.06 + Math.max(0, -co) * (0.55 + 0.9 * runAmt) * walkAmt;
      T.lAnkX = -T.lLegX * 0.35 - T.lKneeX * 0.3; T.rAnkX = -T.rLegX * 0.35 - T.rKneeX * 0.3;
      T.lLegZ = -0.03; T.rLegZ = 0.03;
      T.lShX = sw * armAmp; T.rShX = -sw * armAmp; T.lShZ = 0.1 + Math.sin(A.t * 1.3) * 0.01; T.rShZ = -0.1 - Math.sin(A.t * 1.3) * 0.01;
      T.lElX = -(0.15 + 0.2 * walkAmt + 1.1 * runAmt * walkAmt); T.rElX = T.lElX;
      if (A.sitting) {
        T.hipsY = 0.49; T.spineX = -0.03 + breathe; T.spineY = 0; T.spineZ = 0; T.headX = 0.02;
        T.lLegX = T.rLegX = -1.52; T.lKneeX = T.rKneeX = 1.5; T.lAnkX = T.rAnkX = 0.05; T.lLegZ = -0.05; T.rLegZ = 0.05;
        T.lShX = T.rShX = -0.35; T.lElX = T.rElX = -1.1;
        if (A.driving) { T.lShX = T.rShX = -1.05; T.lElX = T.rElX = -0.45; T.lLegX = -1.35; T.rLegX = -1.2; T.rKneeX = 1.2; T.hipsY = 0.5; }
      }
      if (A.carrying) { T.lShX = T.rShX = -1.2; T.lShZ = -0.2; T.rShZ = 0.2; T.lElX = T.rElX = -1.25; T.spineX -= 0.03; }
      box.visible = A.carrying;
      // activity pose, then an ongoing hold; walking off ends a pose that cannot walk
      const want = [];
      if (P) {
        A.poseAge += dt; A.poseT -= dt;
        const realWalk = THREE.MathUtils.clamp(A.speed / 1.5, 0, 1);
        if (A.poseT <= 0 || (!P.walk && !P.speed && realWalk > 0.3)) A.pose = null;
        else if (applyPose(A.pose, A.poseAge, T, { sitting: A.sitting, walking: P.speed ? 0 : realWalk })) want.push(...(P.props ?? []));
      }
      if (!A.pose && A.hold && Object.prototype.hasOwnProperty.call(POSES, A.hold)) { A.holdAge += dt; const H = applyPose(A.hold, A.holdAge, T, { sitting: A.sitting, walking: walkAmt }); if (H) want.push(...(H.props ?? [])); }
      if (want.length || Object.keys(props).length) showProps(want);
      if (A.gesture) {
        A.gestureT -= dt; const u = 1 - A.gestureT / (A._gDur || 1);
        if (A.gestureT <= 0) A.gesture = null;
        else if (A.gesture === 'wave') { T.rShX = -2.5; T.rShZ = -0.5 + Math.sin(A.t * 11) * 0.35; T.rElX = -0.7 + Math.sin(A.t * 11) * 0.3; }
        else if (A.gesture === 'use') { const k = Math.sin(Math.min(1, u) * Math.PI); T.rShX = -1.25 * k; T.rElX = -0.5 * k; T.spineX += 0.08 * k; }
        else if (A.gesture === 'nod') { T.headX = 0.25 * Math.sin(u * Math.PI * 3); }
        else if (A.gesture === 'cheer') { const k = Math.sin(Math.min(1, u * 1.4) * Math.PI) ** 0.5; T.lShX = T.rShX = -2.75 * k + Math.sin(A.t * 11) * 0.12 * k; T.lShZ = -0.35 * k; T.rShZ = 0.35 * k; T.lElX = T.rElX = -0.25 * k; T.headX = -0.18 * k; T.spineX -= 0.05 * k; T.hipsY += Math.max(0, Math.sin(A.t * 11)) * 0.03 * k; }
      }
      // damped blend
      const k = 1 - Math.exp(-dt * (A.sitting || A.carrying ? 9 : 14));
      for (const j of J) A.cur[j] += (T[j] - A.cur[j]) * k;
      const c = A.cur;
      hips.position.y = c.hipsY; spine.rotation.set(c.spineX, c.spineY, c.spineZ);
      headJ.rotation.set(c.headX, c.headY, 0);
      arms[0].sh.rotation.set(c.lShX, 0, c.lShZ); arms[0].elbow.rotation.x = c.lElX;
      arms[1].sh.rotation.set(c.rShX, 0, c.rShZ); arms[1].elbow.rotation.x = c.rElX;
      legs[0].hip.rotation.set(c.lLegX, 0, c.lLegZ); legs[0].knee.rotation.x = c.lKneeX; legs[0].ankle.rotation.x = c.lAnkX;
      legs[1].hip.rotation.set(c.rLegX, 0, c.rLegZ); legs[1].knee.rotation.x = c.rKneeX; legs[1].ankle.rotation.x = c.rAnkX;
      // blinking
      A.blink -= dt; const b = A.blink < 0.12 && A.blink > 0 ? 0.08 : 1;
      if (A.blink < 0) A.blink = 2 + Math.random() * 4;
      eyes.forEach((e) => (e.scale.y = (e.userData.baseScale ?? 1) * b));
    },
    dispose() { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); },
  };
  setExpression(look.expression ?? 'neutral');
  api.update(0.016);
  A.cur.hipsY = A.tgt.hipsY;
  return api;
}
