'use strict';
/* ===== 화려한 전투 이펙트 =====
   · 스킬 시전: 발밑 마법진 + 빛기둥 + 소용돌이 입자
   · 타격: 십자 섬광 · 방사형 빛줄기 · 충격파 (치명타 · 강타는 더 크게)
   · 필살기: 시전 중 화면 암전 + 후광 + 빛줄기, 원래 연출이 끝나면 약 1.2초의 「피날레」(연속 폭발 → 전체 대폭발) 추가
   · 컷인 · 연출 시간 연장 */
const VX=()=>Wd.vfx||(Wd.vfx=[]);
function vfx(o){o.t=0;const L=VX();if(L.length>180)L.shift();L.push(o);return o}
const vxA=(col,a)=>sdA(col,Math.max(0,Math.min(1,a)));

/* ---------- 생성 도우미 ---------- */
function vfxHit(x,y,z,col,big,crit){
  if(VX().length>150&&!big)return;
  vfx({k:'star',x,y,z,col,life:big?16:11,s:big?1.5:1});
  if(big){vfx({k:'flash',x,y,z,col,life:18,r:big?90:60,rot:Math.random()*6});vfx({k:'shock',x,y,col,life:18,r:120})}
  if(crit)vfx({k:'flash',x,y,z,col:'#fff2a0',life:14,r:70,rot:Math.random()*6});
}
function vfxCast(p,col){
  vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:46,r:92,spin:1});
  vfx({k:'pillar',x:p.x,y:p.y,f:p,col,life:30,w:46,h:240});
  vfx({k:'shock',x:p.x,y:p.y,col,life:22,r:150});
  for(let i=0;i<18;i++){const a=i/18*6.283;emit({x:p.x+Math.cos(a)*50,y:p.y+Math.sin(a)*14,z:rnd(0,20),vx:-Math.cos(a)*1.4,vz:rnd(2,5),col:i%3?col:'#ffffff',size:rnd(2,4),life:rnd(18,30),type:'sq'})}
}

/* ---------- 매 프레임 ---------- */
const _battleTickV=battleTick;
battleTick=function(){_battleTickV();const L=VX();for(const v of L)v.t++;Wd.vfx=L.filter(v=>v.t<v.life)};

