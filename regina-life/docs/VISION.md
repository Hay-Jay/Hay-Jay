# REGINA LIFE: Vision and roadmap (M5 to M9)

> Written 2026-10-09 for the owner. A proposal to approve or change. It replaces the roadmap table in `docs/PLAN.md` section 3 from M5 onward (that table is stale: it numbers two milestones "2" and "3").
>
> **Evidence order.** (1) The owner's six photos of the logged-in Lagos Life, `.scratch/research/owner-screenshots.md` (cited below as P1 to P6), are authoritative. (2) Logged-out Lagos research, `lagos-ads.md`. (3) Sims 4 research, `sims.md`. (4) Repo audit, `audit.md` (written while M4 was half built; re-checked against `src/`). **Prices** come only from `docs/ECONOMY.md` and the data files it names (`src/data/billboards.js`, `packs.js`, `economy.js`).
>
> **Notation.** P$ = Prairie Dollars (fictional in-game money; the UI still shows a bare `$` until M7). CA$ = real Canadian dollars. Effort: S = 1-2 days, M = 3-5 days, L = 1-2 weeks, XL = 3+ weeks, for one engineer. Legal, tax and privacy statements are a product checklist, **not legal advice**; every such row needs the owner's own lawyer or accountant before real money or accounts go live.

---

## 1. Vision

Regina Life is a free-to-play browser life sim that opens inside your own home, a cut-away toy house you furnish and rearrange like a Sims lot, and steps out into a bright, dense, animated diorama of Regina where every place card offers things you can actually do, billboards and a quilt of prairie-field plots carry real local businesses' pictures, neighbours' homes can be visited, and a weekly council election changes the city. Everything you earn and spend is fictional Prairie Dollars, validated by a server ledger; you can top them up with small, capped real-money packs that never buy an advantage (everything P$ buys can be earned for free), while the game's real revenue is sponsored billboards and quilt patches bought by people and companies at CA$25 to CA$100 a week. The content is original and Regina-specific (seasons and wind chill from the real weather, "Queen City" voice, wheat and canola fields, grain elevators, Wascana Lake), honest about who is a person and who is an NPC, and wrapped in a website polished enough to be the first impression: a fast animated landing page, a title screen that is the living diorama, a phone that feels like a phone, and a loading screen that is already part of the show.

**Non-negotiables** (from the original brief; every milestone is tested against them):

1. Fictional currency only. P$ cannot be withdrawn, traded between players, or sold.
2. Server-validated economy before any real money moves. No packs, no paid ads, until M8's gates are green.
3. No pay-to-win. Packs add P$ and nothing else; no exclusive items, XP, skills or wages; no paid randomness; never any paid votes.
4. No fake players, fake advertisers, fake counters or fake testimonials. NPCs are tagged "NPC". Unsold boards say "Your ad here". Online counts appear only when real.
5. Original content only: no Lagos Life or Sims names, art, text, UI layouts or code. We copy concepts (a home front door, a diorama map, billboards, plots), not expression.

---

## 2. What Lagos Life does, what the Sims does, what we have

| Area | Lagos Life, logged in (owner photos) | The Sims 4 (2026) | Regina Life now (M4) | Our call |
| --- | --- | --- | --- | --- |
| Front door | Opens on **Home**: cut-away isometric house on a round lawn, characters inside, a dog, garage with "+7 in storage" (P2) | The household and lot are the world | Home tab and dollhouse exist; Continue still drops you on a street | Boot into Home. **M5** |
| Editing the home | Multi-room house, floor grid, top-down edit mode (P2, P3) | Free walls, rooms, roofs, foundations, stairs, undo and redo, cutaway camera | One 8 x 10 m studio, fixtures locked, no undo, 24-piece cap | Fixed-shell homes in 3 tiers with extension slots, undo, cutaway, storage. Free-wall builder deferred. **M5** |
| Buy catalogue | Bottom sheet, category pills, 3-column cards with size tag, 1-4 stars, 3D thumbnail; sell-back 60%; "Big Man prices x50" wealth rule (P3) | Browse by function or by room, swatches, styled rooms | 60-item catalogue and sheet being built by other agents (M4) | Add size, stars, thumbnails, swatches, mount rules. Keep sell-back 50% (full refund while still editing). No wealth multiplier; rent and bills are the sinks. **M5** |
| Map | Dense bright low-poly diorama: airport with moving planes, container yard, parks, stadium, "Coming soon" refinery, ground labels, chips, city tabs, "Go to work" and transport chip (P1, P6) | Small themed worlds; one active lot at a time | Tilted street city seen from above: dark boxes, 19 pins, empty ground | A dedicated compact diorama with 70+ places. **M6** |
| Place card | Tagline, share link, activity chips (some mischievous), "Here now", "Player shops", transport picker with fares and surge (P5) | Lots and venues | Card with chips that do nothing, plus Walk or Cab | Only working activities, labelled NPC "here now", Walk / Bus / Cab / Drive with weather surge. **M6** (real "here now" in M9) |
| Billboards | About 62 boards stand in the world; any real image plus link; rotation up to 43 ads; flat NGN 250,000 (about US$175) per 7 days; collage wall; sponsored phone apps (P1, P4; research) | None | 12 boards, text only, saved per player so nobody else sees them | 36 boards in 3 tiers, rotation capped 4/3/2 (ECONOMY). Scenery **M6**, booking UI **M7**, founding advertisers **M7** (manual), self-serve **M9** |
| Land plots | "Sea Plots": tile grid on the water, NGN 500 a tile, rectangles up to 12 x 12, image + link + title; a grid of 400 player homes (P1; research) | Lots 15x10 to 64x64, lot traits | None | **Quilt plots** (ad tiles on a patchwork of prairie fields) plus home lots. UI **M7**, uploads **M9** |
| Real money to game money | Green "+" in the top pill (P1); packs not visible; Flutterwave | Marketplace "Moola" bundles, controversial | Wallet stub; packs are disabled data | 5 capped packs, adults only, after M8 and the legal gate |
| Elections | Weekly governor, free open ballot (5,926 candidates, 81% with zero votes), policy banner | Eco "action plan" ballots paid in influence points | 3-day single-player mayor simulation | Weekly council: deposit, one vote per account, slogan filter. Deterministic shared sim **M6**, real votes **M8** |
| Chat, presence, visiting | "68k online", "Here now", Neighbours, knock / watch TV / share food / cards (P1, P5; research) | No live multiplayer; async Gallery | NPC keyword bot only | Fake nothing. NPC drop-by visits **M6**; real chat and visits **M9** |
| Phone | Full-screen phone, about 24 glossy apps, badges, real brands as sponsored apps (P4) | n/a | 12 apps in a right-docked iPhone-like device | Redesign with working apps only and one labelled sponsored slot. **M7** |
| Daily loops | Daily reward (day 1 of 3 shown), community "gem hunt" with milestone prizes (P2) | Weekly live events with quests | 7-day daily reward | Add a local daily find and date-driven events **M7**; a community counter only once a server exists **M9** |
| Needs and mood | Avatar with four need bars; mood word in the top pill (P1) | Eight needs, moodlets, emotions | Five needs and a mood chip | Keep. Emotion engine is backlog |
| Trust and legal | 18+ gate, cookie banner, "Official" accounts sheet, 3 legal pages, link-out interstitial | EA terms | None | Draft pages **M7**, reviewed and final **M8** |
| Website | The map is the marketing page | EA site | One page, two competing design systems | Landing, Advertise, legal pages and game as separate fast pages. **M7** |

**What the logged-in photos correct in the logged-out notes** (trust the photos): (1) the logged-in game opens on Home, not the map; (2) a home editor and a priced catalogue with stars and sell-back exist; (3) there is a daily reward and a community collectible with prizes; (4) advertisers also appear as **phone apps**, a third ad surface beside boards and plots; (5) place cards carry real activities and a transport picker with surge pricing; (6) there are several cities as tabs.

**What we borrow from the Sims** (mechanics, never names or UI): undo and redo that survives the edit session, a cutaway camera (walls up, cutaway, walls down), pre-furnished "starter room" kits, per-part colour swatches, a friendly full refund while you are still editing, weekly bills with a grace period, date-driven live events, and the lesson from its Marketplace backlash: keep everything earnable for free.

---

## 3. Design direction (the remaining visual spec)

The M4 shell (`src/theme.css`, `src/ui/shell.js`) is the right start: light pills, springy tab bar, count-up money. What is left is finishing it everywhere and making the world match.

### 3.1 Principles

