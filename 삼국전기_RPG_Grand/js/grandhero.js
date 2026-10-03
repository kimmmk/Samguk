'use strict';
/* ===== 그랑풍: 무장별 고유 기술 · 필살기 연출 =====
   · 무장마다 KIT(색 · 커맨드 이름 · 동작 · 타격 연출 · 지면 연출 · 필살기 피날레 · 피날레 자세)를 둔다.
   · 커맨드 기술(↓↓ · ←→ · ↑↓)은 이름 · 동작 · 연출이 무장별로 다르다 (돌진 / 축지 / 회전 / 백스텝 연사, 도약 / 제자리 시전 / 공중 사격).
   · 필살기는 본래 기술 뒤에 붙던 공통 피날레 대신 무장 고유 피날레(80프레임)를 쓴다.
   · 액티브 스킬은 무기에 맞는 시전 동작 + 무장 고유 타격 연출.
   · 스킬 미리보기도 같은 KIT 로 시연한다. */
let GP_KIT=null,GP_F=1;
const gv=(add,o)=>gpV(add,o);

/* ================= 새 이펙트 ================= */
const GH_DRAW={
  dragon(v,cx,t){
    const k=t/v.dur,hd=Math.min(1,k*1.7),tl=Math.max(0,hd-.6),a=k>.75?(1-k)/.25:1,N=26;
    const sx=v.x0-cx,sy=v.y0-v.z0,ex=v.x1-cx,ey=v.y1-v.z1,dx=ex-sx,dy=ey-sy,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
    const P=s=>{const w=Math.sin(s*Math.PI*2.5-t*.3)*v.amp*Math.sin(Math.PI*Math.min(1,s*1.2));return[sx+dx*s+nx*w,sy+dy*s+ny*w]};
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(const [m,c,al] of[[2.4,v.col,.22],[1,v.col,.75],[.35,'#ffffff',.95]]){ctx.strokeStyle=vxA(c,al*a);
      for(let i=0;i<N;i++){const q0=P(tl+(hd-tl)*i/N),q1=P(tl+(hd-tl)*(i+1)/N);ctx.lineWidth=v.w*m*(.25+.75*i/N);ctx.beginPath();ctx.moveTo(q0[0],q0[1]);ctx.lineTo(q1[0],q1[1]);ctx.stroke()}}
    const h=P(hd),h2=P(Math.max(0,hd-.03)),an=Math.atan2(h[1]-h2[1],h[0]-h2[0]);
    ctx.globalAlpha=a;ctx.drawImage(glowSpr(v.col),h[0]-v.w*3,h[1]-v.w*3,v.w*6,v.w*6);
    ctx.strokeStyle=vxA('#ffffff',.9*a);ctx.lineWidth=2;for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(h[0],h[1]);ctx.lineTo(h[0]-Math.cos(an+s*.55)*v.w*1.8,h[1]-Math.sin(an+s*.55)*v.w*1.8);ctx.stroke()}
    ctx.restore();
  },
  moon(v,cx,t){
    const k=t/v.dur,s=k<.2?.5+k/.2*.5:1+(k-.2)*.15,a=k<.5?1:1-(k-.5)/.5,r=v.r;
    ctx.save();ctx.translate(v.x-cx,v.y-(v.z||0));ctx.rotate((v.ang||0)*(v.f||1));ctx.scale(s*(v.f||1),s*(v.sy||1));ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(0,0,r*.5,0,0,r);g.addColorStop(0,vxA(v.col,0));g.addColorStop(.8,vxA(v.col,.7*a));g.addColorStop(1,vxA('#ffffff',.95*a));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,-1.3,1.3);ctx.arc(-r*.28,0,r*.92,1.15,-1.15,true);ctx.closePath();ctx.fill();ctx.restore();
  },
  arrow(v,cx,t){
    const fly=v.dur*.45,k=Math.min(1,t/fly),a=t<fly?1:1-(t-fly)/(v.dur-fly);
    const X=s=>v.x0+(v.x1-v.x0)*s-cx,Y=s=>(v.y0+(v.y1-v.y0)*s)-(v.z0+(v.z1-v.z0)*s);
    const hx=X(k),hy=Y(k),tk=Math.max(0,k-.3),an=Math.atan2(Y(1)-Y(0),X(1)-X(0));
    if(t<fly){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
      for(const [w,c,al] of[[8,v.col,.3],[3,v.col,.8],[1.2,'#ffffff',1]]){ctx.strokeStyle=vxA(c,al);ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(X(tk),Y(tk));ctx.lineTo(hx,hy);ctx.stroke()}ctx.restore()}
    ctx.save();ctx.translate(hx,hy);ctx.rotate(an);ctx.globalAlpha=Math.max(0,a);ctx.strokeStyle='#5a3a1a';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(0,0);ctx.stroke();
    ctx.fillStyle='#e8e8f0';ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-4,-3.5);ctx.lineTo(-4,3.5);ctx.closePath();ctx.fill();
    ctx.fillStyle=v.col;ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(-32,-4);ctx.lineTo(-22,0);ctx.lineTo(-32,4);ctx.closePath();ctx.fill();ctx.restore();
  },
  fire(v,cx,t){
    const k=t/v.dur,gr=Math.min(1,t/6),fd=k<.6?1:1-(k-.6)/.4,H=v.h*gr*(.85+.15*Math.sin(t*.7)),x=v.x-cx,y=v.y;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fd;ctx.drawImage(glowSpr(v.col),x-v.w*1.2,y-v.w*.6,v.w*2.4,v.w*1.2);
    for(let i=0;i<6;i++){const ox=(i-2.5)*v.w*.16+Math.sin(t*.5+i*1.7)*4,h=H*(.55+.45*((i*37%10)/10)),w=v.w*.3;
      const g=ctx.createLinearGradient(0,y,0,y-h);g.addColorStop(0,'rgba(255,250,200,.95)');g.addColorStop(.35,vxA(v.col,.8));g.addColorStop(1,vxA(v.col,0));ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(x+ox-w,y);ctx.quadraticCurveTo(x+ox-w*1.1,y-h*.55,x+ox+Math.sin(t*.4+i)*10,y-h);ctx.quadraticCurveTo(x+ox+w*1.1,y-h*.55,x+ox+w,y);ctx.closePath();ctx.fill()}
    ctx.restore();
  },
  spike(v,cx,t){
    if(!v.sp){v.sp=[];for(let i=0;i<v.n;i++)v.sp.push({dx:rnd(-v.w,v.w),dy:rnd(-12,12),h:rnd(.55,1)*v.h,w:rnd(9,16)});v.sp.sort((a,b)=>a.dy-b.dy)}
    const k=t/v.dur,hh=Math.min(1,t/5)*(k>.7?1-(k-.7)/.3:1);
    for(const s of v.sp){const x=v.x-cx+s.dx,y=v.y+s.dy,h=s.h*hh;if(h<1)continue;
      ctx.fillStyle='#5a4430';ctx.beginPath();ctx.moveTo(x-s.w,y);ctx.lineTo(x+s.w*.15,y-h);ctx.lineTo(x+s.w,y);ctx.closePath();ctx.fill();
      ctx.fillStyle='#9a7a56';ctx.beginPath();ctx.moveTo(x-s.w*.2,y);ctx.lineTo(x+s.w*.15,y-h);ctx.lineTo(x+s.w,y);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#2a1a10';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x-s.w,y);ctx.lineTo(x+s.w*.15,y-h);ctx.lineTo(x+s.w,y);ctx.stroke();
      if(v.col&&k<.3){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.6*(1-k/.3);ctx.drawImage(glowSpr(v.col),x-s.w*2,y-h-10,s.w*4,h+20);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}}
  },
  tornado(v,cx,t){
    const a=Math.min(1,t/6,(v.dur-t)/10),x=v.x+(v.vx||0)*t-cx,y=v.y,H=v.h,N=14;
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<N;i++){const s=i/N,yy=y-s*H,rw=v.w*(.25+s*.95),off=Math.sin(t*.25+i*.8)*v.w*.15,st=(t*.4+i)%6.283;
      ctx.strokeStyle=vxA(i%3?v.col:'#ffffff',(.25+.45*(1-s))*a);ctx.lineWidth=3+4*(1-s);ctx.beginPath();ctx.ellipse(x+off,yy,rw,rw*.22,0,st,st+4.2);ctx.stroke()}
    ctx.globalAlpha=a*.5;ctx.drawImage(glowSpr(v.col),x-v.w,y-H*.6,v.w*2,H*.7);ctx.restore();
  },
  chain(v,cx,t){
    const k=t/v.dur,a=k<.7?1:1-(k-.7)/.3,gr=Math.min(1,t/4),x0=v.x0-cx,y0=v.y0-(v.z0||0),x1=v.x1-cx,y1=v.y1-(v.z1||0),dx=(x1-x0)*gr,dy=(y1-y0)*gr,L=Math.hypot(dx,dy),n=Math.max(2,L/12|0),an=Math.atan2(dy,dx);
    ctx.save();ctx.globalAlpha=a;ctx.lineWidth=2.4;
    for(let i=0;i<n;i++){const s=i/n,x=x0+dx*s,y=y0+dy*s+Math.sin(s*9+t)*3;ctx.strokeStyle=i%2?'#b8b8c8':'#e8e8f0';ctx.beginPath();ctx.ellipse(x,y,7,i%2?2:4,an,0,7);ctx.stroke()}
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=vxA(v.col,.85);ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(x0,y0);for(let i=1;i<=8;i++){const s=i/8;ctx.lineTo(x0+dx*s+rnd(-6,6),y0+dy*s+rnd(-6,6))}ctx.stroke();
    ctx.drawImage(glowSpr(v.col),x0+dx-14,y0+dy-14,28,28);ctx.restore();
  },
  petals(v,cx,t){
    if(!v.ps){v.ps=[];for(let i=0;i<v.n;i++)v.ps.push({a:rnd(0,6.283),r:rnd(0,v.sp*.4),z:rnd(0,v.zr||80),vr:rnd(1,3)*(v.out||1),va:rnd(.03,.09)*(v.sw||1),rot:rnd(0,6.28),vz:rnd(-.6,1),s:rnd(3.5,7),c:Math.random()<.7?v.col:'#ffffff'})}
    const a=Math.max(0,Math.min(1,(v.dur-t)/14));
    for(const q of v.ps){const r=q.r+q.vr*t,an=q.a+q.va*t,x=v.x-cx+Math.cos(an)*r,y=v.y+Math.sin(an)*r*.35-(v.z||0)-q.z-q.vz*t;
      ctx.save();ctx.translate(x,y);ctx.rotate(q.rot+t*.15);ctx.globalAlpha=a;ctx.fillStyle=q.c;ctx.beginPath();ctx.ellipse(0,0,q.s,q.s*.5,0,0,7);ctx.fill();ctx.restore()}
  },
  roar(v,cx,t){
    const x=v.x-cx,y=v.y-(v.z==null?60:v.z),f=v.f||1,M=v.r,c=f>0?0:Math.PI;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(let i=0;i<5;i++){const r=(t*14+i*M/5)%M,a=(1-r/M)*Math.min(1,(v.dur-t)/10);if(r<10)continue;
      ctx.strokeStyle=vxA(i%2?v.col:'#ffffff',.75*a);ctx.lineWidth=2+7*(1-r/M);ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,c-.75,c+.75);ctx.stroke()}
    ctx.restore();
  },
};
/* 지면 아래쪽에 그리는 것: 'crack' 종류에 sub 를 달아 기존 바닥 그리기 순서를 탄다 */
const GH_UNDER={
  octa(v,cx,t){
    const a=Math.min(1,t/8,(v.dur-t)/14),r=v.r*(.6+.4*Math.min(1,t/10)),rot=t*.02*(v.spin||1);
    ctx.save();ctx.translate(v.x-cx,v.y);ctx.scale(1,.36);ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=vxA(v.col,.16*a);ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
    ctx.strokeStyle=vxA(v.col,.9*a);ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<=8;i++){const an=rot+i/8*6.283+Math.PI/8;ctx.lineTo(Math.cos(an)*r,Math.sin(an)*r)}ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,r*.62,0,7);ctx.stroke();ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r*.3,0,7);ctx.stroke();
    ctx.globalAlpha=a;ctx.fillStyle='#ffffff';ctx.font=`bold ${Math.round(r*.16)}px ${HANJA}`;ctx.textAlign='center';ctx.textBaseline='middle';
    const TG='☰☱☲☳☴☵☶☷';for(let i=0;i<8;i++){const an=rot+i/8*6.283;ctx.save();ctx.translate(Math.cos(an)*r*.81,Math.sin(an)*r*.81);ctx.rotate(an+Math.PI/2);ctx.fillText(TG[i],0,0);ctx.restore()}
    ctx.restore();
  },
  fissure(v,cx,t){
    if(!v.pts){v.pts=[];const n=Math.max(4,Math.abs(v.x1-v.x0)/22|0);for(let i=0;i<=n;i++)v.pts.push([v.x0+(v.x1-v.x0)*i/n,v.y+(i&&i<n?rnd(-7,7):0)])}
    const k=t/v.dur,g=Math.min(1,t/(v.dur*.25)),a=k<.7?1:1-(k-.7)/.3,n=Math.max(2,Math.ceil(v.pts.length*g));
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';const path=()=>{ctx.beginPath();for(let i=0;i<n;i++)ctx.lineTo(v.pts[i][0]-cx,v.pts[i][1])};
    ctx.strokeStyle=`rgba(20,8,2,${.8*a})`;ctx.lineWidth=12;path();ctx.stroke();ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle=vxA(v.col,.9*a);ctx.lineWidth=5;path();ctx.stroke();ctx.strokeStyle=vxA('#ffffff',.8*a);ctx.lineWidth=1.6;path();ctx.stroke();ctx.restore();
  },
  moonbg(v,cx,t){
    const a=Math.min(1,t/12,(v.dur-t)/16),x=v.x-cx,y=v.y-(v.z||0);
    ctx.save();ctx.globalAlpha=a;ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr(v.col),x-v.r*2.2,y-v.r*2.2,v.r*4.4,v.r*4.4);ctx.globalCompositeOperation='source-over';
    const g=ctx.createRadialGradient(x-v.r*.3,y-v.r*.3,v.r*.1,x,y,v.r);g.addColorStop(0,'#fffef6');g.addColorStop(1,'#ffd8ec');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,v.r,0,7);ctx.fill();
    ctx.fillStyle='rgba(230,180,210,.35)';for(const [dx,dy,r] of[[-.3,-.1,.18],[.25,.2,.12],[.1,-.35,.1]]){ctx.beginPath();ctx.arc(x+dx*v.r,y+dy*v.r,r*v.r,0,7);ctx.fill()}
    ctx.restore();
  },
};
const _gpCrackGH=gpCrack;
gpCrack=function(v,cx){if(v.sub){const t=v.t-(v.delay||0);if(t>=0&&t<v.dur)GH_UNDER[v.sub](v,cx,t);return}_gpCrackGH(v,cx)};
const _gpDrawVGH=gpDrawV;
gpDrawV=function(v,cx){const f=GH_DRAW[v.k];if(f){const t=v.t-(v.delay||0);if(t>=0&&t<v.dur)f(v,cx,t);return}_gpDrawVGH(v,cx)};
const ghUnder=(add,o)=>gv(add,Object.assign({k:'crack'},o));
const ghBurst=(em,x,y,z,col,n,sp,o)=>{if(em)for(let i=0;i<n;i++){const a=rnd(0,6.283);em(Object.assign({x,y,z,vx:Math.cos(a)*rnd(.3,1)*sp,vz:Math.sin(a)*sp*.7+1,col:i%3?col:'#ffffff',size:rnd(2,5),life:rnd(16,28),type:'sq'},o||{}))}};
const ghArrow=(add,x0,y0,z0,x1,y1,z1,col,d,dur)=>gv(add,{k:'arrow',x0,y0,z0,x1,y1,z1,col,delay:d||0,dur:dur||16});

