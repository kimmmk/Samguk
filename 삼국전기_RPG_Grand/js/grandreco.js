'use strict';
/* ===== 장비 추천 강화 =====
   · 새 장비를 주웠을 때 지금 착용 중인 것보다 좋으면(추천 계산 기준) 머리 위 알림 + 상태창 아래 「추천 장비」 배지
   · 장비 탭: 추천 장비 칸을 깜빡이는 초록 테두리 + 「추천」
   · 장비 설명: 추천이면 「착용 시 전투력 ▲N」 줄 추가
   · 3 키(2P 는 '): 다음 추천 장비로 커서 이동 · 2 키: 추천 장착(기존) */

/* 추천 장비 목록: 착용하지 않은 추천 장비 + 부위 + 전투력 상승 */
function recoList(ps){
  const R=recoCache(ps),eq=ps.rpg.eq,out=[];
  for(const sl of EQ_SLOTS){const it=R.eq[sl];if(!it||it===eq[sl]||Object.values(eq).includes(it))continue;
    const gain=Math.round(powerScore(ps,Object.assign({},eq,{[sl]:it}))/10)-powerNum(ps);if(gain>0)out.push({it,sl,gain})}
  return out;
}
/* 주울 때 알림 */
const _pickupRpgGR=pickupRpg;
pickupRpg=function(it,p){
  const ok=_pickupRpgGR(it,p);
  if(ok&&it.kind==='gear'&&it.gear&&p.ps){const ps=p.ps,g=it.gear;
    if(!canEquip(ps,g)){RECO=null;const r=recoList(ps).find(o=>o.it===g);
      if(r){ps.recoAlert={t:0,n:recoList(ps).length};
        Wd.fx.push({type:'text',x:p.x,y:p.y,z:172,t:0,life:120,txt:`★ 추천 장비! 「${g.n}」 ${SLOTS[slotType(r.sl)].n} 전투력 ▲${r.gain}`,col:'#70ff90',size:18});
        for(let i=0;i<14;i++)emit({x:p.x+rnd(-30,30),y:p.y,z:rnd(20,120),vz:rnd(1,3),col:i%2?'#70ff90':'#ffffff',size:rnd(2,4),life:rnd(24,40),type:'sq'});sfx('ok')}}}
  return ok;
};
/* 상태창 아래 배지 */
const _drawPanelGR=drawPanel;
drawPanel=function(p,x0){
  _drawPanelGR(p,x0);
  const ps=p.ps,A=ps&&ps.recoAlert;if(!A||p.out)return;A.t++;
  const K=kn(p.idx),a=.75+.25*Math.sin(A.t*.15),txtS=`★ 추천 장비 ${A.n}개 — ${K.menu} 장비창 · ${K.sk[1]} 추천 장착`;
  ctx.font=`bold 13px ${FONT}`;const w=ctx.measureText(txtS).width+20;
  ctx.globalAlpha=a;ctx.fillStyle='rgba(6,40,14,.88)';ctx.fillRect(x0,138,w,22);ctx.strokeStyle='#70ff90';ctx.lineWidth=1.5;ctx.strokeRect(x0+.5,138.5,w-1,21);
  txt(txtS,x0+10,149,13,'#a8ffb8','left');ctx.globalAlpha=1;
};
/* 장비 칸 표시 */
const _gearCellGR=gearCell;
gearCell=function(it,x,y,sz,sel,dim){
  _gearCellGR(it,x,y,sz,sel,dim);
  if(!it||!GEAR_PS)return;const ps=GEAR_PS;
  if(RECO&&RECO.set.has(it)&&!Object.values(ps.rpg.eq).includes(it)&&!canEquip(ps,it)){const a=.55+.45*Math.sin(frame*.15);
    ctx.strokeStyle=`rgba(112,255,144,${a})`;ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,sz-3,sz-3);
    ctx.fillStyle='rgba(6,60,20,.9)';ctx.fillRect(x+1,y+1,26,12);txt('추천',x+14,y+7,9,'#a8ffb8','center',FONT)}
};
/* 장비 설명에 추천 줄 */
const _itemLinesGR=itemLines;
itemLines=function(it,ps){
  const L=_itemLinesGR(it,ps);
  if(scene==='menu'&&MN&&MN.tab===0&&ps&&!Object.values(ps.rpg.eq).includes(it)){const r=recoList(ps).find(o=>o.it===it);
    if(r)L.splice(1,0,[`★ 추천 장비 — ${SLOTS[slotType(r.sl)].n}에 착용 시 전투력 ▲${r.gain}`,'#70ff90',13])}
  return L;
};
/* 다음 추천 장비로 커서 이동 */
function recoJump(ps){
  const list=recoList(ps);if(!list.length){menuMsg('추천할 장비가 없습니다 — 지금 장비가 가장 좋습니다','#b0ffb0');sfx('sel');return}
  MN.recoK=((MN.recoK||0)+1)%list.length;const target=list[MN.recoK].it,bi=ps.rpg.bag.indexOf(target);if(bi<0)return;
  let L=boxList(ps.rpg,MN.gbox,MN.slotF),pos=L.indexOf(bi);
  if(pos<0){MN.gbox='all';MN.slotF=null;MN.slotK=null;L=boxList(ps.rpg,MN.gbox,MN.slotF);pos=L.indexOf(bi)}
  if(pos<0)return;MN.page=Math.floor(pos/BOX_PAGE);MN.cur[0]=EQ_SLOTS.length+BOX_TABS.length+2+pos%BOX_PAGE;
  menuMsg(`추천 ${MN.recoK+1}/${list.length}: 「${target.n}」 ${SLOTS[slotType(list[MN.recoK].sl)].n} ▲${list[MN.recoK].gain}  (${kn(MN.i).atk} 장착 · ${kn(MN.i).sk[1]} 모두 장착)`,'#70ff90');sfx('sel');
}
const _updMenuGR=updMenu;
updMenu=function(){
  if(MN&&MN.tab===0&&!(typeof PV!=='undefined'&&PV.on)){const i=MN.i,P=G.np===2?PP[i]:pressed,ps=G.pl[i];ps.recoAlert=null;
    if(P.sk3){P.sk3=false;recoJump(ps);return}
  }
  _updMenuGR();
};
const _drawMenuGR=drawMenu;
drawMenu=function(){
  _drawMenuGR();
  if(MN&&MN.tab===0&&!(typeof PV!=='undefined'&&PV.on)){const ps=G.pl[MN.i],list=recoList(ps),K=kn(MN.i);
    if(list.length){const a=.8+.2*Math.sin(frame*.12);ctx.globalAlpha=a;
      txt(`★ 추천 ${list.length}개 (최대 ▲${Math.max(...list.map(o=>o.gain))}) · ${K.sk[2]} 이동 · ${K.sk[1]} 모두 장착`,384,289,12,'#70ff90','left',FONT,['#000',3]);ctx.globalAlpha=1}}
};
