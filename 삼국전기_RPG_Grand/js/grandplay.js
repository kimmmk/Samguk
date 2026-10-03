'use strict';
/* ===== 그랑풍 에디션 플레이 보강 =====
   1. 화면 밖으로 밀려나 돌아오지 않는 적 · 보스 복귀 (좌표 NaN 복구 · 가장자리 끌어오기 · 멈춘 상태 해제)
   2. 히든 코드 Ctrl+Alt+Shift+; — 스킬 포인트 · 능력치 포인트 +10
   3. 커맨드 기술 3종 (↓↓ · ←→ · ↑↓ + 공격) + 연계 기술 4종 + 2인 합격기
   4. 화려한 이펙트: 낙뢰 · 일섬 · 지면 균열 · 한자 낙관 · 집중선 (필살기 · 스킬 · 강타에 추가)
   5. 스킬 미리보기 (캐릭터 창 스킬 탭에서 회피 키: Shift / O) */

/* ================= 1. 화면 밖 적 복귀 ================= */
const GP_FREE={idle:1,walk:1};
const _updEnemyGP=updEnemy;
updEnemy=function(e){_updEnemyGP(e);gpGuard(e)};
function gpGuard(e){
  const w=Wd;if(!w||e.dead||e.remove)return;
  if(!Number.isFinite(e.x))e.x=w.camX+(e.boss?W*.75:rnd(80,W-80));          // 좌표가 깨지면(NaN) 화면 안으로
  if(!Number.isFinite(e.y))e.y=(GT+GB)/2;
  if(!Number.isFinite(e.z)||!Number.isFinite(e.vz)){e.z=0;e.vz=0}
  if(!Number.isFinite(e.vx))e.vx=0;
  e.y=clamp(e.y,GT+5,GB);
  /* 한 상태에 너무 오래 머무르면(풀리지 않는 경직 · 스킬) 해제 */
  if(e.state===e.gpSt)e.gpStT=(e.gpStT||0)+1;else{e.gpSt=e.state;e.gpStT=0}
  if(!GP_FREE[e.state]&&e.state!=='flee'&&e.gpStT>(e.boss?900:600)){e.state='idle';e.t=0;e.z=0;e.vz=0;e.vx=0;e.gpStT=0}
  if(e.state==='flee')return;                                                 // 도주병은 화면 밖에서 사라지는 것이 정상
  const sx=e.x-w.camX,out=sx<-40||sx>W+40;
  e.gpOff=out?(e.gpOff||0)+1:0;
  const far=220;if(sx<-far)e.x=w.camX-far;else if(sx>W+far)e.x=w.camX+W+far;   // 너무 멀리 날아가지 않게
  if(!out)return;
  /* 0.75초 넘게 화면 밖이면 걸어서 돌아오게, 3.3초가 넘으면 가장자리로 데려온다 */
  if(e.gpOff>45&&(GP_FREE[e.state]||e.state==='attack'||e.state==='shoot')){const d=sx<0?1:-1;e.x+=d*Math.max(2,e.spd||2)*1.4;e.facing=d;if(GP_FREE[e.state])e.state='walk'}
  if(e.gpOff>200){e.x=w.camX+(sx<0?36:W-36);e.z=0;e.vz=0;e.vx=0;if(e.state!=='down')e.state='idle';e.t=0;e.gpOff=0;
    w.fx.push({type:'smoke',x:e.x,y:e.y,t:0,life:30})}
}

/* ================= 2. 히든 코드: Ctrl+Alt+Shift+; ================= */
const _cheatGP=cheatCode;
cheatCode=function(code){
  if(code!=='Semicolon')return _cheatGP(code);
  if(!G||!G.pl){CHEAT={t:0,txt:'게임을 시작하거나 불러온 뒤 사용할 수 있습니다',col:'#ff9080'};return}
  for(const s of G.pl){s.rpg.skillPts+=10;s.rpg.statPts+=10}
  CHEAT={t:0,txt:`[히든 코드] 스킬 포인트 +10 · 능력치 포인트 +10${G.np===2?' (1P · 2P 모두)':''}`,col:'#ffe060'};sfx('lvl');
};

/* ================= 4. 이펙트 (커맨드 · 미리보기에서 함께 쓰므로 먼저) ================= */
/* 새 이펙트 종류: bolt(낙뢰) · slash(일섬) · crack(지면 균열) · kanji(한자 낙관). 모두 delay(지연) · dur(길이)를 가진다 */
const GP_HZ={fire:'炎',ice:'氷',bolt:'雷',phys:'武'};
function gpBolt(v,cx){
  const t=v.t-(v.delay||0);if(t<0||t>=v.dur)return;const a=1-t/v.dur,x=v.x-cx,y=v.y-(v.z||0);
  if(!v.pts||t%2===0){v.pts=[];let px=x+rnd(-26,26);for(let yy=-30;yy<y-10;yy+=22){v.pts.push([px,yy]);px+=rnd(-16,16)}v.pts.push([x,y]);
    v.br=[];for(let i=0;i<3;i++){const j=2+((Math.random()*(v.pts.length-3))|0),q=v.pts[j];if(q)v.br.push([q,[q[0]+rnd(-50,50),q[1]+rnd(20,50)]])}}
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';ctx.lineCap='round';
  for(const [lw,c,al] of[[v.w*2.2,v.col,.22],[v.w,v.col,.75],[v.w*.35,'#ffffff',1]]){ctx.strokeStyle=vxA(c,al*a);ctx.lineWidth=lw;ctx.beginPath();for(const q of v.pts)ctx.lineTo(q[0],q[1]);ctx.stroke();
    for(const b of v.br){ctx.lineWidth=lw*.45;ctx.beginPath();ctx.moveTo(b[0][0],b[0][1]);ctx.lineTo(b[1][0],b[1][1]);ctx.stroke()}}
  ctx.globalAlpha=a;ctx.drawImage(glowSpr(v.col),x-v.w*9,y-v.w*5,v.w*18,v.w*10);ctx.globalAlpha=1;
  ctx.restore();
}
function gpSlash(v,cx){
  const t=v.t-(v.delay||0);if(t<0||t>=v.dur)return;const k=t/v.dur,x=v.x-cx,y=v.y-(v.z||0),L=v.len*Math.min(1,k*4+.2),w=v.w*(k<.3?1:1-(k-.3)/.7),a=k<.6?1:1-(k-.6)/.4;
  ctx.save();ctx.translate(x,y);ctx.rotate(v.ang);ctx.globalCompositeOperation='lighter';
  for(const [m,c,al] of[[2.6,v.col,.3],[1.3,v.col,.8],[.45,'#ffffff',1]]){ctx.fillStyle=vxA(c,al*a);ctx.beginPath();ctx.moveTo(-L/2,0);ctx.quadraticCurveTo(0,-w*m,L/2,0);ctx.quadraticCurveTo(0,w*m,-L/2,0);ctx.fill()}
  ctx.restore();
}
function gpCrackMk(v){v.lines=[];const n=v.n||8;for(let i=0;i<n;i++){let an=i/n*6.283+rnd(-.25,.25),r=0,x=0,y=0;const pts=[[0,0]],R=v.r*rnd(.6,1);
  while(r<R){const st=rnd(14,26);an+=rnd(-.45,.45);x+=Math.cos(an)*st;y+=Math.sin(an)*st;r=Math.hypot(x,y);pts.push([x,y])}v.lines.push(pts)}}
