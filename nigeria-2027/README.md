# Nigeria 2027 in numbers: TikTok / Instagram video kit

Five ready-to-post **narrated** vertical videos (1080×1920, 30fps MP4, Nigerian-English voiceover) about Nigeria's 16 January 2027 presidential election, plus Instagram carousel slides and a stats page.

| # | Video | File | Hook |
|---|-------|------|------|
| 1 | Nigeria 2027: what you need to know | `videos/countdown.mp4` | Jan 16 · 110M voters · the big three · 26.7% turnout |
| 2 | Your money: 2023 vs now | `videos/your-money.mp4` | Petrol 7×, naira −66%, poverty 63%, food inflation |
| 3 | 2023 rewind | `videos/rewind-2023.mp4` | 68.5M registered voters stayed home; margin was 2.69M |
| 4 | Know the candidates | `videos/know-the-candidates.mp4` | Tinubu, Atiku and Obi side by side, why we need change, choose for yourself |
| 5 | How to make your vote count | `videos/protect-your-vote.mp4` | PVC → polling unit → stay for the count → IReV |
| 6 | Promise vs reality | `videos/promise-vs-reality.mp4` | 2022 promises vs 2026 data, shown with real news clippings, highlighted, with verdict stamps; includes what improved |

- `stills/<video>-NN.png`: one 1080×1920 PNG per scene. Post them as an Instagram carousel or as Stories.
- `index.html`: stats page with every video, a copy-caption button for each, and the full source list.
- `studio.html`: live preview with a scrubber (`studio.html?v=why-obi`).

## Posting tips

- Each video has a **narrator** (Microsoft Edge neural voice `en-NG-AbeoNeural`, a Nigerian-English male voice). For music, add a trending sound in the TikTok / IG editor and turn its volume down to about 15–20% so the voice stays clear.
- To use the female voice, set `window.VOICE = { name: 'en-NG-EzinneNeural', rate: '+18%' }` in `videos.js` and re-render. To record your own voice instead, replace the clips in `vo/<video>/NN.mp3` (keep the `.txt` files) and re-render.
- Text stays out of the bottom ~380px and the right edge, so the app's caption, buttons and progress bar won't cover it.
- Captions with hashtags are in `videos.js` (`caption:`), and the page has a **Copy caption** button for each.
- Every video ends on a sources card. Keep it: fact-checked posts are harder to dismiss and less likely to be flagged.

## News clippings ("receipts")

`clip.mjs` opens each article listed in `clips.json` in a phone-sized browser, screenshots the headline (with the article photo) and the paragraph holding the key sentence at 3× resolution, and records where that sentence sits. In the video, `receipt('<id>', {...})` shows them as paper cutouts and draws an animated highlighter over the sentence.

```bash
node nigeria-2027/clip.mjs
```

Add a clipping: put `{ "id", "outlet", "date", "url", "find": ["phrase in the sentence"] }` in `clips.json` (or `"headline": true` to highlight the headline), run the command above, then use `receipt('<id>', { stamp: 'Verdict', note: 'one-line takeaway' })` in a scene. Use short excerpts and always show the outlet and date.

## Edit and re-render

1. Change the words, numbers or your handle in `videos.js` (`window.HANDLE = '@yourname'`). The spoken script is `window.NARRATION` at the bottom of the same file, one line per scene. Write numbers the way they should be said.
2. Preview: open `studio.html` in a browser.
3. Render (needs Node 18+, Playwright with Chromium, ffmpeg, and `pip install edge-tts` for the voice). Scenes stretch to fit their narration:

```bash
node render.mjs
```

```bash
node render.mjs why-obi
```

## Facts used (as of 3 Nov 2026)

| Fact | Figure | Source |
|------|--------|--------|
| Presidential & NASS election | Sat 16 Jan 2027 (gov./state assembly 6 Feb 2027) | INEC revised timetable, Feb 2026 |
| Registered voters | ~110M; Lagos 7,488,633 · Kano 6,570,276 · Kaduna 4,662,640 | INEC chairman via Nairametrics, Oct 2026 |
| Main tickets | Tinubu/Shettima (APC) · Atiku/Amaechi (ADC) · Obi/Kwankwaso (NDC) | INEC nomination publication, Aug 2026; Wikipedia |
| 2023 result | Tinubu 8,794,726 · Atiku 6,984,520 · Obi 6,101,533 · Kwankwaso 1,496,687 | INEC, 1 Mar 2023 |
| 2023 turnout | 24,965,218 of 93,469,008 registered (26.7%) | INEC |
| Petrol | ~₦185/L (May 2023) → ~₦1,335/L (Nov 2026) | pump prices; dailyfuels.com |
| Naira | ~₦461/$ (May 2023) → ₦1,330–1,358/$ official (Aug–Sep 2026) | CBN / SEC via press |
| Poverty | 56% (2023) → 63% (2025), ≈140M people | World Bank Nigeria Development Update, Apr 2026 |
| Inflation | 14.63% headline, 19.59% food (Sept 2026) | NBS CPI (rebased Jan 2025) |
| Candidate records | Tinubu: President since 2023, Lagos governor 1999–2007 · Atiku: Vice President 1999–2007, PDP candidate 2019 & 2023 · Obi: Anambra governor 2006–2014, LP candidate 2023 | Wikipedia |
| 2023 states won | Tinubu 12 · Atiku 12 · Obi 11 + FCT · Kwankwaso 1 | INEC |

Before posting, double-check the dates and numbers against INEC and NBS. They can change.

This kit is independent civic information and is not affiliated with any party or candidate. Every candidate is shown the same way, with initials. To use photos, add a freely licensed photo for **each** candidate and set all their paths in `IMG` in `videos.js`.
