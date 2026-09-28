'use strict';
/* ===== RPG 시스템: 성장 · 능력치 · 장비 생성 · 드랍 · 대장간 · 상인 · 도박장 · 저장 (원작 rpg.js 공식 준수) ===== */
const expNeed = l => Math.round(40 * l + 10 * l * l + .9 * l * l * l);
const expScale = L => expNeed(L) / 150 * (L > 60 ? Math.max(.35, 1 - (L - 60) / 60) : 1);
const hpMulL = L => 1.1 + (L - 1) * .22 + (L - 1) * (L - 1) * .0066;
const powMulL = L => 1 + (L - 1) * .18 + (L - 1) * (L - 1) * .004;
const HERO_WT = { guan: 'halberd', zhang: 'spear', zhao: 'spear', huang: 'dao', zhuge: 'fan', ma: 'spear', diao: 'sword', wei: 'dao', lubu: 'halberd', xu: 'axe', gan: 'whip', sun: 'bow' };
const WPN_BAL = { sword: [.93, 1.15, .9], dao: [.98, 1.05, .95], spear: [.94, 1, 1.12], snake: [.95, 1, 1.08], halberd: [1.02, .92, 1.12], glaive: [1, .95, 1.1], bigdao: [1.1, .9, 1],
  axe: [1.2, .85, .95], mace: [1.2, .88, .9], whip: [.88, 1, 1.25], bow: [.95, 1.05, 1], fan: [.97, 1.1, .9], staff: [1.03, 1, .95] };
const WT_MODEL = { sword: 'sword', dao: 'dao', spear: 'spear', halberd: 'halberd', axe: 'axe', whip: 'whip', bow: 'bow', fan: 'fan' };
const SHOP = [
  { k: 'elixir', n: '선단', d: '체력 60% 회복', p: () => 120, inv: 'elixir', q: 1 }, { k: 'wine', n: '술', d: '기력 +50', p: () => 80, inv: 'wine', q: 1 },
  { k: 'knife', n: '비도 ×5', d: '앞으로 던지는 단검', p: () => 60, inv: 'knife', q: 5 }, { k: 'bomb', n: '화약통 ×2', d: '포물선 폭발', p: () => 100, inv: 'bomb', q: 2 },
  { k: 'tactic', n: '병법서', d: '10초간 공격력 1.5배', p: () => 150, inv: 'tactic', q: 1 }, { k: 'shield', n: '금강부', d: '8초간 받는 피해 -70%', p: () => 150, inv: 'shield', q: 1 },
  { k: 'stone', n: '강화석', d: '대장간 강화 재료', p: l => 150 + 5 * l, mat: 'stone' }, { k: 'frag', n: '비급 조각', d: '재련 · 스킬 강화 재료', p: l => 600 + 20 * l, mat: 'frag' },
  { k: 'silk', n: '비단 보따리', d: '무작위 장비 1개', p: l => 300 + 40 * l, box: 'silk' }, { k: 'goldbox', n: '황금 보따리', d: '에픽 이상 보장', p: l => 3000 + 300 * l, box: 'gold' },
  { k: 'book', n: '비급서', d: '스킬 포인트 +1', p: (l, P) => 3000 * (1 + (P.rpg.books || 0)), sp: 1 }, { k: 'forget', n: '망각의 물약', d: '능력치 · 스킬 포인트 전부 초기화', p: l => 1000 + 50 * l, reset: 1 }];
const INV_KEYS = ['knife', 'bomb', 'wine', 'elixir', 'tactic', 'haste', 'shield', 'tcharm'];