function gpCrack(v,cx){
  const t=v.t-(v.delay||0);if(t<0||t>=v.dur)return;if(!v.lines)gpCrackMk(v);
  const g=Math.min(1,t/7),a=Math.min(1,(v.dur-t)/20),glow=Math.max(0,1-t/(v.dur*.6));
  ctx.save();ctx.translate(v.x-cx,v.y);ctx.scale(1,.34);ctx.lineCap='round';ctx.lineJoin='round';
  const path=()=>{ctx.beginPath();for(const L of v.lines){const n=Math.max(2,Math.ceil(L.length*g));ctx.moveTo(L[0][0],L[0][1]);for(let i=1;i<n;i++)ctx.lineTo(L[i][0],L[i][1])}};
  ctx.strokeStyle=`rgba(20,10,4,${.7*a})`;ctx.lineWidth=7;path();ctx.stroke();
  ctx.globalCompositeOperation='lighter';ctx.strokeStyle=vxA(v.col,.9*glow);ctx.lineWidth=3.5;path();ctx.stroke();ctx.strokeStyle=vxA('#ffffff',.8*glow);ctx.lineWidth=1.2;path();ctx.stroke();
  ctx.globalAlpha=.6*glow;ctx.drawImage(glowSpr(v.col),-v.r*.7,-v.r*.7,v.r*1.4,v.r*1.4);ctx.globalAlpha=1;
  ctx.restore();
}
function gpKanji(v,cx){
  const t=v.t-(v.delay||0);if(t<0||t>=v.dur)return;const k=t/v.dur,s=k<.12?2.4-k/.12*1.4:1+k*.08,a=k<.75?1:1-(k-.75)/.25;
  ctx.save();ctx.translate(v.x-cx,v.y-(v.z||0));ctx.scale(s,s);ctx.globalAlpha=a;
  ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr(v.col),-v.size*1.6*v.txt.length/2-20,-v.size*1.1,v.size*1.6*v.txt.length+40,v.size*2.2);ctx.globalCompositeOperation='source-over';
  txt(v.txt,0,0,v.size,'#fffaf0','center',HANJA,[shade(v.col,-110),Math.max(5,v.size/7)]);
  if(k<.12){ctx.globalCompositeOperation='lighter';txt(v.txt,0,0,v.size,vxA('#ffffff',.8*(1-k/.12)),'center',HANJA);ctx.globalCompositeOperation='source-over'}
  ctx.restore();
}
function gpDrawV(v,cx){if(v.k==='bolt')gpBolt(v,cx);else if(v.k==='slash')gpSlash(v,cx);else if(v.k==='kanji')gpKanji(v,cx)}
/* 효과 묶음: add(=vfx 추가) · em(=입자) 를 받아 게임 · 미리보기 양쪽에서 쓴다 */
const gpV=(add,o)=>{const d=o.delay||0,dur=o.dur||o.life||20;o.dur=dur;o.life=d+dur;return add(o)};
const GPFX={
  bolt(add,em,x,y,col,d,w){gpV(add,{k:'bolt',x,y,col,delay:d||0,dur:16,w:w||7});gpV(add,{k:'flash',x,y,z:10,col,delay:d||0,dur:16,life:16,r:80,rot:Math.random()*6});
    gpV(add,{k:'shock',x,y,col,delay:d||0,dur:20,life:20,r:130});if(em)for(let i=0;i<8;i++)em({x,y,z:4,vx:rnd(-5,5),vz:rnd(2,7),g:.3,col:i%2?'#ffffff':col,size:rnd(2,4),life:rnd(14,24),type:'sq'},d)},
  slashX(add,x,y,z,col,len,d){gpV(add,{k:'slash',x,y,z,col,ang:-.6,len,w:9,delay:d||0,dur:14});gpV(add,{k:'slash',x,y,z,col,ang:.6,len,w:9,delay:(d||0)+3,dur:14})},
  quake(add,em,x,y,col,big){gpV(add,{k:'crack',x,y,col,r:big?260:170,n:big?12:8,dur:big?90:60});
    for(let i=0;i<(big?4:2);i++)gpV(add,{k:'shock',x,y,col,delay:i*5,dur:22,r:(big?300:200)+i*70});
    gpV(add,{k:'flash',x,y,z:20,col,dur:20,life:20,r:big?130:100,rot:0});gpV(add,{k:'pillar',x,y,col,dur:24,w:big?90:60,h:big?420:260});
    if(em)for(let i=0;i<(big?26:16);i++){const a=rnd(0,6.283);em({x:x+Math.cos(a)*rnd(10,60),y:y+Math.sin(a)*14,z:4,vx:Math.cos(a)*rnd(2,6),vz:rnd(5,12),g:.5,col:i%3?'#8a6a48':col,size:rnd(4,9),life:rnd(22,36),type:'sq',add:i%3===0})}},
  burstRing(em,x,y,z,col,n,sp){if(em)for(let i=0;i<n;i++){const a=i/n*6.283;em({x,y,z,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp*.7+1,col:i%2?col:'#ffffff',size:rnd(2,5),life:rnd(16,28),type:'sq'})}},
};
const gpAdd=o=>vfx(o);
const gpEmit=(o,d)=>{if(d){const T=Wd.t+d,w=Wd;(w.gpLater=w.gpLater||[]).push({t:T,o});return}emit(o)};

/* 그리기 연결 */
const _dbuGP=drawBattleUnder;
drawBattleUnder=function(cx){_dbuGP(cx);gpSpeedLines(cx);for(const v of VX())if(v.k==='crack')gpCrack(v,cx)};
const _dboGP=drawBattleOver;
drawBattleOver=function(cx){_dboGP(cx);for(const v of VX())gpDrawV(v,cx);gpComboHints(cx);gpJointDraw()};
/* 필살기 중 집중선 */
function gpSpeedLines(cx){
  const w=Wd;if(!(w.spDim>0))return;const ps=w.ps.filter(p=>!p.out&&!p.dead&&p.state==='special');if(!ps.length)return;
  const p=ps[0],M=p.mysp&&MYTH_SP[p.mysp],col=M?M.col:p.h.fx,x=p.x-cx,y=p.y-70;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<36;i++){const a=rnd(0,6.283),r1=rnd(170,260),r2=r1+rnd(260,520),wd=rnd(1,4);
    ctx.strokeStyle=vxA(i%3?'#ffffff':col,rnd(.06,.2)*w.spDim);ctx.lineWidth=wd;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1*.7);ctx.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2*.7);ctx.stroke()}
  ctx.restore();
}
/* 지연 입자 · 합격기 진행 */
const _btGP=battleTick;
battleTick=function(){
  _btGP();const w=Wd;if(!w)return;
  if(w.gpLater&&w.gpLater.length){const now=w.t;w.gpLater=w.gpLater.filter(q=>{if(now>=q.t){emit(q.o);return false}return true})}
  gpJointTick();
};

