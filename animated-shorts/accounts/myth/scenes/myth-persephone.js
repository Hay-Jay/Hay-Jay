// Episode: Persephone didn't eat six seeds
// Sources: Homeric Hymn to Demeter (one pomegranate seed; a third of the year below; Demeter's grief stops the harvest);
// Ovid, Metamorphoses 5 (seven seeds); "six seeds, six months" appears in much later retellings.

function meadow(t, wilt = 0) {
  for (let i = 0; i < 18; i++) { const x = -60 + i * 72 + Math.sin(i * 3.7) * 20; wheat(x, 1290, 150 + 40 * hash1(i), wilt, t, i); }
}
function underworld(t) {
  glow(540, 900, 800, 'rgba(110,40,190,.35)', 1);
  ctx.fillStyle = '#05020a';
  ctx.beginPath(); ctx.moveTo(-400, 110); for (let x = -400; x <= 1500; x += 60) ctx.lineTo(x, 180 + 70 * hash1(x) + (x % 120 ? 60 : 0)); ctx.lineTo(1500, 110); ctx.fill();
  particles(71, 30, t, { x0: -100, x1: 1180, y0: 500, y1: 1290, vy: -25, size: 3, color: 'rgba(190,140,255,1)', core: '#e8d8ff', glow: true, life: 4, wobble: 30, alpha: 0.6 });
}
function seedsRow(n, x, y, k) {
  for (let i = 0; i < n; i++) { const sx = x + (i - (n - 1) / 2) * 48, a = clamp(k * n - i); if (a <= 0) continue; glow(sx, y, 36, 'rgba(255,40,70,.6)', a); circle(sx, y, 15 * a, '#e0213a'); circle(sx - 4, y - 5, 5 * a, '#ffd0d8'); }
}

S.hook = ({ t, lt, ln }) => {
  const pom = wl(ln, 'pomegranate', 0.35), six = wl(ln, 'six', 0.25), not = wl(ln, 'not', 0.6);
  const [shot, st] = shotOf(lt, [not - 0.1]);
  camera(540, 860, shot === 0 ? lerp(1.05, 1.2, easeInOut(st / 2.5)) : lerp(1.2, 1.05, easeOut(st / 1)));
  vaseWorld(t, () => {
    const open = clamp((lt - pom + 0.1) / 0.5);
    pomegranate(540, 860, 230, open, t);
    if (open > 0.5) for (let i = 0; i < 12; i++) sparkle(540 + Math.cos(i + t) * 300, 860 + Math.sin(i * 1.7 + t) * 260, 10, 0.5 + 0.5 * Math.sin(t * 6 + i));
  });
  goldText('PERSEPHONE', 540, 330, 112, lt + 0.2);
  if (shot === 0 && lt > six - 0.1) goldText('SIX SEEDS?', 540, 460, 96, lt - six + 0.1, { mid: '#ff7a7a', bot: '#a8101e', top: '#ffd8d8', glow: 'rgba(255,60,80,.5)' });
  if (shot === 1) stamp('NOT IN THE OLDEST VERSION', 540, 1180, st, { size: 46 });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'pomegranate', 0.35) - 0.1, type: 'pop' }, { t: wl(ln, 'not', 0.6) - 0.1, type: 'stamp' }];

S.abduct = ({ t, lt, ln }) => {
  const ha = wl(ln, 'hades', 0.05), car = wl(ln, 'carried', 0.55), per = wl(ln, 'persephone', 0.7), q = wl(ln, 'queen', 0.95);
  const up = easeOut(clamp((lt - ha) / 0.6)), down = easeInOut(clamp((lt - car) / 1.4));
  camera(560, 900, lerp(1.0, 1.15, easeInOut(lt / 3.8)));
  shake(t, lt > ha ? 14 * Math.exp(-(lt - ha) * 4) : 0);
  vaseWorld(t, () => {
    for (let i = 0; i < 10; i++) narcissus(80 + i * 110, 1270 - (i % 2) * 14, 16, t);
    ctx.save(); ctx.beginPath(); ctx.rect(-400, -400, 2000, 1690); ctx.clip();
    fig('persephone', 700, 1290 + down * 700, 1.3, { t, f: -1, hold: lt < ha ? 'flower' : null, propAng: -0.4, armF: lt < ha ? [1.0, 0.5] : [2.0, 2.8], armB: lt < ha ? undefined : [1.7, 2.6], lean: lt > ha ? -0.12 : 0 });
    fig('hades', 420, 1290 + (1 - up) * 700 + down * 700, 1.45, { t, hold: 'bident', propAng: 0.15, armF: [-0.1, -0.4], armB: [1.4, 1.5] });
    ctx.restore();
    groundCrack(560, 1290, 300, up * (1 - clamp((lt - car - 1.6) / 0.6) * 0.3), t);
  });
  namePlate('HADES', 540, 330, clamp((lt - ha) / 0.3));
  if (lt > q - 0.2) goldText('HIS QUEEN', 540, 460, 96, lt - q + 0.2, { mid: '#c49aff', bot: '#4a2a8a', top: '#f0e4ff', glow: 'rgba(160,100,255,.5)' });
};
EV.abduct = ln => [{ t: wl(ln, 'hades', 0.05), type: 'boom' }, { t: wl(ln, 'carried', 0.55), type: 'smokeburst' }];

