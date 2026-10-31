# Putting the site on monochrome.com.ng

Today `monochrome.com.ng` points at the Shopify store, so only one of them can live there. The plan is: the new site takes
`monochrome.com.ng`, and the Shopify store moves to `shop.monochrome.com.ng`. Cart, checkout, product pages, policies and
newsletter signups all stay on Shopify and keep working.

Do the steps in this order so the shop is never down.

## 1. Move the store to a subdomain
1. Shopify admin → **Settings → Domains → Connect existing domain**, enter `shop.monochrome.com.ng`.
2. At the place you manage DNS for `monochrome.com.ng`, add: **CNAME** `shop` → `shops.myshopify.com`.
3. Back in Shopify, wait for the domain to show **Connected**, then **Change primary domain** to `shop.monochrome.com.ng`.
4. Check `https://shop.monochrome.com.ng` loads your store and a test checkout starts.

## 2. Tell the site where the store is
1. In `config.js`, set `storeUrl: "https://shop.monochrome.com.ng"`.
2. Run `node scripts/sync-products.mjs` (refreshes `data/products.js` from the new address).
3. Copy `deploy/_redirects.example` to the site root as `_redirects`, so old links such as `monochrome.com.ng/products/...` forward to the shop.

## 3. Host the site (Cloudflare Pages, free)
1. Merge this branch into `main`.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick this repository.
3. Build settings: framework **None**, build command **empty**, output directory **`monochrome-site`**.
4. After the first deploy, open **Custom domains**, add `monochrome.com.ng` and `www.monochrome.com.ng`, and follow the DNS prompts.
   Cloudflare gives you the exact records; replace the old records that pointed to Shopify (the apex `A` record and `www` CNAME).
5. Visit `https://monochrome.com.ng` and test: product view, Add to bag (should land in the cart on the shop subdomain) and the drop-alert form.

Netlify works the same way (publish directory `monochrome-site`; `netlify.toml` is already included).

## 4. Keep products fresh
`.github/workflows/sync-products.yml` refreshes `data/products.js` every morning and commits it, which triggers a new deploy.
It runs from the default branch, so it starts once this work is merged to `main`.

## Things to check in Shopify
- **Shipping:** Nigeria was added to the "International" zone (General profile) and the "EVERYWHERE" zone (CUSTOM STUFF profile) on the store, using the same Canada Post live rates as the other international countries. Place a test checkout with a Nigerian address and confirm shipping options appear before you announce it.
- **Nigeria market:** a `NIGERIA` market (currency NGN) exists in **Settings → Markets** but is still a draft. Decide whether to activate it. It needs a payment provider that accepts Naira.
- **Newsletter:** the drop-alert form adds the visitor as a customer tagged `newsletter`. Send one test signup with your own email and
  confirm it appears in **Customers**. If you use Shopify Email or Klaviyo, point them at that tag.
- **Currency:** prices show in CAD, the store's base currency.