/* --- 필살기: 시작 연출 · 진행 중 낙뢰 · 피날레 강화 --- */
function gpSpCol(p){const M=p.mysp&&MYTH_SP[p.mysp];return M?M.col:p.h.fx}
function gpSpTick(p){
  const w=Wd,col=gpSpCol(p),f=p.facing;
  if(p.t===1){const hz=((p.mysp&&MYTH_SP[p.mysp]&&MYTH_SP[p.mysp].hz)||HERO_SP_HZ[p.h.id]||'必殺').slice(0,2);
    GPFX.quake(gpAdd,gpEmit,p.x,p.y,col,true);gpV(gpAdd,{k:'kanji',x:p.x,y:p.y,z:190,txt:hz,col,size:72,dur:70});
    for(let i=0;i<5;i++)GPFX.bolt(gpAdd,gpEmit,p.x+f*(90+i*80)+rnd(-20,20),clamp(p.y+rnd(-40,40),GT+5,GB),col,i*4,6);
    w.flashT=Math.max(w.flashT,8);w.flashCol=hexRGB(col).join(',');sfx('bolt')}
  if(p.t>8&&p.t%18===0){const foes=w.enemies.filter(e=>!e.dead&&onScreen(e,10));const e=foes.length?foes[(Math.random()*foes.length)|0]:null;
    const x=e?e.x:p.x+f*rnd(80,360),y=e?e.y:clamp(p.y+rnd(-50,50),GT+5,GB);GPFX.bolt(gpAdd,gpEmit,x,y,col,0,5);if(p.t%36===0)GPFX.slashX(gpAdd,x,y,70,col,170)}
  if(p.t%3===0)gpEmit({x:p.x+rnd(-200,200),y:clamp(p.y+rnd(-60,60),GT,GB),z:rnd(0,30),vz:rnd(2,5),vx:rnd(-1,1),col:Math.random()<.5?col:'#fff2c0',size:rnd(2,4),life:rnd(30,50),type:'sq'});
}
const _updSpGP=updSpecial;
updSpecial=function(p){_updSpGP(p);if(p.spFin==null)gpSpTick(p)};
const _updMythGP=updMythSp;
updMythSp=function(p){_updMythGP(p);if(p.spFin==null)gpSpTick(p)};
const _spFinGP=spFinale;
spFinale=function(p){
  const t=p.spFin,w=Wd,col=gpSpCol(p),f=p.facing;_spFinGP(p);
  if(t===0)gpV(gpAdd,{k:'crack',x:p.x+f*160,y:p.y,col,r:300,n:14,dur:100});
  if(t>=6&&t<=46&&t%8===6){const foes=w.enemies.filter(e=>!e.dead&&onScreen(e,20)),e=foes.length?foes[(t/8|0)%foes.length]:null;
    const x=e?e.x:p.x+f*rnd(100,380),y=e?e.y:clamp(p.y+rnd(-50,50),GT+5,GB);GPFX.bolt(gpAdd,gpEmit,x,y,col,0,8);GPFX.slashX(gpAdd,x,y,60,col,220)}
  if(t===56){const cx=p.x+f*200;
    for(let i=0;i<8;i++)gpV(gpAdd,{k:'slash',x:cx+rnd(-160,160),y:p.y+rnd(-40,40),z:rnd(40,120),col:i%2?col:'#ffffff',ang:i/8*Math.PI+rnd(-.2,.2),len:rnd(420,620),w:12,delay:i*2,dur:18});
    GPFX.quake(gpAdd,gpEmit,cx,p.y,col,true);GPFX.burstRing(gpEmit,cx,p.y,80,col,40,9);hitstop=Math.max(hitstop,6)}
};
/* --- 스킬 시전: 종류별 추가 연출 --- */
const _tryCastGP=tryCastSkill;
tryCastSkill=function(p,slot){
  const was=p.state;_tryCastGP(p,slot);
  if(!(p.state==='pskill'&&was!=='pskill'))return;
  const s=p.sk&&p.sk.s;if(!s)return;gpSkillFx(gpAdd,gpEmit,p,s,skCol(s,p.ps));
};
function gpSkillFx(add,em,p,s,col){
  const f=p.facing,x=p.x+f*120;
  if(s.ti>=2)gpV(add,{k:'kanji',x:p.x,y:p.y,z:170,txt:GP_HZ[s.el]||'武',col,size:48+s.ti*6,dur:44,delay:2});
  switch(s.ty){
    case'quake':case'leap':case'nova':GPFX.quake(add,em,s.ty==='nova'?p.x:x,p.y,col,s.ti>=3);break;
    case'chain':case'rain':for(let i=0;i<(s.ty==='rain'?6:4);i++)GPFX.bolt(add,em,p.x+f*(90+i*70),clamp(p.y+rnd(-40,40),GT+5,GB),col,8+i*5,s.el==='bolt'?8:5);break;
    case'dash':case'proj':for(let i=0;i<3;i++)gpV(add,{k:'slash',x:p.x+f*(100+i*90),y:p.y,z:60,col,ang:rnd(-.25,.25),len:220,w:10,delay:6+i*3,dur:14});break;
    case'whirl':for(let i=0;i<4;i++)gpV(add,{k:'slash',x:p.x,y:p.y,z:55,col,ang:i*Math.PI/4,len:300,w:9,delay:4+i*8,dur:14});break;
    case'summon':case'buff':GPFX.burstRing(em,p.x,p.y,60,col,30,6);gpV(add,{k:'crack',x:p.x,y:p.y,col,r:140,n:8,dur:60});break;
  }
}
/* --- 강타 · 띄우기: 맞은 자리에 일섬 --- */
const _damageGP=damage;
damage=function(a,t,dmg,knock,opt){
  const hp0=t.hp,r=_damageGP(a,t,dmg,knock,opt);
  if(r&&knock&&!(opt&&opt.dot)&&!t.isPlayer&&t.hp<hp0&&VX().length<130){const own=ownerOf(a);
    if(own&&own.ps){const col=pcol(own);gpV(gpAdd,{k:'slash',x:t.x,y:t.y,z:(t.z||0)+60,col,ang:rnd(-.9,.9),len:rnd(130,190),w:8,dur:10})}}
  return r;
};

