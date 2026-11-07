// Episode: Funmilayo Ransome-Kuti (1900–1978), the "Lioness of Lisabi"
// Often called the first woman in Nigeria to drive a car; led the Abeokuta Women's Union (AWU) in the 1940s against unfair taxes
// on market women; in 1949 the Alake of Egbaland stepped down for a time; mother of Afrobeat pioneer Fela Kuti.

function lionMane(x, y, r, t, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(t * 0.15);
  for (let i = 0; i < 26; i++) { ctx.rotate(Math.PI * 2 / 26); ctx.beginPath(); ctx.moveTo(-30, -r * 0.55); ctx.quadraticCurveTo(0, -r * 1.15, 30, -r * 0.55); ctx.closePath(); ctx.fillStyle = i % 2 ? '#f2b705' : '#f26b1d'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.stroke(); }
  ctx.restore();
}

S.hook = ({ t, lt, ln }) => {
  const li = wl(ln, 'lioness', 0.35), and = wl(ln, 'and', 0.55), step = wlLast(ln, 'down', 0.95);
  const [shot, st] = shotOf(lt, [and - 0.1]);
  if (shot === 0) {
    camera(540, 940, lerp(1.12, 1.0, easeOut(st / 2)));
    popWorld(t, () => {
      lionMane(540, 760, 520, t, easeBack(clamp((lt - li + 0.3) / 0.5)));
      person('funmilayo', 540, 1290, 1.15, { t, pop: clamp((st + 0.1) / 0.45), armR: [0.6, 0.3], armL: [0.6, 0.3] });
    }, { pattern: 'suns', pal: 'magenta', cy: 760, disc: 0, fronds: true });
    popText('THE LIONESS', 540, 290, 116, lt - li + 0.3, { color: '#f2b705' });
    popText('OF LISABI', 540, 410, 100, lt - li - 0.1, { color: '#fff4dc' });
  } else {
    camera(540, 940, lerp(1.0, 1.08, st / 2));
    const fall = clamp((lt - step + 0.55) / 0.75), hx = 700, hy = 1290 - 0.95 * 560;
    popWorld(t, () => {
      person('funmilayo', 280, 1290, 0.95, { t, armR: [1.0, 1.9], mood: 'flat', pop: clamp((st + 0.1) / 0.4) });
      person('alake', hx, 1290, 0.95, { t, style: { head: fall > 0 ? 'fila' : 'crown' }, mood: fall > 0.3 ? 'sad' : 'flat', armL: [0.2, 0.1], armR: [0.2, 0.1], pop: clamp((st - 0.15) / 0.4) });
      if (fall > 0) {
        const cx = lerp(hx, 950, fall), cy = lerp(hy, 1250, fall) - Math.sin(fall * Math.PI) * 300;
        beadedCrown(cx, cy, 0.72, t, { rot: fall * 2.6 });
        if (fall >= 1) for (let i = 0; i < 12; i++) { const a = hash1(i) * Math.PI, d = clamp((lt - step - 0.2) / 0.5) * 120; circle(950 + Math.cos(a) * d * 1.4, 1280 - Math.sin(a) * d * 0.7, 10 * (1 - clamp((lt - step - 0.2) / 0.8)), '#e8dcc8'); }
      }
    }, { pattern: 'diamonds', pal: 'teal', cy: 820, disc: 0, fronds: true });
    popText('SHE MADE A KING', 540, 320, 96, st, { color: '#fff4dc' });
    popText('STEP DOWN', 540, 440, 110, lt - step + 0.4, { color: '#f2b705' });
    ankaraWipe(st, { pal: 'teal', pattern: 'diamonds' });
  }
};
const easeIn2 = u => u * u;
EV.hook = ln => [{ t: wl(ln, 'lioness', 0.35) - 0.3, type: 'boom' }, { t: wl(ln, 'and', 0.55) - 0.1, type: 'whoosh' }, { t: wlLast(ln, 'down', 0.95) + 0.2, type: 'bonk' }];

S.drive = ({ t, lt, ln }) => {
  const fu = wl(ln, 'funmilayo', 0.15), car_ = wlLast(ln, 'car', 0.95);
  const u = easeInOut(clamp(lt / 3.2));
  camera(lerp(380, 640, u), 980, 1.0);
  popWorld(t, () => {
    road(1290, t, { speed: 200 });
    oldCar(lerp(-150, 720, u), 1392, 1.35, t, { color: '#1f3fbf', driver: 'funmilayo' });
  }, { pattern: 'rings', pal: 'sunset', burst: false, ground: false, fronds: true, back: () => {
    zincHouse(120, 1296, 0.9, '#f26b1d'); zincHouse(560, 1296, 0.8, '#0aa3a3'); zincHouse(1000, 1296, 0.9, '#d6246e');
    palmTree(-60, 1300, 0.95, t, 0.1); palmTree(340, 1300, 1.1, t, -0.08); palmTree(790, 1300, 1.0, t, 0.06); palmTree(1230, 1300, 1.05, t, -0.1);
  } });
  tag('FUNMILAYO RANSOME-KUTI', 540, 330, clamp((lt - fu + 0.2) / 0.3), { size: 46 });
  if (lt > car_ - 0.6) burstBadge('FIRST WOMAN\nDRIVER?', 810, 620, 160, clamp((lt - car_ + 0.6) / 0.3), { size: 40, color: '#f2b705' });
  tag('OFTEN CALLED NIGERIA\'S FIRST', 540, 450, clamp((lt - 1.4) / 0.3), { size: 36, bg: '#f2b705' });
  ankaraWipe(lt, { pal: 'sunset', pattern: 'rings' });
};
EV.drive = ln => [{ t: 0.1, type: 'whoosh' }, { t: wlLast(ln, 'car', 0.95) - 0.6, type: 'pop' }];

