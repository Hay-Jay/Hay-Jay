// Episode: Who named Nigeria? (Flora Shaw, The Times, 8 January 1897; Lugard; amalgamation 1914; independence 1 October 1960)

S.hook = ({ t, lt, ln }) => {
  const wr = wl(ln, 'written', 0.45), wasnt = wl(ln, 'wasnt', 0.75);
  const [shot, st] = shotOf(lt, [wr - 0.1]);
  if (shot === 0) {
    camera(540, 900, lerp(1.2, 1.05, easeOut(st / 2)));
    popWorld(t, () => {
      const k = easeBack(clamp((lt + 0.2) / 0.6));
      newspaper(540, 820, 1.05 * k, Math.sin(t * 1.5) * 0.05 + (1 - k) * 3, 'NIGERIA', clamp((lt - 0.7) / 0.3));
    }, { pattern: 'rings', pal: 'sunset', cy: 820 });
    popText('WHO NAMED', 540, 300, 100, lt + 0.2, { color: '#f2b705' });
    popText('NIGERIA?', 540, 410, 120, lt, { color: '#fff4dc' });
  } else {
    camera(540, 960, lerp(1.1, 1.25, easeInOut(st / 2.5)));
    whip(st, 1);
    popWorld(t, () => {
      ijapa(540, 1170, 1.0, { t, mood: lt > wasnt ? 'shock' : 'happy', armL: lt > wasnt ? 0.7 : 0.2 });
      person('flora', 900, 1290, 0.55, { t, hold: 'pen', armR: [0.6, 1.9] });
    }, { pattern: 'diamonds', pal: 'magenta', cy: 1000 });
    popText('A JOURNALIST', 540, 330, 96, st);
    burstBadge('NOT EVEN\nNIGERIAN!', 760, 560, 170, clamp((lt - wasnt) / 0.25), { size: 50, color: '#f2b705' });
  }
};
EV.hook = ln => [{ t: 0.0, type: 'whoosh' }, { t: 0.7, type: 'pop' }, { t: wl(ln, 'written', 0.45) - 0.1, type: 'whoosh' }, { t: wl(ln, 'wasnt', 0.75), type: 'stamp' }];

S.flora = ({ t, lt, ln }) => {
  const fl = wl(ln, 'flora', 0.55), tm = wl(ln, 'times', 0.85);
  camera(lerp(520, 580, easeInOut(lt / 4)), 900, lerp(1.0, 1.1, easeInOut(lt / 4)));
  popWorld(t, () => {
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(560, 1080, 460, 40); ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.strokeRect(560, 1080, 460, 40);
    person('flora', 380, 1290, 1.05, { t, hold: 'pen', armR: [1.1, 2.0 + Math.sin(t * 12) * 0.08], look: 1 });
    newspaper(790, 960, 0.5 * clamp((lt - tm + 0.3) / 0.3) + 0.0001, 0.06, '', 0);
  }, { pattern: 'leaves', pal: 'indigo', cx: 380, cy: 760, disc: 300 });
  burstBadge('1897', 820, 420, 150, clamp((lt - 0.1) / 0.3), { size: 84, color: '#f2b705' });
  tag('FLORA SHAW', 300, 560, clamp((lt - fl) / 0.3), { size: 50 });
  if (lt > tm - 0.2) tag('THE TIMES, LONDON', 760, 1200, clamp((lt - tm + 0.2) / 0.3), { size: 38, bg: '#fff4dc' });
};
EV.flora = ln => [{ t: 0.1, type: 'pop' }, { t: wl(ln, 'flora', 0.55), type: 'pop' }, { t: wl(ln, 'times', 0.85) - 0.2, type: 'quill' }];

S.river = ({ t, lt, ln }) => {
  const rv = wl(ln, 'river', 0.55), ng = wl(ln, 'nigeria', 0.3);
  camera(540, 900, lerp(1.0, 1.08, easeInOut(lt / 4)));
  popWorld(t, () => {
    ngMap(MAP);
    river(NIGER, MAP, clamp((lt - rv + 0.6) / 1.2), 18); river(BENUE, MAP, clamp((lt - rv) / 1.0), 13);
    if (lt > rv) { const [x, y] = mapXY(4.6, 10.4); tag('RIVER NIGER', x - 30, y - 30, clamp((lt - rv) / 0.3), { size: 40, bg: '#2f8cff', ink: '#fff4dc', rot: -0.15 }); }
  }, { pattern: 'waves', pal: 'teal', burst: false, ground: false });
  const k = clamp((lt - ng) / 0.3);
  tag('NIGER', 310, 330, k, { size: 64, bg: '#2f8cff', ink: '#fff4dc' }); popText('+', 540, 330, 90, lt - ng - 0.15); tag('IA', 700, 330, clamp((lt - ng - 0.25) / 0.3), { size: 64 });
  if (lt > ng + 0.7) burstBadge('= NIGERIA', 540, 1250, 200, clamp((lt - ng - 0.7) / 0.3), { size: 64, color: '#0f9d58', ink: '#fff4dc', rot: 0.04 });
};
EV.river = ln => [{ t: wl(ln, 'river', 0.55) - 0.4, type: 'whoosh' }, { t: wl(ln, 'nigeria', 0.3), type: 'pop' }, { t: wl(ln, 'nigeria', 0.3) + 0.7, type: 'ding' }];

