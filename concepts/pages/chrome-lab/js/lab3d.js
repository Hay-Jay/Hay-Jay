// MONOCHROME® — CHROME LAB. One modular Three.js scene, loaded by pages that ask for it (html[data-gl]):
//
//   hero     (home)       a liquid-mercury blob that buds into droplets, gathers into the emblem ring and star, returns face-on behind
//                         the Worldwide teaser and re-forms into the emblem above the footer. Driven by scroll position.
//   tunnel   (/gallery/)  the camera dives through the ring into a chrome tunnel of product-photo planes (curved, rippling with scroll
//                         velocity, tilting toward the pointer, clickable) with a mirror floor, then exits to a re-pooled blob and the emblem.
//   ambient  (editorial)  a dim ring and star drifting behind the page. No blob on phones. With a [data-gl-host] element on the page
//                         (product pages) it renders into that small box instead of the full screen: a ring/star accent.
//   off                   nothing is loaded.
//
// Each page is its own document, so a context is never kept alive across navigation (cross-document view transitions cover the hop).
// Performance: pixel ratio is capped and self-lowers when frames are slow; rendering pauses while the tab is hidden (and, for the accent,
// while it is off screen); reduced motion renders still frames. If WebGL or this module fails, core.js falls back to the plain DOM.
import * as THREE from '../assets/vendor/three.module.min.js';

const MC = window.MC;
if (MC && MC.gl) boot().catch(err => { console.warn('[chrome-lab] 3D scene unavailable, using the plain page.', err && err.message); MC.glFailed(); });

