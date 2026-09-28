'use strict';
/* ===== 2D 일러스트 SD 캐릭터 렌더러 (모바일 삼국 RPG 풍) =====
   2.5등신 SD 비율 · 애니풍 큰 눈 · 셀 셰이딩 그라데이션 · 금장 장식 갑주 · 큰 무기.
   파츠(망토 · 뒷머리 · 팔 · 견갑 · 다리 · 치마 · 몸통 · 머리 · 무기)를 벡터로 그려 해상도별로 캐시하고,
   기존 renderModel 과 같은 포즈 값(armL · armR · wAng · wAng2 · legL · legR · lean · head · cape · bob · ext · spin · lie)으로 관절 조립한다.
   좌표 단위: 캐릭터 공간 1유닛, 발바닥 y=0, 위쪽이 -y, 얼굴은 +x(앞)를 보는 3/4 시점. */
const SD_INK='#1b1016',SD_GOLD='#f0c24e',SD_LW=1.05,SD_K=1.08,SD_TAU=Math.PI*2;

/* ---------- 색 도우미 ---------- */
function sdRGB(h){h=String(h||'#888888');if(h[0]!=='#')return[136,136,136];if(h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];const n=parseInt(h.slice(1,7),16);return[n>>16,(n>>8)&255,n&255]}
function sdHex(r,g,b){return'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function sdMix(a,b,t){const A=sdRGB(a),B=sdRGB(b);return sdHex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)}
function sdSh(c,a){return a>=0?sdMix(c,'#fff6e8',a/100):sdMix(c,'#140a18',-a/100)}
function sdA(c,a){const A=sdRGB(c);return`rgba(${A[0]},${A[1]},${A[2]},${a})`}

/* ---------- 도형 도우미 ---------- */
function sdRR(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function sdEl(x,y,rx,ry,rot){return g=>g.ellipse(x,y,rx,ry,rot||0,0,SD_TAU)}
/* 셀 셰이딩 채우기: 앞쪽 위(오른쪽 위)가 밝고, 뒤쪽 아래가 어두움. box=[x,y,w,h] */
function sdFill(g,path,col,box,o){
  o=o||{};const [x,y,w,h]=box;g.beginPath();path(g);
  if(o.flat)g.fillStyle=col;
  else{const gr=g.createLinearGradient(x+w*.8,y,x+w*.15,y+h);
    gr.addColorStop(0,sdSh(col,o.hl!=null?o.hl:34));gr.addColorStop(.4,col);gr.addColorStop(.64,col);
    gr.addColorStop(.67,sdSh(col,-16));gr.addColorStop(1,sdSh(col,-(o.dk!=null?o.dk:38)));g.fillStyle=gr}
  g.fill();
  if(o.lw!==0){g.lineWidth=o.lw||SD_LW;g.strokeStyle=o.ink||sdMix(col,SD_INK,.8);g.stroke()}
}
/* 금속 채우기: 강한 반사띠 */
function sdMetal(g,path,col,box,o){
  o=o||{};const [x,y,w,h]=box;g.beginPath();path(g);
  const gr=g.createLinearGradient(x+w,y,x,y+h);
  gr.addColorStop(0,sdSh(col,62));gr.addColorStop(.26,sdSh(col,22));gr.addColorStop(.42,sdSh(col,-28));
  gr.addColorStop(.56,col);gr.addColorStop(.78,sdSh(col,34));gr.addColorStop(1,sdSh(col,-34));
  g.fillStyle=gr;g.fill();
  if(o.lw!==0){g.lineWidth=o.lw||SD_LW*.9;g.strokeStyle=o.ink||sdMix(col,SD_INK,.8);g.stroke()}
}
function sdLine(g,pts,col,lw,a){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const p=pts[i];if(p.length===4)g.quadraticCurveTo(p[0],p[1],p[2],p[3]);else g.lineTo(p[0],p[1])}
  g.strokeStyle=a!=null?sdA(col,a):col;g.lineWidth=lw||.7;g.stroke()}
/* 파츠 캔버스: box=[x0,y0,w,h] (유닛, 기준점 원점), q=유닛당 픽셀 */
function sdPart(box,q,draw,dark){
  const [x0,y0,w,h]=box,c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*q));c.height=Math.max(1,Math.ceil(h*q));
  const g=c.getContext('2d');g.setTransform(q,0,0,q,-x0*q,-y0*q);g.lineJoin='round';g.lineCap='round';draw(g);
  if(dark){g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(26,12,40,.26)';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over'}
  return{c,x0,y0,w,h};
}
/* 뒤로 흩날리는 술 · 깃털 장식 */
function sdPlume(g,x,y,col,len,lift,n){
  n=n||3;for(let i=n-1;i>=0;i--){const d=i*2.6,L2=len*(1-i*.14),c=i%2?sdSh(col,-18):col;
    sdFill(g,g=>{g.moveTo(x,y);g.bezierCurveTo(x-L2*.3,y-lift-3+d,x-L2*.72,y-lift*.35+d,x-L2,y+L2*.22+d);
      g.bezierCurveTo(x-L2*.66,y+2.5+d,x-L2*.3,y+4+d,x+1.5,y+3);g.closePath()},c,[x-L2,y-lift,L2,L2*.3+lift],{lw:.7})}
}

