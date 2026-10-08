/** Regina time (America/Regina — CST all year, no DST) and solar position. */
export const TZ = 'America/Regina';
export const REGINA = { lat: 50.4452, lon: -104.6189 };

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
export function reginaParts(date = new Date()) {
  const o = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== 'literal') o[p.type] = +p.value;
  return { year: o.year, month: o.month, day: o.day, hour: o.hour, minute: o.minute, second: o.second };
}
export function reginaClock(date = new Date()) {
  const p = reginaParts(date);
  const h12 = p.hour % 12 || 12;
  return {
    ...p,
    hoursFloat: p.hour + p.minute / 60 + p.second / 3600,
    label: `${h12}:${String(p.minute).padStart(2, '0')}`,
    ampm: p.hour < 12 ? 'AM' : 'PM',
    label24: `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`,
    dateLabel: new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' }).format(date),
    shortDate: new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' }).format(date),
  };
}
export function seasonOf(month) {
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

const RAD = Math.PI / 180, DAY_MS = 86400000, J1970 = 2440588, J2000 = 2451545;
const toDays = (d) => d.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const E = RAD * 23.4397;
/** Sun altitude/azimuth in radians (azimuth measured from south, westward positive — SunCalc convention). */
export function sunPosition(date, lat = REGINA.lat, lon = REGINA.lon) {
  const lw = RAD * -lon, phi = RAD * lat, d = toDays(date);
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(E) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(E), Math.cos(L));
  const H = RAD * (280.16 + 360.9856235 * d) - lw - ra;
  return {
    altitude: Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)),
    azimuth: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)),
  };
}
/** Sunrise / sunset / solar noon (Regina local) for the Regina calendar day containing `date`. */
export function sunTimes(date = new Date()) {
  const p = reginaParts(date);
  const midnight = date.getTime() - ((p.hour * 60 + p.minute) * 60 + p.second) * 1000 - date.getMilliseconds();
  const thr = -0.833 * RAD;
  let rise = null, set = null, noonAlt = -9, noon = 12;
  let prev = sunPosition(new Date(midnight)).altitude;
  for (let m = 5; m <= 1440; m += 5) {
    const alt = sunPosition(new Date(midnight + m * 60000)).altitude;
    if (alt > noonAlt) { noonAlt = alt; noon = m / 60; }
    if (prev < thr && alt >= thr && rise === null) rise = (m - 5 + (5 * (thr - prev)) / (alt - prev)) / 60;
    if (prev >= thr && alt < thr && set === null) set = (m - 5 + (5 * (prev - thr)) / (prev - alt)) / 60;
    prev = alt;
  }
  return { sunrise: rise, sunset: set, solarNoon: noon };
}
export const hoursLabel = (h) => (h == null ? '--:--' : `${Math.floor(h)}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`);