/* ---------- 그리기 ---------- */
let VX_RUNES=null;
function vxRunes(){if(VX_RUNES)return VX_RUNES;VX_RUNES=[...'天地玄黃宇宙洪荒日月'].map(ch=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.fillStyle='#ffffff';g.font=`bold 52px ${HANJA}`;g.textAlign='center';g.textBaseline='middle';g.fillText(ch,32,34);return c});return VX_RUNES}
function vxCircle(v,cx){
  const k=v.t/v.life,a=Math.min(1,v.t/6,(v.life-v.t)/10),x=(v.f?v.f.x:v.x)-cx,y=v.f?v.f.y:v.y,r=v.r*(.7+.3*Math.min(1,v.t/8)),rot=v.t*.05*(v.spin||1);
  ctx.save();ctx.translate(x,y);ctx.scale(1,.36);ctx.globalCompositeOperation='lighter';
  const gr=ctx.createRadialGradient(0,0,r*.2,0,0,r);gr.addColorStop(0,vxA(v.col,.25*a));gr.addColorStop(1,vxA(v.col,0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  ctx.strokeStyle=vxA(v.col,.9*a);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,0,r*.8,0,7);ctx.stroke();
  ctx.strokeStyle=vxA('#ffffff',.6*a);ctx.lineWidth=1.2;ctx.beginPath();for(let i=0;i<=6;i++){const an=rot+i*2*Math.PI/3*1.5;ctx.lineTo(Math.cos(an)*r*.78,Math.sin(an)*r*.78)}ctx.stroke();
  ctx.beginPath();for(let i=0;i<=6;i++){const an=-rot+Math.PI/6+i*2*Math.PI/3*1.5;ctx.lineTo(Math.cos(an)*r*.78,Math.sin(an)*r*.78)}ctx.stroke();
  ctx.globalAlpha=.85*a;const RC=vxRunes();for(let i=0;i<10;i++){const an=rot*.6+i/10*6.283,sz=r*.2;ctx.save();ctx.translate(Math.cos(an)*r*.9,Math.sin(an)*r*.9);ctx.rotate(an+Math.PI/2);ctx.drawImage(RC[i],-sz/2,-sz/2,sz,sz);ctx.restore()}ctx.globalAlpha=1;
  ctx.restore();ctx.globalCompositeOperation='source-over';
}
function vxPillar(v,cx){
  const a=Math.min(1,v.t/4,(v.life-v.t)/12),x=(v.f?v.f.x:v.x)-cx,y=v.f?v.f.y:v.y,w=v.w*(1-v.t/v.life*.5),h=v.h;
  ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(x-w/2,0,x+w/2,0);g.addColorStop(0,vxA(v.col,0));g.addColorStop(.35,vxA(v.col,.45*a));g.addColorStop(.5,vxA('#ffffff',.8*a));g.addColorStop(.65,vxA(v.col,.45*a));g.addColorStop(1,vxA(v.col,0));
  ctx.fillStyle=g;ctx.fillRect(x-w/2,y-h*.7,w,h*.7);
  const g2=ctx.createLinearGradient(0,y-h,0,y-h*.7);g2.addColorStop(0,vxA(v.col,0));g2.addColorStop(1,vxA(v.col,.45*a));ctx.fillStyle=g2;ctx.fillRect(x-w*.3,y-h,w*.6,h*.3);
  ctx.globalCompositeOperation='source-over';
}
function vxFlash(v,cx){
  const k=v.t/v.life,a=1-k,x=v.x-cx,y=v.y-(v.z||0),r=v.r*(.5+k*.8);
  ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,vxA('#ffffff',.9*a));g.addColorStop(.3,vxA(v.col,.6*a));g.addColorStop(1,vxA(v.col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  ctx.rotate(v.rot+k*.6);for(let i=0;i<10;i++){const an=i/10*6.283,l=r*(1.3+(i%2)*.7);ctx.fillStyle=vxA(i%2?v.col:'#ffffff',.55*a);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(an-.05)*l,Math.sin(an-.05)*l);ctx.lineTo(Math.cos(an+.05)*l,Math.sin(an+.05)*l);ctx.closePath();ctx.fill()}
  ctx.restore();ctx.globalCompositeOperation='source-over';
}
function vxStar(v,cx){
  const k=v.t/v.life,a=1-k,x=v.x-cx,y=v.y-(v.z||0),s=(18+k*30)*v.s;
  ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
  for(const [w,l,c] of[[4,s,v.col],[1.6,s*1.3,'#ffffff']]){ctx.fillStyle=vxA(c,.9*a);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,-w);ctx.lineTo(l,0);ctx.lineTo(0,w);ctx.closePath();ctx.fill()}}
  ctx.rotate(Math.PI/4);ctx.fillStyle=vxA(v.col,.5*a);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(s*.55,0);ctx.lineTo(0,2);ctx.closePath();ctx.fill()}
  ctx.restore();ctx.globalCompositeOperation='source-over';
}
function vxShock(v,cx){
  const k=v.t/v.life,a=1-k,x=v.x-cx,y=v.y,r=v.r*(.2+k);
  ctx.globalCompositeOperation='lighter';ctx.strokeStyle=vxA(v.col,.8*a);ctx.lineWidth=10*a+2;ctx.beginPath();ctx.ellipse(x,y,r,r*.34,0,0,7);ctx.stroke();
  ctx.strokeStyle=vxA('#ffffff',.6*a);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r*.92,r*.31,0,0,7);ctx.stroke();ctx.globalCompositeOperation='source-over';
}
/* 필살기 배경: 화면 암전 + 후광 + 빛줄기 */
function vxSpecialBack(cx){
  const w=Wd,ps=w.ps.filter(p=>!p.out&&!p.dead&&p.state==='special');if(!ps.length){w.spDim=Math.max(0,(w.spDim||0)-.06);}
  else w.spDim=Math.min(1,(w.spDim||0)+.08);
  if(!(w.spDim>0))return;
  ctx.fillStyle=`rgba(8,4,20,${.42*w.spDim})`;ctx.fillRect(0,0,W,H);
  for(const p of ps){const M=p.mysp&&MYTH_SP[p.mysp],col=M?M.col:p.h.fx,x=p.x-cx,y=p.y-80;ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
    ctx.rotate(frame*.01);for(let i=0;i<16;i++){ctx.rotate(Math.PI/8);ctx.fillStyle=vxA(i%2?col:'#ffffff',.08*w.spDim);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(900,-40);ctx.lineTo(900,40);ctx.closePath();ctx.fill()}
    ctx.restore();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55*w.spDim;ctx.drawImage(glowSpr(col),x-150,y-150,300,300);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
}
const _drawBattleUnderV=drawBattleUnder;
drawBattleUnder=function(cx){vxSpecialBack(cx);_drawBattleUnderV(cx);for(const v of VX())if(v.k==='circle')vxCircle(v,cx);else if(v.k==='shock')vxShock(v,cx)};
const _drawBattleOverV=drawBattleOver;
drawBattleOver=function(cx){_drawBattleOverV(cx);for(const v of VX())if(v.k==='pillar')vxPillar(v,cx);else if(v.k==='flash')vxFlash(v,cx);else if(v.k==='star')vxStar(v,cx)};

/* ---------- 타격 · 시전 연결 ---------- */
const _damageV=damage;
damage=function(a,t,dmg,knock,opt){
  const hp0=t.hp,r=_damageV(a,t,dmg,knock,opt);
  if(r&&!(opt&&opt.dot)&&!t.isPlayer&&t.hp<hp0){const own=ownerOf(a);if(own&&own.ps){const col=own.h?own.h.fx:'#ffe0a0',dir=a.x<t.x?1:-1;vfxHit(t.x-dir*8,t.y,t.z+60,col,!!knock,false)}}
  return r;
};
const _tryCastV=tryCastSkill;
tryCastSkill=function(p,slot){
  const was=p.state;_tryCastV(p,slot);
  if(p.state==='pskill'&&was!=='pskill'){const id=p.ps.rpg.hot[slot],s=id&&SKILLS[id];vfxCast(p,s?skCol(s,p.ps):p.h.fx);
    if(s&&s.ti>=3){Wd.flashT=Math.max(Wd.flashT,5);Wd.flashCol='255,255,255'}}
};

/* ---------- 필살기: 컷인 연장 · 시전 중 연출 · 피날레 ---------- */
const _doSpecialV=doSpecial;
doSpecial=function(p,myth){
  const was=p.state;_doSpecialV(p,myth);
  if(p.state==='special'&&was!=='special'){p.spFin=null;
    if(Wd.cutin)Wd.cutin.dur=Math.max(Wd.cutin.dur,80);if(Wd.cine)Wd.cine.dur+=80;
    const M=p.mysp&&MYTH_SP[p.mysp],col=M?M.col:p.h.fx;
    vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:150,r:170,spin:1.6});vfx({k:'circle',x:p.x,y:p.y,f:p,col:'#ffffff',life:150,r:110,spin:-2.2});
    vfx({k:'pillar',x:p.x,y:p.y,f:p,col,life:60,w:90,h:420})}
};
function spAura(p){
  const M=p.mysp&&MYTH_SP[p.mysp],col=M?M.col:p.h.fx;
  if(p.t%2===0)for(let i=0;i<3;i++){const a=p.t*.3+i*2.1,r=60+Math.sin(p.t*.1+i)*20;emit({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.3,z:rnd(0,40),vx:-Math.sin(a)*2,vz:rnd(2,5),col:i?col:'#ffffff',size:rnd(2,5),life:rnd(18,30),type:'sq'})}
  if(p.t%12===0)vfx({k:'shock',x:p.x,y:p.y,col,life:22,r:220});
}
function spFinale(p){
  const w=Wd,t=p.spFin++,M=p.mysp&&MYTH_SP[p.mysp],col=M?M.col:p.h.fx,hz=(M?M.hz:HERO_SP_HZ[p.h.id])||'必殺';
  p.inv=Math.max(p.inv,12);
  const foes=w.enemies.filter(e=>!e.dead&&onScreen(e,20));
  if(t===0){w.fx.push({type:'bigtext',x:p.x+p.facing*140,y:p.y,z:200,t:0,life:86,txt:hz.slice(0,4),col:'#fff8e0',stroke:shade(col,-120),size:66});
    vfx({k:'circle',x:p.x+p.facing*160,y:p.y,col,life:80,r:300,spin:-1.2});w.flashT=6;w.flashCol='255,255,255';sfx('cutin')}
  if(t>=6&&t<=46&&t%8===6){const e=foes.length?foes[(t/8|0)%foes.length]:null,x=e?e.x:p.x+p.facing*rnd(100,380),y=e?e.y:clamp(p.y+rnd(-50,50),GT+5,GB);
    vfx({k:'flash',x,y,z:60,col,life:22,r:130,rot:Math.random()*6});vfx({k:'shock',x,y,col,life:24,r:200});vfx({k:'pillar',x,y,col,life:20,w:60,h:320});
    burst(x,y,60,col,16,10);burst(x,y,60,'#ffffff',6,7,{type:'spark',size:3,life:14});sfx(t%16===6?'bomb':'slash');w.shake=Math.max(w.shake,10);
    for(const q of w.enemies)if(!q.dead&&hittable(q)&&Math.abs(q.x-x)<120&&Math.abs(q.y-y)<50)damage(p,q,spDmg(p,6),false,{stun:18})}
  if(t===56){w.flashT=16;w.flashCol=(()=>{const c=hexRGB(col);return c.join(',')})();w.shake=34;sfx('boss');sfx('bomb');
    for(let i=0;i<4;i++)w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:30+i*8,delay:i*5,r:720,col});
    vfx({k:'flash',x:p.x+p.facing*200,y:p.y,z:80,col,life:30,r:420,rot:0});vfx({k:'flash',x:p.x+p.facing*200,y:p.y,z:80,col:'#ffffff',life:22,r:260,rot:1});
    for(const q of w.enemies)if(!q.dead&&onScreen(q,20))damage(p,q,spDmg(p,14),true)}
  if(t>=76){p.state='idle';p.spFin=null;p.t=0}
}
const _updSpecialV=updSpecial;
updSpecial=function(p){if(p.spFin!=null){spFinale(p);return}_updSpecialV(p);spAura(p);if(p.state!=='special'&&!p.dead){p.state='special';p.spFin=0}};
const _updMythV=updMythSp;
updMythSp=function(p){if(p.spFin!=null){spFinale(p);return}_updMythV(p);spAura(p);if(p.state!=='special'&&!p.dead){p.state='special';p.spFin=0}};
/* 피날레 자세: 무기를 치켜든다 */
const _poseOfV=poseOf;
poseOf=function(e){
  if(e&&e.spFin!=null&&e.state==='special'){const st=e.state;e.state='win';const p=_poseOfV(e);e.state=st;p.bob=Math.sin(Math.min(1,e.spFin/20)*Math.PI/2)*4;p.cape=1;return p}
  return _poseOfV(e);
};

