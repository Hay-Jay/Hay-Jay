/** The Design shelf on multi-room homes: room chips, room-scoped swatches, the Mixed header, and prices that always equal what the ledger charges. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as M from '../src/ui/catalogue-model.js';
import { Catalogue, bodyHTML, roomsHTML } from '../src/ui/catalogue.js';
import * as H from '../src/core/home.js';
import { WALLS, FLOORS, WALL_PRICE, FLOOR_PRICE, wallPrice, floorPrice } from '../src/data/furniture.js';
import { HOMES, HOME_ORDER } from '../src/data/homes.js';
import { makeStore } from './helpers/home-env.js';
import { El, tapOn, idsIn } from './helpers/fake-dom.js';

const fmt = (c) => '$' + (c / 100).toFixed(2);
const LAYOUTS = HOME_ORDER, ROOMS = (id) => HOMES[id].rooms.map((r) => r.id);
const scopes = (id) => [null, ...(HOMES[id].rooms.length > 1 ? ROOMS(id) : [])];
const card = (view, kind, key) => view.cards.find((c) => c.kind === kind && c.key === key);

describe('Design view-model: rooms', () => {
  it('single-room homes have no chip list and no Mixed header', () => {
    const { store } = makeStore({ layout: 'studio' }), v = M.tabView(store.state, M.TAB_DESIGN, 0, { room: 'living' });
    expect(v.rooms).toBeUndefined(); expect(v.room).toBeNull(); expect(v.sections.every((s) => !s.mixed)).toBe(true);
  });
  it('multi-room homes list "All rooms" first and then every room in layout order, never as a section or a card', () => {
    for (const id of ['onebed', 'bungalow']) {
      const { store } = makeStore({ layout: id }), v = M.tabView(store.state, M.TAB_DESIGN, 0);
      expect(v.rooms.map((r) => r.id)).toEqual(['all', ...ROOMS(id)]); expect(v.rooms[0]).toEqual({ id: 'all', label: 'All rooms', active: true }); expect(v.rooms.slice(1).every((r) => r.active === false)).toBe(true);
      expect(v.rooms.slice(1).map((r) => r.label)).toEqual(HOMES[id].rooms.map((r) => r.name)); expect(v.sections.map((s) => s.id)).toEqual(['walls', 'floors']); expect(v.cards.every((c) => c.kind === 'wall' || c.kind === 'floor')).toBe(true);
    }
  });
  it('only the design tab carries rooms', () => {
    const { store } = makeStore({ layout: 'bungalow' }); for (const t of M.tabList(store.state).filter((x) => x.kind !== 'design')) { const v = M.tabView(store.state, t.id, 0, { room: 'den' }); expect(v.rooms, t.id).toBeUndefined(); }
  });
  it('a room makes exactly its own style the active one; All rooms is active only when every room agrees', () => {
    const { store } = makeStore({ layout: 'bungalow', home: { walls: ['cream', 'sage', 'sky'], floors: ['oak', 'birch'], rooms: { bedroom: { wall: 'sky', floor: 'birch' } } } });
    const s = store.state, at = (room) => M.tabView(s, M.TAB_DESIGN, 0, { room });
    expect(at('bedroom').room).toBe('bedroom'); expect(card(at('bedroom'), 'wall', 'sky').active).toBe(true); expect(card(at('bedroom'), 'wall', 'cream').active).toBe(false); expect(at('bedroom').rooms.find((r) => r.active).id).toBe('bedroom');
    expect(card(at('den'), 'wall', 'cream').active).toBe(true); expect(card(at('den'), 'floor', 'oak').active).toBe(true);
    const all = at(null); expect(all.room).toBeNull(); expect(all.cards.filter((c) => c.active)).toEqual([]); expect(all.sections.map((x) => x.mixed)).toEqual([true, true]); expect(all.rooms[0].active).toBe(true);
  });
  it('All rooms shows the shared style once the rooms agree again (only the kind that differs stays Mixed)', () => {
    const { store } = makeStore({ layout: 'onebed', home: { walls: ['cream', 'sage'], rooms: { bedroom: { wall: 'sage' } } } }), v = M.tabView(store.state, M.TAB_DESIGN, 0);
    expect(v.sections.map((x) => x.mixed)).toEqual([true, false]); expect(card(v, 'floor', 'oak').active).toBe(true); expect(card(v, 'wall', 'sage').active).toBe(false);
    store.state.home.rooms = {}; store.state.home.wall = 'sage'; const w = M.tabView(store.state, M.TAB_DESIGN, 0); expect(w.sections[0].mixed).toBe(false); expect(card(w, 'wall', 'sage').active).toBe(true);
  });
  it('unknown, hostile or foreign room ids mean All rooms', () => {
    const { store } = makeStore({ layout: 'onebed' });
    for (const bad of ['nope', '__proto__', 'constructor', 'garage', 'all', 5, {}, undefined]) { const v = M.tabView(store.state, M.TAB_DESIGN, 0, { room: bad }); expect(v.room, String(bad)).toBeNull(); expect(v.rooms[0].active).toBe(true); }
    expect(M.designRoom(store.state, 'bedroom')).toBe('bedroom'); expect(M.designRoom(store.state, 'garage')).toBeNull(); expect(M.roomName(store.state, 'bedroom')).toBe('Bedroom'); expect(M.roomName(store.state, 'garage')).toBeNull();
  });
  it('the Studio never has a room, even when asked for one', () => {
    const { store } = makeStore({ layout: 'studio' }); expect(M.designRoom(store.state, 'living')).toBeNull(); expect(M.designCards(store.state, 0, 'living').walls.find((c) => c.key === 'cream').active).toBe(true);
  });
});

describe('Design prices equal the ledger, for every style, layout and room scope', () => {
  const keys = [...Object.keys(WALLS).map((k) => ['wall', k]), ...Object.keys(FLOORS).map((k) => ['floor', k])];
  it('the displayed list price is the style\'s own price (premium swatches are not the cheap flat rate)', () => {
    const { store } = makeStore({ layout: 'bungalow' }), v = M.tabView(store.state, M.TAB_DESIGN, 1e9);
    for (const [kind, key] of keys) { const c = card(v, kind, key); expect(c.price, `${kind}:${key}`).toBe(kind === 'wall' ? wallPrice(key) : floorPrice(key)); }
    expect(card(v, 'floor', 'ebony').price).toBe(94900); expect(card(v, 'floor', 'ebony').price).not.toBe(FLOOR_PRICE); expect(card(v, 'wall', 'navy').price).toBe(12900); expect(card(v, 'wall', 'navy').price).not.toBe(WALL_PRICE);
  });
  for (const layout of LAYOUTS) {
    it(`${layout}: for every WALLS and FLOORS key, the card's cost = applyStyle's paid = the balance that left the account (all rooms and each room)`, () => {
      for (const room of scopes(layout)) for (const [kind, key] of keys) {
        const { store } = makeStore({ layout }), before = store.ledger.balance, shown = card(M.tabView(store.state, M.TAB_DESIGN, before, { room }), kind, key), tag = `${layout}/${room ?? 'all'}/${kind}:${key}`;
        const r = M.applyStyle(store, kind, key, room); expect(r.ok, tag).toBe(true);
        expect(before - store.ledger.balance, tag).toBe(r.paid); expect(shown.cost, tag).toBe(r.paid); expect(shown.cost, tag).toBe(shown.owned ? 0 : shown.price);
        // paid for once: the same style anywhere else in the house is free from now on
        for (const other of scopes(layout)) { const q = card(M.tabView(store.state, M.TAB_DESIGN, 0, { room: other }), kind, key); expect(q.cost, `${tag} then ${other ?? 'all'}`).toBe(0); expect(q.owned).toBe(true); }
        const b1 = store.ledger.balance; expect(M.applyStyle(store, kind, key, room)).toMatchObject({ ok: true, paid: 0 }); expect(store.ledger.balance).toBe(b1);
      }
    });
  }
  it('an unaffordable style is refused for a room before anything is charged', () => {
    const { store } = makeStore({ layout: 'bungalow', balance: floorPrice('ebony') - 1 }), before = store.ledger.balance, hist = store.state.bank.history.length;
    expect(M.applyStyle(store, 'floor', 'ebony', 'den')).toEqual({ ok: false, error: 'not-enough', shortBy: 1 }); expect(store.ledger.balance).toBe(before); expect(store.state.bank.history).toHaveLength(hist); expect(store.state.home.rooms).toEqual({});
    const v = M.tabView(store.state, M.TAB_DESIGN, before, { room: 'den' }); expect(card(v, 'floor', 'ebony')).toMatchObject({ canAfford: false, shortBy: 1, cost: floorPrice('ebony') });
  });
  it('an unknown room is refused without charging; an unknown style too', () => {
    const { store } = makeStore({ layout: 'bungalow' }), before = store.ledger.balance;
    expect(M.applyStyle(store, 'wall', 'navy', 'attic')).toMatchObject({ ok: false }); expect(M.applyStyle(store, 'wall', 'lava', 'den').ok).toBe(false); expect(store.ledger.balance).toBe(before);
  });
  it('a room apply writes only that room; All rooms sets the default and clears every override of that kind', () => {
    const { store } = makeStore({ layout: 'bungalow' }); M.applyStyle(store, 'wall', 'sage', 'bedroom'); M.applyStyle(store, 'floor', 'birch', 'bedroom'); M.applyStyle(store, 'wall', 'sky', 'den');
    expect(store.state.home.rooms).toEqual({ bedroom: { wall: 'sage', floor: 'birch' }, den: { wall: 'sky' } }); expect(store.state.home.wall).toBe('cream');
    M.applyStyle(store, 'wall', 'sage', null); expect(store.state.home.wall).toBe('sage'); expect(store.state.home.rooms).toEqual({ bedroom: { floor: 'birch' } });
    expect(H.styleOf(store.state, 'den').wall).toBe('sage'); expect(H.styleOf(store.state, 'bedroom').floor).toBe('birch');
  });
});

describe('Catalogue sheet: room chips', () => {
  let win, build, toasts, changes, cat, env;
  const setup = () => {
    win = {}; globalThis.document = { createElement: (t) => new El(t), body: new El('body'), activeElement: null };
    globalThis.addEventListener = vi.fn((t, f) => { win[t] = f; }); globalThis.removeEventListener = vi.fn((t) => { delete win[t]; }); globalThis.matchMedia = () => ({ matches: false }); globalThis.innerHeight = 800;
  };
  const make = (layout, home = {}) => {
    env = makeStore({ layout, home }); build = { active: false, start: vi.fn(), select: vi.fn(), refresh: vi.fn(), layout: vi.fn() }; toasts = []; changes = [];
    cat = new Catalogue({ store: env.store, build, audio: { blip: vi.fn() }, toast: (m, k) => toasts.push([m, k]), fmtMoney: fmt, onChange: (d) => changes.push(d) }); return cat;
  };
  beforeEach(() => { vi.useFakeTimers(); setup(); });
  afterEach(() => { vi.useRealTimers(); for (const k of ['document', 'addEventListener', 'removeEventListener', 'matchMedia', 'innerHeight']) delete globalThis[k]; });
  const tapRoom = (id) => cat.root.dispatch('click', tapOn({ act: 'room', id }));
  const tapStyle = (kind, key) => cat.root.dispatch('click', tapOn({ act: 'style', kind, key, id: `${kind}:${key}` }));

  it('single-room homes get no chip row at all', () => {
    make('studio'); cat.open('design'); expect(cat.$rooms.hidden).toBe(true); expect(cat.$rooms.innerHTML).toBe(''); expect(cat.room).toBeNull(); expect(cat.$body.innerHTML).not.toContain('Mixed');
  });
  it('multi-room homes: the chips sit in their own .cat-rooms element, only on the Design tab, with All rooms pressed first', () => {
    make('bungalow'); cat.open('design'); expect(cat.$rooms.hidden).toBe(false); expect(idsIn(cat.$rooms.innerHTML, 'room')).toEqual(['all', 'living', 'bedroom', 'bath', 'den', 'garage']);
    expect(cat.$rooms.innerHTML).toMatch(/class="cat-room on" data-act="room" data-id="all" aria-pressed="true"/); expect(cat.$body.innerHTML).not.toContain('data-act="room"');
    cat.setTab(M.defaultTab()); expect(cat.$rooms.hidden).toBe(true); expect(cat.$rooms.innerHTML).toBe(''); cat.setTab(M.TAB_DESIGN); expect(cat.$rooms.hidden).toBe(false);
  });
  it('tapping a chip switches the room; its own styles show as "In use" and the chip is pressed', () => {
    make('bungalow', { walls: ['cream', 'sage'], rooms: { bedroom: { wall: 'sage' } } }); cat.open('design');
    expect(cat.$body.innerHTML).toContain('Mixed'); tapRoom('bedroom'); expect(cat.room).toBe('bedroom'); expect(cat.$rooms.innerHTML).toMatch(/class="cat-room on" data-act="room" data-id="bedroom" aria-pressed="true"/); expect(cat.$rooms.innerHTML).toMatch(/class="cat-room" data-act="room" data-id="all" aria-pressed="false"/);
    expect(cat.$body.innerHTML).not.toContain('Mixed'); const sage = cat.$body.innerHTML.match(/<button[^>]*data-key="sage"[^>]*>/)[0]; expect(sage).toContain('aria-pressed="true"'); expect(cat.$body.innerHTML.match(/<button[^>]*data-key="cream"[^>]*>/)[0]).toContain('aria-pressed="false"');
    tapRoom('all'); expect(cat.room).toBeNull(); expect(cat.$body.innerHTML).toContain('Mixed');
  });
  it('a style tapped with a room selected paints that room only, charges once, and says where in the toast', () => {
    make('bungalow'); cat.open('design'); tapRoom('den'); const b0 = env.store.ledger.balance;
    tapStyle('wall', 'navy'); expect(b0 - env.store.ledger.balance).toBe(wallPrice('navy')); expect(env.store.state.home.rooms).toEqual({ den: { wall: 'navy' } }); expect(env.store.state.home.wall).toBe('cream');
    expect(toasts.at(-1)).toEqual([`Navy paint · ${fmt(wallPrice('navy'))}`, 'good']); expect(changes.at(-1)).toEqual({ kind: 'style', style: 'wall', key: 'navy', paid: wallPrice('navy'), room: 'den' });
    tapRoom('bath'); env.tick(); tapStyle('wall', 'navy'); expect(env.store.ledger.balance).toBe(b0 - wallPrice('navy')); expect(toasts.at(-1)).toEqual(['Navy applied to Bathroom', 'good']); expect(env.store.state.home.rooms.bath).toEqual({ wall: 'navy' });
    expect(cat.$body.innerHTML).not.toContain('Mixed'); tapRoom('all'); expect(cat.$body.innerHTML).toContain('Mixed');   // a room view has no Mixed header; the house as a whole is mixed
  });
  it('All rooms paints the whole house, clears the overrides and the Mixed badge goes away', () => {
    make('onebed', { walls: ['cream', 'sage'], rooms: { bedroom: { wall: 'sage' } } }); cat.open('design'); expect(cat.$body.innerHTML).toContain('Mixed');
    tapStyle('wall', 'sage'); expect(env.store.state.home.wall).toBe('sage'); expect(env.store.state.home.rooms).toEqual({}); expect(cat.$body.innerHTML).not.toContain('Mixed'); expect(changes.at(-1)).toEqual({ kind: 'style', style: 'wall', key: 'sage', paid: 0 });
  });
  it('a premium swatch shows its own price; the section header says "from"; the toast is what was charged', () => {
    make('onebed'); cat.open('design'); const html = cat.$body.innerHTML;
    expect(html.match(/<button[^>]*data-key="ebony"[^>]*>.*?<\/button>/)[0]).toContain(fmt(floorPrice('ebony'))); expect(html.match(/<button[^>]*data-key="navy"[^>]*>.*?<\/button>/)[0]).toContain(fmt(wallPrice('navy')));
    expect(html).toContain(`from ${fmt(WALL_PRICE)} the first time`); expect(html).toContain(`from ${fmt(FLOOR_PRICE)} the first time`);
    const b0 = env.store.ledger.balance; tapStyle('floor', 'ebony'); expect(toasts.at(-1)[0]).toContain(fmt(b0 - env.store.ledger.balance));
  });
  it('a room that stops existing (after a move) falls back to All rooms on the next draw', () => {
    make('bungalow'); cat.open('design'); tapRoom('garage'); expect(cat.room).toBe('garage'); env.store.state.home.layout = 'onebed'; cat.refresh();
    expect(cat.room).toBeNull(); expect(idsIn(cat.$rooms.innerHTML, 'room')).toEqual(['all', 'living', 'bedroom']);
    env.store.state.home.layout = 'studio'; cat.refresh(); expect(cat.$rooms.hidden).toBe(true);
  });
  it('setRoom(id) selects a room programmatically; unknown ids mean All rooms; the choice survives tab changes and closing', () => {
    make('bungalow'); expect(cat.setRoom('bath')).toBe(cat); cat.open('design'); expect(cat.room).toBe('bath'); expect(cat.$rooms.innerHTML).toMatch(/class="cat-room on" data-act="room" data-id="bath"/);
    cat.setRoom('nope'); expect(cat.room).toBeNull(); cat.setRoom('den'); cat.setTab(M.defaultTab()); cat.setTab(M.TAB_DESIGN); expect(cat.room).toBe('den'); cat.close(); cat.open('design'); expect(cat.room).toBe('den');
  });
  it('the chips are not rebuilt when only the swatches change (so a focused chip stays focused)', () => {
    make('bungalow'); cat.open('design'); tapRoom('den'); const orig = Object.getOwnPropertyDescriptor(El.prototype, 'innerHTML'); let writes = 0;
    Object.defineProperty(cat.$rooms, 'innerHTML', { set(v) { writes++; orig.set.call(this, v); }, get() { return orig.get.call(this); }, configurable: true });
    tapStyle('wall', 'navy'); tapStyle('wall', 'cream'); expect(writes).toBe(0); tapRoom('bath'); expect(writes).toBe(1);
  });
  it('the whole house can still be styled by keyboard: chips are real buttons in the Tab order', () => {
    make('bungalow'); cat.open('design'); expect(cat.$rooms.innerHTML.match(/<button type="button"/g)).toHaveLength(6);
  });
});

describe('roomsHTML (pure)', () => {
  it('escapes labels and marks the active chip', () => {
    const h = roomsHTML([{ id: 'all', label: 'All rooms', active: false }, { id: 'x', label: 'A<b>', active: true }]); expect(h).toContain('A&lt;b&gt;'); expect(h.match(/aria-pressed="true"/g)).toHaveLength(1); expect(roomsHTML(undefined)).toBe('');
  });
  it('bodyHTML shows the Mixed badge only for sections flagged mixed', () => {
    const { store } = makeStore({ layout: 'onebed', home: { walls: ['cream', 'sage'], rooms: { bedroom: { wall: 'sage' } } } }), html = bodyHTML(M.tabView(store.state, M.TAB_DESIGN, 0), fmt);
    expect(html.match(/cat-mixed/g)).toHaveLength(1); expect(html.indexOf('Walls')).toBeLessThan(html.indexOf('Mixed')); expect(html.indexOf('Mixed')).toBeLessThan(html.indexOf('Floors'));
  });
});
