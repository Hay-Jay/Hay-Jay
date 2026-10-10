import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import * as G from '../src/core/game.js';
import * as S from '../src/core/social.js';
import * as P from '../src/core/politics.js';
import { travel, tripBlocked } from '../src/core/travel.js';
import * as H from '../src/core/home.js';
import { resolveEvent as _resolve, issueEvent, EVENTS } from '../src/core/events.js';
import { RESIDENTS, findResident, searchResidents, residentReply } from '../src/data/residents.js';
import { CONTACTS, contactIds, npcReply } from '../src/data/contacts.js';
import { DESTINATIONS, DESTINATION_BY_ID } from '../src/data/destinations.js';
import { POLICIES, CANDIDATES } from '../src/data/policies.js';
import { FURNITURE, KEEPOUT, ROOM, sellPrice, wallPrice } from '../src/data/furniture.js';
import { adPrice } from '../src/core/ads.js';
import { AD_TIERS, DURATIONS } from '../src/data/billboards.js';
import { JOBS } from '../src/data/jobs.js';
import { FOOD } from '../src/data/catalog.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store; beforeEach(() => { t = 1_700_000_000_000; store = new Store(mem(), () => t); });
const resolveEvent = (st, id, i) => { issueEvent(st, id, t); return _resolve(st, id, i); };

describe('residents & friends (all NPCs)', () => {
  it('looks up by @handle, id or name fragment', () => {
    expect(findResident('@tobi.rgn').id).toBe('tobi'); expect(findResident('TOBI.RGN').id).toBe('tobi'); expect(findResident('nobody')).toBeNull();
    expect(searchResidents('kaya')[0].id).toBe('kaya'); expect(searchResidents('')).toEqual([]);
    expect(new Set(RESIDENTS.map((r) => r.handle)).size).toBe(RESIDENTS.length);
  });
  it('registers residents as contacts and labels them NPC', () => {
    expect(CONTACTS.tobi.sub).toMatch(/NPC resident/); expect(contactIds({ friends: { kaya: {} } })).toContain('kaya');
    expect(npcReply('priya', 'hello')).toMatch(/Hey/); expect(residentReply(findResident('jess'), 'blah').length).toBeGreaterThan(5);
  });
  it('adds friends once, with a limit, and greets you', () => {
    expect(S.addFriend(store, '@nope').ok).toBe(false);
    expect(S.addFriend(store, '@tobi.rgn', t).ok).toBe(true); expect(S.addFriend(store, 'tobi').error).toMatch(/already/);
    for (const r of RESIDENTS) S.addFriend(store, r.id, t); expect(S.friendIds(store.state)).toHaveLength(12);
  });
  it('hangouts cost money, need energy, have cooldowns and raise the bond', () => {
    S.addFriend(store, 'priya', t); const b0 = store.ledger.balance, l0 = store.state.friends.priya.level;
    expect(S.hangout(store, 'priya', 'coffee', t).ok).toBe(true); expect(store.ledger.balance).toBe(b0 - S.HANGOUTS.coffee.cost); expect(store.state.friends.priya.level).toBeGreaterThan(l0);
    expect(S.hangout(store, 'priya', 'walk', t + 1000).error).toMatch(/minute/);
    expect(S.hangout(store, 'priya', 'dinner', t + 60000).error).toMatch(/dating/);
    store.state.needs.energy = 10; expect(S.hangout(store, 'priya', 'gym', t + 60000).error).toMatch(/tired/);
    store.state.bank.balance = 100; expect(S.hangout(store, 'priya', 'movie', t + 60000).error).toMatch(/need/);
  });
  it('gifts: favourite items help more; must own item; cooldown', () => {
    S.addFriend(store, 'mei', t); expect(S.gift(store, 'mei', 'bread', t).error).toMatch(/have/);
    G.buyItem(store, 'bannock'); G.buyItem(store, 'chips'); const a = store.state.friends.mei.level;
    const g1 = S.gift(store, 'mei', 'bannock', t); expect(g1.loved).toBe(true); const d1 = store.state.friends.mei.level - a;
    const g2 = S.gift(store, 'mei', 'chips', t + 1000); expect(g2.error).toMatch(/recently/);
    const g3 = S.gift(store, 'mei', 'chips', t + 130000); const d2 = store.state.friends.mei.level; expect(g3.loved).toBe(false); expect(d1).toBeGreaterThan(5);
  });
  it('dating needs a good friendship, a datable NPC and no current partner; breakups hurt', () => {
    S.addFriend(store, 'omar', t); expect(S.askOut(store, 'omar').error).toMatch(/value your friendship/);
    S.addFriend(store, 'kaya', t); expect(S.askOut(store, 'kaya').error).toMatch(/Not yet/);
    store.state.friends.kaya.level = 70; expect(S.askOut(store, 'kaya').ok).toBe(true); expect(store.state.partner).toBe('kaya');
    S.addFriend(store, 'mei', t); store.state.friends.mei.level = 90; expect(S.askOut(store, 'mei').error).toMatch(/already seeing/);
    expect(S.hangout(store, 'kaya', 'dinner', t).ok).toBe(true);
    const lv = store.state.friends.kaya.level; expect(S.breakUp(store, 'kaya').ok).toBe(true); expect(store.state.friends.kaya.level).toBeLessThan(lv); expect(store.state.partner).toBeNull();
  });
  it('chatting is rate-limited; ignored friendships fade; friends text first', () => {
    S.addFriend(store, 'hannah', t); const a = store.state.friends.hannah.level;
    expect(S.chat(store, 'hannah', t + 40000)).toBe(true); expect(S.chat(store, 'hannah', t + 41000)).toBe(false); expect(store.state.friends.hannah.level).toBeGreaterThan(a);
    const b = store.state.friends.hannah.level; S.decaySocial(store, 1000, t + 40000 + 700000); expect(store.state.friends.hannah.level).toBeLessThan(b);
    const id = S.maybePing(store, () => 0, t + 1e6); expect(id).toBe('hannah'); expect(S.maybePing(store, () => 0, t + 1e6 + 1000)).toBeNull();
  });
});

