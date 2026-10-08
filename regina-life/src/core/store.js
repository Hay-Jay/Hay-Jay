import { DEFAULT_LOOK, STARTER_WARDROBE } from '../data/catalog.js';
import { Ledger } from './ledger.js';

export const SAVE_KEY = 'reginalife.save.v1';
export const SAVE_VERSION = 1;

export function freshState(now = Date.now()) {
  return {
    v: SAVE_VERSION, created: now, started: false,
    player: { name: 'Alex', look: { ...DEFAULT_LOOK } },
    wardrobe: [...STARTER_WARDROBE],
    bank: { balance: 250000, history: [] },
    inventory: {},
    needs: { energy: 88, hunger: 76, mood: 70, hygiene: 82, fun: 66 },
    skills: { cooking: 0, fitness: 0, charisma: 0 }, ads: {}, flags: {}, eventLog: [],
    friends: {}, partner: null, politics: null, trips: [], souvenirs: [],
    home: { owned: {}, placed: [], wall: 'cream', floor: 'oak' }, radio: { station: null, volume: 0.7 },
    job: { active: null, application: null, shift: null },
    phone: { wallpaper: 0, battery: 86, airplane: false, dnd: false, wifi: true, bluetooth: true, brightness: 1, volume: 0.6, flashlight: false, unlocked: false },
    messages: {}, unread: {}, notifications: [], photos: [], calls: [],
    destination: null, calendar: [],
    settings: { quality: 'auto', timeMode: 'live' },
    pos: null,
  };
}

/** Observable game store. Persistence is best-effort (storage can be blocked / full). */
export class Store {
  constructor(storage = globalThis.localStorage, now = () => Date.now()) {
    this.storage = storage;
    this.now = now;
    this.listeners = new Set();
    this.state = this.load() ?? freshState(now());
    this.ledger = new Ledger(this.state.bank, { now });
    this._saveTimer = null;
  }
  load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== SAVE_VERSION) return null;
      // merge onto defaults so newly added fields never crash older saves
      const d = freshState(this.now());
      return { ...d, ...s, player: { ...d.player, ...s.player, look: { ...d.player.look, ...s.player?.look } },
        phone: { ...d.phone, ...s.phone }, needs: { ...d.needs, ...s.needs }, settings: { ...d.settings, ...s.settings },
        job: { ...d.job, ...s.job }, bank: { ...d.bank, ...s.bank }, skills: { ...d.skills, ...s.skills }, home: { ...d.home, ...s.home }, radio: { ...d.radio, ...s.radio } };
    } catch { return null; }
  }
  hasSave() { try { return !!this.storage?.getItem(SAVE_KEY); } catch { return false; } }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  /** Call after mutating state. */
  commit(topic = 'state') {
    for (const fn of this.listeners) { try { fn(topic, this.state); } catch (e) { console.error(e); } }
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.save(), 400);
  }
  save() {
    try { this.storage?.setItem(SAVE_KEY, JSON.stringify(this.state)); return true; }
    catch {
      // quota (usually photos): drop oldest photos and retry once
      try { this.state.photos = this.state.photos.slice(0, 4); this.storage?.setItem(SAVE_KEY, JSON.stringify(this.state)); return true; }
      catch { return false; }
    }
  }
  reset() {
    this.state = freshState(this.now());
    this.ledger = new Ledger(this.state.bank, { now: this.now });
    try { this.storage?.removeItem(SAVE_KEY); } catch {}
    this.commit('reset');
  }
}
