/** Real-money surfaces (core/sponsors.js): every booked row is validated before it can reach a billboard; links are https only; the mural is tidy. */
import { describe, it, expect } from 'vitest';
import { safeUrl, validSponsor, sponsoredFor, muralNames } from '../src/core/sponsors.js';
import { rotationFor, BILLBOARDS, AD_TIERS } from '../src/data/billboards.js';
import { SPONSORED, SUPPORTERS, SPONSOR_TIERS, CONTACT_URL, SUPPORT_URL } from '../src/data/sponsors.js';

const board = BILLBOARDS[0].id;
const row = (o = {}) => ({ id: 'sp_1', board, business: 'Prairie Test Bakery', text: 'Warm bannock, cold mornings', url: 'https://example.ca/menu', theme: 'prairie', from: '2026-10-20', to: '2026-10-26', ...o });
const T = Date.parse('2026-10-25T18:00:00Z');

describe('links', () => {
  it('https and a real host name only', () => {
    expect(safeUrl('https://www.example.ca/x?y=1')).toEqual({ href: 'https://www.example.ca/x?y=1', host: 'example.ca' });
    for (const bad of ['http://example.ca', 'javascript:alert(1)', 'https://1.2.3.4/', 'https://user:pw@example.ca', 'https://localhost/', 'https://example.local/', 'ftp://example.ca', 'https://example.ca:8443/', 'https://' + 'a'.repeat(200) + '.ca', 42, null]) expect(safeUrl(bad), String(bad)).toBeNull();
  });
});
describe('booked rows', () => {
  it('a good row passes and is normalised', () => { const v = validSponsor(row({ founding: true })); expect(v.host).toBe('example.ca'); expect(v.founding).toBe(true); });
  it('bad rows are ignored, never shown', () => {
    for (const bad of [row({ board: 'nope' }), row({ text: 'x'.repeat(41) }), row({ business: '' }), row({ url: 'http://example.ca' }), row({ from: '2026-10-27', to: '2026-10-26' }), row({ id: 'bad id!' }), row({ from: 'soon' }), null, 'x'])
      expect(validSponsor(bad)).toBeNull();
    expect(validSponsor(row({ theme: 'neon-nope' })).theme).toBe('prairie');
  });
  it('a row is on air only on its Regina dates, inclusive', () => {
    expect(sponsoredFor(board, T, [row()]).length).toBe(1);
    expect(sponsoredFor(board, Date.parse('2026-10-27T18:00:00Z'), [row()]).length).toBe(0);
    expect(sponsoredFor(board, Date.parse('2026-10-20T07:00:00Z'), [row()]).length).toBe(1);   // 01:00 in Regina on the 20th
    expect(sponsoredFor(BILLBOARDS[1].id, T, [row()]).length).toBe(0);
  });
  it('sponsored ads take rotation slots after the player\'s own ad, labelled, and never exceed the tier\'s rotation', () => {
    const b = BILLBOARDS[0], n = (AD_TIERS[b.adTier] ?? AD_TIERS.standard).maxRotation, sp = sponsoredFor(b.id, T, [row(), row({ id: 'sp_2' }), row({ id: 'sp_3' }), row({ id: 'sp_4' }), row({ id: 'sp_5' })]);
    const r = rotationFor(b, { text: 'mine', theme: 'prairie' }, sp); expect(r.length).toBe(n); expect(r[0].mine).toBe(true); expect(r.slice(1).every((x) => x.sponsored)).toBe(true);
    expect(rotationFor(b, null).every((x) => x.house)).toBe(true);   // nothing booked: house ads as before
  });
  it('ships empty: the owner adds rows after a real booking; prices match VISION 6.2', () => {
    expect(SPONSORED).toEqual([]); expect(SUPPORTERS).toEqual([]); expect(CONTACT_URL).toBe(''); expect(SUPPORT_URL).toBe('');
    expect(SPONSOR_TIERS.map((t) => t.cad)).toEqual([AD_TIERS.standard.realMoney.cents / 100, AD_TIERS.big.realMoney.cents / 100, AD_TIERS.landmark.realMoney.cents / 100]);
  });
});
describe('the Supporters\' Mural', () => {
  it('trims, de-duplicates and caps names', () => {
    expect(muralNames([{ name: '  Sam  Plow ' }, { name: 'sam plow' }, { name: '' }, { name: 'X'.repeat(80), since: '2026-10' }, null, { name: 3 }])).toEqual([{ name: 'Sam Plow', since: null }, { name: 'X'.repeat(40), since: '2026-10' }]);
  });
});
