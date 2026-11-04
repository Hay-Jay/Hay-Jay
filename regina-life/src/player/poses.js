/**
 * Activity poses (docs/AMAZING.md D8): what your character's body does while an activity, a gig step or a small moment plays out. Reading on a bench,
 * strumming on Scarth Street, shovelling a walk, painting at the easel, dancing to the radio at home.
 *
 * Pure data and maths, no three.js, so it is tested on its own (tests/poses.test.js). A pose writes joint TARGETS (the same keys the character's
 * damped blend uses: player/character.js) on top of the idle, walk or sit targets for that frame; the blend smooths every change.
 *
 * A pose: { upper(t, T, o), lower?(t, T, o), props?: [names], speed?: n (fake stride speed: run in place), walk?: true (may play while walking),
 *           idleOnly?: true (a hold that only plays while standing still) }
 *   t = seconds since the pose began, T = joint targets, o = { sitting, seed }
 *
 * Joint conventions (character faces +z): ShX/ElX negative = swing the arm or forearm forward and up; lShZ positive and rShZ negative = toward the
 * body's middle; LegX negative = thigh forward; KneeX positive = bend; spineX positive = lean forward; headX positive = look down.
 */

const { sin, cos, max, min, PI, abs } = Math;
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => max(0, min(1, u));
/** 0 -> 1 -> 0 over one cycle, resting on 0 for the first `rest` part (a reach, a sip, a bite). */
const pulse = (t, period, rest = 0.4) => { const u = (t % period) / period; return u < rest ? 0 : sin(((u - rest) / (1 - rest)) * PI); };

/** Upper-body keys a pose may write while the legs keep walking (a `walk: true` pose must not touch anything else). */
export const UPPER_KEYS = ['spineX', 'spineY', 'spineZ', 'headX', 'headY', 'lShX', 'lShZ', 'lElX', 'rShX', 'rShZ', 'rElX'];
export const LOWER_KEYS = ['hipsY', 'lLegX', 'lKneeX', 'rLegX', 'rKneeX', 'lAnkX', 'rAnkX', 'lLegZ', 'rLegZ'];
/** Every prop the character knows how to build (player/character.js PROP_BUILD). */
export const PROP_NAMES = ['book', 'phone', 'guitar', 'shovel', 'rake', 'brush', 'palette', 'flyers', 'flyer', 'dumbbellL', 'dumbbellR', 'cup', 'pad', 'trowel', 'spoon', 'food', 'leash', 'umbrella'];

const armsCrossed = (T) => { T.lShX = -0.32; T.lShZ = 0.5; T.lElX = -1.5; T.rShX = -0.2; T.rShZ = -0.5; T.rElX = -1.55; };
const handsBehind = (T) => { T.lShX = 0.38; T.rShX = 0.38; T.lShZ = 0.22; T.rShZ = -0.22; T.lElX = -0.45; T.rElX = -0.45; };
const bothHandsFront = (T, sh = -0.62, el = -1.55, inn = 0.34) => { T.lShX = T.rShX = sh; T.lShZ = inn; T.rShZ = -inn; T.lElX = T.rElX = el; };
const crouch = (T) => { T.hipsY = 0.5; T.lLegX = T.rLegX = -1.2; T.lKneeX = T.rKneeX = 2.05; T.lAnkX = T.rAnkX = -0.85; T.lLegZ = -0.12; T.rLegZ = 0.12; };
const bob = (T, t, f = 4, a = 0.12) => { const b = max(0, sin(t * f)) * a; T.lKneeX = 0.06 + b; T.rKneeX = 0.06 + b; T.hipsY -= b * 0.08; };

