/** Game-rule operations (shopping, wardrobe, jobs, needs, messaging). Pure over a Store → unit-testable. */
import { FOOD, CLOTHES, ITEM_NAME, ITEM_PRICE, SLOT_KEY } from '../data/catalog.js';
import { JOBS, XP_PER_TASK, MIN_SECONDS_PER_TASK } from '../data/jobs.js';
import { CONTACTS, npcReply } from '../data/contacts.js';
import { fmtMoney } from './ledger.js';
import { policyMult } from './policy.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
let _id = 0;
const uid = (p) => `${p}_${Date.now().toString(36)}_${(_id++).toString(36)}`;

export function notify(store, { app, title, body, silent = false }) {
  const s = store.state;
  const n = { id: uid('n'), app, title, body, t: store.now() };
  s.notifications.unshift(n);
  if (s.notifications.length > 40) s.notifications.length = 40;
  store.commit(silent ? 'notify-silent' : 'notify');
  return n;
}

/* ---------- shopping ---------- */
/** Catalog price after the mayor's policy (never trusted from the UI). */
export function priceFor(store, itemId) {
  const base = ITEM_PRICE(itemId); if (base == null) return null;
  return Math.round(base * policyMult(store.state, CLOTHES[itemId] ? 'clothing' : 'groceries'));
}
export function buyItem(store, itemId, qty = 1, where = 'Store') {
  const price = priceFor(store, itemId);          // price comes from the catalog, never from the caller
  if (price == null) return { ok: false, error: 'Unknown item' };
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) return { ok: false, error: 'Invalid quantity' };
  const isClothing = !!CLOTHES[itemId];
  if (isClothing && store.state.wardrobe.includes(itemId)) return { ok: false, error: 'Already owned' };
  if (isClothing) qty = 1;
  const r = store.ledger.debit(price * qty, `${where}: ${ITEM_NAME(itemId)}${qty > 1 ? ` ×${qty}` : ''}`, { category: isClothing ? 'clothing' : 'groceries' });
  if (!r.ok) return r;
  if (isClothing) store.state.wardrobe.push(itemId);
  else store.state.inventory[itemId] = (store.state.inventory[itemId] || 0) + qty;
  store.commit('inventory');
  return { ok: true, tx: r.tx };
}

export function consume(store, itemId) {
  const s = store.state, f = FOOD[itemId];
  if (!f || !(s.inventory[itemId] > 0)) return { ok: false, error: 'You do not have that' };
  s.inventory[itemId]--; if (!s.inventory[itemId]) delete s.inventory[itemId];
  s.needs.hunger = clamp(s.needs.hunger + f.hunger);
  s.needs.energy = clamp(s.needs.energy + f.energy);
  s.needs.mood = clamp(s.needs.mood + 3);
  store.commit('needs');
  return { ok: true, food: f };
}

export function equip(store, itemId) {
  const c = CLOTHES[itemId], s = store.state;
  if (!c) return { ok: false, error: 'Unknown item' };
  if (!s.wardrobe.includes(itemId)) return { ok: false, error: 'You do not own this' };
  s.player.look[SLOT_KEY[c.slot]] = itemId;
  store.commit('look');
  return { ok: true };
}

/* ---------- transfers ---------- */
export function transferTo(store, contactId, cents) {
  const c = CONTACTS[contactId];
  if (!c || c.kind !== 'person') return { ok: false, error: 'You can only send money to people' };
  const r = store.ledger.debit(cents, `Sent to ${c.name}`, { category: 'transfer' });
  if (r.ok) { receiveMessage(store, contactId, `Got your ${fmtMoney(cents)} — thank you! 💸`, 1500); store.commit('bank'); }
  return r;
}

