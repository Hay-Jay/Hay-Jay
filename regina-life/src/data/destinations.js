/**
 * Intercity trips. A fare is the RETURN price in Prairie Dollars (cents), calibrated to 2026 CAD from Regina: coach on the
 * Rider Express corridor, economy flights from YQR (Banff = flight to Calgary + shuttle). Durations are one-way, rounded.
 * Saskatoon "flight" is a fictional regional hop (no scheduled direct service is assumed). See docs/ECONOMY.md.
 */
export const DESTINATIONS = [
  { id: 'moosejaw',  name: 'Moose Jaw',  emoji: '♨️', blurb: 'Hot springs, murals and a famous giant moose.', modes: { bus: { fare: 3400, mins: 50 } }, souvenir: 'Moose Jaw hot-springs postcard' },
  { id: 'saskatoon', name: 'Saskatoon',  emoji: '🌉', blurb: 'Bridges over the South Saskatchewan and berries named after the city.', modes: { bus: { fare: 8800, mins: 150 }, flight: { fare: 25900, mins: 45 } }, souvenir: 'Saskatoon-berry pie tin' },
  { id: 'winnipeg',  name: 'Winnipeg',   emoji: '🍂', blurb: 'The Forks, river trails and Manitoba hospitality.', modes: { bus: { fare: 17000, mins: 450 }, flight: { fare: 32900, mins: 90 } }, souvenir: 'Winnipeg Forks snow globe' },
  { id: 'calgary',   name: 'Calgary',    emoji: '🤠', blurb: 'Cowboy boots, skyline and chinook winds.', modes: { bus: { fare: 23000, mins: 570 }, flight: { fare: 29900, mins: 75 } }, souvenir: 'Calgary cowboy hat pin' },
  { id: 'banff',     name: 'Banff',      emoji: '🏔️', blurb: 'Turquoise lakes and mountains that make the prairie jealous.', modes: { flight: { fare: 46900, mins: 210 } }, souvenir: 'Banff mountain print' },
  { id: 'vancouver', name: 'Vancouver',  emoji: '🌧️', blurb: 'Ocean air, mountains and rain you can set your watch by.', modes: { flight: { fare: 42900, mins: 150 } }, souvenir: 'Vancouver seawall keychain' },
];
export const DESTINATION_BY_ID = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));
export const TRIP_COOLDOWN_MS = 5 * 60_000;
