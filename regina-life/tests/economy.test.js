/** Economy: realistic 2026 Regina prices, the pacing model, the billboard tier ladder and the (data-only) money packs. See docs/ECONOMY.md. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { MAX_TX } from '../src/core/ledger.js';
import * as G from '../src/core/game.js';
import * as S from '../src/core/social.js';
import { EVENTS } from '../src/core/events.js';
import { cabFare, CAB_BASE } from '../src/core/travel.js';
import { adPrice, weekPrice, adQuote, adAirtime, tierOf, buyAd, adReach } from '../src/core/ads.js';
import { POLICIES } from '../src/data/policies.js';
import { FOOD, CLOTHES } from '../src/data/catalog.js';
import { JOBS, XP_PER_TASK } from '../src/data/jobs.js';
import { DESTINATIONS } from '../src/data/destinations.js';
import { BILLBOARDS, AD_TIERS, AD_TIER_ORDER, AD_DAYS, DURATIONS, DAY_PRICE, placementOk } from '../src/data/billboards.js';
import { PACKS, PACK_LIMITS, PACKS_ENABLED, packRate } from '../src/data/packs.js';
import { STARTING_BALANCE, SK_MIN_WAGE, HOURS_PER_TASK, PACE, shiftPlayMinutes, incomePerPlayHour, weeklyIncome, FIRST_FURNITURE_SET, REFERENCE_MONTHLY } from '../src/data/economy.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store; beforeEach(() => { t = 1_700_000_000_000; store = new Store(mem(), () => t); });
const entry = JOBS.retail.levels[0].wage, lead = JOBS.retail.levels[2].wage;
const ENTRY_WEEK = weeklyIncome(entry), LEAD_WEEK = weeklyIncome(lead);

/** [what, price in cents, low $, high $] — 2026 Regina / Canada reference ranges (my best knowledge; see the confidence column in docs/ECONOMY.md). */
const fare = (id, mode) => DESTINATIONS.find((d) => d.id === id).modes[mode].fare;
const ev = (id, i) => -EVENTS.find((e) => e.id === id).choices[i].fx.money;
const REFERENCE = [
  ['starting chequing balance', STARTING_BALANCE, 300, 600],
  // groceries & drinks
  ['apple', FOOD.apple.price, 1.5, 2.75], ['sourdough loaf', FOOD.bread.price, 5, 9], ['deli sandwich', FOOD.sandwich.price, 8, 12], ['ketchup chips', FOOD.chips.price, 4, 6],
  ['milk 2 L', FOOD.milk.price, 4.5, 6], ['double-double', FOOD.coffee.price, 2.25, 3.25], ['cream soda', FOOD.pop.price, 1.75, 3], ['bannock', FOOD.bannock.price, 4, 8],
  // clothing
  ['hoodie', CLOTHES.hoodie_grey.price, 45, 95], ['sweater', CLOTHES.sweater_cream.price, 55, 120], ['field jacket', CLOTHES.jacket_green.price, 90, 180], ['parka', CLOTHES.jacket_black.price, 249, 450],
  ['black jeans', CLOTHES.jeans_black.price, 45, 110], ['chinos', CLOTHES.chino_tan.price, 45, 90], ['joggers', CLOTHES.jogger_grey.price, 35, 80], ['shorts', CLOTHES.shorts_khaki.price, 30, 55],
  ['court sneakers', CLOTHES.sneaker_black.price, 65, 130], ['winter boots', CLOTHES.boots_brown.price, 130, 260], ['oxfords', CLOTHES.dress_black.price, 95, 200],
  ['toque', CLOTHES.toque_red.price, 15, 40], ['ball cap', CLOTHES.cap_navy.price, 20, 45], ['glasses', CLOTHES.glasses_black.price, 60, 150], ['sunglasses', CLOTHES.shades.price, 30, 120], ['scarf', CLOTHES.scarf_plaid.price, 25, 65],
  // hourly wages (gross, Regina)
  ['retail associate /h', JOBS.retail.levels[0].hourly, 15.35, 18], ['senior associate /h', JOBS.retail.levels[1].hourly, 17.5, 20.5], ['shift lead /h', JOBS.retail.levels[2].hourly, 19.5, 24],
  ['floor stylist /h', JOBS.stylist.levels[0].hourly, 15.5, 18.5], ['lead stylist /h', JOBS.stylist.levels[1].hourly, 18, 22], ['store manager /h', JOBS.stylist.levels[2].hourly, 22, 32],
  // intercity (return) fares
  ['Moose Jaw coach', fare('moosejaw', 'bus'), 25, 55], ['Saskatoon coach', fare('saskatoon', 'bus'), 70, 120], ['Saskatoon flight', fare('saskatoon', 'flight'), 200, 350],
  ['Winnipeg coach', fare('winnipeg', 'bus'), 140, 230], ['Winnipeg flight', fare('winnipeg', 'flight'), 250, 450], ['Calgary coach', fare('calgary', 'bus'), 180, 290], ['Calgary flight', fare('calgary', 'flight'), 220, 420],
  ['Banff (flight + shuttle)', fare('banff', 'flight'), 380, 600], ['Vancouver flight', fare('vancouver', 'flight'), 300, 560],
  // cabs, hangouts (for two), trip extras
  ['cab 1 km', cabFare(1000), 5, 10], ['cab 5 km', cabFare(5000), 14, 22], ['cab 10 km', cabFare(10000), 25, 38],
  ['café round for two', S.HANGOUTS.coffee.cost, 8, 14], ['cinema for two', S.HANGOUTS.movie.cost, 30, 50], ['dinner for two', S.HANGOUTS.dinner.cost, 70, 130],
  ['tunnel tour', ev('trip_moosejaw', 0), 18, 30], ['hot springs', ev('trip_moosejaw', 1), 25, 40], ['berry pie', ev('trip_saskatoon', 0), 6, 12], ['Forks market grazing', ev('trip_winnipeg', 0), 12, 25],
  ['café coffee', ev('trip_winnipeg', 2), 4, 6], ['Banff hot chocolate', ev('trip_banff', 1), 6, 10], ['Vancouver ramen', ev('trip_vancouver', 1), 15, 25], ['Regina hot chocolate', ev('wind', 0), 3.5, 6], ['busker tip', ev('busker', 0), 1, 5], ['coffee for a stranger', ev('doubledouble', 0), 2.5, 4],
];
describe('prices sit inside realistic 2026 Regina / Canada ranges', () => {
  for (const [what, cents, lo, hi] of REFERENCE) it(`${what}: $${(cents / 100).toFixed(2)} in [$${lo}, $${hi}]`, () => { expect(cents / 100).toBeGreaterThanOrEqual(lo); expect(cents / 100).toBeLessThanOrEqual(hi); });
});

