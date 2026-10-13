/**
 * Wall visibility modes for home interiors, the room name decals and the decorative wall pieces. OWNED BY work package B2.
 *
 *   'walk' : full walls, ceiling and ceiling fixtures (the only mode used while walking around)
 *   'up'   : full walls, ceiling and ceiling fixtures hidden (today's overhead view of the Studio)
 *   'cut'  : partition walls and the SOUTH exterior wall lowered to CUT_H (0.9 m), door lintels hidden, ceiling hidden (the Home view of multi-room homes)
 *   'down' : every wall hidden
 * The overhead camera never rotates (north is screen-up), so "the wall nearest the camera" is the south wall and only that exterior wall is cut.
 *
 * Wall pieces carry `userData.wall = { role, side }`: role 'exterior' | 'partition' | 'lintel', side 'N' | 'S' | 'E' | 'W' (exterior) or null.
 * Things that hang on a wall (windows, the front door, signs, the garage roller door, wall-mounted fixtures such as the light switch) are `parts.openings`;
 * they carry `userData.wall = { role, side }` with role 'window' | 'door' | 'sign' | 'mounted' and the side of the wall they are mounted on (null: a
 * partition), and follow that wall: gone when it is hidden or cut (a window or a switch plate would float above a 0.9 m wall), except a door, which is
 * lowered with its wall so the cutaway still shows where you come in.
 *
 * applyWallMode(parts, mode) only changes visibility and scale (no allocation), is idempotent, and works from any mode to any other.
 */
import * as THREE from 'three';
import { kit as modelKit } from './furnitureModels.js';
import { WALL_T, CEIL_H, FIXTURE_KINDS } from '../data/homes.js';

export const WALL_MODES = ['walk', 'up', 'cut', 'down'];
/** Height of a lowered wall in the 'cut' mode (waist high: a person at the sofa is still visible from above, nothing is lost behind a wall). */
export const CUT_H = 0.9;

