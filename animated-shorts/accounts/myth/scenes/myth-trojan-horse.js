// Episode: The Trojan Horse isn't in the Iliad
// Sources: Homer, Iliad (a few weeks of the war's tenth year, ends with Hector's funeral); Odyssey 4, 8 and 11 (brief mentions);
// Virgil, Aeneid 2 (the full story: Laocoon's warning "timeo Danaos et dona ferentes", the serpents, the fall of Troy).

S.hook = ({ t, lt, ln }) => {
  const il = wlLast(ln, 'iliad', 0.9);
  camera(540, 900, lerp(1.0, 1.16, easeInOut(lt / 2)));
  shake(t, lt > il ? 14 * Math.exp(-(lt - il) * 6) : 0);
  vaseWorld(t, () => {
    vaseStars(t, 40, 6);
    troyWall(-260, 1340, 1290, 420, 0, 540);
    for (const x of [200, 880]) { torch(x, 1150, t, 1); }
    glow(540, 1000, 520, 'rgba(255,170,80,.25)', 1);
    horse(540, 1290, 1.25, { t, wood: true });
  });
  nightTint(0.28);
  goldText('THE TROJAN HORSE', 540, 330, 96, lt + 0.2);
  if (lt > il) stamp('NOT IN THE ILIAD', 540, 470, lt - il, { size: 60 });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wlLast(ln, 'iliad', 0.9), type: 'stamp' }];

S.iliad = ({ t, lt, ln }) => {
  const weeks = wl(ln, 'weeks', 0.3), war = wl(ln, 'war', 0.5), ends = wl(ln, 'ends', 0.6), fun = wl(ln, 'funeral', 0.75), hor = wlLast(ln, 'horse', 0.95);
  const [shot, st] = shotOf(lt, [ends - 0.15]);
  if (shot === 0) {
    camera(540, 900, lerp(1.0, 1.08, easeInOut(st / 3)));
    parchWorld(t, () => {
      const p = easeInOut(clamp(st / 1.2));
      for (let y = 0; y < 10; y++) {
        const x = 130 + y * 82; if (p * 10 < y) break;
        ctx.fillStyle = 'rgba(160,110,50,.35)'; ctx.fillRect(x, 880, 78, 120); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 4; ctx.strokeRect(x, 880, 78, 120);
        inkText(String(y + 1), x + 39, 1050, 34, { weight: 700 });
      }
      inkText('YEAR', 540, 1110, 30, { weight: 700 });
      const k = clamp((lt - weeks + 0.2) / 0.4);
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#c0281f'; ctx.fillRect(130 + 9 * 82 + 56, 870, 18, 140); ctx.restore(); glow(130 + 9 * 82 + 65, 940, 150, 'rgba(255,60,40,.4)', k); inkText('THE ILIAD', 860, 800, 40, { color: '#a3201a', alpha: k }); inkText('a few weeks', 860, 750, 34, { weight: 700, font: '"DejaVu Serif", serif', color: '#a3201a', alpha: k }); }
    });
    goldText('THE TROJAN WAR', 540, 340, 92, st);
    if (lt > war - 0.2) namePlate('10 YEARS', 540, 470, clamp((lt - war + 0.2) / 0.3));
  } else {
    camera(540, 880, lerp(1.0, 1.12, easeInOut(st / 3)));
    whip(st, 1);
    vaseWorld(t, () => {
      pyre(540, 1290, 1.3, t);
      fig('human', 170, 1290, 1.1, { t, headTilt: 0.35, armF: [2.2, 2.9], armB: [1.9, 2.8] });
      fig('pandora', 330, 1290, 1.1, { t, headTilt: 0.3, armF: [2.4, 3.0] });
      fig('zeus', 900, 1290, 1.15, { t, f: -1, style: { wreath: false }, headTilt: 0.3, armF: [2.0, 2.9] });
    });
    namePlate("HECTOR'S FUNERAL", 540, 330, clamp((lt - fun + 0.3) / 0.3));
    if (lt > hor - 0.1) stamp('NO HORSE', 540, 470, lt - hor + 0.1, { size: 70 });
  }
};
EV.iliad = ln => [{ t: 0.05, type: 'quill' }, { t: wl(ln, 'weeks', 0.3) - 0.2, type: 'pop' }, { t: wl(ln, 'ends', 0.6) - 0.15, type: 'firewhoosh' }, { t: wlLast(ln, 'horse', 0.95) - 0.1, type: 'stamp' }];