/* ---------- 머리 ---------- */
const SD_HEADBOX=[-52,-142,104,196];
function sdHS(L){if(L.hs)return L.hs;if(L.face==='female')return'long_f';if(L.hat==='zhang')return'spiky';if(L.hat==='sun')return'ponytail';if(L.hat==='diao')return'long_f';return'short'}
function sdEye(g,cx,cy,w,h,L,near){
  const fem=L.face==='female',fierce=L.face==='fierce',calm=L.face==='calm';
  if(L.eyes==='sharp'){h*=.8;cy+=.8}else if(L.eyes==='round'){h*=1.08;w*=1.04}
  const ec=L.eye||(fem?'#b0386e':fierce?'#9a5a1c':calm?'#3a4a6a':'#5a3a24');
  g.save();g.beginPath();g.ellipse(cx,cy,w/2,h/2,0,0,SD_TAU);g.fillStyle='#fffaf2';g.fill();g.clip();
  const ix=cx+(near?.7:.9),rx=w*.41,ry=h*.47,iy=cy+h*.05;
  const gr=g.createLinearGradient(0,iy-ry,0,iy+ry);gr.addColorStop(0,sdSh(ec,-66));gr.addColorStop(.48,ec);gr.addColorStop(1,sdSh(ec,58));
  g.beginPath();g.ellipse(ix,iy,rx,ry,0,0,SD_TAU);g.fillStyle=gr;g.fill();
  g.beginPath();g.ellipse(ix,iy+h*.04,rx*.46,ry*.5,0,0,SD_TAU);g.fillStyle=sdSh(ec,-82);g.fill();
  g.fillStyle='rgba(60,20,40,.28)';g.fillRect(cx-w,cy-h/2,w*2,h*.2);
  if(calm){g.fillStyle=L.skin;g.fillRect(cx-w,cy-h/2-1,w*2,h*.36+1)}
  g.fillStyle='#ffffff';g.beginPath();g.ellipse(ix-rx*.32,cy-h*.1,rx*.44,ry*.3,-.3,0,SD_TAU);g.fill();
  g.globalAlpha=.85;g.beginPath();g.arc(ix+rx*.42,cy+h*.24,rx*.22,0,SD_TAU);g.fill();g.globalAlpha=1;
  /* 홍채 테두리 · 아래쪽 반사 (반짝이는 애니풍 눈) */
  g.strokeStyle=sdA(sdSh(ec,-70),.8);g.lineWidth=.45;g.beginPath();g.ellipse(ix,iy,rx,ry,0,0,SD_TAU);g.stroke();
  const rf=g.createLinearGradient(0,iy,0,iy+ry);rf.addColorStop(0,sdA(sdSh(ec,70),0));rf.addColorStop(1,sdA(sdSh(ec,70),.55));g.fillStyle=rf;g.beginPath();g.ellipse(ix,iy+ry*.45,rx*.8,ry*.45,0,0,SD_TAU);g.fill();
  g.fillStyle='rgba(255,255,255,.9)';g.fillRect(ix-rx*.55,iy-ry*.05,.7,.7);
  g.restore();
  if(L.eyes==='sharp'){g.strokeStyle='#1a0e12';g.lineWidth=.9;g.beginPath();const ox2=near?cx-w/2-.6:cx+w/2+.6;g.moveTo(ox2,cy-h*.2);g.lineTo(ox2+(near?-1.6:1.4),cy-h*.55);g.stroke()}
  /* 윗 속눈썹 (사나운 눈은 코 쪽이 내려감) */
  const top=calm?cy-h*.16:cy-h*.5,lx0=cx-w/2-.7,lx1=cx+w/2+.7;let y0=top+1,y1=top+.6;
  if(fierce){if(near)y1+=1.9;else y0+=1.9}
  g.beginPath();g.moveTo(lx0,y0);g.quadraticCurveTo(cx,top-h*.16,lx1,y1);g.strokeStyle='#1a0e12';g.lineWidth=1.55;g.stroke();
  const ox=near?lx0:lx1,oy=near?y0:y1;g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+(near?-1.8:1.3),oy-(fem?1.9:.7));g.lineWidth=1.1;g.stroke();
  if(fem){g.lineWidth=.7;for(let i=0;i<2;i++){const px=near?lx0+1+i*1.6:lx1-1-i*1.4;g.beginPath();g.moveTo(px,top+.2);g.lineTo(px+(near?-1:1)*.8,top-1.6);g.stroke()}}
  g.beginPath();g.moveTo(cx-w*.3,cy+h/2-.2);g.quadraticCurveTo(cx,cy+h/2+.5,cx+w*.35,cy+h/2-.4);g.strokeStyle='rgba(90,40,40,.55)';g.lineWidth=.6;g.stroke();
}
function sdBrows(g,L){
  const hr=L.hair||'#1a1410',bc=sdSh(hr,-25);
  if(L.face==='fierce'){g.fillStyle='#120a0c';
    g.beginPath();g.moveTo(-1.5,-26.8);g.lineTo(9.4,-23.2);g.lineTo(9,-21.6);g.lineTo(-1.2,-24.6);g.closePath();g.fill();
    g.beginPath();g.moveTo(12.8,-22.8);g.lineTo(19.6,-26);g.lineTo(19.8,-24.4);g.lineTo(13,-21.4);g.closePath();g.fill()}
  else{const lw=L.face==='female'?.8:1.25;
    sdLine(g,[[-.4,-24.4],[4,-27.2,8.6,-25.2]],bc,lw);sdLine(g,[[13.2,-25],[16.2,-26.6,19.2,-24.6]],bc,lw)}
}
/* 얼굴형: sharp(갸름) · square(각진 턱) · soft(둥근) · long(긴 얼굴) · 기본 */
function sdFacePath(g,jaw){
  g.moveTo(-15,-26);g.bezierCurveTo(-16,-47,23,-49,22,-26);
  if(jaw==='sharp'){g.bezierCurveTo(22,-15,17,-4,11.5,.6);g.bezierCurveTo(5.5,1.4,-6,-3,-12,-10)}
  else if(jaw==='square'){g.bezierCurveTo(23.5,-12,22,-2,15,0);g.lineTo(5,1.2);g.bezierCurveTo(-4,.4,-11,-3,-13.4,-9.5)}
  else if(jaw==='soft'){g.bezierCurveTo(22.5,-12.5,18,-3,10,-1.2);g.bezierCurveTo(3,.2,-7.5,-3,-12,-9)}
  else if(jaw==='long'){g.bezierCurveTo(22,-12.5,19.4,.4,11.4,3);g.bezierCurveTo(4.4,4,-7,-1,-12.4,-9)}
  else{g.bezierCurveTo(22,-14,19,-4,10,-1.5);g.bezierCurveTo(4,0,-7,-2,-12,-9)}
  g.bezierCurveTo(-15,-14,-15,-20,-15,-26);g.closePath();
}
function sdFace(g,L){
  const sk=L.skin,fem=L.face==='female',fierce=L.face==='fierce',jaw=L.jaw;
  sdFill(g,g=>sdRR(g,-5,-10,10,15,3),sdSh(sk,-14),[-5,-10,10,15],{lw:.8});
  sdFill(g,g=>sdFacePath(g,jaw),sk,[-15,-45,37,48],{hl:24,dk:22});
  /* 턱 아래 그림자 · 뺨 하이라이트 */
  g.save();g.beginPath();sdFacePath(g,jaw);g.clip();
  g.fillStyle=sdA(sdSh(sk,-40),.35);g.beginPath();g.ellipse(-8,-12,10,14,0,0,SD_TAU);g.fill();
  const hl=g.createRadialGradient(15,-20,0,15,-20,9);hl.addColorStop(0,'rgba(255,250,240,.35)');hl.addColorStop(1,'rgba(255,250,240,0)');g.fillStyle=hl;g.fillRect(4,-32,20,24);
  if(jaw==='square'){g.fillStyle=sdA(sdSh(sk,-45),.22);g.fillRect(-14,-10,30,3)}
  g.restore();
  if(L.age==='old'){const wc=sdA(sdSh(sk,-55),.7);sdLine(g,[[-2.4,-14],[-4.4,-15,-5.4,-17]],wc,.5);sdLine(g,[[-2.4,-12.6],[-4.6,-12.8,-5.6,-14]],wc,.5);
    sdLine(g,[[13.4,-9],[15.6,-6,14.6,-3]],wc,.55);sdLine(g,[[4,-9],[3,-6,4,-3.4]],wc,.5);sdLine(g,[[1,-29],[9,-30.4,17,-29]],wc,.5);sdLine(g,[[3,-31.6],[9,-32.6,15,-31.6]],wc,.45)}
  sdFill(g,sdEl(-11.2,-15.5,3.3,4.6,-.2),sk,[-14.5,-20,7,9],{lw:.8});sdLine(g,[[-11.8,-18],[-10,-15.5,-11.6,-13]],sdSh(sk,-40),.6);
  const bl=fem?.42:L.face==='fierce'?.1:.22;g.fillStyle=`rgba(255,110,130,${bl})`;
  g.beginPath();g.ellipse(2.4,-10.4,3.2,1.5,0,0,SD_TAU);g.fill();g.beginPath();g.ellipse(17.6,-10.4,1.8,1.3,0,0,SD_TAU);g.fill();
  sdEye(g,4,-16.6,9.6,11.6,L,true);sdEye(g,16,-16.6,6,10.8,L,false);
  sdBrows(g,L);
  if(L.patch){sdLine(g,[[-14,-30],[6,-26,23,-21]],'#1a1010',1.1);sdFill(g,sdEl(16,-16.8,4.2,5.4,.1),'#1c1414',[12,-22,8,11],{lw:.7,hl:25,dk:10})}
  sdLine(g,[[11.6,-12],[13.2,-9.8,11.2,-9.2]],sdSh(sk,-38),.75);
  if(fem){g.fillStyle='#e0507a';g.beginPath();g.ellipse(10.6,-5.3,1.9,.95,0,0,SD_TAU);g.fill();g.fillStyle='#ff9ab4';g.fillRect(10.2,-5.8,1,.5)}
  else if(fierce){sdLine(g,[[8,-5.2],[10.6,-5.9,13.2,-5.3]],'#5a1e1e',.95);sdLine(g,[[8,-5.2],[7.4,-4.4]],'#5a1e1e',.7)}
  else sdLine(g,[[8.6,-5.8],[10.8,-4.4,12.8,-6]],'#6a2a2a',.8);
}
function sdBeard(g,L){
  const b=L.beard;if(!b)return;const bd=b==='white'?'#eceae4':'#16100e',lt=sdSh(bd,b==='white'?-30:35);
  const stache=()=>sdFill(g,g=>{g.moveTo(11,-7.6);g.quadraticCurveTo(15.5,-9.2,19.6,-5.6);g.quadraticCurveTo(15,-6.6,11,-5.6);g.closePath();
    g.moveTo(11,-7.6);g.quadraticCurveTo(6.5,-8.8,2.4,-4.6);g.quadraticCurveTo(6.6,-6.2,11,-5.6);g.closePath()},bd,[2,-9,18,5],{lw:.55});
  if(b==='long'||b==='white'){
    sdFill(g,g=>{g.moveTo(-9,-13);g.quadraticCurveTo(-4,-4,2,-5);g.quadraticCurveTo(10,-7,17.5,-10);g.quadraticCurveTo(21.5,-4,17.5,6);
      g.bezierCurveTo(15,20,10,33,6.5,44);g.bezierCurveTo(2,32,-6,17,-8,4);g.quadraticCurveTo(-11.5,-5,-9,-13);g.closePath()},bd,[-11,-13,33,57],{hl:44,dk:30});
    for(let i=0;i<5;i++){const x=-4+i*4.2;sdLine(g,[[x,-3],[x+2,16,6.2+i*.3,40-Math.abs(i-2)*4]],lt,.55,.55)}
    stache();}
  else if(b==='spiky'){
    g.beginPath();const P=[[-12,-17],[-15.5,-4],[-8.5,-8],[-7,5],[-1.5,-3],[1.5,9],[6,-2],[10,10],[13,-3],[18.5,5],[19,-6],[23.5,-2.5],[21,-12],[16,-8.2],[10,-6.4],[4,-6.6],[-3,-9.2],[-8,-13.5]];
    sdFill(g,g=>{g.moveTo(P[0][0],P[0][1]);for(const p of P)g.lineTo(p[0],p[1]);g.closePath()},bd,[-16,-17,40,27],{hl:40,dk:20});
    stache();}
  else if(b==='short'){stache();sdFill(g,g=>{g.moveTo(8.4,-3);g.quadraticCurveTo(10.6,-2,12.8,-3);g.lineTo(11,4.2);g.closePath()},bd,[8,-3,5,7],{lw:.55})}
}
function sdBangs(g,L,hs){
  const hr=L.hair||'#1a1410';
  if(hs==='spiky'){const T=[[-25,-26],[-27,-42],[-15,-44],[-17,-60],[-6,-52],[-2,-66],[6,-53],[14,-64],[16,-50],[26,-56],[23,-42],[30,-38],[24,-30]];
    sdFill(g,g=>{g.moveTo(-18,-20);for(const p of T)g.lineTo(p[0],p[1]);g.lineTo(18,-30);g.closePath()},hr,[-27,-66,57,46],{hl:32,dk:40})}
  if(L.hat==='none'&&hs==='short'){
    sdFill(g,g=>{g.moveTo(-16,-22);g.bezierCurveTo(-20,-46,20,-52,23,-30);g.quadraticCurveTo(10,-36,-2,-33);g.quadraticCurveTo(-10,-31,-16,-22);g.closePath()},hr,[-20,-50,43,28],{hl:22,dk:36});
    g.fillStyle=sdA(sdSh(hr,40),.35);for(let i=0;i<24;i++){const t=i/24;g.fillRect(-12+t*30,-44+Math.sin(t*3.1)*-3+((i*7)%5),.8,.8)}return}
  sdFill(g,g=>{g.moveTo(-17,-12);g.bezierCurveTo(-25,-41,-4,-55,8,-51);g.bezierCurveTo(22,-48,27.5,-36,24,-24);
    g.quadraticCurveTo(22.2,-21.5,21,-16.5);g.quadraticCurveTo(19.5,-24,16.2,-27.4);g.quadraticCurveTo(15,-22,12.4,-18.6);
    g.quadraticCurveTo(11,-25.2,8,-28.2);g.quadraticCurveTo(6,-22,3,-19.6);g.quadraticCurveTo(1,-26,-2,-28.2);g.quadraticCurveTo(-4.6,-22.4,-7,-21);
    g.quadraticCurveTo(-8,-25,-10,-26);g.quadraticCurveTo(-8.2,-18,-6.4,-11);g.quadraticCurveTo(-10,-18,-13,-23.5);g.quadraticCurveTo(-16,-18,-17,-12);g.closePath()},
    hr,[-24,-54,50,43],{hl:34,dk:42});
  g.save();g.setLineDash([3.2,1.6]);sdLine(g,[[-14,-36],[4,-49.5,20.5,-38.5]],sdSh(hr,72),1.9,.55);g.restore();
  const dl=sdSh(hr,-55);sdLine(g,[[5,-45],[2,-36,3,-20]],dl,.55,.6);sdLine(g,[[14,-44],[17,-34,12.6,-19]],dl,.55,.6);sdLine(g,[[-5,-44],[-6,-32,-7,-21.5]],dl,.55,.6);
  if(hs==='swept'||hs==='long_wild'){
    sdFill(g,g=>{g.moveTo(24,-40);g.bezierCurveTo(18,-30,8,-28,-2,-24);g.quadraticCurveTo(-6,-22,-8.6,-17.6);g.quadraticCurveTo(-6,-26,4,-31);g.quadraticCurveTo(-2,-27,-4.4,-23);g.bezierCurveTo(0,-31,12,-35,19,-44);g.closePath()},sdSh(hr,6),[-9,-44,33,27],{hl:40,dk:36});
    sdLine(g,[[20,-41],[10,-32,-3,-24.6]],sdSh(hr,70),.9,.5);
    sdFill(g,g=>{g.moveTo(-13,-26);g.quadraticCurveTo(-18,-10,-15,6);g.lineTo(-12,1);g.lineTo(-11.4,8);g.quadraticCurveTo(-12,-10,-8,-23);g.closePath()},hr,[-18,-26,10,34],{hl:30,dk:42});
    if(hs==='long_wild')for(const [x,y,ex,ey] of[[-20,-44,-32,-58],[-10,-52,-16,-70],[2,-54,4,-72],[14,-52,24,-66],[22,-44,34,-50]])sdFill(g,g=>{g.moveTo(x-4,y+6);g.quadraticCurveTo((x+ex)/2-2,(y+ey)/2,ex,ey);g.quadraticCurveTo((x+ex)/2+3,(y+ey)/2+2,x+4,y+5);g.closePath()},hr,[Math.min(x,ex)-4,ey,Math.abs(ex-x)+8,y-ey+6],{hl:34,dk:40})}
  if(hs==='long_f'){
    sdFill(g,g=>{g.moveTo(19,-30);g.quadraticCurveTo(25,-16,23.5,2);g.quadraticCurveTo(22,6,20.5,3);g.quadraticCurveTo(22,-12,17.5,-24);g.closePath()},hr,[17,-30,9,36],{hl:30,dk:40});
    sdFill(g,g=>{g.moveTo(-13,-24);g.quadraticCurveTo(-18,-8,-16,8);g.quadraticCurveTo(-13.5,10,-12.4,6);g.quadraticCurveTo(-13.5,-8,-9,-22);g.closePath()},hr,[-18,-24,9,34],{hl:30,dk:40})}
  if(hs==='topknot'){sdFill(g,sdEl(-1,-53,7.5,6.2),hr,[-9,-60,16,13]);sdFill(g,g=>sdRR(g,-6.4,-49,11,3,1.4),'#c83030',[-6,-49,11,3],{lw:.7})}
}
function sdHelm(g,col,trim,o){
  o=o||{};
  sdMetal(g,g=>{g.moveTo(-21,-30);g.lineTo(-23.5,-7);g.quadraticCurveTo(-17,-3.5,-10.5,-8.5);g.lineTo(-10.5,-28);g.closePath()},col,[-23,-30,13,26]);
  for(let i=0;i<3;i++)sdLine(g,[[-22.6+i*.3,-22+i*5.5],[-17,-20+i*5.5,-11,-22.5+i*5.5]],sdSh(col,-45),.55,.8);
  sdMetal(g,g=>{g.moveTo(-22.5,-26);g.bezierCurveTo(-25,-60,24,-64,26.5,-27);g.closePath()},col,[-25,-61,52,35]);
  sdLine(g,[[1,-60],[17,-56,23.5,-34]],'#ffffff',1.1,.55);sdLine(g,[[1,-60],[-12,-57,-20,-36]],sdSh(col,-50),.7,.6);
  sdMetal(g,g=>sdRR(g,-23.5,-31,51,6.4,3),trim,[-23.5,-31,51,6.4],{lw:.9});
  for(let x=-18;x<26;x+=6.5){g.fillStyle=sdSh(trim,55);g.beginPath();g.arc(x,-27.8,.9,0,SD_TAU);g.fill()}
  if(!o.noEmblem)sdMetal(g,g=>{g.moveTo(6.5,-33);g.lineTo(11,-45);g.lineTo(15.5,-33);g.lineTo(11,-28.5);g.closePath()},trim,[6.5,-45,9,17],{lw:.8});
  if(o.gem){g.fillStyle=o.gem;g.beginPath();g.ellipse(11,-35.5,1.7,2.4,0,0,SD_TAU);g.fill();g.fillStyle='rgba(255,255,255,.8)';g.fillRect(10.3,-37,.8,.9)}
  if(!o.noKnob)sdMetal(g,sdEl(1,-60.5,3.6,3.1),trim,[-3,-64,8,7]);
}
/* 모자 · 투구 중 머리 뒤에 오는 부분 (술 · 리본 · 깃털) */
function sdHatBack(g,L){
  switch(L.hat){
    case'guan':for(const [dx,len] of[[0,34],[4,28]])sdFill(g,g=>{g.moveTo(-17,-33+dx);g.bezierCurveTo(-26,-20,-30+dx,-4,-33+dx,len-30);g.lineTo(-28+dx,len-28);g.bezierCurveTo(-25,-8+dx,-20,-20,-13,-30+dx);g.closePath()},dx?sdSh('#2f7d3b',-18):'#2f7d3b',[-33,-33,20,len]);break;
    case'zhang':for(const d of[0,5])sdFill(g,g=>{g.moveTo(-19,-30);g.quadraticCurveTo(-28,-26+d,-34,-16+d*1.6);g.lineTo(-30,-15+d*1.6);g.quadraticCurveTo(-25,-24+d,-18,-27);g.closePath()},'#b03a2e',[-34,-30,16,16]);break;
    case'zhao':sdPlume(g,-2,-60,'#e02a2a',40,10,4);break;
    case'helm':sdPlume(g,0,-62,L.plumeC||'#c02828',16,4,2);break;
    case'helm2':sdPlume(g,0,-62,L.plumeC||'#e02828',34,14,4);break;
    case'helmW':sdPlume(g,0,-62,L.plumeC||'#f0f0f0',22,8,3);break;
    case'helmH':break;
    case'helmP':sdPlume(g,-2,-70,L.plumeC||'#ff6030',44,18,5);break;
    case'helmR':for(const d of[0,5])sdFill(g,g=>{g.moveTo(-19,-30);g.quadraticCurveTo(-28,-24+d,-33,-12+d*1.6);g.lineTo(-29,-11+d*1.6);g.quadraticCurveTo(-24,-22+d,-18,-27);g.closePath()},L.plumeC||'#c02828',[-33,-30,16,20]);break;
    case'ma':sdPlume(g,-4,-58,'#fafafa',46,12,4);break;
    case'huang':sdPlume(g,-1,-58,'#c02020',18,3,2);break;
    case'lubu':
      for(const [x,ex,ey,c] of[[-5,-44,-132,'#f6ecc8'],[4,-20,-140,'#ffe8b0']]){
        g.beginPath();g.moveTo(x-1.4,-56);g.bezierCurveTo(x-8,-90,ex+14,ey+24,ex,ey);g.bezierCurveTo(ex+18,ey+26,x+2,-90,x+1.6,-56);g.closePath();
        const gr=g.createLinearGradient(x,-56,ex,ey);for(let i=0;i<=10;i++)gr.addColorStop(i/10,i%2?'#8a5a24':c);g.fillStyle=gr;g.fill();
        g.strokeStyle=SD_INK;g.lineWidth=.8;g.stroke()}break;
    case'gan':for(const [x,ex,ey] of[[-12,-26,-74],[-6,-16,-80]]){sdFill(g,g=>{g.moveTo(x,-40);g.quadraticCurveTo(ex-6,(ey-40)/2-20,ex,ey);g.quadraticCurveTo(ex+2,(ey-40)/2-18,x+3,-40);g.closePath()},'#3aa0e8',[ex-6,ey,x-ex+10,-40-ey]);
      sdLine(g,[[x+1,-40],[ex-2,(ey-40)/2-18,ex+.5,ey+2]],'#1a4a8a',.5)}
      sdFill(g,g=>{g.moveTo(-19,-31);g.quadraticCurveTo(-27,-27,-31,-18);g.lineTo(-27,-17);g.quadraticCurveTo(-24,-25,-18,-28);g.closePath()},'#c02020',[-31,-31,14,14]);break;
    case'scarf':sdFill(g,g=>{g.moveTo(-18,-34);g.quadraticCurveTo(-28,-30,-32,-18);g.lineTo(-27,-16);g.quadraticCurveTo(-24,-26,-16,-30);g.closePath()},'#e8c020',[-32,-34,16,18]);break;
    case'taoist':sdLine(g,[[-4,-53],[-14,-48,-22,-36]],'#e8c040',.9);break;
    case'zhuge':for(const d of[0,4])sdFill(g,g=>{g.moveTo(-12,-44);g.quadraticCurveTo(-20,-36+d,-24,-20+d);g.lineTo(-21,-19+d);g.quadraticCurveTo(-17,-34+d,-10,-42);g.closePath()},'#1e1e2a',[-24,-44,14,26]);break;
  }
}
function sdHat(g,L){
  const hat=L.hat;
  switch(hat){
    case'helm':sdHelm(g,L.helmc||sdSh(L.body||'#5a5a60',-30),L.sub||SD_GOLD,{gem:L.gemC});break;
    case'helmW':sdHelm(g,L.helmc||'#b8c0cc',SD_GOLD,{gem:L.gemC||'#40a0ff'});
      for(const s of[1,-1]){const x=s>0?21:-18;for(let k=0;k<3;k++)sdFill(g,g=>{g.moveTo(x,-40+k*4);g.quadraticCurveTo(x+s*(14-k*2),-58+k*5,x+s*(10-k*2),-70+k*8);g.quadraticCurveTo(x+s*(6-k),-54+k*4,x-s*2,-44+k*4);g.closePath()},k%2?sdSh(L.plumeC||'#f4f4f4',-12):(L.plumeC||'#f4f4f4'),[x-14,-70,28,32],{lw:.6,hl:40})}break;
    case'helmH':sdHelm(g,L.helmc||'#5a5a64',L.sub||SD_GOLD,{gem:L.gemC});
      for(const s of[1,-1]){const x=s>0?13:-11;sdFill(g,g=>{g.moveTo(x-3,-50);g.bezierCurveTo(x+s*4,-58,x+s*16,-58,x+s*16,-74);g.bezierCurveTo(x+s*10,-62,x+s*3,-60,x+3,-52);g.closePath()},'#eadcbc',[x-16,-74,32,26],{hl:40})}break;
    case'helmP':sdHelm(g,L.helmc||'#d8a838',SD_GOLD,{gem:L.gemC||'#ff3030',noKnob:true});
      sdMetal(g,g=>{g.moveTo(-2,-58);g.bezierCurveTo(-6,-72,4,-84,14,-86);g.bezierCurveTo(8,-80,6,-70,4,-58);g.closePath()},SD_GOLD,[-6,-86,20,28],{lw:.6});
      sdFill(g,sdEl(12,-84,2.4,2.4),L.gemC||'#ff3030',[9.6,-86.4,4.8,4.8],{lw:.4,hl:70});break;
    case'helmR':sdFill(g,g=>{g.moveTo(-21,-34);g.quadraticCurveTo(2,-40,25,-33);g.lineTo(25,-27);g.quadraticCurveTo(2,-33,-21,-28);g.closePath()},L.plumeC||'#c02828',[-21,-40,46,13]);
      sdMetal(g,g=>{g.moveTo(10,-38);g.lineTo(13,-34);g.lineTo(10,-29);g.lineTo(7,-34);g.closePath()},SD_GOLD,[7,-38,6,9],{lw:.5});sdFill(g,sdEl(10,-33.6,1.4,2),L.gemC||'#40c0ff',[8,-36,4,5],{lw:.3,hl:70});break;
    case'helm2':sdHelm(g,L.helmc||'#c89a38',SD_GOLD,{gem:L.gemC||'#e02828'});
      for(const s of[1,-1]){const x=s>0?20:-17;sdMetal(g,g=>{g.moveTo(x,-44);g.quadraticCurveTo(x+s*10,-54,x+s*6,-66);g.quadraticCurveTo(x+s*2,-54,x-s*2,-48);g.closePath()},SD_GOLD,[x-4,-66,14,24],{lw:.7})}break;
    case'zhao':sdHelm(g,'#e6edf5',SD_GOLD,{gem:'#3a8ae8'});break;
    case'huang':sdHelm(g,'#a8702a',SD_GOLD,{noKnob:true});sdMetal(g,g=>{g.moveTo(-1.6,-59);g.lineTo(1,-76);g.lineTo(3.6,-59);g.closePath()},SD_GOLD,[-2,-76,6,17]);
      sdFill(g,sdEl(1,-78,3,3),'#d02020',[-2,-81,6,6],{hl:60});break;
    case'ma':sdHelm(g,'#eef2f8',SD_GOLD,{noEmblem:true});
      for(let i=0;i<12;i++){const a=i/12*SD_TAU;sdFill(g,g=>{g.moveTo(12+Math.cos(a)*4,-40+Math.sin(a)*4);g.lineTo(12+Math.cos(a+.26)*9,-40+Math.sin(a+.26)*9);g.lineTo(12+Math.cos(a+.52)*4,-40+Math.sin(a+.52)*4);g.closePath()},'#d8a830',[3,-49,18,18],{lw:.4})}
      sdMetal(g,sdEl(12,-40,5.6,5.6),SD_GOLD,[6,-46,12,12]);g.fillStyle='#6a3a10';g.fillRect(9.5,-42,1.6,1.2);g.fillRect(13.2,-42,1.6,1.2);sdLine(g,[[9.5,-37.5],[12,-36,14.8,-37.5]],'#6a3a10',.7);break;
    case'wei':for(const s of[1,-1]){const x=s>0?12:-12;sdFill(g,g=>{g.moveTo(x-3,-48);g.bezierCurveTo(x+s*2,-60,x+s*12,-64,x+s*10,-78);g.bezierCurveTo(x+s*6,-66,x+s*2,-60,x+3,-50);g.closePath()},'#eadcbc',[x-10,-78,20,30],{hl:40})}
      sdHelm(g,'#6a1c1c','#c8a040',{});break;
    case'lubu':sdHelm(g,'#e8b83a','#fff0a0',{gem:'#e02828',noKnob:true});sdFill(g,sdEl(1,-61,4.2,3.6),'#d02020',[-3,-65,8,7],{hl:60});
      sdMetal(g,g=>{g.moveTo(-3,-58);g.quadraticCurveTo(1,-66,8,-66);g.quadraticCurveTo(4,-62,3,-56);g.closePath()},'#fff0a0',[-3,-66,11,10],{lw:.6});break;
    case'guan':sdFill(g,g=>{g.moveTo(-21,-28);g.bezierCurveTo(-23,-58,23,-62,25,-30);g.closePath()},'#2f7d3b',[-23,-60,48,32]);
      sdMetal(g,g=>sdRR(g,-22,-33,48,6,3),SD_GOLD,[-22,-33,48,6]);sdFill(g,sdEl(11,-41,3.4,4),'#3ae08a',[7,-45,8,8],{hl:60});
      sdMetal(g,g=>{g.moveTo(11,-47);g.lineTo(14.5,-41);g.lineTo(11,-35);g.lineTo(7.5,-41);g.closePath()},SD_GOLD,[7,-47,8,12],{lw:.6});sdFill(g,sdEl(11,-41,1.8,2.4),'#3ae08a',[9,-44,4,5],{lw:.4,hl:70});break;
    case'zhang':sdFill(g,g=>{g.moveTo(-21,-34);g.quadraticCurveTo(2,-40,25,-33);g.lineTo(25,-26.5);g.quadraticCurveTo(2,-32,-21,-27.5);g.closePath()},'#1c1c1c',[-21,-40,46,14]);
      sdMetal(g,g=>sdRR(g,8,-36.5,7,6,1.5),'#b03a2e',[8,-37,7,6],{lw:.6});break;
    case'zhuge':sdFill(g,g=>{g.moveTo(-15,-40);g.lineTo(-11,-62);g.quadraticCurveTo(2,-66,15,-62);g.lineTo(19,-40);g.closePath()},'#1e1e2a',[-15,-66,34,26],{hl:30});
      sdFill(g,g=>sdRR(g,-17,-47,38,7,3),'#ece6d4',[-17,-47,38,7],{hl:20});sdLine(g,[[2,-61],[4,-55,3,-47]],'#3a3a4a',.6);break;
    case'crown':sdFill(g,g=>{g.moveTo(-13,-42);g.lineTo(-11,-62);g.lineTo(17,-64);g.lineTo(19,-42);g.closePath()},'#1a1a2a',[-13,-64,32,22]);
      sdMetal(g,g=>sdRR(g,-15,-46,36,5,2),SD_GOLD,[-15,-46,36,5]);
      sdFill(g,g=>{g.moveTo(-24,-63);g.lineTo(30,-68);g.lineTo(30,-64.5);g.lineTo(-24,-59.5);g.closePath()},'#141420',[-24,-68,54,9]);sdLine(g,[[-24,-59.5],[30,-64.5]],SD_GOLD,1.1);
      for(const bx of[-22,-19.5,24.5,27,29.4])for(let j=0;j<5;j++){g.fillStyle=j%2?'#f4f0e0':'#e03030';g.beginPath();g.arc(bx,-58+j*3.4-(bx>0?4:0),1.15,0,SD_TAU);g.fill()}break;
    case'taoist':sdFill(g,g=>sdRR(g,-19,-34,43,6,3),'#1a1a1a',[-19,-34,43,6]);sdFill(g,g=>sdRR(g,-6,-58,13,12,4),L.sub||'#8a2a8a',[-6,-58,13,12]);
      sdMetal(g,g=>sdRR(g,-12,-53.5,26,2.2,1),'#e8c040',[-12,-54,26,2.4],{lw:.5});break;
    case'gan':sdFill(g,g=>{g.moveTo(-21,-35);g.quadraticCurveTo(2,-41,25,-33);g.lineTo(25,-26);g.quadraticCurveTo(2,-32,-21,-28);g.closePath()},'#d02828',[-21,-41,46,15]);
      for(const x of[-12,0,12]){sdMetal(g,sdEl(x,-28.5+Math.abs(x)*.05,2.4,2.4),SD_GOLD,[x-2.4,-31,5,5],{lw:.5})}break;
    case'sun':sdMetal(g,g=>sdRR(g,-20,-34,44,4,2),SD_GOLD,[-20,-34,44,4]);
      for(const [x,y] of[[-15,-40],[-7,-47]])for(let i=0;i<5;i++){const a=i/5*SD_TAU;sdFill(g,sdEl(x+Math.cos(a)*2.6,y+Math.sin(a)*2.6,2.2,2.2),'#e83838',[x-5,y-5,10,10],{lw:.5,hl:50})}
      for(const [x,y] of[[-15,-40],[-7,-47]]){g.fillStyle='#ffd060';g.beginPath();g.arc(x,y,1.3,0,SD_TAU);g.fill()}break;
    case'scarf':sdFill(g,g=>{g.moveTo(-22,-25);g.bezierCurveTo(-27,-60,25,-64,26,-26);g.quadraticCurveTo(2,-31,-22,-25);g.closePath()},'#e8c020',[-27,-62,53,37],{hl:40});
      for(let i=0;i<3;i++)sdLine(g,[[-20+i*3,-30-i*6],[4,-40-i*6,24-i*2,-30-i*6]],'#a88010',.7,.8);break;
    case'diao':for(const [x,y] of[[-12,-50],[8,-54]]){sdFill(g,sdEl(x,y,7,6),L.hair||'#1a1020',[x-7,y-6,14,12],{hl:34,dk:40});sdLine(g,[[x-6,y-3],[x+1,y-7.5,x+6,y-2]],sdSh(L.hair||'#1a1020',70),1,.5)}
      sdLine(g,[[-22,-47],[-5,-56]],'#ffd86a',1.3);sdMetal(g,sdEl(-22,-47,1.6,1.6),'#ffd86a',[-24,-49,4,4],{lw:.4});
      for(let i=0;i<5;i++){const a=i/5*SD_TAU-.3;sdFill(g,sdEl(16+Math.cos(a)*2.8,-45+Math.sin(a)*2.8,2.4,2,a),'#ff8ab8',[11,-50,10,10],{lw:.5,hl:50})}
      g.fillStyle='#ffe070';g.beginPath();g.arc(16,-45,1.4,0,SD_TAU);g.fill();
      sdLine(g,[[17,-42],[18,-36]],'#ffd86a',.6);sdMetal(g,sdEl(18,-35,1.1,1.6),'#ffd86a',[17,-37,2,3],{lw:.3});break;
  }
}
function sdHead(L,q){
  return sdPart(SD_HEADBOX,q,g=>{
    const hs=sdHS(L),hr=L.hair||'#1a1410';
    sdHatBack(g,L);
    sdFill(g,sdEl(-3,-28,21,19.5),hr,[-24,-48,42,39],{hl:20,dk:45});
    sdFace(g,L);
    sdBeard(g,L);
    sdBangs(g,L,hs);
    sdHat(g,L);
  });
}
function sdBackHair(L,q){
  const hs=sdHS(L);if(!(hs==='long'||hs==='long_f'||hs==='ponytail'||hs==='swept'||hs==='long_wild'))return null;
  const hr=L.hair||'#1a1410';
  return sdPart(SD_HEADBOX,q,g=>{
    if(hs==='ponytail'){
      sdFill(g,g=>{g.moveTo(-15,-44);g.bezierCurveTo(-36,-42,-42,-12,-32,20);g.quadraticCurveTo(-31,8,-26,4);g.quadraticCurveTo(-27,14,-22,22);g.bezierCurveTo(-26,-2,-24,-28,-12,-36);g.closePath()},hr,[-42,-44,30,66],{hl:30,dk:45});
      sdLine(g,[[-18,-40],[-34,-24,-30,12]],sdSh(hr,60),1.1,.4);
      sdFill(g,g=>sdRR(g,-19.5,-44,6,6,2),'#d02838',[-20,-44,6,6],{lw:.6})}
    else if(hs==='swept'||hs==='long_wild'){const len=hs==='long_wild'?34:16,hr2=sdSh(hr,-6);
      sdFill(g,g=>{g.moveTo(-18,-44);g.bezierCurveTo(-34,-34,-36,-6,-40,len);g.lineTo(-31,len-10);g.lineTo(-33,len+4);g.lineTo(-24,len-8);g.lineTo(-22,len+6);g.lineTo(-15,len-10);g.lineTo(-10,len);
        g.quadraticCurveTo(-4,-8,2,-40);g.closePath()},hr2,[-40,-44,42,len+50],{hl:30,dk:48});
      for(let i=0;i<4;i++)sdLine(g,[[-16+i*4,-34],[-26+i*4,len/3,-30+i*6,len-6]],sdSh(hr,i%2?60:-50),.7,.45)}
    else{const len=hs==='long_f'?40:24;
      sdFill(g,g=>{g.moveTo(-20,-38);g.bezierCurveTo(-29,-12,-27,len-8,-24,len);g.lineTo(-19,len-6);g.lineTo(-14,len+2);g.lineTo(-9,len-5);g.lineTo(-4,len+1);g.lineTo(0,len-8);
        g.quadraticCurveTo(6,-6,4,-40);g.closePath()},hr,[-28,-40,34,len+42],{hl:26,dk:46});
      for(let i=0;i<4;i++)sdLine(g,[[-18+i*5,-30],[-21+i*5,len/2,-19+i*5,len-4]],sdSh(hr,i%2?60:-50),.7,.45)}
  });
}

