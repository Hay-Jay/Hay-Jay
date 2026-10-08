import { ICON, APP_STYLE } from './icons.js';
import { CONTACTS, CONTACT_ORDER } from '../data/contacts.js';
import { JOBS, XP_PER_TASK } from '../data/jobs.js';
import { FOOD, CLOTHES, SLOTS, SLOT_KEY } from '../data/catalog.js';
import { POIS, CAT_ICON, poiById } from '../world/cityData.js';
import { MapView } from './map.js';
import { fmtMoney } from '../core/ledger.js';
import { sunTimes, hoursLabel, reginaParts, TZ } from '../core/time.js';
import { WALLPAPERS } from './wallpapers.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nav = (title, { back = false, right = '' } = {}) => `<div class="nav">${back ? `<button class="nav-back" data-act="back">${ICON.back}<span>Back</span></button>` : '<span></span>'}<h2>${title}</h2><span class="nav-right">${right}</span></div>`;
const timeAgo = (t, now) => { const m = Math.round((now - t) / 60000); return m < 1 ? 'now' : m < 60 ? `${m}m` : `${Math.round(m / 60)}h`; };
const avatar = (c, big) => `<div class="avatar ${big ? 'big' : ''}" style="background:${c.color}">${esc(c.name[0])}</div>`;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const walkEta = (m) => { const s = m / 3.1; return s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`; };
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

function app(id, name, mount) { return { id, name, mount }; }

/* ================= MESSAGES ================= */
const messages = app('messages', 'Messages', (body, ctx) => {
  const { store, G } = ctx; let thread = null, typing = null;
  const listView = () => {
    const s = store.state;
    const rows = CONTACT_ORDER.map((id) => { const c = CONTACTS[id], m = s.messages[id] || [], last = m[m.length - 1], un = s.unread[id] || 0; return { id, c, last, un }; })
      .sort((a, b) => (b.last?.t || 0) - (a.last?.t || 0));
    body.innerHTML = `${nav('Messages')}<div class="scroll"><div class="list">${rows.map(({ id, c, last, un }) => `<button class="row" data-th="${id}">${avatar(c)}<div class="grow"><b>${esc(c.name)}</b><p class="${un ? 'unread' : ''}">${last ? esc((last.from === 'me' ? 'You: ' : '') + last.text) : 'No messages yet'}</p></div><small>${last ? timeAgo(last.t, store.now()) : ''}</small>${un ? `<span class="dot">${un}</span>` : ''}</button>`).join('')}</div>
      <p class="fine pad">Chats are with in-game <b>NPCs</b>. Messaging real players arrives with the multiplayer server.</p></div>`;
  };
  const bubbles = () => {
    const m = store.state.messages[thread] || [];
    return m.map((x) => `<div class="bub ${x.from === 'me' ? 'me' : 'them'}">${esc(x.text)}</div>`).join('') + (typing === thread ? '<div class="bub them typing"><i></i><i></i><i></i></div>' : '');
  };
  const threadView = () => {
    const c = CONTACTS[thread];
    body.innerHTML = `${nav(esc(c.name), { back: true })}<div class="msg-scroll">${bubbles()}</div><form class="composer"><input placeholder="Message" maxlength="300" autocomplete="off" aria-label="Message"><button type="submit" aria-label="Send">${ICON.send}</button></form>`;
    const sc = body.querySelector('.msg-scroll'); sc.scrollTop = sc.scrollHeight;
  };
  const refreshThread = () => { const sc = body.querySelector('.msg-scroll'); if (!sc) return; sc.innerHTML = bubbles(); sc.scrollTop = sc.scrollHeight; };
  body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-th]'); if (t) { thread = t.dataset.th; store.state.unread[thread] = 0; threadView(); store.commit('messages'); return; }
    if (e.target.closest('[data-act="back"]')) { thread = null; listView(); }
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault(); const inp = body.querySelector('.composer input'); const v = inp.value.trim(); if (!v) return; inp.value = '';
    typing = thread; G.sendMessage(store, thread, v); refreshThread(); ctx.audio?.blip('tick');
    setTimeout(() => { typing = null; refreshThread(); }, 1900);
  });
  listView();
  return { update(topic) { if (thread) { if (store.state.unread[thread]) store.state.unread[thread] = 0; refreshThread(); } else listView(); } };
});

/* ================= PHONE (CALLS) ================= */
const phoneApp = app('phone', 'Phone', (body, ctx, phone) => {
  const { store } = ctx; let tab = 'recents';
  const render = () => {
    const s = store.state, calls = s.calls || [];
    body.innerHTML = `${nav('Phone')}<div class="seg">${['recents', 'contacts'].map((t) => `<button class="${tab === t ? 'on' : ''}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><div class="scroll"><div class="list">${tab === 'recents'
      ? (calls.length ? calls.map((c) => `<div class="row">${avatar(CONTACTS[c.id])}<div class="grow"><b class="${c.missed ? 'red' : ''}">${esc(CONTACTS[c.id].name)}</b><p>${c.dir === 'in' ? (c.missed ? 'Missed call' : 'Incoming') : 'Outgoing'}${c.dur ? ` · ${Math.floor(c.dur / 60)}:${String(c.dur % 60).padStart(2, '0')}` : ''}</p></div><small>${timeAgo(c.t, store.now())}</small><button class="icon-btn green" data-call="${c.id}" aria-label="Call">${ICON.phone}</button></div>`).join('') : '<p class="empty">No recent calls</p>')
      : CONTACT_ORDER.map((id) => `<div class="row">${avatar(CONTACTS[id])}<div class="grow"><b>${esc(CONTACTS[id].name)}</b><p>${esc(CONTACTS[id].sub)}</p></div><button class="icon-btn green" data-call="${id}" aria-label="Call ${esc(CONTACTS[id].name)}">${ICON.phone}</button></div>`).join('')}</div>
      <p class="fine pad">Calls are simulated NPC calls. Voice chat with real players comes with multiplayer.</p></div>`;
    (store.state.calls || []).forEach((c) => (c.seen = true));
  };
  body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
    const c = e.target.closest('[data-call]'); if (c) { phone.startCall(c.dataset.call); }
  });
  render();
  return { update() { render(); } };
});

