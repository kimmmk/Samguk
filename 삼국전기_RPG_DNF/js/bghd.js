'use strict';
/* ===== HD 전투 배경 (회화풍 벡터) =====
   기존 도트 배경(buildBG · drawPixelBG)을 같은 이름으로 대체한다.
   하늘(고정) + 원경 산 · 중경(건물 · 나무) · 지면(바닥 타일)을 반복 폭 HB_W 의 고해상도 캔버스로 한 번 그려 두고,
   카메라에 맞춰 시차 스크롤한다. 깃발 · 불씨 · 물결 · 반딧불 같은 움직임은 매 프레임 덧그린다. */
const HB_W=1920,HB_GT=296;/* 반복 폭 · 지면 시작 y (논리 px) */
const hbQ=()=>1;/* 도트 사본: 배경은 논리 해상도(도트 1칸 = 화면 2x2)로 그린다 */
function hbC(w,h){const q=hbQ(),c=document.createElement('canvas');c.width=Math.ceil(w*q);c.height=Math.ceil(h*q);const g=c.getContext('2d');g.scale(q,q);g.lineJoin='round';g.lineCap='round';return[c,g]}
const hbR=s=>{const x=Math.sin(s*127.1+311.7)*43758.5453;return x-Math.floor(x)};
function hbWrap(x,fn,m){m=m||300;fn(x);if(x<m)fn(x+HB_W);if(x>HB_W-m)fn(x-HB_W)}
function hbRidge(x,seed,ks,as){let v=0;ks.forEach((k,i)=>v+=as[i]*Math.sin(x/HB_W*Math.PI*2*k+hbR(seed+i*7)*6.283));return v}
function hbGrad(g,y0,y1,stops){const gr=g.createLinearGradient(0,y0,0,y1);stops.forEach((c,i)=>gr.addColorStop(i/(stops.length-1),c));return gr}
function hbGlow(g,x,y,r,col,a){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,sdA(col,a));gr.addColorStop(1,sdA(col,0));g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}

