import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import * as G from '../src/core/game.js';
import * as SOC from '../src/core/social.js';
import { adopt, feedPet, playWithPet, buyPetFood, tickPet, petMood, sanitizePet, PET_KINDS, PET_FOOD } from '../src/core/pets.js';
import { buyCar, sellCar, repaintCar, sanitizeCar, CARS, SELL_BACK } from '../src/core/car.js';
import { isGameDay, matchup, buyTicket, watchGame, gamedayStatus, TICKET_PRICE, JERSEY_ID, sanitizeGameday } from '../src/core/gameday.js';
import { CLOTHES } from '../src/data/catalog.js';
import { JOBS } from '../src/data/jobs.js';
import { sanitize } from '../src/core/sanitize.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store; const rich = () => { store.state.bank.balance = 2_000_000; };
beforeEach(() => { t = Date.parse('2026-10-28T19:00:00Z'); store = new Store(mem(), () => t); });   // a Wednesday in Regina

describe('pets', () => {
  it('adopt costs the fee, needs a name, and one pet at a time', () => {
    rich(); const b = store.state.bank.balance;
    expect(adopt(store, 'dog', '  ').ok).toBe(false);
    const r = adopt(store, 'dog', 'Biscuit', 1); expect(r.ok).toBe(true); expect(store.state.bank.balance).toBe(b - PET_KINDS.dog.fee);
    expect(store.state.pet).toMatchObject({ kind: 'dog', name: 'Biscuit', color: 1, food: PET_FOOD.meals });
    expect(adopt(store, 'cat', 'Mittens').ok).toBe(false);
  });
  it('cannot adopt without the fee', () => { store.state.bank.balance = 100; expect(adopt(store, 'cat', 'Mittens').ok).toBe(false); expect(store.state.pet ?? null).toBe(null); });
  it('feeding uses food, playing lifts you and the pet; neglect makes it hungry, never gone', () => {
    rich(); adopt(store, 'cat', 'Mittens');
    store.state.pet.fed = 30; const r = feedPet(store); expect(r.ok).toBe(true); expect(store.state.pet.fed).toBe(75); expect(store.state.pet.food).toBe(PET_FOOD.meals - 1);
    const fun = store.state.needs.fun; expect(playWithPet(store).ok).toBe(true); expect(store.state.needs.fun).toBeGreaterThan(fun); expect(playWithPet(store).ok).toBe(false);
    tickPet(store, 100000); expect(petMood(store.state.pet)).toBe('Hungry'); expect(store.state.pet).toBeTruthy();
    store.state.pet.food = 0; t += 60_000; expect(feedPet(store).ok).toBe(false); expect(buyPetFood(store).ok).toBe(true); expect(store.state.pet.food).toBe(PET_FOOD.meals);
  });
  it('sanitizes bad saves', () => { expect(sanitizePet({ kind: 'dragon' })).toBe(null); expect(sanitizePet({ kind: 'dog', name: '', color: 99, fed: 500 })).toMatchObject({ name: 'Dog', color: 0, fed: 100 }); });
});

describe('car', () => {
  it('buy, repaint and sell back for half', () => {
    expect(buyCar(store, 'hatch').ok).toBe(false); rich(); const b = store.state.bank.balance;
    expect(buyCar(store, 'hatch', 2).ok).toBe(true); expect(store.state.car).toMatchObject({ model: 'hatch', color: 2 }); expect(buyCar(store, 'sedan').ok).toBe(false);
    expect(repaintCar(store, 4).ok).toBe(true); expect(store.state.car.color).toBe(4);
    const r = sellCar(store); expect(r.refund).toBe(CARS.hatch.price * SELL_BACK); expect(store.state.bank.balance).toBe(b - CARS.hatch.price + r.refund); expect(store.state.car).toBe(null);
  });
  it('sanitizes', () => { expect(sanitizeCar({ model: 'tank' })).toBe(null); expect(sanitizeCar({ model: 'pickup', color: -1 })).toMatchObject({ model: 'pickup', color: 0 }); });
});

