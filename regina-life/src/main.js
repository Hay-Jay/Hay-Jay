import * as THREE from 'three';
import './style.css';
import './theme.css';
import './ui/amazing.css';
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
import { makeJuice } from './ui/juice.js';
import { ICON } from './ui/icons.js';
import { Hub } from './ui/hub.js';
import { rollEvent, resolveEvent, choiceAvailable, EVENT_BY_ID } from './core/events.js';
import { generateNews } from './core/news.js';
import { expireAds, adQuote, activeAd } from './core/ads.js';
import * as SOC from './core/social.js';
import * as POL from './core/politics.js';
import * as H from './core/home.js';
import { planMove, upgradeHome } from './core/move.js';
import { lotOf, roomAtFloor } from './core/lot.js';
import { cutSidesFor } from './world/homeWalls.js';
import { HOMES, layoutOf } from './data/homes.js';
import { policyMult } from './core/policy.js';
import { travel, cabFare } from './core/travel.js';
import { Radio } from './ui/radio.js';
import { STATIONS } from './data/radio.js';
import { BuildMode } from './ui/build.js';
import { Catalogue } from './ui/catalogue.js';
import { makeThumbs } from './ui/thumbs.js';
import { Shell, moodOf } from './ui/shell.js';
import { dailyStatus, claimDaily, REWARD_CENTS } from './core/daily.js';
import { updateOnboarding } from './core/onboarding.js';
import { FirstDay } from './ui/firstday.js';
import { POLICIES, CANDIDATE_BY_ID } from './data/policies.js';

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
  // MSAA on phones too: tile-based mobile GPUs resolve it on-chip, and at pixel ratio 1 it is the difference between jaggy and clean (visual audit)
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { loadTxt.textContent = 'WebGL is not available on this device/browser.'; throw e; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral keeps the palette's colours (ACES crushed the darks and pushed pastels to white); PCFSoftShadowMap is gone in three r186, softness comes from shadow.radius
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
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
    renderer.toneMappingExposure = atmo.exposureBase ?? 1;
    if (homeView && inInterior) { scene.background = homeSky(); homeStage.tint?.(env.night ?? 0); }
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
  /* ---------- juice: every payoff answers back (floaters over your head, coins into the wallet, chimes, confetti for firsts) ---------- */
  const juice = makeJuice({ camera, canvas, audio, moneyEl: () => (document.body.classList.contains('shell-on') ? $('tb-money') : $('hud-money')) });
  const headAt = () => new THREE.Vector3(player.pos.x, 2.15, player.pos.z);
  const NEED_NAMES = { energy: 'Energy', hunger: 'Hunger', hygiene: 'Hygiene', fun: 'Fun', mood: 'Mood' };
  const snap = () => ({ needs: { ...S().needs }, skills: { ...S().skills }, bal: S().bank.balance });
  /** Show what just changed since `b` (a snap()): the two biggest need gains, any skill XP or level-up, money in or out. */
  const showGains = (b, at = headAt()) => {
    const s = S(), ds = Object.keys(NEED_NAMES).map((k) => [k, Math.round((s.needs[k] ?? 0) - (b.needs[k] ?? 0))]).filter(([, d]) => d >= 2).sort((x, y) => y[1] - x[1]).slice(0, 2);
    ds.forEach(([k, d], i) => setTimeout(() => juice.floater(`+${d} ${NEED_NAMES[k]}`, at, 'good'), i * 220));
    if (ds.length) { audio.chime('gain'); juice.pulse(hudNeeds); }
    let lvl = false;
    for (const k of Object.keys(G.SKILLS)) {
      const before = G.skillLevel(b.skills?.[k] || 0), after = G.skillLevel(s.skills?.[k] || 0);
      if (after > before) { lvl = true; setTimeout(() => { juice.floater(`${G.SKILLS[k].icon} ${G.SKILLS[k].name} level ${after}!`, at, 'skill', { big: true }); audio.chime('fanfare'); juice.confetti(40); }, 520); }
      else if ((s.skills?.[k] || 0) > (b.skills?.[k] || 0)) setTimeout(() => juice.floater(`${G.SKILLS[k].icon} +${G.SKILLS[k].name}`, at, 'skill'), ds.length * 220);
    }
    const dm = s.bank.balance - b.bal; if (dm > 0) juice.pay(dm, at); else if (dm < 0) juice.spend(-dm);
    return { needs: ds, levelUp: lvl, money: dm };
  };
  const fadeTo = async (on, ms = 450) => { const f = $('fade'); f.style.transitionDuration = ms + 'ms'; f.classList.toggle('on', on); await new Promise((r) => setTimeout(r, ms)); };
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
    callLine: (id) => ({ dani: 'Hey you! Have you checked the Jobs app? The Market is hiring — and bring me back a coffee, eh?', mom: "Hi sweetheart, just checking you're eating and dressing warm!", market: 'Prairie Corner Market — your shift is ready whenever you are.', threads: 'Prairie Threads here — we love your style!', bank: 'This is Big Sky Savings. Never share your PIN. Goodbye.' }[id] || 'Hello?'),
    news: () => generateNews({ date: virtualNow(), clock: clock(), weather, season: seasonOf(clock().month), state: S() }),
    adsFocus: null, refreshBillboards: () => city.refreshBillboards(S().ads, Date.now(), policyMult(S(), 'ads')),
    confirm: (title, text, yes, run) => panels.menu(title, text, [{ label: yes, primary: true, run }, { label: 'Cancel' }]),
    isBuilding: () => build.active,
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
        await fadeTo(true); closeMap(); closeMapOverview();
        player.teleport(poi.x, poi.z + 7, Math.PI); player.pos.z = poi.z + 7; city.colliders.resolve(player.pos, 0.5); player.syncRoot();
        rig.snapBehind(player.yaw); rig.snap(player);
        await new Promise((r2) => setTimeout(r2, 350)); await fadeTo(false); toast(`Arrived at ${poi.name} · paid ${fmtMoney(fare)}`, 'good'); G.tally(S(), 'visits'); juice.spend(fare);
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
    fx: { juice, snap, gains: (b, at) => showGains(b, at) },
  };
  const radio = new Radio(audio, { getNews: () => ctx.news() }); ctx.radio = radio; radio.volume = S().radio?.volume ?? 0.7; radio.onVolume = (v) => { S().radio.volume = v; store.commit('phone-quiet'); };
  ctx.startTrip = (destId, mode) => {
    const r = travel(store, destId, mode); if (!r.ok) { toast(r.error, 'warn'); audio.blip('error'); return; }
    audio.blip('cash'); phone.close();
    panels.progress(`${mode === 'flight' ? '✈️ Flying to' : '🚌 Riding to'} ${r.dest.name}…`, 3.5, () => {
      const back = () => toast(`Back in Regina${r.first ? ` · 🎁 ${r.dest.souvenir}` : ''}`, 'good');
      if (!r.event) return back();
      panels.event(r.event, { can: (i) => choiceAvailable(store, r.event, i), pick: (i) => { const x = resolveEvent(store, r.event.id, i); if (x.ok) audio.blip('ok'); return x; }, onClose: back });
    }, { stop: false });
  };
  ctx.moveHome = (id) => moveHome(id);
  phone = new Phone($('phone'), ctx);
  panels = new Panels($('panels'), { ...ctx, player: { gesture: (g) => player.gesture(g) } });
  panels.ctx.rebuildPlayer = rebuildPlayer;

  let homeView = false;
  /* ---------- build mode ---------- */
  // buildTop: how much of the top of the screen the overhead camera must keep clear. Home view wants the top bar and chips; build mode on a multi-room home also the
  // room focus strip. The larger of the two wins, and the Studio (no strip) behaves exactly as it always did.
  let homeTop = 0, stripTop = 0, wallMode = null;   // wallMode: the session's Walls choice ('up' | 'cut' | 'down'); null = the interior's own default. Not saved.
  const applyTop = () => { rig.buildTop = Math.max(homeView ? homeTop : 0, stripTop); };
  // toasts normally start 104 px down (theme.css); while the focus strip is up they start just below it, so a toast never sits on the chips (the strip is 0 high in the Studio)
  const placeToasts = () => { $('toasts').style.top = stripTop > 0 ? `max(calc(104px + var(--safe-t)), ${Math.round(stripTop * innerHeight) + 12}px)` : ''; };
  const build = new BuildMode({ canvas, camera, scene, store, panels, audio, toast, isBlocked: () => phone.isOpen, onLayout: (f, top = 0) => { rig.buildInset = f; stripTop = top; if (build.active) { applyTop(); placeToasts(); } },
    onWallMode: (m) => { wallMode = m; interior?.setWallMode?.(m); },
    onFocus: (id, rect) => rig.setBuildFocus(rect),
    onStart: () => { rig.mode = 'build'; rig.indoor = true; input.runToggle = false; interior?.setOverhead(true); orbitOn(false); if (interior?.overheadMode) build.setWallMode(interior.overheadMode); },
    onStop: () => {
      stripTop = 0; placeToasts();
      if (homeView) { interior?.setOverhead(true); rig.mode = 'build'; orbitOn(true); homeInsets(); toast('Home saved', 'good'); return; } // back to the live dollhouse view
      interior?.setOverhead(false); rig.endBuild(); rig.mode = 'follow'; rig.targetDist = 3.2; rig.pitch = 0.46; rig.snapBehind(player.yaw); rig.snap(player); camera.fov = 62; camera.updateProjectionMatrix(); toast('Home saved', 'good');
    } });
  /** The Buy tab: a bottom sheet over the Home view / build mode. Pieces you buy are handed to build mode to place. */
  const catalogue = new Catalogue({ store, build, audio, toast, fmtMoney, thumbs: makeThumbs({ size: 160 }), canBuild: () => inInterior === 'apartment',
    onChange: () => build.refresh(), onOpen: (c) => { c.setRoom(build.active ? build.focus : null); buyOpen = true; document.body.classList.add('cat-open'); if (homeView && !build.active) homeInsets(); syncTab(); }, onClose: () => { buyOpen = false; document.body.classList.remove('cat-open'); if (homeView && !build.active) homeInsets(); syncTab(); } });
  build.setCatalogue(catalogue);

  /* ---------- interiors ---------- */
  // Cache: the shops and the gym by kind, the home as `apartment:<layoutId>` (docs/HOMES.md section 6, cache invariant). Only the entry for the layout the save
  // lives in survives: a move, New life, a bad save or a move made while outdoors can never hand the player an interior of the wrong layout.
  const interiors = {};
  const homeKey = () => `apartment:${layoutOf(S()).id}`;
  const interiorKey = (kind) => (kind === 'apartment' ? homeKey() : kind);
  /** Dispose every cached apartment except the one for the current layout (never the one that is on screen: swap first). */
  const dropStaleApartments = () => {
    const keep = homeKey();
    for (const k of Object.keys(interiors)) if (k.startsWith('apartment:') && k !== keep && interiors[k] !== interior) { interiors[k].dispose(); delete interiors[k]; }
  };
  const interiorFor = (kind) => {
    if (kind === 'apartment') { dropStaleApartments(); return (interiors[homeKey()] ||= buildInterior('apartment', { layout: layoutOf(S()) })); }
    return (interiors[kind] ||= buildInterior(kind));
  };
  const ictx = {
    store, game: G, fmt: fmtMoney, audio, fx: ctx.fx, did: (what, id) => ctx.onDid?.(what, id),
    player: { setCarry: (v) => player.setCarry(v), gesture: (g) => player.gesture(g), sitAt: (s) => player.sitAt(s) },
    ui: {
      toast, menu: (t, tx, b) => panels.menu(t, tx, b), shop: (t, ids, w) => panels.shop(t, ids, w), clothingShop: () => panels.clothingShop(),
      openWardrobe: () => panels.wardrobe(), openFridge: () => panels.fridge(), cook: () => panels.cook(), openApp: (id) => { phone.open(); phone.openApp(id); },
      exitInterior: () => exitInterior(),
      furnitureShop: () => catalogue.open(),
      openStorage: () => catalogue.open('in-storage'),
      build: () => { if (inInterior !== 'apartment') return; phone.close(); build.start(); },
      radioMenu: () => panels.menu('📻 Radio', radio.playing ? `Now playing: ${radio.nowTitle}` : 'Pick a station. The music is generated live in your browser.', [...STATIONS.map((st) => ({ label: `${st.emoji} ${st.name} · ${st.freq}`, run: () => radio.play(st.id) })), { label: '⏹ Turn off', run: () => radio.stop() }]),
      mayorTalk: () => {
        const p = POL.ensurePolitics(store), m = CANDIDATE_BY_ID[p.mayor.id], pol = POLICIES[p.mayor.policy], h = Math.max(0, Math.floor(POL.timeLeft(p, Date.now()) / 3.6e6));
        panels.menu(`${m.emoji} Mayor ${m.name}`, `“${m.slogan}” — Current policy: ${pol.name}: ${pol.effect}. Next election in about ${h} hours.`, [{ label: 'Open Town Hall app', primary: true, run: () => { phone.open(); phone.openApp('townhall'); } }, { label: 'Leave' }]);
      },
      noticeBoard: () => { const p = POL.ensurePolitics(store), pol = POLICIES[p.mayor.policy]; panels.menu('📌 City notices', `• ${pol.icon} ${pol.name}: ${pol.effect}.\n• Election term ${p.term} is under way — vote in the Town Hall app.\n• ${ctx.news()[2]?.title ?? 'Council meets Tuesday.'}`, [{ label: 'Close' }]); },
      activity: (id) => {
        const bad = G.activityBlocked(store, id); if (bad) { toast(bad, 'warn'); audio.blip('error'); return; }
        const a = G.ACTIVITIES[id]; player.gesture('use', a.secs); const b = snap();
        panels.progress(a.label, a.secs, () => { const r = id === 'canvass' ? POL.canvass(store) : G.doActivity(store, id, { home: inInterior === 'apartment' }); if (r.ok) { audio.blip('ok'); showGains(b); toast(activityToast(id), 'good'); ctx.onDid?.('activity', id); } else toast(r.error, 'warn'); });
      },
      sleep: async () => {
        const n = S().needs; if (n.energy > 85) { toast("You're not tired right now.", 'info'); return; }
        const b = snap();
        fading = true; await fadeTo(true, 700); toast('💤 Sleeping…', 'info'); await new Promise((r) => setTimeout(r, 1400)); const r = G.sleep(store, { home: inInterior === 'apartment' }); await fadeTo(false, 700); fading = false;
        if (r.ok) { toast('You feel well rested.', 'good'); showGains(b); ctx.onDid?.('sleep'); }
      },
    },
  };
  const activityToast = (id) => ({ shower: 'Fresh as a prairie breeze 🚿', tv: 'That was a good episode 📺', read: 'You learned something 📖', treadmill: 'Great run! +Fitness 💪', weights: 'Solid set! +Fitness 💪', yoga: 'So zen 🧘', piano: 'Lovely tune 🎹', paint: 'A little masterpiece 🎨', gaming: 'Good game! 🎮', water: 'Hydrated 💧', canvass: 'Flyers gone — your candidate thanks you 🗳️' })[id] || 'Done';
  /**
   * Put `next` on screen as the interior the player is in (enterInterior) or is being moved into (moveHome): scene, collision, camera limits, and for a home its
   * furniture and paint, the overhead/wall mode, build mode's grid, the Home stage and the overhead camera frame. Whatever interior was attached before is taken
   * off the scene (the caller disposes it if it is not cached any more).
   */
  function attachInterior(next) {
    const prev = interior;
    if (prev && prev !== next) { prev.group.userData.tvOff?.(); scene.remove(prev.group); }
    interior = next; scene.add(next.group);
    player.bounds = next.bounds; player.grid = next.colliders; rig.grid = next.colliders; rig.bounds = next.bounds; rig.indoor = true;
    if (next.kind !== 'apartment') return;
    const lot = lotOf(next.layout), multi = next.rooms.length > 1;
    next.setHome(S().home);
    if (multi && wallMode) next.setWallMode(wallMode);          // the session's Walls choice survives a move (never applied to the Studio: its overhead view is 'up')
    next.setOverhead(homeView || build.active);
    if (homeView && !build.active) orbitOn(true);
    build.setLayout(next.layout); build.setWallMode(next.overheadMode);
    homeStage.fit(lot.yardRect ?? lot.bbox); rig.setBuildFrame(lot.bbox); rig.setBuildFocus(null);
  }
  async function enterInterior(kind, door) {
    if (fading || inInterior) return; fading = true; lastDoor = door;
    await fadeTo(true, 380);
    const repaired = kind === 'apartment' ? H.repairHome(store) : 0;
    const next = interiorFor(kind); inInterior = kind;
    city.group.visible = false; ped.setVisible(false);
    setIndoor(true);
    attachInterior(next);
    player.teleport(next.spawn.x, next.spawn.z, next.spawn.yaw);
    if (!S().job.shift) next.resetTask();
    if (repaired) toast(`Some furniture was blocking the way — ${repaired} piece${repaired > 1 ? 's' : ''} moved to storage.`, 'info');
    rig.targetDist = 3.2; rig.pitch = 0.46; rig.snapBehind(next.spawn.yaw); rig.snap(player);
    await new Promise((r) => setTimeout(r, 120)); await fadeTo(false, 380); fading = false;
    toast(({ market: 'Prairie Corner Market', threads: 'Prairie Threads', apartment: layoutOf(S()).title, gym: 'Prairie Fitness', cityhall: 'Regina City Hall' })[kind], 'info');
    if (kind !== 'apartment') G.tally(S(), 'visits');
  }
  async function exitInterior() {
    if (fading || !inInterior) return; if (homeView) setHomeView(false); fading = true; await fadeTo(true, 380);
    interior.group.userData.tvOff?.(); scene.remove(interior.group); interior = null; inInterior = null;
    city.group.visible = true; ped.setVisible(true); setIndoor(false);
    player.bounds = null; player.grid = city.colliders; rig.grid = city.colliders; rig.indoor = false; rig.bounds = null; rig.targetDist = 6; rig.pitch = 0.28;
    const d = lastDoor; const out = d ? { x: d.x, z: d.z, yaw: Math.atan2(d.nx, d.nz) } : { x: city.spawn.x, z: city.spawn.z, yaw: 0 };
    player.teleport(out.x + d.nx * 0.8, out.z + d.nz * 0.8, out.yaw); rig.snapBehind(out.yaw); rig.snap(player);
    await new Promise((r) => setTimeout(r, 120)); await fadeTo(false, 380); fading = false;
  }
  /**
   * Move up to a bigger home (docs/HOMES.md section 6, in this order): refuse politely, fade out, build the new interior BEFORE paying (so a failed build costs
   * nothing), pay and change the save in one go (upgradeHome), then swap the interior if the player is standing in the apartment (otherwise the new interior just waits
   * in the cache for the next enterInterior), fade back in, say where you live now. Returns true when the move happened.
   */
  async function moveHome(tierId) {
    if (fading || creator || camMode || build.active || gameMode !== 'play') { toast('Not right now.', 'warn'); return false; }
    const plan = planMove(S(), tierId); if (!plan.ok) { toast(plan.error, 'warn'); audio.blip('error'); return false; }
    fading = true; phone.close(); panels.close(); catalogue.close(); closeMap(); closeMapOverview();
    let moved = null;
    try {
      await fadeTo(true, 450);
      const next = buildInterior('apartment', { layout: HOMES[tierId] });
      const r = upgradeHome(store, tierId);
      if (!r.ok) { next.dispose(); toast(r.error, 'warn'); audio.blip('error'); return false; }
      const key = homeKey(); interiors[key]?.dispose(); interiors[key] = next;       // the cache holds exactly one apartment: the new layout's
      if (inInterior === 'apartment') {
        attachInterior(next);                                                         // takes the old interior off the scene
        player.teleport(next.spawn.x, next.spawn.z, next.spawn.yaw); rig.snapBehind(next.spawn.yaw); rig.snap(player);
        if (homeView) { homeInsets(); rig.snapBuild(player); }                        // the dollhouse camera jumps to its new frame behind the fade
      }
      dropStaleApartments();                                                          // the old layout's interior (now off the scene) or a stale one from before a move made outdoors
      audio.blip('cash'); moved = r;
      return true;
    } finally {
      await fadeTo(false, 450); fading = false;
      if (moved) toast(`${moved.title} · paid ${fmtMoney(moved.price)}`, 'good');
    }
  }
  function setIndoor(on) {
    atmo.indoor = on;
    atmo.dome.visible = !on; atmo.stars.visible = !on; atmo.moon.visible = !on; atmo.clouds.forEach((c) => (c.visible = !on));
    if (atmo.precip) atmo.precip.visible = !on;
    atmo.sun.visible = !on;
    if (on) { atmo.setTime(virtualNow(), weather); scene.background = homeView ? homeSky() : new THREE.Color('#181a20'); scene.fog.near = 400; scene.fog.far = 900; }
    else { updateEnv(true); atmo.moon.visible = (env?.night ?? 0) > 0.05; }
    document.body.classList.toggle('indoors', on);
  }

  /* ---------- map ---------- */
  function openFullMap() {
    if (creator || build.active) return; mapOpen = true; $('map-full').classList.add('on'); phone.close();
    fullMap ||= new MapView(fullCanvas, { mode: 'full', getState: mapState, onSelect: (p) => { mapSel = p; renderMapCard(); }, overlays: () => [$('map-close'), document.querySelector('.map-zoom')] });
    fullMap.resize(); fullMap.focus(player.pos.x, player.pos.z, 0.3); fullMap.selected = S().destination?.id ?? null; mapSel = null; $('map-card').hidden = true;
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
  function startCamera() { if (creator || camMode || build.active) return; camMode = true; phone.close(); closeMap(); $('camui').hidden = false; document.body.classList.add('hud-hidden'); updateThumb(); toast('Photo mode · drag to frame, scroll to zoom', 'info'); }
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
    // multi-room homes: a prompt needs line of sight, so nothing is offered through a wall (a doorway passes). Items in the player's own room need no ray; the Studio has no walls to check.
    const sight = inInterior === 'apartment' && interior.rooms.length > 1, here = sight ? roomAtFloor(interior.layout, player.pos.x, player.pos.z)?.id : null;
    const consider = (it, label) => {
      const d = Math.hypot(it.x - player.pos.x, it.z - player.pos.z); if (d > it.radius) return;
      if (sight && it.room !== here && interior.colliders.rayBlocked(player.pos.x, 0.9, player.pos.z, it.x, 0.9, it.z, { only: 'wall' }) < 1) return;
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
    if (it.kind === 'billboard') { ctx.adsFocus = it.boardId; phone.open(); phone.openApp('ads'); return; }
    audio.blip('tick'); it.run(ictx);
  };
  /* ---------- Home view: tap a piece to walk over and use it; tap the floor to walk there (a drag still turns the dollhouse) ---------- */
  let autoWalk = null, tapDown = null;
  const tapRay = new THREE.Raycaster(), tapNdc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), tapHit = new THREE.Vector3();
  const tapMark = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); tapMark.position.y = 0.03; tapMark.renderOrder = 3; scene.add(tapMark);
  canvas.addEventListener('pointerdown', (e) => { tapDown = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    const d = tapDown; tapDown = null;
    if (!d || !homeView || build.active || panels.open || catalogue.isOpen || phone.isOpen || fading || camMode || inInterior !== 'apartment' || !interior) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 450) return;
    const r = canvas.getBoundingClientRect(); tapNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    tapRay.setFromCamera(tapNdc, camera); if (!tapRay.ray.intersectPlane(floorPlane, tapHit)) return;
    let best = null, bd = 2.2;
    for (const it of interior.interactables) { const q = Math.hypot(it.x - tapHit.x, it.z - tapHit.z); if (q < bd && (!it.enabled || it.enabled(ictx))) { bd = q; best = it; } }
    const b = interior.bounds, gx = Math.min(b.x1 - 0.3, Math.max(b.x0 + 0.3, best ? best.x : tapHit.x)), gz = Math.min(b.z1 - 0.3, Math.max(b.z0 + 0.3, best ? best.z : tapHit.z));
    autoWalk = { x: gx, z: gz, it: best, t: 0, last: Infinity, stuck: 0 };
    tapMark.position.set(gx, 0.03, gz); tapMark.material.opacity = 0.95; tapMark.scale.setScalar(1.4); audio.chime('pop');
  });
  /** The input the player walks with this frame: the real one, or a steer towards the tapped spot (camera-relative, like a stick). */
  const walkInput = (dt) => {
    if (!autoWalk) return input;
    if (input.move.mag > 0.1 || !homeView || inInterior !== 'apartment' || build.active || panels.open) { autoWalk = null; return input; }
    const a = autoWalk, dx = a.x - player.pos.x, dz = a.z - player.pos.z, dist = Math.hypot(dx, dz);
    a.t += dt; if (dist < a.last - 0.02) { a.last = dist; a.stuck = 0; } else a.stuck += dt;
    if (dist < (a.it ? 0.45 : 0.25) || a.stuck > 1.1 || a.t > 14) {
      autoWalk = null;
      if (a.it && Math.hypot(a.it.x - player.pos.x, a.it.z - player.pos.z) <= a.it.radius) { target = { it: a.it, label: typeof a.it.label === 'function' ? a.it.label(ictx) : a.it.label }; interact(); }
      return input;
    }
    const cy = rig.yaw, fx = -Math.sin(cy), fz = -Math.cos(cy), rx = Math.cos(cy), rz = -Math.sin(cy), ux = dx / dist, uz = dz / dist, k = Math.min(1, dist / 0.7);
    return { move: { x: (ux * rx + uz * rz) * k, y: (ux * fx + uz * fz) * k, mag: k }, running: dist > 4 };
  };
  input.on('interact', interact);
  $('prompt').addEventListener('click', interact);
  $('t-interact').addEventListener('pointerdown', (e) => { e.preventDefault(); interact(); });
  $('t-run').addEventListener('pointerdown', (e) => { e.preventDefault(); input.runToggle = !input.runToggle; $('t-run').classList.toggle('on', input.runToggle); });
  const togglePhone = () => { if (creator || camMode || build.active) return; phone.toggle(); };
  input.on('phone', togglePhone); $('b-phone').onclick = togglePhone;
  input.on('map', () => goTab('map')); $('b-map').onclick = () => goTab('map');
  const openOutfit = () => { if (creator || camMode) return; if (!inInterior) { toast('Change outfits at home or in a clothing store.', 'info'); return; } panels.wardrobe(); };
  input.on('wardrobe', openOutfit); $('b-wardrobe').onclick = openOutfit;

  /* ---------- app shell: Home · Buy · Map · Phone ---------- */
  const shell = new Shell({ onTab: (t) => goTab(t), onWallet: () => openWallet() });
  /* ---------- First day in Regina: the checklist card a new player always sees (core/onboarding.js has the rules) ---------- */
  const firstDay = new FirstDay({ store, onGo: (st) => {
    if (st.id === 'gift') openWallet();
    else if (st.id === 'job') { goTab('home').then(() => { phone.open(); phone.openApp('jobs'); }); }
    else if (st.id === 'eat') { if (Object.keys(S().inventory).length) { if (inInterior === 'apartment') panels.fridge(); else goTab('home'); } else { setDestination(poiById.market); if (inInterior) exitInterior(); toast('Prairie Corner Market is across Victoria Ave. Follow the arrow!', 'info'); } }
    else if (st.id === 'shift') { const j = S().job.active, pl = j ? POIS.find((p) => p.enter === JOBS[j.id].place) : null; if (pl) { setDestination(pl); if (inInterior && inInterior !== pl.enter) exitInterior(); } }
    else if (st.tab) goTab(st.tab);
  } });
  let lastHintTab = null, lastFdBottom = -1;
  /** Tick the card: pay and celebrate new steps, pulse the tab that leads to the next one. */
  const tickFirstDay = () => {
    const play = gameMode === 'play' && !creator;
    if (play) {
      const r = updateOnboarding(store);
      r.fresh.forEach((st, i) => setTimeout(() => { juice.floater(`✓ ${st.title}`, firstDay.el, 'good'); juice.pay(st.reward, firstDay.el); audio.chime('gain'); }, i * 450));
      if (r.finished) setTimeout(() => { juice.confetti(90); audio.chime('fanfare'); toast('First day in Regina: done! Here is a little bonus. Regina is yours.', 'good'); setTimeout(() => { S().onboarding.seenDone = true; store.commit('onboarding'); firstDay.render(true, true); }, 7000); }, r.fresh.length * 450 + 200);
    }
    firstDay.render(false, play);
    const fdb = firstDay.el.hidden ? 0 : Math.round(firstDay.el.getBoundingClientRect().bottom); if (fdb !== lastFdBottom) { lastFdBottom = fdb; if (homeView && !build.active) homeInsets(); }
    const want = play ? firstDay.next?.tab ?? null : null;
    if (want !== lastHintTab) { document.querySelectorAll('#navbar button').forEach((b) => b.classList.toggle('hint-pulse', !!want && b.dataset.tab === want)); lastHintTab = want; }
  };
  const syncTab = () => { if (!panels.open && !catalogue.isOpen) buyOpen = false; shell.setTab(mapOverview || mapOpen ? 'map' : phone.isOpen ? 'phone' : (panels.open || catalogue.isOpen) && buyOpen ? 'buy' : homeView ? 'home' : null); };
  /** Home view: a live, tilted dollhouse of your apartment. You can still walk around and use things; Edit / Buy change the room. */
  // the dollhouse sits on a little lawn under a clear sky, so the home screen reads as a toy diorama rather than a dark room
  const homeStage = new THREE.Group(); homeStage.visible = false; scene.add(homeStage);
  {
    const disc = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: '#9ed48a', roughness: 1 })); disc.position.y = -0.07; disc.receiveShadow = true; homeStage.add(disc);
    const ring = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })); ring.position.y = -0.065; homeStage.add(ring);
    /** Rebuild (not scale) the grass disc and its white ring around a rect {x0, z0, x1, z1} (the home's bbox, or its yard): centred on it, radius hypot(half sides) + 1.5, never smaller than the Studio's 11.5. */
    homeStage.fit = (r) => {
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, rad = Math.max(11.5, Math.hypot((r.x1 - r.x0) / 2, (r.z1 - r.z0) / 2) + 1.5);
      disc.geometry.dispose(); disc.geometry = new THREE.CircleGeometry(rad, 56).rotateX(-Math.PI / 2);
      ring.geometry.dispose(); ring.geometry = new THREE.RingGeometry(rad, rad + 1.1, 56).rotateX(-Math.PI / 2);
      disc.position.set(cx, -0.07, cz); ring.position.set(cx, -0.065, cz);
    };
    /** The lawn and its ring dim into a blue-green night with the rest of the dollhouse. */
    homeStage.tint = (n) => { disc.material.color.set('#9ed48a').lerp(new THREE.Color('#3f6a5a'), n * 0.7); ring.material.opacity = 0.55 - n * 0.35; };
    homeStage.fit(lotOf(layoutOf(S())).bbox);
  }
  /** Keep the whole room between the top bar/chips and the tab bar. */
  const homeInsets = () => {
    const fd = firstDay.el, fdb = !catalogue.isOpen && fd && !fd.hidden ? fd.getBoundingClientRect().bottom + 10 : 0;   // the First day card sits over the top of the stage on phones
    rig.buildInset = Math.min(0.6, Math.max(92, catalogue.isOpen ? catalogue.height + 14 : 0) / innerHeight); homeTop = Math.min(0.4, Math.max(catalogue.isOpen ? 76 : 118, fdb) / innerHeight); applyTop();
  };
  addEventListener('resize', () => { if (homeView && !build.active) homeInsets(); });
  function setHomeView(on) {
    if (on === homeView) return; homeView = on; homeStage.visible = on; atmo.homeLift = on; if (inInterior) { lastEnvAt = 0; updateEnv(true); scene.background = on ? homeSky() : new THREE.Color('#181a20'); }
    if (on) {
      rig.mode = 'build'; rig.setBuildFocus(null); homeInsets(); rig.indoor = true; rig.yaw = 0; interior?.setOverhead(true); document.body.classList.add('home-view');
      orbitOn(true);
      shell.setChips([{ id: 'edit', icon: '✏️', label: 'Edit room' }, { id: 'paint', icon: '🎨', label: 'Paint & floors' }, { id: 'out', icon: '🚪', label: 'Go outside' }], (c) => { if (c === 'edit') build.start(); else if (c === 'paint') catalogue.open('design'); else exitInterior(); });
    } else {
      orbitOn(false);
      document.body.classList.remove('home-view'); interior?.setOverhead(false); rig.endBuild(); rig.mode = 'follow'; rig.targetDist = 3.2; rig.pitch = 0.46; rig.fov = 62; rig.snapBehind(player.yaw); rig.snap(player); camera.fov = 62; camera.updateProjectionMatrix(); shell.setChips([]);
    }
    syncTab();
  }
  /**
   * The Home view's living dollhouse: a 3/4 camera you can turn and zoom, with the walls nearest the camera cut away (every home, the Studio too). Editing
   * (build mode) goes back to the straight-down view, where placing a piece is precise; the session's Walls choice still wins when it is 'down'.
   */
  function orbitOn(on) {
    rig.orbit = on; if (!interior || interior.kind !== 'apartment') return;
    if (on) { interior.setCutSides?.(cutSidesFor(rig.orbitYaw)); interior.setWallMode?.(wallMode === 'down' ? 'down' : 'cut'); }
    else { interior.setCutSides?.(null); if (interior.rooms.length === 1) interior.setWallMode?.('up'); else if (wallMode) interior.setWallMode?.(wallMode); else interior.setWallMode?.('cut'); }
  }
  /** The sky behind the dollhouse follows the real Regina day: pale blue, a peach dusk, a dusk-blue night (never black). */
  const homeSky = () => { const n = env?.night ?? 0, d = env?.dusk ?? 0; return new THREE.Color('#cfe6f3').lerp(new THREE.Color('#f4c7a2'), Math.min(1, d) * 0.75 * (1 - n)).lerp(new THREE.Color('#223463'), n); };
  async function goHome() {
    if (creator || camMode || fading || build.active) return;
    phone.close(); panels.close(); if (mapOpen) closeMap(); if (mapOverview) closeMapOverview();
    if (inInterior === 'apartment') { setHomeView(!homeView); return; }
    if (inInterior) await exitInterior();
    const door = poiById.lofts; await enterInterior('apartment', { x: door.x, z: door.z, nx: 0, nz: 1 }); setHomeView(true);
  }
  async function goTab(t) {
    if (creator || camMode || fading || gameMode !== 'play') return;
    if (t !== 'map' && mapOverview) closeMapOverview();
    if (t === 'phone') { if (build.active) return; if (mapOpen) closeMap(); panels.close(); phone.toggle(); syncTab(); return; }
    if (t === 'map') { if (mapOverview) { closeMapOverview(); return; } await openMapOverview(); return; }
    if (t === 'buy') { phone.close(); if (mapOpen) closeMap(); if (inInterior !== 'apartment' || !homeView) { await goHome(); if (!homeView) setHomeView(true); } openBuy(); return; }
    if (t === 'home') { await goHome(); syncTab(); }
  }
  let buyOpen = false;
  function openBuy() { buyOpen = true; catalogue.open(); syncTab(); }
  /** The green +: the daily gift card (seven stamps that never reset), with a coin burst on claim and confetti on the seventh stamp. */
  function openWallet() {
    panels.dailyCard(dailyStatus(S(), Date.now()), REWARD_CENTS, {
      fmt: fmtMoney,
      onClaim: (btn) => {
        const r = claimDaily(store); if (!r.ok) { toast(r.error, 'warn'); return r; }
        juice.pay(r.amount, btn); audio.chime('gain'); if (r.day === 7) { juice.confetti(80); audio.chime('fanfare'); }
        toast(`Daily gift · stamp ${r.day} of 7 · +${fmtMoney(r.amount)}`, 'good'); return r;
      },
      onBank: () => { phone.open(); phone.openApp('bank'); },
    });
  }

  /* ---------- Map tab: a bright 3D overview with place cards (reuses the home-screen pin engine) ---------- */
  let mapOverview = false;
  const ovHub = new Hub({
    pinsEl: $('ov-pins'), cardEl: $('ov-card'), topEls: [$('topbar'), $('chiprow')], selExtra: 210,
    extra: () => [{ id: 'you', emoji: '📍', name: 'You', x: player.pos.x, z: player.pos.z, blurb: 'You are here.' }],
    onSelect: (info, id) => renderPlaceCard(info, id), onZoom: () => paintMapChips(),
  });
  const placeById = (id) => (id === 'downtown' ? { id, name: 'Downtown Regina', emoji: '🏙️', x: 0, z: 0, blurb: 'Scarth Street, Victoria Ave and your neighbourhood.', acts: ['🏠 Dewdney Lofts', '🛒 Market', '🏛️ City Hall'], area: 'Downtown', state: 'open' } : poiById[id]);
  let ovPick = null, ovMode = 'places';
  const boardPick = (b) => ({ id: 'bb_' + b.id, name: `Billboard · ${b.name}`, area: 'Billboard', emoji: '📢', x: b.x + Math.sin(b.yaw) * 10, z: b.z + Math.cos(b.yaw) * 10, state: 'open', board: b });
  function renderBoardCard(b) {
    const q = adQuote(b.id, S()), a = activeAd(S(), b.id, Date.now()), p = boardPick(b), d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z), fare = cabFare(d), mins = Math.max(1, Math.round(d / 3.1 / 60)); ovPick = p;
    $('ov-place').innerHTML = `<div class="pc-head"><span class="pc-ico">📢</span><div><h3>${esc(b.name)}</h3><small>${esc(q.tier.name)} · ${esc(q.tier.size.label)}</small></div><span class="pc-tag ${a ? 'open' : ''}">${a ? '● On air' : 'Free to book'}</span></div>
      <p class="pc-blurb">${a ? `Your ad “${esc(a.text)}” is rotating here.` : `Book this board for 7 days and your ad rotates with up to ${q.maxRotation - 1} in-game sponsor${q.maxRotation > 2 ? 's' : ''}. About ${q.reach.toLocaleString()} simulated views.`}</p>
      <div class="pc-acts"><span>${fmtMoney(q.price)} / 7 days</span><span>👁️ ${b.traffic.toLocaleString()} / day</span><span>${esc(q.tier.name)}</span></div>
      <div class="pc-go three"><button class="gobtn primary" data-go="book"><b>📢 ${a ? 'See ad' : 'Book it'}</b><small>${a ? 'Ads app' : fmtMoney(q.price)}</small></button><button class="gobtn" data-go="walk"><b>🚶 Walk</b><small>about ${mins} min</small></button><button class="gobtn" data-go="cab" ${fare > S().bank.balance ? 'disabled' : ''}><b>🚕 Cab</b><small>${fmtMoney(fare)}</small></button></div>`;
  }
  function renderPlaceCard(info, id) {
    if (info?.custom?.board) { $('ov-hint').hidden = true; renderBoardCard(info.custom.board); return; }
    ovPick = info && id && id !== 'you' ? placeById(id) : null; const el = $('ov-place'); $('ov-hint').hidden = !!info;
    if (!info) { el.innerHTML = ''; return; }
    if (!ovPick) { el.innerHTML = `<div class="pc-head"><span class="pc-ico">📍</span><div><h3>You are here</h3><small>${esc(inInterior ? 'Indoors' : 'Out and about in Regina')}</small></div></div>`; return; }
    const p = ovPick, d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z), fare = cabFare(d), mins = Math.max(1, Math.round(d / 3.1 / 60)), dist = d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m', here = d < 40;
    el.innerHTML = `<div class="pc-head"><span class="pc-ico">${p.emoji}</span><div><h3>${esc(p.name.replace(/ \(Home\)/, ''))}</h3><small>${esc(p.area ?? 'Regina')} · ${here ? 'you are here' : dist + ' away'}</small></div><span class="pc-tag ${p.state === 'open' ? 'open' : ''}">${p.state === 'open' ? '● Open now' : 'Visit & explore'}</span></div>
      <p class="pc-blurb">${esc(p.blurb)}</p><div class="pc-acts">${(p.acts ?? []).map((a) => `<span class="${/\(soon\)/.test(a) ? 'soon' : ''}">${esc(a)}</span>`).join('')}</div>
      <div class="pc-go"><button class="gobtn primary" data-go="walk" ${here ? 'disabled' : ''}><b>🚶 Walk</b><small>${here ? 'Already here' : `Free · about ${mins} min`}</small></button><button class="gobtn" data-go="cab" ${here || fare > S().bank.balance ? 'disabled' : ''}><b>🚕 Cab</b><small>${fmtMoney(fare)} · instant</small></button></div>`;
  }
  $('ov-card').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b || !ovPick) return; const p = ovPick;
    if (b.dataset.go === 'book') { closeMapOverview(); ctx.adsFocus = p.board.id; phone.open(); phone.openApp('ads'); return; }
    if (b.dataset.go === 'walk') { closeMapOverview(); setDestination(p); audio.blip('ok'); }
    else { closeMapOverview(); if (!ctx.quickCab(p)) openMapOverview(); }
  });
  function paintMapChips() {
    shell.setChips([{ id: 'zoom', icon: ovHub.level === 'close' ? '🗺️' : '🏙️', label: ovHub.level === 'close' ? 'All Regina' : 'Downtown', on: false }, { id: 'ads', icon: '📢', label: 'Billboards', on: ovMode === 'boards' }, { id: 'gov', icon: '🏛️', label: 'Gov' }, { id: 'neighbours', icon: '👥', label: 'Neighbours' }],
      (c) => {
        if (c === 'zoom') { if (ovMode === 'boards') showBoards(false); ovHub.setLevel(ovHub.level === 'close' ? 'far' : 'close'); }
        else if (c === 'ads') showBoards(ovMode !== 'boards');
        else { closeMapOverview(); phone.open(); phone.openApp(c === 'gov' ? 'townhall' : 'social'); }
      });
  }
  /** The Billboards chip: every board in Regina as a pin (green dot = free to book). */
  function showBoards(on) {
    ovMode = on ? 'boards' : 'places';
    if (on) ovHub.setPins(city.billboards.map((b) => ({ id: 'bb:' + b.id, emoji: '📢', name: b.name, x: b.x, z: b.z, open: !activeAd(S(), b.id, Date.now()), blurb: '', board: b })), 'far');
    else { ovHub.setPins(null, 'close'); }
    paintMapChips();
  }
  async function openMapOverview() {
    if (mapOverview || creator || camMode || fading) return;
    if (homeView) setHomeView(false); if (build.active) build.stop(); phone.close(); panels.close(); if (mapOpen) closeMap();
    if (inInterior) await exitInterior();
    mapOverview = true; ovMode = 'places'; ovHub.custom = null; document.body.classList.add('map-ov'); $('ovmap').hidden = false; enterHubMode(true); ovHub.level = 'close'; ovHub.selected = null; ovHub.show(); renderPlaceCard(null); paintMapChips(); syncTab();
  }
  function closeMapOverview() {
    if (!mapOverview) return; mapOverview = false; document.body.classList.remove('map-ov'); ovHub.hide(); ovHub.selected = null; $('ovmap').hidden = true; enterHubMode(false); rig.snap(player); shell.setChips([]); syncTab();
  }
  input.on('view', () => (camMode ? stopCamera() : startCamera()));
  input.on('escape', () => { if (panels.open) panels.close(); else if (mapOverview) closeMapOverview(); else if (mapOpen) closeMap(); else if (camMode) stopCamera(); else if (phone.isOpen) phone.close(); });

  /* ---------- new game / title ---------- */
  let pendingStart = null, hub;
  const placeAt = (poi) => {
    if (!poi || poi.id === 'downtown') { player.teleport(city.spawn.x, city.spawn.z, city.spawn.heading); return; }
    const open = poi.state === 'open';
    player.teleport(poi.x, poi.z + (open ? 0 : 8), open ? 0 : Math.PI); city.colliders.resolve(player.pos, 0.5); player.syncRoot();
  };
  const enterHubMode = (on) => {
    camera.near = on ? 50 : 0.25; camera.far = on ? 60000 : 4200; camera.updateProjectionMatrix();
    atmo.fogOverride = on ? { near: 60000, far: 90000 } : null; atmo.hubLift = on;
    player.char.root.visible = !on; ped.setVisible(!on); ped.limit = on ? 0 : QUALITY[qLevel].npc;
    city.setOverview(on); if (on) city.setViewDistance(42000); else { applySettings(); }
    lastEnvAt = 0; updateEnv(true);
  };
  const startPlay = () => {
    hub?.hide(); gameMode = 'play'; creator = false; S().flags ||= {}; if (!Number.isFinite(S().flags.firstPlayAt)) S().flags.firstPlayAt = Date.now(); camera.clearViewOffset(); rig.mode = 'follow'; rig.targetDist = 6;
    $('title').classList.remove('on'); $('hud').classList.remove('hidden'); shell.show(true); S().started = true; store.commit('started');
    input.enabled = true; rig.snapBehind(player.yaw); rig.snap(player);
    setTimeout(() => ($('hud-hint').style.opacity = '0'), 14000);
  };
  const newLife = () => {
    hub.hide(); enterHubMode(false);
    store.reset(); dropStaleApartments(); wallMode = null; POL.ensurePolitics(store); phone.applyWallpaper(); rebuildPlayer(); player.teleport(city.spawn.x, city.spawn.z, city.spawn.heading);
    creator = true; gameMode = 'creator'; $('title').classList.remove('on'); rig.mode = 'creator'; rig.yaw = player.yaw + 0.5; rig.snap(player);
    const off = () => camera.setViewOffset(innerWidth, innerHeight, innerWidth * (innerWidth > 760 ? 0.17 : 0), innerWidth > 760 ? 0 : innerHeight * 0.18, innerWidth, innerHeight);
    off();
    panels.characterPanel({ creator: true, onDone: () => {
      const f = S().flags ||= {}; f.welcomed = true;
      G.receiveMessage(store, 'dani', `Welcome to Regina, ${S().player.name}! 🌾 Grab groceries at the Market across Victoria Ave and check the Jobs app on your phone (press P).`, 20000);
      G.receiveMessage(store, 'mom', 'Settled in? Remember to eat and stay warm. Love you!', 55000);
      startPlay(); toast(`Welcome to Regina, ${S().player.name}!`, 'good');
      if (pendingStart) { placeAt(pendingStart); rig.snapBehind(player.yaw); rig.snap(player); pendingStart = null; }
      else goHome().then(() => player.gesture('wave', 1.6));   // a new life starts in your own bright little home, not on a street corner (playtests)
    } });
  };
  const hasLife = () => store.hasSave() && S().started;
  $('btn-new').onclick = () => {
    pendingStart = hubChoice;
    if (hasLife()) panels.menu('Start a new life?', 'This will erase your current progress on this device.', [{ label: 'Keep my save' }, { label: 'Erase & start over', danger: true, run: newLife }]);
    else newLife();
  };
  $('btn-continue').onclick = async () => {
    audio.blip('ok');
    if (!hasLife()) { pendingStart = hubChoice; newLife(); return; }
    fading = true; await fadeTo(true, 320); enterHubMode(false);
    if (hubChoice) placeAt(hubChoice); else player.teleport(S().pos?.x ?? city.spawn.x, S().pos?.z ?? city.spawn.z, S().pos?.yaw ?? city.spawn.heading);
    startPlay(); toast(`Welcome back, ${S().player.name}.`, 'good');
    if (hubChoice) { await fadeTo(false, 320); fading = false; return; }
    fading = false; await goHome(); player.gesture('wave', 1.6);   // Continue comes home too, straight from the black (a spot picked on the title map still starts you there)
  };
  let hubChoice = null;
  hub = new Hub({
    pinsEl: $('hub-pins'), cardEl: $('hub-card'),
    onSelect: (info, id) => {
      hubChoice = info ? (id === 'downtown' ? { id: 'downtown' } : poiById[id]) : null;
      $('hc-place').innerHTML = info ? `<span class="tagline ${info.open ? '' : 'soon'}">${info.open ? '● Open now' : 'Visit & explore'}</span><h3>${info.emoji} ${esc(info.name)}</h3><p>${esc(info.blurb)}</p>` : '';
      $('btn-continue').style.display = hasLife() || info ? ''  : 'none';
      $('btn-continue').textContent = info ? (hasLife() ? 'Play here' : 'Start here') : 'Continue';
      $('hc-welcome').style.display = info ? 'none' : '';
    },
    onZoom: (l) => { $('hub-zoom').textContent = l === 'close' ? '🗺️ All Regina' : '🏙️ Downtown'; },
  });
  $('hub-zoom').onclick = () => hub.setLevel(hub.level === 'close' ? 'far' : 'close');
  const hubRefresh = () => {
    const c = clock(); $('hub-wx').textContent = `${weather.icon} ${weather.temp}° in Regina${weather.live ? '' : ' (simulated)'} · ${c.label} ${c.ampm}`;
    $('hc-welcome').textContent = hasLife() ? `Welcome back, ${S().player.name}! Your home is waiting, or tap a pin to start somewhere else.` : 'A little studio downtown is yours. Tap Play, or tap a pin to start somewhere else.';
    // one green button: Play for a first visit (New life), Continue for a saved life (New life becomes the quiet second button)
    const life = hasLife(); $('btn-new').classList.toggle('go', !life); $('btn-new').classList.toggle('alt', life); $('btn-new').textContent = life ? 'New life' : '▶ Play';
  };
  let tickI = 0;
  const hubTicker = () => { const n = ctx.news(); const it = n[tickI++ % n.length]; const el = $('hub-ticker'); el.textContent = `${it.icon} ${it.title}`; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; };
  setInterval(() => { if (gameMode === 'title') { hubTicker(); hubRefresh(); } }, 5000);

  /* ---------- HUD ---------- */
  const hudMoney = $('hud-money'), hudNeeds = $('hud-needs'), hudClock = $('hud-clock'), hudPlace = $('hud-place'), hudDest = $('hud-dest'), hudJob = $('hud-job'), promptEl = $('prompt');
  // every need says what it is and how full it is (playtest: five unlabeled emoji bars, and the player could not tell what an activity changed)
  hudNeeds.innerHTML = [['⚡', 'Energy'], ['🍽️', 'Hunger'], ['🚿', 'Hygiene'], ['🎉', 'Fun'], ['🙂', 'Mood']].map(([i, n]) => `<div title="${n}"><span>${i}</span><b class="nl">${n}</b><div class="bar"><i></i></div><small class="nv">0</small></div>`).join('');
  let hudT = 1, lastPrompt = '';
  const updateHud = (dt) => {
    hudT += dt; if (hudT < 0.2) return; hudT = 0; const s = S();
    hudMoney.textContent = fmtMoney(s.bank.balance);
    shell.setMoney(s.bank.balance); shell.setMood(moodOf(s.needs)); shell.setReward(dailyStatus(s, Date.now()).ready); syncTab();
    const vals = [s.needs.energy, s.needs.hunger, s.needs.hygiene ?? 0, s.needs.fun ?? 0, s.needs.mood];
    hudNeeds.querySelectorAll('.bar').forEach((b, i) => { b.firstChild.style.width = vals[i] + '%'; b.classList.toggle('low', vals[i] < 20); b.nextElementSibling.textContent = Math.round(vals[i]); });
    const c = clock(); hudClock.innerHTML = `${c.label} ${c.ampm} <small>${weather.icon} ${weather.temp}°${weather.live ? '' : ' · sim'}</small>`;
    shell.setClock(`<span aria-hidden="true">${(env?.night ?? 0) > 0.5 ? '🌙' : '☀️'}</span> ${c.date.toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric', timeZone: 'America/Regina' })} · ${c.label} ${c.ampm} <small class="tb-weather">${weather.icon} ${weather.temp}°${weather.live ? '' : ' sim'}</small>`);
    // place
    let place = inInterior ? { market: 'Prairie Corner Market', threads: 'Prairie Threads', apartment: layoutOf(s).title.split(' · ')[0], gym: 'Prairie Fitness', cityhall: 'Regina City Hall' }[inInterior] : 'Regina';
    if (!inInterior) { let bd = 1e9; for (const d of DISTRICTS) { const k = Math.hypot(player.pos.x - d.x, player.pos.z - d.z) - d.r; if (k < bd && k < 0) { bd = k; place = d.name; } } }
    hudPlace.textContent = place;
    // destination
    const dst = s.destination;
    if (dst && !inInterior) {
      const dx = dst.x - player.pos.x, dz = dst.z - player.pos.z, d = Math.hypot(dx, dz);
      if (d < 14) { toast(`You've arrived: ${dst.name}`, 'good'); audio.chime('gain'); G.tally(s, 'visits'); s.destination = null; store.commit('destination'); hudDest.hidden = true; }
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
    shell.setBadge('phone', un);
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
    if (topic === 'ads' || topic === 'politics') ctx.refreshBillboards();
    if (topic === 'home' && interior?.kind === 'apartment' && interior.layout.id === layoutOf(S()).id) interior.setHome(S().home);   // upgradeHome commits before the new interior is attached
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
  gameMode = 'title'; $('title').classList.add('on'); city.refreshBillboards(S().ads, Date.now());
  $('btn-continue').style.display = hasLife() ? '' : 'none'; hub.show(); enterHubMode(true); hubTicker(); hubRefresh();
  $('title-note').textContent = hasLife() ? `Saved life: ${S().player.name} · ${fmtMoney(S().bank.balance)}` : 'Your progress saves automatically on this device.';
  phone.applyWallpaper(); phone.setView(S().phone.unlocked ? 'home' : 'lock'); phone.refreshHome(); phone.renderStatus();

  /* ---------- random life events (Prairie scenarios with choices) ---------- */
  const showEvent = (ev) => {
    audio.blip('notify');
    panels.event(ev, { can: (i) => choiceAvailable(store, ev, i), pick: (i) => { const r = resolveEvent(store, ev.id, i); if (r.ok) audio.blip(r.summary?.startsWith('−') ? 'tick' : 'ok'); return r; } });
  };
  const maybeEvent = () => {
    if (panels.open || catalogue.isOpen || phone.isOpen || mapOpen || mapOverview || camMode || creator || fading || build.active || gameMode !== 'play' || S().flags?.disableEvents) return; // flag is a dev/test switch
    const sh = S().job.shift; let where = null, p = 0.03;
    if (inInterior === 'apartment') where = 'home'; else if (!inInterior) where = 'street';
    if (sh && inInterior && JOBS[sh.id].place === inInterior) { where = 'shift:' + sh.id; p = 0.09; }
    if (!where || Math.random() > p) return;
    const ev = rollEvent(store, { where, temp: weather.temp, night: env?.night ?? 0, season: env?.season ?? 'summer' });
    if (ev) showEvent(ev);
  };
  setInterval(() => { if (expireAds(store)) ctx.refreshBillboards(); POL.tallyIfDue(store); }, 60000);
  POL.ensurePolitics(store); POL.tallyIfDue(store);
  const speedBtn = $('b-speed'); const paintSpeed = () => { const f = S().settings.timeMode === 'fast'; speedBtn.textContent = f ? '⏩' : '▶'; speedBtn.title = f ? 'Time: fast (1 min = 1 hour)' : 'Time: live Regina clock'; };
  speedBtn.onclick = () => { S().settings.timeMode = S().settings.timeMode === 'fast' ? 'live' : 'fast'; timeBase = Date.now(); lastEnvAt = 0; store.commit('settings'); paintSpeed(); toast(S().settings.timeMode === 'fast' ? '⏩ Fast time: 1 minute = 1 hour, needs change faster' : '▶ Live Regina time', 'info'); };
  paintSpeed();

  /* ---------- scripted life events ---------- */
  setInterval(() => {
    if (gameMode !== 'play') return;
    G.tickNeeds(store, S().settings.timeMode === 'fast' ? 4 : 1, { home: inInterior === 'apartment' }); G.tickJobs(store);
    maybeEvent();
    SOC.decaySocial(store, 1); if (Math.random() < 0.015) SOC.maybePing(store); if (radio.playing) S().needs.fun = Math.min(100, (S().needs.fun ?? 50) + 0.04);
    const s = S(), f = (s.flags ||= {});
    if (s.job.application?.status === 'offered' && !f.offerCall) { f.offerCall = true; phone.incomingCall(JOBS[s.job.application.id].contact, 'Good news — we would like to offer you the job! Open the Jobs app to accept.'); }
    if (!s.job.active && !s.job.application && !f.daniCall && s.created && Date.now() - s.created > 150000) { f.daniCall = true; phone.incomingCall('dani'); }
    if (s.needs.hunger < 12 && !f.hungerHint) { f.hungerHint = true; toast("You're hungry — buy food at Prairie Corner Market.", 'warn'); }
    if (s.needs.energy < 12 && !f.tiredHint) { f.tiredHint = true; toast("You're exhausted — sleep in your apartment or grab a coffee.", 'warn'); }
    if (s.needs.hunger > 30) f.hungerHint = false; if (s.needs.energy > 30) f.tiredHint = false;
    if (!inInterior) { savePos(); }
    if ((Date.now() | 0) % 5 === 0) store.commit('needs');
    phone.tick(); tickFirstDay();
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
    input.enabled = gameMode === 'play' && !panels.open && !catalogue.isOpen && !mapOpen && !mapOverview && !fading && !creator && !build.active;
    const slow = S().needs.hunger < 8 || S().needs.energy < 8 ? 0.75 : 1;
    updateEnv();

    if (mapOverview) ovHub.update(dt, camera, innerWidth, innerHeight);
    else if (gameMode === 'title' || gameMode === 'loading') {
      titleT += dt; hub.update(dt, camera, innerWidth, innerHeight);
    } else {
      player.update(dt, walkInput(dt), rig.yaw, player.grid ?? city.colliders, slow);
      if (tapMark.material.opacity > 0) { tapMark.material.opacity = Math.max(0, tapMark.material.opacity - dt * 1.1); tapMark.scale.setScalar(Math.max(1, tapMark.scale.x - dt * 1.5)); }
      if (!inInterior) ped.update(dt, player.pos);
      const speedNorm = Math.min(1, player.speed / 7.2);
      rig.update(dt, input, player, { speedNorm, sensitivity: isTouch ? 0.9 : 1 });
      if (inInterior === 'apartment' && interior.rooms.length > 1) {   // walking through a multi-room home: draw only the rooms near the player, and cut a partition that stands between the head and the camera
        interior.setViewer(player.pos.x, player.pos.z);
        if (rig.mode !== 'build') interior.setCameraCut(player.pos, camera.position);
      }
      if (rig.orbit && inInterior === 'apartment') interior.setCutSides?.(cutSidesFor(rig.orbitYaw));   // turning the dollhouse lowers the side wall you now look over
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
    if (gameMode === 'play' && !panels.open && !catalogue.isOpen && !mapOpen && !mapOverview && !camMode && !creator && !build.active) { target = nearestInteractable(); setPrompt(target?.label ?? ''); } else { target = null; setPrompt(''); }
    // in the dollhouse the prompt floats over the thing you can use, like a speech bubble, instead of sitting on the room
    const anchor = homeView && target?.it && !promptEl.hidden; promptEl.classList.toggle('anchored', !!anchor);
    if (anchor) { const p = juice.toScreen(new THREE.Vector3(target.it.x, 1.9, target.it.z)); promptEl.style.left = Math.round(p.x) + 'px'; promptEl.style.top = Math.round(p.y) + 'px'; } else if (promptEl.style.top) { promptEl.style.left = ''; promptEl.style.top = ''; }
    // minimap + hud
    if (gameMode === 'play' && !camMode) { mapView.draw(); updateHud(dt); }
    if (mapOpen) fullMap.draw();
    renderer.render(scene, camera);
  };
  loop();

  /* ---------- debug / test handle ---------- */
  window.__regina = {
    catalogue, settleBuildCam: () => rig.snapBuild(player),
    store, G, player, rig, city, camera, scene, renderer, phone, panels, ctx, atmo,
    get inInterior() { return inInterior; }, get mode() { return gameMode; }, get fps() { return fpsN / Math.max(0.001, fpsAcc); },
    enterInterior: (k) => enterInterior(k, { x: 0, z: 0, nx: 0, nz: 1 }), exitInterior, interactNow: interact, getTarget: () => target,
    // multi-room homes: the layout the save lives in, its rooms and lot (pure data), the move, and what the interior on screen is doing right now
    get interior() { return interior; }, get layout() { return layoutOf(S()).id; }, get rooms() { return lotOf(layoutOf(S())).rooms; }, get lot() { return lotOf(layoutOf(S())); }, moveHome: (id) => moveHome(id),
    interiorInfo: () => {
      const i = interior; if (!i) return { kind: null, cached: Object.keys(interiors) };
      const groups = i.roomGroups ?? null, calls = renderer.info.render.calls, tris = renderer.info.render.triangles;
      return { kind: i.kind, layout: i.layout?.id ?? null, stateLayout: layoutOf(S()).id, wallMode: i.wallMode ?? null, overheadMode: i.overheadMode ?? null, viewer: i.viewerRoom ?? null,
        playerRoom: i.layout ? roomAtFloor(i.layout, player.pos.x, player.pos.z)?.id ?? null : null, rooms: i.rooms?.map((r) => r.id) ?? null, visibleRooms: groups ? Object.keys(groups).filter((id) => groups[id].visible) : null,
        yardVisible: i.yard ? !!i.yard.visible : null, cached: Object.keys(interiors), calls, tris, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures,
        bounds: { ...i.bounds }, spawn: { ...i.spawn }, interactables: i.interactables.length, colliders: i.colliders.rects.length };
    },
    stationTarget: () => { const t = interior?.task; if (!t || t.target < 0) return null; const st = interior.stations[t.target]; return { x: st.x, z: st.z }; },
    setTime: (iso) => { timeBase = Date.now(); timeOverride = iso ? new Date(iso).getTime() : null; updateEnv(true); }, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }),
    dbg: () => ({ mapOpen, mapOverview, camMode, creator, fading, homeView, inInterior, gameMode, panelsOpen: panels.open, phoneOpen: phone.isOpen, building: build.active, pos: [player.pos.x, player.pos.z], disableEvents: S().flags?.disableEvents, nCity: city.interactables.length, near: city.interactables.map((it) => [it.id, Math.round(Math.hypot(it.x - player.pos.x, it.z - player.pos.z)), it.radius, typeof it.enabled]).filter((r) => r[1] < 25) }),
    radio, build, SOC, POL, fullMap: () => fullMap, openMap2D: () => openFullMap(), closeMap2D: () => closeMap(), ovHub, goTab, get homeView() { return homeView; }, get mapOverview() { return mapOverview; },
    hub, startAt: (id) => { hub.select(id); }, showEvent, news: () => ctx.news(),
    tp: (x, z) => { player.teleport(x, z); rig.snap(player); }, setWeather: (w) => { weather = { ...weather, ...w }; updateEnv(true); }, qLevel: () => qLevel, setQuality,
    skipTitle: () => { $('btn-continue').style.display === 'none' ? newLife() : $('btn-continue').click(); },
  };
}

boot().catch((e) => { console.error(e); const t = document.getElementById('loadtxt'); if (t) t.textContent = 'Something went wrong: ' + (e?.message || e); });