1. **Bright by default.** Night is dusk-blue with lit windows, never black. Test: mean luminance of the overview screenshot is at least 0.45 (0 to 1) at every hour.
2. **One design system.** `src/design/tokens.css` is the only source of colour, type, radius, shadow and motion tokens. The dark glass-and-gold skin in `src/style.css` is deleted component by component; M7 is done when nothing references it.
3. **Density beats distance.** A compact diorama; every screen has something to look at, tap or read.
4. **Every control works.** No pin, chip, app or button ships unless it does something. Unbuilt ideas appear only as in-world "Soon" ribbons (like Lagos' construction-tape sites), never as dead menu items. (The audit found place cards advertising "Feed the ducks" with no code behind it.)
5. **Honest by label.** NPC tags, "House ad" and "Sponsored" tags, P$ and CA$ never share a glyph, no padded counters.
6. **Motion explains change.** At most 480 ms, interruptible, and `prefers-reduced-motion` respected (already true in `theme.css`; keep it).

### 3.2 Colour tokens

Status "exists" means already in `src/theme.css`. Contrast ratios were computed with the WCAG formula; `tests/contrast.test.js` (new, M5 week 0) recomputes every listed pair so they cannot drift.

| Token | Hex | Use | Status |
| --- | --- | --- | --- |
| `--c-ink` | `#12202a` | Primary text, active tab fill | exists |
| `--c-ink-2` | `#44545f` | Secondary text | exists |
| `--c-ink-3` | `#5f6e78` | Tertiary text and icons | **change** from `#74838d` (3.9:1, fails AA) to about 5.3:1 on white |
| `--paper`, `--cream` | `#ffffff`, `#fffaf0` | Cards, sheets | exists |
| `--pill` | `rgba(255,255,255,.94)` + blur 14px | Top bar, nav, chips, toasts | exists |
| `--leaf` | `#22b573` | Decorative fills, bars, graphics only (never small text) | exists |
| `--leaf-btn-a`, `--leaf-btn-b` | `#12804f`, `#0e6d43` | Primary button gradient (white 16px bold text, about 5:1 or better) | **new** (old `#31d68e` to `#168f59` fails AA for white text) |
| `--leaf-text` | `#0f7a4a` | Green text on white ("Very Happy", "Open now") | **new**, about 5.4:1 |
| `--leaf-l` | `#e2f7ec` | Green tint backgrounds | exists |
| `--wheat`, `--wheat-d` | `#ffc83d`, `#f2a900` | Stars, NEW chips, reward ready, "Soon" ribbons | exists |
| `--coral` | `#ff6b5e` | Badges, live-event dot, danger (text on coral is ink) | exists |
| `--plum` | `#7a5af8` | Player and community content (shops, community boards) | exists |
| `--info` | `#4da3ff` | Focus ring, "you are here" pin | **new** (was inline) |
| `--sky`, `--sky-2` | `#bfe3f5`, `#8fcdea` | Home backdrop, `theme-color` meta (replace `#0b1020`) | exists |
| `--ad-frame` | `#1a2430` | Billboard and sponsored-card frame, 6 px | **new** |

World palette (used by the diorama kit; `src/design/world-palette.js`, all hex):

| Group | Values |
| --- | --- |
| Ground | lawn `#a8dc8c`, field `#8fd17a`, park highlight `#c6ec9f`, canola `#ffd83d`, wheat `#ecc86a`, stubble `#cfae6f`, fallow `#d9b98a` |
| Water | lake `#6ec6e8`, deep `#43a8d8`, shore sand `#f4e6b8`, winter ice `#dff3fb` |
| Streets | asphalt `#66727e`, kerb `#4d5863`, lane `#fff1b8`, crosswalk `#ffffff`, sidewalk `#ebe6db`, rail `#8a7a6a` |
| Snow skin | ground `#f4f8fb`, shade `#cfe0ee`, pine `#cfe3d6` |
| Buildings (wall / roof), pick 1 of 8 per building | brick `#e07a5a / #b84f3a`, wheat `#f5c860 / #d89a35`, sky `#7bb8ec / #4a8fd0`, sage `#97d0ac / #5fa57f`, plum `#b296ee / #7a5af8`, cream `#f6eddb / #d3c29b`, coral `#ff9285 / #e65f50`, slate `#8da0b4 / #5d7288` |
| Landmarks | Legislative copper dome `#7ccfa8` on stone `#efe4cf`; stadium bowl `#1fa564` with white; grain elevator `#f2ead8` with roof `#d86a4a` |
| Trees | summer `#46b06a / #2f8f52`, autumn `#f0a63a / #d9692f`, trunk `#8a5a3b` |
| Sky | day `#8fd0f5` to `#e6f6ff`; golden hour `#ffb68a` to `#ffe5b4`; dusk `#6b7fd0` to `#f2a6c0` (never darker) |

### 3.3 Type

Keep Fredoka (display, numbers) and Plus Jakarta Sans (body). **Self-host both** as Latin-subset variable WOFF2 (Fredoka 500-600, Jakarta 400-800; both SIL OFL), preload them, `font-display: swap`; budget 60 KB total. This removes the cross-origin Google Fonts request that leaks visitor IPs (audit 4.8, 6.4).

| Role | Font | Size / line | Weight | Use |
| --- | --- | --- | --- | --- |
| Display | Fredoka | 48 / 52 (landing), 34 / 38 (title) | 600 | Hero, title lockup |
| H2 | Fredoka | 26 / 30 | 600 | Sheet titles |
| H3 | Fredoka | 19 / 24 | 600 | Card titles (`.pc-head h3`) |
| Money | Fredoka, tabular-nums | 15 to 28 | 600 | Balance, prices |
| Body-L | Jakarta | 16 / 24 | 500 | Landing and legal copy |
| Body | Jakarta | 14 / 20 | 500 | Card text |
| Small | Jakarta | 12.5 / 16 | 700 | Chips, tags |
| Micro | Jakarta | 11 / 14 | 700 | Tab labels, badges only. Nothing else below 12.5 |

### 3.4 Shape, elevation, touch

Radii (exist): 12 / 18 / 26 / pill. Primary button 52 px high, pill, `--leaf-btn` gradient, shadow `0 8px 20px rgba(22,143,89,.35)`. Chips are 36 px visually inside a 44 px hit area. Place and category icon tile 46 px, radius 15. Phone app icon 60 px, radius 27%. Bottom sheets: radius 26 on top corners, 36 x 4 px grab handle `#c9d2d8`, width `min(92vw, 460px)`. Billboard frame: 6 px `--ad-frame`, radius 14, tag top-left ("AD" for community and house boards, "SPONSORED" in a `--wheat` chip for paid). Elevation (exist): e1 `0 4px 14px rgba(18,32,42,.14)` chips; e2 `0 12px 34px rgba(18,32,42,.22)` bars and cards; e3 `0 22px 60px rgba(18,32,42,.3)` sheets and the tab bar; all with a 1 px `rgba(18,32,42,.08)` hairline. Every interactive target is at least 44 x 44 px (audit: tabs about 30 px, small buttons 28 px today).

### 3.5 Icons

Replace emoji-as-icons (pins, needs bars, panels, buttons) with one original SVG sprite, `src/ui/icons.svg`: 24 x 24 grid, 2 px stroke, round caps and joins, optional duotone (second path at 18% opacity). Minimum set of 90: tab bar (4), needs (5), pins (about 30: home, market, clothes, gym, city hall, mall, park, stadium, campus, airport, lake, bridge, legislature, cafe, library, rink, clinic, bank, farmers market, garden, church, school, big-box, elevator...), Buy categories (Design, Sleep, Kitchen, Bath, Comfort, Fun, Skills, Light, Decor, Outdoor), transport (walk, bus, cab, car), phone apps (about 24), status (lock, share, report, check, close). Emoji remain only inside user and NPC chat text.

### 3.6 Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `--d-instant` / `--d-fast` / `--d-base` / `--d-slow` / `--d-hero` | 90 / 160 / 280 / 480 / 800 ms | press, hover; chips; sheets and fades; shared-element moves; title and loading reveals |
| `--spring` | `cubic-bezier(.34,1.56,.64,1)` (exists) | entrances, pops |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` (exists) | exits, camera, fades |
| stagger | 30 ms per item, max 8 items | chip rows, app grid, pin pop-in (staggered by distance from screen centre) |

Rules. Entrance: rise 16 px and scale .96 to 1 with `--spring`. Exit: fade and drop 8 px in 160 ms. Press: scale .95. **Tab switches never cut through black** (today's `fadeTo` takes 0.4 to 0.8 s of black): replace with a 220 ms circular wipe that grows from the tapped tab icon, with the destination already rendering underneath. Money: count-up exists; add a **coin fly-up** (6 sprites, 600 ms arc, transform-only) from the source to the top pill on income and purchase, and "+1 Cooking" floaters over the avatar. Need bars bounce on change. Haptics: `navigator.vibrate(8)` on purchase success where supported. Sound: tab tick, coin, error thud (WebAudio, no files), a mute toggle on the top pill (Lagos has one; we currently hide it in Settings).

### 3.7 The dense bright diorama overview (the big one)

**Decision: build a dedicated overview scene; stop lifting the camera over the street city.** The audit and screenshots show the street city from above is dark, sparse boxes, and making it dense would cost as much as a purpose-built diorama that can be ten times denser in a tenth of the area and render far cheaper (no interiors, merged static geometry, LODs). The street-level city stays for walking but is no longer the hub, and gets no new districts before M9. As far as the owner's photos show, Lagos itself is map-and-card driven, not street-walking.

**Files.** `src/world/diorama/` with `layout.js` (hand-authored districts), `kit.js` (prefab builders), `scatter.js` (seeded trees and fields), `ambient.js` (moving things), `boards.js`, `quilt.js`, `season.js`; data in `src/data/diorama.js`. Reuse `src/ui/hub.js` pin engine and `maplayout.js` unchanged (they are tested).

**Layout.** One board of 1,500 x 1,100 units (1 unit is about 1 m at toy scale: car 4.5 units, house 9 x 9, tower up to 60). Twelve districts hand-placed, in **true compass order** (a test checks each district's bearing from downtown is within 25 degrees of the real one using the `LL(lat, lon)` values in `cityData.js`) but with distances compressed so the farthest is under 800 units from downtown. Districts are 220 to 300 units across, separated by street, field or water, never by empty ground (no gap over 80 units).

| District | Character | Landmarks and places (target count of tappable places) |
| --- | --- | --- |
| Downtown | Towers, Scarth Street Mall, patios | Lofts (home), Market, Threads, Fitness, City Hall, Scarth Mall, Victoria Park, cinema, library, cafe, bank, clinic, rink (14) |
| Wascana Centre | Lake, willow island, geese, paddle boats, winter ice | Legislative Building, Albert St bridge, lakeshore trail, fishing pier, bandstand, garden, skating loop, boat rental, photo point (9) |
| Cathedral Village | Heritage houses, cafes | Bakery, bookshop, community hall, heritage walk, farmers market (Saturdays), garden plots, all-ages diner, flower shop (8) |
| North Central | Close-knit blocks, murals | Community centre, corner store, rink, garden, school, laundromat (6) |
| Rochdale / Northwest | Newer suburbs, cul-de-sacs | Park, school, mall strip, playground, trail (5) |
| Stadium and fairgrounds | Bowl, parking lots, tailgate | Stadium (game day), fan plaza, "Summer fair" **Soon** site, parking, shuttle stop (5) |
| East Regina | Fields, grain elevators, canola, railway | Elevator tour, hobby farm day trip, rail crossing, U-pick garden, fuel stop (5) |
| South Regina | Parks, schools, ring-road lights | Park, school, rec centre, library branch, curling club, ice cream stand (6) |
| University | Campus quad, library tower, residences | Library, classes (**Soon**), student union, gym, co-op placement office, bus loop, dorms, lake path (8) |
| Harbour Landing | Big-box strip, big parking, townhouses | Big-box store, garden centre, hardware store, food court, cinema, bus hub (6) |
| Airport | Runway with a landing and takeoff cycle, terminal, tower, hangars | Terminal, trips desk, souvenir shop, viewing deck, car park (5) |
| The Quilt | A patchwork of prairie fields (rectangles of green, canola yellow, wheat, fallow) where advertiser and player picture tiles lie flat | Quilt plots grid (not pins; see 3.9) |

That is about 77 places against 19 today. Activities come from a data-driven engine (milestone M6): each activity is one row `{ id, place, label, kind, cost, needs, skill, seconds, cooldown }` with kinds `work`, `buy`, `use`, `train`, `social`, `explore`, `ride`, so a new place costs data, not code. Places without interiors resolve as short timed actions (progress bar, toast, floater), as the shower and treadmill already do.

**Look.** Flat-shaded, vertex-coloured low-poly. Bevel every box 0.15 unit so edges catch light. Baked ambient occlusion into vertex colours (darken the bottom 15% of walls and the inside corners). Windows are drawn as lighter colour bands, not a dark glass texture (the current tiling facade texture is why the city looks murky). Roof is a distinct colour from the wall (pairs in 3.2). Light rig: hemisphere `#dff1ff` over `#cfe8b8` at 0.9; sun `#fff2d6` at 1.35 from the south-east; only the ground and landmarks cast shadows (one 1,024 map, PCF soft) and everything else gets blob shadows. Night: hemisphere `#5a6fa8` over `#2b3a55` at 0.65, window emissive on, street lamps on. Season skin and weather from the real `America/Regina` date and live weather (`season.js`): spring thaw (puddles, bare trees), summer (canola yellow July), autumn (orange trees, stubble), winter (snow ground `#f4f8fb`, frozen lake with a skating loop, chimney smoke, parked cars with snow caps). A real cold snap switches on the map's red-dot live-event chip.

**Prefab kit** (`kit.js`, all procedural, 3 to 6 colour and size variants each): row house, bungalow, two-storey with porch, low-rise apartment, mid-rise stepped tower, glass-band office tower, warehouse, big-box with car park, church with spire, school (H plan), grain-elevator cluster, stadium bowl, terminal with glass roof, hangar, Legislative Building (dome and wings), bridge with arches, water tower, barn and silo, fuel stop with canopy, shop front with awning. Props: round and conifer trees, shrubs, benches, lamps, hydrants, mailboxes, six car colours, bus, truck, bike, hay bales, picnic tables, fences, snow piles, geese, boats, three plane sizes, a freight train (loco and six coloured cars), and three billboard models. Terrain patches (fields) are instanced noisy quads.

**Painted ground labels.** District names in Fredoka caps, letter-spacing .2em, ink at 30% alpha, as one 2,048 px mipmapped decal texture per district ("WASCANA LAKE", "DOWNTOWN", "RING ROAD", "QUILT PLOTS", "MORE PLOTS" with arrows). Signage doubles as wayfinding, as Lagos does.

**Ambient life** (all instanced, spline paths, seeded so screenshots are reproducible): 40 cars on road loops at 6 to 10 units per second that stop at lights; one bus loop; 10 to 20 pedestrian clusters; geese in V formation at the lake in spring and fall; 2 boats; a plane that takes off or lands every 90 seconds; a freight train every 3 minutes; flags and steam that react to wind; chimney smoke below 0 C.

**Camera.** Pitch 55 degrees, FOV 34 (close), three snap zoom levels (all Regina, district, street) plus free pinch and wheel inside bounds, fly-to in 450 ms `--ease`, edge clamp, double-tap zoom. Title screen: slow orbit (0.02 rad per second, plus or minus 15 degrees). Pin and label level-of-detail follows the zoom level.

**Billboards in the world** (scenery in M6, bookable in M7). 36 boards: 24 standard, 8 big, 4 landmark (the current 12 keep their ids and positions). They stand on legs beside roads and at the airport, stadium and bridge, framed in `--ad-frame` with two wheat-yellow bulbs; landmark boards sit on gantries or rooftops and get an "ON NOW" coral light. Each board rotates its slots every 15 seconds with a 600 ms cross-fade. Unsold slots show a house ad ("Your ad here, see Advertise") that is clearly Regina Life's own, never a fabricated advertiser. Texture budget: at most 8 boards at 1,024 x 512 (the nearest and any selected), all others at 512 x 256, total ad texture memory 24 MB or less (36 full-size textures would be about 75 MB uncompressed and would crash mid phones).

**Acceptance tests** (added to `scripts/smoke.mjs`, run in headless Chromium; software GL is fine for these):
- Close-view screenshot divided into 32 px cells: at least 85% of cells have non-flat content (edge or colour variance above a fixed threshold). Fails on empty ground.
- Mean luminance at 06:00, 12:00, 18:00 and 23:00 simulated: at least 0.45.
- `renderer.info`: at most 350 draw calls and 450k triangles at the default close view on "medium".
- At least 12 pins and 6 billboards on screen; zero pin or label overlaps (the existing `maplayout` assertions).
- Manual device check (signed in the PR): p95 frame time 20 ms or less on a 2021 mid-range Android phone and a 2020 laptop with integrated graphics.

### 3.8 Pins and place cards

**Pin.** 44 px white circle, 2 px hairline ring, 26 px SVG glyph, label capsule beneath (Jakarta 700 12.5 px on `--pill`; shown from district zoom up, or on hover or tap). State markers: green dot (open now), coral dot (live event), wheat construction-tape ribbon (**Soon**), blue pulsing (you). Priority rank decides which show: at most 14 in close view, 10 in far view; extras collapse into numbered clusters (existing `clusterPoints`). Hover lifts 4 px with e2. Tap: camera flies 450 ms, pin pops, card rises. Leader line 1.5 px at 60% alpha when a pin steps aside (exists).

**Place card** (sheet, `.ov-card`). From top: grab handle; header (46 px icon tile, H3 name, 12 px district and distance, state tag); one-line tagline in Regina voice ("Everything's here. Everything. Just ask for the deal."; write ours, never reuse Lagos lines); **Share link** chip (copies `#/map/place/<id>`); **activity chips** (icon + label; only working ones); **Here now** row (NPC residents with a small "NPC" tag; real players from M9 appear without it; empty state says "Quiet right now"); **Player shops** row (hidden until M9, no placeholder); **Transport picker** (radio rows with fare and minutes): Walk (free), Bus (fare from `data/economy.js`, tunable; ECONOMY's reference is a $88 monthly pass), Cab (`cabFare`: $4.50 + $2.50 per km), Drive (free once you own a car; later). Surge lines come from real conditions, for example "Cold snap: cabs cost 30% more" below -25 C wind chill, "Rush hour: buses are packed" on weekdays 7-9 and 16-18 (shown with the multiplier; fares are read by the rules, never by the UI). Primary green **Go** button. Map HUD also carries bottom-left avatar with need bars, bottom-right **Go to work** shortcut (visible when employed and on shift hours) and a "By Bus, P$3.25, change" chip, as in P1.

**Map chips.** Row: live event (coral dot, from weather or the events calendar), Billboards, Neighbours, Quilt, Council, and "Walk Cathedral" style district walks (a guided photo-and-find route, M7+). One city tab only ("Regina"). Do not show disabled city tabs.

### 3.9 Quilt plots (the land product)

A grid east of the city, drawn as a patchwork of prairie fields. Empty tiles are a faint outline over field colours; sold patches show the buyer's picture lying flat with a 1 px frame and a "SPONSORED" or "COMMUNITY" corner tag. Start with 48 x 32 tiles (1,536); expand when 80% sold. Rendering: one `InstancedMesh` for empty-tile outlines plus two 2,048 px texture atlases (16 x 16 cells of 128 px each; a plot's image is re-encoded server-side to its exact size). Tap a patch: card with title (40 characters or less), "Sponsored, host.example", size, "until Thu 22 Oct", **Visit** (goes through the leaving-the-game interstitial). Tap an empty tile: drag-select a rectangle (min 2 x 2, max 8 x 8; overlaps, holds and edges rejected by one pure function `quiltCheck(rect, plots)`). Home lots: a separate "Neighbours" layer shows a grid of small house lots (yours highlighted, NPC residents labelled), no pictures.

### 3.10 Home screen (the hero)

The dollhouse on a round lawn already exists. Remaining: multi-room cut-away (near walls half-height at 0.9 m or hidden, far walls full, per-room floor label on tap), garage or shed with a **Storage** button ("+N items") listing owned-but-unplaced pieces, the player character and a dog (procedural; stretch) standing in rooms, and a left stack of small cards: **Daily reward** (day n of 7, progress bar), **Prairie Find** (a daily hidden-object hunt on the map, local counter with milestone prizes of at most P$25; a community counter only after M9) and a **Clean screen** toggle that hides UI. Same top pill and bottom nav as everywhere. The legacy HUD (minimap, needs card, play and outfit buttons, "E Leave" prompt) is hidden here (it overlaps the room today).

**Buy sheet** (the other agents build the 60-item catalogue; this is the finishing spec): bottom sheet 62vh (minimum 360 px) with a Hide button; category pills (40 px high, scrollable): Design, Sleep, Kitchen, Bath, Comfort, Fun, Skills, Light, Decor, Outdoor; 3-column grid (4 at 520 px and wider); each card shows size tag top-left (1x1, 2x1...), star pips top-right (1 to 4; stars change price, comfort or skill gain, never access), a 3D thumbnail, name and price; "need P$ x more" with a progress sliver instead of a dead disabled button. Thumbnails are rendered once per item offscreen at 160 px into an atlas cached in IndexedDB (rebuilt when the item version changes). Edit mode: floor grid, top-down toggle, floating balance pill, undo and redo, "Done" validates.

### 3.11 Phone

Full screen at 600 px and narrower (safe-area aware, no device chrome). Above that, a centred 392 x 812 device, radius 44, over a scrim `rgba(18,32,42,.45)` with 6 px blur, with a **Close** pill at the top left (replaces the right-docked 344 x 704 phone). Original look: pill notch 110 x 30, status bar (time, signal, battery), lock screen clock in Fredoka 88 px, date line "Thursday 8 October, Regina", wallpaper gradient `#3b5bdb` to `#7a5af8` to `#ff8a5c` with a prairie skyline silhouette (grain elevators, dome, stadium arch, wind turbine) at the bottom; swipe up to the home screen. Home: 4-column grid, icon tile 60 px, radius 27%, two-stop gradient, inner top highlight `inset 0 1px 0 rgba(255,255,255,.5)`, 26 px white glyph, 11 px label, coral badge for unread, wheat "NEW" chip. Dock of four (Messages, Friends, Bank, Maps). **Only working apps appear**: Jobs, Messages, Friends, Bank, Maps, Billboards, Council, News, Rides (bus, cab, fares), Eats (food delivery, a fictional brand name we invent and trademark-check), Houses (home tiers), Boutique (links to Buy), Savings, Courses (skills), Health (needs and fitness), Games, Radio, Photos, Weather, Calendar, Life, Help and guide, Settings, plus one labelled **Sponsored app slot** (house placeholder; a paid product only if the owner chooses, see Q10). "Invite" appears only with accounts (M8).

### 3.12 Loading, title, onboarding

**Loading.** Real progress: the build is split into weighted steps (fonts, kit, district 1..12, billboards, audio) and the bar reports completed weight, not fixed stage names. Buildings pop in with a 30 ms stagger as their step completes, so the loading screen shows the diorama assembling (the Lagos first frame is accidentally an ad pitch; ours is deliberately a reveal). Tips in Regina voice ("A block heater is not optional."). First paint under 1 s: inline critical CSS and an SVG logo, no web-font blocking. Skip button after 4 s on repeat visits.

**Title.** The live diorama behind, slowly orbiting, in the current season and weather. Top: crown-and-wheat lockup "Regina Life" in Fredoka 600, chips for time, weather and season ("Queen City, Thu 8 Oct, 4 degrees"). Bottom card (radius 26): **Play** (primary, 56 px), **Continue** and **New life** when a save exists, a line "12 Regina residents are around (NPCs)" with four avatar faces (never a fake player count), and a footer row: About, Advertise, Terms, Privacy, Disclaimer, Official accounts. The old "pick a pin to start there" is dropped: Home is the front door.

**Onboarding.** Creator (exists) then arrive at Home, where a six-step first-day card pulses the relevant tab: (1) move one piece of furniture in Edit, (2) buy a chair, (3) take a shift at the Market, (4) eat something, (5) open the phone, (6) claim today's reward. Total reward is at most one entry shift (P$66, `ECONOMY.md` 2.1), paid through the ledger with idempotent refs. At most five coach marks, always skippable, never repeated. Empty states become small spot illustrations with one call to action.

### 3.13 The website

Split the single page into fast static pages (Vite multi-page, `base: './'` already works on a project subpath or a custom domain): `/` landing, `/play/` the game (lazy-loads three.js only after Play), `/advertise/`, `/legal/terms`, `/privacy`, `/disclaimer`, `/rules`, `/official`, `/about`. In-game deep links use hash routes (`#/home`, `#/buy/sleep`, `#/map/place/market`, `#/phone/ads`) because GitHub Pages has no SPA fallback.

**Landing page.** Hero: a looping 6-second capture of the real diorama (H.264 and AV1, 1.2 MB or less, poster image first) with the headline, **Play now** and **Advertise here**. Five scroll sections (Home, Buy and build, Map, Phone, Advertise) each with one animation: pinned dollhouse that rotates as you scroll; catalogue cards that fan in; map pins that pop in by district; phone that slides up with apps staggering in; billboard rate card with the three tiers. Scroll animation uses CSS `animation-timeline: view()` with an IntersectionObserver fallback, all disabled under reduced motion. Social row, "Official accounts" sheet, cookie notice that lists everything stored. Targets: Lighthouse mobile performance 90+, accessibility 95+, SEO 95+, LCP 2.5 s or less, CLS under 0.05. Add Open Graph and Twitter tags with a preview image, a favicon set, a web manifest and a service worker for repeat loads. Split the 910 KB single JS chunk: title and shell at 350 KB gzip or less, the diorama and rules lazy-loaded.

### 3.14 Accessibility and responsive rules

Remove `maximum-scale=1,user-scalable=no`; 44 px targets; visible focus ring 3 px `--info` offset 2px; dialogs trap focus with `aria-modal`; toasts in an `aria-live="polite"` region; every pin also exists as a button in a visually hidden list (keyboard and screen reader path for the 3D map); text AA contrast (tested); "Reduce motion" and "Low detail" switches in Settings and on first run if the device is slow; layouts verified at 360 x 640, 390 x 844, 768 x 1024, 1280 x 800 and 1920 x 1080, landscape phones included.

---

## 4. Roadmap M5 to M9

M4 (shell, economy, 60-item catalogue and Buy sheet, billboard tiers and pack data) is done or in flight and is not re-planned. **Order of work: everything that can ship on GitHub Pages now comes first (M5 to M7), then the backend milestones (M8, M9) behind a defined server contract.**

| M | Theme | Where it runs | Effort | Rough calendar (one engineer) |
| --- | --- | --- | --- | --- |
| M5 | Home first: multi-room homes and real build mode | Client only | XL (about 4 weeks) | weeks 1-4 |
| M6 | Living Regina: diorama map, working places, transport, boards as scenery | Client only | XL (about 6 weeks) | weeks 4-10 |
| M7 | Front door and storefront: phone, title, onboarding, landing site, booking and quilt UI, founding-advertiser pilot | Client only (Stripe-hosted payment links for the pilot) | XL (about 5 weeks) | weeks 9-14 |
| M8 | Accounts, server ledger, real elections, money packs | Backend | XL (6 to 8 weeks) | weeks 15-22 |
| M9 | Together and sponsored: chat, visiting homes, uploads, advertiser self-serve, plots | Backend | XL, staged 9a to 9d (about 12 weeks) | weeks 23-35 |

Parallel agents can compress the client-only milestones by roughly a third (estimate). Dates assume nothing about the owner's availability for the decisions in section 7.

**Rule for M5 to M7.** Every feature talks to `GameApi` (section 5.3), not to `store.state` directly. `LocalApi` implements it in the browser using the existing `src/core` rules, so M8 swaps in `RemoteApi` without touching UI code. Shared things (boards, plots, council, homes directory) live in a `world` slice from M6, never in a player's save.

### M5: Home first

**Scope.** Make Home the front door and the build mode a real Sims-style editor on fixed-shell multi-room homes.

**Deliverables**
0. *Foundations (week 0, S to M).* `src/api/contract.js` plus `docs/API.md` (the contract in 5.3) and `LocalApi`; `src/design/tokens.css` with the section 3.2 tokens and the contrast test; the SVG sprite skeleton; `scripts/perf.mjs` reading `renderer.info`. Save `SAVE_VERSION` 2 with a migration and three slices (`account`, `world`, `device`), tested against saved M3 and M4 fixtures so nobody loses furniture or balance.
1. *Boot to Home.* New life, Continue and the title all land in the dollhouse; the legacy HUD is hidden there; checklist card stub (full onboarding in M7).
2. *Lot model.* `src/core/lot.js` with pure `validateLot(lot)`, `applyEdit(lot, edit)`, `sanitizeLot` (reused later by the server), and `src/data/homes.js`. Layouts (single storey, fixed shells, doors and windows swappable, floor and wall per room): **Studio** (today's Unit 204), **One-bed** (2 rooms), **Bungalow** (4 rooms, garage, yard). Two-storey and basement are stretch. Extension slots (sunroom, garage bay) are purchasable additions. Free-form wall drawing (walls, roofs, second floors) is explicitly deferred to a later "Builder pack" (XL), because the owner's photos show fixed shells with a cut-away and a floor grid, not free-form walls.
3. *Fixtures become catalogue items.* Bed, sofa, TV, kitchen, desk, shower, fridge, wardrobe move out of hard-coded `FIXTURES`/`KEEPOUT` (`data/furniture.js`) into the catalogue, so they can be swapped and moved. `validateLot` enforces required activities at "Done" (a bed, a cooker and fridge, a shower, a door reachable), not at every drop, with a friendly checklist.
4. *Placement rules.* Fields added to the catalogue schema (extend, do not fork, the other agents' file): `size [w,d]`, `mount` (floor, surface, wall, ceiling), `stars` (1 to 4), `rooms` (suitable rooms), `swatches`. Snap full or half tile, rotate in 90s, lamps and plants on surfaces, art on walls, rug layering, Shift to place several. The existing flood-fill that refuses placements that wall you in generalises to any lot size (a 50 x 50 m lot at 0.25 m is 40,000 cells, cheap on edit).
5. *Edit experience.* Cutaway camera with three modes (walls up, cutaway, down), floor grid, top-down, undo and redo (50 steps; survives leaving build mode), eyedropper, **full refund while still in the edit session**, sell-back 50% afterwards (`SELL_RATIO`), **Storage** list ("+N items"), starter-room kits ("Starter bedroom", "Rental-ready kitchen") placed in one click.
6. *Buy integration.* The Buy sheet gets size tags, star pips, atlas thumbnails, category pills and "need P$ x more" states from 3.10, using the other agents' 60 items.
7. *Rent and bills v1 (soft).* Weekly statement Friday 17:00 `America/Regina` for housing only (rent, utilities, insurance), accruing only on days you played, capped at 3 days of arrears, never eviction (penalty: mood and perks off). Amounts in 6.5. Autopay unlock after the first on-time payment.
8. *Stretch.* A procedural dog that wanders the home (adopt at a fictional humane society); two-storey home.

**Client-only vs backend.** All client. `validateLot` and the rent rules are server-portable (pure functions over a store).

**Effort.** XL, about 4 weeks.

**Cut line if late.** Dog, two-storey, starter kits.

**Definition of done**
- A new player and a returning player both land on Home; no street HUD overlaps the room (screenshot test).
- Three home layouts selectable; moving up a tier carries every placed item that fits and stores the rest (never deletes).
- `validateLot` rejects blocked doors and unreachable key points; at least 60 new unit tests; **v1 saves from M3 and M4 fixtures load into v2 with identical balance and furniture** (test).
- Undo and redo 50 steps; refund inside session; storage list; three cutaway modes.
- `renderer.info` in Home: at most 250 draw calls and 250k triangles; manual 60 fps check on the reference devices.
- `docs/API.md` merged; no UI file reads `store.state` for shared data added after this milestone (grep test).

### M6: Living Regina

**Scope.** The dense bright diorama, 77 working places, transport, and boards as living scenery.

**Deliverables**
1. *Diorama scene* per 3.7: layout, kit, scatter, ambient life, seasons, ground labels, day and night, camera, billboard models. Built district by district (Downtown and Wascana first), each district gated by the density and luminance tests.
2. *Activity engine and places.* `src/data/activities.js` and `src/core/activities.js` (pure rules over a store): about 40 activities across at least 14 places at M6 (feed the ducks gets a real 20-second action with a P$2 seed cost and a fun gain; buskers, skating, fishing, reading in the park, farmers market stall browsing, hardware store shopping for Handiness, etc.). Interiors added only where they pay for themselves: **cafe**, **community centre** and **rink** reusing the interior kit. Remove every activity chip that does nothing today (the "(soon)" ones become in-world ribbons).
3. *Place cards and transport.* The 3.8 card; transport picker with Walk, Bus and Cab (Drive later); weather and rush-hour surge as pure functions of weather and clock; share links via hash routes; deep-link test.
4. *Neighbours.* NPC residents get homes on a lot grid, labelled "NPC". **Drop-by visit**: tap a neighbour's home, a short scripted event (they greet you, offer coffee, a small friendship gain), rendered with the same `interior.setHome(state)` the player's home uses, so real home visits in M9 reuse the viewer.
5. *Council (shared deterministic sim).* Weekly term computed from the calendar week in `America/Regina` (Sunday 20:00 close; Saskatchewan has no daylight saving time, so this is stable), candidate slate and NPC electorate derived from a seed of the term id, so every device sees the same term and result without a server. Policy banner pill on the map ("Open Skies is bylaw this week"). Fixes the audit's per-device term clock. Real votes arrive in M8.
6. *`world` slice and boards as scenery.* `public/world.json` seeded with the 36 boards (`AD_TIERS` placement rule, each board in exactly one tier), house ads, Quilt grid, NPC homes, in the exact shape of `GET /world/snapshot` (5.3). Rotation timers, house ads in unsold slots, "AD" tags, tap a board for its sheet (carousel, "until" dates, leaving-the-game interstitial for ads that have links). Boards, plots and council move out of each player's save.
7. *Map chrome.* Top pill unchanged; chips from 3.8; "Go to work"; transport chip; live-event chip tied to real weather; mute toggle.
8. *Polish.* Replace the cross-fade-through-black with the tab wipe; coin fly-ups and floaters; `window.__regina` removed from production builds; "Wheat City" renamed (it is Brandon's nickname; Regina is the "Queen City"); third-party marks renamed ("Rider Red", "Double-Double"; check "Wascana Credit Union").
9. *Stretch.* Prairie Find daily hunt, freight train, geese.

**Client-only vs backend.** All client. The `world` snapshot is a static JSON file now and an API response in M8.

**Effort.** XL, about 6 weeks; the diorama is about half of it. Art is procedural, so budget time for the kit.

**Cut line if late.** Train, geese, three interiors down to one, Prairie Find. Never cut the density and luminance tests.

**Definition of done**
- All 3.7 acceptance tests green; 36 boards, every board satisfies exactly one tier's `placementOk` (existing test extended); at least 70 working places and 40 activities; **no visible control without a handler** (a smoke crawl clicks every chip, pin and button and fails on a silent no-op).
- Close and far views at default zoom: no pin overlaps, 12 or more pins and 6 or more boards in view.
- Deep links open the right place, phone app or Buy category from a cold start.
- Council: two simulated devices with different clocks and fresh saves see the same candidates and result for the same week (test).
- Ad texture memory 24 MB or less (asserted from `renderer.info.memory` and texture sizes).

### M7: Front door and storefront

**Scope.** The phone, title, loading and onboarding, the landing website, the design system everywhere, billboard and quilt booking UIs, and the first real advertisers by hand.

**Deliverables**
1. *Design system finish.* Delete `src/style.css` components (modals, shops, creator, build bar, phone apps, radio, ads UI) in favour of `tokens.css` components; self-hosted fonts; SVG sprite complete; zoom enabled; 44 px targets; focus and dialog fixes; empty states with illustrations; "need P$ x more" reasons; the contrast test; P$ glyph: `fmtMoney` shows `P$1,234.00` (storage stays integer cents; update string assertions in tests), CA$ is always written `CA$`.
2. *Phone redesign* per 3.11.
3. *Title, loading, onboarding* per 3.12.
4. *Landing site and pages* per 3.13: multi-page build, Open Graph, manifest, service worker, chunk splitting.
5. *Billboard booking UI (P$ community slots).* Pick a board from the map or a list, a tier (Standard, Big, Landmark from `AD_TIERS`), 7 days only (remove the 1- and 3-day options and read prices from `adQuote`, which also fixes the 3D "YOUR AD HERE" sign that still paints the old per-day price); theme and text (existing filter replaced, see 5.7); 3D preview on the real board; quote ("shares the board with up to 3 other ads, 15 seconds each"); confirm; booking goes through `buyAd` with an idempotent ref (no `now` in it). The mayor's "Open Skies" discount applies to P$ community bookings only, never to CA$. Booked ads show only on your device until M9, and the screen says so ("On air on your device. Everyone sees community boards once online play opens.").
6. *Quilt UI.* The 3.9 grid, drag-select, `quiltCheck`, quote in P$ for community patches (text and emblem only), sponsored patches routed to Advertise. Same honesty line as boards.
7. *Advertise page and founding-advertiser pilot (manual, no backend).* `/advertise/` with the rate card (generated from `AD_TIERS` and the Quilt price constant), creative specs (2:1, 1,024 x 512 PNG, JPEG or WebP, 500 KB or less; no QR codes, phone numbers or text over 3 lines), ad rules, restricted categories, refund terms (drafted for the owner's lawyer), an inquiry via `mailto:` from the owner's domain address. Payment via **Stripe Payment Links** (hosted by Stripe, no server of ours): one link per tier, quantity = weeks. The owner reviews the creative and commits it to `public/ads/approved.json` plus the image in `public/ads/`; a Vitest test validates the file at build (https links only, host not on the deny list, exact image size, dates valid, one booking per slot per week, no personal data in the repo); the deploy workflow publishes it; ads expire by `endsAt` in the client (a wrong device clock can show an expired ad until the next deploy, which is harmless). **Gate: do not take money until the owner has signed off every row of 5.8 whose "Required before" says pilot (rows 1 to 5 and 14) and decided Q6 to Q8.** Pilot price and wording: section 7 Q7.
8. *Legal pages as DRAFTS.* Terms, Privacy, Disclaimer, Rules, Official accounts, with a "DRAFT, not yet legally reviewed" banner, and no data collection on the site. The cookie notice enumerates everything actually stored (fix Lagos' mismatch between banner text and real storage).
9. *Live events and sound (stretch).* Date-driven quest board (first event: Winterfest), weekly quests, cosmetic rewards, idempotent ledger refs; adaptive build music from WebAudio stems.

**Client-only vs backend.** Client, plus Stripe-hosted payment pages for the pilot only. Nothing here touches P$.

**Effort.** XL, about 5 weeks.

**Cut line if late.** Events and music; the pilot slides to M8 week 1 if legal sign-off is slow.

**Definition of done**
- Lighthouse mobile: landing performance 90+, accessibility 95+, SEO 95+, LCP 2.5 s or less; title interactive in 4 s or less on a throttled 4G mid phone; initial JS 350 KB gzip or less.
- `grep` finds zero uses of the old dark tokens; axe-core finds no serious or critical issues on title, home, buy, map, card, phone, ads and settings; zoom works.
- Contrast test green; price copy on every page is generated from data (a test scans built HTML for `CA$` and `P$` amounts and fails if any does not match `AD_TIERS`, `PACKS` or the Quilt constant, the exact mistake Lagos made with its "100 vs 500 a plot" copy).
- Five unaided playtesters complete the six-step first-day card; at least four do it in 10 minutes.
- `approved.json` validator passes; a dry-run advertiser (the owner) completes pay, submit, review and go-live end to end in Stripe test mode.

### M8: Accounts, the server ledger, real elections, money packs

**Scope.** The server foundation. Every rule that touches money or shared state runs on the server; real people can sign up; real votes and capped real-money packs go live behind flags.

**Deliverables**
1. *Stack and environments* (5.1): production and staging projects, migrations in `supabase/migrations/`, CI deploying functions, secrets in the platform vault and GitHub Actions only.
2. *Auth and age gate* (5.5): email magic link plus optional password, 18+ attestation with the Terms version accepted, @handle rules with a reserved list, Turnstile on sign-up, delete and export endpoints.
3. *`RemoteApi` and server commands* (5.3): `src/core` bundled into the server runtime; each command runs inside one database transaction with a row lock on the wallet, a server clock, a server RNG and an idempotency key; per-account rate limits; daily shift cap (the audit notes a script can call `finishShift` directly); needs and energy recomputed lazily from a `needs_at` timestamp.
4. *Ledger and monitoring.* Append-only `ledger_entries` with unique `(account_id, ref)`; nightly reconciliation (sum of deltas equals balance for every account); a faucet-and-sink dashboard (income by source, spend by sink, P$ per account percentiles) so inflation is seen before players feel it.
5. *Import of local saves.* Lossy by design to block minting: the server accepts name and look, the home layout, and owned items up to a P$3,000 list-price cap, and re-bases the balance to `min(local, P$2,000)`; skills and XP restart. A one-time "Founding resident" cosmetic badge.
6. *Real council elections.* One vote per account (account at least 24 hours old), candidacy with a P$ deposit (refunded above 1% of votes), moderated slogans (80 characters), ballot shows the top 10 and a search (never ship the whole candidate list: Lagos' endpoint is 1.86 MB), weekly tally cron Sunday 20:00 `America/Regina`, the winning policy written to `world.council` and read by every rule through `policyMult(world, area)` instead of the player's save. P$ donations are capped per term; real money never touches a vote.
7. *Money packs live* (5.6, 6.3), behind a feature flag turned on only after the owner signs the legal gate: hosted Stripe Checkout, verified webhooks, idempotent credit, adults only, caps, receipts, refunds and disputes, purchase history, confirmation dialog.
8. *Admin v0.* The platform's table editor plus a small `/admin` page behind MFA: freeze or ban an account, reverse a ledger entry (with a compensating row), view orders, audit log.
9. *Final legal pages, cookie and consent, data export and erasure.* Replace the M7 drafts with the lawyer-reviewed text.
10. *Observability and ops.* Error tracking, uptime check, structured logs, point-in-time backups, a **restore drill**, a runbook (incident, key rotation, refund and dispute handling).

**Client-only vs backend.** Backend. The client changes only by swapping `LocalApi` for `RemoteApi` plus sign-in screens and a purchase history.

**Effort.** XL, 6 to 8 weeks.

**Definition of done**
- The existing rules tests run unchanged against the server runtime (a "server shim" suite), plus new tests: double-submit with the same idempotency key returns the same result; a different body with the same key returns `conflict`; 200 concurrent commands per second on one account cannot overspend; a replayed `ref` after history roll-off still fails (the audit reproduced this bug in the local ledger).
- Nightly reconciliation shows zero drift on staging after a 24-hour soak with synthetic accounts (staging only; never in production).
- Stripe test mode: payment, refund, dispute and expired-session paths each leave the ledger correct (claw-back or debt flag, packs paused when owed).
- Packs flag is OFF in production until the owner has ticked every required row of 5.8 and ran one real CA$1.99 purchase and refund on their own card.
- A security review pass against OWASP ASVS Level 1 is recorded; backup restored successfully once, timed.

### M9: Together and sponsored

**Scope.** Everything that needs other people or other people's pictures. Staged so each stage ships alone. Moderation tooling lands in 9a and is reused by 9c.

**9a. People (L, about 3 weeks).** Friends by @handle, block, mute, report; DMs and place chat with presence ("Here now" real); filters, rate limits (one message per 1.5 s, five per 10 s), links blocked for accounts under 7 days, messages 200 characters, 30-day retention, not end-to-end encrypted (say so in Privacy); a real online count shown from the first player (never padded; when zero it says "Be the first neighbour online"); report button everywhere.
*Done when:* two real test accounts chat in a place room and in DMs; a reported message appears in the queue within 5 seconds; a blocked user can no longer message or see presence; flood tests drop excess messages without crashing a room.

**9b. Visiting homes (L to XL, about 3 weeks).** First an asynchronous snapshot tour (`GET /homes/:id` renders in the same viewer as the NPC drop-by), visibility public, friends or private, guestbook; then live co-presence in a home (owner plus 5 visitors, knock, kick, ban, report) over a realtime room. Neighbours layer lists real homes (bbox queries, at most 400, paginated), never the whole table.
*Done when:* a visitor sees the owner's current layout within 2 seconds of an edit; the owner can kick and ban; private homes are unreachable by URL guessing (test); visit and kick events are in the audit log.

**9c. Uploads, advertisers, Quilt (XL, about 5 weeks).**
- Upload pipeline: signed upload into a quarantine bucket, magic-byte check, size and decompression-bomb limits, EXIF and colour-profile strip, re-encode to exact dimensions, perceptual-hash block list, image classifier, QR and URL OCR (reject), then **human approval for every ad and plot image before it can go live**; approved copies served from a separate cookieless origin with `nosniff`.
- Advertiser self-serve on `/advertise/`: quote, creative, link, business name, contact email, rules accepted; Stripe Checkout with **authorize-then-capture** (5.6) so a rejected creative is voided, not refunded; slot holds; advertiser dashboard (orders, status, real views and taps); expiry and renewal reminders; receipts and invoices; the leaving-the-game interstitial and click counter; "Sponsored" labelling.
- Quilt plots: transactional claim (database exclusion constraint on overlapping rectangles), pricing from the constant, image, title and link, same review path; one free personal 1 x 1 patch per account (emblem only, no upload).
- Moderation console: queue (ads, plots, reports), reason codes, takedown within 24 hours, strike system, audit log, advertiser appeal.
*Done when:* an advertiser completes quote to live in Stripe test mode with a deliberately bad image rejected and voided; two simultaneous claims of the same tiles result in exactly one winner; an expired ad disappears from the world snapshot within 1 minute; takedown works from the console; all text in the world passes through the escaping template and a CSP test finds no inline script.

**9d. Backlog after 9c (not committed).** Home poster uploads (default off), sponsored phone apps and branded venues (only if Q10 is yes), community "Prairie Find" counters, creator items, Builder pack (free walls and second floors), pets, cars, a second city (Moose Jaw), emotions engine, school and campus loops.

**Client-only vs backend.** Backend for all of 9a to 9d; the client UI for each was already built against `LocalApi` in M6 and M7 where possible (card rows, quilt, booking), so these stages mostly wire real data.

**Explicit non-goals through M9.** Cash-out, P$ trading or gifting between humans, paid randomness, any paid vote or paid influence on elections, pay-to-win items, behavioural ad targeting or third-party ad networks, user-supplied HTML or SVG, real-person or real-candidate political ads, under-18 accounts, fake players or advertisers, a second city.

---

## 5. Backend and payments proposal

### 5.1 Recommended stack and trade-offs (solo owner)

The front end stays static on GitHub Pages (built by the existing workflow). The server is the minimum that gives a safe ledger, accounts, realtime and uploads without the owner operating servers.

| Option | Money safety | Realtime (chat, presence) | Solo-owner ops burden | Cost shape | Lock-in | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Supabase** (Postgres, Auth, Realtime, Storage, Edge Functions, cron) behind Cloudflare DNS and Turnstile | Best: real SQL transactions, row locks, check and unique constraints, exclusion constraints for plots | Built in (Broadcast and Presence); fine for hundreds to low thousands concurrent | Lowest: managed auth, backups, dashboard doubles as admin v0 | Pro plan about US$25 a month at the start (verify; free tier pauses idle projects) | Medium; Postgres is portable, rules are plain JS | **Recommended** |
| B. Cloudflare Workers + D1 + Durable Objects + R2 + Queues | Good but bespoke: D1 has no interactive transactions, so the ledger needs one Durable Object per account or careful batched conditional updates | Excellent (Durable Objects per room) | Low ops, higher build effort and learning curve | Cheapest at scale | High (Workers, DO) | Best if cost at scale or global latency dominate; runner-up |
| C. Firebase (Auth, Firestore, Functions) | Transactions exist but money and relational queries (orders, ledger reports) are awkward | Good | Low | Can surprise at scale | High | Not recommended |
| D. Node and Postgres on Fly.io, Render or a VPS | Best (you own Postgres) | You build WebSockets | Highest: patching, scaling, backups, on-call | Predictable | Low | Only if the owner enjoys ops |
| E. Game backends (PlayFab, Nakama, Colyseus) | Built-in currency ideas but our rules already exist in JS | Strong | Medium | Varies | High | Not needed |

Why A: money correctness matters most and Postgres makes it boring; managed auth removes the riskiest thing a solo owner can write; the admin and moderation console can start as the platform's table editor; the rules in `src/core` are already pure ES modules and bundle into the server functions unchanged; a thin repository layer keeps option B as an escape hatch. Choose a Canadian region if the provider offers one (data residency simplifies the privacy policy). Put **Cloudflare (free plan) in front of the custom domain** for DNS, security headers (GitHub Pages cannot set a CSP or HSTS header; a meta CSP is weaker), Turnstile, and cookieless web analytics.

**Payments:** Stripe (Checkout hosted by Stripe, Payment Links for the pilot, Stripe Tax if the owner collects tax through it). Fallback if the owner is not in a Stripe-supported country or does not want to handle sales tax across jurisdictions: a merchant-of-record such as Paddle or Lemon Squeezy (higher fees, they handle tax). Card data never touches our code (hosted checkout, PCI scope SAQ A).

**Hosting caveat to decide:** as I read them (verify the current text), GitHub Pages' terms do not allow a site primarily directed at facilitating commercial transactions. A free game with optional purchases is probably fine, but selling ads and packs from the same site is a grey area. The build is host-agnostic (`base: './'`), so moving the same `dist/` to Cloudflare Pages is about ten minutes. Recommended default: stay on Pages through M7, move to Cloudflare Pages before the first real-money launch. See Q14.

### 5.2 Architecture

```
Browser (static, GitHub Pages then Cloudflare Pages)
  landing / play / advertise / legal         hash routes in /play
        |  HTTPS, cookies same-site via custom domain (reginalife.example + api.reginalife.example)
        v
Cloudflare (DNS, headers: CSP, HSTS; Turnstile)
        v
API  (/v1)  Edge Functions: auth hooks, /commands, /payments, /webhooks/stripe, /uploads, /admin
        |-- runs src/core rules in ONE db transaction per command (row lock, server clock, server RNG)
        |-- Postgres: accounts, wallets, ledger, orders, world, homes, social, moderation
        |-- Storage: quarantine bucket -> scan -> published bucket (separate origin)
        |-- Realtime: presence + chat rooms, home rooms
        |-- Cron: weekly election tally, ad expiry, rent statements, reconciliation
Stripe (Checkout, Payment Links, webhooks) <-> /webhooks/stripe (signature verified)
```

Everything the client believes about money, time, ownership or votes is advisory; the server recomputes it. The client may cache and animate.

### 5.3 The server contract, v1

This is the contract M5 writes to `src/api/contract.js` and `docs/API.md`; `LocalApi` implements it in the browser now, `RemoteApi` calls it in M8. The UI never calls anything else.

**Conventions**
- Base `/v1`, JSON, UTF-8. Auth: session cookie (same-site, `Secure`, `HttpOnly`) or bearer token. CORS locked to the site origin.
- Every POST needs `Idempotency-Key` (a UUID per user action). The server stores the response for 24 hours per `(account, key)`; same key and same body returns the stored response; same key and different body returns `409 conflict`.
- **The server never accepts a timestamp or a price from the client.** Responses carry `serverTime`; clients display countdowns against the offset. Prices come from the database or config.
- Success: `{ ok: true, ... }`. Failure: `{ ok: false, error: { code, message, reason?, retryAfterMs? } }`. Codes: `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rule_rejected` (with a `reason` from `src/core`), `insufficient_funds`, `rate_limited`, `age_required`, `frozen`, `payment_required`, `moderation_pending`, `upgrade_required`.
- Lists are cursor-paginated (`?cursor=&limit=`). Additive changes only within v1; the client sends `X-Client-Build`; the server may answer `426 upgrade_required`.

**Game state and commands**
```
GET  /v1/state                       -> { ok, serverTime, profile, wallet, home, inventory, job, flags, council }
POST /v1/commands                    { type, args }  (+ Idempotency-Key)
     -> { ok, patch, events: [ { kind, text, ... } ], serverTime }
     types: buyItem equip buyFurniture editLot upgradeHome sellFurniture setStyle applyForJob acceptOffer
            startShift reportTask finishShift travel resolveEvent claimDaily vote donate hangout
            doActivity bookCommunitySlot claimPlot payRent
GET  /v1/ledger?cursor=              -> statement rows { id, ts, delta, balanceAfter, ref, kind, label }
```

**World** (cacheable, `ETag`, CDN 30 s; this is the exact shape `public/world.json` has in M6)
```json
{
  "v": 1, "serverTime": "2026-10-09T18:00:00Z", "etag": "w-8841",
  "council": { "term": 41, "closes": "2026-10-11T20:00:00-06:00",
               "mayor": { "handle": "@tobi.rgn", "npc": true },
               "policy": { "id": "open_skies", "effects": { "signage": -0.2 } }, "announcement": null },
  "boards": [ { "id": "victoria-east", "tier": "big", "rotationMs": 15000, "nextFree": "2026-10-12",
                "slots": [ { "n": 0, "kind": "sponsored", "adId": "ad_91", "image": "/a/ad_91.webp?v=2",
                             "headline": "Prairie Plumbing", "host": "example.ca", "endsAt": "2026-10-19T06:00:00Z" },
                           { "n": 1, "kind": "community", "text": "Hi from Cathedral", "theme": "lake", "endsAt": "..." },
                           { "n": 2, "kind": "house" } ] } ],
  "quilt": { "grid": { "w": 48, "h": 32 }, "plots": [ { "id": "q_12", "x": 4, "y": 6, "w": 2, "h": 2, "kind": "sponsored",
              "image": "/q/q_12.webp?v=1", "title": "Prairie Plumbing", "host": "example.ca", "endsAt": "..." } ], "holds": [] },
  "homes": { "items": [ { "id": "h_1", "handle": "@sam", "layout": "bungalow", "npc": false, "online": false, "atHome": false } ] },
  "online": { "real": true, "count": 12 }
}
```
`kind` is `sponsored` (real money, image and link), `community` (P$, text and theme, no link) or `house`. `online.real` false means the UI hides the count.

**Billboards and orders**
```
POST /v1/ad-orders  { boardId, weeks, startOn, uploadId, headline, linkUrl, businessName, contactEmail, rulesVersion }
     -> 201 { orderId, status: "draft", quote: { cents, currency: "CAD", taxNote }, holdExpiresAt }
POST /v1/payments/checkout { kind: "ad" | "pack" | "plot", orderId | packId }
     -> { url }                     // a hosted Stripe Checkout URL; price computed server-side only
GET  /v1/orders/:id                 -> { status: created | authorized | paid | live | rejected | void | refunded | disputed }
GET  /v1/ad-orders/mine, POST /v1/ad-orders/:id/creative (replace image), POST /v1/ad-orders/:id/cancel
GET  /r/:adId                       -> leaving-the-game interstitial page; counts a tap; https only
```

**Homes, social, plots, elections, uploads**
```
GET  /v1/homes?bbox=&limit=         PATCH /v1/home/visibility {public|friends|private}
GET  /v1/homes/:id                  -> public snapshot { layout, lot, owner, visits }   POST /v1/homes/:id/visit -> room token
POST /v1/homes/:id/kick | /report
GET  /v1/users/:handle              POST /v1/friends/requests ...   POST /v1/blocks/:userId   POST /v1/reports
GET  /v1/threads?cursor=  POST /v1/threads/:id/messages
GET  /v1/plots?bbox=        POST /v1/plots/claim { x, y, w, h }   POST /v1/plots/:id/content { uploadId, title, linkUrl }
GET  /v1/elections/current  POST /v1/elections/:id/candidacy { name, slogan }  POST /v1/elections/:id/vote { candidateId }
POST /v1/uploads/sign { purpose: billboard | plot, mime, bytes } -> presigned PUT into quarantine;  GET /v1/uploads/:id -> status
GET/POST /v1/admin/*                (MFA, allowlist): queue, decisions, bans, ledger reversals, audit log
WS   channels: presence:place:<id>  chat:place:<id>  dm:<threadId>  home:<homeId>  world (board, council, event changes)
     messages: { t, from, body, ts }; per-connection quotas; server validates every position and id
```

**Client interface** (the only thing UI code imports): `api.state()`, `api.command(type, args)`, `api.world()`, `api.adOrder.*`, `api.pay.checkout()`, `api.home.*`, `api.social.*`, `api.plots.*`, `api.council.*`, `api.upload.*`. `LocalApi` reads `localStorage` and `public/world.json`; `RemoteApi` calls the endpoints above.

### 5.4 Data model (Postgres, abridged)

```
accounts(id uuid pk, handle citext unique, email, over18_attested_at, birth_year, tos_version, privacy_version,
         status 'active|frozen|banned', created_at)
game_state(account_id pk, v int, state jsonb, needs_at timestamptz)          -- everything except money
wallets(account_id pk, balance_cents bigint check (balance_cents >= 0), owed_cents bigint default 0)
ledger_entries(id uuid pk, account_id, delta_cents, balance_after, ref text, kind, category, meta jsonb, created_at,
               unique (account_id, ref))                                       -- append-only: UPDATE/DELETE revoked
orders(id, account_id, kind 'pack|ad|plot', status, amount_cents, currency, stripe_session_id unique,
       stripe_payment_intent unique, meta jsonb, created_at)
webhook_events(event_id pk, type, received_at, processed_at, status)           -- idempotent webhook handling
boards(id pk, tier, name, x, z, yaw, traffic)
billboard_slots(board_id, slot_no, kind 'sponsored|community|house', ad_id, starts_at, ends_at,
                primary key (board_id, slot_no, starts_at))
ads(id, owner_id, order_id, headline, link_url, link_host, upload_id, status 'pending|approved|rejected|live|expired|removed',
    reviewed_by, reason_code)
uploads(id, owner_id, purpose, mime, bytes, sha256, phash, status 'quarantine|clean|rejected|published', scan jsonb)
plots(id, grid_id, x, y, w, h, owner_id, kind, ad_id, starts_at, ends_at,
      exclude using gist (box(point(x,y), point(x+w,y+h)) with &&, tstzrange(starts_at,ends_at) with &&))
homes(id, owner_id, layout, lot jsonb, visibility, updated_at)         visits(id, home_id, visitor_id, started_at, ended_at)
friendships(a, b, status)  blocks(blocker, blocked)  threads, messages(id, thread_id, sender_id, body, created_at, flagged)
reports(id, reporter_id, target_kind, target_id, reason, status)       mod_actions(id, actor_id, action, target, reason_code, created_at)  -- audit
elections(id, term, opens_at, closes_at, status)  candidacies(id, election_id, account_id, name, slogan, deposit_ref)
votes(election_id, account_id, candidate_id, primary key (election_id, account_id))   world_policy(term, policy_id, announcement)
```
Row-level security on every table; the service role is used only by server functions; the browser never holds a service key.

### 5.5 Authentication, accounts, age

- Email magic link as the default, optional password, passkeys later; no social login (matches Lagos' privacy stance and avoids extra processors). Cloudflare Turnstile on sign-up and sign-in. Sessions as same-site cookies via the custom domain (`reginalife.example` for the site, `api.` subdomain for the API); if the platform's default localStorage tokens are used instead, enforce a strict CSP and an auto-escaping template function everywhere, because XSS then equals account takeover (the current code builds UI by string-templating `innerHTML`).
- **Age: 18+ for any account**, with a date-of-birth entry once, storing only `over18_attested_at` and `birth_year` (data minimisation; legal to confirm). Anonymous single-player stays open and collects nothing. No chat, no purchases, no uploads without an account. This keeps payments, chat and ad purchases clear of minors' rules (Quebec Law 25 sets 14 for consent; US COPPA applies under 13) at the cost of a smaller audience; see Q4.
- @handle rules: 3 to 20 characters, confusable folding, reserved list (`official`, `admin`, `regina`, the City, the Riders, brand names), a "verified" check for advertisers, and the "NPC" tag always shown on NPC residents so humans and NPCs are never confusable.
- Delete and export: `DELETE /me` and `POST /me/export`; erasure keeps ledger and order rows in minimised form for tax and dispute records.

### 5.6 How real money moves, end to end

**A. Money packs (P$)**
1. Client calls `POST /payments/checkout { packId }`. The server checks: adult, not frozen, the pack exists and is enabled, purchase caps from `PACK_LIMITS` (2 packs and CA$40 a day, CA$100 a week) against the `orders` table, a new-account hold (no pack in the first 24 hours). It writes an `orders` row (status `created`, price from config, never from the client) and creates a **Stripe Checkout Session** with `client_reference_id = order.id`, metadata, a 30-minute expiry and success and cancel URLs. It returns the hosted URL.
2. The player pays on Stripe's page. The redirect back to our success URL is **not** proof of payment; the page polls `GET /orders/:id`.
3. Stripe sends `checkout.session.completed` to `/webhooks/stripe`. The handler verifies the signature against the raw body, rejects an unknown or already-seen `event.id` (`webhook_events`), loads the order by metadata, and checks amount, currency and `payment_status == "paid"` against the order. In **one transaction** it sets the order to `paid` and inserts a ledger credit with `ref = "stripe:" + payment_intent` (unique, so replays are no-ops). It answers 200 quickly; retries are safe.
4. Refunds and disputes (`charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`; verify exact event names against Stripe's docs when building): the server writes a compensating ledger debit; if the balance is too low it records `owed_cents`, blocks further purchases and flags the account for review; paid ads on that account pause. Dispute fees are the owner's cost (about CA$15 at time of writing; verify).
5. Receipts: Stripe emails one; the app also shows purchase history. Keep order and tax records for the legal period (accountant to confirm).

**B. Sponsored billboards (CA$)** are a different product from P$ and never touch the wallet.
1. The advertiser (email magic link, 18+ business or individual; no game account required) picks board, tier, weeks and start; uploads the creative (pipeline in 5.7); enters headline (40 characters), https link, business name, contact email; accepts the ad rules version.
2. `POST /ad-orders` computes the quote from `AD_TIERS.realMoney`, checks slot availability and **holds the slot for 30 minutes**.
3. Checkout uses **authorize now, capture on approval** (`capture_method=manual`; card authorizations last roughly 7 days, so the review promise is 48 hours). Webhook marks the order `authorized` and puts the creative in the human review queue.
4. Approve: the server captures the payment, sets `starts_at = max(now, requested start)` and `ends_at = starts_at + 7 x weeks days` using the server clock, and publishes the creative to the world snapshot. Reject: the authorization is voided (no fee, no refund process), the reason is emailed, one free resubmission.
5. Expiry cron removes the ad and sends a renewal reminder; renewal creates a new order (no auto-charge, no saved subscription).
6. Takedown after going live (rules breach or complaint) removes it immediately. Refund policy (pro-rata for our error or legal removal, none for an advertiser's rule breach) is a **legal-review item**, because "taken down without refund" copy cannot waive statutory consumer rights.
7. Advertisers see real numbers: views (board in view at least 1 second, measured client-side, labelled "approximate") and taps (counted server-side at the interstitial). No tracking pixels, no third-party ad network.
8. Optional 4-week bundle at about 20% off (CA$80, CA$160, CA$320) is a proposal, not in `ECONOMY.md` (Q7).

**C. Quilt plots (CA$)** follow B: select, quote at the tile constant times area, hold the rectangle (database exclusion constraint prevents overlap), authorize, review, capture, publish. P$ community patches use the ledger and need no payment provider.

**D. Taxes.** Show CA$ prices with tax added at checkout (Stripe Tax if the owner uses it); the owner's accountant decides GST/HST registration, whether Saskatchewan PST applies to virtual goods and ads, and the invoice format. The "drip pricing" rules require mandatory fees to be in the advertised price but taxes may be added later (verify).

### 5.7 Moderation and abuse controls

**Principle: nothing public from a stranger goes live without a human saying yes.** That covers every ad creative, plot image and plot title, advertiser name and link. Chat and handles are reactive (filters and reports) because pre-approving chat is impossible.

- **Images.** Pipeline in 9c. Restricted categories banned at launch: alcohol, cannabis, tobacco and vape, gambling and lotteries, loans, crypto and investments, pharma and supplements, adult content, weapons, MLM, political and election ads (never use real candidates or the real mayor), anything pretending to be Regina Life, the City, a public body or a real brand you do not own. Local rules (SLGA, Ad Standards Canada) apply to real advertisers; the owner must not accept ads they cannot defend.
- **Links.** https only, domain shown, punycode normalised, no IP hosts, no shorteners or redirectors, block list and a safe-browsing check, the leaving-the-game interstitial on every outbound click, `rel="noopener noreferrer nofollow sponsored"`; never fetch advertiser URLs server-side without SSRF protection.
- **Text filter.** Replace the M3 substring list (`core/ads.js`), which blocks "Sussex Street Pizza", "Grape Escape Winery", "Best Skills Academy" and passes "fvck", Cyrillic lookalikes, "Call 306 555 0100", "dot com", "Buy BTC now", "Free iPhone giveaway". New filter: Unicode normalisation and confusable folding, word-boundary matching, phone, email and URL detectors, scam phrase lists, with a test corpus of those exact cases (both directions). Used for slogans, headlines, handles, plot titles and chat.
- **Chat and social.** Rate limits and flood control, link blocking for new accounts, mute and block, report on every message, 30-day retention, moderator sees only reported threads, escalation path for threats and for any child-safety concern (and reporting to Cybertip.ca, see 5.8).
- **Homes.** Visibility settings, owner kick and ban, visitor cap, report; no uploaded art in homes until 9d.
- **Account abuse.** New-account holds (24 hours: no votes, no packs, no links), email verification, device and IP heuristics, caps on daily reward claims per device, minimum account age to vote or run, ban evasion checks. **Shifts are validated server-side** (time, task proofs, daily cap) because a script can call `finishShift` today.
- **Platform security.** Strict CSP with no inline scripts; an auto-escaping template function (no `innerHTML` with player text); uploads on a separate cookieless origin; no SVG or HTML uploads; WebSocket per-connection quotas; rate limits and Turnstile on auth; secrets only in the platform vault; admin behind MFA and an allowlist; every moderator action in `mod_actions`; strip `window.__regina` from production.
- **Elections.** Free voting, one per verified account, deposits to run, slogan filter, top-10 ballot with search, donation caps; real money can never buy influence.
- **Who moderates.** The owner, 48-hour service level for ads and reports, until a trusted moderator is appointed (Q5). Build the queue so a second person can be added with a role, not a rewrite.

### 5.8 Canada legal, policy and privacy checklist (needs the owner's own legal and accounting review)

This is a list of things to settle, not advice. "Required before" says which milestone is blocked.

| # | Area | What to settle | Required before |
| --- | --- | --- | --- |
| 1 | Operator | Who operates the game (sole proprietor or corporation), business number, business bank account, mailing address for legal pages and email footers. Decides Stripe country, tax and which privacy regime leads | M7 pilot |
| 2 | Terms of Use | Fictional-currency position (not money, not redeemable, not transferable, no cash value, not for sale between players); accounts; conduct; enforcement ladder; governing law (Saskatchewan); termination; changes | M7 pilot (draft), M8 (final) |
| 3 | Purchase and refund terms | Price display, taxes at checkout, who can buy (18+), delivery is instant and final except where law says otherwise, refund and chargeback policy, spend caps, receipts. Check provincial consumer-protection and "internet contract" rules and **Quebec** rules (and French-language requirements if selling to Quebec) | Pilot, M8 |
| 4 | Advertising terms | Rate card, rotation (no guaranteed impressions), content warranties and indemnity, rights to host and moderate, removal and refund rules, restricted categories, advertiser identity records | Pilot |
| 5 | Taxes | GST/HST registration (small-supplier threshold CA$30,000 over four quarters), whether Saskatchewan PST applies to virtual goods and ad services, Stripe Tax settings, invoices, record keeping | Pilot |
| 6 | Virtual-currency posture | Closed-loop, non-redeemable currency is generally not a money-services business; confirm with counsel and keep it closed (no cash-out, no player-to-player transfers, no marketplace) | M8 |
| 7 | Contests and randomness | No paid random rewards; any real-prize contest triggers Criminal Code lottery rules; keep prizes in-game | Always |
| 8 | Privacy Policy | PIPEDA (and Quebec Law 25 if Quebec users): what is collected (account, handle, birth year, gameplay, payment references, device data), processors and their countries (US-hosted services mean cross-border transfer disclosure), retention, access and erasure, breach reporting plan, a designated privacy contact | M8 |
| 9 | Cookies and storage | Banner that lists everything actually stored; analytics that avoid cookies; self-host fonts; weather provider disclosure | M7 |
| 10 | Age | 18+ attestation design (Q4); no under-18 accounts; what happens if a minor is found | M8 |
| 11 | Email | CASL: consent for marketing, none sent without it; transactional emails exempt; address and unsubscribe in marketing | M8 |
| 12 | IP and takedown | Designated contact for copyright and trademark complaints, a notice-and-notice style process (check whether it legally applies to you; adopt it anyway), counter-notice flow, repeat-infringer policy; no real brand marks in monetised surfaces | M9c |
| 13 | Child-safety reporting | Process to report child sexual exploitation material to Cybertip.ca and preserve evidence; check any statutory duty; moderator training | M9a |
| 14 | Advertising standards | Ad Standards Canada code and any provincial rules for restricted categories; ban political and election ads; clearly label "Sponsored" | Pilot |
| 15 | Disclaimer | Fictional council and election, no real office-holder, real places and brands appear without endorsement, accuracy of "realistic" prices (ECONOMY.md rates its own confidence) | M7 (draft) |
| 16 | Accessibility | Saskatchewan accessibility legislation and US ADA exposure; our WCAG AA work in 3.14 is the mitigation; verify current law | M7 |
| 17 | Insurance and entity risk | Consider general liability or cyber cover and whether to incorporate before real money flows | M8 |
| 18 | Records | Log ToS and Privacy versions accepted, consent timestamps, moderation decisions, orders; retention periods | M8 |

### 5.9 What the owner sets up, what we build

**The owner sets up** (accounts, keys, decisions; no one else can):

| When | Owner task |
| --- | --- |
| Now | Decide Q1 to Q4; register a custom domain (a `.ca` needs Canadian presence); create a free Cloudflare account for DNS; create a support mailbox on the domain; create the official social handle(s) for the "Official accounts" sheet |
| Before the M7 pilot | Stripe account (business details, ID verification, bank account, tax settings); create Payment Links for the three tiers; accountant call on GST and PST; lawyer review of ad terms, refund text and the Disclaimer; decide Q6 to Q8 |
| Before M8 | Supabase (or chosen) organisation, billing card, production and staging projects; transactional email provider (verify SPF and DKIM on the domain); Turnstile site key; error-tracking account; Stripe live keys and webhook endpoint registered; secrets placed in the platform vault and GitHub Actions secrets (never in the repo); MFA on every account (GitHub, Cloudflare, Stripe, Supabase, registrar); lawyer-reviewed Terms, Privacy and purchase terms; accountant sign-off; decide Q9, Q11 to Q13 |
| Before M9 | Image-moderation API key and budget; a named moderator or the commitment of time (Q5); the takedown email alias; a Cybertip.ca procedure; read and accept the incident runbook |

**We build:** all application code (rules reuse, `RemoteApi`, UI), database schema and migrations, row-level-security policies, webhook handlers, the upload and review pipeline, the admin console, CI and deployment workflows, tests including a server shim suite and Stripe test-mode scenarios, runbooks (incident, key rotation, disputes, restore), the filters and their test corpus, draft legal text for the owner's lawyer to correct, the Advertise and landing pages, and monitoring dashboards. Nothing is built that needs a secret before the owner has created the account for it.

---

## 6. Money

**Where the numbers live.** `docs/ECONOMY.md` is the source of truth; code reads `src/data/economy.js`, `billboards.js` (`AD_TIERS`) and `packs.js` (`PACKS`, `PACK_LIMITS`). If this document and ECONOMY.md ever disagree, ECONOMY.md wins; all price copy on every page is generated from the data (tested in M7).

### 6.1 Principles

1. **P$ is priced like CA$ of Regina shelf prices, and time is the lever.** A shift pays hourly wage times hours (entry $16.50 x 4 h = $66.00, about 3 minutes of play); realism sits in ratios, pace sits in time.
2. **Real money never buys power.** Packs add P$ only; billboard and plot revenue is a separate product that never enters a player's wallet.
3. **Ad money and game money are separate products.** Sponsored slots (CA$, image plus link, reviewed) and community slots (P$, text and theme, no link) share a board's rotation but never a ledger.
4. **Sinks exist before packs go live.** Rent and bills (6.5) arrive in M5 so P$ has somewhere to go before real money can buy it.

### 6.2 Billboards: tiers, P$ and CA$

Source: `AD_TIERS`, 7-day product, rotation caps `maxRotation`.

| Tier | Boards (target) | Rotation (slots) | Slot split | Community price (P$, 7 days) | Sponsored price (CA$, 7 days) | Casual weeks of entry pay (P$ price) |
| --- | --- | --- | --- | --- | --- | --- |
| Standard | 24 (8 exist) | 4 | 3 sponsored + 1 community | P$1,200 | CA$25 | 0.9 |
| Big | 8 (2 exist) | 3 | 2 sponsored + 1 community | P$3,000 | CA$50 | 2.3 |
| Landmark | 4 (2 exist) | 2 | 1 sponsored + 1 community | P$10,000 | CA$100 | 7.6 |

- A "casual week" is 20 shifts, P$1,320 at entry level (`ECONOMY.md` 2). Standard is about a week of play, Landmark about two months of saving.
- **Never undercut an advertiser:** at the best pack rate (47.5 P$ per CA$), a standard week costs CA$25.26, big CA$63.15, landmark CA$210.50, all at or above the CA$ price. A test enforces it and extends to the Quilt.
- The mayor's "Open Skies" -20% applies to **P$ community bookings only**. The price shown at checkout is the price charged.
- Optional (Q7): 4-week bundle at about 20% off (CA$80, CA$160, CA$320); "sole sponsor" takeover at 4 times the tier price; neither is in ECONOMY.md.

### 6.3 Money packs (P$ for CA$)

Source: `PACKS`, disabled until M8 and the legal gate (`PACKS_ENABLED = false`).

| Pack | Id | P$ credited | CA$ price | P$ per CA$ | Casual weeks of entry pay |
| --- | --- | --- | --- | --- | --- |
| Pocket Change | `pocket` | $80 | 1.99 | 40.2 | 0.06 |
| Full Wallet | `wallet` | $210 | 4.99 | 42.1 | 0.16 |
| Paycheque | `paycheque` | $430 | 9.99 | 43.0 | 0.33 |
| Harvest | `harvest` | $900 | 19.99 | 45.0 | 0.68 |
| Full Granary | `granary` | $1,900 | 39.99 | 47.5 | 1.44 |

Limits (`PACK_LIMITS`, enforced by the server, not the browser): at most 2 packs, CA$40 a day and CA$100 a week. No pack exceeds 1.5 casual weeks; the best rate is under 20% better than the worst, so there is no "must buy the big one" pressure. Adults only. Not transferable. No countdown timers or "x% more" urgency copy. Purchased P$ has no special status after crediting (no separate bucket) but a new account cannot buy in its first 24 hours.

### 6.4 Quilt plots (proposal, to A/B)

| Product | Real price (CA$) | P$ community price | Notes |
| --- | --- | --- | --- |
| Quilt tile, 7 days | CA$1.50 per tile | P$150 per tile (at least 47.5 x CA$1.50 = P$71, so it never undercuts) | Minimum 2 x 2 (CA$6, P$600), maximum 8 x 8 (CA$96, P$9,600), so the largest patch costs about a Landmark board |
| Free personal patch | none | none | One 1 x 1 emblem patch per account, no upload |
| Home lot | none | none | One per account; moving neighbourhood is cosmetic and cheap |

Lagos' tile price is about CA$0.50 per tile per 7 days (NGN 500 at about 1,430 NGN per USD, converted loosely); ours is deliberately higher per tile and capped in size, because our tiles are fewer and each is a visible patch.

### 6.5 Rent and bills (sinks, from ECONOMY section 2.2 and 8)

ECONOMY models living costs at $416 a week including groceries, transit and phone. The mechanic charged in M5 is **housing only** (rent, utilities, insurance); food and transport are already bought through play.

| Home tier | Rooms | One-time upgrade (P$) | Weekly housing (P$) | Casual weeks to reach from the previous tier (estimate) |
| --- | --- | --- | --- | --- |
| Studio (start) | 1 | free | 286 | n/a |
| One-bed | 2 | 1,500 | 330 | about 3 |
| Bungalow | 4 + garage | 5,000 | 420 | about 6 |
| Two-storey (stretch) | 6 | 12,000 | 560 | about 12 |

These are **starting values for `data/homes.js`**; run `node scripts/economy-report.mjs` and `tests/economy.test.js` before merging, and tune so a casual player keeps at least P$800 a week free after housing at the pay level they typically have by then (P$1,320 a week at entry, P$1,850 at senior, which is what the Two-storey tier assumes). Rules: weekly statement on Friday, accrues only on days played, 3-day arrears cap, no eviction (mood penalty and perks off), autopay after the first on-time payment.

### 6.6 Revenue sanity check (an estimate, not a forecast)

At 100% sell-through of sponsored slots: 24 x 3 x CA$25 + 8 x 2 x CA$50 + 4 x 1 x CA$100 = CA$1,800 + CA$800 + CA$400 = **CA$3,000 a week**. At 15% sell-through that is about CA$450 a week (about CA$1,950 a month) before Stripe's fee (about 2.9% + CA$0.30 per payment, so a CA$25 ad nets about CA$23.97; verify) and tax. Packs depend entirely on audience: for example 2% of 1,000 monthly active accounts buying one CA$9.99 pack is about CA$200 a month. Advertisers pay for audience; with no real audience the price is a donation. This is why section 7 recommends a founding-advertiser discount and honest real numbers.

---

## 7. Risks and owner questions

### 7.1 Risks

| # | Risk | Likelihood and impact | Mitigation |
| --- | --- | --- | --- |
| 1 | The diorama is art-heavy and we are procedural-only; density stalls or looks samey | High, high | Prefab kit with colour and size variants; district-by-district delivery; hard density and luminance tests define "done"; cut ambient extras, never the tests |
| 2 | No audience means no advertisers; CA$25 looks unjustified | High, high | Do not sell real ads before real weekly actives; founding-advertiser pricing; show real views and taps only; local businesses first; the house-ad fallback keeps boards looking alive without lying |
| 3 | A solo owner cannot moderate ads, plots and chat | Medium, high | Pre-approval for all pictures; narrow restricted categories; 48-hour service level; chat reactive with strict defaults; add a moderator role early; delay M9c if the owner cannot commit time |
| 4 | Legal exposure from UGC, payments, virtual currency, minors | Medium, high | 18+ only, closed-loop currency, capped packs, hosted Stripe, written terms, lawyer review (5.8); do not launch real money until the gate rows are ticked |
| 5 | Economy exploits when a server arrives (local saves are editable; free money faucets) | High, medium | Lossy import capped at P$2,000, server clock and RNG, shift caps, reconciliation, faucet-and-sink dashboard, new-account holds |
| 6 | GitHub Pages terms and headers limit a monetised site | Medium, medium | Move the same build to Cloudflare Pages before real money (ten minutes); Cloudflare in front for CSP and HSTS |
| 7 | Third-party marks in monetised surfaces (Roughriders "Rider" names, "Double-Double", "Mosaic Stadium" as a place name, a credit-union name) | Medium, medium | Rename in M6 before any paid ad appears; keep real geography names only where they are places; disclaimer; no real brand as an employer or venue without clearance |
| 8 | Phones cannot run the diorama and 36 billboard textures | Medium, high | Texture budget, instancing, LOD, adaptive quality, draw-call and triangle assertions in CI, a real-device check in each PR template |
| 9 | Rent and bills create daily-play pressure | Medium, medium | Soft bills: accrue only while playing, 3-day cap, no eviction |
| 10 | Looking too close to Lagos Life (trade dress, names, copy) | Low, high | Concept only: different art, names (Quilt, Council, Prairie Dollars), copy and layout written from scratch; the checklist in section 1 is part of every review |
| 11 | Temptation to fake social proof early ("68k online") | High, high | Counts hidden until real; NPC tags; house ads; a test asserts `online.real === false` renders no number |
| 12 | Stolen cards buying P$, then chargebacks | Medium, medium | Hosted checkout, Stripe's fraud tools, 24-hour hold, caps, claw-back, `owed_cents`, review queue |
| 13 | Clock cheating (client time) before the server | Medium, low | No real money before M8; the server never takes a client time |
| 14 | Bus factor of one owner | Medium, high | Runbooks, MFA everywhere, secrets in vaults, documented restore drill, no knowledge only in a person's head |
| 15 | Realism claims in ECONOMY.md rest on recalled prices (rated M and L confidence) | Medium, low | Verify against live sources before marketing "realistic"; keep the confidence column visible |

### 7.2 Questions only the owner can answer (each with a recommended default)

| # | Question | Why it matters | Recommended default | Blocks |
| --- | --- | --- | --- | --- |
| Q1 | Where are you, and will you operate as a sole proprietor or a corporation? | Stripe country, tax, which privacy law leads, who signs the Terms | Saskatchewan sole proprietor to start, talk to an accountant about incorporating before real money | M7 pilot |
| Q2 | Which backend provider? | Sets the whole M8 build | Supabase Pro in a Canadian region, with Cloudflare in front; Cloudflare Workers is the fallback | M8 |
| Q3 | Which payment provider? | Fees, tax handling, whether the pilot can start | Stripe (Checkout, Payment Links, Stripe Tax). If Stripe is not available to you or you do not want to handle sales tax, use a merchant-of-record such as Paddle | M7 pilot |
| Q4 | What age policy? | Chat, payments, ads and uploads all depend on it | 18+ for every account and every purchase; anonymous single-player stays open and collects nothing; no under-18 accounts | M8 |
| Q5 | Who moderates, and how fast? | A sponsored product without a reviewer is a liability | You, with a 48-hour service level for ads and reports, plus an image-scanning API; appoint a trusted moderator before chat goes live | M9 |
| Q6 | Who may advertise, and which categories are banned? | Brand safety and law | Any adult with a verifiable website or social page and an email; local (Saskatchewan) businesses get a free "Local" badge; ban the 5.7 list including all political ads; no real candidates or the real mayor | M7 pilot |
| Q7 | Pilot pricing and bundles for the first advertisers? | The game has no audience yet | A founding rate of CA$15 / CA$30 / CA$60 (60% of list) for the first 10 advertisers, locked for 3 months, with honest copy that player numbers are early; list price CA$25 / 50 / 100; optional 4-week bundle at 20% off | M7 pilot |
| Q8 | Do you want to start taking real advertiser money before accounts exist (manual Stripe Payment Link pilot)? | It earns early and tests demand but adds manual work and legal duties | Yes, but only after the 5.8 rows marked pilot (1 to 5 and 14) are done; otherwise skip to M9c | M7 |
| Q9 | Do real-money packs ship at launch of accounts? | Highest risk feature | No: ship accounts earn-only first; turn packs on after 4 weeks of server economy data and the legal gate; keep the caps in ECONOMY.md | M8 |
| Q10 | Do you want sponsored phone apps and branded venues as products? | A third ad surface in the Lagos photos; needs more review and pricing | Not before M9c is stable; revisit with real advertiser demand | M9d |
| Q11 | Who owns a custom domain, and which name? | Cookies, email, Stripe, Cloudflare, trust | Buy a `.ca` domain for the game now; `reginalife` plus an API subdomain; if unavailable, a close variant | M7 |
| Q12 | Do you want to sell to Quebec and outside Canada? | French-language and consumer rules; tax | Canada and the US at launch, English only; get advice before targeting Quebec | M8 |
| Q13 | Soft or hard bills? | Realism versus daily-play pressure | Soft: accrue only while playing, 3-day cap, no eviction | M5 |
| Q14 | Stay on GitHub Pages after real money starts? | Pages' terms restrict commercial sites | Stay through M7; move the same build to Cloudflare Pages before M8's real-money launch | M8 |
| Q15 | Do you want to register on Lagos Life yourself and record the missing flows? | We only saw logged-out pages and your six photos; the checkout, plot selection, home editor, pack prices and run-for-governor flow are unseen | Yes, you do it personally (we will not create accounts or enter payment details): screen-record up to, but not including, paying or uploading; read their Terms first (they may restrict automation). Useful clips: ad checkout up to the Pay button, sea-plot rectangle selection, the home editor tools, the buy-currency list, the governor run flow | optional, improves M6 to M9 |
| Q16 | What is your weekly time budget for owner tasks (reviews, support, moderation, accounting)? | Decides how fast M9 can responsibly ship | 3 to 5 hours a week from M7; if less, delay M9c and keep the manual pilot small | M7 |
| Q17 | Hosting and tool budget for the first 6 months? | Chooses tiers and moderation API volume | Up to CA$80 a month all-in (platform about US$25, domain, email, moderation API in cents per image, error tracking free tier); verify prices | M8 |
| Q18 | One city or several? | The owner's photos show city tabs | Regina only through M9; Moose Jaw as the first second city after M9 | backlog |
| Q19 | Analytics: what may we measure? | Needed to tune the economy and to give advertisers honest numbers | Cookieless page analytics plus opt-in gameplay telemetry (shift length, spend by category); no third-party trackers ever | M7 |
| Q20 | Real Regina businesses sponsoring in-world venues at their real locations? | Brand and legal risk | Only through boards and Quilt plots until Q10 says otherwise | M9d |
