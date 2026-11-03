// Episode: Medusa wasn't born a monster
// Sources: Hesiod, Theogony (three Gorgons, only Medusa mortal); Ovid, Metamorphoses 4 (the curse, Perseus and the shield, Pegasus).

S.hook = ({ t, lt, ln }) => {
  const mon = wl(ln, 'monster', 0.75), born = wl(ln, 'born', 0.5);
  camera(540, 900, lerp(1.3, 1.12, easeInOut(lt / 2)));
  templeWorld(t, { main: () => {
    const pg = ctx.createLinearGradient(400, 0, 680, 0); pg.addColorStop(0, '#9c8e7c'); pg.addColorStop(0.4, '#e9dfcf'); pg.addColorStop(1, '#7d6f62');
    ctx.fillStyle = pg; ctx.fillRect(410, 1160, 260, 240); ctx.fillStyle = '#efe6d6'; ctx.fillRect(380, 1140, 320, 28);
    fig('medusa', 540, 1140, 1.0, { t, pal: MARBLE_PAL, armF: [0.3, 0.1], armB: [-0.2, -0.1], eyeGlow: lt > mon - 0.1 ? 'rgba(120,255,120,.9)' : null });
    if (lt > mon - 0.1) glow(560, 760, 380, 'rgba(110,255,120,.35)', clamp((lt - mon + 0.1) / 0.3));
    owl(890, 1250 + 360 * (1 - easeOut((lt - born + 0.2) / 0.5)), 0.55, { t, mood: lt > mon ? 'shock' : 'calm', look: -1 });
  } });
  shake(t, lt > mon ? 12 * Math.exp(-(lt - mon) * 6) : 0);
  goldText('MEDUSA', 540, 320, 150, lt + 0.2, { font: '"Cinzel Decorative", "Cinzel", serif' });
  goldText('WASN\'T BORN A MONSTER', 540, 450, 64, lt - born + 0.1, { step: 0.02 });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'monster', 0.75) - 0.1, type: 'shimmer' }];

S.sisters = ({ t, lt, ln }) => {
  const three = wl(ln, 'three', 0.35), only = wl(ln, 'only', 0.7), die = wl(ln, 'die', 0.95);
  const [shot, st] = shotOf(lt, [only - 0.1]);
  const sis = (x, f, at, name, isM) => {
    const k = clamp((lt - at) / 0.35);
    if (k <= 0) return;
    fig('gorgon', x, 1290, 1.0, { t, f, alpha: k, flap: 0.4, armF: [0.6, 0.2] });
    namePlate(name, x, 640, k, 36);
    if (lt > die) {
      if (isM) namePlate('MORTAL', x, 570, clamp((lt - die) / 0.3), 36);
      else { glow(x, 1000, 260, 'rgba(255,215,120,.35)', clamp((lt - die) / 0.4)); namePlate('IMMORTAL', x, 570, clamp((lt - die) / 0.3), 36); }
    }
  };
  if (shot === 0) camera(540, 900, lerp(1.0, 1.05, st / 3));
  else { camera(540, 840, lerp(1.05, 1.32, easeInOut(st / 1.2))); whip(st, 1, 300, 0.2); }
  vaseWorld(t, () => {
    sis(250, 1, three - 0.25, 'STHENO', false);
    sis(540, 1, three - 0.05, 'MEDUSA', true);
    sis(830, -1, three + 0.15, 'EURYALE', false);
    if (lt > die) glow(540, 1000, 300, 'rgba(255,60,60,.25)', clamp((lt - die) / 0.4));
  });
  namePlate('HESIOD · c. 700 BC', 540, 330, clamp(lt / 0.4));
  if (lt > die) stamp('ONLY ONE COULD DIE', 540, 460, lt - die, { size: 54 });
};
EV.sisters = ln => [{ t: wl(ln, 'three', 0.35) - 0.25, type: 'pop' }, { t: wl(ln, 'three', 0.35) - 0.05, type: 'pop' }, { t: wl(ln, 'three', 0.35) + 0.15, type: 'pop' }, { t: wl(ln, 'die', 0.95), type: 'stamp' }];

