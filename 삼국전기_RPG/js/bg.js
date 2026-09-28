'use strict';
/* ===== 2D 도트(픽셀아트) 배경 — 320x180 저해상도로 그린 뒤 3배 확대 =====
   레이어는 가로 640px 타일(주기 함수)로 미리 렌더링하고 패럴랙스로 스크롤 */
const LW=320,LH=180,TW=640,GY=105;
const BGR=3;/* 배경 세밀화 배율: 정적 레이어는 3배 해상도로 미리 다듬는다 */
const bgc=mkC(LW*BGR,LH*BGR),bgx=bgc.getContext('2d');
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const bay=(x,y)=>(BAYER[(y&3)*4+(x&3)]+.5)/16;
let BG=null;
function hexRGB(h){const c=parseInt(h.slice(1),16);return[c>>16,(c>>8)&255,c&255]}
function pr(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h)}
function wrapX(fn,x){fn(x);if(x<60)fn(x+TW);if(x>TW-60)fn(x-TW)}
const per=(x,k,s)=>Math.sin(x/TW*Math.PI*2*k+s);

function skyImg(stops,h){
  h=h||GY+8;const c=mkC(LW,h,true),g=c.getContext('2d'),id=g.createImageData(LW,h),cs=stops.map(hexRGB),n=cs.length-1;
  for(let y=0;y<h;y++){const f=y/(h-1)*n,i=Math.min(n-1,f|0),fr=f-i;
    for(let x=0;x<LW;x++){const col=cs[fr>bay(x,y)?i+1:i],o=(y*LW+x)*4;id.data[o]=col[0];id.data[o+1]=col[1];id.data[o+2]=col[2];id.data[o+3]=255}}
  g.putImageData(id,0,0);return c;
}
function stars(g,n,hmax,seed){for(let i=0;i<n;i++){const x=(hash(i*3+seed)*LW)|0,y=(hash(i*7+seed)*hmax)|0,b=hash(i*11+seed);
  pr(g,x,y,1,1,b>.8?'#ffffff':b>.5?'#c8d0f0':'#7880b0');if(b>.93){pr(g,x-1,y,1,1,'#8890c0');pr(g,x+1,y,1,1,'#8890c0');pr(g,x,y-1,1,1,'#8890c0');pr(g,x,y+1,1,1,'#8890c0')}}}
function pixSun(g,cx,cy,r,col,halo){for(let y=-r-4;y<=r+4;y++)for(let x=-r-4;x<=r+4;x++){const d=Math.hypot(x,y);
  if(d<=r)pr(g,cx+x,cy+y,1,1,col);else if(d<=r+4&&bay(cx+x,cy+y)>(d-r)/4)pr(g,cx+x,cy+y,1,1,halo)}}

