/* ======================= OFFICIAL RANKING DATA =======================
   Updated by the twice-daily update task. To add a new poll: add a category,
   then run `node nigeria-2027/site/build.mjs --snapshot` to record movement. */
const RANK = {
  updated: '2026-11-22T10:45:25.155Z',     // last time the data was checked (WAT)
  changed: '2026-11-22T08:54:21.498Z',     // last time any number changed
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
      note:'Political Intelligence Group November map of states won if the vote is free and fair (Sept map: Tinubu 20, Atiku 9, Obi 8). Not a poll. Made before the court ruling on Atiku\'s nomination.', raw:{tinubu:13, atiku:11, obi:13}, fmt:'states'},
    {id:'momentum', label:'News momentum', kind:'Attention measure', weight:0.5, all:true, date:'2026-11-15 to 2026-11-21', n:'news stories in 7 days (Google News, Nigeria)', src:'momentum',
      note:'How often each candidate was in the news with election words, counted day by day (max 100 a day). Measures attention, good or bad, not support. Refreshed with every rank update.', raw:{'tinubu':597,'atiku':362,'obi':438,'seyi-makinde':147,'donald-duke':36,'sandy-ojang-onor':17,'sunday-chibuzo-okereke':6,'omoyele-sowore':53,'adewole-adebayo':50,'rufai-adekunle-omo-aje':28,'aliyu-abbas-bin':2,'kabiru-yusuf':1,'sunday-adenuga':5,'moses-olusoji-adebisi':7,'ada-elizabeth-fredrick-okwori':1,'nkem-esther-okereke':2,'peter-ada-agada':20,'daniel-nwanyanwu':3}, fmt:'count'}
  ],
  // Snapshots of total points, oldest first. Movement arrows compare the last two.
  history: [
    {at:'2026-11-04T12:00:00+01:00', points:{obi:282.9, atiku:227.8, tinubu:189.7}, note:'Launch of the official rank'},
    {at:'2026-11-07T10:45:19.775Z', points:{obi:312.9,tinubu:189.7,atiku:257.5}},
    {at:'2026-11-22T08:54:21.498Z', reset:true, note:'News momentum added; new baseline', points:{obi:349.6,tinubu:239.7,atiku:287.8,'seyi-makinde':12.3,'donald-duke':3,'sandy-ojang-onor':1.4,'sunday-chibuzo-okereke':0.5,'omoyele-sowore':4.4,'adewole-adebayo':4.2,'rufai-adekunle-omo-aje':2.3,'aliyu-abbas-bin':0.2,'kabiru-yusuf':0.1,'sunday-adenuga':0.4,'moses-olusoji-adebisi':0.6,'ada-elizabeth-fredrick-okwori':0.1,'nkem-esther-okereke':0.2,'peter-ada-agada':1.7,'daniel-nwanyanwu':0.3}}
  ]
};
/* Points: in each category the leader scores 100 and others score in proportion
   (favourability is first moved to 0–100). Each category's points are multiplied by
   its weight. For candidates in 2+ polls, a missing poll is filled with their own poll
   average, and flagged. News momentum (all:true) covers all 18. Total = sum of weighted points. */
function rankPoints(R){
  const ids = new Set(); R.categories.forEach(c => Object.keys(c.raw).forEach(id => ids.add(id)));
  const norm = {};
  R.categories.forEach(c => {
    const v = {}; Object.entries(c.raw).forEach(([id, x]) => v[id] = c.scale === 'net' ? (x + 100) / 2 : x);
    const top = Math.max(...Object.values(v)); norm[c.id] = {}; Object.entries(v).forEach(([id, x]) => norm[c.id][id] = x / top * 100);
  });
  const out = {};
  ids.forEach(id => {
    // Gaps are filled with the candidate's own poll average only if they appear in 2+ poll categories.
    // Candidates who are in no poll get 0 there (not filled), so news attention alone cannot inflate them.
    const polls = R.categories.filter(c => !c.all && norm[c.id][id] != null);
    const avg = polls.reduce((a, c) => a + norm[c.id][id], 0) / (polls.length || 1);
    const canFill = polls.length >= 2;
    const parts = R.categories.map(c => { const has = norm[c.id][id] != null; const filled = !has && canFill && !c.all; const p = (has ? norm[c.id][id] : filled ? avg : 0) * c.weight; return {cat:c.id, pts:Math.round(p * 10) / 10, filled}; });
    out[id] = {total: Math.round(parts.reduce((a, p) => a + p.pts, 0) * 10) / 10, parts};
  });
  return out;
}
const RANK_MAX = () => RANK.categories.reduce((a, c) => a + 100 * c.weight, 0);
