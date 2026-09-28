'use strict';
/* ===== 아이템 일러스트 아이콘 (캔버스 벡터 페인팅) =====
   장비는 부위 · 무기 유형 · 등급 · 고유 시드 · 강화 수치에 따라 모양과 색이 달라진다. 모든 결과는 dataURL 로 캐시. */
const ICON_CACHE = new Map();
let IC_S = 128;
function icCanvas(paint) { const c = document.createElement('canvas'); c.width = c.height = IC_S; const x = c.getContext('2d'); x.scale(IC_S / 64, IC_S / 64); x.lineJoin = 'round'; x.lineCap = 'round'; paint(x); return c.toDataURL(); }
const OL = '#17121d';
function metalGrad(x, x0, y0, x1, y1, c) { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, shade(c, .28)); g.addColorStop(.45, c); g.addColorStop(.55, shade(c, -.18)); g.addColorStop(1, shade(c, .08)); return g; }
function fillStroke(x, fill, lw = 1.6) { x.fillStyle = fill; x.fill(); x.strokeStyle = OL; x.lineWidth = lw; x.stroke(); }
function glowDot(x, px, py, r, c, a = .9) { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = a; x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); x.globalAlpha = 1; }
function gemAt(x, px, py, r, c) { x.beginPath(); x.moveTo(px, py - r); x.lineTo(px + r, py); x.lineTo(px, py + r); x.lineTo(px - r, py); x.closePath(); const g = x.createLinearGradient(px - r, py - r, px + r, py + r); g.addColorStop(0, shade(c, .35)); g.addColorStop(1, shade(c, -.2)); fillStroke(x, g, 1.1); x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(px - r * .3, py - r * .35, r * .25, 0, 7); x.fill(); }
function tassel(x, px, py, c, len = 10) { x.strokeStyle = shade(c, -.2); x.lineWidth = 1; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + i * 1.5, py + len * .6, px + i * 2.2, py + len); x.stroke(); } x.fillStyle = c; x.beginPath(); x.arc(px, py, 2.2, 0, 7); x.fill(); }
/* ---------- 무기 ---------- */
function paintWeapon(x, kind, o) {
  const m = o.metal, wood = o.wood, gem = o.gem;
  x.save(); x.translate(32, 32); x.rotate(-Math.PI / 4);
  const shaft = (y0, y1, w = 2.2) => { x.beginPath(); x.rect(-w, y0, w * 2, y1 - y0); fillStroke(x, metalGrad(x, -w, 0, w, 0, wood), 1.3); for (let y = y0 + 3; y < y1 - 2; y += 5) { x.strokeStyle = shade(wood, -.25); x.lineWidth = .8; x.beginPath(); x.moveTo(-w, y); x.lineTo(w, y + 2); x.stroke(); } };
  const edgeGlow = () => { if (o.glow) { x.save(); x.globalCompositeOperation = 'lighter'; x.shadowColor = o.glow; x.shadowBlur = 8; x.strokeStyle = o.glow; x.globalAlpha = .75; x.lineWidth = 1.4; x.stroke(); x.restore(); } };
  switch (kind) {
    case 'sword': { const L = 34 + o.v * 4; x.beginPath(); x.moveTo(0, -L); x.lineTo(3.6, -L + 6); x.lineTo(3.2, 4); x.lineTo(-3.2, 4); x.lineTo(-3.6, -L + 6); x.closePath(); fillStroke(x, metalGrad(x, -4, 0, 4, 0, m)); edgeGlow();
      x.strokeStyle = shade(m, -.3); x.lineWidth = .8; x.beginPath(); x.moveTo(0, -L + 3); x.lineTo(0, 2); x.stroke();
      x.beginPath(); x.moveTo(-9, 4); x.quadraticCurveTo(0, 8, 9, 4); x.lineTo(9, 7.5); x.quadraticCurveTo(0, 11, -9, 7.5); x.closePath(); fillStroke(x, metalGrad(x, -9, 0, 9, 0, '#d8b050'), 1.2); gemAt(x, 0, 6.5, 2.4, gem);
      x.beginPath(); x.rect(-2, 8, 4, 12); fillStroke(x, '#3a2418', 1.1); x.beginPath(); x.arc(0, 21.5, 3, 0, 7); fillStroke(x, '#d8b050', 1.1); tassel(x, 0, 23, o.tas, 9); break; }
    case 'dao': { const L = 32 + o.v * 3; x.beginPath(); x.moveTo(-3, 4); x.lineTo(-3.5, -L * .7); x.quadraticCurveTo(-2, -L - 2, 5, -L); x.quadraticCurveTo(7, -L * .5, 4.5, 4); x.closePath(); fillStroke(x, metalGrad(x, -4, 0, 6, 0, m)); edgeGlow();
      x.strokeStyle = shade(m, -.25); x.lineWidth = .8; x.beginPath(); x.moveTo(-1.5, 2); x.lineTo(-2, -L * .75); x.stroke();
      x.beginPath(); x.ellipse(.5, 5.5, 8, 3, 0, 0, 7); fillStroke(x, metalGrad(x, -8, 0, 8, 0, '#c8a040'), 1.2); x.beginPath(); x.rect(-2, 8, 4, 13); fillStroke(x, '#5a1a14', 1.1); x.fillStyle = '#d8b050'; for (let y = 10; y < 21; y += 3) x.fillRect(-2, y, 4, 1); tassel(x, 0, 22, o.tas, 10); break; }
    case 'spear': case 'snake': { shaft(-14, 30, 1.9); x.beginPath(); if (kind === 'snake') { x.moveTo(0, -14); for (let i = 0; i <= 8; i++) x.lineTo((i % 2 ? 3.5 : -3.5), -14 - i * 2.6); x.lineTo(0, -40); for (let i = 8; i >= 0; i--) x.lineTo((i % 2 ? 1 : -6) * .6, -14 - i * 2.6); } else { x.moveTo(0, -42); x.quadraticCurveTo(6, -30, 3, -16); x.lineTo(-3, -16); x.quadraticCurveTo(-6, -30, 0, -42); }
      x.closePath(); fillStroke(x, metalGrad(x, -5, 0, 5, 0, m)); edgeGlow(); x.beginPath(); x.rect(-3.2, -17, 6.4, 3.5); fillStroke(x, '#d8b050', 1); tassel(x, 0, -13, o.tas, 9); break; }
    case 'halberd': case 'glaive': { shaft(-12, 31, 2); if (kind === 'halberd') { x.beginPath(); x.moveTo(0, -40); x.lineTo(3, -24); x.lineTo(-3, -24); x.closePath(); fillStroke(x, metalGrad(x, -3, 0, 3, 0, m)); }
      for (const s of kind === 'halberd' ? [-1, 1] : [1]) { x.beginPath(); x.moveTo(0, -24); x.quadraticCurveTo(s * 17, -30, s * 14, -12); x.quadraticCurveTo(s * 8, -18, 0, -13); x.closePath(); fillStroke(x, metalGrad(x, 0, -30, s * 16, -12, kind === 'glaive' ? m : '#e0b858')); edgeGlow(); }
      if (kind === 'glaive') { x.beginPath(); x.moveTo(0, -24); x.lineTo(-2, -34); x.lineTo(2, -24); fillStroke(x, m, 1); gemAt(x, 0, -14, 2.4, '#3ad08a'); } break; }
    case 'axe': { shaft(-10, 28, 2.3); x.beginPath(); x.moveTo(1, -16); x.quadraticCurveTo(20, -26, 19, -8); x.quadraticCurveTo(18, 4, 1, -2); x.closePath(); fillStroke(x, metalGrad(x, 0, -20, 20, 0, m)); edgeGlow();
      x.beginPath(); x.moveTo(-1, -12); x.lineTo(-8, -9); x.lineTo(-1, -5); fillStroke(x, m, 1.1); x.beginPath(); x.arc(0, -13, 3, 0, 7); fillStroke(x, '#d8b050', 1); break; }
    case 'mace': { shaft(-2, 28, 2.2); x.beginPath(); x.ellipse(0, -14, 6.5, 14, 0, 0, 7); fillStroke(x, metalGrad(x, -6, 0, 6, 0, '#5a5a66')); x.fillStyle = '#d8b050'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc((i % 2 ? 4 : -4), -24 + i * 3, 1.4, 0, 7); x.fill(); } break; }
    case 'staff': { shaft(-20, 30, 2); x.beginPath(); x.arc(0, -26, 7, 0, 7); x.strokeStyle = OL; x.lineWidth = 4; x.stroke(); x.strokeStyle = '#e0b858'; x.lineWidth = 2.4; x.stroke(); glowDot(x, 0, -26, 9, '#fff2a0'); x.beginPath(); x.arc(0, -26, 3.2, 0, 7); fillStroke(x, '#fff2a0', 1); break; }
    case 'whip': { x.restore(); x.save(); x.translate(32, 32); x.beginPath(); x.rect(-18, 14, 5, 12); fillStroke(x, '#3a2418', 1.1); let px = -15, py = 14; for (let i = 0; i < 14; i++) { const a = i * .55, r = 16 - i * .6, nx = Math.cos(a - 1.4) * r + 2, ny = Math.sin(a - 1.4) * r - 2; x.beginPath(); x.ellipse(nx, ny, 3, 2, a, 0, 7); fillStroke(x, metalGrad(x, nx - 3, ny, nx + 3, ny, m), 1); px = nx; py = ny; }
      x.beginPath(); x.arc(px, py - 3, 3.2, 0, 7); fillStroke(x, '#e8c860', 1.1); glowDot(x, px, py - 3, 6, '#ffe070', .6); break; }
    case 'bow': { x.restore(); x.save(); x.translate(32, 32); x.beginPath(); x.moveTo(-6, -26); x.quadraticCurveTo(22, 0, -6, 26); x.strokeStyle = OL; x.lineWidth = 6; x.stroke(); x.strokeStyle = o.wood; x.lineWidth = 3.6; x.stroke(); x.strokeStyle = '#d8b050'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(2, -4); x.lineTo(2.5, 4); x.stroke();
      x.strokeStyle = '#eee8d8'; x.lineWidth = .9; x.beginPath(); x.moveTo(-6, -26); x.lineTo(-6, 26); x.stroke(); x.beginPath(); x.moveTo(-18, 0); x.lineTo(20, 0); x.strokeStyle = OL; x.lineWidth = 2.6; x.stroke(); x.strokeStyle = '#a07a50'; x.lineWidth = 1.4; x.stroke();
      x.beginPath(); x.moveTo(24, 0); x.lineTo(18, -3); x.lineTo(18, 3); x.closePath(); fillStroke(x, m, 1); x.fillStyle = '#f0e8e0'; x.beginPath(); x.moveTo(-18, 0); x.lineTo(-13, -3); x.lineTo(-11, 0); x.lineTo(-13, 3); x.fill(); if (o.glow) glowDot(x, 21, 0, 7, o.glow, .8); break; }
    case 'fan': { x.restore(); x.save(); x.translate(32, 36); x.beginPath(); x.moveTo(0, 6); x.arc(0, 6, 26, -Math.PI * .92, -Math.PI * .08); x.closePath(); const g = x.createRadialGradient(0, 6, 4, 0, 6, 26); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, o.glow ? mixC('#f4f0e4', o.glow, .35) : '#e8e2d2'); fillStroke(x, g);
      x.strokeStyle = 'rgba(80,70,60,.45)'; x.lineWidth = .8; for (let i = 0; i <= 10; i++) { const a = -Math.PI * .92 + i * Math.PI * .084; x.beginPath(); x.moveTo(0, 6); x.lineTo(Math.cos(a) * 25, 6 + Math.sin(a) * 25); x.stroke(); }
      x.beginPath(); x.arc(0, 6, 9, -Math.PI * .92, -Math.PI * .08); x.strokeStyle = '#5b4a9e'; x.lineWidth = 2; x.stroke(); x.beginPath(); x.rect(-2.2, 6, 4.4, 16); fillStroke(x, '#5a3a24', 1.1); tassel(x, 0, 22, o.tas, 7); break; }
    default: x.beginPath(); x.rect(-3, -30, 6, 50); fillStroke(x, m);
  }
  x.restore();
}
/* ---------- 방어구 · 장신구 ---------- */
function lamRows(x, x0, y0, w, h, c, rows = 5) { for (let r = 0; r < rows; r++) for (let q = 0; q < Math.ceil(w / 5) + 1; q++) { const px = x0 + q * 5 + (r % 2 ? 2.5 : 0), py = y0 + r * (h / rows); if (px > x0 + w) continue; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 4.4, py); x.lineTo(px + 4.4, py + h / rows * .8); x.quadraticCurveTo(px + 2.2, py + h / rows * 1.2, px, py + h / rows * .8); x.closePath(); x.fillStyle = r % 2 ? shade(c, .06) : shade(c, -.04); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = .5; x.stroke(); } }
function paintArmor(x, o) {
  x.beginPath(); x.moveTo(20, 12); x.quadraticCurveTo(32, 16, 44, 12); x.lineTo(50, 22); x.lineTo(46, 50); x.quadraticCurveTo(32, 56, 18, 50); x.lineTo(14, 22); x.closePath(); fillStroke(x, o.c, 2);
  x.save(); x.clip(); lamRows(x, 14, 22, 36, 30, o.c, 6); x.restore();
  for (const s of [-1, 1]) { x.beginPath(); x.ellipse(32 + s * 17, 17, 9, 6, s * .3, 0, 7); fillStroke(x, metalGrad(x, 32 + s * 8, 10, 32 + s * 26, 22, o.c)); x.beginPath(); x.ellipse(32 + s * 18, 22, 8, 4, s * .3, 0, Math.PI); x.strokeStyle = o.trim; x.lineWidth = 1.4; x.stroke(); }
  x.beginPath(); x.moveTo(26, 12); x.lineTo(32, 20); x.lineTo(38, 12); x.strokeStyle = o.trim; x.lineWidth = 2; x.stroke();
  x.beginPath(); x.arc(32, 30, 6.5, 0, 7); fillStroke(x, metalGrad(x, 26, 24, 38, 36, o.trim), 1.3); if (o.emb) { x.strokeStyle = shade(o.trim, -.4); x.lineWidth = 1; x.beginPath(); x.arc(32, 30, 3.5, 0, 5.5); x.stroke(); }
  x.beginPath(); x.rect(17, 42, 30, 4); fillStroke(x, shade(o.trim, -.2), 1.2); gemAt(x, 32, 44, 2.6, o.gem);
}
function paintHelm(x, o) {
  x.beginPath(); x.arc(32, 36, 17, Math.PI, 0); x.lineTo(49, 44); x.quadraticCurveTo(32, 40, 15, 44); x.closePath(); fillStroke(x, metalGrad(x, 15, 20, 49, 44, o.c), 2);
  if (o.style !== 'hood') { x.beginPath(); x.moveTo(15, 44); x.quadraticCurveTo(32, 38, 49, 44); x.strokeStyle = o.c2; x.lineWidth = 2.4; x.stroke(); for (const s of [-1, 1]) { x.beginPath(); x.moveTo(32 + s * 15, 43); x.lineTo(32 + s * 16, 52); x.lineTo(32 + s * 10, 50); x.closePath(); fillStroke(x, o.c, 1.3); } }
  x.beginPath(); x.moveTo(32, 19); x.lineTo(32, 42); x.strokeStyle = shade(o.c2, -.1); x.lineWidth = 1.6; x.stroke();
  switch (o.style) {
    case 'hood': x.beginPath(); x.arc(32, 16, 4, 0, 7); fillStroke(x, o.c2, 1.2); x.beginPath(); x.moveTo(46, 36); x.quadraticCurveTo(56, 46, 52, 56); x.lineTo(46, 50); x.closePath(); fillStroke(x, o.c, 1.4); break;
    case 'tassel': tassel(x, 32, 16, o.gem, 12); x.beginPath(); x.rect(30.5, 13, 3, 7); fillStroke(x, o.c2, 1); break;
    case 'plume': case 'phoenix': x.beginPath(); x.moveTo(32, 20); x.quadraticCurveTo(26, 4, 46, 2); x.quadraticCurveTo(38, 10, 34, 20); fillStroke(x, o.gem, 1.3); if (o.style === 'phoenix') for (const s of [-1, 1]) { x.beginPath(); x.moveTo(32 + s * 14, 28); x.quadraticCurveTo(32 + s * 30, 16, 32 + s * 28, 6); x.quadraticCurveTo(32 + s * 22, 20, 32 + s * 16, 32); fillStroke(x, o.c2, 1.2); } break;
    case 'wing': for (const s of [-1, 1]) { x.beginPath(); x.moveTo(32 + s * 15, 30); x.quadraticCurveTo(32 + s * 28, 20, 32 + s * 26, 8); x.lineTo(32 + s * 20, 22); x.lineTo(32 + s * 16, 26); fillStroke(x, o.c2, 1.2); } break;
    case 'horn': for (const s of [-1, 1]) { x.beginPath(); x.moveTo(32 + s * 10, 23); x.quadraticCurveTo(32 + s * 22, 16, 32 + s * 24, 4); x.quadraticCurveTo(32 + s * 16, 14, 32 + s * 6, 21); fillStroke(x, '#e8dcc0', 1.2); } break;
    case 'crown': x.beginPath(); x.moveTo(18, 28); for (let i = 0; i <= 4; i++) { x.lineTo(18 + i * 7, i % 2 ? 22 : 12); } x.lineTo(46, 28); x.closePath(); fillStroke(x, metalGrad(x, 18, 12, 46, 28, '#f0c850'), 1.4); gemAt(x, 32, 19, 3, o.gem); break;
    default: x.beginPath(); x.moveTo(32, 8); x.lineTo(34.5, 20); x.lineTo(29.5, 20); x.closePath(); fillStroke(x, o.c2, 1.2);
  }
}
function paintGloves(x, o) { x.save(); x.translate(32, 32); x.rotate(-.35); x.beginPath(); x.moveTo(-9, -20); x.lineTo(9, -20); x.lineTo(11, 6); x.lineTo(-11, 6); x.closePath(); fillStroke(x, metalGrad(x, -10, 0, 10, 0, o.c), 1.8);
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-10, -15 + i * 5.5); x.lineTo(10, -15 + i * 5.5); x.strokeStyle = o.c2; x.lineWidth = 1; x.stroke(); }
  if (o.style === 'spike') for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-9, -14 + i * 7); x.lineTo(-16, -12 + i * 7); x.lineTo(-9, -10 + i * 7); fillStroke(x, o.c2, 1); }
  x.beginPath(); x.moveTo(-10, 6); x.quadraticCurveTo(-13, 20, -4, 24); x.quadraticCurveTo(8, 25, 11, 14); x.lineTo(11, 6); x.closePath(); fillStroke(x, o.c2 === '#3a2a20' ? '#5a4030' : shade(o.c2, -.1), 1.6); x.restore(); }