/* ================= 3. 커맨드 기술 · 연계 기술 · 합격기 ================= */
const GCMD={
  quake:  {n:'지열파',hz:'地裂',seq:'↓ ↓ + 공격',cost:15,inv:20,dur:40,cancel:32,f:'무기로 땅을 내리찍어 앞쪽에 균열 충격파 두 번 — 가까운 적은 공중으로 띄운다'},
  gale:   {n:'질풍돌격',hz:'疾風',seq:'← → + 공격 (뒤 → 앞)',cost:15,inv:30,dur:36,cancel:28,f:'번개처럼 앞으로 돌진하며 꿰뚫고, 지나간 자리를 십자 일섬으로 다시 벤다'},
  thunder:{n:'낙뢰강타',hz:'落雷',seq:'↑ ↓ + 공격',cost:20,inv:40,dur:46,cancel:38,f:'높이 뛰어올라 내리꽂으며 앞쪽 세 곳에 낙뢰를 떨어뜨린다'},
};
const GCOMBO=[
  {id:'musou', n:'삼국무쌍',hz:'三國無雙',seq:['quake','gale','thunder'],win:120,col:'#ffd040',f:'지열파 → 질풍돌격 → 낙뢰강타를 이어 쓰면 발동하는 3단 오의. 화면 전체에 낙뢰 12줄기와 대폭발'},
  {id:'tenchi',n:'천지개벽',hz:'天地開闢',seq:['rise','quake'],win:100,col:'#ffa040',f:'승천격(↓↑+공격) 직후 지열파 — 거대한 빛기둥과 연속 충격파로 화면 안 적을 모두 띄운다'},
  {id:'fuun',  n:'풍운연참',hz:'風雲連斬',seq:['cmd','gale'],win:100,col:'#80e0ff',f:'전용기(↓→+공격) 직후 질풍돌격 — 돌진한 길 위를 6연속 일섬이 휩쓴다'},
  {id:'raitei',n:'뇌정만균',hz:'雷霆萬鈞',seq:['spin','thunder'],win:100,col:'#c8a8ff',f:'회전 특수기(공격+점프) 직후 낙뢰강타 — 화면 안 적에게 낙뢰 8줄기'},
];
const GP_MVN={rise:'승천격',cmd:'전용기',spin:'특수기',quake:'지열파',gale:'질풍돌격',thunder:'낙뢰강타'};
const GP_MVK={rise:'↓↑+공격',cmd:'↓→+공격',spin:'공격+점프',quake:'↓↓+공격',gale:'←→+공격',thunder:'↑↓+공격'};
function gpRead(p){
  const c=p.cmd,n=c.length;if(n<2)return null;const a=c[n-2],b=c[n-1];
  if(Wd.t-b.t>16||b.t-a.t>14)return null;
  if(a.d==='D'&&b.d==='D')return{id:'quake'};
  if(a.d==='U'&&b.d==='D')return{id:'thunder'};
  if((a.d==='L'&&b.d==='R')||(a.d==='R'&&b.d==='L'))return{id:'gale',dir:b.d==='R'?1:-1};
  return null;
}
function gpFindCombo(p,id){
  const log=p.gpLog||[];
  for(const C of GCOMBO){const s=C.seq;if(s[s.length-1]!==id)continue;let ok=true,tt=Wd.t;
    for(let k=s.length-2,j=log.length-1;k>=0;k--,j--){const L=log[j];if(!L||L.id!==s[k]||tt-L.t>C.win){ok=false;break}tt=L.t}
    if(ok)return C}
  return null;
}
const _tryCmdGP=tryCommand;
tryCommand=function(p,i){
  const P=G&&G.np===2?PP[i]:pressed;
  if(P.atk&&!P.jump){const g=gpRead(p);if(g){P.atk=false;p.cmd.length=0;gpStart(p,g);return true}}
  return _tryCmdGP(p,i);
};
function gpStart(p,g){
  const D=GCMD[g.id];if(!spendMp(p,D.cost))return;
  if(g.dir)p.facing=g.dir;
  p.state='gcmd';p.t=0;p.hitIds=new Set();p.z=0;p.vz=0;p.gc={id:g.id,combo:gpFindCombo(p,g.id),x0:p.x};p.inv=Math.max(p.inv,D.inv);
  kiai(vprof(p),'big');say(D.n+'!',vprof(p));cmdName(p,D.n);sfx(g.id==='gale'?'dash':'wind');
  const col=pcol(p);vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:40,r:96,spin:2});
  const C=p.gc.combo;
  if(C){const w=Wd;w.fx.push({type:'text',x:p.x,y:p.y,z:200,t:0,life:70,txt:`연계기 「${C.n}」`,col:C.col,size:28});
    if(C.seq.length>=3){w.cutin={t:0,dur:50,h:p.h,pl:p.idx,look:p.look,name:C.n,hz:C.hz,sub:'3단 연계 오의',col:C.col};w.cine={t:0,dur:110,col:C.col};sfx('cutin')}
    else w.sflash={t:0,dur:20,name:C.n,col:C.col,x:p.x,y:p.y,z:p.z};
    say(C.n+'!',vprof(p))}
}
function gpHit(p,test,dmg,knock,opt){let n=0;for(const e of Wd.enemies){if(!hittable(e)||!test(e))continue;damage(p,e,dmg,knock,opt);n++}return n}
const gpPow=(p,k)=>Math.round(powOf(p)*k);
function gpUpd(p,i){
  const w=Wd,f=p.facing,id=p.gc.id,D=GCMD[id],col=pcol(p),t=p.t,C=p.gc.combo;
  switch(id){
    case'quake':{const x=p.x+f*60;
      if(t<12&&t%2===0)for(let k=0;k<3;k++){const a=rnd(0,6.283);emit({x:p.x+Math.cos(a)*70,y:p.y+Math.sin(a)*20,z:rnd(20,90),vx:-Math.cos(a)*3,vz:-Math.sin(a)*1.5,col:k?col:'#ffffff',size:rnd(2,4),life:14,type:'sq'})}
      if(t===12){GPFX.quake(gpAdd,gpEmit,x,p.y,col,!!C);w.shake=Math.max(w.shake,14);sfx('rock');sfx('bomb');
        gpV(gpAdd,{k:'kanji',x,y:p.y,z:150,txt:D.hz,col,size:46,dur:40});
        gpHit(p,e=>Math.abs(e.x-x)<190&&Math.abs(e.y-p.y)<60,gpPow(p,1.8),true,{launch:true});if(C)gpComboFire(p,C,x)}
      if(t===22){vfx({k:'shock',x,y:p.y,col,life:26,r:380});gpHit(p,e=>Math.abs(e.x-x)<320&&Math.abs(e.y-p.y)<80,gpPow(p,1),false,{stun:24});sfx('rock')}
      break}
    case'gale':
      if(t<6){p.x-=f*1.5;if(t===5)vfx({k:'thrust',f:p,x:p.x,y:p.y,z:58,dir:f,col,len:340,w:30,dur:16,life:18})}
      else if(t<22){p.x+=f*17;w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:12,facing:f,look:p.look,pose:poseOf(p),tint:hexA(col,.5)});
        if(t%2===0)emit({x:p.x-f*20,y:p.y,z:rnd(20,80),vx:-f*rnd(4,8),vz:rnd(-1,1),col:t%4?col:'#ffffff',size:rnd(2,4),life:14,type:'sq'});
        for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;if(Math.abs(e.x-p.x)<64&&Math.abs(e.y-p.y)<42){p.hitIds.add(e);damage(p,e,gpPow(p,1.4),false,{stun:34})}}}
      if(t===24){const mid=(p.gc.x0+p.x)/2,len=Math.abs(p.x-p.gc.x0)+80;GPFX.slashX(gpAdd,mid,p.y,60,col,len);sfx('slash');w.shake=Math.max(w.shake,10);
        for(const e of p.hitIds)if(!e.dead)damage(p,e,gpPow(p,1.2),true);if(C)gpComboFire(p,C,mid)}
      if(C&&C.id==='fuun'&&t>=27&&t<=42&&t%3===0){const x0=Math.min(p.gc.x0,p.x),x1=Math.max(p.gc.x0,p.x),x=rnd(x0,x1);
        gpV(gpAdd,{k:'slash',x,y:p.y+rnd(-20,20),z:rnd(40,90),col:t%6?C.col:'#ffffff',ang:rnd(-1.2,1.2),len:rnd(240,360),w:10,dur:12});sfx('slash');
        gpHit(p,e=>e.x>x0-60&&e.x<x1+60&&Math.abs(e.y-p.y)<60,gpPow(p,.7),t===42,{stun:16})}
      break;
    case'thunder':
      if(t<14){p.z=Math.sin(t/14*Math.PI/2)*110;if(t===1)sfx('jump')}
      else if(t<20){p.z=110*(1-(t-14)/6);p.x+=f*4}
      else p.z=0;
      if(t===20){w.shake=Math.max(w.shake,12);sfx('land');vfx({k:'shock',x:p.x,y:p.y,col,life:22,r:180});
        for(let k=0;k<3;k++){const x=p.x+f*(70+k*90),y=p.y;GPFX.bolt(gpAdd,gpEmit,x,y,col,k*4,8);
          w.hz.push({x,y,t:0,delay:k*4+1,r:72,owner:'p',pl:p,kind:'bolt',dmg:gpPow(p,1.3)})}
        gpV(gpAdd,{k:'kanji',x:p.x+f*160,y:p.y,z:170,txt:D.hz,col,size:46,dur:40,delay:4});if(C)gpComboFire(p,C,p.x+f*160)}
      break;
  }
  /* 끝무렵: 다음 커맨드로 바로 이어 쓰기 (연계용) */
  if(t>=D.cancel){const P=G&&G.np===2?PP[i]:pressed;if(P.atk){const g=gpRead(p);if(g){P.atk=false;p.cmd.length=0;p.z=0;gpStart(p,g);return}}}
  if(t>=D.dur){p.state='idle';p.t=0;p.z=0;p.gc=null}
  const maxX=w.lock!==null?w.camX+W-25:Math.min(w.S.len-25,w.camX+W-25);p.x=clamp(p.x,w.camX+25,maxX);
}
/* 연계기 발동 */
function gpComboFire(p,C,x){
  const w=Wd,col=C.col;hitstop=Math.max(hitstop,6);w.flashT=Math.max(w.flashT,8);w.flashCol=hexRGB(col).join(',');
  gpV(gpAdd,{k:'kanji',x:p.x+p.facing*120,y:p.y,z:230,txt:C.hz,col,size:C.seq.length>=3?78:60,dur:80});
  const foes=w.enemies.filter(e=>!e.dead&&onScreen(e,10));
  switch(C.id){
    case'tenchi':vfx({k:'pillar',x,y:p.y,col,life:40,w:110,h:520});
      for(let i=0;i<5;i++)w.fx.push({type:'ring',x,y:p.y,t:0,life:28+i*6,delay:i*4,r:500,col});sfx('boss');
      gpHit(p,e=>onScreen(e,10)&&Math.abs(e.x-x)<440,gpPow(p,3),true,{launch:true});break;
    case'fuun':sfx('wind');break;                                             // 6연속 일섬은 gpUpd 에서
    case'raitei':for(let k=0;k<8;k++){const e=foes[k%Math.max(1,foes.length)],bx=e?e.x+rnd(-20,20):x+rnd(-300,300),by=e?e.y:clamp(p.y+rnd(-60,60),GT+5,GB);
        GPFX.bolt(gpAdd,gpEmit,bx,by,col,6+k*4,9);w.hz.push({x:bx,y:by,t:0,delay:7+k*4,r:80,owner:'p',pl:p,kind:'bolt',dmg:gpPow(p,1.4)})}break;
    case'musou':for(let k=0;k<12;k++){const e=foes[k%Math.max(1,foes.length)],bx=e?e.x+rnd(-30,30):w.camX+rnd(80,W-80),by=e?e.y:rnd(GT+10,GB-10);
        GPFX.bolt(gpAdd,gpEmit,bx,by,k%2?col:'#ffffff',4+k*3,10);w.hz.push({x:bx,y:by,t:0,delay:5+k*3,r:85,owner:'p',pl:p,kind:'bolt',dmg:gpPow(p,1.6)})}
      const cx=w.camX+W/2;for(let i=0;i<10;i++)gpV(gpAdd,{k:'slash',x:cx+rnd(-300,300),y:rnd(GT+20,GB-20),z:rnd(40,140),col:i%2?col:'#ffffff',ang:i/10*Math.PI,len:rnd(500,800),w:13,delay:40+i*2,dur:18});
      gpV(gpAdd,{k:'crack',x:cx,y:(GT+GB)/2,col,r:420,n:16,dur:120,delay:40});w.gpMusou={t:0,p};sfx('boss');break;
  }
}
/* 기술 기록 (연계 판정용) */
function gpLog(p){const st=p.state,id=st==='gcmd'?p.gc&&p.gc.id:(st==='cmd'||st==='rise'||st==='spin'||st==='special')?st:null;
  if(id){(p.gpLog=p.gpLog||[]).push({id,t:Wd.t});if(p.gpLog.length>6)p.gpLog.shift()}}
