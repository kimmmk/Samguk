'use strict';
/* ===== 블록(복셀) 캐릭터 렌더러 — 마인크래프트/로블록스 스타일 =====
   캐릭터 공간: x=캐릭터의 오른쪽, y=위, z=정면. 1유닛 = 3px (픽셀 텍스처 1텍셀 = 1유닛)
   각 파츠는 상자이며, 면마다 픽셀 텍스처를 아핀 변환으로 입혀 그린다. */
function rotX(a){const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,c,-s,0,s,c]}
function rotY(a){const c=Math.cos(a),s=Math.sin(a);return[c,0,s,0,1,0,-s,0,c]}
function rotZ(a){const c=Math.cos(a),s=Math.sin(a);return[c,-s,0,s,c,0,0,0,1]}
function mm(A,B){const r=new Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)r[i*3+j]=A[i*3]*B[j]+A[i*3+1]*B[3+j]+A[i*3+2]*B[6+j];return r}
function mv(M,v){return[M[0]*v[0]+M[1]*v[1]+M[2]*v[2],M[3]*v[0]+M[4]*v[1]+M[5]*v[2],M[6]*v[0]+M[7]*v[1]+M[8]*v[2]]}
const I3=[1,0,0,0,1,0,0,0,1];
const tf=(M,t)=>({M,t:t||[0,0,0]});
function comp(A,B){const b=mv(A.M,B.t);return{M:mm(A.M,B.M),t:[b[0]+A.t[0],b[1]+A.t[1],b[2]+A.t[2]]}}
function piv(p,R){const r=mv(R,p);return{M:R,t:[p[0]-r[0],p[1]-r[1],p[2]-r[2]]}}
const tr=(x,y,z)=>({M:I3,t:[x,y,z]});
const VTH=42*Math.PI/180,VPH=15*Math.PI/180;
const VIEW=mm(rotX(VPH),[Math.sin(VTH),0,Math.cos(VTH),0,1,0,-Math.cos(VTH),0,Math.sin(VTH)]);
const LIGHT=(()=>{const v=[-.45,.8,.5],l=Math.hypot(v[0],v[1],v[2]);return v.map(a=>a/l)})();
const FACES=[
 {n:[0,0,1],k:'front',q:(a,b)=>[[b[0],b[1],b[2]],[a[0],b[1],b[2]],[b[0],a[1],b[2]]]},
 {n:[0,0,-1],k:'back',q:(a,b)=>[[a[0],b[1],a[2]],[b[0],b[1],a[2]],[a[0],a[1],a[2]]]},
 {n:[1,0,0],k:'right',q:(a,b)=>[[b[0],b[1],b[2]],[b[0],b[1],a[2]],[b[0],a[1],b[2]]]},
 {n:[-1,0,0],k:'left',q:(a,b)=>[[a[0],b[1],a[2]],[a[0],b[1],b[2]],[a[0],a[1],a[2]]]},
 {n:[0,1,0],k:'top',q:(a,b)=>[[a[0],b[1],a[2]],[b[0],b[1],a[2]],[a[0],b[1],b[2]]]},
 {n:[0,-1,0],k:'bottom',q:(a,b)=>[[a[0],a[1],b[2]],[b[0],a[1],b[2]],[a[0],a[1],a[2]]]}];

/* ---------- 픽셀 텍스처 ---------- */
const TEX_R=6;/* 텍스처 세밀화 배율 (HD) */
function mkTex(w,h,fn,o){const c=mkC(w,h,true);fn(c.getContext('2d'),c.width,c.height);return refineCanvas(c,TEX_R,Object.assign({grain:10,hl:14,sh:18,th:40,seed:w*7+h*13},o))}
function tp(g,x,y,col){g.fillStyle=col;g.fillRect(x,y,1,1)}
function trc(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(x,y,w,h)}
function tnoise(g,w,h,col,amt,seed){for(let y=0;y<h;y++)for(let x=0;x<w;x++)tp(g,x,y,shade(col,Math.round((hash(x*31+y*17+seed)-.5)*amt)))}
const MATC=new Map();
function matTex(col,w,h,kind){
  const tw=Math.max(1,Math.round(w)),th=Math.max(1,Math.round(h)),key=col+kind+tw+'x'+th;
  let c=MATC.get(key);if(c)return c;
  c=mkTex(tw,th,(g,w,h)=>{
    tnoise(g,w,h,col,kind==='glow'?0:16,tw*7+th*3);
    if(kind==='metal'){for(let x=0;x<w;x++){tp(g,x,0,shade(col,45));if(h>2)tp(g,x,h-1,shade(col,-45))}if(w>2&&h>2)tp(g,1,1,'#ffffff')}
    if(kind==='wood')for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(hash(x*3+y*11)<.25)tp(g,x,y,shade(col,-22));
  },{metal:kind==='metal',grain:kind==='glow'?0:10});
  MATC.set(key,c);return c;
}
function boxTex(b,col,kind){const dx=b[3]-b[0],dy=b[4]-b[1],dz=b[5]-b[2];
  return{front:matTex(col,dx,dy,kind),back:matTex(col,dx,dy,kind),left:matTex(col,dz,dy,kind),right:matTex(col,dz,dy,kind),
    top:matTex(shade(col,18),dx,dz,kind),bottom:matTex(shade(col,-18),dx,dz,kind)}}

