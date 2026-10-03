'use strict';
/* ===== 그랑풍 채색 배경 =====
   bghd.js 의 배경(하늘 고정 · 중경 시차 스크롤 · 지면 반복)에 그림 이미지를 끼운다.
   grand/bg/<kind>_sky.png (화면 크기로 고정) · <kind>_mid.png (투명 배경, 가로 반복) · <kind>_ground.png (가로 반복 지면)
   그림이 없거나 아직 불러오는 중인 배경은 기존 배경을 그대로 쓴다. 만드는 법: sprite_ai/grand/bgprep.py */
const GRAND_BG = { fortress: { mid: { par: .4, h: 248, bottom: 1 } } };   // 중경: 원화 2장(3072x397)을 1920 논리px 폭으로 → 높이 248, 아래끝이 지면에 닿게
const GBG_IMG = {};
for (const kind in GRAND_BG) for (const part of ['sky', 'mid', 'ground']) {
  const im = new Image(); im.onload = () => { im.ok = 1 }; im.src = (window.GRAND_BASE || '') + 'grand/bg/' + kind + '_' + part + '.png' + (window.GRAND_BG_STAMP ? '?v=' + window.GRAND_BG_STAMP : '');
  (GBG_IMG[kind] = GBG_IMG[kind] || {})[part] = im;
}
const _buildBGGrand = buildBG;
buildBG = function (kind) {
  _buildBGGrand(kind);
  const S = GRAND_BG[kind], I = GBG_IMG[kind];
  if (!S || !I || !I.sky.ok || !I.mid.ok || !I.ground.ok || !BG || !BG.hd) return;
  const M = S.mid;
  BG.sky = I.sky;                                    // 화면 크기로 늘려 그린다
  BG.layers = [{ c: I.mid, par: M.par, y: HB_GT - M.h * M.bottom, h: M.h }];
  BG.objs = []; BG.ground = I.ground; BG.grand = true;
};