/* ================= 무장별 KIT ================= */
const _gpBoltGH=GPFX.bolt,_gpQuakeGH=GPFX.quake;
const KIT={
 guan:{c1:'#3ad07a',c2:'#d8ffe0',n:{quake:['청룡파지','靑龍破地'],gale:['언월질주','偃月疾走'],thunder:['청룡낙월','靑龍落月']},mo:{quake:'slam',gale:'dash',thunder:'leap'},
  skp:{proj:'attack3',nova:'attack3',quake:'attack3'},
  strike(add,em,x,y,d){gv(add,{k:'dragon',x0:x-GP_F*170,y0:y,z0:330,x1:x,y1:y,z1:20,col:this.c1,amp:24,w:11,delay:d,dur:22});
    gv(add,{k:'moon',x,y,z:60,r:72,col:this.c1,f:GP_F,ang:-.4,delay:d+12,dur:18});gv(add,{k:'shock',x,y,col:this.c1,delay:d+12,dur:20,r:150})},
  ground(add,em,x,y,big){gv(add,{k:'moon',x,y,z:26,r:big?200:130,col:this.c1,f:GP_F,sy:.45,dur:26});gv(add,{k:'crack',x,y,col:this.c1,r:big?220:150,n:9,dur:60});
    for(let i=0;i<2;i++)gv(add,{k:'shock',x,y,col:this.c1,delay:i*5,dur:22,r:(big?280:200)+i*60});ghBurst(em,x,y,20,this.c1,14,6)},
  amb(em,x,y){em({x:x+rnd(-90,90),y:y+rnd(-20,20),z:rnd(0,60),vz:rnd(1,3),col:Math.random()<.6?this.c1:'#ffffff',size:rnd(2,4),life:rnd(24,40),type:'sq'})},
  fin(c,t){const C1=this.c1,f=c.f;
    if(t===0){c.kanji('靑龍偃月',C1,62);gv(c.add,{k:'dragon',x0:c.px(),y0:c.y,z0:30,x1:c.px()+f*520,y1:c.y,z1:280,col:C1,amp:40,w:16,dur:36});c.sfx('dragon')}
    if(t>=12&&t<=44&&(t-12)%8===0){const F=c.foes(),e=F.length?F[((t-12)/8)%F.length]:null,x=e?e.x:c.px()+f*rnd(120,380),y=e?e.y:c.y;
      this.strike(c.add,c.em,x,y,0);c.later(12,()=>c.hit(x,y,90,50,6,false,{stun:20}));c.sfx('slash')}
    if(t===56){const x=c.px()+f*220;gv(c.add,{k:'moon',x,y:c.y,z:90,r:360,col:C1,f,ang:-.2,dur:30});gv(c.add,{k:'moon',x,y:c.y,z:90,r:260,col:'#ffffff',f,ang:-.2,dur:24,delay:3});
      for(let i=0;i<3;i++)gv(c.add,{k:'shock',x,y:c.y,col:C1,delay:i*5,dur:26,r:420+i*80});c.flash(C1,14);c.shake(30);c.sfx('boss');c.hitAll(14,true)}},
  fp(t){return t<52?{st:'skill'}:{st:'attack',combo:3,t:Math.min(30,4+(t-52))}}},
 zhang:{c1:'#ff6a3a',c2:'#ffd0a0',n:{quake:['장판진각','長坂震脚'],gale:['맹호돌격','猛虎突擊'],thunder:['사모붕산','蛇矛崩山']},mo:{quake:'stomp',gale:'dash',thunder:'leap'},
  skp:{nova:'attack3',quake:'attack3',buff:'win'},
  strike(add,em,x,y,d){gv(add,{k:'spike',x,y,n:6,w:44,h:78,col:this.c1,delay:d,dur:30});gv(add,{k:'shock',x,y,col:this.c1,delay:d,dur:20,r:160});
    gv(add,{k:'roar',x,y,z:40,f:GP_F,col:this.c1,r:160,delay:d,dur:18});if(em)for(let i=0;i<8;i++)em({x:x+rnd(-30,30),y,z:4,vx:rnd(-4,4),vz:rnd(4,10),g:.5,col:'#8a6a48',size:rnd(4,9),life:rnd(20,32),type:'sq',add:false},d)},
  ground(add,em,x,y,big){gv(add,{k:'crack',x,y,col:this.c1,r:big?260:180,n:12,dur:70});gv(add,{k:'spike',x,y,n:big?12:8,w:big?150:100,h:big?90:70,col:this.c1,dur:36});
    gv(add,{k:'roar',x,y,z:60,f:GP_F,col:'#ffe0c0',r:big?420:300,dur:24});gv(add,{k:'shock',x,y,col:this.c1,dur:24,r:big?360:240})},
  amb(em,x,y){em({x:x+rnd(-120,120),y:y+rnd(-20,20),z:2,vz:rnd(.5,1.5),vx:rnd(-1,1),col:'#9a8a70',size:rnd(10,18),life:rnd(30,44),type:'smoke',add:false})},
  fin(c,t){const C1=this.c1,f=c.f;
    if(t===0)c.kanji('長坂大喝',C1,60);
    if(t<=44&&t%12===8){gv(c.add,{k:'roar',x:c.px(),y:c.y,z:70,f,col:C1,r:540,dur:26});gv(c.add,{k:'shock',x:c.px(),y:c.y,col:'#ffe0c0',dur:24,r:520});
      c.shake(16);c.sfx('roar');c.hit(c.px()+f*270,c.y,290,90,5,false,{stun:22});c.push(c.px()+f*270,290,f*28)}
    if(t===56){c.kanji('喝',C1,120);for(const e of c.foes())this.strike(c.add,c.em,e.x,e.y,0);this.ground(c.add,c.em,c.px(),c.y,true);
      c.flash(C1,16);c.shake(40);c.sfx('boss');c.hitAll(14,true)}},
  fp(t){return{st:'special',t:t%12<6?4:20}}},
 zhao:{c1:'#9ad8ff',c2:'#ffffff',n:{quake:['칠성창진','七星槍陣'],gale:['백룡섬','白龍閃'],thunder:['은창낙성','銀槍落星']},mo:{quake:'slam',gale:'dash',thunder:'leap'},
  skp:{proj:'dashatk',chain:'dashatk'},
  strike(add,em,x,y,d){gv(add,{k:'slash',x,y,z:170,col:this.c1,ang:Math.PI/2,len:340,w:7,delay:d,dur:14});gv(add,{k:'pillar',x,y,col:'#ffffff',delay:d,dur:16,life:16,w:26,h:340});
    gv(add,{k:'flash',x,y,z:10,col:this.c1,delay:d+4,dur:14,life:14,r:70,rot:0});gv(add,{k:'shock',x,y,col:this.c1,delay:d+4,dur:18,r:120})},
  ground(add,em,x,y,big){for(let i=0;i<7;i++)gv(add,{k:'slash',x,y,z:30,col:i%2?this.c1:'#ffffff',ang:i/7*Math.PI,len:big?320:220,w:7,delay:i,dur:14});
    gv(add,{k:'crack',x,y,col:this.c1,r:big?200:140,n:7,dur:50});gv(add,{k:'shock',x,y,col:'#ffffff',dur:20,r:big?300:200})},
  amb(em,x,y){em({x:x+rnd(-60,60),y,z:rnd(20,100),vx:rnd(-2,2),vz:rnd(-.5,.5),col:'#ffffff',size:rnd(2,3),life:rnd(18,30),type:'sq'})},
  fin(c,t){const f=c.f,C1=this.c1;
    if(t===0)c.kanji('白龍亂舞',C1,60);
    for(const [a,b,d,key] of[[2,20,1,'a'],[24,40,-1,'b'],[44,60,1,'c']])if(t>=a&&t<b){c.face(f*d);c.move(f*d*24);if(t%2===0)c.after('rgba(170,220,255,.6)');
      if(t===a){gv(c.add,{k:'thrust',x:c.px(),y:c.y,z:58,dir:f*d,col:C1,len:420,w:30,dur:16,life:18});c.sfx('dash')}
      c.em({x:c.px()-f*d*20,y:c.y,z:rnd(20,90),vx:-f*d*rnd(4,8),col:'#ffffff',size:rnd(2,4),life:14,type:'sq'});c.hit(c.px(),c.y,70,40,4,false,{stun:24},key)}
    if(t===64){c.face(f);const x=c.px()+f*140;for(let i=0;i<12;i++)gv(c.add,{k:'slash',x,y:c.y,z:60,col:i%2?C1:'#ffffff',ang:i/12*Math.PI,len:420,w:9,delay:i,dur:16});
      c.flash(C1,14);c.shake(28);c.sfx('slash');c.hitAll(12,true)}},
  fp(t){return t<62?{st:'dashatk',t:8}:{st:'attack',combo:3,t:12}}},
 huang:{c1:'#ff9a2a',c2:'#ffe080',n:{quake:['화시진','火矢陣'],gale:['추풍사','追風射'],thunder:['낙일궁','落日弓']},mo:{quake:'slam',gale:'volley',thunder:'shoot'},
  skp:{proj:'shoot',rain:'skill',chain:'shoot'},
  strike(add,em,x,y,d){ghArrow(add,x-GP_F*200,y,400,x,y,0,this.c1,d,18);gv(add,{k:'fire',x,y,col:this.c1,w:40,h:110,delay:d+8,dur:22});gv(add,{k:'flash',x,y,z:10,col:this.c1,delay:d+8,dur:14,life:14,r:70,rot:0})},
  ground(add,em,x,y,big){const n=big?10:7;for(let i=0;i<n;i++){const a=i/n*6.283,r=big?140:100;ghArrow(add,x+Math.cos(a)*r-60,y+Math.sin(a)*r*.3,260,x+Math.cos(a)*r,y+Math.sin(a)*r*.3,0,this.c1,i,18)}
    gv(add,{k:'fire',x,y,col:this.c1,w:big?110:70,h:big?200:130,delay:8,dur:28});gv(add,{k:'crack',x,y,col:this.c1,r:big?200:140,n:8,dur:50,delay:8})},
  amb(em,x,y){em({x:x+rnd(-80,80),y:y+rnd(-20,20),z:rnd(0,30),vz:rnd(2,4),vx:rnd(-.5,.5),col:Math.random()<.5?'#ff7a20':'#ffe080',size:rnd(2,4),life:rnd(26,40),type:'sq'})},
  fin(c,t){const C1=this.c1,f=c.f;
    if(t===0)c.kanji('萬弓亂射',C1,60);
    if(t>=4&&t<=52&&t%2===0){const F=c.foes(),e=F.length&&Math.random()<.6?F[(Math.random()*F.length)|0]:null,x=e?e.x+rnd(-30,30):rnd(c.L+60,c.R-60),y=e?e.y+rnd(-10,10):c.rndY();
      ghArrow(c.add,x-f*220,y,420,x,y,0,C1,0,18);c.later(8,()=>{c.hit(x,y,50,30,1.4,false,{stun:8});gv(c.add,{k:'fire',x,y,col:C1,w:30,h:70,dur:18})});if(t%6===0)c.sfx('bow')}
    if(t===60){for(const e of c.foes())gv(c.add,{k:'fire',x:e.x,y:e.y,col:C1,w:90,h:260,dur:30});c.flash(C1,12);c.shake(24);c.sfx('fire');c.hitAll(10,true)}},
  fp(t){return{st:'skill'}}},
 zhuge:{c1:'#b088ff',c2:'#e8f0ff',n:{quake:['팔괘진','八卦陣'],gale:['축지법','縮地法'],thunder:['천뢰부','天雷符']},mo:{quake:'cast',gale:'blink',thunder:'cast'},
  skp:{proj:'skill',nova:'skill',rain:'skill',chain:'skill',quake:'skill',dash:'skill',leap:'skill',summon:'skill'},
  strike(add,em,x,y,d,w){_gpBoltGH(add,em,x,y,this.c1,d,w||7);ghUnder(add,{sub:'octa',x,y,col:this.c1,r:70,delay:d,dur:30})},
  ground(add,em,x,y,big){ghUnder(add,{sub:'octa',x,y,col:this.c1,r:big?240:160,dur:60,spin:1});for(let i=0;i<(big?3:2);i++)_gpBoltGH(add,em,x+rnd(-80,80),y+rnd(-20,20),this.c1,4+i*5,6);
    if(em)for(let i=0;i<18;i++){const a=i/18*6.283;em({x:x+Math.cos(a)*120,y:y+Math.sin(a)*30,z:10,vx:-Math.sin(a)*4,vz:rnd(1,3),col:i%2?'#ffffff':this.c1,size:rnd(2,4),life:24,type:'sq'})}},
  amb(em,x,y){em({x:x+rnd(-70,70),y,z:rnd(40,120),vx:rnd(-1,1),vz:rnd(-.3,.6),col:Math.random()<.5?'#ffffff':this.c1,size:rnd(2,4),life:rnd(20,36),type:'sq'})},
  fin(c,t){const C1=this.c1,cx0=(c.L+c.R)/2,cy=c.midY();
    if(t===0){ghUnder(c.add,{sub:'octa',x:cx0,y:cy,col:C1,r:340,dur:80,spin:1});c.kanji('八陣雷擊',C1,60);c.sfx('magic')}
    if(t>=10&&t<=45&&(t-10)%5===0){const i=(t-10)/5,an=i/8*6.283,x=cx0+Math.cos(an)*250,y=cy+Math.sin(an)*60;_gpBoltGH(c.add,c.em,x,y,C1,0,8);c.hit(x,y,90,50,3,false,{stun:16});c.sfx('bolt');c.shake(8)}
    if(t===56){_gpBoltGH(c.add,c.em,cx0,cy,'#ffffff',0,18);for(let i=0;i<4;i++)_gpBoltGH(c.add,c.em,cx0+rnd(-200,200),cy+rnd(-40,40),C1,2+i*2,9);
      c.flash(C1,16);c.shake(32);c.sfx('boss');c.hitAll(14,true)}},
  fp(t){return{st:'skill'}}},
 ma:{c1:'#cfe6ff',c2:'#7ac0ff',n:{quake:['서량풍진','西涼風陣'],gale:['금마돌격','錦馬突擊'],thunder:['선풍창','旋風槍']},mo:{quake:'spin',gale:'dash',thunder:'leap'},
  skp:{whirl:'spin',nova:'spin'},
  strike(add,em,x,y,d){gv(add,{k:'tornado',x,y,col:this.c2,h:230,w:60,delay:d,dur:30});gv(add,{k:'shock',x,y,col:this.c1,delay:d,dur:20,r:140})},
  ground(add,em,x,y,big){gv(add,{k:'tornado',x,y,col:this.c2,h:big?300:200,w:big?110:70,dur:36});for(let i=0;i<8;i++)gv(add,{k:'slash',x,y,z:20,col:'#ffffff',ang:i/8*Math.PI,len:big?300:200,w:5,delay:i,dur:12});
    gv(add,{k:'shock',x,y,col:this.c2,dur:22,r:big?320:220})},
  amb(em,x,y){em({x:x+rnd(-140,140),y:y+rnd(-30,30),z:rnd(10,120),vx:rnd(3,7)*(Math.random()<.5?-1:1),col:'#e8f4ff',size:rnd(2,3),life:rnd(14,22),type:'sq'})},
  fin(c,t){const f=c.f,C2=this.c2;
    if(t===0){c.mem.x0=c.px()+f*60;gv(c.add,{k:'tornado',x:c.mem.x0,y:c.y,col:C2,vx:f*6,h:380,w:140,dur:70});c.kanji('西涼旋風',C2,60);c.sfx('wind')}
    if(t>2&&t<66&&t%6===0){const x=c.mem.x0+f*6*t;c.hit(x,c.y,100,70,2,false,{stun:14});c.pull(x,7);c.em({x,y:c.y,z:rnd(20,200),vx:rnd(-6,6),vz:rnd(1,3),col:'#ffffff',size:3,life:16,type:'sq'})}
    if(t===68){const x=c.mem.x0+f*6*66;this.ground(c.add,c.em,x,c.y,true);c.flash(C2,12);c.shake(26);c.sfx('wind');c.hitAll(12,true,{launch:true})}},
  fp(t){return{st:'spin',t}}},
 diao:{c1:'#ff8ac8',c2:'#fff0f8',n:{quake:['화무진','花舞陣'],gale:['비연무','飛燕舞'],thunder:['월하낙화','月下落花']},mo:{quake:'spin',gale:'spin',thunder:'leap'},
  skp:{proj:'spin',dash:'spin',nova:'spin',whirl:'spin',chain:'spin'},
  strike(add,em,x,y,d){gv(add,{k:'petals',x,y,z:40,n:16,sp:60,out:2.2,sw:1,zr:60,col:this.c1,delay:d,dur:28});gv(add,{k:'moon',x,y,z:70,r:60,col:this.c1,f:GP_F,ang:.6,delay:d,dur:18});
    gv(add,{k:'slash',x,y,z:60,col:'#ffffff',ang:rnd(-1,1),len:160,w:7,delay:d+2,dur:12})},
  ground(add,em,x,y,big){gv(add,{k:'petals',x,y,z:10,n:big?50:32,sp:big?220:150,out:1.6,sw:1.4,zr:40,col:this.c1,dur:44});
    for(let i=0;i<6;i++)gv(add,{k:'moon',x:x+Math.cos(i/6*6.283)*60,y:y+Math.sin(i/6*6.283)*18,z:20,r:46,col:this.c1,ang:i/6*6.283,dur:24,delay:i*2});gv(add,{k:'shock',x,y,col:this.c1,dur:22,r:big?300:200})},
  amb(em,x,y){em({x:x+rnd(-100,100),y:y+rnd(-20,20),z:rnd(60,160),vz:-rnd(.3,1),vx:rnd(-1,1),col:Math.random()<.7?'#ffb0d8':'#ffffff',size:rnd(3,5),life:rnd(40,60),type:'sq',add:false})},
  fin(c,t){const C1=this.c1;
    if(t===0){ghUnder(c.add,{sub:'moonbg',x:c.px(),y:c.y,z:240,r:72,col:C1,dur:80});gv(c.add,{k:'petals',x:c.px(),y:c.y,z:20,n:60,sp:260,out:1.3,sw:1,zr:160,col:C1,dur:80});c.kanji('閉月羞花',C1,60);c.sfx('charm')}
    if(t>=6&&t<=54&&(t-6)%8===0){for(const e of c.foes().slice(0,5)){gv(c.add,{k:'petals',x:e.x,y:e.y,z:40,n:12,sp:40,out:2.4,sw:1,zr:60,col:C1,dur:24});
        gv(c.add,{k:'slash',x:e.x,y:e.y,z:60,col:'#ffffff',ang:rnd(-1.2,1.2),len:170,w:8,dur:12});c.hit(e.x,e.y,50,30,3,false,{stun:30})}c.sfx('slash')}
    if(t===62){gv(c.add,{k:'moon',x:c.px()+c.f*200,y:c.y,z:90,r:330,col:C1,f:c.f,ang:.3,dur:30});this.ground(c.add,c.em,c.px()+c.f*200,c.y,true);c.flash(C1,14);c.shake(24);c.hitAll(12,true)}},
  fp(t){return{st:'special',t}}},
 wei:{c1:'#ff5020',c2:'#ffc060',n:{quake:['열화참지','烈火斬地'],gale:['화룡돌','火龍突'],thunder:['염주낙','炎柱落']},mo:{quake:'slam',gale:'dash',thunder:'leap'},
  skp:{nova:'attack3',quake:'attack3',proj:'attack3'},
  strike(add,em,x,y,d){gv(add,{k:'fire',x,y,col:this.c1,w:60,h:230,delay:d,dur:30});gv(add,{k:'shock',x,y,col:this.c2,delay:d,dur:20,r:140});
    if(em)for(let i=0;i<10;i++)em({x:x+rnd(-20,20),y,z:rnd(0,40),vx:rnd(-3,3),vz:rnd(3,8),g:.15,col:Math.random()<.5?'#ffe080':this.c1,size:rnd(2,4),life:rnd(20,34),type:'sq'},d)},
  ground(add,em,x,y,big){ghUnder(add,{sub:'fissure',x0:x-(big?220:150),x1:x+(big?220:150),y,col:this.c1,dur:60});for(let i=-1;i<=1;i++)gv(add,{k:'fire',x:x+i*(big?120:80),y,col:this.c1,w:60,h:big?220:160,delay:Math.abs(i)*4,dur:30});
    gv(add,{k:'shock',x,y,col:this.c2,dur:22,r:big?320:220})},
  amb(em,x,y){em({x:x+rnd(-80,80),y:y+rnd(-10,10),z:rnd(0,20),vz:rnd(2,5),vx:rnd(-.5,.5),col:Math.random()<.5?'#ff5020':'#ffd060',size:rnd(2,5),life:rnd(22,34),type:'sq'})},
  fin(c,t){const C1=this.c1,f=c.f;
    if(t===0)c.kanji('反骨烈火',C1,60);
    if(t>=6&&t<=46&&(t-6)%5===0){const i=(t-6)/5,x=c.px()+f*(60+i*60);gv(c.add,{k:'fire',x,y:c.y,col:C1,w:70,h:260,dur:30});c.hit(x,c.y,60,60,3,false,{stun:16});c.shake(8);if(i%2===0)c.sfx('fire')}
    if(t===56){const x=c.px()+f*300;ghUnder(c.add,{sub:'fissure',x0:c.px(),x1:x+f*200,y:c.y,col:C1,dur:60});for(let i=0;i<5;i++)gv(c.add,{k:'fire',x:x+rnd(-160,160),y:c.y+rnd(-20,20),col:C1,w:110,h:320,delay:i*2,dur:32});
      c.flash(C1,14);c.shake(32);c.sfx('boss');c.hitAll(12,true)}},
  fp(t){return t<6?{st:'skill'}:{st:'attack',combo:3,t:Math.min(30,8+t-6)}}},
 lubu:{c1:'#ff2a3a',c2:'#ffd040',n:{quake:['패왕진','霸王震'],gale:['적토돌','赤兎突'],thunder:['방천낙','方天落']},mo:{quake:'slam',gale:'dash',thunder:'leap'},
  skp:{nova:'attack3',quake:'attack3',whirl:'spin'},
  strike(add,em,x,y,d){GPFX.slashX(add,x,y,60,this.c1,240,d);_gpBoltGH(add,null,x,y,'#ff3050',d,6);gv(add,{k:'flash',x,y,z:40,col:this.c2,delay:d+2,dur:14,life:14,r:80,rot:0})},
  ground(add,em,x,y,big){gv(add,{k:'crack',x,y,col:this.c1,r:big?280:190,n:12,dur:70});gv(add,{k:'pillar',x,y,col:'#a01020',dur:28,w:big?140:90,h:big?460:300});
    for(let i=0;i<3;i++)gv(add,{k:'shock',x,y,col:i%2?this.c2:this.c1,delay:i*4,dur:22,r:(big?300:200)+i*60})},
  amb(em,x,y){em({x:x+rnd(-50,50),y,z:rnd(0,110),vz:rnd(1,2.5),col:Math.random()<.6?'#ff2030':'#2a0010',size:rnd(4,8),life:rnd(20,32),type:Math.random()<.5?'glow':'sq',add:Math.random()<.6})},
  fin(c,t){const C1=this.c1,f=c.f;
    if(t===0){c.kanji('天下無雙',C1,64);gv(c.add,{k:'crack',x:c.px(),y:c.y,col:C1,r:320,n:14,dur:80})}
    if(t>=4&&t<=52&&t%3===1){const F=c.foes(),e=F.length?F[(t/3|0)%F.length]:null,x=e?e.x:c.px()+f*rnd(60,360),y=e?e.y:c.y;
      gv(c.add,{k:'slash',x,y,z:rnd(40,110),col:t%2?C1:this.c2,ang:rnd(-1.4,1.4),len:rnd(220,320),w:11,dur:12});c.hit(x,y,70,40,1.6,false,{stun:12});c.sfx('slash');if(t%6===1)c.shake(6)}
    if(t===60){const x=c.px()+f*200;gv(c.add,{k:'slash',x,y:c.y,z:150,col:C1,ang:Math.PI/2,len:680,w:24,dur:26});gv(c.add,{k:'slash',x,y:c.y,z:60,col:this.c2,ang:0,len:820,w:16,delay:4,dur:24});
      c.flash(C1,18);c.shake(42);c.sfx('roar');c.sfx('boss');c.hitAll(14,true);c.kanji('斬',C1,120)}},
  fp(t){return t<58?{st:'attack',combo:1+((t/6|0)%3),t:(t%6)*2+4}:{st:'attack',combo:3,t:20}}},
 xu:{c1:'#e0a040',c2:'#fff0c0',n:{quake:['개산부','開山斧'],gale:['돌산부','突山斧'],thunder:['낙석참','落石斬']},mo:{quake:'slam',gale:'dash',thunder:'leap'},
  skp:{nova:'attack3',quake:'attack3',leap:'attack3'},
  strike(add,em,x,y,d){gv(add,{k:'spike',x,y,n:7,w:50,h:96,col:this.c1,delay:d,dur:32});gv(add,{k:'shock',x,y,col:this.c1,delay:d,dur:20,r:150});
    if(em)for(let i=0;i<10;i++)em({x:x+rnd(-30,30),y,z:4,vx:rnd(-5,5),vz:rnd(5,11),g:.55,col:i%2?'#7a5a3a':'#a88a60',size:rnd(4,10),life:rnd(22,34),type:'sq',add:false},d)},
  ground(add,em,x,y,big){ghUnder(add,{sub:'fissure',x0:x-GP_F*40,x1:x+GP_F*(big?420:280),y,col:this.c1,dur:64});
    for(let i=0;i<(big?7:5);i++)gv(add,{k:'spike',x:x+GP_F*(30+i*58),y,n:4,w:24,h:70+i*4,col:this.c1,delay:i*2,dur:34})},
  amb(em,x,y){em({x:x+rnd(-100,100),y,z:2,vz:rnd(.5,1.2),vx:rnd(-1,1),col:'#a89070',size:rnd(10,16),life:rnd(26,40),type:'smoke',add:false})},
  fin(c,t){const C1=this.c1,f=c.f;
    if(t===0)c.kanji('大斧開山',C1,60);
    if(t===18){c.shake(30);c.sfx('rock');c.sfx('boss');ghUnder(c.add,{sub:'fissure',x0:c.px(),x1:c.px()+f*720,y:c.y,col:C1,dur:70});
      for(let i=0;i<10;i++){const x=c.px()+f*(60+i*65);gv(c.add,{k:'spike',x,y:c.y,n:5,w:30,h:90,col:C1,delay:i*2,dur:40});c.later(i*2+2,()=>c.hit(x,c.y,50,60,2.4,false,{launch:true}))}}
    if(t===56){for(const e of c.foes())gv(c.add,{k:'spike',x:e.x,y:e.y,n:9,w:60,h:140,col:C1,dur:36});gv(c.add,{k:'shock',x:c.px()+f*300,y:c.y,col:C1,dur:26,r:600});
      c.flash(C1,14);c.shake(36);c.sfx('rock');c.hitAll(12,true);c.kanji('開山',C1,110)}},
  fp(t){return t<18?{st:'skill'}:{st:'attack',combo:3,t:Math.min(30,8+t-18)}}},
 gan:{c1:'#ffd040',c2:'#80d0ff',n:{quake:['쇄편진','鎖鞭陣'],gale:['금범질주','錦帆疾走'],thunder:['방울뇌','鈴雷']},mo:{quake:'spin',gale:'spin',thunder:'leap'},
  skp:{proj:'attack3',chain:'attack3',whirl:'spin'},
  strike(add,em,x,y,d){gv(add,{k:'chain',x0:x-GP_F*170,y0:y,z0:180,x1:x,y1:y,z1:50,col:this.c1,delay:d,dur:14});_gpBoltGH(add,em,x,y,this.c2,d+3,5);
    gv(add,{k:'kanji',x,y,z:120,txt:'♪',col:this.c1,size:26,delay:d,dur:24})},
  ground(add,em,x,y,big){for(let i=0;i<6;i++){const a=i/6*6.283;gv(add,{k:'chain',x0:x,y0:y,z0:60,x1:x+Math.cos(a)*(big?200:140),y1:y+Math.sin(a)*40,z1:40,col:this.c1,delay:i,dur:16})}
    for(let i=0;i<2;i++)gv(add,{k:'shock',x,y,col:i?this.c2:this.c1,delay:i*5,dur:22,r:big?320:220});_gpBoltGH(add,em,x,y,this.c2,4,6)},
  amb(em,x,y){em({x:x+rnd(-90,90),y,z:rnd(30,110),vz:rnd(.5,1.5),col:Math.random()<.6?'#ffe060':'#a0e0ff',size:rnd(2,4),life:rnd(20,34),type:'sq'})},
  fin(c,t){const C1=this.c1;
    if(t===0){c.kanji('錦帆賊風',C1,60);c.sfx('magic')}
    if(t>=6&&t<=48&&(t-6)%6===0){const F=c.foes().slice(0,6),pts=F.length?F:[{x:c.px()+c.f*260,y:c.y}];
      for(const e of pts){gv(c.add,{k:'chain',x0:c.px(),y0:c.y,z0:70,x1:e.x,y1:e.y,z1:55,col:C1,dur:10});c.hit(e.x,e.y,40,30,2,false,{stun:18})}
      if((t-6)%12===0)for(const e of pts)_gpBoltGH(c.add,c.em,e.x,e.y,this.c2,2,5);gv(c.add,{k:'kanji',x:c.px()+rnd(-90,90),y:c.y,z:rnd(80,160),txt:'♪',col:C1,size:28,dur:24});c.sfx('slash')}
    if(t===56){for(const e of c.foes())_gpBoltGH(c.add,c.em,e.x,e.y,this.c2,0,9);for(let i=0;i<3;i++)gv(c.add,{k:'shock',x:c.px(),y:c.y,col:C1,delay:i*5,dur:26,r:460+i*80});
      c.flash(C1,14);c.shake(30);c.sfx('bolt');c.hitAll(12,true)}},
  fp(t){return{st:'spin',t}}},
 sun:{c1:'#ff6a8a',c2:'#ffe0a0',n:{quake:['궁요진','弓腰陣'],gale:['연환보','連環步'],thunder:['천궁낙','天弓落']},mo:{quake:'slam',gale:'volley',thunder:'shoot'},
  skp:{proj:'shoot',rain:'shoot',chain:'shoot',dash:'jump'},
  strike(add,em,x,y,d){for(const s of[-1,0,1])ghArrow(add,x+s*160,y+s*10,300,x,y,0,this.c1,d,16);gv(add,{k:'star',x,y,z:20,col:this.c1,delay:d+7,dur:14,life:14,s:1.4});gv(add,{k:'shock',x,y,col:this.c1,delay:d+7,dur:18,r:120})},
  ground(add,em,x,y,big){const n=big?12:8;for(let i=0;i<n;i++){const a=i/n*6.283,r=big?160:110;ghArrow(add,x,y,220,x+Math.cos(a)*r,y+Math.sin(a)*r*.3,0,this.c1,i,16)}
    gv(add,{k:'shock',x,y,col:this.c1,dur:22,r:big?320:220,delay:6});gv(add,{k:'star',x,y,z:30,col:'#ffffff',dur:16,life:16,s:2,delay:6})},
  amb(em,x,y){em({x:x+rnd(-80,80),y,z:rnd(20,120),vz:rnd(-.5,.5),vx:rnd(-1,1),col:Math.random()<.6?'#ff8aa8':'#ffe0a0',size:rnd(2,4),life:rnd(18,30),type:'sq'})},
  fin(c,t){const C1=this.c1,z=t<18?Math.sin(t/18*Math.PI/2)*150:t<58?150+Math.sin(t*.2)*8:t<70?150*(1-(t-58)/12):0;c.z(z);
    if(t===0){c.kanji('弓腰亂射',C1,60);c.sfx('jump')}
    if(t>=20&&t<=54&&t%3===2){const an=t*.5,r=rnd(80,300),x=c.px()+Math.cos(an)*r,y=clamp(c.y+Math.sin(an)*50,c.y-60,c.y+60);
      ghArrow(c.add,c.px(),c.y,z+50,x,y,0,C1,0,14);c.later(6,()=>{c.hit(x,y,50,30,1.3,false,{stun:8});gv(c.add,{k:'star',x,y,z:10,col:C1,dur:12,life:12,s:1})});if(t%6===2)c.sfx('bow')}
    if(t===70){this.ground(c.add,c.em,c.px(),c.y,true);c.flash(C1,12);c.shake(24);c.sfx('bomb');c.hitAll(12,true)}},
  fp(t){return t<58?{st:'spin',t}:{st:'jump'}}},
};
KIT.lubu.skp=KIT.lubu.skp||{};

