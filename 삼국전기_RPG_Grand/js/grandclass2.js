'use strict';
/* ===== 1차 전직 2단계: 장비 · 황충 · 마초 · 초선 · 위연 · 여포 · 서황 · 감녕 · 손상향 =====
   grandclass.js 의 구조(데이터 · 퀘스트 · 선택 · 스킬 창)를 그대로 쓰고, 직업 · 특수 기술 · 시련을 더한다.
   시련 규칙 추가: 버티기(survive) · 처치 목표(killGoal) · 보스 연전(rush) · 호위(escortNpc) · 화살비(arrows) */

const SK=(n,ic,ty,o,f)=>Object.assign({n,ic,ty,f},o);
Object.assign(CLASS1,{
 zhang:{
  A:{n:'맹장(猛將)',ko:'맹장',tree:1,col:'#ff6a3a',desc:['포효로 전장을 얼어붙게 하는 — 제압의 길','공격력 +10% · 기절 확률 +10% · 전용기 피해 +25%'],bonus:{atkPct:10,stunCh:10,cmdDmg:25},
     sp:{n:'장판대갈·진',key:'roar',f:'화면의 모든 적을 일갈로 2.5초간 얼어붙게 하고 밀쳐 낸다'},
     skills:[SK('호랑이 포효','吼','nova',{d:1.6,dr:.14,mp:20,cd:6,r:200,stun:60},'포효로 주변 적을 기절시킨다.'),SK('맹장의 기세','猛','passive',{mods:{atkPct:[6,1],stunCh:[3,.4]}},'맹장의 기세 — 공격력과 기절 확률이 오른다.')]},
  B:{n:'호걸(豪傑)',ko:'호걸',tree:2,col:'#d8a040',desc:['술 한 잔에 힘이 솟는 — 근성의 길','최대 체력 +20% · 생명력 흡수 +3% · 기력 획득 +25%'],bonus:{hpPct:20,ls:3,kiGain:25},
     sp:{n:'취권',key:'drunk',f:'10초간 술기운으로 공격력 +40% · 매초 체력 1% 회복'},
     skills:[SK('술독 던지기','酒','proj',{kind:'fireball',el:'fire',d:2,dr:.2,mp:14,cd:4,spd:9},'불붙은 술독을 던져 폭발시킨다.'),SK('호걸의 배짱','豪','passive',{mods:{hpPct:[8,1.5],ls:[1,.2]}},'호걸의 배짱 — 체력과 흡수가 오른다.')]}},
 huang:{
  A:{n:'신궁(神弓)',ko:'신궁',tree:1,col:'#ff9a2a',desc:['백 보 밖 버들잎을 꿰뚫는 — 저격의 길','치명타 +8% · 치명타 피해 +30% · 화염 피해 +25%'],bonus:{crit:8,critDmg:30,fire:25},
     sp:{n:'관일시',key:'pierce',f:'화면 끝까지 꿰뚫는 불화살 한 발 (400%)'},
     skills:[SK('천보 연사','射','proj',{kind:'farrow',el:'fire',cnt:5,spread:.25,d:1,dr:.09,mp:18,cd:5,spd:14},'불화살 다섯 발을 부채꼴로 쏜다.'),SK('백보천양','穿','passive',{mods:{crit:[4,.5],critDmg:[10,2]}},'백 보 밖을 꿰뚫는 눈 — 치명타가 오른다.')]},
  B:{n:'노익장(老益壯)',ko:'노익장',tree:2,col:'#e0b060',desc:['늙을수록 강해지는 — 불굴의 길','최대 체력 +15% · 받는 피해 -6% · 체력 회복 +30'],bonus:{hpPct:15,dr:6,hpRegen:30},
     sp:{n:'노당익장',key:'veteran',f:'체력 20% 회복 + 10초간 공격력 +30% · 치명타 +20%'},
     skills:[SK('노장의 일갈','老','nova',{d:1.5,dr:.13,mp:18,cd:6,r:180,stun:40},'노장의 일갈로 주변 적을 기절시킨다.'),SK('불굴','屈','passive',{mods:{hpPct:[8,1.5],dr:[3,.4]}},'꺾이지 않는 노장 — 체력과 피해 감소가 오른다.')]}},
 ma:{
  A:{n:'서량기병(西涼騎兵)',ko:'서량기병',tree:2,col:'#9ac8ff',desc:['말 위에서 휩쓰는 — 기동의 길','이동 속도 +15% · 돌진 피해 +50% · 공격력 +6%'],bonus:{mspd:15,dashDmg:50,atkPct:6},
     sp:{n:'서량철기',key:'mount',f:'10초간 백마에 올라 이동 1.5배 · 부딪히는 적에게 피해'},
     skills:[SK('철기 돌격','騎','dash',{d:3,dr:.26,mp:16,cd:4,dist:18},'말발굽처럼 길게 돌진한다.'),SK('서량의 질풍','涼','passive',{mods:{mspd:[3,.4],dashDmg:[15,3]}},'서량의 바람 — 이동과 돌진 피해가 오른다.')]},
  B:{n:'금마(錦馬)',ko:'금마',tree:1,col:'#e8f0ff',desc:['사자처럼 포효하는 — 위압의 길','공격력 +10% · 치명타 +5% · 받는 피해 -5%'],bonus:{atkPct:10,crit:5,dr:5},
     sp:{n:'사자후',key:'lion',f:'앞쪽으로 사자후를 내질러 적을 날려 버린다 (200% · 기절)'},
     skills:[SK('금마 회선창','旋','whirl',{d:.8,dr:.07,mp:18,cd:6,dur:80,r:130},'창을 크게 휘돌리며 전진한다.'),SK('금마초의 위용','錦','passive',{mods:{atkPct:[6,1],crit:[3,.4]}},'금마초의 위용 — 공격력과 치명타가 오른다.')]}},
 diao:{
  A:{n:'폐월무희(閉月舞姬)',ko:'폐월무희',tree:1,col:'#ff8ac8',desc:['춤으로 적을 홀리는 — 매혹의 길','치명타 +8% · 이동 속도 +10% · 제압된 적 피해 +30%'],bonus:{crit:8,mspd:10,vsCtrl:30},
     sp:{n:'연환계',key:'charm',f:'화면의 적을 5초간 홀려 서로 다투게 한다 (기절 · 지속 피해)'},
     skills:[SK('화무 연참','舞','whirl',{d:.7,dr:.06,mp:16,cd:6,dur:70,r:120},'꽃잎처럼 돌며 벤다.'),SK('경국지색','色','passive',{mods:{crit:[4,.5],vsCtrl:[8,1.5]}},'나라도 기울게 하는 미모 — 치명타와 제압 피해가 오른다.')]},
  B:{n:'절세가인(絶世佳人)',ko:'절세가인',tree:2,col:'#ffd0e8',desc:['달빛으로 적을 늦추는 — 지원의 길','최대 내공 +20% · 재사용 대기 -8% · 빙결 피해 +25%'],bonus:{mpPct:20,cdr:8,ice:25},
     sp:{n:'폐월',key:'moon',f:'보름달을 띄워 화면의 적을 6초간 느리게 한다 (빙결)'},
     skills:[SK('월하 빙화','月','rain',{el:'ice',hk:'ice',d:1.3,dr:.11,mp:24,cd:7,cnt:8,spread:420},'달빛 얼음꽃을 흩뿌린다.'),SK('절세의 기품','絶','passive',{mods:{cdr:[3,.3],mpPct:[8,1.5]}},'절세의 기품 — 재사용 대기 감소와 내공이 오른다.')]}},
 wei:{
  A:{n:'열화장(烈火將)',ko:'열화장',tree:1,col:'#ff5020',desc:['불길을 두른 대도 — 화력의 길','공격력 +8% · 화염 피해 +40% · 화상 확률 +15%'],bonus:{atkPct:8,fire:40,burnCh:15},
     sp:{n:'열화 폭주',key:'fury',f:'8초간 공격할 때마다 불기둥이 치솟는다 (추가 피해 · 공격력 +30%)'},
     skills:[SK('염룡참','炎','quake',{el:'fire',hk:'fire',d:2.2,dr:.2,mp:22,cd:7,r:200},'땅을 갈라 불길을 일으킨다.'),SK('반골의 불꽃','火','passive',{mods:{fire:[10,2],atkPct:[4,.8]}},'꺼지지 않는 불꽃 — 화염 피해와 공격력이 오른다.')]},
  B:{n:'반골(反骨)',ko:'반골',tree:2,col:'#c84030',desc:['적의 뒤를 치는 — 기습의 길','보스 대상 피해 +30% · 치명타 피해 +25% · 이동 속도 +8%'],bonus:{bossDmg:30,critDmg:25,mspd:8},
     sp:{n:'자오곡 기습',key:'ambush',f:'가장 먼 적의 등 뒤로 순간 이동해 대도로 내려찍는다 (300% · 띄우기)'},
     skills:[SK('기습 일도','奇','dash',{d:2.6,dr:.24,mp:15,cd:4,dist:15},'순식간에 파고들어 벤다.'),SK('반골의 기질','骨','passive',{mods:{bossDmg:[6,1],critDmg:[8,1.5]}},'굽히지 않는 기질 — 보스 피해와 치명 피해가 오른다.')]}},
 lubu:{
  A:{n:'비장(飛將)',ko:'비장',tree:1,col:'#ff2a3a',desc:['천하무쌍의 무력 — 섬멸의 길','공격력 +12% · 치명타 피해 +30% · 필살기 피해 +20%'],bonus:{atkPct:12,critDmg:30,spDmg:20},
     sp:{n:'무쌍난무·진',key:'musou',f:'화면의 적을 열두 번 몰아치며 벤다 (무적)'},
     skills:[SK('방천 연참','戟','whirl',{d:.9,dr:.08,mp:20,cd:6,dur:80,r:150},'방천화극을 휘돌려 몰아친다.'),SK('인중여포','呂','passive',{mods:{atkPct:[6,1],critDmg:[10,2]}},'사람 중엔 여포 — 공격력과 치명 피해가 오른다.')]},
  B:{n:'비장군(飛將軍)',ko:'비장군',tree:2,col:'#ff7040',desc:['적토마를 탄 — 질주의 길','이동 속도 +15% · 돌진 피해 +60% · 최대 체력 +10%'],bonus:{mspd:15,dashDmg:60,hpPct:10},
     sp:{n:'마중적토',key:'redhare',f:'12초간 적토마에 올라 이동 1.5배 · 공격력 +20% · 부딪히는 적에게 피해'},
     skills:[SK('적토 돌격','赤','dash',{d:3.2,dr:.28,mp:18,cd:4,dist:18},'적토마처럼 길게 돌진한다.'),SK('마중적토','兎','passive',{mods:{mspd:[3,.4],dashDmg:[15,3]}},'말 중엔 적토 — 이동과 돌진 피해가 오른다.')]}},
 xu:{
  A:{n:'개산(開山)',ko:'개산',tree:1,col:'#e0a040',desc:['산을 가르는 대부 — 파괴의 길','공격력 +10% · 치명타 피해 +30% · 기술 범위 +15%'],bonus:{atkPct:10,critDmg:30,aoe:15},
     sp:{n:'대지 가르기',key:'split',f:'앞으로 땅을 길게 가르고 바위 가시를 솟게 한다 (250% · 띄우기)'},
     skills:[SK('개산 일격','山','quake',{hk:'rock',d:2.4,dr:.22,mp:22,cd:7,r:210},'땅을 내리쳐 바위를 솟게 한다.'),SK('대부의 위력','斧','passive',{mods:{atkPct:[6,1],critDmg:[10,2]}},'대부의 위력 — 공격력과 치명 피해가 오른다.')]},
  B:{n:'철벽(鐵壁)',ko:'철벽',tree:2,col:'#a8b8c8',desc:['무너지지 않는 진 — 방어의 길','방어력 +30% · 받는 피해 -8% · 가시 피해 +100'],bonus:{defPct:30,dr:8,thorns:100},
     sp:{n:'철벽진',key:'wall',f:'8초간 아군 전원의 받는 피해 -40% · 주변 적에게 가시 반격'},
     skills:[SK('철벽 방패격','壁','nova',{d:1.4,dr:.12,mp:18,cd:6,r:170,stun:50},'방패처럼 밀어붙여 기절시킨다.'),SK('장군의 풍모','將','passive',{mods:{defPct:[8,1.5],dr:[3,.4]}},'장군의 풍모 — 방어력과 피해 감소가 오른다.')]}},
 gan:{
  A:{n:'금범(錦帆)',ko:'금범',tree:1,col:'#ffd040',desc:['방울 소리에 번개가 치는 — 뇌전의 길','뇌전 피해 +40% · 감전 확률 +15% · 기술 범위 +15%'],bonus:{bolt:40,shockCh:15,aoe:15},
     sp:{n:'방울 폭풍',key:'storm',f:'쇠사슬로 화면의 적을 묶어 세 번 감전시킨다'},
     skills:[SK('쇄편 뇌격','鈴','chain',{el:'bolt',hk:'bolt',d:1.4,dr:.12,mp:20,cd:6,cnt:5},'쇠사슬을 타고 번개가 튄다.'),SK('금범적의 방울','帆','passive',{mods:{bolt:[10,2],aoe:[3,.5]}},'방울 소리 — 뇌전 피해와 범위가 오른다.')]},
  B:{n:'수적(水賊)',ko:'수적',tree:2,col:'#80d0ff',desc:['어둠 속에서 치는 — 암습의 길','치명타 +8% · 회피 +6% · 치명타 피해 +25%'],bonus:{crit:8,dodge:6,critDmg:25},
     sp:{n:'백기 야습',key:'stealth',f:'5초간 몸을 숨긴다 (무적) — 숨은 채 때리면 피해 3배'},
     skills:[SK('야습 일격','夜','dash',{d:2.6,dr:.24,mp:15,cd:4,dist:14},'어둠을 틈타 파고든다.'),SK('백기의 담력','賊','passive',{mods:{crit:[4,.5],dodge:[3,.3]}},'백 명으로 만 명을 치는 담력 — 치명타와 회피가 오른다.')]}},
 sun:{
  A:{n:'궁요(弓腰)',ko:'궁요',tree:1,col:'#ff6a8a',desc:['공중을 나는 활 — 연사의 길','치명타 +8% · 이동 속도 +10% · 화염 피해 +25%'],bonus:{crit:8,mspd:10,fire:25},
     sp:{n:'연환 공중 사격',key:'volley',f:'높이 뛰어올라 아래의 적들에게 화살 열다섯 발'},
     skills:[SK('공중 삼연시','矢','proj',{kind:'farrow',el:'fire',cnt:3,spread:.3,d:1.2,dr:.1,mp:14,cd:4,spd:14},'화살 세 발을 연달아 쏜다.'),SK('궁요희','弓','passive',{mods:{crit:[4,.5],mspd:[3,.3]}},'활 쏘는 공주 — 치명타와 이동 속도가 오른다.')]},
  B:{n:'호희(虎姬)',ko:'호희',tree:2,col:'#ffb0c0',desc:['시녀 궁병을 이끄는 — 지휘의 길','최대 체력 +12% · 내공 +20% · 모든 스킬 +1'],bonus:{hpPct:12,mpPct:20,allSkill:1},
     sp:{n:'시녀 궁병대',key:'maids',f:'무장한 시녀 셋을 불러 15초간 함께 싸운다'},
     skills:[SK('호희의 호령','令','buff',{mods:{atkPct:[12,1.5],mspd:[8,.5]},dur:12,party:1,mp:28,cd:40},'아군의 공격과 이동을 끌어올린다.'),SK('강동의 호랑이 딸','虎','passive',{mods:{hpPct:[6,1.2],mpPct:[6,1.2]}},'손견의 딸 — 체력과 내공이 오른다.')]}}});
