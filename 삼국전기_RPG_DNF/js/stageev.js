'use strict';
/* ===== 전장 이벤트 · 목표 · 군영 인물 =====
   · 전장 대화: 위치 · 웨이브 · 보스 등장 · 보스 체력 · 클리어 시점에 초상화 대화창 (무장별 대사 분기)
   · 전장 목표: 호뢰관 성문 돌파 · 장판파 미부인 호위 · 적벽 화공(불똥 + 황개 원군) · 화용도 추격 시간 · 오장원 칠성등 방어
   · 군영: 유비 · 제갈량 · 미축이 진행도에 따라 다른 이야기를 한다 */

/* ---------- 등장인물 외형 ---------- */
const NPC_LOOK={
  '유비':{skin:'#f2d2aa',hair:'#1a1410',body:'#e8d49a',sub:'#2f7d3b',pants:'#3a4a2a',boots:'#2a1a10',hat:'taoist',beard:'short',weapon:'sword',dual:true,armor:'robe',cape:'#2f6a3a',face:'normal',eye:'#4a3020'},
  '미부인':{skin:'#f8dcc4',hair:'#1a1020',body:'#f2e2f2',sub:'#a060c0',pants:'#8a6a9a',boots:'#6a4a7a',hat:'diao',hs:'long_f',armor:'dress',face:'female',weapon:'baby',eye:'#6a3a8a'},
  '황개':{skin:'#e0b890',hair:'#dddddd',body:'#8a2a1a',sub:'#d8b040',pants:'#4a2a1a',boots:'#2a1a10',hat:'helm2',helmc:'#8a6a3a',beard:'white',weapon:'bigdao',armor:'plate',cape:'#6a1a10',face:'fierce'},
  '미축':{skin:'#f0cca0',hair:'#2a2018',body:'#8a5a2a',sub:'#e0b040',pants:'#4a3a20',boots:'#2a1a10',hat:'taoist',beard:'short',weapon:'none',armor:'robe',face:'calm'},
  '병사':{skin:'#e8c098',hair:'#1a1410',body:'#3a6a3a',sub:'#c8b060',pants:'#2a3a2a',boots:'#1a1a1a',hat:'helm',helmc:'#5a6a50',armor:'cloth',weapon:'spear',face:'normal'},
  '전령':{skin:'#e8c098',hair:'#1a1410',body:'#8a6a2a',sub:'#e0c060',pants:'#3a2a1a',boots:'#1a1a1a',hat:'helm',helmc:'#8a7040',armor:'cloth',weapon:'flag',flagc:'#2f7d3b',flagt:'漢',face:'normal'}};
function lookOf(name){
  if(name==='@')return G&&G.pl?HEROES[G.pl[0].hero].look:HEROES[0].look;
  if(NPC_LOOK[name])return NPC_LOOK[name];
  const h=HEROES.find(h=>h.name===name);if(h)return h.look;
  const s=STAGES.find(s=>s.boss&&s.boss.name===name);if(s)return s.boss.look;
  if(MIDBOSS.name===name)return MIDBOSS.look;
  return NPC_LOOK['병사'];
}
/* 대사: 문자열 또는 {무장id:대사, def:기본} — 첫 번째 플레이어 무장에 맞춰 고른다 */
const heroIds=()=>G?G.pl.map(s=>HEROES[s.hero].id):[];
function pickLine(v){if(typeof v==='string')return v;const hy=G&&G.flags&&G.flags.hy;if(hy&&v['$'+hy])return v['$'+hy];const ids=heroIds();for(const id of ids)if(v[id])return v[id];return v.def||''}
function speakerName(n){return n==='@'?HEROES[G.pl[0].hero].name:n}
/* 화자가 플레이어 무장이면 다른 인물로 바꿔 말하게 함 (예: 장비로 플레이 중이면 장비 대사는 관우가) */
function altSpeaker(n,alt){return heroIds().some(id=>HEROES.find(h=>h.id===id).name===n)?alt:n}

