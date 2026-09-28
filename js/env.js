'use strict';
/* ===== 전장 배경 (원작 bg: plains · fortress · bridge · redcliff · pass · night) + 군영 ===== */
const world = new T.Group(); scene.add(world);
const ENV = { flags: [], flames: [], emitters: [], ambient: null, rain: 0, key: '' };
/* 스테이지(STAGES 인덱스)별 분위기 */
const ATMOS = {
  0: { bg: 'plains', ground: 'grass', road: 'dirt', sky: [0x3d8fe6, 0xcdeeff, 0xfff2d0, [.35, .42, -.84], 0xffffff, 0, 0, .5], fog: [0xd2ecff, 45, 320], hemi: [0xcfe4ff, 0x7a9a50, .9], sun: [0xfff0d8, 1.35], rim: [.2, .18, .14], exp: 1.02, amb: 'petal', grass: [0x5aa83e, 0x6cba48, 0x7ec452, 0x4e9a38], trees: 'blossom', faction: 'yellow' },
  1: { bg: 'fortress', ground: 'dirt', road: 'paved', sky: [0x4b4f9e, 0xffb482, 0xffc28a, [-.55, .14, -.82], 0xffd2b8, 0, 0, .5], fog: [0xf2b894, 40, 290], hemi: [0xffd0b0, 0x6a4a3a, .85], sun: [0xffc89a, 1.3], rim: [.28, .16, .08], exp: 1.02, amb: 'dust', faction: 'dong' },
  6: { bg: 'plains', ground: 'wheat', road: 'dirt', sky: [0x4a9ae0, 0xf6ead0, 0xfff0c0, [.5, .6, -.6], 0xffffff, 0, 0, .35], fog: [0xf0e6cc, 50, 320], hemi: [0xfff0d8, 0x9a8a50, .95], sun: [0xfff4d8, 1.35], rim: [.2, .18, .12], exp: 1.0, amb: 'dust', grass: [0xc8b860, 0xd8c870, 0xb8a850, 0xe0d080], trees: 'green', faction: 'yuan' },
  7: { bg: 'plains', ground: 'grass', road: 'dirt', sky: [0x6a5aa0, 0xffa060, 0xffb070, [.6, .12, -.8], 0xffc8a0, 0, 0, .55], fog: [0xf0a070, 40, 280], hemi: [0xffc8a0, 0x6a5a3a, .85], sun: [0xffa870, 1.25], rim: [.3, .15, .06], exp: 1.0, amb: 'ember', grass: [0x7a9a3e, 0x8aa848, 0x9ab052, 0x6a8a38], trees: 'autumn', faction: 'wei' },
  2: { bg: 'bridge', ground: 'grass', road: 'dirt', sky: [0x2f86d8, 0xe4f5ff, 0xffffff, [-.3, .55, -.78], 0xffffff, 0, 0, .5], fog: [0xdaf0ff, 50, 330], hemi: [0xd8ecff, 0x5a8a50, .9], sun: [0xffffff, 1.3], rim: [.18, .2, .22], exp: 1.0, amb: 'leaf', grass: [0x4e9e44, 0x62b050, 0x76bc5a, 0x3e8a3a], trees: 'green', faction: 'wei' },
  3: { bg: 'redcliff', ground: 'deck', road: null, sky: [0x0c1030, 0xd0582a, 0xff9a50, [.2, .06, -.97], 0x5a3a4a, 0, .7, .55], fog: [0x4a2a38, 30, 250], hemi: [0x7a6a9a, 0x2a1818, .7], sun: [0xff9a60, .9], rim: [.3, .13, .07], exp: .95, amb: 'ember', faction: 'wei' },
  4: { bg: 'pass', ground: 'mud', road: 'mud', sky: [0x3a4658, 0x8a96a4, 0xc8d0e0, [-.3, .5, -.8], 0x6a7484, 0, 0, .9], fog: [0x7a8494, 25, 200], hemi: [0xa8b4c8, 0x3a3a34, .85], sun: [0xc8d4e8, .7], rim: [.14, .16, .2], exp: 1.05, amb: 'rain', rain: 1, faction: 'wei' },
  8: { bg: 'pass', ground: 'rock', road: 'dirt', sky: [0x3a88d8, 0xf0dcb0, 0xfff0c8, [.4, .5, -.75], 0xffffff, 0, 0, .35], fog: [0xe8d8b8, 45, 300], hemi: [0xfff0d0, 0x8a7a5a, .9], sun: [0xffe8c0, 1.35], rim: [.22, .18, .12], exp: 1.0, amb: 'dust', faction: 'wei' },
  9: { bg: 'fortress', ground: 'mud', road: 'paved', sky: [0x1c2a48, 0x5a7090, 0xa8c0e0, [-.3, .4, -.85], 0x4a5a70, 0, 0, .95], fog: [0x4a5a74, 25, 210], hemi: [0x8aa0c8, 0x2a3040, .85], sun: [0xa8c0e8, .75], rim: [.12, .16, .24], exp: 1.08, amb: 'rain', rain: 1.3, faction: 'wei' },
  5: { bg: 'night', ground: 'night', road: 'night', sky: [0x0c0e28, 0x3a3c78, 0xe8eeff, [-.4, .32, -.86], 0x3a3a6a, 1, 1, .3], fog: [0x22264a, 35, 260], hemi: [0x8890d0, 0x1a1a2a, .75], sun: [0xb8c0f0, .8], rim: [.16, .18, .34], exp: 1.05, amb: 'firefly', faction: 'wei' },
  camp: { bg: 'camp', ground: 'grass', road: 'dirt', sky: [0x3a3a88, 0xffa870, 0xffb070, [.6, .1, -.8], 0xffc8a0, 0, .2, .45], fog: [0xe8a078, 35, 260], hemi: [0xffd0b0, 0x5a5a3a, .9], sun: [0xffb070, 1.2], rim: [.28, .16, .08], exp: 1.02, amb: 'ember', grass: [0x6a9a3e, 0x7aa848, 0x8ab052, 0x5a8a38], trees: 'autumn', faction: 'han' },
};
const FLAGSET = { yellow: ['黃', '#d9a520', '#3a2a10'], dong: ['董', '#8a1a1a', '#f0d8a0'], wei: ['魏', '#1f3a78', '#efe6cc'], yuan: ['袁', '#8a6a2a', '#f4e8c8'], han: ['漢', '#2f7d3b', '#f4ecd0'] };
function applyAtmosphere(A) {
  const s = A.sky; SKY_U.uTop.value.set(s[0]); SKY_U.uHor.value.set(s[1]); SKY_U.uSun.value.set(s[2]); sunDir.set(...s[3]).normalize(); SKY_U.uDir.value.copy(sunDir);
  SKY_U.uCloud.value.set(s[4]); SKY_U.uMoon.value = s[5]; SKY_U.uStars.value = s[6]; SKY_U.uCloudAmt.value = s[7];
  scene.fog = new T.Fog(A.fog[0], A.fog[1], A.fog[2]);
  hemi.color.set(A.hemi[0]); hemi.groundColor.set(A.hemi[1]); hemi.intensity = A.hemi[2]; sun.color.set(A.sun[0]); sun.intensity = A.sun[1];
  RIM_U.value.setRGB(...A.rim); W.exposure = A.exp; ENV.ambient = A.amb; ENV.rain = A.rain || 0;
  pointLights.forEach(l => { l.intensity = 0; });
}
function envMesh(g, mat, o = {}) {
  const m = new T.Mesh(g, (mat && mat.isMaterial) ? mat : toon(mat, o));
  m.castShadow = !!o.cast; m.receiveShadow = o.receive !== false;
  if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]); if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]); if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
  (o.parent || world).add(m); return m;
}
function grassField(x0, x1, bands, count, pal) {
  const g = geo('blade', () => { const b = new T.PlaneGeometry(.11, .6, 1, 4); b.translate(0, .3, 0); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / .6; p.setX(i, p.getX(i) * (1 - y * .92)); p.setZ(i, y * y * .08); } return b; });
  const m = new T.InstancedMesh(g, GRASS_MAT, count), d = new T.Object3D(), c = new T.Color();
  for (let i = 0; i < count; i++) { const b = bands[i % bands.length]; d.position.set(rand(x0, x1), 0, rand(b[0], b[1])); d.rotation.set(0, rand(0, 6.28), 0);
    const s = rand(.7, 1.5); d.scale.set(s * rand(.8, 1.4), s, s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); c.set(pick(pal)).offsetHSL(rand(-.02, .02), 0, rand(-.05, .05)); m.setColorAt(i, c); }
  m.frustumCulled = false; world.add(m);
}
function flowers(x0, x1, bands, count, pal) {
  const m = new T.InstancedMesh(geo('flower', () => new T.IcosahedronGeometry(.075, 0)), toon(0xffffff), count), d = new T.Object3D(), c = new T.Color();
  for (let i = 0; i < count; i++) { const b = bands[i % bands.length]; d.position.set(rand(x0, x1), rand(.25, .45), rand(b[0], b[1])); d.scale.setScalar(rand(.7, 1.3)); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, c.set(pick(pal))); }
  m.frustumCulled = false; world.add(m);
}
const LEAVES = { blossom: [[0xf2a8c0, 0xf8c4d4, 0xe890b0], [0x4f9a3e, 0x62ae4a, 0x78c05a]], green: [[0x4f9a3e, 0x62ae4a, 0x78c05a]], autumn: [[0xd87a3a, 0xe8a04a, 0xc8602a, 0xb8883a]], dark: [[0x2e4a4a, 0x3a5a52, 0x2a4040]] };
function tree(x, z, s, leaf, kind = 'round') {
  const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = rand(0, 6);
  envMesh(geo('trunk', () => new T.CylinderGeometry(.16, .3, 2.8, 7)), 0x6b4a33, { p: [0, 1.4, 0], parent: g, cast: true });
  if (kind === 'pine') for (let k = 0; k < 4; k++) envMesh(geo('pine' + k, () => new T.ConeGeometry(1.6 - k * .32, 1.7, 9)), pick(leaf), { p: [0, 2.2 + k * .9, 0], parent: g, cast: true });
  else { const n = 4 + (Math.random() * 3 | 0); for (let k = 0; k < n; k++) envMesh(geo('leaf', () => new T.IcosahedronGeometry(1.25, 2)), pick(leaf), { p: [rand(-.9, .9), 2.8 + rand(0, 1.3), rand(-.7, .7)], s: [rand(.75, 1.2), rand(.65, .95), rand(.75, 1.2)], parent: g, cast: true }); }
  world.add(g); return g;
}
function rock(x, z, s, c = 0x8f8a8a) { envMesh(geo('rock', () => new T.DodecahedronGeometry(1, 0)), c, { p: [x, s * .35, z], s: [s * rand(1, 1.5), s * rand(.6, .9), s * rand(.8, 1.2)], r: [rand(0, 1), rand(0, 6), 0], cast: true }); }
function mountains(x0, x1, colr, n = 16, zNear = -150) {
  for (let i = 0; i < n; i++) { const r = rand(35, 75), h = rand(40, 95), g = new T.ConeGeometry(r, h, 9, 4), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) if (p.getY(k) < h / 2 - .1) { p.setX(k, p.getX(k) * rand(.8, 1.15)); p.setZ(k, p.getZ(k) * rand(.8, 1.15)); p.setY(k, p.getY(k) + rand(-3, 3)); }
    g.computeVertexNormals(); const far = Math.random();
    envMesh(g, toon(col(colr).offsetHSL(0, -.05, far * .06).getHex()), { p: [rand(x0, x1), h / 2 - 6, zNear - far * 90], receive: false }); }
}
function flagPole(x, z, fs, h = 4.6) {
  envMesh(geo('pole', () => new T.CylinderGeometry(.05, .06, 5.2, 6)), 0x4a3526, { p: [x, 2.6, z], cast: true });
  envMesh(geo('poletop', () => new T.ConeGeometry(.1, .3, 6)), 0xe2b85a, { p: [x, 5.35, z] });
  const g = new T.PlaneGeometry(1.3, 2.0, 12, 4); g.translate(.68, 0, 0);
  envMesh(g, toon(0xffffff, { map: charTex(fs[0], fs[1], fs[2]), side: T.DoubleSide }), { p: [x, h, z], cast: true });
  ENV.flags.push({ g, base: Float32Array.from(g.attributes.position.array), ph: rand(0, 6) });
}
function tent(x, z, c, s = 1) { envMesh(geo('tent', () => new T.ConeGeometry(2.2, 2.8, 8)), c, { p: [x, 1.4 * s, z], s: [s, s, s], cast: true }); envMesh(geo('tentdoor', () => new T.PlaneGeometry(.9, 1.3)), 0x3a2a1a, { p: [x, .65 * s, z + 1.25 * s], r: [-.45, 0, 0], s: [s, s, s] }); }
function flameAt(x, y, z, s = 1) {
  const grp = new T.Group(); grp.position.set(x, y, z); grp.scale.setScalar(s);
  grp.add(new T.Mesh(geo('flameO', () => { const g = new T.ConeGeometry(.5, 1.6, 10); g.translate(0, .8, 0); return g; }), glowMat(0xff6a1a, 2.4, true)));
  grp.add(new T.Mesh(geo('flameI', () => { const g = new T.ConeGeometry(.28, 1, 10); g.translate(0, .5, 0); return g; }), glowMat(0xffd070, 3.2, true)));
  world.add(grp); ENV.flames.push({ grp, s, ph: rand(0, 6) }); ENV.emitters.push({ x, y: y + .6 * s, z, kind: 'fire', s });
}
function palisade(x0, x1, z) { for (let x = x0; x < x1; x += .5) envMesh(geo('stake', () => { const q = new T.CylinderGeometry(.14, .16, 2.4, 6); q.translate(0, 1.2, 0); return q; }), 0x6a4a30, { p: [x, 0, z + rand(-.05, .05)], s: [1, rand(.85, 1.1), 1], cast: true }); }
function disposeWorld() {
  const seen = new Set();
  world.traverse(o => { if (o.isMesh || o.isInstancedMesh) {
    if (o.geometry && !o.geometry.userData.shared && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    [].concat(o.material).forEach(m => { if (m && !m.userData.shared && !seen.has(m)) { seen.add(m); if (m.map && !m.map.userData.keep) m.map.dispose(); m.dispose(); } }); } });
  while (world.children.length) world.remove(world.children[0]);
  ENV.flags = []; ENV.flames = []; ENV.emitters = []; WATERS.length = 0; clearFx();
}
function buildEnv(key, len) {
  const A = ATMOS[key]; applyAtmosphere(A); ENV.key = key;
  const L = len, x0 = -70, x1 = L + 90, WX = x1 - x0, cx = (x0 + x1) / 2, bg = A.bg, fs = FLAGSET[A.faction];
  if (bg !== 'redcliff') {
    const z0 = bg === 'bridge' ? -9 : -230, z1 = 40, D = z1 - z0, gt = groundTex(A.ground); gt.repeat.set(WX / 9, D / 9);
    envMesh(new T.PlaneGeometry(WX, D), toon(0xffffff, { map: gt }), { r: [-Math.PI / 2, 0, 0], p: [cx, 0, (z0 + z1) / 2] });
  }
  if (A.road) { const rt = roadTex(A.road); rt.repeat.set(WX / 11, 1); envMesh(new T.PlaneGeometry(WX, 11), toon(0xffffff, { map: rt, alphaTest: .5 }), { r: [-Math.PI / 2, 0, 0], p: [cx, .015, 0] }); }
  if (bg !== 'redcliff') mountains(x0 - 60, x1 + 60, bg === 'night' ? 0x2a2c50 : bg === 'pass' ? (A.rain ? 0x5a6474 : 0x9a8a78) : 0x7896c8);
  if (bg === 'plains' || bg === 'camp') {
    grassField(x0, x1, [[-28, -5.2], [-16, -5.0], [5.2, 13]], 20000, A.grass);
    if (key === 0) flowers(x0, x1, [[-24, -5.5], [5.5, 12]], 900, [0xffffff, 0xffc4d8, 0xffe07a, 0xc8b0ff]);
    const lv = LEAVES[A.trees || 'green'];
    for (let i = 0; i < 44; i++) tree(rand(x0, x1), rand(-42, -11), rand(.9, 1.6), lv.length > 1 && Math.random() < .3 ? lv[0] : lv[lv.length - 1]);
    for (let i = 0; i < 22; i++) rock(rand(x0, x1), pick([rand(-14, -6.5), rand(6.5, 9)]), rand(.3, .8), 0x9a9690);
    if (bg === 'plains') { for (let x = 20; x < L + 20; x += 18) flagPole(x, -7.2, fs); if (key === 0) for (let x = 60; x < L + 20; x += rand(9, 14)) tent(x, rand(-11, -8.5), pick([0xe8c860, 0xd8b050, 0xf0d88a])); }
    if (key === 6) for (let x = 30; x < L; x += 26) palisade(x, x + 6, -8);
  }
  if (bg === 'fortress') {
    const wallMat = toon(A.rain ? 0x6e7078 : 0x9d8e7c);
    for (let x = x0; x < x1; x += 12) { envMesh(geo('wall', () => new T.BoxGeometry(12, 7, 3)), wallMat, { p: [x + 6, 3.5, -12], cast: true }); for (let k = 0; k < 6; k++) envMesh(geo('cren', () => new T.BoxGeometry(1, .9, 3.1)), wallMat, { p: [x + 1 + k * 2, 7.45, -12] }); }
    const gx = L + 4;
    envMesh(new T.BoxGeometry(16, 11, 5), A.rain ? 0x5e606a : 0x8a7b6a, { p: [gx, 5.5, -13], cast: true });
    envMesh(new T.BoxGeometry(14, .7, 5), 0x3a2e2a, { p: [gx, 11.2, -13] });
    const roof = new T.ConeGeometry(11, 4, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1.1, 1, .55); envMesh(roof, 0x2e2a3a, { p: [gx, 13.3, -12.8], cast: true });
    for (let x = 6; x < L + 10; x += 14) flagPole(x, -9.6, fs, 5.2);
    for (let x = 14; x < L; x += 22) { envMesh(geo('brazier', () => new T.CylinderGeometry(.5, .3, .9, 10)), 0x3a3030, { p: [x, .45, -7.5], cast: true }); flameAt(x, .9, -7.5, .55); }
    for (let i = 0; i < 26; i++) tree(rand(x0, x1), rand(-60, -20), rand(1.1, 1.8), A.rain ? LEAVES.dark[0] : LEAVES.autumn[0]);
    if (A.rain) envMesh(new T.PlaneGeometry(WX, 60, 1, 1), waterMat(0x1a3050, 0x3a5a7a, 0x9ac8ff), { r: [-Math.PI / 2, 0, 0], p: [cx, .05, 42], receive: false });
  }
  if (bg === 'bridge') {
    grassField(x0, x1, [[-8.8, -5.3], [5.2, 13], [5.2, 9]], 16000, A.grass);
    envMesh(new T.PlaneGeometry(WX, 90, 1, 1), waterMat(0x1f6a9a, 0x4ab8d8, 0xdff8ff), { r: [-Math.PI / 2, 0, 0], p: [cx, -.25, -54], receive: false });
    const ft = groundTex('grass'); ft.repeat.set(WX / 9, 20); envMesh(new T.PlaneGeometry(WX, 180), toon(0xffffff, { map: ft }), { r: [-Math.PI / 2, 0, 0], p: [cx, 0, -189] });
    for (let x = x0; x < x1; x += rand(2, 5)) rock(x, rand(-9.8, -8.8), rand(.4, 1), 0x8a8e8a);
    const bx = L - 4;
    envMesh(new T.BoxGeometry(4.5, .4, 92), 0x8a5a34, { p: [bx, 1.3, -55], cast: true });
    for (let z = -12; z > -100; z -= 8) for (const sx of [-2, 2]) envMesh(geo('bpil', () => new T.CylinderGeometry(.22, .22, 3, 8)), 0x5a3a22, { p: [bx + sx, .2, z] });
    for (const sx of [-2.1, 2.1]) envMesh(new T.BoxGeometry(.15, .15, 92), 0xa83a2a, { p: [bx + sx, 2.1, -55] });
    for (let i = 0; i < 40; i++) tree(rand(x0, x1), rand(-110, -102), rand(1.2, 2), LEAVES.green[0], Math.random() < .5 ? 'pine' : 'round');
    for (let x = 18; x < L; x += 22) flagPole(x, -7.5, fs);
  }
  if (bg === 'redcliff') {
    envMesh(new T.PlaneGeometry(900, 500, 1, 1), waterMat(0x0a1024, 0x241f3a, 0xc86a30), { r: [-Math.PI / 2, 0, 0], p: [cx, -.9, -150], receive: false });
    const dt = groundTex('deck'); dt.repeat.set(WX / 8, 12.6 / 8);
    envMesh(new T.BoxGeometry(WX, 1, 12.6), toon(0xffffff, { map: dt }), { p: [cx, -.5, 0] });
    envMesh(new T.BoxGeometry(WX, 1.6, .6), 0x4a2e1c, { p: [cx, -1.1, 6.4] });
    for (let x = x0; x < x1; x += 2.2) { envMesh(geo('post', () => new T.BoxGeometry(.14, 1, .14)), 0x5a3a22, { p: [x, .5, -6.1] }); envMesh(geo('post2', () => new T.BoxGeometry(.12, .55, .12)), 0x5a3a22, { p: [x, .27, 6.2] }); }
    envMesh(new T.BoxGeometry(WX, .12, .2), 0x6a4428, { p: [cx, 1, -6.1] }); envMesh(new T.BoxGeometry(WX, .1, .16), 0x6a4428, { p: [cx, .55, 6.2] });
    for (let x = 8; x < L + 20; x += 26) { envMesh(geo('mast', () => new T.CylinderGeometry(.2, .28, 16, 8)), 0x4a3020, { p: [x, 8, -5.4], cast: true });
      const sg = new T.PlaneGeometry(6, 8, 6, 6), sp = sg.attributes.position; for (let k = 0; k < sp.count; k++) sp.setZ(k, Math.sin((sp.getX(k) / 6 + .5) * Math.PI) * .7); sg.computeVertexNormals();
      envMesh(sg, toon(0xd8c8a0, { side: T.DoubleSide }), { p: [x, 9, -5.9], cast: true }); }
    for (let x = 4; x < L + 20; x += 13) envMesh(new T.BoxGeometry(.08, .08, 3), 0x6a6a72, { p: [x, .1, -7.8], r: [0, 0, 0] });
    for (let i = 0; i < 12; i++) { const x = rand(x0, x1), z = rand(-30, -90), g = new T.Group(); g.position.set(x, -.8, z); g.rotation.y = rand(-.3, .3);
      envMesh(geo('hull', () => new T.BoxGeometry(14, 2.6, 4)), 0x3a2418, { p: [0, .8, 0], parent: g }); envMesh(geo('cabin', () => new T.BoxGeometry(5, 2.2, 3)), 0x4a2e1c, { p: [-2, 3, 0], parent: g });
      envMesh(geo('mast', () => new T.CylinderGeometry(.2, .28, 16, 8)), 0x3a2418, { p: [2, 8, 0], parent: g }); world.add(g);
      if (i % 3 !== 2) { flameAt(x - 2, 3.8, z, rand(1.4, 2.4)); flameAt(x + 3, 2.2, z, rand(1, 1.8)); } }
    mountains(x0 - 60, x1 + 60, 0x3a2030, 10); pointLights.forEach(l => { l.color.set(0xff7a30); l.intensity = 1.3; });
  }
  if (bg === 'pass') {
    for (let x = x0; x < x1; x += rand(5, 9)) { const h = rand(6, 14); envMesh(geo('cliff', () => new T.DodecahedronGeometry(1, 1)), A.rain ? 0x5a5a5e : 0x9a8872, { p: [x, h * .4, rand(-14, -10)], s: [rand(3, 5), h, rand(2.5, 4)], r: [0, rand(0, 6), 0], cast: true }); }
    for (let i = 0; i < 18; i++) rock(rand(x0, x1), pick([rand(-9, -6.5), rand(6.5, 9)]), rand(.4, 1.1), A.rain ? 0x6a6a6a : 0xa0907a);
    for (let i = 0; i < 30; i++) tree(rand(x0, x1), rand(-40, -16), rand(1.1, 1.9), A.rain ? LEAVES.dark[0] : LEAVES.green[0], 'pine');
    for (let x = 16; x < L; x += 24) flagPole(x, -8, fs);
    if (A.rain) pointLights[0].color.set(0xa8c0ff);
  }
  if (bg === 'night') {
    for (let x = 0; x < L + 20; x += rand(8, 12)) tent(x, rand(-12, -9), pick([0x3a3a5a, 0x4a4a6a, 0x2e2e4a]), rand(.9, 1.2));
    for (let x = 10; x < L; x += 20) { envMesh(geo('brazier', () => new T.CylinderGeometry(.5, .3, .9, 10)), 0x2a2a30, { p: [x, .45, -7.5], cast: true }); flameAt(x, .9, -7.5, .55); }
    for (let i = 0; i < 30; i++) tree(rand(x0, x1), rand(-50, -22), rand(1.3, 2), LEAVES.dark[0], 'pine');
    for (let x = 14; x < L; x += 24) flagPole(x, -8, fs, 5);
  }
  if (bg === 'camp') {
    tent(-2, -6, 0xe8dcc0, 1.5); tent(7, -7.5, 0xd8ccb0, 1.3); tent(16, -6.5, 0xe8dcc0, 1.4); tent(-10, -7, 0xd0c4a8, 1.2);
    envMesh(geo('logs', () => new T.CylinderGeometry(.9, 1, .3, 12)), 0x4a3020, { p: [8, .15, 1.2] }); flameAt(8, .3, 1.2, .9);
    for (const x of [-9, 16]) flagPole(x, -3, fs, 5);
    palisade(-30, -18, -9); palisade(22, 36, -9);
    envMesh(new T.BoxGeometry(2.4, .9, 1.2), 0x6a4a2a, { p: [9, .45, 3], cast: true }); envMesh(new T.BoxGeometry(2.6, .1, 1.4), 0x8a1a1a, { p: [9, .95, 3] });
    envMesh(geo('anvil', () => new T.BoxGeometry(.9, .5, .5)), 0x4a4a52, { p: [-6, .7, 3], cast: true }); envMesh(geo('anvilb', () => new T.CylinderGeometry(.3, .4, .5, 8)), 0x5a3a22, { p: [-6, .25, 3] });
    pointLights[0].color.set(0xff8a3a); pointLights[0].intensity = 2; pointLights[0].position.set(8, 2, 1.2);
  }
}
function ambientTick(dt, cx) {
  const r = Math.random;
  switch (ENV.ambient) {
    case 'petal': for (let i = 0; i < 2; i++) if (r() < .35) PN.emit(cx + rand(-20, 20), rand(6, 11), rand(-8, 8), rand(-1.2, -.4), rand(-.9, -.5), rand(-.3, .3), 9, rand(.14, .22), tmpC.set(pick([0xffc8dc, 0xffe0ea, 0xffffff])), 0, 0, 1, 1.2); break;
    case 'leaf': if (r() < .4) PN.emit(cx + rand(-20, 20), rand(6, 11), rand(-8, 8), rand(-1.4, -.4), rand(-.9, -.5), 0, 9, rand(.16, .24), tmpC.set(pick([0x9ad06a, 0xd8e070, 0x7ab85a])), 0, 0, 1, 1.4); break;
    case 'dust': if (r() < .5) PA.emit(cx + rand(-18, 18), rand(.5, 5), rand(-8, 6), rand(-.2, .3), rand(-.05, .1), 0, 6, rand(.05, .1), tmpC.set(0xffd8a8), 0, 0, .9, .3); break;
    case 'ember': for (let i = 0; i < 2; i++) PA.emit(cx + rand(-20, 20), rand(-.5, 1), rand(-12, 6), rand(-.5, .8), rand(1, 2.5), rand(-.2, .2), rand(3, 5), rand(.06, .14), tmpC.set(pick([0xff8a2a, 0xffb050, 0xff5a1a])), 0, 0, 2.6, 1.2); break;
    case 'firefly': if (r() < .35) PA.emit(cx + rand(-16, 16), rand(.4, 3), rand(-9, 8), 0, 0, 0, rand(3, 5), rand(.08, .14), tmpC.set(0xd8ff8a), 0, .5, 2.4, 1.2); break;
  }
  if (ENV.rain) for (let i = 0; i < 10 * ENV.rain; i++) PN.emit(cx + rand(-22, 22), rand(8, 13), rand(-10, 9), -1.5, -24, 0, .55, .05, tmpC.set(0xb8c8e0), 0, 0, .7);
  for (const em of ENV.emitters) { if (Math.abs(em.x - cx) > 40) continue;
    if (em.kind === 'fire' && r() < .6) PA.emit(em.x + rand(-.3, .3) * em.s, em.y, em.z + rand(-.3, .3) * em.s, rand(-.3, .3), rand(1.5, 3.5) * em.s, 0, rand(.5, 1), rand(.3, .7) * em.s, tmpC.set(pick([0xff7a2a, 0xffb040, 0xff5020])), -1, .5, 2.4); }
}
function animateEnv(dt) {
  const t = W.t; GRASS_MAT.uniforms.uTime.value = t; SKY_U.uTime.value = t; WATERS.forEach(m => { m.uniforms.uTime.value = t; });
  for (const f of ENV.flags) { const p = f.g.attributes.position, b = f.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.setZ(i, Math.sin(x * 3.2 - t * 5 + f.ph) * .16 * (x / 1.3) + Math.sin(b[i * 3 + 1] * 2 + t * 3) * .04 * x); } p.needsUpdate = true; }
  for (const fl of ENV.flames) { const s = fl.s * (1 + Math.sin(t * 13 + fl.ph) * .08 + Math.sin(t * 7.3 + fl.ph) * .06); fl.grp.scale.set(fl.s, s, fl.s); }
  if (ENV.key === 3) pointLights.forEach((l, i) => { l.intensity = 1.2 + Math.sin(t * 11 + i * 2) * .25 + Math.sin(t * 23 + i) * .15; });
  if (ENV.rain && Math.random() < .002) { W.flash = .6; setTimeout(() => sfx('boom'), 400); }
}
