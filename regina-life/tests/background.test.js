import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { BACKGROUNDS, rollBackground, backgroundOdds, applyBackground, collectAllowance, sanitizeBackground } from '../src/core/background.js';
import { sanitize } from '../src/core/sanitize.js';
import { mulberry32 } from '../src/core/rng.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store;
beforeEach(() => { t = Date.parse('2026-10-31T16:00:00Z'); store = new Store(mem(), () => t); });
describe('family background', () => {
  it('the odds are realistic: most get by, rich parents are rare', () => {
    expect(BACKGROUNDS.reduce((a, b) => a + b.weight, 0)).toBe(100);
    const r = mulberry32(7), n = {}, N = 20000; for (let i = 0; i < N; i++) { const id = rollBackground(r()); n[id] = (n[id] ?? 0) + 1; }
    for (const b of BACKGROUNDS) expect(Math.abs(n[b.id] / N - b.weight / 100), b.id).toBeLessThan(0.012);
    expect(backgroundOdds('rich')).toBe(2); expect(backgroundOdds('getting')).toBe(45);
    expect(rollBackground(0)).toBe('tight'); expect(rollBackground(0.9999)).toBe('rich'); expect(rollBackground(NaN)).toBe('tight');
  });
  it('more money at the start means less of a skill head start', () => {
    const order = BACKGROUNDS.map((b) => b.cash); expect([...order].sort((a, b) => a - b)).toEqual(order);
    const skill = (b) => Object.values(b.skills ?? {}).reduce((a, x) => a + x, 0); expect(skill(BACKGROUNDS[0])).toBeGreaterThan(skill(BACKGROUNDS[1])); expect(skill(BACKGROUNDS[4])).toBe(0);
  });
  it('a tight start pays the moving costs through the ledger; a rich one gets a gift, a home and things', () => {
    expect(applyBackground(store, 'tight').ok).toBe(true); expect(store.state.bank.balance).toBe(15000); expect(store.state.bank.history[0].memo).toMatch(/Moving costs/);
    expect(store.state.skills.cooking).toBe(60);
    const s2 = new Store(mem(), () => t); expect(applyBackground(s2, 'rich', { skillsFrom: { charisma: 25 } }).ok).toBe(true);
    expect(s2.state.bank.balance).toBe(900000); expect(s2.state.home.layout).toBe('onebed'); expect(s2.state.wardrobe).toContain('trapper_brown'); expect(s2.state.home.owned.sofa).toBe(1);
    expect(s2.state.skills.charisma).toBe(25);
  });
  it('only once per life, and only known backgrounds', () => {
    expect(applyBackground(store, 'castle').ok).toBe(false); expect(applyBackground(store, 'getting').ok).toBe(true); const b = store.state.bank.balance;
    expect(applyBackground(store, 'rich').ok).toBe(false); expect(store.state.bank.balance).toBe(b); expect(store.state.inventory.bannock).toBe(1);
  });
  it('the allowance comes once a day you play, and runs out', () => {
    applyBackground(store, 'welloff'); const b0 = store.state.bank.balance;
    expect(collectAllowance(store, t)).toBe(2000); expect(collectAllowance(store, t + 3600e3)).toBe(0);
    for (let d = 1; d < 30; d++) collectAllowance(store, t + d * 86400e3);
    expect(store.state.bank.balance - b0).toBe(14 * 2000); expect(store.state.background.allowanceLeft).toBe(0);
    const s3 = new Store(mem(), () => t); applyBackground(s3, 'getting'); expect(collectAllowance(s3, t)).toBe(0);
  });
  it('saves are cleaned', () => {
    expect(sanitizeBackground({ tier: 'rich', allowanceLeft: 999, allowancePer: -5, allowanceLast: 'x' })).toEqual({ tier: 'rich', allowanceLeft: 60, allowancePer: 0, allowanceLast: '' });
    expect(sanitizeBackground({ tier: 'royal' })).toBeNull(); expect(sanitize({ background: 'lots' }).background).toBeNull();
  });
});