/* ---------- 몸통 (목 기준, 엉덩이 y=+26) ---------- */
function sdTorsoPath(g){g.moveTo(-10,0);g.quadraticCurveTo(-16.5,1,-16.8,7);g.bezierCurveTo(-16.2,15,-13.8,21,-12.8,27.5);g.lineTo(14.8,27.5);g.bezierCurveTo(16.2,20,18.8,14,18.8,8);g.quadraticCurveTo(18.4,1,11,0);g.closePath()}
function sdTorso(L,q){
  return sdPart([-22,-6,44,40],q,g=>{
    const a=L.armor||'cloth',b=L.body||'#666666',s=L.sub||SD_GOLD,sk=L.skin,BX=[-17,0,36,28];
    if(a==='bare'){sdFill(g,sdTorsoPath,sk,BX,{hl:30,dk:30});
      sdLine(g,[[-6,9],[-1,12.4,3,9.6]],sdSh(sk,-38),.8);sdLine(g,[[5,9.6],[10,12.8,15,9]],sdSh(sk,-38),.8);
      for(const y of[15,19])sdLine(g,[[0,y],[3.5,y+.8,7,y]],sdSh(sk,-30),.6);sdLine(g,[[3.5,13],[3.5,22]],sdSh(sk,-30),.6);
      sdFill(g,g=>{g.moveTo(-15,2);g.lineTo(-11,0);g.lineTo(18,20);g.lineTo(15,23);g.closePath()},'#6a4020',[-15,0,33,23],{lw:.7});
      for(let t=0;t<1;t+=.2){g.fillStyle=SD_GOLD;g.beginPath();g.arc(-13+t*30,1+t*21,.8,0,SD_TAU);g.fill()}}
    else sdFill(g,sdTorsoPath,b,BX);
    if(a==='plate'){
      const pc=sdSh(b,-6);
      sdFill(g,g=>{g.moveTo(-14,5);g.quadraticCurveTo(3,1.5,17.6,5.6);g.lineTo(17,20);g.quadraticCurveTo(2,22,-13,19.6);g.closePath()},pc,[-14,2,32,20]);
      g.save();g.beginPath();g.moveTo(-14,5);g.quadraticCurveTo(3,1.5,17.6,5.6);g.lineTo(17,20);g.quadraticCurveTo(2,22,-13,19.6);g.closePath();g.clip();
      const av=L.armV||0,dk=sdA(sdSh(pc,-45),.8),lt=sdA(sdSh(pc,40),.5);g.lineWidth=.55;
      if(av===1)for(let y=6;y<22;y+=2.6)for(let x=-15+((y*10|0)%2)*1.6;x<19;x+=3.2){g.beginPath();g.arc(x,y,1.8,.1,Math.PI-.1);g.strokeStyle=dk;g.stroke();g.fillStyle=lt;g.fillRect(x-.6,y+.4,1.2,.4)}
      else if(av===2){for(let y=6;y<21;y+=5)for(let x=-14+((y/5|0)%2)*3;x<18;x+=6){g.strokeStyle=dk;g.strokeRect(x,y,5.6,4.6);g.fillStyle=sdA(SD_GOLD,.9);for(const [dx,dy] of[[.8,.8],[4.8,.8],[.8,3.8],[4.8,3.8]]){g.beginPath();g.arc(x+dx,y+dy,.45,0,SD_TAU);g.fill()}}}
      else if(av===3){g.fillStyle=dk;for(let y=6;y<21;y+=1.6)for(let x=-14+((y*10|0)%2)*.8;x<18;x+=1.6){g.beginPath();g.arc(x,y,.5,0,SD_TAU);g.fill()}g.fillStyle=lt;g.fillRect(-14,6,32,.6)}
      else for(let y=7;y<21;y+=3.1)for(let x=-14+((y*10|0)%2)*2;x<18;x+=4){g.beginPath();g.arc(x+2,y,2.1,0,Math.PI);g.strokeStyle=dk;g.stroke();g.fillStyle=lt;g.fillRect(x+1,y+.3,1.2,.5)}
      g.restore();
      sdLine(g,[[-14,5],[3,1.5,17.6,5.6]],s,1.5);sdLine(g,[[-13,19.6],[2,22,17,20]],s,1.3);
      sdFill(g,g=>{g.moveTo(-3,0);g.lineTo(3.6,7.4);g.lineTo(10,0);g.closePath()},'#efe8d6',[-3,0,13,7],{lw:.7});
      sdLine(g,[[-3,0],[3.6,7.4],[10,0]],s,1.3);
      sdMetal(g,sdEl(4.6,12,5,5),s,[-.4,7,10,10]);sdMetal(g,sdEl(4.6,12,3.2,3.2),'#e8eef4',[1.4,8.8,6.4,6.4],{lw:.6});
      g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.ellipse(5.6,10.8,1.1,.7,-.5,0,SD_TAU);g.fill()}
    else if(a==='robe'||a==='cloth'){
      sdFill(g,g=>{g.moveTo(-3,0);g.lineTo(4,a==='robe'?12:8);g.lineTo(10.5,0);g.closePath()},'#f2ecdc',[-3,0,14,12],{lw:.7});
      sdLine(g,[[10.5,0],[7,8,-4,24]],s,2.4);sdLine(g,[[-3,0],[1.5,5,4,8.5]],s,2.2);
      if(a==='robe'){sdLine(g,[[-10,6],[-8,14,-9,22]],sdSh(b,-35),.6,.8);sdLine(g,[[14,6],[15,14,13,22]],sdSh(b,-35),.6,.8)}
      if(L.armV){const ec=sdA(L.sub||SD_GOLD,.8);g.fillStyle=ec;if(L.armV===1)for(let i=0;i<4;i++){g.beginPath();g.arc(-9+i*6,15,1.2,0,SD_TAU);g.fill()}
        else if(L.armV===2)sdLine(g,[[-12,12],[-6,9,0,12],[6,15,12,12]],L.sub||SD_GOLD,.7,.8);else{sdLine(g,[[-11,8],[-8,11,-11,14]],L.sub||SD_GOLD,.6,.8);sdLine(g,[[15,8],[12,11,15,14]],L.sub||SD_GOLD,.6,.8)}}}
    else if(a==='dress'){
      sdFill(g,g=>{g.moveTo(-2,0);g.lineTo(4,6.5);g.lineTo(10,0);g.closePath()},sk,[-2,0,12,7],{lw:.6});
      sdLine(g,[[-3,.4],[4,7.4],[11,.4]],'#fff4f8',1.3);
      for(let i=0;i<6;i++){g.fillStyle='rgba(255,230,240,.55)';g.beginPath();g.arc(-9+i*4.6,11+(i%2)*3,1.1,0,SD_TAU);g.fill()}}
    /* 허리띠 */
    if(a==='dress'){sdFill(g,g=>sdRR(g,-13.4,15,31,6.4,2.5),s,[-13,15,31,6.4]);
      sdFill(g,sdEl(-15,17,4,2.6,-.5),s,[-19,14,8,6],{lw:.7});sdFill(g,sdEl(-15,21,3.6,2.4,.5),s,[-19,18,8,6],{lw:.7})}
    else if(a==='robe'){sdFill(g,g=>sdRR(g,-13.6,19,31,5,2),s,[-13.6,19,31,5]);sdFill(g,g=>{g.moveTo(6,22);g.lineTo(8.6,33);g.lineTo(11,32.4);g.lineTo(8.6,22);g.closePath()},s,[6,22,5,11],{lw:.6})}
    else{const bc=L.belt||sdSh(a==='bare'?'#7a4a20':s,-30);
      sdFill(g,g=>sdRR(g,-13.8,20.6,31.4,6.6,2.4),bc,[-13.8,20.6,31.4,6.6]);
      const bv=L.beltV||0;
      if(bv===1){sdFill(g,g=>sdRR(g,1,20.2,7.4,7.4,1.6),'#5ab08a',[1,20.2,7.4,7.4],{lw:.6,hl:50});sdMetal(g,g=>sdRR(g,2.6,21.8,4.2,4.2,1),SD_GOLD,[2.6,21.8,4.2,4.2],{lw:.4})}
      else if(bv===2){sdMetal(g,g=>sdRR(g,2.2,21,5,5.6,1.2),SD_GOLD,[2.2,21,5,5.6],{lw:.6});for(const x of[-6,12])sdFill(g,g=>{g.moveTo(x-1,27);g.lineTo(x+1,27);g.lineTo(x+1.8,34);g.lineTo(x-1.8,34);g.closePath()},L.tasC||'#d82424',[x-2,27,4,7],{lw:.4})}
      else if(a==='plate'){sdMetal(g,sdEl(4.6,23.9,4.4,4.1),SD_GOLD,[.2,19.8,8.8,8.2]);
        g.fillStyle='#6a3a10';g.fillRect(2.6,22.6,1.3,1);g.fillRect(5.4,22.6,1.3,1);sdLine(g,[[2.6,25.6],[4.6,26.6,6.8,25.6]],'#6a3a10',.6)}
      else sdMetal(g,g=>sdRR(g,2.6,21.4,4.6,5,1.2),SD_GOLD,[2.6,21.4,4.6,5],{lw:.6})}
    /* 등급 장식: 에픽↑ 가슴 금용 문양 · 전용↑ 붉은 보주 */
    if(a==='plate'&&(L.gA||0)>=2){g.save();g.globalAlpha=.9;sdLine(g,[[-10,8],[-6,4,-2,9],[2,14,-4,17]],SD_GOLD,.8);sdLine(g,[[16,9],[13,5,11,10],[9,15,14,17]],SD_GOLD,.8);g.restore()}
    if((L.gA||0)>=4){const gc=L.gA>=5?'#ff3a2a':'#ffb030';sdFill(g,sdEl(4.6,12,1.8,1.8),gc,[2.8,10.2,3.6,3.6],{lw:.4,hl:70})}
    /* 목걸이 */
    if(L.neckC){sdLine(g,[[-4,1],[1,7,4.6,8.4],[8,7,12,1]],'#e8d8a0',.55);const nv=L.neckV||0;
      if(nv===1){sdFill(g,sdEl(4.6,11,2.6,2.6),'#6ab08a',[2,8.4,5.2,5.2],{lw:.45,hl:50});g.fillStyle='#1a3a28';g.beginPath();g.arc(4.6,11,.8,0,SD_TAU);g.fill();sdFill(g,sdEl(4.6,8.4,.9,.9),L.neckC,[3.7,7.5,1.8,1.8],{lw:.2})}
      else if(nv===2){sdFill(g,g=>{g.moveTo(3.4,8);g.quadraticCurveTo(4.6,14,6.8,15.6);g.quadraticCurveTo(5.6,12,5.8,8);g.closePath()},'#f4ecd8',[3.4,8,3.4,7.6],{lw:.4});sdFill(g,sdEl(4.6,8.2,1,1),L.neckC,[3.6,7.2,2,2],{lw:.2})}
      else sdFill(g,g=>{g.moveTo(4.6,8);g.lineTo(6.6,11);g.lineTo(4.6,14.4);g.lineTo(2.6,11);g.closePath()},L.neckC,[2.6,8,4,6.4],{lw:.45,hl:60})}
    /* 모피 깃 */
    if(L.fur){const fc=L.fur;for(let i=0;i<13;i++){const t=i/12,x=-17+t*36,y=1.5-Math.sin(t*Math.PI)*3.2+(i%2)*1.2,r=3.2+(i%3)*.7;
        sdFill(g,sdEl(x,y,r,r*.85,t),fc,[x-r,y-r,r*2,r*2],{lw:.5,hl:40,dk:26})}
      for(let i=0;i<9;i++){const x=-14+i*4,y=-1.4-Math.sin(i/8*Math.PI)*3;sdLine(g,[[x,y],[x+.6,y+1.6]],sdSh(fc,-35),.4,.8)}}
  });
}
/* 치마 · 갑옷 태세트 · 도포 자락 (엉덩이 기준) */
function sdSkirt(L,q){
  const a=L.armor||'cloth',b=L.body||'#666666',s=L.sub||SD_GOLD;
  if(a==='bare')return sdPart([-8,-2,24,22],q,g=>{sdFill(g,g=>{g.moveTo(4,0);g.lineTo(3,15);g.lineTo(6.5,13.4);g.lineTo(9,16);g.lineTo(9.4,0);g.closePath()},s,[3,0,7,16],{lw:.7})});
  return sdPart([-26,-2,52,42],q,g=>{
    if(a==='plate'){
      sdFill(g,g=>{g.moveTo(-13,0);g.lineTo(15,0);g.lineTo(19.5,19);g.quadraticCurveTo(3,22.5,-17.5,19);g.closePath()},sdSh(b,-26),[-17,0,37,22]);
      const flap=(x,w,h,c,sk)=>{sdFill(g,g=>{g.moveTo(x,0);g.lineTo(x+w,0);g.lineTo(x+w+sk,h-3);g.quadraticCurveTo(x+w/2+sk/2,h+1.5,x+sk,h-3);g.closePath()},c,[x,0,w,h]);
        g.save();g.beginPath();g.moveTo(x,0);g.lineTo(x+w,0);g.lineTo(x+w+sk,h-3);g.lineTo(x+sk,h-3);g.closePath();g.clip();
        for(let y=3;y<h-3;y+=3)sdLine(g,[[x-2,y],[x+w/2,y+1.2,x+w+2,y]],sdSh(c,-45),.55,.8);g.restore();
        sdLine(g,[[x+sk,h-3],[x+w/2+sk/2,h+1.5,x+w+sk,h-3]],s,1.4)};
      flap(-17,11,15,sdSh(b,-14),-2.2);flap(-7,12,17,sdSh(b,-4),0);flap(4.5,12.5,18,b,1.8)}
    else if(a==='robe'){
      sdFill(g,g=>{g.moveTo(-13,0);g.lineTo(15,0);g.bezierCurveTo(18,12,21,22,22.5,31);g.lineTo(-18.5,31);g.bezierCurveTo(-17,20,-15,10,-13,0);g.closePath()},b,[-18,0,41,31]);
      sdLine(g,[[-18.5,30],[22.5,30]],s,2.6);sdLine(g,[[9,0],[11,15,13.5,30]],s,1.8);
      for(let i=0;i<3;i++)sdLine(g,[[-9+i*6,4],[-11+i*6.6,18,-12+i*7,29]],sdSh(b,-40),.6,.7)}
    else if(a==='dress'){
      sdFill(g,g=>{g.moveTo(-11,0);g.lineTo(13,0);g.bezierCurveTo(19,12,24,24,26,34);g.quadraticCurveTo(20,31,15,34.5);g.quadraticCurveTo(8,31,2,34.5);g.quadraticCurveTo(-5,31,-11,34.5);g.quadraticCurveTo(-17,31,-21,34);g.bezierCurveTo(-19,22,-15,10,-11,0);g.closePath()},b,[-21,0,47,35]);
      sdFill(g,g=>{g.moveTo(-10,0);g.lineTo(12,0);g.bezierCurveTo(16,8,19,15,20,21);g.quadraticCurveTo(5,17,-16,21);g.bezierCurveTo(-15,13,-13,7,-10,0);g.closePath()},sdSh(b,28),[-16,0,36,21],{hl:30,dk:10});
      sdLine(g,[[-21,33.4],[2,31.4,26,33.4]],s,1.6);
      for(let x=-16;x<24;x+=5){g.fillStyle='rgba(255,236,246,.85)';g.beginPath();g.arc(x,28+Math.sin(x)*1.2,1,0,SD_TAU);g.fill()}}
    else{
      sdFill(g,g=>{g.moveTo(-13,0);g.lineTo(15,0);g.lineTo(18,14.5);g.lineTo(-16,14.5);g.closePath()},b,[-16,0,34,15]);
      sdLine(g,[[5,1],[6.2,14.5]],sdSh(b,-45),.7);sdLine(g,[[-16,14],[18,14]],s,1.6)}
  });
}
/* 팔 (어깨 기준, 아래로 늘어진 모양 · 손 중심 y=22) */
function sdArm(L,q,dark){
  const a=L.armor||'cloth',b=L.body||'#666666',s=L.sub||SD_GOLD,sk=L.skin,wide=a==='robe'||a==='dress';
  return sdPart([-13,-10,26,40],q,g=>{
    if(wide){sdFill(g,g=>{g.moveTo(-4.8,-2);g.quadraticCurveTo(0,-5.4,4.8,-2);g.lineTo(9.4,18.6);g.quadraticCurveTo(0,23,-8.6,18.6);g.closePath()},b,[-8.6,-5,18,27]);
      sdLine(g,[[-8.6,18.4],[0,22.6,9.4,18.4]],s,1.9);sdFill(g,sdEl(.4,19.4,5.2,2),sdSh(b,-60),[-5,17,11,5],{lw:0,flat:true})}
    else{sdFill(g,g=>sdRR(g,-4.7,-3.4,9.4,18,4.6),a==='bare'?sk:b,[-4.7,-3.4,9.4,18]);
      if(a==='plate'){sdMetal(g,g=>sdRR(g,-4.6,10.4,9.2,9.4,2.6),s,[-4.6,10.4,9.2,9.4]);sdLine(g,[[-4.4,13.4],[4.4,13.4]],sdSh(s,-45),.6);sdLine(g,[[-4.4,16.6],[4.4,16.6]],sdSh(s,-45),.6)}
      else sdFill(g,g=>sdRR(g,-4.6,14.4,9.2,4.4,1.6),a==='bare'?'#6a4020':s,[-4.6,14.4,9.2,4.4],{lw:.8})}
    const gv=L.gloveV||0;
    if(L.glove&&gv===1&&!wide)for(let k=0;k<3;k++)sdMetal(g,g=>{g.moveTo(-4.6,11.6+k*2.6);g.lineTo(-8,12.8+k*2.6);g.lineTo(-4.6,13.8+k*2.6);g.closePath()},'#d8dce4',[-8,11,4,9],{lw:.35});
    if(L.glove&&gv===2&&!wide){sdMetal(g,g=>sdRR(g,-5,11.4,10,7.4,2),sdMix(L.glove,SD_GOLD,.5),[-5,11.4,10,7.4],{lw:.6});for(let y=12.6;y<18;y+=1.8)sdLine(g,[[-4.6,y],[0,y+.8,4.6,y]],sdSh(L.glove,-40),.4,.8)}
    const hc=L.glove||sk;sdFill(g,sdEl(.5,22.3,4.5,4.3),hc,[-4,18,9,9],{hl:30,dk:28});sdFill(g,sdEl(3.4,20.6,1.8,2.5,.3),hc,[1.6,18,4,5],{lw:.6});
    sdLine(g,[[-2.4,24],[0,25.4,2.8,24.2]],sdSh(hc,-45),.55);
  },dark);
}
/* 견갑 (갑옷일 때만) */
function sdPauldron(L,q,dark){
  if((L.armor||'cloth')!=='plate')return null;const b=L.body||'#666666',s=L.sub||SD_GOLD;
  return sdPart([-15,-16,30,30],q,g=>{g.scale(.8,.8);
    for(let i=2;i>=0;i--){const y=i*3.8-3,c=i===0?s:sdSh(b,-6-i*6);
      const path=g=>{g.moveTo(-10+i*.6,y);g.quadraticCurveTo(0,y-8.5+i,11-i*.4,y);g.lineTo(10-i*.6,y+4.8);g.quadraticCurveTo(0,y+.6,-9+i*.6,y+4.8);g.closePath()};
      if(i===0)sdMetal(g,path,c,[-10,y-8,21,13]);else sdFill(g,path,c,[-10,y-8,21,13]);
      sdLine(g,[[-9+i*.6,y+4.8],[0,y+.6,10-i*.6,y+4.8]],SD_GOLD,1)}
    sdMetal(g,sdEl(.5,-6.6,6.2,4.4),s,[-6,-11,13,9]);sdMetal(g,g=>{g.moveTo(-1,-10);g.lineTo(.8,-14.5);g.lineTo(2.4,-10);g.closePath()},SD_GOLD,[-1,-15,4,5],{lw:.5});
    const gA=L.gA||0;
    if(gA>=2){/* 사자 얼굴 문장 */sdMetal(g,sdEl(.6,-5.8,3.2,2.8),SD_GOLD,[-2.6,-8.6,6.4,5.6],{lw:.45});g.fillStyle='#5a3008';g.fillRect(-.8,-6.6,.9,.7);g.fillRect(1.3,-6.6,.9,.7);sdLine(g,[[-.6,-4.6],[.6,-4,1.8,-4.6]],'#5a3008',.4)}
    if(gA>=4){for(const s2 of[-1,1])sdMetal(g,g=>{g.moveTo(s2*5,-8);g.lineTo(s2*9.5,-12.5);g.lineTo(s2*7,-6.5);g.closePath()},SD_GOLD,[-10,-13,20,7],{lw:.4})}
    if(gA>=5){sdFill(g,sdEl(.6,-10.4,1.3,1.3),'#ff3a2a',[-.7,-11.7,2.6,2.6],{lw:.3,hl:70})}
  },dark);
}
/* 다리 (엉덩이 관절 기준, 발바닥 y=34) */
function sdLeg(L,q,dark){
  const pn=L.pants||'#333333',bt=L.boots||'#222222',a=L.armor||'cloth';
  return sdPart([-10,-4,26,42],q,g=>{
    sdFill(g,g=>{g.moveTo(-5.8,-1);g.lineTo(5.8,-1);g.quadraticCurveTo(7.4,10,5.4,20.5);g.lineTo(-5,20.5);g.quadraticCurveTo(-6.8,10,-5.8,-1);g.closePath()},pn,[-6.8,-1,14,22]);
    sdLine(g,[[0,3],[.8,10,0,17]],sdSh(pn,-40),.55,.7);
    sdFill(g,g=>{g.moveTo(-5.2,17);g.lineTo(5.2,17);g.lineTo(5.4,28.4);g.quadraticCurveTo(10.4,28.6,12.4,31.2);g.quadraticCurveTo(13.6,32.6,13.2,30.4);g.quadraticCurveTo(14.6,33.8,10.6,34);g.lineTo(-5.4,34);g.quadraticCurveTo(-6.2,26,-5.2,17);g.closePath()},bt,[-6,17,20,17]);
    sdLine(g,[[-5.4,34],[10.6,34]],sdSh(bt,-65),1.3);
    sdMetal(g,g=>sdRR(g,-5.9,15.8,11.8,3.6,1.6),sdMix(bt,SD_GOLD,.6),[-5.9,15.8,11.8,3.6],{lw:.7});
    if(a==='plate'){sdMetal(g,sdEl(1,17.4,4.8,3.4),L.sub||SD_GOLD,[-4,14,10,7],{lw:.7});sdLine(g,[[2.5,21],[3,25,2.5,29]],sdSh(bt,40),.8,.6)}
    const bv=L.bootV||0;
    if(bv===1)for(let k=0;k<3;k++)sdFill(g,g=>{g.moveTo(-4,19+k*2);g.quadraticCurveTo(-10-k,15+k*2,-13+k,10+k*3);g.quadraticCurveTo(-8,17+k*2,-3,21+k*2);g.closePath()},k%2?'#e8e8ec':'#ffffff',[-13,10,10,13],{lw:.4});
    else if(bv===2){sdMetal(g,g=>{g.moveTo(1.6,18.6);g.lineTo(6.4,19);g.lineTo(6,29);g.lineTo(2.4,28.4);g.closePath()},sdMix(bt,'#c8ccd4',.6),[1.6,18.6,4.8,10.4],{lw:.5});for(const y of[21,24,27]){g.fillStyle=SD_GOLD;g.beginPath();g.arc(4.2,y,.5,0,SD_TAU);g.fill()}}
  },dark);
}
/* 망토 (등 어깨 기준) */
function sdCape(L,q){
  if(!L.cape)return null;const cp=L.cape,ln=sdSh(cp,-38);
  return sdPart([-26,-4,52,70],q,g=>{
    sdFill(g,g=>{g.moveTo(-10,0);g.quadraticCurveTo(0,-2,10,0);g.bezierCurveTo(12,20,16,40,18,57);g.quadraticCurveTo(12,61,6,57.4);g.quadraticCurveTo(0,61.6,-6,57.4);g.quadraticCurveTo(-12,61.6,-18,57);g.bezierCurveTo(-15.4,40,-13,20,-10,0);g.closePath()},cp,[-18,-2,36,62],{hl:30,dk:44});
    for(let i=0;i<3;i++)sdLine(g,[[-4+i*4,4],[-7+i*7,30,-11+i*11,55]],ln,.8,.8);
    const cv=L.capeV||0;
    if(cv===1){g.save();g.beginPath();g.moveTo(-10,0);g.bezierCurveTo(12,20,16,40,18,57);g.lineTo(-18,57);g.closePath();g.clip();
      for(const [x,y] of[[-6,18],[5,30],[-9,40],[8,48]]){sdLine(g,[[x-4,y],[x-5,y-3,x-2,y-3.4],[x+1,y-3.6,x,y-1],[x+2,y+1,x+4,y]],sdA(SD_GOLD,.9),.7)}g.restore()}
    else if(cv===2){sdLine(g,[[-17.4,52],[-12,56.4,-6,52.4],[0,56.6,6,52.4],[12,56,17.4,52]],sdSh(cp,45),2.2,.9);sdLine(g,[[-16.6,47],[-12,51,-6,47.4],[0,51.6,6,47.4],[12,51,16.6,47]],sdSh(cp,45),1.2,.7)}
    else if(cv===3){g.save();g.beginPath();g.moveTo(-10,0);g.bezierCurveTo(12,20,16,40,18,57);g.lineTo(-18,57);g.closePath();g.clip();
      for(let i=0;i<7;i++){const y=8+i*7;sdLine(g,[[-18,y],[-8,y+3,-2,y-1]],sdSh(cp,-55),1.6,.8);sdLine(g,[[18,y+3],[9,y+5,3,y+1]],sdSh(cp,-55),1.4,.8)}g.restore()}
    sdLine(g,[[-18,56.4],[-12,61,-6,56.8],[0,61,6,56.8],[12,60.4,18,56.4]],SD_GOLD,1.3);
    const gC=L.gC||0;
    if(gC>=2){for(let i=0;i<3;i++){const y=44+i*1.5;sdLine(g,[[-15,y+2],[-9,y-2,-3,y+1],[3,y+4,9,y],[14,y-2,16,y+2]],SD_GOLD,.5,.7)}}
    if(gC>=4){g.save();g.globalAlpha=.85;g.fillStyle=SD_GOLD;g.font='bold 10px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(L.gC>=5?'龍':'將',0,26);g.restore();
      sdLine(g,[[-10,2],[-12,20,-15,40]],SD_GOLD,.6,.8);sdLine(g,[[10,2],[12,20,15,40]],SD_GOLD,.6,.8)}
    sdMetal(g,sdEl(0,1,3,3),SD_GOLD,[-3,-2,6,6],{lw:.6});
  });
}

