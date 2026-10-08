import { describe, it, expect, beforeEach } from 'vitest';
import { Ledger, fmtMoney, MAX_TX } from '../src/core/ledger.js';
import { Store } from '../src/core/store.js';
import * as G from '../src/core/game.js';
import { reginaClock, sunPosition, sunTimes, seasonOf } from '../src/core/time.js';
import { project } from '../src/core/geo.js';
import { npcReply } from '../src/data/contacts.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let clockMs, store;
beforeEach(() => { clockMs = 1_700_000_000_000; store = new Store(memStorage(), () => clockMs); });

describe('Ledger', () => {
  it('formats money', () => { expect(fmtMoney(123456)).toBe('$1,234.56'); expect(fmtMoney(-500)).toBe('-$5.00'); });
  it('rejects bad amounts', () => {
    const l = new Ledger({ balance: 1000, history: [] });
    for (const bad of [0, -5, 1.5, NaN, Infinity, '10', MAX_TX + 1]) expect(l.debit(bad, 'x').ok).toBe(false);
    expect(l.balance).toBe(1000);
  });
  it('blocks overdrafts and requires memo', () => {
    const l = new Ledger({ balance: 1000, history: [] });
    expect(l.debit(1001, 'x').error).toMatch(/Insufficient/);
    expect(l.debit(10, '').ok).toBe(false);
    expect(l.debit(1000, 'all').ok).toBe(true);
    expect(l.balance).toBe(0);
  });
  it('is idempotent on ref', () => {
    const l = new Ledger({ balance: 0, history: [] });
    expect(l.credit(100, 'pay', { ref: 'a' }).ok).toBe(true);
    expect(l.credit(100, 'pay', { ref: 'a' }).ok).toBe(false);
    expect(l.balance).toBe(100);
  });
  it('rate limits bursts', () => {
    const l = new Ledger({ balance: 1e6, history: [] }, { now: () => 5 });
    let ok = 0; for (let i = 0; i < 40; i++) if (l.debit(1, 'spam').ok) ok++;
    expect(ok).toBe(25);
  });
});

describe('Shopping & wardrobe', () => {
  it('buys food using catalog price, adds inventory', () => {
    const b = store.state.bank.balance;
    expect(G.buyItem(store, 'bread', 2).ok).toBe(true);
    expect(store.state.inventory.bread).toBe(2);
    expect(store.state.bank.balance).toBe(b - 449 * 2);
  });
  it('rejects unknown items / bad quantity / insufficient funds', () => {
    expect(G.buyItem(store, 'gold_bar', 1).ok).toBe(false);
    expect(G.buyItem(store, 'bread', -1).ok).toBe(false);
    expect(G.buyItem(store, 'bread', 1.5).ok).toBe(false);
    store.state.bank.balance = 100;
    expect(G.buyItem(store, 'jacket_black').error).toMatch(/Insufficient/);
    expect(store.state.wardrobe).not.toContain('jacket_black');
  });
  it('clothing: buy once, equip only if owned', () => {
    expect(G.equip(store, 'hoodie_red').ok).toBe(false);
    expect(G.buyItem(store, 'hoodie_red').ok).toBe(true);
    expect(G.buyItem(store, 'hoodie_red').error).toMatch(/owned/);
    expect(G.equip(store, 'hoodie_red').ok).toBe(true);
    expect(store.state.player.look.top).toBe('hoodie_red');
  });
  it('eating consumes inventory and raises hunger', () => {
    G.buyItem(store, 'sandwich'); store.state.needs.hunger = 10;
    expect(G.consume(store, 'sandwich').ok).toBe(true);
    expect(store.state.needs.hunger).toBe(48);
    expect(G.consume(store, 'sandwich').ok).toBe(false);
  });
});

describe('Jobs', () => {
  const hire = () => { G.applyForJob(store, 'retail'); clockMs += 26_000; G.tickJobs(store); return G.acceptOffer(store); };
  it('application → offer after delay → accept', () => {
    expect(G.applyForJob(store, 'retail').ok).toBe(true);
    G.tickJobs(store); expect(store.state.job.application.status).toBe('pending');
    clockMs += 26_000; G.tickJobs(store); expect(store.state.job.application.status).toBe('offered');
    expect(G.acceptOffer(store).ok).toBe(true);
    expect(store.state.job.active.id).toBe('retail');
  });
  it('shift pays only after real tasks and minimum time', () => {
    hire(); const bal = store.ledger.balance;
    G.startShift(store);
    expect(G.finishShift(store).error).toMatch(/Tasks remaining/);
    for (let i = 0; i < 4; i++) G.completeTask(store);
    expect(G.finishShift(store).error).toMatch(/suspiciously/);     // instant → withheld
    expect(store.ledger.balance).toBe(bal);
    clockMs += 60_000;
    const r = G.finishShift(store);
    expect(r.ok).toBe(true); expect(store.ledger.balance).toBe(bal + 9500);
    expect(store.state.job.active.xp).toBe(40);
  });
  it('cannot double-collect a shift', () => {
    hire(); G.startShift(store); for (let i = 0; i < 4; i++) G.completeTask(store); clockMs += 60_000;
    expect(G.finishShift(store).ok).toBe(true);
    expect(G.finishShift(store).ok).toBe(false);
  });
  it('promotes after enough XP', () => {
    hire(); store.state.job.active.xp = 70;
    G.startShift(store); for (let i = 0; i < 4; i++) G.completeTask(store); clockMs += 60_000;
    expect(G.finishShift(store).promoted).toBe('Senior Associate');
  });
  it('refuses to start shift when exhausted', () => {
    hire(); store.state.needs.energy = 5; expect(G.startShift(store).ok).toBe(false);
  });
});

