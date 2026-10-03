'use strict';
/* ===== 전투 패턴 확장 =====
   · 병종 역할: 방패병(정면 방어) · 기병(예고 후 라인 돌격) · 기수(주변 적 강화)
   · 공격 토큰: 한 번에 달려드는 근접병 수를 제한하고 나머지는 포위 대기
   · 사기: 장교 · 기수가 쓰러지면 주변 병사가 도주
   · 보스 페이즈: 체력 구간마다 정해진 순서의 패턴 + 전환 연출 + 고유 기믹(결계 · 기마 · 잡기 · 기병 라인 · 분신 · 반격 · 환영)
   · 예고 연출(돌격 라인 · 착지 원 · 경고 표식)과 경직 게이지(그로기) */

/* ---------- 예고 표식 ---------- */
const TL=()=>Wd.tele||(Wd.tele=[]);
function tele(o){o.t=0;TL().push(o);return o}
const txtFx=(x,y,z,s,col,size,life)=>Wd.fx.push({type:'text',x,y,z,t:0,life:life||60,txt:s,col,size:size||20});

/* ---------- 매 프레임 ---------- */
function battleTick(){
  const w=Wd;
  for(const z of TL())z.t++;
  w.tele=TL().filter(z=>z.t<z.life);
  if(w.phaseBanner){w.phaseBanner.t++;if(w.phaseBanner.t>150)w.phaseBanner=null}
  assignTokens();
}
/* 공격 토큰: 플레이어마다 근접 공격권을 가진 적 수 제한. 토큰 없는 적은 둘레에서 대기하며 틈을 엿본다 */
function assignTokens(){
  const w=Wd,ps=alivePs();if(!ps.length)return;
  const cap=[2,2,3,4][G.diffIdx]+(G.np===2?1:0),n=Math.max(1,Math.ceil(cap/ps.length));
  const mel=w.enemies.filter(e=>!e.dead&&!e.boss&&!e.ranged&&!e.banner&&!e.decoy&&!e.fleeing&&e.state!=='charge');
  for(const p of ps){
    const mine=mel.filter(e=>tgtOf(e)===p).sort((a,b)=>(Math.abs(a.x-p.x)-(a.token?90:0))-(Math.abs(b.x-p.x)-(b.token?90:0)));
    let first=0;
    mine.forEach((e,i)=>{e.token=i<n;e.slot=i-n;
      if(e.token){if(i===0){first=e.x<p.x?-1:1;e.tside=first}else e.tside=i%2?-first:first}});
  }
}
/* 토큰 없는 근접병의 대기 위치 (좌우로 벌려 포위) */
function holdPos(e,p){
  const side=e.x<p.x?-1:1,k=Math.max(0,e.slot||0);
  const x=p.x+side*(165+(k%3)*42),y=p.y+(k%2?-46:46)+Math.sin((Wd.t+k*40)*.03)*14;
  return[clamp(x,Wd.camX+30,Wd.camX+W-30),clamp(y,GT+5,GB)];
}

/* ---------- 병종 역할 AI (true = 이번 프레임 처리 완료) ---------- */
function roleAI(e,p){
  const w=Wd,d=D();
  if(e.rally>0){e.rally--;if(e.cd>0)e.cd-=.5}
  if(e.fleeing){e.state='flee';e.t=0;return true}
  if(e.banner){
    if(w.t%30===0)for(const o of w.enemies)if(o!==e&&!o.dead&&!o.boss&&Math.abs(o.x-e.x)<250&&Math.abs(o.y-e.y)<100)o.rally=45;
    const dx=p.x-e.x,adx=Math.abs(dx);e.facing=dx>0?1:-1;let mx=0,my=0;
    if(adx<220)mx=-Math.sign(dx);else if(adx>330)mx=Math.sign(dx);
    const sx=e.x-w.camX;if(sx<40)mx=1;if(sx>W-40)mx=-1;
    const ty=clamp(p.y+(e.yoff>0?50:-50),GT+5,GB);if(Math.abs(ty-e.y)>6)my=Math.sign(ty-e.y);
    if(adx<95&&Math.abs(p.y-e.y)<22&&e.cd<=0){e.state='attack';e.t=0;e.hitIds=new Set();e.cd=rnd(90,140)/d.aggr;sfx('swing','spear');return true}
    if(mx||my){e.state='walk';e.x+=mx*e.spd;e.y+=my*e.spd*.7}else e.state='idle';
    return true}
  if(e.cavalry){
    e.chCd=(e.chCd==null?rnd(90,170):e.chCd)-1;
    const sx=e.x-w.camX;
    if(e.chCd<=0&&sx>30&&sx<W-30&&Math.abs(p.x-e.x)>120){startCharge(e,p);return true}}
  return false;
}
function startCharge(e,p){
  const dir=p.x>e.x?1:-1;e.state='charge';e.t=0;e.chDir=dir;e.facing=dir;e.chY=clamp(p.y,GT+5,GB);e.hitIds=new Set();
  tele({type:'lane',y:e.chY,x:e.x,dir,life:44,col:'255,70,50'});
  txtFx(e.x,e.y,150,'돌격!','#ff8060',18,40);
}

