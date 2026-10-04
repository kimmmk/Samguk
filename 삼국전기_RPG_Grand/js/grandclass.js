'use strict';
/* ===== 1차 전직 (1단계: 관우 · 조운 · 제갈량) =====
   · 조건: 캐릭터 Lv.25 + 제6장 적벽 클리어 → 군영 「전직」에서 퀘스트 진행
   · 퀘스트: ① 수련(무장별 처치 조건 40회) ② 무장의 증표 3개(장교 · 정예 · 보스 드랍) ③ 시련 전투(무장별 전용 스테이지)
   · 시련 통과 → 두 갈래 중 하나 선택: 직업 보너스 + 특수 기술(→↓→ + 공격) + 전직 스킬 2개(Lv.25 · Lv.35)
   · 갈래 변경: 군영 「전직」에서 금화로 (전직 스킬 포인트 반환) */

/* ---------------- 데이터 ---------------- */
const CLASS1={
 guan:{
  A:{n:'무성(武聖)',ko:'무성',tree:1,col:'#3ad07a',desc:['청룡도법과 무신을 극한까지 — 공격의 길','공격력 +10% · 치명타 피해 +30% · 전용기 피해 +30%'],bonus:{atkPct:10,critDmg:30,cmdDmg:30},
     sp:{n:'청룡강림',key:'dragon',f:'청룡이 10초간 곁을 지키며, 공격할 때마다 함께 내리꽂아 추가 피해(60%)'},
     skills:[{n:'청룡난무',ic:'舞',ty:'whirl',d:1.0,dr:.08,mp:22,cd:7,dur:90,r:150,col:'#3ad07a',f:'청룡의 기운을 두르고 회전하며 주변을 벤다. 이동 가능.'},
             {n:'무성의 위엄',ic:'聖',ty:'passive',mods:{atkPct:[6,1],critDmg:[10,2]},f:'무성의 경지 — 공격력과 치명타 피해가 오른다.'}]},
  B:{n:'의장(義將)',ko:'의장',tree:2,col:'#ffd040',desc:['의리를 지키는 장수 — 수호와 반격의 길','최대 체력 +15% · 받는 피해 -8% · 기력 획득 +20%'],bonus:{hpPct:15,dr:8,kiGain:20},
     sp:{n:'의천(義天)',key:'yi',f:'8초간 받는 피해 -30%, 맞으면 그 적에게 즉시 반격 · 아군 체력 회복'},
     skills:[{n:'도원의 맹세',ic:'盟',ty:'buff',mods:{dr:[12,1],atkPct:[12,1.5]},dur:12,party:1,mp:30,cd:40,col:'#ffd040',f:'아군 전원의 공격과 방어를 끌어올린다.'},
             {n:'관운장의 의기',ic:'義',ty:'passive',mods:{hpPct:[8,1.5],dr:[3,.4]},f:'꺾이지 않는 의기 — 체력과 피해 감소가 오른다.'}]}},
 zhao:{
  A:{n:'은룡(銀龍)',ko:'은룡',tree:1,col:'#9ad8ff',desc:['백룡처럼 꿰뚫는 창 — 속도와 치명의 길','치명타 +8% · 이동 속도 +10% · 돌진 피해 +40%'],bonus:{crit:8,mspd:10,dashDmg:40},
     sp:{n:'칠진칠출',key:'seven',f:'화면의 적 사이를 일곱 번 순간 돌진하며 꿰뚫는다 (무적)'},
     skills:[{n:'은룡섬',ic:'閃',ty:'dash',el:'ice',d:2.8,dr:.25,mp:16,cd:4,dist:16,f:'얼음 기운을 두른 창으로 번개처럼 꿰뚫는다.'},
             {n:'백룡의 혼',ic:'魂',ty:'passive',mods:{crit:[4,.5],dashDmg:[15,3]},f:'백룡의 혼 — 치명타와 돌진 피해가 오른다.'}]},
  B:{n:'담장(膽將)',ko:'담장',tree:2,col:'#e8e8ff',desc:['온몸이 담력 — 회피와 반격의 길','회피 +8% · 받는 피해 -6% · 최대 체력 +10%'],bonus:{dodge:8,dr:6,hpPct:10},
     sp:{n:'일신시담',key:'counter',f:'3초간 반격 자세 — 그 사이 공격을 받으면 피해 없이 받아치는 일격(300%)'},
     skills:[{n:'담대한 일격',ic:'膽',ty:'nova',d:1.8,dr:.15,mp:18,cd:6,r:170,stun:50,f:'주변의 적을 크게 내려쳐 기절시킨다.'},
             {n:'일신시담',ic:'身',ty:'passive',mods:{dodge:[4,.4],dr:[3,.4]},f:'온몸이 담력 — 회피와 피해 감소가 오른다.'}]}},
 zhuge:{
  A:{n:'천문사(天文師)',ko:'천문사',tree:1,col:'#b088ff',desc:['하늘을 읽어 벼락을 부르는 — 술법의 길','스킬 피해 +25% · 뇌전 피해 +30% · 재사용 대기 -8%'],bonus:{skillDmg:25,bolt:30,cdr:8},
     sp:{n:'칠성단',key:'altar',f:'8초간 칠성단을 펼쳐 안의 적에게 낙뢰, 안의 아군은 스킬 피해 +30%'},
     skills:[{n:'천뢰진',ic:'雷',ty:'rain',el:'bolt',hk:'bolt',d:1.5,dr:.12,mp:30,cd:8,cnt:10,spread:460,f:'하늘에서 열 줄기 벼락을 떨어뜨린다.'},
             {n:'천문 통달',ic:'星',ty:'passive',mods:{skillDmg:[8,1.5],bolt:[10,2]},f:'천문을 꿰뚫어 스킬 · 뇌전 피해가 오른다.'}]},
  B:{n:'와룡군사(臥龍軍師)',ko:'와룡군사',tree:2,col:'#d8b070',desc:['계책과 기계로 싸우는 — 지휘의 길','최대 내공 +25% · 내공 회복 +50% · 모든 스킬 +1'],bonus:{mpPct:25,mpRegen:50,allSkill:1},
     sp:{n:'목우유마',key:'ox',f:'나무 기계 병사 셋을 만들어 15초간 함께 싸운다'},
     skills:[{n:'팔진 돌병',ic:'陣',ty:'summon',look:'stone',cnt:3,d:1,dr:.1,mp:30,cd:24,dur:20,f:'팔진도의 돌 병사 셋을 불러낸다.'},
             {n:'와룡의 지혜',ic:'智',ty:'passive',mods:{cdr:[4,.4],mpPct:[8,1.5]},f:'와룡의 지혜 — 재사용 대기 감소와 내공이 오른다.'}]}}};
