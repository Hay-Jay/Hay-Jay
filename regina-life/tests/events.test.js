import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import * as G from '../src/core/game.js';
import { EVENTS, eligible, rollEvent, resolveEvent, EVENT_BY_ID, EVENT_COOLDOWN_MS } from '../src/core/events.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store;
beforeEach(() => { t = 1_700_000_000_000; store = new Store(mem(), () => t); });

describe('event data', () => {
  it('every event is well-formed', () => {
    for (const e of EVENTS) { expect(e.choices.length).toBeGreaterThanOrEqual(2 - (e.id === 'busker' ? 0 : 0)); expect(e.where.length).toBeGreaterThan(0); for (const c of e.choices) { expect(c.label).toBeTruthy(); expect(c.result).toBeTruthy(); } }
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });
  it('filters by place and conditions', () => {
    const cold = eligible({ where: 'street', temp: -20, night: 0.1, season: 'winter' }).map((e) => e.id);
    expect(cold).toContain('wind'); expect(cold).toContain('snowbank'); expect(cold).not.toContain('mosquito');
    expect(eligible({ where: 'shift:retail', temp: 10, night: 0, season: 'summer' }).every((e) => e.where.includes('shift:retail'))).toBe(true);
  });
});
describe('rolling', () => {
  const c = { where: 'street', temp: 10, night: 0.2, season: 'spring' };
  it('respects the cooldown and avoids repeats', () => {
    const a = rollEvent(store, c, () => 0, t); expect(a).toBeTruthy();
    expect(rollEvent(store, c, () => 0, t + 1000)).toBeNull();
    t += EVENT_COOLDOWN_MS + 1; store.state.eventLog = [a.id];
    const b = rollEvent(store, c, () => 0, t); expect(b.id).not.toBe(a.id);
  });
});
describe('resolving', () => {
  it('applies needs, money and skills; logs the event', () => {
    const b0 = store.ledger.balance, e0 = store.state.needs.energy;
    const r = resolveEvent(store, 'snowbank', 0);
    expect(r.ok).toBe(true); expect(store.state.needs.energy).toBe(e0 - 8); expect(store.ledger.balance).toBe(b0 + 2000);
    expect(store.state.skills.charisma).toBe(4); expect(store.state.eventLog[0]).toBe('snowbank');
  });
  it('refuses choices you cannot afford, without side effects', () => {
    store.state.bank.balance = 100; const m0 = store.state.needs.mood;
    expect(resolveEvent(store, 'busker', 0)).toMatchObject({ ok: false });
    expect(store.state.needs.mood).toBe(m0); expect(store.state.bank.balance).toBe(100);
  });
  it('requires and consumes item choices', () => {
    expect(resolveEvent(store, 'neighbour', 0).ok).toBe(false);
    G.buyItem(store, 'chips'); expect(resolveEvent(store, 'neighbour', 0).ok).toBe(true); expect(store.state.inventory.chips).toBeUndefined();
  });
  it('adds job XP only when employed; rejects bad ids/choices', () => {
    expect(resolveEvent(store, 'refund', 1).ok).toBe(true);
    expect(resolveEvent(store, 'nope', 0).ok).toBe(false); expect(resolveEvent(store, 'refund', 9).ok).toBe(false);
    G.applyForJob(store, 'retail'); store.state.job.application.offerAt = 0; G.tickJobs(store); G.acceptOffer(store);
    resolveEvent(store, 'refund', 1); expect(store.state.job.active.xp).toBe(12);
  });
  it('clamps needs to 0–100', () => { store.state.needs.mood = 98; resolveEvent(store, 'sunset', 0); expect(store.state.needs.mood).toBe(100); });
});
describe('skills & activities', () => {
  it('levels follow triangular XP and announce level-ups', () => {
    expect(G.skillLevel(0)).toBe(0); expect(G.skillLevel(20)).toBe(1); expect(G.skillLevel(60)).toBe(2); expect(G.skillLevel(1e9)).toBe(10);
    expect(G.addSkill(store, 'fitness', 25)).toBe(1); expect(store.state.notifications[0].title).toMatch(/level 1/);
    expect(G.addSkill(store, 'nonsense', 5)).toBeNull();
  });
  it('showers restore hygiene; the gym needs energy and trains fitness', () => {
    store.state.needs.hygiene = 10; G.doActivity(store, 'shower'); expect(store.state.needs.hygiene).toBe(100);
    store.state.needs.energy = 10; expect(G.doActivity(store, 'treadmill').ok).toBe(false);
    store.state.needs.energy = 80; expect(G.doActivity(store, 'treadmill').ok).toBe(true); expect(store.state.skills.fitness).toBe(10);
    expect(G.doActivity(store, 'nope').ok).toBe(false);
  });
  it('cooking skill boosts meals; fitness slows energy drain', () => {
    G.buyItem(store, 'bread'); G.buyItem(store, 'apple'); store.state.skills.cooking = 200; store.state.needs.hunger = 0;
    G.cook(store, 'apple_toast'); expect(store.state.needs.hunger).toBeGreaterThan(42);
    const a = new Store(mem(), () => t), b = new Store(mem(), () => t); b.state.skills.fitness = 400;
    G.tickNeeds(a, 100); G.tickNeeds(b, 100); expect(b.state.needs.energy).toBeGreaterThan(a.state.needs.energy);
  });
  it('hygiene and fun decay and mood reflects neglect', () => {
    G.tickNeeds(store, 1000); expect(store.state.needs.hygiene).toBeLessThan(82); expect(store.state.needs.fun).toBeLessThan(66); expect(G.moodWord(store.state.needs)).toBeTruthy();
  });
});

