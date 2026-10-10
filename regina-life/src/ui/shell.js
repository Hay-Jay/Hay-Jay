import { fmtMoney } from '../core/ledger.js';

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const TAB_ICON = {
  home: I('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>'),
  buy: I('<path d="M4 11V8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V11"/><path d="M3 11h18v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/><path d="M6 18v2M18 18v2"/>'),
  map: I('<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  phone: I('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
};
export const TABS = [['home', 'Home'], ['buy', 'Buy'], ['map', 'Map'], ['phone', 'Phone']];

/** Mood from the five needs: the label and face shown in the top bar. */
export function moodOf(needs) {
  const v = [needs.energy, needs.hunger, needs.hygiene ?? 70, needs.fun ?? 60, needs.mood].map((x) => (Number.isFinite(x) ? x : 50));
  const avg = v.reduce((a, b) => a + b, 0) / v.length, low = Math.min(...v);
  const score = Math.min(avg, low + 35);
  return score >= 78 ? { face: '😄', label: 'Very Happy', tone: 'great' } : score >= 60 ? { face: '🙂', label: 'Happy', tone: 'good' } : score >= 42 ? { face: '😐', label: 'Okay', tone: 'okay' } : score >= 25 ? { face: '😕', label: 'Low', tone: 'low' } : { face: '😫', label: 'Rough', tone: 'bad' };
}

/**
 * The app shell: a status pill across the top (clock, mood, money, "+" wallet) and a four-tab bar along the bottom
 * (Home · Buy · Map · Phone). It owns no game rules: it shows state and reports taps through onTab / onWallet.
 */
export class Shell {
  constructor({ onTab, onWallet }) {
    this.onTab = onTab; this.onWallet = onWallet; this.tab = 'home'; this.shown = 0; this.target = 0; this.raf = 0;
    this.root = document.getElementById('shell'); this.clock = document.getElementById('tb-clock'); this.mood = document.getElementById('tb-mood'); this.money = document.getElementById('tb-money'); this.plus = document.getElementById('tb-plus');
    this.nav = document.getElementById('navbar'); this.chips = document.getElementById('chiprow');
    this.nav.innerHTML = TABS.map(([id, label]) => `<button type="button" data-tab="${id}" aria-label="${label}"><span class="ni">${TAB_ICON[id]}</span><span class="nl">${label}</span><b class="nbadge" hidden></b></button>`).join('<i class="nsep" aria-hidden="true"></i>');
    this.nav.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) this.onTab?.(b.dataset.tab); });
    this.plus.addEventListener('click', () => this.onWallet?.());
    this.setTab('home');
  }
  show(on) { this.root.hidden = !on; document.body.classList.toggle('shell-on', !!on); }
  setTab(tab) { this.tab = tab; this.nav.querySelectorAll('[data-tab]').forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); }); }
  setBadge(tab, n) { const b = this.nav.querySelector(`[data-tab="${tab}"] .nbadge`); if (!b) return; b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n || ''); }
  setReward(ready) { this.plus.classList.toggle('ready', !!ready); this.plus.title = ready ? 'Daily reward ready' : 'Wallet'; }
  /** Contextual chips under the bar (e.g. map overlays). items: [{ id, label, icon?, on? }] */
  setChips(items, onPick) {
    this.chips.hidden = !items?.length; this.chips.innerHTML = (items || []).map((c) => `<button type="button" class="${c.on ? 'on' : ''}" data-chip="${c.id}">${c.icon ? `<span aria-hidden="true">${c.icon}</span>` : ''}${c.label}</button>`).join('');
    this.chips.onclick = (e) => { const b = e.target.closest('[data-chip]'); if (b) onPick?.(b.dataset.chip); };
  }
  /** Money counts up/down to its new value so a purchase or payday is felt, not just seen. */
  setMoney(cents) {
    this.target = cents; if (this.raf) return;
    const step = () => {
      const d = this.target - this.shown;
      if (Math.abs(d) < 1) { this.shown = this.target; this.money.textContent = fmtMoney(this.shown); this.raf = 0; return; }
      this.shown += d * 0.2 + Math.sign(d); this.money.textContent = fmtMoney(Math.round(this.shown));
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.shown = this.target; }
      this.raf = requestAnimationFrame(step);
    };
    if (Math.abs(this.target - this.shown) > 1 && this.shown !== 0) { this.money.classList.remove('bump'); void this.money.offsetWidth; this.money.classList.add('bump'); }
    if (this.shown === 0 && this.target !== 0) { this.shown = this.target; this.money.textContent = fmtMoney(this.shown); return; }
    this.raf = requestAnimationFrame(step);
  }
  setClock(html) { if (this.clock._h !== html) { this.clock._h = html; this.clock.innerHTML = html; } }
  setMood(m) { const k = m.tone + m.label; if (this.mood._k !== k) { this.mood._k = k; this.mood.dataset.tone = m.tone; this.mood.innerHTML = `<span aria-hidden="true">${m.face}</span> ${m.label}`; } }
}
