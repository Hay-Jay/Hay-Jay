import { describe, it, expect } from 'vitest';
import { Store } from '../src/core/store.js';
import { buyAd, validImage, MAX_IMAGE_CHARS } from '../src/core/ads.js';
import { rotationFor, BILLBOARDS, AD_TIERS, HOUSE_ADS } from '../src/data/billboards.js';

const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => delete m[k] }; };
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ';
const rich = () => { const s = new Store(mem(), () => 1e12); s.state.bank.balance = 5_000_000; return s; };

describe('billboard creatives', () => {
  it('accepts only small JPEG data URLs', () => {
    expect(validImage(JPG)).toBe(true);
    expect(validImage('data:image/svg+xml;base64,AAAA')).toBe(false); expect(validImage('javascript:alert(1)')).toBe(false); expect(validImage('data:image/jpeg;base64,<script>')).toBe(false);
    expect(validImage(JPG + 'A'.repeat(MAX_IMAGE_CHARS))).toBe(false); expect(validImage(null)).toBe(false);
  });
  it('stores a valid image with the booking and drops an invalid one', () => {
    const a = rich(); expect(buyAd(a, 'victoria-west', 7, 'Best bannock!', 'prairie', 1e12, JPG).ok).toBe(true); expect(a.state.ads['victoria-west'].image).toBe(JPG);
    const b = rich(); expect(buyAd(b, 'victoria-west', 7, 'Best bannock!', 'prairie', 1e12, 'http://evil.example/x.png').ok).toBe(true); expect(b.state.ads['victoria-west'].image).toBeUndefined();
  });
  it('a save with a bad image is repaired on load', () => {
    const m = mem(), s = new Store(m, () => 1e12); s.state.ads = { 'victoria-west': { text: 'hi there', theme: 'prairie', bought: 1, until: 2e12, days: 7, paid: 1, image: 'data:text/html;base64,AAAA' } }; s.save();
    const t = new Store(m, () => 1e12); expect(t.state.ads['victoria-west']).toBeTruthy(); expect(t.state.ads['victoria-west'].image).toBeUndefined();
  });
});

describe('board rotation', () => {
  it('every board fills its rotation with sponsors, never blank, never more than the tier allows', () => {
    for (const b of BILLBOARDS) { const r = rotationFor(b, null); expect(r).toHaveLength(AD_TIERS[b.adTier].maxRotation); expect(r.every((x) => x.house)).toBe(true); expect(new Set(r.map((x) => x.id)).size).toBe(r.length); }
  });
  it("the player's ad takes one slot, first, and the rest stay sponsors", () => {
    const b = BILLBOARDS[0], r = rotationFor(b, { text: 'mine', theme: 'prairie' });
    expect(r[0].mine).toBe(true); expect(r).toHaveLength(AD_TIERS[b.adTier].maxRotation); expect(r.slice(1).every((x) => x.house)).toBe(true);
  });
  it('is deterministic and uses fictional in-game businesses only', () => {
    const b = BILLBOARDS[3]; expect(rotationFor(b, null).map((x) => x.id)).toEqual(rotationFor(b, null).map((x) => x.id));
    expect(HOUSE_ADS.length).toBeGreaterThanOrEqual(8); for (const a of HOUSE_ADS) expect(a.text.length).toBeLessThanOrEqual(40);
  });
});