/* ================= CONTACTS ================= */
const contactsApp = app('contacts', 'Contacts', (body, ctx, phone) => {
  const { store } = ctx; let sel = null;
  const render = () => {
    const s = store.state; s.saved ||= [];
    if (sel) {
      const c = CONTACTS[sel], place = c.place ? poiById[c.place] : null;
      body.innerHTML = `${nav('Contact', { back: true })}<div class="scroll center-col">${avatar(c, true)}<h1>${esc(c.name)}</h1><p class="muted">${esc(c.sub)}</p>
        <div class="actions3"><button data-do="msg">${ICON.messages}<span>message</span></button><button data-do="call">${ICON.phone}<span>call</span></button>${place ? `<button data-do="nav">${ICON.maps}<span>navigate</span></button>` : ''}</div>
        ${place ? `<div class="list inset"><div class="row"><div class="grow"><b>Address</b><p>${esc(place.name)}</p></div></div></div>` : ''}</div>`;
      return;
    }
    const saved = s.saved.map((id) => poiById[id]).filter(Boolean);
    body.innerHTML = `${nav('Contacts')}<div class="scroll"><div class="list">${CONTACT_ORDER.map((id) => `<button class="row" data-c="${id}">${avatar(CONTACTS[id])}<div class="grow"><b>${esc(CONTACTS[id].name)}</b><p>${esc(CONTACTS[id].sub)}</p></div></button>`).join('')}</div>
      <h4 class="sec">Saved Places</h4><div class="list">${saved.length ? saved.map((p) => `<button class="row" data-place="${p.id}"><div class="avatar" style="background:#e0a02f">${CAT_ICON[p.cat]}</div><div class="grow"><b>${esc(p.name)}</b><p>${fmtDist(dist(ctx.player(), p))} away</p></div></button>`).join('') : '<p class="empty">Star places in Maps to save them here</p>'}</div></div>`;
  };
  body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-c]'); if (c) { sel = c.dataset.c; render(); return; }
    if (e.target.closest('[data-act="back"]')) { sel = null; render(); return; }
    const p = e.target.closest('[data-place]'); if (p) { ctx.setDestination(poiById[p.dataset.place]); phone.openApp('maps'); return; }
    const d = e.target.closest('[data-do]')?.dataset.do;
    if (d === 'msg') phone.openApp('messages'); if (d === 'call') phone.startCall(sel);
    if (d === 'nav') { ctx.setDestination(poiById[CONTACTS[sel].place]); phone.openApp('maps'); }
  });
  render();
  return { update() { if (!sel) render(); } };
});

