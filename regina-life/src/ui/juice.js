/**
 * The juice kit (docs/AMAZING.md D6): one small module every payoff in the game calls, so nothing ends in a lonely toast any more.
 *
 *   floater(text, at, kind)   a label that pops and rises from a point: a world position (projected through the camera), an element, or {x, y} pixels
 *   coins(from, n)            P$ coins arc from a point into the money pill, which then bumps (the count-up is the shell's)
 *   pulse(el)                 a springy bounce on a chip or a bar
 *   confetti(n)               a short burst for firsts and milestones
 *   haptic(ms)                a tiny vibration on phones that allow it
 *   pay(amount, at, label)    the whole money moment: floater + coins + coin sound
 *
 * Everything is DOM and CSS transforms (no canvas, no allocation per frame), at most a handful of nodes live at once, and reduced motion keeps the
 * text and sound but drops the movement (amazing.css). Pure helpers for placement are exported for tests.
 */
const MAX_FLOATERS = 4;

/** Where a coin is at time k (0..1) on a lifted arc from a to b. Pure. */
export function arcPoint(a, b, k, lift = 120) {
  const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * lift;
  return { x, y };
}
/** Floater stacking: the n-th live floater sits a little higher so two payoffs at once never overlap. Pure. */
export const stackOffset = (n) => -Math.min(n, MAX_FLOATERS - 1) * 30;

export function makeJuice({ camera = null, canvas = null, audio = null, moneyEl = () => null } = {}) {
  const layer = document.createElement('div'); layer.className = 'juice-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer);
  const live = new Set();
  const reduced = () => matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  /** Screen pixels for whatever `at` is. */
  const toScreen = (at) => {
    if (!at) return { x: innerWidth / 2, y: innerHeight * 0.42 };
    if (at instanceof Element) { const r = at.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    if (typeof at.project === 'function' && camera) {   // a THREE.Vector3 in the world
      const v = at.clone().project(camera), r = canvas?.getBoundingClientRect() ?? { left: 0, top: 0, width: innerWidth, height: innerHeight };
      if (v.z > 1) return { x: innerWidth / 2, y: innerHeight * 0.42 };   // behind the camera: show it centre screen instead of nowhere
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    }
    return { x: at.x ?? innerWidth / 2, y: at.y ?? innerHeight * 0.42 };
  };
  const floater = (text, at, kind = 'good', { big = false } = {}) => {
    if (live.size >= MAX_FLOATERS) { const first = live.values().next().value; first?.remove(); live.delete(first); }
    const p = toScreen(at), el = document.createElement('div'); el.className = `floater ${kind}${big ? ' big' : ''}`; el.textContent = text;
    el.style.left = Math.max(40, Math.min(innerWidth - 40, p.x)) + 'px'; el.style.top = Math.max(60, p.y + stackOffset(live.size)) + 'px';
    layer.appendChild(el); live.add(el); setTimeout(() => { el.remove(); live.delete(el); }, 1300);
    return el;
  };
  const pulse = (el) => { if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 600); };
  const coins = (from, n = 6) => {
    const target = moneyEl(); if (!target || reduced()) { pulse(target); return; }
    const a = toScreen(from), b = toScreen(target);
    for (let i = 0; i < Math.min(10, n); i++) {
      const c = document.createElement('div'); c.className = 'coin'; layer.appendChild(c);
      const delay = i * 60, dur = 620 + Math.random() * 160, jx = (Math.random() - 0.5) * 60, lift = 90 + Math.random() * 70, t0 = performance.now() + delay;
      const step = (t) => {
        const k = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - (1 - k) * (1 - k), q = arcPoint({ x: a.x + jx, y: a.y }, b, e, lift);
        c.style.transform = `translate(${q.x}px,${q.y}px) scale(${1 - 0.35 * e})`; c.style.opacity = k < 0.05 ? k * 20 : 1;
        if (k < 1) requestAnimationFrame(step); else { c.remove(); if (i === 0) { pulse(target); audio?.chime('coin'); } }
      };
      c.style.transform = `translate(${a.x}px,${a.y}px)`; c.style.opacity = 0; requestAnimationFrame(step);
    }
  };
  const confetti = (n = 60) => {
    if (reduced()) return;
    const colors = ['#22b573', '#ffc83d', '#ff6b5e', '#7a5af8', '#8fcdea', '#ffffff'];
    for (let i = 0; i < Math.min(120, n); i++) {
      const c = document.createElement('div'); c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
      const fall = 900 + Math.random() * 1400, sway = (Math.random() - 0.5) * 160, spin = (Math.random() - 0.5) * 1080;
      c.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${sway}px, ${innerHeight + 40}px) rotate(${spin}deg)`, opacity: 0.9 }], { duration: fall, delay: Math.random() * 250, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
      layer.appendChild(c); setTimeout(() => c.remove(), fall + 300);
    }
  };
  const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch {} };
  const fmt = (cents) => `P$${(Math.abs(cents) / 100).toFixed(2).replace(/\.00$/, '')}`;
  /** The whole "you got paid" moment. */
  const pay = (cents, at, label = '') => {
    if (!(cents > 0)) return;
    floater(`+${fmt(cents)}${label ? ' ' + label : ''}`, at, 'money', { big: cents >= 5000 }); coins(at, Math.max(3, Math.min(10, Math.round(cents / 1000)))); haptic(12);
  };
  /** A cost: a small red floater by the money pill and a soft falling chime. */
  const spend = (cents) => { if (!(cents > 0)) return; floater(`−${fmt(cents)}`, moneyEl() ? (() => { const r = moneyEl().getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom + 26 }; })() : null, 'cost'); audio?.chime('cost'); };
  return { floater, coins, pulse, confetti, haptic, pay, spend, toScreen, layer };
}
