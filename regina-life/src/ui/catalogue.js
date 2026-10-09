/**
 * The Buy sheet ("Catalogue"): a bottom sheet with category pills and a card grid. Tap a card to buy it and drop it into build mode
 * (ghost + floor grid); the "In storage" tab places or sells (at the sell ratio) pieces you own but have not placed; "Design" replaces the
 * old paint/flooring menu. All rules live in core/home.js (via catalogue-model.js); this file is only DOM glue.
 *
 *   const catalogue = new Catalogue({ store, build, audio, toast, fmtMoney, thumbs: makeThumbs(), canBuild: () => inApartment, onChange });
 *   catalogue.open('sleep') / open('design') / open('in-storage') / close() / toggle() / refresh();   catalogue.isOpen
 */
import './catalogue.css';
import { fmtMoney as defaultFmt } from '../core/ledger.js';
import { itemDef } from '../core/home.js';
import * as M from './catalogue-model.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FOCUSABLE = 'button:not([disabled]):not([hidden]),[tabindex="0"]';

/* ---------- HTML builders (pure strings, exported for tests) ---------- */
export function tabsHTML(tabs, active) {
  return tabs.map((t) => { const on = t.id === active;
    return `<button type="button" role="tab" class="cat-tab${on ? ' on' : ''}" id="cat-tab-${esc(t.id)}" data-act="tab" data-id="${esc(t.id)}" aria-selected="${on}" aria-controls="cat-panel" tabindex="${on ? 0 : -1}"><span class="cat-tab-ico" aria-hidden="true">${esc(t.emoji)}</span><span class="cat-tab-txt">${esc(t.label)}</span>${t.kind === 'storage' && t.count ? `<b class="cat-tab-n">${t.count}<span class="cat-sr"> in storage</span></b>` : ''}</button>`; }).join('');
}
const thumbHTML = (c) => `<span class="cat-thumb" style="--sw:${esc(c.color)}"><img class="cat-img" alt="" draggable="false" data-thumb="${esc(c.id)}">${c.owned ? `<span class="cat-own" aria-hidden="true">×${c.owned}</span>` : ''}</span>`;
const topHTML = (c) => `<span class="cat-size" aria-hidden="true">${esc(c.sizeLabel)}</span><span class="cat-stars" aria-hidden="true">${'★'.repeat(c.stars)}</span>`;
function pieceHTML(c, fmt) {
  const poor = !c.canAfford;
  return `<li><button type="button" class="cat-card${poor ? ' is-poor' : ''}" data-act="buy" data-id="${esc(c.id)}" aria-label="${esc(M.cardLabel(c, fmt))}"${poor ? ' aria-disabled="true"' : ''}>${topHTML(c)}${thumbHTML(c)}<span class="cat-name">${esc(c.name)}</span><span class="cat-price">${c.price ? fmt(c.price) : 'Free'}</span>${poor || c.inStorage ? `<span class="cat-notes">${poor ? `<span class="cat-note bad">${esc(M.needText(c.shortBy, fmt))}</span>` : ''}${c.inStorage ? `<span class="cat-note">+${c.inStorage} in storage</span>` : ''}</span>` : ''}</button></li>`;
}
function storedHTML(c, fmt) {
  const sell = c.canSell ? `<button type="button" class="cat-btn" data-act="sell" data-id="${esc(c.id)}" aria-label="Sell one ${esc(c.name)} for ${esc(fmt(c.sellPrice))}">Sell · ${fmt(c.sellPrice)}</button>` : '';
  return `<li><div class="cat-card cat-stored" role="group" aria-label="${esc(c.name)}, ${c.inStorage} in storage">${topHTML(c)}${thumbHTML(c)}<span class="cat-name">${esc(c.name)}</span><span class="cat-price">${c.inStorage} in storage</span><span class="cat-acts"><button type="button" class="cat-btn primary" data-act="place" data-id="${esc(c.id)}" aria-label="Place ${esc(c.name)}">Place</button>${sell}</span></div></li>`;
}
function styleHTML(c, fmt) {
  const poor = !c.owned && !c.canAfford;
  return `<li><button type="button" class="cat-card cat-style${c.active ? ' is-on' : ''}${poor ? ' is-poor' : ''}" data-act="style" data-kind="${c.kind}" data-key="${esc(c.key)}" data-id="${esc(c.id)}" aria-pressed="${c.active}" aria-label="${esc(M.cardLabel(c, fmt))}"${poor ? ' aria-disabled="true"' : ''}><span class="cat-size" aria-hidden="true">${c.kind === 'wall' ? 'Wall' : 'Floor'}</span><span class="cat-thumb cat-swatch" style="--sw:${esc(c.color)}" data-mat="${esc(c.material || c.kind)}"></span><span class="cat-name">${esc(c.name)}</span><span class="cat-price">${c.active ? 'In use' : c.owned ? 'Owned' : fmt(c.price)}</span>${poor ? `<span class="cat-notes"><span class="cat-note bad">${esc(M.needText(c.shortBy, fmt))}</span></span>` : ''}</button></li>`;
}
export function bodyHTML(view, fmt) {
  const out = [];
  for (const sec of view.sections) {
    if (sec.label) out.push(`<li class="cat-sec" role="presentation"><h3>${esc(sec.label)}</h3>${sec.price ? `<small>${fmt(sec.price)} the first time</small>` : ''}</li>`);
    for (const c of sec.cards) out.push(c.kind === 'wall' || c.kind === 'floor' ? styleHTML(c, fmt) : view.kind === 'storage' ? storedHTML(c, fmt) : pieceHTML(c, fmt));
  }
  if (!view.cards.length) out.push(`<li class="cat-empty">${esc(view.empty || 'Nothing here yet.')}</li>`);
  return `<ul class="cat-grid" role="list">${out.join('')}</ul>`;
}

