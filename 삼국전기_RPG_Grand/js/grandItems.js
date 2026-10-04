'use strict';
/* ===== 아이템 재구성 =====
   1. 종류 증가: 부위 · 단계마다 기본 장비 이름 2종 추가 · 새 옵션 5종(정예 · 빈사 피해, 처치 시 체력 · 내공 · 기력) · 새 세트 8종 · 새 신화 10종
   2. 세트 효과 강화: 기존 세트 보너스 수치 ×1.5 (발동 확률 · 위력 ×1.3) + 풀세트 보너스 추가
   3. 레벨 맞춤 장비: 드랍 · 도박 장비는 얻는 시점의 레벨에 맞춰 나오고, 세트 · 전용 · 신화도 낮은 레벨에서 나와 쓸 수 있다
      (높은 레벨에서 얻을수록 능력치 · 고유 효과가 강함)
   4. 히든 코드 Ctrl+Alt+Shift+' : 강화 확률 100% ↔ 원래대로 */

/* ---------- 1-a. 기본 장비 이름 변형 (단계별 2종 추가) ---------- */
const BASE_VAR={
 armor:[['솜옷','마포 전의'],['피갑','수피 흉갑'],['편갑','소찰갑'],['연환갑','쇄린갑'],['명광 흉갑','호심경 갑'],['금린갑','은린갑'],['황금 용린갑','천룡갑']],
 helm:[['머리띠','삿갓'],['피모','가죽 관'],['철관','첨주'],['봉익 투구','호두 투구'],['사자 투구','웅두 투구'],['은 투구','봉황 투구'],['천룡 투구','금룡관']],
 gloves:[['베 장갑','손목 띠'],['피 수갑','가죽 토시'],['철 토시','강철 수갑'],['연환 수갑','쇄린 토시'],['호심 수갑','금강 토시'],['금린 수갑','은룡 토시'],['천룡 수갑','신잠 장갑']],
 boots:[['나막신','베 신'],['피화','가죽 각반'],['강철 장화','철 각반'],['군화','전마 장화'],['비연화','추풍화'],['만리화','축지화'],['비룡화','천마화']],
 belt:[['새끼 허리띠','베 요대'],['피 요대','수렵 요대'],['강철 요대','쇠사슬 요대'],['호두 요대','맹수 요대'],['백옥 요대','청옥 요대'],['은 요대','봉황 요대'],['천룡 요대','제왕 요대']],
 cape:[['거친 망토','도롱이'],['베 망토','군용 망토'],['명주 망토','수 망토'],['표피 망토','웅피 망토'],['은사 망토','공작 망토'],['주작 망토','학창의'],['천잠 망토','선녀 날개옷']],
 neck:[['조개 목걸이','뼈 목걸이'],['청동 패','동경 목걸이'],['은 패','수정 목걸이'],['비취 목걸이','호박 목걸이'],['금 패','산호 목걸이'],['야명주 목걸이','진주 목걸이'],['천룡주','여의 목걸이']],
 ring:[['나무 가락지','뼈 반지'],['구리 가락지','은 지환'],['청동 지환','철 인장'],['비취 가락지','호박 반지'],['금 지환','홍옥 반지'],['야명주 가락지','청옥 반지'],['천룡 지환','여의 가락지']],
 book:[['죽간','잡기'],['병법 초록','진법 요해'],['오자 주해','울료자'],['삼략 비전','육도 진본'],['신서 주해','둔갑 비결'],['기문둔갑서','천문 비서'],['황석공 소서','천서 진본']]};

/* ---------- 1-b. 새 옵션 ---------- */
Object.assign(AF,{
 eliteDmg:{n:'정예 · 보스 대상 피해',u:'%',f:L=>6+L*.3},
 execDmg:{n:'빈사(체력 30% 이하) 적에게 피해',u:'%',f:L=>8+L*.35},
 healKill:{n:'적 처치 시 체력 회복',f:L=>3+L*.5},
 mpKill:{n:'적 처치 시 내공 회복',f:L=>2+L*.3},
 kiKill:{n:'적 처치 시 기력 회복',f:L=>2+L*.06}});