/* ================= 연결 ================= */
GPFX.bolt=function(add,em,x,y,col,d,w){const K=GP_KIT;if(K&&K.strike)return K.strike(add,em,x,y,d||0,w);return _gpBoltGH(add,em,x,y,col,d,w)};
GPFX.quake=function(add,em,x,y,col,big){const K=GP_KIT;if(K&&K.ground)return K.ground(add,em,x,y,big);return _gpQuakeGH(add,em,x,y,col,big)};
const _updPlayerGH=updPlayer;
updPlayer=function(p){const k0=GP_KIT,f0=GP_F;GP_KIT=(p.h&&KIT[p.h.id])||null;GP_F=p.facing||1;try{_updPlayerGH(p)}finally{GP_KIT=k0;GP_F=f0}};
/* 지연 실행 */
function ghLater(d,fn){const w=Wd;(w.ghLater=w.ghLater||[]).push({t:w.t+d,fn})}
const _btGH=battleTick;
battleTick=function(){_btGH();const w=Wd;if(w&&w.ghLater&&w.ghLater.length){const now=w.t,due=w.ghLater.filter(q=>now>=q.t);w.ghLater=w.ghLater.filter(q=>now<q.t);for(const q of due)try{q.fn()}catch(e){}}};

/* --- 필살기 컨텍스트 (게임) --- */
function ghCtxGame(p){const w=Wd;return{
  f:p.ghF0,y:p.y,add:gpAdd,em:gpEmit,px:()=>p.x,L:w.camX,R:w.camX+W,midY:()=>(GT+GB)/2,rndY:()=>rnd(GT+10,GB-10),mem:p.ghMem,
  foes:()=>w.enemies.filter(e=>!e.dead&&onScreen(e,10)).map(e=>({x:e.x,y:e.y,e})),
  hit:(x,y,rx,ry,k,kn,opt,once)=>{for(const e of w.enemies){if(!hittable(e)||Math.abs(e.x-x)>rx||Math.abs(e.y-y)>ry)continue;
    if(once){const S=p.ghHit[once]||(p.ghHit[once]=new Set());if(S.has(e))continue;S.add(e)}damage(p,e,spDmg(p,k),kn,opt)}},
  hitAll:(k,kn,opt)=>{for(const e of w.enemies)if(!e.dead&&onScreen(e,20))damage(p,e,spDmg(p,k),kn,opt)},
  later:(d,fn)=>ghLater(d,fn),shake:n=>{w.shake=Math.max(w.shake,n)},flash:(col,n)=>{w.flashT=Math.max(w.flashT,n);w.flashCol=hexRGB(col).join(',')},sfx:n=>sfx(n),
  move:dx=>{p.x+=dx},z:v=>{p.z=v},face:f=>{p.facing=f},
  after:tint=>w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:14,facing:p.facing,look:p.look,pose:poseOf(p),tint}),
  push:(x,rx,dx)=>{for(const e of w.enemies)if(!e.dead&&!e.boss&&Math.abs(e.x-x)<rx)e.x+=dx},
  pull:(x,s)=>{for(const e of w.enemies)if(!e.dead&&!e.boss&&Math.abs(e.x-x)<240)e.x+=Math.sign(x-e.x)*Math.min(s,Math.abs(x-e.x))},
  kanji:(t,col,size)=>gpV(gpAdd,{k:'kanji',x:p.x+p.ghF0*120,y:p.y,z:220,txt:t,col,size,dur:70})}}

