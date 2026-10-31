/**
 * Who you are (the creator's You tab): how you identify, what you are into, your personality and your dream. Small, honest effects: interests make
 * their activities more fun and their skills grow faster, and point you at the jobs, odd jobs and places that fit; a personality nudges one thing;
 * a dream is a long goal with a progress bar and a payoff. Pure rules over the state (tested in tests/profile.test.js).
 */
import { JOBS } from '../data/jobs.js';
import { own } from './util.js';
import { skillLevel } from './game.js';

export const GENDERS = {
  woman: { name: 'Woman', pronouns: 'she/her' },
  man: { name: 'Man', pronouns: 'he/him' },
  nonbinary: { name: 'Non-binary', pronouns: 'they/them' },
};
/** A starting look for each, only as a suggestion when you tap it (every style stays open to everyone). */
export const GENDER_LOOKS = {
  woman: { hair: ['long', 'bob', 'ponytail', 'waves', 'buns', 'curly', 'braids'], facialHair: ['none'], body: ['slim', 'average', 'athletic'] },
  man: { hair: ['short', 'side-part', 'buzz', 'curly', 'afro'], facialHair: ['none', 'none', 'stubble', 'moustache', 'goatee', 'full'], body: ['average', 'athletic', 'broad', 'slim'] },
  nonbinary: { hair: ['bob', 'short', 'curly', 'side-part', 'buns', 'waves', 'buzz'], facialHair: ['none', 'none', 'stubble'], body: ['slim', 'average', 'athletic', 'broad'] },
};

export const MAX_INTERESTS = 3;
export const INTERESTS = {
  music: { name: 'Music', icon: '🎸', skill: 'charisma', acts: ['piano', 'buskers'], tip: 'Busk on Scarth Street (Odd Jobs) and play the piano at home.' },
  art: { name: 'Art', icon: '🎨', skill: 'charisma', acts: ['paint'], tip: 'Paint at an easel and sell your work at the Farmers\' Market.' },
  fitness: { name: 'Sports & fitness', icon: '🏃', skill: 'fitness', acts: ['treadmill', 'weights', 'yoga', 'shore', 'grounds'], tip: 'Train at Prairie Fitness and walk the Legislative grounds.' },
  cooking: { name: 'Cooking', icon: '🍳', skill: 'cooking', acts: [], tip: 'Cook at home, then sell your baking at the Farmers\' Market.' },
  people: { name: 'Meeting people', icon: '💬', skill: 'charisma', acts: ['people', 'buskers'], tip: 'Say hi to the neighbours; they are in the Social app.' },
  nature: { name: 'Nature', icon: '🌾', skill: 'fitness', acts: ['geese', 'shore', 'sky', 'grounds'], tip: 'Walk Wascana Lake and watch the geese.' },
  politics: { name: 'Politics', icon: '🏛️', skill: 'charisma', acts: ['canvass'], tip: 'Vote, then hand out flyers at City Hall.' },
  business: { name: 'Business', icon: '💼', skill: 'charisma', acts: [], job: 'retail', tip: 'Work at Prairie Corner Market and climb the ladder.' },
  fashion: { name: 'Fashion', icon: '👗', skill: 'charisma', acts: ['window'], job: 'stylist', tip: 'Style customers at Prairie Threads.' },
  gaming: { name: 'Gaming', icon: '🎮', skill: null, acts: ['gaming', 'tv'], tip: 'A console at home pays off on a cold night.' },
  books: { name: 'Books', icon: '📖', skill: 'charisma', acts: ['read', 'bench'], tip: 'Read on a bench in Victoria Park.' },
};
export const INTEREST_BOOST = 1.25;   // their activities: +25% fun and skill XP
export const INTEREST_HEAD_START = 25; // skill XP per matching interest at the start (Level 1 is 20 XP)

export const PERSONALITIES = {
  outgoing: { name: 'Outgoing', icon: '😄', blurb: 'Charisma grows 10% faster.' },
  creative: { name: 'Creative', icon: '✨', blurb: 'Art and music are 15% more fun.' },
  active: { name: 'Active', icon: '⚡', blurb: 'Fitness grows 10% faster.' },
  easygoing: { name: 'Easygoing', icon: '😌', blurb: 'Your mood holds up 15% better.' },
  ambitious: { name: 'Ambitious', icon: '🚀', blurb: 'Promotions come 10% sooner.' },
  homebody: { name: 'Homebody', icon: '🏠', blurb: 'Things you do at home are 10% more fun.' },
};

