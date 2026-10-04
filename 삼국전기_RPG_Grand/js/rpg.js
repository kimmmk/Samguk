'use strict';
/* ===== RPG 시스템: 성장 · 능력치 · 스킬 · 상태이상 · 장비 · 드랍 · 소환 · 저장 ===== */

/* ---------- 성장 곡선 · 적 레벨 ---------- */
const expNeed=l=>Math.round(40*l+10*l*l+.9*l*l*l);
const expScale=L=>expNeed(L)/150*(L>60?Math.max(.35,1-(L-60)/60):1);
/* 적 체력 · 공격력 성장 (그랑풍 난이도 조정: 초반은 조금 단단하게, 후반 공격력 급증 완화) */
const hpMul=L=>1.6+(L-1)*.30+(L-1)*(L-1)*.0045;
const powMul=L=>1.15+(L-1)*.16+(L-1)*(L-1)*.0022;
const cycMul=()=>G.cycle>=3?1+.3*(G.cycle-2):1;
const stageLv=()=>Math.min(MAXLV,STAGE_LV[G.stage]+G.cycle*33);
const pick=a=>a[(Math.random()*a.length)|0];
function wpick(o){let s=0;for(const k in o)s+=o[k];let r=Math.random()*s;for(const k in o){r-=o[k];if(r<=0)return k}return Object.keys(o)[0]}
function hexA(h,a){const c=parseInt(h.slice(1),16);return `rgba(${c>>16},${(c>>8)&255},${c&255},${a})`}
function hudTxt(p,t,col,size){Wd.fx.push({type:'text',x:p.x,y:p.y,z:124,t:0,life:36,txt:t,col:col||'#aaa',size:size||15})}

/* ---------- 캐릭터 생성 ---------- */
function newRpg(hi){
  const h=HEROES[hi],a=HATTR[h.id];
  const r={str:a[0],dex:a[1],vit:a[2],ene:a[3],statPts:0,skillPts:1,sk:{},enh:{},hot:[null,null,null,null],eq:{},bag:[],mats:{stone:0,frag:0},gold:0,books:0};
  r.sk[h.id+'_00']=1;
  r.eq.weapon=finishItem({s:'weapon',g:'normal',il:1,rq:1,b:'낡은 '+h.weapon,at:{atk:4},af:[],e:0});
  r.eq.armor=finishItem({s:'armor',g:'normal',il:1,rq:1,b:'무명 전포',at:{def:4},af:[],e:0});
  return r;
}

/* ---------- 능력치 계산 ---------- */
function itemStats(it){
  const o={},e=it.e||0;
  for(const k in it.at)o[k]=(o[k]||0)+it.at[k]*(1+e*.1);
  for(const [k,v] of it.af)o[k]=(o[k]||0)+(AF[k]&&AF[k].fix?v:v*(1+e*.03));
  return o;
}
function skRank(ps,id){return ps.rpg.sk[id]||0}
function synPct(ps,s){let v=0;for(const [id,p] of s.syn)v+=skRank(ps,id)*p;return v}
function treePts(ps,tr){let n=0;for(const id in ps.rpg.sk){const s=SKILLS[id];if(s&&s.tr===tr)n+=ps.rpg.sk[id]}return n}
function calcStats(ps,eqOv){
  const h=HEROES[ps.hero],r=ps.rpg,A=HATTR[h.id],L=ps.lvl,eq=eqOv||r.eq;
  const m={},procs=[];
  const add=(k,v)=>{if(k==='procs'){procs.push(...v);return}m[k]=(m[k]||0)+v};
  const sets={};
  for(const sl of EQ_SLOTS){const it=eq[sl];if(!it)continue;
    const s=itemStats(it);for(const k in s)add(k,s[k]);
    if(it.set)sets[it.set]=(sets[it.set]||0)+1;
    const u=it.u&&UNIQ[it.u];if(u){if(u.pw)for(const k in u.pw)add(k,u.pw[k]);if(u.procs)procs.push(...u.procs)}}
  const setOn=[];
  for(const k in sets){for(const [n,mods] of SETS[k].bonus)if(sets[k]>=n)for(const kk in mods)add(kk,mods[kk]);setOn.push([k,sets[k]])}
  const g=k=>m[k]||0;
  const skl=id=>{const rk=r.sk[id]||0;if(!rk)return 0;return rk+g('allSkill')+g('tree'+SKILLS[id].tr)};
  const auras=[];
  for(const s of HSK[h.id]){const lv=skl(s.id);if(!lv)continue;const em=1+(r.enh[s.id]||0)*.08;
    if(s.ty==='passive')for(const k in s.mods)add(k,(s.mods[k][0]+s.mods[k][1]*(lv-1))*em);
    else if(s.ty==='basic')add('basicDmg',s.v*lv*em);
    else if(s.ty==='cmd')add('cmdDmg',(s.v*lv+synPct(ps,s))*em);
    else if(s.ty==='sp')add('spDmg',(s.v*lv+synPct(ps,s))*em);
    else if(s.ty==='aura')auras.push({s,lv,em});}
  const as=g('allStat');
  const str=r.str+g('str')+as,dex=r.dex+g('dex')+as,vit=r.vit+g('vit')+as,ene=r.ene+g('ene')+as;
  const st={str,dex,vit,ene,
    pow:h.pow+(L-1)*.6+(str-A[0])*.4+g('atk'),atkPct:g('atkPct'),
    maxhp:Math.round((h.hp+(L-1)*h.hp*.05+(vit-A[2])*3+g('hp'))*(1+g('hpPct')/100)),
    maxmp:Math.round((40+(L-1)*3+(ene-A[3])*2.5+g('mp'))*(1+g('mpPct')/100)),
    maxki:Math.round(100+(L-1)+g('ki')),
    def:Math.round((g('def')+vit*.3+dex*.3)*(1+g('defPct')/100)),
    crit:Math.min(75,5+dex*.08+g('crit')),critDmg:50+g('critDmg'),
    dodge:Math.min(35,dex*.04+g('dodge')),mspd:Math.min(80,dex*.04+g('mspd')),
    ls:Math.min(15,g('ls')),dr:Math.min(60,g('dr')),cdr:Math.min(50,g('cdr')),
    skillDmg:ene*.8+g('skillDmg'),fire:g('fire'),ice:g('ice'),bolt:g('bolt'),
    hpRegen:g('hpRegen')+vit*.03,kiRegen:g('kiRegen'),
    gf:g('gf'),mf:g('mf'),exp:g('exp'),kiGain:g('kiGain'),thorns:g('thorns'),
    burnCh:g('burnCh'),chillCh:g('chillCh'),shockCh:g('shockCh'),stunCh:g('stunCh'),burnPct:g('burnPct'),
    cmdDmg:g('cmdDmg'),spDmg:g('spDmg'),dashDmg:g('dashDmg'),basicDmg:g('basicDmg'),bossDmg:g('bossDmg'),vsCtrl:g('vsCtrl'),
    aoe:Math.min(100,g('aoe')),pickR:70+g('pickR'),
    manaShield:g('manaShield'),fireTrail:g('fireTrail'),cheatDeath:g('cheatDeath'),triArrow:g('triArrow'),
    allSkill:g('allSkill'),tree:[g('tree0'),g('tree1'),g('tree2')],procs,sets:setOn,auras};
  st.mpRegen=(1+st.maxmp*.012)*(1+g('mpRegen')/100);
  return st;
}
/* ---------- 장비 → 캐릭터 외형 ---------- */
const G_TONE={rare:'#5a8ad0',epic:'#9a60d0',set:'#3cae5a',excl:'#e09a30',myth:'#e83a2a'};
const G_METAL={rare:'#cfe6ff',epic:'#ead8ff',set:'#d0ffe0',excl:'#ffe6a8',myth:'#fff2c8'};
function mixCol(a,b,t){const A=hexRGB(a),B=hexRGB(b),f=i=>Math.round(A[i]+(B[i]-A[i])*t);return '#'+((1<<24)|(f(0)<<16)|(f(1)<<8)|f(2)).toString(16).slice(1)}
function heroLook(ps){
  const h=HEROES[ps.hero],eq=ps.rpg.eq,L=Object.assign({},h.look),tone=it=>it&&G_TONE[it.g],tier=it=>BASE_TIER.reduce((a,v,i)=>it.il>=v?i:a,0);
  const a=eq.armor;
  if(!a){if(L.armor==='plate')L.armor='cloth';L.body=shade(L.body,-22);L.sub=shade(L.sub,-35)}
  else{if(tone(a))L.sub=mixCol(L.sub,tone(a),.6);if(L.armor==='cloth'&&tier(a)>=2)L.armor='plate';
    if(a.g==='myth'||a.g==='excl')L.body=mixCol(L.body,tone(a),.25);if(a.e>=7)L.sub=shade(L.sub,25)}
  const hm=eq.helm;
  if(hm){if(hm.g==='myth')L.hat='crown';else if(hm.g==='excl'&&hm.h===h.id)L.hat=h.look.hat;
    else{L.hat=(hm.g==='epic'||hm.g==='set'||tier(hm)>=3)?'helm2':'helm';L.helmc=tone(hm)?mixCol('#8a8a90',tone(hm),.55):'#7a7870'}}
  const cp=eq.cape;L.cape=cp?(tone(cp)?shade(tone(cp),-45):(h.look.cape||'#6a5040')):null;
  const bt=eq.boots;L.boots=bt?(tone(bt)?mixCol(h.look.boots,tone(bt),.6):h.look.boots):'#6a5a40';
  const gl=eq.gloves;L.glove=gl?(tone(gl)?mixCol('#6a4a30',tone(gl),.6):'#6a4a30'):null;
  const bl=eq.belt;L.belt=bl?(tone(bl)?mixCol('#7a5a2a',tone(bl),.6):'#7a5a2a'):null;
  const wp=eq.weapon;
  if(wp&&wp.wt&&WTYPES[wp.wt]){L.weapon=WTYPES[wp.wt].m;if(wp.wt!=='sword')L.dual=false}
  if(wp&&G_METAL[wp.g]){L.metal=G_METAL[wp.g];if(L.weapon==='fan')L.fanc=mixCol('#f4f2ea',G_TONE[wp.g],.35)}
  L.wglow=wp&&(GRADES[wp.g].rank>=2||wp.e>=10)?(G_TONE[wp.g]||'#ffffff'):null;
  let best=-1,bc=null;for(const k of['neck','ring1','ring2','book']){const it=eq[k];if(it&&GRADES[it.g].rank>best){best=GRADES[it.g].rank;bc=G_TONE[it.g]}}
  L.aura=best>=3?bc:null;
  /* 인게임 외형 장식: 갑옷 · 망토 등급, 목걸이 보석 */
  const RK=it=>it?GRADES[it.g].rank:0;L.gA=RK(eq.armor);L.gC=RK(eq.cape);
  /* 아이템별 고유 외형: 아이템 시드로 모양 · 색을 정한다 (같은 부위라도 아이템마다 다르게 보임) */
  const PAL=['#b8322a','#2a5aa8','#2f7d3b','#6a3a9a','#c89a30','#2a2a30','#e8e4dc','#1f6a7a','#8a4a20','#a82a6a','#d86a20','#4a8ad0'];
  const GEMS=['#e03a3a','#3aa0ff','#40d070','#ffd040','#c060ff','#ff8a30','#ff6ab0','#e8f4ff'];
  const sd=it=>itemSeed(it)>>>0,pc=(it,k)=>PAL[(sd(it)>>>k)%PAL.length];
  if(hm&&hm.g!=='myth'&&!(hm.g==='excl'&&hm.h===h.id)){const t=tier(hm),pool=t<=1?['helmR','helm']:t<=3?['helm','helmW','helmH','helm2']:['helm2','helmW','helmH','helmP'];
    L.hat=pool[sd(hm)%pool.length];L.helmc=mixCol(pc(hm,3),tone(hm)||'#8a8a90',tone(hm)?.45:.25);L.plumeC=pc(hm,6);L.gemC=GEMS[(sd(hm)>>>9)%GEMS.length]}
  if(a){L.armV=sd(a)%4;L.body=mixCol(L.body,pc(a,4),.28)}
  if(cp){L.capeV=sd(cp)%4;L.cape=tone(cp)?mixCol(shade(tone(cp),-45),pc(cp,5),.35):shade(pc(cp,5),-30)}
  if(gl){L.gloveV=sd(gl)%3;L.glove=mixCol(L.glove,pc(gl,3),.35)}
  if(bt){L.bootV=sd(bt)%3;L.boots=mixCol(L.boots,pc(bt,3),.3)}
  if(bl){L.beltV=sd(bl)%3;L.belt=mixCol(L.belt,pc(bl,3),.35)}
  if(wp){L.wV=sd(wp)%4;L.tasC=pc(wp,7);if(!L.gemC)L.gemC=GEMS[(sd(wp)>>>4)%GEMS.length];if(!wp.u)L.wood=['#6a3a1a','#4a2410','#7a4a22','#2a2018','#5a1414'][(sd(wp)>>>2)%5]}
  L.neckC=eq.neck?GEMS[(sd(eq.neck)>>>3)%GEMS.length]:null;L.neckV=eq.neck?sd(eq.neck)%3:0;
  return L;
}
/* ---------- 아이템 고유성 · 무기 종류 · 무기 전용 이펙트 ---------- */
function itemSeed(it){const k=(it.u||'')+(it.set||'')+it.n+'|'+it.il+'|'+(it.af[0]?it.af[0][0]:'');let h=7;for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))|0;return Math.abs(h)}
function wKind(it){if(it.wt)return it.wt;const n=it.n+' '+(it.b||'');
  if(/도끼|斧|부$/.test(it.b||it.n))return'axe';if(/채찍|편$|鞭/.test(it.b||it.n))return'whip';
  if(/창|槍|모|矛/.test(n))return'spear';if(/극|戟/.test(n))return'halberd';if(/선|扇/.test(n))return'fan';if(/궁|弓|활/.test(n))return'bow';
  if(/장|杖/.test(n))return'staff';if(/도|刀/.test(n))return'dao';if(/검|劍/.test(n))return'sword';
  return['sword','dao','spear','dao','halberd','sword','sword'][BASE_TIER.reduce((a,v,i)=>it.il>=v?i:a,0)]}
