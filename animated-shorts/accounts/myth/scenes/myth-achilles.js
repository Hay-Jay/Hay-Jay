// Episode: The Iliad never mentions Achilles' heel
// Sources: Homer, Iliad (no heel story; wounded in the arm by Asteropaeus, Book 21; ends with Hector's funeral);
// Statius, Achilleid (c. AD 95: Thetis dips him in the Styx); later tradition: Paris's arrow guided by Apollo.

function styxWater(y, t) {
  seaBand(y, t, { top: '#1d0f38' });
  glow(540, y + 40, 700, 'rgba(120,70,255,.28)', 1);
  particles(41, 22, t, { x0: -100, x1: 1180, y0: y - 30, y1: y + 60, vy: -10, vx: 14, size: 22, color: 'rgba(170,140,255,.10)', wobble: 60, life: 6, alpha: 0.9 });
}

S.hook = ({ t, lt, ln }) => {
  const heel = wlLast(ln, 'heel', 0.9), nev = wl(ln, 'never', 0.4);
  camera(540, lerp(900, 980, easeInOut(lt / 2.4)), lerp(1.15, 1.3, easeInOut(lt / 2.4)));
  shake(t, lt > heel ? 14 * Math.exp(-(lt - heel) * 6) : 0);
  templeWorld(t, { main: () => {
    const pg = ctx.createLinearGradient(400, 0, 680, 0); pg.addColorStop(0, '#9c8e7c'); pg.addColorStop(0.4, '#e9dfcf'); pg.addColorStop(1, '#7d6f62');
    ctx.fillStyle = pg; ctx.fillRect(390, 1180, 300, 220); ctx.fillStyle = '#efe6d6'; ctx.fillRect(360, 1160, 360, 28);
    fig('hero', 520, 1160, 0.95, { t: 0, pal: MARBLE_PAL, hold: 'spear', propAng: 0.1, armF: [-0.4, -0.9], holdB: 'shield', emblem: 'star', armB: [0.7, 0.1] });
    const u = clamp((lt - heel + 0.35) / 0.35);
    if (u > 0) arrow(lerp(1150, 516, u), lerp(1060, 1150, u), 3.27, 1.1, 1 - u * 0.4);
    if (lt > heel) glow(512, 1150, 140, 'rgba(255,70,50,.8)', clamp((lt - heel) / 0.2));
    owl(160, 1250, 0.5, { t, mood: lt > heel ? 'shock' : 'wise', look: 1 });
  } });
  goldText("ACHILLES' HEEL", 540, 320, 112, lt + 0.2);
  if (lt > heel + 0.15) stamp('NOT IN THE ILIAD', 540, 460, lt - heel - 0.15, { size: 60 });
  else if (lt > nev) goldText('NEVER MENTIONED', 540, 450, 64, lt - nev, { step: 0.02 });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wlLast(ln, 'heel', 0.9) - 0.35, type: 'whoosh' }, { t: wlLast(ln, 'heel', 0.9) + 0.15, type: 'stamp' }];

