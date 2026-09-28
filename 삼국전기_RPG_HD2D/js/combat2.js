'use strict';
/* ===== 전투 밸런스 · 회피 =====
   · 장수 기본 공격 밸런스: 각 장수의 연속기(1~3타) 시간 · 타수 · 사거리로 초당 위력을 계산해
     서로 비슷해지도록 기본 공격 피해 배율을 자동 보정 (히든 여포는 +10%)
   · 무기 종류 특성: 장수의 기본 무기와 다른 종류를 들면 공격력 · 공격 속도 · 사거리가 바뀐다
     (공격력 × 속도 × 사거리^0.6 ≈ 1 이 되도록 맞춰 어느 무기든 총합은 비슷)
   · 회피: 방향 + 회피 키로 구르기(앞) / 백스텝(뒤) — 무적 시간, 공격 도중 캔슬 가능,
     적의 공격을 아슬아슬하게 피하면 「완벽 회피」: 기력 +25 · 2초간 공격력 1.5배 · 주변 적 경직 */

/* ---------- 무기 종류 특성 ---------- */
const WPN_BAL={
  sword:{atk:.93,spd:1.15,reach:.9,n:'검'},dao:{atk:.98,spd:1.05,reach:.95,n:'도'},spear:{atk:.94,spd:1,reach:1.12,n:'창'},
  snake:{atk:.95,spd:1,reach:1.08,n:'사모'},halberd:{atk:1.02,spd:.92,reach:1.12,n:'극'},glaive:{atk:1,spd:.95,reach:1.1,n:'언월도'},
  bigdao:{atk:1.1,spd:.9,reach:1,n:'대도'},axe:{atk:1.2,spd:.85,reach:.95,n:'도끼'},mace:{atk:1.2,spd:.88,reach:.9,n:'철퇴'},
  whip:{atk:.88,spd:1,reach:1.25,n:'채찍'},bow:{atk:.95,spd:1.05,reach:1,n:'활'},fan:{atk:.97,spd:1.1,reach:.9,n:'부채'},staff:{atk:1.03,spd:1,reach:.95,n:'지팡이'}};
const wpnOf=w=>WPN_BAL[w]||WPN_BAL.sword;
/* 장수 기본 무기 대비 상대 배율 (기본 무기를 들면 1) */
function wpnRel(p){
  const cur=wpnOf(p.look.weapon),base=wpnOf(p.h.look.weapon);
  return{atk:cur.atk/base.atk,spd:cur.spd/base.spd,reach:cur.reach/base.reach};
}
/* ---------- 장수 기본 공격 밸런스 (자동 계산) ---------- */
const HERO_BAL={},HERO_DPS={};
(function(){
  for(const h of HEROES){
    const M=MOVES[h.id]||MOVES[MOVE_ALIAS[h.id]]||{};let T=0,Hs=0;
    for(const c of['c1','c2','c3']){const mv=M[c];T+=mv?mv.dur:(c==='c3'?24:17);
      const hits=mv&&mv.hits&&mv.hits.length?mv.hits:(mv&&mv.shoot?[]:[[5,10,c==='c3'?{knock:true}:{}]]);
      for(const x of hits){const o=x[2]||{};Hs+=(o.knock?1.6:1)*(o.around?1.15:1)*(o.reach||1)}
      if(mv&&mv.shoot)Hs+=1.4}
    HERO_DPS[h.id]=h.pow*Hs/T*Math.pow(h.reach/100,.6);
  }
  const v=Object.values(HERO_DPS).sort((a,b)=>a-b),med=v[v.length>>1];
  for(const h of HEROES)HERO_BAL[h.id]=clamp(med*(h.id==='lubu'?1.1:1)/HERO_DPS[h.id],.8,1.3);
})();
const BASIC_BAL={attack:1,dashatk:1,jump:1,rise:1,spin:1};