/* 필살기 중: 무장별 분위기 입자 + 시작 연출 (공통 낙뢰 대신) */
const _gpSpTickGH=gpSpTick;
gpSpTick=function(p){const K=!p.mysp&&KIT[p.h.id];if(!K)return _gpSpTickGH(p);
  if(p.t===1){K.ground(gpAdd,gpEmit,p.x,p.y,true);gpV(gpAdd,{k:'kanji',x:p.x,y:p.y,z:190,txt:(HERO_SP_HZ[p.h.id]||'必殺').slice(0,2),col:K.c1,size:70,dur:64})}
  if(p.t%2===0)K.amb(gpEmit,p.x,p.y)};
/* 피날레: 무장 고유 (신화 무기 필살기는 기존 공통 피날레) */
const _spFinGH=spFinale;
spFinale=function(p){const K=!p.mysp&&KIT[p.h.id];if(!K)return _spFinGH(p);
  const t=p.spFin++;p.inv=Math.max(p.inv,12);if(t===0){p.ghMem={};p.ghF0=p.facing;p.ghHit={}}
  GP_KIT=K;GP_F=p.ghF0;K.fin(ghCtxGame(p),t);
  if(t>=80){p.state='idle';p.spFin=null;p.t=0;p.z=0;p.facing=p.ghF0}};
