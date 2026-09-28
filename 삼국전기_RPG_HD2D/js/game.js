'use strict';
/* ===== 게임 로직 · 화면 (1~2인) ===== */
let scene='title',G=null,Wd=null,frame=0,hitstop=0,paused=false,story=null,contT=0,menuIdx=0,selT=0,selFlash=0;
let diffIdx=clamp(+(store.get('kov_diff')||1),0,3),numPlayers=clamp(+(store.get('kov_np')||1),1,2);
let unlockLubu=store.get('kov_lubu')==='1';
const sel=[{idx:0,ok:false},{idx:2,ok:false}];
const titleFx=[];
const SECRET=['up','up','down','down','left','right','left','right'];
const D=()=>DIFFS[G?G.diffIdx:diffIdx];
const PCOL=['#ff5050','#50a0ff'];

/* ---------- 입력 (플레이어별) ---------- */
function pkeys(i){return G&&G.np===2?KP[i]:keys}
function phit(i,k){const P=G&&G.np===2?PP[i]:pressed;if(P[k]){P[k]=false;return true}return false}

/* ---------- 게임 시작 ---------- */
function mkPS(i,hi){const h=HEROES[hi];const ps={idx:i,hero:hi,lvl:1,exp:0,maxhp:h.hp,hpCarry:h.hp,mp:30,inv:[{kind:'knife',n:3},{kind:'bomb',n:1},{kind:'elixir',n:1}],sel:0,lives:DIFFS[diffIdx].lives,score:0,cont:0,out:false,rpg:newRpg(hi)};
  recalc(ps);ps.hpCarry=ps.st.maxhp;return ps}
const vprof=p=>VPROF[p.h.id]||VPROF.enemy;
function newGame(heroes){
  G={flags:{},np:heroes.length,diffIdx,treasures:{},def:1,spB:1,tPow:0,spdB:0,cycle:0,prog:0,done:false,clears:{},slot:null,pl:heroes.map((hi,i)=>mkPS(i,hi))};
  startStage(0);
}
function totalScore(){return G.pl.reduce((a,s)=>a+s.score,0)}
function mkEnt(o){return Object.assign({x:0,y:430,z:0,vz:0,vx:0,facing:1,state:'idle',t:0,anim:0,hp:10,maxhp:10,inv:0,combo:0,flash:0,poise:0,cd:0,dead:false,trail:[]},o)}
function mkPlayer(ps){
  const h=HEROES[ps.hero];
  const st=ps.st;
  const p=mkEnt({isPlayer:true,idx:ps.idx,ps,x:120-ps.idx*40,y:ps.idx?470:420,hp:Math.max(1,Math.min(st.maxhp,Math.round(ps.hpCarry))),maxhp:st.maxhp,mp:Math.min(ps.mp,st.maxki),maxki:st.maxki,mana:st.maxmp,maxmana:st.maxmp,
    look:heroLook(ps),h,reach:h.reach,facing:1,cmd:[],buf:{atk:0,spd:0,shield:0},vT:0,sbuf:{},bm:{},cds:{},cdMax:{},pcd:new Map(),auraT:0,slowT:0,cheated:false,sk:null});
  if(ps.out){p.dead=true;p.out=true;p.hp=0;p.state='down';p.t=999}
  return p;
}
function startStage(i){
  const S=STAGES[i];G.stage=i;
  buildBG(S.bg);PT.length=0;
  for(const s of G.pl){recalc(s);s.lives=DIFFS[G.diffIdx].lives}
  Wd={S,camX:0,lock:null,wave:0,enemies:[],items:[],props:[],proj:[],fx:[],hz:[],t:0,boss:null,bossT:0,bossSpawned:false,clear:0,
    banner:200,go:0,msg:null,shake:0,flashT:0,flashCol:'255,255,255',jarsTotal:0,jarsBroken:0,mid:null,midT:0,bossBanner:null,cutin:null,speed:0,allies:[],lv:stageLv()};
  Wd.ps=G.pl.map(mkPlayer);Wd.p=Wd.ps[0];
  (S.jars||[]).forEach(x=>{Wd.props.push({kind:'jar',x,y:rnd(GT+25,GB-20),hp:1,count:!!S.countJars});if(S.countJars)Wd.jarsTotal++});
  if(S.well)Wd.props.push({kind:'well',x:S.well,y:GT+22,hp:14,maxhp:14});
  const pre=[],ids=G.pl.map(s=>HEROES[s.hero].id);
  if(i===4&&ids.includes('guan'))pre.push('관우: "화용도... 조조에게 입은 옛 은혜가 있으나, 이번만은 물러설 수 없다!"');
  if(i===5&&ids.includes('zhuge'))pre.push('공명: "내 명이 하늘에 달렸다 하나, 오늘 밤만은 하늘을 거스르겠소."');
  if(i===1&&ids.includes('lubu'))pre.push('여포: "나를 흉내 내는 자가 호뢰관에 있다고? 가짜는 베어 주마!"');
  if(i===1&&ids.includes('diao'))pre.push('초선: "봉선... 이번엔 연환계가 아니라 제 검으로 상대하겠어요."');
  if(i===0&&G.np===2)pre.push(`${HEROES[G.pl[0].hero].name}와(과) ${HEROES[G.pl[1].hero].name}, 두 영웅이 함께 칼을 뽑았다!`);
  stageEvInit(i);
  showStory((G.cycle?`[${cycleName(G.cycle)}] `:'')+S.title+' — '+S.sub,S.story.concat(pre,[`— 적 레벨 ${Wd.lv}~${Math.min(MAXLV,Wd.lv+3)}`]),()=>{scene='play'});
}
function showStory(title,lines,next,opt={}){story={title,lines,next,t:0,end:!!opt.end,hidden:!!opt.hidden};scene='story'}
const alivePs=()=>Wd.ps.filter(p=>!p.dead&&!p.out);
function tgtOf(e){const ht=huntTarget(e);if(ht)return ht;let best=null,bd=1e9;for(const p of Wd.ps){if(p.dead||p.out)continue;const d=Math.abs(p.x-e.x)+Math.abs(p.y-e.y)*2;if(d<bd){bd=d;best=p}}return best}

/* ---------- 스폰 ---------- */
const ELOOK={};
function enemyLook(fac,tok){const k=fac+tok;if(!ELOOK[k]){const f=FAC[fac],T=ETYPES[tok];ELOOK[k]=Object.assign({},f,{weapon:T.weapon,scale:T.scale||1});
  if(T.officer){ELOOK[k].body=shade(f.body,-30);ELOOK[k].hat='helm2';ELOOK[k].armor='plate';ELOOK[k].cape=shade(f.body,-50);ELOOK[k].beard='short'}
  const X=FAC_EX[fac]||{};
  if(T.shield){ELOOK[k].shield=X.shieldc||f.body;ELOOK[k].armor='plate'}
  if(T.cavalry){ELOOK[k].mount=X.mount||'#8a6440';ELOOK[k].armor='plate';ELOOK[k].hat=fac==='yellow'?'scarf':'helm2';ELOOK[k].cape=shade(f.body,-40)}
  if(T.banner){ELOOK[k].flagc=f.body;ELOOK[k].flagt=X.flagt||'令'}}return ELOOK[k]}
const coopHp=()=>G.np===2?1.35:1;
function spawnEnemy(tok){
  const w=Wd,T=ETYPES[tok],d=D(),lv=Math.min(MAXLV,w.lv+Math.min(3,w.wave));
  const side=Math.random()<.68?1:-1;
  const hp=Math.round(T.hp*hpMul(lv)*cycMul()*d.ehp*coopHp());
  const e=mkEnt({lv,x:side>0?w.camX+W+40+rnd(0,90):w.camX-40-rnd(0,90),y:rnd(GT+15,GB-10),hp,maxhp:hp,pow:Math.round(T.pow*powMul(lv)*cycMul()*d.edmg),
    spd:T.spd*rnd(.9,1.1)*(.9+.1*d.aggr),reach:T.reach,ranged:T.ranged,officer:T.officer,shield:!!T.shield,cavalry:!!T.cavalry,banner:!!T.banner,exp:T.exp,score:T.score,cd:rnd(40,110)/d.aggr,yoff:rnd(-8,8),facing:-side,
    look:enemyLook(w.S.fac,tok)});
  if(Math.random()<Math.min(.25,.05+.03*G.cycle+.008*stageOrd(G.stage)))makeElite(e);
  markHunter(e);
  w.enemies.push(e);return e;
}
function spawnBoss(def,opt={}){
  const w=Wd,d=D(),lv=Math.min(MAXLV,w.lv+3),k=stageOrd(G.stage),hp=Math.round(def.hp*hpMul(lv)/(1+k*.28)*cycMul()*(1+(d.ehp-1)*.8)*(G.np===2?1.5:1));
  const e=mkEnt({lv,x:w.camX+W+60,y:(GT+GB)/2,hp,maxhp:hp,pow:Math.round(def.pow*powMul(lv)/(1+k*.2)*cycMul()*d.edmg),spd:def.spd,reach:def.reach||90,boss:true,def,name:def.name,
    look:def.look,exp:opt.mid?120:400,score:def.score||10000,cd:60,spCd:170,poise:0,poiseMax:def.poise||80,facing:-1,skills:def.skills,mid:!!opt.mid,yoff:0});
  w.enemies.push(e);
  w.bossBanner={name:def.name,title:def.title,line:def.line,t:0,look:def.look};
  sfx('boss');setTimeout(()=>say(BOSS_SHOUT[def.name]||def.name,VPROF.boss),500);return e;
}
function spawnWave(spec){
  for(const t of spec[1].split(' ')){if(t==='H'){Wd.mid=spawnBoss(MIDBOSS,{mid:true});Wd.midT=Wd.t}else spawnEnemy(t)}
  for(let i=0;i<D().extra+(G.np===2?1:0);i++)spawnEnemy(['s','sp','a','s'][(Math.random()*4)|0]);
}
/* 드랍 위치는 항상 화면(플레이어가 갈 수 있는 범위) 안으로 */
const dropX=x=>clamp(x,Wd.camX+50,Math.min(Wd.camX+W-50,Wd.S.len-40));
function dropItem(x,y,kind){Wd.items.push({kind,x:dropX(x),y:clamp(y,GT+10,GB-5),z:30,vz:5,t:0})}
function randDrop(){const r=Math.random();return r<.3?'bun':r<.4?'chicken':r<.52?'gold':r<.62?'silver':r<.66?'gem':useDrop()}
function showMsg(txt,sub,big){Wd.msg={txt,sub,big,t:0,life:big?260:120}}

/* ---------- 전투 ---------- */
function hittable(t){return !t.dead&&!t.out&&t.inv<=0&&!(t.state==='down'&&t.z<=0)}
const BASIC_ST={attack:1,dashatk:1,jump:1,rise:1,spin:1};
const powOf=p=>{const s=p.ps.st;let v=basePow(p);
  if(p.state==='cmd')v*=1+s.cmdDmg/100;else if(p.state==='special')v*=1+s.spDmg/100;else if(BASIC_ST[p.state])v*=1+s.basicDmg/100;
  if(p.state==='dashatk')v*=1+s.dashDmg/100;return v};
function playerDmg(p,knock){return Math.round(powOf(p)*(knock?1.6:1)*rnd(.9,1.1))}
const ownerOf=a=>a.isPlayer?(a.pl||a):null;
const BLUNT={mace:1,staff:1,fan:1};
function hitKind(a){if(a.hk)return a.hk;const w=a.look&&a.look.weapon;return BLUNT[w]?'blunt':(w==='spear'||w==='snake')?'pierce':'blade'}
function damage(a,t,dmg,knock,opt){
  if(t.dead||t.inv>0)return false;
  opt=opt||{};
  const w=Wd,own=ownerOf(a),pp=own&&own.ps?own:null;
  let crit=false,react=null,dir=a.x<t.x?1:-1;if(a.x===t.x)dir=-t.facing;
  if(!opt.dot&&t.boss&&t.state==='skill'&&t.skill==='counter'&&t.t<56&&own){counterStrike(t,a);return false}
  if(t.isPlayer){
    const s=t.ps.st,bm=t.bm||{};
    if(!opt.dot&&Math.random()*100<s.dodge+(bm.dodge||0)){w.fx.push({type:'text',x:t.x,y:t.y,z:110,t:0,life:30,txt:'회피',col:'#c8f0ff',size:16});t.inv=Math.max(t.inv,12);return false}
    if(a&&a.rally>0)dmg*=1.25;
    dmg*=G.def;
    dmg*=1-Math.min(.75,s.def/(s.def+40+12*(w.lv||1)));
    dmg*=1-clamp(s.dr+(bm.dr||0),-50,80)/100;
    if(t.buf&&t.buf.shield>0){dmg*=.3;knock=false}
    if(s.manaShield&&t.mana>0){const ab=Math.min(t.mana,dmg*s.manaShield/100);t.mana-=ab;dmg-=ab}
    dmg=Math.max(1,Math.round(dmg));
    if(!opt.dot&&a&&!a.isPlayer&&a.maxhp&&!a.dead){
      const th=s.thorns+(bm.thorns||0);if(th>0)damage({x:t.x,isPlayer:true,pl:t,noProc:true},a,Math.round(th),false,{dot:true,col:'#b0ffb0'});
      if(a.elite){if(a.elite.includes('frost'))t.slowT=150;if(a.elite.includes('vamp'))a.hp=Math.min(a.maxhp,a.hp+dmg)}}
  }else if(pp){
    const s=pp.ps.st,bm=pp.bm||{},el=a.el||opt.el||'phys',st=t.stt;
    if(el!=='phys')dmg*=1+(s[el]||0)/100;
    if(st&&st.shock>0)dmg*=1.25;
    if(s.vsCtrl&&((st&&st.chill>0)||(t.state==='hurt'&&t.hurtLen>=26)))dmg*=1+s.vsCtrl/100;
    if(t.boss)dmg*=1+s.bossDmg/100;
    dmg*=enemyDmgMul(t);
    if(!opt.dot){react=elemReact(t,el,knock,dmg,pp);if(react)dmg*=react.m;
      if(Math.random()*100<s.crit+(bm.crit||0)){crit=true;dmg*=1+(s.critDmg+(bm.critDmg||0))/100}}
    dmg=Math.max(1,Math.round(dmg));
  }
  if(!opt.dot&&!t.isPlayer&&t.shield&&guardCheck(a,t,dir,knock,dmg))return true;
  if(opt.dot){
    t.hp-=dmg;t.flash=Math.max(t.flash,2);
    w.fx.push({type:'num',x:t.x+rnd(-14,14),y:t.y,z:t.z+80,t:0,life:28,txt:String(dmg),col:opt.col||'#ffa060',small:true});
    return t.hp<=0?killEnt(t,dir,own):true;
  }
  sfx('hit',hitKind(a),knock);
  if(t.isPlayer&&t.vT<=0){kiai(vprof(t),'hurt');t.vT=30}
  t.hp-=dmg;t.flash=8;
  t.facing=-dir;
  const col=own&&own.h?own.h.fx:'#ff5a4a';
  w.fx.push({type:'spark',x:t.x-dir*8,y:t.y,z:t.z+55,t:0,life:12,big:knock,col});
  burst(t.x-dir*8,t.y,t.z+55,col,knock?14:8,knock?9:6);
  burst(t.x-dir*8,t.y,t.z+55,'#ffffff',4,5,{type:'spark',size:3,life:12});
  glowFlash(t.x-dir*8,t.y,t.z+55,col,knock?60:36,8);
  w.fx.push({type:'num',x:t.x+rnd(-10,10),y:t.y,z:t.z+100,t:0,life:40,txt:crit?dmg+'!':String(dmg),col:t.isPlayer?'#ff6b5a':crit?'#ff9a30':'#fff2a8',big:knock,crit});
  if(react)w.fx.push({type:'text',x:t.x,y:t.y,z:t.z+135,t:0,life:46,txt:react.n,col:react.col,size:20});
  hitstop=Math.max(hitstop,knock||crit?5:3);
  if(pp){pp.mp=Math.min(pp.maxki,pp.mp+2*(1+pp.ps.st.kiGain/100));onPlayerHit(pp,a,t,dmg,crit)}
  if(t.isPlayer){t.mp=Math.min(t.maxki,t.mp+5*(1+t.ps.st.kiGain/100));w.shake=Math.max(w.shake,8);
    if(t.hp>0){fireProcs(t,'hurt',a);if(t.hp<t.maxhp*.3)fireProcs(t,'lowhp',a)}}
  if(t.hp<=0)return killEnt(t,dir,own);
  if(!t.isPlayer&&superArmor(t))return true;
  if(opt&&opt.launch&&!t.boss){t.state='down';t.t=0;t.vz=11;t.vx=dir*1.5;t.z=Math.max(t.z,1);return true}
  if(opt&&opt.stun){t.state='hurt';t.t=0;t.hurtLen=opt.stun;return true}
  if(t.boss){
    if(t.state==='stun')return true;
    t.poise+=dmg;
    if(t.poise>=t.poiseMax){t.poise=0;t.grabbed=null;t.state='stun';t.t=0;t.stunLen=t.mid?90:120;Wd.fx.push({type:'text',x:t.x,y:t.y,z:200,t:0,life:60,txt:'경직 파괴!',col:'#ffe060',size:26});sfx('break');w.shake=Math.max(w.shake,12)}
    else if(t.state!=='skill'&&t.state!=='down'){t.state='hurt';t.t=0;t.hurtLen=8}
    return true;
  }
  if(knock||t.z>0)knockDown(t,dir);
  else{t.state='hurt';t.t=0;t.x+=dir*6;t.hurtLen=t.isPlayer?14:18;if(t.isPlayer)t.inv=22}
  return true;
}
function killEnt(t,dir,own){
  if(t.isPlayer&&t.ps.st.cheatDeath&&!t.cheated){t.cheated=true;t.hp=Math.round(t.maxhp*.5);t.inv=150;
    Wd.fx.push({type:'text',x:t.x,y:t.y,z:150,t:0,life:80,txt:'전국 인끈의 가호!',col:'#ffe060',size:24});Wd.fx.push({type:'pillar',x:t.x,y:t.y,t:0,life:60,w:50,col:'#ffe060'});sfx('treasure');return true}
  t.hp=0;t.dead=true;t.state='down';t.t=0;t.vz=7;t.vx=dir*4.5;t.z=Math.max(t.z,1);
  if(t.isPlayer)kiai(vprof(t),'die');else if(t.boss)kiai(VPROF.boss,'die');else if(Math.random()<.45)kiai({f0:rnd(95,140),fs:rnd(.9,1.05)},'die');
  onDeath(t,own);return true;
}
function knockDown(t,dir){t.state='down';t.t=0;t.vz=6;t.vx=dir*4;t.z=Math.max(t.z,1)}
function meleeHit(a,knock,o){
  o=o||{};
  if(!a.hitIds)a.hitIds=new Set();
  const targets=a.isPlayer?Wd.enemies:enemyTargets();
  const reach=a.reach*(a.look.scale||1)*(o.reach||1)*rsc(a)*(a.isPlayer?1.1*aoeM(a):1);
  for(const t of targets){
    if(a.hitIds.has(t)||!hittable(t))continue;
    const dx=(t.x-a.x)*a.facing;
    if(o.around?Math.abs(t.x-a.x)>reach*.85:(dx<-18||dx>reach))continue;
    if(Math.abs(t.y-a.y)>(o.around?34:26)*(a.isPlayer?1.3:1))continue;
    if(Math.abs(t.z-a.z)>(a.isPlayer?95:70))continue;
    a.hitIds.add(t);
    if(o.kind)a.hk=o.kind;
    damage(a,t,a.isPlayer?Math.round(playerDmg(a,knock)*(o.dmg||1)):Math.round(a.pow*rnd(.85,1.15)),knock,o.launch?{launch:true}:null);
    a.hk=null;
  }
  if(a.isPlayer)for(const pr of Wd.props){
    if(pr.broken||a.hitIds.has(pr))continue;
    const dx=(pr.x-a.x)*a.facing;
    if(dx<-15||dx>a.reach+15||(!pr.gate&&Math.abs(pr.y-a.y)>34))continue;
    a.hitIds.add(pr);hitProp(pr);
  }
}
function hitProp(pr){
  if(pr.kind==='totem'){hitTotem(pr);return}
  if(pr.gate){hitGate(pr);return}
  const w=Wd;pr.hp--;pr.shake=10;sfx('break');
  burst(pr.x,pr.y,30,'#ffe0a0',6,5);
  if(pr.kind==='well'&&!pr.hinted&&!G.treasures.seal){pr.hinted=true;showMsg('우물 속에서 무언가 반짝인다...','',false)}
  if(pr.hp>0)return;
  pr.broken=true;
  for(let i=0;i<10;i++)w.fx.push({type:'debris',x:pr.x,y:pr.y,z:20,vx:rnd(-4,4),vz:rnd(3,8),t:0,life:40,col:pr.kind==='well'?'#888888':'#8b5a2b'});
  if(pr.kind==='well'){
    if(!G.treasures.seal){dropItem(pr.x,pr.y+30,'seal');w.flashT=20;showMsg('우물 속에서 오색 빛이 솟아오른다!','',false);w.fx.push({type:'pillar',x:pr.x,y:pr.y,t:0,life:80,w:60,col:'#a0ffd0'})}
    else dropItem(pr.x,pr.y+30,'gem');
    return;
  }
  if(pr.count){w.jarsBroken++;if(w.jarsBroken===w.jarsTotal&&!G.treasures.book){dropItem(pr.x,pr.y,'book');w.flashT=20;w.fx.push({type:'pillar',x:pr.x,y:pr.y,t:0,life:80,w:60});return}}
  dropItem(pr.x,pr.y,randDrop());
}
function onDeath(e,own){
  const w=Wd;
  if(e.isPlayer){burst(e.x,e.y,50,'#ff4040',20,8);return}
  if(battleOnDeath(e,own))return;
  const k=own&&own.ps?own:(alivePs()[0]||w.ps[0]);
  k.ps.score+=Math.round(e.score*D().score);addExp(k,e);
  burst(e.x,e.y,40,'#ffd080',10,6);
  rpgDrops(e,k);
  if(own&&own.ps&&!own.dead)fireProcs(own,'kill',e);
  if(e.elite&&e.elite.includes('fiery'))w.hz.push({x:e.x,y:e.y,t:0,delay:30,r:90,owner:'e',kind:'boom',dmg:Math.round(e.pow*1.4),dur:24});
  if(e.mid){
    if(w.t-w.midT<=25*60&&!G.treasures.sword){dropItem(e.x,e.y,'sword');w.flashT=20}else dropItem(e.x,e.y,'gold');
    return;
  }
  if(e.boss){
    hitstop=45;w.flashT=30;w.clear=1;w.shake=25;
    for(let i=0;i<5;i++)w.fx.push({type:'ring',x:e.x,y:e.y,t:0,life:40+i*6,delay:i*6,r:400,col:'#ffe0a0'});
    burst(e.x,e.y,60,'#ffffff',40,14,{type:'glow',size:18});burst(e.x,e.y,60,'#ffc040',40,10);
    for(const o of w.enemies)if(o!==e&&!o.dead){o.hp=0;o.dead=true;o.state='down';o.t=0;o.vz=6;o.z=1;o.vx=(o.x<e.x?-1:1)*3}
    if(G.stage===1&&w.t-w.bossT<=60*60&&!G.treasures.horse)dropItem(e.x,e.y,'horse');
    dropItem(e.x-30,e.y,useDrop());dropItem(e.x+30,e.y,'chicken');
    return;
  }
  if(e.officer)dropItem(e.x,e.y,useDrop());
  else if(Math.random()<.22*D().drop)dropItem(e.x,e.y,Math.random()<.4?useDrop():Math.random()<.6?'bun':'gold');
}
function useDrop(){const r=Math.random();return r<.22?'knife':r<.38?'bomb':r<.5?'wine':r<.6?'elixir':r<.71?'tactic':r<.82?'haste':r<.91?'shield':'tcharm'}
function addExp(k,e){const L=e.lv||1;
  for(const p of Wd.ps){if(p.out||(p.dead&&p!==k))continue;const df=p.ps.lvl-L,pen=df>3?Math.max(.1,1-(df-3)*.12):df<-3?Math.min(1.5,1+(-df-3)*.05):1;
    gainExp(p,e.exp*expScale(L)*pen*(p===k?1:.7))}}
