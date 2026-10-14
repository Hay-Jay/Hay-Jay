# MONOCHROME® Classified: the Shopify theme

This is the "Monochrome Bureau" dossier design, built as a real Shopify theme. Everything on it comes from the store: products, photos, prices in CAD, sizes, stock, sold-out marks, collections, pages, cart and checkout. When you change a product in Shopify admin, the site changes with it. The theme itself never needs to be edited for that.

- `theme/` holds the theme files, the same files that are uploaded to Shopify.
- `dist/monochrome-classified.zip` is the same theme as one zip, for **Online Store → Themes → Add theme → Upload zip file**.
- `UPLOAD.md` explains what is already in your Shopify admin and how to publish it or go back to the old site.
- `docs/CHECKOUT.md` lists the checkout colours, fonts and logo to set in the checkout editor.

## What updates by itself

| You change, in Shopify admin | What the site does |
|---|---|
| A product's title, description, price, photos or variants | The register, product dossier, cards, search and command palette update. |
| Stock or availability | The product shows SOLD OUT, its buy button turns into "Requisition denied", sold-out items move to the end of the register, and file numbers (MC-001…) are reissued in stock order. |
| A new product | It appears in the register, filters, search and command palette, with the next file number. Its class (top, bottom, hardware, gift card, print) comes from the product type and title. Add a tag such as `class-top` to choose it yourself. |
| Collections (for example `new-arrivals`) | Products in `new-arrivals` come first in the register. |
| A page's text | Shown on pages that have no section of their own, such as the model-ambassador team page. |
| Gift card denominations | Shown on the gift card dossier and quoted in the FAQ. |
| Policies (Settings → Policies) | Linked from the footer and shown in the dossier style. |

## Editing the site (Online Store → Themes → Customize)

Every text on the site can be edited in the theme editor. Click any section in the left list to change it.

- **Home page**: Cover (briefing), Selected assets, Magazine (Vision Issue), Mission objectives, Intel summary, Delivery zones, Join the network.
  - **Cover → Product** and **Photo number** choose the big photo on the first screen. It is currently the White Monochrome Jersey, photo 1.
  - **Selected assets** has one block per pinned product. Add, remove or reorder blocks to change the evidence board.
- **Product pages**: the Asset dossier, with app blocks for Easify options and Klarna messaging. Products using the `custom` template show the dossier without the Easify block.
- **Pages**: About (four sections, plus "Keep reading" links), Lookbook (one Exhibit block per photo: product, photo number, size, position), Shipping (intro, returns note, protocol steps, size notes), FAQ (one Question block each), Contact.
  - In FAQ answers, `{countries}` becomes the number of countries you ship to and `{giftamounts}` becomes the gift card amounts.
- **Header and footer**: the page links (blocks) and the dossier links at the bottom.

**Theme settings** (the gear icon in the editor):

- **Brand**: upload a new wordmark, emblem or favicon. When left empty, the built-in files are used.
- **Bureau text**: the top banner, the footer notice, and the "identity verified" intro on/off.
- **Contact and social**: email, Instagram, TikTok and Snapchat. An empty field hides that link.
- **Shipping**: the countries list on the shipping page, one `Name|CODE|Region` per line. Shopify decides where you actually ship (Settings → Shipping and delivery); keep this list in step with it.
- **Photos**: which photo leads for a product in the register, one `handle|photo number` per line. For example, `monochrome-sweatshirt|5` because its first photo is mostly black fabric.
- **Magazine pop-up**: on/off, which product, and how many seconds before it appears.
- **Cart**: the shipping line in the bag, and the express checkout buttons (Shop Pay, PayPal…) on product pages.

## Apps kept from the old theme

- Inbox live chat, Shopify Forms (the 10% off sign-up), Easify product options and Klarna messaging still work.
- Their settings are under **App embeds** in the theme editor, or in the app itself.

## For developers

```
cd shopify-theme/tools && npm install          # once
node serve.mjs                                  # local emulator with the store's catalogue on http://localhost:9292
node e2e.mjs                                    # 41 browser checks against the emulator
node check.mjs                                  # Shopify theme-check
ruby liquid-check.rb && node limits.mjs         # Shopify's own Liquid parser + upload limits theme-check misses
node pack.mjs                                   # runs the two checks above, writes dist/monochrome-classified.zip
THEME_ID=<id> node live-crawl.mjs --w 1440,390  # every page of the real store on an unpublished theme, via its preview link
```

- `sync-assets.mjs` copies CSS and JS from the prototype (`concepts/pages/classified`) into `theme/assets/` and applies the theme patches. Edit the prototype or `tools/theme-css/`, then sync.
- `mc-cart.js` and `mc-product.js` are written for the theme and are not synced.
- Lessons from the first real upload, now checked automatically:
  - Shopify silently drops any file with a setting label over 70 characters, or a `url` setting whose default isn't `/collections`.
  - A `{{ }}` output ends at the first `}`.
  - Liquid won't compare a number with text.
  - `all_products[...]` stops after 20 handles per page.