S.virgil = ({ t, lt, ln }) => {
  const od = wl(ln, 'odyssey', 0.3), full = wl(ln, 'full', 0.5), vir = wl(ln, 'virgil', 0.8), cen = wl(ln, 'centuries', 0.9);
  camera(lerp(540, lt > full ? 760 : 540, easeInOut(clamp((lt - full) / 1))), 920, lerp(1.0, lt > full ? 1.3 : 1.0, easeInOut(clamp((lt - full) / 1))));
  parchWorld(t, () => {
    scrollIcon(230, 920, 0.95, 'ILIAD', 1, { sub: 'NO HORSE' });
    inkText('✕', 230, 1120, 90, { color: '#a3201a' });
    scrollIcon(540, 920, 0.95, 'ODYSSEY', clamp((lt - od + 0.2) / 0.35), { sub: 'BRIEF MENTIONS' });
    scrollIcon(850, 920, 0.95, 'AENEID', clamp((lt - vir + 0.3) / 0.35), { sub: 'THE FULL STORY', glow: clamp((lt - vir) / 0.5) });
  });
  namePlate(lt > vir - 0.3 ? 'VIRGIL · ROME, c. 19 BC' : 'HOMER', 540, 330, 1);
  if (lt > cen - 0.2) goldText('CENTURIES LATER', 540, 460, 80, lt - cen + 0.2);
};
EV.virgil = ln => [{ t: wl(ln, 'odyssey', 0.3) - 0.2, type: 'pop' }, { t: wl(ln, 'virgil', 0.8) - 0.3, type: 'chime' }];

S.trick = ({ t, lt, ln }) => {
  const giant = wl(ln, 'giant', 0.35), hid = wl(ln, 'hid', 0.45), pre = wl(ln, 'pretended', 0.7), sail = wl(ln, 'sail', 0.9);
  const [shot, st] = shotOf(lt, [hid - 0.1, pre - 0.1]);
  if (shot === 0) {
    camera(540, 900, lerp(1.35, 1.0, easeInOut(clamp((lt - giant + 0.3) / 0.8))));
    vaseWorld(t, () => {
      const rv = clamp(st / 1.4);
      ctx.save(); ctx.beginPath(); ctx.rect(-400, 1330 - 900 * rv, 2000, 1400); ctx.clip(); horse(560, 1290, 1.3, { t, wood: true }); ctx.restore();
      fig('human', 170, 1290, 1.0, { t, hold: 'sword', propAng: Math.abs(Math.sin(t * 8)) * 1.2, armF: [-1.3 + Math.abs(Math.sin(t * 8)) * 0.7, -1.8] });
      fig('human', 930, 1290, 1.0, { t, f: -1, armF: [-1.0 + Math.abs(Math.sin(t * 8 + 1)) * 0.6, -1.6] });
      particles(61, 20, t, { x0: 300, x1: 800, y0: 1000, y1: 1280, vy: 40, size: 3, color: 'rgba(230,170,110,.9)', life: 1.2, wobble: 30 });
    });
    goldText('A GIANT WOODEN HORSE', 540, 340, 78, lt - giant + 0.3, { step: 0.02 });
  } else if (shot === 1) {
    camera(500, 960, 1.6);
    whip(st, -1, 400);
    vaseWorld(t, () => {
      horse(560, 1290, 1.3, { t, wood: true, hatch: 1 - clamp((lt - pre + 0.5) / 0.4) });
      rod(470, 1290, 490, 980, 6); rod(520, 1290, 540, 980, 6); for (let k = 0; k < 7; k++) rod(475 + k * 2.8, 1250 - k * 44, 525 + k * 2.8, 1250 - k * 44, 4);
      for (let i = 0; i < 3; i++) { const p = clamp((st - i * 0.45) / 0.9); if (p >= 1) continue; ctx.save(); ctx.beginPath(); ctx.rect(-400, 1000, 2000, 900); ctx.clip(); fig('hero', 505, lerp(1290, 990, p), 0.55, { t, armF: [-2.6, -2.8], armB: [-2.4, -2.6], walk: 0.5, phase: st * 9 }); ctx.restore(); }
    });
    namePlate('SOLDIERS INSIDE', 540, 330, clamp(st / 0.3));
  } else {
    camera(540, 940, 1.0);
    whip(st, 1);
    vaseWorld(t, () => {
      seaBand(1150, t);
      const go = easeIn2(clamp(st / 1.8));
      ship(lerp(360, -40, go), 1160, lerp(0.75, 0.4, go), t); ship(lerp(560, 120, go), 1180, lerp(0.85, 0.45, go), t + 1);
      horse(860, 1290, 0.75, { t, wood: true });
    });
    goldText('A FAKE RETREAT', 540, 340, 92, st - 0.1);
  }
};
const easeIn2 = u => u * u;
EV.trick = ln => [{ t: 0.1, type: 'stamp' }, { t: 0.6, type: 'stamp' }, { t: wl(ln, 'hid', 0.45) - 0.1, type: 'whoosh' }, { t: wl(ln, 'pretended', 0.7) - 0.1, type: 'whoosh' }];