/* 자세: 피날레 · 커맨드 */
function ghPoseAs(e,o,inner){const st=e.state,t=e.t,cb=e.combo,ja=e.jatk,sf=e.spFin;
  try{e.state=o.st;if(o.t!=null)e.t=o.t;if(o.combo!=null)e.combo=o.combo;if(o.st==='jump')e.jatk=false;e.spFin=null;return inner(e)}
  finally{e.state=st;e.t=t;e.combo=cb;e.jatk=ja;e.spFin=sf}}
const _poseOfGH=poseOf;
poseOf=function(e){
  const K=e&&e.h&&KIT[e.h.id];
  if(K&&e.state==='special'&&e.spFin!=null&&!e.mysp){const o=K.fp(e.spFin);if(o.t==null)o.t=e.spFin;return ghPoseAs(e,o,_poseOfGH)}
  if(K&&e.state==='gcmd'&&e.gc){const o=ghCmdPose(K,e.gc.id,e.t);if(o)return ghPoseAs(e,o,_poseOfGH)}
  return _poseOfGH(e);
};
function ghCmdPose(K,id,t){const v=K.mo[id];
  if(id==='quake'){if(v==='cast')return{st:'skill',t};if(v==='spin')return t<14?{st:'spin',t:t*2}:{st:'attack',combo:3,t:Math.min(30,8+t-14)};if(v==='stomp')return{st:'special',t:t<12?4:20};return null}
  if(id==='gale'){if(v==='blink')return t<8?{st:'skill',t}:{st:'win',t:10};if(v==='spin')return t<28?{st:'spin',t}:{st:'attack',combo:3,t:12};if(v==='volley')return t<8?{st:'jump'}:{st:'shoot',t};return null}
  if(id==='thunder'){if(v==='cast')return{st:'skill',t};if(v==='shoot')return t<20?{st:'shoot',t}:{st:'attack',combo:3,t:Math.min(30,8+t-20)};return null}
  return null}