/* ---------- 특수 상태 ---------- */
const BSTATE={
  charge(e){
    const w=Wd;
    if(e.t<44){e.y+=(e.chY-e.y)*.12;e.facing=e.chDir;e.flash=(e.t%8<3)?2:0;return}
    if(e.t===44)sfx('dash');
    e.x+=e.chDir*10;e.y+=(e.chY-e.y)*.1;
    if(e.t%3===0)emit({x:e.x-e.chDir*30,y:e.y,z:2,vz:rnd(.5,1.5),vx:-e.chDir*2,col:'#b8a080',size:14,life:22,type:'smoke',add:false});
    for(const q of w.ps)if(!e.hitIds.has(q)&&hittable(q)&&Math.abs(q.x-e.x)<56&&Math.abs(q.y-e.y)<26&&q.z<45){e.hitIds.add(q);damage(e,q,Math.round(e.pow*1.5),true)}
    const sx=e.x-w.camX;
    if((e.chDir>0&&sx>W+50)||(e.chDir<0&&sx<-50)||e.t>220){e.state='idle';e.chCd=rnd(220,340)/D().aggr;e.x=clamp(e.x,w.camX-40,w.camX+W+40)}
  },
  flee(e){
    const w=Wd,p=tgtOf(e),dir=p?(e.x<p.x?-1:1):1;e.facing=dir;e.x+=dir*e.spd*1.8;
    if(e.t%12===0)emit({x:e.x,y:e.y,z:2,vz:.6,vx:-dir,col:'#b8a080',size:10,life:18,type:'smoke',add:false});
    const sx=e.x-w.camX;
    if(sx<-50||sx>W+50){e.remove=true;e.dead=true;
      const k=alivePs()[0]||w.ps[0];if(k){k.ps.score+=Math.round(e.score*.5*D().score);addExp(k,{lv:e.lv,exp:e.exp*.5})}}
    else if(e.t>360){e.fleeing=false;e.state='idle'}
  },
  stun(e){if(e.t%10===0)emit({x:e.x+rnd(-20,20),y:e.y,z:rnd(110,150)*(e.boss?1.5:1),vz:.5,col:'#ffe070',size:6,life:18,type:'sq'});
    if(e.t>(e.stunLen||90)){e.state='idle';e.inv=Math.max(e.inv,20)}},
  phase(e){e.flash=(e.t%6<3)?2:0;if(e.t===1){Wd.shake=20;sfx('roar');burst(e.x,e.y,70,'#ff4020',30,10)}
    if(e.t%4===0)emit({x:e.x+rnd(-30,30),y:e.y,z:rnd(20,140),vz:rnd(1,3),col:'#ff5030',size:12,life:22});
    if(e.t>=62)e.state='idle'}
};

/* ---------- 방패 막기 (정면 · 일반 공격만) ---------- */
function guardCheck(a,t,dir,knock,dmg){
  if(!t.shield||t.guardBrk>0||t.state==='down'||t.state==='flee'||t.state==='stun')return false;
  if(t.facing!==-dir)return false;
  if(knock||(a.z||0)>30){t.guardBrk=360;sfx('break');txtFx(t.x,t.y,120,'방패 파괴!','#ffb060',18,50);
    for(let i=0;i<8;i++)Wd.fx.push({type:'debris',x:t.x+dir*14,y:t.y,z:50,vx:rnd(-4,4)+dir*2,vz:rnd(3,7),t:0,life:40,col:'#8b5a2b'});return false}
  const own=ownerOf(a);
  t.hp-=Math.max(1,Math.round(dmg*.15));t.flash=4;hitstop=Math.max(hitstop,2);sfx('hit','blunt',false);
  burst(t.x-dir*14,t.y,t.z+55,'#dfe6ee',6,5,{type:'spark',size:3,life:10});
  if(!t.blkT||Wd.t-t.blkT>30){t.blkT=Wd.t;txtFx(t.x,t.y,110,'막기','#c8d8e8',14,26)}
  if(own&&own.ps)own.mp=Math.min(own.maxki,own.mp+1);
  if(t.hp<=0)killEnt(t,dir,own);
  return true;
}
/* 적에게 가는 피해 배율 (결계 · 사기 · 그로기) */
function enemyDmgMul(t){let m=1;if(t.barrier)m*=.15;if(t.rally>0)m*=.8;if(t.state==='stun')m*=1.3;return m}
function superArmor(t){return t.state==='charge'||t.state==='phase'||!!t.lamp}

