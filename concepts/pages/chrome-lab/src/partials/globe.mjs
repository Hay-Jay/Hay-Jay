// The "Worldwide" visual: a stylised dot-globe drawn at build time as inline SVG (no JS, no map data).
// Canada (Regina, the origin) and Nigeria are lit and joined by an arc; every other visible destination is a small bright dot.
// Labels are real HTML positioned over the SVG so they stay readable at any size. The full list lives in the page text.
const R = 232, C = 300, D2R = Math.PI / 180;
const LAT0 = 26 * D2R, LON0 = -48 * D2R;

// rough country centres (lat, lon) for the destinations the store ships to
const GEO = {
  AE: [24, 54], AT: [47.5, 14.5], AU: [-25, 134], BE: [50.6, 4.6], CA: [50.45, -104.6], CH: [46.8, 8.2], CZ: [49.8, 15.5], DE: [51, 10],
  DK: [56, 10], ES: [40, -4], FI: [64, 26], FR: [46.6, 2.5], GB: [54, -2], HK: [22.3, 114.2], IE: [53.2, -8], IL: [31, 35], IT: [42.5, 12.5],
  JP: [36, 138], KR: [36.5, 127.8], MY: [4.2, 102], NG: [9.1, 8.1], NL: [52.2, 5.3], NO: [61, 9], NZ: [-41, 174], PL: [52, 19.5], PT: [39.5, -8],
  SE: [62, 15], SG: [1.35, 103.8], US: [39.8, -98.5]
};

const proj = (latDeg, lonDeg, k = 1) => {
  const lat = latDeg * D2R, lon = lonDeg * D2R, dl = lon - LON0;
  const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(dl);
  const x = Math.cos(lat) * Math.sin(dl);
  const y = Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(dl);
  return { x: C + R * k * x, y: C - R * k * y, c: cosc };
};
const f = n => Math.round(n * 10) / 10;