async function boot() {
  const MODE = MC.mode;                                       // hero | tunnel | ambient
  const GALLERY = MODE === 'tunnel' && !!MC.gallery && MC.gallery.length > 0;
  const HERO = MODE === 'hero';
  const reduce = !!MC.reduce;
  const host = MODE === 'ambient' ? document.querySelector('[data-gl-host]') : null;
  const ACCENT = !!host;
  const PAGE = document.documentElement.dataset.page;
  const $ = id => document.getElementById(id);
  const stage = $('glStage'), veil = $('veil');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mobileGPU = Math.min(innerWidth, innerHeight) < 700;
  const GP = .06;                       // share of the runway spent diving through the ring before the first piece
  const USE_BLOB = HERO || GALLERY || (MODE === 'ambient' && !ACCENT && !mobileGPU && ['about', 'contact', 'notfound'].includes(PAGE));
  const USE_DROPS = HERO || GALLERY;

  // ------------------------------------------------------------------ renderer
  const canvas = document.createElement('canvas');
  if (!ACCENT) canvas.className = 'gl';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: ACCENT || devicePixelRatio < 2.5, alpha: ACCENT,
    powerPreference: ACCENT || MODE === 'ambient' ? 'low-power' : 'high-performance'
  });
  renderer.setClearColor(ACCENT ? 0x000000 : 0x030304, ACCENT ? 0 : 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // iOS reclaims GL contexts under memory pressure. Give the browser a moment to hand it back; if it does not, fall back to the plain page.
  let lost = false, dead = false, lostT = 0;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; clearTimeout(lostT); lostT = setTimeout(giveUp, 2500); });
  canvas.addEventListener('webglcontextrestored', () => {
    clearTimeout(lostT); lost = false; last = performance.now();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, .02).texture;   // render targets do not survive a lost context
    loop();
  });
  function giveUp() { dead = true; cancelAnimationFrame(raf); canvas.remove(); if (veil) veil.style.opacity = 0; MC.glFailed(); }
  const dprMax = ACCENT ? 2 : mobileGPU ? (MODE === 'ambient' ? 1.25 : 1.5) : (MODE === 'ambient' ? 1.5 : 2);
  let dprCap = dprMax;
  const root = document.documentElement;
  const rad = THREE.MathUtils.degToRad;

  // Studio lighting baked into an environment map: black room, hard white soft-boxes. That contrast is what reads as chrome.
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020203);
  const box = (w, h, d, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(i) }));
    m.position.set(x, y, z); env.add(m);
  };
  box(14, .4, 14, 0, 7, 0, 6);        // overhead
  box(14, .2, 14, 0, -7, 0, .06);     // dim floor
  // a ring of vertical strips at different widths and brightness: this is what gives the liquid its streaky highlights
  const strips = [[0, 1.4, 5], [40, .6, 2.2], [75, 1.8, 6], [118, .8, 1.2], [160, 1.2, 4], [205, .5, 2.8], [245, 1.6, 1.4], [285, .9, 6], [325, .7, 2]];
  strips.forEach(([deg, w, inten]) => { const a = deg * Math.PI / 180; box(w, 11, .35, Math.sin(a) * 9, 0, Math.cos(a) * 9, inten); });
  box(10, .3, .3, 0, -2, 7, 3);       // front low edge
  box(3, 3, .3, 2, 2, -8, 3);         // rear panel
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(env, .02).texture;

  const scene = new THREE.Scene();
  scene.environment = envMap;
  if (!ACCENT) scene.fog = new THREE.Fog(0x030304, 20, 78);
  const FOV = 38;
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 220);

  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xeeeef2, metalness: 1, roughness: .05, envMapIntensity: 1.25, clearcoat: .6, clearcoatRoughness: .05 });

  // ------------------------------------------------------------------ the rig: blob, droplets, ring and star
  let blob = null, blobShader = null;
  if (USE_BLOB) {
    const blobMat = chrome.clone();
    blobMat.onBeforeCompile = s => {
      s.uniforms.uTime = { value: 0 };
      s.uniforms.uAmp = { value: .27 };
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
  float n=snoise(d*1.1+vec3(0.0,uTime*.2,uTime*.12))+.32*snoise(d*2.3-uTime*.17);
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
      blobShader = s;
    };
    blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, MODE === 'ambient' ? 24 : mobileGPU ? 32 : 44), blobMat);
  }

  const orbit = new THREE.Group();
  const R = 2.35;
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(R, .026, ACCENT ? 14 : 20, ACCENT ? 160 : 260), chrome));
  const sh = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? .26 : 1;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sh.closePath();
  const starGeo = new THREE.ExtrudeGeometry(sh, { depth: .22, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 6, curveSegments: 6 });
  starGeo.center();
  const star = new THREE.Mesh(starGeo, chrome);
  orbit.add(star);

  // Droplets: bud off the blob, orbit it, then settle onto the ring.
  const ND = 22;
  let drops = null, dp = null;
  const rnd = (j, k) => { const x = Math.sin(j * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  if (USE_DROPS) {
    drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 18), chrome, ND);
    drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    drops.frustumCulled = false;
    dp = Array.from({ length: ND }, (_, j) => ({
      th: rnd(j, 2) * 6.283, ph: Math.acos(2 * rnd(j, 4) - 1), r: 1.9 + 1.7 * rnd(j, 1), sp: (.1 + .26 * rnd(j, 3)) * (j % 2 ? 1 : -1), s: .09 + .17 * rnd(j, 5)
    }));
  }

  let dust = null;
  if (!ACCENT) {
    const N = mobileGPU ? 140 : 260, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 2.8 + Math.random() * 3.4, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b) * .8, r * Math.sin(b) * Math.sin(a)], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: .02, transparent: true, opacity: .5, depthWrite: false }));
  }

  const rig = new THREE.Group();
  [blob, orbit, drops, dust].forEach(o => o && rig.add(o));
  scene.add(rig);

  // ------------------------------------------------------------------ tunnel: path, hoops, floor, glow, dust (gallery page only)
  const items = GALLERY ? MC.gallery : [], N = items.length;
  const DZ = 7;                         // world units between pieces
  const L = DZ * N + 9;                 // length of the gallery travel (9 extra: the camera clears the last piece and no more)
  const FLOOR = -2.55;
  const pathAmp = z => sstep(-2, -26, z);
  const pathX = z => 2.1 * pathAmp(z) * Math.sin(z * .15);
  const pathY = z => .45 * pathAmp(z) * Math.sin(z * .105 + 1.0);

  const tunnel = new THREE.Group();
  tunnel.visible = false;
  const tunnelFade = [];                // [material, base opacity]
  const fl = { value: 1 };              // global tunnel opacity shared by custom shaders
  if (GALLERY) {
    scene.add(tunnel);
    const nH = Math.ceil((L + 90) / 6);
    const hoopMat = chrome.clone(); hoopMat.transparent = true; hoopMat.color.setScalar(.62); hoopMat.roughness = .16; hoopMat.envMapIntensity = 1.1;
    tunnelFade.push([hoopMat, 1]);
    const hoops = new THREE.InstancedMesh(new THREE.TorusGeometry(6.2, .03, 10, 140), hoopMat, nH);
    hoops.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), eu = new THREE.Euler();
    for (let i = 0; i < nH; i++) {
      const z = -3 - i * 6;
      const yaw = Math.atan2(pathX(z + 1) - pathX(z - 1), 2);
      q.setFromEuler(eu.set(0, yaw, 0));
      m4.compose(v3.set(pathX(z), pathY(z), z), q, one);
      hoops.setMatrixAt(i, m4);
    }
    tunnel.add(hoops);

    // Mirror floor with a hairline grid that fades into the dark.
    const floorMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uOp: fl },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uOp; varying vec3 vW;
        void main(){
          vec2 g = vW.xz/2.0; vec2 gr = abs(fract(g-.5)-.5)/fwidth(g);
          float line = 1.-min(min(gr.x,gr.y),1.);
          float d = distance(vW, cameraPosition);
          float fade = exp(-d*.045);
          float lane = exp(-abs(vW.x)*.12);
          vec3 col = vec3(.78,.8,.86)*(line*.2*fade + .012*lane);
          gl_FragColor = vec4(col, (line*.9+.5)*fade*uOp);
        }`
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, L + 160), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, -(L + 160) / 2 + 20);
    floor.renderOrder = 0; floor.frustumCulled = false;
    tunnel.add(floor);

    // Light at the end of the tunnel.
    const glowMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uOp: fl },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uOp; varying vec2 vUv; void main(){ float r = length(vUv-.5)*2.; float a = pow(max(1.-r,0.),2.6)*.34*uOp; gl_FragColor = vec4(vec3(.86,.88,.95)*a, a); }`
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), glowMat);
    glow.position.set(pathX(-L - 90), 1, -L - 90); glow.frustumCulled = false;
    tunnel.add(glow);

    const nD = mobileGPU ? 500 : 900, dpos = new Float32Array(nD * 3);
    for (let i = 0; i < nD; i++) dpos.set([(Math.random() - .5) * 18, FLOOR + Math.random() * 8, 6 - Math.random() * (L + 90)], i * 3);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    const tdMat = new THREE.PointsMaterial({ color: 0xffffff, size: .05, transparent: true, opacity: .55, depthWrite: false });
    tunnelFade.push([tdMat, .55]);
    const tdust = new THREE.Points(dg, tdMat); tdust.frustumCulled = false;
    tunnel.add(tdust);
  }

  // ------------------------------------------------------------------ gallery planes
  const VERT = `
    uniform float uTime, uVel, uCurve, uHover, uReflect, uFloorY, uIndex;
    varying vec2 vUv; varying float vDepth; varying float vFloorD;
    void main(){
      vUv = uv;
      vec3 p = position;                         // unit plane: -.5..+.5
      float cx = p.x*2., cy = p.y*2.;
      p.xy *= 1. + uHover*.04;
      p.z += uCurve*cx*cx;                       // static cylinder: the sheet wraps toward the viewer
      float v = uVel;
      p.z += v*.9*(1.-cy*cy)*(.55+.45*cos(cx*1.5708));                // sail billow with speed
      p.z += v*.16*sin(cy*5.2 - uTime*5. + uIndex*1.9)*(.4+.6*abs(cx)); // ripple running up the sheet
      p.x += v*.06*cy;                           // shear
      p.z += uHover*.18;
      vec4 wp = modelMatrix*vec4(p,1.);
      if(uReflect>.5){ wp.y = 2.*uFloorY - wp.y; }
      vFloorD = abs(wp.y - uFloorY);
      vec4 mv = viewMatrix*wp;
      vDepth = -mv.z;
      gl_Position = projectionMatrix*mv;
    }`;
  const FRAG = `
    uniform sampler2D uTex;
    uniform float uLoaded, uTime, uVel, uHover, uFocus, uReflect, uIndex, uAspect, uTexAspect, uOp, uZoom;
    varying vec2 vUv; varying float vDepth; varying float vFloorD;
    void main(){
      float r = uAspect/uTexAspect;
      vec2 s = r>1. ? vec2(1.,1./r) : vec2(r,1.);
      vec2 uv = (vUv-.5)*s/uZoom + .5;
      float ca = (.0025 + abs(uVel)*.012)*(.5+uHover);
      vec3 col = vec3(texture2D(uTex, uv+vec2(ca,0.)).r, texture2D(uTex, uv).g, texture2D(uTex, uv-vec2(ca,0.)).b);
      float l = dot(col, vec3(.299,.587,.114));
      float cm = clamp(uFocus*.5 + uHover*.95, 0., 1.);
      col = mix(vec3(l), col, cm);                      // monochrome until you point at it
      col = col*1.06 + (col-.5)*.04;
      // skeleton while the photo streams in
      vec3 sk = vec3(.05) + vec3(.035)*smoothstep(.45,.5,fract(vUv.y*14. - uTime*.5 + vUv.x*2.));
      col = mix(sk, col, uLoaded);
      // chrome hairline + travelling glint
      vec2 e = min(vUv, 1.-vUv); vec2 w = fwidth(vUv);
      float b = max(1.-smoothstep(0.,w.x*1.6,e.x), 1.-smoothstep(0.,w.y*1.6,e.y));
      col = mix(col, vec3(.86,.88,.93), b*(.55+.4*uFocus+.4*uHover));
      float d = vUv.x*.7 + vUv.y*.3;
      float pos = fract(uTime*.05 + uIndex*.37)*2.4 - .7;
      col += exp(-pow((d-pos)*6.5,2.))*.11*(.5+uFocus);
      col *= mix(.8, 1., smoothstep(0., .22, min(e.x*uAspect, e.y)));
      float far = 1. - smoothstep(24., 52., vDepth);
      float near = smoothstep(2.6, 5.8, vDepth);       // a passing plane has dissolved before it can cover the screen
      float a = far*near*uOp;
      if(uReflect>.5){ a *= exp(-vFloorD*.62)*.42; }
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }`;
  const planes = [];
  const meshes = [];
  const itemsGroup = new THREE.Group();
  const loader = GALLERY ? new THREE.TextureLoader() : null;
  if (loader) loader.setCrossOrigin('anonymous');
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (GALLERY) {
    const planeGeo = new THREE.PlaneGeometry(1, 1, 22, 22);
    scene.add(itemsGroup);
    items.forEach((it, i) => {
      const u = {
        uTex: { value: null }, uLoaded: { value: 0 }, uTime: { value: 0 }, uVel: { value: 0 }, uHover: { value: 0 }, uFocus: { value: 0 },
        uReflect: { value: 0 }, uIndex: { value: i }, uAspect: { value: 1 }, uTexAspect: { value: clamp(it.w / it.ht, .3, 3) }, uOp: fl,
        uCurve: { value: .32 }, uFloorY: { value: FLOOR }, uZoom: { value: it.zoom || 1 }
      };
      const mk = refl => {
        const mat = new THREE.ShaderMaterial({
          uniforms: { ...u, uReflect: { value: refl } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: !refl, side: THREE.DoubleSide
        });
        const m = new THREE.Mesh(planeGeo, mat);
        m.frustumCulled = false; m.renderOrder = refl ? 1 : 2;
        itemsGroup.add(m); return m;
      };
      const mesh = mk(0), refl = mk(1);
      mesh.userData.i = i;
      meshes.push(mesh);
      planes.push({ mesh, refl, u, i, hover: 0, focus: 0, loaded: 0, state: 'idle', hi: 0, tex: null, texHi: null, baseW: 800, hiW: 800, w: 1, h: 1, ox: 0, oy: 0, z: -DZ * (i + .5) - 8, pos: new THREE.Vector3(), rx0: 0, ry0: 0, side: i % 2 ? -1 : 1, fy: Math.sin(i * 2.1) * .16, aspect: 1 });
    });
  }

  // texture streaming, two tiers. Every piece loads a light texture (nearest first, three at a time) so the tunnel is never empty;
  // the piece in focus and its neighbours then upgrade to a texture sized for the screen (device pixels x zoom), and pieces that
  // fall three or more steps behind give the big one back. That keeps chrome jewellery sharp without holding 17 large textures.
  let active = 0;
  const texSetup = tex => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; return tex; };
  function evict(p) { if (p.texHi) { p.texHi.dispose(); p.texHi = null; } p.hi = 0; if (p.tex) p.u.uTex.value = p.tex; }
  function load(p, big) {
    active++;
    if (big) p.hi = 1; else p.state = 'loading';
    const url = MC.safeUrl(MC.sized(items[p.i].src, big ? p.hiW : p.baseW));
    const fin = ok => { active--; if (!big) p.state = ok ? 'ready' : 'failed'; else if (!ok) p.hi = 3; pump(); };
    loader.load(url, tex => {
      texSetup(tex);
      if (!big) { p.tex = tex; p.u.uTex.value = p.texHi || tex; p.u.uTexAspect.value = clamp(tex.image.width / tex.image.height, .3, 3); }
      else if (p.hi === 1) { p.texHi = tex; p.hi = 2; p.u.uTex.value = tex; }
      else tex.dispose();                                            // evicted while it was downloading
      fin(true);
    }, undefined, () => fin(false));
  }
  function pump() {
    if (!GALLERY || dead) return;
    const near = scrollY > M.gt - M.H * 1.5;                         // do not spend bandwidth on big textures while the tunnel is far away
    while (active < 3) {
      let best = null, bs = 1e9, big = false;
      for (const p of planes) {
        const d = Math.abs(p.i - MC.focusIdx);
        if (p.state === 'idle') { if (d < bs) { bs = d; best = p; big = false; } }
        else if (near && p.state === 'ready' && p.hi === 0 && d <= 1 && p.hiW > p.baseW * 1.2 && d + .75 < bs) { bs = d + .75; best = p; big = true; }
      }
      if (!best) return;
      load(best, big);
    }
  }
  function trimTextures(fi) { for (const p of planes) if (p.hi === 2 && Math.abs(p.i - fi) >= 3) evict(p); }

  // ------------------------------------------------------------------ layout + metrics
  const M = { H: 1, W: 1, gt: 0, R: 1, ft: 0, bt: 0, wt: 0, st: 0, fin: 0, doc: 1 };
  let Z0 = 8.5, D = 8, portrait = false, aspect = 1, keys = [];
  const topOf = el => el ? el.getBoundingClientRect().top + scrollY : 0;
  const secs = {
    gallery: $('gallery'), finale: $('finale') || $('end'),
    featured: $('featured'), brand: $('brand'), world: $('world'), signal: $('signal')
  };

  const _F = new THREE.Vector3(), _R = new THREE.Vector3(), _U = new THREE.Vector3(), _C = new THREE.Vector3(), _T = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
  function layoutGallery() {
    if (!GALLERY) return;
    const visH = 2 * D * Math.tan(rad(FOV / 2)), visW = visH * aspect;
    const maxW = visW * (portrait ? .78 : .34), maxH = visH * (portrait ? .34 : .5);
    const gutter = (portrait ? 14 : 24) / M.W * visW;               // keep at least this much air between a focused piece and the screen edge
    const dpr = Math.min(devicePixelRatio || 1, dprMax);
    planes.forEach(p => {
      const it = items[p.i], zoom = it.zoom || 1;
      const a = clamp(it.w / it.ht, .55, 1.9);
      let w = maxW, h = w / a; if (h > maxH) { h = maxH; w = h * a; }
      p.w = w; p.h = h; p.aspect = w / h; p.u.uAspect.value = p.aspect; p.z = -DZ * (p.i + .5) - D;
      p.mesh.scale.set(w, h, 1); p.refl.scale.set(w, h, 1);
      p.u.uCurve.value = .12 * w * (portrait ? .7 : 1.2);
      // lateral/vertical offset is measured in the CAMERA's frame at the moment this piece is in focus (not along the path at the
      // plane's own z), so the tunnel's weave can never push a focused piece off screen. The clamp guarantees the gutter on any aspect.
      const lim = Math.max(0, visW / 2 - gutter - w / 2 * 1.07);
      p.ox = clamp(p.side * (portrait ? visW * .075 : visW * .245), -lim, lim);
      p.oy = portrait ? visH * .1 : visH * .045;
      const cf = p.z + D;
      _C.set(pathX(cf), pathY(cf), cf); _T.set(pathX(cf - 10), pathY(cf - 10), cf - 10);
      _F.subVectors(_T, _C).normalize(); _R.crossVectors(_F, _Y).normalize(); _U.crossVectors(_R, _F);
      p.pos.copy(_C).addScaledVector(_F, D).addScaledVector(_R, p.ox).addScaledVector(_U, p.oy + p.fy);
      const dx = _C.x - p.pos.x, dy = _C.y - p.pos.y, dz = _C.z - p.pos.z;
      p.ry0 = Math.atan2(dx, dz) * .9 - p.side * .1;                 // turn toward the camera, a touch less than fully
      p.rx0 = -Math.atan2(dy, Math.hypot(dx, dz)) * .4;
      // texture sizes: light for the stream, big for the focus (device pixels across the plane x zoom, over the share of the texture shown)
      p.baseW = (mobileGPU ? 700 : 800) * (zoom > 1 ? 1.5 : 1);
      const tAsp = clamp(it.w / it.ht, .3, 3), r = p.aspect / tAsp, sx = r > 1 ? 1 : r;
      const need = (w / visW * M.W) * dpr * zoom / sx * 1.12;
      p.hiW = Math.min(1600, it.w, Math.ceil(need / 100) * 100);
    });
  }

  // ---- scroll key-frames for the blob / ring / droplets / tunnel (hero and tunnel modes) ----
  function buildKeys() {
    const H = M.H, P = portrait;
    const HX = P ? 0 : .56, HY = P ? .34 + clamp((760 - H) / 760, 0, .3) * .5 : .24, HS = P ? .78 * clamp(H / 844, .62, 1) : .9;
    const SX = P ? 0 : .54;
    const base = { blob: 1, drops: 0, dropR: 0, pull: 0, ring: 0, star: 0, face: 0, sx: HX, sy: HY, sc: HS, tun: 0, dim: 0 };
    const k = [];
    const add = (at, o) => { const prev = k.length ? k[k.length - 1] : base; const at2 = k.length ? Math.max(at, prev.at + 2) : at; k.push({ ...prev, ...o, at: at2 }); };
    add(0, {});
    if (reduce) {                                       // reduced motion: just the hero blob, fading away as the page scrolls on
      add(H * .9, { sc: HS * 1.15, dim: .7 });
      add(H * 1.5, { blob: 0, dim: .7 });
      keys = k; return;
    }
    if (GALLERY) {
      // the page opens face-on at the ring; scrolling dives through it into the tunnel
      k.length = 0;
      const { gt, R: Rn, fin } = M, ge = gt + Rn;
      k.push({ ...base, blob: 0, drops: 0, dropR: 1, pull: 1, ring: 1, star: 1, face: 1, sx: 0, sy: 0, sc: P ? .6 : .95, tun: 0, dim: 0, at: 0 });
      add(gt + Math.max(2, gt) , {});
      add(gt + GP * Rn * .55, { tun: 0 });
      add(gt + GP * Rn * .98, { tun: 1 });
      add(gt + GP * Rn * 1.03, { ring: 1, star: 1 });
      add(gt + GP * Rn * 1.1, { ring: 0, star: 0 });
      // tunnel exit: the blob re-pools at the right while the tunnel falls away. The page below is lit, not veiled.
      add(ge, { blob: 0, sx: P ? .6 : .55, sy: P ? .78 : .1, sc: P ? .4 : .8, face: 0, dim: 0, tun: 1 });
      add(ge + .22 * H, { blob: .4, sx: P ? .6 : .56, sy: P ? .78 : .11, sc: P ? .4 : .82, dim: .1, tun: .8 });
      add(ge + .6 * H, { blob: .6, sx: P ? .6 : .58, sy: P ? .78 : .12, sc: P ? .4 : .85, dim: P ? .4 : .3, tun: .45 });
      // finale: blob + tilted ring + orbiting star re-form into the emblem, centred and unveiled
      add(Math.max(fin - .15 * H, ge + .62 * H), { ring: 1, star: 1, blob: 1, face: 0, sx: 0, sy: P ? .3 : .2, sc: P ? .6 : 1.0, dim: .06, tun: .1 });
      add(Math.max(M.doc - H, fin + 10), { sy: P ? .34 : .24, sc: P ? .62 : 1.02, dim: 0 });
      keys = k; return;
    }
    // HERO (home page): blob -> droplets -> ring -> Worldwide ring -> blob -> emblem
    const { ft, bt, wt, st, fin } = M;
    add(Math.max(ft - .55 * H, 10), { sc: HS * 1.04, sy: HY - (P ? 0 : .05) });
    add(ft + .1 * H, { blob: .72, drops: 1, dropR: .3, sx: SX, sy: P ? .66 : .08, sc: P ? .5 : .8, dim: P ? .5 : .32 });
    add(bt - .25 * H, { blob: .3, drops: 1, dropR: 1, sx: SX, sy: P ? .66 : .06, sc: P ? .5 : .95, dim: P ? .45 : .2 });
    add(bt + .3 * H, { blob: 0, drops: 1, dropR: 1.05, pull: .85, ring: 1, star: 1, face: .4, sx: P ? .3 : .44, sy: P ? .72 : .02, sc: P ? .46 : .95, dim: P ? .5 : .12 });
    add(bt + .9 * H, { blob: 0, drops: 0, dropR: 1, pull: 1, ring: 1, star: 1, face: 1, sx: P ? .3 : .42, sy: P ? .72 : 0, sc: P ? .46 : .98, dim: P ? .5 : .16 });
    // worldwide: the ring is large and face-on behind the heading
    add(wt - .1 * H, { sx: P ? .25 : .32, sy: P ? .74 : .04, sc: P ? .44 : 1.1, dim: P ? .52 : .26 });
    add(wt + .45 * H, { sx: P ? .25 : .36, sy: P ? .74 : .02, sc: P ? .44 : 1.0, dim: P ? .52 : .3 });
    // signal: the ring lets go, the blob comes back top right, out of the way of the form
    add(Math.max(st - .35 * H, wt + .6 * H), { ring: 0, star: 0, blob: .9, face: 0, sx: P ? .6 : .62, sy: P ? .78 : .45, sc: P ? .4 : .62, dim: P ? .5 : .32 });
    // finale: blob + tilted ring + orbiting star re-form into the emblem, centred and unveiled
    add(Math.max(fin - .15 * H, st + .1 * H), { ring: 1, star: 1, blob: 1, face: 0, sx: 0, sy: P ? .3 : .2, sc: P ? .6 : 1.0, dim: .06 });
    add(Math.max(M.doc - H, fin + 10), { sy: P ? .34 : .24, sc: P ? .62 : 1.02, dim: 0 });
    keys = k;
  }
  const S = { blob: 1, drops: 0, dropR: 0, pull: 0, ring: 0, star: 0, face: 0, sx: 0, sy: 0, sc: 1, tun: 0, dim: 0 };
  const FIELDS = Object.keys(S);
  function evalKeys(s) {
    const n = keys.length;
    if (!n) return;
    if (s <= keys[0].at) { for (const f of FIELDS) S[f] = keys[0][f]; return; }
    if (s >= keys[n - 1].at) { for (const f of FIELDS) S[f] = keys[n - 1][f]; return; }
    let i = 0; while (i < n - 2 && s >= keys[i + 1].at) i++;
    const a = keys[i], b = keys[i + 1], t = sstep(a.at, b.at, s);
    for (const f of FIELDS) S[f] = lerp(a[f], b[f], t);
  }

  // ---- ambient poses: where the ring sits behind each editorial page ----
  function ambientPose() {
    const P = portrait;
    const poses = {
      about: { sx: .6, sy: .08, sc: 1.1, dim: .36 },
      shipping: { sx: .62, sy: .32, sc: .8, dim: .5 },
      faq: { sx: .66, sy: .3, sc: .85, dim: .48 },
      contact: { sx: .56, sy: .04, sc: 1.0, dim: .42 },
      notfound: { sx: .46, sy: .02, sc: 1.1, dim: .22 }
    };
    const p = poses[PAGE] || poses.about;
    if (P) return { sx: .52, sy: .72, sc: .42, dim: .55 };
    return p;
  }

  function measure() {
    if (ACCENT) {
      const r = host.getBoundingClientRect();
      M.W = Math.max(1, Math.round(r.width)); M.H = Math.max(1, Math.round(r.height));
      aspect = M.W / M.H; portrait = false; Z0 = 8.5;
      return;
    }
    M.H = innerHeight; M.W = innerWidth; aspect = M.W / M.H; portrait = aspect < .85;
    Z0 = portrait ? 11.5 : 8.5; D = portrait ? 6.4 : 8;
    M.doc = document.documentElement.scrollHeight;
    if (GALLERY) {
      M.gt = topOf(secs.gallery); M.R = Math.max(1, secs.gallery.offsetHeight - stage.offsetHeight);
      M.fin = secs.finale ? topOf(secs.finale) : Math.max(0, M.doc - M.H);
      layoutGallery(); buildKeys();
    } else if (HERO) {
      M.ft = topOf(secs.featured); M.bt = topOf(secs.brand); M.wt = topOf(secs.world); M.st = topOf(secs.signal);
      M.fin = secs.finale && secs.finale.offsetParent ? topOf(secs.finale) : Math.max(0, M.doc - M.H);
      buildKeys();
    }
  }

  function resize() {
    measure();
    renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
    if (ACCENT) renderer.setSize(M.W, M.H, false); else renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    if (reduce) renderFrame(performance.now(), true);
  }

  // ------------------------------------------------------------------ camera path along the gallery
  const gp = GP;
  function camZof(s) {
    const { gt, R: Rn, H } = M, ge = gt + Rn;
    if (!GALLERY || s <= gt) return Z0;
    const T = gp * Rn;
    if (s <= gt + T) {                                // the dive through the ring: a Hermite curve that meets the tunnel speed
      const t = (s - gt) / T, v = L / (Rn * (1 - gp)) * T;
      const h00 = 2 * t * t * t - 3 * t * t + 1, h11 = t * t * t - t * t;
      return h00 * Z0 + h11 * -v;
    }
    if (s <= ge) return -L * (s - gt - T) / (Rn * (1 - gp));
    return -L - sstep(0, .6 * H, s - ge) * 6;
  }

  // ------------------------------------------------------------------ pointer + picking
  const ptr = new THREE.Vector2(), ptrS = new THREE.Vector2();
  let ptrOnStage = false, ptrMoved = false;
  if (!ACCENT) {
    addEventListener('pointermove', e => {
      ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
      ptrOnStage = e.target === stage; ptrMoved = true;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { ptrOnStage = false; });
  } else {
    // the accent follows the pointer anywhere on the page, a little
    addEventListener('pointermove', e => { ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); }, { passive: true });
  }
  const ray = new THREE.Raycaster();
  let hoverIdx = -1;
  function pick(ndc) {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false);
    for (const h of hit) { const p = planes[h.object.userData.i]; if (h.distance > 4 && h.distance < 30 && p.u.uOp.value > .3) return h.object.userData.i; /* nearer than 4 the plane has already dissolved */ }
    return -1;
  }
  if (GALLERY) {
    stage.addEventListener('click', e => {
      if (e.target !== stage) return;
      const ndc = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
      itemsGroup.updateMatrixWorld(true);
      const i = inGallery ? pick(ndc) : -1;
      if (i >= 0) MC.openPiece(items[i].h);
    });
  }

  // scroll position (px) at which piece i is in focus, and the scroll distance between two pieces
  const itemY = i => M.gt + M.R * (GP + (1 - GP) * (DZ * (i + .5)) / L);
  const spacingPx = () => M.R * (1 - GP) * DZ / L;
  let settledIdx = -1;
  // jump the page so piece i is in focus (rail buttons, keyboard focus on the accessible list)
  function scrollToItem(i, instant) {
    settledIdx = i;
    if (!instant && !reduce) { snapY = itemY(i); snapFrom = scrollY; snapT = performance.now(); }
    scrollTo({ top: itemY(i), behavior: instant || reduce ? 'instant' : 'smooth' });
  }

  // SETTLE. Without this you rest between two pieces: the caption has already flipped but the old photo is still a smear in front of
  // you. When scrolling pauses inside the tunnel the page eases to a piece. A small deliberate nudge goes to the NEXT piece in that
  // direction (so one wheel notch or an arrow key still advances), a bigger move goes to the nearest. Past the first or last piece it
  // lets go, so the tunnel is never a trap. Never fights a finger, a held scrollbar or reduced motion.
  let settleT = 0, mouseDown = false, touchDown = false, snapY = null, snapFrom = 0, snapT = 0, glideAt = -1;
  function settle() {
    if (!GALLERY || reduce || dead || mouseDown || touchDown || document.hidden) return;
    // our own glide is still on its way (a slow frame can stall the scroll events for a while): never re-decide mid-glide. Any wheel,
    // key, touch or pointer press clears snapY, so if it is still set the user has not taken over. Re-issue the glide if it stalled.
    if (snapY !== null) {
      const lo = Math.min(snapFrom, snapY) - 40, hi = Math.max(snapFrom, snapY) + 40;        // outside that span someone else scrolled (anchor link, jump)
      if (Math.abs(scrollY - snapY) <= 3 || performance.now() - snapT > 6000 || scrollY < lo || scrollY > hi) snapY = null;
      else {
        if (performance.now() - snapT > 1400 && scrollY === glideAt) scrollTo({ top: snapY, behavior: 'smooth' });
        glideAt = scrollY; clearTimeout(settleT); settleT = setTimeout(settle, 160); return;
      }
    }
    const sp = spacingPx(), f = (scrollY - itemY(0)) / sp;           // f = continuous piece index under the camera
    if (f < -.35 || f > N - 1 + .35) { settledIdx = -1; return; }
    let t = Math.round(f);
    if (settledIdx >= 0) { const d = f - settledIdx; if (Math.abs(d) > .06 && Math.abs(d) < .5) t = settledIdx + Math.sign(d); }
    if (t < 0 || t > N - 1) { settledIdx = -1; return; }              // nudged past the end: leave the tunnel
    settledIdx = t;
    const y = itemY(t);
    if (Math.abs(y - scrollY) > 3) { snapY = y; snapFrom = scrollY; snapT = performance.now(); scrollTo({ top: y, behavior: 'smooth' }); }
  }
  if (GALLERY && !reduce) {
    const arm = () => { clearTimeout(settleT); settleT = setTimeout(settle, 170); };
    addEventListener('scroll', arm, { passive: true });
    ['wheel', 'keydown', 'touchstart', 'pointerdown', 'click'].forEach(t => addEventListener(t, () => { snapY = null; }, { passive: true }));   // the user has taken over
    addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') mouseDown = true; });
    addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { mouseDown = false; arm(); } });
    addEventListener('touchstart', e => { touchDown = e.touches.length > 0; }, { passive: true });
    ['touchend', 'touchcancel'].forEach(t => addEventListener(t, e => { touchDown = e.touches.length > 0; if (!touchDown) arm(); }, { passive: true }));
  }

  // ------------------------------------------------------------------ frame loop
  const tmp = new THREE.Vector3(), tgt = new THREE.Vector3(), dummy = new THREE.Object3D(), mixv = new THREE.Vector3(), ringv = new THREE.Vector3();
  let time = 0, last = performance.now(), ss = scrollY, prevSs = ss, vel = 0, mouseX = 0, mouseY = 0, yaw = 0, spin = 0, inGallery = false, lastFocus = -1, lastG = -1, lastCapo = -1, lastUi = -1, frameNo = 0, snap = true, shown = false;
  const halfAtD = () => Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * Z0;
  const fine = () => matchMedia('(hover:hover) and (pointer:fine)').matches;

  function renderFrame(now, still) {
    if (lost || dead) return;
    const dtR = (now - last) / 1000, dt = Math.min(dtR, .05), dtS = Math.min(dtR, .12); last = now;
    if (!reduce) time += dt;
    // smoothed scroll: the scene glides behind the page
    const ts = scrollY;
    ss = (still || snap) ? ts : ss + (ts - ss) * (1 - Math.pow(.0007, dtS)); snap = false;
    const vRaw = dt > 0 ? (ss - prevSs) / dt : 0; prevSs = ss;
    vel += (clamp(vRaw / (M.H * 1.5), -1.4, 1.4) - vel) * (1 - Math.pow(.004, dt));
    const velA = reduce ? 0 : Math.tanh(vel * 1.1) * .75;

    ptrS.lerp(ptr, 1 - Math.pow(.02, dt));
    mouseX += (ptr.x - mouseX) * .06; mouseY += (ptr.y - mouseY) * .06;

    // ---------------- accent: a small ring + star in the product panel
    if (ACCENT) {
      camera.position.set(0, 0, Z0); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      rig.position.set(0, 0, 0); rig.scale.setScalar(.9); rig.rotation.set(0, 0, 0);
      orbit.visible = true; orbit.scale.setScalar(1);
      orbit.rotation.set(1.0 + Math.sin(time * .35) * .18 - mouseY * .35, .25 + Math.cos(time * .27) * .2 + mouseX * .45, -.5 + time * .12);
      const a = time * .8;
      star.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); star.rotation.set(0, 0, a * 2); star.scale.setScalar(.3); star.visible = true;
      renderer.render(scene, camera);
      if (!shown) { shown = true; host.classList.add('live'); }
      frameNo++;
      return;
    }

    // ---------------- full-screen scenes
    if (HERO || GALLERY) evalKeys(ss);
    else {
      const p = ambientPose();
      S.sx = p.sx; S.sc = p.sc; S.dim = p.dim; S.ring = 1; S.star = 1; S.face = 0; S.blob = USE_BLOB ? .9 : 0; S.drops = 0; S.pull = 0; S.tun = 0;
      S.sy = p.sy + ss / Math.max(1, M.doc) * (portrait ? -.05 : -.35);          // drifts slowly as the page scrolls
    }
    const camZ = camZof(ss);
    const { gt, R: Rn } = M, ge = gt + Rn;
    const attached = !GALLERY || ss < gt || ss >= ge;
    inGallery = GALLERY && ss > gt + gp * Rn * .6 && ss < ge + M.H * .2;

    // ---- camera
    const wv = GALLERY ? pathAmp(camZ) : 0;
    camera.position.set(pathX(camZ) + ptrS.x * .3 * wv, pathY(camZ) + ptrS.y * .16 * wv, camZ);
    tgt.set(pathX(camZ - 10) + ptrS.x * .6 * wv, pathY(camZ - 10) + ptrS.y * .3 * wv, camZ - 10);
    const roll = clamp((pathX(camZ - 10) - pathX(camZ)) * -.012 + ptrS.x * -.012 * wv, -.1, .1);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(tgt);
    const fovT = FOV + Math.abs(velA) * 7 * wv;
    if (Math.abs(camera.fov - fovT) > .01) { camera.fov += (fovT - camera.fov) * .2; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();

    // ---- rig
    const half = halfAtD(), halfW = half * aspect;
    if (attached) { tmp.set(S.sx * halfW, S.sy * half, -Z0); camera.localToWorld(tmp); rig.position.copy(tmp); }
    else rig.position.set(S.sx * halfW, S.sy * half, 0);
    rig.scale.setScalar(Math.max(S.sc, .001));
    rig.visible = S.sc > .01 && (S.blob > .01 || S.ring > .01 || S.drops > .01);

    spin += (clamp(vRaw * .0004, -.12, .12) - spin) * .08;
    yaw += reduce ? 0 : dt * .12 + spin;
    const free = 1 - S.face;
    rig.rotation.y = yaw * free;
    rig.rotation.x = -mouseY * .3 * free;

    if (blob) {
      blob.visible = S.blob > .01;
      blob.scale.setScalar(Math.max(S.blob, .0001) * (1 + Math.abs(velA) * .08));
      blob.rotation.y = -time * .08 + mouseX * .4;
      if (blobShader) { blobShader.uniforms.uTime.value = time; blobShader.uniforms.uAmp.value = .27 + Math.abs(velA) * .14 + S.drops * .03; }
    }

    orbit.visible = S.ring > .01;
    orbit.scale.setScalar(Math.max(S.ring, .0001));
    orbit.rotation.set(lerp(1.15, 0, S.face), lerp(.15, 0, S.face), lerp(-.55 + time * .05, 0, S.face));
    orbit.updateMatrix();
    const a = time * .55;
    star.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    star.rotation.set(0, 0, a * 2);
    star.scale.setScalar(.26 * S.star);
    star.visible = S.star > .01;
    if (dust) { dust.rotation.y = time * .02; dust.material.opacity = .5 * clamp(S.blob + S.ring, 0, 1); }

    if (drops) {
      drops.visible = S.drops > .01;
      if (drops.visible) {
        const hide = 1 - sstep(.55, 1, S.pull);
        for (let j = 0; j < ND; j++) {
          const d = dp[j], th = d.th + time * d.sp;
          // on the blob's skin -> out on an orbit -> along the ring
          const ux = Math.sin(d.ph) * Math.cos(th), uy = Math.cos(d.ph) * .7, uz = Math.sin(d.ph) * Math.sin(th);
          const rr = lerp(1.25, d.r, clamp(S.dropR, 0, 1)) * Math.max(1, S.dropR);
          mixv.set(ux * rr, uy * rr, uz * rr);
          const ra = j / ND * 6.2832 + time * .1;
          ringv.set(Math.cos(ra) * R, Math.sin(ra) * R, 0).applyMatrix4(orbit.matrix);
          mixv.lerp(ringv, sstep(0, 1, S.pull));
          dummy.position.copy(mixv);
          dummy.scale.setScalar(Math.max(d.s * (1 + .25 * Math.sin(time * 1.6 + j)) * S.drops * hide, .0001));
          dummy.updateMatrix();
          drops.setMatrixAt(j, dummy.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
      }
    }

    // ---- tunnel + gallery
    if (GALLERY) {
      fl.value = S.tun;
      tunnel.visible = S.tun > .01;
      tunnelFade.forEach(([m, o]) => { m.opacity = o * S.tun; });
      itemsGroup.visible = S.tun > .01;
      const u = -camZ;                                // metres travelled down the tunnel
      const fi = clamp(Math.round(u / DZ - .5), 0, N - 1);
      if (inGallery && fi !== lastFocus) { lastFocus = fi; MC.setFocus(fi); trimTextures(fi); pump(); }
      if (itemsGroup.visible) {
        for (const p of planes) {
          p.mesh.position.set(p.pos.x, p.pos.y + Math.sin(time * .6 + p.i) * .05, p.pos.z); p.refl.position.copy(p.mesh.position);
          const near = 1 - clamp(Math.abs(p.z + D - camZ) / 14, 0, 1);
          const w = .35 + near * .65;
          p.mesh.rotation.set(p.rx0 - ptrS.y * .16 * w, p.ry0 + ptrS.x * .26 * w, 0); p.refl.rotation.copy(p.mesh.rotation);
        }
      }
      for (const p of planes) {
        p.focus += ((p.i === fi && inGallery ? 1 : 0) - p.focus) * (1 - Math.pow(.01, dt));
        p.hover += ((p.i === hoverIdx ? 1 : 0) - p.hover) * (1 - Math.pow(.003, dt));
        p.loaded = Math.min(1, p.loaded + (p.state === 'ready' ? dt * 1.6 : 0));
        const U = p.u; U.uTime.value = time; U.uVel.value = velA; U.uHover.value = p.hover; U.uFocus.value = p.focus; U.uLoaded.value = p.loaded;
      }
      // pointer picking
      if (inGallery && ptrMoved && ptrOnStage && fine()) {
        itemsGroup.updateMatrixWorld(true);
        const i = pick(ptr);
        if (i !== hoverIdx) { hoverIdx = i; MC.setHover(i); }
      } else if ((!ptrOnStage || !inGallery) && hoverIdx !== -1) { hoverIdx = -1; MC.setHover(-1); }
      ptrMoved = false;

      // DOM hooks
      const g = clamp((ss - gt) / Rn, 0, 1);
      const uEnd = DZ * (N - .5);                      // metres travelled when the last piece is in focus
      const capo = sstep(.2, 3, u) * (1 - sstep(uEnd + 5, uEnd + 11, u));     // fully in by the first piece, fades only once we are past the last
      if (Math.abs(g - lastG) > .0004) { stage.style.setProperty('--g', g.toFixed(4)); lastG = g; }
      if (Math.abs(capo - lastCapo) > .02 || (capo === 0) !== (lastCapo === 0)) { stage.style.setProperty('--capo', capo.toFixed(2)); lastCapo = capo; }
      const ui = 1 - sstep(uEnd + 5, uEnd + 11, u);
      if (Math.abs(ui - lastUi) > .02) { stage.style.setProperty('--ui', ui.toFixed(2)); lastUi = ui; }
      MC.state.g = g;
    }
    MC.state.depth = Math.max(0, Z0 - camZ); MC.state.vel = velA; MC.state.camZ = camZ;
    if (veil) veil.style.opacity = S.dim.toFixed(3);
    if (!GALLERY && HERO && reduce) canvas.style.opacity = clamp(1 - (ss - M.H * .6) / (M.H * .9), 0, 1).toFixed(3);

    renderer.render(scene, camera);
    frameNo++;
  }

  // adaptive resolution: if the GPU struggles, drop the pixel ratio a step instead of dropping frames; if it then runs comfortably for a
  // while (the first seconds are slow while shaders compile and textures upload), climb back up. At most two climbs, so it cannot oscillate.
  // On the lowest rungs the grain layer and the glint animation are switched off as well (the .lowfx class).
  let acc = 0, cnt = 0, good = 0, climbs = 0;
  const applyDpr = () => { renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap)); if (ACCENT) renderer.setSize(M.W, M.H, false); else renderer.setSize(innerWidth, innerHeight, false); if (!ACCENT) root.classList.toggle('lowfx', dprCap <= 1.25 && dprMax > 1.25); };
  function perf(dt) {
    acc += dt; cnt++;
    if (cnt < 90) return;
    const avg = acc / cnt; acc = 0; cnt = 0;
    if (avg > .032 && dprCap > 1) { dprCap = Math.max(1, dprCap - .25); good = 0; applyDpr(); }
    else if (avg < .02 && dprCap < dprMax && climbs < 2) { if (++good >= 4) { good = 0; climbs++; dprCap = Math.min(dprMax, dprCap + .25); applyDpr(); } }
    else good = 0;
  }
  let raf = 0, lastNow = 0, onScreen = true;
  function tick(now) {
    raf = 0;
    if (document.hidden || reduce || lost || dead || !onScreen) return;
    renderFrame(now);
    if (lastNow) perf((now - lastNow) / 1000);
    lastNow = now; loop();
  }
  function loop() { if (!raf) raf = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', () => { last = performance.now(); lastNow = 0; if (!document.hidden) loop(); });
  if (ACCENT && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => { onScreen = es[es.length - 1].isIntersecting; if (onScreen) { last = performance.now(); lastNow = 0; loop(); } }).observe(host);
  }
  if (reduce && !ACCENT) { ['scroll', 'resize'].forEach(t => addEventListener(t, () => renderFrame(performance.now(), true), { passive: true })); }
  if (ACCENT) host.appendChild(canvas); else document.body.prepend(canvas);
  addEventListener('resize', resize);
  if (!ACCENT) {
    addEventListener('load', () => { measure(); if (reduce) renderFrame(performance.now(), true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if ('ResizeObserver' in window) { let t = 0; new ResizeObserver(() => { cancelAnimationFrame(t); t = requestAnimationFrame(measure); }).observe(document.body); }
  }
  resize();
  renderFrame(performance.now(), true);
  loop();
  if (GALLERY) { pump(); const pt = setInterval(() => { pump(); if (planes.every(p => p.state === 'ready' || p.state === 'failed')) clearInterval(pt); }, 1200); }

  // handed to the page scripts
  MC.glReady({
    focusItem: (i, instant) => scrollToItem(i, instant), itemY, spacingPx, settle, N, DZ, L, GP,
    scene, camera, renderer, S, planes, M, camZof,
    jump(y) { scrollTo({ top: y, behavior: 'instant' }); snap = true; }
  });
}
