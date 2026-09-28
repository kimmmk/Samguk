'use strict';
/* ===== 세트 아이템 개편 =====
   · 부위 기본 성능: 에픽 수준 (에픽 기본치 + 세트 고유 옵션 2개 + 에픽 무작위 옵션 2~3개)
   · 2세트: 시너지 효과 + 옵션 2개 (세트 등급 수치)
   · 3세트: + 옵션 3개 (전용 등급 수치)
   · 4세트: + 옵션 4개 (신화 등급 수치) + 시너지 각성
   옵션 수치는 착용한 세트 부위들의 평균 아이템 레벨로 계산되어 레벨이 오를수록 함께 강해진다. */
const SET_GM = { 2: GRADES.set.m, 3: GRADES.excl.m, 4: GRADES.myth.m };
const SET_TIER_NAME = { 2: '세트', 3: '전용급', 4: '신화급' };
const SET_DESIGN = {
  taoyuan: { add: { s: 'belt', n: '도원 요대', af: [['hpRegen', 1], ['str', 1]] },
    syn2: { t: '의형제의 맹세 — 체력 30% 이하가 되면 8초간 받는 피해 -30% · 체력 20% 회복 (45초마다)', procs: [{ on: 'lowhp', ch: 100, act: 'drFor', v: 30, dur: 480, cd: 2700 }, { on: 'lowhp', ch: 100, act: 'heal', v: 20, cd: 2700 }] },
    o2: ['hpPct', 'allStat'], o3: ['atkPct', 'ls', 'exp'], o4: ['critDmg', 'dr', 'hpRegen', 'kiGain'],
    syn4: { t: '도원의 맹세 각성 — 적 처치 시 체력 3% 회복 · 30% 확률로 6초간 공격력 +25%', procs: [{ on: 'kill', ch: 100, act: 'heal', v: 3, cd: 20 }, { on: 'kill', ch: 30, act: 'buff', mods: { atkPct: 25 }, dur: 360, id: 'taoyuan' }] } },
  taiping: {
    syn2: { t: '태평요술 — 스킬 사용 시 20% 확률로 낙뢰 3연격', procs: [{ on: 'cast', ch: 20, act: 'bolt3', v: 1 }] },
    o2: ['mpPct', 'bolt'], o3: ['skillDmg', 'cdr', 'shockCh'], o4: [['allSkill', 1], 'ene', 'mpRegen', 'aoe'],
    syn4: { t: '황천당립 — 낙뢰 확률 45% · 위력 1.5배 · 스킬 사용 시 15% 확률로 다음 스킬 내공 소모 없음', procs: [{ on: 'cast', ch: 25, act: 'bolt3', v: 1.5 }, { on: 'cast', ch: 15, act: 'freeMana' }] } },
  xiliang: {
    syn2: { t: '서량 질주 — 돌진 · 달리기 공격 피해 +50% · 이동 속도 +10%', st: { dashDmg: 50, mspd: 10 } },
    o2: ['atkPct', 'crit'], o3: ['dashDmg', 'critDmg', 'kiGain'], o4: ['mspd', 'dex', 'basicDmg', 'bossDmg'],
    syn4: { t: '철기 돌파 — 적 처치 시 5초간 공격력 +30% · 이동 속도 +20%', procs: [{ on: 'kill', ch: 100, act: 'buff', mods: { atkPct: 30, mspd: 20 }, dur: 300, id: 'xiliang', cd: 0 }] } },
  chibi: { add: { s: 'cape', n: '화공 전포', af: [['fire', 1], ['burnCh', 1]] },
    syn2: { t: '연환계 — 이동한 자리에 불길이 남고 화상 피해 +50%', st: { burnPct: 50 }, pw: { fireTrail: 1 } },
    o2: ['fire', 'burnCh'], o3: ['atkPct', 'skillDmg', 'cdr'], o4: ['critDmg', 'aoe', 'bossDmg', 'spDmg'],
    syn4: { t: '적벽대화 — 화상 피해 추가 +100% · 적중 시 12% 확률로 화염 폭발', st: { burnPct: 100 }, procs: [{ on: 'hit', ch: 12, act: 'explode', v: 1.4, cd: 30 }] } },
  wolong: { add: { s: 'neck', n: '칠성 부적', af: [['skillDmg', 1], ['mpRegen', 1]] },
    syn2: { t: '팔괘진 — 받는 피해의 20%를 내공으로 흡수 · 내공 회복 +50%', st: { mpRegen: 50 }, pw: { manaShield: 20 } },
    o2: ['cdr', 'mpPct'], o3: ['skillDmg', 'ene', 'aoe'], o4: [['allSkill', 1], 'mpRegen', 'dr', 'spDmg'],
    syn4: { t: '칠성단 — 스킬 사용 시 20% 확률로 칠성 낙뢰 · 10% 확률로 재사용 대기 없이 다시 시전', procs: [{ on: 'cast', ch: 20, act: 'star7', v: 1.2, cd: 60 }, { on: 'cast', ch: 10, act: 'freeCast' }] } },
  wuhu: {
    syn2: { t: '오호의 위세 — 필살기 피해 +30% · 기력 획득 +30%', st: { spDmg: 30, kiGain: 30 } },
    o2: ['atkPct', 'defPct'], o3: ['critDmg', 'crit', 'hpPct'], o4: [['allSkill', 1], 'dr', 'spDmg', 'bossDmg'],
    syn4: { t: '오호대장군 — 필살기 사용 시 8초간 공격력 +40% · 받는 피해 -20%', procs: [{ on: 'special', ch: 100, act: 'buff', mods: { atkPct: 40, dr: 20 }, dur: 480, id: 'wuhu', cd: 0 }] } },
  wushuang: {
    syn2: { t: '인중여포 — 치명타 피해 +40% · 적 처치 시 3초간 공격력 +30%', st: { critDmg: 40 }, procs: [{ on: 'kill', ch: 100, act: 'buffAtk', v: 30, dur: 180, cd: 0 }] },
    o2: ['atkPct', 'critDmg'], o3: ['ls', 'crit', 'str'], o4: ['allStat', 'bossDmg', 'basicDmg', 'spDmg'],
    syn4: { t: '천하무쌍 — 적중 시 10% 확률로 방천 참격 · 치명타 시 체력 1% 회복', procs: [{ on: 'hit', ch: 10, act: 'redslash', v: 2, cd: 25 }, { on: 'crit', ch: 100, act: 'heal', v: 1, cd: 30 }] } },
  qinglong: { add: { s: 'gloves', n: '청룡 수갑', af: [['atkPct', 1], ['cmdDmg', 1]] },
    syn2: { t: '청룡의 기세 — 전용기 피해 +40% · 기력 획득 +30% · 적중 시 8% 확률로 청룡파', st: { cmdDmg: 40, kiGain: 30 }, procs: [{ on: 'hit', ch: 8, act: 'gwave', v: 1.6, cd: 45 }] },
    o2: ['cmdDmg', 'kiGain'], o3: ['atkPct', 'crit', 'aoe'], o4: [['tree0', 1], 'critDmg', 'str', 'basicDmg'],
    syn4: { t: '청룡강림 — 청룡파 확률 20% · 위력 1.5배 · 전용기 피해 추가 +60%', st: { cmdDmg: 60 }, procs: [{ on: 'hit', ch: 12, act: 'gwave', v: 2.4, cd: 40 }] } },
  baima: { add: { s: 'belt', n: '백마 요대', af: [['kiGain', 1], ['dex', 1]] },
    syn2: { t: '백마의종 — 이동 속도 +15% · 줍기 범위 +60 · 치명타 시 20% 확률로 3초간 치명타 확률 +10%', st: { mspd: 15, pickR: 60 }, procs: [{ on: 'crit', ch: 20, act: 'buff', mods: { crit: 10 }, dur: 180, id: 'baima' }] },
    o2: ['crit', 'dodge'], o3: ['dashDmg', 'dex', 'critDmg'], o4: ['aoe', 'mspd', 'atkPct', 'kiGain'],
    syn4: { t: '백마장군 — 치명타 시 15% 확률로 백룡 발사', procs: [{ on: 'crit', ch: 15, act: 'dragon', v: 1.8, col: '#e8f4ff', cd: 40 }] } },
  tengjia: { add: { s: 'boots', n: '등나무 신', af: [['hp', 1], ['dodge', 1]] },
    syn2: { t: '등갑 방호 — 받는 피해 -8% · 피격 시 25% 확률로 반격 충격파', st: { dr: 8 }, procs: [{ on: 'hurt', ch: 25, act: 'nova', v: 1.5, cd: 90 }] },
    o2: ['hpPct', 'thorns'], o3: ['defPct', 'hpRegen', 'dr'], o4: ['vit', 'hp', 'ls', 'kiGain'],
    syn4: { t: '남만왕의 등갑 — 받는 피해 추가 -10% · 체력 30% 이하 시 3초간 받는 피해 -70% · 경직 무시 (40초마다)', st: { dr: 10 }, procs: [{ on: 'lowhp', ch: 100, act: 'shield', v: 180, cd: 2400 }] } },
  jiangdong: {
    syn2: { t: '강동의 물결 — 빙결 피해 +25% · 타격 시 빙결 확률 +15%', st: { ice: 25, chillCh: 15 } },
    o2: ['ice', 'chillCh'], o3: ['skillDmg', 'cdr', 'vsCtrl'], o4: [['allSkill', 1], 'aoe', 'critDmg', 'mpRegen'],
    syn4: { t: '미주랑의 계책 — 적중 시 10% 확률로 빙룡 발사 · 제압된 적에게 피해 +30%', st: { vsCtrl: 30 }, procs: [{ on: 'hit', ch: 10, act: 'dragon', v: 1.8, col: '#9ae8ff', cd: 40 }] } },
  bamen: {
    syn2: { t: '팔문진 — 방어력 +20% · 피격 시 15% 확률로 4초간 받는 피해 -30%', st: { defPct: 20 }, procs: [{ on: 'hurt', ch: 15, act: 'drFor', v: 30, dur: 240, cd: 300 }] },
    o2: ['defPct', 'hpPct'], o3: ['dr', 'hpRegen', 'allStat'], o4: [['allSkill', 1], 'spDmg', 'basicDmg', 'aoe'],
    syn4: { t: '생문 개방 — 초당 체력 회복 +40 · 피격 시 20% 확률로 1초간 받는 피해 -70% (10초마다)', st: { hpRegen: 40 }, procs: [{ on: 'hurt', ch: 20, act: 'shield', v: 60, cd: 600 }] } },
  tongque: { add: { s: 'cape', n: '동작 비단 망토', af: [['fire', 1], ['cdr', 1]] },
    syn2: { t: '동작대의 연회 — 스킬 피해 +20% · 스킬 사용 시 25% 확률로 화염구', st: { skillDmg: 20 }, procs: [{ on: 'cast', ch: 25, act: 'fireball', v: 2 }] },
    o2: ['skillDmg', 'mpRegen'], o3: ['cdr', 'fire', 'ene'], o4: [['allSkill', 1], 'mpPct', 'spDmg', 'aoe'],
    syn4: { t: '패왕의 기개 — 화염구 확률 50% · 스킬 사용 시 12% 확률로 재사용 대기 없이 다시 시전', procs: [{ on: 'cast', ch: 25, act: 'fireball', v: 2.4 }, { on: 'cast', ch: 12, act: 'freeCast' }] } },
  tiangong: {
    syn2: { t: '천공의 뇌운 — 뇌전 피해 +30% · 타격 시 감전 확률 +15%', st: { bolt: 30, shockCh: 15 } },
    o2: ['bolt', 'shockCh'], o3: ['skillDmg', 'ene', 'cdr'], o4: [['tree1', 1], 'aoe', 'vsCtrl', 'mpRegen'],
    syn4: { t: '황천당립 — 적중 시 15% 확률로 낙뢰 3연격 · 필살기 사용 시 칠성 낙뢰', procs: [{ on: 'hit', ch: 15, act: 'bolt3', v: 1.6, cd: 40 }, { on: 'special', ch: 100, act: 'star7', v: 2, cd: 0 }] } },
  wushen: {
    syn2: { t: '무신의 위엄 — 공격력 +15% · 적 처치 시 30% 확률로 청룡파', st: { atkPct: 15 }, procs: [{ on: 'kill', ch: 30, act: 'gwave', v: 2.4 }] },
    o2: ['atkPct', 'critDmg'], o3: ['str', 'crit', 'ls'], o4: [['allSkill', 1], 'aoe', 'spDmg', 'bossDmg'],
    syn4: { t: '관성제군 — 청룡파 확률 +30% · 적중 시 5% 확률로 청룡파 · 필살기 피해 +50%', st: { spDmg: 50 }, procs: [{ on: 'kill', ch: 30, act: 'gwave', v: 2.4 }, { on: 'hit', ch: 5, act: 'gwave', v: 2, cd: 30 }] } },
};
for (const id in SET_DESIGN) { const st = SETS[id], D = SET_DESIGN[id]; if (!st) continue;
  if (D.add && !st.pieces.some(p => p.n === D.add.n)) st.pieces.push(D.add);
  Object.assign(st, { syn2: D.syn2, syn4: D.syn4, o2: D.o2, o3: D.o3, o4: D.o4, v2: true }); }