describe('game day', () => {
  it('home games on Wednesday, Friday and Saturday; seeded score with no ties', () => {
    expect(isGameDay(t)).toBe(true); expect(isGameDay(t + 86400000)).toBe(false);
    const m = matchup('2026-10-28'); expect(matchup('2026-10-28')).toEqual(m); expect(m.home).not.toBe(m.vis); expect(m.win).toBe(m.home > m.vis);
  });
  it('ticket then watch once a day; first game gives the jersey', () => {
    expect(watchGame(store).ok).toBe(false); const b = store.state.bank.balance;
    expect(buyTicket(store).ok).toBe(true); expect(store.state.bank.balance).toBe(b - TICKET_PRICE); expect(buyTicket(store).ok).toBe(false);
    const fun = store.state.needs.fun; const r = watchGame(store); expect(r.ok).toBe(true); expect(r.jersey).toBe(true); expect(store.state.wardrobe).toContain(JERSEY_ID); expect(CLOTHES[JERSEY_ID]).toBeTruthy();
    expect(store.state.needs.fun).toBeGreaterThan(fun); expect(watchGame(store).ok).toBe(false); expect(gamedayStatus(store.state, t).watched).toBe(true);
    t += 86400000; expect(buyTicket(store).ok).toBe(false);   // Thursday: no game
    expect(sanitizeGameday({ ticket: 'x', games: -4 })).toEqual({ ticket: '', watched: '', games: 0, wins: 0 });
  });
});

describe('love steps', () => {
  const date = () => { const id = 'tobi'; SOC.addFriend(store, id); store.state.friends[id].level = 70; expect(SOC.askOut(store, id).ok).toBe(true); return id; };
  it('dating, then move in, propose and marry as the bond grows', () => {
    rich(); const id = date(); expect(SOC.loveStage(store.state)).toBe('dating');
    expect(SOC.loveStep(store, id).ok).toBe(false);                                // not close enough yet
    store.state.friends[id].level = 80; expect(SOC.loveStep(store, id).step).toBe('living');
    expect(SOC.hangoutBlocked(store, id, 'nightin')).toBe(null);
    store.state.friends[id].level = 90; const b = store.state.bank.balance; expect(SOC.loveStep(store, id).step).toBe('engaged'); expect(store.state.bank.balance).toBe(b - SOC.LOVE_STEP.engaged.cost);
    store.state.friends[id].level = 95; expect(SOC.loveStep(store, id).step).toBe('married'); expect(SOC.loveStep(store, id).ok).toBe(false);
    const s2 = sanitize(JSON.parse(JSON.stringify(store.state)), t); expect(s2.love.stage).toBe('married');
    SOC.breakUp(store, id); expect(store.state.love).toBe(null); expect(SOC.loveStage(store.state)).toBe(null);
  });
  it('night in is only for couples who live together', () => { const id = date(); expect(SOC.hangoutBlocked(store, id, 'nightin')).toMatch(/live together/); });
});

describe('cooking quality and promotions', () => {
  it('a perfect meal fills more and gives more XP than a burnt one', () => {
    const run = (q) => { store.state.inventory = { bread: 1, milk: 1 }; store.state.needs.hunger = 10; store.state.skills.cooking = 0; const r = G.cook(store, 'french_toast', q); return [r, store.state.needs.hunger, store.state.skills.cooking]; };
    const [rb, hb, xb] = run(0), [rp, hp, xp] = run(3); expect(rb.quality.name).toBe('Burnt'); expect(rp.quality.name).toBe('Perfect'); expect(hp).toBeGreaterThan(hb); expect(xp).toBeGreaterThan(xb);
  });
  it('every job has five levels', () => { for (const j of Object.values(JOBS)) expect(j.levels.length).toBe(5); });
});
