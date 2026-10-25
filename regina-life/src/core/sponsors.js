/**
 * Sponsored billboard rows and the Supporters' Mural (data/sponsors.js), validated before anything reaches the screen. Pure, so it is tested and can
 * move to a server unchanged. A sponsored ad is a real business's message with a real link: it is always labelled "Sponsored", always opens through
 * the leaving-the-game screen, and never touches a player's Prairie Dollars.
 */
import { BOARD_BY_ID, THEMES } from '../data/billboards.js';
import { SPONSORED, SUPPORTERS } from '../data/sponsors.js';
import { dayKey } from './daily.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A link a player may be sent to: https, a real host name (no IP address, no credentials, no port tricks), at most 200 characters. */
export function safeUrl(u) {
  if (typeof u !== 'string' || u.length > 200) return null;
  let url; try { url = new URL(u); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
  const host = url.hostname.toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || /^\d+(\.\d+){3}$/.test(host) || host.endsWith('.local') || host === 'localhost') return null;
  return { href: url.href, host: host.replace(/^www\./, '') };
}
/** One booked row, checked; null if anything is off. */
export function validSponsor(r) {
  if (!r || typeof r !== 'object') return null;
  if (typeof r.id !== 'string' || !/^[a-z0-9_-]{1,32}$/i.test(r.id)) return null;
  if (typeof r.board !== 'string' || !own(BOARD_BY_ID, r.board)) return null;
  if (typeof r.business !== 'string' || !r.business.trim() || r.business.length > 60) return null;
  if (typeof r.text !== 'string' || !r.text.trim() || r.text.length > 40) return null;
  if (!DAY.test(r.from ?? '') || !DAY.test(r.to ?? '') || r.to < r.from) return null;
  const link = safeUrl(r.url); if (!link) return null;
  return { id: r.id, board: r.board, business: r.business.trim(), text: r.text.trim(), url: link.href, host: link.host, theme: typeof r.theme === 'string' && own(THEMES, r.theme) ? r.theme : 'prairie', from: r.from, to: r.to, founding: r.founding === true };
}
/** The sponsored ads on air for a board on the Regina day of `now` (oldest booking first). */
export function sponsoredFor(boardId, now = Date.now(), rows = SPONSORED) {
  const d = dayKey(now);
  return rows.map(validSponsor).filter((r) => r && r.board === boardId && r.from <= d && d <= r.to).map((r) => ({ ...r, sponsored: true }));
}
/** The mural's names: trimmed, de-duplicated, at most 40 characters each and 500 names. */
export function muralNames(rows = SUPPORTERS) {
  const seen = new Set(), out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const n = typeof r?.name === 'string' ? r.name.replace(/\s+/g, ' ').trim().slice(0, 40) : ''; if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase()); out.push({ name: n, since: typeof r.since === 'string' && /^\d{4}-\d{2}$/.test(r.since) ? r.since : null });
    if (out.length >= 500) break;
  }
  return out;
}
