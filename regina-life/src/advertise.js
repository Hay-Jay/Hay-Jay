/**
 * The Advertise page (advertise.html, docs/AMAZING.md R1 and R2): book a billboard with a live preview of your ad on it, the founding prices, how
 * booking works, honest notes, the ad rules, and the Support section with the Supporters' Mural. "Book and pay" checks the booking, then shows
 * PayPal's own buttons (PayPal, or a debit or credit card) to pay into the owner's PayPal account, with the ad attached to the payment
 * (core/checkout.js, data/sponsors.js PAYPAL). The PayPal script loads only here, only once the owner has set a Client ID; until then a booking
 * goes out by email (a mailto: CONTACT_URL), or the page says booking opens soon. ?board=<id> (from a sign in the game) picks the board.
 */
import './theme.css';
import './advertise.css';
import { drawBillboard } from './world/boardArt.js';
import { THEMES, BILLBOARDS, BOARD_BY_ID } from './data/billboards.js';
import { SPONSOR_TIERS, SUPPORT_TIERS, CONTACT_URL, SUPPORT_URL, PAYPAL } from './data/sponsors.js';
import { safeUrl, muralNames } from './core/sponsors.js';
import { validateBooking, adOrder, paypalReady, paypalSdkUrl, paidInFull, boardTier, bookingEmail, validateSupport, supportOrder } from './core/checkout.js';
import { dayKey } from './core/daily.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let theme = 'prairie';

const preview = () => {
  const biz = $('adv-biz').value.trim() || 'Your Business', text = $('adv-text').value.trim() || 'Your line goes here', link = safeUrl($('adv-url').value.trim());
  drawBillboard($('adv-preview'), { text, theme, sponsored: true, business: biz, host: link?.host ?? 'yourbusiness.ca', founding: $('adv-founding').checked }, { tier: 'standard' }, THEMES);
  $('adv-url-note').textContent = $('adv-url').value.trim() && !link ? 'Links must start with https:// and point to a website name (not an IP address).' : '';
};
$('adv-themes').innerHTML = Object.entries(THEMES).map(([k, [a, b]]) => `<button type="button" data-theme="${k}" class="${k === theme ? 'on' : ''}" style="background:linear-gradient(135deg,${a},${b})" aria-label="${esc(k)} colours"></button>`).join('');
$('adv-themes').addEventListener('click', (e) => { const b = e.target.closest('[data-theme]'); if (!b) return; theme = b.dataset.theme; $('adv-themes').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); preview(); });
$('adv-form').addEventListener('input', () => { preview(); summary(); $('adv-pay').hidden = true; });   // a changed booking needs a fresh check before paying

/* ---- PayPal: the SDK loads only when the owner has set it up, and only when someone is ready to pay ---- */
const ready = paypalReady(PAYPAL); let sdk = null;
const loadPayPal = () => (sdk ||= new Promise((res, rej) => { const el = document.createElement('script'); el.src = paypalSdkUrl(PAYPAL); el.onload = () => (window.paypal ? res(window.paypal) : rej(new Error('no paypal'))); el.onerror = () => { sdk = null; rej(new Error('load failed')); }; document.head.appendChild(el); }));
/** Show PayPal's buttons in `box` for one order; `paid(capture, inFull)` runs once the money is captured. */
async function showPay(box, makeOrder, cad, note, paid) {
  box.hidden = false; box.innerHTML = '<p class="muted small">Loading secure payment…</p>';
  try {
    const paypal = await loadPayPal(); box.innerHTML = '';
    await paypal.Buttons({ style: { layout: 'vertical', shape: 'pill', label: 'pay', height: 44 },
      createOrder: (d, actions) => actions.order.create(makeOrder()),
      onApprove: async (d, actions) => { const cap = await actions.order.capture(); paid(cap, paidInFull(cap, cad)); },
      onCancel: () => { note.textContent = 'Payment cancelled. Nothing was charged.'; },
      onError: () => { note.textContent = 'The payment didn\'t go through, and nothing was charged. Please try again.'; } }).render(box);
  } catch { box.innerHTML = '<p class="muted small">The payment buttons couldn\'t load. Check your connection and try again.</p>'; }
}