S.laocoon = ({ t, lt, ln }) => {
  const war = wl(ln, 'warned', 0.35), fear = wl(ln, 'fear', 0.45), then = wl(ln, 'then', 0.75), ser = wl(ln, 'serpents', 0.85);
  const [shot, st] = shotOf(lt, [fear - 0.2, then - 0.1]);
  if (shot === 0) {
    camera(600, 900, lerp(1.0, 1.12, easeInOut(st / 2)));
    const thr = clamp((lt - war) / 0.35);
    vaseWorld(t, () => {
      horse(760, 1290, 1.1, { t, wood: true });
      const p = fig('laocoon', 260, 1290, 1.35, { t, hold: thr > 0 ? null : 'spear', propAng: 1.4, armF: thr > 0 ? [-0.9, -0.6] : [-1.5, -1.6], armB: [0.6, 0.2] });
      if (thr > 0) { const x = lerp(p.hand[0], 650, thr), y = lerp(p.hand[1], 1010, thr); ctx.save(); ctx.translate(x, y); ctx.rotate(0.12); rod(-160, 0, 90, 0, 6); ctx.fillStyle = CLAY; ctx.beginPath(); ctx.moveTo(130, 0); ctx.quadraticCurveTo(104, -12, 88, 0); ctx.quadraticCurveTo(104, 12, 130, 0); ctx.fill(); ctx.restore(); }
    });
    namePlate('LAOCOON, PRIEST OF TROY', 540, 330, clamp(st / 0.3), 40);
  } else if (shot === 1) {
    camera(540, 900, lerp(1.04, 1.0, easeOut(st / 1)));
    whip(st, 1, 400);
    vaseWorld(t, () => { horse(820, 1290, 0.9, { t, wood: true, alpha: 0.35 }); });
    card(540, 820, 900, 470, 'VIRGIL, AENEID 2', ['"I FEAR THE GREEKS,', 'EVEN WHEN THEY', 'BRING GIFTS."'], clamp(st / 0.3), { bodySize: 58, lineH: 80, titleSize: 34 });
    inkText('timeo Danaos et dona ferentes', 540, 1120, 38, { weight: 400, font: '"DejaVu Serif", serif', color: '#e7c88a', alpha: clamp((st - 0.6) / 0.5) });
  } else {
    camera(500, lerp(980, 900, easeOut(st / 1.5)), lerp(1.15, 1.0, easeOut(st / 1.5)));
    shake(t, 18 * Math.exp(-st * 3));
    const r = easeOut(clamp(st / 1.4));
    vaseWorld(t, () => {
      seaBand(1180, t, { top: '#0f2a2a' });
      serpent(1250, 1400, lerp(1150, 700, r), lerp(1300, 860, r), t, 1.35, { seed: 1, jaw: Math.abs(Math.sin(t * 6)) });
      serpent(-200, 1400, lerp(-80, 330, r), lerp(1320, 820, r), t + 1, 1.25, { seed: 2, jaw: Math.abs(Math.sin(t * 6 + 1)) });
      fig('laocoon', 480, 1170, 1.25, { t, armF: [2.1, 2.9], armB: [1.8, 2.7], lean: -0.1 });
    }, { tint: `rgba(0,30,10,${0.25 * r})` });
    flash(st, 0.2, '230,255,230', 0.6);
    goldText('TWO SEA SERPENTS', 540, 340, 84, lt - ser + 0.3, { mid: '#b8e06a', bot: '#3a6a1a', top: '#f0ffd0', glow: 'rgba(140,255,90,.45)' });
  }
};
EV.laocoon = ln => [{ t: wl(ln, 'warned', 0.35), type: 'whoosh' }, { t: wl(ln, 'warned', 0.35) + 0.35, type: 'stamp' }, { t: wl(ln, 'fear', 0.45) - 0.2, type: 'chime' }, { t: wl(ln, 'then', 0.75) - 0.1, type: 'smokeburst' }, { t: wl(ln, 'serpents', 0.85), type: 'thunder' }];

