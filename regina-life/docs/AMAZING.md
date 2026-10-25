# M6: make Regina Life amazing

Status: plan, October 2026. It comes from five research passes: a first-time desktop playtest, a phone playtest, a genre study (Animal Crossing, Stardew, Sims, Brookhaven/Bloxburg, Townscaper/Tiny Glade/Islanders, Habbo, BitLife), a render/visual audit of three r186, and a Regina fact pass with sources. The raw notes and screenshots stay local in `.scratch/` (gitignored). This file is the summary we build from.

It covers four things the owner asked for: **look** (design), **play** (gameplay), **ways to earn money in the game**, and **ways the game earns money for its owner**. All rules from VISION still apply: original content only, Prairie Dollars (P$) are fictional, real money never buys power, NPCs are labelled, and real Regina time and weather with a labelled simulated fallback.

## 1. An honest diagnosis

What already works: the 3D catalogue thumbnails, the phone home screen and its call UI, the place cards, the guided shift (cone, ring and chip), the Bank app, the Bungalow lot, the honesty labels, and the local, funny event copy.

What is holding it back, most important first:

1. **The city is dark.** Street frames measure a mean luma of 0.16 to 0.23 against the VISION target of 0.45, and 60 to 70% of pixels are near-black. There are three causes. The sky shader writes linear colours to an sRGB canvas, so the night sky renders black and the day sky renders navy. ACES tone mapping crushes the asphalt to `#151515`. And dark glass facades fill the frame.
2. **The first minute has no direction.** New Life drops you on a dark street. A random event modal can appear about 4 seconds in. There is no goal on screen. The bright dollhouse sits behind a tab, and clicking the character in the creator starts the game by accident.
3. **Nothing celebrates.** Payday, buying, placing furniture, levelling up and moving into a P$3,500 house each end in a single toast. The code has no floaters, coin effects, confetti or ambient sound.
4. **Activities hide the action.** TV, treadmill and shower each cover the scene with a blurred modal while the avatar stands next to the furniture. Place-card activities ("Read on a bench", "People-watch") are plain text that does nothing.
5. **Money has one source.** Shifts are the only real income, and the daily reward is P$5 that resets when you miss a day. That is the textbook dark-pattern line, and we fix it.
6. **Winter, Regina's signature season, is the weakest weather state.** At -18 C you see a few white specks, and the avatar wears a T-shirt.
7. **Two design systems.** Old dark-glass modals with orange buttons (loading, creator, wallet, shop, events, phone apps) sit next to the new bright pill-and-sheet shell.

## 2. The first five minutes we are building

1. **A bright loading screen** in the game's own colours, with a tip in a Regina voice.
2. **The title**: a large "REGINA LIFE" lockup over a sunlit, slowly orbiting city, live chips for the time, real weather and season, and one green **Play** button.
3. **The creator**: you can drag to spin the character, and clicking can no longer start the game by mistake.
4. **Home.** The camera flies down to your studio in a 3/4 view at about 50 degrees, and you can zoom and orbit. The avatar waves.
5. **A "First day in Regina" card**: six steps, each with a small P$ reward (move a piece, buy something, eat, take a shift, visit a place, claim the daily gift). No random events until you have played 10 minutes or finished three steps.
6. **Every action answers back**: "+22 Fun" floats up, coins fly into the wallet, need bars bounce, pitch-varied chimes play, confetti marks the firsts, and a soft ambient soundscape follows the real time, weather and season.

## 3. Design work packages (look and feel)

Each package is client-only, has owned files, and comes with acceptance checks. Perf budgets come from VISION 3.7: on a phone at most 350 draw calls and 450k triangles, and no package adds more than 0.5 ms of GPU time unless it says so.

