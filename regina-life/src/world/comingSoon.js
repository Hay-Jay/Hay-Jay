import * as THREE from 'three';

/**
 * "Coming soon" construction sites on the city's empty lots (data: COMING_SOON in cityData.js): a dirt pad behind a
 * hoarding fence, a half-built frame, a tower crane, and a big double-sided sign saying what is coming.
 * Each sign scales up in the overview map, like the billboards, so it reads from the home screen.
 */
const FONT = '"Plus Jakarta Sans","Segoe UI",system-ui,sans-serif';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';

export function drawComingSoon(cv, site) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height;
  g.fillStyle = '#ffb21e'; g.fillRect(0, 0, w, h);
  // hazard stripes top and bottom
  for (const y of [0, h - 34]) { g.save(); g.beginPath(); g.rect(0, y, w, 34); g.clip(); g.fillStyle = '#1d1f24'; g.fillRect(0, y, w, 34); g.fillStyle = '#ffb21e'; for (let x = -40; x < w + 40; x += 56) { g.beginPath(); g.moveTo(x, y + 34); g.lineTo(x + 28, y); g.lineTo(x + 52, y); g.lineTo(x + 24, y + 34); g.fill(); } g.restore(); }
  g.fillStyle = '#fff8e8'; g.beginPath(); g.roundRect?.(28, 52, w - 56, h - 104, 22); if (!g.roundRect) g.rect(28, 52, w - 56, h - 104); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${Math.round(h * 0.25)}px ${EMOJI}`; g.fillText(site.emoji, w * 0.16, h * 0.5);
  g.fillStyle = '#e8590c'; g.font = `800 ${Math.round(h * 0.15)}px ${FONT}`; g.fillText('COMING SOON', w * 0.58, h * 0.34);
  g.fillStyle = '#1d1f24'; let fs = Math.round(h * 0.17); g.font = `800 ${fs}px ${FONT}`;
  while (g.measureText(site.name).width > w * 0.62 && fs > 20) { fs -= 2; g.font = `800 ${fs}px ${FONT}`; }
  g.fillText(site.name, w * 0.58, h * 0.56);
  g.fillStyle = '#5b5f68'; g.font = `600 ${Math.round(h * 0.06)}px ${FONT}`; g.fillText('Under construction · Regina Life', w * 0.58, h * 0.74);
}

export function buildComingSoonSite({ group, colliders, interactables, site, rnd = Math.random }) {
  const { x, z, w, d } = site, big = !site.block;
  const root = new THREE.Group(); root.position.set(x, 0, z); root.name = 'soon_' + site.id; group.add(root);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const box = (sx, sy, sz, mat, px, py, pz, parent = root, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(px, py, pz); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };

  // dirt pad, gravel piles
  box(w, 0.5, d, std('#a07c55', { roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 0, 0.25, 0, root, false);   // tall enough to win the depth test against the lawn from the far home-screen camera
  const pile = std('#8d7a66', { roughness: 1, flatShading: true });
  for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(3 + rnd() * 2, 2.2 + rnd(), 7), pile); m.position.set((rnd() - 0.5) * w * 0.6, 1.1, d * (0.18 + rnd() * 0.2)); root.add(m); }

  // hoarding fence (white panels with an orange band); a gate gap at the front for the trucks
  const panel = std('#efeae0'), band = std('#f08c1a');
  const fence = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, rot = Math.atan2(bz - az, bx - ax);
    const p = box(len, 2.4, 0.18, panel, cx, 1.42, cz); p.rotation.y = -rot;
    const b = box(len, 0.35, 0.2, band, cx, 2.1, cz); b.rotation.y = -rot;
  };
  const hw = w / 2, hd = d / 2, gate = Math.min(12, w * 0.18);
  fence(-hw, -hd, hw, -hd); fence(-hw, -hd, -hw, hd); fence(hw, -hd, hw, hd);
  fence(-hw, hd, -gate / 2, hd); fence(gate / 2, hd, hw, hd);
  colliders.add(x - hw - 0.3, z - hd - 0.3, x + hw + 0.3, z + hd + 0.3, 3);

  // half-built frame: concrete slabs on steel columns, top floors still open
  const floors = big ? 4 : 3, fw = w * 0.5, fd = d * 0.42, fz = -d * 0.12, fh = 3.6;
  const concrete = std('#b9b6ae'), steel = std('#59636e', { metalness: 0.4, roughness: 0.5 });
  for (let f = 0; f < floors; f++) {
    box(fw, 0.4, fd, concrete, 0, 0.4 + f * fh, fz);
    for (let a = 0; a <= 4; a++) for (const s of [-1, 1]) box(0.5, fh, 0.5, steel, -fw / 2 + (a / 4) * fw, 0.4 + f * fh + fh / 2, fz + s * (fd / 2 - 0.3));
  }
  box(fw * 0.22, floors * fh + 2, fd * 0.3, concrete, -fw * 0.3, (floors * fh + 2) / 2, fz);   // stair core

  // tower crane
  const yellow = std('#f2b705', { roughness: 0.6 }), H = floors * fh + 16, cxr = fw / 2 + 6, czr = fz;
  const crane = new THREE.Group(); crane.position.set(cxr, 0, czr); root.add(crane);
  box(1.6, H, 1.6, yellow, 0, H / 2, 0, crane);
  const jib = new THREE.Group(); jib.position.set(0, H, 0); jib.rotation.y = rnd() * Math.PI * 2; crane.add(jib);
  box(28, 1.1, 1.2, yellow, -9, 0.5, 0, jib); box(9, 1.1, 1.2, yellow, 8, 0.5, 0, jib);
  box(3, 2.2, 1.6, std('#7b8088'), 10, -0.6, 0, jib);      // counterweight
  box(2, 2, 2, std('#e9e4d8'), 0, -1.4, 1.6, jib);         // operator cab
  box(0.08, 10, 0.08, std('#222'), -20, -5, 0, jib, false);  // hook cable
  box(1.2, 0.8, 1.2, yellow, -20, -10.2, 0, jib);

  // the sign: double sided, on two posts at the gate, facing the street
  const sign = new THREE.Group(); sign.position.set(-(gate / 2 + 9), 0, hd + 1.2); root.add(sign);
  const SW = big ? 16 : 12, SH = SW / 2, post = 3.2;
  const cv = document.createElement('canvas'); cv.width = 768; cv.height = 384; drawComingSoon(cv, site);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const face = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25, roughness: 0.6 });
  for (const s of [-1, 1]) box(0.35, post + SH, 0.35, steel, s * SW * 0.36, (post + SH) / 2, -0.25, sign);
  box(SW + 0.5, SH + 0.5, 0.3, std('#1d1f24'), 0, post + SH / 2, -0.25, sign);
  for (const back of [false, true]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), face); m.position.set(0, post + SH / 2, back ? -0.42 : -0.08); if (back) m.rotation.y = Math.PI; sign.add(m); }

  interactables.push({ id: 'soon_' + site.id, x: x + sign.position.x, z: z + hd + 4, radius: 7, label: `Coming soon · ${site.name}`, comingSoon: site });
  // the home-screen map looks almost straight down: there the sign floats over the middle of the lot, big and tipped toward the sky
  const street = sign.position.clone(), SC = (w * 0.72) / SW, top = floors * fh + 3;
  // in the far view of the whole island only the big outer lots keep a sign, drawn huge so it reads between the neighbourhoods
  const setOverview = (on, level = 'close') => {
    const far = on && level === 'far';
    sign.visible = !far || big; if (on) sign.position.set(0, top, 0); else sign.position.copy(street);
    sign.scale.setScalar(!on ? 1 : far ? 560 / SW : SC); sign.rotation.x = on ? -1.15 : 0;
  };
  return { root, sign, setOverview };
}
