/**
 * The "First day in Regina" card (docs/AMAZING.md G3): always on screen for a new player (top left, under the bar), it says what to do next, with a
 * Go button that takes you there and a pulse on the tab that leads to it. The rules live in core/onboarding.js; this only draws them.
 */
import { onboardingStatus, ONBOARDING_BONUS } from '../core/onboarding.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p$ = (c) => `P$${(c / 100).toFixed(0)}`;

export class FirstDay {
  /** @param {{ store, onGo: (step) => void }} o */
  constructor({ store, onGo }) {
    this.store = store; this.onGo = onGo; this.sig = '';
    this.el = document.createElement('section'); this.el.className = 'fday'; this.el.hidden = true; this.el.setAttribute('aria-label', 'First day in Regina');
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-go]')) { const st = onboardingStatus(this.store.state).next; if (st) this.onGo?.(st); return; }
      if (e.target.closest('header')) {   // phones: the card shows just the next step until you open it; wider screens: fold the list away
        if (matchMedia('(max-width:520px)').matches) { this.el.classList.toggle('open'); return; }
        const o = (this.store.state.onboarding ||= {}); o.min = !o.min; this.store.commit('onboarding'); this.render(true);
      }
    });
  }
  /** Draw (only when something changed). `visible` is the game's say: in play, not in the title or the creator. */
  render(force = false, visible = true) {
    const st = onboardingStatus(this.store.state);
    const show = visible && !st.hidden && !(st.complete && st.bonus && this.store.state.onboarding?.seenDone);
    this.el.hidden = !show; if (!show) return;
    const sig = `${st.count}|${st.min}|${st.complete}`; if (!force && sig === this.sig) return; this.sig = sig;
    this.el.classList.toggle('min', st.min);
    this.el.innerHTML = `<header role="button" tabindex="0" aria-expanded="${!st.min}"><span aria-hidden="true">🌾</span><b>${st.complete ? 'First day: done!' : 'First day in Regina'}</b><small>${st.count}/${st.total}</small></header>
      <div class="fbar"><i style="width:${(st.count / st.total) * 100}%"></i></div>
      <ol>${st.steps.map((s) => {
        const next = st.next?.id === s.id;
        return `<li class="${s.done ? 'done' : ''} ${next ? 'next' : ''}"><span class="ck">${s.done ? '✓' : ''}</span><span>${s.icon} ${esc(s.title)}</span>${next ? '<button data-go>Go</button>' : s.done ? '' : `<span class="rw">+${p$(s.reward)}</span>`}</li>`;
      }).join('')}</ol>
      ${st.complete ? '' : `<p class="fhint" style="margin:6px 4px 0;color:var(--c-ink-3);font-size:11.5px">${esc(st.next?.hint ?? '')} Finish all six for a ${p$(ONBOARDING_BONUS)} bonus.</p>`}`;
  }
  get next() { return onboardingStatus(this.store.state).next; }
}