import { moderate, cleanText, adPrice, adReach, buyAd, activeAd, expireAds, MAX_AD_CHARS } from '../src/core/ads.js';
import { BILLBOARDS, BOARD_BY_ID } from '../src/data/billboards.js';
import { generateNews } from '../src/core/news.js';
import { simulateWeather } from '../src/core/weather.js';
import { reginaClock } from '../src/core/time.js';

describe('billboards', () => {
  it('moderates text', () => {
    expect(moderate('Visit my site www.scam.com').ok).toBe(false); expect(moderate('call @me on discord').ok).toBe(false); expect(moderate('ab').ok).toBe(false);
    expect(moderate('Best bannock in Regina!').ok).toBe(true); expect(cleanText('<b>hi</b>\n  there'.repeat(10)).length).toBeLessThanOrEqual(MAX_AD_CHARS);
    expect(moderate('f u c k').ok).toBe(false);
  });
  it('has unique boards and sane prices (mega > standard, longer = cheaper per day)', () => {
    expect(new Set(BILLBOARDS.map((b) => b.id)).size).toBe(BILLBOARDS.length);
    const std = BILLBOARDS.find((b) => b.tier === 'standard').id, mega = BILLBOARDS.find((b) => b.tier === 'mega').id;
    expect(adPrice(mega, 1)).toBeGreaterThan(adPrice(std, 1)); expect(adPrice(std, 7) / 7).toBeLessThan(adPrice(std, 1)); expect(adPrice(std, 2)).toBeNull(); expect(adReach(mega, 3)).toBeGreaterThan(0);
  });
  it('books, charges once, blocks double-booking, and expires', () => {
    const id = 'victoria-west', b0 = store.ledger.balance;
    expect(buyAd(store, id, 2, 'Hello Regina', 'prairie', t).ok).toBe(false);
    expect(buyAd(store, id, 1, 'Hello Regina', 'bogus', t).ok).toBe(false);
    expect(buyAd(store, id, 1, 'Hello Regina', 'prairie', t)).toMatchObject({ ok: true, price: 12000 });
    expect(store.ledger.balance).toBe(b0 - 12000);
    expect(buyAd(store, id, 1, 'Again', 'prairie', t + 1000).error).toMatch(/booked/);
    expect(activeAd(store.state, id, t + 1000)).toBeTruthy();
    expect(expireAds(store, t + 86_400_001)).toBe(1); expect(activeAd(store.state, id, t + 86_400_001)).toBeNull();
  });
  it('cannot overspend or run offensive copy', () => {
    store.state.bank.balance = 5000; expect(buyAd(store, 'downtown-north', 1, 'Hello Regina', 'sunset', t).error).toMatch(/Insufficient/);
    store.state.bank.balance = 1e7; expect(buyAd(store, 'downtown-north', 1, 'visit www.x.com', 'sunset', t).ok).toBe(false); expect(store.state.ads['downtown-north']).toBeUndefined();
  });
});
describe('news', () => {
  it('always leads with honest weather/daylight and is deterministic per day', () => {
    const date = new Date('2026-01-20T18:00:00Z'), w = simulateWeather(date), clock = reginaClock(date);
    const a = generateNews({ date, clock, weather: w, season: 'winter', state: store.state }), b = generateNews({ date, clock, weather: w, season: 'winter', state: store.state });
    expect(a).toEqual(b); expect(a[0].tag).toBe('SIMULATED'); expect(a.some((n) => n.tag === 'DAYLIGHT')).toBe(true); expect(a.length).toBeGreaterThanOrEqual(6);
    expect(generateNews({ date, clock, weather: { ...w, live: true, temp: -28 }, season: 'winter' })[0].tag).toBe('ALERT');
  });
});