function pickup(it,p){
  if(it.kind==='gear'||it.kind==='coin'||it.kind==='mat')return pickupRpg(it,p);
  const info=ITEMS[it.kind],s=p.ps;sfx(info.treasure?'treasure':'item');
  if(info.use){
    let slot=s.inv.find(q=>q.kind===it.kind);
    if(!slot&&s.inv.length<8){slot={kind:it.kind,n:0};s.inv.push(slot)}
    if(slot&&slot.n<info.max){slot.n=Math.min(info.max,slot.n+info.n);if(s.inv.length===1||!s.inv[s.sel])s.sel=s.inv.indexOf(slot)}
    else s.score+=300;
    Wd.fx.push({type:'text',x:p.x,y:p.y,z:120,t:0,life:60,txt:`${info.name} 획득! (${info.desc})`,col:'#ffe890',size:17});
    burst(it.x,it.y,20,'#ffe890',10,5,{g:-.1});return;
  }
  switch(it.kind){
    case'bun':p.hp=Math.min(p.maxhp,p.hp+30);break;case'chicken':p.hp=Math.min(p.maxhp,p.hp+70);break;
    case'gold':s.score+=1000;s.rpg.gold+=Math.round(30*(1+Wd.lv*.3));break;case'silver':s.score+=500;s.rpg.gold+=Math.round(15*(1+Wd.lv*.3));break;case'gem':s.score+=3000;s.rpg.gold+=Math.round(90*(1+Wd.lv*.3));break;
    case'book':G.treasures.book=true;for(const q of Wd.ps)q.mp=q.maxki;G.spB=1.3;break;
    case'seal':G.treasures.seal=true;G.def=.8;break;
    case'sword':G.treasures.sword=true;G.tPow+=4;break;
    case'horse':G.treasures.horse=true;G.spdB+=.7;break;
  }
  burst(it.x,it.y,20,info.treasure?'#ffd860':'#b0ffff',info.treasure?30:10,5,{g:-.1});
  if(info.treasure){showMsg(`${info.name}(${info.hz})를 얻었다!`,info.msg+(G.np===2?' (두 사람 모두 적용)':''),true);s.score+=5000;Wd.fx.push({type:'rays',x:p.x,y:p.y,z:60,t:0,life:120})}
  else Wd.fx.push({type:'text',x:p.x,y:p.y,z:120,t:0,life:50,txt:`${info.name} ${info.msg}`,col:'#bff',size:18});
}

/* ---------- 플레이어 ---------- */
/* 모션 테이블 실행: 타격 구간 · 전진 · 연출 · 원거리 마무리 */
function runMove(p,mv){
  const t=p.t;
  for(const[a,b,o]of mv.hits){
    if(t===a&&o&&o.reset){p.hitIds=new Set();sfx('swing',p.look.weapon)}
    if(t>=a&&t<=b)meleeHit(p,!!(o&&o.knock),o);
  }
  if(mv.mv)for(const[a,b,s]of mv.mv)if(t>=a&&t<=b)p.x+=p.facing*s;
  if(mv.shoot===t)heroFinisher(p);
  if(mv.fx&&mv.fxAt===t)moveFx(p,mv.fx);
  if(mv.hits.some(h=>h[2]&&h[2].around)&&t%3===0)burst(p.x,p.y,55,p.h.fx,3,6,{type:'spark',size:3});
}
function moveFx(p,k){
  const w=Wd,fx=p.h.fx,fx0=p.x+p.facing*50;
  switch(k){
    case'quake':w.shake=14;sfx('thud');sfx('rock');w.fx.push({type:'ring',x:fx0,y:p.y,t:0,life:26,r:170,col:fx});
      for(let i=0;i<14;i++)emit({x:fx0+rnd(-60,60),y:p.y+rnd(-15,15),z:0,vz:rnd(1,3),vx:rnd(-2,2),col:'#a89070',size:rnd(12,22),life:30,type:'smoke',add:false});break;
    case'fireslam':w.shake=18;sfx('bomb');w.fx.push({type:'crack',x:fx0,y:p.y,t:0,life:60,segs:Array.from({length:5},(_,i)=>Array.from({length:4},()=>[Math.cos(i*1.2)*rnd(12,24)*(i%2?1:-1),rnd(-4,5)]))});
      burst(fx0,p.y,10,'#ff7a2a',22,10);for(let i=0;i<10;i++)emit({x:fx0+rnd(-40,40),y:p.y,z:rnd(0,30),vz:rnd(3,7),col:'#ffb040',size:rnd(12,20),life:24});break;
    case'dustring':sfx('wind');w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:22,r:140,col:fx});
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2;emit({x:p.x+Math.cos(a)*40,y:p.y+Math.sin(a)*12,z:2,vx:Math.cos(a)*3,vz:1,col:'#b8a080',size:14,life:26,type:'smoke',add:false})}break;
    case'dust':sfx('land');for(let i=0;i<8;i++)emit({x:fx0+rnd(-30,30),y:p.y,z:2,vz:rnd(.5,2),vx:rnd(-2,2),col:'#b8a080',size:14,life:24,type:'smoke',add:false});burst(fx0,p.y,30,fx,10,7);break;
    case'puff':for(let i=0;i<6;i++)emit({x:p.x+p.facing*rnd(30,70),y:p.y,z:rnd(40,80),vx:p.facing*rnd(2,4),col:'#dff4ff',size:rnd(8,14),life:18});sfx('wind');break;
  }
}
function startAtk(p,n){p.state='attack';p.combo=n;p.t=0;p.queued=false;p.hitIds=new Set();sfx('swing',p.look.weapon);
  if(n===3)kiai(vprof(p),'big');else if(Math.random()<.35)kiai(vprof(p),'atk')}
