/** Buy sheet ("Catalogue"), thumbnails and the build bar: pure view-model, queue/cache logic, DOM glue with a tiny fake DOM, grid maths. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Store, SAVE_KEY } from '../src/core/store.js';
import * as H from '../src/core/home.js';
import * as FD from '../src/data/furniture.js';
import * as M from '../src/ui/catalogue-model.js';
import * as THREE from 'three';
import { makeThumbs, frameBox, createGLRenderer, ISO_DIR } from '../src/ui/thumbs.js';
import { furnitureModel } from '../src/world/furnitureModels.js';
import { Catalogue, tabsHTML, bodyHTML } from '../src/ui/catalogue.js';
import { BuildMode, gridLines, gridColorFor, makeFloorGrid, SNAP } from '../src/ui/build.js';

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

/* ---------------------------------------------------------------- the sheet (tiny fake DOM) */
class El {
  constructor(tag = 'div') { this.tag = tag; this.memo = new Map(); this.handlers = {}; this.dataset = {}; this.attrs = {}; this.style = {}; this.classes = new Set(); this.hidden = false; this.scrollTop = 0; this.scrollLeft = 0; this.offsetHeight = 480; this.focusCalls = 0; this._html = ''; this.children = []; }
  get classList() { return { add: (c) => this.classes.add(c), remove: (c) => this.classes.delete(c), contains: (c) => this.classes.has(c) }; }
  set innerHTML(v) { this._html = String(v); this.memo.clear(); } get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); } get textContent() { return this._text ?? ''; }
  querySelector(sel) { if (!this.memo.has(sel)) this.memo.set(sel, new El()); return this.memo.get(sel); }
  querySelectorAll() { return []; }
  addEventListener(t, fn) { (this.handlers[t] ||= []).push(fn); }
  dispatch(t, ev) { for (const fn of this.handlers[t] ?? []) fn(ev); }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; }
  appendChild(c) { this.children.push(c); return c; } remove() { this.removed = true; } contains() { return false; }
  focus() { this.focusCalls++; globalThis.document.activeElement = this; } setPointerCapture() {}
  get offsetWidth() { return 100; }
}
/** An event whose target.closest(sel) returns a fake [data-act] element carrying the given dataset. */
const tap = (dataset, extra = {}) => ({ target: { closest: (sel) => (sel === '[data-act]' ? { dataset } : null) }, ...extra });
const keyEv = (key, extra = {}) => ({ key, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra });

describe('Catalogue sheet', () => {
  let win, build, audio, toasts, changes, cat;
  const env = () => {
    win = {}; globalThis.document = { createElement: (t) => new El(t), body: new El('body'), activeElement: null };
    globalThis.addEventListener = vi.fn((t, f) => { win[t] = f; }); globalThis.removeEventListener = vi.fn((t) => { delete win[t]; }); globalThis.matchMedia = () => ({ matches: false }); globalThis.innerHeight = 800;
  };
  const make = (over = {}) => {
    build = { active: false, start: vi.fn(function () { this.active = true; }), select: vi.fn(), refresh: vi.fn(), layout: vi.fn() }; audio = { blip: vi.fn() }; toasts = []; changes = [];
    cat = new Catalogue({ store, build, audio, toast: (m, k) => toasts.push([m, k]), fmtMoney: fmt, thumbs: over.thumbs ?? null, onChange: (d) => changes.push(d), ...over.opts });
    return cat;
  };
  beforeEach(() => { vi.useFakeTimers(); env(); });
  afterEach(() => { vi.useRealTimers(); for (const k of ['document', 'addEventListener', 'removeEventListener', 'matchMedia', 'innerHeight']) delete globalThis[k]; });
  const firstCard = (tabId = M.defaultTab()) => M.tabView(store.state, tabId, 0).cards[0];

  it('mounts hidden, opens with a slide-in class, shows balance, banner, tabs and cards', () => {
    make(); expect(globalThis.document.body.children).toContain(cat.root); expect(cat.root.hidden).toBe(true); expect(cat.isOpen).toBe(false);
    cat.open(); expect(cat.isOpen).toBe(true); expect(cat.root.hidden).toBe(false); expect(cat.root.classes.has('open')).toBe(true);
    expect(cat.$bal.textContent).toBe(fmt(bal())); expect(cat.$banner.textContent).toBe(M.bannerText());
    const c = firstCard(); expect(cat.$tabs.innerHTML).toContain('role="tab"'); expect(cat.$body.innerHTML).toContain(c.name); expect(cat.$body.innerHTML).toContain(fmt(c.price)); expect(cat.$body.innerHTML).toContain(c.sizeLabel);
    expect(win.keydown).toBeTypeOf('function'); expect(build.layout).toHaveBeenCalled(); expect(audio.blip).toHaveBeenCalledWith('tick');
  });
  it('close() slides out, hides after the animation, removes the key listener; toggle works; reduced motion hides at once', () => {
    make(); cat.open(); cat.close(); expect(cat.isOpen).toBe(false); expect(cat.root.classes.has('open')).toBe(false); expect(cat.root.hidden).toBe(false);
    vi.advanceTimersByTime(400); expect(cat.root.hidden).toBe(true); expect(win.keydown).toBeUndefined();
    cat.toggle(); expect(cat.isOpen).toBe(true); cat.toggle(); expect(cat.isOpen).toBe(false);
    globalThis.matchMedia = () => ({ matches: true }); cat.open(); cat.close(); expect(cat.root.hidden).toBe(true);
  });
  it('open(tab) accepts ids, labels and "storage"; remembers the last tab; unknown tabs fall back', () => {
    make(); const cats = M.categories().filter((c) => c.id !== M.TAB_DESIGN), pick = cats[1]?.id ?? cats[0].id;
    cat.open(pick); expect(cat.tab).toBe(pick); cat.close(); cat.open(); expect(cat.tab).toBe(pick); cat.close();
    cat.open('Design'); expect(cat.tab).toBe(M.TAB_DESIGN); cat.close(); cat.open('storage'); expect(cat.tab).toBe(M.TAB_STORAGE); cat.close(); cat.open('zzz'); expect(cat.tab).toBe(M.defaultTab());   // a plain Buy never reopens the storage shelf
    cat.setTab(M.TAB_DESIGN); expect(cat.tab).toBe(M.TAB_DESIGN); expect(cat.$body.innerHTML).toContain('Walls'); expect(cat.$body.innerHTML).toContain('Floors');
  });
  it('tapping an affordable card buys it, starts build mode quietly, hands it over and hides the sheet', () => {
    make(); cat.open(); const c = firstCard(), b0 = bal();
    cat.root.dispatch('click', tap({ act: 'buy', id: c.id }));
    expect(b0 - bal()).toBe(c.price); expect(H.ownedCount(store.state, c.id)).toBe(1);
    expect(build.start).toHaveBeenCalledWith({ quiet: true }); expect(build.select).toHaveBeenCalledWith({ type: c.id, id: null }); expect(build.start.mock.invocationCallOrder[0]).toBeLessThan(build.select.mock.invocationCallOrder[0]);
    expect(cat.isOpen).toBe(false); expect(toasts[0]).toEqual([`Bought ${c.name} · ${fmt(c.price)}`, 'good']); expect(audio.blip).toHaveBeenCalledWith('cash'); expect(changes).toEqual([{ kind: 'buy', type: c.id, price: c.price }]);
  });
  it('does not restart build mode when it is already active', () => {
    make(); build.active = true; cat.open(); const c = firstCard(); cat.root.dispatch('click', tap({ act: 'buy', id: c.id })); expect(build.start).not.toHaveBeenCalled(); expect(build.select).toHaveBeenCalledWith({ type: c.id, id: null });
  });
  it('an unaffordable tap buys nothing, says how much is missing, and keeps the sheet open', () => {
    make(); const c = firstCard(); store.state.bank.balance = c.price - 250; cat.open(); expect(cat.$body.innerHTML).toContain('is-poor'); expect(cat.$body.innerHTML).toContain(`Need ${fmt(250)} more`);
    cat.root.dispatch('click', tap({ act: 'buy', id: c.id }));
    expect(bal()).toBe(c.price - 250); expect(H.ownedCount(store.state, c.id)).toBe(0); expect(cat.isOpen).toBe(true); expect(build.select).not.toHaveBeenCalled();
    expect(toasts[0]).toEqual([`Need ${fmt(250)} more`, 'warn']); expect(audio.blip).toHaveBeenCalledWith('error'); expect(changes).toEqual([]);
  });
  it('outside the apartment (canBuild false) it still buys, leaves the piece in storage and does not touch build mode', () => {
    make({ opts: { canBuild: () => false } }); cat.open(); const c = firstCard(); cat.root.dispatch('click', tap({ act: 'buy', id: c.id }));
    expect(H.availableToPlace(store.state, c.id)).toBe(1); expect(build.start).not.toHaveBeenCalled(); expect(build.select).not.toHaveBeenCalled(); expect(cat.isOpen).toBe(true); expect(toasts.at(-1)[1]).toBe('info');
    expect(cat.$tabs.innerHTML).toContain('cat-tab-n'); // storage badge appears
  });
  it('works without a build mode at all (sheet-only)', () => {
    make({ opts: { build: null } }); cat.open(); const c = firstCard(); cat.root.dispatch('click', tap({ act: 'buy', id: c.id })); expect(H.ownedCount(store.state, c.id)).toBe(1);
  });
  it('the In storage tab lists owned-unplaced pieces; Place hands one to build mode, Sell pays the sell ratio', () => {
    const id = Object.keys(FD.FURNITURE)[0], def = FD.FURNITURE[id], refund = Math.floor(def.price * FD.SELL_RATIO); H.buyFurniture(store, id); H.buyFurniture(store, id);
    make(); cat.open(M.TAB_STORAGE); expect(cat.$body.innerHTML).toContain('2 in storage'); expect(cat.$body.innerHTML).toContain('data-act="place"'); expect(cat.$body.innerHTML).toContain(`Sell · ${fmt(refund)}`);
    const b0 = bal(); cat.root.dispatch('click', tap({ act: 'sell', id })); expect(bal() - b0).toBe(refund); expect(H.availableToPlace(store.state, id)).toBe(1);
    expect(toasts.at(-1)).toEqual([`Sold ${def.name} for ${fmt(refund)}`, 'good']); expect(build.refresh).toHaveBeenCalled(); expect(cat.isOpen).toBe(true); expect(cat.$body.innerHTML).toContain('1 in storage');
    cat.root.dispatch('click', tap({ act: 'place', id })); expect(build.select).toHaveBeenCalledWith({ type: id, id: null }); expect(cat.isOpen).toBe(false); expect(changes.map((x) => x.kind)).toEqual(['sell', 'place']);
  });
  it('an empty storage tab explains itself', () => { make(); cat.open(M.TAB_STORAGE); expect(cat.$body.innerHTML).toContain('Nothing in storage'); });
  it('the Design tab paints and floors from the sheet, stays open and reports the change', () => {
    make(); cat.open('design'); const b0 = bal(); cat.root.dispatch('click', tap({ act: 'style', kind: 'wall', key: 'sage' }));
    expect(b0 - bal()).toBe(FD.WALL_PRICE); expect(store.state.home.wall).toBe('sage'); expect(cat.isOpen).toBe(true); expect(changes).toEqual([{ kind: 'style', style: 'wall', key: 'sage', paid: FD.WALL_PRICE }]);
    expect(cat.$body.innerHTML).toContain('In use'); cat.root.dispatch('click', tap({ act: 'style', kind: 'wall', key: 'cream' })); expect(bal()).toBe(b0 - FD.WALL_PRICE); expect(store.state.home.wall).toBe('cream');
    store.state.bank.balance = 5; cat.root.dispatch('click', tap({ act: 'style', kind: 'floor', key: 'walnut' })); expect(store.state.home.floor).toBe('oak'); expect(toasts.at(-1)[1]).toBe('warn');
  });
  it('Hide button, scrim and the "+N in storage" chip route through data-act', () => {
    H.buyFurniture(store, 'plant'); make(); cat.open(); expect(cat.$chip.hidden).toBe(false); expect(cat.$chip.textContent).toBe('+1 in storage');
    cat.root.dispatch('click', tap({ act: 'tab', id: M.TAB_STORAGE })); expect(cat.tab).toBe(M.TAB_STORAGE); expect(cat.$chip.hidden).toBe(true);
    cat.root.dispatch('click', tap({ act: 'hide' })); expect(cat.isOpen).toBe(false);
    cat.root.dispatch('click', { target: { closest: () => null } }); cat.root.dispatch('click', { target: null }); // stray clicks are ignored
  });
  it('Esc hides the sheet and marks that very key event so build mode does not also exit', () => {
    make(); cat.open(); const other = keyEv('a'); win.keydown(other); expect(cat.isOpen).toBe(true); expect(other.stopPropagation).toHaveBeenCalled(); expect(other.preventDefault).not.toHaveBeenCalled(); // game hotkeys never leak through the modal sheet
    const esc = keyEv('Escape'); win.keydown(esc); expect(cat.isOpen).toBe(false); expect(esc.preventDefault).toHaveBeenCalled(); expect(esc.stopPropagation).toHaveBeenCalled(); expect(cat.closedBy(esc)).toBe(true); expect(cat.closedBy(keyEv('Escape'))).toBe(false); expect(cat.closedBy(null)).toBe(false);
  });
  it('tabs are a roving list: arrows, Home and End move and select', () => {
    make(); cat.open(); const ids = M.tabList(store.state).map((x) => x.id), k = (key, id) => ({ ...keyEv(key), target: { closest: (sel) => (sel === '[role="tab"]' ? { dataset: { id } } : null) } });
    win.keydown(k('ArrowRight', cat.tab)); expect(cat.tab).toBe(ids[ids.indexOf(M.defaultTab()) + 1]);
    win.keydown(k('End', cat.tab)); expect(cat.tab).toBe(ids.at(-1)); win.keydown(k('ArrowRight', cat.tab)); expect(cat.tab).toBe(ids[0]);
    win.keydown(k('ArrowLeft', cat.tab)); expect(cat.tab).toBe(ids.at(-1)); win.keydown(k('Home', cat.tab)); expect(cat.tab).toBe(ids[0]);
    expect(cat.$tabs.querySelector('.cat-tab.on').focusCalls).toBeGreaterThan(0);
  });
  it('Tab keeps focus inside the sheet (wraps at both ends)', () => {
    make(); cat.open(); const els = [new El(), new El(), new El()]; for (const e of els) e.getAttribute = () => null; cat.sheet.querySelectorAll = () => els;
    globalThis.document.activeElement = els[2]; const fwd = keyEv('Tab'); win.keydown(fwd); expect(fwd.preventDefault).toHaveBeenCalled(); expect(els[0].focusCalls).toBe(1);
    globalThis.document.activeElement = els[0]; const back = keyEv('Tab', { shiftKey: true }); win.keydown(back); expect(els[2].focusCalls).toBe(1);
    globalThis.document.activeElement = els[1]; const mid = keyEv('Tab'); win.keydown(mid); expect(mid.preventDefault).not.toHaveBeenCalled();
  });
  it('refresh() redraws on balance/state changes and skips the DOM when nothing changed', () => {
    make(); cat.open(); const html = cat.$body.innerHTML, c = firstCard(); let writes = 0; const orig = Object.getOwnPropertyDescriptor(El.prototype, 'innerHTML');
    Object.defineProperty(cat.$body, 'innerHTML', { set(v) { writes++; orig.set.call(this, v); }, get() { return orig.get.call(this); }, configurable: true });
    cat.refresh(); expect(writes).toBe(0); expect(cat.$body.innerHTML).toBe(html);
    store.state.bank.balance = 123; cat.refresh(); expect(writes).toBe(1); expect(cat.$bal.textContent).toBe(fmt(123)); expect(cat.$body.innerHTML).toContain('is-poor'); expect(cat.$body.innerHTML).toContain(fmt(c.price));
  });
  it('re-renders itself when the store commits while open, and stops listening when closed', () => {
    make(); cat.open(); const c = firstCard(); H.buyFurniture(store, c.id); expect(cat.$body.innerHTML).toContain('+1 in storage'); cat.close();
    const html = cat.$body.innerHTML; H.buyFurniture(store, c.id); expect(cat.$body.innerHTML).toBe(html);
  });
  it('thumbnails: cached ones show immediately, others fill in when ready; only the visible tab is requested', async () => {
    const cards = M.tabView(store.state, M.defaultTab(), 0).cards, [a, b] = cards, requested = [];
    const th = { peek: (id) => (id === a.id ? 'data:A' : null), get: (id, o) => { requested.push([id, o.priority]); return Promise.resolve(id === b.id ? 'data:B' : null); } };
    make({ thumbs: th }); cat.open(); await Promise.resolve(); await Promise.resolve();
    expect(cat.$body.querySelector(`img[data-thumb="${a.id}"]`).src).toBe('data:A'); expect(cat.$body.querySelector(`img[data-thumb="${b.id}"]`).src).toBe('data:B');
    expect(requested.map((x) => x[0])).not.toContain(a.id); expect(requested.map((x) => x[0])).toContain(b.id); expect(requested.length).toBe(cards.length - 1);
    const p1 = requested[0][1]; requested.length = 0; cat.setTab(M.TAB_DESIGN); expect(requested).toEqual([]); // swatches need no thumbnails
    cat.setTab(M.defaultTab()); expect(requested.length).toBeGreaterThan(0); expect(requested[0][1]).toBeGreaterThan(p1); // newer tab = higher priority
  });
  it('a failed thumbnail (null) leaves the colour swatch', async () => {
    make({ thumbs: { peek: () => null, get: () => Promise.resolve(null) } }); cat.open(); await Promise.resolve(); await Promise.resolve();
    expect(cat.$body.querySelector(`img[data-thumb="${firstCard().id}"]`).src).toBeUndefined();
  });
  it('dragging the handle down dismisses; a short drag springs back; a tap on the handle hides', () => {
    make(); cat.open(); const ev = (type, y, t, target = { closest: () => null }) => ({ type, clientY: y, pointerId: 1, timeStamp: t, button: 0, target });
    cat.$top.dispatch('pointerdown', ev('pointerdown', 100, 0)); cat.$top.dispatch('pointermove', ev('pointermove', 140, 100)); expect(cat.sheet.style.transform).toBe('translateY(40px)');
    cat.$top.dispatch('pointerup', ev('pointerup', 140, 900)); expect(cat.isOpen).toBe(true); expect(cat.sheet.style.transform).toBe('');
    cat.$top.dispatch('pointerdown', ev('pointerdown', 100, 0)); cat.$top.dispatch('pointermove', ev('pointermove', 400, 200)); cat.$top.dispatch('pointerup', ev('pointerup', 400, 300)); expect(cat.isOpen).toBe(false);
    cat.open(); const handle = { closest: (s) => (s === '.cat-grab' ? {} : null) }; cat.$top.dispatch('pointerdown', ev('pointerdown', 100, 0, handle)); cat.$top.dispatch('pointerup', ev('pointerup', 100, 120, handle)); expect(cat.isOpen).toBe(false);
    cat.open(); const btn = { closest: (s) => (s === 'button' ? {} : null) }; cat.$top.dispatch('pointerdown', ev('pointerdown', 100, 0, btn)); cat.$top.dispatch('pointerup', ev('pointerup', 100, 100, btn)); expect(cat.isOpen).toBe(true);
  });
  it('height is the sheet height while open and 0 when hidden', () => { make(); expect(cat.height).toBe(0); cat.open(); expect(cat.height).toBe(480); cat.close(); expect(cat.height).toBe(0); });
  it('accepts the "change" option as an alias of onChange, and a throwing callback never breaks a purchase', () => {
    const seen = []; make({ opts: { onChange: null, change: (d) => seen.push(d.kind) } }); cat.open(); cat.root.dispatch('click', tap({ act: 'buy', id: firstCard().id })); expect(seen).toEqual(['buy']);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {}); make({ opts: { onChange: () => { throw new Error('x'); } } }); cat.open(); const c = firstCard(), n0 = H.ownedCount(store.state, c.id); cat.root.dispatch('click', tap({ act: 'buy', id: c.id })); expect(H.ownedCount(store.state, c.id)).toBe(n0 + 1); err.mockRestore();
  });
});