const WFX_U={guan_w:{c:'#5dffa0',p:'dragon',n:'청룡의 기운'},zhang_w:{c:'#ff6a3a',p:'ember',n:'맹호의 불꽃'},zhao_w:{c:'#bfe6ff',p:'frost',n:'은룡의 서리'},huang_w:{c:'#ffc04a',p:'ember',n:'봉황의 불씨'},
  zhuge_w:{c:'#8ad8ff',p:'wind',n:'동남풍'},ma_w:{c:'#fff0c0',p:'wind',n:'서량 선풍'},diao_w:{c:'#ff8ad0',p:'petal',n:'폐월 꽃잎'},wei_w:{c:'#ff7a2a',p:'ember',n:'반골 열화'},lubu_w:{c:'#ff3a3a',p:'blood',n:'무쌍 혈월'},
  xu_w:{c:'#ffb040',p:'blood',n:'개산의 기세'},gan_w:{c:'#ffd84a',p:'bolt',n:'방울 번개'},sun_w:{c:'#ff6a4a',p:'ember',n:'궁요 불씨'},
  m_qixing:{c:'#ffe890',p:'star',n:'칠성 별빛'},m_yitian:{c:'#e8f4ff',p:'light',n:'의천 섬광'},m_guding:{c:'#ff7a2a',p:'ember',n:'고정 화염'},m_cixiong:{c:'#ff6aa0',p:'petal',n:'자웅 쌍화'},
  m_hualong:{c:'#ff5020',p:'ember',n:'화룡의 숨결'},m_bingpo:{c:'#9ae8ff',p:'frost',n:'빙백 한기'}};
