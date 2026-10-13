/** The phone's Homes app: the pure card model (numbers straight from core/move.js), the move confirmation, the floor-plan sketch, and the app's DOM behaviour. */
import './helpers/canvas-stub.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homeCards, moveConfirm, planText, planSvg, plural } from '../src/ui/homes-model.js';
import { planMove, tierOptions } from '../src/core/move.js';
import * as H from '../src/core/home.js';
import { fmtMoney } from '../src/core/ledger.js';
import { HOMES, HOME_ORDER } from '../src/data/homes.js';
import { makeStore, ownAll } from './helpers/home-env.js';
import { El } from './helpers/fake-dom.js';

const cardOf = (cards, id) => cards.find((c) => c.id === id);

describe('homeCards (pure)', () => {
  it('one card per home, smallest first, with the layout\'s own names and sizes', () => {
    const { store } = makeStore({ layout: 'studio' }), cards = homeCards(store.state);
    expect(cards.map((c) => c.id)).toEqual(HOME_ORDER); expect(cards.map((c) => c.name)).toEqual(['Studio', 'One-bedroom', 'Bungalow']); expect(cards.map((c) => c.rooms)).toEqual([1, 2, 5]);
    expect(cards.map((c) => c.roomsLabel)).toEqual(['1 room', '2 rooms', '5 rooms']); expect(cards[1].roomNames).toEqual(['Living room', 'Bedroom']); expect(cards[0].title).toBe(HOMES.studio.title);
    for (const c of cards) expect(c.areaLabel, c.id).toMatch(/^\d+ m²$/);
  });
  it('Studio: Current on the Studio, a Move in for both higher homes, nothing "Owned" yet', () => {
    const { store } = makeStore({ layout: 'studio' }), cards = homeCards(store.state);
    expect(cards.map((c) => c.badge)).toEqual(['Current', null, null]); expect(cards.map((c) => c.canMove)).toEqual([false, true, true]); expect(cardOf(cards, 'studio').price).toBe(0); expect(cardOf(cards, 'studio').priceLabel).toBe('');
  });
  it('One-bedroom: the Studio is Owned, the One-bedroom Current, only the Bungalow can be moved to', () => {
    const { store } = makeStore({ layout: 'onebed' }), cards = homeCards(store.state);
    expect(cards.map((c) => c.badge)).toEqual(['Owned', 'Current', null]); expect(cards.map((c) => c.canMove)).toEqual([false, false, true]); expect(cards.map((c) => c.current)).toEqual([false, true, false]);
  });
  it('Bungalow: nothing left to move to; both lower homes are Owned', () => {
    const { store } = makeStore({ layout: 'bungalow' }), cards = homeCards(store.state);
    expect(cards.map((c) => c.badge)).toEqual(['Owned', 'Owned', 'Current']); expect(cards.some((c) => c.canMove)).toBe(false); expect(cards.every((c) => c.price === 0 && c.priceLabel === '')).toBe(true); expect(cards.map((c) => c.reason)).toEqual(['No downgrades', 'No downgrades', 'Already living there']);
  });
  it('the price is the difference of home values (1,500 / 5,000 from the Studio, 3,500 from the One-bedroom), formatted with fmt', () => {
    const studio = homeCards(makeStore({ layout: 'studio' }).store.state), one = homeCards(makeStore({ layout: 'onebed' }).store.state);
    expect([cardOf(studio, 'onebed').price, cardOf(studio, 'bungalow').price, cardOf(one, 'bungalow').price]).toEqual([150000, 500000, 350000]);
    expect(cardOf(studio, 'onebed').priceLabel).toBe(fmtMoney(150000)); expect(cardOf(studio, 'bungalow').priceLabel).toBe('$5,000.00'); expect(homeCards(makeStore().store.state, (c) => `${c}c`)[1].priceLabel).toBe('150000c');
  });
  it('affordability: exactly enough can move, one cent short cannot and says how much is missing', () => {
    for (const [balance, ok] of [[150000, true], [149999, false], [0, false], [10_000_000, true]]) {
      const { store } = makeStore({ layout: 'studio', balance }), c = cardOf(homeCards(store.state), 'onebed');
      expect(c.canAfford, String(balance)).toBe(ok); expect(c.shortBy).toBe(ok ? 0 : 150000 - balance); expect(c.reason).toBe(ok ? '' : `Need ${fmtMoney(150000 - balance)} more`);
    }
  });
  it('the numbers agree with core/move.js: tierOptions and planMove, including what comes along and what goes to storage', () => {
    const { store } = makeStore({ layout: 'studio' }); ownAll(store, 1);
    let n = 0; for (const t of Object.keys(store.state.home.owned)) { if (n >= 14) break; for (let x = -3.5; x <= 3.5 && n < 14; x += 0.5) for (let z = -4.5; z <= 4.5; z += 0.5) if (H.canPlace(store.state, t, x, z, 0).ok && H.availableToPlace(store.state, t) > 0) { H.placeFurniture(store, t, x, z, 0); n++; break; } }
    expect(store.state.home.placed.length).toBeGreaterThan(5);
    const cards = homeCards(store.state), opts = tierOptions(store.state);
    for (const id of ['onebed', 'bungalow']) { const p = planMove(store.state, id), c = cardOf(cards, id); expect(c.carried, id).toBe(p.carried); expect(c.stored, id).toBe(p.storedCount); expect(c.carried + c.stored).toBe(store.state.home.placed.length); expect(c.price).toBe(p.price); expect(c.canAfford).toBe(cardOf(opts.map((o) => ({ ...o })), id).canAfford); }
    expect(cardOf(cards, 'studio').planLabel).toBe('');
  });
  it('a move that cannot happen carries its reason instead of a price', () => {
    const { store } = makeStore({ layout: 'onebed' }), c = cardOf(homeCards(store.state), 'studio'); expect(c).toMatchObject({ canMove: false, price: 0, priceLabel: '', planLabel: '' });
  });
  it('a corrupt balance is treated as zero (never NaN in the UI)', () => {
    const { store } = makeStore({ layout: 'studio' }); store.state.bank.balance = NaN; const c = cardOf(homeCards(store.state), 'onebed'); expect(c.shortBy).toBe(150000); expect(c.canAfford).toBe(false);
  });
});

