/** Dynamic in-game news. Weather, date and daylight are real; everything else is fictional colour. */
import { mulberry32 } from './rng.js';
import { fmtMoney } from './ledger.js';
import { sunTimes, hoursLabel } from './time.js';

const SEASONAL = {
  winter: [['⛸️', 'Wascana ice is looking good', 'Skaters are lacing up. Bring a toque and a thermos.'], ['🥶', 'Block heaters: plug in or regret it', 'Overnight lows are not messing around.'], ['🧊', 'Sidewalk shovelling dispute reaches fever pitch', 'Neighbours debate who should have cleared the corner.']],
  spring: [['🌱', 'Spring thaw: puddles the size of lakes', 'Crossing guards recommend rubber boots.'], ['🐦', 'Geese return to Wascana', 'Honking has resumed at full volume.'], ['🚧', 'Pothole season officially open', 'Drivers are asked to slalom responsibly.']],
  summer: [['🌻', 'Farmers\' market stalls overflowing', 'Saskatoon berries are the talk of the town.'], ['🎆', 'Patio season in full swing', 'Downtown terraces are packed until the sun finally sets.'], ['🦟', 'Mosquito forecast: ambitious', 'Bug spray sales are at an all-time high.']],
  autumn: [['🍂', 'Fall colours peak around the Legislative grounds', 'Perfect weather for a long walk by the lake.'], ['🏈', 'Green and white fever builds', 'Rider fans are practising their chants.'], ['🌾', 'Harvest dust on the horizon', 'Combines are working late across the province.']],
};
const GENERIC = [
  ['🏛️', 'City council debates snow-clearing budget', 'Everyone agrees on one thing: more plows.'], ['🚌', 'Transit riders ask for more frequent buses', 'A committee will study the study.'],
  ['☕', 'Local café launches "Triple-Triple"', 'Doctors are concerned. Customers are not.'], ['🎶', 'Open-mic night returns to Scarth Street', 'Bring your voice and your best sax.'],
  ['🏒', 'Hockey talk dominates every coffee line', 'Experts disagree. Loudly.'], ['🎨', 'Mural unveiled downtown', 'Residents describe it as "very Regina".'],
];
/** @returns {{icon:string,title:string,body:string,tag:string}[]} newest first */
export function generateNews({ date, clock, weather, season, state }) {
  const seed = clock.year * 10000 + clock.month * 100 + clock.day, rnd = mulberry32(seed), out = [];
  const st = sunTimes(date);
  out.push({ icon: weather.icon, tag: weather.live ? 'LIVE WEATHER' : 'SIMULATED', title: `Regina: ${weather.text}, ${weather.temp}°`, body: `${weather.live ? 'Live conditions' : 'Simulated conditions (live data unavailable)'} · Feels like ${weather.feels}° · Wind ${weather.wind} km/h.` });
  out.push({ icon: '🌅', tag: 'DAYLIGHT', title: `Sunrise ${hoursLabel(st.sunrise)} · Sunset ${hoursLabel(st.sunset)}`, body: 'Computed for Regina (CST). Big skies, as always.' });
  const pool = [...SEASONAL[season], ...GENERIC];
  for (let i = 0; i < 4; i++) { const k = Math.floor(rnd() * pool.length); const [icon, title, body] = pool.splice(k, 1)[0]; out.push({ icon, title, body, tag: 'CITY' }); }
  if (weather.temp <= -20) out.unshift({ icon: '🚨', tag: 'ALERT', title: 'Extreme cold warning', body: 'Dress in layers — exposed skin freezes fast.' });
  if (state) {
    const j = state.job?.active;
    if (j) out.push({ icon: '💼', tag: 'YOU', title: `You: ${j.shifts} shift${j.shifts === 1 ? '' : 's'} on the job`, body: 'Keep stocking those shelves.' });
    const ads = Object.keys(state.ads || {}).length; if (ads) out.push({ icon: '📢', tag: 'ADS', title: `${ads} of your billboard${ads === 1 ? '' : 's'} on display`, body: 'Drivers across Regina are reading your message.' });
    if (state.bank?.balance >= 1_000_000) out.push({ icon: '💰', tag: 'YOU', title: `Net worth watch: ${fmtMoney(state.bank.balance)}`, body: 'The Prairie Dollar is doing very well in your wallet.' });
  }
  return out;
}