/* 산 능선 레이어 */
function mtn(h,o){
  const c=mkC(TW,h,true),g=c.getContext('2d');
  const top=x=>{let v=0;for(let i=0;i<o.ks.length;i++)v+=per(x,o.ks[i],o.seed*(i+1)*1.7)*o.as[i];return Math.round(o.base-(v*.5+.5)*o.amp)};
  for(let x=0;x<TW;x++){
    const t0=top(x),t1=top(x+1),shadow=t1>t0;
    pr(g,x,t0,1,h-t0,o.col);
    pr(g,x,t0,1,1,o.hi);
    if(shadow){for(let y=t0+1;y<Math.min(h,t0+16);y++)if((x+y)%2===0)pr(g,x,y,1,1,o.dark)}
    else if(hash(x)<.5)pr(g,x,t0+1,1,1,o.hi);
    if(o.snow&&t0<o.base-o.amp*.6){const sd=2+(hash(x*3)*4|0);pr(g,x,t0,1,sd,'#eef2f6');if(shadow)pr(g,x,t0+1,1,sd-1,'#b8c6d8')}
    if(o.strata)for(let y=t0+4;y<h;y+=5)pr(g,x,y+Math.round(per(x,9,y)*1.2),1,1,o.dark);
    for(let y=t0+3;y<h;y++)if(hash(x*13+y*7+o.seed)<.05)pr(g,x,y,1,1,o.dark);
    if(o.fade)for(let y=h-o.fade;y<h;y++)if((y-(h-o.fade))/o.fade>bay(x,y))pr(g,x,y,1,1,o.fadeCol);
  }
  if(o.tree)for(let i=0;i<o.treeN;i++){const x=(hash(i*7.3+o.seed)*TW)|0;wrapX(xx=>o.tree(g,xx,top(x)+3+(hash(i)*6|0)),x)}
  return{img:c,top};
}
/* 픽셀 스프라이트 */
function pine(g,x,y,h,col,dark,hi){
  pr(g,x,y-3,1,3,'#3a2818');
  const tiers=3,th=Math.max(3,Math.floor((h-3)/tiers));
  for(let r=0;r<h-3;r++){const tier=Math.floor(r/th),within=r%th,w=Math.max(0,Math.floor((th-within)*.8)+(tiers-1-tier));
    const yy=y-3-r;pr(g,x-w,yy,w*2+1,1,col);pr(g,x-w,yy,1,1,hi);pr(g,x+w,yy,1,1,dark);if(w>1&&(r%2))pr(g,x+w-1,yy,1,1,dark)}
}
function blobTree(g,x,y,r,col,hi,dark,trunk){
  pr(g,x-1,y-r,2,r,trunk||'#4a3524');
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const d=Math.hypot(dx,dy*1.15);if(d>r+hash(dx*3+dy*7+x)*1.5)continue;
    const cy=y-r*1.6+dy;let col2=col;if(dx+dy<-r*.5)col2=hi;else if(dx+dy>r*.6)col2=dark;if(hash(dx*5+dy*9+x)<.12)col2=dark;pr(g,x+dx,cy,1,1,col2)}
}
function peachTree(g,x,y){
  pr(g,x,y-12,2,12,'#5a3a24');pr(g,x-3,y-10,3,1,'#5a3a24');pr(g,x+2,y-13,3,1,'#5a3a24');
  for(let i=0;i<70;i++){const a=hash(i*3+x)*Math.PI*2,rr=hash(i*5+x)*9;const px=x+Math.cos(a)*rr*1.3,py=y-18+Math.sin(a)*rr*.8;
    pr(g,px,py,1,1,hash(i+x)<.2?'#ffffff':hash(i*2+x)<.5?'#f4a2c0':'#e27aa0')}
}
function house(g,x,y,wall,roof){
  pr(g,x-15,y-12,30,12,wall);pr(g,x-15,y-12,30,1,'#4a3020');pr(g,x-15,y-12,1,12,'#4a3020');pr(g,x+14,y-12,1,12,'#4a3020');pr(g,x-1,y-12,1,12,'#4a3020');
  pr(g,x+3,y-7,4,7,'#2a1a10');pr(g,x+3,y-7,4,1,'#5a3a20');
  pr(g,x-11,y-9,6,4,'#3a2818');for(let i=0;i<3;i++)pr(g,x-10+i*2,y-9,1,4,'#c8a870');
  for(let r=0;r<9;r++){const w=19-Math.floor(r*1.2);pr(g,x-w,y-13-r,w*2,1,r%2?shade(roof,-18):roof)}
  pr(g,x-20,y-14,2,1,roof);pr(g,x+18,y-14,2,1,roof);pr(g,x-21,y-15,1,1,roof);pr(g,x+20,y-15,1,1,roof);
  pr(g,x-9,y-22,18,1,shade(roof,-35));pr(g,x-10,y-23,2,1,'#d4af37');pr(g,x+8,y-23,2,1,'#d4af37');
}
function fence(g,x0,x1,y){for(let x=x0;x<x1;x+=5){pr(g,x,y-6,1,6,'#6b4a2a');pr(g,x,y-7,1,1,'#8a6a3a')}pr(g,x0,y-5,x1-x0,1,'#7a5a32');pr(g,x0,y-2,x1-x0,1,'#7a5a32')}
function rock(g,x,y,w,h,col){for(let dy=0;dy<h;dy++){const ww=Math.round(w*Math.sqrt(1-Math.pow((h-dy)/h,2)));pr(g,x-ww,y-h+dy,ww*2,1,dy<2?shade(col,30):col);pr(g,x+ww-1,y-h+dy,1,1,shade(col,-30))}}
function bannerFlag(g,x,y,col,t,ph){pr(g,x,y-22,1,22,'#3a2a1a');for(let i=0;i<9;i++){const off=Math.round(Math.sin(t*.12+i*.7+ph)*1.2);pr(g,x+1+i,y-21+off,1,7,i%3===0?shade(col,-25):col)}pr(g,x+3,y-19+Math.round(Math.sin(t*.12+2+ph)),3,3,'#f0e0a0')}
function tent(g,x,y,col){for(let r=0;r<18;r++){const w=Math.floor(r*1.1);pr(g,x-w,y-18+r,w*2+1,1,r%4===0?shade(col,-20):col);pr(g,x+w,y-18+r,1,1,shade(col,-40))}
  for(let r=8;r<18;r++){const w=Math.floor((r-8)*.4);pr(g,x-w,y-18+r,w*2+1,1,'#2a2418')}pr(g,x,y-21,1,3,'#3a2a1a')}
