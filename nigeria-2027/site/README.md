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
2. Paste the form link into `CONFIG.pollFormUrl`. The "Vote" button appears.
3. Each Sunday, copy the counts from the form's Responses sheet into `POLLS.viewer`:
   `{updated:'15 Nov 2026', total:1234, ages:{'18-24':{tinubu:0,atiku:0,obi:0,other:0}, ...}}`
The page labels these results as unscientific.

## Social links
Fill in `CONFIG.handle` and `CONFIG.links`.

## Candidate photos
Only freely licensed photos, credited in the footer (`CREDITS` in `src/app.js`):
- Bola Tinubu: Nosa Asemota, CC BY-SA 4.0 (Wikimedia Commons)
- Peter Obi: Plus TV Africa, CC BY 3.0 (Wikimedia Commons)
- Atiku Abubakar: still needed. Download https://commons.wikimedia.org/wiki/File:Atiku_Abubakar-2010_(cropped).jpg (CC BY 2.0), crop to a square as `photos/atiku.jpg`, set `PHOTOS.atiku` and add the credit.

## Scoreboard tiers
Frontrunner: 5M+ votes in 2023 or measured in national polling. Contender: sitting/former governor, past national candidate, or nominee of a party with 1M+ votes in 2023. Long shot: everyone else. It ranks evidence, not a prediction.
