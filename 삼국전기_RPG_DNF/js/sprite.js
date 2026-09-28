'use strict';
/* ===== 스프라이트 시트 렌더러 (던파식 아바타 레이어) =====
   · sprites/manifest.js 에 적힌 팩(sprites/<id>/anim.js)을 불러와 캐릭터를 손으로 찍은 도트 스프라이트로 그린다.
   · 팩이 없거나 아직 로딩 중인 캐릭터는 기존 렌더러(코드로 그린 캐릭터)로 자동 대체된다.
   · 레이어: back(망토 · 뒷팔 · 뒷머리) → body(몸 · 머리) → weapon(무기) → front(앞팔) 순서로 겹쳐 그림.
     장비 레이어: 장비 부위마다 변형 그림(variants)을 두면 아이템마다 다른 그림이 선택되고, 등급 색이 덧칠된다.
     무기는 무기 종류(byType)별 그림을 둘 수 있다.
   · 동작은 게임 상태(대기 · 걷기 · 1~3타 · 스킬 · 피격 …)와 시간에 맞춰 재생되고,
     팩에 useHits 를 켜면 anim 의 hit 프레임이 실제 공격 판정 구간이 된다.
   적 · 보스도 같은 방식 — 병사 en_<세력>_<병종>, 보스 boss_<id> (아래 SPR_ETOK · SPR_BOSS).
   자세한 규격은 「스프라이트_제작가이드.md」 참고. */

/* ---------- 동작 규격 (베이커 · 가이드와 공유) ---------- */
const SPR_SPEC=[
  {n:'idle',f:6,fps:8,loop:1,d:'대기 (숨쉬기)'},{n:'walk',f:8,fps:12,loop:1,d:'걷기'},{n:'run',f:6,fps:14,loop:1,d:'달리기'},
  {n:'attack1',f:6,d:'기본 공격 1타'},{n:'attack2',f:6,d:'기본 공격 2타'},{n:'attack3',f:8,d:'기본 공격 3타 (마무리 · 넉백)'},
  {n:'dashatk',f:6,dur:24,d:'달리며 공격'},{n:'jump',f:2,d:'점프 (0 상승 · 1 하강)'},{n:'jatk',f:4,dur:10,d:'점프 공격'},
  {n:'rise',f:5,dur:20,d:'승천격 (띄우기)'},{n:'spin',f:8,dur:32,d:'회전베기 (무적)'},{n:'cmd',f:6,dur:26,d:'전용기 ↓→+공격'},
  {n:'cast',f:6,dur:30,d:'스킬 시전'},{n:'special',f:10,dur:60,d:'필살기'},{n:'hurt',f:2,dur:14,d:'피격'},
  {n:'fall',f:2,dur:30,d:'공중에 떠서 날아감'},{n:'down',f:2,dur:50,d:'쓰러져 누움'},{n:'dodge',f:4,dur:22,d:'회피 구르기'},
  {n:'backstep',f:4,dur:22,d:'회피 백스텝'},{n:'stun',f:4,fps:6,loop:1,d:'기절 · 그로기'},{n:'win',f:4,dur:50,d:'승리 포즈'},{n:'use',f:3,dur:14,d:'아이템 사용'}];
const SPR_DUR={};for(const A of SPR_SPEC)if(A.dur)SPR_DUR[A.n]=A.dur;
/* 적 · 보스 동작 규격 (무장보다 적다) — 기마(_m)는 말 탄 상태에서 쓰는 동작 */
const SPR_SPEC_E=[
  {n:'idle',f:6,fps:8,loop:1,d:'대기'},{n:'walk',f:8,fps:12,loop:1,d:'걷기'},{n:'run',f:6,fps:14,loop:1,d:'달리기 · 도주 · 돌격'},
  {n:'attack1',f:6,d:'공격 (병사 34 · 보스 24)'},{n:'shoot',f:6,dur:34,d:'활 쏘기 (궁병 · 궁장)'},{n:'cast',f:6,fps:16,loop:1,d:'스킬 · 기술 준비 (반복)'},
  {n:'hurt',f:2,dur:14,d:'피격'},{n:'fall',f:2,dur:30,d:'날아감'},{n:'down',f:2,dur:50,d:'쓰러짐'},{n:'stun',f:4,fps:6,loop:1,d:'기절 · 그로기'}];
