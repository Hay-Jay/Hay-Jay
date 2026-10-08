/** Friendships & relationships with Regina residents (all NPCs). Pure rules over a Store. */
import { RES_BY_ID, findResident, searchResidents } from '../data/residents.js';
import { addSkill, notify, receiveMessage } from './game.js';
import { fmtMoney } from './ledger.js';
import { own } from './util.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const MAX_FRIENDS = 12;
/** One shared threshold: you can ask someone on a date once you are Good friends. */
export const DATE_LEVEL = 60;
export const relName = (v) => (v >= 85 ? 'Best friend' : v >= DATE_LEVEL ? 'Good friend' : v >= 25 ? 'Friend' : 'Acquaintance');
const fr = (s, id) => (own(s.friends, id) ? s.friends[id] : null);
const resOf = (id) => (own(RES_BY_ID, id) ? RES_BY_ID[id] : null);
export const HANGOUTS = {
  coffee: { label: 'Grab a coffee', icon: '☕', cost: 600, rel: 6, needs: { fun: 10, mood: 6, energy: 6 }, say: 'You sip double-doubles and watch the snow fall sideways.' },
  walk:   { label: 'Walk around Wascana', icon: '🦆', cost: 0, rel: 5, needs: { fun: 8, mood: 6, energy: -5 }, say: 'You circle the lake, arguing about which goose is the leader.' },
  gym:    { label: 'Work out together', icon: '🏋️', cost: 0, rel: 5, needs: { fun: 6, energy: -10, hygiene: -8 }, skill: ['fitness', 8], minEnergy: 25, say: 'Spotting each other. Mostly talking. A little lifting.' },
  movie:  { label: 'Catch a movie', icon: '🎬', cost: 1800, rel: 8, needs: { fun: 22, mood: 8 }, say: 'Popcorn, trailers, and one very loud person two rows back.' },
  dinner: { label: 'Date-night dinner', icon: '🕯️', cost: 4500, rel: 10, needs: { fun: 16, mood: 14, hunger: 30 }, datingOnly: true, say: 'Candlelight, a window table and way too many appetizers.' },
};
export const HANGOUT_COOLDOWN_MS = 45_000, GIFT_COOLDOWN_MS = 120_000, PING_COOLDOWN_MS = 240_000;
const ensure = (s) => { s.friends ||= {}; return s.friends; };
export const friendIds = (s) => Object.keys(s.friends || {});

