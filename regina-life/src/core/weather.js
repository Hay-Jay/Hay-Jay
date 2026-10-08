/**
 * Weather: live data from Open-Meteo (no API key). If it can't be retrieved the game falls back to a
 * clearly-labelled SIMULATION derived from the season — it is never presented as live data.
 */
import { REGINA, reginaParts, seasonOf } from './time.js';
import { mulberry32 } from './rng.js';

export const WMO = (code) => {
  if (code === 0) return { kind: 'clear', text: 'Clear sky', icon: '☀️' };
  if (code <= 2) return { kind: 'partly', text: 'Partly cloudy', icon: '⛅' };
  if (code === 3) return { kind: 'cloudy', text: 'Overcast', icon: '☁️' };
  if (code === 45 || code === 48) return { kind: 'fog', text: 'Fog', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { kind: 'drizzle', text: 'Drizzle', icon: '🌦️' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', text: 'Rain', icon: '🌧️' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', text: 'Snow', icon: '❄️' };
  if (code >= 95) return { kind: 'storm', text: 'Thunderstorm', icon: '⛈️' };
  return { kind: 'cloudy', text: 'Cloudy', icon: '☁️' };
};

export const URL = () => `https://api.open-meteo.com/v1/forecast?latitude=${REGINA.lat}&longitude=${REGINA.lon}&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FRegina&forecast_days=1`;

/** Deterministic seasonal simulation — used only when live data is unavailable. */
export function simulateWeather(date = new Date()) {
  const p = reginaParts(date), season = seasonOf(p.month);
  const rnd = mulberry32(p.year * 1000 + p.month * 31 + p.day);
  const base = { winter: -13, spring: 5, summer: 22, autumn: 6 }[season];
  const temp = Math.round(base + (rnd() - 0.5) * 8 + Math.sin(((p.hour - 9) / 24) * Math.PI * 2) * 4);
  let kind = 'clear'; const r = rnd();
  if (r > 0.55) kind = 'partly'; if (r > 0.75) kind = 'cloudy';
  if (r > 0.9) kind = season === 'winter' ? 'snow' : 'rain';
  const text = { clear: 'Clear sky', partly: 'Partly cloudy', cloudy: 'Overcast', snow: 'Snow', rain: 'Rain' }[kind];
  const icon = { clear: '☀️', partly: '⛅', cloudy: '☁️', snow: '❄️', rain: '🌧️' }[kind];
  return {
    live: false, source: 'SIMULATED', kind, text, icon, temp, feels: temp - (season === 'winter' ? 5 : 0),
    cloud: { clear: 5, partly: 40, cloudy: 90, snow: 95, rain: 90 }[kind], wind: Math.round(8 + rnd() * 22),
    precip: kind === 'rain' || kind === 'snow' ? 1 : 0, hi: temp + 4, lo: temp - 6, updated: date.getTime(),
  };
}

export async function fetchWeather(fetchImpl = globalThis.fetch, date = new Date()) {
  try {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const to = setTimeout(() => ctl?.abort(), 6000);
    const res = await fetchImpl(URL(), { signal: ctl?.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const c = j.current; if (!c || typeof c.temperature_2m !== 'number') throw new Error('bad payload');
    const w = WMO(c.weather_code);
    return {
      live: true, source: 'Open-Meteo (live)', kind: w.kind, text: w.text, icon: w.icon,
      temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature ?? c.temperature_2m),
      cloud: c.cloud_cover ?? 50, wind: Math.round(c.wind_speed_10m ?? 0), precip: c.precipitation ?? 0,
      hi: Math.round(j.daily?.temperature_2m_max?.[0] ?? c.temperature_2m), lo: Math.round(j.daily?.temperature_2m_min?.[0] ?? c.temperature_2m),
      updated: Date.now(),
    };
  } catch {
    return simulateWeather(date);
  }
}
