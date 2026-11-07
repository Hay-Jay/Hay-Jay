// Episode: What Nigeria's coat of arms means
// Black shield: fertile soil. White Y: the Niger and Benue rivers meeting (at Lokoja). Red eagle: strength.
// Two white horses: dignity. Motto: "Unity and Faith, Peace and Progress".

const ARMS = { x: 540, y: 960, s: 0.95 };
function armsShot(t, lt, focus, cam, o = {}) {
  camera(cam[0], cam[1], cam[2]);
  popWorld(t, () => { coatOfArms(ARMS.x, ARMS.y, ARMS.s * easeBack(clamp((o.grow ?? 1))), t, { focus, yProg: o.yProg, spot: clamp((lt - 0.1) / 0.4) }); }, { pattern: o.pattern || 'diamonds', pal: o.pal || 'green', cy: 900, disc: 0, ground: false, fronds: o.fronds });
}
const zoomTo = (lt, from, to, dur = 0.8) => { const u = easeInOut(clamp(lt / dur)); return [lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u)]; };

S.hook = ({ t, lt, ln }) => {
  const mean = wl(ln, 'means', 0.7);
  armsShot(t, lt, null, [540, 960, lerp(1.1, 0.98, easeOut(lt / 2))], { grow: (lt + 0.2) / 0.6, fronds: true });
  popText('NIGERIA\'S COAT OF ARMS', 540, 230, 76, lt + 0.2, { color: '#fff4dc', step: 0.02 });
  if (lt > mean - 0.4) burstBadge('WHAT IT\nMEANS', 860, 1300, 130, clamp((lt - mean + 0.4) / 0.3), { size: 40, color: '#f2b705' });
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'means', 0.7) - 0.4, type: 'pop' }];

S.shield = ({ t, lt, ln }) => {
  const soil = wlLast(ln, 'soil', 0.95);
  armsShot(t, lt, 'shield', zoomTo(lt, [540, 960, 0.98], [540, 980, 1.35]), { pal: 'sunset', pattern: 'rings' });
  tag('BLACK SHIELD', 540, 300, clamp(lt / 0.3), { size: 56 });
  if (lt > soil - 0.5) tag('= FERTILE SOIL', 540, 1300, clamp((lt - soil + 0.5) / 0.3), { size: 60, bg: '#8a5a2a', ink: '#fff4dc' });
  ankaraWipe(lt, { pal: 'sunset', pattern: 'rings' });
};
EV.shield = ln => [{ t: wlLast(ln, 'soil', 0.95) - 0.5, type: 'stamp' }];

S.y = ({ t, lt, ln }) => {
  const ni = wl(ln, 'niger', 0.5), be = wl(ln, 'benue', 0.7), meet = wlLast(ln, 'meeting', 0.95);
  armsShot(t, lt, 'y', zoomTo(lt, [540, 980, 1.35], [540, 960, 1.25]), { yProg: clamp(lt / 1.4), pal: 'indigo', pattern: 'waves' });
  tag('THE WHITE Y', 540, 300, clamp(lt / 0.3), { size: 56 });
  panel(830, 1320, 380, 300, clamp((lt - ni + 0.2) / 0.35), (w, h) => {
    const m = { x: 0, y: 0, s: 24 };
    ctx.save(); ctx.translate(-30, 10); ngMap(m, {}); river(NIGER, m, clamp((lt - ni) / 0.8), 9); river(BENUE, m, clamp((lt - be) / 0.8), 7); ctx.restore();
  }, { rot: 0.04 });
  tag('NIGER + BENUE', 300, 1320, clamp((lt - be + 0.1) / 0.3), { size: 44, bg: '#2f8cff', ink: '#fff4dc' });
  ankaraWipe(lt, { pal: 'indigo', pattern: 'waves' });
};
EV.y = ln => [{ t: wl(ln, 'niger', 0.5) - 0.2, type: 'whoosh' }, { t: wlLast(ln, 'meeting', 0.95) - 0.2, type: 'ding' }];

S.eagle = ({ t, lt, ln }) => {
  const str = wlLast(ln, 'strength', 0.95);
  armsShot(t, lt, 'eagle', zoomTo(lt, [540, 960, 1.25], [540, 700, 1.45]), { pal: 'magenta', pattern: 'suns' });
  impact(t, lt - str + 0.3, 1);
  tag('THE RED EAGLE', 540, 300, clamp(lt / 0.3), { size: 56, bg: '#d7262e', ink: '#fff4dc' });
  if (lt > str - 0.4) burstBadge('STRENGTH', 540, 1170, 160, clamp((lt - str + 0.4) / 0.3), { size: 52, color: '#f2b705' });
  ankaraWipe(lt, { pal: 'magenta', pattern: 'suns' });
};
EV.eagle = ln => [{ t: wlLast(ln, 'strength', 0.95) - 0.4, type: 'stamp' }];

S.horses = ({ t, lt, ln }) => {
  const dig = wlLast(ln, 'dignity', 0.95);
  armsShot(t, lt, 'horses', zoomTo(lt, [540, 700, 1.45], [540, 1000, 1.05]), { pal: 'teal', pattern: 'leaves' });
  impact(t, lt - dig + 0.3, 0.8);
  tag('TWO WHITE HORSES', 540, 300, clamp(lt / 0.3), { size: 56 });
  if (lt > dig - 0.4) burstBadge('DIGNITY', 540, 1170, 150, clamp((lt - dig + 0.4) / 0.3), { size: 52, color: '#0aa3a3', ink: '#fff4dc' });
  ankaraWipe(lt, { pal: 'teal', pattern: 'leaves' });
};
EV.horses = ln => [{ t: wlLast(ln, 'dignity', 0.95) - 0.4, type: 'stamp' }];

S.motto = ({ t, lt, ln }) => {
  const words = [['unity', 'UNITY'], ['faith', 'FAITH'], ['peace', 'PEACE'], ['progress', 'PROGRESS']];
  armsShot(t, lt, 'motto', zoomTo(lt, [540, 1000, 1.05], [540, 1200, 1.3]), { pal: 'green', pattern: 'diamonds' });
  tag('THE MOTTO', 540, 300, clamp(lt / 0.3), { size: 56 });
  words.forEach(([w, label], i) => { const at = wl(ln, w, 0.4 + i * 0.15); popText(label, 270 + (i % 2) * 540, 470 + Math.floor(i / 2) * 130, 92, lt - at + 0.1, { color: ['#2fd38a', '#f2b705', '#fff4dc', '#f26b1d'][i] }); });
  ankaraWipe(lt, { pal: 'green', pattern: 'diamonds' });
};
EV.motto = ln => [{ t: wl(ln, 'unity', 0.4) - 0.1, type: 'pop' }, { t: wl(ln, 'faith', 0.55) - 0.1, type: 'pop' }, { t: wl(ln, 'peace', 0.7) - 0.1, type: 'pop' }, { t: wl(ln, 'progress', 0.85) - 0.1, type: 'ding' }];

S.cta = ctaScene('DID YOU KNOW', 'ALL OF THAT?', { pal: 'green' });
