// Episode: Queen Amina of Zazzau (history or legend?)
// Zazzau, the Hausa kingdom centred on today's Zaria; tradition credits Amina with leading campaigns and with the earthen town walls
// called ganuwar Amina; the Kano Chronicle (written down in the 19th century from older tradition) says she conquered towns
// as far as Nupe and Kwararafa; her dates are debated (often placed in the 1500s); a statue of her stands in Lagos.

function riderAmina(x, y, s, t, o = {}) {
  popHorse(x, y, s, t, { gallop: o.gallop ?? 0.8 });
  ctx.save(); ctx.beginPath(); ctx.rect(x - 400 * s, y - 1200 * s, 800 * s, 1200 * s - 300 * s); ctx.clip();
  person('amina', x - 10 * s, y - 120 * s, 0.85 * s, { t, hold: 'spear', armR: [1.7, 2.3], armL: [0.6, 0.4], propAng: 0.25 });
  ctx.restore();
}
const NUPE = [5.9, 9.1], KWARARAFA = [9.8, 7.9];

S.hook = ({ t, lt, ln }) => {
  const real = wl(ln, 'real', 0.95);
  camera(540, 960, lerp(1.15, 1.0, easeOut(lt / 3)));
  popWorld(t, () => { riderAmina(540, 1290, 1.25, t); }, { pattern: 'suns', pal: 'magenta', cy: 860, disc: 340 });
  popText('QUEEN AMINA', 540, 320, 112, lt + 0.2, { color: '#f2b705' });
  tag('WARRIOR QUEEN OF ZAZZAU', 540, 440, clamp((lt - 0.6) / 0.3), { size: 44 });
  if (lt > real - 0.3) burstBadge('REAL?', 820, 700, 140, clamp((lt - real + 0.3) / 0.3), { size: 66, color: '#d6246e', ink: '#fff4dc' });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'real', 0.95) - 0.3, type: 'stamp' }];

S.zazzau = ({ t, lt, ln }) => {
  const za = wl(ln, 'zaria', 0.5);
  camera(lerp(540, 600, easeInOut(lt / 3.5)), lerp(900, 760, easeInOut(lt / 3.5)), lerp(1.0, 1.3, easeInOut(lt / 3.5)));
  whip(lt, 1);
  popWorld(t, () => {
    ngMap(MAP);
    cityPin('zaria', 'ZARIA', clamp((lt - za + 0.2) / 0.3), MAP, { color: '#d6246e', dy: -110 });
  }, { pattern: 'rings', pal: 'magenta', burst: false, ground: false });
  tag('ZAZZAU: A HAUSA KINGDOM', 540, 330, clamp(lt / 0.3), { size: 46 });
};
EV.zazzau = ln => [{ t: 0.0, type: 'whoosh' }, { t: wl(ln, 'zaria', 0.5) - 0.2, type: 'pop' }];

S.battle = ({ t, lt, ln }) => {
  const led = wl(ln, 'led', 0.35), grew = wl(ln, 'grew', 0.75);
  const [shot, st] = shotOf(lt, [grew - 0.25]);
  if (shot === 0) {
    camera(lerp(420, 640, easeInOut(st / 3)), 960, 1.05);
    popWorld(t, () => {
      for (let i = 0; i < 5; i++) person('man', 760 + i * 150, 1290, 0.75, { t: t + i, walk: 1, hold: 'spear', armR: [0.4, 0.1], style: { pattern: ['waves', 'diamonds', 'leaves', 'rings', 'suns'][i], pal: ['indigo', 'sunset', 'teal', 'green', 'magenta'][i] } });
      riderAmina(420, 1290, 1.0, t, { gallop: 1 });
    }, { pattern: 'diamonds', pal: 'sunset', burst: false });
    tag('TRADITION SAYS', 540, 330, clamp(st / 0.3), { size: 52 });
    if (lt > led) popText('SHE LED THE ARMY', 540, 450, 84, lt - led, { color: '#f2b705' });
  } else {
    camera(540, 900, 1.0);
    whip(st, -1);
    popWorld(t, () => {
      ngMap(MAP);
      const [x, y] = mapXY(...CITIES.zaria), r = 60 + easeOut(clamp(st / 1.2)) * 260;
      ctx.save(); ctx.globalAlpha = 0.55; circle(x, y, r, '#d6246e'); ctx.restore(); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      cityPin('zaria', null, 1, MAP, { color: '#f2b705' });
    }, { pattern: 'rings', pal: 'magenta', burst: false, ground: false });
    tag('THE KINGDOM GREW', 540, 330, clamp(st / 0.3), { size: 56 });
  }
};
EV.battle = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'grew', 0.75) - 0.25, type: 'whoosh' }];