function paintBoots(x, o) { x.beginPath(); x.moveTo(22, 8); x.lineTo(38, 8); x.lineTo(38, 40); x.quadraticCurveTo(52, 42, 54, 52); x.lineTo(20, 54); x.lineTo(20, 40); x.closePath(); fillStroke(x, metalGrad(x, 20, 0, 40, 0, o.c), 2);
  x.beginPath(); x.moveTo(21, 12); x.lineTo(39, 12); x.lineTo(38, 34); x.quadraticCurveTo(30, 38, 22, 34); x.closePath(); fillStroke(x, metalGrad(x, 21, 0, 39, 0, o.c2), 1.4);
  if (o.style === 'wing') for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(22, 16 + i * 5); x.lineTo(12 - i * 2, 12 + i * 5); x.lineTo(22, 20 + i * 5); fillStroke(x, '#f4f0e0', 1); }
  x.beginPath(); x.rect(19, 51, 36, 4); fillStroke(x, '#2a1a10', 1.2); }
function paintBelt(x, o) { x.beginPath(); x.moveTo(6, 28); x.quadraticCurveTo(32, 40, 58, 28); x.lineTo(58, 36); x.quadraticCurveTo(32, 48, 6, 36); x.closePath(); fillStroke(x, metalGrad(x, 0, 28, 0, 44, o.c), 1.8);
  for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(10 + i * 9, 33 + Math.sin(i / 5 * Math.PI) * 5, 1.4, 0, 7); x.fillStyle = o.bc; x.fill(); }
  x.beginPath(); x.arc(32, 38, 9, 0, 7); fillStroke(x, metalGrad(x, 23, 29, 41, 47, o.bc), 1.6); x.fillStyle = shade(o.bc, -.4); x.beginPath(); x.ellipse(28.5, 36, 1.8, 1.2, 0, 0, 7); x.ellipse(35.5, 36, 1.8, 1.2, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(28, 41); x.quadraticCurveTo(32, 44, 36, 41); x.strokeStyle = shade(o.bc, -.4); x.lineWidth = 1.2; x.stroke();
  if (o.style === 'tassel') { tassel(x, 24, 44, o.bc, 12); tassel(x, 40, 44, o.bc, 12); } }
