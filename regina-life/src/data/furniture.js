/**
 * Furniture + decor catalogue (sizes in metres; prices in integer cents of Prairie Dollars, about 2026 Canadian retail, budget to premium).
 * `solid` pieces block movement; rugs/mats/posters do not. `kind` groups cheaper-to-premium variants of one thing and `tier` (1-4 stars)
 * is the quality step inside it, so price rises with tier inside a kind. Footprint labels ("3x1") come from sizeLabel() at 0.5 m cells.
 */
export const CATEGORIES = [
  { id: 'Design',  label: 'Design',  emoji: '🎨' }, { id: 'Sleep',   label: 'Sleep',   emoji: '🛏️' }, { id: 'Kitchen', label: 'Kitchen', emoji: '🍳' },
  { id: 'Bath',    label: 'Bath',    emoji: '🛁' }, { id: 'Comfort', label: 'Comfort', emoji: '🛋️' }, { id: 'Fun',     label: 'Fun',     emoji: '🎮' },
  { id: 'Skills',  label: 'Skills',  emoji: '💪' }, { id: 'Light',   label: 'Light',   emoji: '💡' }, { id: 'Decor',   label: 'Decor',   emoji: '🪴' },
  { id: 'Storage', label: 'Storage', emoji: '🗄️' }, { id: 'Rugs',    label: 'Rugs',    emoji: '🧶' },
];
/** Categories that hold placeable pieces ("Design" holds paint and flooring instead). */
export const FURNITURE_CATS = CATEGORIES.filter((c) => c.id !== 'Design').map((c) => c.id);

const CELL = 0.5, cells = (v) => Math.max(1, Math.ceil(v / CELL - 1e-9));
/** Footprint label in 0.5 m cells, rounded up, larger side first: a 1.5 x 0.9 m table is "3x2". Works for any `{ w, d }` (posters too). */
export const sizeLabel = (def) => { const a = cells(def.w), b = cells(def.d); return `${Math.max(a, b)}x${Math.min(a, b)}`; };
/** Quality stars 1..4 for the card badge (anything without a tier, e.g. a souvenir poster, shows one star). */
export const tierStars = (def) => Math.min(4, Math.max(1, Math.round(def?.tier) || 1));