describe('Catalogue markup (pure strings)', () => {
  it('tabs: one selected tab, roving tabindex, storage badge, escaped labels', () => {
    const html = tabsHTML([{ id: 'a', label: 'A<b>', emoji: '🛏️', kind: 'category' }, { id: M.TAB_STORAGE, label: 'In storage', emoji: '📦', kind: 'storage', count: 3 }], 'a');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1); expect(html).toContain('tabindex="0"'); expect(html).toContain('tabindex="-1"'); expect(html).toContain('A&lt;b&gt;'); expect(html).toContain('>3<');
  });
  it('cards: size tag, stars, owned badge, unaffordable hint, aria-label with the price; no raw markup injection', () => {
    H.buyFurniture(store, 'armchair'); const tab = M.categories().find((c) => M.tabView(store.state, c.id, 0).cards.some((x) => x.id === 'armchair')).id, view = M.tabView(store.state, tab, 0);
    const html = bodyHTML(view, fmt), c = view.cards.find((x) => x.id === 'armchair');
    expect(html).toContain(`>${c.sizeLabel}<`); expect(html).toContain('★'.repeat(c.stars)); expect(html).toContain('×1'); expect(html).toContain('+1 in storage'); expect(html).toContain(`Need ${fmt(c.price)} more`); expect(html).toContain(`aria-label="${M.cardLabel(c, fmt)}`);
    expect(bodyHTML({ kind: 'category', sections: [{ id: 'x', label: null, cards: [] }], cards: [], empty: '<img onerror=x>' }, fmt)).not.toContain('<img onerror');
  });
  it('design swatches: pressed state, material hint, first-time price', () => {
    const html = bodyHTML(M.tabView(store.state, M.TAB_DESIGN, 0), fmt);
    expect(html).toContain('aria-pressed="true"'); expect(html).toContain('data-mat="tile"'); expect(html).toContain('data-mat="wood"'); expect(html).toContain('In use'); expect(html).toContain(fmt(FD.WALL_PRICE)); expect(html).toContain(`${fmt(FD.FLOOR_PRICE)} the first time`);
  });
});

