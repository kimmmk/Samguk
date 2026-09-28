'use strict';
/* ===== 마인크래프트 스타일 외형 =====
   캐릭터: 머리 8×8 · 몸통 8×12 · 팔다리 4×12 픽셀 블록(1px = MCP) + 바깥 레이어(머리카락 · 투구 · 갑옷)
   무기: 픽셀 스프라이트를 얇게 겹쳐 입체화(손에 든 아이템처럼) · 군마 · 전장 블록 월드
   STYLE.mc 가 false 면 사실적 외형(chars.js)을 쓴다. */
const STYLE = { mc: true };
const MCP = .06;
function pxTex(key, w, h, paint) {
  key = 'px|' + key; if (TEXC.has(key)) return TEXC.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); paint(x, w, h);
  const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.encoding = T.sRGBEncoding; t.userData.keep = true;
  TEXC.set(key, t); return t;
}
function pxRep(tex, rx, ry) { const key = tex.uuid + '|' + rx + '|' + ry; if (TEXC.has(key)) return TEXC.get(key); const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.userData.keep = true; TEXC.set(key, t); return t; }
const nzc = (c, i, a = .05) => shade(c, ((hash32('n' + i) % 1000) / 1000 - .5) * a * 2);
function P(x, i, j, c) { x.fillStyle = c; x.fillRect(i, j, 1, 1); }
function fillN(x, x0, y0, w, h, c, seed, a = .05) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x, x0 + i, y0 + j, nzc(c, seed + ':' + i + ',' + j, a)); }
const mcMat = (tex, o = {}) => toon('#ffffff', { map: tex, ...o });
/* 6면 재질: [+x, -x, +y, -y, +z(앞), -z(뒤)] */
function box6(w, h, d, faces, o = {}) { const g = geo(`mcbox${w}|${h}|${d}`, () => new T.BoxGeometry(w, h, d)); return { g, mats: faces.map(t => t ? mcMat(t, o) : mcMat(pxTex('clear', 1, 1, () => {}), { alphaTest: .5 })) }; }

