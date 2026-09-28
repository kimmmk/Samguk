'use strict';
/* ===== RPG 화면: 장비 · 스킬 · 능력치 · 대장간 · 시스템 · 군영 · 상인 · 저장 슬롯 · HUD ===== */

/* 스킬 시전 포즈: 기존 모션을 빌려 쓴다 */
const _poseOf0=poseOf;
poseOf=function(e){
  if(e&&((e.state==='pskill'&&e.skPose)||(e.state==='spin'&&e.spinPose))){const st=e.state,cb=e.combo,ja=e.jatk,ps=e.state==='spin'?e.spinPose:e.skPose;
    if(ps==='attack3'){e.state='attack';e.combo=3}else{e.state=ps;if(ps==='jump')e.jatk=false}
    const r=_poseOf0(e);e.state=st;e.combo=cb;e.jatk=ja;return r}
  return _poseOf0(e);
};

/* ---------- 공통 그리기 ---------- */
const KN=[{atk:'Z',jump:'X',sp:'C',item:'V',swap:'E',menu:'Tab',dodge:'Shift',sk:['1','2','3','4']},{atk:',',jump:'.',sp:'/',item:'M',swap:';',menu:'=',dodge:'R-Shift',sk:['[',']',"'",'\\']}];
const kn=i=>G&&G.np===2?KN[i]:KN[0];
function panel(x,y,w,h,col,bg){ctx.fillStyle=bg||'rgba(14,7,3,.92)';ctx.fillRect(x,y,w,h);ctx.strokeStyle=col||'#8a6a2a';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2)}
function wrap(s,maxW,size){ctx.font=`bold ${size}px ${FONT}`;const out=[];let cur='';for(const ch of s){if(ctx.measureText(cur+ch).width>maxW&&cur){out.push(cur);cur=ch.trim()?ch:''}else cur+=ch}if(cur)out.push(cur);return out}
const fmt=v=>Math.abs(v)<10?String(Math.round(v*10)/10):String(Math.round(v));
const heroName=id=>(HEROES.find(h=>h.id===id)||{}).name||id;
function afText(k,v,e,ps){
  const A=AF[k];if(!A)return k;
  if(k.startsWith('tree')){const tr=+k[4];return `+${v} 「${ps?TREES[HEROES[ps.hero].id][tr]:'제'+(tr+1)}」 계열 스킬`}
  if(A.fix)return `+${v} ${A.n}`;
  return `${A.n} ${v<0?'':'+'}${fmt(v*(1+(e||0)*.03))}${A.u||''}`;
}
function modsText(mods){return Object.entries(mods).filter(([k])=>k!=='procs').map(([k,v])=>afText(k,v,0)).join(', ')}

/* 장비 아이콘 (32px 도트: 아이템 고유 시드로 모양 · 보석 · 문양이 달라지고, 전용 · 신화 · 세트는 이름에 맞는 문양) */
const ICON_MAT={normal:['#5e636a','#a4a9b0','#e2e6ea'],rare:['#3e5c92','#82aadc','#e0f0ff'],epic:['#5c3e88','#ac8ade','#f2e4ff'],
  set:['#30704a','#72c28a','#dcffe4'],excl:['#94601e','#e6b058','#fff0c8'],myth:['#862212','#ea6646','#ffe8c0']};
const GEM_PAL=['#e04040','#40c0ff','#50e080','#ffd040','#c060ff','#ff8a30','#ff6ab0','#e8f4ff'];
const GEAR_ART=new Map();
function itemMotif(it){const n=it.n;
  if(/청룡|靑龍|무신/.test(n))return'dragon';if(/화|火|고정|열화|반골|봉황|鳳/.test(n))return'flame';if(/빙|氷|은룡|한빙/.test(n))return'frost';
  if(/칠성|七星/.test(n))return'stars';if(/뇌|雷|천공|황천|태평/.test(n))return'bolt';if(/쌍|雙|자웅/.test(n))return'dual';if(/꽃|폐월|桃|도원/.test(n))return'petal';return null}
