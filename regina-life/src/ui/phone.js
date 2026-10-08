import { ICON, APP_STYLE } from './icons.js';
import { APPS, APP_BY_ID } from './apps.js';
import { unreadTotal } from '../core/game.js';
import { fmtMoney } from '../core/ledger.js';
import { sunTimes, hoursLabel } from '../core/time.js';
import { CONTACTS } from '../data/contacts.js';

import { WALLPAPERS } from './wallpapers.js';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class Phone {
  constructor(root, ctx) {
    this.root = root; this.ctx = ctx; this.view = 'lock'; this.app = null; this.appInst = null; this.isOpen = false; this.call = null;
    this.page = 0;
    root.innerHTML = `
      <div class="phone-shell">
        <div class="phone-body">
          <i class="side-btn s1"></i><i class="side-btn s2"></i><i class="side-btn s3"></i><i class="side-btn s4"></i>
          <div class="phone-screen">
            <div class="wp"></div>
            <section class="layer lock"></section>
            <section class="layer home"></section>
            <section class="layer apphost"></section>
            <div class="banner" hidden></div>
            <div class="sheet notif"><div class="grab"></div><div class="sheet-in"></div></div>
            <div class="sheet ctrl"><div class="grab"></div><div class="sheet-in"></div></div>
            <div class="callov" hidden></div>
            <header class="statusbar"><button class="sb-left" aria-label="Notification centre"></button><div class="island"></div><button class="sb-right" aria-label="Control centre"></button></header>
            <button class="home-ind" aria-label="Home"></button>
            <div class="dim"></div>
          </div>
        </div>
      </div>`;
    this.$ = (s) => root.querySelector(s);
    this.screen = this.$('.phone-screen');
    this.buildLock(); this.buildHome(); this.buildSheets(); this.bindGestures();
    this.applyWallpaper(); this.fit(); addEventListener('resize', () => this.fit());
    ctx.store.subscribe((topic) => this.onStore(topic));
  }

  fit() { const s = Math.min(1, (innerHeight - 24) / 740, (innerWidth - 12) / 360); this.root.style.setProperty('--ps', s.toFixed(3)); }
  get state() { return this.ctx.store.state; }

  /* ---------------- open / close ---------------- */
  open() { if (this.isOpen) return; this.isOpen = true; this.root.classList.add('open'); this.ctx.onPhoneToggle?.(true); this.tick(); if (this.view === 'app') this.appInst?.update?.(); }
  close() { if (!this.isOpen) return; this.isOpen = false; this.root.classList.remove('open'); this.closeSheets(); this.ctx.onPhoneToggle?.(false); if (this.state.phone.unlocked) { /* keep unlocked state for convenience */ } }
  toggle() { this.isOpen ? this.close() : this.open(); }
  lockNow() { this.state.phone.unlocked = false; this.goHome(true); this.setView('lock'); }

  setView(v) {
    this.view = v;
    this.$('.lock').classList.toggle('on', v === 'lock');
    this.$('.home').classList.toggle('on', v === 'home' || v === 'app');
    this.$('.home').classList.toggle('behind', v === 'app');
    this.$('.apphost').classList.toggle('on', v === 'app');
    this.$('.home-ind').classList.toggle('hide', v === 'lock');
    this.screen.dataset.view = v;
    this.renderStatus();
  }
  unlock() {
    if (this.view !== 'lock') return;
    this.ctx.audio?.blip('swipe'); this.state.phone.unlocked = true; this.setView('home'); this.refreshHome();
  }
  goHome(instant = false) {
    this.closeSheets();
    if (this.view === 'app') this.closeApp(instant);
  }

  /* ---------------- wallpaper & status ---------------- */
  applyWallpaper() { this.$('.wp').style.background = WALLPAPERS[this.state.phone.wallpaper % WALLPAPERS.length].css; }
  renderStatus() {
    const p = this.state.phone, c = this.ctx.clock();
    const sig = p.airplane ? ICON.plane : '<span class="bars"><i></i><i></i><i></i><i></i></span>';
    const bat = Math.round(p.battery);
    this.$('.sb-left').innerHTML = `<span class="sb-time">${c.label}</span>${p.dnd ? `<span class="sb-ic">${ICON.moon}</span>` : ''}`;
    this.$('.sb-right').innerHTML = `${sig}${p.airplane ? '' : p.wifi ? `<span class="sb-ic">${ICON.wifi}</span>` : '<b class="lte">LTE</b>'}<span class="batt ${bat < 20 ? 'low' : ''}"><i style="width:${bat}%"></i></span>`;
    this.screen.style.setProperty('--bright', p.brightness);
    this.$('.dim').style.opacity = String(Math.max(0, 0.75 * (1 - p.brightness)));
  }
  tick() { if (!this.isOpen) return; this.renderStatus(); this.refreshLock(); if (this.view !== 'app') this.refreshHomeWidgets(); }

  /* ---------------- lock screen ---------------- */
  buildLock() {
    this.$('.lock').innerHTML = `
      <div class="lock-time"><div class="lt-date"></div><div class="lt-clock"></div></div>
      <div class="lock-widgets"></div>
      <div class="lock-notifs"></div>
      <div class="lock-bottom"><button class="round-btn" data-act="flash">${ICON.flash}</button><div class="swipe-hint">Swipe up to open</div><button class="round-btn" data-act="cam">${ICON.camera}</button></div>`;
    this.$('.lock').addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'flash') { this.state.phone.flashlight = !this.state.phone.flashlight; this.ctx.store.commit('phone'); }
      else if (a === 'cam') { this.unlock(); this.openApp('camera'); }
      else if (e.target.closest('.swipe-hint')) this.unlock();
      else if (e.target.closest('.nl')) this.unlock();
    });
  }
  refreshLock() {
    const c = this.ctx.clock(), w = this.ctx.weather(), s = this.state, L = this.$('.lock');
    L.querySelector('.lt-date').textContent = c.dateLabel;
    L.querySelector('.lt-clock').textContent = c.label;
    L.querySelector('.lock-widgets').innerHTML = `<div class="lw"><span>${w.icon}</span><b>${w.temp}°</b><small>${esc(w.text)}${w.live ? '' : ' · sim'}</small></div><div class="lw"><span>💳</span><b>${fmtMoney(s.bank.balance)}</b><small>Wascana CU</small></div>`;
    const ns = s.notifications.slice(0, 3);
    L.querySelector('.lock-notifs').innerHTML = ns.map((n) => this.notifHtml(n, 'nl')).join('');
    L.querySelector('[data-act="flash"]').classList.toggle('on', s.phone.flashlight);
  }
  notifHtml(n, cls = '') {
    const st = APP_STYLE[n.app] ?? ['#999', '#666'];
    const ago = Math.max(0, Math.round((this.ctx.store.now() - n.t) / 60000));
    return `<div class="notif-card ${cls}" data-app="${n.app}" data-id="${n.id}"><i class="ni" style="background:linear-gradient(${st[0]},${st[1]})">${ICON[n.app] ?? ''}</i><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p></div><small>${ago < 1 ? 'now' : ago + 'm'}</small></div>`;
  }

  /* ---------------- home screen ---------------- */
  buildHome() {
    const grid = ['contacts', 'bank', 'jobs', 'photos', 'weather', 'calendar', 'inventory', 'settings'];
    const dock = ['phone', 'messages', 'maps', 'camera'];
    this.$('.home').innerHTML = `
      <div class="pages"><div class="page p1">
        <div class="widgets"><div class="wg wg-weather" data-open="weather"></div><div class="wg wg-bank" data-open="bank"></div></div>
        <div class="icons">${grid.map((id) => this.iconHtml(id)).join('')}</div>
      </div><div class="page p2">
        <div class="icons">${['life', 'news', 'ads'].map((id) => this.iconHtml(id)).join('')}</div>
        <div class="wg wide wg-today" data-open="calendar"></div>
        <div class="wg wide wg-job" data-open="jobs"></div>
        <div class="wg wide wg-needs" data-open="inventory"></div>
      </div></div>
      <div class="dots"><i class="on"></i><i></i></div>
      <div class="dock">${dock.map((id) => this.iconHtml(id, true)).join('')}</div>`;
    const home = this.$('.home'), pages = home.querySelector('.pages');
    pages.addEventListener('scroll', () => { const i = Math.round(pages.scrollLeft / pages.clientWidth); home.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i)); });
    home.addEventListener('click', (e) => {
      const ic = e.target.closest('[data-app]'); if (ic) { this.openApp(ic.dataset.app, ic); return; }
      const wg = e.target.closest('[data-open]'); if (wg) this.openApp(wg.dataset.open, wg);
    });
  }
  iconHtml(id, dock = false) {
    const a = APP_BY_ID[id], st = APP_STYLE[id];
    return `<button class="app-ic" data-app="${id}" aria-label="${a.name}"><i class="ic" style="background:linear-gradient(160deg,${st[0]},${st[1]});color:${id === 'calendar' ? '#e63946' : '#fff'}">${ICON[id]}<b class="badge" hidden></b></i>${dock ? '' : `<span>${a.name}</span>`}</button>`;
  }
  refreshHome() { this.refreshHomeWidgets(); this.refreshBadges(); }
  refreshBadges() {
    const un = unreadTotal(this.state);
    this.root.querySelectorAll('.app-ic[data-app="messages"] .badge').forEach((b) => { b.hidden = !un; b.textContent = un; });
    const missed = (this.state.calls || []).filter((c) => c.missed && !c.seen).length;
    this.root.querySelectorAll('.app-ic[data-app="phone"] .badge').forEach((b) => { b.hidden = !missed; b.textContent = missed; });
    const off = this.state.job.application?.status === 'offered' ? 1 : 0;
    this.root.querySelectorAll('.app-ic[data-app="jobs"] .badge').forEach((b) => { b.hidden = !off; b.textContent = off; });
  }
  refreshHomeWidgets() {
    const H = this.$('.home'), w = this.ctx.weather(), s = this.state, c = this.ctx.clock(), st = sunTimes(this.ctx.clock().date);
    H.querySelector('.wg-weather').innerHTML = `<small>Regina</small><div class="big">${w.temp}°</div><div class="wi">${w.icon} ${esc(w.text)}</div><small>H ${w.hi}° L ${w.lo}° ${w.live ? '' : '· <u>simulated</u>'}</small>`;
    const hist = s.bank.history.slice(0, 8).reverse();
    let bars = ''; const mx = Math.max(1, ...hist.map((h) => h.amount));
    hist.forEach((h) => (bars += `<i class="${h.type}" style="height:${10 + (h.amount / mx) * 30}px"></i>`));
    H.querySelector('.wg-bank').innerHTML = `<small>Wascana CU</small><div class="mid">${fmtMoney(s.bank.balance)}</div><div class="spark">${bars || '<em>No activity yet</em>'}</div>`;
    H.querySelector('.wg-today').innerHTML = `<small>Today · ${c.shortDate}</small><div class="row2"><div><b>${c.label} ${c.ampm}</b><span>Regina time (CST)</span></div><div><span>🌅 ${hoursLabel(st.sunrise)}</span><span>🌇 ${hoursLabel(st.sunset)}</span></div></div>`;
    const j = s.job.active, app = s.job.application;
    H.querySelector('.wg-job').innerHTML = j ? `<small>Career</small><b>${esc(this.ctx.jobTitle())}</b><span>${s.job.shift ? `Shift ${s.job.shift.tasksDone}/${s.job.shift.tasksTotal} tasks` : 'Off shift · head to work'}</span>` : app ? `<small>Career</small><b>Application ${app.status === 'offered' ? 'offer received!' : 'pending…'}</b><span>Open Jobs to respond</span>` : `<small>Career</small><b>Looking for work?</b><span>Browse openings in Jobs</span>`;
    const n = s.needs;
    H.querySelector('.wg-needs').innerHTML = `<small>You</small><div class="needs">${[['⚡', n.energy], ['🍽️', n.hunger], ['🚿', n.hygiene ?? 0], ['🎉', n.fun ?? 0], ['🙂', n.mood]].map(([i, v]) => `<div><span>${i}</span><div class="bar"><i style="width:${v}%"></i></div></div>`).join('')}</div>`;
  }

  /* ---------------- apps ---------------- */
  openApp(id, fromEl) {
    if (this.view === 'lock') this.unlock();
    if (!APP_BY_ID[id]) return;
    if (this.view === 'app') { if (this.app === id) return; this.closeApp(true); }
    if (!this.isOpen) this.open();
    const a = APP_BY_ID[id], host = this.$('.apphost');
    host.innerHTML = `<div class="app-win" data-app-id="${id}"><div class="app-body"></div></div>`;
    const win = host.firstChild, body = win.querySelector('.app-body');
    const sr = this.screen.getBoundingClientRect(), k = sr.width / this.screen.offsetWidth || 1;
    const er = (fromEl ?? this.$(`.app-ic[data-app="${id}"]`))?.getBoundingClientRect();
    const ox = er ? (er.left + er.width / 2 - sr.left) / k : 160, oy = er ? (er.top + er.height / 2 - sr.top) / k : 560;
    win.style.transformOrigin = `${ox}px ${oy}px`;
    this.app = id; this.setView('app');
    this.appInst = a.mount(body, this.ctx, this);
    this.ctx.audio?.blip('swipe');
    win.animate([{ transform: 'scale(.14)', borderRadius: '30px', opacity: 0.2 }, { transform: 'scale(1)', borderRadius: '0px', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2,.85,.25,1)' });
    this.screen.dataset.app = id;
  }
  closeApp(instant = false) {
    if (this.view !== 'app') return;
    const host = this.$('.apphost'), win = host.firstChild; const inst = this.appInst; this.appInst = null; const id = this.app; this.app = null;
    this.setView('home'); this.refreshHome();
    const fin = () => { inst?.destroy?.(); host.innerHTML = ''; };
    if (instant || !win) return fin();
    const ic = this.$(`.app-ic[data-app="${id}"]`), sr = this.screen.getBoundingClientRect(), k = sr.width / this.screen.offsetWidth || 1, er = ic?.getBoundingClientRect();
    if (er) win.style.transformOrigin = `${(er.left + er.width / 2 - sr.left) / k}px ${(er.top + er.height / 2 - sr.top) / k}px`;
    host.classList.add('closing');
    win.animate([{ transform: 'scale(1)', borderRadius: '0px', opacity: 1 }, { transform: 'scale(.14)', borderRadius: '30px', opacity: 0 }], { duration: 280, easing: 'cubic-bezier(.4,0,.8,.3)', fill: 'forwards' }).onfinish = () => { host.classList.remove('closing'); fin(); };
  }

  /* ---------------- notification & control centres ---------------- */
  buildSheets() {
    this.$('.notif .sheet-in').addEventListener('click', (e) => {
      const card = e.target.closest('.notif-card'); if (card) { this.closeSheets(); this.openApp(card.dataset.app); return; }
      if (e.target.closest('[data-act="clear"]')) { this.state.notifications = []; this.ctx.store.commit('notify-silent'); this.renderNotifSheet(); }
    });
    const cc = this.$('.ctrl .sheet-in');
    cc.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tog]'); const p = this.state.phone;
      if (t) {
        const k = t.dataset.tog; p[k] = !p[k]; this.ctx.audio?.blip('tick');
        if (k === 'airplane' && !p.airplane) this.ctx.flushPending();
        this.ctx.store.commit('phone'); this.renderCtrl(); this.renderStatus(); return;
      }
      const sh = e.target.closest('[data-short]'); if (sh) { this.closeSheets(); if (sh.dataset.short === 'map') { this.ctx.openMap(); this.close(); } else this.openApp(sh.dataset.short); }
    });
    cc.addEventListener('input', (e) => { const k = e.target.dataset.slider; if (!k) return; this.state.phone[k] = +e.target.value; this.renderStatus(); this.ctx.store.commit('phone-quiet'); });
  }
  renderNotifSheet() {
    const n = this.state.notifications;
    this.$('.notif .sheet-in').innerHTML = `<div class="sheet-head"><h3>Notification Centre</h3>${n.length ? '<button data-act="clear">Clear</button>' : ''}</div><div class="sheet-scroll">${n.length ? n.map((x) => this.notifHtml(x)).join('') : '<p class="empty">No notifications</p>'}</div>`;
  }
  renderCtrl() {
    const p = this.state.phone;
    const tile = (k, icon, label, on) => `<button class="tile ${on ? 'on' : ''}" data-tog="${k}">${icon}<span>${label}</span></button>`;
    this.$('.ctrl .sheet-in').innerHTML = `
      <div class="tiles">${tile('airplane', ICON.plane, 'Airplane', p.airplane)}${tile('wifi', ICON.wifi, 'Wi-Fi', p.wifi)}${tile('bluetooth', ICON.bt, 'Bluetooth', p.bluetooth)}${tile('dnd', ICON.moon, 'Focus', p.dnd)}${tile('flashlight', ICON.flash, 'Torch', p.flashlight)}</div>
      <label class="slider">${ICON.sun}<input type="range" min="0.25" max="1" step="0.01" value="${p.brightness}" data-slider="brightness" aria-label="Brightness"></label>
      <label class="slider">${ICON.volume}<input type="range" min="0" max="1" step="0.01" value="${p.volume}" data-slider="volume" aria-label="Volume"></label>
      <div class="shorts"><button data-short="camera">${ICON.camera}<span>Camera</span></button><button data-short="map">${ICON.maps}<span>City Map</span></button><button data-short="settings">${ICON.settings}<span>Settings</span></button></div>
      <p class="fine">Toggles are simulated phone states.</p>`;
  }
  openSheet(which) {
    if (this.view === 'lock' && which === 'ctrl') { /* allowed from lock like a real phone */ }
    this.closeSheets(which); if (which === 'notif') this.renderNotifSheet(); else this.renderCtrl();
    this.$('.' + which).classList.add('open'); this.ctx.audio?.blip('swipe');
  }
  closeSheets(except) { this.root.querySelectorAll('.sheet').forEach((s) => !except || !s.classList.contains(except) ? s.classList.remove('open') : null); }

  /* ---------------- gestures ---------------- */
  bindGestures() {
    const sr = this.screen;
    this.$('.sb-left').addEventListener('click', () => (this.$('.notif').classList.contains('open') ? this.closeSheets() : this.openSheet('notif')));
    this.$('.sb-right').addEventListener('click', () => (this.$('.ctrl').classList.contains('open') ? this.closeSheets() : this.openSheet('ctrl')));
    this.$('.home-ind').addEventListener('click', () => { if (this.root.querySelector('.sheet.open')) this.closeSheets(); else if (this.view === 'app') this.closeApp(); else if (this.view === 'home') this.close(); });
    let start = null;
    sr.addEventListener('pointerdown', (e) => { if (e.target.closest('input,textarea,button.tile,.slider,.pages,.sheet-scroll,.msg-scroll')) { start = null; if (!e.target.closest('.pages')) return; } start = { x: e.clientX, y: e.clientY, t: performance.now(), top: e.clientY - sr.getBoundingClientRect().top < 56 * (sr.getBoundingClientRect().height / sr.offsetHeight), id: e.pointerId }; });
    sr.addEventListener('pointerup', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y, k = sr.getBoundingClientRect().height / sr.offsetHeight || 1;
      const rect = sr.getBoundingClientRect(), fromBottom = rect.bottom - (start.y) < 70 * k;
      if (dy < -70 * k && Math.abs(dx) < Math.abs(dy)) {
        if (this.view === 'lock') this.unlock();
        else if (fromBottom && this.view === 'app') this.closeApp();
        else if (this.root.querySelector('.sheet.open')) this.closeSheets();
      } else if (dy > 60 * k && start.top && Math.abs(dx) < Math.abs(dy) * 1.2) {
        this.openSheet(start.x - rect.left > rect.width * 0.55 ? 'ctrl' : 'notif');
      }
      start = null;
    });
    addEventListener('keydown', (e) => { if (this.isOpen && this.view === 'lock' && (e.key === 'Enter' || e.key === ' ') && !e.target.closest?.('input,textarea')) { e.preventDefault(); e.stopPropagation(); this.unlock(); } }, true);
  }

  /* ---------------- banners & store sync ---------------- */
  onStore(topic) {
    if (topic === 'phone' || topic === 'phone-quiet' || topic === 'reset') { this.applyWallpaper(); this.renderStatus(); }
    if (topic === 'notify' && this.state.notifications[0]) this.banner(this.state.notifications[0]);
    if (topic === 'notify' || topic === 'notify-silent' || topic === 'messages') { this.refreshBadges(); if (this.$('.notif').classList.contains('open')) this.renderNotifSheet(); }
    if (this.isOpen) {
      if (this.view === 'lock') this.refreshLock();
      else if (this.view === 'home') this.refreshHome();
      else if (this.view === 'app') this.appInst?.update?.(topic);
    }
    if (topic === 'jobs' || topic === 'bank' || topic === 'needs') this.refreshBadges();
  }
  banner(n) {
    const p = this.state.phone;
    if (p.dnd) return;
    this.ctx.audio?.blip('notify');
    if (this.view === 'app' && this.app === 'messages' && n.app === 'messages') return;
    this.ctx.hudBanner?.(n);
    if (!this.isOpen) return;
    const b = this.$('.banner'); b.innerHTML = this.notifHtml(n); b.hidden = false; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(this._bt); this._bt = setTimeout(() => { b.classList.remove('show'); setTimeout(() => (b.hidden = true), 350); }, 3400);
    b.onclick = () => { b.hidden = true; this.openApp(n.app); };
  }

  /* ---------------- calls ---------------- */
  incomingCall(contactId, openingLine) {
    if (this.state.phone.airplane) { this.recordCall(contactId, 'in', true); this.ctx.G.notify(this.ctx.store, { app: 'phone', title: 'Missed call', body: CONTACTS[contactId].name }); return; }
    if (this.call) return;
    this.call = { id: contactId, state: 'ringing', dir: 'in', line: openingLine, t0: 0 };
    this._autoOpened = !this.isOpen; this.open(); if (this.view === 'app') this.closeApp(true); this.setView(this.state.phone.unlocked ? 'home' : 'lock');
    this.renderCall(); if (!this.state.phone.dnd) this.ctx.audio?.startRing(); else this._missTimer();
    this._missT = setTimeout(() => { if (this.call?.state === 'ringing') this.endCall(true); }, 16000);
  }
  startCall(contactId) {
    if (this.call) return; const c = CONTACTS[contactId];
    if (this.state.phone.airplane) { this.ctx.toast('Airplane mode is on', 'warn'); return; }
    this.call = { id: contactId, state: 'dialing', dir: 'out', t0: 0 }; this.renderCall();
    setTimeout(() => { if (this.call?.id === contactId && this.call.state === 'dialing') this.answer(); }, 1400 + Math.random() * 1000);
  }
  answer() {
    if (!this.call) return; this.ctx.audio?.stopRing(); clearTimeout(this._missT);
    this.call.state = 'active'; this.call.t0 = performance.now(); this.call.caption = this.call.line || this.ctx.callLine(this.call.id); this.renderCall();
    this._ct = setInterval(() => { const p = this.$('.callov .call-top p'); if (p && this.call) { const secs = Math.floor((performance.now() - this.call.t0) / 1000); p.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; } }, 500);
  }
  _missTimer() {}
  endCall(missed = false) {
    if (!this.call) return; this.ctx.audio?.stopRing(); clearInterval(this._ct); clearTimeout(this._missT);
    const c = this.call; this.call = null;
    this.recordCall(c.id, c.dir, missed || c.state === 'ringing', c.state === 'active' ? Math.round((performance.now() - c.t0) / 1000) : 0);
    if (c.state === 'ringing') this.ctx.G.notify(this.ctx.store, { app: 'phone', title: 'Missed call', body: CONTACTS[c.id].name });
    this.$('.callov').hidden = true;
    if (this._autoOpened && c.state !== 'active') { this._autoOpened = false; this.close(); }
    if (this.app === 'phone') this.appInst?.update?.('calls');
  }
  recordCall(id, dir, missed, dur = 0) {
    (this.state.calls ||= []).unshift({ id, dir, missed, dur, t: this.ctx.store.now(), seen: false }); this.state.calls.length = Math.min(this.state.calls.length, 30);
    this.ctx.store.commit('calls');
  }
  renderCall() {
    const o = this.$('.callov'), c = this.call; if (!c) { o.hidden = true; return; }
    const ct = CONTACTS[c.id], init = ct.name[0];
    const secs = c.state === 'active' ? Math.floor((performance.now() - c.t0) / 1000) : 0, tm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    o.hidden = false; o.className = 'callov ' + c.state;
    o.innerHTML = `<div class="call-top"><div class="avatar big" style="background:${ct.color}">${init}</div><h2>${esc(ct.name)}</h2><p>${c.state === 'ringing' ? 'incoming call…' : c.state === 'dialing' ? 'calling…' : tm}</p>${c.caption ? `<div class="caption">“${esc(c.caption)}”</div>` : ''}<small>${esc(ct.sub)}</small></div>
      <div class="call-btns">${c.state === 'ringing' ? `<button class="cb red" data-c="decline">${ICON.phone}<span>Decline</span></button><button class="cb green" data-c="accept">${ICON.phone}<span>Accept</span></button>` : `<div class="cgrid"><span>${ICON.mic}<i>mute</i></span><span>${ICON.keypad}<i>keypad</i></span><span>${ICON.speaker}<i>speaker</i></span></div><button class="cb red" data-c="end">${ICON.phone}<span>End</span></button>`}</div>`;
    o.onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; const a = b.dataset.c; if (a === 'accept') this.answer(); else this.endCall(a === 'decline'); };
  }
}