describe('ledger invariants: every money value is a positive safe integer of cents', () => {
  const all = () => [
    ...Object.values(FOOD).map((f) => f.price), ...Object.values(CLOTHES).filter((c) => c.price).map((c) => c.price),
    ...Object.values(JOBS).flatMap((j) => j.levels.flatMap((l) => [l.hourly, l.wage])), ...DESTINATIONS.flatMap((d) => Object.values(d.modes).map((m) => m.fare)),
    ...Object.values(AD_TIERS).flatMap((x) => [x.price, x.realMoney.cents]), ...PACKS.flatMap((p) => [p.amount, p.priceCad]), ...Object.values(S.HANGOUTS).map((h) => h.cost).filter(Boolean),
    ...EVENTS.flatMap((e) => e.choices.flatMap((c) => [c.cost, c.fx?.money && Math.abs(c.fx.money)].filter(Boolean))), STARTING_BALANCE, FIRST_FURNITURE_SET, ...Object.values(REFERENCE_MONTHLY),
  ];
  it('integers within the per-transaction limit', () => { for (const v of all()) { expect(Number.isSafeInteger(v)).toBe(true); expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(MAX_TX); } });
  it('mayor policies never produce fractional cents', () => {
    for (const id of [null, ...Object.keys(POLICIES)]) {
      const st = { politics: id ? { mayor: { policy: id } } : null }, fake = { state: st };
      for (const f of Object.keys(FOOD).concat(Object.keys(CLOTHES))) expect(Number.isSafeInteger(G.priceFor(fake, f))).toBe(true);
      for (const j of Object.values(JOBS)) for (const l of j.levels) expect(Number.isSafeInteger(G.wageFor(fake, l))).toBe(true);
      for (const b of BILLBOARDS) for (const d of Object.keys(DURATIONS)) expect(Number.isSafeInteger(adPrice(b.id, +d, st))).toBe(true);
    }
  });
  it('event costs match the price printed on the choice and the money actually moved', () => {
    for (const e of EVENTS) for (const c of e.choices) {
      const shown = c.label.match(/\$(\d+)/);
      if (c.cost) { expect(c.fx.money).toBe(-c.cost); if (shown) expect(+shown[1] * 100).toBe(c.cost); }
    }
  });
});

