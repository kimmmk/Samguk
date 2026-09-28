'use strict';
/* ===== 3D 엔진: 렌더러 · 하늘 · 셀 셰이딩 재질 · 파티클 · 이펙트 · 사운드 · 캐릭터/군마 빌더 · 전장 배경 =====
   원작의 좌표(px)·시간(프레임)은 PX · /60 으로 변환해 사용한다. */
const T = window.THREE;
if (T.ColorManagement && 'legacyMode' in T.ColorManagement) T.ColorManagement.legacyMode = false;
const PX = 0.028;                      // 원작 1px → 3D 단위
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const rnd = rand;
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const col = h => new T.Color(h);
const UP = new T.Vector3(0, 1, 0);
const W = { t: 0, hitstop: 0, shake: 0, slow: 0, flash: 0, exposure: 1.1 };

/* ---------------- renderer ---------------- */
const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.setClearColor(0x0d1122);
$('#gl').appendChild(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(36, 1, 0.1, 1000);
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uExposure: { value: 1.1 }, uSat: { value: 1.1 }, uTint: { value: new T.Vector3(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uExposure; uniform float uSat; uniform vec3 uTint; varying vec2 vUv;
    vec3 aces(vec3 x){ vec3 a = x*(2.51*x+0.03); vec3 b = x*(2.43*x+0.59)+0.14; return clamp(a/b, 0.0, 1.0); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb * uExposure * uTint;
      c = aces(c); c = pow(c, vec3(1.0/2.2));
      float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, uSat);
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.55;
      gl_FragColor = vec4(c, 1.0);
    }`
};
let composer = null, gradePass = null, bloomPass = null;
try {
  if (T.EffectComposer && T.UnrealBloomPass) {
    composer = new T.EffectComposer(renderer, new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType }));
    composer.addPass(new T.RenderPass(scene, camera));
    bloomPass = new T.UnrealBloomPass(new T.Vector2(512, 512), 0.45, 0.5, 0.95); composer.addPass(bloomPass);
    gradePass = new T.ShaderPass(GradeShader); composer.addPass(gradePass);
  }
} catch (e) { composer = null; }
if (!composer) { renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; }

/* ---------------- lights / sky ---------------- */
const hemi = new T.HemisphereLight(0xcfe4ff, 0x7a9a50, 0.85); scene.add(hemi);
const sun = new T.DirectionalLight(0xffffff, 1.3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 16, bottom: -14, near: 1, far: 150 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const sunDir = new T.Vector3(0.3, 0.6, -0.7).normalize();
const pointLights = [0, 1, 2].map(() => { const l = new T.PointLight(0xff8a3a, 0, 24, 2); scene.add(l); return l; });
const NOISE_GLSL = `
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1.0,0.0)), f.x), mix(h21(i+vec2(0.0,1.0)), h21(i+vec2(1.0,1.0)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vn(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }`;
const SKY_U = { uTop: { value: col(0x3d8fe6) }, uHor: { value: col(0xcdeeff) }, uSun: { value: col(0xfff2d0) }, uDir: { value: new T.Vector3(0, .5, -1).normalize() },
  uCloud: { value: col(0xffffff) }, uTime: { value: 0 }, uMoon: { value: 0 }, uStars: { value: 0 }, uCloudAmt: { value: 0.5 } };
const sky = new T.Mesh(new T.SphereGeometry(460, 48, 24), new T.ShaderMaterial({
  uniforms: SKY_U, side: T.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec3 vDir; uniform vec3 uTop, uHor, uSun, uDir, uCloud; uniform float uTime, uMoon, uStars, uCloudAmt;
    ${NOISE_GLSL}
    void main(){
      vec3 d = normalize(vDir); vec3 sd = normalize(uDir); float h = clamp(d.y, 0.0, 1.0);
      vec3 c = mix(uHor, uTop, pow(h, 0.5)); c = mix(c, uHor * 0.8, smoothstep(0.0, -0.25, d.y));
      float s = max(dot(d, sd), 0.0);
      c += uSun * (smoothstep(0.99925, 0.9996, s) * mix(7.0, 2.4, uMoon) + pow(s, 22.0) * 0.4 + pow(s, 4.0) * 0.14 * (1.0 - uMoon * 0.6));
      if (uStars > 0.0) { vec2 sp = d.xz / (d.y + 0.35) * 170.0; float r = h21(floor(sp));
        c += vec3(step(0.9955, r) * uStars * smoothstep(0.05, 0.4, d.y) * (0.55 + 0.45 * sin(uTime * 3.0 + r * 60.0)) * 1.6); }
      if (d.y > 0.0) { vec2 cp = d.xz / (d.y + 0.16) * 1.5 + vec2(uTime * 0.012, uTime * 0.004); float n = fbm(cp);
        float m = smoothstep(1.02 - uCloudAmt, 1.16 - uCloudAmt, n) * smoothstep(0.02, 0.22, d.y);
        vec3 cc = uCloud * mix(0.72, 1.12, smoothstep(0.55, 0.82, n)) + uSun * pow(s, 6.0) * 0.5; c = mix(c, cc, m * 0.92); }
      gl_FragColor = vec4(c, 1.0);
    }`
}));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

/* ---------------- materials ---------------- */
const GRAD = (() => { const t = new T.DataTexture(new Uint8Array([105,105,105,255, 185,185,185,255, 255,255,255,255]), 3, 1, T.RGBAFormat);
  t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const RIM_U = { value: new T.Color(0.2, 0.19, 0.16) };
function rimPatch(sh) {
  sh.uniforms.uRim = RIM_U;
  sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
    '{ float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition))); gl_FragColor.rgb += smoothstep(0.62, 0.82, fr) * uRim; }\n#include <dithering_fragment>');
}
const MATS = new Map();
function toon(c, o = {}) {
  const key = (!o.noCache && (!o.map || (o.map.userData && o.map.userData.keep))) ? `${c}|${o.map ? o.map.uuid : ''}|${o.emissive || 0}|${o.ei || 1}|${o.side || 0}|${o.opacity || 1}|${o.alphaTest || 0}` : null;
  if (key && MATS.has(key)) return MATS.get(key);
  const m = new T.MeshToonMaterial({ color: c, gradientMap: GRAD, map: o.map || null, side: o.side || T.FrontSide, alphaTest: o.alphaTest || 0 });
  if (o.opacity) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
  if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.ei || 1; }
  m.onBeforeCompile = rimPatch; m.customProgramCacheKey = () => 'rim';
  if (key) { m.userData.shared = true; MATS.set(key, m); }
  return m;
}
function glowMat(c, k = 3, add = false) {
  const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(k) });
  if (add) { m.transparent = true; m.blending = T.AdditiveBlending; m.depthWrite = false; }
  return m;
}
const OUTLINE = new T.MeshBasicMaterial({ color: 0x17121d, side: T.BackSide }); OUTLINE.userData.shared = true;
const FLASH_MAT = new T.MeshBasicMaterial({ color: new T.Color(1.6, 1.55, 1.45) }); FLASH_MAT.userData.shared = true;
const EYE_HI = new T.MeshBasicMaterial({ color: 0xffffff }); EYE_HI.userData.shared = true;
const GC = new Map();
const geo = (k, f) => { if (!GC.has(k)) { const g = f(); g.userData.shared = true; GC.set(k, g); } return GC.get(k); };

