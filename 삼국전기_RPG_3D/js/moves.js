'use strict';
/* ===== 무장별 고유 동작 · 신규 커맨드 5종 · 화려한 필살기 · 타격/피격 이펙트 =====
   game.js 의 startAttack / tickAttack / tickSpecial / attackPose / cmdInput 을 이 파일의 버전으로 대체한다. */

/* ---------- 무장 테마 (스킬 · 타격 · 필살기의 색과 입자) ---------- */
const THEME = {
  guan: { c: '#5dffa0', c2: '#e0ffe8', kind: 'dragon' }, zhang: { c: '#ff6a3a', c2: '#ffd8a8', kind: 'earth' }, zhao: { c: '#9ad8ff', c2: '#ffffff', kind: 'ice' },
  huang: { c: '#ffb040', c2: '#fff0c0', kind: 'fire' }, zhuge: { c: '#b8a0ff', c2: '#eef0ff', kind: 'bolt' }, ma: { c: '#ffe07a', c2: '#ffffff', kind: 'gold' },
  diao: { c: '#ff8ad0', c2: '#ffe4f2', kind: 'petal' }, wei: { c: '#ff6a2a', c2: '#ffd070', kind: 'fire' }, lubu: { c: '#ff3a3a', c2: '#ffd0a0', kind: 'crimson' },
  xu: { c: '#ffb040', c2: '#f0e0c0', kind: 'earth' }, gan: { c: '#ffd84a', c2: '#fff6c0', kind: 'bolt' }, sun: { c: '#ff6a4a', c2: '#ffe0a0', kind: 'fire' },
};
const themeOf = p => THEME[p.h ? p.h.id : 'guan'] || THEME.guan;
function themeBurst(x, y, z, th, n = 16, spd = 5) {
  const c1 = col(th.c), c2 = col(th.c2);
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283), v = spd * rand(.4, 1);
    switch (th.kind) {
      case 'petal': PN.emit(x, y, z, Math.cos(a) * v, rand(1, 4), Math.sin(a) * v * .6, rand(.8, 1.6), rand(.18, .28), i % 2 ? c1 : c2, 2, 1.5, 1, 2); break;
      case 'earth': PN.emit(x, y, z, Math.cos(a) * v, rand(3, 7), Math.sin(a) * v * .5, rand(.6, 1), rand(.18, .32), tmpC.set(pick(['#8a6a44', '#a88a5a', '#6a5038'])), 16, 1, 1); PA.emit(x, y, z, Math.cos(a) * v, rand(0, 3), Math.sin(a) * v * .5, .35, .25, c1, 0, 2, 2); break;
      case 'ice': PA.emit(x, y, z, Math.cos(a) * v, rand(-1, 4), Math.sin(a) * v * .6, rand(.4, .8), rand(.1, .22), i % 3 ? c2 : c1, 3, 1, 2.6); break;
      case 'bolt': PA.emit(x, y, z, Math.cos(a) * v * 1.4, rand(-4, 4), Math.sin(a) * v, rand(.1, .25), rand(.12, .25), i % 2 ? c1 : c2, 0, 0, 3.2); break;
      case 'fire': PA.emit(x, y, z, Math.cos(a) * v * .6, rand(2, 6), Math.sin(a) * v * .4, rand(.4, .9), rand(.2, .45), tmpC.set(pick(['#ff7a2a', '#ffb040', '#ff4a1a', '#ffe070'])), -1.5, 1, 2.6); break;
      case 'crimson': PA.emit(x, y, z, Math.cos(a) * v, rand(-1, 3), Math.sin(a) * v * .6, rand(.3, .6), rand(.15, .3), i % 3 ? c1 : tmpC.set('#ffd0a0'), 0, 2, 3); PN.emit(x, y, z, Math.cos(a) * v * .3, rand(.5, 2), 0, rand(.6, 1), rand(.4, .7), tmpC.set('#2a0a10'), -1, 1, .6); break;
      case 'gold': PA.emit(x, y, z, Math.cos(a) * v, rand(0, 5), Math.sin(a) * v * .6, rand(.5, 1), rand(.08, .16), i % 2 ? c1 : c2, 4, 1, 3); break;
      default: PA.emit(x, y, z, Math.cos(a) * v * 1.2, rand(-1, 4), Math.sin(a) * v * .6, rand(.3, .7), rand(.15, .3), i % 2 ? c1 : c2, 0, 2, 2.6);
    }
  }
}
function themeTrail(p, th, n = 4) { for (let i = 0; i < n; i++) themeBurst(p.x - p.facing * rand(0, 1.2), (p.y || 0) + rand(.3, 1.8), p.z + rand(-.3, .3), th, 1, 1.5); }
function spiralFx(x, z, th, h = 7, life = 1) { for (let i = 0; i < 60; i++) { const a = i * .45, y = i / 60 * h, r = .8 + Math.sin(i * .2) * .2; PA.emit(x + Math.cos(a) * r, y, z + Math.sin(a) * r * .6, -Math.sin(a) * 3, 2, Math.cos(a) * 2, life * rand(.5, 1), .3, i % 2 ? col(th.c) : col(th.c2), 0, 1, 2.6); } }
function ringOfPillars(x, z, r, c, n = 8, h = 5) { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; pillar(x + Math.cos(a) * r, z + Math.sin(a) * r * .6, c, h, .6, .45); } }
function groundCrack(x, z, dir, len, c) {
  const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(2.4), transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  const g = new T.Group(); let px = 0, pz = 0;
  for (let i = 0; i < 12; i++) { const nx = px + len / 12, nz = pz + rand(-.35, .35); const seg = new T.Mesh(geo('crackseg', () => { const q = new T.PlaneGeometry(1, .12); q.rotateX(-Math.PI / 2); return q; }), m); const L0 = Math.hypot(nx - px, nz - pz);
    seg.scale.x = L0; seg.position.set((px + nx) / 2, .05, (pz + nz) / 2); seg.rotation.y = -Math.atan2(nz - pz, nx - px); g.add(seg); px = nx; pz = nz; }
  g.position.set(x, 0, z); g.scale.x = dir; addFx(g, 1.2, (fx, u) => { m.opacity = u < .15 ? u / .15 : 1 - smooth(.5, 1, u); }, m);
}
/* ---------- 타격 · 피격 이펙트 ---------- */
let _starTex = null, _slashTex = null;
function starTex() { if (_starTex) return _starTex; const [c, x] = makeCanvas(128, 128); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.9)'); g.addColorStop(.4, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, L = i % 2 ? 40 : 62; x.beginPath(); x.moveTo(64 + Math.cos(a) * L, 64 + Math.sin(a) * L); x.lineTo(64 + Math.cos(a + .12) * 10, 64 + Math.sin(a + .12) * 10); x.lineTo(64 + Math.cos(a - .12) * 10, 64 + Math.sin(a - .12) * 10); x.closePath(); x.fill(); }
  _starTex = new T.CanvasTexture(c); _starTex.userData.keep = true; return _starTex; }
function slashTex() { if (_slashTex) return _slashTex; const [c, x] = makeCanvas(256, 32); const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 16); x.quadraticCurveTo(128, 2, 256, 16); x.quadraticCurveTo(128, 30, 0, 16); x.fill();
  _slashTex = new T.CanvasTexture(c); _slashTex.userData.keep = true; return _slashTex; }
