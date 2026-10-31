/**
 * Real-money checkout for the owner (advertise.html): a billboard booking or a support tier becomes a link to the owner's own Shopify checkout
 * (data/sponsors.js CHECKOUT). The buyer pays on Shopify's page, never in the game; the details travel with the order as line-item properties, so
 * the owner can review an ad before adding it to SPONSORED. Until the owner fills CHECKOUT, a booking can go out as an email instead (CONTACT_URL
 * as a mailto:), and otherwise the page says booking opens soon. Pure and tested (tests/checkout.test.js), so it can move to a server unchanged.
 */
import { BOARD_BY_ID, THEMES } from '../data/billboards.js';
import { SPONSOR_TIERS, SUPPORT_TIERS } from '../data/sponsors.js';
import { safeUrl } from './sponsors.js';
import { moderate } from './ads.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@<>"']{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const SHOP = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const VARIANT = /^\d{6,20}$/;
const clean = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400e3).toISOString().slice(0, 10);

/** The price tier of a board: { id, name, cad }. */
export const boardTier = (boardId) => (own(BOARD_BY_ID, boardId) ? SPONSOR_TIERS.find((t) => t.id === BOARD_BY_ID[boardId].adTier) ?? null : null);

/** Is checkout set up for this product? kind 'ads' (tier id) or 'support' (tier id). */
export const checkoutReady = (cfg, kind, id) => !!cfg && SHOP.test(cfg.shop ?? '') && VARIANT.test(String(cfg[kind]?.[id] ?? ''));

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

/** Base64url of a UTF-8 JSON object (what Shopify cart permalinks take for line-item properties). */
export function b64url(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj)); let bin = ''; for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const cartLink = (shop, variant, email, props) => {
  const q = new URLSearchParams(); if (email) q.set('checkout[email]', email); q.set('properties', b64url(props)); q.set('ref', 'regina-life');
  const url = `https://${shop}/cart/${variant}:1?${q.toString()}`; return url.length <= 2048 ? url : null;
};

/** The Shopify checkout link for a validated booking, or null if checkout is not set up. */
export function adCheckoutUrl(cfg, booking) {
  if (!booking?.tier || !checkoutReady(cfg, 'ads', booking.tier.id)) return null;
  return cartLink(cfg.shop, cfg.ads[booking.tier.id], booking.email, { Board: `${BOARD_BY_ID[booking.board].name} (${booking.board})`, Business: booking.business, 'Ad line': booking.text,
    Website: booking.url, Colours: booking.theme, Runs: `${booking.start} to ${booking.end}`, 'Founding badge': booking.founding ? 'Yes' : 'No' });
}

/** Check a support pick: { tier, name (for the mural tiers), email }. */
export function validateSupport(f) {
  const e = {}, t = SUPPORT_TIERS.find((x) => x.id === f?.tier); if (!t) e.tier = 'Pick a way to support.';
  const name = clean(f?.name, 40); if (t?.mural && name.length < 2) e.name = 'The name to paint on the mural.';
  const email = clean(f?.email, 120); if (!EMAIL.test(email)) e.email = 'An email for your receipt.';
  return { ok: !Object.keys(e).length, errors: e, support: Object.keys(e).length ? null : { tier: t, name: t.mural ? name : '', email } };
}
export function supportCheckoutUrl(cfg, sup) {
  if (!sup?.tier || !checkoutReady(cfg, 'support', sup.tier.id)) return null;
  return cartLink(cfg.shop, cfg.support[sup.tier.id], sup.email, sup.tier.mural ? { 'Name on the mural': sup.name } : { Thanks: 'Regina Life supporter' });
}

/** The fallback: the same booking as an email to the owner (a mailto: CONTACT_URL), or null. */
export function bookingEmail(contact, booking) {
  if (typeof contact !== 'string' || !/^mailto:[^\s@]+@[^\s@]+\.[^\s@?]+$/.test(contact) || !booking) return null;
  const body = [`Board: ${BOARD_BY_ID[booking.board].name} (${booking.tier.name}, CA$${booking.tier.cad} for 7 days)`, `Business: ${booking.business}`, `Ad line: ${booking.text}`,
    `Website: ${booking.url}`, `Colours: ${booking.theme}`, `Runs: ${booking.start} to ${booking.end}`, `Founding badge: ${booking.founding ? 'Yes' : 'No'}`, `Reply to: ${booking.email}`].join('\n');
  return `${contact}?subject=${encodeURIComponent(`Billboard booking: ${booking.business}`)}&body=${encodeURIComponent(body)}`;
}