/* ---------------- particles ---------------- */
const PVS = `attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vC;
  void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`;
const PFS_ADD = `varying vec4 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = 1.0 - smoothstep(0.0, 1.0, r); a *= a; gl_FragColor = vec4(vC.rgb, vC.a * a); }`;
const PFS_N = `varying vec4 vC; void main(){ vec2 q = gl_PointCoord - 0.5; q.x *= 1.6; float r = length(q) * 2.0; if (r > 1.0) discard; float a = 1.0 - smoothstep(0.75, 1.0, r); gl_FragColor = vec4(vC.rgb * (0.85 + 0.3 * (0.5 - gl_PointCoord.y)), vC.a * a); }`;
class PSys {
  constructor(max, add) {
    this.max = max; this.n = 0;
    this.P = new Float32Array(max * 3); this.V = new Float32Array(max * 3); this.C = new Float32Array(max * 3);
    this.L = new Float32Array(max); this.M = new Float32Array(max); this.S = new Float32Array(max);
    this.Gr = new Float32Array(max); this.D = new Float32Array(max); this.Wb = new Float32Array(max);
    const g = new T.BufferGeometry();
    this.ap = new T.BufferAttribute(new Float32Array(max * 3), 3); this.ac = new T.BufferAttribute(new Float32Array(max * 4), 4); this.as = new T.BufferAttribute(new Float32Array(max), 1);
    [this.ap, this.ac, this.as].forEach(a => a.setUsage(T.DynamicDrawUsage));
    g.setAttribute('position', this.ap); g.setAttribute('aCol', this.ac); g.setAttribute('aSize', this.as); this.g = g;
    this.mat = new T.ShaderMaterial({ uniforms: { uScale: { value: 500 } }, vertexShader: PVS, fragmentShader: add ? PFS_ADD : PFS_N, transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending });
    this.obj = new T.Points(g, this.mat); this.obj.frustumCulled = false; scene.add(this.obj);
  }
  emit(x, y, z, vx, vy, vz, life, size, c, grav = 0, drag = 0, k = 1, wob = 0) {
    if (this.n >= this.max) return;
    const i = this.n++, i3 = i * 3;
    this.P[i3] = x; this.P[i3 + 1] = y; this.P[i3 + 2] = z; this.V[i3] = vx; this.V[i3 + 1] = vy; this.V[i3 + 2] = vz;
    this.C[i3] = c.r * k; this.C[i3 + 1] = c.g * k; this.C[i3 + 2] = c.b * k;
    this.L[i] = life; this.M[i] = life; this.S[i] = size; this.Gr[i] = grav; this.D[i] = drag; this.Wb[i] = wob;
  }
  mv(a, b) { const a3 = a * 3, b3 = b * 3; for (let k = 0; k < 3; k++) { this.P[b3 + k] = this.P[a3 + k]; this.V[b3 + k] = this.V[a3 + k]; this.C[b3 + k] = this.C[a3 + k]; }
    this.L[b] = this.L[a]; this.M[b] = this.M[a]; this.S[b] = this.S[a]; this.Gr[b] = this.Gr[a]; this.D[b] = this.D[a]; this.Wb[b] = this.Wb[a]; }
  update(dt) {
    const P = this.P, V = this.V, ap = this.ap.array, ac = this.ac.array, as = this.as.array; let i = 0;
    while (i < this.n) {
      this.L[i] -= dt; if (this.L[i] <= 0) { this.n--; this.mv(this.n, i); continue; }
      const i3 = i * 3; V[i3 + 1] -= this.Gr[i] * dt;
      const dr = Math.exp(-this.D[i] * dt); V[i3] *= dr; V[i3 + 1] *= dr; V[i3 + 2] *= dr;
      if (this.Wb[i]) { V[i3] += Math.sin(W.t * 2.1 + i) * this.Wb[i] * dt; V[i3 + 2] += Math.cos(W.t * 1.7 + i * .7) * this.Wb[i] * dt; }
      P[i3] += V[i3] * dt; P[i3 + 1] += V[i3 + 1] * dt; P[i3 + 2] += V[i3 + 2] * dt;
      if (P[i3 + 1] < 0.03 && this.Gr[i] > 0) { P[i3 + 1] = 0.03; V[i3 + 1] *= -0.3; V[i3] *= 0.6; V[i3 + 2] *= 0.6; }
      const lf = this.L[i] / this.M[i], a = Math.min(1, lf * 2.5) * Math.min(1, (1 - lf) * 14);
      ap[i3] = P[i3]; ap[i3 + 1] = P[i3 + 1]; ap[i3 + 2] = P[i3 + 2];
      ac[i * 4] = this.C[i3]; ac[i * 4 + 1] = this.C[i3 + 1]; ac[i * 4 + 2] = this.C[i3 + 2]; ac[i * 4 + 3] = a;
      as[i] = this.S[i] * (0.45 + 0.55 * Math.min(1, lf * 2)); i++;
    }
    this.g.setDrawRange(0, this.n); this.ap.needsUpdate = this.ac.needsUpdate = this.as.needsUpdate = true;
  }
}
const PA = new PSys(5000, true), PN = new PSys(3000, false);
const tmpC = new T.Color();
function sparks(x, y, z, c, n = 14, k = 2.4) {
  const cc = col(c);
  for (let i = 0; i < n; i++) PA.emit(x, y, z, rand(-7, 7), rand(-2, 7), rand(-3, 3), rand(.18, .42), rand(.07, .18), cc, 14, 3, k);
  PA.emit(x, y, z, 0, 0, 0, .13, 1.6, tmpC.setRGB(1, 1, 1), 0, 0, 1.4); PA.emit(x, y, z, 0, 0, 0, .18, 1.1, cc, 0, 0, 1.8);
}
function dust(x, z, n = 10, s = 1, c = 0xd8c8a8) {
  const cc = col(c);
  for (let i = 0; i < n; i++) PN.emit(x + rand(-.4, .4), .15, z + rand(-.3, .3), rand(-2.5, 2.5) * s, rand(.5, 2), rand(-1.2, 1.2), rand(.4, .8), rand(.5, 1) * s, cc, -.5, 2.5, .8);
}
function burst(x, y, z, c, n, spd, life, size, k = 2) {
  const cc = col(c);
  for (let i = 0; i < n; i++) { const a = rand(0, 6.283), b = rand(-1, 1); PA.emit(x, y, z, Math.cos(a) * spd * rand(.4, 1), b * spd * .6 + spd * .3, Math.sin(a) * spd * rand(.4, 1) * .6, life * rand(.6, 1.2), size * rand(.6, 1.3), cc, 0, 2, k); }
}