S.union = ({ t, lt, ln }) => {
  const un = wl(ln, 'union', 0.5), tax = wl(ln, 'taxes', 0.75);
  const u = easeInOut(clamp(lt / 4.5));
  camera(lerp(460, 620, u), 960, lerp(1.08, 1.0, u));
  popWorld(t, () => {
    const pals = ['sunset', 'magenta', 'teal', 'green', 'indigo'];
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 190 + Math.sin(t + i) * 6;
      placard(x + 10, 840, 0.75, 'AWU', ['#f2b705', '#fff4dc', '#2fd38a'][i % 3], t, i);
      person(i === 2 ? 'funmilayo' : 'marketwoman', x, 1290, 0.7, { t: t + i, walk: 0.7, hop: 0, armR: [2.2, 2.9], style: i === 2 ? {} : { pal: pals[i % 5] } });
    }
  }, { pattern: 'leaves', pal: 'sunset', burst: false });
  burstBadge('1940s', 850, 440, 120, clamp(lt / 0.3), { size: 60, color: '#f2b705' });
  tag('ABEOKUTA WOMEN\'S UNION', 450, 330, clamp((lt - un + 0.3) / 0.3), { size: 46 });
  if (lt > tax - 0.2) tag('AGAINST UNFAIR TAXES', 540, 560, clamp((lt - tax + 0.2) / 0.3), { size: 50, bg: '#d6246e', ink: '#fff4dc' });
  ankaraWipe(lt, { pal: 'sunset', pattern: 'leaves' });
};
EV.union = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'taxes', 0.75) - 0.2, type: 'stamp' }];

S.king = ({ t, lt, ln }) => {
  const al = wl(ln, 'alake', 0.4), step = wl(ln, 'step', 0.6), yr = wlLast(ln, '1949', 0.95);
  camera(540, 940, lerp(1.05, 1.12, lt / 4));
  const lift = easeInOut(clamp((lt - step + 0.1) / 0.8));
  popWorld(t, () => {
    ctx.save(); ctx.beginPath(); ctx.rect(-400, -400, 2000, 1690); ctx.clip();
    person('alake', 540, 1290, 1.15, { t, style: { head: lift > 0.1 ? 'fila' : 'crown' }, mood: lift > 0.4 ? 'sad' : 'flat', armL: [0.2, 0.1], armR: [0.2, 0.1], pop: clamp((lt - al + 0.4) / 0.45) });
    ctx.restore();
    if (lift > 0.1) beadedCrown(540 + lift * 250, lerp(1290 - 1.15 * 560, 560, lift), 0.65, t, { rot: lift * 0.6 });
  }, { pattern: 'suns', pal: 'teal', cy: 800, disc: 300, fronds: true });
  tag('THE ALAKE OF EGBALAND', 540, 330, clamp((lt - al + 0.2) / 0.3), { size: 46 });
  burstBadge('1949', 830, 560, 120, clamp((lt - yr + 0.3) / 0.3), { size: 64, color: '#f2b705' });
  tag('STEPPED DOWN, FOR A TIME', 540, 1300, clamp((lt - step) / 0.3), { size: 44 });
  ankaraWipe(lt, { pal: 'teal', pattern: 'suns' });
};
EV.king = ln => [{ t: wl(ln, 'alake', 0.4) - 0.3, type: 'pop' }, { t: wl(ln, 'step', 0.6), type: 'whoosh' }, { t: wlLast(ln, '1949', 0.95) - 0.3, type: 'stamp' }];

S.son = ({ t, lt, ln }) => {
  const fe = wl(ln, 'fela', 0.8);
  camera(540, 940, lerp(1.1, 1.0, easeOut(lt / 1.5)));
  impact(t, lt - fe, 0.8);
  popWorld(t, () => {
    person('funmilayo', 300, 1290, 0.95, { t, armR: [1.0, 1.9], mood: 'smile' });
    saxophone(760, 900, 1.05, t);
  }, { pattern: 'waves', pal: 'magenta', cy: 820, disc: 0, fronds: true });
  tag('HER SON', 540, 330, clamp(lt / 0.3), { size: 50 });
  popText('FELA KUTI', 540, 460, 120, lt - fe + 0.3, { color: '#f2b705' });
  tag('AFROBEAT LEGEND', 760, 1300, clamp((lt - fe) / 0.3), { size: 44, bg: '#d6246e', ink: '#fff4dc' });
  ankaraWipe(lt, { pal: 'magenta', pattern: 'waves' });
};
EV.son = ln => [{ t: wl(ln, 'fela', 0.8) - 0.3, type: 'ding' }];

S.cta = ctaScene('WHO SHOULD IJAPA', 'TALK ABOUT NEXT?', { pal: 'magenta' });
