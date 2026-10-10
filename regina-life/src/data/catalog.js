/**
 * Item + clothing catalog. Prices are integer cents of Prairie Dollars (fictional in-game currency) calibrated to 2026
 * Canadian dollars at Regina retailers (mid-range, tax included in the shelf price) — see docs/ECONOMY.md for the references.
 */
export const FOOD = {
  apple:    { id: 'apple',    name: 'Honeycrisp Apple', price: 189, hunger: 12, energy: 2,  icon: '🍎', shelf: 'produce' },
  bread:    { id: 'bread',    name: 'Sourdough Loaf',   price: 649, hunger: 22, energy: 4,  icon: '🍞', shelf: 'bakery' },
  sandwich: { id: 'sandwich', name: 'Deli Sandwich',    price: 949, hunger: 38, energy: 6,  icon: '🥪', shelf: 'deli' },
  chips:    { id: 'chips',    name: 'Ketchup Chips',    price: 499, hunger: 14, energy: 3,  icon: '🥔', shelf: 'snacks' },
  milk:     { id: 'milk',     name: 'Milk 2L',          price: 539, hunger: 16, energy: 4,  icon: '🥛', shelf: 'cooler' },
  coffee:   { id: 'coffee',   name: 'Double-Double',    price: 279, hunger: 2,  energy: 22, icon: '☕', shelf: 'cooler' },
  pop:      { id: 'pop',      name: 'Cream Soda',       price: 229, hunger: 4,  energy: 10, icon: '🥤', shelf: 'cooler' },
  bannock:  { id: 'bannock',  name: 'Fresh Bannock',    price: 599, hunger: 30, energy: 5,  icon: '🫓', shelf: 'bakery' },
};
export const MARKET_STOCK = Object.keys(FOOD);

/** slot: top | bottom | shoes | head | face | neck */
export const CLOTHES = {
  tee_white:   { id: 'tee_white',   slot: 'top',    style: 'tee',     color: '#e9e6df', name: 'Classic Tee — Bone',   price: 0 },
  tee_black:   { id: 'tee_black',   slot: 'top',    style: 'tee',     color: '#1d1f24', name: 'Classic Tee — Black',  price: 0 },
  tee_navy:    { id: 'tee_navy',    slot: 'top',    style: 'tee',     color: '#233a5e', name: 'Classic Tee — Navy',   price: 0 },
  hoodie_grey: { id: 'hoodie_grey', slot: 'top',    style: 'hoodie',  color: '#6c7077', name: 'Hoodie — Prairie Grey',price: 6500 },
  hoodie_red:  { id: 'hoodie_red',  slot: 'top',    style: 'hoodie',  color: '#a3312f', name: 'Hoodie — Rider Red',   price: 6500 },
  sweater_cream:{id: 'sweater_cream',slot:'top',    style: 'sweater', color: '#d8cdb4', name: 'Knit Sweater — Cream', price: 7900 },
  jacket_green:{ id: 'jacket_green',slot: 'top',    style: 'jacket',  color: '#3e5b43', name: 'Field Jacket — Sage',  price: 12900 },
  jacket_black:{ id: 'jacket_black',slot: 'top',    style: 'jacket',  color: '#222428', name: 'Parka — Midnight',     price: 29900 },
  jeans_blue:  { id: 'jeans_blue',  slot: 'bottom', style: 'jeans',   color: '#34507a', name: 'Straight Jeans — Indigo', price: 0 },
  jeans_black: { id: 'jeans_black', slot: 'bottom', style: 'jeans',   color: '#1f2226', name: 'Straight Jeans — Black',  price: 5900 },
  chino_tan:   { id: 'chino_tan',   slot: 'bottom', style: 'chino',   color: '#b49a72', name: 'Chinos — Wheat',       price: 5400 },
  jogger_grey: { id: 'jogger_grey', slot: 'bottom', style: 'jogger',  color: '#4a4e55', name: 'Joggers — Slate',      price: 4800 },
  shorts_khaki:{ id: 'shorts_khaki',slot: 'bottom', style: 'shorts',  color: '#a99871', name: 'Shorts — Khaki',       price: 3900 },
  sneaker_white:{id: 'sneaker_white',slot:'shoes',  style: 'sneaker', color: '#f0efe9', name: 'Court Sneakers — White', price: 0 },
  sneaker_black:{id: 'sneaker_black',slot:'shoes',  style: 'sneaker', color: '#202226', name: 'Court Sneakers — Black', price: 8900 },
  boots_brown: { id: 'boots_brown', slot: 'shoes',  style: 'boots',   color: '#5b3d26', name: 'Winter Boots — Brown', price: 16900 },
  dress_black: { id: 'dress_black', slot: 'shoes',  style: 'dress',   color: '#16171a', name: 'Oxfords — Black',      price: 12900 },
  none_head:   { id: 'none_head',   slot: 'head',   style: 'none',    color: '#000000', name: 'No headwear',          price: 0 },
  toque_red:   { id: 'toque_red',   slot: 'head',   style: 'toque',   color: '#b5302c', name: 'Toque — Rider Red',    price: 2400 },
  toque_grey:  { id: 'toque_grey',  slot: 'head',   style: 'toque',   color: '#7a7d82', name: 'Toque — Grey',         price: 2400 },
  cap_navy:    { id: 'cap_navy',    slot: 'head',   style: 'cap',     color: '#223458', name: 'Ball Cap — Navy',      price: 2900 },
  none_face:   { id: 'none_face',   slot: 'face',   style: 'none',    color: '#000000', name: 'No eyewear',           price: 0 },
  glasses_black:{id: 'glasses_black',slot:'face',   style: 'glasses', color: '#121214', name: 'Round Glasses — Black',price: 8900 },
  shades:      { id: 'shades',      slot: 'face',   style: 'shades',  color: '#0c0c0e', name: 'Sunglasses',           price: 5200 },
  none_neck:   { id: 'none_neck',   slot: 'neck',   style: 'none',    color: '#000000', name: 'No scarf',             price: 0 },
  scarf_plaid: { id: 'scarf_plaid', slot: 'neck',   style: 'scarf',   color: '#8a2e2a', name: 'Wool Scarf — Brick',   price: 3400 },
};
export const STARTER_WARDROBE = Object.values(CLOTHES).filter((c) => c.price === 0).map((c) => c.id);
export const SLOTS = ['top', 'bottom', 'shoes', 'head', 'face', 'neck'];
export const STORE_STOCK = Object.values(CLOTHES).filter((c) => c.price > 0).map((c) => c.id);