/* ---------------- transient FX ---------------- */
const FX = [];
function addFx(obj, life, upd, mats) { scene.add(obj); FX.push({ obj, t: 0, life, upd, mats: mats ? [].concat(mats) : [] }); }
function updateFx(dt) {
  for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; const u = Math.min(1, f.t / f.life);
    if (f.upd) f.upd(f, u, dt); if (u >= 1) { scene.remove(f.obj); f.mats.forEach(m => m.dispose()); FX.splice(i, 1); } }
}
function clearFx() { FX.forEach(f => { scene.remove(f.obj); f.mats.forEach(m => m.dispose()); }); FX.length = 0; PA.n = 0; PN.n = 0; }
const VS_UV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FS_SLASH = `uniform vec3 uC; uniform float uP, uF, uMode; varying vec2 vUv;
  void main(){ float along, vis;
    if (uMode > 0.5) { along = sin(vUv.x * 3.14159); vis = along; }
    else { float head = uP, tail = uP - 0.7; along = clamp((vUv.x - tail) / (head - tail), 0.0, 1.0); vis = step(vUv.x, head) * smoothstep(0.0, 1.0, along); }
    float edge = pow(vUv.y, 3.0), core = smoothstep(0.0, 0.6, vUv.y), a = vis * core * uF;
    vec3 c = uC * (0.45 + 2.4 * edge) + vec3(1.0) * pow(edge, 7.0) * 2.2 * along; gl_FragColor = vec4(c, a); }`;
