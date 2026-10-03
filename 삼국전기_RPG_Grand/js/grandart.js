'use strict';
/* ===== 그랑풍 부품 렌더러 =====
   그림 부품(PNG: 머리 · 몸통 · 허리갑 · 망토 · 팔 · 다리 · 무기)을 관절에 붙여 돌리는 SD 캐릭터 렌더러.
   · 관절 계산은 sdart2.js 의 renderSD 와 같다 → 게임의 모든 자세(poseOf: armL · armR · wAng · legL · legR · lean · head · cape · bob · ext · spin · lie)를 그대로 쓴다.
   · 부품 · 관절은 grand/<id>/rig.js (GRAND_REGISTER) 에서 읽는다. 단위는 게임 유닛(발바닥 y=0, 목 y=-70).
   · 팔 · 다리는 두 마디(위팔 · 아래팔 / 허벅지 · 정강이)이고, 손 · 발 위치를 목표로 하는 IK 로 팔꿈치 · 무릎을 굽힌다.
   · 뒷팔은 앞팔 부품을 어둡게 한 사본을 쓴다.
   · 외형(look)에 grand:'<id>' 가 있고 그림이 다 불러와졌을 때만 쓰고, 아니면 기존 렌더러로 그린다.
   자세한 규격은 「아트가이드_그랑풍.md」. */
const GRAND = { packs: {} };
function GRAND_REGISTER(def) {
  const P = Object.assign({}, def); P.base = (window.GRAND_BASE || '') + 'grand/' + def.id + '/'; P.img = {}; P.tc = new Map();
  for (const k in P.parts) { const im = new Image(); im.onload = () => { im.ok = 1 }; im.onerror = () => { im.bad = 1; console.warn('[그랑] 부품 불러오기 실패', P.base + P.parts[k].file) }; im.src = P.base + P.parts[k].file + (P.stamp ? '?v=' + P.stamp : ''); P.img[k] = im }
  GRAND.packs[P.id] = P;
}
(function () { for (const id of GRAND_IDS()) { const s = document.createElement('script'); s.async = false; s.src = (window.GRAND_BASE || '') + 'grand/' + id + '/rig.js'; document.head.appendChild(s) } })();
/* 그랑풍 팩 목록 — 무장은 무장 id, 병사는 <세력>_<병종>, 보스는 GRAND_BOSS 의 id */
function GRAND_IDS() { return window.GRAND_MANIFEST || ['zhao', 'dong_sp', 'lubu'] }
for (const h of HEROES) if (GRAND_IDS().includes(h.id)) h.look.grand = h.id;
const GRAND_BOSS = { '여포': 'lubu', '하후은': 'b_xiahouen', '장각': 'b_zhangjiao', '허저': 'b_xuchu', '장료': 'b_zhangliao', '조조': 'b_caocao', '사마의': 'b_simayi',
  '안량': 'b_yanliang', '하후돈': 'b_xiahoudun', '하후연': 'b_xiahouyuan', '방덕': 'b_pangde' };
for (const b of STAGES.map(s => s.boss).concat(typeof MIDBOSS !== 'undefined' ? [MIDBOSS] : [])) if (b && b.look && GRAND_BOSS[b.name] && GRAND_IDS().includes(GRAND_BOSS[b.name])) b.look.grand = GRAND_BOSS[b.name];
if (typeof enemyLook === 'function') { const _enemyLookG = enemyLook; enemyLook = function (fac, tok) { const L = _enemyLookG(fac, tok); if (GRAND_IDS().includes(fac + '_' + tok)) L.grand = fac + '_' + tok; return L } }
const grandOf = L => { const P = L && L.grand && GRAND.packs[L.grand]; if (!P) return null; for (const k in P.img) if (!P.img[k].ok) return null; return P };

/* 부품 이미지에 색을 덧칠한 사본 (피격 섬광 · 잔상 · 뒷면 어둡게) */
function grandTinted(P, key, tint) {
  const ck = key + '|' + tint; let c = P.tc.get(ck); if (c) return c;
  const im = P.img[key]; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);
  if (P.tc.size > 120) P.tc.clear(); P.tc.set(ck, c); return c;
}
const GRAND_BACK = 'rgba(20,14,40,.32)';