function gearArt(it){
  const tier=BASE_TIER.reduce((a,v,i)=>it.il>=v?i:a,0),sd=itemSeed(it),key=it.s+'|'+it.g+'|'+tier+'|'+sd;
  let c=GEAR_ART.get(key);if(c)return c;
  c=mkC(32,32,true);const g=c.getContext('2d'),[D,M,Lt]=ICON_MAT[it.g],rk=GRADES[it.g].rank;
  const rn=k=>((sd>>>(k*3))^(sd*(k+7)))&1023,pick_=(a,k)=>a[rn(k)%a.length];
  const acc=it.set&&SET_MARK[it.set]?SET_MARK[it.set][1]:rk>=1?GRADES[it.g].c:'#c83030',gem=rk>=3?acc:pick_(GEM_PAL,1),motif=itemMotif(it);
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)},P=(x,y,col)=>R(x,y,1,1,col);
  const LN=(x0,y0,x1,y1,col,w)=>{w=w||1;const n=Math.max(1,Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=n;i++)R(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),w,w,col)};
  const EL=(cx,cy,rx,ry,col,cut)=>{for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++)if(x*x/(rx*rx+.3)+y*y/(ry*ry+.3)<=1&&(!cut||cut(x,y)))P(cx+x,cy+y,col)};
  const wood=pick_(['#7a4a22','#5a3018','#8a5a2a','#3a2a1a'],2),wd='#3a2010',lea=pick_(['#8a5a30','#6a4020','#9a6a3a'],3),gold='#e0b040',wrap=pick_(['#c02020','#2040a0','#207040','#6a2a8a','#1a1a1a'],4);
  const blade=motif==='frost'?'#bfeaff':motif==='flame'?mixCol(M,'#ff7a2a',.35):M,bladeL=motif==='frost'?'#ffffff':Lt;
  switch(it.s){
    case'weapon':{const k=wKind(it),len=rn(5)%4,gd=rn(6)%3;
      const guard=(x,y)=>{if(gd===0)LN(x-2,y-2,x+3,y+3,rk>=2?acc:gold,2);else if(gd===1){EL(x,y,3,3,rk>=2?acc:gold);P(x,y,gem)}else{LN(x-3,y-1,x+2,y+4,gold,2);P(x-3,y-2,gem);P(x+3,y+4,gem)}};
      const sword=(ox,oy,L)=>{LN(ox+5,oy+18,ox+5+L,oy+18-L,blade,2);LN(ox+6,oy+18,ox+6+L,oy+18-L,bladeL);P(ox+7+L,oy+16-L,bladeL);if(rn(7)%2)LN(ox+7,oy+16,ox+3+L,oy+20-L,D);guard(ox+4,oy+19);LN(ox+1,oy+23,ox+3,oy+21,wrap,2);R(ox,oy+23,2,2,gem)};
      if(k==='spear'){LN(3,29,21,11,wood,2);LN(4,29,22,11,wd);LN(21,11,26+len,6-len,blade,3);LN(22,10,26+len,6-len,bladeL);if(rn(8)%2){R(18,12,4,3,wrap);P(19,15,wrap);P(21,15,wrap)}else LN(17,13,20,16,gold,2)}
      else if(k==='halberd'){LN(3,29,22,10,'#5a1a10',2);LN(22,10,28,4,blade,2);EL(24,12,4+len%2,3,blade,(x,y)=>x>0);if(rn(9)%2)EL(18,6,3,4,blade,(x,y)=>y<0);LN(23,11,27,6,bladeL);R(19,11,3,3,gold)}
      else if(k==='fan'){for(let a=0;a<9;a++){const an=-2.6+a*.26;LN(8,24,Math.round(8+Math.cos(an)*20),Math.round(24+Math.sin(an)*20),a%2?'#f4f2ea':'#dcd8cc',2)}LN(8,24,4,29,wood,2);EL(8,24,2,2,gem)}
      else if(k==='bow'){for(let i=0;i<=20;i++){const an=-1.3+i/20*2.6;P(Math.round(10+Math.cos(an)*12),Math.round(16+Math.sin(an)*13),i%4?wood:gold);P(Math.round(11+Math.cos(an)*12),Math.round(16+Math.sin(an)*13),wood)}LN(14,4,14,28,'#e8e8e8');R(20,14,4,4,wrap);LN(6,16,26,16,blade);P(27,16,bladeL)}
      else if(k==='axe'){LN(4,29,20,9,wood,2);LN(5,29,21,9,wd);EL(22,10,8,7,blade,(x,y)=>x-y>-4);EL(22,10,5,4,bladeL,(x,y)=>x-y>2);R(17,7,4,8,D);R(10,21,3,3,wrap)}
      else if(k==='whip'){LN(3,29,8,23,wrap,2);R(8,21,3,3,gold);for(let i=0;i<16;i++){const x=10+i*1.2,y=22-i*1.1+Math.sin(i*.9)*3;EL(Math.round(x),Math.round(y),1,1,i%2?blade:bladeL)}EL(28,4,2,2,gold)}
      else if(k==='staff'){LN(5,29,22,6,wood,2);EL(23,6,4,4,gold,(x,y)=>x*x+y*y>5);EL(23,6,2,2,gem);R(12,18,3,3,wrap)}
      else if(k==='dao'){const cv=tier>=3?4:2+len%2;for(let i=0;i<17;i++){const x=8+i,y=23-i+Math.round(-Math.sin(i/17*Math.PI)*cv);R(x,y,1,tier>=3?4:3,blade);P(x,y,bladeL)}guard(6,24);LN(3,28,6,25,wrap,2);R(2,28,2,2,gem)}
      else sword(0,6,13+len);
      if(motif==='dual'){LN(26,24,10,8,blade,2);LN(26,23,10,7,bladeL);LN(27,26,29,28,wrap,2)}
      break}
    case'armor':{const body=tier===0?'#a08a6a':tier===1?lea:M,pat=rn(5)%3;
      R(6,6,20,4,tier>=5?Lt:body);R(8,10,16,14,body);R(9,24,14,5,tier===0?'#8a7454':D);
      if(tier===0){LN(12,6,16,12,'#6a5a40');LN(20,6,16,12,'#6a5a40');R(8,20,16,2,wrap)}
      else if(pat===0)for(let y=11;y<24;y+=3){LN(8,y,23,y,D);for(let x=8+((y/3)%2?0:2);x<24;x+=4)P(x,y+1,D)}
      else if(pat===1)for(let y=11;y<24;y+=3)for(let x=8;x<24;x+=3)EL(x+1,y+1,1,1,D,(xx,yy)=>yy>=0);
      else for(let y=11;y<24;y+=4){LN(8,y,16,y+3,D);LN(16,y+3,23,y,D)}
      if(tier>0){R(8,20,16,2,'#6a4a2a');R(15,20,2,2,gold);R(15,12,2,3,gem)}
      if(tier>=4||rn(6)%3===0){EL(7,8,4,3,M);EL(24,8,4,3,M);P(6,7,Lt);P(23,7,Lt)}
      break}
    case'helm':{const pl=pick_(['#c02020','#2060c0','#e8e8e8','#20a050','#e0b040'],5),ex=rn(6)%4;
      if(tier===0){R(5,13,22,5,pick_(['#c8a040','#a03030','#3050a0'],7));R(5,13,22,1,'#f0d070');LN(24,17,28,24,'#c8a040',2);LN(22,17,24,25,'#c8a040',2);R(15,14,2,3,gem)}
      else{const col=tier===1?lea:M;EL(16,17,10,10,col,(x,y)=>y<=0);R(6,17,20,3,tier===1?'#5a3a1a':D);
        if(tier>=2){R(7,20,3,6,col);R(22,20,3,6,col);LN(16,8,16,17,D)}
        if(tier>=3||ex===0){LN(16,8,16,2,pl,2);LN(17,2,21,5,pl,2)}
        if(ex===1||tier===4){LN(8,12,4,4,'#e8e0c0',2);LN(24,12,28,4,'#e8e0c0',2)}
        if(ex===2||tier>=5){LN(7,14,2,8,gold,2);LN(25,14,30,8,gold,2)}
        if(ex===3)R(11,18,10,2,'#1a1a1a');
        R(14,11,4,3,gem)}
      break}
    case'gloves':{const col=tier<=1?lea:M;
      R(10,9,12,12,col);R(10,5,3,5,col);R(13,4,3,6,col);R(16,4,3,6,col);R(19,5,3,5,col);R(22,12,4,5,col);
      R(9,20,14,8,tier>=2?M:'#6a4020');for(let x=11;x<22;x+=3)LN(x,21,x,26,D);
      if(rn(5)%2){P(11,4,Lt);P(14,3,Lt);P(17,3,Lt);P(20,4,Lt)}if(tier>=3){R(10,9,12,2,Lt);R(14,13,4,3,gem)}
      break}
    case'boots':{const col=tier===0?'#c8b070':tier===1?lea:M;
      R(10,4,9,16,col);R(10,20,15,7,col);R(10,26,17,2,D);R(9,4,11,3,tier>=3?acc:'#6a4020');
      if(tier===0)for(let y=6;y<26;y+=3)LN(10,y,18,y,'#a08a50');else for(let y=8;y<19;y+=4)LN(10,y,18,y,D);
      if(rn(5)%3===0||it.af.some(a=>a[0]==='mspd')&&tier>=3){LN(19,7,26,3,'#f4f4f4',2);LN(19,10,27,7,'#e0e0e0',2)}
      if(tier>=4)P(12,12,gem);
      break}
    case'belt':{R(2,13,28,7,tier<=1?lea:tier>=4?'#3a6a4a':pick_(['#6a3a1a','#3a2a4a','#2a3a5a'],5));R(2,13,28,1,'#b07a40');
      const n=2+rn(6)%3;if(tier>=2)for(let k=0;k<n;k++)R(3+k*(24/n|0),14,4,5,tier>=4?'#8ad0a8':M);
      R(13,11,6,11,rk>=2?acc:gold);R(15,14,2,5,'#2a1a10');P(14,12,gem);
      break}
    case'cape':{const col=rk>=1?shade(acc,-50):pick_(['#8a3a2a','#3a4a7a','#4a6a3a'],5);
      for(let y=5;y<29;y++){const w=12+Math.round((y-5)*.6);R(16-(w>>1),y,w,1,col)}
      for(let x=11;x<22;x+=4)LN(x,8,x-(x<16?2:-2),27,shade(col,-30));
      R(10,4,12,3,tier>=3?'#e8e0d0':'#6a4a2a');R(14,5,4,3,gold);
      const em=rn(6)%3;if(tier>=2){if(em===0)EL(16,17,3,3,gem);else if(em===1){LN(13,14,19,20,gem);LN(19,14,13,20,gem)}else{EL(16,17,4,3,'#ffd060');P(16,16,'#ffffff')}}
      break}
    case'neck':{for(let a=0;a<=20;a++){const an=a/20*Math.PI;P(Math.round(16+Math.cos(an)*9),Math.round(5+Math.sin(an)*12),a%2?Lt:M)}
      const sh=rn(5)%3;
      if(sh===0)EL(16,21,3+(tier>>1),4+(tier>>1),M);else if(sh===1){LN(13,18,16,26,M,2);LN(19,18,16,26,M,2)}else{EL(16,22,6,6,'#6ab08a');EL(16,22,2,2,'#1a2a20')}
      EL(16,20,2,2,gem);
      break}
    case'ring':{for(let y=-8;y<=8;y++)for(let x=-9;x<=9;x++){const o=x*x/81+y*y/64,n=x*x/30+y*y/20;if(o<=1&&n>1)P(16+x,20+y,y<0?Lt:M)}
      const cut=rn(5)%3;R(12,7,8,6,D);const gr=1+Math.min(3,tier>>1);
      if(cut===0)EL(16,9,gr+1,gr,gem);else if(cut===1)R(16-gr,9-gr,gr*2+1,gr*2,gem);else{EL(13,9,gr,gr,gem);EL(19,9,gr,gr,pick_(GEM_PAL,6))}
      P(15,8,'#ffffff');
      break}
    case'book':{
      if(tier<=1){for(let k=0;k<6;k++)R(6+k*3,5,2,22,k%2?'#c8b070':'#b89a58');LN(5,10,24,10,wrap);LN(5,21,24,21,wrap)}
      else{R(7,4,18,24,shade(rk>=1?acc:pick_(['#7a3a1a','#2a3a6a','#2a5a3a'],5),-40));R(23,5,3,22,'#efe6cc');R(7,4,3,24,D);
        const em=rn(6)%3;if(em===0){EL(17,15,4,4,Lt);EL(17,15,2,2,gem)}else if(em===1){LN(17,10,21,15,Lt);LN(21,15,17,20,Lt);LN(17,20,13,15,Lt);LN(13,15,17,10,Lt);P(17,15,gem)}
        else{EL(17,15,4,4,'#f0f0f0',(x,y)=>x<0||(x===0&&y<0));EL(17,15,4,4,'#202020',(x,y)=>x>0||(x===0&&y>0));P(17,13,'#202020');P(17,17,'#f0f0f0')}
        R(11,24,12,1,Lt);if(tier>=5){R(11,6,12,1,gold);R(11,26,12,1,gold)}}
      break}
  }
  /* 이름 문양 */
  if(motif==='stars')for(const [x,y] of[[6,6],[9,4],[13,5],[16,7],[19,6],[22,9],[25,8]])P(x,y,'#fff6a0');
  if(motif==='flame')for(let i=0;i<6;i++){const x=6+i*4,y=5+(i%2)*2;P(x,y,'#ffb040');P(x,y-1,'#ffe080');P(x+1,y+1,'#ff6020')}
  if(motif==='bolt'){LN(24,2,21,7,'#fff6a0');LN(21,7,25,8,'#fff6a0');LN(25,8,22,13,'#fff6a0')}
  if(motif==='dragon'){for(let i=0;i<10;i++)P(4+i*2,28-Math.round(Math.sin(i*.8)*3),'#50ff90')}
  if(motif==='petal')for(const [x,y] of[[25,4],[27,7],[5,26]]){P(x,y,'#ff8ad0');P(x+1,y,'#ffc0e0');P(x,y+1,'#ff8ad0')}
  if(motif==='frost')for(const [x,y] of[[5,5],[26,26],[27,4]]){P(x,y,'#ffffff');P(x-1,y,'#bff0ff');P(x+1,y,'#bff0ff');P(x,y-1,'#bff0ff');P(x,y+1,'#bff0ff')}
  /* 자동 명암 + 외곽선 */
  const id=g.getImageData(0,0,32,32),d=id.data,A=(x,y)=>x<0||y<0||x>31||y>31?0:d[(y*32+x)*4+3];
  const src=new Uint8ClampedArray(d);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const q=(y*32+x)*4;
    if(src[q+3]){let k=0;if(!A(x,y-1))k+=46;if(!A(x-1,y))k+=24;if(!A(x,y+1))k-=46;if(!A(x+1,y))k-=24;
      if(k)for(let j=0;j<3;j++)d[q+j]=Math.max(0,Math.min(255,src[q+j]+k))}}
  const sh=new Uint8ClampedArray(d),oc=rk>=4?[70,20,10]:[24,16,10];
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const q=(y*32+x)*4;if(sh[q+3])continue;
    const n=(xx,yy)=>xx>=0&&yy>=0&&xx<32&&yy<32&&sh[(yy*32+xx)*4+3];
    if(n(x-1,y)||n(x+1,y)||n(x,y-1)||n(x,y+1)){d[q]=oc[0];d[q+1]=oc[1];d[q+2]=oc[2];d[q+3]=255}}
  if(rk>=4){for(let s2=0;s2<4;s2++){const x=(hash(sd%97+s2*7)*28+2)|0,y=(hash(s2*13+sd%89)*28+2)|0,q=(y*32+x)*4;if(d[q+3]){d[q]=d[q+1]=d[q+2]=255}}}
  g.putImageData(id,0,0);
  if(GEAR_ART.size>1500)GEAR_ART.clear();
  GEAR_ART.set(key,c);return c;
}
function drawGearIcon(it,cx,cy,sz){ctx.imageSmoothingEnabled=false;ctx.drawImage(gearArt(it),Math.round(cx-sz/2),Math.round(cy-sz/2),Math.round(sz),Math.round(sz))}
function gearBadges(it,x,y,sz){
  if(it.set&&SET_MARK[it.set]){const [h,c]=SET_MARK[it.set],b=Math.max(11,sz*.3);ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(x+1,y+sz-b-1,b,b);ctx.strokeStyle=c;ctx.lineWidth=1;ctx.strokeRect(x+1.5,y+sz-b-.5,b-1,b-1);txt(h,x+1+b/2,y+sz-b/2,b*.72,c,'center',HANJA)}
  if(it.lk){const lx=x+3,ly=y+3;ctx.fillStyle='#ffd24a';ctx.fillRect(lx,ly+4,8,6);ctx.strokeStyle='#ffd24a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(lx+4,ly+4,2.6,Math.PI,0);ctx.stroke();ctx.fillStyle='#000';ctx.fillRect(lx+3,ly+6,2,2)}
  if(it.nw&&(frame>>4)%3){ctx.fillStyle='#e02020';ctx.fillRect(x+sz-24,y+sz-11,23,10);txt('NEW',x+sz-12.5,y+sz-5.5,8,'#fff','center',MONO)}
}
function gearCell(it,x,y,sz,sel,dim){
  const c=it?GRADES[it.g].c:'#5a4a30';
  ctx.fillStyle=it?hexA(c,.16):'rgba(0,0,0,.5)';ctx.fillRect(x,y,sz,sz);
  if(it&&GRADES[it.g].rank>=4){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.25+.15*Math.sin(frame*.1);ctx.drawImage(glowSpr(c),x,y,sz,sz);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  ctx.strokeStyle=sel?'#ffe060':it?c:'#5a4a30';ctx.lineWidth=sel?3:1;ctx.strokeRect(x+.5,y+.5,sz-1,sz-1);
  if(it){if(dim)ctx.globalAlpha=.4;drawGearIcon(it,x+sz/2,y+sz/2,sz*.94);ctx.globalAlpha=1;if(it.e)txt('+'+it.e,x+sz-3,y+8,10,'#ffe890','right',MONO,['#000',3]);gearBadges(it,x,y,sz)}
}
/* 스킬 아이콘 */
function skCol(s,ps){return s.el!=='phys'?EL_COL[s.el]:(s.col||HEROES[ps.hero].fx)}
function drawSkillIcon(s,ps,x,y,sz,o){
  o=o||{};const col=skCol(s,ps),rk=ps.rpg.sk[s.id]||0;
  const g=ctx.createLinearGradient(0,y,0,y+sz);g.addColorStop(0,shade(col,-60));g.addColorStop(1,shade(col,-130));
  ctx.fillStyle=g;ctx.fillRect(x,y,sz,sz);
  txt(s.ic,x+sz/2,y+sz/2+1,sz*.55,rk||o.hot?'#fff':'#9a8a7a','center',HANJA,['#000',3]);
  if(!rk&&!o.hot){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x,y,sz,sz)}
  ctx.strokeStyle=o.sel?'#ffe060':ACTIVE_TY[s.ty]?col:'#8a7a5a';ctx.lineWidth=o.sel?3:ACTIVE_TY[s.ty]?2:1;ctx.strokeRect(x+.5,y+.5,sz-1,sz-1);
  if(!ACTIVE_TY[s.ty]&&sz>30){ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.strokeRect(x+3.5,y+3.5,sz-7,sz-7)}
}

/* ---------- 필드: 떨어진 장비 · 금화 · 재료 ---------- */
function drawGroundRpg(it,sx,sy){
  if(it.kind==='gear'){const g=GRADES[it.gear.g];
    if(g.rank>=1){ctx.globalCompositeOperation='lighter';const hgt=g.rank>=3?170:g.rank>=2?110:60;const gr=ctx.createLinearGradient(0,sy-hgt,0,sy);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,hexA(g.c,.45));
      ctx.fillStyle=gr;ctx.fillRect(sx-5,sy-hgt,10,hgt);ctx.globalCompositeOperation='source-over'}
    drawGearIcon(it.gear,sx,sy-12,30);
    ctx.font=`bold 11px ${FONT}`;const tw=ctx.measureText(it.gear.n).width+8;ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(sx-tw/2,sy-38,tw,15);txt(it.gear.n,sx,sy-30,11,g.c,'center');
    if(g.rank>=3&&it.t%8===0)emit({x:it.x+rnd(-10,10),y:it.y,z:rnd(0,30),vz:rnd(.6,1.6),col:g.c,size:7,life:26});return}
  if(it.kind==='coin'){ctx.fillStyle='#b08010';ctx.fillRect(sx-9,sy-6,18,6);ctx.fillStyle='#f0c030';ctx.fillRect(sx-7,sy-10,14,6);ctx.fillStyle='#ffe890';ctx.fillRect(sx-3,sy-12,6,3);return}
  if(it.kind==='mat'){if(it.mat==='stone'){ctx.fillStyle='#6a7a8a';ctx.fillRect(sx-7,sy-12,14,10);ctx.fillStyle='#c8d8e8';ctx.fillRect(sx-4,sy-11,5,4)}
    else{ctx.fillStyle='#e8dcb8';ctx.fillRect(sx-8,sy-13,16,10);ctx.fillStyle='#8a3aa0';ctx.fillRect(sx-9,sy-14,3,12);ctx.fillRect(sx+6,sy-14,3,12)}
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.4;ctx.drawImage(glowSpr(it.mat==='stone'?'#a0c0ff':'#d080ff'),sx-16,sy-24,32,32);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
}

/* ---------- HUD: 단축 스킬 바 · 버프 ---------- */
function drawHotbar(p,x,y){
  const ps=p.ps,K=kn(p.idx).sk;
  for(let k=0;k<4;k++){const bx=x+k*27,id=ps.rpg.hot[k];
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(bx,y,24,24);
    if(id){const s=SKILLS[id];drawSkillIcon(s,ps,bx,y,24,{hot:1});
      const cd=p.cds[id]||0,mx=p.cdMax[id]||1;
      if(cd>0){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(bx,y,24,24*cd/mx);txt(String(Math.ceil(cd/60)),bx+12,y+12,11,'#fff','center',MONO,['#000',3])}
      else if(p.mana<skCost(ps,s,skLv(ps,id))){ctx.fillStyle='rgba(20,40,160,.5)';ctx.fillRect(bx,y,24,24)}}
    else{ctx.strokeStyle='#5a4a30';ctx.lineWidth=1;ctx.strokeRect(bx+.5,y+.5,23,23)}
    txt(K[k],bx+2,y+5,9,'#ffe890','left',MONO,['#000',3])}
}
function drawSbufIcons(p,x,y){
  let j=0;for(const id in p.sbuf){const b=p.sbuf[id];const bx=x+j*40;if(bx>x+160)break;
    ctx.fillStyle=b.col||'#fff';ctx.fillRect(bx,y,15,14);txt(b.ic||'★',bx+7.5,y+7,10,'#000','center',HANJA);txt(Math.ceil(b.t/60)+'s',bx+18,y+7,10,b.col||'#fff','left',MONO,['#000',2]);j++}
}

/* ================= 캐릭터 창 (장비 · 스킬 · 능력치 · 대장간 · 시스템) ================= */
const TABS=['장비','스킬','능력치','대장간','시스템'];
let MN=null;
function openMenu(i,back,tab){MN={i,tab:tab||0,cur:[BAG0,0,0,BAG0,0],back,msg:null,conf:null,t:0,gbox:'all',page:0,slotF:null,slotK:null,cPend:false};scene='menu';clearPressed();sfx('sel')}
function closeMenu(){scene=MN.back;MN=null;clearPressed()}
function menuMsg(t,col){MN.msg={t:0,txt:t,col:col||'#ffe8a8'}}
const EQ_POS={helm:[162,64],neck:[222,64],cape:[40,120],weapon:[40,180],gloves:[40,240],armor:[284,120],belt:[284,180],boots:[284,240],ring1:[102,300],ring2:[162,300],book:[222,300]};
const EQ_LABEL={weapon:'무기',armor:'갑옷',helm:'투구',gloves:'장갑',boots:'신발',belt:'벨트',cape:'망토',neck:'목걸이',ring1:'반지',ring2:'반지',book:'스킬북'};
const BOX_TABS=['all'].concat(GRADE_ORDER),BOX_PAGE=40,BAG0=EQ_SLOTS.length+BOX_TABS.length+2;
function boxList(r,g,sf){const L=[];r.bag.forEach((it,i)=>{if((g==='all'||it.g===g)&&(!sf||it.s===sf))L.push(i)});return L}
function gearCells(ps){
  const cs=EQ_SLOTS.map(sk=>({x:EQ_POS[sk][0],y:EQ_POS[sk][1],w:48,h:48,eq:sk}));
  BOX_TABS.forEach((g,k)=>cs.push({x:380+k*70,y:56,w:66,h:22,gtab:g}));
  cs.push({x:874,y:56,w:30,h:22,page:-1},{x:908,y:56,w:30,h:22,page:1});
  const L=boxList(ps.rpg,MN.gbox,MN.slotF),pages=Math.max(1,Math.ceil(L.length/BOX_PAGE));if(MN.page>=pages)MN.page=pages-1;
  for(let b=0;b<BOX_PAGE;b++){const i=L[MN.page*BOX_PAGE+b];cs.push({x:380+(b%10)*56,y:84+Math.floor(b/10)*52,w:48,h:48,bag:true,bi:i==null?null:i})}
  return cs;
}
function skillCells(ps){return HSK[HEROES[ps.hero].id].map(s=>({x:50+s.tr*196,y:84+s.ti*84,w:54,h:54,s}))}
function navMove(cells,idx,dx,dy){
  const c=cells[idx],cx=c.x+c.w/2,cy=c.y+c.h/2;let best=idx,bs=1e9;
  cells.forEach((o,i)=>{if(i===idx)return;const ox=o.x+o.w/2-cx,oy=o.y+o.h/2-cy,al=dx?ox*dx:oy*dy;if(al<=4)return;const s=al+(dx?Math.abs(oy):Math.abs(ox))*2.2;if(s<bs){bs=s;best=i}});
  return best;
}
function selItem(ps,c){return c.eq?ps.rpg.eq[c.eq]:c.bi!=null?ps.rpg.bag[c.bi]:null}

function updMenu(){
  const i=MN.i,ps=G.pl[i],r=ps.rpg,P=G.np===2?PP[i]:pressed,take=k=>{if(P[k]){P[k]=false;return true}return false};
  MN.t++;if(MN.msg&&++MN.msg.t>170)MN.msg=null;
  if((MN.tab===0||MN.tab===3)&&MN.slotF&&pressed.pause){pressed.pause=false;MN.slotF=null;MN.slotK=null;MN.page=0;menuMsg('부위 지정 해제');sfx('sel');return}
  if(take('jump')||take('menu')||hit('menu')||hit('pause')){closeMenu();sfx('sel');return}
  if(take('swap')){MN.tab=(MN.tab+1)%TABS.length;MN.conf=null;sfx('sel');return}
  const dx=take('left')?-1:take('right')?1:0,dy=!dx&&take('up')?-1:!dx&&take('down')?1:0;
  const A=take('atk')||hit('start'),C=take('sp'),V=take('item');
  const tab=MN.tab,camp=MN.back==='camp';
  if(tab===0||tab===3){
    let cs=gearCells(ps);
    const L0=take('sk1');
    if(dx||dy){MN.cur[tab]=navMove(cs,MN.cur[tab],dx,dy);MN.conf=null;sfx('sel');const c0=cs[MN.cur[tab]];
      if(c0.gtab&&MN.gbox!==c0.gtab){MN.gbox=c0.gtab;MN.page=0;cs=gearCells(ps)}}
    const c=cs[MN.cur[tab]],it=selItem(ps,c);
    if(it&&it.nw&&c.bag)it.nw=false;
    if(c.page){if(A){const pages=Math.max(1,Math.ceil(boxList(r,MN.gbox,MN.slotF).length/BOX_PAGE));MN.page=(MN.page+c.page+pages)%pages;sfx('sel')}return}
    if(c.gtab){const g=c.gtab,sn=MN.slotF?SLOTS[MN.slotF].n+' ':'';
      if((C||V)&&g==='all'){menuMsg('일괄 처리는 등급 탭(노멀~신화)에서만 할 수 있습니다','#ffb070');return}
      if(C||V){if(V&&!camp){menuMsg('판매는 군영에서만 가능합니다','#ffb070');return}
        const n=bulkTargets(r,g,MN.slotF).length,key=(C?'bs':'bv')+g;
        if(!n){menuMsg('처리할 장비가 없습니다 (잠금 장비 제외)','#ffb070');return}
        if(MN.conf!==key){MN.conf=key;menuMsg(`${GRADES[g].n} ${sn}장비 ${n}개를 일괄 ${C?'분해':'판매'}합니다. 한 번 더 누르세요 (잠금 제외)`,'#ffb070');return}
        MN.conf=null;if(C){const o=bulkSalvage(r,g,MN.slotF);menuMsg(`${o.n}개 일괄 분해: 강화석 +${o.st} · 비급 조각 +${o.fr}`,'#c8d8e8');sfx('break')}
        else{const o=bulkSell(r,g,MN.slotF);menuMsg(`${o.n}개 일괄 판매: 금화 +${o.gold}`,'#ffd860');sfx('item')}}
      return}
    if(L0&&it){it.lk=!it.lk;menuMsg(it.lk?`🔒 ${it.n} 잠금 (판매 · 분해 금지)`:`${it.n} 잠금 해제`,it.lk?'#ffd24a':'#ccc');sfx('sel')}
    if(tab===0){
      if(A&&c.eq){MN.slotF=slotType(c.eq);MN.slotK=c.eq;MN.page=0;const bi=gearCells(ps).findIndex(q=>q.bag);MN.cur[tab]=bi;menuMsg(`「${EQ_LABEL[c.eq]}」 부위 지정 — 해당 부위 장비만 표시 (Esc 해제)`,'#ffe8a8');sfx('ok');return}
      if(C&&c.eq){if(it){const e=unequipItem(ps,c.eq);menuMsg(e||`${it.n} 해제`,e?'#ff8080':null);sfx(e?'noMp':'item')}return}
      if(A){if(c.eq){}
        else if(it){const e=equipItem(ps,c.bi,MN.slotK&&slotType(MN.slotK)===it.s?MN.slotK:null);menuMsg(e||`${it.n} 장착!`,e?'#ff8080':'#b0ffb0');sfx(e?'noMp':'power')}}
      if(C&&it&&it.lk&&c.bag){menuMsg('잠긴 장비는 분해할 수 없습니다 (1: 잠금 해제)','#ff9080');return}
      if(V&&it&&it.lk&&c.bag){menuMsg('잠긴 장비는 판매할 수 없습니다 (1: 잠금 해제)','#ff9080');return}
      if(C){if(c.bi!=null&&it){
          if(GRADES[it.g].rank>=2&&MN.conf!=='salv'+c.bi){MN.conf='salv'+c.bi;menuMsg(`${GRADES[it.g].n} 장비입니다. 한 번 더 누르면 분해합니다.`,'#ffb070')}
          else{const gn=salvageGain(it);r.mats.stone+=gn.stone;r.mats.frag+=gn.frag;r.bag.splice(c.bi,1);MN.conf=null;menuMsg(`분해: 강화석 +${gn.stone}${gn.frag?` · 비급 조각 +${gn.frag}`:''}`,'#c8d8e8');sfx('break')}}
        else if(c.bag&&!it){r.bag.sort((a,b)=>GRADES[b.g].rank-GRADES[a.g].rank||SLOTS[a.s].w-SLOTS[b.s].w||b.il-a.il);menuMsg('가방 정렬 완료');sfx('sel')}}
      if(V){if(!camp)menuMsg('판매는 군영의 상인에게서만 가능합니다','#ffb070');
        else if(c.bi!=null&&it){const pr=itemPrice(it);r.gold+=pr;r.bag.splice(c.bi,1);menuMsg(`${it.n} 판매 +${pr} 금`,'#ffd860');sfx('item')}}
    }else{
      if(!camp){if(A||C||V)menuMsg('대장간은 군영에서만 이용할 수 있습니다','#ffb070');return}
      if(A&&c.eq&&!it){MN.slotF=slotType(c.eq);MN.slotK=c.eq;MN.page=0;MN.cur[tab]=gearCells(ps).findIndex(q=>q.bag);menuMsg(`「${EQ_LABEL[c.eq]}」 부위 지정 (Esc 해제)`,'#ffe8a8');return}
      if(A&&it){const res=enhanceItem(ps,it);menuMsg(res.msg,res.ok?'#b0ffb0':'#ff9080');sfx(res.ok?'lvl':'noMp');if(res.ok)glowMenuT=20}
      if(V&&it){const res=rerollItem(ps,it);menuMsg(res.msg,res.ok?'#b0ffb0':'#ff9080');sfx(res.ok?'magic':'noMp')}
      if(C&&it&&it.lk){menuMsg('잠긴 장비는 분해할 수 없습니다 (1: 잠금 해제)','#ff9080')}
      else if(C&&it&&c.bi!=null){const gn=salvageGain(it);r.mats.stone+=gn.stone;r.mats.frag+=gn.frag;r.bag.splice(c.bi,1);menuMsg(`분해: 강화석 +${gn.stone}${gn.frag?` · 비급 조각 +${gn.frag}`:''}`,'#c8d8e8');sfx('break')}
      else if(C&&c.eq)menuMsg('장착 중인 장비는 분해할 수 없습니다','#ffb070');
    }
  }else if(tab===1){
    const cs=skillCells(ps);
    if(dx||dy){MN.cur[1]=navMove(cs,MN.cur[1],dx,dy);sfx('sel')}
    const s=cs[MN.cur[1]].s;
    if(A){const e=learnSkill(ps,s.id);menuMsg(e||`「${s.n}」 Lv.${r.sk[s.id]}`,e?'#ff8080':'#b0ffb0');sfx(e?'noMp':'lvl')}
    const Kh=G.np===2?KP[i]:keys,dig=[take('sk1'),take('sk2'),take('sk3'),take('sk4')].indexOf(true);
    if(dig>=0){MN.cPend=false;
      if(!ACTIVE_TY[s.ty])menuMsg('패시브 · 오라 · 기술 강화는 단축키에 등록할 수 없습니다','#ffb070');
      else if(!r.sk[s.id])menuMsg('먼저 스킬을 배워야 합니다','#ffb070');
      else{const k=r.hot.indexOf(s.id),old=r.hot[dig];r.hot[dig]=s.id;if(k>=0&&k!==dig)r.hot[k]=old;menuMsg(`「${s.n}」 → 단축키 ${kn(i).sk[dig]}`,'#b0ffb0');sfx('ok')}
      return}
    if(C){MN.cPend=true;return}
    if(MN.cPend&&!Kh.sp){MN.cPend=false;
      if(!ACTIVE_TY[s.ty])menuMsg('패시브 · 오라 · 기술 강화는 단축키에 등록할 수 없습니다','#ffb070');
      else if(!r.sk[s.id])menuMsg('먼저 스킬을 배워야 합니다','#ffb070');
      else{const k=r.hot.indexOf(s.id);if(k>=0)r.hot[k]=null;const em=r.hot.indexOf(null),nk=k<0?(em>=0?em:0):k+1;
        if(nk<4){const old=r.hot[nk];r.hot[nk]=s.id;if(old&&k>=0)r.hot[k]=old;menuMsg(`「${s.n}」 → 단축키 ${kn(i).sk[nk]}`)}else menuMsg(`「${s.n}」 단축키 해제`);sfx('sel')}}
    if(V){const res=enhanceSkill(ps,s.id);menuMsg(res.msg,res.ok?'#b0ffb0':'#ff9080');sfx(res.ok?'lvl':'noMp')}
  }else if(tab===2){
    if(dy){MN.cur[2]=(MN.cur[2]+dy+4)%4;sfx('sel')}
    const k=['str','dex','vit','ene'][MN.cur[2]];
    if((A||V)&&r.statPts>0){const n=ctrlHeld?r.statPts:V?Math.min(5,r.statPts):1;r[k]+=n;r.statPts-=n;recalc(ps);sfx('sel');menuMsg(`${STAT_INFO[MN.cur[2]][0]} +${n}`,'#b0ffb0')}
    else if(A||V)menuMsg('능력치 포인트가 없습니다','#ff8080');
  }else if(tab===4){
    const opts=sysOpts();
    if(dy){MN.cur[4]=(MN.cur[4]+dy+opts.length)%opts.length;MN.conf=null;sfx('sel')}
    if(A){const o=opts[MN.cur[4]];
      if(o.k==='save'){const b=MN.back;MN=null;openSlots('save','menuback',{i,back:b});return}
      if(o.k==='town'){if(MN.conf!=='town'){MN.conf='town';menuMsg('정말 귀환할까요? 진행 중인 전장은 처음부터 다시 해야 합니다. (한 번 더)','#ffb070');return}
        closeMenu();for(const p of Wd.ps){p.ps.mp=p.mp}toCamp('군영으로 귀환했다. (진행 중이던 전장은 초기화)');return}
      if(o.k==='title'){if(MN.conf!=='title'){MN.conf='title';menuMsg('저장하지 않은 진행은 사라집니다. 한 번 더 누르면 타이틀로.','#ffb070');return}
        MN=null;scene='title';G=null;return}
      if(o.k==='close'){closeMenu();return}}
  }
}
let glowMenuT=0;
function sysOpts(){const o=[{k:'save',n:'저장하기'}];if(MN&&MN.back==='play')o.push({k:'town',n:'군영으로 귀환 (귀환 부적)'});o.push({k:'title',n:'타이틀로 나가기'},{k:'close',n:'닫기'});return o}
const STAT_INFO=[['무력','str','공격력 +0.4 / 포인트'],['민첩','dex','치명타 +0.08% · 회피 +0.04% · 이동 +0.04% · 방어 +0.3'],['체질','vit','최대 체력 +3 · 방어 +0.3 · 체력 회복'],['지력','ene','최대 내공 +2.5 · 스킬 피해 +0.8% · 내공 회복']];

function drawMenu(){
  if(MN.back==='play')drawPlay();else drawCampBG();
  ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(0,0,W,H);
  const i=MN.i,ps=G.pl[i],r=ps.rpg,h=HEROES[ps.hero],K=kn(i);
  /* 탭 */
  TABS.forEach((t,k)=>{const x=16+k*104,on=k===MN.tab;ctx.fillStyle=on?'rgba(120,30,10,.95)':'rgba(30,15,5,.9)';ctx.fillRect(x,10,98,30);ctx.strokeStyle=on?'#ffd24a':'#6a4a2a';ctx.lineWidth=on?2:1;ctx.strokeRect(x+.5,10.5,97,29);
    txt(t,x+49,25,15,on?'#fff':'#b8a080');if(k===1&&r.skillPts>0||k===2&&r.statPts>0){ctx.fillStyle='#ff4040';circ(x+90,15,5)}});
  txt(`${G.np===2?(i+1)+'P ':''}${h.name}  Lv.${ps.lvl}`,W-16,18,15,'#ffe8a8','right');
  txt(`금화 ${r.gold}  ·  강화석 ${r.mats.stone}  ·  비급 조각 ${r.mats.frag}`,W-16,36,12,'#ffd860','right');
  const hint={0:`${K.atk} 장착 · 장착칸 ${K.atk}/ENTER 부위 지정(Esc 해제) · ${K.sp} 분해/장착칸 해제 · ${K.item} 판매 · ${K.sk[0]} 잠금`,1:`${K.atk} 스킬 레벨업 · 1~4 (또는 ${K.sp}+1~4) 단축키 지정 · ${K.sp} 순환 등록 · ${K.item} 스킬 강화`,2:`${K.atk} +1 · ${K.item} +5 · Ctrl+${K.atk} 남은 포인트 전부`,
    3:`${K.atk} 강화 · ${K.item} 재련 · ${K.sp} 분해 · ${K.sk[0]} 잠금`,4:`${K.atk} 선택`}[MN.tab];
  txt(`${hint}   ·   ${K.swap} 탭 전환   ·   ${K.jump} / ${K.menu} 닫기`,W/2,H-8,12,'#aaa');
  [drawTabGear,drawTabSkill,drawTabStat,drawTabGear,drawTabSys][MN.tab](ps);
  if(MN.msg){const a=Math.min(1,(170-MN.msg.t)/30);ctx.globalAlpha=a;ctx.font=`bold 16px ${FONT}`;const tw=ctx.measureText(MN.msg.txt).width+30;
    ctx.fillStyle='rgba(0,0,0,.9)';ctx.fillRect(W/2-tw/2,H/2-18,tw,36);ctx.strokeStyle=MN.msg.col;ctx.strokeRect(W/2-tw/2,H/2-18,tw,36);txt(MN.msg.txt,W/2,H/2,16,MN.msg.col);ctx.globalAlpha=1}
}
function drawTabGear(ps){
  const r=ps.rpg,cs=gearCells(ps),cur=MN.cur[MN.tab],smith=MN.tab===3;
  panel(12,50,352,472);panel(372,50,576,244);
  /* 인형 */
  const h=HEROES[ps.hero];ctx.save();ctx.beginPath();ctx.rect(96,110,176,184);ctx.clip();
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3;ctx.drawImage(glowSpr(h.fx),100,120,168,170);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const lk=heroLook(ps);renderModel(ctx,lk,poseOf({look:lk,state:'idle',anim:frame,t:0,h}),186,290,1.55,1,{});ctx.restore();
  if(lk.wglow){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;ctx.drawImage(glowSpr(lk.wglow),120,110,130,180);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  const L=boxList(r,MN.gbox),pages=Math.max(1,Math.ceil(L.length/BOX_PAGE));
  cs.forEach((c,k)=>{const on=k===cur;
    if(c.gtab){const g=c.gtab,sel=MN.gbox===g,col=g==='all'?'#ffd24a':GRADES[g].c,n=g==='all'?r.bag.length:bagCount(r,g);
      ctx.fillStyle=sel?hexA(col,.35):'rgba(0,0,0,.45)';ctx.fillRect(c.x,c.y,c.w,c.h);ctx.strokeStyle=on?'#ffffff':sel?col:'#4a3a28';ctx.lineWidth=on?2:1;ctx.strokeRect(c.x+.5,c.y+.5,c.w-1,c.h-1);
      txt(`${g==='all'?'전체':GRADES[g].n} ${n}`,c.x+c.w/2,c.y+c.h/2+1,11,sel?'#fff':col);if(r.bag.some(i=>i.nw&&(g==='all'||i.g===g))){ctx.fillStyle='#ff3030';circ(c.x+c.w-4,c.y+4,3)}return}
    if(c.page){ctx.fillStyle=on?'rgba(120,30,10,.9)':'rgba(0,0,0,.45)';ctx.fillRect(c.x,c.y,c.w,c.h);ctx.strokeStyle=on?'#ffffff':'#6a4a2a';ctx.strokeRect(c.x+.5,c.y+.5,c.w-1,c.h-1);txt(c.page<0?'◀':'▶',c.x+c.w/2,c.y+c.h/2+1,12,'#ffe8a8');return}
    const it=selItem(ps,c);gearCell(it,c.x,c.y,c.w,on);if(c.eq&&!it)txt(EQ_LABEL[c.eq],c.x+c.w/2,c.y+c.h/2,11,'#6a5a40');
    if(c.eq&&MN.slotK===c.eq){ctx.strokeStyle=`rgba(255,220,80,${.6+.4*Math.sin(frame*.25)})`;ctx.lineWidth=3;ctx.strokeRect(c.x-3,c.y-3,c.w+6,c.h+6);txt('지정',c.x+c.w/2,c.y-8,10,'#ffe060','center',FONT,['#000',3])}});
  const boxName=(MN.gbox==='all'?'전체 보관함':`${GRADES[MN.gbox].n} 보관함`)+(MN.slotF?` · ${SLOTS[MN.slotF].n}만`:'');
  txt(`${boxName} ${L.length} / ${MN.gbox==='all'?BAG_MAX:BAG_PER}   ·   ${MN.page+1} / ${pages} 쪽`,940,290,11,MN.gbox==='all'?'#aaa':GRADES[MN.gbox].c,'right');
  if(glowMenuT>0){glowMenuT--;const c=cs[cur];ctx.globalCompositeOperation='lighter';ctx.globalAlpha=glowMenuT/20;ctx.drawImage(glowSpr('#ffe060'),c.x-30,c.y-30,c.w+60,c.h+60);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  /* 요약 능력치 */
  const s=ps.st,y0=366;
  const rows=[['공격력',Math.round(s.pow*(1+s.atkPct/100))],['방어력',s.def],['체력',s.maxhp],['내공',s.maxmp],['치명타',fmt(s.crit)+'%'],['치명 피해',Math.round(s.critDmg)+'%'],
    ['이동 속도',(s.mspd>=0?'+':'')+fmt(s.mspd)+'%'],['생명 흡수',fmt(s.ls)+'%'],['모든 스킬','+'+s.allSkill],['아이템 발견',fmt(s.mf)+'%']];
  txt('능력 요약',188,y0-4,14,'#ffd24a');
  rows.forEach(([n,v],k)=>{const x=30+(k%2)*168,y=y0+18+Math.floor(k/2)*26;txt(n,x,y,13,'#c8b890','left');txt(String(v),x+150,y,14,'#fff','right',MONO)});
  if(s.sets.length)txt('세트: '+s.sets.map(([k,n])=>`${SETS[k].n.replace(/\(.*\)/,'')} ${n}`).join(' · '),188,y0+150,11,'#50e878');
  /* 툴팁 */
  panel(372,300,576,222);
  const c=cs[cur],it=selItem(ps,c);
  if(c.gtab||c.page){if(c.page)txt(`${KN[0].atk} 로 ${c.page<0?'이전':'다음'} 쪽`,660,410,14,'#c8b890');else{txt(`${c.gtab==='all'?'전체':GRADES[c.gtab].n} 보관함 — 등급별 100칸`,660,380,15,'#ffe8a8');
    if(c.gtab!=='all'){txt(`${KN[0].sp} : 이 등급 일괄 분해   ·   ${KN[0].item} : 이 등급 일괄 판매 (군영)`,660,412,13,'#c8b890');txt('잠금 장비는 제외 · 한 번 더 눌러 확정',660,436,12,'#a89878')}}return}
  if(!it){txt(c.eq?`${EQ_LABEL[c.eq]} 칸 — 비어 있음`:'빈 칸',660,410,15,'#777');return}
  drawItemTip(it,ps,382,314,smith?300:320);
  if(smith)drawSmithInfo(it,ps,700,314);
  else if(c.bi!=null)drawCompare(it,ps,712,314);
}
function itemLines(it,ps){
  const g=GRADES[it.g],L=[],e=it.e||0;
  L.push([it.n+(e?`  +${e}`:''),g.c,17]);
  L.push([`${g.n} ${SLOTS[it.s].n}  ·  아이템 레벨 ${it.il}`,'#a89878',12]);
  if(it.h)L.push([`${heroName(it.h)} 전용`,it.h===HEROES[ps.hero].id?'#ff9a30':'#ff5050',13]);
  L.push([`요구 레벨 ${it.rq}`,ps.lvl>=it.rq?'#d8d0c0':'#ff5050',13]);
  for(const k in it.at)L.push([`${k==='atk'?'공격력':'방어력'} ${Math.round(it.at[k]*(1+e*.1))}`,'#ffffff',14]);
  for(const [k,v] of it.af)L.push([afText(k,v,e,ps),'#8ab8ff',13]);
  if(it.u)for(const t of UNIQ[it.u].txt)L.push(['◆ '+t,g.c,13]);
  if(it.set){const S=SETS[it.set],own=EQ_SLOTS.filter(k=>ps.rpg.eq[k]&&ps.rpg.eq[k].set===it.set).length;
    L.push([`${S.n}  (${own}/${S.pieces.length})`,'#50e878',13]);
    for(const [n,mods] of S.bonus)L.push([`  (${n}) `+((S.txt&&S.txt[n])||modsText(mods)),own>=n?'#50e878':'#5a6a5a',12])}
  if(it.s==='weapon'){const f=weaponFx(it),wk=wKind(it),wn=(WTYPES[wk]||{n:wk==='staff'?'지팡이':'검'}).n;if(f)L.push([`무기 효과: ${f.n||WFX_NAME[f.p]} (${wn})${it.wt?' · 장착 시 캐릭터 무기 외형 변경':''}`,f.c,12])}
  L.push([`판매가 ${itemPrice(it)} 금${it.lk?'   🔒 잠금':''}`,it.lk?'#ffd24a':'#8a8070',11]);
  return L;
}
function drawItemTip(it,ps,x,y,w){
  let yy=y;for(const [t,c,s] of itemLines(it,ps)){for(const ln of wrap(t,w,s)){if(yy>512)return;txt(ln,x,yy+s/2,s,c,'left');yy+=s+4}}
}
function drawCompare(it,ps,x,y){
  const r=ps.rpg,sk=eqSlotFor(r,it),cur=r.eq[sk],ov=Object.assign({},r.eq,{[sk]:it});
  const a=ps.st,b=calcStats(ps,ov);
  txt(cur?`장착 시 변화 (vs ${cur.n})`:'장착 시 변화 (빈 칸)',x,y+8,13,'#ffd24a','left');
  const why=canEquip(ps,it);if(why){txt(`장착 불가: ${why}`,x,y+30,13,'#ff5050','left');return}
  const K=[['공격력',s=>s.pow*(1+s.atkPct/100)],['방어력',s=>s.def],['체력',s=>s.maxhp],['내공',s=>s.maxmp],['치명타',s=>s.crit,'%'],['치명 피해',s=>s.critDmg,'%'],['이동 속도',s=>s.mspd,'%'],
    ['생명 흡수',s=>s.ls,'%'],['피해 감소',s=>s.dr,'%'],['스킬 피해',s=>s.skillDmg,'%'],['재사용 감소',s=>s.cdr,'%'],['모든 스킬',s=>s.allSkill],['화염',s=>s.fire,'%'],['빙결',s=>s.ice,'%'],['뇌전',s=>s.bolt,'%'],['회피',s=>s.dodge,'%'],['아이템 발견',s=>s.mf,'%']];
  let yy=y+30,n=0;
  for(const [nm,f,u] of K){const d=f(b)-f(a);if(Math.abs(d)<.05)continue;if(n++>=10)break;
    txt(nm,x,yy,13,'#c8b890','left');txt(`${d>0?'▲ +':'▼ '}${fmt(d)}${u||''}`,x+220,yy,13,d>0?'#70ff90':'#ff6060','right',MONO);yy+=19}
  if(!n)txt('능력치 변화 없음',x,yy,13,'#888','left');
}
function drawSmithInfo(it,ps,x,y){
  const r=ps.rpg;panel(x-8,y-8,244,208,'#6a4a2a','rgba(40,20,5,.8)');
  txt('대장간',x+114,y+6,15,'#ffd24a');
  if(it.e<ENH_MAX){const c=enhCost(it);
    txt(`강화 +${it.e} → +${it.e+1}`,x,y+32,14,'#fff','left');txt(`성공률 ${ENH_RATE[it.e]}%`,x+228,y+32,14,ENH_RATE[it.e]>=80?'#70ff90':ENH_RATE[it.e]>=40?'#ffe060':'#ff7050','right');
    txt(`금화 ${c.gold}`,x,y+54,13,r.gold>=c.gold?'#ffd860':'#ff5050','left');txt(`강화석 ${c.stone}`,x+228,y+54,13,r.mats.stone>=c.stone?'#c8d8e8':'#ff5050','right');
    if(it.e>=7)txt('※ +7 이상 실패 시 1단계 하락',x,y+74,11,'#ff9070','left');
    txt('기본 능력 +10% · 옵션 +3% / 단계',x,y+92,11,'#a89878','left')}
  else txt('최대 강화 달성!',x+114,y+50,15,'#ffe060');
  if(it.g==='rare'||it.g==='epic'){const c=rerollCost(it);txt(`재련 (옵션 재설정)`,x,y+122,14,'#fff','left');
    txt(`금화 ${c.gold}`,x,y+144,13,r.gold>=c.gold?'#ffd860':'#ff5050','left');txt(`비급 조각 ${c.frag}`,x+228,y+144,13,r.mats.frag>=c.frag?'#e8b8ff':'#ff5050','right')}
  else txt('재련: 레어 · 에픽만 가능',x,y+122,12,'#777','left');
  const gn=salvageGain(it);txt(`분해 시: 강화석 ${gn.stone}${gn.frag?` · 비급 조각 ${gn.frag}`:''}`,x,y+176,12,'#a8b8c8','left');
}
const AWK1={proj:'투사체 +1',nova:'범위 +25%',rain:'타격 수 +40%',chain:'연쇄 +2',quake:'충격 +2',whirl:'지속 +30%',leap:'범위 +30%',summon:'소환 수 +1',buff:'지속 +50%',dash:'피해 +25%'};
const TYN={basic:'기본기 강화',cmd:'전용기 강화',sp:'필살기 강화',proj:'액티브 · 투사체',dash:'액티브 · 돌진',nova:'액티브 · 광역',rain:'액티브 · 낙하',chain:'액티브 · 연쇄',quake:'액티브 · 지면',
  whirl:'액티브 · 회전',leap:'액티브 · 도약',summon:'액티브 · 소환',buff:'액티브 · 강화',passive:'패시브',aura:'오라 (상시)'};
function skillEffect(s,ps,lv){
  if(lv<=0)return null;const e=ps.rpg.enh[s.id]||0,em=1+e*.08;
  if(s.ty==='basic')return `기본 공격 피해 +${fmt(s.v*lv*em)}%`;
  if(s.ty==='cmd')return `전용기 피해 +${fmt((s.v*lv+synPct(ps,s))*em)}% · 기력 소모 ${Math.max(10,20-Math.floor(lv/2))}`;
  if(s.ty==='sp')return `필살기 피해 +${fmt((s.v*lv+synPct(ps,s))*em)}% · 기력 소모 ${Math.max(30,50-lv)}`;
  if(s.mods)return Object.entries(s.mods).map(([k,v])=>afText(k,(v[0]+v[1]*(lv-1))*em,0)).join(' · ')+(s.ty==='buff'?` · ${s.dur}초`:'');
  if(s.ty==='aura')return s.aura==='heal'?`매초 체력 ${fmt((s.v+s.vr*(lv-1))*em)}% 회복`:s.aura==='mp'?`매초 내공 ${fmt((s.v+s.vr*(lv-1))*em)}% 회복`:`매초 공격력의 ${Math.round((s.d+s.dr*(lv-1))*em*100)}% 피해 (반경 ${s.r})`;
  return `피해: 공격력의 ${Math.round(skMult(ps,s,lv)*100)}%${s.el!=='phys'?` (${EL_NAME[s.el]})`:''}`;
}
function drawTabSkill(ps){
  const r=ps.rpg,hid=HEROES[ps.hero].id,cs=skillCells(ps),cur=MN.cur[1];
  panel(12,50,616,472);
  TREES[hid].forEach((n,tr)=>{const x=50+tr*196+27;txt(n,x,64,15,'#ffd24a');txt(`${treePts(ps,tr)}pt`,x+72,64,11,'#aaa','right',MONO)});
  for(let tr=0;tr<3;tr++)for(let ti=0;ti<4;ti++){const x=50+tr*196+27;const on=r.sk[`${hid}_${tr}${ti}`];ctx.strokeStyle=on?'#b8902a':'#3a2a1a';ctx.lineWidth=3;line(x,84+ti*84+54,x,84+(ti+1)*84)}
  cs.forEach((c,k)=>{const s=c.s,rk=r.sk[s.id]||0,lv=rk?skLv(ps,s.id):0;
    drawSkillIcon(s,ps,c.x,c.y,c.w,{sel:k===cur});
    txt(`${rk}/${s.max}`,c.x+c.w+4,c.y+c.h-8,11,rk?'#fff':'#777','left',MONO);
    if(lv>rk)txt(`(+${lv-rk})`,c.x+c.w+4,c.y+c.h-22,10,'#8ab8ff','left',MONO);
    if(r.enh[s.id])txt(`+${r.enh[s.id]}`,c.x+c.w-2,c.y+8,11,'#ffe060','right',MONO,['#000',3]);
    const hk=r.hot.indexOf(s.id);if(hk>=0){ctx.fillStyle='#ffd24a';ctx.fillRect(c.x-2,c.y-2,14,14);txt(kn(MN.i).sk[hk],c.x+5,c.y+5,10,'#000','center',MONO)}
    txt(`Lv${s.lv}`,c.x+c.w+4,c.y+8,10,ps.lvl>=s.lv?'#a89878':'#ff6050','left',MONO);
    txt(s.n,c.x+c.w/2,c.y+c.h+10,11,rk?'#e8d8c8':'#7a6a5a')});
  txt(`스킬 포인트  ${r.skillPts}`,30,506,17,r.skillPts?'#70ff90':'#aaa','left');
  txt('단축키',330,506,13,'#ffd24a','left');
  for(let k=0;k<4;k++){const x=390+k*56,id=r.hot[k];ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x,490,32,32);if(id)drawSkillIcon(SKILLS[id],ps,x,490,32,{hot:1});
    txt(kn(MN.i).sk[k],x+36,506,12,'#ffe890','left',MONO)}
  /* 툴팁 */
  panel(636,50,312,472);
  const s=cs[cur].s,rk=r.sk[s.id]||0,lv=rk?skLv(ps,s.id):0,e=r.enh[s.id]||0,col=skCol(s,ps);
  let y=72;const put=(t,c,sz,ind)=>{for(const ln of wrap(t,286-(ind||0),sz)){if(y>512)return;txt(ln,650+(ind||0),y,sz,c,'left');y+=sz+5}};
  put(s.n,col,20);put(`${TYN[s.ty]}  ·  ${TREES[hid][s.tr]} ${s.ti+1}단계`,'#a89878',12);
  put(`스킬 레벨 ${rk} / ${s.max}${lv>rk?`  (장비 +${lv-rk})`:''}${e?`   강화 +${e}${e>=10?' [각성 II]':e>=5?' [각성 I]':''}`:''}`,'#fff',13);
  put(`습득 레벨 ${s.lv}${s.ti?`  ·  선행: ${HSK[hid].find(o=>o.tr===s.tr&&o.ti===s.ti-1).n}`:''}`,ps.lvl>=s.lv?'#c8b890':'#ff6050',12);
  y+=4;put(s.f,'#e8dcc0',13);y+=4;
  if(lv)put('현재: '+skillEffect(s,ps,lv),'#70ff90',13);
  if(rk<s.max)put('다음: '+skillEffect(s,ps,(lv||0)+1+(lv?0:ps.st.allSkill+ps.st.tree[s.tr])),'#8ab8ff',13);
  if(ACTIVE_TY[s.ty]){const L=Math.max(1,lv);put(`내공 ${skCost(ps,s,L)}  ·  재사용 대기 ${fmt(skCd(ps,s,L)/60)}초`,'#9fc8ff',12)}
  if(s.syn.length){y+=4;put('시너지 (다른 스킬 1레벨당)','#ffd24a',12);
    for(const [id,p] of s.syn)put(`「${SKILLS[id].n}」 +${p}%  (현재 +${(r.sk[id]||0)*p}%)`,(r.sk[id]||0)?'#ffe8a8':'#7a6a5a',12,8)}
  const tp=treePts(ps,s.tr);if(ACTIVE_TY[s.ty]&&s.ty!=='buff')put(`계열 숙련: 이 계열 투자 포인트당 스킬 피해 +1% (현재 +${tp}%)`,'#c8a870',11);
  y+=4;
  if(e<SKE_MAX){const c=skEnhCost(e);put(`스킬 강화 +${e}→+${e+1}  성공률 ${SKE_RATE[e]}%  (금화 ${c.gold} · 비급 조각 ${c.frag})`,'#e8b8ff',12)}
  put(`+5 각성 I: ${ACTIVE_TY[s.ty]?AWK1[s.ty]:'효과 +40%'}  ·  +10 각성 II: ${ACTIVE_TY[s.ty]?'내공·재사용 -30%':'효과 +80%'}`,'#b890d0',11);
}
function drawTabStat(ps){
  const r=ps.rpg,s=ps.st;
  panel(12,50,440,472);panel(460,50,488,472);
  txt(`능력치 포인트  ${r.statPts}`,232,76,18,r.statPts?'#70ff90':'#aaa');
  STAT_INFO.forEach(([n,k,d],j)=>{const y=110+j*78,on=j===MN.cur[2];
    ctx.fillStyle=on?'rgba(120,40,10,.6)':'rgba(0,0,0,.35)';ctx.fillRect(26,y,412,66);if(on){ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(26,y,412,66)}
    txt(n,44,y+20,20,'#ffe8a8','left');txt(String(s[k]),230,y+20,20,'#fff','right',MONO);
    const bonus=s[k]-r[k];if(bonus)txt(`(+${bonus})`,238,y+20,12,'#8ab8ff','left',MONO);
    if(r.statPts>0)txt('[+]',424,y+20,16,'#70ff90','right',MONO);
    txt(d,44,y+48,11,'#b8a888','left')});
  txt(`경험치 ${ps.lvl>=MAXLV?'MAX':`${ps.exp} / ${expNeed(ps.lvl)}`}`,232,436,13,'#c0ff9a');
  bar(60,448,344,10,ps.lvl>=MAXLV?1:ps.exp,ps.lvl>=MAXLV?1:expNeed(ps.lvl),'#c0ff9a','#408020');
  txt(`회차 ${cycleName(G.cycle)} · 전장 레벨 ${Wd&&MN.back==='play'?Wd.lv:'-'}`,232,480,12,'#a89878');
  const red=Math.round(s.def/(s.def+40+12*((Wd&&MN.back==='play'&&Wd.lv)||ps.lvl))*100);
  const L=[['공격력',Math.round(s.pow*(1+s.atkPct/100))],['공격력 증가',fmt(s.atkPct)+'%'],['방어력',`${s.def} (피해 -${Math.min(75,red)}%)`],['받는 피해 감소',fmt(s.dr)+'%'],
    ['최대 체력 · 내공 · 기력',`${s.maxhp} · ${s.maxmp} · ${s.maxki}`],['초당 회복 (체력 · 내공)',`${fmt(s.hpRegen)} · ${fmt(s.mpRegen)}`],
    ['치명타 (확률 · 피해)',`${fmt(s.crit)}% · ${fmt(s.critDmg)}%`],['회피 · 이동 속도',`${fmt(s.dodge)}% · ${fmt(s.mspd)}%`],['생명력 흡수',fmt(s.ls)+'%'],
    ['재사용 감소',fmt(s.cdr)+'%'],['스킬 피해',fmt(s.skillDmg)+'%'],['기본 공격 피해',fmt(s.basicDmg)+'%'],['전용기 / 필살기',`${fmt(s.cmdDmg)}% / ${fmt(s.spDmg)}%`],
    ['화염 / 빙결 / 뇌전',`${fmt(s.fire)} / ${fmt(s.ice)} / ${fmt(s.bolt)}%`],['기력 획득',fmt(s.kiGain)+'%'],['금화 / 아이템 발견',`${fmt(s.gf)} / ${fmt(s.mf)}%`],['경험치 보너스',fmt(s.exp)+'%'],['모든 스킬',`+${s.allSkill}`]];
  L.forEach(([n,v],k)=>{const y=70+k*19;txt(n,478,y,13,'#c8b890','left');txt(String(v),934,y,13,'#fff','right',MONO)});
  let y=70+L.length*19+6;
  for(const [k,n] of s.sets){if(y>506)break;const S=SETS[k];txt(`${S.n} (${n}/${S.pieces.length})`,478,y,12,'#50e878','left');y+=15;
    for(const [c,mods] of S.bonus)if(n>=c&&y<=508){txt(`  (${c}) `+((S.txt&&S.txt[c])||modsText(mods)),478,y,11,'#80c890','left');y+=14}}
}
function drawTabSys(){
  panel(W/2-220,80,440,300);
  txt('시스템',W/2,108,20,'#ffd24a');
  sysOpts().forEach((o,k)=>{const y=150+k*48,on=k===MN.cur[4];ctx.fillStyle=on?'rgba(120,30,10,.9)':'rgba(0,0,0,.5)';ctx.fillRect(W/2-180,y-18,360,36);
    if(on){ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(W/2-180,y-18,360,36)}txt(o.n,W/2,y,17,on?'#fff':'#b8a080')});
  txt('※ 저장 시 캐릭터 · 장비 · 스킬 · 전장 진행도가 기록됩니다.',W/2,410,13,'#a89878');
  txt('   전장 도중 저장한 기록은 불러오면 군영에서 시작합니다.',W/2,430,13,'#a89878');
}

/* ================= 저장 슬롯 ================= */
let SL=null;
function openSlots(mode,back,extra){SL={mode,back,idx:mode==='load'?0:1,msg:null,conf:null,extra};scene='slots';clearPressed()}
function slotList(){return SL.mode==='load'?[0,1,2,3]:[1,2,3]}
function leaveSlots(){const b=SL.back,x=SL.extra;SL=null;
  if(b==='menuback'&&x){openMenu(x.i,x.back,4);return}
  scene=b;clearPressed()}
function updSlots(){
  const L=slotList();if(SL.msg&&++SL.msg.t>120)SL.msg=null;
  if(hit('up')){SL.idx=L[(L.indexOf(SL.idx)+L.length-1)%L.length];SL.conf=null;sfx('sel')}
  if(hit('down')){SL.idx=L[(L.indexOf(SL.idx)+1)%L.length];SL.conf=null;sfx('sel')}
  if(hit('jump')||hit('pause')){leaveSlots();sfx('sel');return}
  const d=readSave(SL.idx);
  if(hit('sp')&&d&&SL.idx>0){if(SL.conf!=='del'){SL.conf='del';SL.msg={t:0,txt:'한 번 더 누르면 기록을 삭제합니다',col:'#ffb070'}}else{deleteSave(SL.idx);SL.conf=null;SL.msg={t:0,txt:'삭제했습니다',col:'#ff9080'}}}
  if(hit('atk')||hit('start')){
    if(SL.mode==='load'){if(!d){SL.msg={t:0,txt:'빈 슬롯입니다',col:'#ff9080'};sfx('noMp');return}sfx('ok');const k=SL.idx;SL=null;if(!loadGame(k)){scene='title'}return}
    if(d&&SL.conf!=='ow'){SL.conf='ow';SL.msg={t:0,txt:'덮어쓸까요? 한 번 더 누르세요',col:'#ffb070'};return}
    const ok=saveGame(SL.idx);G.slot=SL.idx;SL.conf=null;SL.msg={t:0,txt:ok?`슬롯 ${SL.idx} 에 저장했습니다`:'저장 실패 (브라우저 저장소를 확인하세요)',col:ok?'#b0ffb0':'#ff5050'};sfx(ok?'ok':'noMp')}
}
function drawSlots(){
  if(SL.back==='title')drawTitleBG();else if(SL.extra&&SL.extra.back==='play')drawPlay();else drawCampBG();
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,H);
  txt(SL.mode==='load'?'불 러 오 기':'저 장 하 기',W/2,48,30,'#ffd24a','center',FONT,['#300',6]);
  slotList().forEach((k,j)=>{const y=96+j*98,on=k===SL.idx,d=readSave(k),ds=saveDesc(d);
    ctx.fillStyle=on?'rgba(110,30,10,.9)':'rgba(20,10,4,.88)';ctx.fillRect(140,y,680,86);ctx.strokeStyle=on?'#ffd24a':'#6a4a2a';ctx.lineWidth=on?3:1;ctx.strokeRect(140,y,680,86);
    txt(k===0?'자동 저장':`슬롯 ${k}`,160,y+22,16,k===0?'#8ad0ff':'#ffe8a8','left');
    if(ds){txt(ds.heroes,300,y+22,17,'#fff','left');txt(ds.info,300,y+50,13,'#c8b890','left');txt(ds.date,800,y+72,11,'#888','right',MONO);
      d.pl.forEach((q,m)=>{const h=HEROES[q.hero];ctx.save();ctx.beginPath();ctx.rect(150+m*62,y+32,60,52);ctx.clip();renderModel(ctx,heroLook(q),poseOf({look:h.look,state:'idle',anim:frame+m*20,t:0,h}),180+m*62,y+150,1.2,1,{});ctx.restore()})}
    else txt('— 비어 있음 —',480,y+44,15,'#6a5a40')});
  txt(`${KN[0].atk}/ENTER ${SL.mode==='load'?'불러오기':'저장'}  ·  ${KN[0].sp} 삭제  ·  ${KN[0].jump}/ESC 돌아가기`,W/2,H-16,13,'#aaa');
  if(SL.msg){txt(SL.msg.txt,W/2,H-44,17,SL.msg.col,'center',FONT,['#000',4])}
}

/* ================= 군영 ================= */
let campIdx=0,campSub=null,campPl=0;
function campOpts(){
  const o=[];
  if(!G.done){const k=ORDER[Math.min(G.prog,LAST_ORD)];o.push({k:'go',n:`출진 — ${STAGES[k].title.replace(/\s+/g,' ')}  (적 Lv.${Math.min(MAXLV,STAGE_LV[k]+G.cycle*33)}~)`})}
  else o.push({k:'cycle',n:`윤회 — ${G.cycle+2}회차 「${cycleName(G.cycle+1)}」 시작`});
  o.push({k:'sel',n:'전장 선택 (재도전 · 파밍)'});
  const pl=G.np===2?`  ◀ ${campPl+1}P ▶`:'';
  o.push({k:'char',n:'장비 · 스킬 · 능력치'+pl},{k:'smith',n:'대장간 (강화 · 재련 · 분해)'+pl},{k:'shop',n:'상인 (보급품 · 비단 보따리)'+pl},{k:'gacha',n:'도박장 (천명 뽑기 · 복주머니)'+pl},{k:'save',n:'저장하기'},{k:'title',n:'타이틀로'});
  return o;
}
function stageChoices(){const L=[];for(let k=0;k<=Math.min(G.prog,LAST_ORD);k++)L.push(ORDER[k]);if(G.treasures.book&&G.treasures.seal&&G.treasures.sword&&G.clears[G.cycle+':'+ORDER[LAST_ORD]])L.push(5);return L}
function updCamp(){
  if(campMsg&&++campMsg.t>400)campMsg=null;
  if(campSub==='stage'){const L=stageChoices();
    if(hit('up')){campSub2=(campSub2+L.length-1)%L.length;sfx('sel')}
    if(hit('down')){campSub2=(campSub2+1)%L.length;sfx('sel')}
    if(hit('jump')||hit('pause')){campSub=null;sfx('sel');return}
    if(hit('atk')||hit('start')){sfx('ok');campSub=null;startStage(L[campSub2])}
    return}
  if(campSub==='cycle'){if(hit('atk')||hit('start')){G.cycle++;G.prog=0;G.done=false;G.treasures={};G.flags={};applyTreasures();campSub=null;sfx('treasure');startStage(0)}
    else if(hit('jump')||hit('pause')){campSub=null}return}
  const O=campOpts();
  if(hit('up')){campIdx=(campIdx+O.length-1)%O.length;sfx('sel')}
  if(hit('down')){campIdx=(campIdx+1)%O.length;sfx('sel')}
  const o=O[campIdx];
  if(G.np===2&&(hit('left')||hit('right'))&&['char','smith','shop','gacha'].includes(o.k)){campPl^=1;sfx('sel')}
  for(let i=0;i<G.np;i++)if(phit(i,'menu')){openMenu(i,'camp');return}
  if(hit('atk')||hit('start')){sfx('ok');
    switch(o.k){
      case'go':startStage(ORDER[Math.min(G.prog,LAST_ORD)]);break;
      case'cycle':campSub='cycle';break;
      case'sel':campSub='stage';campSub2=Math.min(G.prog,stageChoices().length-1);break;
      case'char':openMenu(campPl,'camp',0);break;
      case'smith':openMenu(campPl,'camp',3);break;
      case'shop':openShop(campPl);break;
      case'gacha':openGacha(campPl);break;
      case'save':openSlots('save','camp');break;
      case'title':scene='title';G=null;break;
    }}
}
let campSub2=0;
function drawCampBG(){
  if(!BG||BG.kind!=='plains')buildBG('plains');
  drawPixelBG(400,frame);
  ctx.fillStyle='rgba(8,6,30,.62)';ctx.fillRect(0,0,W,H);
  /* 모닥불 */
  const fx=250,fy=430;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55+.1*Math.sin(frame*.3);ctx.drawImage(glowSpr('#ff8a30'),fx-160,fy-160,320,220);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#4a2a14';ctx.fillRect(fx-24,fy-6,48,8);ctx.fillRect(fx-18,fy-10,36,6);
  if(frame%2===0)emit({x:fx+rnd(-12,12),y:fy,z:rnd(0,10),vz:rnd(1.5,3.5),vx:rnd(-.4,.4),col:Math.random()<.5?'#ff7a20':'#ffd060',size:rnd(8,16),life:rnd(18,30)});
  updParticles();drawParticleLayers(0);
  /* 천막 */
  ctx.fillStyle='#6a3a1a';ctx.beginPath();ctx.moveTo(40,420);ctx.lineTo(120,300);ctx.lineTo(200,420);ctx.fill();ctx.fillStyle='#3a1a0a';ctx.beginPath();ctx.moveTo(105,420);ctx.lineTo(120,340);ctx.lineTo(135,420);ctx.fill();
  if(G)G.pl.forEach((s,k)=>{const h=HEROES[s.hero],lk=heroLook(s);renderModel(ctx,lk,poseOf({look:lk,state:'idle',anim:frame+k*30,t:0,h}),330+k*70,470,1.3,-1,{})});
  drawCampNpcs();
}
function drawCamp(){
  drawCampBG();
  txt('군 영 (軍營)',W/2,34,30,'#ffd24a','center',FONT,['#300',6]);
  txt(`${cycleName(G.cycle)} · 난이도 ${DIFFS[G.diffIdx].name}${G.done?' · 천하 평정 완료':''}`,W/2,64,14,'#ffe8a8','center',FONT,['#000',4]);
  const O=campOpts();
  panel(W-500,86,480,O.length*40+24);
  O.forEach((o,k)=>{const y=110+k*40,on=k===campIdx;ctx.fillStyle=on?'rgba(120,30,10,.9)':'rgba(0,0,0,.4)';ctx.fillRect(W-484,y-16,448,32);
    if(on){ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(W-484,y-16,448,32)}txt(o.n,W-470,y,15,on?'#fff':o.k==='cycle'?'#ff9a70':'#c8b890','left')});
  /* 파티 정보 */
  G.pl.forEach((s,k)=>{const x=20+k*230,y=90,h=HEROES[s.hero],r=s.rpg;panel(x,y,220,128);
    txt(`${G.np===2?(k+1)+'P ':''}${h.name}  Lv.${s.lvl}`,x+12,y+18,16,h.fx,'left');
    bar(x+12,y+32,196,7,s.lvl>=MAXLV?1:s.exp,s.lvl>=MAXLV?1:expNeed(s.lvl),'#c0ff9a','#408020');
    txt(`금화 ${r.gold}`,x+12,y+54,13,'#ffd860','left');txt(`강화석 ${r.mats.stone} · 비급 ${r.mats.frag}`,x+208,y+54,12,'#c8d8e8','right');
    txt(`보관 장비 ${r.bag.length}개 (등급별 100칸)`,x+12,y+76,12,'#aaa','left');
    if(r.statPts)txt(`능력치 포인트 ${r.statPts}`,x+12,y+98,12,'#70ff90','left');
    if(r.skillPts)txt(`스킬 포인트 ${r.skillPts}`,x+120,y+98,12,'#70ff90','left');
    txt(`점수 ${s.score}`,x+208,y+116,11,'#888','right',MONO)});
  if(campMsg){const a=Math.min(1,(400-campMsg.t)/40);ctx.globalAlpha=a;ctx.font=`bold 15px ${FONT}`;const tw=Math.min(W-40,ctx.measureText(campMsg.txt).width+30);
    ctx.fillStyle='rgba(0,0,0,.85)';ctx.fillRect(W/2-tw/2,H-80,tw,32);txt(campMsg.txt,W/2,H-64,15,'#ffe8a8');ctx.globalAlpha=1}
  txt(`↑↓ 선택 · ${KN[0].atk}/ENTER 결정${G.np===2?' · ←→ 플레이어':''} · ${KN[0].menu} 캐릭터 창`,W/2,H-14,12,'#aaa');
  if(campSub==='stage'){const L=stageChoices();panel(W/2-260,120,520,L.length*44+70,'#ffd24a');txt('전장 선택',W/2,146,20,'#ffd24a');
    L.forEach((k,j)=>{const y=184+j*44,on=j===campSub2,S=STAGES[k],lv=Math.min(MAXLV,STAGE_LV[k]+G.cycle*33);ctx.fillStyle=on?'rgba(120,30,10,.9)':'rgba(0,0,0,.4)';ctx.fillRect(W/2-240,y-18,480,36);
      txt(`${S.title.replace(/\s+/g,' ')} — ${S.sub}`,W/2-224,y,15,on?'#fff':'#c8b890','left');txt(`적 Lv.${lv}~${Math.min(MAXLV,lv+6)}${G.clears[G.cycle+':'+k]?'  ✔':''}`,W/2+224,y,13,'#ffe890','right')});
    txt(`${KN[0].jump}/ESC 취소`,W/2,120+L.length*44+56,12,'#aaa')}
  if(campSub==='cycle'){panel(W/2-300,150,600,210,'#ff7050');txt(`${G.cycle+2}회차 「${cycleName(G.cycle+1)}」`,W/2,186,24,'#ff9a70');
    ['적의 레벨이 +33 오르고 더 강한 정예가 등장합니다.','에픽 · 세트 · 전용 · 신화 장비의 등장 확률이 오릅니다.','숨겨진 보물은 다시 찾아야 하며, 첫 평정 보상을 다시 받을 수 있습니다.','캐릭터 · 장비 · 스킬은 그대로 이어집니다.'].forEach((l,j)=>txt(l,W/2,224+j*26,14,'#e8d8c8'));
    txt(`${KN[0].atk}/ENTER 시작  ·  ${KN[0].jump} 취소`,W/2,340,14,'#ffe060')}
}

/* ================= 상인 ================= */
let SHOP=null;
const GOODS=[
 {k:'elixir',n:'선단',d:'체력 60% 회복 (보관 아이템)',p:()=>120},
 {k:'wine',n:'술',d:'기력 +50 (보관 아이템)',p:()=>80},
 {k:'knife',n:'비도 ×5',d:'던지는 단검',p:()=>60},
 {k:'bomb',n:'화약통 ×2',d:'던지면 폭발',p:()=>100},
 {k:'tactic',n:'병법서',d:'10초간 공격력 1.5배',p:()=>150},
 {k:'shield',n:'금강부',d:'8초간 받는 피해 70% 감소',p:()=>150},
 {k:'stone',n:'강화석',d:'장비 강화 재료',p:ps=>150+ps.lvl*5},
 {k:'frag',n:'비급 조각',d:'스킬 강화 · 재련 재료',p:ps=>600+ps.lvl*20},
 {k:'gamble',n:'비단 보따리',d:'내 레벨의 무작위 장비 (레어 이상 확률↑)',p:ps=>300+ps.lvl*40},
 {k:'gamble2',n:'황금 보따리',d:'에픽 이상 등급 보장 장비',p:ps=>3000+ps.lvl*300},
 {k:'skbook',n:'비급서',d:'스킬 포인트 +1 (구매할수록 비싸짐)',p:ps=>3000*(1+ps.rpg.books)},
 {k:'forget',n:'망각의 물약',d:'능력치 · 스킬 포인트 전부 초기화',p:ps=>1000+ps.lvl*50}];
function openShop(i){SHOP={i,idx:0,msg:null};scene='shop';clearPressed()}
function buyGood(ps,g){
  const r=ps.rpg,price=g.p(ps);
  if(r.gold<price)return{msg:'금화가 부족합니다'};
  if(ITEMS[g.k]&&ITEMS[g.k].use){const info=ITEMS[g.k];let slot=ps.inv.find(q=>q.kind===g.k);
    if(!slot){if(ps.inv.length>=8)return{msg:'보관함(8칸)이 가득 찼습니다'};slot={kind:g.k,n:0};ps.inv.push(slot)}
    if(slot.n>=info.max)return{msg:'더 가질 수 없습니다'};slot.n=Math.min(info.max,slot.n+info.n);r.gold-=price;return{ok:1,msg:`${g.n} 구매`}}
  if(g.k==='stone'||g.k==='frag'){r.mats[g.k]++;r.gold-=price;return{ok:1,msg:`${g.n} +1`}}
  if(g.k==='skbook'){r.skillPts++;r.books++;r.gold-=price;recalc(ps);return{ok:1,msg:'비급서를 읽었다! 스킬 포인트 +1'}}
  if(g.k==='forget'){r.gold-=price;resetBuild(ps);return{ok:1,msg:'모든 포인트가 초기화되었습니다'}}
  if(g.k==='gamble'||g.k==='gamble2'){
    let gr=g.k==='gamble'?rollGrade(ps.st.mf,'gamble'):wpick({epic:70,set:15,excl:10,myth:ps.lvl>=55?5:0});
    const it=genItem(ps.lvl,gr,{heroes:[HEROES[ps.hero].id]});if(bagFull(r,it.g))return{msg:`${GRADES[it.g].n} 보관함이 가득 찼습니다 (구매 취소)`};it.nw=true;r.bag.push(it);r.gold-=price;
    return{ok:1,msg:`[${GRADES[it.g].n}] ${it.n} 획득!`,col:GRADES[it.g].c,big:GRADES[it.g].rank>=3}}
  return{msg:'?'};
}
function updShop(){
  const ps=G.pl[SHOP.i];if(SHOP.msg&&++SHOP.msg.t>150)SHOP.msg=null;
  if(hit('up')){SHOP.idx=(SHOP.idx+GOODS.length-1)%GOODS.length;sfx('sel')}
  if(hit('down')){SHOP.idx=(SHOP.idx+1)%GOODS.length;sfx('sel')}
  if(G.np===2&&(hit('left')||hit('right'))){SHOP.i^=1;sfx('sel')}
  if(hit('jump')||hit('pause')){scene='camp';SHOP=null;clearPressed();return}
  if(hit('atk')||hit('start')){const res=buyGood(ps,GOODS[SHOP.idx]);SHOP.msg={t:0,txt:res.msg,col:res.col||(res.ok?'#b0ffb0':'#ff8080')};sfx(res.ok?(res.big?'treasure':'item'):'noMp')}
}
function drawShop(){
  drawCampBG();ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,W,H);
  const ps=G.pl[SHOP.i],r=ps.rpg;
  txt('상 인',W/2,34,28,'#ffd24a','center',FONT,['#300',6]);
  txt(`${G.np===2?`◀ ${SHOP.i+1}P ▶ `:''}${HEROES[ps.hero].name} Lv.${ps.lvl}   ·   금화 ${r.gold}   ·   강화석 ${r.mats.stone} · 비급 조각 ${r.mats.frag}`,W/2,64,14,'#ffd860');
  panel(120,84,720,GOODS.length*30+18);
  GOODS.forEach((g,k)=>{const y=104+k*30,on=k===SHOP.idx,pr=g.p(ps);ctx.fillStyle=on?'rgba(120,30,10,.9)':'rgba(0,0,0,.3)';ctx.fillRect(132,y-13,696,26);
    if(on){ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(132,y-13,696,26)}
    if(ITEMS[g.k]&&ITEMS[g.k].use){ctx.save();ctx.translate(152,y+8);ctx.scale(.7,.7);drawItemIcon(g.k,0,0,frame);ctx.restore()}
    txt(g.n,174,y,15,on?'#fff':'#e8d8c8','left');txt(g.d,330,y,13,'#b8a888','left');txt(`${pr} 금`,816,y,14,r.gold>=pr?'#ffd860':'#aa5040','right',MONO)});
  txt(`↑↓ 선택 · ${KN[0].atk}/ENTER 구매 · ${KN[0].jump}/ESC 나가기   (장비 판매는 캐릭터 창에서 ${KN[0].item})`,W/2,H-14,12,'#aaa');
  if(SHOP.msg){txt(SHOP.msg.txt,W/2,H-44,18,SHOP.msg.col,'center',FONT,['#000',5])}
}