describe('mayor elections (fictional)', () => {
  it('slates are deterministic, three distinct candidates', () => {
    const a = P.slateFor(4), b = P.slateFor(4); expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id)); expect(new Set(a.map((c) => c.id)).size).toBe(3);
    for (const c of CANDIDATES) expect(POLICIES[c.policy]).toBeTruthy();
  });
  it('vote once, only for someone on the ballot', () => {
    P.ensurePolitics(store, t); const [c] = P.slateFor(1);
    expect(P.vote(store, 'nobody', t).ok).toBe(false); expect(P.vote(store, c.id, t).ok).toBe(true); expect(P.vote(store, c.id, t).error).toMatch(/already/);
  });
  it('donations are validated and capped; canvassing is free', () => {
    P.ensurePolitics(store, t); expect(P.donate(store, 1000, t).error).toMatch(/Vote first/); P.vote(store, P.slateFor(1)[0].id, t);
    expect(P.donate(store, 777, t).ok).toBe(false); const b0 = store.ledger.balance; expect(P.donate(store, 5000, t).ok).toBe(true); expect(store.ledger.balance).toBe(b0 - 5000);
    for (let i = 0; i < 10; i++) P.canvass(store); expect(store.state.politics.points).toBeLessThanOrEqual(P.MAX_CAMPAIGN_POINTS);
  });
  it('simulation shares sum to 1 and your support helps', () => {
    const slate = P.slateFor(1), none = P.simulate(1, null, 0), backed = P.simulate(1, slate[0].id, 6);
    expect(none.reduce((a, c) => a + c.share, 0)).toBeCloseTo(1, 6);
    const share = (r, id) => r.find((x) => x.id === id).share; expect(share(backed, slate[0].id)).toBeGreaterThan(share(none, slate[0].id));
  });
  it('terms end, install the winner, reset votes and change real prices', () => {
    const p = P.ensurePolitics(store, t); expect(G.priceFor(store, 'bread')).toBe(Math.round(FOOD.bread.price * 0.88)); // default mayor: cheap groceries
    t += P.TERM_MS + 1000; expect(P.tallyIfDue(store, t)).toBe(1); expect(store.state.politics.term).toBe(2); expect(store.state.politics.vote).toBeNull(); expect(store.state.politics.history).toHaveLength(1);
    const pol = P.activePolicy(store.state); expect(pol).toBeTruthy();
    t += P.TERM_MS * 3; expect(P.tallyIfDue(store, t)).toBe(3);
  });
  it('policies really change wages, clothing, ads and fitness gains', () => {
    const st = store.state; P.ensurePolitics(store, t);
    st.politics.mayor.policy = 'fair_wages'; G.applyForJob(store, 'retail'); st.job.application.offerAt = 0; G.tickJobs(store); G.acceptOffer(store); G.startShift(store); for (let i = 0; i < 4; i++) G.completeTask(store);
    const real = store.now; store.now = () => t + 600000; const bal = store.ledger.balance; const r = G.finishShift(store); store.now = real; const raised = Math.round(JOBS.retail.levels[0].wage * 1.1); expect(r.pay).toBe(raised); expect(store.ledger.balance).toBe(bal + raised);
    st.politics.mayor.policy = 'wardrobe_rebate'; expect(G.priceFor(store, 'hoodie_red')).toBe(5850);
    st.politics.mayor.policy = 'open_signs'; expect(adPrice('victoria-west', 1, st)).toBe(Math.round((AD_TIERS.standard.price / 7) * DURATIONS[1] * 0.8));
    st.politics.mayor.policy = 'fit_city'; st.needs.energy = 90; G.doActivity(store, 'treadmill'); expect(st.skills.fitness).toBe(12.5);
  });
});

