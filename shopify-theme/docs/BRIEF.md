# BRIEF — MONOCHROME® Shopify theme ("Classified")

Everyone working on this theme reads this file first. It is the single source of truth for scope and rules.

## 1. What we are building

The store **monochrome.com.ng** (Shopify, plan Basic, base currency CAD, ships to 29 countries incl. Nigeria and Canada) currently
runs an unmodified Dawn copy. The owner has approved a design prototype: a fictional top-secret "mission dossier" theme
(THE MONOCHROME BUREAU, DIVISION OF WEARABLES, OPERATION: WEAR THE UNKNOWN). It exists as a static site generated from
`/home/user/Hay-Jay/concepts/pages/classified/` (read-only reference; see "Reference" below).

**Job: port that prototype to a real Online Store 2.0 Shopify theme** that looks and behaves the same, but where everything is
live Shopify data (products, prices, photos, descriptions, inventory / sold-out state, collections) and everything that is
copy is editable in the Shopify theme editor. Output goes in `/home/user/Hay-Jay/shopify-theme/theme/` (this folder is zipped
and uploaded as-is, so it may contain ONLY Shopify theme folders: `assets config layout locales sections snippets templates
templates/customers`).

### Owner requirements (their words, condensed)
- R1 Everything stays the same as the prototype: "no major changes as a result of linking it to Shopify". Same look, same pages, same behaviour.
- R2 The brand name text must use the **wordmark image** (distressed "MonoChrome" lettering) and the **emblem** (chrome ring + star), never typeset text. Files: `assets/wordmark.webp`, `assets/emblem.webp` (copy from the prototype's `assets/`).
- R3 Homepage: much less text before the first product (done in the prototype: short cover, products straight after it). Cover photo = the *main (first) photo of a product, product chosen in the theme editor*; default product `white-monochrome-jersey`, photo 1.
- R4 Cart ("a site for it that looks really really nice") on theme: a full cart page AND a slide-in cart drawer, both in the dossier look ("Requisition manifest"). Add to bag must work without leaving the page (AJAX) and open the drawer. Checkout button goes to the normal Shopify checkout (we brand checkout separately with the Admin API; not your job).
- R5 Linked to Shopify: any change the owner makes in Shopify inventory (photos, description, price, sold out, new product) shows on the site automatically. No hard-coded product data anywhere.
- R6 Editable from Shopify: copy and images live in section settings / blocks with the prototype text as defaults in the JSON templates.
- R7 Must keep working: the store's installed apps (Easify product options, Shopify Inbox chat, Shopify Forms, Klarna on-site messaging). See "Store facts".
- R8 The magazine ("MONOCHROME Magazine — The Vision Issue (Print)", product type `Magazine`) gets: its own homepage section, an order pop-up, the `Print` filter in the register. Already designed in the prototype; port it.
- R9 Worldwide shipping content (Nigeria + Canada called out, 29 countries) is kept. Search boxes type their hint phrases ("acid wash", "hoodie", "necklace"...) automatically. Phone layout (`mobile.css`) is part of the design: keep it.
- R10 Quality bar: it is a real shop. Server-rendered Liquid (works without JS), good SEO (titles, meta, JSON-LD Product/BreadcrumbList/Organization/WebSite), accessible (keyboard, focus, aria, reduced motion), fast.

## 2. Reference (read-only; do not edit anything outside `shopify-theme/`)
- `/home/user/Hay-Jay/concepts/pages/classified/` — the prototype.
  - `scripts/build.mjs` — generator: ALL the markup logic (cards, rows, product page, lookbook, about, shipping, ...) is here. Port it function by function.
  - `src/pages/*.html`, `src/partials/*.html` — page and partial templates (`{{var}}` placeholders = values the generator computes).
  - `css/*.css`, `js/*.js` — styles and behaviour. **Reuse the CSS verbatim** (class names and markup must match so the CSS keeps working). Only change what theme-hosting forces (fonts url, asset paths).
  - Rendered output: `index.html`, `shop/index.html`, `products/<handle>/index.html`, `lookbook/ about/ shipping/ faq/ contact/ 404.html`. Open these to see the finished markup.
  - `data/products.js` — snapshot of the store catalogue (what the harness fixture uses).
  - `scripts/sync-products.mjs` — `category()` decides top/bottom/accessory/gift/print from product type/title: port that exact logic.
  - Screenshots can be taken with Playwright (`/opt/pw-browsers/chromium`, args `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Use `viewport 1440x900` and `390x844`.
- The prototype already includes these owner-requested changes (the theme must match THIS version): wordmark image in the header, short home cover, products right after the cover, white-jersey cover, magazine section + pop-up, typing search placeholders, phone layer `css/mobile.css`, Declassify switch in the file index.

## 3. Store facts (from the live store)
- Product types in use: `Rings`, `Necklace`, `Jerseys`, `Hoodies`, `Shirts`, `sweatshirt`, `Cargo Skirt`, `cargo shorts`, `Pants chain`, `Magazine`, empty (acid-washed tees, gift cards, custom jersey, trinity ring). Tags are mostly empty. 24 active products; handles are in `data/products.js`.
- Collections: `frontpage` ("Home page", 9 products, curated by the owner for the homepage), `new-arrivals` (2 products), automatic `all`.
- `CUSTOM MONOCHROME JERSEY` (`custom-monochrome-jersey`) uses the **Easify** app for personalisation. Easify injects line-item `properties[...]` into the product form: keep a standard product form (`<form method="post" action="/cart/add" id="product-form-<section.id>" enctype="multipart/form-data" accept-charset="UTF-8">` with a submit `<button name="add" type="submit">`) and **read FormData at submit time** so those properties are sent. The product template must keep an `@app` block area (see below). Cart lines must display `item.properties`.
- Apps embedded in the live theme (copy these app-embed blocks into `config/settings_data.json` under `current.blocks` exactly):
  - `shopify://apps/inbox/blocks/chat/841fc607-4181-4ad1-842d-e24d7f8bad6b` (settings: button_color #000000, secondary_color #FFFFFF, ternary_color #6A6A6A, button_icon chat_bubble, button_text live_chat, button_horizontal_position bottom_right, button_vertical_position lowest, greeting_message "")
  - `shopify://apps/easify-options/blocks/app-embed-block/d2288b18-c1ba-42f5-b3b3-26c75c8820bf` (no settings)
  - `shopify://apps/forms/blocks/forms/8744a304-fcb1-4347-b211-bb6b4759a76a` (no settings)
  App blocks used inside sections (render them with `{% render block %}` inside a `{% for block in section.blocks %}{% case block.type %}{% when '@app' %}{% render block %}`):
  - Easify product options: `shopify://apps/easify-options/blocks/easify-product-options/d2288b18-c1ba-42f5-b3b3-26c75c8820bf` (placed in the product section of `templates/product.json`, last block; NOT in `product.custom.json` on the live store but harmless to keep in both).
  - Klarna: `shopify://apps/klarna-on-site-messaging/blocks/app-block/b95936a9-74b6-4a95-8103-6a1b6459c25e` in an `apps` section on the product page (settings data_key `credit-promotion-auto-size`, locale_option `geolocation`, theme `dark`, paddings "0") and on the home page (data_key `top-strip-promotion-badge`, theme `default`, paddings "0"). Give the theme an `sections/mc-apps.liquid` section with `{"type":"@app"}` blocks (like Dawn's `apps` section) so these placements are possible.
- Social: Instagram https://www.instagram.com/monochrome.ca/ , TikTok https://www.tiktok.com/@monochrome.ca , Snapchat https://snapchat.com/monochrome.ca . Email info.mccanada@gmail.com . Events: https://www.eventbrite.ca/e/monochrome-fashion-show-2025-black-white-chrome-tickets-1571923969909 and RSVP https://www.eventbrite.ca/e/monochrome-launch-event-tickets-915069827487
- Existing shop pages (do not rely on their body): `contact` (template suffix `contact`), `model` ("Model signup form", suffix `contact`), `model-ambassador` ("MEET THE TEAM", suffix `portfolio`, body = rich text list of names), `monochrome-v14-preview` (old). New pages will be created by the lead with handles `about`, `lookbook`, `shipping`, `faq` and template suffixes of the same name (so provide `templates/page.about.json`, `page.lookbook.json`, `page.shipping.json`, `page.faq.json`, `page.contact.json`, `page.portfolio.json`, `page.json`).
- Existing templates that must exist in the new theme (the store uses them): `product.custom.json` (suffix `custom`), `page.contact.json`, `page.portfolio.json`, `password.json` (+ `layout/password.liquid`; live content: "Opening Soon", email signup, RSVP button), `gift_card.liquid`, `customers/*` (account, activate_account, addresses, login, order, register, reset_password), `blog.json`, `article.json`, `list-collections.json`, `search.json`, `404.json`, `cart.json`, `collection.json`, `index.json`, `product.json`, `page.json`. The store uses "new customer accounts" (Shopify-hosted) so customers/* are only a fallback: keep them simple but on-brand.
- Currency CAD, `money` formats come from the store (`{{ x | money }}`; the prototype shows `$44.99 CAD` — see `mc-price` below).
- Shipping zones (29 countries, regions) are NOT available as a Liquid object. Keep them as an editable multi-line text theme setting `settings.ship_countries` (one `Name|CODE|Region` per line, Nigeria and Canada first, then alphabetical; default = the 29 in `data/products.js` `store.shipsTo`). Footer ticker, home "zones" section, shipping table and product "ships to N countries" all read it.

## 4. HARD RULES
1. Do **not** call any Shopify MCP / Admin API tools. Do not publish, upload or touch the live store in any way. The lead does all store work.
2. Do **not** run `git commit`, `git push` or any git write. Do not edit anything outside `/home/user/Hay-Jay/shopify-theme/` (the prototype is read-only; if you find a prototype bug, write it in `docs/FINDINGS.md`).
3. Own your files (see ownership list in the task). Never edit a file owned by someone else; ask via `docs/REQUESTS.md` (append a line `FROM <you> TO <owner>: <request>`). Shared harness extension code goes in `tools/ext/<yourname>.mjs` (auto-loaded by the harness).
4. No placeholder/lorem content, no TODO stubs left in files. Everything referenced must exist. Every section/snippet/asset you reference must be created.
5. The theme folder must be uploadable: only `assets config layout locales sections snippets templates templates/customers`; file names lowercase, kebab-case; custom files are prefixed `mc-`; max 1 MB per text file; images/fonts allowed in `assets/`.
6. No secrets, no external CDNs/fonts/scripts (everything self-hosted in `assets/`), no inline tracking. Third-party widgets come only from the installed apps.
7. Never expose the word "CIA" or its logo/seal; the Bureau is fictional (footer carries the "work of fiction" line).

## 5. Liquid / Shopify rules (a theme with a syntax or schema error cannot be uploaded)
- Use `{% render 'snippet', a: b %}` (not `include`). Use `image_url` + `image_tag`-style manual `<img>`; never `img_url`.
- JSON templates reference sections by `type` = filename without `.liquid`. Section `{% schema %}` must be valid JSON; setting `id`s unique within a section/block; `type` from the documented list only (text, textarea, richtext, inline_richtext, html, liquid, url, image_picker, product, product_list, collection, collection_list, page, blog, article, link_list, font_picker, color, color_background, select, radio, range, checkbox, number, text_alignment, video_url, video, header, paragraph, ...). `range`: needs min/max/step/default, default within bounds and `(max-min)/step <= 101`. `select`/`radio`: >=2 options, default must be one of them. `product_list`: `limit` <= 50. Section `max_blocks` <= 50. Block types unique; every block `type` used in the JSON templates must exist in that section's schema; every setting id used in a JSON template must exist in the schema.
- Section files must have a `presets` array if the owner should be able to add them in the editor (do that for content sections). Sections used by header/footer groups need no preset.
- `settings_schema.json` must start with the `theme_info` entry; settings ids must match keys used in `settings_data.json` `current`.
- A `layout/theme.liquid` must output `{{ content_for_header }}` in `<head>`, `{{ content_for_layout }}` in body, and render the header group / footer group with `{% sections 'header-group' %}` / `{% sections 'footer-group' %}`. App embeds work through `content_for_header`; keep `<body>` open to JS-injected app widgets.
- Money: `{{ product.price | money }}`; cents integers; `product.price_varies`, `price_min`, `price_max`, `compare_at_price`. Availability `product.available`, `variant.available`. Images: `product.images`, `image.width/height/alt/src`, `image | image_url: width: 640`.
- Escape every user-controlled string (`| escape`) and use `| json` for data embedded in `<script type="application/json">` (and `| replace: '<', '<'` hardening where raw JSON is built by hand).
- Whitespace: use `{%- -%}` liberally; the page must not contain thousands of blank lines.
- `window.MC` bootstrap + CSS/JS loading conventions are defined in `docs/ARCHITECTURE.md` (written by the foundation worker). Follow them.
- Accessibility and no-JS parity with the prototype are required (server-rendered everything; JS only enhances).
- Performance: `loading="lazy"` except the LCP image (`fetchpriority="high"`), `width`/`height` on images, `srcset`, `font-display: swap` fonts preloaded, no layout shift.

## 6. Verification tools (provided by the harness worker; see `docs/HARNESS.md` once written)
A Node + LiquidJS emulator of Shopify renders the theme locally with the real catalogue, serves it with a stateful fake cart API, screenshots it, and diffs it against the prototype. A `theme-check` style linter and a schema validator are available. Use them continuously; do not hand back work that fails them.
