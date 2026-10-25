/**
 * Odd Jobs (docs/AMAZING.md section 5): side hustles that turn earning money into play. Each kind is a short route or task in the city, priced so it
 * pays about what a shift pays per minute (tests/gigs.test.js keeps it honest) and gated on the real Regina season and weather where that is the point
 * (you shovel snow when there IS snow). Amounts are cents of Prairie Dollars (fictional). Places are real Regina streets on the game's downtown grid;
 * the people are labelled NPCs.
 *
 * A kind: { id, icon, title, blurb, pay: [min, max] cents, mins (rough play minutes), when(c) -> bool, steps(rnd) -> [{ spot, label, hold }] }
 *   c = { season, temp, kind (weather), snow (true if there is snow on the ground), hour }
 *   a step is done by walking to its spot and pressing E; `hold` seconds is a short timed action there (shovelling, raking, playing)
 */
import { PITCH } from '../world/cityData.js';

const AVES = { 1: '12th Ave', 2: '13th Ave', 3: '14th Ave', '-1': '11th Ave', '-2': '10th Ave' };
const STREETS = { '-3': 'Montreal St', '-2': 'Lorne St', '-1': 'Scarth St', 0: 'Rose St', 1: 'Albert St', 2: 'Hamilton St', 3: 'Cornwall St' };
/** A door on an avenue sidewalk, mid-block: real street names on the game's grid (7 m off the road centre, clear of parked cars). */
const door = (i, j, side = -1) => ({ x: i * PITCH + PITCH / 2, z: j * PITCH + side * 7, name: `${1800 + (i + 4) * 100 + (side < 0 ? 15 : 22)} ${AVES[j] ?? 'Ave'}` });
export const GIG_DOORS = [door(-3, 1), door(-2, 2, 1), door(-1, 3), door(0, 1, 1), door(1, 2), door(2, 3, 1), door(-3, -1), door(1, -2, 1), door(2, 1), door(-2, -1, 1)];
const corner = (i, j) => ({ x: i * PITCH + 7, z: j * PITCH + 9, name: `${STREETS[i] ?? 'the corner'} & ${AVES[j] ?? 'Victoria Ave'}` });

export const SPOTS = {
  market: { x: 30, z: 9.4, name: 'Prairie Corner Market' },
  scarth: { x: -103, z: -60, name: 'Scarth Street Mall' },
  vpark: { x: -103, z: 60, name: 'Victoria Park' },
  lofts: { x: -30, z: 9.4, name: 'Dewdney Lofts' },
};
/** The residents whose dogs you walk (labelled NPCs from data/residents.js). */
const DOGS = [['hannah', 'Biscuit'], ['tobi', 'Pierogi'], ['marc', 'Juniper'], ['priya', 'Dash']];

export const GIG_KINDS = [
  { id: 'shovel', icon: '❄️', title: 'Shovel a neighbour\'s walk', blurb: 'Fresh snow on the walks. A neighbour will pay you to clear theirs before the plow comes by.', pay: [1800, 3000], mins: 2.5,
    when: (c) => c.snow, steps: (r) => { const d = r.pick(GIG_DOORS); return [-3, 0, 3].map((dx, k) => ({ spot: { x: d.x + dx, z: d.z, name: d.name }, label: `Shovel the walk at ${d.name} (${k + 1}/3)`, hold: 3 })); } },
  { id: 'delivery', icon: '🛍️', title: 'Grocery run', blurb: 'Pick up a bag at Prairie Corner Market and drop it at a door. Quick feet earn a tip.', pay: [1200, 2000], mins: 2,
    when: () => true, steps: (r) => { const d = r.pick(GIG_DOORS); return [{ spot: SPOTS.market, label: 'Pick up the grocery bag', hold: 1 }, { spot: d, label: `Deliver the bag to ${d.name}`, hold: 1 }]; } },
  { id: 'dogwalk', icon: '🐕', title: 'Walk a dog to Victoria Park', blurb: 'A neighbour (NPC) needs their dog walked. Victoria Park and back.', pay: [1400, 1800], mins: 3,
    when: (c) => c.temp > -25 && c.kind !== 'storm', steps: (r) => { const [owner, dog] = r.pick(DOGS), d = r.pick(GIG_DOORS); return [{ spot: d, label: `Pick up ${dog}`, hold: 1, owner, dog }, { spot: SPOTS.vpark, label: `Let ${dog} sniff around Victoria Park`, hold: 4 }, { spot: d, label: `Bring ${dog} home`, hold: 1 }]; } },
  { id: 'flyers', icon: '📄', title: 'Hand out flyers downtown', blurb: 'The community hall\'s winter market needs the word out. Three corners, a stack of flyers.', pay: [1000, 1400], mins: 2,
    when: (c) => c.kind !== 'storm', steps: (r) => { const cs = [corner(-2, 1), corner(1, -1), corner(-1, 2), corner(2, 1), corner(0, -2)]; const a = r.pick(cs); const b = r.pick(cs.filter((x) => x !== a)); const c2 = r.pick(cs.filter((x) => x !== a && x !== b)); return [a, b, c2].map((s, k) => ({ spot: s, label: `Hand out flyers at ${s.name} (${k + 1}/3)`, hold: 3 })); } },
  { id: 'busk', icon: '🎸', title: 'Busk on Scarth Street', blurb: 'Bring your guitar to the mall. Charisma, the hour and the weather decide the hat.', pay: [500, 4000], mins: 1.5,
    when: (c) => c.hour >= 8 && c.hour < 22 && c.kind !== 'rain' && c.kind !== 'storm' && c.temp > -20, steps: () => [{ spot: SPOTS.scarth, label: 'Play a set for the lunch crowd', hold: 8 }] },
  { id: 'leaves', icon: '🍂', title: 'Rake a yard', blurb: 'Autumn on the elms. Three piles and a neighbour\'s thanks.', pay: [1500, 2200], mins: 2.5,
    when: (c) => c.season === 'autumn' && !c.snow, steps: (r) => { const d = r.pick(GIG_DOORS); return [-3, 0, 3].map((dx, k) => ({ spot: { x: d.x + dx, z: d.z, name: d.name }, label: `Rake the leaves at ${d.name} (${k + 1}/3)`, hold: 3 })); } },
  { id: 'tulips', icon: '🌷', title: 'Water the planters with Marc', blurb: 'Marc (NPC) is behind on watering downtown planters before the heat.', pay: [1200, 1600], mins: 2,
    when: (c) => (c.season === 'spring' || c.season === 'summer') && c.kind !== 'rain' && !c.snow, steps: () => [corner(0, 1), corner(-1, -1), corner(1, 1)].map((s, k) => ({ spot: s, label: `Water the planter at ${s.name} (${k + 1}/3)`, hold: 2 })) },
];
export const GIG_KIND_BY_ID = Object.fromEntries(GIG_KINDS.map((k) => [k.id, k]));