/* ---------- 사기 붕괴 · 분신 ---------- */
function battleOnDeath(e){
  const w=Wd;
  if(e.escortNpc){escortDown(e);return true}
  if(e.decoy){for(let i=0;i<3;i++)w.fx.push({type:'smoke',x:e.x+rnd(-20,20),y:e.y,t:0,life:30});txtFx(e.x,e.y,150,'분신이었다!','#d0c0ff',20,60);e.remove=true;return true}
  if((e.officer||e.banner)&&!e.boss){let n=0;
    for(const o of w.enemies)if(o!==e&&!o.dead&&!o.boss&&!o.officer&&!o.decoy&&!o.fleeing&&Math.abs(o.x-e.x)<330&&Math.random()<(e.banner?.6:.4)){o.fleeing=true;o.state='flee';o.t=0;n++}
    if(n)txtFx(e.x,e.y,160,e.banner?'깃발이 꺾였다! 적군 사기 붕괴!':'장수가 쓰러졌다! 적군이 동요한다!','#ffd060',20,80)}
  return false;
}

/* ---------- 보스 페이즈 ---------- */
function bossPhaseTick(e){
  const P=BOSS_PHASES[e.name];if(!P||e.decoy||e.dead)return false;
  if(e.phase==null){e.phase=0;e.seqI=0}
  const nx=P[e.phase+1];
  if(nx&&e.hp<=e.maxhp*nx.hp&&e.state!=='down'&&e.state!=='skill'){e.phase++;enterPhase(e,nx);return true}
  return false;
}
function enterPhase(e,ph){
  const w=Wd;
  e.state='phase';e.t=0;e.inv=Math.max(e.inv,70);e.seqI=0;e.spCd=50;e.poise=0;e.enragedShown=true;
  w.phaseBanner={name:e.name,n:e.phase+1,line:ph.line||'',t:0};
  w.flashT=10;w.flashCol='255,60,40';
  switch(ph.enter){
    case'barrier':spawnTotems(e);break;
    case'mount':e.look=Object.assign({},e.def.look,{mount:'#b8321c'});e.spd=e.def.spd*1.3;
      for(let i=0;i<4;i++)w.fx.push({type:'smoke',x:e.x+rnd(-30,30),y:e.y,t:0,life:30});break;
    case'dismount':e.look=Object.assign({},e.def.look);e.spd=e.def.spd*1.15;
      for(let i=0;i<4;i++)w.fx.push({type:'smoke',x:e.x+rnd(-30,30),y:e.y,t:0,life:30});break;
    case'decoy':spawnDecoys(e);break;
  }
}
/* 페이즈 보스의 기술 선택 (정해진 순서 반복) */
function phasedSkill(e){
  const w=Wd,P=BOSS_PHASES[e.name],ph=P[e.phase||0],p=tgtOf(e)||w.ps[0];
  let sk=ph.seq[(e.seqI++)%ph.seq.length];
  e.state='skill';e.t=0;e.hitIds=new Set();e.landed=false;
  const U=BOSS_ULT[e.name];
  if(sk==='ult'&&U){e.skill='ult';e.ult=U;e.inv=Math.max(e.inv,30);
    w.cutin={t:0,dur:50,boss:true,h:{fx:U.col,name:e.name,zi:'—',spName:U.n},look:e.look,name:U.n,hz:U.hz,sub:`${e.name} 필살기`,col:U.col};
    w.cine={t:0,dur:50+90,col:U.col};sfx('cutin');sfx('boss');setTimeout(()=>say(U.n+'!',VPROF.boss),300);
    e.spCd=(230+rnd(0,60))/D().aggr;return}
  if(sk==='ult')sk='wave';
  e.skill=sk;
  kiai(VPROF.boss,sk==='bolt'||sk==='orb'||sk==='pray'||sk==='illusion'?'cast':'big');
  sfx({dash:'dash',bolt:'magic',orb:'magic',slam:'jump',summon:'gong',wave:'wind',pray:'magic',charge3:'dash',grab:'roar',lanes:'gong',roar:'roar',decoy:'magic',counter:'slash',illusion:'magic'}[sk]||'swing');
  const late=(e.phase||0)>0;e.spCd=((late?160:240)+rnd(0,60))/D().aggr;
  /* 예고 */
  if(sk==='dash'&&p)tele({type:'lane',y:p.y,x:e.x,dir:p.x>e.x?1:-1,life:32,col:'255,80,50'});
  if(sk==='slam'&&p)tele({type:'circle',x:p.x,y:p.y,r:150,life:62,col:'255,150,60'});
}
/* 새 보스 기술 */
function bossSkillX(e,p){
  const w=Wd,t=e.t;
  switch(e.skill){
    case'pray':
      if(t===1){e.prayHp=e.hp;txtFx(e.x,e.y,170,'태평 기도… (공격해서 끊어라!)','#ffe070',18,90);tele({type:'circle',x:e.x,y:e.y,r:100,life:150,col:'255,220,80',follow:e})}
      if(t%6===0&&t<150){e.hp=Math.min(e.maxhp,e.hp+e.maxhp*.004);emit({x:e.x+rnd(-40,40),y:e.y,z:rnd(0,40),vz:rnd(1.5,3),col:'#ffe070',size:8,life:26,type:'sq'})}
      if(e.prayHp-e.hp>e.maxhp*.06){e.state='stun';e.t=0;e.stunLen=110;txtFx(e.x,e.y,170,'기도 중단!','#ffffff',24,60);sfx('break');return}
      if(t>=150)e.state='idle';break;
    case'charge3':{
      const seg=90,k=Math.floor(t/seg),lt=t%seg;
      if(k>=3){e.state='idle';break}
      if(lt===0){const ps=alivePs(),q=ps[(Math.random()*ps.length)|0]||p;e.hitIds=new Set();
        if(k===0){e.chDir=q.x>e.x?1:-1}else{e.chDir*=-1;e.x=e.chDir>0?w.camX-60:w.camX+W+60}
        e.chY=q.y;e.y=k===0?e.y:q.y;e.facing=e.chDir;
        tele({type:'lane',y:e.chY,x:e.chDir>0?Math.max(e.x,w.camX):Math.min(e.x,w.camX+W),dir:e.chDir,life:28,col:'255,50,40'})}
      if(lt<28){e.y+=(e.chY-e.y)*.15;e.flash=(lt%6<3)?2:0;break}
      if(lt===28)sfx('dash');
      e.x+=e.chDir*17;e.y+=(e.chY-e.y)*.2;
      for(const q of w.ps)if(!e.hitIds.has(q)&&hittable(q)&&Math.abs(q.x-e.x)<80&&Math.abs(q.y-e.y)<30&&q.z<50){e.hitIds.add(q);damage(e,q,Math.round(e.pow*1.5),true)}
      if(t%2===0)w.fx.push({type:'after',x:e.x,y:e.y,t:0,life:12,facing:e.facing,look:e.look,pose:poseOf(e),tint:'rgba(255,60,40,.5)',sc:1.95});
      if(t%3===0)emit({x:e.x-e.chDir*40,y:e.y,z:2,vz:rnd(.5,1.5),vx:-e.chDir*3,col:'#b8a080',size:16,life:24,type:'smoke',add:false});
      break}
    case'grab':{
      if(t===1){e.grabbed=null;tele({type:'mark',follow:e,life:28,col:'#ff3030',ch:'!'})}
      if(t<28){e.facing=p.x>e.x?1:-1;e.flash=(t%6<3)?2:0;break}
      if(!e.grabbed&&t<50){e.x+=e.facing*9;e.y+=(p.y-e.y)*.08;
        for(const q of w.ps)if(hittable(q)&&q.state!=='grabbed'&&q.state!=='special'&&Math.abs(q.x-e.x)<72&&Math.abs(q.y-e.y)<30&&q.z<40){
          e.grabbed=q;q.state='grabbed';q.t=0;q.grabBy=e;q.escape=0;e.t=50;sfx('hit','blunt',true);txtFx(q.x,q.y,150,'붙잡혔다! 공격 연타!','#ff6050',18,60);break}
        break}
      if(!e.grabbed){if(t>72)e.state='idle';break}
      const q=e.grabbed;
      if(q.dead||q.state!=='grabbed'){e.grabbed=null;e.state='idle';break}
      q.x=e.x+e.facing*44;q.y=e.y+1;q.z=40+Math.sin(t*.5)*4;q.facing=-e.facing;
      if(q.escape>=8){q.state='jump';q.vz=9;q.vx=-e.facing*4;q.jatk=false;q.t=0;q.grabBy=null;q.inv=40;e.grabbed=null;
        e.state='stun';e.t=0;e.stunLen=80;txtFx(q.x,q.y,140,'탈출!','#a0ffa0',22,50);sfx('ok');break}
      if(t>=50+100){q.state='idle';q.grabBy=null;q.z=0;e.grabbed=null;w.shake=26;sfx('boss');
        w.hz.push({x:e.x+e.facing*44,y:e.y,t:0,delay:1,r:90,owner:'e',kind:'slam',ground:true,dmg:0});
        damage(e,q,Math.round(e.pow*2.2),true);e.state='idle'}
      break}
    case'lanes':
      if(t===1){const ys=[GT+26,(GT+GB)/2,GB-14];e.lanes=ys.map((y,i)=>({y,dir:i%2?1:-1,d:i*14}));
        for(const L of e.lanes)tele({type:'lane',y:L.y,x:L.dir>0?w.camX-20:w.camX+W+20,dir:L.dir,life:52+L.d,col:'255,90,60'});
        txtFx(e.x,e.y,170,'"기병대, 돌격하라!"','#ffffff',20,70)}
      for(const L of e.lanes||[])if(t===52+L.d){w.proj.push({kind:'rider',x:L.dir>0?w.camX-100:w.camX+W+100,y:L.y,z:0,vx:L.dir*15,life:120,dmg:Math.round(e.pow*1.3),owner:'e',knock:true,w:56,hit:new Set(),look:riderLook(e)});sfx('dash')}
      if(t>52+28+80)e.state='idle';break;
    case'roar':
      if(t===1){txtFx(e.x,e.y,180,e.def&&e.def.roarLine||'"요래요래(遼來遼來)!"','#a8c8ff',26,70);tele({type:'circle',x:e.x,y:e.y,r:300,life:20,col:'120,150,255',follow:e})}
      if(t===20){w.fx.push({type:'ring',x:e.x,y:e.y,t:0,life:30,r:300,col:'#6a9aff'});w.shake=16;sfx('roar');
        for(const q of alivePs())if(Math.abs(q.x-e.x)<300&&Math.abs(q.y-e.y)<120&&q.z<25&&q.inv<=0&&q.state!=='special'&&q.state!=='grabbed'){q.state='fear';q.t=0;q.fearT=80;txtFx(q.x,q.y,140,'공포!','#b0a0ff',20,50)}}
      if(t>40)e.state='idle';break;
    case'decoy':if(t===12)spawnDecoys(e);if(t>40)e.state='idle';break;
    case'counter':
      if(t===1){txtFx(e.x,e.y,160,'반격 태세','#a8e0ff',18,50);tele({type:'mark',follow:e,life:56,col:'#8ad8ff',ch:'⚔'})}
      e.flash=(t%10<2)?2:0;if(t>=56)e.state='idle';break;
    case'illusion':
      if(t===1){w.fx.push({type:'smoke',x:e.x,y:e.y,t:0,life:30});e.x=clamp(p.x+(Math.random()<.5?-260:260),w.camX+80,w.camX+W-80);w.fx.push({type:'smoke',x:e.x,y:e.y,t:0,life:30})}
      if(t===8){e.ill=[[p.x-230,p.y],[p.x+230,p.y],[p.x,p.y-90<GT+5?p.y+90:p.y-90]].map(s=>[clamp(s[0],w.camX+40,w.camX+W-40),clamp(s[1],GT+5,GB)]);
        for(const s of e.ill)tele({type:'mark',x:s[0],y:s[1],life:34,col:'#c070ff',ch:'幻'})}
      if(t===42)for(const s of e.ill||[]){const d=Math.sign(p.x-s[0])||1;for(let i=-1;i<=1;i++)w.proj.push({kind:'orb',x:s[0],y:s[1],z:60,vx:d*5.5,vy:i*.7,life:150,dmg:e.pow,owner:'e',knock:true,w:24,hit:new Set()})}
      if(t>70){e.ill=null;e.state='idle'}break;
    case'volley':
      if(t===1)txtFx(e.x,e.y,180,'"궁수대, 쏘아라!"','#c8e8ff',20,60);
      if(t>=12&&t<=60&&t%8===4)for(const q of alivePs())for(let k=0;k<2;k++)w.hz.push({x:clamp(q.x+rnd(-70,70),w.camX+30,w.camX+W-30),y:clamp(q.y+rnd(-24,24),GT+5,GB),t:0,delay:40,r:52,owner:'e',kind:'arrow',dmg:Math.round(e.pow*.9)});
      if(t>100)e.state='idle';break;
    default:e.state='idle';
  }
}
/* 확장 필살기: 질풍만시 (화살 폭우) */
function bossUltX(e,p){
  const w=Wd,t=e.t,ps=alivePs();
  if(e.ult&&e.ult.ty==='arrows'){
    if(t>=10&&t<=90&&t%6===4){for(const q of ps)w.hz.push({x:clamp(q.x+rnd(-40,40),w.camX+30,w.camX+W-30),y:clamp(q.y+rnd(-20,20),GT+5,GB),t:0,delay:36,r:56,owner:'e',kind:'arrow',dmg:Math.round(e.pow*1.1)});
      for(let k=0;k<3;k++)w.hz.push({x:w.camX+rnd(40,W-40),y:rnd(GT+10,GB-5),t:0,delay:36,r:56,owner:'e',kind:'arrow',dmg:Math.round(e.pow)})}
    if(t>130)e.state='idle';return}
  e.state='idle';
}
/* 하후은 반격: 반격 태세 중 맞으면 피해를 무시하고 되받아친다 */
function counterStrike(e,a){
  const w=Wd;e.state='idle';e.inv=24;e.cd=40;
  txtFx(e.x,e.y,170,'반격!','#ffffff',26,50);sfx('slash');w.flashT=6;w.flashCol='160,220,255';hitstop=Math.max(hitstop,8);
  w.fx.push({type:'slashX',x:e.x+e.facing*60,y:e.y,z:60,t:0,life:14,ang:-.4*e.facing,len:260,col:'#a8e0ff'});
  const tx=a&&a.x!=null?a.x:e.x+e.facing*60;e.facing=tx>e.x?1:-1;
  for(const q of w.ps)if(hittable(q)&&Math.abs(q.x-e.x)<170&&Math.abs(q.y-e.y)<44)damage(e,q,Math.round(e.pow*1.8),true);
}
function riderLook(e){const f=FAC.wei;return Object.assign({},f,{hat:'helm2',armor:'plate',body:shade(f.body,-20),cape:'#1a2a5a',weapon:'spear',mount:'#d8d2c4'})}
function spawnDecoys(e){
  const w=Wd,alive=w.enemies.filter(o=>o.decoy&&!o.dead).length;
  for(let i=alive;i<2;i++){w.enemies.push(mkEnt({lv:e.lv,x:e.x,y:e.y,hp:1,maxhp:1,pow:Math.round(e.pow*.6),spd:e.spd*1.05,reach:e.reach,look:e.look,decoy:true,name:e.name,exp:0,score:0,cd:rnd(40,90),yoff:rnd(-8,8),facing:e.facing}))}
  const all=[e,...w.enemies.filter(o=>o.decoy&&!o.dead)];
  const spots=all.map((_,i)=>[w.camX+W*(.22+.28*i)+rnd(-30,30),rnd(GT+30,GB-20)]).sort(()=>Math.random()-.5);
  all.forEach((o,i)=>{w.fx.push({type:'smoke',x:o.x,y:o.y,t:0,life:30});o.x=spots[i][0];o.y=spots[i][1];w.fx.push({type:'smoke',x:o.x,y:o.y,t:0,life:30})});
  txtFx(e.x,e.y,170,'어느 것이 진짜인가?','#e0d0ff',20,60);
}
/* 장각 결계: 부적 기둥을 모두 부숴야 결계가 풀린다 */
function spawnTotems(e){
  const w=Wd;e.barrier=true;e.totems=[];
  for(let i=0;i<3;i++){const pr={kind:'totem',x:w.camX+W*(.18+.32*i)+rnd(-20,20),y:i===1?GT+22:GB-26,hp:5,maxhp:5,owner:e};w.props.push(pr);e.totems.push(pr)}
  showMsg('결계 발동! 부적 기둥 3개를 부숴라!','',false);
}
function hitTotem(pr){
  const w=Wd;pr.hp--;pr.shake=10;sfx('break');burst(pr.x,pr.y,70,'#e8c020',8,6);
  if(pr.hp>0)return;
  pr.broken=true;for(let i=0;i<10;i++)w.fx.push({type:'debris',x:pr.x,y:pr.y,z:30,vx:rnd(-4,4),vz:rnd(3,8),t:0,life:40,col:i%2?'#e8c020':'#5a3a1a'});
  const e=pr.owner;
  if(e&&e.totems.every(t=>t.broken)){e.barrier=false;showMsg('결계 붕괴! 지금이 기회다!','',false);w.flashT=10;w.flashCol='255,230,120';
    if(!e.dead&&e.state!=='down'){e.state='stun';e.t=0;e.stunLen=130;e.grabbed=null}}
}

