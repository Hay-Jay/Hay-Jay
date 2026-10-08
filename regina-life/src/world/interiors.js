import * as THREE from 'three';
import { CollisionGrid } from './collision.js';
import { tileTexture, woodTexture, concreteTexture, glowTexture, signTexture } from './textures.js';
import { buildCharacter } from '../player/character.js';
import { DEFAULT_LOOK, FOOD, CLOTHES, STORE_STOCK, MARKET_STOCK } from '../data/catalog.js';
import { JOBS } from '../data/jobs.js';
import { mulberry32 } from '../core/rng.js';
import { furnitureModel } from './furnitureModels.js';
import { FURNITURE, WALLS, FLOORS, isPoster } from '../data/furniture.js';
import { itemDef, footprint } from '../core/home.js';

const H = 3.3; // ceiling height
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });

/**
 * Interior factory. Every interior returns:
 *   { group, bounds, colliders, interactables[], spawn, exit, update(dt, env), setLights(on), dispose() }
 * Interactables: { id, x, z, radius, label | label(ctx), run(ctx), enabled?(ctx) }
 */
export function buildInterior(kind, { texCache = {} } = {}) {
  const rnd = mulberry32(kind.length * 977);
  const group = new THREE.Group(); group.name = 'interior:' + kind;
  const colliders = new CollisionGrid(8);
  const interactables = [];
  const animated = [];
  const lights = [];
  const ceilMeshes = [];
  const windows = [];
  const disposables = [];

  const mat = (c, o) => { const m = std(c, o); disposables.push(m); return m; };
  const add = (geo, m, x, y, z, { cast = true, recv = true, parent = group } = {}) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = recv; parent.add(mesh); disposables.push(geo); return mesh; };
  const box = (w, h, d, color, x, y, z, { collide = false, mo = {}, parent = group, cast = false } = {}) => {
    const m = add(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color, mo) : color, x, y + h / 2, z, { parent, cast });
    if (collide) colliders.add(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h);
    return m;
  };
  const blobTex = glowTexture();
  const blob = (x, z, w, d, op = 0.4) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, d * 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, color: '#000', transparent: true, opacity: op, depthWrite: false })); m.position.set(x, 0.012, z); group.add(m); };

  /* ----- room shell ----- */
  const shell = (W, D, { floor, wall = '#e8e1d2', ceil = '#f4f2ec', trim = '#cfc8b8' }) => {
    const hw = W / 2, hd = D / 2;
    const ft = floor; ft.repeat?.set(W / 3, D / 3);
    const f = add(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.45, metalness: 0.02 }), 0, 0, 0, { cast: false });
    const c = add(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2), mat(ceil, { roughness: 0.95 }), 0, H, 0, { cast: false });
    const wm = mat(wall, { roughness: 0.92 });
    box(W + 0.4, H, 0.2, wm, 0, 0, -hd - 0.1);
    box(W + 0.4, H, 0.2, wm, 0, 0, hd + 0.1);
    box(0.2, H, D, wm, -hw - 0.1, 0, 0);
    box(0.2, H, D, wm, hw + 0.1, 0, 0);
    const tm = mat(trim, { roughness: 0.6 });
    box(W, 0.12, 0.05, tm, 0, 0, -hd + 0.03); box(W, 0.12, 0.05, tm, 0, 0, hd - 0.03); box(0.05, 0.12, D, tm, -hw + 0.03, 0, 0); box(0.05, 0.12, D, tm, hw - 0.03, 0, 0);
    // thin wall colliders (player radius handles distance); bounds clamp keeps them in
    return { hw, hd, wm, fm: f.material };
  };
  const ceilingLight = (x, z, w = 1.6, d = 0.4) => {
    const m = new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#fff6e0'), emissiveIntensity: 1.4 });
    disposables.push(m); ceilMeshes.push(add(new THREE.BoxGeometry(w, 0.06, d), m, x, H - 0.04, z, { cast: false })); lights.push(m);
  };
  const point = (x, y, z, intensity = 14, color = '#fff2d8', dist = 14) => {
    const p = new THREE.PointLight(color, intensity, dist, 1.7); p.position.set(x, y, z); group.add(p); lights.push(p); return p;
  };
  const windowPane = (x, y, z, w, h, ry = 0) => {
    const m = new THREE.MeshBasicMaterial({ color: '#bfe3ff' }); disposables.push(m);
    const frame = add(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.06), mat('#f1efe8'), x, y, z, { cast: false });
    const g = add(new THREE.PlaneGeometry(w, h), m, x, y, z, { cast: false }); g.position.z += ry === 0 ? 0.04 : 0; frame.rotation.y = g.rotation.y = ry;
    if (ry !== 0) g.position.x += 0.04 * Math.sign(ry) * -1;
    windows.push(m);
  };
  const label = (text, w, h, x, y, z, ry = 0, opts = {}) => {
    const t = signTexture(text, { w: 512, h: Math.round(512 * (h / w)), accent: opts.accent ?? '#ffb347', bg: opts.bg ?? '#14161a', sub: opts.sub ?? '' });
    const m = new THREE.MeshBasicMaterial({ map: t }); disposables.push(m, t);
    const p = add(new THREE.PlaneGeometry(w, h), m, x, y, z, { cast: false }); p.rotation.y = ry; return p;
  };
  const npc = (x, z, yaw, look = {}) => {
    const c = buildCharacter({ ...DEFAULT_LOOK, ...look }, { detail: 0.6 }); c.root.position.set(x, 0, z); c.root.rotation.y = yaw; group.add(c.root);
    c.gesture('wave', 0); animated.push((dt) => c.update(dt)); disposables.push({ dispose: () => c.dispose() }); return c;
  };
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: '#ffd24a' })); arrow.visible = false; group.add(arrow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); ring.visible = false; ring.position.y = 0.03; group.add(ring);

  /* ----- shift task engine shared by market + threads ----- */
  const stations = [];
  const task = { target: -1, carrying: false, last: -1 };
  const jobHere = (ctx) => { const s = ctx.store.state; return s.job.active && JOBS[s.job.active.id].place === kind ? JOBS[s.job.active.id] : null; };
  const pickTarget = () => { let n; do n = Math.floor(rnd() * stations.length); while (n === task.last && stations.length > 1); task.target = n; task.last = n; };
  const shiftOn = (ctx) => { const sh = ctx.store.state.job.shift; return sh && JOBS[sh.id].place === kind ? sh : null; };
  const stationInteract = (i, name, x, z, extra = {}) => {
    stations.push({ x, z, name });
    interactables.push({
      id: 'station_' + i, x, z, radius: 1.9, ...extra,
      label: (ctx) => (shiftOn(ctx) && task.carrying ? (task.target === i ? `Stock ${name}` : `${name} (not this one)`) : extra.browseLabel),
      enabled: (ctx) => !!extra.browseLabel || (shiftOn(ctx) && task.carrying),
      run(ctx) {
        if (shiftOn(ctx) && task.carrying) {
          if (task.target !== i) { ctx.ui.toast(`Wrong spot — the stock goes to ${stations[task.target].name}.`, 'warn'); return; }
          task.carrying = false; ctx.player.setCarry(false); ctx.player.gesture('use');
          const r = ctx.game.completeTask(ctx.store);
          ctx.audio?.blip('ok');
          if (r.done >= r.total) { task.target = -1; ctx.ui.toast('All tasks done! Clock out at the counter to get paid.', 'good'); }
          else { pickTarget(); ctx.ui.toast(`Good. ${r.done}/${r.total} done — grab the next box.`, 'good'); }
        } else extra.browse?.(ctx);
      },
    });
  };
  const palletInteract = (x, z, noun) => interactables.push({
    id: 'pallet', x, z, radius: 1.9,
    label: () => `Pick up ${noun}`,
    enabled: (ctx) => !!shiftOn(ctx) && !task.carrying && task.target >= 0,
    run(ctx) { task.carrying = true; ctx.player.setCarry(true); ctx.player.gesture('use'); ctx.ui.toast(`Deliver it to: ${stations[task.target].name}`, 'info'); },
  });
  const counterInteract = (x, z, employerName) => interactables.push({
    id: 'counter', x, z, radius: 2.3,
    label: (ctx) => (shiftOn(ctx) ? (shiftOn(ctx).tasksDone >= shiftOn(ctx).tasksTotal ? 'Clock out & collect pay' : 'Talk to staff') : jobHere(ctx) ? 'Clock in for your shift' : `Talk to staff`),
    run(ctx) {
      const G = ctx.game, sh = shiftOn(ctx), job = jobHere(ctx);
      if (sh) {
        if (sh.tasksDone >= sh.tasksTotal) {
          const r = G.finishShift(ctx.store);
          if (r.ok) { ctx.audio?.blip('cash'); ctx.ui.toast(`Shift complete! +${ctx.fmt(r.pay)} deposited${r.promoted ? ` · Promoted to ${r.promoted}!` : ''}`, 'good'); ctx.player.setCarry(false); task.carrying = false; }
          else ctx.ui.toast(r.error, 'warn');
        } else ctx.ui.menu(employerName, `You're partway through your shift (${sh.tasksDone}/${sh.tasksTotal}).`, [{ label: 'Keep working' }, { label: 'Abandon shift (no pay)', danger: true, run: () => { G.abandonShift(ctx.store); task.carrying = false; ctx.player.setCarry(false); task.target = -1; } }]);
      } else if (job) {
        ctx.ui.menu(employerName, `Welcome back! Ready to start a shift as ${job.title}? You'll complete ${job.levels[ctx.store.state.job.active.level].tasks} tasks.`, [
          { label: 'Clock in', primary: true, run: () => { const r = G.startShift(ctx.store); if (r.ok) { pickTarget(); ctx.ui.toast('Shift started. Pick up a box from the back-room pallet.', 'info'); } else ctx.ui.toast(r.error, 'warn'); } },
          { label: 'Not now' },
        ]);
      } else ctx.ui.menu(employerName, `Hi there! Looking for work? Check the Jobs app on your phone to apply — we're hiring.`, [{ label: 'Open Jobs app', run: () => ctx.ui.openApp('jobs') }, { label: 'Just browsing' }]);
    },
  });
  const exitDoor = (x, z, yawOut) => interactables.push({ id: 'exit', x, z, radius: 1.8, label: 'Leave', run: (ctx) => ctx.ui.exitInterior() });

  let spawn, bounds, exit, apt = null, decor = null;

  /* ======================= MARKET ======================= */
  if (kind === 'market') {
    const W = 12, D = 16; shell(W, D, { floor: tileTexture('#e4e1d6', '#cfcabc'), wall: '#efe7d3' });
    bounds = { x0: -W / 2 + 0.5, x1: W / 2 - 0.5, z0: -D / 2 + 0.5, z1: D / 2 - 0.5 };
    spawn = { x: 0, z: 6.2, yaw: Math.PI }; exit = { x: 0, z: 7.4 };
    ceilingLight(-3, -4); ceilingLight(3, -4); ceilingLight(-3, 1); ceilingLight(3, 1); ceilingLight(0, 5.5, 2.4, 0.4);
    point(-3, 2.9, -3); point(3, 2.9, -3); point(0, 2.9, 3, 12);
    windowPane(-2.8, 1.7, 7.88, 3.4, 1.6); windowPane(2.8, 1.7, 7.88, 3.4, 1.6);
    // door frame & mat
    box(2.4, 0.04, 1.4, '#3d3f44', 0, 0.0, 7.2);
    label('PRAIRIE CORNER MARKET', 5.4, 0.9, 0, 2.7, -7.88, 0, { accent: '#3bb273' });
    // shelves
    const prodColors = { produce: ['#d94b3a', '#7cc05a', '#f0b429', '#8bc34a'], bakery: ['#c88a4a', '#e2b36a', '#a8683a'], snacks: ['#e94e77', '#3d8bfd', '#f5a623', '#8e44ad'], deli: ['#e8c9a0', '#c0392b', '#f3e5ab'], cooler: ['#4aa3df', '#f1f1f1', '#d4a017', '#b53a2e'] };
    const gondola = (cx, cz, len, cat, nm) => {
      box(len, 1.7, 0.7, '#7d8590', cx, 0, cz, { collide: true, mo: { metalness: 0.4, roughness: 0.5 } });
      box(len + 0.1, 0.06, 0.8, '#c0c5cc', cx, 1.7, cz);
      for (let lv = 0; lv < 4; lv++) for (const side of [-1, 1]) {
        const n = Math.floor(len / 0.34);
        for (let k = 0; k < n; k++) { const c = prodColors[cat][(k + lv + (side > 0 ? 1 : 0)) % prodColors[cat].length]; box(0.26, 0.22 + (k % 3) * 0.03, 0.2, c, cx - len / 2 + 0.25 + k * 0.34, 0.22 + lv * 0.4, cz + side * 0.28); }
      }
      blob(cx, cz, len, 0.9, 0.3);
      label(nm.toUpperCase(), 1.6, 0.3, cx, 2.0, cz, 0, { bg: '#1f6f4a', accent: '#ffffff' });
    };
    const defs = [[-2.9, -3, 'produce', 'Produce'], [2.3, -3, 'bakery', 'Bakery'], [-2.9, 0.4, 'snacks', 'Snacks'], [2.3, 0.4, 'deli', 'Deli']];
    defs.forEach(([x, z, cat, nm], i) => {
      gondola(x, z, 4.0, cat, nm);
      stationInteract(i, nm, x, z + 0.95, {
        browseLabel: `Browse ${nm}`, browse: (ctx) => ctx.ui.shop(`${nm} — Prairie Corner Market`, MARKET_STOCK.filter((id) => FOOD[id].shelf === cat), 'Prairie Corner Market'),
      });
    });
    // cooler wall
    box(0.9, 2.0, 7.4, '#cfd8de', -5.2, 0, -3.2, { collide: true, mo: { metalness: 0.5, roughness: 0.3 } });
    for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 14; k++) box(0.2, 0.28, 0.2, prodColors.cooler[(k + lv) % 4], -4.72, 0.25 + lv * 0.45, -6.7 + k * 0.5);
    box(0.04, 1.9, 7.2, '#bfe6ff', -4.73, 0.05, -3.2, { mo: { transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 } });
    label('COLD DRINKS & DAIRY', 3.2, 0.3, -4.7, 2.15, -3.2, Math.PI / 2, { bg: '#1c4e80', accent: '#fff' });
    interactables.push({ id: 'cooler', x: -3.7, z: -3.2, radius: 2.0, label: 'Browse Cooler', run: (ctx) => ctx.ui.shop('Cold Drinks & Dairy', MARKET_STOCK.filter((id) => FOOD[id].shelf === 'cooler'), 'Prairie Corner Market') });
    // checkout
    box(3.0, 1.05, 0.9, '#8a5a36', 3.6, 0, 4.6, { collide: true }); box(3.1, 0.05, 1.0, '#e9e4d8', 3.6, 1.05, 4.6);
    box(0.5, 0.35, 0.4, '#2b2f36', 3.9, 1.1, 4.6); box(0.45, 0.3, 0.04, '#7ad3ff', 3.9, 1.35, 4.5);
    blob(3.6, 4.6, 3, 0.9, 0.35);
    npc(3.6, 3.7, 0, { skin: 4, hair: 'bun', hairColor: 1, top: 'tee_white', bottom: 'jeans_black', shoes: 'sneaker_black', expression: 'smile' });
    counterInteract(3.6, 5.6, 'Prairie Corner Market');
    // back-room pallet (job pickup)
    box(1.6, 0.15, 1.2, '#9b7b52', 4.2, 0, -6.9, { collide: true });
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) box(0.5, 0.4, 0.5, '#b98d57', 3.7 + a * 0.5, 0.15 + b * 0.4, -6.9, { collide: false });
    blob(4.2, -6.9, 1.6, 1.2, 0.35);
    label('BACK ROOM · STOCK HERE', 2.6, 0.3, 4.2, 1.9, -7.88, 0, { bg: '#3a3a3f', accent: '#ffd24a' });
    palletInteract(4.2, -5.9, 'a box of stock');
    exitDoor(0, 7.4);
    // door visual
    box(2.0, 2.6, 0.08, '#202327', 0, 0.0, 7.93, { mo: { metalness: 0.3 } });
    animated.push((dt, env, ctx) => {
      if (shiftOn(ctx) && task.target >= 0) {
        const st = stations[task.carrying ? task.target : -1] ?? null;
        const goal = task.carrying ? st : { x: 4.2, z: -6.9, name: 'Pallet' };
        if (goal) { arrow.visible = ring.visible = true; arrow.position.set(goal.x, 2.35 + Math.sin(performance.now() / 260) * 0.1, goal.z); ring.position.set(goal.x, 0.03, goal.z); arrow.rotation.y += dt * 2; ring.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.08); }
      } else arrow.visible = ring.visible = false;
    });
  }

  /* ======================= THREADS (CLOTHING) ======================= */
  if (kind === 'threads') {
    const W = 12, D = 14; shell(W, D, { floor: woodTexture('#9a7a58'), wall: '#f1eef0', trim: '#2c2d31' });
    bounds = { x0: -W / 2 + 0.5, x1: W / 2 - 0.5, z0: -D / 2 + 0.5, z1: D / 2 - 0.5 };
    spawn = { x: 0, z: 5.2, yaw: Math.PI }; exit = { x: 0, z: 6.4 };
    ceilingLight(-3, -3); ceilingLight(3, -3); ceilingLight(-3, 2.5); ceilingLight(3, 2.5);
    point(-3, 2.9, -2.5, 13, '#fff0e0'); point(3, 2.9, -2.5, 13, '#fff0e0'); point(0, 2.9, 3, 11, '#fff0e0');
    windowPane(-3, 1.7, 6.88, 3.6, 1.6); windowPane(3, 1.7, 6.88, 3.6, 1.6);
    label('PRAIRIE THREADS', 4.6, 0.8, 0, 2.6, -6.88, 0, { bg: '#1b1c21', accent: '#8e6bd8' });
    const rackColors = ['#a3312f', '#3e5b43', '#6c7077', '#223458', '#d8cdb4', '#8e6bd8', '#b49a72'];
    const rack = (cx, cz, i, nm, along = 'x') => {
      const L = 3.2;
      box(along === 'x' ? L : 0.06, 0.06, along === 'x' ? 0.06 : L, '#c9ccd2', cx, 1.55, cz, { mo: { metalness: 0.8, roughness: 0.3 } });
      for (const s of [-1, 1]) box(0.05, 1.55, 0.05, '#c9ccd2', along === 'x' ? cx + s * (L / 2 - 0.05) : cx, 0, along === 'x' ? cz : cz + s * (L / 2 - 0.05), { collide: false });
      for (let k = 0; k < 11; k++) { const o = -L / 2 + 0.2 + k * 0.28; const c = rackColors[(k + i) % rackColors.length]; box(along === 'x' ? 0.1 : 0.45, 0.9, along === 'x' ? 0.45 : 0.1, c, along === 'x' ? cx + o : cx, 0.62, along === 'x' ? cz : cz + o); }
      colliders.add(cx - (along === 'x' ? L / 2 : 0.4), cz - (along === 'x' ? 0.4 : L / 2), cx + (along === 'x' ? L / 2 : 0.4), cz + (along === 'x' ? 0.4 : L / 2), 1.6);
      blob(cx, cz, along === 'x' ? L : 0.9, along === 'x' ? 0.9 : L, 0.3);
      const ix = along === 'x' ? cx : cx + 1.3, iz = along === 'x' ? cz + 1.3 : cz;
      stationInteract(i, nm, ix, iz, { browseLabel: `Browse ${nm}`, browse: (ctx) => ctx.ui.clothingShop() });
    };
    rack(-3.2, -3.8, 0, 'Tops Rack'); rack(2.8, -3.8, 1, 'Outerwear Rack'); rack(-3.2, -0.3, 2, 'Bottoms Rack'); rack(2.8, -0.3, 3, 'Seasonal Rack');
    // shoe wall & accessories
    box(0.5, 2.2, 8, '#2f3136', -5.5, 0, -1.5, { collide: true });
    for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) box(0.34, 0.14, 0.2, ['#f0efe9', '#5b3d26', '#202226', '#16171a'][(k + r) % 4], -5.18, 0.4 + r * 0.5, -5.2 + k * 0.85);
    // mannequins
    const mannequin = (x, z, topC, botC) => {
      box(0.5, 0.12, 0.5, '#2b2b2f', x, 0, z, { collide: true });
      add(new THREE.CylinderGeometry(0.2, 0.14, 0.6, 14), mat(topC, { roughness: 0.9 }), x, 1.3, z); add(new THREE.CylinderGeometry(0.12, 0.1, 0.8, 12), mat(botC, { roughness: 0.9 }), x, 0.6, z);
      add(new THREE.SphereGeometry(0.11, 14, 10), mat('#d9d4cc', { roughness: 0.4 }), x, 1.75, z);
    };
    mannequin(-1.5, 5.2, '#a3312f', '#34507a'); mannequin(1.5, 5.2, '#3e5b43', '#b49a72');
    // mirror → wardrobe
    box(1.6, 2.2, 0.06, '#1b1c21', 5.9, 0, 3.4); const mr = add(new THREE.PlaneGeometry(1.4, 2.0), mat('#dbe8f0', { roughness: 0.04, metalness: 0.95 }), 5.86, 1.15, 3.4, { cast: false }); mr.rotation.y = -Math.PI / 2;
    interactables.push({ id: 'mirror', x: 4.9, z: 3.4, radius: 1.8, label: 'Mirror — change outfit', run: (ctx) => ctx.ui.openWardrobe() });
    // counter
    box(3.2, 1.05, 0.9, '#262629', 3.6, 0, 4.9, { collide: true }); box(3.3, 0.05, 1.0, '#d9d4cc', 3.6, 1.05, 4.9);
    npc(3.6, 4.0, 0, { skin: 1, hair: 'long', hairColor: 3, top: 'sweater_cream', bottom: 'chino_tan', shoes: 'sneaker_white', expression: 'smile' });
    counterInteract(3.6, 5.9, 'Prairie Threads');
    // folded stock table (pickup)
    box(1.8, 0.8, 0.9, '#6b4f36', -4, 0, 5.8, { collide: true }); for (let k = 0; k < 4; k++) box(0.5, 0.12, 0.4, rackColors[k], -4.4 + k * 0.28, 0.8 + (k % 2) * 0.1, 5.8);
    palletInteract(-4, 4.9, 'a stack of folded stock');
    exitDoor(0, 6.4);
    box(2.0, 2.6, 0.08, '#202327', 0, 0, 6.93, { mo: { metalness: 0.3 } });
    animated.push((dt, env, ctx) => {
      if (shiftOn(ctx) && task.target >= 0) {
        const goal = task.carrying ? stations[task.target] : { x: -4, z: 5.8 };
        arrow.visible = ring.visible = true; arrow.position.set(goal.x, 2.3 + Math.sin(performance.now() / 260) * 0.1, goal.z); ring.position.set(goal.x, 0.03, goal.z); arrow.rotation.y += dt * 2;
      } else arrow.visible = ring.visible = false;
    });
  }

  /* ======================= APARTMENT ======================= */
  if (kind === 'apartment') {
    const W = 9, D = 11; const shl = shell(W, D, { floor: woodTexture('#b08a62'), wall: '#e9e3d6', trim: '#ffffff' }); apt = shl;
    decor = new THREE.Group(); group.add(decor);
    bounds = { x0: -W / 2 + 0.45, x1: W / 2 - 0.45, z0: -D / 2 + 0.45, z1: D / 2 - 0.45 };
    spawn = { x: 3.2, z: 4.4, yaw: Math.PI }; exit = { x: 3.2, z: 4.9 };
    ceilingLight(0, -1.5, 1.2, 1.2); ceilingLight(0, 2.5, 1.2, 1.2);
    const roomLights = [point(0, 2.9, -1.5, 15, '#ffeccc', 16), point(0, 2.9, 2.5, 12, '#ffeccc', 14)];
    windowPane(-2.2, 1.7, -5.38, 2.6, 1.7); windowPane(2.2, 1.7, -5.38, 2.6, 1.7);
    // rug
    const rug = add(new THREE.PlaneGeometry(3.6, 2.6).rotateX(-Math.PI / 2), mat('#6e4b57', { roughness: 1 }), -0.4, 0.015, 0.6, { cast: false });
    // bed
    box(2.0, 0.4, 2.4, '#5b4331', -3.2, 0, -3.9, { collide: true }); box(1.9, 0.22, 2.3, '#f1ede6', -3.2, 0.4, -3.9); box(1.92, 0.12, 1.2, '#3e5b7a', -3.2, 0.62, -3.5);
    box(0.7, 0.14, 0.4, '#ffffff', -3.55, 0.62, -4.9); box(0.7, 0.14, 0.4, '#ffffff', -2.85, 0.62, -4.9); box(2.0, 1.1, 0.12, '#5b4331', -3.2, 0, -5.12);
    blob(-3.2, -3.9, 2.2, 2.6, 0.45);
    box(0.5, 0.5, 0.5, '#5b4331', -1.8, 0, -4.9, { collide: true }); box(0.2, 0.3, 0.2, '#f6e9b8', -1.8, 0.5, -4.9, { mo: { emissive: new THREE.Color('#ffd98a'), emissiveIntensity: 0.5 } });
    interactables.push({ id: 'bed', x: -2.0, z: -3.3, radius: 1.9, label: 'Sleep', run: (ctx) => ctx.ui.sleep() });
    // sofa + TV
    box(2.6, 0.45, 1.0, '#44505f', -0.4, 0, 3.6, { collide: true }); box(2.6, 0.55, 0.28, '#3b4553', -0.4, 0.4, 4.0, { collide: true }); for (const s of [-1, 1]) box(0.25, 0.7, 1.0, '#3b4553', -0.4 + s * 1.3, 0, 3.6);
    blob(-0.4, 3.6, 2.8, 1.2, 0.4);
    box(1.8, 0.5, 0.45, '#2a2420', -0.4, 0, -0.9, { collide: true });
    const tvCanvas = document.createElement('canvas'); tvCanvas.width = 256; tvCanvas.height = 144; const tg = tvCanvas.getContext('2d');
    const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.colorSpace = THREE.SRGBColorSpace; disposables.push(tvTex);
    const tvMat = new THREE.MeshBasicMaterial({ map: tvTex }); disposables.push(tvMat);
    box(1.7, 0.98, 0.06, '#101114', -0.4, 0.62, -1.0); const scr = add(new THREE.PlaneGeometry(1.6, 0.9), tvMat, -0.4, 1.1, -0.96, { cast: false });
    let tvOn = false, tvT = 0, tvShow = 0;
    const drawTv = () => {
      if (!tvOn) { tg.fillStyle = '#050608'; tg.fillRect(0, 0, 256, 144); tvTex.needsUpdate = true; return; }
      const hues = [[30, 60, 120], [200, 230, 260], [340, 10, 40]][tvShow % 3];
      const gr = tg.createLinearGradient(0, 0, 256, 144); gr.addColorStop(0, `hsl(${hues[0] + tvT * 20},70%,40%)`); gr.addColorStop(1, `hsl(${hues[1] + tvT * 30},70%,25%)`); tg.fillStyle = gr; tg.fillRect(0, 0, 256, 144);
      tg.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 5; k++) tg.fillRect(((tvT * 40 + k * 60) % 300) - 20, 30 + k * 18, 70, 10);
      tg.fillStyle = '#fff'; tg.font = '700 14px sans-serif'; tg.fillText(['PRAIRIE NEWS NOW', 'HOCKEY NIGHT', 'COOKING W/ BANNOCK'][tvShow % 3], 12, 128); tvTex.needsUpdate = true;
    };
    drawTv();
    interactables.push({ id: 'tv', x: -0.4, z: 0.3, radius: 2.0, label: () => (tvOn ? 'Change channel / Off' : 'Watch TV'), run: (ctx) => {
      if (!tvOn) { tvOn = true; ctx.audio?.blip('tick'); ctx.ui.activity('tv'); }
      else ctx.ui.menu('Television', 'What would you like to do?', [{ label: 'Next channel', run: () => { tvShow++; } }, { label: 'Turn off', run: () => { tvOn = false; drawTv(); } }, { label: 'Cancel' }]);
    } });
    interactables.push({ id: 'sofa', x: -0.4, z: 2.6, radius: 1.5, label: 'Sit on sofa', run: (ctx) => ctx.player.sitAt({ x: -0.4, z: 3.55, yaw: 0, y: 0.18 }) });
    // kitchen
    box(0.9, 0.9, 3.4, '#d7d2c6', 3.8, 0, -3.2, { collide: true }); box(1.0, 0.05, 3.5, '#4a4f55', 3.8, 0.9, -3.2); box(0.5, 0.02, 0.5, '#9aa3ad', 3.8, 0.95, -4.4, { mo: { metalness: 0.8 } });
    box(0.8, 0.04, 0.6, '#25272b', 3.8, 0.95, -2.7); for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), mat('#555'), 3.65 + (k % 2) * 0.28, 1.0, -2.55 - Math.floor(k / 2) * 0.3);
    box(0.9, 1.9, 0.85, '#d8dde2', 3.9, 0, -0.9, { collide: true, mo: { metalness: 0.5, roughness: 0.35 } }); box(0.03, 0.5, 0.04, '#999', 3.43, 1.0, -1.15);
    blob(3.9, -2.4, 1.0, 5, 0.3);
    interactables.push({ id: 'fridge', x: 2.7, z: -0.9, radius: 1.8, label: 'Open fridge / eat', run: (ctx) => ctx.ui.openFridge() });
    interactables.push({ id: 'stove', x: 2.8, z: -2.6, radius: 1.5, label: 'Cook a quick meal', run: (ctx) => ctx.ui.cook() });
    // desk + computer
    box(1.8, 0.05, 0.8, '#7a5a3e', 3.3, 0.74, 3.6, { collide: false }); for (const [dx, dz] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]]) box(0.06, 0.74, 0.06, '#3d2f22', 3.3 + dx, 0, 3.6 + dz);
    colliders.add(2.4, 3.2, 4.2, 4.0, 0.8);
    box(0.7, 0.42, 0.04, '#111214', 3.3, 0.95, 3.8); add(new THREE.PlaneGeometry(0.64, 0.36), new THREE.MeshBasicMaterial({ color: '#4aa8ff' }), 3.3, 1.16, 3.78, { cast: false }).rotation.y = Math.PI; box(0.04, 0.2, 0.04, '#111', 3.3, 0.79, 3.82);
    box(0.5, 0.02, 0.18, '#2a2c30', 3.3, 0.8, 3.45);
    interactables.push({ id: 'computer', x: 3.3, z: 2.9, radius: 1.6, label: 'Use computer', run: (ctx) => ctx.ui.menu('Computer', 'What would you like to do?', [
      { label: '💼 Browse jobs', run: () => ctx.ui.openApp('jobs') }, { label: '📰 Read the news', run: () => ctx.ui.openApp('news') },
      { label: '🛋️ Furniture shop', run: () => ctx.ui.furnitureShop() }, { label: '🎨 Redecorate (build mode)', primary: true, run: () => ctx.ui.build() }, { label: 'Close' }]) });
    // stereo (radio) on the little shelf by the TV
    box(0.6, 0.35, 0.35, '#2b2e33', 1.3, 0.0, -0.55, { collide: true }); box(0.5, 0.04, 0.02, '#4ae0d0', 1.3, 0.26, -0.37, { mo: { emissive: new THREE.Color('#4ae0d0'), emissiveIntensity: 0.8 } });
    interactables.push({ id: 'stereo', x: 1.3, z: 0.4, radius: 1.5, label: 'Radio', run: (ctx) => ctx.ui.radioMenu() });
    // wardrobe
    box(1.5, 2.3, 0.65, '#a98e6f', 0.9, 0, -4.95, { collide: true }); box(0.03, 2.1, 0.03, '#2b2118', 0.9, 0.1, -4.62); blob(0.9, -4.95, 1.5, 0.7, 0.3);
    interactables.push({ id: 'wardrobe', x: 0.9, z: -3.9, radius: 1.6, label: 'Open wardrobe', run: (ctx) => ctx.ui.openWardrobe() });
    // bookshelf + plant + frames
    box(0.4, 2.0, 1.8, '#6b4f36', -4.25, 0, 1.2, { collide: true }); for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) box(0.22, 0.28, 0.07, ['#a3312f', '#223458', '#3e5b43', '#d8cdb4', '#8e6bd8'][(r + k) % 5], -4.18, 0.1 + r * 0.38, 0.5 + k * 0.2);
    // shower cubicle
    box(1.7, 0.05, 1.7, '#cfe3ea', -3.5, 0, 3.8, { mo: { roughness: 0.3 } });
    box(0.05, 2.2, 1.7, '#bfe6ff', -2.65, 0, 3.8, { mo: { transparent: true, opacity: 0.25, roughness: 0.05 } });
    box(1.7, 2.2, 0.05, '#bfe6ff', -3.5, 0, 2.95, { mo: { transparent: true, opacity: 0.25, roughness: 0.05 } });
    box(0.06, 2.3, 0.06, '#9aa3ad', -4.3, 0, 4.6, { mo: { metalness: 0.9, roughness: 0.2 } }); add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14), mat('#c8ced6', { metalness: 0.9, roughness: 0.2 }), -4.2, 2.2, 4.5);
    colliders.add(-4.35, 2.9, -2.6, 4.65, 2.2);
    interactables.push({ id: 'shower', x: -2.2, z: 3.8, radius: 1.5, label: 'Take a shower', run: (ctx) => ctx.ui.activity('shower') });
    interactables.push({ id: 'books', x: -3.3, z: 1.3, radius: 1.5, label: 'Read a book', run: (ctx) => ctx.ui.activity('read') });
    label('SASKATCHEWAN · LIVING SKIES', 1.6, 0.9, 4.46, 1.7, 1.2, -Math.PI / 2, { bg: '#25456a', accent: '#ffb347' });
    // light switch
    let lightsOn = true;
    box(0.1, 0.16, 0.03, '#f3f3f3', 4.1, 1.2, 4.97);
    interactables.push({ id: 'switch', x: 4.0, z: 4.2, radius: 1.2, label: 'Toggle lights', run: (ctx) => { lightsOn = !lightsOn; roomLights.forEach((l, i) => (l.intensity = lightsOn ? [15, 12][i] : 0)); lights.forEach((l) => { if (l.isMaterial) l.emissiveIntensity = lightsOn ? 1.4 : 0; }); ctx.audio?.blip('tick'); } });
    // door
    box(1.6, 2.4, 0.08, '#6b4f36', 3.2, 0, 5.46);
    exitDoor(3.2, 4.9);
    animated.push((dt) => { tvT += dt * 0.5; if (tvOn) { tg.save(); drawTv(); tg.restore(); } });
    group.userData.tvOff = () => { tvOn = false; drawTv(); };
  }


  /* ======================= GYM ======================= */
  if (kind === 'gym') {
    const W = 14, D = 12; shell(W, D, { floor: concreteTexture('#8a909b'), wall: '#4a5466', ceil: '#2a2f38', trim: '#3bd6c6' });
    bounds = { x0: -W / 2 + 0.5, x1: W / 2 - 0.5, z0: -D / 2 + 0.5, z1: D / 2 - 0.5 };
    spawn = { x: 0, z: 3.6, yaw: Math.PI }; exit = { x: 0, z: 5.2 };
    ceilingLight(-4, -2.5, 2.4, 0.3); ceilingLight(0, -2.5, 2.4, 0.3); ceilingLight(4, -2.5, 2.4, 0.3); ceilingLight(-3, 2.5, 2.4, 0.3); ceilingLight(3, 2.5, 2.4, 0.3);
    point(-4, 2.9, -2, 26, '#d8f4ff', 18); point(4, 2.9, -2, 26, '#d8f4ff', 18); point(0, 2.9, 3, 22, '#fff0dc', 16); point(-4, 2.9, 3, 14, '#d8f4ff', 12);
    windowPane(-3.2, 1.8, 5.88, 3.6, 1.5); windowPane(3.2, 1.8, 5.88, 3.6, 1.5);
    label('PRAIRIE FITNESS', 6, 0.9, 0, 2.6, -5.88, 0, { bg: '#0f1b22', accent: '#3bd6c6' });
    // mirror wall
    box(9, 1.6, 0.05, '#dfeaf2', 0, 0.55, -5.82, { mo: { metalness: 0.95, roughness: 0.04 } });
    // treadmills
    const tread = (x) => { box(0.9, 0.18, 1.8, '#17191d', x, 0, -3.8, { collide: true }); box(0.7, 0.04, 1.6, '#2c2f35', x, 0.18, -3.8); box(0.06, 1.1, 0.06, '#9aa3ad', x - 0.4, 0.2, -4.6); box(0.06, 1.1, 0.06, '#9aa3ad', x + 0.4, 0.2, -4.6); box(0.8, 0.4, 0.08, '#101114', x, 1.1, -4.65); add(new THREE.PlaneGeometry(0.7, 0.3), new THREE.MeshBasicMaterial({ color: '#4ae0d0' }), x, 1.3, -4.6, { cast: false }); blob(x, -3.8, 1, 1.8, 0.35); };
    [-3.5, -1.5, 0.5].forEach(tread);
    interactables.push({ id: 'treadmill', x: -1.5, z: -2.5, radius: 3.2, label: 'Run on the treadmill', run: (ctx) => ctx.ui.activity('treadmill') });
    // weights
    box(1.7, 0.4, 0.5, '#202226', 5, 0, -1, { collide: true }); box(0.1, 1.3, 0.1, '#9aa3ad', 4.3, 0, -1, { collide: true }); box(0.1, 1.3, 0.1, '#9aa3ad', 5.7, 0, -1);
    box(2.0, 0.06, 0.06, '#c9ccd2', 5, 1.2, -1, { mo: { metalness: 0.9, roughness: 0.2 } }); for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 18).rotateZ(Math.PI / 2), mat('#15161a'), 5 + s * 0.95, 1.2, -1);
    blob(5, -1, 2, 1, 0.4);
    interactables.push({ id: 'weights', x: 5, z: 0.4, radius: 2.0, label: 'Lift weights', run: (ctx) => ctx.ui.activity('weights') });
    // dumbbell rack
    box(0.5, 0.9, 3.2, '#2c2f35', -6.3, 0, 0.6, { collide: true }); for (let k = 0; k < 8; k++) { box(0.28, 0.16, 0.16, '#6e7480', -6.3, 0.95, -0.6 + k * 0.4); }
    // yoga mat
    add(new THREE.PlaneGeometry(0.9, 1.9).rotateX(-Math.PI / 2), mat('#8e6bd8', { roughness: 0.9 }), -3.5, 0.025, 1.2, { cast: false });
    interactables.push({ id: 'yoga', x: -3.5, z: 1.2, radius: 1.5, label: 'Stretch on the mat', run: (ctx) => ctx.ui.activity('yoga') });
    // water cooler + lockers
    box(0.4, 1.0, 0.4, '#e9eef2', 5.6, 0, 3.8, { collide: true }); add(new THREE.CylinderGeometry(0.17, 0.17, 0.45, 14), mat('#7ac8ff', { transparent: true, opacity: 0.6, roughness: 0.1 }), 5.6, 1.25, 3.8);
    interactables.push({ id: 'water', x: 5.0, z: 3.6, radius: 1.5, label: 'Drink some water', run: (ctx) => ctx.ui.activity('water') });
    for (let k = 0; k < 6; k++) box(0.5, 1.8, 0.45, ['#3bd6c6', '#2a74d6'][k % 2], -6.6, 0, 3.2 + k * 0.55 - 1.2, { collide: false });
    colliders.add(-6.9, 1.6, -6.2, 4.6, 1.8);
    exitDoor(0, 5.2);
    box(2.0, 2.6, 0.08, '#202327', 0, 0, 5.93, { mo: { metalness: 0.3 } });
  }

  /* ======================= CITY HALL ======================= */
  if (kind === 'cityhall') {
    const W = 14, D = 12; shell(W, D, { floor: tileTexture('#dcd9cf', '#c6c2b6'), wall: '#e8e4da', ceil: '#f4f2ec', trim: '#c9a64e' });
    bounds = { x0: -W / 2 + 0.5, x1: W / 2 - 0.5, z0: -D / 2 + 0.5, z1: D / 2 - 0.5 };
    spawn = { x: 0, z: 4.0, yaw: Math.PI }; exit = { x: 0, z: 5.2 };
    ceilingLight(-4, -2, 2, 0.4); ceilingLight(4, -2, 2, 0.4); ceilingLight(-4, 2.5, 2, 0.4); ceilingLight(4, 2.5, 2, 0.4);
    point(-4, 2.9, -1.5, 15, '#fff2d8', 16); point(4, 2.9, -1.5, 15, '#fff2d8', 16); point(0, 2.9, 3, 12, '#fff2d8', 14);
    windowPane(-3.2, 1.8, 5.88, 3.4, 1.5); windowPane(3.2, 1.8, 5.88, 3.4, 1.5);
    label('REGINA CITY HALL', 6.4, 0.9, 0, 2.55, -5.88, 0, { bg: '#1a2a44', accent: '#c9a64e' });
    // council desk + mayor
    box(6, 0.95, 0.9, '#6b4f36', 0, 0, -3.6, { collide: true }); box(6.2, 0.06, 1.0, '#8a6a48', 0, 0.95, -3.6); blob(0, -3.6, 6, 1, 0.35);
    npc(0, -4.7, 0, { skin: 3, hair: 'short', hairColor: 7, top: 'jacket_black', bottom: 'chino_tan', shoes: 'dress_black', facialHair: 'stubble', expression: 'smile' });
    for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), mat('#c9ccd2'), s * 2.6, 1.1, -5.3); box(0.9, 0.55, 0.03, s < 0 ? '#c8102e' : '#1f6f4a', s * 2.6 + 0.45, 1.5, -5.3); }
    interactables.push({ id: 'mayor', x: 0, z: -2.6, radius: 2.2, label: 'Talk to the mayor', run: (ctx) => ctx.ui.mayorTalk() });
    // ballot booths
    for (const z of [-1.8, 0, 1.8]) { box(1.2, 1.9, 0.08, '#3a4a68', 5.6, 0, z - 0.55, { collide: true }); box(1.2, 1.9, 0.08, '#3a4a68', 5.6, 0, z + 0.55, { collide: true }); box(0.1, 1.9, 1.1, '#3a4a68', 6.15, 0, z, { collide: true }); box(0.9, 0.06, 0.7, '#e8e1d0', 5.7, 1.0, z); blob(5.6, z, 1.4, 1.4, 0.3); }
    box(0.7, 1.0, 0.6, '#1f4f9a', 3.9, 0, 2.9, { collide: true }); box(0.4, 0.03, 0.04, '#0a0f1c', 3.9, 1.02, 2.9);
    interactables.push({ id: 'ballot', x: 4.1, z: 1.9, radius: 2.4, label: 'Vote / campaign (Town Hall app)', run: (ctx) => ctx.ui.openApp('townhall') });
    // notice board + canvass table
    box(0.12, 1.6, 3.2, '#8a6a48', -6.5, 0.6, 0, { collide: true }); label('NOTICES', 2.2, 0.45, -6.4, 2.45, 0, Math.PI / 2, { bg: '#3d2a1d', accent: '#c9a64e' });
    for (let k = 0; k < 6; k++) box(0.02, 0.5, 0.4, ['#f4efe4', '#ffe58a', '#bfe3ff'][k % 3], -6.42, 0.95 + (k % 2) * 0.55, -1.2 + k * 0.5);
    interactables.push({ id: 'notice', x: -5.4, z: 0, radius: 2.0, label: 'Read the notice board', run: (ctx) => ctx.ui.noticeBoard() });
    box(1.8, 0.8, 0.8, '#8a6a48', -4.2, 0, 3.4, { collide: true }); for (let k = 0; k < 4; k++) box(0.4, 0.05, 0.3, ['#c8102e', '#1f6f4a', '#f2c200', '#1f4f9a'][k], -4.7 + k * 0.32, 0.8, 3.4);
    interactables.push({ id: 'canvass', x: -4.2, z: 2.4, radius: 1.8, label: 'Hand out flyers for your candidate', run: (ctx) => ctx.ui.activity('canvass') });
    exitDoor(0, 5.2); box(2.0, 2.6, 0.08, '#3a2a1c', 0, 0, 5.93, { mo: { metalness: 0.2 } });
  }

  /* ---------- apartment: decorating (furniture, paint, flooring) ---------- */
  const floorTex = {};
  const setHome = (home) => {
    if (!apt || !decor) return;
    apt.wm.color.set((WALLS[home.wall] ?? WALLS.cream)[1]);
    const fk = FLOORS[home.floor] ? home.floor : 'oak', fl = FLOORS[fk];
    if (!floorTex[fk]) { const t = fl[1] === 'tile' ? tileTexture(fl[2], '#7b808a') : woodTexture(fl[2]); t.repeat.set(3, 11 / 3); floorTex[fk] = t; disposables.push(t); }
    if (apt.fm.map !== floorTex[fk]) { apt.fm.map = floorTex[fk]; apt.fm.needsUpdate = true; }
    while (decor.children.length) { const c = decor.children.pop(); c.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
    colliders.removeTag('furn');
    for (const it of home.placed || []) {
      const mdl = furnitureModel(it.type); mdl.position.set(it.x, 0, it.z); mdl.rotation.y = (it.rot * Math.PI) / 2; decor.add(mdl);
      const def = itemDef(it.type); if (def?.solid) { const f = footprint(it.type, it.rot); colliders.add(it.x - f.w / 2, it.z - f.d / 2, it.x + f.w / 2, it.z + f.d / 2, def.h, 'furn'); }
    }
  };

  const interior = {
    kind, group, setHome,
    /** Overhead (build-mode) view: hide ceiling fixtures that would otherwise show as white blocks. */
    setOverhead(on) { ceilMeshes.forEach((c) => (c.visible = !on)); }, colliders, interactables, bounds, spawn, exit,
    lights, task, stations,
    update(dt, env, ctx) { for (const f of animated) f(dt, env, ctx); const d = env?.night ?? 0; windows.forEach((m) => m.color.set(d > 0.6 ? '#10182e' : d > 0.2 ? '#e8a46a' : '#bfe3ff')); },
    resetTask() { task.carrying = false; task.target = -1; arrow.visible = ring.visible = false; },
    dispose() { disposables.forEach((d) => d.dispose?.()); },
  };
  return interior;
}