function spriteFx(tex, x, y, z, c, s0, s1, life, rot = 0, sx = 1) {
  const m = new T.SpriteMaterial({ map: tex, color: col(c).multiplyScalar(2.2), transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, rotation: rot });
  const sp = new T.Sprite(m); sp.position.set(x, y, z); sp.renderOrder = 20;
  addFx(sp, life, (fx, u) => { const s = lerp(s0, s1, easeOut(Math.min(1, u * 2.5))); sp.scale.set(s * sx, s, 1); m.opacity = 1 - smooth(.35, 1, u); }, m);
}
function hitFx(e, src, crit, el, o, dmg) {
  const th = src && src.h ? themeOf(src) : { c: '#ff6a4a', c2: '#ffffff', kind: 'spark' }, c = (el && el !== 'phys' && HAN_EL[el]) || th.c;
  if (src && (src.state === 'special' || src.state === 'xcmd')) W.hitstop = Math.min(W.hitstop, src.state === 'xcmd' ? .03 : .015);
  const y = (e.y || 0) + 1.15 * (e.scale || 1) + (e.mounted ? 1 : 0), side = Math.sign(e.x - (src ? src.x : e.x - 1)) || 1, hx = e.x - side * .15, hz = e.z + .35;
  spriteFx(starTex(), hx, y, hz, crit ? '#fff2a0' : c, .4, crit ? 3.4 : 2.1, crit ? .32 : .22, rand(0, 6));
  spriteFx(slashTex(), hx, y + rand(-.2, .2), hz, crit ? '#ffffff' : th.c2, .5, crit ? 3.6 : 2.4, .2, rand(-.9, .9), 1);
  for (let i = 0; i < (crit ? 18 : 10); i++) PA.emit(hx, y, hz, side * rand(3, 9), rand(-2, 5), rand(-2, 2), rand(.15, .35), rand(.08, .16), col(i % 2 ? c : '#ffffff'), 10, 3, 3);
  if (o && o.skill) themeBurst(hx, y, hz, th, 8, 4);
  if (crit) { shockwave(e.x, e.z, 2.2, '#ffe08a', y * .0 + .08); UI.dmg(e.x, y + 1.2, e.z, '치명타!', 'critl'); W.shake = Math.max(W.shake, .22); }
  if (o && (o.knock || o.launch)) { shockwave(e.x, e.z, 1.6, c); dust(e.x, e.z, 6, 1); }
  if (!e.dead && e.root && !e.sqT) { e.sqT = 1; const base = e.scale || 1; addFx(new T.Object3D(), .16, (fx, u) => { if (!e.root || e.dead) return; const k = Math.sin(u * Math.PI) * .14; e.root.scale.set(base * (1 + k), base * (1 - k), base * (1 + k)); if (u >= 1) { e.root.scale.setScalar(base); e.sqT = 0; } }); }
}
function blockFx(e) { spriteFx(starTex(), e.x + e.facing * .6, 1.2 * (e.scale || 1), e.z + .35, '#8ac8ff', .3, 1.6, .18, 0); shockwave(e.x + e.facing * .5, e.z, .9, '#8ac8ff', 1); }
function hurtFx(p, d, src) {
  const el = $('#hurtfx'); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  spriteFx(starTex(), p.x, (p.y || 0) + 1.2, p.z + .35, '#ff4a3a', .4, 2.4, .25, rand(0, 6));
  for (let i = 0; i < 12; i++) PA.emit(p.x, (p.y || 0) + 1.2, p.z + .3, rand(-5, 5), rand(0, 5), rand(-2, 2), .3, .14, tmpC.set('#ff5a4a'), 10, 3, 2.6);
  W.shake = Math.max(W.shake, .28); W.hitstop = Math.max(W.hitstop, .06);
}
function lowHpFx() { const el = $('#hurtfx'); if (!el) return; el.classList.toggle('low', !!(SCENE === 'battle' && B && B.p && B.p.hp < B.p.S.maxhp * .3 && !B.p.dead)); }

/* ---------- 추가 자세 (6~13) ---------- */
const _attackPose0 = attackPose;
attackPose = function (P, i, u, w) {
  if (i <= 5) return _attackPose0(P, i, u, w);
  const a = u < w ? u / w : 1, b = u < w ? 0 : (u - w) / (1 - w), k = easeOut(Math.min(1, b * 2.4));
  P.lL = .45; P.lR = -.3; P.hy = .9; P.aLx = -.6; P.aLz = .35;
  switch (i) {
    case 6: P.aRx = -1.45; P.g = 1.45; P.aRz = -.35; P.trx = .12; P.try_ = u < w ? lerp(0, 1.25, easeOut(a)) : lerp(1.25, -1.2, k); break;
    case 7: P.aRx = u < w ? lerp(-.5, -3.2, easeOut(a)) : lerp(-3.2, -.05, easeOut(Math.min(1, b * 3.2))); P.g = .7; P.trx = u < w ? -.3 * a : lerp(-.3, .55, k); P.hy = u < w ? .96 : .76; P.lL = .8; P.lR = -.6; P.aLx = u < w ? -2.6 * a : -.5; break;
    case 8: P.aRx = u < w ? lerp(-.6, -2.6, easeOut(a)) : lerp(-2.6, -.5, k); P.aRz = u < w ? -.2 : lerp(-.2, -.9, k); P.g = .5; P.try_ = u < w ? .4 * a : lerp(.4, -.4, k); break;
    case 9: P.aRx = u < w ? lerp(-.8, -2.4, easeOut(a)) : lerp(-2.4, -1.55, k); P.g = u < w ? -.4 : lerp(-.4, 1.55, k); P.try_ = u < w ? -.6 * a : lerp(-.6, .5, k); P.trx = .2; P.lL = .6; break;
    case 10: P.aRx = u < w ? lerp(-.6, -2.1, easeOut(a)) : lerp(-2.1, -1.1, k); P.aRz = u < w ? lerp(-.2, -1.1, a) : lerp(-1.1, .4, k); P.g = -.8; P.try_ = u < w ? .5 * a : lerp(.5, -.5, k); break;
    case 11: P.aRx = -1.5; P.g = 1.5; P.trx = .38; P.hy = .8; P.lL = .95; P.lR = -.85; P.shz = u < w ? -.35 * a : lerp(-.35, .45, easeOut(Math.min(1, b * 3))); P.try_ = u < w ? -.6 * a : lerp(-.6, .5, k); break;
    case 12: P.aRx = -1.45; P.g = 1.45; P.aRz = -.55; P.hy = .86; P.bry = u < w ? .3 * a : .3 - easeInOut(b) * Math.PI; break;
    case 13: P.aRx = -1.1; P.g = 1.3; P.hy = .7; P.trx = .45; P.lL = 1; P.lR = -.9; P.try_ = u < w ? lerp(0, -1, easeOut(a)) : lerp(-1, 1.1, k); break;
  }
};

