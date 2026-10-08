import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';

const mk = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h); return c;
};
const tex = (canvas, { repeat = true, srgb = true, aniso = 4 } = {}) => {
  const t = new THREE.CanvasTexture(canvas);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};

/** One tile = 4 bays × 4 floors (16 m × 14 m). Returns { map, emissive } */
export function facadeTextures(style, seed = 1) {
  const rnd = mulberry32(seed * 97 + style.length);
  const S = 256, cell = 64;
  const lit = [];
  const draw = (g, emissive) => {
    const P = {
      glass:  { wall: '#aebfcc', frame: '#6f8091', glassA: '#46647e', glassB: '#2b4156', inset: 3 },
      brick:  { wall: '#b9805f', frame: '#e5ddd0', glassA: '#3a4a58', glassB: '#27323c', inset: 14 },
      concrete: { wall: '#b4b4b0', frame: '#d1d1cc', glassA: '#4c6376', glassB: '#2e3f4e', inset: 12 },
      stucco: { wall: '#d9c8a6', frame: '#f1ead9', glassA: '#4b5f70', glassB: '#2f3f4b', inset: 15 },
      siding: { wall: '#e6e4de', frame: '#ffffff', glassA: '#4d6272', glassB: '#2f3e4a', inset: 17 },
      store:  { wall: '#2a2d33', frame: '#14161a', glassA: '#7aa1b5', glassB: '#3d596b', inset: 9 },
    }[style];
    if (!emissive) { g.fillStyle = P.wall; g.fillRect(0, 0, S, S); }
    else { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); }
    // subtle wall noise
    if (!emissive) for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * 0.05})`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 3, 2 + rnd() * 3); }
    if (!emissive && style === 'brick') for (let y = 0; y < S; y += 8) { g.fillStyle = 'rgba(60,30,20,.18)'; g.fillRect(0, y, S, 1); for (let x = (y / 8) % 2 ? 0 : 8; x < S; x += 16) g.fillRect(x, y, 1, 8); }
    if (!emissive && style === 'siding') for (let y = 0; y < S; y += 6) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, y, S, 1); }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = c * cell + P.inset, y = r * cell + P.inset * 0.8, w = cell - P.inset * 2, h = cell - P.inset * 1.6;
      if (emissive) {
        const key = r * 4 + c; if (lit[key] === undefined) lit[key] = rnd() < 0.42;
        if (style === 'store' || lit[key]) {
          const warm = style === 'store' ? '#ffcf8a' : rnd() < 0.8 ? '#ffd48a' : '#bfe0ff';
          g.fillStyle = warm; g.globalAlpha = style === 'store' ? 0.7 : 0.55 + rnd() * 0.4; g.fillRect(x, y, w, h); g.globalAlpha = 1;
        }
        continue;
      }
      g.fillStyle = P.frame; g.fillRect(x - 2, y - 2, w + 4, h + 4);
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, P.glassA); gr.addColorStop(1, P.glassB);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(x, y + h * 0.55); g.lineTo(x + w * 0.6, y); g.lineTo(x + w, y); g.lineTo(x, y + h * 0.9); g.fill();
      if (style !== 'glass') { g.fillStyle = P.frame; g.fillRect(x + w / 2 - 1, y, 2, h); }
      else { g.fillStyle = P.frame; g.fillRect(x + w / 2 - 1, y, 2, h); }
    }
  };
  return {
    map: tex(mk(S, S, (g) => draw(g, false))),
    emissive: tex(mk(S, S, (g) => draw(g, true))),
  };
}

export function asphaltTexture() {
  return tex(mk(256, 256, (g, w, h) => {
    // u = across road (0..1), v = along road. 12 m asphalt in 18 m corridor: sidewalks 3 m each side.
    g.fillStyle = '#2b2d31'; g.fillRect(0, 0, w, h);
    const rnd = mulberry32(7);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
    const sw = (3 / 18) * w;
    g.fillStyle = '#9b9a95'; g.fillRect(0, 0, sw, h); g.fillRect(w - sw, 0, sw, h);         // sidewalks
    g.fillStyle = '#c9c7c0'; g.fillRect(sw - 3, 0, 3, h); g.fillRect(w - sw, 0, 3, h);        // curbs
    g.fillStyle = '#e3b93a'; g.fillRect(w / 2 - 2, 0, 1.5, h * 0.5); g.fillRect(w / 2 + 1, 0, 1.5, h * 0.5);       // dashed yellow centre line
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(sw + 4, 0, 1.5, h); g.fillRect(w - sw - 6, 0, 1.5, h); // edge lines
    // sidewalk joints
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += h / 4) { g.fillRect(0, y, sw, 1); g.fillRect(w - sw, y, sw, 1); }
  }));
}
export function intersectionTexture() {
  return tex(mk(64, 64, (g, w, h) => { g.fillStyle = '#2b2d31'; g.fillRect(0, 0, w, h); const r = mulberry32(3); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); } }));
}
export function concreteTexture(base = '#a8a69f') {
  return tex(mk(128, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = mulberry32(11);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(0.5, 0.5, w - 1, h - 1);
  }));
}
export function grassTexture(base = '#6e8f4e') {
  return tex(mk(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = mulberry32(5);
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,40,10' : '200,220,120'},${r() * 0.08})`; g.fillRect(r() * w, r() * h, 2 + r() * 2, 2 + r() * 2); }
  }));
}
export function glowTexture() {
  return tex(mk(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }), { repeat: false });
}
export function cloudTexture(seed = 1) {
  return tex(mk(256, 128, (g, w, h) => {
    const r = mulberry32(seed);
    for (let i = 0; i < 26; i++) {
      const x = w * (0.2 + 0.6 * r()), y = h * (0.45 + 0.2 * r()), rad = 18 + r() * 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  }), { repeat: false });
}
export function signTexture(text, { bg = '#14161a', fg = '#ffffff', accent = '#ffb347', w = 512, h = 128, sub = '' } = {}) {
  return tex(mk(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${sub ? 54 : 62}px "Georgia", serif`; g.fillText(text, w / 2, sub ? h * 0.42 : h * 0.46);
    if (sub) { g.font = `600 22px sans-serif`; g.fillStyle = accent; g.fillText(sub, w / 2, h * 0.78); }
  }), { repeat: false });
}
export const woodTexture = (base = '#8a6a48') => tex(mk(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = mulberry32(21);
  for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, y, w, 2); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,200'},${r() * 0.07})`; g.fillRect(r() * w, y + r() * 30, 20 + r() * 60, 1); } }
}));
export const tileTexture = (a = '#d9d6cc', b = '#c4c0b4') => tex(mk(128, 128, (g, w, h) => {
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 64, y * 64, 64, 64); }
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.strokeRect(0.5, 0.5, 127, 127);
}));