/* --- 커맨드: 무장 이름 · 동작 변형 --- */
const _gpStartGH=gpStart;
gpStart=function(p,g){const K=KIT[p.h.id],D=GCMD[g.id];if(!K)return _gpStartGH(p,g);const n0=D.n;D.n=K.n[g.id][0];try{_gpStartGH(p,g)}finally{D.n=n0}};
function ghDelayHit(p,d,x,y,r,k,opt){ghLater(d,()=>{if(p.dead)return;gpHit(p,e=>Math.abs(e.x-x)<r&&Math.abs(e.y-y)<r*.6,gpPow(p,k),false,opt||{stun:20})})}
const _gpUpdGH=gpUpd;
gpUpd=function(p,i){
  const K=KIT[p.h.id];if(!K)return _gpUpdGH(p,i);
  const w=Wd,f=p.facing,id=p.gc.id,D=GCMD[id],col=K.c1,t=p.t,C=p.gc.combo,v=K.mo[id];GP_KIT=K;GP_F=f;
  const hit=(test,k,kn,opt)=>gpHit(p,test,gpPow(p,k),kn,opt),near=(x,rx,ry)=>e=>Math.abs(e.x-x)<rx&&Math.abs(e.y-p.y)<ry;
  const gather=()=>{if(t%2===0)for(let k=0;k<3;k++){const a=rnd(0,6.283);emit({x:p.x+Math.cos(a)*70,y:p.y+Math.sin(a)*20,z:rnd(20,90),vx:-Math.cos(a)*3,vz:-Math.sin(a)*1.5,col:k?col:'#ffffff',size:rnd(2,4),life:14,type:'sq'})}};
  switch(id){
    case'quake':{const x=p.x+f*60;if(t<12)gather();
      if(t===12){K.ground(gpAdd,gpEmit,x,p.y,!!C);w.shake=Math.max(w.shake,14);sfx('rock');sfx('bomb');gpV(gpAdd,{k:'kanji',x,y:p.y,z:150,txt:K.n.quake[1].slice(0,2),col,size:46,dur:40});
        hit(near(x,190,60),1.8,true,{launch:true});if(C)gpComboFire(p,C,x)}
      if(t===22){vfx({k:'shock',x,y:p.y,col,life:26,r:380});hit(near(x,320,80),1,false,{stun:24});sfx('rock')}
      break}
    case'gale':
      if(v==='blink'){if(t<8)gather();
        if(t===8){const x0=p.x;ghUnder(gpAdd,{sub:'octa',x:x0,y:p.y,col,r:110,dur:36});w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:24,facing:f,look:p.look,pose:poseOf(p),tint:hexA(col,.6)});
          p.x+=f*230;p.gc.x0=x0;ghUnder(gpAdd,{sub:'octa',x:p.x,y:p.y,col,r:110,dur:36});sfx('magic');hit(near(x0,110,50),1.4,false,{stun:30});hit(near(p.x,110,50),1.4,false,{stun:30})}
        if(t===22){const mid=(p.gc.x0+p.x)/2;_gpBoltGH(gpAdd,gpEmit,p.gc.x0,p.y,col,0,7);_gpBoltGH(gpAdd,gpEmit,p.x,p.y,col,3,7);GPFX.slashX(gpAdd,mid,p.y,60,col,Math.abs(p.x-p.gc.x0)+80);
          hit(e=>Math.abs(e.x-mid)<Math.abs(p.x-p.gc.x0)/2+70&&Math.abs(e.y-p.y)<50,1.2,true);if(C)gpComboFire(p,C,mid)}}
      else if(v==='spin'){if(t===0)p.gc.x0=p.x;
        if(t>=4&&t<26){p.x+=f*9;if(t%4===0){hit(near(p.x,95,50),.6,false,{stun:20});K.strike(gpAdd,null,p.x+f*30,p.y,0);sfx('slash')}K.amb(emit,p.x,p.y)}
        if(t===28){K.ground(gpAdd,gpEmit,p.x,p.y,false);hit(near(p.x,130,60),1.2,true);if(C)gpComboFire(p,C,(p.gc.x0+p.x)/2)}}
      else if(v==='volley'){if(t===0)p.gc.x0=p.x;
        if(t<8){p.x-=f*7;p.z=Math.sin(t/8*Math.PI)*34}else p.z=0;
        if(t>=10&&t<=22&&(t-10)%3===0){for(const dy of[-14,0,14])ghArrow(gpAdd,p.x+f*20,p.y+dy,60,p.x+f*520,p.y+dy,50,col,0,16);
          hit(e=>(e.x-p.x)*f>0&&(e.x-p.x)*f<520&&Math.abs(e.y-p.y)<44,.6,t===22,{stun:16});sfx('bow')}
        if(t===24){K.strike(gpAdd,gpEmit,p.x+f*300,p.y,0);if(C)gpComboFire(p,C,p.x+f*200)}}
      else{/* 돌진 */
        if(t<6){p.x-=f*1.5;if(t===5)vfx({k:'thrust',f:p,x:p.x,y:p.y,z:58,dir:f,col,len:340,w:30,dur:16,life:18})}
        else if(t<22){p.x+=f*17;w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:12,facing:f,look:p.look,pose:poseOf(p),tint:hexA(col,.5)});K.amb(emit,p.x,p.y);
          for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;if(Math.abs(e.x-p.x)<64&&Math.abs(e.y-p.y)<42){p.hitIds.add(e);damage(p,e,gpPow(p,1.4),false,{stun:34})}}}
        if(t===0)p.gc.x0=p.x;
        if(t===24){const mid=(p.gc.x0+p.x)/2;K.strike(gpAdd,gpEmit,p.x+f*40,p.y,0);GPFX.slashX(gpAdd,mid,p.y,60,col,Math.abs(p.x-p.gc.x0)+80);sfx('slash');w.shake=Math.max(w.shake,10);
          for(const e of p.hitIds)if(!e.dead)damage(p,e,gpPow(p,1.2),true);if(C)gpComboFire(p,C,mid)}}
      if(C&&C.id==='fuun'&&t>=27&&t<=42&&t%3===0){const x0=Math.min(p.gc.x0,p.x),x1=Math.max(p.gc.x0,p.x),x=rnd(x0,x1);
        gpV(gpAdd,{k:'slash',x,y:p.y+rnd(-20,20),z:rnd(40,90),col:t%6?C.col:'#ffffff',ang:rnd(-1.2,1.2),len:rnd(240,360),w:10,dur:12});sfx('slash');
        hit(e=>e.x>x0-60&&e.x<x1+60&&Math.abs(e.y-p.y)<60,.7,t===42,{stun:16})}
      break;
    case'thunder':
      if(v==='cast'){p.z=0;if(t<20)gather()}
      else{if(t<14){p.z=Math.sin(t/14*Math.PI/2)*110;if(t===1)sfx('jump')}else if(t<20){p.z=110*(1-(t-14)/6);p.x+=f*4}else p.z=0}
      if(v==='shoot'&&t>=8&&t<=16&&t%4===0){const k=(t-8)/4;ghArrow(gpAdd,p.x,p.y,p.z+50,p.x+f*(70+k*90),p.y,0,col,0,12);sfx('bow')}
      if(t===20){w.shake=Math.max(w.shake,12);sfx(v==='cast'?'bolt':'land');vfx({k:'shock',x:p.x,y:p.y,col,life:22,r:180});
        for(let k=0;k<3;k++){const x=p.x+f*(70+k*90);K.strike(gpAdd,gpEmit,x,p.y,k*4);ghDelayHit(p,k*4+(v==='shoot'?2:8),x,p.y,72,1.3)}
        gpV(gpAdd,{k:'kanji',x:p.x+f*160,y:p.y,z:170,txt:K.n.thunder[1].slice(0,2),col,size:46,dur:40,delay:4});if(C)gpComboFire(p,C,p.x+f*160)}
      break;
  }
  if(t>=D.cancel){const P=G&&G.np===2?PP[i]:pressed;if(P.atk){const g=gpRead(p);if(g){P.atk=false;p.cmd.length=0;p.z=0;gpStart(p,g);return}}}
  if(t>=D.dur){p.state='idle';p.t=0;p.z=0;p.gc=null}
  const maxX=w.lock!==null?w.camX+W-25:Math.min(w.S.len-25,w.camX+W-25);p.x=clamp(p.x,w.camX+25,maxX);
};
/* 연계기: 무장별 타격 연출 (낙뢰 피해는 지연 타격으로) */
const _gpComboFireGH=gpComboFire;
gpComboFire=function(p,C,x){
  const K=KIT[p.h.id];if(!K||(C.id!=='raitei'&&C.id!=='musou'))return _gpComboFireGH(p,C,x);
  const w=Wd,col=C.col;hitstop=Math.max(hitstop,6);w.flashT=Math.max(w.flashT,8);w.flashCol=hexRGB(K.c1).join(',');
  gpV(gpAdd,{k:'kanji',x:p.x+p.facing*120,y:p.y,z:230,txt:C.hz,col:K.c1,size:C.seq.length>=3?78:60,dur:80});
  const foes=w.enemies.filter(e=>!e.dead&&onScreen(e,10)),n=C.id==='musou'?12:8;
  for(let k=0;k<n;k++){const e=foes[k%Math.max(1,foes.length)],bx=e?e.x+rnd(-20,20):w.camX+rnd(80,W-80),by=e?e.y:rnd(GT+10,GB-10),d=(C.id==='musou'?4:6)+k*(C.id==='musou'?3:4);
    K.strike(gpAdd,gpEmit,bx,by,d);ghDelayHit(p,d+6,bx,by,80,C.id==='musou'?1.6:1.4)}
  if(C.id==='musou'){const cx=w.camX+W/2;for(let i=0;i<10;i++)gpV(gpAdd,{k:'slash',x:cx+rnd(-300,300),y:rnd(GT+20,GB-20),z:rnd(40,140),col:i%2?K.c1:'#ffffff',ang:i/10*Math.PI,len:rnd(500,800),w:13,delay:40+i*2,dur:18});
    K.ground(gpAdd,gpEmit,cx,(GT+GB)/2,true);w.gpMusou={t:0,p};sfx('boss')}
};
/* 액티브 스킬: 무기에 맞는 시전 동작 */
const _tryCastGH=tryCastSkill;
tryCastSkill=function(p,slot){const was=p.state;_tryCastGH(p,slot);
  if(p.state==='pskill'&&was!=='pskill'&&p.sk){const K=KIT[p.h.id],ps=K&&K.skp&&K.skp[p.sk.s.ty];if(ps)p.skPose=ps}};