/* ---------- 무기 (손잡이=원점, 날이 +y 방향) ---------- */
function sdPole(g,y0,y1,col,w){w=w||2.7;sdFill(g,g=>sdRR(g,-w/2,y0,w,y1-y0,w/2),col,[-w/2,y0,w,y1-y0],{hl:44,dk:40,lw:.8})}
function sdRing(g,y,w,col){w=w||4.2;sdMetal(g,g=>sdRR(g,-w/2,y-1.4,w,2.8,1),col||SD_GOLD,[-w/2,y-1.4,w,2.8],{lw:.6})}
let SD_TAS=null;
function sdTassel(g,y,col){col=(!col||col==='#d82424')&&SD_TAS?SD_TAS:(col||'#d82424');for(let i=0;i<3;i++){const d=(i-1)*2.4;sdFill(g,g=>{g.moveTo(-1,y);g.quadraticCurveTo(-3+d,y-6,-4+d*1.8,y-13);g.lineTo(-1.6+d*1.6,y-12);g.quadraticCurveTo(0,y-6,1.4,y);g.closePath()},i%2?sdSh(col,-20):col,[-5,y-13,7,13],{lw:.5})}}
function sdEdge(g,pts){sdLine(g,pts,'#ffffff',.9,.8)}
function sdWeapon(L,q){
  const w=L.weapon,met=L.metal||'#e2e8ef',wd=L.wood||'#5a2e18';let tip=34,box=[-18,-32,36,72];
  const draw=g=>{switch(w){
    case'glaive':{const bm=L.metal||'#d6f0e2';sdPole(g,-26,56,L.wood||'#6a2616',2.9);sdRing(g,-25,4);sdRing(g,-3,3.8);sdRing(g,3,3.8);
      sdTassel(g,48);
      sdMetal(g,g=>{g.moveTo(-3,55);g.lineTo(3.4,55);g.bezierCurveTo(13,57,17.5,68,13,79);g.quadraticCurveTo(9.6,85.6,3,88);g.quadraticCurveTo(6.6,79,3.4,72);g.lineTo(-2.6,72);g.lineTo(-4.4,64);g.lineTo(-8,61.4);g.lineTo(-3.6,59.4);g.closePath()},bm,[-8,55,26,33]);
      sdEdge(g,[[4.6,57],[14.6,65,13.4,77],[10.6,83.4,4.6,86.4]]);sdLine(g,[[0,62],[5,65,6.4,72]],'#2f9d5b',1,.8);
      sdMetal(g,g=>{g.moveTo(-3.6,47);g.lineTo(3.6,47);g.lineTo(4.8,56);g.lineTo(-4.8,56);g.closePath()},SD_GOLD,[-4.8,47,9.6,9]);sdFill(g,sdEl(0,51.5,1.7,2.2),'#3ae08a',[-2,49,4,5],{lw:.4,hl:70});
      tip=78;box=[-14,-30,34,122];break}
    case'spear':case'snake':{sdPole(g,-26,56,w==='snake'?'#2a2622':wd,2.7);sdRing(g,-25,4);sdTassel(g,53);sdRing(g,54,4.4);
      if(w==='snake'){const pts=[];for(let i=0;i<=12;i++){const t=i/12,y=56+t*22,x=Math.sin(t*9)*2.6*(1-t*.35),hw=2.6*(1-t)+.3;pts.push([x,y,hw])}
        sdMetal(g,g=>{g.moveTo(pts[0][0]-pts[0][2],pts[0][1]);for(const p of pts)g.lineTo(p[0]-p[2],p[1]);g.lineTo(pts[12][0],80);for(let i=12;i>=0;i--)g.lineTo(pts[i][0]+pts[i][2],pts[i][1]);g.closePath()},met,[-4,56,8,24]);tip=76}
      else{sdMetal(g,g=>{g.moveTo(0,55.6);g.bezierCurveTo(5.4,60,4.8,68,0,77);g.bezierCurveTo(-4.8,68,-5.4,60,0,55.6);g.closePath()},met,[-5,55,10,22]);sdEdge(g,[[.6,58],[3,66,.6,74]]);tip=74}
      box=[-14,-30,28,112];break}
    case'halberd':{sdPole(g,-28,57,'#5a1414',2.9);sdRing(g,-27,4.2);sdTassel(g,52,'#e02828');sdRing(g,55,5);
      sdMetal(g,g=>{g.moveTo(0,57);g.bezierCurveTo(4.6,62,4,72,0,81);g.bezierCurveTo(-4,72,-4.6,62,0,57);g.closePath()},met,[-5,57,10,24]);
      sdMetal(g,g=>{g.moveTo(1.4,58);g.bezierCurveTo(10,55,15.6,61,13.6,71);g.quadraticCurveTo(10.6,64.6,1.4,66.4);g.closePath()},met,[1,55,15,17]);
      sdMetal(g,g=>{g.moveTo(-1.4,59);g.bezierCurveTo(-7.4,57,-11,61,-10,67);g.quadraticCurveTo(-7,63.4,-1.4,65);g.closePath()},met,[-11,57,10,10]);
      sdEdge(g,[[3,58],[12,57.6,13.2,68]]);sdMetal(g,g=>sdRR(g,-3.6,56,7.2,4,1.4),SD_GOLD,[-3.6,56,7.2,4],{lw:.6});
      tip=78;box=[-16,-32,34,118];break}
    case'sword':{sdFill(g,g=>sdRR(g,-1.6,-9,3.2,9.4,1.2),'#5a2a14',[-1.6,-9,3.2,9.4],{lw:.7});for(let y=-8;y<0;y+=2)sdLine(g,[[-1.6,y],[1.6,y+1]],'#2a140a',.5);
      sdMetal(g,sdEl(0,-10.2,2,2),SD_GOLD,[-2,-12,4,4],{lw:.5});sdTassel(g,-11,'#d82424');
      sdMetal(g,g=>{g.moveTo(-6,0);g.quadraticCurveTo(-3,-1.6,0,-.6);g.quadraticCurveTo(3,-1.6,6,0);g.lineTo(4,2.6);g.lineTo(-4,2.6);g.closePath()},SD_GOLD,[-6,-1.6,12,4.2],{lw:.6});
      sdMetal(g,g=>{g.moveTo(-2.1,2.6);g.lineTo(2.1,2.6);g.lineTo(1.9,34);g.lineTo(0,39.4);g.lineTo(-1.9,34);g.closePath()},met,[-2.1,2.6,4.2,37]);
      sdLine(g,[[0,4],[0,34]],sdSh(met,-35),.5);sdEdge(g,[[1.2,4],[1.1,33]]);g.fillStyle='#3a9ae8';g.beginPath();g.arc(0,1,1,0,SD_TAU);g.fill();
      tip=37;box=[-10,-26,20,70];break}
    case'dao':{sdFill(g,g=>sdRR(g,-1.6,-9,3.2,9.4,1.2),'#5a2a14',[-1.6,-9,3.2,9.4],{lw:.7});sdMetal(g,sdEl(0,-10.2,2,2),SD_GOLD,[-2,-12,4,4],{lw:.5});
      sdMetal(g,sdEl(0,1,4.6,1.8),SD_GOLD,[-4.6,-1,9.2,3.6],{lw:.6});
      sdMetal(g,g=>{g.moveTo(-1.8,2.4);g.lineTo(2,2.4);g.quadraticCurveTo(5.4,20,6.2,32);g.quadraticCurveTo(4.6,38.6,-.6,39.6);g.quadraticCurveTo(-2.4,22,-1.8,2.4);g.closePath()},met,[-2.4,2.4,8.6,37]);
      sdEdge(g,[[2.6,5],[5.2,21,5.4,31]]);tip=37;box=[-10,-16,20,60];break}
    case'bigdao':{sdPole(g,-24,35,wd,2.8);sdRing(g,-23,4);sdRing(g,33,4.6);sdTassel(g,31,'#d82424');
      sdMetal(g,g=>{g.moveTo(-2.8,34.4);g.lineTo(3.2,34.4);g.bezierCurveTo(12.6,38,15,52,11,64);g.quadraticCurveTo(6,69,-1,66.6);g.lineTo(-3.6,50);g.closePath()},met,[-3.6,34,19,35]);
      sdEdge(g,[[5,37],[13,46,10.6,61]]);for(let i=0;i<4;i++){g.strokeStyle=SD_GOLD;g.lineWidth=.8;g.beginPath();g.arc(-1.6,40+i*6,1.6,0,SD_TAU);g.stroke()}
      tip=62;box=[-12,-28,30,100];break}
    case'axe':{sdPole(g,-22,60,wd,2.9);sdRing(g,-21,4);sdRing(g,38,4.4);
      sdMetal(g,g=>{g.moveTo(1,40);g.bezierCurveTo(12,33,17.4,42,17,50);g.bezierCurveTo(17.4,58,12.4,67,1,60);g.closePath()},met,[1,33,17,34]);
      sdMetal(g,g=>{g.moveTo(-1,44);g.lineTo(-8,48);g.lineTo(-1,53);g.closePath()},sdSh(met,-10),[-8,44,7,9],{lw:.6});
      sdMetal(g,g=>{g.moveTo(-1.6,59);g.lineTo(0,66);g.lineTo(1.6,59);g.closePath()},met,[-2,59,4,7],{lw:.6});
      sdEdge(g,[[14,38],[17.8,50,13,63]]);tip=62;box=[-12,-26,34,98];break}
    case'mace':{sdPole(g,-8,24,'#4a3018',2.8);sdRing(g,-7,3.8);sdRing(g,22,4.6);
      for(let i=0;i<8;i++){const a=i/8*SD_TAU;sdMetal(g,g=>{g.moveTo(Math.cos(a-.3)*6,30+Math.sin(a-.3)*6);g.lineTo(Math.cos(a)*11,30+Math.sin(a)*11);g.lineTo(Math.cos(a+.3)*6,30+Math.sin(a+.3)*6);g.closePath()},'#b8bcc4',[-11,19,22,22],{lw:.5})}
      sdMetal(g,sdEl(0,30,7,7),'#5a5c66',[-7,23,14,14]);tip=36;box=[-14,-12,28,56];break}
    case'staff':{sdPole(g,-26,50,wd,2.6);sdRing(g,-25,3.8);sdRing(g,48,4.4);
      g.strokeStyle=SD_GOLD;g.lineWidth=2.2;g.beginPath();g.arc(0,57,7,0,SD_TAU);g.stroke();g.strokeStyle=sdSh(SD_GOLD,-45);g.lineWidth=.6;g.stroke();
      for(let i=0;i<4;i++){const a=i/4*SD_TAU+.4;g.strokeStyle=SD_GOLD;g.lineWidth=1;g.beginPath();g.arc(Math.cos(a)*7,57+Math.sin(a)*7,2.4,0,SD_TAU);g.stroke()}
      const rg=g.createRadialGradient(0,57,0,0,57,4);rg.addColorStop(0,'#ffffff');rg.addColorStop(.4,'#ffe28a');rg.addColorStop(1,'rgba(255,200,80,0)');g.fillStyle=rg;g.beginPath();g.arc(0,57,4,0,SD_TAU);g.fill();
      tip=58;box=[-14,-30,28,100];break}
    case'fan':{const fc=L.fanc||'#f6f4ec';sdPole(g,-5,9,'#6b4a2a',2.4);sdTassel(g,-4,'#5a8ae0');
      for(let i=0;i<9;i++){const a=(i-4)*.13,x=Math.sin(a)*14,y=9+Math.cos(a)*14;sdFill(g,sdEl(x,y,3.2,12.6,-a),i%2?fc:sdSh(fc,-8),[x-3,y-12,6,24],{lw:.55,hl:20,dk:22});
        sdLine(g,[[Math.sin(a)*3,9+Math.cos(a)*3],[Math.sin(a)*25,9+Math.cos(a)*25]],'#bcb6a8',.4)}
      for(let i=0;i<9;i++){const a=(i-4)*.13;g.fillStyle='rgba(90,90,110,.5)';g.beginPath();g.ellipse(Math.sin(a)*23.6,9+Math.cos(a)*23.6,2,2.8,-a,0,SD_TAU);g.fill()}
      sdMetal(g,g=>sdRR(g,-3,7,6,3,1.2),SD_GOLD,[-3,7,6,3],{lw:.5});tip=30;box=[-16,-20,32,56];break}
    case'bow':{g.lineCap='round';
      for(const s of[-1,1]){g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-3.6,s*9,-1,s*20,6,s*27);g.strokeStyle=SD_INK;g.lineWidth=3.6;g.stroke();g.strokeStyle=wd;g.lineWidth=2.4;g.stroke();
        g.strokeStyle=sdA(sdSh(wd,50),.6);g.lineWidth=.6;g.stroke();sdMetal(g,sdEl(6,s*27,1.6,1.6),SD_GOLD,[4,s*27-2,4,4],{lw:.4})}
      sdLine(g,[[6,-27],[6,27]],'#f2f0e6',.6);sdMetal(g,g=>sdRR(g,-2.2,-3.4,4,6.8,1.4),SD_GOLD,[-2.2,-3.4,4,6.8],{lw:.6});
      tip=24;box=[-8,-32,20,64];break}
    case'whip':{sdFill(g,g=>sdRR(g,-1.8,-5,3.6,14,1.6),'#5a3018',[-1.8,-5,3.6,14],{lw:.7});sdRing(g,9,4.4);
      for(let i=0;i<26;i++){const t=i/26,y=11+i*2.8,x=Math.sin(t*5)*6*t;const n=Math.cos(t*5)*6*t*.2;
        if(i%6===5)sdMetal(g,sdEl(x,y,2.4,2.4),SD_GOLD,[x-2.4,y-2.4,5,5],{lw:.5});else sdMetal(g,g=>sdRR(g,x-1.3,y-1.6,2.6,3.2,1.1),met,[x-1.3,y-1.6,2.6,3.2],{lw:.45})}
      sdMetal(g,g=>{g.moveTo(Math.sin(5)*6-2,84);g.lineTo(Math.sin(5)*6,90);g.lineTo(Math.sin(5)*6+2,84);g.closePath()},met,[-9,84,6,6],{lw:.5});
      tip=80;box=[-12,-8,24,100];break}
    case'none':tip=8;box=[-4,-4,8,8];break;
    case'baby':{sdFill(g,sdEl(0,4,7,9.5),'#f4ecd8',[-7,-6,14,19],{hl:20,dk:24});sdLine(g,[[-6,0],[0,3,6,-1]],'#c8b8a0',.6);sdLine(g,[[-6,6],[0,9,6,5]],'#c8b8a0',.6);
      sdFill(g,sdEl(0,-4,5,4.6),'#f8dcc4',[-5,-9,10,9],{hl:20,dk:20});g.fillStyle='#1a1010';g.fillRect(-2.4,-4.4,1,.7);g.fillRect(1.4,-4.4,1,.7);
      g.fillStyle='rgba(255,120,140,.5)';g.beginPath();g.arc(-3,-2.6,1,0,SD_TAU);g.arc(3,-2.6,1,0,SD_TAU);g.fill();sdFill(g,sdEl(0,-8,5.4,2.6),'#e05a8a',[-5,-11,11,5],{lw:.6});
      tip=12;box=[-10,-14,20,30];break}
    case'flag':{const fc=L.flagc||'#c02020';sdPole(g,-24,66,'#4a2010',2.6);sdRing(g,-23,4);
      sdMetal(g,g=>{g.moveTo(0,64);g.bezierCurveTo(3,68,2.4,73,0,78);g.bezierCurveTo(-2.4,73,-3,68,0,64);g.closePath()},SD_GOLD,[-3,64,6,14],{lw:.6});
      sdFill(g,g=>{g.moveTo(1.4,62);g.lineTo(30,60);g.quadraticCurveTo(26,64,31,68);g.quadraticCurveTo(27,72,32,77);g.quadraticCurveTo(27,82,31,86);g.lineTo(1.4,88);g.closePath()},fc,[1,60,31,28],{hl:26,dk:30});
      sdLine(g,[[1.4,62],[30,60]],SD_GOLD,1.4);sdLine(g,[[1.4,88],[31,86]],SD_GOLD,1.4);
      g.save();g.translate(16,74);g.rotate(Math.PI);g.fillStyle='#fff4d0';g.font='bold 17px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(L.flagt||'令',0,0);g.restore();
      for(const y of[64,74,84])sdTassel(g,y,SD_GOLD);
      tip=64;box=[-14,-28,50,120];break}
    default:{sdFill(g,g=>sdRR(g,-1.6,-9,3.2,9.4,1.2),'#5a2a14',[-1.6,-9,3.2,9.4],{lw:.7});sdMetal(g,g=>sdRR(g,-4.6,-.4,9.2,2.8,1.2),SD_GOLD,[-4.6,-.4,9.2,2.8],{lw:.6});
      sdMetal(g,g=>{g.moveTo(-2,2.4);g.lineTo(2,2.4);g.lineTo(1.8,33);g.lineTo(0,38);g.lineTo(-1.8,33);g.closePath()},met,[-2,2.4,4,36]);tip=36;box=[-10,-14,20,56]}
  }};
  /* box 계산을 위해 한 번 가상으로 그려 tip/box 확정 */
  const probe=document.createElement('canvas').getContext('2d');draw(probe);
  const P=sdPart(box,q,draw);P.tip=tip;return P;
}