export const POSES = {
  /* ---- quiet moments ---- */
  read: { props: ['book'], upper(t, T) { bothHandsFront(T); T.headX = 0.42 + sin(t * 0.7) * 0.03; T.headY = sin(t * 0.23) * 0.05; T.spineX += 0.03; } },
  phone: { props: ['phone'], walk: true, upper(t, T) { T.rShX = -0.55; T.rShZ = -0.38; T.rElX = -1.95 + sin(t * 9) * 0.03; T.lShX = -0.48; T.lShZ = 0.4; T.lElX = -1.7; T.headX = 0.45; } },
  watch: { upper(t, T) { armsCrossed(T); T.headY = sin(t * 0.4) * 0.35; T.spineX += max(0, sin(t * 2.3)) ** 8 * 0.05; } },            // people-watching, TV: a chuckle now and then
  shade: { upper(t, T) { T.rShX = -1.95; T.rShZ = -0.62; T.rElX = -1.95; T.lShX = 0.1; T.lShZ = -0.08; T.lElX = -0.3; T.headX = -0.12; T.headY = sin(t * 0.3) * 0.28; } },   // hand over the eyes: the geese
  sky: { upper(t, T) { handsBehind(T); T.spineX = -0.1; T.headX = -0.5 + sin(t * 0.4) * 0.05; T.headY = sin(t * 0.17) * 0.3; } },   // the big prairie sky
  browse: { upper(t, T) { handsBehind(T); T.spineX += 0.12; T.headX = 0.12; T.headY = sin(t * 0.55) * 0.38; }, lower(t, T) { T.lLegZ = -0.05 + sin(t * 0.5) * 0.03; } },
  breathe: { upper(t, T) { const k = ease((sin(t * 0.9 - PI / 2) + 1) / 2); T.lShZ = -0.1 - 1.15 * k; T.rShZ = 0.1 + 1.15 * k; T.lShX = T.rShX = -0.15 * k; T.lElX = T.rElX = -0.1; T.headX = -0.25 * k; T.spineX = -0.06 * k; } },   // arms open, a deep breath of lake air
  clap: { upper(t, T) { const c = sin(t * 13) * 0.11; T.lShX = T.rShX = -0.95; T.lShZ = 0.5 + c; T.rShZ = -0.5 - c; T.lElX = T.rElX = -0.95; T.headX = 0.06 * sin(t * 6); }, lower(t, T) { bob(T, t, 6, 0.1); } },
  /* ---- music and art ---- */
  guitar: { props: ['guitar'], upper(t, T) { T.lShX = -0.85; T.lShZ = -0.5; T.lElX = -0.8; T.rShX = -0.32; T.rShZ = -0.44; T.rElX = -1.2 + sin(t * 8) * 0.24; T.headX = 0.14 + sin(t * 4) * 0.05; T.spineZ += sin(t * 2) * 0.04; }, lower(t, T) { bob(T, t, 4, 0.14); } },
  piano: { upper(t, T) { bothHandsFront(T, -0.78, -0.95, 0.12); T.lShZ += sin(t * 6.2) * 0.08; T.rShZ -= cos(t * 5.1) * 0.08; T.headX = 0.1 + sin(t * 3) * 0.05; T.spineZ += sin(t * 1.5) * 0.05; } },
  paint: { props: ['brush', 'palette'], upper(t, T) { T.rShX = -1.25 + sin(t * 5) * 0.08; T.rShZ = -0.15; T.rElX = -0.55 + cos(t * 5) * 0.08; T.lShX = -0.5; T.lShZ = -0.38; T.lElX = -1.3; T.headX = 0.04; T.headY = sin(t * 0.5) * 0.12; } },
  dance: { idleOnly: true, upper(t, T) { const a = sin(t * 4.2); T.lShX = -0.6 + 0.5 * a; T.rShX = -0.6 - 0.5 * a; T.lElX = T.rElX = -1.4; T.lShZ = -0.25 - 0.2 * max(0, a); T.rShZ = 0.25 + 0.2 * max(0, -a); T.spineZ = 0.12 * sin(t * 4.2); T.headX = 0.08 * sin(t * 8.4); T.headY = 0.15 * sin(t * 2.1); },
    lower(t, T) { const b = abs(sin(t * 4.2)); T.lKneeX = T.rKneeX = 0.12 + 0.22 * b; T.hipsY = 0.9 - 0.045 * b; T.lLegZ = -0.06; T.rLegZ = 0.06; } },
  /* ---- fitness ---- */
  jog: { speed: 3.6, upper() {} },
  ride: { upper(t, T) { bothHandsFront(T, -1.05, -0.35, 0.18); T.spineX = 0.32; T.headX = -0.2; T.spineZ = sin(t * 5) * 0.03; } },   // the exercise bike: lean onto the bars                                                                       // the run cycle, in place on the treadmill deck
  lift: { props: ['dumbbellL', 'dumbbellR'], upper(t, T) { const k = (1 - cos(t * 3.2)) / 2; T.lShX = T.rShX = -0.15; T.lShZ = -0.08; T.rShZ = 0.08; T.lElX = T.rElX = -0.2 - 1.9 * k; T.spineX = -0.03; T.headX = -0.05; }, lower(t, T) { T.lLegZ = -0.12; T.rLegZ = 0.12; } },
  yoga: { upper(t, T) {   // a one-legged balance, palms high, swaying gently
    T.lShX = T.rShX = -2.95; T.lShZ = 0.12; T.rShZ = -0.12; T.lElX = T.rElX = -0.15; T.spineZ = sin(t * 0.8) * 0.14; T.headX = -0.1; },
    lower(t, T) { T.rLegX = -1.0; T.rLegZ = 0.45; T.rKneeX = 2.0; T.rAnkX = 0.4; T.lLegZ = -0.02; } },
  /* ---- home ---- */
  shower: { upper(t, T) { T.lShX = T.rShX = -2.45; T.lShZ = 0.5; T.rShZ = -0.5; T.lElX = T.rElX = -1.7 + sin(t * 8) * 0.15; T.headX = -0.12; T.headY = sin(t * 1.5) * 0.15; } },
  game: { props: ['pad'], upper(t, T) { bothHandsFront(T, -0.45, -1.45 + sin(t * 14) * 0.03, 0.42); T.headX = 0.12; T.spineX += 0.06 + max(0, sin(t * 1.7)) ** 6 * 0.08; } },
  drink: { props: ['cup'], upper(t, T) { const k = pulse(t, 3, 0.45); T.rShX = -0.5 - 0.55 * k; T.rShZ = -0.3 - 0.15 * k; T.rElX = -1.6 - 0.75 * k; T.headX = -0.18 * k; } },
  eat: { props: ['food'], upper(t, T) { const k = pulse(t, 1.5, 0.35); T.rShX = -0.55 - 0.5 * k; T.rShZ = -0.32 - 0.12 * k; T.rElX = -1.55 - 0.85 * k; T.headX = -0.05 * k + max(0, sin(t * 9)) * 0.03 * (1 - k); } },
  stir: { props: ['spoon'], upper(t, T) { T.rShX = -0.85 + 0.12 * cos(t * 6); T.rShZ = -0.25 + 0.15 * sin(t * 6); T.rElX = -1.0; T.lShX = -0.6; T.lShZ = -0.2; T.lElX = -0.9; T.headX = 0.32; } },
  /* ---- odd jobs ---- */
  shovel: { props: ['shovel'], upper(t, T) {
    const u = (t % 1.8) / 1.8, dig = u < 0.45 ? ease(u / 0.45) : 1, lift = u < 0.45 ? 0 : u < 0.75 ? ease((u - 0.45) / 0.3) : 1, toss = u < 0.75 ? 0 : sin(((u - 0.75) / 0.25) * PI);
    T.spineX = 0.45 * dig - 0.25 * lift; T.spineY = 0.55 * toss; T.rShX = T.lShX = -0.45 - 0.5 * lift; T.rShZ = -0.2; T.lShZ = 0.35; T.rElX = -0.3 - 0.3 * lift; T.lElX = -0.55 - 0.3 * lift; T.headX = 0.2 * dig;
  }, lower(t, T) { T.lKneeX = T.rKneeX = 0.35; T.lLegX = -0.25; T.rLegX = 0.15; T.hipsY = 0.86; } },
  rake: { props: ['rake'], upper(t, T) { const s = sin(t * 4.4); T.rShX = -0.7 + 0.25 * s; T.lShX = -0.55 + 0.25 * s; T.rShZ = -0.2; T.lShZ = 0.3; T.rElX = -0.5; T.lElX = -0.7; T.spineX = 0.25 + 0.06 * s; T.spineY = 0.15 * s; T.headX = 0.25; },
    lower(t, T) { T.lLegX = -0.22; T.rLegX = 0.18; T.lKneeX = T.rKneeX = 0.2; } },
  plant: { props: ['trowel'], upper(t, T) { T.spineX = 0.4; T.rShX = -0.95 + 0.15 * sin(t * 4); T.rShZ = -0.1; T.rElX = -0.35; T.lShX = -0.65; T.lShZ = 0.1; T.lElX = -0.4; T.headX = 0.3; }, lower(t, T) { crouch(T); } },
  flyer: { props: ['flyers', 'flyer'], upper(t, T) { const k = ease(clamp01(pulse(t, 3.2, 0.3) * 1.4)); T.rShX = -0.35 - 0.9 * k; T.rShZ = -0.05; T.rElX = -0.9 + 0.6 * k; T.lShX = -0.5; T.lShZ = 0.38; T.lElX = -1.65; T.headY = sin(t * 0.8) * 0.3; T.spineX += 0.05 * k; } },
  /* ---- photo poses ---- */
  wave: { upper(t, T) { T.rShX = -2.5; T.rShZ = -0.5 + sin(t * 9) * 0.3; T.rElX = -0.6 + sin(t * 9) * 0.25; T.headX = -0.04; } },
  cheer: { upper(t, T) { T.lShX = T.rShX = -2.75 + sin(t * 3) * 0.06; T.lShZ = -0.35; T.rShZ = 0.35; T.lElX = T.rElX = -0.25; T.headX = -0.18; } },
  /* ---- holds that ride along with walking ---- */
  leash: { props: ['leash'], walk: true, upper(t, T) { T.lShX = -0.55; T.lShZ = -0.15; T.lElX = -0.35; } },
  umbrella: { props: ['umbrella'], walk: true, upper(t, T) { T.rShX = -0.32; T.rShZ = -0.1; T.rElX = -1.88; } },
};