/* ---------- 플레이어 생성 ---------- */
function newPlayer(hi) {
  const h = HEROES[hi], A = HATTR[h.id];
  const sk = {}; sk[`${h.id}_00`] = 1;
  return { hero: hi, lvl: 1, exp: 0, score: 0, inv: { knife: 3, bomb: 1 }, sel: 0,
    rpg: { str: A[0], dex: A[1], vit: A[2], ene: A[3], statPts: 0, skillPts: 1, sk, enh: {}, hot: [null, null, null, null], eq: {}, bag: [], mats: { stone: 0, frag: 0 }, gold: 200, books: 0, pity: 0 } };
}
/* ---------- 스킬 레벨 ---------- */
function effSkillLv(P, s, S) { const r = P.rpg.sk[s.id] || 0; if (!r) return 0; return r + (S ? (S.allSkill || 0) + (S['tree' + s.tr] || 0) : 0); }
function canLearn(P, s) {
  const r = P.rpg.sk[s.id] || 0; if (P.rpg.skillPts <= 0 || r >= s.max) return false; if (P.lvl < s.lv) return false; if (r + 1 > P.lvl - s.lv + 1) return false;
  if (s.ti > 0) { const prev = SKT[s.hero][s.tr][s.ti - 1]; if (!(P.rpg.sk[prev.id] > 0)) return false; }
  return true;
}
/* ---------- 능력치 계산 ---------- */
function itemAffixes(it) {
  const out = []; const em = 1 + .03 * (it.e || 0);
  for (const [k, v] of it.af) out.push([k, AF[k] && AF[k].fix ? v : v * em]);
  return out;
}
function itemBase(it) { const m = 1 + .1 * (it.e || 0); return { atk: (it.at.atk || 0) * m, def: (it.at.def || 0) * m }; }
function calcStats(P, rt) {
  const h = HEROES[P.hero], A = HATTR[h.id], R = P.rpg, S = {};
  const add = (k, v) => { S[k] = (S[k] || 0) + v; };
  S.procs = []; S.pw = {};
  let atk = 0, def = 0;
  const setCount = {};
  for (const sl of EQ_SLOTS) { const it = R.eq[sl]; if (!it) continue; if (it.rq > P.lvl) continue; if (it.h && it.h !== h.id) continue;
    const b = itemBase(it); atk += b.atk; def += b.def;
    for (const [k, v] of itemAffixes(it)) add(k, v);
    if (it.set) setCount[it.set] = (setCount[it.set] || 0) + 1;
    if (it.u && UNIQ[it.u]) { const U = UNIQ[it.u]; if (U.procs) S.procs.push(...U.procs.map(p => ({ ...p, src: it.u }))); if (U.pw) for (const k in U.pw) { if (AF[k]) add(k, U.pw[k]); else S.pw[k] = (S.pw[k] || 0) + U.pw[k]; } if (U.spx) S.spx = U.spx; }
  }
  S.sets = setCount;
  for (const sid in setCount) { const st = SETS[sid]; if (!st) continue; for (const [n, b] of st.bonus) if (setCount[sid] >= n) for (const k in b) { if (k === 'procs') S.procs.push(...b.procs); else add(k, b[k]); } }
  /* 패시브 · 오라(스탯) · 활성 버프 */
  for (const s of HSK[h.id]) { const lv = effSkillLv(P, s, null); if (!lv) continue; const L2 = lv + (S.allSkill || 0) + (S['tree' + s.tr] || 0);
    if (s.ty === 'passive' || (s.ty === 'aura' && s.aura === 'stat')) for (const k in s.mods) add(k, s.mods[k][0] + s.mods[k][1] * (L2 - 1));
    if (s.ty === 'basic') add('basicDmg', s.v * L2); if (s.ty === 'cmd') add('cmdDmg', s.v * L2); if (s.ty === 'sp') add('spDmg', s.v * L2); }
  if (rt && rt.buffs) for (const b of rt.buffs) for (const k in b.mods) add(k, b.mods[k]);
  const al = S.allStat || 0;
  const str = R.str + (S.str || 0) + al, dex = R.dex + (S.dex || 0) + al, vit = R.vit + (S.vit || 0) + al, ene = R.ene + (S.ene || 0) + al;
  const L = P.lvl, T0 = G.treasures || {};
  S.str = str; S.dex = dex; S.vit = vit; S.ene = ene;
  S.pow = h.pow + (L - 1) * .6 + (str - A[0]) * .4 + atk + (S.atk || 0) + (T0.sword ? 4 : 0);
  S.maxhp = Math.round((h.hp + (L - 1) * h.hp * .05 + (vit - A[2]) * 3 + (S.hp || 0)) * (1 + (S.hpPct || 0) / 100));
  S.maxmp = Math.round((40 + (L - 1) * 3 + (ene - A[3]) * 2.5 + (S.mp || 0)) * (1 + (S.mpPct || 0) / 100));
  S.maxki = Math.round(100 + (L - 1) + (S.ki || 0));
  S.def = Math.round((def + (S.def || 0) + vit * .3 + dex * .3) * (1 + (S.defPct || 0) / 100));
  S.crit = Math.min(75, 5 + dex * .08 + (S.crit || 0)); S.critDmg = 50 + (S.critDmg || 0);
  S.dodge = Math.min(35, dex * .04 + (S.dodge || 0)); S.mspd = Math.min(80, dex * .04 + (S.mspd || 0));
  S.ls = Math.min(15, S.ls || 0); S.dr = Math.min(60, (S.dr || 0) + (G.flags.hy === 'gi' ? 5 : 0)); S.cdr = Math.min(50, S.cdr || 0); S.aoe = Math.min(100, S.aoe || 0);
  S.skillDmg = ene * .8 + (S.skillDmg || 0); S.pickR = 70 + (S.pickR || 0);
  S.hpRegen = (S.hpRegen || 0) + vit * .03; S.mpRegen = (1 + S.maxmp * .012) * (1 + (S.mpRegen || 0) / 100); S.kiRegen = S.kiRegen || 0;
  S.atkPct = (S.atkPct || 0) + (G.flags.hy === 'pae' ? 5 : 0);
  const eqW = R.eq.weapon && R.eq.weapon.rq <= L ? R.eq.weapon : null;
  S.wt = eqW && eqW.wt ? eqW.wt : null;
  const bal = S.wt && S.wt !== HERO_WT[h.id] ? WPN_BAL[S.wt] : null, base = WPN_BAL[HERO_WT[h.id]] || [1, 1, 1];
  S.wAtk = bal ? bal[0] / base[0] : 1; S.wSpd = bal ? bal[1] / base[1] : 1; S.wReach = bal ? bal[2] / base[2] : 1;
  S.spd = (h.spd + (T0.horse ? .7 : 0)) * (1 + clamp(S.mspd, -60, 120) / 100);
  return S;
}
/* ---------- 장비 생성 ---------- */
let ITEM_ID = 1;
const AFR = (k, L, gm) => { const f = AF[k]; if (f.fix) return 1; let v = f.f(L) * gm * rand(.55, 1); return v < 10 ? Math.round(v * 10) / 10 : Math.round(v); };
function baseTier(L) { let t = 0; BASE_TIER.forEach((b, i) => { if (L >= b) t = i; }); if (t > 0 && Math.random() < .3) t--; return t; }
function pickSlot() { const ws = Object.entries(SLOTS), tot = ws.reduce((a, [, s]) => a + s.w, 0); let r = Math.random() * tot; for (const [k, s] of ws) { r -= s.w; if (r <= 0) return k; } return 'weapon'; }
function genItem(il, g, o = {}) {
  il = Math.max(1, Math.min(100, Math.round(il)));
  if (g === 'set' || g === 'excl' || g === 'myth') return genSpecial(il, g, o);
  const s = o.slot || pickSlot(), G0 = GRADES[g], tier = baseTier(il);
  const it = { id: ITEM_ID++, s, g, il, rq: g === 'epic' ? Math.max(1, il - 1) : Math.max(1, il - ((Math.random() * 4) | 0)), at: {}, af: [], e: 0, nw: true };
  if (s === 'weapon') { const wt = o.wt || pick(Object.keys(WTYPES)); it.wt = wt; it.b = WBASES[wt][tier]; it.at.atk = Math.round((3 + il) * rand(.85, 1.1) * G0.bm); it.af.push([WTYPES[wt].af, AFR(WTYPES[wt].af, il, G0.m * rand(.5, .8))]); }
  else { it.b = BASES[s][tier]; if (SLOTS[s].def) it.at.def = Math.round((3 + 1.2 * il) * SLOTS[s].def * rand(.85, 1.1) * G0.bm); }
  const n = G0.afx ? G0.afx[0] + ((Math.random() * (G0.afx[1] - G0.afx[0] + 1)) | 0) : 0;
  const pool = AF_POOL[s].filter(k => (g === 'epic' || !HI_AF[k]) && !it.af.some(a => a[0] === k));
  for (let i = 0; i < n && pool.length; i++) { const k = pool.splice((Math.random() * pool.length) | 0, 1)[0]; it.af.push([k, AFR(k, il, G0.m)]); }
  if (s === 'book' && !it.af.some(a => a[0].startsWith('tree'))) it.af.push(['tree' + ((Math.random() * 3) | 0), g === 'epic' && Math.random() < .5 ? 2 : 1]);
  it.n = itemName(it); return it;
}
function itemName(it) {
  if (it.g === 'rare') { const k = it.af.find(a => AF_PRE[a[0]]); return (k ? AF_PRE[k[0]] + ' ' : '') + it.b; }
  if (it.g === 'epic') return `${pick(EPIC_TITLE)}의 ${it.b}`;
  return it.b;
}
function genSpecial(il, g, o) {
  let key, U, setId, piece;
  if (g === 'set') { const ids = Object.keys(SETS).filter(k => SETS[k].req <= il + 12); setId = o.set || pick(ids.length ? ids : Object.keys(SETS)); const st = SETS[setId]; piece = o.piece != null ? st.pieces[o.piece] : pick(st.pieces);
    const L = Math.max(il, st.req), gm = GRADES.set.m;
    const it = { id: ITEM_ID++, s: piece.s === 'ring' ? 'ring' : piece.s, g, il: L, rq: st.req, set: setId, n: piece.n, b: piece.n, at: {}, af: [], e: 0, nw: true };
    if (it.s === 'weapon') { it.wt = o.wt || 'dao'; it.at.atk = Math.round((3 + L) * rand(.95, 1.1) * GRADES.set.bm); }
    else if (SLOTS[it.s].def) it.at.def = Math.round((3 + 1.2 * L) * SLOTS[it.s].def * rand(.95, 1.1) * GRADES.set.bm);
    for (const [k, m] of piece.af) it.af.push([k, AF[k].fix ? m : Math.round(AF[k].f(L) * m * gm * rand(.85, 1) * 10) / 10]);
    return it; }
  const heroes = o.heroes || [G.pl ? HEROES[G.pl.hero].id : 'guan'];
  const pool = UNIQ_BY_G[g].filter(k => { const u = UNIQ[k]; return (!u.h || heroes.includes(u.h)) && u.req <= Math.max(il + 15, g === 'myth' ? 70 : 30); });
  key = o.u || pick(pool.length ? pool : UNIQ_BY_G[g].filter(k => !UNIQ[k].h || heroes.includes(UNIQ[k].h)));
  U = UNIQ[key]; const L = Math.max(il, U.req), gm = GRADES[g].m;
  const it = { id: ITEM_ID++, s: U.s, g, il: L, rq: U.req, u: key, h: U.h || null, n: U.n, b: U.n, at: {}, af: [], e: 0, nw: true };
  if (U.s === 'weapon') { it.wt = U.h ? HERO_WT[U.h] : pick(['sword', 'dao', 'spear', 'halberd']); it.at.atk = Math.round((3 + L) * rand(.95, 1.1) * GRADES[g].bm); }
  else if (SLOTS[U.s] && SLOTS[U.s].def) it.at.def = Math.round((3 + 1.2 * L) * SLOTS[U.s].def * rand(.95, 1.1) * GRADES[g].bm);
  for (const [k, m] of U.af) it.af.push([k, AF[k].fix ? m : Math.round(AF[k].f(L) * m * gm * rand(.85, 1) * 10) / 10]);
  return it;
}
function rollGrade(tbl, mf) {
  const f = 1 + (mf || 0) / 100, c = 1 + .3 * (G.cycle || 0);
  const T0 = { normal: { normal: 62, rare: 28 * f, epic: 7 * f * c, set: 1.4 * f * c, excl: .9 * f * c, myth: .2 * f * c },
    elite: { rare: 55, epic: 22 * f * c, set: 4 * f * c, excl: 2.5 * f * c, myth: .6 * f * c },
    boss: { rare: 40, epic: 40 * f * c, set: 10 * f * c, excl: 7 * f * c, myth: 2.5 * f * c },
    silk: { normal: 25, rare: 45, epic: 22 * f, set: 4 * f, excl: 2.5 * f, myth: .8 * f },
    gold: { epic: 70, set: 15, excl: 10, myth: 5 }, gacha: { rare: 55, epic: 30, set: 8, excl: 5, myth: 2 }, gacha10: { set: 60, excl: 28, myth: 12 }, pity: { excl: 60, myth: 40 } }[tbl];
  const tot = Object.values(T0).reduce((a, b) => a + b, 0); let r = Math.random() * tot;
  for (const k in T0) { r -= T0[k]; if (r <= 0) return k; } return 'rare';
}
/* ---------- 강화 · 재련 · 분해 · 판매 ---------- */
const ENH_RATE = [100, 100, 95, 90, 80, 70, 60, 50, 40, 35, 30, 25, 20, 15, 10];
const enhCost = it => ({ gold: Math.round((40 + it.il * 8) * ((it.e || 0) + 1) * (1 + (it.e || 0) * .25)), stone: 1 + Math.floor((it.e || 0) / 2) });
function enhance(P, it) {
  const e = it.e || 0; if (e >= 15) return { ok: false, msg: '최대 강화입니다.' };
  const c = enhCost(it), R = P.rpg; if (R.gold < c.gold || R.mats.stone < c.stone) return { ok: false, msg: '금화 또는 강화석이 부족합니다.' };
  R.gold -= c.gold; R.mats.stone -= c.stone;
  if (Math.random() * 100 < ENH_RATE[e]) { it.e = e + 1; return { ok: true, up: true, msg: `강화 성공! +${it.e}` }; }
  if (e >= 7) { it.e = e - 1; return { ok: true, up: false, msg: `강화 실패… +${it.e}로 하락` }; }
  return { ok: true, up: false, msg: '강화 실패 (단계 유지)' };
}
const rerollCost = it => ({ gold: 80 + it.il * 12, frag: 1 + GRADES[it.g].rank });
function reroll(P, it) {
  if (it.g !== 'rare' && it.g !== 'epic') return { ok: false, msg: '레어 · 에픽만 재련할 수 있습니다.' };
  const c = rerollCost(it), R = P.rpg; if (R.gold < c.gold || R.mats.frag < c.frag) return { ok: false, msg: '금화 또는 비급 조각이 부족합니다.' };
  R.gold -= c.gold; R.mats.frag -= c.frag;
  const nu = genItem(it.il, it.g, { slot: it.s, wt: it.wt }); it.af = nu.af; it.n = nu.n; it.b = nu.b; return { ok: true, msg: '재련 완료 — 옵션이 새로 정해졌습니다.' };
}
const sellPrice = it => Math.round((10 + it.il * 3) * GRADES[it.g].sell * (1 + (it.e || 0) * .3));
function dismantleYield(it) { const r = GRADES[it.g].rank; return { stone: [1, 2, 3, 3, 4, 6][r] + Math.floor((it.e || 0) / 2), frag: [0, 0, 1, 2, 3, 6][r] }; }
/* ---------- 스킬 강화 ---------- */
const SENH_RATE = [100, 100, 90, 80, 70, 60, 50, 40, 30, 25];
const senhCost = e => ({ gold: 150 * (e + 1) * (e + 1), frag: e + 1 });
/* ---------- 전투력 · 추천 장착 ---------- */
function power(P) { const S = calcStats(P); return Math.round(S.pow * (1 + S.atkPct / 100) * (1 + S.crit / 100 * S.critDmg / 100) * 6 + S.maxhp * .8 + S.def * 2 + S.maxmp * .3); }
function canWear(P, it) { return it.rq <= P.lvl && (!it.h || it.h === HEROES[P.hero].id); }
function slotFor(it, P) { if (it.s !== 'ring') return it.s; const R = P.rpg; return !R.eq.ring1 ? 'ring1' : !R.eq.ring2 ? 'ring2' : 'ring1'; }
function equip(P, it, slot) {
  const R = P.rpg; slot = slot || slotFor(it, P); const old = R.eq[slot];
  R.bag = R.bag.filter(b => b !== it); R.eq[slot] = it; if (old) R.bag.push(old); it.nw = false;
}
function unequip(P, slot) { const R = P.rpg; if (R.eq[slot]) { R.bag.push(R.eq[slot]); delete R.eq[slot]; } }
function recommendEquip(P) {
  let changed = 0, guard = 0;
  for (;;) { if (guard++ > 40) break; let best = null, bestGain = 0; const base = power(P);
    for (const it of P.rpg.bag) { if (!canWear(P, it)) continue; const slots = it.s === 'ring' ? ['ring1', 'ring2'] : [it.s];
      for (const sl of slots) { const R = P.rpg, old = R.eq[sl]; R.eq[sl] = it; const g2 = power(P) - base; if (old) R.eq[sl] = old; else delete R.eq[sl]; if (g2 > bestGain + .5) { bestGain = g2; best = [it, sl]; } } }
    if (!best) break; equip(P, best[0], best[1]); changed++; }
  return changed;
}
/* ---------- 드랍 ---------- */
function rollDrops(e, S) {
  const out = [], L = e.lv || 1, mf = S.mf || 0, dr = DIFFS[G.diffIdx].drop;
  let n = 0, tbl = 'normal';
  if (e.boss && !e.mid) { n = 3 + (Math.random() < .5 ? 1 : 0); tbl = 'boss'; }
  else if (e.mid) { n = 2; tbl = 'elite'; }
  else if (e.elite) { n = 1 + (Math.random() < .35 ? 1 : 0); tbl = 'elite'; }
  else if (e.officer) { n = Math.random() < .45 ? 1 : 0; tbl = 'normal'; }
  else n = Math.random() < .07 * dr * (1 + mf / 250) ? 1 : 0;
  for (let i = 0; i < n; i++) { let g = rollGrade(tbl, mf); out.push({ kind: 'gear', item: genItem(L + (e.boss ? 2 : 0), g) }); }
  const coins = e.boss && !e.mid ? 6 : (e.elite || e.mid) ? 3 : e.officer ? 2 : Math.random() < .35 ? 1 : 0;
  for (let i = 0; i < coins; i++) out.push({ kind: 'coin', v: Math.round(rand(3, 8) * (1 + L * .35) * (1 + (S.gf || 0) / 100) * (e.boss ? 2 : 1)) });
  if (e.boss && !e.mid) { out.push({ kind: 'mat', m: 'stone', v: 2 + ((Math.random() * 3) | 0) }); out.push({ kind: 'mat', m: 'frag', v: 1 + (G.cycle >= 1 ? 1 : 0) }); }
  else if ((e.elite || e.officer || e.mid) && Math.random() < .3) out.push({ kind: 'mat', m: Math.random() < .8 ? 'stone' : 'frag', v: 1 });
  return out;
}
/* ---------- 문자열 ---------- */
const afTxt = (k, v) => { const a = AF[k]; if (!a) return `${k} ${v}`; const val = a.fix ? v : (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)); return `${a.n} ${a.pre || '+'}${val}${a.u || ''}`; };
function itemTip(it, P) {
  const G0 = GRADES[it.g], bad = P && !canWear(P, it);
  const b = itemBase(it), lines = [];
  lines.push(`<b style="color:${G0.c}">${it.n}${it.e ? ` +${it.e}` : ''}</b>`);
  lines.push(`<small>${G0.n} · ${SLOTS[it.s === 'ring' ? 'ring' : it.s].n}${it.wt ? ' · ' + WTYPES[it.wt].n : ''} · 아이템 레벨 ${it.il}</small>`);
  if (b.atk) lines.push(`<span class="big">공격력 ${Math.round(b.atk)}</span>`); if (b.def) lines.push(`<span class="big">방어력 ${Math.round(b.def)}</span>`);
  for (const [k, v] of itemAffixes(it)) lines.push(`<span class="af">${afTxt(k, v)}</span>`);
  if (it.u && UNIQ[it.u]) for (const tx of UNIQ[it.u].txt || []) lines.push(`<span class="proc">◆ ${tx}</span>`);
  if (it.set) { const st = SETS[it.set], cnt = P ? (calcStats(P).sets[it.set] || 0) : 0; lines.push(`<span class="set">${st.n} (${cnt}/${st.pieces.length})</span>`);
    for (const [n, bn] of st.bonus) lines.push(`<span class="set ${cnt >= n ? 'on' : ''}">(${n}) ${st.txt && st.txt[n] ? st.txt[n] : Object.entries(bn).filter(([k]) => k !== 'procs').map(([k, v]) => afTxt(k, v)).join(' · ')}</span>`); }
  if (it.wt && P) { const hw = HERO_WT[HEROES[P.hero].id]; if (it.wt !== hw) { const bl = WPN_BAL[it.wt], bs = WPN_BAL[hw]; lines.push(`<span class="af">무기 특성: 공격 ×${(bl[0] / bs[0]).toFixed(2)} · 속도 ×${(bl[1] / bs[1]).toFixed(2)} · 사거리 ×${(bl[2] / bs[2]).toFixed(2)}</span>`); } }
  lines.push(`<small class="${bad ? 'bad' : ''}">착용 레벨 ${it.rq}${it.h ? ` · ${HEROES.find(h => h.id === it.h).name} 전용` : ''}</small>`);
  lines.push(`<small>판매 ${sellPrice(it)} 금화</small>`);
  return lines.join('<br>');
}
/* ---------- 저장 ---------- */
const SAVE_KEY = i => 'kov3d_save_' + i;
function saveGame(slot) {
  try { const d = { v: 3, t: Date.now(), diffIdx: G.diffIdx, cycle: G.cycle, prog: G.prog, done: G.done, treasures: G.treasures, clears: G.clears, flags: G.flags, lampSaved: G.lampSaved, pl: G.pl, iid: ITEM_ID };
    localStorage.setItem(SAVE_KEY(slot), JSON.stringify(d)); return true; } catch (e) { return false; }
}
function loadSlot(slot) { try { const s = localStorage.getItem(SAVE_KEY(slot)); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function slotInfo(slot) { const d = loadSlot(slot); if (!d) return null; const h = HEROES[d.pl.hero];
  const st = d.done ? '천하 평정' : STAGES[ORDER[Math.min(d.prog || 0, ORDER.length - 1)]].title.replace(/\s+/g, ' ');
  return `${h.name} Lv.${d.pl.lvl} · ${cycleName(d.cycle || 0)} · ${st} · ${DIFFS[d.diffIdx].name} · ${new Date(d.t).toLocaleString('ko-KR')}`; }
function getPref(k, d) { try { const v = localStorage.getItem('kov3d_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function setPref(k, v) { try { localStorage.setItem('kov3d_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