Object.assign(AF_PRE,{eliteDmg:'사냥꾼의',execDmg:'처형자의',healKill:'흡혼의',mpKill:'현기의',kiKill:'투혼의'});
for(const [s,ks] of Object.entries({weapon:['eliteDmg','execDmg'],gloves:['execDmg','healKill'],ring:['healKill','mpKill'],neck:['mpKill','eliteDmg'],
  belt:['healKill','kiKill'],boots:['kiKill'],helm:['mpKill'],cape:['eliteDmg'],armor:['healKill']}))for(const k of ks)if(!AF_POOL[s].includes(k))AF_POOL[s].push(k);
const GI_NEWK=['eliteDmg','execDmg','healKill','mpKill','kiKill'];

Object.assign(ON_TXT,Object.assign({lowhp:'체력 30% 이하 시',special:'필살기 사용 후'},ON_TXT));
/* ---------- 2. 세트: 기존 보너스 강화 + 새 세트 ---------- */
const GI_INT={allSkill:1,tree0:1,tree1:1,tree2:1};
const giModsText=mods=>{const a=Object.entries(mods).filter(([k])=>k!=='procs').map(([k,v])=>k==='burnPct'?`화상 피해 +${v}%`:afText(k,v,0));
  for(const pr of mods.procs||[])a.push(exclTxt(pr));return a.join(' · ')};