/* 전직 스킬 등록 (새 무장) */
for(const hid in CLASS1){if(TREES[hid])TREES[hid][3]='전직';
  for(const br of['A','B'])CLASS1[hid][br].skills.forEach((s,ti)=>{const id=`${hid}_c${br}${ti}`;if(SKILLS[id])return;
    Object.assign(s,{id,hero:hid,tr:3,ti,lv:ti?35:25,max:20,el:s.el||'phys',cls:br,syn:[]});SKILLS[id]=s;HSK[hid].push(s)})}
if(typeof SUMMON_LOOK!=='undefined'&&NPC_LOOK['병사'])SUMMON_LOOK.maid=Object.assign({},NPC_LOOK['병사'],{gtint:'rgba(255,120,170,.3)'});

/* 수련 조건 */
const isCmd=p=>['cmd','gcmd','spin','rise','special','clsx'].includes(p.state),isFin=p=>p.state==='attack'&&p.combo===3,isDash=p=>['dashatk','run','gcmd','spin','clsx'].includes(p.state),isShot=(p,a)=>a!==p||p.state==='pskill';
Object.assign(CQ_KILL,{
  zhang:{n:'전용기 · 커맨드 · 3타 피니시로 적 처치',f:p=>isCmd(p)||isFin(p)},
  huang:{n:'화살(투사체) · 스킬로 적 처치',f:isShot},
  ma:{n:'돌진 · 달리기 공격 · 커맨드로 적 처치',f:isDash},
  diao:{n:'연속기 · 회전 특수기로 적 처치',f:p=>p.state==='attack'||p.state==='spin'||p.state==='clsx'},
  wei:{n:'전용기 · 커맨드 · 필살기로 적 처치',f:isCmd},
  lubu:{n:'3타 피니시 · 커맨드 · 필살기로 적 처치',f:p=>isCmd(p)||isFin(p)},
  xu:{n:'3타 피니시 · 전용기 · 승천격으로 적 처치',f:p=>isFin(p)||isCmd(p)},
  gan:{n:'연속기 · 커맨드로 적 처치 (긴 채찍)',f:p=>p.state==='attack'||isCmd(p)},
  sun:{n:'화살(투사체) · 스킬로 적 처치',f:isShot}});