describe('jobs: hourly wage x paid hours = pay per shift', () => {
  it('one task is one paid hour and pay is exactly hourly x hours', () => {
    expect(HOURS_PER_TASK).toBe(1);
    for (const j of Object.values(JOBS)) for (const l of j.levels) { expect(l.hours).toBe(l.tasks * HOURS_PER_TASK); expect(l.wage).toBe(l.hourly * l.hours); }
  });
  it('starts at or above the Saskatchewan minimum wage and climbs with every promotion', () => {
    for (const j of Object.values(JOBS)) j.levels.forEach((l, i) => { expect(l.hourly).toBeGreaterThanOrEqual(SK_MIN_WAGE); if (i) { expect(l.hourly).toBeGreaterThan(j.levels[i - 1].hourly); expect(l.wage).toBeGreaterThan(j.levels[i - 1].wage); expect(l.xpNeeded).toBeGreaterThan(j.levels[i - 1].xpNeeded); } });
  });
  it('promotions come from play time, not from a lucky first session', () => {
    for (const j of Object.values(JOBS)) {
      const shiftsTo = (target) => { let xp = 0, n = 0, lvl = 0; while (lvl < target) { xp += j.levels[lvl].tasks * XP_PER_TASK; n++; if (j.levels[lvl + 1] && xp >= j.levels[lvl + 1].xpNeeded) lvl++; } return n; };
      expect(shiftsTo(1)).toBeGreaterThanOrEqual(8); expect(shiftsTo(1)).toBeLessThanOrEqual(14);   // first promotion: roughly half an hour of shifts
      expect(shiftsTo(2)).toBeGreaterThanOrEqual(20); expect(shiftsTo(2)).toBeLessThanOrEqual(40); // top rung: an hour or two
    }
  });
  it('a shift still takes a real minute-plus of play (pay is not instant)', () => { for (const j of Object.values(JOBS)) for (const l of j.levels) { expect(shiftPlayMinutes(l.tasks)).toBeGreaterThan(2); expect(shiftPlayMinutes(l.tasks)).toBeLessThan(5); } });
});

