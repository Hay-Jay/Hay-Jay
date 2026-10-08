// Liquid-chrome companion: one fixed WebGL canvas. A morphing mercury blob, an orbiting ring and a star (the emblem, rebuilt in 3D)
// that glides to a new spot as each section scrolls into view.
// Falls back silently to the CSS emblem if WebGL is unavailable.
import * as THREE from './assets/vendor/three.module.min.js';

const portal = document.querySelector('.portal');
if (portal) boot().catch(() => {});

async function boot() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Studio lighting baked into an environment map: black room, hard white soft-boxes. That contrast is what reads as chrome.
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020203);
  const box = (w, h, d, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(i) }));
    m.position.set(x, y, z); env.add(m);
  };
  box(14, .4, 14, 0, 7, 0, 7);        // overhead
  box(.5, 9, 4, -7, 0, 1, 5);         // left strip
  box(.5, 9, 4, 7, 0, -1, 4);         // right strip
  box(10, .3, .3, 0, -2, 7, 3);       // front low edge
  box(3, 3, .3, 2, 2, -8, 4);         // rear panel
  box(14, .2, 14, 0, -7, 0, .25);     // dim floor
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(env, .02).texture;

  const scene = new THREE.Scene();
  scene.environment = envMap;
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
  camera.position.set(0, 0, 8);

  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xeeeef2, metalness: 1, roughness: .05, envMapIntensity: 1.5, clearcoat: .6, clearcoatRoughness: .05 });

  // Mercury blob: simplex-noise displacement injected into the vertex shader, with normals rebuilt from neighbouring samples.
  const blobMat = chrome.clone();
  let shader = null;
  blobMat.onBeforeCompile = s => {
    s.uniforms.uTime = { value: 0 };
    s.uniforms.uAmp = { value: .26 };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform float uAmp;
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 disp(vec3 p){
  vec3 d=normalize(p);
  float n=snoise(d*1.15+vec3(0.0,uTime*.22,uTime*.14))+.5*snoise(d*2.4-uTime*.18);
  return d*(1.0+uAmp*n);
}`)
      .replace('#include <beginnormal_vertex>', `
vec3 n0=normalize(position);
vec3 tg=normalize(cross(n0,abs(n0.y)>.99?vec3(1.0,0.0,0.0):vec3(0.0,1.0,0.0)));
vec3 bt=cross(n0,tg);
float e=.012;
vec3 q0=disp(n0); vec3 q1=disp(normalize(n0+tg*e)); vec3 q2=disp(normalize(n0+bt*e));
vec3 objectNormal=normalize(cross(q1-q0,q2-q0));
if(dot(objectNormal,n0)<0.0) objectNormal=-objectNormal;
#ifdef USE_TANGENT
vec3 objectTangent=vec3(tangent.xyz);
#endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed=disp(normalize(position))*1.3;');
    shader = s;
  };
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 48), blobMat);

  // Orbit ring and four-point star, as in the emblem.
  const orbit = new THREE.Group();
  orbit.rotation.set(1.15, .15, -.55);
  const R = 2.35;
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(R, .022, 20, 260), chrome));
  const sh = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? .26 : 1;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sh.closePath();
  const starGeo = new THREE.ExtrudeGeometry(sh, { depth: .22, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 6, curveSegments: 6 });
  starGeo.center();
  const star = new THREE.Mesh(starGeo, chrome);
  star.scale.setScalar(.26);
  orbit.add(star);

  // Dust
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 2.8 + Math.random() * 3.2, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b) * .8, r * Math.sin(b) * Math.sin(a)], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffffff, size: .018, transparent: true, opacity: .55, depthWrite: false }));

  const rig = new THREE.Group();
  rig.add(blob, orbit, dust);
  scene.add(rig);

  document.body.prepend(canvas);

  // Where the object sits for each section: [x, y, scale, opacity] with x/y in -1..1 of the viewport. Desktop / phone.
  const STOPS = {
    top:    { d: [.5, -.02, 1, 1],     m: [0, -.5, .8, 1] },
    about:  { d: [.62, .42, .42, .8],  m: [.85, .55, .4, .35] },
    drop:   { d: [0, 0, .001, 0],      m: [0, 0, .001, 0] },
    shop:   { d: [0, 0, .001, 0],      m: [0, 0, .001, 0] },
    events: { d: [.62, .45, .42, .8],  m: [.85, .5, .4, .35] },
    faq:    { d: [.68, 0, .8, .85],    m: [.85, .55, .4, .35] },
    connect:{ d: [.58, .42, .5, .9],   m: [.82, .5, .45, .4] }
  };
  const sections = Object.keys(STOPS).map(k => ({ k, el: document.getElementById(k) })).filter(x => x.el);
  const cur = { x: .5, y: 0, s: 1, o: 1 };
  const pick = () => {
    const mid = innerHeight * .5;
    let hit = sections[0];
    for (const x of sections) { const r = x.el.getBoundingClientRect(); if (r.top <= mid) hit = x; }
    return STOPS[hit.k][innerWidth < 820 ? 'm' : 'd'];
  };

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, w < 820 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < .9 ? 11 : 8.5;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();

  const mouse = new THREE.Vector2(), target = new THREE.Vector2();
  addEventListener('pointermove', e => { target.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); }, { passive: true });

  let time = 0, last = performance.now(), lastY = scrollY, spin = 0;
  function frame(now, still) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!reduce) time += dt;
    const k = reduce || still ? 1 : 1 - Math.pow(.0009, dt); // frame-rate independent easing
    const [tx, ty, ts, to] = pick();
    cur.x += (tx - cur.x) * k; cur.y += (ty - cur.y) * k; cur.s += (ts - cur.s) * k; cur.o += (to - cur.o) * k;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect;
    rig.position.set(cur.x * halfW, cur.y * halfH, 0);
    rig.scale.setScalar(Math.max(cur.s, .001));
    canvas.style.opacity = cur.o.toFixed(3);

    mouse.lerp(target, .06);
    const dy = scrollY - lastY; lastY = scrollY;
    spin += (dy * .004 - spin) * .08;                // scrolling whips the object round
    rig.rotation.y += (reduce ? 0 : dt * .12 + spin);
    rig.rotation.x += ((-mouse.y * .3) - rig.rotation.x) * .05;
    blob.rotation.y = -time * .08 + mouse.x * .4;
    orbit.rotation.z = -.55 + time * .05;
    const a = time * .55;
    star.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    star.rotation.set(0, 0, a * 2);
    dust.rotation.y = time * .02;
    if (shader) shader.uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }
  function loop() {
    if (document.hidden || reduce) return;
    requestAnimationFrame(now => { frame(now); loop(); });
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); loop(); });
  if (reduce) ['scroll', 'resize', 'pointermove'].forEach(t => addEventListener(t, () => frame(performance.now(), true), { passive: true }));
  frame(performance.now(), true);
  portal.classList.add('has-gl');
  loop();
}