const A = (id, name, cat, kind, tier, price, w, d, h, color, solid = true) => ({ id, name, cat, kind, tier, price, w, d, h, solid, color });
export const FURNITURE = Object.fromEntries([
  /* ---- Sleep ---- */
  A('mattress',      'Floor mattress',       'Sleep',   'bed',      1,  17900, 1.0,  1.9,  0.25, '#7f9fc4'),
  A('bed_single',    'Platform twin bed',    'Sleep',   'bed',      2,  44900, 1.05, 2.0,  0.72, '#b08a62'),
  A('bed_queen',     'Queen bed',            'Sleep',   'bed',      3,  99900, 1.65, 2.1,  1.0,  '#8b9db8'),
  A('bed_king',      'Upholstered king bed', 'Sleep',   'bed',      4, 219900, 2.05, 2.2,  1.25, '#5c6b8a'),
  A('nightstand',    'Nightstand',           'Sleep',   'bedside',  1,   6900, 0.5,  0.4,  0.55, '#a98e6f'),
  /* ---- Kitchen ---- */
  A('chair',         'Dining chair',         'Kitchen', 'chair',    1,   5900, 0.5,  0.5,  0.9,  '#8a6a48'),
  A('chair_wood',    'Walnut dining chair',  'Kitchen', 'chair',    3,  14900, 0.5,  0.52, 0.88, '#6a4a33'),
  A('table_bistro',  'Bistro table',         'Kitchen', 'dtable',   1,   8900, 0.7,  0.7,  0.75, '#c9b79a'),
  A('dining',        'Dining table',         'Kitchen', 'dtable',   2,  29900, 1.5,  0.9,  0.75, '#7a5a3e'),
  A('dining_oak',    'Oak dining table',     'Kitchen', 'dtable',   3,  64900, 1.8,  0.95, 0.76, '#b58a56'),
  A('cart',          'Rolling kitchen cart', 'Kitchen', 'island',   1,  12900, 0.6,  0.45, 0.85, '#e3dccb'),
  A('island',        'Kitchen island',       'Kitchen', 'island',   3,  54900, 1.2,  0.6,  0.92, '#4f6d7a'),
  /* ---- Bath ---- */
  A('hamper',        'Laundry hamper',       'Bath',    'hamper',   1,   3900, 0.45, 0.4,  0.65, '#c9b79a'),
  A('bath_mat',      'Bath mat',             'Bath',    'bathmat',  1,   2900, 0.5,  0.8,  0.02, '#7fb5b0', false),
  A('bath_cabinet',  'Bathroom cabinet',     'Bath',    'bcab',     2,  12900, 0.5,  0.35, 1.6,  '#e3e6ea'),
  A('washer',        'Washer-dryer combo',   'Bath',    'washer',   3, 109900, 0.6,  0.6,  0.85, '#dfe3e8'),
  A('tub',           'Soaker tub',           'Bath',    'tub',      4, 189900, 1.7,  0.8,  0.6,  '#f1f3f5'),
  /* ---- Comfort ---- */
  A('futon',         'Foam futon',           'Comfort', 'sofa',     1,  24900, 1.9,  0.95, 0.5,  '#6f8aa8'),
  A('loveseat',      'Fabric loveseat',      'Comfort', 'sofa',     2,  54900, 1.6,  0.9,  0.85, '#5f8f87'),
  A('sofa',          'Three-seat sofa',      'Comfort', 'sofa',     3, 109900, 2.1,  0.95, 0.88, '#9a6b52'),
  A('sectional',     'Leather sectional',    'Comfort', 'sofa',     4, 279900, 2.8,  1.7,  0.9,  '#6b4a36'),
  A('beanbag',       'Bean bag',             'Comfort', 'beanbag',  1,   8900, 0.9,  0.9,  0.55, '#3e6a9e'),
  A('armchair',      'Armchair',             'Comfort', 'armchair', 2,  29900, 0.95, 0.95, 0.9,  '#a3552f'),
  A('recliner',      'Recliner',             'Comfort', 'armchair', 3,  69900, 0.95, 1.05, 1.05, '#5d6b73'),
  A('lounge',        'Leather lounge chair', 'Comfort', 'armchair', 4, 149900, 0.9,  0.95, 0.9,  '#7a4b32'),
  A('coffee',        'Coffee table',         'Comfort', 'ctable',   2,  19900, 1.1,  0.6,  0.42, '#5e4733'),
  A('coffee_marble', 'Marble coffee table',  'Comfort', 'ctable',   4,  64900, 1.1,  0.65, 0.4,  '#e6e2da'),
  A('side',          'Side table',           'Comfort', 'stable',   1,   5900, 0.5,  0.5,  0.55, '#6b4f36'),
  /* ---- Fun ---- */
  A('tv_32',         '32" TV and stand',     'Fun',     'tv',       1,  22900, 0.8,  0.35, 0.62, '#2b2e33'),
  A('tv_50',         '50" smart TV',         'Fun',     'tv',       2,  44900, 1.15, 0.35, 0.85, '#25282d'),
  A('tv_65',         '65" 4K TV',            'Fun',     'tv',       3,  89900, 1.5,  0.38, 1.0,  '#202328'),
  A('tv_oled',       '77" OLED TV',          'Fun',     'tv',       4, 249900, 1.8,  0.4,  1.12, '#16181c'),
  A('speaker',       'Stereo cabinet',       'Fun',     'audio',    2,  34900, 0.8,  0.4,  0.7,  '#2b2e33'),
  A('turntable',     'Record console',       'Fun',     'audio',    4, 129900, 1.0,  0.45, 0.85, '#8a5a36'),
  A('foosball',      'Foosball table',       'Fun',     'game',     2,  49900, 1.4,  0.75, 0.9,  '#3f7a5a'),
  A('arcade',        'Arcade cabinet',       'Fun',     'game',     3, 119900, 0.75, 0.85, 1.8,  '#3d3a8c'),
  A('pool',          'Pool table',           'Fun',     'game',     4, 249900, 2.5,  1.4,  0.85, '#2f6d4a'),
  /* ---- Skills ---- */
  A('yoga_mat',      'Yoga mat',             'Skills',  'mat',      1,   3900, 0.7,  1.8,  0.03, '#7a5cc2', false),
  A('dumbbells',     'Dumbbell rack',        'Skills',  'weights',  1,  14900, 0.7,  0.35, 0.75, '#3a3f47'),
  A('bench',         'Weight bench',         'Skills',  'weights',  2,  34900, 1.4,  0.65, 1.1,  '#c0392b'),
  A('exbike',        'Exercise bike',        'Skills',  'cardio',   2,  39900, 0.55, 1.1,  1.1,  '#d2d6dc'),
  A('treadmill',     'Treadmill',            'Skills',  'cardio',   3,  99900, 0.85, 1.9,  1.3,  '#30343b'),
  A('desk',          'Writing desk',         'Skills',  'desk',     1,  14900, 1.2,  0.6,  0.75, '#c9a878'),
  A('bookcase',      'Bookcase',             'Skills',  'shelf',    2,  19900, 1.4,  0.38, 1.9,  '#5b4331'),
  A('easel',         'Art easel',            'Skills',  'easel',    1,   8900, 0.7,  0.6,  1.55, '#b08a62'),
  A('piano',         'Digital piano',        'Skills',  'piano',    3,  89900, 1.4,  0.45, 0.9,  '#1c1e22'),
  /* ---- Light ---- */
  A('lamp_paper',    'Paper lantern lamp',   'Light',   'lamp',     1,   2900, 0.4,  0.4,  1.5,  '#f1e6c8'),
  A('lamp',          'Floor lamp',           'Light',   'lamp',     2,   7900, 0.4,  0.4,  1.7,  '#e8d9a8'),
  A('lamp_tripod',   'Tripod lamp',          'Light',   'lamp',     3,  14900, 0.65, 0.65, 1.65, '#e2c88a'),
  A('lamp_arc',      'Arc floor lamp',       'Light',   'lamp',     4,  32900, 0.95, 0.4,  2.0,  '#f0e2b8'),
  A('fireplace',     'Electric fireplace',   'Light',   'hearth',   3,  59900, 1.1,  0.35, 0.85, '#4a4f58'),
  /* ---- Decor ---- */
  A('plant_pothos',  'Pothos on a stand',    'Decor',   'plant',    1,   2900, 0.4,  0.4,  0.75, '#4c8a46'),
  A('plant',         'Fiddle-leaf plant',    'Decor',   'plant',    2,   5900, 0.55, 0.55, 1.3,  '#3f7a3a'),
  A('plant_palm',    'Kentia palm',          'Decor',   'plant',    3,  13900, 0.8,  0.8,  1.8,  '#3a7a4a'),
  A('plant_tree',    'Indoor olive tree',    'Decor',   'plant',    4,  24900, 0.9,  0.9,  2.0,  '#6f8f5a'),
  A('mirror',        'Full-length mirror',   'Decor',   'mirror',   2,  12900, 0.55, 0.15, 1.7,  '#b08a62'),
  A('aquarium',      'Aquarium on stand',    'Decor',   'aquarium', 3,  59900, 1.2,  0.45, 1.1,  '#3a8fb7'),
  A('clock',         'Grandfather clock',    'Decor',   'clock',    4,  79900, 0.5,  0.3,  1.95, '#5b3d2a'),
  /* ---- Storage ---- */
  A('trunk',         'Storage trunk',        'Storage', 'trunk',    1,   7900, 0.8,  0.45, 0.45, '#8a6a48'),
  A('cube_shelf',    'Cube shelf',           'Storage', 'cube',     1,   8900, 0.8,  0.38, 0.8,  '#e3dccb'),
  A('dresser',       'Dresser',              'Storage', 'dresser',  2,  34900, 1.2,  0.5,  0.95, '#a98e6f'),
  A('tv_unit',       'Media console',        'Storage', 'tvunit',   2,  24900, 1.5,  0.4,  0.5,  '#8f6f4e'),
  A('wardrobe',      'Wardrobe',             'Storage', 'wardrobe', 3,  79900, 1.2,  0.6,  2.0,  '#d8d2c4'),
  A('sideboard',     'Sideboard',            'Storage', 'sideboard',4,  99900, 1.8,  0.45, 0.85, '#7a4f33'),
  /* ---- Rugs ---- */
  A('rug_long',      'Runner rug',           'Rugs',    'rug',      1,   6900, 0.8,  2.4,  0.02, '#3f6a8a', false),
  A('rug_round',     'Round rug',            'Rugs',    'rug',      2,  14900, 2.0,  2.0,  0.02, '#c25b5b', false),
  A('rug_shag',      'Shag rug',             'Rugs',    'rug',      3,  34900, 2.0,  2.8,  0.05, '#d8cdb4', false),
  A('rug_wool',      'Hand-knotted wool rug','Rugs',    'rug',      4,  89900, 2.4,  3.0,  0.03, '#8e3b3b', false),
].map((f) => [f.id, f]));
/** Catalogue order inside a tab: cheapest to premium (stable by name). */
export const itemsInCategory = (cat) => Object.values(FURNITURE).filter((f) => f.cat === cat).sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));

