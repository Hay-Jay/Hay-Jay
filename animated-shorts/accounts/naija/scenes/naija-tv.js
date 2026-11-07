// Episode: Nigeria launched sub-Saharan Africa's first TV station
// Western Nigeria Television (WNTV), Ibadan, on air 31 October 1959; launched by the Western Region government led by
// Obafemi Awolowo; slogan "First in Africa"; about a year before independence (1 October 1960).

S.hook = ({ t, lt, ln }) => {
  const lag = wl(ln, 'lagos', 0.45), it = wlLast(ln, 'it', 0.6), iba = wlLast(ln, 'ibadan', 0.95);
  const [shot, st] = shotOf(lt, [it - 0.1]);
  if (shot === 0) {
    camera(540, 900, lerp(1.15, 1.0, easeOut(st / 2.5)));
    popWorld(t, () => { tvSet(540, 920, 1.1, t, { on: false }); }, { pattern: 'rings', pal: 'teal', cy: 880, disc: 0, fronds: true });
    popText('THE FIRST TV STATION', 540, 300, 84, st, { color: '#fff4dc', step: 0.02 });
    tag('IN SUB-SAHARAN AFRICA', 540, 420, clamp((st - 0.5) / 0.3), { size: 44, bg: '#f2b705' });
    if (lt > lag - 0.1) burstBadge('NOT\nLAGOS', 830, 1200, 130, clamp((lt - lag + 0.1) / 0.3), { size: 46, color: '#d6246e', ink: '#fff4dc' });
  } else {
    camera(470, 960, lerp(1.0, 1.3, easeInOut(st / 1.5)));
    impact(t, lt - iba, 1);
    popWorld(t, () => { ngMap(MAP); cityPin('ibadan', null, clamp(st / 0.3), MAP, { color: '#f2b705' }); cityPin('lagos', null, 0.6, MAP, { color: '#7a7480' }); }, { pattern: 'diamonds', pal: 'teal', burst: false, ground: false });
    popText('IBADAN!', 540, 330, 140, lt - iba + 0.2, { color: '#f2b705' });
    ankaraWipe(st, { pal: 'teal', pattern: 'rings' });
  }
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'lagos', 0.45) - 0.1, type: 'buzz' }, { t: wlLast(ln, 'ibadan', 0.95), type: 'stamp' }];

S.date = ({ t, lt, ln }) => {
  const oc = wl(ln, 'october', 0.15), we = wl(ln, 'western', 0.45), air = wlLast(ln, 'air', 0.95);
  const [shot, st] = shotOf(lt, [we - 0.1]);
  if (shot === 0) {
    camera(540, 900, lerp(1.1, 1.0, easeOut(st / 1.5)));
    popWorld(t, () => { ijapa(540, 1200, 0.85, { t, armR: 0.7 }); }, { pattern: 'suns', pal: 'sunset', cy: 1060, disc: 260, fronds: true });
    calendarCard('31', 'OCT', '1959', 540, 600, clamp((lt - oc + 0.1) / 0.3), { top: '#d6246e' });
  } else {
    camera(lerp(520, 560, st / 3), 900, lerp(1.0, 1.08, st / 3));
    const on = lt > air - 0.35;
    impact(t, lt - air + 0.35, 1);
    popWorld(t, () => {
      mast(860, 1290, 0.95, t, on ? 1 : 0.2);
      tvSet(460, 940, 1.0, t, { on, text: 'WNTV' });
      if (on) glow(410, 900, 420, 'rgba(255,240,180,.35)', clamp((lt - air + 0.35) / 0.4));
    }, { pattern: 'waves', pal: 'indigo', cy: 900, disc: 0 });
    tag('WESTERN NIGERIA TELEVISION', 540, 330, clamp(st / 0.3), { size: 44 });
    if (on) popText('ON AIR!', 540, 460, 120, lt - air + 0.35, { color: '#f2b705' });
    ankaraWipe(st, { pal: 'indigo', pattern: 'waves' });
  }
};
EV.date = ln => [{ t: wl(ln, 'october', 0.15) - 0.1, type: 'pop' }, { t: wl(ln, 'western', 0.45) - 0.1, type: 'whoosh' }, { t: wlLast(ln, 'air', 0.95) - 0.35, type: 'ding' }];