function doSpecial(p,myth){
  const ms=myth?mythSpOf(p):null;
  if(myth&&!ms){hudTxt(p,'신화 무기를 장착해야 합니다 (↑+필살기)','#ff9080');sfx('noMp');return}
  if(ms&&p.mspCd>0){hudTxt(p,`신화 필살기 재사용 대기 ${Math.ceil(p.mspCd/60)}초`);sfx('noMp');return}
  const c=spCost(p)+(ms?20:0);
  if(p.mp>=c)p.mp-=c;
  else if(!ms&&p.hp>p.maxhp*.15)p.hp-=Math.round(p.maxhp*.1);
  else{sfx('noMp');hudTxt(p,'기력 부족','#88aaff');return}
  if(ms)p.mspCd=1200;
  p.state='special';p.t=0;p.inv=Math.max(p.inv,70);p.hitIds=new Set();p.landed=false;p.mysp=ms;
  const M=p.mysp&&MYTH_SP[p.mysp];if(M)p.inv=Math.max(p.inv,110);
  Wd.cutin={t:0,dur:52,h:p.h,pl:p.idx,look:p.look,name:M?M.n:p.h.spName,hz:M?M.hz:HERO_SP_HZ[p.h.id],sub:M?`신화 무기 전용 필살기 · ${p.ps.rpg.eq.weapon.n}`:`${p.h.name} 고유 필살기`,col:M?M.col:p.h.fx};
  Wd.cine={t:0,dur:52+(M?90:60),col:M?M.col:p.h.fx};sfx('cutin');kiai(vprof(p),'big');say((M?M.n:p.h.spName)+'!',vprof(p));
  fireProcs(p,'special');
}
/* ---------- 커맨드 입력 ---------- */
function spendMp(p,n){if(p.mp>=n){p.mp-=n;return true}Wd.fx.push({type:'text',x:p.x,y:p.y,z:120,t:0,life:30,txt:'기력 부족',col:'#88aaff',size:15});sfx('noMp');return false}
function cmdName(p,txt){Wd.fx.push({type:'text',x:p.x,y:p.y,z:150,t:0,life:50,txt,col:p.h.fx,size:24});glowFlash(p.x,p.y,60,p.h.fx,90,12)}
function readCmd(p){
  const c=p.cmd,now=Wd.t;
  for(let j=c.length-1;j>=0;j--){
    if(now-c[j].t>16)break;
    const d=c[j].d;
    if(d==='L'||d==='R'||d==='U'){for(let k=j-1;k>=0;k--){if(c[j].t-c[k].t>14)break;if(c[k].d==='D')return d==='U'?{type:'rise'}:{type:'qcf',dir:d==='R'?1:-1}}}
    break;
  }
  return null;
}
function tryCommand(p,i){
  const P=G&&G.np===2?PP[i]:pressed;
  if(P.atk&&!P.jump)p.lastAtkT=Wd.t;
  if(P.jump&&(P.atk||Wd.t-(p.lastAtkT||-99)<=5)){P.atk=P.jump=false;
    if(p.hp>p.maxhp*.1){p.hp-=Math.round(p.maxhp*.06);p.state='spin';p.t=0;p.inv=Math.max(p.inv,40);p.hitIds=new Set();p.cmd.length=0;p.landed=false;p.spinPose=SPIN_POSE[p.h.id]||null;kiai(vprof(p),'big');sfx('wind');cmdName(p,SPIN_N[p.h.id]||'회전베기');return true}}
  if(!P.atk)return false;
  const cm=readCmd(p);if(!cm)return false;
  P.atk=false;p.cmd.length=0;
  if(cm.type==='rise'){if(!spendMp(p,10))return true;p.state='rise';p.t=0;p.hitIds=new Set();kiai(vprof(p),'big');say('승천격!',vprof(p));sfx('swing',p.look.weapon);cmdName(p,'승천격');return true}
  if(!spendMp(p,cmdCost(p)))return true;
  p.facing=cm.dir;p.state='cmd';p.t=0;p.hitIds=new Set();p.inv=Math.max(p.inv,14);
  kiai(vprof(p),'big');say(p.h.cmd.name+'!',vprof(p));cmdName(p,p.h.cmd.name);
  return true;
}
function updCmd(p){
  const w=Wd,ty=p.h.cmd.type,f=p.facing;
  switch(ty){
    case'gwave':if(p.t===8){w.proj.push({kind:'gwave',x:p.x+f*40,y:p.y,z:30,vx:f*9,life:55,dmg:Math.round(powOf(p)*2),owner:'p',pl:p,pierce:true,knock:true,w:40,hit:new Set(),hk:'magic'});sfx('wind');w.shake=6}
      if(p.t>=26)p.state='idle';break;
    case'charge':case'lance':
      if(p.t===3)sfx('dash');
      if(p.t>=4&&p.t<=(ty==='lance'?30:24)){p.x+=f*(ty==='lance'?10:8.5);
        for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;if(Math.abs(e.x-(p.x+f*20))<75*aoeM(p)&&Math.abs(e.y-p.y)<46*aoeM(p)){p.hitIds.add(e);damage(p,e,Math.round(powOf(p)*1.8),true)}}
        if(p.t%3===0)emit({x:p.x,y:p.y,z:2,vz:1,vx:-f*2,col:'#b8a080',size:14,life:22,type:'smoke',add:false});
        if(p.t%2===0)w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:10,facing:f,look:p.look,pose:poseOf(p),tint:'rgba(255,200,120,.4)'})}
      if(p.t>=36)p.state='idle';break;
    case'flurry':
      if(p.t>=4&&p.t<=30&&p.t%4===0){p.hitIds=new Set();sfx('swing',p.look.weapon);const last=p.t>=28;
        for(const e of w.enemies){if(!hittable(e))continue;const dx=(e.x-p.x)*f;if(dx>-10&&dx<p.reach*1.5*aoeM(p)&&Math.abs(e.y-p.y)<46*aoeM(p))damage(p,e,Math.round(powOf(p)*.6),last,last?null:{stun:12})}
        burst(p.x+f*p.reach*.9,p.y,60,p.h.fx,5,5,{type:'spark',size:3})}
      if(p.t>=36)p.state='idle';break;
    case'triarrow':if(p.t===8){sfx('bow');for(let k=-1;k<=1;k++)w.proj.push({kind:'farrow',x:p.x+f*30,y:p.y+k*6,vy:k*1.1,z:62,vx:f*14,life:60,dmg:Math.round(powOf(p)*1.1),owner:'p',pl:p,knock:true,w:24,hit:new Set(),hk:'pierce'})}
      if(p.t>=22)p.state='idle';break;
    case'fireball':if(p.t===10){sfx('fire');w.proj.push({kind:'fireball',x:p.x+f*36,y:p.y,z:60,vx:f*7,life:70,dmg:Math.round(powOf(p)*1.2),owner:'p',pl:p,knock:true,w:28,hit:new Set(),hk:'magic',explode:true})}
      if(p.t>=26)p.state='idle';break;
    case'petal':if(p.t===8){sfx('charm');w.proj.push({kind:'petal',x:p.x+f*30,y:p.y,z:60,vx:f*12,ax:-f*.42,life:62,dmg:Math.round(powOf(p)*.9),owner:'p',pl:p,pierce:true,w:34,hit:new Set(),hk:'magic',owner2:p})}
      if(p.t>=20)p.state='idle';break;
    case'quake':if(p.t===10){w.shake=16;sfx('rock');for(let k=0;k<4;k++)w.hz.push({x:p.x+f*(60+k*55),y:p.y,t:0,delay:2+k*6,r:56,owner:'p',pl:p,kind:'rock',dmg:Math.round(powOf(p)*1.4),dur:22,launch:true})}
      if(p.t>=30)p.state='idle';break;
    case'redslash':if(p.t===8){sfx('slash');sfx('wind');w.proj.push({kind:'redslash',x:p.x+f*50,y:p.y,z:60,vx:f*12,life:60,dmg:Math.round(powOf(p)*2.2),owner:'p',pl:p,pierce:true,knock:true,w:70,hit:new Set()});w.shake=8}
      if(p.t>=26)p.state='idle';break;
    case'axethrow':if(p.t===8){sfx('swing','bigdao');w.proj.push({kind:'axe',x:p.x+f*30,y:p.y,z:60,vx:f*11,ax:-f*.36,life:70,dmg:Math.round(powOf(p)*1.7),owner:'p',pl:p,pierce:true,knock:true,w:42,hit:new Set(),hk:'blunt',col:'#ffb040'})}
      if(p.t>=24)p.state='idle';break;
    case'lash':if(p.t>=6&&p.t<=14&&p.t%4===2){p.hitIds=new Set();sfx('swing','whip');const R=240*aoeM(p),last=p.t>=14;
        w.fx.push({type:'chainl',x:p.x+f*20,y:p.y-60,x2:p.x+f*R,y2:p.y-50,t:0,life:8,col:'#ffd84a'});
        for(const e of w.enemies){if(!hittable(e))continue;const dx=(e.x-p.x)*f;if(dx>0&&dx<R&&Math.abs(e.y-p.y)<44){damage(p,e,Math.round(powOf(p)*1.1),last,last?null:{stun:16});if(!e.boss&&!e.dead)e.x-=f*14}}}
      if(p.t>=26)p.state='idle';break;
    case'backshot':if(p.t<10)p.x-=f*6;if(p.t===10){sfx('bow');for(let k=-2;k<=2;k++)w.proj.push({kind:'farrow',x:p.x+f*30,y:p.y+k*4,vy:k*.8,z:62,vx:f*15,life:60,dmg:Math.round(powOf(p)*1),owner:'p',pl:p,knock:true,w:24,hit:new Set()})}
      if(p.t>=24)p.state='idle';break;
    default:p.state='idle';
  }
}
function spDmg(p,base){return Math.round((base+powOf(p)*2)*G.spB)}
function onScreen(e,m){const sx=e.x-Wd.camX;return sx>-(m||40)&&sx<W+(m||40)}
function updSpecial(p){
  const w=Wd,h=p.h,fx=h.fx;
  switch(h.sp){
    case'crescent':
      if(p.t===10){w.proj.push({kind:'dragon',x:p.x+p.facing*40,y:p.y,z:60,vx:p.facing*10,life:80,dmg:spDmg(p,30),owner:'p',pl:p,pierce:true,knock:true,w:75,hit:new Set(),hist:[]});
        w.shake=12;w.flashT=8;w.flashCol='160,255,200';glowFlash(p.x+p.facing*40,p.y,60,fx,140,16);sfx('dragon');sfx('wind')}
      if(p.t>=30)p.state='idle';break;
    case'roar':
      if(p.t===12){w.shake=35;w.flashT=10;w.flashCol='255,180,120';sfx('roar');
        w.fx.push({type:'bigtext',x:p.x,y:p.y,z:170,t:0,life:60,txt:'喝!!',col:'#fff4d0',stroke:'#a02000',size:90});
        for(let i=0;i<3;i++)w.fx.push({type:'ring',x:p.x,y:p.y,z:0,t:0,life:34+i*8,delay:i*8,r:600,col:'#ffb070'});
        w.fx.push({type:'crack',x:p.x,y:p.y,t:0,life:90,segs:Array.from({length:7},(_,i)=>Array.from({length:5},()=>[Math.cos(i*.9)*rnd(12,28)*(i%2?1:-1),rnd(-4,6)]))});
        for(let i=0;i<30;i++)emit({x:p.x+rnd(-200,200),y:p.y+rnd(-40,40),z:0,vz:rnd(1,4),vx:rnd(-2,2),col:'#9a8a70',size:rnd(10,22),life:rnd(30,50),type:'smoke',add:false});
        burst(p.x,p.y,40,'#ff8040',30,12);
        for(const e of w.enemies)if(onScreen(e)&&!e.dead)damage(p,e,spDmg(p,20),true)}
      if(p.t>=40)p.state='idle';break;
    case'dash':
      if(p.t===4){w.speed=34;w.speedDir=p.facing;sfx('wind')}
      if(p.t>=6&&p.t<=32){p.x+=p.facing*13;
        for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;if(Math.abs(e.x-p.x)<70&&Math.abs(e.y-p.y)<32){p.hitIds.add(e);damage(p,e,spDmg(p,22),true)}}
        if(p.t%2===0)w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:16,facing:p.facing,look:p.look,pose:poseOf(p),tint:'rgba(150,210,255,.6)'});
        for(let i=0;i<3;i++)emit({x:p.x-p.facing*rnd(0,40),y:p.y+rnd(-8,8),z:rnd(10,90),vx:-p.facing*rnd(2,6),col:i?'#bfe6ff':'#ffffff',size:rnd(8,16),life:rnd(14,24)})}
      if(p.t>=40)p.state='idle';break;
    case'rain':
      if(p.t===8){sfx('bow');sfx('whistle');for(let i=0;i<8;i++)emit({x:p.x+p.facing*10,y:p.y,z:90,vx:p.facing*rnd(1,3),vz:rnd(10,16),col:'#ffb040',size:14,life:30,type:'glow'})}
      if(p.t===10)for(let i=0;i<16;i++)w.hz.push({x:p.x+p.facing*(60+i*36)+rnd(-15,15),y:rnd(GT+10,GB-5),t:0,delay:24+i*3,r:56,owner:'p',pl:p,kind:'arrow',dmg:spDmg(p,14)});
      if(p.t>=36)p.state='idle';break;
    case'thunder':
      if(p.t===4){w.fx.push({type:'bagua',x:p.x,y:p.y,t:0,life:70});sfx('bolt')}
      if(p.t===16){let n=0;for(const e of w.enemies){if(onScreen(e,20)&&!e.dead){w.hz.push({x:e.x,y:e.y,t:0,delay:14+n*4,r:64,owner:'p',pl:p,kind:'bolt',dmg:spDmg(p,22)});n++}}
        if(!n)for(let i=0;i<3;i++)w.hz.push({x:p.x+p.facing*(120+i*90),y:p.y,t:0,delay:14+i*4,r:70,owner:'p',pl:p,kind:'bolt',dmg:spDmg(p,22)})}
      if(p.t>=44)p.state='idle';break;
    case'tornado':
      if(p.t===14){w.proj.push({kind:'tornado',x:p.x+p.facing*50,y:p.y,z:0,vx:p.facing*5.5,life:100,dmg:Math.round(spDmg(p,4)*.42),owner:'p',pl:p,pierce:true,multi:10,w:70,hit:new Set()});sfx('wind');w.shake=8}
      if(p.t%3===0)burst(p.x,p.y,50,'#dfeaff',3,6,{type:'spark',size:3});
      if(p.t>=34)p.state='idle';break;
    case'charm':
      if(p.t%2===0)for(let i=0;i<3;i++){const a=rnd(0,Math.PI*2),r=rnd(40,230);emit({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.3,z:rnd(0,140),vx:-Math.sin(a)*4,vy:Math.cos(a)*1,vz:rnd(-.5,.5),col:hash(i+p.t)<.5?'#ff8ad0':'#ffc0e0',life:rnd(30,50),type:'petal',add:false})}
      if(p.t%10===0)emit({x:p.x+rnd(-60,60),y:p.y,z:rnd(60,120),vz:1.2,col:'#ff5aa8',size:10,life:40,type:'heart',add:false});
      if(p.t===4)sfx('charm');
      if(p.t>=10&&p.t<=58&&p.t%8===2){const last=p.t>=58;
        for(const e of w.enemies)if(!e.dead&&Math.abs(e.x-p.x)<240&&Math.abs(e.y-p.y)<80&&hittable(e)){damage(p,e,spDmg(p,4),last,last?null:{stun:26});w.fx.push({type:'slashX',x:e.x,y:e.y,z:60,t:0,life:10,ang:rnd(-1,1),len:120,col:'#ff6ac0'})}
        sfx('slash')}
      if(p.t>=62)p.state='idle';break;
    case'fire':
      if(p.t===14){w.shake=22;sfx('fire');w.flashT=8;w.flashCol='255,150,60';
        for(let i=0;i<7;i++)w.hz.push({x:p.x+p.facing*(60+i*60),y:p.y+rnd(-10,10),t:0,delay:4+i*5,r:62,owner:'p',pl:p,kind:'fire',dmg:spDmg(p,16),dur:28});
        w.fx.push({type:'crack',x:p.x+p.facing*40,y:p.y,t:0,life:80,segs:[Array.from({length:12},()=>[p.facing*rnd(20,40),rnd(-6,6)])]})}
      if(p.t>=40)p.state='idle';break;
    case'musou':
      if(p.t>=6&&p.t<=54&&p.t%6===0){p.x+=p.facing*26;sfx('slash');w.shake=6;
        for(const e of w.enemies){if(e.dead||!hittable(e))continue;const dx=(e.x-p.x)*p.facing;if(dx>-40&&dx<170&&Math.abs(e.y-p.y)<60){damage(p,e,spDmg(p,5),false,{stun:20})}}
        for(let k=0;k<2;k++)w.fx.push({type:'slashX',x:p.x+p.facing*rnd(40,140),y:p.y+rnd(-20,20),z:rnd(30,90),t:0,life:12,ang:rnd(-1.2,1.2),len:rnd(200,320),col:'#ff3030'});
        w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:12,facing:p.facing,look:p.look,pose:poseOf(p),tint:'rgba(255,60,40,.6)'})}
      if(p.t===60){w.flashT=14;w.flashCol='255,80,60';w.shake=30;sfx('roar');
        w.fx.push({type:'bigtext',x:p.x,y:p.y,z:170,t:0,life:60,txt:'無雙',col:'#fff0d0',stroke:'#800000',size:84});
        for(let i=0;i<3;i++)w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:30+i*8,delay:i*6,r:500,col:'#ff5040'});
        for(const e of w.enemies)if(onScreen(e)&&!e.dead)damage(p,e,spDmg(p,20),true)}
      if(p.t>=70)p.state='idle';break;
    case'axequake':
      if(p.t===14){w.shake=30;w.flashT=8;w.flashCol='255,200,120';sfx('boss');sfx('rock');
        for(let i=0;i<9;i++)w.hz.push({x:p.x+p.facing*(50+i*55),y:p.y,t:0,delay:2+i*3,r:72,owner:'p',pl:p,kind:'rock',dmg:spDmg(p,20),dur:24,launch:true});
        w.fx.push({type:'crack',x:p.x+p.facing*40,y:p.y,t:0,life:80,segs:[Array.from({length:14},()=>[p.facing*rnd(24,40),rnd(-6,6)])]});
        w.fx.push({type:'bigtext',x:p.x,y:p.y,z:170,t:0,life:60,txt:'開山',col:'#fff0c0',stroke:'#804000',size:88});
        for(const e of w.enemies)if(onScreen(e)&&!e.dead&&Math.abs(e.y-p.y)<120)damage(p,e,spDmg(p,16),true)}
      if(p.t>=44)p.state='idle';break;
    case'whipstorm':
      if(p.t>=8&&p.t<=56&&p.t%6===2){const last=p.t>=56;sfx('slash');
        for(const e of w.enemies)if(!e.dead&&hittable(e)&&Math.abs(e.x-p.x)<300&&Math.abs(e.y-p.y)<110){damage(p,e,spDmg(p,5),last,last?null:{stun:20});w.fx.push({type:'chainl',x:p.x,y:p.y-60,x2:e.x,y2:e.y-55,t:0,life:8,col:'#ffd84a'})}
        w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:14,r:300,col:'#ffd84a'});w.fx.push({type:'text',x:p.x+rnd(-90,90),y:p.y,z:rnd(60,150),t:0,life:30,txt:'♪',col:'#ffe890',size:24})}
      if(p.t>=62)p.state='idle';break;
    case'bowdance':
      if(p.t>=6&&p.t<=48&&p.t%3===0){sfx('bow');for(const k of[-1,0,1])w.proj.push({kind:'farrow',x:p.x+p.facing*30,y:p.y+k*6,vy:k*1.3,z:62,vx:p.facing*15,life:60,dmg:spDmg(p,6),owner:'p',pl:p,knock:p.t>=45,w:26,hit:new Set(),el:'fire',col:'#ff6a4a'})}
      if(p.t===24||p.t===44)for(const e of w.enemies.filter(e=>!e.dead&&onScreen(e,20)).slice(0,6))w.hz.push({x:e.x,y:e.y,t:0,delay:16,r:70,owner:'p',pl:p,kind:'fire',dmg:spDmg(p,10),el:'fire',dur:22});
      if(p.t>=56)p.state='idle';break;
  }
}
/* ---------- 무장 고유 특수기 (공격 + 점프 동시) ---------- */
const GROUND_ST={idle:1,walk:1,run:1,attack:1,cmd:1,use:1,dashatk:1,win:1};
const SPIN_N={guan:'청룡회선',zhang:'회전베기',zhao:'연환창',huang:'공중 사격',zhuge:'팔괘 돌풍',ma:'도약 낙창',diao:'선녀 선회',wei:'열화 내려찍기',lubu:'천하일섬',xu:'대부 선풍',gan:'쇄편 선풍',sun:'백덤블링 사격'};
const SPIN_POSE={huang:'jump',zhao:'dashatk',ma:'jump',wei:'jump',sun:'jump'};
function spinHit(p,r,dy,mult,knock,opt){for(const e of Wd.enemies){if(p.hitIds.has(e)||!hittable(e))continue;if(Math.abs(e.x-p.x)<r&&Math.abs(e.y-p.y)<dy){p.hitIds.add(e);damage(p,e,Math.round(powOf(p)*mult),knock,opt||null)}}}
function spinAir(p,vz0,g){if(p.t===1){p.vz=vz0}if(p.t>=1&&!p.landed){p.z+=p.vz;p.vz-=g;if(p.z<=0&&p.t>3){p.z=0;p.vz=0;p.landed=true;p.landT=p.t;return true}}return false}
const SPIN_FN={
  guan(p){const w=Wd,A=aoeM(p);if(p.t%6===0){p.hitIds=new Set();sfx('swing',p.look.weapon)}spinHit(p,150*A,52*A,.85,p.t>=24);
    if(p.t%4===0)w.fx.push({type:'slashX',x:p.x,y:p.y,z:55,t:0,life:10,ang:p.t*.5,len:300*A,col:'#5dffa0'});
    if(p.t===24){sfx('dragon');for(const d of[-1,1])w.proj.push({kind:'gwave',x:p.x+d*40,y:p.y,z:30,vx:d*9,life:40,dmg:Math.round(powOf(p)*1.4),owner:'p',pl:p,pierce:true,knock:true,w:40,hit:new Set(),hk:'magic'})}
    if(p.t>=32)p.state='idle'},
  zhao(p){const w=Wd,f=p.facing,A=aoeM(p);if(p.t<24)p.x+=f*5.5;
    if(p.t%6===0){p.hitIds=new Set();sfx('swing','spear');w.fx.push({type:'slashX',x:p.x+f*80,y:p.y,z:60,t:0,life:8,ang:0,len:170,col:'#bfe6ff'})}
    const last=p.t>=18;for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;const dx=(e.x-p.x)*f;if(dx>-10&&dx<p.reach*1.6*A&&Math.abs(e.y-p.y)<46*A){p.hitIds.add(e);damage(p,e,Math.round(powOf(p)*.65),last,last?null:{stun:14})}}
    if(p.t%2===0)w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:10,facing:f,look:p.look,pose:poseOf(p),tint:'rgba(190,230,255,.5)',sc:1.3});
    if(p.t>=30)p.state='idle'},
  huang(p){const w=Wd,f=p.facing;
    if(spinAir(p,12,.7)){p.state='idle';sfx('land');return}
    if(p.t>=6&&p.t<=26&&p.t%4===2){sfx('bow');
      w.proj.push({kind:'farrow',x:p.x+f*30,y:p.y,z:70,vx:f*15,life:50,dmg:Math.round(powOf(p)*.9),owner:'p',pl:p,knock:false,w:26,hit:new Set(),el:'fire',col:'#ffc04a'});
      w.hz.push({x:p.x+f*rnd(80,240),y:clamp(p.y+rnd(-30,30),GT+5,GB),t:0,delay:10,r:56,owner:'p',pl:p,kind:'arrow',dmg:Math.round(powOf(p)*.8)})}
    if(p.t>60){p.z=0;p.state='idle'}},
  zhuge(p){const w=Wd;if(p.t===6){sfx('wind');w.fx.push({type:'bagua',x:p.x,y:p.y,t:0,life:40});w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:24,r:200,col:'#8ad8ff'});
      for(const e of w.enemies){if(!hittable(e))continue;const dx=e.x-p.x;if(Math.abs(dx)<180&&Math.abs(e.y-p.y)<60){damage(p,e,Math.round(powOf(p)*1.1),true);if(!e.boss)e.x+=Math.sign(dx||1)*40}}
      for(const d of[-1,1])for(const k of[-1,1])w.proj.push({kind:'wind',x:p.x+d*30,y:p.y+k*14,vy:k*.8,z:55,vx:d*9,life:50,dmg:Math.round(powOf(p)*.9),owner:'p',pl:p,pierce:true,knock:true,w:34,hit:new Set()})}
    if(p.t>=24)p.state='idle'},
  ma(p){const w=Wd,f=p.facing;if(p.t<22)p.x+=f*5;
    if(spinAir(p,11,.9)){w.shake=18;sfx('boss');w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:24,r:170,col:'#dfeaff'});p.hitIds=new Set();spinHit(p,160,56,1.7,true);
      for(let i=0;i<10;i++)w.fx.push({type:'debris',x:p.x,y:p.y,z:5,vx:rnd(-6,6),vz:rnd(4,9),t:0,life:36,col:'#8a7a60'})}
    if(p.landed&&p.t>p.landT+10)p.state='idle';if(p.t>60){p.z=0;p.state='idle'}},
  diao(p){const w=Wd;if(p.t%5===0){p.hitIds=new Set();sfx('slash')}
    for(const e of w.enemies)if(!e.dead&&!e.boss&&Math.abs(e.x-p.x)<200&&Math.abs(e.y-p.y)<70)e.x+=Math.sign(p.x-e.x)*2.5;
    spinHit(p,140,52,.5,p.t>=30,p.t>=30?null:{stun:12});
    if(p.t%2===0)for(let i=0;i<3;i++){const a=rnd(0,Math.PI*2),r=rnd(30,140);emit({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.3,z:rnd(10,110),vx:-Math.sin(a)*3,vz:rnd(-.3,.6),col:i%2?'#ff8ad0':'#ffd0e8',life:30,type:'petal',add:false})}
    if(p.t>=34)p.state='idle'},
  wei(p){const w=Wd,f=p.facing;
    if(spinAir(p,13,.95)){w.shake=24;sfx('fire');sfx('bomb');
      for(let i=0;i<4;i++)w.hz.push({x:p.x+f*i*60,y:p.y,t:0,delay:1+i*4,r:70,owner:'p',pl:p,kind:'fire',dmg:Math.round(powOf(p)*1.4),el:'fire',dur:24})}
    if(p.landed&&p.t>p.landT+12)p.state='idle';if(p.t>60){p.z=0;p.state='idle'}},
  lubu(p){const w=Wd,A=aoeM(p);if(p.t%5===0){p.hitIds=new Set();sfx('swing','halberd')}spinHit(p,190*A,56*A,.9,false,{stun:8});
    if(p.t%3===0)w.fx.push({type:'slashX',x:p.x,y:p.y,z:60,t:0,life:9,ang:p.t*.6,len:380,col:'#ff3a3a'});
    if(p.t===20){w.shake=20;w.flashT=6;w.flashCol='255,80,60';w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:26,r:300,col:'#ff5040'});p.hitIds=new Set();spinHit(p,260*A,70,1.4,true)}
    if(p.t>=30)p.state='idle'},
  xu(p){const w=Wd,f=p.facing,A=aoeM(p);p.x+=f*3;if(p.t%6===0){p.hitIds=new Set();sfx('swing','bigdao')}spinHit(p,140*A,52*A,.85,p.t>=30);
    if(p.t%3===0)w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:10,r:140*A,col:'#ffb040'});if(p.t%2===0)emit({x:p.x+rnd(-60,60),y:p.y,z:2,vz:1,col:'#b8a080',size:14,life:20,type:'smoke',add:false});
    if(p.t>=36)p.state='idle'},
  gan(p){const w=Wd,A=aoeM(p);if(p.t%5===0){p.hitIds=new Set();sfx('swing','whip');w.fx.push({type:'text',x:p.x+rnd(-60,60),y:p.y,z:rnd(80,140),t:0,life:24,txt:'♪',col:'#ffe890',size:20})}
    spinHit(p,210*A,56*A,.6,p.t>=28,p.t>=28?null:{stun:10});
    if(p.t%2===0){const a=p.t*.45,R=200*A;w.fx.push({type:'chainl',x:p.x,y:p.y-55,x2:p.x+Math.cos(a)*R,y2:p.y-55+Math.sin(a)*R*.3,t:0,life:4,col:'#ffd84a'})}
    if(p.t>=32)p.state='idle'},
  sun(p){const w=Wd,f=p.facing;if(!p.landed)p.x-=f*4;
    if(spinAir(p,11,.75)){p.state='idle';sfx('land');return}
    if(p.t===6||p.t===12||p.t===18){sfx('bow');for(const k of[-1,1])w.proj.push({kind:'farrow',x:p.x+f*30,y:p.y+k*5,vy:k*.6,z:62,vx:f*16,life:55,dmg:Math.round(powOf(p)*1),owner:'p',pl:p,knock:true,w:26,hit:new Set(),el:'fire',col:'#ff6a4a'})}
    if(p.t>60){p.z=0;p.state='idle'}}};
function heroFinisher(p){
  const w=Wd,h=p.h;
  if(h.id==='huang'||h.id==='sun'){const n=p.ps.st.triArrow?3:(h.id==='sun'?2:1);for(let k=0;k<n;k++)w.proj.push({kind:'farrow',x:p.x+p.facing*30,y:p.y,vy:(k-(n-1)/2)*1.1,z:62,vx:p.facing*15,life:60,dmg:Math.round(powOf(p)*1.2),owner:'p',pl:p,knock:true,w:24,hit:new Set(),el:n>1?'fire':null})}
  if(h.id==='zhuge')w.proj.push({kind:'wind',x:p.x+p.facing*30,y:p.y,z:55,vx:p.facing*9,life:60,dmg:Math.round(powOf(p)*1.3),owner:'p',pl:p,pierce:true,knock:true,w:34,hit:new Set()});
}
function joinPlayer(p){const s=p.ps;s.lives=Math.max(1,D().lives);s.cont++;s.out=false;p.out=false;p.waiting=false;
  if(p.x<Wd.camX+25||p.x>Wd.camX+W-25){p.x=Wd.camX+120;p.y=450}revive(p);sfx('ok')}
