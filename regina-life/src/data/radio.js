/** Radio stations (all music is generated live in the browser — no audio files, no licences). */
export const STATIONS = [
  { id: 'lofi',    name: 'Wascana Lo-Fi',    freq: '88.1',  emoji: '🌙', genre: 'lo-fi beats', bpm: 76,  blurb: 'Soft chords, vinyl crackle, perfect for 2 am study sessions.' },
  { id: 'country', name: 'Prairie Country',  freq: '94.5',  emoji: '🤠', genre: 'country twang', bpm: 104, blurb: 'Strummed guitars and big-sky heartbreak.' },
  { id: 'jazz',    name: 'Albert St. Jazz',  freq: '101.3', emoji: '🎷', genre: 'late-night jazz', bpm: 126, blurb: 'Walking bass, brushes and a mellow sax in the wind.' },
  { id: 'talk',    name: 'Prairie Talk',     freq: '98.5',  emoji: '🎙️', genre: 'news & weather', bpm: 0, blurb: 'Reads the Prairie News headlines out loud (uses your browser voice).' },
];
export const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const W = {
  lofi: [['Snowed In', 'Block Heater', 'Streetlight Hum', 'Cathedral Steam', 'Midnight Plow', 'Slow Thaw', 'Elm Street Rain'], ['Arcade Tape', 'Tides of 13th', 'Porch Light', 'Nap Time', 'Mugs & Moths']],
  country: [['Dust on the Dashboard', 'Wheat Fields Wide', 'Saturday Rider Night', 'Gravel Road Heart', 'Big Sky Blues', 'Truck Stop Moon'], ['Whiskey Jack', 'Harvest Home', 'Wide Open', 'Last Chinook']],
  jazz: [['Albert Street Blue', 'After the Snowplow', 'Cool Prairie Wind', 'Midnight at the Hotel', 'Lake Effect', 'Smoke & Wheat'], ['Brass Moon', 'Quiet Avenue', 'Chinook Walk']],
};
/** Deterministic "now playing" title for track number n. */
export function trackTitle(stationId, n) { const g = W[stationId]; if (!g) return 'Live'; const a = g[0], b = g[1]; return n % 3 === 2 ? b[n % b.length] : a[(n * 5 + (n >> 1)) % a.length]; }

/* ----- music theory helpers (pure) ----- */
export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);
export const PROGRESSIONS = {
  lofi: [{ root: 50, notes: [0, 3, 7, 10, 14] }, { root: 43, notes: [0, 4, 7, 10, 14] }, { root: 48, notes: [0, 4, 7, 11, 14] }, { root: 45, notes: [0, 4, 7, 10, 13] }],
  country: [{ root: 43, notes: [0, 4, 7, 12] }, { root: 48, notes: [0, 4, 7, 12] }, { root: 50, notes: [0, 4, 7, 12] }, { root: 43, notes: [0, 4, 7, 12] }],
  jazz: [{ root: 50, notes: [0, 3, 7, 10] }, { root: 43, notes: [0, 4, 7, 10] }, { root: 48, notes: [0, 4, 7, 11] }, { root: 48, notes: [0, 4, 7, 11] }],
};
export const SCALES = { lofi: [0, 3, 5, 7, 10], country: [0, 2, 4, 7, 9], jazz: [0, 2, 3, 5, 7, 9, 10] };
/** A bar's worth of events as [beatOffset, kind, value]. Deterministic given (station, bar). */
export function barPlan(stationId, bar, rnd) {
  const prog = PROGRESSIONS[stationId]; if (!prog) return [];
  const ch = prog[bar % 4], sc = SCALES[stationId], ev = [];
  const r = rnd ?? (() => 0.5);
  if (stationId === 'lofi') {
    ev.push([0, 'pad', ch]);
    [0, 2].forEach((b) => ev.push([b, 'kick']));
    ev.push([1, 'snare'], [3, 'snare']);
    for (let i = 0; i < 8; i++) ev.push([i / 2, 'hat', i % 2 ? 0.5 : 1]);
    for (let i = 0; i < 4; i++) if (r() < 0.55) ev.push([i + (r() < 0.4 ? 0.5 : 0), 'lead', ch.root + 24 + sc[Math.floor(r() * sc.length)]]);
  } else if (stationId === 'country') {
    for (let b = 0; b < 4; b++) { ev.push([b, 'strum', ch]); ev.push([b, 'bass', ch.root - 12 + (b % 2 ? 7 : 0)]); if (b % 2) ev.push([b, 'snare']); }
    for (let i = 0; i < 4; i++) if (r() < 0.6) ev.push([i + 0.5, 'twang', ch.root + 24 + sc[Math.floor(r() * sc.length)]]);
  } else if (stationId === 'jazz') {
    for (let b = 0; b < 4; b++) { ev.push([b, 'bass', ch.root - 12 + ch.notes[b % ch.notes.length]]); ev.push([b, 'ride', 1]); if (b % 2) ev.push([b + 2 / 3, 'ride', 0.6]); }
    ev.push([1.5, 'comp', ch], [3, 'comp', ch]);
    for (let i = 0; i < 6; i++) if (r() < 0.5) ev.push([i * 0.66, 'lead', ch.root + 24 + sc[Math.floor(r() * sc.length)]]);
  }
  return ev;
}