const WFX_SET={xiliang:'wind',chibi:'ember',qinglong:'dragon',tiangong:'bolt',wushen:'dragon'};
const WFX_NAME={ember:'불꽃',frost:'서리',bolt:'번개',petal:'꽃잎',star:'별빛',dragon:'용의 기운',wind:'바람',blood:'혈월',light:'섬광',thrust:'관통',spark:'참격'};
function weaponFx(w){
  if(!w)return null;
  if(w.u&&WFX_U[w.u])return WFX_U[w.u];
  if(w.set&&SET_MARK[w.set])return{c:SET_MARK[w.set][1],p:WFX_SET[w.set]||'spark'};
  const el=w.af.find(a=>/^(fire|ice|bolt|burnCh|chillCh|shockCh)$/.test(a[0])),P={fire:'ember',burnCh:'ember',ice:'frost',chillCh:'frost',bolt:'bolt',shockCh:'bolt'};
  const k=wKind(w);
  return{c:G_TONE[w.g]||'#e8eef4',p:el?P[el[0]]:({spear:'thrust',halberd:'blood',fan:'wind',staff:'bolt',axe:'blood',whip:'bolt',bow:'ember'}[k]||'spark')};
}
/* 무기 전용 타격 이펙트 */
function wfxHit(p,t){
  const f=p.ps.wfx;if(!f)return;const x=t.x,y=t.y,z=t.z+55,c=f.c,w=Wd;
  switch(f.p){
    case'ember':for(let i=0;i<9;i++)emit({x:x+rnd(-12,12),y,z:z+rnd(-10,10),vx:rnd(-2,2),vz:rnd(2,6),g:.12,col:i%3?c:'#fff0a0',size:rnd(2,4),life:rnd(16,28),type:'sq'});glowFlash(x,y,z,'#ff8030',46,10);break;
    case'frost':for(let i=0;i<7;i++)emit({x,y,z,vx:rnd(-4,4),vz:rnd(1,6),g:.3,col:i%2?'#e8fbff':c,size:rnd(4,7),life:rnd(18,28),type:'shard',add:false});glowFlash(x,y,z,c,40,10);break;
    case'bolt':w.fx.push({type:'chainl',x:x+rnd(-20,20),y:y-150,x2:x,y2:y-z,t:0,life:10,col:c});for(let i=0;i<6;i++)emit({x,y,z,vx:rnd(-5,5),vz:rnd(-3,5),col:'#ffffff',size:2,life:12,type:'sq'});break;
    case'petal':for(let i=0;i<8;i++)emit({x,y,z,vx:rnd(-3,3),vy:rnd(-1,1),vz:rnd(0,3),col:i%2?c:'#ffe0f0',life:rnd(24,36),type:'petal',add:false});break;
    case'star':w.fx.push({type:'text',x:x+rnd(-10,10),y,z:z+30,t:0,life:22,txt:'★',col:c,size:rnd(14,22)});for(let i=0;i<5;i++)emit({x,y,z,vx:rnd(-3,3),vz:rnd(-3,3),col:c,size:3,life:14,type:'sq'});break;
    case'dragon':for(let i=0;i<8;i++){const a=i/8*Math.PI*2;emit({x:x+Math.cos(a)*14,y,z:z+Math.sin(a)*14,vx:Math.cos(a+1.6)*3,vz:Math.sin(a+1.6)*3,col:c,size:rnd(8,14),life:18,type:'glow'})}break;
    case'wind':w.fx.push({type:'ring',x,y,z:0,t:0,life:14,r:60,col:c});for(let i=0;i<5;i++)emit({x,y,z,vx:rnd(-5,5),vz:rnd(0,2),col:'#ffffff',size:2,life:14,type:'sq'});break;
    case'blood':w.fx.push({type:'slashX',x,y,z,t:0,life:12,ang:rnd(-.5,.5),len:150,col:c});w.fx.push({type:'slashX',x,y,z,t:0,life:10,ang:rnd(-1.4,-.8),len:90,col:'#ffffff'});break;
    case'light':w.fx.push({type:'slashX',x,y,z,t:0,life:14,ang:rnd(-.3,.3),len:220,col:'#ffffff'});glowFlash(x,y,z,c,60,8);break;
    case'thrust':w.fx.push({type:'slashX',x:x+p.facing*20,y,z,t:0,life:10,ang:0,len:140,col:c});break;
    default:w.fx.push({type:'slashX',x,y,z,t:0,life:10,ang:rnd(-1.2,1.2),len:rnd(70,110),col:c});
  }
}
/* 무기를 휘두를 때 날 끝에서 나오는 전용 입자 */
function wfxSwing(p,x,y,z){const f=p.ps.wfx,c=f.c;
  switch(f.p){
    case'ember':emit({x,y,z,vx:rnd(-1,1),vz:rnd(1,3),col:Math.random()<.5?c:'#ffe080',size:rnd(2,4),life:16,type:'sq'});break;
    case'frost':emit({x,y,z,vz:-.4,col:'#e8fbff',size:rnd(3,5),life:18,type:'shard',add:false});break;
    case'bolt':emit({x:x+rnd(-6,6),y,z:z+rnd(-6,6),vx:rnd(-3,3),vz:rnd(-3,3),col:Math.random()<.5?c:'#ffffff',size:2,life:8,type:'sq'});break;
    case'petal':emit({x,y,z,vx:rnd(-1.5,1.5),vz:rnd(-.5,1),col:c,life:28,type:'petal',add:false});break;
    case'star':if(Math.random()<.4)emit({x,y,z,col:'#fff6a0',size:3,life:14,type:'sq'});emit({x,y,z,col:c,size:8,life:10,type:'glow'});break;
    case'dragon':emit({x,y,z,vx:rnd(-1,1),vz:rnd(-1,1),col:c,size:rnd(8,12),life:16,type:'glow'});break;
    case'blood':emit({x,y,z,vx:rnd(-.6,.6),vz:-.5,col:c,size:3,life:18,type:'sq',add:false});break;
    case'light':emit({x,y,z,col:'#ffffff',size:10,life:8,type:'glow'});break;
    case'wind':emit({x,y,z,vx:rnd(-2,2),vz:rnd(0,1),col:'#ffffff',size:2,life:12,type:'sq'});break;
    default:emit({x,y,z,col:c,size:2,life:10,type:'sq'});
  }
}
/* 강화 단계 전투 이펙트: 무기 +5 발광 · +7 광채 · +10 불꽃 · +13 뇌광 · +15 무지개 / 방어구 평균 +7 발밑 고리 · +10 상승 기류 · +13 오라 · +15 빛날개 */
function enhCol(n){return n>=15?`hsl(${(frame*6)%360},100%,65%)`:n>=13?'#ff4040':n>=10?'#c060ff':n>=7?'#5a8aff':'#9ad0ff'}
function enhHex(n){if(n<15)return enhCol(n);const h=(frame*6)%360,f=k=>{const a=Math.min(1,Math.max(0,Math.abs(((h/60+k)%6)-3)-1));return Math.round((.35+.65*a)*255)};return '#'+[f(0),f(4),f(2)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function enhWeaponFx(e,r,cx){
  const we=(e.ps.rpg.eq.weapon||{}).e||0;if(we<5)return;const c=enhHex(we),tx=r.tx,ty=r.ty;
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+Math.min(.45,we*.03)+.12*Math.sin(frame*.3);const s=16+we*2.4;ctx.drawImage(glowSpr(c),tx-s/2,ty-s/2,s,s);
  if(we>=7){ctx.globalAlpha=.25;for(let k=1;k<=3;k++){const q=k/4,x=r.mx+(tx-r.mx)*q,y=r.my+(ty-r.my)*q;ctx.drawImage(glowSpr(c),x-8,y-8,16,16)}}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(we>=7&&frame%3===0){const q=Math.random(),x=r.mx+(tx-r.mx)*q,y=r.my+(ty-r.my)*q;emit({x:x+cx,y:e.y,z:e.y-y,vz:.3,col:c,size:2,life:14,type:'sq'})}
  if(we>=10&&frame%2===0)emit({x:tx+cx+rnd(-4,4),y:e.y,z:e.y-ty+rnd(-4,4),vz:rnd(.8,2),vx:rnd(-.4,.4),col:c,size:rnd(2,4),life:18,type:'sq'});
  if(we>=13&&frame%9===0)Wd.fx.push({type:'chainl',x:tx+cx,y:ty-8,x2:tx+cx+rnd(-30,30),y2:ty+rnd(-30,30),t:0,life:6,col:c});
}
function enhBodyFx(e,sx,sy,cx){
  const eq=e.ps.rpg.eq,ks=['armor','helm','gloves','boots','belt','cape'];let n=0,sum=0;for(const k of ks)if(eq[k]){n++;sum+=eq[k].e||0}
  const ae=n?Math.floor(sum/ks.length):0;if(ae<7)return;const c=enhHex(ae);
  ctx.globalCompositeOperation='lighter';ctx.strokeStyle=c;ctx.lineWidth=2;ctx.globalAlpha=.45+.2*Math.sin(frame*.15);
  const rr=26+Math.sin(frame*.1)*2;ctx.beginPath();ctx.ellipse(sx,e.y,rr,rr*.32,0,0,Math.PI*2);ctx.stroke();
  if(ae>=13){for(let i=0;i<8;i++){const a=frame*.05+i*Math.PI/4;ctx.fillStyle=c;ctx.fillRect(Math.round(sx+Math.cos(a)*rr*1.25)-1,Math.round(e.y+Math.sin(a)*rr*.4)-1,3,3)}
    ctx.globalAlpha=.18+.06*Math.sin(frame*.2);ctx.drawImage(glowSpr(c),sx-40,sy-112,80,120)}
  if(ae>=15){ctx.globalAlpha=.35+.1*Math.sin(frame*.2);for(const d of[-1,1]){ctx.save();ctx.translate(sx+d*10,sy-70);ctx.scale(d,1);ctx.rotate(-.35+Math.sin(frame*.12)*.12);ctx.drawImage(glowSpr(c),0,-26,58,40);ctx.drawImage(glowSpr('#ffffff'),6,-18,34,20);ctx.restore()}}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(ae>=10&&frame%4===0)emit({x:e.x+rnd(-18,18),y:e.y,z:rnd(0,20),vz:rnd(1,2.2),col:c,size:rnd(2,3),life:30,type:'sq'});
}
/* 등급별 일괄 판매 · 분해 (잠금 제외) */
function bulkTargets(r,g,slotF){return r.bag.filter(it=>it.g===g&&!it.lk&&(!slotF||it.s===slotF))}
function bulkSalvage(r,g,slotF){const L=bulkTargets(r,g,slotF);let st=0,fr=0;for(const it of L){const gn=salvageGain(it);st+=gn.stone;fr+=gn.frag}
  r.bag=r.bag.filter(it=>!L.includes(it));r.mats.stone+=st;r.mats.frag+=fr;return{n:L.length,st,fr}}
function bulkSell(r,g,slotF){const L=bulkTargets(r,g,slotF);let gold=0;for(const it of L)gold+=itemPrice(it);r.bag=r.bag.filter(it=>!L.includes(it));r.gold+=gold;return{n:L.length,gold}}
/* 능력치 재계산 + 전장의 플레이어 개체에 반영 */
function recalc(ps){
  ps.st=calcStats(ps);ps.wfx=weaponFx(ps.rpg.eq.weapon);
  const p=Wd&&Wd.ps&&Wd.ps[ps.idx];
  if(p&&p.ps===ps){p.look=heroLook(ps);p.maxhp=ps.st.maxhp;p.hp=Math.min(p.hp,p.maxhp);p.maxmana=ps.st.maxmp;p.mana=Math.min(p.mana,p.maxmana);p.maxki=ps.st.maxki;p.mp=Math.min(p.mp,p.maxki)}
  ps.maxhp=ps.st.maxhp;
}
function skLv(ps,id){const rk=ps.rpg.sk[id]||0;if(!rk)return 0;const s=SKILLS[id];return rk+ps.st.allSkill+ps.st.tree[s.tr]}
function skMult(ps,s,lv){const e=ps.rpg.enh[s.id]||0;return (s.d+s.dr*(lv-1))*(1+synPct(ps,s)/100)*(1+e*.08)*(1+(ps.st.skillDmg+treePts(ps,s.tr))/100)}
function skCost(ps,s,lv){const e=ps.rpg.enh[s.id]||0;return Math.round(s.mp*(1+(lv-1)*.05)*(e>=10?.7:1))}
function skCd(ps,s,lv){const e=ps.rpg.enh[s.id]||0;return Math.round(s.cd*60*(1-ps.st.cdr/100)*(e>=10?.7:1))}
const cmdCost=p=>Math.max(10,20-Math.floor(skLv(p.ps,p.h.id+'_02')/2));
const spCost=p=>Math.max(30,50-skLv(p.ps,p.h.id+'_04'));
/* 기본 공격력 (상태 배율 제외) */
const aoeM=p=>1+((p.ps&&p.ps.st.aoe)||0)/100;
function basePow(p){const s=p.ps.st;return (s.pow+G.tPow)*(G.atkM||1)*(1+(s.atkPct+(p.bm.atkPct||0))/100)*(p.buf&&p.buf.atk>0?1.5:1)}
function moveSpd(p){return (p.h.spd+G.spdB)*(1+clamp(p.ps.st.mspd+(p.bm.mspd||0),-60,120)/100)*(p.buf.spd>0?1.5:1)}

/* ---------- 레벨 업 ---------- */
function gainExp(p,n){
  const s=p.ps;if(s.lvl>=MAXLV)return;
  s.exp+=Math.round(n*(1+s.st.exp/100));
  let up=0;
  while(s.lvl<MAXLV&&s.exp>=expNeed(s.lvl)){s.exp-=expNeed(s.lvl);s.lvl++;up++;s.rpg.statPts+=5;s.rpg.skillPts+=1}
  if(s.lvl>=MAXLV)s.exp=0;
  if(!up)return;
  recalc(s);
  if(!p.dead){p.hp=p.maxhp;p.mana=p.maxmana}
  const newSk=HSK[p.h.id].filter(k=>k.lv>s.lvl-up&&k.lv<=s.lvl);
  Wd.fx.push({type:'text',x:p.x,y:p.y,z:150,t:0,life:80,txt:s.lvl>=MAXLV?'MAX LEVEL!':`LEVEL UP!  Lv.${s.lvl}`,col:'#ffd94a',size:28});
  if(newSk.length)Wd.fx.push({type:'text',x:p.x,y:p.y,z:118,t:0,life:110,txt:`새 스킬 해금: ${newSk.map(k=>k.n).join(' · ')}`,col:'#9fe0ff',size:15});
  Wd.fx.push({type:'pillar',x:p.x,y:p.y,t:0,life:45,w:40,col:'#ffe080'});
  burst(p.x,p.y,10,'#ffe080',24,6,{vz:0,g:-.15,type:'sq'});sfx('lvl');
}

/* ---------- 버프 · 오라 · 재생 (매 프레임) ---------- */
function rpgTick(p){
  const s=p.ps.st,bm={};const add=(k,v)=>bm[k]=(bm[k]||0)+v;
  for(const id in p.sbuf){const b=p.sbuf[id];if(--b.t<=0){delete p.sbuf[id];hudTxt(p,'효과 종료');continue}for(const k in b.mods)add(k,b.mods[k])}
  for(const q of Wd.ps){if(q.dead||q.out)continue;for(const a of q.ps.st.auras)if(a.s.aura==='stat')for(const k in a.s.mods)add(k,(a.s.mods[k][0]+a.s.mods[k][1]*(a.lv-1))*a.em)}
  if(p.slowT>0){p.slowT--;add('mspd',-40)}
  p.bm=bm;
  for(const id in p.cds)if(p.cds[id]>0)p.cds[id]--;
  if(p.mspCd>0)p.mspCd--;
  if(p.dead)return;
  p.mana=Math.min(p.maxmana,p.mana+s.mpRegen/60);
  p.hp=Math.min(p.maxhp,p.hp+(s.hpRegen+(bm.hpRegen||0))/60);
  p.mp=Math.min(p.maxki,p.mp+(s.kiRegen+(bm.kiRegen||0))/60);
  /* 오라 · 불꽃 궤적 */
  if(++p.auraT>=60){p.auraT=0;
    for(const a of s.auras){const sk=a.s;
      if(sk.aura==='heal')for(const q of Wd.ps){if(q.dead||q.out)continue;q.hp=Math.min(q.maxhp,q.hp+q.maxhp*(sk.v+sk.vr*(a.lv-1))*a.em/100);emit({x:q.x+rnd(-15,15),y:q.y,z:rnd(20,80),vz:1.2,col:'#80ff90',size:8,life:24})}
      else if(sk.aura==='mp')for(const q of Wd.ps){if(q.dead||q.out)continue;q.mana=Math.min(q.maxmana,q.mana+q.maxmana*(sk.v+sk.vr*(a.lv-1))*a.em/100);emit({x:q.x+rnd(-15,15),y:q.y,z:rnd(20,80),vz:1.2,col:'#80b0ff',size:8,life:24})}
      else if(sk.aura==='dmg'){const col=sk.el!=='phys'?EL_COL[sk.el]:p.h.fx,d=Math.round(basePow(p)*(sk.d+sk.dr*(a.lv-1))*a.em);
        let hitAny=false;for(const e of Wd.enemies){if(!hittable(e))continue;const dx=e.x-p.x,dy=(e.y-p.y)*2;if(dx*dx+dy*dy<sk.r*sk.r){hitAny=true;damage({x:p.x,isPlayer:true,pl:p,el:sk.el,noProc:true},e,d,false,{dot:true,col,el:sk.el})}}
        if(hitAny)Wd.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:18,r:sk.r,col})}}}
  if(s.fireTrail&&(p.state==='walk'||p.state==='run')&&Wd.t%12===0)Wd.hz.push({x:p.x,y:p.y,t:0,delay:6,r:40,owner:'p',pl:p,kind:'fire',dmg:Math.round(basePow(p)*.5),el:'fire',dur:20,noProc:true});
}

