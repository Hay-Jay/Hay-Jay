/* ======================= OFFICIAL RANKING DATA =======================
   Updated by the twice-daily update task. To add a new poll: add a category,
   then run `node nigeria-2027/site/build.mjs --snapshot` to record movement. */
const RANK = {
  updated: '2026-11-07T22:44:20.922Z',     // last time the data was checked (WAT)
  changed: '2026-11-07T10:45:19.775Z',     // last time any number changed
  everyHours: 12,
  categories: [
    {id:'sbm', label:'SBM favourability', kind:'Survey', weight:1, date:'May 2026', n:'about 829 people, all six zones', src:'sbm',
      note:'Net favourability (favourable minus unfavourable), −100 to +100.', raw:{obi:58.3, tinubu:-58.5}, fmt:'net', scale:'net'},
    {id:'harmattan', label:'Harmattan Intelligence', kind:'Survey', weight:1, date:'30 Jun 2026', n:'1,000 registered voters', src:'harmattan',
      note:'Share favourable. Obi figure is for the Obi–Kwankwaso ticket; Atiku 40% "somewhat favourable" (very-favourable share not reported); Tinubu: 75% strongly disapprove of his performance, so at most 25% approve.', raw:{obi:80, atiku:40, tinubu:25}, fmt:'pct'},
    {id:'oxford', label:'Oxford-Metro National Trust Poll', kind:'Open poll', weight:0.5, date:'closed 7 Sep 2026', n:'69,110 approved open responses', src:'oxford',
      note:'Share of responses. Open to anyone, not a random sample.', raw:{tinubu:35.41, obi:33.86, atiku:26.67}, fmt:'pct'},
    {id:'tmg', label:'"Tinubu Must Go" online poll', kind:'Partisan poll', weight:0.5, date:'24–25 Sep 2026', n:'109,799 self-selected', src:'tmg',
      note:'Run by an anti-Tinubu group; Tinubu was not an option.', raw:{atiku:73.6, obi:22.3}, fmt:'pct'},
    {id:'pig', label:'Politico.ng projection', kind:'Analyst projection', weight:0.5, date:'5 Nov 2026 (November map)', n:'states projected to win (of 37)', src:'pig',
      note:'Political Intelligence Group November map of states won if the vote is free and fair (Sept map: Tinubu 20, Atiku 9, Obi 8). Not a poll. Made before the court ruling on Atiku\'s nomination.', raw:{tinubu:13, atiku:11, obi:13}, fmt:'states'}
  ],
  // Snapshots of total points, oldest first. Movement arrows compare the last two.
  history: [
    {at:'2026-11-04T12:00:00+01:00', points:{obi:282.9, atiku:227.8, tinubu:189.7}, note:'Launch of the official rank'},
    {at:'2026-11-07T10:45:19.775Z', points:{obi:312.9,tinubu:189.7,atiku:257.5}}
  ]
};
/* Points: in each category the leader scores 100 and others score in proportion
   (favourability is first moved to 0–100). Each category's points are multiplied by
   its weight. A missing value is filled with the candidate's own average across the
   categories they do appear in, and flagged. Total = sum of weighted points. */
function rankPoints(R){
  const ids = new Set(); R.categories.forEach(c => Object.keys(c.raw).forEach(id => ids.add(id)));
  const norm = {};
  R.categories.forEach(c => {
    const v = {}; Object.entries(c.raw).forEach(([id, x]) => v[id] = c.scale === 'net' ? (x + 100) / 2 : x);
    const top = Math.max(...Object.values(v)); norm[c.id] = {}; Object.entries(v).forEach(([id, x]) => norm[c.id][id] = x / top * 100);
  });
  const out = {};
  ids.forEach(id => {
    const have = R.categories.filter(c => norm[c.id][id] != null);
    const avg = have.reduce((a, c) => a + norm[c.id][id], 0) / (have.length || 1);
    const parts = R.categories.map(c => { const filled = norm[c.id][id] == null; const p = (filled ? avg : norm[c.id][id]) * c.weight; return {cat:c.id, pts:Math.round(p * 10) / 10, filled}; });
    out[id] = {total: Math.round(parts.reduce((a, p) => a + p.pts, 0) * 10) / 10, parts};
  });
  return out;
}
const RANK_MAX = () => RANK.categories.reduce((a, c) => a + 100 * c.weight, 0);
