'use strict';
/* ===== 던전앤파이터풍 도트 렌더링 (이 사본 전용) =====
   · 캐릭터: 논리 해상도(화면 2x2 픽셀 = 도트 1칸)로 그린 뒤
     ① 투명도 경계를 딱 끊고 ② 색을 단계로 끊어 셀 음영을 만들고 ③ 실루엣에 짙은 색 외곽선(셀렉티브 아웃라인)을 두른다.
     같은 외형 · 자세는 결과를 캐시해 매 프레임 다시 가공하지 않는다.
   · 배경: 저해상도로 그린 뒤 디더링 + 색 단계화 → 도트 배경
   · 장비 아이콘: 40x40 도트 + 외곽선
   · 피해 숫자: 굵은 주황 · 노랑 숫자가 튀어 오르는 연출 */
const DOT_BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16-.5);
const cb255=v=>v<0?0:v>255?255:v;
/* 캔버스 도트화: 반환값 = 불투명 영역 bbox */
function dotify(c,o){
  o=o||{};const w=o.w||c.width,h=o.h||c.height,g=c.getContext('2d'),id=g.getImageData(0,0,w,h),d=id.data;
  const S=o.step||24,dith=o.dither?S:0,at=o.at==null?100:o.at,aq=o.alphaQ;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++){const row=(y&3)*4;for(let x=0;x<w;x++){const i=(y*w+x)*4;let a=d[i+3];
    if(a<at){d[i+3]=0;continue}
    const b=dith?DOT_BAYER[row+(x&3)]*dith:0;
    d[i]=cb255(Math.round((d[i]+b)/S)*S);d[i+1]=cb255(Math.round((d[i+1]+b)/S)*S);d[i+2]=cb255(Math.round((d[i+2]+b)/S)*S);
    d[i+3]=aq?cb255(Math.round((a+DOT_BAYER[row+(x&3)]*64)/64)*64)||64:255;
    if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
  if(o.outline!=null&&x1>=0){const k=o.outline,A=new Uint8Array(w*h);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(d[(y*w+x)*4+3])A[y*w+x]=1;
    const X0=Math.max(0,x0-1),X1=Math.min(w-1,x1+1),Y0=Math.max(0,y0-1),Y1=Math.min(h-1,y1+1);
    for(let y=Y0;y<=Y1;y++)for(let x=X0;x<=X1;x++){const q=y*w+x;if(A[q])continue;
      let n=-1;if(x>0&&A[q-1])n=q-1;else if(x<w-1&&A[q+1])n=q+1;else if(y>0&&A[q-w])n=q-w;else if(y<h-1&&A[q+w])n=q+w;
      if(n<0)continue;const i=q*4,j=n*4;d[i]=d[j]*k+8;d[i+1]=d[j+1]*k+4;d[i+2]=d[j+2]*k+10;d[i+3]=255}
    x0=X0;y0=Y0;x1=X1;y1=Y1}
  g.putImageData(id,0,0);return{x0,y0,x1,y1};
}

/* 캐릭터용 빠른 도트화: 32비트 픽셀 + 색 단계 표 (디더링 없음) */
const DOT_QT=new Uint8Array(256);for(let v=0;v<256;v++)DOT_QT[v]=Math.min(255,Math.round(v/26)*26);
function dotifyFast(c,w,h,at,k){
  const g=c.getContext('2d'),id=g.getImageData(0,0,w,h),d=new Uint32Array(id.data.buffer),A=new Uint8Array(w*h),Q=DOT_QT;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++){let q=y*w;for(let x=0;x<w;x++,q++){const v=d[q];if((v>>>24)<at){d[q]=0;continue}
    A[q]=1;d[q]=(0xff000000|(Q[(v>>>16)&255]<<16)|(Q[(v>>>8)&255]<<8)|Q[v&255])>>>0;
    if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
  if(x1<0)return{x0,y0,x1,y1};
  const X0=Math.max(0,x0-1),X1=Math.min(w-1,x1+1),Y0=Math.max(0,y0-1),Y1=Math.min(h-1,y1+1);
  for(let y=Y0;y<=Y1;y++)for(let x=X0;x<=X1;x++){const q=y*w+x;if(A[q])continue;
    let n=-1;if(x>0&&A[q-1])n=q-1;else if(x<w-1&&A[q+1])n=q+1;else if(y>0&&A[q-w])n=q-w;else if(y<h-1&&A[q+w])n=q+w;
    if(n<0)continue;const v=d[n];d[q]=(0xff000000|((((v>>>16)&255)*k+10)<<16)|((((v>>>8)&255)*k+4)<<8)|(((v&255)*k+8)|0))>>>0}
  g.putImageData(id,0,0);return{x0:X0,y0:Y0,x1:X1,y1:Y1};
}
/* GPU 도트 필터 (SVG): 투명도 끊기 · 색 11단계 · 1px 어두운 외곽선 — 픽셀을 CPU로 읽지 않아 빠르다 */
(function(){const d=document.createElement('div');
  d.innerHTML='<svg width="0" height="0" style="position:absolute"><filter id="dotf" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">'+
  '<feComponentTransfer in="SourceGraphic" result="q"><feFuncA type="discrete" tableValues="0 0 0 1 1 1 1 1"/>'+
  ['R','G','B'].map(c=>'<feFunc'+c+' type="discrete" tableValues="0 .1 .2 .3 .4 .5 .6 .7 .8 .9 1"/>').join('')+'</feComponentTransfer>'+
  '<feMorphology in="q" operator="dilate" radius="1" result="dil"/>'+
  '<feColorMatrix in="dil" type="matrix" values="0.22 0 0 0 0.03 0 0.22 0 0 0.015 0 0 0.22 0 0.04 0 0 0 1 0" result="dark"/>'+
  '<feMerge><feMergeNode in="dark"/><feMergeNode in="q"/></feMerge></filter></svg>';
  document.body.appendChild(d.firstChild)})();
/* ---------- 캐릭터 ---------- */
const DOT_SCR=document.createElement('canvas'),DOT_SX=DOT_SCR.getContext('2d');
const DOT_CACHE=new Map(),DOT_LKEY=new WeakMap();
const DOT_PK=['armL','armR','wAng','wAng2','legL','legR','lean','spin','head','ext','bob','cape','gallop','rear','armLz','armRz'];
/* 자세를 단계로 끊어 「스프라이트 프레임」처럼 만든다 (각도 1/8 rad, 위치 1유닛) — 캐시 적중률 ↑ · 도트 게임 특유의 끊어지는 동작 */
const DOT_QS={ext:1,bob:1,gallop:1.5};
function dotQuantPose(ps){const q={};for(const k in ps){const v=ps[k];q[k]=typeof v==='number'?Math.round(v*(DOT_QS[k]||8))/(DOT_QS[k]||8):v}return q}
function dotPoseKey(ps){let s='';for(const k of DOT_PK){const v=ps[k];s+=(v!=null?Math.round(v*(DOT_QS[k]||8)):'_')+','}return s+(ps.lie?'L':'')+(ps.noShield?'N':'')}
let DOT_BUDGET=0,DOT_BF=-1;const DOT_LAST=new Map();
function dotLookKey(L){let k=DOT_LKEY.get(L);if(!k){k=JSON.stringify(L);DOT_LKEY.set(L,k)}return k}
window.PIX_PR=0;
function renderDot(g,L,pose,sx,sy,scale,facing,opt){
  opt=opt||{};const ps=pose||{},k=scale*(L.scale||1)*SD_K,f=facing<0?-1:1;
  if(k>2.1)return renderSD(g,L,ps,sx,sy,scale,facing,opt);/* 컷인 · 배너 같은 큰 일러스트는 고해상도 그대로 */
  const key=dotLookKey(L)+'|'+k.toFixed(2)+'|'+f+'|'+dotPoseKey(ps)+'|'+(opt.flash?'F':'')+(opt.tint||'');
  let e=DOT_CACHE.get(key);
  if(DOT_BF!==frame){DOT_BF=frame;DOT_BUDGET=4}
  const lk=dotLookKey(L)+f+(opt.tint||'')+(opt.flash?'F':'');
  if(e){DOT_CACHE.delete(key);DOT_CACHE.set(key,e)}
  else if(DOT_BUDGET<=0&&DOT_LAST.has(lk))e=DOT_LAST.get(lk);
  else{DOT_BUDGET--;
    const wide=L.mount?1.5:1,BW=Math.ceil(224*k*wide),BH=Math.ceil(258*k),ox=Math.round(BW/2),oy=Math.round(208*k);
    const qps=dotQuantPose(ps);
    if(DOT_SCR.width<BW||DOT_SCR.height<BH){DOT_SCR.width=Math.max(DOT_SCR.width,BW);DOT_SCR.height=Math.max(DOT_SCR.height,BH)}
    DOT_SX.setTransform(1,0,0,1,0,0);DOT_SX.globalAlpha=1;DOT_SX.globalCompositeOperation='source-over';DOT_SX.clearRect(0,0,BW,BH);
    window.PIX_PR=1;let r;try{r=renderSD(DOT_SX,L,qps,ox,oy,scale,facing,opt)}finally{window.PIX_PR=0}
    const c=document.createElement('canvas');c.width=BW;c.height=BH;const cg=c.getContext('2d');cg.filter='url(#dotf)';cg.drawImage(DOT_SCR,0,0,BW,BH,0,0,BW,BH);cg.filter='none';
    e={c,dx:-ox,dy:-oy,t:[r.tx-ox,r.ty-oy,r.mx-ox,r.my-oy]};
    DOT_CACHE.set(key,e);if(DOT_CACHE.size>420)DOT_CACHE.delete(DOT_CACHE.keys().next().value);
  }
  DOT_LAST.set(lk,e);if(DOT_LAST.size>300)DOT_LAST.delete(DOT_LAST.keys().next().value);
  if(e.c){const sm=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;g.drawImage(e.c,Math.round(sx)+e.dx,Math.round(sy)+e.dy);g.imageSmoothingEnabled=sm}
  return{tx:Math.round(sx)+e.t[0],ty:Math.round(sy)+e.t[1],mx:Math.round(sx)+e.t[2],my:Math.round(sy)+e.t[3]};
}
renderModel=renderDot;renderModelOutlined=(g,L,pose,sx,sy,scale,facing,opt)=>renderDot(g,L,pose,sx,sy,scale,facing,opt);

/* ---------- 배경: 도트 + 디더링 ---------- */
const _buildBGD=buildBG;
buildBG=function(kind){
  _buildBGD(kind);if(!BG||!BG.hd)return;
  dotify(BG.sky,{step:18,dither:true,at:0});
  BG.layers.forEach((Ly,i)=>dotify(Ly.c,{step:20,dither:true,at:i===0&&Ly.drift?30:60,alphaQ:!!Ly.drift}));
  dotify(BG.ground,{step:18,dither:true,at:0});
};

/* ---------- 장비 아이콘: 40x40 도트 ---------- */
const DOT_ICON=new Map(),_gearArtD=gearArt;
gearArt=function(it){
  const key=itemSeed(it)+'|'+it.s+'|'+it.g+'|'+it.il+'|'+(it.u||'')+(it.set||'');let c=DOT_ICON.get(key);if(c)return c;
  const src=_gearArtD(it);c=document.createElement('canvas');c.width=c.height=40;const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=true;g.drawImage(src,2,2,36,36);
  dotify(c,{step:24,at:90,outline:.2});if(DOT_ICON.size>1500)DOT_ICON.clear();DOT_ICON.set(key,c);return c;
};
drawGearIcon=function(it,cx,cy,sz){const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;ctx.drawImage(gearArt(it),Math.round(cx-sz/2),Math.round(cy-sz/2),Math.round(sz),Math.round(sz));ctx.imageSmoothingEnabled=sm};

/* ---------- 피해 숫자: 던파풍 튀어 오르는 굵은 숫자 ---------- */
const _drawFxD=drawFx;
drawFx=function(f,cx){
  if(f.type!=='num')return _drawFxD(f,cx);
  const sx=f.x-cx,t=f.t,pop=t<6?1.7-t*.12:1,rise=t<6?t*2.2:13+(t-6)*.45,a=Math.min(1,(f.life-t)/12);
  const size=Math.round((f.crit?34:f.big?27:f.small?15:21)*pop),y=f.y-(f.z||0)-rise,pl=f.col==='#ff6b5a';
  ctx.save();ctx.globalAlpha=a;ctx.font=`900 ${size}px 'Impact','Arial Black','Malgun Gothic',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const s=String(f.txt).replace('!','');
  ctx.lineJoin='round';ctx.lineWidth=Math.max(3,size*.22);ctx.strokeStyle='#1a0800';ctx.strokeText(s,sx,y);
  const gr=ctx.createLinearGradient(0,y-size/2,0,y+size/2);
  if(pl){gr.addColorStop(0,'#ffd0c8');gr.addColorStop(.5,'#ff5a4a');gr.addColorStop(1,'#a01810')}
  else if(f.crit){gr.addColorStop(0,'#fff6c0');gr.addColorStop(.45,'#ffb020');gr.addColorStop(1,'#e03a10')}
  else if(f.small){gr.addColorStop(0,'#ffe0c0');gr.addColorStop(1,f.col||'#ff9a50')}
  else{gr.addColorStop(0,'#ffffff');gr.addColorStop(.5,'#ffe060');gr.addColorStop(1,'#f08a10')}
  ctx.fillStyle=gr;ctx.fillText(s,sx,y);
  if(f.crit&&t<40){ctx.font=`900 ${Math.round(12*pop)}px 'Malgun Gothic',sans-serif`;ctx.lineWidth=3;ctx.strokeText('CRITICAL',sx,y-size*.75);ctx.fillStyle='#ffe060';ctx.fillText('CRITICAL',sx,y-size*.75)}
  ctx.restore();
};