describe('intercity travel', () => {
  it('charges the fare, tires you, gives a scenario and a one-time souvenir', () => {
    const b0 = store.ledger.balance, e0 = store.state.needs.energy; const r = travel(store, 'saskatoon', 'bus', t, () => 0);
    expect(r.ok).toBe(true); expect(store.ledger.balance).toBe(b0 - DESTINATION_BY_ID.saskatoon.modes.bus.fare); expect(store.state.needs.energy).toBeLessThan(e0); expect(r.event.id).toBe('trip_saskatoon'); expect(store.state.souvenirs).toContain('saskatoon'); expect(r.first).toBe(true);
    expect(travel(store, 'saskatoon', 'bus', t + 1000).error).toMatch(/few minutes/);
    const r2 = travel(store, 'saskatoon', 'flight', t + 400000); expect(r2.first).toBe(false); expect(store.state.souvenirs.filter((x) => x === 'saskatoon')).toHaveLength(1);
  });
  it('validates mode, funds and energy', () => {
    expect(tripBlocked(store, 'banff', 'bus', t)).toMatch(/not available/); store.state.bank.balance = 100; expect(tripBlocked(store, 'moosejaw', 'bus', t)).toMatch(/need/);
    store.state.bank.balance = 1e6; store.state.needs.energy = 5; expect(tripBlocked(store, 'moosejaw', 'bus', t)).toMatch(/tired/);
  });
  it('every destination has a trip scenario whose choices resolve', () => {
    for (const d of DESTINATIONS) { const ev = EVENTS.find((e) => e.where.includes('trip:' + d.id)); expect(ev, d.id).toBeTruthy(); expect(ev.choices.length).toBe(3); }
    store.state.bank.balance = 1e6; expect(resolveEvent(store, 'trip_banff', 1).ok).toBe(true);
  });
});