/* 방패 (가슴 앞, 3/4 시점 타원) */
function sdShield(L,q){
  if(!L.shield)return null;const c=L.shield;
  return sdPart([-16,-22,32,44],q,g=>{
    sdFill(g,sdEl(0,0,11.5,17),c,[-12,-17,24,34],{hl:30,dk:40,lw:1.2});
    g.save();g.beginPath();g.ellipse(0,0,11.5,17,0,0,SD_TAU);g.clip();
    for(const r of[9,6])sdLine(g,[[-12,-r*1.8],[0,-r*1.8-3,12,-r*1.8]],sdSh(c,-40),.5,.6);g.restore();
    g.lineWidth=1.8;g.strokeStyle=SD_GOLD;g.beginPath();g.ellipse(0,0,10.4,15.8,0,0,SD_TAU);g.stroke();
    sdMetal(g,sdEl(1,0,4.4,5.6),SD_GOLD,[-3.4,-5.6,8.8,11.2],{lw:.7});
    g.fillStyle='#6a3a10';g.fillRect(-.6,-1.6,1.2,1);g.fillRect(2.2,-1.6,1.2,1);sdLine(g,[[-1,2],[1,3.2,3.4,2]],'#6a3a10',.6);
    for(let i=0;i<8;i++){const a=i/8*SD_TAU;g.fillStyle=sdSh(SD_GOLD,40);g.beginPath();g.arc(Math.cos(a)*8.6,Math.sin(a)*13.4,.8,0,SD_TAU);g.fill()}
  });
}
/* 군마 (기병 · 기마 보스) — 매 프레임 벡터로 그림, 발굽 y=0 */
function sdHorse(o,col,L,ps){
  const ph=ps.gallop||0,run=ph?1:0,rear=ps.rear||0,mane=sdSh(col,col==='#d8d2c4'?-45:-60),cloth=L.body||'#884422';
  o.save();if(rear){o.translate(-20,-4);o.rotate(-rear*.32);o.translate(20,4)}o.scale(1.32,1.32);
  const leg=(x,ang,dark)=>{o.save();o.translate(x,-32);o.rotate(ang);
    sdFill(o,g=>{g.moveTo(-3.6,0);g.lineTo(3.6,0);g.quadraticCurveTo(3.4,14,2.4,24);g.lineTo(3.4,28.5);g.lineTo(-3.2,28.5);g.lineTo(-2.4,24);g.quadraticCurveTo(-3.8,14,-3.6,0);g.closePath()},dark?sdSh(col,-26):col,[-3.6,0,7.2,28],{lw:.9});
    sdFill(o,g=>sdRR(g,-3.6,27,7.4,4.2,1.4),'#2a2020',[-3.6,27,7.4,4.2],{lw:.7});o.restore()};
  const s1=Math.sin(ph),s2=Math.sin(ph+Math.PI),rl=rear?-rear*.9:0;
  leg(-22,run?s1*.6:.05,true);leg(18,run?s2*.65+rl:-.05+rl,true);
  sdFill(o,g=>{g.moveTo(-30,-48);g.bezierCurveTo(-44,-48-run*6,-50,-32,-47,-14);g.quadraticCurveTo(-42,-24,-38,-22);g.quadraticCurveTo(-38,-36,-30,-40);g.closePath()},mane,[-50,-50,20,36],{hl:30});
  sdFill(o,sdEl(-4,-44,32,14.5),col,[-36,-58,64,29],{hl:32,dk:36});
  sdFill(o,g=>{g.moveTo(12,-52);g.bezierCurveTo(19,-66,24,-74,31,-79);g.lineTo(39,-72);g.bezierCurveTo(35,-62,31,-50,24,-36);g.closePath()},col,[12,-79,27,43],{hl:30,dk:30});
  sdFill(o,g=>{g.moveTo(28,-83);g.quadraticCurveTo(37,-85,48,-68);g.quadraticCurveTo(50,-61,44.5,-60);g.quadraticCurveTo(37,-63,30,-70);g.closePath()},col,[28,-85,22,25],{hl:34,dk:30});
  for(const dx of[0,3.4])sdFill(o,g=>{g.moveTo(29+dx,-82);g.lineTo(30.6+dx,-89);g.lineTo(33+dx,-81.5);g.closePath()},col,[29,-89,6,8],{lw:.6});
  o.fillStyle='#140a08';o.beginPath();o.ellipse(38,-74.5,1.5,1.7,0,0,SD_TAU);o.fill();o.fillStyle='#fff';o.fillRect(37.6,-75.6,.7,.7);
  o.fillStyle='rgba(0,0,0,.45)';o.beginPath();o.ellipse(46.5,-63,.9,.7,0,0,SD_TAU);o.fill();
  sdFill(o,g=>{g.moveTo(29,-83);g.lineTo(24,-76);g.lineTo(26,-72);g.lineTo(20,-66);g.lineTo(22,-62);g.lineTo(15,-56);g.lineTo(18,-51);g.lineTo(12,-49);g.bezierCurveTo(18,-62,22,-72,29,-83);g.closePath()},mane,[12,-83,17,34],{hl:36});
  sdLine(o,[[31,-79],[37,-73,44,-65]],'#5a3a20',1.1);sdLine(o,[[31,-79],[28,-66,22,-58]],'#5a3a20',.9);
  sdFill(o,g=>{g.moveTo(-22,-57);g.quadraticCurveTo(-4,-62,14,-56);g.lineTo(16,-38);g.quadraticCurveTo(-4,-33,-24,-38);g.closePath()},cloth,[-24,-62,40,29],{hl:26,dk:34});
  sdLine(o,[[-24,-38],[-4,-33,16,-38]],SD_GOLD,1.6);for(let i=0;i<5;i++)sdTasselAt(o,-20+i*8.6,-36.5);
  sdMetal(o,g=>{g.moveTo(-10,-60);g.quadraticCurveTo(-4,-66,4,-60);g.lineTo(4,-56);g.lineTo(-10,-56);g.closePath()},'#6a3a1a',[-10,-66,14,10],{lw:.7});
  leg(-15,run?s2*.6:-.05,false);leg(24,run?s1*.65+rl:.05+rl,false);
  o.restore();
}
function sdTasselAt(g,x,y){sdFill(g,g=>{g.moveTo(x-1.2,y);g.lineTo(x+1.2,y);g.lineTo(x+1.8,y+6);g.lineTo(x-1.8,y+6);g.closePath()},'#d82424',[x-2,y,4,6],{lw:.45})}