S.grief = ({ t, lt, ln }) => {
  const dem = wl(ln, 'demeter', 0.1), hb = wl(ln, 'heartbroken', 0.5), crops = wl(ln, 'crops', 0.75), stop = wl(ln, 'stopped', 0.85);
  const w = easeInOut(clamp((lt - hb) / 1.8));
  camera(540, 900, lerp(1.05, 1.0, easeOut(lt / 3)));
  vaseWorld(t, () => {
    meadow(t, w);
    fig('demeter', 540, 1290, 1.4, { t, hold: 'wheat', propAng: 0.2 + w * 1.2, armF: [lerp(-0.4, 0.6, w), lerp(-0.8, 0.3, w)], headTilt: w * 0.35, armB: [lerp(0.3, 1.9, w), lerp(0.4, 2.7, w)] });
  }, { tint: `rgba(40,40,50,${0.35 * w})` });
  namePlate('DEMETER, GODDESS OF THE HARVEST', 540, 330, clamp((lt - dem) / 0.3), 38);
  if (lt > stop - 0.2) goldText('NOTHING GREW', 540, 460, 96, lt - stop + 0.2, { mid: '#c9c3b8', bot: '#5a544c', top: '#ffffff', glow: 'rgba(200,200,200,.35)' });
};
EV.grief = ln => [{ t: wl(ln, 'heartbroken', 0.5), type: 'hush' }, { t: wl(ln, 'stopped', 0.85) - 0.2, type: 'boom' }];

S.seed = ({ t, lt, ln }) => {
  const but = wl(ln, 'but', 0.3), seed = wl(ln, 'seed', 0.5), and = wl(ln, 'and', 0.55), back = wlLast(ln, 'back', 0.95);
  const [shot, st] = shotOf(lt, [but - 0.1, and - 0.1]);
  if (shot === 0) {
    camera(540, 860, lerp(1.0, 1.12, easeInOut(st / 1.6)));
    shake(t, 22 * Math.exp(-st * 5));
    vaseWorld(t, () => {
      cloud(540, 1250, 1.5);
      const z = fig('zeus', 520, 1240, 1.4, { t, armF: [-2.4, -2.9], armB: [-0.3, -0.6], hold: 'scepter' });
      bolt(z.hand[0], z.hand[1] - 40, 0.85, 0.3, t);
    });
    flash(st, 0.2, '255,250,230', 0.8);
    namePlate('ZEUS', 540, 330, clamp(st / 0.3));
    goldText('SEND HER BACK', 540, 460, 92, st - 0.3);
  } else if (shot === 1) {
    camera(560, 880, lerp(1.05, 1.3, easeInOut(st / 2.4)));
    whip(st, 1);
    vaseWorld(t, () => {
      underworld(t);
      fig('hades', 330, 1290, 1.4, { t, hold: 'seed', armF: [-1.1, -1.4], holdB: 'bident', propAngB: 0.1, armB: [0.2, 0.4] });
      const take = clamp((lt - seed) / 0.6);
      fig('persephone', 760, 1290, 1.3, { t, f: -1, armF: [lerp(0.4, -1.2, take), lerp(0.5, -1.4, take)], headTilt: 0.1 });
    }, { tint: 'rgba(30,0,40,.25)' });
    namePlate('A POMEGRANATE SEED', 540, 330, clamp((lt - seed + 0.2) / 0.3), 42);
  } else {
    camera(540, 880, lerp(1.0, 1.06, easeInOut(st / 3)));
    whip(st, -1, 400);
    vaseWorld(t, () => { underworld(t); pomegranate(540, 1120, 110, 1, t); }, { tint: 'rgba(30,0,40,.25)' });
    card(540, 720, 900, 380, 'THE RULE', ['EAT THE FOOD OF THE', 'UNDERWORLD, AND YOU', 'MUST COME BACK'], clamp(st / 0.3), { bodySize: 50, lineH: 70 });
  }
};
EV.seed = ln => [{ t: 0.0, type: 'thunder' }, { t: wl(ln, 'but', 0.3) - 0.1, type: 'whoosh' }, { t: wl(ln, 'seed', 0.5), type: 'shimmer' }, { t: wl(ln, 'and', 0.55) - 0.1, type: 'chime' }];

