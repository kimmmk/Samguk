'use strict';
/* ===== 장신구 강화 단계별 외형 =====
   목걸이: 기존 펜던트가 강화에 따라 변함 · 반지: 손가락에 반지가 보이고 강화에 따라 변함 · 스킬북: +3부터 곁에 떠다니는 서책 */
const ACC_SLOTS = { neck: 'neck', ring: 'ring', book: 'book' };
const ACC_TIERS = {
  neck: [[0, '기본', ''], [3, '연마', '펜던트에 윤기'], [5, '광휘', '펜던트가 빛남'], [7, '금장', '금빛 테두리 광채'], [10, '염화', '가슴 앞에 떠오르는 보주'], [13, '뇌광', '보주에 자색 뇌광'], [15, '신병', '무지개빛 보주 · 목 둘레를 도는 옥 구슬']],
  ring: [[0, '기본', '손에 반지가 보임'], [5, '광휘', '반지가 빛남'], [7, '금장', '반지에 보석이 박힘'], [10, '염화', '손에 불꽃 기운'], [13, '뇌광', '손에 자색 뇌광'], [15, '신병', '무지개빛 · 손 주위를 도는 빛 입자']],
  book: [[0, '기본', ''], [3, '연마', '곁에 떠다니는 서책'], [5, '광휘', '서책이 빛남'], [7, '금장', '금빛 표지 · 책장이 펼쳐져 넘어감'], [10, '염화', '발밑에 부적진'], [13, '뇌광', '부적진에 자색 뇌광'], [15, '신병', '무지개빛 · 주위를 도는 책장 3장']] };
const accTier = (k, e) => { let t = ACC_TIERS[k][0]; for (const w of ACC_TIERS[k]) if (e >= w[0]) t = w; return t; };

const _gearLook2 = gearLook;
gearLook = function (P, baseLook) {
  const g = _gearLook2(P, baseLook), eq = P.rpg.eq, h = HEROES[P.hero];
  const ok = it => it && it.rq <= P.lvl && (!it.h || it.h === h.id);
  if (g.neck && eq.neck) g.neck.enh = eq.neck.e || 0;
  for (const s of ['ring1', 'ring2']) if (ok(eq[s])) g[s] = { enh: eq[s].e || 0, gem: GRADE_TONE[eq[s].g] ? GRADE_TONE[eq[s].g][1] : '#ffd84a' };
  if (ok(eq.book)) g.book = { enh: eq.book.e || 0, c: GRADE_TONE[eq.book.g] ? GRADE_TONE[eq.book.g][0] : '#6a3a2a' };
  return g;
};
const accAnimCol = (m, e, k = 0, mul = 2) => { if (e >= 15) m.color.setHSL((nowS() * .25 + k) % 1, .85, .65).multiplyScalar(mul); };

