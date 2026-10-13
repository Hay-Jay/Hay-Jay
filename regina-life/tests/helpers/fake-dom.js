/** A tiny fake DOM for the UI glue tests (vitest runs in node: no jsdom). Just enough of Element for the build bar, the focus strip and the Buy sheet. */
export class El {
  constructor(tag = 'div') { this.tag = tag; this.memo = new Map(); this.handlers = {}; this.dataset = {}; this.attrs = {}; this.style = {}; this.classes = new Set(); this.hidden = false; this.scrollTop = 0; this.scrollLeft = 0; this.offsetHeight = 480; this.focusCalls = 0; this._html = ''; this.children = []; }
  get classList() { return { add: (c) => this.classes.add(c), remove: (c) => this.classes.delete(c), contains: (c) => this.classes.has(c), toggle: (c, on) => (on ?? !this.classes.has(c) ? this.classes.add(c) : this.classes.delete(c)) }; }
  set innerHTML(v) { this._html = String(v); this.memo.clear(); } get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); } get textContent() { return this._text ?? ''; }
  querySelector(sel) { if (!this.memo.has(sel)) this.memo.set(sel, new El()); return this.memo.get(sel); }
  querySelectorAll() { return []; }
  addEventListener(t, fn) { (this.handlers[t] ||= []).push(fn); }
  dispatch(t, ev) { for (const fn of this.handlers[t] ?? []) fn(ev); }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; }
  appendChild(c) { this.children.push(c); return c; } remove() { this.removed = true; } contains() { return false; }
  focus() { this.focusCalls++; globalThis.document.activeElement = this; } setPointerCapture() {}
  get offsetWidth() { return 100; }
}
/** An event whose target.closest(sel) returns a fake element carrying the given dataset, for `sel` (default '[data-act]'). */
export const tapOn = (dataset, sel = '[data-act]', extra = {}) => ({ target: { closest: (q) => (q === sel ? { dataset } : null) }, ...extra });
/** All the `data-id` values of the buttons in a chip-strip's HTML, in order. */
export const idsIn = (html, act = 'focus') => [...html.matchAll(new RegExp(`data-act="${act}" data-id="([^"]*)"`, 'g'))].map((m) => m[1]);