/* ---------------- 특수 기술 ---------------- */
const foesOn=()=>Wd.enemies.filter(e=>!e.dead&&onScreen(e,10));
function clsMount(p,col,t){if(!p.lookBase)p.lookBase=p.look;p.look=Object.assign({},p.lookBase,{mount:col});p.buf.spd=Math.max(p.buf.spd||0,t)}
function clsBm(p,k,v){p.bm[k]=(p.bm[k]||0)+v}
const _clsUpd1=clsUpd;
clsUpd=function(p){
  const w=Wd,t=p.t,f=p.facing,C=clsOf(p)||{col:'#fff'},col=C.col,K=KIT[p.h.id],k0=GP_KIT,f0=GP_F;GP_KIT=K||null;GP_F=f;
  try{clsUpd2(p,w,t,f,C,col,K)}finally{GP_KIT=k0;GP_F=f0}
};
function clsUpd2(p,w,t,f,C,col,K){
  switch(p.clsK){
    case'roar':if(t===10){gv(gpAdd,{k:'roar',x:p.x,y:p.y,z:70,f:1,col,r:620,dur:30});gv(gpAdd,{k:'roar',x:p.x,y:p.y,z:70,f:-1,col,r:620,dur:30});vfx({k:'shock',x:p.x,y:p.y,col,life:30,r:700});
        gpV(gpAdd,{k:'kanji',x:p.x,y:p.y,z:200,txt:'일갈!!',col,size:72,dur:50});w.shake=Math.max(w.shake,30);sfx('roar');
        for(const e of foesOn()){damage(p,e,gpPow(p,1.5),false,{stun:150});if(!e.boss)e.x+=Math.sign(e.x-p.x)*60}}if(t>=30)clsEnd(p);break;
    case'drunk':if(t===8){p.clsBuf={k:'drunk',t:600};clsBm(p,'atkPct',40);gpV(gpAdd,{k:'kanji',x:p.x,y:p.y,z:170,txt:'취권',col,size:44,dur:40});sfx('item')}if(t>=20)clsEnd(p);break;
    case'pierce':if(t===12){const x1=p.x+f*W*1.1;ghArrow(gpAdd,p.x+f*20,p.y,60,x1,p.y,60,col,0,20);vfx({k:'thrust',f:p,x:p.x,y:p.y,z:60,dir:f,col,len:W,w:20,dur:14,life:18});
        gpHit(p,e=>(e.x-p.x)*f>0&&Math.abs(e.y-p.y)<50,gpPow(p,4),true);sfx('bow');w.shake=Math.max(w.shake,12)}if(t>=26)clsEnd(p);break;
    case'veteran':if(t===8){p.hp=Math.min(p.maxhp,p.hp+Math.round(p.maxhp*.2));p.clsBuf={k:'veteran',t:600};clsBm(p,'atkPct',30);clsBm(p,'crit',20);vfx({k:'pillar',x:p.x,y:p.y,f:p,col,life:40,w:90,h:320});sfx('lvl')}if(t>=20)clsEnd(p);break;
    case'mount':case'redhare':if(t===8){const dur=p.clsK==='mount'?600:720;clsMount(p,p.clsK==='mount'?'#e8e2d8':'#b8321c',dur);p.clsBuf={k:'mount',t:dur,atk:p.clsK==='redhare'};if(p.clsK==='redhare')clsBm(p,'atkPct',20);
        vfx({k:'shock',x:p.x,y:p.y,col,life:24,r:200});for(let i=0;i<14;i++)emit({x:p.x+rnd(-30,30),y:p.y,z:2,vz:rnd(1,3),vx:rnd(-3,3),col:'#b8a080',size:rnd(10,18),life:30,type:'smoke',add:false});sfx('dash')}if(t>=16)clsEnd(p);break;
    case'lion':if(t===10){gv(gpAdd,{k:'roar',x:p.x,y:p.y,z:70,f,col,r:460,dur:26});gpV(gpAdd,{k:'kanji',x:p.x+f*120,y:p.y,z:180,txt:'사자후',col,size:50,dur:40});sfx('roar');w.shake=Math.max(w.shake,18);
        gpHit(p,e=>(e.x-p.x)*f>-20&&(e.x-p.x)*f<460&&Math.abs(e.y-p.y)<90,gpPow(p,2),true,{stun:60})}if(t>=24)clsEnd(p);break;
    case'charm':if(t===10){gv(gpAdd,{k:'petals',x:p.x,y:p.y,z:30,n:50,sp:300,out:1.4,sw:1,zr:120,col,dur:60});for(const e of foesOn()){damage(p,e,gpPow(p,.5),false,{stun:300});e.charmGP=300}sfx('charm')}if(t>=24)clsEnd(p);break;
    case'moon':if(t===10){ghUnder(gpAdd,{sub:'moonbg',x:p.x,y:p.y,z:240,r:70,col,dur:120});for(const e of foesOn()){e.stt=e.stt||{};e.stt.chill=Math.max(e.stt.chill||0,360);damage(p,e,gpPow(p,1),false)}sfx('magic')}if(t>=24)clsEnd(p);break;
    case'fury':if(t===8){p.clsBuf={k:'fury',t:480};clsBm(p,'atkPct',30);gv(gpAdd,{k:'fire',x:p.x,y:p.y,col,w:90,h:260,dur:30});sfx('fire')}if(t>=20)clsEnd(p);break;
    case'ambush':if(t===6){const F=foesOn().sort((a,b)=>Math.abs(b.x-p.x)-Math.abs(a.x-p.x)),e=F[0];if(e){const d=Math.sign(e.x-p.x)||f;w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:18,facing:f,look:p.look,pose:poseOf(p),tint:hexA(col,.6)});p.x=e.x+d*50;p.facing=-d;}
        gpV(gpAdd,{k:'kanji',x:p.x,y:p.y,z:170,txt:'기습',col,size:48,dur:36})}
      if(t===14){K&&K.ground(gpAdd,gpEmit,p.x+p.facing*40,p.y,true);gpHit(p,e=>Math.abs(e.x-(p.x+p.facing*40))<150&&Math.abs(e.y-p.y)<70,gpPow(p,3),true,{launch:true});w.shake=Math.max(w.shake,20);sfx('bomb')}if(t>=28)clsEnd(p);break;
    case'musou':{p.inv=Math.max(p.inv,6);if(t>=6&&t<=50&&(t-6)%4===0){const F=foesOn(),e=F.length?F[((t-6)/4)%F.length]:null,x=e?e.x:p.x+f*rnd(60,300),y=e?e.y:p.y;
        gpV(gpAdd,{k:'slash',x,y,z:rnd(40,110),col:t%8?col:'#ffd040',ang:rnd(-1.3,1.3),len:rnd(220,320),w:11,dur:12});if(e)damage(p,e,gpPow(p,1),t>=50,{stun:12});sfx('slash')}
      if(t===52)gpV(gpAdd,{k:'kanji',x:p.x+f*150,y:p.y,z:190,txt:'무쌍',col,size:70,dur:46});if(t>=60)clsEnd(p);break}
    case'split':if(t===12){ghUnder(gpAdd,{sub:'fissure',x0:p.x,x1:p.x+f*700,y:p.y,col,dur:70});for(let i=0;i<10;i++){const x=p.x+f*(60+i*65);gv(gpAdd,{k:'spike',x,y:p.y,n:5,w:30,h:90,col,delay:i*2,dur:40});ghDelayHit(p,i*2+2,x,p.y,60,2.5,{launch:true})}
        w.shake=Math.max(w.shake,26);sfx('rock')}if(t>=28)clsEnd(p);break;
    case'wall':if(t===8){p.clsBuf={k:'wall',t:480};for(const q of w.ps)if(!q.dead&&!q.out){clsBm(q,'dr',40);q.wallGP=480}vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:60,r:180,spin:-1});sfx('magic')}if(t>=20)clsEnd(p);break;
    case'storm':for(let k=0;k<3;k++)if(t===8+k*12){for(const e of foesOn()){gv(gpAdd,{k:'chain',x0:p.x,y0:p.y,z0:70,x1:e.x,y1:e.y,z1:55,col,dur:10});_gpBoltGH(gpAdd,gpEmit,e.x,e.y,'#80d0ff',2,5);damage(p,e,gpPow(p,1),k===2,{stun:20})}sfx('bolt')}if(t>=40)clsEnd(p);break;
    case'stealth':if(t===6){p.clsBuf={k:'stealth',t:300};w.fx.push({type:'smoke',x:p.x,y:p.y,t:0,life:30});sfx('wind')}if(t>=14)clsEnd(p);break;
    case'volley':{const z=t<14?Math.sin(t/14*Math.PI/2)*130:t<40?130:130*(1-(t-40)/10);p.z=Math.max(0,z);
      if(t>=12&&t<=40&&t%2===0){const F=foesOn(),e=F.length?F[(t/2)%F.length]:null,x=e?e.x+rnd(-20,20):p.x+f*rnd(60,300),y=e?e.y:p.y;ghArrow(gpAdd,p.x,p.y,p.z+50,x,y,0,col,0,12);ghDelayHit(p,6,x,y,50,.8,{stun:10});if(t%6===0)sfx('bow')}
      if(t>=50){p.z=0;clsEnd(p)}break}
    case'maids':if(t===10){for(let i=0;i<3;i++)spawnAlly(p,{look:'maid',id:'cls_maid',dur:15},{aw:false,base:basePow(p),dm:1.4},i,3);vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:40,r:120,spin:1});sfx('magic')}if(t>=24)clsEnd(p);break;
    default:return _clsUpd1(p);
  }
  const maxX=w.lock!==null?w.camX+W-25:Math.min(w.S.len-25,w.camX+W-25);p.x=clamp(p.x,w.camX+25,maxX);
}
/* 지속 효과: 해제 · 기마 접촉 · 의천류 */
const _updPlayerCL2=updPlayer;
updPlayer=function(p){
  _updPlayerCL2(p);if(scene!=='play'||p.out)return;const B=p.clsBuf,w=Wd;
  if(B&&B.k==='drunk'&&B.t%60===0)p.hp=Math.min(p.maxhp,p.hp+Math.ceil(p.maxhp*.01));
  if(B&&B.k==='mount'&&(p.state==='walk'||p.state==='run')&&w.t%15===0)gpHit(p,e=>Math.abs(e.x-p.x)<60&&Math.abs(e.y-p.y)<34,gpPow(p,.8),true);
  if(B&&B.k==='wall'&&w.t%20===0)vfx({k:'shock',x:p.x,y:p.y,col:'#a8b8c8',life:18,r:150});
  if(B&&B.k==='stealth')p.inv=Math.max(p.inv,2);
  if(B&&B.k==='fury'&&w.t%10===0)emit({x:p.x+rnd(-20,20),y:p.y,z:rnd(0,40),vz:rnd(2,4),col:'#ff6020',size:rnd(2,4),life:20,type:'sq'});
  /* 버프 종료 시 되돌리기 */
  if(p.clsPrev&&(!B||B!==p.clsPrev.B)){const o=p.clsPrev;if(o.k==='drunk')clsBm(p,'atkPct',-40);if(o.k==='veteran'){clsBm(p,'atkPct',-30);clsBm(p,'crit',-20)}if(o.k==='fury')clsBm(p,'atkPct',-30);
    if(o.k==='mount'){if(p.lookBase){p.look=p.lookBase;p.lookBase=null}if(o.atk)clsBm(p,'atkPct',-20)}if(o.k==='wall')for(const q of w.ps)if(q.wallGP){q.wallGP=0;clsBm(q,'dr',-40)}p.clsPrev=null}
  if(B&&!p.clsPrev)p.clsPrev={B,k:B.k,atk:B.atk};
};
/* 피해: 은신 일격 · 열화 추가타 · 매혹된 적 지속 피해 · 시련 처치 수 */
const _damageCL2=damage;
damage=function(a,t,dmg,knock,opt){
  const own=a&&t&&!t.isPlayer?ownerOf(a):null,B=own&&own.clsBuf;
  if(B&&B.k==='stealth'&&B.t>0&&a===own&&typeof dmg==='number'){dmg*=3;own.clsBuf=null;gpV(gpAdd,{k:'kanji',x:t.x,y:t.y,z:150,txt:'야습!',col:'#80d0ff',size:40,dur:30})}
  const was=t.dead,r=_damageCL2(a,t,dmg,knock,opt);
  if(own&&B&&B.k==='fury'&&B.t>0&&a===own&&r&&!t.dead&&!(opt&&(opt.dot||opt.cls))&&!(own.clsHitCd>0)){own.clsHitCd=12;gv(gpAdd,{k:'fire',x:t.x,y:t.y,col:'#ff5020',w:50,h:160,dur:22});ghLater(6,()=>{if(!t.dead)damage(own,t,Math.round(dmg*.5),false,{cls:1})})}
  if(Wd&&Wd.S&&Wd.S.killGoal&&!was&&t.dead&&!t.isPlayer&&own)Wd.trialKills=(Wd.trialKills||0)+1;
  return r;
};

