/**
 * Furniture thumbnails: each model is rendered once, on a transparent background, from a 3/4 isometric angle with soft light, by a small
 * offscreen WebGL renderer that is created lazily, drains a priority queue ONE item per idle slot (so it never janks) and is released when idle.
 * Without WebGL or a DOM (tests, old browsers) every request just resolves null and the UI keeps its colour swatch.
 *   const thumbs = makeThumbs({ size: 160 });   thumbs.peek(type) -> dataURL|null    thumbs.get(type) -> Promise<dataURL|null>
 * The renderer, scheduler and clock are injectable so the queue/cache logic is unit-tested without a GPU.
 */
import * as THREE from 'three';
import { furnitureModel } from '../world/furnitureModels.js';

/** Camera direction for the 3/4 view (x, y, z from the model's centre; the model's front faces +z). */
export const ISO_DIR = [0.8, 0.85, 1];

/** Aim an orthographic camera at `box` from `dir` and size its frustum so the box fills a square view with `pad` margin. Pure THREE maths. */
export function frameBox(cam, box, dir = ISO_DIR, pad = 1.1) {
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.25, box.getBoundingSphere(new THREE.Sphere()).radius), d = new THREE.Vector3(...dir).normalize();
  cam.position.copy(c).addScaledVector(d, r * 4); cam.up.set(0, 1, 0); cam.lookAt(c); cam.updateMatrixWorld(true);
  const inv = cam.matrixWorldInverse.copy(cam.matrixWorld).invert(), v = new THREE.Vector3();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { v.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  const half = Math.max(x1 - x0, y1 - y0) / 2 * pad, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  cam.left = cx - half; cam.right = cx + half; cam.top = cy + half; cam.bottom = cy - half; cam.near = 0.01; cam.far = r * 10; cam.updateProjectionMatrix();
  return cam;
}

const disposeTree = (o) => o.traverse((n) => { n.geometry?.dispose?.(); for (const m of [].concat(n.material ?? [])) { m.map?.dispose?.(); m.dispose?.(); } });

/** A soft elliptical contact shadow (radial gradient on a canvas) so pieces do not float on the transparent background. */
function shadowMesh() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(30,24,16,.42)'); grad.addColorStop(0.55, 'rgba(30,24,16,.18)'); grad.addColorStop(1, 'rgba(30,24,16,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.002; m.renderOrder = -1; return m;
}

/** The real renderer: { render(type) -> dataURL|null, lost() -> bool, dispose() }, or null when WebGL / document are unavailable. */
export function createGLRenderer(size = 160) {
  if (typeof document === 'undefined') return null;
  let gl; try { gl = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' }); } catch { return null; }
  gl.setPixelRatio(1); gl.setSize(size, size, false); gl.setClearColor(0x000000, 0); gl.shadowMap.enabled = false;
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50), shadow = shadowMesh();
  const hemi = new THREE.HemisphereLight('#ffffff', '#d9c7a5', 1.35), key = new THREE.DirectionalLight('#fff3e0', 2.1), fill = new THREE.DirectionalLight('#dbe8ff', 1.0);
  key.position.set(-3, 5, 4); fill.position.set(5, 2, 1); scene.add(hemi, key, fill, shadow);
  let off = false; const el = gl.domElement; el.addEventListener?.('webglcontextlost', (e) => { e.preventDefault?.(); off = true; });
  return {
    lost: () => off || !!gl.getContext?.()?.isContextLost?.(),
    render(type) {
      const model = furnitureModel(type); if (!model.children.length) return null;
      const box = new THREE.Box3().setFromObject(model); if (box.isEmpty()) { disposeTree(model); return null; }
      const sx = Math.max(box.max.x - box.min.x, 0.5) * 1.35, sz = Math.max(box.max.z - box.min.z, 0.5) * 1.35;
      shadow.scale.set(sx, sz, 1); shadow.position.x = (box.min.x + box.max.x) / 2; shadow.position.z = (box.min.z + box.max.z) / 2;
      box.union(new THREE.Box3(new THREE.Vector3(shadow.position.x - sx / 2, 0, shadow.position.z - sz / 2), new THREE.Vector3(shadow.position.x + sx / 2, 0.01, shadow.position.z + sz / 2)));
      scene.add(model); frameBox(cam, box);
      try { gl.render(scene, cam); return off ? null : el.toDataURL('image/png'); } finally { scene.remove(model); disposeTree(model); }
    },
    dispose() { shadow.material.map?.dispose(); shadow.material.dispose(); shadow.geometry.dispose(); gl.dispose(); try { gl.forceContextLoss?.(); } catch { /* already gone */ } },
  };
}

