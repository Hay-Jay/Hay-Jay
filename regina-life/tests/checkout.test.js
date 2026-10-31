import { describe, it, expect } from 'vitest';
import { validateBooking, adCheckoutUrl, checkoutReady, b64url, validateSupport, supportCheckoutUrl, bookingEmail, boardTier } from '../src/core/checkout.js';
import { BILLBOARDS } from '../src/data/billboards.js';
import { SPONSOR_TIERS, SUPPORT_TIERS, CHECKOUT } from '../src/data/sponsors.js';

const today = '2026-10-31', board = BILLBOARDS[0].id;
const form = { board, business: 'Prairie Bakery', text: 'Warm bannock, cold mornings', url: 'https://prairiebakery.ca', email: 'hello@prairiebakery.ca', start: '2026-11-02', theme: 'sunset', founding: true };
const cfg = { shop: 'shop.example.com', ads: { standard: '4011122233344', big: '4011122233355', landmark: '4011122233366' }, support: { coffee: '4011122233377', mural: '4011122233388', founding: '4011122233399' } };
const decode = (s) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
describe('real-money checkout', () => {
  it('ships empty: nothing is for sale until the owner sets it up', () => {
    expect(CHECKOUT.shop).toBe(''); for (const t of SPONSOR_TIERS) expect(checkoutReady(CHECKOUT, 'ads', t.id)).toBe(false);
    for (const t of SUPPORT_TIERS) expect(checkoutReady(CHECKOUT, 'support', t.id)).toBe(false);
    const { booking } = validateBooking(form, today); expect(adCheckoutUrl(CHECKOUT, booking)).toBeNull();
  });
  it('a good booking becomes a checkout link carrying the ad for review', () => {
    const r = validateBooking(form, today); expect(r.ok).toBe(true); expect(r.booking).toMatchObject({ end: '2026-11-08', host: 'prairiebakery.ca', tier: boardTier(board) });
    const url = new URL(adCheckoutUrl(cfg, r.booking)); expect(url.origin).toBe('https://shop.example.com'); expect(url.pathname).toBe(`/cart/${cfg.ads[boardTier(board).id]}:1`);
    expect(url.searchParams.get('checkout[email]')).toBe('hello@prairiebakery.ca');
    expect(decode(url.searchParams.get('properties'))).toMatchObject({ Business: 'Prairie Bakery', 'Ad line': 'Warm bannock, cold mornings', Website: 'https://prairiebakery.ca/', Runs: '2026-11-02 to 2026-11-08' });
  });
  it('refuses what the ad rules refuse', () => {
    const bad = validateBooking({ ...form, board: 'nope', business: ' ', text: 'visit www.spam.com', url: 'http://x.ca', email: 'nope', start: '2026-10-01' }, today);
    expect(bad.ok).toBe(false); expect(Object.keys(bad.errors).sort()).toEqual(['board', 'business', 'email', 'start', 'text', 'url']);
    expect(validateBooking({ ...form, start: '2027-06-01' }, today).errors.start).toBeTruthy();
    expect(checkoutReady({ ...cfg, shop: 'evil.com/x' }, 'ads', 'standard')).toBe(false); expect(checkoutReady({ ...cfg, ads: { standard: 'abc' } }, 'ads', 'standard')).toBe(false);
  });
  it('support: the mural tiers need a name; the link carries it', () => {
    expect(validateSupport({ tier: 'mural', email: 'a@b.ca' }).errors.name).toBeTruthy();
    const s = validateSupport({ tier: 'founding', name: '  Sam  from Regina ', email: 'sam@x.ca' }); expect(s.ok).toBe(true);
    const url = new URL(supportCheckoutUrl(cfg, s.support)); expect(url.pathname).toBe(`/cart/${cfg.support.founding}:1`); expect(decode(url.searchParams.get('properties'))).toEqual({ 'Name on the mural': 'Sam from Regina' });
    expect(validateSupport({ tier: 'coffee', email: 'a@b.ca' }).support.name).toBe('');
  });
  it('the email fallback, and unicode survives the trip', () => {
    const { booking } = validateBooking({ ...form, business: 'Café Crème' }, today);
    const m = bookingEmail('mailto:ads@reginalife.ca', booking); expect(m).toMatch(/^mailto:ads@reginalife\.ca\?subject=/); expect(decodeURIComponent(m)).toMatch(/Café Crème/);
    expect(bookingEmail('https://x.ca', booking)).toBeNull(); expect(bookingEmail('', booking)).toBeNull();
    expect(decode(b64url({ a: 'é 🎸' }))).toEqual({ a: 'é 🎸' });
  });
});