const CLS_LV1=25,CLS_GOLD=50000;
/* 전직 스킬 등록 (계열 3 = 「전직」) */
for(const hid in CLASS1){if(TREES[hid])TREES[hid][3]='전직';
  for(const br of['A','B'])CLASS1[hid][br].skills.forEach((s,ti)=>{const id=`${hid}_c${br}${ti}`;if(SKILLS[id])return;
    Object.assign(s,{id,hero:hid,tr:3,ti,lv:ti?35:25,max:20,el:s.el||'phys',cls:br,syn:[]});SKILLS[id]=s;HSK[hid].push(s)})}
if(typeof SUMMON_LOOK!=='undefined'&&SUMMON_LOOK.stone)SUMMON_LOOK.mech=Object.assign({},SUMMON_LOOK.stone,{gtint:'rgba(150,100,50,.55)'});

/* 무장별 수련 조건 */
const CQ_KILL={guan:{n:'전용기 · 커맨드 · 특수기로 적 처치',f:p=>['cmd','gcmd','spin','rise','clsx'].includes(p.state)},
  zhao:{n:'돌진 · 달리기 공격 · 커맨드로 적 처치',f:p=>['dashatk','run','gcmd','spin','clsx'].includes(p.state)},
  zhuge:{n:'액티브 스킬 · 투사체 · 장판으로 적 처치',f:(p,a)=>p.state==='pskill'||a!==p}};
const CQ_NEED=40,CQ_TOK=3;
const cqHas=ps=>!!CLASS1[HEROES[ps.hero].id];
const cqRedCliff=()=>!!G&&Object.keys(G.clears||{}).some(k=>k.endsWith(':3'));
const cqOpen=ps=>cqHas(ps)&&ps.lvl>=CLS_LV1&&cqRedCliff();
const cqOf=ps=>ps.rpg.cq||(ps.rpg.cq={k:0,tok:0,trial:false});
const cqStep=ps=>{if(ps.rpg.cls1)return 4;const q=cqOf(ps);if(q.trial)return 3;if(q.k>=CQ_NEED&&q.tok>=CQ_TOK)return 2;return 1};

/* ---------------- 능력치 · 스킬 ---------------- */
const _calcStatsCL=calcStats;
calcStats=function(ps,eqOv){
  const st=_calcStatsCL(ps,eqOv);if(st.tree&&st.tree.length<4)st.tree[3]=0;
  const C=ps.rpg.cls1&&CLASS1[HEROES[ps.hero].id]&&CLASS1[HEROES[ps.hero].id][ps.rpg.cls1];if(!C)return st;
  for(const [k,v] of Object.entries(C.bonus)){
    if(k==='hpPct')st.maxhp=Math.round(st.maxhp*(1+v/100));else if(k==='mpPct')st.maxmp=Math.round(st.maxmp*(1+v/100));
    else if(k==='mpRegen')st.mpRegen*=1+v/100;else if(typeof st[k]==='number')st[k]+=v}
  st.crit=Math.min(75,st.crit);st.dr=Math.min(60,st.dr);st.mspd=Math.min(80,st.mspd);st.cdr=Math.min(50,st.cdr);st.dodge=Math.min(35,st.dodge);
  return st;
};
const _learnSkillCL=learnSkill;
learnSkill=function(ps,id){
  const s=SKILLS[id];if(!s||!s.cls)return _learnSkillCL(ps,id);
  const r=ps.rpg,rk=r.sk[id]||0,C=CLASS1[s.hero][s.cls];
  if(r.cls1!==s.cls)return r.cls1?`「${C.n}」 갈래의 스킬입니다 (현재 「${CLASS1[s.hero][r.cls1].n}」 — 군영 「전직」에서 변경)`:`1차 전직 「${C.n}」 필요 — 군영 「전직」`;
  if(r.skillPts<=0)return '스킬 포인트가 없습니다';
  if(ps.lvl<s.lv)return `레벨 ${s.lv} 필요`;if(rk>=s.max)return '최대 레벨입니다';
  if(rk>=ps.lvl-s.lv+1)return `다음 레벨은 캐릭터 Lv.${s.lv+rk} 필요`;
  if(s.ti>0&&!r.sk[`${s.hero}_c${s.cls}0`])return `선행 스킬 「${C.skills[0].n}」 필요`;
  r.sk[id]=rk+1;r.skillPts--;if(!rk&&ACTIVE_TY[s.ty]&&!r.hot.includes(id)){const e=r.hot.indexOf(null);if(e>=0)r.hot[e]=id}
  recalc(ps);return null;
};
/* 스킬 창: 4열 (3계열 + 전직) */
const CLS_COLX=[40,182,324,466];
skillCells=function(ps){const hid=HEROES[ps.hero].id,cl=ps.rpg.cls1;
  return HSK[hid].filter(s=>s.tr<3||!cl||s.cls===cl).map(s=>{const row=s.tr<3?s.ti:(cl?s.ti:(s.cls==='A'?0:2)+s.ti);return{x:CLS_COLX[s.tr],y:84+row*84,w:54,h:54,s}})};