/* ================= 도움말 3쪽: RPG 안내 ================= */
function drawRpgHelp(){
  const L=[
   ['성장','적을 쓰러뜨리면 경험치(파티 공유). 최대 Lv.100 · 레벨마다 능력치 5 · 스킬 1 포인트, 체력/내공/기력 최대치 증가'],
   ['자원','체력(HP) · 내공(MP, 스킬 사용 · 자동 회복) · 기력(전용기/필살기, 때리고 맞으면 충전)'],
   ['스킬','무장마다 3계열 × 5단계 = 15개 전용 스킬 · 1~4 키로 단축 스킬 사용 (2P: [ ] \' \\)'],
   ['강화·시너지','스킬 강화 +10 (비급 조각) · +5/+10 각성 · 같은 계열 스킬끼리 시너지 · 계열 숙련 보너스'],
   ['장비','무기 · 갑옷 · 투구 · 장갑 · 신발 · 벨트 · 망토 · 목걸이 · 반지×2 · 스킬북 (착용 레벨 제한)'],
   ['등급','노멀 < 레어 < 에픽 < 세트 < 전용(무장 한정) < 신화 — 옵션 수 · 수치 · 고유 효과가 달라짐'],
   ['원소 반응','화상+뇌전=폭뢰 · 빙결+화염=융해 · 빙결+강타=빙쇄 · 감전+빙결=초전도'],
   ['정예','이름이 금색인 정예 적은 광폭·신속·강철·화염·흡혈·뇌운·한기 능력을 지니며 좋은 장비를 떨군다'],
   ['군영','스테이지 사이 휴식처: 대장간(강화 +15 · 재련 · 분해) · 상인 · 저장 · 전장 재도전'],
   ['연출','콤보 HITS · 3단계+ 스킬 슈퍼 플래시 · 5단계 각성기 컷인 · 신화 무기 전용 필살기 6종'],
   ['도박장','천명 뽑기(확률 공개 · 10연 세트 이상 보장 · 50회 천장) · 비급 복주머니'],
   ['윤회','엔딩 후 더 강한 회차(악몽 · 연옥 · 무간)로 이어서 성장 · 저장: 슬롯 3개 + 자동 저장']];
  txt('RPG 시스템 안내',W/2,70,20,'#ffd24a');
  L.forEach(([a,b],k)=>{const y=96+k*31;txt(a,120,y,15,'#ffd24a','right');txt(b,136,y,14,'#e8d8c8','left')});
  txt('Tab: 캐릭터 창 (장비 · 스킬 · 능력치 · 대장간 · 시스템)   ·   2P 캐릭터 창: = 키',W/2,H-48,14,'#9fe0ff');
}
function drawTitleBG(){if(!BG||BG.kind!=='fortress')buildBG('fortress');drawPixelBG(frame*1.5,frame);ctx.fillStyle='rgba(20,0,0,.45)';ctx.fillRect(0,0,W,H)}