/* ================= MAPS ================= */
const mapsApp = app('maps', 'Maps', (body, ctx, phone) => {
  const { store } = ctx; let raf, selPoi = null, q = '';
  body.innerHTML = `<div class="map-app"><div class="map-search"><span>${ICON.maps}</span><input placeholder="Search Regina" aria-label="Search places"><button data-act="full" aria-label="Full screen map">⤢</button></div><div class="map-results" hidden></div><canvas></canvas><div class="map-card" hidden></div></div>`;
  const cv = body.querySelector('canvas'), card = body.querySelector('.map-card'), res = body.querySelector('.map-results'), inp = body.querySelector('input');
  const mv = new MapView(cv, { mode: 'phone', onSelect: (p) => select(p), getState: () => ctx.mapState() });
  mv.scale = 0.2; const pl = ctx.player(); mv.focus(pl.x, pl.z + 120, 0.2);
  const dest = store.state.destination; if (dest) { selPoi = dest; mv.selected = dest.id; }
  const select = (p) => { selPoi = p; mv.selected = p.id; renderCard(); };
  const renderCard = () => {
    if (!selPoi) { card.hidden = true; return; }
    const pl = ctx.player(), d = dist(pl, selPoi), isDest = store.state.destination?.id === selPoi.id, saved = (store.state.saved ||= []).includes(selPoi.id);
    const fare = ctx.cabFare(d);
    card.hidden = false;
    card.innerHTML = `<div class="mc-top"><div><b>${esc(selPoi.name)}</b><p>${CAT_ICON[selPoi.cat] ?? '📍'} ${selPoi.cat === 'pin' ? 'Dropped pin' : selPoi.cat} · ${fmtDist(d)} · 🚶 ${walkEta(d)}</p></div>${selPoi.id !== 'custom' ? `<button class="star ${saved ? 'on' : ''}" data-act="save" aria-label="Save place">★</button>` : ''}</div>
      <div class="mc-btns"><button class="btn primary" data-act="go">${isDest ? 'Stop navigation' : 'Navigate'}</button><button class="btn" data-act="cab" ${fare > store.state.bank.balance ? 'disabled' : ''}>Quick Cab · ${fmtMoney(fare)}</button></div>
      <p class="fine">Quick Cab is an instant stand-in until the Ride app and drivers arrive.</p>`;
  };
  body.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'full') { ctx.openMap(); phone.close(); }
    if (a === 'go') { const d = store.state.destination?.id === selPoi.id; ctx.setDestination(d ? null : selPoi); renderCard(); }
    if (a === 'cab') { if (ctx.quickCab(selPoi)) { phone.close(); } else renderCard(); }
    if (a === 'save') { const s = store.state.saved; const i = s.indexOf(selPoi.id); i >= 0 ? s.splice(i, 1) : s.push(selPoi.id); store.commit('saved'); renderCard(); }
    const r = e.target.closest('[data-poi]'); if (r) { const p = poiById[r.dataset.poi]; res.hidden = true; inp.value = p.name; mv.focus(p.x, p.z, 0.5); select(p); }
  });
  inp.addEventListener('input', () => {
    q = inp.value.toLowerCase().trim();
    if (!q) { res.hidden = true; return; }
    const hits = POIS.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
    res.hidden = false; res.innerHTML = hits.length ? hits.map((p) => `<button data-poi="${p.id}">${CAT_ICON[p.cat]} ${esc(p.name)}<small>${fmtDist(dist(ctx.player(), p))}</small></button>`).join('') : '<p class="empty">No matches</p>';
  });
  const loop = () => { mv.draw(); raf = requestAnimationFrame(loop); }; loop();
  if (selPoi) renderCard();
  return { update() { renderCard(); }, destroy() { cancelAnimationFrame(raf); } };
});

