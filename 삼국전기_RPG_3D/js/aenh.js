'use strict';
/* ===== 방어구 강화 단계별 외형 =====
   부위별(투구 · 갑옷 · 장갑 · 신발 · 벨트 · 망토) 강화 수치에 따라 그 부위에만 적용.
   +3 연마 · +5 광휘 · +7 금장 · +10 염화 · +13 뇌광 · +15 신병 */
const AENH_SLOTS = { helm: 1, armor: 1, gloves: 1, boots: 1, belt: 1, cape: 1 };
const AENH = [
  { e: 0, n: '기본', d: '' },
  { e: 3, n: '연마', d: '표면이 은은하게 윤이 남' },
  { e: 5, n: '광휘', d: '방어구가 밝게 빛남' },
  { e: 7, n: '금장', d: '금빛 테두리 광채' },
  { e: 10, n: '염화', d: '불꽃 외피 · 부위 장식(투구 불꽃 장식 · 가슴 문장 · 손목/발목 고리 · 허리 보석)' },
  { e: 13, n: '뇌광', d: '자색 뇌광 외피가 번쩍임' },
  { e: 15, n: '신병', d: '무지개빛 외피 · 투구 후광 · 갑옷/망토는 빛의 날개' }];
const aenhTier = e => { let t = AENH[0]; for (const w of AENH) if (e >= w.e) t = w; return t; };
const armorCol = e => e >= 15 ? '#ffe0ff' : e >= 13 ? '#b890ff' : e >= 10 ? '#ff7a2a' : e >= 7 ? '#ffd84a' : '#fff0c0';

/* 장비 → 외형 데이터에 부위별 강화 수치를 싣는다 */
const _gearLook1 = gearLook;
gearLook = function (P, baseLook) {
  const g = _gearLook1(P, baseLook), eq = P.rpg.eq;
  for (const sl in AENH_SLOTS) if (g[sl] && eq[sl]) g[sl].enh = eq[sl].e || 0;
  return g;
};