drawTabSkill=function(ps){
  const r=ps.rpg,hid=HEROES[ps.hero].id,cs=skillCells(ps),cl=r.cls1,CC=CLASS1[hid];if(MN.cur[1]>=cs.length)MN.cur[1]=0;const cur=MN.cur[1];
  panel(12,50,616,472);
  for(let tr=0;tr<4;tr++){const x=CLS_COLX[tr]+27,nm=tr<3?TREES[hid][tr]:CC?(cl?CC[cl].ko:'전직 (선택 전)'):'전직';txt(nm,x,64,tr===3?13:15,tr===3?'#ffb070':'#ffd24a');if(tr<3)txt(`${treePts(ps,tr)}pt`,x+62,64,10,'#aaa','right',MONO)}
  for(let tr=0;tr<3;tr++)for(let ti=0;ti<4;ti++){const x=CLS_COLX[tr]+27,on=r.sk[`${hid}_${tr}${ti}`];ctx.strokeStyle=on?'#b8902a':'#3a2a1a';ctx.lineWidth=3;line(x,84+ti*84+54,x,84+(ti+1)*84)}
  if(CC){const x=CLS_COLX[3]+27;for(const row of cl?(ps.rpg.cls2?[0,1]:[0]):[0,2]){ctx.strokeStyle='#5a3a1a';ctx.lineWidth=3;line(x,84+row*84+54,x,84+(row+1)*84)}
    if(!cl){txt('— 갈래 A —',x,78+0,10,'#c8a870');txt('— 갈래 B —',x,78+2*84,10,'#c8a870')}}
  else{ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(CLS_COLX[3]-6,80,130,400);for(const [i,l] of['1차 전직은','관우 · 조운 · 제갈량부터','적용됩니다','(다른 무장은','다음 단계에서 추가)'].entries())txt(l,CLS_COLX[3]+58,240+i*18,11,'#a89878')}
  cs.forEach((c,k)=>{const s=c.s,rk=r.sk[s.id]||0,lv=rk?skLv(ps,s.id):0;
    drawSkillIcon(s,ps,c.x,c.y,c.w,{sel:k===cur});
    if(s.cls&&(r.cls1!==s.cls||(s.cls2&&!r.cls2))){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(c.x,c.y,c.w,c.h);txt(s.cls2?'2차':'전직',c.x+c.w/2,c.y+c.h/2,11,'#ffb070','center',FONT,['#000',3])}
    txt(`${rk}/${s.max}`,c.x+c.w+3,c.y+c.h-8,10,rk?'#fff':'#777','left',MONO);
    if(lv>rk)txt(`(+${lv-rk})`,c.x+c.w+3,c.y+c.h-22,9,'#8ab8ff','left',MONO);
    if(r.enh[s.id])txt(`+${r.enh[s.id]}`,c.x+c.w-2,c.y+8,11,'#ffe060','right',MONO,['#000',3]);
    const hk=r.hot.indexOf(s.id);if(hk>=0){ctx.fillStyle='#ffd24a';ctx.fillRect(c.x-2,c.y-2,14,14);txt(kn(MN.i).sk[hk],c.x+5,c.y+5,10,'#000','center',MONO)}
    txt(`Lv${s.lv}`,c.x+c.w+3,c.y+8,9,ps.lvl>=s.lv?'#a89878':'#ff6050','left',MONO);
    txt(s.n,c.x+c.w/2,c.y+c.h+10,11,rk?'#e8d8c8':'#7a6a5a')});
  txt(`스킬 포인트  ${r.skillPts}`,30,506,17,r.skillPts?'#70ff90':'#aaa','left');
  txt('단축키',330,506,13,'#ffd24a','left');
  for(let k=0;k<4;k++){const x=390+k*56,id=r.hot[k];ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x,490,32,32);if(id)drawSkillIcon(SKILLS[id],ps,x,490,32,{hot:1});txt(kn(MN.i).sk[k],x+36,506,12,'#ffe890','left',MONO)}
  /* 툴팁 */
  panel(636,50,312,472);
  const s=cs[cur].s,rk=r.sk[s.id]||0,lv=rk?skLv(ps,s.id):0,e=r.enh[s.id]||0,col=skCol(s,ps),tb=ps.st.tree[s.tr]||0;
  let y=72;const put=(t,c,sz,ind)=>{for(const ln of wrap(t,286-(ind||0),sz)){if(y>512)return;txt(ln,650+(ind||0),y,sz,c,'left');y+=sz+5}};
  put(s.n,col,20);put(`${TYN[s.ty]}  ·  ${s.cls?`전직 「${CC[s.cls].n}」`:TREES[hid][s.tr]} ${s.ti+1}단계`,'#a89878',12);
  if(s.cls&&r.cls1!==s.cls)put(r.cls1?'다른 갈래의 전직 스킬입니다 (군영 「전직」에서 갈래 변경 가능)':`1차 전직 「${CC[s.cls].n}」을(를) 고르면 배울 수 있습니다`,'#ffb070',12);
  put(`스킬 레벨 ${rk} / ${s.max}${lv>rk?`  (장비 +${lv-rk})`:''}${e?`   강화 +${e}${e>=15?' [각성 III]':e>=10?' [각성 II]':e>=5?' [각성 I]':''}`:''}`,'#fff',13);
  const pre=s.ti?(s.cls?CC[s.cls].skills[0].n:HSK[hid].find(o=>o.tr===s.tr&&o.ti===s.ti-1).n):null;
  put(`습득 레벨 ${s.lv}${pre?`  ·  선행: ${pre}`:''}`,ps.lvl>=s.lv?'#c8b890':'#ff6050',12);
  y+=4;put(s.f,'#e8dcc0',13);y+=4;
  if(lv)put('현재: '+skillEffect(s,ps,lv),'#70ff90',13);
  if(rk<s.max)put('다음: '+skillEffect(s,ps,(lv||0)+1+(lv?0:ps.st.allSkill+tb)),'#8ab8ff',13);
  if(ACTIVE_TY[s.ty]){const L=Math.max(1,lv);put(`내공 ${skCost(ps,s,L)}  ·  재사용 대기 ${fmt(skCd(ps,s,L)/60)}초`,'#9fc8ff',12)}
  if(s.syn.length){y+=4;put('시너지 (다른 스킬 1레벨당)','#ffd24a',12);for(const [id,p] of s.syn)put(`「${SKILLS[id].n}」 +${p}%  (현재 +${(r.sk[id]||0)*p}%)`,(r.sk[id]||0)?'#ffe8a8':'#7a6a5a',12,8)}
  if(s.tr<3){const tp=treePts(ps,s.tr);if(ACTIVE_TY[s.ty]&&s.ty!=='buff')put(`계열 숙련: 이 계열 투자 포인트당 스킬 피해 +1% (현재 +${tp}%)`,'#c8a870',11)}
  y+=4;{const I=typeof skeInfo==='function'?skeInfo(ps,e):(e<SKE_MAX?(()=>{const c=skEnhCost(e);return `스킬 강화 +${e}→+${e+1}  성공률 ${SKE_RATE[e]}%  (금화 ${c.gold} · 비급 조각 ${c.frag})`})():null);if(I)put(I,'#e8b8ff',12)}
  put(`+5 각성 I: ${ACTIVE_TY[s.ty]?AWK1[s.ty]:'효과 +40%'}  ·  +10 각성 II: ${ACTIVE_TY[s.ty]?'내공·재사용 -30%':'효과 +80%'}`,'#b890d0',11);
  put(r.cls2?'+15 각성 III: 스킬 피해 +30% (2차 전직 — 강화 한계 +15)':'각성 III(+11~+15)는 2차 전직 후 열립니다','#ffb0e0',11);
};

