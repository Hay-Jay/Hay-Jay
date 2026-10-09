/** Buy sheet ("Catalogue"), thumbnails and the build bar: pure view-model, queue/cache logic, DOM glue with a tiny fake DOM, grid maths. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Store, SAVE_KEY } from '../src/core/store.js';
import * as H from '../src/core/home.js';
import * as FD from '../src/data/furniture.js';
import * as M from '../src/ui/catalogue-model.js';
import * as THREE from 'three';
import { makeThumbs, frameBox, createGLRenderer, ISO_DIR } from '../src/ui/thumbs.js';
import { furnitureModel } from '../src/world/furnitureModels.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const fmt = (c) => '$' + (c / 100).toFixed(2);
let t, store; beforeEach(() => { t = 1_700_000_000_000; store = new Store(mem(), () => t); store.state.bank.balance = 10_000_000; });
const bal = () => store.ledger.balance;
const FURN = Object.values(FD.FURNITURE);

describe('catalogue model: tabs', () => {
  it('starts with Design, ends with In storage, and covers every category', () => {
    const tabs = M.tabList(store.state);
    expect(tabs[0]).toMatchObject({ id: M.TAB_DESIGN, kind: 'design', label: 'Design' });
    expect(tabs.at(-1)).toMatchObject({ id: M.TAB_STORAGE, kind: 'storage', label: 'In storage', count: 0 });
    expect(new Set(tabs.map((x) => x.id)).size).toBe(tabs.length);
    for (const x of tabs) { expect(typeof x.label).toBe('string'); expect(x.emoji).toBeTruthy(); }
    expect(tabs.length).toBeGreaterThanOrEqual(3);
  });
  it('every furniture item is reachable in exactly one furniture tab', () => {
    const seen = new Map();
    for (const tab of M.tabList(store.state).filter((x) => x.kind === 'category')) for (const c of M.tabView(store.state, tab.id, 0).cards) seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
    for (const f of FURN) expect(seen.get(f.id), f.id).toBe(1);
    expect(seen.size).toBe(FURN.length);
  });
  it('an unknown tab id falls back to the first furniture category', () => {
    expect(M.tabView(store.state, 'nope', 0).id).toBe(M.defaultTab());
    expect(M.tabView(store.state, '__proto__', 0).id).toBe(M.defaultTab());
    expect(M.hasTab(store.state, M.TAB_DESIGN)).toBe(true); expect(M.hasTab(store.state, 'nope')).toBe(false);
  });
  it('the storage tab carries the number of owned-but-unplaced pieces', () => {
    H.buyFurniture(store, 'armchair'); H.buyFurniture(store, 'armchair'); H.buyFurniture(store, 'plant');
    expect(M.storageCount(store.state)).toBe(3); expect(M.tabList(store.state).at(-1).count).toBe(3);
    expect(H.placeFurniture(store, 'armchair', 0.5, 1.0, 0).ok).toBe(true);
    expect(M.storageCount(store.state)).toBe(2); expect(M.tabList(store.state).at(-1).count).toBe(2);
  });
});

describe('catalogue model: furniture cards', () => {
  const tabOf = (id) => M.categories().find((c) => M.tabView(store.state, c.id, 0).cards.some((x) => x.id === id))?.id;
  it('describes each card with size tag, stars, price and sell price', () => {
    const cat = M.categories().find((c) => c.id !== M.TAB_DESIGN && M.tabView(store.state, c.id, 0).cards.length), view = M.tabView(store.state, cat.id, 1e7);
    for (const c of view.cards) {
      const def = FD.itemDef ? FD.itemDef(c.id) : FD.FURNITURE[c.id];
      expect(c).toMatchObject({ kind: 'piece', id: def.id, name: def.name, price: def.price, owned: 0, inStorage: 0, canAfford: true, shortBy: 0 });
      expect(c.sizeLabel).toMatch(/^\d+x\d+$/); expect([1, 2, 3, 4]).toContain(c.stars);
      expect(c.sellPrice).toBe(Math.floor(def.price * FD.SELL_RATIO));
    }
  });
  it('orders cards by tier, then price, then name', () => {
    for (const c of M.categories().filter((x) => x.id !== M.TAB_DESIGN)) {
      const cards = M.tabView(store.state, c.id, 0).cards;
      for (let i = 1; i < cards.length; i++) { const a = cards[i - 1], b = cards[i]; expect([a.stars - b.stars, a.price - b.price].find((d) => d !== 0) ?? -1, `${a.id} before ${b.id}`).toBeLessThanOrEqual(0); }
    }
  });
  it('affordability: exact price is affordable, one cent short is not, shortBy is the gap', () => {
    const id = FURN[0].id, price = FURN[0].price, tab = tabOf(id), pick = (b) => M.tabView(store.state, tab, b).cards.find((x) => x.id === id);
    expect(pick(price)).toMatchObject({ canAfford: true, shortBy: 0 });
    expect(pick(price - 1)).toMatchObject({ canAfford: false, shortBy: 1 });
    expect(pick(0)).toMatchObject({ canAfford: false, shortBy: price });
    expect(pick(price * 10)).toMatchObject({ canAfford: true, shortBy: 0 });
  });
  it('shows owned and in-storage counts and the sell price = floor(price * SELL_RATIO)', () => {
    const id = FURN.find((f) => f.solid && f.w <= 1)?.id ?? FURN[0].id, def = FD.FURNITURE[id];
    H.buyFurniture(store, id); H.buyFurniture(store, id); H.buyFurniture(store, id);
    const spot = [[0.5, 1.0], [-0.5, 1.0], [0.5, -2.0], [-1.5, 0.8]].find(([x, z]) => H.canPlace(store.state, id, x, z, 0).ok);
    expect(H.placeFurniture(store, id, spot[0], spot[1], 0).ok).toBe(true);
    const card = M.tabView(store.state, tabOf(id), 0).cards.find((x) => x.id === id);
    expect(card).toMatchObject({ owned: 3, inStorage: 2, sellPrice: Math.floor(def.price * FD.SELL_RATIO), canSell: true });
  });
  it('sell ratio helpers follow the data module (banner text, percent, floor)', () => {
    expect(M.sellRatio()).toBe(FD.SELL_RATIO); expect(M.sellPct()).toBe(Math.round(FD.SELL_RATIO * 100));
    expect(M.bannerText()).toContain(`Selling pays ${Math.round(FD.SELL_RATIO * 100)}% of list price`); expect(M.bannerText()).toMatch(/storage/);
    expect(M.sellPriceOf(1999)).toBe(Math.floor(1999 * FD.SELL_RATIO)); expect(M.sellPriceOf(0)).toBe(0); expect(M.sellPriceOf(NaN)).toBe(0);
  });
  it('size and star helpers: fall back sensibly and clamp to 1..4', () => {
    for (const d of [{ w: 0.5, d: 0.5 }, { w: 0.5, d: 2.4 }, { w: 2.4, d: 2.4 }]) expect(M.sizeOf(d)).toMatch(/^\d+x\d+$/);
    expect(M.starsOf({ tier: 3 })).toBe(FD.tierStars ? FD.tierStars({ tier: 3 }) : 3); expect(M.starsOf({ tier: 99 })).toBeLessThanOrEqual(4); expect(M.starsOf({ tier: -4 })).toBeGreaterThanOrEqual(1); expect(M.starsOf({})).toBeGreaterThanOrEqual(1);
  });
});

describe('catalogue model: storage tab', () => {
  it('lists only owned-but-unplaced pieces, with per-piece counts', () => {
    expect(M.tabView(store.state, M.TAB_STORAGE, 0)).toMatchObject({ kind: 'storage', cards: [], empty: expect.stringMatching(/Nothing in storage/) });
    H.buyFurniture(store, 'plant'); H.buyFurniture(store, 'armchair'); H.buyFurniture(store, 'armchair');
    expect(H.placeFurniture(store, 'plant', -3.5, -0.4, 0).ok).toBe(true);
    const cards = M.tabView(store.state, M.TAB_STORAGE, bal()).cards;
    expect(cards.map((c) => c.id)).toEqual(['armchair']); expect(cards[0]).toMatchObject({ owned: 2, inStorage: 2 });
  });
  it('includes free souvenir posters as unsellable pieces', () => {
    store.state.souvenirs = ['banff'];
    const c = M.tabView(store.state, M.TAB_STORAGE, 0).cards.find((x) => x.id === 'poster_banff');
    expect(c).toMatchObject({ price: 0, sellPrice: 0, canSell: false, inStorage: 1, poster: true });
    expect(M.sellPiece(store, 'poster_banff').ok).toBe(false);
  });
});

describe('catalogue model: Design tab', () => {
  it('has wall and floor swatches with first-time prices and owned flags', () => {
    const v = M.tabView(store.state, M.TAB_DESIGN, 0);
    expect(v.kind).toBe('design'); expect(v.sections.map((s) => s.id)).toEqual(['walls', 'floors']);
    const walls = v.sections[0].cards, floors = v.sections[1].cards;
    expect(walls).toHaveLength(Object.keys(FD.WALLS).length); expect(floors).toHaveLength(Object.keys(FD.FLOORS).length);
    expect(walls.find((w) => w.key === 'cream')).toMatchObject({ kind: 'wall', owned: true, active: true, cost: 0, price: FD.WALL_PRICE, canAfford: true });
    expect(walls.find((w) => w.key === 'sage')).toMatchObject({ owned: false, active: false, cost: FD.WALL_PRICE, price: FD.WALL_PRICE, canAfford: false, shortBy: FD.WALL_PRICE });
    expect(floors.find((f) => f.key === 'oak')).toMatchObject({ kind: 'floor', owned: true, active: true, cost: 0 });
    expect(floors.find((f) => f.key === 'slate')).toMatchObject({ owned: false, price: FD.FLOOR_PRICE, material: 'tile', color: FD.FLOORS.slate[2], cost: FD.FLOOR_PRICE });
    expect(M.tabView(store.state, M.TAB_DESIGN, FD.WALL_PRICE).sections[0].cards.find((w) => w.key === 'sage')).toMatchObject({ canAfford: true, shortBy: 0 });
    expect(v.cards).toHaveLength(walls.length + floors.length);
  });
  it('tracks purchases and the active style', () => {
    expect(M.applyStyle(store, 'wall', 'sage')).toMatchObject({ ok: true, paid: FD.WALL_PRICE, name: 'Sage' });
    expect(M.applyStyle(store, 'wall', 'cream')).toMatchObject({ ok: true, paid: 0 });
    const walls = M.tabView(store.state, M.TAB_DESIGN, bal()).sections[0].cards;
    expect(walls.find((w) => w.key === 'sage')).toMatchObject({ owned: true, active: false, cost: 0 }); expect(walls.find((w) => w.key === 'cream').active).toBe(true);
    expect(M.applyStyle(store, 'wall', 'sage')).toMatchObject({ ok: true, paid: 0 });
  });
});

describe('catalogue model: actions', () => {
  it('buyPiece debits exactly the list price and adds one to storage', () => {
    const def = FD.FURNITURE.armchair, b0 = bal();
    expect(M.buyPiece(store, 'armchair')).toMatchObject({ ok: true, price: def.price, name: def.name });
    expect(b0 - bal()).toBe(def.price); expect(H.availableToPlace(store.state, 'armchair')).toBe(1);
  });
  it('refuses a purchase you cannot afford without touching the ledger, and reports the gap', () => {
    const def = FD.FURNITURE.armchair; store.state.bank.balance = def.price - 1; const hist = store.state.bank.history.length;
    expect(M.buyPiece(store, 'armchair')).toEqual({ ok: false, error: 'not-enough', shortBy: 1 });
    expect(bal()).toBe(def.price - 1); expect(store.state.bank.history).toHaveLength(hist); expect(H.ownedCount(store.state, 'armchair')).toBe(0);
  });
  it('rejects unknown, prototype and poster ids', () => {
    for (const k of ['nope', 'constructor', '__proto__', 'poster_banff', 5, null]) expect(M.buyPiece(store, k).ok, String(k)).toBe(false);
    expect(bal()).toBe(10_000_000);
  });
  it('sellPiece pays floor(price * SELL_RATIO) and only for unplaced copies', () => {
    const def = FD.FURNITURE.chair; H.buyFurniture(store, 'chair'); const b0 = bal();
    expect(M.sellPiece(store, 'chair')).toMatchObject({ ok: true, refund: Math.floor(def.price * FD.SELL_RATIO), name: def.name });
    expect(bal() - b0).toBe(Math.floor(def.price * FD.SELL_RATIO)); expect(M.sellPiece(store, 'chair').ok).toBe(false);
  });
  it('applyStyle: unaffordable first-time styles are refused early, owned ones are free', () => {
    store.state.bank.balance = FD.FLOOR_PRICE - 1;
    expect(M.applyStyle(store, 'floor', 'walnut')).toEqual({ ok: false, error: 'not-enough', shortBy: 1 }); expect(store.state.home.floor).toBe('oak');
    expect(M.applyStyle(store, 'floor', 'oak')).toMatchObject({ ok: true, paid: 0 });
    for (const bad of [['wall', 'constructor'], ['wall', '__proto__'], ['placed', 'oak'], ['floor', 'lava']]) expect(M.applyStyle(store, ...bad).ok, bad.join()).toBe(false);
  });
});

describe('catalogue model: interaction maths', () => {
  it('cycleIndex wraps both ways and survives empty lists', () => {
    expect(M.cycleIndex(5, 4, 1)).toBe(0); expect(M.cycleIndex(5, 0, -1)).toBe(4); expect(M.cycleIndex(5, 2, 1)).toBe(3); expect(M.cycleIndex(0, 0, 1)).toBe(0);
  });
  it('shouldDismiss: a long drag or a fast flick closes the sheet, a small one springs back', () => {
    expect(M.shouldDismiss({ dy: 200, dt: 800, height: 500 })).toBe(true);
    expect(M.shouldDismiss({ dy: 60, dt: 600, height: 500 })).toBe(false);
    expect(M.shouldDismiss({ dy: 50, dt: 60, height: 500 })).toBe(true);
    expect(M.shouldDismiss({ dy: -90, dt: 50, height: 500 })).toBe(false); expect(M.shouldDismiss({ dy: 0, dt: 0, height: 500 })).toBe(false);
  });
  it('cardLabel speaks price, size, tier and the shortfall', () => {
    const c = M.tabView(store.state, M.defaultTab(), 0).cards[0];
    expect(M.cardLabel(c, fmt)).toContain(c.name); expect(M.cardLabel(c, fmt)).toContain(fmt(c.price)); expect(M.cardLabel(c, fmt)).toContain(`Need ${fmt(c.shortBy)} more`);
    const w = M.tabView(store.state, M.TAB_DESIGN, 0).sections[0].cards;
    expect(M.cardLabel(w.find((x) => x.active), fmt)).toMatch(/in use/); expect(M.cardLabel(w.find((x) => !x.owned), fmt)).toMatch(/Need/);
  });
});

/* ---------------------------------------------------------------- thumbnails */
describe('thumbs: queue and cache (fake renderer, manual scheduler)', () => {
  const rig = (over = {}) => {
    const calls = [], slots = []; let made = 0;
    const renderer = { render: (type) => { calls.push(type); return `data:${type}`; }, dispose: vi.fn(), lost: () => false };
    const th = makeThumbs({ size: 64, idleMs: 0, createRenderer: (sz) => { made++; expect(sz).toBe(64); return over.renderer === undefined ? renderer : over.renderer; }, schedule: (fn) => slots.push(fn), ...over.opts });
    return { th, calls, slots, renderer, made: () => made, runOne: () => slots.shift()?.() };
  };
  it('renders one item per scheduled slot, never more', async () => {
    const r = rig(), ps = ['a', 'b', 'c'].map((x) => r.th.get(x));
    expect(r.slots).toHaveLength(1); expect(r.calls).toEqual([]);
    r.runOne(); expect(r.calls).toEqual(['a']); expect(r.slots).toHaveLength(1); expect(r.th.pending).toBe(2);
    r.runOne(); r.runOne(); expect(r.calls).toEqual(['a', 'b', 'c']); expect(await Promise.all(ps)).toEqual(['data:a', 'data:b', 'data:c']); expect(r.slots).toHaveLength(0);
  });
  it('creates the renderer lazily, only once', () => {
    const r = rig(); expect(r.made()).toBe(0); r.th.get('a'); expect(r.made()).toBe(0); r.runOne(); r.th.get('b'); r.runOne(); expect(r.made()).toBe(1);
  });
  it('caches: peek is null until rendered, then instant; repeat get never re-renders', async () => {
    const r = rig(); expect(r.th.peek('a')).toBeNull(); const p = r.th.get('a'); expect(r.th.peek('a')).toBeNull(); r.runOne(); expect(await p).toBe('data:a');
    expect(r.th.peek('a')).toBe('data:a'); expect(r.th.has('a')).toBe(true); expect(await r.th.get('a')).toBe('data:a'); expect(r.slots).toHaveLength(0); expect(r.calls).toEqual(['a']);
  });
  it('de-duplicates concurrent requests for the same piece', async () => {
    const r = rig(), p1 = r.th.get('a'), p2 = r.th.get('a'); expect(p1).toBe(p2); expect(r.th.pending).toBe(1); r.runOne(); await p1; expect(r.calls).toEqual(['a']);
  });
  it('runs higher priority first (newest tab wins), ties in request order', () => {
    const r = rig(); r.th.get('old1'); r.th.get('old2'); r.th.get('new1', { priority: 5 }); r.th.get('new2', { priority: 5 }); r.th.get('old1', { priority: 9 });
    for (let i = 0; i < 6; i++) r.runOne(); expect(r.calls).toEqual(['old1', 'new1', 'new2', 'old2']);
  });
  it('rejects bad types and resolves null when the renderer cannot be created', async () => {
    const r = rig({ renderer: null }); expect(await r.th.get(42)).toBeNull(); expect(await r.th.get(undefined)).toBeNull();
    const p1 = r.th.get('a'), p2 = r.th.get('b'); r.runOne(); expect(await p1).toBeNull(); expect(await p2).toBeNull(); expect(r.th.pending).toBe(0);
    expect(await r.th.get('c')).toBeNull(); expect(r.slots).toHaveLength(0); // dead renderer: no more work is scheduled
  });
  it('a renderer that throws or returns nothing fails that piece only, and is not retried', async () => {
    const calls = []; const th = makeThumbs({ idleMs: 0, schedule: (fn) => fn(), createRenderer: () => ({ render: (t) => { calls.push(t); if (t === 'boom') throw new Error('x'); return t === 'blank' ? null : `data:${t}`; } }) });
    expect(await th.get('boom')).toBeNull(); expect(await th.get('blank')).toBeNull(); expect(await th.get('ok')).toBe('data:ok');
    expect(await th.get('boom')).toBeNull(); expect(calls).toEqual(['boom', 'blank', 'ok']);
  });
  it('supports renderers that answer asynchronously', async () => {
    const th = makeThumbs({ idleMs: 0, schedule: (fn) => fn(), createRenderer: () => ({ render: async (t) => `async:${t}` }) });
    expect(await th.get('a')).toBe('async:a'); expect(th.peek('a')).toBe('async:a');
  });
  it('rebuilds a lost context once and retries the piece', async () => {
    let lost = true, made = 0; const th = makeThumbs({ idleMs: 0, schedule: (fn) => fn(), createRenderer: () => { made++; const mine = made; return { lost: () => lost && mine === 1, render: (t) => (mine === 1 ? null : `data:${t}`), dispose() {} }; } });
    expect(await th.get('a')).toBe('data:a'); expect(made).toBe(2);
  });
  it('releases the GPU context after the idle delay and recreates it on demand', async () => {
    vi.useFakeTimers(); try {
      const r = rig({ opts: { idleMs: 1000 } }), p = r.th.get('a'); r.runOne(); await p;
      expect(r.renderer.dispose).not.toHaveBeenCalled(); vi.advanceTimersByTime(1001); expect(r.renderer.dispose).toHaveBeenCalledTimes(1);
      r.th.get('b'); r.runOne(); expect(r.made()).toBe(2);
    } finally { vi.useRealTimers(); }
  });
  it('dispose() and clear() are safe at any time', async () => {
    const r = rig(); r.th.dispose(); const p = r.th.get('a'); r.runOne(); await p; r.th.dispose(); expect(r.renderer.dispose).toHaveBeenCalled(); r.th.clear(); expect(r.th.peek('a')).toBeNull();
  });
  it('degrades to null without WebGL or a document (this very test run is node)', async () => {
    expect(createGLRenderer()).toBeNull();
    const th = makeThumbs({ schedule: (fn) => setTimeout(fn, 0) }); expect(th.peek('armchair')).toBeNull(); expect(await th.get('armchair')).toBeNull(); expect(await th.get('armchair')).toBeNull();
  });
});