function updPlayer(p){
  const w=Wd,h=p.h,K=pkeys(p.idx),i=p.idx;
  p.t++;p.anim++;if(p.inv>0)p.inv--;if(p.flash>0)p.flash--;
  if(p.out){if(phit(i,'atk'))joinPlayer(p);return}
  rpgTick(p);
  const spd=moveSpd(p);
  if(p.dead){
    downPhys(p);
    if(p.waiting){p.contT--;if(phit(i,'atk')){joinPlayer(p);return}if(p.contT<=0){p.waiting=false;p.out=true;p.ps.out=true}return}
    if(p.t>110){
      if(p.ps.lives>0){p.ps.lives--;revive(p)}
      else if(G.np===1){scene='continue';contT=10*60-1}
      else{p.waiting=true;p.contT=10*60-1}
    }
    return;
  }
  // 버프 · 음성 쿨다운
  for(const k in p.buf)if(p.buf[k]>0){p.buf[k]--;if(p.buf[k]===0)Wd.fx.push({type:'text',x:p.x,y:p.y,z:120,t:0,life:30,txt:'효과 종료',col:'#aaa',size:13})}
  if(p.vT>0)p.vT--;
  const spdX=spd;
  // 커맨드 입력 버퍼 (방향키 누름 기록)
  const PR=G.np===2?PP[i]:pressed;
  for(const [k,d] of [['left','L'],['right','R'],['up','U'],['down','D']])if(PR[k]){
    const prev=p.cmd[p.cmd.length-1];
    if((d==='L'||d==='R')&&prev&&prev.d===d&&w.t-prev.t<14&&(p.state==='idle'||p.state==='walk')){p.state='run';p.t=0;p.facing=d==='R'?1:-1;sfx('dash')}
    p.cmd.push({d,t:w.t});if(p.cmd.length>8)p.cmd.shift()}
  if(phit(i,'swap'))swapItem(p);
  for(let k=0;k<4;k++)if(phit(i,'sk'+(k+1)))tryCastSkill(p,k);
  switch(p.state){
    case'grabbed':case'fear':updPlayerCC(p,i,K,spdX);break;
    case'pskill':updPSkill(p);break;
    case'idle':case'walk':{
      if(tryCommand(p,i))break;
      const dx=(K.right?1:0)-(K.left?1:0),dy=(K.down?1:0)-(K.up?1:0);
      if(dx||dy){p.state='walk';p.x+=dx*spdX;p.y+=dy*spdX*.7;if(dx)p.facing=dx;if(p.anim%14===0){emit({x:p.x,y:p.y,z:2,vz:.5,vx:-dx*.5,col:'#b8a080',size:8,life:20,type:'smoke',add:false});sfx('step')}}else p.state='idle';
      if(phit(i,'atk'))startAtk(p,1);
      else if(phit(i,'jump')){p.state='jump';p.vz=11.5;p.vx=dx*spdX*1.15;p.jatk=false;p.t=0;sfx('jump');if(Math.random()<.3)kiai(vprof(p),'jump')}
      else if(phit(i,'sp'))doSpecial(p,!!K.up);
      else if(phit(i,'msp'))doSpecial(p,true);
      else if(phit(i,'item'))useItem(p);
      break;}
    case'run':{
      const hold=p.facing>0?K.right:K.left,dy=(K.down?1:0)-(K.up?1:0);
      if(!hold){p.state='idle';break}
      p.x+=p.facing*spdX*1.9;p.y+=dy*spdX*.6;
      if(p.anim%8===0){emit({x:p.x,y:p.y,z:2,vz:.8,vx:-p.facing*1.5,col:'#b8a080',size:12,life:22,type:'smoke',add:false});sfx('step')}
      if(tryCommand(p,i))break;
      if(phit(i,'atk')){p.state='dashatk';p.t=0;p.hitIds=new Set();sfx('swing',p.look.weapon);kiai(vprof(p),'big')}
      else if(phit(i,'jump')){p.state='jump';p.vz=12.5;p.vx=p.facing*spdX*2;p.jatk=false;p.t=0;sfx('jump')}
      else if(phit(i,'sp'))doSpecial(p,!!K.up);
      else if(phit(i,'msp'))doSpecial(p,true);
      break;}
    case'dashatk':
      if(p.t<16)p.x+=p.facing*Math.max(0,10-p.t*.6);
      if(p.t>=3&&p.t<=12)meleeHit(p,true,{kind:(moveOf(p,'datk')||{}).kind});
      if(p.t%2===0&&p.t<14)w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:10,facing:p.facing,look:p.look,pose:poseOf(p),tint:'rgba(255,230,160,.35)'});
      if(p.t>=24)p.state='idle';break;
    case'rise':{const A=aoeM(p),fx0=p.x+p.facing*45;
      if(p.t===3){p.vz=10.5;p.jatk=false;w.fx.push({type:'pillar',x:fx0,y:p.y,t:0,life:32,w:56*A,col:p.h.fx});w.fx.push({type:'ring',x:fx0,y:p.y,t:0,life:22,r:140*A,col:p.h.fx});w.shake=Math.max(w.shake,8)}
      if(p.t>=3){p.z+=p.vz;p.vz-=.65}
      if(p.t===3||p.t===9||p.t===15)p.hitIds=new Set();
      if(p.t>=3&&p.t<=18){const Rr=p.reach*1.55*A,last=p.t>=15;
        for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;const dx=(e.x-p.x)*p.facing;if(dx>-45&&dx<Rr&&Math.abs(e.y-p.y)<52*A){p.hitIds.add(e);p.hk=(moveOf(p,'rise')||{}).kind;
          damage(p,e,Math.round(powOf(p)*(last?1.2:.65)),true,last?{launch:true}:{stun:14});p.hk=null;if(!last&&!e.boss&&!e.dead)e.x+=(fx0-e.x)*.3}}
        if(p.t%2===0){w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:10,facing:p.facing,look:p.look,pose:poseOf(p),tint:hexA(p.h.fx,.45)});
          for(let i=0;i<4;i++)emit({x:fx0+rnd(-30,30)*A,y:p.y+rnd(-10,10),z:rnd(0,40),vz:rnd(5,10),col:i%2?p.h.fx:'#ffffff',size:rnd(2,4),life:rnd(14,22),type:'sq'})}}}
      if(p.t>3&&p.z<=0){p.z=0;p.vz=0;p.state='idle';sfx('land')}
      break;
    case'spin':if(SPIN_FN[p.h.id]){SPIN_FN[p.h.id](p);break}
      if(p.t%6===0){p.hitIds=new Set();sfx('swing',p.look.weapon)}
      for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;if(Math.abs(e.x-p.x)<130*aoeM(p)&&Math.abs(e.y-p.y)<48*aoeM(p)){p.hitIds.add(e);damage(p,e,Math.round(powOf(p)*.8),p.t>=24)}}
      if(p.t%6===0)w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:12,r:130*aoeM(p),col:p.h.fx});
      if(p.t%3===0)burst(p.x,p.y,55,p.h.fx,4,7,{type:'spark',size:3});
      if(p.t>=32)p.state='idle';break;
    case'cmd':updCmd(p);break;
    case'use':if(p.t>=14)p.state='idle';break;
    case'attack':{
      if(tryCommand(p,i))break;
      if(phit(i,'atk'))p.queued=true;
      if(phit(i,'sp')){doSpecial(p,!!K.up);break}
      if(phit(i,'msp')){doSpecial(p,true);break}
      const mv=moveOf(p,'c'+p.combo);
      if(mv)runMove(p,mv);
      else{if(p.t>=5&&p.t<=10)meleeHit(p,p.combo===3);if(p.combo===3&&p.t===8)heroFinisher(p)}
      const dur=mv?mv.dur:(p.combo===3?24:17);
      if(p.t>=dur||(p.queued&&p.combo<3&&p.t>=dur-3)){if(p.queued&&p.combo<3)startAtk(p,p.combo+1);else{p.state='idle';p.combo=0}}
      break;}
    case'jump':
      p.z+=p.vz;p.vz-=.65;p.x+=p.vx;
      if(phit(i,'atk')&&!p.jatk){p.jatk=true;p.jt=0;p.hitIds=new Set();sfx('swing',p.look.weapon);kiai(vprof(p),'atk')}
      if(p.jatk){p.jt++;meleeHit(p,true,{kind:(moveOf(p,'jatk')||{}).kind})}
      if(p.z<=0){p.z=0;p.vz=0;p.state='idle';sfx('land');for(let k=0;k<6;k++)emit({x:p.x+rnd(-20,20),y:p.y,z:2,vz:rnd(.5,1.5),vx:rnd(-2,2),col:'#b8a080',size:10,life:22,type:'smoke',add:false})}
      break;
    case'special':if(p.mysp)updMythSp(p);else updSpecial(p);break;
    case'hurt':if(p.z>0)p.z=Math.max(0,p.z-6);if(p.t>14)p.state='idle';break;
    case'win':if(p.t>50)p.state='idle';break;
    case'down':downPhys(p);if(p.z<=0&&p.t>48){p.state='idle';p.inv=70}break;
  }
  if(p.z>0&&GROUND_ST[p.state]){p.z=Math.max(0,p.z-6);p.vz=0}
  p.y=clamp(p.y,GT+5,GB);
  const maxX=w.lock!==null?w.camX+W-25:Math.min(w.S.len-25,w.camX+W-25);
  p.x=clamp(p.x,w.camX+25,maxX);
}
function revive(p){p.dead=false;p.hp=p.maxhp;p.mana=p.maxmana;p.state='down';p.t=40;p.z=0;p.inv=150;p.mp=Math.max(p.mp,50);
  for(const e of Wd.enemies)if(!e.dead&&Math.abs(e.x-p.x)<400)damage({x:p.x,isPlayer:true,pl:p},e,10,true);
  Wd.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:30,r:400});Wd.fx.push({type:'pillar',x:p.x,y:p.y,t:0,life:50,w:50,col:'#ffffff'})}
/* ---------- 인벤토리 아이템 사용 ---------- */
function swapItem(p){const s=p.ps;if(s.inv.length<2)return;s.sel=(s.sel+1)%s.inv.length;sfx('sel');
  const q=s.inv[s.sel];Wd.fx.push({type:'text',x:p.x,y:p.y,z:125,t:0,life:30,txt:`▶ ${ITEMS[q.kind].name} ×${q.n}`,col:'#ffe890',size:15})}
function useItem(p){
  const w=Wd,s=p.ps,slot=s.inv[s.sel];
  if(!slot){w.fx.push({type:'text',x:p.x,y:p.y,z:120,t:0,life:30,txt:'아이템 없음',col:'#aaa',size:14});sfx('noMp');return}
  const k=slot.kind,info=ITEMS[k];
  if(k==='elixir'&&p.hp>=p.maxhp){w.fx.push({type:'text',x:p.x,y:p.y,z:120,t:0,life:30,txt:'체력이 가득하다',col:'#aaa',size:14});return}
  slot.n--;if(slot.n<=0){s.inv.splice(s.sel,1);if(s.sel>=s.inv.length)s.sel=0}
  p.state='use';p.t=0;
  const buffFx=(col,txt)=>{w.fx.push({type:'pillar',x:p.x,y:p.y,t:0,life:40,w:40,col});burst(p.x,p.y,40,col,20,6,{g:-.1});w.fx.push({type:'text',x:p.x,y:p.y,z:140,t:0,life:60,txt,col,size:22})};
  switch(k){
    case'knife':sfx('knife');w.proj.push({kind:'knife',x:p.x+p.facing*20,y:p.y,z:62,vx:p.facing*15,life:60,dmg:12+powOf(p),owner:'p',pl:p,knock:false,w:22,hit:new Set()});break;
    case'bomb':sfx('fuse');kiai(vprof(p),'jump');w.proj.push({kind:'bomb',x:p.x+p.facing*20,y:p.y,z:70,vx:p.facing*7,vz:6,life:200,dmg:Math.round(28+powOf(p)*1.5),owner:'p',pl:p,w:0,hit:new Set()});break;
    case'wine':sfx('heal');p.mp=Math.min(p.maxki,p.mp+50);buffFx('#8ad0ff','기력 +50');break;
    case'elixir':sfx('heal');p.hp=Math.min(p.maxhp,p.hp+Math.round(p.maxhp*.6));buffFx('#80ff90','체력 회복!');break;
    case'tactic':sfx('power');p.buf.atk=600;buffFx('#ff6040','공격력 UP!');break;
    case'haste':sfx('power');p.buf.spd=600;buffFx('#60c0ff','속도 UP!');break;
    case'shield':sfx('power');p.buf.shield=480;buffFx('#ffd040','금강불괴!');break;
    case'tcharm':sfx('magic');let n=0;for(const e of w.enemies)if(onScreen(e,20)&&!e.dead){w.hz.push({x:e.x,y:e.y,t:0,delay:10+n*4,r:60,owner:'p',pl:p,kind:'bolt',dmg:Math.round(20+powOf(p))});n++}
      buffFx('#b080ff','뇌부 발동!');break;
  }
}
function downPhys(e){if(e.z>0||e.vz>0){e.z+=e.vz;e.vz-=.6;e.x+=e.vx;if(e.z<=0){e.z=0;e.vz=0;e.vx=0;sfx('thud');
  if(e.boss||e.dead)Wd.shake=Math.max(Wd.shake,4);for(let i=0;i<5;i++)emit({x:e.x+rnd(-25,25),y:e.y,z:2,vz:rnd(.5,1.5),vx:rnd(-2,2),col:'#a89070',size:12,life:26,type:'smoke',add:false})}}}

/* ---------- 적 AI ---------- */
function updEnemy(e){
  const w=Wd,d=D();
  e.t++;e.anim++;if(e.flash>0)e.flash--;if(e.cd>0)e.cd--;if(e.inv>0)e.inv--;
  if(e.stt){tickStatus(e);if(e.stt.chill>0&&e.cd>0&&e.t%2)e.cd++}
  eliteTick(e);
  if(e.guardBrk>0)e.guardBrk--;
  if(e.state==='down'){downPhys(e);if(e.dead){if(e.t>80)e.remove=true;return}
    if(e.z<=0&&e.t>(e.boss?32:55)){e.state='idle';e.inv=e.boss?40:20}return}
  if(e.state==='hurt'){if(e.t>e.hurtLen)e.state='idle';return}
  if(e.state==='attack'){
    const a0=e.boss?10:15,a1=e.boss?16:20;
    if(e.t>=a0&&e.t<=a1)meleeHit(e,(e.boss||e.officer)&&e.t===a0&&Math.random()<.5);
    if(e.t>(e.boss?24:34))e.state='idle';return}
  if(e.state==='shoot'){if(e.t===20)sfx('bow');if(e.t===20)w.proj.push({kind:'arrow',x:e.x+e.facing*24,y:e.y,z:60,vx:e.facing*8,life:120,dmg:e.pow,owner:'e',w:18,hit:new Set()});
    if(e.t>34)e.state='idle';return}
  if(e.state==='skill'){bossSkill(e);return}
  if(BSTATE[e.state]){BSTATE[e.state](e);return}
  if(e.boss&&bossPhaseTick(e))return;
  const p=tgtOf(e);
  if(!p||w.clear){e.state='idle';return}
  if(e.boss){e.spCd--;if(e.spCd<=0){startSkill(e);return}}
  if(!e.boss&&roleAI(e,p))return;
  const dx=p.x-e.x,dy=p.y+e.yoff-e.y,adx=Math.abs(dx);
  e.facing=dx>0?1:-1;
  let mx=0,my=0;
  if(e.ranged){
    if(adx<220)mx=-Math.sign(dx);else if(adx>380)mx=Math.sign(dx);
    if(Math.abs(dy)>8)my=Math.sign(dy);
    const sx=e.x-w.camX;if(sx<40)mx=1;if(sx>W-40)mx=-1;
    if(Math.abs(dy)<24&&e.cd<=0&&sx>0&&sx<W){e.state='shoot';e.t=0;e.cd=rnd(110,190)/d.aggr;return}
  }else{
    if(e.wait>0){e.wait--;e.state='idle';return}
    const engage=e.boss||e.decoy||e.token!==false;
    const side=e.token&&e.tside?e.tside:(e.x<p.x?-1:1);let tx=p.x+side*e.reach*rsc(e)*.7,ty=p.y+e.yoff;
    if(!engage){const hp=holdPos(e,p);tx=hp[0];ty=hp[1]}
    if(Math.abs(e.x-tx)>8)mx=Math.sign(tx-e.x);
    if(Math.abs(ty-e.y)>6)my=Math.sign(ty-e.y);
    if(engage&&adx<=e.reach*(e.look.scale||1)*rsc(e)&&Math.abs(dy)<20){
      if(e.cd<=0){e.state='attack';e.t=0;e.hitIds=new Set();e.cd=(e.boss?rnd(30,70):rnd(55,120))/d.aggr;sfx('swing',e.look.weapon);if(e.boss&&Math.random()<.4)kiai(VPROF.boss,'atk');return}
      mx=0;if(!e.boss&&Math.random()<.01)e.wait=rnd(20,50)/d.aggr;
    }
  }
  const sl=e.stt&&e.stt.chill>0?.5:1;
  if(mx||my){e.state='walk';e.x+=mx*e.spd*sl;e.y+=my*e.spd*.7*sl}else e.state='idle';
  e.y=clamp(e.y,GT+5,GB);
}
function startSkill(e){
  if(BOSS_PHASES[e.name]&&!e.decoy){phasedSkill(e);return}
  e.state='skill';e.t=0;e.hitIds=new Set();e.landed=false;
  const U=BOSS_ULT[e.name];
  if(U&&e.hp<e.maxhp/2&&(e.ultCd||0)<=0){e.skill='ult';e.ultCd=3;e.ult=U;e.inv=Math.max(e.inv,30);
    Wd.cutin={t:0,dur:50,boss:true,h:{fx:U.col,name:e.name,zi:'—',spName:U.n},look:e.look,name:U.n,hz:U.hz,sub:`${e.name} 필살기`,col:U.col};
    Wd.cine={t:0,dur:50+90,col:U.col};sfx('cutin');sfx('boss');setTimeout(()=>say(U.n+'!',VPROF.boss),300);
    e.spCd=(200+rnd(0,80))/D().aggr;return}
  e.ultCd=(e.ultCd||0)-1;
  e.skill=e.skills[Math.floor(Math.random()*e.skills.length)];
  kiai(VPROF.boss,e.skill==='bolt'||e.skill==='orb'?'cast':'big');
  sfx({dash:'dash',bolt:'magic',orb:'magic',slam:'jump',summon:'gong',wave:'wind'}[e.skill]);
  const enraged=e.hp<e.maxhp/2;
  e.spCd=((enraged?170:260)+rnd(0,120))/D().aggr;
  if(enraged&&!e.enragedShown){e.enragedShown=true;Wd.fx.push({type:'text',x:e.x,y:e.y,z:160,t:0,life:80,txt:'분노!',col:'#ff4a3a',size:30});burst(e.x,e.y,60,'#ff3020',30,9)}
}
function bossSkill(e){
  const w=Wd,p=tgtOf(e)||w.ps[0];
  switch(e.skill){
    case'ult':bossUlt(e,p);break;
    case'dash':
      if(e.t<32){e.facing=p.x>e.x?1:-1;if(e.t===1)e.dashY=p.y;e.flash=(e.t%6<3)?2:0;if(e.t%4===0)emit({x:e.x,y:e.y,z:rnd(20,80),vz:1,col:'#ff5030',size:14,life:18})}
      else if(e.t<32+50){e.x+=e.facing*11.5;e.y+=(e.dashY-e.y)*.06;
        for(const q of w.ps)if(!e.hitIds.has(q)&&hittable(q)&&Math.abs(q.x-e.x)<80&&Math.abs(q.y-e.y)<30&&q.z<60){e.hitIds.add(q);damage(e,q,Math.round(e.pow*1.4),true)}
        if(e.t%3===0)w.fx.push({type:'after',x:e.x,y:e.y,t:0,life:12,facing:e.facing,look:e.look,pose:poseOf(e),tint:'rgba(255,60,40,.5)'});
        const sx=e.x-w.camX;if((sx<50&&e.facing<0)||(sx>W-50&&e.facing>0))e.t=200}
      else e.state='idle';
      break;
    case'bolt':
      if(e.t===1){w.fx.push({type:'smoke',x:e.x,y:e.y,t:0,life:30});burst(e.x,e.y,50,'#a050ff',16,6);e.x=w.camX+rnd(120,W-120);e.y=rnd(GT+20,GB-20);w.fx.push({type:'smoke',x:e.x,y:e.y,t:0,life:30})}
      if(e.t===20||e.t===45||e.t===70)for(const q of alivePs())w.hz.push({x:q.x,y:q.y,t:0,delay:42,r:60,owner:'e',kind:'bolt',dmg:Math.round(e.pow*1.3)});
      if(e.t%4===0)emit({x:e.x+rnd(-20,20),y:e.y,z:rnd(60,110),vz:1.5,col:'#c070ff',size:12,life:20});
      if(e.t>100)e.state='idle';
      break;
    case'orb':
      e.facing=p.x>e.x?1:-1;
      if(e.t===22)for(let i=-1;i<=1;i++)w.proj.push({kind:'orb',x:e.x+e.facing*30,y:e.y+i*28,z:60,vx:e.facing*6,vy:i*.6,life:170,dmg:e.pow,owner:'e',knock:true,w:24,hit:new Set()});
      if(e.t>50)e.state='idle';
      break;
    case'slam':
      if(e.t===18){e.vz=13;e.vx=clamp((p.x-e.x)/42,-9,9);e.vy=(p.y-e.y)/42}
      if(e.t>18&&!e.landed){e.z+=e.vz;e.vz-=.62;e.x+=e.vx;e.y+=e.vy;
        if(e.z<=0){e.z=0;e.vz=0;e.landed=true;e.landT=e.t;w.shake=24;sfx('boss');
          w.hz.push({x:e.x,y:e.y,t:0,delay:1,r:160,owner:'e',kind:'slam',ground:true,dmg:Math.round(e.pow*1.3)});
          for(let i=0;i<14;i++)w.fx.push({type:'debris',x:e.x,y:e.y,z:5,vx:rnd(-6,6),vz:rnd(4,10),t:0,life:40,col:'#7a6a50'});
          for(let i=0;i<16;i++)emit({x:e.x+rnd(-80,80),y:e.y+rnd(-20,20),z:0,vz:rnd(1,3),col:'#9a8a70',size:rnd(14,24),life:36,type:'smoke',add:false})}}
      if(e.landed&&e.t>e.landT+24){e.landed=false;e.state='idle'}
      break;
    case'summon':
      if(e.t===20){w.fx.push({type:'text',x:e.x,y:e.y,z:160,t:0,life:60,txt:'"누구 없느냐!"',col:'#fff',size:20});
        const alive=w.enemies.filter(o=>!o.dead).length;for(let i=0;i<Math.min(3,7-alive);i++){const s=spawnEnemy(['s','sp','a'][i%3]);w.fx.push({type:'smoke',x:s.x,y:s.y,t:0,life:30})}}
      if(e.t>45)e.state='idle';
      break;
    case'wave':
      e.facing=p.x>e.x?1:-1;
      if(e.t===16){w.proj.push({kind:'swave',x:e.x+e.facing*40,y:e.y,z:55,vx:e.facing*8.5,life:140,dmg:Math.round(e.pow*1.2),owner:'e',knock:true,w:34,hit:new Set()});sfx('swing')}
      if(e.t>36)e.state='idle';
      break;
    default:bossSkillX(e,p);
  }
  e.y=clamp(e.y,GT+5,GB);
}

