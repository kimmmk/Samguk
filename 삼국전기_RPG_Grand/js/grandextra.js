'use strict';
/* ===== 그랑풍: 일괄 관리 · 강화 이펙트 · 스킬 미리보기 개편 =====
   1. 장비 탭 4 키(2P \): 「일괄 관리」 창
      · 등급별 일괄 판매 / 분해 (잠금 · 추천 장비 제외)
      · 세트 수집 현황 (조각별 보유 ✔/✘ · 착용 수 · 단계별 효과) + 세트 일괄 장착
   2. 강화 단계별 인게임 이펙트: 무기 +3 ~ +15, 방어구(평균) +3 ~ +15, 타격 섬광
   3. 스킬 미리보기: 스킬마다 고유 데이터(아이콘 한자 · 투사체 종류 · 개수 · 속성 · 범위 · 소환수)로 시연 */

/* ================= 1. 일괄 관리 ================= */
const MG={on:false,sec:0,row:0,top:0,conf:null};
const MG_GRADES=['normal','rare','epic','set','excl','myth'];
function mgTargets(ps,g){const R=recoCache(ps);return ps.rpg.bag.filter(it=>it.g===g&&!it.lk&&!R.set.has(it))}
function mgSets(ps){
  const r=ps.rpg,own=r.bag.concat(EQ_SLOTS.map(k=>r.eq[k]).filter(Boolean)),out=[];
  for(const key in SETS){const S=SETS[key],items=own.filter(it=>it.set===key);if(!items.length)continue;
    const pcs=S.pieces.map(pc=>{const c=items.filter(it=>it.b===pc.n||it.n===pc.n);const eq=c.find(it=>Object.values(r.eq).includes(it));return{pc,have:c.length>0,eq:!!eq,best:eq||c.sort((a,b)=>(b.il-a.il)||((b.e||0)-(a.e||0)))[0]}});
    out.push({key,S,pcs,own:pcs.filter(p=>p.have).length,worn:EQ_SLOTS.filter(k=>r.eq[k]&&r.eq[k].set===key).length})}
  return out.sort((a,b)=>b.own-a.own||b.worn-a.worn);
}
function mgEquipSet(ps,row){
  const r=ps.rpg;let n=0,fail=[];
  for(const p of row.pcs){if(!p.have||p.eq)continue;const it=p.best,why=canEquip(ps,it);if(why){fail.push(`${it.n}(${why})`);continue}
    let sl=p.pc.s;if(sl==='ring')sl=r.eq.ring1&&r.eq.ring1.set===row.key?'ring2':'ring1';
    const bi=r.bag.indexOf(it);if(bi<0)continue;const e=equipItem(ps,bi,sl);if(!e)n++;else fail.push(`${it.n}(${e})`)}
  RECO=null;
  return n?{msg:`「${row.S.n}」 ${n}부위 일괄 장착 — 착용 ${EQ_SLOTS.filter(k=>r.eq[k]&&r.eq[k].set===row.key).length}/${row.S.pieces.length}${fail.length?` · 실패: ${fail.join(', ')}`:''}`,col:'#70ff90',ok:1}
    :{msg:fail.length?`장착 실패: ${fail.join(', ')}`:'이미 보유한 조각을 모두 착용 중입니다',col:fail.length?'#ff9080':'#b0ffb0'};
}
function mgUpd(){
  const i=MN.i,ps=G.pl[i],r=ps.rpg,P=G.np===2?PP[i]:pressed,take=k=>{if(P[k]){P[k]=false;return true}return false};MN.t++;if(MN.msg&&++MN.msg.t>170)MN.msg=null;
  if(take('jump')||take('menu')||take('sk4')||hit('pause')){MG.on=false;sfx('sel');return}
  if(take('left')||take('right')||take('swap')){MG.sec^=1;MG.row=0;MG.top=0;MG.conf=null;sfx('sel');return}
  const rows=MG.sec?mgSets(ps):MG_GRADES,n=Math.max(1,rows.length);
  if(take('up')){MG.row=(MG.row+n-1)%n;MG.conf=null;sfx('sel')}if(take('down')){MG.row=(MG.row+1)%n;MG.conf=null;sfx('sel')}
  if(MG.row<MG.top)MG.top=MG.row;if(MG.row>=MG.top+7)MG.top=MG.row-6;
  const A=take('atk')||hit('start'),C=take('sp');take('item');take('sk1');take('sk2');take('sk3');
  if(!MG.sec&&(A||C)){const g=MG_GRADES[MG.row],L=mgTargets(ps,g),key=(A?'s':'v')+g;
    if(!L.length){menuMsg('처리할 장비가 없습니다 (잠금 · 추천 장비 제외)','#ffb070');return}
    if(MG.conf!==key){MG.conf=key;menuMsg(`${GRADES[g].n} 장비 ${L.length}개를 일괄 ${A?'판매':'분해'}합니다 — 한 번 더 누르세요`,'#ffb070');sfx('sel');return}
    MG.conf=null;if(A){let gold=0;for(const it of L)gold+=itemPrice(it);r.bag=r.bag.filter(it=>!L.includes(it));r.gold+=gold;menuMsg(`${GRADES[g].n} ${L.length}개 일괄 판매 — 금화 +${gold}`,'#ffd860');sfx('item')}
    else{let st=0,fr=0;for(const it of L){const gn=salvageGain(it);st+=gn.stone;fr+=gn.frag}r.bag=r.bag.filter(it=>!L.includes(it));r.mats.stone+=st;r.mats.frag+=fr;menuMsg(`${GRADES[g].n} ${L.length}개 일괄 분해 — 강화석 +${st} · 비급 조각 +${fr}`,'#c8d8e8');sfx('break')}
    RECO=null;return}
  if(MG.sec&&A){const row=rows[MG.row];if(!row)return;const res=mgEquipSet(ps,row);menuMsg(res.msg,res.col);sfx(res.ok?'power':'sel')}
}
function mgDraw(){
  const ps=G.pl[MN.i],r=ps.rpg,K=kn(MN.i),x0=110,y0=66,w0=740,h0=430;
  ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,W,H);panel(x0,y0,w0,h0,'#d8a840');
  ['등급별 일괄 판매 · 분해','세트 수집 현황 · 일괄 장착'].forEach((t,k)=>{const x=x0+16+k*250,on=k===MG.sec;ctx.fillStyle=on?'rgba(120,30,10,.95)':'rgba(30,15,5,.9)';ctx.fillRect(x,y0+12,240,28);
    ctx.strokeStyle=on?'#ffd24a':'#6a4a2a';ctx.lineWidth=on?2:1;ctx.strokeRect(x+.5,y0+12.5,239,27);txt(t,x+120,y0+26,14,on?'#fff':'#b8a080')});
  txt(`금화 ${r.gold}  ·  강화석 ${r.mats.stone}  ·  비급 조각 ${r.mats.frag}`,x0+w0-16,y0+26,12,'#ffd860','right');
  if(!MG.sec){
    MG_GRADES.forEach((g,k)=>{const y=y0+60+k*48,L=mgTargets(ps,g),sel=k===MG.row,G_=GRADES[g];let gold=0,st=0,fr=0;for(const it of L){gold+=itemPrice(it);const gn=salvageGain(it);st+=gn.stone;fr+=gn.frag}
      ctx.fillStyle=sel?'rgba(90,50,10,.85)':'rgba(20,10,4,.6)';ctx.fillRect(x0+16,y,w0-32,42);if(sel){ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(x0+17,y+1,w0-34,40)}
      txt(G_.n,x0+36,y+21,18,G_.c,'left',FONT,['#000',3]);txt(`${L.length}개`,x0+150,y+21,16,L.length?'#fff':'#777','left',MONO);
      txt(`판매 금화 +${gold}`,x0+260,y+21,14,'#ffd860','left');txt(`분해 강화석 +${st} · 비급 조각 +${fr}`,x0+430,y+21,13,'#c8d8e8','left');
      const tot=r.bag.filter(it=>it.g===g).length;if(tot>L.length)txt(`(잠금 · 추천 ${tot-L.length}개 제외)`,x0+w0-28,y+21,11,'#a89878','right')});
    txt(`↑↓ 등급 선택 · ${K.atk} 일괄 판매 · ${K.sp} 일괄 분해 (두 번 눌러 확정) · ←→ 세트 탭 · ${K.jump} 닫기`,x0+w0/2,y0+h0-14,12,'#aaa');
  }else{
    const rows=mgSets(ps);
    if(!rows.length)txt('아직 모은 세트 장비가 없습니다. 세트 장비는 정예 · 보스 · 도박에서 얻을 수 있습니다.',x0+w0/2,y0+120,15,'#c8b890');
    rows.slice(MG.top,MG.top+7).forEach((row,k)=>{const idx=MG.top+k,y=y0+52+k*44,sel=idx===MG.row,mk=SET_MARK[row.key]||['套','#50e878'];
      ctx.fillStyle=sel?'rgba(20,70,30,.85)':'rgba(10,24,12,.6)';ctx.fillRect(x0+16,y,430,40);if(sel){ctx.strokeStyle='#70ff90';ctx.lineWidth=2;ctx.strokeRect(x0+17,y+1,428,38)}
      txt(mk[0],x0+34,y+20,20,mk[1],'center',HANJA,['#000',3]);txt(row.S.n,x0+52,y+12,14,'#a8ffb8','left');
      txt(`보유 ${row.own}/${row.S.pieces.length} · 착용 ${row.worn}`,x0+438,y+12,12,row.own===row.S.pieces.length?'#ffe060':'#c8d8c0','right');
      let xx=x0+52;for(const p of row.pcs){const t=(p.eq?'◆':p.have?'✔':'✘')+p.pc.n;ctx.font=`bold 11px ${FONT}`;const tw=ctx.measureText(t).width;if(xx+tw>x0+440)break;txt(t,xx,y+29,11,p.eq?'#70ff90':p.have?'#e8e8c0':'#6a6a6a','left');xx+=tw+10}});
    if(rows.length>7)txt(`${MG.top+1}-${Math.min(rows.length,MG.top+7)} / ${rows.length}`,x0+231,y0+h0-34,11,'#a89878');
    const row=rows[MG.row];
    if(row){const bx=x0+458,by=y0+52;ctx.fillStyle='rgba(10,20,10,.75)';ctx.fillRect(bx,by,w0-474,304);ctx.strokeStyle='#3a8a4a';ctx.strokeRect(bx+.5,by+.5,w0-475,303);
      txt(row.S.n,bx+12,by+16,15,'#a8ffb8','left');let y=by+40;
      for(const [nn,mods] of row.S.bonus){const on=row.worn>=nn,can=row.own>=nn;txt(`(${nn}세트)`,bx+12,y,12,on?'#70ff90':can?'#ffe060':'#6a7a6a','left');
        for(const ln of wrap(row.S.txt&&row.S.txt[nn]||modsText(mods),w0-566,11).slice(0,5)){txt(ln,bx+70,y,11,on?'#c8ffd0':can?'#f0e0a0':'#7a8a7a','left');y+=16}y+=4;if(y>by+290)break}
      if(row.own>row.worn)txt(`${K.atk} 보유 조각 일괄 장착 → 착용 ${row.own}/${row.S.pieces.length}`,bx+(w0-474)/2,by+290,13,'#ffe060');}
    txt(`↑↓ 세트 선택 · ${K.atk} 보유 조각 일괄 장착 · ←→ 판매 탭 · ${K.jump} 닫기    ◆착용 ✔보유 ✘미보유`,x0+w0/2,y0+h0-14,12,'#aaa');
  }
  if(MN.msg){const a=Math.min(1,(170-MN.msg.t)/30);ctx.globalAlpha=a;ctx.font=`bold 15px ${FONT}`;const tw=Math.min(W-40,ctx.measureText(MN.msg.txt).width+30);
    ctx.fillStyle='rgba(0,0,0,.92)';ctx.fillRect(W/2-tw/2,y0+h0-58,tw,30);ctx.strokeStyle=MN.msg.col;ctx.strokeRect(W/2-tw/2,y0+h0-58,tw,30);txt(MN.msg.txt,W/2,y0+h0-43,15,MN.msg.col);ctx.globalAlpha=1}
}
const _updMenuMG=updMenu;
updMenu=function(){
  if(MG.on){mgUpd();return}
  if(MN&&MN.tab===0&&!(typeof PV!=='undefined'&&PV.on)){const P=G.np===2?PP[MN.i]:pressed;if(P.sk4){P.sk4=false;Object.assign(MG,{on:true,sec:0,row:0,top:0,conf:null});sfx('ok');return}}
  _updMenuMG();
};
const _drawMenuMG=drawMenu;
drawMenu=function(){
  _drawMenuMG();
  if(MN&&MN.tab===0&&!MG.on&&!(typeof PV!=='undefined'&&PV.on)){const K=kn(MN.i);txt(`▶ ${K.sk[3]} 일괄 판매 · 세트 장착`,W-16,48,12,'#ffe8a8','right',FONT,['#000',3])}
  if(MG.on)mgDraw();
};
const _closeMenuMG=closeMenu;closeMenu=function(){MG.on=false;return _closeMenuMG.apply(this,arguments)};

