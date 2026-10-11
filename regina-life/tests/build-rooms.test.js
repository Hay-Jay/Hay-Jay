/** Build mode on multi-room homes: the multi-rect floor grid, the Walls button, the room focus strip and its auto-focus, per-room grid tints. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { BuildMode, gridLines, borderLines, makeFloorGrid, gridColorFor, roomChipsHTML, roomChipLabel, WALL_MODES, WALL_LABEL, SNAP } from '../src/ui/build.js';
import { ROOM, FLOORS } from '../src/data/furniture.js';
import { HOMES } from '../src/data/homes.js';
import { lotOf } from '../src/core/lot.js';
import * as H from '../src/core/home.js';
import { makeStore } from './helpers/home-env.js';
import { El, tapOn, idsIn } from './helpers/fake-dom.js';

const segs = (flat) => { const out = []; for (let i = 0; i < flat.length; i += 4) out.push(flat.slice(i, i + 4)); return out; };
const inside = (r, [x0, z0, x1, z1]) => x0 >= r.x0 - 1e-9 && x1 <= r.x1 + 1e-9 && z0 >= r.z0 - 1e-9 && z1 <= r.z1 + 1e-9 && x0 <= x1 && z0 <= z1;
const places = (id) => lotOf(HOMES[id]).rooms.map((r) => r.place);

describe('gridLines over several rooms', () => {
  it('one rect, an array of one rect and the default (the Studio room) are all the same', () => {
    expect(gridLines([ROOM])).toEqual(gridLines(ROOM)); expect(gridLines()).toEqual(gridLines(ROOM)); expect(gridLines(ROOM, 0.5, 2)).toEqual(gridLines([ROOM], 0.5, 2));
  });
  it('the Studio place rect IS the legacy ROOM, so the Studio grid is unchanged', () => {
    expect(places('studio')).toEqual([ROOM]);
  });
  it('several rects give exactly each rect\'s own lines, in order', () => {
    const rs = places('bungalow'), all = gridLines(rs), each = rs.map((r) => gridLines(r));
    expect(all.minor).toEqual(each.flatMap((g) => g.minor)); expect(all.major).toEqual(each.flatMap((g) => g.major));
  });
  it('every line of the Bungalow grid lies inside one room and on the 0.25 m snap; no line crosses a wall gap', () => {
    const rs = places('bungalow'), g = gridLines(rs);
    for (const s of [...segs(g.minor), ...segs(g.major)]) {
      expect(rs.some((r) => inside(r, s)), s.join()).toBe(true);
      const vertical = s[0] === s[2], c = vertical ? s[0] : s[1]; expect(Math.abs(c / SNAP - Math.round(c / SNAP))).toBeLessThan(1e-9);
    }
  });
  it('major lines are whole metres in every room', () => {
    for (const [x0, z0, x1] of segs(gridLines(places('onebed')).major)) expect(Math.abs((x0 === x1 ? x0 : z0) % 1)).toBeLessThan(1e-9);
  });
  it('borderLines: four closed segments per rect', () => {
    const b = borderLines(places('onebed')); expect(segs(b)).toHaveLength(8);
    const one = segs(borderLines(ROOM)); expect(one).toEqual([[ROOM.x0, ROOM.z0, ROOM.x1, ROOM.z0], [ROOM.x1, ROOM.z0, ROOM.x1, ROOM.z1], [ROOM.x1, ROOM.z1, ROOM.x0, ROOM.z1], [ROOM.x0, ROOM.z1, ROOM.x0, ROOM.z0]]);
    expect(borderLines()).toEqual(borderLines(ROOM));
  });
});

describe('makeFloorGrid with rooms', () => {
  const count = (g, i) => g.group.children[i].geometry.getAttribute('position').count;
  it('keeps three layers merged across rooms, sized by gridLines/borderLines', () => {
    const rs = places('bungalow'), g = makeFloorGrid({ rooms: rs, raf: undefined }), want = gridLines(rs);
    expect(g.group.children).toHaveLength(3); expect(count(g, 0)).toBe(want.minor.length / 2); expect(count(g, 1)).toBe(want.major.length / 2); expect(count(g, 2)).toBe(borderLines(rs).length / 2);
  });
  it('defaults to the Studio room and still accepts the old single `room` option', () => {
    const a = makeFloorGrid({ raf: undefined }), b = makeFloorGrid({ room: ROOM, raf: undefined }), c = makeFloorGrid({ room: { x0: 0, z0: 0, x1: 1, z1: 1 }, raf: undefined });
    expect(count(a, 0)).toBe(count(b, 0)); expect(count(a, 0)).toBe(gridLines(ROOM).minor.length / 2); expect(c.rooms).toEqual([{ x0: 0, z0: 0, x1: 1, z1: 1, id: '0' }]);
  });
  it('setRooms swaps the geometry (disposing the old one) and never leaves stale tints', () => {
    const g = makeFloorGrid({ rooms: places('onebed'), raf: undefined }), olds = g.group.children.map((c) => c.geometry), spies = olds.map((o) => vi.spyOn(o, 'dispose'));
    g.setRoomColors({ living: '#ff0000' }); g.setRooms(places('bungalow'), lotOf(HOMES.bungalow).rooms.map((r) => r.id));
    for (const s of spies) expect(s).toHaveBeenCalled(); expect(g.group.children[0].geometry).not.toBe(olds[0]); expect(count(g, 0)).toBe(gridLines(places('bungalow')).minor.length / 2);
    expect(g.rooms.map((r) => r.id)).toEqual(['living', 'bedroom', 'bath', 'den', 'garage']);
    const col = g.group.children[0].geometry.getAttribute('color'); expect([col.getX(0), col.getY(0), col.getZ(0)]).toEqual([1, 1, 1]); expect(g.group.children[0].material.color.getHexString()).toBe('ffffff');
  });
  it('room ids come from the rects when setRooms is not given any', () => {
    const g = makeFloorGrid({ raf: undefined }); g.setRooms([{ x0: 0, z0: 0, x1: 1, z1: 1, id: 'a' }, { x0: 2, z0: 0, x1: 3, z1: 1, id: 'b' }]); expect(g.rooms.map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('ignores rects with non-finite numbers', () => {
    const g = makeFloorGrid({ rooms: [{ x0: 0, z0: 0, x1: 1, z1: 1 }, { x0: NaN, z0: 0, x1: 1, z1: 1 }, null], raf: undefined }); expect(g.rooms).toHaveLength(1);
  });
  it('setColor colours every room alike; setRoomColors tints each room by its own colour, others use the last base', () => {
    const rs = places('onebed'), ids = ['living', 'bedroom'], g = makeFloorGrid({ rooms: rs.map((r, i) => ({ ...r, id: ids[i] })), raf: undefined });
    const minor = g.group.children[0], col = minor.geometry.getAttribute('color'), pos = minor.geometry.getAttribute('position');
    const colourAtRoom = (id) => { const r = g.rooms.find((x) => x.id === id); for (let i = 0; i < pos.count; i++) if (pos.getX(i) >= r.x0 - 1e-6 && pos.getX(i) <= r.x1 + 1e-6 && pos.getZ(i) >= r.z0 - 1e-6 && pos.getZ(i) <= r.z1 + 1e-6) return new THREE.Color(col.getX(i), col.getY(i), col.getZ(i)).getHexString(); return null; };
    g.setColor('#24323b'); expect(minor.material.color.getHexString()).toBe('24323b'); expect(colourAtRoom('living')).toBe('ffffff'); expect(colourAtRoom('bedroom')).toBe('ffffff');   // uniform: the material carries it
    g.setRoomColors({ living: '#24323b', bedroom: '#ffffff' });
    expect(minor.material.color.getHexString()).toBe('ffffff'); expect(colourAtRoom('living')).toBe('24323b'); expect(colourAtRoom('bedroom')).toBe('ffffff'); expect(g.group.children[1].geometry.getAttribute('color').getX(0)).toBeLessThan(0.1);
    g.setRoomColors({ bedroom: '#00ff00' }); expect(colourAtRoom('living')).toBe('24323b'); expect(colourAtRoom('bedroom')).toBe('00ff00');                    // living falls back to the base set by setColor
    g.setColor('#abcdef'); expect(minor.material.color.getHexString()).toBe('abcdef'); expect(colourAtRoom('bedroom')).toBe('ffffff');
    expect(g.group.children[2].material.color.getHexString()).toBe('34c98b'); expect(g.group.children[2].geometry.getAttribute('color')).toBeUndefined();   // the border is never tinted
  });
  it('still fades and disposes after being re-roomed', () => {
    const g = makeFloorGrid({ raf: undefined }); g.setRooms(places('bungalow')); g.set(true); expect(g.group.visible).toBe(true); const spies = g.group.children.map((c) => vi.spyOn(c.geometry, 'dispose')); g.dispose(); for (const s of spies) expect(s).toHaveBeenCalled();
  });
});

describe('room chips (pure markup)', () => {
  it('House first (data-id "all", on when nothing is focused), then one chip per room by id', () => {
    const rooms = lotOf(HOMES.bungalow).rooms, html = roomChipsHTML(rooms, null);
    expect(idsIn(html)).toEqual(['all', 'living', 'bedroom', 'bath', 'den', 'garage']); expect(html.match(/aria-pressed="true"/g)).toHaveLength(1); expect(html).toMatch(/class="b-room on" data-act="focus" data-id="all"/);
    expect(roomChipsHTML(rooms, 'den')).toMatch(/class="b-room on" data-act="focus" data-id="den"/);
  });
  it('labels are short ("Living", not "Living room") and every chip has the full room name as its aria-label', () => {
    const rooms = lotOf(HOMES.onebed).rooms; expect(rooms.map(roomChipLabel)).toEqual(['Living', 'Bedroom']);
    const html = roomChipsHTML(rooms, null); expect(html).toContain('aria-label="Living room"'); expect(html).toContain('aria-label="Whole house"');
    expect(roomChipLabel({ type: 'workshop', name: 'Workshop <1>' })).toBe('Workshop <1>'); expect(roomChipsHTML([{ id: 'x', type: 'q', name: 'A<b>' }], null)).toContain('A&lt;b&gt;');
  });
});

describe('BuildMode on multi-room homes', () => {
  let els, win, canvasEl, scene, camera, panels, audio, toasts, build, calls, body, env;
  const ids = ['build', 'b-hint', 'b-rot', 'b-del', 'b-buy', 'b-stored', 'b-stored-n', 'b-done', 'b-walls', 'b-rooms'];
  const mk = (layout = 'studio', opts = {}) => {
    env = makeStore({ layout }); H.ownedTypes; calls = { walls: [], focus: [], layout: [] };
    build = new BuildMode({ canvas: canvasEl, camera, scene, store: env.store, panels, audio, toast: (m, k) => toasts.push([m, k]), onLayout: (f) => calls.layout.push(f),
      onWallMode: (m) => calls.walls.push(m), onFocus: (id, rect) => calls.focus.push([id, rect]), ...opts });
    return build;
  };
  beforeEach(() => {
    els = {}; for (const id of ids) els[id] = new El(id.startsWith('b-') && id !== 'b-hint' && id !== 'b-stored-n' && id !== 'b-rooms' ? 'button' : 'div');
    els.build.hidden = true; els['b-stored'].hidden = true; els['b-walls'].hidden = true; els['b-rooms'].hidden = true; win = {}; body = new Set(); toasts = [];
    globalThis.document = { getElementById: (id) => els[id], body: { classList: { add: (c) => body.add(c), remove: (c) => body.delete(c) } }, activeElement: null };
    globalThis.addEventListener = (t, f) => { (win[t] ||= []).push(f); }; globalThis.matchMedia = () => ({ matches: true }); globalThis.innerHeight = 800; globalThis.innerWidth = 400;
    canvasEl = new El('canvas'); canvasEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800 });
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100); camera.position.set(0, 14, 0.01); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    panels = { open: false, furnitureShop: vi.fn() }; audio = { blip: vi.fn() };
  });
  afterEach(() => { vi.useRealTimers(); for (const k of ['document', 'addEventListener', 'matchMedia', 'innerHeight', 'innerWidth']) delete globalThis[k]; });
  const chip = (id) => els['b-rooms'].dispatch('click', tapOn({ id }, '[data-act="focus"]'));
  /** A spot where `type` can be placed inside `roomId` right now. */
  const spotIn = (roomId, type = 'plant') => {
    const r = lotOf(env.store.state.home.layout).rooms.find((x) => x.id === roomId).place;
    for (let x = r.x0; x <= r.x1; x += 0.25) for (let z = r.z0; z <= r.z1; z += 0.25) if (H.canPlace(env.store.state, type, x, z, 0).ok) return { x, z };
    throw new Error(`no spot in ${roomId}`);
  };
  const stored = (type = 'plant', n = 3) => { env.store.state.home.owned[type] = (env.store.state.home.owned[type] ?? 0) + n; };
  const placeAt = (roomId, type = 'plant') => { stored(type, 1); const p = spotIn(roomId, type); build.select({ type, id: null }); build.pt = p; build.click(false); return p; };

  it('the Studio: no Walls button, no focus strip, one room in the grid, and onWallMode/onFocus never fire', () => {
    mk('studio'); build.start(); expect(els['b-walls'].hidden).toBe(true); expect(els['b-rooms'].hidden).toBe(true); expect(els['b-rooms'].innerHTML).toBe(''); expect(build.multi).toBe(false);
    expect(build.grid.rooms).toHaveLength(1); expect(build.cycleWalls()).toBe('cut'); stored(); build.select({ type: 'plant', id: null }); expect(calls.walls).toEqual([]); expect(calls.focus).toEqual([]); expect(build.focus).toBeNull();
    build.focusRoom('living'); expect(build.focus).toBeNull(); expect(calls.focus).toEqual([]);
  });
  it('constructed on the Bungalow: the grid has all five rooms, the Walls button exists but the strip waits for build mode', () => {
    mk('bungalow'); expect(build.multi).toBe(true); expect(build.grid.rooms.map((r) => r.id)).toEqual(['living', 'bedroom', 'bath', 'den', 'garage']);
    expect(build.grid.rooms.map(({ id, ...r }) => r)).toEqual(places('bungalow')); expect(els['b-walls'].hidden).toBe(false); expect(els['b-rooms'].hidden).toBe(true);
    build.start(); expect(els['b-rooms'].hidden).toBe(false); expect(idsIn(els['b-rooms'].innerHTML)).toEqual(['all', 'living', 'bedroom', 'bath', 'den', 'garage']);
    build.stop(); expect(els['b-rooms'].hidden).toBe(true);
  });
  it('start() picks up a layout change made since construction (a move), and setLayout does the same on demand', () => {
    mk('studio'); build.start(); build.stop(); env.store.state.home.layout = 'onebed';
    build.start(); expect(build.multi).toBe(true); expect(build.grid.rooms.map((r) => r.id)).toEqual(['living', 'bedroom']); expect(els['b-walls'].hidden).toBe(false); expect(idsIn(els['b-rooms'].innerHTML)).toEqual(['all', 'living', 'bedroom']);
    build.stop(); env.store.state.home.layout = 'studio'; build.setLayout(); expect(build.multi).toBe(false); expect(els['b-walls'].hidden).toBe(true); expect(build.grid.rooms).toHaveLength(1);
    build.setLayout(HOMES.bungalow); expect(build.grid.rooms).toHaveLength(5); build.setLayout('onebed'); expect(build.grid.rooms).toHaveLength(2);
  });
  it('setLayout while building redraws the strip and drops the room focus (telling the camera)', () => {
    mk('bungalow'); build.start(); chip('bath'); expect(calls.focus.at(-1)[0]).toBe('bath'); env.store.state.home.layout = 'onebed'; build.setLayout();
    expect(build.focus).toBeNull(); expect(calls.focus.at(-1)).toEqual([null, null]); expect(idsIn(els['b-rooms'].innerHTML)).toEqual(['all', 'living', 'bedroom']);
    build.setLayout(); expect(calls.focus.filter((c) => c[0] === null)).toHaveLength(1);   // an unchanged layout does not re-announce
  });

  describe('the Walls button', () => {
    it('cycles up -> cut -> down -> up, tells main.js each time and shows the mode on the button', () => {
      mk('bungalow'); build.start(); expect(build.wallMode).toBe('cut'); expect(els['b-walls'].attrs['aria-label']).toBe('Walls: Cutaway'); expect(els['b-walls'].dataset.mode).toBe('cut'); expect(els['b-walls'].innerHTML).toContain('<svg');
      els['b-walls'].onclick(); expect(calls.walls).toEqual(['down']); expect(els['b-walls'].attrs['aria-label']).toBe('Walls: Down');
      els['b-walls'].onclick(); els['b-walls'].onclick(); expect(calls.walls).toEqual(['down', 'up', 'cut']); expect(els['b-walls'].attrs['aria-label']).toBe('Walls: Cutaway'); expect(WALL_MODES).toEqual(['up', 'cut', 'down']);
      expect(audio.blip).toHaveBeenCalledWith('tick');
    });
    it('the three modes have three different pictograms and labels', () => {
      mk('onebed'); build.start(); const icons = new Set(), labels = new Set();
      for (const m of WALL_MODES) { build.setWallMode(m); icons.add(els['b-walls'].innerHTML); labels.add(els['b-walls'].attrs['aria-label']); expect(els['b-walls'].attrs['aria-label']).toBe(WALL_LABEL[m]); }
      expect(icons.size).toBe(3); expect(labels).toEqual(new Set(['Walls: Up', 'Walls: Cutaway', 'Walls: Down']));
    });
    it('announces the mode in the hint line for a moment, then the normal hint returns; a blocked-placement error still wins', () => {
      vi.useFakeTimers(); mk('onebed'); build.start(); const base = els['b-hint'].textContent; expect(base).toMatch(/Buy/);
      build.setWallMode('down'); build.cycleWalls(); expect(els['b-hint'].textContent).toBe('Walls: Up'); build.cycleWalls(); expect(els['b-hint'].textContent).toBe('Walls: Cutaway');
      vi.advanceTimersByTime(2000); expect(els['b-hint'].textContent).toBe(base);
      build.cycleWalls(); expect(els['b-hint'].textContent).toBe('Walls: Down'); build.stop(); vi.advanceTimersByTime(3000); build.start({ quiet: true }); expect(els['b-hint'].textContent).toBe(base);
    });
    it('setWallMode syncs the button without calling back (main.js re-applies its session choice after an interior swap); junk is ignored', () => {
      mk('bungalow'); build.setWallMode('up'); expect(calls.walls).toEqual([]); expect(build.wallMode).toBe('up'); expect(els['b-walls'].dataset.mode).toBe('up'); build.setWallMode('walk'); build.setWallMode(null); expect(build.wallMode).toBe('up');
      els['b-walls'].onclick(); expect(calls.walls).toEqual(['cut']);
    });
    it('is hidden on single-room homes, and a build bar without the button (old markup) still works', () => {
      mk('studio'); expect(els['b-walls'].hidden).toBe(true); els['b-walls'] = undefined; els['b-rooms'] = undefined; env.store.state.home.layout = 'bungalow'; const b2 = new BuildMode({ canvas: new El('canvas'), camera, scene: new THREE.Scene(), store: env.store, panels, audio, toast() {} });
      b2.setLayout(); expect(b2.multi).toBe(true); b2.start(); expect(b2.cycleWalls()).toBe('down'); b2.focusRoom('den'); expect(b2.focus).toBe('den'); b2.stop();
    });
  });

  describe('the room focus strip', () => {
    it('tapping a chip frames that room (floor rect) through onFocus, highlights it, and House goes back to the whole home', () => {
      mk('bungalow'); build.start(); const lot = lotOf(HOMES.bungalow);
      chip('bedroom'); expect(calls.focus.at(-1)).toEqual(['bedroom', lot.rooms[1].floor]); expect(build.focus).toBe('bedroom'); expect(els['b-rooms'].innerHTML).toMatch(/class="b-room on" data-act="focus" data-id="bedroom" aria-pressed="true"/);
      chip('garage'); expect(calls.focus.at(-1)).toEqual(['garage', lot.rooms[4].floor]); chip('all'); expect(calls.focus.at(-1)).toEqual([null, null]); expect(build.focus).toBeNull(); expect(els['b-rooms'].innerHTML).toMatch(/class="b-room on" data-act="focus" data-id="all"/);
      const n = calls.focus.length; chip('all'); expect(calls.focus).toHaveLength(n);                            // the same chip twice: no repeat
    });
    it('the rect handed over is a copy, so the camera cannot change the layout', () => {
      mk('onebed'); build.start(); chip('living'); const r = calls.focus.at(-1)[1]; r.x0 = 999; expect(lotOf(HOMES.onebed).rooms[0].floor.x0).toBe(-4.5);
    });
    it('unknown or hostile ids fall back to the whole house', () => {
      mk('bungalow'); build.start(); chip('bedroom'); for (const bad of ['nope', '__proto__', 'constructor', undefined]) { chip(bad); expect(build.focus, String(bad)).toBeNull(); chip('bedroom'); }
      els['b-rooms'].dispatch('click', { target: { closest: () => null } }); els['b-rooms'].dispatch('click', { target: null }); expect(build.focus).toBe('bedroom');
    });
    it('Done clears the focus so the Home view shows the whole house again', () => {
      mk('bungalow', { onStop: () => calls.layout.push('stopped') }); build.start(); chip('den'); build.stop(); expect(build.focus).toBeNull(); expect(calls.focus.at(-1)).toEqual([null, null]); expect(calls.layout.at(-1)).toBe('stopped');
      const n = calls.focus.length; build.start(); build.stop(); expect(calls.focus).toHaveLength(n);
    });
    it('selecting a piece from storage focuses the living room when nothing was edited yet', () => {
      mk('bungalow'); build.start(); stored(); build.select({ type: 'plant', id: null }); expect(build.focus).toBe('living'); expect(calls.focus.at(-1)).toEqual(['living', lotOf(HOMES.bungalow).rooms[0].floor]);
    });
    it('...and the room of the last item you edited once you have edited one', () => {
      mk('bungalow'); build.start(); placeAt('bedroom'); expect(build.lastEdit).toBeTruthy(); stored(); build.select({ type: 'plant', id: null }); expect(build.focus).toBe('bedroom');
      build.select(null); placeAt('den'); const p = env.store.state.home.placed.at(-1); expect(build.lastEdit).toEqual({ x: p.x, z: p.z }); expect(H.canPlace(env.store.state, 'plant', p.x, p.z).ok).toBe(false); stored(); build.select({ type: 'plant', id: null }); expect(build.focus).toBe('den');
    });
    it('picking up a placed piece also counts as an edit; storing one does too', () => {
      mk('bungalow'); build.start(); placeAt('bedroom'); const it = env.store.state.home.placed[0], view = build.focus, n = calls.focus.length;
      build.select({ type: 'plant', id: it.id }); expect(build.focus).toBe(view); expect(calls.focus).toHaveLength(n);   // picking up a placed piece never changes the view
      build.lastEdit = null; build.removeSel(); expect(build.lastEdit).toEqual({ x: it.x, z: it.z }); expect(env.store.state.home.placed).toHaveLength(0);
    });
    it('a piece placed with the whole-house view does not move the camera until the next stored piece is picked', () => {
      mk('bungalow'); build.start(); chip('all'); chip('all'); placeAt('garage'); expect(build.focus).toBeNull(); expect(calls.focus).toEqual([]);
    });
    it('a view the player chose is never overridden (a room or the whole house), until the next build session', () => {
      mk('bungalow'); build.start(); chip('garage'); stored(); build.select({ type: 'plant', id: null }); expect(build.focus).toBe('garage');
      chip('all'); build.select(null); build.select({ type: 'plant', id: null }); expect(build.focus).toBeNull();
      build.stop(); build.start(); build.select({ type: 'plant', id: null }); expect(build.focus).toBe('living');
    });
    it('selecting nothing, a placed piece or a piece while not building never refocuses', () => {
      mk('bungalow'); stored(); build.select({ type: 'plant', id: null }); expect(build.focus).toBeNull(); build.start(); build.select(null); expect(build.focus).toBeNull(); expect(calls.focus).toEqual([]);
    });
    it('failed placements do not count as an edit', () => {
      mk('bungalow'); build.start(); stored(); build.select({ type: 'plant', id: null }); build.pt = { x: 99, z: 99 }; build.click(false); expect(build.lastEdit).toBeNull(); expect(toasts.at(-1)[1]).toBe('warn');
    });
  });

  describe('grid tints', () => {
    /** The colour of the first minor-grid vertex inside the room's place rect. */
    const colourIn = (r) => { const l = build.grid.group.children[0], pos = l.geometry.getAttribute('position'), col = l.geometry.getAttribute('color'); for (let i = 0; i < pos.count; i++) if (pos.getX(i) >= r.x0 - 1e-6 && pos.getX(i) <= r.x1 + 1e-6 && pos.getZ(i) >= r.z0 - 1e-6 && pos.getZ(i) <= r.z1 + 1e-6) return new THREE.Color(col.getX(i), col.getY(i), col.getZ(i)).getHexString(); return null; };
    it('refresh() tints each room by its own floor: dark lines on a light floor, white on a dark one', () => {
      mk('bungalow'); env.store.state.home.floors = ['oak', 'birch', 'walnut']; env.store.state.home.floor = 'birch'; env.store.state.home.rooms = { bedroom: { floor: 'walnut' } }; build.start();
      const lot = lotOf(HOMES.bungalow), rect = (id) => lot.rooms.find((r) => r.id === id).place;
      expect(gridColorFor(FLOORS.birch[2])).toBe('#24323b'); expect(gridColorFor(FLOORS.walnut[2])).toBe('#ffffff');
      expect(colourIn(rect('living'))).toBe('24323b'); expect(colourIn(rect('bedroom'))).toBe('ffffff');
      env.store.state.home.rooms = { living: { floor: 'walnut' } }; build.refresh(); expect(colourIn(rect('living'))).toBe('ffffff'); expect(colourIn(rect('bedroom'))).toBe('24323b');
    });
    it('the Studio keeps one uniform colour on the material, as before', () => {
      mk('studio'); env.store.state.home.floors = ['oak', 'walnut']; env.store.state.home.floor = 'walnut'; build.start(); expect(build.grid.group.children[0].material.color.getHexString()).toBe('ffffff');
      env.store.state.home.floor = 'oak'; build.refresh(); expect(build.grid.group.children[0].material.color.getHexString()).toBe(gridColorFor(FLOORS.oak[2]).slice(1));
    });
  });

  it('onLayout gets the top inset too: the focus strip\'s bottom edge plus a margin, and 0 whenever the strip is not showing', () => {
    mk('bungalow'); els['b-rooms'].getBoundingClientRect = () => ({ top: 62, bottom: 110, height: 48 }); els.build.offsetHeight = 100;
    build.start(); expect(calls.layout.at(-1)).toBeCloseTo((100 + 14) / 800, 6);   // the first argument is unchanged
    const seen = []; build.onLayout = (b, t) => seen.push([b, t]); build.layout(); expect(seen.at(-1)[1]).toBeCloseTo((110 + 8) / 800, 6);
    els['b-rooms'].getBoundingClientRect = () => ({ top: 0, bottom: 0, height: 0 }); build.layout(); expect(seen.at(-1)[1]).toBe(0); els['b-rooms'].getBoundingClientRect = () => ({ top: 62, bottom: 110, height: 48 });
    build.stop(); const n0 = seen.length; build.layout(); expect(seen).toHaveLength(n0);   // not building: no callbacks at all
    mk('studio'); build.start(); const s2 = []; build.onLayout = (b, t) => s2.push(t); build.layout(); expect(s2.at(-1)).toBe(0);
  });
  it('the public API C2 wires is all there', () => {
    mk('bungalow'); for (const m of ['setLayout', 'setWallMode', 'cycleWalls', 'focusRoom', 'start', 'stop', 'refresh', 'layout', 'select', 'setCatalogue']) expect(build[m], m).toBeTypeOf('function');
    expect(build.multi).toBe(true); expect(build.focus).toBeNull(); expect(build.wallMode).toBe('cut');
  });
});