export const POSTER_SIZE = { w: 0.7, d: 0.12, h: 1.0 };
/** Souvenir posters unlock free after a trip: type id `poster_<destination>`. */
export const isPoster = (t) => typeof t === 'string' && t.startsWith('poster_');

/* ---------- Design: wall paint + flooring. Wall = [name, colour, first-time price]; floor = [name, material, colour, first-time price] ---------- */
export const WALLS = {
  cream: ['Cream', '#e9e3d6', 7900], white: ['Bright white', '#f4f2ed', 7900], sage: ['Sage', '#b9c9b0', 7900], mint: ['Mint', '#bfe3d3', 7900],
  sky: ['Sky', '#bcd4e6', 7900], lilac: ['Lilac', '#cfc3e0', 7900], blush: ['Blush', '#e8cfc8', 7900], sun: ['Sunflower', '#f0d98c', 7900],
  terracotta: ['Terracotta', '#c98467', 9900], teal: ['Deep teal', '#3f7f86', 9900],
  forest: ['Forest', '#4d6b52', 12900], navy: ['Navy', '#2f4670', 12900], plum: ['Plum', '#6d4a6b', 12900], charcoal: ['Charcoal', '#4a4f58', 12900],
};
export const FLOORS = {
  oak: ['Oak', 'wood', '#b08a62', 0], birch: ['Birch', 'wood', '#d9c4a1', 54900], maple: ['Maple', 'wood', '#c9a678', 54900], ash: ['Grey ash', 'wood', '#9d9a92', 64900],
  walnut: ['Walnut', 'wood', '#6a4a33', 84900], ebony: ['Ebony', 'wood', '#3b2f2a', 94900],
  white_tile: ['White tile', 'tile', '#d9dde2', 104900], slate: ['Slate tile', 'tile', '#8a8f98', 114900], terracotta_tile: ['Terracotta tile', 'tile', '#b5654a', 124900],
};
/** Cheapest first-time prices (the old flat rates); use wallPrice()/floorPrice() for a specific style. */
export const WALL_PRICE = 7900, FLOOR_PRICE = 54900;
const hasKey = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
export const wallPrice = (k) => (hasKey(WALLS, k) ? WALLS[k][2] : WALL_PRICE);
export const floorPrice = (k) => (hasKey(FLOORS, k) ? FLOORS[k][3] : FLOOR_PRICE);
/** Selling pays 60% of the list price (integer maths, no float drift on cents). */
export const SELL_RATIO = 0.6, MAX_PLACED = 60, MAX_OWNED_EACH = 99;
export const sellPrice = (price) => Math.floor((price * Math.round(SELL_RATIO * 100)) / 100);