/* ---------- 전장 이벤트 정의 ---------- */
const TIP='안내';
const STAGE_EV=[
 /* 제1장 탁현 */
 [{t:40,pause:true,talk:[['유비','황건적이 탁현까지 몰려왔소! 백성들을 지켜 주시오!'],
    ['@',{guan:'형님, 이 청룡도가 길을 열겠소.',zhang:'하하! 누런 두건 놈들은 이 장비에게 맡기시오, 형님!',zhuge:'…아직 때가 아니나, 백성을 버려둘 수는 없지요.',lubu:'흥, 도적 떼 따위. 몸풀기로 딱 좋군.',diao:'백성이 우는 소리는 차마 못 듣겠어요. 제가 가겠어요.',def:'맡겨 주십시오, 유비 공!'}]]},
  {wave:2,talk:[[TIP,'방패병은 정면 공격을 막는다! 뒤를 잡거나 3타 · 돌진 · 점프 공격 같은 강한 일격으로 방패를 깨라.']]},
  {wave:3,talk:[['유비','저 누런 깃발을 꺾으시오! 기수가 쓰러지면 적의 사기가 무너질 것이오.']]},
  {boss:true,talk:[['장각','창천은 이미 죽었다! 누런 하늘이 선다!'],['@',{zhuge:'요술로 민심을 홀린 죄, 오늘 묻겠소.',def:'백성을 속인 요술도 오늘로 끝이다!'}]]},
  {bossHp:.69,talk:[['유비','부적 기둥이 요술의 근원이오! 기둥부터 부수시오!']]},
  {clear:true,talk:[['유비','고맙소. 의용군의 이름이 이제 천하에 퍼질 것이오.']]}],
 /* 제2장 호뢰관 */
 [{t:40,talk:[['유비','제후들이 모두 머뭇거리는구려. 호뢰관의 문을 여는 건 우리 몫이오.']]},
  {wave:2,talk:[[TIP,'서량 철기다! 붉은 돌격선이 깔리면 옆 줄로 피하거나 점프하라.']]},
  {gate:'near',pause:true,talk:[['유비','성문이 굳게 닫혔소! 문을 부숴야 앞으로 나갈 수 있소!'],[TIP,'성문을 공격하라. 수비병이 계속 쏟아져 나온다!']]},
  {gate:'broken',talk:[[()=>altSpeaker('장비','관우'),'문이 열렸다! 여포 놈은 어디 있느냐!']]},
  {boss:true,talk:[['여포',{lubu:'가짜 여포? 우습군. 진짜 방천화극 맛을 보여 주마!',diao:'초선…? 네가 어찌 이 전장에…!',def:'하찮은 것들. 셋이 오든 넷이 오든 매한가지다!'}]]},
  {bossHp:.64,talk:[['유비','적토마에 올랐소! 돌격선을 보고 피하시오!']]},
  {clear:true,talk:[['@',{lubu:'천하무쌍은 둘일 수 없다. 기억해 둬라.',diao:'봉선… 이제 당신을 놓아줄게요.',def:'천하무쌍도 결국 사람이었군.'}]]}],
 /* 제3장 장판파 */
 [{t:40,pause:true,talk:[['미부인','장군… 아두만은 꼭 살려 주세요.'],
    ['@',{zhao:'상산 조자룡이 있는 한, 누구도 손끝 하나 대지 못합니다!',zhang:'형수님, 이 장비 뒤에만 계시오!',def:'제 뒤를 떨어지지 말고 따라오십시오!'}],[TIP,'미부인을 지키며 전진하라! 미부인이 쓰러지면 퇴각한다.']]},
  {wave:2,talk:[['하후은','승상께서 하사하신 청강검이다! 함부로 덤비면 벤다.'],[TIP,'하후은이 검을 세우면 반격 태세 — 그때는 공격을 멈춰라!']]},
  {wave:3,talk:[['미부인','꺄악! 저쪽에서 병사들이…!']]},
  {boss:true,talk:[[()=>altSpeaker('장비','조운'),'장판교는 내가 지킨다! 허저, 덤벼라!'],['허저','호치 허중강이다! 머리통을 박살내 주마!'],[TIP,'허저에게 붙잡히면 공격 키를 연타해 빠져나와라!']]},
  {clear:true,esc:true,talk:[['미부인','은혜는 평생 잊지 않겠어요…'],['@',{zhao:'주공의 핏줄을 지켰으니, 여한이 없습니다.',def:'무사하셔서 다행입니다.'}]]}],
 /* 제4장 적벽 */
 [{t:40,talk:[[()=>altSpeaker('제갈량','유비'),'동남풍이 불기 시작했소. 황개 장군의 화선이 곧 닿을 것이오.']]},
  {t:260,fire:true,talk:[['황개','불화살을 퍼부어라! 조조의 배를 모조리 태워라!'],[TIP,'불똥이 떨어지는 주황 원을 피하라 — 적도 함께 탄다!']]},
  {wave:3,ally:'황개',talk:[['황개','늙은 몸이지만 한 팔 거들겠소!']]},
  {boss:true,talk:[['장료','장문원이 여기 있다! 불길 따위에 물러서지 마라!']]},
  {bossHp:.64,talk:[[TIP,'세 줄 기병 돌격! 붉은 줄에서 벗어나거나 타이밍 맞춰 점프하라.']]},
  {clear:true,talk:[['황개','하하! 고육지계로 맞은 곤장 값은 톡톡히 받았소!']]}],
 /* 제5장 화용도 */
 [{t:40,pause:true,talk:[[()=>altSpeaker('제갈량','유비'),'조조가 화용도로 달아났소! 날이 밝기 전에 따라잡아야 하오.'],[TIP,'추격 시간 안에 조조에게 닿으면 기습 성공! 늦으면 조조가 전열을 가다듬는다.']]},
  {wave:2,talk:[['전령','조조의 패잔병이 길을 막고 있습니다!']]},
  {boss:true,talk:[['조조','하하하! 제갈량도 여기 복병은 생각 못 했… 뭐, 뭐냐!'],
    ['@',{guan:'승상. 옛 은혜는 잊지 않았으나, 오늘은 길을 비켜드릴 수 없소.',lubu:'조조! 백문루의 빚을 갚으러 왔다!',def:'난세의 간웅, 여기서 끝이다!'}]]},
  {bossHp:.59,talk:[[TIP,'분신술! 진짜 조조는 한 대 맞아도 연기로 사라지지 않는다.']]},
  {clear:true,talk:[['조조','…오늘은 내가 졌다. 하지만 천하는 아직 끝나지 않았다!']]}],
 /* 비장 오장원 */
 [{t:40,pause:true,talk:[[()=>altSpeaker('제갈량','유비'),'칠성등이 꺼지면 승상의 명도 다하오. 부디 등불을 지켜 주시오.'],[TIP,'칠성등을 지켜라! 적의 일부는 등불을 노린다.']]},
  {boss:true,talk:[['사마의','공명, 하늘의 뜻은 거스를 수 없소.'],['@',{zhuge:'하늘이 정한 명이라면, 오늘 밤만은 사람의 뜻으로 바꾸겠소.',def:'하늘이 정했다면, 우리가 바꾸면 그만이다!'}]]},
  {clear:true,lamp:true,talk:[[()=>altSpeaker('제갈량','유비'),'별이… 다시 빛나는구려. 한실을 일으킬 시간이 생겼소.']]}],
 /* 제3장 백마 */
 [{t:40,pause:true,talk:[['전령','원소군 선봉 안량이 백마를 포위했습니다! 어서 구원을!'],
    ['@',{guan:'…승상께 입은 은혜, 안량의 목으로 갚고 형님께 돌아가리라.',zhang:'형님들 소식은 모르겠고, 일단 눈앞의 놈들부터 쓸어버린다!',lubu:'하비성에서 죽었어야 할 몸… 덤으로 얻은 목숨이니 마음껏 날뛰어 주마.',def:'백마를 구하라!'}]]},
  {wave:2,talk:[['병사','하북 철기가 몰려옵니다! 붉은 돌격선을 조심하십시오!']]},
  {wave:3,talk:[['전령','원(袁)의 깃발이다! 저 기수를 베면 적진이 흔들립니다!']]},
  {boss:true,talk:[['안량','하북의 안량이다! 누가 감히 나와 겨루겠느냐!'],['@',{guan:'청룡도를 보고도 모르겠느냐. 네 목을 가지러 왔다.',def:'그 목, 내가 가져가마!'}]]},
  {bossHp:.59,talk:[[TIP,'안량이 말에 올랐다! 돌격선을 보고 피한 뒤 등 뒤를 쳐라.']]},
  {clear:true,talk:[['@',{guan:'안량의 목을 베었다. 이제 승상께 작별을 고할 때로다.',def:'하북 제일의 장수도 별것 아니었군.'}]]}],
 /* 제4장 박망파 */
 [{t:40,pause:true,talk:[[()=>altSpeaker('제갈량','유비'),'하후돈을 박망파 깊숙이 끌어들이시오. 신호가 오르면 불을 놓겠소.'],[()=>altSpeaker('장비','관우'),'흥, 서생의 계책이 먹히나 두고 보겠소.']]},
  {wave:3,fire:true,talk:[['전령','신호다! 불을 놓아라!'],[TIP,'불똥이 떨어진다 — 주황 원을 피하고, 적을 불길 속으로 몰아넣어라!']]},
  {boss:true,talk:[['하후돈','서생 하나의 잔꾀 따위, 이 하후돈이 짓밟아 주마!']]},
  {bossHp:.59,talk:[[TIP,'하후돈의 포효는 몸을 굳게 만든다. 푸른 원 밖으로 피하라!']]},
  {clear:true,talk:[[()=>altSpeaker('장비','관우'),'…허, 공명 선생. 내가 졌소. 앞으로 선생의 말을 따르리다.'],[()=>altSpeaker('제갈량','유비'),'이제 시작일 뿐이오. 조조의 본대가 곧 남하할 것이오.']]}],
 /* 제8장 정군산 */
 [{t:40,pause:true,talk:[['유비',{$gi:'화용도에서 살려 보낸 조조가 한중을 지키라 하후연을 보냈소.',$pae:'조조를 사로잡았으나 위는 무너지지 않았소. 하후연이 한중을 지키고 있소.',def:'정군산만 넘으면 한중이오. 하후연을 베어야 하오.'}],
    ['@',{huang:'주공, 이 늙은이에게 맡겨 주시오. 하후연의 목은 이 활로 떨어뜨리리다.',ma:'하후연… 서량을 짓밟은 원수를 여기서 만나는구나.',def:'산마루의 적진을 뚫겠습니다!'}]]},
  {t:300,arrows:true,talk:[[TIP,'산비탈 궁수대의 화살비! 땅에 비치는 화살 그림자를 피하라.']]},
  {wave:3,talk:[['전령','법정 군사께서 산꼭대기에서 깃발을 흔드십니다! 총공격입니다!']]},
  {boss:true,talk:[['하후연','산 위에서 쏘는 화살은 피할 곳이 없다!'],['@',{huang:'노장의 화살을 받아라, 하후연!',def:'질풍이라도 멈춰 세워 주마!'}]]},
  {clear:true,talk:[['@',{huang:'하하! 칠순 노장의 활이 아직 쓸 만하지 않소!',def:'정군산을 손에 넣었다! 한중이 눈앞이다!'}],['유비','이제 한중왕의 깃발을 올릴 수 있겠소.']]}],
 /* 제9장 번성 */
 [{t:40,pause:true,talk:[['전령',{$gi:'조조가 전언을 보냈습니다 — "운장, 화용도의 빚은 잊지 않았소. 그러나 번성만은 내줄 수 없소."',$pae:'위의 새 주인 조비가 명했습니다 — "번성을 사수하라. 아버님의 원수를 갚으라!"',def:'우금의 칠군이 번성 구원에 나섰습니다!'}],
    ['@',{guan:'방덕이 관을 메고 왔다지. 그 충의만은 높이 사 주마.',def:'한수가 불어나고 있다… 때가 오고 있어.'}]]},
  {wave:3,flood:true,talk:[[()=>altSpeaker('관우','유비'),'둑을 터라! 한수로 칠군을 삼켜라!'],[TIP,'수공! 물길이 적진을 휩쓴다.']]},
  {boss:true,talk:[['방덕','관을 메고 왔다! 오늘 이 관에 들어갈 자는 누구냐!'],['@',{guan:'방덕, 네 충의는 인정하마. 허나 청룡도는 피하지 못한다.',ma:'방덕… 서량의 옛 벗이여, 어찌하여 적의 편에 섰는가!',def:'그 관, 네가 들어가게 될 것이다!'}]]},
  {bossHp:.59,talk:[[TIP,'방덕이 말에 올랐다! 연속 돌격을 조심하라.']]},
  {clear:true,talk:[['방덕','…무인으로 죽는다. 여한은 없다.'],['유비','번성의 물길이 천하를 흔들었소. 이제 천하는…']]}]
];