for(const k in SETS){const S=SETS[k];
  for(const b of S.bonus){const mods=b[1];
    for(const kk in mods){if(kk==='procs')mods.procs=mods.procs.map(p=>Object.assign({},p,{ch:Math.min(100,Math.round(p.ch*1.3)),v:+(p.v*1.3).toFixed(2)}));
      else if(!GI_INT[kk])mods[kk]=Math.round(mods[kk]*1.5)}}
  const full=S.pieces.length,fb={atkPct:15,hpPct:15,dr:5,eliteDmg:20};
  const last=S.bonus.find(b=>b[0]===full);if(last)for(const kk in fb)last[1][kk]=(last[1][kk]||0)+fb[kk];else S.bonus.push([full,fb]);
}
const GIP=(s,n,af)=>({s,n,af});
Object.assign(SETS,{
 hulao:{n:'호뢰관 결전(虎牢關)',req:12,pieces:[GIP('weapon','호뢰 대극',[['atk',1.1],['critDmg',1]]),GIP('helm','호뢰 투구',[['hp',1],['crit',1]]),GIP('boots','호뢰 전화',[['mspd',1],['dex',1]])],
  bonus:[[2,{atkPct:25,eliteDmg:30}],[3,{critDmg:80,atkPct:15,hpPct:15,procs:[{on:'crit',ch:25,act:'redslash',v:1.8,cd:40}]}]]},
 changban:{n:'장판파(長坂坡)',req:18,pieces:[GIP('helm','장판 투구',[['hp',1.2],['vit',1]]),GIP('armor','장판 철갑',[['def',1.2],['hpPct',1]]),GIP('cape','장판 전포',[['dr',1],['thorns',1.2]])],
  bonus:[[2,{hpPct:25,thorns:250}],[3,{dr:15,atkPct:15,healKill:40,procs:[{on:'hurt',ch:30,act:'nova',v:2.2,cd:90}]}]]},
 nanman:{n:'남만 정벌(南蠻征伐)',req:22,pieces:[GIP('boots','남만 짚신',[['mspd',1.1],['dodge',1]]),GIP('belt','남만 짐승 요대',[['hpRegen',1.2],['healKill',1]]),GIP('helm','맹획의 깃관',[['hp',1],['eliteDmg',1]])],
  bonus:[[2,{hpRegen:50,mspd:15}],[3,{ls:5,healKill:60,hpPct:20,atkPct:15}]]},
 guandu:{n:'관도대전(官渡大戰)',req:30,pieces:[GIP('armor','관도 철갑',[['def',1.2],['hpPct',1]]),GIP('belt','관도 군량 요대',[['hp',1],['kiGain',1]]),GIP('ring','원소의 인장',[['crit',1],['eliteDmg',1]]),GIP('neck','허유의 밀서',[['skillDmg',1],['mpKill',1]])],
  bonus:[[2,{hpPct:25,dr:8}],[3,{eliteDmg:45,healKill:50}],[4,{allSkill:1,atkPct:20,procs:[{on:'kill',ch:35,act:'explode',v:2}]}]]},
 hefei:{n:'합비 돌파(合肥突破)',req:42,pieces:[GIP('gloves','장료의 수갑',[['atkPct',1],['execDmg',1]]),GIP('boots','소요진 전화',[['mspd',1.2],['dashDmg',1]]),GIP('weapon','합비 월도',[['atk',1.1],['crit',1]]),GIP('belt','팔백 결사대 요대',[['kiKill',1.2],['hp',1]])],
  bonus:[[2,{mspd:20,dashDmg:80}],[3,{atkPct:35,execDmg:60}],[4,{kiKill:25,crit:10,procs:[{on:'kill',ch:100,act:'buffAtk',v:45,dur:240,cd:0}]}]]},
 qishan:{n:'기산 북벌(祁山北伐)',req:58,pieces:[GIP('book','출사표',[['allSkill',1],['cdr',1]]),GIP('neck','목우유마 도면',[['skillDmg',1.2],['mpKill',1]]),GIP('cape','북벌 학창의',[['bolt',1.2],['dr',1]]),GIP('ring','강유의 가락지',[['crit',1],['ene',1]])],
  bonus:[[2,{skillDmg:40,cdr:15}],[3,{bolt:60,mpKill:30,shockCh:25}],[4,{allSkill:2,hpPct:20,procs:[{on:'cast',ch:35,act:'bolt3',v:1.8}]}]]},
 yiling:{n:'이릉 화공(夷陵火攻)',req:68,pieces:[GIP('weapon','육손의 보검',[['atk',1.2],['fire',1.3]]),GIP('neck','연영 칠백리 부적',[['fire',1.2],['skillDmg',1]]),GIP('cape','화염 전포',[['fire',1],['dr',1]]),GIP('gloves','화공 수갑',[['atkPct',1],['burnCh',1.2]]),GIP('ring','백제성 가락지',[['crit',1],['fire',1]])],
  bonus:[[2,{fire:60}],[3,{burnCh:40,burnPct:150}],[4,{fire:60,skillDmg:40}],[5,{allSkill:2,atkPct:30,hpPct:20,procs:[{on:'hit',ch:15,act:'fireball',v:2.4,cd:30}]}]]},
 luoyang:{n:'낙양 황궁(洛陽皇宮)',req:85,pieces:[GIP('helm','천자의 면류관',[['allStat',1.2],['hp',1]]),GIP('armor','곤룡포',[['hpPct',1.2],['def',1]]),GIP('neck','전국옥새 끈',[['allSkill',1],['mf',1]]),
   GIP('ring','황실 지환',[['crit',1.2],['gf',1]]),GIP('book','한서 원본',[['allSkill',1],['skillDmg',1]]),GIP('belt','옥대',[['hpPct',1],['kiKill',1]])],
  bonus:[[2,{gf:80,mf:80}],[4,{allStat:40,dr:15,eliteDmg:40}],[6,{allSkill:3,atkPct:50,hpPct:50,procs:[{on:'crit',ch:20,act:'star7',v:1.8,cd:120}]}]]}});
Object.assign(SET_MARK,{hulao:['虎','#ff7040'],changban:['坂','#c0d8ff'],nanman:['蠻','#7ac050'],guandu:['官','#d8b060'],hefei:['合','#6aa0ff'],qishan:['祁','#b8a0ff'],yiling:['夷','#ff6030'],luoyang:['洛','#ffe070']});
for(const k in SETS){const S=SETS[k];S.txt=S.txt||{};for(const [n,mods] of S.bonus)S.txt[n]=giModsText(mods)}