describe('pacing model', () => {
  it('a focused play-hour of shifts earns an amount that feels good but is not endless', () => {
    for (const j of Object.values(JOBS)) for (const l of j.levels) { const h = incomePerPlayHour(l.wage, l.tasks); expect(h).toBeGreaterThan(100000); expect(h).toBeLessThan(250000); }
  });
  it('a newcomer needs a few shifts (a coffee-break of play) to afford a first furniture set, not none and not a grind', () => {
    const shifts = Math.ceil((FIRST_FURNITURE_SET - STARTING_BALANCE) / entry);
    expect(STARTING_BALANCE).toBeLessThan(FIRST_FURNITURE_SET); expect(shifts).toBeGreaterThanOrEqual(4); expect(shifts).toBeLessThanOrEqual(10);
    expect(shifts * shiftPlayMinutes(JOBS.retail.levels[0].tasks)).toBeLessThan(30);
  });
  it('a whole month of single-adult essentials is a small share of a normal casual week once the game is compressed', () => {
    const monthly = Object.values(REFERENCE_MONTHLY).reduce((a, b) => a + b, 0), weekly = (monthly * 12) / 52;
    expect(weekly / ENTRY_WEEK).toBeGreaterThan(0.2); expect(weekly / ENTRY_WEEK).toBeLessThan(0.45);           // ~6 of 20 shifts
    expect(weekly / (40 * JOBS.retail.levels[0].hourly)).toBeGreaterThan(0.5);                                    // ...but most of a real full-time wage
  });
  it('feeding yourself is cheap relative to earning (food is not the sink; aspirations are)', () => {
    const hungerPerHour = 60 * 60 * 0.045, cheapest = Math.min(...Object.values(FOOD).filter((f) => f.hunger >= 10).map((f) => f.price / f.hunger));
    expect((hungerPerHour * cheapest) / incomePerPlayHour(entry, 4)).toBeLessThan(0.08);
  });
  it('end to end: starting balance + 6 entry shifts buys the first set, paid through the real ledger', () => {
    G.applyForJob(store, 'retail'); store.state.job.application.offerAt = 0; G.tickJobs(store); G.acceptOffer(store);
    for (let i = 0; i < 6; i++) { G.startShift(store); for (let k = 0; k < 4; k++) G.completeTask(store); t += 60_000; store.state.needs.energy = 90; expect(G.finishShift(store).ok).toBe(true); }
    expect(store.ledger.balance).toBe(STARTING_BALANCE + 6 * entry); expect(store.ledger.balance).toBeGreaterThanOrEqual(FIRST_FURNITURE_SET);
    expect(Number.isSafeInteger(store.ledger.balance)).toBe(true);
  });
});

