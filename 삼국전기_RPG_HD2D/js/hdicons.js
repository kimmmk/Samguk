'use strict';
/* ===== HD 아이템 · 소품 그래픽 + 장비 편의 기능 =====
   · 장비 아이콘: 벡터 일러스트(무기는 실제 캐릭터가 드는 무기 그림 그대로) — gearArt / drawGearIcon 대체
   · 소모품 · 보물 · 금화 · 재료 · 항아리 · 우물 HD
   · 착용 불가(레벨 · 전용) 장비: 가방 · 필드 · 획득 문구를 빨간색으로
   · 추천 장착: 착용 가능한 장비 중 전투력이 가장 높은 조합으로 교체 (강화 수치 제외) */

/* ---------- 장비 아이콘 ---------- */
const HI_U=48,HI_Q=2.6;/* 아이콘 논리 크기 · 해상도 배율 */
const HI_ART=new Map();
const HI_WK={sword:'sword',dao:'dao',spear:'spear',halberd:'halberd',fan:'fan',bow:'bow',axe:'axe',whip:'whip',staff:'staff'};
function hiWeaponLook(it){
  const g=it.g,rk=GRADES[g].rank,sd=itemSeed(it);
  let wk=HI_WK[wKind(it)]||'sword';
  if(it.h){const h=HEROES.find(h=>h.id===it.h);if(h)wk=h.look.weapon}
  else if(it.u&&UNIQ[it.u]&&UNIQ[it.u].s==='weapon'&&!it.wt){const n=it.n;wk=/도|刀/.test(n)?'dao':/검|劍/.test(n)?'sword':/극|戟/.test(n)?'halberd':/창|槍/.test(n)?'spear':'sword'}
  const motif=itemMotif(it),met=motif==='frost'?'#cfefff':motif==='flame'?'#ffd0a0':(G_METAL[g]||'#dfe6ee');
  return{weapon:wk,metal:met,wood:['#6a3a1a','#4a2410','#7a4a22','#2a2018'][sd%4],fanc:rk>=2?mixCol('#f4f2ea',G_TONE[g]||'#ffffff',.3):'#f4f2ea',wglow:rk>=2?(G_TONE[g]||null):null,dual:false};
}
function hiIcon(it,draw){
  const [c,g]=(()=>{const c=document.createElement('canvas');c.width=c.height=Math.ceil(HI_U*HI_Q);const g=c.getContext('2d');g.scale(HI_Q,HI_Q);g.lineJoin='round';g.lineCap='round';return[c,g]})();
  const rk=GRADES[it.g].rank,tone=GRADES[it.g].c;
  if(rk>=3){const gr=g.createRadialGradient(24,24,2,24,24,24);gr.addColorStop(0,sdA(tone,.45));gr.addColorStop(1,sdA(tone,0));g.fillStyle=gr;g.fillRect(0,0,48,48)}
  draw(g);
  /* 이름 문양 */
  const m=itemMotif(it);g.save();g.globalCompositeOperation='lighter';
  if(m==='stars')[[8,8],[13,5],[19,6],[24,9],[30,8],[35,11],[40,9]].forEach(([x,y])=>{hbGlow(g,x,y,3,'#fff6a0',.9)});
  if(m==='flame')for(let i=0;i<5;i++)hbGlow(g,8+i*8,40-(i%2)*4,4,'#ff8030',.8);
  if(m==='bolt'){g.strokeStyle='#fff6a0';g.lineWidth=1.4;g.beginPath();g.moveTo(38,4);g.lineTo(33,12);g.lineTo(39,13);g.lineTo(34,21);g.stroke()}
  if(m==='dragon'){g.strokeStyle='rgba(90,255,150,.8)';g.lineWidth=1.3;g.beginPath();for(let i=0;i<=20;i++)g.lineTo(4+i*2,42-Math.sin(i*.7)*4);g.stroke()}
  if(m==='petal')[[38,6],[42,11],[6,40]].forEach(([x,y])=>hbGlow(g,x,y,3.5,'#ff8ad0',.9));
  if(m==='frost')[[7,7],[40,40],[42,6]].forEach(([x,y])=>hbGlow(g,x,y,3.5,'#bff0ff',.9));
  if(rk>=4)for(let i=0;i<3;i++){const x=6+hbR(itemSeed(it)%97+i*7)*36,y=6+hbR(i*13+itemSeed(it)%89)*36;hbGlow(g,x,y,3,'#ffffff',1)}
  g.restore();
  return c;
}
gearArt=function(it){
  const tier=BASE_TIER.reduce((a,v,i)=>it.il>=v?i:a,0),sd=itemSeed(it),key=it.s+'|'+it.g+'|'+tier+'|'+sd+'|'+(it.u||'')+'|'+(it.set||'');
  let c=HI_ART.get(key);if(c)return c;
  const [D,M,Lt]=ICON_MAT[it.g],rk=GRADES[it.g].rank,acc=it.set&&SET_MARK[it.set]?SET_MARK[it.set][1]:rk>=1?GRADES[it.g].c:'#c83030';
  const gem=rk>=3?acc:GEM_PAL[sd%GEM_PAL.length],gold='#e8b848',base=tier===0?'#a08a6a':tier===1?'#8a5a30':M;
  c=hiIcon(it,g=>{
    switch(it.s){
      case'weapon':{const L=hiWeaponLook(it),P=sdWeapon(L,4);const len=P.h;const s=Math.min(1.25,58/len);
        g.save();g.translate(24,24);g.rotate(-Math.PI*3/4);g.scale(s,s);g.translate(0,-(P.y0+P.h/2));g.drawImage(P.c,P.x0,P.y0,P.w,P.h);g.restore();break}
      case'armor':{
        sdFill(g,g=>{g.moveTo(10,10);g.quadraticCurveTo(24,6,38,10);g.lineTo(42,17);g.lineTo(37,20);g.lineTo(36,40);g.quadraticCurveTo(24,44,12,40);g.lineTo(11,20);g.lineTo(6,17);g.closePath()},base,[6,6,36,38],{hl:40,dk:40,lw:1.2});
        g.save();g.beginPath();g.moveTo(12,18);g.lineTo(36,18);g.lineTo(36,38);g.quadraticCurveTo(24,42,12,38);g.closePath();g.clip();
        for(let y=19;y<41;y+=3.4)for(let x=11+((y|0)%2)*2;x<38;x+=4){g.strokeStyle=sdA(sdSh(base,-50),.8);g.lineWidth=.6;g.beginPath();g.arc(x,y,2,0,Math.PI);g.stroke()}g.restore();
        sdFill(g,g=>{g.moveTo(19,8);g.lineTo(24,16);g.lineTo(29,8);g.closePath()},'#f0e8d8',[19,8,10,8],{lw:.7});
        sdFill(g,g=>sdRR(g,11,31,26,4.4,1.6),rk>=2?acc:'#6a4a2a',[11,31,26,4.4],{lw:.7});sdMetal(g,sdEl(24,33.2,3.2,3),gold,[21,30,6,6],{lw:.5});
        if(tier>=2){sdMetal(g,sdEl(24,23,4.6,4.6),gold,[19.4,18.4,9.2,9.2],{lw:.6});sdFill(g,sdEl(24,23,2.4,2.4),gem,[21.6,20.6,4.8,4.8],{lw:.4,hl:70})}
        if(tier>=3||rk>=2)for(const s of[-1,1])sdMetal(g,sdEl(24+s*15,13,6.5,4.4,s*.3),rk>=2?gold:Lt,[24+s*15-7,8,14,10],{lw:.7});
        break}
      case'helm':{
        if(tier===0){sdFill(g,g=>sdRR(g,8,20,32,9,4),['#c8a040','#a03030','#3050a0'][sd%3],[8,20,32,9],{lw:1});sdLine(g,[[38,26],[44,36]],'#c8a040',2);sdLine(g,[[36,27],[39,38]],'#c8a040',2);sdFill(g,sdEl(24,24.5,2.2,2.2),gem,[22,22,4,4],{lw:.4,hl:70});break}
        const col=tier===1?'#8a5a30':M;
        if(tier>=3||sd%3===0)sdPlume(g,24,9,['#d02828','#2060c0','#f0f0f0','#20a050','#e0b040'][sd%5],16,6,3);
        sdMetal(g,g=>{g.moveTo(7,30);g.bezierCurveTo(6,6,42,6,41,30);g.closePath()},col,[6,8,36,22],{lw:1.1});
        sdMetal(g,g=>{g.moveTo(8,29);g.lineTo(7,40);g.quadraticCurveTo(12,42,15,38);g.lineTo(15,30);g.closePath()},col,[7,29,8,13],{lw:.8});
        sdMetal(g,g=>{g.moveTo(40,29);g.lineTo(41,40);g.quadraticCurveTo(36,42,33,38);g.lineTo(33,30);g.closePath()},col,[33,29,8,13],{lw:.8});
        sdMetal(g,g=>sdRR(g,6,27,36,4.4,2),rk>=2?gold:sdSh(col,-20),[6,27,36,4.4],{lw:.8});
        sdMetal(g,g=>{g.moveTo(21,26);g.lineTo(24,17);g.lineTo(27,26);g.lineTo(24,29);g.closePath()},gold,[21,17,6,12],{lw:.6});sdFill(g,sdEl(24,24,1.6,2.2),gem,[22,21,4,5],{lw:.3,hl:70});
        if(rk>=4||tier>=5)for(const s of[-1,1])sdMetal(g,g=>{g.moveTo(24+s*14,16);g.quadraticCurveTo(24+s*22,8,24+s*18,2);g.quadraticCurveTo(24+s*17,10,24+s*11,14);g.closePath()},gold,[4,2,40,16],{lw:.6});
        break}
      case'gloves':{const col=tier<=1?'#8a5a30':M;
        sdFill(g,g=>{g.moveTo(14,40);g.lineTo(14,24);g.quadraticCurveTo(13,12,17,10);g.lineTo(18,20);g.lineTo(20,8);g.lineTo(23,8);g.lineTo(23,19);g.lineTo(26,8);g.lineTo(29,9);g.lineTo(28,20);g.lineTo(31,11);g.lineTo(34,12);g.lineTo(32,24);g.quadraticCurveTo(38,20,40,24);g.lineTo(34,32);g.lineTo(34,40);g.closePath()},col,[13,8,27,32],{hl:40,dk:40,lw:1.1});
        sdMetal(g,g=>sdRR(g,12,33,24,10,3),tier>=2?M:'#6a4020',[12,33,24,10],{lw:.9});for(let x=15;x<34;x+=4)sdLine(g,[[x,34],[x,42]],sdSh(M,-50),.6);
        if(tier>=3){sdMetal(g,g=>sdRR(g,15,22,17,4,1.6),gold,[15,22,17,4],{lw:.5});sdFill(g,sdEl(23.5,24,1.8,1.8),gem,[21.7,22.2,3.6,3.6],{lw:.3,hl:70})}
        break}
      case'boots':{const col=tier===0?'#c8b070':tier===1?'#8a5a30':M;
        sdFill(g,g=>{g.moveTo(14,6);g.lineTo(28,6);g.lineTo(28,30);g.quadraticCurveTo(40,30,43,37);g.quadraticCurveTo(44,42,40,42);g.lineTo(13,42);g.quadraticCurveTo(12,24,14,6);g.closePath()},col,[12,6,32,36],{hl:36,dk:40,lw:1.1});
        sdMetal(g,g=>sdRR(g,12,5,18,6,2),tier>=3?acc:'#6a4020',[12,5,18,6],{lw:.8});sdLine(g,[[13,42],[40,42]],'#2a1a10',2);
        for(let y=15;y<29;y+=5)sdLine(g,[[14,y],[28,y]],sdSh(col,-40),.6);
        if(sd%3===0||tier>=4){sdFill(g,g=>{g.moveTo(28,12);g.quadraticCurveTo(38,6,42,2);g.quadraticCurveTo(37,10,28,17);g.closePath()},'#f4f4f4',[28,2,14,15],{lw:.6})}
        if(tier>=4)sdFill(g,sdEl(20,22,2,2),gem,[18,20,4,4],{lw:.3,hl:70});
        break}
      case'belt':{
        sdFill(g,g=>sdRR(g,4,19,40,10,3),tier<=1?'#8a5a30':tier>=4?'#3a6a4a':['#6a3a1a','#3a2a4a','#2a3a5a'][sd%3],[4,19,40,10],{hl:34,dk:40,lw:1});
        if(tier>=2)for(let k=0;k<4;k++)sdMetal(g,g=>sdRR(g,6+k*10,21,6,6,1.4),tier>=4?'#8ad0a8':M,[6+k*10,21,6,6],{lw:.5});
        sdMetal(g,sdEl(24,24,7,7),rk>=2?acc:gold,[17,17,14,14],{lw:.8});g.fillStyle='#4a2a08';g.fillRect(21.4,22,1.4,1.2);g.fillRect(25.2,22,1.4,1.2);sdLine(g,[[21.4,26.6],[24,28,26.6,26.6]],'#4a2a08',.7);
        sdFill(g,g=>{g.moveTo(13,29);g.lineTo(11,42);g.lineTo(15,42);g.closePath()},'#d82424',[11,29,4,13],{lw:.4});sdFill(g,sdEl(35,35,3,4),'#6ab08a',[32,31,6,8],{lw:.5,hl:50});
        break}
      case'cape':{const col=rk>=1?sdSh(acc,-45):['#8a3a2a','#3a4a7a','#4a6a3a'][sd%3];
        sdFill(g,g=>{g.moveTo(14,6);g.lineTo(34,6);g.bezierCurveTo(38,20,42,32,43,43);g.quadraticCurveTo(36,46,30,43);g.quadraticCurveTo(24,47,18,43);g.quadraticCurveTo(12,46,5,43);g.bezierCurveTo(6,32,10,20,14,6);g.closePath()},col,[5,6,38,40],{hl:34,dk:44,lw:1.1});
        for(let i=0;i<3;i++)sdLine(g,[[19+i*5,9],[16+i*8,26,11+i*12,42]],sdSh(col,-40),.7);
        sdLine(g,[[5,43],[12,46,18,43],[24,47,30,43],[36,46,43,43]],gold,1.2);sdMetal(g,g=>sdRR(g,13,4,22,5,2),tier>=3?'#e8e0d0':'#6a4a2a',[13,4,22,5],{lw:.6});sdMetal(g,sdEl(24,6.5,2.8,2.8),gold,[21,4,6,6],{lw:.4});
        if(tier>=2){g.fillStyle=sdA(gold,.9);g.font='bold 11px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(rk>=4?'龍':'將',24,26)}
        break}
      case'neck':{
        g.strokeStyle=sdSh(M,20);g.lineWidth=1.4;g.beginPath();g.arc(24,12,13,0.15,Math.PI-.15);g.stroke();for(let a=.3;a<Math.PI-.2;a+=.28)sdFill(g,sdEl(24+Math.cos(a)*13,12+Math.sin(a)*13,1.3,1.3),Lt,[0,0,48,48],{lw:.3,flat:true});
        const sh=sd%3;
        if(sh===0){sdMetal(g,sdEl(24,33,8,9),M,[16,24,16,18],{lw:.9});sdFill(g,sdEl(24,33,4,4.6),gem,[20,28,8,10],{lw:.5,hl:70})}
        else if(sh===1){sdFill(g,sdEl(24,33,9,9),'#6ab08a',[15,24,18,18],{lw:.9,hl:40});g.fillStyle='#1a3a28';g.beginPath();g.arc(24,33,3,0,7);g.fill();sdFill(g,sdEl(24,24.5,2,2),gem,[22,22,4,4],{lw:.3,hl:70})}
        else{sdMetal(g,g=>{g.moveTo(24,24);g.lineTo(31,33);g.lineTo(24,43);g.lineTo(17,33);g.closePath()},M,[17,24,14,19],{lw:.9});sdFill(g,sdEl(24,33,3,4),gem,[21,29,6,8],{lw:.4,hl:70})}
        break}
      case'ring':{
        g.lineWidth=5;const rg=g.createLinearGradient(12,20,36,40);rg.addColorStop(0,Lt);rg.addColorStop(.5,M);rg.addColorStop(1,D);g.strokeStyle=rg;g.beginPath();g.ellipse(24,31,11,9,0,0,7);g.stroke();
        g.lineWidth=.8;g.strokeStyle=sdSh(D,-40);g.beginPath();g.ellipse(24,31,13.5,11.4,0,0,7);g.stroke();g.beginPath();g.ellipse(24,31,8.5,6.6,0,0,7);g.stroke();
        sdMetal(g,g=>sdRR(g,17,12,14,10,3),gold,[17,12,14,10],{lw:.7});const gr=2.6+Math.min(3,tier*.6);
        sdFill(g,g=>{g.moveTo(24,16-gr);g.lineTo(24+gr,16);g.lineTo(24,16+gr);g.lineTo(24-gr,16);g.closePath()},gem,[24-gr,16-gr,gr*2,gr*2],{lw:.5,hl:70});
        break}
      case'book':{
        if(tier<=1){for(let k=0;k<7;k++)sdFill(g,g=>sdRR(g,9+k*4.4,8,4,32,1.4),k%2?'#d8c890':'#c0a868',[9+k*4.4,8,4,32],{lw:.5});sdLine(g,[[8,16],[40,16]],'#c02020',1.2);sdLine(g,[[8,32],[40,32]],'#c02020',1.2);break}
        const cov=sdSh(rk>=1?acc:['#7a3a1a','#2a3a6a','#2a5a3a'][sd%3],-40);
        sdFill(g,g=>sdRR(g,9,6,30,36,2.4),cov,[9,6,30,36],{hl:30,dk:40,lw:1.1});sdFill(g,g=>sdRR(g,36,8,4,32,1),'#efe6cc',[36,8,4,32],{lw:.5});
        sdMetal(g,g=>sdRR(g,9,6,5,36,1.6),D,[9,6,5,36],{lw:.6});
        const em=sd%3;if(em===0){sdMetal(g,sdEl(25,24,7,7),Lt,[18,17,14,14],{lw:.6});sdFill(g,sdEl(25,24,3,3),gem,[22,21,6,6],{lw:.4,hl:70})}
        else if(em===1){g.strokeStyle=Lt;g.lineWidth=1.2;g.beginPath();g.moveTo(25,16);g.lineTo(32,24);g.lineTo(25,32);g.lineTo(18,24);g.closePath();g.stroke();sdFill(g,sdEl(25,24,2,2),gem,[23,22,4,4],{lw:.3,hl:70})}
        else{g.fillStyle='#f0f0f0';g.beginPath();g.arc(25,24,7,Math.PI/2,Math.PI*1.5);g.fill();g.fillStyle='#202020';g.beginPath();g.arc(25,24,7,-Math.PI/2,Math.PI/2);g.fill();g.fillStyle='#f0f0f0';g.beginPath();g.arc(25,20.5,3.5,0,7);g.fill();g.fillStyle='#202020';g.beginPath();g.arc(25,27.5,3.5,0,7);g.fill()}
        if(tier>=5){sdLine(g,[[16,9],[34,9]],gold,1);sdLine(g,[[16,39],[34,39]],gold,1)}
        break}
    }
  });
  if(HI_ART.size>1500)HI_ART.clear();HI_ART.set(key,c);return c;
};
drawGearIcon=function(it,cx,cy,sz){ctx.imageSmoothingEnabled=true;ctx.drawImage(gearArt(it),cx-sz/2,cy-sz/2,sz,sz);ctx.imageSmoothingEnabled=false};

/* ---------- 착용 가능 여부 표시 ---------- */
let GEAR_PS=null;
const _gearCell0=gearCell;
gearCell=function(it,x,y,sz,sel,dim){
  _gearCell0(it,x,y,sz,sel,dim);
  if(!it||!GEAR_PS)return;
  const why=canEquip(GEAR_PS,it);
  if(why){ctx.fillStyle='rgba(200,20,20,.28)';ctx.fillRect(x+1,y+1,sz-2,sz-2);ctx.strokeStyle='#ff3030';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,sz-2,sz-2);
    txt(it.h&&it.h!==HEROES[GEAR_PS.hero].id?'전용':'Lv.'+it.rq,x+sz-3,y+sz-7,9,'#ff6060','right',MONO,['#000',3])}
  else if(RECO&&RECO.set.has(it)&&!Object.values(GEAR_PS.rpg.eq).includes(it)){ctx.fillStyle='#40ff70';ctx.beginPath();ctx.moveTo(x+4,y+sz-4);ctx.lineTo(x+10,y+sz-12);ctx.lineTo(x+16,y+sz-4);ctx.closePath();ctx.fill();ctx.strokeStyle='#0a3a14';ctx.lineWidth=1;ctx.stroke()}
};
const _drawTabGear0=drawTabGear;
drawTabGear=function(ps){GEAR_PS=ps;recoCache(ps);try{_drawTabGear0(ps)}finally{GEAR_PS=null}};
/* 필드 장비 · 획득 문구 */
function unusableFor(it){if(!G)return null;let why=null;for(const s of G.pl){const w=canEquip(s,it);if(!w)return null;why=w}return why}
const _pickupRpg0=pickupRpg;
pickupRpg=function(it,p){
  const why=it.kind==='gear'?canEquip(p.ps,it.gear):null,n=Wd.fx.length,ok=_pickupRpg0(it,p);
  if(ok&&why){for(let i=Wd.fx.length-1;i>=n;i--){const f=Wd.fx[i];if(f.type==='text'&&f.txt.includes(it.gear.n)){f.col='#ff4a4a';f.txt+=`  (${why} — 사용 불가)`}}}
  return ok;
};
drawGroundRpg=function(it,sx,sy){
  if(it.kind==='gear'){const g=GRADES[it.gear.g],bad=unusableFor(it.gear);
    if(g.rank>=1){ctx.globalCompositeOperation='lighter';const hgt=g.rank>=3?190:g.rank>=2?120:70;const gr=ctx.createLinearGradient(0,sy-hgt,0,sy);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,hexA(g.c,.5));
      ctx.fillStyle=gr;ctx.fillRect(sx-6,sy-hgt,12,hgt);ctx.globalAlpha=.5;ctx.drawImage(glowSpr(g.c),sx-24,sy-30,48,40);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
    drawGearIcon(it.gear,sx,sy-14+Math.sin((it.t||0)*.08)*2,34);
    const label=it.gear.n+(bad?`  [${bad}]`:'');ctx.font=`bold 11px ${FONT}`;const tw=ctx.measureText(label).width+10;ctx.fillStyle=bad?'rgba(60,0,0,.8)':'rgba(0,0,0,.65)';ctx.fillRect(sx-tw/2,sy-44,tw,15);
    if(bad){ctx.strokeStyle='#ff3030';ctx.lineWidth=1;ctx.strokeRect(sx-tw/2+.5,sy-43.5,tw-1,14)}
    txt(label,sx,sy-36,11,bad?'#ff5050':g.c,'center');
    if(g.rank>=3&&it.t%8===0)emit({x:it.x+rnd(-10,10),y:it.y,z:rnd(0,30),vz:rnd(.6,1.6),col:g.c,size:7,life:26});return}
  if(it.kind==='coin'){for(let k=0;k<3;k++){const y=sy-3-k*4,x=sx+(k-1)*3;sdMetal(ctx,sdEl(x,y,8,3.4),'#f0c030',[x-8,y-3.4,16,6.8],{lw:.8});ctx.fillStyle='#6a4a08';ctx.fillRect(x-1.6,y-1,3.2,2)}
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;ctx.drawImage(glowSpr('#ffd040'),sx-16,sy-26,32,30);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';return}
  if(it.kind==='mat'){
    if(it.mat==='stone'){sdFill(ctx,g=>{g.moveTo(sx-9,sy-2);g.lineTo(sx-6,sy-14);g.lineTo(sx,sy-20);g.lineTo(sx+6,sy-13);g.lineTo(sx+9,sy-2);g.closePath()},'#7ab0e8',[sx-9,sy-20,18,18],{hl:60,dk:40,lw:.9});sdLine(ctx,[[sx,sy-20],[sx-1,sy-2]],'#e8f6ff',.7,.8)}
    else{sdFill(ctx,g=>sdRR(g,sx-10,sy-14,20,11,2),'#e8dcb8',[sx-10,sy-14,20,11],{lw:.8});sdFill(ctx,g=>sdRR(g,sx-12,sy-16,4,15,1.6),'#8a3aa0',[sx-12,sy-16,4,15],{lw:.6});sdFill(ctx,g=>sdRR(g,sx+8,sy-16,4,15,1.6),'#8a3aa0',[sx+8,sy-16,4,15],{lw:.6});
      ctx.fillStyle='#5a2a1a';ctx.font='bold 8px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('秘',sx,sy-8.5)}
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.4;ctx.drawImage(glowSpr(it.mat==='stone'?'#a0c0ff':'#d080ff'),sx-18,sy-28,36,34);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
};

/* ---------- 소모품 · 보물 아이콘 (x,y = 아래 가운데) ---------- */
drawItemIcon=function(k,x,y,t){
  const c=ctx;c.save();c.translate(x,y-12);c.imageSmoothingEnabled=true;
  switch(k){
    case'bun':sdFill(c,g=>{g.moveTo(-12,6);g.bezierCurveTo(-13,-8,13,-8,12,6);g.closePath()},'#f6f0e2',[-12,-8,24,14],{hl:40,dk:20,lw:.9});for(let i=-2;i<=2;i++)sdLine(c,[[i*2.2,-6],[i*3.4,0,i*4.6,5]],'#d8ccb0',.6);sdFill(c,sdEl(0,-6.4,2,1.2),'#e8dcc0',[-2,-8,4,3],{lw:.4});break;
    case'chicken':sdFill(c,sdEl(-2,1,11,8,-.2),'#c87a30',[-13,-7,22,16],{hl:50,dk:40,lw:.9});sdFill(c,g=>sdRR(g,6,-6,10,3,1.4),'#f4ead8',[6,-6,10,3],{lw:.6});sdFill(c,sdEl(15.4,-4.4,2.4,2.4),'#f4ead8',[13,-7,5,5],{lw:.5});c.fillStyle='rgba(255,240,200,.6)';c.beginPath();c.ellipse(-5,-3,4,1.6,-.3,0,7);c.fill();break;
    case'wine':sdFill(c,g=>{g.moveTo(-4,-12);g.lineTo(4,-12);g.lineTo(4,-8);g.bezierCurveTo(12,-6,12,8,6,9);g.lineTo(-6,9);g.bezierCurveTo(-12,8,-12,-6,-4,-8);g.closePath()},'#8a5a2c',[-11,-12,22,21],{hl:40,dk:40,lw:.9});
      sdFill(c,g=>sdRR(g,-5,-15,10,4,1.4),'#c02020',[-5,-15,10,4],{lw:.6});sdFill(c,g=>sdRR(g,-6,-3,12,7,1.4),'#f0dca0',[-6,-3,12,7],{lw:.5});c.fillStyle='#8a1010';c.font='bold 6px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('酒',0,.6);break;
    case'gold':case'silver':{const m=k==='gold'?'#f0c030':'#d8dee6';sdMetal(c,g=>{g.moveTo(-13,5);g.quadraticCurveTo(-14,-2,-8,-3);g.quadraticCurveTo(-5,-9,0,-9);g.quadraticCurveTo(5,-9,8,-3);g.quadraticCurveTo(14,-2,13,5);g.quadraticCurveTo(0,9,-13,5);g.closePath()},m,[-14,-9,28,17],{lw:.9});
      c.globalCompositeOperation='lighter';c.globalAlpha=.35+.2*Math.sin(t*.1);c.drawImage(glowSpr(m),-20,-20,40,36);c.globalAlpha=1;c.globalCompositeOperation='source-over';break}
    case'gem':{const col=`hsl(${t*4%360},90%,62%)`;c.globalCompositeOperation='lighter';c.drawImage(glowSpr('#ffffff'),-18,-22,36,36);c.globalCompositeOperation='source-over';
      c.fillStyle=col;c.beginPath();c.arc(0,-2,9,0,7);c.fill();const gr=c.createRadialGradient(-3,-6,0,0,-2,9);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.4,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(0,0,0,.25)');c.fillStyle=gr;c.beginPath();c.arc(0,-2,9,0,7);c.fill();break}
    case'knife':for(let i=0;i<3;i++){c.save();c.translate(-7+i*7,0);c.rotate(-.35+i*.35);sdMetal(c,g=>{g.moveTo(-1.6,-14);g.lineTo(1.6,-14);g.lineTo(0,-20);g.closePath();g.rect(-1.6,-14,3.2,10)},'#e8eef4',[-2,-20,4,16],{lw:.5});sdFill(c,g=>sdRR(g,-1.4,-4,2.8,7,1),'#c02020',[-1.4,-4,2.8,7],{lw:.4});c.restore()}break;
    case'bomb':sdFill(c,sdEl(0,0,10,10),'#2a2a30',[-10,-10,20,20],{hl:50,dk:30,lw:.9});sdFill(c,g=>sdRR(g,-10,-2,20,3,1),'#b02020',[-10,-2,20,3],{lw:.5});sdLine(c,[[3,-9],[6,-14,9,-15]],'#8a6a3a',1.4);
      c.globalCompositeOperation='lighter';c.drawImage(glowSpr((t>>2)%2?'#ffe040':'#ff6020'),3,-24,14,14);c.globalCompositeOperation='source-over';break;
    case'elixir':sdFill(c,g=>{g.moveTo(-3,-13);g.lineTo(3,-13);g.lineTo(3,-8);g.bezierCurveTo(11,-5,11,8,0,9);g.bezierCurveTo(-11,8,-11,-5,-3,-8);g.closePath()},'#d84a2a',[-10,-13,20,22],{hl:55,dk:40,lw:.9});sdFill(c,g=>sdRR(g,-4,-16,8,4,1.4),'#8a5a20',[-4,-16,8,4],{lw:.5});sdFill(c,sdEl(0,1,4,4),'#ffd040',[-4,-3,8,8],{lw:.4,hl:60});break;
    case'tactic':sdFill(c,g=>sdRR(g,-12,-10,24,17,2),'#d8c490',[-12,-10,24,17],{hl:30,dk:30,lw:.9});sdFill(c,g=>sdRR(g,-14,-12,4,21,2),'#6b3b1a',[-14,-12,4,21],{lw:.6});sdFill(c,g=>sdRR(g,10,-12,4,21,2),'#6b3b1a',[10,-12,4,21],{lw:.6});for(let r=0;r<3;r++)sdLine(c,[[-7,-6+r*5],[7,-6+r*5]],'#3a2a1a',.8);break;
    case'haste':sdFill(c,g=>sdRR(g,-7,-14,14,22,1.6),'#f0e070',[-7,-14,14,22],{hl:30,dk:24,lw:.8});c.fillStyle='#c02020';c.font='bold 11px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('疾',0,-3);c.globalCompositeOperation='lighter';c.globalAlpha=.4;c.drawImage(glowSpr('#60b0ff'),-16,-20,32,32);c.globalAlpha=1;c.globalCompositeOperation='source-over';break;
    case'shield':sdMetal(c,g=>{g.moveTo(-10,-12);g.lineTo(10,-12);g.lineTo(10,-2);g.quadraticCurveTo(8,6,0,10);g.quadraticCurveTo(-8,6,-10,-2);g.closePath()},'#e0b030',[-10,-12,20,22],{lw:.9});c.fillStyle='#8a4a08';c.font='bold 10px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('剛',0,-2);break;
    case'tcharm':sdFill(c,g=>sdRR(g,-7,-14,14,22,1.6),'#b090f0',[-7,-14,14,22],{hl:40,dk:30,lw:.8});c.strokeStyle='#fff6a0';c.lineWidth=1.4;c.beginPath();c.moveTo(1,-11);c.lineTo(-3,-3);c.lineTo(2,-3);c.lineTo(-2,5);c.stroke();c.globalCompositeOperation='lighter';c.globalAlpha=.5;c.drawImage(glowSpr('#c8a0ff'),-16,-20,32,32);c.globalAlpha=1;c.globalCompositeOperation='source-over';break;
    default:{const it=ITEMS[k];if(!it)break;c.globalCompositeOperation='lighter';c.globalAlpha=.6+.3*Math.sin(t*.15);c.drawImage(glowSpr('#ffc040'),-30,-30,60,60);c.globalAlpha=1;c.globalCompositeOperation='source-over';
      const col=k==='book'?'#2a4a8a':k==='seal'?'#3aa070':k==='sword'?'#5a8ab8':'#b02a1a';
      sdFill(c,g=>sdRR(g,-12,-14,24,24,3),col,[-12,-14,24,24],{hl:40,dk:40,lw:1.1});sdLine(c,[[-10,-12],[10,-12],[10,8],[-10,8],[-10,-12]],'#ffe28a',1.2);
      c.fillStyle='#fff8e0';c.font=`bold 15px ${HANJA}`;c.textAlign='center';c.textBaseline='middle';c.fillText(it.hz[0],0,-2)}
  }
  c.restore();
};

/* ---------- 항아리 · 우물 ---------- */
const _drawProp0=drawProp;
drawProp=function(pr,sx){
  if(pr.broken||(pr.kind!=='jar'&&pr.kind!=='well'))return _drawProp0(pr,sx);
  const sh=pr.shake>0?Math.sin(pr.shake*2)*3:0,y=pr.y,x=sx+sh;
  ctx.fillStyle='rgba(0,0,0,.3)';ell(sx,y,30,8);
  if(pr.kind==='jar'){
    sdFill(ctx,g=>{g.moveTo(x-10,y-50);g.lineTo(x+10,y-50);g.lineTo(x+11,y-45);g.bezierCurveTo(x+30,y-40,x+30,y-6,x+14,y);g.lineTo(x-14,y);g.bezierCurveTo(x-30,y-6,x-30,y-40,x-11,y-45);g.closePath()},'#8a5228',[x-26,y-50,52,50],{hl:40,dk:44,lw:1.3});
    sdFill(ctx,g=>sdRR(g,x-12,y-54,24,6,2),'#6a3a1a',[x-12,y-54,24,6],{lw:.9});
    ctx.strokeStyle='#c8a860';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-16,y-42);ctx.quadraticCurveTo(x,y-38,x+16,y-42);ctx.stroke();
    sdFill(ctx,g=>{g.moveTo(x-9,y-34);g.lineTo(x+9,y-34);g.lineTo(x+8,y-12);g.lineTo(x-8,y-12);g.closePath()},'#d82a1a',[x-9,y-34,18,22],{hl:30,dk:20,lw:.8});
    ctx.fillStyle='#ffe28a';ctx.font=`bold 14px ${HANJA}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pr.count?'秘':'福',x,y-23);
    ctx.fillStyle='rgba(255,240,210,.35)';ctx.beginPath();ctx.ellipse(x-12,y-30,4,10,-.2,0,7);ctx.fill()}
  else{
    sdFill(ctx,g=>sdRR(g,x-40,y-34,80,34,6),'#8a8680',[x-40,y-34,80,34],{hl:30,dk:40,lw:1.2});
    ctx.strokeStyle='rgba(40,35,30,.5)';ctx.lineWidth=1;for(let r=0;r<3;r++){ctx.beginPath();ctx.moveTo(x-40,y-34+r*11);ctx.lineTo(x+40,y-34+r*11);ctx.stroke();for(let k=-40+(r%2)*10;k<40;k+=20){ctx.beginPath();ctx.moveTo(x+k,y-34+r*11);ctx.lineTo(x+k,y-23+r*11);ctx.stroke()}}
    ctx.fillStyle='#141210';ctx.beginPath();ctx.ellipse(x,y-34,34,7,0,0,7);ctx.fill();
    for(const s of[-1,1])sdFill(ctx,g=>sdRR(g,x+s*36-3,y-100,6,70,2),'#5a3a1c',[x+s*36-3,y-100,6,70],{lw:.9});
    hbRoof(ctx,x,y-100,110,24,'#5a3a2a');sdFill(ctx,g=>sdRR(g,x-30,y-80,60,4,2),'#6a4a2a',[x-30,y-80,60,4],{lw:.7});
    ctx.strokeStyle='#3a2a14';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y-78);ctx.lineTo(x,y-54);ctx.stroke();sdFill(ctx,g=>sdRR(g,x-7,y-56,14,11,2),'#7a5028',[x-7,y-56,14,11],{lw:.7});
    if(!G.treasures.seal){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5+.3*Math.sin(frame*.1);ctx.drawImage(glowSpr('#a0ffd0'),x-40,y-60,80,44);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}}
};

/* ---------- 추천 장착 ---------- */
function powerScore(ps,eq){
  const z={};for(const k in eq)if(eq[k])z[k]=Object.assign({},eq[k],{e:0});
  const s=calcStats(ps,z);
  const off=s.pow*(1+s.atkPct/100)*(1+Math.min(75,s.crit)/100*s.critDmg/100)*(1+s.skillDmg/250)*(1+(s.allSkill||0)*.05)*(1+(s.cmdDmg+s.spDmg+s.basicDmg)/600)*(1+(s.fire+s.ice+s.bolt)/900);
  const ehp=s.maxhp*(1+s.def/(s.def+160))/(1-Math.min(60,s.dr)/100)*(1+s.dodge/120)*(1+s.ls/40);
  return off*Math.sqrt(ehp);
}
const powerNum=ps=>Math.round(powerScore(ps,ps.rpg.eq)/10);
function recoPlan(ps){
  const r=ps.rpg,eq=Object.assign({},r.eq);
  const owned=EQ_SLOTS.map(k=>r.eq[k]).filter(Boolean);
  for(let pass=0;pass<2;pass++)for(const sl of EQ_SLOTS){
    const t=slotType(sl),other=sl==='ring1'?eq.ring2:sl==='ring2'?eq.ring1:null;
    const pool=r.bag.filter(it=>it.s===t&&!canEquip(ps,it)).concat(owned.filter(it=>it.s===t));
    let best=eq[sl],bs=powerScore(ps,eq);
    for(const it of pool){if(it===other||it===eq[sl])continue;const sc=powerScore(ps,Object.assign({},eq,{[sl]:it}));if(sc>bs*1.0005){bs=sc;best=it}}
    eq[sl]=best}
  return eq;
}
let RECO=null;
function recoCache(ps){
  const r=ps.rpg,key=ps.idx+'|'+ps.lvl+'|'+r.bag.length+'|'+EQ_SLOTS.map(k=>r.eq[k]?itemSeed(r.eq[k]):0).join(',');
  if(RECO&&RECO.key===key)return RECO;
  const eq=recoPlan(ps);RECO={key,eq,set:new Set(EQ_SLOTS.map(k=>eq[k]).filter(Boolean)),gain:Math.round(powerScore(ps,eq)/10)-powerNum(ps)};return RECO;
}
function recommendEquip(ps){
  const r=ps.rpg,before=powerNum(ps),eq=recoPlan(ps);
  const oldSet=new Set(EQ_SLOTS.map(k=>r.eq[k]).filter(Boolean)),newSet=new Set(EQ_SLOTS.map(k=>eq[k]).filter(Boolean));
  let n=0;for(const k of EQ_SLOTS)if(eq[k]!==r.eq[k])n++;
  if(!n)return{n:0,msg:'이미 가장 좋은 장비를 착용하고 있습니다 (강화 수치 제외 기준)',col:'#b0ffb0'};
  for(const it of newSet)if(!oldSet.has(it)){const i=r.bag.indexOf(it);if(i>=0)r.bag.splice(i,1)}
  for(const it of oldSet)if(!newSet.has(it))r.bag.push(it);
  for(const k of EQ_SLOTS){if(eq[k])r.eq[k]=eq[k];else delete r.eq[k]}
  recalc(ps);RECO=null;
  return{n,msg:`추천 장착 완료 — ${n}개 부위 교체 · 전투력 ${before} → ${powerNum(ps)}`,col:'#70ff90'};
}
/* 장비 탭: 2 키로 추천 장착 · 전투력 표시 */
const _updMenu0=updMenu;
updMenu=function(){
  if(MN&&MN.tab===0){const i=MN.i,P=G.np===2?PP[i]:pressed;
    if(P.sk2){P.sk2=false;const res=recommendEquip(G.pl[i]);menuMsg(res.msg,res.col);sfx(res.n?'power':'sel');return}}
  _updMenu0();
};
const _drawMenu0=drawMenu;
drawMenu=function(){
  _drawMenu0();
  if(MN&&MN.tab===0){const ps=G.pl[MN.i],R=recoCache(ps),K=kn(MN.i);
    ctx.fillStyle='rgba(20,10,0,.85)';ctx.fillRect(20,56,336,22);ctx.strokeStyle='#8a6a2a';ctx.strokeRect(20.5,56.5,335,21);
    txt(`전투력 ${powerNum(ps)}`,30,67,13,'#ffe08a','left',FONT,['#000',3]);
    txt(R.gain>0?`${K.sk[1]} 추천 장착 ▲${R.gain}`:`${K.sk[1]} 추천 장착 (최적)`,346,67,12,R.gain>0?'#70ff90':'#a8a8a8','right',FONT,['#000',3])}
};