function arcGeo(r0, r1, a0, a1, seg = 48) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) { const u = i / seg, a = a0 + (a1 - a0) * u, c = Math.cos(a), s = Math.sin(a), w = Math.sin(u * Math.PI) * .25 + .75, rr0 = lerp(r1, r0, w);
    pos.push(c * rr0, s * rr0, 0, c * r1, s * r1, 0); uv.push(u, 0, u, 1); }
  for (let i = 0; i < seg; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
function stripGeo(x0, x1, w) {
  const g = new T.BufferGeometry(), seg = 20, pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) { const u = i / seg, x = lerp(x0, x1, u), ww = w * (1 - u * .85); pos.push(x, -ww, 0, x, ww, 0); uv.push(u, 0, u, 1); }
  for (let i = 0; i < seg; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
const SLASH_GEO = { chop: arcGeo(.9, 2.5, 2.7, -.55), sweep: arcGeo(1, 2.6, -2.3, 1.7), rise: arcGeo(.9, 2.4, -.7, 2.3),
  spin: arcGeo(1.2, 3, 0, Math.PI * 2.1, 72), thrust: stripGeo(.2, 3.3, .28), qi: arcGeo(1, 1.9, -1.15, 1.15), xcut: arcGeo(1.2, 3.2, 2.2, -1.0) };
function slashMat(c, mode = 0) { return new T.ShaderMaterial({ uniforms: { uC: { value: col(c) }, uP: { value: 0 }, uF: { value: 1 }, uMode: { value: mode } }, vertexShader: VS_UV, fragmentShader: FS_SLASH, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }); }
function slash(f, type, c, o = {}) {
  const m = slashMat(c), mesh = new T.Mesh(SLASH_GEO[type], m), grp = new T.Group(); grp.add(mesh);
  const s = (o.s || 1) * (f.scale || 1), h = (o.h || 1.15) * (f.scale || 1);
  const place = () => grp.position.set(f.x + (o.ox || 0) * f.facing, (f.y || 0) + h, f.z + .05);
  place(); grp.scale.set(f.facing * s, s, s);
  if (type === 'sweep' || type === 'spin') mesh.rotation.x = -Math.PI / 2 + (o.tilt ?? .3);
  if (type === 'thrust') mesh.rotation.x = .2;
  if (o.rz) grp.rotation.z = o.rz;
  addFx(grp, o.life || .26, (fx, u) => { m.uniforms.uP.value = Math.min(1.5, u * 2.1); m.uniforms.uF.value = 1 - smooth(.5, 1, u); if (o.follow) place(); }, m);
}
function shockwave(x, z, r, c, y = .07) {
  const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(2.5), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const mesh = new T.Mesh(geo('swring', () => { const g = new T.RingGeometry(.8, 1, 64); g.rotateX(-Math.PI / 2); return g; }), m);
  mesh.position.set(x, y, z);
  addFx(mesh, .5, (fx, u) => { const s = .3 + easeOut(u) * r; mesh.scale.set(s, 1, s); m.opacity = 1 - u; }, m);
}
function pillar(x, z, c, h = 8, life = .6, r = .5) {
  const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(2.2), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const mesh = new T.Mesh(geo('pillar', () => { const g = new T.CylinderGeometry(1, 1, 1, 20, 1, true); g.translate(0, .5, 0); return g; }), m);
  mesh.position.set(x, 0, z);
  addFx(mesh, life, (fx, u) => { mesh.scale.set(r * (1 - u * .6), h * easeOut(u * 3), r * (1 - u * .6)); m.opacity = 1 - u; }, m);
}
function lightning(x, z, c, big = 1) {
  const g = new T.Group();
  const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(3), transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  const m2 = new T.MeshBasicMaterial({ color: new T.Color(4, 4, 4.4), transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  let prev = new T.Vector3(x + rand(-1, 1), 17, z); const cg = geo('bolt', () => new T.CylinderGeometry(1, 1, 1, 5, 1, true));
  for (let i = 1; i <= 9; i++) {
    const k = i / 9, next = new T.Vector3(x + (i === 9 ? 0 : rand(-.8, .8)), 17 * (1 - k), z + (i === 9 ? 0 : rand(-.3, .3)));
    const len = prev.distanceTo(next), dir = next.clone().sub(prev).normalize(), mid = prev.clone().add(next).multiplyScalar(.5);
    const a = new T.Mesh(cg, m2); a.scale.set(.06 * big, len, .06 * big); a.position.copy(mid); a.quaternion.setFromUnitVectors(UP, dir); g.add(a);
    const b = new T.Mesh(cg, m); b.scale.set(.24 * big, len, .24 * big); b.position.copy(mid); b.quaternion.copy(a.quaternion); g.add(b); prev = next;
  }
  addFx(g, .34, (fx, u) => { g.visible = u < .12 || Math.random() > .25; m.opacity = 1 - u; m2.opacity = 1 - u; }, [m, m2]);
  shockwave(x, z, 2.4 * big, c); burst(x, .4, z, c, 22, 6, .4, .3, 3);
  W.flash = Math.max(W.flash, .35); W.shake = Math.max(W.shake, .2); sfx('zap');
}
const TELE_FS = `uniform float uP; uniform vec3 uC; varying vec2 vUv;
  void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard;
    float ring = smoothstep(0.86, 0.95, r); float fill = step(r, uP) * 0.45 + 0.1; float a = max(ring * 0.95, fill * (0.35 + 0.65 * r)); gl_FragColor = vec4(uC * 1.6, a); }`;

/* ---------------- audio (합성음) ---------------- */
let AC = null, NB = null, master = null, bgmGain = null;
const AUDIO = { sfx: true, bgm: true };
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .42; master.connect(AC.destination);
    bgmGain = AC.createGain(); bgmGain.gain.value = .12; bgmGain.connect(master);
    NB = AC.createBuffer(1, AC.sampleRate * .8, AC.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function nz(dur, f0, f1, q, vol) { const s = AC.createBufferSource(); s.buffer = NB; const fl = AC.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = q; const t = AC.currentTime;
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur); }
function tn(dur, f0, f1, vol, type = 'sine', delay = 0, out = null) { const o = AC.createOscillator(); o.type = type; const t = AC.currentTime + delay;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = AC.createGain(); g.gain.setValueAtTime(.0001, AC.currentTime); g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + .02); }
function sfx(n) {
  if (!AC || !AUDIO.sfx) return;
  try { switch (n) {
    case 'swing': nz(.16, 2600, 700, .8, .2); break;
    case 'hit': nz(.12, 1800, 300, 1.1, .42); tn(.12, 170, 60, .32); break;
    case 'heavy': nz(.26, 1200, 120, .9, .52); tn(.3, 120, 40, .45, 'triangle'); break;
    case 'block': tn(.12, 900, 700, .2, 'square'); nz(.08, 4000, 2500, 3, .2); break;
    case 'boom': nz(.6, 700, 60, .7, .65); tn(.6, 90, 30, .55); break;
    case 'zap': nz(.35, 5200, 700, .5, .4); tn(.22, 900, 180, .12, 'sawtooth'); break;
    case 'pick': tn(.12, 660, 990, .18, 'triangle'); tn(.16, 990, 1480, .15, 'triangle', .07); break;
    case 'gear': [784, 988, 1318].forEach((f, i) => tn(.2, f, f, .13, 'triangle', i * .06)); break;
    case 'shoot': nz(.12, 3600, 1500, 2, .2); break;
    case 'special': tn(.5, 220, 880, .18, 'triangle'); nz(.5, 800, 4200, .6, .26); break;
    case 'ui': tn(.07, 880, 1100, .1, 'triangle'); break;
    case 'no': tn(.12, 220, 160, .15, 'square'); break;
    case 'lvl': [523, 659, 784, 1046, 1318].forEach((f, i) => tn(.3, f, f, .14, 'triangle', i * .08)); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => tn(.35, f, f, .15, 'triangle', i * .12)); break;
    case 'fire': nz(.4, 900, 300, .5, .3); break;
    case 'dodge': nz(.14, 1500, 3000, .7, .15); break;
  } } catch (e) { /* ignore */ }
}
/* 오음 음계 배경음 (간단한 절차 생성) */
let bgmTimer = 0, bgmStep = 0, bgmMode = 'field';
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
function bgmTick(dt) {
  if (!AC || !AUDIO.bgm) return;
  bgmTimer -= dt; if (bgmTimer > 0) return;
  const tempo = bgmMode === 'boss' ? .16 : bgmMode === 'camp' ? .32 : .22; bgmTimer = tempo;
  const root = bgmMode === 'boss' ? 196 : bgmMode === 'camp' ? 261.6 : 220;
  try {
    if (bgmStep % 8 === 0) tn(tempo * 7, root / 2, root / 2, .5, 'triangle', 0, bgmGain);
    if (bgmStep % 4 === 2 && bgmMode !== 'camp') nz(.08, 180, 90, 1, .08);
    if (Math.random() < (bgmMode === 'camp' ? .55 : .7)) { const n = PENTA[(Math.sin(bgmStep * 1.7) * 3.5 + 4 + (bgmStep % 16 > 7 ? 1 : 0)) | 0] || 0;
      const f = root * Math.pow(2, n / 12); tn(tempo * 1.8, f, f, .35, bgmMode === 'boss' ? 'sawtooth' : 'triangle', 0, bgmGain); }
  } catch (e) { /* ignore */ }
  bgmStep++;
}

/* ---------------- 무기 · 캐릭터 · 군마 빌더 ---------------- */
function crescentGeo(len, wid) {
  const s = new T.Shape(); s.moveTo(0, -wid * .22); s.quadraticCurveTo(len * .55, -wid * .18, len, wid * .12); s.quadraticCurveTo(len * .62, wid, .02, wid * .6); s.lineTo(0, -wid * .22);
  const g = new T.ExtrudeGeometry(s, { depth: .028, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 1, curveSegments: 14 }); g.translate(0, 0, -.014); return g;
}
const shaftGeo = (len, r) => geo(`shaft${len}_${r}`, () => { const g = new T.CylinderGeometry(r, r, len, 8); g.rotateX(Math.PI / 2); return g; });
const tipGeo = (r, h) => geo(`tip${r}_${h}`, () => { const g = new T.ConeGeometry(r, h, 8); g.rotateX(Math.PI / 2); return g; });
const bowGeo = () => geo('bow', () => { const arc = Math.PI * .9, g = new T.TorusGeometry(.5, .022, 6, 26, arc); g.rotateZ(-arc / 2); g.rotateZ(-Math.PI / 2); g.rotateY(-Math.PI / 2); g.translate(0, .5, 0); return g; });
const bowStringGeo = () => geo('bowstr', () => { const g = new T.CylinderGeometry(.006, .006, .98, 4); g.rotateX(Math.PI / 2); g.translate(0, .42, 0); return g; });
const HELM = () => new T.SphereGeometry(.27, 22, 12, 0, Math.PI * 2, 0, Math.PI * .5);
const HELMRIM = () => { const g = new T.TorusGeometry(.27, .03, 8, 26); g.rotateX(Math.PI / 2); return g; };
const TORUS_BAND = () => new T.TorusGeometry(.235, .05, 8, 22);
const texCache = new Map();
function charTex(ch, bg, fg, w = 256, h = 384) {
  const key = ch + bg + fg + w; if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.globalAlpha = .5; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28); x.globalAlpha = 1;
  x.fillStyle = fg; x.font = `900 ${Math.round(w * .66)}px "Noto Serif KR","Batang",serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, w / 2, h / 2 + 6);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; texCache.set(key, t); return t;
}
function buildWeapon(w, type, L, add, elem) {
  const steel = L.metal || '#dfe6ee', gold = '#e2b85a', wood = L.wood || '#7a2420', glow = { emissive: elem, ei: .4 };
  switch (type) {
    case 'glaive':
      add(w, shaftGeo(2.3, .035), L.wood || '#7a2420', [0, 0, .4]);
      add(w, geo('cres1', () => crescentGeo(.95, .34)), steel, [0, 0, 1.5], { r: [0, -Math.PI / 2, 0], ...glow, ot: .018 });
      add(w, geo('orb', () => new T.SphereGeometry(.065, 10, 8)), '#3ad08a', [0, 0, 1.5]);
      break;
    case 'snake':
      add(w, shaftGeo(2.4, .035), '#2a2a2a', [0, 0, .5]);
      add(w, geo('snakeblade', () => new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0, .07, .14), new T.Vector3(0, -.07, .28), new T.Vector3(0, .07, .42), new T.Vector3(0, -.04, .56), new T.Vector3(0, 0, .66)]), 24, .034, 6)), steel, [0, 0, 1.7], { ...glow, ot: .015 });
      add(w, tipGeo(.05, .2), steel, [0, 0, 2.45], glow);
      break;
    case 'spear': case 'halberd': {
      add(w, shaftGeo(2.3, .033), L.wood || (type === 'halberd' ? '#6a1f1f' : '#efe8d4'), [0, 0, .5]);
      add(w, tipGeo(.06, .5), steel, [0, 0, 1.9], { ...glow, ot: .015 });
      add(w, geo('tassel', () => { const g = new T.ConeGeometry(.11, .24, 10); g.rotateX(-Math.PI / 2); return g; }), type === 'halberd' ? gold : '#d83a3a', [0, 0, 1.52]);
      if (type === 'halberd') { add(w, geo('cres2', () => crescentGeo(.5, .26)), gold, [0, 0, 1.58], { r: [0, -Math.PI / 2, 0], ...glow, ot: .015 }); add(w, geo('cres2', () => crescentGeo(.5, .26)), gold, [0, 0, 1.58], { r: [0, -Math.PI / 2, Math.PI], ...glow, ot: .015 }); }
      break; }
    case 'sword': case 'dao': {
      const Lb = type === 'dao' ? .85 : .95;
      add(w, geo('grip', () => { const g = new T.CylinderGeometry(.03, .03, .24, 8); g.rotateX(Math.PI / 2); return g; }), '#3a2a22', [0, 0, 0]);
      add(w, geo('guard', () => new T.BoxGeometry(.06, .3, .06)), gold, [0, 0, .14]);
      if (type === 'dao') add(w, geo('daoblade', () => crescentGeo(.95, .2)), steel, [0, -.05, .15], { r: [0, -Math.PI / 2, 0], ...glow, ot: .014 });
      else add(w, geo('blade' + Lb, () => new T.BoxGeometry(.035, .1, Lb)), steel, [0, 0, .17 + Lb / 2], { ...glow, ot: .014 });
      break; }
    case 'bigdao':
      add(w, shaftGeo(1.5, .04), '#3a2418', [0, 0, .25]);
      add(w, geo('bigdao', () => crescentGeo(1.25, .42)), steel, [0, -.1, .95], { r: [0, -Math.PI / 2, 0], ...glow, ot: .018 });
      break;
    case 'fan':
      add(w, geo('fanh', () => { const g = new T.CylinderGeometry(.022, .022, .3, 8); g.rotateX(Math.PI / 2); return g; }), '#5a3a24', [0, 0, .04]);
      add(w, geo('fan', () => { const g = new T.CircleGeometry(.34, 22, -Math.PI / 2, Math.PI); g.rotateY(-Math.PI / 2); return g; }), '#fbf8f0', [0, 0, .18], { side: T.DoubleSide, ot: .02 });
      add(w, geo('fan2', () => { const g = new T.CircleGeometry(.13, 16, -Math.PI / 2, Math.PI); g.rotateY(-Math.PI / 2); return g; }), L.sub || '#9aa4c8', [.004, 0, .18], { side: T.DoubleSide, ol: false });
      break;
    case 'staff':
      add(w, shaftGeo(1.9, .035), '#6a4a2a', [0, 0, .45]);
      add(w, geo('sring', () => { const g = new T.TorusGeometry(.13, .022, 8, 22); g.rotateY(Math.PI / 2); return g; }), gold, [0, 0, 1.5]);
      add(w, geo('sorb', () => new T.SphereGeometry(.075, 12, 10)), '#fff2a0', [0, 0, 1.5], { emissive: elem, ei: 1.6, ol: false });
      break;
    case 'axe':
      add(w, shaftGeo(1.4, .04), '#5a3a22', [0, 0, .35]);
      add(w, geo('axeh', () => crescentGeo(.6, .55)), steel, [0, 0, .78], { r: [0, -Math.PI / 2, 0], ...glow, ot: .015 });
      break;
    case 'mace':
      add(w, geo('club', () => { const g = new T.CylinderGeometry(.18, .07, 1.3, 10); g.rotateX(Math.PI / 2); return g; }), '#4a4a58', [0, 0, .5]);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(w, geo('stud', () => new T.SphereGeometry(.045, 8, 6)), gold, [Math.cos(a) * .16, Math.sin(a) * .16, .85 + (k % 2) * .2], { ol: false }); }
      break;
    case 'whip':
      add(w, geo('whiph', () => { const g = new T.CylinderGeometry(.03, .03, .3, 8); g.rotateX(Math.PI / 2); return g; }), '#3a2418', [0, 0, 0]);
      add(w, geo('whipc', () => new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0, .12), new T.Vector3(0, .12, .8), new T.Vector3(0, -.05, 1.5), new T.Vector3(0, .1, 2.2), new T.Vector3(0, 0, 2.7)]), 40, .022, 5)), '#8a8a92', [0, 0, 0], { ...glow, ot: .01 });
      add(w, geo('bell', () => new T.SphereGeometry(.07, 10, 8)), gold, [0, 0, 2.72], { emissive: '#ffd84a', ei: .6 });
      break;
    case 'flag': {
      add(w, shaftGeo(2.4, .03), '#4a3526', [0, 0, .6]);
      const g = new T.PlaneGeometry(.9, 1.2, 8, 3); g.translate(.46, 0, 0); g.rotateY(-Math.PI / 2); g.rotateX(Math.PI / 2);
      const m = add(w, g, '#ffffff', [0, -.05, 1.35], { map: charTex(L.flagt || '軍', L.flagc || '#8a1a1a', '#f0d8a0'), side: T.DoubleSide, ol: false, noCache: true });
      m.userData.flag = true;
      break; }
    case 'baby':
      add(w, geo('baby', () => new T.SphereGeometry(.17, 12, 10)), '#f6efe0', [0, .12, .12], { s: [1, .8, 1.3] });
      add(w, geo('babyh', () => new T.SphereGeometry(.08, 10, 8)), '#f8d8c0', [0, .2, .28]);
      break;
    case 'bow': break;
  }
}
/* buildFighter 는 chars.js (사실적 v2) */
function buildHorse(c) {
  const g = new T.Group(), meshes = [];
  const add = (gg, color, p, o = {}) => { const m = new T.Mesh(gg, toon(color)); m.position.set(...p); if (o.r) m.rotation.set(...o.r); if (o.s) m.scale.set(...o.s); m.castShadow = true;
    if (!gg.boundingSphere) gg.computeBoundingSphere(); const k = 1 + .03 / gg.boundingSphere.radius; const ol = new T.Mesh(gg, OUTLINE); ol.scale.setScalar(k); m.add(ol); g.add(m); meshes.push(m); return m; };
  add(geo('hbody', () => { const q = new T.CapsuleGeometry(.36, .9, 6, 14); q.rotateZ(Math.PI / 2); return q; }), c, [0, 1.15, 0]);
  const neck = add(geo('hneck', () => new T.CapsuleGeometry(.18, .5, 4, 10)), c, [.72, 1.5, 0], { r: [0, 0, -.6] });
  add(geo('hhead', () => { const q = new T.CapsuleGeometry(.13, .34, 4, 10); q.rotateZ(Math.PI / 2); return q; }), c, [1.08, 1.72, 0], { r: [0, 0, -.5] });
  add(geo('hmane', () => new T.BoxGeometry(.5, .12, .06)), '#1a1410', [.62, 1.72, 0], { r: [0, 0, -.9] });
  add(geo('htail', () => { const q = new T.ConeGeometry(.08, .7, 8); q.translate(0, -.35, 0); return q; }), '#1a1410', [-.78, 1.3, 0], { r: [0, 0, -.5] });
  add(geo('hsaddle', () => new T.BoxGeometry(.5, .12, .56)), '#7a2420', [-.05, 1.52, 0]);
  const legs = [];
  for (const [x, z] of [[.5, .2], [.5, -.2], [-.5, .2], [-.5, -.2]]) {
    const lg = new T.Group(); lg.position.set(x, 1, z); g.add(lg);
    const m = new T.Mesh(geo('hleg', () => { const q = new T.CapsuleGeometry(.07, .75, 4, 8); q.translate(0, -.45, 0); return q; }), toon(c)); m.castShadow = true; lg.add(m); meshes.push(m);
    const hoof = new T.Mesh(geo('hoof', () => new T.CylinderGeometry(.08, .09, .1, 8)), toon('#1a1410')); hoof.position.y = -.92; lg.add(hoof);
    legs.push(lg);
  }
  g.rotation.y = -Math.PI / 2; // 앞(+x) → 기수의 정면(+z)
  const wrap = new T.Group(); wrap.add(g);
  return { grp: wrap, legs, meshes };
}

/* ---------------- 포즈 ---------------- */
function attackPose(P, i, u, w) {
  const a = u < w ? u / w : 1, b = u < w ? 0 : (u - w) / (1 - w);
  P.lL = .45; P.lR = -.3; P.hy = .9; P.aLx = -.6; P.aLz = .35;
  if (i === 0) { const k = Math.min(1, b * 2.5); P.aRx = u < w ? lerp(-.5, -2.9, easeOut(a)) : lerp(-2.9, -.2, easeOut(k)); P.g = .6; P.trx = u < w ? -.15 * a : lerp(-.15, .3, k); P.try_ = u < w ? .35 * a : lerp(.35, -.2, k); }
  else if (i === 1) { P.aRx = -1.45; P.g = 1.45; P.aRz = -.35; P.trx = .12; P.try_ = u < w ? lerp(0, -1.2, easeOut(a)) : lerp(-1.2, 1.25, easeOut(Math.min(1, b * 2.2))); }
  else if (i === 2) { const k = easeOut(Math.min(1, b * 3)); P.aRx = -1.5; P.g = 1.5; P.trx = .22; P.lL = .7; P.lR = -.5; P.shz = u < w ? -.3 * a : lerp(-.3, .35, k); P.try_ = u < w ? -.5 * a : lerp(-.5, .45, k); }
  else if (i === 3) { P.aRx = -1.45; P.g = 1.45; P.aRz = -.5; P.hy = .85; P.bry = u < w ? -.4 * a : -.4 + easeInOut(b) * Math.PI * 2; }
  else if (i === 4) { /* 승천격: 올려베기 */ const k = easeOut(Math.min(1, b * 2.5)); P.aRx = u < w ? lerp(-.3, .4, a) : lerp(.4, -3, k); P.g = .9; P.trx = u < w ? .3 : lerp(.3, -.25, k); P.hy = u < w ? .82 : .96; }
  else if (i === 5) { /* 활 쏘기 */ P.aLx = -1.5; P.aLz = 0; P.aRx = -1.5; P.g = 0; P.shz = u < w ? -.28 * a : lerp(-.28, 0, b); P.try_ = -.3; }
}
function pose(f, dt) {
  const t = W.t + f.phase, u = f.st;
  const P = { hy: .96, trx: 0, try_: 0, hdx: 0, aRx: -.45, aRz: -.12, aLx: -.25, aLz: .14, g: -.15, lL: .12, lR: -.12, brx: 0, bry: 0, by: 0, shz: 0, fast: false };
  const L = f.look || {}, wt = L.weapon;
  const idleG = (wt === 'fan' || wt === 'staff' || wt === 'flag') ? -1.1 : wt === 'whip' ? -.9 : -.15;
  const s = f.state, bow = wt === 'bow';
  if (s === 'idle' || s === 'guard' || s === 'flee' || s === 'rally') {
    const b = Math.sin(t * 2.2); P.trx = .04 * b; P.hy = .96 - .012 * b; P.g = idleG;
    if (bow) { P.aLx = -1.25; P.aRx = -1.05; }
    if (f.shieldUp) { P.aLx = -1.1; P.aLz = .1; }
    if (s === 'rally') { P.aRx = -2.6 + Math.sin(t * 8) * .3; P.g = -.6; }
  } else if (s === 'walk' || s === 'run') {
    const p = f.walkP, amp = s === 'run' ? 1.05 : .75; P.lL = Math.sin(p) * amp; P.lR = -P.lL; P.aLx = -.25 - Math.sin(p) * .45 * amp; P.aRx = -.5 + Math.sin(p) * .18;
    P.hy = .93 + Math.abs(Math.cos(p)) * .05; P.trx = s === 'run' ? .35 : .12; P.g = idleG;
    if (bow) { P.aLx = -1.1; P.aRx = -1.0; } if (f.shieldUp) { P.aLx = -1.1; P.aLz = .1; }
  } else if (s === 'jump') {
    if (f.airAtk) { const k = easeOut(f.airT / .26); P.aRx = lerp(-2.9, -.1, k); P.g = .6; P.trx = .35; P.fast = true; }
    else { P.aRx = -2.3; P.g = .4; P.aLx = -1; P.aLz = .6; P.trx = .1; }
    P.lL = -.9; P.lR = .35;
  } else if (s === 'attack' || s === 'eatk' || s === 'cmd' || s === 'dashatk' || s === 'launch') {
    attackPose(P, f.pose ?? f.combo, u / f.atkDur, f.windFrac ?? .3); P.fast = true;
  } else if (s === 'eshoot') { attackPose(P, 5, u / 1.0, .6); }
  else if (s === 'hurt' || s === 'stun' || s === 'grabbed') { P.trx = -.35; P.hdx = -.3; P.aRx = -.15; P.aLx = -.1; P.aRz = -.5; P.aLz = .5; P.hy = .92; if (s === 'stun') P.hdx = -.3 + Math.sin(t * 6) * .2; }
  else if (s === 'down') { const k = Math.min(1, u * 5); P.brx = -Math.PI / 2 * k; P.by = .18 * k; P.aRz = -1.3; P.aLz = 1.3; P.aRx = -.2; P.lL = .3; P.lR = -.1; P.fast = true; }
  else if (s === 'getup') { const k = clamp(u / .4, 0, 1); P.brx = -Math.PI / 2 * (1 - easeOut(k)); P.by = .18 * (1 - k); P.fast = true; }
  else if (s === 'dodge') { const k = clamp(u / .36, 0, 1); if (f.backstep) { P.trx = -.3; P.lL = -.5; } else { P.brx = k * Math.PI * 2 * (f.rollDir || 1); P.hy = .6; P.lL = -1.2; P.lR = -1.2; P.aRx = -1; P.aLx = -1; P.fast = true; } }
  else if (s === 'spin') { P.bry = u * 20; P.aRx = -1.45; P.g = 1.45; P.aRz = -.55; P.hy = .88; P.lL = .4; P.lR = -.4; P.fast = true; }
  else if (s === 'item') { P.aRx = -2.2; P.g = -1; }
  else if (s === 'special' || s === 'skill' || s === 'cast') {
    const k = f.poseKind || 'raise';
    if (k === 'spin') { P.bry = u * 17; P.aRx = -1.45; P.g = 1.45; P.aRz = -.55; P.hy = .88; P.fast = true; }
    else if (k === 'slam') { if ((f.y || 0) > .05) { P.aRx = -3; P.g = .5; P.aLx = -2.8; P.lL = -.8; P.lR = .4; } else { P.aRx = -.2; P.g = .8; P.trx = .5; P.hy = .78; P.lL = .6; P.lR = -.5; } }
    else if (k === 'dash') { P.aRx = -1.5; P.g = 1.5; P.trx = .4; P.lL = .9; P.lR = -.8; P.hy = .86; P.aLx = .4; }
    else if (k === 'bow') { P.aLx = -2.4; P.aRx = -2.2; P.g = .3; P.trx = -.25; P.hdx = -.3; }
    else if (k === 'melee') { attackPose(P, u < .62 ? 0 : 1, u < .62 ? u / .62 : (u - .62) / .6, .62); P.fast = true; }
    else if (k === 'wave') { attackPose(P, 1, u / .85, .52); P.fast = true; }
    else if (k === 'counter') { P.aRx = -2.4; P.g = -1.2; P.trx = -.1; P.lL = .4; P.lR = -.4; }
    else if (k === 'pray') { P.aRx = -2.8; P.aLx = -2.8; P.aLz = .2; P.aRz = -.2; P.g = -.2; P.hdx = -.3; P.hy = .9; }
    else { P.aRx = -2.8; P.g = .1; P.aLx = -.5; P.aLz = .4; P.trx = -.12; P.hdx = -.15; }
  }
  if (f.mounted) { P.lL = -1.35; P.lR = -1.35; P.hy = .96; }
  const R = f.rig, k = 1 - Math.exp(-dt * (P.fast ? 45 : 16));
  const hb = (R.hipBase || .96) / .96; R.hips.position.y = lerp(R.hips.position.y, P.hy * hb, k);
  R.torso.rotation.x = lerp(R.torso.rotation.x, P.trx, k); R.torso.rotation.y = lerp(R.torso.rotation.y, P.try_, k);
  R.head.rotation.x = lerp(R.head.rotation.x, P.hdx, k);
  R.armR.sh.rotation.x = lerp(R.armR.sh.rotation.x, P.aRx, k); R.armR.sh.rotation.z = lerp(R.armR.sh.rotation.z, P.aRz, k);
  R.armR.sh.position.z = lerp(R.armR.sh.position.z, P.shz, k);
  const dual = !!R.lgrip && (s === 'attack' || s === 'special');
  R.armL.sh.rotation.x = lerp(R.armL.sh.rotation.x, dual ? P.aRx * .8 - .4 : P.aLx, k); R.armL.sh.rotation.z = lerp(R.armL.sh.rotation.z, P.aLz, k);
  R.wgrip.rotation.x = lerp(R.wgrip.rotation.x, P.g, k); if (R.lgrip) R.lgrip.rotation.x = R.wgrip.rotation.x;
  R.legL.rotation.x = lerp(R.legL.rotation.x, P.lL, k); R.legR.rotation.x = lerp(R.legR.rotation.x, P.lR, k);
  if (R.kneeL) { const kb = s === 'jump' || f.mounted ? .9 : P.hy < .9 ? .5 : .08; R.kneeL.rotation.x = lerp(R.kneeL.rotation.x, Math.max(kb, P.lL * .95), k); R.kneeR.rotation.x = lerp(R.kneeR.rotation.x, Math.max(kb, P.lR * .95), k); }
  R.legL.rotation.z = f.mounted ? .5 : 0; R.legR.rotation.z = f.mounted ? -.5 : 0;
  R.body.rotation.x = P.fast ? P.brx : lerp(R.body.rotation.x, P.brx, k);
  R.body.rotation.y = P.bry;
  const mountY = f.mounted ? (R.hipBase ? .66 : 1.0) : 0;
  R.body.position.y = lerp(R.body.position.y, P.by + mountY, f.mounted ? 1 : k);
  if (R.cape) R.cape.rotation.x = .14 + Math.min(.8, Math.abs(f.vx || 0) * .08 + Math.max(0, f.vy || 0) * .05) + Math.sin(t * 3.2) * .05;
  if (R.shield) R.shield.visible = !f.shieldBroken;
  for (const fl of (f.flags || [])) { const p = fl.geometry.attributes.position; if (!fl.userData.base) fl.userData.base = Float32Array.from(p.array); const b = fl.userData.base;
    for (let i = 0; i < p.count; i++) { const z = b[i * 3 + 2]; p.setX(i, b[i * 3] + Math.sin(z * 4 - t * 6) * .08 * z); } p.needsUpdate = true; }
  if (f.horse) { const run = Math.abs(f.vx || 0) + Math.abs(f.vz || 0) > .5; f.gallop = (f.gallop || 0) + dt * (run ? 14 : 2);
    f.horse.legs.forEach((lg, i) => { lg.rotation.z = run ? Math.sin(f.gallop + (i < 2 ? 0 : Math.PI) + (i % 2) * .6) * .7 : Math.sin(t + i) * .03; });
    f.horse.grp.position.y = run ? Math.abs(Math.sin(f.gallop)) * .08 : 0; }
  const target = f.facing > 0 ? Math.PI / 2 - .32 : -Math.PI / 2 + .32;
  f.rotY = lerp(f.rotY, target, 1 - Math.exp(-dt * 18)); f.root.rotation.y = f.rotY;
  f.root.position.set(f.x, f.y || 0, f.z);
}

/* ---------------- 텍스처 · 배경 ---------------- */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function texFrom(c, wrapT = true) { const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.wrapT = wrapT ? T.RepeatWrapping : T.ClampToEdgeWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
function speckle(x, N, H, n, cols, r0, r1, a) {
  for (let i = 0; i < n; i++) { const cx = Math.random() * N, cy = Math.random() * H, r = rand(r0, r1); x.globalAlpha = a * rand(.4, 1); x.fillStyle = cols[i % cols.length];
    for (const ox of [-N, 0, N]) for (const oy of [-H, 0, H]) { const X = cx + ox, Y = cy + oy; if (X + r < 0 || X - r > N || Y + r < 0 || Y - r > H) continue; x.beginPath(); x.ellipse(X, Y, r, r * .7, .3, 0, Math.PI * 2); x.fill(); } }
  x.globalAlpha = 1;
}
function groundTex(kind) {
  const N = 512, [c, x] = makeCanvas(N, N);
  const base = { grass: ['#76b04c', ['#68a442', '#86c05a', '#5c983c', '#96ca66'], ['#5a9038', '#a2d470', '#70aa48']], wheat: ['#b8b060', ['#c8c070', '#a8a050', '#d8c880', '#98a050'], ['#e8d890', '#8a9040']],
    dirt: ['#b89870', ['#a8875e', '#c8aa80', '#9a7a52', '#d0b48a'], ['#86684a', '#e0c8a0', '#a08060']], mud: ['#6a5a48', ['#5a4a3a', '#7a6a55', '#4e4034', '#826e58'], ['#3a3028', '#8a7a68']],
    rock: ['#8a8078', ['#7a7068', '#9a9088', '#6e665e', '#a89e94'], ['#5a524a', '#b8b0a8']], night: ['#3a4a3a', ['#34443a', '#43544a', '#2e3a32', '#4a5a48'], ['#28322a', '#5a6a58']] }[kind];
  if (base) { x.fillStyle = base[0]; x.fillRect(0, 0, N, N); speckle(x, N, N, 240, base[1], 10, 42, .35); speckle(x, N, N, 1500, base[2], 1, 3, .55); }
  else if (kind === 'deck') { for (let r = 0; r < 8; r++) { const v = rand(-12, 12) | 0; x.fillStyle = `rgb(${128 + v},${86 + v},${52 + v})`; x.fillRect(0, r * 64, N, 64); x.fillStyle = 'rgba(40,22,10,.55)'; x.fillRect(0, r * 64, N, 3); const sx = rand(40, 470) | 0; x.fillRect(sx, r * 64, 3, 64); x.fillStyle = 'rgba(255,230,190,.08)'; for (let k = 0; k < 5; k++) x.fillRect(0, r * 64 + rand(8, 58), N, 1); } }
  return texFrom(c);
}
function roadTex(kind) {
  const N = 512, H = 256, [c, x] = makeCanvas(N, H);
  const cols = { paved: ['#a89a86', '#8e8272', '#bcae98', '#7a6e60'], mud: ['#5a4a38', '#4a3c2e', '#6a5a46', '#3e3226'], dirt: ['#caa878', '#b8966a', '#d8bc8e', '#a8865a'], night: ['#6a6450', '#5a5444', '#7a7460', '#4a4438'] }[kind] || ['#caa878', '#b8966a', '#d8bc8e', '#a8865a'];
  const P2 = Math.PI * 2, top = i => 24 + 9 * Math.sin(i / N * P2 * 3) + 5 * Math.sin(i / N * P2 * 7 + 1), bot = i => H - 24 - 9 * Math.sin(i / N * P2 * 4 + 2) - 5 * Math.sin(i / N * P2 * 9);
  x.save(); x.beginPath(); x.moveTo(0, top(0)); for (let i = 0; i <= N; i += 8) x.lineTo(i, top(i)); for (let i = N; i >= 0; i -= 8) x.lineTo(i, bot(i)); x.closePath(); x.clip();
  x.fillStyle = cols[0]; x.fillRect(0, 0, N, H); speckle(x, N, H, 220, cols, 8, 30, .4);
  if (kind === 'paved') { x.strokeStyle = 'rgba(60,50,40,.35)'; x.lineWidth = 2; for (let i = 0; i < 70; i++) { x.beginPath(); x.ellipse(rand(0, N), rand(30, H - 30), rand(14, 26), rand(10, 18), 0, 0, 7); x.stroke(); } }
  if (kind === 'mud') { x.fillStyle = 'rgba(140,170,200,.25)'; for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(rand(0, N), rand(40, H - 40), rand(12, 40), rand(5, 12), 0, 0, 7); x.fill(); } }
  speckle(x, N, H, 900, ['#7a6448', '#e8d0a8'], 1, 3, .5);
  x.fillStyle = 'rgba(90,70,40,.18)'; x.fillRect(0, H / 2 - 30, N, 4); x.fillRect(0, H / 2 + 26, N, 4); x.restore();
  return texFrom(c, false);
}
const GRASS_MAT = new T.ShaderMaterial({
  uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTime: { value: 0 }, uLight: { value: new T.Color(1, 1, 1) } }]),
  vertexShader: `
    #include <common>
    #include <fog_pars_vertex>
    uniform float uTime; varying float vH; varying vec3 vCol;
    void main(){
      vH = position.y / 0.6;
      vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
      float w = sin(uTime * 1.7 + wp.x * 0.33 + wp.z * 0.21) * 0.6 + sin(uTime * 2.9 + wp.x * 1.1) * 0.2;
      wp.x += w * vH * vH * 0.22; wp.z += w * vH * vH * 0.08;
      #ifdef USE_INSTANCING_COLOR
        vCol = instanceColor;
      #else
        vCol = vec3(0.3, 0.6, 0.2);
      #endif
      vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `
    #include <common>
    #include <fog_pars_fragment>
    uniform vec3 uLight; varying float vH; varying vec3 vCol;
    void main(){
      vec3 c = mix(vCol * 0.38, vCol * 0.95, smoothstep(0.0, 1.0, vH));
      c += vec3(0.9, 1.0, 0.55) * vCol * smoothstep(0.8, 1.0, vH) * 0.22;
      gl_FragColor = vec4(c * uLight, 1.0);
      #include <fog_fragment>
    }`,
  side: T.DoubleSide, fog: true
});
GRASS_MAT.userData.shared = true;
const WATERS = [];
function waterMat(deep, shal, glow) {
  const m = new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTime: { value: 0 }, uDeep: { value: col(deep) }, uShal: { value: col(shal) }, uGlow: { value: col(glow) } }]),
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime; uniform vec3 uDeep, uShal, uGlow; varying vec3 vW;
      ${NOISE_GLSL}
      void main(){
        vec2 p = vW.xz;
        float n = vn(p * 0.3 + vec2(uTime * 0.22, uTime * 0.08)) * 0.6 + vn(p * 0.8 - vec2(uTime * 0.35, 0.0)) * 0.4;
        float band = smoothstep(0.6, 0.66, n) - smoothstep(0.7, 0.76, n);
        vec3 c = mix(uDeep, uShal, n); c += uGlow * band * 0.8;
        c += uGlow * step(0.9, vn(p * 2.6 + vec2(uTime * 0.7, -uTime * 0.4))) * 0.9;
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
      }`, fog: true });
  WATERS.push(m); return m;
}
