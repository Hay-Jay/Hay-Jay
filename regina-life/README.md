# REGINA LIFE

A browser-based open-world life simulation set in **Regina, Saskatchewan** — live, work, shop, travel and build a life
in a stylised 3D city that follows the **real Regina clock, sun and weather**.

> **Status: Milestone 4 in progress ("Home first")** on top of Milestones 1–3. See [`docs/VISION.md`](docs/VISION.md) for where the game is heading and [`docs/PLAN.md`](docs/PLAN.md) for the original roadmap.

## Run it

```bash
cd regina-life
npm install
npm run dev        # http://localhost:5173  (also reachable from your phone on the same Wi-Fi)
npm test           # unit tests for the economy, jobs, time/sun, weather, geo
npm run build      # production build → dist/
npm run smoke      # end-to-end test in headless Chromium (needs a built Chromium; see scripts/smoke.mjs)
```

Stack: **Vite + Three.js**, vanilla ES modules, no framework. Everything (textures, geometry, characters, sounds) is
generated procedurally — no third-party art assets, so there are no asset licences to track.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move / run | `WASD` or arrows / `Shift` | left joystick (push to the edge or tap **Run**) |
| Look / zoom | drag / wheel | drag right side / pinch |
| Interact | `E` (or click the prompt) | big **E** button |
| Phone · Map · Outfit · Photo mode | `P` · `M` · `C` · `V` | HUD buttons |

## What's in Milestone 1

* **City** — a ~1.6 km stylised downtown + Wascana Centre corridor (grid, signals, crosswalks, lamps, parked cars, park,
  lake, Albert St Memorial Bridge, Legislative Building) and **massing for 9 more neighbourhoods placed from real
  latitude/longitude** (Cathedral, North Central, Rochdale, Mosaic Stadium, East, South, U of R, Harbour Landing, Airport).
  Geometry is merged per 320 m chunk and material, chunk-culled by distance, with instanced props and adaptive quality.
* **Character** — articulated procedural humanoid: face shapes, skin tones, hair styles/colours, facial hair, expressions
  with blinking, body builds, height, clothing/footwear/headwear/eyewear/scarves, layered idle/walk/run/sit/carry/wave
  animation blending. **No numbers or logos on clothing.** Creator, wardrobe, clothing store with try-on.
* **Camera** — damped third-person orbit, over-the-shoulder offset, occlusion avoidance, speed FOV, auto-recentre,
  touch gestures, selfie and photo modes.
* **Phone** — iPhone-inspired (original icons/branding): lock screen, home screen with live widgets, app-open
  transitions, notification centre, control centre, banners, incoming/outgoing calls, 12 working apps:
  Messages, Phone, Contacts, Maps, Bank, Jobs, Camera, Photos, Weather, Calendar, Inventory, Settings.
* **Enterable buildings** — *Prairie Corner Market* (shop + job), *Prairie Threads* (clothing + job),
  *Wheat City Lofts Unit 204* (your home: bed, TV, sofa, kitchen, fridge, computer, wardrobe, light switch).
* **Life systems** — energy/hunger/mood, groceries, cooking, jobs with real shift tasks, wages, XP and promotions.
* **Real time & weather** — `America/Regina` clock, computed sunrise/sunset, day/night, stars, moon, seasons, rain/snow.
  Live weather from Open-Meteo; if unreachable the game uses a **clearly labelled "SIMULATED"** fallback.
* **Map** — minimap, full-city map with pan/zoom, emoji place badges that cluster when crowded (tap to zoom in), collision-free labels, POI selection, navigation beacon, and a Quick Cab fast-travel stand-in.

## What's new in Milestone 2

* **Home screen** — a tilted overhead city view with tappable emoji pins (pick where your life starts), a live news
  ticker, weather chip, and a *Downtown ⇄ All Regina* zoom. Pins marked with a green dot are enterable now.
* **Life events** — short Prairie scenarios with choices (stuck in a snowbank, Rider Pride, refund-without-receipt on shift,
  wind-chill warnings…). Choices cost money/energy, grow skills, and are validated by the rules engine.
* **Sims-style systems** — five needs (energy, hunger, hygiene, fun, mood), skills (Cooking, Fitness, Charisma) with
  levels and real effects, activities with progress bars (shower, TV, reading, treadmill, weights, yoga), a **Life** app
  with mood and milestones, and a ▶/⏩ time-speed button.
* **Prairie Fitness** — a new enterable gym (treadmills, weights, yoga mat, water cooler).
* **Billboards & Ads app** — 12 billboards across the city. Book one for 1/3/7 days with your own text and colours, paid
  in Prairie Dollars only, with text moderation and *simulated* reach numbers. Unbooked boards read "YOUR AD HERE".
* **Prairie News app** — real weather/sunrise/sunset plus fictional seasonal headlines and personal updates.
* Fixed: the lake wasn't rendering (face culled) and roads could vanish at low camera angles.

## What's new in Milestone 3