describe('thumbs: isometric framing', () => {
  const ndc = (cam, v) => v.clone().project(cam);
  it('fits every corner of a box inside the view with a margin, for flat and tall pieces alike', () => {
    for (const [w, h, d] of [[1, 1, 1], [2, 0.03, 2], [0.4, 1.7, 0.4], [3, 0.9, 1], [0.1, 1, 0.7]]) {
      const box = new THREE.Box3(new THREE.Vector3(-w / 2, 0, -d / 2), new THREE.Vector3(w / 2, h, d / 2)), cam = frameBox(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50), box);
      let max = 0; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const p = ndc(cam, new THREE.Vector3(x, y, z)); max = Math.max(max, Math.abs(p.x), Math.abs(p.y)); expect(p.z).toBeGreaterThan(-1); expect(p.z).toBeLessThan(1); }
      expect(max).toBeLessThanOrEqual(1 + 1e-9); expect(max).toBeGreaterThan(0.8); // fills the frame (square), but never clips
      expect(cam.right - cam.left).toBeCloseTo(cam.top - cam.bottom, 9);
    }
  });
  it('looks from the front-right and above (3/4 view), toward the model', () => {
    const box = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1)), cam = frameBox(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50), box), c = box.getCenter(new THREE.Vector3());
    expect(cam.position.x).toBeGreaterThan(c.x); expect(cam.position.y).toBeGreaterThan(c.y); expect(cam.position.z).toBeGreaterThan(c.z); expect(ISO_DIR.every((v) => v > 0)).toBe(true);
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); expect(fwd.dot(c.clone().sub(cam.position).normalize())).toBeGreaterThan(0.999);
  });
});

describe('thumbs: every catalogue model can be framed', () => {
  it('has geometry and a sane bounding box for each piece and a souvenir poster', () => {
    for (const id of [...Object.keys(FD.FURNITURE), 'poster_banff']) {
      const m = furnitureModel(id), box = new THREE.Box3().setFromObject(m); expect(m.children.length, id).toBeGreaterThan(0); expect(box.isEmpty(), id).toBe(false);
      const cam = frameBox(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50), box); expect(cam.right - cam.left, id).toBeGreaterThan(0.2);
      for (const v of [cam.left, cam.right, cam.top, cam.bottom, cam.far]) expect(Number.isFinite(v), id).toBe(true);
    }
  });
});
