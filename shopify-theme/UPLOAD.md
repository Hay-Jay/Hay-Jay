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

## Checkout

Shopify's checkout and payment pages can't be themed from here on the Basic plan. `docs/CHECKOUT.md` has the colours, fonts and logo to set in the checkout editor, which takes about five minutes.

## Updating the theme later

Edit the files in `theme/`, run `node tools/pack.mjs`, then either:

- upload `dist/monochrome-classified.zip` as a new theme and publish it, or
- push only the changed files to the unpublished copy.

Do the editing in **Customize** where you can: those changes are kept in the theme itself.
