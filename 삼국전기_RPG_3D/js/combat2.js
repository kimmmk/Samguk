'use strict';
/* ===== 대화 자동 스킵 · 회피 기술 · 콤보 확장 ===== */

/* ---------- 대화: 공격 · 이동을 시작하면 자동 스킵 ---------- */
const SKIP_KEYS = ['atk', 'jump', 'sp', 'msp', 'dodge', 'left', 'right', 'up', 'down', 's1', 's2', 's3', 's4'];
const _updTalk0 = updTalk;
updTalk = function (dt) {
  const Q = talkActive(); if (!Q) return;
  Q.age = (Q.age || 0) + dt;
  if (Q.age > .25 && SKIP_KEYS.some(k => hit(k))) { B.talkQ.length = 0; voiceStop(); return; }
  _updTalk0(dt);
};

/* ---------- 잔상 ---------- */
function afterimage(p, n = 3) {
  const th = themeOf(p), y = (p.y || 0) + 1.1;
  for (let i = 0; i < n; i++) setTimeout(() => { if (!B) return; spriteFx(slashTex(), p.x - p.facing * .2, y + rand(-.4, .4), p.z + .1, th.c, 1.2, 2.2, .25, 0, 1.4); themeBurst(p.x, y, p.z, th, 3, 1.5); }, i * 45);
}

/* ---------- 회피 기술 ---------- */
function rollDodge(p, ax, o = {}) {
  setState(p, 'dodge'); p.dodgeCd = o.cd ?? 34 / 60; p.invuln = o.inv ?? 18 / 60; p.perfDone = !!o.noPerf; sfx('dodge');
  const moving = Math.hypot(ax.x, ax.z) > .2, back = !o.forceRoll && (!moving || Math.sign(ax.x) === -p.facing && Math.abs(ax.z) < .3);
  p.backstep = back; if (back) { p.vx = -p.facing * 7.5 * 60 * PX; p.vz = 0; }
  else { const dx = moving ? ax.x : -p.facing; p.vx = dx * 9.5 * 60 * PX; p.vz = ax.z * 6 * 60 * PX * .7; p.rollDir = Math.sign(dx || p.facing) * p.facing; }
  afterimage(p);
}
function dodgeExtra(p, ax) {
  if (p.state !== 'dodge') p.dChain = 0;
  if (!hit('dodge') || p.dead) return false;
  /* 공중 회피 */
  if (p.state === 'jump' && !p.airDodged && (p.y || 0) > .3) {
    const dir = Math.abs(ax.x) > .2 ? Math.sign(ax.x) : p.facing; setState(p, 'airdodge'); p.airDodged = true; p.invuln = Math.max(p.invuln, .3);
    p.vx = dir * 15; p.vz = ax.z * 4; p.vy = 3; p.rollDir = dir * p.facing; p.backstep = false; afterimage(p, 4); sfx('dodge'); return true; }
  /* 연속 회피 */
  if (p.state === 'dodge' && p.st > .16 && !p.dChain) {
    if (p.ki < 8) return false; p.ki -= 8; rollDodge(p, ax, { forceRoll: true }); p.dChain = 1; UI.dmg(p.x, 2.6, p.z, '연속 회피', 'block'); return true; }
  /* 낙법 · 긴급 회피 */
  if (p.state === 'hurt' || (p.state === 'down' && (p.y || 0) < 1.2)) {
    if (p.ki < 15) { UI.dmg(p.x, 2.4, p.z, '기력 부족', 'block'); return false; }
    p.ki -= 15; p.downLand = false; p.vy = 0; p.y = 0; rollDodge(p, ax, { forceRoll: true, inv: .6, noPerf: true, cd: .5 });
    UI.dmg(p.x, 2.8, p.z, '낙법!', 'react'); shockwave(p.x, p.z, 1.8, themeOf(p).c); return true; }
  return false;
}
function tickAirDodge(p, dt) {
  p.vx *= Math.exp(-dt * 4);
  if (Math.random() < .6) themeTrail(p, themeOf(p), 2);
  if (p.st > .3) { setState(p, 'jump'); p.airAtk = false; p.jumpT = -9; }
}
function dodgeCounter(p) {
  const perf = p.perfT > 0, C = comboOf(p), last = C[C.length - 1], th = themeOf(p);
  const mv = last.proj ? { p: 5, d: .34, m: perf ? 2.6 : 1.8, proj: 'farrow3', knock: 1 } : { p: 11, d: .36, m: perf ? 3 : 2, r: 1.35, knock: 1, step: 9 };
  setState(p, 'attack'); p.combo = C.length - 1; p.queued = false; p.hitIds.clear(); p.mv = mv; p.pose = mv.p; p.atkDur = mv.d; p.windFrac = .25;
  p.vx = p.facing * (mv.step || 1); p.vz = 0; p.invuln = Math.max(p.invuln, .3);
  UI.dmg(p.x, 2.8, p.z, perf ? '완벽 반격!' : '회피 반격', 'skill'); sfx('special');
  if (perf) { spriteFx(starTex(), p.x, 1.2, p.z + .3, th.c, .5, 3.4, .3); shockwave(p.x, p.z, 2.6, th.c); W.hitstop = .08; }
}

