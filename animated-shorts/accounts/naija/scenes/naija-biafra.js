// Episode: The Biafran War, explained (Nigerian Civil War, 6 July 1967 to 15 January 1970)
// Kept factual, neutral and non-graphic: maps, flags, dates and symbols only.
// Sources: Ojukwu's declaration of the Republic of Biafra, 30 May 1967; Gowon's "To keep Nigeria one" and "No victor, no vanquished";
// death toll estimates of roughly 500,000 to 3 million, mostly from starvation under the blockade.

// approximate outline of the former Eastern Region (Biafra)
const EAST = [[6.75, 7.8], [8.0, 7.45], [9.3, 6.95], [9.8, 6.1], [8.9, 5.0], [8.5, 4.6], [7.0, 4.4], [6.2, 4.45], [6.2, 4.9], [6.8, 6.2]];

S.hook = ({ t, lt, ln }) => {
  const and = wl(ln, 'and', 0.55), dec = wl(ln, 'declaration', 0.9);
  camera(540, 900, lerp(1.0, 1.08, easeInOut(lt / 4.5)));
  popWorld(t, () => {
    ngMap(MAP, { fill: pat('diamonds', 'somber', 0.5), region: lt > and ? EAST : null, regionFill: `rgba(214,36,46,${0.8 * clamp((lt - and) / 0.5)})` });
  }, { pattern: 'diamonds', pal: 'somber', burst: false, ground: false, dim: 0.55 });
  popText('THE BIAFRAN WAR', 540, 320, 100, lt + 0.2, { color: '#f2b705' });
  tag('1967 – 1970', 540, 440, clamp((lt - 0.4) / 0.3), { size: 54 });
  if (lt > dec - 0.2) burstBadge('ONE\nDECLARATION', 760, 1180, 170, clamp((lt - dec + 0.2) / 0.3), { size: 40, color: '#f2b705' });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'declaration', 0.9) - 0.2, type: 'stamp' }];

S.coups = ({ t, lt, ln }) => {
  const vio = wl(ln, 'violence', 0.45), dr = wl(ln, 'drove', 0.75);
  const [shot, st] = shotOf(lt, [vio - 0.2]);
  if (shot === 0) {
    camera(540, 940, lerp(1.1, 1.0, easeOut(st / 2)));
    popWorld(t, () => {
      person('soldier', 330, 1290, 1.0, { t, armR: [0.3, 0.1], mood: 'flat' });
      person('soldier', 760, 1290, 1.0, { t, f: -1, armL: [0.3, 0.1], mood: 'flat' });
    }, { pattern: 'diamonds', pal: 'somber', cy: 880, disc: 300, dim: 0.5 });
    burstBadge('1966', 540, 360, 140, clamp(st / 0.3), { size: 80, color: '#f2b705' });
    tag('TWO MILITARY COUPS', 540, 520, clamp((st - 0.4) / 0.3), { size: 46 });
  } else {
    camera(560, 880, lerp(1.0, 1.12, easeInOut(st / 3.5)));
    whip(st, 1);
    popWorld(t, () => {
      ngMap(MAP, { fill: pat('diamonds', 'somber', 0.5), region: EAST, regionFill: 'rgba(214,36,46,.55)' });
      const k = clamp((lt - dr) / 1.4);
      for (let i = 0; i < 4; i++) {
        const [x0, y0] = mapXY(7.2 + i * 0.6, 11.4 - i * 0.2), [x1, y1] = mapXY(7.4 + i * 0.25, 6.6), u = clamp(k * 1.2 - i * 0.08);
        ctx.save(); ctx.setLineDash([22, 14]); ctx.lineWidth = 10; ctx.strokeStyle = '#fff4dc'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, u), lerp(y0, y1, u)); ctx.stroke(); ctx.restore();
        if (u > 0.05) { ctx.save(); ctx.translate(lerp(x0, x1, u), lerp(y0, y1, u)); ctx.rotate(Math.atan2(y1 - y0, x1 - x0)); ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -14); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fillStyle = '#fff4dc'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = K; ctx.stroke(); ctx.restore(); }
      }
    }, { pattern: 'diamonds', pal: 'somber', burst: false, ground: false, dim: 0.6 });
    tag('VIOLENCE AGAINST IGBO PEOPLE', 540, 330, clamp(st / 0.3), { size: 40, bg: '#e8dcc8' });
    if (lt > dr) tag('MANY FLED EAST', 540, 1230, clamp((lt - dr) / 0.3), { size: 50, bg: '#d6246e', ink: '#fff4dc' });
  }
};
EV.coups = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'violence', 0.45) - 0.2, type: 'whoosh' }, { t: wl(ln, 'drove', 0.75), type: 'hush' }];

