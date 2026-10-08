import * as THREE from 'three';
import './style.css';
import { Store } from './core/store.js';
import * as G from './core/game.js';
import { fmtMoney } from './core/ledger.js';
import { reginaClock, seasonOf } from './core/time.js';
import { fetchWeather, simulateWeather } from './core/weather.js';
import { CONTACTS } from './data/contacts.js';
import { JOBS } from './data/jobs.js';
import { buildCity } from './world/city.js';
import { Atmosphere } from './world/sky.js';
import { buildInterior } from './world/interiors.js';
import { Pedestrians } from './world/npcs.js';
import { DISTRICTS, POIS, poiById } from './world/cityData.js';
import { Input, mountJoystick } from './player/input.js';
import { PlayerController } from './player/controller.js';
import { CameraRig } from './player/cameraRig.js';
import { Phone } from './ui/phone.js';
import { Panels } from './ui/panels.js';
import { MapView } from './ui/map.js';
import { Audio } from './ui/audio.js';
import { ICON } from './ui/icons.js';

const $ = (id) => document.getElementById(id);
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch-mode');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TIPS = ['Regina sits on a flat prairie under big skies — look for the sunsets.', 'Wascana Centre is one of the largest urban parks in North America.', 'Prairie Dollars are fictional. Earn them by working real shifts.', 'Press P for your phone, M for the city map.', 'Dress for the weather — it really does get that cold.', 'Tap a place in Maps to navigate, or hail a Quick Cab.'];
const QUALITY = [
  { name: 'low',    pr: 0.8, shadow: false, smap: 512,  view: 520,  npc: 4 },
  { name: 'medium', pr: 1.0, shadow: true,  smap: 1024, view: 900,  npc: 9 },
  { name: 'high',   pr: 1.5, shadow: true,  smap: 2048, view: 1350, npc: 14 },
  { name: 'ultra',  pr: 2.0, shadow: true,  smap: 2048, view: 1700, npc: 14 },
];

