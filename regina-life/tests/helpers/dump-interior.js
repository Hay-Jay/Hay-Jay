/** A plain-data snapshot of an interior (for parity tests): interactables by id, collider rects with heights, bounds, spawn/exit, lights and mesh counts. */
const r3 = (v) => Math.round(v * 1000) / 1000;
export function dumpInterior(it) {
  const interactables = {}; for (const i of it.interactables) interactables[i.id] = { x: r3(i.x), z: r3(i.z), radius: r3(i.radius), label: typeof i.label === 'function' ? i.label({}) : i.label };
  const rects = it.colliders.rects.map((r) => ({ x0: r3(r.x0), z0: r3(r.z0), x1: r3(r.x1), z1: r3(r.z1), h: r3(r.h), tag: r.tag ?? null })).sort((a, b) => a.x0 - b.x0 || a.z0 - b.z0 || a.x1 - b.x1 || a.z1 - b.z1);
  let meshes = 0, lightsN = 0; const mats = new Set(); const lights = [];
  it.group.traverse((o) => { if (o.isMesh) { meshes++; [].concat(o.material).forEach((m) => m && mats.add(m)); } if (o.isLight) { lightsN++; lights.push({ x: r3(o.position.x), y: r3(o.position.y), z: r3(o.position.z), intensity: r3(o.intensity), distance: r3(o.distance) }); } });
  lights.sort((a, b) => a.z - b.z || a.x - b.x);
  return { kind: it.kind, bounds: it.bounds && Object.fromEntries(Object.entries(it.bounds).map(([k, v]) => [k, r3(v)])), spawn: it.spawn, exit: it.exit, interactables, colliders: rects, lights, counts: { meshes, materials: mats.size, lights: lightsN } };
}