/* ================= BANK ================= */
const CAT = { income: ['#34c98b', 'Income'], groceries: ['#ff9f43', 'Groceries'], clothing: ['#8e6bd8', 'Clothing'], transfer: ['#4da3ff', 'Transfers'], purchase: ['#ff6b81', 'Other'], travel: ['#26c6da', 'Travel'] };
const bankApp = app('bank', 'Wascana CU', (body, ctx) => {
  const { store, G } = ctx; let view = 'main', msg = '';
  const render = () => {
    const s = store.state, h = s.bank.history;
    if (view === 'send') {
      body.innerHTML = `${nav('Send Money', { back: true })}<div class="scroll"><form class="form" id="sendf"><label>To<select name="to">${CONTACT_ORDER.filter((id) => CONTACTS[id].kind === 'person').map((id) => `<option value="${id}">${esc(CONTACTS[id].name)}</option>`).join('')}</select></label>
        <label>Amount (Prairie Dollars)<input name="amt" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00" required></label><p class="err">${esc(msg)}</p><button class="btn primary wide">Send</button></form>
        <p class="fine pad">Transfers are checked by the in-game ledger: positive amounts only, no overdrafts, rate-limited. Balance: ${fmtMoney(s.bank.balance)}</p></div>`;
      return;
    }
    const byCat = {}; h.filter((x) => x.type === 'debit').forEach((x) => (byCat[x.category] = (byCat[x.category] || 0) + x.amount));
    const tot = Object.values(byCat).reduce((a, b) => a + b, 0) || 1;
    body.innerHTML = `${nav('Wascana CU')}<div class="scroll"><div class="card bal"><small>Chequing · ••4521</small><div class="amt">${fmtMoney(s.bank.balance)}</div><small>Prairie Dollars (fictional in-game currency)</small></div>
      <div class="actions3"><button data-act="send">${ICON.send}<span>send</span></button><button data-act="jobs">${ICON.jobs}<span>earn</span></button><button data-act="shop">${ICON.inventory}<span>spend</span></button></div>
      ${Object.keys(byCat).length ? `<h4 class="sec">Spending</h4><div class="stack">${Object.entries(byCat).map(([k, v]) => `<i style="flex:${v / tot};background:${(CAT[k] || CAT.purchase)[0]}" title="${(CAT[k] || CAT.purchase)[1]}"></i>`).join('')}</div><div class="legend">${Object.entries(byCat).map(([k, v]) => `<span><i style="background:${(CAT[k] || CAT.purchase)[0]}"></i>${(CAT[k] || CAT.purchase)[1]} ${fmtMoney(v)}</span>`).join('')}</div>` : ''}
      <h4 class="sec">Transactions</h4><div class="list">${h.length ? h.slice(0, 40).map((x) => `<div class="row"><div class="avatar sm" style="background:${(CAT[x.category] || CAT.purchase)[0]}">${x.type === 'credit' ? '↓' : '↑'}</div><div class="grow"><b>${esc(x.memo)}</b><p>${new Date(x.t).toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })} · ${(CAT[x.category] || CAT.purchase)[1]}</p></div><b class="${x.type === 'credit' ? 'green' : ''}">${x.type === 'credit' ? '+' : '−'}${fmtMoney(x.amount)}</b></div>`).join('') : '<p class="empty">No transactions yet</p>'}</div></div>`;
  };
  body.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return;
    if (a === 'send') { view = 'send'; msg = ''; render(); } else if (a === 'back') { view = 'main'; render(); }
    else if (a === 'jobs') ctx.phone().openApp('jobs'); else if (a === 'shop') ctx.toast('Visit Prairie Corner Market or Prairie Threads on Victoria Ave.', 'info');
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault(); const f = new FormData(e.target), cents = Math.round(parseFloat(f.get('amt')) * 100);
    const r = G.transferTo(store, f.get('to'), cents);
    if (r.ok) { ctx.audio?.blip('cash'); ctx.toast(`Sent ${fmtMoney(cents)}`, 'good'); view = 'main'; } else { msg = r.error; ctx.audio?.blip('error'); }
    render();
  });
  render();
  return { update(topic) { if (view === 'main') render(); } };
});