describe('planText, moveConfirm', () => {
  it('says plainly what happens to the furniture, with singular and plural right', () => {
    expect(planText(7, 2)).toBe('7 pieces come with you and 2 go to storage'); expect(planText(1, 1)).toBe('1 piece comes with you and 1 goes to storage'); expect(planText(0, 3)).toBe('3 pieces will go to storage');
    expect(planText(4, 0)).toBe('All 4 of your placed pieces come with you'); expect(planText(1, 0)).toBe('Your 1 placed piece comes with you'); expect(planText(0, 0)).toMatch(/nothing placed/); expect(plural(1, 'room')).toBe('1 room'); expect(plural(2, 'room')).toBe('2 rooms');
  });
  it('the confirmation is a title question plus one plain sentence with the price, and offers "Move in"', () => {
    const { store } = makeStore({ layout: 'studio' }); store.state.home.owned = { plant: 2 }; H.placeFurniture(store, 'plant', 0.5, 1, 0);
    const c = cardOf(homeCards(store.state), 'onebed'), m = moveConfirm(c);
    expect(m.title).toBe('Move to the One-bedroom?'); expect(m.yes).toBe('Move in'); expect(m.text).toContain('$1,500.00'); expect(m.text).toMatch(/1 placed piece comes with you/); expect(m.text.endsWith('.')).toBe(true); expect(/\.\s/.test(m.text)).toBe(false);   // one sentence
  });
});

describe('planSvg', () => {
  it('draws one rect per room, to scale, inside its box, for every home', () => {
    for (const id of HOME_ORDER) {
      const svg = planSvg(id, 84), rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*data-room="(\w+)"/g)];
      expect(rects.map((m) => m[5]), id).toEqual(HOMES[id].rooms.map((r) => r.id));
      for (const [, x, y, w, h] of rects) { expect(+x).toBeGreaterThanOrEqual(0); expect(+y).toBeGreaterThanOrEqual(0); expect(+x + +w).toBeLessThanOrEqual(84.05); expect(+y + +h).toBeLessThanOrEqual(84.05); }
      const L = HOMES[id], total = L.rooms.reduce((a, r) => a + (r.floor.x1 - r.floor.x0) * (r.floor.z1 - r.floor.z0), 0), drawn = rects.reduce((a, m) => a + +m[3] * +m[4], 0);
      expect(drawn / total, `${id} scale`).toBeGreaterThan(0); const k = Math.sqrt(drawn / total); for (const [i, m] of rects.entries()) { const r = L.rooms[i].floor; expect(+m[3] / ((r.x1 - r.x0) * k)).toBeCloseTo(1, 1); }
    }
  });
  it('is north-up: the bedroom is drawn above the living room', () => {
    const svg = planSvg('onebed'), y = (room) => +svg.match(new RegExp(`y="([\\d.]+)"[^>]*data-room="${room}"`))[1]; expect(y('bedroom')).toBeLessThan(y('living'));
  });
  it('has an accessible name and survives bad input', () => {
    expect(planSvg('studio')).toContain('aria-label="Floor plan: one room"'); expect(planSvg('bungalow')).toContain('Living room, Bedroom, Bathroom, Den, Garage'); expect(planSvg('nope')).toBe(''); expect(planSvg(null)).toBe(''); expect(planSvg({ rooms: [] })).toBe('');
  });
});

