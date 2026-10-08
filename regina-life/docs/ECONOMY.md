# REGINA LIFE — Economy (Prairie Dollars)

Prairie Dollars (`$`) are fictional in-game money; **1 Prairie Dollar is priced like 1 Canadian dollar in Regina, SK in 2026**.
Money is integer cents in the `Ledger` (`src/core/ledger.js`, unchanged), prices come from `src/data/*` and `src/core/*` rules
(never from the UI), and nothing here can be bought with real money. Live numbers: `node scripts/economy-report.mjs`.
The invariants and the realistic ranges below are locked by `tests/economy.test.js`.

**Honesty note.** I had no live web access while writing this. Every "realistic reference" is my own recollection of 2024–2026
Canadian prices (knowledge cut-off mid-2026), written as a range, with a confidence grade:
**H** ≈ I would bet within ±15 %, **M** ≈ ±30 %, **L** ≈ a guess or a fictional product. Please spot-check the M/L rows
(especially intercity fares and the Oct-2026 minimum wage) before marketing the game as "realistic".

## 0. TL;DR

| | |
| --- | --- |
| Anchor | an entry retail job pays **$16.50/h**; one shift task = one paid hour, so a 4-task shift is a **4 h half-day = $66.00** |
| Shift in play time | **~3 real minutes** (4 tasks, walking, clock in/out) → ~$1,400 per focused play-hour at entry level, ~$1,900 at the top |
| Casual week | **20 shifts** (~1 h of shift play inside ~3 h of play) = **$1,320** at entry level, $1,850 senior, $2,520 shift lead |
| Start | **$400** (was $2,500): enough for groceries and a treat, not a furnished flat |
| First furniture set (~$750) | **6 shifts, ~17 minutes** of play from the starting balance |
| Billboards (7 days) | **Standard $1,200 · Big $3,000 · Landmark $10,000** (real-money benchmarks CA$25 / 50 / 100) |
| Money packs (data only) | **$80 … $1,900** for CA$1.99 … 39.99; the best pack is 1.4 casual weeks; caps CA$40/day, CA$100/week |

## 1. Rules that matter for balance

* **Pay is hourly wage × paid hours.** `src/data/jobs.js`: `wage = hourly × tasks × HOURS_PER_TASK` (1 task = 1 paid hour). A shift pays only
  when every task was done and `tasks × 6 s` elapsed (`finishShift`, unchanged). The mayor's *Fair Wages* policy still adds 10 %.
* **No payroll deductions, no sales tax, no rent, no bills** exist in the game. Wages are quoted gross but deposited whole; shelf prices are
  what you pay. Real Saskatchewan shelf prices for clothes/furniture add GST 5 % + PST 6 %; the missing 11 % tax on goods and the missing
  ~15 % deductions on pay (CPP, EI, income tax) roughly cancel, so I compared sticker prices with sticker prices and gross wages with gross wages.
* **Money is a pacing tool, not a survival constraint.** Food is cheap relative to income (§2.5); the real sinks are furniture, clothes,
  trips, social life and billboards. That is deliberate: the game has no eviction or debt, so essentials must never be a trap.
* Prices stay server-portable: they live in data, the rules re-read them (`priceFor`, `wageFor`, `adPrice`, `travel`), the UI only displays.

## 2. Pacing model

Definitions (`src/data/economy.js`, used by docs/tests only — never by game rules):

* **Task** ≈ 25 s (pick up stock, carry, stock a shelf at a normal pace). The anti-exploit floor stays 6 s/task.
* **Shift** = tasks × 25 s + 20 s of clock-in/out chatter, divided by a **70 % efficiency** (walking to work, sleeping, eating, phone).
* **Casual week** = 20 shifts. A "week of work" below means this, not a calendar week of full-time hours (20 shifts = 80 paid hours = two real
  full-time weeks of wages, because the game compresses time ~2:1 per week of casual play).

### 2.1 Pay and play time per career level