/* HD 얼굴: 흰자 · 눈동자 · 하이라이트 · 눈꺼풀 · 눈썹 · 코 · 입 · 볼 (TEX_R 해상도에서 덧그림) */
function hdFace(c,L){
  const g=c.getContext('2d'),k=TEX_R/6,sk=L.skin,fem=L.face==='female',fierce=L.face==='fierce';
  const P=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x*k),Math.round(y*k),Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k)))};
  for(const [ex,fl] of[[6,0],[30,1]]){
    P(ex+1,24,10,5,'#f6f2ea');P(ex+(fl?2:6),24,4,5,fem?'#3a1a2a':'#1a120c');P(ex+(fl?3:7),24,2,2,'#ffffff');
    P(ex,23,12,1,shade(sk,-70));P(ex+1,29,10,1,shade(sk,-30));
    if(fem){P(ex-1,22,3,1,'#1a1010');P(ex+10,22,3,1,'#1a1010');P(ex+11,23,2,1,'#1a1010')}}
  if(fierce)for(let i=0;i<11;i++){P(5+i,18+Math.floor(i*.4),1,2,'#0a0808');P(43-i,18+Math.floor(i*.4),1,2,'#0a0808')}
  else{const bc=shade(L.hair||'#1a1410',-8);P(7,20,10,2,bc);P(31,20,10,2,bc)}
  P(23,30,2,6,shade(sk,-24));P(21,36,6,1,shade(sk,-38));P(22,31,1,4,shade(sk,18));
  const beard=L.beard&&L.beard!=='short';
  if(fem){P(20,39,8,2,'#d02858');P(21,39,6,1,'#ff7090');P(6,32,6,2,'rgba(255,110,140,.5)');P(36,32,6,2,'rgba(255,110,140,.5)')}
  else if(!beard){P(19,40,10,1,shade(sk,-75));P(20,41,8,1,shade(sk,-20));if(fierce){P(18,39,2,1,shade(sk,-75));P(28,39,2,1,shade(sk,-75))}}
  if(!fem){P(5,33,4,1,shade(sk,-20));P(39,33,4,1,shade(sk,-20))}
}
/* HD 옷: 주름 · 바느질 · 리벳 */
function hdCloth(c,L){
  const g=c.getContext('2d'),w=c.width,h=c.height,a=L.armor||'cloth';
  if(a==='plate'){g.fillStyle='rgba(255,250,220,.6)';for(let y=Math.round(h*.2);y<h*.58;y+=Math.max(3,Math.round(h/14)))for(let x=2;x<w-1;x+=Math.max(4,Math.round(w/6)))g.fillRect(x,y,1,1)}
  else{for(let i=0;i<4;i++){const x0=w*(.18+i*.21);for(let y=Math.round(h*.6);y<h;y++){g.fillStyle='rgba(0,0,0,.2)';g.fillRect(Math.round(x0+Math.sin(y*.35+i)*1.6),y,1,1);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(Math.round(x0+1+Math.sin(y*.35+i)*1.6),y,1,1)}}
    for(let i=0;i<3;i++){const y0=h*(.22+i*.1);g.fillStyle='rgba(0,0,0,.14)';for(let x=0;x<w;x++)g.fillRect(x,Math.round(y0+Math.sin(x*.25+i)*1.2),1,1)}}
  g.fillStyle='rgba(255,240,200,.4)';const yb=Math.round(h*7/12)-1;for(let x=1;x<w;x+=3)g.fillRect(x,yb,1,1);
}
function headTexs(L){
  const sk=L.skin,hr=L.hair||'#1a1410',fem=L.face==='female',bc=L.beard==='white'?'#ececec':'#141010';
  const front=mkTex(8,8,g=>{
    tnoise(g,8,8,sk,10,1);
    trc(g,0,0,8,2,hr);tp(g,0,2,hr);tp(g,7,2,hr);
    if(fem){trc(g,0,2,1,5,hr);trc(g,7,2,1,5,hr);trc(g,1,2,2,1,hr)}
    const br=L.face==='fierce'?'#000000':shade(hr,-5);
    tp(g,1,3,br);tp(g,2,3,br);tp(g,5,3,br);tp(g,6,3,br);
    if(L.face==='fierce'){tp(g,3,3,shade(sk,-30));tp(g,4,3,shade(sk,-30))}
    tp(g,1,4,'#f4f4f4');tp(g,2,4,'#1a1020');tp(g,5,4,'#1a1020');tp(g,6,4,'#f4f4f4');
    if(fem){tp(g,1,5,'#f4a0a8');tp(g,6,5,'#f4a0a8');tp(g,3,6,'#d83060');tp(g,4,6,'#d83060');tp(g,1,3,'#1a1010');tp(g,6,3,'#1a1010')}
    else{tp(g,3,5,shade(sk,-25));tp(g,4,5,shade(sk,-25));tp(g,3,6,shade(sk,-55));tp(g,4,6,shade(sk,-55))}
    if(L.beard==='long'||L.beard==='white'){tp(g,2,6,bc);tp(g,5,6,bc);trc(g,1,7,6,1,bc)}
    if(L.beard==='spiky'){trc(g,0,6,8,2,bc);tp(g,0,5,bc);tp(g,7,5,bc);tp(g,3,6,'#6a2a2a');tp(g,4,6,'#6a2a2a')}
    if(L.beard==='short'){tp(g,2,6,bc);tp(g,5,6,bc);tp(g,3,7,bc);tp(g,4,7,bc)}
  });
  const side=flip=>mkTex(8,8,g=>{
    tnoise(g,8,8,sk,10,2);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const bx=flip?7-x:x;
      if(y<2||(bx<(fem?6:4)&&y<(fem?8:6)))tp(g,x,y,shade(hr,Math.round((hash(x+y*9)-.5)*16)))}
    tp(g,flip?3:4,4,shade(sk,-28));
    if(L.beard&&L.beard!=='short')for(let y=5;y<8;y++){tp(g,flip?0:7,y,bc);tp(g,flip?1:6,y,bc)}
  });
  hdFace(front,L);
  return{front,back:mkTex(8,8,g=>tnoise(g,8,8,hr,16,3)),left:side(false),right:side(true),
    top:mkTex(8,8,g=>tnoise(g,8,8,hr,16,4)),bottom:mkTex(8,8,g=>tnoise(g,8,8,shade(sk,-20),8,5))};
}
function bodyTexs(L){
  const b=L.body,s=L.sub,sk=L.skin,a=L.armor||'cloth',pn=L.pants||'#333333';
  const paint=(g,w,h,isFront)=>{
    if(a==='bare'){tnoise(g,w,h,sk,10,11);
      if(isFront){trc(g,1,2,2,1,shade(sk,-28));trc(g,5,2,2,1,shade(sk,-28));tp(g,3,4,shade(sk,-22));tp(g,4,4,shade(sk,-22));tp(g,3,6,shade(sk,-22));tp(g,4,6,shade(sk,-22))}
      trc(g,0,7,w,2,s);if(isFront)trc(g,3,7,2,2,'#e8c040');trc(g,0,9,w,3,pn);return}
    tnoise(g,w,h,b,14,12+w);
    if(a==='plate'){
      trc(g,0,0,w,2,s);if(isFront)trc(g,3,0,2,1,sk);
      for(let y=2;y<7;y++)for(let x=0;x<w;x++){if(y%2===1)tp(g,x,y,shade(b,-24));else if(x%2===0)tp(g,x,y,shade(b,24))}
      if(isFront){trc(g,3,3,2,2,s);tp(g,3,3,'#fff8d0')}
      trc(g,0,7,w,2,L.belt||s);if(isFront)trc(g,3,7,2,2,L.belt?shade(L.belt,60):'#f0d050');
      for(let y=9;y<12;y++)for(let x=0;x<w;x++)tp(g,x,y,x%2?shade(b,-38):shade(b,-20));
    }else if(a==='robe'){
      if(isFront){trc(g,3,0,2,2,sk);for(let y=0;y<5;y++){tp(g,Math.max(0,2-y),y,s);tp(g,Math.min(7,5+y),y,s)}trc(g,3,8,2,4,s)}
      trc(g,0,7,w,1,L.belt||shade(s,-35));if(isFront)tp(g,4,7,L.belt?shade(L.belt,60):'#e8c040');
      for(let y=9;y<12;y++)tp(g,0,y,shade(b,-25));
    }else if(a==='dress'){
      if(isFront)trc(g,2,0,4,2,sk);
      trc(g,0,5,w,2,s);if(isFront)tp(g,4,5,'#ffffff');
      for(let y=7;y<12;y++)for(let x=0;x<w;x++)if(hash(x*5+y*3+w)<.18)tp(g,x,y,'#ffe0f0');
    }else{
      if(isFront){trc(g,3,0,2,1,sk);for(let y=0;y<4;y++)tp(g,2+y,y,s);tp(g,5,1,s)}
      trc(g,0,7,w,1,L.belt||'#5a3a1a');if(isFront)tp(g,3,7,L.belt?shade(L.belt,60):'#c0a040');
      for(let y=8;y<12;y++)tp(g,(y%2)?1:Math.min(w-1,6),y,shade(b,-25));
    }
  };
  const front=mkTex(8,12,(g,w,h)=>paint(g,w,h,true)),side=mkTex(4,12,(g,w,h)=>paint(g,w,h,false)),back=mkTex(8,12,(g,w,h)=>paint(g,w,h,false));
  hdCloth(front,L);hdCloth(back,L);hdCloth(side,L);
  return{front,back,left:side,right:side,top:matTex(a==='plate'?s:(a==='bare'?sk:b),8,4,'solid'),bottom:matTex(pn,8,4,'solid')};
}
function armTexs(L){
  const b=L.body,s=L.sub,sk=L.skin,a=L.armor||'cloth';
  const f=mkTex(4,12,g=>{
    if(a==='bare'){tnoise(g,4,12,sk,10,21);trc(g,0,7,4,2,s)}
    else{tnoise(g,4,12,b,14,21);
      if(a==='plate'){trc(g,0,0,4,3,s);for(let x=0;x<4;x++)tp(g,x,3,shade(s,-35));trc(g,0,7,4,3,shade(s,-8));for(let x=0;x<4;x+=2)tp(g,x,8,shade(s,30))}
      else if(a==='robe'||a==='dress')trc(g,0,8,4,2,s);
      else trc(g,0,8,4,2,shade(b,-28));
    }
    if(L.glove){trc(g,0,9,4,3,L.glove);for(let x=0;x<4;x++)tp(g,x,9,shade(L.glove,40))}else trc(g,0,10,4,2,sk);
  });
  return{front:f,back:f,left:f,right:f,top:matTex(a==='plate'?s:(a==='bare'?sk:b),4,4,'solid'),bottom:matTex(L.glove||sk,4,4,'solid')};
}
function legTexs(L){
  const pn=L.pants||'#333333',bt=L.boots||'#222222';
  const f=mkTex(4,12,g=>{tnoise(g,4,12,pn,12,31);trc(g,0,6,4,1,shade(pn,-28));
    for(let y=8;y<12;y++)for(let x=0;x<4;x++)tp(g,x,y,shade(bt,Math.round((hash(x+y*5)-.5)*14)));
    for(let x=0;x<4;x++)tp(g,x,8,shade(bt,35));});
  return{front:f,back:f,left:f,right:f,top:matTex(pn,4,4,'solid'),bottom:matTex(shade(bt,-25),4,4,'solid')};
}

