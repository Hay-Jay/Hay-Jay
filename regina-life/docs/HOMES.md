# Multi-room homes (design and contract)

Status: in progress (milestone M5 of `docs/VISION.md`, first slice). This file is the single source of truth for the work packages;
`src/data/homes.js` is the shared data contract (read its header first).

## 1. What the player gets

You start in the **Studio** (today's Unit 204, unchanged). From the phone's **Homes** app you can move up:

| Tier | Rooms | Moving cost | What changes |
| --- | --- | --- | --- |
| Studio | 1 (`main`) | free | Exactly today's apartment. |
| One-bedroom | 2: `living`, `bedroom` | $1,500 | The Studio room becomes the living room; a bedroom (with the bed, wardrobe and an en-suite shower) opens to the north through a doorway. |
| Bungalow | 4 + garage: `living`, `bedroom`, `bath`, `den`, `garage` | $5,000 total ($3,500 from the One-bedroom) | Separate bathroom, a den (home office / guest room), a garage with the **Storage** shelf and a car, a yard around the house. |

Rules of the move:
* Price to reach tier T from tier S is `price[T] - price[S]` (cumulative "home value": 0 / 150,000 / 500,000 cents), so skipping a tier costs the same in total. No downgrades in this slice.
* **Nothing is ever deleted.** Every placed piece that still fits (same x, z, rot, validated by the new layout's rules) stays where it is; the rest goes to storage ("+N in storage"). Owned items, owned paints/floors, balance and everything else carry over untouched.
* The living room of every tier has the **same floor rectangle as the Studio** and the same front door, so a Studio's decor keeps its coordinates.
* Each room has its own wall paint and floor (Design shelf: pick a room, then a swatch). Choosing a style with "All rooms" selected sets every room (today's behaviour).
* The Home dollhouse view and build mode show the whole house with a **cutaway** (partition walls at waist height); walking around inside uses full walls and ceilings. Build mode has a Walls button: Up / Cutaway / Down.
* Moving costs money once; **there is no rent yet** (see `docs/ECONOMY.md`: no bills exist). Rent and bills are a separate later slice.

Out of scope for this slice (do not build): free-form wall drawing, second storeys or basements, fixtures as catalogue items, undo/redo, starter kits, the dog, rent, a separate house door on the street map (every tier is entered through the existing home door; only the entry toast changes).

## 2. State

```js
state.home = {
  owned: {}, placed: [{ id, type, x, z, rot }],      // as today
  wall: 'cream', floor: 'oak',                        // the default style of every room without an override (as today)
  walls: ['cream', ...], floors: ['oak', ...],        // owned styles (as today)
  layout: 'studio',                                   // NEW: 'studio' | 'onebed' | 'bungalow' (missing/unknown means 'studio')
  rooms: {},                                          // NEW: per-room overrides { [roomId]: { wall?: key, floor?: key } }
}
```
Old saves have neither new field and must load as a Studio with identical furniture and balance (tested). `sanitize()` drops unknown room ids, unknown or unowned styles, items outside every room's place rect, items overlapping a wall, and enforces the layout's `maxPlaced`.

## 3. Layout schema (see the header of `src/data/homes.js`)

`rooms[]` (floor rect to the wall faces; place rect = floor inset by `INSET` 0.45), `walls[]` (axis-aligned centre-lines, `WALL_T` 0.2, optional `doors: [{ at, w }]` where `at` is the coordinate along the wall and `w` the opening width), `entry` (front door leaf, spawn, exit), `fixtures[]` (built-ins with a `kind`, pose and room), `decor[]`, `windows[]`, `ceilingLights[]`, `pointLights[]`, and optionally explicit `collide[]`, `keepout[]`, `keyPoints[]` (the Studio lists the legacy constants; other layouts get them derived from `FIXTURE_KINDS` by `core/lot.js`).

Layout design constraints (Work package A):
* One-bedroom: `living` = the Studio room. `bedroom` is to the north: floor `{x0:-4.5, z0:-10.7, x1:4.5, z1:-5.7}`; the old north exterior wall (z -5.6) becomes a partition with one doorway; new exterior north wall at z -10.8.
* Bungalow: `living` = the Studio room, plus `bedroom`, `bath`, `den`, `garage`; footprint at most 20 x 17 m and at most 1.3:1 in either direction (it must stay readable on a phone in portrait); every room reachable from the entrance through doorways; the garage is entered from the living room or den and has a roller-door wall facing the street (decorative); the `yard` is scenery around the footprint, not walkable.
* Every fixture's collide rect lies inside its room's place rect expanded by 0.5 (fixtures may hug walls), no two collide rects overlap, no collide rect blocks a doorway, and every key point is inside a room and not inside any collide rect.
* Front door, spawn and exit are identical to the Studio in every tier.
* Per-tier `maxPlaced`: 60 / 85 / 110.

## 4. Work packages and ownership (files are exclusive per package)

**A. Data and rules (pure, no THREE).** Owns: `src/data/homes.js` (extends), `src/core/lot.js` (new), `src/core/home.js`, `src/core/sanitize.js`, `src/core/store.js` (default state only), `src/data/furniture.js` (only to keep the legacy `ROOM/KEEPOUT/FIXTURES/KEY_POINTS` exports and add per-room-aware helpers if needed), tests.
API (names are the contract):
```js
// core/lot.js
lotOf(layoutOrId) -> { layout, bbox, rooms:[{...room, place}], walls:[rect...] (solid runs, doors excluded), collide, keepout, keyPoints, grid:{x0,z0,cols,rows}, baseline:Set }   // cached per layout id
roomAt(layout, x, z) -> roomId | null        // by place rect
validateLayout(layout) -> { ok, errors: string[] }   // used by tests for every layout in HOMES
planMove(state, tierId) -> { ok, error?, price, carried: n, stored: n, items: [{ id, type, kept: bool }] }
upgradeHome(store, tierId) -> { ok, error?, price, carried, stored }   // validated, debits the ledger, switches layout, re-validates every placed piece, commits 'home'
tierOptions(state) -> [{ id, name, blurb, tier, rooms, area, price (from the current tier), current, owned (lower tier), canAfford, planned: { carried, stored } }]
// core/home.js (existing exports keep working; they become layout-aware through state.home.layout)
canPlace(s, type, x, z, rot, ignoreId), accessibleKeys(s), repairHome(store), setStyle(store, kind, key, roomId = null), styleOf(state, roomId) -> { wall, floor }
BASELINE_KEYS / ROOM / KEEPOUT / FIXTURES / KEY_POINTS stay exported for the Studio (old tests keep passing unchanged).
```
Walkability generalises to any layout: a grid over the layout bbox (0.25 m cells, player radius 0.38); blocked cells = wall runs + fixture collide rects + placed solid furniture; doorways are open; a placement is refused if it makes any baseline key point (including ones beyond a doorway) unreachable from the entrance, and a piece must lie fully inside one room's place rect.

**B1. Data-driven interior builder with Studio parity.** Owns: `src/world/homeBuilder.js` (new), `src/world/interiors.js` (the apartment branch only), `tests/home-builder.test.js`. Replaces the hard-coded apartment code with `buildHome(layout, kit)` where `kit` is the set of closure helpers `buildInterior` already has (add, box, mat, blob, point, ceilingLight, windowPane, label, colliders, interactables, animated, lights, ceilMeshes, windows, disposables, group). Registry `FIXTURE_BUILDERS[kind](pose, kit, opts)` builds each fixture at its pose (local geometry rotated by `rot`), adds its collider and its `uses` interactables (`action` -> handler). Builds floors per room (per-room floor material), exterior and partition walls (with doorways: collider runs between doors, visual wall pieces plus a lintel above the door), decor, windows, lights. **Studio must look and behave identically** (see 6). Exposes on the interior: `layout`, `rooms`, `setHome(home)` (per-room wall paint and floor, placed furniture, usable placed gear), `setWallMode(mode)` is added in B2.

**B2. New content and cutaway.** Owns: `src/world/homeBuilder.js` additions, `src/world/homeKinds.js` (new fixture builders), tests. New fixture kinds for the new layouts (toilet and vanity, dining set, kitchen island, guest bed, office desk, garage shelf with the Storage use, car, garage door), the yard (lawn ring, fence, a tree or two, a path) outside the footprint, `interior.setWallMode('up' | 'cut' | 'down')` (up = full walls and ceiling; cut = partition and near exterior walls at 0.9 m, ceiling hidden; down = floors only), and floating room name labels (flat decals on the floor) toggled with the mode.

**C. UI, camera, phone and the move flow.** Owns: `src/ui/build.js`, `src/ui/build.css`, `src/ui/catalogue*.js/css` (Design shelf room chips only), `src/ui/apps.js` (new `Homes` app), `src/player/cameraRig.js`, `src/main.js`, `index.html` (build bar button), `scripts/smoke.mjs` (new steps), `tests/*` for those. Requirements: build camera fits the whole layout bbox (centre and height from the layout; works in portrait), floor grid per room (`gridLines` takes a list of place rects), `#b-walls` button cycling wall modes, Design shelf shows "All rooms" plus one chip per room (`[data-act="room"][data-id]`) and applies `setStyle(..., roomId)`, phone app `homes` listing `tierOptions` with a **Move in** button per tier (`[data-move="onebed"]`) that confirms the price and what carries over, `ctx.ui.moveHome(tierId)` in main.js: fade out, `upgradeHome`, rebuild the cached apartment interior for the new layout, respawn at the entrance, fade in, toast the layout title; the computer menu gets a "Homes" entry; the dollhouse lawn disc scales to the layout; new `__regina` debug fields (`layout`, `rooms`).

## 5. Hard rules for every package
* The economy stays server-portable: no UI file computes prices or validity; the UI only calls `core/` functions and shows their results.
* No fake data, no copied art/text from other games; names are Regina-flavoured and original.
* Do not break old tests: `tests/catalogue.test.js`, `tests/review.test.js`, `tests/life.test.js` assert the Studio constants and must keep passing (edit a test only when its assumption genuinely changes, and say why in the commit message).
* Commit early and often on your branch with clear messages (agents get cut off by usage limits; uncommitted work is lost).
* Run `npx vitest run` before every commit. The full `node scripts/smoke.mjs` takes about 25 minutes (software GL renders about one frame per second): do NOT run it; use small scripts in `.scratch/` (gitignored) driven by Playwright against `npx vite` instead (see `.scratch/cat.mjs`, `.scratch/place.mjs` for the pattern: start vite on a free port, launch chromium with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-sandbox`, block `api.open-meteo.com`, click New life, `__regina.store.state.flags = { disableEvents: true }`, call `__regina.enterInterior('apartment')`, wait with `waitForFunction` rather than fixed sleeps).
* In worktrees there is no `node_modules`: `ln -s /home/user/Hay-Jay/regina-life/node_modules node_modules` inside the worktree's `regina-life/` directory (do not commit it; it is ignored).

## 6. Verification
* **Studio parity (B1):** before touching `interiors.js`, capture baseline screenshots of the Studio from the current code (overhead build view and the walking view from the spawn, at 1100x680, with `__regina.settleBuildCam()` for the overhead one, fixed time `__regina.setTime('2026-10-10T18:00:00Z')`); after the refactor capture them again and compare numerically (pixel diff script in `.scratch/`, report the percentage of differing pixels and view both images). Interactables of the Studio must be identical in id, position, radius and label (assert in a test by instantiating `buildInterior('apartment')` in vitest with jsdom if possible, or by a browser script dumping them before and after).
* **Rules (A):** property-style tests: for every layout in `HOMES`, `validateLayout` is ok, baseline keys are all reachable, random placements never make a key point unreachable, `sanitize(upgrade(save))` is stable (idempotent), moving up never deletes an owned item or loses money beyond the price, old fixtures from the M3/M4 saves load unchanged.
* **Visual (B2/C):** top-down screenshots of each tier furnished (Home view and build mode) viewed and described honestly, desktop 1100x680 and phone 390x780.