/* ================= JOBS ================= */
const jobsApp = app('jobs', 'Jobs', (body, ctx, phone) => {
  const { store, G } = ctx; let tab = 'browse';
  const render = () => {
    const s = store.state, j = s.job.active, ap = s.job.application;
    if (j && tab === 'browse' && !body.dataset.touched) tab = 'mine';
    let inner = '';
    if (tab === 'mine' && j) {
      const def = JOBS[j.id], lvl = def.levels[j.level], next = def.levels[j.level + 1], sh = s.job.shift;
      const pct = next ? Math.min(100, ((j.xp - lvl.xpNeeded) / (next.xpNeeded - lvl.xpNeeded)) * 100) : 100;
      inner = `<div class="card job-card"><small>${esc(def.employer)}</small><h3>${esc(def.title)}</h3><p class="lvl">${esc(lvl.name)} · ${fmtMoney(lvl.wage)} / shift</p>
        <div class="progress"><i style="width:${pct}%"></i></div><small>${next ? `${j.xp}/${next.xpNeeded} XP to ${esc(next.name)}` : 'Top level reached'} · ${j.shifts} shifts completed</small></div>
        ${sh ? `<div class="card shift"><b>Shift in progress</b><p>${sh.tasksDone} / ${sh.tasksTotal} tasks done</p><div class="progress"><i style="width:${(sh.tasksDone / sh.tasksTotal) * 100}%"></i></div><small>${sh.tasksDone >= sh.tasksTotal ? 'Return to the counter to clock out.' : 'Carry stock from the back to the highlighted shelf.'}</small></div>`
        : `<div class="card"><b>Next shift</b><p>${lvl.tasks} tasks · pay ${fmtMoney(lvl.wage)}</p><small>Go to ${esc(def.employer)}, then talk to staff at the counter to clock in. Pay is deposited only after the work is done.</small></div>`}
        <div class="mc-btns"><button class="btn primary" data-act="nav">Navigate to work</button><button class="btn danger" data-act="quit">Quit job</button></div>`;
    } else {
      inner = (ap ? `<div class="card ${ap.status === 'offered' ? 'offer' : ''}"><small>Application</small><h3>${esc(JOBS[ap.id].title)}</h3><p>${ap.status === 'pending' ? 'Under review… the employer will contact you shortly.' : `Offer: ${fmtMoney(JOBS[ap.id].levels[0].wage)} per shift`}</p>${ap.status === 'offered' ? '<div class="mc-btns"><button class="btn primary" data-act="accept">Accept offer</button><button class="btn" data-act="decline">Decline</button></div>' : ''}</div>` : '')
        + Object.values(JOBS).map((d) => `<div class="card job"><div class="jt"><div class="avatar" style="background:${CONTACTS[d.contact].color}">${d.employer[0]}</div><div><h3>${esc(d.title)}</h3><small>${esc(d.employer)}</small></div></div><p>${esc(d.blurb)}</p>
          <div class="chips">${d.levels.map((l) => `<span>${esc(l.name)} ${fmtMoney(l.wage)}</span>`).join('')}</div>
          <button class="btn primary wide" data-apply="${d.id}" ${j || ap ? 'disabled' : ''}>${j ? 'Already employed' : ap ? 'Application in progress' : 'Apply'}</button></div>`).join('')
        + '<p class="fine pad">More careers (delivery, rideshare, office, trades…) arrive in later milestones.</p>';
    }
    body.innerHTML = `${nav('Jobs')}<div class="seg"><button class="${tab === 'browse' ? 'on' : ''}" data-tab="browse">Openings</button><button class="${tab === 'mine' ? 'on' : ''}" data-tab="mine" ${j ? '' : 'disabled'}>My Job</button></div><div class="scroll">${inner}</div>`;
  };
  body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t && !t.disabled) { tab = t.dataset.tab; body.dataset.touched = 1; render(); return; }
    const ap = e.target.closest('[data-apply]'); if (ap) { const r = G.applyForJob(store, ap.dataset.apply); ctx.toast(r.ok ? 'Application sent!' : r.error, r.ok ? 'good' : 'warn'); return; }
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'accept') { G.acceptOffer(store); ctx.audio?.blip('ok'); ctx.toast('Welcome aboard!', 'good'); tab = 'mine'; render(); }
    if (a === 'decline') { G.declineOffer(store); }
    if (a === 'quit') { G.quitJob(store); tab = 'browse'; body.dataset.touched = ''; render(); }
    if (a === 'nav') { const d = JOBS[store.state.job.active.id]; ctx.setDestination(poiById[d.place]); phone.openApp('maps'); }
  });
  render();
  return { update() { render(); } };
});

/* ================= CAMERA (handled by game: full-screen viewfinder) ================= */
const cameraApp = app('camera', 'Camera', (body, ctx, phone) => {
  queueMicrotask(() => { phone.closeApp(true); phone.close(); ctx.startCamera(); });
  return {};
});

