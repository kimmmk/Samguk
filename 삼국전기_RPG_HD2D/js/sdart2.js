'use strict';
/* ===== 그랑 스타일 SD 캐릭터 (sdart.js 위에 덮어쓰기) =====
   · 약 2.7등신: 머리를 줄이고 다리 · 몸통을 늘려 늘씬하게.
   · 얼굴: 갸름한 V턱 · 가늘고 날카로운 눈매 · 각진 눈썹 (여성은 큰 눈 · 긴 속눈썹).
   · 머리카락: 뾰족한 가닥 · 광택 링 · 옆머리.
   · 갑주: 큰 금장 견갑(말린 장식 · 보석) · 가슴 보석 문장 · 복부 분할판 · 앞 휘장 · 겹 허리갑 · 무릎 보호대 · 정강이 갑 · 팔 보호대.
   · 등 뒤 허리 리본 · 긴 갈래 망토 · 무기 날의 빛 (무장 · 보스 전용 aura 색).
   · 넓게 선 자세. 파츠 · 좌표 규칙은 sdart.js 와 같고, 도트 에디션의 레이어(opt.layer) · PIX_PR 도 지원한다. */

/* ---------- 얼굴 ---------- */
sdFacePath=function(g,jaw){
  g.moveTo(-15,-26);g.bezierCurveTo(-16,-47,23,-49,22,-26);
  if(jaw==='square'){g.bezierCurveTo(23,-15,21.6,-6,16,-1.4);g.lineTo(9,.8);g.bezierCurveTo(1,-.6,-9,-5,-13,-10.5)}
  else if(jaw==='soft'){g.bezierCurveTo(22.4,-15,18.6,-6,11.6,-1.2);g.quadraticCurveTo(8,.4,4,-1);g.bezierCurveTo(-3,-3.2,-9,-6.5,-12.6,-11)}
  else if(jaw==='long'){g.bezierCurveTo(22,-13,19.6,-1,12.4,2.6);g.quadraticCurveTo(9.4,3.8,6,2.4);g.bezierCurveTo(-1,.4,-8,-5,-12.6,-11)}
  else{g.bezierCurveTo(22.4,-17,19.4,-8,12.8,-.6);g.quadraticCurveTo(10.6,1.4,8,.8);g.bezierCurveTo(1,-1.6,-8,-6,-12.6,-11)}
  g.bezierCurveTo(-15,-15,-15,-20,-15,-26);g.closePath();
};
sdEye=function(g,cx,cy,w,h,L,near){
  const fem=L.face==='female',fierce=L.face==='fierce'||L.eyes==='sharp',calm=L.face==='calm',round=L.eyes==='round';
  const ec=L.eye||(fem?'#c23a7a':fierce?'#d0701e':calm?'#3a64a0':'#9a5424');
  const ww=w*(fem?1.02:1.1),hh=h*(fem?.62:round?.6:.52);
  const inX=near?cx+ww/2:cx-ww/2,outX=near?cx-ww/2:cx+ww/2,s=near?-1:1;
  const inY=cy+(fierce?-.3:.3),outY=cy-(fem?.8:fierce?1.9:1.3);
  const eyeP=g=>{g.moveTo(inX,inY);g.quadraticCurveTo(cx,cy-hh*1.25,outX,outY);g.quadraticCurveTo(cx+s*ww*.1,cy+hh*.95,inX,inY);g.closePath()};
  g.save();g.beginPath();eyeP(g);g.fillStyle='#fff8f0';g.fill();g.clip();
  const ix=cx+(near?.9:.6),iy=cy-hh*.02,rx=ww*(fem?.31:.29),ry=hh*(fem?1.02:1.08);
  const gr=g.createLinearGradient(0,iy-ry,0,iy+ry);gr.addColorStop(0,sdSh(ec,-78));gr.addColorStop(.45,sdSh(ec,-10));gr.addColorStop(1,sdSh(ec,55));
  g.beginPath();g.ellipse(ix,iy,rx,ry,0,0,SD_TAU);g.fillStyle=gr;g.fill();
  g.beginPath();g.ellipse(ix,iy+ry*.08,rx*.42,ry*.55,0,0,SD_TAU);g.fillStyle=sdSh(ec,-86);g.fill();
  g.fillStyle='rgba(40,10,20,.35)';g.beginPath();g.moveTo(inX,inY);g.quadraticCurveTo(cx,cy-hh*1.25,outX,outY);g.lineTo(outX,outY+hh*.5);g.quadraticCurveTo(cx,cy-hh*.4,inX,inY+hh*.4);g.closePath();g.fill();
  g.fillStyle='#ffffff';g.beginPath();g.ellipse(ix-rx*.35,iy-ry*.35,rx*.34,ry*.22,-.4,0,SD_TAU);g.fill();
  g.globalAlpha=.8;g.beginPath();g.arc(ix+rx*.4,iy+ry*.42,rx*.16,0,SD_TAU);g.fill();g.globalAlpha=1;
  g.restore();
  /* 윗눈꺼풀 (굵고 눈꼬리가 올라간 선) · 눈꼬리 삐침 · 아랫눈꺼풀 */
  const lw=fem?1.35:1.7;g.strokeStyle='#170a10';g.lineCap='round';
  g.beginPath();g.moveTo(inX+s*.2,inY-.2);g.quadraticCurveTo(cx,cy-hh*1.32,outX,outY);g.lineTo(outX+s*(fem?1.6:2.2),outY-(fem?1.5:1.1));g.lineWidth=lw;g.stroke();
  if(fem){g.lineWidth=.6;for(let i=0;i<3;i++){const t=.55+i*.2,px=inX+(outX-inX)*t,py=cy-hh*1.1+(i*.2);g.beginPath();g.moveTo(px,py);g.lineTo(px+s*1.1,py-1.5-i*.3);g.stroke()}}
  g.beginPath();g.moveTo(outX-s*.3,outY+.6);g.quadraticCurveTo(cx+s*ww*.1,cy+hh*1.05,inX+s*ww*.3,inY+hh*.45);g.strokeStyle='rgba(70,24,30,.6)';g.lineWidth=.55;g.stroke();
  if(calm){g.beginPath();g.moveTo(inX,inY-hh*.2);g.quadraticCurveTo(cx,cy-hh*.5,outX,outY+.2);g.strokeStyle='#170a10';g.lineWidth=.8;g.stroke()}
};
sdBrows=function(g,L){
  const hr=L.hair||'#1a1410',bc=L.hair&&sdRGB(hr).reduce((a,b)=>a+b)>420?sdSh(hr,-45):'#140a0c';
  const fem=L.face==='female',fierce=L.face==='fierce'||L.eyes==='sharp';
  if(fem){sdLine(g,[[-.6,-24.4],[4,-26.8,8.8,-24.8]],bc,.75);sdLine(g,[[13.2,-24.8],[16.4,-26.4,19.4,-24.4]],bc,.75);return}
  const d=fierce?1.6:.8;g.fillStyle=bc;
  g.beginPath();g.moveTo(-1.8,-28);g.quadraticCurveTo(3.6,-30,9.4,-25.4+d*.4);g.lineTo(9,-24+d*.4);g.quadraticCurveTo(3.4,-27.2,-1.4,-26.2);g.closePath();g.fill();
  g.beginPath();g.moveTo(13,-25.2+d*.4);g.quadraticCurveTo(16.6,-28.4,20.4,-27.8);g.lineTo(20.4,-26.4);g.quadraticCurveTo(16.6,-26.8,13.4,-23.8+d*.4);g.closePath();g.fill();
};
sdFace=function(g,L){
  const sk=L.skin,fem=L.face==='female',fierce=L.face==='fierce',jaw=L.jaw||(fem?'soft':'sharp');
  sdFill(g,g=>sdRR(g,-5,-10,10,15,3),sdMix(sk,'#a0503c',.28),[-5,-10,10,15],{lw:.8});
  sdFill(g,g=>sdFacePath(g,jaw),sk,[-15,-45,37,48],{hl:18,dk:14});
  g.save();g.beginPath();sdFacePath(g,jaw);g.clip();
  /* 셀 그림자: 뒤쪽 뺨 · 턱 밑 · 앞머리 그림자 */
  g.fillStyle=sdA(sdSh(sk,-42),.42);g.beginPath();g.moveTo(-16,-40);g.quadraticCurveTo(-4,-30,-5,-17);g.quadraticCurveTo(-3,-8,6,-1);g.lineTo(-16,4);g.closePath();g.fill();
  g.fillStyle=sdA(sdSh(sk,-35),.3);g.fillRect(-16,-34,40,4.5);
  const hl=g.createRadialGradient(16,-21,0,16,-21,8);hl.addColorStop(0,'rgba(255,252,244,.4)');hl.addColorStop(1,'rgba(255,252,244,0)');g.fillStyle=hl;g.fillRect(6,-32,18,22);
  g.restore();
  if(L.age==='old'){const wc=sdA(sdSh(sk,-55),.7);sdLine(g,[[-2.4,-14],[-4.4,-15,-5.4,-17]],wc,.5);sdLine(g,[[13.4,-9],[15.6,-6,14.6,-3]],wc,.55);sdLine(g,[[4,-9],[3,-6,4,-3.4]],wc,.5);sdLine(g,[[1,-29],[9,-30.4,17,-29]],wc,.5)}
  sdFill(g,sdEl(-11.2,-15.5,3.1,4.4,-.2),sk,[-14.5,-20,7,9],{lw:.8,hl:10,dk:30});sdLine(g,[[-11.8,-18],[-10,-15.5,-11.6,-13]],sdSh(sk,-40),.6);
  if(fem){g.fillStyle='rgba(255,110,140,.32)';g.beginPath();g.ellipse(2.4,-10.6,3,1.3,0,0,SD_TAU);g.fill();g.beginPath();g.ellipse(17.4,-10.6,1.6,1.1,0,0,SD_TAU);g.fill()}
  sdEye(g,3.6,-17,fem?9.8:9.4,fem?11:10.4,L,true);sdEye(g,15.8,-17.2,fem?6.2:6,fem?10.4:9.6,L,false);
  sdBrows(g,L);
  if(L.patch){sdLine(g,[[-14,-30],[6,-26,23,-21]],'#1a1010',1.1);sdFill(g,sdEl(16,-17,4.4,5.2,.1),'#1c1414',[12,-22,8,11],{lw:.7,hl:25,dk:10})}
  /* 코 · 입 */
  sdLine(g,[[13.8,-13.4],[15,-11],[13.2,-10.6]],sdSh(sk,-45),.6,.8);g.fillStyle=sdA(sdSh(sk,-35),.35);g.beginPath();g.moveTo(13,-13.4);g.lineTo(12.2,-10.8);g.lineTo(13.4,-10.8);g.closePath();g.fill();
  if(fem){g.fillStyle='#d8506e';g.beginPath();g.ellipse(10.6,-5.6,1.7,.8,0,0,SD_TAU);g.fill();g.fillStyle='#ffa2b8';g.fillRect(10.1,-6,1,.45)}
  else if(fierce){sdFill(g,g=>{g.moveTo(7.4,-6.2);g.quadraticCurveTo(10.6,-7.2,13.4,-6);g.quadraticCurveTo(10.6,-3.6,7.4,-6.2);g.closePath()},'#5a1a1a',[7,-7,7,4],{lw:.5,flat:true});g.fillStyle='#f4f0e8';g.fillRect(8.4,-6.5,4.4,.8)}
  else{sdLine(g,[[8.2,-5.8],[10.6,-5.2,12.8,-6.4]],'#5a2424',.75);sdLine(g,[[12.8,-6.4],[13.4,-6.9]],'#5a2424',.5)}
};