/* ---------- what placed pieces DO (read by core/home.js homeBonuses) ---------- */
/**
 * kind -> { stat, v: [value at star 1..4], rep }. Several pieces of one kind stack best-first, each repeat counting `rep` times the one before
 * it (a second sofa is worth half the first). Stats are then hard-capped by HOME_CAPS. sleep/comfort/fun/skill are fractions (0.2 = +20%),
 * mood is flat points. `skill` names the skill an item trains ('fitness' | 'charisma' | 'cooking').
 */
export const HOME_FX = {
  bed:      { stat: 'sleep',   v: [0.08, 0.14, 0.20, 0.26], rep: 0.5 }, bedside:  { stat: 'sleep',   v: [0.01, 0.02, 0.03, 0.04], rep: 0.5 },
  sofa:     { stat: 'comfort', v: [0.06, 0.12, 0.18, 0.24], rep: 0.5 }, armchair: { stat: 'comfort', v: [0.04, 0.08, 0.12, 0.16], rep: 0.5 },
  beanbag:  { stat: 'comfort', v: [0.03, 0.05, 0.07, 0.09], rep: 0.5 }, ctable:   { stat: 'comfort', v: [0.01, 0.02, 0.03, 0.04], rep: 0.5 },
  rug:      { stat: 'comfort', v: [0.02, 0.04, 0.06, 0.09], rep: 0.5 }, tub:      { stat: 'comfort', v: [0.05, 0.09, 0.13, 0.18], rep: 0.5 },
  tv:       { stat: 'fun',     v: [0.10, 0.20, 0.30, 0.40], rep: 0.4 }, audio:    { stat: 'fun',     v: [0.04, 0.08, 0.12, 0.16], rep: 0.5 },
  game:     { stat: 'fun',     v: [0.06, 0.10, 0.16, 0.22], rep: 0.5 },
  weights:  { stat: 'skill', skill: 'fitness',  v: [0.08, 0.16, 0.24, 0.32], rep: 0.5 }, cardio: { stat: 'skill', skill: 'fitness',  v: [0.10, 0.20, 0.30, 0.40], rep: 0.5 },
  mat:      { stat: 'skill', skill: 'fitness',  v: [0.03, 0.05, 0.07, 0.09], rep: 0.5 }, shelf:  { stat: 'skill', skill: 'charisma', v: [0.06, 0.12, 0.18, 0.24], rep: 0.5 },
  desk:     { stat: 'skill', skill: 'charisma', v: [0.04, 0.08, 0.12, 0.16], rep: 0.5 }, easel:  { stat: 'skill', skill: 'charisma', v: [0.05, 0.10, 0.15, 0.20], rep: 0.5 },
  piano:    { stat: 'skill', skill: 'charisma', v: [0.08, 0.16, 0.24, 0.32], rep: 0.5 }, island: { stat: 'skill', skill: 'cooking',  v: [0.08, 0.16, 0.24, 0.32], rep: 0.5 },
  plant:    { stat: 'mood', v: [0.4, 0.7, 1.0, 1.4], rep: 0.6 }, lamp:     { stat: 'mood', v: [0.3, 0.5, 0.8, 1.1], rep: 0.6 }, hearth: { stat: 'mood', v: [0.8, 1.2, 1.6, 2.0], rep: 0.5 },
  aquarium: { stat: 'mood', v: [1.0, 1.5, 2.0, 2.5], rep: 0.5 }, clock:    { stat: 'mood', v: [0.4, 0.6, 0.8, 1.0], rep: 0.5 }, mirror: { stat: 'mood', v: [0.3, 0.5, 0.7, 0.9], rep: 0.5 },
  dtable:   { stat: 'mood', v: [0.2, 0.4, 0.6, 0.8], rep: 0.5 },
};
/** Placed souvenir posters each add a little mood (decaying like any repeat). */
export const POSTER_FX = { stat: 'mood', v: 0.3, rep: 0.6 };
/** Hard caps: no amount of furniture goes past these. */
export const HOME_CAPS = { sleep: 0.3, comfort: 0.3, fun: 0.4, skill: 0.5, mood: 5 };
/** A TV is only as fun as the seat in front of it: x(0.5 + 0.125 * best seat stars), so no seat = half, a four-star sofa = full. */
export const TV_SEAT_KINDS = ['sofa', 'armchair', 'beanbag'];
export const tvSeatFactor = (bestSeatTier) => 0.5 + 0.125 * Math.min(4, Math.max(0, bestSeatTier | 0));
const STAT_LABEL = { sleep: ['😴', 'Sleep'], comfort: ['🛋️', 'Comfort'], fun: ['🎉', 'Fun'], skill: ['📈', 'Skill XP'], mood: ['😊', 'Mood'] };
/** One-line perk for a catalogue card, e.g. { stat: 'sleep', icon, label: 'Sleep', text: '+26%' }; null when the piece is purely cosmetic. */
export function perkOf(def) {
  const fx = def && hasKey(HOME_FX, def.kind) ? HOME_FX[def.kind] : null; if (!fx) return null;
  const v = fx.v[tierStars(def) - 1]; if (!(v > 0)) return null; const [icon, label] = STAT_LABEL[fx.stat];
  return { stat: fx.stat, skill: fx.skill ?? null, icon, label: fx.skill ? `${fx.skill[0].toUpperCase()}${fx.skill.slice(1)} XP` : label, value: v, text: fx.stat === 'mood' ? `+${v.toFixed(1)}` : `+${Math.round(v * 100)}%` };
}

