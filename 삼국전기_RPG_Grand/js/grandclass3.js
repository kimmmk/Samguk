'use strict';
/* ===== 2차 전직 「오의 전수」 (3단계) =====
   · 조건: 1차 전직 + Lv.60 + 악몽(2회차) 이상에서 제7장 화용도 클리어 → 군영 「전직」
   · 퀘스트: ① 「오의 비급」 3개 (악몽 이상: 보스 100% · 정예 25% · 장교 5%) ② 운명의 시련 (무장별 역사 장면 · 보스 연전)
   · 계승: 1차 갈래를 잇는 2차 직업 — 보너스 강화(1차 ×1.5 + 모든 스킬 +1) · 오의(→↓→ + 필살기) · 7단계 스킬(Lv.65) · 각성 III(스킬 강화 +15)
   · 1차 특수 기술 재사용 8초 → 5초 · 직업 오라 */

const CLS_LV2=60,OUI_KI=100,OUI_CD=1800,SCROLL_N=3;
/* 2차 직업 이름 (갈래 A / B) */
const C2N={guan:[['관성제군','關聖帝君'],['한수정후','漢壽亭侯']],zhang:[['만인지적','萬人之敵'],['연인대장','燕人大將']],zhao:[['백룡창신','白龍槍神'],['진군장군','鎭軍將軍']],
 huang:[['백보천양','百步穿楊'],['후장군','後將軍']],zhuge:[['팔진도사','八陣道士'],['승상','丞相']],ma:[['신위천장군','神威天將軍'],['금마초','錦馬超']],
 diao:[['경국지색','傾國之色'],['연환계사','連環計師']],wei:[['진북장군','鎭北將軍'],['한중태수','漢中太守']],lubu:[['천하무쌍','天下無雙'],['인중여포','人中呂布']],
 xu:[['대부신장','大斧神將'],['우장군','右將軍']],gan:[['금범적','錦帆賊'],['절충장군','折衝將軍']],sun:[['효희','梟姬'],['궁요희','弓腰姬']]};
/* 오의 위력 보정: 피날레 연출마다 타격 방식이 달라 같은 조건에서 약 3,000 안팎이 되도록 */
const OUI_MUL={guan:1.4,zhang:1.1,zhao:1.5,huang:1.1,zhuge:2.6,ma:.85,diao:.65,wei:1.8,lubu:.8,xu:1.9,gan:.65,sun:3.2};
const OUI_N={guan:'청룡언월 천하참',zhang:'장판 천지갈',zhao:'백룡 천창',huang:'만궁 낙일',zhuge:'팔진 천뢰',ma:'서량 대선풍',diao:'폐월 화우',wei:'반골 열화천',lubu:'천하무쌍',xu:'대부 개천',gan:'금범 뇌폭',sun:'궁요 천시'};
const CLASS2={};
for(const hid in CLASS1){CLASS2[hid]={};['A','B'].forEach((br,j)=>{const C1=CLASS1[hid][br],nm=C2N[hid][j],b={};
  for(const [k,v] of Object.entries(C1.bonus))b[k]=k==='allSkill'?v:Math.round(v*1.5);b.allSkill=(b.allSkill||0)+1;
  const s0=C1.skills[0],sk=Object.assign({},s0,{n:'진(眞)·'+s0.n,f:`오의로 다시 태어난 「${s0.n}」 — 위력 · 범위가 크게 오른다.`});
  for(const k of['d','dr'])if(sk[k])sk[k]=+(sk[k]*1.7).toFixed(2);if(sk.mp)sk.mp=Math.round(sk.mp*1.4);if(sk.r)sk.r=Math.round(sk.r*1.25);if(sk.cnt)sk.cnt=sk.cnt+3;if(sk.dist)sk.dist=sk.dist+4;if(sk.mods){sk.mods=JSON.parse(JSON.stringify(sk.mods));for(const k in sk.mods)sk.mods[k]=[sk.mods[k][0]*1.6,sk.mods[k][1]*1.6]}
  CLASS2[hid][br]={n:`${nm[0]}(${nm[1]})`,ko:nm[0],col:C1.col,bonus:b,oui:OUI_N[hid],skill:sk};
  const id=`${hid}_c${br}2`;if(!SKILLS[id]){Object.assign(sk,{id,hero:hid,tr:3,ti:2,lv:65,max:20,el:sk.el||'phys',cls:br,cls2:true,syn:[]});SKILLS[id]=sk;HSK[hid].push(sk)}})}