/** One work slot between frames: idle time when the browser has it, else the next frame, else a short timeout (node). */
export function defaultSchedule(fn) {
  const g = globalThis;
  if (typeof g.requestIdleCallback === 'function') return void g.requestIdleCallback(() => fn(), { timeout: 150 });
  if (typeof g.requestAnimationFrame === 'function') return void g.requestAnimationFrame(() => fn());
  setTimeout(fn, 16);
}

/**
 * Queue + cache. `get(type, { priority })` joins (or creates) the request for that type; higher priority runs first, ties in request order.
 * Options: size, createRenderer(size) -> renderer|null, schedule(fn), idleMs (release the GPU context after that long idle; 0 = never).
 */
export function makeThumbs({ size = 160, createRenderer = createGLRenderer, schedule = defaultSchedule, idleMs = 20000, maxAttempts = 2 } = {}) {
  const cache = new Map(), failed = new Set(), waiting = new Map(); let renderer = null, dead = false, scheduled = false, seq = 0, idleTimer = null;
  const queue = []; // { type, priority, seq, attempts }
  const stopIdle = () => { clearTimeout(idleTimer); idleTimer = null; };
  const release = () => { stopIdle(); try { renderer?.dispose?.(); } catch { /* ignore */ } renderer = null; };
  const settle = (job, url) => {
    const w = waiting.get(job.type); waiting.delete(job.type);
    if (url) cache.set(job.type, url); else failed.add(job.type);
    w?.resolve(url || null);
  };
  const drainDead = () => { while (queue.length) settle(queue.shift(), null); };
  const next = () => { let bi = 0; for (let i = 1; i < queue.length; i++) if (queue[i].priority > queue[bi].priority || (queue[i].priority === queue[bi].priority && queue[i].seq < queue[bi].seq)) bi = i; return queue.splice(bi, 1)[0]; };
  const kick = () => { if (scheduled || !queue.length) return; scheduled = true; stopIdle(); schedule(step); };
  const after = () => { if (queue.length) kick(); else if (idleMs > 0 && renderer) { idleTimer = setTimeout(release, idleMs); idleTimer.unref?.(); } };
  function step() {
    scheduled = false; if (!queue.length) return;
    if (!renderer && !dead) { try { renderer = createRenderer(size) || null; } catch { renderer = null; } if (!renderer) dead = true; }
    if (dead) return drainDead();
    const job = next(); let out;
    const done = (url) => {
      if (!url && renderer?.lost?.() && ++job.attempts < maxAttempts) { release(); queue.push(job); return after(); } // context lost: rebuild once, then retry this piece
      settle(job, url); after();
    };
    try { out = renderer.render(job.type); } catch { out = null; }
    if (out && typeof out.then === 'function') out.then(done, () => done(null)); else done(out);
  }
  return {
    size,
    peek: (type) => cache.get(type) ?? null,
    has: (type) => cache.has(type),
    get(type, { priority = 0 } = {}) {
      if (typeof type !== 'string') return Promise.resolve(null);
      if (cache.has(type)) return Promise.resolve(cache.get(type));
      if (failed.has(type) || dead) return Promise.resolve(null);
      const w = waiting.get(type);
      if (w) { const j = queue.find((q) => q.type === type); if (j && priority > j.priority) j.priority = priority; return w.promise; }
      const rec = {}; rec.promise = new Promise((res) => { rec.resolve = res; }); waiting.set(type, rec);
      queue.push({ type, priority, seq: seq++, attempts: 0 }); kick(); return rec.promise;
    },
    /** Requests still waiting for their turn (for tests and a possible progress hint). */
    get pending() { return queue.length; },
    /** Forget every cached image (e.g. after a theme change). */
    clear() { cache.clear(); failed.clear(); },
    /** Release the GPU context now; pending requests keep their place and re-create it on demand. */
    dispose() { release(); },
  };
}