/* ---------- messaging ---------- */
export function sendMessage(store, contactId, text, { reply = true } = {}) {
  text = String(text || '').trim().slice(0, 300);
  if (!text || !CONTACTS[contactId]) return false;
  const s = store.state;
  (s.messages[contactId] ||= []).push({ from: 'me', text, t: store.now() });
  store.commit('messages');
  if (reply && !s.phone.airplane && CONTACTS[contactId].kind === 'person') receiveMessage(store, contactId, npcReply(contactId, text, s.friends?.[contactId]?.level ?? 0), 1800 + Math.random() * 1500);
  else if (reply && !s.phone.airplane) receiveMessage(store, contactId, npcReply(contactId, text), 1500);
  return true;
}
export function receiveMessage(store, contactId, text, delayMs = 0) {
  const push = () => {
    const s = store.state;
    if (s.phone.airplane) { (s.pending ||= []).push({ contactId, text }); store.commit('messages'); return; } // delivered when airplane mode ends
    (s.messages[contactId] ||= []).push({ from: contactId, text, t: store.now() });
    s.unread[contactId] = (s.unread[contactId] || 0) + 1;
    notify(store, { app: 'messages', title: CONTACTS[contactId].name, body: text });
  };
  if (delayMs > 0) setTimeout(push, delayMs); else push();
}
/** Deliver messages that arrived while airplane mode was on. */
export function flushPending(store) {
  const s = store.state, q = s.pending || []; s.pending = [];
  for (const m of q) receiveMessage(store, m.contactId, m.text, 0);
}
export const unreadTotal = (s) => Object.values(s.unread).reduce((a, b) => a + b, 0);

/* ---------- jobs ---------- */
export const currentLevel = (job) => JOBS[job.id].levels[job.level];

export function applyForJob(store, jobId) {
  const s = store.state, def = JOBS[jobId];
  if (!def) return { ok: false, error: 'Unknown job' };
  if (s.job.active) return { ok: false, error: 'You already have a job. Quit first.' };
  if (s.job.application && s.job.application.status === 'pending') return { ok: false, error: 'You already have a pending application' };
  s.job.application = { id: jobId, at: store.now(), offerAt: store.now() + def.applyDelay * 1000, status: 'pending' };
  receiveMessage(store, def.contact, `Thanks for applying for ${def.title}! We're reviewing your application.`, 800);
  store.commit('jobs');
  return { ok: true };
}
/** Called every second from the game loop. Moves pending applications to offers. */
export function tickJobs(store) {
  const a = store.state.job.application;
  if (a && a.status === 'pending' && store.now() >= a.offerAt) {
    a.status = 'offered';
    const def = JOBS[a.id];
    receiveMessage(store, def.contact, `Good news — we'd like to offer you the ${def.title} role at ${fmtMoney(def.levels[0].wage)} per shift. Accept in the Jobs app!`);
    store.commit('jobs');
  }
}
export function acceptOffer(store) {
  const s = store.state, a = s.job.application;
  if (!a || a.status !== 'offered') return { ok: false, error: 'No offer to accept' };
  s.job.active = { id: a.id, level: 0, xp: 0, shifts: 0, since: store.now() };
  s.job.application = null;
  store.commit('jobs');
  return { ok: true };
}
export function declineOffer(store) { store.state.job.application = null; store.commit('jobs'); }
export function quitJob(store) { store.state.job.active = null; store.state.job.shift = null; store.commit('jobs'); return { ok: true }; }