const cq2Of=ps=>ps.rpg.cq2||(ps.rpg.cq2={scroll:0,trial:false});
const nightmareHY=()=>!!G&&Object.keys(G.clears||{}).some(k=>{const [c,s]=k.split(':');return +c>=1&&s==='4'});
const cq2Open=ps=>!!ps.rpg.cls1&&!ps.rpg.cls2&&ps.lvl>=CLS_LV2&&nightmareHY();
const cq2Step=ps=>{if(ps.rpg.cls2)return 3;const q=cq2Of(ps);if(q.trial)return 2.5;return q.scroll>=SCROLL_N?2:1};
const cls2Of=p=>{const r=p.ps.rpg;return r.cls2&&CLASS2[p.h.id]?CLASS2[p.h.id][r.cls1]:null};

/* ---------- 능력치 · 스킬 ---------- */
const _calcStatsC3=calcStats;
calcStats=function(ps,eqOv){
  const st=_calcStatsC3(ps,eqOv),r=ps.rpg;if(!r.cls2||!r.cls1)return st;const C1=CLASS1[HEROES[ps.hero].id],C2=CLASS2[HEROES[ps.hero].id];if(!C1||!C2)return st;
  const b1=C1[r.cls1].bonus,b2=C2[r.cls1].bonus;   // 1차 보너스는 이미 들어가 있으므로 차이만 더한다
  for(const [k,v2] of Object.entries(b2)){const v=v2-(b1[k]||0);if(!v)continue;
    if(k==='hpPct')st.maxhp=Math.round(st.maxhp*(1+v/100));else if(k==='mpPct')st.maxmp=Math.round(st.maxmp*(1+v/100));else if(k==='mpRegen')st.mpRegen*=1+v/100;else if(typeof st[k]==='number')st[k]+=v}
  st.crit=Math.min(75,st.crit);st.dr=Math.min(60,st.dr);st.mspd=Math.min(80,st.mspd);st.cdr=Math.min(50,st.cdr);st.dodge=Math.min(35,st.dodge);
  return st;
};
const _learnSkillC3=learnSkill;
learnSkill=function(ps,id){const s=SKILLS[id],r=ps.rpg;
  if(s&&s.cls2){if(r.cls1!==s.cls)return `「${CLASS2[s.hero][s.cls].n}」 갈래의 스킬입니다`;if(!r.cls2)return `2차 전직 「${CLASS2[s.hero][s.cls].n}」 필요 — 군영 「전직」`;
    if(!r.sk[`${s.hero}_c${s.cls}1`])return `선행 스킬 「${CLASS1[s.hero][s.cls].skills[1].n}」 필요`}
  return _learnSkillC3(ps,id)};
const _skillCellsC3=skillCells;
skillCells=function(ps){const cl=ps.rpg.cls1;return _skillCellsC3(ps).filter(c=>!(c.s.cls2&&!cl))};
/* 각성 III: 스킬 강화 +11 ~ +15 */
const SKE3_RATE=[25,20,15,10,8],SKE3_MAX=15;
function skeInfo(ps,e){
  if(e<SKE_MAX){const c=skEnhCost(e);return `스킬 강화 +${e}→+${e+1}  성공률 ${SKE_RATE[e]}%  (금화 ${c.gold} · 비급 조각 ${c.frag})`}
  if(!ps.rpg.cls2||e>=SKE3_MAX)return null;const c=skEnhCost(e),rate=typeof GI_ENH100!=='undefined'&&GI_ENH100?100:SKE3_RATE[e-10];
  return `각성 강화 +${e}→+${e+1}  성공률 ${rate}%  (금화 ${Math.round(c.gold*1.5)} · 비급 조각 ${c.frag*2})`;
}
const _enhanceSkillC3=enhanceSkill;
enhanceSkill=function(ps,id){
  const r=ps.rpg,e=r.enh[id]||0;if(e<SKE_MAX||!r.sk[id])return _enhanceSkillC3(ps,id);
  if(!r.cls2)return{msg:'+10 이상은 2차 전직 후 강화할 수 있습니다 (각성 III)'};if(e>=SKE3_MAX)return{msg:'최대 강화 단계입니다'};
  const c=skEnhCost(e),gold=Math.round(c.gold*1.5),frag=c.frag*2;if(r.gold<gold)return{msg:'금화가 부족합니다'};if(r.mats.frag<frag)return{msg:'비급 조각이 부족합니다'};
  r.gold-=gold;r.mats.frag-=frag;const rate=typeof GI_ENH100!=='undefined'&&GI_ENH100?100:SKE3_RATE[e-10];
  if(Math.random()*100<rate){r.enh[id]=e+1;recalc(ps);return{ok:true,msg:`각성 강화 성공! +${e+1}`+(e+1===15?'  — 각성 III 해방! (스킬 피해 +30%)':'')}}
  return{msg:'각성 강화 실패... (재료 소모)'};
};
const _skMultC3=skMult;
skMult=function(ps,s,lv){const m=_skMultC3(ps,s,lv);return (ps.rpg.enh[s.id]||0)>=15?m*1.3:m};