function decorateNeck(b, G0, mc) {
  const e = G0.enh || 0; if (e < 3) return;
  const groups = slotGroups(b.root, 'neck'); if (!groups.size) return; const c = armorCol(e), ei = e >= 7 ? .3 : e >= 5 ? .2 : .08;
  for (const ms of groups.values()) for (const m of ms) { const tint = x => { if (!x || !x.emissive) return x; const y = x.clone(); y.onBeforeCompile = x.onBeforeCompile; y.customProgramCacheKey = x.customProgramCacheKey; y.emissive = col(c); y.emissiveIntensity = ei; return y; };
    m.material = Array.isArray(m.material) ? m.material.map(tint) : tint(m.material); m.userData.mat = m.material;
    if (e >= 7) { const hm = addMat(e >= 10 ? c : '#ffd84a'); hm.side = T.BackSide; hm.opacity = .5; hm.color.multiplyScalar(.6); const h = new T.Mesh(m.geometry, hm); h.position.copy(m.position); h.quaternion.copy(m.quaternion); h.scale.copy(m.scale).multiplyScalar(mc ? 1.12 : 1.1); h.userData.wenhHull = 1; m.parent.add(h); } }
  if (e < 10) return;
  const [parent, ms] = [...groups].sort((a, c2) => c2[1].length - a[1].length)[0], box = localBox(parent, ms), ctr = box.getCenter(new T.Vector3());
  const om = addMat(c); om.opacity = .9; const orb = new T.Mesh(geo('acc_orb', () => new T.IcosahedronGeometry(.045, 1)), om); const base = new T.Vector3(ctr.x, box.min.y - .02, box.max.z + .06); orb.position.copy(base); parent.add(orb);
  orb.onBeforeRender = () => { const t = nowS(); orb.position.y = base.y + Math.sin(t * 2.5) * .02; orb.rotation.y = t * 2; om.opacity = .75 + Math.sin(t * (e >= 13 ? 12 : 4)) * .2; accAnimCol(om, e); };
  if (e >= 15) { const jm = addMat('#a8ffd0'); jm.opacity = .9; const jg = new T.Group(); jg.position.set(ctr.x, ctr.y, ctr.z); parent.add(jg);
    for (let k = 0; k < 5; k++) { const j = new T.Mesh(geo('acc_jade', () => new T.SphereGeometry(.022, 8, 6)), jm); jg.add(j);
      j.onBeforeRender = () => { const t = nowS() * 1.6 + k * 1.2566; j.position.set(Math.cos(t) * .2, Math.sin(t * 2) * .03, Math.sin(t) * .16); if (k === 0) accAnimCol(jm, e, .5); }; } }
}
function decorateRing(b, G0, hand, mc) {
  if (!hand) return; const e = G0.enh || 0, c = e >= 5 ? armorCol(e) : '#e2b85a';
  const rg = new T.Group(); rg.name = 'acc_ring'; rg.position.set(mc ? .04 : .02, mc ? -.05 : -.03, mc ? .05 : .03); hand.add(rg);
  const bm = e >= 5 ? addMat(c) : toon('#e2b85a', { emissive: '#8a6020', ei: .3 }); if (e >= 5) bm.opacity = .95;
  const band = new T.Mesh(geo('acc_band', () => new T.TorusGeometry(.03, .009, 6, 16)), bm); band.rotation.x = Math.PI / 2; band.scale.setScalar(mc ? 1.5 : 1); rg.add(band);
  if (e >= 7) { const gm = addMat(G0.gem || '#ff5a5a'); gm.opacity = 1; const gem = new T.Mesh(geo('acc_rgem', () => new T.OctahedronGeometry(.016)), gm); gem.position.set(0, 0, .03 * (mc ? 1.5 : 1)); rg.add(gem);
    gem.onBeforeRender = () => { gem.rotation.y = nowS() * 3; accAnimCol(gm, e); if (e >= 5) accAnimCol(bm, e, .3); }; }
  if (e >= 10) { const fm = addMat(c); const aura = new T.Mesh(geo('acc_haura', () => new T.SphereGeometry(.09, 12, 10)), fm); rg.add(aura);
    aura.onBeforeRender = () => { const t = nowS(); fm.opacity = .22 + Math.sin(t * (e >= 13 ? 14 : 5)) * .1 + (e >= 13 && Math.random() < .1 ? .3 : 0); aura.scale.setScalar(1 + Math.sin(t * 3) * .15); accAnimCol(fm, e, .6, 1.4); }; }
  if (e >= 15) { const pm = addMat('#ffffff'); pm.opacity = 1;
    for (let k = 0; k < 3; k++) { const q = new T.Mesh(geo('acc_mote', () => new T.SphereGeometry(.014, 6, 5)), pm); rg.add(q);
      q.onBeforeRender = () => { const t = nowS() * 4 + k * 2.094; q.position.set(Math.cos(t) * .12, Math.sin(t * 1.3) * .05, Math.sin(t) * .12); if (k === 0) accAnimCol(pm, e, .2); }; } }
}
let _bookTex = null;
function bookTex(c) {
  const [cv, x] = makeCanvas(64, 80); x.fillStyle = c; x.fillRect(0, 0, 64, 80); x.strokeStyle = '#e2b85a'; x.lineWidth = 4; x.strokeRect(5, 5, 54, 70);
  x.fillStyle = '#f0e0b0'; x.fillRect(22, 14, 20, 52); x.fillStyle = '#3a2010'; x.font = '900 16px serif'; x.textAlign = 'center'; '兵書'.split('').forEach((ch, i) => x.fillText(ch, 32, 36 + i * 20));
  const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; return t;
}
function decorateBook(b, G0, mc) {
  const e = G0.enh || 0; if (e < 3 || !b.rig.torso) return; const c = armorCol(e);
  const holder = new T.Group(); holder.name = 'acc_book'; holder.position.set(mc ? -.55 : -.45, mc ? .75 : .6, mc ? -.25 : -.2); b.rig.torso.add(holder);
  const cover = toon('#ffffff', { map: bookTex(G0.c || '#6a3a2a'), emissive: e >= 5 ? c : 0, ei: e >= 7 ? .45 : .25, noCache: true }), page = toon('#f4ead0', { emissive: e >= 7 ? c : 0, ei: .3 });
  const bk = new T.Group(); holder.add(bk); const W0 = .16, H0 = .21;
  const L = new T.Mesh(geo('acc_cov', () => { const q = new T.BoxGeometry(W0, H0, .015); q.translate(-W0 / 2, 0, 0); return q; }), cover), R = new T.Mesh(L.geometry, cover);
  const pg = new T.Mesh(geo('acc_pg', () => { const q = new T.BoxGeometry(W0 * .95, H0 * .92, .03); q.translate(-W0 / 2, 0, 0); return q; }), page);
  bk.add(L); bk.add(pg); R.scale.x = -1; bk.add(R);
  const flap = new T.Mesh(geo('acc_flap', () => { const q = new T.PlaneGeometry(W0 * .9, H0 * .88); q.translate(W0 * .45, 0, 0); return q; }), toon('#fff6dc', { side: T.DoubleSide, emissive: e >= 10 ? c : 0, ei: .4 })); bk.add(flap);
  if (e >= 7) { const hm = addMat('#ffd84a'); hm.side = T.BackSide; hm.opacity = .5; hm.color.multiplyScalar(.6); const h = new T.Mesh(geo('acc_bhull', () => new T.BoxGeometry(W0 * 2.2, H0 * 1.15, .08)), hm); bk.add(h); h.onBeforeRender = () => accAnimCol(hm, e, 0, 1.2); }
  L.onBeforeRender = () => { const t = nowS(), open = e >= 7 ? .9 + Math.sin(t * 1.3) * .15 : .12;
    holder.position.y = (mc ? .75 : .6) + Math.sin(t * 2) * .05; holder.rotation.y = .5 + Math.sin(t * .8) * .25;
    L.rotation.y = open; R.rotation.y = -open; pg.rotation.y = open * .5; flap.rotation.y = e >= 7 ? -open + ((t * 1.2) % 1) * open * 2 : -open * .5; };
  holder.scale.setScalar(mc ? 1.3 : 1.1);
  if (e >= 10) { const cm = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(1.6), transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false, map: circleTex(), side: T.DoubleSide });
    const circ = new T.Mesh(geo('acc_circ', () => { const q = new T.PlaneGeometry(2, 2); q.rotateX(-Math.PI / 2); return q; }), cm); circ.position.y = .03; circ.scale.setScalar(.9); circ.name = 'acc_circle'; b.root.add(circ);
    circ.onBeforeRender = () => { const t = nowS(); circ.rotation.y = t * .6; cm.opacity = .6 + Math.sin(t * (e >= 13 ? 9 : 2)) * .12 + (e >= 13 && Math.random() < .05 ? .3 : 0); if (e >= 15) cm.color.setHSL((t * .2) % 1, .8, .6).multiplyScalar(1.6); }; }
  if (e >= 15) { const sm = new T.MeshBasicMaterial({ color: col('#fff6dc').multiplyScalar(1.4), transparent: true, opacity: .8, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
    const og = new T.Group(); og.position.set(0, mc ? .55 : .45, 0); b.rig.torso.add(og);
    for (let k = 0; k < 3; k++) { const s = new T.Mesh(geo('acc_sheet', () => new T.PlaneGeometry(.12, .16)), sm); og.add(s);
      s.onBeforeRender = () => { const t = nowS() * 1.2 + k * 2.094; s.position.set(Math.cos(t) * .6, Math.sin(t * 2) * .12, Math.sin(t) * .45); s.rotation.set(t, t * 1.5, 0); if (k === 0) sm.color.setHSL((nowS() * .25) % 1, .7, .75).multiplyScalar(1.5); }; } }
}
const _buildFighter2 = buildFighter;
buildFighter = function (L, opt) {
  const b = _buildFighter2(L, opt), g = L && L.gear; if (!g) return b;
  try { const mc = STYLE.mc;
    if (g.neck) decorateNeck(b, g.neck, mc);
    if (g.ring1 && b.rig.armR) decorateRing(b, g.ring1, b.rig.armR.hand, mc);
    if (g.ring2 && b.rig.armL) decorateRing(b, g.ring2, b.rig.armL.hand, mc);
    if (g.book) decorateBook(b, g.book, mc);
  } catch (err) { console.warn('acc', err); }
  return b;
};

/* ---------- 전투: 서책(스킬) · 목걸이(필살기) · 반지(치명타) ---------- */
const accEnh = (p, k) => (p && p.look && p.look.gear && p.look.gear[k] && p.look.gear[k].enh) || 0;
const _themeCastFx0 = themeCastFx;
themeCastFx = function (p, s) {
  _themeCastFx0(p, s); const e = accEnh(p, 'book'); if (e < 7) return;
  const c = armorCol(e); magicCircle(p.x, p.z, c, e >= 15 ? 3 : 2.3);
  for (let i = 0; i < (e >= 10 ? 14 : 8); i++) PN.emit(p.x + rand(-1, 1), rand(1, 2.4), p.z + rand(-.5, .5), rand(-2, 2), rand(1, 3), rand(-1, 1), 1, rand(.12, .2), tmpC.set(i % 2 ? '#fff6dc' : c), .5, 1, 1, 2);
  if (e >= 13) lightning(p.x + p.facing * 2, p.z, '#b890ff', .4);
};
const _startSpecial1 = startSpecial;
startSpecial = function (p, myth) {
  const before = p.state; _startSpecial1(p, myth); if (p.state !== 'special' || before === 'special') return;
  const e = accEnh(p, 'neck'); if (e < 10) return; const c = armorCol(e);
  spriteFx(starTex(), p.x, (p.y || 0) + 1.5, p.z + .3, c, .5, 4, .5); shockwave(p.x, p.z, 5, c); if (e >= 15) for (let k = 0; k < 3; k++) setTimeout(() => { if (B) shockwave(p.x, p.z, 3 + k * 2, '#' + tmpC.setHSL(k / 3, .8, .65).getHexString()); }, k * 120);
};
const _hitFx2 = hitFx;
hitFx = function (e, src, crit, el, o, dmg) {
  _hitFx2(e, src, crit, el, o, dmg);
  if (!crit || !B || src !== B.p) return; const r = Math.max(accEnh(src, 'ring1'), accEnh(src, 'ring2')); if (r < 10) return;
  const hand = src.rig && src.rig.armR && src.rig.armR.hand; if (!hand) return; const v = hand.getWorldPosition(new T.Vector3()), c = col(armorCol(r));
  for (let i = 0; i < 10; i++) PA.emit(v.x, v.y, v.z, rand(-3, 3), rand(-1, 4), rand(-2, 2), .35, .14, c, 0, 2, 3);
};

/* ---------- 정보 표시 ---------- */
function accInfo(s, e) {
  const k = ACC_SLOTS[s]; if (!k) return ''; const T0 = ACC_TIERS[k], cur = accTier(k, e), nx = T0.find(w => w[0] > e);
  return `<small class="wenh">장신구 외형: <b>${cur[1]}</b>${cur[0] ? ` (+${cur[0]})` : ''}${nx ? ` · 다음 +${nx[0]} ${nx[1]} — ${nx[2]}` : ' · 최고 단계'}</small>`;
}
const _itemTip3 = itemTip;
itemTip = function (it, P) {
  const s = _itemTip3(it, P), k = ACC_SLOTS[it.s]; if (!k || !(it.e || 0)) return s;
  const t = accTier(k, it.e); if (!t[2] || !t[0]) return s; return s.replace(/<small class="(bad)?">착용/, m => `<span class="proc">◆ 강화 외형 「${t[1]}」 — ${t[2]}</span><br>${m}`);
};