export function startShift(store) {
  const s = store.state, j = s.job.active;
  if (!j) return { ok: false, error: 'You do not have a job' };
  if (s.job.shift) return { ok: false, error: 'Shift already in progress' };
  if (s.needs.energy < 15) return { ok: false, error: 'You are too tired to work. Get some sleep or a coffee.' };
  s.job.shift = { id: j.id, startedAt: store.now(), tasksDone: 0, tasksTotal: currentLevel(j).tasks };
  store.commit('jobs');
  return { ok: true, shift: s.job.shift };
}
export function completeTask(store) {
  const sh = store.state.job.shift;
  if (!sh) return { ok: false };
  if (sh.tasksDone < sh.tasksTotal) sh.tasksDone++;
  store.state.needs.energy = clamp(store.state.needs.energy - 2);
  store.commit('jobs');
  return { ok: true, done: sh.tasksDone, total: sh.tasksTotal };
}
/** Pays out only if every task was done AND the shift lasted long enough. Validated here, not in UI. */
export function finishShift(store) {
  const s = store.state, sh = s.job.shift, j = s.job.active;
  if (!sh || !j) return { ok: false, error: 'No shift in progress' };
  if (sh.tasksDone < sh.tasksTotal) return { ok: false, error: 'Tasks remaining' };
  const elapsed = (store.now() - sh.startedAt) / 1000;
  if (elapsed < sh.tasksTotal * MIN_SECONDS_PER_TASK) return { ok: false, error: 'Shift finished suspiciously fast — payout withheld' };
  const lvl = currentLevel(j), wage = Math.round(lvl.wage * policyMult(s, 'wages'));
  const pay = store.ledger.credit(wage, `Payroll: ${JOBS[j.id].employer}`, { category: 'income', ref: `shift:${sh.startedAt}` });
  if (!pay.ok) return pay;
  j.xp += XP_PER_TASK * sh.tasksTotal; j.shifts++;
  s.job.shift = null;
  let promoted = null;
  const next = JOBS[j.id].levels[j.level + 1];
  if (next && j.xp >= next.xpNeeded) { j.level++; promoted = next.name; receiveMessage(store, JOBS[j.id].contact, `Congratulations! You've been promoted to ${promoted}. 🎉`, 1200); }
  s.needs.mood = clamp(s.needs.mood + 6);
  store.commit('jobs');
  return { ok: true, pay: wage, promoted };
}
export function abandonShift(store) { store.state.job.shift = null; store.commit('jobs'); }

/* ---------- needs ---------- */
export const SKILLS = {
  cooking:  { name: 'Cooking',  icon: '🍳', blurb: 'Better meals fill you up more.' },
  fitness:  { name: 'Fitness',  icon: '💪', blurb: 'You tire more slowly.' },
  charisma: { name: 'Charisma', icon: '🗣️', blurb: 'Locals warm to you; better event outcomes.' },
};
/** Level from XP: 0,20,60,120,200,300… (triangular), max 10. */
export const skillLevel = (xp) => Math.min(10, Math.floor((Math.sqrt(1 + (8 * xp) / 20) - 1) / 2));
export function addSkill(store, name, xp) {
  const s = store.state; if (!SKILLS[name] || !(xp > 0)) return null;
  s.skills ||= {}; const before = skillLevel(s.skills[name] || 0);
  s.skills[name] = Math.min(10000, (s.skills[name] || 0) + xp);
  const after = skillLevel(s.skills[name]);
  if (after > before) notify(store, { app: 'life', title: `${SKILLS[name].icon} ${SKILLS[name].name} level ${after}!`, body: SKILLS[name].blurb });
  store.commit('skills'); return after > before ? after : null;
}
export const moodWord = (n) => { const avg = (n.energy + n.hunger + n.hygiene + n.fun + n.mood) / 5; return avg > 80 ? 'Thriving' : avg > 62 ? 'Content' : avg > 42 ? 'Meh' : avg > 25 ? 'Struggling' : 'Miserable'; };

export function tickNeeds(store, dtSec) {
  const n = store.state.needs, fit = skillLevel(store.state.skills?.fitness || 0);
  n.hygiene ??= 80; n.fun ??= 65;
  n.hunger = clamp(n.hunger - dtSec * 0.045);
  n.energy = clamp(n.energy - dtSec * 0.028 * (1 - Math.min(0.4, fit * 0.04)));
  n.hygiene = clamp(n.hygiene - dtSec * 0.03);
  n.fun = clamp(n.fun - dtSec * 0.035);
  const low = [n.hunger, n.energy, n.hygiene, n.fun].filter((v) => v < 15).length;
  if (low) n.mood = clamp(n.mood - dtSec * 0.05 * low);
  else n.mood = clamp(n.mood + dtSec * 0.005, 0, 100);
  const p = store.state.phone;
  p.battery = clamp(p.battery - dtSec * (p.flashlight ? 0.02 : 0.004), 1, 100);
}
export function sleep(store) {
  const n = store.state.needs;
  if (n.energy > 85) return { ok: false, error: "You're not tired right now." };
  n.energy = 100; n.hunger = clamp(n.hunger - 10); n.mood = clamp(n.mood + 8); n.hygiene = clamp((n.hygiene ?? 70) - 8);
  store.commit('needs');
  return { ok: true };
}