/* ================= PHOTOS ================= */
const photosApp = app('photos', 'Photos', (body, ctx) => {
  const { store } = ctx; let sel = null;
  const render = () => {
    const ph = store.state.photos;
    if (sel !== null && ph[sel]) { body.innerHTML = `${nav('Photo', { back: true, right: `<button class="nav-act red" data-act="del" aria-label="Delete">${ICON.trash}</button>` })}<div class="viewer"><img src="${ph[sel].data}" alt="Photo"><small>${new Date(ph[sel].t).toLocaleString('en-CA', { timeZone: TZ })}</small></div>`; return; }
    sel = null;
    body.innerHTML = `${nav('Photos')}<div class="scroll">${ph.length ? `<div class="grid3">${ph.map((p, i) => `<button data-i="${i}"><img src="${p.data}" alt="Photo ${i + 1}" loading="lazy"></button>`).join('')}</div>` : '<p class="empty big">No photos yet.<br>Open the Camera app to capture the city.</p>'}<p class="fine pad">${ph.length} photo${ph.length === 1 ? '' : 's'} · stored on this device</p></div>`;
  };
  body.addEventListener('click', (e) => {
    const i = e.target.closest('[data-i]'); if (i) { sel = +i.dataset.i; render(); return; }
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'back') { sel = null; render(); } if (a === 'del') { store.state.photos.splice(sel, 1); sel = null; store.commit('photos'); render(); }
  });
  render();
  return { update() { render(); } };
});

/* ================= WEATHER ================= */
const weatherApp = app('weather', 'Weather', (body, ctx) => {
  const render = () => {
    const w = ctx.weather(), c = ctx.clock(), st = sunTimes(c.date);
    body.innerHTML = `<div class="wx ${w.kind}">${nav('Regina, SK')}<div class="scroll"><div class="wx-main"><div class="wx-ic">${w.icon}</div><div class="wx-t">${w.temp}°</div><p>${esc(w.text)}</p><small>H ${w.hi}° · L ${w.lo}° · Feels like ${w.feels}°</small></div>
      <div class="wx-grid"><div><small>Wind</small><b>${w.wind} km/h</b></div><div><small>Cloud cover</small><b>${Math.round(w.cloud)}%</b></div><div><small>Sunrise</small><b>${hoursLabel(st.sunrise)}</b></div><div><small>Sunset</small><b>${hoursLabel(st.sunset)}</b></div></div>
      <div class="src ${w.live ? 'live' : 'sim'}">${w.live ? `● LIVE · ${esc(w.source)}` : '◐ SIMULATED — live weather unavailable. Not real data.'}</div>
      <button class="btn wide" data-act="refresh">Refresh</button><p class="fine pad">In-game sky, rain and snow follow this report. Time zone: America/Regina.</p></div></div>`;
  };
  body.addEventListener('click', async (e) => { if (e.target.closest('[data-act="refresh"]')) { await ctx.refreshWeather(); render(); } });
  render();
  return { update() { render(); } };
});