/* ---------- 발동 효과 (전용 · 신화 · 세트) ---------- */
function fireProcs(p,ev,t,info){
  const L=p.ps.st.procs;if(!L||!L.length)return;
  for(const pr of L){
    if(pr.on!==ev||Math.random()*100>=pr.ch)continue;
    if((p.pcd.get(pr)||0)>Wd.t)continue;
    p.pcd.set(pr,Wd.t+(pr.cd==null?20:pr.cd));
    procAct(p,pr,t,info);
  }
}
function procProj(p,kind,v,o){const f=p.facing;const pr=Object.assign({kind,x:p.x+f*34,y:p.y,z:60,vx:f*11,life:70,dmg:Math.round(basePow(p)*v),owner:'p',pl:p,pierce:true,knock:true,w:50,hit:new Set(),noProc:true},o);if(kind==='dragon')pr.hist=[];Wd.proj.push(pr);return pr}
function procAct(p,pr,t,info){
  const w=Wd,bp=basePow(p);
  switch(pr.act){
    case'gwave':procProj(p,'gwave',pr.v,{vx:p.facing*9,w:40,hk:'magic'});sfx('wind');break;
    case'dragon':procProj(p,'dragon',pr.v,{w:70,col:pr.col,hk:'magic'});sfx('dragon');break;
    case'redslash':procProj(p,'redslash',pr.v,{vx:p.facing*12,w:60});sfx('slash');break;
    case'fireball':procProj(p,'fireball',pr.v,{vx:p.facing*8,w:30,pierce:false,explode:true,exR:90,el:'fire',hk:'magic'});sfx('fire');break;
    case'bolt3':case'star7':{const n=pr.act==='star7'?7:3,tg=w.enemies.filter(e=>!e.dead&&onScreen(e,20));
      for(let i=0;i<n;i++){const e=t&&!t.dead&&i===0?t:tg.length?pick(tg):null;const x=e?e.x+rnd(-20,20):p.x+p.facing*rnd(80,300),y=e?e.y:rnd(GT+10,GB-5);
        w.hz.push({x,y,t:0,delay:8+i*6,r:60,owner:'p',pl:p,kind:'bolt',dmg:Math.round(bp*pr.v),el:'bolt',noProc:true})}
      if(n===7)w.fx.push({type:'text',x:p.x,y:p.y,z:150,t:0,life:50,txt:'七星',col:'#ffe890',size:30});break}
    case'nova':w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:24,r:180,col:'#ffd080'});w.shake=Math.max(w.shake,10);sfx('roar');
      hitAround(p,p.x,p.y,170,()=>Math.round(bp*pr.v),false,{stun:50},()=>({x:p.x,isPlayer:true,pl:p,noProc:true}));break;
    case'explode':if(t){w.hz.push({x:t.x,y:t.y,t:0,delay:1,r:90,owner:'p',pl:p,kind:'boom',dmg:Math.round(bp*pr.v),el:'fire',dur:24,noProc:true});sfx('bomb')}break;
    case'heal':p.hp=Math.min(p.maxhp,p.hp+p.maxhp*pr.v/100);emit({x:p.x,y:p.y,z:70,vz:1.5,col:'#80ff90',size:10,life:22});break;
    case'buffAtk':p.sbuf['proc_atk']={t:pr.dur,max:pr.dur,mods:{atkPct:pr.v},n:'공격 강화',ic:'攻',col:'#ff6040'};break;
    case'drFor':p.sbuf['proc_dr']={t:pr.dur,max:pr.dur,mods:{dr:pr.v},n:'결사',ic:'護',col:'#70ff90'};hudTxt(p,'결사의 각오!','#70ff90',20);break;
    case'shield':p.buf.shield=Math.max(p.buf.shield,pr.v);hudTxt(p,'금강불괴!','#ffd040',20);break;
    case'freeCast':if(info&&info.id){p.cds[info.id]=0;hudTxt(p,'재사용 초기화!','#9fe0ff',17)}break;
    case'freeMana':if(info&&info.cost){p.mana=Math.min(p.maxmana,p.mana+info.cost);hudTxt(p,'내공 환원!','#80b0ff',17)}break;
    case'stun':if(t&&!t.dead&&!t.boss){t.state='hurt';t.t=0;t.hurtLen=pr.v;emit({x:t.x,y:t.y,z:110,vz:1,col:'#ff5aa8',size:10,life:40,type:'heart',add:false})}break;
    case'burn':if(t&&!t.dead)applyStatus(t,'burn',p,bp);break;
    case'bonusDrop':if(t){const it=genItem(t.lv||stageLv(),rollGrade(p.ps.st.mf,'elite'),{heroes:partyHeroes()});dropGear(t.x,t.y,it)}break;
  }
}

/* ---------- 상태이상 · 원소 반응 ---------- */
function applyStatus(e,k,p,power){
  if(e.dead||e.isPlayer)return;
  const s=e.stt||(e.stt={});
  if(k==='burn'){const dps=power*.35*(1+(p?p.ps.st.burnPct:0)/100);s.burn={t:180,dps:Math.max(s.burn?s.burn.dps:0,dps),pl:p}}
  else if(k==='chill')s.chill=Math.max(s.chill||0,e.boss?60:120);
  else if(k==='shock')s.shock=Math.max(s.shock||0,180);
  else if(k==='stun'&&!e.boss&&e.state!=='down'){e.state='hurt';e.t=0;e.hurtLen=50}
}
function tickStatus(e){
  const s=e.stt;
  if(s.burn){s.burn.t--;if(s.burn.t%20===0&&!e.dead)damage({x:e.x,isPlayer:true,pl:s.burn.pl,noProc:true},e,Math.max(1,Math.round(s.burn.dps/3)),false,{dot:true,col:'#ff9040'});
    if(e.t%3===0)emit({x:e.x+rnd(-12,12),y:e.y,z:rnd(20,80),vz:rnd(1,2.5),col:'#ff7020',size:9,life:18});
    if(s.burn&&s.burn.t<=0)s.burn=null}
  if(s.chill>0){s.chill--;if(e.t%6===0)emit({x:e.x+rnd(-14,14),y:e.y,z:rnd(10,90),vz:-.3,col:'#c8f4ff',size:6,life:20,type:'sq'})}
  if(s.shock>0){s.shock--;if(e.t%7===0)burst(e.x,e.y,rnd(40,90),'#c8a8ff',2,4,{type:'spark',size:2})}
}
/* 원소 반응 처리 (damage 에서 호출) */
function elemReact(t,el,knock,dmg,pp){
  const s=t.stt;if(!s)return null;
  if(el==='bolt'&&s.burn){s.burn=null;s.shock=0;
    Wd.hz.push({x:t.x,y:t.y,t:0,delay:2,r:100,owner:'p',pl:pp,kind:'boom',dmg:Math.round(dmg*.8),el:'fire',dur:24,noProc:true});sfx('bomb');return{n:'폭뢰(爆雷)!',m:1.3,col:'#ffb040'}}
  if(el==='fire'&&s.chill>0){s.chill=0;return{n:'융해(融解)!',m:1.5,col:'#ff9a60'}}
  if(knock&&s.chill>0&&el!=='fire'){s.chill=0;burst(t.x,t.y,60,'#dff8ff',16,8);return{n:'빙쇄(氷碎)!',m:1.6,col:'#bff0ff'}}
  if(el==='ice'&&s.shock>0){s.shock=0;applyStatus(t,'stun');return{n:'초전도!',m:1.25,col:'#c8d8ff'}}
  return null;
}
/* 플레이어 공격의 부가 효과 (상태이상 · 흡혈 · 기력 · 발동) */
function onPlayerHit(pp,a,t,dmg,crit){
  const s=pp.ps.st,el=a.el||'phys',bp=basePow(pp);
  if(el==='fire'&&Math.random()<.4||Math.random()*100<s.burnCh)applyStatus(t,'burn',pp,bp);
  if(el==='ice'||Math.random()*100<s.chillCh)applyStatus(t,'chill',pp);
  if(el==='bolt'&&Math.random()<.35||Math.random()*100<s.shockCh)applyStatus(t,'shock',pp);
  if(s.stunCh&&Math.random()*100<s.stunCh)applyStatus(t,'stun',pp);
  const ls=s.ls+(pp.bm.ls||0);
  if(ls>0&&!pp.dead)pp.hp=Math.min(pp.maxhp,pp.hp+Math.min(dmg*ls/100,pp.maxhp*.04));
  if(!a.noProc){fireProcs(pp,'hit',t);if(crit)fireProcs(pp,'crit',t)}
  pp.hitCnt=Wd.t-(pp.hitT==null?-999:pp.hitT)<=120?(pp.hitCnt||0)+1:1;pp.hitT=Wd.t;
  const ms={10:'GOOD!',25:'GREAT!',50:'EXCELLENT!',100:'UNBELIEVABLE!!',200:'천하무쌍!!'}[pp.hitCnt];if(ms){pp.comboMsg={txt:ms,t:Wd.t};sfx('lvl')}
  if(a===pp&&pp.ps.wfx)wfxHit(pp,t);
  if(a===pp){const we=(pp.ps.rpg.eq.weapon||{}).e||0;if(we>=10){const c=enhCol(we);burst(t.x,t.y,t.z+55,c,we>=13?14:8,we>=13?9:6,{type:'spark',size:3});if(we>=13)Wd.fx.push({type:'ring',x:t.x,y:t.y,z:0,t:0,life:12,r:70,col:c})}}
  if(a.sk){const c=a.col||(a.el&&a.el!=='phys'?EL_COL[a.el]:pp.h.fx);Wd.fx.push({type:'slashX',x:t.x,y:t.y,z:t.z+55,t:0,life:9,ang:rnd(-1.3,1.3),len:rnd(70,120),col:c})}
}