/* ---------- 스킨 페인팅 ---------- */
function mcHeadTex(L, face) {
  const fem = L.face === 'female', hs = L.hs || 'short', bald = L.hat === 'none' && hs !== 'long_f', H = L.hair, S = L.skin, BC = L.beard === 'white' ? '#eeeae2' : H;
  return pxTex(`head|${face}|${S}|${H}|${L.eye}|${L.face}|${hs}|${L.beard}|${L.patch}|${bald}`, 8, 8, x => {
    fillN(x, 0, 0, 8, 8, S, face + S, .035);
    if (face === 'top') { if (!bald) fillN(x, 0, 0, 8, 8, H, 'ht' + H, .08); return; }
    if (face === 'bottom') return;
    const hairRows = bald ? 0 : face === 'front' ? (fem ? 2 : 1) : face === 'back' ? (hs === 'long' || hs === 'long_f' ? 8 : 5) : (hs === 'long' || hs === 'long_f' ? 8 : 3);
    for (let j = 0; j < hairRows; j++) for (let i = 0; i < 8; i++) P(x, i, j, nzc(H, face + 'h' + i + j, .08));
    if (face === 'left' || face === 'right') { if (!bald) { for (let j = 3; j < 6; j++) P(x, face === 'left' ? 0 : 7, j, nzc(H, 'sb' + j, .08)); } P(x, face === 'left' ? 4 : 3, 4, shade(S, -.1)); if (L.beard && L.beard !== 'short') for (let j = 5; j < 8; j++) P(x, face === 'left' ? 6 : 1, j, BC); }
    if (face !== 'front') return;
    if (fem || hs === 'long_f') { for (let j = 2; j < 6; j++) { P(x, 0, j, nzc(H, 'fl' + j)); P(x, 7, j, nzc(H, 'fr' + j)); } P(x, 1, 2, H); P(x, 6, 2, H); }
    const fierce = L.face === 'fierce', brow = L.beard === 'white' ? '#e8e4dc' : shade(H, .05);
    if (fem) { P(x, 1, 3, '#1a1018'); P(x, 2, 3, '#1a1018'); P(x, 5, 3, '#1a1018'); P(x, 6, 3, '#1a1018'); }
    else if (fierce) { P(x, 1, 2, brow); P(x, 2, 3, brow); P(x, 5, 3, brow); P(x, 6, 2, brow); }
    else { P(x, 1, 3, brow); P(x, 2, 3, brow); P(x, 5, 3, brow); P(x, 6, 3, brow); }
    const eye = L.eye || '#3a2a20';
    P(x, 1, 4, '#f4f0ea'); P(x, 2, 4, eye); P(x, 5, 4, eye); P(x, 6, 4, '#f4f0ea');
    if (L.patch) { for (let i = 4; i < 8; i++) P(x, i, 4, '#141018'); P(x, 5, 3, '#141018'); P(x, 6, 3, '#141018'); for (let i = 4; i < 8; i++) P(x, i, 2, '#141018'); }
    P(x, 3, 5, shade(S, -.1)); P(x, 4, 5, shade(S, -.1));
    if (fem) { P(x, 1, 5, mixC(S, '#ff8a9a', .35)); P(x, 6, 5, mixC(S, '#ff8a9a', .35)); P(x, 3, 6, '#d8606a'); P(x, 4, 6, '#d8606a'); }
    else { P(x, 3, 6, shade(S, -.28)); P(x, 4, 6, shade(S, -.28)); }
    if (L.beard === 'white' || L.age === 'old') { P(x, 3, 1 + (hairRows ? 1 : 0), shade(S, -.06)); P(x, 4, 1 + (hairRows ? 1 : 0), shade(S, -.06)); }
    if (L.beard === 'long' || L.beard === 'spiky') { for (let i = 0; i < 8; i++) { if (i === 3 || i === 4) { P(x, i, 5, BC); continue; } P(x, i, 6, nzc(BC, 'b6' + i)); P(x, i, 7, nzc(BC, 'b7' + i)); } P(x, 3, 7, BC); P(x, 4, 7, BC); P(x, 2, 5, BC); P(x, 5, 5, BC); }
    else if (L.beard === 'white') { for (let i = 1; i < 7; i++) P(x, i, 7, BC); P(x, 2, 6, BC); P(x, 5, 6, BC); P(x, 2, 5, BC); P(x, 5, 5, BC); }
    else if (L.beard === 'short') { P(x, 3, 7, BC); P(x, 4, 7, BC); P(x, 2, 5, BC); P(x, 5, 5, BC); }
  });
}
function mcBodyTex(L, face, g) {
  const A = g.armor, armor = A ? 'plate' : (L.armor || 'cloth'), c = L.body, sub = L.sub, bare = armor === 'bare';
  const armC = A ? A.c : shade(c, -.08), trim = A ? A.trim : (L.metal && L.metal !== '#dfe6ee' ? L.metal : sub), belt = g.belt ? g.belt.c : shade(sub, -.1), buck = g.belt ? g.belt.bc : '#e2b85a';
  const w = face === 'front' || face === 'back' ? 8 : face === 'top' || face === 'bottom' ? 8 : 4, h = face === 'top' || face === 'bottom' ? 4 : 12;
  return pxTex(`body|${face}|${c}|${sub}|${armor}|${armC}|${trim}|${belt}|${buck}|${L.skin}`, w, h, x => {
    fillN(x, 0, 0, w, h, bare ? L.skin : c, 'bd' + face + c, .05);
    if (h === 4) return;
    if (armor === 'plate') { for (let j = 0; j < 12; j++) for (let i = 0; i < w; i++) P(x, i, j, nzc(j % 2 ? shade(armC, -.07) : shade(armC, .05), 'pl' + face + i + j, .04));
      for (let i = 0; i < w; i++) { P(x, i, 0, trim); P(x, i, 11, trim); }
      if (face === 'front') { P(x, 3, 2, shade(trim, .15)); P(x, 4, 2, trim); P(x, 3, 3, trim); P(x, 4, 3, shade(trim, -.15)); } }
    else if (bare) { if (face === 'front') { P(x, 2, 3, shade(L.skin, -.08)); P(x, 5, 3, shade(L.skin, -.08)); P(x, 3, 5, shade(L.skin, -.06)); P(x, 4, 5, shade(L.skin, -.06)); } }
    else if (face === 'front') { P(x, 2, 0, sub); P(x, 5, 0, sub); P(x, 3, 1, sub); P(x, 4, 1, sub); P(x, 3, 0, L.skin); P(x, 4, 0, L.skin); P(x, 3, 2, sub); P(x, 4, 3, sub); for (let j = 8; j < 12; j++) P(x, 4, j, shade(c, -.12)); }
    for (let i = 0; i < w; i++) P(x, i, 7, nzc(belt, 'bl' + i, .04));
    if (face === 'front') { P(x, 3, 7, buck); P(x, 4, 7, buck); }
    if (armor !== 'plate') for (let i = 0; i < w; i++) P(x, i, 11, nzc(sub, 'hm' + i, .04));
  });
}
function mcArmTex(L, face, g, slim) {
  const A = g.armor, plate = A || L.armor === 'plate', bare = L.armor === 'bare', w = face === 'top' || face === 'bottom' ? (slim ? 3 : 4) : face === 'front' || face === 'back' ? (slim ? 3 : 4) : 4, h = face === 'top' || face === 'bottom' ? 4 : 12;
  const sleeve = bare ? L.skin : (L.sleeve || L.body), br = g.gloves ? g.gloves.c : (plate ? (A ? A.trim : (L.metal || L.sub)) : shade(L.boots || '#3a2a20', .08)), hand = g.gloves ? g.gloves.c2 : L.skin, armC = A ? A.c : shade(L.body, -.08);
  return pxTex(`arm|${face}|${sleeve}|${br}|${hand}|${plate}|${armC}|${slim}`, w, h, x => {
    fillN(x, 0, 0, w, h, sleeve, 'ar' + face + sleeve, .05); if (h === 4) { if (face === 'bottom') fillN(x, 0, 0, w, h, hand, 'hb', .03); return; }
    if (plate) for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) P(x, i, j, nzc(j % 2 ? shade(armC, -.07) : armC, 'ap' + i + j, .04));
    for (let j = 7; j < 10; j++) for (let i = 0; i < w; i++) P(x, i, j, nzc(br, 'br' + i + j, .05));
    for (let j = 10; j < 12; j++) for (let i = 0; i < w; i++) P(x, i, j, nzc(hand, 'hd' + i + j, .03));
  });
}
function mcLegTex(L, face, g) {
  const w = 4, h = face === 'top' || face === 'bottom' ? 4 : 12, pants = L.pants || shade(L.body, -.2), boots = g.boots ? g.boots.c : (L.boots || '#2a2224'), gr = g.boots ? g.boots.c2 : null, plate = g.armor || L.armor === 'plate';
  return pxTex(`leg|${face}|${pants}|${boots}|${gr}|${plate}`, w, h, x => {
    fillN(x, 0, 0, w, h, pants, 'lg' + face + pants, .05); if (h === 4) { if (face === 'bottom') fillN(x, 0, 0, w, h, shade(boots, -.1), 'sole', .03); return; }
    for (let j = 8; j < 12; j++) for (let i = 0; i < w; i++) P(x, i, j, nzc(boots, 'bt' + i + j, .05));
    if (gr) for (let j = 6; j < 10; j++) for (let i = 0; i < w; i++) if (face === 'front' || j > 7) P(x, i, j, nzc(gr, 'gr' + i + j, .05));
    if (plate && face === 'front') { P(x, 1, 6, shade(pants, .15)); P(x, 2, 6, shade(pants, .15)); }
  });
}
function mcLamTex(c, trim) { return pxTex(`lam|${c}|${trim}`, 8, 8, x => { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) P(x, i, j, nzc(j % 2 ? shade(c, -.08) : shade(c, .05), 'lm' + i + j, .04)); for (let i = 0; i < 8; i++) P(x, i, 7, trim); }); }
function mcClothTex(c, trim) { return pxTex(`cl|${c}|${trim}`, 8, 8, x => { fillN(x, 0, 0, 8, 8, c, 'c' + c, .05); for (let i = 0; i < 8; i++) P(x, i, 7, trim); }); }
function mcSolidTex(c, a = .06) { return pxTex(`so|${c}|${a}`, 4, 4, x => fillN(x, 0, 0, 4, 4, c, 's' + c, a)); }
/* 머리 바깥 레이어: 투구 · 두건 · 머리띠 (투명 픽셀 = alphaTest) */
function mcHatTex(kind, face, c, trim, o = {}) {
  return pxTex(`hat|${kind}|${face}|${c}|${trim}|${o.cheek}`, 8, 8, x => {
    const put = (i, j, col) => P(x, i, j, nzc(col, kind + face + i + j, .06));
    if (kind === 'band') { if (face === 'top' || face === 'bottom') return; for (let i = 0; i < 8; i++) put(i, 2, c); if (face === 'back') { put(3, 3, c); put(4, 3, c); put(3, 4, c); } return; }
    if (kind === 'turban') { if (face === 'top') { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) put(i, j, c); return; } if (face === 'bottom') return; for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) put(i, j, j === 2 ? shade(c, -.1) : c); return; }
    if (face === 'bottom') return;
    if (face === 'top') { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) put(i, j, c); if (kind === 'helm') { for (let i = 0; i < 8; i++) put(i, 3, trim); } return; }
    const rows = face === 'front' ? (kind === 'hood' ? 3 : 3) : face === 'back' ? (kind === 'hood' ? 8 : 6) : (kind === 'hood' ? 7 : 5);
    for (let j = 0; j < rows; j++) for (let i = 0; i < 8; i++) put(i, j, c);
    if (kind === 'helm') { const r = face === 'front' ? 2 : rows - 1; for (let i = 0; i < 8; i++) put(i, r, trim); if (face === 'front') { put(3, 3, c); put(4, 3, c); if (o.cheek) for (let j = 3; j < 7; j++) { put(0, j, c); put(7, j, c); } } }
    if (kind === 'hood' && face === 'front') { put(0, 3, c); put(7, 3, c); put(0, 4, c); put(7, 4, c); }
  });
}
function mcHairBackTex(H) { return pxTex(`hb|${H}`, 8, 8, x => { fillN(x, 0, 0, 8, 8, H, 'hb' + H, .09); for (let i = 0; i < 8; i += 2) P(x, i, 7, 'rgba(0,0,0,0)'); }); }

