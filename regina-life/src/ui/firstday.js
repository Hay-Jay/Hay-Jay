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
      if (e.target.closest('[data-go]')) { const st = this.graduated ? this.todoNext : onboardingStatus(this.store.state).next; if (st) this.onGo?.(st); return; }
      if (e.target.closest('header')) {   // phones: the card shows just the next step until you open it; wider screens: fold the list away
        if (matchMedia('(max-width:520px)').matches) { this.el.classList.toggle('open'); return; }
        const o = (this.store.state.onboarding ||= {}); o.min = !o.min; this.store.commit('onboarding'); this.render(true);
      }
    });
  }
  /** True once the First day card is finished and celebrated: the card turns into Today in Regina. */
  get graduated() { const st = onboardingStatus(this.store.state); return st.complete && st.bonus && !!this.store.state.onboarding?.seenDone; }
  /** Today in Regina (core/todo.js): the same card, three small tasks a day. `td` = todoStatus(). */
  renderTodo(td, visible = true) {
    const hidden = !!this.store.state.onboarding?.hidden; this.el.hidden = !visible || hidden; if (this.el.hidden) return;
    const sig = `todo|${td.day}|${td.count}|${td.tasks.map((t) => t.progress).join()}|${this.store.state.onboarding?.min}`; if (sig === this.sig) return; this.sig = sig;
    const next = td.tasks.find((t) => !t.done), min = !!this.store.state.onboarding?.min; this.todoNext = next ?? null;
    this.el.classList.toggle('min', min);
    this.el.innerHTML = `<header role="button" tabindex="0"><span aria-hidden="true">☀️</span><b>${td.complete ? 'Today: all done!' : 'Today in Regina'}</b><small>${td.count}/3</small></header>
      <div class="fbar"><i style="width:${(td.count / 3) * 100}%"></i></div>
      <ol>${td.tasks.map((t) => `<li class="${t.done ? 'done' : ''} ${next === t ? 'next' : ''}"><span class="ck">${t.done ? '✓' : ''}</span><span>${t.icon} ${esc(t.title)}${t.n > 1 && !t.done ? ` (${t.progress}/${t.n})` : ''}</span>${next === t ? '<button data-go>Go</button>' : t.done ? '' : '<span class="rw">+P$4</span>'}</li>`).join('')}</ol>
      ${td.complete ? '<p class="fhint" style="margin:6px 4px 0;color:var(--c-ink-3);font-size:11.5px">New ones tomorrow. Missing a day never costs you anything.</p>' : ''}`;
  }
  /** Draw (only when something changed). `visible` is the game's say: in play, not in the title or the creator. */
  render(force = false, visible = true) {
    const st = onboardingStatus(this.store.state);
    const show = visible && !st.hidden && !(st.complete && st.bonus && this.store.state.onboarding?.seenDone);
    if (!show && this.graduated) return;   // Today in Regina draws itself (renderTodo)
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