| Job · level | Hourly × hours | Pay / shift | Play min / shift | Focused $/play-hour | Casual week (20 shifts) | XP to reach |
| --- | --- | --- | --- | --- | --- | --- |
| Retail · Associate | $16.50 × 4 | **$66.00** | 2.9 | $1,386 | $1,320 | 0 |
| Retail · Senior Associate | $18.50 × 5 | **$92.50** | 3.5 | $1,608 | $1,850 | 400 (10 shifts) |
| Retail · Shift Lead | $21.00 × 6 | **$126.00** | 4.0 | $1,868 | $2,520 | 1,200 (26 shifts, ~84 min) |
| Stylist · Floor Stylist | $17.00 × 4 | **$68.00** | 2.9 | $1,428 | $1,360 | 0 |
| Stylist · Lead Stylist | $19.50 × 5 | **$97.50** | 3.5 | $1,694 | $1,950 | 450 (12 shifts) |
| Stylist · Store Manager | $24.50 × 6 | **$147.00** | 4.0 | $2,179 | $2,940 | 1,400 (31 shifts, ~100 min) |

Promotion XP was raised (retail 100/260 → 400/1,200, stylist 120/300 → 450/1,400) so that the first promotion arrives after about
half an hour of shifts and the top rung after one to two hours, instead of after six shifts.

### 2.2 Rent and groceries (the model, not a mechanic)

Single adult in Regina, monthly (2026): rent for a 1-bedroom **$1,100**, groceries **$420**, transit pass **$88**, phone **$55**,
utilities/internet **$120**, renter's insurance **$20** = **$1,803/month = $416/week**.
That is **6.3 entry shifts** (≈ 18 minutes of play, 32 % of a casual week) — in real life it is 63 % of a full-time Associate's gross week.
If a rent/bills mechanic is added later, charge about **$416 per game-week** (a Friday direct debit, say) and keep the rest of this
document as is: a casual player still keeps ~$900 a week to spend, which is what the ad ladder and the furniture tiers assume.

### 2.3 How the first hour plays (work-only, no other spending, retail path)

| Milestone | Shift # | Play time | Balance |
| --- | --- | --- | --- |
| First paycheque (+$66.00) | 1 | 3 min | $466 |
| First furniture set (~$750) | 6 | 17 min | $796 |
| Promotion to Senior Associate | 10 | 29 min | ~$1,060 |
| Standard billboard ($1,200) | 12 | 35 min | $1,245 |
| Promotion to Shift Lead | 26 | 84 min | ~$2,540 |
| Big billboard ($3,000) | 30 | 100 min | $3,044 |
| Landmark billboard ($10,000) | 86 | 5.4 h | $10,100 |

A real session also includes character creation, walking, eating, sleeping, events and shopping, so the first furniture set lands
at about the half-hour mark. The first casual week (20 shifts, ~3 h of play, ~$1,600 earned including the first promotion) pays for the starter
room, some clothes and a Saskatoon trip, and the standard billboard follows in week two (inside week one if you skip the furniture).
Spending on other things pushes the landmark board out to roughly 2–3 months of casual play.

### 2.4 What things cost in work (entry-level shifts, ~2.9 play minutes each)

| Item | Price | Shifts | Play time |
| --- | --- | --- | --- |
| Double-double | $2.79 | 0.04 | 7 s |
| Deli sandwich | $9.49 | 0.14 | 25 s |
| Hoodie | $65 | 1.0 | 3 min |
| Winter boots | $169 | 2.6 | 7 min |
| Parka | $299 | 4.5 | 13 min |
| Dinner for two | $90 | 1.4 | 4 min |
| Moose Jaw return coach | $34 | 0.5 | 1.5 min |
| Saskatoon return coach | $88 | 1.3 | 4 min |
| Calgary return flight | $299 | 4.5 | 13 min |
| Vancouver return flight | $429 | 6.5 | 19 min |
| Banff (flight + shuttle) | $469 | 7.1 | 20 min |
| First furniture set (guidance) | $750 | 11.4 | 33 min |
| Standard billboard, 7 days | $1,200 | 18.2 | 52 min |
| Big billboard, 7 days | $3,000 | 45.5 | 2.2 h |
| Landmark billboard, 7 days | $10,000 | 151.5 | 7.2 h |

### 2.5 Food is not the sink

Hunger falls 0.045/s (162 points per play-hour). The cheapest food costs ~16 ¢ per hunger point, so staying fed costs ~$26 per
play-hour against ~$1,400 earned: under 2 %, locked at < 8 % by a test. The mayor's grocery discount therefore matters little for
survival and a lot for the feel of the election.

## 3. Old vs new: every number

`Old` is the milestone-3 value. Reference ranges are 2026 CAD (Regina where it exists, otherwise Canada). Unchanged rows are
listed to show they were checked, not skipped.

### 3.1 Start