/* ---- booking: pick a board (the sign you tapped in the game comes preselected), then pay on the owner's checkout ---- */
const today = dayKey(Date.now()), asked = new URLSearchParams(location.search).get('board');
$('adv-board').innerHTML = SPONSOR_TIERS.map((t) => `<optgroup label="${esc(t.name)} · CA$${t.cad} / 7 days">${BILLBOARDS.filter((b) => b.adTier === t.id).map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</optgroup>`).join('');
if (asked && BOARD_BY_ID[asked]) { $('adv-board').value = asked; requestAnimationFrame(() => $('book').scrollIntoView({ behavior: 'smooth', block: 'start' })); }
$('adv-start').min = today; $('adv-start').value = today;
const contactMail = /^mailto:[^\s@]+@[^\s@]+\.[^\s@?]+$/.test(CONTACT_URL) ? CONTACT_URL : null;
const summary = () => {
  const t = boardTier($('adv-board').value);
  $('adv-sum').innerHTML = t ? `<b>CA$${t.cad}</b> for 7 days · ${esc(t.name)}` : '';
  $('adv-book').textContent = ready ? 'Book and pay' : contactMail ? 'Send booking request' : 'Booking opens soon';
  $('adv-book').disabled = !ready && !contactMail;
};
const field = { board: 'adv-board', business: 'adv-biz', text: 'adv-text', url: 'adv-url', email: 'adv-email', start: 'adv-start' };
$('adv-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = validateBooking({ board: $('adv-board').value, business: $('adv-biz').value, text: $('adv-text').value, url: $('adv-url').value, email: $('adv-email').value, start: $('adv-start').value, theme, founding: $('adv-founding').checked }, today);
  for (const id of Object.values(field)) $(id).classList.toggle('bad', false);
  if (!r.ok) { for (const k of Object.keys(r.errors)) $(field[k])?.classList.add('bad'); $('adv-book-note').textContent = Object.values(r.errors).join(' '); return; }
  const mail = bookingEmail(contactMail, r.booking), bk = r.booking;
  if (ready) {
    $('adv-book-note').textContent = `Pay CA$${bk.tier.cad} below with PayPal or a debit or credit card.`;
    showPay($('adv-pay'), () => adOrder(bk, Date.now().toString(36)), bk.tier.cad, $('adv-book-note'), (cap, full) => {
      $('adv-form').innerHTML = `<div class="adv-paid"><div class="adv-paid-ic">🎉</div><h3>Paid. Thank you!</h3><p>Your ad for <b>${esc(bk.business)}</b> is booked on <b>${esc(BOARD_BY_ID[bk.board].name)}</b> from ${bk.start} to ${bk.end}. A person reviews it within two days and writes to <b>${esc(bk.email)}</b>. If we can't run it, you get a full refund.</p><p class="muted small">PayPal reference: ${esc(cap?.id ?? '')}${full ? '' : '. We\'ll double-check this payment and be in touch.'}</p></div>`;
    });
    return;
  }
  if (mail) { $('adv-book-note').textContent = 'Opening your email with the booking filled in. We reply with a payment link once we have reviewed your ad.'; location.href = mail; return; }
  $('adv-book-note').textContent = 'Booking opens soon. Nothing was sent or charged.';
});
preview(); summary(); document.fonts?.ready?.then(preview);

$('adv-tiers').innerHTML = SPONSOR_TIERS.map((t) => `<div class="adv-tier"><h3>${esc(t.name)}</h3><div class="adv-price">CA$${t.cad}<small> / 7 days</small></div><p>${esc(t.boards)}</p><p class="muted small">${esc(t.share)}</p></div>`).join('');

const contact = safeUrl(CONTACT_URL) ?? (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACT_URL) ? { href: CONTACT_URL } : null);
const selling = ready;
$('adv-contact').innerHTML = contact
  ? `<p class="muted small">Questions first, or want a longer run? <a href="${esc(contact.href)}" target="_blank" rel="noopener">Get in touch</a>. We usually reply within two days.</p>`
  : selling ? '' : '<div class="adv-soon"><b>Booking opens soon.</b> We\'re setting up founding-advertiser bookings now. Check back shortly.</div>';

/* ---- support: pick a tier, add the name for the mural, pay on the owner's checkout (or their support page) ---- */
const support = safeUrl(SUPPORT_URL); let supTier = null;
$('adv-support').innerHTML = SUPPORT_TIERS.map((t) => {
  return `<div class="adv-tier sup"><h3>${esc(t.name)}</h3><div class="adv-price">CA$${t.cad}</div><p>${esc(t.blurb)}</p>${ready ? `<button class="adv-btn alt" type="button" data-sup="${t.id}">Support</button>` : ''}</div>`; }).join('')
  + (ready ? '' : support ? `<a class="adv-btn alt" href="${esc(support.href)}" target="_blank" rel="noopener">Support Regina Life</a>` : '<div class="adv-soon">Support opens soon.</div>');
$('adv-support').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sup]'); if (!b) return; supTier = SUPPORT_TIERS.find((t) => t.id === b.dataset.sup);
  $('sup-form').hidden = false; $('sup-pay').hidden = true; $('sup-title').textContent = supTier.name; $('sup-name-l').hidden = !supTier.mural; $('sup-sum').innerHTML = `<b>CA$${supTier.cad}</b>`; $('sup-note').textContent = '';
  $('sup-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); (supTier.mural ? $('sup-name') : $('sup-email')).focus();
});
$('sup-form').addEventListener('input', () => { $('sup-pay').hidden = true; });
$('sup-form').addEventListener('submit', (e) => {
  e.preventDefault(); const r = validateSupport({ tier: supTier?.id, name: $('sup-name').value, email: $('sup-email').value });
  if (!r.ok) { $('sup-note').textContent = Object.values(r.errors).join(' '); return; }
  if (!ready) return; const sp = r.support; $('sup-note').textContent = `Pay CA$${sp.tier.cad} below with PayPal or a card.`;
  showPay($('sup-pay'), () => supportOrder(sp, Date.now().toString(36)), sp.tier.cad, $('sup-note'), (cap) => {
    $('sup-form').innerHTML = `<div class="adv-paid"><div class="adv-paid-ic">💛</div><h3>Thank you!</h3><p>${sp.tier.mural ? `<b>${esc(sp.name)}</b> goes up on the Supporters' Mural with the next update of the game.` : 'You just helped keep Regina Life growing.'} A receipt is on its way to <b>${esc(sp.email)}</b>.</p><p class="muted small">PayPal reference: ${esc(cap?.id ?? '')}</p></div>`;
  });
});
const names = muralNames();
$('adv-mural').innerHTML = names.length ? `<h3>The Supporters' Mural</h3><p>${names.map((n) => `<span>${esc(n.name)}</span>`).join('')}</p>` : '<p class="muted small">The mural is waiting for its first names.</p>';
