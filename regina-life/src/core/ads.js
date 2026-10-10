/**
 * Billboard advertising — VIRTUAL CURRENCY ONLY.
 * A real-money advertising path would need legal terms, moderation tooling and payment infrastructure, so it is
 * deliberately absent; nothing here can charge real money. (AD_TIERS[...].realMoney is a disabled price benchmark.)
 * Price ladder and rationale: docs/ECONOMY.md.
 */
import { BOARD_BY_ID, AD_TIERS, AD_DAYS, DURATIONS, THEMES } from '../data/billboards.js';
import { notify } from './game.js';
import { policyMult } from './policy.js';
import { own } from './util.js';

export const MAX_AD_CHARS = 40;
const DAY_MS = 86_400_000;
const BANNED = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'kill', 'porn', 'sex', 'casino', 'bet365', 'bitcoin', 'crypto', 'viagra', 'http', 'www.', '.com', '.ca', '.net', '@', 'discord', 'whatsapp'];
/** Strip markup/control chars, collapse whitespace, cap length. */
export function cleanText(t) { return String(t ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_AD_CHARS); }
export function moderate(text) {
  const t = cleanText(text);
  if (t.length < 3) return { ok: false, error: 'Write at least 3 characters.' };
  const low = t.toLowerCase().replace(/[^a-z0-9.@]/g, '');
  const hit = BANNED.find((w) => low.includes(w));
  if (hit) return { ok: false, error: 'That text is not allowed on billboards (no links, contact handles, gambling or offensive words).' };
  return { ok: true, text: t };
}
/** The price tier record ('standard' | 'big' | 'landmark') of a board, or null. */
export const tierOf = (boardId) => (own(BOARD_BY_ID, boardId) ? AD_TIERS[BOARD_BY_ID[boardId].adTier] ?? null : null);
/** Cents for a booking after the mayor's signage policy: the tier's 7-day price, pro-rated and marked up for short runs. null if invalid. */
export const adPrice = (boardId, days, state = null) => {
  const t = tierOf(boardId); if (!t || !Number.isInteger(days) || !own(DURATIONS, String(days))) return null;
  return Math.round(t.price * (days / AD_DAYS) * DURATIONS[days] * (state ? policyMult(state, 'ads') : 1));
};
/** The canonical 7-day product price for a board. */
export const weekPrice = (boardId, state = null) => adPrice(boardId, AD_DAYS, state);
/** Share of the board's screen time one booked ad gets (equal rotation across maxRotation slots). */
export const adAirtime = (boardId) => { const t = tierOf(boardId); return t ? 1 / t.maxRotation : 0; };
/** Everything the Ads UI needs to show a board's offer in one object. */
export function adQuote(boardId, state = null) {
  const b = own(BOARD_BY_ID, boardId) ? BOARD_BY_ID[boardId] : null, t = tierOf(boardId); if (!b || !t) return null;
  return { board: b, tier: t, days: AD_DAYS, price: weekPrice(boardId, state), listPrice: t.price, airtime: adAirtime(boardId), maxRotation: t.maxRotation, reach: adReach(boardId, AD_DAYS) };
}
/** Simulated reach (clearly labelled as such in the UI). */
export const adReach = (boardId, days) => { const b = own(BOARD_BY_ID, boardId) ? BOARD_BY_ID[boardId] : null; return b ? Math.round(b.traffic * days) : 0; };
export function activeAd(s, boardId, now) { const a = s.ads?.[boardId]; return a && a.until > now ? a : null; }
export function expireAds(store, now = store.now()) {
  const s = store.state; let n = 0;
  for (const [id, a] of Object.entries(s.ads || {})) if (a.until <= now) { delete s.ads[id]; n++; notify(store, { app: 'ads', title: 'Billboard ended', body: `Your ad on ${BOARD_BY_ID[id]?.name ?? id} has finished.` }); }
  if (n) store.commit('ads'); return n;
}
/** An uploaded creative must be a small JPEG data URL (the UI resizes + re-encodes it); anything else is dropped. */
export const MAX_IMAGE_CHARS = 240000;
export const validImage = (v) => typeof v === 'string' && v.length <= MAX_IMAGE_CHARS && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v);
export function buyAd(store, boardId, days, text, theme = 'prairie', now = store.now(), image = null) {
  const s = store.state, b = own(BOARD_BY_ID, boardId) ? BOARD_BY_ID[boardId] : null;
  if (!b) return { ok: false, error: 'Unknown billboard' };
  const price = adPrice(boardId, days, s); if (price == null) return { ok: false, error: 'Choose 1, 3 or 7 days' };
  if (!THEMES[theme]) return { ok: false, error: 'Unknown colour theme' };
  const m = moderate(text); if (!m.ok) return m;
  if (activeAd(s, boardId, now)) return { ok: false, error: 'This billboard is already booked.' };
  const r = store.ledger.debit(price, `Billboard: ${b.name} (${days}d)`, { category: 'advertising', ref: `ad:${boardId}:${now}` });
  if (!r.ok) return r;
  (s.ads ||= {})[boardId] = { text: m.text, theme, bought: now, until: now + days * DAY_MS, days, paid: price, ...(validImage(image) ? { image } : {}) };
  store.commit('ads'); return { ok: true, price, until: s.ads[boardId].until };
}
export const myAds = (s, now) => Object.entries(s.ads || {}).filter(([, a]) => a.until > now).map(([id, a]) => ({ id, ...a }));