* **Friends by @username** — 12 Regina residents with handles, bios and likes. Search `@tobi.rgn`, add them, text them, hang out
  (coffee, walks, gym, movies), give gifts, and watch the friendship grow (and fade if ignored). Everyone is clearly labelled an
  **NPC resident**; real player friends use the same lookup once multiplayer exists.
* **Relationships** — ask a datable friend on a date at Good-friend level, take them to dinner, or break up (it hurts).
* **Mayor elections (fictional)** — 3-day terms with a 3-candidate slate. Vote once, donate or hand out flyers at the new
  enterable **Regina City Hall**; the simulated result installs a policy that really changes prices and pay
  (cheaper groceries/clothing/billboards, +10% wages, faster fitness gains).
* **Intercity travel** — Moose Jaw, Saskatoon, Winnipeg, Calgary, Banff, Vancouver by coach or flight: fare + energy cost, a
  scenario with choices, and a souvenir **poster** you can hang at home.
* **Radio** — four stations in the phone and on the apartment stereo: lo-fi, country and jazz are *generated live* with WebAudio
  (no audio files or licences); *Prairie Talk* reads the news aloud. Listening raises Fun.
* **Build mode** — buy furniture from the computer, then Redecorate from an overhead view: place, move, rotate, store,
  sell; repaint walls and change flooring. All placements are validated (room bounds, fixtures, overlaps, limits).

## What's new in Milestone 4 (so far)

