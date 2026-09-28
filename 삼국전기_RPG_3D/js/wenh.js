'use strict';
/* ===== 무기 강화 단계별 외형 ·  전투 연출 =====
   +3 연마 · +5 광휘 · +7 금장 · +10 염화 · +12 보주 · +13 뇌광 · +15 신병
   외형은 buildFighter 단계에서 입혀지므로 전투 · 군영 · 캐릭터 창 미리보기 · 컷인에 모두 적용된다. */
const WENH = [
  { e: 0, n: '기본', d: '' },
  { e: 3, n: '연마', d: '칼날이 밝게 연마됨' },
  { e: 5, n: '광휘', d: '칼날이 은은하게 발광 · 공격 시 빛 입자' },
  { e: 7, n: '금장', d: '금빛 광채 · 장식 수술 · 휘두를 때 금빛 잔광' },
  { e: 10, n: '염화', d: '무기가 커지고 불꽃 외피 · 타격 시 화염 파편' },
  { e: 12, n: '보주', d: '무기 주위를 도는 보주 3개' },
  { e: 13, n: '뇌광', d: '자색 뇌광 외피 · 타격 시 번개' },
  { e: 15, n: '신병', d: '무지개빛 외피 · 후광 · 타격 시 오색 폭발' }];
const wenhTier = e => { let t = WENH[0]; for (const w of WENH) if (e >= w.e) t = w; return t; };
const wenhNext = e => WENH.find(w => w.e > e) || null;
function enhColor(e, t = 0) {
  if (e >= 15) return '#' + new T.Color().setHSL((t * .25) % 1, .9, .62).getHexString();
  return e >= 13 ? '#b890ff' : e >= 10 ? '#ff7a2a' : e >= 7 ? '#ffd84a' : e >= 5 ? '#fff0c0' : null;
}
const wEnh = f => (f && f.look && f.look.gear && f.look.gear.weapon && f.look.gear.weapon.enh) || 0;
const nowS = () => performance.now() / 1000;

/* ---------- 장비 → 외형 데이터 ---------- */
const _gearLook0 = gearLook;
gearLook = function (P, baseLook) {
  const g = _gearLook0(P, baseLook), w = g.weapon; if (!w) return g;
  const e = w.enh || 0;
  if (e >= 3) w.metal = mixC(w.metal || '#dfe6ee', '#ffffff', .35);
  if (e >= 10) w.metal = mixC(w.metal, enhColor(e), .28);
  if (e >= 5) w.glow = e >= 15 ? '#ffe0ff' : enhColor(e);
  return g;
};