/* ---------- 머리카락: 뾰족한 가닥 ---------- */
function sd2Lock(g,x0,y0,x1,y1,w,bend,col,o){
  const mx=(x0+x1)/2,my=(y0+y1)/2,dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,b=bend||0;
  sdFill(g,g=>{g.moveTo(x0-nx*w,y0-ny*w);g.quadraticCurveTo(mx+nx*(b-w*.4),my+ny*(b-w*.4),x1,y1);g.quadraticCurveTo(mx+nx*(b+w*.5),my+ny*(b+w*.5),x0+nx*w,y0+ny*w);g.closePath()},
    col,[Math.min(x0,x1)-w,Math.min(y0,y1)-w,Math.abs(dx)+w*2,Math.abs(dy)+w*2],Object.assign({hl:34,dk:44,lw:.7},o||{}));
}
sdBangs=function(g,L,hs){
  const hr=L.hair||'#1a1410',hd=sdSh(hr,-8),fem=L.face==='female';
  /* 위로 뻗친 머리 (뒤쪽 스파이크) */
  if(hs==='spiky'||hs==='long_wild'){for(const [x,y,ex,ey,w] of[[-14,-40,-34,-52,6],[-10,-46,-26,-68,6],[-2,-50,-10,-76,6],[6,-50,8,-74,5.5],[14,-47,24,-66,5],[20,-40,34,-50,4.5]])sd2Lock(g,x,y,ex,ey,w,x<0?-3:3,hd)}
  /* 머리 덮개 */
  sdFill(g,g=>{g.moveTo(-17.5,-12);g.bezierCurveTo(-27,-44,-6,-58,8,-54.5);g.bezierCurveTo(24,-51.5,29,-38,25,-26);g.quadraticCurveTo(14,-33,4,-33.6);g.quadraticCurveTo(-8,-33,-13,-26);g.closePath()},hr,[-27,-58,56,46],{hl:30,dk:46});
  /* 앞머리 가닥 */
  const locks=fem?[[21,-36,24.4,-21,3.8,1],[15,-37,16.6,-21.6,4.2,1.4],[8,-37,8.4,-23.4,4.4,1],[1,-36,-.6,-24.6,4.2,-.6],[-6,-34,-8.8,-22,4,-1]]:
    [[22,-35,25.6,-23,3.8,1.4],[16,-37,18.4,-19.6,4.4,1.8],[9.6,-38,10.4,-21.4,4.6,1.4],[3,-37.6,1.8,-22.6,4.6,-.4],[-4,-36,-6.6,-22.4,4.4,-1.4],[-10,-33,-13.4,-19,4,-1.6]];
  for(const [x,y,ex,ey,w,b] of locks)sd2Lock(g,x,y,ex,ey,w,b,hr);
  /* 옆머리 (귀 앞 · 먼 쪽 관자놀이) */
  sd2Lock(g,fem?-11:-6,-34,fem?-13:-6.2,fem?-2:-11,fem?2.6:3.2,-1.4,hr);sd2Lock(g,21.6,-32,22.6,fem?-6:-14,2.4,1.2,hr);
  if(hs==='long'||hs==='long_f'||hs==='ponytail'){sd2Lock(g,-12,-30,-15,8,3,-2.4,hr);sd2Lock(g,22,-30,23.6,4,2.4,1.6,hr)}
  if(hs==='swept'){sd2Lock(g,24,-42,-6,-20,4.2,-6,sdSh(hr,6));sd2Lock(g,18,-44,-2,-26,3.4,-4,hr)}
  if(hs==='topknot'){sdFill(g,sdEl(-1,-55,7.5,6.2),hr,[-9,-62,16,13]);sdFill(g,g=>sdRR(g,-6.4,-51,11,3,1.4),'#c83030',[-6,-51,11,3],{lw:.7})}
  /* 광택 링 · 결 */
  g.save();g.beginPath();g.moveTo(-17.5,-12);g.bezierCurveTo(-27,-44,-6,-58,8,-54.5);g.bezierCurveTo(24,-51.5,29,-38,25,-26);g.lineTo(25,-20);g.lineTo(-18,-20);g.closePath();g.clip();
  g.setLineDash([2.6,1.4]);sdLine(g,[[-17,-38],[3,-50,22,-40]],sdSh(hr,78),2.2,.55);g.setLineDash([]);
  for(const [a,b,c,d] of[[-8,-50,-12,-30],[2,-53,0,-36],[12,-51,14,-36],[20,-46,23,-32]])sdLine(g,[[a,b],[(a+c)/2+1,(b+d)/2,c,d]],sdSh(hr,-60),.5,.7);
  g.restore();
};

