# Putting the new site live

## Already done in your Shopify admin

- **New theme published on 16 October 2026**: "MONOCHROME Classified (new site)", theme id 189220749566, is the live theme. The old one ("Updated copy of Dawn") is in the theme library, unchanged.
- **Backup of the current look**: "PREVIOUS STYLE - backup of the live Dawn theme …" is an exact copy of the live theme, kept in the theme library.
- **Four pages created** for the new site's sections: `about`, `lookbook`, `shipping` and `faq`. Each uses the matching template (`page.about`, `page.lookbook` …). On the old theme they only show one short line of text, and nothing links to them there.
- Your existing pages `contact`, `model` and `model-ambassador` keep their templates. The new theme has a version of each.
- Products, collections, prices, stock, apps, payments and shipping settings were **not changed**.

## Shop-first redesign (29 October 2026): waiting for you to publish

Theme **"MONOCHROME Classified - shop-first (preview)"** (id 189818077438) is an unpublished copy of the live theme, with the redesign uploaded to it. Customers don't see it.

Preview it here: https://monochrome.com.ng/?preview_theme_id=189818077438

**What changed:**
- **Home page:** shop-first:
  - a hero with a photo stack you can flip;
  - "The drop" product grid;
  - shop-by-category tiles;
  - a compact Vision Issue banner;
  - a film-strip lookbook;
  - a signup.

  The objectives, intel and zones sections are off the page (they can be added back in Customize), and so is the "identity verified" intro.
- **Shop page:** a photo grid, with quick add on every card. On phones it's 2 across, on desktop 4.
- **Product page:** a swipeable gallery with zoom; size tabs; a big Add to bag; an Add to bag bar on phones; short fold-out details; related products.
- **Bag:** a cleaner drawer and bag page, with a free-magazine nudge.
  - The nudge appears when a jersey or hoodie is in the bag without The Vision Issue.
  - Turn it off in Customize → Cart (and the drawer) when the offer ends.
- **Menu:**
  - Shop, New in, Lookbook, Vision Issue, About.
  - Search and Bag buttons, with a search that suggests products.
  - A shorter footer.
- **Magazine pop-up:** now a small corner card on desktop and a slim bottom bar on phones. It never shows on the home page, shop, product, bag or lookbook pages.
- **Copy:** about half the words or fewer on every page. The shipping copy matches the store's rates: free standard shipping in Canada over $200 and in the US over $100. The returns copy says exchanges.

**Added on 31 October (round 2):**
- **Home intro "Top Secret File":** a 3-second opening on the home page. A TOP SECRET folder appears, its redactions burn off, DECLASSIFIED is stamped on it, and the cover flips open onto the site.
  - It plays once per visit; any tap or key skips it.
  - It never plays in the theme editor, and visitors who prefer reduced motion get a quick fade instead.
  - Turn it off in Customize → Theme settings → Intro.
  - The other two concepts (vault, identity check) are in marketing/loaders/.
- **"Most Wanted" on the home page:** 4 products shown as wanted posters, instead of the 8-product grid. Pick them in Customize → Most wanted.
- **Restricted-access category tiles:** the redaction bars lift away on hover, on tap, or as the tile scrolls into view.
- **Lookbook strip:** a surveillance-camera look.

**To publish:** Online Store → Themes → "MONOCHROME Classified - shop-first (preview)" → ⋯ → Publish. The current theme moves to the library, so going back is one click (⋯ → Publish on it).

**Don't change the live theme in Customize before publishing.** The preview is a copy taken on 29 October, so later changes to the live theme won't carry over.

Two snippets on the preview are no longer used and can't be deleted through the API: `snippets/mc-figure.liquid` and `snippets/mc-filehead.liquid`. They do nothing. You can delete them in Edit code if you like.

## Look at it before anyone else does

Open https://monochrome.com.ng/?preview_theme_id=189220749566. Only people with that link see the new design. Everything works there, including the bag and checkout, so be careful not to place a real order by accident.

## Publish (one click, done by you)

Shopify does not let apps publish themes, so this step is yours:

1. Go to **Online Store → Themes**.
2. Under **Theme library**, find **MONOCHROME Classified (new site)**.
3. Click **⋯ → Publish**, then confirm.

Then open **Customize → App embeds** on the new live theme and check that Inbox, Shopify Forms and Easify are switched on. They were copied over, but Shopify sometimes asks to confirm them on a new theme.

