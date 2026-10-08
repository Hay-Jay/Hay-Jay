// SCAN-01: a wireframe-to-chrome ring (jewellery, literally) orbiting the MONOCHROME emblem.
// A horizontal scan plane sweeps up and down: everything above it is wireframe, everything below it is polished chrome.
// One small WebGL canvas, pixel ratio capped, paused when off-screen or when the tab is hidden.
// If WebGL is unavailable the CSS emblem inside the radar stays as the fallback.
import * as THREE from './assets/vendor/three.module.min.js';

const canvas = document.getElementById('gl');
const viewport = document.getElementById('viewport');
if (canvas && viewport) boot().catch(() => { /* keep the CSS emblem fallback */ });

async function boot() {
  // Probe on a throwaway canvas so unsupported browsers fall back quietly to the CSS emblem.
  const probe = document.createElement('canvas');
  const pg = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!pg) return;
  const lose = pg.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = window.devicePixelRatio || 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 2, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(dpr, 1.5));            // capped: this canvas never needs to be sharper than 1.5x
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;

  // Chrome without an environment map: a painted "matcap" of a black studio with hard white soft-boxes.
  // One texture lookup per pixel keeps this cheap enough for software renderers and phones.
  function chromeMatcap(size = 256) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
    const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const box = (rx, ry, rz, cx, cy, cz, w, h) => { // soft-box: bright where the reflection vector points near (cx,cy,cz)
      const d = Math.max(Math.abs(rx - cx) / w, Math.abs(ry - cy) / h) * (rz * cz > 0 ? 1 : 9);
      return 1 - sstep(.7, 1, d);
    };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x + .5) / size * 2 - 1, ny = 1 - (y + .5) / size * 2, d2 = nx * nx + ny * ny, i = (y * size + x) * 4;
      if (d2 > 1) { img.data[i + 3] = 0; continue; }
      const nz = Math.sqrt(1 - d2);
      const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1; // reflection of the view ray
      // sharp horizon: graded bright sky above, near-black floor below, with a dark seam and hard soft-box reflections
      const up = sstep(-.04, .05, ry);
      let v = up * (.28 + .62 * sstep(0, 1, ry)) + (1 - up) * (.03 + .2 * sstep(-1, -.25, ry));
      v *= 1 - .85 * (sstep(-.1, -.02, ry) * (1 - sstep(-.02, 0, ry)));
      v += 1.2 * box(rx, ry, rz, -.8, .1, .3, .14, .85);             // left strip
      v += 1.0 * box(rx, ry, rz, .82, .1, -.2, .12, .8);             // right strip
      v += .9 * box(rx, ry, rz, 0, -.55, .8, .7, .05);               // low front edge
      v += .7 * box(rx, ry, rz, 0, .9, 0, 1.0, .18);                 // overhead panel
      v = Math.min(1, v);
      const g = Math.round(Math.pow(v, .85) * 255);
      img.data[i] = img.data[i + 1] = g; img.data[i + 2] = Math.min(255, g + 3); img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  camera.position.set(0, 1.5, 10.4);
  camera.lookAt(0, 0, 0);

  // Scan plane clips the chrome (keeps y <= s) and the wireframe (keeps y >= s) in world space.
  const planeChrome = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const planeWire = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const chrome = new THREE.MeshMatcapMaterial({ matcap: chromeMatcap(), side: THREE.DoubleSide, clippingPlanes: [planeChrome] });
  const wire = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, clippingPlanes: [planeWire] });
  const wireDim = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .32, clippingPlanes: [planeWire] });

  const world = new THREE.Group();
  scene.add(world);
  const rad = d => d * Math.PI / 180;

  // A ring = polished solid + wireframe twin. Returned group tilts; inner "spin" turns about the ring's own axis.
  const rings = [];
  function ring(R, tube, tiltX, tiltZ, wSeg, wTube, spinSpeed, dim) {
    const tilt = new THREE.Group(); tilt.rotation.set(rad(tiltX), 0, rad(tiltZ));
    const spin = new THREE.Group(); tilt.add(spin);
    spin.add(new THREE.Mesh(new THREE.TorusGeometry(R, tube, 40, 160), chrome));
    const wf = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusGeometry(R, tube * 1.04, wTube, wSeg)), dim ? wireDim : wire);
    spin.add(wf);
    world.add(tilt); rings.push({ spin, speed: spinSpeed });
    return tilt;
  }
  ring(1.3, .2, 62, -12, 72, 12, .35, false);   // main band
  ring(1.78, .035, 52, 22, 96, 6, -.22, true);   // thin outer orbit
  ring(.86, .05, 108, 8, 56, 6, .5, true);       // inner gyro

  // The emblem sits at the centre (luminance becomes alpha so the black square disappears and rings can pass in front of it).
  const emblemGroup = new THREE.Group(); scene.add(emblemGroup);
  try {
    const img = new Image(); img.src = 'assets/emblem.webp';
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) d.data[i + 3] = Math.min(255, Math.max(d.data[i], d.data[i + 1], d.data[i + 2]) * 1.35);
    ctx.putImageData(d, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const h = 1.55, w = h * c.width / c.height;
    const geo = new THREE.PlaneGeometry(w, h);
    const lit = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, clippingPlanes: [planeChrome] }));
    const dim = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .3, depthWrite: false, toneMapped: false, clippingPlanes: [planeWire] }));
    emblemGroup.add(lit, dim);
  } catch { /* emblem texture failed: rings alone still render */ }

  // The visible scan line: a thin disc + rim at the plane height.
  const scanMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const scan = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.RingGeometry(.05, 2.05, 96), scanMat); disc.rotation.x = -Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.RingGeometry(2.03, 2.07, 128), rimMat); rim.rotation.x = -Math.PI / 2;
  scan.add(disc, rim); scene.add(scan);

  // ---- sizing ----
  const resize = () => {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(() => { resize(); if (!running) draw(0, true); }).observe(canvas);

  // ---- readouts ----
  const elScan = document.getElementById('vpScan'), elBar = document.getElementById('vpBar'), elAz = document.getElementById('vpAz');
  let lastTxt = '';
  const readouts = (p, az) => {
    const txt = String(Math.round(p * 100)).padStart(3, '0');
    if (txt === lastTxt) return; lastTxt = txt;
    if (elScan) elScan.textContent = txt + '%';
    if (elBar) elBar.style.width = (p * 100) + '%';
    if (elAz) elAz.textContent = String(Math.round(((az % 360) + 360) % 360)).padStart(3, '0');
  };

  // ---- pointer parallax ----
  let tx = 0, ty = 0, px = 0, py = 0;
  viewport.addEventListener('pointermove', e => {
    const r = viewport.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2;
  }, { passive: true });
  viewport.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  const H = 1.95, CYCLE = 14;
  let running = false, raf = 0, t0 = performance.now(), last = t0, az = 0, lastDraw = 0;
  
  function draw(now, still) {
    const t = still ? 0 : (now - t0) / 1000;
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    // 0 = all wireframe, 1 = all chrome; stepped to feel digital
    let p;
    if (still) p = 1;
    else {
      const k = t % CYCLE;
      p = k < 5 ? k / 5 : k < 8 ? 1 : k < 13 ? 1 - (k - 8) / 5 : 0;
      p = Math.round(p * 50) / 50;
    }
    const s = -H + p * 2 * H;
    planeChrome.constant = s; planeWire.constant = -s;
    scan.position.y = s; scan.visible = p > 0 && p < 1;
    if (!still) {
      az += dt * 22;
      rings.forEach(r => { r.spin.rotation.z += dt * r.speed; });
    }
    px += (tx - px) * .06; py += (ty - py) * .06;
    world.rotation.y = rad(az) + px * .35;
    world.rotation.x = py * .18;
    emblemGroup.rotation.y = px * .12;
    readouts(p, az);
    renderer.render(scene, camera);
  }
  const loop = now => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < 33) return;                    // 30 fps is plenty for a slow orbit
    lastDraw = now;
    draw(now);
  };
  const start = () => { if (running || reduce) return; running = true; last = lastDraw = performance.now(); raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  draw(performance.now(), reduce);
  viewport.classList.add('gl-on');
  if (reduce) return;

  let inView = true;
  const sync = () => (inView && !document.hidden ? start() : stop());
  new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0 }).observe(viewport);
  document.addEventListener('visibilitychange', sync);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); viewport.classList.remove('gl-on'); });
  sync();
}