S.declare = ({ t, lt, ln }) => {
  const may = wl(ln, 'may', 0.1), oj = wl(ln, 'ojukwu', 0.45), bia = wlLast(ln, 'biafra', 0.95);
  const [shot, st] = shotOf(lt, [bia - 0.6]);
  if (shot === 0) {
    camera(lerp(520, 470, easeInOut(st / 4)), 920, lerp(1.0, 1.1, easeInOut(st / 4)));
    popWorld(t, () => {
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(330, 1010, 200, 280); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.strokeRect(330, 1010, 200, 280);
      person('ojukwu', 430, 1290, 1.05, { t, hold: 'paper', armR: [1.1, 2.3], armL: [0.3, 0.2] });
    }, { pattern: 'rings', pal: 'dusk', cx: 430, cy: 820, disc: 300 });
    calendarCard('30', 'MAY', '1967', 830, 600, clamp((lt - may) / 0.3), { top: '#d7262e' });
    tag('LT. COL. ODUMEGWU OJUKWU', 470, 330, clamp((lt - oj + 0.1) / 0.3), { size: 40 });
  } else {
    camera(540, 900, lerp(1.1, 1.0, easeOut(st / 1.2)));
    popWorld(t, () => {
      ngMap({ x: 540, y: 1040, s: 46 }, { fill: pat('diamonds', 'somber', 0.45), region: EAST, regionFill: 'rgba(215,38,46,.9)' });
      ctx.lineWidth = 12; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(250, 760); ctx.lineTo(250, 300); ctx.stroke();
      biafraFlag(410, lerp(760, 380, easeOut(clamp(st / 1.2))), 300, 180, t, 1);
    }, { pattern: 'suns', pal: 'dusk', burst: false, ground: false, dim: 0.5 });
    popText('REPUBLIC OF BIAFRA', 540, 1340, 76, st - 0.2, { color: '#f2b705' });
  }
};
EV.declare = ln => [{ t: wl(ln, 'may', 0.1), type: 'pop' }, { t: wlLast(ln, 'biafra', 0.95) - 0.6, type: 'whoosh' }, { t: wlLast(ln, 'biafra', 0.95), type: 'boom' }];

S.gowon = ({ t, lt, ln }) => {
  const go = wl(ln, 'gowon', 0.45), one = wlLast(ln, 'one', 0.95);
  camera(540, 920, lerp(1.08, 1.0, easeOut(lt / 2)));
  whip(lt, -1, 500);
  popWorld(t, () => {
    person('gowon', 560, 1290, 1.1, { t, hold: 'flag', armR: [0.7, 1.6], armL: [0.2, 0.1] });
  }, { pattern: 'leaves', pal: 'green', cy: 860, disc: 320 });
  tag('GEN. YAKUBU GOWON', 540, 330, clamp((lt - go) / 0.3), { size: 46 });
  tag('FEDERAL GOVERNMENT', 540, 440, clamp((lt - 0.2) / 0.3), { size: 36, bg: '#0f9d58', ink: '#fff4dc' });
  if (lt > one - 0.6) burstBadge('KEEP\nNIGERIA ONE', 790, 1170, 175, clamp((lt - one + 0.6) / 0.3), { size: 42, color: '#f2b705' });
};
EV.gowon = ln => [{ t: 0.0, type: 'whoosh' }, { t: wlLast(ln, 'one', 0.95) - 0.6, type: 'stamp' }];

