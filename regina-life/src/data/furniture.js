/** Furniture + decor catalog (sizes in metres). `solid` items block movement; rugs/posters do not. */
export const FURNITURE = {
  armchair:  { id: 'armchair',  name: 'Armchair',      price: 6900,  w: 0.95, d: 0.95, h: 0.9,  solid: true,  color: '#a3552f', cat: 'Seating' },
  beanbag:   { id: 'beanbag',   name: 'Bean bag',      price: 4900,  w: 0.9,  d: 0.9,  h: 0.55, solid: true,  color: '#3e6a9e', cat: 'Seating' },
  chair:     { id: 'chair',     name: 'Dining chair',  price: 3900,  w: 0.5,  d: 0.5,  h: 0.9,  solid: true,  color: '#8a6a48', cat: 'Seating' },
  dining:    { id: 'dining',    name: 'Dining table',  price: 14900, w: 1.5,  d: 0.9,  h: 0.75, solid: true,  color: '#7a5a3e', cat: 'Tables' },
  coffee:    { id: 'coffee',    name: 'Coffee table',  price: 7900,  w: 1.1,  d: 0.6,  h: 0.42, solid: true,  color: '#5e4733', cat: 'Tables' },
  side:      { id: 'side',      name: 'Side table',    price: 3400,  w: 0.5,  d: 0.5,  h: 0.55, solid: true,  color: '#6b4f36', cat: 'Tables' },
  bookcase:  { id: 'bookcase',  name: 'Bookcase',      price: 8900,  w: 1.4,  d: 0.38, h: 1.9,  solid: true,  color: '#5b4331', cat: 'Storage' },
  dresser:   { id: 'dresser',   name: 'Dresser',       price: 11900, w: 1.2,  d: 0.5,  h: 0.95, solid: true,  color: '#a98e6f', cat: 'Storage' },
  plant:     { id: 'plant',     name: 'Fiddle-leaf plant', price: 2400, w: 0.55, d: 0.55, h: 1.3, solid: true, color: '#3f7a3a', cat: 'Decor' },
  lamp:      { id: 'lamp',      name: 'Floor lamp',    price: 3900,  w: 0.4,  d: 0.4,  h: 1.7,  solid: true,  color: '#e8d9a8', cat: 'Decor' },
  speaker:   { id: 'speaker',   name: 'Stereo cabinet',price: 6900,  w: 0.8,  d: 0.4,  h: 0.7,  solid: true,  color: '#2b2e33', cat: 'Decor' },
  rug_round: { id: 'rug_round', name: 'Round rug',     price: 5900,  w: 2.0,  d: 2.0,  h: 0.02, solid: false, color: '#c25b5b', cat: 'Rugs' },
  rug_long:  { id: 'rug_long',  name: 'Runner rug',    price: 4200,  w: 0.8,  d: 2.4,  h: 0.02, solid: false, color: '#3f6a8a', cat: 'Rugs' },
};
export const POSTER_SIZE = { w: 0.7, d: 0.12, h: 1.0 };
/** Souvenir posters unlock free after a trip: type id `poster_<destination>`. */
export const isPoster = (t) => typeof t === 'string' && t.startsWith('poster_');
export const WALLS = { cream: ['Cream', '#e9e3d6'], sage: ['Sage', '#b9c9b0'], sky: ['Sky', '#bcd4e6'], blush: ['Blush', '#e8cfc8'], sun: ['Sunflower', '#f0d98c'], charcoal: ['Charcoal', '#4a4f58'] };
export const FLOORS = { oak: ['Oak', 'wood', '#b08a62'], birch: ['Birch', 'wood', '#d9c4a1'], walnut: ['Walnut', 'wood', '#6a4a33'], slate: ['Slate tile', 'tile', '#8a8f98'] };
export const WALL_PRICE = 4000, FLOOR_PRICE = 12000, SELL_RATIO = 0.5, MAX_PLACED = 24;
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