/* ---------------- 퀘스트 진행 (처치 · 증표) ---------------- */
function cqKill(p,a,t){
  const ps=p.ps;if(!cqOpen(ps)||ps.rpg.cls1)return;const q=cqOf(ps),hid=HEROES[ps.hero].id;if(q.trial)return;
  if(q.k<CQ_NEED&&CQ_KILL[hid].f(p,a)){q.k++;if(q.k%10===0||q.k===CQ_NEED)Wd.fx.push({type:'text',x:p.x,y:p.y,z:150,t:0,life:60,txt:`전직 수련 ${q.k}/${CQ_NEED}${q.k===CQ_NEED?' 완료!':''}`,col:'#ffb070',size:16})}
  if(q.tok<CQ_TOK){const ch=t.boss||t.mid?1:t.elite?.5:t.officer?.2:0;
    if(Math.random()<ch){q.tok++;Wd.fx.push({type:'text',x:t.x,y:t.y,z:170,t:0,life:90,txt:`★ ${HEROES[ps.hero].name}의 증표 (${q.tok}/${CQ_TOK})`,col:'#ffd860',size:20});sfx('treasure');
      for(let i=0;i<16;i++)emit({x:t.x,y:t.y,z:rnd(20,90),vz:rnd(1,4),vx:rnd(-3,3),col:i%2?'#ffd860':'#ffffff',size:rnd(2,4),life:30,type:'sq'})}}
}

/* ---------------- 특수 기술 (→↓→ + 공격) ---------------- */
function clsRead(p){const c=p.cmd,n=c.length;if(n<3)return 0;const a=c[n-3],b=c[n-2],d=c[n-1];
  if(Wd.t-d.t>16||d.t-a.t>26)return 0;if(b.d==='D'&&a.d===d.d&&(a.d==='L'||a.d==='R'))return a.d==='R'?1:-1;return 0}