| # | Package | Owned files | Acceptance |
| --- | --- | --- | --- |
| D1 | **Sky and colour fix.** Add the tone-mapping and colour-space chunks to the sky shader, and give the night a dusk-blue floor (it is never black). | `world/sky.js` | The night sky top colour is at least `#0f1f45`. The day horizon renders as the authored hex. |
| D2 | **Bright city pass.** Use Neutral tone mapping in place of ACES, light asphalt (`#66727e`) and sidewalks, a stronger hemisphere fill (shadow side at about 0.55 of the sun side), light window bands in place of dark glass, palette roofs, no rooftop AC box, `shadow.radius`, and MSAA on touch. | `main.js`, `world/sky.js`, `world/textures.js`, `world/city.js` | Noon street luma is at least 0.42 and fewer than 25% of pixels are near-black. Draw calls stay within budget. |
| D3 | **Living dollhouse camera.** A 3/4 pitch in Home view, wheel or pinch zoom across 3 levels, drag to orbit ±50°, and day and night indoors (lamps glow at dusk, window panes follow the sky). | `player/cameraRig.js`, `main.js`, `world/sky.js` | Wheel and drag change the view in Home. At 23:30 the dollhouse looks different from noon. |
| D4 | **Boot to Home.** New Life (after the creator) and Continue both land in the dollhouse. | `main.js` | Smoke: after the creator, `mode === 'home'`. |
| D5 | **Title hero.** A logo lockup, one green Play button, no ad-sales chip on the front door, and an honest "Offline · single-player" label with no live dot. | `ui/shell.js`, `index.html`, CSS | Play is the only primary button. |
| D6 | **Juice kit.** `ui/juice.js` provides `floater`, `coins`, `pulse`, `confetti` and `haptic`. `audio.js` gains pitch-jittered gain and cost chimes and material thuds. Every payoff calls the kit. Reduced motion keeps the text and sound but drops the movement. | `ui/juice.js` (new), `ui/audio.js`, call sites | Shift, daily, buy, place, activity and skill-up each show a floater. |
| D7 | **Soundscape.** A procedural ambient bed: wind follows the real wind speed, birds play in season and at the right hour, plus traffic downtown, rain, footsteps in snow and indoor room tone. A mute button on the top pill. | `ui/ambience.js` (new) | It is silent until the first user gesture. Mute persists. |
| D8 | **Non-modal activities.** A progress ring over the avatar in place of the blurred modal. The avatar sits on the sofa, lies in bed and runs on the treadmill. | `ui/panels.js`, `main.js`, `player/character.js` | The scene stays visible during TV. The avatar stands at the seat. |
| D9 | **One design system.** Port the creator, wallet, shop, event, progress and phone-app panels to the `theme.css` tokens. | `style.css`, `theme.css`, `ui/panels.js` | No `#ff7a1a` orange on primary buttons. |
| D10 | **Real winter.** A snow skin: white ground, roof and car tint, a frozen lake, breath puffs, an automatic toque and parka below -10 C, and a wind-chill chip. Weather particles move to the GPU. | `world/sky.js`, `world/city.js`, `player/character.js` | A -18 C snow frame shows snow on the ground. |
| D11 | **Regina truthfulness pass.** Dewdney Lofts in place of "Wheat City Lofts" (Brandon's nickname). Brick and Game-Day Green bunnyhugs in place of "Rider Red". No coffee-chain trademarks. Big Sky Savings in place of a credit-union-like name. Fix the Saskatoon berry fact, swap "Feed the ducks" for "Watch the geese", and delete the "(Position stylised.)" dev copy. | data files | Grep finds none of the old strings. |

## 4. Gameplay work packages

| # | Package | Owned files | Acceptance |
| --- | --- | --- | --- |
| G1 | **Creator fix.** A backdrop click respects `dismissable: false`. Add drag-to-rotate. | `ui/panels.js` | Clicking the character keeps the creator open. |
| G2 | **Calm start and a notification budget.** No event in the first 10 minutes of play, a 5-minute cooldown, and street events as a dismissible bottom card. A Quiet mode toggle. | `core/events.js`, `main.js` | Unit tests cover the grace window and the cooldown. |
| G3 | **First day in Regina.** A six-step checklist card on Home that pulses the relevant tab, pays P$ per step through the ledger with idempotent refs, and celebrates at the end. | `core/onboarding.js` (new), `ui/` | Pure rules are tested, and the smoke walks the steps. |
| G4 | **Forgiving daily.** The 7-stamp card advances per visit day and never resets. A bright card shows the stamps. The upsell line moves to the Bank app. | `core/daily.js`, `main.js` | A missed day does not reset the streak (test). |
| G5 | **Readable needs and moodlets.** Need bars carry names and numbers, and you can tap to see why you feel this way ("+2 Sunny day", "-4 Cold: no coat at -18 C"). | `core/moodlets.js` (new), HUD | The moodlet list comes from pure rules (tests). |
| G6 | **Working place activities.** Every chip on a place card becomes a 10 to 20 second action with an effect and a floater: read on a bench, people-watch, hear the buskers, window shop, watch the geese. | `core/game.js` `ACTIVITIES`, `main.js` | No inert `<span>` chips remain. |
| G7 | **Eat now.** Buying food offers Eat now. Add a fridge "Grab a snack". | `main.js` | You can eat without opening the phone. |
| G8 | **Regina To-Do.** Three small daily tasks seeded by the Regina date, plus a weather bonus ("It's -18 C: make a hot drink"). They fill a stamp card with cosmetic rewards. | `core/todo.js` (new) | Tested. Rewards total under P$15 a day. |
| G9 | **Goodnight.** Sleep shows the day's tally line by line, then "Tomorrow in Regina", the real forecast with `forecast_days=2`. | `core/weather.js`, `main.js` | The forecast line is labelled LIVE or SIMULATED. |
| G10 | **Pumpkin Walk at Wascana, 31 Oct.** The first festival: a message 3 days ahead, then find 9 pumpkins in 60 seconds for a cosmetic prize. It comes back every year. | `core/festivals.js` (new) | Date-gated (tested), and optional. |
| G11 | **Visible job.** An apron on clock-in, a name badge chip, and a clock-out tally (tasks, hours, pay, XP and "next promotion in N shifts"). | `main.js`, `player/character.js` | The tally lists pay that matches the ledger. |
| G12 | **Residents you can find.** Weekly routines for the 12 residents and a "Here now" row on place cards with Chat and Gift buttons. Neighbours lists the residents and their NPC tags. | `data/residents.js`, `core/social.js` | `whereIs` is pure and tested. |

## 5. Ways to earn P$ in the game (the "money avenues")

Today there is one: shifts. M6 adds side hustles that each use a different part of the game, so earning money becomes play. All pay goes through the ledger with idempotent refs, all amounts are in `data/economy.js`, and `tests/economy.test.js` keeps the pace honest (no hustle out-earns a shift per minute by more than 20%).

| Avenue | How it plays | Driven by | Pays (P$) |
| --- | --- | --- | --- |
| **Odd Jobs app** | A gig board on the phone with 3 to 5 gigs a day, each a short timed route or task on the map | the Regina date | 8 to 30 per gig |
| **Snow shovelling** | Appears after 5 cm or more of real (or labelled simulated) snow. You shovel a neighbour's walk with a short hold-to-shovel loop. | **live weather** | 18 to 30 |
| **Grocery delivery** | Pick up a bag at the Market and run it to a door before a generous timer runs out. The cone and ring come from the shift system. | time of day | 12 to 22, with a tip if you are quick |
| **Dog walking at Wascana** | Walk a resident's dog along the lake loop. Friendship goes up too. | residents | 15 |
| **Busking** | Play guitar on Scarth Street. Pay scales with Charisma and with foot traffic by hour and weather. | skill + time + weather | 5 to 40 |
| **Market stall (Saturdays)** | Sell paintings from the easel and baked goods from the kitchen at the Farmers' Market. Prices depend on skill level. | real weekday | 10 to 60 per item |
| **Rent out a room** | A Bungalow owner can take a lodger for steady daily income (an NPC, labelled). | home tier | 25 a day, visit days only |
| **Promotions** | The career ladder already exists. The tally makes it visible. | shifts | wage steps |

Rules: no hustle punishes you for being away. Gigs never expire mid-day, earnings accrue only on visit days, and there is no withering, decay or countdown pressure.

## 6. Ways the game earns money for its owner

The honest headline from VISION 6.6: **advertisers pay for audience.** With no audience, a billboard sale is a donation. So the first revenue lever is the game itself: it has to be amazing and easy to share (postcards with the real weather stamp, an installable PWA, and a fast first five minutes). M6 also builds the money surfaces that work today, with no server and no payment code in the client.

| # | Revenue surface | Ships in | How it works now | Later (needs server or legal gate) |
| --- | --- | --- | --- | --- |
| R1 | **Sponsored billboards, founding advertisers** | M6 (manual) | An **Advertise** page in the game and at `/advertise/`. A business types its name and a line and sees a **live 3D preview** on a real board in the city. It sends a booking request through a contact link. The owner reviews the request, takes payment outside the game (an invoice or a payment link), adds the creative to `src/data/sponsors.js`, and redeploys. In game the board shows the ad with a **Sponsored** tag and a leaving-the-game interstitial on tap. Founding rates (VISION 6.2 at a founding discount): Standard CA$25, Big CA$50, Landmark CA$100 per 7 days. | Self-serve checkout and real view counts (M9) |
| R2 | **Supporters' Mural** | M6 | A mural wall in Victoria Park lists supporters' names, added manually by the owner from a support link the owner chooses. It gives no in-game advantage. A "Support Regina Life" page explains where the money goes. | Supporter accounts (M8) |
| R3 | **Postcards to merch** | Owner decision | In-game postcards (photo mode with the real weather and date stamp) are original art the owner can sell as prints, along with original Regina Life designs (Brick or Game-Day Green bunnyhugs, a "Living skies" print). A Shopify connector is available in this workspace, so a store can be set up when the owner says yes. | n/a |
| R4 | **Sponsored local venues** | M9d (VISION Q10) | A real Regina café or shop as a branded venue at its real location | Needs legal review and moderation |
| R5 | **P$ packs** | After M8 plus the legal gate | Already designed: 5 capped packs, adults only, CA$40 a day and CA$100 a week limits, P$ only, never power | Server economy required |

What we will not do: programmatic display or video ads over the game, rewarded ads for P$, loot boxes, real-money shortcuts in a one-tap flow, countdown urgency, or anything that sells status or power.

## 7. Build order (this branch)

**Wave 1, "wow" (first impression):** G1, D1, D2, D4, D3, D5, G2. *Done when* the first five minutes match section 2 up to step 4, and both smokes pass.

**Wave 2, "feel":** D6, G3, G4, D8, G5, G7, G6. *Done when* every payoff has a floater and the new player is never lost.

**Wave 3, "money":** the Odd Jobs app and its first gigs (snow shovelling, delivery, busking), the market stall, G11, R1 and R2.

**Wave 4, "Regina":** D10, D7, G9, G10 (Pumpkin Walk ships before 31 Oct), D11, G8, G12, D9.

Every wave runs `npm test` and both smokes (desktop and `--mobile`), and takes before and after screenshots. Each package lands as its own commit on `claude/regina-life-development-rh7hkk`.

## 8. Not in M6

Driving, real-player chat and visits, uploads, real payments in the client, accounts, second floors, pets, Moose Jaw.

## 9. Owner questions (with the default we use until answered)

| Q | Question | Default |
| --- | --- | --- |
| A1 | Which contact should the Advertise and Support pages use for bookings? | A placeholder in `src/data/sponsors.js` (`CONTACT_URL`). Until it is set, the pages say "Booking opens soon". |
| A2 | Which support link (Ko-fi, GitHub Sponsors, other)? | None until chosen. The mural ships empty, with a friendly line. |
| A3 | Open a merch store with the Shopify connector? | Not until you say yes. |
| A4 | Founding-advertiser discount? | List prices from VISION 6.2, with "founding advertiser" shown as a badge, not a discount. |
| A5 | Privacy-friendly view counter so advertisers see real numbers? | Off. When it is off, ads never show a count. |
