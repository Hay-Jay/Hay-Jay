/**
 * The Advertise page (advertise.html, docs/AMAZING.md R1 and R2): a live preview of a real business's ad on an in-game billboard, the founding
 * prices, how booking works, honest notes, the ad rules, and the Support section with the Supporters' Mural. No payment runs here: the contact and
 * support links are the owner's own pages (data/sponsors.js), and until they are set the page says so instead of showing a dead button.
 */
import './theme.css';
import './advertise.css';
import { drawBillboard } from './world/boardArt.js';
import { THEMES } from './data/billboards.js';
import { SPONSOR_TIERS, CONTACT_URL, SUPPORT_URL } from './data/sponsors.js';
import { safeUrl, muralNames } from './core/sponsors.js';

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
$('adv-form').addEventListener('input', preview); $('adv-form').addEventListener('submit', (e) => e.preventDefault());
preview(); document.fonts?.ready?.then(preview);

$('adv-tiers').innerHTML = SPONSOR_TIERS.map((t) => `<div class="adv-tier"><h3>${esc(t.name)}</h3><div class="adv-price">CA$${t.cad}<small> / 7 days</small></div><p>${esc(t.boards)}</p><p class="muted small">${esc(t.share)}</p></div>`).join('');

const contact = safeUrl(CONTACT_URL) ?? (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACT_URL) ? { href: CONTACT_URL } : null);
$('adv-contact').innerHTML = contact
  ? `<a class="adv-btn" href="${esc(contact.href)}" target="_blank" rel="noopener">Book a board</a><p class="muted small">Tell us your business, your line, your link and the boards you'd like. We usually reply within two days.</p>`
  : '<div class="adv-soon"><b>Booking opens soon.</b> We\'re setting up founding-advertiser bookings now. Check back shortly.</div>';

const support = safeUrl(SUPPORT_URL);
$('adv-support').innerHTML = support ? `<a class="adv-btn alt" href="${esc(support.href)}" target="_blank" rel="noopener">Support Regina Life</a>` : '<div class="adv-soon">Support opens soon.</div>';
const names = muralNames();
$('adv-mural').innerHTML = names.length ? `<h3>The Supporters' Mural</h3><p>${names.map((n) => `<span>${esc(n.name)}</span>`).join('')}</p>` : '<p class="muted small">The mural is waiting for its first names.</p>';