function bossUlt(e,p){
  const w=Wd,U=e.ult,t=e.t,c=U.col,ps=alivePs();
  switch(U.ty){
    case'thunder':
      if(t>=10&&t<=70&&t%12===10){for(const q of ps)w.hz.push({x:q.x,y:q.y,t:0,delay:34,r:64,owner:'e',kind:'bolt',dmg:Math.round(e.pow*1.4)});
        for(let i=0;i<4;i++)w.hz.push({x:w.camX+rnd(60,W-60),y:rnd(GT+10,GB-5),t:0,delay:34,r:64,owner:'e',kind:'bolt',dmg:Math.round(e.pow*1.2)});
        emit({x:e.x,y:e.y,z:120,col:c,size:40,life:16,type:'glow'})}
      if(t>96)e.state='idle';break;
    case'musou':case'charge':{const n=U.ty==='musou'?4:3,seg=24,k=Math.floor((t-8)/seg),lt=(t-8)%seg;
      if(t>=8&&k<n){if(lt===0){e.facing=p.x>e.x?1:-1;e.hitIds=new Set();e.dashY=p.y;sfx('dash')}
        if(lt<14){e.x+=e.facing*(U.ty==='musou'?20:16);e.y+=(e.dashY-e.y)*.12;
          for(const q of w.ps)if(!e.hitIds.has(q)&&hittable(q)&&Math.abs(q.x-e.x)<70&&Math.abs(q.y-e.y)<36&&q.z<60){e.hitIds.add(q);damage(e,q,Math.round(e.pow*1.5),true)}
          if(t%2===0)w.fx.push({type:'after',x:e.x,y:e.y,t:0,life:14,facing:e.facing,look:e.look,pose:poseOf(e),tint:hexA(c,.55)});
          if(U.ty==='musou'&&t%3===0)w.fx.push({type:'slashX',x:e.x+e.facing*40,y:e.y,z:60,t:0,life:10,ang:rnd(-1,1),len:220,col:c})}
        if(lt===15&&U.ty==='charge'){w.proj.push({kind:'swave',x:e.x+e.facing*40,y:e.y,z:55,vx:e.facing*9,life:120,dmg:Math.round(e.pow*1.2),owner:'e',knock:true,w:40,hit:new Set()});sfx('swing')}
        e.x=clamp(e.x,w.camX+30,w.camX+W-30)}
      if(t>=8+n*seg){e.state='idle';if(U.ty==='musou'){w.shake=24;w.flashT=8;w.flashCol='255,80,60';for(const q of w.ps)if(hittable(q)&&Math.abs(q.x-e.x)<240)damage(e,q,Math.round(e.pow*1.2),true)}}
      break}
    case'quake':
      if(t===10||t===32||t===54){const k=(t-10)/22;w.shake=26;sfx('boss');
        w.hz.push({x:e.x,y:e.y,t:0,delay:1,r:170+k*70,owner:'e',kind:'slam',ground:true,dmg:Math.round(e.pow*1.3)});
        for(const q of ps)w.hz.push({x:q.x,y:q.y,t:0,delay:22,r:58,owner:'e',kind:'rock',dmg:Math.round(e.pow*1.1),dur:22});
        for(let i=0;i<16;i++)w.fx.push({type:'debris',x:e.x,y:e.y,z:5,vx:rnd(-8,8),vz:rnd(5,12),t:0,life:40,col:'#7a6a50'})}
      if(t>76)e.state='idle';break;
    case'summon':
      if(t===12){w.fx.push({type:'text',x:e.x,y:e.y,z:170,t:0,life:70,txt:'"전군, 돌격하라!"',col:'#fff',size:22});
        for(let i=0;i<3;i++){const s=spawnEnemy(i<2?'o':'sp');if(!s.elite)makeElite(s);w.fx.push({type:'smoke',x:s.x,y:s.y,t:0,life:30})}}
      if(t===30||t===44){e.facing=p.x>e.x?1:-1;for(const dy of[-30,0,30])w.proj.push({kind:'swave',x:e.x+e.facing*40,y:clamp(e.y+dy,GT+5,GB),z:55,vx:e.facing*8,life:130,dmg:Math.round(e.pow*1.1),owner:'e',knock:true,w:36,hit:new Set()});sfx('wind')}
      if(t>60)e.state='idle';break;
    case'orbs':
      e.facing=p.x>e.x?1:-1;
      if(t===12||t===32)for(let i=-3;i<=3;i++)w.proj.push({kind:'orb',x:e.x+e.facing*30,y:e.y,z:60,vx:e.facing*5.5,vy:i*.9,life:170,dmg:e.pow,owner:'e',knock:true,w:24,hit:new Set()});
      if(t===52)for(const q of ps)for(let k=0;k<3;k++)w.hz.push({x:q.x+rnd(-40,40),y:clamp(q.y+rnd(-20,20),GT+5,GB),t:0,delay:30+k*8,r:62,owner:'e',kind:'bolt',dmg:Math.round(e.pow*1.2)});
      if(t>90)e.state='idle';break;
    default:bossUltX(e,p);
  }
  e.y=clamp(e.y,GT+5,GB);
}

/* ---------- 투사체 · 위험지대 · 아이템 ---------- */
function explodeAt(o,r){const w=Wd;o.boomed=true;w.hz.push({x:o.x,y:o.y,t:0,delay:1,r:r||95,owner:'p',pl:o.pl,kind:'boom',dmg:o.dmg,dur:26,el:o.el,noProc:o.noProc});sfx('bomb');w.shake=Math.max(w.shake,14);
  burst(o.x,o.y,20,'#ffa030',26,11);for(let i=0;i<14;i++)emit({x:o.x+rnd(-40,40),y:o.y+rnd(-15,15),z:rnd(0,40),vz:rnd(1,4),col:'#5a5048',size:rnd(16,28),life:rnd(30,50),type:'smoke',add:false});o.life=0}
function updProj(o){
  const w=Wd;
  if(o.kind==='bomb'){o.x+=o.vx;o.z+=o.vz;o.vz-=.45;if(o.life%4===0)emit({x:o.x,y:o.y,z:o.z+8,vz:1,col:'#ffb040',size:8,life:12});
    if(o.z<=0)explodeAt(o,100);if(--o.life<=0&&o.z>0)explodeAt(o,100);return}
  if(o.ax){o.vx+=o.ax;if(!o.turned&&Math.sign(o.vx)!==Math.sign(o.vx-o.ax)){o.turned=true;o.hit.clear()}
    const pl=o.pl;if(o.turned&&pl&&Math.abs(pl.x-o.x)<30)o.life=0;emit({x:o.x,y:o.y,z:o.z,col:o.col||'#ff8ad0',size:10,life:14})}
  o.x+=o.vx;if(o.vy)o.y+=o.vy;o.life--;
  if(o.owner==='p'&&(o.el||o.col)&&o.kind!=='tornado')for(let k=0;k<2;k++)emit({x:o.x-o.vx*rnd(0,1.2),y:o.y+rnd(-3,3),z:o.z+rnd(-10,10),vx:-o.vx*.06+rnd(-.4,.4),vz:rnd(-.5,.8),col:k?'#ffffff':(o.col||EL_COL[o.el]),size:rnd(2,4.5),life:rnd(10,20),type:'sq'});
  if(o.kind==='fireball'&&o.life%2===0)emit({x:o.x,y:o.y,z:o.z,vz:rnd(0,1.5),col:'#ff7020',size:14,life:16});
  if(o.kind==='gwave'&&o.life%2===0)emit({x:o.x,y:o.y,z:rnd(0,60),vz:rnd(1,3),col:'#60ff9a',size:12,life:18});
  if(o.kind==='redslash'&&o.life%2===0)burst(o.x,o.y,o.z,'#ff4030',2,3,{type:'spark',size:3});
  if(o.hist){o.hist.push([o.x+Math.sin(o.life*.4)*10*-Math.sign(o.vx)-o.vx*2,o.y-o.z+Math.sin(o.life*.35)*28]);if(o.hist.length>16)o.hist.shift();
    emit({x:o.x+rnd(-40,40),y:o.y,z:o.z+rnd(-60,60),vx:-o.vx*.2,col:o.col||'#50ff90',size:rnd(8,16),life:20})}
  if(o.kind==='tornado'){
    if(o.life%o.multi===0)o.hit.clear();
    for(const e of w.enemies)if(!e.dead&&Math.abs(e.x-o.x)<110&&Math.abs(e.y-o.y)<50&&e.state!=='down')e.x+=Math.sign(o.x-e.x)*2.5;
    for(let i=0;i<2;i++)emit({x:o.x+rnd(-50,50),y:o.y,z:rnd(0,150),vx:rnd(-3,3),vz:rnd(1,3),col:'#dfeaff',size:rnd(5,10),life:18,type:'sq'});
    if(o.life===1)for(const e of w.enemies)if(!e.dead&&Math.abs(e.x-o.x)<130&&Math.abs(e.y-o.y)<60)damage({x:o.x,isPlayer:true,pl:o.pl},e,o.dmg*3,true);
  }
  if(o.kind==='farrow'&&o.life%2===0)emit({x:o.x,y:o.y,z:o.z,vz:rnd(0,1),col:'#ff9030',size:10,life:14});
  if(o.kind==='orb'&&o.life%3===0)emit({x:o.x,y:o.y,z:o.z,col:'#c050ff',size:10,life:14});
  if(o.x<w.camX-160||o.x>w.camX+W+160)o.life=0;
  const hk=o.hk||({arrow:'pierce',farrow:'pierce',knife:'pierce',wind:'magic',orb:'magic',tornado:'magic',dragon:'magic',swave:'blade',eball:'magic'}[o.kind])||'blade';
  const src={x:o.x-o.vx,isPlayer:o.owner==='p',pl:o.pl,hk,el:o.el,noProc:o.noProc,sk:o.sk,col:o.col};
  const targets=o.owner==='p'?w.enemies:w.ps;
  for(const t of targets){
    if(o.life<=0)break;
    if(o.hit.has(t)||!hittable(t))continue;
    const hz=o.kind==='tornado'?140:60,cz=o.kind==='tornado'?60:o.z;
    if(Math.abs(t.x-o.x)<o.w&&Math.abs(t.y-o.y)<(o.kind==='tornado'?40:24)*(o.owner==='p'?1.5:1)&&Math.abs(t.z+55-cz)<hz){o.hit.add(t);
      if(o.explode){explodeAt(o,o.exR||80);break}
      damage(src,t,o.dmg,!!o.knock,o.stun?{stun:o.stun}:o.kind==='tornado'?{stun:14}:o.kind==='petal'?{stun:16}:null);if(!o.pierce)o.life=0}
  }
  if(o.explode&&o.life===0&&o.kind==='fireball'&&!o.boomed){o.boomed=true;explodeAt(o,o.exR||80)}
  if(o.owner==='p'&&o.life>0)for(const pr of w.props){if(pr.broken||o.hit.has(pr))continue;
    if(Math.abs(pr.x-o.x)<o.w+(pr.gate?30:0)&&(pr.gate||Math.abs(pr.y-o.y)<28)){o.hit.add(pr);hitProp(pr);if(!o.pierce)o.life=0}}
}
function updHz(z){
  const w=Wd;z.t++;
  if(z.track&&z.t<z.delay&&!z.track.dead){z.x=z.track.x;z.y=z.track.y}
  if(z.kind==='fire'&&z.t>z.delay&&z.t%2===0)for(let i=0;i<3;i++)emit({x:z.x+rnd(-30,30),y:z.y,z:rnd(0,60),vz:rnd(3,8),vx:rnd(-1,1),col:hash(i+z.t)<.5?'#ff7a20':'#ffd060',size:rnd(10,20),life:rnd(18,30)});
  if(z.t===z.delay){
    if(z.kind==='bolt'){sfx('bolt');w.shake=Math.max(w.shake,8);burst(z.x,z.y,10,z.owner==='p'?'#8ad8ff':'#d070ff',14,9);w.flashT=Math.max(w.flashT,3)}
    if(z.kind==='arrow'){burst(z.x,z.y,8,'#ffa040',10,6);glowFlash(z.x,z.y,10,'#ff9030',50,10)}
    if(z.kind==='fire'){sfx('fire');w.shake=Math.max(w.shake,6);burst(z.x,z.y,20,'#ff8030',16,10)}
    if(z.kind==='rock'){sfx('rock');w.shake=Math.max(w.shake,8);for(let i=0;i<8;i++)w.fx.push({type:'debris',x:z.x,y:z.y,z:10,vx:rnd(-5,5),vz:rnd(5,10),t:0,life:40,col:'#7a6040'})}
    if(z.kind==='slam')sfx('thud');
    if(z.kind==='ice'){sfx('magic');burst(z.x,z.y,20,'#bff0ff',14,8);for(let i=0;i<12;i++)emit({x:z.x+rnd(-20,20),y:z.y,z:rnd(5,40),vx:rnd(-4,4),vz:rnd(3,8),g:.35,col:i%2?'#dff8ff':'#8ad8ff',size:rnd(4,8),life:rnd(24,36),type:'shard',add:false})}
    if(z.owner==='p'&&z.kind==='bolt')for(let i=0;i<10;i++)emit({x:z.x,y:z.y,z:4,vx:rnd(-5,5),vz:rnd(2,7),g:.3,col:i%2?'#ffffff':'#bfe8ff',size:2,life:rnd(12,22),type:'sq'});
    if(z.owner==='p'&&(z.kind==='fire'||z.kind==='boom'))for(let i=0;i<12;i++)emit({x:z.x+rnd(-25,25),y:z.y,z:rnd(0,20),vx:rnd(-2,2),vz:rnd(2,6),g:.08,col:i%3?'#ffb040':'#fff0a0',size:rnd(2,3),life:rnd(20,34),type:'sq'});
    const targets=z.owner==='p'?w.enemies:w.ps;
    for(const t of targets){
      if(!hittable(t))continue;
      const dx=t.x-z.x,dy=(t.y-z.y)*2;
      if(dx*dx+dy*dy<z.r*z.r&&(z.ground?t.z<6:t.z<80))damage({x:z.x+(dx>=0?-1:1),isPlayer:z.owner==='p',pl:z.pl,el:z.el,noProc:z.noProc,sk:z.sk,hk:z.kind==='bolt'||z.kind==='ice'?'magic':z.kind==='arrow'?'pierce':'blunt'},t,z.dmg,true,z.launch?{launch:true}:null);
    }
  }
}
function updItem(it){
  it.t++;
  if(it.z>0||it.vz>0){it.z+=it.vz;it.vz-=.5;if(it.z<=0){it.z=0;it.vz=it.vz<-2?-it.vz*.4:0}}
  if(ITEMS[it.kind].treasure&&it.t%6===0)emit({x:it.x+rnd(-14,14),y:it.y,z:rnd(0,30),vz:rnd(.5,1.5),col:'#ffd860',size:8,life:30});
  if(!ITEMS[it.kind].treasure&&!it.keep&&it.t>1100)it.gone=true;
  if(it.t>20){let best=null,bd=1e9;for(const p of Wd.ps){if(p.dead||p.out)continue;const d=Math.hypot(it.x-p.x,(it.y-p.y)*1.5);if(d<bd){bd=d;best=p}}
    if(best){const boss=Wd.clear>45,R=boss?4000:best.ps.st.pickR,full=it.kind==='gear'&&bagFull(best.ps.rpg,it.gear.g);
      if(bd<R&&bd>6&&!full){const k=boss?.1:.16;it.x+=(best.x-it.x)*k+Math.sign(best.x-it.x)*1.5;it.y+=(best.y-it.y)*k;if(it.z<8&&it.vz<=0)it.z=8+Math.sin(it.t*.3)*3;
        if(it.t%4===0)emit({x:it.x,y:it.y,z:it.z+6,col:it.kind==='gear'?GRADES[it.gear.g].c:'#ffe890',size:3,life:12,type:'sq'})}}}
  if((it.keep||ITEMS[it.kind].treasure)&&it.x<Wd.camX+40)it.x=Wd.camX+40;
  if(it.t>15)for(const p of Wd.ps){if(!p.dead&&!p.out&&Math.abs(it.x-p.x)<32&&Math.abs(it.y-p.y)<24&&p.z<30){if(pickup(it,p)!==false){it.gone=true;break}}}
}