/* ---------- 오의 비급 드랍 ---------- */
const _damageC3=damage;
damage=function(a,t,dmg,knock,opt){
  const own=a&&t&&!t.isPlayer?ownerOf(a):null,was=t.dead,r=_damageC3(a,t,dmg,knock,opt);
  if(own&&own.ps&&!was&&t.dead&&G.cycle>=1){const ps=own.ps;if(cq2Open(ps)){const q=cq2Of(ps);
    if(q.scroll<SCROLL_N&&Math.random()<(t.boss||t.mid?1:t.elite?.25:t.officer?.05:0)){q.scroll++;Wd.fx.push({type:'text',x:t.x,y:t.y,z:170,t:0,life:90,txt:`★ 오의 비급 (${q.scroll}/${SCROLL_N})`,col:'#ff9ad8',size:20});sfx('treasure');
      for(let i=0;i<16;i++)emit({x:t.x,y:t.y,z:rnd(20,90),vz:rnd(1,4),vx:rnd(-3,3),col:i%2?'#ff9ad8':'#ffffff',size:rnd(2,4),life:30,type:'sq'})}}}
  return r;
};

/* ---------- 오의 (→↓→ + 필살기) ---------- */
const _doSpecialC3=doSpecial;
doSpecial=function(p,myth){
  const C2=!myth&&p.state!=='special'&&cls2Of(p);
  if(C2&&clsRead(p)){p.cmd.length=0;
    if((p.ouiCd||0)>0){hudTxt(p,`오의 재사용 대기 ${Math.ceil(p.ouiCd/60)}초`);sfx('noMp');return}
    if(p.mp<OUI_KI){hudTxt(p,`오의는 기력 ${OUI_KI}이 필요합니다`,'#88aaff');sfx('noMp');return}
    p.mp-=OUI_KI;p.ouiCd=OUI_CD;p.state='oui';p.t=0;p.inv=Math.max(p.inv,140);p.ghMem={};p.ghF0=p.facing;p.ghHit={};p.hitIds=new Set();
    Wd.cutin={t:0,dur:64,h:p.h,pl:p.idx,look:p.look,name:'오의 · '+C2.oui,hz:C2.oui,sub:`${C2.n} 오의`,col:C2.col};Wd.cine={t:0,dur:64+100,col:C2.col};
    sfx('cutin');kiai(vprof(p),'big');say('오의! '+C2.oui+'!',vprof(p));return}
  return _doSpecialC3(p,myth);
};
function ouiUpd(p){
  const K=KIT[p.h.id],t=p.t-1;if(!K){p.state='idle';return}
  const M=1.6*(OUI_MUL[p.h.id]||1),c=ghCtxGame(p),l0=c.later;   // 필살기 피해는 G.spB 에 곱해지므로 오의 동안 배율을 올린다
  const boost=fn=>{const s=G.spB;G.spB=s*M;try{fn()}finally{G.spB=s}};c.later=(d,fn)=>l0(d,()=>boost(fn));
  const k0=GP_KIT,f0=GP_F;GP_KIT=K;GP_F=p.ghF0;try{if(t>=0&&t<=80)boost(()=>K.fin(c,t))}finally{GP_KIT=k0;GP_F=f0}
  if(t===0){const C2=cls2Of(p);gpV(gpAdd,{k:'kanji',x:p.x+p.facing*140,y:p.y,z:230,txt:'오의',col:C2?C2.col:'#fff',size:84,dur:70});Wd.flashT=Math.max(Wd.flashT,12);Wd.flashCol='255,255,255'}
  p.inv=Math.max(p.inv,10);if(t>=84){p.state='idle';p.t=0;p.z=0;p.facing=p.ghF0}
}
const _updPlayerC3=updPlayer;
updPlayer=function(p){
  _updPlayerC3(p);if(scene!=='play'||p.out||p.dead)return;
  if(p.ouiCd>0)p.ouiCd--;
  const C2=cls2Of(p);if(C2){if(p.clsCd>300)p.clsCd=300;   // 1차 특수 기술 재사용 5초
    if(Wd.t%7===0)emit({x:p.x+rnd(-22,22),y:p.y,z:rnd(0,20),vz:rnd(1,2.2),col:Math.random()<.7?C2.col:'#ffffff',size:rnd(2,3),life:30,type:'sq'})}
  if(p.state==='oui')ouiUpd(p);
};
const _poseOfC3=poseOf;
poseOf=function(e){
  if(e&&e.state==='oui'&&e.h&&KIT[e.h.id]){const o=KIT[e.h.id].fp(Math.max(0,e.t-1)),st=e.state,t=e.t,cb=e.combo;
    try{e.state=o.st;e.t=o.t!=null?o.t:e.t;if(o.combo)e.combo=o.combo;if(o.st==='jump')e.jatk=false;return _poseOfC3(e)}finally{e.state=st;e.t=t;e.combo=cb}}
  return _poseOfC3(e);
};
/* 2차 직업 오라 (발밑) */
const _enhBodyFxC3=enhBodyFx;
enhBodyFx=function(e,sx,sy,cx){_enhBodyFxC3(e,sx,sy,cx);const C2=e.isPlayer&&cls2Of(e);if(!C2)return;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(sx,e.y);ctx.scale(1,.32);ctx.rotate(-frame*.015);ctx.strokeStyle=C2.col;ctx.globalAlpha=.5+.15*Math.sin(frame*.1);ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(0,0,46,0,7);ctx.stroke();ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<=8;i++){const a=i/8*6.283;ctx.lineTo(Math.cos(a)*38,Math.sin(a)*38)}ctx.stroke();ctx.restore()};

