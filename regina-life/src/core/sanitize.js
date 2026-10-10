/**
 * Defensive normalisation of a loaded save. Old (milestone 1/2) or hand-edited saves must never crash the game, freeze the
 * tab, or smuggle in invalid ids/values. Unknown or malformed entries are dropped; numbers are clamped.
 */
import { FOOD, CLOTHES, STARTER_WARDROBE } from '../data/catalog.js';
import { RES_BY_ID } from '../data/residents.js';
import { DESTINATION_BY_ID } from '../data/destinations.js';
import { FURNITURE, WALLS, FLOORS, MAX_PLACED, MAX_OWNED_EACH, ROOM, isPoster } from '../data/furniture.js';
import { CANDIDATE_BY_ID, POLICIES } from '../data/policies.js';
import { BOARD_BY_ID, THEMES } from '../data/billboards.js';
import { STATION_BY_ID } from '../data/radio.js';
import { MAX_BALANCE } from './ledger.js';
import { MAX_CAMPAIGN_POINTS } from './policy.js';
import { own, clampNum } from './util.js';
import { itemDef, footprint } from './home.js';
import { EVENT_BY_ID } from './events.js';
import { validDaily } from './daily.js';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v, d = '') => (typeof v === 'string' ? v : d);

export function sanitize(s, now = Date.now()) {
  // bank
  s.bank = isObj(s.bank) ? s.bank : { balance: 0, history: [] };
  s.bank.balance = Number.isFinite(s.bank.balance) ? Math.min(MAX_BALANCE, Math.max(0, Math.round(s.bank.balance))) : 0;
  s.bank.history = arr(s.bank.history).filter((h) => isObj(h) && Number.isFinite(h.amount)).slice(0, 200);
  // daily reward streak
  if (!validDaily(s.daily)) s.daily = { last: '', streak: 0 };
  // needs & skills
  s.needs = isObj(s.needs) ? s.needs : {};
  for (const k of ['energy', 'hunger', 'mood', 'hygiene', 'fun']) s.needs[k] = clampNum(s.needs[k], 0, 100, 60);
  s.skills = isObj(s.skills) ? s.skills : {};
  for (const k of ['cooking', 'fitness', 'charisma']) s.skills[k] = clampNum(s.skills[k], 0, 10000, 0);
  // inventory / wardrobe
  const inv = {}; if (isObj(s.inventory)) for (const [k, v] of Object.entries(s.inventory)) if (own(FOOD, k) && Number.isInteger(v) && v > 0) inv[k] = Math.min(v, 99);
  s.inventory = inv;
  s.wardrobe = [...new Set([...STARTER_WARDROBE, ...arr(s.wardrobe).filter((id) => typeof id === 'string' && own(CLOTHES, id))])];
  // friends & partner
  const friends = {};
  if (isObj(s.friends)) for (const [id, f] of Object.entries(s.friends)) if (own(RES_BY_ID, id) && isObj(f))
    friends[id] = { level: clampNum(f.level, 0, 100, 8), since: clampNum(f.since, 0, 4e12, now), last: clampNum(f.last, 0, 4e12, now), lastHang: clampNum(f.lastHang, 0, 4e12, 0), lastGift: clampNum(f.lastGift, 0, 4e12, 0), lastChat: clampNum(f.lastChat, 0, 4e12, 0), hangs: clampNum(f.hangs, 0, 1e6, 0), status: f.status === 'dating' && RES_BY_ID[id].datable ? 'dating' : null };
  s.friends = friends;
  s.partner = typeof s.partner === 'string' && own(friends, s.partner) && friends[s.partner].status === 'dating' ? s.partner : null;
  for (const [id, f] of Object.entries(friends)) if (f.status === 'dating' && id !== s.partner) f.status = null;
  // politics
  const p = s.politics;
  if (!isObj(p) || !Number.isInteger(p.term) || p.term < 1 || !Number.isFinite(p.start)) s.politics = null;
  else {
    const mayorId = isObj(p.mayor) && own(CANDIDATE_BY_ID, p.mayor.id) ? p.mayor.id : 'lafontaine';
    const policy = isObj(p.mayor) && own(POLICIES, p.mayor.policy) ? p.mayor.policy : CANDIDATE_BY_ID[mayorId].policy;
    s.politics = { term: Math.min(p.term, 1e6), start: p.start, vote: typeof p.vote === 'string' && own(CANDIDATE_BY_ID, p.vote) ? p.vote : null, points: clampNum(p.points, 0, MAX_CAMPAIGN_POINTS, 0), lastCanvass: clampNum(p.lastCanvass, 0, 4e12, 0),
      mayor: { id: mayorId, policy, since: clampNum(p.mayor?.since, 0, 4e12, p.start) },
      history: arr(p.history).filter((h) => isObj(h) && own(CANDIDATE_BY_ID, h.winner) && Number.isInteger(h.term) && Array.isArray(h.shares)).slice(0, 8) };
  }
  // trips & souvenirs
  s.trips = arr(s.trips).filter((t) => isObj(t) && own(DESTINATION_BY_ID, t.dest) && own(DESTINATION_BY_ID[t.dest].modes, t.mode) && Number.isFinite(t.t)).slice(0, 30);
  s.souvenirs = [...new Set(arr(s.souvenirs).filter((d) => typeof d === 'string' && own(DESTINATION_BY_ID, d)))];
  // home
  const h = isObj(s.home) ? s.home : {};
  const owned = {}; if (isObj(h.owned)) for (const [k, v] of Object.entries(h.owned)) if (own(FURNITURE, k) && Number.isInteger(v) && v > 0) owned[k] = Math.min(v, MAX_OWNED_EACH);
  const seen = new Set(), placed = [], used = {}, have = (t) => (isPoster(t) ? (s.souvenirs.includes(t.slice(7)) ? 1 : 0) : owned[t] || 0); // you can only place what you own
  for (const it of arr(h.placed)) {
    if (!isObj(it) || typeof it.id !== 'string' || seen.has(it.id) || !itemDef(it.type) || !Number.isInteger(it.rot) || it.rot < 0 || it.rot > 3 || !Number.isFinite(it.x) || !Number.isFinite(it.z)) continue;
    if ((used[it.type] || 0) >= have(it.type)) continue;
    const f = footprint(it.type, it.rot);
    if (it.x - f.w / 2 < ROOM.x0 - 1e-6 || it.x + f.w / 2 > ROOM.x1 + 1e-6 || it.z - f.d / 2 < ROOM.z0 - 1e-6 || it.z + f.d / 2 > ROOM.z1 + 1e-6) continue;
    seen.add(it.id); used[it.type] = (used[it.type] || 0) + 1; placed.push({ id: it.id, type: it.type, x: it.x, z: it.z, rot: it.rot }); if (placed.length >= MAX_PLACED) break;
  }
  const wall = typeof h.wall === 'string' && own(WALLS, h.wall) ? h.wall : 'cream', floor = typeof h.floor === 'string' && own(FLOORS, h.floor) ? h.floor : 'oak';
  s.home = { owned, placed, wall, floor,
    walls: [...new Set(['cream', wall, ...arr(h.walls).filter((k) => typeof k === 'string' && own(WALLS, k))])], floors: [...new Set(['oak', floor, ...arr(h.floors).filter((k) => typeof k === 'string' && own(FLOORS, k))])] };
  // radio, ads, events, flags, misc
  const r = isObj(s.radio) ? s.radio : {}; s.radio = { station: null, volume: clampNum(r.volume, 0, 1, 0.7) }; if (typeof r.station === 'string' && own(STATION_BY_ID, r.station)) s.radio.last = r.station;
  const ads = {}; if (isObj(s.ads)) for (const [id, a] of Object.entries(s.ads)) if (own(BOARD_BY_ID, id) && isObj(a) && Number.isFinite(a.until)) ads[id] = { text: str(a.text).slice(0, 40), theme: typeof a.theme === 'string' && own(THEMES, a.theme) ? a.theme : 'prairie', bought: clampNum(a.bought, 0, 4e12, 0), until: a.until, days: clampNum(a.days, 1, 7, 1), paid: clampNum(a.paid, 0, 1e9, 0), ...(typeof a.image === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(a.image) && a.image.length <= 240000 ? { image: a.image } : {}) };
  s.ads = ads;
  s.eventLog = arr(s.eventLog).filter((x) => typeof x === 'string').slice(0, 12);
  s.pendingEvent = isObj(s.pendingEvent) && typeof s.pendingEvent.id === 'string' && own(EVENT_BY_ID, s.pendingEvent.id) && Number.isFinite(s.pendingEvent.at) ? { id: s.pendingEvent.id, at: s.pendingEvent.at } : null;
  s.flags = isObj(s.flags) ? s.flags : {};
  s.photos = arr(s.photos).filter((p) => isObj(p) && typeof p.data === 'string' && p.data.startsWith('data:image/')).slice(0, 12);
  s.notifications = arr(s.notifications).filter(isObj).slice(0, 40);
  s.messages = isObj(s.messages) ? Object.fromEntries(Object.entries(s.messages).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.filter(isObj).slice(-300)])) : {};
  s.unread = isObj(s.unread) ? s.unread : {};
  s.calendar = arr(s.calendar).filter(isObj).slice(0, 200);
  return s;
}