describe('Messaging & transfers', () => {
  it('sends and stores messages; replies are NPC-labelled', () => {
    G.sendMessage(store, 'dani', 'hey', { reply: false });
    expect(store.state.messages.dani).toHaveLength(1);
    expect(npcReply('dani', 'im hungry')).toMatch(/Market/);
  });
  it('transfers only to people, validated', () => {
    expect(G.transferTo(store, 'market', 1000).ok).toBe(false);
    expect(G.transferTo(store, 'dani', 5000).ok).toBe(true);
    expect(store.ledger.balance).toBe(245000);
    expect(G.transferTo(store, 'dani', 99999999).ok).toBe(false);
  });
});

describe('Store persistence', () => {
  it('round-trips saves and tolerates corruption', () => {
    const st = memStorage();
    const a = new Store(st, () => 1); a.state.player.name = 'Riley'; a.save();
    expect(new Store(st, () => 1).state.player.name).toBe('Riley');
    st.setItem('reginalife.save.v1', '{not json');
    expect(new Store(st, () => 1).state.player.name).toBe('Alex');
  });
});

describe('Regina time & sun', () => {
  it('uses America/Regina (UTC-6, no DST)', () => {
    expect(reginaClock(new Date('2026-07-01T18:30:00Z')).label24).toBe('12:30');
    expect(reginaClock(new Date('2026-01-01T18:30:00Z')).label24).toBe('12:30');
  });
  it('seasons', () => { expect(seasonOf(1)).toBe('winter'); expect(seasonOf(7)).toBe('summer'); expect(seasonOf(10)).toBe('autumn'); });
  it('solstice daylight lengths are realistic', () => {
    const jun = sunTimes(new Date('2026-06-21T18:00:00Z')), dec = sunTimes(new Date('2026-12-21T18:00:00Z'));
    expect(jun.sunset - jun.sunrise).toBeGreaterThan(16); expect(jun.sunset - jun.sunrise).toBeLessThan(17.2);
    expect(dec.sunset - dec.sunrise).toBeGreaterThan(7.5); expect(dec.sunset - dec.sunrise).toBeLessThan(8.6);
    expect(jun.solarNoon).toBeGreaterThan(12.5); expect(jun.solarNoon).toBeLessThan(13.6);
  });
  it('sun is up at noon, down at midnight', () => {
    expect(sunPosition(new Date('2026-06-21T19:00:00Z')).altitude).toBeGreaterThan(0.8);
    expect(sunPosition(new Date('2026-06-22T06:00:00Z')).altitude).toBeLessThan(0);
  });
});

describe('Geo', () => {
  it('projects Regina landmarks sensibly', () => {
    const airport = project(50.4319, -104.6658), uni = project(50.4165, -104.589);
    expect(airport.x).toBeLessThan(0); expect(uni.z).toBeGreaterThan(0);
    expect(Math.hypot(airport.x, airport.z)).toBeGreaterThan(3000);
  });
});

describe('Cooking', () => {
  it('needs all ingredients, consumes them, restores hunger', () => {
    expect(G.cook(store, 'apple_toast').ok).toBe(false);
    G.buyItem(store, 'bread'); G.buyItem(store, 'apple');
    store.state.needs.hunger = 10;
    expect(G.cook(store, 'apple_toast').ok).toBe(true);
    expect(store.state.needs.hunger).toBe(52);
    expect(store.state.inventory.bread).toBeUndefined();
    expect(G.cook(store, 'nope').ok).toBe(false);
  });
});

describe('Airplane mode', () => {
  it('holds incoming messages until airplane mode ends', () => {
    store.state.phone.airplane = true;
    G.receiveMessage(store, 'dani', 'hello?');
    expect(store.state.messages.dani ?? []).toHaveLength(0);
    store.state.phone.airplane = false; G.flushPending(store);
    expect(store.state.messages.dani).toHaveLength(1);
    expect(G.unreadTotal(store.state)).toBe(1);
  });
});
