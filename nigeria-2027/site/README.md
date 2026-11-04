# Naija Decides: public website

`naija-decides.html` is the site (published as a Claude artifact). `index.html` is the same page as a standalone file for any static host. Rebuild it after editing:

```bash
node nigeria-2027/site/build.mjs
```

## Sections
Home (countdown, key numbers) · Compare & debate (pick two, judge each round, copy your verdict) · Fact-checks (filter by verdict) · Promises vs reality · Where did the money go? · Weekly news (Sunday edition) · Polls (what exists, with limits) · Match me (6-question candidate match) · Ask (answers from the verified facts; full AI answers for signed-in Claude users).

## Weekly update (every Sunday)
Edit the `NEWS` block in `naija-decides.html` (edition name and 5–6 items, each with a source), add new fact-checks to `FACTS`, then republish / rebuild.

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