/* ================= CALENDAR ================= */
const HOLIDAYS = (y) => {
  const firstMon = (m) => { const d = new Date(Date.UTC(y, m, 1)); return 1 + ((8 - d.getUTCDay()) % 7); };
  return { [`${y}-01-01`]: "New Year's Day", [`${y}-07-01`]: 'Canada Day', [`${y}-11-11`]: 'Remembrance Day', [`${y}-12-25`]: 'Christmas Day', [`${y}-08-${String(firstMon(7)).padStart(2, '0')}`]: 'Saskatchewan Day', [`${y}-09-30`]: 'Truth & Reconciliation Day' };
};
const calendarApp = app('calendar', 'Calendar', (body, ctx) => {
  const { store } = ctx; let adding = false;
  const render = () => {
    const c = ctx.clock(), y = c.year, m = c.month, today = c.day, first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const key = (d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, hol = HOLIDAYS(y), ev = store.state.calendar;
    const todayKey = key(today), s = store.state, j = s.job.active, st = sunTimes(c.date);
    const mname = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: 'long', year: 'numeric' }).format(c.date);
    let cells = ''; for (let i = 0; i < first; i++) cells += '<i></i>';
    for (let d = 1; d <= days; d++) { const k = key(d); cells += `<button class="${d === today ? 'today' : ''} ${hol[k] || ev.some((e) => e.date === k) ? 'has' : ''}" data-d="${k}">${d}</button>`; }
    const upcoming = ev.filter((e) => e.date >= todayKey).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    body.innerHTML = `${nav(esc(mname), { right: `<button class="nav-act" data-act="add" aria-label="Add event">${ICON.plus}</button>` })}<div class="scroll"><div class="cal"><div class="dow">${'SMTWTFS'.split('').map((d) => `<span>${d}</span>`).join('')}</div><div class="days">${cells}</div></div>
      ${adding ? `<form class="form" id="evf"><label>Title<input name="t" required maxlength="40" placeholder="e.g. Coffee with Dani"></label><label>Date<input name="d" type="date" value="${todayKey}" required></label><label>Time<input name="tm" type="time" value="${String(c.hour).padStart(2, '0')}:00" required></label><button class="btn primary wide">Add</button></form>` : ''}
      <h4 class="sec">Today</h4><div class="list">
        ${hol[todayKey] ? `<div class="row"><div class="avatar sm" style="background:#e63946">🎉</div><div class="grow"><b>${esc(hol[todayKey])}</b></div></div>` : ''}
        <div class="row"><div class="avatar sm" style="background:#f5a623">☀</div><div class="grow"><b>Daylight</b><p>Sunrise ${hoursLabel(st.sunrise)} · Sunset ${hoursLabel(st.sunset)}</p></div></div>
        ${j ? `<div class="row"><div class="avatar sm" style="background:#ef6c1a">💼</div><div class="grow"><b>${esc(JOBS[j.id].title)}</b><p>${s.job.shift ? `Shift ${s.job.shift.tasksDone}/${s.job.shift.tasksTotal}` : 'Shift available — clock in at work'}</p></div></div>` : ''}
      </div>
      <h4 class="sec">Upcoming</h4><div class="list">${upcoming.length ? upcoming.map((e) => `<div class="row"><div class="avatar sm" style="background:#4da3ff">${e.date.slice(8)}</div><div class="grow"><b>${esc(e.title)}</b><p>${e.date} · ${e.time}</p></div><button class="icon-btn" data-del="${e.id}" aria-label="Delete">${ICON.close}</button></div>`).join('') : '<p class="empty">Nothing scheduled</p>'}</div></div>`;
  };
  body.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="add"]')) { adding = !adding; render(); return; }
    const d = e.target.closest('[data-del]'); if (d) { store.state.calendar = store.state.calendar.filter((x) => x.id !== d.dataset.del); store.commit('calendar'); render(); }
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    store.state.calendar.push({ id: 'ev' + Date.now().toString(36), title: String(f.get('t')).slice(0, 40), date: f.get('d'), time: f.get('tm') }); adding = false; store.commit('calendar'); ctx.toast('Event added', 'good'); render();
  });
  render();
  return { update() { if (!adding) render(); } };
});

/* ================= INVENTORY ================= */
const inventoryApp = app('inventory', 'Inventory', (body, ctx) => {
  const { store, G } = ctx; let tab = 'food';
  const render = () => {
    const s = store.state, inv = Object.entries(s.inventory);
    const n = s.needs;
    body.innerHTML = `${nav('Inventory')}<div class="needs-row">${[['⚡ Energy', n.energy], ['🍽️ Hunger', n.hunger], ['🙂 Mood', n.mood]].map(([l, v]) => `<div><small>${l}</small><div class="bar"><i style="width:${v}%"></i></div></div>`).join('')}</div>
      <div class="seg"><button class="${tab === 'food' ? 'on' : ''}" data-tab="food">Food</button><button class="${tab === 'wardrobe' ? 'on' : ''}" data-tab="wardrobe">Wardrobe</button></div><div class="scroll">${tab === 'food'
      ? `<div class="list">${inv.length ? inv.map(([id, q]) => `<div class="row"><div class="avatar sm emoji">${FOOD[id].icon}</div><div class="grow"><b>${FOOD[id].name} ×${q}</b><p>+${FOOD[id].hunger} hunger${FOOD[id].energy > 5 ? ` · +${FOOD[id].energy} energy` : ''}</p></div><button class="btn small" data-eat="${id}">Eat</button></div>`).join('') : '<p class="empty big">Your bag is empty.<br>Buy groceries at Prairie Corner Market.</p>'}</div>`
      : `<div class="list">${s.wardrobe.map((id) => CLOTHES[id]).filter((c) => !c.id.startsWith('none_')).map((c) => { const on = s.player.look[SLOT_KEY[c.slot]] === c.id; return `<div class="row"><div class="swatch" style="background:${c.color}"></div><div class="grow"><b>${esc(c.name)}</b><p>${c.slot}</p></div><button class="btn small ${on ? 'on' : ''}" data-eq="${c.id}">${on ? 'Worn' : 'Wear'}</button></div>`; }).join('')}</div>`}</div>`;
  };
  body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
    const eat = e.target.closest('[data-eat]'); if (eat) { const r = G.consume(store, eat.dataset.eat); if (r.ok) { ctx.audio?.blip('ok'); ctx.toast(`Ate ${r.food.name}`, 'good'); } return; }
    const eq = e.target.closest('[data-eq]'); if (eq) { G.equip(store, eq.dataset.eq); }
  });
  render();
  return { update() { render(); } };
});

