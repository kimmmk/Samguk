'use strict';
/* ===== SD(치비) 도트 캐릭터 렌더러 =====
   파츠(뒷머리 · 망토 · 팔 · 다리 · 치마 · 몸통 · 머리 · 무기)를 도트 캔버스로 한 번 그려 캐시하고,
   기존 3D 모델과 같은 포즈 값(armL · armR · wAng · legL · legR · lean · head · cape · bob · ext · spin · lie)으로 관절 조립한다.
   도트 기법: 5단 명암 팔레트 + 디더링, 1px 셀렉티브 외곽선, 애니 눈(속눈썹 · 그라데이션 홍채 · 하이라이트), 머리카락 광택 링 */
const CB_OUT='#1a1220';
const BAYER2=[[0,.5],[.75,.25]];
function cramp(c){return[shade(c,-78),shade(c,-40),c,shade(c,30),shade(c,70)]}
function cbCanvas(w,h){const c=mkC(w,h,true);const g=c.getContext('2d');g.imageSmoothingEnabled=false;return[c,g]}
function cbP(g,x,y,col){g.fillStyle=col;g.fillRect(x|0,y|0,1,1)}
function cbR(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))}
/* 명암 덩어리: 타원 (광원 좌상단), cut(nx,ny) 로 잘라냄 */
function cbBlob(g,cx,cy,rx,ry,col,cut,flat){
  const R=cramp(col);
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry,d=nx*nx+ny*ny;if(d>1)continue;if(cut&&!cut(nx,ny,x,y))continue;
    let b=.58-nx*.26-ny*.36-d*.16+(BAYER2[y&1][x&1]-.4)*.1;if(flat)b=.5+(b-.5)*.5;
    cbP(g,x,y,R[b>.84?4:b>.62?3:b>.36?2:b>.16?1:0])}
}
/* 명암 사각형 (둥근 모서리) */
function cbBox(g,x0,y0,w,h,col,rad,flat){
  const R=cramp(col);rad=rad||0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(rad){const dx=Math.max(0,rad-x-.5,x+.5-(w-rad)),dy=Math.max(0,rad-y-.5,y+.5-(h-rad));if(dx*dx+dy*dy>rad*rad)continue}
    const nx=(x+.5)/w*2-1,ny=(y+.5)/h*2-1;let b=.56-nx*.24-ny*.22+(BAYER2[(y0+y)&1][(x0+x)&1]-.4)*.1;if(flat)b=.5+(b-.5)*.4;
    cbP(g,x0+x,y0+y,R[b>.84?4:b>.64?3:b>.34?2:b>.14?1:0])}
}
function cbPoly(g,pts,col){g.fillStyle=col;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(const p of pts)g.lineTo(p[0],p[1]);g.closePath();g.fill()}
function cbLine(g,x0,y0,x1,y1,col,w){w=w||1;const n=Math.max(1,Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=n;i++)cbR(g,x0+(x1-x0)*i/n-(w-1)/2,y0+(y1-y0)*i/n-(w-1)/2,w,w,col)}
/* 셀렉티브 외곽선 (이웃 색을 어둡게) */
function cbOutline(c){
  const g=c.getContext('2d'),w=c.width,h=c.height,id=g.getImageData(0,0,w,h),d=id.data,s=new Uint8ClampedArray(d);
  const O=hexRGB(CB_OUT);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const q=(y*w+x)*4;if(s[q+3]>40)continue;
    let r=-1;for(const [dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const k=(yy*w+xx)*4;if(s[k+3]>40){r=k;break}}
    if(r<0)continue;d[q]=Math.round(s[r]*.22+O[0]*.78);d[q+1]=Math.round(s[r+1]*.22+O[1]*.78);d[q+2]=Math.round(s[r+2]*.22+O[2]*.78);d[q+3]=255}
  g.putImageData(id,0,0);return c;
}
/* 무장 · 적 외형 기본값 */
function cbStyle(L){
  return{hs:L.hs||(L.face==='female'?'long_f':L.hat==='none'?'short':'short'),eye:L.eye||(L.face==='female'?'#8a2a5a':'#3a2414'),
    metal:L.metal||'#d8e0e8',wood:L.wood||'#6a4020'};
}

