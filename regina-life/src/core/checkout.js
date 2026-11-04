/**
 * Real-money checkout on the Advertise page (advertise.html): a billboard booking or a support tier is paid with PayPal Checkout buttons right on
 * the page (PayPal, or a debit or credit card), into the owner's PayPal Business account (data/sponsors.js PAYPAL). The game never touches the
 * money, and Prairie Dollars never change hands. The ad travels with the payment (item name and description, the website and the run dates), so
 * the owner reviews it in PayPal before adding it to SPONSORED, and refunds it if it can't run. The amount is set on the page, so the owner also
 * checks that the amount paid matches the tier (README "Owner: turning on payments").
 * Until PAYPAL.clientId is set, a booking can go out by email instead (CONTACT_URL as a mailto:), and otherwise the page says booking opens soon.
 * Pure and tested (tests/checkout.test.js).
 */
import { BOARD_BY_ID, THEMES } from '../data/billboards.js';
import { SPONSOR_TIERS, SUPPORT_TIERS } from '../data/sponsors.js';
import { safeUrl } from './sponsors.js';
import { moderate } from './ads.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@<>"']{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const CLIENT_ID = /^[A-Za-z0-9_-]{20,128}$/;
const clean = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const cut = (s, max) => (s.length > max ? s.slice(0, max - 1) + '…' : s);   // PayPal's text fields take 127 characters
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400e3).toISOString().slice(0, 10);

/** The price tier of a board: { id, name, cad }. */
export const boardTier = (boardId) => (own(BOARD_BY_ID, boardId) ? SPONSOR_TIERS.find((t) => t.id === BOARD_BY_ID[boardId].adTier) ?? null : null);
/** Are the PayPal buttons set up? */
export const paypalReady = (cfg) => !!cfg && CLIENT_ID.test(cfg.clientId ?? '') && cfg.currency === 'CAD';
/** The PayPal JavaScript SDK for this site (loaded only on the Advertise page, only when set up). */
export const paypalSdkUrl = (cfg) => (paypalReady(cfg) ? `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.clientId)}&currency=CAD&intent=capture&components=buttons` : null);
/** Dollars as PayPal wants them: '10.00'. */
export const money = (cad) => (Math.round(cad * 100) / 100).toFixed(2);

/**
 * Check a billboard booking from the form. `today` = Regina date YYYY-MM-DD. Returns { ok, errors: { field: message }, booking }.
 * A booking: { board, tier, business, text, url, host, email, start, end, theme, founding }.
 */
export function validateBooking(f, today) {
  const e = {}, b = {};
  if (!own(BOARD_BY_ID, f?.board)) e.board = 'Pick a billboard.'; else { b.board = f.board; b.tier = boardTier(f.board); }
  b.business = clean(f?.business, 60); if (b.business.length < 2) e.business = 'Your business name, please.';
  const m = moderate(clean(f?.text, 40)); if (!m.ok) e.text = m.error; else b.text = m.text.slice(0, 40);
  const link = safeUrl(clean(f?.url, 200)); if (!link) e.url = 'A website starting with https://'; else { b.url = link.href; b.host = link.host; }
  b.email = clean(f?.email, 120); if (!EMAIL.test(b.email)) e.email = 'An email we can reach you at.';
  b.start = clean(f?.start, 10); if (!DAY.test(b.start) || !DAY.test(today ?? '') || b.start < today || b.start > addDays(today, 120)) e.start = 'A start date from today to four months out.'; else b.end = addDays(b.start, 6);
  b.theme = typeof f?.theme === 'string' && own(THEMES, f.theme) ? f.theme : 'prairie'; b.founding = f?.founding !== false;
  return { ok: !Object.keys(e).length, errors: e, booking: Object.keys(e).length ? null : b };
}

/** One PayPal order (v2 Orders API shape) for one item, with the details the owner needs to review it. */
const order = (cad, item, unit) => ({
  intent: 'CAPTURE',
  purchase_units: [{ ...unit, amount: { currency_code: 'CAD', value: money(cad), breakdown: { item_total: { currency_code: 'CAD', value: money(cad) } } },
    items: [{ ...item, quantity: '1', category: 'DIGITAL_GOODS', unit_amount: { currency_code: 'CAD', value: money(cad) } }] }],
  application_context: { brand_name: 'Regina Life', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
});
/** The PayPal order for a validated booking. `ref` makes the invoice id unique (e.g. a timestamp). */
export function adOrder(booking, ref = '') {
  if (!booking?.tier) return null;
  return order(booking.tier.cad,
    { name: cut(`Billboard: ${BOARD_BY_ID[booking.board].name}, 7 days`, 127), description: cut(`"${booking.text}" for ${booking.business}`, 127), sku: `ad-${booking.board}`.slice(0, 127) },
    { description: cut(`Runs ${booking.start} to ${booking.end} · ${booking.theme}${booking.founding ? ' · founding badge' : ''} · reply to ${booking.email}`, 127),
      custom_id: cut(booking.url, 127), invoice_id: cut(`RL-AD-${booking.board}-${booking.start}-${ref}`, 127) });
}

/** Check a support pick: { tier, name (for the mural tiers), email }. */
export function validateSupport(f) {
  const e = {}, t = SUPPORT_TIERS.find((x) => x.id === f?.tier); if (!t) e.tier = 'Pick a way to support.';
  const name = clean(f?.name, 40); if (t?.mural && name.length < 2) e.name = 'The name to paint on the mural.';
  const email = clean(f?.email, 120); if (!EMAIL.test(email)) e.email = 'An email for your receipt.';
  return { ok: !Object.keys(e).length, errors: e, support: Object.keys(e).length ? null : { tier: t, name: t.mural ? name : '', email } };
}
/** The PayPal order for a support tier. */
export function supportOrder(sup, ref = '') {
  if (!sup?.tier) return null;
  return order(sup.tier.cad, { name: cut(`Regina Life: ${sup.tier.name}`, 127), description: cut(sup.tier.mural ? `Name on the mural: ${sup.name}` : 'Thank you for supporting Regina Life', 127), sku: `support-${sup.tier.id}` },
    { description: cut(`Supporter · reply to ${sup.email}`, 127), invoice_id: cut(`RL-SUP-${sup.tier.id}-${ref}`, 127) });
}

/** Did PayPal capture what the tier costs? (A page-side check; the owner's review is the real one.) */
export const paidInFull = (capture, cad) => capture?.status === 'COMPLETED' && (capture.purchase_units?.[0]?.payments?.captures ?? []).some((c) => c.status === 'COMPLETED' && c.amount?.currency_code === 'CAD' && c.amount?.value === money(cad));

/** The fallback: the same booking as an email to the owner (a mailto: CONTACT_URL), or null. */
export function bookingEmail(contact, booking) {
  if (typeof contact !== 'string' || !/^mailto:[^\s@]+@[^\s@]+\.[^\s@?]+$/.test(contact) || !booking) return null;
  const body = [`Board: ${BOARD_BY_ID[booking.board].name} (${booking.tier.name}, CA$${booking.tier.cad} for 7 days)`, `Business: ${booking.business}`, `Ad line: ${booking.text}`,
    `Website: ${booking.url}`, `Colours: ${booking.theme}`, `Runs: ${booking.start} to ${booking.end}`, `Founding badge: ${booking.founding ? 'Yes' : 'No'}`, `Reply to: ${booking.email}`].join('\n');
  return `${contact}?subject=${encodeURIComponent(`Billboard booking: ${booking.business}`)}&body=${encodeURIComponent(body)}`;
}