/* ---------- 스킬 시전 ---------- */
const CAST_OK={idle:1,walk:1,run:1,attack:1};
const SK_POSE={proj:'attack3',dash:'dashatk',nova:'skill',rain:'skill',chain:'skill',quake:'attack3',whirl:'spin',leap:'jump',summon:'skill',buff:'win'};
function tryCastSkill(p,slot){
  const ps=p.ps,id=ps.rpg.hot[slot];
  if(!id){hudTxt(p,`${slot+1}번 단축키가 비어 있음`);return}
  const s=SKILLS[id],lv=skLv(ps,id);
  if(!lv||!CAST_OK[p.state])return;
  if(p.cds[id]>0){hudTxt(p,`${s.n} 재사용 대기 ${Math.ceil(p.cds[id]/60)}초`);sfx('noMp');return}
  const cost=skCost(ps,s,lv);
  if(p.mana<cost){hudTxt(p,'내공 부족','#6aa8ff');sfx('noMp');return}
  p.mana-=cost;const cd=skCd(ps,s,lv);p.cds[id]=cd;p.cdMax[id]=cd;
  const e=ps.rpg.enh[id]||0;
  p.state='pskill';p.t=0;p.hitIds=new Set();p.landed=false;p.queued=false;
  p.sk={s,lv,e,aw:e>=5,dm:skMult(ps,s,lv)*(1+(p.bm.skillDmg||0)/100),base:basePow(p)};
  p.skPose=SK_POSE[s.ty];
  const col=s.el!=='phys'?EL_COL[s.el]:(s.col||p.h.fx);
  Wd.fx.push({type:'text',x:p.x,y:p.y,z:150,t:0,life:46,txt:s.n,col,size:22});glowFlash(p.x,p.y,60,col,80,10);
  Wd.fx.push({type:'rune',x:p.x,y:p.y,t:0,life:44,r:62+s.ti*8,col});
  for(let i=0;i<14;i++){const an=i/14*Math.PI*2;emit({x:p.x+Math.cos(an)*55,y:p.y+Math.sin(an)*18,z:2,vz:rnd(1.5,3.5),vx:-Math.cos(an)*.6,col:i%3?col:'#ffffff',size:rnd(2,4),life:rnd(20,32),type:'sq'})}
  kiai(vprof(p),'big');if(VOICE.on&&Math.random()<.6)say(s.n+'!',vprof(p));
  if(s.ty==='dash'||s.ty==='leap')p.inv=Math.max(p.inv,s.ty==='leap'?48:24);
  if(s.ti===4){Wd.cutin={t:0,dur:40,h:p.h,pl:p.idx,name:s.n,look:p.look,sub:'각성기 · '+TREES[p.h.id][s.tr]};p.inv=Math.max(p.inv,60)}
  else if(s.ti>=2&&ACTIVE_TY[s.ty]&&s.ty!=='buff')Wd.sflash={t:0,dur:16,name:s.n,col,x:p.x,y:p.y,z:p.z};
  fireProcs(p,'cast',null,{id,cost});
}
function hitAround(p,x,y,r,dmgF,knock,opt,srcF){
  for(const e of Wd.enemies){if(!hittable(e)||e.z>100)continue;const dx=e.x-x,dy=(e.y-y)*1.6;if(dx*dx+dy*dy<r*r)damage(srcF(),e,dmgF(),knock,opt?Object.assign({},opt):null)}
}
function updPSkill(p){
  const w=Wd,k=p.sk,s=k.s,f=p.facing,t=p.t;
  if(!k){p.state='idle';return}
  const col=s.el!=='phys'?EL_COL[s.el]:(s.col||p.h.fx);
  const dmg=()=>Math.round(k.base*k.dm*rnd(.9,1.1));
  const src=()=>({x:p.x,isPlayer:true,pl:p,el:s.el,sk:true,col,hk:s.el==='phys'?null:'magic'}),A=aoeM(p);
  switch(s.ty){
    case'proj':{
      if(t===8){const n=(s.cnt||1)+(k.aw?1:0),sp=s.spread||.4;
        for(let i=0;i<n;i++){const off=n>1?i-(n-1)/2:0;
          const o={kind:s.kind,x:p.x+f*34,y:p.y+off*4,z:s.kind==='tornado'?0:60,vx:f*(s.spd||10),vy:off*sp*1.6,life:s.life||60,dmg:dmg(),owner:'p',pl:p,
            pierce:!!s.pierce,knock:!!s.knock,w:(s.w||30)*A,hit:new Set(),el:s.el,sk:true,col:s.col||(s.el!=='phys'?EL_COL[s.el]:p.h.fx),hk:s.el==='phys'?null:'magic'};
          if(s.kind==='dragon')o.hist=[];
          if(s.kind==='tornado'){o.multi=10;o.pierce=true}
          if(s.kind==='petal'){o.ax=-f*.42;o.pierce=true}
          if(s.explode){o.explode=true;o.exR=s.explode*(k.aw?1.3:1)}
          if(s.stun)o.stun=s.stun;
          w.proj.push(o)}
        sfx(s.kind==='farrow'?'bow':s.el==='fire'?'fire':s.kind==='dragon'?'dragon':'wind');w.shake=Math.max(w.shake,4)}
      if(t>=20)p.state='idle';break}
    case'dash':{const dur=s.dist||14,spd=s.spd||12;
      if(t===2){sfx('dash');w.speed=Math.max(w.speed,16);w.speedDir=f;p.dashX0=p.x}
      if(t>=3&&t<3+dur){p.x+=f*spd;
        for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;
          if(Math.abs(e.x-p.x)<80*A&&Math.abs(e.y-p.y)<46*A){p.hitIds.add(e);damage(src(),e,Math.round(dmg()*(1+p.ps.st.dashDmg/100)*(k.aw?1.25:1)),true,s.stun?{stun:s.stun}:null)}}
        if(t%2===0)w.fx.push({type:'after',x:p.x,y:p.y,t:0,life:12,facing:f,look:p.look,pose:poseOf(p),tint:hexA(col,.5)});
        emit({x:p.x-f*rnd(0,30),y:p.y+rnd(-8,8),z:rnd(10,80),vx:-f*rnd(2,5),col,size:rnd(8,14),life:rnd(12,20)})}
      if(t===dur+4){const x0=p.dashX0||p.x;for(let k=0;k<5;k++)w.hz.push({x:x0+(p.x-x0)*k/5,y:p.y,t:0,delay:2+k*3,r:70*A,owner:'p',pl:p,kind:'boom',dmg:Math.round(dmg()*.35),el:s.el,sk:true,dur:20});sfx('bomb')}
      if(t>=dur+12)p.state='idle';break}
    case'nova':{
      if(t===10||t===17||t===24){const r=(s.r||150)*(k.aw?1.25:1)*A*(t===24?1.15:1),last=t===24;p.hitIds=new Set();
        w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:26,r:r*1.1,col});burst(p.x,p.y,40,col,last?30:14,last?11:7);glowFlash(p.x,p.y,50,col,r,14);
        for(let i=0;i<12;i++){const an=i/12*Math.PI*2;emit({x:p.x,y:p.y,z:30,vx:Math.cos(an)*9,vy:Math.sin(an)*3,col:i%2?col:'#ffffff',size:3,life:18,type:'spark'})}
        w.shake=Math.max(w.shake,last?14:7);sfx(s.el==='fire'?'fire':s.el==='ice'?'magic':s.el==='bolt'?'bolt':'roar');
        hitAround(p,p.x,p.y,r,()=>Math.round(dmg()*.5),last&&!s.stun,s.stun?{stun:s.stun}:last?null:{stun:12},src)}
      if(t>=32)p.state='idle';break}
    case'rain':{
      if(t===8){const n=(s.cnt||8)+(k.aw?Math.max(1,Math.ceil((s.cnt||8)*.4)):0);
        const tg=s.target?w.enemies.filter(e=>!e.dead&&onScreen(e,20)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x)):[];
        const spr=(s.spread||400)*A;for(let i=0;i<n;i++){let x,y,trk=null;
          if(tg.length){const e=tg[i%tg.length];x=e.x;y=e.y;trk=e}else{x=p.x+f*(60+Math.random()*spr);y=rnd(GT+10,GB-5)}
          w.hz.push({x,y,t:0,delay:(s.cnt===1?6:14)+i*3,r:70*A,owner:'p',pl:p,kind:s.hk,dmg:dmg(),el:s.el,sk:true,dur:s.hk==='fire'?24:16,track:trk})}
        sfx(s.hk==='bolt'?'bolt':s.hk==='arrow'?'whistle':'magic')}
      if(t>=24)p.state='idle';break}
    case'chain':{
      if(t===8){const n=(s.cnt||4)+(k.aw?2:0),used=new Set();let cur={x:p.x,y:p.y};
        for(let j=0;j<n;j++){let best=null,bd=(j?300:480)*A;
          for(const e of w.enemies){if(e.dead||used.has(e))continue;const d=Math.hypot(e.x-cur.x,(e.y-cur.y)*2);if(d<bd&&(j||(e.x-p.x)*f>-60)){bd=d;best=e}}
          if(!best)break;used.add(best);
          w.hz.push({x:best.x,y:best.y,t:0,delay:4+j*6,r:60*A,owner:'p',pl:p,kind:s.el==='ice'?'ice':'bolt',dmg:dmg(),el:s.el,sk:true,track:best});
          w.fx.push({type:'chainl',x:cur.x,y:cur.y-60,x2:best.x,y2:best.y-60,t:0,life:12+j*6,delay:j*6,col});cur=best}
        if(!used.size)w.hz.push({x:p.x+f*120,y:p.y,t:0,delay:6,r:50,owner:'p',pl:p,kind:s.el==='ice'?'ice':'bolt',dmg:dmg(),el:s.el});
        sfx(s.el==='ice'?'magic':'bolt')}
      if(t>=22)p.state='idle';break}
    case'quake':{
      if(t===10){const n=(s.cnt||4)+(k.aw?2:0);w.shake=Math.max(w.shake,12);sfx(s.hk==='fire'?'fire':'rock');
        for(let i=0;i<n;i++)w.hz.push({x:p.x+f*(60+i*(s.step||60)*A),y:p.y,t:0,delay:2+i*5,r:72*A,owner:'p',pl:p,kind:s.hk||'rock',dmg:dmg(),el:s.el,sk:true,dur:s.hk==='fire'?24:22,launch:s.hk==='rock'})}
      if(t>=30)p.state='idle';break}
    case'whirl':{const dur=Math.round((s.dur||80)*(k.aw?1.3:1)),K=pkeys(p.idx);
      const dx=(K.right?1:0)-(K.left?1:0),dy=(K.down?1:0)-(K.up?1:0),sp=moveSpd(p)*.7;p.x+=dx*sp;p.y+=dy*sp*.7;
      if(t%8===0){p.hitIds=new Set();sfx('swing',p.look.weapon)}
      const last=t>=dur-8,r=(s.r||110)*A*1.15;
      if(t%6===0)w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:12,r:r,col});
      for(const e of w.enemies){if(p.hitIds.has(e)||!hittable(e))continue;if(Math.abs(e.x-p.x)<r&&Math.abs(e.y-p.y)<52*A&&e.z<100){p.hitIds.add(e);damage(src(),e,dmg(),last,last?null:{stun:10})}}
      if(t%3===0)burst(p.x,p.y,55,col,4,8,{type:'spark',size:3});
      if(t>=dur)p.state='idle';break}
    case'leap':{
      if(t===4){p.vz=12;p.vx=f*(s.dist||200)/37;sfx('jump')}
      if(t>4&&!p.landed){p.z+=p.vz;p.vz-=.65;p.x+=p.vx;
        if(p.z<=0){p.z=0;p.vz=0;p.landed=true;p.landT=t;const r=(s.r||150)*(k.aw?1.3:1)*A;p.leapR=r;
          w.shake=Math.max(w.shake,20);sfx('boss');
          w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:30,r:r*1.2,col});burst(p.x,p.y,10,col,26,11);
          for(let i=0;i<12;i++)w.fx.push({type:'debris',x:p.x,y:p.y,z:5,vx:rnd(-6,6),vz:rnd(4,10),t:0,life:40,col:'#7a6a50'});
          for(let i=0;i<12;i++)emit({x:p.x+rnd(-r*.6,r*.6),y:p.y+rnd(-20,20),z:0,vz:rnd(1,3),col:'#9a8a70',size:rnd(14,24),life:34,type:'smoke',add:false});
          hitAround(p,p.x,p.y,r,dmg,true,null,src)}}
      if(p.landed&&t===p.landT+9){const r=p.leapR*1.35;w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:24,r,col});w.shake=Math.max(w.shake,10);p.hitIds=new Set();hitAround(p,p.x,p.y,r,()=>Math.round(dmg()*.45),false,{stun:20},src)}
      if(p.landed&&t>p.landT+16){p.landed=false;p.state='idle'}
      if(t>150){p.z=0;p.landed=false;p.state='idle'}
      break}
    case'summon':{
      if(t===10){const n=(s.cnt||2)+(k.aw?1:0);w.allies=w.allies.filter(a=>!(a.pl===p&&a.sid===s.id));
        for(let i=0;i<n;i++)spawnAlly(p,s,k,i,n);sfx('gong')}
      if(t>=24)p.state='idle';break}
    case'buff':{
      if(t===8){const em=1+k.e*.08,mods={};for(const kk in s.mods)mods[kk]=(s.mods[kk][0]+s.mods[kk][1]*(k.lv-1))*em;
        const dur=Math.round(s.dur*60*(k.aw?1.5:1));
        for(const q of (s.party?w.ps:[p]))if(!q.dead&&!q.out){q.sbuf[s.id]={t:dur,max:dur,mods,n:s.n,col,ic:s.ic};
          w.fx.push({type:'pillar',x:q.x,y:q.y,t:0,life:40,w:40,col});burst(q.x,q.y,40,col,18,6,{g:-.1})}
        sfx('power')}
      if(t>=22)p.state='idle';break}
    default:p.state='idle';
  }
}