const _updPlayerGP=updPlayer;
updPlayer=function(p){
  _updPlayerGP(p);
  if(scene!=='play'||p.out)return;
  if(p.state==='gcmd'&&!p.dead&&p.gc)gpUpd(p,p.idx);
  else if(p.state==='gcmd')p.state='idle';
  if(p.state!==p.gpPst||(p.state==='gcmd'&&p.gc&&p.gc!==p.gpPgc)){gpLog(p);p.gpPst=p.state;p.gpPgc=p.gc}
};
/* 커맨드 자세: 기존 모션을 빌린다 */
const _poseOfGP=poseOf;
poseOf=function(e){
  if(e&&e.state==='gcmd'&&e.gc){const st=e.state,t=e.t,cb=e.combo,ja=e.jatk;let r;
    try{
      if(e.gc.id==='quake'){if(t<12){e.state='skill'}else{e.state='attack';e.combo=3;e.t=Math.min(30,8+(t-12))}}
      else if(e.gc.id==='gale'){if(t<6)e.state='run';else{e.state='dashatk';e.t=Math.min(16,Math.max(0,t-6)*.6)}}
      else{if(t<20){e.state='jump';e.jatk=false}else{e.state='attack';e.combo=3;e.t=Math.min(30,8+(t-20))}}
      r=_poseOfGP(e)}finally{e.state=st;e.t=t;e.combo=cb;e.jatk=ja}
    return r}
  return _poseOfGP(e);
};
/* 연계 안내: 다음에 이어 쓸 수 있는 커맨드를 머리 위에 */
const GP_HINT_ST={idle:1,walk:1,run:1,attack:1};
function gpComboHints(cx){
  const w=Wd;if(!w||w.cutin)return;
  for(const p of w.ps){if(p.out||p.dead||!p.gpLog||!p.gpLog.length||!GP_HINT_ST[p.state])continue;const L=p.gpLog[p.gpLog.length-1];if(L.id==='special')continue;
    let best=null;for(const C of GCOMBO){const s=C.seq;for(let k=0;k<s.length-1;k++){if(s[k]!==L.id||w.t-L.t>C.win)continue;
      if(k>0){const P=p.gpLog[p.gpLog.length-2];if(!P||P.id!==s[k-1])continue}
      if(!best||s.length>best.C.seq.length)best={C,next:s[k+1]}}}
    if(!best)continue;const left=1-(w.t-L.t)/best.C.win,x=p.x-cx,y=p.y-p.z-150;
    ctx.globalAlpha=Math.min(1,left*3);txt(`연계 ▶ ${GP_MVK[best.next]}  「${best.C.n}」`,x,y,13,best.C.col,'center',FONT,['#000',4]);
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-50,y+10,100,4);ctx.fillStyle=best.C.col;ctx.fillRect(x-50,y+10,100*left,4);ctx.globalAlpha=1}
}
/* 2인 합격기: 두 사람이 2.5초 안에 필살기를 쓰면, 둘 다 끝난 뒤 「쌍룡합격」 */
const _doSpGP=doSpecial;
doSpecial=function(p,myth){
  const was=p.state;_doSpGP(p,myth);
  if(!(p.state==='special'&&was!=='special'))return;const w=Wd;(w.gpSpT=w.gpSpT||[])[p.idx]=w.t;
  if(G.np===2&&!w.gpJoint&&!(w.gpJointCd>w.t)){const o=w.ps[1-p.idx],ot=w.gpSpT[1-p.idx];
    if(o&&!o.out&&!o.dead&&ot!=null&&w.t-ot<150){w.gpJoint={t:-1,a:o,b:p};w.fx.push({type:'text',x:(o.x+p.x)/2,y:p.y,z:220,t:0,life:80,txt:'합격 준비!',col:'#ffe060',size:30})}}
};
function gpJointTick(){
  const w=Wd,J=w.gpJoint;
  if(w.gpMusou){const M=w.gpMusou;M.t++;if(M.t===40){w.shake=40;w.flashT=18;w.flashCol='255,240,200';sfx('bomb');sfx('boss');
      for(const q of w.enemies)if(!q.dead&&onScreen(q,20))damage(M.p,q,spDmg(M.p,18),true)}if(M.t>60)w.gpMusou=null}
  if(!J)return;
  if(J.t<0){if(J.a.state==='special'||J.b.state==='special')return;J.t=0}
  const t=J.t++,A=J.a,B=J.b,cx=w.camX+W/2,cy=(GT+GB)/2;
  if(t===0){w.cutin={t:0,dur:56,h:B.h,pl:B.idx,look:B.look,name:'쌍룡합격',hz:'雙龍合擊',sub:`${A.h.name} · ${B.h.name} 합격기`,col:'#ffe060'};w.cine={t:0,dur:56+90,col:'#ffe060'};sfx('cutin');say('쌍룡합격!',vprof(B));
    for(const q of[A,B]){q.inv=Math.max(q.inv,150)}}
  if(t>=4&&t<=64&&t%4===0){const k=t/4,col=k%2?A.h.fx:B.h.fx,foes=w.enemies.filter(e=>!e.dead&&onScreen(e,10)),e=foes.length?foes[k%foes.length]:null;
    const x=e?e.x:w.camX+rnd(80,W-80),y=e?e.y:rnd(GT+10,GB-10);GPFX.bolt(gpAdd,gpEmit,x,y,col,0,9);
    gpV(gpAdd,{k:'slash',x,y,z:70,col,ang:rnd(0,Math.PI),len:300,w:11,dur:14});w.hz.push({x,y,t:0,delay:1,r:90,owner:'p',pl:k%2?A:B,kind:'bolt',dmg:Math.round(spDmg(k%2?A:B,8))})}
  if(t===12)gpV(gpAdd,{k:'kanji',x:cx,y:cy,z:200,txt:'雙龍合擊',col:'#ffe060',size:76,dur:90});
  if(t===72){w.shake=40;w.flashT=20;w.flashCol='255,240,190';sfx('bomb');sfx('boss');GPFX.quake(gpAdd,gpEmit,cx,cy,'#ffe060',true);
    for(let i=0;i<4;i++)w.fx.push({type:'ring',x:cx,y:cy,t:0,life:30+i*8,delay:i*5,r:760,col:i%2?A.h.fx:B.h.fx});
    for(const q of w.enemies)if(!q.dead&&onScreen(q,20))damage(B,q,spDmg(B,20)+spDmg(A,20),true)}
  if(t>90){w.gpJoint=null;w.gpJointCd=w.t+600}
}
function gpJointDraw(){
  const J=Wd.gpJoint;if(!J||J.t<0||J.t>72)return;
  /* 두 무장 사이를 잇는 빛줄기 */
  const cx=Wd.camX,a=Math.min(1,J.t/10);ctx.save();ctx.globalCompositeOperation='lighter';
  for(const [w,c,al] of[[16,J.a.h.fx,.3],[6,J.b.h.fx,.7],[2,'#ffffff',1]]){ctx.strokeStyle=vxA(c,al*a);ctx.lineWidth=w;ctx.beginPath();
    ctx.moveTo(J.a.x-cx,J.a.y-J.a.z-60);ctx.quadraticCurveTo((J.a.x+J.b.x)/2-cx,Math.min(J.a.y,J.b.y)-200+Math.sin(J.t*.3)*20,J.b.x-cx,J.b.y-J.b.z-60);ctx.stroke()}
  ctx.restore();
}