function setOptVal(k, L, gm, fixV) {
  const f = AF[k]; if (!f) return 0; if (f.fix) return fixV || 1;
  const x = f.f(L) * gm; return x < 10 ? Math.round(x * 10) / 10 : Math.round(x);
}
/* 세트 단계 목록: [{ n, gm, opts:[[k,v]], syn }] */
function setTiers(st, L) {
  if (!st.v2) return st.bonus.map(([n, b]) => ({ n, opts: Object.entries(b).filter(([k]) => k !== 'procs'), syn: b.procs ? { t: st.txt && st.txt[n], procs: b.procs } : null }));
  const mk = (n, list, syn) => ({ n, gm: SET_GM[n], syn, opts: list.map(o => { const [k, fv] = Array.isArray(o) ? o : [o, 0]; return [k, setOptVal(k, L, SET_GM[n], fv)]; }) });
  return [mk(2, st.o2, st.syn2), mk(3, st.o3, null), mk(4, st.o4, st.syn4)];
}
function applySetBonus(S, add, sid, cnt, L) {
  const st = SETS[sid]; if (!st) return;
  for (const t of setTiers(st, L)) { if (cnt < t.n) continue;
    for (const [k, v] of t.opts) add(k, v);
    const y = t.syn; if (!y) continue;
    for (const k in (y.st || {})) add(k, y.st[k]);
    if (y.pw) for (const k in y.pw) S.pw[k] = (S.pw[k] || 0) + y.pw[k];
    if (y.procs) S.procs.push(...y.procs.map(p => ({ ...p, src: 'set_' + sid + t.n }))); }
}
/* 툴팁용: 세트 효과 설명 */
function setTipLines(it, P) {
  const st = SETS[it.set], eq = P ? Object.values(P.rpg.eq).filter(q => q && q.set === it.set && canWear(P, q)) : [];
  const cnt = eq.length, L = cnt ? Math.round(eq.reduce((a, q) => a + q.il, 0) / cnt) : it.il, own = new Set(eq.map(q => q.n));
  const out = [`<span class="set">${st.n} (${cnt}/${st.pieces.length})</span>`];
  out.push(`<small class="setpcs">${st.pieces.map(p => `<span class="${own.has(p.n) ? 'on' : ''}">${p.n}</span>`).join(' · ')}</small>`);
  for (const t of setTiers(st, L)) {
    const on = cnt >= t.n, opts = t.opts.map(([k, v]) => afTxt(k, v)).join(' · ');
    out.push(`<span class="set ${on ? 'on' : ''}">(${t.n}) ${st.v2 ? `<em>${SET_TIER_NAME[t.n]}</em> ` : ''}${opts}</span>`);
    if (t.syn && t.syn.t) out.push(`<span class="set syn ${on ? 'on' : ''}">${t.n === 4 && st.v2 ? '◆◆' : '◆'} ${t.syn.t}</span>`);
  }
  if (st.v2) out.push(`<small class="dim">옵션 수치는 착용한 세트 부위의 평균 아이템 레벨(${L})로 계산됩니다</small>`);
  return out;
}