/* ---------------------------------------------------------------- build bar + floor grid */
describe('floor grid geometry', () => {
  const segs = (flat) => { const out = []; for (let i = 0; i < flat.length; i += 4) out.push(flat.slice(i, i + 4)); return out; };
  it('every line sits on a multiple of the 0.25 m placement snap, inside the room', () => {
    const { minor, major } = gridLines(FD.ROOM); expect(minor.length % 4).toBe(0); expect(major.length % 4).toBe(0);
    for (const [x0, z0, x1, z1] of [...segs(minor), ...segs(major)]) {
      const vertical = x0 === x1, c = vertical ? x0 : z0; expect(Math.abs(c / SNAP - Math.round(c / SNAP))).toBeLessThan(1e-9);
      if (vertical) { expect([z0, z1]).toEqual([FD.ROOM.z0, FD.ROOM.z1]); expect(c).toBeGreaterThanOrEqual(FD.ROOM.x0); expect(c).toBeLessThanOrEqual(FD.ROOM.x1); } else { expect([x0, x1]).toEqual([FD.ROOM.x0, FD.ROOM.x1]); expect(c).toBeGreaterThanOrEqual(FD.ROOM.z0); expect(c).toBeLessThanOrEqual(FD.ROOM.z1); }
    }
  });
  it('has the expected number of minor and major lines for a known room, and majors are whole metres', () => {
    const room = { x0: -1, x1: 1, z0: -0.5, z1: 0.5 }, g = gridLines(room, 0.25, 1);
    // x: -1,-.75,...,1 = 9 lines (3 major: -1, 0, 1); z: -.5,-.25,0,.25,.5 = 5 lines (1 major: 0)
    expect(segs(g.major)).toHaveLength(4); expect(segs(g.minor)).toHaveLength(9 + 5 - 4);
    for (const [x0, z0, x1] of segs(g.major)) expect(Math.abs((x0 === x1 ? x0 : z0) % 1)).toBeLessThan(1e-9);
  });
  it('picks dark lines for light floors and light lines for dark floors', () => {
    expect(gridColorFor(FD.FLOORS.birch[2])).toBe('#24323b'); expect(gridColorFor(FD.FLOORS.walnut[2])).toBe('#ffffff'); expect(gridColorFor(null)).toMatch(/^#/);
  });
});

describe('floor grid fade', () => {
  const manual = () => { const q = []; return { raf: (fn) => q.push(fn), run: (ms) => { const fn = q.shift(); fn?.(ms); return !!fn; }, q }; };
  it('starts hidden, shows instantly on request, hides instantly on request', () => {
    const g = makeFloorGrid({ raf: undefined }); expect(g.group.visible).toBe(false); expect(g.level).toBe(0);
    g.set(true); expect(g.group.visible).toBe(true); expect(g.level).toBe(1); expect(g.group.children.every((c) => c.material.opacity > 0)).toBe(true);
    g.set(false); expect(g.group.visible).toBe(false); expect(g.group.children.every((c) => c.material.opacity === 0)).toBe(true);
    g.set(true, true); g.set(false, true); expect(g.level).toBe(0);
  });
  it('fades in over ~220 ms with frames, and back out', () => {
    const m = manual(), g = makeFloorGrid({ raf: m.raf, reduced: () => false }); vi.spyOn(performance, 'now').mockReturnValue(1000);
    g.set(true); expect(m.q).toHaveLength(1); expect(g.level).toBe(0); m.run(1050); expect(g.level).toBeGreaterThan(0.2); expect(g.level).toBeLessThan(0.3); expect(g.group.visible).toBe(true);
    m.run(1100); m.run(1150); m.run(1200); m.run(1250); expect(g.level).toBe(1); expect(m.q).toHaveLength(0);
    g.set(false); expect(m.q).toHaveLength(1); m.run(1300 + 0); for (let i = 0; i < 6; i++) m.run(1400 + i * 60); expect(g.level).toBe(0); expect(g.group.visible).toBe(false); vi.restoreAllMocks();
  });
  it('reverses cleanly when the target flips mid-fade, without stacking frames', () => {
    const m = manual(), g = makeFloorGrid({ raf: m.raf, reduced: () => false }); vi.spyOn(performance, 'now').mockReturnValue(0);
    g.set(true); m.run(100); const mid = g.level; g.set(false); g.set(true); g.set(false); expect(m.q).toHaveLength(1); m.run(150); expect(g.level).toBeLessThan(mid); vi.restoreAllMocks();
  });
  it('reduced-motion users get no fade', () => {
    const m = manual(), g = makeFloorGrid({ raf: m.raf, reduced: () => true }); g.set(true); expect(g.level).toBe(1); expect(m.q).toHaveLength(0);
  });
  it('recolours the lines and disposes its GPU resources', () => {
    const g = makeFloorGrid({ raf: undefined }); g.setColor('#123456'); expect(g.group.children[0].material.color.getHexString()).toBe('123456'); expect(g.group.children[2].material.color.getHexString()).not.toBe('123456');
    const spies = g.group.children.map((c) => vi.spyOn(c.geometry, 'dispose')); g.dispose(); for (const s of spies) expect(s).toHaveBeenCalled();
  });
});

describe('BuildMode with the Catalogue', () => {
  let els, win, canvasEl, scene, camera, panels, audio, toasts, catalogue, build, layouts, body;
  const mkEls = () => { els = {}; for (const id of ['build', 'b-hint', 'b-rot', 'b-del', 'b-buy', 'b-stored', 'b-stored-n', 'b-done']) els[id] = new El(id.startsWith('b-') && id !== 'b-hint' && id !== 'b-stored-n' ? 'button' : 'div'); els.build.hidden = true; els['b-stored'].hidden = true; };
  beforeEach(() => {
    mkEls(); win = {}; body = new Set();
    globalThis.document = { getElementById: (id) => els[id], body: { classList: { add: (c) => body.add(c), remove: (c) => body.delete(c) } }, activeElement: null };
    globalThis.addEventListener = (t, f) => { (win[t] ||= []).push(f); }; globalThis.matchMedia = () => ({ matches: true }); globalThis.innerHeight = 800; globalThis.innerWidth = 400;
    canvasEl = new El('canvas'); canvasEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800 });
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100); camera.position.set(0, 14, 0.01); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    panels = { open: false, furnitureShop: vi.fn() }; audio = { blip: vi.fn() }; toasts = []; layouts = [];
    catalogue = { isOpen: false, height: 0, open: vi.fn(function (tab) { this.isOpen = true; this.openedTab = tab; }), close: vi.fn(function () { this.isOpen = false; }), closedBy: () => false };
    build = new BuildMode({ canvas: canvasEl, camera, scene, store, panels, audio, toast: (m, k) => toasts.push([m, k]), catalogue, onLayout: (f) => layouts.push(f) });
  });
  afterEach(() => { for (const k of ['document', 'addEventListener', 'matchMedia', 'innerHeight', 'innerWidth']) delete globalThis[k]; });
  const key = (k, extra = {}) => ({ key: k, target: { tagName: 'DIV' }, repeat: false, ...extra });
  const press = (k, extra) => { for (const f of win.keydown) f(key(k, extra)); };
  const px = (x, z) => { const v = new THREE.Vector3(x, 0, z).project(camera); return { clientX: (v.x + 1) / 2 * 800, clientY: (1 - v.y) / 2 * 800, pointerId: 1, button: 0 }; };
  const clickAt = (x, z) => { const p = px(x, z); canvasEl.dispatch('pointerdown', p); canvasEl.dispatch('pointerup', p); };

  it('puts the grid in the scene, hidden until a piece is selected, then fades it in and out with the selection', () => {
    const grid = scene.getObjectByName('floor-grid'); expect(grid).toBeTruthy(); build.start(); expect(grid.visible).toBe(false);
    H.buyFurniture(store, 'plant'); build.select({ type: 'plant', id: null }); expect(grid.visible).toBe(true); expect(build.grid.target).toBe(1);
    build.select(null); expect(grid.visible).toBe(false); build.select({ type: 'plant', id: null }); build.stop(); expect(grid.visible).toBe(false);
  });
  it('start()/stop() toggle the bar and the body class; quiet start skips the toast; stop() hides the Catalogue too', () => {
    build.start(); expect(els.build.hidden).toBe(false); expect(body.has('building')).toBe(true); expect(build.active).toBe(true); expect(toasts).toHaveLength(1);
    build.stop(); build.start({ quiet: true }); expect(toasts).toHaveLength(1); catalogue.open(); build.stop(); expect(catalogue.close).toHaveBeenCalled(); expect(els.build.hidden).toBe(true); expect(body.has('building')).toBe(false); expect(build.active).toBe(false);
  });
  it('Buy opens the Catalogue; the storage pill opens its In storage tab; with no Catalogue the old shop panel is used', () => {
    build.start(); els['b-buy'].onclick(); expect(catalogue.open).toHaveBeenCalledWith(undefined); els['b-stored'].onclick(); expect(catalogue.open).toHaveBeenLastCalledWith('in-storage');
    build.setCatalogue(null); els['b-buy'].onclick(); expect(panels.furnitureShop).toHaveBeenCalledTimes(1); build.setCatalogue(catalogue); els['b-buy'].onclick(); expect(catalogue.open).toHaveBeenCalledTimes(3);
  });
  it('the catalogue option and setCatalogue are interchangeable', () => {
    const b2 = new BuildMode({ canvas: new El('canvas'), camera, scene: new THREE.Scene(), store, panels, audio, toast() {} }); expect(b2.catalogue).toBeNull(); expect(b2.setCatalogue(catalogue)).toBe(b2); expect(b2.catalogue).toBe(catalogue);
  });
  it('the bar shows the number of stored pieces and enables Rotate/Store only when they apply', () => {
    build.start(); expect(els['b-stored'].hidden).toBe(true); expect(els['b-rot'].disabled).toBe(true); expect(els['b-del'].disabled).toBe(true);
    H.buyFurniture(store, 'plant'); H.buyFurniture(store, 'plant'); build.refresh(); expect(els['b-stored'].hidden).toBe(false); expect(els['b-stored-n'].textContent).toBe('2');
    build.select({ type: 'plant', id: null }); expect(els['b-rot'].disabled).toBe(false); expect(els['b-del'].disabled).toBe(true); expect(els['b-hint'].textContent).toMatch(/place/i);
    clickAt(-3.5, -0.4); const placed = store.state.home.placed[0]; expect(placed).toBeTruthy(); build.select({ type: 'plant', id: placed.id }); expect(els['b-del'].disabled).toBe(false); expect(els['b-hint'].textContent).toMatch(/move/i);
  });
  it('places a selected piece with the ghost, clears the selection after the last copy, and shows the blocking rule in the hint', () => {
    build.start(); H.buyFurniture(store, 'armchair'); build.select({ type: 'armchair', id: null });
    canvasEl.dispatch('pointermove', px(-0.4, -0.9)); expect(build.ghost.visible).toBe(true); expect(els['b-hint'].dataset.err).toMatch(/Blocked by the tv/); expect(els['b-hint'].textContent).toMatch(/Blocked by the tv/);
    clickAt(-0.4, -0.9); expect(store.state.home.placed).toHaveLength(0); expect(toasts.at(-1)[1]).toBe('warn'); expect(audio.blip).toHaveBeenCalledWith('error');
    canvasEl.dispatch('pointermove', px(0.5, 1.0)); expect(els['b-hint'].dataset.err).toBe(''); expect(els['b-hint'].textContent).toMatch(/place/i);
    clickAt(0.5, 1.0); expect(store.state.home.placed).toHaveLength(1); expect(build.sel).toBeNull(); expect(build.grid.target).toBe(0); expect(els['b-hint'].textContent).toMatch(/Buy/);
  });
  it('R rotates only with a selection; Delete stores the selected placed piece', () => {
    build.start(); press('r'); expect(build.rot).toBe(0); H.buyFurniture(store, 'plant'); build.select({ type: 'plant', id: null }); press('r'); expect(build.rot).toBe(1);
    clickAt(-3.5, -0.4); expect(store.state.home.placed).toHaveLength(1); expect(store.state.home.placed[0].rot).toBe(1);
    build.select({ type: 'plant', id: store.state.home.placed[0].id }); expect(build.rot).toBe(1); press('Delete'); expect(store.state.home.placed).toHaveLength(0); expect(build.sel).toBeNull(); expect(H.availableToPlace(store.state, 'plant')).toBe(1);
  });
  it('Esc deselects first, then exits; typing, key-repeat, panels and phone never trigger it', () => {
    build.start(); H.buyFurniture(store, 'plant'); build.select({ type: 'plant', id: null });
    press('Escape', { target: { tagName: 'INPUT' } }); expect(build.sel).toBeTruthy(); press('Escape', { target: { tagName: 'TEXTAREA' } }); press('Escape', { target: { isContentEditable: true } }); press('r', { target: { tagName: 'SELECT' } }); expect(build.rot).toBe(0);
    press('Escape', { repeat: true }); expect(build.sel).toBeTruthy(); panels.open = true; press('Escape'); expect(build.sel).toBeTruthy(); panels.open = false;
    build.isBlocked = () => true; press('Escape'); expect(build.active).toBe(true); build.isBlocked = () => false;
    press('Escape'); expect(build.sel).toBeNull(); expect(build.active).toBe(true); press('Escape'); expect(build.active).toBe(false);
    press('Escape'); press('r'); expect(build.active).toBe(false); // inactive: keys are ignored entirely
  });
  it('keys belong to the Catalogue while it is open, and an Esc that just hid it does not also exit build mode', () => {
    build.start(); catalogue.isOpen = true; press('Escape'); press('r'); press('Delete'); expect(build.active).toBe(true);
    catalogue.isOpen = false; const hidden = key('Escape'); catalogue.closedBy = (e) => e === hidden; for (const f of win.keydown) f(hidden); expect(build.active).toBe(true);
    press('Escape'); expect(build.active).toBe(false);
  });
  it('ignores canvas taps while the Catalogue is open', () => {
    build.start(); H.buyFurniture(store, 'plant'); build.select({ type: 'plant', id: null }); catalogue.isOpen = true; clickAt(-3.5, -0.4); expect(store.state.home.placed).toHaveLength(0); catalogue.isOpen = false; clickAt(-3.5, -0.4); expect(store.state.home.placed).toHaveLength(1);
  });
  it('frames the room above whichever is taller: the bar or the open sheet', () => {
    els.build.offsetHeight = 100; build.start(); expect(layouts.at(-1)).toBeCloseTo((100 + 14) / 800, 6);
    catalogue.isOpen = true; catalogue.height = 480; build.layout(); expect(layouts.at(-1)).toBeCloseTo(Math.min(0.6, (480 + 14) / 800), 6); catalogue.height = 760; build.layout(); expect(layouts.at(-1)).toBe(0.6);
    catalogue.isOpen = false; build.layout(); expect(layouts.at(-1)).toBeCloseTo((100 + 14) / 800, 6); build.stop(); const n = layouts.length; build.layout(); expect(layouts).toHaveLength(n);
  });
  it('keeps the public API the integrator relies on', () => {
    for (const m of ['start', 'stop', 'select', 'refresh', 'rotate', 'removeSel', 'click', 'layout', 'setCatalogue', 'openCatalogue']) expect(build[m], m).toBeTypeOf('function');
    expect(build.active).toBe(false); expect(build.state).toBe(store.state);
  });
  it('select() of a stale piece (stored copy sold elsewhere) is dropped on refresh', () => {
    build.start(); H.buyFurniture(store, 'plant'); build.select({ type: 'plant', id: null }); expect(build.sel).toBeTruthy(); H.sellFurniture(store, 'plant'); build.refresh(); expect(build.sel).toBeNull(); expect(build.grid.target).toBe(0);
  });
});