S.ovid = ({ t, lt, ln }) => {
  const ver = wl(ln, 'version', 0.35), fam = wl(ln, 'famous', 0.8), hair = wlLast(ln, 'hair', 0.95);
  const [shot, st] = shotOf(lt, [ver + 0.1]);
  if (shot === 0) {
    camera(540, 900, lerp(1.05, 1.15, easeInOut(st / 2)));
    parchWorld(t, () => {
      scrollIcon(540, 900, 1.6, 'METAMORPHOSES', clamp(st / 0.4), { sub: 'BOOK 4' });
      inkText('Ovid', 540, 1200, 64, { weight: 700, font: '"DejaVu Serif", serif', alpha: clamp((st - 0.5) / 0.4) });
    });
    namePlate('OVID · ROME, AD 8', 540, 330, clamp(st / 0.3));
    goldText("OVID'S VERSION", 540, 460, 84, st - 0.4);
  } else {
    camera(lerp(480, 600, easeInOut(st / 3.5)), 860, lerp(1.1, 1.3, easeInOut(st / 3.5)));
    whip(st, 1);
    vaseWorld(t, () => {
      fig('human', 180, 1290, 1.05, { t, armF: [1.6, 2.4] });
      fig('human', 900, 1290, 1.05, { t, f: -1, armF: [1.2, 1.8] });
      const p = fig('maiden', lerp(380, 560, easeOut(st / 2)), 1290, 1.35, { t, walk: 1 - clamp((st - 1.6) / 0.5), phase: st * 7, armF: [0.4, 0.8] });
      if (lt > fam - 0.1) for (let i = 0; i < 14; i++) sparkle(p.head[0] - 60 + hash1(i) * 120, p.head[1] - 40 + hash1(i + 9) * 180, 9 + 6 * hash1(i + 3), clamp((lt - fam) / 0.4) * (0.5 + 0.5 * Math.sin(t * 9 + i)));
    });
    goldText('FAMOUS FOR HER HAIR', 540, 330, 74, lt - fam + 0.2, { step: 0.02 });
  }
};
EV.ovid = ln => [{ t: 0.05, type: 'quill' }, { t: wl(ln, 'version', 0.35) + 0.1, type: 'whoosh' }, { t: wl(ln, 'famous', 0.8), type: 'shimmer' }];

S.curse = ({ t, lt, ln }) => {
  const pos = wl(ln, 'poseidon', 0.25), att = wl(ln, 'attacked', 0.35), ath = wl(ln, 'athena', 0.6), pun = wl(ln, 'punished', 0.65), sn = wl(ln, 'snakes', 0.95);
  const [shot, st] = shotOf(lt, [ath - 0.15]);
  if (shot === 0) {
    camera(560, 880, lerp(1.0, 1.15, easeInOut(st / 3)));
    shake(t, lt > att ? 14 * Math.exp(-(lt - att) * 4) : 0);
    vaseWorld(t, () => {
      vaseColumns(560, 1000, 1290, 640);
      const kp = clamp((lt - pos + 0.2) / 0.5);
      glow(220, 900, 420, 'rgba(60,140,255,.35)', kp);
      fig('poseidon', lerp(-60, 260 + (lt > att ? 40 : 0), easeOut(kp)), 1290, 1.45, { t, hold: 'trident', propAng: 0.08, armF: [-0.1, -0.5], armB: [0.2, 0.6] });
      fig('maiden', lerp(640, 760, easeOut(clamp((lt - pos) / 1.5))), 1290, 1.3, { t, f: lt > att ? -1 : 1, walk: lt < att ? 1 : 0, phase: lt * 8, armF: lt > att ? [2.0, 2.8] : [0.6, 0.9], armB: lt > att ? [1.7, 2.6] : undefined, lean: lt > att ? -0.1 : 0 });
    }, { tint: lt > att ? `rgba(40,0,10,${0.3 * clamp((lt - att) / 0.4)})` : null });
    namePlate('POSEIDON', 540, 330, clamp((lt - pos) / 0.3));
    if (lt > att) flash(lt - att, 0.25, '120,10,20', 0.6);
  } else {
    camera(540, 880, lerp(1.1, 1.0, easeOut(st / 1.5)));
    shake(t, 20 * Math.exp(-st * 5));
    vaseWorld(t, () => {
      vaseColumns(140, 940, 1290, 640);
      fig('athena', 270, 1290, 1.45, { t, hold: 'spear', propAng: 0.6, armF: [-1.6, -2.2], holdB: 'shield', emblem: 'owl', armB: [0.9, 0.2] });
      const m = clamp((lt - sn + 0.6) / 0.6);
      fig('maiden', 760, 1290, 1.3, { t, f: -1, alpha: 1 - m, armF: [1.9, 2.8], armB: [1.6, 2.5] });
      fig('medusa', 760, 1290, 1.3, { t, f: -1, alpha: m, armF: [1.9, 2.8], armB: [1.6, 2.5] });
      glow(760, 760, 300, 'rgba(120,255,120,.45)', m * (1 - clamp((lt - sn - 0.4) / 1)));
    });
    flash(st, 0.2, '255,250,230', 0.8);
    namePlate('ATHENA', 540, 330, clamp(st / 0.3));
    goldText('PUNISHED', 540, 450, 88, lt - pun + 0.1, { mid: '#ff8a6a', bot: '#a8201a', top: '#ffd0c0' });
  }
};
EV.curse = ln => [{ t: wl(ln, 'poseidon', 0.25) - 0.1, type: 'boom' }, { t: wl(ln, 'athena', 0.6) - 0.15, type: 'thunder' }, { t: wl(ln, 'snakes', 0.95) - 0.5, type: 'shimmer' }];

