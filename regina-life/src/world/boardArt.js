/**
 * Billboard faces drawn on a 2D canvas: no three.js here, so the Advertise page (advertise.html) can show the very same art as a live preview
 * without loading the 3D engine. world/textures.js re-exports these for the game.
 */
/** Draw a billboard face. ad = { text, theme } or null (house "your ad here" panel). */
const imgCache = new Map();
/** Decode an uploaded ad image once; returns the Image when ready (and calls onReady when it becomes ready), else null. */
export function adImage(src, onReady) {
  if (typeof src !== 'string' || !src.startsWith('data:image/') || typeof Image === 'undefined') return null;
  let e = imgCache.get(src);
  if (!e) { const im = new Image(); e = { im, ok: false }; im.onload = () => { e.ok = true; onReady?.(); }; im.src = src; imgCache.set(src, e); if (imgCache.size > 24) imgCache.delete(imgCache.keys().next().value); }
  return e.ok ? e.im : null;
}
export function drawBillboard(canvas, ad, { tier = 'standard', priceLabel = '', onImage = null } = {}, themes) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const [c1, c2] = ad ? themes[ad.theme] ?? themes.prairie : tier === 'mega' ? ['#6a2cff', '#ff2d95'] : ['#0b8f86', '#2a74d6'];
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = -h; i < w; i += 36) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.lineTo(i + h + 14, 0); g.lineTo(i + 14, h); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8;
  const pic = ad?.image ? adImage(ad.image, onImage) : null;
  if (pic) { // an uploaded picture, cropped to fill the board, with a caption strip
    const k = Math.max(w / pic.width, h / pic.height), dw = pic.width * k, dh = pic.height * k; g.drawImage(pic, (w - dw) / 2, (h - dh) / 2, dw, dh);
    const cap = g.createLinearGradient(0, h * 0.62, 0, h); cap.addColorStop(0, 'rgba(0,0,0,0)'); cap.addColorStop(1, 'rgba(0,0,0,.72)'); g.shadowBlur = 0; g.fillStyle = cap; g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 46px "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif'; g.fillText(ad.text, w / 2, h - 52, w * 0.92);
    g.font = '600 16px system-ui,sans-serif'; g.globalAlpha = 0.8; g.fillText('Advertisement · virtual', w / 2, h - 20); g.globalAlpha = 1; return;
  }
  if (ad) {
    const words = ad.text.split(' '), lines = []; let cur = '';
    g.font = '800 54px "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > w * 0.86 && cur) { lines.push(cur); cur = wd; } else cur = t; }
    lines.push(cur);
    const size = lines.length > 2 ? 44 : 56; g.font = `800 ${size}px "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif`;
    const lh = size * 1.15, y0 = h / 2 - ((lines.length - 1) * lh) / 2 - 6;
    lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
    g.shadowBlur = 0; g.font = '600 18px system-ui,sans-serif'; g.globalAlpha = 0.85;
    g.fillText(ad.sponsored ? `Sponsored · ${ad.business} · ${ad.host}` : ad.house ? 'In-game sponsor' : 'Advertisement · virtual', w / 2, h - 22); g.globalAlpha = 1;
    if (ad.sponsored && ad.founding) { g.fillStyle = '#ffd24a'; g.fillRect(16, 16, 196, 30); g.fillStyle = '#2a1700'; g.font = '800 16px system-ui'; g.textAlign = 'center'; g.fillText('FOUNDING SPONSOR', 114, 32); }
  } else {
    g.font = '800 66px "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif'; g.fillText('YOUR AD HERE', w / 2, h * 0.38);
    g.shadowBlur = 0; g.font = '700 30px system-ui,sans-serif'; g.fillStyle = '#ffe58a'; g.fillText(priceLabel, w / 2, h * 0.62);
    g.font = '600 20px system-ui,sans-serif'; g.fillStyle = '#fff'; g.globalAlpha = 0.85; g.fillText('Book it in the Ads app on your phone', w / 2, h * 0.82); g.globalAlpha = 1;
    if (tier === 'mega') { g.fillStyle = '#ffd24a'; g.fillRect(w / 2 - 70, 16, 140, 28); g.fillStyle = '#2a1700'; g.font = '800 16px system-ui'; g.fillText('MEGA SCREEN', w / 2, 31); }
  }
}
