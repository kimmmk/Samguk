'use strict';
/* ===== 적 등급별 외형 =====
   병졸 → 장교 → 정예 → 상급 정예 → 부장(중간 보스) → 무장(보스) → 명장(후반부 보스) → 패왕(숨겨진 전장 · 윤회 보스) */
const ERANK = [
  { n: '병졸' },
  { n: '장교', c: '#c8d0e0' },
  { n: '정예', c: '#ffb040' },
  { n: '상급 정예', c: '#ff7a2a' },
  { n: '부장', hz: '副將', c: '#8ad0ff' },
  { n: '무장', hz: '武將', c: '#ffd84a' },
  { n: '명장', hz: '名將', c: '#ff7a2a' },
  { n: '패왕', hz: '霸王', c: '#ff3a5a' }];
function enemyRank(e) {
  if (e.team !== 'e') return 0;
  if (e.boss && e.mid) return 4;
  if (e.boss) { const si = ORDER.indexOf(B.si); if (si < 0) return 7; return Math.min(7, 5 + (si >= 5 ? 1 : 0) + (G.cycle >= 1 ? 1 : 0)); }
  if (e.elite) return e.elite.length >= 2 ? 3 : 2;
  return e.officer ? 1 : 0;
}
const enemyRankInfo = e => ERANK[enemyRank(e)];
const ER_MAT = new Map();
function erHullMat(c, op) { const k = c + op; if (!ER_MAT.has(k)) { const m = addMat(c); m.side = T.BackSide; m.opacity = op; m.color.multiplyScalar(.7); ER_MAT.set(k, m); } return ER_MAT.get(k); }