/* ---------- 운명의 시련 ---------- */
const CLS_TRIAL2={};
function cls2AddTrial(hid,def){const i=STAGES.length;STAGES.push(Object.assign({trial:hid,trial2:true,len:2200,waves:[[500,'s sp o'],[1200,'sp a o sh']]},def));STAGE_LV[i]=CLS_LV2;STAGE_EV[i]=def.ev||[];CLS_TRIAL2[hid]=i;return i}
const hlook=(id,sc)=>Object.assign({},HEROES.find(h=>h.id===id).look,{scale:sc||1.15});
const nb=(name,title,look,o)=>newBoss(name,title,look,Object.assign({hp:Math.round(620*TRH)},o||{}));
const fate=(t,boss,me)=>[{t:60,pause:true,talk:[['@',me],[TIP,'운명의 시련: 보스 연전 — 모두 쓰러뜨려라']]},{boss:true,talk:[[boss,t]]},{clear:true,talk:[['@','운명은… 바꿀 수 있다.']]}];
cls2AddTrial('guan',{title:'운명  맥성',sub:'역사를 거스르다',bg:'fortress',fac:'wei',mus:1,
  story:['형주를 잃은 관우는 맥성에 고립되었다.','흰 옷으로 위장한 여몽의 군사가 성을 에워싼다.','"옥은 부서져도 흰빛을 잃지 않고, 대나무는 타도 마디를 굽히지 않는다."','— 운명의 시련: 반장 · 여몽을 연달아 쓰러뜨려 맥성을 지켜라'],
  rush:[nb('반장','동오 장수',Object.assign({},enemyLook('wei','o'),{scale:1.25})),nb('여몽','동오 도독',Object.assign({},enemyLook('wei','o'),{scale:1.35}),{skills:['dash','wave','slam']})],
  failMsg:'운명의 시련 실패 — 맥성이 함락됐다. (다시 도전할 수 있다)',ev:fate('관우! 형주는 이미 우리 것이다!','여몽','맥성은 무너지지 않는다. 이 청룡도가 있는 한!')});
cls2AddTrial('zhang',{title:'운명  낭중',sub:'장합을 꺾다',bg:'pass',fac:'wei',mus:4,
  story:['파서의 산길, 장합의 대군이 촉의 문을 두드린다.','장비는 술에 취한 척 적을 끌어들였다.','"장익덕이 술주정뱅이라고? 그 말을 믿은 게 네 패착이다!"','— 운명의 시련: 장합 · 하후연을 연달아 쓰러뜨려라'],
  rush:[nb('장합','위의 명장',Object.assign({},enemyLook('wei','o'),{scale:1.3}),{skills:['dash','wave']}),bossX('하후연')],failMsg:'운명의 시련 실패 — 낭중을 지키지 못했다. (다시 도전할 수 있다)',
  ev:fate('장비, 이번에는 꾀에 넘어가지 않는다!','장합','으하하! 꾀가 아니라 힘으로 이겨 주마!')});
cls2AddTrial('zhao',{title:'운명  한수',sub:'공영의 계',bg:'bridge',fac:'wei',mus:2,
  story:['한수 강가, 황충을 구하러 간 조운이 조조의 대군과 마주쳤다.','조운은 진채의 문을 활짝 열고 깃발을 눕혔다 — 공영계(空營計).','"자룡은 온몸이 담덩어리로다!" 유비는 감탄했다.','— 운명의 시련: 하후돈 · 조조를 연달아 쓰러뜨려라'],
  rush:[bossX('하후돈'),bossX('조조')],failMsg:'운명의 시련 실패 — 한수에서 물러났다. (다시 도전할 수 있다)',ev:fate('조자룡, 이번에야말로 사로잡겠다!','조조','상산 조자룡이 여기 있다. 덤벼라!')});