| Item | Old | New | Realistic reference | Conf. |
| --- | --- | --- | --- | --- |
| Starting balance | $2,500.00 | **$400.00** | a newcomer with first rent paid usually has a few hundred dollars in chequing | design |

### 3.2 Wages (`src/data/jobs.js`)

Old pay per shift implied $23.75–$32.50 *per paid hour* (31 % to 54 % above the new, realistic hourly rates).

| Job · level | Old pay/shift | New hourly | New pay/shift | Realistic hourly (gross) | Conf. |
| --- | --- | --- | --- | --- | --- |
| Retail · Associate | $95.00 | $16.50 | $66.00 | min wage $15.35 (Oct 2025; Oct 2026 indexation likely a few cents more, unverified); Regina retail entry $15.50–$18 | M |
| Retail · Senior Associate | $125.00 | $18.50 | $92.50 | $17.50–$20.50 | M |
| Retail · Shift Lead | $165.00 | $21.00 | $126.00 | supervisor $19.50–$24 | M |
| Stylist · Floor Stylist | $105.00 | $17.00 | $68.00 | fashion retail floor $15.50–$18.50 | M |
| Stylist · Lead Stylist | $140.00 | $19.50 | $97.50 | $18–$22 | M |
| Stylist · Store Manager | $195.00 | $24.50 | $147.00 | $22–$32/h (≈ $46k–$67k a year; ours ≈ $51k) | L |

`XP_PER_TASK` (10) and `MIN_SECONDS_PER_TASK` (6) are unchanged. Promotion XP thresholds are in §2.1.

### 3.3 Groceries (`src/data/catalog.js`)

| Item | Old | New | Realistic reference | Conf. |
| --- | --- | --- | --- | --- |
| Honeycrisp apple | $1.89 | $1.89 | one large apple $1.50–$2.75 | M |
| Sourdough loaf | $4.49 | **$6.49** | bakery sourdough $5–$9 (supermarket sandwich loaf is $3–$4.50, not sourdough) | M |
| Deli sandwich | $7.99 | **$9.49** | deli counter / sub shop $8–$12 | M |
| Ketchup chips | $3.99 | **$4.99** | 200–230 g bag $4–$6 | H |
| Milk 2 L | $5.39 | $5.39 | $4.50–$6 | M |
| Double-double | $2.79 | $2.79 | medium Tim Hortons-style coffee $2.25–$3.25 | M |
| Cream soda | $2.29 | $2.29 | single can/bottle at a cooler $1.75–$3 | M |
| Fresh bannock | $5.99 | $5.99 | bakery or food-truck bannock $4–$8 | L |

### 3.4 Clothing (`src/data/catalog.js`)

| Item | Old | New | Realistic reference | Conf. |
| --- | --- | --- | --- | --- |
| Hoodies (grey, red) | $65 | $65 | mid-range $45–$95 | M |
| Knit sweater | $79 | $79 | $55–$120 | M |
| Field jacket | $129 | $129 | $90–$180 | M |
| **Parka** | $189 | **$299** | a -40 °C-rated parka $249–$450 (premium brands $800+) | M |
| Black jeans | $59 | $59 | $45–$110 | M |
| Chinos | $54 | $54 | $45–$90 | M |
| Joggers | $48 | $48 | $35–$80 | M |
| Shorts | $39 | $39 | $30–$55 | M |
| **Court sneakers** | $55 | **$89** | $65–$130 | M |
| **Winter boots** | $119 | **$169** | rated winter boots $130–$260 | M |
| **Oxfords** | $98 | **$129** | $95–$200 | M |
| Toques | $24 | $24 | $15–$40 | M |
| Ball cap | $29 | $29 | $20–$45 | M |
| **Round glasses** | $45 | **$89** | fashion frames with basic lenses $60–$150 (prescription lenses cost more) | L |
| Sunglasses | $52 | $52 | $30–$120 | M |
| Wool scarf | $34 | $34 | $25–$65 | M |

### 3.5 Intercity trips (`src/data/destinations.js`)

Fares are **return** prices (the trip is one purchase and you are home afterwards). Old coach fares were about one-way prices or less
and old flight fares were 26–45 % below the new ones.

