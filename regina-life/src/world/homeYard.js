/**
 * Scenery around a layout with a `yard` (lawn, low fence, trees, stepping-stone path, mailbox, and a driveway to a roller-door garage).
 * OWNED BY work package B2. Meshes only: no lights, no colliders, nothing the player can touch. The interior shows it only in the overhead views
 * (applyWallMode / setOverhead), where it is what makes the Bungalow read as a house on a lot rather than a floor plan on a lawn disc.
 *
 *   planYard(layout) -> the pure plan (rects, fence gates, stones, trees, mailbox...), no THREE, so tests can check the layout of the yard itself
 *   buildYard(layout, kit) -> THREE.Group | null  (null when the layout has no `yard`)
 *
 * The lawn is ONE mesh with a hole where the house stands (so it never fights the floors for the same pixels); everything else is queued on the
 * modelling kit and baked to one mesh per material (about a dozen draw calls for the whole yard, however many pickets the fence has).
 */
import * as THREE from 'three';
import { kit as modelKit } from './furnitureModels.js';
import { lotOf } from '../core/lot.js';
import { mulberry32 } from '../core/rng.js';
import { WALL_T } from '../data/homes.js';

const FENCE_INSET = 0.45, FENCE_H = 0.88, PICKET_STEP = 0.22, POST_STEP = 2.4, GATE_W = 1.3, DRIVE_GATE_W = 3.8, DRIVE_W = 3.4;
const TREE_BAND = 1.35;   // trees stand this far outside the house's outer wall face (the margin is 3 m: a 1 m canopy clears both the wall and the fence)
const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const grow = (r, d) => ({ x0: r.x0 - d, z0: r.z0 - d, x1: r.x1 + d, z1: r.z1 + d });

/** The side of a rectangle a point is nearest to, with the outward normal: { side: 'N' | 'S' | 'E' | 'W', nx, nz }. */
function nearestSide(r, x, z) {
  const d = { N: Math.abs(z - r.z0), S: Math.abs(z - r.z1), W: Math.abs(x - r.x0), E: Math.abs(x - r.x1) };
  const side = Object.keys(d).reduce((a, b) => (d[b] < d[a] ? b : a));
  return { side, nx: side === 'E' ? 1 : side === 'W' ? -1 : 0, nz: side === 'S' ? 1 : side === 'N' ? -1 : 0 };
}

/**
 * The pure plan of a yard. All numbers are world metres.
 *   house   : the outer face of the walls (bbox grown by 0.2)       hole: the bbox grown by 0.1, the lawn's hole (it runs under the walls)
 *   fence   : the rectangle the fence follows (yardRect inset)       gates: openings in it [{ side, at, w }] (`at` = coordinate along that side)
 *   door    : { side, nx, nz, x, z, w } the front door and the way out;  path: stepping stones [{ x, z, w, d, rot }] from the door to the lawn edge
 *   drive   : { x0, z0, x1, z1 } | null  the garage driveway, from a roller-door wall to the lawn edge
 *   trees   : [{ x, z, kind, scale }] (2 to 4), mailbox: { x, z, nx, nz }, shrubs: [{ x, z, r }]
 * Null when the layout has no yard.
 */
