// Small helpers shared by the generator. No dependencies.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const pad2 = n => String(n).padStart(2, '0');

// en-US renders CAD as "CA$59.00", which is unambiguous for shoppers outside Canada.
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' });
export const fmt = v => money.format(v);

// Shopify's CDN resizes on request (and turns HEIC uploads into JPEG). Always ask for a width.
export const sized = (src, w) => (!/^https?:/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}width=${w}`);
export const isHeic = src => /\.heic(\?|$)/i.test(src);

export const srcset = (src, widths) => widths.map(w => `${esc(sized(src, w))} ${w}w`).join(', ');

// "CUSTOM MONOCHROME JERSEY" -> "Custom Monochrome Jersey" (only when the store title is all caps).
export const tidy = t => {
  if (t !== t.toUpperCase() || !/[A-Z]/.test(t)) return t;
  return t.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
};

// Words with a hyphen ("T-SHIRT", "LONG-SLEEVE") never break at the hyphen.
export const nb = t => esc(t).split(' ').map(w => (w.includes('-') ? `<span class="nb">${w}</span>` : w)).join(' ');

export const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// JSON that is safe inside <script type="application/json">
export const jsonScript = (id, obj) => `<script type="application/json" id="${id}">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export const trim = (s, n) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > n * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[,.;:\-–—\s]+$/, '') + '…';
};