S.fall = ({ t, lt, ln }) => {
  const that = wl(ln, 'that', 0.5), op = wl(ln, 'opened', 0.75), gates = wlLast(ln, 'gates', 0.95);
  const [shot, st] = shotOf(lt, [that - 0.1, op - 0.15]);
  if (shot === 0) {
    const u = easeInOut(clamp(st / (that - 0.1)));
    camera(lerp(420, 640, u), 900, 1.0);
    vaseWorld(t, () => {
      troyWall(-200, 1600, 1290, 420, 1, 900);
      const hx = lerp(200, 640, u);
      horse(hx, 1290, 0.95, { t, wood: true, roll: u * 8 });
      for (let i = 0; i < 3; i++) { const fx = hx + 330 + i * 120; rod(hx + 240, 960, fx, 1060, 4); fig('human', fx, 1290, 0.85, { t, walk: 0.8, phase: st * 7 + i, lean: -0.25, armF: [-1.3, -1.5], armB: [-1.1, -1.3] }); }
    });
    goldText('INSIDE THE WALLS', 540, 340, 86, st - 0.1);
  } else if (shot === 1) {
    camera(560, 960, 1.25);
    whip(st, -1, 400);
    const h = clamp((st - 0.3) / 0.5);
    vaseWorld(t, () => {
      vaseStars(t, 40, 11);
      glow(820, 400, 220, 'rgba(230,230,255,.35)', 1); circle(820, 400, 60, '#f3eedc');
      horse(560, 1290, 1.2, { t, wood: true, hatch: h });
      if (h > 0.5) { rod(510, 1000, 510, 1290, 3); for (let i = 0; i < 3; i++) { const p = clamp((st - 0.7 - i * 0.4) / 0.7); if (p <= 0 || p >= 1) continue; fig('hero', 505, lerp(1050, 1290, p), 0.5, { t, armF: [-2.8, -3.0], armB: [-2.7, -2.9] }); } }
    });
    nightTint(0.45);
    goldText('THAT NIGHT...', 540, 340, 96, st);
  } else {
    camera(540, 900, lerp(1.2, 1.0, easeOut(st / 1.2)));
    shake(t, 14 * Math.exp(-st * 3));
    const g = easeOut(clamp(st / 0.8));
    vaseWorld(t, () => {
      glow(540, 1000, 600, 'rgba(255,120,30,.55)', g);
      troyWall(-260, 1340, 1290, 420, g, 540);
      for (let k = 0; k < 5; k++) flame(400 + k * 70, 1280, 50 * g, t, k);
      for (let i = 0; i < 4; i++) { const p = clamp((st - 0.3 - i * 0.2) / 1.2); if (p <= 0) continue; fig('hero', lerp(540, 540 + (i - 1.5) * 220, p), 1290, lerp(0.4, 0.95, p), { t, walk: 1, phase: st * 9 + i, hold: 'spear', propAng: 0.6, armF: [-0.6, -1.0], holdB: 'shield', emblem: 'star', armB: [0.9, 0.3], alpha: clamp(p * 3) }); }
    });
    nightTint(0.25);
    goldText('TROY FALLS', 540, 340, 120, lt - gates + 0.2, { font: '"Cinzel Decorative", "Cinzel", serif', mid: '#ffb04a', bot: '#a8401a' });
  }
};
EV.fall = ln => [{ t: 0.05, type: 'whoosh' }, { t: wl(ln, 'that', 0.5) - 0.1, type: 'hush' }, { t: wl(ln, 'opened', 0.75) - 0.15, type: 'boom' }, { t: wl(ln, 'opened', 0.75), type: 'firewhoosh' }];