function paintCape(x, o) { x.beginPath(); x.moveTo(20, 8); x.quadraticCurveTo(32, 12, 44, 8); x.quadraticCurveTo(52, 30, 56, 56); x.quadraticCurveTo(44, 50, 32, 56); x.quadraticCurveTo(20, 50, 8, 56); x.quadraticCurveTo(12, 30, 20, 8); x.closePath();
  const g = x.createLinearGradient(8, 0, 56, 0); g.addColorStop(0, shade(o.c, -.18)); g.addColorStop(.5, shade(o.c, .1)); g.addColorStop(1, shade(o.c, -.2)); fillStroke(x, g, 2);
  x.save(); x.clip(); if (o.pattern === 1) { x.strokeStyle = shade(o.c, .18); x.lineWidth = 1.4; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(22 + i * 10, 26 + i * 7, 4, 0, 4.5); x.stroke(); } } if (o.pattern === 2) { x.fillStyle = shade(o.c, -.12); for (let i = 0; i < 5; i++) x.fillRect(0, 16 + i * 9, 64, 3); }
    if (o.pattern === 3) { x.fillStyle = 'rgba(20,10,4,.6)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(14 + i * 7, 20 + (i % 3) * 12, 5, 1.5, .5, 0, 7); x.fill(); } }
    x.fillStyle = o.trim; x.fillRect(0, 50, 64, 8); x.restore();
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (const px of [24, 32, 40]) { x.beginPath(); x.moveTo(px, 14); x.quadraticCurveTo(px + 2, 34, px - 1, 52); x.stroke(); }
  x.beginPath(); x.arc(20, 10, 3, 0, 7); x.arc(44, 10, 3, 0, 7); fillStroke(x, '#e0b850', 1.1); if (o.emb) { x.beginPath(); x.arc(32, 30, 6, 0, 7); x.strokeStyle = o.trim; x.lineWidth = 1.6; x.stroke(); } }