/* ---------------- 시련 규칙 ---------------- */
const bossOf=name=>{const s=STAGES.find(s=>s.boss&&s.boss.name===name);return s?s.boss:MIDBOSS};
const bossX=(name,o)=>Object.assign({},bossOf(name),{hp:Math.round(bossOf(name).hp*TRH*(o&&o.hm||1)),pow:Math.round(bossOf(name).pow*TRP),escort:'',score:9000},o||{});
const newBoss=(name,title,look,o)=>Object.assign({name,title,hp:Math.round(520*TRH),pow:Math.round(12*TRP),spd:2.1,reach:86,skills:['dash','slam'],escort:'',score:9000,poise:80,look},o||{});
function trialWin(){const w=Wd;for(const e of w.enemies)if(!e.dead){e.hp=0;e.dead=true;e.remove=true}hitstop=Math.max(hitstop,30);w.flashT=20;w.clear=1;sfx('treasure')}
const _btCL2=battleTick;
battleTick=function(){
  _btCL2();const w=Wd;if(!w||!w.S||!w.S.trial)return;const S=w.S;if(w.failT&&S.failMsg)w.failMsg=S.failMsg;if(w.clear||w.failT)return;
  if(S.survive||S.killGoal){/* 화면 고정 + 끝없는 증원 */
    if(w.lock===null)w.lock=w.camX;w.spT=(w.spT||0)+1;
    if(w.spT%(S.spawnEvery||150)===0&&w.enemies.filter(e=>!e.dead).length<(S.maxAlive||8)){const n=S.spawnN||2;for(let i=0;i<n;i++)spawnEnemy(pick(S.pool||['s','sp']))}}
  if(S.survive){w.survT=(w.survT==null?S.survive:w.survT)-1;if(w.survT<=0)trialWin()}
  if(S.killGoal&&(w.trialKills||0)>=S.killGoal)trialWin();
  if(S.rushNext&&w.rushT>0&&--w.rushT===0){const def=S.rush[w.rushI];w.boss=spawnBoss(def);w.bossT=w.t;showMsg(`${def.name} 등장!`,'',false)}
};
/* 보스 연전: 마지막 보스가 아니면 클리어 대신 다음 보스 */
const _onDeathCL=onDeath;
onDeath=function(t,own){
  const w=Wd,S=w&&w.S;
  if(S&&S.trial&&S.rush&&t.boss&&!t.mid){w.rushI=(w.rushI||0)+1;
    if(w.rushI<S.rush.length){const c0=w.clear;_onDeathCL(t,own);w.clear=c0;S.rushNext=true;w.rushT=120;hitstop=Math.max(hitstop,20);return}}
  return _onDeathCL(t,own);
};
const _stageEvInitCL2=stageEvInit;
stageEvInit=function(i){
  _stageEvInitCL2(i);const S=STAGES[i];if(!S||!S.trial)return;const w=Wd;
  w.survT=null;w.trialKills=0;w.spT=0;w.rushI=0;w.rushT=0;S.rushNext=false;
  if(S.arrows)w.arrowOn=true;
  if(S.escortNpc){const p=w.ps[0];w.escort=mkNpc(S.escortNpc,p.x-90,p.y,Math.round(420*(1+.06*w.lv)))}
  if(S.rush)S.boss=S.rush[0];
};
const _dboCL2=drawBattleOver;
drawBattleOver=function(cx){_dboCL2(cx);const w=Wd;if(!w||!w.S||!w.S.trial||w.clear)return;const S=w.S;
  const L=[];if(S.survive&&w.survT!=null)L.push(`버텨라 ${Math.max(0,Math.ceil(w.survT/60))}초`);if(S.killGoal)L.push(`처치 ${Math.min(w.trialKills||0,S.killGoal)} / ${S.killGoal}`);
  if(S.rush)L.push(`보스 연전 ${Math.min((w.rushI||0)+1,S.rush.length)} / ${S.rush.length}`);
  L.forEach((s,k)=>txt(s,W/2,(w.trialT!=null?154:132)+k*22,18,'#ffe8a8','center',FONT,['#000',4]))};