/* ---------- 몸통 (목=원점, 엉덩이 y=30) ---------- */
function sd2TorsoPath(g){g.moveTo(-11,0);g.quadraticCurveTo(-18.5,1,-18.8,8);g.bezierCurveTo(-18,17,-14.4,23,-12.8,30);g.lineTo(15.4,30);g.bezierCurveTo(17.4,22,21,16,21,8);g.quadraticCurveTo(20.4,1,12,0);g.closePath()}
function sd2Gem(g,x,y,r,col){sdMetal(g,sdEl(x,y,r+1.3,r+1.3),SD_GOLD,[x-r-1.3,y-r-1.3,(r+1.3)*2,(r+1.3)*2],{lw:.6});
  const gr=g.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,sdSh(col,40));gr.addColorStop(1,sdSh(col,-40));
  g.beginPath();g.arc(x,y,r,0,SD_TAU);g.fillStyle=gr;g.fill();g.strokeStyle=sdSh(col,-60);g.lineWidth=.4;g.stroke()}
function sd2Curl(g,x,y,s,r,col){/* 금장 말린 장식 */g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+s*r*1.4,y-r*.4,x+s*r*1.3,y-r*1.6,x+s*r*.5,y-r*1.4);g.quadraticCurveTo(x+s*r*.1,y-r*1.2,x+s*r*.4,y-r*.8);
  g.strokeStyle=sdSh(col||SD_GOLD,-50);g.lineWidth=1.9;g.stroke();g.strokeStyle=col||SD_GOLD;g.lineWidth=1.1;g.stroke()}