const clsOf=p=>{const C=p.ps.rpg.cls1&&CLASS1[p.h.id];return C?C[p.ps.rpg.cls1]:null};
const _tryCmdCL=tryCommand;
tryCommand=function(p,i){
  const P=G&&G.np===2?PP[i]:pressed,C=clsOf(p);
  if(C&&P.atk&&!P.jump){const f=clsRead(p);if(f){P.atk=false;p.cmd.length=0;
    if((p.clsCd||0)>0){hudTxt(p,`${C.sp.n} 재사용 대기 ${Math.ceil(p.clsCd/60)}초`);sfx('noMp');return true}
    if(!spendMp(p,30))return true;
    p.facing=f;p.state='clsx';p.t=0;p.clsK=C.sp.key;p.clsCd=480;p.hitIds=new Set();p.inv=Math.max(p.inv,24);p.clsVis=new Set();
    kiai(vprof(p),'big');say(C.sp.n+'!',vprof(p));cmdName(p,C.sp.n);sfx('cutin');Wd.sflash={t:0,dur:18,name:C.sp.n,col:C.col,x:p.x,y:p.y,z:p.z};return true}}
  return _tryCmdCL(p,i);
};
function clsUpd(p){
  const w=Wd,t=p.t,f=p.facing,C=clsOf(p)||{col:'#ffffff'},col=C.col,K=KIT[p.h.id];
  switch(p.clsK){
    case'dragon':if(t===10){gv(gpAdd,{k:'dragon',x0:p.x-f*60,y0:p.y,z0:20,x1:p.x+f*80,y1:p.y,z1:300,col,amp:30,w:16,dur:34});vfx({k:'pillar',x:p.x,y:p.y,col,life:30,w:80,h:360});vfx({k:'shock',x:p.x,y:p.y,col,life:24,r:260});
        p.clsBuf={k:'dragon',t:600};sfx('dragon')}if(t>=28)clsEnd(p);break;
    case'yi':if(t===8){vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:60,r:150,spin:1});vfx({k:'pillar',x:p.x,y:p.y,f:p,col,life:40,w:110,h:340});p.clsBuf={k:'yi',t:480};sfx('magic')}if(t>=24)clsEnd(p);break;
    case'altar':if(t===10){const x=p.x+f*160;w.clsField={x,y:p.y,t:480,p,col};ghUnder(gpAdd,{sub:'octa',x,y:p.y,col,r:260,dur:480,spin:.6});vfx({k:'pillar',x,y:p.y,col,life:40,w:120,h:420});sfx('magic')}if(t>=26)clsEnd(p);break;
    case'ox':if(t===10){for(let i=0;i<3;i++)spawnAlly(p,{look:'mech',id:'cls_ox',dur:15},{aw:false,base:basePow(p),dm:1.6},i,3);vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:40,r:120,spin:-1});sfx('magic')}if(t>=24)clsEnd(p);break;
    case'counter':if(t===4){p.clsBuf={k:'counter',t:180};vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:30,r:90,spin:2})}if(t>=20)clsEnd(p);break;
    case'counterHit':{const a=p.clsTgt;if(t===1&&a&&!a.dead){const d=Math.sign(a.x-p.x)||f;p.facing=d;p.x=a.x-d*50;w.fx.push({type:'after',x:p.x-d*60,y:p.y,t:0,life:16,facing:d,look:p.look,pose:poseOf(p),tint:hexA(col,.6)});
        vfx({k:'thrust',f:p,x:p.x,y:p.y,z:58,dir:d,col,len:240,w:30,dur:14,life:16});gpV(gpAdd,{k:'kanji',x:a.x,y:a.y,z:160,txt:'일신시담',col,size:40,dur:40});w.flashT=Math.max(w.flashT,6);hitstop=Math.max(hitstop,6);
        gpHit(p,e=>Math.abs(e.x-a.x)<90&&Math.abs(e.y-a.y)<50,gpPow(p,3),true,{launch:true});sfx('slash')}if(t>=18)clsEnd(p);break}
    case'seven':{p.inv=Math.max(p.inv,6);
      for(let i=0;i<7;i++)if(t===4+i*7){const foes=w.enemies.filter(e=>!e.dead&&onScreen(e,0)&&!p.clsVis.has(e)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
        const e=foes[0]||w.enemies.find(e=>!e.dead&&onScreen(e,0));const tx=e?e.x:p.x+f*120,ty=e?e.y:p.y;if(e)p.clsVis.add(e);
        const d=Math.sign(tx-p.x)||f,x0=p.x;p.facing=d;p.x=tx-d*40;p.y=clamp(ty,GT+5,GB);
        w.fx.push({type:'after',x:x0,y:p.y,t:0,life:14,facing:d,look:p.look,pose:poseOf(p),tint:'rgba(180,225,255,.6)'});
        vfx({k:'thrust',x:x0,y:p.y,z:58,dir:d,col,len:Math.abs(p.x-x0)+80,w:24,dur:10,life:12});gpV(gpAdd,{k:'slash',x:tx,y:ty,z:60,col:'#ffffff',ang:rnd(-.6,.6),len:180,w:8,dur:10});
        gpHit(p,q=>Math.abs(q.x-tx)<70&&Math.abs(q.y-ty)<45,gpPow(p,1.5),i===6,{stun:30});sfx('slash');if(i===6){gpV(gpAdd,{k:'kanji',x:p.x,y:p.y,z:170,txt:'칠진칠출',col,size:44,dur:40});w.shake=Math.max(w.shake,14)}}
      if(t>=4+7*7+6)clsEnd(p);break}
    default:clsEnd(p);
  }
  const maxX=w.lock!==null?w.camX+W-25:Math.min(w.S.len-25,w.camX+W-25);p.x=clamp(p.x,w.camX+25,maxX);
}
function clsEnd(p){p.state='idle';p.t=0;p.clsK=null;p.z=0}
const _updPlayerCL=updPlayer;
updPlayer=function(p){
  _updPlayerCL(p);if(scene!=='play'||p.out||p.dead)return;
  if(p.clsCd>0)p.clsCd--;if(p.clsHitCd>0)p.clsHitCd--;
  const B=p.clsBuf;if(B&&B.t>0){B.t--;const C=clsOf(p),col=C?C.col:'#fff';
    if(B.k==='dragon'&&B.t%45===0)gv(gpAdd,{k:'dragon',x0:p.x-70,y0:p.y,z0:30,x1:p.x+70,y1:p.y,z1:150,col,amp:18,w:8,dur:30});
    if(B.k==='yi'){if(B.t%20===0)vfx({k:'shock',x:p.x,y:p.y,col,life:18,r:120});if(B.t%30===0)for(const q of Wd.ps)if(!q.dead&&!q.out&&Math.abs(q.x-p.x)<300)q.hp=Math.min(q.maxhp,q.hp+Math.ceil(q.maxhp*.01))}
    if(B.k==='counter'&&B.t%6===0)emit({x:p.x+rnd(-20,20),y:p.y,z:rnd(20,100),vz:rnd(.5,1.5),col:'#ffffff',size:rnd(2,3),life:16,type:'sq'});
    if(B.t<=0)p.clsBuf=null}
  if(p.state==='clsx')clsUpd(p);
};
const _poseOfCL=poseOf;
poseOf=function(e){
  if(e&&e.state==='clsx'){const k=e.clsK,o=k==='seven'?{st:'dashatk',t:8}:k==='counterHit'?{st:'dashatk',t:6}:k==='counter'?{st:'attack',combo:3,t:3}:k==='yi'?{st:'win',t:10}:{st:'skill',t:e.t};
    const st=e.state,t=e.t,cb=e.combo;try{e.state=o.st;e.t=o.t;if(o.combo)e.combo=o.combo;return _poseOfCL(e)}finally{e.state=st;e.t=t;e.combo=cb}}
  return _poseOfCL(e);
};
/* 피해: 반격 자세 · 의천 · 청룡 추가타 · 퀘스트 처치 */
const _damageCL=damage;
damage=function(a,t,dmg,knock,opt){
  if(t&&t.isPlayer&&!t.dead&&t.clsBuf&&t.clsBuf.t>0&&a&&!a.isPlayer&&!(opt&&opt.dot)){
    if(t.clsBuf.k==='counter'&&t.inv<=0){t.clsBuf=null;t.clsTgt=a.maxhp?a:null;t.state='clsx';t.clsK='counterHit';t.t=0;t.inv=30;return false}
    if(t.clsBuf.k==='yi')dmg=Math.round(dmg*.7)}
  const own=a&&t&&!t.isPlayer?ownerOf(a):null,was=t.dead,r=_damageCL(a,t,dmg,knock,opt);
  if(t.isPlayer&&r&&t.clsBuf&&t.clsBuf.k==='yi'&&t.clsBuf.t>0&&a&&a.maxhp&&!a.dead&&!a.isPlayer&&!(opt&&opt.dot))
    _damageCL({x:t.x,isPlayer:true,pl:t,noProc:true},a,Math.round(basePow(t)*1.2),true,{});
  if(own&&own.ps){
    if(!was&&t.dead)cqKill(own,a,t);
    const B=own.clsBuf;if(B&&B.k==='dragon'&&B.t>0&&a===own&&r&&!t.dead&&!(opt&&(opt.dot||opt.cls))&&!(own.clsHitCd>0)){own.clsHitCd=10;const K=KIT.guan,x=t.x,y=t.y;
      if(K)K.strike(gpAdd,gpEmit,x,y,0);ghLater(10,()=>{if(!t.dead)damage(own,t,Math.round(dmg*.6),false,{cls:1,stun:10})})}}
  return r;
};
/* 칠성단 장판 */
const _btCL=battleTick;
battleTick=function(){
  _btCL();const w=Wd;if(!w)return;const F=w.clsField;
  if(F){F.t--;if(F.t%30===0){const foes=w.enemies.filter(e=>!e.dead&&Math.abs(e.x-F.x)<260&&Math.abs(e.y-F.y)<80);
      if(foes.length){const e=foes[(Math.random()*foes.length)|0];_gpBoltGH(gpAdd,gpEmit,e.x,e.y,F.col,0,7);ghDelayHit(F.p,4,e.x,e.y,80,1.2,{stun:20})}}
    for(const q of w.ps){const inF=!q.dead&&Math.abs(q.x-F.x)<260&&Math.abs(q.y-F.y)<80;if(inF&&!q.clsSk){q.clsSk=1;q.bm.skillDmg=(q.bm.skillDmg||0)+30}else if(!inF&&q.clsSk){q.clsSk=0;q.bm.skillDmg=(q.bm.skillDmg||0)-30}}
    if(F.t<=0){for(const q of w.ps)if(q.clsSk){q.clsSk=0;q.bm.skillDmg=(q.bm.skillDmg||0)-30}w.clsField=null}}
  /* 시련: 제한 시간 · 목숨 하나 */
  const S=w.S;if(S&&S.trial&&!w.clear&&!w.failT){
    if(w.trialT!=null){w.trialT--;if(w.trialT<=0){showMsg(S.failTxt||'시련 실패','',false);w.failT=1;w.failMsg=S.failMsg}}
    if(S.noLives&&w.ps.some(p=>p.dead&&p.t>50)){w.failT=1;w.failMsg=S.failMsg}
    if(w.escort&&w.escort.dead){w.failT=Math.max(w.failT,1);w.failMsg=S.failMsg}}
};
const _dboCL=drawBattleOver;
drawBattleOver=function(cx){_dboCL(cx);const w=Wd;if(w&&w.trialT!=null&&!w.clear){const s=Math.max(0,Math.ceil(w.trialT/60));txt(`술이 식기까지 ${s}초`,W/2,132,18,s<20?'#ff7060':'#ffe8a8','center',FONT,['#000',4])}};

