'use strict';
/* ===== 스킬 아이콘 (캔버스 페인팅) =====
   유형(ty) · 투사체 종류(kind) · 낙하물(hk) · 원소(el) · 무장 무기로 모티프를 정하고, 단계(ti)가 오를수록 테두리가 화려해진다. */
const SK_EL = { fire: ['#ff7a2a', '#ffd070'], ice: ['#6ac8ff', '#e8faff'], bolt: ['#a878ff', '#f0e0ff'] };
function skColors(s, hero) {
  if (s.col) return [s.col, mixC(s.col, '#ffffff', .6)];
  if (SK_EL[s.el]) return SK_EL[s.el];
  const f = hero ? hero.fx : '#ffd070'; return [f, mixC(f, '#ffffff', .55)];
}
function skGlowLine(x, lw, c, blur = 8) { x.save(); x.shadowColor = c; x.shadowBlur = blur; x.strokeStyle = c; x.lineWidth = lw; x.stroke(); x.restore(); }
function skCrescent(x, cx, cy, r, a0, a1, c, c2, w = 7) {
  x.beginPath(); x.arc(cx, cy, r, a0, a1); x.arc(cx + Math.cos((a0 + a1) / 2) * w * .6, cy + Math.sin((a0 + a1) / 2) * w * .6, r - w, a1, a0, true); x.closePath();
  const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, c2); g.addColorStop(1, c); x.save(); x.shadowColor = c; x.shadowBlur = 10; x.fillStyle = g; x.fill(); x.restore();
}
function skBolt(x, x0, y0, x1, y1, c, w = 3) { x.beginPath(); x.moveTo(x0, y0); const n = 5; for (let i = 1; i < n; i++) { const k = i / n; x.lineTo(lerp(x0, x1, k) + (i % 2 ? 5 : -5), lerp(y0, y1, k)); } x.lineTo(x1, y1); skGlowLine(x, w + 3, c, 12); x.strokeStyle = '#ffffff'; x.lineWidth = w * .5; x.stroke(); }
function skFlame(x, cx, cy, s, c = '#ff7a2a') { x.beginPath(); x.moveTo(cx, cy - 14 * s); x.quadraticCurveTo(cx + 9 * s, cy - 2 * s, cx + 6 * s, cy + 8 * s); x.quadraticCurveTo(cx, cy + 12 * s, cx - 6 * s, cy + 8 * s); x.quadraticCurveTo(cx - 9 * s, cy - 2 * s, cx, cy - 14 * s);
  const g = x.createRadialGradient(cx, cy + 4 * s, 1, cx, cy, 14 * s); g.addColorStop(0, '#fff6c0'); g.addColorStop(.5, '#ffb040'); g.addColorStop(1, c); x.save(); x.shadowColor = c; x.shadowBlur = 10; x.fillStyle = g; x.fill(); x.restore(); }
function skArrow(x, x0, y0, x1, y1, c, fire) { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = OL; x.lineWidth = 3.4; x.stroke(); x.strokeStyle = '#c8a070'; x.lineWidth = 1.8; x.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0); x.beginPath(); x.moveTo(x1 + Math.cos(a) * 6, y1 + Math.sin(a) * 6); x.lineTo(x1 + Math.cos(a + 2.5) * 5, y1 + Math.sin(a + 2.5) * 5); x.lineTo(x1 + Math.cos(a - 2.5) * 5, y1 + Math.sin(a - 2.5) * 5); x.closePath(); fillStroke(x, '#e8eef4', 1);
  if (fire) skFlame(x, x1, y1, .5, c); }