/* ---------- 플레이어 상태이상: 잡힘 · 공포 ---------- */
function updPlayerCC(p,i,K,spd){
  if(p.state==='grabbed'){
    if(phit(i,'atk')||phit(i,'jump')||phit(i,'sp')){p.escape=(p.escape||0)+1;p.flash=3;burst(p.x,p.y,70,'#ffffff',3,4,{type:'spark',size:2,life:8})}
    const g=p.grabBy;if(!g||g.dead||g.state!=='skill'||g.grabbed!==p){p.state='idle';p.z=0;p.grabBy=null}
    return}
  if(p.state==='fear'){
    const dx=(K.right?1:0)-(K.left?1:0),dy=(K.down?1:0)-(K.up?1:0);
    p.x+=dx*spd*.5;p.y+=dy*spd*.35;if(dx)p.facing=dx;
    if(p.t%8===0)emit({x:p.x+rnd(-14,14),y:p.y,z:rnd(90,120),vz:.8,col:'#b0a0ff',size:6,life:20,type:'sq'});
    if(p.t>=(p.fearT||70))p.state='idle'}
}

/* ---------- 포즈 보정 (도주 · 돌격 · 기마 · 방패 · 경직) ---------- */
const _poseOfBt=poseOf;
poseOf=function(e){
  const st=e.state;let as=st;
  if(st==='flee'||(st==='charge'&&e.t>=44))as='run';
  else if(st==='charge'||st==='phase')as='skill';
  else if(st==='stun'||st==='grabbed'||st==='fear')as='hurt';
  e.state=as;const p=_poseOfBt(e);e.state=st;
  if(st==='stun'){p.head=.3+Math.sin((e.anim||0)*.15)*.25;p.lean=-.15}
  if(e.guardBrk>0)p.noShield=1;
  if(e.look&&e.look.weapon==='baby'){p.armL=-1.1;p.wAng=-1.4;p.armR=-1.0}
  if(e.look&&e.look.weapon==='flag'&&(as==='idle'||as==='walk')){p.armL=-1.15;p.wAng=-Math.PI+.12+Math.sin((e.anim||0)*.08)*.06}
  if(e.look&&e.look.mount){const moving=st==='walk'||as==='run'||(st==='skill'&&(e.skill==='charge3'||e.skill==='dash'));
    p.gallop=moving?(e.anim||0)*(st==='walk'?.22:.45):0;if(st==='charge'&&e.t<44)p.rear=Math.min(1,e.t/12)}
  return p;
};

