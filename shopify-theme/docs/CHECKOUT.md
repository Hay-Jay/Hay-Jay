# Checkout in the MONOCHROME look

Shopify runs the checkout and payment pages itself. Themes cannot change them. On the Basic plan, checkout styling through the API is only for Shopify Plus, so these settings have to be set by hand in the checkout editor. It takes about five minutes, and nothing here changes how payments or orders work.

1. In Shopify admin, open **Settings → Checkout** and click **Customize** next to the checkout that is in use.
2. In the editor, open **Settings** (the gear or brush icon in the left bar), then **Branding**. Shopify sometimes renames these menus, but the fields stay the same.
3. Fill in the fields below, then click **Save**.

| Field | Value | Why |
|---|---|---|
| Logo | `docs/checkout/wordmark-black.png` | The distressed MonoChrome wordmark in black, for the white checkout. |
| Logo size | Medium (or about 240 px wide) | The wordmark is long and thin. |
| Logo position | Left | Matches the header on the site. |
| Main area background | `#FFFFFF` | Plain white "paper". |
| Order summary background | `#E8E8E8` | The light grey paper colour used across the site. |
| Accent / links / focus | `#0A0A0A` | Black ink. |
| Buttons (background) | `#0A0A0A` | Black buttons like "Add to bag". |
| Buttons (text) | `#F6F6F6` | Off-white text. |
| Errors | `#B00020` | A dark red that is still readable. |
| Corner radius | None / 0 | The site uses square corners everywhere. |
| Heading font | **Big Shoulders Display** (if it isn't listed, choose **Oswald**) | The condensed headline font of the site. |
| Body font | **Courier Prime** | The typewriter font of the site. |

If the editor has a header background setting, keep it white so the black logo shows. For a black header, use `docs/checkout/wordmark-white.png` as the logo instead.

## Undo

The editor keeps the previous version until you save. To go back to Shopify's default look later, clear each field above and save.

## Order confirmation emails

These are themed separately under **Settings → Notifications → Customize email templates**. You can upload the same black logo there and set the accent colour to `#0A0A0A`.