/** Apartment room rectangle that furniture centres may occupy and fixed fixtures that block placement. */
export const ROOM = { x0: -4.05, x1: 4.05, z0: -5.05, z1: 5.05 };
export const KEEPOUT = [
  { n: 'bed', x0: -4.3, z0: -5.2, x1: -2.1, z1: -2.6 }, { n: 'nightstand', x0: -2.1, z0: -5.2, x1: -1.5, z1: -4.6 },
  { n: 'sofa', x0: -1.9, z0: 2.8, x1: 1.1, z1: 4.6 }, { n: 'tv', x0: -1.5, z0: -1.4, x1: 0.7, z1: -0.5 },
  { n: 'kitchen', x0: 3.2, z0: -5.2, x1: 4.5, z1: -1.5 }, { n: 'fridge', x0: 3.2, z0: -1.5, x1: 4.5, z1: -0.3 },
  { n: 'desk', x0: 2.3, z0: 3.0, x1: 4.5, z1: 4.2 }, { n: 'wardrobe', x0: 0.0, z0: -5.4, x1: 1.8, z1: -4.5 },
  { n: 'shower', x0: -4.5, z0: 2.7, x1: -2.5, z1: 4.8 }, { n: 'bookshelf', x0: -4.5, z0: 0.2, x1: -3.9, z1: 2.3 },
  { n: 'door', x0: 2.0, z0: 4.3, x1: 4.5, z1: 5.5 }, { n: 'stereo', x0: 0.9, z0: -0.85, x1: 1.7, z1: -0.25 },
];