const SKELETON = `<div class="cat-scrim" data-act="hide"></div>
<section class="cat-sheet" role="dialog" aria-modal="true" aria-labelledby="cat-title" tabindex="-1">
  <div class="cat-top" data-grab>
    <div class="cat-grab"><span class="cat-handle" aria-hidden="true"></span></div>
    <header class="cat-head"><h2 class="cat-title" id="cat-title">Catalogue</h2><span class="cat-bal" role="status" aria-label="Your balance"></span><button type="button" class="cat-hide" data-act="hide" aria-label="Hide the catalogue">Hide</button></header>
  </div>
  <div class="cat-banner"><span class="cat-banner-t"></span><button type="button" class="cat-chip" data-act="tab" data-id="${M.TAB_STORAGE}" hidden></button></div>
  <div class="cat-tabs" role="tablist" aria-label="Catalogue categories"></div>
  <div class="cat-body" id="cat-panel" role="tabpanel" tabindex="0"></div>
</section>`;

export class Catalogue {
  constructor({ store, build = null, audio = null, toast = () => {}, fmtMoney = defaultFmt, thumbs = null, onChange = null, change = null, onOpen = null, onClose = null, canBuild = () => true, mount = null } = {}) {
    Object.assign(this, { store, build, audio, toast, fmt: fmtMoney, thumbs, onChange: onChange ?? change, onOpen, onClose, canBuild });
    this._open = false; this.tab = null; this._tsig = this._bsig = this._bal = null; this._prio = 0; this._closedBy = null; this._hideT = null; this._prevFocus = null; this._unsub = null;
    const root = this.root = document.createElement('div'); root.className = 'cat-root'; root.id = 'catalogue'; root.hidden = true; root.innerHTML = SKELETON;
    const q = (s) => root.querySelector(s); this.sheet = q('.cat-sheet'); this.$bal = q('.cat-bal'); this.$banner = q('.cat-banner-t'); this.$chip = q('.cat-chip'); this.$tabs = q('.cat-tabs'); this.$body = q('.cat-body'); this.$top = q('.cat-top');
    root.addEventListener('click', (e) => this._click(e)); root.addEventListener('keydown', (e) => this._keydown(e)); this._bindDrag();
    this._onKey = (e) => { if (this._open && e.key === 'Escape') { e.preventDefault?.(); e.stopPropagation?.(); this._closedBy = e; this.close(); } };
    this._onResize = () => this.build?.layout?.();
    (mount ?? document.body).appendChild(root);
  }

