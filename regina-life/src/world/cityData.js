/**
 * Regina city layout data — pure data, no rendering, shared by the 3D world, minimap and full map.
 *
 * The downtown grid + Wascana corridor is a stylised, playable district. Outer neighbourhoods are placed
 * from real latitude/longitude (approximate) so the overall geography of the city is preserved and can be
 * detailed in later milestones.
 */
import { project } from '../core/geo.js';

export const PITCH = 110;        // block pitch (m)
export const ROAD_W = 18;        // road corridor incl. sidewalks
export const ASPHALT_W = 12;
export const SIDEWALK_W = 3;
export const GRID = { i0: -6, i1: 6, j0: -5, j1: 7 };           // road indices
export const grid = {
  x0: GRID.i0 * PITCH, x1: GRID.i1 * PITCH, z0: GRID.j0 * PITCH, z1: GRID.j1 * PITCH,
};
export const ALBERT_X = PITCH; // Albert St (N–S) is grid line i = 1; it crosses Wascana Lake on the memorial bridge

const AVE = { '-5': '7th Ave', '-4': '8th Ave', '-3': '9th Ave', '-2': '10th Ave', '-1': '11th Ave', 0: 'Victoria Ave', 1: '12th Ave', 2: '13th Ave', 3: '14th Ave', 4: '15th Ave', 5: '16th Ave', 6: '17th Ave', 7: '18th Ave' };
const STR = { '-6': 'Elphinstone St', '-5': 'Retallack St', '-4': 'Winnipeg St', '-3': 'Montreal St', '-2': 'Lorne St', '-1': 'Scarth St', 0: 'Rose St', 1: 'Albert St', 2: 'Hamilton St', 3: 'Cornwall St', 4: 'Smith St', 5: 'Broad St', 6: 'Halifax St' };
export const streetName = (i) => STR[i] ?? `St ${i}`;
export const avenueName = (j) => AVE[j] ?? `Ave ${j}`;

/** Lat/lon landmarks (approximate public coordinates). */
const LL = (lat, lon) => project(lat, lon);
export const DISTRICTS = [
  { id: 'downtown',     name: 'Downtown Regina',          ...{ x: 0, z: 0 },       r: 700, color: '#6c8cff', detail: 'playable', label: { x: 0, z: grid.z0 - 40 } },
  { id: 'wascana',      name: 'Wascana Centre',           ...{ x: 160, z: 1150 },  r: 700, color: '#46c07a', detail: 'playable', label: { x: -900, z: 1400 } },
  { id: 'cathedral',    name: 'Cathedral',                ...LL(50.4375, -104.6395), r: 420, color: '#d98c5f', detail: 'massing' },
  { id: 'northcentral', name: 'North Central',            ...LL(50.4640, -104.6165), r: 420, color: '#c9a64e', detail: 'massing' },
  { id: 'rochdale',     name: 'Rochdale / Northwest',     ...LL(50.4830, -104.6600), r: 520, color: '#b684e0', detail: 'massing' },
  { id: 'stadium',      name: 'Mosaic Stadium Area',      ...LL(50.4528, -104.6395), r: 360, color: '#e0615a', detail: 'massing' },
  { id: 'east',         name: 'East Regina',              ...LL(50.4440, -104.5500), r: 560, color: '#5fb7c9', detail: 'massing' },
  { id: 'south',        name: 'South Regina',             ...LL(50.4090, -104.6200), r: 520, color: '#8bc15f', detail: 'massing' },
  { id: 'uofr',         name: 'University of Regina',     ...LL(50.4165, -104.5890), r: 430, color: '#4d9be6', detail: 'massing' },
  { id: 'harbour',      name: 'Harbour Landing',          ...LL(50.4010, -104.6700), r: 560, color: '#e089b0', detail: 'massing' },
  { id: 'airport',      name: 'Regina International Airport', ...LL(50.4319, -104.6658), r: 520, color: '#9aa3b2', detail: 'massing' },
];

