/** Furniture catalogue: data integrity, price rules, storage, home bonuses, soft-lock protection with big pieces, old saves, 3D models. */
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Store, SAVE_KEY } from '../src/core/store.js';
import * as H from '../src/core/home.js';
import { MAX_TX } from '../src/core/ledger.js';
import {
  FURNITURE, CATEGORIES, FURNITURE_CATS, sizeLabel, tierStars, itemsInCategory, perkOf, WALLS, FLOORS, WALL_PRICE, FLOOR_PRICE, wallPrice, floorPrice,
  SELL_RATIO, sellPrice, MAX_PLACED, MAX_OWNED_EACH, HOME_FX, HOME_CAPS, POSTER_FX, POSTER_SIZE, ROOM, KEEPOUT, KEY_POINTS, tvSeatFactor,
} from '../src/data/furniture.js';
import { furnitureModel, MODEL_KINDS } from '../src/world/furnitureModels.js';

const mem = (init) => { const m = new Map(init ? [[SAVE_KEY, JSON.stringify(init)]] : []); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store; beforeEach(() => { t = 1_700_000_000_000; store = new Store(mem(), () => t); });
const fund = (cents = 5e9) => { store.state.bank.balance = cents; };
const buy = (type, n = 1) => { for (let i = 0; i < n; i++) { t += 1000; expect(H.buyFurniture(store, type).ok, type).toBe(true); } };
const loadSave = (patch) => { const base = JSON.parse(JSON.stringify(new Store(mem(), () => t).state)); return new Store(mem({ ...base, ...patch }), () => t); };
const ITEMS = Object.values(FURNITURE), BY_KIND = {}; for (const f of ITEMS) (BY_KIND[f.kind] ||= []).push(f);
/** A bare state for the pure bonus function: owns 99 of everything and has the given types placed (geometry is irrelevant to it). */
const placedState = (types, extra = {}) => ({ souvenirs: [], ...extra, home: { owned: Object.fromEntries(Object.keys(FURNITURE).map((k) => [k, 99])), placed: types.map((type, i) => ({ id: `p${i}`, type, x: 0, z: 0, rot: 0 })) } });
const bonus = (types, skill, extra) => H.homeBonuses(placedState(types, extra), skill);
/** All grid spots (0.5 m steps, both rotations) where `want(canPlace result)` holds for a piece, in the current store. */
const spots = (type, want) => { const out = []; for (let x = -4; x <= 4; x += 0.5) for (let z = -5; z <= 5; z += 0.5) for (const rot of [0, 1]) { const r = H.canPlace(store.state, type, x, z, rot); if (want(r)) out.push([x, z, rot, r]); } return out; };
const firstSpot = (type) => spots(type, (r) => r.ok)[0];
const ORIGINAL_13 = { armchair: [0.95, 0.95, 0.9], beanbag: [0.9, 0.9, 0.55], chair: [0.5, 0.5, 0.9], dining: [1.5, 0.9, 0.75], coffee: [1.1, 0.6, 0.42], side: [0.5, 0.5, 0.55], bookcase: [1.4, 0.38, 1.9],
  dresser: [1.2, 0.5, 0.95], plant: [0.55, 0.55, 1.3], lamp: [0.4, 0.4, 1.7], speaker: [0.8, 0.4, 0.7], rug_round: [2, 2, 0.02], rug_long: [0.8, 2.4, 0.02] };

describe('catalogue data', () => {
  it('has about 60 pieces with unique ids that match their keys', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(55); expect(ITEMS.length).toBeLessThanOrEqual(80);
    expect(new Set(ITEMS.map((f) => f.id)).size).toBe(ITEMS.length); for (const [k, f] of Object.entries(FURNITURE)) expect(f.id).toBe(k);
  });
  it('every piece is complete: name, category, price, size, solidity, colour and 1-4 stars', () => {
    for (const f of ITEMS) {
      expect(typeof f.name === 'string' && f.name.length > 2, f.id).toBe(true); expect(FURNITURE_CATS, f.id).toContain(f.cat); expect(typeof f.kind, f.id).toBe('string');
      expect(Number.isInteger(f.tier) && f.tier >= 1 && f.tier <= 4, f.id).toBe(true); expect(Number.isInteger(f.price) && f.price > 0 && f.price % 100 === 0, `${f.id} whole-dollar price`).toBe(true); expect(f.price, f.id).toBeLessThan(MAX_TX);
      for (const v of [f.w, f.d, f.h]) expect(Number.isFinite(v) && v > 0, f.id).toBe(true); expect(typeof f.solid, f.id).toBe('boolean'); expect(f.color, f.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(f.w, f.id).toBeLessThanOrEqual(ROOM.x1 - ROOM.x0); expect(f.d, f.id).toBeLessThanOrEqual(ROOM.z1 - ROOM.z0);
    }
  });
  it('categories: Design first, unique, with labels and emoji; every item category is a tab with at least four pieces', () => {
    expect(CATEGORIES[0].id).toBe('Design'); expect(CATEGORIES.map((c) => c.id)).toEqual(expect.arrayContaining(['Design', 'Sleep', 'Kitchen', 'Bath', 'Comfort', 'Fun', 'Skills', 'Light', 'Decor', 'Storage', 'Rugs']));
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length); for (const c of CATEGORIES) { expect(c.label.length).toBeGreaterThan(2); expect(c.emoji.length).toBeGreaterThan(0); }
    expect(FURNITURE_CATS).toEqual(CATEGORIES.filter((c) => c.id !== 'Design').map((c) => c.id));
    for (const c of FURNITURE_CATS) { expect(itemsInCategory(c).length, c).toBeGreaterThanOrEqual(4); expect(itemsInCategory(c).map((f) => f.price), c).toEqual(itemsInCategory(c).map((f) => f.price).sort((a, b) => a - b)); }
    expect(itemsInCategory('Design')).toEqual([]);
  });
  it('sizeLabel: 0.5 m cells, rounded up, larger side first', () => {
    expect(sizeLabel(FURNITURE.chair)).toBe('1x1'); expect(sizeLabel(FURNITURE.lamp)).toBe('1x1'); expect(sizeLabel(FURNITURE.dresser)).toBe('3x1'); expect(sizeLabel(FURNITURE.dining)).toBe('3x2');
    expect(sizeLabel(FURNITURE.sofa)).toBe('5x2'); expect(sizeLabel(FURNITURE.sectional)).toBe('6x4'); expect(sizeLabel({ w: 0.9, d: 2.0 })).toBe('4x2'); expect(sizeLabel({ w: 0.5, d: 0.5 })).toBe('1x1'); expect(sizeLabel({ w: 0.51, d: 0.5 })).toBe('2x1');
    expect(sizeLabel(POSTER_SIZE)).toBe('2x1'); for (const f of ITEMS) expect(sizeLabel(f), f.id).toMatch(/^[1-9]\d?x[1-9]\d?$/);
    for (const f of ITEMS) { const [a, b] = sizeLabel(f).split('x').map(Number); expect(a, f.id).toBeGreaterThanOrEqual(b); expect(a * 0.5, f.id).toBeGreaterThanOrEqual(Math.max(f.w, f.d) - 1e-9); expect((a - 1) * 0.5, f.id).toBeLessThan(Math.max(f.w, f.d)); }
    expect(sizeLabel({ w: 0.5 + 1e-12, d: 0.5 })).toBe('1x1'); // float fuzz never bumps a cell
  });
  it('tierStars returns 1-4 and clamps odd input', () => {
    for (const f of ITEMS) expect(tierStars(f), f.id).toBe(f.tier); expect(tierStars({ tier: 9 })).toBe(4); expect(tierStars({ tier: 0 })).toBe(1); expect(tierStars({})).toBe(1); expect(tierStars(null)).toBe(1); expect(tierStars({ tier: 2.6 })).toBe(3);
  });
  it('quality tiers: price rises strictly with tier inside every kind, and each kind has one piece per tier', () => {
    for (const [kind, list] of Object.entries(BY_KIND)) {
      const sorted = [...list].sort((a, b) => a.tier - b.tier); expect(new Set(sorted.map((f) => f.tier)).size, `${kind} has duplicate tiers`).toBe(sorted.length);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i].price, `${sorted[i].id} should cost more than ${sorted[i - 1].id}`).toBeGreaterThan(sorted[i - 1].price);
    }
    for (const kind of ['bed', 'sofa', 'tv', 'lamp', 'plant', 'rug']) expect(BY_KIND[kind].map((f) => f.tier).sort(), kind).toEqual([1, 2, 3, 4]);
    expect(FURNITURE.futon.tier).toBe(1); expect(FURNITURE.sectional.tier).toBe(4); expect(FURNITURE.sectional.name).toMatch(/sectional/i);
    const avg = (n) => ITEMS.filter((f) => f.tier === n).reduce((a, f) => a + f.price, 0) / ITEMS.filter((f) => f.tier === n).length; expect(avg(1)).toBeLessThan(avg(2)); expect(avg(2)).toBeLessThan(avg(3)); expect(avg(3)).toBeLessThan(avg(4));
  });
  it('rugs and mats are walk-on; everything else is solid', () => {
    for (const f of ITEMS) { if (f.kind === 'rug' || f.kind === 'mat' || f.kind === 'bathmat') { expect(f.solid, f.id).toBe(false); expect(f.h, f.id).toBeLessThan(0.1); } else expect(f.solid, f.id).toBe(true); }
  });
  it('prices are realistic 2026 CAD: inside the ECONOMY.md section 3.9 ranges, budget to premium', () => {
    const range = { armchair: [229, 499], beanbag: [79, 169], chair: [59, 129], dining: [299, 699], coffee: [149, 349], side: [59, 149], bookcase: [119, 299], dresser: [299, 699], plant: [49, 129], lamp: [49, 149], speaker: [199, 499], rug_round: [119, 349], rug_long: [59, 179] };
    for (const [id, [lo, hi]] of Object.entries(range)) expect(FURNITURE[id].price / 100, id).toBeGreaterThanOrEqual(lo), expect(FURNITURE[id].price / 100, id).toBeLessThanOrEqual(hi);
    expect(Math.min(...ITEMS.map((f) => f.price))).toBeGreaterThanOrEqual(2500); expect(Math.min(...ITEMS.map((f) => f.price))).toBeLessThanOrEqual(5000); expect(Math.max(...ITEMS.map((f) => f.price))).toBeLessThanOrEqual(300000);
    expect(FURNITURE.bed_queen.price / 100).toBeGreaterThanOrEqual(700); expect(FURNITURE.tv_65.price / 100).toBeGreaterThanOrEqual(600); expect(FURNITURE.sofa.price / 100).toBeGreaterThanOrEqual(700); expect(FURNITURE.futon.price).toBeLessThan(FURNITURE.sofa.price / 3);
  });
  it('pacing: the first furniture set is about $750 and a full 24-piece flat is $6k-$10k', () => {
    const FIRST_SET = 75000, first = ['armchair', 'coffee', 'rug_round', 'lamp', 'plant'].reduce((a, id) => a + FURNITURE[id].price, 0);
    expect(Math.abs(first - FIRST_SET) / FIRST_SET).toBeLessThan(0.1); // ~6 entry shifts from the $400 start
    const flat = ['bed_queen', 'nightstand', 'nightstand', 'dresser', 'wardrobe', 'sofa', 'armchair', 'coffee', 'side', 'tv_50', 'speaker', 'dining', 'chair', 'chair', 'chair', 'chair', 'island', 'desk', 'bookcase', 'lamp', 'lamp', 'plant', 'plant', 'rug_round', 'rug_long', 'hamper', 'mirror'];
    expect(flat.length).toBeGreaterThanOrEqual(24); const total = flat.reduce((a, id) => a + FURNITURE[id].price, 0); expect(total).toBeGreaterThanOrEqual(600000); expect(total).toBeLessThanOrEqual(1000000);
  });
  it('every item that existed before still exists with the same footprint (old saves keep working)', () => {
    for (const [id, [w, d, h]] of Object.entries(ORIGINAL_13)) { expect(FURNITURE[id], id).toBeTruthy(); expect([FURNITURE[id].w, FURNITURE[id].d, FURNITURE[id].h], id).toEqual([w, d, h]); }
  });
  it('every piece fits somewhere in the empty apartment', () => {
    for (const f of ITEMS) {
      let ok = null; outer: for (let x = -4; x <= 4; x += 0.5) for (let z = -5; z <= 5; z += 0.5) for (const rot of [0, 1]) if (H.canPlace(store.state, f.id, x, z, rot).ok) { ok = [x, z, rot]; break outer; }
      expect(ok, `${f.id} has no valid spot`).toBeTruthy();
    }
  });
  it('Design: paint and flooring have colours, materials and first-time prices; oak is free', () => {
    expect(Object.keys(WALLS).length).toBeGreaterThanOrEqual(10); expect(Object.keys(FLOORS).length).toBeGreaterThanOrEqual(8); expect(FLOORS.oak[3]).toBe(0); expect(WALLS.cream[1]).toBe('#e9e3d6'); expect(FLOORS.slate[1]).toBe('tile');
    for (const [k, w] of Object.entries(WALLS)) { expect(w[0], k).toBeTruthy(); expect(w[1], k).toMatch(/^#[0-9a-f]{6}$/i); expect(Number.isInteger(w[2]) && w[2] >= 6000 && w[2] <= 15000, k).toBe(true); expect(wallPrice(k)).toBe(w[2]); }
    for (const [k, f] of Object.entries(FLOORS)) { expect(['wood', 'tile'], k).toContain(f[1]); expect(f[2], k).toMatch(/^#[0-9a-f]{6}$/i); expect(Number.isInteger(f[3]) && f[3] >= 0 && f[3] <= 150000, k).toBe(true); expect(floorPrice(k)).toBe(f[3]); }
    expect(wallPrice('nope')).toBe(WALL_PRICE); expect(floorPrice('constructor')).toBe(FLOOR_PRICE); expect(wallPrice('__proto__')).toBe(WALL_PRICE);
  });
  it('keep-out and key points are untouched and inside the room', () => { for (const k of KEEPOUT) { expect(k.x0).toBeLessThan(k.x1); expect(k.z0).toBeLessThan(k.z1); } expect(KEY_POINTS[0].n).toBe('entrance'); expect(MAX_PLACED).toBe(60); });
});

describe('selling, buying and storage', () => {
  it('selling pays exactly 60% of list price, for every piece, in whole cents', () => {
    expect(SELL_RATIO).toBe(0.6); expect(sellPrice(10000)).toBe(6000); expect(sellPrice(7999)).toBe(4799); expect(sellPrice(1)).toBe(0); fund();
    for (const f of ITEMS) { const b0 = store.ledger.balance; buy(f.id); expect(store.ledger.balance).toBe(b0 - f.price); t += 1000; const r = H.sellFurniture(store, f.id); expect(r.ok, f.id).toBe(true); expect(r.refund, f.id).toBe(Math.floor(f.price * 0.6)); expect(store.ledger.balance, f.id).toBe(b0 - f.price + r.refund); expect(Number.isInteger(r.refund)).toBe(true); }
  });
  it('you cannot flip furniture for profit: buy + sell always loses 40%', () => { for (const f of ITEMS) expect(f.price - sellPrice(f.price), f.id).toBeGreaterThanOrEqual(Math.floor(f.price * 0.4)); });
  it('buying needs money and is refused when broke, with the balance untouched', () => { store.state.bank.balance = FURNITURE.armchair.price - 1; expect(H.buyFurniture(store, 'armchair').ok).toBe(false); expect(store.ledger.balance).toBe(FURNITURE.armchair.price - 1); expect(H.ownedCount(store.state, 'armchair')).toBe(0); });
  it('storage accounting: owned minus placed, posters included, sell/remove/place keep it consistent', () => {
    fund(); expect(H.storageCount(store.state)).toBe(0); expect(H.storageItems(store.state)).toEqual([]);
    buy('armchair', 3); buy('plant', 2); expect(H.storageCount(store.state)).toBe(5);
    const a = H.placeFurniture(store, 'armchair', 0.5, 1.0, 0); expect(a.ok).toBe(true); expect(H.storageCount(store.state)).toBe(4); expect(H.availableToPlace(store.state, 'armchair')).toBe(2);
    expect(H.storageItems(store.state)).toEqual(expect.arrayContaining([{ type: 'armchair', n: 2 }, { type: 'plant', n: 2 }])); expect(H.storageItems(store.state).find((x) => x.type === 'bed_king')).toBeUndefined();
    t += 1000; expect(H.sellFurniture(store, 'plant').ok).toBe(true); expect(H.storageCount(store.state)).toBe(3);
    H.removeFurniture(store, a.item.id); expect(H.storageCount(store.state)).toBe(4);
    store.state.souvenirs.push('banff'); expect(H.storageCount(store.state)).toBe(5); expect(H.placeFurniture(store, 'poster_banff', -1, -2, 0).ok).toBe(true); expect(H.storageCount(store.state)).toBe(4);
    expect(H.placedCount(store.state, 'armchair') + H.availableToPlace(store.state, 'armchair')).toBe(H.ownedCount(store.state, 'armchair'));
  });
  it('a piece that is placed cannot be sold until it is back in storage', () => { fund(); buy('sofa'); H.placeFurniture(store, 'sofa', 0, 1, 0); expect(H.sellFurniture(store, 'sofa').error).toMatch(/Remove it/); });
  it('you can own up to MAX_OWNED_EACH of one piece', () => { fund(); store.state.home.owned.side = MAX_OWNED_EACH; t += 1000; expect(H.buyFurniture(store, 'side').ok).toBe(false); expect(H.ownedCount(store.state, 'side')).toBe(MAX_OWNED_EACH); });
  it('MAX_PLACED is 60: the 61st piece is refused', () => {
    fund(); store.state.home.owned.bath_mat = 99; for (let i = 0; i < MAX_PLACED; i++) expect(H.placeFurniture(store, 'bath_mat', 0, 0, 0).ok, `#${i}`).toBe(true);
    expect(H.placeFurniture(store, 'bath_mat', 0, 0, 0).error).toMatch(/up to 60/); expect(store.state.home.placed).toHaveLength(60);
  });
  it('paint and flooring: each style costs its own price once, then switching back is free', () => {
    fund(); const b0 = store.ledger.balance; t += 1000; expect(H.setStyle(store, 'wall', 'navy').ok).toBe(true); expect(store.ledger.balance).toBe(b0 - wallPrice('navy')); t += 1000; expect(H.setStyle(store, 'floor', 'walnut').ok).toBe(true); expect(store.ledger.balance).toBe(b0 - wallPrice('navy') - floorPrice('walnut'));
    t += 1000; H.setStyle(store, 'floor', 'oak'); H.setStyle(store, 'floor', 'walnut'); expect(store.ledger.balance).toBe(b0 - wallPrice('navy') - floorPrice('walnut')); expect(store.state.home.floor).toBe('walnut');
    store.state.home.floors = ['walnut']; t += 1000; expect(H.setStyle(store, 'floor', 'oak').ok).toBe(true); expect(store.ledger.balance).toBe(b0 - wallPrice('navy') - floorPrice('walnut')); // oak is free even if the list lost it
    store.state.bank.balance = 100; expect(H.setStyle(store, 'floor', 'ebony').error).toMatch(/Insufficient/); expect(store.state.home.floor).toBe('oak');
  });
});

describe('home bonuses (gameplay value of placed furniture)', () => {
  it('is pure, total over junk, and returns exactly sleep/comfort/fun/skill/mood', () => {
    const zero = { sleep: 0, comfort: 0, fun: 0, skill: 0, mood: 0 };
    for (const s of [undefined, null, {}, { home: null }, { home: { placed: 'x' } }, { home: { placed: [null, 7, 'a', {}, { type: 'constructor' }, { type: '__proto__' }, { type: 'poster_atlantis' }], owned: {} } }]) expect(H.homeBonuses(s)).toEqual(zero);
    const s = placedState(['bed_king', 'sofa', 'tv_65', 'plant', 'lamp', 'treadmill']), before = JSON.stringify(s); const r = H.homeBonuses(s); expect(Object.keys(r).sort()).toEqual(['comfort', 'fun', 'mood', 'skill', 'sleep']); expect(JSON.stringify(s)).toBe(before); expect(H.homeBonuses(s)).toEqual(r);
  });
  it('furniture in storage (owned, not placed) or placed beyond what you own does nothing', () => {
    expect(H.homeBonuses({ souvenirs: [], home: { owned: { bed_king: 1 }, placed: [] } }).sleep).toBe(0);
    expect(H.homeBonuses({ souvenirs: [], home: { owned: {}, placed: [{ id: 'a', type: 'bed_king', x: 0, z: 0, rot: 0 }] } }).sleep).toBe(0);
    expect(H.homeBonuses({ souvenirs: [], home: { owned: { bed_king: 1 }, placed: [{ id: 'a', type: 'bed_king' }, { id: 'b', type: 'bed_king' }] } }).sleep).toBe(0.26); // the second one is not yours
  });
  it('the best bed sets the sleep bonus, and a better bed is always better', () => {
    const beds = ['mattress', 'bed_single', 'bed_queen', 'bed_king'].map((id) => bonus([id]).sleep); expect(beds[0]).toBeGreaterThan(0); for (let i = 1; i < 4; i++) expect(beds[i]).toBeGreaterThan(beds[i - 1]);
    expect(beds[3]).toBe(0.26); expect(bonus(['bed_king', 'nightstand']).sleep).toBeGreaterThan(bonus(['bed_king']).sleep); expect(bonus(['bed_queen', 'bed_king']).sleep).toBeLessThan(0.26 + 0.2); expect(bonus(['nightstand']).sleep).toBeLessThan(bonus(['mattress']).sleep);
  });
  it('a good sofa + TV gives the fun bonus; a TV with nowhere to sit is worth half', () => {
    expect(bonus(['sofa']).fun).toBe(0); const alone = bonus(['tv_65']).fun, withSofa = bonus(['tv_65', 'sofa']).fun, withSectional = bonus(['tv_65', 'sectional']).fun, withFuton = bonus(['tv_65', 'futon']).fun;
    expect(alone).toBeGreaterThan(0); expect(withSofa).toBeGreaterThan(alone); expect(withSectional).toBeGreaterThan(withSofa); expect(withFuton).toBeGreaterThan(alone); expect(withFuton).toBeLessThan(withSofa);
    expect(alone).toBeCloseTo(0.3 * tvSeatFactor(0), 3); expect(withSectional).toBeCloseTo(0.3, 3); expect(bonus(['tv_oled', 'sectional']).fun).toBeGreaterThan(bonus(['tv_32', 'sectional']).fun); expect(bonus(['speaker']).fun).toBeGreaterThan(0); expect(bonus(['pool']).fun).toBeGreaterThan(bonus(['foosball']).fun);
  });
  it('comfort comes from seats, rugs, tubs and tables', () => { expect(bonus(['sofa']).comfort).toBeCloseTo(0.18, 3); expect(bonus(['sofa', 'armchair', 'rug_round', 'coffee']).comfort).toBeGreaterThan(bonus(['sofa']).comfort); expect(bonus(['tub']).comfort).toBeGreaterThan(0); expect(bonus(['dresser', 'desk', 'tv_50']).comfort).toBe(0); });
  it('treadmill, weights and the bookcase boost skill XP, per skill or overall', () => {
    expect(bonus(['treadmill'], 'fitness').skill).toBeCloseTo(0.3, 3); expect(bonus(['treadmill'], 'charisma').skill).toBe(0); expect(bonus(['bookcase'], 'charisma').skill).toBeCloseTo(0.12, 3); expect(bonus(['bookcase'], 'fitness').skill).toBe(0);
    expect(bonus(['bench'], 'fitness').skill).toBeGreaterThan(bonus(['dumbbells'], 'fitness').skill); expect(bonus(['island'], 'cooking').skill).toBeGreaterThan(0); expect(bonus(['treadmill', 'bookcase']).skill).toBeCloseTo(0.42, 3); expect(bonus(['treadmill'], 'nonsense').skill).toBe(0); expect(bonus(['yoga_mat'], 'fitness').skill).toBeGreaterThan(0);
  });
  it('lamps, plants and cosy extras give a small flat mood bonus; placed souvenir posters add a little', () => {
    expect(bonus(['plant']).mood).toBeCloseTo(0.7, 3); expect(bonus(['lamp', 'plant']).mood).toBeGreaterThan(bonus(['plant']).mood); expect(bonus(['plant_tree']).mood).toBeGreaterThan(bonus(['plant_pothos']).mood); expect(bonus(['aquarium']).mood).toBeGreaterThan(bonus(['plant']).mood);
    expect(bonus(['poster_banff'], null, { souvenirs: ['banff'] }).mood).toBeCloseTo(POSTER_FX.v, 3); expect(bonus(['poster_banff']).mood).toBe(0); expect(bonus(['poster_banff', 'poster_banff'], null, { souvenirs: ['banff'] }).mood).toBeCloseTo(POSTER_FX.v, 3); // you only own one
  });
  it('diminishing returns: each extra copy of the same piece adds less than the one before', () => {
    for (const id of ['bed_queen', 'plant', 'treadmill', 'tv_50', 'lamp']) {
      const stat = HOME_FX[FURNITURE[id].kind].stat, gains = []; let prev = 0;
      for (let n = 1; n <= 6; n++) { const v = H.homeBonuses(placedState(Array(n).fill(id)), HOME_FX[FURNITURE[id].kind].skill)[stat]; gains.push(v - prev); prev = v; }
      expect(gains[1], id).toBeLessThan(gains[0]); for (let i = 2; i < gains.length; i++) expect(gains[i], id).toBeLessThanOrEqual(gains[i - 1] + 1e-9);
    }
    expect(bonus(['sofa', 'sofa']).comfort).toBeCloseTo(0.18 * 1.5, 3);
  });
  it('hard caps: nothing stacks past HOME_CAPS, however much you place', () => {
    const everything = ITEMS.flatMap((f) => Array(5).fill(f.id)); const r = H.homeBonuses(placedState(everything), null);
    expect(r.sleep).toBe(HOME_CAPS.sleep); expect(r.comfort).toBe(HOME_CAPS.comfort); expect(r.fun).toBe(HOME_CAPS.fun); expect(r.skill).toBe(HOME_CAPS.skill); expect(r.mood).toBe(HOME_CAPS.mood);
    for (const k of Object.keys(r)) expect(r[k]).toBeLessThanOrEqual(HOME_CAPS[k]); expect(HOME_CAPS.sleep).toBeLessThanOrEqual(0.5); expect(HOME_CAPS.mood).toBeLessThanOrEqual(8);
    for (const skill of ['fitness', 'charisma', 'cooking']) expect(H.homeBonuses(placedState(everything), skill).skill).toBeLessThanOrEqual(HOME_CAPS.skill);
  });
  it('a sensible mid-range flat earns real but modest bonuses', () => {
    const r = bonus(['bed_queen', 'nightstand', 'sofa', 'armchair', 'coffee', 'tv_50', 'lamp', 'plant', 'bookcase', 'rug_round']); expect(r.sleep).toBeGreaterThan(0.1); expect(r.sleep).toBeLessThan(0.3); expect(r.fun).toBeGreaterThan(0.1); expect(r.fun).toBeLessThan(0.3); expect(r.mood).toBeGreaterThan(1); expect(r.mood).toBeLessThan(3);
  });
  it('the effect table matches the catalogue: every effect kind exists, values rise with stars, perks are readable', () => {
    for (const [kind, fx] of Object.entries(HOME_FX)) {
      expect(BY_KIND[kind], `no piece of kind ${kind}`).toBeTruthy(); expect(fx.v).toHaveLength(4); for (let i = 1; i < 4; i++) expect(fx.v[i], kind).toBeGreaterThan(fx.v[i - 1]); expect(fx.v[0]).toBeGreaterThan(0); expect(fx.rep).toBeGreaterThan(0); expect(fx.rep).toBeLessThan(1);
      expect(['sleep', 'comfort', 'fun', 'skill', 'mood'], kind).toContain(fx.stat); expect(fx.stat === 'skill').toBe(!!fx.skill); expect(fx.v[3], kind).toBeLessThanOrEqual(HOME_CAPS[fx.stat]);
    }
    expect(perkOf(FURNITURE.bed_king)).toMatchObject({ stat: 'sleep', text: '+26%' }); expect(perkOf(FURNITURE.plant).text).toBe('+0.7'); expect(perkOf(FURNITURE.treadmill).label).toMatch(/Fitness/); expect(perkOf(FURNITURE.dresser)).toBeNull(); expect(perkOf(null)).toBeNull();
  });
  it('bonuses come from what is placed in the real store, and update when pieces move to storage', () => {
    fund(); buy('bed_queen'); buy('lamp'); expect(H.homeBonuses(store.state).sleep).toBe(0); const bs = firstSpot('bed_queen'), p = H.placeFurniture(store, 'bed_queen', bs[0], bs[1], bs[2]); expect(p.ok).toBe(true); expect(H.homeBonuses(store.state).sleep).toBe(0.2);
    const ls = firstSpot('lamp'); expect(H.placeFurniture(store, 'lamp', ls[0], ls[1], ls[2]).ok).toBe(true); expect(H.homeBonuses(store.state).mood).toBeCloseTo(0.5, 3); H.removeFurniture(store, p.item.id); expect(H.homeBonuses(store.state).sleep).toBe(0);
  });
});

describe('big pieces can never soft-lock the apartment', () => {
  const BIG = ['sectional', 'pool', 'bed_king', 'tub', 'treadmill', 'wardrobe', 'sideboard', 'dining_oak', 'foosball', 'sofa'];
  it('every large piece has valid spots, and spots that are refused because they would seal the way', { timeout: 60000 }, () => {
    for (const id of BIG) { expect(spots(id, (r) => r.ok).length, `${id} valid`).toBeGreaterThan(5); expect(spots(id, (r) => !r.ok && /Blocks the way/.test(r.error)).length, `${id} blocking`).toBeGreaterThan(0); }
  });
  it('filling the room with large pieces through the rules keeps every fixture reachable', () => {
    fund(); store.state.home.owned = Object.fromEntries(BIG.map((id) => [id, 99])); let n = 0;
    for (const id of BIG) for (let x = -4; x <= 4; x += 0.5) for (let z = -5; z <= 5; z += 0.5) for (const rot of [0, 1]) { if (store.state.home.placed.length >= MAX_PLACED) break; if (H.placeFurniture(store, id, x, z, rot).ok) n++; }
    expect(n).toBeGreaterThan(6); expect(H.accessibleKeys(store.state).sort()).toEqual(H.BASELINE_KEYS.sort());
    const solid = store.state.home.placed; for (const p of solid) { const f = H.footprint(p.type, p.rot); expect(p.x - f.w / 2).toBeGreaterThanOrEqual(ROOM.x0 - 1e-6); expect(p.x + f.w / 2).toBeLessThanOrEqual(ROOM.x1 + 1e-6); expect(p.z - f.d / 2).toBeGreaterThanOrEqual(ROOM.z0 - 1e-6); expect(p.z + f.d / 2).toBeLessThanOrEqual(ROOM.z1 + 1e-6); }
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) { const a = H.footprint(solid[i].type, solid[i].rot), b = H.footprint(solid[j].type, solid[j].rot); const ov = Math.abs(solid[i].x - solid[j].x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(solid[i].z - solid[j].z) < (a.d + b.d) / 2 - 1e-6; expect(ov, `${solid[i].type} overlaps ${solid[j].type}`).toBe(false); }
  });
  it('moving a large piece may not seal the way either', () => {
    fund(); buy('sectional'); const ok = spots('sectional', (r) => r.ok)[0], bad = spots('sectional', (r) => !r.ok && /Blocks the way/.test(r.error))[0];
    const p = H.placeFurniture(store, 'sectional', ok[0], ok[1], ok[2]); expect(p.ok).toBe(true); const x0 = p.item.x, z0 = p.item.z; expect(H.moveFurniture(store, p.item.id, bad[0], bad[1], bad[2]).ok).toBe(false); expect(store.state.home.placed[0].x).toBe(x0); expect(store.state.home.placed[0].z).toBe(z0);
  });
  it('repairHome frees a sealed apartment (legacy or tampered) packed with large pieces, storing as few as it needs', () => {
    store.state.home.owned = Object.fromEntries(BIG.map((id) => [id, 99])); let k = 0;
    const bads = BIG.map((id) => [id, spots(id, (r) => !r.ok && /Blocks the way/.test(r.error))[0]]); // each one alone would seal the way
    for (const [id, bad] of bads) store.state.home.placed.push({ id: `x${k++}`, type: id, x: bad[0], z: bad[1], rot: bad[2] });
    expect(H.accessibleKeys(store.state).length).toBeLessThan(H.BASELINE_KEYS.length); const total = store.state.home.placed.length, n = H.repairHome(store);
    expect(n).toBeGreaterThan(0); expect(n).toBeLessThanOrEqual(total); expect(store.state.home.placed).toHaveLength(total - n); expect(H.accessibleKeys(store.state).sort()).toEqual(H.BASELINE_KEYS.sort()); expect(H.repairHome(store)).toBe(0);
    expect(H.storageCount(store.state)).toBe(Object.values(store.state.home.owned).reduce((a, b) => a + b, 0) - store.state.home.placed.length); // repaired pieces are not lost: they are in storage
  });
  it('non-solid rugs never block, even the huge wool rug laid over the entrance', () => { fund(); buy('rug_wool'); expect(H.placeFurniture(store, 'rug_wool', 2.5, 3.5, 0).ok).toBe(true); expect(H.accessibleKeys(store.state).sort()).toEqual(H.BASELINE_KEYS.sort()); });
  it('a save loaded with a sealed apartment of large pieces is repaired by repairHome (the game calls it on entry)', () => {
    const k = loadSave({ home: { owned: { sectional: 1, pool: 1, bed_king: 1 }, placed: [{ id: 'a', type: 'sectional', x: -3, z: 1, rot: 1 }, { id: 'b', type: 'pool', x: -3, z: 1.5, rot: 1 }, { id: 'c', type: 'bed_king', x: -2.5, z: 1, rot: 0 }], wall: 'cream', floor: 'oak' } });
    expect(k.state.home.placed.length).toBeGreaterThan(0); H.repairHome(k); expect(H.accessibleKeys(k.state).sort()).toEqual(H.BASELINE_KEYS.sort());
  });
});

describe('old saves and sanitize', () => {
  it('a save made with the old 13 pieces loads untouched', () => {
    const owned = Object.fromEntries(Object.keys(ORIGINAL_13).map((id) => [id, 2])); const placed = [{ id: 'a', type: 'armchair', x: 0.5, z: 1, rot: 0 }, { id: 'b', type: 'rug_round', x: 0, z: 0.5, rot: 0 }, { id: 'c', type: 'plant', x: -3.5, z: -0.4, rot: 0 }, { id: 'd', type: 'bookcase', x: -0.7, z: -3.2, rot: 0 }];
    const k = loadSave({ home: { owned, placed, wall: 'sage', floor: 'walnut', walls: ['cream', 'sage'], floors: ['oak', 'walnut'] } }); expect(k.state.home.owned).toEqual(owned); expect(k.state.home.placed).toEqual(placed); expect(k.state.home.wall).toBe('sage'); expect(k.state.home.floor).toBe('walnut'); expect(k.state.home.walls).toEqual(['cream', 'sage']);
  });
  it('sanitize accepts every id in FURNITURE (owned and placed) and every wall and floor', () => {
    const owned = Object.fromEntries(Object.keys(FURNITURE).map((id) => [id, 3])); const k = loadSave({ home: { owned, placed: [], wall: 'navy', floor: 'ebony', walls: Object.keys(WALLS), floors: Object.keys(FLOORS) } });
    expect(Object.keys(k.state.home.owned).sort()).toEqual(Object.keys(FURNITURE).sort()); expect(k.state.home.wall).toBe('navy'); expect(k.state.home.floor).toBe('ebony'); expect([...k.state.home.walls].sort()).toEqual(Object.keys(WALLS).sort()); expect([...k.state.home.floors].sort()).toEqual(Object.keys(FLOORS).sort());
    for (const id of ['bed_king', 'sectional', 'pool', 'tv_oled', 'lamp_arc', 'plant_tree']) { const s = loadSave({ home: { owned: { [id]: 1 }, placed: [{ id: 'p', type: id, x: 0, z: 0.5, rot: 0 }], wall: 'cream', floor: 'oak' } }); expect(s.state.home.placed.map((p) => p.type), id).toEqual([id]); }
  });
  it('sanitize drops unknown ids, pieces that stick out of the room, and caps counts', () => {
    const k = loadSave({ home: { owned: { constructor: 1, sofa_of_doom: 4, sofa: 500, tv_50: 1.5, plant: -1 }, wall: 'lava', floor: 'plaid', placed: [{ id: 'a', type: 'sofa', x: 99, z: 0, rot: 0 }, { id: 'b', type: 'sofa', x: 0, z: 0.5, rot: 0 }, { id: 'c', type: 'pool', x: 0, z: 0, rot: 0 }, { id: 'd', type: 'sofa_of_doom', x: 0, z: 0, rot: 0 }] } });
    expect(k.state.home.owned).toEqual({ sofa: MAX_OWNED_EACH }); expect(k.state.home.placed.map((p) => p.id)).toEqual(['b']); expect(k.state.home.wall).toBe('cream'); expect(k.state.home.floor).toBe('oak');
  });
  it('sanitize will not keep more of a piece placed than you own (no free furniture from an edited save), but keeps posters you earned', () => {
    const k = loadSave({ souvenirs: ['banff'], home: { owned: { bath_mat: 2 }, placed: [1, 2, 3].map((i) => ({ id: `m${i}`, type: 'bath_mat', x: 0, z: i, rot: 0 })).concat([{ id: 'n1', type: 'tv_50', x: 0, z: 0, rot: 0 }, { id: 'pb', type: 'poster_banff', x: -1, z: -2, rot: 0 }, { id: 'pc', type: 'poster_calgary', x: 1, z: -2, rot: 0 }]) } });
    expect(k.state.home.placed.map((p) => p.id)).toEqual(['m1', 'm2', 'pb']);
  });
  it('sanitize truncates to MAX_PLACED pieces', () => {
    const placed = Array.from({ length: 80 }, (_, i) => ({ id: `m${i}`, type: 'bath_mat', x: -3 + (i % 8) * 0.75, z: -4 + Math.floor(i / 8) * 0.9, rot: 0 }));
    const k = loadSave({ home: { owned: { bath_mat: 99 }, placed } }); expect(k.state.home.placed).toHaveLength(MAX_PLACED); expect(k.state.home.placed[0].id).toBe('m0');
  });
});

describe('3D models', () => {
  const bbox = (g) => { g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g, true); return { b, s: b.getSize(new THREE.Vector3()), c: b.getCenter(new THREE.Vector3()) }; };
  it('every catalogue kind has a hand-built model', () => { for (const kind of Object.keys(BY_KIND)) expect(MODEL_KINDS, kind).toContain(kind); for (const kind of MODEL_KINDS) expect(BY_KIND[kind], `${kind} builder is unused`).toBeTruthy(); });
  it('every piece builds without throwing, with real finite geometry and only a handful of meshes', () => {
    for (const f of ITEMS) {
      let g; expect(() => { g = furnitureModel(f.id); }, f.id).not.toThrow(); expect(g.userData.type).toBe(f.id); let meshes = 0, verts = 0;
      g.traverse((o) => { if (!o.isMesh) return; meshes++; const p = o.geometry.attributes.position; verts += p.count; for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) throw new Error(`${f.id}: NaN vertex`); expect(o.material.color).toBeTruthy(); });
      expect(meshes, f.id).toBeGreaterThan(0); expect(meshes, `${f.id} draw calls`).toBeLessThanOrEqual(16); expect(verts, `${f.id} is low-poly`).toBeLessThan(9000);
    }
  });
  it('the bounding box of every model is its catalogue w x h x d, standing on the floor and centred on the footprint', () => {
    for (const f of ITEMS) {
      const { b, s, c } = bbox(furnitureModel(f.id)), tol = (v) => 0.012 + 0.012 * v;
      expect(Math.abs(s.x - f.w), `${f.id} width ${s.x}`).toBeLessThanOrEqual(tol(f.w)); expect(Math.abs(s.z - f.d), `${f.id} depth ${s.z}`).toBeLessThanOrEqual(tol(f.d)); expect(Math.abs(s.y - f.h), `${f.id} height ${s.y}`).toBeLessThanOrEqual(tol(f.h));
      expect(Math.abs(c.x), `${f.id} off-centre x`).toBeLessThanOrEqual(0.012); expect(Math.abs(c.z), `${f.id} off-centre z`).toBeLessThanOrEqual(0.012); expect(Math.abs(b.min.y), `${f.id} floats/sinks`).toBeLessThanOrEqual(0.012);
    }
  });
  it('the raw builders are already accurate (the final fit only nudges, within 4%)', () => {
    for (const f of ITEMS) { const { s } = bbox(furnitureModel(f.id, { fit: false })); for (const [got, want, axis] of [[s.x, f.w, 'w'], [s.y, f.h, 'h'], [s.z, f.d, 'd']]) expect(Math.abs(got - want) / want, `${f.id} raw ${axis}`).toBeLessThan(0.04); }
  });
  it('rotating a model keeps it inside the same footprint the collider uses', () => {
    for (const id of ['sectional', 'pool', 'bed_king', 'treadmill']) { const g = furnitureModel(id); g.rotation.y = Math.PI / 2; const { s } = bbox(g), fp = H.footprint(id, 1); expect(Math.abs(s.x - fp.w)).toBeLessThan(0.05); expect(Math.abs(s.z - fp.d)).toBeLessThan(0.05); }
  });
  it('quality tiers look different: each step of a kind changes the model', () => {
    const detail = (id) => { let v = 0; furnitureModel(id).traverse((o) => { if (o.isMesh) v += o.geometry.attributes.position.count; }); return v; };
    for (const kind of ['bed', 'sofa', 'armchair', 'lamp', 'plant', 'rug']) { const sig = [...BY_KIND[kind]].sort((a, b) => a.tier - b.tier).map((f) => detail(f.id)); expect(new Set(sig).size, `${kind} tiers look identical`).toBe(sig.length); }
    expect(detail('bed_king')).toBeGreaterThan(detail('mattress')); expect(detail('sectional')).toBeGreaterThan(detail('futon')); expect(detail('tv_65')).toBeGreaterThan(detail('tv_50')); // soundbar from three stars up
  });
  it('colours are flat and pleasant: every model is built from a few solid materials, with no textures', () => {
    for (const f of ITEMS) { const mats = new Set(); furnitureModel(f.id).traverse((o) => { if (o.isMesh) { mats.add(o.material); expect(o.material.map, f.id).toBeNull(); } }); expect(mats.size, f.id).toBeLessThanOrEqual(16); }
  });
  it('posters still build, and unknown or prototype names give an empty group instead of throwing', () => {
    const p = furnitureModel('poster_banff'); expect(p.userData.type).toBe('poster_banff'); expect(p.children.length).toBeGreaterThan(2);
    for (const k of ['nope', 'constructor', '__proto__', 'toString', '', undefined, 7]) { let g; expect(() => { g = furnitureModel(k); }, String(k)).not.toThrow(); expect(g.children).toHaveLength(0); }
  });
});