/* ---------- 1-c. 새 신화 ---------- */
const GI_MYTH={
 m_qinggang:{n:'청강검(靑釭劍)',s:'weapon',req:60,af:[['atk',1.6],['crit',1.6],['critDmg',1.4],['allSkill',1],['execDmg',1.5]],procs:[{on:'crit',ch:22,act:'redslash',v:2,cd:35}]},
 m_badao:{n:'천하패도(天下覇刀)',s:'weapon',req:75,af:[['atk',1.8],['atkPct',1.6],['eliteDmg',1.6],['allSkill',1],['critDmg',1.3]],procs:[{on:'kill',ch:40,act:'nova',v:2.4}]},
 m_dunjia:{n:'둔갑천서(遁甲天書)',s:'book',req:65,af:[['allSkill',3],['cdr',1.6],['mpKill',1.5],['skillDmg',1.5]],procs:[{on:'cast',ch:15,act:'freeCast',v:1}]},
 m_jueying:{n:'절영의 등자(絶影)',s:'boots',req:55,af:[['mspd',2.2],['dodge',1.6],['kiKill',1.5],['dashDmg',2]],procs:[{on:'kill',ch:100,act:'buffAtk',v:25,dur:180,cd:0}]},
 m_dilu:{n:'적로의 고삐(的盧)',s:'gloves',req:62,af:[['atkPct',1.8],['crit',1.6],['eliteDmg',1.6],['healKill',1.5]],procs:[{on:'hit',ch:8,act:'dragon',v:2.2,cd:60,col:'#ffe0a0'}]},
 m_xuanwu:{n:'현무 귀갑(玄武龜甲)',s:'armor',req:70,af:[['def',2],['hpPct',1.8],['dr',1.6],['healKill',1.5]],procs:[{on:'hurt',ch:15,act:'shield',v:150,cd:600}]},
 m_jade_seal:{n:'동작대 옥새(銅雀玉璽)',s:'ring',req:72,af:[['allStat',1.6],['crit',1.6],['eliteDmg',1.6],['mf',1.5]],procs:[{on:'crit',ch:10,act:'star7',v:1.3,cd:120}]},
 m_bagua:{n:'팔괘 도포(八卦道袍)',s:'cape',req:66,af:[['dr',1.6],['cdr',1.6],['bolt',2],['mpKill',1.5]],procs:[{on:'cast',ch:20,act:'bolt3',v:1.6}]},
 m_wolf:{n:'낭아 투구(狼牙)',s:'helm',req:58,af:[['hpPct',1.6],['crit',1.5],['execDmg',1.6],['allSkill',1]],procs:[{on:'kill',ch:30,act:'nova',v:1.8}]},
 m_jadebelt:{n:'백옥 사만대(白玉獅蠻帶)',s:'belt',req:64,af:[['hpPct',1.6],['kiKill',1.6],['hpRegen',1.6],['healKill',1.5]],procs:[{on:'lowhp',ch:100,act:'drFor',v:50,dur:300,cd:1800}]}};
for(const k in GI_MYTH){const U=Object.assign({g:'myth'},GI_MYTH[k]);U.txt=U.procs.map(exclTxt);UNIQ[k]=U;if(!UNIQ_BY_G.myth.includes(k))UNIQ_BY_G.myth.push(k)}

/* ---------- 3. 레벨 맞춤 장비 ----------
   드랍 · 도박 장비는 얻는 시점의 레벨(캐릭터 · 적 레벨 중 높은 쪽)에 맞춰 만들어진다.
   세트 · 전용 · 신화도 그 레벨로 만들어져 낮은 레벨에서도 나오고 쓸 수 있으며,
   높은 레벨에서 얻을수록 능력치가 높고 전용 · 신화의 고유 효과(발동 위력 · 고정 보너스)도 강하다 (×0.5 ~ ×1.3). */