function ship(g,x,y){
  for(let r=0;r<8;r++){const w=34-r*2;pr(g,x-w,y+r,w*2,1,r===0?'#6a4a2a':r%2?'#3a2414':'#4a2e18')}
  pr(g,x-38,y-3,6,3,'#4a2e18');pr(g,x+32,y-4,6,4,'#4a2e18');
  pr(g,x-2,y-40,2,40,'#2a1a10');
  for(let r=0;r<26;r++){pr(g,x-18,y-38+r,34,1,r%6===0?'#8a7a5a':'#c8b890')}
  for(let r=0;r<26;r+=6)pr(g,x-19,y-38+r,36,1,'#5a4a30');
  pr(g,x,y-45,8,4,'#c02020');
}
function wallBricks(g,x0,x1,y0,y1,base){
  for(let y=y0;y<y1;y++){const row=Math.floor((y-y0)/4),off=(row%2)*4;
    for(let x=x0;x<x1;x++){let c=shade(base,Math.round((hash(Math.floor((x+off)/8)*7+row*13)-.5)*22));
      if((y-y0)%4===0||(x+off)%8===0)c=shade(base,-35);else if((y-y0)%4===1&&(x+off)%8===1)c=shade(base,20);pr(g,x,y,1,1,c)}}
}

/* 바닥 타일 */
function groundTile(kind){
  const h=LH-GY,c=mkC(TW,h,true),g=c.getContext('2d');
  const noise=(pal,seed)=>{for(let y=0;y<h;y++)for(let x=0;x<TW;x++)pr(g,x,y,1,1,pal[(hash(x*7+y*131+seed)*pal.length)|0])};
  switch(kind){
    case'dirt':case'grass':{
      noise(kind==='dirt'?['#b08a55','#a47e4b','#9a7444','#b8945e']:['#8a9a52','#7e8e48','#96a45c','#a8905e'],1);
      for(let x=0;x<TW;x++){const gh=3+((hash(x*3)*3)|0);pr(g,x,0,1,gh,x%3?'#6f9a4a':'#5d8a3e');if(hash(x)<.3)pr(g,x,gh,1,1,'#4f7a36')}
      for(const ry of[24,40])for(let x=0;x<TW;x++){const yy=ry+Math.round(per(x,3,ry));pr(g,x,yy,1,1,kind==='dirt'?'#8a6a3a':'#6a7a3a');if(hash(x+ry)<.4)pr(g,x,yy+1,1,1,'#b89a68')}
      for(let i=0;i<90;i++){const x=(hash(i*3.1)*TW)|0,y=6+(hash(i*5.7)*(h-8))|0;
        if(hash(i*9)<.55){pr(g,x,y,1,1,'#5d8a3e');pr(g,x-1,y-1,1,1,'#7fb050');pr(g,x+1,y-1,1,1,'#7fb050');pr(g,x,y-2,1,1,'#6f9a4a')}
        else{pr(g,x,y,2,1,'#8a8478');pr(g,x,y-1,2,1,'#b0aa9c')}}
      break}
    case'stone':{let y=0,rh=4,row=0;
      while(y<h){const bw=rh*3+2,off=(row%2)*(bw>>1);
        for(let yy=y;yy<Math.min(h,y+rh);yy++)for(let x=0;x<TW;x++){const bi=Math.floor((x+off)/bw);let col=shade('#857b72',Math.round((hash(bi*7+row*31)-.5)*26));
          if(yy===y||(x+off)%bw===0)col='#524a44';else if(yy===y+1&&(x+off)%bw===1)col=shade(col,25);else if(hash(x*3+yy*7)<.05)col=shade(col,-18);pr(g,x,yy,1,1,col)}
        y+=rh;rh++;row++}
      break}
    case'deck':{let y=0,rh=4,row=0;
      while(y<h){for(let yy=y;yy<Math.min(h,y+rh);yy++)for(let x=0;x<TW;x++){let col=row%2?'#7a5230':'#6b4628';if(hash(x*.2|0+row*17)<.3&&hash(x+yy*3)<.4)col=shade(col,-15);if(yy===y)col='#3a2414';pr(g,x,yy,1,1,col)}
        for(let i=0;i<8;i++){const sx=(hash(row*11+i)*TW)|0;pr(g,sx,y,1,rh,'#3a2414');pr(g,sx+2,y+1,1,1,'#b0a090');pr(g,sx+2,y+rh-2,1,1,'#b0a090')}
        y+=rh;rh++;row++}
      break}
    case'mud':{noise(['#6e5c46','#64523e','#5a4a38','#76644c'],3);
      for(let i=0;i<14;i++){const cx=(hash(i*3.3)*TW)|0,cy=10+(hash(i*7.1)*(h-16))|0,rw=6+(hash(i)*12|0);
        for(let dy=-2;dy<=2;dy++)for(let dx=-rw;dx<=rw;dx++)if(dx*dx/(rw*rw)+dy*dy/6<1)pr(g,cx+dx,cy+dy,1,1,dy<0?'#8a9aa8':'#5a6a78')}
      for(let i=0;i<60;i++){const x=(hash(i*4.4)*TW)|0,y=(hash(i*2.2)*h)|0;pr(g,x,y,1,1,'#3e5a36');pr(g,x+1,y-1,1,1,'#4e6a44')}
      break}
    case'nightgrass':{noise(['#2a3230','#26302c','#303a34','#222a28'],4);
      for(let i=0;i<140;i++){const x=(hash(i*3.7)*TW)|0,y=(hash(i*1.9)*h)|0;pr(g,x,y,1,1,'#44584a');pr(g,x-1,y-1,1,1,'#3a4c40');if(hash(i)<.1)pr(g,x,y-2,1,1,'#b08ad0')}
      break}
  }
  for(let y=0;y<4;y++)for(let x=0;x<TW;x++)if(bay(x,y)>y/4)pr(g,x,y,1,1,'rgba(0,0,0,.18)');
  return c;
}

