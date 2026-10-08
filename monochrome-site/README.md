# monochrome.com.ng

Static site for MONOCHROME® (no build step). Open `index.html` or serve the folder with any static host.

- `index.html` / `styles.css` / `main.js` — the site
- `assets/` — emblem and wordmark
- `../.github/workflows/sync-products.yml` — refreshes the product snapshot every day (runs once this branch is on the default branch)
- `data/products.js` — snapshot of the Shopify catalogue; refresh with `node scripts/sync-products.mjs`
- `404.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `netlify.toml` — error page, SEO, installable-app manifest and host config

## Config (top of `main.js`)
- `STORE_URL` — the Shopify storefront used for product pages, cart and checkout
- `CURRENCY` / `LOCALE` — must match the store's currency
- `FALLBACK` — products shown if the live `/products.json` feed is unreachable

## Deploying
The Shopify store currently owns `monochrome.com.ng`. To serve this site there, host it on
Netlify / Cloudflare Pages / GitHub Pages, point the domain's DNS at that host, and move the
Shopify store to a subdomain (for example `shop.monochrome.com.ng`), then update `STORE_URL`.
Shopify's `/products.json` feed must allow cross-origin requests from the new domain for live
products to load; otherwise the fallback list is shown.