const SPR_SPEC_M=['idle','walk','run','attack1','cast','hurt','stun'];
/* 병사: en_<세력>_<병종>  (세력 yellow · dong · wei · yuan / 병종 s 검병 · sp 창병 · a 궁병 · o 장교 · sh 방패병 · cv 기병 · fl 기수) */
const SPR_ETOK={s:'검병',sp:'창병',a:'궁병',o:'장교',sh:'방패병',cv:'기병',fl:'기수'};
const SPR_FACN={yellow:'황건',dong:'동탁',wei:'위',yuan:'원소'};
/* 보스: boss_<id> */
const SPR_BOSS={'하후은':'xiahouen','장각':'zhangjiao','여포':'lubu','허저':'xuchu','장료':'zhangliao','조조':'caocao','사마의':'simayi','안량':'yanliang','하후돈':'xiahoudun','하후연':'xiahouyuan','방덕':'pangde'};
/* 칸 규격 [폭, 높이, 기준점 x, 기준점 y, 굽는 배율] — 보스는 1.5배로 그려 화면에서 커져도 도트가 굵어지지 않게 */
const SPR_FRAME={hero:[328,312,164,236,1],foot:[296,272,150,212,1],cav:[312,296,168,232,1],boss:[432,360,208,296,1.5],bossM:[464,440,234,376,1.5]};
/* 장비 등급 덧칠 색 */
const SPR_GT={rare:'rgba(70,130,255,.22)',epic:'rgba(170,90,255,.26)',set:'rgba(60,220,110,.22)',excl:'rgba(255,160,40,.26)',myth:'rgba(255,60,40,.3)'};

/* ---------- 팩 등록 · 로딩 ----------
   · 그림은 필요할 때만 불러온다: 스테이지 시작 시 그 판에 나올 무장 · 병사 · 보스만 미리 읽고, 나머지 팩의 그림은 메모리에서 내린다.
   · 아틀라스(atlas): 베이커가 격자 시트의 빈 공간을 잘라 촘촘히 모은 실행용 그림(<시트>.atlas.png)을 함께 만든다.
     있으면 그것을 쓰고, 주소 끝에 ?sprgrid 를 붙이면 격자 시트를 그대로 쓴다 (덧그린 시트를 아틀라스 갱신 전에 바로 확인할 때). */
const SPR={packs:{}};
const SPR_GRID=/[?&]sprgrid\b/.test(location.search);
function SPR_REGISTER(def){
  const P=Object.assign({layers:['back','body','weapon','front'],scale:1,cols:10,anchor:[164,236]},def);
  P.base=def.base||('sprites/'+def.id+'/');P.img={};P.tc=new Map();
  SPR.packs[P.id]=P;
}
const sprAtlas=(P,f)=>!SPR_GRID&&P.atlas&&P.atlas[f]||null;
function sprLoad(P,f){const A=sprAtlas(P,f),src=A?A.f:f;let im=P.img[src];
  if(!im){im=new Image();P.img[src]=im;im.onload=()=>{im.done=true};
    im.onerror=()=>{if(A&&!im.retry){im.retry=1;P.atlas[f]=null;delete P.img[src];return}im.bad=true;console.warn('[스프라이트] 불러오기 실패:',P.base+src)};
    im.src=P.base+src}
  return im}
/* 이 외형을 그리는 데 필요한 그림이 다 준비됐나 (안 됐으면 불러오기 시작) */
function sprReady(P,L){let ok=true,any=false;
  for(const lay of P.layers){const R=sprSheetFor(P,L,lay);if(!R.f)continue;const im=sprLoad(P,R.f);if(im.done)any=true;else if(!im.bad)ok=false}
  return ok&&any}
function sprWant(L){const P=L&&L.spr&&SPR.packs[L.spr];if(P){sprReady(P,L);return P.id}return null}
function sprDrop(P){P.img={};P.tc.clear()}
(function(){for(const id of(window.SPRITE_MANIFEST||[])){const s=document.createElement('script');s.async=false;s.src='sprites/'+id+'/anim.js';document.head.appendChild(s)}})();
for(const h of HEROES)if(!h.look.spr)h.look.spr=h.id;
const _enemyLookS=enemyLook;
enemyLook=function(fac,tok){const L=_enemyLookS(fac,tok);if(!L.spr)L.spr='en_'+fac+'_'+tok;return L};
const sprBossDefs=()=>[MIDBOSS].concat(STAGES.filter(s=>s.boss).map(s=>s.boss));
for(const d of sprBossDefs())if(d.look&&!d.look.spr&&SPR_BOSS[d.name])d.look.spr='boss_'+SPR_BOSS[d.name];
if(typeof riderLook==='function'){const _riderLookS=riderLook;riderLook=function(e){const L=_riderLookS(e);L.spr='en_wei_cv';return L}}
const sprPackOf=L=>{const P=L&&L.spr&&SPR.packs[L.spr];return P&&sprReady(P,L)?P:null};
/* 스테이지 시작: 이번 판에 나올 캐릭터 그림만 미리 읽고 나머지는 내린다 */
if(typeof startStage==='function'){const _startStageS=startStage;
  startStage=function(i){_startStageS(i);
    const S=STAGES[i],keep=new Set();
    for(const p of Wd.ps||[])keep.add(sprWant(p.look));
    for(const t in ETYPES)keep.add(sprWant(enemyLook(S.fac,t)));
    if(S.boss){keep.add(sprWant(S.boss.look));if((BOSS_PHASES[S.boss.name]||[]).some(q=>q.enter==='mount'))keep.add(sprWant(Object.assign({},S.boss.look,{mount:'#b8321c'})))}
    keep.add(sprWant(MIDBOSS.look));keep.add(sprWant(riderLook()));
    for(const id in SPR.packs)if(!keep.has(id))sprDrop(SPR.packs[id])}}