/* ---------- 신화 무기 전용 필살기 ---------- */
function mythSpOf(p){const w=p.ps.rpg.eq.weapon,u=w&&w.u&&UNIQ[w.u];return u&&u.spx||null}
function updMythSp(p){
  const w=Wd,t=p.t,f=p.facing,M=MYTH_SP[p.mysp],col=M.col,D=k=>Math.round(powOf(p)*k*G.spB);
  const src=el=>({x:p.x,isPlayer:true,pl:p,el:el||'phys',sk:true,col,hk:'magic'});
  const onS=()=>w.enemies.filter(e=>!e.dead&&onScreen(e,20));
  switch(p.mysp){
    case'qixing':
      if(t>=8&&t<=56&&(t-8)%8===0){const k=(t-8)/8,tg=onS(),e=tg.length?tg[k%tg.length]:null,x=e?e.x:p.x+f*(80+k*60),y=e?e.y:p.y;
        w.hz.push({x,y,t:0,delay:3,r:80,owner:'p',pl:p,kind:'bolt',dmg:D(1.6),el:'bolt',sk:true,noProc:true});
        w.fx.push({type:'slashX',x,y,z:60,t:0,life:16,ang:rnd(-1.2,1.2),len:300,col});w.fx.push({type:'text',x,y,z:160,t:0,life:30,txt:'★',col:'#ffe890',size:34});
        sfx('slash');w.shake=Math.max(w.shake,8)}
      if(t===66){w.flashT=12;w.flashCol='255,240,180';w.shake=30;sfx('roar');
        for(const a of[-.62,.62])w.fx.push({type:'slashX',x:w.camX+W/2,y:(GT+GB)/2,z:90,t:0,life:28,ang:a,len:1200,col});
        w.fx.push({type:'bigtext',x:p.x,y:p.y,z:170,t:0,life:60,txt:'七星',col:'#fff8d0',stroke:'#806000',size:90});
        for(const e of onS())damage(src('bolt'),e,D(3.2),true)}
      if(t>=80)p.state='idle';break;
    case'yitian':
      if(t===4){w.fx.push({type:'hline',x:0,y:p.y-60,t:0,life:44,col});sfx('wind')}
      if(t===24){w.flashT=18;w.flashCol='255,255,255';w.shake=36;sfx('slash');sfx('roar');
        w.fx.push({type:'bigtext',x:p.x,y:p.y,z:170,t:0,life:60,txt:'倚天',col:'#ffffff',stroke:'#304060',size:96});
        for(const e of onS()){damage(src(),e,D(6.5),true);burst(e.x,e.y,60,'#ffffff',16,10)}}
      if(t>=54)p.state='idle';break;
    case'guding':
      if(t===10){sfx('fire');w.shake=14;
        for(const d of[-1,1])for(let i=0;i<2;i++)w.proj.push({kind:'tornado',x:p.x+d*40,y:clamp(p.y+(i?24:-24),GT+10,GB-5),z:0,vx:d*(4+i*2),life:95,dmg:D(.55),owner:'p',pl:p,pierce:true,multi:8,w:84,hit:new Set(),el:'fire',sk:true,col:'#ff7a2a',col2:'#ffd060'});
        for(let i=0;i<8;i++){const an=i/8*Math.PI*2;w.hz.push({x:p.x+Math.cos(an)*110,y:clamp(p.y+Math.sin(an)*40,GT+5,GB),t:0,delay:4+i*2,r:64,owner:'p',pl:p,kind:'fire',dmg:D(1),el:'fire',sk:true,dur:24})}}
      if(t>=44)p.state='idle';break;
    case'cixiong':
      if(t===10){sfx('dragon');w.shake=12;
        for(const d of[-1,1])w.proj.push({kind:'dragon',x:p.x+d*40,y:p.y,z:60,vx:d*11,life:90,dmg:D(3),owner:'p',pl:p,pierce:true,knock:true,w:95,hit:new Set(),hist:[],col:d>0?'#ff5a8a':'#6ab0ff',sk:true})}
      if(t===48){w.flashT=10;w.flashCol='255,160,220';sfx('bomb');
        for(const a of[-.7,.7])w.fx.push({type:'slashX',x:w.camX+W/2,y:(GT+GB)/2,z:80,t:0,life:24,ang:a,len:1100,col:a<0?'#ff5a8a':'#6ab0ff'});
        for(const e of onS())w.hz.push({x:e.x,y:e.y,t:0,delay:2,r:90,owner:'p',pl:p,kind:'boom',dmg:D(1.8),sk:true,dur:24})}
      if(t>=64)p.state='idle';break;
    case'hualong':
      if(t===2){p.vz=15;sfx('jump')}
      if(t>2&&!p.landed){p.z+=p.vz;p.vz-=t<34?.34:1.1;
        if(p.z<=0&&t>6){p.z=0;p.vz=0;p.landed=true;p.landT=t;w.shake=34;w.flashT=10;w.flashCol='255,140,60';sfx('boss');sfx('bomb');
          w.hz.push({x:p.x,y:p.y,t:0,delay:1,r:220,owner:'p',pl:p,kind:'boom',dmg:D(3),el:'fire',sk:true,dur:30});
          w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:30,r:320,col});for(let i=0;i<16;i++)w.fx.push({type:'debris',x:p.x,y:p.y,z:5,vx:rnd(-7,7),vz:rnd(5,11),t:0,life:40,col:'#7a4a30'})}}
      if(t>=10&&t<=46&&t%3===0){const tg=onS(),e=tg.length&&Math.random()<.6?pick(tg):null,x=e?e.x+rnd(-20,20):w.camX+rnd(60,W-60),y=e?e.y:rnd(GT+10,GB-5);
        w.hz.push({x,y,t:0,delay:16,r:72,owner:'p',pl:p,kind:'fire',dmg:D(1.2),el:'fire',sk:true,dur:24});
        emit({x:x-60,y,z:320,vx:3.6,vz:-19,col:'#ffb040',size:26,life:16,type:'glow'});emit({x:x-60,y,z:320,vx:3.6,vz:-19,col:'#ffffff',size:10,life:16,type:'glow'})}
      if(p.landed&&t>p.landT+16){p.landed=false;p.state='idle'}
      if(t>140){p.z=0;p.landed=false;p.state='idle'}
      break;
    case'bingpo':
      if(t===6){w.flashT=14;w.flashCol='180,230,255';sfx('magic');w.fx.push({type:'ring',x:p.x,y:p.y,t:0,life:34,r:700,col});
        for(const e of onS()){applyStatus(e,'chill',p);applyStatus(e,'stun',p)}}
      if(t===14||t===26||t===38){sfx('magic');for(const e of onS())w.hz.push({x:e.x,y:e.y,t:0,delay:4,r:70,owner:'p',pl:p,kind:'ice',dmg:D(1.4),el:'ice',sk:true,track:e})}
      if(t===52){w.shake=26;sfx('break');w.fx.push({type:'bigtext',x:p.x,y:p.y,z:170,t:0,life:50,txt:'氷碎',col:'#e8fbff',stroke:'#204060',size:84});
        for(const e of onS())damage(src('phys'),e,D(2.2),true)}
      if(t>=66)p.state='idle';break;
    default:p.state='idle';
  }
}

/* ---------- 소환수 ---------- */
function spawnAlly(p,s,k,i,n){
  const look=SUMMON_LOOK[s.look];
  const a={x:p.x+rnd(-40,40),y:clamp(p.y+(i-(n-1)/2)*34,GT+5,GB),z:0,vz:0,vx:0,facing:p.facing,state:'idle',t:0,anim:rnd(0,50)|0,combo:1,look,pl:p,sid:s.id,
    life:Math.round((s.dur||18)*60*(k.aw?1.3:1)),dmg:Math.round(k.base*k.dm),reach:90,spd:s.look==='qiang'?4.2:2.6,cd:20,trail:[],hitIds:new Set(),isAlly:true};
  Wd.allies.push(a);
  for(let j=0;j<8;j++)emit({x:a.x+rnd(-20,20),y:a.y,z:rnd(0,60),vz:rnd(.5,2),col:'#d8d0c0',size:rnd(12,20),life:30,type:'smoke',add:false});
}
function updAlly(a){
  a.t++;a.anim++;a.life--;if(a.cd>0)a.cd--;
  if(a.life<=0||a.pl.out){a.remove=true;for(let j=0;j<8;j++)emit({x:a.x+rnd(-20,20),y:a.y,z:rnd(0,60),vz:rnd(.5,2),col:'#d8d0c0',size:rnd(12,20),life:30,type:'smoke',add:false});return}
  if(a.state==='attack'){
    if(a.t>=8&&a.t<=13)for(const e of Wd.enemies){if(a.hitIds.has(e)||!hittable(e))continue;const dx=(e.x-a.x)*a.facing;
      if(dx>-10&&dx<a.reach&&Math.abs(e.y-a.y)<28){a.hitIds.add(e);damage({x:a.x,isPlayer:true,pl:a.pl,noProc:true},e,Math.round(a.dmg*rnd(.9,1.1)),a.combo===3,null)}}
    if(a.t>=22){a.state='idle';a.combo=a.combo%3+1}return}
  let best=null,bd=1e9;for(const e of Wd.enemies){if(e.dead)continue;const d=Math.abs(e.x-a.x)+Math.abs(e.y-a.y)*2;if(d<bd){bd=d;best=e}}
  let tx,ty;
  if(best){tx=best.x-Math.sign(best.x-a.x||1)*a.reach*.6;ty=best.y;a.facing=best.x>a.x?1:-1;
    if(Math.abs(best.x-a.x)<=a.reach*.85&&Math.abs(best.y-a.y)<18){if(a.cd<=0){a.state='attack';a.t=0;a.hitIds=new Set();a.cd=28;sfx('swing',a.look.weapon)}else a.state='idle';return}}
  else{tx=a.pl.x-a.pl.facing*70;ty=a.pl.y;if(Math.abs(tx-a.x)<20&&Math.abs(ty-a.y)<10){a.state='idle';return}}
  const mx=Math.abs(tx-a.x)>6?Math.sign(tx-a.x):0,my=Math.abs(ty-a.y)>5?Math.sign(ty-a.y):0;
  if(mx||my){a.state='walk';a.x+=mx*a.spd;a.y+=my*a.spd*.7;if(mx)a.facing=mx}else a.state='idle';
  a.y=clamp(a.y,GT+5,GB);a.x=clamp(a.x,Wd.camX+10,Wd.camX+W-10);
}
function drawAlly(a,cx){
  const sx=a.x-cx,sy=a.y-a.z;
  ctx.fillStyle='rgba(0,0,0,.3)';ell(sx,a.y,26,8);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.25+.1*Math.sin(frame*.2);ctx.drawImage(glowSpr(a.pl.h.fx),sx-45,sy-110,90,120);ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=a.life<60&&(a.life>>2)%2?.4:.88;
  renderModelOutlined(ctx,a.look,poseOf(a),sx,sy,1.3,a.facing,{});
  ctx.globalAlpha=1;
}