/* ---------- 대화창 ---------- */
function queueTalk(ev){
  const w=Wd;const lines=ev.talk.map(([sp,l])=>{const n=typeof sp==='function'?sp():sp;return{who:n,txt:pickLine(l)}}).filter(l=>l.txt);
  if(!lines.length)return;
  (w.talkQ||(w.talkQ=[])).push({lines,pause:!!ev.pause,i:0,t:0});
}
function talkActive(){return Wd&&Wd.talkQ&&Wd.talkQ.length?Wd.talkQ[0]:null}
function updTalk(){
  const T=talkActive();if(!T)return;
  T.t++;const L=T.lines[T.i],dur=Math.max(120,L.txt.length*6)+(T.pause?40:0);
  if((T.t>12&&hit('start'))||(T.pause&&T.t>12&&(hit('atk')))||T.t>=dur){T.i++;T.t=0;if(T.i>=T.lines.length)Wd.talkQ.shift()}
}
function drawTalk(){
  const T=talkActive();if(!T)return;
  const L=T.lines[T.i],x=W/2-300,y=H-176,w=600,h=74,a=Math.min(1,T.t/8);
  ctx.globalAlpha=a;
  ctx.fillStyle='rgba(12,6,2,.86)';ctx.fillRect(x,y,w,h);ctx.strokeStyle=L.who===TIP?'#70c0ff':'#d8a840';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  if(L.who===TIP){txt('◆ 전술 안내',x+14,y+16,13,'#90d0ff','left')}
  else{ctx.save();ctx.beginPath();ctx.rect(x+4,y+4,86,h-8);ctx.clip();ctx.fillStyle='rgba(80,40,10,.6)';ctx.fillRect(x+4,y+4,86,h-8);
    const lk=lookOf(L.who);renderModel(ctx,lk,{armL:-.35,armR:.1,wAng:-2.5,head:-.05,cape:.2},x+50,y+178/(lk.scale||1),1.55/(lk.scale||1),1,{});ctx.restore();
    txt(speakerName(L.who),x+100,y+16,15,'#ffd878','left',FONT,['#000',3])}
  const n=Math.min(L.txt.length,Math.floor(T.t*1.4)),s=L.txt.slice(0,n),tx=L.who===TIP?x+14:x+100,mw=L.who===TIP?w-28:w-114;
  ctx.font=`15px ${FONT}`;const ln=[];let cur='';for(const ch of s){if(ctx.measureText(cur+ch).width>mw){ln.push(cur);cur=ch}else cur+=ch}ln.push(cur);
  ln.slice(0,2).forEach((l,k)=>txt(l,tx,y+40+k*20,15,'#fff4e0','left'));
  if(n>=L.txt.length&&(frame>>4)%2)txt(T.pause?'▼ ENTER':'ENTER ▶',x+w-10,y+h-10,11,'#c8a860','right');
  ctx.globalAlpha=1;
}

