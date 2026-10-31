import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/core/store.js';
import { INTERESTS, PERSONALITIES, DREAMS, MAX_INTERESTS, sanitizeProfile, sanitizeGender, pronounsOf, toggleInterest, activityMods, skillMult, moodDecayMult, jobXpMult, jobFits, interestHeadStart, dreamStatus, claimDream, DREAM_REWARD } from '../src/core/profile.js';
import { ACTIVITIES } from '../src/core/game.js';
import { JOBS } from '../src/data/jobs.js';
import { sanitize } from '../src/core/sanitize.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let store; beforeEach(() => { store = new Store(mem(), () => Date.parse('2026-10-31T16:00:00Z')); });
describe('profile', () => {
  it('interests point at real activities and jobs', () => {
    for (const [id, i] of Object.entries(INTERESTS)) { for (const a of i.acts) expect(ACTIVITIES[a], `${id}: ${a}`).toBeTruthy(); if (i.job) expect(JOBS[i.job]).toBeTruthy(); expect(i.tip.length).toBeGreaterThan(10); }
    expect(Object.keys(PERSONALITIES).length).toBeGreaterThanOrEqual(5); expect(Object.keys(DREAMS).length).toBeGreaterThanOrEqual(6);
  });
  it('pick up to three interests; saves are cleaned', () => {
    let p = { interests: [] }; for (const id of ['music', 'art', 'books', 'cooking']) p = { interests: toggleInterest(p, id) };
    expect(p.interests).toEqual(['music', 'art', 'books']); expect(toggleInterest(p, 'art')).toEqual(['music', 'books']); expect(toggleInterest(p, 'nope')).toEqual(p.interests);
    expect(sanitizeProfile({ interests: ['music', 'music', 'x', 'art', 'fitness', 'books'], personality: 'grumpy', dream: 'lakehouse', dreamDone: 'yes' })).toEqual({ interests: ['music', 'art', 'fitness'], personality: null, dream: 'lakehouse', dreamDone: false });
    expect(MAX_INTERESTS).toBe(3); expect(sanitizeGender('woman')).toBe('woman'); expect(sanitizeGender('robot')).toBeNull();
    expect(sanitize({ player: { gender: 'man' }, profile: 'x' })).toMatchObject({ player: { gender: 'man' }, profile: { interests: [], personality: null, dream: null } });
    expect(pronounsOf({ player: { gender: 'woman' } })).toBe('she/her'); expect(pronounsOf({})).toBe('they/them');
  });
  it('interests make their activities more fun and quicker to learn; personalities nudge one thing', () => {
    const s = { profile: { interests: ['art'], personality: 'creative' } };
    expect(activityMods(s, 'paint').skill).toBe(1.25); expect(activityMods(s, 'paint').fun).toBeCloseTo(1.25 * 1.15); expect(activityMods(s, 'treadmill')).toEqual({ skill: 1, fun: 1 });
    expect(skillMult({ profile: { personality: 'outgoing' } }, 'charisma')).toBe(1.1); expect(skillMult({ profile: { personality: 'outgoing' } }, 'fitness')).toBe(1);
    expect(moodDecayMult({ profile: { personality: 'easygoing' } })).toBe(0.85); expect(jobXpMult({ profile: { personality: 'ambitious' } })).toBe(1.1);
    expect(activityMods({ profile: { personality: 'homebody' } }, 'tv', { home: true }).fun).toBe(1.1);
    expect(jobFits({ profile: { interests: ['fashion'] } }, 'stylist')).toBe(true); expect(jobFits({ profile: { interests: ['fashion'] } }, 'retail')).toBe(false);
    expect(interestHeadStart({ interests: ['music', 'art', 'fitness'] })).toEqual({ charisma: 50, fitness: 25 });
  });
  it('a dream tracks progress and pays once when it comes true', () => {
    const s = store.state; s.profile = { interests: [], personality: null, dream: 'saver' };
    expect(dreamStatus(s)).toMatchObject({ id: 'saver', progress: 0.04, done: false }); expect(claimDream(store)).toBe(0);
    s.bank.balance = 1_000_000; const b = s.bank.balance; expect(claimDream(store)).toBe(DREAM_REWARD); expect(s.bank.balance).toBe(b + DREAM_REWARD); expect(claimDream(store)).toBe(0);
    expect(dreamStatus(s).done).toBe(true); expect(dreamStatus({ profile: {} })).toBeNull();
    expect(dreamStatus({ profile: { dream: 'lakehouse' }, home: { layout: 'onebed' } }).progress).toBe(0.5);
  });
});