/* 시련 스테이지 9종 */
const E2=(t,o)=>Object.assign({t:60,pause:true},o,{talk:t});
clsAddTrial('zhang',{waves:[],title:'시련  장판교',sub:'홀로 다리를 막다',bg:'bridge',fac:'wei',len:2400,mus:2,trial:'zhang',survive:75*60,spawnEvery:120,spawnN:2,maxAlive:9,pool:['s','sp','sh','a','o'],
  story:['백성들이 다리를 건너는 동안, 장비는 홀로 장판교 위에 섰다.','다리 뒤 숲에서는 기병 스무 명이 말꼬리에 나뭇가지를 매달고 먼지를 일으켰다.','"연인 장익덕이 여기 있다! 누가 감히 나와 사생을 결하겠느냐!"','— 시련: 75초 동안 다리를 지켜라 (끝없이 몰려오는 적)'],
  boss:newBoss('하후걸','조조의 측근',Object.assign({},enemyLook('wei','o'),{scale:1.2})),failMsg:'시련 실패 — 장판교를 지키지 못했다. (다시 도전할 수 있다)',
  ev:[E2([['@','이 다리는 한 발짝도 못 지나간다!'],[TIP,'시련: 75초 동안 버텨라']]),{t:2400,talk:[['병사','조조군이 망설입니다! 장군의 기세에 눌렸습니다!']]},{t:3900,talk:[['@','으하하! 덤벼라! 더 없느냐!']]}]});