/* ---------- 모델 조립 ---------- */
const WTIP={glaive:38,spear:35,snake:37,halberd:37,sword:15,dao:16,fan:11,staff:29,mace:15,bow:9,bigdao:31};
function hats(L,box){
  const helm=(col)=>{box([-4.6,29.3,-4.6,4.6,33,4.6],col,'head','metal');box([-4.75,25,-4.75,-4.15,29.5,0],col,'head','metal');
    box([4.15,25,-4.75,4.75,29.5,0],col,'head','metal');box([-4.75,25,-4.75,4.75,29.5,-4.15],col,'head','metal')};
  switch(L.hat){
    case'guan':box([-4.5,30,-4.5,4.5,33,4.5],'#2f7d3b','head');box([-4.65,29.4,-4.65,4.65,30.3,4.65],'#d4af37','head','metal');box([-1.5,25,-5.7,1.5,31,-4.5],'#2f7d3b','head');break;
    case'zhang':box([-4.4,31,-4.4,4.4,32.6,4.4],'#111111','head');box([-3.5,32,-3,-1.5,34.5,-1],'#111111','head');box([.5,32,-4,2.5,35.2,-2],'#111111','head');
      box([-1,32,-1,1,34,1],'#111111','head');box([2,31.5,0,3.8,33.8,2],'#111111','head');box([-4.55,29.4,-4.55,4.55,30.6,4.55],'#b03a2e','head');break;
    case'zhao':helm('#c8d2dc');box([-.8,33,-1,.8,36.5,1],'#d02828','head');box([-.8,34.8,-4.2,.8,36.5,-1],'#d02828','head');box([-.6,32.4,3.8,.6,33.6,4.9],'#e0c040','head','metal');break;
    case'huang':helm('#8a5a22');box([-.3,33,-.3,.3,36.5,.3],'#e0c040','head','metal');box([-.9,36,-.9,.9,37,.9],'#c02020','head');break;
    case'zhuge':box([-4.4,30.8,-4.4,4.4,32,4.4],'#1c1c24','head');box([-3,31.5,-3,3,37,3],'#1c1c24','head');box([-3.1,33,-3.1,3.1,33.8,3.1],'#e9e4d0','head');break;
    case'ma':helm('#e0e4ec');box([-1.1,32.6,-2,1.1,34.6,3.4],'#c9a227','head','metal');box([-2.4,31.5,3.6,2.4,33,4.9],'#c9a227','head','metal');
      box([-.8,31,-8,.8,33,-4],'#f8f8f8','head');box([-.7,27.5,-10.5,.7,31.5,-7],'#f8f8f8','head');break;
    case'diao':box([-4.4,31,-4.4,4.4,33,4.4],L.hair,'head');box([-4.5,18,-4.7,4.5,32,-3.4],L.hair,'head');
      box([-5.8,30,-1.5,-4,33.5,1.5],L.hair,'head');box([4,30,-1.5,5.8,33.5,1.5],L.hair,'head');box([-1.6,33,-1.6,1.6,35.2,1.6],L.hair,'head');
      box([-6.5,33.5,-.3,-1,34.1,.3],'#ffd86a','head','metal');box([-7,33.2,-.7,-6,34.4,.7],'#ff6aa0','head');break;
    case'wei':helm('#4a1a1a');box([-4.2,32.5,-.6,-3.2,36.8,.6],'#d8c8a0','head');box([3.2,32.5,-.6,4.2,36.8,.6],'#d8c8a0','head');box([-2,31.5,3.8,2,33,4.9],'#c02020','head');break;
    case'lubu':helm('#d8b040');box([-1.2,31.6,3.6,1.2,34,4.9],'#c02020','head');box([-2,33,-2,2,34.2,2],'#c02020','head');
      box([-2.4,32.5,-.4,-1.6,53,.4],'#f0e0b0','head',null,{p:[-2,32.5,0],r:[-.95,0,-.1]});
      box([1.6,32.5,-.4,2.4,53,.4],'#f0e0b0','head',null,{p:[2,32.5,0],r:[-.85,0,.1]});break;
    case'scarf':box([-4.4,30.6,-4.4,4.4,32.4,4.4],L.hair,'head');box([-4.55,29,-4.55,4.55,30.7,4.55],'#e8c020','head');box([-1.5,24.5,-5.9,1.5,29.6,-4.5],'#e8c020','head');break;
    case'helm':helm(L.helmc||shade(L.body,-28));box([-.45,33,-.45,.45,35.2,.45],L.sub,'head','metal');break;
    case'helm2':helm(L.helmc||'#b89030');box([-.6,33,-3,.6,36.2,3],'#c02020','head');break;
    case'crown':box([-3.6,31.4,-3.6,3.6,35,3.6],'#1a1a2a','head');box([-5.6,35,-3.2,5.6,35.8,3.2],'#d8b040','head','metal');
      for(let i=0;i<5;i++)box([-5+i*2.4,32.4,2.9,-4.5+i*2.4,35,3.3],'#e8e0c0','head');break;
    case'taoist':box([-4.45,30.5,-4.45,4.45,32,4.45],'#1a1a1a','head');box([-2,32,-2,2,35,2],L.sub,'head');box([-.4,31,-2.3,.4,36.2,2.3],'#e0c040','head','metal');break;
    case'none':box([-4.3,31,-4.3,4.3,32.3,4.3],L.hair,'head');box([-1.5,32,-1.5,1.5,34.6,1.5],L.hair,'head');break;
  }
}
function beards(L,box){
  const bc=L.beard==='white'?'#ececec':'#141010';
  if(L.beard==='long'||L.beard==='white'){box([-2.5,17,3.6,2.5,25.2,4.8],bc,'head');box([-1.5,14,3.8,1.5,17.2,4.6],bc,'head')}
  else if(L.beard==='spiky'){box([-4.35,23,2,4.35,26.6,4.75],bc,'head');box([-3,21.4,3,3,23.2,4.6],bc,'head')}
  else if(L.beard==='short')box([-1,22.4,3.8,1,24.6,4.6],bc,'head');
}
function weaponParts(L,box,T){
  const met=L.metal||'#dfe6ee',wood=L.wood||'#5a3a1a';
  switch(L.weapon){
    case'glaive':box([-.5,-27,-.5,.5,9,.5],wood,T,'wood');box([-.85,-27,-1.1,.85,-25,1.1],'#d4af37',T,'metal');
      box([-.3,-36,-.9,.3,-27,2.7],L.metal||'#d6f2e0',T,'metal');box([-.3,-38.8,.8,.3,-35,3.5],L.metal||'#d6f2e0',T,'metal');box([-.35,-30,-1.8,.35,-27.5,-.6],'#2f7d3b',T);break;
    case'spear':box([-.5,-28,-.5,.5,8,.5],L.wood||'#6b4a2a',T,'wood');box([-.3,-34.5,-1,.3,-28,1],met,T,'metal');box([-.3,-35.8,-.4,.3,-34.5,.4],met,T,'metal');box([-.8,-28.6,-.8,.8,-27,.8],'#c02020',T);break;
    case'snake':box([-.5,-28,-.5,.5,8,.5],'#2a2a2a',T,'wood');box([-.3,-31,-.5,.3,-28,1.3],met,T,'metal');box([-.3,-34,-1.3,.3,-31,.5],met,T,'metal');box([-.3,-37.5,-.4,.3,-34,1],met,T,'metal');break;
    case'halberd':box([-.5,-30,-.5,.5,9,.5],'#4a1010',T,'wood');box([-.3,-37.5,-.8,.3,-30,.8],met,T,'metal');
      box([-.3,-31.5,.5,.3,-27.5,4],met,T,'metal');box([-.3,-31.5,-4,.3,-27.5,-.5],met,T,'metal');box([-.3,-30.5,3,.3,-26,4.3],met,T,'metal');box([-.85,-30,-.85,.85,-28.4,.85],'#e0c040',T,'metal');break;
    case'sword':box([-.5,-1,-.5,.5,2.6,.5],'#6b3b12',T);box([-.7,-1.6,-1.8,.7,-1,1.8],'#d4af37',T,'metal');box([-.25,-15,-.7,.25,-1.6,.7],met,T,'metal');break;
    case'dao':box([-.5,-1,-.5,.5,3,.5],'#6b3b12',T);box([-.7,-1.6,-1.5,.7,-1,1.5],'#d4af37',T,'metal');box([-.25,-15,-.6,.25,-1.6,1.7],met,T,'metal');box([-.25,-16.6,.2,.25,-15,1.7],met,T,'metal');break;
    case'bigdao':box([-.5,-18,-.5,.5,9,.5],wood,T,'wood');box([-.3,-29,-.6,.3,-18,3.1],met,T,'metal');box([-.3,-31.2,.6,.3,-29,3.3],met,T,'metal');box([-.75,-18.6,-1,.75,-17,1],'#c02020',T);break;
    case'fan':box([-.4,-3,-.4,.4,1.6,.4],'#6b4a2a',T,'wood');box([-.2,-11,-3.6,.2,-3,3.6],L.fanc||'#f4f2ea',T);box([-.25,-11.6,-2.6,.25,-10.6,2.6],'#dcd8cc',T);break;
    case'staff':box([-.5,-25,-.5,.5,6,.5],'#6b4a2a',T,'wood');box([-.5,-28.6,-1.9,.5,-25,-1.2],'#e0c040',T,'metal');box([-.5,-28.6,1.2,.5,-25,1.9],'#e0c040',T,'metal');
      box([-.5,-29.2,-1.9,.5,-28.4,1.9],'#e0c040',T,'metal');box([-.45,-27.6,-.45,.45,-26,.45],'#ffe28a',T,'glow');break;
    case'mace':box([-.5,-9,-.5,.5,2,.5],'#4a3018',T,'wood');box([-2.2,-14.5,-2.2,2.2,-9,2.2],'#3a3a3a',T,'metal');box([-.5,-15.6,-.5,.5,-14.5,.5],'#999999',T,'metal');
      box([-2.9,-12.5,-.5,2.9,-11,.5],'#999999',T,'metal');box([-.5,-12.5,-2.9,.5,-11,2.9],'#999999',T,'metal');break;
    case'bow':box([-.4,-2,-.4,.4,2,.4],'#6b3b12',T,'wood');box([-.4,-9,-1.7,.4,-2,-.6],'#6b3b12',T,'wood');box([-.4,2,-1.7,.4,9,-.6],'#6b3b12',T,'wood');box([-.1,-9,-2.1,.1,9,-1.9],'#dddddd',T);break;
  }
}
function buildModel(L){
  const P=[];
  const add=(b,tex,T,rot)=>P.push({b,tex,T,rot});
  const box=(b,col,T,kind,rot)=>add(b,boxTex(b,col,kind||'solid'),T,rot);
  const leg=legTexs(L),arm=armTexs(L);
  add([-4,0,-2,0,12,2],leg,'legL');add([0,0,-2,4,12,2],leg,'legR');
  add([-4,12,-2,4,24,2],bodyTexs(L),'root');
  add([-4,24,-4,4,32,4],headTexs(L),'head');
  add([-8,12,-2,-4,24,2],arm,'armL');add([4,12,-2,8,24,2],arm,'armR');
  if(L.armor==='dress'){box([-4.7,3,-2.7,4.7,13,2.7],L.body,'root');box([-4.8,3,-2.8,4.8,4,2.8],L.sub,'root','metal')}
  if(L.armor==='robe')box([-4.5,3.5,-2.5,4.5,13,2.5],L.body,'root');
  if(L.cape)box([-4,8.5,-3.1,4,23.5,-2.35],L.cape,'cape');
  if(L.armor==='plate'){box([-8.7,20.8,-2.7,-3.8,24.7,2.7],L.sub,'armL','metal');box([3.8,20.8,-2.7,8.7,24.7,2.7],L.sub,'armR','metal')}
  hats(L,box);beards(L,box);
  weaponParts(L,box,'weapon');if(L.dual)weaponParts(L,box,'weapon2');
  return{P,tip:WTIP[L.weapon]||20};
}
const MODELC=new Map();
function getModel(L){
  const k=[L.skin,L.hair,L.body,L.sub,L.pants,L.boots,L.hat,L.beard,L.weapon,L.armor,L.cape,L.face,L.dual,L.metal,L.wood,L.glove,L.belt,L.helmc,L.fanc].join('|');
  let m=MODELC.get(k);if(!m){m=buildModel(L);MODELC.set(k,m)}return m;
}