/* ---------- 콤보: 공중 3연격 · 급강하 · 점프 캔슬 · 모아베기 ---------- */
function airAttack(p, dt) {
  const th = themeOf(p);
  if (p.diving) { p.vx = p.facing * 6; p.vz = 0; themeTrail(p, th, 3); meleeP(p, { reach: 1.6, dz: 1.2, dmg: pOf(p, 'basic') * 1.4, knock: true, kb: 3 }); return; }
  if (hit('atk') && p.fear <= 0) {
    if (W.t - p.jumpT < .09 && !p.airN) { if (tryspin(p)) return; }
    if (held('down') && (p.y || 0) > .8) { p.diving = true; p.vy = -26; p.airAtk = false; p.hitIds.clear(); slash(p, 'chop', th.c, { s: 1.3, follow: true, life: .4 }); UI.dmg(p.x, 2.8 + p.y, p.z, '급강하', 'skill'); sfx('heavy'); return; }
    if ((!p.airAtk || p.airT > .2) && (p.airN || 0) < 3) {
      p.airN = (p.airN || 0) + 1; p.airAtk = true; p.airT = 0; p.hitIds.clear(); p.vy = Math.max(p.vy, p.airN < 3 ? 3 : 1.5);
      slash(p, ['chop', 'sweep', 'xcut'][p.airN - 1], th.c, { h: .9, s: reachOf(p) / 2.7, follow: true }); sfx('swing');
      if (p.airN === 3) UI.dmg(p.x, 2.8 + (p.y || 0), p.z, '공중 3연격', 'skill'); }
  }
  if (p.airAtk) { p.airT += dt; if (p.airT > .05 && p.airT < .25) { const fin = p.airN === 3;
    meleeP(p, { reach: reachOf(p) * .95, dz: 1.1, dmg: pOf(p, 'basic') * (fin ? 1.9 : 1.1), kb: fin ? 5 : 1.2, knock: fin }); } }
}
const _onLand0 = onLand;
onLand = function (f) {
  if (B && f === B.p) {
    if (f.diving) { f.diving = false; const th = themeOf(f), x = f.x + f.facing * .6; shockwave(x, f.z, 3.2, th.c); themeBurst(x, .3, f.z, th, 24, 6); dust(x, f.z, 16, 1.4);
      W.shake = Math.max(W.shake, .5); sfx('boom'); aoeP(f, x, f.z, 2.4, pOf(f, 'basic') * 2.2, { knock: true, launch: true }); }
    f.airN = 0; f.airDodged = false;
    if (f.state === 'airdodge') setState(f, 'idle');
  }
  _onLand0(f);
};
function comboCancel(p) {
  const buf = k => hit(k) || W.t - (hitK[k] ?? -9) < .15;
  if (!buf('jump') || !p.didSwing && p.state === 'attack' || p.st < p.atkDur * .45 || (p.y || 0) > .05) return false;
  const chase = p.state === 'launch'; setState(p, 'jump'); p.y = .01; p.vy = chase ? 14 : 11; p.airAtk = false; p.airN = 0; p.jumpT = -9;
  if (chase) { const tg = B.enemies.find(e => !e.dead && (e.y || 0) > .5 && Math.abs(e.x - p.x) < 5); if (tg) p.vx = clamp((tg.x - p.x) * 2.5, -8, 8); UI.dmg(p.x, 2.8, p.z, '추격!', 'skill'); afterimage(p, 2); }
  else UI.dmg(p.x, 2.6, p.z, '점프 캔슬', 'block');
  sfx('dodge'); return true;
}
const CHG_OK = ['idle', 'walk', 'run', 'attack'];
function chargeTick(p, dt) {
  if (held('atk') && CHG_OK.includes(p.state) && (p.y || 0) < .05) {
    p.holdT = (p.holdT || 0) + dt;
    if (p.holdT > .3) { const th = themeOf(p), a = rand(0, 6.28), r = p.holdT > .85 ? 1.2 : .8;
      PA.emit(p.x + Math.cos(a) * r, rand(.2, 2), p.z + Math.sin(a) * r * .6, -Math.cos(a) * 2, 1.5, -Math.sin(a), .35, .18, col(p.holdT > .85 ? th.c2 : th.c), 0, 1, 2.6);
      if (p.holdT > .85 && !p.chgMax) { p.chgMax = 1; spriteFx(starTex(), p.x, 1.2, p.z + .3, th.c, .4, 2.2, .3); UI.dmg(p.x, 2.8, p.z, 'MAX', 'react'); sfx('special'); } }
    return false; }
  if (p.holdT) { const h = p.holdT; p.holdT = 0; p.chgMax = 0;
    if (h > .45 && CHG_OK.includes(p.state) && (p.y || 0) < .05) { startCharged(p, Math.min(1, (h - .45) / .4)); return true; } }
  return false;
}
function startCharged(p, lv) {
  const C = comboOf(p), last = C[C.length - 1], th = themeOf(p), full = lv >= 1;
  const mv = last.proj ? { ...last, m: last.m * (1.8 + lv * 1.2), knock: 1, proj: last.proj === 'arrow' ? 'farrow3' : last.proj }
    : { p: 7, d: .5, m: 2.2 + lv * 1.6, r: 1.4 + lv * .2, knock: 1, quake: 1, fire: th.kind === 'fire' };
  setState(p, 'attack'); p.combo = C.length - 1; p.queued = false; p.hitIds.clear(); p.mv = mv; p.pose = mv.p; p.atkDur = mv.d; p.windFrac = .35; p.vx = p.facing * 2; p.vz = 0;
  p.invuln = Math.max(p.invuln, .2); UI.dmg(p.x, 2.9, p.z, full ? '풀 차지!' : '모아베기', 'skill'); sfx('heavy');
  if (full) { pillar(p.x, p.z, th.c, 5, .5, .7); magicCircle(p.x, p.z, th.c, 2); shout(p.h.name, '하압!'); }
}