export function planYard(layout) {
  const lot = lotOf(layout), yr = lot.yardRect; if (!yr) return null;
  const bbox = lot.bbox, house = grow(bbox, WALL_T), hole = grow(bbox, WALL_T / 2), fence = grow(yr, -FENCE_INSET), rnd = mulberry32(hashStr(layout.id));
  const dp = layout.entry?.door ?? { x: (bbox.x0 + bbox.x1) / 2, z: bbox.z1, w: 1.6 };
  const { side, nx, nz } = nearestSide(bbox, dp.x, dp.z), horiz = nz !== 0, out = nx + nz;   // `horiz`: the door's wall runs along x; `out` is +1 or -1 along the normal axis
  const door = { side, nx, nz, x: dp.x, z: dp.z, w: dp.w ?? 1.6 };
  const along = horiz ? door.x : door.z;                                                  // the door's coordinate along its wall
  const edge = horiz ? (nz > 0 ? yr.z1 : yr.z0) : (nx > 0 ? yr.x1 : yr.x0);              // the lawn edge the path runs to
  const wallFace = horiz ? (nz > 0 ? house.z1 : house.z0) : (nx > 0 ? house.x1 : house.x0);
  const at = (u, v) => (horiz ? { x: u, z: v } : { x: v, z: u });                         // (along the wall, outward coordinate) -> world
  const gates = [{ side, at: along, w: GATE_W }];

  /* stepping stones: about one every 0.58 m from just beyond the doorstep to 0.3 m short of the lawn edge, alternating either side of the line */
  const path = [], first = wallFace + out * 0.9, last = edge - out * 0.3, n = Math.max(3, Math.round(Math.abs(last - first) / 0.58) + 1);
  for (let i = 0; i < n; i++) {
    const p = at(along + (i % 2 ? 0.1 : -0.1), first + ((last - first) * i) / (n - 1)); path.push({ x: p.x, z: p.z, w: 0.52 + rnd() * 0.08, d: 0.38 + rnd() * 0.06, rot: (rnd() - 0.5) * 0.5 });
  }

  /* the driveway: from the outside of a roller-door wall (the garage's) to the lawn edge, centred on the garage; the fence opens for it */
  let drive = null; const roller = (layout.walls || []).find((w) => w.style === 'roller');
  if (roller) {
    const wh = Math.abs(roller.z1 - roller.z0) < 1e-6, c = wh ? roller.z0 : roller.x0, mid = wh ? (bbox.z0 + bbox.z1) / 2 : (bbox.x0 + bbox.x1) / 2;
    const rs = wh ? (c > mid ? 'S' : 'N') : (c > mid ? 'E' : 'W'), faces = (f) => Math.abs(f - (c - WALL_T / 2)) < 0.1 || Math.abs(f - (c + WALL_T / 2)) < 0.1;
    const wlo = wh ? Math.min(roller.x0, roller.x1) : Math.min(roller.z0, roller.z1), whi = wh ? Math.max(roller.x0, roller.x1) : Math.max(roller.z0, roller.z1);
    const overlap = (r) => (wh ? Math.min(r.floor.x1, whi) - Math.max(r.floor.x0, wlo) : Math.min(r.floor.z1, whi) - Math.max(r.floor.z0, wlo));
    const room = lot.rooms.find((r) => (wh ? faces(r.floor.z1) || faces(r.floor.z0) : faces(r.floor.x1) || faces(r.floor.x0)) && overlap(r) > 0.5);   // the room that stands behind the roller door
    const u0 = room ? (wh ? (room.floor.x0 + room.floor.x1) / 2 : (room.floor.z0 + room.floor.z1) / 2) : (wh ? (roller.x0 + roller.x1) / 2 : (roller.z0 + roller.z1) / 2);
    drive = wh ? { axis: 'z', x0: u0 - DRIVE_W / 2, x1: u0 + DRIVE_W / 2, z0: rs === 'S' ? c + WALL_T / 2 : yr.z0, z1: rs === 'S' ? yr.z1 : c - WALL_T / 2 }
      : { axis: 'x', x0: rs === 'E' ? c + WALL_T / 2 : yr.x0, x1: rs === 'E' ? yr.x1 : c - WALL_T / 2, z0: u0 - DRIVE_W / 2, z1: u0 + DRIVE_W / 2 };
    gates.push({ side: rs, at: u0, w: DRIVE_GATE_W });
  }

  /* the mailbox stands at the lawn edge, 1.5 m beside the path on the side away from the driveway */
  const driveAt = drive ? (horiz ? (drive.x0 + drive.x1) / 2 : (drive.z0 + drive.z1) / 2) : null, mp = at(along + (driveAt !== null && driveAt > along ? -1.5 : 1.5), edge - out * 0.2);
  const mailbox = { x: mp.x, z: mp.z, nx, nz };

  /* trees: the corners of the band between house and fence, 2 to 4 of them, none next to the path, the driveway or the mailbox */
  const band = grow(bbox, WALL_T + TREE_BAND), corners = [[band.x0, band.z0], [band.x1, band.z0], [band.x0, band.z1], [band.x1, band.z1]];
  const free = ([x, z]) => path.every((p) => Math.hypot(p.x - x, p.z - z) > 1.9) && (!drive || x < drive.x0 - 1.6 || x > drive.x1 + 1.6 || z < drive.z0 - 1.6 || z > drive.z1 + 1.6) && Math.hypot(mailbox.x - x, mailbox.z - z) > 1.9;
  const want = 2 + Math.floor(rnd() * 3), order = corners.map((c) => [rnd(), c]).sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  const trees = order.filter(free).slice(0, want).map(([x, z], i) => ({ x: x + (rnd() - 0.5) * 0.5, z: z + (rnd() - 0.5) * 0.5, kind: i % 2 ? 'spruce' : 'round', scale: 0.85 + rnd() * 0.15 }));
  for (const c of corners) { if (trees.length >= 2) break; if (!trees.some((t) => Math.hypot(t.x - c[0], t.z - c[1]) < 1)) trees.push({ x: c[0], z: c[1], kind: trees.length % 2 ? 'spruce' : 'round', scale: 0.9 }); }

  /* two shrubs flank the doorstep */
  const shrubs = [-1, 1].map((s) => { const p = at(along + s * (door.w / 2 + 0.7), wallFace + out * 0.4); return { x: p.x, z: p.z, r: 0.34 + rnd() * 0.06 }; });
  return { lot, bbox, house, hole, yardRect: yr, fence, gates, door, horiz, out, along, edge, wallFace, path, drive, trees, mailbox, shrubs };
}