/* ================= 미리보기 ================= */
const _pvItemsGH=pvItems;
pvItems=function(ps){const L=_pvItemsGH(ps),K=KIT[HEROES[ps.hero].id];if(!K)return L;
  for(const it of L)if(it.kind==='gcmd'){const nm=K.n[it.id],D=GCMD[it.id],mv={blink:'축지(순간이동)',spin:'회전 돌진',volley:'백스텝 연사',cast:'제자리 시전',shoot:'공중 사격',stomp:'진각',dash:'돌진',slam:'내려찍기',leap:'도약 강타'}[K.mo[it.id]];
    it.n=`${nm[0]} (${nm[1]})`;it.sub=`커맨드 기술 · ${D.seq} · 기력 ${D.cost} · ${mv}`;it.col=K.c1}
  for(const it of L)if(it.kind==='sp')it.col=K.c1;
  return L};
const _pvResetGH=pvReset;
pvReset=function(){_pvResetGH();PV.mem={};PV.hero.facing=1;PV.ghF=null};
function ghCtxPV(){const H=PV.hero;return{
  f:1,y:PV_GY,add:pvAdd,em:pvEm,px:()=>H.x,L:PV_X,R:PV_X+PV_W,midY:()=>PV_GY-10,rndY:()=>PV_GY+rnd(-20,20),mem:PV.mem,
  foes:()=>PV.d.map(d=>({x:d.x,y:d.y,d})),
  hit:(x,y,rx,ry,k,kn)=>pvHit(d=>Math.abs(d.x-x)<rx&&Math.abs(d.y-y)<ry+20&&d.hurt<6,kn),hitAll:(k,kn)=>pvHit(()=>true,kn),
  later:(d,fn)=>PV.later.push({t:PV.t+d,fn}),shake(){},flash:(col,n)=>{PV.flash=Math.max(PV.flash||0,n*.6)},sfx(){},
  move:dx=>{H.x=clamp(H.x+dx,PV_X+30,PV_X+PV_W-30)},z:v=>{H.z=v*.5},face:f=>{H.facing=f},after(){},push(){},pull(){},
  kanji:(t,col,size)=>pvAdd({k:'kanji',x:PV_X+PV_W/2,y:PV_GY-40,z:140,txt:t,col,size:Math.min(64,size*.8),dur:60,life:60})}}
