/**
 * Life events — short Prairie scenarios with choices (a staple of the genre: "a customer wants a refund with no
 * receipt…"). Pure rules: the UI only shows an event and reports which choice was picked; effects are applied and
 * validated here (e.g. you cannot pick a choice you can't afford).
 *
 * Effect keys: money (cents, ±), energy/hunger/hygiene/fun/mood (points), jobXp, skill:{name:xp}
 */
import { addSkill, skillLevel, notify } from './game.js';
import { fmtMoney } from './ledger.js';

const clamp = (v) => Math.max(0, Math.min(100, v));

/** where: 'street' | 'home' | 'shift:retail' | 'shift:stylist' — cond is optional extra filter on {temp, night, season, kind}. */
export const EVENTS = [
  { id: 'snowbank', where: ['street'], cond: (c) => c.temp <= -3, icon: '🚗', title: 'Stuck in a snowbank',
    text: "A driver's wheels are spinning in a snowbank on the corner. They wave at you. Classic Regina January.",
    choices: [
      { label: 'Help push', fx: { energy: -8, mood: 6, money: 2000, skill: { charisma: 4 } }, result: 'The car pops free. "Thanks, bud!" — they hand you a twenty for coffee.' },
      { label: 'Call it in and keep walking', fx: { mood: -1, skill: { charisma: 1 } }, result: 'You phone it in and keep your boots dry.' },
    ] },
  { id: 'rider_pride', where: ['street'], icon: '💚', title: 'Rider Pride',
    text: 'A fan in a green jersey spots you. "ROUGHRIDER COUNTRY, EH?! Chant with me!"',
    choices: [
      { label: 'Join the chant', fx: { fun: 14, mood: 8, energy: -2, skill: { charisma: 3 } }, result: 'You both shout until a pigeon leaves. Great vibes.' },
      { label: 'Smile and walk on', fx: { skill: { charisma: 1 } }, result: 'You nod politely. "Next year!" they shout.' },
    ] },
  { id: 'toque', where: ['street'], cond: (c) => c.temp <= 5, icon: '🧣', title: 'Lost toque',
    text: 'There is a perfectly good toque on a bench. Somebody is going to be cold.',
    choices: [
      { label: 'Hang it on a fence post', fx: { mood: 5, skill: { charisma: 3 } }, result: 'The owner will find it. Karma +1.' },
      { label: 'Keep it', fx: { mood: 2, skill: {} }, result: "It's a bit itchy. You feel slightly guilty.", flag: 'tookToque' },
    ] },
  { id: 'busker', where: ['street'], icon: '🎷', title: 'Busker on the corner',
    text: 'A busker is playing a surprisingly good sax solo to nobody.',
    choices: [
      { label: 'Toss in $3', cost: 300, fx: { money: -300, fun: 12, mood: 6, skill: { charisma: 3 } }, result: 'The busker tips an imaginary hat. 🎷' },
      { label: 'Stop and listen', fx: { fun: 10, mood: 4 }, result: 'Ten free minutes of jazz.' },
      { label: 'Keep walking', fx: {}, result: 'Maybe next time.' },
    ] },
  { id: 'sunset', where: ['street'], cond: (c) => c.night < 0.5 && c.night > 0.05, icon: '🌅', title: 'The sky is on fire',
    text: 'The sky over Wascana has gone full orange and pink. Living Skies, as advertised.',
    choices: [
      { label: 'Stop and take it in', fx: { mood: 12, fun: 10 }, result: 'You forget your phone for a whole minute.' },
      { label: 'Take a photo for the group chat', fx: { mood: 6, fun: 4, skill: { charisma: 2 } }, result: 'Dani replies with six fire emojis.' },
    ] },
  { id: 'wind', where: ['street'], cond: (c) => c.temp <= -15, icon: '🥶', title: 'Wind chill warning',
    text: "It's so cold your eyelashes are freezing together. A shop door is right there.",
    choices: [
      { label: 'Duck inside for a hot chocolate ($4)', cost: 400, fx: { money: -400, energy: 6, mood: 6, hunger: 4 }, result: 'Warm hands. Warm heart.' },
      { label: 'Tough it out', fx: { energy: -8, mood: -6, skill: { fitness: 3 } }, result: 'You are now 14% more Saskatchewan.' },
    ] },
  { id: 'mosquito', where: ['street'], cond: (c) => c.season === 'summer' && c.night > 0.4, icon: '🦟', title: 'Mosquito season',
    text: 'A cloud of mosquitoes has chosen you as tonight\'s main course.',
    choices: [
      { label: 'Sprint to the next streetlight', fx: { energy: -6, fun: 3, skill: { fitness: 4 } }, result: 'You outrun most of them. Mostly.' },
      { label: 'Swat dramatically', fx: { mood: -4, hygiene: -3 }, result: 'Bad idea. The mosquitoes win.' },
    ] },
  { id: 'directions', where: ['street'], icon: '🧭', title: 'Lost visitor',
    text: '"Sorry, eh — can you point me to the Legislative Building? Everything looks flat from here."',
    choices: [
      { label: 'Walk them to Albert Street', fx: { energy: -3, mood: 5, skill: { charisma: 4 } }, result: '"You Regina folks are the nicest!"' },
      { label: 'Point down the street', fx: { mood: 1, skill: { charisma: 1 } }, result: '"That way, can\'t miss it." (You can miss it.)' },
    ] },
  { id: 'doubledouble', where: ['street'], icon: '☕', title: 'Coffee line karma',
    text: "You're in the drive-through line on foot (don't ask). The person behind you looks rough.",
    choices: [
      { label: "Pay for their double-double ($3)", cost: 300, fx: { money: -300, mood: 8, skill: { charisma: 5 } }, result: 'They pay it forward. The chain lasts eleven cars.' },
      { label: 'Mind your own business', fx: {}, result: 'Efficient. Cold. Fine.' },
    ] },
  { id: 'neighbour', where: ['home'], icon: '🚪', title: 'Knock knock',
    text: 'Your neighbour from Unit 205 is at the door. "Got any spare ketchup chips? Hockey is on."',
    choices: [
      { label: 'Share your chips', fx: { mood: 6, fun: 8, skill: { charisma: 3 } }, result: 'You end up watching the third period together.', needsItem: 'chips' },
      { label: 'Say you are out', fx: { mood: -1 }, result: 'They shuffle off, defeated.' },
    ] },
  { id: 'flicker', where: ['home'], cond: (c) => c.season === 'winter', icon: '💡', title: 'Power flicker',
    text: 'The lights flicker during a blizzard. The radiator clanks ominously.',
    choices: [
      { label: 'Layer up and wait it out', fx: { mood: -2, energy: -2, skill: { fitness: 2 } }, result: 'The lights come back after a minute.' },
      { label: 'Light a candle and read', fx: { fun: 8, mood: 4 }, result: 'Surprisingly cosy.' },
    ] },
  // ---- on the job ----
  { id: 'refund', where: ['shift:retail'], icon: '🧾', title: 'Refund with no receipt',
    text: 'A customer wants to return a half-eaten loaf of sourdough. No receipt. "It was too sourdough."',
    choices: [
      { label: 'Give the refund', fx: { mood: -2, jobXp: 4, skill: { charisma: 2 } }, result: 'The customer leaves happy. Your manager sighs.' },
      { label: 'Politely explain the policy', fx: { jobXp: 12, skill: { charisma: 4 } }, result: 'They grumble but accept store credit. Manager nods approvingly.' },
      { label: 'Refuse flatly', fx: { mood: -5, jobXp: 2 }, result: 'Complaint filed. You are on thin ice.' },
    ] },
  { id: 'spill', where: ['shift:retail'], icon: '🥫', title: 'Aisle avalanche',
    text: 'A pyramid of canned beans collapses across aisle 2 with a deafening clatter.',
    choices: [
      { label: 'Rebuild it properly', fx: { energy: -5, jobXp: 10, skill: { fitness: 2 } }, result: 'A beautiful bean pyramid. Customers take photos.' },
      { label: 'Shove them into a bin', fx: { jobXp: 3 }, result: 'Quick. Ugly. Effective.' },
    ] },
  { id: 'pierogi', where: ['shift:retail'], icon: '🥟', title: 'Customer wants a recommendation',
    text: '"I have eight cousins coming for the long weekend. What do I feed them?"',
    choices: [
      { label: 'Recommend the bannock & deli plate', fx: { jobXp: 12, mood: 3, skill: { charisma: 4, cooking: 4 } }, result: 'Cousins: fed. Customer: converted.' },
      { label: '"Aisle 3, probably."', fx: { jobXp: 3 }, result: 'Technically correct.' },
    ] },
  { id: 'wedding', where: ['shift:stylist'], icon: '👗', title: 'Wedding outfit emergency',
    text: 'A customer needs a full outfit for a wedding in two hours. "Please, I am begging."',
    choices: [
      { label: 'Style them head to toe', fx: { energy: -6, jobXp: 14, skill: { charisma: 5 } }, result: 'They cry happy tears. Five-star review.' },
      { label: 'Hand them the sale rack', fx: { jobXp: 4 }, result: 'It works. Sort of.' },
    ] },
  { id: 'toque_sale', where: ['shift:stylist'], cond: (c) => c.temp <= 0, icon: '🧶', title: 'Toque rush',
    text: 'The temperature just dropped. Suddenly everyone in Regina needs a toque. Right now.',
    choices: [
      { label: 'Run a quick display', fx: { energy: -5, jobXp: 12, skill: { fitness: 2, charisma: 3 } }, result: 'Sold out by lunch.' },
      { label: 'Carry on as normal', fx: { jobXp: 3 }, result: 'Your manager looks at the empty shelf, then at you.' },
    ] },
];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const EVENT_COOLDOWN_MS = 70_000;