/* ---------- 플레이 루프 ---------- */
function updPlay(){
  const w=Wd;
  if(hit('pause'))paused=!paused;
  if(paused)return;
  if(w.cine){w.cine.t++;if(w.cine.t>=w.cine.dur)w.cine=null}
  if(w.cutin){w.cutin.t++;if(w.cutin.t>=w.cutin.dur)w.cutin=null;return}
  if(w.sflash){w.sflash.t++;if(w.sflash.t>=w.sflash.dur)w.sflash=null;return}
  {const T=talkActive();if(T&&T.pause){updTalk();return}}
  for(let i=0;i<G.np;i++)if(!w.ps[i].out&&phit(i,'menu')){openMenu(i,'play');return}
  w.t++;
  if(w.banner>0)w.banner--;
  if(w.flashT>0)w.flashT--;
  if(w.speed>0)w.speed--;
  if(w.bossBanner){w.bossBanner.t++;if(w.bossBanner.t>200)w.bossBanner=null}
  if(w.msg){w.msg.t++;if(w.msg.t>w.msg.life)w.msg=null}
  if(w.go>0)w.go--;
  for(const pr of w.props)if(pr.shake>0)pr.shake--;
  for(const p of w.ps)updPlayer(p);
  if(scene!=='play')return;
  battleTick();stageEvTick();
  for(const e of w.enemies)updEnemy(e);
  for(const a of w.allies)updAlly(a);
  for(const o of w.proj)updProj(o);
  for(const z of w.hz)updHz(z);
  for(const it of w.items)updItem(it);
  for(const f of w.fx){f.t++;if(f.type==='debris'){f.x+=f.vx;f.z+=f.vz;f.vz-=.5;if(f.z<0){f.z=0;f.vz*=-.3;f.vx*=.6}}}
  updParticles();
  w.enemies=w.enemies.filter(e=>!e.remove);
  w.allies=w.allies.filter(a=>!a.remove);
  w.proj=w.proj.filter(o=>o.life>0);
  w.hz=w.hz.filter(z=>z.t<z.delay+(z.dur||16));
  w.items=w.items.filter(i=>!i.gone);
  w.fx=w.fx.filter(f=>f.t<f.life);
  // 2인: 전원 탈락이면 게임 오버
  if(G.np===2&&w.ps.every(p=>p.out)){scene='gameover';contT=240;return}
  // 카메라: 앞선 플레이어를 따라가되 뒤처진 플레이어를 화면 밖으로 밀지 않음
  const act=w.ps.filter(p=>!p.out&&!(p.dead&&p.waiting));
  if(w.lock===null&&act.length){
    const lead=Math.max(...act.map(p=>p.x)),trail=Math.min(...act.map(p=>p.x));
    const tgt=Math.min(lead-W*.45,trail-40,w.S.len-W);if(tgt>w.camX)w.camX=tgt;
  }
  const lead=Math.max(...w.ps.filter(p=>!p.out).map(p=>p.x).concat([0]));
  const waves=w.S.waves;
  if(w.lock===null&&!w.clear){
    if(w.wave<waves.length&&lead>waves[w.wave][0]){w.lock=w.camX;spawnWave(waves[w.wave]);w.wave++}
    else if(w.wave>=waves.length&&!w.bossSpawned&&w.camX>=w.S.len-W-1){
      w.lock=w.camX;w.bossSpawned=true;const b=w.S.boss;w.boss=spawnBoss(b);w.bossT=w.t;stageEvBoss(w.boss);
      b.escort.split(' ').forEach(t=>spawnEnemy(t));
    }
  }
  if(w.lock!==null&&!w.clear&&!w.gateLock&&!w.enemies.some(e=>!e.dead)&&!w.bossSpawned){w.lock=null;w.go=150}
  if(w.clear){w.clear++;
    if(w.clear===2){stageEvClear();w.timeBonus=Math.round(Math.max(0,300-Math.floor(w.t/60))*50*D().score);for(const p of w.ps)if(!p.out)p.ps.score+=w.timeBonus;
      for(const p of w.ps)if(!p.dead&&!p.out){p.state='win';p.t=0}}
    if(w.clear>60&&w.clear%10===0)emit({x:w.camX+rnd(100,W-100),y:rnd(GT,GB),z:rnd(100,250),col:['#ff6060','#ffd060','#60ff90','#60c0ff'][(Math.random()*4)|0],size:20,life:40,type:'glow'});
    /* 전장 정리: 자유롭게 움직이며 드랍 아이템을 줍고, ENTER 로 직접 다음 진행 */
    if(w.clear>90&&hit('start')){const r=collectRest();w.collectNote=r.got||r.lost?` · 남은 아이템 ${r.got}개 자동 획득${r.lost?` (가방 가득 ${r.lost}개 분해)`:''}`:'';sfx('ok');finishStage()}}
}
function collectRest(){
  const w=Wd,ps=w.ps.filter(p=>!p.out);let got=0,lost=0;
  for(const it of w.items){if(it.gone)continue;const p=ps.find(q=>!q.dead)||ps[0];if(!p)break;
    if(it.kind==='gear'){const q=ps.find(q=>!bagFull(q.ps.rpg,it.gear.g));if(q){pickup(it,q);got++}else{const gn=salvageGain(it.gear);p.ps.rpg.mats.stone+=gn.stone;p.ps.rpg.mats.frag+=gn.frag;lost++}}
    else{pickup(it,p);got++}
    it.gone=true}
  return{got,lost};
}
function finishStage(){
  for(const p of Wd.ps){const s=p.ps;s.mp=p.mp;s.hpCarry=s.maxhp}
  const k=G.stage,key=G.cycle+':'+k,first=!G.clears[key];G.clears[key]=true;
  if(first)for(const s of G.pl){s.rpg.skillPts+=1;s.rpg.statPts+=5}
  const ord=ORDER.indexOf(k);
  if(ord>=0&&ord<LAST_ORD)G.prog=Math.max(G.prog,ord+1);
  const nm=STAGES[k].title.replace(/\s+/g,' ');
  const msg=(first?`${nm} 첫 평정 보상 — 스킬 포인트 +1 · 능력치 포인트 +5`:`${nm} 평정 완료`)+(Wd.collectNote||'');
  if(ord===LAST_ORD){if(G.treasures.book&&G.treasures.seal&&G.treasures.sword)startStage(5);else showEnding(false)}
  else if(k===5)showEnding(true);
  else if(k===4&&!(G.flags&&G.flags.hy))openChoice(HY_CHOICE,o=>{G.flags=G.flags||{};G.flags.hy=o.k;applyTreasures();G.pl.forEach(recalc);toCamp(msg+' · '+o.after)});
  else toCamp(msg);
}
function showEnding(trueEnd){
  const n=['book','seal','sword'].filter(k=>G.treasures[k]).length;
  const heroLines=G.pl.map(s=>HEROES[s.hero].end);
  let lines;
  if(trueEnd){
    const newly=!unlockLubu;unlockLubu=true;store.set('kov_lubu','1');
    lines=['사마의의 진이 무너지자 칠성등이 다시 환하게 타올랐다.',G.lampSaved===false?'꺼졌던 등불에 공명이 다시 불을 붙였다 — "사람의 뜻이 하늘을 이겼소."':'별은 지지 않았다. 공명은 다시 붓을 들어 출사표를 썼다.',
      '한 황실은 다시 일어섰고, 천하는 하나가 되었다.',...endChoiceLines(),...heroLines,'【 진(眞) 엔딩 — 한실부흥(漢室復興) 】'];
    if(newly)lines.push('★ 히든 무장 「여포」가 해금되었습니다! ★');
  }else lines=['번성의 물길이 칠군을 삼키자 관우의 이름이 중원을 뒤흔들었다.','유비는 한중왕에 올랐으나, 천하는 위 · 촉 · 오 셋으로 굳어져 갔다.',...endChoiceLines(),'영웅들의 싸움은 계속된다...',...heroLines,'【 엔딩 — 천하삼분(天下三分) 】',
    `숨겨진 보물 ${n} / 3  ·  세 보물을 모두 모으면 또 다른 운명이 열린다...`];
  lines.push('▶ 군영으로 돌아가 「윤회」로 더 강한 난세에 도전할 수 있습니다.');
  showStory(trueEnd?'천하통일':'삼국정립',lines,()=>{G.done=true;toCamp('천하 평정! 「윤회」로 다음 회차에 도전하세요. (전장 재도전으로 파밍도 가능)')},{end:true,hidden:trueEnd});
}