/* ---------- 무장별 기본 연속기 ---------- */
const MOVESET = {
  guan: [{ p: 1, d: .36, m: 1, r: 1.1 }, { p: 6, d: .34, m: 1, r: 1.1 }, { p: 12, d: .4, m: 1.1, r: 1.15, spin: 1 }, { p: 7, d: .55, m: 1.8, r: 1.2, knock: 1, quake: 1 }],
  zhang: [{ p: 2, d: .3, m: .9, r: 1.1 }, { p: 2, d: .3, m: .9, r: 1.1 }, { p: 11, d: .4, m: 1.1, r: 1.3, step: 5 }, { p: 7, d: .6, m: 1.9, r: 1.1, knock: 1, quake: 1 }],
  zhao: [{ p: 2, d: .24, m: .75, r: 1.15 }, { p: 2, d: .24, m: .75, r: 1.15 }, { p: 11, d: .3, m: .8, r: 1.3, step: 4 }, { p: 1, d: .3, m: .8 }, { p: 4, d: .42, m: 1.4, launch: 1, knock: 1 }],
  huang: [{ p: 0, d: .32, m: 1 }, { p: 1, d: .32, m: 1 }, { p: 5, d: .45, m: 1.5, proj: 'farrow', knock: 1 }],
  zhuge: [{ p: 10, d: .32, m: .9, proj: 'windS' }, { p: 10, d: .32, m: .9, proj: 'windS' }, { p: 10, d: .45, m: 1.4, proj: 'wind', knock: 1 }],
  ma: [{ p: 11, d: .32, m: .9, step: 4, r: 1.25 }, { p: 1, d: .3, m: .9 }, { p: 12, d: .36, m: 1, spin: 1 }, { p: 2, d: .45, m: 1.6, knock: 1, r: 1.3 }],
  diao: [{ p: 8, d: .22, m: .6 }, { p: 12, d: .24, m: .6, spin: 1 }, { p: 8, d: .22, m: .6 }, { p: 3, d: .34, m: .8, spin: 1 }, { p: 4, d: .38, m: 1.2, launch: 1, knock: 1 }],
  wei: [{ p: 7, d: .42, m: 1.3 }, { p: 13, d: .36, m: 1.1 }, { p: 7, d: .6, m: 2, knock: 1, quake: 1, fire: 1 }],
  lubu: [{ p: 1, d: .32, m: 1, r: 1.15 }, { p: 6, d: .3, m: 1, r: 1.15 }, { p: 12, d: .34, m: 1, spin: 1 }, { p: 11, d: .36, m: 1.1, step: 5, r: 1.3 }, { p: 7, d: .52, m: 1.9, knock: 1, quake: 1 }],
  xu: [{ p: 7, d: .45, m: 1.4 }, { p: 1, d: .4, m: 1.3 }, { p: 3, d: .55, m: 1.9, spin: 1, knock: 1, quake: 1 }],
  gan: [{ p: 9, d: .3, m: .9, r: 1.35 }, { p: 9, d: .3, m: .9, r: 1.35 }, { p: 12, d: .36, m: .9, spin: 1, r: 1.1 }, { p: 9, d: .42, m: 1.5, r: 1.5, knock: 1, bolt: 1 }],
  sun: [{ p: 5, d: .24, m: .8, proj: 'arrow' }, { p: 5, d: .24, m: .8, proj: 'arrow' }, { p: 5, d: .24, m: .8, proj: 'arrow' }, { p: 5, d: .4, m: 1.3, proj: 'farrow3', knock: 1 }],
};
const BOW_SET = MOVESET.sun;
const _tickAttack0 = tickAttack;
W.dim = 0;
const POSE_SLASH = { 0: 'chop', 1: 'sweep', 2: 'thrust', 3: 'spin', 4: 'rise', 6: 'sweep', 7: 'chop', 8: 'xcut', 9: 'thrust', 10: 'sweep', 11: 'thrust', 12: 'spin', 13: 'sweep' };
function comboOf(p) { return isBow(p) && p.h.id !== 'sun' ? BOW_SET : (MOVESET[p.h.id] || MOVESET.guan); }
startAttack = function (f, i) {
  const C = comboOf(f), m = C[i]; setState(f, 'attack'); f.combo = i; f.pose = m.p; f.queued = false; f.hitIds.clear(); f.mv = m;
  f.atkDur = m.d / (f.S ? f.S.wSpd || 1 : 1) * (f.def && f.def.atkSpeed ? 1 / f.def.atkSpeed : 1); f.windFrac = m.p === 7 ? .42 : .3;
  f.vx = f.facing * (m.step || 1.2); f.vz = 0;
};
tickAttack = function (p, dt) {
  const u = p.st / p.atkDur, m = p.mv || {}, th = themeOf(p), C = comboOf(p);
  if (p.state === 'dashatk' || p.state === 'launch') return _tickAttack0(p, dt);
  p.vx *= Math.exp(-dt * 10);
  if (!p.didSwing && u >= p.windFrac) {
    p.didSwing = true; sfx(m.knock ? 'heavy' : 'swing');
    const reach = reachOf(p) * (m.r || 1), d = pOf(p, 'basic') * (m.m || 1);
    if (m.proj) {
      if (m.proj === 'arrow' || m.proj === 'farrow' || m.proj === 'farrow3') { const n = m.proj === 'farrow3' || (m.proj === 'farrow' && p.S.pw.triArrow) ? 3 : 1, fire = m.proj !== 'arrow';
        for (let k = 0; k < n; k++) fireProj({ kind: fire ? 'farrow' : 'arrow', team: 'p', from: p, x: p.x + p.facing * .6, y: 1.35, z: p.z + (k - (n - 1) / 2) * .6, vx: p.facing * 24, dmg: d, knock: !!m.knock, el: fire ? 'fire' : 'phys', r: .55, c: th.c, trail: fire ? th.c : null, pierce: fire }); sfx('shoot'); }
      else fireProj({ kind: 'qi', team: 'p', from: p, x: p.x + p.facing, z: p.z, vx: p.facing * (m.proj === 'wind' ? 14 : 12), dmg: d, knock: !!m.knock, pierce: true, c: th.c, trail: th.c, s: m.proj === 'wind' ? 1.1 : .7, life: m.proj === 'wind' ? 1 : .55, r: m.proj === 'wind' ? 1.1 : .8 });
      if (p.h.id === 'huang' && m.proj !== 'farrow') slash(p, 'chop', th.c, { s: reach / 2.7 });
    } else {
      const ty = POSE_SLASH[m.p] || 'chop', mir = m.p === 6 || m.p === 13;
      slash(p, ty, th.c, { s: reach / 2.7 * (m.p === 7 ? 1.25 : 1), life: m.p === 12 || m.p === 3 ? .34 : .26, tilt: m.p === 13 ? -.2 : mir ? -.35 : .3, h: m.p === 13 ? .6 : 1.15, follow: m.spin, rz: m.p === 8 ? rand(-.3, .3) : 0 });
      if (m.p === 8 && p.rig.lgrip) slash(p, 'chop', th.c2, { s: reach / 2.7, life: .24, rz: .6 });
      if (m.quake) setTimeout(() => { if (!B || p.dead) return; const x = p.x + p.facing * reach * .7; shockwave(x, p.z, 3, th.c); themeBurst(x, .3, p.z, th, 14, 5); if (m.fire) pillar(x, p.z, '#ff6a1a', 4, .5, .8); W.shake = Math.max(W.shake, .3); aoeP(p, x, p.z, 1.8, d * .6, { knock: true, noProc: true, el: m.fire ? 'fire' : 'phys' }); }, 60);
      if (m.bolt) setTimeout(() => { if (!B) return; lightning(p.x + p.facing * reach * .9, p.z, th.c, .7); }, 40);
    }
  }
  if (p.didSwing && u < p.windFrac + .35 && !m.proj) { const reach = reachOf(p) * (m.r || 1);
    meleeP(p, { reach, spin: !!m.spin, dz: m.spin ? 1.5 : 1, dmg: pOf(p, 'basic') * (m.m || 1), kb: m.knock ? 5 : 1.5, knock: !!m.knock, launch: !!m.launch }); }
  if (hit('atk') && u > .3) p.queued = true;
  if (u >= 1) { if (p.queued && p.combo < C.length - 1) startAttack(p, p.combo + 1); else setState(p, 'idle'); }
};

