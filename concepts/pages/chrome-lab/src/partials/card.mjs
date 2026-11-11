import { esc, fmt, pad2, sized, srcset, nb } from '../lib/util.mjs';
import { priceText } from '../lib/store.mjs';

// One product card. Real link to the product page; data-* attributes carry what the shop filter/sort needs so it never needs the catalogue.
export function card(ctx, x, n, { feat = false, sizes = '(min-width:1100px) 25vw, (min-width:760px) 33vw, 50vw', eager = false, extra = '' } = {}) {
  const src = x.main ? x.main.src : '';
  const imgs = src
    ? `<img data-img ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" src="${esc(sized(src, 640))}" srcset="${srcset(src, [400, 640, 900])}" sizes="${sizes}" alt="${esc(x.n)}" width="640" height="800">`
    : `<img data-img class="fallback" src="${ctx.asset('assets/emblem.webp')}" alt="${esc(x.n)}" width="299" height="322">`;
  const alt = x.alt ? `<img class="alt" data-img loading="lazy" decoding="async" src="${esc(sized(x.alt.src, 640))}" srcset="${srcset(x.alt.src, [400, 640, 900])}" sizes="${sizes}" alt="" width="640" height="800">` : '';
  const tag = x.avail ? (x.isNew ? '<span class="tag">NEW</span>' : '') : '<span class="tag">SOLD OUT</span>';
  return `<a class="card${feat ? ' feat' : ''}${x.avail ? '' : ' sold'}" href="${ctx.href(`products/${x.h}/`)}" data-h="${esc(x.h)}" data-cat="${x.t}" data-price="${x.p}" data-pub="${x.pub}" data-rank="${x.rank}" data-avail="${x.avail ? 1 : 0}" data-ord="${x.ord}"${extra}>
      <div class="pic">
        ${imgs}
        ${alt}
        <span class="idx">${pad2(n + 1)}</span>
        ${tag}
      </div>
      <div class="info"><b>${nb(x.n)}</b>
        <span class="meta"><span class="price">${priceText(x, fmt)}</span>${x.sizes.length ? `<span class="sizes">${x.sizes.slice(0, 6).map(s => `<i>${esc(s)}</i>`).join('')}</span>` : ''}</span>
      </div>
    </a>`;
}