const _pvScriptGH=pvScript;
pvScript=function(){
  const it=PV.L[PV.k],H=PV.hero,K=KIT[H.h.id];GP_KIT=K||null;GP_F=1;
  try{
    if(it.kind==='sp'&&K){const t=PV.t;H.anim++;
      if(t<30){H.state='skill';H.t=t;PV.dim=Math.min(1,t/10);if(t%2===0)K.amb(pvEm,H.x,H.y);if(t===2)K.ground(pvAdd,pvEm,H.x,H.y,false);return}
      if(t<110){const ft=t-30;K.fin(ghCtxPV(),ft);const o=K.fp(ft);H.state=o.st;H.t=o.t!=null?o.t:ft;if(o.combo)H.combo=o.combo;if(o.st==='jump')H.jatk=false;return}
      H.state='idle';H.t=0;H.z=0;H.facing=1;H.x+=(PV_X+130-H.x)*.2;PV.dim=Math.max(0,(PV.dim||0)-.05);return}
    if(it.kind==='gcmd'&&K){const t=PV.t,o=ghCmdPose(K,it.id,Math.min(t,46));const r=_pvScriptGH();if(o&&t<46){H.state=o.st;if(o.t!=null)H.t=o.t;if(o.combo)H.combo=o.combo}return r}
    return _pvScriptGH();
  }finally{GP_KIT=null}
};

/* 필살기 설명 (미리보기) */
const KIT_FD={guan:'청룡이 하늘로 솟구쳤다가 적마다 내리꽂히며 언월 초승달을 새기고, 마지막에 화면을 가르는 거대한 초승달 일섬',
 zhang:'장판교의 대갈 — 앞으로 퍼지는 포효 충격파 네 번이 적을 밀어내고, 「喝」 한 마디에 땅이 솟구친다',
 zhao:'백룡처럼 화면을 세 번 왕복 돌진하며 꿰뚫은 뒤, 열두 갈래 창빛으로 마무리',
 huang:'하늘을 덮는 불화살 비가 쏟아지고, 꽂힌 자리마다 불기둥이 치솟는다',
 zhuge:'화면 가득 팔괘진을 펼쳐 여덟 방위에 차례로 낙뢰, 마지막에 진 중앙에 천뢰',
 ma:'거대한 서량 선풍이 앞으로 나아가며 적을 빨아들이고, 끝에서 터지며 띄운다',
 diao:'보름달이 떠오르고 꽃잎이 휘몰아치며 적을 홀린 뒤, 달빛 초승달로 베어낸다',
 wei:'앞으로 행진하는 불기둥 아홉 개, 이어서 땅이 갈라지며 거대한 화염 폭발',
 lubu:'적토의 기세로 쉼 없이 몰아치는 붉은 난도질, 마지막에 화면을 세로로 가르는 방천화극',
 xu:'대부를 내리쳐 땅을 길게 가르고, 갈라진 자리를 따라 바위 가시가 차례로 솟는다',
 gan:'쇠사슬 채찍이 적들을 하나로 묶어 방울 소리와 함께 감전시키고, 금빛 폭풍으로 마무리',
 sun:'공중으로 높이 뛰어올라 회전하며 사방으로 화살을 퍼붓고, 착지와 함께 화살 고리 폭발'};
const _pvItemsGH2=pvItems;
pvItems=function(ps){const L=_pvItemsGH2(ps),id=HEROES[ps.hero].id;for(const it of L)if(it.kind==='sp'&&KIT_FD[id])it.f=KIT_FD[id]+' (본래 기술 뒤에 이어지는 무장 고유 피날레)';return L};