function sd2Torso(L,q){
  const a=L.armor||'cloth';
  if(a==='bare'||a==='dress')return sdPart([-22,-7,46,46],q,g=>{g.scale(1,30/27.5);g.drawImage(SD_OLD.torso(L,q).c,-22,-6,44,40)});
  return sdPart([-24,-8,50,44],q,g=>{
    const b=L.body||'#666666',s=L.sub||SD_GOLD,BX=[-19,0,40,30],hero=!!L.aura,gem=L.gemC||L.aura||'#3aa0ff';
    sdFill(g,sd2TorsoPath,b,BX,{hl:26,dk:46});
    if(a==='plate'){
      const pc=sdSh(b,-14);
      const plate=g=>{g.moveTo(-15.4,4);g.quadraticCurveTo(3,.4,19.4,4.6);g.lineTo(18.6,19);g.quadraticCurveTo(10,23.4,3,22.6);g.quadraticCurveTo(-6,23.4,-14.4,19);g.closePath()};
      sdMetal(g,plate,pc,[-15,1,35,22]);
      g.save();g.beginPath();plate(g);g.clip();
      g.fillStyle=sdA(sdSh(pc,55),.25);g.beginPath();g.moveTo(8,1);g.lineTo(19.4,1);g.lineTo(19.4,22);g.lineTo(13,22);g.closePath();g.fill();
      sdLine(g,[[3,3],[3,22]],sdSh(pc,-50),.6,.8);g.restore();
      sdLine(g,[[-15.4,4],[3,.4,19.4,4.6]],SD_GOLD,1.5);sdLine(g,[[-14.4,19],[-6,23.4,3,22.6],[10,23.4,18.6,19]],SD_GOLD,1.3);
      if(hero){sd2Curl(g,-9,6.5,-1,4.4);sd2Curl(g,15,6.5,1,4.4);
        for(const [x0,y0,x1,y1] of[[3,8,3,4],[3,15.5,3,20.5],[-1.6,11.6,-6.6,11.6],[7.6,11.6,12.6,11.6]]){g.beginPath();g.moveTo(x0-(y1!==y0?1.1:0),y0-(y1===y0?1.1:0));g.lineTo(x1,y1);g.lineTo(x0+(y1!==y0?1.1:0),y0+(y1===y0?1.1:0));g.closePath();g.fillStyle=SD_GOLD;g.fill()}
        sd2Gem(g,3,11.6,3.2,gem)}
      else{sdMetal(g,sdEl(3,11.6,3.6,3.6),s,[-.6,8,7.2,7.2],{lw:.6})}
      /* 복부 분할판 */
      for(let i=0;i<2;i++){const y=22.6+i*3.4;sdMetal(g,g=>{g.moveTo(-13.4+i*.4,y);g.quadraticCurveTo(3,y+2,18+i*-.4,y-.2);g.lineTo(17.6,y+3);g.quadraticCurveTo(3,y+5,-13+i*.4,y+3.2);g.closePath()},sdSh(pc,-6-i*6),[-13,y,31,5],{lw:.6});sdLine(g,[[-13+i*.4,y+3.2],[3,y+5,17.6,y+3]],SD_GOLD,.7,.9)}
      /* 높은 옷깃 */
      sdMetal(g,g=>{g.moveTo(-8,-3.6);g.quadraticCurveTo(3,-6,13,-3.4);g.lineTo(12,2.4);g.quadraticCurveTo(3,.2,-7,2.4);g.closePath()},sdSh(pc,-6),[-8,-6,21,8.4],{lw:.7});sdLine(g,[[-8,-3.6],[3,-6,13,-3.4]],SD_GOLD,1)}
    else{
      /* 겹옷: 흰 속옷깃 · 넓은 금테 옷섶 · 가슴 자수 */
      sdFill(g,g=>{g.moveTo(-3.4,0);g.lineTo(4,a==='robe'?13:10);g.lineTo(11,0);g.closePath()},'#f4eee0',[-3,0,14,13],{lw:.7});
      sdFill(g,g=>{g.moveTo(11,0);g.lineTo(13.6,0);g.quadraticCurveTo(9,12,-3,26);g.lineTo(-7,24.4);g.quadraticCurveTo(5,12,11,0);g.closePath()},s,[-7,0,21,26],{hl:40,dk:30,lw:.7});
      sdFill(g,g=>{g.moveTo(-3.4,0);g.lineTo(-6,.6);g.quadraticCurveTo(-2,6,1.6,9.6);g.lineTo(3.6,8);g.closePath()},s,[-6,0,10,10],{hl:40,dk:30,lw:.6});
      sdLine(g,[[12.6,1.2],[8.4,12,-4.4,25]],sdSh(s,60),.5,.8);
      if(hero){g.save();g.globalAlpha=.75;sdLine(g,[[13,8],[16,6,17.4,10],[18,14,14.6,15],[12,16,13,19]],SD_GOLD,.7);sdLine(g,[[-10,10],[-13,8,-14.4,12],[-15,16,-11.6,17]],SD_GOLD,.7);g.restore()}
      if(a==='robe'){sdLine(g,[[-12,6],[-10,15,-11,24]],sdSh(b,-35),.6,.8);sdLine(g,[[16,6],[17,15,15,24]],sdSh(b,-35),.6,.8)}
      if(a==='cloth'&&hero){sdFill(g,g=>{g.moveTo(-17,2);g.lineTo(-12.6,0);g.lineTo(20,21);g.lineTo(17,24.4);g.closePath()},'#5a3418',[-17,0,37,24],{lw:.7});for(let t=.1;t<1;t+=.2)sd2Gem(g,-15+t*34,2+t*21,.9,'#e8c060')}}
    /* 허리띠 · 버클 */
    const bc=L.belt||sdSh(a==='plate'?b:s,-35);
    sdFill(g,g=>sdRR(g,-14.2,25.8,31.8,5.6,2.2),bc,[-14,25.8,31.8,5.6],{hl:30,dk:40});
    sdLine(g,[[-14,26.6],[17.4,26.6]],sdA(SD_GOLD,.8),.5);sdLine(g,[[-14,30.6],[17.4,30.6]],sdA(SD_GOLD,.8),.5);
    if(hero||a==='plate'){sdMetal(g,g=>{g.moveTo(3,24);g.lineTo(8.4,25.4);g.lineTo(9.4,28.6);g.lineTo(8.4,31.8);g.lineTo(3,33);g.lineTo(-2.4,31.8);g.lineTo(-3.4,28.6);g.lineTo(-2.4,25.4);g.closePath()},SD_GOLD,[-3.4,24,12.8,9]);
      if(hero)sd2Gem(g,3,28.6,1.8,gem);else{g.fillStyle='#6a3a10';g.fillRect(1.2,27.4,1.2,1);g.fillRect(3.8,27.4,1.2,1)}}
    else sdMetal(g,g=>sdRR(g,1,26.2,5,5,1.2),SD_GOLD,[1,26.2,5,5],{lw:.6});
    if((L.gA||0)>=4){const gc=L.gA>=5?'#ff3a2a':'#ffb030';sd2Gem(g,3,a==='plate'?-1.4:4,1.2,gc)}
    if(L.neckC){sdLine(g,[[-4,.6],[1,7,3.6,8.4],[7,7,12,.6]],'#e8d8a0',.55);sdFill(g,g=>{g.moveTo(3.6,8);g.lineTo(5.6,11);g.lineTo(3.6,14.4);g.lineTo(1.6,11);g.closePath()},L.neckC,[1.6,8,4,6.4],{lw:.45,hl:60})}
    if(L.fur){const fc=L.fur;for(let i=0;i<14;i++){const t=i/13,x=-19+t*40,y=1-Math.sin(t*Math.PI)*3.6+(i%2)*1.2,r=3.4+(i%3)*.8;
        sdFill(g,sdEl(x,y,r,r*.85,t),fc,[x-r,y-r,r*2,r*2],{lw:.5,hl:40,dk:26})}}
  });
}
/* ---------- 앞 휘장 · 허리갑 (엉덩이=원점) ---------- */
function sd2Skirt(L,q){
  const a=L.armor||'cloth',b=L.body||'#666666',s=L.sub||SD_GOLD,hero=!!L.aura;
  if(a==='bare'||a==='dress')return sdPart([-28,-2,56,48],q,g=>{g.scale(1,1.12);g.drawImage(SD_OLD.skirt(L,q).c,a==='bare'?-8:-26,-2,a==='bare'?24:52,a==='bare'?22:42)});
  return sdPart([-30,-2,60,52],q,g=>{
    /* 앞 휘장 (다리 사이로 늘어진 천) */
    const tb=L.tab||(a==='plate'?sdSh(s===SD_GOLD?b:s,-10):s),tl=a==='robe'?40:hero?25:20;
    sdFill(g,g=>{g.moveTo(-2,0);g.lineTo(10,0);g.quadraticCurveTo(12,tl*.5,11.4,tl);g.lineTo(4,tl-5);g.lineTo(-3.4,tl);g.quadraticCurveTo(-4,tl*.5,-2,0);g.closePath()},tb,[-4,0,16,tl],{hl:30,dk:40});
    sdLine(g,[[11.4,tl],[4,tl-5],[-3.4,tl]],SD_GOLD,1.2);sdLine(g,[[-2.6,2],[-3.4,tl*.5,-3,tl-1]],sdA(SD_GOLD,.9),.6);sdLine(g,[[10.4,2],[11.6,tl*.5,11,tl-1]],sdA(SD_GOLD,.9),.6);
    if(hero){g.save();g.globalAlpha=.8;sdLine(g,[[4,6],[1,9,4,12],[7,15,4,18],[1,21,4,24]],SD_GOLD,.8);g.restore()}
    if(a==='plate'){
      const flap=(x,w,h,c,sk)=>{const P=g=>{g.moveTo(x,0);g.lineTo(x+w,0);g.lineTo(x+w+sk,h-3);g.quadraticCurveTo(x+w/2+sk/2,h+2,x+sk,h-3);g.closePath()};
        sdMetal(g,P,c,[x,0,w,h]);g.save();g.beginPath();P(g);g.clip();for(let y=4;y<h-3;y+=3.6)sdLine(g,[[x-2,y],[x+w/2,y+1.2,x+w+2,y]],sdSh(c,-45),.55,.8);g.restore();
        sdLine(g,[[x+sk,h-3],[x+w/2+sk/2,h+2,x+w+sk,h-3]],SD_GOLD,1.5);if(hero){sd2Gem(g,x+w/2+sk/2,h-1,1,L.gemC||L.aura)}};
      flap(-20,12,16,sdSh(b,-18),-3.4);flap(-9,10,14,sdSh(b,-10),-1);flap(12,12,17,sdSh(b,-4),3.2)}
    else if(a==='robe'){
      sdFill(g,g=>{g.moveTo(-13,0);g.lineTo(15,0);g.bezierCurveTo(18,14,22,26,24,38);g.lineTo(-20,38);g.bezierCurveTo(-18,24,-15,12,-13,0);g.closePath()},b,[-20,0,44,38]);
      sdLine(g,[[-20,37],[24,37]],s,2.6);sdLine(g,[[-19.6,34],[23.6,34]],sdA(SD_GOLD,.8),.6);sdLine(g,[[9,0],[11,15,13.5,37]],s,1.8);
      for(let i=0;i<3;i++)sdLine(g,[[-9+i*6,4],[-11+i*6.6,20,-13+i*7,35]],sdSh(b,-40),.6,.7)}
    else{
      for(const [x,w,c,sk] of[[-17,14,sdSh(b,-14),-3],[3,15,b,3]]){sdFill(g,g=>{g.moveTo(x,0);g.lineTo(x+w,0);g.lineTo(x+w+sk,18);g.lineTo(x+sk,18);g.closePath()},c,[x-3,0,w+6,18]);sdLine(g,[[x+sk,17.4],[x+w+sk,17.4]],s,1.6)}}
  });
}
/* ---------- 팔 (어깨=원점, 손 y=24) ---------- */
function sd2Arm(L,q,dark){
  const a=L.armor||'cloth',b=L.body||'#666666',s=L.sub||SD_GOLD,sk=L.skin,wide=a==='robe'||a==='dress',hero=!!L.aura;
  return sdPart([-15,-10,30,44],q,g=>{
    if(wide){sdFill(g,g=>{g.moveTo(-4.8,-2);g.quadraticCurveTo(0,-5.4,4.8,-2);g.lineTo(10.4,20);g.quadraticCurveTo(0,25,-9.6,20);g.closePath()},b,[-9.6,-5,20,30]);
      sdLine(g,[[-9.6,19.8],[0,24.6,10.4,19.8]],s,2.2);sdLine(g,[[-8.6,17.4],[0,21.6,9.4,17.4]],sdA(SD_GOLD,.8),.5);sdFill(g,sdEl(.4,21,5.2,2),sdSh(b,-60),[-5,19,11,5],{lw:0,flat:true})}
    else{sdFill(g,g=>sdRR(g,-4.7,-3.4,9.4,16,4.6),a==='bare'?sk:b,[-4.7,-3.4,9.4,16]);
      /* 팔 보호대 */
      const vc=a==='plate'?sdSh(b,-12):a==='bare'?'#6a4020':sdSh(s===SD_GOLD?b:s,-20);
      sdMetal(g,g=>{g.moveTo(-5,10.6);g.lineTo(5,10);g.lineTo(5.6,20.4);g.lineTo(-5.4,20.4);g.closePath()},vc,[-5.4,10,11,10.4],{lw:.7});
      sdLine(g,[[-5,10.6],[5,10]],SD_GOLD,1.1);sdLine(g,[[-5.4,20.4],[5.6,20.4]],SD_GOLD,1.1);
      if(hero){sdMetal(g,g=>{g.moveTo(5,11);g.lineTo(9.4,13);g.lineTo(5.4,17);g.closePath()},SD_GOLD,[5,11,4.4,6],{lw:.4});sd2Gem(g,0,15.4,1,L.gemC||L.aura)}}
    const gv=L.gloveV||0;
    if(L.glove&&gv===1&&!wide)for(let k=0;k<3;k++)sdMetal(g,g=>{g.moveTo(-5,11.6+k*2.6);g.lineTo(-8.4,12.8+k*2.6);g.lineTo(-5,13.8+k*2.6);g.closePath()},'#d8dce4',[-8.4,11,4,9],{lw:.35});
    const hc=L.glove||(hero&&!wide&&a!=='bare'?'#2a2224':sk);sdFill(g,sdEl(.5,24,4.5,4.3),hc,[-4,19.8,9,9],{hl:30,dk:28});sdFill(g,sdEl(3.4,22.4,1.8,2.5,.3),hc,[1.6,20,4,5],{lw:.6});
    sdLine(g,[[-2.4,25.8],[0,27.2,2.8,26]],sdSh(hc,-45),.55);
  },dark);
}
/* ---------- 견갑 (어깨=원점): 무장 · 보스는 크고 화려하게 ---------- */
function sd2Pauldron(L,q,dark){
  const a=L.armor||'cloth';if(a==='robe'||a==='dress'||a==='bare')return null;
  const b=L.body||'#666666',s=L.sub||SD_GOLD,hero=!!L.aura,big=hero&&a==='plate';
  if(a==='cloth'&&!hero)return null;
  return sdPart([-22,-24,44,40],q,g=>{g.scale(big?1.08:.86,big?1.08:.86);
    const pc=a==='plate'?sdSh(b,-8):sdSh(s===SD_GOLD?'#6a4024':s,-10);
    for(let i=2;i>=0;i--){const y=i*4.2-3,c=i===0?pc:sdSh(pc,-8-i*7);
      const path=g=>{g.moveTo(-11+i*.8,y);g.quadraticCurveTo(0,y-10+i,12-i*.4,y);g.lineTo(11-i*.6,y+5.2);g.quadraticCurveTo(0,y+.6,-10+i*.8,y+5.2);g.closePath()};
      sdMetal(g,path,c,[-11,y-9,23,14]);
      sdLine(g,[[-10+i*.8,y+5.2],[0,y+.6,11-i*.6,y+5.2]],SD_GOLD,i===0?1.4:1)}
    sdMetal(g,sdEl(.5,-7.4,7,5),pc,[-6.5,-12.4,14,10]);sdLine(g,[[-6,-6],[.5,-12.6,7,-6]],SD_GOLD,1);
    if(big){sd2Curl(g,-4.6,-9,-1,4.2);sd2Curl(g,5.6,-9,1,4.2);
      sdMetal(g,g=>{g.moveTo(-1.2,-11);g.lineTo(.6,-18.5);g.lineTo(2.4,-11);g.closePath()},SD_GOLD,[-1.2,-18.5,3.6,8],{lw:.5});
      sd2Gem(g,.6,-6.8,2,L.gemC||L.aura||'#3aa0ff')}
    else{sdMetal(g,g=>{g.moveTo(-1,-11);g.lineTo(.8,-15);g.lineTo(2.4,-11);g.closePath()},SD_GOLD,[-1,-15,4,5],{lw:.5})}
    const gA=L.gA||0;if(gA>=4)for(const s2 of[-1,1])sdMetal(g,g=>{g.moveTo(s2*6,-9);g.lineTo(s2*11,-14);g.lineTo(s2*8,-7);g.closePath()},SD_GOLD,[-11,-14,22,7],{lw:.4});
  },dark);
}
/* ---------- 다리 (엉덩이 관절=원점, 발바닥 y=40) ---------- */
function sd2Leg(L,q,dark){
  const pn=L.pants||'#333333',bt=L.boots||'#222222',a=L.armor||'cloth',hero=!!L.aura,armored=a==='plate'||hero;
  return sdPart([-11,-4,28,48],q,g=>{
    sdFill(g,g=>{g.moveTo(-6,-1);g.lineTo(6,-1);g.quadraticCurveTo(7.6,11,5.4,23);g.lineTo(-5,23);g.quadraticCurveTo(-7,11,-6,-1);g.closePath()},pn,[-7,-1,14.6,24]);
    sdLine(g,[[0,3],[.8,11,0,19]],sdSh(pn,-40),.55,.7);
    /* 장화 · 정강이 갑 */
    sdFill(g,g=>{g.moveTo(-5.4,21);g.lineTo(5.6,20.4);g.lineTo(5.8,34);g.quadraticCurveTo(11,34.2,13.8,37);g.quadraticCurveTo(15.4,38.6,14.6,36.4);g.quadraticCurveTo(16,40,11.4,40);g.lineTo(-5.6,40);g.quadraticCurveTo(-6.4,30,-5.4,21);g.closePath()},bt,[-6.4,20,22,20],{hl:30,dk:40});
    sdLine(g,[[-5.6,40],[11.4,40]],sdSh(bt,-65),1.3);
    if(armored){sdMetal(g,g=>{g.moveTo(.6,22);g.lineTo(6.4,21.6);g.quadraticCurveTo(7.2,28,6.2,34.4);g.lineTo(1.4,33);g.closePath()},sdMix(bt,'#c8ccd4',.45),[.6,21.6,6.6,13],{lw:.6});
      sdLine(g,[[6.4,21.6],[7.2,28,6.2,34.4]],SD_GOLD,.8);sdMetal(g,g=>{g.moveTo(11,37);g.lineTo(15.4,38.4);g.lineTo(11.6,40);g.closePath()},SD_GOLD,[11,37,4.4,3],{lw:.4})}
    sdMetal(g,g=>sdRR(g,-6.2,19.6,12.6,3.6,1.6),sdMix(bt,SD_GOLD,.65),[-6.2,19.6,12.6,3.6],{lw:.7});
    /* 무릎 보호대 */
    if(armored){sdMetal(g,g=>{g.moveTo(-2.6,16);g.quadraticCurveTo(3,13.6,7.4,16.6);g.lineTo(6.6,23.4);g.quadraticCurveTo(2.4,25.6,-1.8,23.4);g.closePath()},L.sub&&L.sub!==SD_GOLD?L.sub:sdSh(pn,-10),[-2.6,13.6,10,12],{lw:.7});
      sdLine(g,[[-2.6,16],[3,13.6,7.4,16.6]],SD_GOLD,.9);if(hero)sd2Gem(g,2.6,19.6,1.1,L.gemC||L.aura)}
    const bv=L.bootV||0;
    if(bv===1)for(let k=0;k<3;k++)sdFill(g,g=>{g.moveTo(-4,24+k*2);g.quadraticCurveTo(-10-k,20+k*2,-13+k,15+k*3);g.quadraticCurveTo(-8,22+k*2,-3,26+k*2);g.closePath()},k%2?'#e8e8ec':'#ffffff',[-13,15,10,13],{lw:.4});
  },dark);
}
/* ---------- 망토 (등 어깨=원점): 길고 두 갈래 · 안감 ---------- */
function sd2Cape(L,q){
  if(!L.cape)return null;const cp=L.cape,ln=sdSh(cp,-38),lin=L.capeIn||(L.sub&&L.sub!==SD_GOLD?L.sub:sdSh(cp,-45)),hero=!!L.aura,len=hero?72:62;
  return sdPart([-30,-4,60,len+12],q,g=>{
    /* 안감 (뒤로 살짝 보이는 면) */
    sdFill(g,g=>{g.moveTo(-10,0);g.bezierCurveTo(-16,20,-22,44,-24,len-4);g.lineTo(-14,len-10);g.bezierCurveTo(-13,40,-11,20,-6,2);g.closePath()},lin,[-24,0,18,len],{hl:20,dk:40});
    const body=g=>{g.moveTo(-10,0);g.quadraticCurveTo(0,-2,10,0);g.bezierCurveTo(12,22,16,44,19,len);g.lineTo(9,len-8);g.lineTo(2,len+2);g.lineTo(-5,len-9);g.lineTo(-19,len-2);g.bezierCurveTo(-15.4,44,-13,22,-10,0);g.closePath()};
    sdFill(g,body,cp,[-19,-2,38,len+4],{hl:30,dk:48});
    g.save();g.beginPath();body(g);g.clip();
    for(let i=0;i<4;i++)sdLine(g,[[-6+i*4,4],[-9+i*6,len*.5,-13+i*9,len]],ln,.9,.8);
    const cv=L.capeV||0;
    if(cv===1||hero)for(const [x,y] of[[-5,len*.3],[6,len*.5],[-8,len*.7]])sdLine(g,[[x-4,y],[x-5,y-3,x-2,y-3.4],[x+1,y-3.6,x,y-1],[x+2,y+1,x+4,y]],sdA(SD_GOLD,.8),.7);
    g.restore();
    sdLine(g,[[19,len],[9,len-8],[2,len+2],[-5,len-9],[-19,len-2]],SD_GOLD,1.5);
    const gC=L.gC||0;
    if(gC>=4){g.save();g.globalAlpha=.85;g.fillStyle=SD_GOLD;g.font='bold 10px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(L.gC>=5?'龍':'將',0,30);g.restore()}
    sdMetal(g,sdEl(0,1,3.4,3.4),SD_GOLD,[-3.4,-2.4,6.8,6.8],{lw:.6});
  });
}
/* 허리 뒤 리본 두 갈래 (무장 · 보스) */
function sd2Sash(L,q){
  if(!L.aura)return null;const c=L.sash||(L.sub&&L.sub!==SD_GOLD?L.sub:'#c8262a');
  return sdPart([-40,-6,46,40],q,g=>{
    for(const [ex,ey,w,sh] of[[-36,26,3.2,0],[-30,34,2.8,-14]]){const col=sh?sdSh(c,sh):c;
      sdFill(g,g=>{g.moveTo(0,-w);g.bezierCurveTo(ex*.35,-w-3,ex*.7,ey*.2,ex,ey-4);g.lineTo(ex-2,ey+3);g.lineTo(ex+3,ey);g.bezierCurveTo(ex*.6,ey*.4+w,ex*.3,w+1,0,w);g.closePath()},col,[ex-2,-w-3,-ex+2,ey+w+6],{hl:36,dk:40,lw:.7});
      sdLine(g,[[0,0],[ex*.4,-1,ex*.8,ey*.5]],sdSh(col,50),.5,.6)}
    sdFill(g,sdEl(0,0,3.4,3),sdSh(c,-10),[-3.4,-3,6.8,6],{lw:.6});
  });
}
/* 무기 날의 빛 (aura) */
const _sd2Weapon=sdWeapon;
sdWeapon=function(L,q){
  const P=_sd2Weapon(L,q),B=SD_BLADE[L.weapon];if(!L.aura||!B)return P;
  const pad=4,c=document.createElement('canvas');c.width=P.c.width+Math.ceil(pad*2*q);c.height=P.c.height+Math.ceil(pad*2*q);
  const g=c.getContext('2d');g.drawImage(P.c,pad*q,pad*q);g.setTransform(q,0,0,q,(pad-P.x0)*q,(pad-P.y0)*q);
  const [x0,y0,x1,y1]=B;g.globalCompositeOperation='lighter';g.lineCap='round';
  for(const [lw,al] of[[3.4,.18],[1.8,.35],[.7,.9]]){g.strokeStyle=sdA(lw<1?'#ffffff':L.aura,al);g.lineWidth=lw;g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo((x0+x1)/2+(x1-x0)*.1,(y0+y1)/2,x1,y1);g.stroke()}
  return{c,x0:P.x0-pad,y0:P.y0-pad,w:P.w+pad*2,h:P.h+pad*2,tip:P.tip};
};

/* ---------- 조립 ---------- */
const SD_OLD={torso:sdTorso,skirt:sdSkirt};
function sd2Parts(L,q){
  const key='v2|'+[L.skin,L.hair,L.body,L.sub,L.pants,L.boots,L.hat,L.beard,L.weapon,L.armor,L.cape,L.face,L.dual,L.metal,L.wood,L.glove,L.belt,L.helmc,L.fanc,L.hs,L.eye,L.shield,L.flagc,L.flagt,L.jaw,L.eyes,L.age,L.fur,L.gA,L.gC,L.neckC,L.wglow,L.plumeC,L.gemC,L.armV,L.capeV,L.gloveV,L.bootV,L.beltV,L.neckV,L.wV,L.tasC,L.aura,L.sash,L.tab,L.capeIn,L.patch,q].join('|');
  let P=SD_CACHE.get(key);if(P)return P;
  if(SD_CACHE.size>260)SD_CACHE.clear();
  P={head:sdHead(L,q),back:sdBackHair(L,q),torso:sd2Torso(L,q),skirt:sd2Skirt(L,q),arm:sd2Arm(L,q,false),armB:sd2Arm(L,q,true),
    paul:sd2Pauldron(L,q,false),paulB:sd2Pauldron(L,q,true),leg:sd2Leg(L,q,false),legB:sd2Leg(L,q,true),cape:sd2Cape(L,q),sash:sd2Sash(L,q),wpn:sdWeapon(L,q),shield:sdShield(L,q)};
  SD_CACHE.set(key,P);return P;
}
const SD2_HEAD=.86,SD2_WPN=1.1;
renderSD=function(g,L,pose,sx,sy,scale,facing,opt){
  opt=opt||{};const ps=pose||{},k=scale*(L.scale||1)*SD_K,pr=window.PIX_PR||(typeof PR!=='undefined'?PR:1),q=sdQ(k*pr),P=sd2Parts(L,q);
  const f=facing<0?-1:1,sp=Math.cos(ps.spin||0),sq=Math.abs(sp)<.15?.15*(sp<0?-1:1):sp,tint=opt.flash?'rgba(255,255,255,.75)':opt.tint||null,LY=opt.layer;
  const o=g;o.save();o.imageSmoothingEnabled=true;o.translate(sx,sy);o.scale(k*f*sq,k);
  if(ps.lie){o.translate(58,-10);o.rotate(-Math.PI/2)}
  const bob=(ps.bob||0)*1.6,M=L.mount;o.translate(0,-bob);
  if(M){if(!LY||LY==='back')sdHorse(o,M,L,ps);const hb=ps.gallop?Math.abs(Math.sin(ps.gallop))*2.4:0;o.translate(-5,-34-hb);if(ps.rear){o.translate(-26,36);o.rotate(-ps.rear*.32);o.translate(26,-36)}}
  const part=(pt,px,py,rot,lay,sc)=>{if(!pt||(LY&&LY!==lay))return;o.save();o.translate(px,py);if(rot)o.rotate(rot);if(sc)o.scale(sc,sc);o.drawImage(tint?sdTinted(pt,tint):pt.c,pt.x0,pt.y0,pt.w,pt.h);o.restore()};
  const lean=(ps.lean||0)*.9+.04,hip=[0,-40];
  const R=(x,y)=>{const c=Math.cos(lean),n=Math.sin(lean),dx=x-hip[0],dy=y-hip[1];return[hip[0]+dx*c-dy*n,hip[1]+dx*n+dy*c]};
  const neck=R(0,-70),shF=R(9.5,-65),shB=R(-8.5,-65),capeP=R(-4,-68),sashP=R(-7,-43);
  const aF=(ps.armL!=null?ps.armL:-.35)+lean,aB=(ps.armR!=null?ps.armR:.1)+lean,wA=(ps.wAng!=null?ps.wAng:-2.5)+lean,ext=(ps.ext||0)*1.6;
  const dir=a=>[-Math.sin(a),Math.cos(a)];
  const dF=dir(aF),hand=[shF[0]+dF[0]*(24+ext),shF[1]+dF[1]*(24+ext)],dB=dir(aB),handB=[shB[0]+dB[0]*24,shB[1]+dB[1]*24];
  const hRot=lean+(ps.head||0)*.8,cape=(ps.cape!=null?ps.cape:.12);
  const st=ps.lie?0:.17,legF=(ps.legL||0)+st,legB=(ps.legR||0)-st;
  part(P.cape,capeP[0],capeP[1],cape*.9+lean,'back');
  part(P.sash,sashP[0],sashP[1],cape*.7+lean*.5-.1,'back');
  part(P.back,neck[0],neck[1],hRot,'back',SD2_HEAD);
  part(P.armB,shB[0],shB[1],aB,'back');
  if(L.dual)part(P.wpn,handB[0],handB[1],ps.wAng2!=null?ps.wAng2+lean:aB-1.3,'back',SD2_WPN);
  part(P.paulB,shB[0],shB[1],lean+aB*.22,'back');
  if(!M){part(P.legB,-3.6,-40,legB,'body');part(P.leg,3.6,-40,legF,'body')}
  part(P.skirt,hip[0],hip[1],lean*.5,'body');
  if(M)part(P.leg,4,-39,-.75,'body');
  part(P.torso,neck[0],neck[1],lean,'body');
  if(P.shield&&!ps.noShield){const sp2=R(15,-46);part(P.shield,sp2[0],sp2[1],lean*.6,'body')}
  part(P.paul,shF[0],shF[1],lean+aF*.22,'body');
  part(P.head,neck[0],neck[1],hRot,'body',SD2_HEAD);
  part(P.wpn,hand[0],hand[1],wA,'weapon',SD2_WPN);
  part(P.arm,shF[0],shF[1],aF,'front');
  o.restore();
  const wd=dir(wA),tipL=P.wpn.tip*SD2_WPN,mapP=(x,y)=>{if(M){x-=5;y-=34}y-=bob;if(ps.lie){const t=x;x=y+58;y=-t-10}return[sx+x*f*sq*k,sy+y*k]};
  const t1=mapP(hand[0]+wd[0]*tipL,hand[1]+wd[1]*tipL),t2=mapP(hand[0]+wd[0]*tipL*.45,hand[1]+wd[1]*tipL*.45);
  return{tx:t1[0],ty:t1[1],mx:t2[0],my:t2[1]};
};
renderModel=function(g,L,pose,sx,sy,scale,facing,opt){return renderSD(g,L,pose,sx,sy,scale,facing,opt)};
renderModelOutlined=function(g,L,pose,sx,sy,scale,facing,opt){return renderSD(g,L,pose,sx,sy,scale,facing,opt)};

/* ---------- 무장 · 보스 외형: 빛 색(aura) · 보석 · 그랑풍 색 ---------- */
const GRAND_STYLE={
  guan:{armor:'plate',cape:'#1f5a2c',sub:'#2f8a44',jaw:'long',eyes:'sharp'},
  zhang:{armor:'plate',cape:'#2a1a1a',jaw:'square',eyes:'sharp'},
  zhao:{armor:'plate',cape:'#e8eef6',capeIn:'#2a5aa8',sub:'#2a5aa8',jaw:'sharp'},
  huang:{armor:'plate',cape:'#6a2a14',jaw:'square'},
  zhuge:{cape:'#2a2a48',capeIn:'#c8b060'},
  ma:{armor:'plate',cape:'#f0f2f6',capeIn:'#3a6ab0',jaw:'sharp',eyes:'sharp'},
  diao:{cape:'#f2c8dc',capeIn:'#b04880'},
  wei:{armor:'plate',cape:'#3a1414',jaw:'square',eyes:'sharp'},
  lubu:{armor:'plate',cape:'#8a1414',capeIn:'#2a0a0a',jaw:'sharp',eyes:'sharp'},
  xu:{armor:'plate',cape:'#4a3a24',jaw:'square',eyes:'sharp'},
  gan:{cape:'#1a4a7a',capeIn:'#c83030',eyes:'sharp'},
  sun:{cape:'#d83a3a',capeIn:'#f0c040'}};
for(const h of HEROES){const s=GRAND_STYLE[h.id]||{};for(const k in s)if(k==='jaw'||k==='eyes'||h.look[k]==null||k==='armor'&&h.look.armor==='cloth'&&s.armor)h.look[k]=s[k];
  h.look.aura=h.look.aura||h.fx||'#6ab8ff';if(!h.look.gemC)h.look.gemC=h.fx||'#3aa0ff'}
for(const d of[typeof MIDBOSS!=='undefined'?MIDBOSS:null].concat(STAGES.filter(s=>s.boss).map(s=>s.boss))){if(!d||!d.look)continue;
  const U=typeof BOSS_ULT!=='undefined'&&BOSS_ULT[d.name];d.look.aura=d.look.aura||(U&&U.col)||'#ff5030';if(!d.look.gemC)d.look.gemC=d.look.aura;
  if(!d.look.cape)d.look.cape=sdSh(d.look.body||'#444444',-40)}
