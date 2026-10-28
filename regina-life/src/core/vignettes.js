/**
 * City scenes (docs/AMAZING.md, "a city that lives"): residents doing ordinary Regina things where you can see them. A busker on Scarth Street, a
 * reader on a Victoria Park bench, a painter at an easel by the fountain, a neighbour shovelling after a snowfall or raking in the fall, someone on
 * the phone by the Market. Who is out depends on the real hour, season and weather. They are labelled NPCs: say hi and they answer.
 * Pure rules: c = { hour 0..23, temp °C, kind (weather), snow (true if there is snow on the ground), season }.
 */
const wet = (c) => c.kind === 'rain' || c.kind === 'storm';

export const VIGNETTES = [
  { id: 'busker', who: 'A busker', icon: '🎸', pose: 'guitar', when: (c) => c.hour >= 10 && c.hour < 21 && !wet(c) && c.temp > -15,
    lines: ['Thanks for stopping! This one is for the geese.', 'Requests? I know three songs, and one of them is about Wascana.', 'Spare a smile? That is all I take.', 'Scarth Street has the best echo in Regina.'] },
  { id: 'reader', who: 'A reader', icon: '📖', pose: 'read', sit: true, when: (c) => c.hour >= 8 && c.hour < 20 && !wet(c) && c.temp > -8,
    lines: ['Shh, it is just getting good.', 'Best bench in Regina. Do not tell anyone.', 'Have you read this one? No spoilers!'] },
  { id: 'painter', who: 'A painter', icon: '🎨', pose: 'paint', when: (c) => c.hour >= 9 && c.hour < 18 && !wet(c) && !c.snow && c.temp > 2,
    lines: ['Trying to catch the light on the fountain.', 'The prairie sky does all the work. I just copy it.', 'Come back Saturday. It will be done. Maybe.'] },
  { id: 'shoveller', who: 'A neighbour', icon: '❄️', pose: 'shovel', when: (c) => c.snow && c.hour >= 7 && c.hour < 18,
    lines: ['Third time this week!', 'Good packing snow, at least.', 'Mind the ice by the curb.'] },
  { id: 'raker', who: 'A neighbour', icon: '🍂', pose: 'rake', when: (c) => c.season === 'autumn' && !c.snow && !wet(c) && c.hour >= 9 && c.hour < 18,
    lines: ['These elms never stop!', 'One pile for raking, one pile for jumping.', 'Fall in Regina: ten minutes long and gorgeous.'] },
  { id: 'caller', who: 'Someone on the phone', icon: '📱', pose: 'phone', when: (c) => c.hour >= 7 && c.hour < 23,
    lines: ['No, I am downtown, by the Market.', 'Sorry, can I call you back? Someone is saying hi.', (c) => `Yeah, it is ${Math.round(c.temp)}° out here. Bring a toque.`] },
];
export const VIGNETTE_BY_ID = Object.fromEntries(VIGNETTES.map((v) => [v.id, v]));

/** Which scenes are out right now (ids, in list order). */
export const activeVignettes = (c) => VIGNETTES.filter((v) => v.when(c)).map((v) => v.id);
/** What they say when you say hi. `k` picks the line (any integer). */
export function vignetteLine(id, c, k = 0) {
  const v = VIGNETTE_BY_ID[id]; if (!v) return '';
  const l = v.lines[((k % v.lines.length) + v.lines.length) % v.lines.length];
  return typeof l === 'function' ? l(c) : l;
}