/** The apartment's real solid fixtures (mirror of the colliders built in world/interiors.js) — used for walkability checks. */
export const FIXTURES = [
  { n: 'bed', x0: -4.2, z0: -5.1, x1: -2.2, z1: -2.7 }, { n: 'nightstand', x0: -2.05, z0: -5.15, x1: -1.55, z1: -4.65 },
  { n: 'sofa', x0: -1.83, z0: 3.1, x1: 1.03, z1: 4.14 }, { n: 'tv', x0: -1.3, z0: -1.125, x1: 0.5, z1: -0.675 },
  { n: 'kitchen', x0: 3.35, z0: -4.9, x1: 4.25, z1: -1.5 }, { n: 'fridge', x0: 3.45, z0: -1.325, x1: 4.35, z1: -0.475 },
  { n: 'desk', x0: 2.4, z0: 3.2, x1: 4.2, z1: 4.0 }, { n: 'wardrobe', x0: 0.15, z0: -5.275, x1: 1.65, z1: -4.625 },
  { n: 'bookshelf', x0: -4.45, z0: 0.3, x1: -4.05, z1: 2.1 }, { n: 'shower', x0: -4.35, z0: 2.9, x1: -2.6, z1: 4.65 },
  { n: 'stereo', x0: 1.0, z0: -0.725, x1: 1.6, z1: -0.375 },
];
/** Spots the player must always be able to walk to (spawn + every interactable in the apartment). */
export const KEY_POINTS = [
  { n: 'entrance', x: 3.2, z: 4.4 }, { n: 'computer', x: 3.3, z: 2.9 }, { n: 'fridge', x: 2.7, z: -0.9 }, { n: 'stove', x: 2.8, z: -2.6 },
  { n: 'bed', x: -2.0, z: -3.3 }, { n: 'wardrobe', x: 0.9, z: -3.9 }, { n: 'shower', x: -2.2, z: 3.8 }, { n: 'books', x: -3.3, z: 1.3 },
  { n: 'tv', x: -0.4, z: 0.3 }, { n: 'sofa', x: -0.4, z: 2.6 }, { n: 'stereo', x: 1.3, z: 0.4 }, { n: 'switch', x: 4.0, z: 4.2 },
];