/* ================= 5. 스킬 미리보기 ================= */
/* 캐릭터 창 스킬 탭에서 회피 키(Shift / O · 2P R-Shift) → 미리보기 창.  ←→ 항목 넘기기, 공격/점프/회피 닫기 */
const PV={on:false};
function pvItems(ps){
  const hid=HEROES[ps.hero].id,L=[];
  for(const s of HSK[hid])if(ACTIVE_TY[s.ty])L.push({kind:'skill',s,n:s.n,sub:`${TYN[s.ty]} · ${TREES[hid][s.tr]} ${s.ti+1}단계`,f:s.f,col:skCol(s,ps)});
  for(const id in GCMD){const D=GCMD[id];L.push({kind:'gcmd',id,n:D.n,sub:`커맨드 기술 · ${D.seq} · 기력 ${D.cost}`,f:D.f,col:HEROES[ps.hero].fx})}
  for(const C of GCOMBO)L.push({kind:'combo',C,n:C.n,sub:`연계 기술 · ${C.seq.map(k=>`${GP_MVN[k]}(${GP_MVK[k]})`).join(' → ')}`,f:C.f,col:C.col});
  const h=HEROES[ps.hero];L.push({kind:'sp',n:h.spName,sub:`필살기 · ${KN[0].sp} 키 · 기력 50`,f:'컷인 연출 뒤 화면을 뒤덮는 고유 필살기, 이어서 연속 낙뢰 · 일섬 · 대폭발 피날레',col:h.fx});
  return L;
}
function pvOpen(ps,idx){
  const L=pvItems(ps);let k=0;const cs=skillCells(ps),s=cs[MN.cur[1]]&&cs[MN.cur[1]].s;if(s){const j=L.findIndex(o=>o.s===s);if(j>=0)k=j}
  Object.assign(PV,{on:true,ps,L,k,look:null,dl:null});pvReset();sfx('ok');
  if(s&&!ACTIVE_TY[s.ty])menuMsg('패시브 · 오라 · 강화 스킬은 미리보기가 없어 액티브 스킬부터 보여줍니다','#ffb070');
}
const PV_X=150,PV_W=660,PV_GY=420;
function pvReset(){
  const it=PV.L[PV.k];PV.len=it.kind==='combo'?46*it.C.seq.length+80:it.kind==='gcmd'?110:150;
  PV.t=0;PV.dim=0;PV.flash=0;PV.later=[];PV.v=[];PV.pt=[];PV.hits=0;PV.hitT=0;
  PV.hero={h:HEROES[PV.ps.hero],ps:PV.ps,isPlayer:true,state:'idle',t:0,anim:0,facing:1,x:PV_X+130,y:PV_GY,z:0,combo:1,jatk:false,trail:[]};
  PV.d=[0,1,2].map(i=>({x:PV_X+360+i*95,y:PV_GY-12+i*12,x0:PV_X+360+i*95,z:0,vz:0,hurt:0,state:'idle',t:0,anim:i*7,facing:-1}));
}
const pvAdd=o=>{o.t=0;PV.v.push(o);return o};
const pvEm=(o,d)=>{PV.pt.push(Object.assign({t:-(d||0),life:30,x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,size:4,col:'#fff'},o))};
function pvHit(test,launch){let n=0;for(const d of PV.d)if(test(d)){d.hurt=18;d.vz=launch?7:Math.max(d.vz,2);d.x+=launch?0:10;n++;
  for(let i=0;i<6;i++)pvEm({x:d.x,y:d.y,z:60,vx:rnd(-4,4),vz:rnd(1,5),col:i%2?'#ffffff':PV.L[PV.k].col,size:rnd(2,4),life:14})}
  if(n){PV.hits+=n;PV.hitT=40}return n}