| Trip | Old | New | Realistic reference (return) | Conf. |
| --- | --- | --- | --- | --- |
| Moose Jaw · coach | $14 | **$34** (50 min) | Rider Express-style coach, ~$20 one way | L |
| Saskatoon · coach | $38 | **$88** (150 min) | $45–$60 one way | M |
| Saskatoon · flight | $145 | **$259** (45 min) | fictional regional hop; if it existed, $200–$350 | L |
| Winnipeg · coach | $85 | **$170** (400 → 450 min) | $75–$115 one way | M |
| Winnipeg · flight | $210 | **$329** (90 min) | $250–$450 | M |
| Calgary · coach | $110 | **$230** (540 → 570 min) | $100–$145 one way | M |
| Calgary · flight | $220 | **$299** (75 min) | $220–$420 | M |
| Banff · flight + shuttle | $260 (150 min) | **$469** (210 min) | flight to Calgary ~$300 + Banff shuttle ~$140 return | L |
| Vancouver · flight | $290 | **$429** (150 min) | $300–$560 | M |

### 3.6 Everyday services and social life

| Item | Old | New | Realistic reference | Conf. |
| --- | --- | --- | --- | --- |
| Quick Cab (`cabFare`) | $4.50 + $3.50/km | **$4.50 + $2.50/km** (1 km $7, 5 km $17, 10 km $29.50) | Regina taxi / ride-share: flag drop $4–$5, $2–$3 per km | M |
| Hangout: coffee for two | $6 | **$10** | two café drinks $8–$14 | M |
| Hangout: cinema for two | $18 | **$38** | two tickets $30–$50 | H |
| Hangout: date-night dinner for two | $45 | **$90** | mid-range dinner with tip $70–$130 | M |
| Hangouts: walk, gym | $0 | $0 | free | n/a |
| Gym fee | none | none | day pass $15–$20, 24 h membership ~$50/month; **not charged** (no mechanic) | M |
| Rent, utilities | none | none | see §2.2; **not charged** | M |
| Campaign donation (UI buttons) | $10 / $50 | $10 / $50 | individual municipal donations $25–$100 | M |

### 3.7 Event cash (`src/core/events.js`; the price in each button label matches the cost, tested)

| Event · choice | Old | New | Realistic reference | Conf. |
| --- | --- | --- | --- | --- |
| Snowbank: driver tips you | +$20 | **+$10** | a tenner "for coffee" | L |
| Busker tip / coffee for a stranger | −$3 / −$3 | −$3 / −$3 | a loonie or two / one coffee with tax | M |
| Wind chill: hot chocolate | −$4 | **−$5** | $3.50–$6 | M |
| Moose Jaw: tunnel tour / hot springs | −$12 / −$18 | **−$22 / −$32** | $18–$30 / $25–$40 | M |
| Saskatoon: berry pie | −$9 | −$9 | slice with coffee $6–$12 | M |
| Winnipeg: Forks market / café coffee | −$10 / −$4 | **−$15 / −$5** | $12–$25 / $4–$6 | M |
| Banff: hot chocolate | −$7 | **−$8** | $6–$10 | M |
| Vancouver: ramen | −$14 | **−$19** | $15–$25 | M |

### 3.8 Billboards, packs and limits

Billboards and packs: see §4 and §5. Unchanged on purpose: the ledger limits ($1,000,000 per transaction, $100,000,000 balance, 25 transactions per 10 s).

### 3.9 Not mine, but needed for pacing: furniture guidance

`src/data/furniture.js` belongs to the catalogue work, so these are **guidance only**, typical 2026 prices at IKEA / Structube / Wayfair-class
retailers (Conf. M). Current prices are a third to a half of reality.

| Piece | Old | Realistic range |
| --- | --- | --- |
| Armchair | $69 | $229–$499 |
| Bean bag | $49 | $79–$169 |
| Dining chair | $39 | $59–$129 |
| Dining table | $149 | $299–$699 |
| Coffee table | $79 | $149–$349 |
| Side table | $34 | $59–$149 |
| Bookcase | $89 | $119–$299 |
| Dresser | $119 | $299–$699 |
| Fiddle-leaf plant | $24 | $49–$129 |
| Floor lamp | $39 | $49–$149 |
| Stereo cabinet | $69 | $199–$499 |
| Round rug (2 m) / runner | $59 / $42 | $119–$349 / $59–$179 |
| Wall paint (one room, DIY) | $40 | $60–$120 |
| Flooring (one room) | $120 | $450–$1,500 |