const GI_GROW=it=>!!it&&(it.g==='set'||it.g==='excl'||it.g==='myth');
const giPwm=it=>{const u=it&&it.u&&UNIQ[it.u];if(!u)return 1;return it.pwm!=null?it.pwm:clamp((it.il||1)/Math.max(1,u.req),.5,1.3)};
let GI_MINLV=0;
const _genSetGI=genSet;
genSet=function(key,il,pi){const S=SETS[key],r0=S.req;S.req=1;try{const it=_genSetGI(key,il,pi);it.rq=Math.max(1,Math.round(it.il)-1);return it}finally{S.req=r0}};
const _genUniqGI=genUniq;
genUniq=function(key,il){const U=UNIQ[key],r0=U.req;U.req=1;try{const it=_genUniqGI(key,il);it.rq=Math.max(1,Math.round(it.il)-1);it.pwm=+clamp(it.il/Math.max(1,r0),.5,1.3).toFixed(2);return it}finally{U.req=r0}};
const _calcStatsGI=calcStats;
calcStats=function(ps,eqOv){
  const st=_calcStatsGI(ps,eqOv),eq=eqOv||ps.rpg.eq,sets={},procM=new Map();
  for(const k of GI_NEWK)st[k]=0;
  for(const sl of EQ_SLOTS){const it=eq[sl];if(!it)continue;const s=itemStats(it);for(const k of GI_NEWK)if(s[k])st[k]+=s[k];
    if(it.set)sets[it.set]=(sets[it.set]||0)+1;
    const u=it.u&&UNIQ[it.u];if(!u)continue;const m=giPwm(it);
    if(u.pw)for(const k in u.pw)if(typeof st[k]==='number')st[k]+=u.pw[k]*(m-1);
    for(const pr of u.procs||[])procM.set(pr,Math.max(procM.get(pr)||0,m))}
  for(const k in sets)for(const [n,mods] of SETS[k].bonus)if(sets[k]>=n)for(const kk of GI_NEWK)if(mods[kk])st[kk]+=mods[kk];
  st.procs=st.procs.map(pr=>procM.has(pr)?Object.assign({},pr,{v:+(pr.v*procM.get(pr)).toFixed(2)}):pr);
  st.crit=Math.min(75,st.crit);st.dr=Math.min(60,st.dr);st.mspd=Math.min(80,st.mspd);st.cdr=Math.min(50,st.cdr);st.ls=Math.min(15,st.ls);st.dodge=Math.min(35,st.dodge);
  return st;
};
/* 적 처치 드랍: 캐릭터 레벨보다 낮게 나오지 않게 */
const _rpgDropsGI=rpgDrops;
rpgDrops=function(e,k){const o=GI_MINLV;GI_MINLV=k&&k.ps?k.ps.lvl:(G&&G.pl?Math.max(...G.pl.map(s=>s.lvl)):0);try{return _rpgDropsGI(e,k)}finally{GI_MINLV=o}};
/* 도박: 현재 레벨에 맞춰 */
gachaItem=function(ps,g){
  const hid=HEROES[ps.hero].id;
  if(g==='excl'||g==='myth'){const pool=UNIQ_BY_G[g].filter(k=>g==='myth'||UNIQ[k].h===hid),w={};for(const k of pool)w[k]=UNIQ[k].req<=ps.lvl+4?3:1;return genUniq(wpick(w),ps.lvl)}
  if(g==='set'){const w={};for(const k in SETS)w[k]=SETS[k].req<=ps.lvl+4?3:1;return genSet(wpick(w),ps.lvl)}
  return genItem(ps.lvl,g,{});
};
/* 드랍: 낮은 레벨에서도 모든 세트 · 전용 · 신화가 나올 수 있게 (레벨에 맞는 것이 3배 잘 나옴) + 기본 장비 이름 변형 */
const _genItemGI=genItem;
genItem=function(il,g,o){
  o=o||{};if(GI_MINLV)il=Math.max(il,GI_MINLV);const L=clamp(Math.round(il),1,MAXLV);
  if(g==='set'){const w={};for(const k in SETS)w[k]=SETS[k].req<=L+4?3:1;return genSet(wpick(w),L)}
  if(g==='excl'||g==='myth'){const pool=UNIQ_BY_G[g].filter(k=>g!=='excl'||!o.heroes||o.heroes.includes(UNIQ[k].h));
    if(pool.length){const w={};for(const k of pool)w[k]=UNIQ[k].req<=L+4?3:1;return genUniq(wpick(w),L)}}
  const it=_genItemGI(il,g,o);
  if(it&&!it.u&&!it.set&&it.s!=='weapon'&&BASE_VAR[it.s]){const t=BASES[it.s].indexOf(it.b);
    if(t>=0&&Math.random()<.67){const nb=pick(BASE_VAR[it.s][t]),old=it.b;it.b=nb;if(it.n===old)it.n=nb;else if(it.n.endsWith(old))it.n=it.n.slice(0,it.n.length-old.length)+nb}}
  return it;
};
/* 설명: 세트 · 전용 · 신화는 아이템 레벨 안내 줄 */
const _itemLinesGI=itemLines;
itemLines=function(it,ps){
  const L=_itemLinesGI(it,ps);if(!GI_GROW(it))return L;
  L.splice(1,0,[`◇ Lv.${it.il}에 얻은 장비 — 높은 레벨에서 얻을수록 강함${it.u?` · 고유 효과 ×${giPwm(it).toFixed(2)}`:''}`,'#ffd890',12]);
  return L;
};
/* 처치 · 정예 · 빈사 옵션 적용 */
const _damageGI=damage;
damage=function(a,t,dmg,knock,opt){
  const own=a&&!t.isPlayer?ownerOf(a):null,st=own&&own.ps&&own.ps.st;
  if(st&&!t.dead&&typeof dmg==='number'){let m=1;if(st.eliteDmg&&(t.elite||t.boss||t.mid))m+=st.eliteDmg/100;if(st.execDmg&&t.hp<t.maxhp*.3)m+=st.execDmg/100;if(m!==1)dmg=Math.round(dmg*m)}
  const was=t.dead,r=_damageGI(a,t,dmg,knock,opt);
  if(st&&!was&&t.dead&&!own.dead){
    if(st.healKill)own.hp=Math.min(own.maxhp,own.hp+Math.round(st.healKill));
    if(st.mpKill)own.mana=Math.min(own.maxmana,own.mana+Math.round(st.mpKill));
    if(st.kiKill)own.mp=Math.min(own.maxki||100,own.mp+st.kiKill)}
  return r;
};

/* ---------- 4. 히든 코드: 강화 확률 100% 토글 ---------- */
let GI_ENH100=null;
const _cheatGI=cheatCode;
cheatCode=function(code){
  if(code!=='Quote')return _cheatGI(code);
  if(!GI_ENH100){GI_ENH100={e:ENH_RATE.slice(),s:SKE_RATE.slice()};ENH_RATE.fill(100);SKE_RATE.fill(100);
    CHEAT={t:0,txt:'[히든 코드] 강화 확률 100% (장비 · 스킬) — 다시 입력하면 원래대로',col:'#ffe060'};sfx('lvl')}
  else{GI_ENH100.e.forEach((v,i)=>ENH_RATE[i]=v);GI_ENH100.s.forEach((v,i)=>SKE_RATE[i]=v);GI_ENH100=null;
    CHEAT={t:0,txt:'[히든 코드] 강화 확률 원래대로',col:'#ffb070'};sfx('sel')}
};
const _drawMenuGI=drawMenu;
drawMenu=function(){_drawMenuGI();if(GI_ENH100&&MN&&(MN.tab===3||MN.tab===1))txt('◆ 강화 확률 100% (히든 코드)',W-16,52,12,'#ffe060','right',FONT,['#000',3])};
