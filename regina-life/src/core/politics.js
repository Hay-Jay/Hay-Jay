/**
 * Mayoral elections (entirely fictional). A term lasts TERM_MS of real time. During a term you may vote once and
 * campaign for your pick; when it ends the electorate is simulated deterministically (seeded) and the winner's
 * policy applies to the next term — changing real prices/wages in the game.
 */
import { CANDIDATES, CANDIDATE_BY_ID, POLICIES } from '../data/policies.js';
import { mulberry32 } from './rng.js';
import { notify } from './game.js';
export { activePolicyId, activePolicy, policyMult } from './policy.js';

export const TERM_MS = 3 * 86_400_000;
export const MAX_CAMPAIGN_POINTS = 6;           // per term
export const VOTE_BONUS = 0.04;                  // your own vote's share swing
const DONATIONS = { 1000: 0.4, 5000: 2.2 };      // cents → campaign points

/** Slate (3 candidates) for a given term number, deterministic. */
export function slateFor(term) {
  const r = mulberry32(term * 7919 + 13), pool = [...CANDIDATES], out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
export function ensurePolitics(store, now = store.now()) {
  const s = store.state;
  if (!s.politics) s.politics = { term: 1, start: now, vote: null, points: 0, mayor: { id: 'lafontaine', policy: 'cheap_groceries', since: now }, history: [] };
  return s.politics;
}
export const timeLeft = (p, now) => Math.max(0, p.start + TERM_MS - now);

export function vote(store, candidateId, now = store.now()) {
  const p = ensurePolitics(store, now), slate = slateFor(p.term);
  if (!slate.some((c) => c.id === candidateId)) return { ok: false, error: 'That candidate is not on the ballot' };
  if (p.vote) return { ok: false, error: 'You have already voted this term' };
  if (timeLeft(p, now) <= 0) return { ok: false, error: 'Voting has closed' };
  p.vote = candidateId; store.commit('politics'); return { ok: true };
}
/** Donate to the campaign of the candidate you voted for (validated by the ledger). */
export function donate(store, cents, now = store.now()) {
  const p = ensurePolitics(store, now);
  if (!p.vote) return { ok: false, error: 'Vote first, then you can back a campaign' };
  if (!(cents in DONATIONS)) return { ok: false, error: 'Choose a listed donation' };
  if (p.points >= MAX_CAMPAIGN_POINTS) return { ok: false, error: 'Campaign is already at full strength' };
  const r = store.ledger.debit(cents, `Campaign donation: ${CANDIDATE_BY_ID[p.vote].name}`, { category: 'purchase' }); if (!r.ok) return r;
  p.points = Math.min(MAX_CAMPAIGN_POINTS, p.points + DONATIONS[cents]); store.commit('politics'); return { ok: true, points: p.points };
}
/** Free canvassing: door-knock for your candidate (call after the activity completes). */
export function canvass(store) {
  const p = ensurePolitics(store); if (!p.vote) return { ok: false, error: 'Vote first' };
  if (p.points >= MAX_CAMPAIGN_POINTS) return { ok: false, error: 'Campaign is already at full strength' };
  p.points = Math.min(MAX_CAMPAIGN_POINTS, p.points + 0.6); store.commit('politics'); return { ok: true, points: p.points };
}
/** Simulated electorate shares for a term (sum 1). */
export function simulate(term, voteId, points) {
  const r = mulberry32(term * 104729 + 7), slate = slateFor(term);
  const raw = slate.map((c) => c.base + (r() - 0.5) * 0.12 + (c.id === voteId ? VOTE_BONUS + points * 0.012 : 0));
  const tot = raw.reduce((a, b) => a + b, 0);
  return slate.map((c, i) => ({ id: c.id, share: raw[i] / tot })).sort((a, b) => b.share - a.share);
}
/** Close finished terms (possibly several if the player was away) and install the winner. */
export function tallyIfDue(store, now = store.now()) {
  const p = ensurePolitics(store, now); let n = 0;
  while (now >= p.start + TERM_MS && n < 20) {
    const results = simulate(p.term, p.vote, p.points), win = CANDIDATE_BY_ID[results[0].id];
    p.history.unshift({ term: p.term, winner: win.id, shares: results, youVoted: p.vote, t: p.start + TERM_MS });
    p.history.length = Math.min(p.history.length, 8);
    p.mayor = { id: win.id, policy: win.policy, since: p.start + TERM_MS };
    p.term++; p.start += TERM_MS; p.vote = null; p.points = 0; n++;
    notify(store, { app: 'townhall', title: `🗳️ Mayor ${win.name} elected`, body: `${POLICIES[win.policy].name}: ${POLICIES[win.policy].effect}.` });
  }
  if (n) store.commit('politics'); return n;
}
