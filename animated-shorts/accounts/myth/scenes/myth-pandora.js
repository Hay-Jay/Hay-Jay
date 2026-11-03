// Episode: Pandora's box was never a box
S.hook = ({ t, lt, ln }) => {
  const never = wl(ln, 'never', 0.4), last = wlLast(ln, 'box', 0.85);
  const z = lerp(1.32, 1.12, easeInOut(lt / 2)) + (lt > last ? easeOut((lt - last) / 0.5) * 0.12 : 0);
  camera(540, 900, z);
  shake(t, lt > last ? 18 * Math.exp(-(lt - last) * 6) : 0);
  templeWorld(t, { main: () => {
    // pedestal
    const pg = ctx.createLinearGradient(380, 0, 700, 0); pg.addColorStop(0, '#9c8e7c'); pg.addColorStop(0.4, '#e9dfcf'); pg.addColorStop(1, '#7d6f62');
    ctx.fillStyle = pg; ctx.fillRect(390, 1000, 300, 380); ctx.fillStyle = '#efe6d6'; ctx.fillRect(360, 980, 360, 30); ctx.fillRect(360, 1370, 360, 30);
    goldBox(540, 985, 0.72, t, { rattle: lt < never ? 0.6 : 0.15, lid: 0.04 + 0.03 * Math.sin(t * 9) });
    owl(900, 1120 + 380 * (1 - easeOut((lt - never + 0.3) / 0.5)), 0.6, { t, mood: lt > last ? 'wise' : 'calm', look: -1, tilt: -0.08 });
  } });
  goldText("PANDORA'S BOX", 540, 330, 112, lt + 0.2);
  if (lt > last) {
    const k = clamp((lt - last) / 0.22);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#e0242f'; ctx.lineWidth = 26; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(620, 300); ctx.lineTo(lerp(620, 980, k), lerp(300, 380, k)); ctx.stroke(); ctx.restore();
    goldText('NOT A BOX', 540, 470, 88, lt - last - 0.1, { mid: '#ff7a5a', bot: '#a8201a', top: '#ffd0c0', glow: 'rgba(255,80,60,.5)' });
  }
};
EV.hook = ln => [{ t: 0.05, type: 'boom' }, { t: wl(ln, 'never', 0.4) - 0.2, type: 'whoosh' }, { t: wlLast(ln, 'box', 0.85), type: 'stamp' }];