/* ---------- 장비 생성 ---------- */
function rollAf(k,L,mul){const A=AF[k];if(A.fix)return A.fix;let v=A.f(L)*mul;return v<10?Math.max(.5,Math.round(v*10)/10):Math.round(v)}
function baseStatsFor(s,L,bm){
  if(s==='weapon')return{atk:Math.round(baseAtk(L)*rnd(.85,1.1)*bm)};
  const d=SLOTS[s].def;return d?{def:Math.round(baseDef(L)*d*rnd(.85,1.1)*bm)}:{};
}
function finishItem(it){
  if(!it.n){
    if(it.g==='rare'&&it.af.length)it.n=(AF_PRE[it.af[0][0]]||'희귀한')+' '+it.b;
    else if(it.g==='epic')it.n=`〈${pick(EPIC_TITLE)}〉 ${it.b}`;
    else it.n=it.b;
  }
  it.e=it.e||0;return it;
}
function rollGrade(mf,mode){
  const f=1+mf/100;let w;
  if(mode==='boss')w={rare:40,epic:40*f,set:10*f,excl:7*f,myth:2.5*f};
  else if(mode==='elite')w={rare:55,epic:22*f,set:4*f,excl:2.5*f,myth:.6*f};
  else if(mode==='gamble')w={normal:25,rare:45,epic:22*f,set:4*f,excl:2.5*f,myth:.8*f};
  else w={normal:62,rare:28*f,epic:7*f,set:1.4*f,excl:.9*f,myth:.2*f};
  if(G&&G.cycle>=1){for(const k of['epic','set','excl','myth'])if(w[k])w[k]*=1+.3*G.cycle}
  return wpick(w);
}
function partyHeroes(){return G.pl.map(s=>HEROES[s.hero].id)}
function genItem(il,g,o){
  o=o||{};il=clamp(Math.round(il),1,MAXLV);
  if(g==='set'){const ks=Object.keys(SETS).filter(k=>SETS[k].req<=il+4);if(ks.length)return genSet(pick(ks),il);g='epic'}
  if(g==='excl'||g==='myth'){const pool=UNIQ_BY_G[g].filter(k=>UNIQ[k].req<=il+4&&(g!=='excl'||!o.heroes||o.heroes.includes(UNIQ[k].h)));
    if(pool.length)return genUniq(pick(pool),il);g='epic'}
  const s=o.slot||wpick(Object.fromEntries(Object.entries(SLOTS).map(([k,v])=>[k,v.w])));
  const G_=GRADES[g],ti=BASE_TIER.reduce((a,v,i)=>il>=v?i:a,0),t=Math.max(0,ti-(Math.random()<.3?1:0));
  const it={s,g,il,rq:g==='epic'?Math.max(1,il-1):Math.max(1,il-((Math.random()*4)|0)),b:BASES[s][t],at:baseStatsFor(s,il,G_.bm),af:[],e:0};
  if(s==='weapon'){const wt=o.wt||pick(Object.keys(WTYPES));it.wt=wt;it.b=WBASES[wt][t];it.af.push([WTYPES[wt].af,rollAf(WTYPES[wt].af,il,G_.m*rnd(.5,.8))])}
  let n=G_.afx[0]+((Math.random()*(G_.afx[1]-G_.afx[0]+1))|0);
  if(g==='normal'&&(s==='neck'||s==='ring'||s==='book'))n=1;
  const pool=AF_POOL[s].filter(k=>g==='epic'||!HI_AF[k]),used=new Set(it.af.map(a=>a[0]));
  if(s==='book'){const tk='tree'+((Math.random()*3)|0);it.af.push([tk,g==='epic'&&Math.random()<.5?2:1]);used.add('tree0');used.add('tree1');used.add('tree2');n=Math.max(0,n-1)}
  for(let i=0;i<n;i++){const c=pool.filter(k=>!used.has(k));if(!c.length)break;const k=pick(c);used.add(k);if(k.startsWith('tree')){used.add('tree0');used.add('tree1');used.add('tree2')}
    it.af.push([k,rollAf(k,il,G_.m*rnd(.55,1))])}
  return finishItem(it);
}
function genSet(key,il,pi){
  const S=SETS[key],pc=S.pieces[pi==null?(Math.random()*S.pieces.length)|0:pi],L=Math.max(il,S.req),gm=GRADES.set.m;
  return finishItem({s:pc.s,g:'set',il:L,rq:S.req,b:pc.n,n:pc.n,set:key,at:baseStatsFor(pc.s,L,GRADES.set.bm),af:pc.af.map(([k,f])=>[k,AF[k].fix?f:rollAf(k,L,f*gm*rnd(.85,1))]),e:0});
}
function genUniq(key,il){
  const U=UNIQ[key],L=Math.max(il,U.req),gm=GRADES[U.g].m;
  return finishItem({s:U.s,g:U.g,il:L,rq:U.req,b:U.n,n:U.n,u:key,h:U.h||null,at:baseStatsFor(U.s,L,GRADES[U.g].bm),af:U.af.map(([k,f])=>[k,AF[k].fix?f:rollAf(k,L,f*gm*rnd(.85,1))]),e:0});
}
const itemPrice=it=>Math.round((10+it.il*3)*GRADES[it.g].sell*(1+(it.e||0)*.3));
function canEquip(ps,it){
  if(it.rq>ps.lvl)return `요구 레벨 ${it.rq}`;
  if(it.h&&it.h!==HEROES[ps.hero].id)return `${HEROES.find(h=>h.id===it.h).name} 전용`;
  return null;
}
function eqSlotFor(r,it){if(it.s!=='ring')return it.s;return !r.eq.ring1?'ring1':!r.eq.ring2?'ring2':'ring1'}
/* 가방의 아이템 장착 (이전 장비는 가방으로) */
function equipItem(ps,bi,slotKey){
  const r=ps.rpg,it=r.bag[bi];if(!it)return '아이템 없음';
  const why=canEquip(ps,it);if(why)return why;
  const sk=slotKey&&slotType(slotKey)===it.s?slotKey:eqSlotFor(r,it),old=r.eq[sk];
  r.eq[sk]=it;r.bag.splice(bi,1);if(old)r.bag.splice(bi,0,old);
  recalc(ps);return null;
}
function unequipItem(ps,sk){
  const r=ps.rpg;if(!r.eq[sk])return '빈 칸';
  if(bagFull(r,r.eq[sk].g))return `${GRADES[r.eq[sk].g].n} 보관함이 가득 찼습니다`;
  r.bag.push(r.eq[sk]);delete r.eq[sk];recalc(ps);return null;
}
const BAG_PER=100,BAG_MAX=BAG_PER*6;/* 등급별 보관함 100칸씩 */
const bagCount=(r,g)=>r.bag.reduce((n,i)=>n+(i.g===g?1:0),0);
const bagFull=(r,g)=>bagCount(r,g)>=BAG_PER;
function salvageGain(it){const rk=GRADES[it.g].rank;return{stone:[1,2,3,3,4,6][rk]+Math.floor((it.e||0)/2),frag:[0,0,1,2,3,6][rk]}}

/* ---------- 대장간 ---------- */
const ENH_MAX=15,ENH_RATE=[100,100,95,90,80,70,60,50,40,35,30,25,20,15,10];
const enhCost=it=>({gold:Math.round((40+it.il*8)*(it.e+1)*(1+it.e*.25)),stone:1+Math.floor(it.e/2)});
function enhanceItem(ps,it){
  if(it.e>=ENH_MAX)return{msg:'최대 강화 단계입니다'};
  const c=enhCost(it),r=ps.rpg;
  if(r.gold<c.gold)return{msg:'금화가 부족합니다'};
  if(r.mats.stone<c.stone)return{msg:'강화석이 부족합니다'};
  r.gold-=c.gold;r.mats.stone-=c.stone;
  if(Math.random()*100<ENH_RATE[it.e]){it.e++;recalc(ps);return{ok:true,msg:`강화 성공! +${it.e}`}}
  if(it.e>=7){it.e--;recalc(ps);return{msg:`강화 실패... +${it.e} 로 하락`}}
  return{msg:'강화 실패...'};
}
const rerollCost=it=>({gold:Math.round(80+it.il*12),frag:1+GRADES[it.g].rank});
function rerollItem(ps,it){
  if(it.g!=='rare'&&it.g!=='epic')return{msg:'레어 · 에픽 장비만 재련할 수 있습니다'};
  const c=rerollCost(it),r=ps.rpg;
  if(r.gold<c.gold)return{msg:'금화가 부족합니다'};
  if(r.mats.frag<c.frag)return{msg:'비급 조각이 부족합니다'};
  r.gold-=c.gold;r.mats.frag-=c.frag;
  const nw=genItem(it.il,it.g,{slot:it.s});it.af=nw.af;it.n=nw.n;recalc(ps);
  return{ok:true,msg:'재련 완료! 옵션이 새로 부여되었습니다'};
}
/* 스킬 강화 (+0 ~ +10, +5·+10 각성) */
const SKE_MAX=10,SKE_RATE=[100,100,90,80,70,60,50,40,30,25];
const skEnhCost=e=>({gold:Math.round(150*(e+1)*(e+1)),frag:e+1});
function enhanceSkill(ps,id){
  const r=ps.rpg,e=r.enh[id]||0;
  if(!r.sk[id])return{msg:'먼저 스킬을 배워야 합니다'};
  if(e>=SKE_MAX)return{msg:'최대 강화 단계입니다'};
  const c=skEnhCost(e);
  if(r.gold<c.gold)return{msg:'금화가 부족합니다'};
  if(r.mats.frag<c.frag)return{msg:'비급 조각이 부족합니다'};
  r.gold-=c.gold;r.mats.frag-=c.frag;
  if(Math.random()*100<SKE_RATE[e]){r.enh[id]=e+1;recalc(ps);return{ok:true,msg:`스킬 강화 성공! +${e+1}`+(e+1===5?'  — 각성 I 해방!':e+1===10?'  — 각성 II 해방!':'')}}
  return{msg:'스킬 강화 실패... (재료 소모)'};
}
/* 스킬 레벨 업 */
function learnSkill(ps,id){
  const r=ps.rpg,s=SKILLS[id],rk=r.sk[id]||0;
  if(r.skillPts<=0)return '스킬 포인트가 없습니다';
  if(ps.lvl<s.lv)return `레벨 ${s.lv} 필요`;
  if(rk>=s.max)return '최대 레벨입니다';
  if(rk>=ps.lvl-s.lv+1)return `다음 레벨은 캐릭터 Lv.${s.lv+rk} 필요`;
  if(s.ti>0){const pre=HSK[s.hero].find(o=>o.tr===s.tr&&o.ti===s.ti-1);if(!r.sk[pre.id])return `선행 스킬 「${pre.n}」 필요`}
  r.sk[id]=rk+1;r.skillPts--;
  if(!rk&&ACTIVE_TY[s.ty]&&!r.hot.includes(id)){const e=r.hot.indexOf(null);if(e>=0)r.hot[e]=id}
  recalc(ps);return null;
}
function resetBuild(ps){
  const r=ps.rpg,h=HEROES[ps.hero],a=HATTR[h.id];
  let pts=0;for(const id in r.sk)pts+=r.sk[id];
  r.skillPts+=pts-1;r.sk={};r.sk[h.id+'_00']=1;r.hot=[null,null,null,null];
  r.statPts+=(r.str-a[0])+(r.dex-a[1])+(r.vit-a[2])+(r.ene-a[3]);r.str=a[0];r.dex=a[1];r.vit=a[2];r.ene=a[3];
  recalc(ps);
}