/* ================= 도박장 (확률형 뽑기) ================= */
const GACHA_ODDS=[['rare',55],['epic',30],['set',8],['excl',5],['myth',2]];
const POUCH_ODDS=[['stone',50,'강화석 1~3개'],['frag',30,'비급 조각 1~2개'],['refund',12,'금화 2배 환급'],['book',5,'비급서 (스킬 포인트 +1)'],['jack',3,'대박! 강화석 10 + 비급 조각 3']];
const PITY_MAX=50;
const gachaPrice=ps=>600+ps.lvl*40,pouchPrice=ps=>300+ps.lvl*15;
let GC=null;
function openGacha(i){GC={i,idx:0,res:null,t:0,msg:null,flash:null};scene='gacha';clearPressed()}
function gachaGrade(ps,guarantee){
  const r=ps.rpg;r.pity=(r.pity||0)+1;let g;
  if(r.pity>=PITY_MAX)g=Math.random()<.6?'excl':'myth';
  else{g=wpick(Object.fromEntries(GACHA_ODDS));if(guarantee&&GRADES[g].rank<3)g=wpick({set:60,excl:28,myth:12})}
  if(GRADES[g].rank>=4)r.pity=0;
  return g;
}
function gachaItem(ps,g){
  const hid=HEROES[ps.hero].id;
  if(g==='excl'||g==='myth'){const pool=UNIQ_BY_G[g].filter(k=>g==='myth'||UNIQ[k].h===hid),k=pick(pool);return genUniq(k,Math.max(ps.lvl,UNIQ[k].req))}
  if(g==='set'){const k=pick(Object.keys(SETS));return genSet(k,Math.max(ps.lvl,SETS[k].req))}
  return genItem(ps.lvl,g,{});
}
const revT=(k,n)=>n===1?34:20+k*9;
function doGacha(n){
  const ps=G.pl[GC.i],r=ps.rpg,price=n===1?gachaPrice(ps):gachaPrice(ps)*9;
  if(r.gold<price){GC.msg={t:0,txt:'금화가 부족합니다',col:'#ff8080'};sfx('noMp');return}
  r.gold-=price;const res=[];let hi=false;
  for(let k=0;k<n;k++){const g=gachaGrade(ps,n===10&&k===n-1&&!hi);if(GRADES[g].rank>=3)hi=true;
    const it=gachaItem(ps,g);let note='';
    if(!bagFull(r,it.g)){it.nw=true;r.bag.push(it)}else{const gn=salvageGain(it);r.mats.stone+=gn.stone;r.mats.frag+=gn.frag;note='가방 가득 → 자동 분해'}
    res.push({it,note,rank:GRADES[it.g].rank,col:GRADES[it.g].c})}
  GC.res=res;GC.t=0;sfx('gong');
}
function doPouch(){
  const ps=G.pl[GC.i],r=ps.rpg,price=pouchPrice(ps);
  if(r.gold<price){GC.msg={t:0,txt:'금화가 부족합니다',col:'#ff8080'};sfx('noMp');return}
  r.gold-=price;const k=wpick(Object.fromEntries(POUCH_ODDS.map(o=>[o[0],o[1]])));let txt_,rank=1,col='#c8d8e8';
  if(k==='stone'){const n=1+((Math.random()*3)|0);r.mats.stone+=n;txt_=`강화석 +${n}`}
  else if(k==='frag'){const n=1+((Math.random()*2)|0);r.mats.frag+=n;txt_=`비급 조각 +${n}`;col='#e8b8ff';rank=2}
  else if(k==='refund'){r.gold+=price*2;txt_=`금화 +${price*2}`;col='#ffd860';rank=2}
  else if(k==='book'){r.skillPts++;recalc(ps);txt_='비급서! 스킬 포인트 +1';col='#ff9a30';rank=4}
  else{r.mats.stone+=10;r.mats.frag+=3;txt_='대박! 강화석 +10 · 비급 조각 +3';col='#ff4a4a';rank=5}
  GC.res=[{pouch:true,txt:txt_,rank,col}];GC.t=0;sfx('gong');
}
function updGacha(){
  GC.t++;if(GC.msg&&++GC.msg.t>150)GC.msg=null;if(GC.flash&&++GC.flash.t>30)GC.flash=null;
  if(GC.res){const n=GC.res.length,end=revT(n-1,n)+8;
    GC.res.forEach((c,k)=>{if(GC.t===revT(k,n)){sfx(c.rank>=4?'treasure':c.rank>=3?'lvl':'item');if(c.rank>=4)GC.flash={t:0,col:c.col,big:c.rank>=5}}});
    if(hit('atk')||hit('start')||hit('jump')||hit('pause')){if(GC.t<end)GC.t=end;else GC.res=null}
    return}
  const O=4;
  if(hit('up')){GC.idx=(GC.idx+O-1)%O;sfx('sel')}
  if(hit('down')){GC.idx=(GC.idx+1)%O;sfx('sel')}
  if(G.np===2&&(hit('left')||hit('right'))){GC.i^=1;sfx('sel')}
  if(hit('jump')||hit('pause')){scene='camp';GC=null;clearPressed();return}
  if(hit('atk')||hit('start')){if(GC.idx===0)doGacha(1);else if(GC.idx===1)doGacha(10);else if(GC.idx===2)doPouch();else{scene='camp';GC=null;clearPressed()}}
}
function drawGachaCard(c,x,y,w,h,k,n){
  const dt=GC.t-revT(k,n),cx=x+w/2;
  if(dt<-6){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#5a1010');g.addColorStop(1,'#2a0606');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#d4af37';ctx.lineWidth=2;ctx.strokeRect(x+4,y+4,w-8,h-8);txt('天命',cx,y+h/2,Math.min(w,h)*.26,'#e0b040','center',HANJA,['#300',4]);
    if(dt>-20){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.3*Math.sin(frame*.8);ctx.drawImage(glowSpr(c.col),x-10,y-10,w+20,h+20);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}return}
  ctx.save();ctx.translate(cx,y);ctx.scale(dt<0?Math.max(.05,-dt/6):Math.min(1,.2+dt/5),1);ctx.translate(-cx,-y);
  ctx.fillStyle='#120a06';ctx.fillRect(x,y,w,h);
  if(c.rank>=3){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.15*Math.sin(frame*.15);ctx.drawImage(glowSpr(c.col),x-20,y-20,w+40,h+40);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  ctx.fillStyle=hexA(c.col,.18);ctx.fillRect(x,y,w,h);ctx.strokeStyle=c.col;ctx.lineWidth=c.rank>=4?4:2;ctx.strokeRect(x+1,y+1,w-2,h-2);
  if(dt>=0){
    if(c.pouch){txt('福',cx,y+h*.38,h*.3,c.col,'center',HANJA,['#000',4]);wrap(c.txt,w-12,13).forEach((l,j)=>txt(l,cx,y+h*.72+j*16,13,'#fff'))}
    else{const it=c.it,isz=Math.min(w*.62,h*.42);
      if(c.rank>=3){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=hexA(c.col,.25);ctx.lineWidth=3;for(let q=0;q<8;q++){const a=frame*.02+q*Math.PI/4;line(cx,y+h*.33,cx+Math.cos(a)*w*.6,y+h*.33+Math.sin(a)*w*.6)}ctx.globalCompositeOperation='source-over'}
      drawGearIcon(it,cx,y+h*.33,isz);
      txt(`${GRADES[it.g].n} ${SLOTS[it.s].n}`,cx,y+h*.64,11,c.col);
      wrap(it.n,w-10,h>210?13:11).slice(0,2).forEach((l,j)=>txt(l,cx,y+h*.76+j*15,h>210?13:11,'#fff'));
      if(c.note)txt(c.note,cx,y+h-10,10,'#ff9080')}}
  ctx.restore();
}
function drawGacha(){
  drawCampBG();ctx.fillStyle='rgba(10,0,0,.72)';ctx.fillRect(0,0,W,H);
  const ps=G.pl[GC.i],r=ps.rpg;
  txt('도 박 장 — 천 명 뽑 기',W/2,34,28,'#ffd24a','center',FONT,['#300',6]);
  txt(`${G.np===2?`◀ ${GC.i+1}P ▶ `:''}${HEROES[ps.hero].name} Lv.${ps.lvl}   ·   금화 ${r.gold}   ·   강화석 ${r.mats.stone} · 비급 조각 ${r.mats.frag}`,W/2,64,14,'#ffd860');
  const pr=[gachaPrice(ps),gachaPrice(ps)*9,pouchPrice(ps)];
  const O=[['천명 보물함 1회',pr[0]],['천명 보물함 10회 (1회 무료 · 세트 이상 보장)',pr[1]],['비급 복주머니 1회',pr[2]],['나가기',0]];
  panel(40,90,470,O.length*52+76);
  O.forEach(([n,p],k)=>{const y=122+k*52,on=k===GC.idx;ctx.fillStyle=on?'rgba(120,30,10,.9)':'rgba(0,0,0,.35)';ctx.fillRect(54,y-20,442,40);
    if(on){ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(54,y-20,442,40)}txt(n,68,y,14,on?'#fff':'#e8d8c8','left');if(p)txt(`${p} 금`,484,y,14,r.gold>=p?'#ffd860':'#aa5040','right',MONO)});
  const pity=r.pity||0,py=122+O.length*52;
  txt(`천장: ${PITY_MAX-pity}회 안에 전용 · 신화 확정`,275,py+2,14,'#ff9a70');
  bar(90,py+18,370,8,pity,PITY_MAX,'#ffb060','#a03010');
  panel(530,90,390,390);
  txt('확률 공개',725,114,17,'#ffd24a');
  txt('천명 보물함 (내 레벨 기준 장비)',550,144,13,'#e8d8c8','left');
  GACHA_ODDS.forEach(([g,p],k)=>{const y=172+k*24;ctx.fillStyle=GRADES[g].c;ctx.fillRect(560,y-7,14,14);txt(GRADES[g].n,584,y,13,GRADES[g].c,'left');
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(650,y-6,200,12);ctx.fillStyle=hexA(GRADES[g].c,.8);ctx.fillRect(650,y-6,200*p/55,12);txt(p+'%',900,y,13,'#fff','right',MONO)});
  txt('※ 전용은 현재 무장 전용 · 신화는 착용 레벨이 높을 수 있음',725,300,11,'#a89878');
  txt('비급 복주머니',550,330,13,'#e8d8c8','left');
  POUCH_ODDS.forEach(([k,p,d],j)=>{const y=354+j*22;txt(d,560,y,12,'#c8b890','left');txt(p+'%',900,y,12,'#fff','right',MONO)});
  if(!GC.res)txt(`↑↓ 선택 · ${KN[0].atk}/ENTER 뽑기${G.np===2?' · ←→ 플레이어':''} · ${KN[0].jump}/ESC 나가기`,W/2,H-12,12,'#aaa');
  if(GC.msg)txt(GC.msg.txt,W/2,H-40,17,GC.msg.col,'center',FONT,['#000',5]);
  if(GC.res){const n=GC.res.length;ctx.fillStyle='rgba(6,2,0,.96)';ctx.fillRect(0,0,W,H);
    if(n===1)drawGachaCard(GC.res[0],W/2-100,100,200,280,0,1);
    else GC.res.forEach((c,k)=>drawGachaCard(c,38+(k%5)*180,78+Math.floor(k/5)*214,166,204,k,n));
    const best=GC.res.reduce((a,c)=>Math.max(a,c.rank),0);
    if(GC.t>revT(n-1,n)+8){txt(best>=5?'★ 신화 강림! ★':best>=4?'◆ 전용 장비 획득! ◆':best>=3?'세트 장비 획득!':'획득 완료',W/2,44,26,best>=4?'#ff9a30':'#ffe8a8','center',FONT,['#000',6]);
      txt(`${KN[0].atk}/ENTER 확인`,W/2,H-12,13,'#ccc')}}
  if(GC.flash){const a=1-GC.flash.t/30;ctx.fillStyle=hexA(GC.flash.col,a*(GC.flash.big?.7:.4));ctx.fillRect(0,0,W,H)}
}

/* ================= 히든 코드 ================= */
let CHEAT=null;
function cheatCode(code){
  if(!G||!G.pl){CHEAT={t:0,txt:'게임을 시작하거나 불러온 뒤 사용할 수 있습니다',col:'#ff9080'};return}
  if(code==='KeyU'){for(const s of G.pl)s.rpg.gold+=100000;CHEAT={t:0,txt:`[히든 코드] 금화 +100,000${G.np===2?' (1P · 2P 모두)':''}`,col:'#ffe060'};sfx('treasure');return}
  if(code==='KeyK'){if(G.pl.every(s=>s.lvl>=MAXLV)){if(!CHEAT||CHEAT.t>60)CHEAT={t:0,txt:'이미 최대 레벨(100)입니다',col:'#ff9080'};return}const up=[];
    for(const s of G.pl){if(s.lvl>=MAXLV)continue;s.lvl++;s.exp=0;s.rpg.statPts+=5;s.rpg.skillPts+=1;recalc(s);up.push(s);
      const p=Wd&&Wd.ps&&Wd.ps[s.idx];if(scene==='play'&&p&&p.ps===s&&!p.dead){p.hp=p.maxhp;p.mana=p.maxmana;Wd.fx.push({type:'text',x:p.x,y:p.y,z:150,t:0,life:60,txt:s.lvl>=MAXLV?'MAX LEVEL!':`LEVEL UP!  Lv.${s.lvl}`,col:'#ffd94a',size:26});Wd.fx.push({type:'pillar',x:p.x,y:p.y,t:0,life:40,w:40,col:'#ffe080'})}}
    CHEAT={t:0,txt:up.length?`[히든 코드] 레벨 업! ${G.pl.map(s=>'Lv.'+s.lvl).join(' · ')}  (능력치 +5 · 스킬 +1)`:'이미 최대 레벨(100)입니다',col:up.length?'#ffe060':'#ff9080'};sfx(up.length?'lvl':'noMp');return}
  if(code==='KeyL'){let n=0;
    for(const s of G.pl){for(const it of s.rpg.bag.concat(EQ_SLOTS.map(k=>s.rpg.eq[k]).filter(Boolean))){if(it.rq!==s.lvl){it.rq=s.lvl;n++}}recalc(s)}
    CHEAT={t:0,txt:`[히든 코드] 장비 ${n}개의 착용 레벨을 캐릭터 레벨(${G.pl.map(s=>'Lv.'+s.lvl).join(' · ')})로 변경`,col:'#ffe060'};sfx('treasure');return}
  const c=code==='KeyI'?['gold',10000,'금화 +10,000']:code==='KeyO'?['stone',10,'강화석 +10']:['frag',10,'비급 조각 +10'];
  for(const s of G.pl){if(c[0]==='gold')s.rpg.gold+=c[1];else s.rpg.mats[c[0]]+=c[1]}
  CHEAT={t:0,txt:`[히든 코드] ${c[2]}${G.np===2?' (1P · 2P 모두)':''}`,col:'#ffe060'};sfx('treasure');
}
function drawCheat(){
  if(!CHEAT)return;if(++CHEAT.t>150){CHEAT=null;return}
  const a=Math.min(1,(150-CHEAT.t)/30);ctx.globalAlpha=a;ctx.font=`bold 16px ${FONT}`;const tw=ctx.measureText(CHEAT.txt).width+36;
  ctx.fillStyle='rgba(0,0,0,.88)';ctx.fillRect(W/2-tw/2,90,tw,34);ctx.strokeStyle=CHEAT.col;ctx.lineWidth=2;ctx.strokeRect(W/2-tw/2,90,tw,34);txt(CHEAT.txt,W/2,107,16,CHEAT.col);ctx.globalAlpha=1;
}
