// Episode: Why Lagos is also called Eko
// Portuguese sailors (15th century) named it Lagos, 'lakes', for its lagoons; Eko is older and is widely linked to a Benin Kingdom
// war camp (said to mean 'war camp' in Edo); the state slogan is "Centre of Excellence"; "Eko o ni baje" = "Lagos will not spoil".

S.hook = ({ t, lt, ln }) => {
  const two = wl(ln, 'two', 0.3), both = wl(ln, 'both', 0.55), some = wl(ln, 'somewhere', 0.8);
  camera(540, 940, lerp(1.12, 1.0, easeOut(lt / 2.5)));
  impact(t, lt - two, 0.8);
  popWorld(t, () => {
    skyline(-300, 1400, 1290, t, 31, { min: 200, max: 520 });
    ijapa(540, 1180, 0.95, { t, armL: lt > some ? 0.9 : 0.2, armR: lt > some ? 0.9 : 0.3, mood: lt > some ? 'shock' : 'happy' });
  }, { pattern: 'rings', pal: 'sunset', cy: 900, disc: 300, fronds: true });
  popText('LAGOS', 540, 290, 130, lt + 0.2, { color: '#f26b1d' });
  popText('EKO', 540, 420, 130, lt - both + 0.2, { color: '#2fd38a' });
  burstBadge('2 NAMES?', 830, 600, 130, clamp((lt - two) / 0.3), { size: 46, color: '#f2b705' });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'two', 0.3), type: 'stamp' }, { t: wl(ln, 'both', 0.55) - 0.2, type: 'pop' }];

S.portuguese = ({ t, lt, ln }) => {
  const port = wl(ln, 'portuguese', 0.3), named = wl(ln, 'named', 0.5), lakes = wl(ln, 'lakes', 0.75);
  const [shot, st] = shotOf(lt, [named - 0.15]);
  if (shot === 0) {
    const u = easeInOut(clamp(st / (named - 0.15)));
    camera(lerp(380, 620, u), 980, 1.05);
    popWorld(t, () => {
      sea(1150, t);
      caravel(lerp(-150, 640, u), 1170, 1.15, t);
      ctx.fillStyle = '#e9c27a'; ctx.beginPath(); ctx.moveTo(900, 1290); ctx.quadraticCurveTo(1100, 1100, 1700, 1080); ctx.lineTo(1700, 1400); ctx.lineTo(900, 1400); ctx.closePath(); ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.stroke();
      frond(1200, 1180, 0.8, -0.2, t);
    }, { pattern: 'waves', pal: 'teal', burst: false, ground: false, cx: 540 });
    burstBadge('1400s', 820, 430, 140, clamp(st / 0.3), { size: 70, color: '#f2b705' });
    tag('PORTUGUESE SAILORS', 450, 330, clamp((lt - port + 0.1) / 0.3), { size: 48 });
  } else {
    camera(560, 860, lerp(1.0, 1.15, easeInOut(st / 3)));
    popWorld(t, () => { lagoonMap(t, 1); cityPin('lagos', null, 1, { x: 560, y: 860, s: 1 }); }, { pattern: 'waves', pal: 'indigo', burst: false, ground: false, floaters: false });
    popText('LAGOS', 540, 320, 120, st, { color: '#fff4dc' });
    if (lt > lakes - 0.2) popText('= "LAKES"', 540, 440, 104, lt - lakes + 0.2, { color: '#2f8cff' });
    tag('PORTUGUESE FOR LAKES, AFTER ITS LAGOONS', 540, 1250, clamp((lt - lakes) / 0.3), { size: 34 });
    ankaraWipe(st, { pal: 'teal', pattern: 'waves' });
  }
};
EV.portuguese = ln => [{ t: 0.05, type: 'whoosh' }, { t: wl(ln, 'named', 0.5) - 0.15, type: 'whoosh' }, { t: wl(ln, 'lakes', 0.75) - 0.2, type: 'ding' }];

S.older = ({ t, lt, ln }) => {
  const eko = wlLast(ln, 'eko', 0.9);
  camera(540, 960, lerp(1.2, 1.05, easeOut(lt / 1.5)));
  impact(t, lt - eko, 1);
  popWorld(t, () => { ijapa(540, 1180, 1.05, { t, armR: 0.8, mood: 'wink' }); }, { pattern: 'suns', pal: 'green', cy: 1000, fronds: true });
  popText('AN OLDER NAME', 540, 300, 90, lt);
  popText('EKO', 540, 470, 210, lt - eko + 0.15, { color: '#2fd38a', step: 0.08 });
  ankaraWipe(lt, { pal: 'green', pattern: 'suns' });
};
EV.older = ln => [{ t: wlLast(ln, 'eko', 0.9), type: 'stamp' }];