/* ---------- 드랍 ---------- */
function dropGear(x,y,it){Wd.items.push({kind:'gear',gear:it,x:dropX(x+rnd(-8,8)),y:clamp(y+rnd(-8,8),GT+10,GB-5),z:30,vz:5,t:0,keep:true});
  if(GRADES[it.g].rank>=3){Wd.fx.push({type:'pillar',x,y,t:0,life:70,w:36,col:GRADES[it.g].c});sfx('treasure')}}
function dropCoin(x,y,amt){Wd.items.push({kind:'coin',amt,x:dropX(x+rnd(-20,20)),y:clamp(y+rnd(-10,10),GT+10,GB-5),z:30,vz:5,t:0})}
function dropMat(x,y,m,n){Wd.items.push({kind:'mat',mat:m,n:n||1,x:dropX(x+rnd(-20,20)),y:clamp(y+rnd(-10,10),GT+10,GB-5),z:30,vz:5,t:0,keep:true})}
function rpgDrops(e,k){
  const s=k&&k.ps?k.ps.st:{mf:0,gf:0},L=e.lv||stageLv(),hs=partyHeroes();
  let n=0,mode='normal';
  if(e.boss&&!e.mid){n=3+(Math.random()<.5?1:0)+(G.np===2?1:0);mode='boss'}
  else if(e.mid){n=2;mode='elite'}
  else if(e.elite){n=1+(Math.random()<.35?1:0);mode='elite'}
  else if(e.officer)n=Math.random()<.45?1:0;
  else n=Math.random()<.07*D().drop*(1+s.mf/250)?1:0;
  for(let i=0;i<n;i++)dropGear(e.x+rnd(-50,50),e.y,genItem(L+(mode==='boss'?2:0),rollGrade(s.mf,mode),{heroes:hs}));
  const coins=e.boss&&!e.mid?6:e.elite||e.mid?3:e.officer?2:Math.random()<.35?1:0;
  for(let i=0;i<coins;i++)dropCoin(e.x,e.y,Math.max(1,Math.round(rnd(3,8)*(1+L*.35)*(1+s.gf/100)*(e.boss?2:1))));
  if(e.boss&&!e.mid){dropMat(e.x,e.y,'stone',2+((Math.random()*3)|0));dropMat(e.x,e.y,'frag',1+(G.cycle>0?1:0))}
  else if((e.elite||e.officer||e.mid)&&Math.random()<.3)dropMat(e.x,e.y,Math.random()<.8?'stone':'frag',1);
}
function pickupRpg(it,p){
  const r=p.ps.rpg;
  if(it.kind==='coin'){r.gold+=it.amt;sfx('item');Wd.fx.push({type:'text',x:p.x,y:p.y,z:110,t:0,life:34,txt:`금화 +${it.amt}`,col:'#ffd860',size:15});return true}
  if(it.kind==='mat'){r.mats[it.mat]+=it.n;sfx('item');Wd.fx.push({type:'text',x:p.x,y:p.y,z:110,t:0,life:44,txt:`${it.mat==='stone'?'강화석':'비급 조각'} +${it.n}`,col:it.mat==='stone'?'#c8d8e8':'#e8b8ff',size:16});return true}
  if(it.kind==='gear'){
    if(bagFull(r,it.gear.g)){if(!it.warnT||Wd.t-it.warnT>90){it.warnT=Wd.t;hudTxt(p,`${GRADES[it.gear.g].n} 보관함이 가득 찼습니다! [Tab]`,'#ff8080',16)}return false}
    it.gear.nw=true;r.bag.push(it.gear);const g=GRADES[it.gear.g];sfx(g.rank>=3?'treasure':'item');
    Wd.fx.push({type:'text',x:p.x,y:p.y,z:118,t:0,life:60,txt:`[${g.n}] ${it.gear.n}`,col:g.c,size:g.rank>=3?20:16});
    if(g.rank>=4)showMsg(`${g.n} 장비 「${it.gear.n}」 획득!`,'',false);
    return true}
  return false;
}

/* ---------- 정예 몬스터 ---------- */
function makeElite(e){
  const n=1+(Math.random()<.4+.15*G.cycle?1:0)+(G.cycle>=2&&Math.random()<.4?1:0);
  const ks=Object.keys(ELITE).sort(()=>Math.random()-.5).slice(0,n);
  e.elite=ks;e.hp=e.maxhp=Math.round(e.maxhp*(ks.includes('tough')?3.6:2.4));e.pow=Math.round(e.pow*(ks.includes('mighty')?1.6:1.2));
  if(ks.includes('swift')){e.spd*=1.5;e.cd*=.6}
  e.exp*=3;e.score*=3;e.look=Object.assign({},e.look,{scale:(e.look.scale||1)*1.12});e.lv+=2;e.eT=rnd(60,200)|0;
}
function eliteTick(e){
  if(!e.elite||e.dead)return;
  if(e.elite.includes('thunder')&&--e.eT<=0){e.eT=240;const q=tgtOf(e);if(q)Wd.hz.push({x:q.x,y:q.y,t:0,delay:40,r:56,owner:'e',kind:'bolt',dmg:Math.round(e.pow*1.2)})}
  if(e.elite.includes('fiery')&&e.t%4===0)emit({x:e.x+rnd(-14,14),y:e.y,z:rnd(20,90),vz:rnd(1,2),col:'#ff7020',size:8,life:16});
  if(e.elite.includes('frost')&&e.t%6===0)emit({x:e.x+rnd(-14,14),y:e.y,z:rnd(20,90),vz:.5,col:'#bff0ff',size:6,life:18,type:'sq'});
}

/* ---------- 저장 · 불러오기 ---------- */
const SAVE_SLOTS=4;/* 0 = 자동 저장 */
const saveKey=i=>'kov_rpg_save_'+i;
function serialize(){
  return JSON.stringify({v:2,t:Date.now(),np:G.np,diffIdx:G.diffIdx,cycle:G.cycle,prog:G.prog,done:G.done,treasures:G.treasures,clears:G.clears,flags:G.flags||{},lampSaved:G.lampSaved,
    pl:G.pl.map(s=>({hero:s.hero,lvl:s.lvl,exp:s.exp,score:s.score,inv:s.inv,sel:s.sel,cont:s.cont,rpg:s.rpg}))});
}
function saveGame(slot){try{localStorage.setItem(saveKey(slot),serialize());return true}catch(e){return false}}
function readSave(slot){try{const s=localStorage.getItem(saveKey(slot));return s?JSON.parse(s):null}catch(e){return null}}
function deleteSave(slot){try{localStorage.removeItem(saveKey(slot))}catch(e){}}
function applyTreasures(){const T=G.treasures,F=G.flags||{};G.spB=T.book?1.3:1;G.def=(T.seal?.8:1)*(F.hy==='gi'?.95:1);G.tPow=T.sword?4:0;G.spdB=T.horse?.7:0;G.atkM=F.hy==='pae'?1.05:1}
function loadGame(slot){
  const d=readSave(slot);if(!d||!d.pl)return false;
  numPlayers=d.np;diffIdx=d.diffIdx;
  G={np:d.np,diffIdx:d.diffIdx,treasures:d.treasures||{},def:1,spB:1,tPow:0,spdB:0,cycle:d.cycle||0,prog:(d.v||1)<2?Math.max(0,ORDER.indexOf(d.prog||0)):(d.prog||0),done:!!d.done,clears:d.clears||{},flags:d.flags||{},lampSaved:d.lampSaved,slot:slot||null,
    pl:d.pl.map((q,i)=>{const ps=mkPS(i,q.hero);Object.assign(ps,q,{idx:i,out:false});
      const base=newRpg(q.hero);ps.rpg=Object.assign(base,q.rpg);ps.rpg.mats=Object.assign({stone:0,frag:0},q.rpg.mats);return ps})};
  applyTreasures();G.pl.forEach(recalc);Wd=null;
  toCamp();return true;
}
function saveDesc(d){
  if(!d)return null;
  const dt=new Date(d.t),pad=n=>String(n).padStart(2,'0');
  return{heroes:d.pl.map(q=>`${HEROES[q.hero].name} Lv.${q.lvl}`).join(' · '),
    info:`${cycleName(d.cycle||0)} · ${d.done?'천하 평정':STAGES[ORDER[Math.min((d.v||1)<2?Math.max(0,ORDER.indexOf(d.prog||0)):(d.prog||0),LAST_ORD)]].title.replace(/\s+/g,' ')} · ${DIFFS[d.diffIdx].name} · ${d.np}P`,
    date:`${dt.getFullYear()}.${pad(dt.getMonth()+1)}.${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`};
}

/* ---------- 군영(마을) ---------- */
let campMsg=null;
function toCamp(msg){
  for(const s of G.pl){recalc(s);s.hpCarry=s.st.maxhp;s.mp=0;s.out=false;s.lives=DIFFS[G.diffIdx].lives}
  if(Wd)Wd.allies=[];
  PT.length=0;
  campMsg=msg?{txt:msg,t:0}:null;
  saveGame(0);
  scene='camp';campIdx=0;campSub=null;
}
