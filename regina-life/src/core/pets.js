/**
 * Pets: adopt a dog or a cat from the Prairie Paws shelter (Pets app). It lives at home, follows you around, and needs feeding and play.
 * A happy pet lifts your mood while you are home; a neglected one gets sad (and sad pets make you a little sad), but a pet never runs away
 * or dies. Pure rules over a Store, like the lodger.
 */
import { own, clampNum } from './util.js';
import { notify, tally } from './game.js';
import { fmtMoney } from './ledger.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
/** Adoption fees are shelter-style (2026 Regina humane-society range, scaled to the game economy); colours are coat colours. */
export const PET_KINDS = {
  dog: { id: 'dog', name: 'Dog', icon: '🐶', fee: 15000, blurb: 'Loyal, goofy and always happy to see you.', colors: ['#c8935a', '#3a2c22', '#f1e6d2', '#8a8e93'] },
  cat: { id: 'cat', name: 'Cat', icon: '🐱', fee: 9000, blurb: 'Independent, cuddly on its own terms, loves a sunny window.', colors: ['#e39a4c', '#2a2a2e', '#f4efe6', '#9a8f86'] },
};
export const PET_FOOD = { price: 1299, meals: 6 };          // a bag of kibble: P$12.99 for six meals
export const PLAY_COOLDOWN_MS = 30_000, FEED_MIN_GAP_MS = 20_000;
export const NAME_MAX = 14;

const validName = (n) => typeof n === 'string' && n.trim().length > 0;
export function sanitizePet(p) {
  if (!p || typeof p !== 'object' || !own(PET_KINDS, p.kind)) return null;
  const k = PET_KINDS[p.kind];
  return { kind: p.kind, name: validName(p.name) ? p.name.trim().slice(0, NAME_MAX) : k.name, color: Number.isInteger(p.color) && p.color >= 0 && p.color < k.colors.length ? p.color : 0,
    fed: clampNum(p.fed, 0, 100, 80), love: clampNum(p.love, 0, 100, 60), food: Math.floor(clampNum(p.food, 0, 99, 0)), since: clampNum(p.since, 0, 4e12, 0),
    lastPlay: clampNum(p.lastPlay, 0, 4e12, 0), lastFed: clampNum(p.lastFed, 0, 4e12, 0) };
}
export const petOf = (s) => sanitizePet(s.pet);
export const petMood = (p) => (!p ? null : p.fed < 20 ? 'Hungry' : p.love < 20 ? 'Lonely' : p.fed > 60 && p.love > 60 ? 'Happy' : 'Okay');

export function adopt(store, kind, name, color = 0, now = store.now()) {
  const s = store.state; if (s.pet) return { ok: false, error: `You already have ${s.pet.name}. One pet is plenty for now.` };
  if (!own(PET_KINDS, kind)) return { ok: false, error: 'Unknown pet' };
  if (!validName(name)) return { ok: false, error: 'Give your pet a name first.' };
  const k = PET_KINDS[kind]; if (store.ledger.balance < k.fee) return { ok: false, error: `The adoption fee is ${fmtMoney(k.fee)}.` };
  const r = store.ledger.debit(k.fee, `Prairie Paws adoption: ${k.name.toLowerCase()}`, { category: 'purchase' }); if (!r.ok) return r;
  s.pet = sanitizePet({ kind, name, color, fed: 80, love: 60, food: PET_FOOD.meals, since: now });   // the shelter sends you home with a starter bag
  notify(store, { app: 'pets', title: `${k.icon} Welcome home, ${s.pet.name}!`, body: 'Feed and play with your new friend in the Pets app. They are waiting at home.' });
  tally(s, 'pets'); store.commit('pet'); return { ok: true, pet: s.pet };
}
export function buyPetFood(store) {
  const s = store.state, p = petOf(s); if (!p) return { ok: false, error: 'Adopt a pet first.' };
  if (p.food + PET_FOOD.meals > 99) return { ok: false, error: 'The cupboard is full of kibble.' };
  const r = store.ledger.debit(PET_FOOD.price, 'Prairie Paws: bag of pet food', { category: 'groceries' }); if (!r.ok) return { ok: false, error: `You need ${fmtMoney(PET_FOOD.price)}.` };
  p.food += PET_FOOD.meals; s.pet = p; store.commit('pet'); return { ok: true, food: p.food };
}
export function feedPet(store, now = store.now()) {
  const s = store.state, p = petOf(s); if (!p) return { ok: false, error: 'Adopt a pet first.' };
  if (p.food <= 0) return { ok: false, error: 'Out of pet food. Buy a bag in the Pets app.' };
  if (p.fed > 92) return { ok: false, error: `${p.name} is full.` };
  if (now - p.lastFed < FEED_MIN_GAP_MS) return { ok: false, error: `${p.name} is still eating.` };
  p.food--; p.fed = clamp(p.fed + 45); p.love = clamp(p.love + 4); p.lastFed = now; s.pet = p; store.commit('pet'); return { ok: true, pet: p };
}
export function playWithPet(store, now = store.now()) {
  const s = store.state, p = petOf(s); if (!p) return { ok: false, error: 'Adopt a pet first.' };
  if (now - p.lastPlay < PLAY_COOLDOWN_MS) return { ok: false, error: `${p.name} needs a breather.` };
  p.love = clamp(p.love + 22); p.fed = clamp(p.fed - 4); p.lastPlay = now; s.pet = p;
  s.needs.fun = clamp((s.needs.fun ?? 60) + 12); s.needs.mood = clamp(s.needs.mood + 6); s.needs.energy = clamp(s.needs.energy - 3);
  tally(s, 'petPlays'); store.commit('pet'); store.commit('needs'); return { ok: true, pet: p };
}
/** Every second: hunger and loneliness creep up (about an hour of play from full to empty). At home a happy pet lifts your mood, a sad one lowers it. */
export function tickPet(store, dtSec, { home = false } = {}) {
  const s = store.state; if (!s.pet) return null; const p = petOf(s); if (!p) { s.pet = null; return null; }
  p.fed = clamp(p.fed - dtSec * 0.025); p.love = clamp(p.love - dtSec * (home ? 0.008 : 0.018));
  const mood = petMood(p);
  if (home && mood === 'Happy') s.needs.mood = clamp(s.needs.mood + dtSec * 0.02);
  else if (mood === 'Hungry' || mood === 'Lonely') s.needs.mood = clamp(s.needs.mood - dtSec * 0.006);
  s.pet = p; return mood;
}