export { searchResidents };
export function addFriend(store, key, now = store.now()) {
  const s = store.state, res = findResident(key); if (!res) return { ok: false, error: 'No resident with that @username' };
  const f = ensure(s); if (own(f, res.id)) return { ok: false, error: `You and ${res.name} are already friends` };
  if (Object.keys(f).length >= MAX_FRIENDS) return { ok: false, error: 'Your friends list is full' };
  f[res.id] = { level: 8, since: now, last: now, lastHang: 0, lastGift: 0, lastChat: 0, status: null };
  receiveMessage(store, res.id, `Hi! It's ${res.name.split(' ')[0]}. ${res.lines[0]}`, 1200);
  notify(store, { app: 'social', title: 'New friend', body: `${res.name} ${res.handle} accepted your request.` });
  store.commit('friends'); return { ok: true, res };
}
function gain(store, id, amount, now) {
  const f = store.state.friends[id], before = f.level; f.level = clamp(f.level + amount * (1 - f.level / 160)); f.last = now;
  const nb = relName(before), na = relName(f.level);
  if (na !== nb) notify(store, { app: 'social', title: `${RES_BY_ID[id].name}: ${na}!`, body: `Your friendship has grown.` });
  return f.level;
}
export function hangoutBlocked(store, id, kind, now = store.now()) {
  const s = store.state, f = fr(s, id), h = own(HANGOUTS, kind) ? HANGOUTS[kind] : null;
  if (!f || !resOf(id)) return 'Not your friend yet'; if (!h) return 'Unknown activity';
  if (h.datingOnly && f.status !== 'dating') return 'Only for people you are dating';
  if (now - f.lastHang < HANGOUT_COOLDOWN_MS) return `Give ${RES_BY_ID[id].name.split(' ')[0]} a minute — you just hung out.`;
  if (h.minEnergy && s.needs.energy < h.minEnergy) return "You're too tired for that.";
  if (h.cost && store.ledger.balance < h.cost) return `You need ${fmtMoney(h.cost)}.`;
  return null;
}
export function hangout(store, id, kind, now = store.now()) {
  const bad = hangoutBlocked(store, id, kind, now); if (bad) return { ok: false, error: bad };
  const s = store.state, h = HANGOUTS[kind], res = RES_BY_ID[id];
  if (h.cost) { const r = store.ledger.debit(h.cost, `${h.label} with ${res.name.split(' ')[0]}`, { category: 'purchase' }); if (!r.ok) return r; }
  for (const [k, v] of Object.entries(h.needs)) s.needs[k] = clamp((s.needs[k] ?? 50) + v);
  const f = s.friends[id]; f.lastHang = now; f.hangs = (f.hangs || 0) + 1;
  if (h.skill) addSkill(store, h.skill[0], h.skill[1]); addSkill(store, 'charisma', 2);
  const level = gain(store, id, h.rel + (f.status === 'dating' ? 2 : 0), now);
  store.commit('needs'); return { ok: true, level, say: h.say };
}
export function giftBlocked(store, id, itemId, now = store.now()) {
  const s = store.state, f = fr(s, id); if (!f || !resOf(id)) return 'Not your friend yet';
  if (!own(s.inventory, itemId) || !(s.inventory[itemId] > 0)) return "You don't have that.";
  if (now - f.lastGift < GIFT_COOLDOWN_MS) return 'You already gave a gift recently.';
  return null;
}
export function gift(store, id, itemId, now = store.now()) {
  const bad = giftBlocked(store, id, itemId, now); if (bad) return { ok: false, error: bad };
  const s = store.state, res = RES_BY_ID[id], loved = res.likes.includes(itemId);
  s.inventory[itemId]--; if (!s.inventory[itemId]) delete s.inventory[itemId];
  s.friends[id].lastGift = now; const level = gain(store, id, loved ? 9 : 3, now);
  receiveMessage(store, id, loved ? `${res.emoji} No way — my FAVOURITE. Thank you!!` : `${res.emoji} Aw, thanks! That's thoughtful.`, 1500);
  store.commit('inventory'); return { ok: true, loved, level };
}
/** Texting a friend slowly builds the bond (rate-limited so spamming does nothing). */
export function chat(store, id, now = store.now()) {
  const f = fr(store.state, id); if (!f || now - f.lastChat < 30_000) return false;
  f.lastChat = now; gain(store, id, 1, now); return true;
}
export function askOut(store, id, now = store.now()) {
  const s = store.state, f = fr(s, id), res = resOf(id); if (!f || !res) return { ok: false, error: 'Not your friend yet' };
  if (!res.datable) return { ok: false, error: `${res.name.split(' ')[0]} says they value your friendship too much to complicate it.` };
  if (s.partner) return { ok: false, error: s.partner === id ? 'You are already together.' : 'You are already seeing someone.' };
  if (f.level < DATE_LEVEL) return { ok: false, error: `Not yet — you need to be Good friends first (${Math.floor(f.level)}/${DATE_LEVEL}).` };
  f.status = 'dating'; s.partner = id; gain(store, id, 6, now);
  receiveMessage(store, id, `${res.emoji} Yes. I'd love that. 💛`, 1000); store.commit('friends'); return { ok: true };
}
export function breakUp(store, id) {
  const s = store.state, f = fr(s, id); if (!f || s.partner !== id) return { ok: false, error: 'You are not together' };
  f.status = null; s.partner = null; f.level = clamp(f.level - 25); s.needs.mood = clamp(s.needs.mood - 15);
  store.commit('friends'); return { ok: true };
}
/** Friendships fade if you ignore people. Call every second with dtSec. */
export function decaySocial(store, dtSec, now = store.now()) {
  for (const f of Object.values(store.state.friends || {})) if (now - f.last > 600_000) f.level = clamp(f.level - dtSec * 0.004);
}
/** Friends occasionally text first. */
export function maybePing(store, rnd = Math.random, now = store.now()) {
  const s = store.state, ids = friendIds(s); if (!ids.length || s.phone.airplane) return null;
  const fl = (s.flags ||= {}); if (now - (fl.pingAt || 0) < PING_COOLDOWN_MS) return null;
  const id = ids[Math.floor(rnd() * ids.length)], res = RES_BY_ID[id];
  const asks = ['Coffee later?', 'Wanna walk around Wascana?', 'Gym session tomorrow?', 'Movie night — you in?', 'Just checking in. How are you holding up?'];
  fl.pingAt = now; receiveMessage(store, id, `${res.emoji} ${asks[Math.floor(rnd() * asks.length)]}`); return id;
}