/* ---------- 모델 장식 ---------- */
function weaponBox(holder, wm) {
  const box = new T.Box3(), inv = new T.Matrix4().copy(holder.matrixWorld).invert(), tmp = new T.Box3(), m4 = new T.Matrix4();
  for (const o of wm) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)); box.union(tmp); }
  return box;
}
const isWM = o => o.isMesh && o.userData.slot === 'weapon' && !Array.isArray(o.material) && !o.userData.wenhHull;
function decorateWeapon(b, W0) {
  const e = W0.enh || 0, R = b.rig; if (e < 7) return;
  b.root.updateMatrixWorld(true);
  const holders = [];
  for (const g of [R.wgrip, R.lgrip]) if (g) { const wm = []; g.traverse(o => { if (isWM(o)) wm.push(o); }); if (wm.length) holders.push({ h: g, wm, grip: true }); }
  const hand = R.armL && R.armL.hand; if (hand) { const wm = hand.children.filter(isWM); if (wm.length) holders.push({ h: hand, wm, grip: false }); }
  const c0 = enhColor(e) || '#ffffff', AX = ['x', 'y', 'z'];
  for (const { h: holder, wm, grip } of holders) {
    const box = weaponBox(holder, wm); if (box.isEmpty()) continue;
    const size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const ai = size.x > size.y && size.x > size.z ? 0 : size.y > size.z ? 1 : 2, a = AX[ai], len = Math.max(.3, size[a]);
    const at = t => { const v = ctr.clone(); v[a] = lerp(box.min[a], box.max[a], t); return v; };
    const deco = new T.Group(); deco.name = 'wenh'; holder.add(deco);
    /* +7 금장 수술 (장병기 · 도검: 손잡이 위 / 활: 활대 중앙) */
    { const tm = toon('#ffd84a', { emissive: '#ffb020', ei: .5 }), cm = toon(e >= 10 ? c0 : '#c8201a');
      const tas = new T.Group(); tas.position.copy(at(grip ? .42 : .5)); if (!grip) tas.position.x += .06; deco.add(tas);
      tas.add(new T.Mesh(geo('tas_knot', () => new T.SphereGeometry(.045, 8, 6)), tm));
      const cord = new T.Mesh(geo('tas_cone', () => { const q = new T.ConeGeometry(.05, .26, 8); q.translate(0, -.16, 0); return q; }), cm); tas.add(cord);
      cord.onBeforeRender = () => { tas.rotation.x = Math.sin(nowS() * 3.2) * .25; }; }
    /* +10 외피: 무기 실루엣을 따라 빛나는 겉껍질 */
    if (e >= 10) {
      const hm = new T.MeshBasicMaterial({ color: col(c0).multiplyScalar(1.6), transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      for (const m of wm) { const mat = m.material.map ? Object.assign(hm.clone(), { map: m.material.map, alphaTest: .4 }) : hm;
        const hl = new T.Mesh(m.geometry, mat); hl.position.copy(m.position); hl.quaternion.copy(m.quaternion); hl.scale.copy(m.scale).multiplyScalar(m.material.map ? 1.1 : 1.08);
        m.parent.add(hl); hl.userData.wenhHull = 1;
        hl.onBeforeRender = () => { const t = nowS(); mat.opacity = .3 + Math.sin(t * (e >= 13 ? 11 : 5)) * .12 + (e >= 13 && Math.random() < .08 ? .35 : 0);
          if (e >= 15) mat.color.setHSL((t * .25) % 1, .9, .6).multiplyScalar(1.6); }; }
      if (grip) holder.scale.setScalar(1 + .06 + (e >= 15 ? .06 : 0));
    }
    /* +12 보주: 무기 끝 쪽을 도는 구슬 3개 */
    if (e >= 12) { const og = new T.Group(); og.position.copy(at(grip ? .72 : .5)); deco.add(og); const o1 = AX[(ai + 1) % 3], o2 = AX[(ai + 2) % 3];
      for (let k = 0; k < 3; k++) { const om = new T.MeshBasicMaterial({ color: col(e >= 13 ? '#d8c8ff' : '#ffe0a0').multiplyScalar(2.2), blending: T.AdditiveBlending, transparent: true, depthWrite: false });
        const o = new T.Mesh(geo('wenh_orb', () => new T.SphereGeometry(.045, 10, 8)), om); og.add(o);
        o.onBeforeRender = () => { const t = nowS() * 2.4 + k * 2.094; o.position.set(0, 0, 0); o.position[o1] = Math.cos(t) * .2; o.position[o2] = Math.sin(t) * .2; o.position[a] = Math.sin(t * 1.7) * len * .18;
          if (e >= 15) om.color.setHSL((nowS() * .25 + k / 3) % 1, .9, .65).multiplyScalar(2); }; } }
    /* +15 후광: 무기 끝의 빛 고리 */
    if (e >= 15) { const rm = new T.MeshBasicMaterial({ color: col('#fff4d0').multiplyScalar(2), transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      const ring = new T.Mesh(geo('wenh_halo', () => new T.TorusGeometry(.2, .018, 8, 32)), rm), tip = at(1); tip[a] += .08; ring.position.copy(tip); deco.add(ring);
      const base = new T.Euler(ai === 1 ? Math.PI / 2 : 0, ai === 0 ? Math.PI / 2 : 0, 0);
      ring.onBeforeRender = () => { const t = nowS(); ring.rotation.set(base.x, base.y, t * 2); ring.scale.setScalar(1 + Math.sin(t * 4) * .12); rm.color.setHSL((t * .25) % 1, .8, .7).multiplyScalar(2); }; }
  }
}
const _buildFighter0 = buildFighter;
buildFighter = function (L, opt) {
  const b = _buildFighter0(L, opt), w = L && L.gear && L.gear.weapon;
  if (w && (w.enh || 0) >= 7) { try { decorateWeapon(b, w); } catch (err) { console.warn('wenh', err); } }
  return b;
};

/* ---------- 전투: 휘두르기 잔광 · 타격 효과 ---------- */
const _slash0 = slash;
slash = function (f, type, c, o = {}) {
  const r = _slash0(f, type, c, o);
  if (typeof B !== 'undefined' && B && f === B.p) { const e = wEnh(f);
    if (e >= 7) { const cc = '#' + col(enhColor(e, W.t)).multiplyScalar(e >= 10 ? .5 : .38).getHexString();
      setTimeout(() => { if (B && B.p === f) _slash0(f, type, cc, { ...o, s: (o.s || 1) * (e >= 10 ? 1.1 : 1.05), life: (o.life || .26) * 1.15 }); }, 45); } }
  return r;
};
let _wenhBolt = 0;
const _hitFx1 = hitFx;
hitFx = function (e, src, crit, el, o, dmg) {
  _hitFx1(e, src, crit, el, o, dmg);
  if (!B || src !== B.p) return; const lv = wEnh(src); if (lv < 5) return;
  const y = (e.y || 0) + 1.15 * (e.scale || 1), c = col(enhColor(lv, W.t)), side = Math.sign(e.x - src.x) || 1;
  for (let i = 0; i < (lv >= 10 ? 6 : 4); i++) PA.emit(e.x, y, e.z + .3, side * rand(2, 7), rand(0, 5), rand(-2, 2), rand(.25, .5), rand(.1, .2), c, lv >= 10 ? -2 : 6, 2, 3);
  if (lv >= 10) for (let i = 0; i < 4; i++) PA.emit(e.x, y, e.z + .3, rand(-2, 2), rand(2, 6), rand(-1, 1), rand(.4, .8), rand(.2, .35), tmpC.set(pick(['#ff7a2a', '#ffb040', '#ffe070'])), -1.5, 1, 2.6);
  if (lv >= 13 && W.t > _wenhBolt && Math.random() < .3) { _wenhBolt = W.t + .35; lightning(e.x, e.z, '#b890ff', .45); }
  if (lv >= 15 && crit) spriteFx(starTex(), e.x, y, e.z + .35, '#' + col(enhColor(15, W.t + rand(0, 4))).multiplyScalar(.6).getHexString(), .5, 2.2, .25, rand(0, 6));
};

/* ---------- 정보 표시 ---------- */
function wenhInfo(e) {
  const cur = wenhTier(e), nx = wenhNext(e);
  return `<small class="wenh">무기 외형: <b>${cur.n}</b>${e >= 3 ? ` (+${cur.e})` : ''}${nx ? ` · 다음 +${nx.e} ${nx.n} — ${nx.d}` : ' · 최고 단계'}</small>`;
}
const _itemTip1 = itemTip;
itemTip = function (it, P) {
  const s = _itemTip1(it, P); if (it.s !== 'weapon' || (it.e || 0) < 3) return s;
  const t = wenhTier(it.e); return s.replace(/<small class="(bad)?">착용/, m => `<span class="proc">◆ 강화 외형 「${t.n}」 — ${t.d}</span><br>${m}`);
};