/* ---------- 신규 커맨드 5종 ---------- */
const XIN = ['↓ ← + 공격', '← → + 공격', '↓ ↓ + 공격', '↑ ↓ + 공격', '→ ↓ → + 공격'], XCOST = [15, 15, 20, 20, 25];
const XMOVES = {
  guan: [['청룡반월', '靑龍半月', 'wave2'], ['천리주단기', '千里走單騎', 'charge'], ['언월진산', '偃月鎭山', 'slam'], ['청룡강림', '靑龍降臨', 'dive'], ['승룡참', '昇龍斬', 'rise']],
  zhang: [['연인포효', '燕人咆哮', 'roar'], ['맹호돌격', '猛虎突擊', 'charge'], ['대지분쇄', '大地粉碎', 'slam'], ['장판낙격', '長坂落擊', 'dive'], ['사모승천', '蛇矛昇天', 'rise']],
  zhao: [['칠진칠출', '七進七出', 'multidash'], ['백룡관일', '白龍貫日', 'beam'], ['은창우', '銀槍雨', 'skyrain'], ['비룡낙창', '飛龍落槍', 'dive'], ['용담승천', '龍膽昇天', 'rise']],
  huang: [['백보천양', '百步穿楊', 'snipe'], ['노장돌격', '老將突擊', 'charge'], ['화시산개', '火矢散開', 'fan'], ['낙일시', '落日矢', 'skyrain'], ['정군산일격', '定軍山一擊', 'rise']],
  zhuge: [['팔진도', '八陣圖', 'field'], ['동남풍벽', '東南風壁', 'windwall'], ['칠성뇌', '七星雷', 'skyrain'], ['화계매복', '火計埋伏', 'mines'], ['와룡선풍', '臥龍旋風', 'tornado']],
  ma: [['사자후', '獅子吼', 'roar'], ['서량질주', '西涼疾走', 'charge'], ['금마선풍', '錦馬旋風', 'spin'], ['비마낙창', '飛馬落槍', 'dive'], ['사자승천', '獅子昇天', 'rise']],
  diao: [['월하검무', '月下劍舞', 'dance'], ['화영보', '花影步', 'multidash'], ['낙화유수', '落花流水', 'skyrain'], ['비연낙화', '飛燕落花', 'dive'], ['폐월섬', '閉月閃', 'rise']],
  wei: [['반골참', '反骨斬', 'wave2'], ['자오곡돌파', '子午谷突破', 'charge'], ['화산분출', '火山噴出', 'eruptions'], ['열화낙참', '烈火落斬', 'dive'], ['반골승천', '反骨昇天', 'rise']],
  lubu: [['방천참월', '方天斬月', 'wave2'], ['적토돌격', '赤兎突擊', 'charge'], ['무쌍진격', '無雙震擊', 'slam'], ['천하낙격', '天下落擊', 'dive'], ['인중승천', '人中昇天', 'rise']],
  xu: [['부월선풍', '斧鉞旋風', 'spin'], ['개산돌진', '開山突進', 'charge'], ['대지가르기', '大地裂', 'fissure'], ['낙부', '落斧', 'dive'], ['부월승천', '斧鉞昇天', 'rise']],
  gan: [['방울연격', '鈴連擊', 'lashes'], ['수적기습', '水賊奇襲', 'multidash'], ['금범뇌우', '錦帆雷雨', 'skyrain'], ['돛대낙하', '帆柱落下', 'dive'], ['쇄편선풍', '鎖鞭旋風', 'tornado']],
  sun: [['백덤블링연사', '後轉連射', 'backflip'], ['궁요돌진', '弓腰突進', 'charge'], ['화살폭우', '箭雨', 'skyrain'], ['낙하사격', '落下射擊', 'fan'], ['승천시', '昇天矢', 'snipe']],
};
const XPOSE = { wave2: 'wave', charge: 'dash', slam: 'slam', dive: 'slam', rise: 'rise', roar: 'raise', multidash: 'dash', beam: 'dash', skyrain: 'raise', snipe: 'bow', fan: 'wave', field: 'raise', windwall: 'wave', mines: 'raise', tornado: 'wave', spin: 'spin', dance: 'spin', eruptions: 'slam', fissure: 'slam', lashes: 'melee', backflip: 'flip' };
function cmdRowsFor(hero) {
  const rows = CMDLIST.slice(); if (!hero) return rows;
  const X = XMOVES[hero.id] || []; X.forEach((m, i) => rows.splice(1 + i, 0, [XIN[i], `${m[0]} (${hero.name} 전용)`, `기력 ${XCOST[i]}`])); rows[0] = ['↓ → + 공격', `${hero.cmd.name} (${hero.name} 전용)`, '기력 20']; return rows;
}
cmdInput = function (facing) {
  const now = W.t, rec = dirHist.filter(h => now - h.t < .38); if (!rec.length) return null;
  const f0 = rec[0].f || facing, str = rec.map(h => h.d === 'up' ? 'U' : h.d === 'down' ? 'D' : ((h.d === 'right' ? 1 : -1) === f0 ? 'F' : 'B')).join(''), end = t => str.endsWith(t);
  if (end('FDF')) return { k: 'x', i: 4, f: f0 };
  if (end('DB')) return { k: 'x', i: 0, f: f0 };
  if (end('BF')) return { k: 'x', i: 1, f: f0 };
  if (end('DD')) return { k: 'x', i: 2, f: f0 };
  if (end('UD')) return { k: 'x', i: 3, f: f0 };
  if (end('DF')) return { k: 'cmd', dir: f0 };
  if (end('DU')) return { k: 'launch' };
  if (held('down') && (hit('right') || hit('left'))) return { k: 'cmd', dir: hit('right') ? 1 : -1 };
  return null;
};
function startXcmd(p, i, f) {
  const X = (XMOVES[p.h.id] || XMOVES.guan)[i], lv = effSkillLv(p.P, SKT[p.h.id][0][2], p.S), cost = Math.max(8, XCOST[i] - Math.floor(lv / 3));
  if (p.ki < cost) { UI.dmg(p.x, 2.4, p.z, '기력 부족', 'block'); sfx('no'); return false; }
  p.ki -= cost; if (f) p.facing = f; setState(p, 'xcmd'); p.xm = { name: X[0], hz: X[1], ty: X[2], i }; p.xs = { n: 0, tick: 0 }; p.hitIds.clear(); p.poseKind = XPOSE[X[2]] || 'raise';
  p.invuln = Math.max(p.invuln, .25); dirHist.length = 0;
  const th = themeOf(p); magicCircle(p.x, p.z, th.c, 2); themeBurst(p.x, 1, p.z, th, 14, 3); UI.super(X[0]); UI.dmg(p.x, 3, p.z, X[0], 'skill'); shout(p.h.name, X[0]); sfx('special'); W.hitstop = .08;
  return true;
}
function tickXcmd(p, dt) {
  const st = p.st, s = p.xs, th = themeOf(p), f = p.facing, d = pOf(p, 'cmd') * [1.4, 1.4, 1.7, 1.7, 2][p.xm.i], c = th.c;
  const once = k => { if (s[k]) return false; s[k] = 1; return true; };
  const every = (iv, fn, from, until) => { if (st < from || st > until) return; s.tick -= dt; if (s.tick <= 0) { s.tick = iv; s.n++; fn(s.n); } };
  const landed = () => st > .2 && (p.y || 0) <= .001;
  let end = 1;
  switch (p.xm.ty) {
    case 'wave2': end = .8; for (const [t0, k, sy] of [[.15, 'a', .9], [.38, 'b', 1.7]]) if (st > t0 && once(k)) { fireProj({ kind: 'qi', team: 'p', from: p, x: p.x + f, y: sy, z: p.z, vx: f * 17, dmg: d * .9, knock: k === 'b', pierce: true, c, trail: c, s: 1.8, r: 1.4, rz: 1.3, life: 1 }); slash(p, k === 'a' ? 'sweep' : 'chop', c, { s: 1.3 }); sfx('heavy'); } break;
    case 'charge': end = .95; if (st < .12) p.vx = 0; else if (st < .6) { p.vx = f * 24; p.vz = axis().z * 3; meleeP(p, { reach: 1.9, back: 1, dz: 1.4, dmg: d * .8, knock: true, kb: 6 }); themeTrail(p, th, 5); if (once('s')) slash(p, 'thrust', c, { s: 1.6, follow: true, life: .5 }); }
      else { p.vx *= .8; if (once('f')) { shockwave(p.x + f, p.z, 3.4, c); themeBurst(p.x + f, 1, p.z, th, 24, 6); p.hitIds.clear(); aoeP(p, p.x + f, p.z, 2.4, d * .8, { knock: true }); W.shake = .4; sfx('boom'); } } break;
    case 'slam': if (once('j')) { p.vy = 9.5; p.y = .02; } if (!s.l && landed()) { s.l = st; shockwave(p.x, p.z, 5, c); shockwave(p.x, p.z, 3.5, th.c2); ringOfPillars(p.x, p.z, 3, c); themeBurst(p.x, .3, p.z, th, 30, 7); dust(p.x, p.z, 30, 2); W.shake = .7; W.hitstop = .1; sfx('boom'); aoeP(p, p.x, p.z, 4.2, d * 1.4, { knock: true, kb: 6 }); }
      end = s.l ? s.l + .5 : 2; break;
    case 'dive': if (once('j')) { p.vy = 14; p.y = .02; p.vx = f * 5; } if (st > .4 && once('d')) { p.vy = -28; p.vx = f * 12; } if (s.d && !s.l) themeTrail(p, th, 6);
      if (s.d && !s.l && (p.y || 0) <= .001) { s.l = st; p.vx = 0; shockwave(p.x, p.z, 6, c); shockwave(p.x, p.z, 4, th.c2); ringOfPillars(p.x, p.z, 2.6, c, 10, 6); themeBurst(p.x, .3, p.z, th, 40, 8); W.shake = .9; W.flash = .3; W.hitstop = .12; sfx('boom'); aoeP(p, p.x, p.z, 3.6, d * 1.6, { knock: true, kb: 7 }); }
      end = s.l ? s.l + .5 : 2.2; break;
    case 'rise': end = 1.2; if (st > .08 && once('u')) { p.vy = 12; p.y = .02; spiralFx(p.x + f * .8, p.z, th, 8, 1); pillar(p.x + f * .8, p.z, c, 9, .8, 1); slash(p, 'rise', c, { s: 1.5, life: .4, follow: true }); sfx('heavy'); }
      if (st > .1 && st < .5) { meleeP(p, { reach: 2.4, back: .6, dz: 1.3, dmg: d * .9, launch: true, knock: true }); themeTrail(p, th, 3); } if (!s.l && landed()) s.l = st; if (s.l) end = s.l + .15; break;
    case 'roar': end = 1; if (st > .2 && once('r')) { for (let k = 0; k < 4; k++) setTimeout(() => { if (!B) return; spriteFx(starTex(), p.x + f * (1.5 + k * 1.6), 1.4, p.z, c, 1, 3 + k, .4); }, k * 80); shockwave(p.x, p.z, 8, c); W.shake = .7; sfx('boom');
        for (const e of B.enemies) if (!e.dead && (e.x - p.x) * f > -1 && (e.x - p.x) * f < 8 && Math.abs(e.z - p.z) < 2.6) dealDamage(p, e, d * .8, { stun: 1.5, noProc: true }); } break;
    case 'multidash': end = 1; every(.13, n => { if (n > 6) return; const tg = B.enemies.filter(e => !e.dead && (e.x - p.x) * f > -3 && Math.abs(e.x - p.x) < 10).sort(() => Math.random() - .5)[0]; const ox = p.x, oz = p.z;
        p.x = tg ? tg.x + f * rand(.8, 1.4) : p.x + f * 2.5; p.z = tg ? tg.z : p.z; p.x = clamp(p.x, B.camX - halfW(), B.camX + halfW());
        const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(2.5), transparent: true, blending: T.AdditiveBlending, depthWrite: false }); const ln = new T.Mesh(geo('dashln', () => { const q = new T.PlaneGeometry(1, .18); return q; }), m);
        ln.position.set((ox + p.x) / 2, 1.2, (oz + p.z) / 2 + .1); ln.scale.x = Math.abs(p.x - ox) + .5; addFx(ln, .3, (fx, u) => { m.opacity = 1 - u; }, m); themeBurst(p.x, 1, p.z, th, 10, 4);
        if (tg) { p.facing = Math.sign(tg.x - p.x) || f; dealDamage(p, tg, d * .5, { knock: n === 6, noProc: true }); } slash(p, pick(['sweep', 'xcut', 'chop']), c, { s: 1.2, life: .2 }); sfx('swing'); }, .05, .9); break;
    case 'beam': end = .9; if (st > .3 && once('b')) { const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(3), transparent: true, blending: T.AdditiveBlending, depthWrite: false });
        const bm = new T.Mesh(geo('beamcyl', () => { const q = new T.CylinderGeometry(1, 1, 1, 16, 1, true); q.rotateZ(Math.PI / 2); q.translate(.5, 0, 0); return q; }), m); bm.position.set(p.x + f * .6, 1.2, p.z); bm.scale.set(f * 15, .45, .45);
        addFx(bm, .6, (fx, u) => { bm.scale.y = bm.scale.z = .45 * (1 - u) + .05; m.opacity = 1 - u; }, m); W.flash = .35; W.shake = .5; sfx('zap');
        for (const e of B.enemies) if (!e.dead && (e.x - p.x) * f > 0 && (e.x - p.x) * f < 15 && Math.abs(e.z - p.z) < 1.1) { dealDamage(p, e, d * 1.8, { knock: true, kb: 6, noProc: true }); themeBurst(e.x, 1.2, e.z, th, 10, 4); } } break;
    case 'skyrain': end = 1.2; every(.07, n => { const x = p.x + f * rand(1.5, 9), z = clamp(p.z + rand(-2.6, 2.6), -4, 4);
        if (th.kind === 'bolt') { if (n % 2) { lightning(x, z, c, .8); aoeP(p, x, z, 1.4, d * .5, { el: 'bolt', noProc: true }); } return; }
        const kind = th.kind === 'fire' ? 'fireball' : th.kind === 'petal' || th.kind === 'crimson' ? 'qi' : 'arrow';
        fireProj({ kind, team: 'p', from: p, x: x - f * 2, y: 11, z, vx: f * 5, vy: -26, dmg: d * .45, fall: true, c, trail: c, s: kind === 'qi' ? .7 : .8, onLand: o => { themeBurst(o.x, .3, o.z, th, 8, 3); shockwave(o.x, o.z, 1.4, c); aoeP(p, o.x, o.z, 1.3, o.dmg, { noProc: true, el: th.kind === 'fire' ? 'fire' : th.kind === 'ice' ? 'ice' : 'phys' }); } }); }, .2, 1); break;
    case 'snipe': end = .9; if (st > .4 && once('s')) { fireProj({ kind: 'farrow', team: 'p', from: p, x: p.x + f * .6, y: 1.35, z: p.z, vx: f * 32, dmg: d * 2.4, knock: true, kb: 8, pierce: true, el: 'fire', c, trail: c, s: 2.5, r: 1, rz: 1, life: 1.2 }); spriteFx(starTex(), p.x + f * .8, 1.35, p.z + .2, c, .6, 3.5, .3); W.shake = .4; sfx('boom'); } break;
    case 'fan': end = .8; if (st > .25 && once('f')) { for (let k = -2; k <= 2; k++) fireProj({ kind: th.kind === 'fire' ? 'farrow' : 'qi', team: 'p', from: p, x: p.x + f * .7, y: 1.3 + (p.y || 0), z: p.z, vx: f * 20, vz: k * 3, dmg: d * .8, pierce: true, knock: true, c, trail: c, s: .8, r: .8 }); sfx('shoot'); } break;
    case 'field': end = .8; if (st > .25 && once('f')) { const fx0 = p.x + f * 4, fz = p.z; magicCircle(fx0, fz, c, 3.4); magicCircle(fx0, fz, th.c2, 2.4); let tick = 0;
        addFx(new T.Object3D(), 2.2, (fx, u, ddt) => { tick -= ddt; if (tick <= 0 && B) { tick = .25; themeBurst(fx0 + rand(-2, 2), .2, fz + rand(-1.5, 1.5), th, 4, 2); for (const e of B.enemies) if (!e.dead && Math.hypot(e.x - fx0, (e.z - fz) * 1.3) < 3.2) dealDamage(p, e, d * .3, { stun: .35, noProc: true, stop: 0, el: 'bolt' }); } if (u > .05 && u < .12) magicCircle(fx0, fz, c, 3.4); }); sfx('zap'); } break;
    case 'windwall': end = .8; if (st > .25 && once('w')) { fireProj({ kind: 'qi', team: 'p', from: p, x: p.x + f, y: 1.2, z: p.z, vx: f * 9, dmg: d * 1, knock: true, kb: 9, pierce: true, c, trail: c, s: 2.6, r: 1.4, rz: 3.8, life: 1.6, multi: .4 }); sfx('heavy'); } break;
    case 'mines': end = .7; if (st > .2 && once('m')) { for (let k = 0; k < 4; k++) addHazard({ x: p.x + f * (2 + k * 2), z: clamp(p.z + (k % 2 ? 1.2 : -1.2), -4, 4), r: 1.6, delay: .8 + k * .12, owner: 'p', kind: 'fire', dmg: 0, edmg: d * 1.2, dur: .3, c: '#ff8a2a' }); sfx('fire'); } break;
    case 'tornado': end = .8; if (st > .3 && once('t')) { fireProj({ kind: 'tornado', team: 'p', from: p, x: p.x + f * 1.2, z: p.z, vx: f * 6, dmg: d * .35, pierce: true, multi: .2, pull: true, c, s: 1.7, life: 2.2, r: 1.4, rz: 1.4 }); sfx('heavy'); } break;
    case 'spin': end = 1.15; every(.12, n => { p.hitIds.clear(); meleeP(p, { reach: 3.3, spin: true, dz: 1.8, dmg: d * .35, knock: n >= 8, noProc: true, stop: .02 }); slash(p, 'spin', c, { s: 1.2, life: .2, follow: true, tilt: rand(-.1, .3) }); themeBurst(p.x, 1, p.z, th, 5, 5); sfx('swing'); }, 0, 1.05); p.vx = axis().x * 3; break;
    case 'dance': end = 1.35; p.vx = f * 5; every(.1, n => { p.hitIds.clear(); meleeP(p, { reach: 2.8, spin: true, dz: 1.6, dmg: d * .3, knock: n >= 11, noProc: true, stop: .02 }); slash(p, pick(['spin', 'xcut']), c, { s: 1.1, life: .2, follow: true }); themeBurst(p.x, 1.2, p.z, th, 6, 4); }, 0, 1.2); break;
    case 'eruptions': end = 1.15; every(.12, n => { const x = p.x + f * (1.2 + n * 1.2), z = clamp(p.z + (n % 2 ? .8 : -.8), -4, 4); pillar(x, z, '#ff6a1a', 6, .6, .9); themeBurst(x, .3, z, th, 12, 5); aoeP(p, x, z, 1.5, d * .55, { el: 'fire', launch: true, knock: true, noProc: true }); sfx('fire'); }, .15, 1); break;
    case 'fissure': end = 1.1; if (st > .25 && once('f')) { groundCrack(p.x + f * .8, p.z, f, 11, c); W.shake = .5; sfx('boom'); for (let k = 0; k < 9; k++) setTimeout(() => { if (!B) return; const x = p.x + f * (1.5 + k * 1.2); themeBurst(x, .2, p.z, th, 10, 5); pillar(x, p.z, c, 3, .4, .6); aoeP(p, x, p.z, 1.3, d * .6, { launch: true, knock: true, noProc: true }); }, 80 + k * 55); } break;
    case 'lashes': end = .95; every(.11, n => { if (n > 6) return; p.hitIds.clear(); slash(p, 'thrust', c, { s: 1.8, life: .16, rz: (n % 2 ? .25 : -.25) }); meleeP(p, { reach: 5.2, dz: 1.2, dmg: d * .4, knock: n === 6, noProc: true, stop: .02 }); if (n % 2 === 0) spriteFx(starTex(), p.x + f * 4.8, 1.2, p.z, c, .5, 1.8, .2); sfx('swing'); }, .05, .85); break;
    case 'backflip': end = .9; if (once('j')) { p.vy = 9; p.y = .02; } if (st < .35) p.vx = -f * 8; else p.vx *= .8;
      every(.07, n => { if (n > 6) return; fireProj({ kind: n % 2 ? 'farrow' : 'arrow', team: 'p', from: p, x: p.x + f * .5, y: 1.3 + (p.y || 0), z: p.z, vx: f * 22, vy: -((p.y || 0) * 3), vz: rand(-2, 2), dmg: d * .45, pierce: n % 2 === 1, c, trail: n % 2 ? c : null, r: .6 }); sfx('shoot'); }, .1, .6); break;
  }
  if (st > end) { setState(p, 'idle'); p.poseKind = null; p.invuln = Math.max(p.invuln, .15); }
}