## Going back

In **Online Store → Themes**, the old theme moves into the library when the new one goes live. Click **⋯ → Publish** on "Updated copy of Dawn" and the old site is back within a minute. The backup copy is there too, untouched.

In this repository, the git tags `previous-style-static-site` and `before-shopify-theme` mark the earlier states of the code.

## Things in your store settings worth a look

Testing on the real store turned these up. They are store content or settings, not the theme, and none of them blocks publishing.

- **Shipping policy is empty** (Settings → Policies). The new site hides links to it until it has text. Once you fill it in, the links appear in the footer and on the Shipping page.
- **Refund policy vs. the returns notes.** The refund policy says "no returns", but the Shipping page and FAQ (copied from the approved design) say to contact you if something doesn't fit. Pick one rule. Either edit the "Returns note" blocks on the Shipping page and FAQ question 6 in Customize, or update the policy.
- **Meet the team page.** Two names have broken links: "Okonkwo Princess" (missing `https://`) and "Blessing Odaware" (the link is text, not a URL). Fix them in Online Store → Pages → MEET THE TEAM.
- **Prices in other currencies.** Shopify Markets shows visitors prices in their own currency (a US visitor sees USD). The site labels them correctly. To show CAD to everyone, turn off local currencies in Settings → Markets.
- **Selling past zero stock** is switched on for most products, so several show negative stock in admin. Only the compass necklace actually shows as sold out. That is a per-product inventory setting.
- **Old app script.** An old size-chart app (teelaunch) still tries to load a missing script on every page, the current site included. It does nothing visible. Removing the app's leftover script tag (or reinstalling and uninstalling the app) clears it.

## The Vision Issue countdown

A launch countdown for the magazine lives at **/pages/vision-issue** (page "The Vision Issue", template `page.vision-issue`). It goes live with the new theme. Until then, preview it at https://monochrome.com.ng/pages/vision-issue?preview_theme_id=189220749566.

- **Launch moment:** Sunday 18 October 2026, 12:00 Regina time (19:00 Lagos, 14:00 Toronto, 19:00 London). It was moved from Saturday 17 October on 17 October. At zero the page declassifies itself: the cover unseals and the button becomes a normal purchase.
  - On 17 October the theme was unpublished for a few minutes so the new date could be uploaded (apps can't write to a live theme), then published again. The template now sets the launch moment explicitly, and the page's own text (Online Store → Pages → The Vision Issue) says Sunday 18 October.
- **Pre-orders** are on. Before the launch the button reads "Pre-order a copy", and the bag line and the order say "Pre-order: Ships from Sunday 18 October". Payment is taken at checkout as usual. To charge later instead, you would need a pre-order app.
- **Sign-ups** from the "Request clearance" box become email subscribers tagged `newsletter` and `vision-issue`.
- **The launch email doesn't send itself.** Schedule it in Shopify Email (Marketing → Create campaign) for Sunday 18 October, 12:00 Regina time. If it was already scheduled for Saturday, move it.
  - Send it to all email subscribers rather than only the `vision-issue` tag. Someone who was already a customer may not pick up the new tag when they sign up again.
- **To change anything** (the date, cities, wording, the log lines, pre-orders on or off, the pre-order note), open Customize, choose the page template "vision-issue" and click the countdown section.
  - The date format is `2026-10-18T12:00:00-06:00`. Regina is `-06:00` all year.
  - The launch line ("Saturday 17 October, 12:00 Regina time"), the evidence tag and the "Declassified Saturday" tape all follow the date and the first city, so moving the launch only needs the one setting.
- **At zero**, without a reload, the page switches: the intro and signup heading change, the calendar links go, the pre-order mark is dropped, and the buy button becomes a normal purchase.
- **Visitors can pause the animation** with the button in the top bar. Phones and computers set to reduce motion get a still page automatically.
- The old theme shows only the page's short text at this address. Nothing links to it there.

## Checkout

Shopify's checkout and payment pages can't be themed from here on the Basic plan. `docs/CHECKOUT.md` has the colours, fonts and logo to set in the checkout editor, which takes about five minutes.

## Updating the theme later

Edit the files in `theme/`, run `node tools/pack.mjs`, then either:

- upload `dist/monochrome-classified.zip` as a new theme and publish it, or
- push only the changed files to the unpublished copy.

Do the editing in **Customize** where you can: those changes are kept in the theme itself.