function decorateEnemy(e) {
  const rk = enemyRank(e); e._rk = rk; e.rankN = ERANK[rk].n; if (!rk || !e.rig) return;
  const R = e.rig, mc = STYLE.mc, info = ERANK[rk];
  const c = rk === 2 || rk === 3 ? (ELITE[e.elite[0]] || {}).c || info.c : info.c;
  e.root.updateMatrixWorld(true);
  /* 투구 깃 장식: 장교 1 · 정예는 옵션 수만큼 · 무장급 3 */
  if (R.head) { const hm = []; R.head.traverse(o => { if (o.isMesh && !o.userData.wenhHull) hm.push(o); });
    if (hm.length) { const box = localBox(R.head, hm), n = rk >= 5 ? 3 : rk >= 2 ? Math.min(3, e.elite ? e.elite.length : 1) : 1, pm = toon(c, { emissive: c, ei: rk >= 2 ? .5 : .15 });
      for (let k = 0; k < n; k++) { const pl = new T.Mesh(geo('er_plume', () => { const q = new T.ConeGeometry(.045, .34, 5); q.translate(0, .17, 0); return q; }), pm);
        const ang = (k - (n - 1) / 2) * .45; pl.position.set(Math.sin(ang) * .08, box.max.y - .03, -.02 + Math.cos(ang) * -.03); pl.rotation.z = -ang; pl.rotation.x = -.35; R.head.add(pl); } } }
  if (rk < 2) return;
  /* 정예 이상: 몸 테두리 광채 */
  const body = R.body || e.root, op = rk >= 5 ? .6 : .45, hmat = rk >= 5 ? (() => { const m = addMat(c); m.side = T.BackSide; m.opacity = op; m.color.multiplyScalar(.7); return m; })() : erHullMat(c, op);
  const ms = []; body.traverse(o => { if (o.isMesh && o.userData.slot !== 'weapon' && !o.userData.wenhHull && o.geometry && o.visible) ms.push(o); });
  for (const m of ms) { const h = new T.Mesh(m.geometry, hmat); h.position.copy(m.position); h.quaternion.copy(m.quaternion); h.scale.copy(m.scale).multiplyScalar(mc ? 1.07 : 1.05); h.userData.wenhHull = 1; m.parent.add(h); }
  e._hull = hmat;
  /* 발밑 등급 고리 */
  const rm = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(1.6), transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, map: rk >= 5 ? circleTex() : null });
  const ring = new T.Mesh(rk >= 5 ? geo('er_circ', () => { const q = new T.PlaneGeometry(2, 2); q.rotateX(-Math.PI / 2); return q; }) : geo('er_ring', () => { const q = new T.RingGeometry(.55, .68, 32); q.rotateX(-Math.PI / 2); return q; }), rm);
  ring.position.y = .04; ring.scale.setScalar(rk >= 5 ? .9 + (rk - 5) * .2 : 1); e.root.add(ring);
  ring.onBeforeRender = () => { ring.rotation.y = nowS() * (rk >= 5 ? .8 : 1.5); rm.opacity = .45 + Math.sin(nowS() * 3) * .12; };
  if (rk < 4) return;
  /* 부장 이상: 등 뒤 등급 깃발 (副將 · 武將 · 名將 · 霸王) */
  if (R.torso && !e.decoy) { const bg = new T.Group(); bg.position.set(mc ? .12 : .1, mc ? .7 : .55, mc ? -.2 : -.16); bg.rotation.z = -.12; R.torso.add(bg);
    bg.add(new T.Mesh(geo('er_pole', () => { const q = new T.CylinderGeometry(.015, .015, 1.1, 6); q.translate(0, .55, 0); return q; }), toon('#3a2a1a')));
    const fl = new T.Mesh(geo('er_flag', () => { const q = new T.PlaneGeometry(.34, .6, 1, 6); q.translate(.17, 0, 0); return q; }), toon('#ffffff', { map: charTex(info.hz, rk >= 7 ? '#2a0a10' : '#1a1410', c, 128, 224), side: T.DoubleSide }));
    fl.position.set(.01, .75, 0); fl.rotation.y = Math.PI / 2; bg.add(fl); e.flags = (e.flags || []).concat([fl]);
    const tip = new T.Mesh(geo('er_tip', () => new T.ConeGeometry(.035, .12, 6)), toon(c, { emissive: c, ei: .6 })); tip.position.y = 1.15; bg.add(tip); }
  if (rk < 5) return;
  /* 무장 이상: 무기 광채 (명장 뇌광 · 패왕 신병) */
  try { decorateWeapon(e, { enh: rk >= 7 ? 15 : rk >= 6 ? 13 : 10 }); } catch (err) { }
  /* 패왕: 머리 뒤 흑염 고리 */
  if (rk >= 7 && R.head) { const hm2 = addMat('#ff2a4a'); hm2.opacity = .8; const halo = new T.Mesh(geo('er_halo', () => new T.TorusGeometry(.28, .025, 8, 36)), hm2); halo.position.set(0, .2, -.2); R.head.add(halo);
    halo.onBeforeRender = () => { const t = nowS(); halo.rotation.z = t; halo.scale.setScalar(1 + Math.sin(t * 5) * .08); hm2.opacity = .6 + Math.sin(t * 7) * .2; }; }
}
/* 오라 입자 · 국면에 따라 강해짐 */
function enemyAuraTick(e, dt) {
  const rk = e._rk || 0; if (rk < 5 || e.dead) return;
  const ph = e.phaseI || 0, rate = (rk >= 7 ? .03 : rk >= 6 ? .045 : .07) / (1 + ph * .5);
  if (e._hull) e._hull.opacity = .5 + ph * .12 + Math.sin(W.t * 4) * .1;
  e._aT = (e._aT || 0) - dt; if (e._aT > 0) return; e._aT = rate;
  const a = rand(0, 6.28), r = .5 * (e.scale || 1), c = rk >= 7 ? (Math.random() < .5 ? '#ff2a4a' : '#2a0a10') : rk >= 6 ? pick(['#ff7a2a', '#ffb040']) : '#ffd84a';
  const x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r * .6, y = (e.y || 0) + rand(.1, 1.8) * (e.scale || 1);
  if (rk >= 7 && Math.random() < .5) PN.emit(x, y, z, 0, rand(1, 2.5), 0, rand(.6, 1), rand(.3, .5), tmpC.set('#1a0508'), -1, 1, .6);
  else PA.emit(x, y, z, 0, rand(1, 2.5), 0, rand(.4, .8), rand(.12, .25), tmpC.set(c), -1, 1, 2.4);
}
const _updEnemies0 = updEnemies;
updEnemies = function (dt) {
  for (const e of B.enemies) if (e._rk === undefined && e.root) { try { decorateEnemy(e); } catch (err) { e._rk = 0; console.warn('erank', err); } }
  _updEnemies0(dt);
  if (B) for (const e of B.enemies) enemyAuraTick(e, dt);
};
