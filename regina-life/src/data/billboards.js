import { poiById, ALBERT_X } from '../world/cityData.js';

/**
 * AD TIERS — what an advertiser can buy. Prices are integer cents of Prairie Dollars for a 7-day booking (the canonical
 * product). `realMoney` is the future CAD price for a real advertiser slot on the same tier (DISABLED: no real-money path
 * exists in this build). maxRotation = how many different ads share the board's screen time at once (each gets an equal
 * share); a booking is one slot, so the single-player build is never "sold out". placement = which boards may sell the tier.
 * The ladder is calibrated to the pacing model in docs/ECONOMY.md: standard ~ 1 normal week of entry-level income,
 * big ~ 2-3 weeks, landmark ~ 8 weeks of entry-level income (months of saving).
 */
export const AD_DAYS = 7;
export const AD_TIER_ORDER = ['standard', 'big', 'landmark'];
export const AD_TIERS = {
  standard: { id: 'standard', name: 'Standard board', blurb: 'Roadside boards in the neighbourhoods and on side streets.', size: { w: 10.5, h: 5.25, label: '10.5 × 5.25 m' },
    price: 120000, days: AD_DAYS, maxRotation: 4, realMoney: { currency: 'CAD', cents: 2500, enabled: false },
    placement: { sizeClass: 'standard', minTraffic: 0, maxTraffic: 2099, text: 'Standard-size boards with under 2,100 passers-by a day' } },
  big: { id: 'big', name: 'Big board', blurb: 'Large screens on the arterial roads into the city.', size: { w: 15, h: 7.5, label: '15 × 7.5 m' },
    price: 300000, days: AD_DAYS, maxRotation: 3, realMoney: { currency: 'CAD', cents: 5000, enabled: false },
    placement: { sizeClass: 'mega', minTraffic: 2100, maxTraffic: 2799, text: 'Large boards with 2,100-2,799 passers-by a day' } },
  landmark: { id: 'landmark', name: 'Landmark board', blurb: 'The most-seen sites in Regina: the downtown gateway and the stadium.', size: { w: 15, h: 7.5, label: '15 × 7.5 m, prime site' },
    price: 1000000, days: AD_DAYS, maxRotation: 2, realMoney: { currency: 'CAD', cents: 10000, enabled: false },
    placement: { sizeClass: 'mega', minTraffic: 2800, maxTraffic: 1e9, text: 'Large boards at city landmarks (2,800+ passers-by a day)' } },
};
/** Does `board` satisfy a tier's placement rule? (sizeClass is the physical `tier` of the board: 'standard' | 'mega'.) */
export const placementOk = (tier, board) => !!tier && !!board && board.tier === tier.placement.sizeClass && board.traffic >= tier.placement.minTraffic && board.traffic <= tier.placement.maxTraffic;

const S = poiById.stadium, A = poiById.airport, U = poiById.uofr, H = poiById.harbour;
/**
 * `tier` is the physical model ('standard' | 'mega': it sizes the 3D board and canvas — do not rename). `adTier` is the
 * price tier ('standard' | 'big' | 'landmark'). yaw: direction the panel FACES (0 = faces +z/south, π/2 = +x/east, π = north, -π/2 = west).
 */
export const BILLBOARDS = [
  { id: 'victoria-east', name: 'Victoria Ave East', tier: 'mega', adTier: 'big', x: 820, z: -20, yaw: 0, traffic: 2600 },
  { id: 'victoria-west', name: 'Victoria Ave West', tier: 'standard', adTier: 'standard', x: -820, z: 20, yaw: Math.PI, traffic: 1500 },
  { id: 'albert-north', name: 'Albert St North', tier: 'standard', adTier: 'standard', x: ALBERT_X + 20, z: -900, yaw: -Math.PI / 2, traffic: 1700 },
  { id: 'albert-south', name: 'Albert St South', tier: 'mega', adTier: 'big', x: ALBERT_X - 20, z: 2200, yaw: Math.PI / 2, traffic: 2400 },
  { id: 'downtown-north', name: 'Downtown North Gateway', tier: 'mega', adTier: 'landmark', x: -30, z: -585, yaw: 0, traffic: 3000 },
  { id: 'wascana-view', name: 'Wascana Lakeshore', tier: 'standard', adTier: 'standard', x: 150, z: 815, yaw: Math.PI, traffic: 1900 },
  { id: 'stadium', name: 'Mosaic Stadium', tier: 'mega', adTier: 'landmark', x: S.x + 135, z: S.z + 10, yaw: -Math.PI / 2, traffic: 2800 },
  { id: 'airport', name: 'Airport Arrivals', tier: 'standard', adTier: 'standard', x: A.x + 70, z: A.z + 90, yaw: -Math.PI / 2, traffic: 1400 },
  { id: 'uofr', name: 'University of Regina', tier: 'standard', adTier: 'standard', x: U.x + 120, z: U.z + 10, yaw: -Math.PI / 2, traffic: 1300 },
  { id: 'harbour', name: 'Harbour Landing', tier: 'standard', adTier: 'standard', x: H.x - 80, z: H.z + 20, yaw: Math.PI / 2, traffic: 1200 },
  { id: 'ring-road', name: 'Ring Road West', tier: 'standard', adTier: 'standard', x: -3840, z: 1200, yaw: Math.PI / 2, traffic: 1600 },
  { id: 'downtown-south', name: 'Downtown South Gateway', tier: 'standard', adTier: 'standard', x: -240, z: 585, yaw: 0, traffic: 2000 },
];
export const BOARD_BY_ID = Object.fromEntries(BILLBOARDS.map((b) => [b.id, b]));
/**
 * Short runs for the current Ads app: 1 and 3 days cost more per day than the 7-day product (multiplier on the pro-rata
 * weekly price). New UI should sell AD_TIERS[...].days only. Keys are day counts.
 */
export const DURATIONS = { 1: 1.6, 3: 1.25, 7: 1 };
/** @deprecated 1-day list price by PHYSICAL tier (as before), kept for the 3D "YOUR AD HERE" sign: mega shows the Big tier's rate, landmarks cost more. */
export const DAY_PRICE = { standard: Math.round((AD_TIERS.standard.price / AD_DAYS) * DURATIONS[1]), mega: Math.round((AD_TIERS.big.price / AD_DAYS) * DURATIONS[1]) };
export const THEMES = {
  prairie: ['#1f6f4a', '#7ad06a'], sunset: ['#ff7a45', '#ffd24a'], lake: ['#1e6ea8', '#58d0e8'], rider: ['#0a6b3a', '#1ea85a'],
  night: ['#2b1b5a', '#8a52ff'], berry: ['#c01d5a', '#ff7ab0'],
};