/* ---------- 장비 정보 → 외형 ---------- */
const _heroLookS=heroLook;
heroLook=function(ps){const L=_heroLookS(ps),eq=ps.rpg.eq;L.sprEq={};
  for(const k of EQ_SLOTS){const it=eq[k];if(it)L.sprEq[slotType(k)]={seed:itemSeed(it)>>>0,g:it.g}}return L};

/* ---------- 자세에 게임 상태 · 시간 실어 보내기 ---------- */
const _poseOfS=poseOf;
poseOf=function(e){const p=_poseOfS(e);
  if(e&&e.look&&e.look.spr){p.__st=e.state;p.__t=e.state==='jump'&&e.jatk?(e.jt||0):(e.t||0);p.__anim=e.anim||0;p.__combo=e.combo||1;p.__jatk=!!e.jatk;p.__vz=e.vz||0;p.__back=!!e.dodgeBack;
    p.__skill=e.skill||'';p.__charge=e.state==='charge'?e.t||0:-1;
    if(e.state==='attack'){const mv=e.h&&typeof moveOf==='function'&&moveOf(e,'c'+(e.combo||1));p.__dur=mv?mv.dur:!e.isPlayer?(e.boss?24:34):(e.combo===3?24:17)}
    if(e.state==='hurt'&&!e.isPlayer)p.__dur=Math.max(8,e.hurtLen||14)}
  return p};