/* ---------------- 시련 스테이지 ---------------- */
const CLS_TRIAL={};
function clsAddTrial(hid,def){const i=STAGES.length;STAGES.push(def);STAGE_LV[i]=CLS_LV1;STAGE_EV[i]=def.ev;CLS_TRIAL[hid]=i;return i}
/* 시련 스테이지는 진행 순서 밖이라 보스 체력 · 공격 보정이 크게 깎이므로 보정값을 곱해 둔다 (제5장 수준) */
const TRH=(1+9*.28)/(1+4*.28),TRP=(1+9*.2)/(1+4*.2);
clsAddTrial('guan',{title:'시련  사수관',sub:'데운 술이 식기 전에',bg:'fortress',fac:'dong',len:2400,mus:1,trial:'guan',limit:150*60,
  story:['동탁의 맹장 화웅이 사수관 앞에서 제후군의 장수들을 차례로 베어 넘겼다.','"누가 나가 화웅을 베겠는가!" 원소의 외침에 아무도 나서지 못한다.',
    '말석에서 붉은 얼굴의 장수가 일어섰다 — "소장이 화웅의 목을 가져오겠소."','조조가 데운 술 한 잔을 따라 건넸다. "이 술이 식기 전에 돌아오시오."','— 시련: 150초 안에 화웅을 쓰러뜨려라 (술이 식으면 실패)'],
  waves:[[400,'s s sp'],[1100,'sp a o s']],
  boss:{name:'화웅',title:'동탁군 효기교위',hp:Math.round(520*TRH),pow:Math.round(13*TRP),spd:2.2,reach:90,skills:['dash','slam'],escort:'s s',score:9000,poise:90,
    look:Object.assign({},enemyLook('dong','o'),{scale:1.3}),line:'"제후의 장수란 놈들은 다 이 모양이냐! 다음은 누구냐!"'},
  failTxt:'술이 식었다… 시련 실패',failMsg:'시련 실패 — 술이 식기 전에 화웅을 베지 못했다. (다시 도전할 수 있다)',
  ev:[{t:60,pause:true,talk:[['조조','운장, 이 술이 식기 전에 돌아오시오.'],['@','금방 다녀오겠소.']]},
      {wave:2,talk:[['병사','관문 위에서 화살이 쏟아집니다! 멈추지 마십시오!']]},
      {boss:true,talk:[['화웅','네놈은 누구냐! 말단 마궁수 따위가!'],['@','관운장이다. 네 목을 가지러 왔다.']]},
      {bossHp:.4,talk:[['화웅','이, 이놈… 어찌 이리 빠르단 말이냐…!']]},
      {clear:true,talk:[['조조','…술이 아직 따뜻하구려! 천하에 이런 장수가 있었다니!']]}]});
clsAddTrial('zhao',{title:'시련  장판',sub:'단기구주',bg:'bridge',fac:'wei',len:3000,mus:2,trial:'zhao',noLives:true,
  story:['장판의 혼전 속, 조운은 홀로 말머리를 돌려 적진으로 뛰어들었다.','무너진 담장 아래에서 찾은 것은 주공의 어린 아들 아두.','갑옷 끈을 풀어 아이를 품에 안고, 조운은 다시 창을 들었다.',
    '"상산 조자룡이 여기 있다! 길을 막는 자는 모두 벤다!"','— 시련: 목숨 하나로 장판을 돌파하라 (쓰러지면 실패)'],
  waves:[[350,'s s sp sp'],[900,'sp sh a s'],[1500,'o sp sp a'],[2100,'sh sh sp o']],
  boss:Object.assign({},MIDBOSS,{hp:Math.round(MIDBOSS.hp*1.9*TRH),pow:Math.round(MIDBOSS.pow*TRP),escort:'sp sp',score:9000}),
  failMsg:'시련 실패 — 장판에서 쓰러졌다. (다시 도전할 수 있다)',
  ev:[{t:60,pause:true,talk:[['@','아두 공자를 품에 안았다. 이제 주공께 돌아간다!'],[TIP,'시련: 목숨 하나로 장판을 돌파하라 (쓰러지면 실패)']]},
      {wave:2,talk:[['병사','조자룡이다! 저 창을 막아라!']]},{wave:4,talk:[['@','조금만 더… 장판교가 보인다!']]},
      {boss:true,talk:[['하후은','청강검의 주인이 여기 있다! 그 아이를 내놓아라!'],['@','그 검, 내가 거두겠다.']]},
      {clear:true,talk:[['@','칠진칠출… 주공, 아두 공자를 모셔 왔습니다.']]}]});
