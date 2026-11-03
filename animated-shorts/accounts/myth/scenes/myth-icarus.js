// Episode: Icarus got two warnings
// Source: Ovid, Metamorphoses 8 (wings of feathers, thread and wax; "fly the middle course": not too low, not too high; the Icarian Sea and Icaria).

// a winged figure in flight, centred on its body; ang tilts the body (about 1.2 = flat, facing right)
function flyer(kind, x, y, s, ang, o) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  fig(kind, 0, 270 * s, s, Object.assign({ wings: 1, flap: 1, flapSpeed: 8, armF: [-2.5, -2.7], armB: [-2.3, -2.6], legSpread: -0.05 }, o));
  ctx.restore();
}
function skyWorld(t, main, o = {}) {
  vaseWorld(t, () => {
    if (o.sun !== false) sunDisc(o.sunX ?? 760, o.sunY ?? 360, o.sunR ?? 110, t, o.heat || 0);
    if (o.sea !== false) seaBand(o.seaY ?? 1180, t);
    if (main) main();
  }, o.vase || {});
}

S.hook = ({ t, lt, ln }) => {
  const but = wl(ln, 'but', 0.55), half = wl(ln, 'half', 0.85);
  const [shot, st] = shotOf(lt, [but - 0.1]);
  if (shot === 0) {
    const u = easeInOut(clamp(st / 3.6));
    camera(540, lerp(980, 860, u), lerp(1.05, 1.18, u));
    skyWorld(t, () => {
      flyer('icarus', lerp(230, 560, u), lerp(1010, 720, u), 0.95, 1.15 - u * 0.25, { t });
    }, { sunX: 790, sunY: 560, heat: u * 0.6 });
    goldText("DON'T FLY TOO CLOSE", 540, 300, 74, st, { step: 0.025 });
    goldText('TO THE SUN', 540, 400, 74, st - 0.5, { step: 0.03 });
  } else {
    camera(540, 900, lerp(1.1, 1.0, easeOut(st / 1)));
    whip(st, 1);
    skyWorld(t, () => {
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(19,11,7,.55)'; ctx.fillRect(-300, 880, 1700, 8); ctx.restore();
    }, { sunX: 540, sunY: 420, sunR: 120 });
    goldText('½', 540, 860, 420, st, { font: '"DejaVu Serif", serif' });
    goldText('ONLY HALF', 540, 330, 104, st - 0.1);
    if (lt > half) stamp('THE WARNING', 540, 1180, lt - half, { size: 64, color: '#e8b04a' });
  }
};
EV.hook = ln => [{ t: 0.05, type: 'whoosh' }, { t: wl(ln, 'but', 0.55) - 0.1, type: 'boom' }, { t: wl(ln, 'half', 0.85), type: 'stamp' }];

S.prison = ({ t, lt, ln }) => {
  const dae = wl(ln, 'daedalus', 0.2), ica = wl(ln, 'icarus', 0.45), tr = wl(ln, 'trapped', 0.6), mi = wl(ln, 'minos', 0.95);
  camera(lerp(520, 580, easeInOut(lt / 4)), 880, lerp(1.0, 1.12, easeInOut(lt / 4)));
  vaseWorld(t, () => {
    maze(540, 820, 820, t);
    const kM = clamp((lt - mi + 0.4) / 0.5);
    if (kM > 0) { glow(900, 900, 300, 'rgba(255,60,30,.3)', kM); fig('zeus', 920, 1290, 1.4, { t, f: -1, alpha: kM, style: { crown: true, wreath: false }, hold: 'scepter', armF: [1.1, 1.4] }); }
    fig('daedalus', 300, 1290, 1.35, { t, armF: [0.9, 0.3], alpha: clamp((lt - dae + 0.3) / 0.4) });
    fig('icarus', 560, 1290, 1.05, { t, f: -1, armF: [0.5, 0.2], alpha: clamp((lt - ica + 0.3) / 0.4) });
    namePlate('DAEDALUS', 300, 640, clamp((lt - dae) / 0.3), 36);
    namePlate('ICARUS', 560, 830, clamp((lt - ica) / 0.3), 34);
  });
  namePlate('CRETE', 540, 330, clamp((lt - tr) / 0.3));
  if (lt > mi - 0.1) goldText('KING MINOS', 540, 450, 84, lt - mi + 0.1, { mid: '#ff9a6a', bot: '#a8321a' });
};
EV.prison = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'trapped', 0.6), type: 'stamp' }, { t: wl(ln, 'minos', 0.95) - 0.4, type: 'thunder' }];

