// A small Shopify emulator on LiquidJS: renders the theme's templates against the real catalogue so Liquid can be tested locally.
// It is deliberately loud: unknown filters, tags and missing snippets throw or are listed in `warnings`.
import { Liquid, Tokenizer } from 'liquidjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { loadCatalogue, sortProducts } from './lib/catalogue.mjs';
import { parseShopifyJson, DEFAULT_THEME_DIR, handleize, md5_12, readJson } from './lib/util.mjs';
import { Warnings } from './lib/warnings.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isNamed = a => Array.isArray(a) && a.length === 2 && typeof a[0] === 'string';
const named = args => Object.fromEntries(args.filter(isNamed));
const positional = args => args.filter(a => !isNamed(a));
const money = c => '$' + (Number(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export class Shop {
  constructor({ themeDir = DEFAULT_THEME_DIR, catalogue = loadCatalogue(), cart = null } = {}) {
    this.themeDir = themeDir;
    this.cat = catalogue;
    this.warnings = new Warnings();
    this.cart = cart || { items: [], note: '', attributes: {} };
    this.posted = false;
    this.locale = existsSync(join(themeDir, 'locales/en.default.json')) ? readJson(join(themeDir, 'locales/en.default.json')) : {};
    this.schemaCache = new Map();
    this.#buildDrops();
    this.#buildEngine();
  }

  // ------------------------------------------------------------------ drops
  #image(im, p) {
    const d = { id: im.id, src: im.src, url: im.src, width: im.width, height: im.height, alt: im.alt, position: im.position, product_id: p.id, aspect_ratio: im.width / im.height, key: im.key, 'attached_to_variant?': false, variants: [] };
    d.image = d; return d;
  }
  #buildDrops() {
    const cat = this.cat;
    this.productDrops = new Map();
    for (const p of cat.products) {
      const images = p.images.map(im => this.#image(im, p));
      const variants = p.variants.map(v => ({
        id: v.id, title: v.title, option1: v.option1, option2: v.option2, option3: v.option3, options: v.options,
        price: v.price, compare_at_price: v.compare_at_price, available: v.available, sku: v.sku, barcode: v.barcode,
        inventory_quantity: v.inventory_quantity, inventory_management: v.inventory_management, inventory_policy: v.inventory_policy,
        weight: v.weight, weight_unit: v.weight_unit, requires_shipping: v.requires_shipping, taxable: v.taxable, position: v.position,
        featured_image: v.image_index != null ? images[v.image_index] : null, url: `/products/${p.handle}?variant=${v.id}`, selected: false,
        unit_price: null, unit_price_measurement: null, 'requires_selling_plan': false, selling_plan_allocations: [], 'incoming?': false, quantity_rule: { min: 1, max: null, increment: 1 }
      }));
      const prices = variants.map(v => v.price);
      const comp = variants.map(v => v.compare_at_price).filter(Boolean);
      const first = variants.find(v => v.available) || variants[0];
      const d = {
        id: p.id, handle: p.handle, title: p.title, type: p.type, vendor: p.vendor, tags: p.tags, description: p.description, content: p.description,
        url: `/products/${p.handle}`, price: Math.min(...prices), price_min: Math.min(...prices), price_max: Math.max(...prices), price_varies: Math.min(...prices) !== Math.max(...prices),
        compare_at_price: comp.length ? Math.max(...comp) : null, compare_at_price_min: comp.length ? Math.min(...comp) : 0, compare_at_price_max: comp.length ? Math.max(...comp) : 0, compare_at_price_varies: false,
        available: variants.some(v => v.available), variants, options: p.options.map(o => o.name),
        options_with_values: p.options.map(o => ({ name: o.name, position: o.position, values: o.values, selected_value: o.values[0] })),
        images, featured_image: images[0] || null, featured_media: images[0] ? { ...images[0], media_type: 'image', preview_image: images[0] } : null,
        media: images.map(im => ({ ...im, media_type: 'image', preview_image: im })), 'has_only_default_variant': variants.length === 1 && /default title/i.test(variants[0].title),
        published_at: new Date(p.published_at), created_at: new Date(p.created_at), updated_at: new Date(p.published_at), 'gift_card?': !!p.gift_card, template_suffix: p.template_suffix || '',
        selected_or_first_available_variant: first, first_available_variant: first, selected_variant: null, requires_selling_plan: false, selling_plan_groups: [],
        'quantity_price_breaks_configured?': false, metafields: new Proxy({}, { get: () => new Proxy({}, { get: () => null }) }), 'in_stock?': variants.some(v => v.available)
      };
      for (const v of variants) v.product = d;
      for (const im of images) im.variants = variants.filter(v => v.featured_image === im);
      this.productDrops.set(p.handle, d);
    }
    this.collectionDrops = new Map();
    for (const c of cat.collections) {
      const products = c.handles.map(h => this.productDrops.get(h)).filter(Boolean);
      this.collectionDrops.set(c.handle, {
        id: c.id, handle: c.handle, title: c.title, url: `/collections/${c.handle}`, description: c.description, products, products_count: products.length, all_products_count: products.length,
        image: null, featured_image: null, default_sort_by: 'manual', sort_by: 'manual', sort_options: [{ name: 'Featured', value: 'manual' }, { name: 'Price, low to high', value: 'price-ascending' }, { name: 'Price, high to low', value: 'price-descending' }],
        filters: [], 'empty?': !products.length, template_suffix: '', all_tags: [], tags: [], all_types: [], current_type: null, current_vendor: null
      });
    }
    for (const p of this.productDrops.values()) p.collections = [...this.collectionDrops.values()].filter(c => c.products.includes(p) && c.handle !== 'all');
  }

  collectionsProxy() {
    const m = this.collectionDrops;
    return new Proxy(m, { get: (t, k) => typeof k === 'string' ? (t.get(k) || { handle: k, title: k, url: `/collections/${k}`, products: [], products_count: 0, 'empty?': true, image: null }) : undefined });
  }
  /** all_products[handle]: like Shopify, only 20 different handles per page render; the 21st and later are errors. */
  allProductsProxy() {
    const m = this.productDrops, seen = new Set();
    return new Proxy(m, { get: (t, k) => {
      if (typeof k !== 'string') return undefined;
      if (!seen.has(k)) {
        seen.add(k);
        if (seen.size > 20) { this.warnings.error('liquid', `all_products: more than 20 different handles on one page (Shopify returns an error from '${k}' on)`); return null; }
      }
      return t.get(k) || null;
    } });
  }

  cartDrop() {
    const items = this.cart.items.map((it, i) => {
      const p = this.productDrops.get(it.handle), v = p.variants.find(x => x.id === it.variant_id);
      const img = v.featured_image || p.featured_image;
      return {
        key: `${it.variant_id}:${i}`, id: it.variant_id, variant_id: it.variant_id, product_id: p.id, handle: p.handle, title: `${p.title}${v.title && !/default title/i.test(v.title) ? ' - ' + v.title : ''}`,
        product_title: p.title, variant_title: /default title/i.test(v.title) ? null : v.title, quantity: it.quantity, price: v.price, original_price: v.price, final_price: v.price,
        line_price: v.price * it.quantity, original_line_price: v.price * it.quantity, final_line_price: v.price * it.quantity, url: `/products/${p.handle}?variant=${v.id}`,
        image: img, featured_image: img, options_with_values: p.options_with_values.map((o, oi) => ({ name: o.name, value: v.options[oi] })), vendor: p.vendor, sku: v.sku,
        properties: it.properties || {}, discounts: [], line_level_discount_allocations: [], line_level_total_discount: 0, selling_plan_allocation: null, unit_price_measurement: null,
        'gift_card?': p['gift_card?'], product: p, variant: v, requires_shipping: v.requires_shipping, index: i, 'product_has_only_default_variant': p.has_only_default_variant
      };
    });
    const total = items.reduce((s, i) => s + i.final_line_price, 0);
    return { items, item_count: items.reduce((s, i) => s + i.quantity, 0), total_price: total, original_total_price: total, items_subtotal_price: total, total_discount: 0, total_weight: 0, note: this.cart.note, attributes: this.cart.attributes, currency: { iso_code: 'CAD', symbol: '$', name: 'Canadian dollar' }, requires_shipping: true, cart_level_discount_applications: [], 'empty?': !items.length, checkout_charge_amount: total, discount_applications: [] };
  }

  // ------------------------------------------------------------------ settings and schema
  settings() {
    const out = {};
    const schemaFile = join(this.themeDir, 'config/settings_schema.json');
    if (existsSync(schemaFile)) for (const g of readJson(schemaFile)) for (const s of g.settings || []) if (s.id && s.default !== undefined) out[s.id] = s.default;
    const dataFile = join(this.themeDir, 'config/settings_data.json');
    if (existsSync(dataFile)) { const d = readJson(dataFile); Object.assign(out, d.current && typeof d.current === 'object' ? d.current : {}); }
    for (const k of Object.keys(out)) {
      if (typeof out[k] === 'string' && /^shopify:\/\/shop_images\//.test(out[k])) out[k] = null;
    }
    // pickers: product / collection / page settings arrive as handles
    return new Proxy(out, { get: (t, k) => (k in t ? this.#resolvePickers(k, t[k]) : null) });
  }
  #resolvePickers(k, v) {
    if (typeof v === 'string' && /^(product|collection):/.test(v)) return null;
    return v;
  }

  sectionSchema(type) {
    if (this.schemaCache.has(type)) return this.schemaCache.get(type);
    const f = join(this.themeDir, 'sections', type + '.liquid');
    let schema = null;
    if (existsSync(f)) {
      const m = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/.exec(readFileSync(f, 'utf8'));
      if (m) { try { schema = parseShopifyJson(m[1], f); } catch (e) { this.warnings.error('schema', e.message, { file: `sections/${type}.liquid` }); } }
    }
    this.schemaCache.set(type, schema);
    return schema;
  }

  #resolveSettingValue(def, value) {
    if (value === undefined) value = def.default;
    switch (def.type) {
      case 'product': return typeof value === 'string' ? (this.productDrops.get(value) || null) : null;
      case 'collection': return typeof value === 'string' ? (this.collectionDrops.get(value) || null) : null;
      case 'image_picker': return null;
      case 'url': return value ?? '';
      case 'checkbox': return value === undefined ? false : !!value;
      case 'range': case 'number': return value === undefined ? null : value;
      case 'richtext': case 'text': case 'textarea': case 'inline_richtext': case 'html': return value ?? '';
      default: return value ?? null;
    }
  }
  #settingsFor(defs, given = {}) {
    const out = {};
    for (const d of defs || []) if (d.id) out[d.id] = this.#resolveSettingValue(d, given[d.id]);
    for (const k of Object.keys(given)) if (!(k in out)) out[k] = given[k];
    return out;
  }

  // ------------------------------------------------------------------ the engine
  #buildEngine() {
    const shop = this;
    const liquid = this.liquid = new Liquid({
      root: [this.themeDir], partials: [join(this.themeDir, 'snippets')], extname: '.liquid', cache: false,
      strictFilters: true, strictVariables: false, jsTruthy: false, ownPropertyOnly: false, dateFormat: '%b %d, %Y', orderedFilterParameters: true,
      globals: {}
    });

    // app blocks ({% render block %}) cannot render here: they become a visible comment
    const base = liquid.options.fs, fix = t => t.replace(/\{%-?\s*render\s+block\s*-?%\}/g, '<!-- app block -->');
    liquid.options.fs = { ...base, readFile: async f => fix(await base.readFile(f)), readFileSync: f => fix(base.readFileSync(f)) };

    // ---- filters
    const f = (n, fn) => liquid.registerFilter(n, fn);
    const asset = n => `/cdn/shop/t/1/assets/${n}?v=1`;
    f('asset_url', n => { if (!existsSync(join(shop.themeDir, 'assets', n))) shop.warnings.error('asset', `asset_url: assets/${n} does not exist`); return asset(n); });
    f('file_url', n => `/cdn/shop/files/${n}`);
    f('asset_img_url', n => asset(n));
    f('stylesheet_tag', url => `<link href="${url}" rel="stylesheet" type="text/css" media="all">`);
    f('script_tag', url => `<script src="${url}" type="text/javascript"></script>`);
    f('preload_tag', function (url, ...a) { const n = named(a); return `<link rel="preload" href="${url}" as="${n.as || 'style'}"${n.type ? ` type="${n.type}"` : ''}${n.crossorigin !== undefined ? ' crossorigin' : ''}>`; });
    f('img_url', function (im, ...a) { shop.warnings.warn('deprecated', 'img_url is deprecated: use image_url'); return imageUrl(im, ...a); });
    const imageUrl = (im, ...a) => {
      if (!im) return '';
      const n = named(a), pos = positional(a);
      let w = n.width ?? pos[0];
      const key = im.key || (im.src ? md5_12(im.src) : null);
      if (!key) return String(im.src || im);
      return `/photos/${key}.jpg${w ? `?width=${w}` : ''}`;
    };
    f('image_url', (im, ...a) => imageUrl(im, ...a));
    f('image_tag', function (url, ...a) { const n = named(a); return `<img src="${url}" alt="${esc(n.alt || '')}"${n.class ? ` class="${n.class}"` : ''}${n.width ? ` width="${n.width}"` : ''}${n.loading ? ` loading="${n.loading}"` : ''}>`; });
    f('money', c => money(c));
    f('money_with_currency', c => money(c) + ' CAD');
    f('money_without_currency', c => (Number(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    f('money_without_trailing_zeros', c => { const v = Number(c || 0) / 100; return '$' + (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { minimumFractionDigits: 2 })); });
    f('handleize', s => handleize(s)); f('handle', s => handleize(s));
    f('pluralize', (n, a, b) => (Number(n) === 1 ? a : b));
    f('link_to', (t, url, title) => `<a href="${url}"${title ? ` title="${esc(title)}"` : ''}>${t}</a>`);
    f('within', (u, col) => `/collections/${col.handle}${u}`);
    f('default_errors', () => 'Please check the form.');
    f('url_param_escape', s => encodeURIComponent(s));
    // Shopify's Ruby Liquid divides integers as integers (7 | divided_by: 2 is 3); LiquidJS would give 3.5
    f('divided_by', function (a, b) { const t = this.token && this.token.args && this.token.args[0]; const raw = t && t.getText ? t.getText() : String(b); const isInt = v => /^-?\d+$/.test(String(v).trim()); const x = Number(a), y = Number(b); if (!y) throw new Error('divided by 0'); return isInt(a) && isInt(raw) ? Math.floor(x / y) : x / y; });
    f('format_code', c => String(c || '').replace(/(.{4})/g, '$1 ').trim());
    f('payment_button', () => '<div class="shopify-payment-button"><button class="shopify-payment-button__button" type="button">Buy it now</button></div>');
    f('payment_terms', () => '');
    f('time_tag', (d, fmt) => `<time datetime="${new Date(d).toISOString()}">${new Date(d).toDateString()}</time>`);
    f('weight_with_unit', w => `${w} g`);
    f('format_address', () => '');
    f('t', function (key, ...a) {
      const parts = String(key).split('.');
      let v = shop.locale; for (const p of parts) v = v && v[p];
      if (typeof v !== 'string') { shop.warnings.warn('translation', `missing translation: ${key}`); return `translation missing: en.${key}`; }
      const n = named(a); return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (n[k] ?? ''));
    });
    f('color_to_rgb', c => c); f('color_modify', c => c); f('font_face', () => ''); f('font_url', () => ''); f('font_modify', () => '');
    f('structured_data', o => JSON.stringify(o));
    f('placeholder_svg_tag', () => '<svg class="placeholder-svg" viewBox="0 0 100 100"></svg>');
    f('external_video_tag', () => ''); f('media_tag', () => ''); f('video_tag', () => '');
    f('customer_login_link', t => `<a href="/account/login">${t}</a>`);
    f('sum', (a, p) => (a || []).reduce((s, x) => s + Number(p ? x[p] : x), 0));
    f('reject', (a, p, v) => (a || []).filter(x => (v === undefined ? !x[p] : x[p] !== v)));
    f('find', (a, p, v) => (a || []).find(x => x[p] === v));
    f('has', (a, p, v) => (a || []).some(x => (v === undefined ? !!x[p] : x[p] === v)));
    f('at_least', (n, m) => Math.max(n, m)); f('at_most', (n, m) => Math.min(n, m));
    f('base64_encode', s => Buffer.from(String(s)).toString('base64'));
    f('md5', s => md5_12(s)); f('sha256', s => md5_12(s));
    f('hmac_sha256', s => md5_12(s));
    f('escape_once', s => esc(String(s).replace(/&amp;/g, '&')));
    f('highlight', s => s); f('highlight_active_tag', s => s);
    f('item_count_for_variant', () => 0); f('line_items_for', () => []);
    f('product_img_url', (im, ...a) => imageUrl(im, ...a)); f('img_tag', (u, alt) => `<img src="${u}" alt="${esc(alt || '')}">`);
    f('stylesheet_tag_noscript', u => u);
    f('currency_selector', () => ''); f('format_price', c => money(c));

    // ---- helpers shared by tags
    const evalExpr = function* (ctx, src) { return yield liquid.evalValue(src, ctx); };
    const splitArgs = src => {
      const out = []; let depth = 0, q = null, cur = '';
      for (const ch of src) {
        if (q) { cur += ch; if (ch === q) q = null; continue; }
        if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
        if ('([{'.includes(ch)) depth++; if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) out.push(cur.trim());
      return out;
    };
    const readBlock = (tag, tagToken, remain, end, collect) => {
      tag.tpls = []; tag.raw = [];
      const stream = tag.liquid.parser.parseStream(remain)
        .on('tag:' + end, () => stream.stop())
        .on('template', t => tag.tpls.push(t))
        .on('end', () => { throw new Error(`tag ${tagToken.getText()} not closed`); });
      stream.start();
    };

    // ---- raw-ish blocks
    for (const [name, end] of [['schema', 'endschema'], ['javascript', 'endjavascript'], ['stylesheet', 'endstylesheet']]) {
      liquid.registerTag(name, {
        parse(token, remain) {
          this.parts = [];
          while (remain.length) {
            const t = remain.shift();
            if (t.kind === 4 /* TAG */ && t.name === end) return;
            this.parts.push(t.raw ?? t.input?.slice(t.begin, t.end) ?? '');
          }
          throw new Error(`tag ${token.getText()} not closed`);
        },
        render() { return name === 'stylesheet' ? `<style>${this.parts.join('')}</style>` : name === 'javascript' ? `<script>${this.parts.join('')}</script>` : ''; }
      });
    }
    liquid.registerTag('style', {
      parse(token, remain) { readBlock(this, token, remain, 'endstyle'); },
      *render(ctx, emitter) { emitter.write('<style data-shopify>'); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); emitter.write('</style>'); }
    });
    liquid.registerTag('layout', { parse(token) { this.arg = token.args.trim(); }, render(ctx) { shop.layoutOverride = /^none$/i.test(this.arg) ? null : this.arg.replace(/['"]/g, ''); return ''; } });

    // ---- {% form %}
    liquid.registerTag('form', {
      parse(token, remain) { this.args = splitArgs(token.args); readBlock(this, token, remain, 'endform'); },
      *render(ctx, emitter) {
        const type = String((yield evalExpr(ctx, this.args[0])) ?? '');
        const opts = {}; let obj;
        for (const a of this.args.slice(1)) {
          const m = /^([\w-]+)\s*:\s*([\s\S]+)$/.exec(a);
          if (m && !/^["']/.test(a)) opts[m[1]] = yield evalExpr(ctx, m[2]); else obj = yield evalExpr(ctx, a);
        }
        const actions = { customer: '/contact#contact_form', contact: '/contact#contact_form', product: '/cart/add', create_customer: '/account', customer_login: '/account/login', recover_customer_password: '/account/recover', guest_login: '/account/login', activate_customer_password: '/account/activate', reset_customer_password: '/account/reset', customer_address: '/account/addresses', new_comment: '/blogs/news/comments', storefront_password: '/password', localization: '/localization', currency: '/cart/update' };
        if (!(type in actions)) shop.warnings.error('tag', `form: unknown form type '${type}'`);
        const posted = shop.posted === true;
        const form = { id: opts.id || (type === 'product' ? `product-form-${obj?.id ?? ''}` : 'contact_form'), 'posted_successfully?': posted, errors: null, email: '', name: '', body: '', phone: '', 'password_needed': false, product: obj, type };
        emitter.write(`<form method="post" action="${actions[type] || '/'}" id="${esc(form.id)}" accept-charset="UTF-8"${opts.class ? ` class="${esc(opts.class)}"` : ''}${type === 'product' ? ' enctype="multipart/form-data"' : ''}${opts.novalidate ? ' novalidate="novalidate"' : ''}>`);
        emitter.write(`<input type="hidden" name="form_type" value="${type}"><input type="hidden" name="utf8" value="✓">`);
        ctx.push({ form });
        yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
        ctx.pop();
        emitter.write('</form>');
      }
    });

    // ---- {% paginate collection.products by 24 %}
    liquid.registerTag('paginate', {
      parse(token, remain) { const m = /^([\s\S]+?)\s+by\s+(\d+)\s*(?:window_size:\s*\d+)?\s*$/.exec(token.args); if (!m) throw new Error('paginate: bad syntax ' + token.args); this.expr = m[1]; this.by = +m[2]; readBlock(this, token, remain, 'endpaginate'); },
      *render(ctx, emitter) {
        const m = /^([\w.\[\]'"-]+)\.(\w+)$/.exec(this.expr.trim());
        const full = yield evalExpr(ctx, this.expr);
        const items = Array.isArray(full) ? full : [];
        const page = Math.max(1, Number(shop.query?.page || 1));
        const pages = Math.max(1, Math.ceil(items.length / this.by));
        const slice = items.slice((page - 1) * this.by, page * this.by);
        const pag = { current_page: page, current_offset: (page - 1) * this.by, page_size: this.by, pages, items: items.length, parts: [], previous: page > 1 ? { title: 'Previous', url: `?page=${page - 1}`, is_link: true } : null, next: page < pages ? { title: 'Next', url: `?page=${page + 1}`, is_link: true } : null };
        for (let i = 1; i <= pages; i++) pag.parts.push(i === page ? { title: String(i), is_link: false } : { title: String(i), url: `?page=${i}`, is_link: true });
        const scope = { paginate: pag };
        if (m && /^[\w-]+$/.test(m[1])) {
          const owner = yield evalExpr(ctx, m[1]);
          if (owner && typeof owner === 'object') scope[m[1]] = { ...owner, [m[2]]: slice };
        } else shop.warnings.warn('paginate', `paginate over '${this.expr}' is not sliced by the emulator (only <variable>.<property> is)`);
        ctx.push(scope);
        yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
        ctx.pop();
      }
    });

    // ---- {% section 'x' %} and {% sections 'group' %}
    liquid.registerTag('section', {
      parse(token) { this.arg = token.args.trim(); },
      *render(ctx, emitter) { const name = String(yield evalExpr(ctx, this.arg)); emitter.write(yield shop.renderSectionFile(name, name, null, ctx.environments, { global: true })); }
    });
    liquid.registerTag('sections', {
      parse(token) { this.arg = token.args.trim(); },
      *render(ctx, emitter) { const name = String(yield evalExpr(ctx, this.arg)); emitter.write(yield shop.renderGroup(name, ctx.environments)); }
    });
    liquid.registerTag('content_for', { parse(token) { this.arg = token.args; }, render() { return ''; } });
  }

  // ------------------------------------------------------------------ sections
  async renderSectionFile(type, id, data, env, { group = null, global = false } = {}) {
    const file = join(this.themeDir, 'sections', type + '.liquid');
    if (!existsSync(file)) { this.warnings.error('section', `section '${type}' not found`, { file: `sections/${type}.liquid` }); return `<!-- missing section ${type} -->`; }
    const schema = this.sectionSchema(type) || {};
    let given = data?.settings || {}, blocksIn = data?.blocks || {}, order = data?.block_order || Object.keys(blocksIn);
    if (global && !data) { const sd = readJson(join(this.themeDir, 'config/settings_data.json'), {}).current?.sections?.[id]; if (sd) { given = sd.settings || {}; blocksIn = sd.blocks || {}; order = sd.block_order || Object.keys(blocksIn); } }
    const settings = this.#settingsFor(schema.settings, given);
    const blocks = [];
    for (const bid of order) {
      const b = blocksIn[bid]; if (!b || b.disabled) continue;
      if (typeof b.type === 'string' && b.type.startsWith('shopify://apps/')) { blocks.push({ id: bid, type: '@app', settings: b.settings || {}, shopify_attributes: '' }); continue; }
      const def = (schema.blocks || []).find(x => x.type === b.type);
      if (!def) this.warnings.error('schema', `block type '${b.type}' is not declared in sections/${type}.liquid`, { file: `sections/${type}.liquid` });
      blocks.push({ id: bid, type: b.type, settings: this.#settingsFor(def?.settings, b.settings || {}), shopify_attributes: `data-shopify-editor-block="${bid}"` });
    }
    const section = { id, settings, blocks, blocks_size: blocks.length, index: 1, index0: 0, 'first': true, last: true, location: group ? 'group' : 'template', type };
    const html = await this.liquid.renderFile(`sections/${type}`, { section });
    const cls = `shopify-section${group ? ' shopify-section-group-' + group : ''}`;
    return `<div id="shopify-section-${id}" class="${cls}">${html}</div>`;
  }
  async renderGroup(name, env) {
    const file = join(this.themeDir, 'sections', name + '.json');
    if (!existsSync(file)) { this.warnings.error('section', `section group '${name}' not found`); return ''; }
    const g = readJson(file); let out = '';
    for (const sid of g.order || Object.keys(g.sections)) {
      const s = g.sections[sid]; if (!s) continue;
      out += await this.renderSectionFile(s.type, `sections--1__${sid}`, s, env, { group: name });
    }
    return out;
  }

  // ------------------------------------------------------------------ pages
  globals({ template, product, collection, page, search, handle, query = {}, path = '/' } = {}) {
    const cat = this.cat;
    const routes = { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update', cart_clear_url: '/cart/clear', collections_url: '/collections', all_products_collection_url: '/collections/all', search_url: '/search', account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/register', account_logout_url: '/account/logout', predictive_search_url: '/search/suggest', product_recommendations_url: '/recommendations/products', storefront_login_url: '/account/login', localization_url: '/localization' };
    const g = {
      settings: this.settings(), shop: { name: 'Monochrome', url: 'https://monochrome.com.ng', domain: 'monochrome.com.ng', permanent_domain: '744432-aa.myshopify.com', currency: 'CAD', money_format: '${{amount}}', money_with_currency_format: '${{amount}} CAD', description: 'MONOCHROME is a black, white and chrome clothing brand.', email: 'info.mccanada@gmail.com', 'customer_accounts_enabled': true, 'enabled_payment_types': ['visa', 'master'], address: { city: cat.store.city, province: cat.store.province, country: 'Canada' }, shipping_policy: { url: '/policies/shipping-policy', title: 'Shipping policy', body: '' }, refund_policy: { url: '/policies/refund-policy', title: 'Refund policy', body: '' }, privacy_policy: { url: '/policies/privacy-policy', title: 'Privacy policy', body: '' }, terms_of_service: { url: '/policies/terms-of-service', title: 'Terms of service', body: '' }, 'taxes_included': false },
      routes, request: { design_mode: false, page_type: template.name, path, locale: { iso_code: 'en', endonym_name: 'English', root_url: '/' }, host: 'monochrome.com.ng', origin: 'https://monochrome.com.ng' },
      template: { name: template.name, suffix: template.suffix || '', directory: template.name.includes('/') ? template.name.split('/')[0] : null },
      collections: this.collectionsProxy(), all_products: this.allProductsProxy(), cart: this.cartDrop(), customer: null, linklists: new Proxy({}, { get: () => ({ links: [], title: '', handle: '' }) }), pages: new Proxy({}, { get: (t, k) => ({ handle: k, title: String(k), url: `/pages/${String(k)}`, content: '' }) }), blogs: {}, articles: {},
      localization: { country: { iso_code: 'CA', name: 'Canada', currency: { iso_code: 'CAD', symbol: '$' } }, language: { iso_code: 'en', name: 'English' }, available_countries: [], available_languages: [], market: { handle: 'canada', id: 1 } },
      content_for_header: '<script>var Shopify = Shopify || {}; Shopify.shop = "744432-aa.myshopify.com"; Shopify.currency = {"active":"CAD","rate":"1.0"};</script>',
      canonical_url: `https://monochrome.com.ng${path === '/' ? '/' : path}`, page_title: 'Monochrome', page_description: '', current_page: Math.max(1, Number(query.page || 1)), 'powered_by_link': ''
    };
    if (product) g.product = this.productDrops.get(product);
    if (collection) g.collection = this.collectionDrops.get(collection) || this.collectionDrops.get('all');
    if (page) g.page = page;
    if (search) g.search = search;
    return g;
  }

  /** Renders a template ('index', 'product', 'collection.catalog', 'page.about', 'customers/login'...) inside its layout. */
  async renderTemplate(name, opts = {}) {
    this.layoutOverride = undefined;
    this.query = opts.query || {};
    const [base, ...rest] = name.split('.');
    const template = { name: base, suffix: rest.join('.') };
    const g = this.globals({ ...opts, template });
    this.liquid.options.globals = g;
    const jsonFile = join(this.themeDir, 'templates', name + '.json'), liqFile = join(this.themeDir, 'templates', name + '.liquid');
    let content = '', layout = 'theme';
    if (existsSync(jsonFile)) {
      const t = readJson(jsonFile);
      if (t.layout !== undefined) layout = t.layout === false ? null : t.layout;
      for (const sid of t.order || Object.keys(t.sections || {})) {
        const s = t.sections[sid]; if (!s) continue;
        // Shopify names JSON-template sections template--<template id>__<key>; scripts must not assume 'main'
        content += await this.renderSectionFile(s.type, `template--1__${sid}`, s, g, {});
      }
    } else if (existsSync(liqFile)) {
      content = await this.liquid.renderFile(`templates/${name}.liquid`, {});
      if (this.layoutOverride !== undefined) layout = this.layoutOverride;
    } else {
      this.warnings.error('template', `template ${name} not found`);
      return `<!-- template ${name} not found -->`;
    }
    if (!layout) return content;
    const layoutFile = join(this.themeDir, 'layout', layout + '.liquid');
    if (!existsSync(layoutFile)) { this.warnings.error('layout', `layout ${layout} not found`); return content; }
    return this.liquid.renderFile(`layout/${layout}`, { content_for_layout: content });
  }
}

export { sortProducts };