/* ---------- 무기 스프라이트 ---------- */
const WSPR = {
  sword: { w: 18, h: 5, grip: 1.5 }, dao: { w: 18, h: 6, grip: 1.5 }, spear: { w: 40, h: 5, grip: 12 }, halberd: { w: 42, h: 9, grip: 12 }, glaive: { w: 40, h: 9, grip: 12 },
  snake: { w: 42, h: 7, grip: 12 }, bigdao: { w: 27, h: 8, grip: 5 }, axe: { w: 24, h: 10, grip: 4 }, mace: { w: 22, h: 6, grip: 2.5 }, staff: { w: 32, h: 7, grip: 10 },
  fan: { w: 12, h: 12, grip: 1 }, whip: { w: 44, h: 5, grip: 1 }, flag: { w: 40, h: 3, grip: 12 }, bow: { w: 18, h: 8, grip: 0 }, baby: { w: 6, h: 6, grip: 3 },
};
function wSprite(type, L, glow) {
  const S = WSPR[type], metal = L.metal || '#dfe6ee', wood = L.wood || { glaive: '#7a2420', halberd: '#6a1f1f', snake: '#2a2a2a', spear: '#e8e0cc' }[type] || '#6a4428', gold = '#e2b85a';
  return pxTex(`w|${type}|${metal}|${wood}|${glow || ''}`, S.w, S.h, x => {
    const mid = Math.floor(S.h / 2), shaft = (x0, x1, row = mid) => { for (let i = x0; i < x1; i++) P(x, i, row, nzc(wood, 'sh' + i, .08)); };
    const m = (i, j, k = 0) => P(x, i, j, shade(metal, k + (glow && j <= mid ? .04 : 0)));
    switch (type) {
      case 'sword': case 'dao': for (let i = 0; i < 4; i++) P(x, i, mid, i === 0 ? gold : '#3a2418'); for (let j = 0; j < S.h; j++) P(x, 4, j, gold);
        for (let i = 5; i < S.w; i++) { const t = type === 'dao' ? Math.round((i - 5) / 6) : 0; m(i, mid - 1 + (type === 'dao' ? -Math.min(1, t) : 0), .15); m(i, mid, 0); if (i < S.w - 1) m(i, mid + 1 - (type === 'dao' && i > 14 ? 1 : 0), -.15); if (type === 'dao' && i > 6 && i < 15) m(i, mid + 2, -.2); } break;
      case 'spear': shaft(0, 32); P(x, 31, mid + 1, '#d83a3a'); P(x, 30, mid + 2, '#d83a3a'); P(x, 32, mid + 2, '#d83a3a'); P(x, 31, mid + 2, '#b82a2a'); P(x, 32, mid, gold);
        for (let i = 33; i < 40; i++) { m(i, mid, 0); if (i < 38) { m(i, mid - 1, .15); m(i, mid + 1, -.15); } } break;
      case 'snake': shaft(0, 32); P(x, 32, mid, gold); for (let i = 33; i < 42; i++) m(i, mid + [0, -1, 0, 1][i % 4], 0); m(41, mid, .2); break;
      case 'halberd': case 'glaive': shaft(0, 30); if (type === 'halberd') { for (let i = 30; i < 42; i++) m(i, mid, 0); m(40, mid - 1, .1); m(40, mid + 1, -.1); }
        for (let i = 26; i < (type === 'glaive' ? 40 : 34); i++) { const k = i - 26; for (let j = 1; j <= Math.min(4, 1 + Math.floor(k / 2)); j++) { m(i, mid - j, .1); if (type === 'halberd') P(x, i, mid + j, shade(gold, -.05 * j)); } }
        if (type === 'glaive') { for (let i = 30; i < 40; i++) m(i, mid, -.05); P(x, 27, mid + 1, '#3ad08a'); } break;
      case 'bigdao': shaft(0, 13); for (let i = 13; i < 27; i++) for (let j = -3; j <= 2; j++) if (!(i > 23 && j < -2 + (i - 23))) m(i, mid + j, j < 0 ? .12 : -.1); P(x, 13, mid - 3, gold); P(x, 13, mid + 3, gold); break;
      case 'axe': shaft(0, 22); for (let i = 15; i < 23; i++) for (let j = 1; j <= 4; j++) if (!(j === 4 && (i < 17 || i > 21))) m(i, mid - j, .12 - j * .05); break;
      case 'mace': for (let i = 0; i < 8; i++) P(x, i, mid, '#3a2418'); for (let i = 8; i < 22; i++) for (let j = -2; j <= 2; j++) if (Math.abs(j) < 2 + (i > 12 ? 1 : 0)) P(x, i, mid + j, (i + j) % 3 ? '#4a4a58' : gold); break;
      case 'staff': shaft(0, 28); for (const [i, j] of [[28, mid - 2], [29, mid - 3], [30, mid - 2], [31, mid], [30, mid + 2], [29, mid + 3], [28, mid + 2]]) P(x, i, j, gold); P(x, 29, mid, glow || '#fff2a0'); P(x, 29, mid - 1, '#fff2a0'); P(x, 29, mid + 1, '#fff2a0'); break;
      case 'fan': P(x, 0, mid, '#5a3a24'); P(x, 1, mid, '#5a3a24'); for (let i = 2; i < 12; i++) for (let j = 0; j < 12; j++) { const d = Math.hypot(i - 2, j - mid); if (d < 10 && d > 1.5) P(x, i, j, (j + i) % 4 === 0 ? '#d8d2c4' : '#fbf8f0'); } P(x, 3, mid, L.sub || '#9aa4c8'); P(x, 4, mid, L.sub || '#9aa4c8'); break;
      case 'whip': P(x, 0, mid, '#3a2418'); P(x, 1, mid, '#3a2418'); P(x, 2, mid, '#3a2418'); for (let i = 3; i < 42; i++) P(x, i, mid + Math.round(Math.sin(i / 3) * 1.4), i % 2 ? '#8a8a92' : '#b0b0b8'); P(x, 42, mid, gold); P(x, 43, mid, gold); P(x, 42, mid - 1, '#ffd84a'); break;
      case 'flag': shaft(0, 40, 1); P(x, 39, 1, gold); break;
      case 'bow': for (let i = 0; i < S.w; i++) { const t = i / (S.w - 1) * 2 - 1, j = Math.round((1 - t * t) * (S.h - 2)); P(x, i, j, nzc('#6a4426', 'bw' + i)); if (j > 0) P(x, i, j - 1, '#8a5a30'); } for (let i = 1; i < S.w - 1; i++) P(x, i, 0, 'rgba(240,240,224,.9)'); P(x, S.w / 2 | 0, S.h - 1, gold); break;
      case 'baby': fillN(x, 0, 0, 6, 6, '#f6efe0', 'bb', .05); P(x, 2, 1, '#f8d8c0'); P(x, 3, 1, '#f8d8c0'); P(x, 2, 2, '#f8d8c0'); P(x, 3, 2, '#f8d8c0'); break;
    }
  });
}
function mcWeapon(w, type, L, add, glow, enh) {
  if (!type || type === 'none') return; const S = WSPR[type]; if (!S) return;
  const tex = wSprite(type, L, glow), W0 = S.w * MCP, H0 = S.h * MCP;
  const mat = toon('#ffffff', { map: tex, alphaTest: .5, side: T.DoubleSide, emissive: glow && enh >= 5 ? glow : 0, ei: enh >= 10 ? .9 : .45 });
  const gkey = `wpl${S.w}x${S.h}`; const g = geo(gkey, () => { const q = new T.PlaneGeometry(W0, H0); q.rotateY(-Math.PI / 2); return q; });
  const zc = (S.w / 2 - S.grip) * MCP;
  if (type === 'bow') { for (const dx of [-.02, 0, .02]) add(w, geo('bowpl', () => { const q = new T.PlaneGeometry(W0, H0); q.rotateY(-Math.PI / 2); return q; }), mat, [dx, H0 / 2 - .03, 0], { ol: false }); return; }
  for (const dx of [-.025, 0, .025]) add(w, g, mat, [dx, 0, zc], { ol: false });
  if (type === 'flag') { const cg = new T.PlaneGeometry(.9, 1.2, 1, 1); cg.translate(.46, 0, 0); cg.rotateY(-Math.PI / 2); cg.rotateX(Math.PI / 2);
    const fm = toon('#ffffff', { map: charTex(L.flagt || '軍', L.flagc || '#8a1a1a', '#f0d8a0', 64, 96), side: T.DoubleSide, noCache: true }); fm.map.magFilter = T.NearestFilter; add(w, cg, fm, [0, -.05, (S.w - S.grip) * MCP - .6], { ol: false }); }
}
/* ---------- 캐릭터 ---------- */
function buildFighterMC(L, opt = {}) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const meshes = [], flags = [], g = L.gear || {}, fem = L.face === 'female', slim = fem;
  const add = (parent, geom, mat, p, o = {}) => { const m = new T.Mesh(geom, mat); if (p) m.position.set(p[0], p[1], p[2]); if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]); if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    m.castShadow = true; if (o.slot) m.userData.slot = o.slot; m.userData.mat = mat; meshes.push(m); parent.add(m); return m; };
  const addBox = (parent, w, h, d, faces, p, o = {}) => { const b = box6(w, h, d, faces, o); return add(parent, b.g, b.mats, p, o); };
  const solid = (parent, w, h, d, c, p, o = {}) => addBox(parent, w, h, d, Array(6).fill(mcSolidTex(c, o.a ?? .06)), p, o);
  const ch = L.chest || 1, A = g.armor, plate = A || L.armor === 'plate', armC = A ? A.c : shade(L.body, -.08), trim = A ? A.trim : (L.metal && L.metal !== '#dfe6ee' ? L.metal : L.sub);
  const HIP = 12 * MCP;
  const hips = new T.Group(); hips.position.y = HIP; body.add(hips);
  const torso = new T.Group(); hips.add(torso);
  /* 다리 */
  const legs = [];
  const LF = f => mcLegTex(L, f, g);
  for (const sx of [1, -1]) { const lg = new T.Group(); lg.position.set(2 * MCP * sx, 0, 0); hips.add(lg);
    addBox(lg, 4 * MCP, 12 * MCP, 4 * MCP, [LF('side'), LF('side'), LF('top'), LF('bottom'), LF('front'), LF('back')], [0, -6 * MCP, 0], { slot: 'boots' });
    if (g.boots) addBox(lg, 4.5 * MCP, 4.6 * MCP, 4.5 * MCP, Array(6).fill(mcSolidTex(g.boots.c2)), [0, -9.8 * MCP, 0], { slot: 'boots', s: [1, 1, 1] }).visible = g.boots.style !== 'plain';
    legs.push(lg); }
  /* 치마 · 전포 · 요갑 */
  if (L.armor === 'robe' || L.armor === 'dress') { const t = mcClothTex(L.body, L.sub); addBox(hips, 8.6 * MCP, 11 * MCP, 4.8 * MCP, [t, t, null, null, t, t], [0, -5.4 * MCP, 0]); }
  else if (!plate && L.armor !== 'bare') { const t = mcClothTex(L.body, L.sub); addBox(hips, 8.4 * MCP, 4 * MCP, 4.6 * MCP, [t, t, null, null, t, t], [0, -1.8 * MCP, 0]); }
  if (plate) { const t = mcLamTex(armC, trim); addBox(hips, 8.8 * MCP, 5 * MCP, 5 * MCP, [t, t, null, null, t, t], [0, -2.2 * MCP, 0], { slot: 'armor' }); }
  /* 몸통 */
  const BF = f => mcBodyTex(L, f, g);
  addBox(torso, 8 * MCP, 12 * MCP, 4 * MCP, [BF('side'), BF('side'), BF('top'), BF('bottom'), BF('front'), BF('back')], [0, 6 * MCP, 0], { s: [ch, 1, ch], slot: plate ? 'armor' : undefined });
  if (plate) { const t = mcLamTex(armC, trim); addBox(torso, 8.6 * MCP, 7 * MCP, 4.6 * MCP, [t, t, t, null, null, t], [0, 8.5 * MCP, 0], { s: [ch, 1, ch], slot: 'armor' }); }
  if (g.belt) solid(torso, 8.5 * MCP, 1.2 * MCP, 4.5 * MCP, g.belt.c, [0, 4.5 * MCP, 0], { slot: 'belt', s: [ch, 1, ch] });
  if (g.belt) solid(torso, 2 * MCP, 1.6 * MCP, .5 * MCP, g.belt.bc, [0, 4.5 * MCP, 2.3 * MCP * ch], { slot: 'belt', a: .02 });
  if (g.neck) solid(torso, 1.4 * MCP, 1.4 * MCP, .6 * MCP, g.neck.c, [0, 9.6 * MCP, 2.2 * MCP * ch], { slot: 'neck', a: .02 });
  /* 머리 */
  const head = new T.Group(); head.position.set(0, 12 * MCP, 0); torso.add(head);
  const HF = f => mcHeadTex(L, f);
  addBox(head, 8 * MCP, 8 * MCP, 8 * MCP, [HF('left'), HF('right'), HF('top'), HF('bottom'), HF('front'), HF('back')], [0, 4 * MCP, 0]);
  const hs = L.hs || 'short', H = L.hair, HC = mcSolidTex(H, .1), hat = g.helm && !g.helm.keepHat ? 'gear' : L.hat;
  const hatLayer = (kind, c, t2, o = {}) => { const F = f => mcHatTex(kind, f, c, t2, o); addBox(head, 8.8 * MCP, 8.8 * MCP, 8.8 * MCP, [F('side'), F('side'), F('top'), F('bottom'), F('front'), F('back')], [0, 4 * MCP, 0], { alphaTest: .5, slot: 'helm' }); };
  const cube = (w, h, d, c, p, o = {}) => solid(head, w * MCP, h * MCP, d * MCP, c, p.map(v => v * MCP), { slot: 'helm', ...o });
  if (hs === 'long' || hs === 'long_f') addBox(head, 8.4 * MCP, (hs === 'long_f' ? 11 : 8) * MCP, 1.4 * MCP, Array(6).fill(mcHairBackTex(H)), [0, (hs === 'long_f' ? 1.5 : 3) * MCP, -4.3 * MCP], { alphaTest: .5 });
  if (hs === 'ponytail') { solid(head, 2 * MCP, 6 * MCP, 2 * MCP, H, [0, 3 * MCP, -5 * MCP], { r: [.35, 0, 0], a: .1 }); }
  if (hs === 'spiky') for (let k = 0; k < 4; k++) solid(head, 1.5 * MCP, 2 * MCP, 1.5 * MCP, H, [(k - 1.5) * 2 * MCP, 8.8 * MCP, (-1 + (k % 2)) * MCP], { r: [-.3, 0, (k - 1.5) * .25], a: .1 });
  if (hs === 'topknot' || (L.hat === 'none')) { solid(head, 2.4 * MCP, 2.4 * MCP, 2.4 * MCP, H, [0, 9.2 * MCP, -1 * MCP], { a: .1 }); solid(head, 2.8 * MCP, .7 * MCP, 2.8 * MCP, '#d8b050', [0, 8.3 * MCP, -1 * MCP]); }
  if (L.beard === 'long') solid(head, 4 * MCP, 6 * MCP, 1 * MCP, H, [0, -2.6 * MCP, 4.3 * MCP], { r: [.12, 0, 0], a: .1 });
  if (L.beard === 'spiky') solid(head, 8.4 * MCP, 2.4 * MCP, 1.2 * MCP, H, [0, .4 * MCP, 4.1 * MCP], { a: .12 });
  if (L.beard === 'white') solid(head, 3 * MCP, 3.6 * MCP, 1 * MCP, '#eeeae2', [0, -1.2 * MCP, 4.2 * MCP], { r: [.12, 0, 0] });
  switch (hat) {
    case 'gear': { const gh = g.helm, s = gh.style;
      if (s === 'hood') hatLayer('hood', gh.c, gh.c2); else if (s === 'crown') { hatLayer('band', '#f0c850', '#f0c850'); for (const [px, pz] of [[-3, 0], [0, 3], [3, 0], [0, -3]]) cube(1.4, 2.4, 1.4, '#f0c850', [px, 9.6, pz], { emissive: '#f0c850', ei: .3 }); cube(1.2, 1.2, .6, gh.gem, [0, 6.6, 4.6], { emissive: gh.gem, ei: .8 }); }
      else { hatLayer('helm', gh.c, gh.c2, { cheek: gh.tier >= 2 });
        if (s === 'tassel') cube(2, 2.4, 2, gh.gem, [0, 9.6, 0]); if (s === 'plume' || s === 'phoenix') cube(1.2, 6, 1.2, gh.gem, [0, 10.6, -2.2], { r: [-.7, 0, 0] });
        if (s === 'wing' || s === 'phoenix') for (const sx of [1, -1]) cube(.6, 4, 2.4, gh.c2, [4.9 * sx, 7.4, -1], { r: [0, 0, -.4 * sx] });
        if (s === 'horn') for (const sx of [1, -1]) cube(1.2, 3.6, 1.2, gh.c2, [3.6 * sx, 9.6, 0], { r: [0, 0, -.5 * sx] });
        if (gh.tier >= 3) cube(.8, 1.6, 6, gh.c2, [0, 9.2, 0]); if (s === 'plain') cube(1, 2, 1, gh.c2, [0, 9.8, 0]); }
      break; }
    case 'guan': hatLayer('hood', L.body, L.sub); cube(2, 2, 2, L.sub, [0, 9.6, -1.5]); break;
    case 'zhang': hatLayer('band', L.sub, L.sub); break;
    case 'zhao': hatLayer('helm', '#e8eef6', '#c8d8f0', { cheek: true }); cube(1.2, 6, 1.2, '#d83a3a', [0, 10.4, -2.2], { r: [-.7, 0, 0] }); cube(.8, 1.4, 6, '#d8b050', [0, 9.2, 0]); break;
    case 'huang': hatLayer('helm', '#c8963a', '#f0d27a', { cheek: true }); cube(2, 2.4, 2, '#d83a3a', [0, 9.6, 0]); break;
    case 'ma': hatLayer('helm', '#e8e8f0', '#e0c040', { cheek: true }); cube(1.2, 6, 1.2, '#ffffff', [0, 10.4, -2.2], { r: [-.7, 0, 0] }); cube(2, 1.6, .8, '#e0c040', [0, 7.6, 4.7], { emissive: '#e0c040', ei: .2 }); break;
    case 'wei': hatLayer('helm', '#3a2a2a', '#8a1a1a', { cheek: true }); for (const sx of [1, -1]) cube(1.2, 4, 1.2, '#e8d8b0', [3.6 * sx, 9.8, 0], { r: [0, 0, -.5 * sx] }); break;
    case 'lubu': hatLayer('helm', '#d4a640', '#ffe08a', { cheek: true }); for (const sx of [1, -1]) for (let k = 0; k < 5; k++) cube(1, 3, 1, '#e03a2a', [(1.5 + k * 1.6) * sx, 10 + k * 2.2 - k * k * .3, -k * 1.4], { r: [-.3 * k, 0, -.45 * sx] }); break;
    case 'helm2': hatLayer('helm', L.helmc || '#8a90a0', L.metal || '#d8b050', { cheek: true }); cube(1.2, 6, 1.2, L.cape || '#c83a2a', [0, 10.4, -2.2], { r: [-.7, 0, 0] }); break;
    case 'helm': hatLayer('helm', L.helmc || '#6a7080', shade(L.helmc || '#6a7080', -.15)); break;
    case 'zhuge': cube(5, 3, 5, '#1e1e2a', [0, 9.4, -.5]); for (const sx of [1, -1]) cube(.8, 5, .4, '#1e1e2a', [1.2 * sx, 5, -4.6]); break;
    case 'diao': cube(3, 3, 3, H, [0, 9.4, -1.5], { slot: undefined }); for (const sx of [1, -1]) cube(.5, .5, 6, '#ffd86a', [1.8 * sx, 9.4, -1.5], { r: [0, 1.2 * sx, 0], emissive: '#ffd86a', ei: .3 }); cube(1.4, 1.4, 1.4, '#ff8ad0', [3.4, 7.4, 1.6]); break;
    case 'gan': hatLayer('band', '#8a1a1a', '#8a1a1a'); for (const sx of [1, -1]) cube(.8, 5, .8, '#f0d060', [2 * sx, 10, -2], { r: [-.5, 0, -.3 * sx] }); break;
    case 'sun': cube(2, 1.4, 1, '#f0d060', [0, 6.4, -4.6]); break;
    case 'scarf': hatLayer('turban', L.body, L.body); break;
    case 'taoist': cube(5.6, 6, 5.6, L.sub || L.body, [0, 10.8, 0], { r: [-.1, 0, 0] }); break;
    case 'crown': cube(4.4, 2.4, 4.4, '#151320', [0, 9, 0]); cube(9, .6, 6, '#151320', [0, 10.4, 0]); for (let k = -2; k <= 2; k++) cube(.4, 1.8, .4, '#e8c060', [k * 1.8, 9.2, 3], { emissive: '#e8c060', ei: .4 }); break;
  }
  if (g.helm && g.helm.keepHat) hatLayer('band', g.helm.c2, g.helm.c2);
  /* 팔 */
  const arms = [], aw = slim ? 3 : 4;
  const AF = f => mcArmTex(L, f, g, slim);
  for (const sx of [-1, 1]) {
    const sh = new T.Group(); sh.position.set((4 + aw / 2) * MCP * sx * ch, 10 * MCP, 0); torso.add(sh);
    addBox(sh, aw * MCP, 12 * MCP, 4 * MCP, [AF('side'), AF('side'), AF('top'), AF('bottom'), AF('front'), AF('back')], [0, -4 * MCP, 0], { slot: 'gloves' });
    if (plate) { const t = mcLamTex(armC, trim); addBox(sh, (aw + 1.4) * MCP, 3.4 * MCP, 5.4 * MCP, [t, t, t, null, t, t], [.3 * MCP * sx, 1 * MCP, 0], { slot: 'armor' }); }
    if (g.gloves && g.gloves.style !== 'plain') addBox(sh, (aw + .8) * MCP, 3 * MCP, 4.8 * MCP, Array(6).fill(mcSolidTex(g.gloves.c)), [0, -7.4 * MCP, 0], { slot: 'gloves' });
    const hand = new T.Group(); hand.position.set(0, -9.5 * MCP, 0); sh.add(hand);
    arms.push({ sh, hand, el: sh });
  }
  /* 망토 */
  let cape = null; const CP = g.cape, capeC = CP ? CP.c : L.cape;
  if (capeC) { cape = new T.Group(); cape.position.set(0, 12 * MCP, -2.3 * MCP * ch); torso.add(cape);
    const t = pxTex(`cape|${capeC}|${CP ? CP.trim : ''}|${CP ? CP.pattern : 0}`, 10, 16, x => { fillN(x, 0, 0, 10, 16, capeC, 'cp' + capeC, .06); if (CP) { for (let i = 0; i < 10; i++) P(x, i, 15, CP.trim); if (CP.pattern === 2) for (let j = 3; j < 15; j += 4) for (let i = 0; i < 10; i++) P(x, i, j, shade(capeC, -.12)); if (CP.emb) { P(x, 4, 6, CP.trim); P(x, 5, 6, CP.trim); P(x, 4, 7, CP.trim); P(x, 5, 7, CP.trim); } } });
    add(cape, geo('mccape', () => { const q = new T.BoxGeometry(10 * MCP, 16 * MCP, .6 * MCP); q.translate(0, -8 * MCP, 0); return q; }), mcMat(t), [0, 0, 0], { slot: 'cape' }); }
  /* 무기 */
  const W0 = g.weapon, wl = W0 ? { ...L, metal: W0.metal || L.metal } : L, gl = W0 && W0.glow ? W0.glow : null, enh = W0 ? W0.enh : 0;
  const wgrip = new T.Group(); arms[0].hand.add(wgrip); wgrip.userData.slot = 'weapon';
  const addW = (...a) => { const m = add(a[0], a[1], a[2], a[3], a[4] || {}); m.userData.slot = 'weapon'; return m; };
  const wt = L.weapon || 'none';
  if (wt !== 'bow') mcWeapon(wgrip, wt, wl, addW, gl, enh);
  let lgrip = null;
  if (L.dual && wt !== 'bow') { lgrip = new T.Group(); arms[1].hand.add(lgrip); mcWeapon(lgrip, wt, wl, addW, gl, enh); }
  if (wt === 'bow') mcWeapon(arms[1].hand, 'bow', wl, addW, gl, enh);
  if (L.backBow) { const bg = new T.Group(); bg.position.set(0, 7 * MCP, -2.6 * MCP); bg.rotation.set(0, 0, .6); torso.add(bg); mcWeapon(bg, 'bow', wl, addW, null, 0); }
  let shield = null;
  if (L.shield) { const st = pxTex(`shield|${L.shieldc}`, 10, 12, x => { fillN(x, 0, 0, 10, 12, L.shieldc || '#8a6a2a', 'shd', .08); for (let i = 0; i < 10; i++) { P(x, i, 0, '#8a8a92'); P(x, i, 11, '#8a8a92'); } for (let j = 0; j < 12; j++) { P(x, 0, j, '#8a8a92'); P(x, 9, j, '#8a8a92'); } P(x, 4, 5, '#d8c070'); P(x, 5, 5, '#d8c070'); P(x, 4, 6, '#d8c070'); P(x, 5, 6, '#d8c070'); });
    shield = addBox(arms[1].sh, 10 * MCP, 12 * MCP, .8 * MCP, [mcSolidTex('#6a4a2a'), mcSolidTex('#6a4a2a'), mcSolidTex('#6a4a2a'), mcSolidTex('#6a4a2a'), st, mcSolidTex('#6a4a2a')], [1 * MCP, -6 * MCP, 3 * MCP]); }
  return { root, rig: { body, hips, torso, head, legL: legs[0], legR: legs[1], armR: arms[0], armL: arms[1], wgrip, lgrip, cape, shield, hipBase: HIP, mountY: 1.62 - HIP }, meshes, flags };
}
function buildHorseMC(c) {
  const g = new T.Group(), meshes = [];
  const b = (w, h, d, col, p, r) => { const m = new T.Mesh(geo(`hb${w}|${h}|${d}`, () => new T.BoxGeometry(w, h, d)), mcMat(mcSolidTex(col, .08))); m.position.set(...p); if (r) m.rotation.set(...r); m.castShadow = true; g.add(m); meshes.push(m); return m; };
  b(1.4, .66, .62, c, [0, 1.22, 0]); b(.36, .76, .34, c, [.62, 1.58, 0], [0, 0, -.5]); b(.62, .32, .32, c, [.98, 1.86, 0], [0, 0, -.25]);
  b(.44, .12, .16, '#1a1410', [.6, 1.9, 0], [0, 0, -.5]); b(.12, .62, .12, '#1a1410', [-.74, 1.22, 0], [0, 0, -.35]); b(.5, .12, .66, '#7a2420', [-.05, 1.6, 0]);
  const legs = [];
  for (const [x, z] of [[.52, .2], [.52, -.2], [-.52, .2], [-.52, -.2]]) { const lg = new T.Group(); lg.position.set(x, .92, z); g.add(lg);
    const m = new T.Mesh(geo('hleg', () => { const q = new T.BoxGeometry(.2, .92, .2); q.translate(0, -.46, 0); return q; }), mcMat(mcSolidTex(c, .08))); m.castShadow = true; lg.add(m); meshes.push(m);
    const hf = new T.Mesh(geo('hhoof', () => new T.BoxGeometry(.22, .12, .22)), mcMat(mcSolidTex('#1a1410'))); hf.position.y = -.86; lg.add(hf); legs.push(lg); }
  g.rotation.y = -Math.PI / 2; const wrap = new T.Group(); wrap.add(g); return { grp: wrap, legs, meshes };
}
/* 디스패치 */
function buildFighter(L, opt) { return STYLE.mc ? buildFighterMC(L, opt) : buildFighterReal(L, opt); }
function buildHorse(c) { return STYLE.mc ? buildHorseMC(c) : buildHorseReal(c); }