/* ---------- 조립 · 캐시 ---------- */
const SD_CACHE=new Map();
function sdQ(s){return Math.max(1,Math.min(12,Math.ceil(s*2)/2))}
function sdParts(L,q){
  const key=[L.skin,L.hair,L.body,L.sub,L.pants,L.boots,L.hat,L.beard,L.weapon,L.armor,L.cape,L.face,L.dual,L.metal,L.wood,L.glove,L.belt,L.helmc,L.fanc,L.hs,L.eye,L.shield,L.flagc,L.flagt,L.jaw,L.eyes,L.age,L.fur,L.gA,L.gC,L.neckC,L.wglow,L.plumeC,L.gemC,L.armV,L.capeV,L.gloveV,L.bootV,L.beltV,L.neckV,L.wV,L.tasC,q].join('|');
  let P=SD_CACHE.get(key);if(P)return P;
  if(SD_CACHE.size>260)SD_CACHE.clear();
  P={head:sdHead(L,q),back:sdBackHair(L,q),torso:sdTorso(L,q),skirt:sdSkirt(L,q),arm:sdArm(L,q,false),armB:sdArm(L,q,true),
    paul:sdPauldron(L,q,false),paulB:sdPauldron(L,q,true),leg:sdLeg(L,q,false),legB:sdLeg(L,q,true),cape:sdCape(L,q),wpn:sdWeapon(L,q),shield:sdShield(L,q)};
  SD_CACHE.set(key,P);return P;
}
function sdTinted(pt,tint){let T=pt.tc||(pt.tc={});let c=T[tint];if(c)return c;
  if(Object.keys(T).length>6)T=pt.tc={};
  c=document.createElement('canvas');c.width=pt.c.width;c.height=pt.c.height;const g=c.getContext('2d');g.drawImage(pt.c,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);return T[tint]=c}