/* ---------- 외곽선 렌더 (Pixelorama 스타일 1px 실루엣 외곽선) ---------- */
const OUT_C=mkC(2,2),OUT_S=mkC(2,2);
function renderModelOutlined(g,L,pose,sx,sy,scale,facing,opt,oc){
  const u=3*scale*(L.scale||1),bw=Math.ceil(u*96),bh=Math.ceil(u*90),ox=bw/2,oy=Math.ceil(u*74);
  if(OUT_C.width<bw*PR||OUT_C.height<bh*PR){OUT_C.width=OUT_S.width=Math.max(OUT_C.width,bw*PR);OUT_C.height=OUT_S.height=Math.max(OUT_C.height,bh*PR)}
  const o=OUT_C.getContext('2d'),s=OUT_S.getContext('2d'),pw=bw*PR,ph=bh*PR;
  o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,pw,ph);o.setTransform(PR,0,0,PR,0,0);o.imageSmoothingEnabled=false;
  const r=renderModel(o,L,pose,ox,oy,scale,facing,opt);
  s.setTransform(1,0,0,1,0,0);s.globalCompositeOperation='source-over';s.clearRect(0,0,pw,ph);s.drawImage(OUT_C,0,0,pw,ph,0,0,pw,ph);
  s.globalCompositeOperation='source-in';s.fillStyle=oc||'#140a06';s.fillRect(0,0,pw,ph);s.globalCompositeOperation='source-over';
  const dx=sx-ox,dy=sy-oy,d=1/PR;
  for(const [ax,ay] of[[-d,0],[d,0],[0,-d],[0,d]])g.drawImage(OUT_S,0,0,pw,ph,dx+ax,dy+ay,bw,bh);
  g.drawImage(OUT_C,0,0,pw,ph,dx,dy,bw,bh);
  return{tx:r.tx+dx,ty:r.ty+dy,mx:r.mx+dx,my:r.my+dy};
}