S.wings = ({ t, lt, ln }) => {
  const fe = wl(ln, 'feathers', 0.6), th = wl(ln, 'thread', 0.75), wx = wl(ln, 'wax', 0.95);
  camera(lerp(560, 600, easeInOut(lt / 4)), 880, lerp(1.05, 1.15, easeInOut(lt / 4)));
  vaseWorld(t, () => {
    const prog = clamp((lt - 0.3) / 3.2);
    rod(740, 1290, 740, 860, 8); rod(690, 1290, 790, 1290, 8);
    ctx.save(); ctx.translate(740, 870); featherWings(0, 0, 0.85, { t, loss: 1 - prog }); ctx.scale(-1, 1); featherWings(0, 0, 0.85, { t, loss: 1 - prog }); ctx.restore();
    fig('daedalus', 330, 1290, 1.35, { t, armF: [-1.2 + Math.abs(Math.sin(t * 7)) * 0.5, -1.6], armB: [0.6, 0.2] });
    if (lt > wx - 0.2) { ctx.fillStyle = '#efe2c4'; ctx.fillRect(560, 1180, 34, 110); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(560, 1180, 34, 110); flame(577, 1180, 20, t, 5); glow(577, 1150, 200, 'rgba(255,170,80,.45)', 1); }
  });
  namePlate('FEATHERS', 250, 470, clamp((lt - fe + 0.1) / 0.3), 38);
  namePlate('THREAD', 540, 470, clamp((lt - th + 0.1) / 0.3), 38);
  namePlate('WAX', 830, 470, clamp((lt - wx + 0.1) / 0.3), 38);
  goldText('HOMEMADE WINGS', 540, 340, 84, lt - 0.1);
};
EV.wings = ln => [{ t: wl(ln, 'feathers', 0.6) - 0.1, type: 'pop' }, { t: wl(ln, 'thread', 0.75) - 0.1, type: 'pop' }, { t: wl(ln, 'wax', 0.95) - 0.1, type: 'pop' }];

S.warning = ({ t, lt, ln }) => {
  const hi = wl(ln, 'high', 0.2), lo = wl(ln, 'low', 0.6), soak = wl(ln, 'soak', 0.9), and = wl(ln, 'and', 0.5);
  const toHigh = easeInOut(clamp((lt - hi + 0.2) / 0.8)) * (1 - easeInOut(clamp((lt - and + 0.2) / 0.6)));
  const toLow = easeInOut(clamp((lt - lo + 0.3) / 0.8)) * (1 - easeInOut(clamp((lt - soak - 0.6) / 0.6)));
  const fy = 820 - toHigh * 330 + toLow * 280;
  camera(540, lerp(900, 880, toHigh) + toLow * 60, 1.0);
  skyWorld(t, () => {
    const zone = (y0, y1, col, a) => { ctx.save(); ctx.globalAlpha = a; const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); if (y0 > y1) { ctx.fillStyle = g; ctx.fillRect(-300, y1, 1700, y0 - y1); } else { ctx.fillStyle = g; ctx.fillRect(-300, y0, 1700, y1 - y0); } ctx.restore(); };
    zone(300, 640, 'rgba(255,80,30,.45)', clamp((lt - hi) / 0.4));
    zone(1180, 900, 'rgba(60,140,255,.45)', clamp((lt - lo) / 0.4));
    if (lt > soak + 0.6) { ctx.save(); ctx.globalAlpha = clamp((lt - soak - 0.6) / 0.4) * 0.35; ctx.fillStyle = '#7CFF8A'; ctx.fillRect(-300, 700, 1700, 220); ctx.restore(); }
    flyer('daedalus', 540, fy, 0.85, 1.2, { t });
    if (toHigh > 0.6) for (let i = 0; i < 6; i++) { const p = ((t * 1.3 + i / 6) % 1); circle(560 + i * 14 - 40, fy + 30 + p * 140, 6, `rgba(255,220,150,${1 - p})`); }
    if (toLow > 0.6) particles(52, 30, t, { x0: 380, x1: 720, y0: 1150, y1: 1190, vy: -90, size: 4, color: 'rgba(190,220,255,.9)', wobble: 20, life: 1.2 });
  }, { sunX: 540, sunY: 300, sunR: 100, heat: toHigh * 0.7 });
  if (lt > hi) namePlate('TOO HIGH: THE WAX MELTS', 540, 650, clamp((lt - hi) / 0.3), 40);
  if (lt > lo) namePlate('TOO LOW: THE FEATHERS SOAK', 540, 1080, clamp((lt - lo) / 0.3), 40);
  if (lt > soak + 0.6) goldText('FLY HERE', 540, 830, 110, lt - soak - 0.6, { mid: '#9dff8a', bot: '#2a8a3a', top: '#e8ffe0', glow: 'rgba(120,255,120,.5)' });
};
EV.warning = ln => [{ t: wl(ln, 'high', 0.2) - 0.2, type: 'whoosh' }, { t: wl(ln, 'low', 0.6) - 0.3, type: 'whoosh' }, { t: wl(ln, 'soak', 0.9) + 0.6, type: 'chime' }];

