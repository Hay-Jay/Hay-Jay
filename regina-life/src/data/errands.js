/**
 * Errands: everyday services you order from your phone (food delivery, grocery delivery, help around the house).
 * Every restaurant and service here is fictional. Prices are in Prairie Dollar cents, like the rest of the catalog.
 * Delivered meals are real FOOD items (data/catalog.js, shelf 'takeout') so they land in your bag and eat like groceries.
 */

/** Restaurants on the delivery app. `menu` lists FOOD ids. */
export const RESTAURANTS = [
  { id: 'wok',    name: 'Wascana Wok',          icon: '🥡', tag: 'Chinese-Canadian', color: '#e05a2b', menu: ['ginger_beef', 'fried_rice'] },
  { id: 'pizza',  name: 'Queen City Pizza',     icon: '🍕', tag: 'Pizza',            color: '#c0392b', menu: ['pizza_slice', 'pizza_whole'] },
  { id: 'perogy', name: 'Prairie Perogy House', icon: '🥟', tag: 'Ukrainian comfort', color: '#8e6bd8', menu: ['perogies', 'cabbage_rolls'] },
  { id: 'bowl',   name: 'Bannock & Bowl',       icon: '🫓', tag: 'Indigenous-inspired', color: '#b5651d', menu: ['bannock_burger', 'bison_chili'] },
  { id: 'sweet',  name: 'Saskatoon Sweet Shop', icon: '🥧', tag: 'Desserts',         color: '#6c3fb5', menu: ['saskatoon_pie', 'sundae'] },
  { id: 'fuel',   name: 'Morning Fuel Café',    icon: '☕', tag: 'Breakfast & coffee', color: '#7a5230', menu: ['breakfast_wrap', 'latte'] },
];
export const RESTAURANT_BY_ID = Object.fromEntries(RESTAURANTS.map((r) => [r.id, r]));

/** Fees and timings (real seconds: Regina Life runs on real Regina time). */
export const DELIVERY_FEE = 499;
export const GROCERY_FEE = 699;
export const FOOD_SECS = 90;          // kitchen + ride over
export const GROCERY_SECS = 120;
export const MAX_ACTIVE = 3;          // orders on the way at once
export const MAX_ITEMS = 8;           // items in one order

/** Help around the house: booked, then done after `secs`, then their effect lands on your needs. */
export const SERVICES = [
  { id: 'cleaning', name: 'Home cleaning',  icon: '🧽', price: 4500, secs: 75, fx: { mood: 12, fun: 4 },      blurb: 'A crew tidies and scrubs your place top to bottom.', done: 'Your place is spotless. It even smells nice.' },
  { id: 'laundry',  name: 'Laundry pickup', icon: '🧺', price: 2500, secs: 90, fx: { hygiene: 18, mood: 4 },  blurb: 'Bag it up, they wash, fold and bring it back.',      done: 'Fresh, folded laundry is back at your door.' },
  { id: 'massage',  name: 'Massage at home', icon: '💆', price: 6000, secs: 60, fx: { energy: 20, mood: 14 }, blurb: 'A registered massage therapist comes to you.',       done: 'Every knot, gone. You feel brand new.' },
  { id: 'tutor',    name: 'Study tutor',     icon: '📚', price: 3500, secs: 60, fx: { mood: 6 }, skill: ['charisma', 10], blurb: 'An hour of one-on-one coaching on public speaking.', done: 'Your tutor says you are a natural. Charisma up.' },
];
export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

/** Shown greyed out on the Errands home: services that are on their way to Regina Life. */
export const ERRANDS_SOON = [
  { icon: '🚕', name: 'Rides', blurb: 'Hail a ride across the city' },
  { icon: '💊', name: 'Pharmacy', blurb: 'Cold meds and vitamins to your door' },
  { icon: '🐾', name: 'Pet care', blurb: 'Dog walkers and sitters' },
  { icon: '🔧', name: 'Handyman', blurb: 'Fix-ups and furniture assembly' },
];