clsAddTrial('huang',{title:'시련  정군산',sub:'노장의 일기토',bg:'pass',fac:'wei',len:2600,mus:4,trial:'huang',arrows:true,limit:170*60,
  story:['정군산 기슭, 하후연의 궁기병이 산비탈에 진을 쳤다.','"칠순 노장이 무엇을 하겠느냐!" 위군의 비웃음이 산에 울린다.','황충은 대도를 등에 메고 활시위를 당겼다.','— 시련: 화살비 속에서 170초 안에 하후연을 쓰러뜨려라'],
  waves:[[400,'a a s'],[1100,'a sp a o'],[1800,'a a sh sp']],boss:bossX('하후연'),failTxt:'날이 저물었다… 시련 실패',failMsg:'시련 실패 — 해가 지기 전에 하후연을 베지 못했다. (다시 도전할 수 있다)',
  ev:[E2([['@','늙은이의 활이 얼마나 매서운지 보여 주마!'],[TIP,'시련: 화살비를 피하며 제한 시간 안에 하후연 격파']]),{boss:true,talk:[['하후연','노인네가 여기까지 오다니!'],['@','세월이 활시위를 늦추지는 못하지!']]},{clear:true,talk:[['@','하하! 아직 쓸 만하지 않소!']]}]});
clsAddTrial('ma',{title:'시련  동관',sub:'조조를 쫓아라',bg:'pass',fac:'wei',len:3200,mus:4,trial:'ma',limit:140*60,
  story:['아버지 마등의 원수를 갚기 위해, 마초는 서량의 기병을 이끌고 동관을 짓밟았다.','"붉은 전포를 입은 자가 조조다!" — 조조는 전포를 벗어 던지고 달아났다.','"수염이 긴 자가 조조다!" — 조조는 칼로 수염을 잘랐다.','— 시련: 140초 안에 달아나는 조조를 따라잡아 쓰러뜨려라'],
  waves:[[350,'s sp s'],[1000,'sp sh a'],[1700,'o sp sp a'],[2400,'sh sp a s']],boss:bossX('조조',{hm:.8}),failTxt:'조조가 달아났다… 시련 실패',failMsg:'시련 실패 — 조조를 놓쳤다. (다시 도전할 수 있다)',
  ev:[E2([['@','조조! 아버지의 원수, 오늘 갚겠다!'],[TIP,'시련: 제한 시간 안에 조조를 따라잡아라']]),{wave:3,talk:[['병사','수염을 자른 자가 조조입니다!']]},{boss:true,talk:[['조조','마아들이 죽지 않으면 나는 묻힐 땅도 없겠구나…!'],['@','도망칠 곳은 없다!']]}]});
