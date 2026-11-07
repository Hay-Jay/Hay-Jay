// Episode: The rock on the 100 naira note (Zuma Rock, Niger State, about 300 m above the land around it,
// "Gateway to Abuja", with streaks some see as a face). It appears on the ₦100 note.

function note100(x, y, s, t, k = 1, rot = 0) {
  if (k <= 0) return;
  const e = easeBack(k);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * e, s * e); ctx.strokeStyle = K; ctx.lineJoin = 'round';
  ctx.fillStyle = K; ctx.fillRect(-260 + 14, -140 + 16, 520, 280);
  ctx.fillStyle = '#c9a0d6'; ctx.fillRect(-260, -140, 520, 280); ctx.lineWidth = 10; ctx.strokeRect(-260, -140, 520, 280);
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = pat('rings', 'magenta', 0.3); ctx.fillRect(-244, -124, 488, 248); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeRect(-244, -124, 488, 248);
  circle(-168, -14, 62, 'rgba(255,244,220,.85)'); ctx.beginPath(); ctx.arc(-168, -14, 62, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = K; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold 80px "DejaVu Sans", sans-serif`; ctx.fillText('₦', -168, -8);
  ctx.font = `44px ${POP}`; ctx.fillText('100', -168, 84);
  // the picture window: Zuma Rock under a sky
  ctx.save(); ctx.beginPath(); ctx.rect(-80, -104, 300, 160); const sky = ctx.createLinearGradient(0, -104, 0, 56); sky.addColorStop(0, '#ffe2a8'); sky.addColorStop(1, '#f2a65a'); ctx.fillStyle = sky; ctx.fill(); ctx.clip();
  circle(150, -64, 22, '#fff4dc'); zumaRock(70, 56, 0.24, t, { face: 0 }); ctx.restore();
  ctx.lineWidth = 6; ctx.strokeRect(-80, -104, 300, 160);
  ctx.font = `30px ${POP}`; ctx.fillStyle = K; ctx.fillText('ONE HUNDRED NAIRA', 70, 94);
  ctx.restore();
}

S.hook = ({ t, lt, ln }) => {
  const and = wl(ln, 'and', 0.5), face = wlLast(ln, 'face', 0.85);
  const [shot, st] = shotOf(lt, [and - 0.1]);
  if (shot === 0) {
    camera(540, 900, lerp(1.15, 1.0, easeOut(st / 2)));
    popWorld(t, () => { note100(540, 860, 1.5, t, clamp((st + 0.2) / 0.45), -0.05); }, { pattern: 'diamonds', pal: 'magenta', cy: 860, disc: 0, fronds: true });
    popText('A GIANT ROCK', 540, 320, 108, st, { color: '#fff4dc' });
    tag('ON THE ₦100 NOTE', 540, 450, clamp((st - 0.5) / 0.3), { size: 48 });
  } else {
    camera(540, lerp(980, 900, easeOut(st / 2)), lerp(1.0, 1.12, easeInOut(st / 2)));
    impact(t, lt - face, 1);
    popWorld(t, () => { zumaRock(540, 1290, 0.95, t, { face: clamp((lt - face + 0.3) / 0.6) * 0.55 }); }, { pattern: 'suns', pal: 'sunset', cy: 760, disc: 0, ground: true, groundColor: '#c9a27a' });
    if (lt > face - 0.2) burstBadge('A FACE?!', 840, 520, 130, clamp((lt - face + 0.2) / 0.3), { size: 46, color: '#f2b705' });
    ankaraWipe(st, { pal: 'sunset', pattern: 'suns' });
  }
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'and', 0.5) - 0.1, type: 'whoosh' }, { t: wlLast(ln, 'face', 0.85), type: 'stamp' }];

S.where = ({ t, lt, ln }) => {
  const zu = wl(ln, 'zuma', 0.2), ns = wl(ln, 'state', 0.5), ab = wlLast(ln, 'abuja', 0.95);
  camera(lerp(560, 600, easeInOut(lt / 3)), lerp(900, 840, easeInOut(lt / 3)), lerp(1.0, 1.35, easeInOut(lt / 2.5)));
  popWorld(t, () => {
    ngMap(MAP);
    cityPin('zuma', 'ZUMA ROCK', clamp((lt - zu + 0.2) / 0.3), MAP, { color: '#8a6a52', dx: -150, dy: -60, size: 30 });
    cityPin('abuja', 'ABUJA', clamp((lt - ab + 0.3) / 0.3), MAP, { color: '#0f9d58', dx: 120, dy: 40, size: 30 });
  }, { pattern: 'rings', pal: 'teal', burst: false, ground: false });
  tag('NIGER STATE', 540, 330, clamp((lt - ns + 0.2) / 0.3), { size: 52 });
  ankaraWipe(lt, { pal: 'teal', pattern: 'rings' });
};
EV.where = ln => [{ t: wl(ln, 'zuma', 0.2) - 0.2, type: 'pop' }, { t: wlLast(ln, 'abuja', 0.95) - 0.3, type: 'pop' }];

S.size = ({ t, lt, ln }) => {
  const hun = wl(ln, 'hundred', 0.4);
  camera(560, 960, lerp(1.08, 1.0, easeOut(lt / 2)));
  popWorld(t, () => {
    zumaRock(520, 1290, 0.95, t, { face: 0 });
    const u = easeOut(clamp((lt - 0.3) / 1.4)), top = lerp(1290, 720, u);
    ctx.save(); ctx.strokeStyle = K; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1000, 1290); ctx.lineTo(1000, top); ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#f2b705'; ctx.stroke();
    ctx.fillStyle = '#f2b705'; ctx.strokeStyle = K; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1000, top - 30); ctx.lineTo(976, top + 6); ctx.lineTo(1024, top + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    person('man', 120, 1290, 0.16, { t, shadow: false });
    car(200, 1290, 0.12, t, { color: '#d6246e' });
  }, { pattern: 'waves', pal: 'sunset', cy: 800, disc: 0, groundColor: '#c9a27a' });
  popText(`≈ ${countUp(300, lt - 0.3, 1.3)} M`, 540, 320, 140, lt, { color: '#f2b705' });
  tag('ABOVE THE LAND AROUND IT', 540, 460, clamp((lt - hun) / 0.3), { size: 44 });
  tag('↓ A PERSON', 160, 1180, clamp((lt - 1.6) / 0.3), { size: 30, bg: '#fff4dc' });
  ankaraWipe(lt, { pal: 'sunset', pattern: 'waves' });
};
EV.size = ln => [{ t: 0.3, type: 'whoosh' }, { t: 1.6, type: 'ding' }];

S.gateway = ({ t, lt, ln }) => {
  const gw = wl(ln, 'gateway', 0.5);
  const u = easeInOut(clamp(lt / 1.9));
  camera(lerp(420, 640, u), 980, 1.0);
  popWorld(t, () => {
    zumaRock(900, 1290, 0.7, t, { face: 0 });
    road(1290, t, { speed: 300 });
    car(lerp(-100, 700, u), 1395, 0.8, t, { color: '#0f9d58' });
    roadSign(340, 1050, 0.9, 'ABUJA →', clamp((lt - 0.2) / 0.3));
  }, { pattern: 'leaves', pal: 'green', burst: false, ground: false });
  popText('GATEWAY TO ABUJA', 540, 330, 92, lt - gw + 0.3, { color: '#2fd38a', step: 0.02 });
  ankaraWipe(lt, { pal: 'green', pattern: 'leaves' });
};
EV.gateway = ln => [{ t: 0.1, type: 'whoosh' }, { t: wl(ln, 'gateway', 0.5) - 0.3, type: 'ding' }];

S.face = ({ t, lt, ln }) => {
  const look = wl(ln, 'look', 0.2), face = wlLast(ln, 'face', 0.95);
  camera(540, lerp(1000, 920, easeInOut(lt / 3)), lerp(1.0, 1.55, easeInOut(lt / 3)));
  popWorld(t, () => {
    zumaRock(540, 1290, 0.95, t, { face: clamp((lt - look) / 2.2) });
    if (lt > face - 0.2) { const k = clamp((lt - face + 0.2) / 0.4); for (const ex of [-110, 120]) glow(540 + ex * 0.95, 1290 - 330 * 0.95, 70, 'rgba(255,240,180,.7)', k); }
  }, { pattern: 'suns', pal: 'dusk', cy: 760, disc: 0, groundColor: '#c9a27a' });
  popText('LOOK CLOSELY...', 540, 320, 96, lt - look + 0.2, { color: '#fff4dc' });
  if (lt > face - 0.2) burstBadge('SEE IT?', 850, 600, 130, clamp((lt - face + 0.2) / 0.3), { size: 50, color: '#f2b705' });
  ankaraWipe(lt, { pal: 'dusk', pattern: 'suns' });
};
EV.face = ln => [{ t: wl(ln, 'look', 0.2), type: 'hush' }, { t: wlLast(ln, 'face', 0.95) - 0.2, type: 'stamp' }];

S.cta = ctaScene('HAVE YOU SEEN IT', 'IN PERSON?', { pal: 'sunset' });