/* ---------- 블록 월드 ---------- */
const BLK = {
  grass: () => pxTex('b_grass', 16, 16, x => fillN(x, 0, 0, 16, 16, '#5f9f3a', 'g', .09)),
  wheat: () => pxTex('b_wheat', 16, 16, x => fillN(x, 0, 0, 16, 16, '#b0a85a', 'w', .1)),
  night: () => pxTex('b_night', 16, 16, x => fillN(x, 0, 0, 16, 16, '#3a5a3e', 'n', .09)),
  dirt: () => pxTex('b_dirt', 16, 16, x => fillN(x, 0, 0, 16, 16, '#8a6a44', 'd', .1)),
  path: () => pxTex('b_path', 16, 16, x => fillN(x, 0, 0, 16, 16, '#b8985e', 'p', .07)),
  mud: () => pxTex('b_mud', 16, 16, x => { fillN(x, 0, 0, 16, 16, '#5a4a3a', 'm', .1); for (let i = 0; i < 10; i++) P(x, (i * 7) % 16, (i * 5) % 16, '#6a7a8a'); }),
  stone: () => pxTex('b_stone', 16, 16, x => fillN(x, 0, 0, 16, 16, '#8a8a88', 's', .08)),
  cobble: () => pxTex('b_cobble', 16, 16, x => { fillN(x, 0, 0, 16, 16, '#7a7a78', 'c', .12); for (let i = 0; i < 16; i += 4) for (let j = 0; j < 16; j++) if ((j + i) % 5 === 0) P(x, i, j, '#4a4a48'); }),
  bricks: () => pxTex('b_bricks', 16, 16, x => { fillN(x, 0, 0, 16, 16, '#8a8886', 'sb', .06); for (let j = 0; j < 16; j += 4) { for (let i = 0; i < 16; i++) P(x, i, j, '#5a5856'); for (let i = (j / 4) % 2 ? 0 : 8; i < 16; i += 16) for (let k = 0; k < 4; k++) P(x, i, j + k, '#5a5856'); } }),
  planks: () => pxTex('b_planks', 16, 16, x => { fillN(x, 0, 0, 16, 16, '#a8804a', 'pl', .07); for (let j = 3; j < 16; j += 4) for (let i = 0; i < 16; i++) P(x, i, j, '#6a4a2a'); for (let j = 0; j < 16; j += 4) P(x, (j * 3) % 16, j + 1, '#6a4a2a'); }),
  log: () => pxTex('b_log', 16, 16, x => { fillN(x, 0, 0, 16, 16, '#6a4a2a', 'lg', .08); for (let i = 1; i < 16; i += 3) for (let j = 0; j < 16; j++) if ((j + i) % 4) P(x, i, j, '#4a3218'); }),
  leaves: c => pxTex('b_leaves|' + c, 16, 16, x => { for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) if (hash32('lv' + i + ',' + j) % 7) P(x, i, j, nzc(c, 'l' + i + j, .14)); }),
  wool: c => pxTex('b_wool|' + c, 16, 16, x => fillN(x, 0, 0, 16, 16, c, 'wl' + c, .06)),
  tallgrass: c => pxTex('b_tg|' + c, 16, 16, x => { for (let k = 0; k < 7; k++) { const i = 1 + k * 2, hgt = 6 + hash32('tg' + k) % 9; for (let j = 16 - hgt; j < 16; j++) P(x, i + (j < 8 && k % 2 ? 1 : 0), j, nzc(c, 'tg' + k + j, .12)); } }),
  flower: c => pxTex('b_fl|' + c, 16, 16, x => { for (let j = 8; j < 16; j++) P(x, 7, j, '#3a7a2a'); P(x, 6, 12, '#4a8a3a'); P(x, 8, 10, '#4a8a3a'); for (const [i, j] of [[7, 5], [6, 6], [8, 6], [7, 7], [6, 5], [8, 7]]) P(x, i, j, c); P(x, 7, 6, '#ffe070'); }),
};
function blockMat(kind, rx = 1, ry = 1, o = {}) { const t = typeof kind === 'string' ? BLK[kind]() : kind; return mcMat(pxRep(t, rx, ry), o); }
function mcBox(w, h, d, mat, p, o = {}) { const m = new T.Mesh(geo(`mcb${w}|${h}|${d}`, () => new T.BoxGeometry(w, h, d)), mat); m.position.set(p[0], p[1], p[2]); if (o.r) m.rotation.set(...o.r); m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || world).add(m); return m; }
function mcCross(tex, x0, x1, bands, count, tints) {
  const g = geo('mccross', () => { const a = new T.PlaneGeometry(.9, .9), b = new T.PlaneGeometry(.9, .9); b.rotateY(Math.PI / 2); const m = new T.BufferGeometry(); const pa = [...a.attributes.position.array, ...b.attributes.position.array], ua = [...a.attributes.uv.array, ...b.attributes.uv.array], na = [...a.attributes.normal.array, ...b.attributes.normal.array];
    m.setAttribute('position', new T.Float32BufferAttribute(pa, 3)); m.setAttribute('uv', new T.Float32BufferAttribute(ua, 2)); m.setAttribute('normal', new T.Float32BufferAttribute(na.map((v, i) => i % 3 === 1 ? 1 : 0), 3)); m.setIndex([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5]); m.translate(0, .45, 0); return m; });
  const im = new T.InstancedMesh(g, toon('#ffffff', { map: tex, alphaTest: .5, side: T.DoubleSide }), count), d = new T.Object3D(), c = new T.Color();
  for (let i = 0; i < count; i++) { const b = bands[i % bands.length]; d.position.set(Math.round(rand(x0, x1)) + .5, 0, Math.round(rand(b[0], b[1])) + .5); d.rotation.y = Math.PI / 4; d.scale.setScalar(rand(.8, 1.1)); d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (tints) { im.setColorAt(i, c.set(pick(tints))); } }
  im.frustumCulled = false; world.add(im);
}
function mcTree(x, z, kind, leafC) {
  x = Math.round(x) + .5; z = Math.round(z) + .5; const h = 4 + (Math.random() * 3 | 0), logM = blockMat('log', 1, h);
  mcBox(1, h, 1, logM, [x, h / 2, z]);
  const lm = s => blockMat(BLK.leaves(leafC), s[0], s[1], { alphaTest: .4 });
  if (kind === 'pine') { for (let k = 0; k < 4; k++) { const w = k % 2 ? 3 : 5 - (k > 1 ? 2 : 0); mcBox(w, 1, w, lm([w, 1]), [x, h - 1.5 + k, z]); } mcBox(1, 1, 1, lm([1, 1]), [x, h + 2.5, z]); }
  else { mcBox(5, 2, 5, lm([5, 2]), [x, h - .5, z]); mcBox(3, 2, 3, lm([3, 2]), [x, h + 1.5, z]); }
}
function mcTent(x, z, c, s = 1) { const wm = blockMat(BLK.wool(c), 1, 1); x = Math.round(x) + .5; z = Math.round(z) + .5; mcBox(5, 1, 3, wm, [x, .5, z]); mcBox(3, 1, 3, wm, [x, 1.5, z]); mcBox(1, 1, 3, wm, [x, 2.5, z]); mcBox(1, 1.6, .2, mcMat(mcSolidTex('#2a1a10')), [x, .8, z + 1.52], { cast: false }); }
function mcMountains(x0, x1, c, n = 14) { for (let i = 0; i < n; i++) { const x = rand(x0, x1), z = -150 - rand(0, 90), w = rand(40, 80), h = rand(35, 80), steps = 4;
  for (let k = 0; k < steps; k++) { const ww = Math.round(w * (1 - k / steps)), hh = Math.round(h / steps); const top = k === steps - 1 && h > 60; mcBox(ww, hh, ww * .7, toon(top ? '#e8eef4' : col(c).offsetHSL(0, -.05, k * .03).getHex()), [x, hh * (k + .5) - 6, z], { cast: false }); } } }