function renderSD(g,L,pose,sx,sy,scale,facing,opt){
  opt=opt||{};const ps=pose||{},k=scale*(L.scale||1)*SD_K,pr=window.PIX_PR||(typeof PR!=='undefined'?PR:1),q=sdQ(k*pr),P=sdParts(L,q);
  const f=facing<0?-1:1,sp=Math.cos(ps.spin||0),sq=Math.abs(sp)<.15?.15*(sp<0?-1:1):sp,tint=opt.flash?'rgba(255,255,255,.75)':opt.tint||null;
  /* 화면에 바로 그린다 — 색 덧칠(피격 섬광 · 잔상 · 빙결)은 파츠별로 미리 칠해 둔 캔버스를 쓴다 */
  const o=g;o.save();o.imageSmoothingEnabled=true;o.translate(sx,sy);o.scale(k*f*sq,k);
  if(ps.lie){o.translate(52,-10);o.rotate(-Math.PI/2)}
  const bob=(ps.bob||0)*1.6,M=L.mount;o.translate(0,-bob);
  if(M){if(!opt.layer||opt.layer==='back')sdHorse(o,M,L,ps);const hb=ps.gallop?Math.abs(Math.sin(ps.gallop))*2.4:0;o.translate(-5,-40-hb);if(ps.rear){o.translate(-26,36);o.rotate(-ps.rear*.32);o.translate(26,-36)}}
  /* opt.layer: 스프라이트 베이커용 — 해당 레이어(back · body · weapon · front) 파츠만 그린다 */
  const part=(pt,px,py,rot,lay)=>{if(!pt||(opt.layer&&opt.layer!==lay))return;o.save();o.translate(px,py);if(rot)o.rotate(rot);o.drawImage(tint?sdTinted(pt,tint):pt.c,pt.x0,pt.y0,pt.w,pt.h);o.restore()};
  const lean=(ps.lean||0)*.9,hip=[0,-34];
  const R=(x,y)=>{const c=Math.cos(lean),n=Math.sin(lean),dx=x-hip[0],dy=y-hip[1];return[hip[0]+dx*c-dy*n,hip[1]+dx*n+dy*c]};
  const neck=R(0,-60),shF=R(8.5,-54),shB=R(-8,-54),capeP=R(-4,-58);
  const aF=(ps.armL!=null?ps.armL:-.35)+lean,aB=(ps.armR!=null?ps.armR:.1)+lean,wA=(ps.wAng!=null?ps.wAng:-2.5)+lean,ext=(ps.ext||0)*1.6;
  const dir=a=>[-Math.sin(a),Math.cos(a)];
  const dF=dir(aF),hand=[shF[0]+dF[0]*(22+ext),shF[1]+dF[1]*(22+ext)],dB=dir(aB),handB=[shB[0]+dB[0]*22,shB[1]+dB[1]*22];
  const hRot=lean+(ps.head||0)*.8;
  part(P.cape,capeP[0],capeP[1],(ps.cape!=null?ps.cape:.12)*.9+lean,'back');
  part(P.back,neck[0],neck[1],hRot,'back');
  part(P.armB,shB[0],shB[1],aB,'back');
  if(L.dual)part(P.wpn,handB[0],handB[1],ps.wAng2!=null?ps.wAng2+lean:aB-1.3,'back');
  part(P.paulB,shB[0],shB[1],lean+aB*.22,'back');
  if(!M){part(P.legB,-3,-34,ps.legR||0,'body');part(P.leg,3,-34,ps.legL||0,'body')}
  part(P.skirt,hip[0],hip[1],lean*.5,'body');
  if(M)part(P.leg,4,-33,-.75,'body');
  part(P.torso,neck[0],neck[1],lean,'body');
  if(P.shield&&!ps.noShield){const sp2=R(14,-38);part(P.shield,sp2[0],sp2[1],lean*.6,'body')}
  part(P.paul,shF[0],shF[1],lean+aF*.22,'body');
  part(P.head,neck[0],neck[1],hRot,'body');
  part(P.wpn,hand[0],hand[1],wA,'weapon');
  part(P.arm,shF[0],shF[1],aF,'front');
  o.restore();
  const wd=dir(wA),mapP=(x,y)=>{if(M){x-=5;y-=40}y-=bob;if(ps.lie){const t=x;x=y+52;y=-t-10}return[sx+x*f*sq*k,sy+y*k]};
  const t1=mapP(hand[0]+wd[0]*P.wpn.tip,hand[1]+wd[1]*P.wpn.tip),t2=mapP(hand[0]+wd[0]*P.wpn.tip*.45,hand[1]+wd[1]*P.wpn.tip*.45);
  return{tx:t1[0],ty:t1[1],mx:t2[0],my:t2[1]};
}
/* 모든 캐릭터 그리기를 2D 일러스트 SD 로 전환 (도트 SD 는 renderChibi, 3D 는 renderModel3D 로 보존) */
renderModel=function(g,L,pose,sx,sy,scale,facing,opt){return renderSD(g,L,pose,sx,sy,scale,facing,opt)};
renderModelOutlined=function(g,L,pose,sx,sy,scale,facing,opt){return renderSD(g,L,pose,sx,sy,scale,facing,opt)};