describe('billboard tier ladder', () => {
  it('has the three tiers with 7-day bookings, ascending price, shrinking rotation', () => {
    expect(AD_TIER_ORDER).toEqual(['standard', 'big', 'landmark']); expect(AD_DAYS).toBe(7);
    let prev = null;
    for (const id of AD_TIER_ORDER) {
      const x = AD_TIERS[id]; expect(x.id).toBe(id); expect(x.name).toBeTruthy(); expect(x.size.w).toBeGreaterThan(0); expect(x.size.label).toBeTruthy(); expect(x.days).toBe(7);
      expect(Number.isInteger(x.maxRotation) && x.maxRotation >= 1).toBe(true); expect(x.placement.text).toBeTruthy();
      if (prev) { expect(x.price).toBeGreaterThan(prev.price); expect(x.maxRotation).toBeLessThanOrEqual(prev.maxRotation); expect(x.realMoney.cents).toBeGreaterThan(prev.realMoney.cents); }
      prev = x;
    }
  });
  it('real-money advertiser benchmarks are CA$25 / CA$50 / CA$100 per week and stay disabled', () => {
    expect(AD_TIER_ORDER.map((id) => AD_TIERS[id].realMoney.cents)).toEqual([2500, 5000, 10000]);
    for (const x of Object.values(AD_TIERS)) { expect(x.realMoney.currency).toBe('CAD'); expect(x.realMoney.enabled).toBe(false); }
  });
  it('standard is about one normal entry-level week, big a few weeks, landmark takes months of saving', () => {
    expect(AD_TIERS.standard.price / ENTRY_WEEK).toBeGreaterThan(0.7); expect(AD_TIERS.standard.price / ENTRY_WEEK).toBeLessThan(1.25);
    expect(AD_TIERS.big.price / ENTRY_WEEK).toBeGreaterThan(1.8); expect(AD_TIERS.big.price / ENTRY_WEEK).toBeLessThan(3.5);
    expect(AD_TIERS.landmark.price / ENTRY_WEEK).toBeGreaterThan(6); expect(AD_TIERS.landmark.price / LEAD_WEEK).toBeGreaterThan(3.5);   // even at top pay, over a month of every dollar
    expect(AD_TIERS.landmark.price).toBeGreaterThan(AD_TIERS.standard.price * 6);
  });
  it('a newcomer can book a standard board after about a week of shifts, never on day one', () => {
    const shifts = Math.ceil((AD_TIERS.standard.price - STARTING_BALANCE) / entry); expect(shifts).toBeGreaterThanOrEqual(10); expect(shifts).toBeLessThanOrEqual(PACE.shiftsPerWeek);
    store.state.bank.balance = STARTING_BALANCE; expect(buyAd(store, 'victoria-west', 7, 'Best bannock in Regina!', 'prairie', t).error).toMatch(/Insufficient/);
    store.state.bank.balance = STARTING_BALANCE + shifts * entry; expect(buyAd(store, 'victoria-west', 7, 'Best bannock in Regina!', 'prairie', t)).toMatchObject({ ok: true, price: AD_TIERS.standard.price });
  });
  it('every existing board maps onto exactly one tier whose placement rule it satisfies', () => {
    expect(BILLBOARDS).toHaveLength(12);
    for (const b of BILLBOARDS) {
      expect(AD_TIERS[b.adTier], b.id).toBeTruthy(); expect(placementOk(AD_TIERS[b.adTier], b), b.id).toBe(true);
      expect(AD_TIER_ORDER.filter((id) => placementOk(AD_TIERS[id], b)), b.id).toEqual([b.adTier]);       // unambiguous
      expect(['standard', 'mega']).toContain(b.tier);                                                       // physical model untouched
    }
    for (const id of AD_TIER_ORDER) expect(BILLBOARDS.some((b) => b.adTier === id), id).toBe(true);
    expect(BILLBOARDS.filter((b) => b.adTier === 'landmark').map((b) => b.id).sort()).toEqual(['downtown-north', 'stadium']);
  });
  it('prices: the 7-day product is the tier price; short runs cost more per day; the mayor still discounts', () => {
    for (const b of BILLBOARDS) {
      const p = tierOf(b.id).price; expect(weekPrice(b.id)).toBe(p); expect(adPrice(b.id, 7)).toBe(p);
      expect(adPrice(b.id, 3) / 3).toBeGreaterThan(p / 7); expect(adPrice(b.id, 1)).toBeGreaterThan(adPrice(b.id, 3) / 3); expect(adPrice(b.id, 1)).toBeLessThan(p);
      expect(adPrice(b.id, 2)).toBeNull(); expect(adPrice(b.id, 0)).toBeNull(); expect(adPrice(b.id, '7')).toBeNull(); expect(adPrice(b.id, 1.5)).toBeNull();
    }
    expect(adPrice('constructor', 7)).toBeNull(); expect(adPrice('nope', 7)).toBeNull();
    const st = { politics: { mayor: { policy: 'open_signs' } } }; expect(weekPrice('stadium', st)).toBe(Math.round(AD_TIERS.landmark.price * 0.8));
  });
  it('a quote bundles what the UI needs; rotation shares screen time equally', () => {
    const q = adQuote('stadium'); expect(q).toMatchObject({ days: 7, price: 1000000, listPrice: 1000000, maxRotation: 2 }); expect(q.tier.id).toBe('landmark'); expect(q.reach).toBe(adReach('stadium', 7)); expect(q.airtime).toBeCloseTo(0.5, 6);
    expect(adAirtime('victoria-west')).toBeCloseTo(0.25, 6); expect(adAirtime('nope')).toBe(0); expect(adQuote('nope')).toBeNull(); expect(adQuote('__proto__')).toBeNull();
  });
  it('legacy per-day list prices (the 3D sign) follow the new ladder and bigger physical boards cost more', () => {
    expect(DAY_PRICE.standard).toBe(adPrice('victoria-west', 1)); expect(DAY_PRICE.mega).toBe(adPrice('albert-south', 1)); expect(DAY_PRICE.mega).toBeGreaterThan(DAY_PRICE.standard);
    expect(buyAd(store, 'nope', 7, 'Hello there', 'prairie', t).ok).toBe(false); expect(buyAd(store, 'constructor', 7, 'Hello there', 'prairie', t).error).toMatch(/Unknown/);
  });
});