/** Stripe texture for the lawn: 2.4 m tiles of two mown stripes with a little speckle. */
function lawnTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#84c46d'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#8fcf79'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 90; i++) g.fillRect((i * 37) % 126, (i * 53) % 126, 2, 3);
  g.fillStyle = 'rgba(40,90,40,0.06)'; for (let i = 0; i < 90; i++) g.fillRect((i * 71) % 126, (i * 29) % 126, 3, 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.repeat.set(1 / 2.4, 1 / 2.4); return t;
}

/** The lawn: yardRect with a rectangular hole for the house, one mesh, UVs in metres so the stripes are 1.2 m wide. Shape y = -world z (rotateX(-PI/2) maps y to -z). */
function lawnGeometry(plan) {
  const { yardRect: o, hole: h } = plan, pts = (r) => [new THREE.Vector2(r.x0, -r.z0), new THREE.Vector2(r.x1, -r.z0), new THREE.Vector2(r.x1, -r.z1), new THREE.Vector2(r.x0, -r.z1)];
  const shape = new THREE.Shape(pts(o)); shape.holes.push(new THREE.Path(pts(h)));
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

export function buildYard(layout, kit) {
  if (!layout?.yard) return null;
  const plan = planYard(layout); if (!plan) return null;
  const track = kit.track || ((o) => o), group = new THREE.Group(); group.name = 'yard'; group.userData.plan = plan;

  const lawn = new THREE.Mesh(track(lawnGeometry(plan)), track(new THREE.MeshStandardMaterial({ map: track(lawnTexture()), roughness: 1 })));
  lawn.name = 'lawn'; lawn.receiveShadow = true; group.add(lawn);

  // everything else is queued on one modelling kit and baked to one mesh per material. `po`: a flat surface laid on the lawn, pulled towards the camera in depth.
  const m = modelKit((color, o) => (o.po
    ? track(new THREE.MeshStandardMaterial({ color, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
    : kit.mat(color, { roughness: o.r ?? 0.85, metalness: o.mt ?? 0, flatShading: !!o.f })));
  /** A box on a wall-aligned frame: `horiz` walls run along x (u = x, v = z), the others along z (u = z, v = x); du x dv are its sizes along u and v. */
  const frame = (horiz) => (du, h, dv, col, u, y, v, o) => (horiz ? m.b(du, h, dv, col, u, y, v, o) : m.b(dv, h, du, col, v, y, u, o));
  const fb = frame(plan.horiz), { door, out, along, wallFace, edge } = plan;

  /* ---- the fence: pickets, two rails, posts with caps; gaps for the gates ---- */
  const F = plan.fence, gap = (side, a) => plan.gates.some((g) => g.side === side && Math.abs(a - g.at) < g.w / 2 + 0.05);
  const side = (name, a0, a1, c) => {   // one side of the fence: `a` runs along it between a0 and a1, `c` is the fixed coordinate of the other axis
    const b = frame(name === 'N' || name === 'S');
    for (let a = a0 + PICKET_STEP / 2; a < a1; a += PICKET_STEP) if (!gap(name, a)) { b(0.075, FENCE_H, 0.025, '#f7f2e8', a, 0, c, { r: 0.7 }); b(0.085, 0.05, 0.035, '#f7f2e8', a, FENCE_H, c, { r: 0.7 }); }
    let s = a0; const segs = [];
    for (const [g0, g1] of plan.gates.filter((g) => g.side === name).map((g) => [g.at - g.w / 2, g.at + g.w / 2]).sort((p, q) => p[0] - q[0])) { if (g0 > s) segs.push([s, g0]); s = Math.max(s, g1); }
    if (a1 > s) segs.push([s, a1]);
    for (const [s0, s1] of segs) {
      for (const y of [0.2, 0.55]) b(s1 - s0, 0.05, 0.04, '#efe8d8', (s0 + s1) / 2, y, c - 0.03, { r: 0.8 });
      const n = Math.max(1, Math.round((s1 - s0) / POST_STEP));
      for (let i = 0; i <= n; i++) { const a = s0 + ((s1 - s0) * i) / n; b(0.1, 1.0, 0.1, '#e4dac4', a, 0, c, { r: 0.8 }); b(0.14, 0.04, 0.14, '#c9a878', a, 1.0, c, { r: 0.7 }); }
    }
  };
  side('N', F.x0, F.x1, F.z0); side('S', F.x0, F.x1, F.z1); side('W', F.z0, F.z1, F.x0); side('E', F.z0, F.z1, F.x1);

  /* ---- the way in: a doorstep slab, then stepping stones out to the lawn edge ---- */
  fb(door.w + 0.1, 0.05, 0.6, '#d3cbbb', along, 0, wallFace + out * 0.3, { po: 1 });
  for (const p of plan.path) m.ce(p.w, p.d, 0.03, '#cfc7b8', p.x, 0, p.z, 10, { po: 1, ry: p.rot });
  if (plan.drive) {   // a concrete strip with three expansion joints
    const d = plan.drive, w = d.x1 - d.x0, l = d.z1 - d.z0, cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2;
    m.b(w, 0.025, l, '#bdb9b0', cx, 0, cz, { po: 1 });
    for (let i = 1; i <= 3; i++) { const t = i / 4; if (d.axis === 'z') m.b(w, 0.03, 0.04, '#a39f96', cx, 0, d.z0 + l * t, { po: 1 }); else m.b(0.04, 0.03, l, '#a39f96', d.x0 + w * t, 0, cz, { po: 1 }); }   // joints run across the way the car drives
  }

  /* ---- shrubs by the door and the mailbox at the lawn edge ---- */
  for (const s of plan.shrubs) { m.ico(s.r * 2, s.r * 1.5, s.r * 2, '#5fa564', s.x, 0, s.z); m.ico(s.r * 1.3, s.r * 1.1, s.r * 1.3, '#79bd6a', s.x + s.r * 0.35, s.r * 0.9, s.z - s.r * 0.2); }
  { const mb = plan.mailbox, b = frame(plan.horiz), u = plan.horiz ? mb.x : mb.z, v = plan.horiz ? mb.z : mb.x;
    b(0.09, 1.0, 0.09, '#7a5a3e', u, 0, v); b(0.26, 0.2, 0.44, '#2f6fb5', u, 1.0, v); b(0.28, 0.05, 0.46, '#255a95', u, 1.2, v);
    b(0.025, 0.17, 0.09, '#d9553f', u + 0.16, 1.0, v - out * 0.1); }   // a red flag on the side

  /* ---- trees ---- */
  for (const t of plan.trees) {
    const s = t.scale;
    if (t.kind === 'round') {
      m.c(0.09 * s, 0.15 * s, 1.7 * s, '#7a5a3e', t.x, 0, t.z, 7);
      m.ico(1.9 * s, 1.45 * s, 1.9 * s, '#5aa564', t.x, 1.25 * s, t.z); m.ico(1.5 * s, 1.2 * s, 1.5 * s, '#74b968', t.x + 0.08, 2.15 * s, t.z - 0.06); m.ico(1.0 * s, 0.9 * s, 1.0 * s, '#8cc875', t.x - 0.05, 2.9 * s, t.z + 0.05);
    } else {
      m.c(0.07 * s, 0.12 * s, 1.0 * s, '#6b4f36', t.x, 0, t.z, 7);
      m.cone(0.95 * s, 1.7 * s, '#3c8454', t.x, 0.7 * s, t.z, 8, { f: true }); m.cone(0.72 * s, 1.5 * s, '#47965f', t.x, 1.65 * s, t.z, 8, { f: true }); m.cone(0.5 * s, 1.3 * s, '#52a46a', t.x, 2.6 * s, t.z, 8, { f: true });
    }
  }

  const baked = m.bake(false); baked.name = 'yard-detail'; baked.traverse((o) => { if (o.geometry) track(o.geometry); });
  group.add(baked);
  return group;
}
