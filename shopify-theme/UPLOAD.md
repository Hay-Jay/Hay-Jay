# Putting the new site live

## Already done in your Shopify admin

- **New theme uploaded, not published**: "MONOCHROME Classified (new site)", theme id 189220749566. Your current live theme ("Updated copy of Dawn") is untouched, and customers still see it.
- **Backup of the current look**: "PREVIOUS STYLE - backup of the live Dawn theme …" is an exact copy of the live theme, kept in the theme library.
- **Four pages created** for the new site's sections: `about`, `lookbook`, `shipping` and `faq`. Each uses the matching template (`page.about`, `page.lookbook` …). On the old theme they only show one short line of text, and nothing links to them there.
- Your existing pages `contact`, `model` and `model-ambassador` keep their templates. The new theme has a version of each.
- Products, collections, prices, stock, apps, payments and shipping settings were **not changed**.

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

## Checkout

Shopify's checkout and payment pages can't be themed from here on the Basic plan. `docs/CHECKOUT.md` has the colours, fonts and logo to set in the checkout editor, which takes about five minutes.

## Updating the theme later

Edit the files in `theme/`, run `node tools/pack.mjs`, then either:

- upload `dist/monochrome-classified.zip` as a new theme and publish it, or
- push only the changed files to the unpublished copy.

Do the editing in **Customize** where you can: those changes are kept in the theme itself.