async function boot() {
  const store = new Store();
  const S = () => store.state;
  const loadBar = $('loadbar'), loadTxt = $('loadtxt');
  const progress = async (p, t) => { loadBar.style.width = p + '%'; loadTxt.textContent = t; await frame(); };
  $('loadtip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];

  /* ---------- renderer ---------- */
  const canvas = $('game');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' }); }
  catch (e) { loadTxt.textContent = 'WebGL is not available on this device/browser.'; throw e; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.25, 4200);
  scene.add(camera);

  let qLevel = isTouch ? 1 : 2; // auto start
  const setQuality = (lvl) => {
    qLevel = Math.max(0, Math.min(QUALITY.length - 1, lvl)); const Q = QUALITY[qLevel];
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Q.pr)); renderer.setSize(innerWidth, innerHeight, false);
    atmo.sun.castShadow = Q.shadow; if (atmo.sun.shadow.mapSize.x !== Q.smap) { atmo.sun.shadow.mapSize.set(Q.smap, Q.smap); atmo.sun.shadow.map?.dispose(); atmo.sun.shadow.map = null; }
    city.setViewDistance(Q.view); atmo.viewScale = Math.min(1, Q.view / 1350); ped.limit = Q.npc;
  };
  const applySettings = () => {
    const q = S().settings.quality; if (q !== 'auto') setQuality(QUALITY.findIndex((x) => x.name === q)); else setQuality(isTouch ? 1 : 2);
    rig.autoCenter = S().settings.autoCenter !== false; timeBase = Date.now(); lastEnvAt = 0;
  };

  /* ---------- world ---------- */
  await progress(8, 'Surveying Regina…');
  const atmo = new Atmosphere(scene, renderer);
  await progress(15, 'Raising downtown…');
  const city = buildCity({ quality: isTouch ? 'low' : 'high' });
  scene.add(city.group);
  await progress(55, 'Parking the cars…');
  await city.carsReady;
  await progress(68, 'Waking the pedestrians…');
  const ped = new Pedestrians(scene, { count: 14, temp: 12 }); ped.limit = 14;
  await progress(78, 'Meeting the locals…');

  const input = new Input(canvas);
  mountJoystick($('joy'), input);
  const player = new PlayerController(scene, S().player.look);
  const rig = new CameraRig(camera); rig.grid = city.colliders;
  const audio = new Audio(() => S().phone.volume);
  const studio = new THREE.DirectionalLight('#fff0dc', 0); scene.add(studio, studio.target);
  const flash = new THREE.SpotLight('#fff3dc', 0, 45, 0.45, 0.5, 1.3); flash.position.set(0, 1.5, 0); scene.add(flash, flash.target);

  const mapView = new MapView($('minimap'), { mode: 'mini', getState: () => mapState() });
  const fullCanvas = $('map-canvas');
  let mapOpen = false, fullMap = null, mapSel = null;

  let weather = simulateWeather();
  let timeBase = Date.now();
  let timeOverride = null;
  const virtualNow = () => timeOverride ? new Date(timeOverride + (Date.now() - timeBase)) : (S().settings.timeMode === 'fast' ? new Date(timeBase + (Date.now() - timeBase) * 60) : new Date());
  const clock = () => { const d = virtualNow(); return { ...reginaClock(d), date: d }; };
  let env = null, lastEnvAt = 0, lastSeason = '';
  const updateEnv = (force = false) => {
    const now = performance.now(), fast = S().settings.timeMode === 'fast';
    if (!force && now - lastEnvAt < (fast ? 400 : 4000)) return; lastEnvAt = now;
    env = atmo.setTime(virtualNow(), weather); city.setEnvironment(env);
    if (env.season !== lastSeason) { city.recolorTrees(env.season); lastSeason = env.season; }
    renderer.toneMappingExposure = atmo.exposureBase ?? 0.95;
  };
  const refreshWeather = async () => { weather = await fetchWeather(); ped.redress(weather.temp); updateEnv(true); store.commit('weather'); };

  /* ---------- game context shared by UI ---------- */
  const mapState = () => ({ x: player.pos.x, z: player.pos.z, yaw: player.yaw, dest: S().destination });
  let phone, panels, inInterior = null, interior = null, lastDoor = null, gameMode = 'loading', camMode = false, creator = false, fading = false;
  const toast = (msg, type = 'info') => {
    const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg; $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3600);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  };
  const fadeTo = async (on, ms = 450) => { const f = $('fade'); f.style.transitionDuration = ms + 'ms'; f.classList.toggle('on', on); await new Promise((r) => setTimeout(r, ms)); };
  const cabFare = (d) => 450 + Math.round(d * 0.35);
  const setDestination = (poi) => {
    S().destination = poi ? { id: poi.id, name: poi.name, x: poi.x, z: poi.z } : null; store.commit('destination');
    if (poi) toast(`Navigating to ${poi.name}`, 'info');
  };
  const rebuildPlayer = () => { player.setLook(S().player.look); };

  const ctx = {
    store, G, audio, toast, clock, weather: () => weather, refreshWeather, player: () => ({ x: player.pos.x, z: player.pos.z, yaw: player.yaw }),
    mapState, cabFare, setDestination, phone: () => phone, rebuildPlayer, applySettings,
    jobTitle: () => (S().job.active ? JOBS[S().job.active.id].title : ''),
    flushPending: () => G.flushPending(store),
    callLine: (id) => ({ dani: 'Hey you! Have you checked the Jobs app? The Market is hiring — and bring me back a coffee, eh?', mom: "Hi sweetheart, just checking you're eating and dressing warm!", market: 'Prairie Corner Market — your shift is ready whenever you are.', threads: 'Prairie Threads here — we love your style!', bank: 'This is Wascana Credit Union. Never share your PIN. Goodbye.' }[id] || 'Hello?'),
    openMap: () => openFullMap(), startCamera: () => startCamera(),
    resetGame: async () => { await fadeTo(true); store.reset(); location.reload(); },
    quickCab(poi) {
      if (inInterior) { toast('Leave the building first.', 'warn'); return false; }
      const d = Math.hypot(poi.x - player.pos.x, poi.z - player.pos.z);
      if (d < 40) { toast("You're already here!", 'info'); return false; }
      const fare = cabFare(d), r = store.ledger.debit(fare, `Quick Cab to ${poi.name}`, { category: 'travel' });
      if (!r.ok) { toast(r.error, 'warn'); audio.blip('error'); return false; }
      store.commit('bank'); audio.blip('cash');
      (async () => {
        await fadeTo(true); closeMap();
        player.teleport(poi.x, poi.z + 7, Math.PI); player.pos.z = poi.z + 7; city.colliders.resolve(player.pos, 0.5); player.syncRoot();
        rig.snapBehind(player.yaw); rig.snap(player);
        await new Promise((r2) => setTimeout(r2, 350)); await fadeTo(false); toast(`Arrived at ${poi.name} · paid ${fmtMoney(fare)}`, 'good');
      })();
      return true;
    },
    onPhoneToggle: (open) => { document.body.classList.toggle('phone-open', open); },
    hudBanner: (n) => {
      if (phone.isOpen || camMode) return; const b = $('banner'); b.innerHTML = phone.notifHtml(n); b.hidden = false; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
      clearTimeout(b._t); b._t = setTimeout(() => (b.hidden = true), 3600); b.onclick = () => { b.hidden = true; phone.open(); phone.openApp(n.app); };
    },
    onPanel: () => {},
    rebuildPlayerLook: rebuildPlayer,
  };
  phone = new Phone($('phone'), ctx);
  panels = new Panels($('panels'), { ...ctx, player: { gesture: (g) => player.gesture(g) } });
  panels.ctx.rebuildPlayer = rebuildPlayer;

  /* ---------- interiors ---------- */
  const interiors = {};
  const ictx = {
    store, game: G, fmt: fmtMoney, audio,
    player: { setCarry: (v) => player.setCarry(v), gesture: (g) => player.gesture(g), sitAt: (s) => player.sitAt(s) },
    ui: {
      toast, menu: (t, tx, b) => panels.menu(t, tx, b), shop: (t, ids, w) => panels.shop(t, ids, w), clothingShop: () => panels.clothingShop(),
      openWardrobe: () => panels.wardrobe(), openFridge: () => panels.fridge(), cook: () => panels.cook(), openApp: (id) => { phone.open(); phone.openApp(id); },
      exitInterior: () => exitInterior(),
      sleep: async () => {
        const n = S().needs; if (n.energy > 85) { toast("You're not tired right now.", 'info'); return; }
        fading = true; await fadeTo(true, 700); toast('💤 Sleeping…', 'info'); await new Promise((r) => setTimeout(r, 1400)); const r = G.sleep(store); await fadeTo(false, 700); fading = false;
        if (r.ok) toast('You feel well rested.', 'good');
      },
    },
  };
  async function enterInterior(kind, door) {
    if (fading || inInterior) return; fading = true; lastDoor = door;
    await fadeTo(true, 380);
    interior = interiors[kind] ||= buildInterior(kind); inInterior = kind;
    city.group.visible = false; ped.setVisible(false); scene.add(interior.group);
    setIndoor(true);
    player.teleport(interior.spawn.x, interior.spawn.z, interior.spawn.yaw); player.bounds = interior.bounds; player.grid = interior.colliders;
    if (!S().job.shift) interior.resetTask();
    rig.grid = interior.colliders; rig.indoor = true; rig.bounds = interior.bounds; rig.targetDist = 3.4; rig.pitch = 0.62; rig.snapBehind(interior.spawn.yaw); rig.snap(player);
    await new Promise((r) => setTimeout(r, 120)); await fadeTo(false, 380); fading = false;
    toast(({ market: 'Prairie Corner Market', threads: 'Prairie Threads', apartment: 'Wheat City Lofts · Unit 204' })[kind], 'info');
  }
  async function exitInterior() {
    if (fading || !inInterior) return; fading = true; await fadeTo(true, 380);
    interior.group.userData.tvOff?.(); scene.remove(interior.group); interior = null; inInterior = null;
    city.group.visible = true; ped.setVisible(true); setIndoor(false);
    player.bounds = null; player.grid = city.colliders; rig.grid = city.colliders; rig.indoor = false; rig.bounds = null; rig.targetDist = 6; rig.pitch = 0.28;
    const d = lastDoor; const out = d ? { x: d.x, z: d.z, yaw: Math.atan2(d.nx, d.nz) } : { x: city.spawn.x, z: city.spawn.z, yaw: 0 };
    player.teleport(out.x + d.nx * 0.8, out.z + d.nz * 0.8, out.yaw); rig.snapBehind(out.yaw); rig.snap(player);
    await new Promise((r) => setTimeout(r, 120)); await fadeTo(false, 380); fading = false;
  }
  function setIndoor(on) {
    atmo.indoor = on;
    atmo.dome.visible = !on; atmo.stars.visible = !on; atmo.moon.visible = !on; atmo.clouds.forEach((c) => (c.visible = !on));
    if (atmo.precip) atmo.precip.visible = !on;
    atmo.sun.visible = !on;
    if (on) { atmo.setTime(new Date(), weather); scene.background = new THREE.Color('#181a20'); scene.fog.near = 400; scene.fog.far = 900; }
    else { updateEnv(true); atmo.moon.visible = (env?.night ?? 0) > 0.05; }
    document.body.classList.toggle('indoors', on);
  }

  /* ---------- map ---------- */
  function openFullMap() {
    if (creator) return; mapOpen = true; $('map-full').classList.add('on'); phone.close();
    fullMap ||= new MapView(fullCanvas, { mode: 'full', getState: mapState, onSelect: (p) => { mapSel = p; renderMapCard(); } });
    fullMap.resize(); fullMap.focus(player.pos.x, player.pos.z, 0.16); fullMap.selected = S().destination?.id ?? null; mapSel = null; $('map-card').hidden = true;
  }
  function closeMap() { mapOpen = false; $('map-full').classList.remove('on'); }
  function renderMapCard() {
    const c = $('map-card'); if (!mapSel) { c.hidden = true; return; }
    const d = Math.hypot(mapSel.x - player.pos.x, mapSel.z - player.pos.z), fare = cabFare(d), isDest = S().destination?.id === mapSel.id;
    c.hidden = false;
    c.innerHTML = `<h3>${esc(mapSel.name)}</h3><p>${d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'} away · 🚶 ${Math.max(1, Math.round(d / 3.1 / 60))} min walk</p><div class="mc-btns"><button class="btn primary" data-a="nav">${isDest ? 'Stop navigation' : 'Navigate'}</button><button class="btn" data-a="cab" ${fare > S().bank.balance ? 'disabled' : ''}>Quick Cab · ${fmtMoney(fare)}</button></div>`;
  }
  $('map-card').addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a || !mapSel) return;
    if (a === 'nav') { setDestination(S().destination?.id === mapSel.id ? null : mapSel); renderMapCard(); closeMap(); }
    if (a === 'cab') ctx.quickCab(mapSel);
  });
  $('map-close').onclick = closeMap;
  $('mz-in').onclick = () => fullMap.zoomBy(1.4); $('mz-out').onclick = () => fullMap.zoomBy(1 / 1.4); $('mz-me').onclick = () => fullMap.focus(player.pos.x, player.pos.z);

  /* ---------- photo mode ---------- */
  const FILTERS = [['', 'Normal'], ['vivid', 'Vivid'], ['warm', 'Warm'], ['mono', 'Mono'], ['cool', 'Cool']];
  let filter = '', selfie = false;
  $('cam-filters').innerHTML = FILTERS.map(([k, n]) => `<button data-f="${k}" class="${k === '' ? 'on' : ''}">${n}</button>`).join('');
  $('cam-filters').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; document.body.className = document.body.className.replace(/filter-\w+/g, '').trim(); if (filter) document.body.classList.add('filter-' + filter); $('cam-filters').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
  function startCamera() { if (creator || camMode) return; camMode = true; phone.close(); closeMap(); $('camui').hidden = false; document.body.classList.add('hud-hidden'); updateThumb(); toast('Photo mode · drag to frame, scroll to zoom', 'info'); }
  function stopCamera() { camMode = false; selfie = false; rig.mode = 'follow'; $('camui').hidden = true; document.body.classList.remove('hud-hidden'); document.body.className = document.body.className.replace(/filter-\w+/g, '').trim(); filter = ''; $('cam-filters').querySelectorAll('button').forEach((x, i) => x.classList.toggle('on', i === 0)); }
  function updateThumb() { const p = S().photos[0]; $('cam-thumb').style.backgroundImage = p ? `url(${p.data})` : 'none'; }
  $('cam-close').onclick = stopCamera;
  $('cam-flip').onclick = () => { selfie = !selfie; rig.mode = selfie ? 'selfie' : 'follow'; if (selfie) rig.yaw = player.yaw; else rig.snapBehind(player.yaw); };
  $('cam-hud').onclick = () => $('camui').querySelector('.cam-filters').parentElement.classList.toggle('hidden');
  $('cam-thumb').onclick = () => { stopCamera(); phone.open(); phone.openApp('photos'); };
  $('cam-shutter').onclick = () => {
    renderer.render(scene, camera);
    const w = Math.min(720, canvas.width), h = Math.round((w * canvas.height) / canvas.width), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); try { g.filter = { vivid: 'saturate(1.5) contrast(1.08)', mono: 'grayscale(1) contrast(1.15)', warm: 'sepia(.35) saturate(1.25)', cool: 'saturate(1.1) hue-rotate(12deg)' }[filter] || 'none'; } catch {}
    g.drawImage(canvas, 0, 0, w, h);
    S().photos.unshift({ id: 'p' + Date.now().toString(36), t: Date.now(), data: c.toDataURL('image/jpeg', 0.72) }); S().photos.length = Math.min(S().photos.length, 12);
    store.commit('photos'); audio.blip('shutter'); const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); updateThumb();
  };

  /* ---------- interaction ---------- */
  let target = null;
  const nearestInteractable = () => {
    let best = null, bd = 1e9;
    const consider = (it, label) => {
      const d = Math.hypot(it.x - player.pos.x, it.z - player.pos.z); if (d > it.radius) return;
      if (it.enabled && !it.enabled(ictx)) return;
      const score = d / it.radius; if (score < bd) { bd = score; best = { it, label }; }
    };
    if (inInterior) for (const it of interior.interactables) consider(it, typeof it.label === 'function' ? it.label(ictx) : it.label);
    else {
      for (const it of city.interactables) consider(it, it.label);
      const n = ped.nearest(player.pos, 2.4); if (n) { const d = Math.hypot(n.x - player.pos.x, n.z - player.pos.z) / 2.4; if (d < bd) best = { npc: n, label: 'Say hi' }; }
    }
    return best;
  };
  const interact = () => {
    if (!target || creator || panels.open || mapOpen || camMode || fading) return;
    if (target.npc) { const n = target.npc; const msg = ped.greet(n, { px: player.pos.x, pz: player.pos.z, temp: weather.temp, night: env?.night > 0.6 }); player.gesture('wave', 1.4); toast(`🗣️ “${msg}”`, 'info'); S().needs.mood = Math.min(100, S().needs.mood + 1.5); return; }
    const it = target.it;
    if (it.kind === 'door') { enterInterior(it.enter, it); return; }
    audio.blip('tick'); it.run(ictx);
  };
  input.on('interact', interact);
  $('prompt').addEventListener('click', interact);
  $('t-interact').addEventListener('pointerdown', (e) => { e.preventDefault(); interact(); });
  $('t-run').addEventListener('pointerdown', (e) => { e.preventDefault(); input.runToggle = !input.runToggle; $('t-run').classList.toggle('on', input.runToggle); });
  const togglePhone = () => { if (creator || camMode) return; phone.toggle(); };
  input.on('phone', togglePhone); $('b-phone').onclick = togglePhone;
  input.on('map', () => (mapOpen ? closeMap() : openFullMap())); $('b-map').onclick = () => (mapOpen ? closeMap() : openFullMap());
  const openOutfit = () => { if (creator || camMode) return; if (!inInterior) { toast('Change outfits at home or in a clothing store.', 'info'); return; } panels.wardrobe(); };
  input.on('wardrobe', openOutfit); $('b-wardrobe').onclick = openOutfit;
  input.on('view', () => (camMode ? stopCamera() : startCamera()));
  input.on('escape', () => { if (panels.open) panels.close(); else if (mapOpen) closeMap(); else if (camMode) stopCamera(); else if (phone.isOpen) phone.close(); });

  /* ---------- new game / title ---------- */
  const startPlay = () => {
    gameMode = 'play'; creator = false; camera.clearViewOffset(); rig.mode = 'follow'; rig.targetDist = 6;
    $('title').classList.remove('on'); $('hud').classList.remove('hidden'); S().started = true; store.commit('started');
    input.enabled = true; rig.snapBehind(player.yaw); rig.snap(player);
    setTimeout(() => ($('hud-hint').style.opacity = '0'), 14000);
  };
  const newLife = () => {
    store.reset(); phone.applyWallpaper(); rebuildPlayer(); player.teleport(city.spawn.x, city.spawn.z, city.spawn.heading);
    creator = true; gameMode = 'creator'; $('title').classList.remove('on'); rig.mode = 'creator'; rig.yaw = player.yaw + 0.5; rig.snap(player);
    const off = () => camera.setViewOffset(innerWidth, innerHeight, innerWidth * (innerWidth > 760 ? 0.17 : 0), innerWidth > 760 ? 0 : innerHeight * 0.18, innerWidth, innerHeight);
    off();
    panels.characterPanel({ creator: true, onDone: () => {
      const f = S().flags ||= {}; f.welcomed = true;
      G.receiveMessage(store, 'dani', `Welcome to Regina, ${S().player.name}! 🌾 Grab groceries at the Market across Victoria Ave and check the Jobs app on your phone (press P).`, 20000);
      G.receiveMessage(store, 'mom', 'Settled in? Remember to eat and stay warm. Love you!', 55000);
      startPlay(); toast(`Welcome to Regina, ${S().player.name}!`, 'good');
    } });
  };
  $('btn-new').onclick = () => {
    if (store.hasSave() && S().started) panels.menu('Start a new life?', 'This will erase your current progress on this device.', [{ label: 'Keep my save' }, { label: 'Erase & start over', danger: true, run: newLife }]);
    else newLife();
  };
  $('btn-continue').onclick = () => { audio.blip('ok'); player.teleport(S().pos?.x ?? city.spawn.x, S().pos?.z ?? city.spawn.z, S().pos?.yaw ?? city.spawn.heading); startPlay(); toast(`Welcome back, ${S().player.name}.`, 'good'); };

  /* ---------- HUD ---------- */
  const hudMoney = $('hud-money'), hudNeeds = $('hud-needs'), hudClock = $('hud-clock'), hudPlace = $('hud-place'), hudDest = $('hud-dest'), hudJob = $('hud-job'), promptEl = $('prompt');
  hudNeeds.innerHTML = ['⚡', '🍽️', '🙂'].map((i) => `<div><span>${i}</span><div class="bar"><i></i></div></div>`).join('');
  let hudT = 1, lastPrompt = '';
  const updateHud = (dt) => {
    hudT += dt; if (hudT < 0.2) return; hudT = 0; const s = S();
    hudMoney.textContent = fmtMoney(s.bank.balance);
    const vals = [s.needs.energy, s.needs.hunger, s.needs.mood];
    hudNeeds.querySelectorAll('.bar').forEach((b, i) => { b.firstChild.style.width = vals[i] + '%'; b.classList.toggle('low', vals[i] < 20); });
    const c = clock(); hudClock.innerHTML = `${c.label} ${c.ampm} <small>${weather.icon} ${weather.temp}°${weather.live ? '' : ' · sim'}</small>`;
    // place
    let place = inInterior ? { market: 'Prairie Corner Market', threads: 'Prairie Threads', apartment: 'Wheat City Lofts' }[inInterior] : 'Regina';
    if (!inInterior) { let bd = 1e9; for (const d of DISTRICTS) { const k = Math.hypot(player.pos.x - d.x, player.pos.z - d.z) - d.r; if (k < bd && k < 0) { bd = k; place = d.name; } } }
    hudPlace.textContent = place;
    // destination
    const dst = s.destination;
    if (dst && !inInterior) {
      const dx = dst.x - player.pos.x, dz = dst.z - player.pos.z, d = Math.hypot(dx, dz);
      if (d < 14) { toast(`You've arrived: ${dst.name}`, 'good'); audio.blip('ok'); s.destination = null; store.commit('destination'); hudDest.hidden = true; }
      else { const ang = Math.atan2(dx, dz) - (rig.yaw + Math.PI); hudDest.hidden = false; hudDest.innerHTML = `<span class="arrow" style="transform:rotate(${(-ang * 180) / Math.PI + 180}deg)">➤</span> <b>${esc(dst.name)}</b> ${d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'}`; }
    } else hudDest.hidden = true;
    // job objective
    const sh = s.job.shift;
    if (sh) {
      let txt = `Shift ${sh.tasksDone}/${sh.tasksTotal}`;
      if (inInterior && interior?.task) { const t = interior.task; txt += sh.tasksDone >= sh.tasksTotal ? ' · Clock out at the counter' : t.carrying ? ` · Deliver to ${interior.stations[t.target]?.name}` : ' · Pick up stock'; }
      hudJob.hidden = false; hudJob.textContent = '💼 ' + txt;
    } else hudJob.hidden = true;
    const un = G.unreadTotal(s); const bd = $('b-phone').querySelector('.badge'); bd.hidden = !un; bd.textContent = un;
  };
  const setPrompt = (label) => {
    if (label === lastPrompt) return; lastPrompt = label;
    if (!label) { promptEl.hidden = true; return; }
    promptEl.hidden = false; promptEl.querySelector('span').textContent = label; promptEl.querySelector('kbd').textContent = isTouch ? '👆' : 'E';
  };

  /* ---------- store events ---------- */
  store.subscribe((topic) => {
    if (topic === 'look') rebuildPlayer();
    if (topic === 'phone' || topic === 'reset') { const on = S().phone.flashlight; flash.intensity = on ? 90 : 0; }
    if (topic === 'bank' || topic === 'inventory') renderMapCard();
  });

  /* ---------- resize ---------- */
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    if (creator) camera.setViewOffset(innerWidth, innerHeight, innerWidth > 760 ? innerWidth * 0.17 : 0, innerWidth > 760 ? 0 : innerHeight * 0.18, innerWidth, innerHeight);
  });
  addEventListener('pagehide', () => { savePos(); store.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { savePos(); store.save(); } });
  const savePos = () => { if (!inInterior && gameMode === 'play') S().pos = { x: player.pos.x, z: player.pos.z, yaw: player.yaw }; };

  /* ---------- go ---------- */
  await progress(88, 'Painting the sky…');
  applySettings(); updateEnv(true); setQuality(qLevel);
  const spawn = S().pos ?? city.spawn; player.teleport(spawn.x, spawn.z, spawn.yaw ?? spawn.heading ?? 0); player.grid = city.colliders;
  rig.snapBehind(player.yaw); rig.snap(player);
  await progress(94, 'Compiling shaders…');
  try { renderer.compile(scene, camera); } catch {}
  refreshWeather(); setInterval(refreshWeather, 20 * 60 * 1000);
  await progress(100, 'Ready');
  await new Promise((r) => setTimeout(r, 300));
  $('loading').classList.remove('on');
  gameMode = 'title'; $('title').classList.add('on');
  $('btn-continue').style.display = store.hasSave() && S().started ? '' : 'none';
  $('title-note').textContent = store.hasSave() && S().started ? `Saved life: ${S().player.name} · ${fmtMoney(S().bank.balance)}` : 'Your progress saves automatically on this device.';
  phone.applyWallpaper(); phone.setView(S().phone.unlocked ? 'home' : 'lock'); phone.refreshHome(); phone.renderStatus();

  /* ---------- scripted life events ---------- */
  setInterval(() => {
    if (gameMode !== 'play') return;
    G.tickNeeds(store, 1); G.tickJobs(store);
    const s = S(), f = (s.flags ||= {});
    if (s.job.application?.status === 'offered' && !f.offerCall) { f.offerCall = true; phone.incomingCall(JOBS[s.job.application.id].contact, 'Good news — we would like to offer you the job! Open the Jobs app to accept.'); }
    if (!s.job.active && !s.job.application && !f.daniCall && s.created && Date.now() - s.created > 150000) { f.daniCall = true; phone.incomingCall('dani'); }
    if (s.needs.hunger < 12 && !f.hungerHint) { f.hungerHint = true; toast("You're hungry — buy food at Prairie Corner Market.", 'warn'); }
    if (s.needs.energy < 12 && !f.tiredHint) { f.tiredHint = true; toast("You're exhausted — sleep in your apartment or grab a coffee.", 'warn'); }
    if (s.needs.hunger > 30) f.hungerHint = false; if (s.needs.energy > 30) f.tiredHint = false;
    if (!inInterior) { savePos(); }
    if ((Date.now() | 0) % 5 === 0) store.commit('needs');
    phone.tick();
  }, 1000);
  setInterval(() => { if (gameMode === 'play') { phone.tick(); } }, 30000);

  /* ---------- main loop ---------- */
  const clockT = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, lowT = 0, highT = 0, titleT = 0;
  const tmp = new THREE.Vector3();
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 90, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beacon.visible = false; scene.add(beacon);

  const loop = () => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clockT.getDelta());
    // adaptive quality
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 2) {
      const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
      if (S().settings.quality === 'auto' && gameMode === 'play') {
        if (fps < 36) { lowT++; highT = 0; if (lowT >= 2 && qLevel > 0) { setQuality(qLevel - 1); lowT = 0; } }
        else if (fps > 57) { highT++; lowT = 0; if (highT >= 6 && qLevel < (isTouch ? 1 : 3)) { setQuality(qLevel + 1); highT = 0; } } else { lowT = 0; highT = 0; }
      }
    }
    input.enabled = gameMode === 'play' && !panels.open && !mapOpen && !fading && !creator;
    const slow = S().needs.hunger < 8 || S().needs.energy < 8 ? 0.75 : 1;
    updateEnv();

    if (gameMode === 'title' || gameMode === 'loading') {
      titleT += dt; const a = titleT * 0.08, R = 62;
      camera.position.set(city.spawn.x + Math.cos(a) * R, 16 + Math.sin(titleT * 0.2) * 3, city.spawn.z + Math.sin(a) * R); camera.lookAt(city.spawn.x, 9, city.spawn.z);
      player.char.update(dt); ped.update(dt, player.pos);
    } else {
      player.update(dt, input, rig.yaw, player.grid ?? city.colliders, slow);
      if (!inInterior) ped.update(dt, player.pos);
      const speedNorm = Math.min(1, player.speed / 7.2);
      rig.update(dt, input, player, { speedNorm, sensitivity: isTouch ? 0.9 : 1 });
      if (creator && rig.mode !== 'creator') rig.mode = 'creator';
    }
    // studio key light for the character creator / selfie so faces are always readable, even at night
    const lit = creator || rig.mode === 'selfie';
    studio.intensity += ((lit ? 2.1 : 0) - studio.intensity) * Math.min(1, dt * 6);
    if (studio.intensity > 0.02) { studio.position.set(camera.position.x + Math.cos(rig.yaw) * 2.5, camera.position.y + 2, camera.position.z - Math.sin(rig.yaw) * 2.5); studio.target.position.set(player.pos.x, 1.4, player.pos.z); }
    // flashlight follows player facing
    if (flash.intensity > 0) { flash.position.set(player.pos.x, 1.4, player.pos.z); flash.target.position.set(player.pos.x + Math.sin(player.yaw) * 10, 0.5, player.pos.z + Math.cos(player.yaw) * 10); }
    if (inInterior) interior.update(dt, env, ictx);
    else city.update(dt, camera.position);
    atmo.update(dt, camera, player.pos);
    // destination beacon
    const dst = S().destination; beacon.visible = !!dst && !inInterior && gameMode === 'play';
    if (beacon.visible) { beacon.position.set(dst.x, 45, dst.z); beacon.material.opacity = 0.22 + Math.sin(performance.now() / 500) * 0.08; }
    // interaction prompt
    if (gameMode === 'play' && !panels.open && !mapOpen && !camMode && !creator) { target = nearestInteractable(); setPrompt(target?.label ?? ''); } else { target = null; setPrompt(''); }
    // minimap + hud
    if (gameMode === 'play' && !camMode) { mapView.draw(); updateHud(dt); }
    if (mapOpen) fullMap.draw();
    renderer.render(scene, camera);
  };
  loop();

  /* ---------- debug / test handle ---------- */
  window.__regina = {
    store, G, player, rig, city, camera, scene, renderer, phone, panels, ctx, atmo,
    get inInterior() { return inInterior; }, get mode() { return gameMode; }, get fps() { return fpsN / Math.max(0.001, fpsAcc); },
    enterInterior: (k) => enterInterior(k, { x: 0, z: 0, nx: 0, nz: 1 }), exitInterior, interactNow: interact, getTarget: () => target,
    stationTarget: () => { const t = interior?.task; if (!t || t.target < 0) return null; const st = interior.stations[t.target]; return { x: st.x, z: st.z }; },
    setTime: (iso) => { timeBase = Date.now(); timeOverride = iso ? new Date(iso).getTime() : null; updateEnv(true); }, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }),
    tp: (x, z) => { player.teleport(x, z); rig.snap(player); }, setWeather: (w) => { weather = { ...weather, ...w }; updateEnv(true); }, qLevel: () => qLevel, setQuality,
    skipTitle: () => { $('btn-continue').style.display === 'none' ? newLife() : $('btn-continue').click(); },
  };
}

boot().catch((e) => { console.error(e); const t = document.getElementById('loadtxt'); if (t) t.textContent = 'Something went wrong: ' + (e?.message || e); });
