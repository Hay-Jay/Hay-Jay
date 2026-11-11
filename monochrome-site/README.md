# monochrome.com.ng

Static site for MONOCHROME® (no build step). Serve the folder with any static host, or open `index.html`.
Go-live steps are in [`DEPLOY.md`](DEPLOY.md).

## Files
- `index.html`, `styles.css`, `main.js` — the site
- `hero3d.js` — the 3D chrome object (Three.js, bundled in `assets/vendor/`)
- `config.js` — site settings (the Shopify store address)
- `data/products.js` — snapshot of the Shopify catalogue (products, photos, sizes, variants, prices in CAD)
- `scripts/sync-products.mjs` — refreshes that snapshot: `node scripts/sync-products.mjs`
- `../.github/workflows/sync-products.yml` — runs the sync every morning once this is on the default branch
- `deploy/_redirects.example` — old-link redirects to use after the store moves
- `404.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `netlify.toml` — error page, SEO, app manifest, host headers

## How it works
- Products come from `data/products.js`, not a live request, because the store does not allow other sites to read its feed.
- Add to bag links go to `<storeUrl>/cart/<variantId>:1` on Shopify, which adds that exact size and colour to the cart.
- The drop-alert form posts to the store's customer form (`<storeUrl>/contact`) with the tag `newsletter`.
- Prices are shown in CAD, the store's base currency. Change `CURRENCY` / `LOCALE` at the top of `main.js` if that changes.
