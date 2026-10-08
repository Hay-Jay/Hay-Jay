import { FOOD, CLOTHES, SLOTS, SLOT_KEY, SKIN_TONES, HAIR_COLORS, EYE_COLORS, HAIR_STYLES, FACE_SHAPES, BODY_TYPES, FACIAL_HAIR, EXPRESSIONS, STORE_STOCK, ITEM_NAME } from '../data/catalog.js';
import { RECIPES } from '../core/game.js';
import { fmtMoney } from '../core/ledger.js';
import { ICON } from './icons.js';

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
