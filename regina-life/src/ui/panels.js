import { FOOD, CLOTHES, SLOTS, SLOT_KEY, SKIN_TONES, HAIR_COLORS, EYE_COLORS, HAIR_STYLES, FACE_SHAPES, BODY_TYPES, FACIAL_HAIR, EXPRESSIONS, STORE_STOCK, ITEM_NAME } from '../data/catalog.js';
import { RECIPES } from '../core/game.js';
import { fmtMoney } from '../core/ledger.js';
import { ICON } from './icons.js';
import { FURNITURE, WALLS, FLOORS, WALL_PRICE, FLOOR_PRICE, SELL_RATIO } from '../data/furniture.js';
import { buyFurniture, sellFurniture, setStyle, ownedCount, placedCount, availableToPlace } from '../core/home.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Modal / panel manager for shops, menus, wardrobe & character creator. One panel at a time. */
export class Panels {
  constructor(root, ctx) {
    this.root = root; this.ctx = ctx; this.cur = null;
    root.addEventListener('click', (e) => { if (e.target === root) this.close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.cur && this.cur.dismissable !== false) this.close(); });
  }
  get open() { return !!this.cur; }
  close() { if (!this.cur) return; const c = this.cur; this.cur = null; this.root.classList.remove('on'); this.root.innerHTML = ''; c.onClose?.(); this.ctx.onPanel?.(false); }
  _show(html, cls, opts = {}) {
    this.close(); this.cur = opts; this.root.innerHTML = `<div class="panel ${cls}" role="dialog" aria-modal="true">${html}</div>`; this.root.classList.add('on'); this.ctx.onPanel?.(true);
    return this.root.firstChild;
  }

  /** Generic choice menu. buttons: [{label, run, primary, danger}] */
  menu(title, text, buttons) {
    const p = this._show(`<h3>${esc(title)}</h3><p class="pm">${esc(text)}</p><div class="pbtns">${buttons.map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>`, 'menu');
    p.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const btn = buttons[+b.dataset.i]; this.close(); btn.run?.(); });
  }

  /** Timed activity with a progress bar (input is blocked while a panel is open). */
  progress(label, secs, onDone, { stop = true } = {}) {
    const p = this._show(`<h3>${esc(label)}</h3><div class="prog"><i></i></div>${stop ? '<div class="pbtns"><button class="btn" data-stop>Stop</button></div>' : ''}`, 'menu prog-panel', { dismissable: false });
    const bar = p.querySelector('.prog i'); let done = false; const t0 = performance.now();
    const tick = () => { if (done || this.cur?.stopped) return; const k = Math.min(1, (performance.now() - t0) / (secs * 1000)); bar.style.width = k * 100 + '%'; if (k >= 1) { done = true; this.close(); onDone?.(); } else requestAnimationFrame(tick); };
    const sb = p.querySelector('[data-stop]'); if (sb) sb.onclick = () => { done = true; this.close(); };
    requestAnimationFrame(tick);
  }

  /** Life event card: shows title/text/choices; resolves via ctx callbacks. */
  event(ev, { can, pick, onClose }) {
    const render = (result) => {
      p.innerHTML = result
        ? `<div class="ev-ic">${ev.icon}</div><h3>${esc(ev.title)}</h3><p class="pm">${esc(result.result)}</p>${result.summary ? `<p class="ev-sum">${esc(result.summary)}</p>` : ''}<div class="pbtns"><button class="btn primary" data-ok>Continue</button></div>`
        : `<div class="ev-ic">${ev.icon}</div><h3>${esc(ev.title)}</h3><p class="pm">${esc(ev.text)}</p><div class="pbtns col">${ev.choices.map((c, i) => { const a = can(i); return `<button class="btn ${i === 0 ? 'primary' : ''}" data-i="${i}" ${a.ok ? '' : 'disabled'} title="${a.ok ? '' : esc(a.why)}">${esc(c.label)}${a.ok ? '' : ` <small>(${esc(a.why)})</small>`}</button>`; }).join('')}</div>`;
    };
    const p = this._show('', 'menu event', { dismissable: false, onClose }); render();
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-ok]')) return this.close();
      const b = e.target.closest('[data-i]'); if (!b) return;
      const r = pick(+b.dataset.i); if (!r.ok) { this.ctx.toast(r.error, 'warn'); return; } render(r);
    });
  }

  /** Grocery-style shop. */
  shop(title, ids, where) {
    const { store, G } = this.ctx;
    const render = () => {
      const bal = store.state.bank.balance;
      p.innerHTML = `<div class="ph"><h3>${esc(title)}</h3><span class="pill">${fmtMoney(bal)}</span><button class="x" data-x aria-label="Close">${ICON.close}</button></div>
        <div class="items">${ids.map((id) => { const f = FOOD[id], own = store.state.inventory[id] || 0; return `<div class="item"><div class="emoji">${f.icon}</div><b>${esc(f.name)}</b><small>+${f.hunger} hunger${f.energy > 5 ? ` · +${f.energy} energy` : ''}</small><div class="buy"><span>${fmtMoney(f.price)}</span><button class="btn small primary" data-buy="${id}" ${f.price > bal ? 'disabled' : ''}>Buy</button></div>${own ? `<em>You have ${own}</em>` : ''}</div>`; }).join('')}</div>
        <p class="fine">Prices are set by the store — purchases are validated by the in-game ledger.</p>`;
    };
    const p = this._show('', 'shop'); render();
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return this.close();
      const b = e.target.closest('[data-buy]'); if (!b) return;
      const r = G.buyItem(store, b.dataset.buy, 1, where);
      if (r.ok) { this.ctx.audio?.blip('cash'); this.ctx.toast(`Bought ${ITEM_NAME(b.dataset.buy)}`, 'good'); } else { this.ctx.audio?.blip('error'); this.ctx.toast(r.error, 'warn'); }
      render();
    });
  }

  /** Clothing store with try-on preview. */
  clothingShop() {
    const { store, G } = this.ctx; let tab = 'top'; let preview = null; // {slotKey, prev}
    const restore = () => { if (preview) { store.state.player.look[preview.key] = preview.prev; preview = null; this.ctx.rebuildPlayer(); } };
    const render = () => {
      const s = store.state, bal = s.bank.balance;
      const items = Object.values(CLOTHES).filter((c) => c.slot === tab && c.price > 0);
      p.innerHTML = `<div class="ph"><h3>Prairie Threads</h3><span class="pill">${fmtMoney(bal)}</span><button class="x" data-x aria-label="Close">${ICON.close}</button></div>
        <div class="tabs">${SLOTS.map((t) => `<button class="${t === tab ? 'on' : ''}" data-tab="${t}">${{ top: 'Tops', bottom: 'Bottoms', shoes: 'Shoes', head: 'Headwear', face: 'Eyewear', neck: 'Scarves' }[t]}</button>`).join('')}</div>
        <div class="items">${items.map((c) => { const own = s.wardrobe.includes(c.id), worn = s.player.look[SLOT_KEY[c.slot]] === c.id; return `<div class="item"><div class="swatch big" style="background:${c.color}"></div><b>${esc(c.name)}</b><div class="buy"><span>${own ? 'Owned' : fmtMoney(c.price)}</span>${own ? `<button class="btn small ${worn ? 'on' : ''}" data-wear="${c.id}">${worn ? 'Worn' : 'Wear'}</button>` : `<button class="btn small" data-try="${c.id}">Try on</button><button class="btn small primary" data-buy="${c.id}" ${c.price > bal ? 'disabled' : ''}>Buy</button>`}</div></div>`; }).join('') || '<p class="empty">Nothing in this category</p>'}</div>
        <p class="fine">Try on is a preview — nothing is charged until you buy. Look in the mirror to see your outfit.</p>`;
    };
    const p = this._show('', 'shop wide', { onClose: restore, side: true }); render();
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return this.close();
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
      const tr = e.target.closest('[data-try]');
      if (tr) { const c = CLOTHES[tr.dataset.try], key = SLOT_KEY[c.slot]; if (!preview) preview = { key, prev: store.state.player.look[key] }; else if (preview.key !== key) { restore(); preview = { key, prev: store.state.player.look[key] }; } store.state.player.look[key] = c.id; this.ctx.rebuildPlayer(); return; }
      const wr = e.target.closest('[data-wear]'); if (wr) { preview = null; G.equip(store, wr.dataset.wear); this.ctx.rebuildPlayer(); render(); return; }
      const by = e.target.closest('[data-buy]');
      if (by) { const id = by.dataset.buy; preview = null; const r = G.buyItem(store, id, 1, 'Prairie Threads'); if (r.ok) { G.equip(store, id); this.ctx.audio?.blip('cash'); this.ctx.toast(`Bought & wearing ${ITEM_NAME(id)}`, 'good'); this.ctx.rebuildPlayer(); } else { this.ctx.audio?.blip('error'); this.ctx.toast(r.error, 'warn'); } render(); }
    });
  }

  /** Wardrobe (owned clothing). */
  wardrobe() { this.characterPanel({ creator: false }); }

  /** Character creator (new life) or wardrobe (clothing only). */
  characterPanel({ creator = false, onDone } = {}) {
    const { store, G } = this.ctx; const look = store.state.player.look;
    const groups = creator
      ? [['Face', 'face'], ['Hair', 'hair'], ['Body', 'body'], ['Outfit', 'outfit']]
      : [['Outfit', 'outfit']];
    let tab = groups[0][1];
    const sw = (arr, key, isIdx = true) => `<div class="swatches">${arr.map((c, i) => `<button class="sw ${look[key] === (isIdx ? i : c) ? 'on' : ''}" style="background:${c}" data-k="${key}" data-v="${isIdx ? i : c}" aria-label="${key} ${i + 1}"></button>`).join('')}</div>`;
    const chips = (arr, key) => `<div class="chips-sel">${arr.map((c) => `<button class="${look[key] === c ? 'on' : ''}" data-k="${key}" data-v="${c}">${esc(c.replace('-', ' '))}</button>`).join('')}</div>`;
    const body = () => {
      const s = store.state;
      if (tab === 'face') return `<h4>Skin tone</h4>${sw(SKIN_TONES, 'skin')}<h4>Face shape</h4>${chips(FACE_SHAPES, 'face')}<h4>Eye colour</h4>${sw(EYE_COLORS, 'eyes')}<h4>Expression</h4>${chips(EXPRESSIONS, 'expression')}<h4>Facial hair</h4>${chips(FACIAL_HAIR, 'facialHair')}`;
      if (tab === 'hair') return `<h4>Style</h4>${chips(HAIR_STYLES, 'hair')}<h4>Colour</h4>${sw(HAIR_COLORS, 'hairColor')}`;
      if (tab === 'body') return `<h4>Build</h4>${chips(BODY_TYPES, 'body')}<h4>Height</h4><input type="range" min="0.92" max="1.08" step="0.01" value="${look.height}" data-h aria-label="Height"><small class="muted">${Math.round(175 * look.height)} cm</small>`;
      return SLOTS.map((slot) => { const owned = s.wardrobe.map((id) => CLOTHES[id]).filter((c) => c.slot === slot); return `<h4>${{ top: 'Top', bottom: 'Bottom', shoes: 'Shoes', head: 'Headwear', face: 'Eyewear', neck: 'Scarf' }[slot]}</h4><div class="swatches">${owned.map((c) => `<button class="sw cloth ${look[SLOT_KEY[slot]] === c.id ? 'on' : ''}" style="background:${c.id.startsWith('none_') ? 'repeating-linear-gradient(45deg,#444,#444 4px,#222 4px,#222 8px)' : c.color}" data-cloth="${c.id}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join('')}</div>`; }).join('') + `<p class="fine">${creator ? 'Buy more at Prairie Threads.' : 'Buy more clothing at Prairie Threads on Victoria Ave.'}</p>`;
    };
    const render = () => {
      p.innerHTML = `<div class="ph"><h3>${creator ? 'Create your character' : 'Wardrobe'}</h3>${creator ? '' : `<button class="x" data-x aria-label="Close">${ICON.close}</button>`}</div>
        ${creator ? `<label class="namef">Name<input data-name maxlength="16" value="${esc(store.state.player.name)}" autocomplete="off"></label>` : ''}
        ${groups.length > 1 ? `<div class="tabs">${groups.map(([n, k]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>` : ''}
        <div class="cbody">${body()}</div>
        ${creator ? `<div class="pbtns"><button class="btn" data-rand>Randomise</button><button class="btn primary" data-done>Start my life in Regina</button></div>` : ''}`;
    };
    const p = this._show('', 'char side', { dismissable: !creator, onClose: () => onDone?.(!creator) }); render();
    let rafH;
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return this.close();
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
      const k = e.target.closest('[data-k]'); if (k) { const v = k.dataset.v; look[k.dataset.k] = /^\d+$/.test(v) ? +v : v; this.ctx.rebuildPlayer(); render(); store.commit('look'); return; }
      const cl = e.target.closest('[data-cloth]'); if (cl) { G.equip(store, cl.dataset.cloth); this.ctx.rebuildPlayer(); render(); return; }
      if (e.target.closest('[data-rand]')) {
        const pick = (a) => a[Math.floor(Math.random() * a.length)];
        Object.assign(look, { skin: Math.floor(Math.random() * SKIN_TONES.length), hair: pick(HAIR_STYLES), hairColor: Math.floor(Math.random() * HAIR_COLORS.length), eyes: Math.floor(Math.random() * EYE_COLORS.length), face: pick(FACE_SHAPES), body: pick(BODY_TYPES), facialHair: pick(FACIAL_HAIR), expression: pick(['neutral', 'smile', 'smile']), height: 0.95 + Math.random() * 0.1 });
        this.ctx.rebuildPlayer(); render(); return;
      }
      if (e.target.closest('[data-done]')) { const nm = p.querySelector('[data-name]').value.trim() || 'Alex'; store.state.player.name = nm.slice(0, 16); this.close(); }
    });
    p.addEventListener('input', (e) => { if (e.target.dataset.h !== undefined) { look.height = +e.target.value; cancelAnimationFrame(rafH); rafH = requestAnimationFrame(() => this.ctx.rebuildPlayer()); } });
  }

  /** Furniture catalogue: buy (and sell unplaced pieces). */
  furnitureShop(onChange) {
    const { store } = this.ctx; let cat = 'All';
    const cats = ['All', ...new Set(Object.values(FURNITURE).map((f) => f.cat))];
    const render = () => {
      const s = store.state, bal = s.bank.balance, items = Object.values(FURNITURE).filter((f) => cat === 'All' || f.cat === cat);
      p.innerHTML = `<div class="ph"><h3>🛋️ Furniture shop</h3><span class="pill">${fmtMoney(bal)}</span><button class="x" data-x aria-label="Close">${ICON.close}</button></div>
        <div class="tabs">${cats.map((c) => `<button class="${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
        <div class="items">${items.map((f) => { const own = ownedCount(s, f.id), free = availableToPlace(s, f.id); return `<div class="item"><div class="swatch big" style="background:${f.color}"></div><b>${f.name}</b><small>${f.w}×${f.d} m${own ? ` · own ${own} (${free} in storage)` : ''}</small><div class="buy"><span>${fmtMoney(f.price)}</span>${free > 0 ? `<button class="btn small" data-sell="${f.id}" title="Sell for ${fmtMoney(Math.floor(f.price * SELL_RATIO))}">Sell</button>` : ''}<button class="btn small primary" data-buy="${f.id}" ${f.price > bal ? 'disabled' : ''}>Buy</button></div></div>`; }).join('')}</div>
        <p class="fine">Buy here, then place it with Redecorate on your computer. Selling returns ${Math.round(SELL_RATIO * 100)}% of the price. Souvenir posters from trips are free.</p>`;
    };
    const p = this._show('', 'shop wide'); render();
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return this.close();
      const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; render(); return; }
      const b = e.target.closest('[data-buy]'); const sl = e.target.closest('[data-sell]');
      if (b) { const r = buyFurniture(store, b.dataset.buy); if (r.ok) { this.ctx.audio?.blip('cash'); this.ctx.toast(`Bought ${FURNITURE[b.dataset.buy].name}`, 'good'); } else { this.ctx.audio?.blip('error'); this.ctx.toast(r.error, 'warn'); } render(); onChange?.(); }
      if (sl) { const r = sellFurniture(store, sl.dataset.sell); this.ctx.toast(r.ok ? `Sold for ${fmtMoney(r.refund)}` : r.error, r.ok ? 'good' : 'warn'); render(); onChange?.(); }
    });
  }
  /** Wall colour + flooring. */
  styleMenu(onChange) {
    const { store } = this.ctx;
    const render = () => {
      const h = store.state.home, ownedW = h.walls || ['cream'], ownedF = h.floors || ['oak'];
      p.innerHTML = `<div class="ph"><h3>🎨 Paint & flooring</h3><span class="pill">${fmtMoney(store.state.bank.balance)}</span><button class="x" data-x aria-label="Close">${ICON.close}</button></div>
        <h4 class="subh">Walls · ${fmtMoney(WALL_PRICE)} first time</h4><div class="swatches">${Object.entries(WALLS).map(([k, [n, c]]) => `<button class="sw ${h.wall === k ? 'on' : ''}" data-wall="${k}" style="background:${c}" title="${n}${ownedW.includes(k) ? '' : ' · ' + fmtMoney(WALL_PRICE)}" aria-label="${n}"></button>`).join('')}</div>
        <h4 class="subh">Floors · ${fmtMoney(FLOOR_PRICE)} first time</h4><div class="swatches">${Object.entries(FLOORS).map(([k, [n, , c]]) => `<button class="sw ${h.floor === k ? 'on' : ''}" data-floor="${k}" style="background:${c}" title="${n}${ownedF.includes(k) ? '' : ' · ' + fmtMoney(FLOOR_PRICE)}" aria-label="${n}"></button>`).join('')}</div>
        <p class="fine">Styles you've bought can be switched freely.</p>`;
    };
    const p = this._show('', 'shop'); render();
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return this.close();
      const w = e.target.closest('[data-wall]'), f = e.target.closest('[data-floor]');
      const r = w ? setStyle(store, 'wall', w.dataset.wall) : f ? setStyle(store, 'floor', f.dataset.floor) : null; if (!r) return;
      if (r.ok) { this.ctx.audio?.blip('ok'); onChange?.(); } else { this.ctx.audio?.blip('error'); this.ctx.toast(r.error, 'warn'); } render();
    });
  }

  /** Fridge: eat stored food. */
  fridge() {
    const { store, G } = this.ctx;
    const render = () => {
      const inv = Object.entries(store.state.inventory);
      p.innerHTML = `<div class="ph"><h3>Fridge & pantry</h3><button class="x" data-x aria-label="Close">${ICON.close}</button></div><div class="items">${inv.length ? inv.map(([id, q]) => `<div class="item"><div class="emoji">${FOOD[id].icon}</div><b>${esc(FOOD[id].name)} ×${q}</b><small>+${FOOD[id].hunger} hunger</small><div class="buy"><button class="btn small primary" data-eat="${id}">Eat</button></div></div>`).join('') : '<p class="empty big">Nothing here yet.<br>Buy groceries at Prairie Corner Market.</p>'}</div>`;
    };
    const p = this._show('', 'shop'); render();
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return this.close();
      const b = e.target.closest('[data-eat]'); if (!b) return; const r = G.consume(store, b.dataset.eat);
      if (r.ok) { this.ctx.audio?.blip('ok'); this.ctx.player.gesture('use'); this.ctx.toast(`Ate ${r.food.name}`, 'good'); } render();
    });
  }
  cook() {
    const { store, G } = this.ctx;
    const render = () => {
      const inv = store.state.inventory;
      p.innerHTML = `<div class="ph"><h3>Cook a meal</h3><button class="x" data-x aria-label="Close">${ICON.close}</button></div><div class="items">${RECIPES.map((r) => { const ok = Object.entries(r.needs).every(([id, n]) => (inv[id] || 0) >= n); return `<div class="item"><div class="emoji">${r.icon}</div><b>${r.name}</b><small>${Object.entries(r.needs).map(([id, n]) => `${n}× ${FOOD[id].name}`).join(' + ')}</small><small>+${r.hunger} hunger · +${r.mood} mood</small><div class="buy"><button class="btn small primary" data-cook="${r.id}" ${ok ? '' : 'disabled'}>Cook</button></div></div>`; }).join('')}</div>`;
    };
    const p = this._show('', 'shop'); render();
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return this.close();
      const b = e.target.closest('[data-cook]'); if (!b) return; const r = G.cook(store, b.dataset.cook);
      if (r.ok) { this.ctx.audio?.blip('ok'); this.ctx.toast(`${r.recipe.name} — delicious!`, 'good'); this.ctx.player.gesture('use'); } else this.ctx.toast(r.error, 'warn'); render();
    });
  }
}
