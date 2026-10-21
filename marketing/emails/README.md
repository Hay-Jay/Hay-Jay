# The Vision Issue: launch emails

Three emails in the Monochrome Bureau dossier style, ready to import into **Shopify Email → Code your own**. The files to import are in `dist/`. Their images are already on Shopify's CDN (in Content → Files, named `vision-issue-email-…`).

| File | When | To | What |
|---|---|---|---|
| `dist/01-t-minus-24.html` | **Today, Saturday**, after the countdown post (13:00–15:00 Regina) | All email subscribers | PRIORITY TRANSMISSION, T-MINUS 24 HOURS, an animated split-flap clock, the four city times, the sealed cover in its evidence bag. Buttons: *Watch it hit zero* (countdown page) and *Pre-order — $10 CAD* (product). |
| `dist/02-declassified.html` | **Sunday 18 October, 12:00 Regina**, scheduled | All email subscribers | A paper dossier: the CLASSIFIED stamp is struck through and DECLASSIFIED slams on (animated), then OUT NOW, what's inside, the specs and *Requisition your copy*. |
| `dist/03-final-transmission.html` | **Wednesday 21 October**, morning | Subscribers who haven't bought the magazine (see below) | "Your copy is still in evidence." A short, truthful reminder with the declassified file and the button. |

## Subject lines and preview text

**01 · T-minus 24**
- Subject (pick one): `PRIORITY TRANSMISSION: 24 hours.` · `Sealed until Sunday, 12:00.` · `The Vision Issue declassifies in 24 hours`
- Preview text: `Sunday 18 October, 12:00 Regina. Pre-orders are open.`

**02 · Declassified**
- Subject: `DECLASSIFIED: The Vision Issue is out` · `The file is open.` · `MONOCHROME Magazine, Volume 001, out now`
- Preview text: `Twenty pages, printed. $10 CAD, ships to 29 countries.`

**03 · Final transmission**
- Subject: `Your copy is still in evidence.` · `Final transmission: The Vision Issue` · `Still unread?`
- Preview text: `The Vision Issue is out. Your printed copy is one click away.`

## Sending one (about 3 minutes each)

1. Shopify admin → **Marketing → Campaigns → Create campaign → Shopify Email**.
2. Choose **Code your own** (on a computer; it isn't available on a phone).
3. Click **Import** and choose the file from `dist/`, or open the file, copy everything, and paste it into the code box.
4. Set the subject line and preview text from above. The sender stays your store's.
5. **Recipients:** all subscribers. For email 03, build a customer segment first (Customers → Segments) for subscribers who haven't bought the magazine. In plain terms, it's "accepts email marketing and has not purchased MONOCHROME Magazine — The Vision Issue (Print)". The segment editor suggests the exact filter as you type `products_purchased`.
6. **Send test** to yourself. Open it on your phone and check that the clock animates and the buttons go to the right pages.
7. **Schedule:** 01 now or this afternoon. 02 for **Sunday 18 October 12:00** in your store's time zone (Regina). 03 for Wednesday.

### If Shopify flags anything

- The code uses `{{ unsubscribe_url }}` for the unsubscribe link and `{{ open_tracking_block }}` for open tracking (Shopify asked for this name), both of which Shopify requires. If the editor asks for `{{ unsubscribe_link }}` instead, replace the one occurrence in the footer.
- The greeting reads "Agent Ada," using the subscriber's first name, or just "Agent," when there isn't one.

## How they're made

- `make_emails.py` writes `src/` with `__IMG__` placeholders.
- `build.py` writes `dist/` with the hosted image URLs from `img-urls.json`, or from a base URL given on the command line.
- `preview.mjs` renders each email at 600 px, at 375 px (phone) and with images blocked into `previews/` (not in git).

The layout uses tables only, with inline styles and table-cell buttons. Live text uses web-safe fonts (Impact for headings, Courier New for the dossier text); every image has a width, height and alt text, and the cells have dark backgrounds so the emails still read with images off. Each email's HTML is about 10 KB, well under Gmail's 102 KB clipping limit.

The images come from the launch Stories (`../social/src/stories.html`; `?s=3&p=0..1` draws the stamp animation's frames) and from the countdown film's clock (`../countdown-xo`).

## Order confirmation (Shopify notification)

`notifications/order-confirmation.liquid` replaces Shopify's own order confirmation email with one in the same dossier style. It shows the order number as the file number, every item with its photo, size, discounts and a struck-through price when it's free, then the totals, the delivery and billing details and a *View your order* button. Orders that include The Vision Issue also get the VISION10 box.

To install it: Shopify admin → **Settings → Notifications → Customer notifications → Order confirmation → Edit code**. Select everything in the code box, paste the file in, click **Preview**, then **Save**. **Revert to default** on the same screen brings Shopify's version back. The subject line can stay as it is or become `Requisition {{ name }} received`.

`node notifications/preview.mjs` renders it with a sample order (a jersey plus the free magazine) into `previews/`.