function skRock(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, rr = r * (.75 + ((i * 37) % 5) / 10); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); fillStroke(x, metalGrad(x, cx - r, cy - r, cx + r, cy + r, '#a89878'), 1.2); }
function skIce(x, cx, cy, r) { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r * .45, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r * .45, cy); x.closePath(); const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#6ac8ff'); fillStroke(x, g, 1.1); }
function skPetal(x, cx, cy, r, a) { x.save(); x.translate(cx, cy); x.rotate(a); x.beginPath(); x.moveTo(0, -r); x.quadraticCurveTo(r * .8, 0, 0, r); x.quadraticCurveTo(-r * .8, 0, 0, -r); const g = x.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffe0f0'); g.addColorStop(1, '#ff6ab0'); x.fillStyle = g; x.fill(); x.restore(); }
function skDragon(x, c, c2) {
  x.beginPath(); for (let i = 0; i <= 30; i++) { const k = i / 30, px = 8 + k * 46, py = 40 - Math.sin(k * Math.PI * 1.6) * 14 - k * 8; i ? x.lineTo(px, py) : x.moveTo(px, py); }
  skGlowLine(x, 9, c, 14); x.strokeStyle = c2; x.lineWidth = 5; x.stroke(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.setLineDash([2, 3]); x.stroke(); x.setLineDash([]);
  x.beginPath(); x.moveTo(52, 14); x.lineTo(60, 18); x.lineTo(54, 22); x.lineTo(58, 26); x.lineTo(48, 24); x.closePath(); fillStroke(x, c2, 1.2);
  x.beginPath(); x.moveTo(50, 16); x.lineTo(46, 6); x.moveTo(54, 16); x.lineTo(58, 8); x.strokeStyle = c2; x.lineWidth = 1.6; x.stroke(); x.fillStyle = '#ff3a3a'; x.beginPath(); x.arc(53, 19, 1.4, 0, 7); x.fill();
}
function skHeroWeapon(x, hero, scale = .62, dx = 0, dy = 0, rot = 0) {
  const wk = { glaive: 'glaive', snake: 'snake', spear: 'spear', dao: 'dao', fan: 'fan', sword: 'sword', bigdao: 'dao', halberd: 'halberd', axe: 'axe', whip: 'whip', bow: 'bow', staff: 'staff', mace: 'mace' }[hero ? hero.look.weapon : 'sword'] || 'sword';
  x.save(); x.translate(32 + dx, 32 + dy); x.rotate(rot); x.scale(scale, scale); x.translate(-32, -32);
  paintWeapon(x, wk, { metal: hero && hero.look.metal || '#dfe6ee', wood: hero && hero.look.wood || '#6a3a1a', gem: '#ff5a5a', tas: '#d83a3a', glow: null, v: 1 }); x.restore();
}
function skFigure(x, cx, cy, s, c) { x.fillStyle = c; x.beginPath(); x.arc(cx, cy - 11 * s, 4 * s, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - 5 * s, cy - 6 * s); x.lineTo(cx + 5 * s, cy - 6 * s); x.lineTo(cx + 7 * s, cy + 8 * s); x.lineTo(cx - 7 * s, cy + 8 * s); x.closePath(); x.fill(); }
const PASSIVE_MOTIF = k => /^hp|vit|def|dr|thorns/.test(k) ? 'shield' : /crit/.test(k) ? 'eye' : /^ls/.test(k) ? 'blood' : /mspd|dodge|dash/.test(k) ? 'wing' : /^mp|mpRegen|cdr|skillDmg/.test(k) ? 'orb' : /fire|burn/.test(k) ? 'fire' : /ice|chill|vsCtrl/.test(k) ? 'ice' : /bolt|shock/.test(k) ? 'bolt' : /kiGain|hpRegen/.test(k) ? 'wine' : 'fist';
function skillIcon(s) {
  const key = 'sk|' + s.id; if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  const hero = HEROES.find(h => h.id === s.hero), [c, c2] = skColors(s, hero), ti = s.ti || 0;
  const url = icCanvas(x => {
    /* 배경: 원소 · 무장 색 방사 그라데이션 */
    x.save(); x.beginPath(); x.roundRect ? x.roundRect(2, 2, 60, 60, 12) : x.rect(2, 2, 60, 60); x.clip();
    const bg = x.createRadialGradient(32, 30, 4, 32, 32, 44); bg.addColorStop(0, mixC('#1c2036', c, .45)); bg.addColorStop(1, '#0a0c18'); x.fillStyle = bg; x.fillRect(0, 0, 64, 64);
    x.globalAlpha = .12; x.strokeStyle = c2; x.lineWidth = 1; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(32, 32, 8 + i * 7, 0, 7); x.stroke(); } x.globalAlpha = 1;
    switch (s.ty) {
      case 'basic': skHeroWeapon(x, hero, .72, 0, 0, 0); skCrescent(x, 30, 34, 24, -2.4, -.3, c, c2, 5); break;
      case 'cmd': skCrescent(x, 26, 36, 22, -1.9, .5, c, c2, 8); skHeroWeapon(x, hero, .6, 6, -2, .3); for (let i = 0; i < 3; i++) glowDot(x, 44 + i * 5, 20 - i * 4, 4, c2, .8); break;
      case 'sp': x.save(); x.translate(32, 32); for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); x.beginPath(); x.moveTo(0, -6); x.lineTo(3, -28); x.lineTo(-3, -28); x.closePath(); x.fillStyle = i % 2 ? c : c2; x.globalAlpha = .75; x.fill(); } x.restore(); x.globalAlpha = 1;
        glowDot(x, 32, 32, 16, '#ffffff', .8); skHeroWeapon(x, hero, .66, 0, 0, 0); break;
      case 'proj': {
        const k = s.kind || 'eslash', n = s.cnt || 1;
        if (k === 'dragon') skDragon(x, c, c2);
        else if (k === 'farrow') { for (let i = 0; i < Math.min(4, n); i++) skArrow(x, 8, 46 - i * 7 + (n > 1 ? 6 : 0), 50, 22 - i * 7 + (n > 1 ? 10 : 0), c, s.el === 'fire'); if (s.pierce) { x.beginPath(); x.moveTo(6, 50); x.lineTo(58, 14); skGlowLine(x, 1.5, c2, 10); } }
        else if (k === 'fireball') { for (let i = 0; i < 3; i++) glowDot(x, 18 - i * 5, 44 + i * 4, 7 - i, '#ff9a40', .6); x.beginPath(); x.arc(36, 28, 13, 0, 7); const g = x.createRadialGradient(32, 24, 2, 36, 28, 14); g.addColorStop(0, '#fff6c0'); g.addColorStop(.5, '#ffb040'); g.addColorStop(1, '#e0501a'); x.save(); x.shadowColor = '#ff7a2a'; x.shadowBlur = 14; x.fillStyle = g; x.fill(); x.restore(); skFlame(x, 38, 18, .7); }
        else if (k === 'tornado') { for (let i = 0; i < 7; i++) { x.beginPath(); x.ellipse(32 + Math.sin(i) * 3, 12 + i * 6.5, 22 - i * 2.6, 4.2, 0, 0, 7); skGlowLine(x, 2.2, i % 2 ? c : c2, 6); } }
        else if (k === 'petal') { for (let i = 0; i < 7; i++) skPetal(x, 14 + i * 6.5, 44 - Math.sin(i * .9) * 14, 5.5, i); skCrescent(x, 30, 36, 22, -2, -.4, c, c2, 4); }
        else if (k === 'wind') { for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(8, 18 + i * 9); x.bezierCurveTo(24, 10 + i * 9, 40, 28 + i * 9, 56, 18 + i * 9); skGlowLine(x, 3 - i * .4, i % 2 ? c2 : c, 8); } if (s.el === 'ice') { skIce(x, 50, 18, 7); skIce(x, 14, 46, 5); } }
        else { for (let i = 0; i < Math.min(3, n); i++) skCrescent(x, 26 + i * 6, 34 + (i - (Math.min(3, n) - 1) / 2) * 8, 20 - i, -1.3, 1.3, c, c2, 6); if (s.knock) glowDot(x, 50, 32, 9, c2, .7); }
        break; }
      case 'dash': for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(6, 16 + i * 6.5); x.lineTo(30 - (i % 3) * 5, 16 + i * 6.5); skGlowLine(x, 1.6, c, 5); }
        x.beginPath(); x.moveTo(24, 26); x.lineTo(54, 32); x.lineTo(24, 38); x.quadraticCurveTo(30, 32, 24, 26); const gd = x.createLinearGradient(24, 0, 56, 0); gd.addColorStop(0, c); gd.addColorStop(1, '#ffffff'); x.save(); x.shadowColor = c; x.shadowBlur = 14; x.fillStyle = gd; x.fill(); x.restore();
        skHeroWeapon(x, hero, .5, 6, 0, Math.PI / 4 + .1); if (s.el === 'fire') skFlame(x, 18, 32, .7); if (s.stun) for (let i = 0; i < 3; i++) glowDot(x, 50 + (i - 1) * 5, 16, 3, '#fff6a0', 1); break;
      case 'nova': { const r0 = s.r ? clamp(s.r / 10, 14, 28) : 20; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(32, 34, r0 - i * 6, 0, 7); skGlowLine(x, 3 - i * .6, i ? c2 : c, 10); }
        skFigure(x, 32, 36, 1, 'rgba(10,12,24,.85)'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.beginPath(); x.moveTo(32 + Math.cos(a) * 12, 34 + Math.sin(a) * 12); x.lineTo(32 + Math.cos(a) * (r0 + 4), 34 + Math.sin(a) * (r0 + 4)); skGlowLine(x, 1.2, c2, 4); }
        if (s.el === 'fire') skFlame(x, 32, 22, .8); if (s.el === 'ice') { skIce(x, 14, 20, 6); skIce(x, 50, 20, 6); } if (s.stun) for (let i = 0; i < 3; i++) glowDot(x, 24 + i * 8, 14, 3, '#fff6a0', 1); break; }
      case 'rain': { const hk = s.hk || s.el, n = Math.min(7, Math.max(3, Math.round((s.cnt || 6) / 2)));
        x.fillStyle = 'rgba(40,40,60,.8)'; x.beginPath(); x.ellipse(32, 10, 26, 7, 0, 0, 7); x.fill();
        for (let i = 0; i < n; i++) { const px = 10 + i * (44 / (n - 1 || 1)), py = 20 + (i % 2) * 10;
          if (hk === 'bolt') { if (i % 2 === 0) skBolt(x, px, 12, px + 2, 52, c, 2.4); }
          else if (hk === 'fire') skFlame(x, px, py + 12, .55);
          else if (hk === 'ice') skIce(x, px, py + 10, 6);
          else if (hk === 'rock') skRock(x, px, py + 10, 6);
          else skArrow(x, px - 3, py - 2, px + 3, py + 18, c, false); }
        x.beginPath(); x.moveTo(4, 56); x.lineTo(60, 56); skGlowLine(x, 2, c, 8); if (s.target) { x.beginPath(); x.arc(32, 50, 6, 0, 7); skGlowLine(x, 1.4, '#ff5a4a', 6); } break; }
      case 'chain': { const pts = [[10, 46], [24, 20], [36, 42], [50, 18], [56, 40]].slice(0, Math.min(5, (s.cnt || 4) + 1));
        for (let i = 1; i < pts.length; i++) skBolt(x, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, 1.8); for (const [px, py] of pts) { glowDot(x, px, py, 7, c2, .9); x.beginPath(); x.arc(px, py, 2.4, 0, 7); x.fillStyle = '#fff'; x.fill(); }
        if (s.el === 'ice') for (const [px, py] of pts) skIce(x, px, py, 4); break; }
      case 'quake': { x.fillStyle = '#3a2a1a'; x.fillRect(0, 46, 64, 18); x.beginPath(); x.moveTo(4, 50); for (let i = 0; i < 8; i++) x.lineTo(8 + i * 7, 50 + (i % 2 ? 6 : -2)); skGlowLine(x, 2, s.el === 'fire' ? '#ff7a2a' : c, 10);
        const n = Math.min(4, s.cnt || 4); for (let i = 0; i < n; i++) { const px = 14 + i * 12, h = 14 + i * 5; if (s.hk === 'fire' || s.el === 'fire') { skFlame(x, px, 46 - h / 2, .5 + i * .12); } else { x.beginPath(); x.moveTo(px - 5, 48); x.lineTo(px, 48 - h); x.lineTo(px + 5, 48); x.closePath(); fillStroke(x, metalGrad(x, px - 5, 30, px + 5, 48, '#a89878'), 1.2); } }
        skRock(x, 50, 18, 5); skRock(x, 16, 22, 4); break; }
      case 'whirl': { for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(32, 32, 24 - i * 6, i * 1.2, i * 1.2 + Math.PI * 1.5); skGlowLine(x, 4 - i, i % 2 ? c2 : c, 10); }
        x.save(); x.translate(32, 32); for (let i = 0; i < 3; i++) { x.rotate(Math.PI * 2 / 3); x.beginPath(); x.moveTo(20, 0); x.lineTo(26, -4); x.lineTo(24, 4); x.closePath(); x.fillStyle = c2; x.fill(); } x.restore(); skHeroWeapon(x, hero, .42, 0, 0, s.id.length); if (s.el === 'ice') skIce(x, 50, 14, 6); break; }
      case 'leap': { x.beginPath(); x.moveTo(8, 50); x.quadraticCurveTo(26, -4, 44, 40); x.setLineDash([3, 3]); skGlowLine(x, 1.6, c2, 6); x.setLineDash([]);
        skFigure(x, 40, 30, .9, c2); x.beginPath(); x.ellipse(44, 52, 16, 5, 0, 0, 7); skGlowLine(x, 2.4, c, 10); for (let i = 0; i < 6; i++) { const a = Math.PI + i / 5 * Math.PI; x.beginPath(); x.moveTo(44 + Math.cos(a) * 10, 52 + Math.sin(a) * 4); x.lineTo(44 + Math.cos(a) * 18, 52 + Math.sin(a) * 12); skGlowLine(x, 1.6, c2, 4); }
        skHeroWeapon(x, hero, .4, 12, -6, -.5); break; }
      case 'summon': { const horse = s.look === 'qiang'; x.beginPath(); x.arc(32, 50, 20, Math.PI, 0); skGlowLine(x, 2, c, 10);
        for (let i = 0; i < 3; i++) { const px = 16 + i * 16, sc = i === 1 ? 1.1 : .85; if (horse && i !== 1) { x.beginPath(); x.moveTo(px - 6, 50); x.quadraticCurveTo(px - 6, 30, px + 2, 26); x.lineTo(px + 8, 32); x.quadraticCurveTo(px + 4, 38, px + 4, 50); x.closePath(); fillStroke(x, '#e8e0d0', 1.2); }
          else { x.beginPath(); x.arc(px, 30 * sc + 6, 5 * sc, Math.PI, 0); fillStroke(x, horse ? '#c9a227' : '#9a9a9a', 1.1); skFigure(x, px, 44, sc, horse ? '#e8e0d0' : '#8a8a8a'); x.beginPath(); x.moveTo(px + 6, 50); x.lineTo(px + 6, 22); x.strokeStyle = '#dfe6ee'; x.lineWidth = 1.4; x.stroke(); } }
        glowDot(x, 32, 50, 14, c2, .5); break; }
      case 'buff': { skFigure(x, 32, 38, 1.3, 'rgba(10,12,24,.85)'); x.beginPath(); x.ellipse(32, 40, 20, 24, 0, 0, 7); skGlowLine(x, 2.4, c, 14);
        x.beginPath(); x.moveTo(48, 30); x.lineTo(54, 20); x.lineTo(60, 30); x.moveTo(54, 20); x.lineTo(54, 40); skGlowLine(x, 2.4, c2, 8);
        if (s.party) for (const px of [14, 50]) skFigure(x, px, 50, .6, c2); if (s.mods && (s.mods.dr || s.mods.def)) { x.beginPath(); x.moveTo(32, 16); x.lineTo(42, 20); x.lineTo(40, 32); x.lineTo(32, 38); x.lineTo(24, 32); x.lineTo(22, 20); x.closePath(); x.globalAlpha = .55; fillStroke(x, c2, 1); x.globalAlpha = 1; } break; }
      case 'aura': { const kind = s.aura; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(32, 50, 12 + i * 8, 4 + i * 2.5, 0, 0, 7); skGlowLine(x, 1.8, kind === 'heal' ? '#7af08a' : kind === 'mp' ? '#6ab0ff' : kind === 'dmg' ? '#ff6a4a' : '#ffd24a', 8); }
        skFigure(x, 32, 40, 1.1, 'rgba(10,12,24,.85)');
        if (kind === 'heal') { x.fillStyle = '#9cf07a'; x.fillRect(44, 12, 4, 14); x.fillRect(39, 17, 14, 4); for (let i = 0; i < 4; i++) glowDot(x, 14 + i * 12, 24 + (i % 2) * 8, 3, '#b8ffb0', 1); }
        else if (kind === 'mp') { x.beginPath(); x.arc(46, 18, 7, 0, 7); const g = x.createRadialGradient(44, 16, 1, 46, 18, 8); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#3a78e0'); fillStroke(x, g, 1); }
        else if (kind === 'dmg') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.beginPath(); x.moveTo(32 + Math.cos(a) * 16, 34 + Math.sin(a) * 16); x.lineTo(32 + Math.cos(a) * 26, 34 + Math.sin(a) * 26); skGlowLine(x, 2.4, s.el === 'fire' ? '#ff7a2a' : '#ff5a4a', 8); } }
        else { x.beginPath(); x.moveTo(46, 8); x.lineTo(46, 30); x.strokeStyle = '#6a4a2a'; x.lineWidth = 2; x.stroke(); x.beginPath(); x.moveTo(46, 9); x.lineTo(58, 12); x.lineTo(46, 18); fillStroke(x, '#ffd24a', 1); } break; }
      case 'passive': default: { const k = Object.keys(s.mods || {})[0] || 'atk', m = PASSIVE_MOTIF(k);
        if (m === 'shield') { x.beginPath(); x.moveTo(32, 8); x.lineTo(52, 16); x.lineTo(48, 40); x.lineTo(32, 56); x.lineTo(16, 40); x.lineTo(12, 16); x.closePath(); fillStroke(x, metalGrad(x, 12, 8, 52, 56, c), 2); x.beginPath(); x.moveTo(32, 16); x.lineTo(32, 48); x.moveTo(20, 26); x.lineTo(44, 26); x.strokeStyle = c2; x.lineWidth = 2; x.stroke(); }
        else if (m === 'eye') { x.beginPath(); x.moveTo(6, 32); x.quadraticCurveTo(32, 8, 58, 32); x.quadraticCurveTo(32, 56, 6, 32); fillStroke(x, '#f4eee4', 1.8); x.beginPath(); x.arc(32, 32, 10, 0, 7); fillStroke(x, c, 1.2); x.beginPath(); x.arc(32, 32, 4, 0, 7); x.fillStyle = '#0a0a10'; x.fill(); x.beginPath(); x.moveTo(6, 32); x.lineTo(58, 32); x.moveTo(32, 6); x.lineTo(32, 58); x.strokeStyle = 'rgba(255,80,60,.8)'; x.lineWidth = 1; x.stroke(); }
        else if (m === 'blood') { x.beginPath(); x.moveTo(32, 8); x.quadraticCurveTo(48, 32, 44, 44); x.quadraticCurveTo(32, 60, 20, 44); x.quadraticCurveTo(16, 32, 32, 8); const g = x.createLinearGradient(20, 10, 44, 56); g.addColorStop(0, '#ff6a6a'); g.addColorStop(1, '#8a0a1a'); fillStroke(x, g, 1.8); glowDot(x, 27, 36, 5, '#ffffff', .6); }
        else if (m === 'wing') { for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(20, 40); x.quadraticCurveTo(30 + i * 6, 10 + i * 4, 54, 12 + i * 8); x.quadraticCurveTo(36, 26 + i * 4, 20, 40); fillStroke(x, mixC('#f4f0e4', c, i * .15), 1.1); } }
        else if (m === 'orb') { x.beginPath(); x.arc(32, 32, 20, 0, 7); fillStroke(x, '#1a1e34', 2); x.beginPath(); x.arc(32, 32, 20, -Math.PI / 2, Math.PI / 2); x.arc(32, 42, 10, Math.PI / 2, -Math.PI / 2, true); x.arc(32, 22, 10, Math.PI / 2, -Math.PI / 2); x.fillStyle = c2; x.fill(); glowDot(x, 32, 32, 22, c, .35); }
        else if (m === 'fire') { skFlame(x, 32, 34, 1.5); }
        else if (m === 'ice') { skIce(x, 32, 32, 20); skIce(x, 16, 40, 8); skIce(x, 48, 22, 8); }
        else if (m === 'bolt') { skBolt(x, 38, 6, 26, 58, c, 4); }
        else if (m === 'wine') { CONS_PAINT.wine(x); }
        else { skHeroWeapon(x, hero, .8, 0, 0, 0); glowDot(x, 44, 18, 8, c2, .6); }
        break; }
    }
    x.restore();
    /* 테두리: 단계별 */
    x.beginPath(); x.roundRect ? x.roundRect(2, 2, 60, 60, 12) : x.rect(2, 2, 60, 60);
    x.strokeStyle = OL; x.lineWidth = 3; x.stroke();
    x.strokeStyle = ti >= 4 ? '#ffd24a' : ti >= 2 ? mixC(c2, '#ffd24a', .4) : 'rgba(255,255,255,.35)'; x.lineWidth = ti >= 4 ? 2.4 : 1.4; x.stroke();
    if (ti >= 4) for (const [px, py] of [[5, 5], [59, 5], [5, 59], [59, 59]]) gemAt(x, px, py, 3, '#ffd24a');
    if (s.ty === 'passive' || s.ty === 'basic' || s.ty === 'cmd' || s.ty === 'sp' || s.ty === 'aura') { x.fillStyle = 'rgba(10,12,24,.7)'; x.beginPath(); x.arc(54, 54, 7, 0, 7); x.fill(); x.fillStyle = '#ecd08c'; x.font = '700 8px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s.ty === 'aura' ? 'A' : 'P', 54, 54.5); }
  });
  ICON_CACHE.set(key, url); return url;
}
/* 무장 필살기 아이콘 (HUD 필살 버튼) */
function heroSpIcon(hero) { const s = SKT[hero.id][0][4]; return skillIcon(s); }
