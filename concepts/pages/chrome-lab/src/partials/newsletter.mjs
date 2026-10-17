// The drop-alert signup posts straight to the Shopify store's customer form (same contract as the original single page).
export function newsletter(ctx, { id = 'news', label = 'GET DROP ALERTS', cls = '' } = {}) {
  return `<form class="news glass${cls ? ' ' + cls : ''}" id="${id}" method="post" action="${ctx.store('/contact#contact_form')}" data-store-action="/contact#contact_form" target="_blank" rel="noopener">
    <input type="hidden" name="form_type" value="customer">
    <input type="hidden" name="utf8" value="✓">
    <input type="hidden" name="contact[tags]" value="newsletter">
    <label for="${id}-email" class="mono">${label}</label>
    <div class="row">
      <input id="${id}-email" name="contact[email]" type="email" required placeholder="you@email.com" autocomplete="email">
      <button class="btn solid" type="submit">Notify me</button>
    </div>
    <small class="news-note">Signs you up through the Monochrome store. A new tab opens so you can see it go through.</small>
  </form>`;
}