/* ---------- 전장 목표 초기화 ---------- */
function stageEvInit(i){
  const w=Wd;w.evDone={};w.talkQ=[];w.escort=null;w.gate=null;w.chase=null;w.fireOn=false;w.arrowOn=false;w.failT=0;
  if(i===1){const gx=2150;w.gate={x:gx,hp:30,maxhp:30};w.props.push({kind:'gate',x:gx,y:GT+1,hp:30,maxhp:30,gate:true})}
  if(i===2){const p=w.ps[0];w.escort=mkNpc('미부인',p.x-90,p.y,Math.round(380*(1+.06*w.lv)))}
  if(i===4)w.chase={t:150*60};
  if(i===5){w.escort=mkNpc('칠성등',140,(GT+GB)/2,Math.round(420*(1+.05*w.lv)));w.escort.lamp=true}
}
function mkNpc(name,x,y,hp){return mkEnt({x,y,hp,maxhp:hp,look:name==='칠성등'?null:lookOf(name),npcName:name,escortNpc:true,facing:1,spd:2.7})}
const escortOn=()=>Wd.escort&&!Wd.escort.dead;
/* 적의 목표: 사냥꾼(hunt)은 호위 대상을 노린다 */
function huntTarget(e){return e.hunt&&escortOn()?Wd.escort:null}
function enemyTargets(){return escortOn()?Wd.ps.concat([Wd.escort]):Wd.ps}
function markHunter(e){if(Wd.escort&&!e.boss&&!e.ranged&&Math.random()<(Wd.escort.lamp?.4:.3))e.hunt=true}