/* ---------- cooking ---------- */
export const RECIPES = [
  { id: 'apple_toast',  name: 'Apple Toast',    icon: '🍞', needs: { bread: 1, apple: 1 },    hunger: 42, energy: 6, mood: 6 },
  { id: 'deli_plate',   name: 'Deli Plate',     icon: '🥪', needs: { sandwich: 1, chips: 1 }, hunger: 55, energy: 8, mood: 8 },
  { id: 'bannock_milk', name: 'Bannock & Milk', icon: '🫓', needs: { bannock: 1, milk: 1 },   hunger: 48, energy: 9, mood: 9 },
];
export function cook(store, recipeId) {
  const r = RECIPES.find((x) => x.id === recipeId), s = store.state;
  if (!r) return { ok: false, error: 'Unknown recipe' };
  for (const [id, n] of Object.entries(r.needs)) if ((s.inventory[id] || 0) < n) return { ok: false, error: `Missing ingredients: ${FOOD[id].name}` };
  for (const [id, n] of Object.entries(r.needs)) { s.inventory[id] -= n; if (!s.inventory[id]) delete s.inventory[id]; }
  const bonus = 1 + skillLevel(s.skills?.cooking || 0) * 0.06;
  s.needs.hunger = clamp(s.needs.hunger + Math.round(r.hunger * bonus)); s.needs.energy = clamp(s.needs.energy + r.energy); s.needs.mood = clamp(s.needs.mood + r.mood);
  s.needs.fun = clamp((s.needs.fun ?? 60) + 6);
  store.commit('needs'); addSkill(store, 'cooking', 8);
  return { ok: true, recipe: r };
}

/* ---------- activities (Sims-style: do a thing, change needs, grow skills) ---------- */
export const ACTIVITIES = {
  shower:  { label: 'Taking a shower…',  secs: 3, needs: { hygiene: 100, mood: 4 } },
  tv:      { label: 'Watching TV…',      secs: 4, needs: { fun: 22, energy: -2 } },
  read:    { label: 'Reading…',          secs: 4, needs: { fun: 14, mood: 3 }, skill: ['charisma', 3] },
  treadmill:{ label: 'Running on the treadmill…', secs: 5, needs: { energy: -12, hunger: -5, hygiene: -10, fun: 10, mood: 4 }, skill: ['fitness', 10], minEnergy: 20 },
  weights: { label: 'Lifting weights…',  secs: 5, needs: { energy: -14, hunger: -6, hygiene: -9, fun: 8 }, skill: ['fitness', 12], minEnergy: 25 },
  yoga:    { label: 'Stretching on the mat…', secs: 4, needs: { energy: -4, hygiene: -3, fun: 8, mood: 8 }, skill: ['fitness', 5] },
  canvass: { label: 'Handing out flyers…', secs: 6, needs: { energy: -8, hygiene: -4, fun: 4, mood: 2 }, skill: ['charisma', 6], minEnergy: 20 },
  water:   { label: 'Having a drink of water…', secs: 2, needs: { energy: 3, hunger: 1 } },
};
/** Pre-check so the UI can refuse before starting a progress bar. */
export function activityBlocked(store, id) { const a = ACTIVITIES[id]; if (!a) return 'Unknown activity'; if (a.minEnergy && store.state.needs.energy < a.minEnergy) return "You're too tired for that. Rest or grab a coffee."; return null; }
/** Apply an activity's effects (called when its progress bar completes). Validates energy so you can't train while exhausted. */
export function doActivity(store, id) {
  const a = ACTIVITIES[id], n = store.state.needs; if (!a) return { ok: false, error: 'Unknown activity' };
  if (a.minEnergy && n.energy < a.minEnergy) return { ok: false, error: "You're too tired for that. Rest or grab a coffee." };
  for (const [k, v] of Object.entries(a.needs)) n[k] = clamp((n[k] ?? 50) + v);
  if (a.skill) addSkill(store, a.skill[0], a.skill[1] * (a.skill[0] === 'fitness' ? policyMult(store.state, 'fitness') : 1));
  store.commit('needs'); return { ok: true, activity: a };
}