/* 기본 공격 피해에 밸런스 배율 적용 */
const _damageC=damage;
damage=function(a,t,dmg,knock,opt){
  if(a&&a.isPlayer&&a.ps&&a.h&&BASIC_BAL[a.state]&&!(opt&&opt.dot))dmg=Math.max(1,Math.round(dmg*(HERO_BAL[a.h.id]||1)*wpnRel(a).atk));
  if(t&&t.isPlayer&&t.state==='dodge'&&t.inv>0)return false;
  return _damageC(a,t,dmg,knock,opt);
};
/* 프레임 건너뛰기 · 반복에도 안전한 모션 처리 (공격 속도 배율용) */
runMove=function(p,mv){
  const t=p.t;let lt=p._lt;if(lt==null||lt>t)lt=t-1;p._lt=t;const ev=a=>a!=null&&a>lt&&a<=t;
  for(const[a,b,o]of mv.hits){
    if(o&&o.reset&&ev(a)){p.hitIds=new Set();sfx('swing',p.look.weapon)}
    if((t>=a&&t<=b)||ev(a))meleeHit(p,!!(o&&o.knock),o);
  }
  if(mv.mv&&t!==lt)for(const[a,b,s]of mv.mv)if(t>=a&&t<=b)p.x+=p.facing*s;
  if(ev(mv.shoot))heroFinisher(p);
  if(mv.fx&&ev(mv.fxAt))moveFx(p,mv.fx);
  if(mv.hits.some(h=>h[2]&&h[2].around)&&t%3===0)burst(p.x,p.y,55,p.h.fx,3,6,{type:'spark',size:3});
};