function renderGrand(g, L, P, pose, sx, sy, scale, facing, opt) {
  opt = opt || {}; const ps = pose || {}, k = scale * (L.scale || 1) * SD_K, f = facing < 0 ? -1 : 1;
  const sp = Math.cos(ps.spin || 0), sq = Math.abs(sp) < .15 ? .15 * (sp < 0 ? -1 : 1) : sp;
  const tint = opt.flash ? 'rgba(255,255,255,.75)' : opt.tint || null, J = P.joints;
  g.save(); g.imageSmoothingEnabled = true; g.translate(sx, sy); g.scale(k * f * sq, k);
  if (ps.lie) { g.translate(58, -10); g.rotate(-Math.PI / 2) }
  const bob = (ps.bob || 0) * 1.6; g.translate(0, -bob);
  const draw = (key, px, py, rot, back) => {
    const d = P.parts[key]; if (!d) return;
    const t = [back ? GRAND_BACK : null, tint].filter(Boolean);
    const im = t.length === 0 ? P.img[key] : t.length === 1 ? grandTinted(P, key, t[0]) : grandTinted2(P, key, t);
    g.save(); g.translate(px, py); if (rot) g.rotate(rot); g.drawImage(im, d.x0, d.y0, d.w, d.h); g.restore();
  };
  const lean = (ps.lean || 0) * .9 + .04, hip = [0, J.hipF[1]];
  const R = (x, y) => { const c = Math.cos(lean), n = Math.sin(lean), dx = x - hip[0], dy = y - hip[1]; return [hip[0] + dx * c - dy * n, hip[1] + dx * n + dy * c] };
  const neck = R(...J.neck), shF = R(...J.shF), shB = R(...J.shB), capeP = R(...J.cape), skP = R(...J.skirt);
  const aF = (ps.armL != null ? ps.armL : -.35) + lean, aB = (ps.armR != null ? ps.armR : .1) + lean, wA = (ps.wAng != null ? ps.wAng : -2.5) + lean, ext = (ps.ext || 0) * 1.6;
  const dir = a => [-Math.sin(a), Math.cos(a)], angOf = (dx, dy) => Math.atan2(-dx, dy);
  /* 두 마디 IK: 뿌리 o 에서 각도 a 방향으로 목표 거리 d 까지. bend=+1 이면 관절이 뒤(-x)로, -1 이면 앞(+x)으로 굽는다.
     반환: 첫 마디 각 · 둘째 마디 각 · 관절 위치 · 끝 위치 */
  const ik = (o, a, d, l1, l2, bend) => {
    d = Math.max(Math.abs(l1 - l2) + .5, Math.min(d, l1 + l2 - .01));
    const b = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const u = a + bend * b, j = [o[0] + dir(u)[0] * l1, o[1] + dir(u)[1] * l1], e = [o[0] + dir(a)[0] * d, o[1] + dir(a)[1] * d];
    return { u, v: angOf(e[0] - j[0], e[1] - j[1]), j, e };
  };
  const AR = P.arm, LF = P.legF, LB = P.legB, aLen = AR.l1 + AR.l2;
  // 팔: 평소 92% 로 팔꿈치를 살짝 굽히고, 찌르기(ext) 때는 끝까지 편다
  const armF = ik(shF, aF, aLen * .92 + ext * .8, AR.l1, AR.l2, 1), armB = ik(shB, aB, aLen * .9, AR.l1, AR.l2, 1), hand = armF.e;
  const hRot = lean + (ps.head || 0) * .8, cape = ps.cape != null ? ps.cape : .12, st = ps.lie ? 0 : .12;
  const legFa = (ps.legL || 0) + st, legBa = (ps.legR || 0) - st;
  // 다리: 앞으로 내민 다리일수록 무릎을 더 굽힌다(무릎은 앞으로)
  const legLen = (L2, a) => (L2.l1 + L2.l2) * (.985 - .3 * Math.max(0, -a) - .04 * Math.abs(a));
  const lgF = ik(J.hipF, legFa, legLen(LF, legFa), LF.l1, LF.l2, -1), lgB = ik(J.hipB, legBa, legLen(LB, legBa), LB.l1, LB.l2, -1);
  draw('cape', capeP[0], capeP[1], cape * .7 + lean);
  draw('lower', armB.j[0], armB.j[1], armB.v - AR.r2, true); draw('upper', shB[0], shB[1], armB.u - AR.r1, true);
  if (L.dual) draw('weapon', armB.e[0], armB.e[1], (ps.wAng2 != null ? ps.wAng2 + lean : aB - 1.3), true);   // 쌍검: 뒷손에도 (어둡게)
  draw('shinB', lgB.j[0], lgB.j[1], lgB.v - LB.r2); draw('thighB', J.hipB[0], J.hipB[1], lgB.u - LB.r1);
  draw('shinF', lgF.j[0], lgF.j[1], lgF.v - LF.r2); draw('thighF', J.hipF[0], J.hipF[1], lgF.u - LF.r1);
  draw('skirt', skP[0], skP[1], lean * .5);
  draw('torso', neck[0], neck[1], lean);
  draw('head', neck[0], neck[1], hRot);
  draw('weapon', hand[0], hand[1], wA);
  draw('lower', armF.j[0], armF.j[1], armF.v - AR.r2); draw('upper', shF[0], shF[1], armF.u - AR.r1);
  g.restore();
  const wd = dir(wA), mapP = (x, y) => { y -= bob; if (ps.lie) { const t = x; x = y + 58; y = -t - 10 } return [sx + x * f * sq * k, sy + y * k] };
  const t1 = mapP(hand[0] + wd[0] * P.tip, hand[1] + wd[1] * P.tip), t2 = mapP(hand[0] + wd[0] * P.tip * .45, hand[1] + wd[1] * P.tip * .45);
  return { tx: t1[0], ty: t1[1], mx: t2[0], my: t2[1] };
}
/* 덧칠 두 겹(뒷면 어둡게 + 섬광) */
function grandTinted2(P, key, ts) {
  const ck = key + '|' + ts.join('+'); let c = P.tc.get(ck); if (c) return c;
  const base = grandTinted(P, key, ts[0]); c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
  const g = c.getContext('2d'); g.drawImage(base, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = ts[1]; g.fillRect(0, 0, c.width, c.height);
  P.tc.set(ck, c); return c;
}
const _renderModelGr = renderModel, _renderModelOGr = renderModelOutlined;
renderModel = function (g, L, pose, sx, sy, scale, facing, opt) { const P = grandOf(L); return P ? renderGrand(g, L, P, pose, sx, sy, scale, facing, opt) : _renderModelGr(g, L, pose, sx, sy, scale, facing, opt) };
renderModelOutlined = function (g, L, pose, sx, sy, scale, facing, opt) { const P = grandOf(L); return P ? renderGrand(g, L, P, pose, sx, sy, scale, facing, opt) : _renderModelOGr(g, L, pose, sx, sy, scale, facing, opt) };