describe('home decorating', () => {
  it('buy → place → move → remove → sell, all validated', () => {
    expect(H.placeFurniture(store, 'armchair', 0, 0, 0).error).toMatch(/none/);
    store.state.bank.balance = 1e6; // fund the player: the default balance is only $400
    const b0 = store.ledger.balance; expect(H.buyFurniture(store, 'armchair').ok).toBe(true); expect(store.ledger.balance).toBe(b0 - FURNITURE.armchair.price);
    const p = H.placeFurniture(store, 'armchair', 0.1, 0.9, 0); expect(p.ok).toBe(true); expect(p.item.x).toBe(0); expect(p.item.z).toBe(1); // snapped to 0.25 grid
    expect(H.placeFurniture(store, 'armchair', 1, 1, 0).error).toMatch(/none/);
    H.buyFurniture(store, 'armchair'); expect(H.placeFurniture(store, 'armchair', 0, 1.25, 0).error).toMatch(/Overlaps/);
    expect(H.moveFurniture(store, p.item.id, 1.5, 1, 1).ok).toBe(true); expect(H.sellFurniture(store, 'armchair').ok).toBe(true); // sells the spare one
    expect(H.sellFurniture(store, 'armchair').error).toMatch(/Remove it/); H.removeFurniture(store, p.item.id); expect(H.sellFurniture(store, 'armchair').refund).toBe(sellPrice(FURNITURE.armchair.price)); // 60% of list
  });
  it('rejects spots outside the room, on fixtures, or with bad numbers', () => {
    store.state.bank.balance = 1e6; H.buyFurniture(store, 'dining'); expect(H.canPlace(store.state, 'dining', 9, 0, 0).error).toMatch(/Outside/); expect(H.canPlace(store.state, 'dining', -3.2, -4, 0).error).toMatch(/bed/);
    expect(H.canPlace(store.state, 'dining', NaN, 0, 0).ok).toBe(false); expect(H.canPlace(store.state, 'dining', 0, 0, 7).ok).toBe(false); expect(H.canPlace(store.state, 'nope', 0, 0, 0).ok).toBe(false);
    expect(H.canPlace(store.state, 'dining', 0, 0.5, 0).ok).toBe(true);
  });
  it('rugs can sit under furniture; rotation swaps the footprint', () => {
    store.state.bank.balance = 1e6; H.buyFurniture(store, 'rug_round'); H.buyFurniture(store, 'dining'); H.placeFurniture(store, 'dining', 0, 0.5, 0); expect(H.placeFurniture(store, 'rug_round', 0, 0.5, 0).ok).toBe(true);
    expect(H.footprint('dining', 1)).toEqual({ w: 0.9, d: 1.5 });
  });
  it('limits placed pieces and unlocks free souvenir posters after trips', () => {
    store.state.bank.balance = 1e7; for (let i = 0; i < 2; i++) H.buyFurniture(store, 'side');
    expect(H.ownedTypes(store.state)).not.toContain('poster_banff'); store.state.souvenirs.push('banff'); expect(H.ownedTypes(store.state)).toContain('poster_banff');
    expect(H.placeFurniture(store, 'poster_banff', -1, -2, 0).ok).toBe(true); expect(H.placeFurniture(store, 'poster_banff', 1, -2, 0).error).toMatch(/none/);
  });
  it('paint and flooring cost once, then switching back is free', () => {
    store.state.bank.balance = 1e6; const b0 = store.ledger.balance; expect(H.setStyle(store, 'wall', 'sage').ok).toBe(true); expect(store.ledger.balance).toBe(b0 - wallPrice('sage'));
    expect(H.setStyle(store, 'wall', 'cream').ok).toBe(true); expect(H.setStyle(store, 'wall', 'sage').ok).toBe(true); expect(store.ledger.balance).toBe(b0 - wallPrice('sage')); expect(H.setStyle(store, 'floor', 'plaid').ok).toBe(false);
    store.state.bank.balance = 10; expect(H.setStyle(store, 'floor', 'walnut').error).toMatch(/Insufficient/);
  });
  it('catalog keepout zones lie inside the room', () => { for (const k of KEEPOUT) { expect(k.x0).toBeLessThan(k.x1); expect(k.z0).toBeLessThan(k.z1); } expect(Object.keys(FURNITURE).length).toBeGreaterThan(10); expect(ROOM.x1).toBeGreaterThan(0); });
});

import { STATIONS, STATION_BY_ID, trackTitle, barPlan, midiToFreq, PROGRESSIONS } from '../src/data/radio.js';
describe('radio data', () => {
  it('has stations and deterministic track titles', () => { expect(STATIONS.length).toBe(4); expect(trackTitle('jazz', 3)).toBe(trackTitle('jazz', 3)); expect(trackTitle('talk', 1)).toBe('Live'); expect(new Set(Array.from({ length: 12 }, (_, i) => trackTitle('lofi', i))).size).toBeGreaterThan(3); });
  it('midi → frequency', () => { expect(midiToFreq(69)).toBe(440); expect(midiToFreq(57)).toBeCloseTo(220, 5); });
  it('every musical station yields a non-empty, in-bar plan', () => {
    for (const id of ['lofi', 'country', 'jazz']) for (let bar = 0; bar < 8; bar++) { const plan = barPlan(id, bar, () => 0.2); expect(plan.length).toBeGreaterThan(3); for (const [off] of plan) { expect(off).toBeGreaterThanOrEqual(0); expect(off).toBeLessThan(4); } }
    expect(barPlan('talk', 0)).toEqual([]); expect(PROGRESSIONS.lofi).toHaveLength(4);
  });
});