/* ---------- 회피 ---------- */
const DODGE_OK={idle:1,walk:1,run:1,attack:1,use:1,cmd:0};
function startDodge(p,K){
  const dx=(K.right?1:0)-(K.left?1:0),dy=(K.down?1:0)-(K.up?1:0);
  const back=dx===0?(dy===0):Math.sign(dx)!==p.facing,mx=dx||(dy?0:-p.facing);
  p.state='dodge';p.t=0;p.combo=0;p.queued=false;p.dodgeVx=mx*(back?7.5:9.5);p.dodgeVy=dy*6;p.dodgeBack=back&&dx!==0||(!dx&&!dy);
  if(!p.dodgeBack&&dx)p.facing=dx;p.inv=Math.max(p.inv,18);p.dodgeIF=true;p.pdDone=false;p.dodgeCd=34;
  sfx('dash');for(let i=0;i<6;i++)emit({x:p.x+rnd(-14,14),y:p.y,z:2,vz:rnd(.5,1.5),vx:-mx*rnd(1,3),col:'#c8b490',size:rnd(8,14),life:22,type:'smoke',add:false});
}
function dodgeThreat(p){
  const w=Wd;
  for(const e of w.enemies){if(e.dead)continue;const dx=Math.abs(e.x-p.x),dy=Math.abs(e.y-p.y);
    if(dy<40&&dx<130&&(e.state==='attack'||e.state==='charge'||(e.state==='skill'&&dx<200)))return true}
  for(const o of w.proj)if(o.owner==='e'&&Math.abs(o.x-p.x)<80&&Math.abs(o.y-p.y)<36)return true;
  for(const z of w.hz)if(z.owner==='e'&&Math.abs(z.delay-z.t)<10){const dx=p.x-z.x,dy=(p.y-z.y)*2;if(dx*dx+dy*dy<z.r*z.r*1.3)return true}
  return false;
}
function perfectDodge(p){
  const w=Wd;p.pdDone=true;p.mp=Math.min(p.maxki,p.mp+25);p.buf.atk=Math.max(p.buf.atk,120);hitstop=Math.max(hitstop,6);
  w.fx.push({type:'text',x:p.x,y:p.y,z:150,t:0,life:60,txt:'완벽 회피!',col:'#a8f0ff',size:24});sfx('magic');
  if(typeof vfx==='function'){vfx({k:'flash',x:p.x,y:p.y,z:60,col:'#a8f0ff',life:20,r:120,rot:0});vfx({k:'shock',x:p.x,y:p.y,col:'#a8f0ff',life:24,r:260})}
  for(const e of w.enemies)if(!e.dead&&!e.boss&&Math.abs(e.x-p.x)<220&&Math.abs(e.y-p.y)<70&&e.state!=='down'){e.state='hurt';e.t=0;e.hurtLen=34}
}
function updDodge(p){
  const w=Wd,t=p.t,k=Math.max(0,1-t/20);
  p.x+=p.dodgeVx*k;p.y+=p.dodgeVy*k*.7;
  if(t%2===0)w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:12,facing:p.facing,look:p.look,pose:poseOf(p),tint:'rgba(170,230,255,.5)'});
  if(p.dodgeIF&&!p.pdDone&&dodgeThreat(p))perfectDodge(p);
  if(t>=15)p.dodgeIF=false;
  if(t>=22){p.state='idle';p.t=0}
  const maxX=w.lock!==null?w.camX+W-25:Math.min(w.S.len-25,w.camX+W-25);p.x=clamp(p.x,w.camX+25,maxX);p.y=clamp(p.y,GT+5,GB);
}
/* 플레이어 갱신: 회피 입력 · 무기 속도 · 무기 사거리 */
const _updPlayerC=updPlayer;
updPlayer=function(p){
  if(!p.out&&!p.dead&&scene==='play'){
    const rel=wpnRel(p);p.reach=p.h.reach*rel.reach;
    if(p.dodgeCd>0)p.dodgeCd--;
    const P=G.np===2?PP[p.idx]:pressed;
    if(P.dodge){P.dodge=false;if(!(p.dodgeCd>0)&&DODGE_OK[p.state]&&p.z<=0)startDodge(p,pkeys(p.idx))}
    if(p.state==='attack'||p.state==='dashatk'){p._acc=(p._acc||0)+rel.spd-1;while(p._acc>=1){p._acc--;p.t++}while(p._acc<=-1){p._acc++;p.t--}}else p._acc=0;
  }
  _updPlayerC(p);
  if(p.state==='dodge'&&!p.dead)updDodge(p);
};
/* 회피 자세: 앞 구르기(몸 회전) · 백스텝(뒤로 젖힘) */
const _poseOfC=poseOf;
poseOf=function(e){
  if(e&&e.state==='dodge'){const t=e.t||0;
    if(e.dodgeBack){e.state='hurt';const p=_poseOfC(e);e.state='dodge';p.lean=-.35;p.legL=-.6;p.legR=.5;p.bob=Math.sin(Math.min(1,t/14)*Math.PI)*3;return p}
    e.state='run';const p=_poseOfC(e);e.state='dodge';p.lean=.9;p.bob=Math.sin(Math.min(1,t/16)*Math.PI)*2;p.legL=-1.2;p.legR=1;p.armL=-1.2;p.armR=-1;return p}
  return _poseOfC(e);
};

/* ---------- 표시: 무기 특성 툴팁 ---------- */
const _itemLinesC=itemLines;
itemLines=function(it,ps){
  const L=_itemLinesC(it,ps);
  if(it.s==='weapon'){const h=HEROES[ps.hero],wk=it.wt?WTYPES[it.wt].m:(it.h?HEROES.find(x=>x.id===it.h).look.weapon:h.look.weapon),c=wpnOf(wk),b=wpnOf(h.look.weapon);
    const pc=v=>(v>=1?'+':'')+Math.round((v-1)*100)+'%';
    L.splice(Math.max(2,L.length-1),0,[`무기 특성 (${c.n}) — 공격력 ${pc(c.atk/b.atk)} · 공격 속도 ${pc(c.spd/b.spd)} · 사거리 ${pc(c.reach/b.reach)}  (기본 무기 대비)`,'#ffd890',12])}
  return L;
};