  get isOpen() { return this._open; }
  /** Height of the visible sheet in px (0 when hidden) — build mode uses it to frame the room above the sheet. */
  get height() { return this._open ? (this.sheet?.offsetHeight ?? 0) : 0; }
  /** True when this very key event was the Esc that just hid the sheet (so build mode does not also treat it as "exit"). */
  closedBy(e) { return !!e && this._closedBy === e; }

  _resolve(tab) {
    const s = this.store.state, want = String(tab ?? '').trim().toLowerCase(); if (!want) return null;
    if (want === 'storage' || want === 'stored') return M.TAB_STORAGE;
    return M.tabList(s).find((t) => t.id.toLowerCase() === want || t.label.toLowerCase() === want)?.id ?? null;
  }
  open(tab) {
    const want = this._resolve(tab);
    if (this._open) { if (want) this.setTab(want); return this; }
    this._open = true; this.tab = want ?? (this.tab && M.hasTab(this.store.state, this.tab) ? this.tab : M.defaultTab());
    this._prevFocus = typeof document !== 'undefined' ? document.activeElement : null; this._tsig = this._bsig = this._bal = null; this._prio++;
    clearTimeout(this._hideT); this.root.hidden = false; this._render();
    addEventListener('keydown', this._onKey, true); addEventListener('resize', this._onResize); this._unsub = this.store.subscribe?.(() => { if (this._open) this.refresh(); });
    void this.root.offsetWidth; this.root.classList.add('open'); // reflow first so the slide-up transition runs
    this._focusTab(); this.build?.layout?.(); this.audio?.blip?.('tick'); this.onOpen?.(this);
    return this;
  }
  close() {
    if (!this._open) return this;
    this._open = false; removeEventListener('keydown', this._onKey, true); removeEventListener('resize', this._onResize); this._unsub?.(); this._unsub = null;
    this.root.classList.remove('open'); clearTimeout(this._hideT);
    const hide = () => { if (!this._open) this.root.hidden = true; };
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) hide(); else this._hideT = setTimeout(hide, 360);
    const f = this._prevFocus; this._prevFocus = null; try { f?.focus?.({ preventScroll: true }); } catch { /* element gone */ }
    this.build?.layout?.(); this.onClose?.(this);
    return this;
  }
  toggle() { return this._open ? this.close() : this.open(); }
  /** Re-draw from the current state (cheap: skips the DOM when nothing the sheet shows has changed). */
  refresh() { if (this._open) this._render(); return this; }
  setTab(id, { focus = false } = {}) {
    const want = this._resolve(id) ?? M.defaultTab(); if (want === this.tab) { if (focus) this._focusTab(); return this; }
    this.tab = want; this._prio++; this.$body.scrollTop = 0; this._render(); if (focus) this._focusTab(); return this;
  }
  destroy() { this.close(); clearTimeout(this._hideT); this.root.remove?.(); }

  /* ---------- drawing ---------- */
  _render() {
    const s = this.store.state, bal = this.store.ledger.balance, tabs = M.tabList(s), view = M.tabView(s, this.tab, bal), fmt = this.fmt; this.tab = view.id;
    if (this._bal !== bal) { this._bal = bal; this.$bal.textContent = fmt(bal); }
    this.$banner.textContent = M.bannerText();
    const n = M.storageCount(s); this.$chip.hidden = !(n > 0 && view.kind !== 'storage'); if (!this.$chip.hidden) this.$chip.textContent = `+${n} in storage`;
    const ts = JSON.stringify([tabs.map((t) => [t.id, t.label, t.emoji, t.count ?? 0]), this.tab]);
    if (ts !== this._tsig) { this._tsig = ts; this._swap(this.$tabs, tabsHTML(tabs, this.tab)); this._centerTab(); }
    const bs = JSON.stringify(view);
    if (bs !== this._bsig) { this._bsig = bs; this._swap(this.$body, bodyHTML(view, fmt)); this.$body.setAttribute?.('aria-labelledby', `cat-tab-${this.tab}`); this._hydrate(view); }
  }
  /** Replace a container's HTML but keep its scroll position and keyboard focus (focus follows the same button if it still exists). */
  _swap(el, html) {
    const a = typeof document !== 'undefined' ? document.activeElement : null, had = !!(a && a !== el && el.contains?.(a)), d = had ? a.dataset ?? {} : {};
    const sel = had && d.act ? `[data-act="${d.act}"]${d.id ? `[data-id="${d.id}"]` : ''}` : '', top = el.scrollTop, left = el.scrollLeft;
    el.innerHTML = html; el.scrollTop = top; el.scrollLeft = left;
    if (had) { const t = (sel && el.querySelector(sel)) || el.querySelector(FOCUSABLE) || el; try { t.focus?.({ preventScroll: true }); } catch { /* ignore */ } }
  }
  _centerTab() { const b = this.$tabs.querySelector?.('.cat-tab.on'), t = this.$tabs; if (b && Number.isFinite(b.offsetLeft)) t.scrollLeft = Math.max(0, b.offsetLeft - (t.clientWidth - b.offsetWidth) / 2); }
  _focusTab() { try { this.$tabs.querySelector?.('.cat-tab.on')?.focus?.({ preventScroll: true }); } catch { /* ignore */ } }
  /** Thumbnails for the visible tab only: cached ones appear at once, the rest as the queue gets to them (newest tab first). */
  _hydrate(view) {
    const th = this.thumbs; if (!th) return;
    for (const c of view.cards) {
      if (c.kind !== 'piece') continue;
      const put = (url) => { if (!url) return; const img = this.$body.querySelector?.(`img[data-thumb="${c.id}"]`); if (!img) return; img.src = url; img.parentElement?.classList?.add('ready'); };
      const hit = th.peek?.(c.id); if (hit) put(hit); else th.get?.(c.id, { priority: this._prio })?.then?.((u) => { if (this._open) put(u); });
    }
  }

  /* ---------- input ---------- */
  _click(e) {
    const el = e.target?.closest?.('[data-act]'); if (!el) return; const { act, id, kind, key } = el.dataset;
    if (act === 'hide') return void this.close();
    if (act === 'tab') return void this.setTab(id);
    if (act === 'buy') return void this._buy(id);
    if (act === 'place') return void this._place(id);
    if (act === 'sell') return void this._sell(id);
    if (act === 'style') return void this._style(kind, key);
  }
  _keydown(e) {
    if (e.key === 'Tab') { // keep focus inside the (modal) sheet: wrap at both ends
      const list = [...this.sheet.querySelectorAll(FOCUSABLE)].filter((x) => x.tabIndex !== -1 || x.getAttribute?.('role') !== 'tab'); if (!list.length) return;
      const i = list.indexOf(document.activeElement), last = list.length - 1;
      if (i < 0) { e.preventDefault?.(); list[e.shiftKey ? last : 0].focus?.(); }
      else if (e.shiftKey ? i === 0 : i === last) { e.preventDefault?.(); list[M.cycleIndex(list.length, i, e.shiftKey ? -1 : 1)].focus?.(); }
      return;
    }
    const tabBtn = e.target?.closest?.('[role="tab"]'); if (!tabBtn) return;
    const ids = M.tabList(this.store.state).map((t) => t.id), i = ids.indexOf(tabBtn.dataset.id);
    const j = e.key === 'ArrowRight' ? M.cycleIndex(ids.length, i, 1) : e.key === 'ArrowLeft' ? M.cycleIndex(ids.length, i, -1) : e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : -1;
    if (j >= 0) { e.preventDefault?.(); this.setTab(ids[j], { focus: true }); }
  }
  /** Drag the handle/header down to dismiss: a long drag or a fast flick hides the sheet, a short one springs back. A plain tap on the handle hides it too. */
  _bindDrag() {
    const top = this.$top, sheet = this.sheet; let st = null;
    top.addEventListener('pointerdown', (e) => { if (e.button > 0 || e.target?.closest?.('button')) return; st = { y: e.clientY, t: e.timeStamp ?? Date.now(), id: e.pointerId, dy: 0, handle: !!e.target?.closest?.('.cat-grab') }; try { top.setPointerCapture?.(e.pointerId); } catch { /* ignore */ } sheet.style.transition = 'none'; });
    top.addEventListener('pointermove', (e) => { if (!st || e.pointerId !== st.id) return; st.dy = Math.max(0, e.clientY - st.y); sheet.style.transform = `translateY(${st.dy}px)`; });
    const end = (cancel) => (e) => {
      if (!st || e.pointerId !== st.id) return; const s = st; st = null; sheet.style.transition = ''; sheet.style.transform = ''; if (cancel) return;
      const dt = (e.timeStamp ?? Date.now()) - s.t; if (M.shouldDismiss({ dy: s.dy, dt, height: sheet.offsetHeight || 0 }) || (s.handle && s.dy < 4 && dt < 300)) this.close();
    };
    top.addEventListener('pointerup', end(false)); top.addEventListener('pointercancel', end(true));
  }

  /* ---------- actions ---------- */
  _fail(r) { this.audio?.blip?.('error'); this.toast(r.error === 'not-enough' ? M.needText(r.shortBy, this.fmt) : r.error, 'warn'); }
  _changed(detail) { try { this.onChange?.(detail, this); } catch (err) { console.error(err); } }
  /** Hand a piece to build mode as the selected piece (starting it if needed) and hide the sheet so the player can place it with the ghost + grid. */
  _handOff(type) {
    const b = this.build;
    if (!b || !this.canBuild()) { this.toast(`${itemDef(type)?.name ?? 'It'} is in storage — place it from Redecorate at home`, 'info'); return false; }
    if (!b.active) b.start?.({ quiet: true });
    b.select?.({ type, id: null }); this.close(); return true;
  }
  _buy(id) {
    const r = M.buyPiece(this.store, id); if (!r.ok) return void this._fail(r);
    this.audio?.blip?.('cash'); this.toast(`Bought ${r.name} · ${this.fmt(r.price)}`, 'good'); this._changed({ kind: 'buy', type: id, price: r.price });
    if (!this._handOff(id)) this.refresh();
  }
  _place(id) {
    if (!itemDef(id)) return; this.audio?.blip?.('tick'); this._changed({ kind: 'place', type: id });
    if (!this._handOff(id)) this.refresh();
  }
  _sell(id) {
    const r = M.sellPiece(this.store, id); if (!r.ok) return void this._fail(r);
    this.audio?.blip?.('cash'); this.toast(`Sold ${r.name} for ${this.fmt(r.refund)}`, 'good'); this._changed({ kind: 'sell', type: id, refund: r.refund });
    this.build?.refresh?.(); this.refresh();
  }
  _style(kind, key) {
    const r = M.applyStyle(this.store, kind, key); if (!r.ok) return void this._fail(r);
    this.audio?.blip?.(r.paid ? 'cash' : 'ok'); this.toast(r.paid ? `${r.name} ${kind === 'wall' ? 'paint' : 'flooring'} · ${this.fmt(r.paid)}` : `${r.name} applied`, 'good'); this._changed({ kind: 'style', style: kind, key, paid: r.paid });
    this.refresh();
  }
}
