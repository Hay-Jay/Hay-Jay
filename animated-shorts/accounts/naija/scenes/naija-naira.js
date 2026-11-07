// Episode: How the naira got its name
// The naira replaced the Nigerian pound on 1 January 1973 at two naira to the pound; the name is credited to Obafemi Awolowo,
// contracted from "Nigeria"; "kobo" comes from the English word "copper".

// NIGERIA with the letters of NAIRA lit up: N, I, R, A
function nigeriaWord(x, y, size, st, hi = 0) {
  const letters = 'NIGERIA'.split(''), lit = [0, 1, 4, 6];
  ctx.save(); ctx.font = `${size}px ${POP}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const full = ctx.measureText('NIGERIA').width; let xx = x - full / 2;
  letters.forEach((ch, i) => {
    const w = ctx.measureText(ch).width, k = easeBack(clamp((st - i * 0.05) / 0.25)); if (k <= 0) { xx += w; return; }
    const on = lit.includes(i) && hi > 0, lift = on ? -easeOut(hi) * 40 : 0;
    ctx.save(); ctx.translate(xx + w / 2, y + lift); ctx.scale(k * (on ? 1 + 0.15 * hi : 1), k * (on ? 1 + 0.15 * hi : 1));
    ctx.globalAlpha = on || hi === 0 ? 1 : 1 - 0.65 * hi;
    ctx.fillStyle = K; ctx.fillText(ch, -w / 2 + size * 0.06, size * 0.08); ctx.lineWidth = size * 0.16; ctx.strokeStyle = K; ctx.lineJoin = 'round'; ctx.strokeText(ch, -w / 2, 0);
    ctx.fillStyle = on ? '#2fd38a' : '#fff4dc'; ctx.fillText(ch, -w / 2, 0); ctx.restore();
    xx += w;
  });
  ctx.restore();
}

S.hook = ({ t, lt, ln }) => {
  const hid = wl(ln, 'hiding', 0.4), ng = wl(ln, 'nigeria', 0.85);
  camera(540, 900, lerp(1.1, 1.0, easeOut(lt / 2)));
  popWorld(t, () => { ijapa(540, 1200, 0.9, { t, mood: 'wink', armL: 0.6 }); }, { pattern: 'diamonds', pal: 'green', cy: 1040, disc: 300, fronds: true });
  popText('THE NAIRA', 540, 300, 100, lt + 0.2, { color: '#f2b705' });
  nigeriaWord(540, 560, 170, lt - ng + 0.6, clamp((lt - ng - 0.1) / 0.5));
  tag('IS HIDING IN HERE', 540, 720, clamp((lt - hid) / 0.3), { size: 44 });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'nigeria', 0.85) - 0.1, type: 'shimmer' }];

S.swap = ({ t, lt, ln }) => {
  const jan = wl(ln, 'january', 0.2), pd = wl(ln, 'pound', 0.55), na = wlLast(ln, 'naira', 0.95);
  camera(540, 900, lerp(1.0, 1.08, lt / 5));
  impact(t, lt - na + 0.2, 1);
  popWorld(t, () => {
    const out = clamp((lt - na + 0.6) / 0.5);
    money(lerp(540, -300, easeIn2(out)), 980, 1.2, '£', '£1', 'NIGERIAN POUND', '#b8c9a2', clamp((lt - 0.15) / 0.35), -0.06 - out * 0.4 + Math.sin(t * 2) * 0.02 * (1 - out));
    money(lerp(1400, 560, easeOut(clamp((lt - na + 0.2) / 0.45))), 980, 1.25, '₦', '₦1', 'NAIRA', '#2fd38a', 1, 0.05);
  }, { pattern: 'rings', pal: 'green', cy: 980, disc: 320, fronds: true });
  calendarCard('1', 'JAN', '1973', 800, 520, clamp((lt - jan + 0.1) / 0.3), { top: NG });
  popText('NEW MONEY!', 360, 330, 96, lt - na + 0.2, { color: '#f2b705' });
  ankaraWipe(lt, { pal: 'green', pattern: 'rings' });
};
const easeIn2 = u => u * u;
EV.swap = ln => [{ t: 0.15, type: 'pop' }, { t: wl(ln, 'january', 0.2) - 0.1, type: 'pop' }, { t: wlLast(ln, 'naira', 0.95) - 0.2, type: 'ding' }];

S.awo = ({ t, lt, ln }) => {
  const ch = wl(ln, 'chief', 0.4), he = wl(ln, 'he', 0.55), nai = wl(ln, 'nai', 0.85), ra = wlLast(ln, 'ra', 0.95);
  const [shot, st] = shotOf(lt, [he - 0.1]);
  if (shot === 0) {
    camera(520, 940, lerp(1.05, 1.12, st / 3));
    popWorld(t, () => { person('chief', 540, 1290, 1.15, { t, pop: clamp((lt - 0.1) / 0.45), armR: [1.0, 2.0], armL: [0.2, 0.1] }); }, { pattern: 'waves', pal: 'indigo', cy: 820, disc: 320, fronds: true });
    tag('CHIEF OBAFEMI AWOLOWO', 540, 330, clamp((lt - ch) / 0.3), { size: 46 });
    tag('THE NAME IS CREDITED TO', 540, 220, clamp((st - 0.1) / 0.3), { size: 32, bg: '#f2b705' });
    ankaraWipe(st);
  } else {
    camera(540, 900, lerp(1.06, 1.0, easeOut(st / 1)));
    popWorld(t, () => {}, { pattern: 'diamonds', pal: 'green', cy: 800, disc: 0 });
    nigeriaWord(540, 700, 170, st + 1, clamp((st - 0.2) / 0.5));
    const k1 = clamp((lt - nai + 0.1) / 0.3), k2 = clamp((lt - ra + 0.1) / 0.3);
    tag('NAI', 420, 960, k1, { size: 110, bg: '#2fd38a' }); tag('RA', 680, 960, k2, { size: 110, bg: '#2fd38a' });
    ankaraWipe(st, { pal: 'green', pattern: 'diamonds' });
  }
};
EV.awo = ln => [{ t: wl(ln, 'chief', 0.4) - 0.3, type: 'pop' }, { t: wl(ln, 'he', 0.55) - 0.1, type: 'whoosh' }, { t: wl(ln, 'nai', 0.85) - 0.1, type: 'pop' }, { t: wlLast(ln, 'ra', 0.95) - 0.1, type: 'pop' }];

S.kobo = ({ t, lt, ln }) => {
  const ko = wl(ln, 'kobo', 0.15), cop = wlLast(ln, 'copper', 0.95);
  camera(540, 900, lerp(1.1, 1.0, easeOut(lt / 1.5)));
  impact(t, lt - cop + 0.1, 0.8);
  popWorld(t, () => {
    coin(540, 820, 210, 'KOBO', '#c8743a', t, clamp((lt - ko + 0.2) / 0.35));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t * 0.5; coin(540 + Math.cos(a) * 360, 820 + Math.sin(a) * 300, 46, 'k', '#c8743a', t + i, clamp((lt - cop + 0.3 - i * 0.04) / 0.3)); }
  }, { pattern: 'suns', pal: 'sunset', cy: 820, disc: 340 });
  popText('KOBO', 540, 300, 110, lt, { color: '#f2b705' });
  if (lt > cop - 0.3) tag('← FROM "COPPER"', 540, 1240, clamp((lt - cop + 0.3) / 0.3), { size: 56, bg: '#c8743a', ink: '#fff4dc' });
  ankaraWipe(lt, { pal: 'sunset', pattern: 'suns' });
};
EV.kobo = ln => [{ t: wl(ln, 'kobo', 0.15) - 0.2, type: 'ding' }, { t: wlLast(ln, 'copper', 0.95) - 0.1, type: 'stamp' }];

S.rate = ({ t, lt, ln }) => {
  const one = wl(ln, 'one', 0.35), two = wl(ln, 'two', 0.8);
  camera(540, 900, 1.0);
  impact(t, lt - two, 1);
  popWorld(t, () => {
    money(290, 820, 0.78, '£', '£1', 'POUND', '#b8c9a2', clamp((lt - one + 0.2) / 0.3), -0.06);
    money(790, 760, 0.78, '₦', '₦1', 'NAIRA', '#2fd38a', clamp((lt - two + 0.15) / 0.3), 0.05);
    money(820, 900, 0.78, '₦', '₦1', 'NAIRA', '#2fd38a', clamp((lt - two) / 0.3), 0.09);
  }, { pattern: 'leaves', pal: 'green', cy: 840, disc: 0 });
  popText('=', 540, 830, 150, lt - two + 0.3);
  popText('1 POUND = 2 NAIRA', 540, 320, 92, lt - 0.1, { color: '#fff4dc', step: 0.02 });
  ankaraWipe(lt, { pal: 'green', pattern: 'leaves' });
};
EV.rate = ln => [{ t: wl(ln, 'one', 0.35) - 0.2, type: 'pop' }, { t: wl(ln, 'two', 0.8), type: 'ding' }];

S.cta = ctaScene('OLDEST NAIRA NOTE', 'YOU REMEMBER?', { pal: 'green' });