function paintNeck(x, o) { x.beginPath(); x.moveTo(12, 10); x.quadraticCurveTo(32, 50, 52, 10); x.strokeStyle = OL; x.lineWidth = 3.6; x.stroke(); x.strokeStyle = '#e8c860'; x.lineWidth = 2; x.setLineDash([2.5, 1.5]); x.stroke(); x.setLineDash([]);
  if (o.kind === 1) { x.beginPath(); x.arc(32, 40, 10, 0, 7); fillStroke(x, metalGrad(x, 22, 30, 42, 50, '#8ad8b0'), 1.6); x.beginPath(); x.arc(32, 40, 3.5, 0, 7); x.fillStyle = shade('#8ad8b0', -.3); x.fill(); }
  else if (o.kind === 2) { x.beginPath(); x.moveTo(26, 32); x.quadraticCurveTo(24, 50, 32, 56); x.quadraticCurveTo(28, 44, 30, 32); fillStroke(x, '#f4ecd8', 1.4); x.beginPath(); x.moveTo(38, 32); x.quadraticCurveTo(40, 50, 32, 56); x.quadraticCurveTo(36, 44, 34, 32); fillStroke(x, '#f4ecd8', 1.4); gemAt(x, 32, 32, 3.5, o.gem); }
  else { glowDot(x, 32, 40, 12, o.gem, .6); gemAt(x, 32, 40, 7, o.gem); } }