describe('the Homes app (DOM)', () => {
  let body, ctx, inst, toasts, confirms, moves, env;
  const mkCtx = (over = {}) => ({ store: env.store, toast: (m, k) => toasts.push([m, k]), audio: { blip: vi.fn() }, confirm: (t, x, y, run) => confirms.push({ t, x, y, run }), moveHome: (id) => moves.push(id), ...over });
  const mount = async (layout = 'studio', balance = 5e9, over = {}) => {
    const { APP_BY_ID } = await import('../src/ui/apps.js');
    env = makeStore({ layout, balance }); toasts = []; confirms = []; moves = []; body = new El('div'); ctx = mkCtx(over); inst = APP_BY_ID.homes.mount(body, ctx, {}); return inst;
  };
  const click = (el) => body.dispatch('click', { target: { closest: (sel) => (sel === '[data-move]' && el ? { dataset: el.dataset, disabled: !!el.disabled } : null) } });
  const html = () => body.innerHTML;
  const btn = (id) => html().match(new RegExp(`<button[^>]*data-move="${id}"[^>]*>`))?.[0] ?? null;
  const card = (id) => html().match(new RegExp(`<article[^>]*data-tier="${id}"[\\s\\S]*?</article>`))?.[0] ?? null;
  beforeEach(() => { globalThis.MutationObserver = class { observe() {} takeRecords() { return []; } disconnect() {} }; });
  afterEach(() => { delete globalThis.MutationObserver; });

  it('shows one card per home, marks the current one and says where you live', async () => {
    await mount('studio'); for (const id of HOME_ORDER) expect(card(id), id).toBeTruthy();
    expect(html()).toContain(HOMES.studio.title); expect(card('studio')).toContain('Current'); expect(card('studio')).toContain('aria-current="true"'); expect(card('onebed')).not.toContain('Current'); expect(card('onebed')).toContain('Living room'); expect(html()).toContain('<svg class="hm-plan"');
  });
  it('Move in buttons exist only for strictly higher homes', async () => {
    await mount('studio'); expect([btn('studio'), btn('onebed'), btn('bungalow')].map((b) => !!b)).toEqual([false, true, true]);
    await mount('onebed'); expect([btn('studio'), btn('onebed'), btn('bungalow')].map((b) => !!b)).toEqual([false, false, true]); expect(card('studio')).toContain('Owned');
    await mount('bungalow'); expect(html()).not.toContain('data-move='); expect(card('bungalow')).toContain('Current'); expect(card('onebed')).toContain('Owned');
  });
  it('an unaffordable move is kept in the DOM but disabled, with the reason written next to it', async () => {
    await mount('studio', 100000); const b = btn('onebed'); expect(b).toContain('disabled'); expect(b).toContain('aria-describedby="hm-why-onebed"'); expect(card('onebed')).toContain(`Need ${fmtMoney(50000)} more`); expect(card('onebed')).toContain('id="hm-why-onebed"');
    expect(btn('bungalow')).toContain('disabled'); expect(card('bungalow')).toContain(`Need ${fmtMoney(400000)} more`);
    await mount('studio', 150000); expect(btn('onebed')).not.toContain('disabled'); expect(card('onebed')).not.toContain('hm-why'); expect(btn('bungalow')).toContain('disabled');
  });
  it('tapping Move in asks first (price and furniture in one sentence) and only the confirmation moves house', async () => {
    await mount('studio'); click({ dataset: { move: 'onebed' } });
    expect(moves).toEqual([]); expect(confirms).toHaveLength(1); expect(confirms[0]).toMatchObject({ t: 'Move to the One-bedroom?', y: 'Move in' }); expect(confirms[0].x).toContain('$1,500.00');
    confirms[0].run(); expect(moves).toEqual(['onebed']);
  });
  it('the Bungalow from the Studio asks about $5,000.00', async () => {
    await mount('studio'); click({ dataset: { move: 'bungalow' } }); expect(confirms[0].t).toBe('Move to the Bungalow?'); expect(confirms[0].x).toContain('$5,000.00');
  });
  it('a disabled button, an unknown id and a lower home do nothing', async () => {
    await mount('studio', 0); click({ dataset: { move: 'onebed' }, disabled: true }); click({ dataset: { move: 'palace' } }); click({ dataset: { move: '__proto__' } }); click(null); expect(confirms).toEqual([]); expect(moves).toEqual([]);
    await mount('onebed'); click({ dataset: { move: 'studio' } }); expect(confirms).toEqual([]);
  });
  it('if the money vanished after the card was drawn, the tap says so instead of asking', async () => {
    await mount('studio', 150000); env.store.state.bank.balance = 10; click({ dataset: { move: 'onebed' } }); expect(confirms).toEqual([]); expect(toasts.at(-1)).toEqual([`Need ${fmtMoney(149990)} more`, 'warn']); expect(ctx.audio.blip).toHaveBeenCalledWith('error');
  });
  it('without ctx.moveHome (the integrator has not wired it) the tap explains instead of throwing or asking', async () => {
    await mount('studio', 5e9, { moveHome: undefined }); expect(() => click({ dataset: { move: 'onebed' } })).not.toThrow(); expect(confirms).toEqual([]); expect(toasts.at(-1)[1]).toBe('warn');
  });
  it('the confirm callback guards moveHome too (it may disappear between the ask and the answer)', async () => {
    await mount('studio'); click({ dataset: { move: 'onebed' } }); ctx.moveHome = undefined; expect(() => confirms[0].run()).not.toThrow();
  });
  it('redraws only for the topics that change it: home and bank (plus a bare/deferred update when the phone opens)', async () => {
    await mount('studio'); let writes = 0; const orig = Object.getOwnPropertyDescriptor(El.prototype, 'innerHTML');
    Object.defineProperty(body, 'innerHTML', { set(v) { writes++; orig.set.call(this, v); }, get() { return orig.get.call(this); }, configurable: true });
    for (const t of ['needs', 'weather', 'phone', 'messages', 'jobs', 'notify', 'reset', 'clock']) inst.update(t); expect(writes).toBe(0);
    inst.update('home'); expect(writes).toBe(1); inst.update('bank'); expect(writes).toBe(2); inst.update(); expect(writes).toBe(3); inst.update('deferred'); expect(writes).toBe(4);
  });
  it('after the move the card flips: the new home is Current, the old one Owned, and its Move in is gone', async () => {
    await mount('studio'); expect(btn('onebed')).toBeTruthy(); env.store.state.home.layout = 'onebed'; inst.update('home');
    expect(card('onebed')).toContain('Current'); expect(card('studio')).toContain('Owned'); expect(btn('onebed')).toBeNull(); expect(btn('bungalow')).toBeTruthy(); expect(html()).toContain(HOMES.onebed.title);
  });
  it('a balance change redraws the affordability: earning enough enables the button', async () => {
    await mount('studio', 100000); expect(btn('onebed')).toContain('disabled'); env.store.state.bank.balance = 200000; inst.update('bank'); expect(btn('onebed')).not.toContain('disabled'); expect(card('onebed')).not.toContain('hm-why');
  });
  it('escapes everything it prints', async () => {
    await mount('studio'); const t = HOMES.onebed.title; HOMES.onebed.title = '<img src=x onerror=alert(1)>'; try { inst.update('home'); expect(html()).not.toContain('<img src=x'); expect(html()).toContain('&lt;img'); } finally { HOMES.onebed.title = t; }
  });
});