S.walls = ({ t, lt, ln }) => {
  const gan = wl(ln, 'ganuwar', 0.6), am = wlLast(ln, 'aminas', 0.95);
  camera(lerp(500, 580, easeInOut(lt / 4)), 960, lerp(1.0, 1.12, easeInOut(lt / 4)));
  popWorld(t, () => {
    for (let i = 0; i < 5; i++) { const x = 140 + i * 210, h = 120 + (i % 2) * 60; ctx.fillStyle = '#c97a3e'; ctx.fillRect(x - 70, 1080 - h, 140, h); ctx.lineWidth = 8; ctx.strokeStyle = K; ctx.strokeRect(x - 70, 1080 - h, 140, h); ctx.beginPath(); ctx.moveTo(x - 80, 1080 - h); ctx.lineTo(x, 1080 - h - 70); ctx.lineTo(x + 80, 1080 - h); ctx.closePath(); ctx.fillStyle = '#8a5a2a'; ctx.fill(); ctx.stroke(); }
    earthWall(-300, 1400, 1290, 300, t);
  }, { pattern: 'leaves', pal: 'sunset', burst: false });
  tag('HAUSA TOWN WALLS', 540, 330, clamp(lt / 0.3), { size: 50 });
  if (lt > gan - 0.2) popText('GANUWAR AMINA', 540, 460, 96, lt - gan + 0.2, { color: '#f2b705' });
  if (lt > am - 0.4) tag("= AMINA'S WALLS", 540, 1240, clamp((lt - am + 0.4) / 0.3), { size: 50, bg: '#d6246e', ink: '#fff4dc' });
};
EV.walls = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'ganuwar', 0.6) - 0.2, type: 'pop' }, { t: wlLast(ln, 'aminas', 0.95) - 0.4, type: 'ding' }];

