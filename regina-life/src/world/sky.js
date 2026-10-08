import * as THREE from 'three';
import { sunPosition, reginaClock, seasonOf, sunTimes } from '../core/time.js';
import { cloudTexture, glowTexture } from './textures.js';

const lerpC = (a, b, t) => a.clone().lerp(b, t);
const C = (h) => new THREE.Color(h);
const SKY = {
  night:   { top: C('#050a1c'), hor: C('#101a35') },
  twilight:{ top: C('#2a3b6e'), hor: C('#e9946a') },
  dawn:    { top: C('#4a73b8'), hor: C('#f7c28f') },
  day:     { top: C('#2f6fd0'), hor: C('#a9cdf2') },
};

/** Sky dome, sun/moon, clouds, stars, fog, lighting and precipitation – driven by Regina time + weather. */
export class Atmosphere {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: C('#2f6fd0') }, hor: { value: C('#a9cdf2') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C('#fff3d6') }, sunAmt: { value: 1 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 top,hor,sunDir,sunCol; uniform float sunAmt;
        void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(hor, top, pow(h,0.6));
          float s = max(dot(normalize(vP), normalize(sunDir)),0.0);
          c += sunCol * (pow(s,900.0)*2.0 + pow(s,12.0)*0.35) * sunAmt;
          c = mix(c, hor, smoothstep(0.0,-0.25,vP.y)); gl_FragColor = vec4(c,1.0); }`,
    }));
    this.dome.renderOrder = -10; scene.add(this.dome);

    const starGeo = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 900; i++) { const u = Math.random(), v = Math.random() * 0.95 + 0.05, th = u * Math.PI * 2, r = Math.sqrt(1 - v * v); sp.push(Math.cos(th) * r * 3800, v * 3800, Math.sin(th) * r * 3800); }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', map: glowTexture(), size: 5, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, alphaTest: 0.02 }));
    scene.add(this.stars);

    this.moon = new THREE.Mesh(new THREE.CircleGeometry(90, 32), new THREE.MeshBasicMaterial({ color: '#f1f1e6', fog: false, transparent: true }));
    scene.add(this.moon);

    this.hemi = new THREE.HemisphereLight('#cfe3ff', '#7a7560', 0.8); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.4); this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 600;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun, this.sun.target);
    this.fill = new THREE.AmbientLight('#8aa0c8', 0.0); scene.add(this.fill);
    this.fog = new THREE.Fog('#a9cdf2', 150, 1400); scene.fog = this.fog;

    // clouds
    this.clouds = []; const ct = [cloudTexture(3), cloudTexture(8), cloudTexture(14)];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
      const a = Math.random() * Math.PI * 2, r = 800 + Math.random() * 2400; m.position.set(Math.cos(a) * r, 520 + Math.random() * 380, Math.sin(a) * r);
      m.scale.set(900 + Math.random() * 700, 330 + Math.random() * 180, 1); m.userData.drift = 0.6 + Math.random() * 1.2; m.userData.a = a; m.userData.r = r; m.userData.h = m.position.y;
      scene.add(m); this.clouds.push(m);
    }
    this.precip = null; this.precipKind = 'none';
    this.env = { night: 0, sunAlt: 1, season: 'summer', snow: 0, cloud: 0.2, kind: 'clear', phase: 'day' };
    this._tmp = new THREE.Vector3();
  }

  _makePrecip(kind) {
    if (this.precip) { this.scene.remove(this.precip); this.precip.geometry.dispose(); this.precip.material.dispose(); this.precip = null; }
    this.precipKind = kind; if (kind === 'none') return;
    const n = kind === 'rain' ? 2600 : 2400, pos = new Float32Array(n * (kind === 'rain' ? 6 : 3));
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 80, y = Math.random() * 40, z = (Math.random() - 0.5) * 80;
      if (kind === 'rain') { pos.set([x, y, z, x, y + 0.9, z], i * 6); } else pos.set([x, y, z], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.precip = kind === 'rain'
      ? new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#b9cde6', transparent: true, opacity: 0.45, fog: true }))
      : new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
    this.precip.frustumCulled = false; this.scene.add(this.precip);
  }

  /** @param {Date} date Regina "now"  @param {object} weather from core/weather */
  setTime(date, weather) {
    if (this.indoor) { this.hemi.intensity = 0.55; this.hemi.color.set('#fff4e0'); this.hemi.groundColor.set('#8a7f70'); this.fill.intensity = 0.3; this.sun.visible = false; return this.env; }
    const sp = sunPosition(date); const alt = sp.altitude;
    const clock = reginaClock(date), season = seasonOf(clock.month);
    const altDeg = (alt * 180) / Math.PI;
    const night = THREE.MathUtils.smoothstep(-altDeg, -2, 10);                 // 0 day → 1 night
    const dusk = Math.max(0, 1 - Math.abs(altDeg - 1) / 9);                    // golden-hour weight
    // sky palette
    let top = lerpC(SKY.day.top, SKY.night.top, night), hor = lerpC(SKY.day.hor, SKY.night.hor, night);
    hor = lerpC(hor, SKY.twilight.hor, dusk * 0.85); top = lerpC(top, SKY.twilight.top, dusk * 0.5);
    const cloud = THREE.MathUtils.clamp((weather?.cloud ?? 20) / 100, 0, 1);
    const kind = weather?.kind ?? 'clear';
    const grey = (kind === 'rain' || kind === 'storm' || kind === 'snow' || kind === 'drizzle') ? 0.75 : kind === 'fog' ? 0.85 : cloud * 0.55;
    const greyCol = lerpC(C('#9aa3ad'), C('#262b33'), night);
    top.lerp(greyCol, grey); hor.lerp(greyCol, grey * 0.9);
    const u = this.dome.material.uniforms; u.top.value.copy(top); u.hor.value.copy(hor);
    // sun is placed in the sky: azimuth from south (westward +). Convert to world: +z = south, +x = east.
    const az = sp.azimuth, cosA = Math.cos(alt);
    const dir = this._tmp.set(-Math.sin(az) * cosA, Math.sin(alt), Math.cos(az) * cosA).normalize(); // x east: sun goes east→south→west
    u.sunDir.value.copy(dir); u.sunAmt.value = (1 - grey) * (alt > -0.05 ? 1 : 0);
    u.sunCol.value.set(alt < 0.25 ? '#ffb37a' : '#fff3d6');
    this.sunDir = dir.clone();
    // lights
    const dayAmt = 1 - night;
    this.sun.color.set(alt < 0.2 ? '#ffb27a' : '#fff0d4').lerp(C('#c8d3e6'), grey * 0.6);
    this.sun.intensity = Math.max(0.0, dayAmt * (2.6 - grey * 1.8)) + night * 0.35;
    if (night > 0.5) this.sun.color.set('#9db4e8');
    this.hemi.intensity = 0.3 + dayAmt * (0.75 - grey * 0.15) + night * 0.55;
    this.hemi.color.copy(lerpC(C('#cfe3ff'), C('#7f98d0'), night)); this.hemi.groundColor.copy(lerpC(C('#7a7560'), C('#3a4560'), night));
    this.fill.intensity = night * 0.55;
    const moonDir = this._tmp.set(-dir.x * 0.6 - 0.2, Math.max(0.25, -dir.y * 0.9 + 0.35), -dir.z * 0.6 + 0.3).normalize().clone();
    this.moonDir = moonDir; this.moon.material.opacity = night * (1 - grey); this.moon.visible = night > 0.05;
    this.stars.material.opacity = Math.max(0, night - 0.35) * (1 - grey) * 1.4;
    // fog colour tracks horizon
    const fogCol = hor.clone(); this.fog.color.copy(fogCol); this.scene.background = fogCol;
    this.baseFog = { near: kind === 'fog' ? 5 : 150, far: kind === 'fog' ? 200 : (kind === 'rain' || kind === 'snow' ? 700 : 1500) };
    this.fog.near = this.baseFog.near; this.fog.far = this.baseFog.far * (this.viewScale ?? 1);
    // clouds
    for (const c of this.clouds) { c.material.color.copy(lerpC(C('#ffffff'), greyCol, grey)).lerp(C('#1b2030'), night * 0.8); c.material.opacity = 0.9; }
    const show = Math.round(this.clouds.length * Math.max(0.12, cloud)); this.clouds.forEach((c, i) => (c.visible = i < show));
    // precipitation
    const pk = kind === 'rain' || kind === 'storm' || kind === 'drizzle' ? 'rain' : kind === 'snow' ? 'snow' : 'none';
    if (pk !== this.precipKind) this._makePrecip(pk);
    // snow cover: sticks in winter or after snowfall
    const snow = season === 'winter' ? 1 : (kind === 'snow' ? 0.6 : 0);
    this.env = { night, sunAlt: alt, season, snow, cloud, kind, phase: night > 0.85 ? 'night' : night > 0.15 ? 'twilight' : 'day', temp: weather?.temp };
    this.exposureBase = 0.9 + night * 0.15;
    return this.env;
  }

  update(dt, camera, target) {
    // dome & stars follow the camera so they never clip
    this.dome.position.copy(camera.position); this.stars.position.copy(camera.position);
    if (this.moonDir) this.moon.position.copy(camera.position).addScaledVector(this.moonDir, 3600);
    this.moon.lookAt(camera.position);
    // shadow light follows the player, snapped to texel grid to avoid shimmer
    const t = target, d = this.sunDir ?? new THREE.Vector3(0.3, 1, 0.2);
    const up = d.y > 0.05 ? d : new THREE.Vector3(0.2, 0.7, 0.2).normalize();
    const snap = 90 * 2 / 2048;
    const tx = Math.round(t.x / snap) * snap, tz = Math.round(t.z / snap) * snap;
    this.sun.target.position.set(tx, 0, tz); this.sun.position.set(tx + up.x * 300, up.y * 300, tz + up.z * 300);
    this.sun.visible = !this.indoor;
    for (const c of this.clouds) { c.userData.a += dt * 0.00018 * c.userData.drift; c.position.set(camera.position.x + Math.cos(c.userData.a) * c.userData.r, c.userData.h, camera.position.z + Math.sin(c.userData.a) * c.userData.r); }
    if (this.precip) {
      this.precip.position.set(camera.position.x, camera.position.y - 14, camera.position.z);
      const a = this.precip.geometry.attributes.position, arr = a.array, rain = this.precipKind === 'rain', stride = rain ? 6 : 3, n = arr.length / stride, fall = rain ? 34 : 2.2;
      for (let i = 0; i < n; i++) {
        const o = i * stride; arr[o + 1] -= fall * dt; if (!rain) { arr[o] += Math.sin(arr[o + 1] * 0.5 + i) * dt * 0.5; }
        if (arr[o + 1] < -2) { arr[o + 1] += 40; if (rain) arr[o + 4] = arr[o + 1] + 0.9; }
        else if (rain) arr[o + 4] = arr[o + 1] + 0.9;
      }
      a.needsUpdate = true;
    }
  }
}
