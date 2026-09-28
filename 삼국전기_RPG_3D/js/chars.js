'use strict';
/* ===== 캐릭터 v2: 사실적 비율(6~7등신) · 페인팅 얼굴 텍스처 · 찰갑 · 견갑 · 요갑 · 부위별 장비 외형 =====
   look 포맷은 원작 그대로(skin · hair · body · sub · pants · boots · hat · hs · beard · weapon · armor · cape · face ...)
   look.gear = { helm, armor, gloves, boots, belt, cape, neck, weapon } 가 있으면 착용 장비 외형을 덧입힌다. */
const TEXC = new Map();
function ctex(key, w, h, paint, rep) {
  if (TEXC.has(key)) return TEXC.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); paint(x, w, h);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  t.userData.keep = true; TEXC.set(key, t); return t;
}
const shade = (c, k) => { const q = col(c); q.offsetHSL(0, 0, k); return '#' + q.getHexString(); };
const mixC = (a, b, t) => '#' + col(a).lerp(col(b), t).getHexString();
function hash32(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/* 찰갑(비늘 갑옷) 텍스처 */
function lamellarTex(base, trim, style = 'scale') {
  return ctex(`lam|${base}|${trim}|${style}`, 128, 128, (x, w, h) => {
    x.fillStyle = shade(base, -.18); x.fillRect(0, 0, w, h);
    const rows = style === 'chain' ? 16 : 8, cols = style === 'chain' ? 16 : 8, cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let q = -1; q < cols + 1; q++) {
      const cx = q * cw + (r % 2 ? cw / 2 : 0), cy = r * rh;
      const g = x.createLinearGradient(cx, cy, cx, cy + rh * 1.2); g.addColorStop(0, shade(base, .14)); g.addColorStop(.6, base); g.addColorStop(1, shade(base, -.14)); x.fillStyle = g;
      x.beginPath();
      if (style === 'fish') { x.arc(cx + cw / 2, cy + rh * .35, cw * .52, 0, Math.PI); }
      else if (style === 'plate') { x.rect(cx + 1, cy + 1, cw - 2, rh * 1.05); }
      else if (style === 'chain') { x.arc(cx + cw / 2, cy + rh / 2, cw * .45, 0, Math.PI * 2); }
      else { x.moveTo(cx + 1.5, cy); x.lineTo(cx + cw - 1.5, cy); x.lineTo(cx + cw - 1.5, cy + rh * .9); x.quadraticCurveTo(cx + cw / 2, cy + rh * 1.35, cx + 1.5, cy + rh * .9); x.closePath(); }
      x.fill(); x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1.2; x.stroke();
      if (style === 'plate') { x.fillStyle = trim; x.beginPath(); x.arc(cx + 4, cy + 4, 1.6, 0, 7); x.arc(cx + cw - 4, cy + 4, 1.6, 0, 7); x.fill(); }
    }
    x.strokeStyle = trim; x.globalAlpha = .75; x.lineWidth = 1.4; for (let r = 1; r < rows; r += 2) { x.beginPath(); x.moveTo(0, r * rh + 2); x.lineTo(w, r * rh + 2); x.stroke(); } x.globalAlpha = 1;
  });
}
/* 옷감: 직조 무늬 + 아래쪽 자수 단(uv 아래 = 캔버스 아래) */
function clothTex(base, trim, hem = true, pattern = 0) {
  return ctex(`cloth|${base}|${trim}|${hem}|${pattern}`, 128, 128, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
    x.strokeStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 6; i++) { x.beginPath(); const xx = rand(0, w); x.moveTo(xx, 0); x.bezierCurveTo(xx + 6, h * .3, xx - 6, h * .7, xx + 3, h); x.stroke(); }
    if (pattern === 1) { x.strokeStyle = shade(base, .12); x.lineWidth = 2; for (let i = 0; i < 4; i++) { const cx = (i % 2) * 64 + 32, cy = Math.floor(i / 2) * 50 + 26; x.beginPath(); x.arc(cx, cy, 10, 0, Math.PI * 1.5); x.arc(cx + 10, cy - 4, 6, Math.PI, Math.PI * 2.5); x.stroke(); } }
    if (pattern === 2) { x.fillStyle = shade(base, -.12); for (let i = 0; i < 6; i++) x.fillRect(0, i * 22, w, 6); }
    if (pattern === 3) { x.fillStyle = 'rgba(20,12,4,.75)'; for (let i = 0; i < 9; i++) { x.beginPath(); const yy = rand(0, h), xx = rand(0, w); x.moveTo(xx, yy); x.quadraticCurveTo(xx + 14, yy + 8, xx + 26, yy + 2); x.quadraticCurveTo(xx + 14, yy + 14, xx, yy); x.fill(); } }
    if (hem) { const y0 = h - 22; x.fillStyle = trim; x.fillRect(0, y0, w, 22); x.fillStyle = shade(trim, -.25); x.fillRect(0, y0, w, 2); x.fillRect(0, h - 3, w, 3);
      x.strokeStyle = shade(trim, -.3); x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= w; i += 16) { x.moveTo(i, y0 + 11); x.lineTo(i + 8, y0 + 5); x.lineTo(i + 16, y0 + 11); x.lineTo(i + 8, y0 + 17); x.closePath(); } x.stroke(); }
  });
}
function hairTex(c) {
  return ctex(`hair|${c}`, 128, 128, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { x.strokeStyle = Math.random() < .5 ? shade(c, .16) : shade(c, -.12); x.globalAlpha = .6; x.lineWidth = rand(.6, 1.6); const xx = rand(0, w); x.beginPath(); x.moveTo(xx, 0); x.quadraticCurveTo(xx + rand(-8, 8), h / 2, xx + rand(-4, 4), h); x.stroke(); }
    x.globalAlpha = .35; x.fillStyle = '#ffffff'; x.fillRect(0, h * .18, w, 6); x.globalAlpha = 1; });
}
function skinTex(c, muscle) {
  return ctex(`skin|${c}|${muscle}`, 128, 128, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h);
    if (muscle) { x.strokeStyle = shade(c, -.1); x.lineWidth = 3; x.globalAlpha = .6; x.beginPath(); x.moveTo(w * .25, h * .35); x.quadraticCurveTo(w * .25, h * .55, w * .5, h * .55); x.quadraticCurveTo(w * .75, h * .55, w * .75, h * .35); x.stroke();
      for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(w * .4, h * (.62 + i * .1)); x.lineTo(w * .6, h * (.62 + i * .1)); x.stroke(); } x.globalAlpha = 1; } });
}
/* 짐승 얼굴 버클 · 호심경 문장 */
function emblemTex(c, kind) {
  return ctex(`emb|${c}|${kind}`, 128, 128, (x, w, h) => {
    const g = x.createRadialGradient(54, 50, 6, 64, 64, 64); g.addColorStop(0, shade(c, .3)); g.addColorStop(.7, c); g.addColorStop(1, shade(c, -.25)); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = shade(c, -.35); x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(64, 64, 46, 0, 7); x.stroke();
    x.fillStyle = shade(c, -.4); x.strokeStyle = shade(c, -.4); x.lineWidth = 3;
    if (kind === 'beast') { x.beginPath(); x.ellipse(46, 52, 7, 5, .3, 0, 7); x.ellipse(82, 52, 7, 5, -.3, 0, 7); x.fill(); x.beginPath(); x.moveTo(40, 80); x.quadraticCurveTo(64, 100, 88, 80); x.stroke(); x.beginPath(); x.moveTo(64, 58); x.lineTo(58, 72); x.lineTo(70, 72); x.closePath(); x.fill();
      for (const sx of [-1, 1]) { x.beginPath(); x.moveTo(64 + sx * 18, 84); x.lineTo(64 + sx * 14, 96); x.stroke(); } }
    else if (kind === 'dragon') { x.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2.2; x.lineTo(64 + Math.cos(a) * (34 - i * .5), 64 + Math.sin(a) * (34 - i * .5)); } x.stroke(); x.beginPath(); x.arc(64, 64, 6, 0, 7); x.fill(); }
    else { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38); } x.stroke(); }
  });
}
/* ---------- 얼굴: 구 UV 기준 정면(u=.25) 에 이목구비를 그린다 ---------- */
function faceTex(L) {
  const fem = L.face === 'female', old = L.beard === 'white' || L.age === 'old', fierce = L.face === 'fierce', calm = L.face === 'calm';
  const key = `face|${L.skin}|${L.eye}|${L.face}|${L.beard}|${L.hair}|${L.patch}|${old}`;
  return ctex(key, 512, 256, (x, w, h) => {
    const sk = L.skin, cx = 128, cy = 124;
    x.fillStyle = sk; x.fillRect(0, 0, w, h);
    const sg = x.createRadialGradient(cx, cy, 30, cx, cy, 170); sg.addColorStop(0, 'rgba(255,240,225,.10)'); sg.addColorStop(1, 'rgba(60,20,10,.28)'); x.fillStyle = sg; x.fillRect(0, 0, w, h);
    /* 볼 · 턱 음영 */
    x.fillStyle = 'rgba(90,30,20,.10)'; x.beginPath(); x.ellipse(cx, cy + 58, 46, 14, 0, 0, 7); x.fill();
    if (fem) { x.fillStyle = 'rgba(255,110,120,.22)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * 34, cy + 22, 13, 8, 0, 0, 7); x.fill(); } }
    /* 수염 자국(남성) */
    if (!fem && L.beard && L.beard !== 'white') { x.fillStyle = mixC(sk, L.hair, .35); x.globalAlpha = .55; x.beginPath(); x.ellipse(cx, cy + 50, 40, 26, 0, 0, Math.PI); x.fill(); x.globalAlpha = 1; }
    /* 눈 */
    const ew = fem ? 17 : calm ? 15 : 15, eh = fem ? 10 : calm ? 5.5 : fierce ? 6.5 : 7.5, ex = fem ? 27 : 25, ey = cy - 4, tilt = fierce ? .22 : fem ? -.06 : .06;
    for (const s of [-1, 1]) {
      if (L.patch && s === 1) { x.fillStyle = '#141018'; x.beginPath(); x.ellipse(cx + ex, ey, 19, 15, 0, 0, 7); x.fill(); x.strokeStyle = '#141018'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 60, ey - 26); x.lineTo(cx + 70, ey + 4); x.stroke(); continue; }
      x.save(); x.translate(cx + s * ex, ey); x.rotate(s * tilt);
      x.beginPath(); x.moveTo(-ew, 0); x.quadraticCurveTo(0, -eh * 1.5, ew, -eh * .2); x.quadraticCurveTo(0, eh * 1.1, -ew, 0); x.closePath();
      x.fillStyle = '#fbf6ee'; x.fill(); x.save(); x.clip();
      const ir = eh * (fem ? 1.05 : 1.15), ig = x.createRadialGradient(s * 1, -1, 1, s * 1, 0, ir); ig.addColorStop(0, shade(L.eye || '#3a2a20', .25)); ig.addColorStop(.7, L.eye || '#3a2a20'); ig.addColorStop(1, '#0c0a10');
      x.fillStyle = ig; x.beginPath(); x.arc(s * 1, -1, ir, 0, 7); x.fill(); x.fillStyle = '#08060a'; x.beginPath(); x.arc(s * 1, -1, ir * .45, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(s * 1 + 3, -4, fem ? 3 : 2.2, 0, 7); x.fill(); x.globalAlpha = .6; x.beginPath(); x.arc(s * 1 - 2, 2, 1.2, 0, 7); x.fill(); x.globalAlpha = 1;
      x.restore();
      x.strokeStyle = '#1a1014'; x.lineWidth = fem ? 3.2 : 2.6; x.beginPath(); x.moveTo(-ew - 1, .5); x.quadraticCurveTo(0, -eh * 1.6, ew + 1, -eh * .2); x.stroke();
      if (fem) { x.lineWidth = 1.6; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(ew * (.35 + k * .25) * 1, -eh * (.9 - k * .25)); x.lineTo(ew * (.5 + k * .28), -eh * (1.4 - k * .25)); x.stroke(); } }
      x.strokeStyle = 'rgba(80,40,30,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-ew * .7, eh * .75); x.quadraticCurveTo(0, eh * 1.2, ew * .8, eh * .3); x.stroke();
      if (calm) { x.strokeStyle = 'rgba(60,30,20,.4)'; x.beginPath(); x.moveTo(-ew, -eh * .9); x.quadraticCurveTo(0, -eh * 2.1, ew, -eh * .8); x.stroke(); }
      if (old) { x.strokeStyle = 'rgba(70,30,20,.35)'; x.lineWidth = 1; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(ew + 2, -2 + k * 4); x.lineTo(ew + 9, -5 + k * 6); x.stroke(); } }
      /* 눈썹 */
      x.fillStyle = L.beard === 'white' ? '#e8e4dc' : L.hair; const by = -eh * 1.6 - (fem ? 7 : 5), bt = fierce ? .3 : fem ? -.12 : .1;
      x.save(); x.translate(0, by); x.rotate(s * bt * s); x.beginPath(); x.moveTo(-ew * 1.05, 2); x.quadraticCurveTo(0, fem ? -5 : -6, ew * 1.05, s < 0 ? 0 : 0); x.quadraticCurveTo(0, fem ? -1.5 : (fierce ? 2 : -1), -ew * 1.05, fem ? 3.5 : 5.5); x.fill(); x.restore();
      x.restore();
    }
    /* 코 */
    x.strokeStyle = 'rgba(90,40,30,.35)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - 3, cy - 2); x.quadraticCurveTo(cx - 6, cy + 18, cx - 7, cy + 22); x.stroke();
    x.fillStyle = 'rgba(70,25,20,.45)'; x.beginPath(); x.ellipse(cx - 5, cy + 25, 2.6, 1.6, 0, 0, 7); x.ellipse(cx + 5, cy + 25, 2.6, 1.6, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(cx - 1, cy - 4, 2.5, 20);
    /* 입 */
    const my = cy + 40;
    if (fem) { x.fillStyle = '#d8606a'; x.beginPath(); x.moveTo(cx - 10, my); x.quadraticCurveTo(cx - 4, my - 4, cx, my - 2); x.quadraticCurveTo(cx + 4, my - 4, cx + 10, my); x.quadraticCurveTo(cx, my + 7, cx - 10, my); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(cx - 3, my + 1, 5, 1.5); }
    else { x.strokeStyle = 'rgba(80,30,25,.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 12, my + (fierce ? 2 : 0)); x.quadraticCurveTo(cx, my + (fierce ? -1 : 2), cx + 12, my + (fierce ? 2 : 0)); x.stroke();
      x.fillStyle = 'rgba(120,50,45,.28)'; x.beginPath(); x.ellipse(cx, my + 5, 8, 2.5, 0, 0, 7); x.fill(); }
    if (old) { x.strokeStyle = 'rgba(70,30,20,.3)'; x.lineWidth = 1.2; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(cx - 22, cy - 40 - k * 6); x.quadraticCurveTo(cx, cy - 44 - k * 6, cx + 22, cy - 40 - k * 6); x.stroke(); }
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 12, cy + 26); x.quadraticCurveTo(cx + s * 20, cy + 38, cx + s * 16, my + 8); x.stroke(); } }
    /* 콧수염 (페인팅) */
    if (!fem && L.beard && L.beard !== 'long') { x.fillStyle = L.beard === 'white' ? '#eeeae2' : L.hair; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx, my - 6); x.quadraticCurveTo(cx + s * 10, my - 10, cx + s * 20, my + 2); x.quadraticCurveTo(cx + s * 10, my - 4, cx, my - 3); x.fill(); } }
  });
}
function headGeo(kind) {
  return geo('headv2_' + kind, () => {
    const g = new T.SphereGeometry(.13, 40, 30), p = g.attributes.position, r = .13, fem = kind === 'female';
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = Math.max(0, -y / r);
      x *= 1 - d * (fem ? .3 : .22); z *= 1 - d * .08; if (z > 0 && d > .55) z += (d - .55) * (fem ? .006 : .014);
      if (y > r * .3) { x *= 1 + (y / r - .3) * .05; } if (z < 0) z *= 1.08; p.setXYZ(i, x, y, z); }
    g.computeVertexNormals(); return g;
  });
}
const HAT_OF = { guan: 'guan', zhang: 'zhang', zhao: 'zhao', huang: 'huang', zhuge: 'zhuge', ma: 'ma', diao: 'diao', wei: 'wei', lubu: 'lubu', xu: 'helm2', gan: 'gan', sun: 'sun' };
/* ---------- 본체 ---------- */
function buildFighterReal(L, opt = {}) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const meshes = [], flags = [], gear = L.gear || {};
  function add(parent, g, color, p, o = {}) {
    const mat = (color && color.isMaterial) ? color : toon(color, o);
    const m = new T.Mesh(g, mat);
    if (p) m.position.set(p[0], p[1], p[2]); if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]); if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    m.castShadow = o.shadow !== false;
    if (o.ol !== false) { if (!g.boundingSphere) g.computeBoundingSphere(); const bs = g.boundingSphere, k = 1 + (o.ot || .016) / Math.max(bs.radius, .05);
      const ol = new T.Mesh(g, OUTLINE); ol.scale.setScalar(k); ol.position.copy(bs.center).multiplyScalar(1 - k); m.add(ol); }
    if (o.slot) m.userData.slot = o.slot;
    m.userData.mat = mat; meshes.push(m); parent.add(m); if (m.userData.flag) flags.push(m); return m;
  }
  const tm = (c, map, o = {}) => toon('#ffffff', { ...o, map, noCache: false, key: map.uuid + (o.side || '') });
  const fem = L.face === 'female', elem = opt.elem || L.sub || '#ffffff';
  const A = gear.armor, armor = A ? 'plate' : (L.armor || 'cloth'), bare = armor === 'bare', bulk = (L.chest || 1) * (bare ? 1.12 : 1) * (fem ? .92 : 1);
  const armC = A ? A.c : shade(L.body, -.06), armT = A ? A.trim : (L.metal && L.metal !== '#dfe6ee' ? L.metal : L.sub), lamStyle = A ? A.style : 'scale';
  const HIP = 1.02;
  const hips = new T.Group(); hips.position.y = HIP; body.add(hips);
  const torso = new T.Group(); hips.add(torso);
  /* 다리 */
  const legs = [], knees = [], pantsTex = clothTex(L.pants || shade(L.body, -.2), shade(L.pants || L.body, -.3), false);
  const B0 = gear.boots, bootC = B0 ? B0.c : (L.boots || '#2a2224');
  for (const sx of [1, -1]) {
    const lg = new T.Group(); lg.position.set(.11 * sx * bulk, -.02, 0); hips.add(lg);
    add(lg, geo('thigh2', () => new T.CapsuleGeometry(.082, .3, 4, 12)), tm(0, pantsTex), [0, -.23, 0]);
    const kn = new T.Group(); kn.position.y = -.5; lg.add(kn);
    add(kn, geo('shin2', () => new T.CapsuleGeometry(.066, .26, 4, 12)), tm(0, pantsTex), [0, -.17, 0]);
    add(kn, geo('bootc2', () => new T.CylinderGeometry(.078, .086, .28, 14)), bootC, [0, -.36, .005], { slot: 'boots' });
    add(kn, geo('foot2', () => { const q = new T.CapsuleGeometry(.055, .12, 4, 8); q.rotateX(Math.PI / 2); q.scale(1.15, .7, 1); return q; }), bootC, [0, -.5, .06], { slot: 'boots' });
    if (armor === 'plate' || B0) { add(kn, geo('greave2', () => new T.CylinderGeometry(.082, .074, .3, 14, 1, true, -1.1, 2.2)), B0 ? B0.c2 : armC, [0, -.2, .01], { side: T.DoubleSide, slot: 'boots' });
      if (B0 && B0.style === 'wing') add(kn, geo('bwing', () => new T.ConeGeometry(.04, .16, 6)), B0.c2, [.08 * sx, -.28, -.02], { r: [0, 0, -.8 * sx], slot: 'boots' });
      add(kn, geo('kneecap', () => new T.SphereGeometry(.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), B0 ? B0.c2 : armT, [0, .0, .04], { r: [Math.PI / 2 - .3, 0, 0], slot: 'boots' }); }
    legs.push(lg); knees.push(kn);
  }
  /* 하의: 전포 · 치마 · 요갑 */
  const hemTex = clothTex(L.body, L.sub, true, 0);
  if (armor === 'robe' || armor === 'dress') add(hips, geo('robe2' + armor, () => new T.CylinderGeometry(.17 * 1, armor === 'dress' ? .44 : .36, .96, 22, 1, true)), tm(0, hemTex, { side: T.DoubleSide }), [0, -.46, 0], { s: [bulk, 1, bulk * .95] });
  else add(hips, geo('underskirt2', () => new T.CylinderGeometry(.17, .27, .5, 20, 1, true)), tm(0, hemTex, { side: T.DoubleSide }), [0, -.2, 0], { s: [bulk, 1, bulk * .9] });
  if (armor === 'plate') { const lt = lamellarTex(armC, armT, lamStyle);
    for (const [a, w2] of [[-.5, .95], [.5, .95], [Math.PI - .5, .9], [Math.PI + .5, .9], [Math.PI / 2, .75], [-Math.PI / 2, .75]]) add(hips, geo('tasset' + w2, () => new T.CylinderGeometry(.2, .3, .38, 8, 1, true, -w2 / 2, w2)), tm(0, lt, { side: T.DoubleSide }), [0, -.17, 0], { r: [0, a, 0], s: [bulk, 1, bulk * .92], slot: 'armor', ot: .01 }); }
  /* 몸통 */
  const chestG = geo('chest2', () => { const pts = [[.001, -.02], [.14, -.02], [.155, .08], [.175, .2], [.195, .32], [.2, .4], [.185, .46], [.12, .5], [.06, .52], [.001, .52]].map(q => new T.Vector2(q[0], q[1])); return new T.LatheGeometry(pts, 28); });
  const chestMat = armor === 'plate' ? tm(0, lamellarTex(armC, armT, lamStyle)) : bare ? tm(0, skinTex(L.skin, true)) : tm(0, clothTex(L.body, L.sub, false, armor === 'robe' ? 1 : 0));
  add(torso, chestG, chestMat, [0, .1, 0], { s: [bulk * 1.02, 1, bulk * .74], slot: armor === 'plate' ? 'armor' : undefined });
  if (armor !== 'plate' && !bare) for (const sx of [1, -1]) add(torso, geo('lapel', () => new T.BoxGeometry(.05, .3, .02)), L.sub, [.045 * sx, .47, .145 * bulk], { r: [-.12, 0, .38 * sx], ol: false });
  if (armor === 'plate') {
    add(torso, geo('breast2', () => new T.SphereGeometry(.2, 20, 12, Math.PI / 2 - 1, 2, Math.PI * .25, Math.PI * .4)), armT, [0, .31, .005], { s: [bulk * 1.02, .9, bulk * .78], slot: 'armor', ot: .008 });
    add(torso, geo('mirror2', () => { const q = new T.CylinderGeometry(.065, .065, .015, 24); q.rotateX(Math.PI / 2); return q; }), tm(0, emblemTex(A && A.emb ? A.embC : '#d8b050', A && A.emb ? A.emb : 'rays')), [0, .38, .155 * bulk], { slot: 'armor', ot: .008 });
  }
  const BE = gear.belt;
  add(torso, geo('belt2', () => { const q = new T.TorusGeometry(.16, .028, 8, 28); q.rotateX(Math.PI / 2); return q; }), BE ? BE.c : (bare ? L.body : shade(L.sub, -.1)), [0, .09, 0], { s: [bulk * 1.02, 1, bulk * .78], slot: 'belt' });
  add(torso, geo('buckle2', () => { const q = new T.CylinderGeometry(.045, .045, .02, 20); q.rotateX(Math.PI / 2); return q; }), tm(0, emblemTex(BE ? BE.bc : '#c8a040', 'beast')), [0, .09, .128 * bulk], { slot: 'belt', ot: .008 });
  if (BE && BE.style === 'tassel') for (const sx of [1, -1]) add(torso, geo('btas', () => { const q = new T.ConeGeometry(.018, .16, 6); q.rotateX(Math.PI); return q; }), BE.bc, [.06 * sx, 0, .125 * bulk], { ol: false, slot: 'belt' });
  if (!bare) add(torso, geo('collar2', () => new T.TorusGeometry(.075, .028, 8, 18)), armor === 'plate' ? armT : L.sub, [0, .6, 0], { r: [Math.PI / 2, 0, 0] });
  const NK = gear.neck;
  if (NK) { add(torso, geo('chain', () => new T.TorusGeometry(.1, .006, 4, 24)), '#e8c860', [0, .54, .03], { r: [1.25, 0, 0], ol: false, slot: 'neck' });
    add(torso, geo('pend', () => new T.OctahedronGeometry(.028, 0)), NK.c, [0, .45, .158 * bulk], { emissive: NK.c, ei: .6, slot: 'neck', ot: .006 }); }
  /* 머리 */
  const head = new T.Group(); head.position.set(0, .69, 0); torso.add(head);
  add(head, geo('neck2', () => new T.CylinderGeometry(.048, .056, .12, 12)), L.skin, [0, -.02, 0], { ol: false });
  add(head, headGeo(fem ? 'female' : 'male'), tm(0, faceTex(L)), [0, .14, 0], { s: [1, 1.12, 1.02], ot: .012 });
  add(head, geo('nose2', () => { const q = new T.ConeGeometry(.016, .045, 8); q.rotateX(Math.PI / 2 + .4); return q; }), L.skin, [0, .122, .128], { ol: false });
  for (const sx of [1, -1]) add(head, geo('ear2', () => new T.SphereGeometry(.028, 10, 8)), L.skin, [.126 * sx, .135, -.005], { s: [.45, 1, .75], ol: false });
  const HC = L.hair, hs = L.hs || 'short', ht = tm(0, hairTex(HC));
  const G0 = gear.helm, hatKey = G0 && !G0.keepHat ? 'gear' : L.hat;
  if (hatKey !== 'none' || hs !== 'short') add(head, geo('hair2', () => new T.SphereGeometry(.142, 28, 14, 0, Math.PI * 2, 0, Math.PI * .56)), ht, [0, .165, -.014], { r: [-.46, 0, 0], ot: .01 });
  if (hs === 'long' || hs === 'long_f') { add(head, geo('hairlong2' + hs, () => { const q = new T.CapsuleGeometry(.1, hs === 'long_f' ? .5 : .3, 4, 14); q.translate(0, -.15, 0); return q; }), ht, [0, .12, -.08], { s: [1.3, 1, .5], ot: .01 });
    for (const sx of [1, -1]) add(head, geo('lock2' + hs, () => { const q = new T.CapsuleGeometry(.024, hs === 'long_f' ? .34 : .18, 4, 8); q.translate(0, -.12, 0); return q; }), ht, [.11 * sx, .15, .05], { r: [0, 0, .08 * sx], ot: .006 }); }
  if (hs === 'spiky') for (let k = 0; k < 7; k++) { const a = -1.3 + k * .43; add(head, geo('spike2', () => new T.ConeGeometry(.035, .13, 6)), ht, [Math.sin(a) * .11, .27, -.06 - Math.cos(a) * .05], { r: [-.8, 0, -a * .6], ol: false }); }
  if (hs === 'short' || hs === 'spiky') for (const sx of [1, -1]) add(head, geo('side2', () => new T.CapsuleGeometry(.02, .06, 4, 6)), ht, [.122 * sx, .17, .03], { ol: false });
  if (hs === 'topknot' || (hatKey === 'none' && hs !== 'long_f')) { add(head, geo('bun2', () => new T.SphereGeometry(.055, 14, 10)), ht, [0, .31, -.04]); add(head, geo('bunband', () => new T.TorusGeometry(.04, .01, 6, 16)), '#d8b050', [0, .29, -.035], { r: [Math.PI / 2 - .3, 0, 0], ol: false }); }
  if (hs === 'ponytail') add(head, geo('pony2', () => { const q = new T.CapsuleGeometry(.04, .38, 4, 10); q.translate(0, -.21, 0); return q; }), ht, [0, .25, -.12], { r: [.45, 0, 0] });
  /* 수염(입체) */
  const BC = L.beard === 'white' ? '#f0ece4' : HC, bt = tm(0, hairTex(BC));
  if (L.beard === 'long') { add(head, geo('beardL2', () => { const q = new T.ConeGeometry(.06, .4, 12); q.rotateX(Math.PI); q.translate(0, -.2, 0); return q; }), bt, [0, .06, .1], { r: [.18, 0, 0], s: [1, 1, .6] });
    for (const sx of [1, -1]) add(head, geo('must2', () => { const q = new T.ConeGeometry(.012, .08, 6); q.rotateZ(Math.PI / 2); return q; }), bt, [.03 * sx, .085, .128], { r: [0, 0, sx > 0 ? .5 : Math.PI - .5], ol: false }); }
  if (L.beard === 'spiky') { add(head, geo('beardS2', () => new T.SphereGeometry(.1, 16, 10, 0, Math.PI * 2, Math.PI * .45, Math.PI * .55)), bt, [0, .1, .02], { s: [1.15, 1.05, 1.1] }); for (let k = -2; k <= 2; k++) add(head, geo('bspike', () => new T.ConeGeometry(.02, .08, 5)), bt, [k * .03, .02, .09], { r: [2.9, 0, k * .2], ol: false }); }
  if (L.beard === 'white') add(head, geo('beardW2', () => { const q = new T.ConeGeometry(.05, .26, 10); q.rotateX(Math.PI); q.translate(0, -.13, 0); return q; }), bt, [0, .06, .1], { r: [.2, 0, 0], s: [1, 1, .6] });
  if (L.beard === 'short') add(head, geo('goatee2', () => { const q = new T.ConeGeometry(.025, .09, 8); q.rotateX(Math.PI); q.translate(0, -.045, 0); return q; }), bt, [0, .055, .115], { r: [.35, 0, 0] });
  /* 모자 · 투구 */
  const helm = (c, trim, o = {}) => {
    add(head, geo('helm3', () => new T.SphereGeometry(.155, 28, 14, 0, Math.PI * 2, 0, Math.PI * .45)), c, [0, .17, -.008], { r: [-.22, 0, 0], slot: 'helm', ot: .01 });
    add(head, geo('helmrim3', () => { const q = new T.TorusGeometry(.149, .012, 8, 32); q.rotateX(Math.PI / 2); return q; }), trim, [0, .2, -.01], { r: [-.22, 0, 0], slot: 'helm', ol: false });
    add(head, geo('neckguard', () => new T.CylinderGeometry(.155, .175, .1, 20, 1, true, Math.PI * .6, Math.PI * .8)), c, [0, .09, -.01], { side: T.DoubleSide, slot: 'helm', ot: .008 });
    if (o.cheek) for (const sx of [1, -1]) add(head, geo('cheek2', () => new T.BoxGeometry(.01, .075, .055)), c, [.14 * sx, .1, -.01], { r: [0, -.25 * sx, -.12 * sx], slot: 'helm', ot: .005 });
    if (o.spike) add(head, geo('hspike2', () => new T.ConeGeometry(.018, .12, 8)), trim, [0, .33, -.03], { slot: 'helm', ol: false });
    if (o.tassel) add(head, geo('htassel', () => { const q = new T.ConeGeometry(.05, .16, 12); q.rotateX(Math.PI); q.translate(0, -.04, 0); return q; }), o.tassel, [0, .36, -.04], { slot: 'helm' });
    if (o.plume) add(head, geo('plume2', () => { const q = new T.ConeGeometry(.035, .32, 10); q.translate(0, .16, 0); return q; }), o.plume, [0, .31, -.05], { r: [-1.05, 0, 0], slot: 'helm' });
    if (o.wing) for (const sx of [1, -1]) add(head, geo('hwing', () => { const q = new T.ConeGeometry(.035, .22, 4); q.translate(0, .11, 0); return q; }), o.wing, [.15 * sx, .22, -.02], { r: [-.2, 0, -.9 * sx], s: [1, 1, .3], slot: 'helm' });
    if (o.horn) for (const sx of [1, -1]) add(head, geo('horn2', () => { const q = new T.ConeGeometry(.022, .2, 8); q.translate(0, .1, 0); return q; }), o.horn, [.11 * sx, .27, 0], { r: [0, 0, -.55 * sx], slot: 'helm' });
    if (o.crest) add(head, geo('crest2', () => new T.BoxGeometry(.012, .09, .16)), o.crest, [0, .31, .02], { slot: 'helm', ot: .006 });
    if (o.mask) add(head, geo('lionmask', () => new T.SphereGeometry(.04, 12, 8)), o.mask, [0, .26, .12], { emissive: o.mask, ei: .2, slot: 'helm' });
  };
  const band = (c) => add(head, geo('band2', () => new T.TorusGeometry(.136, .017, 8, 28)), c, [0, .19, 0], { r: [Math.PI / 2 - .22, 0, 0], ol: false });
  switch (hatKey) {
    case 'gear': { const g = G0, s = g.style;
      if (s === 'hood') { add(head, geo('ghood2', () => new T.SphereGeometry(.158, 24, 12, 0, Math.PI * 2, 0, Math.PI * .47)), g.c, [0, .165, -.02], { r: [-.25, 0, 0], slot: 'helm' }); add(head, geo('ghoodk', () => new T.SphereGeometry(.035, 10, 8)), g.c2, [0, .3, -.06], { slot: 'helm' }); }
      else if (s === 'crown') { add(head, geo('gcrown', () => new T.CylinderGeometry(.12, .1, .08, 16, 1, true)), g.c, [0, .3, -.02], { side: T.DoubleSide, emissive: g.c, ei: .3, slot: 'helm' }); for (let k = 0; k < 5; k++) add(head, geo('gcrownp', () => new T.ConeGeometry(.02, .07, 6)), g.c, [Math.cos(k * 1.26 + 1.57) * .11, .36, Math.sin(k * 1.26 + 1.57) * .11 - .02], { slot: 'helm', ol: false }); add(head, geo('gcrowng', () => new T.OctahedronGeometry(.022)), g.gem, [0, .31, .1], { emissive: g.gem, ei: .8, slot: 'helm', ol: false }); }
      else helm(g.c, g.c2, { cheek: g.tier >= 2, tassel: s === 'tassel' ? g.gem : null, plume: s === 'plume' || s === 'phoenix' ? g.gem : null, wing: s === 'wing' || s === 'phoenix' ? g.c2 : null, horn: s === 'horn' ? g.c2 : null, crest: g.tier >= 3 ? g.c2 : null, spike: s === 'plain' });
      break; }
    case 'guan': add(head, geo('ghood2', () => new T.SphereGeometry(.158, 24, 12, 0, Math.PI * 2, 0, Math.PI * .47)), L.body, [0, .165, -.02], { r: [-.25, 0, 0], slot: 'helm' });
      add(head, geo('hoodflap2', () => new T.BoxGeometry(.2, .18, .025)), L.body, [0, .06, -.13], { r: [.25, 0, 0], slot: 'helm' }); add(head, geo('ghoodk', () => new T.SphereGeometry(.035, 10, 8)), L.sub, [0, .3, -.06], { slot: 'helm' }); break;
    case 'zhang': band(L.sub); break;
    case 'zhao': helm('#e8eef6', '#c8d8f0', { cheek: true, plume: '#d83a3a', crest: '#d8b050' }); break;
    case 'huang': helm('#c8963a', '#f0d27a', { cheek: true, tassel: '#d83a3a', spike: true }); break;
    case 'ma': helm('#e8e8f0', '#e0c040', { cheek: true, plume: '#ffffff', mask: '#e0c040' }); break;
    case 'wei': helm('#3a2a2a', '#8a1a1a', { cheek: true, horn: '#e8d8b0' }); break;
    case 'lubu': helm('#d4a640', '#ffe08a', { cheek: true, crest: '#ffe08a' }); for (const sx of [1, -1]) add(head, geo('feather2' + sx, () => new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(.05 * sx, .3, .05), new T.Vector3(.13 * sx, .6, .08), new T.Vector3(.3 * sx, .86, -.12), new T.Vector3(.55 * sx, .92, -.45)]), 24, .014, 6)), '#e03a2a', [0, 0, 0], { ot: .008 }); break;
    case 'helm2': helm(L.helmc || '#8a90a0', L.metal || '#d8b050', { cheek: true, plume: L.cape || '#c83a2a', spike: true }); break;
    case 'helm': add(head, geo('shelm', () => new T.ConeGeometry(.165, .14, 18, 1, true)), L.helmc || '#6a7080', [0, .28, -.01], { side: T.DoubleSide, slot: 'helm' }); add(head, geo('shelmr', () => { const q = new T.TorusGeometry(.158, .014, 6, 24); q.rotateX(Math.PI / 2); return q; }), shade(L.helmc || '#6a7080', -.1), [0, .215, -.01], { ol: false }); break;
    case 'zhuge': add(head, geo('scap2', () => new T.CylinderGeometry(.075, .1, .13, 14)), '#1e1e2a', [0, .31, -.02]); for (const sx of [1, -1]) add(head, geo('ribbon2', () => new T.BoxGeometry(.025, .26, .008)), '#1e1e2a', [.035 * sx, .17, -.16], { r: [.35, 0, 0], ol: false }); break;
    case 'diao': add(head, geo('bun2', () => new T.SphereGeometry(.055, 14, 10)), ht, [0, .3, -.07]); for (const sx of [1, -1]) add(head, geo('hairpin2', () => new T.CylinderGeometry(.006, .006, .22, 6)), '#ffd86a', [.05 * sx, .31, -.05], { r: [0, 0, 1.2 * sx], emissive: '#ffd86a', ei: .3, ol: false });
      add(head, geo('flower2', () => new T.SphereGeometry(.03, 8, 6)), '#ff8ad0', [.1, .27, .02], { emissive: '#ff8ad0', ei: .3, ol: false }); break;
    case 'gan': band('#8a1a1a'); for (const sx of [1, -1]) add(head, geo('gfeather2', () => { const q = new T.ConeGeometry(.022, .28, 6); q.translate(0, .14, 0); return q; }), '#f0d060', [.07 * sx, .24, -.05], { r: [-.6, 0, -.3 * sx], ol: false }); break;
    case 'sun': add(head, geo('ribbonS2', () => new T.TorusGeometry(.04, .014, 6, 12)), '#f0d060', [0, .26, -.11]); break;
    case 'scarf': band(L.body); add(head, geo('knot2', () => new T.SphereGeometry(.035, 8, 6)), L.body, [0, .22, -.14]); break;
    case 'taoist': add(head, geo('taoist2', () => new T.ConeGeometry(.155, .33, 16)), L.sub || L.body, [0, .35, -.01], { r: [-.12, 0, 0] }); break;
    case 'crown': add(head, geo('ccap2', () => new T.CylinderGeometry(.09, .12, .12, 14)), '#151320', [0, .29, -.01]); add(head, geo('cboard2', () => new T.BoxGeometry(.28, .02, .18)), '#151320', [0, .36, 0]);
      for (let k = -2; k <= 2; k++) add(head, geo('bead2', () => new T.CylinderGeometry(.004, .004, .08, 4)), '#e8c060', [k * .05, .32, .1], { ol: false, emissive: '#e8c060', ei: .4 }); break;
  }
  if (G0 && G0.keepHat) add(head, geo('helmrim3', () => { const q = new T.TorusGeometry(.149, .012, 8, 32); q.rotateX(Math.PI / 2); return q; }), G0.c2, [0, .2, -.01], { r: [-.22, 0, 0], emissive: G0.c2, ei: .4, slot: 'helm', ol: false });
  /* 팔 */
  const arms = [], GL = gear.gloves, sleeve = bare ? tm(0, skinTex(L.skin, false)) : tm(0, clothTex(L.sleeve || L.body, L.sub, true, 0));
  for (const sx of [-1, 1]) {
    const sh = new T.Group(); sh.position.set(.245 * sx * bulk, .54, 0); torso.add(sh);
    add(sh, geo('uarm2', () => new T.CapsuleGeometry(.058, .2, 4, 12)), sleeve, [0, -.14, 0], { s: [bulk, 1, bulk] });
    if (armor === 'plate') { const lt = lamellarTex(armC, armT, lamStyle);
      add(sh, geo('paul1', () => new T.SphereGeometry(.105, 16, 10, 0, Math.PI * 2, 0, Math.PI * .55)), tm(0, lt), [.02 * sx, .02, 0], { s: [1.35 * bulk, .8, 1.25 * bulk], slot: 'armor', ot: .01 });
      add(sh, geo('paul2', () => new T.CylinderGeometry(.1, .13, .1, 16, 1, true)), tm(0, lt, { side: T.DoubleSide }), [.035 * sx, -.07, 0], { r: [0, 0, -.25 * sx], s: [bulk, 1, bulk], slot: 'armor', ot: .008 });
      add(sh, geo('paulrim', () => { const q = new T.TorusGeometry(.124, .01, 6, 22); q.rotateX(Math.PI / 2); return q; }), armT, [.035 * sx, -.12, 0], { r: [0, 0, -.25 * sx], s: [bulk, 1, bulk], ol: false, slot: 'armor' });
      if (A && A.tier >= 3) add(sh, geo('paulhead', () => new T.SphereGeometry(.05, 12, 8)), tm(0, emblemTex(armT, 'beast')), [.12 * sx, -.02, .02], { r: [0, sx * 1.2, 0], s: [1, 1, .5], slot: 'armor', ot: .006 }); }
    const el = new T.Group(); el.position.y = -.3; el.rotation.x = -.18; sh.add(el);
    add(el, geo('farm2', () => new T.CapsuleGeometry(.05, .18, 4, 12)), sleeve, [0, -.12, 0], { s: [bulk, 1, bulk] });
    add(el, geo('bracer2', () => new T.CylinderGeometry(.062, .055, .15, 14)), GL ? GL.c : (armor === 'plate' ? armT : shade(L.boots || '#3a2a20', .05)), [0, -.15, 0], { s: [bulk, 1, bulk], slot: 'gloves', ot: .008 });
    if (GL && GL.style === 'spike') for (let k = 0; k < 3; k++) add(el, geo('bspk', () => new T.ConeGeometry(.012, .05, 5)), GL.c2, [.055 * sx * bulk, -.1 - k * .04, 0], { r: [0, 0, -1.5 * sx], ol: false, slot: 'gloves' });
    const hand = new T.Group(); hand.position.set(0, -.29, 0); el.add(hand);
    add(hand, geo('hand2', () => new T.SphereGeometry(.048, 12, 10)), GL ? GL.c2 : L.skin, [0, 0, 0], { s: [.9, 1.1, .8], slot: GL ? 'gloves' : undefined });
    arms.push({ sh, hand, el });
  }
  /* 망토 */
  let cape = null; const CP = gear.cape, capeC = CP ? CP.c : L.cape;
  if (capeC) { cape = new T.Group(); cape.position.set(0, .55, -.15 * bulk); torso.add(cape);
    const pat = CP ? clothTex(CP.c, CP.trim, true, CP.pattern) : clothTex(L.cape, shade(L.cape, -.2), true, 0);
    add(cape, geo('cape2', () => { const g = new T.PlaneGeometry(.46, 1.05, 4, 8); g.translate(0, -.52, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.abs(x) * .25 + Math.sin(x * 14) * .015 * -y); p.setX(i, x * (1 + -y * .35)); } g.computeVertexNormals(); return g; }), tm(0, pat, { side: T.DoubleSide }), [0, 0, 0], { ol: false, slot: 'cape' });
    if (CP && CP.emb) add(cape, geo('capeemb', () => new T.CircleGeometry(.1, 20)), tm(0, emblemTex(CP.trim, 'dragon'), { side: T.DoubleSide }), [0, -.3, -.04], { r: [0, Math.PI, 0], ol: false, slot: 'cape' }); }
  /* 무기 */
  const W0 = gear.weapon, wl = W0 ? { ...L, metal: W0.metal || L.metal } : L;
  const wgrip = new T.Group(); arms[0].hand.add(wgrip); wgrip.userData.slot = 'weapon';
  const wt = L.weapon || 'none', n0 = meshes.length;
  buildWeapon(wgrip, wt, wl, (...a) => { const m = add(...a); m.userData.slot = 'weapon'; return m; }, W0 && W0.glow ? W0.glow : elem);
  let lgrip = null;
  if (L.dual && wt !== 'bow') { lgrip = new T.Group(); arms[1].hand.add(lgrip); buildWeapon(lgrip, wt, wl, (...a) => { const m = add(...a); m.userData.slot = 'weapon'; return m; }, W0 && W0.glow ? W0.glow : elem); }
  if (wt === 'bow') { add(arms[1].hand, bowGeo(), '#6a4426', [0, 0, 0], { ot: .01, slot: 'weapon' }); add(arms[1].hand, bowStringGeo(), '#f0f0e0', [0, 0, 0], { ol: false }); }
  if (L.backBow) { const bg = new T.Group(); bg.position.set(0, .36, -.18); bg.rotation.set(.1, 0, .6); torso.add(bg); add(bg, bowGeo(), '#6a4426', [0, -.45, 0], { r: [Math.PI / 2, 0, 0], ot: .01, s: [.85, .85, .85] }); }
  let shield = null;
  if (L.shield) { shield = add(arms[1].el, geo('shield2', () => new T.CylinderGeometry(.3, .3, .05, 24)), tm(0, emblemTex(L.shieldc || '#8a6a2a', 'beast')), [.04, -.14, .12], { r: [Math.PI / 2, 0, 0] }); }
  /* 강화 · 등급 광채: 무기 날에 자체 발광 */
  if (W0 && W0.enh >= 5) for (let i = n0; i < meshes.length; i++) { const m = meshes[i]; if (m.userData.slot === 'weapon' && m.material.emissive) { m.material = toon('#' + m.material.color.getHexString(), { emissive: W0.glow, ei: W0.enh >= 10 ? 1.4 : W0.enh >= 7 ? 1 : .6 }); m.userData.mat = m.material; } }
  return { root, rig: { body, hips, torso, head, legL: legs[0], legR: legs[1], kneeL: knees[0], kneeR: knees[1], armR: arms[0], armL: arms[1], wgrip, lgrip, cape, shield, hipBase: HIP }, meshes, flags };
}
/* ---------- 장비 → 외형 ---------- */
const GRADE_TONE = { normal: ['#8a8478', '#c8c0b0'], rare: ['#4a6a9a', '#a8c8f0'], epic: ['#6a3a8a', '#e0b050'], set: ['#3a7a4a', '#e0c060'], excl: ['#a8541a', '#ffd070'], myth: ['#9a1a1a', '#ffd84a'] };
function gearLook(P, baseLook) {
  const R = P.rpg, eq = R.eq, g = {}, h = HEROES[P.hero];
  const ok = it => it && it.rq <= P.lvl && (!it.h || it.h === h.id);
  const sd = it => hash32(it.id + '|' + it.n + '|' + (it.u || ''));
  const tone = it => GRADE_TONE[it.g] || GRADE_TONE.normal, rk = it => GRADES[it.g].rank;
  const tint = (it, base) => rk(it) === 0 ? shade(base, -.1) : mixC(base, tone(it)[0], .55);
  const gems = ['#ff5a5a', '#5ab8ff', '#70f090', '#ffd84a', '#c878ff', '#ffffff'];
  if (ok(eq.helm)) { const it = eq.helm, s = sd(it), r = rk(it);
    const styles = ['hood', 'plain', 'tassel', 'wing', 'horn', 'plume', 'phoenix'];
    g.helm = { style: it.g === 'myth' ? 'crown' : r === 0 ? pick2(['hood', 'plain', 'tassel'], s) : styles[1 + (s % 6)], c: r === 0 ? '#7a746a' : tint(it, '#8a90a0'), c2: tone(it)[1], gem: gems[s % gems.length], tier: r, keepHat: it.g === 'excl' }; }
  if (ok(eq.armor)) { const it = eq.armor, s = sd(it), r = rk(it); g.armor = { style: ['scale', 'fish', 'plate', 'chain'][s % 4], c: r === 0 ? mixC(baseLook.body, '#6a6458', .5) : mixC(baseLook.body, tone(it)[0], .45), trim: tone(it)[1], tier: r, emb: r >= 2 ? (r >= 4 ? 'dragon' : 'beast') : null, embC: tone(it)[1] }; }
  if (ok(eq.gloves)) { const it = eq.gloves, s = sd(it); g.gloves = { style: ['plain', 'spike', 'scale'][s % 3], c: tint(it, '#5a4a3a'), c2: rk(it) >= 2 ? tone(it)[1] : '#3a2a20' }; }
  if (ok(eq.boots)) { const it = eq.boots, s = sd(it); g.boots = { style: ['plain', 'wing', 'iron'][s % 3], c: tint(it, '#3a2a20'), c2: rk(it) >= 1 ? tone(it)[1] : '#8a8a90' }; }
  if (ok(eq.belt)) { const it = eq.belt, s = sd(it); g.belt = { style: ['beast', 'jade', 'tassel'][s % 3], c: tint(it, '#4a3020'), bc: rk(it) >= 2 ? tone(it)[1] : ['#c8a040', '#70c090', '#d8c070'][s % 3] }; }
  if (ok(eq.cape)) { const it = eq.cape, s = sd(it), r = rk(it); g.cape = { c: mixC(baseLook.cape || baseLook.body, tone(it)[0], r ? .6 : .2), trim: tone(it)[1], pattern: s % 4, emb: r >= 4 }; }
  if (ok(eq.neck)) { const it = eq.neck, s = sd(it); g.neck = { c: rk(it) >= 2 ? tone(it)[1] : gems[s % gems.length] }; }
  if (ok(eq.weapon)) { const it = eq.weapon, r = rk(it), e = it.e || 0; g.weapon = { metal: r >= 2 ? mixC('#dfe6ee', tone(it)[1], .45) : '#dfe6ee', glow: r >= 2 ? tone(it)[1] : null, enh: e, rank: r }; }
  const e = Object.values(eq).filter(Boolean), avg = e.length ? e.filter(x => x.s !== 'weapon').reduce((a, x) => a + (x.e || 0), 0) / Math.max(1, e.filter(x => x.s !== 'weapon').length) : 0;
  g.aura = avg; return g;
}
function pick2(a, s) { return a[s % a.length]; }