clsAddTrial('diao',{title:'시련  연환계',sub:'봉의정의 밤',bg:'night',fac:'dong',len:2400,mus:1,trial:'diao',noLives:true,
  story:['왕윤의 연환계 — 초선은 동탁과 여포 사이에서 춤추었다.','봉의정의 밤, 동탁의 친위대가 초선을 붙잡으러 몰려온다.','"이 춤이 끝나면, 폭군의 시대도 끝날 거예요."','— 시련: 목숨 하나로 동탁을 쓰러뜨려라 (쓰러지면 실패)'],
  waves:[[400,'s s sp'],[1000,'sp a o'],[1600,'sh sp o a']],boss:newBoss('동탁','상국',Object.assign({},enemyLook('dong','o'),{scale:1.5}),{hp:Math.round(640*TRH),skills:['slam','dash','slam']}),
  failMsg:'시련 실패 — 봉의정에서 쓰러졌다. (다시 도전할 수 있다)',
  ev:[E2([['@','춤을 추듯이… 하나도 빠짐없이 베어 드릴게요.'],[TIP,'시련: 목숨 하나 — 쓰러지면 실패']]),{boss:true,talk:[['동탁','초선! 네 이년, 감히 나를 배신해!'],['@','처음부터 당신 편이었던 적은 없어요.']]},{clear:true,talk:[['@','폭군의 시대는 끝났어요. 봉선… 이제 자유예요.']]}]});
clsAddTrial('wei',{waves:[],title:'시련  자오곡',sub:'기습의 길',bg:'pass',fac:'wei',len:2400,mus:4,trial:'wei',killGoal:50,limit:110*60,spawnEvery:90,spawnN:3,maxAlive:10,pool:['s','sp','a','sh','o'],
  story:['"군사 만 명만 주시면 자오곡을 지나 열흘 안에 장안을 치겠습니다."','위연의 계책은 받아들여지지 않았다. 그러나 위연은 홀로 그 길을 확인하러 나섰다.','좁은 계곡, 적은 아직 기습을 모른다.','— 시련: 110초 안에 적 50명을 쓰러뜨려라'],
  boss:newBoss('하후무','위의 부마',Object.assign({},enemyLook('wei','o'),{scale:1.2})),failTxt:'기습이 들통났다… 시련 실패',failMsg:'시련 실패 — 기습에 실패했다. (다시 도전할 수 있다)',
  ev:[E2([['@','반골이라 불러도 좋다. 결과로 보여 주마!'],[TIP,'시련: 110초 안에 50명 처치']])]});
