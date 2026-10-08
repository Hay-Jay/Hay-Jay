/** Local metric projection around downtown Regina (approximate; x = east, z = south). */
export const ORIGIN = { lat: 50.4452, lon: -104.6189 };
const M_LAT = 110574;
const M_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);
export function project(lat, lon) {
  return { x: (lon - ORIGIN.lon) * M_LON, z: -(lat - ORIGIN.lat) * M_LAT };
}
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