Pacing constraints for whoever prices it: the **first furniture set** (armchair, coffee table, rug, lamp, plant) should land near
**$750** (`FIRST_FURNITURE_SET`) so a newcomer needs ~6 shifts; a **full 24-piece apartment** at $6k–$10k is ~4–7 hours of focused shift
play, i.e. 2–3 months of casual play. A resale ratio of 50–60 % is fine for the economy.

## 4. Billboard price ladder (`src/data/billboards.js`, `src/core/ads.js`)

Real-money benchmark for future advertisers (disabled): about **CA$25 / CA$50 / CA$100 per 7 days**. In-game, the ladder is set by the pacing model,
not by an exchange rate: **standard ≈ one casual week of entry-level pay, landmark ≈ two months of saving.**

| Tier | id | Size | Price (7 days) | Casual weeks of entry pay | Max rotation | Placement rule | Real-money benchmark | Boards |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Standard board | `standard` | 10.5 × 5.25 m | **$1,200** | 0.9 | 4 | standard-size boards, < 2,100 passers-by/day | CA$25 | victoria-west, albert-north, wascana-view, airport, uofr, harbour, ring-road, downtown-south |
| Big board | `big` | 15 × 7.5 m | **$3,000** | 2.3 | 3 | large boards, 2,100–2,799/day | CA$50 | victoria-east, albert-south |
| Landmark board | `landmark` | 15 × 7.5 m, prime site | **$10,000** | 7.6 | 2 | large boards, 2,800+/day | CA$100 | downtown-north, stadium |

* **Max rotation** = how many different ads share a board's screen time at once; every booking is one slot (equal airtime, `adAirtime`). In the
  single-player build the other slots show house ads, so a board is never "sold out" and the existing one-booking-per-board rule is unchanged;
  the marketplace milestone fills up to `maxRotation` slots. Fewer, pricier slots on prime sites keep landmark exposure exclusive.
* **Existing boards map onto tiers without changing the 3D boards.** `tier` (`'standard' | 'mega'`, the physical model) is untouched; every board
  gained `adTier`. Of the four former "mega" boards the two with the most traffic are Landmark (downtown-north 3,000, stadium 2,800) and the other
  two are Big (victoria-east 2,600, albert-south 2,400). A test proves every board satisfies exactly one tier's placement rule.
* **The 7-day booking is the product** (`weekPrice`, `adQuote`). The current Ads app still offers 1- and 3-day runs, priced pro rata × 1.6 and × 1.25
  (`DURATIONS`), so a short run always costs more per day (standard: $274 for one day, $643 for three) and nobody is stranded on the old UI.
* The mayor's *Open Skies* policy still takes 20 % off (`$960` for a standard week).
* **Why 1 : 2.5 : 8.3 and not the real-money 1 : 2 : 4.** Landmarks are status: they must stay a long-term goal for a player whose pay doubles in
  the first two hours. Real advertisers pay for audience (both ladders rise with traffic); players pay for prestige.
* **Buying Prairie Dollars can never undercut a real advertiser:** at the best pack rate (47.5 $/CA$) a standard week costs CA$25.26, a big week
  CA$63.15 and a landmark week CA$210.5, all at or above the CAD benchmark (tested).

What the UI can consume: `AD_TIERS`, `AD_TIER_ORDER`, `AD_DAYS`, `BILLBOARDS[].adTier`, `placementOk(tier, board)`, and from `ads.js`
`tierOf(boardId)`, `weekPrice(boardId, state)`, `adQuote(boardId, state)` → `{ board, tier, days, price, listPrice, airtime, maxRotation, reach }`.

## 5. Money packs (`src/data/packs.js`) — data only, disabled

| Pack | id | In-game | Price | $/CA$ | Casual weeks of entry pay |
| --- | --- | --- | --- | --- | --- |
| Pocket Change | `pocket` | $80 | CA$1.99 | 40.2 | 0.06 |
| Full Wallet | `wallet` | $210 | CA$4.99 | 42.1 | 0.16 |
| Paycheque | `paycheque` | $430 | CA$9.99 | 43.0 | 0.33 |
| Harvest | `harvest` | $900 | CA$19.99 | 45.0 | 0.68 |
| Full Granary | `granary` | $1,900 | CA$39.99 | 47.5 | 1.44 |