/* ---------- 필살기 연출 ---------- */
const CINE = { t: 0, dur: 0, f: null };
const _updateCamera0 = updateCamera;
updateCamera = function (dt, snap) {
  _updateCamera0(dt, snap);
  if (CINE.t > 0 && CINE.f && SCENE === 'battle') { CINE.t -= dt; const u = 1 - CINE.t / CINE.dur, k = Math.sin(Math.min(1, u) * Math.PI) * .75, f = CINE.f;
    const tp = new T.Vector3(f.x + f.facing * 1.6, (f.y || 0) + 2, f.z + 6.5), tl = new T.Vector3(f.x, (f.y || 0) + 1.3, f.z);
    camera.position.lerp(tp, k); const look = new T.Vector3(camLook.x, camLook.y, camLook.z).lerp(tl, k); camera.lookAt(look); }
};
function letterbox(on) { const el = $('#lbox'); if (el) el.classList.toggle('on', on); }
function raysFx(x, y, z, c, life) {
  const g = new T.Group(); g.position.set(x, y, z - .6); const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(1.6), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  for (let i = 0; i < 14; i++) { const r = new T.Mesh(geo('ray', () => { const q = new T.PlaneGeometry(.35, 14); q.translate(0, 7, 0); return q; }), m); r.rotation.z = i / 14 * Math.PI * 2; r.scale.x = rand(.5, 1.6); g.add(r); }
  addFx(g, life, (fx, u) => { g.rotation.z += .012; m.opacity = Math.min(1, u * 6) * (1 - smooth(.7, 1, u)) * .5; }, m);
}
function ghostAvatar(p, c, life) {
  const b = buildFighter(p.look, { elem: c }), m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(1.5), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
  b.root.traverse(o => { if (o.isMesh) { o.material = m; o.castShadow = false; } });
  const R = b.rig; R.armR.sh.rotation.x = -2.6; R.armL.sh.rotation.x = -2.2; R.armL.sh.rotation.z = .5; R.wgrip.rotation.x = .3; R.torso.rotation.x = -.15;
  const s = 3.4 * (p.scale || 1); b.root.scale.setScalar(s); b.root.position.set(p.x - p.facing * 1.4, -.5, p.z - 3); b.root.rotation.y = p.facing > 0 ? .9 : -.9;
  addFx(b.root, life, (fx, u) => { m.opacity = Math.min(1, u * 5) * (1 - smooth(.75, 1, u)) * .55; b.root.position.y = -.5 + u * .8; });
}
function spFinish(hz, c) { const el = $('#spfin'); if (!el) return; el.textContent = hz; el.style.setProperty('--cc', c); el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 1500); }
function spCinematic(p) {
  const th = themeOf(p), c = p.spC || th.c, L = 4.6;
  CINE.t = CINE.dur = 1.3; CINE.f = p; letterbox(true); clearTimeout(CINE.lb); CINE.lb = setTimeout(() => letterbox(false), 9000);
  W.dim = 1; raysFx(p.x, 1.4, p.z, c, L); ghostAvatar(p, c, L);
  magicCircle(p.x, p.z, c, 5.5); setTimeout(() => { if (B) magicCircle(p.x, p.z, th.c2, 3.6); }, 250);
  spiralFx(p.x, p.z, th, 9, 1.4); pillar(p.x, p.z, c, 14, 1.2, 1.4); shockwave(p.x, p.z, 7, c);
}
const _startSpecial0 = startSpecial;
startSpecial = function (p, myth) { const before = p.state; _startSpecial0(p, myth); if (p.state === 'special' && before !== 'special') { spCinematic(p); W.slow = .5; } };
tickSpecial = function (p, dt) {
  const st = p.st, s = p.sp, d = pOf(p, 'sp') * .62, c = p.spC, f = p.facing, hw = halfW(), cx = B.camX, th = themeOf(p);
  const onScreen = () => B.enemies.filter(e => !e.dead && Math.abs(e.x - cx) < hw + 1);
  const every = (iv, fn, from, until) => { if (st < from || st > until) return; s.tick -= dt; if (s.tick <= 0) { s.tick = iv; s.n++; fn(s.n); } };
  if (W.dim > 0) W.dim = Math.max(.35, W.dim - dt * .3);
  if (Math.random() < .5) themeBurst(p.x + rand(-1, 1), rand(.2, 2.4), p.z + rand(-.6, .6), th, 1, 2);
  let end = 3;
  switch (p.spType) {
    case 'crescent': every(.55, n => { if (n > 4) return; fireProj({ kind: 'dragon', team: 'p', from: p, x: p.x + f, y: 1 + (n % 2) * .8, z: p.z, vx: f * 16, dmg: d * 2.2, knock: n === 4, pierce: true, c, s: 2.4, r: 2.4, rz: 3.5, trail: c, life: 1.6, noProc: true }); slash(p, n % 2 ? 'sweep' : 'chop', c, { s: 2 }); spiralFx(p.x + f * 2, p.z, th, 6, .8); W.shake = .5; sfx('boom'); }, .3, 2.6); break;
    case 'roar': if (!s.j) { s.j = 1; p.vy = 10; p.y = .02; }
      every(.6, n => { if (n > 4 || (p.y || 0) > .05) return; shockwave(p.x, p.z, 16, c); shockwave(p.x, p.z, 10, '#ffe0a0'); groundCrack(p.x, p.z, 1, 9, c); groundCrack(p.x, p.z, -1, 9, c); W.shake = .9; sfx('boom'); dust(p.x, p.z, 30, 2.5);
        for (const e of onScreen()) dealDamage(p, e, d * 1.8, { knock: n === 4, stun: 1, noProc: true, dir: Math.sign(e.x - p.x) || 1 }); if (n < 4) { p.vy = 8; p.y = .02; } }, .35, 2.8); break;
    case 'dash': if (st > .3 && st < 2.6) { const k = Math.floor((st - .3) / .55); if (k !== s.k) { s.k = k; f !== 0 && (p.facing = k % 2 ? -1 : 1); p.hitIds.clear(); slash(p, 'thrust', c, { s: 2.2, follow: true, life: .5 }); sfx('heavy'); }
        p.vx = p.facing * 28; meleeP(p, { reach: 2, back: 1.5, dz: 1.8, dmg: d * 1.6, knock: true, kb: 8, noProc: true }); themeTrail(p, th, 8); if (Math.abs(p.x - cx) > hw - .5) p.x = cx + Math.sign(p.x - cx) * (hw - .5); } else p.vx *= .85; end = 2.9; break;
    case 'rain': every(.035, n => { const x = cx + rand(-hw, hw), z = rand(-3.8, 3.8); fireProj({ kind: n % 5 ? 'farrow' : 'fireball', team: 'p', from: p, x: x - f * 2, y: 13, z, vx: f * 4, vy: -26, dmg: d * .35, fall: true, c: '#ff8a2a', trail: '#ff8a2a', s: n % 5 ? .8 : 1.2, onLand: o => { burst(o.x, .3, o.z, '#ff8a2a', 10, 4, .4, .3); if (n % 5 === 0) shockwave(o.x, o.z, 2.5, '#ffb040'); aoeP(p, o.x, o.z, 1.4, o.dmg, { el: 'fire', noProc: true, knock: Math.random() < .25 }); } }); }, .3, 2.8); break;
    case 'thunder': { const tg = onScreen(); every(.1, n => { const e = tg.length ? tg[n % tg.length] : null, x = e ? e.x : cx + rand(-hw, hw), z = e ? e.z : rand(-3.5, 3.5); lightning(x, z, n % 4 ? c : '#ffffff', n % 6 ? 1 : 1.6); aoeP(p, x, z, 1.8, d * .9, { el: 'bolt', knock: n % 5 === 0, noProc: true }); }, .3, 2.7);
      if (st > .3 && once2(s, 'bg')) { magicCircle(cx, 0, c, hw * .8); } break; }
    case 'tornado': case 'whipstorm': case 'charm': {
      const r = p.spType === 'whipstorm' ? 4.8 : 4; p.vx = axis().x * 3; p.vz = axis().z * 2;
      for (const e of B.enemies) if (!e.dead && !e.boss && Math.abs(e.x - p.x) < 9) { e.x = lerp(e.x, p.x, dt * 2); e.z = lerp(e.z, p.z, dt * 2); }
      every(.12, n => { p.hitIds.clear(); meleeP(p, { reach: r, spin: true, dz: 2.4, dmg: d * .32, knock: n % 8 === 0, noProc: true, stop: .02, el: p.spType === 'charm' ? 'ice' : p.spType === 'whipstorm' ? 'bolt' : 'phys' }); slash(p, 'spin', c, { s: r / 2.6, life: .22, follow: true, tilt: rand(-.2, .3) }); sfx('swing'); if (n % 6 === 0 && p.spType === 'whipstorm') lightning(p.x + rand(-3, 3), p.z + rand(-1, 1), c, .7); }, .2, 2.8);
      for (let i = 0; i < 8; i++) { const a = rand(0, 6.28), rr = rand(1, r); themeBurst(p.x + Math.cos(a) * rr, rand(.2, 3), p.z + Math.sin(a) * rr * .6, th, 1, 3); } break; }
    case 'fire': every(.09, n => { const k = n % 12, dir = Math.floor(n / 12) % 2 ? -1 : 1, x = p.x + f * dir * (1 + k * 1.1); if (Math.abs(x - cx) > hw + 2) return; pillar(x, p.z, '#ff6a1a', 7, .7, 1.1); themeBurst(x, .3, p.z, th, 10, 5); aoeP(p, x, p.z, 1.8, d * .55, { el: 'fire', launch: k === 11, knock: k === 11, noProc: true }); if (k % 3 === 0) sfx('fire'); }, .3, 2.7); break;
    case 'musou': every(.08, n => { p.hitIds.clear(); const x = cx + rand(-hw * .85, hw * .85); slash({ x, y: 0, z: rand(-2, 2), facing: pick([-1, 1]), scale: 1 }, pick(['chop', 'sweep', 'xcut', 'spin']), n % 3 ? c : '#ffd0a0', { s: 2, life: .28, rz: rand(-.6, .6) }); aoeP(p, x, 0, 4, d * .45, { knock: n % 8 === 0, noProc: true, stop: .02 }); if (n % 4 === 0) sfx('swing'); }, .3, 2.8); break;
    case 'axequake': if (!s.j) { s.j = 1; p.vy = 11; p.y = .02; }
      every(.8, n => { if (n > 3 || (p.y || 0) > .05) return; W.shake = .9; sfx('boom'); groundCrack(p.x, p.z, f, 12, c); for (let k = 0; k < 9; k++) setTimeout(() => { if (!B) return; const x = p.x + f * (1.5 + k * 1.4); pillar(x, p.z, '#ffb040', 5, .5, .8); dust(x, p.z, 10, 1.5); themeBurst(x, .3, p.z, th, 8, 5); aoeP(p, x, p.z, 1.8, d * .7, { knock: true, launch: true, noProc: true }); }, k * 60); if (n < 3) { p.vy = 9; p.y = .02; } }, .35, 2.8); break;
    case 'bowdance': if (st < 2.6 && (p.y || 0) <= .01 && st > .1) p.vy = 7; every(.035, n => { fireProj({ kind: n % 3 ? 'arrow' : 'farrow', team: 'p', from: p, x: p.x, y: 1.4 + (p.y || 0), z: p.z + rand(-.5, .5), vx: (n % 20 < 10 ? f : -f) * 24 * rand(.8, 1.1), vz: rand(-3, 3), dmg: d * .3, r: .6, c: '#ff6a4a', trail: n % 3 ? null : '#ff6a4a', noProc: true }); if (n % 4 === 0) sfx('shoot'); }, .15, 2.7); break;
    default: mythSpecial(p, st, s, d * 1.6, c, cx, hw); end = 2.6;
  }
  if (st > end && !s.fin) { s.fin = 1; s.finT = 0; spFinish(HERO_SP_HZ[p.h.id] || '必殺', c); }
  if (s.fin) { s.finT += dt;
    if (Math.random() < .8) { const x = cx + rand(-hw, hw), z = rand(-3.5, 3.5); burst(x, rand(.5, 2.5), z, c, 12, 6, .5, .5, 2.8); if (Math.random() < .3) shockwave(x, z, 3, c); }
    if (s.finT > .5 && once2(s, 'x1')) { slash({ x: cx, y: 0, z: 0, facing: 1, scale: 1 }, 'xcut', c, { s: 5, life: .6 }); W.flash = .5; sfx('heavy'); }
    if (s.finT > 1.1 && !s.boom) { s.boom = 1; W.flash = 1.1; W.shake = 1; sfx('boom'); for (let k = 0; k < 6; k++) shockwave(cx + (k - 2.5) * hw / 3, 0, 6, k % 2 ? c : '#ffffff');
      for (const e of onScreen()) dealDamage(p, e, d * 2.2, { knock: true, noProc: true, force: true }); W.hitstop = .15; }
    if (s.finT > 1.7) { setState(p, 'idle'); p.invuln = .5; p.poseKind = null; W.dim = 0; letterbox(false); } }
};
function once2(s, k) { if (s[k]) return false; s[k] = 1; return true; }