S.styx = ({ t, lt, ln }) => {
  const dips = wl(ln, 'dips', 0.2), styx = wl(ln, 'styx', 0.45), heel = wl(ln, 'heel', 0.7), comes = wl(ln, 'comes', 0.75), stat = wl(ln, 'statius', 0.95);
  const [shot, st] = shotOf(lt, [comes - 0.1]);
  if (shot === 0) {
    const zoomHeel = clamp((lt - heel + 0.2) / 0.6);
    camera(lerp(520, 620, zoomHeel), lerp(860, 760, zoomHeel), lerp(1.05, 1.6, easeInOut(zoomHeel)));
    vaseWorld(t, () => {
      styxWater(1170, t);
      const dip = clamp((lt - dips) / 0.6) * (1 - clamp((lt - heel - 0.4) / 0.8) * 0.5);
      const p = fig('thetis', 380, 1170, 1.4, { t, hold: 'babyHeel', armF: [lerp(1.2, 1.55, dip), lerp(1.4, 2.2 - dip * 0.6, dip)], armB: [0.4, 0.8], heelGlow: lt > heel - 0.1 ? 1 : 0 });
      if (dip > 0.2) for (let i = 0; i < 10; i++) circle(p.hand[0] + Math.sin(i * 2.1 + t * 3) * 50, 1170 - 10 + Math.cos(i * 1.7) * 6, 6, 'rgba(190,170,255,.6)');
      inscription('ΘΕΤΙΣ', 160, 760, 52, clamp(lt / 0.5), true);
    });
    namePlate('THETIS', 540, 330, clamp(lt / 0.3));
    if (lt > styx - 0.1) goldText('THE RIVER STYX', 540, 450, 76, lt - styx + 0.1, { mid: '#b9a2ff', bot: '#4a2aa8', top: '#ece4ff', glow: 'rgba(150,110,255,.5)' });
  } else {
    camera(540, 900, lerp(1.05, 1.15, easeInOut(st / 2)));
    whip(st, 1);
    parchWorld(t, () => {
      scrollIcon(540, 920, 1.6, 'ACHILLEID', clamp(st / 0.35), { sub: 'c. AD 95' });
    });
    namePlate('A ROMAN POET', 540, 330, clamp(st / 0.3));
    if (lt > stat - 0.1) goldText('STATIUS', 540, 460, 110, lt - stat + 0.1);
  }
};
EV.styx = ln => [{ t: wl(ln, 'dips', 0.2), type: 'smokeburst' }, { t: wl(ln, 'heel', 0.7) - 0.1, type: 'chime' }, { t: wl(ln, 'comes', 0.75) - 0.1, type: 'whoosh' }, { t: wl(ln, 'statius', 0.95), type: 'quill' }];

