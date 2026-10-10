/**
 * The Buy sheet reads the furniture data defensively. These tests stand in for the expanded catalogue (CATEGORIES / sizeLabel / tierStars /
 * tiers / a 60 % sell ratio) by mocking the data module, so the view-model is proven against both shapes of the data.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/data/furniture.js', async (importOriginal) => {
  const o = await importOriginal();
  const mk = (id, name, price, cat, tier, w = 1, d = 1, extra = {}) => ({ id, name, price, w, d, h: 0.8, solid: true, color: '#889', cat, tier, ...extra });
  return {
    ...o,
    SELL_RATIO: 0.6,
    CATEGORIES: [{ id: 'sleep', label: 'Sleep', emoji: '🛏️' }, { id: 'design', label: 'Design', emoji: '🎨' }, { id: 'fun', label: 'Fun', emoji: '🎮' }, { id: 'empty', label: 'Empty', emoji: '🫥' }],
    sizeLabel: (def) => `${Math.ceil(def.w)}x${Math.ceil(def.d)}`,
    tierStars: (def) => Math.min(4, Math.max(1, (def.tier ?? 1) + 0)),
    FURNITURE: {
      ...o.FURNITURE,
      bed_b: mk('bed_b', 'Queen Bed', 90000, 'sleep', 3, 1.6, 2.1), bed_a: mk('bed_a', 'Cot', 30000, 'sleep', 1, 0.9, 1.9), bed_c: mk('bed_c', 'Futon', 45000, 'sleep', 1, 1.4, 1.9),
      pool: mk('pool', 'Pool Table', 250000, 'Fun', 4, 2.5, 1.4),
    },
  };
});

const { Store } = await import('../src/core/store.js');
const M = await import('../src/ui/catalogue-model.js');
const H = await import('../src/core/home.js');
const FD = await import('../src/data/furniture.js');

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let store; beforeEach(() => { store = new Store(mem(), () => 1_700_000_000_000); store.state.bank.balance = 50_000_000; });

describe('catalogue model against the expanded data shape', () => {
  it('uses CATEGORIES (Design forced first), skips empty ones, and gathers unmatched legacy items under More', () => {
    const tabs = M.tabList(store.state), ids = tabs.map((t) => t.id);
    expect(ids.slice(0, 3)).toEqual(['design', 'sleep', 'fun']); expect(ids).toContain('empty'); expect(ids.at(-2)).toBe('more'); expect(ids.at(-1)).toBe(M.TAB_STORAGE);
    expect(tabs[1]).toMatchObject({ label: 'Sleep', emoji: '🛏️' });
    expect(M.tabView(store.state, 'empty', 0)).toMatchObject({ cards: [], empty: expect.any(String) });
    const more = M.tabView(store.state, 'more', 0).cards.map((c) => c.id); expect(more).toContain('armchair'); expect(more).not.toContain('bed_a');
    const all = new Set(); for (const t of tabs.filter((x) => x.kind === 'category')) for (const c of M.tabView(store.state, t.id, 0).cards) all.add(c.id);
    expect([...all].sort()).toEqual(Object.keys(FD.FURNITURE).sort());
  });
  it('matches a card to its category by id or by label, ignoring case', () => {
    expect(M.tabView(store.state, 'fun', 0).cards.map((c) => c.id)).toEqual(['pool']);
  });
  it('orders by tier, then price, then name', () => {
    expect(M.tabView(store.state, 'sleep', 0).cards.map((c) => c.id)).toEqual(['bed_a', 'bed_c', 'bed_b']); // tier 1 $300, tier 1 $450, tier 3 $900
  });
  it('takes size labels and stars from the data module', () => {
    const pool = M.tabView(store.state, 'fun', 0).cards[0]; expect(pool).toMatchObject({ sizeLabel: '3x2', stars: 4 });
    expect(M.sizeOf({ w: 1.6, d: 2.1 })).toBe('2x3'); expect(M.starsOf({ tier: 9 })).toBe(4);
  });
  it('sells at the data module ratio: floor(price * 0.6), and the banner says so', () => {
    expect(M.sellRatio()).toBe(0.6); expect(M.sellPct()).toBe(60); expect(M.bannerText()).toMatch(/^Selling pays 60% of list price\./);
    expect(M.tabView(store.state, 'sleep', 0).cards.find((c) => c.id === 'bed_c')).toMatchObject({ sellPrice: 27000 });
    H.buyFurniture(store, 'bed_b'); const b0 = store.ledger.balance;
    expect(M.sellPiece(store, 'bed_b')).toMatchObject({ ok: true, refund: 54000 }); expect(store.ledger.balance - b0).toBe(54000);
    expect(M.sellPriceOf(1999)).toBe(1199);
  });
  it('buys and stores the new pieces through the same validated rules', () => {
    expect(M.buyPiece(store, 'pool').ok).toBe(true); expect(M.storageCount(store.state)).toBe(1);
    expect(M.tabView(store.state, M.TAB_STORAGE, 0).cards.map((c) => c.id)).toEqual(['pool']); expect(M.tabList(store.state).at(-1).count).toBe(1);
  });
});