* **App shell** — one status pill (clock, mood, money count-up, daily-reward "+") and a four-tab bar: **Home · Buy · Map · Phone**.
* **Home first** — the game opens on a bright cut-away dollhouse of your apartment on a lawn; walk around it, tap **Edit room**.
* **Catalogue (Buy tab)** — a bottom sheet with ~70 original pieces in 10 shelves (Sleep, Kitchen, Bath, Comfort, Fun, Skills, Light, …),
  1–4★ quality tiers, size tags, 3D thumbnails, a **60% sell-back**, an **In storage** shelf (pieces you own but haven't placed) and a
  **Design** shelf for paint and floors. Prices are realistic Canadian retail; every purchase and placement is validated in `core/home.js`.
* **Furniture matters at home** — beds improve sleep, sofas slow tiredness, TVs/games slow boredom, plants/lamps lift mood, and training gear
  (treadmill, weights, yoga mat, piano, easel, consoles) becomes usable in your own place. Bonuses are capped (`HOME_CAPS`), so they help but never trivialise needs.
* **Map tab** — a dense bright overview with tidy pins, place cards (what to do, how to get there, cab fare) and a **Billboards** mode.
* **Billboards** — three tiers with sponsor rotation, picture uploads, and 7-day bookings; see [`docs/ECONOMY.md`](docs/ECONOMY.md) for prices, tiers and the intended real-money scale.
* **Multi-room homes** — move up from the Studio to a **One-bedroom** ($1,500) and a **Bungalow** ($5,000 total: bathroom, den, garage with a car and a Storage shelf, and a fenced yard) from the phone's **Homes** app. Nothing you own is ever lost: pieces that still fit stay where they are, the rest wait in storage. Each room has its own paint and floor (Design shelf room chips); build mode shows a cutaway with a Walls button and a room focus strip so decorating works on a phone. Rules are server-portable (`core/lot.js`, `core/move.js`); design and decisions in [`docs/HOMES.md`](docs/HOMES.md). No rent yet.
* **Compact island Regina** — neighbourhoods ring downtown, green belts between, beach and sea around. Everything is original, fictional and offline-first.

## What's new in Milestone 6: "make it amazing" (in progress)

The plan, the research behind it and the money tracks are in [`docs/AMAZING.md`](docs/AMAZING.md).

* **A bright city** — the sky now goes through tone mapping and colour space (night is dusk-blue, never black), light roads and sidewalks,
  sky-blue glass, toy-town roofs, boulevard elms, soft shadows and anti-aliasing on phones. Street brightness roughly doubled.
* **A living dollhouse** — New life and Continue start at Home, in a 3/4 view you can turn and zoom, with real day and night inside. Tap a piece
  of furniture and you walk over and use it; the prompt floats over the object.
* **Every action answers back** — floating "+22 Fun" and "+$66", coins flying into your wallet, chimes, confetti for firsts, material thuds
  when furniture lands, readable need bars, and a "why you feel this way" list behind the mood pill.
* **First day in Regina** — a six-step card (gift, place a piece, eat, visit, get a job, first shift) with small rewards, then **Today in Regina**:
  three small tasks a day. No random events for a new player's first 10 minutes, then at most one every 5 minutes (or none in Quiet mode).
* **Ways to earn** — the **Odd Jobs** app: snow shovelling when it really snows, raking in autumn, grocery runs with a tip, dog walks (with a pup),
  flyers and busking on Scarth Street. Payday now feels like payday. The **daily gift** is seven stamps that never reset. Sell paintings
  and baked goods at the **Farmers' Market stall** (Wednesdays and Saturdays, 9 to 1, Regina time), and take a **lodger** once you own the Bungalow.
* **Regina** — **Victoria Park** on its real block (paths, fountain, elms, benches you can use), a **Pumpkin Walk** hunt on 29–31 October,
  residents with routines ("Here now" on place cards), real winter (snow cover that follows the weather, a frozen Wascana, breath in the cold),
  a soundscape that follows the real wind, and a **Goodnight** card with tomorrow's forecast. At -5° or colder you **bundle up** outdoors in the
  warmest things you own (your saved outfit stays as you picked it; switch it off in Settings). Photos save as **postcards** stamped with the date
  and the real weather.
* **Supporting the game** — an [Advertise page](advertise.html) where a real Regina business can preview its ad on an in-game billboard
  (founding prices, ad rules, booking through the owner), labelled **Sponsored** billboard rows with a leaving-the-game screen, and a
  **Supporters' Mural** in Victoria Park. Real money never enters the game or buys anything in it.

### Owner: adding a sponsor or a supporter

No payment code runs in the game. After an advertiser pays you (invoice or payment link) and you have reviewed the ad, add a row to `SPONSORED`
in [`src/data/sponsors.js`](src/data/sponsors.js) (board id, business, a line of up to 40 characters, an https link, a theme, `from` and `to`
Regina dates) and push to `main`: it goes live on the next deploy and comes off by itself after `to`. Supporters who want their name on the mural
go in `SUPPORTERS`. Set `CONTACT_URL` (how advertisers reach you) and `SUPPORT_URL` (your support page) to turn on those buttons; until then the
pages say "opens soon". Rows are validated (`core/sponsors.js`, tested): a bad row is skipped, never shown.

## What's new in Milestone 7: "more amazing"

* **Your body does the thing** — reading on a Victoria Park bench (they face the fountain now), running on the treadmill deck, cycling, a balance
  pose on the yoga mat, washing your hair in the shower, strumming on Scarth Street, shovelling, raking, painting at the easel, handing out flyers,
  eating and stirring the pot, with small props. You hold your phone while it is open, walk the dog on a leash, open an umbrella in the rain and
  dance when the radio is on at home. Paydays and big moments get a cheer ([`src/player/poses.js`](src/player/poses.js), tested).
* **Home lots on the map** — the One-bedroom is **Cathedral Court**, a walk-up with its own front door at the west edge of downtown. Homes you could
  move up to get **For Sale** signs (press E to see one in the Homes app). The map's home pin follows wherever you live, the Map tab has a
  **Homes** view with prices, and the phone map shows every home ([`src/core/homeLots.js`](src/core/homeLots.js), tested).
* **Wardrobe** — puffer parkas with fur hoods, flannel overshirts, a green sweater, skirts, overalls, pac boots, a beanie, a trapper hat, a bucket
  hat, a gold scarf, and four new hairstyles (bob, waves, ponytail, space buns). Bundle up and the pedestrians use the new winter gear.
* **A creator studio** — the character creator opens on a bright photo set at any hour, not a dark street.
* **A city that lives** — residents doing things where you can see them, by the real hour, season and weather: a busker on Scarth Street, a reader
  and a painter in Victoria Park, a neighbour shovelling after a snowfall or raking in the fall, someone on the phone by the Market (labelled NPCs:
  say hi). Pedestrians open umbrellas in the rain and a couple of joggers do laps ([`src/core/vignettes.js`](src/core/vignettes.js), tested).
* **Photo-mode poses** — wave, cheer, dance, read, play guitar, check your phone or hold an umbrella for the shot.

## Economy & anti-exploit (important)

Money only moves through `src/core/ledger.js`: integer cents, positive/limited amounts, no overdrafts, idempotency keys,
rate limiting. Prices come from the catalog (never from the UI), and shift pay requires every task done **and** a
minimum elapsed time. The ledger is dependency-free so the *same file* can run on an authoritative server.
**Until the backend milestone this still runs in the browser, so a determined player can edit local storage — Milestone 1
is single-player.** Prairie Dollars are fictional; no real money is processed anywhere.

## Layout

```
src/core     pure game rules (ledger, store, jobs/shopping/needs, time+sun, weather) — unit tested, server-portable
src/data     catalogs: items & clothing, jobs, NPC contacts
src/world    city generation, landmarks, interiors, sky/weather rendering, pedestrians, collision
src/player   character rig, controller, camera, input
src/ui       phone, apps, panels (shops/creator), map, audio, icons
tests        vitest   ·   scripts/smoke.mjs   Playwright end-to-end
```

## Publishing as a website

`.github/workflows/deploy-regina-life.yml` builds and deploys the game to **GitHub Pages** on every push to `main`
(it runs the tests first). One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The site then lives at `https://<your-username>.github.io/Hay-Jay/`. The build uses relative paths, so it also works on
any static host (Netlify, Cloudflare Pages, Vercel): build command `npm run build`, publish directory `dist`.