/* =================== 렌더링 =================== */
let ICON_T=null;const ICON_C={},ICON_STATIC={bun:1,chicken:1,wine:1,gold:1,silver:1,knife:1,elixir:1,tactic:1,haste:1,shield:1,tcharm:1};
function drawItemIcon(k,x,y,t){
  if(!ICON_T&&ICON_STATIC[k]){let c=ICON_C[k];
    if(!c){const lo=mkC(30,30);ICON_T=lo.getContext('2d');drawItemIcon(k,0,0,0);ICON_T=null;c=ICON_C[k]=refineCanvas(lo,3,{grain:8,hl:24,sh:28,th:30,seed:k.length})}
    ctx.drawImage(c,Math.round(x/3)*3-45,Math.round(y/3)*3-60);return}
  const G_=ICON_T||ctx,U=ICON_T?1:3,ox=ICON_T?15:Math.round(x/3)*3,oy=ICON_T?20:Math.round(y/3)*3;
  const px=(dx,dy,w,h,c)=>{G_.fillStyle=c;G_.fillRect(ox+dx*U,oy+dy*U,w*U,h*U)};
  switch(k){
    case'bun':px(-3,-4,6,1,'#f8f4ea');px(-4,-3,8,3,'#f4f0e6');px(-4,0,8,1,'#cbbd9a');px(-1,-5,2,1,'#e0d6c0');px(-2,-3,1,1,'#ffffff');break;
    case'chicken':px(-4,-4,6,4,'#c8762a');px(-3,-5,4,1,'#e09a4a');px(-3,-4,2,1,'#f0b060');px(2,-3,3,1,'#f0e0c0');px(4,-4,1,3,'#f8f0e0');px(-4,0,6,1,'#8a4a1a');break;
    case'wine':px(-3,-4,6,5,'#7a4a24');px(-2,-6,4,2,'#6b3b1a');px(-1,-7,2,1,'#c02020');px(-2,-3,4,2,'#d03030');px(-3,-4,1,4,'#9a6a3a');break;
    case'gold':case'silver':{const c=k==='gold'?'#f0c030':'#d8dde2',d=k==='gold'?'#b08010':'#9098a0';px(-5,-3,2,2,c);px(3,-3,2,2,c);px(-4,-2,8,2,c);px(-2,-4,4,2,shade(c,20));px(-4,0,8,1,d);break}
    case'gem':{const c=`hsl(${t*4%360},90%,65%)`;px(-1,-6,2,1,'#fff');px(-2,-5,4,2,c);px(-3,-3,6,2,c);px(-2,-1,4,1,c);px(-1,0,2,1,c);break}
    case'knife':for(let i=0;i<3;i++){px(-4+i*3,-5,1,4,'#e8eef4');px(-4+i*3,-1,1,2,'#c02020')}break;
    case'bomb':px(-3,-6,6,6,'#2a2a2a');px(-4,-5,8,4,'#2a2a2a');px(-2,-6,2,1,'#666');px(-4,-3,8,1,'#b02020');px(1,-8,1,2,'#8a6a3a');px(2,-9,1,1,(t>>2)%2?'#ffe040':'#ff6020');break;
    case'elixir':px(-1,-8,2,1,'#8a5a20');px(-2,-7,4,2,'#d04020');px(-3,-5,6,4,'#e05030');px(-2,-5,1,2,'#ff9a70');px(-2,-1,4,1,'#a02010');px(-1,-4,2,2,'#ffd040');break;
    case'tactic':px(-4,-6,8,6,'#c8b080');px(-5,-6,1,6,'#6b3b1a');px(4,-6,1,6,'#6b3b1a');for(let r=0;r<3;r++)px(-3,-5+r*2,6,1,'#3a2a1a');break;
    case'haste':px(-2,-7,5,8,'#f0e070');px(-2,-7,5,1,'#c02020');px(0,-5,1,5,'#c02020');px(-1,-3,3,1,'#c02020');break;
    case'shield':px(-3,-7,7,5,'#e0b030');px(-2,-2,5,2,'#e0b030');px(-1,0,3,1,'#e0b030');px(-1,-6,3,3,'#fff0a0');px(-3,-7,7,1,'#ffe890');break;
    case'tcharm':px(-2,-7,5,8,'#b090f0');px(-2,-7,5,1,'#ffffff');px(1,-6,1,2,'#fff6a0');px(0,-4,2,1,'#fff6a0');px(-1,-3,1,2,'#fff6a0');break;
    default:{const it=ITEMS[k];ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.6+.3*Math.sin(t*.15);ctx.drawImage(glowSpr('#ffc040'),x-30,y-38,60,60);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      const c=k==='book'?'#2a4a8a':k==='seal'?'#3aa070':k==='sword'?'#5a8ab8':'#b02a1a';px(-4,-7,8,8,c);px(-4,-7,8,1,'#ffe28a');px(-4,0,8,1,'#ffe28a');px(-4,-7,1,8,'#ffe28a');px(3,-7,1,8,'#ffe28a');
      txt(it.hz[0],x,y-9,15,'#fff','center',HANJA)}
  }
}
const PROP_C={};
function propArt(kind){
  let c=PROP_C[kind];if(c)return c;
  const lo=mkC(34,50),g=lo.getContext('2d'),px=(dx,dy,w,h,col)=>{g.fillStyle=col;g.fillRect(17+dx,46+dy,w,h)};
  if(kind==='jar'){
    px(-4,-17,8,2,'#5a3418');px(-3,-18,6,1,'#7a4a24');px(-6,-15,12,2,'#8b5a2b');px(-7,-13,14,9,'#8b5a2b');px(-6,-4,12,2,'#7a4a24');px(-5,-2,10,2,'#6b4020');
    px(-6,-13,2,7,'#a8743c');px(4,-13,2,9,'#6b4020');px(-3,-11,6,5,'#c02020');px(-2,-10,4,3,'#e04040');
  }else{
    for(let r=0;r<14;r++)px(-12,-14+r,24,1,r%3===0?'#5a5650':'#6f6a64');for(let cc=-12;cc<12;cc+=4)px(cc,-14,1,14,'#55504a');
    px(-13,-16,26,2,'#8a847c');px(-11,-15,22,1,'#050505');
    px(-12,-38,2,22,'#4a3018');px(10,-38,2,22,'#4a3018');px(-15,-40,30,2,'#5a2a1a');px(-12,-42,24,2,'#6a3a2a');px(-8,-44,16,2,'#5a2a1a');px(0,-36,1,14,'#222222');px(-1,-24,3,3,'#6a4a2a');
  }
  return PROP_C[kind]=refineCanvas(lo,3,{grain:9,hl:20,sh:24,th:28,seed:kind.length});
}
function drawProp(pr,sx){
  if(pr.broken)return;
  if(pr.kind==='totem'){drawTotem(pr,sx);return}
  if(pr.gate){drawGate(pr,sx);return}
  const sh=pr.shake>0?Math.round(Math.sin(pr.shake*2)*1)*3:0,y=pr.y,bx=Math.round(sx/3)*3,by=Math.round(y/3)*3;
  ctx.fillStyle='rgba(0,0,0,.3)';ell(sx,y,26,7);
  const pa=propArt(pr.kind==='jar'?'jar':'well'),K=1.3;ctx.drawImage(pa,bx+sh-51*K,by-138*K,pa.width*K,pa.height*K);
  if(pr.kind==='jar')txt(pr.count?'秘':'福',bx+sh,by-25*K-4,14,'#ffe28a','center',HANJA);
  else if(!G.treasures.seal){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5+.3*Math.sin(frame*.1);ctx.drawImage(glowSpr('#a0ffd0'),sx-30,y-60,60,30);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
}
/* 캐릭터 표시 배율 (1920x1080 기준 플레이어 약 130~150px · 일반 몹 150px · 보스 250px+) */
const vsc=e=>e.isPlayer||e.isAlly?1:e.boss||e.decoy?(e.mid?1.22:1.48):.95;
/* 판정 배율: 캐릭터 표시 크기(vsc)에 맞춘 사거리 */
const rsc=e=>e.isPlayer?.95:e.boss||e.decoy?(e.mid?1.05:1.2):.9;
function drawEnt(e,cx){
  if(e.out)return;
  const vs=vsc(e),s=(e.look.scale||1)*vs,sx=e.x-cx,sy=e.y-e.z;
  ctx.fillStyle='rgba(0,0,0,.35)';ell(sx,e.y,22*s*Math.max(.5,1-e.z/150),6*s);
  if(e.isPlayer&&G.np===2&&!e.dead){ctx.strokeStyle=PCOL[e.idx];ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(sx,e.y,26,8,0,0,Math.PI*2);ctx.stroke()}
  let a=1;if(e.dead&&e.t>40&&(e.t>>2)%2)a=.25;if(e.isPlayer&&e.inv>0&&e.state!=='special'&&e.state!=='dodge'&&(e.inv>>2)%2)a=.5;
  if(e.isPlayer&&e.dead&&e.waiting)a=.35;
  if(e.boss&&e.state==='skill'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.2*Math.sin(frame*.4);ctx.drawImage(glowSpr(e.skill==='bolt'||e.skill==='orb'?'#b050ff':'#ff4020'),sx-70*s,sy-130*s,140*s,150*s);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  if(e.isPlayer&&e.state==='special'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45;ctx.drawImage(glowSpr(e.h.fx),sx-80,sy-140,160,170);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  if(e.buf&&!e.dead){ctx.globalCompositeOperation='lighter';[['atk','#ff4020'],['spd','#40a0ff'],['shield','#ffd040']].forEach(([k,col],j)=>{if(e.buf[k]>0){
      ctx.globalAlpha=.3+.15*Math.sin(frame*.2+j);ctx.drawImage(glowSpr(col),sx-55,sy-120,110,130);if(frame%5===j)emit({x:e.x+rnd(-20,20),y:e.y,z:rnd(0,90),vz:rnd(1,2.5),col,size:8,life:20})}});
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  if(e.isPlayer&&!e.dead)enhBodyFx(e,sx,sy,cx);
  if(e.isPlayer&&!e.dead&&e.look.aura){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.16+.08*Math.sin(frame*.1);ctx.drawImage(glowSpr(e.look.aura),sx-38,sy-108,76,116);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    if(frame%8===0)emit({x:e.x+rnd(-18,18),y:e.y,z:rnd(0,90),vz:rnd(.6,1.4),col:e.look.aura,size:3,life:30,type:'sq'})}
  ctx.globalAlpha=a;
  const r=renderModelOutlined(ctx,e.look,poseOf(e),sx,sy,vs,e.facing,{flash:e.flash>0&&(e.flash&2),tint:!e.isPlayer&&e.stt&&e.stt.chill>0?'rgba(120,210,255,.42)':null},e.boss?'#200404':'#140a06');
  ctx.globalAlpha=1;
  if(e.isPlayer&&!e.dead)enhWeaponFx(e,r,cx);
  if(e.isPlayer&&!e.dead&&e.look.wglow){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55+.2*Math.sin(frame*.25);ctx.drawImage(glowSpr(e.look.wglow),r.tx-16,r.ty-16,32,32);ctx.globalAlpha=.3;ctx.drawImage(glowSpr(e.look.wglow),r.mx-12,r.my-12,24,24);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';if(frame%5===0)emit({x:r.tx+cx+rnd(-4,4),y:e.y,z:e.y-r.ty+rnd(-4,4),vz:rnd(.3,1),col:e.look.wglow,size:2,life:20,type:'sq'})}
  if(!e.isPlayer&&!e.dead&&!e.boss){
    if(e.elite){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3;ctx.drawImage(glowSpr(ELITE[e.elite[0]].c),sx-40*s,sy-120*s,80*s,130*s);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      txt(`${e.elite.map(k=>ELITE[k].n).join('·')} 정예  Lv.${e.lv}`,sx,sy-128*s,12,'#ffd24a','center',FONT,['#000',3])}
    if(e.hp<e.maxhp||e.elite){const bw=e.elite?56:40;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(sx-bw/2-1,sy-116*s-1,bw+2,6);ctx.fillStyle=e.elite?'#ffb030':'#e04030';ctx.fillRect(sx-bw/2,sy-116*s,bw*clamp(e.hp/e.maxhp,0,1),4)}}
  if(e.isPlayer&&G.np===2&&!e.dead)txt(`${e.idx+1}P`,sx,sy-118*s,15,PCOL[e.idx],'center',MONO,['#000',4]);
  const act=['attack','special','cmd','rise','spin','dashatk','pskill'].includes(e.state)||(e.state==='jump'&&e.jatk)||(e.state==='skill'&&e.skill==='dash');
  if(act){e.trail.push({tx:r.tx+cx,ty:r.ty,mx:r.mx+cx,my:r.my});if(e.trail.length>7)e.trail.shift()}else if(e.trail.length)e.trail.shift();
  if(e.trail.length>1)drawTrail(e.trail,cx,e.isPlayer?((e.ps.wfx&&e.ps.wfx.c)||e.look.wglow||e.h.fx):(e.boss?'#ff7060':'#e8e8ff'));
  if(e.isPlayer&&act&&e.ps.wfx&&frame%2===0)wfxSwing(e,r.tx+cx,e.y,e.y-r.ty);
}
function bar(x,y,w,h,v,max,c1,c2){ctx.fillStyle='#200';ctx.fillRect(x,y,w,h);const r=clamp(v/max,0,1);const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.fillRect(x,y,w*r,h);
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(x,y,w*r,Math.max(1,h/4));ctx.strokeStyle='#d4af37';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h)}
function drawPanel(p,x0){
  const h=p.h,s=p.ps,two=G.np===2,pw=two?350:390;
  ctx.fillStyle='rgba(10,5,0,.7)';ctx.fillRect(x0,8,pw,126);ctx.strokeStyle=two?PCOL[p.idx]:'#b8902a';ctx.lineWidth=2;ctx.strokeRect(x0,8,pw,126);
  // 보관 아이템 8칸 + 단축 스킬 4칸
  for(let k=0;k<8;k++){const sx=x0+6+k*27,sy=104,q=s.inv[k],on=q&&k===s.sel;
    ctx.fillStyle=on?'rgba(255,220,120,.3)':'rgba(0,0,0,.5)';ctx.fillRect(sx,sy,24,24);ctx.strokeStyle=on?'#ffe060':'#5a4a30';ctx.lineWidth=on?2:1;ctx.strokeRect(sx,sy,24,24);
    if(q){ctx.save();ctx.translate(sx+12,sy+19);ctx.scale(.62,.62);drawItemIcon(q.kind,0,0,frame);ctx.restore();txt(String(q.n),sx+23,sy+19,10,'#fff','right',MONO,['#000',3])}}
  drawHotbar(p,x0+232,104);
  // 버프
  const bf=[['atk','攻','#ff6040'],['spd','速','#60c0ff'],['shield','盾','#ffd040']].filter(b=>p.buf&&p.buf[b[0]]>0);
  bf.forEach(([k,c,col],j)=>{const bx2=x0+86+j*40;ctx.fillStyle=col;ctx.fillRect(bx2,84,15,14);txt(c,bx2+7.5,91,10,'#000','center',HANJA);txt(Math.ceil(p.buf[k]/60)+'s',bx2+18,91,10,col,'left',MONO)});
  drawSbufIcons(p,x0+86+bf.length*40,84);
  ctx.save();ctx.beginPath();ctx.rect(x0+4,12,72,88);ctx.clip();const g=ctx.createLinearGradient(0,12,0,100);g.addColorStop(0,shade(h.fx,-90));g.addColorStop(1,'#1a0a04');ctx.fillStyle=g;ctx.fillRect(x0+4,12,72,88);
  renderModel(ctx,p.look,{armL:-.35,armR:.1,wAng:-2.5,legL:0,legR:0,head:0,cape:.1},x0+42,186,1.5,1,p.dead?{tint:'rgba(0,0,0,.6)'}:{});ctx.restore();ctx.strokeStyle='#d4af37';ctx.strokeRect(x0+4,12,72,88);
  const bx=x0+86,bw=pw-100;
  if(two)txt(`${p.idx+1}P`,bx,22,15,PCOL[p.idx],'left',MONO);
  txt(h.name,bx+(two?30:0),22,17,'#ffe8a8','left');txt(`Lv.${s.lvl}`,bx+(two?84:58),22,13,'#9fe0ff','left');
  txt(`목숨×${s.lives}`,bx+(two?134:118),22,12,'#ffb0a0','left');
  if((s.rpg.statPts||s.rpg.skillPts)&&(frame>>4)%2)txt(`▲${kn(p.idx).menu}`,bx+(two?196:176),22,11,'#70ff90','left',MONO);
  if(p.out||p.waiting){
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(bx,32,bw,48);
    if(p.waiting)txt(`CONTINUE? ${Math.max(0,Math.ceil(p.contT/60)-1)}`,bx+bw/2,48,20,'#ffe060','center',MONO,['#000',4]);
    else txt('GAME OVER',bx+bw/2,48,18,'#c04040','center',MONO);
    if((frame>>4)%2)txt(`공격 키로 ${p.waiting?'계속':'재참가'}`,bx+bw/2,70,13,'#fff');
  }else{
    bar(bx,31,bw,12,p.hp,p.maxhp,'#ffe060','#d03020');txt(`${Math.ceil(p.hp)}/${p.maxhp}`,bx+bw/2,37,10,'#fff','center',MONO,['#000',3]);
    const mw=bw-54;
    bar(bx,47,mw,8,p.mana,p.maxmana,'#a8d4ff','#2040b0');txt(`내공 ${Math.floor(p.mana)}`,bx+mw+5,51,10,'#9ac8ff','left');
    const ok=p.mp>=spCost(p);bar(bx,59,mw,8,p.mp,p.maxki,ok?'#fff0b0':'#ffb060','#a05010');
    if(ok&&(frame>>3)%2){ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(bx,59,mw*p.mp/p.maxki,8)}
    txt(ok?'필살OK':`기력 ${Math.floor(p.mp)}`,bx+mw+5,63,10,ok?'#fff0b0':'#c8a070','left');
    bar(bx,71,bw,5,s.lvl>=MAXLV?1:s.exp,s.lvl>=MAXLV?1:expNeed(s.lvl),'#c0ff9a','#408020');
  }
  txt(String(s.score).padStart(8,'0'),x0+pw-8,two?92:22,two?11:15,'#fff','right',MONO,['#000',3]);
  const msp=!p.out&&mythSpOf(p);if(msp){const cd=p.mspCd||0;txt(cd>0?`신화 ${Math.ceil(cd/60)}s`:`신화 ↑+필살`,x0+pw-8,two?78:84,10,cd>0?'#888':MYTH_SP[msp].col,'right',FONT,['#000',3])}
}
function drawCombo(p,x,al){
  if(!p.hitCnt||p.hitCnt<3||Wd.t-p.hitT>120||p.out)return;
  const n=p.hitCnt,age=Wd.t-p.hitT,sc=age<6?1.35-age*.06:1,fade=age>90?(120-age)/30:1,col=n>=100?'#ff4a4a':n>=50?'#ff9a30':n>=25?'#ffe060':'#ffffff';
  ctx.save();ctx.globalAlpha=fade;ctx.translate(x,212);ctx.scale(sc,sc);
  txt(String(n),0,0,52,col,al,MONO,[shade(p.h.fx,-120),8]);txt('HITS',al==='right'?0:0,34,20,p.h.fx,al,FONT,['#000',5]);
  ctx.restore();
  if(p.comboMsg&&Wd.t-p.comboMsg.t<70){const a=1-(Wd.t-p.comboMsg.t)/70;ctx.globalAlpha=a;txt(p.comboMsg.txt,x,272,22,'#ffe890',al,FONT,['#600',6]);ctx.globalAlpha=1}
  ctx.globalAlpha=1;
}
function drawHUD(){
  const w=Wd;
  if(G.np===2){drawCombo(w.ps[0],24,'left');drawCombo(w.ps[1],W-24,'right')}else drawCombo(w.ps[0],W-24,'right');
  if(G.np===2){drawPanel(w.ps[0],8);drawPanel(w.ps[1],W-358)}
  else drawPanel(w.ps[0],8);
  const tx=G.np===2?W/2:W-16,ta=G.np===2?'center':'right';
  txt(w.S.title,tx,G.np===2?20:22,16,'#ffe8a8',ta,FONT,['#000',4]);
  txt(`${D().name} · 적 Lv.${w.lv}${G.cycle?' · '+cycleName(G.cycle):''}`,tx,G.np===2?42:44,12,D().col,ta,FONT,['#000',3]);
  const ty=G.np===2?70:70,tx0=G.np===2?W/2-30:W-78;
  [['book','書'],['seal','璽'],['sword','劍'],['horse','馬']].forEach(([k,c],i)=>{const x=tx0+i*18;ctx.fillStyle=G.treasures[k]?(i>2?'#e04a30':'#e0b030'):'rgba(40,40,40,.8)';ctx.fillRect(x-7,ty-8,15,16);txt(c,x+.5,ty,11,G.treasures[k]?'#fff':'#666','center',HANJA)});
  const b=w.enemies.find(e=>e.boss&&!e.dead);
  if(b){ctx.fillStyle='rgba(10,5,0,.7)';ctx.fillRect(W/2-280,H-46,560,36);ctx.strokeStyle='#8a2020';ctx.strokeRect(W/2-280,H-46,560,36);
    txt(b.name,W/2-266,H-28,18,'#ffd0a0','left',FONT,['#000',3]);bar(W/2-196,H-37,460,16,b.hp,b.maxhp,'#ff7050','#901010')}
}
function drawPlay(){
  if(window.hd2dBegin)hd2dBegin();
  const w=Wd,cx=Math.round(w.camX);
  ctx.save();
  if(w.shake>0){w.shake--;ctx.translate(Math.round(rnd(-2,2))*3,Math.round(rnd(-1,1))*3)}
  drawPixelBG(cx,w.t);
  for(const z of w.hz)if(z.t<z.delay||z.kind==='slam')drawHz(z,cx);
  for(const f of w.fx)if(f.type==='bagua'||f.type==='crack'||f.type==='rune'||(f.type==='ring'&&!f.z))drawFx(f,cx);
  drawBattleUnder(cx);
  const list=[];
  for(const pr of w.props)list.push([pr.y,()=>drawProp(pr,pr.x-cx)]);
  for(const it of w.items)if(ITEMS[it.kind].treasure||it.keep||it.t<900||(it.t>>3)%2)list.push([it.y,()=>{ctx.fillStyle='rgba(0,0,0,.3)';ell(it.x-cx,it.y,14,4);
    if(it.kind==='gear'||it.kind==='coin'||it.kind==='mat')drawGroundRpg(it,it.x-cx,it.y-it.z-4);else drawItemIcon(it.kind,it.x-cx,it.y-it.z-4+(ITEMS[it.kind].treasure?Math.sin(w.t*.1)*3:0),w.t)}]);
  for(const a of w.allies)list.push([a.y,()=>drawAlly(a,cx)]);
  if(w.escort)list.push([w.escort.y,()=>drawEscort(w.escort,cx)]);
  for(const e of w.enemies)list.push([e.y,()=>drawEnt(e,cx)]);
  for(const p of w.ps)list.push([p.y,()=>drawEnt(p,cx)]);
  for(const o of w.proj)list.push([o.y,()=>{ctx.fillStyle='rgba(0,0,0,.2)';ell(o.x-cx,o.y,12,3);drawProj(o,cx)}]);
  for(const f of w.fx)if(f.type==='after'||f.type==='debris')list.push([f.y-1,()=>drawFx(f,cx)]);
  list.sort((a,b)=>a[0]-b[0]);for(const d of list)d[1]();
  for(const z of w.hz)if(z.t>=z.delay&&z.kind!=='slam')drawHz(z,cx);
  drawParticleLayers(cx);
  drawBattleOver(cx);
  for(const f of w.fx)if(!['after','debris','bagua','crack','rune'].includes(f.type)&&!(f.type==='ring'&&!f.z))drawFx(f,cx);
  if(w.S.tint){ctx.fillStyle=w.S.tint;ctx.fillRect(0,0,W,H)}
  if(w.S.rain!==false&&(w.S.bg==='pass'||w.S.rain)){ctx.strokeStyle='rgba(200,210,230,.35)';ctx.lineWidth=2;for(let i=0;i<80;i++){const x=(hash(i)*W+w.t*3)%W,y=(hash(i+9)*H+w.t*14)%H;line(x,y,x-4,y+18)}}
  if(w.S.bg==='night'||w.S.bg==='redcliff'){const g=ctx.createRadialGradient(W/2,H/2,220,W/2,H/2,620);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,20,.45)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
  if(w.speed>0){ctx.strokeStyle=`rgba(255,255,255,${w.speed/60})`;ctx.lineWidth=2;for(let i=0;i<30;i++){const y=hash(i+frame)*H,x=hash(i*3+frame)*W;line(x,y,x-(w.speedDir||1)*180,y)}}
  ctx.restore();
  if(w.flashT>0){ctx.fillStyle=`rgba(${w.flashCol},${Math.min(.8,w.flashT/25)})`;ctx.fillRect(0,0,W,H);if(w.flashT<=1)w.flashCol='255,255,255'}
  if(window.hd2dSplit)hd2dSplit();
  drawHUD();drawBattleHUD();drawStageHUD();
  if(w.go>0&&(w.go>>4)%2===0)txt('GO ▶',W-90,H/2-40,42,'#ffe060','center',FONT,['#600',6]);
  if(w.banner>0){const a=Math.min(1,w.banner/40,(200-w.banner)/30);ctx.globalAlpha=a;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,H/2-60,W,110);
    txt(w.S.title,W/2,H/2-22,44,'#ffe08a','center',FONT,['#5a1a00',6]);txt(w.S.sub,W/2,H/2+26,22,'#fff');ctx.globalAlpha=1}
  if(w.bossBanner){const bb=w.bossBanner,a=Math.min(1,bb.t/20,(200-bb.t)/30);ctx.globalAlpha=a;
    ctx.fillStyle='rgba(80,0,0,.8)';ctx.fillRect(0,118,W,110);
    ctx.save();ctx.beginPath();ctx.rect(0,118,W,110);ctx.clip();renderModel(ctx,bb.look,{armL:-2.6,wAng:-2.9,armR:-.5,legL:-.3,legR:.3,head:-.1,cape:.4},140,400,2.6,1,{});ctx.restore();
    txt(bb.title,W/2+60,142,18,'#ffd0a0');txt(bb.name,W/2+60,174,42,'#fff','center',FONT,['#300',6]);txt(bb.line,W/2+60,208,16,'#ffe8c8');ctx.globalAlpha=1}
  if(w.msg){const m=w.msg,a=Math.min(1,m.t/15,(m.life-m.t)/30);ctx.globalAlpha=a;
    if(m.big){ctx.fillStyle='rgba(20,10,0,.88)';ctx.fillRect(W/2-300,H/2-70,600,120);ctx.strokeStyle='#e0b030';ctx.lineWidth=3;ctx.strokeRect(W/2-300,H/2-70,600,120);
      txt('◆ 숨겨진 보물 발견 ◆',W/2,H/2-45,16,'#ffb050');txt(m.txt,W/2,H/2-10,28,'#ffe08a','center',FONT,['#000',5]);txt(m.sub,W/2,H/2+28,16,'#fff')}
    else txt(m.txt,W/2,150,22,'#ffe8a8','center',FONT,['#000',5]);
    ctx.globalAlpha=1}
  if(w.clear>60&&w.clear<220){const a=Math.min(1,(220-w.clear)/30);ctx.globalAlpha=a;txt('STAGE CLEAR',W/2,H/2-40,60,'#ffe060','center',FONT,['#600',8]);if(w.clear>100)txt(`시간 보너스  ${w.timeBonus}`,W/2,H/2+20,22,'#fff','center',FONT,['#000',4]);ctx.globalAlpha=1}
  else if(w.clear>=220)txt('STAGE CLEAR',W/2,150,26,'#ffe060','center',FONT,['#600',5]);
  if(w.clear>90){const left=w.items.filter(i=>!i.gone&&(i.kind==='gear'||i.kind==='coin'||i.kind==='mat'||ITEMS[i.kind].treasure)).length,nx=G.stage===ORDER[LAST_ORD]||G.stage===5?'결말로':G.stage===4&&!(G.flags&&G.flags.hy)?'조조의 운명':'군영으로';
    ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(W/2-300,H-96,600,40);ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(W/2-300,H-96,600,40);
    txt(left?`떨어진 전리품 ${left}개 — 주운 뒤 진행하세요 (Tab: 장비 정리)`:'전리품을 모두 챙겼습니다',W/2,H-84,13,left?'#ffe8a8':'#b0ffb0');
    if((frame>>4)%2)txt(`ENTER ▶ ${nx}${left?' (남은 전리품 자동 획득)':''}`,W/2,H-66,14,'#ffd24a')}
  if(w.cine&&!w.cutin)drawCine(w.cine);
  if(w.sflash)drawSuperFlash(w.sflash,cx);
  if(w.cutin)drawCutin(w.cutin);
  if(paused){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,W,H);txt('일시정지',W/2,150,40,'#fff');
    drawCmdTable(W/2-230,180,460);
    txt(w.ps.filter(p=>!p.out).map(p=>`${p.h.name}: ↓→+공격 「${p.h.cmd.name}」 · 필살 「${p.h.spName}」`).join('   /   '),W/2,428,15,'#ffe8a8','center',FONT,['#000',3]);
    txt('P / ESC 로 계속   ·   Tab: 캐릭터 창 (장비 · 스킬 · 저장)',W/2,462,16,'#ccc')}
}

/* ---------- 타이틀 · 메뉴 ---------- */
const MENU=['start','load','np','diff','bgm','voice','help'];
function updTitle(){
  if(hit('up')){menuIdx=(menuIdx+MENU.length-1)%MENU.length;sfx('sel')}
  if(hit('down')){menuIdx=(menuIdx+1)%MENU.length;sfx('sel')}
  const m=MENU[menuIdx],lr=hit('left')?-1:hit('right')?1:0,ok=hit('start')||hit('atk');
  if(m==='np'&&(lr||ok)){numPlayers=numPlayers===1?2:1;store.set('kov_np',numPlayers);sfx('sel')}
  if(m==='diff'&&(lr||ok)){diffIdx=(diffIdx+(lr||1)+4)%4;store.set('kov_diff',diffIdx);sfx('sel')}
  if(m==='bgm'&&(lr||ok)){toggleBGM();sfx('sel')}
  if(m==='voice'&&(lr||ok)){toggleVoice();sfx('sel');if(VOICE.on)say('삼국전기!',VPROF.guan)}
  if(ok&&m==='start'){sfx('ok');scene='select';selT=30*60;sel[0].ok=false;sel[1].ok=numPlayers===1;G=null}
  if(ok&&m==='help'){sfx('ok');scene='help'}
  if(ok&&m==='load'){sfx('ok');openSlots('load','title')}
  if(Math.random()<.7)titleFx.push({x:rnd(0,W),y:H+10,vy:rnd(-3,-1),vx:rnd(-.5,.5),t:0,life:rnd(80,180)});
  for(const q of titleFx){q.t++;q.x+=q.vx;q.y+=q.vy}
  for(let i=titleFx.length-1;i>=0;i--)if(titleFx[i].t>titleFx[i].life)titleFx.splice(i,1);
}
function drawTitle(){
  if(!BG||BG.kind!=='fortress')buildBG('fortress');
  drawPixelBG(frame*1.5,frame);
  ctx.fillStyle='rgba(20,0,0,.45)';ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='lighter';for(const q of titleFx){ctx.globalAlpha=1-q.t/q.life;ctx.fillStyle='#ff9040';ctx.fillRect(Math.round(q.x/3)*3,Math.round(q.y/3)*3,3,3)}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const vis=HEROES.filter(h=>!h.hidden||unlockLubu);
  vis.forEach((h,i)=>{const n=vis.length,x=W/2+(i-(n-1)/2)*(W/(n+.5)),f=i<n/2?1:-1;
    renderModel(ctx,h.look,poseOf({look:h.look,state:'idle',anim:frame+i*20,t:0,h}),x,H-18,1.25,f,{})});
  const sc=1+Math.sin(frame*.03)*.02;ctx.save();ctx.translate(W/2,108);ctx.scale(sc,sc);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.4;ctx.drawImage(glowSpr('#ff6020'),-380,-110,760,220);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  txt('三國戰紀',0,0,108,'#ffd24a','center',HANJA,['#3a0a00',14]);ctx.restore();
  txt('삼  국  전  기',W/2,188,26,'#fff','center',FONT,['#3a0a00',6]);
  txt('KNIGHTS OF VALOUR  ·  RPG EDITION',W/2,216,13,'#ffc890');
  const my=242,gp=28;
  MENU.forEach((m,i)=>{const y=my+i*gp,s=i===menuIdx;
    ctx.fillStyle=s?'rgba(120,20,10,.85)':'rgba(0,0,0,.55)';ctx.fillRect(W/2-150,y-12,300,24);if(s){ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;ctx.strokeRect(W/2-150,y-12,300,24)}
    const label={start:'새로 시작',load:'이어하기 (불러오기)',np:`플레이 인원  ◀ ${numPlayers}P ▶`,diff:`난이도  ◀ ${D().name} ▶`,bgm:`BGM  ◀ ${MUS.on?'켜짐':'꺼짐'} ▶`,voice:`음성  ◀ ${VOICE.on?'켜짐':'꺼짐'} ▶`,help:'조작 · 커맨드 안내'}[m];
    txt(label,W/2,y,16,s?(m==='diff'?D().col:'#fff'):'#b8a080');
    if(s&&(frame>>4)%2)txt('▶',W/2-135,y,13,'#ffd24a')});
  const dy2=my+MENU.length*gp;
  if(MENU[menuIdx]==='diff')txt(D().desc,W/2,dy2,14,D().col,'center',FONT,['#000',4]);
  if(MENU[menuIdx]==='load')txt('저장된 기록(슬롯 3개 + 자동 저장)에서 이어 합니다',W/2,dy2,14,'#ffe8a8','center',FONT,['#000',4]);
  if(MENU[menuIdx]==='np')txt(numPlayers===2?'한 키보드로 둘이 함께 — 적이 더 많고 강해집니다':'혼자서 천하를 평정하라',W/2,dy2,14,'#ffe8a8','center',FONT,['#000',4]);
  if(MENU[menuIdx]==='voice')txt(VOICE.ko||!window.speechSynthesis?'기술 이름 외침(TTS) · 기합 · 비명':'한국어 TTS 음성이 없어 기합 소리만 나옵니다',W/2,dy2,14,'#ffe8a8','center',FONT,['#000',4]);
  txt('※ 팬메이드 오마주 · 원작 三國戰紀 © IGS',W-10,12,11,'rgba(255,255,255,.5)','right');
}
let helpPage=0;
function updHelp(){if(hit('left')){helpPage=(helpPage+2)%3;sfx('sel')}if(hit('right')){helpPage=(helpPage+1)%3;sfx('sel')}if(hit('start')||hit('pause')){scene='title';helpPage=0;sfx('sel')}}
function drawCmdTable(x,y,w){
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x,y,w,228);ctx.strokeStyle='#b8902a';ctx.lineWidth=2;ctx.strokeRect(x,y,w,228);
  txt('커맨드 기술',x+w/2,y+20,18,'#ffd24a');
  CMDLIST.forEach(([c,n,cost],i)=>{const yy=y+48+i*25;txt(c,x+22,yy,16,'#fff','left',FONT);txt(n,x+w*.48,yy,15,'#ffe8a8','left');txt(cost,x+w-18,yy,13,'#8ad0ff','right')});
}
function drawHelp(){
  ctx.fillStyle='#0c0604';ctx.fillRect(0,0,W,H);
  txt(['조 작 안 내','커 맨 드 · 아 이 템','R P G 시 스 템'][helpPage],W/2,34,28,'#ffd24a','center',FONT,['#300',6]);
  txt(`◀ ${helpPage+1} / 3 ▶`,W-24,34,14,'#aaa','right',MONO);
  if(!helpPage){
    const cols=[['1인 플레이',['이동','방향키 / WASD'],['공격','Z · J · F'],['점프','X · K · G'],['필살기','C · L · H'],['아이템 사용','V · U · R'],['아이템 전환','E · Q · I']],
      ['2인 — 1P',['이동','W A S D'],['공격','F  (J, Z)'],['점프','G  (K, X)'],['필살기','H  (L, C)'],['아이템 사용','R  (U, V)'],['아이템 전환','E  (Q, I)']],
      ['2인 — 2P',['이동','방향키'],['공격',',  (넘패드 1)'],['점프','.  (넘패드 2)'],['필살기','/  (넘패드 3)'],['아이템 사용','M  (넘패드 0)'],['아이템 전환',';  (넘패드 +)']]];
    cols.forEach((c,ci)=>{const x=170+ci*310;ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(x-145,58,290,266);ctx.strokeStyle=ci===0?'#b8902a':PCOL[ci-1];ctx.strokeRect(x-145,58,290,266);
      txt(c[0],x,80,18,ci===0?'#ffd24a':PCOL[ci-1]);
      c.slice(1).forEach(([a,b],i)=>{txt(a,x-38,116+i*34,15,'#ffe8a8','right');txt(b,x-22,116+i*34,15,'#fff','left')})});
    txt('공통 — 일시정지: P / ESC   ·   BGM: N   ·   음성: B',W/2,350,15,'#e8d8c8');
    txt('필살기: 기력 50 소모 (부족하면 체력 10%) · 발동 중 무적 · 컷인 연출 · 기술명 음성',W/2,378,15,'#e8d8c8');
    txt('2인: 쓰러진 뒤 목숨이 없으면 10초 안에 자기 공격 키로 이어하기 (탈락 후에도 재참가 가능)',W/2,406,15,'#e8d8c8');
    txt('숨겨진 보물 3개를 모으면 비장(秘章)이 열린다고 한다...',W/2,446,15,'#ff9a70');
  }else if(helpPage===2){drawRpgHelp()}else{
    drawCmdTable(30,58,440);
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(490,58,440,228);ctx.strokeStyle='#b8902a';ctx.strokeRect(490,58,440,228);
    txt('무장별 전용기 (↓ → + 공격)',710,78,18,'#ffd24a');
    HEROES.forEach((h,i)=>{const x=510+(i%2)*215,y=108+Math.floor(i/2)*34;txt(selectable(i)?h.name:'???',x,y,15,h.fx,'left');txt(selectable(i)?h.cmd.name:'???',x+62,y,15,'#fff','left')});
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(30,298,900,190);ctx.strokeStyle='#b8902a';ctx.strokeRect(30,298,900,190);
    txt('사용 아이템 (주워서 보관 → 아이템 키로 사용, 전환 키로 선택)',W/2,318,17,'#ffd24a');
    Object.entries(ITEMS).filter(([k,v])=>v.use).forEach(([k,v],i)=>{const x=60+(i%2)*440,y=352+Math.floor(i/2)*34;
      ctx.save();ctx.translate(x,y+10);ctx.scale(.8,.8);drawItemIcon(k,0,0,frame);ctx.restore();txt(v.name,x+22,y,15,'#ffe890','left');txt(v.desc,x+100,y,14,'#e8d8c8','left')});
  }
  txt('←→ 페이지   ENTER 돌아가기',W/2,H-18,14,'#aaa');
}

/* ---------- 무장 선택 ---------- */
function selectable(i){return !HEROES[i].hidden||unlockLubu}
function updSelect(){
  selT--;
  const n=HEROES.length,two=numPlayers===2;
  if(!unlockLubu&&keyHist.length>=8&&SECRET.every((k,i)=>keyHist[keyHist.length-8+i]===k)){unlockLubu=true;store.set('kov_lubu','1');keyHist.length=0;sfx('treasure');selFlash=40}
  for(let i=0;i<(two?2:1);i++){
    const S=sel[i];
    const L=two?PP[i]:pressed,take=k=>{if(L[k]){L[k]=false;return true}return false};
    if(S.ok){if(take('jump'))S.ok=false;continue}
    if(take('left')){S.idx=(S.idx+n-1)%n;sfx('sel')}
    if(take('right')){S.idx=(S.idx+1)%n;sfx('sel')}
    const conf=take('atk')||(i===0&&hit('start'))||selT<=0;
    if(conf){if(!selectable(S.idx)){if(selT<=0)S.idx=i?2:0;else{sfx('hurt');continue}}S.ok=true;sfx('ok')}
  }
  if(sel[0].ok&&(!two||sel[1].ok)){newGame(two?[sel[0].idx,sel[1].idx]:[sel[0].idx]);return}
  if(hit('pause'))scene='title';
}
function drawSelect(){
  const two=numPlayers===2;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0808');g.addColorStop(1,'#3a1208');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  txt('무 장 선 택',W/2,28,28,'#ffd24a','center',FONT,['#300',6]);
  txt(`SELECT  ${Math.max(0,Math.ceil(selT/60))}`,W-20,28,18,'#fff','right',MONO);
  txt(`${numPlayers}P · ${D().name}`,20,28,15,D().col,'left');
  const n=HEROES.length,gap=6,cw=Math.min(98,Math.floor((W-30)/n)-gap),x0=(W-(n*cw+(n-1)*gap))/2;
  HEROES.forEach((h,i)=>{const x=x0+i*(cw+gap),y=52,ok=selectable(i);
    const on=[0,1].filter(k=>(k===0||two)&&sel[k].idx===i);
    const bg=ctx.createLinearGradient(0,y,0,y+176);bg.addColorStop(0,on.length?shade(h.fx,-110):'#241008');bg.addColorStop(1,'#120604');ctx.fillStyle=bg;ctx.fillRect(x,y,cw,176);
    ctx.strokeStyle=on.length?(two?PCOL[on[0]]:'#ffd24a'):'#6a4a2a';ctx.lineWidth=on.length?3:1.5;ctx.strokeRect(x,y,cw,176);
    if(on.length===2){ctx.strokeStyle=PCOL[1];ctx.strokeRect(x+4,y+4,cw-8,168)}
    ctx.save();ctx.beginPath();ctx.rect(x,y,cw,176);ctx.clip();
    renderModel(ctx,h.look,poseOf({look:h.look,state:on.length&&(frame%90)<18?'attack':'idle',combo:1,anim:frame+i*9,t:frame%90,h}),x+cw/2,y+166,1.1,1,ok?{}:{tint:'rgba(0,0,0,.92)'});
    ctx.restore();
    if(!ok)txt('?',x+cw/2,y+88,48,'#8a6a4a','center',FONT,['#000',5]);
    txt(ok?h.name:'???',x+cw/2,y+192,17,on.length?'#ffe8a8':'#aa8866','center',FONT,['#000',4]);
    on.forEach(k=>{if((frame>>4)%2||sel[k].ok)txt(two?`${k+1}P${sel[k].ok?' ✔':''}`:'▼',x+cw/2+(on.length===2?(k?22:-22):0),y-7,13,two?PCOL[k]:'#ffd24a','center',MONO,['#000',3])});
  });
  const panels=two?[0,1]:[0];
  panels.forEach(k=>{
    const h=HEROES[sel[k].idx],ok=selectable(sel[k].idx),px=two?30+k*460:30,pw=two?440:W-60,py=262,ph=262;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(px,py,pw,ph);ctx.strokeStyle=two?PCOL[k]:'#b8902a';ctx.lineWidth=2;ctx.strokeRect(px,py,pw,ph);
    const mw=two?160:220;
    ctx.save();ctx.beginPath();ctx.rect(px+2,py+2,mw,ph-4);ctx.clip();
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;ctx.drawImage(glowSpr(h.fx),px+10,py+30,mw-20,ph-40);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    const turn=poseOf({look:h.look,state:sel[k].ok?'win':'idle',anim:frame,t:0,h});turn.spin=Math.sin(frame*.02+k)*.7;
    renderModel(ctx,h.look,turn,px+mw/2+2,py+ph-12,(two?1.5:1.95)*(h.id==='lubu'?.88:1),1,ok?{}:{tint:'rgba(0,0,0,.92)'});ctx.restore();
    const tx=px+mw+14;
    if(!ok){txt('???',tx,py+50,30,'#aa8866','left');txt('숨겨진 무장입니다.',tx,py+100,16,'#e8d8c8','left');txt('진 엔딩을 보거나...',tx,py+130,15,'#ff9a70','left');txt('전설의 커맨드를 입력하라.',tx,py+156,15,'#ff9a70','left');return}
    txt(`${h.name}  ${h.zi!=='—'?h.zi:''}`,tx,py+32,two?24:30,'#ffe08a','left');if(!two)txt(`「${h.title}」`,tx+170,py+32,18,'#ffc890','left');
    txt(`무기: ${h.weapon}`,tx,py+66,15,'#fff','left');txt(`필살기: ${h.spName}`,tx+(two?0:200),py+(two?90:66),15,h.fx,'left');
    if(two)txt(`커맨드: ↓→+공격 「${h.cmd.name}」`,tx,py+116,14,'#ffe890','left');
    else{h.desc.forEach((d,i)=>txt(d,tx,py+96+i*25,15,'#e8d8c8','left'));txt(`커맨드: ↓→+공격 「${h.cmd.name}」`,tx,py+176,15,'#ffe890','left')}
    const st=[['체력',h.hp/150],['공격',h.pow/17],['속도',h.spd/4.3],['사거리',h.reach/106]];
    st.forEach(([nm,v],i)=>{const x=two?tx:tx+(i%2)*320,y=two?py+146+i*26:py+210+Math.floor(i/2)*26;txt(nm,x,y,13,'#ffd8a8','left');bar(x+50,y-6,two?190:220,12,v,1,'#ffe060','#d06020')});
    if(sel[k].ok){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(px,py,pw,ph);txt('준비 완료!',px+pw/2,py+ph/2,34,two?PCOL[k]:'#ffd24a','center',FONT,['#000',6]);txt('점프 키로 취소',px+pw/2,py+ph/2+36,13,'#ddd')}
  });
  txt(two?'1P: A/D 이동 · F 결정   |   2P: ←/→ 이동 · , 결정':'←→ 선택   ENTER / 공격 키 결정',W/2,H-6,12,'#aaa');
  if(selFlash>0){selFlash--;ctx.fillStyle=`rgba(255,80,60,${selFlash/60})`;ctx.fillRect(0,0,W,H)}
}

/* ---------- 스토리 · 컨티뉴 ---------- */
function updStory(){
  story.t++;
  const total=story.lines.join('').length;
  if(hit('start')||hit('atk')){if(story.t*.7<total+10)story.t=99999;else{sfx('ok');const n=story.next;story=null;n()}}
}
function drawStory(){
  ctx.fillStyle=story.hidden?'#05060f':'#0c0604';ctx.fillRect(0,0,W,H);
  if(story.hidden)for(let i=0;i<90;i++){ctx.fillStyle=`rgba(255,255,255,${.3+.5*Math.abs(Math.sin(frame*.03+i))})`;ctx.fillRect(Math.round(hash(i)*W/3)*3,Math.round(hash(i+50)*H/3)*3,3,3)}
  const px=90,py=60,pw=W-180,ph=H-120;
  ctx.fillStyle='#e9dcb8';ctx.fillRect(px,py,pw,ph);
  for(let i=0;i<260;i++){ctx.fillStyle='rgba(120,80,30,.08)';ctx.fillRect(px+Math.round(hash(i)*pw/3)*3,py+Math.round(hash(i*3)*ph/3)*3,3,3)}
  ctx.fillStyle='#6b3b1a';ctx.fillRect(px-14,py-10,pw+28,14);ctx.fillRect(px-14,py+ph-4,pw+28,14);
  ctx.strokeStyle='rgba(120,70,30,.4)';ctx.lineWidth=2;ctx.strokeRect(px+10,py+10,pw-20,ph-20);
  txt(story.title,W/2,py+42,30,'#5a1a08','center',FONT);
  const gap=story.lines.length>7?34:40;
  let chars=Math.floor(story.t*.7);
  story.lines.forEach((l,i)=>{if(chars<=0)return;const s=l.slice(0,chars);chars-=l.length;
    const col=l.startsWith('★')?'#c01860':l.startsWith('—')?'#8a3a1a':l.startsWith('【')?'#a01818':(l.startsWith('"')||/^[가-힣]+: "/.test(l)||/^[가-힣]+은 |^[가-힣]+는 /.test(l)&&l.includes('"'))?'#2a2a6a':'#2a1a0a';
    txt(s,W/2,py+94+i*gap,l.startsWith('【')||l.startsWith('★')?20:17,col,'center',FONT)});
  if((frame>>4)%2)txt('ENTER ▶',px+pw-20,py+ph-24,15,'#6b3b1a','right');
  if(story.end&&G){const sc=G.np===2?`1P ${G.pl[0].score}  ·  2P ${G.pl[1].score}`:`최종 점수 ${totalScore()}`;
    txt(`${sc}   ·   난이도 ${DIFFS[G.diffIdx].name}   ·   컨티뉴 ${G.pl.reduce((a,s)=>a+s.cont,0)}회`,W/2,H-22,16,'#ffe8a8')}
}
function updCont(){
  contT--;if(hit('atk'))contT-=40;
  if(hit('start')){sfx('ok');const p=Wd.ps[0];p.ps.lives=Math.max(1,D().lives);p.ps.cont++;revive(p);scene='play';return}
  if(contT<=0){scene='gameover';contT=240}
}
function drawCont(){
  drawPlay();ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,W,H);
  txt('CONTINUE ?',W/2,H/2-60,56,'#ffe060','center',FONT,['#600',8]);
  txt(String(Math.max(0,Math.ceil(contT/60)-1)),W/2,H/2+30,90,'#fff','center',MONO,['#000',8]);
  txt('ENTER: 계속   공격 키: 카운트 가속',W/2,H/2+110,18,'#ccc');
}
function updOver(){contT--;if(contT<=0||hit('start')){if(G&&G.pl){let lost=0;for(const s of G.pl){const l=Math.floor(s.rpg.gold*.1);s.rpg.gold-=l;lost+=l}toCamp(`패전... 군영으로 후퇴했다. (금화 ${lost} 손실 · 경험치와 장비는 유지)`)}else scene='title'}}
function drawOver(){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);txt('GAME OVER',W/2,H/2-20,64,'#c02020','center',FONT,['#300',8]);
  txt(G.np===2?`1P ${G.pl[0].score}   ·   2P ${G.pl[1].score}`:`점수 ${totalScore()}`,W/2,H/2+50,22,'#fff');
  txt('군영으로 후퇴합니다 — 레벨 · 장비 · 스킬은 유지됩니다 (ENTER)',W/2,H/2+100,15,'#ccc')}