cls2AddTrial('huang',{title:'운명  이릉',sub:'노장의 마지막 활',bg:'plains',fac:'wei',mus:4,
  story:['관우의 원수를 갚으려는 이릉 대전 — 칠순 노장 황충도 출전했다.','"늙은이는 쓸모없다"는 말에 황충은 홀로 적진으로 달려갔다.','역사 속 황충은 이 싸움에서 화살을 맞고 쓰러졌다.','— 운명의 시련: 반장 · 마충을 쓰러뜨리고 살아 돌아와라 (목숨 하나)'],noLives:true,
  rush:[nb('반장','동오 장수',Object.assign({},enemyLook('wei','o'),{scale:1.25})),nb('마충','동오 궁장',Object.assign({},enemyLook('wei','a'),{scale:1.3}),{skills:['dash','wave']})],
  failMsg:'운명의 시련 실패 — 이릉에서 쓰러졌다. (다시 도전할 수 있다)',ev:fate('늙은이, 여기가 네 무덤이다!','반장','이 늙은이의 활은 아직 꺾이지 않았다!')});
cls2AddTrial('zhuge',{title:'운명  오장원',sub:'별을 지키다',bg:'night',fac:'wei',mus:5,lamp:true,
  story:['오장원의 마지막 밤, 공명은 다시 칠성등 앞에 앉았다.','"이번에는 하늘이 아니라 내 손으로 명을 잇겠소."','사마의와 장합이 칠성등을 끄기 위해 몰려온다.','— 운명의 시련: 칠성등을 지키며 장합 · 사마의를 쓰러뜨려라'],
  rush:[nb('장합','위의 명장',Object.assign({},enemyLook('wei','o'),{scale:1.3}),{skills:['dash','wave']}),bossX('사마의')],failMsg:'운명의 시련 실패 — 칠성등이 꺼졌다. (다시 도전할 수 있다)',
  ev:fate('공명, 하늘의 뜻은 거스를 수 없소.','사마의','중달, 하늘의 뜻도 사람이 짓는 것이오.')});
cls2AddTrial('ma',{title:'운명  위구',sub:'서량의 복수',bg:'pass',fac:'wei',mus:4,
  story:['기성에서 가족을 잃은 마초 — 원수 하후연과 장합이 위구에 진을 쳤다.','"서량의 금마초가 돌아왔다!"','— 운명의 시련: 장합 · 하후연을 연달아 쓰러뜨려라'],
  rush:[nb('장합','위의 명장',Object.assign({},enemyLook('wei','o'),{scale:1.3}),{skills:['dash','wave']}),bossX('하후연')],failMsg:'운명의 시련 실패 — 위구에서 물러났다. (다시 도전할 수 있다)',
  ev:fate('마초, 서량은 이미 끝났다!','하후연','서량은 내가 살아 있는 한 끝나지 않는다!')});
cls2AddTrial('diao',{title:'운명  하비성',sub:'봉선을 구하라',bg:'fortress',fac:'wei',mus:1,
  story:['하비성이 수공에 잠기고, 여포의 운명이 다해 간다.','초선은 홀로 백문루를 향해 달렸다.','"이번에는 연환계가 아니라, 내 검으로 당신을 지킬게요."','— 운명의 시련: 하후돈 · 조조를 연달아 쓰러뜨려라'],
  rush:[bossX('하후돈'),bossX('조조')],failMsg:'운명의 시련 실패 — 하비성이 함락됐다. (다시 도전할 수 있다)',ev:fate('초선이라… 여포의 여인이 무슨 일이냐!','조조','봉선은 제가 지켜요. 비켜 주세요!')});
cls2AddTrial('wei',{title:'운명  남곡',sub:'반골의 오명을 씻다',bg:'pass',fac:'wei',mus:4,
  story:['공명이 세상을 떠난 뒤, 위연은 반역자의 누명을 썼다.','그러나 진짜 적은 북쪽에 있었다.','"나를 반골이라 부른 자들에게 — 이 대도로 증명하겠다."','— 운명의 시련: 사마의 · 장합을 연달아 쓰러뜨려라'],
  rush:[nb('장합','위의 명장',Object.assign({},enemyLook('wei','o'),{scale:1.3}),{skills:['dash','wave']}),bossX('사마의')],failMsg:'운명의 시련 실패 — 남곡에서 물러났다. (다시 도전할 수 있다)',
  ev:fate('위연, 너는 반골이라 했지. 우리 편이 되어라!','사마의','나는 한(漢)의 장수다. 반골은 너희에게나 어울린다!')});