S.jar = ({ t, lt, ln }) => {
  const jar = wl(ln, 'jar', 0.55), pi = wl(ln, 'pithos', 0.85);
  const [shot, st] = shotOf(lt, [jar - 0.1]);
  if (shot === 0) {
    camera(lerp(380, 470, easeInOut(lt / jar)), 860, lerp(1.25, 1.12, easeInOut(lt / jar)));
    // zoom-through from the temple into the painting
    CAM.z *= 1 + 1.5 * Math.pow(1 - clamp(lt / 0.35), 2);
    vaseWorld(t, () => {
      fig('pandora', lerp(120, 430, easeOut(lt / jar)), 1290, 1.45, { t, walk: 1 - clamp((lt - jar + 0.6) / 0.5), phase: lt * 7 });
      inscription('ΠΑΝΔΩΡΑ', 760, 820, 54, clamp(lt / 0.6), true);
    });
    namePlate('HESIOD · c. 700 BC', 540, 330, clamp((lt - 0.3) / 0.4));
  } else {
    camera(560, lerp(980, 760, easeInOut(st / 1.6)), lerp(1.05, 1.2, easeInOut(st / 2)));
    whip(st, -1, 600);
    vaseWorld(t, () => {
      fig('pandora', 300, 1290, 1.3, { t, armF: [0.9, 0.2], headTilt: -0.05 });
      const rise = easeBack(clamp(st / 0.6));
      pithos(700, 1290 + (1 - rise) * 300, 1.35 * (0.6 + 0.4 * rise), { gleam: clamp((st - 0.3) / 0.7) });
    });
    goldText('A JAR', 540, 330, 130, st - 0.1);
    if (lt > pi - 0.15) { goldText('PITHOS', 540, 470, 86, lt - pi + 0.15, { step: 0.05 }); ctx.save(); ctx.font = `italic 700 46px ${GREEK}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,230,180,' + clamp((lt - pi) / 0.4) + ')'; ctx.fillText('πίθος', 540, 560); ctx.restore(); }
  }
};
EV.jar = ln => [{ t: 0.0, type: 'whoosh' }, { t: wl(ln, 'jar', 0.55) - 0.1, type: 'boom' }, { t: wl(ln, 'pithos', 0.85) - 0.1, type: 'chime' }];

S.fire = ({ t, lt, ln }) => {
  const pan = wl(ln, 'pandora', 0.2), aft = wl(ln, 'after', 0.45), gave = wl(ln, 'gave', 0.8);
  const [shot, st] = shotOf(lt, [pan - 0.05, aft - 0.05, gave - 0.1]);
  if (shot === 0) {
    camera(560, 820, lerp(1.0, 1.18, easeInOut(st / 1.2)));
    shake(t, 26 * Math.exp(-st * 5));
    vaseWorld(t, () => {
      cloud(560, 1250, 1.6);
      const z = fig('zeus', 520, 1240, 1.45, { t, armF: [-2.5 + Math.sin(t * 3) * 0.05, -2.9], armB: [-0.3, -0.6], hold: 'scepter' });
      bolt(z.hand[0], z.hand[1] - 40, 0.9, 0.3, t);
      lightning(z.hand[0], z.hand[1] - 100, z.hand[0] - 200, -200, Math.floor(t * 12), 1 - clamp(st / 0.35));
      inscription('ΖΕΥΣ', 200, 760, 58, clamp(st / 0.4), true);
    });
    flash(st, 0.2, '255,250,230', 0.85);
    namePlate('ZEUS', 540, 330, clamp(st / 0.3));
  } else if (shot === 1) {
    camera(540, 900, lerp(1.12, 1.0, easeInOut(st / 1.4)));
    whip(st, 1);
    vaseWorld(t, () => {
      const rv = clamp(st / 0.9);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 1290 - 640 * rv, 1080, 700); ctx.clip();
      fig('pandora', 540, 1290, 1.45, { t, armF: [0.3, 0.6], armB: [-0.2, -0.3] });
      ctx.restore();
      for (let i = 0; i < 26; i++) { const yy = 1290 - 640 * rv + Math.sin(i * 7.7) * 20, xx = 420 + hash1(i) * 260; sparkle(xx, yy, 10 + 10 * hash1(i + 3), (1 - rv * 0.6) * (0.5 + 0.5 * Math.sin(t * 10 + i))); }
      glow(540, 1290 - 640 * rv, 260, 'rgba(255,210,120,.5)', 1 - rv * 0.5);
    });
    namePlate('PANDORA', 540, 330, clamp(st / 0.3));
    if (lt > wl(ln, 'punishment', 0.5) - 0.1) goldText('A PUNISHMENT', 540, 450, 84, lt - wl(ln, 'punishment', 0.5) + 0.1, { mid: '#ff9a6a', bot: '#a8321a' });
  } else if (shot === 2) {
    const runX = lerp(-80, 1160, st / 1.9);
    camera(lerp(420, 660, st / 1.9), 880, 1.08);
    whip(st, 1);
    vaseWorld(t, () => {
      const p = fig('prometheus', runX, 1290, 1.35, { t, walk: 1.4, phase: st * 11, lean: 0.22, armF: [-1.4, -2.2] });
      for (let i = 0; i < 12; i++) glow(p.hand[0] - i * 34, p.hand[1] - 30 + Math.sin(t * 9 + i) * 10, 70 - i * 4, 'rgba(255,140,40,.6)', 1 - i / 12);
      ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(p.hand[0], p.hand[1] + 40); ctx.lineTo(p.hand[0] + 8, p.hand[1] - 50); ctx.stroke();
      flame(p.hand[0] + 8, p.hand[1] - 48, 34, t, 1); glow(p.hand[0], p.hand[1] - 80, 300, 'rgba(255,150,50,.6)', 1);
      particles(17, 30, t, { x0: runX - 400, x1: runX, y0: 700, y1: 1000, vy: -40, vx: -80, size: 3, color: 'rgba(255,150,50,1)', core: '#ffe0a0', glow: true, life: 1.6, wobble: 20 });
      inscription('ΠΡΟΜΗΘΕΥΣ', runX - 60, 600, 46, 1);
    }, { tint: 'rgba(255,120,40,.06)' });
    namePlate('PROMETHEUS', 540, 330, clamp(st / 0.3));
    goldText('STOLE FIRE', 540, 450, 84, st - 0.5, { mid: '#ffb04a' });
  } else {
    camera(560, 900, lerp(1.0, 1.1, easeInOut(st / 1.5)));
    whip(st, 1, 500);
    vaseWorld(t, () => {
      fig('prometheus', 260, 1290, 1.25, { t, armF: [-1.2, -1.6] });
      const hand = [260 + 1.25 * (16 + Math.sin(-1.2) * 78 + Math.sin(-1.6) * 72) * 1, 1290 + 1.25 * (-318 + Math.cos(-1.2) * 78 + Math.cos(-1.6) * 72)];
      flame(hand[0], hand[1] - 10, 30, t, 2);
      const lit = clamp((st - 0.4) / 0.6);
      [[600, 0.9, -1], [760, 0.85, -1], [900, 0.95, -1]].forEach(([hx, sc, f], i) => {
        fig('human', hx, 1290, sc, { t, f, armF: [-1.0 * lit - 0.2, -1.4 * lit], walk: 0 });
        glow(hx - 60, 900, 220, 'rgba(255,150,60,.45)', lit);
      });
      ctx.fillStyle = INK; ctx.fillRect(700, 1262, 120, 26); flame(760, 1262, 40 * lit, t, 4); glow(760, 1200, 320, 'rgba(255,140,50,.6)', lit);
      inscription('ΑΝΘΡΩΠΟΙ', 760, 780, 44, lit);
    }, { tint: 'rgba(255,120,40,.06)' });
    namePlate('HUMANS', 540, 330, clamp(st / 0.3));
  }
};
EV.fire = ln => [{ t: 0, type: 'thunder' }, { t: wl(ln, 'pandora', 0.2) - 0.05, type: 'shimmer' }, { t: wl(ln, 'after', 0.45) - 0.05, type: 'firewhoosh' }, { t: wl(ln, 'gave', 0.8) - 0.1, type: 'whoosh' }];

S.open = ({ t, lt, ln }) => {
  const op = wl(ln, 'opened', 0.2);
  const [shot, st] = shotOf(lt, [op + 0.2]);
  if (shot === 0) {
    camera(600, 900, lerp(1.1, 1.3, easeInOut(st / 1.2)));
    whip(st, -1);
    vaseWorld(t, () => {
      const lift = clamp((lt - op + 0.25) / 0.45);
      fig('pandora', 400, 1290, 1.35, { t, armF: [lerp(0.6, -1.6, lift), lerp(0.3, -1.9, lift)], headTilt: -0.05 });
      pithos(760, 1290, 1.2, { lid: lift * 0.4 });
      glow(760, 800, 220, 'rgba(170,60,255,.6)', lift);
    });
  } else {
    camera(640, lerp(820, 900, easeOut(st / 1)), lerp(1.35, 1.0, easeOut(st / 0.9)));
    shake(t, 22 * Math.exp(-st * 2.5));
    vaseWorld(t, () => {
      fig('pandora', 300, 1290, 1.25, { t, armF: [2.0, 2.85], armB: [1.7, 2.6], lean: -0.14, headTilt: -0.12 });
      pithos(700, 1290, 1.12, { lid: 1 });
      glow(700, 860, 420, 'rgba(170,60,255,.45)', clamp(st / 0.3) * (1 - clamp((st - 2.5) / 1.5)));
      smoke(700, 830, st, 21);
      const sp = [['sickness', 'SICKNESS', '#7dff6a', -1], ['work', 'TOIL', '#ffd23a', 1], ['trouble', 'TROUBLE', '#ff4a4a', 0]];
      sp.forEach(([w, label, eye, dir], i) => {
        const at = wl(ln, w, 0.4 + i * 0.2) - ln.start * 0 - (op + 0.2) - 0.15, u = clamp((st - at) / 1.4);
        if (u <= 0) return;
        const x = 700 + dir * 330 * easeOut(u) + Math.sin(t * 3 + i) * 30, y = 820 - 330 * easeOut(u) - i * 40;
        spirit(x, y, 1.6, t, eye, i * 3);
        namePlate(label, x, y - 110, clamp(u * 3));
      });
    }, { tint: `rgba(60,0,60,${0.25 * clamp(st / 0.6)})` });
  }
};
EV.open = ln => [{ t: wl(ln, 'opened', 0.2) + 0.2, type: 'smokeburst' }, { t: wl(ln, 'sickness', 0.5) - 0.15, type: 'whoosh' }, { t: wl(ln, 'work', 0.65) - 0.15, type: 'whoosh' }, { t: wl(ln, 'trouble', 0.85) - 0.15, type: 'boom' }];

S.hope = ({ t, lt, ln }) => {
  const h = wl(ln, 'hope', 0.8);
  const [shot, st] = shotOf(lt, [h - 0.2]);
  if (shot === 0) {
    camera(700, lerp(900, 860, easeInOut(st / 1.6)), lerp(1.0, 1.7, easeInOut(st / (h - 0.2))));
    vaseWorld(t, () => {
      fig('pandora', 330, 1290, 1.25, { t, armF: [0.4, 0.2], headTilt: 0.12 });
      pithos(700, 1290, 1.12, { lid: 1 });
      smoke(700, 830, 1.6 + lt * 0.3, 21, 30);
    }, { tint: `rgba(10,0,20,${0.35 - 0.25 * clamp(st / 1.2)})` });
    goldText('ONLY ONE THING...', 540, 330, 84, st - 0.1, { step: 0.03 });
  } else {
    camera(540, 900, lerp(0.92, 1.05, easeInOut(st / 2)));
    ctx.fillStyle = '#0b0604'; ctx.fillRect(0, 0, W, H);
    layer(1, () => {
      const r = 420 + 30 * Math.sin(t * 2);
      glow(540, 860, 900, 'rgba(255,190,90,.35)', 1);
      godRays(540, 860, Math.PI, Math.PI * 2, 18, 900, 'rgba(255,220,150,.35)', 0.5 * clamp(st / 0.6), t);
      glow(540, 860, r * 0.55, 'rgba(255,240,200,.95)', 1);
      circle(540, 860, 46 + 4 * Math.sin(t * 4), '#fffbea');
      for (let i = 0; i < 16; i++) { const a = t * 0.6 + i / 16 * Math.PI * 2, rr = 150 + 70 * Math.sin(t * 1.3 + i); sparkle(540 + Math.cos(a) * rr, 860 + Math.sin(a) * rr * 0.7, 10 + 8 * hash1(i), 0.6 + 0.4 * Math.sin(t * 5 + i)); }
      particles(31, 40, t, { x0: 200, x1: 880, y0: 600, y1: 1200, vy: -30, size: 2.5, color: 'rgba(255,220,150,1)', core: '#fff4d0', glow: true, life: 3, wobble: 30 });
    });
    goldText('HOPE', 540, 380, 190, st, { font: '"Cinzel Decorative", "Cinzel", serif', step: 0.08 });
    inscription('ἐλπίς', 540, 520, 54, clamp((st - 0.6) / 0.5));
  }
};
EV.hope = ln => [{ t: 0.05, type: 'hush' }, { t: wl(ln, 'hope', 0.8) - 0.2, type: 'chime' }];

S.box = ({ t, lt, ln }) => {
  const ab = wl(ln, 'about', 0.3), mi = wl(ln, 'mistake', 0.85), bx = wlLast(ln, 'box', 0.7);
  const [shot, st] = shotOf(lt, [ab - 0.05, mi - 0.15]);
  if (shot === 0) {
    camera(540, 960, lerp(1.25, 1.35, easeInOut(st / 2)));
    templeWorld(t, { main: () => owl(540, 1080, 1.05, { t, mood: 'calm', look: Math.sin(t * 1.5) * 0.6, tilt: Math.sin(t * 1.2) * 0.1, wingR: 0.35 + 0.05 * Math.sin(t * 3) }) });
    goldText('SO... THE BOX?', 540, 330, 104, st);
  } else if (shot === 1) {
    camera(lerp(560, 640, easeInOut(st / 3)), 900, lerp(1.0, 1.12, easeInOut(st / 3)));
    whip(st, 1);
    scholarScene(t, st, { words: () => {
      ctx.save(); ctx.translate(700, 1080); ctx.rotate(-0.05);
      const wr = clamp((lt - (ab + 0.2)) / 1.0);
      ctx.font = `italic 700 50px ${GREEK}`; ctx.fillStyle = '#3a2412'; ctx.textAlign = 'center';
      ctx.save(); ctx.beginPath(); ctx.rect(-230, -60, 220 * wr + 10, 120); ctx.clip(); ctx.fillText('πίθος', -120, 20); ctx.restore();
      const cr = clamp((lt - bx + 0.5) / 0.3);
      if (cr > 0) { ctx.strokeStyle = '#a3201a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-200, 6); ctx.lineTo(lerp(-200, -40, cr), 6); ctx.stroke(); }
      const w2 = clamp((lt - bx + 0.2) / 0.8);
      ctx.save(); ctx.beginPath(); ctx.rect(10, -60, 220 * w2, 120); ctx.clip(); ctx.font = `italic 700 50px "DejaVu Serif", serif`; ctx.fillText('pyxis', 120, 20); ctx.restore();
      ctx.restore();
    } });
    namePlate('ERASMUS · 1500s', 540, 330, clamp(st / 0.3));
    if (lt > bx - 0.2) goldText('"PYXIS" = BOX', 540, 470, 80, lt - bx + 0.2, { mid: '#ffcf7a' });
  } else {
    camera(540, 900, lerp(1.0, 1.08, easeOut(st / 1.5)));
    whip(st, -1);
    shake(t, st > 0.6 ? 16 * Math.exp(-(st - 0.6) * 6) : 0);
    vaseWorld(t, () => {
      const mo = easeInOut(clamp(st / 0.7));
      ctx.save(); ctx.globalAlpha = 1 - mo; ctx.translate(540, 1290); ctx.scale(1 + mo * 0.3, 1 - mo * 0.5); pithos(0, 0, 1.15); ctx.restore();
      ctx.save(); ctx.globalAlpha = mo; goldBox(540, 1290, 0.95 * (0.6 + 0.4 * mo), t, {}); ctx.restore();
    });
    if (st > 0.6) {
      const k = clamp((st - 0.6) / 0.2);
      ctx.save(); ctx.translate(540, 470); ctx.rotate(-0.08); ctx.scale(lerp(1.8, 1, k), lerp(1.8, 1, k)); ctx.globalAlpha = k;
      ctx.lineWidth = 12; ctx.strokeStyle = '#d0242c'; ctx.beginPath(); ctx.roundRect(-380, -80, 760, 160, 20); ctx.stroke();
      ctx.font = `900 84px ${SERIF}`; ctx.fillStyle = '#e0303a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('IT STUCK', 0, 6); ctx.restore();
    }
    goldText('500 YEARS LATER...', 540, 300, 76, st - 0.1, { step: 0.025 });
  }
};
EV.box = ln => [{ t: wl(ln, 'about', 0.3) - 0.05, type: 'whoosh' }, { t: wl(ln, 'about', 0.3) + 0.2, type: 'quill' }, { t: wl(ln, 'mistake', 0.85) - 0.15, type: 'whoosh' }, { t: wl(ln, 'mistake', 0.85) + 0.45, type: 'stamp' }];

