/** Intercity trips. Fares/durations are rough, rounded, and fictionalised. */
export const DESTINATIONS = [
  { id: 'moosejaw',  name: 'Moose Jaw',  emoji: '♨️', blurb: 'Hot springs, murals and a famous giant moose.', modes: { bus: { fare: 1400, mins: 50 } }, souvenir: 'Moose Jaw hot-springs postcard' },
  { id: 'saskatoon', name: 'Saskatoon',  emoji: '🌉', blurb: 'Bridges over the South Saskatchewan and berries named after the city.', modes: { bus: { fare: 3800, mins: 150 }, flight: { fare: 14500, mins: 45 } }, souvenir: 'Saskatoon-berry pie tin' },
  { id: 'winnipeg',  name: 'Winnipeg',   emoji: '🍂', blurb: 'The Forks, river trails and Manitoba hospitality.', modes: { bus: { fare: 8500, mins: 400 }, flight: { fare: 21000, mins: 90 } }, souvenir: 'Winnipeg Forks snow globe' },
  { id: 'calgary',   name: 'Calgary',    emoji: '🤠', blurb: 'Cowboy boots, skyline and chinook winds.', modes: { bus: { fare: 11000, mins: 540 }, flight: { fare: 22000, mins: 75 } }, souvenir: 'Calgary cowboy hat pin' },
  { id: 'banff',     name: 'Banff',      emoji: '🏔️', blurb: 'Turquoise lakes and mountains that make the prairie jealous.', modes: { flight: { fare: 26000, mins: 150 } }, souvenir: 'Banff mountain print' },
  { id: 'vancouver', name: 'Vancouver',  emoji: '🌧️', blurb: 'Ocean air, mountains and rain you can set your watch by.', modes: { flight: { fare: 29000, mins: 150 } }, souvenir: 'Vancouver seawall keychain' },
];
export const DESTINATION_BY_ID = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));
export const TRIP_COOLDOWN_MS = 5 * 60_000;