/** The wall side a window or sign faces away from, given the wall's inward normal angle `ry` (north 0, south PI, west PI/2, east -PI/2, as data/homes.js defines it). */
export function sideOfNormal(ry = 0) {
  const a = ((((ry + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;   // (-PI, PI]
  if (Math.abs(a) < Math.PI / 4) return 'N'; if (Math.abs(a) > (3 * Math.PI) / 4) return 'S'; return a > 0 ? 'W' : 'E';
}
/** The side of the house (relative to the bbox centre) a point on the outer wall lies on: 'N' | 'S' | 'E' | 'W'. */
export function sideOfPoint(bbox, x, z) {
  const dx = (x - (bbox.x0 + bbox.x1) / 2) / Math.max(1e-6, bbox.x1 - bbox.x0), dz = (z - (bbox.z0 + bbox.z1) / 2) / Math.max(1e-6, bbox.z1 - bbox.z0);
  return Math.abs(dz) >= Math.abs(dx) ? (dz > 0 ? 'S' : 'N') : (dx > 0 ? 'E' : 'W');
}

/**
 * How tall the wall described by `tag` ({ role, side }) stands in `mode`, in metres: CEIL_H full, CUT_H lowered, 0 hidden.
 * This is the one place the rules of the four modes live.
 */
export function wallHeightIn(mode, tag) {
  if (mode === 'down') return 0;
  if (mode !== 'cut') return CEIL_H;
  const role = tag?.role, side = tag?.side ?? null;
  if (role === 'lintel') return 0;                                   // a lintel over a doorway has nothing to hold up at 0.9 m
  if (role === 'partition' || (role === 'exterior' && side === 'S')) return CUT_H;
  return CEIL_H;
}

/** Height of the wall an opening (window, door, sign...) is mounted on: a partition when it has no side, else the exterior wall of that side. */
const hostHeight = (mode, tag) => wallHeightIn(mode, { role: tag?.side ? 'exterior' : 'partition', side: tag?.side ?? null });

/**
 * Squash a floor-standing piece so it ends at `h` metres. It is scaled about the floor (y = 0), so a mesh whose origin is its centre (the front door)
 * and one whose geometry is baked in world coordinates (the roller door) both stay on the floor. `fullH` is the piece's whole height.
 */
function lowerTo(m, h, fullH) {
  const base = (m.userData.base ??= { y: m.position.y, sy: m.scale.y });
  const s = h >= fullH ? 1 : Math.max(0.001, h / fullH); m.scale.y = base.sy * s; m.position.y = base.y * s;
}
const heightOf = (m) => { const t = m.userData.wall?.height ?? m.geometry?.parameters?.height; if (t) return t; m.geometry?.computeBoundingBox?.(); return m.geometry?.boundingBox?.max.y ?? 1; };

export function applyWallMode(parts, mode) {
  if (!parts || !WALL_MODES.includes(mode)) return;
  const walk = mode === 'walk';
  for (const m of parts.walls || []) {
    const h = wallHeightIn(mode, m.userData.wall); m.visible = h > 0; m.scale.y = h > 0 ? h / CEIL_H : 1;   // the box's origin is at its base, so scale.y lowers it
  }
  for (const m of parts.lintels || []) { const h = wallHeightIn(mode, m.userData.wall); m.visible = h > 0; m.scale.y = 1; }
  for (const m of parts.trims || []) m.visible = mode !== 'down';           // skirting hugs the wall bases: no walls, no skirting
  for (const m of parts.openings || []) {
    const tag = m.userData.wall, h = hostHeight(mode, tag);
    if (tag?.role === 'door') { m.visible = h > 0; lowerTo(m, h, heightOf(m)); } else m.visible = h >= CEIL_H;
  }
  for (const c of parts.ceilings || []) c.visible = walk;
  for (const c of parts.ceilFixtures || []) c.visible = walk;
  if (parts.yard) parts.yard.visible = !walk;
  if (parts.labels) parts.labels.visible = !walk;
}

/* ============================================================================================ room name decals */

const LABEL_H = 0.52, LABEL_Y = 0.07;   // a pill 52 cm high lying 7 cm above the floor: above the thickest rug (the shag rug is 5 cm) and the contact shadows (1.2 cm)

/**
 * Where a room's label goes: the free spot closest to the middle of the room's place rect whose pill clears every fixture (and the doorway approaches),
 * so a label never sits under a bed or a car you cannot move. Pure: rects in, point out.
 */
export function labelSpot(room, w, obstacles, h = LABEL_H) {
  const p = room.place, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, pad = 0.12;
  const hw = Math.min(w, p.x1 - p.x0) / 2, hh = h / 2;
  const clear = (x, z) => obstacles.every((o) => x + hw + pad <= o.x0 || x - hw - pad >= o.x1 || z + hh + pad <= o.z0 || z - hh - pad >= o.z1);
  if (clear(cx, cz)) return { x: cx, z: cz };
  let best = null, bd = Infinity;
  for (let x = p.x0 + hw; x <= p.x1 - hw + 1e-9; x += 0.25) for (let z = p.z0 + hh; z <= p.z1 - hh + 1e-9; z += 0.25) {
    if (!clear(x, z)) continue; const d = Math.hypot((x - cx) * 0.8, z - cz); if (d < bd) { bd = d; best = { x, z }; }
  }
  return best ?? { x: cx, z: cz };
}

/** A pill-shaped name plate on a transparent canvas; returns { canvas, aspect } (width / height). */
function plateCanvas(text) {
  const H = 96, font = '700 54px "Nunito", "Segoe UI", system-ui, sans-serif', c = document.createElement('canvas'), probe = c.getContext('2d');
  probe.font = font; const tw = Math.ceil(probe.measureText(text).width), W = Math.max(H * 2, tw + 72);
  c.width = W; c.height = H; const g = c.getContext('2d');
  g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255, 250, 240, 0.82)';
  const r = H / 2 - 2; g.beginPath(); g.moveTo(r + 2, 2); g.lineTo(W - r - 2, 2); g.arc(W - r - 2, H / 2, r, -Math.PI / 2, Math.PI / 2); g.lineTo(r + 2, H - 2); g.arc(r + 2, H / 2, r, Math.PI / 2, -Math.PI / 2); g.closePath(); g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(94, 70, 48, 0.35)'; g.stroke();
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4a3a2b'; g.fillText(text, W / 2, H / 2 + 3);
  return { canvas: c, aspect: W / H };
}

/**
 * One flat name plate per room, lying on the floor, text running east-west with north at the top of the screen. Only for homes with two or more rooms
 * (the Studio's overhead view must stay as it was). Returns a THREE.Group (userData.labels = [{ room, mesh }]) or null; the caller adds it to the
 * interior and applyWallMode shows it in the overhead modes only. Textures, materials and geometries go through `kit.track`.
 */
export function buildRoomLabels(geo, kit) {
  if (!geo || !Array.isArray(geo.rooms) || geo.rooms.length < 2) return null;
  const group = new THREE.Group(); group.name = 'room-labels'; group.userData.labels = [];
  const track = kit.track || ((o) => o);
  for (const room of geo.rooms) {
    const text = String(room.name || room.id); if (!text) continue;
    const { canvas, aspect } = plateCanvas(text), tex = track(new THREE.CanvasTexture(canvas)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const maxW = Math.max(1, room.place.x1 - room.place.x0 - 0.2), w = Math.min(LABEL_H * aspect, maxW), h = w / aspect;
    const obstacles = [...geo.colliders, ...geo.doorways.map((d) => (d.axis === 'x' ? { x0: d.x - d.w / 2, x1: d.x + d.w / 2, z0: d.z - 1.0, z1: d.z + 1.0 } : { x0: d.x - 1.0, x1: d.x + 1.0, z0: d.z - d.w / 2, z1: d.z + d.w / 2 }))];
    const spot = labelSpot(room, w, obstacles, h);
    const mat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2)), mat);   // +y of the plane (the top of the text) points to -z, north
    mesh.position.set(spot.x, LABEL_Y, spot.z); mesh.renderOrder = 2; mesh.name = `label:${room.id}`; mesh.userData.room = room.id; group.add(mesh); group.userData.labels.push({ room: room.id, mesh });
  }
  return group.children.length ? group : null;
}

/* ============================================================================================ decorative wall pieces */

/**
 * The garage's roller door: a ribbed steel panel with a trim frame and a row of little windows, on BOTH faces of every wall run whose layout wall
 * has `style: 'roller'`, baked to one mesh per material (tagged role 'door' so the cutaway lowers it with its wall). Returns the meshes.
 */
const ROLLER_H = 2.35;   // the panel; its head trim makes the whole door ROLLER_H + 0.12
function buildRollerDoors(geo, kit) {
  const runs = geo.walls.filter((r) => geo.layout.walls?.find((w) => w.id === r.wallId)?.style === 'roller'); if (!runs.length) return [];
  const m = modelKit((color, o) => kit.mat(color, { roughness: o.r ?? 0.8, metalness: o.mt ?? 0, vertexColors: !!o.vc }), { vertexColors: true }), PH = ROLLER_H;
  for (const run of runs) {
    const inRoom = run.rooms.map((id) => geo.rooms.find((r) => r.id === id)).find(Boolean);   // centre the door on the room it belongs to
    const along0 = run.axis === 'x' ? (inRoom ? (inRoom.floor.x0 + inRoom.floor.x1) / 2 : (run.x0 + run.x1) / 2) : (inRoom ? (inRoom.floor.z0 + inRoom.floor.z1) / 2 : (run.z0 + run.z1) / 2);
    const runLen = run.axis === 'x' ? run.x1 - run.x0 : run.z1 - run.z0, PW = Math.min(3.2, runLen - 0.8);
    const box = (du, h, dw, color, u, y, w, o) => (run.axis === 'x' ? m.b(du, h, dw, color, along0 + u, y, run.c + w, o) : m.b(dw, h, du, color, run.c + w, y, along0 + u, o));
    for (const sg of [-1, 1]) {   // both faces
      const f = sg * (WALL_T / 2 + 0.03);
      box(PW, PH, 0.04, '#dfe2e5', 0, 0, f, { r: 0.55, mt: 0.2 });
      for (let i = 1; i < 12; i++) box(PW, 0.014, 0.016, '#a9b0b8', 0, (PH * i) / 12, f + sg * 0.02);   // ribs
      for (const u of [-PW / 2 - 0.06, PW / 2 + 0.06]) box(0.12, PH + 0.12, 0.05, '#ffffff', u, 0, f);   // jamb trim
      box(PW + 0.24, 0.12, 0.05, '#ffffff', 0, PH, f);                                                    // head trim
      for (let i = 0; i < 4; i++) box(0.5, 0.2, 0.012, '#6f8aa0', -0.9 + i * 0.6, PH - 0.4, f + sg * 0.024, { mt: 0.3, r: 0.3 });   // little windows along the top rail
      box(0.34, 0.06, 0.05, '#2b2e33', 0, 0.8, f + sg * 0.03);                                            // handle
    }
  }
  const baked = m.bake(false), out = [];
  for (const o of [...baked.children]) { baked.remove(o); o.geometry && kit.track?.(o.geometry); o.userData.wall = { role: 'door', side: runs[0].side, height: ROLLER_H + 0.12 }; o.name = 'roller-door'; out.push(o); }
  return out;
}

/**
 * Everything the cutaway needs beyond the wall boxes, added to an interior's `parts`: `parts.labels` (room name decals; null for single-room homes),
 * `parts.openings` gets the roller door pieces, `parts.foundation` is the slab under a multi-room footprint. Windows, the front door and signs are tagged by the builder itself (it created them).
 * @param parts the interior's parts (group, wallGroup, openings...)  @param geo deriveHome(layout)  @param kit the interior kit (mat, track)
 */
export function buildWallExtras(parts, geo, kit) {
  parts.openings = parts.openings || [];
  for (const f of geo.fixtures) {   // wall-mounted fixtures (kinds with a mount height `y`: the light switch) follow the wall they hang on
    if (!(FIXTURE_KINDS[f.kind]?.y > 0)) continue; const g = parts.group.getObjectByName(`fixture:${f.id}`); if (!g) continue;
    let best = null, bd = Infinity; for (const w of geo.walls) { const d = Math.hypot(Math.max(w.x0 - f.x, 0, f.x - w.x1), Math.max(w.z0 - f.z, 0, f.z - w.z1)); if (d < bd) { bd = d; best = w; } }
    if (best) { g.userData.wall = { role: 'mounted', side: best.role === 'partition' ? null : best.side }; parts.openings.push(g); }
  }
  if (geo.rooms.length > 1) {   // a foundation slab under the whole footprint: with the walls hidden ('down'), the gaps between the rooms show concrete, not the ground of the stage
    const b = geo.bbox, g = new THREE.PlaneGeometry(b.x1 - b.x0 + 2 * WALL_T, b.z1 - b.z0 + 2 * WALL_T).rotateX(-Math.PI / 2);
    const slab = kit.add(g, kit.mat('#bdb6a8', { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }), (b.x0 + b.x1) / 2, -0.02, (b.z0 + b.z1) / 2, { cast: false, recv: true, parent: parts.group }); slab.name = 'foundation'; parts.foundation = slab;
  }
  for (const o of buildRollerDoors(geo, kit)) { parts.wallGroup.add(o); parts.openings.push(o); }
  parts.labels = buildRoomLabels(geo, kit);
  if (parts.labels) parts.group.add(parts.labels);
  return parts;
}