/* ---------- 동작 · 프레임 선택 ---------- */
function sprAnimName(P,ps){
  let c;switch(ps.__st){
    case'attack':c=['attack'+(ps.__combo||1),'attack1'];break;case'jump':c=ps.__jatk?['jatk','attack1']:['jump','idle'];break;
    case'down':c=ps.lie?['down','hurt']:['fall','hurt'];break;case'pskill':case'phase':c=['cast','attack3'];break;
    case'skill':c=['sk_'+ps.__skill,'cast','attack3'];break;case'shoot':c=['shoot','cast','attack1'];break;
    case'charge':c=ps.__charge>=0&&ps.__charge<44?['cast','run']:['run','walk'];break;case'flee':c=['run','walk'];break;case'stun':c=['stun','hurt'];break;case'grabbed':case'fear':c=['hurt'];break;
    case'dodge':c=ps.__back?['backstep','dodge','run']:['dodge','run'];break;case'special':c=['special','attack3'];break;
    case'cmd':c=['cmd','attack3'];break;case'spin':c=['spin','attack2'];break;case'rise':c=['rise','attack3'];break;case'dashatk':c=['dashatk','attack1'];break;
    default:c=[ps.__st||'idle','idle']}
  if(ps.__mount)for(const n of c)if(P.anims[n+'_m'])return n+'_m';
  for(const n of c)if(P.anims[n])return n;return'idle';
}
function sprFrame(P,name,ps){
  const A=P.anims[name],n=A.frames.length;
  if(A.loop)return A.frames[Math.floor((ps.__anim||0)*(A.fps||10)/60)%n];
  if(name==='jump')return A.frames[(ps.__vz||0)>0?0:Math.min(1,n-1)];
  const dur=/^(attack|hurt)/.test(name)&&ps.__dur?ps.__dur:(A.dur||SPR_DUR[name.replace(/_m$/,'')]||(name.startsWith('attack')?20:30));
  return A.frames[Math.max(0,Math.min(n-1,Math.floor((ps.__t||0)/dur*n)))];
}
/* 레이어별 시트 (장비 변형 · 무기 종류) */
function sprSheetFor(P,L,lay){
  if(P.equip)for(const slot in P.equip){const E=P.equip[slot];if(E.layer!==lay)continue;const it=L.sprEq&&L.sprEq[slot];
    if(E.byType){const f=E.byType[L.weapon]||E.byType.default||P.sheets[lay];return{f,tint:it&&E.recolor?SPR_GT[it.g]:null}}
    if(E.variants&&E.variants.length){if(!it)return{f:E.empty||P.sheets[lay]||null};return{f:E.variants[it.seed%E.variants.length],tint:E.recolor?SPR_GT[it.g]:null}}}
  return{f:P.sheets[lay]};
}
/* 시트에서 한 칸 (덧칠 색이 있으면 칠한 사본을 캐시) */
/* 시트에서 한 칸 — 아틀라스면 잘린 조각 [sx,sy,w,h,칸 안 x,칸 안 y] (덧칠 색이 있으면 칠한 사본을 캐시) */
function sprCell(P,file,fi,tints){
  const im=sprLoad(P,file);if(!im.done)return null;const A=sprAtlas(P,file);let sx,sy,w,h,dx=0,dy=0;
  if(A){const r=A.r[fi];if(!r)return null;[sx,sy,w,h,dx,dy]=r}else{sx=(fi%P.cols)*P.fw;sy=((fi/P.cols)|0)*P.fh;w=P.fw;h=P.fh}
  if(!tints.length)return{im,sx,sy,w,h,dx,dy};
  const key=file+'|'+fi+'|'+tints.join('|');let c=P.tc.get(key);
  if(!c){c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(im,sx,sy,w,h,0,0,w,h);
    g.globalCompositeOperation='source-atop';for(const t of tints){g.fillStyle=t;g.fillRect(0,0,w,h)}
    if(P.tc.size>400)P.tc.clear();P.tc.set(key,c)}
  return{im:c,sx:0,sy:0,w,h,dx,dy};
}
function renderSprite(g,P,L,ps,sx,sy,scale,facing,opt){
  ps.__mount=!!L.mount;const name=sprAnimName(P,ps),A=P.anims[name],fi=sprFrame(P,name,ps),f=facing<0?-1:1,s=scale*P.scale*(L.scale||1);
  const et=opt.flash?'rgba(255,255,255,.75)':opt.tint||null,[ax,ay]=P.anchor;
  const order=(A.order&&A.order[A.frames.indexOf(fi)])||A.layers||P.layers;
  g.save();g.imageSmoothingEnabled=false;g.translate(Math.round(sx),Math.round(sy));g.scale(f*s,s);
  for(const lay of order){const R=sprSheetFor(P,L,lay);if(!R.f)continue;const c=sprCell(P,R.f,fi,[R.tint,et].filter(Boolean));if(c)g.drawImage(c.im,c.sx,c.sy,c.w,c.h,c.dx-ax,c.dy-ay,c.w,c.h)}
  g.restore();
  const tp=(P.tips&&P.tips[fi])||[60,-70];
  return{tx:sx+f*tp[0]*s,ty:sy+tp[1]*s,mx:sx+f*tp[0]*.5*s,my:sy+(tp[1]*.5-35)*s};
}
/* 기존 렌더러 앞에 끼워 넣기 (팩이 없으면 그대로 넘김) */
const _renderModelS=renderModel,_renderModelOS=renderModelOutlined;
/* 자세 정보가 없는 호출(HUD 초상화 · 메뉴 · 군영)은 대기 동작으로 그린다 */
const sprPose=p=>p&&p.__st!=null?p:Object.assign({},p||{},{__st:p&&p.gallop?'run':'idle',__anim:p&&p.gallop?p.gallop/.45:frame});
renderModel=function(g,L,pose,sx,sy,scale,facing,opt){const P=sprPackOf(L);if(P)return renderSprite(g,P,L,sprPose(pose),sx,sy,scale,facing,opt||{});return _renderModelS(g,L,pose,sx,sy,scale,facing,opt)};
renderModelOutlined=function(g,L,pose,sx,sy,scale,facing,opt,oc){const P=sprPackOf(L);if(P)return renderSprite(g,P,L,sprPose(pose),sx,sy,scale,facing,opt||{});return _renderModelOS(g,L,pose,sx,sy,scale,facing,opt,oc)};

/* ---------- 스프라이트 타격 프레임 → 실제 공격 판정 (팩의 useHits 가 켜져 있을 때) ---------- */
if(typeof runMove==='function'){const _runMoveS=runMove;
  runMove=function(p,mv){
    const P=p.state==='attack'&&sprPackOf(p.look);
    if(P&&P.useHits){const A=P.anims['attack'+p.combo];
      if(A&&A.hit){const n=A.frames.length,dur=mv.dur,h=A.hit,base=p.reach*rsc(p)*1.1*aoeM(p)*(p.look.scale||1);
        return _runMoveS(p,Object.assign({},mv,{hits:[[Math.floor(h.from/n*dur),Math.max(Math.floor(h.from/n*dur),Math.ceil((h.to+1)/n*dur)-1),{reach:(h.reach||base)/base,knock:!!h.knock}]]}))}}
    return _runMoveS(p,mv)};
}