describe('money packs (data only; real-money purchases stay disabled)', () => {
  const best = PACKS.reduce((a, b) => (b.amount > a.amount ? b : a));
  it('are disabled, well-formed and ordered', () => {
    expect(PACKS_ENABLED).toBe(false); expect(new Set(PACKS.map((p) => p.id)).size).toBe(PACKS.length);
    PACKS.forEach((p, i) => { expect(p.label).toBeTruthy(); expect(Number.isInteger(p.amount) && Number.isInteger(p.priceCad)).toBe(true); if (i) { expect(p.amount).toBeGreaterThan(PACKS[i - 1].amount); expect(p.priceCad).toBeGreaterThan(PACKS[i - 1].priceCad); } });
  });
  it('the best pack is worth well under two normal weeks of entry-level income (cannot trivialise the economy)', () => {
    expect(best.amount).toBeLessThanOrEqual(2 * ENTRY_WEEK); expect(best.amount).toBeLessThanOrEqual(1.5 * ENTRY_WEEK);
    for (const p of PACKS) expect(p.amount).toBeLessThan(2 * ENTRY_WEEK);
    expect(PACKS[0].amount).toBeGreaterThanOrEqual(entry / 2);          // even the smallest pack is worth a look
  });
  it('daily and weekly caps bound what money can be bought', () => {
    const rate = Math.max(...PACKS.map(packRate));
    expect(PACK_LIMITS.maxCadPerDay * rate).toBeLessThanOrEqual(2 * ENTRY_WEEK); expect(PACK_LIMITS.maxCadPerWeek * rate).toBeLessThanOrEqual(4 * ENTRY_WEEK);
    expect(PACK_LIMITS.maxPacksPerDay * best.amount).toBeGreaterThan(0); expect(PACK_LIMITS.maxCadPerDay).toBeLessThanOrEqual(PACK_LIMITS.maxCadPerWeek);
  });
  it('bonuses are small: bigger packs are only slightly better value', () => {
    const rates = PACKS.map(packRate); rates.forEach((r, i) => { if (i) expect(r).toBeGreaterThanOrEqual(rates[i - 1]); });
    expect(Math.max(...rates) / Math.min(...rates)).toBeLessThanOrEqual(1.2);
  });
  it('buying Prairie Dollars never undercuts a real advertiser: even at the best rate a board costs at least its CAD benchmark', () => {
    const rate = Math.max(...PACKS.map(packRate));
    for (const x of Object.values(AD_TIERS)) expect(x.price / rate).toBeGreaterThanOrEqual(x.realMoney.cents);
  });
});

describe('quick cab fare', () => {
  it('is a flag drop plus a per-kilometre rate and never negative or NaN', () => {
    expect(cabFare(0)).toBe(CAB_BASE); expect(cabFare(-50)).toBe(CAB_BASE); expect(cabFare(NaN)).toBe(CAB_BASE); expect(cabFare(Infinity)).toBe(CAB_BASE);
    expect(cabFare(2000)).toBeGreaterThan(cabFare(1000)); expect(Number.isInteger(cabFare(1234.5))).toBe(true);
    expect(cabFare(6000)).toBeLessThan(entry);                       // an airport run costs less than one shift
  });
});

describe('fares scale with distance and mode', () => {
  it('further is dearer, flights cost more than coaches, and the longest flights are the dearest', () => {
    const bus = (id) => fare(id, 'bus');
    expect(bus('moosejaw')).toBeLessThan(bus('saskatoon')); expect(bus('saskatoon')).toBeLessThan(bus('winnipeg')); expect(bus('winnipeg')).toBeLessThan(bus('calgary'));
    for (const d of DESTINATIONS) if (d.modes.bus && d.modes.flight) expect(d.modes.flight.fare).toBeGreaterThan(d.modes.bus.fare);
    for (const d of DESTINATIONS) for (const m of Object.values(d.modes)) { expect(m.mins).toBeGreaterThan(0); expect(m.fare).toBeGreaterThan(cabFare(1000)); }
    expect(fare('vancouver', 'flight')).toBeGreaterThan(fare('calgary', 'flight'));
  });
  it('every trip is reachable: the dearest costs fewer than 8 entry-level shifts', () => { for (const d of DESTINATIONS) for (const m of Object.values(d.modes)) expect(m.fare / entry).toBeLessThan(8); });
});
