# REGINA LIFE — assessment & plan

## 1. Assessment of the existing repository

The repository (`Hay-Jay/Hay-Jay`) is a GitHub **profile repo**. At the start of this work it contained only:

| Path | What it is |
| --- | --- |
| `README.md` | profile blurb |
| `life-os-assets/app-v2.js`, `lifeos-build/*.b64` | a "Life OS 2.0" dashboard bundle (unrelated to Regina) |
| `monochrome-preview/mobile-safe-v9.html` | a "MONOCHROME®" mobile mock-up page |

**There was no Regina Life game, engine, assets, build, or deployment to continue** — nothing in any branch or in
history references Regina or a game. Those files were left untouched. Since the brief asked for code rather than
questions, Milestone 1 was built as a new project in `regina-life/` using the web stack the brief implies
(browser, mobile + desktop, multiplayer-capable): **Vite + Three.js**. If a separate private repo holds the earlier
game, point me at it and the modules here (rules, phone, character, interiors) can be ported or merged.

## 2. Known gaps / bugs / honest limitations (after Milestone 1)

**Not built yet (by design — see roadmap)**: vehicles/driving/traffic, public transit, ride-hailing, other careers,
player businesses, stocks/investments, real estate, multiplayer, accounts, server, social app, food delivery,
marketplace, police/EMS, seasonal festivals, voice calls, running for office yourself, real-player friends, 3D versions of the destination cities.

**Technical debt / risks**
* **Single-player economy is client-side.** The ledger is server-portable but currently runs in the browser; local
  storage can be edited. Server authority is Milestone 4's first task.
* Only ~1.6 km downtown/Wascana is detailed; other neighbourhoods are houses-on-a-grid massing with real positions.
  Streets there are stylised, not traced from OpenStreetMap yet.
* Characters are procedural primitives (smooth, articulated, customisable) — not skinned/rigged glTF. A glTF pipeline
  with LODs is the long-term upgrade path (`buildCharacter()` is the only integration point).
* Pedestrians walk fixed sidewalk loops; no traffic yet, so crossing streets is safe.
* Interiors are separate rooms (fade transition), not seamless streaming; only 3 exist.
* Facade/window textures tile; buildings are boxes with trim. No LOD meshes yet (chunk culling + fog only).
* Weather uses Open-Meteo directly from the browser (no key). A server proxy/cache is planned.
* Performance was verified with software WebGL only (≈1M triangles / ~700 draw calls near spawn at "high");
  real-device profiling is needed. Adaptive quality exists but thresholds are untuned.
* Accessibility: keyboard + touch work; screen-reader semantics, remappable keys and colour-blind-safe UI still to do.

## 3. Roadmap

| # | Milestone | Highlights |
| --- | --- | --- |
| **1** ✅ | Vertical slice | city slice, character, camera, phone (12 apps), 3 interiors, jobs, needs, time/weather, map, mobile |
| **3** ✅ | Social life, politics & home | friends by @username (NPC), dating, mayor elections with real policy effects, City Hall, intercity trips + souvenirs, generative radio, furniture build mode + paint |
| **2** ✅ | City hub & Sims-style life | overhead home screen with pins + news ticker, life events with choices, hygiene/fun needs, skills, activities, gym, Life/News/Ads apps, 12 billboards |
| 2 | Wheels & world | drivable cars (dealership, insurance, fuel, repair, garage), traffic + signals obeying, bus network with real route data, Ride app (NPC drivers), bikes, more districts via OSM import (roads, footprints, parks), LOD + streaming |
| 3 | Living economy | supply/demand market sim, grocery/electronics/furniture/car shops, more jobs (delivery, rideshare, office, trades), rent/bills/mortgage/insurance/tax, stocks & fictional companies, real estate, furniture editing |
| 4 | Backend & accounts | Node/Postgres (or Cloudflare D1/Durable Objects) authoritative ledger + inventory, auth, persistent characters, anti-cheat, rate limits, audit log, weather proxy |
| 5 | Multiplayer | presence & shared spaces, friends, DMs, trading, reporting/blocking/moderation tooling, player-to-player hiring with contracts & reputation |
| 6 | Player businesses & ads | storefronts, inventory/pricing/employees, billboard marketplace (virtual currency only; real-money path stays disabled behind legal/moderation gates) |
| 7 | Life depth | education, fitness, relationships, achievements, daily challenges, city events/festivals, emergency services sim, photography challenges |
| 8 | Polish & scale | glTF characters + animation retargeting, audio, accessibility, localisation, performance budgets per device class, analytics (opt-in) |

## 4. Monetisation guardrails (no implementation yet)
Real-money purchases stay **disabled** until legal terms, moderation and payment infrastructure exist. No pay-to-win;
all premium items cosmetic or convenience-only and clearly labelled; all gameplay currency earnable for free; no
auto-charging; confirmation on every purchase; parental/age gating before any payment UI ships.

## 5. Sources & licences
No third-party assets. Map coordinates are approximate public lat/lon values. Weather: Open-Meteo (free, no key,
CC BY 4.0 attribution shown in Settings → About). Street names in the downtown grid are stylised.

## 6. Design notes from city-life web games
A review of an existing city-life web game (a Lagos-themed one) showed what makes the genre sticky, and these ideas
shaped Milestone 2: an overhead *home map* with emoji pins as the front door; a strong **local voice** (slang, humour, specific
places); frequent **short scenario events with choices**; **billboards** as a visible, purchasable part of the world;
and a visible **news/ticker** that makes the city feel alive. Nothing is copied — all text, art, names and mechanics here
are original and Regina-specific. Milestone 3 borrowed the rest in spirit: friends via @usernames (NPC for now), radio, intercity travel and elections.

## 7. Review log — milestone 3 adversarial review
Seven independent reviewers (rules, economy, build mode, UI, audio, integration, saves) examined the milestone; skeptics then tried
to refute every high/medium finding. 21 of 24 verified findings survived and were fixed, with regression tests in `tests/review.test.js`:
* **Events are single-use tokens** — only events the game issued can be resolved, once (closed a console-level infinite-reward replay).
* **Furniture can't soft-lock you** — placements are rejected if they cut off any fixture (flood-fill with the player's real radius);
  legacy sealed apartments self-repair on entry. Kitchen keep-out zone corrected.
* **Saves are sanitised on load** — unknown furniture/friends/policies are dropped, numbers clamped, collision boxes bounded
  (a crafted coordinate used to freeze the tab). Old milestone-1/2 saves load cleanly.
* **Prices shown = prices charged** — shops, jobs and the Ads app now use the mayor-adjusted amounts from the rules.
* Prototype-key lookups (`constructor`, `__proto__`) can no longer bypass validation; residents are only reachable once befriended;
  campaigning is a cooldown-limited, energy-costing rule; one dating threshold everywhere.
* Build mode: Esc/typing no longer exit or edit the room; right-click stores one piece; forgiving tap targets; camera fits the room above the build bar.
* UI: scroll position survives refreshes, no taps eaten by background updates, toasts and panels render above the phone, vote needs confirmation.
* Audio: iOS `interrupted` resume, no catch-up note bursts after stalls, looping vinyl hiss, first spoken headline inside the click.

Still open (reported by the completeness critic, not yet reviewed in depth): money-path rounding audit across every new flow; election
lifecycle over long absences/clock changes; multi-tab save overwrites; screen-reader/keyboard coverage and 44 px touch targets for the new UI;
a few low-severity items (talk-station volume is fixed per utterance; Town Hall copy tweaks).