export function globe(ctx, dest) {
  // dot lattice
  const N = 1500, tiers = [[], [], [], []];
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const z = 1 - 2 * (i + 0.5) / N, lat = Math.asin(z) / D2R, lon = ((i * GA) / D2R) % 360 - 180;
    const p = proj(lat, lon);
    if (p.c <= 0.02) continue;
    const t = p.c > 0.72 ? 0 : p.c > 0.45 ? 1 : p.c > 0.2 ? 2 : 3;
    tiers[t].push(`M${f(p.x)} ${f(p.y)}h.01`);
  }
  // graticule: meridians + parallels, visible parts only
  const grat = [];
  const seg = (pts) => { let d = '', pen = false; for (const p of pts) { if (p.c > 0.02) { d += (pen ? 'L' : 'M') + f(p.x) + ' ' + f(p.y); pen = true; } else pen = false; } return d; };
  for (let lon = -180; lon < 180; lon += 30) { const pts = []; for (let lat = -90; lat <= 90; lat += 3) pts.push(proj(lat, lon)); grat.push(seg(pts)); }
  for (let lat = -60; lat <= 60; lat += 30) { const pts = []; for (let lon = -180; lon <= 180; lon += 3) pts.push(proj(lat, lon)); grat.push(seg(pts)); }

  // destination dots
  const dots = [];
  for (const code of dest.codes) {
    if (code === 'CA' || code === 'NG' || !GEO[code]) continue;
    const p = proj(GEO[code][0], GEO[code][1]);
    if (p.c > 0.06) dots.push(`<g class="g-dot"><circle cx="${f(p.x)}" cy="${f(p.y)}" r="9" class="halo"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r="3.2"/></g>`);
  }
  const far = dest.codes.filter(c => c !== 'CA' && c !== 'NG' && GEO[c] && proj(GEO[c][0], GEO[c][1]).c <= 0.06).length;

  // arc Regina -> Nigeria, lifted off the surface
  const a = GEO.CA, b = GEO.NG;
  const v = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];
  const va = v(...a), vb = v(...b);
  const om = Math.acos(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]);
  const arc = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
    const w = [va[0] * s1 + vb[0] * s2, va[1] * s1 + vb[1] * s2, va[2] * s1 + vb[2] * s2];
    const lat = Math.asin(w[2]) / D2R, lon = Math.atan2(w[1], w[0]) / D2R;
    const p = proj(lat, lon, 1 + 0.2 * Math.sin(Math.PI * t));
    arc.push(`${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`);
  }
  const pCA = proj(...GEO.CA), pNG = proj(...GEO.NG);
  const pct = p => `left:${f(p.x / 6)}%;top:${f(p.y / 6)}%`;

  const names = dest.name;
  const desc = `Diagram of a globe. An arc joins Regina in Canada, where orders ship from, to Nigeria. ${dest.count} destinations are served in total: ${dest.sorted.map(names).join(', ')}.`;

  return `<figure class="globe" data-globe>
    <div class="globe-box">
      <svg viewBox="0 0 600 600" role="img" aria-labelledby="globe-t globe-d" class="globe-svg">
        <title id="globe-t">Worldwide shipping from Canada to ${dest.count} destinations, Nigeria included</title>
        <desc id="globe-d">${desc.replace(/&/g, '&amp;')}</desc>
        <defs>
          <radialGradient id="g-sphere" cx="34%" cy="30%" r="80%"><stop offset="0" stop-color="#2a2b31"/><stop offset=".55" stop-color="#0c0c0f"/><stop offset="1" stop-color="#030304"/></radialGradient>
          <radialGradient id="g-rim" cx="50%" cy="50%" r="50%"><stop offset=".86" stop-color="#fff" stop-opacity="0"/><stop offset=".985" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></radialGradient>
          <linearGradient id="g-arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9cbd1"/></linearGradient>
        </defs>
        <g class="orbit o1"><ellipse cx="${C}" cy="${C}" rx="${R * 1.2}" ry="${R * 0.34}" transform="rotate(-24 ${C} ${C})"/></g>
        <g class="orbit o2"><ellipse cx="${C}" cy="${C}" rx="${R * 1.1}" ry="${R * 0.22}" transform="rotate(34 ${C} ${C})"/></g>
        <circle cx="${C}" cy="${C}" r="${R}" fill="url(#g-sphere)"/>
        <path class="grat" d="${grat.join('')}"/>
        <path class="dots d3" d="${tiers[3].join('')}"/>
        <path class="dots d2" d="${tiers[2].join('')}"/>
        <path class="dots d1" d="${tiers[1].join('')}"/>
        <path class="dots d0" d="${tiers[0].join('')}"/>
        <circle cx="${C}" cy="${C}" r="${R}" fill="url(#g-rim)"/>
        ${dots.join('')}
        <path class="arc-glow" d="${arc.join('')}"/>
        <path class="arc" d="${arc.join('')}"/>
        <g class="mark ca"><circle class="pulse" cx="${f(pCA.x)}" cy="${f(pCA.y)}" r="9"/><circle cx="${f(pCA.x)}" cy="${f(pCA.y)}" r="6.5"/></g>
        <g class="mark ng"><circle class="pulse" cx="${f(pNG.x)}" cy="${f(pNG.y)}" r="9"/><circle cx="${f(pNG.x)}" cy="${f(pNG.y)}" r="6.5"/></g>
        <g class="star-orbit" aria-hidden="true"><path d="M0-15Q1.6-1.6 15 0Q1.6 1.6 0 15Q-1.6 1.6-15 0Q-1.6-1.6 0-15Z"/></g>
      </svg>
      <span class="g-label ca" style="${pct(pCA)}"><b>CANADA</b><em>Origin / free standard shipping</em></span>
      <span class="g-label ng" style="${pct(pNG)}"><b>NIGERIA</b><em>Delivered / rate at checkout</em></span>
    </div>
    <figcaption class="mono">ORBIT 01 / REGINA SK TO NIGERIA${far ? ` / +${far} DESTINATIONS ON THE FAR SIDE` : ''}</figcaption>
  </figure>`;
}
