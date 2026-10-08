# REGINA LIFE

A browser-based open-world life simulation set in **Regina, Saskatchewan** — live, work, shop, travel and build a life
in a stylised 3D city that follows the **real Regina clock, sun and weather**.

> **Status: Milestone 3 ("Social life, politics & home")** on top of Milestones 1–2. See [`docs/PLAN.md`](docs/PLAN.md) for the roadmap.

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
* **Map** — minimap, full-city map with pan/zoom, POI selection, navigation beacon, and a Quick Cab fast-travel stand-in.

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