function slotGroups(root, slot) {
  const byParent = new Map();
  root.traverse(o => { if (o.isMesh && o.userData.slot === slot && !o.userData.wenhHull) { if (!byParent.has(o.parent)) byParent.set(o.parent, []); byParent.get(o.parent).push(o); } });
  return byParent;
}
function localBox(parent, ms) {
  const box = new T.Box3(), inv = new T.Matrix4().copy(parent.matrixWorld).invert(), tmp = new T.Box3(), m4 = new T.Matrix4();
  for (const o of ms) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)); box.union(tmp); }
  return box;
}
const addMat = c => new T.MeshBasicMaterial({ color: col(c).multiplyScalar(2), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
function glowHullAnim(mat, e, base) {
  return () => { const t = nowS(); mat.opacity = base + Math.sin(t * (e >= 13 ? 10 : 4)) * base * .4 + (e >= 13 && Math.random() < .06 ? .3 : 0);
    if (e >= 15) mat.color.setHSL((t * .25) % 1, .85, .6).multiplyScalar(1.2); };
}
function decorateArmor(b, gear, mc) {
  b.root.updateMatrixWorld(true);
  let wings = 0;
  for (const slot in AENH_SLOTS) {
    const G0 = gear[slot], e = G0 && G0.enh || 0; if (e < 3) continue;
    const c = armorCol(e), groups = slotGroups(b.root, slot);
    /* +3 / +5: 표면 발광 (재질을 복제해 이 캐릭터만 바꾼다) */
    const ei = e >= 7 ? .16 : e >= 5 ? .12 : .06;
    for (const ms of groups.values()) for (const m of ms) {
      const tint = x => { if (!x || !x.emissive) return x; const y = x.clone(); y.onBeforeCompile = x.onBeforeCompile; y.customProgramCacheKey = x.customProgramCacheKey; y.emissive = col(c); y.emissiveIntensity = ei; return y; };
      m.material = Array.isArray(m.material) ? m.material.map(tint) : tint(m.material); m.userData.mat = m.material; }
    if (e < 7) continue;
    /* +7 이상: 외피 */
    const hm = addMat(e >= 10 ? c : '#ffd84a'), base = e >= 10 ? .55 : .4; hm.opacity = base; hm.side = T.BackSide; hm.color.multiplyScalar(.6);
    let first = true;
    for (const ms of groups.values()) for (const m of ms) {
      const h = new T.Mesh(m.geometry, hm); h.position.copy(m.position); h.quaternion.copy(m.quaternion); h.scale.copy(m.scale).multiplyScalar(mc ? 1.07 : 1.045); h.userData.wenhHull = 1; m.parent.add(h);
      if (first && e >= 10) { h.onBeforeRender = glowHullAnim(hm, e, base); first = false; } }
    if (e < 10) continue;
    /* +10 이상: 부위 장식 */
    const ranked = [...groups].sort((a, b2) => b2[1].length - a[1].length), keep = slot === 'gloves' || slot === 'boots' ? ranked.slice(0, 2) : ranked.slice(0, 1);
    const pref = slot === 'armor' ? b.rig.torso : slot === 'helm' ? b.rig.head : null; if (pref && groups.has(pref)) keep.splice(0, keep.length, [pref, groups.get(pref)]);
    for (const [parent, ms] of keep) {
      const box = localBox(parent, ms); if (box.isEmpty()) continue; const ctr = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
      const dm = addMat(c); dm.opacity = .85; const deco = new T.Group(); deco.name = 'aenh'; parent.add(deco);
      const anim = o => { o.onBeforeRender = () => { if (e >= 15) dm.color.setHSL((nowS() * .25) % 1, .85, .65).multiplyScalar(2); dm.opacity = .7 + Math.sin(nowS() * 5) * .2; }; };
      if (slot === 'helm') { /* 불꽃 장식 */
        const crest = new T.Mesh(geo('aenh_crest', () => { const q = new T.ConeGeometry(.07, .3, 4); q.translate(0, .15, 0); return q; }), dm); crest.position.set(ctr.x, box.max.y - .02, ctr.z); deco.add(crest); anim(crest);
        if (e >= 15) { const halo = new T.Mesh(geo('aenh_halo', () => { const q = new T.TorusGeometry(.2, .016, 8, 32); q.rotateX(Math.PI / 2); return q; }), dm); halo.position.set(ctr.x, box.max.y + .22, ctr.z); deco.add(halo);
          halo.onBeforeRender = () => { halo.rotation.y = nowS() * 1.5; halo.position.y = box.max.y + .22 + Math.sin(nowS() * 2) * .03; }; } }
      else if (slot === 'armor') { /* 가슴 문장 */
        const em = new T.Mesh(geo('aenh_emb', () => new T.RingGeometry(.035, .075, 6)), dm); em.position.set(ctr.x, lerp(box.min.y, box.max.y, .62), box.max.z + .012); deco.add(em); anim(em);
        const core = new T.Mesh(geo('aenh_core', () => new T.CircleGeometry(.03, 6)), dm); core.position.copy(em.position); deco.add(core); }
      else if (slot === 'gloves' || slot === 'boots') { /* 손목 · 발목 고리 */
        const r = Math.max(.06, Math.max(sz.x, sz.z) * .55), ring = new T.Mesh(geo('aenh_ring', () => { const q = new T.TorusGeometry(1, .12, 6, 20); q.rotateX(Math.PI / 2); return q; }), dm);
        ring.scale.setScalar(r); ring.position.set(ctr.x, slot === 'gloves' ? box.max.y - sz.y * .15 : box.max.y - .02, ctr.z); deco.add(ring); anim(ring); }
      else if (slot === 'belt') { /* 허리 보석 */
        const gem = new T.Mesh(geo('aenh_gem', () => new T.OctahedronGeometry(.045)), dm); gem.position.set(ctr.x, ctr.y, box.max.z + .02); deco.add(gem);
        gem.onBeforeRender = () => { gem.rotation.y = nowS() * 2; if (e >= 15) dm.color.setHSL((nowS() * .25) % 1, .85, .65).multiplyScalar(2); }; }
    }
    if (e >= 15 && (slot === 'armor' || slot === 'cape')) wings = 1;
  }
  /* +15 갑옷 또는 망토: 빛의 날개 */
  if (wings && b.rig.torso) {
    const wm = addMat('#fff4d0'); wm.opacity = .5; const wg = new T.Group(); wg.name = 'aenh_wings'; wg.position.set(0, mc ? .6 : .42, -.22); wg.scale.setScalar(mc ? 1.9 : 1.6); b.rig.torso.add(wg);
    const wgeo = geo('aenh_wing', () => { const s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(.3, .35, .75, .5, 1, .45); s.bezierCurveTo(.8, .25, .7, .1, .75, -.05); s.bezierCurveTo(.55, 0, .45, -.1, .5, -.3); s.bezierCurveTo(.3, -.15, .15, -.1, 0, 0); return new T.ShapeGeometry(s, 12); });
    const ws = [];
    for (const d of [-1, 1]) { const w = new T.Mesh(wgeo, wm); w.scale.set(d * .75, .75, .75); w.rotation.y = d * -.35; wg.add(w); ws.push([w, d]); }
    ws[0][0].onBeforeRender = () => { const t = nowS(); for (const [w, d] of ws) w.rotation.y = d * (-.35 - Math.sin(t * 2.2) * .22); wm.color.setHSL((t * .15) % 1, .6, .8).multiplyScalar(1.6); wm.opacity = .4 + Math.sin(t * 3) * .1; };
  }
}
const _buildFighter1 = buildFighter;
buildFighter = function (L, opt) {
  const b = _buildFighter1(L, opt), g = L && L.gear;
  if (g && Object.keys(AENH_SLOTS).some(s => g[s] && (g[s].enh || 0) >= 3)) { try { decorateArmor(b, g, STYLE.mc); } catch (err) { console.warn('aenh', err); } }
  return b;
};

/* ---------- 전투: 방호 섬광 (갑옷 · 투구 강화 +7 이상) ---------- */
const _hurtFx1 = hurtFx;
hurtFx = function (p, d, src) {
  _hurtFx1(p, d, src);
  const g = p.look && p.look.gear; if (!g) return;
  const e = Math.max(g.armor && g.armor.enh || 0, g.helm && g.helm.enh || 0); if (e < 7) return;
  const m = addMat(e >= 15 ? '#' + tmpC.setHSL(Math.random(), .8, .65).getHexString() : armorCol(e)); m.opacity = .5;
  const sh = new T.Mesh(geo('aenh_shield', () => new T.IcosahedronGeometry(1, 1)), m); sh.position.set(p.x, (p.y || 0) + 1, p.z);
  addFx(sh, .35, (fx, u) => { sh.scale.setScalar(.9 + u * .5); m.opacity = .5 * (1 - u); sh.rotation.y += .1; }, m);
  if (e >= 13) for (let i = 0; i < 8; i++) PA.emit(p.x, (p.y || 0) + 1, p.z, rand(-5, 5), rand(-2, 5), rand(-2, 2), .25, .14, col(armorCol(e)), 0, 2, 3);
};

/* ---------- 정보 표시 ---------- */
function aenhInfo(e) {
  const cur = aenhTier(e), nx = AENH.find(w => w.e > e);
  return `<small class="wenh">방어구 외형: <b>${cur.n}</b>${e >= 3 ? ` (+${cur.e})` : ''}${nx ? ` · 다음 +${nx.e} ${nx.n} — ${nx.d}` : ' · 최고 단계'}</small>`;
}
const _itemTip2 = itemTip;
itemTip = function (it, P) {
  const s = _itemTip2(it, P); if (!AENH_SLOTS[it.s] || (it.e || 0) < 3) return s;
  const t = aenhTier(it.e); return s.replace(/<small class="(bad)?">착용/, m => `<span class="proc">◆ 강화 외형 「${t.n}」 — ${t.d}</span><br>${m}`);
};