/** Activity id (core/game.js ACTIVITIES) -> pose. */
export const ACTIVITY_POSE = {
  shower: 'shower', tv: 'watch', read: 'read', treadmill: 'jog', weights: 'lift', yoga: 'yoga', canvass: 'flyer', piano: 'piano', paint: 'paint', gaming: 'game', water: 'drink',
  bench: 'read', people: 'watch', buskers: 'clap', window: 'browse', geese: 'shade', shore: 'breathe', sky: 'sky', grounds: 'breathe',
};
/** Odd-job kind (data/gigs.js GIG_KINDS) -> the pose for its timed steps. Grocery runs carry the bag instead (the carry pose). */
export const GIG_POSE = { shovel: 'shovel', leaves: 'rake', tulips: 'plant', flyers: 'flyer', busk: 'guitar', dogwalk: 'leash', delivery: null };

/** Apply `name` to the joint targets T. `walking` (0..1) gates holds: a pose that is not `walk: true` gives way once you start moving. Returns the pose or null. */
export function applyPose(name, t, T, { sitting = false, walking = 0 } = {}) {
  const p = Object.prototype.hasOwnProperty.call(POSES, name) ? POSES[name] : null; if (!p) return null;
  if (walking > 0.15 && !p.walk) return null;
  if (p.lower && !sitting && walking <= 0.15) p.lower(t, T, { sitting });
  p.upper(t, T, { sitting });
  return p;
}