clsAddTrial('zhuge',{title:'시련  칠성단',sub:'동남풍을 빌리다',bg:'redcliff',fac:'wei',len:2600,mus:3,trial:'zhuge',lamp:true,
  story:['적벽 대전을 앞두고, 바람은 여전히 서북에서 불어왔다.','"사흘 밤낮 칠성단에서 바람을 빌리겠소." 공명은 남병산에 단을 쌓았다.','그러나 공명을 경계한 조조군이 칠성단을 노리고 강을 건너왔다.',
    '등불이 꺼지면 바람도 오지 않는다.','— 시련: 칠성단의 등불을 지켜라 (등불이 꺼지면 실패)'],
  waves:[[300,'s s a'],[800,'sp a a s'],[1400,'sh o a sp'],[1900,'s s a fl']],
  boss:{name:'채모',title:'조조군 수군도독',hp:Math.round(520*TRH),pow:Math.round(12*TRP),spd:2,reach:84,skills:['wave','dash'],escort:'a a',score:9000,poise:80,
    look:Object.assign({},enemyLook('wei','o'),{scale:1.25}),line:'"제갈량이 바람을 부른다고? 칠성단부터 불태워라!"'},
  failMsg:'시련 실패 — 칠성단의 등불이 꺼졌다. (다시 도전할 수 있다)',
  ev:[{t:60,pause:true,talk:[['@','칠성단에 등을 밝혔소. 바람이 불 때까지 등불을 지켜 주시오.'],[TIP,'시련: 칠성단의 등불을 지켜라 (등불이 꺼지면 실패)']]},
      {wave:3,talk:[['전령','채모의 수군이 칠성단으로 몰려옵니다!']]},
      {boss:true,talk:[['채모','바람 따위 불게 두지 않겠다!'],['@','하늘의 바람은 이미 움직였소.']]},
      {clear:true,talk:[['@','동남풍이 분다… 이제 천하가 셋으로 나뉠 것이오.']]}]});
const _stageEvInitCL=stageEvInit;
stageEvInit=function(i){
  _stageEvInitCL(i);const S=STAGES[i];if(!S||!S.trial)return;const w=Wd;
  const tl=Math.max(CLS_LV1,...G.pl.map(s=>s.lvl));w.lv=Math.min(MAXLV,tl);
  if(S.limit)w.trialT=S.limit;
  if(S.noLives)for(const s of G.pl)s.lives=0;
  if(S.lamp){w.escort=mkNpc('칠성등',140,(GT+GB)/2,Math.round(420*(1+.05*w.lv)));w.escort.lamp=true}
};
/* 시련 통과 → 갈래 선택 */
const _finishStageCL=finishStage;
finishStage=function(){
  const S=Wd&&Wd.S;if(!S||!S.trial)return _finishStageCL();
  for(const p of Wd.ps){p.ps.mp=p.mp}
  const ps=G.pl.find(s=>HEROES[s.hero].id===S.trial);
  if(!ps){toCamp('시련을 통과했다.');return}
  cqOf(ps).trial=true;clsChoose(ps);
};
function clsChoose(ps){
  const hid=HEROES[ps.hero].id,CC=CLASS1[hid],h=HEROES[ps.hero];
  openChoice({title:`1차 전직 — ${h.name}`,who:h.name,lines:['시련을 통과했다. 나아갈 길을 하나 고르라.','(고른 길은 군영 「전직」에서 금화로 바꿀 수 있다)'],
    opts:['A','B'].map(k=>{const C=CC[k];return{k,n:`${C.n} — ${C.desc[0]}`,d:[C.desc[1],`특수 기술 「${C.sp.n}」(→↓→+공격): ${C.sp.f}`.slice(0,58),`전직 스킬: ${C.skills.map(s=>s.n).join(' · ')}`]}})},
    o=>{ps.rpg.cls1=o.k;ps.rpg.skillPts+=2;recalc(ps);const C=CC[o.k];
      toCamp(`1차 전직 「${C.n}」! 특수 기술 「${C.sp.n}」(→↓→+공격) · 전직 스킬 열림 · 스킬 포인트 +2`)});
}

/* ---------------- 군영 「전직」 ---------------- */
const CQ={on:false,pl:0,conf:null};
const _campOptsCL=campOpts;
campOpts=function(){const o=_campOptsCL(),i=o.findIndex(x=>x.k==='sel');
  const ready=G.pl.some(s=>cqOpen(s)&&!s.rpg.cls1&&cqStep(s)>=2);o.splice(i+1,0,{k:'cls',n:`전직 (1차 전직 퀘스트)${ready?'  ★':''}`});return o};
