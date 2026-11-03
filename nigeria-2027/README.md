# Nigeria 2027 in numbers: TikTok / Instagram video kit

Five ready-to-post vertical videos (1080×1920, 30fps MP4) about Nigeria's 16 January 2027 presidential election, plus Instagram carousel slides and a stats page.

| # | Video | File | Hook |
|---|-------|------|------|
| 1 | Nigeria 2027: what you need to know | `videos/countdown.mp4` | Jan 16 · 110M voters · the big three · 26.7% turnout |
| 2 | Your money: 2023 vs now | `videos/your-money.mp4` | Petrol 7×, naira −66%, poverty 63%, food inflation |
| 3 | 2023 rewind | `videos/rewind-2023.mp4` | 68.5M registered voters stayed home; margin was 2.69M |
| 4 | Why Peter Obi | `videos/why-obi.mp4` | Record, plan, why change, Obi–Kwankwaso |
| 5 | How to make your vote count | `videos/protect-your-vote.mp4` | PVC → polling unit → stay for the count → IReV |

- `stills/<video>-NN.png`: one 1080×1920 PNG per scene. Post them as an Instagram carousel or as Stories.
- `index.html`: stats page with every video, a copy-caption button for each, and the full source list.
- `studio.html`: live preview with a scrubber (`studio.html?v=why-obi`).

## Posting tips

- The videos are **silent on purpose**. Add a trending sound in the TikTok / IG editor; trending audio gets more reach than baked-in music.
- Text stays out of the bottom ~380px and the right edge, so the app's caption, buttons and progress bar won't cover it.
- Captions with hashtags are in `videos.js` (`caption:`), and the page has a **Copy caption** button for each.
- Every video ends on a sources card. Keep it: fact-checked posts are harder to dismiss and less likely to be flagged.

## Edit and re-render

1. Change the words, numbers or your handle in `videos.js` (`window.HANDLE = '@yourname'`).
2. Preview: open `studio.html` in a browser.
3. Render (needs Node 18+, Playwright with Chromium, and ffmpeg):

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
| Obi record | Anambra governor 2006–2014; ThisDay "Most Prudent Governor" 2009; Sun Man of the Year 2007 | Wikipedia: Peter Obi |

Before posting, double-check the dates and numbers against INEC and NBS. They can change.

Photos are from Wikimedia Commons under free licences: `Peter_Obi.png`, `Bola_Tinubu_portrait.jpg`, and `Atiku_Abubakar-2010_(cropped).jpg` if it is present. Check each file's Commons page for the exact attribution.