function paintRing(x, o) { x.beginPath(); x.ellipse(32, 38, 16, 11, 0, 0, 7); x.strokeStyle = OL; x.lineWidth = 8; x.stroke(); x.strokeStyle = metalGrad(x, 16, 38, 48, 38, o.band); x.lineWidth = 5.4; x.stroke(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(32, 36, 14, 9, 0, Math.PI * 1.1, Math.PI * 1.6); x.stroke();
  x.beginPath(); x.moveTo(26, 26); x.lineTo(38, 26); x.lineTo(35, 31); x.lineTo(29, 31); x.closePath(); fillStroke(x, o.band, 1.2); glowDot(x, 32, 21, 10, o.gem, .55); gemAt(x, 32, 21, 6.5, o.gem); }
function paintBook(x, o) { x.save(); x.translate(32, 32); x.rotate(-.12); x.beginPath(); x.rect(-17, -22, 34, 44); fillStroke(x, metalGrad(x, -17, 0, 17, 0, o.c), 2); x.fillStyle = '#f0e6cc'; x.fillRect(14, -20, 3, 40);
  x.strokeStyle = shade(o.c, -.35); x.lineWidth = 1.2; for (const y of [-14, -4, 6, 16]) { x.beginPath(); x.moveTo(-17, y); x.lineTo(-12, y); x.stroke(); }
  x.beginPath(); x.rect(-7, -16, 14, 26); fillStroke(x, '#f4ecd8', 1.1); x.strokeStyle = '#3a2a20'; x.lineWidth = 1.1; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-4, -12 + i * 5); x.lineTo(4, -12 + i * 5); x.stroke(); }
  if (o.glow) glowDot(x, 0, -3, 14, o.glow, .4); x.restore(); }