/* ---------- 매 프레임 ---------- */
function stageEvTick(){
  const w=Wd,S=STAGE_EV[G.stage]||[],ps=w.ps.filter(p=>!p.out),lead=Math.max(0,...ps.map(p=>p.x));
  const b=w.enemies.find(e=>e.boss&&!e.mid);
  S.forEach((ev,k)=>{if(w.evDone[k])return;let go=false;
    if(ev.t!=null&&w.t>=ev.t)go=true;
    if(ev.wave!=null&&w.wave>=ev.wave)go=true;
    if(ev.boss&&w.bossSpawned&&b)go=true;
    if(ev.bossHp!=null&&b&&b.hp<=b.maxhp*ev.bossHp)go=true;
    if(ev.gate==='near'&&w.gate&&lead>w.gate.x-430)go=true;
    if(ev.gate==='broken'&&w.gate&&w.gate.broken)go=true;
    if(ev.clear&&w.clear===3)go=true;
    if(!go)return;
    if(ev.esc&&!escortOn())return;
    if(ev.lamp&&!escortOn())return;
    w.evDone[k]=true;queueTalk(ev);
    if(ev.fire)w.fireOn=true;
    if(ev.arrows)w.arrowOn=true;
    if(ev.flood)floodWave();
    if(ev.ally)spawnStoryAlly(ev.ally);
  });
  updTalk();
  /* 호뢰관 성문 */
  const gp=w.gate&&!w.gate.broken?w.props.find(p=>p.gate):null;
  if(gp){if(lead>gp.x-430&&w.lock===null&&!w.clear){w.lock=w.camX;w.gateLock=true}
    if(w.gateLock){for(const p of w.ps)p.x=Math.min(p.x,gp.x-40);
      if(w.t%240===0&&w.enemies.filter(e=>!e.dead).length<4){const e=spawnEnemy(Math.random()<.35?'a':Math.random()<.5?'sh':'s');e.x=gp.x+30;e.y=rnd(GT+15,GB-10);w.fx.push({type:'smoke',x:e.x,y:e.y,t:0,life:30})}}}
  /* 호위 · 칠성등 */
  if(w.escort)updEscort(w.escort);
  /* 적벽 화공: 불똥 (적도 탄다) */
  if(w.fireOn&&!w.clear&&w.t%170===0){const t=alivePs();for(let k=0;k<3;k++){const q=t[k%Math.max(1,t.length)],x=clamp((q?q.x:w.camX+W/2)+rnd(-220,220),w.camX+40,w.camX+W-40),y=rnd(GT+10,GB-5),dmg=Math.round(8+w.lv*1.6);
    w.hz.push({x,y,t:0,delay:62,r:70,owner:'e',kind:'fire',dmg,dur:30});w.hz.push({x,y,t:0,delay:62,r:70,owner:'p',pl:t[0]||w.ps[0],kind:'fire',dmg:dmg*3,dur:30,noProc:true})}}
  /* 정군산 화살비 */
  if(w.arrowOn&&!w.clear&&w.t%150===0){for(const q of alivePs())for(let k=0;k<2;k++)w.hz.push({x:clamp(q.x+rnd(-120,120),w.camX+30,w.camX+W-30),y:clamp(q.y+rnd(-30,30),GT+5,GB),t:0,delay:50,r:52,owner:'e',kind:'arrow',dmg:Math.round(6+w.lv*1.3)})}
  /* 화용도 추격 시간 */
  if(w.chase&&!w.bossSpawned&&w.chase.t>0)w.chase.t--;
  /* 패전 처리 */
  if(w.failT){w.failT++;if(w.failT>200){w.failT=0;toCamp(w.failMsg||'퇴각했다.')}}
}
/* 보스 등장 순간 (추격 결과 반영) */
function stageEvBoss(b){
  const w=Wd;
  if(w.chase){if(w.chase.t>0){b.hp=Math.round(b.maxhp*.8);showMsg('기습 성공! 조조가 허둥댄다 (체력 -20%)','',false)}
    else{for(let i=0;i<2;i++){const s=spawnEnemy('o');makeElite(s)}showMsg('추격이 늦었다… 조조가 전열을 가다듬었다!','',false)}}
  if(w.escort&&!w.escort.dead&&!w.escort.lamp){w.escort.hide=true}
}
/* 클리어 보상 */
function stageEvClear(){
  const w=Wd;
  if(w.escort&&!w.escort.dead&&!w.escort.lamp){const g=600*(G.stage+1)*(1+G.cycle);for(const s of G.pl)s.rpg.gold+=g;showMsg(`미부인과 아두를 지켜냈다! 금화 +${g}`,'',false)}
  if(w.escort&&w.escort.lamp){G.lampSaved=!w.escort.dead}
}
function updEscort(n){
  const w=Wd;n.t++;n.anim++;if(n.inv>0)n.inv--;if(n.flash>0)n.flash--;
  if(n.dead){downPhys(n);return}
  if(n.lamp){if(w.lock!==null&&!n.placed){n.x=w.camX+110;n.y=(GT+GB)/2;n.placed=true}if(w.lock===null){n.placed=false;n.x=Math.max(n.x,w.camX+110)}return}
  if(n.state==='down'){downPhys(n);if(n.z<=0&&n.t>50){n.state='idle';n.inv=40}return}
  if(n.state==='hurt'){if(n.t>(n.hurtLen||18))n.state='idle';return}
  const ps=alivePs();if(!ps.length)return;
  const trail=ps.reduce((a,p)=>p.x<a.x?p:a,ps[0]),danger=w.enemies.some(e=>!e.dead&&Math.abs(e.x-n.x)<70&&Math.abs(e.y-n.y)<30);
  if(!danger&&n.hp<n.maxhp&&w.t%30===0)n.hp=Math.min(n.maxhp,n.hp+Math.ceil(n.maxhp*.004));
  let tx=n.hide?w.camX+60:trail.x-100,ty=n.hide?GT+20:trail.y;
  if(danger&&!n.hide){n.state='idle';return}
  const mx=Math.abs(tx-n.x)>10?Math.sign(tx-n.x):0,my=Math.abs(ty-n.y)>6?Math.sign(ty-n.y):0;
  if(mx||my){n.state='walk';n.x+=mx*n.spd;n.y+=my*n.spd*.7;if(mx)n.facing=mx}else{n.state='idle';n.facing=1}
  n.x=clamp(n.x,w.camX+20,w.camX+W-20);n.y=clamp(n.y,GT+5,GB);
}
function escortDown(n){
  const w=Wd;
  if(n.lamp){showMsg('칠성등이 꺼졌다… 사마의의 기세가 드높아진다!','',false);const b=w.enemies.find(e=>e.boss&&!e.dead);if(b){b.pow=Math.round(b.pow*1.25)}return}
  showMsg('미부인이 쓰러졌다… 퇴각하라!','',false);w.failT=1;w.failMsg='장판파 패전 — 미부인을 지키지 못했다. (다시 도전할 수 있다)';
}
/* 이야기 원군 (적벽 황개) */
function spawnStoryAlly(name){
  const p=alivePs()[0];if(!p)return;const lk=lookOf(name);
  const a={x:Wd.camX-30,y:p.y,z:0,vz:0,vx:0,facing:1,state:'idle',t:0,anim:0,combo:1,look:lk,pl:p,life:30*60,dmg:Math.round(powOf(p)*1.3),reach:96,spd:3,cd:20,trail:[],hitIds:new Set(),isAlly:true,npcName:name};
  Wd.allies.push(a);
}