/* ---------- BGM 선택 ---------- */
function musicFor(){
  switch(scene){
    case'title':case'help':return'title';
    case'select':return'select';
    case'story':return story&&story.end?'ending':'story';
    case'play':{if(Wd.clear>1)return'clear';if(Wd.enemies.some(e=>e.boss&&!e.mid&&!e.dead))return'boss';return'st'+(Wd.S.mus!=null?Wd.S.mus:G.stage)}
    case'menu':if(MN&&MN.back==='play'&&Wd){if(Wd.enemies.some(e=>e.boss&&!e.mid&&!e.dead))return'boss';return'st'+(Wd.S.mus!=null?Wd.S.mus:G.stage)}return'story';
    case'camp':case'shop':case'gacha':case'choice':return'story';
    case'slots':return SL&&SL.back==='title'?'title':'story';
    default:return'cont';
  }
}

/* ---------- 메인 루프 ---------- */
function step(){
  frame++;
  if(hit('bgm'))toggleBGM();
  if(hit('voice'))toggleVoice();
  setBGM(musicFor());
  if(hitstop>0&&scene==='play'){hitstop--;return}
  switch(scene){case'title':updTitle();break;case'help':updHelp();break;case'select':updSelect();break;case'story':updStory();break;case'play':updPlay();break;
    case'continue':updCont();break;case'gameover':updOver();break;
    case'menu':updMenu();break;case'choice':updChoice();break;case'camp':updCamp();break;case'shop':updShop();break;case'slots':updSlots();break;case'gacha':updGacha();break}
  clearPressed();
}
function render(){
  ctx.setTransform(PR,0,0,PR,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;
  switch(scene){case'title':drawTitle();break;case'help':drawHelp();break;case'select':drawSelect();break;case'story':drawStory();break;case'play':drawPlay();break;
    case'continue':drawCont();break;case'gameover':drawOver();break;
    case'menu':drawMenu();break;case'choice':drawChoice();break;case'camp':drawCamp();break;case'shop':drawShop();break;case'slots':drawSlots();break;case'gacha':drawGacha();break}
  drawCheat();
}
let last=performance.now(),acc=0;
function loop(now){acc+=Math.min(100,now-last);last=now;while(acc>=1000/60){step();acc-=1000/60}render();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