/* ---------- 렌더 ---------- */
function renderModel(g,L,pose,sx,sy,scale,facing,opt){
  opt=opt||{};
  const m=getModel(L),u=3*scale*(L.scale||1);
  let root;
  if(pose.lie)root=comp(tr(0,2.6,0),tf(rotX(-Math.PI/2)));
  else root=comp(tr(0,pose.bob||0,0),comp(tf(rotY(pose.spin||0)),piv([0,12,0],rotX(pose.lean||0))));
  const Ts={root,
    head:comp(root,piv([0,24,0],rotX(pose.head||0))),
    legL:comp(root,piv([-2,12,0],rotX(pose.legL||0))),
    legR:comp(root,piv([2,12,0],rotX(pose.legR||0))),
    cape:comp(root,piv([0,23.5,-2.7],rotX(pose.cape||0)))};
  Ts.armL=comp(comp(root,piv([-6,22,0],mm(rotZ(pose.armLz||0),rotX(pose.armL)))),tr(0,-(pose.ext||0),0));
  Ts.armR=comp(root,piv([6,22,0],mm(rotZ(pose.armRz||0),rotX(pose.armR))));
  Ts.weapon=comp(Ts.armL,comp(tr(-8.6,13,0),tf(rotX(pose.wAng-pose.armL))));
  const w2=pose.wAng2!=null?pose.wAng2:pose.armR-1.3;
  Ts.weapon2=comp(Ts.armR,comp(tr(8.6,13,0),tf(rotX(w2-pose.armR))));
  const fs=[];
  for(const p of m.P){
    let T=Ts[p.T];
    if(p.rot){const r=p.rot.r;T=comp(T,piv(p.rot.p,mm(rotX(r[0]),mm(rotY(r[1]),rotZ(r[2])))))}
    const VM=mm(VIEW,T.M),Vt=mv(VIEW,T.t);
    const a=[p.b[0],p.b[1],p.b[2]],b=[p.b[3],p.b[4],p.b[5]];
    for(const F of FACES){
      const n=mv(VM,F.n);if(n[2]<=.015)continue;
      const q=F.q(a,b),A=mv(VM,q[0]),B=mv(VM,q[1]),C=mv(VM,q[2]);
      const x0=sx+facing*(A[0]+Vt[0])*u,y0=sy-(A[1]+Vt[1])*u;
      const x1=sx+facing*(B[0]+Vt[0])*u,y1=sy-(B[1]+Vt[1])*u;
      const x3=sx+facing*(C[0]+Vt[0])*u,y3=sy-(C[1]+Vt[1])*u;
      const lit=.52+.48*Math.max(0,facing*n[0]*LIGHT[0]+n[1]*LIGHT[1]+n[2]*LIGHT[2]);
      fs.push({tex:p.tex[F.k],a:x1-x0,b:y1-y0,c:x3-x0,d:y3-y0,e:x0,f:y0,z:(B[2]+C[2])/2+Vt[2],lit});
    }
  }
  fs.sort((A,B)=>A.z-B.z);
  const base=g.getTransform();
  g.imageSmoothingEnabled=false;
  for(const f of fs){
    g.setTransform(base.a*f.a+base.c*f.b,base.b*f.a+base.d*f.b,base.a*f.c+base.c*f.d,base.b*f.c+base.d*f.d,
      base.a*f.e+base.c*f.f+base.e,base.b*f.e+base.d*f.f+base.f);
    g.drawImage(f.tex,-.03,-.03,1.06,1.06);
    const dk=(1-f.lit)*.9;
    if(dk>.02){g.fillStyle=`rgba(0,0,0,${dk})`;g.fillRect(-.03,-.03,1.06,1.06)}
    if(opt.flash){g.fillStyle='rgba(255,255,255,.75)';g.fillRect(-.03,-.03,1.06,1.06)}
    if(opt.tint){g.fillStyle=opt.tint;g.fillRect(-.03,-.03,1.06,1.06)}
  }
  g.setTransform(base);
  const tipP=(len)=>{const v=mv(VIEW,(()=>{const q=mv(Ts.weapon.M,[0,-len,0]);return[q[0]+Ts.weapon.t[0],q[1]+Ts.weapon.t[1],q[2]+Ts.weapon.t[2]]})());return[sx+facing*v[0]*u,sy-v[1]*u]};
  const t1=tipP(m.tip),t2=tipP(m.tip*.45);
  return{tx:t1[0],ty:t1[1],mx:t2[0],my:t2[1]};
}

/* ---------- 포즈 ---------- */
const PI=Math.PI;
function easeOut(k){return 1-(1-k)*(1-k)}

/* ===== 무장별 모션 테이블 =====
   kf: [프레임, {포즈}] 키프레임 (지정 안 한 값은 앞 키프레임 값 유지, smoothstep 보간)
   포즈 값: armL/armR 팔 앞뒤 회전(0=아래, -π/2=앞, -π=위), armLz/armRz 팔 옆으로 벌림,
            wAng 무기 절대 각도, spin 몸통 회전(수평 베기), lean 숙임, bob 도약 높이, ext 찌르기 뻗음, legL/legR 다리
   hits: [시작, 끝, {reach 사거리배율, knock 넘어뜨림, around 360°, reset 다단히트, launch 띄우기, kind 타격음}]
   mv: [시작, 끝, 전진속도], fx: 연출 이름, fxAt: 연출 프레임, shoot: 원거리 마무리 프레임 */