/* ===== 기본 기술 · 스킬 이펙트 =====
   · 연속기 1~3타: 무기 궤적을 따라 검기(劍氣) 초승달 — 3타는 더 크고 충격파
   · 점프 공격 · 승천격 · 회전베기 · 돌진 공격 · 전용기(↓→)에도 각각 검기 · 빛줄기
   · 액티브 스킬: 종류(투사체 · 돌진 · 광역 · 낙하 · 연쇄 · 회전 · 도약 · 소환 · 강화)별 추가 연출 */
function vxArc(v,cx){
  const t=v.t-(v.delay||0);if(t<0)return;const k=t/v.dur;if(k>=1)return;
  const f=v.f,x=(f?f.x:v.x)-cx,y=(f?f.y-f.z:v.y)-v.z,a=1-k*k;
  const e=v.a0+(v.a1-v.a0)*Math.min(1,k*2.4),s=Math.max(v.a0,e-(v.span||1.7));
  ctx.save();ctx.translate(x,y);ctx.scale(v.dir,v.sy||.8);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const [w,c,al] of[[v.w,v.col,.28],[v.w*.5,v.col,.65],[v.w*.18,'#ffffff',.95]]){ctx.strokeStyle=vxA(c,al*a);ctx.lineWidth=w;ctx.beginPath();ctx.arc(0,0,v.r,s,e);ctx.stroke()}
  const tx=Math.cos(e)*v.r,ty=Math.sin(e)*v.r,gr=ctx.createRadialGradient(tx,ty,0,tx,ty,v.w*1.4);gr.addColorStop(0,vxA('#ffffff',.9*a));gr.addColorStop(1,vxA(v.col,0));ctx.fillStyle=gr;ctx.fillRect(tx-v.w*1.4,ty-v.w*1.4,v.w*2.8,v.w*2.8);
  ctx.restore();ctx.globalCompositeOperation='source-over';
}
function vxThrust(v,cx){
  const t=v.t-(v.delay||0);if(t<0)return;const k=t/v.dur;if(k>=1)return;
  const f=v.f,x=(f?f.x:v.x)-cx,y=(f?f.y-f.z:v.y)-v.z,a=1-k,len=v.len*Math.min(1,k*3);
  ctx.save();ctx.translate(x,y);ctx.scale(v.dir,1);ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(0,0,len,0);g.addColorStop(0,vxA(v.col,0));g.addColorStop(.7,vxA(v.col,.6*a));g.addColorStop(1,vxA('#ffffff',.95*a));
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-v.w/2);ctx.lineTo(len,-1);ctx.lineTo(len+v.w,0);ctx.lineTo(len,1);ctx.lineTo(0,v.w/2);ctx.closePath();ctx.fill();
  for(let i=0;i<4;i++){const yy=(i-1.5)*v.w*.9;ctx.strokeStyle=vxA(v.col,.4*a);ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(len*.2,yy);ctx.lineTo(len*.9,yy*.4);ctx.stroke()}
  ctx.restore();ctx.globalCompositeOperation='source-over';
}
const _vxShock0=vxShock;
vxShock=function(v,cx){if(v.delay&&v.t<v.delay)return;if(v.delay){const t=v.t;v.t-=v.delay;const L=v.life;v.life-=v.delay;_vxShock0(v,cx);v.t=t;v.life=L}else _vxShock0(v,cx)};
const _vxPillar0=vxPillar;
vxPillar=function(v,cx){if(v.delay&&v.t<v.delay)return;if(v.delay){const t=v.t,L=v.life;v.t-=v.delay;v.life-=v.delay;_vxPillar0(v,cx);v.t=t;v.life=L}else _vxPillar0(v,cx)};
const _drawBattleOverV2=drawBattleOver;
drawBattleOver=function(cx){_drawBattleOverV2(cx);for(const v of VX())if(v.k==='arc')vxArc(v,cx);else if(v.k==='thrust')vxThrust(v,cx)};

