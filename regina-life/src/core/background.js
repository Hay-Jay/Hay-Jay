/**
 * Your family background: drawn at random when a new life starts, like real life. Most people get by, some have it tight, a few are comfortable,
 * fewer are well-off, and rich parents are rare (weights below, out of 100). It decides what you start with: money, a few things, sometimes a
 * home and a short allowance. A head start in money comes with less of a head start in skills: the scrappier starts have learned more the hard
 * way. Prairie Dollars only; nothing here is real money. Pure rules over the store (tests/background.test.js).
 */
import { STARTING_BALANCE } from '../data/economy.js';
import { CLOTHES, FOOD } from '../data/catalog.js';
import { FURNITURE } from '../data/furniture.js';
import { HOMES } from '../data/homes.js';
import { own } from './util.js';
import { dayKey } from './daily.js';

export const BACKGROUNDS = [
  { id: 'tight', name: 'Money\'s tight', icon: '🥫', weight: 22, cash: 15000, skills: { cooking: 60, charisma: 25 },
    story: 'Money has always been tight at home. Your family can\'t help much, but you can stretch a dollar and cook a real meal from almost nothing.',
    gets: ['P$150 to start, after the bus ticket and the deposit', 'A big Cooking and Charisma head start (you learned the hard way)'] },
  { id: 'getting', name: 'Getting by', icon: '🏠', weight: 45, cash: STARTING_BALANCE, skills: { cooking: 20 }, food: { bannock: 1, bread: 1, apple: 2 },
    story: 'Your family gets by. They can\'t bankroll you, but Mom packed a box of groceries and made you promise to call.',
    gets: ['P$400 to start', 'A care package of groceries', 'A small Cooking head start'] },
  { id: 'comfortable', name: 'Comfortable', icon: '🛋️', weight: 24, cash: 120000, clothes: ['jacket_green'],
    story: 'You grew up comfortable. Your parents helped with the move and bought you a good jacket for the Regina wind.',
    gets: ['P$1,200 to start', 'A Field Jacket'] },
  { id: 'welloff', name: 'Well-off', icon: '💼', weight: 7, cash: 300000, clothes: ['puffer_navy', 'pacs_charcoal'], furniture: { tv_32: 1 }, allowance: { per: 2000, days: 14 },
    story: 'Your family is well-off. They set you up nicely and send a little allowance while you find your feet.',
    gets: ['P$3,000 to start', 'A puffer parka and pac boots', 'A TV for your place', 'P$20 allowance each day you play, for two weeks'], costs: 'No skill head start' },
  { id: 'rich', name: 'Rich parents', icon: '💎', weight: 2, cash: 900000, home: 'onebed', clothes: ['jacket_black', 'trapper_brown', 'scarf_gold', 'pacs_charcoal'], furniture: { tv_50: 1, sofa: 1 }, allowance: { per: 6000, days: 30 },
    story: 'Your parents are rich. They bought you a one-bedroom at Cathedral Court and wire an allowance for your first month. Everyone expects big things.',
    gets: ['P$9,000 to start', 'Your own one-bedroom at Cathedral Court', 'A parka, a trapper hat and pac boots', 'A sofa and a big TV', 'P$60 allowance each day you play, for a month'], costs: 'No skill head start, and you have never cooked a meal' },
];
export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));
const TOTAL = BACKGROUNDS.reduce((a, b) => a + b.weight, 0);

/** Draw a background. `u` is a random number in [0, 1). */
export function rollBackground(u = Math.random()) {
  let x = Math.max(0, Math.min(0.999999, Number.isFinite(u) ? u : 0)) * TOTAL;
  for (const b of BACKGROUNDS) { if (x < b.weight) return b.id; x -= b.weight; }
  return BACKGROUNDS[BACKGROUNDS.length - 1].id;
}
/** The odds, as whole percentages (for the reveal card). */
export const backgroundOdds = (id) => Math.round(((BACKGROUND_BY_ID[id]?.weight ?? 0) / TOTAL) * 100);

export function sanitizeBackground(b) {
  if (!b || typeof b !== 'object' || !own(BACKGROUND_BY_ID, b.tier)) return null;
  const n = (v, max) => (Number.isInteger(v) && v >= 0 ? Math.min(max, v) : 0);
  return { tier: b.tier, allowanceLeft: n(b.allowanceLeft, 60), allowancePer: n(b.allowancePer, 100000), allowanceLast: typeof b.allowanceLast === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.allowanceLast) ? b.allowanceLast : '' };
}

/**
 * Start a life with this background: money in or out through the ledger (one entry, so the bank history tells the story), the clothes, groceries,
 * furniture, home and skills it brings, and the allowance. Once per life: a second call is refused.
 */
export function applyBackground(store, tierId, { skillsFrom = {} } = {}) {
  const s = store.state, b = own(BACKGROUND_BY_ID, tierId) ? BACKGROUND_BY_ID[tierId] : null;
  if (!b) return { ok: false, error: 'Unknown background' };
  if (sanitizeBackground(s.background)) return { ok: false, error: 'Your background is already set' };
  const diff = b.cash - s.bank.balance;
  if (diff > 0) { const r = store.ledger.credit(diff, b.id === 'rich' ? 'From Mom and Dad: welcome to Regina' : 'Family help with the move', { category: 'income', ref: 'background' }); if (!r.ok) return r; }
  if (diff < 0) { const r = store.ledger.debit(Math.min(-diff, s.bank.balance), 'Moving costs: the bus ticket and the deposit', { category: 'purchase', ref: 'background' }); if (!r.ok) return r; }
  s.wardrobe = [...new Set([...(s.wardrobe ?? []), ...(b.clothes ?? []).filter((id) => own(CLOTHES, id))])];
  for (const [id, q] of Object.entries(b.food ?? {})) if (own(FOOD, id)) s.inventory[id] = Math.min(99, (s.inventory[id] ?? 0) + q);
  s.home ||= { owned: {}, placed: [] }; s.home.owned ||= {};
  for (const [id, q] of Object.entries(b.furniture ?? {})) if (own(FURNITURE, id)) s.home.owned[id] = (s.home.owned[id] ?? 0) + q;
  if (b.home && own(HOMES, b.home)) s.home.layout = b.home;
  s.skills ||= {};
  for (const [k, xp] of Object.entries({ ...(b.skills ?? {}) })) s.skills[k] = Math.min(10000, (s.skills[k] ?? 0) + xp);
  for (const [k, xp] of Object.entries(skillsFrom)) s.skills[k] = Math.min(10000, (s.skills[k] ?? 0) + xp);
  s.background = { tier: b.id, allowanceLeft: b.allowance?.days ?? 0, allowancePer: b.allowance?.per ?? 0, allowanceLast: '' };
  store.commit('bank'); store.commit('home'); store.commit('background');
  return { ok: true, background: b };
}

/** The family allowance: once per Regina day you play, until it runs out (days you miss are not paid). Returns the amount paid or 0. */
export function collectAllowance(store, now = store.now()) {
  const s = store.state, b = sanitizeBackground(s.background); if (!b || b.allowanceLeft <= 0 || b.allowancePer <= 0) return 0;
  const d = dayKey(now); if (b.allowanceLast === d) return 0;
  const r = store.ledger.credit(b.allowancePer, 'Allowance from home', { category: 'income', ref: `allowance:${d}` }); if (!r.ok) return 0;
  s.background = { ...b, allowanceLeft: b.allowanceLeft - 1, allowanceLast: d }; store.commit('background');
  return b.allowancePer;
}