function buildEnvMC(key, len) {
  const A = ATMOS[key]; applyAtmosphere(A); ENV.key = key; SKY_U.uBlock.value = 1;
  const L = len, x0 = -70, x1 = L + 90, WX = x1 - x0, cx = (x0 + x1) / 2, bg = A.bg, fs = FLAGSET[A.faction];
  const gk = { grass: 'grass', wheat: 'wheat', night: 'night', dirt: 'dirt', mud: 'mud', rock: 'stone', deck: 'planks' }[A.ground] || 'grass';
  if (bg !== 'redcliff') { const z0 = bg === 'bridge' ? -9 : -230, z1 = 40, D = z1 - z0; envMesh(new T.PlaneGeometry(WX, D), blockMat(gk, WX, D), { r: [-Math.PI / 2, 0, 0], p: [cx, 0, (z0 + z1) / 2] }); }
  if (A.road) { const rk = { dirt: 'path', paved: 'cobble', mud: 'mud', night: 'path' }[A.road] || 'path'; envMesh(new T.PlaneGeometry(WX, 11), blockMat(rk, WX, 11), { r: [-Math.PI / 2, 0, 0], p: [cx, .012, 0] }); }
  if (bg !== 'redcliff') mcMountains(x0 - 60, x1 + 60, bg === 'night' ? 0x2a2c50 : bg === 'pass' ? (A.rain ? 0x5a6474 : 0x9a8a78) : 0x7896c8);
  const tg = c => mcCross(BLK.tallgrass('#ffffff'), x0, x1, [[-24, -6], [6, 12]], 5000, c);
  if (bg === 'plains' || bg === 'camp') {
    tg(A.grass || [0x5a9a3a, 0x6aaa44]);
    if (key === 0) for (const c of ['#e03a2a', '#ffe040', '#6a8aff']) mcCross(BLK.flower(c), x0, x1, [[-22, -6], [6, 11]], 260, null);
    const lc = A.trees === 'blossom' ? ['#f2a8c0', '#5f9f3a'] : A.trees === 'autumn' ? ['#d87a3a', '#c89a3a'] : ['#4f9a3e', '#3a8a34'];
    for (let i = 0; i < 44; i++) mcTree(rand(x0, x1), rand(-40, -11), 'oak', Math.random() < .35 ? lc[0] : lc[1]);
    for (let i = 0; i < 22; i++) mcBox(1, 1, 1, blockMat('cobble'), [Math.round(rand(x0, x1)) + .5, .5, Math.round(pick([rand(-14, -7), rand(7, 9)])) + .5]);
    if (bg === 'plains') { for (let x = 20; x < L + 20; x += 18) flagPole(x, -7.2, fs); if (key === 0) for (let x = 60; x < L + 20; x += rand(9, 14)) mcTent(x, rand(-11, -9), pick(['#e8c860', '#d8b050'])); }
    if (key === 6) for (let x = 30; x < L; x += 26) for (let k = 0; k < 12; k++) mcBox(.5, 2.4, .5, blockMat('log', 1, 3), [x + k * .5, 1.2, -8]);
  }
  if (bg === 'fortress') {
    const br = blockMat('bricks', 12, 7), crm = blockMat('bricks');
    for (let x = x0; x < x1; x += 12) { mcBox(12, 7, 3, br, [x + 6, 3.5, -12]); for (let k = 0; k < 6; k++) mcBox(1, 1, 3, crm, [x + 1.5 + k * 2, 7.5, -12]); }
    const gx = L + 4; mcBox(16, 11, 5, blockMat('bricks', 16, 11), [gx, 5.5, -13]); mcBox(6, 6, .4, blockMat('planks', 6, 6), [gx, 3, -10.4]);
    for (let k = 0; k < 4; k++) mcBox(16 - k * 4, 1, 6 - k, blockMat('planks', 16 - k * 4, 1), [gx, 11.5 + k, -13]);
    for (let x = 6; x < L + 10; x += 14) flagPole(x, -9.6, fs, 5.2);
    for (let x = 14; x < L; x += 22) { mcBox(1, 1, 1, blockMat('cobble'), [Math.round(x) + .5, .5, -7.5]); flameAt(Math.round(x) + .5, 1, -7.5, .55); }
    for (let i = 0; i < 26; i++) mcTree(rand(x0, x1), rand(-60, -20), 'oak', A.rain ? '#2e4a4a' : pick(['#d87a3a', '#c89a3a']));
    if (A.rain) envMesh(new T.PlaneGeometry(WX, 60, 1, 1), waterMat(0x1a3050, 0x3a5a7a, 0x9ac8ff), { r: [-Math.PI / 2, 0, 0], p: [cx, .05, 42], receive: false });
  }
  if (bg === 'bridge') {
    tg(A.grass);
    envMesh(new T.PlaneGeometry(WX, 90, 1, 1), waterMat(0x2a5aa0, 0x3a7ac0, 0xdff8ff), { r: [-Math.PI / 2, 0, 0], p: [cx, -.25, -54], receive: false });
    envMesh(new T.PlaneGeometry(WX, 180), blockMat('grass', WX, 180), { r: [-Math.PI / 2, 0, 0], p: [cx, 0, -189] });
    for (let x = Math.round(x0); x < x1; x += 1 + (Math.random() * 3 | 0)) mcBox(1, 1, 1, blockMat('stone'), [x + .5, .1, -9.5]);
    const bx = Math.round(L - 4) + .5; mcBox(5, .5, 92, blockMat('planks', 5, 92), [bx, 1.3, -55]);
    for (let z = -12; z > -100; z -= 8) for (const sx of [-2, 2]) mcBox(1, 3, 1, blockMat('log', 1, 3), [bx + sx, .2, z]);
    for (let i = 0; i < 40; i++) mcTree(rand(x0, x1), rand(-110, -102), Math.random() < .5 ? 'pine' : 'oak', Math.random() < .5 ? '#2e5a34' : '#4f9a3e');
    for (let x = 18; x < L; x += 22) flagPole(x, -7.5, fs);
  }
  if (bg === 'redcliff') {
    envMesh(new T.PlaneGeometry(900, 500, 1, 1), waterMat(0x0a1024, 0x241f3a, 0xc86a30), { r: [-Math.PI / 2, 0, 0], p: [cx, -.9, -150], receive: false });
    mcBox(WX, 1, 13, blockMat('planks', WX, 13), [cx, -.5, 0]);
    for (let x = Math.round(x0); x < x1; x += 2) { mcBox(.25, 1, .25, blockMat('log'), [x + .5, .5, -6.1]); mcBox(.25, .6, .25, blockMat('log'), [x + .5, .3, 6.2]); }
    for (let x = 8; x < L + 20; x += 26) { mcBox(1, 16, 1, blockMat('log', 1, 16), [x, 8, -5.5]); mcBox(6, 8, .3, blockMat(BLK.wool('#e8dcc0'), 6, 8), [x, 9, -6.2]); }
    for (let i = 0; i < 12; i++) { const x = rand(x0, x1), z = rand(-30, -90); mcBox(14, 3, 4, blockMat('planks', 14, 3), [x, .6, z], { cast: false }); mcBox(5, 2, 3, blockMat('planks', 5, 2), [x - 2, 3, z], { cast: false }); mcBox(1, 14, 1, blockMat('log', 1, 14), [x + 2, 8, z], { cast: false }); if (i % 3 !== 2) { flameAt(x - 2, 4, z, rand(1.4, 2.4)); flameAt(x + 3, 2.2, z, rand(1, 1.8)); } }
    pointLights.forEach(l => { l.color.set(0xff7a30); l.intensity = 1.3; });
  }
  if (bg === 'pass') {
    for (let x = x0; x < x1; x += rand(5, 9)) { const h = Math.round(rand(6, 14)), zc = rand(-14, -10); for (let k = 0; k < 3; k++) mcBox(Math.round(rand(3, 6)) - k, Math.round(h / 3), Math.round(rand(3, 5)), blockMat('stone', 5, 4), [x + k * .5, h / 3 * (k + .5), zc]); }
    for (let i = 0; i < 18; i++) mcBox(1, 1, 1, blockMat('cobble'), [Math.round(rand(x0, x1)) + .5, .5, Math.round(pick([rand(-9, -7), rand(7, 9)])) + .5]);
    for (let i = 0; i < 30; i++) mcTree(rand(x0, x1), rand(-40, -16), 'pine', A.rain ? '#2e4a44' : '#3a6a3a');
    for (let x = 16; x < L; x += 24) flagPole(x, -8, fs);
  }
  if (bg === 'night') {
    for (let x = 0; x < L + 20; x += rand(8, 12)) mcTent(x, rand(-12, -9), pick(['#3a3a5a', '#4a4a6a']));
    for (let x = 10; x < L; x += 20) { mcBox(1, 1, 1, blockMat('cobble'), [Math.round(x) + .5, .5, -7.5]); flameAt(Math.round(x) + .5, 1, -7.5, .55); }
    for (let i = 0; i < 30; i++) mcTree(rand(x0, x1), rand(-50, -22), 'pine', '#2a4038');
    for (let x = 14; x < L; x += 24) flagPole(x, -8, fs, 5);
  }
  if (bg === 'camp') {
    mcTent(-2, -6, '#e8dcc0'); mcTent(7, -8, '#d8ccb0'); mcTent(16, -6.5, '#e8dcc0'); mcTent(-10, -7, '#d0c4a8');
    for (const r of [0, Math.PI / 2]) mcBox(1.6, .3, .3, blockMat('log'), [8.5, .15, 1.5], { r: [0, r, 0] }); flameAt(8.5, .3, 1.5, .9);
    for (const x of [-9, 16]) flagPole(x, -3, fs, 5);
    for (let k = 0; k < 24; k++) { mcBox(.5, 2.4, .5, blockMat('log', 1, 3), [-30 + k * .5, 1.2, -9]); mcBox(.5, 2.4, .5, blockMat('log', 1, 3), [22 + k * .5, 1.2, -9]); }
    mcBox(2, 1, 1, blockMat('planks', 2, 1), [9.5, .5, 3.5]); mcBox(1, 1, 1, mcMat(mcSolidTex('#6a6a72', .1)), [-5.5, .5, 3.5]);
    pointLights[0].color.set(0xff8a3a); pointLights[0].intensity = 2; pointLights[0].position.set(8.5, 2, 1.5);
  }
}