export const SKIN_TONES = ['#f6d9c3', '#efc3a0', '#e0a87c', '#c68a5b', '#a56a3f', '#7d4a2a', '#5a331d', '#3b2314'];
export const HAIR_COLORS = ['#0d0b0a', '#2a1b12', '#4a3020', '#7a5230', '#b58a52', '#d8c08a', '#8d2f1d', '#8e8e92', '#d9d9dc'];
export const EYE_COLORS = ['#3a2a1d', '#5b7a52', '#4f7ea8', '#6b6f73'];
export const HAIR_STYLES = ['buzz', 'short', 'side-part', 'long', 'bun', 'curly', 'afro', 'braids', 'bald'];
export const FACE_SHAPES = ['oval', 'round', 'square', 'heart'];
export const BODY_TYPES = ['slim', 'average', 'athletic', 'broad'];
export const FACIAL_HAIR = ['none', 'stubble', 'moustache', 'goatee', 'full'];
export const EXPRESSIONS = ['neutral', 'smile', 'serious', 'surprised'];

export const DEFAULT_LOOK = {
  skin: 2, hair: 'short', hairColor: 2, eyes: 0, face: 'oval', body: 'average', facialHair: 'none', expression: 'smile',
  height: 1.0,
  top: 'tee_navy', bottom: 'jeans_blue', shoes: 'sneaker_white', head: 'none_head', face_acc: 'none_face', neck: 'none_neck',
};
// `face` is the face *shape*; the wearable face accessory is stored under `face_acc`.
export const SLOT_KEY = { top: 'top', bottom: 'bottom', shoes: 'shoes', head: 'head', face: 'face_acc', neck: 'neck' };

export const ITEM_NAME = (id) => FOOD[id]?.name ?? CLOTHES[id]?.name ?? id;
export const ITEM_PRICE = (id) => FOOD[id]?.price ?? CLOTHES[id]?.price ?? null;