S.stone = ({ t, lt, ln }) => {
  const look = wl(ln, 'look', 0.35), st0 = wl(ln, 'stone', 0.9);
  camera(lerp(600, 560, easeInOut(lt / 3)), 880, lerp(1.0, 1.18, easeInOut(lt / 3)));
  shake(t, lt > st0 ? 16 * Math.exp(-(lt - st0) * 6) : 0);
  vaseWorld(t, () => {
    fig('hero', 980, 1290, 0.85, { t, f: -1, pal: STONE, armF: [1.3, 2.4], holdB: 'shield', emblem: 'star' });
    fig('human', 120, 1290, 0.8, { t, pal: STONE, armF: [2.0, 2.8], armB: [1.6, 2.4] });
    const p = fig('medusa', 300, 1290, 1.35, { t, eyeGlow: lt > look - 0.2 ? 'rgba(120,255,120,.95)' : null, armF: [0.9, 0.6] });
    const u = clamp((lt - look) / 1.6);
    if (lt > look - 0.2) godRays(p.head[0] + 20, p.head[1] + 8, Math.PI / 2 + 0.05, 0.12, 4, 620, 'rgba(140,255,140,.5)', 0.8, t);
    // the soldier turns to stone from the feet up
    const y0 = 1290 - 640 * u;
    ctx.save(); ctx.beginPath(); ctx.rect(400, -500, 900, y0 + 500); ctx.clip();
    fig('hero', 760, 1290, 1.3, { t, f: -1, armF: [2.1, 2.9], holdB: 'shield', emblem: 'star', armB: [0.8, 0.1], hold: 'spear', propAng: -0.5 }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(400, y0, 900, 1400); ctx.clip();
    fig('hero', 760, 1290, 1.3, { t: 0, f: -1, pal: STONE, armF: [2.1, 2.9], holdB: 'shield', emblem: 'star', armB: [0.8, 0.1], hold: 'spear', propAng: -0.5 }); ctx.restore();
    if (u > 0 && u < 1) glow(760, y0, 200, 'rgba(200,255,200,.5)', 1);
  });
  goldText('ONE LOOK...', 540, 330, 96, lt - look + 0.1);
  if (lt > st0) stamp('STONE', 540, 470, lt - st0, { color: '#c9c3b8', size: 80 });
};
EV.stone = ln => [{ t: wl(ln, 'look', 0.35) - 0.1, type: 'shimmer' }, { t: wl(ln, 'stone', 0.9), type: 'stamp' }];

S.perseus = ({ t, lt, ln }) => {
  const per = wl(ln, 'perseus', 0.3), refl = wl(ln, 'reflection', 0.7), sh = wlLast(ln, 'shield', 0.95);
  const [shot, st] = shotOf(lt, [refl - 0.1]);
  const scene = (zoomToShield) => vaseWorld(t, () => {
    fig('medusa', 230, 1290, 1.25, { t, armF: [0.9, 0.5], eyeGlow: 'rgba(120,255,120,.8)' });
    const p = fig('hero', lerp(980, 720, easeOut(clamp(lt / 2.2))), 1290, 1.35, { t, walk: lt < 2.2 ? 0.6 : 0, phase: -lt * 6, hold: 'sword', propAng: 0.9 - (lt > sh ? 2.2 * clamp((lt - sh) / 0.15) : 0), armF: lt > sh ? [-1.4, -2.0] : [0.9, 1.6], holdB: 'shield', emblem: 'mirror', armB: [1.5, 2.6], glint: lt > sh - 0.3 ? 1 : 0 });
    // Medusa's reflection in the polished shield
    ctx.save(); ctx.beginPath(); ctx.arc(p.handB[0] + 18 * 1.35, p.handB[1] - 10 * 1.35, 66 * 1.35, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.75; ctx.translate(p.handB[0] + 18 * 1.35, p.handB[1] + 40); ctx.scale(0.42, 0.42); fig('medusa', 0, 300, 1, { t, f: 1, eyeGlow: 'rgba(120,255,120,.9)' });
    ctx.restore();
  });
  if (shot === 0) { camera(600, 880, lerp(1.0, 1.1, st / 2.6)); scene(); namePlate('PERSEUS', 540, 330, clamp((lt - per) / 0.3)); }
  else {
    const cx = lerp(780, 840, easeOut(st / 1)), z = lerp(1.25, 2.0, easeInOut(st / 1.1));
    camera(cx, 900, z); scene();
    goldText('THE MIRROR TRICK', 540, 330, 84, st);
    if (lt > sh) flash(lt - sh, 0.3, '255,255,255', 0.9);
  }
};
EV.perseus = ln => [{ t: 0.05, type: 'whoosh' }, { t: wl(ln, 'reflection', 0.7) - 0.1, type: 'chime' }, { t: wlLast(ln, 'shield', 0.95), type: 'stamp' }];

S.pegasus = ({ t, lt, ln }) => {
  const spr = wl(ln, 'sprang', 0.35), peg = wl(ln, 'pegasus', 0.6);
  const rise = easeOut(clamp((lt - spr + 0.1) / 1.6));
  camera(560, lerp(980, 760, rise), lerp(1.2, 1.0, rise));
  vaseWorld(t, () => {
    vaseStars(t);
    glow(560, 1260, 520, 'rgba(255,220,140,.6)', clamp((lt - spr + 0.3) / 0.4) * (1 - rise * 0.5));
    godRays(560, 1290, Math.PI, 1.2, 9, 1100, 'rgba(255,230,170,.35)', clamp((lt - spr) / 0.4), t);
    horse(560, 1290, 1.25, { t, lift: rise * 320, wings: 0.5 + 0.5 * rise, flap: 1, gallop: 0.6 });
    for (let i = 0; i < 20; i++) sparkle(360 + hash1(i) * 420, 1290 - rise * 320 - 300 + hash1(i + 4) * 340, 10, rise * (0.5 + 0.5 * Math.sin(t * 8 + i)));
  });
  goldText('PEGASUS', 540, 340, 140, lt - peg + 0.15, { font: '"Cinzel Decorative", "Cinzel", serif', step: 0.06 });
  inscription('ΠΗΓΑΣΟΣ', 540, 470, 46, clamp((lt - peg - 0.3) / 0.4));
};
EV.pegasus = ln => [{ t: wl(ln, 'sprang', 0.35) - 0.1, type: 'boom' }, { t: wl(ln, 'pegasus', 0.6) - 0.1, type: 'chime' }];