S.chronicle = ({ t, lt, ln }) => {
  const cen = wl(ln, 'centuries', 0.45), says = wl(ln, 'says', 0.55), nu = wl(ln, 'nupe', 0.8), kw = wl(ln, 'kwararafa', 0.95);
  const [shot, st] = shotOf(lt, [says - 0.15]);
  if (shot === 0) {
    camera(540, 900, lerp(1.0, 1.08, easeInOut(st / 3.5)));
    popWorld(t, () => {
      panel(540, 820, 520, 640, clamp(st / 0.35), (w, h) => {
        ctx.fillStyle = '#f6ead0'; ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = K; ctx.font = `54px ${POP}`; ctx.textAlign = 'center'; ctx.fillText('KANO', 0, -180); ctx.fillText('CHRONICLE', 0, -120);
        ctx.strokeStyle = 'rgba(23,17,28,.4)'; ctx.lineWidth = 6; for (let r = 0; r < 8; r++) { ctx.beginPath(); ctx.moveTo(-190, -40 + r * 40); ctx.lineTo(190 - (r % 3) * 50, -40 + r * 40); ctx.stroke(); }
      }, { rot: -0.03 });
    }, { pattern: 'diamonds', pal: 'indigo', cy: 820 });
    tag('THE OLDEST WRITTEN ACCOUNT', 540, 330, clamp(st / 0.3), { size: 42 });
    if (lt > cen - 0.2) burstBadge('WRITTEN\nCENTURIES\nLATER', 820, 1180, 170, clamp((lt - cen + 0.2) / 0.3), { size: 34, color: '#f2b705' });
  } else {
    camera(540, 900, lerp(1.0, 1.05, st / 3));
    whip(st, 1);
    popWorld(t, () => {
      ngMap(MAP);
      cityPin('zaria', 'ZARIA', 1, MAP, { color: '#d6246e', dy: -110, size: 34 });
      for (const [pt, at, label, dx] of [[NUPE, nu, 'NUPE', -40], [KWARARAFA, kw, 'KWARARAFA', 30]]) {
        const u = clamp((lt - at + 0.6) / 0.6); if (u <= 0) continue;
        const [x0, y0] = mapXY(...CITIES.zaria), [x1, y1] = mapXY(...pt), x = lerp(x0, x1, u), y = lerp(y0, y1, u);
        ctx.save(); ctx.lineWidth = 12; ctx.strokeStyle = '#f2b705'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0 - 40); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
        if (u >= 1) tag(label, x1 + dx, y1 + 60, clamp((lt - at) / 0.3), { size: 38, bg: '#f2b705' });
      }
    }, { pattern: 'rings', pal: 'magenta', burst: false, ground: false });
    tag('THE CHRONICLE SAYS', 540, 330, clamp(st / 0.3), { size: 46 });
  }
};
EV.chronicle = ln => [{ t: 0.05, type: 'quill' }, { t: wl(ln, 'says', 0.55) - 0.15, type: 'whoosh' }, { t: wl(ln, 'nupe', 0.8) - 0.6, type: 'whoosh' }, { t: wl(ln, 'kwararafa', 0.95) - 0.6, type: 'whoosh' }];

S.debate = ({ t, lt, ln }) => {
  const but = wl(ln, 'but', 0.45), stat = wl(ln, 'statue', 0.8);
  const [shot, st] = shotOf(lt, [but - 0.1]);
  if (shot === 0) {
    camera(540, 940, lerp(1.0, 1.1, easeInOut(st / 3)));
    popWorld(t, () => {
      person('amina', 540, 1290, 1.1, { t, armL: [0.3, 0.2], armR: [0.3, 0.2], mood: 'flat' });
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + t * 0.6; popText('?', 540 + Math.cos(a) * 300, 760 + Math.sin(a) * 260, 110, 1, { color: ['#f2b705', '#d6246e', '#0aa3a3'][i % 3] }); }
    }, { pattern: 'diamonds', pal: 'dusk', cy: 860 });
    tag('DATES? DETAILS?', 540, 330, clamp(st / 0.3), { size: 60 });
  } else {
    camera(540, lerp(1000, 900, easeOut(st / 2)), lerp(1.15, 1.0, easeOut(st / 2)));
    whip(st, 1);
    popWorld(t, () => {
      ctx.fillStyle = '#9a8a74'; ctx.fillRect(360, 1100, 360, 190); ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.strokeRect(360, 1100, 360, 190);
      ctx.save(); ctx.filter = 'sepia(1) saturate(2.2) hue-rotate(-12deg) brightness(.85)'; riderAmina(540, 1100, 0.9, 0, { gallop: 0 }); ctx.restore();
    }, { pattern: 'suns', pal: 'magenta', cy: 820, disc: 330 });
    popText('THE LEGEND LIVES ON', 540, 330, 84, st, { color: '#f2b705', step: 0.02 });
    if (lt > stat - 0.2) tag('STATUE, LAGOS', 540, 1240, clamp((lt - stat + 0.2) / 0.3), { size: 50 });
  }
};
EV.debate = ln => [{ t: 0.05, type: 'hush' }, { t: wl(ln, 'but', 0.45) - 0.1, type: 'whoosh' }, { t: wl(ln, 'statue', 0.8) - 0.2, type: 'ding' }];