S.count = ({ t, lt, ln }) => {
  const hy = wl(ln, 'hymn', 0.25), one = wl(ln, 'one', 0.35), third = wl(ln, 'third', 0.55), ov = wl(ln, 'ovid', 0.65), sev = wl(ln, 'seven', 0.7), six = wlLast(ln, 'six', 0.85), later = wlLast(ln, 'later', 0.95);
  camera(540, lerp(860, 940, easeInOut(lt / 8.5)), 1.0);
  vaseWorld(t, () => { underworld(t); }, { tint: 'rgba(20,10,10,.35)' });
  const k1 = clamp((lt - hy + 0.2) / 0.3), k2 = clamp((lt - ov + 0.2) / 0.3), k3 = clamp((lt - six + 0.3) / 0.3);
  card(540, 600, 900, 300, 'HOMERIC HYMN · OLDEST', [lt > third - 0.2 ? 'A THIRD OF THE YEAR BELOW' : ''], k1, { bodySize: 38 });
  if (k1 > 0) seedsRow(1, 540, 640, clamp((lt - one + 0.1) / 0.3));
  card(540, 930, 900, 260, 'OVID', [], k2, { titleSize: 44 });
  if (k2 > 0) seedsRow(7, 540, 980, clamp((lt - sev + 0.1) / 0.6));
  card(540, 1230, 900, 260, 'MUCH LATER RETELLINGS', [], k3, { titleSize: 40, border: '#a8a39a' });
  if (k3 > 0) seedsRow(6, 540, 1280, clamp((lt - six + 0.1) / 0.6));
  goldText('HOW MANY SEEDS?', 540, 340, 92, lt);
  if (lt > later) stamp('LATER', 800, 1320, lt - later, { size: 42, rot: 0.1 });
};
EV.count = ln => [{ t: wl(ln, 'hymn', 0.25) - 0.2, type: 'pop' }, { t: wl(ln, 'ovid', 0.65) - 0.2, type: 'pop' }, { t: wlLast(ln, 'six', 0.85) - 0.3, type: 'pop' }, { t: wlLast(ln, 'later', 0.95), type: 'stamp' }];

S.winter = ({ t, lt, ln }) => {
  const gone = wl(ln, 'gone', 0.45), gr = wl(ln, 'grieves', 0.6), win = wlLast(ln, 'winter', 0.95);
  const cold = easeInOut(clamp((lt - gone) / 2));
  camera(540, 900, lerp(1.0, 1.12, easeInOut(lt / 4.5)));
  vaseWorld(t, () => {
    meadow(t, 0.4 + cold * 0.6);
    fig('demeter', 540, 1290, 1.4, { t, headTilt: 0.3 * cold, armF: [lerp(0.3, 2.3, cold), lerp(0.4, 3.0, cold)], armB: [lerp(0.2, 2.0, cold), lerp(0.3, 2.9, cold)] });
    ctx.save(); ctx.globalAlpha = cold; ctx.fillStyle = '#eef4ff'; ctx.fillRect(-400, 1270, 2000, 20); ctx.restore();
    particles(81, 70, t, { x0: -200, x1: 1300, y0: 0, y1: 300, vy: 110, vx: -20, size: 4, color: 'rgba(240,248,255,1)', wobble: 40, life: 9, alpha: cold });
  }, { tint: `rgba(120,150,200,${0.22 * cold})` });
  goldText('EVERY YEAR', 540, 340, 92, lt);
  if (lt > win - 0.3) goldText('WINTER', 540, 480, 150, lt - win + 0.3, { font: '"Cinzel Decorative", "Cinzel", serif', mid: '#bfe0ff', bot: '#3a6aa8', top: '#ffffff', glow: 'rgba(170,210,255,.6)', step: 0.06 });
};
EV.winter = ln => [{ t: wl(ln, 'gone', 0.45), type: 'hush' }, { t: wlLast(ln, 'winter', 0.95) - 0.3, type: 'chime' }];