cls2AddTrial('lubu',{title:'운명  호뢰관 재전',sub:'삼영전여포',bg:'fortress',fac:'dong',mus:1,
  story:['호뢰관 — 천하무쌍의 이름을 처음 떨친 곳.','이번에는 세 형제가 처음부터 함께 덤벼든다.','"셋이든 백이든 상관없다. 천하무쌍은 오직 하나!"','— 운명의 시련: 유비 · 관우 · 장비를 연달아 쓰러뜨려라'],
  rush:[nb('유비','도원의 맏형',Object.assign({},NPC_LOOK['유비'],{scale:1.15}),{skills:['dash','wave']}),nb('관우','미염공',hlook('guan'),{skills:['dash','wave','slam']}),nb('장비','연인 장익덕',hlook('zhang'),{skills:['slam','dash','slam']})],
  failMsg:'운명의 시련 실패 — 호뢰관에서 쓰러졌다. (다시 도전할 수 있다)',ev:fate('여포! 오늘은 우리 셋이 상대해 주마!','유비','셋이 와도 천하무쌍은 꺾이지 않는다!')});
cls2AddTrial('xu',{title:'운명  번성 재전',sub:'미염공과의 일기토',bg:'fortress',fac:'wei',mus:1,
  story:['번성 아래, 옛 벗 관우와 서황이 마주 섰다.','"공명(公明), 오랜만이오." "운장, 오늘은 나랏일이오."','서황은 대부를 들었다 — 우정보다 무거운 것이 있었다.','— 운명의 시련: 관평 · 관우를 연달아 쓰러뜨려라'],
  rush:[nb('관평','관우의 아들',Object.assign({},hlook('guan',1.05)),{skills:['dash','wave']}),nb('관우','미염공',hlook('guan'),{hp:Math.round(760*TRH),skills:['dash','wave','slam']})],
  failMsg:'운명의 시련 실패 — 번성에서 물러났다. (다시 도전할 수 있다)',ev:fate('공명, 우정은 우정이고 싸움은 싸움이오.','관우','운장, 그 청룡도를 받아 내겠소!')});
cls2AddTrial('gan',{title:'운명  유수구 재전',sub:'장료와 맞서다',bg:'night',fac:'wei',mus:3,
  story:['합비의 악몽 — 장료의 이름만 들어도 강동의 아이가 울음을 그쳤다.','감녕은 그 장료와 다시 맞서기 위해 유수구로 돌아왔다.','"방울 소리가 들리거든, 이번에는 네가 떨 차례다!"','— 운명의 시련: 악진 · 장료를 연달아 쓰러뜨려라'],
  rush:[nb('악진','위의 선봉',Object.assign({},enemyLook('wei','o'),{scale:1.25})),bossX('장료')],failMsg:'운명의 시련 실패 — 유수구에서 물러났다. (다시 도전할 수 있다)',
  ev:fate('감녕! 합비의 악몽을 다시 보여 주마!','장료','이번에는 내가 악몽이 되어 주지!')});
cls2AddTrial('sun',{title:'운명  이릉 강가',sub:'남편을 찾아서',bg:'plains',fac:'wei',mus:0,escortNpc:'유비',
  story:['이릉에서 대패한 유비가 백제성으로 쫓긴다는 소식이 강동에 닿았다.','손상향은 활을 들고 홀로 강을 건넜다.','"이번에는 제가 당신을 지킬게요."','— 운명의 시련: 유비를 지키며 육손의 추격대를 물리쳐라'],
  rush:[nb('반장','동오 장수',Object.assign({},enemyLook('wei','o'),{scale:1.25})),nb('육손','동오 대도독',Object.assign({},enemyLook('wei','o'),{scale:1.3}),{skills:['wave','dash','wave']})],
  failMsg:'운명의 시련 실패 — 유비를 지키지 못했다. (다시 도전할 수 있다)',ev:fate('손 부인, 돌아가시오! 오라버니께서 기다리시오!','육손','제 남편은 제가 지켜요!')});
/* 시련 통과 → 오의 계승 */
const _finishStageC3=finishStage;
finishStage=function(){
  const S=Wd&&Wd.S;if(!S||!S.trial2)return _finishStageC3();
  for(const p of Wd.ps){p.ps.mp=p.mp}
  const ps=G.pl.find(s=>HEROES[s.hero].id===S.trial);if(!ps||!ps.rpg.cls1){toCamp('운명의 시련을 통과했다.');return}
  cq2Of(ps).trial=true;cls2Inherit(ps);
};
function cls2Inherit(ps){
  const hid=HEROES[ps.hero].id,C1=CLASS1[hid][ps.rpg.cls1],C2=CLASS2[hid][ps.rpg.cls1],h=HEROES[ps.hero];
  openChoice({title:`2차 전직 — ${h.name}`,who:h.name,lines:['운명의 시련을 넘어섰다.',`「${C1.n}」의 길 끝에서, 오의가 깨어난다.`],
    opts:[{k:'go',n:`${C2.n} — 오의 계승`,d:[`보너스 강화(1차 ×1.5 · 모든 스킬 +1) · 오의 「${C2.oui}」(→↓→ + 필살기)`,`7단계 스킬 「${C2.skill.n}」(Lv.65) · 각성 III(스킬 강화 +15)`,`1차 특수 기술 재사용 5초 · 직업 오라`]}]},
    ()=>{ps.rpg.cls2=true;ps.rpg.skillPts+=3;recalc(ps);toCamp(`2차 전직 「${C2.n}」! 오의 「${C2.oui}」(→↓→ + 필살기) · 7단계 스킬 · 각성 III 해방 · 스킬 포인트 +3`)});
}