S.blockade = ({ t, lt, ln }) => {
  const hist = wl(ln, 'historians', 0.3), hun = wl(ln, 'hunger', 0.95);
  const [shot, st] = shotOf(lt, [hist - 0.15]);
  if (shot === 0) {
    camera(560, 960, lerp(1.0, 1.1, easeInOut(st / 2.5)));
    popWorld(t, () => {
      sea(1180, t);
      for (let i = 0; i < 3; i++) blockadeShip(lerp(-200, 260 + i * 260, easeOut(clamp(st / 1.6))), 1220, 0.75, t + i);
      ngMap({ x: 540, y: 700, s: 40 }, { fill: pat('diamonds', 'somber', 0.4), region: EAST, regionFill: 'rgba(215,38,46,.8)' });
      const [ex, ey] = mapXY(7.8, 5.8, { x: 540, y: 700, s: 40 });
      ctx.save(); ctx.setLineDash([18, 12]); ctx.lineWidth = 9; ctx.strokeStyle = '#fff4dc'; ctx.beginPath(); ctx.arc(ex, ey, 150, 0, Math.PI * 2 * clamp(st / 1.2)); ctx.stroke(); ctx.restore();
    }, { pattern: 'waves', pal: 'somber', burst: false, ground: false, dim: 0.55 });
    tag('BLOCKADE', 540, 330, clamp(st / 0.3), { size: 60, bg: '#e8dcc8' });
  } else {
    camera(540, 900, lerp(1.0, 1.06, easeInOut(st / 4)));
    popWorld(t, () => {
      ctx.fillStyle = '#e8dcc8'; ctx.fillRect(460, 1080, 160, 200); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.strokeRect(460, 1080, 160, 200);
      flame(540, 1080, 34, t, 2); glow(540, 1040, 380, 'rgba(255,190,110,.45)', 1);
    }, { pattern: 'diamonds', pal: 'somber', burst: false, dim: 0.75, groundColor: '#2a2a3a' });
    popText('500,000 – 3,000,000', 540, 470, 96, st - 0.2, { color: '#fff4dc', step: 0.02 });
    tag('ESTIMATED DEATHS', 540, 330, clamp(st / 0.3), { size: 46, bg: '#e8dcc8' });
    if (lt > hun - 0.6) tag('MOST FROM HUNGER', 540, 610, clamp((lt - hun + 0.6) / 0.3), { size: 44, bg: '#b08a5a' });
  }
};
EV.blockade = ln => [{ t: 0.1, type: 'boom' }, { t: wl(ln, 'historians', 0.3) - 0.15, type: 'hush' }];

S.end = ({ t, lt, ln }) => {
  const sur = wl(ln, 'surrendered', 0.4), vic = wl(ln, 'victor', 0.75);
  const [shot, st] = shotOf(lt, [vic - 0.5]);
  if (shot === 0) {
    camera(540, 920, 1.05);
    popWorld(t, () => { ngMap(MAP, { fill: pat('leaves', 'green', 0.5) }); }, { pattern: 'rings', pal: 'green', burst: false, ground: false, dim: 0.5 });
    calendarCard('15', 'JAN', '1970', 540, 520, clamp(st / 0.3), { top: NG });
    if (lt > sur) tag('BIAFRA SURRENDERED', 540, 1240, clamp((lt - sur) / 0.3), { size: 48 });
  } else {
    camera(540, 900, lerp(1.1, 1.0, easeOut(st / 1.5)));
    popWorld(t, () => {
      ngFlag(540, 1020, 420, 250, t, 1);
      crowd(-40, 1120, 1300, 8, t, 21, { scale: 1.15, mood: 'smile' });
    }, { pattern: 'suns', pal: 'green', cy: 1000, disc: 300 });
    popText('"NO VICTOR,', 540, 360, 96, st, { color: '#fff4dc' });
    popText('NO VANQUISHED"', 540, 480, 96, st - 0.4, { color: '#f2b705' });
    tag('GOWON, 1970', 540, 610, clamp((st - 1.0) / 0.3), { size: 40 });
  }
};
EV.end = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'victor', 0.75) - 0.5, type: 'ding' }];

S.cta = ctaScene('REMEMBER THE PAST', 'NAIJA HISTORY', { pal: 'green' });