/* 스테이지별 구성 */
function buildBG(kind){
  BG={kind,layers:[],ground:null,sky:null,post:null};
  const L=(img,par,y,extra)=>BG.layers.push(Object.assign({img,par,y:y||0},extra||{}));
  const clouds=(col,hi,sh,seed)=>{const c=mkC(TW,50,true),g=c.getContext('2d');
    for(let i=0;i<9;i++){const cx=(hash(i*5+seed)*TW)|0,cy=10+(hash(i*9+seed)*25)|0,w=14+(hash(i)*20|0);
      wrapX(x=>{for(let k=0;k<5;k++){const bx=x-w/2+k*w/4,r=4+hash(i*3+k)*5;for(let dy=-r;dy<=r;dy++)for(let dx=-r*1.4;dx<=r*1.4;dx++)if(dx*dx/(1.96)+dy*dy<=r*r)pr(g,bx+dx,cy+dy,1,1,dy>r*.4?sh:dy<-r*.4?hi:col)}},cx)}
    return c};
  switch(kind){
    case'plains':{
      BG.sky=skyImg(['#2e5fa8','#4a7fc4','#79a6d8','#a9c8e2','#e2d8c0','#f4cc98']);pixSun(BG.sky.getContext('2d'),250,30,9,'#fff6d0','#ffe8a0');
      L(clouds('#ffffff','#ffffff','#d8e2ee',1),.03,6,{drift:.05});
      L(mtn(112,{ks:[1,3,7],as:[.5,.3,.2],base:86,amp:48,col:'#7f95b8',hi:'#a9bdd8',dark:'#6c80a4',snow:true,seed:1}).img,.06);
      L(mtn(112,{ks:[2,5,9],as:[.5,.3,.2],base:100,amp:24,col:'#5e8c56',hi:'#86b270',dark:'#4c7446',seed:3,tree:(g,x,y)=>pine(g,x,y,10,'#3f6a3a','#2e5030','#5a8a4a'),treeN:40}).img,.15);
      {const c=mkC(TW,112,true),g=c.getContext('2d');
        for(let i=0;i<8;i++){const x=40+i*80;if(i%3===0)house(g,x,108,'#e8dcc0','#5a3a2a');else if(i%3===1)peachTree(g,x,108);else{blobTree(g,x,108,8,'#4f8a3f','#6fae52','#3a6a30');fence(g,x+12,x+60,108)}}
        L(c,.4)}
      BG.ground=groundTile('dirt');break}
    case'fortress':{
      BG.sky=skyImg(['#140a26','#2e1638','#5a2240','#9a3040','#d65a3a','#f08c48']);
      {const g=BG.sky.getContext('2d');pixSun(g,64,70,15,'#ff9a60','#e0703a');for(let y=58;y<86;y+=5)pr(g,48,y,34,1,'#c0503a')}
      L(mtn(112,{ks:[1,2,6],as:[.5,.35,.15],base:92,amp:52,col:'#2e1c30',hi:'#4a2a40',dark:'#22142a',seed:2}).img,.06);
      {const c=mkC(TW,112,true),g=c.getContext('2d');
        wallBricks(g,0,TW,46,112,'#6e6660');
        for(let x=0;x<TW;x+=10){pr(g,x,38,6,8,'#6e6660');pr(g,x,38,6,1,'#8a827a');pr(g,x+5,38,1,8,'#4a423c')}
        pr(g,0,45,TW,1,'#4a423c');
        for(const tx of[110,430]){
          wallBricks(g,tx-34,tx+34,22,112,'#5e5650');
          pr(g,tx-16,78,32,34,'#140e0c');for(let r=0;r<16;r++){const w=Math.round(Math.sqrt(256-(r-16)*(r-16)));pr(g,tx-w,78-16+r,w*2,1,'#140e0c')}
          for(let r=0;r<34;r++)pr(g,tx-16,78+r-16,1,1,'#3a322c');
          for(let tier=0;tier<2;tier++){const by=22-tier*16,ww=46-tier*12;for(let r=0;r<7;r++)pr(g,tx-ww+r,by-r,(ww-r)*2,1,r%2?'#5a1e14':'#7a2a1a');pr(g,tx-ww-3,by+1,4,1,'#7a2a1a');pr(g,tx+ww-1,by+1,4,1,'#7a2a1a');
            pr(g,tx-ww+6,by+1,(ww-6)*2,8,'#3a2a24');for(let k=-ww+8;k<ww-6;k+=6)pr(g,tx+k,by+2,2,6,'#c04a2a')}
          pr(g,tx-14,50,28,9,'#1a1410');pr(g,tx-13,51,26,7,'#3a2a14');
          g.font='bold 7px serif';g.fillStyle='#e8c060';g.textAlign='center';g.textBaseline='middle';g.fillText('虎牢關',tx,55);
        }
        L(c,.4,0,{objs:[40,70,190,230,300,360,520,560,610].map(x=>({x,y:38})),anim:(g,off,t,Ly)=>{for(const o of Ly.objs){const sx=((o.x-off)%TW+TW)%TW;if(sx<LW+20)bannerFlag(g,sx,o.y+Ly.y,'#b01818',t,o.x)}}})}
      BG.ground=groundTile('stone');
      BG.post=(g,t)=>{for(let i=0;i<40;i++){const x=((hash(i)*LW*1.3+t*.2*(1+hash(i*3)))%LW),y=GY+10-((t*.5*(0.5+hash(i*5))+hash(i*7)*120)%130);pr(g,x,y,1,1,(t+i)%20<10?'#ffb040':'#ff6020')}};
      break}
    case'bridge':{
      BG.sky=skyImg(['#5d7890','#7d97ab','#a6b8c4','#cdd6d6','#e2e4dc']);
      L(clouds('#e8ecef','#f8fafa','#b8c2ca',4),.03,4,{drift:.03});
      L(mtn(112,{ks:[1,3,5],as:[.5,.3,.2],base:84,amp:44,col:'#7a968f',hi:'#98b2a8',dark:'#66827a',seed:5}).img,.06);
      L(mtn(112,{ks:[2,4,11],as:[.5,.35,.15],base:92,amp:26,col:'#4f744f',hi:'#6a946a',dark:'#3e5e40',seed:6,tree:(g,x,y)=>pine(g,x,y,12,'#2e5030','#1e3a22','#48764a'),treeN:50}).img,.15);
      {const c=mkC(TW,112,true),g=c.getContext('2d');
        pr(g,0,80,TW,6,'#5a7a44');for(let x=0;x<TW;x++)if(hash(x)<.4)pr(g,x,79,1,1,'#6a8a50');
        for(let y=86;y<104;y++)for(let x=0;x<TW;x++)pr(g,x,y,1,1,(y+Math.floor(x/7))%5===0?'#4a78a2':'#3a6690');
        pr(g,0,104,TW,8,'#6a8a4a');for(let x=0;x<TW;x++)pr(g,x,104,1,1,hash(x*2)<.5?'#8aa860':'#5a7a3a');
        const bx=300;for(let x=bx-80;x<bx+80;x++){const arc=Math.round(Math.sin((x-bx+80)/160*Math.PI)*8);pr(g,x,86-arc,1,3,'#7a5230');pr(g,x,85-arc,1,1,'#9a7248');if((x-bx)%10===0){pr(g,x,76-arc,1,10,'#5a3a20');pr(g,x,89-arc,1,15+arc,'#4a2e18')}}
        for(let x=bx-80;x<bx+80;x++){const arc=Math.round(Math.sin((x-bx+80)/160*Math.PI)*8);pr(g,x,77-arc,1,1,'#6a4424')}
        g.font='bold 7px serif';g.fillStyle='#3a2a14';g.textAlign='center';g.fillText('長坂橋',bx,62);
        for(const wx of[80,160,480,560]){pr(g,wx,68,3,14,'#4a3524');for(let i=0;i<20;i++){const sx=wx-10+i,len=8+(hash(i+wx)*12|0);for(let k=0;k<len;k++)pr(g,sx,58+k+Math.abs(i-10)*.4,1,1,k%3?'#6a9a4a':'#8aba5a')}}
        L(c,.35,0,{anim:(g,off,t)=>{for(let i=0;i<50;i++){const x=((hash(i)*TW+t*.3-off)%TW+TW)%TW,y=88+(hash(i+1)*14|0);if(x<LW)pr(g,x,y,3,1,(t/10+i)%3<1?'#8ab6dc':'#6a9ac4')}}})}
      BG.ground=groundTile('grass');break}
    case'redcliff':{
      BG.sky=skyImg(['#03040e','#070c22','#10163a','#261a44','#4a1c3a','#7a2a2a']);
      {const g=BG.sky.getContext('2d');stars(g,90,60,7);pixSun(g,56,22,8,'#f4ecd0','#8a8aa0');pr(g,53,19,2,2,'#d8d0b4');pr(g,58,24,3,2,'#d8d0b4')}
      {const m=mtn(112,{ks:[1,2,5],as:[.55,.3,.15],base:102,amp:72,col:'#7a2a1c',hi:'#c0502c',dark:'#4a140c',seed:8,strata:true});
        const g=m.img.getContext('2d');g.font='bold 13px serif';g.fillStyle='#e8906a';g.textAlign='center';g.fillText('赤壁',150,70);g.fillText('赤壁',470,74);L(m.img,.08)}
      {const c=mkC(TW,112,true),g=c.getContext('2d');
        for(let y=74;y<112;y++)for(let x=0;x<TW;x++)pr(g,x,y,1,1,(y-74)/38>bay(x,y)?'#0c1630':'#142244');
        const ships=[70,250,420,580];for(const sx of ships)ship(g,sx,80);
        L(c,.3,0,{objs:ships.map(x=>({x,y:80})),anim:(g,off,t,Ly)=>{
          for(const o of Ly.objs){const sx=((o.x-off)%TW+TW)%TW;if(sx>LW+50&&sx<TW-50)continue;
            for(const ox of[sx,sx-TW]){if(ox<-50||ox>LW+50)continue;
              for(let k=0;k<22;k++){const fx=ox-20+k*2,fh=10+Math.round((Math.sin(t*.3+k*1.7+o.x)*.5+.5)*20);
                for(let y=0;y<fh;y++){const f=y/fh;pr(g,fx,o.y-30-y+10,2,1,f<.25?'#fff0a0':f<.5?'#ffb030':f<.8?'#ff5a10':'#a01a08')}}
              for(let i=0;i<18;i++){const rx=ox-30+hash(i+o.x)*60,ry=o.y+10+(i%6)*4;if((t+i*3)%12<7)pr(g,rx,ry,3,1,'#ff7a30')}}}}})}
      BG.ground=groundTile('deck');
      BG.post=(g,t)=>{for(let i=0;i<60;i++){const x=((hash(i)*LW*1.4+t*.4*(0.5+hash(i*3)))%LW),y=LH-((t*.6*(0.5+hash(i*5))+hash(i*7)*200)%200);pr(g,x,y,1,1,(t+i)%16<8?'#ffc050':'#ff6020')}};
      break}
    case'pass':{
      BG.sky=skyImg(['#2a3038','#3e4650','#566068','#707a80','#8a9298']);
      L(clouds('#5a6068','#6a7078','#464c54',9),.03,2,{drift:.12});
      L(mtn(112,{ks:[2,5,11],as:[.5,.3,.2],base:84,amp:78,col:'#4d5c56',hi:'#6a7a72',dark:'#3a4842',seed:9,tree:(g,x,y)=>pine(g,x,y,9,'#2a3a30','#1e2a22','#3e5244'),treeN:30}).img,.08);
      L(mtn(112,{ks:[3,7,13],as:[.5,.3,.2],base:106,amp:58,col:'#33423a',hi:'#4a5c50',dark:'#26322c',seed:10,tree:(g,x,y)=>pine(g,x,y,14,'#1e2e24','#142018','#2e4434'),treeN:60}).img,.22);
      {const c=mkC(TW,112,true),g=c.getContext('2d');
        for(let i=0;i<10;i++){const x=(hash(i*3.3)*TW)|0;rock(g,x,110,6+(hash(i)*8|0),5+(hash(i*2)*6|0),'#4a4a44')}
        pr(g,300,70,9,40,'#d8ccb0');pr(g,300,70,9,1,'#f0e4c8');pr(g,308,70,1,40,'#9a8e72');
        g.font='bold 7px serif';g.fillStyle='#2a2018';g.textAlign='center';g.fillText('華',305,78);g.fillText('容',305,87);g.fillText('道',305,96);
        L(c,.55)}
      BG.ground=groundTile('mud');
      BG.post=(g,t)=>{g.globalAlpha=.22;for(let b=0;b<3;b++){const y=60+b*18,off=(t*(.2+b*.1))%LW;for(let x=-LW;x<LW*2;x+=4)if(((x+b*7)>>3)%3)pr(g,x-off,y+Math.round(per(x,2,b)*3),4,6,'#c8d0d8')}g.globalAlpha=1;
        const lt=t%420;if(lt<6&&lt%2===0){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(0,0,LW,GY)}};
      break}
    case'night':{
      BG.sky=skyImg(['#010208','#03061a','#080e2c','#121a40','#1c2250']);
      {const g=BG.sky.getContext('2d');for(let i=0;i<500;i++){const x=hash(i*1.3)*LW,y=x*.25+10+(hash(i*2.7)-.5)*36;if(hash(i*5)<.6)pr(g,x,y,1,1,hash(i)<.5?'#3a4270':'#5a6290')}stars(g,160,100,11)}
      L(mtn(112,{ks:[1,3,6],as:[.5,.3,.2],base:96,amp:30,col:'#0c1226',hi:'#1c2440',dark:'#080c1a',seed:12}).img,.06);
      {const c=mkC(TW,112,true),g=c.getContext('2d');
        for(let i=0;i<7;i++){const x=40+i*90;if(i===3)continue;tent(g,x,108,'#b8ae94');if(i%2)bannerFlag(g,x+22,108,'#2a2a7a',0,i)}
        pr(g,300,96,50,3,'#4a2e18');pr(g,302,99,2,9,'#3a2410');pr(g,344,99,2,9,'#3a2410');
        g.font='bold 7px serif';g.fillStyle='#e8d8a0';g.textAlign='center';g.fillText('七星燈',325,70);
        L(c,.35,0,{objs:[0,1,2,3,4,5,6].map(k=>({x:304+k*7,y:94-[0,4,2,7,1,5,0][k]})),anim:(g,off,t,Ly)=>{for(const o of Ly.objs){const sx=((o.x-off)%TW+TW)%TW;if(sx>LW+10)continue;const fl=Math.sin(t*.2+o.x)*.5+.5;
          for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.hypot(dx,dy);if(d<4.5&&bay(sx+dx,o.y+dy)<(1-d/4.5)*(.4+fl*.4))pr(g,sx+dx,o.y+dy,1,1,'#ffb040')}
          pr(g,sx,o.y-1,1,3,'#fff0b0');pr(g,sx-1,o.y,3,1,'#ffd070')}}})}
      BG.ground=groundTile('nightgrass');
      BG.post=(g,t)=>{const s=(t*1.5)%900;if(s<200){for(let k=0;k<14;k++)pr(g,LW-s+k,20+s*.3-k*.3,1,1,k<3?'#ffffff':'#8890c0')}
        for(let i=0;i<14;i++){const x=(hash(i)*LW+Math.sin(t*.02+i)*20+LW)%LW,y=GY-20+Math.sin(t*.03+i*2)*15;if((t+i*13)%60<40)pr(g,x,y,1,1,'#e0ff80')}};
      break}
  }
  for(const Ly of BG.layers)Ly.img3=refineCanvas(Ly.img,BGR,{grain:7,hl:12,sh:14,th:40,seed:Ly.par*1000});
  BG.ground3=refineCanvas(BG.ground,BGR,{grain:14,hl:10,sh:14,th:36,seed:7,inner:true});
}
function drawPixelBG(camX,t){
  const g=bgx,T3=TW*BGR,lo=()=>g.setTransform(BGR,0,0,BGR,0,0),hi=()=>g.setTransform(1,0,0,1,0,0);
  g.imageSmoothingEnabled=false;hi();
  g.drawImage(BG.sky,0,0,BG.sky.width*BGR,BG.sky.height*BGR);
  for(const Ly of BG.layers){
    const off=((Math.floor(camX*Ly.par+(Ly.drift?t*Ly.drift*BGR:0)))%T3+T3)%T3;
    g.drawImage(Ly.img3,-off,Ly.y*BGR);g.drawImage(Ly.img3,T3-off,Ly.y*BGR);
    if(Ly.anim){lo();Ly.anim(g,off/BGR,t,Ly);hi()}
  }
  const goff=((Math.floor(camX))%T3+T3)%T3;
  g.drawImage(BG.ground3,-goff,GY*BGR);g.drawImage(BG.ground3,T3-goff,GY*BGR);
  if(BG.post){lo();BG.post(g,t,camX);hi()}
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(bgc,0,0,W,H);
}
