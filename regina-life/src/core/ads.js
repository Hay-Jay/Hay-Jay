/**
 * Billboard advertising — VIRTUAL CURRENCY ONLY.
 * A real-money advertising path would need legal terms, moderation tooling and payment infrastructure, so it is
 * deliberately absent; nothing here can charge real money.
 */
import { BOARD_BY_ID, DAY_PRICE, DURATIONS, THEMES } from '../data/billboards.js';
import { notify } from './game.js';

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
export const adPrice = (boardId, days) => { const b = BOARD_BY_ID[boardId]; if (!b || !DURATIONS[days]) return null; return Math.round(DAY_PRICE[b.tier] * days * DURATIONS[days]); };
/** Simulated reach (clearly labelled as such in the UI). */
export const adReach = (boardId, days) => { const b = BOARD_BY_ID[boardId]; return b ? Math.round(b.traffic * days) : 0; };
export function activeAd(s, boardId, now) { const a = s.ads?.[boardId]; return a && a.until > now ? a : null; }
export function expireAds(store, now = store.now()) {
  const s = store.state; let n = 0;
  for (const [id, a] of Object.entries(s.ads || {})) if (a.until <= now) { delete s.ads[id]; n++; notify(store, { app: 'ads', title: 'Billboard ended', body: `Your ad on ${BOARD_BY_ID[id]?.name ?? id} has finished.` }); }
  if (n) store.commit('ads'); return n;
}
export function buyAd(store, boardId, days, text, theme = 'prairie', now = store.now()) {
  const s = store.state, b = BOARD_BY_ID[boardId];
  if (!b) return { ok: false, error: 'Unknown billboard' };
  const price = adPrice(boardId, days); if (price == null) return { ok: false, error: 'Choose 1, 3 or 7 days' };
  if (!THEMES[theme]) return { ok: false, error: 'Unknown colour theme' };
  const m = moderate(text); if (!m.ok) return m;
  if (activeAd(s, boardId, now)) return { ok: false, error: 'This billboard is already booked.' };
  const r = store.ledger.debit(price, `Billboard: ${b.name} (${days}d)`, { category: 'advertising', ref: `ad:${boardId}:${now}` });
  if (!r.ok) return r;
  (s.ads ||= {})[boardId] = { text: m.text, theme, bought: now, until: now + days * DAY_MS, days, paid: price };
  store.commit('ads'); return { ok: true, price, until: s.ads[boardId].until };
}
export const myAds = (s, now) => Object.entries(s.ads || {}).filter(([, a]) => a.until > now).map(([id, a]) => ({ id, ...a }));