const TAU=PI*2;
const MOVES={
  _rise:{kf:[[0,{armL:.3,wAng:.4,lean:.1,legL:-.8,legR:.3}],[9,{armL:-3.2,wAng:-3.4,lean:-.15}]]},
  guan:{
    c1:{dur:18,kf:[[0,{armL:-3.3,wAng:-3.4,lean:-.05,legL:-.3,legR:.3}],[4,{armL:-3.5,wAng:-3.7,lean:-.1}],[9,{armL:-.5,wAng:-.3,lean:.25,legL:-.6,legR:.45}],[18,{armL:-.6,wAng:-.6,lean:.1,legL:-.4,legR:.3}]],hits:[[6,10]],mv:[[5,9,1.5]]},
    c2:{dur:20,kf:[[0,{armL:-1.5,wAng:-1.6,spin:-1.4,lean:.05,legL:-.4,legR:.4}],[4,{spin:-1.6}],[11,{spin:1.2,lean:.2}],[20,{spin:.9,armL:-1.2,wAng:-1.3}]],hits:[[6,11,{reach:1.15}]]},
    c3:{dur:30,kf:[[0,{armL:-3.4,wAng:-3.6,lean:-.2,legL:-.8,legR:.5}],[8,{armL:-3.8,wAng:-4.1,lean:-.25,bob:7,legL:-1,legR:.6}],[13,{armL:-.2,wAng:.1,lean:.45,bob:0,legL:-.8,legR:.6}],[30,{armL:-.3,wAng:-.1,lean:.3}]],
      hits:[[11,15,{knock:true,reach:1.1}]],mv:[[4,12,2.5]],fx:'quake',fxAt:13},
    jatk:{kf:[[0,{armL:-3,wAng:-3.2,lean:0,legL:-1,legR:.6}],[6,{armL:-.4,wAng:-.1,lean:.35}]]},
    datk:{kf:[[0,{armL:-1.5,wAng:-1.5,spin:-1.3,lean:.4,legL:-.9,legR:.6}],[12,{spin:1.3}],[24,{spin:1}]]}},
  zhang:{
    c1:{dur:14,kf:[[0,{armL:-1.5,wAng:-1.55,ext:-2,lean:.05,legL:-.4,legR:.3,armR:-1.2}],[5,{ext:8,lean:.3,armR:-.2}],[14,{ext:0,lean:.1}]],hits:[[4,8]]},
    c2:{dur:18,kf:[[0,{armL:-.2,wAng:-2.8,armR:.3,lean:.1,legL:-.3,legR:.3}],[4,{lean:.6,armR:-.8,armRz:.3,legL:-1,legR:.7,head:.2}],[10,{lean:.55}],[18,{lean:.1,armR:.1,armRz:0,head:0}]],hits:[[4,10,{reach:.65,kind:'blunt'}]],mv:[[3,10,4]]},
    c3:{dur:28,kf:[[0,{armL:-1.5,wAng:-1.6,armLz:-.3,spin:0,legL:-.5,legR:.5,lean:.1}],[22,{spin:TAU+.3}],[28,{spin:TAU}]],
      hits:[[5,12,{around:true}],[13,21,{around:true,knock:true,reset:true}]],fx:'dustring',fxAt:14},
    jatk:{kf:[[0,{armL:-2.8,wAng:-3,armR:-2.6,lean:0}],[6,{armL:-.6,wAng:-.3,lean:.6,legL:-.3,legR:.3}]]},
    datk:{kf:[[0,{lean:.6,armR:-.8,armRz:.3,legL:-1,legR:.7,armL:-.2,wAng:-2.8,head:.2}],[24,{}]],kind:'blunt'},
    rise:{kf:[[0,{armR:.3,armL:-.3,wAng:-2.4,lean:.2,legL:-.6,legR:.3}],[9,{armR:-3.1,lean:-.25,head:-.3}]],kind:'blunt'}},
  zhao:{
    c1:{dur:12,kf:[[0,{armL:-1.5,wAng:-1.55,ext:-1,legL:-.5,legR:.4,lean:.1}],[4,{ext:9,lean:.35}],[12,{ext:0,lean:.1}]],hits:[[3,6]]},
    c2:{dur:18,kf:[[0,{armL:-1.45,wAng:-1.5,ext:0,legL:-.5,legR:.4}],[3,{ext:8,armL:-1.3,wAng:-1.35,lean:.3}],[6,{ext:0}],[9,{ext:9,armL:-1.7,wAng:-1.75,lean:.35}],[12,{ext:0}],[18,{lean:.1}]],hits:[[2,5],[8,11,{reset:true}]]},
    c3:{dur:26,kf:[[0,{armL:-1.5,wAng:-1.5,spin:0,legL:-.4,legR:.4}],[12,{spin:TAU}],[16,{armL:-2.6,wAng:-2.8,ext:7,bob:4,lean:-.15}],[26,{armL:-2.4,wAng:-2.6,ext:0,bob:0}]],
      hits:[[4,11,{around:true}],[13,17,{knock:true,launch:true,reset:true}]]},
    jatk:{kf:[[0,{armL:-1,wAng:-.7,ext:6,lean:.4,legL:-1.1,legR:.7}]]},
    datk:{kf:[[0,{armL:-1.5,wAng:-1.5,ext:0,lean:.5,legL:-1,legR:.7}],[6,{ext:9}],[24,{ext:2}]]},
    rise:{kf:[[0,{armL:-1.2,wAng:-1.2,legL:-.6,legR:.3}],[9,{armL:-3.1,wAng:-3.1,ext:6,lean:-.2}]]}},
  huang:{
    c1:{dur:16,kf:[[0,{armL:-1.5,wAng:-1.5,spin:-1.2,lean:.05,legL:-.4,legR:.3}],[9,{spin:1,lean:.2}],[16,{spin:.8}]],hits:[[4,9]]},
    c2:{dur:18,kf:[[0,{armL:.3,wAng:.5,lean:.15,legL:-.5,legR:.4}],[8,{armL:-3,wAng:-3.3,lean:-.1}],[18,{armL:-2.6,wAng:-2.9}]],hits:[[4,9]]},
    c3:{dur:24,kf:[[0,{armL:-1.5,wAng:-3.1,armR:-1.5,legL:.3,legR:-.3,lean:-.1}],[6,{armR:-1.2,armRz:.25,lean:-.2}],[9,{armR:-1.6,armRz:0,lean:.05}],[24,{armL:-1.3,wAng:-2.8}]],hits:[],mv:[[0,6,-3]],shoot:9},
    jatk:{kf:[[0,{armL:-3,wAng:-3.2,legL:-1,legR:.6}],[6,{armL:-.5,wAng:-.2,lean:.3}]]},
    datk:{kf:[[0,{armL:-1.5,wAng:-1.5,spin:-1,lean:.5,legL:-1.2,legR:.9,bob:-2}],[20,{spin:1}]]}},
  zhuge:{
    c1:{dur:14,kf:[[0,{armL:-1,wAng:-1.8,armR:.2}],[5,{armL:-2,wAng:-2.6,lean:.1}],[14,{armL:-.8,wAng:-1.6}]],hits:[[3,7,{reach:.9,kind:'blunt'}]],fx:'puff',fxAt:5},
    c2:{dur:16,kf:[[0,{armL:-1.5,wAng:-2.2,spin:-1,armR:-.6}],[9,{spin:1,wAng:-2}],[16,{spin:.7}]],hits:[[4,9,{kind:'blunt'}]],fx:'puff',fxAt:8},
    c3:{dur:26,kf:[[0,{armL:-3.1,wAng:-3.1,armR:-.3,head:-.2}],[7,{armL:-3.2,wAng:-3.3,armRz:.8}],[10,{armL:-1.4,wAng:-1.8,lean:.2,armRz:.3,head:0}],[26,{armL:-1.2,wAng:-1.8}]],hits:[],shoot:10},
    jatk:{kf:[[0,{armL:-2.6,wAng:-2.8}],[6,{armL:-.6,wAng:-1.2,lean:.2,legL:-.6,legR:.4}]]},
    datk:{kf:[[0,{armL:-1.5,wAng:-2.3,lean:.5,legL:-.9,legR:.6,armR:-.8}],[24,{}]],kind:'blunt'},
    rise:{kf:[[0,{armL:-.2,wAng:-1.5,legL:-.4,legR:.3}],[9,{armL:-3.2,wAng:-3.2,armRz:.9,armR:-.2}]],kind:'magic'}},
  ma:{
    c1:{dur:16,kf:[[0,{armL:-1.5,wAng:-1.55,ext:-2,legL:-.2,legR:.2}],[6,{ext:9,lean:.45,legL:-1.1,legR:.8}],[16,{ext:0,lean:.15,legL:-.4,legR:.3}]],hits:[[4,8,{reach:1.1}]],mv:[[3,7,3]]},
    c2:{dur:18,kf:[[0,{armL:-1.5,wAng:-1.5,spin:1.2,legL:-.4,legR:.4}],[9,{spin:-1.2,lean:.15}],[18,{spin:-1}]],hits:[[4,9]]},
    c3:{dur:28,kf:[[0,{armL:-2.4,wAng:-2.5,legL:-.6,legR:.4}],[8,{bob:10,armL:-2.8,wAng:-2.9,lean:-.1,legL:-1.1,legR:.6}],[14,{bob:1,armL:-1.2,wAng:-.7,ext:8,lean:.5}],[28,{bob:0,ext:0,armL:-1.3,wAng:-.9,lean:.3}]],
      hits:[[12,16,{knock:true,reach:1.1}]],mv:[[2,13,3]],fx:'dust',fxAt:14},
    jatk:{kf:[[0,{armL:-1.1,wAng:-.8,ext:7,lean:.45,legL:-1,legR:.6}]]},
    datk:{kf:[[0,{armL:-1.5,wAng:-1.5,lean:.5,legL:-.9,legR:.6,ext:5,head:.1}],[24,{}]]}},
  diao:{
    c1:{dur:14,kf:[[0,{armL:-3,wAng:-3.1,armR:-.2,wAng2:-.5,legL:-.3,legR:.3}],[6,{armL:-.4,wAng:-.3,armR:-2.8,wAng2:-3,lean:.2}],[14,{armL:-.6,wAng:-.8,armR:-2.4,wAng2:-2.6}]],hits:[[3,7]]},
    c2:{dur:20,kf:[[0,{armLz:-1.4,armRz:1.4,armL:-.2,armR:-.2,wAng:-1.6,wAng2:-1.6,spin:0}],[16,{spin:TAU*1.25,armLz:-1.5,armRz:1.5}],[20,{spin:TAU,armLz:-.4,armRz:.4}]],
      hits:[[3,9,{around:true}],[10,15,{around:true,reset:true}]]},
    c3:{dur:24,kf:[[0,{legR:.6,lean:-.1,armL:-2,wAng:-2.3,armR:-2,wAng2:-2.3}],[7,{legR:-1.9,legL:.3,lean:-.35,bob:6,armL:-.5,armR:-.5}],[14,{legR:-1.7,bob:4}],[24,{legR:0,legL:0,bob:0,lean:0}]],
      hits:[[7,13,{knock:true,kind:'blunt',reach:.9}]],mv:[[4,12,3.5]]},
    jatk:{kf:[[0,{legR:-1.8,legL:.4,lean:-.3,armL:-2.2,armR:-2.2,wAng:-2.4,wAng2:-2.4}]],kind:'blunt'},
    datk:{kf:[[0,{armL:-2.8,armR:-2.8,wAng:-3,wAng2:-3,lean:.4,legL:-1,legR:.6}],[12,{armL:-.3,armR:-.3,wAng:-.2,wAng2:-.2}],[24,{}]]},
    rise:{kf:[[0,{lean:.2,legL:-.4,legR:.3}],[9,{lean:-1.2,legR:-2,legL:-1.2,armL:-2.8,armR:-2.8,wAng:-3,wAng2:-3}]],kind:'blunt'}},
  wei:{
    c1:{dur:20,kf:[[0,{armL:-1.5,wAng:-1.5,spin:-1.4,legL:-.4,legR:.4}],[4,{spin:-1.6}],[12,{spin:1.1,lean:.25}],[20,{spin:.9}]],hits:[[6,12]]},
    c2:{dur:20,kf:[[0,{armL:.3,wAng:.4,lean:.2,legL:-.5,legR:.4}],[9,{armL:-3.2,wAng:-3.4,lean:-.15}],[20,{armL:-3,wAng:-3.2}]],hits:[[5,10]]},
    c3:{dur:32,kf:[[0,{armL:-3.3,wAng:-3.5,lean:-.2,legL:-.6,legR:.4}],[10,{bob:9,armL:-3.9,wAng:-4.2,lean:-.3,legL:-1.1,legR:.7}],[15,{bob:0,armL:.1,wAng:.4,lean:.5,legL:-.9,legR:.6}],[32,{armL:0,wAng:.3,lean:.35}]],
      hits:[[14,18,{knock:true,reach:1.05}]],mv:[[3,13,2.5]],fx:'fireslam',fxAt:15},
    jatk:{kf:[[0,{armL:-3.4,wAng:-3.6}],[6,{armL:.1,wAng:.3,lean:.5,legL:-.9,legR:.6}]]},
    datk:{kf:[[0,{armL:-3.4,wAng:-3.6,lean:.3,legL:-1,legR:.6}],[12,{armL:-.2,wAng:0,lean:.5}],[24,{}]]}},
  lubu:{
    c1:{dur:16,kf:[[0,{armL:-1.5,wAng:-1.55,ext:-3,legL:-.4,legR:.4,armR:-1.3}],[6,{ext:9,lean:.4,armR:-.4}],[16,{ext:0,lean:.1}]],hits:[[4,8,{reach:1.1}]]},
    c2:{dur:20,kf:[[0,{armL:-1.5,wAng:-1.5,spin:-1.7,legL:-.5,legR:.5}],[11,{spin:1.7,lean:.2}],[20,{spin:1.4}]],hits:[[5,11,{reach:1.2}]]},
    c3:{dur:34,kf:[[0,{armL:-1.5,wAng:-1.5,spin:0,armLz:-.2,lean:.05,legL:-.5,legR:.5}],[26,{spin:TAU*1.5,bob:2}],[34,{spin:TAU*1.5,bob:0}]],
      hits:[[4,11,{around:true}],[12,19,{around:true,reset:true}],[20,26,{around:true,reset:true,knock:true}]],fx:'dustring',fxAt:20},
    jatk:{kf:[[0,{armL:-1,wAng:-.5,ext:6,lean:.5,legL:-1,legR:.6}]]},
    datk:{kf:[[0,{armL:-1.5,wAng:-1.5,spin:-1.6,lean:.4,legL:-1,legR:.7}],[12,{spin:1.6}],[24,{spin:1.4}]]}}
};
/* 누적 키프레임 캐시 + 보간 */
const PBASE={armL:-.35,armR:.1,wAng:-2.5,legL:-.35,legR:.3,lean:0,spin:0,head:0,ext:0,bob:0,armLz:0,armRz:0};
const smooth=k=>k*k*(3-2*k);
function kfAnim(kf,t){
  if(!kf._acc){let prev=Object.assign({},PBASE);kf._acc=kf.map(([ft,v])=>{prev=Object.assign({},prev,v);return[ft,prev]})}
  const F=kf._acc;
  if(t<=F[0][0])return Object.assign({},F[0][1]);
  for(let i=0;i<F.length-1;i++){const[t0,a]=F[i],[t1,b]=F[i+1];
    if(t<t1){const k=smooth((t-t0)/(t1-t0)),o={};for(const key in b){const va=a[key],vb=b[key];o[key]=(va==null||vb==null)?vb:va+(vb-va)*k}return o}}
  return Object.assign({},F[F.length-1][1]);
}
const MOVE_ALIAS={xu:'wei',gan:'zhao',sun:'huang'};
function moveOf(e,name){const M=e.h&&(MOVES[e.h.id]||MOVES[MOVE_ALIAS[e.h.id]]);if(!M)return null;return M[name]||(name==='rise'?MOVES._rise:null)}
function heroPose(e){
  const st=e.state;let mv=null;
  if(st==='attack')mv=moveOf(e,'c'+(e.combo||1));
  else if(st==='dashatk')mv=moveOf(e,'datk');
  else if(st==='rise')mv=moveOf(e,'rise');
  else if(st==='jump'&&e.jatk)mv=moveOf(e,'jatk');
  if(!mv)return null;
  const p=Object.assign({cape:(st==='jump'||st==='dashatk'?.9:.45)+Math.sin((e.anim||0)*.1)*.05,lie:false,wAng2:null},kfAnim(mv.kf,st==='jump'?(e.jt||0):(e.t||0)));
  if(e.look.dual&&p.wAng2==null)p.wAng2=p.armR-1.3;
  return p;
}
function poseOf(e){
  if(e.h&&e.isPlayer!==false){const hp=heroPose(e);if(hp)return hp}
  const L=e.look,wp=L.weapon,st=e.state,t=e.t||0,an=e.anim||0;
  const p={legL:0,legR:0,armL:-.35,armR:.1,wAng:-2.5,ext:0,lean:0,spin:0,head:0,cape:.12+Math.sin(an*.1)*.05,bob:0,lie:false,wAng2:null};
  switch(st){
    case'walk':{const ph=Math.sin(an*.28);p.legL=ph*.75;p.legR=-ph*.75;p.armR=-ph*.6;p.armL=-.35+ph*.15;p.wAng=-2.5+ph*.1;p.bob=Math.abs(ph)*.6;p.cape=.4+Math.abs(ph)*.1;break}
    case'attack':{const c=e.combo||1,k=easeOut(clamp((t-2)/8,0,1));
      p.legL=-.45;p.legR=.35;p.lean=.12*k;
      if((wp==='spear'||wp==='snake'||wp==='halberd')&&c<3){const s=Math.sin(clamp(t/12,0,1)*PI);p.armL=-PI/2;p.wAng=-PI/2;p.ext=s*6;p.armR=.5;p.lean=.22*s}
      else if(c===2){p.armL=-.3-k*2.8;p.wAng=p.armL;p.armR=.5}
      else if(c===3){p.armL=-3.7+k*3.5;p.wAng=p.armL;p.lean=.3*k;p.armR=.6;p.legL=-.7;p.legR=.5}
      else{p.armL=-3.3+k*2.8;p.wAng=p.armL;p.armR=.4}
      if(L.dual){p.armR=p.armL+(c===2?-1:1)*.9;p.wAng2=p.armR}
      break}
    case'jump':p.legL=-1.1;p.legR=.7;p.cape=.9;
      if(e.jatk){p.armL=-.5;p.wAng=-.3;p.lean=.3}else{p.armL=-2.6;p.wAng=-2.9;p.armR=-2.2}break;
    case'hurt':p.lean=-.35;p.armL=-1.2;p.armR=-1.4;p.head=-.3;p.wAng=-2;break;
    case'down':if(e.z>0){p.lean=-1.1;p.armL=-2.5;p.armR=-2.5;p.legL=.5;p.wAng=-2.8}else{p.lie=true;p.armL=-3;p.armR=-2.8;p.wAng=-3}break;
    case'shoot':p.armL=-PI/2;p.wAng=-PI;p.armR=-PI/2+.15;p.legL=-.3;p.legR=.3;break;
    case'skill':p.armL=-2.8+Math.sin(t*.3)*.4;p.wAng=p.armL;p.armR=-2.6;p.head=-.2;p.cape=.5;break;
    case'special':specialPose(e,p,t);break;
    case'win':p.armL=-3;p.wAng=-3.1;p.armR=-.2;p.head=-.1;break;
    case'run':{const ph=Math.sin(an*.45);p.legL=ph*1.1;p.legR=-ph*1.1;p.armR=-ph*.9;p.armL=-.8;p.wAng=-1.7;p.lean=.32;p.bob=Math.abs(ph)*1.2;p.cape=1.1;break}
    case'dashatk':{const s=Math.sin(clamp(t/10,0,1)*PI);p.armL=-PI/2;p.wAng=-PI/2;p.ext=s*7;p.lean=.45;p.legL=-.9;p.legR=.6;p.cape=1.1;break}
    case'rise':{const k=easeOut(clamp(t/9,0,1));p.armL=-.2-k*3.1;p.wAng=p.armL;p.lean=-.15;p.legL=-.9;p.legR=.3;p.cape=.9;break}
    case'spin':p.spin=t*.9;p.armL=-1.2;p.wAng=-PI/2;p.armR=-1.2;p.armLz=-1.1;p.armRz=1.1;p.wAng2=-PI/2;p.cape=1;p.bob=Math.sin(clamp(t/32,0,1)*PI)*3;p.legL=-.5;p.legR=.5;break;
    case'use':{const k=clamp(t/8,0,1);p.armR=-2.8+k*2.2;p.lean=.1;break}
    case'cmd':cmdPose(e,p,t);break;
    default:p.armR=.1+Math.sin(an*.06)*.05;p.bob=Math.sin(an*.06)*.2;
  }
  if(L.dual&&p.wAng2==null)p.wAng2=p.armR-1.3;
  return p;
}
function cmdPose(e,p,t){
  const ty=e.h&&e.h.cmd?e.h.cmd.type:'';p.cape=.8;
  switch(ty){
    case'gwave':case'redslash':case'quake':{const k=easeOut(clamp(t/8,0,1));p.armL=-3.6+k*3.4;p.wAng=p.armL;p.lean=.3*k;p.legL=-.7;p.legR=.5;break}
    case'charge':case'lance':p.armL=-PI/2;p.wAng=-PI/2;p.lean=.5;p.legL=-.9;p.legR=.6;p.cape=1.2;p.ext=5;p.head=.1;break;
    case'flurry':p.armL=-PI/2;p.wAng=-PI/2;p.ext=(t%4<2)?7:0;p.lean=.25;p.legL=-.6;p.legR=.4;break;
    case'triarrow':p.armL=-PI/2;p.wAng=-PI;p.armR=-PI/2+.15;p.legL=-.3;p.legR=.3;break;
    case'fireball':p.armL=-PI/2;p.wAng=-2.4;p.armR=-1.4;p.lean=.15;p.legL=-.4;p.legR=.3;break;
    case'petal':{const k=easeOut(clamp(t/8,0,1));p.armL=-2.8+k*2.4;p.wAng=p.armL;p.armR=-.4-k*1.2;p.spin=t<8?t*.8:0;break}
    default:p.armL=-PI/2;p.wAng=-PI/2;
  }
}
function specialPose(e,p,t){
  const sp=e.h?e.h.sp:'';p.cape=.7;
  switch(sp){
    case'crescent':{const k=easeOut(clamp(t/10,0,1));p.armL=-3.6+k*3.4;p.wAng=p.armL;p.lean=.3*k;p.legL=-.7;p.legR=.5;break}
    case'roar':if(t<10){p.armL=-.8;p.armR=-.8;p.lean=.35;p.legL=-.5;p.legR=.5;p.wAng=-1.4;p.bob=-1.5}
      else{p.armL=-2.4;p.armR=-2.4;p.armLz=-.9;p.armRz=.9;p.wAng=-3.1;p.head=-.45;p.lean=-.25;p.legL=-.6;p.legR=.6}break;
    case'dash':p.armL=-PI/2;p.wAng=-PI/2;p.lean=.45;p.legL=-.9;p.legR=.6;p.cape=1.1;p.ext=4;break;
    case'rain':p.armL=-2.5;p.wAng=-2.6;p.armR=-2.3+(t<8?t*.06:.5);p.armRz=.15;p.head=-.4;p.lean=-.2;p.legL=-.5;p.legR=.5;break;
    case'thunder':p.armL=-3.1;p.wAng=-3.1;p.armR=-1.2;p.armRz=.7;p.head=-.3;p.bob=t>4&&t<40?1.5+Math.sin(t*.3)*.5:0;p.legL=-.2;p.legR=.2;break;
    case'charm':p.spin=t*.5;p.armL=-.3-Math.sin(t*.2)*.8;p.armR=-.3+Math.sin(t*.2)*.8;p.armLz=-1.3;p.armRz=1.3;p.wAng=p.armL-1.2;p.wAng2=p.armR-1.2;p.bob=Math.abs(Math.sin(t*.25))*2;p.legR=Math.sin(t*.25)*.6;break;
    case'tornado':p.spin=t*.7;p.armL=-PI/2;p.wAng=-PI/2;p.armLz=-.4;p.legL=-.4;p.legR=.4;p.bob=t<30?t*.08:0;break;
    case'fire':if(t<12){p.armL=-3.3;p.wAng=-3.3;p.armR=-3}else{p.armL=-.4;p.wAng=-.2;p.lean=.35;p.legL=-.8;p.legR=.5}break;
    case'musou':{const ph=(t%6)/6;p.armL=(Math.floor(t/6)%2)?-3.3+ph*3:-.3-ph*3;p.wAng=p.armL;p.lean=.25;p.legL=-.6;p.legR=.5;break}
    default:p.armL=-PI/2;p.wAng=-PI/2;
  }
}
