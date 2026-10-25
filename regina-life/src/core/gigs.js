/**
 * Odd Jobs: the rules (docs/AMAZING.md section 5). Pure over a Store and server-portable, like the ledger and shifts:
 *
 *   gigBoard(state, c)        today's board: up to 4 gigs seeded by the Regina day, filtered by the real season and weather (c)
 *   startGig(store, id, c)    take one (one at a time, at most GIG_DAILY_CAP a day, not when exhausted)
 *   gigStep(store, at)        you reached the current step's spot ({x, z}) and did its action; validated by distance and pace
 *   finishGig(store, c)       every step done and not suspiciously fast: pay once through the ledger (ref gig:<id>), a quick-run tip for deliveries,
 *                             busking pays by Charisma, the hour and the weather
 *   abandonGig(store)
 *
 * Nothing punishes being away: a board never expires mid-day, unfinished gigs simply lapse at midnight, and pay never decays.
 */
import { GIG_KINDS, GIG_KIND_BY_ID } from '../data/gigs.js';
import { mulberry32, hashStr } from './rng.js';
import { dayKey } from './daily.js';
import { skillLevel, tally } from './game.js';

export const GIG_DAILY_CAP = 5;
export const GIG_REACH = 4.5;            // metres from a step's spot that count as "there"
export const GIG_MIN_STEP_MS = 2500;     // nobody shovels three walks in a second
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Today's conditions from the live (or labelled simulated) weather: is there snow on the ground? */
export function gigConditions({ season = 'summer', temp = 10, kind = 'clear', hour = 12 } = {}) {
  const snow = kind === 'snow' || (season === 'winter' && temp <= 1);
  return { season, temp, kind, hour, snow };
}
/** The board for a Regina day. Deterministic: the same day and weather always give the same gigs (ids are stable). */
export function gigBoard(state, c, now = Date.now()) {
  const day = dayKey(now), cond = gigConditions(c), r = mulberry32(hashStr('gigs:' + day));
  const open = GIG_KINDS.filter((k) => k.when(cond));
  // weather gigs first when their weather is here (that is the point of them), then a seeded pick of the rest
  const lead = open.filter((k) => k.id === 'shovel' || k.id === 'leaves' || k.id === 'tulips'), rest = open.filter((k) => !lead.includes(k));
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const g = sanitizeGigs(state.gigs), doneToday = g.day === day ? g.done : [];
  return [...lead, ...rest].slice(0, 4).map((k, n) => {
    const rr = mulberry32(hashStr(`gig:${day}:${k.id}:${n}`)), pay = Math.round((k.pay[0] + rr() * (k.pay[1] - k.pay[0])) / 50) * 50;
    const id = `${day}:${k.id}`;
    return { id, kind: k.id, icon: k.icon, title: k.title, blurb: k.blurb, pay, mins: k.mins, steps: k.steps(rr), done: doneToday.includes(id) };
  });
}
export function sanitizeGigs(g) {
  const ok = g && typeof g === 'object' && !Array.isArray(g);
  const day = ok && typeof g.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.day) ? g.day : '';
  const done = ok && Array.isArray(g.done) ? [...new Set(g.done.filter((x) => typeof x === 'string' && x.length < 40))].slice(0, 20) : [];
  let active = null;
  const a = ok ? g.active : null;
  if (a && typeof a === 'object' && typeof a.id === 'string' && own(GIG_KIND_BY_ID, a.kind) && Array.isArray(a.steps) && a.steps.length > 0 && a.steps.length <= 6
    && a.steps.every((s) => s && Number.isFinite(s.spot?.x) && Number.isFinite(s.spot?.z) && typeof s.label === 'string')
    && Number.isInteger(a.step) && a.step >= 0 && a.step <= a.steps.length && Number.isFinite(a.startedAt) && Number.isFinite(a.stepAt) && Number.isInteger(a.pay) && a.pay > 0 && a.pay <= 10000) {
    active = { id: a.id, kind: a.kind, title: String(a.title ?? '').slice(0, 60), icon: String(a.icon ?? '').slice(0, 4), pay: a.pay, steps: a.steps.map((s) => ({ spot: { x: s.spot.x, z: s.spot.z, name: String(s.spot.name ?? '').slice(0, 40) }, label: s.label.slice(0, 80), hold: Math.max(0, Math.min(10, Number(s.hold) || 0)) })), step: a.step, startedAt: a.startedAt, stepAt: a.stepAt };
  }
  return { day, done, active, total: ok && Number.isInteger(g.total) && g.total >= 0 ? Math.min(g.total, 1e6) : 0, earned: ok && Number.isInteger(g.earned) && g.earned >= 0 ? Math.min(g.earned, 1e10) : 0 };
}
export function startGig(store, id, c, now = store.now()) {
  const s = store.state, g = (s.gigs = sanitizeGigs(s.gigs)), day = dayKey(now);
  if (g.day !== day) { g.day = day; g.done = []; }
  if (g.active) return { ok: false, error: 'Finish (or drop) the odd job you are on first.' };
  if (s.job?.shift) return { ok: false, error: 'You are on a shift right now.' };
  if (g.done.length >= GIG_DAILY_CAP) return { ok: false, error: 'That is plenty of odd jobs for one day. More tomorrow!' };
  if ((s.needs?.energy ?? 0) < 15) return { ok: false, error: 'You are too tired. Rest first.' };
  const gig = gigBoard(s, c, now).find((x) => x.id === id);
  if (!gig) return { ok: false, error: 'That job is not on today\'s board.' };
  if (gig.done) return { ok: false, error: 'You already did that one today.' };
  g.active = { id: gig.id, kind: gig.kind, title: gig.title, icon: gig.icon, pay: gig.pay, steps: gig.steps.map((st) => ({ spot: { ...st.spot }, label: st.label, hold: st.hold ?? 0 })), step: 0, startedAt: now, stepAt: now };
  store.commit('gigs');
  return { ok: true, gig: g.active };
}
/** The step you are on, or null. */
export const currentStep = (s) => { const a = sanitizeGigs(s.gigs).active; return a && a.step < a.steps.length ? a.steps[a.step] : null; };
export function gigStep(store, at, now = store.now()) {
  const s = store.state, g = (s.gigs = sanitizeGigs(s.gigs)), a = g.active; if (!a) return { ok: false, error: 'No odd job in progress.' };
  const st = a.steps[a.step]; if (!st) return { ok: false, error: 'All done: collect your pay.' };
  if (!at || !(Math.hypot(at.x - st.spot.x, at.z - st.spot.z) <= GIG_REACH)) return { ok: false, error: `Head to ${st.spot.name || 'the marker'} first.` };
  if (now - a.stepAt < Math.max(GIG_MIN_STEP_MS, (st.hold || 0) * 1000 * 0.8)) return { ok: false, error: 'Not so fast!' };
  a.step++; a.stepAt = now; s.needs.energy = Math.max(0, s.needs.energy - 2); store.commit('gigs');
  return { ok: true, step: a.step, total: a.steps.length, done: a.step >= a.steps.length };
}
/** What busking earns: Charisma, foot traffic by the hour, and the weather (a sunny lunch hour on the mall is the jackpot). Pure, in cents. */
export function buskPay(charismaXp, hour, temp, kind) {
  const lvl = skillLevel(charismaXp || 0), traffic = hour >= 11 && hour < 14 ? 1.25 : hour >= 16 && hour < 19 ? 1.15 : hour >= 20 ? 0.75 : 0.9;
  const weather = kind === 'clear' ? 1.1 : kind === 'snow' ? 0.75 : 1, cold = temp < -10 ? 0.7 : temp < 0 ? 0.85 : temp > 30 ? 0.85 : 1;
  return Math.max(500, Math.min(4000, Math.round(((600 + lvl * 300) * traffic * weather * cold) / 50) * 50));
}
export function finishGig(store, c = {}, now = store.now()) {
  const s = store.state, g = (s.gigs = sanitizeGigs(s.gigs)), a = g.active; if (!a) return { ok: false, error: 'No odd job in progress.' };
  if (a.step < a.steps.length) return { ok: false, error: 'Not finished yet.' };
  const kind = GIG_KIND_BY_ID[a.kind], minMs = a.steps.length * GIG_MIN_STEP_MS;
  if (now - a.startedAt < minMs) return { ok: false, error: 'Finished suspiciously fast: no pay.' };
  let pay = a.kind === 'busk' ? buskPay(s.skills?.charisma, c.hour ?? 12, c.temp ?? 10, c.kind ?? 'clear') : a.pay;
  let tip = 0; if (a.kind === 'delivery' && now - a.startedAt < kind.mins * 60_000) tip = 300;
  const r = store.ledger.credit(pay + tip, `Odd job: ${a.title}${tip ? ' (+ tip)' : ''}`, { category: 'income', ref: `gig:${a.id}` });
  if (!r.ok) return r;
  if (g.day !== dayKey(now)) { g.day = dayKey(now); g.done = []; }
  g.done.push(a.id); g.active = null; g.total++; g.earned += pay + tip; tally(s, 'gigs');
  if (a.kind === 'busk' || a.kind === 'flyers') { s.skills.charisma = Math.min(10000, (s.skills.charisma || 0) + 6); }
  if (a.kind === 'shovel' || a.kind === 'leaves' || a.kind === 'dogwalk') { s.skills.fitness = Math.min(10000, (s.skills.fitness || 0) + 6); }
  s.needs.mood = Math.min(100, s.needs.mood + 4); s.needs.hygiene = Math.max(0, (s.needs.hygiene ?? 60) - 6);
  store.commit('gigs'); store.commit('bank');
  return { ok: true, pay, tip, total: pay + tip, kind: a.kind, title: a.title };
}
export function abandonGig(store) { const s = store.state, g = (s.gigs = sanitizeGigs(s.gigs)); if (!g.active) return { ok: false }; g.active = null; store.commit('gigs'); return { ok: true }; }