/* ---------- 머리 (얼굴 · 앞머리 · 모자 · 수염) 72 x 128, 얼굴 중심 (36,76), 목 (36,94) ---------- */
const HC={w:72,h:128,fx:36,fy:76,nx:36,ny:94};
function cbEye(g,x,y,w,L,st,far){
  const ec=cramp(st.eye),fem=L.face==='female',calm=L.face==='calm',fierce=L.face==='fierce';
  const h=calm?8:11,top=y+(calm?3:0),iw=far?w-1:w-1,ix=x+(far?0:1);
  cbR(g,x,top+1,w,h-1,'#fbf6f0');                                              // 흰자
  for(let r=1;r<h;r++){const q=r/h;cbR(g,ix,top+r,iw,1,q<.28?ec[0]:q<.5?ec[1]:q<.78?ec[2]:ec[3])}   // 그라데이션 홍채
  cbR(g,ix+1,top+h-2,iw-2,1,ec[4]);                                             // 아래 반사광
  cbR(g,ix+Math.floor(iw/2)-(far?0:1),top+3,far?1:2,Math.max(2,h-6),shade(st.eye,-110));   // 동공
  cbR(g,ix+(far?0:1),top+2,far?2:3,far?2:3,'#ffffff');cbP(g,ix+iw-2,top+h-3,'#ffffff');    // 하이라이트
  cbR(g,x-1,top,w+2,2,fierce?'#050305':CB_OUT);                                 // 두꺼운 윗 속눈썹
  if(!far){cbP(g,x+w+1,top+1,CB_OUT);cbP(g,x+w+2,top,CB_OUT)}                    // 눈꼬리
  if(fem){cbP(g,x+w+2,top-1,CB_OUT);cbP(g,x+w+1,top+h-1,CB_OUT);cbP(g,x-1,top+2,CB_OUT)}
  cbR(g,x,top+h,w,1,shade(L.skin,-42));
}
function cbHead(L,st){
  const [c,g]=cbCanvas(HC.w,HC.h),sk=L.skin,hr=L.hair||'#1a1410',fx=HC.fx,fy=HC.fy,fem=L.face==='female',fierce=L.face==='fierce';
  // 귀 · 얼굴
  cbBlob(g,fx-15,fy+2,4,6,sk);cbP(g,fx-15,fy+2,shade(sk,-40));
  cbBlob(g,fx+1,fy+1,17,16,sk,(nx,ny)=>!(ny>.55&&Math.abs(nx+.12)>.9-ny*.55));
  // 눈 (3/4 오른쪽)
  const ey=fy-3;cbEye(g,fx+3,ey,9,L,st,false);cbEye(g,fx-10,ey,6,L,st,true);
  cbP(g,fx+6,fy+14,shade(sk,26));cbP(g,fx+7,fy+14,shade(sk,26));
  // 눈썹
  const bc=shade(hr,-10);
  if(fierce){cbLine(g,fx+2,ey-5,fx+12,ey-2,'#0c0808',2);cbLine(g,fx-11,ey-2,fx-4,ey-5,'#0c0808',2)}
  else{cbR(g,fx+4,ey-4,8,1,bc);cbR(g,fx-10,ey-4,6,1,bc)}
  // 코 · 입 · 볼
  cbP(g,fx+13,fy+6,shade(sk,-36));cbP(g,fx+12,fy+7,shade(sk,-22));
  if(fem){cbR(g,fx+5,fy+11,4,1,'#d8406a');cbP(g,fx+6,fy+12,'#ff8aa8');cbR(g,fx+4,fy+7,4,2,'#f4a0b0');cbR(g,fx-8,fy+7,3,2,'#f4a0b0')}
  else if(!(L.beard&&L.beard!=='short')){cbR(g,fx+5,fy+11,4,1,shade(sk,-80));if(fierce){cbP(g,fx+4,fy+10,shade(sk,-80));cbP(g,fx+9,fy+10,shade(sk,-80))}}
  // 수염
  const bd=L.beard==='white'?'#eeeeee':'#16100e';
  if(L.beard==='long'||L.beard==='white'){cbBlob(g,fx+4,fy+24,11,18,bd,(nx,ny)=>ny>-.75);for(let i=0;i<5;i++)cbLine(g,fx-3+i*3,fy+12,fx-2+i*3,fy+38,shade(bd,i%2?20:-30));
    cbR(g,fx+2,fy+10,7,2,bd)}
  else if(L.beard==='spiky'){for(let i=0;i<8;i++)cbPoly(g,[[fx-14+i*4,fy+8],[fx-11+i*4,fy+8],[fx-12+i*4+ (i%2?1:-1),fy+18+(i%3)]],bd);cbR(g,fx-14,fy+8,30,4,bd)}
  else if(L.beard==='short'){cbR(g,fx+2,fy+10,9,3,bd);cbR(g,fx+4,fy+13,5,3,bd)}
  // 앞머리
  cbFrontHair(g,L,st);
  cbHat(g,L,st);
  return cbOutline(c);
}
function cbFrontHair(g,L,st){
  const hr=L.hair||'#1a1410',R=cramp(hr),fx=HC.fx,fy=HC.fy,hs=st.hs;
  if(L.hat==='none'&&hs==='short'){cbBlob(g,fx,fy-9,19,11,hr,(nx,ny)=>ny<.25);return}
  cbBlob(g,fx,fy-11,20,15,hr,(nx,ny)=>ny<.12);
  // 광택 링
  for(let x=-14;x<=12;x++){const y=Math.round(fy-17+Math.abs(x)*.28+x*x*.01);if((x&3)!==3)cbP(g,fx+x,y,R[4]);cbP(g,fx+x,y+1,R[3])}
  // 앞머리 가닥
  const spikes=[[-16,9],[-11,9],[-6,8],[-1,7],[4,5],[9,5],[14,4]];
  for(const [ox,len] of spikes){const x0=fx+ox,y0=fy-12;cbPoly(g,[[x0-3,y0],[x0+3,y0],[x0+(ox<0?-1:1),y0+len]],R[ox<0?1:2]);cbLine(g,x0,y0,x0+(ox<0?-1:1)*.5,y0+len-2,R[3])}
  // 옆머리 (귀 앞)
  cbBox(g,fx-19,fy-6,5,hs==='long_f'||hs==='long'?30:14,hr,2);
  if(hs==='spiky')for(let i=0;i<6;i++){const x0=fx-16+i*6;cbPoly(g,[[x0-3,fy-20],[x0+3,fy-20],[x0+(i-2.5)*1.2,fy-31-(i%2)*4]],R[2])}
  if(hs==='topknot'){cbBlob(g,fx-2,fy-28,7,6,hr);cbR(g,fx-5,fy-23,8,2,'#c83030')}
  if(hs==='long_f'){cbBox(g,fx+14,fy-4,5,26,hr,2)}
}
function cbHelm(g,col,fx,fy,crest){
  cbBlob(g,fx,fy-11,21,16,col,(nx,ny)=>ny<.45);cbBox(g,fx-21,fy-6,42,4,shade(col,-30));
  cbBox(g,fx-20,fy-4,6,14,col,2);cbR(g,fx-1,fy-28,3,4,shade(col,40));
  if(crest)for(let i=0;i<5;i++)cbLine(g,fx-2-i*2,fy-30+i,fx-12-i*3,fy-40+i*3,crest,2);
}
function cbHat(g,L,st){
  const fx=HC.fx,fy=HC.fy,hat=L.hat;
  switch(hat){
    case'guan':cbBox(g,fx-17,fy-30,34,14,'#2f7d3b',5);cbBox(g,fx-19,fy-18,38,4,'#d4af37');cbBox(g,fx-22,fy-18,6,18,'#2f7d3b',2);break;
    case'zhang':cbBox(g,fx-20,fy-18,40,6,'#141414');for(let i=0;i<4;i++)cbLine(g,fx-20,fy-15,fx-32-i*2,fy-6+i*3,'#141414',2);cbR(g,fx-21,fy-17,4,4,'#b03a2e');break;
    case'zhao':cbHelm(g,'#d0d8e0',fx,fy,null);for(let i=0;i<8;i++)cbLine(g,fx,fy-28,fx-14-i*3,fy-26+i*2,'#d02828',2);cbR(g,fx-2,fy-12,5,3,'#e0c040');break;
    case'huang':cbHelm(g,'#9a6a2a',fx,fy,null);cbLine(g,fx,fy-28,fx,fy-38,'#e0c040',1);cbBlob(g,fx,fy-40,4,4,'#c02020');break;
    case'zhuge':cbBox(g,fx-18,fy-22,36,6,'#1c1c26');cbBox(g,fx-12,fy-42,24,22,'#1c1c26',3);cbBox(g,fx-13,fy-30,26,3,'#e9e4d0');break;
    case'ma':cbHelm(g,'#e4e8f0',fx,fy,null);cbBlob(g,fx+2,fy-24,10,7,'#d0a830');for(let i=0;i<6;i++)cbLine(g,fx-8,fy-20,fx-24-i*2,fy-8+i*3,'#fafafa',2);break;
    case'diao':cbR(g,fx-24,fy-24,20,2,'#ffd86a');cbBlob(g,fx-24,fy-24,4,4,'#ff6aa0');cbBlob(g,fx+10,fy-20,3,3,'#ffffff');cbP(g,fx+10,fy-20,'#ffd86a');break;
    case'wei':cbHelm(g,'#5a1a1a',fx,fy,null);cbPoly(g,[[fx-14,fy-20],[fx-10,fy-20],[fx-18,fy-38]],'#e8dcc0');cbPoly(g,[[fx+10,fy-20],[fx+14,fy-20],[fx+18,fy-38]],'#e8dcc0');break;
    case'lubu':cbHelm(g,'#e0b840',fx,fy,null);cbBlob(g,fx,fy-26,5,4,'#c02020');
      for(const s of[-1,1])for(let i=0;i<46;i++){const t=i/46,x=fx+s*4-t*20+Math.sin(t*3)*6*s,y=fy-28-t*44+t*t*10;cbR(g,x,y,2,2,i%6<3?'#f4e8c0':'#b88a40')}break;
    case'helm':cbHelm(g,L.helmc||shade(L.body,-28),fx,fy,null);cbR(g,fx-1,fy-34,2,8,L.sub);break;
    case'helm2':cbHelm(g,L.helmc||'#b89030',fx,fy,'#c02020');break;
    case'crown':cbBox(g,fx-14,fy-30,28,14,'#1a1a2a',3);cbBox(g,fx-18,fy-20,36,4,'#d8b040');for(let i=0;i<5;i++){cbR(g,fx-14+i*7,fy-36,2,6,'#e8d060');cbP(g,fx-14+i*7,fy-37,'#ff4040')};break;
    case'taoist':cbBox(g,fx-17,fy-24,34,7,'#1a1a1a');cbBox(g,fx-7,fy-36,14,12,L.sub||'#8a2a8a',3);cbLine(g,fx-12,fy-30,fx+12,fy-30,'#e0c040');break;
    case'gan':cbBox(g,fx-20,fy-16,40,4,'#c02020',2);for(const x of[-14,-4,6])cbBlob(g,fx+x,fy-12,2.5,2.5,'#e8c040');for(let i=0;i<8;i++)cbLine(g,fx-4,fy-26,fx-12-i*2,fy-40+i,'#40a0e0',2);break;
    case'sun':cbBlob(g,fx-14,fy-22,6,4,'#e03030');cbBlob(g,fx-24,fy-22,6,4,'#e03030');cbBlob(g,fx-19,fy-22,2.5,2.5,'#ffd060');cbBox(g,fx-18,fy-17,34,3,'#ffd060',1);break;
    case'scarf':cbBox(g,fx-20,fy-22,40,9,'#e8c020',4);cbR(g,fx-20,fy-18,40,1,'#b89010');for(let i=0;i<3;i++)cbLine(g,fx-20,fy-16,fx-30-i*2,fy-2+i*2,'#e8c020',2);break;
  }
}
/* 뒷머리 (몸 뒤) */
function cbBackHair(L,st){
  const hs=st.hs;if(!(hs==='long'||hs==='long_f'||hs==='ponytail'))return null;
  const [c,g]=cbCanvas(HC.w,HC.h),hr=L.hair||'#1a1410',R=cramp(hr),fx=HC.fx,fy=HC.fy;
  if(hs==='ponytail'){cbBlob(g,fx-14,fy-4,9,8,hr);for(let i=0;i<30;i++){const t=i/30;cbBlob(g,fx-18-t*10,fy+2+t*36,5-t*2.5,3,hr)}}
  else{const len=hs==='long_f'?50:38;cbBox(g,fx-22,fy-14,30,len,hr,6);for(let i=0;i<5;i++)cbLine(g,fx-18+i*5,fy-8,fx-19+i*5,fy-14+len-2,R[i%2?1:3])}
  return cbOutline(c);
}
/* ---------- 몸통 34 x 30, 목 (17,2), 엉덩이 (17,27) ---------- */
function cbTorso(L){
  const [c,g]=cbCanvas(34,30),a=L.armor||'cloth',b=L.body,s=L.sub,sk=L.skin;
  if(a==='bare'){cbBox(g,5,2,24,24,sk,5);cbLine(g,17,6,17,20,shade(sk,-35));cbLine(g,9,12,15,12,shade(sk,-30));cbLine(g,19,12,25,12,shade(sk,-30));}
  else cbBox(g,5,2,24,25,b,5);
  if(a==='plate'){cbBox(g,8,6,18,13,s,2);for(let y=8;y<18;y+=3)cbR(g,9,y,16,1,shade(s,-45));for(let x=10;x<25;x+=4)cbP(g,x,7,shade(s,60));cbBox(g,14,4,6,3,sk,1)}
  else if(a==='robe'){cbPoly(g,[[12,2],[22,2],[17,14]],'#f2eee2');cbLine(g,12,2,17,14,s,2);cbLine(g,22,2,17,14,s,2);cbLine(g,17,14,17,26,shade(b,-40))}
  else if(a==='dress'){cbBox(g,14,2,6,4,sk,1);cbBox(g,6,10,22,5,s,2);cbP(g,17,12,'#ffffff')}
  else if(a!=='bare'){cbBox(g,14,2,6,3,sk,1);cbLine(g,13,2,19,10,s,2);cbLine(g,21,2,16,9,shade(s,-20),2)}
  for(let x=7;x<27;x+=3)if(a!=='bare')cbP(g,x,24,shade(s,50));
  cbBox(g,5,21,24,4,L.belt||(a==='bare'?s:shade(s,-25)));cbBox(g,15,20,4,6,L.belt?shade(L.belt,60):'#e0b840',1);
  return cbOutline(c);
}
/* 치마 (갑옷 태세트 · 도포 · 드레스) 40 x 36, 위 가운데 (20,1) */
function cbSkirt(L){
  const a=L.armor||'cloth';const [c,g]=cbCanvas(40,36),b=L.body,s=L.sub;
  if(a==='plate'){for(let i=0;i<4;i++){cbBox(g,5+i*8,1,9,13,i%2?s:b,2);cbR(g,6+i*8,11,7,1,shade(s,50))}}
  else if(a==='robe'){cbPoly(g,[[7,1],[33,1],[37,33],[3,33]],b);for(let i=0;i<4;i++)cbLine(g,11+i*6,4,9+i*7,32,shade(b,-38));cbLine(g,4,32,36,32,s,2)}
  else if(a==='dress'){cbPoly(g,[[8,1],[32,1],[39,30],[1,30]],b);for(let i=0;i<5;i++)cbLine(g,12+i*4,4,6+i*7,29,shade(b,-30));cbLine(g,2,29,38,29,s,2);for(let x=5;x<36;x+=4)cbP(g,x,26,'#ffe0f0')}
  else if(a==='cloth'){cbPoly(g,[[8,1],[32,1],[34,10],[6,10]],b);cbLine(g,20,1,20,10,shade(b,-40))}
  else return null;
  return cbOutline(c);
}
/* 팔 14 x 28, 어깨 (7,3) — 아래로 늘어진 모양 */
function cbArm(L,front){
  const [c,g]=cbCanvas(14,28),a=L.armor||'cloth',b=a==='bare'?L.skin:L.body,s=L.sub,sk=L.skin;
  const wide=a==='robe'||a==='dress';
  if(wide){cbPoly(g,[[3,2],[10,2],[13,19],[1,19]],b);cbLine(g,1,18,13,18,s,2)}else cbBox(g,3,2,8,17,b,3);
  cbBox(g,3,16,8,3,a==='bare'?s:shade(s,-10),1);
  cbBlob(g,7,22,4,4.5,L.glove||sk);
  if(a==='plate'){cbBlob(g,7,5,7,5.5,s);cbR(g,2,7,11,1,shade(s,-45))}
  return cbOutline(c);
}
/* 다리 14 x 26, 엉덩이 (7,2) */
function cbLeg(L){
  const [c,g]=cbCanvas(16,26),pn=L.pants||'#333333',bt=L.boots||'#222222';
  cbBox(g,3,1,9,14,pn,2);cbBox(g,2,13,10,11,bt,2);cbBox(g,8,19,6,5,bt,2);cbR(g,2,13,10,1,shade(bt,50));cbR(g,2,23,12,1,shade(bt,-60));
  return cbOutline(c);
}
/* 망토 34 x 50, 어깨 (17,2) */
function cbCape(L){
  if(!L.cape)return null;const [c,g]=cbCanvas(34,50),cp=L.cape;
  cbPoly(g,[[9,1],[25,1],[31,46],[3,46]],cp);for(let i=0;i<4;i++)cbLine(g,12+i*4,4,8+i*6,45,shade(cp,-36));cbLine(g,4,45,30,45,shade(cp,40),2);
  return cbOutline(c);
}
/* ---------- 무기 (칼날이 아래 · 손잡이 기준점 g) ---------- */
function cbWeapon(L,st){
  const w=L.weapon,met=st.metal,wd=st.wood,M=cramp(met);let c,g,gx,gy,tip;
  const mk=(W,H,x,y)=>{[c,g]=cbCanvas(W,H);gx=x;gy=y};
  const blade=(x0,y0,x1,y1,wid)=>{cbLine(g,x0,y0,x1,y1,M[2],wid);cbLine(g,x0-(wid>2?1:0),y0,x1-(wid>2?1:0),y1,M[4],1)};
  switch(w){
    case'glaive':mk(22,100,11,28);cbLine(g,11,0,11,76,wd,2);cbR(g,9,74,5,3,'#d4af37');
      cbPoly(g,[[10,76],[14,76],[20,88],[14,99],[12,92]],M[2]);cbLine(g,15,78,19,90,M[4]);cbR(g,6,72,4,4,'#2f7d3b');tip=70;break;
    case'spear':case'snake':mk(14,98,7,28);cbLine(g,7,0,7,80,w==='snake'?'#2a2a2a':wd,2);cbR(g,4,78,7,3,'#c02020');
      if(w==='snake'){for(let i=0;i<16;i++)cbR(g,6+Math.round(Math.sin(i*.9)*2),81+i,3,1,M[i%3?2:4])}else{cbPoly(g,[[4,81],[10,81],[7,97]],M[2]);cbLine(g,6,83,7,94,M[4])}tip=68;break;
    case'halberd':mk(28,104,13,30);cbLine(g,13,0,13,82,'#4a1010',2);cbPoly(g,[[11,82],[16,82],[14,103]],M[2]);
      cbPoly(g,[[15,84],[26,78],[24,92],[15,90]],M[2]);cbPoly(g,[[12,84],[2,80],[4,90],[12,90]],M[1]);cbR(g,10,80,7,3,'#e0c040');tip=72;break;
    case'sword':mk(12,44,6,8);cbR(g,5,0,3,8,'#6b3b12');cbR(g,1,8,11,2,'#d4af37');blade(6,10,6,42,3);tip=34;break;
    case'dao':mk(16,44,6,8);cbR(g,5,0,3,8,'#6b3b12');cbR(g,1,8,11,2,'#d4af37');cbPoly(g,[[4,10],[9,10],[13,34],[8,43],[4,30]],M[2]);cbLine(g,9,12,12,33,M[4]);tip=34;break;
    case'bigdao':mk(22,86,10,24);cbLine(g,10,0,10,58,wd,2);cbR(g,8,56,5,3,'#c02020');cbPoly(g,[[8,58],[13,58],[20,74],[12,85],[8,70]],M[2]);cbLine(g,14,60,19,74,M[4]);tip=60;break;
    case'fan':mk(28,34,14,4);cbR(g,13,0,3,10,'#6b4a2a');for(let i=0;i<9;i++){const a=(i-4)*.2;cbLine(g,14,10,14+Math.sin(a)*14,10+Math.cos(a)*22,i%2?'#f4f2ea':'#dcd8cc',2)}tip=28;break;
    case'staff':mk(18,84,9,26);cbLine(g,9,0,9,70,wd,2);cbBlob(g,9,76,7,7,'#e0c040',(nx,ny)=>nx*nx+ny*ny>.3);cbBlob(g,9,76,2,2,'#ffe28a');tip=56;break;
    case'mace':mk(18,46,9,10);cbLine(g,9,0,9,30,'#4a3018',2);cbBlob(g,9,37,8,8,'#4a4a4a');for(let i=0;i<6;i++){const a=i/6*Math.PI*2;cbP(g,9+Math.cos(a)*9,37+Math.sin(a)*9,'#aaaaaa')}tip=34;break;
    case'bow':mk(16,64,4,32);for(let i=0;i<=40;i++){const t=i/40,a=(t-.5)*2.4;cbR(g,4+Math.cos(a)*9,32+Math.sin(a)*28,2,2,i%8<4?wd:'#d4af37')}cbLine(g,13,6,13,58,'#e8e8e8');tip=24;break;
    case'axe':mk(30,80,10,20);cbLine(g,10,0,10,74,wd,2);cbPoly(g,[[11,52],[26,46],[29,62],[26,76],[11,70]],M[2]);cbLine(g,26,48,28,74,M[4]);cbR(g,8,50,5,3,'#c02020');tip=58;break;
    case'whip':mk(26,90,6,8);cbR(g,4,0,4,12,'#5a3018');cbR(g,3,11,6,2,'#d4af37');for(let i=0;i<24;i++){const t=i/24,x=6+Math.sin(t*5)*8*t,y=14+i*3;cbBlob(g,x,y,2,1.6,i%2?M[2]:M[1]);if(i%6===5)cbBlob(g,x,y,2.5,2.5,'#e0c040')}tip=80;break;
    default:mk(12,44,6,8);cbR(g,5,0,3,8,'#6b3b12');blade(6,10,6,42,3);tip=34;
  }
  cbOutline(c);return{c,gx,gy,tip};
}
/* ---------- 조립 캐시 ---------- */
const CB_CACHE=new Map();
function cbParts(L){
  const k=[L.skin,L.hair,L.body,L.sub,L.pants,L.boots,L.hat,L.beard,L.weapon,L.armor,L.cape,L.face,L.dual,L.metal,L.wood,L.glove,L.belt,L.helmc,L.fanc,L.hs,L.eye].join('|');
  let P=CB_CACHE.get(k);if(P)return P;
  const st=cbStyle(L);
  P={head:cbHead(L,st),back:cbBackHair(L,st),torso:cbTorso(L),skirt:cbSkirt(L),armF:cbArm(L,true),armB:cbArm(L,false),leg:cbLeg(L),cape:cbCape(L),wpn:cbWeapon(L,st)};
  if(CB_CACHE.size>220)CB_CACHE.clear();CB_CACHE.set(k,P);return P;
}
const CB_OC=mkC(2,2);
/* 기존 renderModel 과 같은 인자 · 반환값 (무기 끝 좌표) */
function renderChibi(g,L,pose,sx,sy,scale,facing,opt){
  opt=opt||{};const P=cbParts(L),k=scale*(L.scale||1)*1.1,ps=pose||{};
  const BW=200,BH=230,ox=100,oy=196;             // 조립 캔버스 (도트 px)
  const pw=Math.ceil(BW*k*PR),ph=Math.ceil(BH*k*PR);
  if(CB_OC.width<pw||CB_OC.height<ph){CB_OC.width=Math.max(CB_OC.width,pw);CB_OC.height=Math.max(CB_OC.height,ph)}
  const o=CB_OC.getContext('2d');o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,pw,ph);o.imageSmoothingEnabled=false;
  const s=k*PR,f=facing<0?-1:1,sp=Math.cos(ps.spin||0);
  o.setTransform(s*f*(Math.abs(sp)<.15?.15*Math.sign(sp||1):sp),0,0,s,(ox*k*PR),(oy*k*PR));
  if(ps.lie){o.translate(0,-10);o.rotate(-Math.PI/2)}
  o.translate(0,-(ps.bob||0)*1.6);
  const part=(img,px,py,ax,ay,rot)=>{if(!img)return;o.save();o.translate(px,py);if(rot)o.rotate(rot);o.drawImage(img,-ax,-ay);o.restore()};
  const lean=(ps.lean||0)*.9,hip=[0,-22];
  // 몸통 기준 좌표계 (엉덩이 기준 기울기)
  const rot=(x,y)=>{const c=Math.cos(lean),n=Math.sin(lean),dx=x-hip[0],dy=y-hip[1];return[hip[0]+dx*c-dy*n,hip[1]+dx*n+dy*c]};
  const neck=rot(0,-46),shF=rot(4,-42),shB=rot(-4,-42),capeP=rot(-4,-43);
  const aF=(ps.armL!=null?ps.armL:-.35)+lean,aB=(ps.armR!=null?ps.armR:.1)+lean,wA=(ps.wAng!=null?ps.wAng:-2.5)+lean,ext=(ps.ext||0)*1.7;
  const armDir=a=>[-Math.sin(a),Math.cos(a)];
  const dF=armDir(aF),hand=[shF[0]+dF[0]*(20+ext),shF[1]+dF[1]*(20+ext)];
  // 망토 · 뒷머리 · 뒷팔
  part(P.cape,capeP[0],capeP[1],17,2,(ps.cape||.12)*.9+lean);
  const hRot=lean+(ps.head||0)*.8,hPos=neck;
  part(P.back,hPos[0],hPos[1],HC.nx,HC.ny,hRot);
  const dB=armDir(aB);part(P.armB,shB[0],shB[1],7,3,aB+(lean*0));
  if(L.dual){const w2=(ps.wAng2!=null?ps.wAng2+lean:aB-1.3),hb=[shB[0]+dB[0]*20,shB[1]+dB[1]*20];part(P.wpn.c,hb[0],hb[1],P.wpn.gx,P.wpn.gy,w2)}
  // 다리
  part(P.leg,-3,-22,7,2,ps.legR||0);part(P.leg,3,-22,7,2,ps.legL||0);
  part(P.skirt,hip[0],hip[1]-1,20,1,lean*.5);
  part(P.torso,neck[0],neck[1],17,2,lean);
  part(P.head,hPos[0],hPos[1],HC.nx,HC.ny,hRot);
  // 무기 · 앞팔
  part(P.wpn.c,hand[0],hand[1],P.wpn.gx,P.wpn.gy,wA);
  part(P.armF,shF[0],shF[1],7,3,aF);
  o.setTransform(1,0,0,1,0,0);
  if(opt.flash||opt.tint){o.globalCompositeOperation='source-atop';o.fillStyle=opt.flash?'rgba(255,255,255,.75)':opt.tint;o.fillRect(0,0,pw,ph);o.globalCompositeOperation='source-over'}
  g.drawImage(CB_OC,0,0,pw,ph,sx-ox*k,sy-oy*k,BW*k,BH*k);
  // 무기 끝 좌표 (궤적 · 이펙트용)
  const wd=armDir(wA),mapP=(x,y)=>{let X=x*f*sp,Y=y-(ps.bob||0)*1.6;if(ps.lie){const t=X;X=Y;Y=-t-10}return[sx+X*k,sy+Y*k]};
  const t1=mapP(hand[0]+wd[0]*P.wpn.tip,hand[1]+wd[1]*P.wpn.tip),t2=mapP(hand[0]+wd[0]*P.wpn.tip*.45,hand[1]+wd[1]*P.wpn.tip*.45);
  return{tx:t1[0],ty:t1[1],mx:t2[0],my:t2[1]};
}
/* 모든 캐릭터 그리기를 SD 도트로 전환 (기존 3D 는 renderModel3D 로 보존) */
const renderModel3D=renderModel;
renderModel=function(g,L,pose,sx,sy,scale,facing,opt){return renderChibi(g,L,pose,sx,sy,scale,facing,opt)};
renderModelOutlined=function(g,L,pose,sx,sy,scale,facing,opt){return renderChibi(g,L,pose,sx,sy,scale,facing,opt)};