const pct = (v, of) => Math.max(0, Math.min(1, of > 0 ? v / of : 0));
const maxJobLevel = (s) => { const j = s.job?.active; return j && JOBS[j.id] ? { at: j.level, top: JOBS[j.id].levels.length - 1 } : { at: 0, top: 1 }; };
export const DREAMS = {
  lakehouse: { name: 'Own the house by the lake', icon: '🏡', goal: 'Move into the Lakeview Bungalow', progress: (s) => ({ studio: 0, onebed: 0.5, bungalow: 1 })[s.home?.layout] ?? 0 },
  career: { name: 'Climb the ladder', icon: '💼', goal: 'Reach the top level of a job', progress: (s) => { const m = maxJobLevel(s); return s.job?.active ? pct(m.at, m.top) : 0; } },
  artist: { name: 'Make a living from art', icon: '🎨', goal: 'Sell 12 things at the Farmers\' Market', progress: (s) => pct(s.stats?.stallSales ?? 0, 12) },
  social: { name: 'Know everyone in town', icon: '💛', goal: 'Be friends with 8 neighbours', progress: (s) => pct(Object.keys(s.friends ?? {}).length, 8) },
  athlete: { name: 'Best shape of your life', icon: '🏅', goal: 'Reach Fitness level 5', progress: (s) => pct(skillLevel(s.skills?.fitness ?? 0), 5) },
  saver: { name: 'Build a nest egg', icon: '💰', goal: 'Have P$10,000 in the bank', progress: (s) => pct(s.bank?.balance ?? 0, 1_000_000) },
  explorer: { name: 'See the prairies', icon: '✈️', goal: 'Bring home 4 souvenirs', progress: (s) => pct((s.souvenirs ?? []).length, 4) },
};
export const DREAM_REWARD = 25000;   // P$250 when it comes true, once

/** Normalise the saved profile: known ids only, at most three interests, no duplicates. */
export function sanitizeProfile(p) {
  const o = p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  const interests = [...new Set((Array.isArray(o.interests) ? o.interests : []).filter((id) => typeof id === 'string' && own(INTERESTS, id)))].slice(0, MAX_INTERESTS);
  return { interests, personality: typeof o.personality === 'string' && own(PERSONALITIES, o.personality) ? o.personality : null,
    dream: typeof o.dream === 'string' && own(DREAMS, o.dream) ? o.dream : null, dreamDone: o.dreamDone === true };
}
export const sanitizeGender = (g) => (typeof g === 'string' && own(GENDERS, g) ? g : null);
export const pronounsOf = (s) => GENDERS[sanitizeGender(s?.player?.gender)]?.pronouns ?? 'they/them';

/** Toggle an interest on or off (at most MAX_INTERESTS). Returns the new list. */
export function toggleInterest(profile, id) {
  const p = sanitizeProfile(profile); if (!own(INTERESTS, id)) return p.interests;
  if (p.interests.includes(id)) return p.interests.filter((x) => x !== id);
  return p.interests.length >= MAX_INTERESTS ? p.interests : [...p.interests, id];
}

/** How your profile changes an activity: multipliers for its skill XP and its fun. */
export function activityMods(s, activityId, { home = false } = {}) {
  const p = sanitizeProfile(s?.profile); let skill = 1, fun = 1;
  if (p.interests.some((id) => INTERESTS[id].acts.includes(activityId))) { skill *= INTEREST_BOOST; fun *= INTEREST_BOOST; }
  if (p.personality === 'creative' && ['paint', 'piano', 'buskers'].includes(activityId)) fun *= 1.15;
  if (p.personality === 'homebody' && home) fun *= 1.1;
  return { skill, fun };
}
/** Personality multiplier on a skill's XP from anywhere (activities, cooking, shifts). */
export const skillMult = (s, skill) => { const p = sanitizeProfile(s?.profile).personality; return (p === 'outgoing' && skill === 'charisma') || (p === 'active' && skill === 'fitness') ? 1.1 : 1; };
export const moodDecayMult = (s) => (sanitizeProfile(s?.profile).personality === 'easygoing' ? 0.85 : 1);
export const jobXpMult = (s) => (sanitizeProfile(s?.profile).personality === 'ambitious' ? 1.1 : 1);
/** A job that fits your interests. */
export const jobFits = (s, jobId) => sanitizeProfile(s?.profile).interests.some((id) => INTERESTS[id].job === jobId);
/** Skill XP to start with: INTEREST_HEAD_START for each interest's skill. */
export function interestHeadStart(profile) {
  const out = {}; for (const id of sanitizeProfile(profile).interests) { const k = INTERESTS[id].skill; if (k) out[k] = (out[k] ?? 0) + INTEREST_HEAD_START; }
  return out;
}
/** Your dream: { id, name, icon, goal, progress 0..1, done } or null. */
export function dreamStatus(s) {
  const p = sanitizeProfile(s?.profile); if (!p.dream) return null;
  const d = DREAMS[p.dream], progress = Math.max(0, Math.min(1, d.progress(s ?? {}) || 0));
  return { id: p.dream, name: d.name, icon: d.icon, goal: d.goal, progress, done: p.dreamDone || progress >= 1 };
}
/** Pay out a dream that just came true (once, by ledger ref). Returns the reward or 0. */
export function claimDream(store) {
  const s = store.state, st = dreamStatus(s); if (!st || st.progress < 1 || sanitizeProfile(s.profile).dreamDone) return 0;
  const r = store.ledger.credit(DREAM_REWARD, `Dream come true: ${st.name}`, { category: 'income', ref: `dream:${st.id}` });
  s.profile = { ...sanitizeProfile(s.profile), dreamDone: true }; store.commit('profile');
  return r.ok ? DREAM_REWARD : 0;
}