/* ---------- 무기 광채: 에픽 이상 · 고강화 무기는 날에 빛 번짐 ---------- */
/* 무기 장식 변형 (wV 1~3): 날 밑 보석 · 등쪽 톱니 · 빛나는 문양 / 술 색 */
const SD_BLADE={sword:[0,5,0,34],dao:[2,6,5,32],spear:[0,58,0,74],snake:[0,58,0,76],glaive:[7,60,12,80],bigdao:[5,38,10,62],halberd:[0,60,0,78],axe:[10,42,14,60],mace:[0,24,0,34],staff:[0,50,0,62],fan:[0,12,0,30],whip:[1,20,5,70],flag:[16,64,16,84]};
const _sdWeaponBase=sdWeapon;
sdWeapon=function(L,q){
  SD_TAS=L.tasC||null;let P;try{P=_sdWeaponBase(L,q)}finally{SD_TAS=null}
  const v=L.wV||0,B=SD_BLADE[L.weapon];if(!v||!B)return P;
  const g=P.c.getContext('2d');g.setTransform(q,0,0,q,-P.x0*q,-P.y0*q);g.lineJoin='round';g.lineCap='round';
  const [x0,y0,x1,y1]=B,gem=L.gemC||'#40c0ff';
  if(v===1){sdMetal(g,sdEl(x0,y0-1,2.2,2.2),SD_GOLD,[x0-2.2,y0-3.2,4.4,4.4],{lw:.4});sdFill(g,sdEl(x0,y0-1,1.2,1.2),gem,[x0-1.2,y0-2.2,2.4,2.4],{lw:.2,hl:70});sdLine(g,[[x0,y0+2],[x1,y1-4]],SD_GOLD,.5,.9)}
  else if(v===2){for(let k=1;k<5;k++){const t=k/5,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;sdMetal(g,g=>{g.moveTo(x-1.4,y-1.6);g.lineTo(x-4.2,y);g.lineTo(x-1.4,y+1.6);g.closePath()},L.metal||'#e2e8ef',[x-4.2,y-1.6,3,3.2],{lw:.3})}}
  else{g.save();g.globalCompositeOperation='lighter';for(let k=1;k<4;k++){const t=k/4,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;const gr=g.createRadialGradient(x,y,0,x,y,2.4);gr.addColorStop(0,sdA(gem,.95));gr.addColorStop(1,sdA(gem,0));g.fillStyle=gr;g.fillRect(x-2.4,y-2.4,4.8,4.8)}g.restore();
    sdLine(g,[[x0,y0+1],[x0+(x1-x0)*.5,y0+(y1-y0)*.5]],gem,.4,.8)}
  return P;
};
const _sdWeapon0=sdWeapon;
sdWeapon=function(L,q){
  const P=_sdWeapon0(L,q);if(!L.wglow)return P;
  const pad=5,c=document.createElement('canvas');c.width=P.c.width+Math.ceil(pad*2*q);c.height=P.c.height+Math.ceil(pad*2*q);
  const g=c.getContext('2d');g.shadowColor=L.wglow;g.shadowBlur=4*q;g.drawImage(P.c,pad*q,pad*q);g.shadowBlur=2*q;g.drawImage(P.c,pad*q,pad*q);g.shadowBlur=0;g.drawImage(P.c,pad*q,pad*q);
  return{c,x0:P.x0-pad,y0:P.y0-pad,w:P.w+pad*2,h:P.h+pad*2,tip:P.tip};
};

/* ---------- 무장 · 보스 개성 (얼굴형 · 눈매 · 헤어 · 모피 깃) ---------- */
const HERO_STYLE={
  guan:{jaw:'long',hs:'long',eyes:'sharp'},zhang:{jaw:'square',hs:'spiky',eyes:'round'},zhao:{jaw:'sharp',hs:'swept'},
  huang:{jaw:'square',age:'old',hs:'short'},zhuge:{jaw:'sharp',hs:'long',eyes:'sharp'},ma:{jaw:'sharp',hs:'long_wild',fur:'#f6f4ee'},
  diao:{jaw:'soft',eyes:'round'},wei:{jaw:'square',hs:'spiky',eyes:'sharp',fur:'#3a2a26'},lubu:{jaw:'sharp',hs:'long_wild',eyes:'sharp',fur:'#f2ece4'},
  xu:{jaw:'square',fur:'#dcd4c4'},gan:{jaw:'normal',hs:'spiky',fur:'#c89a4a'},sun:{jaw:'soft',eyes:'round'}};
const BOSS_STYLE={'장각':{age:'old',jaw:'long',eyes:'sharp'},'허저':{jaw:'square'},'조조':{jaw:'sharp',eyes:'sharp'},'사마의':{jaw:'long',eyes:'sharp',age:'old'},
  '장료':{jaw:'sharp',eyes:'sharp',fur:'#e8e4dc'},'하후은':{jaw:'sharp',hs:'swept'},'안량':{jaw:'square',eyes:'sharp',fur:'#6a4a2a'},'하후돈':{jaw:'square'},
  '하후연':{jaw:'sharp',eyes:'sharp'},'방덕':{jaw:'square',fur:'#3a3a40'},'여포':{jaw:'sharp',hs:'long_wild',eyes:'sharp',fur:'#f2ece4'}};
const NPC_STYLE={'유비':{jaw:'soft',hs:'long'},'황개':{age:'old',jaw:'square'},'미축':{jaw:'soft'},'미부인':{jaw:'soft',eyes:'round'}};
for(const h of HEROES){const s=HERO_STYLE[h.id];if(s)for(const k in s)if(h.look[k]==null)h.look[k]=s[k]}
for(const S of STAGES)if(S.boss){const s=BOSS_STYLE[S.boss.name];if(s)for(const k in s)if(S.boss.look[k]==null)S.boss.look[k]=s[k]}
if(typeof MIDBOSS!=='undefined'){const s=BOSS_STYLE[MIDBOSS.name];for(const k in s)if(MIDBOSS.look[k]==null)MIDBOSS.look[k]=s[k]}