S.fall = ({ t, lt, ln }) => {
  const wax = wl(ln, 'wax', 0.55), fell = wl(ln, 'fell', 0.75), sea = wlLast(ln, 'sea', 0.95);
  const [shot, st] = shotOf(lt, [wax - 0.1]);
  if (shot === 0) {
    const u = easeInOut(clamp(st / (wax - 0.1)));
    camera(560, lerp(980, 640, u), 1.1);
    skyWorld(t, () => {
      flyer('icarus', lerp(420, 600, u), lerp(1000, 560, u), 0.95, 1.0 - u * 0.35, { t });
    }, { sunX: 640, sunY: 300, sunR: 120, heat: u });
    goldText('HIGHER...', 540, 330, 110, st - 0.2);
  } else {
    const loss = clamp(st / 0.9), drop = easeOut(clamp((lt - fell + 0.4) / (sea - fell + 0.4))), y = lerp(560, 1190, drop);
    camera(560, lerp(640, 1000, drop), lerp(1.1, 1.0, drop));
    shake(t, lt > sea ? 20 * Math.exp(-(lt - sea) * 5) : 0);
    skyWorld(t, () => {
      for (let i = 0; i < 16; i++) { const p = clamp((st - i * 0.05) / 2.4); if (p <= 0) continue; const fx = 600 + Math.sin(i * 7.1 + t * 2) * 140 * p, fy = 560 + p * 600; ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 3 + i); ctx.beginPath(); ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI * 2); ctx.fillStyle = CLAY; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      if (lt < sea) flyer('icarus', 600 + Math.sin(st * 3) * 30, y, 0.95, 1.0 + drop * 4.5, { t, loss, flap: 2 });
      if (lt > sea) { const k = clamp((lt - sea) / 0.6); glow(600, 1190, 360, 'rgba(200,230,255,.8)', 1 - k); for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (hash1(i) - 0.5) * 2.2, d = k * (120 + hash1(i + 3) * 220); circle(600 + Math.cos(a) * d, 1180 + Math.sin(a) * d + k * k * 200, 9 * (1 - k), 'rgba(220,240,255,.9)'); } }
    }, { sunX: 640, sunY: 300, sunR: 120, heat: 1 - drop * 0.6 });
    goldText('THE WAX MELTED', 540, 330, 92, st - 0.1, { mid: '#ff9a4a', bot: '#a8401a' });
  }
};
EV.fall = ln => [{ t: 0.05, type: 'whoosh' }, { t: wl(ln, 'wax', 0.55) - 0.1, type: 'shimmer' }, { t: wl(ln, 'fell', 0.75) - 0.3, type: 'whoosh' }, { t: wlLast(ln, 'sea', 0.95), type: 'smokeburst' }];

