/** First day in Regina (core/onboarding.js): steps come from what the save records, each pays once, the full card pays a bonus once. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { ONBOARDING_STEPS, ONBOARDING_BONUS, onboardingStatus, updateOnboarding, sanitizeOnboarding, stepDone } from '../src/core/onboarding.js';
import { claimDaily } from '../src/core/daily.js';
import { eventsCalm } from '../src/core/events.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let t, store;
beforeEach(() => { t = Date.parse('2026-10-25T18:00:00Z'); store = new Store(mem(), () => t); });

describe('first day in Regina', () => {
  it('a fresh life has six steps, none done, and the first one is next', () => {
    const st = onboardingStatus(store.state); expect(st.total).toBe(6); expect(st.count).toBe(0); expect(st.next.id).toBe(ONBOARDING_STEPS[0].id); expect(st.complete).toBe(false);
    expect(updateOnboarding(store).fresh).toEqual([]);
  });
  it('a step ticks only when the save really did it, and pays its reward exactly once', () => {
    const b0 = store.state.bank.balance; claimDaily(store, t); const gift = store.state.bank.balance - b0;
    const r = updateOnboarding(store); expect(r.fresh.map((x) => x.id)).toEqual(['gift']);
    expect(store.state.bank.balance).toBe(b0 + gift + ONBOARDING_STEPS.find((s) => s.id === 'gift').reward);
    const b1 = store.state.bank.balance; expect(updateOnboarding(store).fresh).toEqual([]); expect(store.state.bank.balance).toBe(b1);
  });
  it('the whole card pays the bonus once and says it finished once', () => {
    const s = store.state; s.daily = { last: '2026-10-25', streak: 1 }; s.home.placed = [{ id: 'p1', type: 'plant', x: 0, z: 0, rot: 0 }]; s.stats = { eaten: 1, visits: 2 };
    s.job.active = { id: 'market', level: 0, xp: 40, shifts: 1, since: t };
    const b0 = s.bank.balance, r = updateOnboarding(store); expect(r.fresh.length).toBe(6); expect(r.finished).toBe(true);
    expect(s.bank.balance - b0).toBe(ONBOARDING_STEPS.reduce((a, x) => a + x.reward, 0) + ONBOARDING_BONUS);
    expect(updateOnboarding(store).finished).toBe(false); expect(onboardingStatus(s).complete).toBe(true);
  });
  it('rewards stay small: the whole card is under one entry shift (P$66) plus the bonus', () => {
    expect(ONBOARDING_STEPS.reduce((a, x) => a + x.reward, 0)).toBeLessThanOrEqual(6600); expect(ONBOARDING_BONUS).toBeLessThanOrEqual(2500);
  });
  it('steps read only real records; a corrupt card is repaired', () => {
    expect(stepDone({}, 'eat')).toBe(false); expect(stepDone({ stats: { eaten: 1 } }, 'eat')).toBe(true); expect(stepDone({ job: { active: { shifts: 0 } } }, 'shift')).toBe(false);
    expect(sanitizeOnboarding({ done: ['gift', 'gift', 'hack', 3], paid: 'x', bonus: 'yes' })).toEqual({ done: ['gift'], paid: [], bonus: true, hidden: false, min: false, seenDone: false });
    expect(sanitizeOnboarding(null).done).toEqual([]);
  });
  it('three steps done ends the new-player event grace early', () => {
    store.state.flags.firstPlayAt = t; expect(eventsCalm(store.state, t + 1000)).toBe(true);
    store.state.onboarding = { done: ['gift', 'place', 'eat'] }; expect(eventsCalm(store.state, t + 1000)).toBe(false);
  });
});