/* ================= SETTINGS ================= */
const settingsApp = app('settings', 'Settings', (body, ctx) => {
  const { store } = ctx; let confirmReset = false;
  const render = () => {
    const s = store.state, p = s.phone, st = s.settings;
    body.innerHTML = `${nav('Settings')}<div class="scroll"><h4 class="sec">Wallpaper</h4><div class="wps">${WALLPAPERS.map((w, i) => `<button class="${p.wallpaper === i ? 'on' : ''}" data-wp="${i}" style="background:${w.css}" aria-label="${w.name}"><span>${w.name}</span></button>`).join('')}</div>
      <h4 class="sec">Phone</h4><div class="list"><label class="row sw"><div class="grow"><b>Focus (Do Not Disturb)</b></div><input type="checkbox" data-k="dnd" ${p.dnd ? 'checked' : ''}></label><label class="row"><div class="grow"><b>Volume</b></div><input type="range" min="0" max="1" step="0.05" value="${p.volume}" data-sl="volume"></label></div>
      <h4 class="sec">Game</h4><div class="list">
        <label class="row"><div class="grow"><b>Graphics quality</b><p>Auto adapts to your device</p></div><select data-s="quality">${['auto', 'low', 'medium', 'high'].map((q) => `<option ${st.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
        <label class="row"><div class="grow"><b>Time of day</b><p>Live follows the real Regina clock</p></div><select data-s="timeMode"><option value="live" ${st.timeMode === 'live' ? 'selected' : ''}>Live Regina</option><option value="fast" ${st.timeMode === 'fast' ? 'selected' : ''}>Fast (1 min = 1 hr)</option></select></label>
        <label class="row sw"><div class="grow"><b>Auto-centre camera</b></div><input type="checkbox" data-s="autoCenter" ${st.autoCenter !== false ? 'checked' : ''}></label></div>
      <h4 class="sec">Controls</h4><div class="list ctl"><p><b>Move</b> WASD / arrows · <b>Run</b> Shift · <b>Look</b> drag · <b>Zoom</b> wheel</p><p><b>Interact</b> E · <b>Phone</b> P · <b>Map</b> M · <b>Outfit</b> C · <b>Photo mode</b> V</p><p>Touch: left stick moves, drag the right side to look, pinch to zoom.</p></div>
      <h4 class="sec">About</h4><div class="list ctl"><p>Prairie Dollars are a <b>fictional</b> in-game currency with no real-world value. No real money is ever charged.</p><p>Weather: <b>Open-Meteo</b> live data when reachable, otherwise a clearly-labelled simulation. Map/coordinates are approximate and stylised.</p><p>Single-player build · all progress saved on this device.</p></div>
      <button class="btn danger wide" data-act="reset">${confirmReset ? 'Tap again to erase save & restart' : 'Erase save & start over'}</button></div>`;
  };
  body.addEventListener('click', (e) => {
    const w = e.target.closest('[data-wp]'); if (w) { store.state.phone.wallpaper = +w.dataset.wp; store.commit('phone'); render(); return; }
    if (e.target.closest('[data-act="reset"]')) { if (!confirmReset) { confirmReset = true; render(); setTimeout(() => { confirmReset = false; }, 4000); } else { ctx.resetGame(); } }
  });
  body.addEventListener('change', (e) => {
    const t = e.target, s = store.state;
    if (t.dataset.k) { s.phone[t.dataset.k] = t.checked; store.commit('phone'); }
    if (t.dataset.s) { const v = t.type === 'checkbox' ? t.checked : t.value; s.settings[t.dataset.s] = v; store.commit('settings'); ctx.applySettings?.(); }
  });
  body.addEventListener('input', (e) => { const t = e.target; if (t.dataset.sl) { store.state.phone[t.dataset.sl] = +t.value; store.commit('phone-quiet'); } });
  render();
  return { update(topic) { if (topic !== 'phone-quiet') render(); } };
});

export const APPS = [messages, phoneApp, contactsApp, mapsApp, bankApp, jobsApp, cameraApp, photosApp, weatherApp, calendarApp, inventoryApp, settingsApp];
export const APP_BY_ID = Object.fromEntries(APPS.map((a) => [a.id, a]));