/* ---------- 그리기 ---------- */
function drawBattleUnder(cx){
  const w=Wd;
  for(const z of TL()){
    const a=.5+.5*Math.sin(z.t*.5);
    if(z.type==='lane'){const y=z.y,x0=z.x-cx,x1=z.dir>0?W+40:-40,l=Math.min(x0,x1),r=Math.max(x0,x1);
      ctx.fillStyle=`rgba(${z.col},${.12+.14*a})`;ctx.fillRect(l,y-24,r-l,48);
      ctx.strokeStyle=`rgba(${z.col},${.6+.3*a})`;ctx.lineWidth=2;line(l,y-24,r,y-24);line(l,y+24,r,y+24);
      ctx.fillStyle=`rgba(255,240,220,${.35+.4*a})`;
      for(let x=x0+z.dir*((z.t*6)%60);z.dir>0?x<W:x>0;x+=z.dir*60){ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+z.dir*16,y);ctx.lineTo(x,y+12);ctx.lineTo(x+z.dir*6,y);ctx.closePath();ctx.fill()}}
    else if(z.type==='circle'){const X=(z.follow?z.follow.x:z.x)-cx,Y=z.follow?z.follow.y:z.y,k=z.t/z.life;
      ctx.fillStyle=`rgba(${z.col},${.1+.12*a})`;ell(X,Y,z.r,z.r*.4);
      ctx.strokeStyle=`rgba(${z.col},${.7})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(X,Y,z.r,z.r*.4,0,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.ellipse(X,Y,z.r*k,z.r*k*.4,0,0,Math.PI*2);ctx.stroke()}
  }
  /* 기수 · 사기 오라 */
  for(const e of w.enemies){if(e.dead)continue;
    if(e.banner){ctx.strokeStyle=`rgba(255,210,80,${.25+.15*Math.sin(w.t*.1)})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x-cx,e.y,250,70,0,0,Math.PI*2);ctx.stroke()}
    else if(e.rally>0){ctx.strokeStyle='rgba(255,200,60,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x-cx,e.y,26,8,0,0,Math.PI*2);ctx.stroke()}}
  /* 결계 기둥 → 장각 연결선 */
  const b=w.enemies.find(e=>e.barrier&&!e.dead);
  if(b)for(const pr of b.totems)if(!pr.broken){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(210,120,255,${.35+.25*Math.sin(w.t*.3)})`;ctx.lineWidth=3;
    line(pr.x-cx,pr.y-70,b.x-cx,b.y-90);ctx.globalCompositeOperation='source-over'}
}
function drawBattleOver(cx){
  const w=Wd;
  for(const z of TL())if(z.type==='mark'){const X=(z.follow?z.follow.x:z.x)-cx,Y=(z.follow?z.follow.y-z.follow.z:z.y)-(z.follow?(z.follow.boss?195:140):60);
    const s=1+.25*Math.sin(z.t*.6);ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr(z.col),X-36*s,Y-36*s,72*s,72*s);ctx.globalCompositeOperation='source-over';
    txt(z.ch||'!',X,Y,Math.round(34*s),'#ffffff','center',z.ch&&z.ch.length&&z.ch.charCodeAt(0)>0x3000?HANJA:FONT,[z.col,5])}
  const fl=w.proj.find(o=>o.kind==='flood'&&o.lead);
  if(fl){const x=fl.x-cx,g=ctx.createLinearGradient(x-260,0,x+40,0);g.addColorStop(0,'rgba(40,90,170,0)');g.addColorStop(.6,'rgba(60,130,210,.55)');g.addColorStop(1,'rgba(200,235,255,.9)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x+40,GT-40);for(let yy=GT-40;yy<=GB+20;yy+=12)ctx.lineTo(x+40+Math.sin(yy*.08+w.t*.4)*14,yy);ctx.lineTo(x-260,GB+20);ctx.lineTo(x-260,GT-40);ctx.closePath();ctx.fill();
    for(let k=0;k<6;k++)emit({x:fl.x+rnd(-10,30),y:rnd(GT,GB),z:rnd(0,80),vz:rnd(1,4),vx:rnd(-3,1),col:k%2?'#e8f8ff':'#8ac8ff',size:rnd(3,6),life:rnd(14,24),type:'sq'})}
  for(const o of w.proj)if(o.kind==='rider'){ctx.globalAlpha=.9;renderModel(ctx,o.look,{gallop:w.t*.5,armL:-1.5,wAng:-1.55,ext:4,lean:.3,cape:1},o.x-cx,o.y,1.3,Math.sign(o.vx),{tint:'rgba(255,120,80,.25)'});ctx.globalAlpha=1;
    emit({x:o.x-Math.sign(o.vx)*40,y:o.y,z:2,vz:1,vx:-o.vx*.1,col:'#b8a080',size:14,life:20,type:'smoke',add:false})}
  for(const e of w.enemies){if(e.dead)continue;const sx=e.x-cx,top=e.y-e.z-(e.boss?180:118)*(e.look.scale||1);
    if(e.state==='stun'){for(let i=0;i<3;i++){const a=w.t*.12+i*2.1;txt('★',sx+Math.cos(a)*26,top+Math.sin(a)*8,16,'#ffe060','center',FONT,['#000',3])}
      if(e.boss)txt('그로기',sx,top-18,14,'#ffe060','center',FONT,['#000',4])}
    if(e.barrier){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.1*Math.sin(w.t*.2);ctx.drawImage(glowSpr('#b060ff'),sx-110,e.y-e.z-260,220,280);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle=`rgba(220,160,255,${.5+.2*Math.sin(w.t*.3)})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(sx,e.y-e.z-110,95,130,0,0,Math.PI*2);ctx.stroke()}
    if(e.skill==='illusion'&&e.state==='skill'&&e.ill&&e.t<42){ctx.globalAlpha=.45;for(const s of e.ill)renderModel(ctx,e.look,{armL:-2.6,wAng:-2.9,armR:-.5},s[0]-cx,s[1],1.95,s[0]<(tgtOf(e)||e).x?1:-1,{tint:'rgba(180,100,255,.5)'});ctx.globalAlpha=1}}
  for(const p of w.ps){if(p.out||p.dead)continue;const sx=p.x-cx,top=p.y-p.z-140;
    if(p.state==='grabbed'){const k=Math.min(1,(p.escape||0)/8);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(sx-40,top,80,10);ctx.fillStyle='#ffd040';ctx.fillRect(sx-38,top+2,76*k,6);
      if((w.t>>3)%2)txt('공격 연타!',sx,top-12,14,'#ffffff','center',FONT,['#a00',4])}
    if(p.state==='fear')txt('공포',sx,top+6,14,'#c8b8ff','center',FONT,['#302060',4])}
}
/* 보스 체력바 보조: 국면 구분선 · 경직 게이지 · 국면 전환 배너 */
function drawBattleHUD(){
  const w=Wd,b=w.enemies.find(e=>e.boss&&!e.dead);
  if(b){const P=BOSS_PHASES[b.name];
    if(P)for(let i=1;i<P.length;i++){const x=W/2-196+460*P[i].hp;ctx.fillStyle=i<=(b.phase||0)?'rgba(80,20,20,.9)':'#ffe8a0';ctx.fillRect(x-1,H-39,2,20)}
    if(b.poiseMax){ctx.fillStyle='#201008';ctx.fillRect(W/2-196,H-18,460,5);ctx.fillStyle=b.state==='stun'?'#ffffff':'#ffc040';ctx.fillRect(W/2-196,H-18,460*Math.min(1,b.poise/b.poiseMax)*(b.state==='stun'?0:1)+(b.state==='stun'?460:0),5)}
    if(b.barrier)txt('결계',W/2+272,H-28,14,'#e0b0ff','right',FONT,['#000',3])}
  const pb=w.phaseBanner;
  if(pb){const a=Math.min(1,pb.t/15,(150-pb.t)/30);ctx.globalAlpha=Math.max(0,a);
    const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(120,0,0,0)');g.addColorStop(.5,'rgba(140,10,10,.85)');g.addColorStop(1,'rgba(120,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,236,W,70);
    txt(`${pb.name} — 제${pb.n}국면`,W/2,256,26,'#ffe08a','center',FONT,['#300',6]);if(pb.line)txt(pb.line,W/2,288,16,'#ffffff','center',FONT,['#000',4]);
    ctx.globalAlpha=1}
}
/* 결계 부적 기둥 */
function drawTotem(pr,sx){
  const y=pr.y,sh=pr.shake>0?Math.sin(pr.shake*2)*3:0,x=sx+sh;
  ctx.fillStyle='rgba(0,0,0,.3)';ell(sx,y,22,6);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.15*Math.sin(frame*.15);ctx.drawImage(glowSpr('#b060ff'),x-40,y-120,80,130);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const g=ctx.createLinearGradient(x-8,0,x+8,0);g.addColorStop(0,'#3a2412');g.addColorStop(.5,'#7a5028');g.addColorStop(1,'#2a180a');
  ctx.fillStyle=g;ctx.fillRect(x-7,y-100,14,100);ctx.strokeStyle='#1a0e06';ctx.lineWidth=1.5;ctx.strokeRect(x-7,y-100,14,100);
  ctx.fillStyle='#e8c020';ctx.fillRect(x-10,y-104,20,6);
  ctx.fillStyle='#f4e070';ctx.fillRect(x-6,y-90,12,40);ctx.strokeStyle='#a01010';ctx.strokeRect(x-6,y-90,12,40);
  txt('勅',x,y-78,11,'#b01010','center',HANJA);txt('令',x,y-62,11,'#b01010','center',HANJA);
  for(let i=0;i<pr.maxhp;i++){ctx.fillStyle=i<pr.hp?'#d070ff':'#333';ctx.fillRect(x-14+i*6,y+6,5,4)}
}