/* ---------- 소모품 · 보물 · 재료 ---------- */
const CONS_PAINT = {
  bun: x => { x.beginPath(); x.ellipse(32, 38, 20, 14, 0, 0, 7); const g = x.createRadialGradient(28, 32, 3, 32, 38, 22); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#e8d8b8'); fillStroke(x, g, 2); x.strokeStyle = 'rgba(150,120,80,.6)'; x.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; x.beginPath(); x.moveTo(32, 28); x.quadraticCurveTo(32 + Math.cos(a) * 8, 30 + Math.sin(a) * 4, 32 + Math.cos(a) * 14, 34 + Math.sin(a) * 6); x.stroke(); } x.beginPath(); x.arc(32, 27, 3, 0, 7); fillStroke(x, '#f4e8d0', 1); },
  chicken: x => { x.beginPath(); x.ellipse(28, 36, 18, 14, -.3, 0, 7); const g = x.createRadialGradient(22, 30, 3, 28, 36, 20); g.addColorStop(0, '#f0a060'); g.addColorStop(1, '#a0501e'); fillStroke(x, g, 2); for (const [a, b] of [[40, 22], [44, 30]]) { x.beginPath(); x.moveTo(a - 4, b + 6); x.lineTo(a + 10, b - 6); x.strokeStyle = OL; x.lineWidth = 5; x.stroke(); x.strokeStyle = '#fff6e8'; x.lineWidth = 3; x.stroke(); x.beginPath(); x.arc(a + 11, b - 7, 3, 0, 7); fillStroke(x, '#fff6e8', 1.1); } x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(22, 30, 5, 3, -.4, 0, 7); x.fill(); },
  gold: x => { x.beginPath(); x.moveTo(8, 34); x.quadraticCurveTo(16, 44, 32, 46); x.quadraticCurveTo(48, 44, 56, 34); x.quadraticCurveTo(48, 36, 44, 30); x.quadraticCurveTo(32, 14, 20, 30); x.quadraticCurveTo(16, 36, 8, 34); fillStroke(x, metalGrad(x, 8, 20, 56, 46, '#f0c040'), 2); glowDot(x, 30, 26, 8, '#fff6c0', .7); },
  silver: x => { x.beginPath(); x.moveTo(8, 34); x.quadraticCurveTo(16, 44, 32, 46); x.quadraticCurveTo(48, 44, 56, 34); x.quadraticCurveTo(48, 36, 44, 30); x.quadraticCurveTo(32, 14, 20, 30); x.quadraticCurveTo(16, 36, 8, 34); fillStroke(x, metalGrad(x, 8, 20, 56, 46, '#d8dce8'), 2); },
  gem: x => { glowDot(x, 32, 32, 26, '#bfe8ff', .8); x.beginPath(); x.arc(32, 32, 13, 0, 7); const g = x.createRadialGradient(27, 26, 1, 32, 32, 14); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#bfe8ff'); g.addColorStop(1, '#5a90c8'); fillStroke(x, g, 1.8); },
  knife: x => { x.save(); x.translate(32, 32); x.rotate(-Math.PI / 4); for (const dx of [-7, 0, 7]) { x.beginPath(); x.moveTo(dx, -24); x.lineTo(dx + 3.4, -6); x.lineTo(dx - 3.4, -6); x.closePath(); fillStroke(x, metalGrad(x, dx - 3, 0, dx + 3, 0, '#dfe6ee'), 1.3); x.beginPath(); x.rect(dx - 1.6, -6, 3.2, 12); fillStroke(x, '#5a1a14', 1); x.beginPath(); x.arc(dx, 8, 2.4, 0, 7); fillStroke(x, '#d8b050', 1); } x.restore(); },
  bomb: x => { x.beginPath(); x.ellipse(30, 38, 16, 17, 0, 0, 7); fillStroke(x, metalGrad(x, 14, 30, 46, 30, '#6a4a2a'), 2); for (const y of [28, 48]) { x.beginPath(); x.ellipse(30, y, 15, 3, 0, 0, Math.PI); x.strokeStyle = '#2a2a2e'; x.lineWidth = 2.4; x.stroke(); } x.beginPath(); x.moveTo(30, 21); x.quadraticCurveTo(36, 10, 46, 12); x.strokeStyle = '#c8a878'; x.lineWidth = 2; x.stroke(); glowDot(x, 46, 12, 9, '#ffb040'); glowDot(x, 46, 12, 4, '#ffffff'); x.fillStyle = '#c83a2a'; x.fillRect(24, 34, 12, 8); },
  wine: x => { x.beginPath(); x.moveTo(24, 14); x.lineTo(40, 14); x.lineTo(38, 20); x.quadraticCurveTo(52, 26, 50, 42); x.quadraticCurveTo(48, 56, 32, 56); x.quadraticCurveTo(16, 56, 14, 42); x.quadraticCurveTo(12, 26, 26, 20); x.closePath(); fillStroke(x, metalGrad(x, 14, 30, 50, 30, '#8a5a3a'), 2); x.beginPath(); x.rect(22, 30, 20, 16); fillStroke(x, '#c83a2a', 1.2); x.fillStyle = '#f0d890'; x.fillRect(29, 33, 6, 10); x.beginPath(); x.ellipse(32, 13, 8, 3, 0, 0, 7); fillStroke(x, '#e8d8b0', 1.2); },
  elixir: x => { x.beginPath(); x.arc(32, 22, 9, 0, 7); x.moveTo(44, 42); x.arc(32, 42, 14, 0, 7); const g = x.createLinearGradient(18, 0, 46, 0); g.addColorStop(0, '#e8c070'); g.addColorStop(1, '#a0702a'); fillStroke(x, g, 2); x.beginPath(); x.rect(29, 8, 6, 6); fillStroke(x, '#8a2a1a', 1.1); x.strokeStyle = '#c83a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(24, 31); x.lineTo(40, 31); x.stroke(); glowDot(x, 32, 42, 10, '#fff0a0', .5); },
  tactic: x => { x.beginPath(); x.rect(12, 18, 40, 28); fillStroke(x, '#f0e2c0', 1.8); for (const px of [12, 52]) { x.beginPath(); x.ellipse(px, 32, 4, 16, 0, 0, 7); fillStroke(x, '#8a4a22', 1.4); } x.strokeStyle = '#3a2a20'; x.lineWidth = 1.2; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(20 + i * 5, 22); x.lineTo(20 + i * 5, 42); x.stroke(); } glowDot(x, 32, 32, 16, '#ff6a4a', .35); },
  haste: x => talisman(x, '#6ab0ff', 'wind'), shield: x => talisman(x, '#ffd24a', 'shield'), tcharm: x => talisman(x, '#c8a8ff', 'bolt'),
  book: x => { paintBook(x, { c: '#c8a020', glow: '#fff2a0' }); }, seal: x => { x.beginPath(); x.rect(16, 30, 32, 22); fillStroke(x, metalGrad(x, 16, 30, 48, 52, '#8ad8b0'), 2); x.beginPath(); x.moveTo(20, 30); x.quadraticCurveTo(22, 12, 32, 12); x.quadraticCurveTo(44, 12, 44, 30); fillStroke(x, metalGrad(x, 20, 12, 44, 30, '#9ae8c0'), 1.8); x.fillStyle = '#c83a2a'; x.fillRect(22, 36, 20, 10); glowDot(x, 32, 22, 14, '#e8fff0', .4); },
  sword: x => paintWeapon(x, 'sword', { metal: '#bfe6ff', wood: '#3a2418', gem: '#5ab8ff', tas: '#2a4a9a', glow: '#bfe6ff', v: 1 }),
  horse: x => { x.beginPath(); x.moveTo(18, 56); x.quadraticCurveTo(14, 34, 26, 22); x.quadraticCurveTo(34, 10, 46, 14); x.lineTo(54, 28); x.quadraticCurveTo(52, 34, 44, 30); x.quadraticCurveTo(38, 40, 40, 56); x.closePath(); fillStroke(x, metalGrad(x, 14, 20, 54, 50, '#b82a1a'), 2); x.fillStyle = '#1a1014'; x.beginPath(); x.moveTo(26, 22); x.quadraticCurveTo(18, 30, 20, 44); x.lineTo(24, 30); x.fill(); x.beginPath(); x.arc(42, 20, 1.8, 0, 7); x.fill(); },
  stone: x => { glowDot(x, 32, 34, 24, '#8ad8ff', .6); x.beginPath(); x.moveTo(32, 8); x.lineTo(46, 26); x.lineTo(40, 52); x.lineTo(24, 52); x.lineTo(18, 26); x.closePath(); const g = x.createLinearGradient(18, 8, 46, 52); g.addColorStop(0, '#e8faff'); g.addColorStop(.5, '#6ac0f0'); g.addColorStop(1, '#2a6aa0'); fillStroke(x, g, 1.8); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(32, 8); x.lineTo(30, 52); x.moveTo(18, 26); x.lineTo(46, 26); x.stroke(); },
  frag: x => { x.beginPath(); x.moveTo(14, 16); x.lineTo(46, 12); x.lineTo(50, 30); x.lineTo(44, 34); x.lineTo(48, 50); x.lineTo(18, 52); x.lineTo(20, 38); x.lineTo(12, 30); x.closePath(); fillStroke(x, '#e8d8b0', 1.8); x.strokeStyle = '#6a3a8a'; x.lineWidth = 1.2; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(20 + i * 5.5, 20); x.lineTo(20 + i * 5.5, 46); x.stroke(); } glowDot(x, 32, 32, 16, '#c878ff', .45); },
  coin: x => { x.beginPath(); x.arc(32, 32, 18, 0, 7); fillStroke(x, metalGrad(x, 14, 14, 50, 50, '#f2c64a'), 2); x.beginPath(); x.rect(27, 27, 10, 10); x.fillStyle = shade('#f2c64a', -.35); x.fill(); x.strokeStyle = shade('#f2c64a', -.3); x.lineWidth = 1.2; x.beginPath(); x.arc(32, 32, 14, 0, 7); x.stroke(); },
};
function talisman(x, c, kind) { x.save(); x.translate(32, 32); x.rotate(.12); x.beginPath(); x.rect(-11, -24, 22, 48); fillStroke(x, '#f4e6a8', 1.8); x.strokeStyle = '#c83a2a'; x.lineWidth = 1.6; x.strokeRect(-8, -21, 16, 42);
  x.strokeStyle = c; x.lineWidth = 2.2; x.beginPath(); if (kind === 'wind') { for (let i = 0; i < 3; i++) { x.moveTo(-6, -12 + i * 10); x.quadraticCurveTo(0, -18 + i * 10, 6, -12 + i * 10); } } else if (kind === 'bolt') { x.moveTo(3, -16); x.lineTo(-4, -2); x.lineTo(3, -2); x.lineTo(-3, 14); } else { x.arc(0, -2, 7, 0, 7); x.moveTo(0, -9); x.lineTo(0, 5); } x.stroke();
  x.restore(); glowDot(x, 32, 30, 16, c, .35); }
/* ---------- 공개 API ---------- */
const WT_ICON = { sword: 'sword', dao: 'dao', spear: 'spear', halberd: 'halberd', axe: 'axe', whip: 'whip', bow: 'bow', fan: 'fan' };
const HERO_WICON = { glaive: 'glaive', snake: 'snake', spear: 'spear', dao: 'dao', fan: 'fan', sword: 'sword', bigdao: 'dao', halberd: 'halberd', axe: 'axe', whip: 'whip', bow: 'bow', staff: 'staff', mace: 'mace' };
function itemIcon(it) {
  const tone = GRADE_TONE[it.g] || GRADE_TONE.normal, rk = GRADES[it.g].rank, s = hash32(it.id + '|' + it.n + '|' + (it.u || '')), e = it.e || 0;
  const key = `it|${it.s}|${it.g}|${s}|${e >= 5 ? 1 : 0}${e >= 10 ? 1 : 0}|${it.wt || ''}`;
  if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  const gems = ['#ff5a5a', '#5ab8ff', '#70f090', '#ffd84a', '#c878ff', '#ffffff'], gem = gems[s % gems.length];
  const url = icCanvas(x => {
    const bg = x.createRadialGradient(32, 32, 4, 32, 32, 34); bg.addColorStop(0, rk >= 1 ? mixC('#20243a', GRADES[it.g].c, .35) : '#262a3a'); bg.addColorStop(1, 'rgba(12,14,28,0)'); x.fillStyle = bg; x.fillRect(0, 0, 64, 64);
    const st = it.s === 'ring1' || it.s === 'ring2' ? 'ring' : it.s;
    if (st === 'weapon') { let kind = WT_ICON[it.wt] || 'sword'; if (it.h) { const h = HEROES.find(q => q.id === it.h); if (h) kind = HERO_WICON[h.look.weapon] || kind; }
      if (it.u && /언월|月/.test(it.n)) kind = 'glaive'; if (it.u && /사모/.test(it.n)) kind = 'snake';
      paintWeapon(x, kind, { metal: rk >= 2 ? mixC('#dfe6ee', tone[1], .4) : ['#dfe6ee', '#cfd8e0', '#e8e0d0'][s % 3], wood: ['#6a3a1a', '#4a2410', '#7a4a22', '#2a2018'][s % 4], gem, tas: ['#d83a3a', '#2a4a9a', '#e0b030', '#2a8a4a'][s % 4], glow: rk >= 2 ? tone[1] : e >= 5 ? '#fff0a0' : null, v: (s >> 3) % 3 }); }
    else if (st === 'armor') paintArmor(x, { c: rk === 0 ? ['#7a6a5a', '#6a6a70', '#5a4a3a'][s % 3] : mixC('#6a6a70', tone[0], .6), trim: tone[1], emb: rk >= 2, gem });
    else if (st === 'helm') { const styles = ['hood', 'plain', 'tassel', 'wing', 'horn', 'plume', 'phoenix']; paintHelm(x, { style: it.g === 'myth' ? 'crown' : rk === 0 ? ['hood', 'plain', 'tassel'][s % 3] : styles[1 + (s % 6)], c: rk === 0 ? '#7a746a' : mixC('#8a90a0', tone[0], .55), c2: tone[1], gem }); }
    else if (st === 'gloves') paintGloves(x, { style: ['plain', 'spike', 'scale'][s % 3], c: rk === 0 ? '#6a5040' : mixC('#5a4a3a', tone[0], .55), c2: rk >= 2 ? tone[1] : '#3a2a20' });
    else if (st === 'boots') paintBoots(x, { style: ['plain', 'wing', 'iron'][s % 3], c: rk === 0 ? '#5a4030' : mixC('#3a2a20', tone[0], .55), c2: rk >= 1 ? tone[1] : '#8a8a90' });
    else if (st === 'belt') paintBelt(x, { style: ['beast', 'jade', 'tassel'][s % 3], c: rk === 0 ? '#5a3a24' : mixC('#4a3020', tone[0], .5), bc: rk >= 2 ? tone[1] : ['#c8a040', '#70c090', '#d8c070'][s % 3] });
    else if (st === 'cape') paintCape(x, { c: rk === 0 ? ['#8a3a2a', '#3a5a8a', '#4a6a3a'][s % 3] : mixC('#6a4a3a', tone[0], .65), trim: tone[1], pattern: s % 4, emb: rk >= 4 });
    else if (st === 'neck') paintNeck(x, { kind: s % 3, gem: rk >= 2 ? tone[1] : gem });
    else if (st === 'ring') paintRing(x, { band: rk >= 2 ? '#f0c850' : ['#d8b070', '#c8ccd8', '#b87a40'][s % 3], gem: rk >= 2 ? tone[1] : gem });
    else if (st === 'book') paintBook(x, { c: rk === 0 ? '#6a4a2a' : mixC('#5a3a2a', tone[0], .6), glow: rk >= 2 ? tone[1] : null });
    if (e >= 10) { x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) glowDot(x, 10 + (s >> i) % 44, 10 + (s >> (i + 3)) % 44, 5, e >= 13 ? '#c8a8ff' : '#ff9a40', .9); x.globalCompositeOperation = 'source-over'; }
    if (rk >= 4) { x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) glowDot(x, 8 + (s >> (i * 2)) % 48, 8 + (s >> (i * 2 + 5)) % 48, 3.5, '#ffffff', 1); x.globalCompositeOperation = 'source-over'; }
  });
  ICON_CACHE.set(key, url); return url;
}
function slotIcon(sl) {
  const key = 'slot|' + sl; if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  const it = { id: 0, n: sl, s: sl === 'ring1' || sl === 'ring2' ? 'ring' : sl, g: 'normal', wt: 'sword' }; const url0 = itemIcon(it);
  const img = new Image(); img.src = url0; const c = document.createElement('canvas'); c.width = c.height = IC_S; const x = c.getContext('2d');
  const url = new Promise(r => { img.onload = () => { x.filter = 'grayscale(1) brightness(.55)'; x.globalAlpha = .6; x.drawImage(img, 0, 0); r(c.toDataURL()); }; });
  ICON_CACHE.set(key, url0); url.then(u => ICON_CACHE.set(key, u)); return url0;
}
function consIcon(k) { const key = 'cons|' + k; if (ICON_CACHE.has(key)) return ICON_CACHE.get(key); const p = CONS_PAINT[k] || CONS_PAINT.gem;
  const url = icCanvas(x => { const bg = x.createRadialGradient(32, 32, 4, 32, 32, 34); bg.addColorStop(0, '#2a2e44'); bg.addColorStop(1, 'rgba(12,14,28,0)'); x.fillStyle = bg; x.fillRect(0, 0, 64, 64); p(x); }); ICON_CACHE.set(key, url); return url; }