const _updCampCL=updCamp;
updCamp=function(){
  if(CQ.on){cqUpd();return}
  if(!campSub){const O=campOpts();if(O[campIdx]&&O[campIdx].k==='cls'&&(pressed.atk||pressed.start)){pressed.atk=pressed.start=false;Object.assign(CQ,{on:true,pl:campPl||0,conf:null});sfx('ok');return}}
  _updCampCL();
};
function cqUpd(){
  if(hit('jump')||hit('pause')){CQ.on=false;sfx('sel');return}
  if(G.np===2&&(hit('left')||hit('right'))){CQ.pl^=1;CQ.conf=null;sfx('sel')}
  const ps=G.pl[CQ.pl],hid=HEROES[ps.hero].id,r=ps.rpg;
  if(hit('atk')||hit('start')){
    if(!cqHas(ps)){campMsg={t:0,txt:'이 무장의 전직은 다음 단계에서 추가됩니다'};return}
    if(!cqOpen(ps)){campMsg={t:0,txt:`조건 미달 — Lv.${CLS_LV1} 이상 · 제6장 적벽 클리어 필요`};sfx('noMp');return}
    const st=cqStep(ps);
    if(st===1){campMsg={t:0,txt:'수련과 증표를 먼저 마치세요 (전장에서 진행)'};return}
    if(st===2){CQ.on=false;sfx('ok');startStage(CLS_TRIAL[hid]);return}
    if(st===3){CQ.on=false;clsChoose(ps);return}
    if(st===4){if(CQ.conf!=='chg'){CQ.conf='chg';campMsg={t:0,txt:`갈래 변경: 금화 ${CLS_GOLD} — 한 번 더 누르면 변경 (전직 스킬 포인트 반환)`};return}
      CQ.conf=null;if(r.gold<CLS_GOLD){campMsg={t:0,txt:'금화가 부족합니다'};sfx('noMp');return}
      r.gold-=CLS_GOLD;for(const s of HSK[hid])if(s.cls&&r.sk[s.id]){r.skillPts+=r.sk[s.id];delete r.sk[s.id];const k=r.hot.indexOf(s.id);if(k>=0)r.hot[k]=null}
      r.cls1=r.cls1==='A'?'B':'A';recalc(ps);campMsg={t:0,txt:`갈래 변경 — 「${CLASS1[hid][r.cls1].n}」`};sfx('lvl')}}
}
const _drawCampCL=drawCamp;
drawCamp=function(){
  _drawCampCL();if(!CQ.on)return;
  const ps=G.pl[CQ.pl],h=HEROES[ps.hero],hid=h.id,CC=CLASS1[hid],r=ps.rpg,x0=90,y0=70,w0=780,h0=420;
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,W,H);panel(x0,y0,w0,h0,'#ffb070');
  txt(`1차 전직 — ${h.name}${G.np===2?`  (${CQ.pl+1}P · ←→ 전환)`:''}`,x0+w0/2,y0+24,22,'#ffd24a','center',FONT,['#300',5]);
  if(!CC){txt('이 무장의 전직은 다음 단계에서 추가됩니다. (현재: 관우 · 조운 · 제갈량)',x0+w0/2,y0+200,16,'#c8b890');txt(`${KN[0].jump} 닫기`,x0+w0/2,y0+h0-14,12,'#aaa');return}
  const ok1=ps.lvl>=CLS_LV1,ok2=cqRedCliff(),q=cqOf(ps),st=cqStep(ps);let y=y0+62;
  const row=(t,done,c)=>{const L=wrap((done?'✔ ':'· ')+t,w0/2-50,13);L.forEach((ln,i)=>txt(ln,x0+30+(i?14:0),y+i*17,13,done?'#70ff90':c||'#e8dcc0','left'));y+=17*L.length+7};
  txt('조건',x0+24,y-2,13,'#ffb070','left');y+=20;
  row(`캐릭터 Lv.${CLS_LV1} 이상 (현재 Lv.${ps.lvl})`,ok1);row('제6장 적벽 클리어',ok2);y+=6;
  txt('퀘스트',x0+24,y-2,13,'#ffb070','left');y+=20;
  row(`① 수련 — ${CQ_KILL[hid].n} ${Math.min(q.k,CQ_NEED)}/${CQ_NEED}`,q.k>=CQ_NEED||!!r.cls1);
  row(`② 「${h.name}의 증표」 ${Math.min(q.tok,CQ_TOK)}/${CQ_TOK} — 장교 · 정예 · 보스가 떨어뜨림`,q.tok>=CQ_TOK||!!r.cls1);
  const T=STAGES[CLS_TRIAL[hid]];row(`③ 시련 전투 — 「${T.title.replace(/\s+/g,' ')} · ${T.sub}」`,q.trial||!!r.cls1,st===2?'#ffe060':null);
  row('④ 갈래 선택 — 두 길 중 하나',!!r.cls1,st===3?'#ffe060':null);
  /* 두 갈래 */
  ['A','B'].forEach((k,j)=>{const C=CC[k],bx=x0+w0/2-6+j*0,by=y0+62+j*170,bw=w0/2-22,on=r.cls1===k;
    ctx.fillStyle=on?'rgba(60,40,10,.9)':'rgba(20,12,6,.75)';ctx.fillRect(bx,by,bw,160);ctx.strokeStyle=on?'#ffd24a':C.col;ctx.lineWidth=on?3:1.5;ctx.strokeRect(bx+.5,by+.5,bw-1,159);
    let yy=by+18;const put=(t,c,sz)=>{for(const ln of wrap(t,bw-24,sz)){if(yy>by+152)return;txt(ln,bx+12,yy,sz,c,'left');yy+=sz+4}};
    put(`${on?'◆ ':''}갈래 ${k} — ${C.n}`,C.col,16);put(C.desc[0],'#e8dcc0',12);put(C.desc[1],'#a8ffb8',12);
    put(`특수 기술 「${C.sp.n}」 →↓→+공격: ${C.sp.f}`,'#ffe8a8',12);put(`전직 스킬: ${C.skills.map(s=>`${s.n}(Lv.${s.lv})`).join(' · ')}`,'#9fc8ff',12)});
  const act={1:'전장에서 수련 · 증표를 모으세요',2:`${KN[0].atk} 시련 전투 출전`,3:`${KN[0].atk} 갈래 선택`,4:`${KN[0].atk} 갈래 변경 (금화 ${CLS_GOLD})`}[st];
  txt(ok1&&ok2?act:'조건을 만족하면 퀘스트가 시작됩니다',x0+w0/2,y0+h0-36,15,st===2||st===3?'#ffe060':'#c8b890');
  txt(`${KN[0].jump} 닫기`,x0+w0/2,y0+h0-14,12,'#aaa');
};

/* ---------------- 상태창: 전직 진행 · 특수 기술 ---------------- */
const _drawPanelCL=drawPanel;
drawPanel=function(p,x0){
  _drawPanelCL(p,x0);const ps=p.ps;if(!ps||p.out)return;const y=ps.recoAlert?164:140;
  let t=null,col='#ffd8a0';
  const C=clsOf(p);
  if(C)t=`${C.ko} · 특수 기술 「${C.sp.n}」 →↓→+공격 ${p.clsCd>0?`(${Math.ceil(p.clsCd/60)}초)`:'준비'}`,col=p.clsCd>0?'#a89878':C.col;
  else if(cqOpen(ps)){const q=cqOf(ps),st=cqStep(ps);t=st===1?`전직 수련 ${Math.min(q.k,CQ_NEED)}/${CQ_NEED} · 증표 ${q.tok}/${CQ_TOK}`:st===2?'전직 시련 준비 완료 — 군영 「전직」':'전직 갈래 선택 — 군영 「전직」'}
  if(!t)return;ctx.font=`bold 12px ${FONT}`;const w=ctx.measureText(t).width+18;
  ctx.fillStyle='rgba(30,16,4,.85)';ctx.fillRect(x0,y,w,20);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(x0+.5,y+.5,w-1,19);txt(t,x0+9,y+10,12,col,'left');
};