const hasItem = (s, id) => (s.inventory[id] || 0) > 0;
export function choiceAvailable(store, ev, i) {
  const ch = ev.choices[i], s = store.state; if (!ch) return { ok: false, why: 'Invalid choice' };
  if (ch.cost && store.ledger.balance < ch.cost) return { ok: false, why: "You can't afford that" };
  if (ch.needsItem && !hasItem(s, ch.needsItem)) return { ok: false, why: `You don't have any ${ch.needsItem}` };
  return { ok: true };
}
/** Events that can fire right now. c: { where, temp, night, season, kind } */
export function eligible(c) {
  return EVENTS.filter((e) => e.where.includes(c.where) && (!e.cond || e.cond(c)));
}
export function rollEvent(store, c, rnd = Math.random, now = store.now()) {
  const s = store.state, f = (s.flags ||= {});
  if (f.eventAt && now - f.eventAt < EVENT_COOLDOWN_MS) return null;
  const recent = new Set((s.eventLog || []).slice(0, 4));
  const pool = eligible(c).filter((e) => !recent.has(e.id));
  if (!pool.length) return null;
  const ev = pool[Math.floor(rnd() * pool.length)];
  f.eventAt = now; return ev;
}
/** Apply a choice. Everything is re-validated here, never trusted from the UI. */
export function resolveEvent(store, eventId, i) {
  const ev = EVENT_BY_ID[eventId], s = store.state; if (!ev) return { ok: false, error: 'Unknown event' };
  const av = choiceAvailable(store, ev, i); if (!av.ok) return { ok: false, error: av.why };
  const ch = ev.choices[i], fx = ch.fx || {};
  if (fx.money) {
    const r = fx.money < 0 ? store.ledger.debit(-fx.money, `${ev.title}`, { category: 'purchase' }) : store.ledger.credit(fx.money, `${ev.title}: tip`, { category: 'income' });
    if (!r.ok) return { ok: false, error: r.error };
  }
  for (const k of ['energy', 'hunger', 'hygiene', 'fun', 'mood']) if (fx[k]) s.needs[k] = clamp((s.needs[k] ?? 50) + fx[k]);
  if (fx.jobXp && s.job.active) s.job.active.xp += fx.jobXp;
  const cha = skillLevel(s.skills?.charisma || 0);
  for (const [sk, xp] of Object.entries(fx.skill || {})) addSkill(store, sk, xp);
  if (ch.needsItem) { s.inventory[ch.needsItem]--; if (!s.inventory[ch.needsItem]) delete s.inventory[ch.needsItem]; }
  if (ch.flag) (s.flags ||= {})[ch.flag] = true;
  (s.eventLog ||= []).unshift(ev.id); s.eventLog.length = Math.min(s.eventLog.length, 12);
  store.commit('needs');
  const bits = []; if (fx.money) bits.push(`${fx.money > 0 ? '+' : '−'}${fmtMoney(Math.abs(fx.money))}`);
  return { ok: true, result: ch.result, summary: bits.join(' · '), charismaLevel: cha };
}