S.benin = ({ t, lt, ln }) => {
  const bk = wl(ln, 'kingdom', 0.35), sol = wl(ln, 'soldiers', 0.45), lang = wl(ln, 'language', 0.75), mean = wl(ln, 'mean', 0.9);
  const [shot, st] = shotOf(lt, [sol - 0.1, lang - 0.2]);
  if (shot === 0) {
    camera(470, 980, lerp(1.0, 1.25, easeInOut(st / 2)));
    popWorld(t, () => {
      ngMap(MAP);
      cityPin('benin', 'BENIN', clamp((lt - bk + 0.3) / 0.3), MAP, { color: '#d6246e', dx: 40, dy: 80, size: 34 });
      cityPin('lagos', 'EKO', 1, MAP, { color: '#f26b1d', dx: -10, dy: -110, size: 34 });
      const u = clamp((lt - bk) / 0.8), [x0, y0] = mapXY(...CITIES.benin), [x1, y1] = mapXY(...CITIES.lagos);
      if (u > 0) { ctx.save(); ctx.setLineDash([18, 12]); ctx.lineWidth = 10; ctx.strokeStyle = '#fff4dc'; ctx.beginPath(); ctx.moveTo(x0, y0 - 40); ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 160, lerp(x0, x1, u), lerp(y0, y1, u) - 40); ctx.stroke(); ctx.restore(); }
    }, { pattern: 'diamonds', pal: 'magenta', burst: false, ground: false });
    tag('THE BENIN KINGDOM', 540, 330, clamp((lt - bk + 0.2) / 0.3), { size: 52 });
  } else if (shot === 1) {
    camera(lerp(500, 580, easeInOut(st / 2.5)), 940, lerp(1.05, 1.12, easeInOut(st / 2.5)));
    popWorld(t, () => {
      warCamp(560, 1290, 1.35, t);
      person('warrior', 150, 1290, 0.85, { t, hold: 'spear', armR: [0.5, 0.1], propAng: 0.05, pop: clamp(st / 0.4) });
      person('warrior', 940, 1290, 0.85, { t, f: -1, hold: 'spear', armR: [0.5, 0.1], propAng: 0.05, pop: clamp((st - 0.15) / 0.4), style: { pal: 'indigo' } });
    }, { pattern: 'suns', pal: 'dusk', cy: 900, disc: 0, fronds: true, tint: 'rgba(40,20,80,.12)' });
    tag('A WAR CAMP', 540, 330, clamp(st / 0.3), { size: 60 });
    ankaraWipe(st, { pal: 'dusk', pattern: 'diamonds' });
  } else {
    camera(540, 900, lerp(1.08, 1.0, easeOut(st / 1.5)));
    popWorld(t, () => {
      panel(540, 840, 820, 480, clamp(st / 0.35), (w, h) => {
        ctx.fillStyle = pat('diamonds', 'magenta', 0.5); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.fillStyle = 'rgba(255,244,220,.88)'; ctx.fillRect(-w / 2 + 30, -h / 2 + 30, w - 60, h - 60);
        ctx.fillStyle = K; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `150px ${POP}`; ctx.fillText('EKO', 0, -50);
        ctx.font = `64px ${POP}`; ctx.fillStyle = '#d6246e'; if (lt > mean - 0.4) ctx.fillText('= "WAR CAMP"', 0, 100);
      });
    }, { pattern: 'rings', pal: 'magenta', burst: false, ground: false });
    tag('IN THE EDO (BENIN) LANGUAGE', 540, 330, clamp(st / 0.3), { size: 44 });
    tag('SO IT IS SAID', 540, 1240, clamp((st - 0.6) / 0.3), { size: 40, bg: '#f2b705' });
    ankaraWipe(st, { pal: 'magenta', pattern: 'rings' });
  }
};
EV.benin = ln => [{ t: wl(ln, 'kingdom', 0.35) - 0.2, type: 'pop' }, { t: wl(ln, 'soldiers', 0.45) - 0.1, type: 'boom' }, { t: wl(ln, 'language', 0.75) - 0.2, type: 'whoosh' }, { t: wl(ln, 'mean', 0.9) - 0.4, type: 'ding' }];

S.today = ({ t, lt, ln }) => {
  const cen = wl(ln, 'centre', 0.3), but = wl(ln, 'but', 0.45), sp = wlLast(ln, 'spoil', 0.95);
  const [shot, st] = shotOf(lt, [but - 0.1]);
  if (shot === 0) {
    camera(540, 980, lerp(1.0, 1.08, st / 3));
    impact(t, lt - cen, 0.8);
    popWorld(t, () => {
      skyline(-300, 1400, 1290, t, 44, { min: 240, max: 600 });
      road(1290, t, { speed: 260 });
      for (let i = 0; i < 4; i++) car(((t * 260 + i * 400) % 1700) - 300, 1500, 0.55, t, { color: ['#f2b705', '#d6246e', '#0aa3a3', '#f26b1d'][i] });
    }, { pattern: 'diamonds', pal: 'sunset', burst: false, ground: false });
    numberPlate(540, 600, 1.15, clamp((lt - cen + 0.1) / 0.3));
    popText('TODAY', 540, 320, 110, st, { color: '#fff4dc' });
  } else {
    camera(540, 940, lerp(1.12, 1.0, easeOut(st / 1.5)));
    popWorld(t, () => {
      crowd(-60, 1140, 1300, 9, t, 52, { cheer: true, scale: 1.3 });
      for (let i = 0; i < 46; i++) { const x = hash1(i) * 1080, y = (st * (260 + hash1(i + 1) * 320) + hash1(i + 2) * 700) % 1500 - 120; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 4 + i); ctx.fillStyle = ['#f2b705', '#d6246e', '#0aa3a3', '#fff4dc'][i % 4]; ctx.fillRect(-12, -6, 24, 12); ctx.restore(); }
    }, { pattern: 'suns', pal: 'sunset', cy: 900, disc: 0 });
    popText('EKO O NI BAJE!', 540, 330, 110, st - 0.2, { color: '#f2b705', step: 0.04 });
    if (lt > sp - 0.6) tag('"LAGOS WILL NOT SPOIL!"', 540, 470, clamp((lt - sp + 0.6) / 0.3), { size: 50 });
    ankaraWipe(st, { pal: 'sunset', pattern: 'suns' });
  }
};
EV.today = ln => [{ t: wl(ln, 'centre', 0.3), type: 'stamp' }, { t: wl(ln, 'but', 0.45) - 0.1, type: 'whoosh' }, { t: wl(ln, 'but', 0.45) + 0.4, type: 'ding' }];

S.cta = ctaScene('LAGOS OR EKO?', 'TELL ME BELOW', { pal: 'sunset' });
