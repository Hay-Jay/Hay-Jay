# MONOCHROME® — Chrome Lab, multi-page

A real multi-page static site (separate URLs, no client-side router). The folder you are looking at is the deployable site:
upload it to any static host. There is no build step at deploy time.

## Pages

| URL | What it is |
| --- | --- |
| `/` | Home: mercury-blob hero, 4 featured pieces, brand and worldwide teasers, newsletter |
| `/shop/` | All 23 pieces pre-rendered; JS adds category filter + sort (`?c=top\|bottom\|accessory\|gift`, `?s=new\|low\|high`) |
| `/gallery/` | Signature page: the full-screen 3D tunnel (DOM grid when WebGL / reduced motion is off, or with `?view=grid`) |
| `/products/<handle>/` | One page per product (23), same path as the Shopify handle |
| `/about/` `/shipping/` `/faq/` `/contact/` | Editorial glass-panel pages over a calm ambient 3D background |
| `/404.html` `/sitemap.xml` `/robots.txt` | Generated |

## Rebuild

Node 22, no packages.

```sh
node scripts/build.mjs                          # regenerate every page in this folder (clean folder links)
node scripts/build.mjs --preview --out ../pv    # a copy where every folder link is explicit (.../index.html)
python3 -m http.server 8231 --bind 127.0.0.1    # serve this folder
```

`--preview` is for hosts without directory-index handling and for opening the site from `file://` (the 3D scene needs
http(s), so on `file://` the gallery shows its grid). The output folder must be outside this one.

The generated files (`index.html`, `shop/`, `gallery/`, `about/`, `shipping/`, `faq/`, `contact/`, `products/`, `404.html`,
`sitemap.xml`, `robots.txt`, `js/search-index.js`) are committed next to the sources, so hosting just serves the folder.
Re-run the build after changing anything in `src/`, `config.js` or `data/products.js`.

## Where things live

```
config.js               storeUrl (Shopify), siteUrl (canonical / sitemap), basePath (404 page only)
data/products.js        the Shopify product sync (window.MONOCHROME_DATA)
scripts/build.mjs       the generator
src/lib/                store.mjs (cards, ordering, gallery picks, countries), layout.mjs (document shell), util.mjs
src/partials/           header, footer, command bar, card, newsletter, globe (SVG), icons: shared by every page
src/pages/              one module per page type (home, shop, gallery, product, about, shipping, faq, contact, notfound)
css/ js/ assets/        hand-written, served as-is. js/lab3d.js is the one Three.js file (modes: hero | tunnel | ambient | off)
```

## How links work (any base path)

The generator gives every page a relative root prefix (`../`, `../../`) and writes it into the HTML and into
`window.MC = {root, idx}`. All JS-made URLs go through `MC.url('shop/')`, which prepends `root` and, in preview builds,
appends `index.html`. Nothing is root-absolute, so the site works at `/`, at `/some/sub/path/`, or from a zip.
The one exception is `404.html`: a host serves it at the missing URL, so it uses `<base href>` from `basePath` in
`config.js` (default `/`). Set it if the site lives under a sub-path.

## Behaviour notes

- Every product page is server-rendered (title, price, photos, options, JSON-LD). JS makes the option chips pick the variant,
  update price and stock, and point **Add to bag** at `${storeUrl}/cart/${variantId}:1`. Without JS there is a plain
  **Buy on the store** link to `${storeUrl}/products/${handle}`. A sold-out product has no buy link at all.
- Prices are CAD. Shipping claims come from `data.store.shipsTo` (29 destinations, Nigeria and Canada highlighted);
  Canada's free standard shipping is the only rate named, everything else is "calculated at checkout".
- Page-to-page navigation uses cross-document View Transitions (progressive enhancement, off under reduced motion) and
  prefetches same-origin pages on hover, focus and touch. One WebGL context per page; none is kept across navigations.
- The command bar (`/` or Ctrl/Cmd+K, or the Search button) works on every page and can jump to any page, category or piece.
- Newsletter forms post to `${storeUrl}/contact#contact_form` with `form_type=customer`, `utf8=✓`, `contact[tags]=newsletter`.

## Deploy

Netlify, GitHub Pages, Cloudflare Pages, S3 and plain nginx all work: `folder/index.html` gives the clean URLs and
`404.html` is picked up as the not-found page. `netlify.toml` adds security headers and long cache lifetimes for `assets/`.
