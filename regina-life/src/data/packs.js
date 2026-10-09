/**
 * Prairie Dollar PACKS — DATA ONLY. Real-money purchases stay DISABLED until legal terms, moderation and payment
 * infrastructure exist (docs/PLAN.md section 4); nothing imports this file in the game yet.
 *
 * Design rules (locked by tests/economy.test.js):
 *  - modest: no pack is worth more than 2 normal weeks of entry-level income; the largest is about 1.4;
 *  - capped: at most PACK_LIMITS.maxPacksPerDay packs and CA$40 a day, CA$100 a week (about 3.6 weeks of income, ever);
 *  - bonus is small and bounded (best rate <= 1.2 x the base rate), so bigger packs are only slightly better value;
 *  - no pay-to-win: Prairie Dollars only buy things earnable for free (furniture, clothes, trips, billboards); packs add
 *    no items, XP, skills, wages or exclusive content;
 *  - never undercuts a real advertiser: even at the best pack rate, a billboard costs at least its real-money price in CAD
 *    (standard CA$25+, big CA$50+, landmark CA$100+ — see AD_TIERS[...].realMoney).
 * amount = cents of Prairie Dollars credited; priceCad = cents of Canadian dollars charged.
 */
export const PACKS_ENABLED = false;
export const PACKS = [
  { id: 'pocket',    label: 'Pocket Change', blurb: 'A couple of coffees and a bus ride.',     amount: 8000,   priceCad: 199 },
  { id: 'wallet',    label: 'Full Wallet',   blurb: 'A new hoodie and a night out.',            amount: 21000,  priceCad: 499 },
  { id: 'paycheque', label: 'Paycheque',     blurb: 'Most of a decent week of shifts.',         amount: 43000,  priceCad: 999 },
  { id: 'harvest',   label: 'Harvest',       blurb: 'A weekend trip to Saskatoon with change.', amount: 90000,  priceCad: 1999 },
  { id: 'granary',   label: 'Full Granary',  blurb: 'A big week: furniture, a trip and a night on the town.', amount: 190000, priceCad: 3999 },
];
export const PACK_BY_ID = Object.fromEntries(PACKS.map((p) => [p.id, p]));
/** Purchase limits (CAD cents), enforced by the future server, not the browser. */
export const PACK_LIMITS = { maxPacksPerDay: 2, maxCadPerDay: 4000, maxCadPerWeek: 10000 };
/** Prairie Dollars per Canadian dollar for a pack (amount and price are both in cents). */
export const packRate = (p) => p.amount / p.priceCad;