clsAddTrial('lubu',{title:'시련  백문루',sub:'천하무쌍의 증명',bg:'fortress',fac:'wei',len:2200,mus:1,trial:'lubu',
  rush:[bossX('하후돈',{hm:.8}),bossX('장료',{hm:.8}),bossX('허저',{hm:.9})],
  story:['하비성이 함락되던 날, 여포는 백문루에 몰렸다.','"천하무쌍이 이렇게 끝날 수는 없다!"','조조의 맹장들이 하나씩 백문루로 올라온다.','— 시련: 하후돈 · 장료 · 허저 세 장수를 연달아 쓰러뜨려라'],
  waves:[[500,'s sp s'],[1200,'sp o a']],failMsg:'시련 실패 — 백문루에서 쓰러졌다. (다시 도전할 수 있다)',
  ev:[E2([['@','오너라. 천하무쌍이 누구인지 똑똑히 보여 주마.'],[TIP,'시련: 보스 셋 연전']]),{boss:true,talk:[['하후돈','여포! 오늘이 네 마지막 날이다!']]},{clear:true,talk:[['@','…역사가 나를 버려도, 이 방천화극은 꺾이지 않는다.']]}]});
clsAddTrial('xu',{title:'시련  번성',sub:'포위를 뚫어라',bg:'fortress',fac:'yuan',len:3000,mus:1,trial:'xu',limit:170*60,
  story:['관우의 포위로 번성은 함락 직전이었다.','서황은 구원군을 이끌고 관우 진영의 겹겹이 쌓인 녹각을 부수며 나아갔다.','"장군의 군은 열 겹 포위를 뚫었으니, 주아부의 풍모가 있구려!"','— 시련: 방패병의 진을 깨고 170초 안에 적장을 쓰러뜨려라'],
  waves:[[350,'sh sh s'],[1000,'sh sp sh a'],[1700,'sh sh o sp'],[2300,'sh sh sh a']],boss:newBoss('요화','관우군 주부',Object.assign({},enemyLook('yuan','o'),{scale:1.25})),
  failTxt:'번성이 함락됐다… 시련 실패',failMsg:'시련 실패 — 번성 구원에 늦었다. (다시 도전할 수 있다)',
  ev:[E2([['@','이 대부로 열 겹 포위를 가르겠다!'],[TIP,'시련: 방패병은 뒤 · 3타 · 강한 일격으로 깨라']]),{clear:true,talk:[['@','번성의 포위가 풀렸다. 장군의 풍모라… 과찬이오.']]}]});
clsAddTrial('gan',{waves:[],title:'시련  유수구',sub:'백기 야습',bg:'night',fac:'wei',len:2400,mus:3,trial:'gan',killGoal:100,limit:150*60,spawnEvery:70,spawnN:3,maxAlive:12,pool:['s','sp','a','sh'],
  story:['조조의 사십만 대군이 유수구에 진을 쳤다.','감녕은 기병 백 명만을 이끌고 한밤중에 적진으로 뛰어들었다.','"백 명으로 만 명을 친다 — 방울 소리를 신호로 삼아라!"','— 시련: 150초 안에 적 100명을 쓰러뜨려라'],
  boss:newBoss('조인','조조의 종제',Object.assign({},enemyLook('wei','o'),{scale:1.25})),failTxt:'날이 밝았다… 시련 실패',failMsg:'시련 실패 — 야습이 끝나기 전에 목표를 채우지 못했다. (다시 도전할 수 있다)',
  ev:[E2([['@','방울 소리가 들리면 그게 내 신호다! 가자!'],[TIP,'시련: 150초 안에 100명 처치']]),{t:3000,talk:[['병사','적진이 혼란에 빠졌습니다!']]}]});
clsAddTrial('sun',{title:'시련  감로사',sub:'유비를 지켜라',bg:'plains',fac:'wu',len:3000,mus:0,trial:'sun',escortNpc:'유비',
  story:['손권의 계략으로 혼인하러 강동에 온 유비 — 그러나 감로사에는 자객이 숨어 있었다.','손상향은 활을 들고 남편이 될 사람 앞에 섰다.','"제 남편이 될 분을 해치려는 자는, 오라버니의 군사라도 용서하지 않아요!"','— 시련: 유비를 지키며 감로사를 빠져나가라 (유비가 쓰러지면 실패)'],
  waves:[[350,'s s a'],[1000,'sp a s'],[1700,'a sh sp'],[2300,'o a a']],boss:newBoss('가화','자객 두령',Object.assign({},enemyLook('wei','s'),{scale:1.3}),{skills:['dash','dash','slam']}),
  failMsg:'시련 실패 — 유비를 지키지 못했다. (다시 도전할 수 있다)',
  ev:[E2([['유비','부인, 위험하오! 뒤로 물러서시오!'],['@','제 뒤에 계세요. 활은 제가 쏩니다!'],[TIP,'시련: 유비를 지켜라']]),{boss:true,talk:[['가화','손 부인, 비키시오! 우리 목표는 유비뿐이오!'],['@','그 목표, 화살로 꿰뚫어 드릴게요.']]},{clear:true,talk:[['유비','부인 덕분에 살았소. 강동의 호랑이 딸이란 말이 과연이구려.']]}]});
/* 'wu' 세력이 없으면 'wei' 로 */
for(const hid in CLS_TRIAL){const S=STAGES[CLS_TRIAL[hid]];if(!FAC[S.fac])S.fac='wei'}