/* ---------- 그리기 ---------- */
function drawEscort(n,cx){
  const sx=n.x-cx;
  if(n.lamp){const y=n.y;ctx.fillStyle='rgba(0,0,0,.35)';ell(sx,y,40,10);
    if(!n.dead){ctx.globalCompositeOperation='lighter';for(let i=0;i<7;i++){const a=i/7*Math.PI*2,fl=.7+.3*Math.sin(frame*.2+i);ctx.globalAlpha=fl*.8;ctx.drawImage(glowSpr('#ffd070'),sx+Math.cos(a)*34-14,y-26+Math.sin(a)*10-14,28,28)}
      ctx.globalAlpha=.4;ctx.drawImage(glowSpr('#ffe8a0'),sx-60,y-90,120,100);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=sx+Math.cos(a)*34,yy=y-14+Math.sin(a)*10;ctx.fillStyle='#6a4a20';ctx.fillRect(x-2,yy,4,14);ctx.fillStyle=n.dead?'#333':'#ffe070';ctx.beginPath();ctx.ellipse(x,yy-2,3.5,5,0,0,Math.PI*2);ctx.fill()}
    txt('七星燈',sx,y-58,13,'#ffe8a0','center',HANJA,['#000',3])}
  else drawEnt(n,cx);
  if(!n.dead){const bw=56,x=sx-bw/2,y=n.y-(n.lamp?76:128);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(x-1,y-1,bw+2,7);ctx.fillStyle=n.hp<n.maxhp*.3?'#ff5050':'#70ff90';ctx.fillRect(x,y,bw*n.hp/n.maxhp,5);
    txt(n.lamp?'칠성등':n.npcName,sx,y-9,11,'#e8ffe8','center',FONT,['#000',3])}
}
function drawGate(pr,sx){
  const top=GT-150,bot=GB+14,x=sx,sh=pr.shake>0?Math.sin(pr.shake*2)*3:0;
  ctx.fillStyle='#3a2a1a';ctx.fillRect(x-38+sh,top,76,bot-top);
  const g=ctx.createLinearGradient(x-34,0,x+34,0);g.addColorStop(0,'#4a2a14');g.addColorStop(.5,'#7a4a24');g.addColorStop(1,'#3a200e');
  ctx.fillStyle=g;ctx.fillRect(x-32+sh,top+10,64,bot-top-14);
  ctx.strokeStyle='#1a0e06';ctx.lineWidth=2;for(let yy=top+10;yy<bot;yy+=26)line(x-32+sh,yy,x+32+sh,yy);
  ctx.fillStyle='#2a2a2e';for(let yy=top+24;yy<bot-6;yy+=26)for(let xx=-24;xx<=24;xx+=12){ctx.beginPath();ctx.arc(x+xx+sh,yy,2.6,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#5a3a1a';ctx.fillRect(x-40+sh,top+(bot-top)*.45,80,14);ctx.strokeRect(x-40+sh,top+(bot-top)*.45,80,14);
  const k=pr.hp/pr.maxhp;if(k<.66){ctx.strokeStyle='#120804';ctx.lineWidth=3;line(x-20+sh,top+60,x+6+sh,top+140);line(x+6+sh,top+140,x-8+sh,top+200)}
  if(k<.33){line(x+22+sh,top+90,x-4+sh,top+170);line(x-4+sh,top+170,x+16+sh,bot-30)}
  ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(x-40,top-16,80,8);ctx.fillStyle='#ffb040';ctx.fillRect(x-39,top-15,78*k,6);txt('성문',x,top-26,13,'#ffe0a0','center',FONT,['#000',3]);
}
function drawStageHUD(){
  const w=Wd;
  if(w.chase&&!w.bossSpawned){const s=Math.ceil(w.chase.t/60),m=Math.floor(s/60),ss=String(s%60).padStart(2,'0');
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(W/2-90,8,180,30);ctx.strokeStyle=s<30?'#ff5040':'#ffd24a';ctx.strokeRect(W/2-90,8,180,30);
    txt(`조조 추격 ${m}:${ss}`,W/2,24,16,s<30&&(frame>>4)%2?'#ff7060':'#ffe8a8','center',FONT,['#000',3])}
  if(w.escort&&!w.escort.dead&&w.escort.hp<w.escort.maxhp*.35&&(frame>>4)%2)txt(w.escort.lamp?'칠성등이 위험하다!':'미부인이 위험하다!',W/2,56,16,'#ff7060','center',FONT,['#000',4]);
  drawTalk();
}

/* ---------- 군영 인물 ---------- */
const CAMP_TALK=[
  [['유비','탁현의 백성들이 아직 불안에 떨고 있소. 황건적을 몰아내야 하오.'],['미축','의용군에 보탤 군자금이오. 필요한 물건이 있으면 말씀하시오.']],
  [['유비','동탁이 낙양을 불태웠다 하오. 호뢰관만 넘으면 역적을 칠 수 있소.'],['미축','서량 철기는 말발굽이 무섭다 하오. 옆으로 비켜서는 게 상책이오.']],
  [['유비','하비성에서 흩어진 뒤로 운장과 익덕의 소식이 없소… 부디 무사하기를.'],['미축','원소군 방패병은 등 뒤가 허술하다 하오.']],
  [['제갈량','박망파의 길은 좁고 바람은 서쪽에서 부오. 불을 놓기에 좋은 날이오.'],['유비','공명 선생을 모셨으니 이제야 날개를 얻은 기분이오.']],
  [['유비','백성 십만이 우리를 따르고 있소. 버리고 갈 수는 없소.'],['미축','장판파 길목이 험하오. 미부인을 부탁드리오.']],
  [['제갈량','동남풍은 사흘 밤을 불 것이오. 그 안에 승부를 내야 하오.'],['유비','강동과의 동맹이 깨지지 않도록 조심해야 하오.']],
  [['제갈량','화용도… 조조는 반드시 그 길로 달아날 것이오.'],['유비','그를 놓아줄지 사로잡을지, 그대들의 뜻에 맡기겠소.']],
  [['유비',{$gi:'운장이 화용도에서 조조를 놓아주었다지. 그것이 운장다운 선택이오.',$pae:'조조를 사로잡았으나 위는 조비와 사마의가 이끈다 하오. 방심은 이르오.',def:'한중만 얻으면 우리도 기반이 생기오.'}],['제갈량','정군산의 하후연은 빠르오. 노장 황충이 적임이오.']],
  [['제갈량','가을 장마가 깊소. 한수의 물이 곧 둑을 넘을 것이오.'],['유비','운장, 번성을 얻거든 무리하지 말고 돌아오시오.']],
  [['제갈량','별이 흔들리는구려… 세 보물이 모였다면, 하늘도 한 번은 기회를 줄 것이오.'],['유비','공명, 부디 몸을 아끼시오.']]];
function campNpcs(){const pr=Math.min(G.prog||0,9),ids=heroIds(),L=[['유비',168]];if(pr>=3&&!ids.includes('zhuge'))L.push(['제갈량',252]);L.push(['미축',62]);return L}
function drawCampNpcs(){
  if(!G)return;const pr=G.done?9:Math.min(G.prog||0,9),T=CAMP_TALK[pr],L=campNpcs();
  for(const [n,x] of L)renderModel(ctx,lookOf(n),poseOf({look:lookOf(n),state:'idle',anim:frame+x,t:0}),x,470,1.25,-1,{});
  const k=Math.floor(frame/360)%T.length,who=T[k][0],line=pickLine(T[k][1]),spot=L.find(l=>l[0]===who)||L[0],a=Math.min(1,(frame%360)/20,(360-frame%360)/20);
  ctx.globalAlpha=a;ctx.font=`bold 13px ${FONT}`;const tw=Math.min(360,ctx.measureText(line).width+24),bx=clamp(spot[1]-tw/2,10,W-520-tw),by=256;
  ctx.fillStyle='rgba(255,248,230,.94)';ctx.fillRect(bx,by,tw,44);ctx.strokeStyle='#8a5a20';ctx.lineWidth=2;ctx.strokeRect(bx,by,tw,44);
  ctx.fillStyle='rgba(255,248,230,.94)';ctx.beginPath();ctx.moveTo(spot[1]-6,by+44);ctx.lineTo(spot[1]+6,by+44);ctx.lineTo(spot[1],by+54);ctx.fill();
  txt(who,bx+10,by+12,11,'#8a3a10','left');
  const words=[];let cur='';ctx.font=`12px ${FONT}`;for(const ch of line){if(ctx.measureText(cur+ch).width>tw-20){words.push(cur);cur=ch}else cur+=ch}words.push(cur);
  words.slice(0,2).forEach((l,j)=>txt(l,bx+10,by+26+j*14,12,'#2a1a0a','left'));
  ctx.globalAlpha=1;
}
/* 성문 타격 */
function hitGate(pr){
  const w=Wd;pr.hp--;pr.shake=10;sfx('break');w.shake=Math.max(w.shake,4);
  for(let i=0;i<4;i++)w.fx.push({type:'debris',x:pr.x-20,y:rnd(GT,GB),z:rnd(20,90),vx:rnd(-5,-1),vz:rnd(2,6),t:0,life:36,col:'#6a4020'});
  if(pr.hp>0)return;
  pr.broken=true;w.gate.broken=true;w.gateLock=false;w.lock=null;w.go=150;w.flashT=12;w.shake=24;sfx('bomb');
  for(let i=0;i<24;i++)w.fx.push({type:'debris',x:pr.x,y:rnd(GT,GB),z:rnd(10,140),vx:rnd(-6,6),vz:rnd(3,9),t:0,life:44,col:i%2?'#6a4020':'#2a2a2e'});
  showMsg('성문 돌파!','',false);
}

/* 번성 수공: 물결이 적진을 휩쓴다 */
function floodWave(){
  const w=Wd,p=alivePs()[0]||w.ps[0];w.shake=30;sfx('wind');w.flashT=10;w.flashCol='120,180,255';
  for(let y=GT;y<=GB;y+=36)w.proj.push({kind:'flood',lead:y===GT,x:w.camX+W+140,y,z:55,vx:-11,life:140,dmg:Math.round(powOf(p)*4),owner:'p',pl:p,knock:true,pierce:true,w:70,hit:new Set(),noProc:true,col:'#8ac8ff'});
}

/* ---------- 화용도 선택 ---------- */
const HY_CHOICE={title:'화용도 — 조조의 운명',who:'조조',
  lines:['쓰러진 조조가 진흙 속에서 고개를 들었다.','"…운이 다했구나. 목을 치든 묶어 가든 마음대로 하라."','패잔병들은 무기를 버리고 엎드려 떨고 있다.'],
  opts:[{k:'gi',n:'의(義) — 길을 열어 준다',d:['옛 은혜를 갚고 조조를 놓아준다.','보상: 「의리의 증표」 받는 피해 -5%','이후의 대사와 결말이 바뀐다.'],after:'조조를 놓아주었다 — 「의리의 증표」 획득'},
    {k:'pae',n:'패(覇) — 조조를 사로잡는다',d:['난세를 끝내기 위해 조조를 사로잡는다.','보상: 「패도의 증표」 공격력 +5%','이후의 대사와 결말이 바뀐다.'],after:'조조를 사로잡았다 — 「패도의 증표」 획득'}]};
let CH=null;
function openChoice(def,cb){CH={def,idx:0,t:0,cb};scene='choice'}
function updChoice(){
  if(!CH){scene='camp';return}
  CH.t++;const n=CH.def.opts.length;
  if(hit('up')||hit('left')){CH.idx=(CH.idx+n-1)%n;sfx('sel')}
  if(hit('down')||hit('right')){CH.idx=(CH.idx+1)%n;sfx('sel')}
  if(CH.t>40&&(hit('atk')||hit('start'))){sfx('ok');const o=CH.def.opts[CH.idx],cb=CH.cb;CH=null;cb(o)}
}
function drawChoice(){
  if(!CH)return;const D0=CH.def,a=Math.min(1,CH.t/30);
  ctx.fillStyle='#0a0604';ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,H/2,60,W/2,H/2,520);g.addColorStop(0,'rgba(90,40,10,.6)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=a;
  const lk=lookOf(D0.who);renderModel(ctx,lk,{lie:false,lean:.45,head:.35,armL:-.4,armR:-.3,wAng:-.6,legL:-.9,legR:.8,bob:-6,cape:.2},170,430,2.2,1,{tint:'rgba(40,20,10,.25)'});
  txt(D0.title,W/2+80,58,30,'#ffd24a','center',FONT,['#300',6]);
  D0.lines.forEach((l,k)=>txt(l,W/2+80,106+k*26,16,'#f0e0c8'));
  D0.opts.forEach((o,k)=>{const on=k===CH.idx,x=W/2-120+k*0,y=210+k*130,w=460;
    ctx.fillStyle=on?'rgba(120,30,10,.92)':'rgba(0,0,0,.55)';ctx.fillRect(x,y,w,112);ctx.strokeStyle=on?'#ffd24a':'#6a5030';ctx.lineWidth=on?3:1.5;ctx.strokeRect(x,y,w,112);
    txt((on?'▶ ':'')+o.n,x+18,y+22,20,on?'#fff':'#c8b890','left',FONT,['#000',4]);
    o.d.forEach((l,j)=>txt(l,x+22,y+52+j*20,14,on?'#ffe8c0':'#a89878','left'))});
  if(CH.t>40&&(frame>>4)%2)txt('↑↓ 선택 · 공격/ENTER 결정',W/2+110,H-24,13,'#c8a860');
  ctx.globalAlpha=1;
}
/* 결말 문구 (선택 반영) */
function endChoiceLines(){
  const hy=G.flags&&G.flags.hy;
  if(hy==='gi')return['화용도에서 목숨을 건진 조조는 끝내 운장을 잊지 못했다 — "그대는 진정한 의인이었소."'];
  if(hy==='pae')return['사로잡힌 조조가 압송되자 위는 조비와 사마의의 손에 넘어갔다. 난세는 새 얼굴로 이어진다.'];
  return[];
}

/* 등장인물 개성 (얼굴형 · 헤어) */
for(const n in NPC_STYLE)if(NPC_LOOK[n])for(const k in NPC_STYLE[n])if(NPC_LOOK[n][k]==null)NPC_LOOK[n][k]=NPC_STYLE[n][k];