/* ---------- 컷인 초상 (별도 렌더러로 무장 3D 모델) ---------- */
const CUT = { r: null, scene: null, cam: null, f: null, t: 0, key: '' };
function cutInit() {
  if (CUT.r) return; const c = document.createElement('canvas'); c.id = 'cutcv'; CUT.r = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); CUT.r.outputEncoding = T.sRGBEncoding; CUT.r.toneMapping = T.ACESFilmicToneMapping; CUT.r.toneMappingExposure = 1.3;
  CUT.r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); CUT.r.setSize(420, 420, false);
  CUT.scene = new T.Scene(); CUT.scene.add(new T.HemisphereLight(0xffffff, 0x404060, 1.1)); const dl = new T.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 3, 4); CUT.scene.add(dl); CUT.rim = new T.DirectionalLight(0xffffff, 1.6); CUT.rim.position.set(-3, 2, -3); CUT.scene.add(CUT.rim);
  CUT.cam = new T.PerspectiveCamera(26, 1, .1, 50);
}
function cutStart(look, c, spin) {
  cutInit(); const key = JSON.stringify(look.gear || {}) + look.body + look.weapon + STYLE.mc;
  if (CUT.key !== key) { if (CUT.f) CUT.scene.remove(CUT.f.root); const b = buildFighter(look, { elem: c }); CUT.f = { ...b, look, state: 'special', poseKind: 'raise', st: 0, phase: 0, facing: 1, rotY: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, scale: 1 }; CUT.scene.add(b.root); CUT.key = key; }
  CUT.rim.color.set(c); CUT.t = 0; CUT.dur = 1.8; CUT.spin = spin;
  const host = $('#cut-pt'); if (host && CUT.r.domElement.parentNode !== host) host.appendChild(CUT.r.domElement);
}
function cutFrame(dt) {
  if (!CUT.f || CUT.t >= (CUT.dur || 0)) return; CUT.t += dt; const u = CUT.t / CUT.dur; CUT.f.st = CUT.t; pose(CUT.f, dt); CUT.f.root.rotation.y = -.5 + u * .7 + (CUT.spin ? u * 6 : 0);
  CUT.cam.position.set(0, 1.55 + u * .1, lerp(2.4, 1.8, easeOut(u))); CUT.cam.lookAt(0, 1.45, 0); CUT.r.render(CUT.scene, CUT.cam);
}
const _cutin0 = UI.cutin;
UI.cutin = function (hz, name, sub, c) {
  _cutin0(hz, name, sub, c);
  const el = $('#cutin'); clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 1800);
  let look = null; if (B && B.p && (sub === B.p.h.name || String(sub).startsWith('각성기'))) look = B.p.look;
  else if (B) { const e = B.enemies.find(q => q.name === sub); if (e) look = e.look; }
  const host = $('#cut-pt'); if (host) host.hidden = !look; if (look) { try { cutStart(look, c); } catch (e) { if (host) host.hidden = true; } }
};
const _uiFrame0 = UI.frame;
UI.frame = function (dt) { _uiFrame0(dt); try { cutFrame(dt); } catch (e) { CUT.t = 99; } lowHpFx();
  if (!(B && B.p && B.p.state === 'special') && W.dim > 0) { W.dim = Math.max(0, W.dim - dt * 2); if (W.dim === 0) letterbox(false); } };