describe('registration', () => {
  it('Homes is a phone app with an icon and colours (a missing entry would break the phone home screen)', async () => {
    const { APPS, APP_BY_ID } = await import('../src/ui/apps.js'), { ICON, APP_STYLE } = await import('../src/ui/icons.js');
    expect(APP_BY_ID.homes).toMatchObject({ id: 'homes', name: 'Homes' }); expect(APPS.filter((a) => a.id === 'homes')).toHaveLength(1);
    expect(ICON.homes).toContain('<svg'); expect(APP_STYLE.homes).toHaveLength(2); expect(APP_STYLE.homes.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
    for (const a of APPS) { expect(ICON[a.id], a.id).toBeTruthy(); expect(APP_STYLE[a.id], a.id).toBeTruthy(); }
    expect(new Set(APPS.map((a) => a.id)).size).toBe(APPS.length);
  });
  it('the phone puts Homes on page 2 (and only there)', async () => {
    globalThis.addEventListener = () => {}; globalThis.innerWidth = 400; globalThis.innerHeight = 800;
    try {
      const { Phone } = await import('../src/ui/phone.js'), { store } = makeStore(), root = new El('div'); root.style = { setProperty() {} };
      new Phone(root, { store: Object.assign(store, { subscribe() {} }), clock: () => ({ label: '9:00', date: new Date(), dateLabel: '', shortDate: '', ampm: 'AM' }), weather: () => ({ icon: '', temp: 0, text: '', hi: 0, lo: 0, live: false }), audio: null });
      const home = root.querySelector('.home').innerHTML, p2 = home.slice(home.indexOf('page p2')), p1 = home.slice(0, home.indexOf('page p2'));
      expect(p2).toContain('data-app="homes"'); expect(p1).not.toContain('data-app="homes"'); expect(p2).toContain('aria-label="Homes"');
    } finally { delete globalThis.addEventListener; delete globalThis.innerWidth; delete globalThis.innerHeight; }
  });
});