/* ---------- 콤보 보너스 ---------- */
const COMBO_TIERS = [10, 30, 50, 100, 200];
function comboTier() { if (!B) return 0; let t = 0; for (const n of COMBO_TIERS) if (B.combo >= n) t++; return t; }
const _pOf0 = pOf;
pOf = function (p, kind) { return _pOf0(p, kind) * (B && p === B.p ? 1 + comboTier() * .05 : 1); };
const _hitFx0 = hitFx;
hitFx = function (e, src, crit, el, o, dmg) {
  _hitFx0(e, src, crit, el, o, dmg);
  if (!B || src !== B.p) return;
  /* 공중 연속기: 떠 있는 적을 붙잡아 둔다 */
  if (src.state === 'jump' && (e.y || 0) > .3 && !e.boss && !e.dead) { e.vy = Math.max(e.vy || 0, 4.5); e.vx = src.facing; }
  const t = comboTier(); if (t > (B.comboTierShown || 0)) {
    B.comboTierShown = t; const th = themeOf(src), n = COMBO_TIERS[t - 1];
    src.ki = Math.min(src.S.maxki, src.ki + 8 * t); themeBurst(src.x, 1.2, src.z, th, 20, 5); shockwave(src.x, src.z, 2 + t * .6, th.c);
    UI.dmg(src.x, 3.2, src.z, `${n} COMBO!`, 'critl'); UI.msg(`${n} 콤보 보너스 — 공격력 +${t * 5}% · 기력 +${8 * t}`); sfx('special'); }
};
const _uiFrame1 = UI.frame;
UI.frame = function (dt) {
  _uiFrame1(dt);
  if (B && B.combo < COMBO_TIERS[0]) B.comboTierShown = 0;
  const t = comboTier(), r = $('#combo-r'); if (r && t && B.combo >= 2 && !r.textContent.includes('+')) r.textContent += ` · 공격 +${t * 5}%`;
};

/* ---------- 도움말 ---------- */
const EXTRA_ROWS = [['공격 길게 누르기', '모아베기 (풀 차지 시 강화)', ''], ['공중에서 공격 ×3', '공중 3연격', ''], ['공중 ↓ + 공격', '급강하 내려찍기', ''],
  ['공격 중 점프', '점프 캔슬 (승천격 뒤에는 추격 점프)', ''], ['회피 중 공격', '회피 반격 (완벽 회피 뒤 강화)', ''], ['회피 중 회피', '연속 회피', '기력 8'],
  ['공중에서 회피', '공중 대시', ''], ['다운 · 경직 중 회피', '낙법 (긴급 회피)', '기력 15'], ['10 · 30 · 50 · 100 · 200 콤보', '콤보 보너스 (공격력 최대 +25%)', '']];
const _cmdRowsFor0 = cmdRowsFor;
cmdRowsFor = function (hero) { return [..._cmdRowsFor0(hero), ...EXTRA_ROWS]; };