export const POIS = [
  { id: 'lofts',   name: 'Wheat City Lofts (Home)', cat: 'home',     x: -30, z: 9.4,  enter: 'apartment', emoji: '🏠', state: 'open', blurb: 'Your rented Unit 204. Sleep, shower, cook, watch TV and change outfits.' },
  { id: 'market',  name: 'Prairie Corner Market',   cat: 'shop',     x: 30,  z: 9.4,  enter: 'market',    emoji: '🧺', state: 'open', blurb: 'Groceries, a bakery and a deli. Also hiring shelf stockers.' },
  { id: 'threads', name: 'Prairie Threads',         cat: 'shop',     x: 29,  z: -9.4, enter: 'threads',   emoji: '🛍️', state: 'open', blurb: 'Clothing, toques and accessories — try before you buy. Also hiring.' },
  { id: 'cityhall', name: 'Regina City Hall',      cat: 'landmark', x: -30, z: -9.4, enter: 'cityhall', emoji: '🗳️', state: 'open', blurb: 'Meet the mayor, vote in the (fictional) election and read the council notices.' },
  { id: 'fitness', name: 'Prairie Fitness',         cat: 'gym',      x: 138, z: 9.4,  enter: 'gym',       emoji: '🏋️', state: 'open', blurb: 'Treadmills, weights and a yoga mat. Build your Fitness skill.' },
  { id: 'leg',     name: 'Legislative Building',    cat: 'landmark', x: ALBERT_X, z: 1235, emoji: '🏛️', state: 'visit', blurb: 'The domed seat of Saskatchewan\'s government, on the shore of Wascana Centre.' },
  { id: 'bridge',  name: 'Albert Street Memorial Bridge', cat: 'landmark', x: ALBERT_X, z: 985, emoji: '🌉', state: 'visit', blurb: 'Albert Street crossing Wascana Lake — the best view of the water.' },
  { id: 'wascana', name: 'Wascana Lake',            cat: 'landmark', x: 400, z: 985, emoji: '🦆', state: 'visit', blurb: 'The heart of one of North America\'s largest urban parks.' },
  { id: 'scarth',  name: 'Scarth Street Mall',      cat: 'landmark', x: -110, z: -60, emoji: '🎷', state: 'visit', blurb: 'Downtown\'s pedestrian heart. Buskers, patios and big-city energy. (Position stylised.)' },
  { id: 'victoriapark', name: 'Victoria Park',      cat: 'landmark', x: -110, z: 60, emoji: '🌳', state: 'visit', blurb: 'A downtown green square. (Position stylised.)' },
  { id: 'stadium', name: 'Mosaic Stadium',          cat: 'landmark', ...LL(50.4528, -104.6395), emoji: '🏟️', state: 'visit', blurb: 'Home of Rider Nation. Green and white forever.' },
  { id: 'uofr',    name: 'University of Regina',    cat: 'school',   ...LL(50.4165, -104.5890), emoji: '🎓', state: 'visit', blurb: 'Campus on the south-east side. Classes and clubs arrive in a later update.' },
  { id: 'airport', name: 'Regina International Airport', cat: 'transport', ...LL(50.4319, -104.6658), emoji: '✈️', state: 'visit', blurb: 'Gateway to the Prairies on the south-west edge of the city.' },
  { id: 'harbour', name: 'Harbour Landing',         cat: 'district', ...LL(50.4010, -104.6700), emoji: '🛒', state: 'visit', blurb: 'South-west suburb with big-box shopping.' },
  { id: 'cathedral', name: 'Cathedral Village',     cat: 'district', ...LL(50.4375, -104.6395), emoji: '☕', state: 'visit', blurb: 'Heritage homes and cafés west of downtown.' },
  { id: 'northcentral', name: 'North Central',      cat: 'district', ...LL(50.4640, -104.6165), emoji: '🏘️', state: 'visit', blurb: 'Close-knit inner-city neighbourhood.' },
  { id: 'rochdale', name: 'Rochdale Blvd',          cat: 'district', ...LL(50.4830, -104.6600), emoji: '🏡', state: 'visit', blurb: 'Newer north-west suburbs.' },
  { id: 'east',    name: 'East Regina',             cat: 'district', ...LL(50.4440, -104.5500), emoji: '🌾', state: 'visit', blurb: 'Eastern edge where the city meets the fields.' },
  { id: 'south',   name: 'South Regina',            cat: 'district', ...LL(50.4090, -104.6200), emoji: '🌤️', state: 'visit', blurb: 'Residential south with parks and schools.' },
];
export const poiById = Object.fromEntries(POIS.map((p) => [p.id, p]));
export const CAT_ICON = { home: '🏠', shop: '🛍️', landmark: '🏛️', school: '🎓', transport: '✈️', district: '📍', gym: '🏋️' };

/** Wascana Lake outline (stylised ribbon following the real east–west orientation). */
export function lakePolygon() {
  const pts = [], top = [], bot = [];
  for (let x = -1700; x <= 2100; x += 100) {
    const cz = 985 + Math.sin(x / 380) * 35 + Math.sin(x / 150) * 12;
    const w = 85 + 40 * Math.sin((x + 1700) / 3800 * Math.PI) + 18 * Math.sin(x / 120);
    top.push([x, cz - w]); bot.push([x, cz + w]);
  }
  return pts.concat(top, bot.reverse());
}
export const PARK_RECT = { x0: -1800, z0: 790, x1: 2200, z1: 1520 };

/** Road polylines for the map. kind: arterial | street | local */
export function mapRoads() {
  const roads = [];
  for (let i = GRID.i0; i <= GRID.i1; i++) roads.push({ name: streetName(i), kind: i === 1 ? 'arterial' : 'street', pts: [[i * PITCH, grid.z0], [i * PITCH, i === 1 ? 1500 : grid.z1]] });
  for (let j = GRID.j0; j <= GRID.j1; j++) roads.push({ name: avenueName(j), kind: j === 0 ? 'arterial' : 'street', pts: [[grid.x0, j * PITCH], [grid.x1, j * PITCH]] });
  // Outer arterials linking districts (stylised)
  const arterial = (name, pts) => roads.push({ name, kind: 'arterial', outer: true, pts });
  arterial('Victoria Ave (East)', [[grid.x1, 0], [4400, 0], [5200, -120]]);
  arterial('Victoria Ave (West)', [[grid.x0, 0], [-2500, 0], [-3800, -60]]);
  arterial('Albert St (North)', [[ALBERT_X, grid.z0], [ALBERT_X, -2600]]);
  arterial('Albert St (South)', [[ALBERT_X, 1500], [ALBERT_X, 5000]]);
  arterial('Ring Road', [[-3800, -60], [-3800, 3500], [-2500, 4200], [ALBERT_X, 4300], [2300, 3900], [3200, 3200]]);
  arterial('Saskatchewan Dr', [[grid.x0, 3 * PITCH], [-2400, 4 * PITCH], [-3800, 3500]]);
  return roads;
}