/* ================= 2. 강화 단계 이펙트 ================= */
const enhTier=e=>e>=15?'#ffffff':enhHex(e);
const _enhWeaponFxX=enhWeaponFx;
enhWeaponFx=function(e,r,cx){
  _enhWeaponFxX(e,r,cx);
  const we=(e.ps.rpg.eq.weapon||{}).e||0;if(we<3)return;
  const c=we>=15?`hsl(${(frame*4)%360},100%,70%)`:enhHex(we),hex=we>=15?'#ffe8a0':enhHex(we);
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(we<5){ctx.globalAlpha=.25+.1*Math.sin(frame*.2);ctx.drawImage(glowSpr(hex),r.tx-9,r.ty-9,18,18)}
  if(we>=9){/* 칼날 기운: 손잡이 쪽 → 끝까지 빛나는 띠 */
    const hx=r.mx-(r.tx-r.mx)*.6,hy=r.my-(r.ty-r.my)*.6;ctx.lineCap='round';
    for(const [w,al] of[[we>=12?14:10,.22],[we>=12?6:4,.55],[1.6,.9]]){ctx.strokeStyle=al>.8?'#ffffff':c;ctx.globalAlpha=al*(.8+.2*Math.sin(frame*.3));ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(r.tx,r.ty);ctx.stroke()}}
  if(we>=11){/* 끝을 도는 빛구슬 */
    for(let i=0;i<3;i++){const a=frame*.15+i*2.09,x=r.tx+Math.cos(a)*14,y=r.ty+Math.sin(a)*8;ctx.globalAlpha=.8;ctx.drawImage(glowSpr(hex),x-6,y-6,12,12)}}
  if(we>=15&&frame%3===0){ctx.globalAlpha=1;emit({x:r.tx+cx+rnd(-6,6),y:e.y,z:e.y-r.ty+rnd(-6,6),vz:rnd(1,2.5),col:['#ff6060','#ffd060','#60ff90','#60c0ff','#d080ff'][(frame/3|0)%5],size:rnd(2,4),life:20,type:'sq'})}
  ctx.restore();
};
const _enhBodyFxX=enhBodyFx;
enhBodyFx=function(e,sx,sy,cx){
  _enhBodyFxX(e,sx,sy,cx);
  const eq=e.ps.rpg.eq,ks=['armor','helm','gloves','boots','belt','cape'];let sum=0;for(const k of ks)if(eq[k])sum+=eq[k].e||0;const ae=Math.floor(sum/ks.length);if(ae<3)return;
  const c=ae>=15?'#ffc840':enhHex(Math.max(ae,3));ctx.save();ctx.globalCompositeOperation='lighter';
  if(ae<7){ctx.strokeStyle=c;ctx.globalAlpha=.22+.12*Math.sin(frame*.12);ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(sx,e.y,24,7.5,0,0,7);ctx.stroke()}
  if(ae>=5&&frame%(ae>=10?3:6)===0)emit({x:e.x+rnd(-16,16),y:e.y,z:rnd(0,10),vz:rnd(.8,1.8),col:c,size:2,life:28,type:'sq'});
  if(ae>=9){/* 발밑 회전 문양 */ctx.save();ctx.translate(sx,e.y);ctx.scale(1,.32);ctx.rotate(frame*.02);ctx.strokeStyle=c;ctx.globalAlpha=.55;ctx.lineWidth=2;
    ctx.beginPath();for(let i=0;i<=6;i++){const a=i/6*6.283;ctx.lineTo(Math.cos(a)*40,Math.sin(a)*40)}ctx.stroke();ctx.beginPath();for(let i=0;i<=6;i++){const a=i/6*6.283+Math.PI/6;ctx.lineTo(Math.cos(a)*40,Math.sin(a)*40)}ctx.stroke();ctx.restore()}
  if(ae>=12){ctx.globalAlpha=.08+.04*Math.sin(frame*.1);ctx.drawImage(glowSpr(c),sx-30,sy-140,60,150)}
  if(ae>=15){/* 머리 위 광륜 */ctx.globalAlpha=.7;ctx.strokeStyle='#fff2c0';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(sx,sy-128,18,5,0,0,7);ctx.stroke();ctx.globalAlpha=.4;ctx.drawImage(glowSpr('#ffe8a0'),sx-26,sy-142,52,28)}
  ctx.restore();
};
/* 강화 무기 타격 섬광 */
const _damageEX=damage;
damage=function(a,t,dmg,knock,opt){
  const hp0=t.hp,res=_damageEX(a,t,dmg,knock,opt);
  if(res&&!t.isPlayer&&t.hp<hp0&&!(opt&&opt.dot)){const own=ownerOf(a),we=own&&own.ps&&((own.ps.rpg.eq.weapon||{}).e||0);
    if(we>=7&&VX().length<140){const c=enhHex(we),z=(t.z||0)+60;for(let i=0;i<(we>=12?8:5);i++)emit({x:t.x,y:t.y,z,vx:rnd(-5,5),vz:rnd(-3,5),col:i%2?c:'#ffffff',size:rnd(2,4),life:rnd(10,18),type:'sq'});
      if(we>=10)vfx({k:'star',x:t.x,y:t.y,z,col:c,life:12,s:we>=13?1.6:1.1});if(we>=13&&knock)gpV(gpAdd,{k:'slash',x:t.x,y:t.y,z,col:c,ang:rnd(-1,1),len:160,w:8,dur:10})}}
  return res;
};