* **Modest:** no pack exceeds 2 casual weeks of entry pay (tested at ≤ 1.5); the best is 1.44 weeks, 29 entry shifts, ~1.4 hours of play.
* **Capped:** `PACK_LIMITS` = at most 2 packs, CA$40 a day and CA$100 a week (≈ 3.6 casual weeks of entry pay per week at the very most), enforced by the
  future server. In-game daily cap ≤ 2 weeks, weekly ≤ 4 weeks (tested).
* **Small bonus:** the best rate is 18 % better than the worst (tested ≤ 20 %), so there is no "must buy the big one" pressure.
* **Not pay-to-win:** packs add only Prairie Dollars, which buy things earnable for free (furniture, clothes, trips, ads); no items, XP, skills, wages
  or exclusive content. Billboards cost far more than a day's cap, so a landmark would still take about two weeks of maximum spending and CA$210.
* `PACKS_ENABLED = false`; real purchases need legal terms, moderation, payment and age gating first (`docs/PLAN.md` §4).

## 6. Rationale and trade-offs

1. **Realism sits in ratios, pace sits in time.** Hourly wage versus price is realistic everywhere (a coffee costs ~10 minutes of wage, rent ~67 hours).
   The only invented number is that a paid hour takes ~45 s of play; everything else follows from it and from the casual week.
2. **Why 1 task = 1 paid hour?** It needs no mechanic change, is easy to explain in the UI ("$16.50/h × 4 h"), and gives amounts a player recognises.
   Using 30-minute tasks halves every payout (first set in ~1 hour) and would also have worked; the ratio of wages to prices is what matters.
3. **A lower start but larger wages relative to goods.** $400 means the first set is a real goal; a first paycheque in three minutes keeps the first
   session rewarding. A newcomer can afford a return flight to Vancouver after one shift — acceptable, trips are optional content and cost a
   cooldown + energy.
4. **Weekly income is not "huge".** Typical balances stay in the hundreds to low thousands; the largest number a normal player ever sees is the
   $10,000 landmark board.
5. **Energy limits grinding softly** (a shift costs ~13 energy including idle drain, and sleeping needs a trip home); the hard anti-exploit rules
   (all tasks, ≥ 6 s per task, idempotent payroll refs, ledger rate limit) are unchanged. A server milestone should add a daily shift cap.
6. **Policies still bite.** Wage +10 % = $6.60 a shift; grocery −12 % = $0.78 on bread; clothing −10 % = $30 on a parka; signage −20 % = $240 on a
   standard board — all visible, none game-breaking.

## 7. Notes for the integrator (files I was told not to touch)

* `src/main.js` still uses its own `cabFare = 450 + d × 0.35` (≈ 40 % high). Replace it with `import { cabFare } from './core/travel.js'`.
* `src/world/city.js` paints `DAY_PRICE[b.tier]` ("$X / day") on the 3D signs; `DAY_PRICE` is kept (now the 1-day price of the Standard / Big tiers) so nothing breaks,
  but landmark boards show the Big rate. Prefer `adQuote(board.id).price` per week.
* `src/ui/apps.js` Ads app: still lists "MEGA SCREEN / Standard" and 1/3/7-day buttons; switch to `AD_TIERS` + 7 days. Jobs app can show
  `level.hourly`, `level.hours`. The Life milestone "Save $5,000" is now ~4 casual weeks. Town Hall donation buttons ($10/$50) are still valid.
* **Tests that buy things with a default store now start with $400.** New furniture/build tests must fund the player (`store.state.bank.balance = …`);
  I updated only the numeric expectations in `core`, `events`, `life` and `review` tests, plus `travel` in `review.test.js` (it now funds the Banff flight).
* `scripts/smoke.mjs` (not run here): the billboard booking and the Moose Jaw fare assertions read the price from the rules instead of hard-coding it.
* Existing saves keep their balances; no migration is needed. Promotion thresholds rose, but nobody is demoted.

## 8. Follow-ups

* Rent and bills (weekly, ~$416) once a "Living economy" milestone exists; optional gym day pass ($15) and membership ($50/month).
* Multi-slot billboard rotation needs `sanitize.js` to accept an array of bookings per board.
* Verify the M/L reference prices against live sources (Rider Express, WestJet/Air Canada, Job Bank, CMHC / Rentals.ca) before launch,
  and re-run `node scripts/economy-report.mjs` after any change.
* Economy telemetry (opt-in) to check real play minutes per shift against the 25 s/task assumption; if players are 2x faster, halve `HOURS_PER_TASK`
  effect (`wage`) or raise `MIN_SECONDS_PER_TASK`.