function arcFx(p,o){const d=o.delay||0,dur=o.dur||11;return vfx(Object.assign({k:'arc',f:p,x:p.x,y:p.y,dir:p.facing,z:58,col:pcol(p),r:62,w:16,a0:-1.8,a1:.9,delay:d,dur,life:d+dur},o))}
const pcol=p=>(p.ps&&p.ps.wfx&&p.ps.wfx.c)||p.look.wglow||p.h.fx;
function onMoveFx(p,st,cb){
  const col=pcol(p),f=p.facing,R=Math.max(60,p.reach*.95*aoeM(p));
  const sparks=(x,y,n)=>{for(let i=0;i<n;i++)emit({x,y,z:rnd(30,90),vx:f*rnd(1,5),vz:rnd(1,4),col:i%3?col:'#ffffff',size:rnd(2,4),life:rnd(12,22),type:'sq'})};
  switch(st){
    case'attack':{const mv=moveOf(p,'c'+cb),hit=mv&&mv.hits&&mv.hits[0],d=hit?Math.max(0,hit[0]-3):[4,3,8][cb-1]||4;
      const A=[[-2.1,.7],[-.6,.9],[-2.5,1.1]][cb-1]||[-2,.8];
      if(p.look.weapon==='bow'&&cb===3)break;
      arcFx(p,{a0:A[0],a1:A[1],r:R*(cb===3?1.1:.9),w:cb===3?24:15,delay:d,dur:cb===3?15:10,span:cb===2?2.2:1.7,sy:cb===2?.45:.8});
      if(cb===2)arcFx(p,{a0:A[0]+.3,a1:A[1]+.2,r:R*.7,w:9,delay:d+2,dur:9,col:'#ffffff',sy:.45});
      if(cb===3){vfx({k:'shock',x:p.x+f*R*.7,y:p.y,col,life:d+22,delay:d+6,r:170});vfx({k:'flash',x:p.x+f*R*.7,y:p.y,z:50,col,life:16,r:70,rot:0,delay:d+5});sparks(p.x+f*R*.6,p.y,10)}
      break}
    case'jump':arcFx(p,{a0:-1.4,a1:1.6,r:R*.8,w:16,delay:1,dur:10,z:30});break;
    case'dashatk':vfx({k:'thrust',f:p,x:p.x,y:p.y,z:58,dir:f,col,len:R*1.9,w:18,dur:16,life:18,delay:2});sparks(p.x+f*40,p.y,8);break;
    case'rise':arcFx(p,{a0:.8,a1:-2.2,r:R*.95,w:20,delay:2,dur:14});vfx({k:'pillar',x:p.x+f*45,y:p.y,col,life:26,w:60,h:260,delay:2});break;
    case'spin':for(let i=0;i<3;i++)arcFx(p,{a0:-Math.PI,a1:Math.PI,span:2.8,r:R*1.05,w:16,delay:i*8,dur:12,sy:.4,z:48});vfx({k:'shock',x:p.x,y:p.y,col,life:26,r:220,delay:4});break;
    case'cmd':vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:40,r:90,spin:2});arcFx(p,{a0:-2.4,a1:1.2,r:R*1.2,w:26,delay:5,dur:16});
      vfx({k:'flash',x:p.x+f*R*.8,y:p.y,z:60,col,life:20,r:110,rot:0,delay:8});vfx({k:'shock',x:p.x+f*R*.8,y:p.y,col,life:30,r:200,delay:9});Wd.flashT=Math.max(Wd.flashT,3);break;
  }
}
function skillFx(p,s){
  const col=skCol(s,p.ps),f=p.facing,x=p.x+f*90;
  switch(s.ty){
    case'proj':vfx({k:'flash',x:p.x+f*40,y:p.y,z:60,col,life:18,r:90,rot:0,delay:6});vfx({k:'thrust',f:p,x:p.x,y:p.y,z:60,dir:f,col,len:260,w:22,dur:14,life:20,delay:6});break;
    case'dash':vfx({k:'thrust',f:p,x:p.x,y:p.y,z:55,dir:f,col,len:320,w:30,dur:18,life:20,delay:2});arcFx(p,{a0:-1.6,a1:1,r:90,w:22,delay:4,dur:14,col});break;
    case'nova':case'quake':case'leap':for(let i=0;i<3;i++)vfx({k:'shock',x:s.ty==='nova'?p.x:x,y:p.y,col,life:26+i*6,delay:6+i*6,r:260+i*60});vfx({k:'flash',x:s.ty==='nova'?p.x:x,y:p.y,z:40,col,life:24,r:160,rot:0,delay:8});break;
    case'rain':case'chain':for(let i=0;i<5;i++)vfx({k:'pillar',x:p.x+f*(80+i*70),y:clamp(p.y+rnd(-40,40),GT+5,GB),col,life:22,w:34,h:380,delay:6+i*4});break;
    case'whirl':for(let i=0;i<4;i++)arcFx(p,{a0:-Math.PI,a1:Math.PI,span:3,r:110+i*10,w:18,delay:4+i*10,dur:14,sy:.38,z:44,col});break;
    case'summon':for(const d of[-1,1])vfx({k:'pillar',x:p.x+d*70,y:p.y,col,life:34,w:70,h:320,delay:6});break;
    case'buff':vfx({k:'circle',x:p.x,y:p.y,f:p,col,life:60,r:130,spin:-1.5});vfx({k:'pillar',x:p.x,y:p.y,f:p,col,life:40,w:110,h:360,delay:2});
      for(let i=0;i<24;i++)emit({x:p.x+rnd(-40,40),y:p.y,z:rnd(0,40),vz:rnd(3,7),col:i%3?col:'#ffffff',size:rnd(2,5),life:rnd(24,40),type:'sq'});break;
  }
}
const _battleTickV2=battleTick;
battleTick=function(){_battleTickV2();
  for(const p of Wd.ps){if(p.out||p.dead)continue;const st=p.state,key=st+'|'+(st==='attack'?p.combo:'')+'|'+(st==='jump'&&p.jatk?1:0);
    if(key!==p._vk){p._vk=key;if(st!=='jump'||p.jatk)onMoveFx(p,st,p.combo)}}
};
const _tryCastV2=tryCastSkill;
tryCastSkill=function(p,slot){const was=p.state;_tryCastV2(p,slot);if(p.state==='pskill'&&was!=='pskill'){const id=p.ps.rpg.hot[slot];if(id&&SKILLS[id])skillFx(p,SKILLS[id])}};
const _vxFlash0=vxFlash;
vxFlash=function(v,cx){if(v.delay&&v.t<v.delay)return;if(v.delay){const t=v.t,L=v.life;v.t-=v.delay;v.life-=v.delay;_vxFlash0(v,cx);v.t=t;v.life=L}else _vxFlash0(v,cx)};