/* ---------- 하늘 ---------- */
function hbSky(stops,o){
  o=o||{};const [c,g]=hbC(W,H);g.fillStyle=hbGrad(g,0,H*.62,stops);g.fillRect(0,0,W,H);
  if(o.stars)for(let i=0;i<o.stars;i++){const x=hbR(i*3.1)*W,y=hbR(i*7.7)*H*.5,r=hbR(i*1.3)*1.3+.3;g.fillStyle=`rgba(255,255,240,${.35+hbR(i*9.1)*.6})`;g.beginPath();g.arc(x,y,r,0,7);g.fill();if(r>1.2)hbGlow(g,x,y,5,'#ffffff',.35)}
  if(o.sun){const [x,y,r,col]=o.sun;hbGlow(g,x,y,r*6,col,.35);hbGlow(g,x,y,r*2.4,col,.55);g.fillStyle=sdMix(col,'#ffffff',.6);g.beginPath();g.arc(x,y,r,0,7);g.fill()}
  if(o.moon){const [x,y,r]=o.moon;hbGlow(g,x,y,r*5,'#d8e4ff',.3);g.fillStyle='#f4f0dc';g.beginPath();g.arc(x,y,r,0,7);g.fill();g.fillStyle='rgba(180,170,140,.35)';for(const [dx,dy,rr] of[[-.3,-.2,.25],[.25,.2,.18],[.1,-.35,.12]]){g.beginPath();g.arc(x+dx*r,y+dy*r,rr*r,0,7);g.fill()}}
  if(o.rays){const [x,y,col]=o.rays;g.save();g.globalCompositeOperation='lighter';for(let i=0;i<9;i++){const a=.35+i*.26,l=900;g.fillStyle=sdA(col,.05);g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l-40,y+Math.sin(a)*l);g.lineTo(x+Math.cos(a)*l+40,y+Math.sin(a)*l);g.closePath();g.fill()}g.restore()}
  return c;
}
function hbClouds(seed,col,shadow,n,y0,y1){
  const [c,g]=hbC(HB_W,y1);
  for(let i=0;i<n;i++){const cx=hbR(seed+i*5.3)*HB_W,cy=y0+hbR(seed+i*2.9)*(y1-y0-40),w=90+hbR(seed+i*1.7)*170;
    hbWrap(cx,x=>{for(let k=0;k<7;k++){const bx=x-w/2+k*w/6,by=cy-Math.sin(k/6*Math.PI)*w*.12+hbR(i*11+k)*8,r=w*.14+hbR(i*3+k)*w*.08;
      const gr=g.createRadialGradient(bx-r*.2,by-r*.3,r*.1,bx,by,r);gr.addColorStop(0,sdA(col,.95));gr.addColorStop(.7,sdA(col,.75));gr.addColorStop(1,sdA(shadow,0));
      g.fillStyle=gr;g.beginPath();g.ellipse(bx,by,r*1.3,r,0,0,7);g.fill()}
      g.fillStyle=sdA(shadow,.25);g.beginPath();g.ellipse(x,cy+w*.08,w*.55,w*.05,0,0,7);g.fill()},w)}
  return c;
}
/* ---------- 산 ---------- */
function hbMount(h,o){
  const [c,g]=hbC(HB_W,h),step=6;
  const yAt=x=>o.base-o.amp*(.55+.45*hbRidge(x,o.seed,o.ks,o.as)/(o.as.reduce((a,b)=>a+b,0)));
  g.beginPath();g.moveTo(0,h);for(let x=0;x<=HB_W;x+=step)g.lineTo(x,yAt(x));g.lineTo(HB_W,h);g.closePath();
  g.fillStyle=hbGrad(g,o.base-o.amp,h,[o.top,o.bot]);g.fill();
  /* 능선 빛 · 골짜기 결 */
  g.save();g.clip();
  for(let x=0;x<HB_W;x+=step*3){const y=yAt(x),d=yAt(x+step)-y;if(d<0){g.strokeStyle=sdA(o.lit||'#ffffff',.18);g.lineWidth=5;g.beginPath();g.moveTo(x,y+2);g.lineTo(x-8,y+40);g.stroke()}
    else{g.strokeStyle=sdA(o.shade||'#000000',.12);g.lineWidth=7;g.beginPath();g.moveTo(x,y+3);g.lineTo(x+10,y+60);g.stroke()}}
  if(o.snow){g.fillStyle='rgba(250,252,255,.9)';for(let x=0;x<HB_W;x+=step){const y=yAt(x);if(y<o.base-o.amp*.72){g.beginPath();g.moveTo(x,y);g.lineTo(x+step,yAt(x+step));g.lineTo(x+step,yAt(x+step)+10);g.lineTo(x,y+14+hbR(x)*8);g.fill()}}}
  if(o.strata){for(let k=0;k<14;k++){const yy=o.base-o.amp+k*14;g.strokeStyle=sdA('#000000',.12);g.lineWidth=2;g.beginPath();for(let x=0;x<=HB_W;x+=20)g.lineTo(x,yy+Math.sin(x*.01+k)*5);g.stroke()}}
  /* 대기 원근: 아래쪽 안개 */
  g.fillStyle=hbGrad(g,o.base-o.amp*.2,h,['rgba(0,0,0,0)',sdA(o.haze||o.bot,.55)]);g.fillRect(0,0,HB_W,h);
  g.restore();
  g.strokeStyle=sdA(o.lit||'#ffffff',.35);g.lineWidth=1.4;g.beginPath();for(let x=0;x<=HB_W;x+=step)g.lineTo(x,yAt(x));g.stroke();
  if(o.trees)for(let i=0;i<o.trees;i++){const x=hbR(o.seed*9+i*2.3)*HB_W,y=yAt(x)+6+hbR(i*4.1)*30;hbWrap(x,xx=>hbPine(g,xx,y+14,18+hbR(i)*14,o.treeC||'#2e4a3a'),60)}
  return{c,yAt};
}
/* ---------- 나무 · 건물 · 소품 ---------- */
function hbPine(g,x,y,h,col){
  g.fillStyle=sdSh(col,-40);g.fillRect(x-1.5,y-h*.25,3,h*.3);
  for(let k=0;k<3;k++){const yy=y-h*(.2+k*.27),w=h*(.42-k*.1);const gr=g.createLinearGradient(x-w,0,x+w,0);gr.addColorStop(0,sdSh(col,-25));gr.addColorStop(.6,col);gr.addColorStop(1,sdSh(col,25));
    g.fillStyle=gr;g.beginPath();g.moveTo(x,yy-h*.36);g.lineTo(x+w,yy+2);g.quadraticCurveTo(x,yy-2,x-w,yy+2);g.closePath();g.fill()}
}
function hbTree(g,x,y,r,col,blossom){
  g.fillStyle='#4a3020';g.beginPath();g.moveTo(x-3,y);g.lineTo(x-1.5,y-r*1.1);g.lineTo(x+1.5,y-r*1.1);g.lineTo(x+3,y);g.fill();
  for(let k=0;k<9;k++){const a=k/9*6.283,bx=x+Math.cos(a)*r*.6,by=y-r*1.4+Math.sin(a)*r*.45,rr=r*(.45+hbR(x+k)*.25);
    const gr=g.createRadialGradient(bx-rr*.3,by-rr*.4,rr*.1,bx,by,rr);gr.addColorStop(0,sdSh(col,35));gr.addColorStop(.7,col);gr.addColorStop(1,sdSh(col,-30));g.fillStyle=gr;g.beginPath();g.arc(bx,by,rr,0,7);g.fill()}
  if(blossom)for(let k=0;k<26;k++){const bx=x+(hbR(x*3+k)-.5)*r*2,by=y-r*1.4+(hbR(x*5+k)-.5)*r*1.2;g.fillStyle=k%3?'#ffd0e4':'#ffffff';g.beginPath();g.arc(bx,by,1.6,0,7);g.fill()}
}
function hbRoof(g,x,y,w,h,col){
  const e=w*.12;g.fillStyle=hbGrad(g,y-h,y+3,[sdSh(col,20),col,sdSh(col,-30)]);
  g.beginPath();g.moveTo(x-w/2-e,y-4);g.quadraticCurveTo(x-w/2+e*.4,y-2,x-w/2+e,y-h*.55);g.lineTo(x-w*.3,y-h);g.lineTo(x+w*.3,y-h);g.lineTo(x+w/2-e,y-h*.55);g.quadraticCurveTo(x+w/2-e*.4,y-2,x+w/2+e,y-4);g.lineTo(x+w/2,y+2);g.lineTo(x-w/2,y+2);g.closePath();g.fill();
  g.strokeStyle=sdA(sdSh(col,-50),.6);g.lineWidth=.8;for(let k=-w/2+4;k<w/2;k+=5){g.beginPath();g.moveTo(x+k*.62,y-h+1);g.lineTo(x+k,y);g.stroke()}
  g.fillStyle=sdSh(col,-45);g.fillRect(x-w*.3,y-h-2,w*.6,3);g.fillStyle='#e0b040';g.beginPath();g.arc(x-w*.3,y-h-1,2,0,7);g.arc(x+w*.3,y-h-1,2,0,7);g.fill();
  g.fillStyle=sdSh(col,-55);g.fillRect(x-w/2,y,w,2.5);
}
function hbHouse(g,x,y,w,h,wall,roof){
  g.fillStyle=hbGrad(g,y-h,y,[sdSh(wall,12),sdSh(wall,-16)]);g.fillRect(x-w/2,y-h,w,h);
  g.fillStyle='#5a3620';g.fillRect(x-w/2,y-h,w,3);g.fillRect(x-w/2,y-h,3,h);g.fillRect(x+w/2-3,y-h,3,h);g.fillRect(x-1.5,y-h,3,h);
  for(const s of[-1,1]){const wx=x+s*w*.25-8,wy=y-h*.7;g.fillStyle='#3a2414';g.fillRect(wx,wy,16,12);g.strokeStyle='#c8a060';g.lineWidth=.8;for(let k=1;k<4;k++){g.beginPath();g.moveTo(wx+k*4,wy);g.lineTo(wx+k*4,wy+12);g.stroke()}g.beginPath();g.moveTo(wx,wy+6);g.lineTo(wx+16,wy+6);g.stroke()}
  hbRoof(g,x,y-h,w+14,h*.55,roof);
}
function hbGateTower(g,x,y,name){
  const wall='#8a7e70';
  g.fillStyle=hbGrad(g,y-150,y,[sdSh(wall,10),sdSh(wall,-25)]);g.fillRect(x-110,y-150,220,150);
  g.strokeStyle='rgba(40,30,20,.35)';g.lineWidth=1;for(let r=0;r<15;r++){const yy=y-150+r*10;g.beginPath();g.moveTo(x-110,yy);g.lineTo(x+110,yy);g.stroke();for(let k=(r%2)*14;k<220;k+=28){g.beginPath();g.moveTo(x-110+k,yy);g.lineTo(x-110+k,yy+10);g.stroke()}}
  g.fillStyle='#120a08';g.beginPath();g.moveTo(x-34,y);g.lineTo(x-34,y-58);g.arc(x,y-58,34,Math.PI,0);g.lineTo(x+34,y);g.closePath();g.fill();
  g.strokeStyle='#4a3a2a';g.lineWidth=4;g.beginPath();g.arc(x,y-58,36,Math.PI,0);g.stroke();
  g.fillStyle='#3a2414';g.fillRect(x-80,y-190,160,40);for(let k=0;k<7;k++){g.fillStyle='#b8321c';g.fillRect(x-74+k*22,y-186,6,34)}
  hbRoof(g,x,y-190,190,34,'#3a3848');g.fillStyle='#4a2a18';g.fillRect(x-60,y-252,120,34);hbRoof(g,x,y-252,140,30,'#3a3848');
  g.fillStyle='#1a1008';g.fillRect(x-30,y-146,60,22);g.strokeStyle='#e0b040';g.lineWidth=2;g.strokeRect(x-30,y-146,60,22);
  g.fillStyle='#f0c860';g.font='bold 15px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(name,x,y-135);
  for(const s of[-1,1]){g.fillStyle='#ffb040';hbGlow(g,x+s*62,y-170,16,'#ffb040',.7);g.fillStyle='#d82a1a';g.beginPath();g.ellipse(x+s*62,y-170,6,8,0,0,7);g.fill()}
}
function hbCityWall(g,y,h,col){
  g.fillStyle=hbGrad(g,y,y+h,[sdSh(col,8),sdSh(col,-30)]);g.fillRect(0,y,HB_W,h);
  g.strokeStyle='rgba(30,20,15,.3)';g.lineWidth=1;for(let r=0;r*9<h;r++){const yy=y+r*9;g.beginPath();g.moveTo(0,yy);g.lineTo(HB_W,yy);g.stroke();for(let k=(r%2)*12;k<HB_W;k+=24){g.beginPath();g.moveTo(k,yy);g.lineTo(k,yy+9);g.stroke()}}
  for(let x=0;x<HB_W;x+=24){g.fillStyle=sdSh(col,6);g.fillRect(x,y-12,15,12);g.fillStyle=sdSh(col,25);g.fillRect(x,y-12,15,2)}
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,y,HB_W,4);
}
function hbBanner(g,x,y,col,ch,ph,t){
  g.strokeStyle='#3a2414';g.lineWidth=2.4;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-70);g.stroke();g.fillStyle='#e0b040';g.beginPath();g.arc(x,y-71,2.4,0,7);g.fill();
  g.fillStyle=col;g.beginPath();g.moveTo(x+1,y-66);for(let k=0;k<=6;k++){const xx=x+1+k*5,yy=y-66+Math.sin((t||0)*.12+k*.8+ph)*2*k/6;g.lineTo(xx,yy)}
  for(let k=6;k>=0;k--){const xx=x+1+k*5,yy=y-30+Math.sin((t||0)*.12+k*.8+ph)*2*k/6;g.lineTo(xx,yy)}g.closePath();g.fill();
  g.strokeStyle='#e0b040';g.lineWidth=1;g.stroke();if(ch){g.fillStyle='#fff4d0';g.font='bold 14px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(ch,x+16,y-48)}
}
function hbDrum(g,x,y,s){s=s||1;
  g.fillStyle='#5a3a1c';for(const d of[-1,1]){g.beginPath();g.moveTo(x+d*18*s,y);g.lineTo(x+d*10*s,y-44*s);g.lineTo(x+d*14*s,y-44*s);g.lineTo(x+d*22*s,y);g.fill()}
  g.fillStyle=hbGrad(g,y-80*s,y-30*s,['#d8583a','#a82a18','#6a1a0e']);g.beginPath();g.ellipse(x,y-56*s,30*s,26*s,0,0,7);g.fill();
  g.fillStyle='#f0dcb0';g.beginPath();g.ellipse(x+12*s,y-56*s,13*s,24*s,0,0,7);g.fill();g.strokeStyle='#c8a060';g.lineWidth=2*s;g.stroke();
  g.fillStyle='#c8a060';g.font=`bold ${16*s}px serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('將',x+12*s,y-56*s);
  g.strokeStyle='#e0b040';g.lineWidth=1.5*s;for(let k=-2;k<=2;k++){g.beginPath();g.arc(x-8*s,y-56*s+k*9*s,1.4*s,0,7);g.stroke()}
}
function hbLantern(g,x,y){g.strokeStyle='#3a2414';g.lineWidth=1.4;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-50);g.stroke();hbGlow(g,x,y-50,24,'#ffa040',.55);g.fillStyle='#d8321c';g.beginPath();g.ellipse(x,y-50,7,9,0,0,7);g.fill();g.fillStyle='#ffe0a0';g.fillRect(x-5,y-51,10,2)}
function hbTent(g,x,y,col){g.fillStyle=hbGrad(g,y-60,y,[sdSh(col,18),sdSh(col,-28)]);g.beginPath();g.moveTo(x,y-62);g.lineTo(x+48,y);g.lineTo(x-48,y);g.closePath();g.fill();
  g.fillStyle='#1a120c';g.beginPath();g.moveTo(x,y-34);g.lineTo(x+12,y);g.lineTo(x-12,y);g.closePath();g.fill();g.strokeStyle=sdSh(col,-40);g.lineWidth=1;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(x,y-62);g.lineTo(x+k*20,y);g.stroke()}}
function hbShip(g,x,y,burn){
  g.fillStyle=hbGrad(g,y-24,y+6,['#5a3a22','#2a1a10']);g.beginPath();g.moveTo(x-90,y-22);g.lineTo(x+90,y-24);g.quadraticCurveTo(x+80,y+4,x+60,y+6);g.lineTo(x-64,y+6);g.quadraticCurveTo(x-84,y+2,x-90,y-22);g.fill();
  g.fillStyle='#6a4a2a';g.fillRect(x-40,y-50,70,26);hbRoof(g,x-5,y-50,90,16,'#3a2a22');g.strokeStyle='#3a2414';g.lineWidth=3;g.beginPath();g.moveTo(x+10,y-24);g.lineTo(x+10,y-130);g.stroke();
  g.fillStyle=burn?'#6a3020':'#d8c8a0';g.beginPath();g.moveTo(x+12,y-126);g.quadraticCurveTo(x+56,y-96,x+12,y-58);g.closePath();g.fill();
}
/* ---------- 지면 ---------- */
function hbGround(kind){
  const h=H-HB_GT+6,[c,g]=hbC(HB_W,h);
  const P={dirt:['#d8b47c','#c89a60','#a87a44'],stone:['#b8aca0','#9c8e80','#7a6c60'],grass:['#8ab860','#6a9848','#4a7432'],deck:['#9a6a3c','#7a4e2a','#5a3418'],mud:['#8a7a62','#6a5a46','#4a3e30'],nightgrass:['#3a5a48','#2a4838','#1a3026']}[kind]||['#c8a070','#a88050','#886038'];
  g.fillStyle=hbGrad(g,0,h,P);g.fillRect(0,0,HB_W,h);
  const rows=[];let y=6,rh=7;while(y<h){rows.push([y,rh]);y+=rh;rh*=1.16}
  if(kind==='stone'){
    rows.forEach(([ry,rh],i)=>{const tw=40+rh*2.2,off=(i%2)*tw/2;for(let x=-tw+off;x<HB_W+tw;x+=tw){const v=hbR(i*31+Math.floor(x))*.14-.07;
      g.fillStyle=sdA(v>0?'#ffffff':'#000000',Math.abs(v));g.fillRect(x+1,ry+1,tw-2,rh-2);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+1,ry+1,tw-2,Math.max(1,rh*.12));
      g.fillStyle='rgba(40,30,20,.35)';g.fillRect(x,ry,1.4,rh)}g.fillStyle='rgba(40,30,20,.4)';g.fillRect(0,ry,HB_W,1.4)});
    for(const cx of[480,1440]){const cy=h*.5,rx=150,ry2=34;g.strokeStyle='rgba(60,45,35,.45)';g.lineWidth=3;for(const k of[1,.72,.45]){g.beginPath();g.ellipse(cx,cy,rx*k,ry2*k,0,0,7);g.stroke()}
      g.fillStyle='rgba(60,45,35,.35)';g.font='bold 30px serif';g.textAlign='center';g.textBaseline='middle';g.save();g.translate(cx,cy);g.scale(2.2,.5);g.fillText('武',0,0);g.restore()}}
  else if(kind==='deck'){rows.forEach(([ry,rh],i)=>{g.fillStyle='rgba(30,15,5,.45)';g.fillRect(0,ry,HB_W,1.6);g.fillStyle='rgba(255,220,170,.12)';g.fillRect(0,ry+1.6,HB_W,rh*.15);
      for(let x=hbR(i)*200;x<HB_W;x+=180+hbR(i*7+x)*120){g.fillStyle='rgba(30,15,5,.35)';g.fillRect(x,ry,1.5,rh);g.fillStyle='#2a1a10';g.beginPath();g.arc(x+6,ry+rh/2,1.2,0,7);g.fill()}})}
  else{
    for(let i=0;i<900;i++){const x=hbR(i*1.7)*HB_W,yy=Math.pow(hbR(i*2.3),.8)*h,s=(1+yy/h*2.2)*(.6+hbR(i*5)*1);
      g.fillStyle=sdA(hbR(i*9)<.5?'#ffffff':'#000000',.08+hbR(i*3)*.1);g.beginPath();g.ellipse(x,yy,s*1.8,s*.8,0,0,7);g.fill()}
    if(kind==='dirt'){for(const ry of[.35,.62]){g.strokeStyle='rgba(90,60,30,.22)';g.lineWidth=5;g.beginPath();for(let x=0;x<=HB_W;x+=30)g.lineTo(x,h*ry+Math.sin(x*.006)*6);g.stroke()}
      for(let i=0;i<40;i++){const x=hbR(i*13)*HB_W,yy=h*(.15+hbR(i*7)*.8),s=4+hbR(i)*6;g.fillStyle=hbGrad(g,yy-s,yy+s,['#c8bcaa','#8a7c6a']);g.beginPath();g.ellipse(x,yy,s*1.4,s,0,0,7);g.fill();g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x+2,yy+s*.8,s*1.3,s*.3,0,0,7);g.fill()}}
    if(kind==='mud'||kind==='dirt')for(let i=0;i<(kind==='mud'?18:4);i++){const x=hbR(i*19)*HB_W,yy=h*(.2+hbR(i*23)*.7),w=40+hbR(i)*70;
      g.fillStyle=hbGrad(g,yy-6,yy+6,['rgba(170,190,210,.55)','rgba(90,110,130,.45)']);g.beginPath();g.ellipse(x,yy,w,w*.16,0,0,7);g.fill();g.strokeStyle='rgba(230,240,255,.35)';g.lineWidth=1;g.beginPath();g.ellipse(x-w*.2,yy-1,w*.4,w*.04,0,0,7);g.stroke()}
    const tuft=kind==='grass'||kind==='nightgrass'?260:kind==='dirt'?70:30,gc=kind==='nightgrass'?'#4a7a5a':kind==='mud'?'#6a7a4a':'#6aa044';
    for(let i=0;i<tuft;i++){const x=hbR(i*29)*HB_W,yy=h*Math.pow(hbR(i*31),1.4),s=(4+yy/h*9);g.strokeStyle=sdSh(gc,(hbR(i)-.5)*40);g.lineWidth=1.2+yy/h;
      for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(x+k*1.4,yy);g.quadraticCurveTo(x+k*2.2,yy-s*.6,x+k*3.2,yy-s);g.stroke()}
      if(kind==='grass'&&i%5===0){g.fillStyle=['#ffe060','#ffffff','#ff90b0'][i%3];g.beginPath();g.arc(x,yy-s,1.8,0,7);g.fill()}}}
  /* 지평선 쪽 안개 · 앞쪽 음영 */
  g.fillStyle=hbGrad(g,0,26,[sdA(P[0],.9),sdA(P[0],0)]);g.fillRect(0,0,HB_W,26);
  g.fillStyle=hbGrad(g,h*.7,h,['rgba(0,0,0,0)','rgba(0,0,0,.25)']);g.fillRect(0,h*.7,HB_W,h*.3);
  return c;
}

/* ---------- 장면 조립 ---------- */
buildBG=function(kind){
  BG={kind,hd:true,layers:[],ground:null,sky:null,post:null,objs:[]};
  const L=(c,par,y,h,extra)=>BG.layers.push(Object.assign({c,par,y,h},extra||{}));
  switch(kind){
    case'plains':{
      BG.sky=hbSky(['#3f78c8','#6aa2e0','#a6cdee','#f2e2c0','#f8cc90'],{sun:[720,120,26,'#fff0c0'],rays:[720,120,'#fff4d0']});
      L(hbClouds(1,'#ffffff','#b8c8e0',10,30,220),.02,0,220,{drift:.06});
      L(hbMount(320,{base:250,amp:150,ks:[1,3,7],as:[.5,.3,.2],seed:1,top:'#8aa6cc',bot:'#b4c8dc',lit:'#ffffff',snow:true,haze:'#d8e4ee'}).c,.05,0,320);
      {const m=hbMount(330,{base:300,amp:70,ks:[2,5,9],as:[.5,.3,.2],seed:3,top:'#6a9a5a',bot:'#9ab878',lit:'#e8ffd0',trees:70,treeC:'#3a6a3a',haze:'#c8d8b0'});L(m.c,.14,0,330)}
      {const [c,g]=hbC(HB_W,310);
        for(let i=0;i<9;i++){const x=110+i*210;hbWrap(x,xx=>{if(i%3===0)hbHouse(g,xx,300,120,52,'#ece0c4','#3a4a5e');else if(i%3===1){hbTree(g,xx,302,26,'#e890b8',true)}else{hbTree(g,xx-30,302,22,'#5a9a44');hbTree(g,xx+30,304,18,'#6aa84c')}})}
        for(let x=0;x<HB_W;x+=14){g.fillStyle='#7a5a34';g.fillRect(x,286,2.4,16);}g.fillRect(0,290,HB_W,2);g.fillRect(0,297,HB_W,2);
        L(c,.42,0,310)}
      BG.ground=hbGround('dirt');
      BG.post=(t,camX)=>{for(let i=0;i<14;i++){const x=((hbR(i*3)*W*1.4-t*.6*(1+hbR(i))-camX*.3)%(W+60)+W+60)%(W+60)-30,y=((hbR(i*7)*H+t*(.7+hbR(i*5)*.6))%H);
        ctx.fillStyle=i%3?'#ffc0dc':'#ffffff';ctx.save();ctx.translate(x,y);ctx.rotate(t*.05+i);ctx.beginPath();ctx.ellipse(0,0,3.2,1.8,0,0,7);ctx.fill();ctx.restore()}};
      break}
    case'fortress':{
      BG.sky=hbSky(['#1a0e30','#4a1a40','#a0303c','#e8683c','#f8a860'],{sun:[240,210,34,'#ff9050'],stars:40});
      L(hbClouds(4,'#e88a6a','#6a2a3a',8,40,200),.02,0,200,{drift:.04});
      L(hbMount(330,{base:270,amp:130,ks:[1,2,6],as:[.5,.35,.15],seed:2,top:'#3a2038',bot:'#6a3448',lit:'#ff9a70',haze:'#9a4a50'}).c,.05,0,330);
      {const [c,g]=hbC(HB_W,310);hbCityWall(g,190,120,'#8a7e70');
        for(const gx of[480,1440]){hbGateTower(g,gx,306,'虎牢關')}
        for(let x=60;x<HB_W;x+=160){if(Math.abs(x-480)<140||Math.abs(x-1440)<140)continue;BG.objs.push({x,y:180,col:'#b01818',ch:'董'})}
        L(c,.4,0,310,{flags:true})}
      BG.ground=hbGround('stone');
      BG.post=(t,camX)=>{for(let i=0;i<50;i++){const x=((hbR(i)*W*1.3+t*.3*(1+hbR(i*3)))%W),y=H*.62-((t*.6*(.5+hbR(i*5))+hbR(i*7)*400)%420);ctx.fillStyle=(t+i)%20<10?'#ffc050':'#ff6a20';ctx.globalAlpha=.8;ctx.fillRect(x,y,2.2,2.2)}ctx.globalAlpha=1};
      break}
    case'bridge':{
      BG.sky=hbSky(['#6a88a4','#90aabf','#b8c8d2','#dce2de','#eee8d8']);
      L(hbClouds(6,'#f2f4f6','#9aaab8',11,20,240),.02,0,240,{drift:.03});
      L(hbMount(330,{base:260,amp:140,ks:[1,3,5],as:[.5,.3,.2],seed:5,top:'#7a9a94',bot:'#a8bcb4',lit:'#f0fff8',haze:'#c8d6d0'}).c,.05,0,330);
      L(hbMount(320,{base:290,amp:70,ks:[2,4,11],as:[.5,.35,.15],seed:6,top:'#4a7050',bot:'#78a078',lit:'#d8ffd8',trees:90,treeC:'#2e5234',haze:'#a8c4a8'}).c,.14,0,320);
      {const [c,g]=hbC(HB_W,310);
        g.fillStyle=hbGrad(g,248,300,['#5a8ab0','#3a6a92','#2a5a80']);g.fillRect(0,248,HB_W,54);g.fillStyle='#6a8a4a';g.fillRect(0,240,HB_W,10);g.fillRect(0,298,HB_W,12);
        for(const bx of[500,1460]){for(let x=bx-170;x<bx+170;x+=2){const arc=Math.sin((x-bx+170)/340*Math.PI)*22;g.fillStyle='#7a5230';g.fillRect(x,254-arc,2,6);if((x-bx)%24===0){g.fillStyle='#5a3a20';g.fillRect(x,232-arc,3,22);g.fillRect(x,260-arc,4,34+arc)}}
          g.strokeStyle='#6a4424';g.lineWidth=2.4;g.beginPath();for(let x=bx-170;x<=bx+170;x+=4)g.lineTo(x,234-Math.sin((x-bx+170)/340*Math.PI)*22);g.stroke();
          g.fillStyle='#3a2a14';g.font='bold 16px serif';g.textAlign='center';g.fillText('長坂橋',bx,194)}
        for(const wx of[160,900,1180,1760]){g.fillStyle='#4a3524';g.fillRect(wx,210,5,40);for(let k=0;k<24;k++){g.strokeStyle=k%3?'#6a9a4a':'#8aba5a';g.lineWidth=1.4;g.beginPath();g.moveTo(wx+2,212);g.quadraticCurveTo(wx-20+k*1.8,205,wx-22+k*2,250+hbR(k+wx)*20);g.stroke()}}
        L(c,.38,0,310,{water:true})}
      BG.ground=hbGround('grass');
      BG.post=(t,camX)=>{const off=camX*.38;for(let i=0;i<60;i++){const x=((hbR(i)*HB_W+t*.4-off)%W+W)%W,y=252+hbR(i+1)*44;ctx.fillStyle=`rgba(220,240,255,${.35+.35*Math.sin(t*.1+i)})`;ctx.fillRect(x,y,6,1.4)}};
      break}
    case'redcliff':{
      BG.sky=hbSky(['#04050e','#0a1028','#1a1a44','#4a1c3c','#8a2a2a'],{stars:160,moon:[160,90,20]});
      {const m=hbMount(330,{base:300,amp:210,ks:[1,2,5],as:[.55,.3,.15],seed:8,top:'#8a2e1e',bot:'#c05030',lit:'#ffb070',strata:true,haze:'#6a2a2a'});
        const g=m.c.getContext('2d');g.fillStyle='rgba(255,200,160,.75)';g.font='bold 34px serif';g.textAlign='center';g.fillText('赤壁',420,190);g.fillText('赤壁',1380,200);L(m.c,.07,0,330)}
      {const [c,g]=hbC(HB_W,310);g.fillStyle=hbGrad(g,220,310,['#10183a','#1a2a50','#0a1228']);g.fillRect(0,220,HB_W,90);
        for(const sx of[240,720,1200,1680]){hbShip(g,sx,262,true);BG.objs.push({x:sx,y:262,fire:true})}
        L(c,.34,0,310,{ships:true})}
      BG.ground=hbGround('deck');
      BG.post=(t,camX)=>{const off=camX*.34;for(const o of BG.objs)if(o.fire)hbWrap(o.x,x=>{const sx=((x-off)%HB_W+HB_W)%HB_W;if(sx>W+100)return;
          ctx.globalCompositeOperation='lighter';for(let k=0;k<11;k++){const fx=sx-60+k*12+Math.sin(t*.2+k)*3,fh=34+hbR(k*7+o.x)*40+Math.sin(t*.35+k*1.7+o.x)*16,fw=6+hbR(k+o.x)*8,sw=Math.sin(t*.25+k*2.1)*8,by=o.y-18-hbR(k*3)*14;
            const gr=ctx.createLinearGradient(0,by-fh,0,by);gr.addColorStop(0,'rgba(255,60,10,0)');gr.addColorStop(.45,'rgba(255,110,30,.5)');gr.addColorStop(.85,'rgba(255,210,110,.8)');gr.addColorStop(1,'rgba(255,250,210,.9)');
            ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(fx-fw,by);ctx.bezierCurveTo(fx-fw,by-fh*.5,fx+sw-fw*.4,by-fh*.7,fx+sw,by-fh);ctx.bezierCurveTo(fx+sw+fw*.3,by-fh*.6,fx+fw,by-fh*.4,fx+fw,by);ctx.closePath();ctx.fill()}
          ctx.globalAlpha=.35;ctx.drawImage(glowSpr('#ff6020'),sx-110,o.y-140,220,170);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'},200);
        for(let i=0;i<40;i++){const x=((hbR(i)*W+t*.8)%W),y=H*.7-((t*.9*(.5+hbR(i*5))+hbR(i*7)*400)%420);ctx.fillStyle=i%2?'#ffb040':'#ff6020';ctx.fillRect(x,y,2,2)}};
      break}
    case'pass':{
      BG.sky=hbSky(['#3a4250','#5a6474','#7a8492','#98a0a8','#a8aeb0']);
      L(hbClouds(9,'#8a929e','#4a525e',12,20,260),.02,0,260,{drift:.08});
      L(hbMount(330,{base:280,amp:190,ks:[1,3,6],as:[.5,.3,.2],seed:10,top:'#4a5462',bot:'#7a8490',lit:'#c8d0d8',haze:'#9aa2aa'}).c,.05,0,330);
      L(hbMount(320,{base:300,amp:110,ks:[2,5,8],as:[.5,.3,.2],seed:11,top:'#34443e',bot:'#5a6a60',lit:'#b8c8b8',trees:110,treeC:'#24342c',haze:'#7a8a80'}).c,.16,0,320);
      {const [c,g]=hbC(HB_W,310);for(let i=0;i<14;i++){const x=hbR(i*41)*HB_W;hbWrap(x,xx=>{g.fillStyle=hbGrad(g,200,310,['#6a6a66','#3a3a38']);g.beginPath();g.moveTo(xx-60,310);g.lineTo(xx-40,240+hbR(i)*30);g.lineTo(xx-5,210+hbR(i*3)*40);g.lineTo(xx+30,250);g.lineTo(xx+60,310);g.fill();hbPine(g,xx+hbR(i*7)*40-20,300,40+hbR(i)*20,'#2a3a30')})}
        L(c,.4,0,310)}
      BG.ground=hbGround('mud');
      BG.post=(t)=>{for(let i=0;i<6;i++){const x=((hbR(i)*W*1.5+t*.25*(1+hbR(i*2)))%(W+400))-200,y=H*.55+hbR(i*3)*120;ctx.fillStyle='rgba(210,215,220,.08)';ctx.beginPath();ctx.ellipse(x,y,260,40,0,0,7);ctx.fill()}};
      break}
    case'night':{
      BG.sky=hbSky(['#02030c','#070c24','#10183c','#1c2448','#2a2c50'],{stars:260,moon:[760,110,16]});
      {const g=BG.sky.getContext('2d'),pts=[[200,80],[240,70],[280,76],[310,96],[350,104],[380,134],[420,128]];g.strokeStyle='rgba(200,220,255,.35)';g.lineWidth=1;g.beginPath();pts.forEach(p=>g.lineTo(p[0],p[1]));g.stroke();
        for(const p of pts){hbGlow(g,p[0],p[1],14,'#dfe8ff',.8);g.fillStyle='#ffffff';g.beginPath();g.arc(p[0],p[1],2.2,0,7);g.fill()}}
      L(hbMount(330,{base:290,amp:120,ks:[1,2,5],as:[.5,.35,.15],seed:12,top:'#141a30',bot:'#242c48',lit:'#6a7ab0',haze:'#2a3050'}).c,.05,0,330);
      {const [c,g]=hbC(HB_W,310);for(let i=0;i<12;i++){const x=80+i*160;hbWrap(x,xx=>{if(i%3===2)hbLantern(g,xx,300);else hbTent(g,xx,300,i%2?'#c8b898':'#a89878')})}
        for(let x=40;x<HB_W;x+=320)BG.objs.push({x,y:292,col:'#3a4a8a',ch:'魏'});
        L(c,.4,0,310,{flags:true})}
      BG.ground=hbGround('nightgrass');
      BG.post=(t,camX)=>{ctx.globalCompositeOperation='lighter';for(let i=0;i<30;i++){const x=((hbR(i)*W+Math.sin(t*.01+i)*40-camX*.6)%W+W)%W,y=H*.55+hbR(i*3)*H*.4+Math.sin(t*.03+i*2)*10;
        ctx.globalAlpha=.4+.4*Math.sin(t*.08+i);ctx.drawImage(glowSpr('#c8ff80'),x-8,y-8,16,16)}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'};
      break}
    default:return buildBG('plains');
  }
};
drawPixelBG=function(camX,t){
  if(!BG||!BG.hd)return;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(BG.sky,0,0,W,H);
  for(const Ly of BG.layers){
    const off=((camX*Ly.par+(Ly.drift?t*Ly.drift:0))%HB_W+HB_W)%HB_W;
    ctx.drawImage(Ly.c,-off,Ly.y,HB_W,Ly.h);if(HB_W-off<W)ctx.drawImage(Ly.c,HB_W-off,Ly.y,HB_W,Ly.h);
    if(Ly.flags)for(const o of BG.objs)if(o.col){const sx=((o.x-off)%HB_W+HB_W)%HB_W;if(sx<W+40)hbBanner(ctx,sx,Ly.y+o.y,o.col,o.ch,o.x,t);if(sx-HB_W>-40)hbBanner(ctx,sx-HB_W,Ly.y+o.y,o.col,o.ch,o.x,t)}
  }
  const goff=((camX%HB_W)+HB_W)%HB_W,gh=H-HB_GT+6;
  ctx.drawImage(BG.ground,-goff,HB_GT,HB_W,gh);if(HB_W-goff<W)ctx.drawImage(BG.ground,HB_W-goff,HB_GT,HB_W,gh);
  /* 전장 앞쪽 큰북 (투기장 분위기) */
  if(BG.kind==='fortress')for(const bx of[300,1260]){const sx=((bx-goff)%HB_W+HB_W)%HB_W;if(sx<W+60)hbDrum(ctx,sx,HB_GT+58,.9);if(sx-HB_W>-60)hbDrum(ctx,sx-HB_W,HB_GT+58,.9)}
  if(BG.post)BG.post(t,camX);
  ctx.imageSmoothingEnabled=false;
};
