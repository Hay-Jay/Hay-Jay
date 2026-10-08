import { poiById, ALBERT_X } from '../world/cityData.js';

const S = poiById.stadium, A = poiById.airport, U = poiById.uofr, H = poiById.harbour;
/** yaw: direction the panel FACES (0 = faces +z/south, π/2 = +x/east, π = north, -π/2 = west). */
export const BILLBOARDS = [
  { id: 'victoria-east', name: 'Victoria Ave East', tier: 'mega', x: 820, z: -20, yaw: 0, traffic: 2600 },
  { id: 'victoria-west', name: 'Victoria Ave West', tier: 'standard', x: -820, z: 20, yaw: Math.PI, traffic: 1500 },
  { id: 'albert-north', name: 'Albert St North', tier: 'standard', x: ALBERT_X + 20, z: -900, yaw: -Math.PI / 2, traffic: 1700 },
  { id: 'albert-south', name: 'Albert St South', tier: 'mega', x: ALBERT_X - 20, z: 2200, yaw: Math.PI / 2, traffic: 2400 },
  { id: 'downtown-north', name: 'Downtown North Gateway', tier: 'mega', x: -30, z: -585, yaw: 0, traffic: 3000 },
  { id: 'wascana-view', name: 'Wascana Lakeshore', tier: 'standard', x: 150, z: 815, yaw: Math.PI, traffic: 1900 },
  { id: 'stadium', name: 'Mosaic Stadium', tier: 'mega', x: S.x + 135, z: S.z + 10, yaw: -Math.PI / 2, traffic: 2800 },
  { id: 'airport', name: 'Airport Arrivals', tier: 'standard', x: A.x + 70, z: A.z + 90, yaw: -Math.PI / 2, traffic: 1400 },
  { id: 'uofr', name: 'University of Regina', tier: 'standard', x: U.x + 120, z: U.z + 10, yaw: -Math.PI / 2, traffic: 1300 },
  { id: 'harbour', name: 'Harbour Landing', tier: 'standard', x: H.x - 80, z: H.z + 20, yaw: Math.PI / 2, traffic: 1200 },
  { id: 'ring-road', name: 'Ring Road West', tier: 'standard', x: -3840, z: 1200, yaw: Math.PI / 2, traffic: 1600 },
  { id: 'downtown-south', name: 'Downtown South Gateway', tier: 'standard', x: -240, z: 585, yaw: 0, traffic: 2000 },
];
export const BOARD_BY_ID = Object.fromEntries(BILLBOARDS.map((b) => [b.id, b]));
export const DAY_PRICE = { standard: 12000, mega: 35000 };          // cents per day
export const DURATIONS = { 1: 1, 3: 0.9, 7: 0.8 };                    // days → price multiplier (volume discount)
export const THEMES = {
  prairie: ['#1f6f4a', '#7ad06a'], sunset: ['#ff7a45', '#ffd24a'], lake: ['#1e6ea8', '#58d0e8'], rider: ['#0a6b3a', '#1ea85a'],
  night: ['#2b1b5a', '#8a52ff'], berry: ['#c01d5a', '#ff7ab0'],
};
