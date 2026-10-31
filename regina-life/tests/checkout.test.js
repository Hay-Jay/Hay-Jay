import { describe, it, expect } from 'vitest';
import { validateBooking, adOrder, paypalReady, paypalSdkUrl, money, validateSupport, supportOrder, paidInFull, bookingEmail, boardTier } from '../src/core/checkout.js';
import { BILLBOARDS } from '../src/data/billboards.js';
import { SPONSOR_TIERS, SUPPORT_TIERS, PAYPAL } from '../src/data/sponsors.js';

const today = '2026-10-31', board = BILLBOARDS[0].id;
const form = { board, business: 'Prairie Bakery', text: 'Warm bannock, cold mornings', url: 'https://prairiebakery.ca', email: 'hello@prairiebakery.ca', start: '2026-11-02', theme: 'sunset', founding: true };
const cfg = { clientId: 'AbCdEf0123456789_ghIJklMNopQRstuvWXyz-0123456789', currency: 'CAD' };
const unit = (o) => o.purchase_units[0];
describe('real-money checkout (PayPal on the Advertise page)', () => {
  it('ships switched off: no Client ID, no buttons, no SDK', () => {
    expect(PAYPAL.clientId).toBe(''); expect(paypalReady(PAYPAL)).toBe(false); expect(paypalSdkUrl(PAYPAL)).toBeNull();
    expect(paypalReady({ clientId: 'bad id <script>', currency: 'CAD' })).toBe(false); expect(paypalReady({ ...cfg, currency: 'USD' })).toBe(false);
    expect(paypalSdkUrl(cfg)).toBe(`https://www.paypal.com/sdk/js?client-id=${cfg.clientId}&currency=CAD&intent=capture&components=buttons`);
  });
  it('the founding prices: ads CA$10 / 20 / 40, support CA$3 / 10 / 25', () => {
    expect(SPONSOR_TIERS.map((t) => t.cad)).toEqual([10, 20, 40]); expect(SUPPORT_TIERS.map((t) => t.cad)).toEqual([3, 10, 25]); expect(money(10)).toBe('10.00'); expect(money(2.5)).toBe('2.50');
  });
  it('a good booking becomes one PayPal order carrying the ad for review', () => {
    const r = validateBooking(form, today); expect(r.ok).toBe(true); expect(r.booking).toMatchObject({ end: '2026-11-08', host: 'prairiebakery.ca', tier: boardTier(board) });
    const o = adOrder(r.booking, 'x1'), price = money(boardTier(board).cad);
    expect(o.intent).toBe('CAPTURE'); expect(unit(o).amount).toMatchObject({ currency_code: 'CAD', value: price, breakdown: { item_total: { value: price } } });
    expect(unit(o).items[0]).toMatchObject({ quantity: '1', unit_amount: { value: price } }); expect(unit(o).items[0].description).toBe('"Warm bannock, cold mornings" for Prairie Bakery');
    expect(unit(o).custom_id).toBe('https://prairiebakery.ca/'); expect(unit(o).description).toMatch(/Runs 2026-11-02 to 2026-11-08.*hello@prairiebakery\.ca/); expect(unit(o).invoice_id).toMatch(/^RL-AD-/);
    expect(o.application_context.shipping_preference).toBe('NO_SHIPPING');
    for (const s of [unit(o).description, unit(o).custom_id, unit(o).invoice_id, unit(o).items[0].name, unit(o).items[0].description]) expect(s.length).toBeLessThanOrEqual(127);
  });
  it('refuses what the ad rules refuse', () => {
    const bad = validateBooking({ ...form, board: 'nope', business: ' ', text: 'visit www.spam.com', url: 'http://x.ca', email: 'nope', start: '2026-10-01' }, today);
    expect(bad.ok).toBe(false); expect(Object.keys(bad.errors).sort()).toEqual(['board', 'business', 'email', 'start', 'text', 'url']);
    expect(validateBooking({ ...form, start: '2027-06-01' }, today).errors.start).toBeTruthy(); expect(adOrder(null)).toBeNull();
  });
  it('support: the mural tiers need a name, and it rides on the order', () => {
    expect(validateSupport({ tier: 'mural', email: 'a@b.ca' }).errors.name).toBeTruthy();
    const s = validateSupport({ tier: 'founding', name: '  Sam  from Regina ', email: 'sam@x.ca' }); expect(s.ok).toBe(true);
    const o = supportOrder(s.support, 'r'); expect(unit(o).amount.value).toBe('25.00'); expect(unit(o).items[0].description).toBe('Name on the mural: Sam from Regina');
    expect(validateSupport({ tier: 'coffee', email: 'a@b.ca' }).support.name).toBe('');
  });
  it('checks the capture matches the price', () => {
    const cap = (v, st = 'COMPLETED') => ({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: st, amount: { currency_code: 'CAD', value: v } }] } }] });
    expect(paidInFull(cap('10.00'), 10)).toBe(true); expect(paidInFull(cap('1.00'), 10)).toBe(false); expect(paidInFull(cap('10.00', 'PENDING'), 10)).toBe(false); expect(paidInFull(null, 10)).toBe(false);
  });
  it('the email fallback, and unicode survives', () => {
    const { booking } = validateBooking({ ...form, business: 'Café Crème' }, today);
    const m = bookingEmail('mailto:ads@reginalife.ca', booking); expect(m).toMatch(/^mailto:ads@reginalife\.ca\?subject=/); expect(decodeURIComponent(m)).toMatch(/Café Crème/);
    expect(bookingEmail('https://x.ca', booking)).toBeNull(); expect(bookingEmail('', booking)).toBeNull();
  });
});