S.lugard = ({ t, lt, ln }) => {
  const fr = wl(ln, 'frederick', 0.35), mar = wl(ln, 'married', 0.25), col = wl(ln, 'colonial', 0.6);
  camera(540, 920, lerp(1.05, 1.0, easeOut(lt / 2)));
  whip(lt, -1, 500);
  popWorld(t, () => {
    person('flora', 330, 1290, 1.0, { t, armR: [0.5, 0.3] });
    person('lugard', 760, 1290, 1.0, { t, alpha: clamp((lt - fr + 0.2) / 0.3), armL: [0.4, 0.2] });
    const k = clamp((lt - mar) / 0.3);
    if (k > 0) { ctx.save(); ctx.translate(545, 760); ctx.scale(easeBack(k) * pulse(t, 80), easeBack(k) * pulse(t, 80)); heartShape(0, 0, 90, '#d6246e'); ctx.restore(); }
  }, { pattern: 'suns', pal: 'magenta', cy: 900 });
  burstBadge('1902', 540, 420, 140, clamp((lt - mar) / 0.3), { size: 76, color: '#f2b705' });
  tag('LORD LUGARD', 760, 600, clamp((lt - fr) / 0.3), { size: 46 });
  if (lt > col) tag('COLONIAL OFFICIAL', 760, 1200, clamp((lt - col) / 0.3), { size: 36, bg: '#f26b1d' });
};
function heartShape(x, y, s, c) { ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32); ctx.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; ctx.lineTo(16 * Math.pow(Math.sin(a), 3), -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))); } ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = K; ctx.stroke(); ctx.restore(); }
EV.lugard = ln => [{ t: 0.0, type: 'whoosh' }, { t: wl(ln, 'married', 0.25), type: 'ding' }];

S.amalg = ({ t, lt, ln }) => {
  const j = wl(ln, 'joined', 0.3), st = wl(ln, 'stuck', 0.9);
  const sep = 160 * (1 - easeOut((lt - j - 0.2) / 0.9));
  camera(540, 900, 1.0);
  shake(t, lt > j + 1.0 && lt < j + 1.4 ? 14 : 0);
  popWorld(t, () => {
    const [, cutY] = mapXY(0, 8.0);
    for (const [top, dy, fill, label] of [[true, -sep, pat('leaves', 'green', 0.5), 'NORTH'], [false, sep, pat('rings', 'sunset', 0.45), 'SOUTH']]) {
      ctx.save(); ctx.beginPath(); top ? ctx.rect(-400, -400, 2000, cutY + 400) : ctx.rect(-400, cutY, 2000, 2000); ctx.clip(); ctx.translate(0, dy); ngMap(MAP, { fill }); ctx.restore();
      if (sep > 30) tag(label, 540, (top ? cutY - 170 : cutY + 120) + dy, 1, { size: 56, bg: top ? '#0f9d58' : '#f26b1d', ink: '#fff4dc' });
    }
  }, { pattern: 'diamonds', pal: 'indigo', burst: false, ground: false });
  burstBadge('1914', 540, 340, 150, clamp((lt) / 0.3), { size: 84, color: '#f2b705' });
  if (lt > st) tag('ONE COUNTRY: NIGERIA', 540, 1240, clamp((lt - st) / 0.3), { size: 52, bg: '#0f9d58', ink: '#fff4dc' });
};
EV.amalg = ln => [{ t: 0.05, type: 'pop' }, { t: wl(ln, 'joined', 0.3) + 1.0, type: 'bonk' }, { t: wl(ln, 'stuck', 0.9), type: 'ding' }];

S.indep = ({ t, lt, ln }) => {
  const oc = wl(ln, 'october', 0.2), ind = wl(ln, 'independent', 0.6);
  const rise = easeInOut(clamp((lt - 0.3) / 2.2));
  camera(540, lerp(980, 880, rise), lerp(1.1, 1.0, rise));
  popWorld(t, () => {
    ctx.lineWidth = 16; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(320, 1290); ctx.lineTo(320, 420); ctx.stroke(); ctx.lineWidth = 8; ctx.strokeStyle = '#d9d9e0'; ctx.stroke();
    ngFlag(470, lerp(1150, 520, rise), 290, 170, t, 1);
    crowd(-40, 1120, 1300, 9, t, 7, { cheer: lt > ind - 0.2, scale: 1.25 });
    if (lt > ind) for (let i = 0; i < 40; i++) { const x = hash1(i) * 1080, y = ((lt - ind) * (300 + hash1(i + 1) * 300) + hash1(i + 2) * 600) % 1500 - 100; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 4 + i); ctx.fillStyle = i % 3 ? NG : '#ffffff'; ctx.fillRect(-12, -6, 24, 12); ctx.restore(); }
  }, { pattern: 'suns', pal: 'green', cy: 700, disc: 260 });
  calendarCard('1', 'OCT', '1960', 820, 560, clamp((lt - oc + 0.1) / 0.3), { top: NG });
  popText('INDEPENDENCE!', 540, 320, 100, lt - ind + 0.2, { color: '#fff4dc' });
};
EV.indep = ln => [{ t: wl(ln, 'october', 0.2) - 0.1, type: 'pop' }, { t: wl(ln, 'independent', 0.6) - 0.2, type: 'ding' }];

S.cta = ctaScene('WOULD YOU RENAME', 'NIGERIA?');