/* ---------- 스킬 테마 (무장마다 다른 시전 연출) ---------- */
function themeCastFx(p, s) {
  const th = themeOf(p), x = p.x, z = p.z;
  switch (th.kind) {
    case 'dragon': spiralFx(x, z, th, 5, .9); break;
    case 'petal': for (let i = 0; i < 30; i++) PN.emit(x + rand(-1.5, 1.5), rand(2, 4), z + rand(-1, 1), rand(-1, 1), rand(-1, 0), 0, 1.6, rand(.18, .28), tmpC.set(pick([th.c, th.c2])), .5, 0, 1, 2); break;
    case 'bolt': lightning(x, z - .3, th.c, .45); magicCircle(x, z, th.c2, 1.8); break;
    case 'fire': pillar(x, z, '#ff6a1a', 4, .6, .7); themeBurst(x, .3, z, th, 18, 3); break;
    case 'ice': for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; PA.emit(x + Math.cos(a) * 1.4, .2, z + Math.sin(a) * .9, 0, rand(2, 4), 0, .8, .2, col(th.c2), 0, 0, 2.6); } break;
    case 'crimson': spriteFx(starTex(), x, 1.3, z + .3, th.c, .5, 3.2, .35); themeBurst(x, 1, z, th, 16, 4); break;
    case 'gold': spiralFx(x, z, th, 4, .8); shockwave(x, z, 2.4, th.c); break;
    case 'earth': shockwave(x, z, 2.6, th.c); dust(x, z, 16, 1.4); themeBurst(x, .2, z, th, 12, 4); break;
  }
}
