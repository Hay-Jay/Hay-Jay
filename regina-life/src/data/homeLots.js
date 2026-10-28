/**
 * Where each home stands in the city (docs/AMAZING.md: home lots on the map). The Studio is Unit 204 in Dewdney Lofts, downtown on Victoria Ave;
 * the One-bedroom is Unit 3B in Cathedral Court, a brick walk-up on the west edge of downtown toward the Cathedral neighbourhood; the Bungalow is a
 * little house by Wascana Lake. `door` is the spot you stand on to go in (and where you come out), with its outward normal; `face` is the wall
 * point the door sits in (where the frame and the sign go).
 */
export const HOME_LOTS = {
  studio: { building: 'Dewdney Lofts', unit: 'Unit 204', emoji: '🏢', area: 'Downtown', door: { x: -30, z: 9.4, nx: 0, nz: -1 }, face: { x: -30, z: 12 },
    blurb: 'An eight-storey brick rental on Victoria Ave, across from the Market. Where every new life in Regina starts.' },
  onebed: { building: 'Cathedral Court', unit: 'Unit 3B', emoji: '🏘️', area: 'Cathedral', door: { x: -541.6, z: -188, nx: -1, nz: 0 }, face: { x: -539, z: -188 },
    blurb: 'A brick walk-up on the west edge of downtown, a short walk from the Cathedral neighbourhood and its cafés.' },
  bungalow: { building: 'Lakeview Bungalow', unit: '', emoji: '🏡', area: 'Wascana', door: { x: 165, z: 762, nx: 0, nz: 1 }, face: { x: 165, z: 756 },
    blurb: 'A little house by Wascana Lake, with a yard, a garage and the geese for neighbours.' },
};