/* 항목별 연출 대본 (한 번 = 120프레임) */
function pvScript(){
  const it=PV.L[PV.k],H=PV.hero,t=PV.t,col=it.col,f=1,D=PV.d;H.anim++;
  const set=(st,tt,o)=>{H.state=st;H.t=tt;Object.assign(H,o||{})};
  if(it.kind==='skill'){const s=it.s,pose=SK_POSE[s.ty]||'skill';
    if(t===1){pvAdd({k:'circle',x:H.x,y:H.y,f:H,col,life:46,r:92,spin:1});pvAdd({k:'pillar',x:H.x,y:H.y,f:H,col,life:30,w:46,h:240});gpSkillFx(pvAdd,pvEm,H,s,col)}
    const st=t<50?pose:'idle';if(st==='attack3')set('attack',Math.min(t,30),{combo:3});else set(st,st==='idle'?0:t,{jatk:false});
    switch(s.ty){
      case'proj':if(t>=8&&t<40){const bx=H.x+40+(t-8)*16;pvEm({x:bx,y:H.y,z:60,col,size:12,life:6,type:'glow'});pvHit(d=>Math.abs(d.x-bx)<20&&d.hurt<10)}break;
      case'dash':if(t>=4&&t<20)H.x+=18;if(t>=4&&t<24)pvHit(d=>Math.abs(d.x-H.x)<40&&d.hurt<4);if(t===24)pvAdd({k:'thrust',x:H.x-300,y:H.y,z:58,dir:1,col,len:320,w:30,dur:16,life:18});break;
      case'nova':case'quake':if(t===10||t===20||t===30)pvHit(d=>true,t===30);break;
      case'rain':case'chain':for(let i=0;i<6;i++)if(t===10+i*5)pvHit(d=>Math.abs(d.x-(H.x+90+i*70))<50);break;
      case'whirl':if(t%8===4&&t<44){pvHit(d=>Math.abs(d.x-H.x)<150);H.x+=4}break;
      case'leap':if(t<24){H.z=Math.sin(t/24*Math.PI)*120;H.x+=8}else H.z=0;if(t===24){pvHit(d=>Math.abs(d.x-H.x)<180,true);GPFX.quake(pvAdd,pvEm,H.x,H.y,col,false)}break;
      case'summon':for(let i=0;i<3;i++)if(t===14+i*6){pvAdd({k:'thrust',x:H.x,y:H.y-20+i*20,z:58,dir:1,col,len:380,w:26,dur:16,life:18});pvHit(d=>true)}break;
      case'buff':if(t%4===0&&t<50)pvEm({x:H.x+rnd(-30,30),y:H.y,z:rnd(0,40),vz:rnd(2,5),col,size:rnd(2,5),life:30});break;
    }
    if(t>=80)H.x+=(PV_X+130-H.x)*.2;
  }else if(it.kind==='gcmd'||it.kind==='combo'){
    const seq=it.kind==='gcmd'?[it.id]:it.C.seq,per=46,i=Math.min(seq.length-1,Math.floor(t/per)),lt=t-i*per,id=seq[i],last=it.kind==='combo'&&i===seq.length-1;
    if(t>=per*seq.length+20){set('idle',0);H.z=0;H.x+=(PV_X+130-H.x)*.2;return}
    if(lt===0&&i>0)H.x=Math.min(H.x,PV_X+220);
    if(lt===1)pvAdd({k:'kanji',x:H.x,y:H.y,z:170,txt:GCMD[id]?GCMD[id].hz:({rise:'昇天',cmd:'專用',spin:'回旋'})[id],col:it.col,size:34,dur:30});
    if(id==='quake'){if(lt<12)set('skill',lt);else set('attack',Math.min(30,8+lt-12),{combo:3});
      if(lt===12){GPFX.quake(pvAdd,pvEm,H.x+60,H.y,col,last);pvHit(d=>Math.abs(d.x-H.x-60)<200,true)}if(lt===22)pvHit(d=>true)}
    else if(id==='gale'){if(lt<6)set('run',lt);else set('dashatk',Math.min(16,(lt-6)*.6));if(lt===0)H.gx0=H.x;
      if(lt>=6&&lt<20){H.x+=15;pvHit(d=>Math.abs(d.x-H.x)<40&&d.hurt<4)}if(lt===24){GPFX.slashX(pvAdd,(H.gx0+H.x)/2,H.y,60,col,Math.abs(H.x-H.gx0)+80);pvHit(d=>true,true)}}
    else if(id==='thunder'){if(lt<20){set('jump',lt,{jatk:false});H.z=lt<14?Math.sin(lt/14*Math.PI/2)*110:110*(1-(lt-14)/6)}else{set('attack',Math.min(30,8+lt-20),{combo:3});H.z=0}
      if(lt===20)for(let k=0;k<3;k++){GPFX.bolt(pvAdd,pvEm,H.x+70+k*90,H.y,col,k*4,7);const bx=H.x+70+k*90;PV.later=(PV.later||[]).concat([{t:t+k*4,fn:()=>pvHit(d=>Math.abs(d.x-bx)<70)}])}}
    else if(id==='rise'){set('rise',lt);if(lt>=3&&lt<30)H.z=Math.max(0,Math.sin((lt-3)/27*Math.PI)*90);if(lt===4){pvAdd({k:'pillar',x:H.x+45,y:H.y,col,life:26,w:60,h:260});pvHit(d=>Math.abs(d.x-H.x)<160,true)}}
    else if(id==='cmd'){set('attack',Math.min(30,lt),{combo:3});if(lt===8){pvAdd({k:'thrust',x:H.x,y:H.y,z:58,dir:1,col,len:300,w:28,dur:16,life:18});pvHit(d=>true)}}
    else if(id==='spin'){set('spin',lt);if(lt%8===2&&lt<32){pvAdd({k:'shock',x:H.x,y:H.y,col,life:16,r:200});pvHit(d=>Math.abs(d.x-H.x)<150)}}
    if(last&&((id==='quake'&&lt===12)||(id==='gale'&&lt===24)||(id==='thunder'&&lt===20))){const C=it.C;
      pvAdd({k:'kanji',x:PV_X+PV_W/2,y:PV_GY-40,z:150,txt:C.hz,col:C.col,size:C.seq.length>=3?64:52,dur:70});PV.flash=10;
      for(let k=0;k<(C.id==='musou'?10:C.id==='raitei'?6:0);k++){const d=PV.d[k%3];GPFX.bolt(pvAdd,pvEm,d.x+rnd(-20,20),d.y,k%2?C.col:'#ffffff',6+k*3,8)}
      if(C.id==='tenchi'){pvAdd({k:'pillar',x:H.x+60,y:H.y,col:C.col,life:40,w:150,h:420});GPFX.quake(pvAdd,pvEm,H.x+60,H.y,C.col,true)}
      if(C.id==='fuun')for(let k=0;k<6;k++)pvAdd({k:'slash',x:rnd(PV_X+200,PV_X+620),y:PV_GY+rnd(-15,15),z:rnd(40,90),col:k%2?C.col:'#ffffff',ang:rnd(-1.2,1.2),len:rnd(220,320),w:9,delay:3+k*3,dur:12,life:15+k*3});
      if(C.id==='musou')for(let k=0;k<8;k++)pvAdd({k:'slash',x:PV_X+PV_W/2+rnd(-200,200),y:PV_GY-rnd(0,30),z:rnd(40,140),col:k%2?C.col:'#ffffff',ang:k/8*Math.PI,len:rnd(420,600),w:12,delay:30+k*2,dur:16,life:46+k*2});
      PV.later=(PV.later||[]).concat([0,8,16,24,32].map(dd=>({t:t+dd,fn:()=>pvHit(d=>true,dd===32)})))}
  }else{/* 필살기 */
    if(t<30){set('skill',t);PV.dim=Math.min(1,t/10)}else if(t<90){set('special',t-30)}else{set('win',t-90);PV.dim=Math.max(0,(PV.dim||0)-.05)}
    if(t===30){GPFX.quake(pvAdd,pvEm,H.x,H.y,col,true);pvAdd({k:'kanji',x:PV_X+PV_W/2,y:PV_GY-60,z:120,txt:(HERO_SP_HZ[H.h.id]||'必殺').slice(0,4),col,size:60,dur:80})}
    if(t>=36&&t<=84&&t%8===4){const d=PV.d[(t/8|0)%3];GPFX.bolt(pvAdd,pvEm,d.x,d.y,col,0,8);GPFX.slashX(pvAdd,d.x,d.y,60,col,200);pvHit(o=>o===d)}
    if(t===92){for(let i=0;i<6;i++)pvAdd({k:'slash',x:PV_X+420+rnd(-120,120),y:PV_GY+rnd(-20,20),z:rnd(40,120),col:i%2?col:'#ffffff',ang:i/6*Math.PI,len:rnd(380,520),w:12,delay:i*2,dur:16,life:16+i*2});PV.flash=12;pvHit(()=>true,true)}
  }
}
function pvTick(){
  PV.t++;if(PV.t>=PV.len){pvReset();return}
  pvScript();
  if(PV.later)PV.later=PV.later.filter(q=>{if(PV.t>=q.t){q.fn();return false}return true});
  for(const v of PV.v)v.t++;PV.v=PV.v.filter(v=>v.t<v.life);
  for(const q of PV.pt){q.t++;if(q.t>0){q.x+=q.vx;q.z+=q.vz;q.vz-=q.g||0}}PV.pt=PV.pt.filter(q=>q.t<q.life);
  for(const d of PV.d){d.anim++;if(d.hurt>0)d.hurt--;d.z=Math.max(0,d.z+d.vz);d.vz=d.z>0?d.vz-.6:0;d.x+=(d.x0-d.x)*.05}
  if(PV.hitT>0)PV.hitT--;else PV.hits=0;if(PV.flash>0)PV.flash--;
}
function pvDraw(){
  const it=PV.L[PV.k],x0=130,y0=64,w0=700,h0=440;
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,W,H);
  panel(x0,y0,w0,h0,it.col);
  txt(`스킬 미리보기  ${PV.k+1} / ${PV.L.length}`,x0+16,y0+18,13,'#a89878','left');
  txt(it.n,x0+w0/2,y0+26,24,it.col,'center',FONT,['#000',5]);txt(it.sub,x0+w0/2,y0+52,13,'#e8d8b8');
  /* 무대 */
  const sx=PV_X,sy=y0+70,sw=PV_W,sh=PV_GY-sy+40;
  ctx.save();ctx.beginPath();ctx.rect(sx,sy,sw,sh);ctx.clip();
  const bg=ctx.createLinearGradient(0,sy,0,sy+sh);bg.addColorStop(0,'#1a1430');bg.addColorStop(.62,'#3a2a3a');bg.addColorStop(.63,'#4a3a2a');bg.addColorStop(1,'#2a2016');ctx.fillStyle=bg;ctx.fillRect(sx,sy,sw,sh);
  if(PV.dim>0){ctx.fillStyle=`rgba(8,4,20,${.5*PV.dim})`;ctx.fillRect(sx,sy,sw,sh)}
  for(const v of PV.v)if(v.k==='crack')gpCrack(v,0);else if(v.k==='circle')vxCircle(v,0);else if(v.k==='shock')vxShock(v,0);
  const ents=[...PV.d.map(d=>({d})),{h:PV.hero}].sort((a,b)=>(a.d||a.h).y-(b.d||b.h).y);
  if(!PV.dl)PV.dl=enemyLook('yellow','s');if(!PV.look)PV.look=heroLook(PV.ps);
  for(const o of ents){
    if(o.d){const d=o.d;ctx.fillStyle='rgba(0,0,0,.35)';ell(d.x,d.y,20,5);
      const pe={look:PV.dl,state:d.hurt>0?(d.z>0?'down':'hurt'):'idle',t:d.hurt>0?18-d.hurt:d.anim,anim:d.anim,z:d.z,facing:-1};let pose;try{pose=poseOf(pe)}catch(_){pose=null}
      if(pose)try{renderModelOutlined(ctx,PV.dl,pose,d.x,d.y-d.z,1,-1,{flash:d.hurt>12&&(d.hurt&2)},'#140a06')}catch(_){}}
    else{const Hh=PV.hero;ctx.fillStyle='rgba(0,0,0,.35)';ell(Hh.x,Hh.y,22*Math.max(.5,1-Hh.z/150),6);Hh.look=PV.look;let pose;try{pose=poseOf(Hh)}catch(_){pose=null}
      if(!pose){const st=Hh.state;Hh.state='idle';try{pose=poseOf(Hh)}catch(_){}Hh.state=st}
      if(pose)try{renderModelOutlined(ctx,PV.look,pose,Hh.x,Hh.y-Hh.z,1.1,Hh.facing||1,{},'#140a06')}catch(_){}}
  }
  for(const v of PV.v){if(v.k==='pillar')vxPillar(v,0);else if(v.k==='flash')vxFlash(v,0);else if(v.k==='star')vxStar(v,0);else if(v.k==='arc')vxArc(v,0);else if(v.k==='thrust')vxThrust(v,0);else gpDrawV(v,0)}
  ctx.globalCompositeOperation='lighter';for(const q of PV.pt){if(q.t<0)continue;const a=1-q.t/q.life;ctx.fillStyle=vxA(q.col,a);if(q.type==='glow'){const s=q.size*3;ctx.globalAlpha=a;ctx.drawImage(glowSpr(q.col),q.x-s/2,q.y-q.z-s/2,s,s);ctx.globalAlpha=1}else{const s=q.size;ctx.fillRect(q.x-s/2,q.y-q.z-s/2,s,s)}}ctx.globalCompositeOperation='source-over';
  if(PV.flash>0){ctx.fillStyle=`rgba(255,255,255,${PV.flash/30})`;ctx.fillRect(sx,sy,sw,sh)}
  if(PV.hits>0)txt(`${PV.hits} HIT`,sx+sw-16,sy+24,22,'#ffe060','right',MONO,['#000',5]);
  ctx.restore();ctx.strokeStyle=hexA(it.col,.7);ctx.lineWidth=2;ctx.strokeRect(sx+.5,sy+.5,sw-1,sh-1);
  /* 설명 */
  let y=sy+sh+18;for(const ln of wrap(it.f||'',w0-40,13).slice(0,2)){txt(ln,x0+w0/2,y,13,'#e8dcc0');y+=18}
  const K=kn(MN.i);txt(`← → 다른 기술   ·   ${K.atk} / ${K.jump} / ${K.dodge} 닫기`,x0+w0/2,y0+h0-10,12,'#aaa');
}
const _updMenuGP=updMenu;
updMenu=function(){
  const i=MN.i,P=G.np===2?PP[i]:pressed,take=k=>{if(P[k]){P[k]=false;return true}return false};
  if(PV.on){MN.t++;
    if(take('left')){PV.k=(PV.k+PV.L.length-1)%PV.L.length;pvReset();sfx('sel')}
    else if(take('right')){PV.k=(PV.k+1)%PV.L.length;pvReset();sfx('sel')}
    if(take('atk')||take('jump')||take('dodge')||take('menu')||hit('pause')||hit('start')){PV.on=false;sfx('sel');return}
    take('up');take('down');take('sp');take('item');take('swap');for(let k=1;k<=4;k++)take('sk'+k);
    pvTick();return}
  if(MN.tab===1&&take('dodge')){pvOpen(G.pl[i],i);return}
  _updMenuGP();
};
const _drawMenuGP=drawMenu;
drawMenu=function(){
  _drawMenuGP();
  if(MN.tab===1&&!PV.on){const K=kn(MN.i);ctx.fillStyle='rgba(60,20,8,.95)';ctx.fillRect(784,56,158,22);ctx.strokeStyle='#ffd24a';ctx.lineWidth=1;ctx.strokeRect(784.5,56.5,157,21);
    txt(`▶ ${K.dodge} 스킬 미리보기`,863,67,12,'#ffe8a8')}
  if(PV.on)pvDraw();
};
const _closeMenuGP=closeMenu;
closeMenu=function(){PV.on=false;return _closeMenuGP.apply(this,arguments)};

/* 일시정지 · 안내 화면 커맨드 표: 새 커맨드 3종 + 연계 한 줄 (같은 칸 크기에 촘촘히) */
drawCmdTable=function(x,y,w){
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x,y,w,228);ctx.strokeStyle='#b8902a';ctx.lineWidth=2;ctx.strokeRect(x,y,w,228);
  txt('커맨드 기술',x+w/2,y+15,16,'#ffd24a');
  const L=CMDLIST.slice(0,5).concat(Object.values(GCMD).map(D=>[D.seq.replace(' (뒤 → 앞)',''),D.n,'기력 '+D.cost,1])).concat(CMDLIST.slice(5));
  L.forEach(([c,n,cost,nw],i)=>{const yy=y+35+i*16.2;txt(c,x+18,yy,13,nw?'#9fffc0':'#fff','left',FONT);txt(n,x+w*.44,yy,13,nw?'#9fffc0':'#ffe8a8','left');txt(cost,x+w-14,yy,12,'#8ad0ff','right')});
  txt('연계: 승천격→지열파 · 전용기→질풍돌격 · 특수기→낙뢰강타 · 지열→질풍→낙뢰',x+w/2,y+217,12,'#ffb070');
};
