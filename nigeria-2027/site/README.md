# Naija Decides: public website

Edit the parts in `src/` (`head.html` = design, `data.js` = core facts, `app.js` = news, scoreboard, games and pages), then rebuild. The build writes `naija-decides.html` (published as a Claude artifact with `img/` and `photos/`) and `index.html` (standalone, for any static host):

```bash
node nigeria-2027/site/build.mjs
```

## Sections
Home (countdown, key numbers) · Compare & debate (pick two, judge each round, copy your verdict) · Fact-checks (filter by verdict) · Promises vs reality · Where did the money go? · Weekly news (Sunday edition) · Polls (what exists, with limits) · Match me (6-question candidate match) · Ask (answers from the verified facts; full AI answers for signed-in Claude users).

## Weekly update (every Sunday)
Clip the week's articles (`clips.json` entries with `"headline": true`, then `node nigeria-2027/clip.mjs`), copy the head images into `img/` at 720px wide, and edit the `NEWS` block in `src/app.js` (edition name and 5–6 items, each with a source), add new fact-checks to `FACTS`, then republish / rebuild.

## Viewer poll by age (no server needed)
1. Create a Google Form with two required questions:
   - "Who would you vote for on 16 January 2027?" → Tinubu (APC) / Atiku (ADC) / Obi (NDC) / Other / Undecided
   - "Your age group" → 18–24 / 25–34 / 35–44 / 45–54 / 55+
   - "Who do you think WILL win, whatever your own choice?" → Tinubu / Atiku / Obi / Other (feeds the "Likely to win" ranking: put the percentages in `POLLS.predict.shares`)
2. Paste the form link into `CONFIG.pollFormUrl`. The "Vote" button appears.
3. Each Sunday, copy the counts from the form's Responses sheet into `POLLS.viewer`:
   `{updated:'15 Nov 2026', total:1234, ages:{'18-24':{tinubu:0,atiku:0,obi:0,other:0}, ...}}`
The page labels these results as unscientific.

## Social links
Fill in `CONFIG.handle` and `CONFIG.links`.

## Candidate photos
Freely licensed portraits from Wikimedia Commons, cropped square around the face (credits in `CREDITS`, `src/app.js`):
- Tinubu: Nosa Asemota, CC BY-SA 4.0 · Atiku: Morten Fauerby / Atiku Abubakar (Flickr), CC BY 2.0 · Obi: official portrait as published by Premium Times, Nov 2022 (no photographer credited; not a free licence; replace with a photo from Obi's own media channels if possible) · Abbas-Bin: Ultimatemastery, CC BY-SA 4.0
- Makinde: Oduola Matthew, CC BY-SA 4.0 (upscaled 4x with EDSR) · Sowore: Mohamed Nanabhay, CC BY 2.0 · Adebayo: Benbaahi, CC BY-SA 4.0
No free photo exists yet for Duke or the other 11 candidates, so they show initials. To add one, crop it square as `photos/<id>.jpg`, add it to `PHOTOS` and `CREDITS`.

## Community (debate hall)
Topics live in `MOTIONS` (`src/app.js`), each with sourced context and the strongest argument on both sides. Set `CONFIG.community.debatePost`, `argumentForm` and `topicForm` to switch on the buttons. Each Sunday, add the best viewer arguments (both sides) to `COMMUNITY_PICKS`.

## Scoreboard tiers
Frontrunner: 5M+ votes in 2023 or measured in national polling. Contender: sitting/former governor, past national candidate, or nominee of a party with 1M+ votes in 2023. Long shot: everyone else. It ranks evidence, not a prediction.

## The Naija Decides Rank (official rank)
Data lives in `src/ranking.js`: one entry per published 2026 survey, poll or projection (`raw` numbers, date, sample, source, weight). In each category the leader scores 100 and others score in proportion; surveys count in full (weight 1), open polls and projections half (0.5); a candidate missing from a category gets their own average there (shown faded). Total = sum, maximum 350 with five categories. Past election results are not used.

After changing or adding a poll, run:

```bash
node nigeria-2027/site/build.mjs --snapshot
```

It refreshes the "updated" time and, if any total changed, appends a snapshot to `history`. The ▲/▼ arrows and +/− points compare the last two snapshots. A scheduled task checks for new polls every 12 hours (11:43 and 23:43 WAT), runs this, republishes the site and pushes.