/* ---------- 군영 「전직」: 1차를 마치면 2차 화면 ---------- */
const _updCampC3=updCamp;
updCamp=function(){
  if(!CQ.on)return _updCampC3();const ps=G.pl[CQ.pl];if(!ps.rpg.cls1||!CLASS2[HEROES[ps.hero].id])return _updCampC3();
  if(hit('jump')||hit('pause')){CQ.on=false;sfx('sel');return}
  if(G.np===2&&(hit('left')||hit('right'))){CQ.pl^=1;CQ.conf=null;sfx('sel');return}
  const hid=HEROES[ps.hero].id,r=ps.rpg;
  if(hit('sp')){/* 갈래 변경 (1차 · 2차 함께) */
    if(CQ.conf!=='chg'){CQ.conf='chg';campMsg={t:0,txt:`갈래 변경: 금화 ${CLS_GOLD} — 필살기 키를 한 번 더 누르면 변경 (전직 스킬 포인트 반환)`};return}
    CQ.conf=null;if(r.gold<CLS_GOLD){campMsg={t:0,txt:'금화가 부족합니다'};sfx('noMp');return}
    r.gold-=CLS_GOLD;for(const s of HSK[hid])if(s.cls&&r.sk[s.id]){r.skillPts+=r.sk[s.id];delete r.sk[s.id];const k=r.hot.indexOf(s.id);if(k>=0)r.hot[k]=null}
    r.cls1=r.cls1==='A'?'B':'A';recalc(ps);campMsg={t:0,txt:`갈래 변경 — 「${CLASS1[hid][r.cls1].n}」${r.cls2?` / 「${CLASS2[hid][r.cls1].n}」`:''}`};sfx('lvl');return}
  if(hit('atk')||hit('start')){
    if(r.cls2){campMsg={t:0,txt:`이미 2차 전직 「${CLASS2[hid][r.cls1].n}」을(를) 마쳤습니다`};return}
    if(!cq2Open(ps)){campMsg={t:0,txt:`2차 전직 조건: Lv.${CLS_LV2} 이상 · 악몽(2회차) 이상에서 제7장 화용도 클리어`};sfx('noMp');return}
    const st=cq2Step(ps);if(st===1){campMsg={t:0,txt:'「오의 비급」을 먼저 모으세요 (악몽 이상의 보스 · 정예 · 장교)'};return}
    if(st===2){CQ.on=false;sfx('ok');startStage(CLS_TRIAL2[hid]);return}
    if(st===2.5){CQ.on=false;cls2Inherit(ps)}}
};
const _drawCampC3=drawCamp;
drawCamp=function(){
  const ps=CQ.on&&G.pl[CQ.pl];if(!ps||!ps.rpg.cls1||!CLASS2[HEROES[ps.hero].id])return _drawCampC3();
  CQ.on=false;try{_drawCampC3()}finally{CQ.on=true}
  const h=HEROES[ps.hero],hid=h.id,r=ps.rpg,C1=CLASS1[hid][r.cls1],C2=CLASS2[hid][r.cls1],x0=90,y0=70,w0=780,h0=420;
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,W,H);panel(x0,y0,w0,h0,C2.col);
  txt(`2차 전직 「오의 전수」 — ${h.name}${G.np===2?`  (${CQ.pl+1}P · ←→ 전환)`:''}`,x0+w0/2,y0+24,22,'#ffd24a','center',FONT,['#300',5]);
  let y=y0+60;const row=(t,done,c)=>{const L=wrap((done?'✔ ':'· ')+t,w0/2-50,13);L.forEach((ln,i)=>txt(ln,x0+30+(i?14:0),y+i*17,13,done?'#70ff90':c||'#e8dcc0','left'));y+=17*L.length+7};
  txt(`현재 1차 직업: ${C1.n}`,x0+24,y,14,C1.col,'left');y+=26;
  txt('조건',x0+24,y,13,'#ffb070','left');y+=20;
  row(`캐릭터 Lv.${CLS_LV2} 이상 (현재 Lv.${ps.lvl})`,ps.lvl>=CLS_LV2||r.cls2);row('악몽(2회차) 이상에서 제7장 화용도 클리어',nightmareHY()||r.cls2);y+=4;
  txt('퀘스트',x0+24,y,13,'#ffb070','left');y+=20;const q=cq2Of(ps),T=STAGES[CLS_TRIAL2[hid]];
  row(`① 「오의 비급」 ${Math.min(q.scroll,SCROLL_N)}/${SCROLL_N} — 악몽 이상의 보스 100% · 정예 25% · 장교 5%`,q.scroll>=SCROLL_N||r.cls2);
  row(`② 운명의 시련 — 「${T.title.replace(/\s+/g,' ')} · ${T.sub}」 (보스 ${T.rush.length}연전)`,q.trial||r.cls2,cq2Step(ps)===2?'#ffe060':null);
  row(`③ 오의 계승 — 「${C2.n}」`,!!r.cls2,cq2Step(ps)===2.5?'#ffe060':null);
  const bx=x0+w0/2-6,by=y0+60,bw=w0/2-22;ctx.fillStyle=r.cls2?'rgba(60,40,10,.9)':'rgba(20,12,6,.75)';ctx.fillRect(bx,by,bw,300);ctx.strokeStyle=C2.col;ctx.lineWidth=2;ctx.strokeRect(bx+.5,by+.5,bw-1,299);
  let yy=by+20;const put=(t,c,sz)=>{for(const ln of wrap(t,bw-24,sz)){if(yy>by+292)return;txt(ln,bx+12,yy,sz,c,'left');yy+=sz+5}};
  put(`${r.cls2?'◆ ':''}${C2.n}`,C2.col,18);
  put('보너스: '+Object.entries(C2.bonus).map(([k,v])=>afText(k,v,0)).join(' · '),'#a8ffb8',12);
  put(`오의 「${C2.oui}」 — →↓→ + 필살기 · 기력 ${OUI_KI} · 재사용 30초`,'#ffe8a8',13);put('컷인과 함께 무장 고유 피날레를 1.6배 위력으로 펼친다','#e8dcc0',12);
  put(`7단계 스킬 「${C2.skill.n}」 (Lv.65)`,'#9fc8ff',13);put('각성 III — 스킬 강화 한계 +15, +15 달성 시 스킬 피해 +30%','#ffb0e0',12);put('1차 특수 기술 재사용 8초 → 5초 · 발밑 직업 오라','#c8b890',12);
  const st=cq2Step(ps),act=r.cls2?'2차 전직 완료':!cq2Open(ps)?'조건을 만족하면 퀘스트가 시작됩니다':{1:'악몽 이상 전장에서 오의 비급을 모으세요',2:`${KN[0].atk} 운명의 시련 출전`,2.5:`${KN[0].atk} 오의 계승`}[st];
  txt(act,x0+w0/2,y0+h0-36,15,st>=2&&!r.cls2?'#ffe060':'#c8b890');
  txt(`${KN[0].sp} 갈래 변경 (금화 ${CLS_GOLD})   ·   ${KN[0].jump} 닫기`,x0+w0/2,y0+h0-14,12,'#aaa');
};
/* 상태창: 2차 직업 · 오의 */
const _drawPanelC3=drawPanel;
drawPanel=function(p,x0){
  const C2=p.ps&&!p.out&&cls2Of(p);
  if(!C2){_drawPanelC3(p,x0);const ps=p.ps;if(ps&&!p.out&&cq2Open(ps)){const q=cq2Of(ps),st=cq2Step(ps),y=(ps.recoAlert?164:140)+22,t=st===1?`오의 비급 ${q.scroll}/${SCROLL_N}`:'운명의 시련 준비 완료 — 군영 「전직」';
      ctx.font=`bold 12px ${FONT}`;const w=ctx.measureText(t).width+18;ctx.fillStyle='rgba(30,10,24,.85)';ctx.fillRect(x0,y,w,20);ctx.strokeStyle='#ff9ad8';ctx.strokeRect(x0+.5,y+.5,w-1,19);txt(t,x0+9,y+10,12,'#ffb0e0','left')}return}
  _drawPanelC3(p,x0);const y=(p.ps.recoAlert?164:140)+22,t=`${C2.ko} · 오의 「${C2.oui}」 →↓→+필살기 ${p.ouiCd>0?`(${Math.ceil(p.ouiCd/60)}초)`:p.mp>=OUI_KI?'준비':`(기력 ${Math.floor(p.mp)}/${OUI_KI})`}`;
  ctx.font=`bold 12px ${FONT}`;const w=ctx.measureText(t).width+18;ctx.fillStyle='rgba(30,10,24,.85)';ctx.fillRect(x0,y,w,20);ctx.strokeStyle=C2.col;ctx.strokeRect(x0+.5,y+.5,w-1,19);txt(t,x0+9,y+10,12,p.ouiCd>0||p.mp<OUI_KI?'#a89878':C2.col,'left');
};