S.gap = ({ t, lt, ln }) => {
  const hun = wl(ln, 'hundred', 0.5);
  camera(540, 900, lerp(1.0, 1.06, lt / 2.4));
  parchWorld(t, () => {
    const p = easeInOut(clamp(lt / 1.0));
    ctx.save(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(150, 980); ctx.lineTo(lerp(150, 930, p), 980); ctx.stroke();
    for (const [x, at] of [[150, 0], [930, 0.95]]) if (p >= at) { ctx.beginPath(); ctx.moveTo(x, 940); ctx.lineTo(x, 1020); ctx.stroke(); }
    ctx.restore();
    scrollIcon(150 + 70, 760, 0.7, 'HOMER', clamp(lt / 0.3));
    inkText('c. 750 BC', 220, 1070, 40, { weight: 700 });
    scrollIcon(930 - 70, 760, 0.7, 'STATIUS', clamp((lt - 0.8) / 0.3));
    inkText('c. AD 95', 860, 1070, 40, { weight: 700, alpha: clamp((lt - 0.8) / 0.3) });
    if (lt > hun - 0.3) { ctx.save(); ctx.strokeStyle = '#a3201a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(220, 1140); ctx.quadraticCurveTo(540, 1240, 860, 1140); ctx.stroke(); ctx.restore(); }
  });
  goldText('≈ 800 YEARS LATER', 540, 360, 84, lt - hun + 0.3);
};
EV.gap = ln => [{ t: 0.05, type: 'quill' }, { t: wl(ln, 'hundred', 0.5) - 0.3, type: 'stamp' }];

S.wound = ({ t, lt, ln }) => {
  const prot = wl(ln, 'protected', 0.4), he = wl(ln, 'even', 0.6), arm = wlLast(ln, 'arm', 0.95);
  const [shot, st] = shotOf(lt, [he - 0.2]);
  const fight = (hit) => vaseWorld(t, () => {
    fig('hero', 330, 1290, 1.35, { t, hold: 'spear', propAng: 1.25 + Math.sin(t * 3) * 0.05, armF: [-1.2, -1.5], holdB: 'shield', emblem: 'gorgon', armB: [0.9, 0.3], legSpread: 0.25 });
    fig('hero', 820, 1290, 1.3, { t, f: -1, hold: hit < 0 ? 'spear' : null, propAng: 1.4, armF: hit < 0 ? [-1.3, -1.6] : [1.4, 0.6], holdB: 'shield', emblem: 'star', armB: [0.9, 0.3], legSpread: 0.25 });
    inscription('ΑΧΙΛΛΕΥΣ', 140, 760, 50, 1, true);
    if (hit >= 0) {
      const u = clamp(hit / 0.35);
      arrowSpear(lerp(700, 300, u), lerp(860, 900, u));
      if (hit > 0.35) { glow(300, 910, 180, 'rgba(255,40,40,.75)', clamp(1 - (hit - 0.35) / 1.2)); }
    }
  });
  if (shot === 0) {
    camera(560, 880, lerp(1.0, 1.12, easeInOut(st / 3)));
    fight(-1);
    namePlate('IN THE ILIAD', 540, 330, clamp(st / 0.3));
    if (lt > prot - 0.2) goldText('NOT INVINCIBLE', 540, 460, 84, lt - prot + 0.2);
  } else {
    camera(lerp(520, 380, easeInOut(clamp((lt - arm + 0.5) / 0.6))), 880, lerp(1.1, 1.45, easeInOut(clamp((lt - arm + 0.5) / 0.6))));
    whip(st, -1, 400);
    shake(t, lt > arm - 0.15 ? 18 * Math.exp(-(lt - arm + 0.15) * 6) : 0);
    fight(lt - arm + 0.5);
    namePlate('ILIAD · BOOK 21', 540, 330, clamp(st / 0.3));
    if (lt > arm - 0.15) goldText('WOUNDED', 540, 460, 110, lt - arm + 0.15, { mid: '#ff7a5a', bot: '#a8201a', top: '#ffd0c0', glow: 'rgba(255,60,40,.5)' });
  }
};
function arrowSpear(x, y) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI + 0.1); rod(-180, 0, 60, 0, 6); ctx.strokeStyle = INK; ctx.fillStyle = CLAY; ctx.beginPath(); ctx.moveTo(100, 0); ctx.quadraticCurveTo(72, -12, 56, 0); ctx.quadraticCurveTo(72, 12, 100, 0); ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
EV.wound = ln => [{ t: 0.05, type: 'boom' }, { t: wlLast(ln, 'arm', 0.95) - 0.5, type: 'whoosh' }, { t: wlLast(ln, 'arm', 0.95) - 0.15, type: 'stamp' }];

S.death = ({ t, lt, ln }) => {
  const ends = wl(ln, 'ends', 0.25), dies = wl(ln, 'dies', 0.4), later = wl(ln, 'later', 0.45), arrowT = wl(ln, 'arrow', 0.75), apo = wl(ln, 'apollo', 0.95);
  const [shot, st] = shotOf(lt, [later - 0.1]);
  if (shot === 0) {
    camera(540, 900, lerp(1.0, 1.12, easeInOut(st / 2)));
    parchWorld(t, () => {
      const roll = clamp((lt - dies) / 0.6);
      ctx.save(); ctx.translate(540, 900); ctx.scale(1, 1 - roll * 0.85); ctx.translate(-540, -900);
      scrollIcon(540, 900, 1.6, 'ILIAD', clamp(st / 0.35), { sub: 'BOOK 24 · THE END' }); ctx.restore();
    });
    goldText('THE POEM ENDS...', 540, 340, 84, lt - ends + 0.2, { step: 0.03 });
    if (lt > dies) namePlate('BEFORE HE DIES', 540, 470, clamp((lt - dies) / 0.3));
  } else {
    camera(lerp(480, 600, easeInOut(st / 4)), 860, lerp(1.0, 1.12, easeInOut(st / 4)));
    whip(st, 1);
    const fly = clamp((lt - arrowT + 0.2) / 0.9), fall = clamp((lt - arrowT - 0.7) / 1.0);
    vaseWorld(t, () => {
      vaseStars(t, 30, 9);
      const kA = clamp((lt - apo + 0.4) / 0.5);
      if (kA > 0) { glow(520, 470, 300, 'rgba(255,215,110,.6)', kA); fig('apollo', 520, 760, 0.9, { t, alpha: kA, armF: [-2.2, -2.6], armB: [0.4, 0.2], wings: 0 }); }
      const paris = fig('paris', 220, 1290, 1.3, { t, hold: 'bow', propAng: 0, armF: [-1.6, -1.55], armB: [-1.45, -1.25], draw: fly > 0 ? 0 : 1, arrowNocked: fly <= 0 });
      fig('hero', 860, 1290, 1.3, { t, f: -1, lean: -fall * 0.5, hold: 'spear', propAng: 0.3, armF: [0.4, 0.2], holdB: 'shield', emblem: 'gorgon', armB: [0.9, 0.3] });
      if (fly > 0 && fly < 1) arrow(lerp(paris.hand[0] + 80, 870, fly), lerp(paris.hand[1], 1270, fly) - Math.sin(fly * Math.PI) * 80, 0.25, 1, 1, 'rgba(255,215,110,.85)');
      if (fly >= 1) glow(870, 1268, 160, 'rgba(255,60,40,.7)', clamp(1 - fall));
      inscription('ΑΛΕΞΑΝΔΡΟΣ', 140, 700, 40, 1, true);
    });
    namePlate('PARIS', 540, 330, clamp(st / 0.3));
    if (lt > apo - 0.4) goldText('GUIDED BY APOLLO', 540, 460, 72, lt - apo + 0.4, { step: 0.025 });
  }
};
EV.death = ln => [{ t: wl(ln, 'ends', 0.25), type: 'quill' }, { t: wl(ln, 'later', 0.45) - 0.1, type: 'whoosh' }, { t: wl(ln, 'arrow', 0.75) - 0.2, type: 'firewhoosh' }, { t: wl(ln, 'arrow', 0.75) + 0.7, type: 'boom' }, { t: wl(ln, 'apollo', 0.95) - 0.4, type: 'chime' }];

S.word = ({ t, lt, ln }) => {
  const and = wl(ln, 'and', 0.5), tend = wl(ln, 'tendon', 0.65);
  const [shot, st] = shotOf(lt, [and - 0.05]);
  if (shot === 0) {
    camera(540, 900, lerp(1.0, 1.08, easeInOut(st / 2.5)));
    parchWorld(t, () => {
      card(540, 900, 820, 380, "ACHILLES' HEEL (n.)", ['a fatal weakness in someone', 'who is otherwise strong'], clamp(st / 0.35), { bg: 'rgba(250,240,215,.96)', border: '#3a2412', titleColor: '#3a2412', bodyColor: '#5a3a1e', bodySize: 40, lineH: 56 });
    });
    goldText('TODAY', 540, 360, 110, st);
  } else {
    camera(520, 900, lerp(1.0, 1.2, easeInOut(st / 2.5)));
    whip(st, -1, 500);
    parchWorld(t, () => {
      inkLine(() => { ctx.moveTo(440, 520); ctx.quadraticCurveTo(430, 820, 440, 1060); ctx.quadraticCurveTo(420, 1160, 520, 1180); ctx.lineTo(780, 1190); ctx.quadraticCurveTo(820, 1150, 760, 1120); ctx.quadraticCurveTo(620, 1080, 590, 1000); ctx.quadraticCurveTo(570, 800, 580, 520); }, 7);
      const k = clamp((lt - tend + 0.3) / 0.5);
      if (k > 0) {
        ctx.save(); ctx.strokeStyle = '#d0242c'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.globalAlpha = k;
        ctx.beginPath(); ctx.moveTo(458, 760); ctx.quadraticCurveTo(450, 980, 462, 1120); ctx.stroke(); ctx.restore();
        glow(458, 1000, 220, 'rgba(255,60,40,.45)', k);
        ctx.save(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(470, 900); ctx.lineTo(700, 820); ctx.stroke(); ctx.restore();
        inkText('ACHILLES TENDON', 790, 790, 40, { alpha: k });
      }
    });
    goldText('NAMED AFTER HIM', 540, 360, 84, lt - tend + 0.1);
  }
};
EV.word = ln => [{ t: 0.05, type: 'quill' }, { t: wl(ln, 'and', 0.5) - 0.05, type: 'whoosh' }, { t: wl(ln, 'tendon', 0.65) - 0.3, type: 'chime' }];