S.who = ({ t, lt, ln }) => {
  const reg = wl(ln, 'region', 0.4), ch = wl(ln, 'chief', 0.7);
  camera(540, 940, lerp(1.05, 1.12, lt / 4));
  popWorld(t, () => {
    mast(900, 1290, 0.75, t, 0.8);
    person('chief', 470, 1290, 1.12, { t, pop: clamp((lt - ch + 0.4) / 0.45), armR: [1.1, 2.2], armL: [0.2, 0.1] });
  }, { pattern: 'waves', pal: 'indigo', cx: 470, cy: 820, disc: 300, fronds: true });
  tag('WESTERN REGION GOVERNMENT', 540, 330, clamp((lt - reg + 0.3) / 0.3), { size: 42, bg: '#2fd38a' });
  tag('CHIEF OBAFEMI AWOLOWO', 540, 450, clamp((lt - ch) / 0.3), { size: 46 });
  ankaraWipe(lt, { pal: 'indigo', pattern: 'diamonds' });
};
EV.who = ln => [{ t: wl(ln, 'chief', 0.7) - 0.3, type: 'pop' }];

S.slogan = ({ t, lt, ln }) => {
  const fi = wl(ln, 'first', 0.6);
  camera(540, 900, lerp(1.15, 1.0, easeOut(lt / 1.2)));
  impact(t, lt - fi, 1.2);
  popWorld(t, () => {
    tvSet(540, 900, 1.15, t, { on: true, text: 'FIRST!' });
    if (lt > fi) for (let i = 0; i < 40; i++) { const a = hash1(i) * Math.PI * 2, d = easeOut(clamp((lt - fi) / 0.8)) * (300 + hash1(i + 3) * 300); ctx.save(); ctx.translate(540 + Math.cos(a) * d, 860 + Math.sin(a) * d); ctx.rotate(t * 5 + i); ctx.fillStyle = ['#f2b705', '#d6246e', '#0aa3a3', '#fff4dc'][i % 4]; ctx.fillRect(-12, -6, 24, 12); ctx.restore(); }
  }, { pattern: 'suns', pal: 'sunset', cy: 880, disc: 0 });
  popText('"FIRST IN AFRICA"', 540, 330, 104, lt - fi + 0.25, { color: '#f2b705', step: 0.03 });
  tag('THE SLOGAN', 540, 450, clamp(lt / 0.3), { size: 40 });
  ankaraWipe(lt, { pal: 'sunset', pattern: 'suns' });
};
EV.slogan = ln => [{ t: wl(ln, 'first', 0.6), type: 'ding' }];

S.before = ({ t, lt, ln }) => {
  const yr = wl(ln, 'year', 0.5), ind = wlLast(ln, 'independence', 0.95);
  camera(540, 900, 1.0);
  popWorld(t, () => {
    const u = clamp((lt - 0.6) / 1.2);
    ctx.save(); ctx.lineWidth = 16; ctx.strokeStyle = K; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(280, 1000); ctx.lineTo(lerp(280, 800, u), 1000); ctx.stroke(); ctx.lineWidth = 8; ctx.strokeStyle = '#f2b705'; ctx.stroke(); ctx.restore();
    if (u >= 1) { ctx.save(); ctx.fillStyle = '#f2b705'; ctx.strokeStyle = K; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(830, 1000); ctx.lineTo(790, 976); ctx.lineTo(790, 1024); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    tvSet(280, 1180, 0.38, t, { on: true });
    ngFlag(820, 1180, 170, 100, t, clamp((lt - ind + 0.3) / 0.3));
  }, { pattern: 'leaves', pal: 'green', cy: 900, disc: 0 });
  calendarCard('31', 'OCT', '1959', 280, 680, clamp(lt / 0.3), { top: '#d6246e', rot: -0.05 });
  calendarCard('1', 'OCT', '1960', 800, 680, clamp((lt - ind + 0.3) / 0.3), { top: NG, rot: 0.05 });
  popText('ALMOST A YEAR EARLY', 540, 320, 84, lt - yr + 0.3, { color: '#fff4dc', step: 0.02 });
  ankaraWipe(lt, { pal: 'green', pattern: 'leaves' });
};
EV.before = ln => [{ t: 0.6, type: 'whoosh' }, { t: wlLast(ln, 'independence', 0.95) - 0.3, type: 'pop' }];

S.cta = ctaScene('FOLLOW FOR MORE', 'NAIJA FIRSTS', { pal: 'teal' });