/* ================= 3. 스킬 미리보기 개편 ================= */
/* 새 그리기: 얼음 결정 · 번개 줄기(두 점) · 유령(소환수) */
GH_DRAW.ice=function(v,cx,t){
  if(!v.cr){v.cr=[];for(let i=0;i<v.n;i++)v.cr.push({dx:rnd(-v.w,v.w),dy:rnd(-10,10),h:rnd(.5,1)*v.h,w:rnd(6,11),a:rnd(-.35,.35)});v.cr.sort((a,b)=>a.dy-b.dy)}
  const k=t/v.dur,hh=Math.min(1,t/4)*(k>.7?1-(k-.7)/.3:1);
  for(const c of v.cr){const x=v.x-cx+c.dx,y=v.y+c.dy,h=c.h*hh;if(h<1)continue;ctx.save();ctx.translate(x,y);ctx.rotate(c.a);
    ctx.fillStyle='rgba(170,230,255,.85)';ctx.beginPath();ctx.moveTo(-c.w,0);ctx.lineTo(0,-h);ctx.lineTo(c.w,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.moveTo(-c.w*.2,0);ctx.lineTo(0,-h);ctx.lineTo(c.w*.45,0);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#4a8ab0';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-c.w,0);ctx.lineTo(0,-h);ctx.lineTo(c.w,0);ctx.stroke();ctx.restore()}
};
GH_DRAW.zap=function(v,cx,t){
  const a=1-t/v.dur,x0=v.x0-cx,y0=v.y0-(v.z0||60),x1=v.x1-cx,y1=v.y1-(v.z1||60);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';
  for(const [w,c,al] of[[8,v.col,.3],[3,v.col,.85],[1.2,'#ffffff',1]]){ctx.strokeStyle=vxA(c,al*a);ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x0,y0);
    for(let i=1;i<10;i++){const s=i/10;ctx.lineTo(x0+(x1-x0)*s+rnd(-8,8),y0+(y1-y0)*s+rnd(-8,8))}ctx.lineTo(x1,y1);ctx.stroke()}
  ctx.globalAlpha=a;ctx.drawImage(glowSpr(v.col),x1-16,y1-16,32,32);ctx.restore();
};
GH_DRAW.ghost=function(v,cx,t){
  const k=t/v.dur,a=Math.min(1,t/5,(v.dur-t)/8)*.85,x=v.x0+(v.x1-v.x0)*Math.min(1,k*1.3)-cx;
  ctx.save();ctx.globalAlpha=a;try{renderModelOutlined(ctx,v.look,poseOf({look:v.look,state:k<.75?'run':'attack',t:k<.75?0:(t%20),combo:3,anim:t,facing:1,z:0}),x,v.y,1,1,{tint:hexA(v.col,.35)},'#140a06')}catch(_){}
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*.4;ctx.drawImage(glowSpr(v.col),x-30,v.y-100,60,110);ctx.restore();
};
/* 속성별 착탄 연출 */
function pvImpact(x,y,s,col,big){
  const el=s.hk==='arrow'?'arrow':s.hk==='rock'?'rock':s.el;
  if(el==='fire')gv(pvAdd,{k:'fire',x,y,col:EL_COL.fire,w:big?60:40,h:big?170:110,dur:22});
  else if(el==='ice')gv(pvAdd,{k:'ice',x,y,n:big?7:5,w:big?36:24,h:big?70:50,dur:30});
  else if(el==='bolt')_gpBoltGH(pvAdd,pvEm,x,y,EL_COL.bolt,0,big?8:6);
  else if(el==='rock')gv(pvAdd,{k:'spike',x,y,n:big?6:4,w:big?40:28,h:big?70:50,col,dur:28});
  else if(el==='arrow')ghArrow(pvAdd,x-80,y,200,x,y,0,col,0,12);
  else{gv(pvAdd,{k:'slash',x,y,z:60,col,ang:rnd(-1,1),len:big?190:140,w:8,dur:12});gv(pvAdd,{k:'star',x,y,z:60,col,dur:12,life:12,s:big?1.4:1})}
}
function pvSkill2(it){
  const s=it.s,H=PV.hero,t=PV.t,col=it.col,K=KIT[H.h.id],big=s.ti>=3,D=PV.d,X0=PV_X+130;H.anim++;
  const pose=(K&&K.skp&&K.skp[s.ty])||SK_POSE[s.ty]||'skill';
  const setP=(st,tt)=>{if(st==='attack3'){H.state='attack';H.combo=3;H.t=Math.min(30,tt)}else{H.state=st;H.t=tt;if(st==='jump')H.jatk=false}};
  if(t===1){
    if(s.ty==='nova'||s.ty==='whirl'||s.ty==='buff')H.x=s.ty==='buff'?X0+40:PV_X+300;
    pvAdd({k:'circle',x:H.x,y:H.y,f:H,col,life:46,r:80+s.ti*10,spin:1});pvAdd({k:'pillar',x:H.x,y:H.y,f:H,col,life:30,w:46,h:240});
    pvAdd({k:'kanji',x:H.x,y:H.y,z:150,txt:s.n,col,size:Math.min(44,30+s.ti*4),dur:40,life:40})}
  if(t<56)setP(pose,t);else{H.state='idle';H.t=0;H.z=0;H.x+=(X0-H.x)*.15}
  const M=PV.mem||(PV.mem={});
  switch(s.ty){
    case'proj':{const kind=s.kind||'orb',n=s.cnt||1,sp=s.spread||.4,spd=(s.spd||10)*1.25;
      if(t===8){M.pj=[];for(let i=0;i<n;i++){const off=n>1?(i-(n-1)/2):0;M.pj.push({x:H.x+40,y:H.y+off*8,vy:off*sp*1.4,hit:new Set()})}
        if(kind==='dragon')gv(pvAdd,{k:'dragon',x0:H.x+30,y0:H.y,z0:60,x1:PV_X+PV_W,y1:H.y,z1:70,col,amp:22,w:14,dur:34});
        if(kind==='tornado')gv(pvAdd,{k:'tornado',x:H.x+60,y:H.y,col,vx:spd*.6,h:200,w:60,dur:60})}
      for(const q of M.pj||[]){if(t<8||q.x>PV_X+PV_W)continue;q.x+=kind==='tornado'?spd*.6:spd;q.y+=q.vy;
        if(kind==='farrow'||kind==='arrow')ghArrow(pvAdd,q.x-28,q.y,60,q.x,q.y,60,col,0,2);
        else if(kind==='eslash'||kind==='redslash'||kind==='wind')gv(pvAdd,{k:'moon',x:q.x,y:q.y,z:60,r:kind==='wind'?34:44,col:kind==='redslash'?'#ff3040':col,f:1,ang:0,dur:3});
        else if(kind==='petal')gv(pvAdd,{k:'petals',x:q.x,y:q.y,z:50,n:5,sp:20,out:.5,sw:2,zr:20,col,dur:4});
        else if(kind!=='dragon'&&kind!=='tornado')pvEm({x:q.x,y:q.y,z:60,col:kind==='fireball'?EL_COL.fire:col,size:kind==='fireball'?16:11,life:6,type:'glow'});
        for(const d of D)if(!q.hit.has(d)&&Math.abs(d.x-q.x)<24){q.hit.add(d);pvHit(o=>o===d,s.knock);pvImpact(d.x,d.y,s,col,big)}}
      break}
    case'dash':{const dist=Math.min(360,(s.dist||12)*24);
      if(t===4){M.x0=H.x;gv(pvAdd,{k:'thrust',x:H.x,y:H.y,z:58,dir:1,col,len:dist,w:28,dur:16,life:18})}
      if(t>=4&&t<4+dist/20){H.x+=20;pvEm({x:H.x-20,y:H.y,z:rnd(20,80),vx:-6,col,size:3,life:12,type:'sq'});pvHit(d=>Math.abs(d.x-H.x)<30&&d.hurt<4)}
      if(t===Math.ceil(4+dist/20)+2){for(const d of D)if(d.x>M.x0&&d.x<H.x+30)pvImpact(d.x,d.y,s,col,big)}break}
    case'nova':{const R=Math.min(300,(s.r||150)*1.4);
      if(t===8){for(let i=0;i<(big?3:2);i++)gv(pvAdd,{k:'shock',x:H.x,y:H.y,col,delay:i*5,dur:22,r:R+i*40});gv(pvAdd,{k:'flash',x:H.x,y:H.y,z:40,col,dur:18,life:18,r:R*.5,rot:0});
        for(const d of D)if(Math.abs(d.x-H.x)<R){pvHit(o=>o===d,!s.stun);pvImpact(d.x,d.y,s,col,big)}}
      if(s.stun&&t>12&&t<12+Math.min(60,s.stun)&&t%6===0)for(const d of D)gv(pvAdd,{k:'star',x:d.x+rnd(-14,14),y:d.y,z:118,col:'#ffe070',dur:8,life:8,s:.6});break}
    case'rain':{const n=Math.min(12,s.cnt||6),sp=Math.min(PV_W-280,s.spread||420);
      for(let i=0;i<n;i++)if(t===10+i*4){const x=PV_X+230+(i/(n-1||1))*sp*.6+rnd(-20,20),y=PV_GY+rnd(-18,18);pvImpact(x,y,s,col,big);PV.later.push({t:t+4,fn:()=>pvHit(d=>Math.abs(d.x-x)<55)})}break}
    case'chain':{const n=Math.min(D.length,s.cnt||3);
      for(let i=0;i<n;i++)if(t===10+i*7){const a=i?D[i-1]:{x:H.x+30,y:H.y},b=D[i];
        if(s.el==='bolt'||s.hk==='bolt')gv(pvAdd,{k:'zap',x0:a.x,y0:a.y,x1:b.x,y1:b.y,col:s.el!=='phys'?EL_COL[s.el]:col,dur:12});else gv(pvAdd,{k:'chain',x0:a.x,y0:a.y,z0:60,x1:b.x,y1:b.y,z1:60,col,dur:12});
        pvHit(o=>o===b);pvImpact(b.x,b.y,s,col,big)}break}
    case'quake':{const L=Math.min(400,(s.r||180)*1.6);
      if(t===12){ghUnder(pvAdd,{sub:'fissure',x0:H.x+30,x1:H.x+30+L,y:H.y,col:s.el!=='phys'?EL_COL[s.el]:col,dur:50});gv(pvAdd,{k:'shock',x:H.x+60,y:H.y,col,dur:22,r:200})}
      for(let i=0;i<6;i++)if(t===14+i*3){const x=H.x+60+i*L/6;pvImpact(x,H.y+rnd(-10,10),Object.assign({},s,{hk:s.hk||'rock'}),col,big);pvHit(d=>Math.abs(d.x-x)<45,i===5)}break}
    case'whirl':{const dur=Math.min(60,s.dur||60),R=Math.min(170,(s.r||110)*1.2);
      if(t>=6&&t<6+dur){H.state='spin';H.t=t;H.x+=1.6;if(t%8===6){gv(pvAdd,{k:'arc',f:H,x:H.x,y:H.y,dir:1,z:44,col,r:R,w:16,a0:-Math.PI,a1:Math.PI,span:3,sy:.38,delay:0,dur:12,life:12});pvHit(d=>Math.abs(d.x-H.x)<R)}}break}
    case'leap':{const dist=Math.min(260,(s.dist||220)),R=Math.min(220,(s.r||170)*1.2);
      if(t>=4&&t<28){H.state='jump';H.jatk=false;H.z=Math.sin((t-4)/24*Math.PI)*130;H.x+=dist/24}else if(t>=28&&t<56)H.z=0;
      if(t===28){setP('attack3',10);gv(pvAdd,{k:'shock',x:H.x,y:H.y,col,dur:24,r:R*1.6});gv(pvAdd,{k:'crack',x:H.x,y:H.y,col,r:R,n:9,dur:50});for(const d of D)if(Math.abs(d.x-H.x)<R){pvHit(o=>o===d,true);pvImpact(d.x,d.y,s,col,big)}}break}
    case'summon':{const n=s.cnt||2,lk=SUMMON_LOOK[s.look]||PV.look;
      if(t===8)for(let i=0;i<n;i++){gv(pvAdd,{k:'pillar',x:H.x+30+i*30,y:H.y-14+i*18,col,dur:20,life:20,w:40,h:220});
        gv(pvAdd,{k:'ghost',x0:H.x+30+i*30,x1:D[i%D.length].x-40,y:D[i%D.length].y,look:lk,col,delay:6,dur:60})}
      if(t>=40&&t<70&&t%8===0)for(let i=0;i<n;i++){const d=D[i%D.length];pvHit(o=>o===d);pvImpact(d.x,d.y,s,col,false)}break}
    case'buff':{if(t===6){gv(pvAdd,{k:'circle',x:H.x,y:H.y,f:H,col,dur:70,life:70,r:s.party?190:120,spin:-1.5});gv(pvAdd,{k:'pillar',x:H.x,y:H.y,f:H,col,dur:44,life:44,w:s.party?160:100,h:360})}
      if(t%3===0&&t<70)pvEm({x:H.x+rnd(-40,40),y:H.y,z:rnd(0,40),vz:rnd(2,5),col:t%2?col:'#ffffff',size:rnd(2,5),life:rnd(24,36),type:'sq'});
      if(t===14&&s.mods){let k=0;for(const m in s.mods){const nm=AF[m]?AF[m].n:m;pvAdd({k:'kanji',x:H.x+140,y:H.y,z:60+k*30,txt:`${nm} ▲`,col,size:20,dur:60,life:60});k++;if(k>=3)break}}
      if(s.aura&&t===14)pvAdd({k:'kanji',x:H.x+140,y:H.y,z:60,txt:'오라',col,size:22,dur:60,life:60});break}
  }
  if(K&&big&&t===20&&s.ty!=='buff')K.strike(pvAdd,pvEm,D[1].x,D[1].y,0);
}
const _pvScriptEX=pvScript;
pvScript=function(){const it=PV.L[PV.k];if(it.kind!=='skill')return _pvScriptEX();const H=PV.hero,K=KIT[H.h.id];GP_KIT=K||null;GP_F=1;try{pvSkill2(it)}finally{GP_KIT=null}};
/* 미리보기 목록: 같은 이름 · 같은 스킬이 두 번 나오지 않게 */
const _pvItemsEX=pvItems;
pvItems=function(ps){const L=_pvItemsEX(ps),seen=new Set();return L.filter(it=>{const k=it.kind+'|'+(it.s?it.s.id:it.id||(it.C&&it.C.id)||it.n);if(seen.has(k))return false;seen.add(k);return true})};