S.name = ({ t, lt, ln }) => {
  const ic = wl(ln, 'icarian', 0.55), isl = wlLast(ln, 'icaria', 0.95);
  camera(lerp(560, 600, easeInOut(lt / 4)), lerp(900, 840, easeInOut(lt / 4)), lerp(1.0, 1.1, easeInOut(lt / 4)));
  parchWorld(t, () => {
    const land = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = 'rgba(160,110,50,.25)'; ctx.fill(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke(); };
    land([[60, 280], [330, 300], [420, 420], [360, 520], [430, 640], [330, 700], [260, 620], [200, 760], [120, 700], [60, 760]]);
    land([[960, 260], [1100, 260], [1100, 1000], [990, 980], [940, 860], [980, 760], [910, 680], [960, 560], [900, 470], [950, 380]]);
    land([[270, 1150], [420, 1120], [600, 1130], [760, 1150], [800, 1185], [620, 1205], [430, 1200], [300, 1195]]);
    ctx.save(); ctx.translate(760, 600); ctx.rotate(-0.35); ctx.beginPath(); ctx.ellipse(0, 0, 70, 18, 0, 0, Math.PI * 2); ctx.fillStyle = lt > isl - 0.3 ? 'rgba(220,60,40,.5)' : 'rgba(160,110,50,.25)'; ctx.fill(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
    for (const [x, y, r] of [[870, 560, 26], [560, 820, 30], [470, 760, 18], [640, 900, 14], [520, 930, 16]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(160,110,50,.25)'; ctx.fill(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 4; ctx.stroke(); }
    const p = clamp(lt / 1.6);
    ctx.save(); ctx.setLineDash([16, 14]); ctx.strokeStyle = '#a3201a'; ctx.lineWidth = 6; ctx.beginPath();
    for (let i = 0; i <= 30 * p; i++) { const u = i / 30; const x = lerp(560, 730, u) + Math.sin(u * 3) * 40, y = lerp(1120, 690, u); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    if (p >= 1) { inkText('✕', 730, 690, 64, { color: '#a3201a' }); }
    inkText('CRETE', 520, 1260, 44);
    inkText('GREECE', 200, 470, 40);
    inkText('ASIA MINOR', 1010, 1060, 30);
    if (lt > ic - 0.2) inkText('ICARIAN SEA', 640, 760, 50, { font: '"Cinzel", serif', alpha: clamp((lt - ic + 0.2) / 0.4), color: '#1e4a7a' });
    if (lt > isl - 0.3) inkText('ICARIA', 790, 540, 46, { alpha: clamp((lt - isl + 0.3) / 0.4), color: '#a3201a' });
  });
  goldText('STILL ON THE MAP', 540, 330, 88, lt - 0.1);
};
EV.name = ln => [{ t: 0.05, type: 'quill' }, { t: wl(ln, 'icarian', 0.55) - 0.2, type: 'pop' }, { t: wlLast(ln, 'icaria', 0.95) - 0.3, type: 'chime' }];

S.lesson = ({ t, lt, ln }) => {
  camera(540, 860, lerp(1.08, 1.0, easeOut(lt / 2)));
  skyWorld(t, () => {
    ctx.save(); ctx.globalAlpha = 0.3 * clamp(lt / 0.5); const g = ctx.createLinearGradient(0, 640, 0, 980); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(0.5, 'rgba(255,220,120,.9)'); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; ctx.fillRect(-300, 640, 1700, 340); ctx.restore();
    flyer('daedalus', lerp(300, 720, easeInOut(lt / 2.6)), 810 + Math.sin(t * 2) * 12, 0.9, 1.2, { t });
  }, { sunX: 540, sunY: 300, sunR: 90 });
  goldText('FLY THE', 540, 330, 96, lt);
  goldText('MIDDLE PATH', 540, 450, 120, lt - 0.3, { font: '"Cinzel Decorative", "Cinzel", serif', step: 0.04 });
};
EV.lesson = () => [{ t: 0.1, type: 'chime' }];
