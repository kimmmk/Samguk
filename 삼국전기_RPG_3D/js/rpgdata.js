'use strict';
/* ===== RPG 데이터: 등급 · 장비 · 옵션 · 세트 · 전용/신화 · 스킬 트리 · 정예 ===== */
const MAXLV=100;
const EL_COL={fire:'#ff7a2a',ice:'#9ae8ff',bolt:'#c8a8ff'};
const EL_NAME={phys:'물리',fire:'화염',ice:'빙결',bolt:'뇌전'};
const CYCLE_NAMES=['난세(亂世)','악몽(惡夢)','연옥(煉獄)','무간(無間)'];
const cycleName=c=>c<3?CYCLE_NAMES[c]:CYCLE_NAMES[3]+(c>3?' '+(c-2):'');
/* 스테이지 기본 적 레벨 (회차마다 +33) */
const STAGE_LV=[1,5,14,18,22,35,8,11,26,30];
/* 진행 순서 (STAGES 인덱스). 마지막 장을 깨면 결말 — 세 보물이 있으면 비장(5)으로 */
const ORDER=[0,1,6,7,2,3,4,8,9],LAST_ORD=ORDER.length-1;
const stageOrd=k=>{const i=ORDER.indexOf(k);return i<0?ORDER.length:i};

/* ---------- 등급 ---------- */
/* m: 옵션 수치 배율, bm: 기본 능력(공격/방어) 배율, afx: 무작위 옵션 개수 */
const GRADES={
 normal:{n:'노멀',c:'#e8e8e8',m:1,bm:1,afx:[0,1],sell:1,rank:0},
 rare:{n:'레어',c:'#5aa8ff',m:1.15,bm:1.1,afx:[2,3],sell:3,rank:1},
 epic:{n:'에픽',c:'#c878ff',m:1.4,bm:1.25,afx:[4,5],sell:8,rank:2},
 set:{n:'세트',c:'#50e878',m:1.5,bm:1.3,sell:15,rank:3},
 excl:{n:'전용',c:'#ff9a30',m:1.75,bm:1.45,sell:25,rank:4},
 myth:{n:'신화',c:'#ff4a4a',m:2.1,bm:1.6,sell:50,rank:5}};
const GRADE_ORDER=['normal','rare','epic','set','excl','myth'];

/* ---------- 부위 ---------- */
const SLOTS={weapon:{n:'무기',w:12,def:0},armor:{n:'갑옷',w:10,def:1},helm:{n:'투구',w:10,def:.55},gloves:{n:'장갑',w:9,def:.35},
 boots:{n:'신발',w:9,def:.4},belt:{n:'벨트',w:8,def:.3},cape:{n:'망토',w:8,def:.45},neck:{n:'목걸이',w:6,def:0},ring:{n:'반지',w:10,def:0},book:{n:'스킬북',w:6,def:0}};
const EQ_SLOTS=['weapon','armor','helm','gloves','boots','belt','cape','neck','ring1','ring2','book'];
const slotType=s=>s&&s.startsWith('ring')?'ring':s;
const BASE_TIER=[1,10,20,35,50,70,90];
const BASES={
 weapon:['철검','강철도','정련창','명장 대도','용문극','천강 보검','신병 이기'],
 armor:['포의','가죽 갑옷','찰갑','쇄자갑','명광개','어린갑','용린갑'],
 helm:['두건','가죽 투구','철 투구','봉시 투구','맹수 투구','금 투구','용두 투구'],
 gloves:['면 장갑','가죽 장갑','철 수갑','쇄자 수갑','명광 수갑','용린 수갑','천잠 장갑'],
 boots:['짚신','가죽 신','철 장화','전투화','비운화','천리화','운룡화'],
 belt:['끈 허리띠','가죽 요대','철 요대','사자 요대','옥 요대','금 요대','용 요대'],
 cape:['삼베 망토','무명 망토','비단 망토','호피 망토','금사 망토','봉황 망토','천의(天衣)'],
 neck:['나무 목걸이','동 목걸이','은 목걸이','옥 목걸이','금 목걸이','명주 목걸이','천주 목걸이'],
 ring:['동 반지','은 반지','청동 가락지','옥 가락지','금 가락지','명주 가락지','천주 가락지'],
 book:['낡은 병서','손자병법 필사본','오자병법','육도삼략','맹덕신서','둔갑천서','태공병법']};
/* 무기 유형: 유형마다 고유 옵션 · 이름 · 캐릭터 외형 */
const WTYPES={sword:{n:'검',af:'crit',m:'sword'},dao:{n:'도',af:'atkPct',m:'dao'},spear:{n:'창',af:'dashDmg',m:'spear'},halberd:{n:'극',af:'critDmg',m:'halberd'},
  axe:{n:'도끼',af:'critDmg',m:'axe'},whip:{n:'채찍',af:'aoe',m:'whip'},bow:{n:'활',af:'crit',m:'bow'},fan:{n:'부채',af:'skillDmg',m:'fan'}};
const WBASES={sword:['철검','강철검','청강검','용천검','칠보검','천검','신검 태아'],dao:['단도','환수도','박도','청룡도','참마도','패왕도','신도 명홍'],
  spear:['목창','철창','정련창','용담창','비룡창','천룡창','신창 용아'],halberd:['철극','화극','방천극','용문극','패왕극','천하극','신극 무쌍'],
  axe:['손도끼','철부','전부','개산부','파천부','뇌신부','신부 반고'],whip:['가죽 채찍','쇄편','강철편','구절편','사룡편','천뢰편','신편 타신'],
  bow:['단궁','각궁','철태궁','작화궁','비룡궁','천궁','신궁 사일'],fan:['깃털 부채','우선','학우선','팔괘선','청우선','천풍선','신선 여의']};
/* 기본 능력: 무기 공격력 · 방어구 방어력 (L = 아이템 레벨) */
const baseAtk=L=>3+L*1.0, baseDef=L=>3+L*1.2;

/* ---------- 옵션(어픽스) ---------- */
/* f(L): 아이템 레벨 L 에서의 최대 수치, u:'%' 퍼센트, fix: 고정값 */
const AF={
 atk:{n:'공격력',f:L=>2+L*.6},
 atkPct:{n:'공격력',u:'%',f:L=>3+L*.15},
 hp:{n:'최대 체력',f:L=>8+L*3},
 hpPct:{n:'최대 체력',u:'%',f:L=>3+L*.08},
 mp:{n:'최대 내공',f:L=>5+L*1.2},
 mpPct:{n:'최대 내공',u:'%',f:L=>3+L*.08},
 ki:{n:'최대 기력',f:L=>3+L*.2},
 def:{n:'방어력',f:L=>3+L*1.2},
 defPct:{n:'방어력',u:'%',f:L=>4+L*.15},
 str:{n:'무력',f:L=>2+L*.25},dex:{n:'민첩',f:L=>2+L*.25},vit:{n:'체질',f:L=>2+L*.25},ene:{n:'지력',f:L=>2+L*.25},
 allStat:{n:'모든 능력치',f:L=>1+L*.15},
 crit:{n:'치명타 확률',u:'%',f:L=>1+L*.05},
 critDmg:{n:'치명타 피해',u:'%',f:L=>6+L*.3},
 ls:{n:'생명력 흡수',u:'%',f:L=>1+L*.03},
 mspd:{n:'이동 속도',u:'%',f:L=>3+L*.1},
 cdr:{n:'재사용 대기 감소',u:'%',f:L=>2+L*.08},
 skillDmg:{n:'스킬 피해',u:'%',f:L=>4+L*.2},
 fire:{n:'화염 피해',u:'%',f:L=>5+L*.25},ice:{n:'빙결 피해',u:'%',f:L=>5+L*.25},bolt:{n:'뇌전 피해',u:'%',f:L=>5+L*.25},
 allSkill:{n:'모든 스킬',fix:1,pre:'+'},
 tree0:{n:'제1계열 스킬',fix:1,pre:'+'},tree1:{n:'제2계열 스킬',fix:1,pre:'+'},tree2:{n:'제3계열 스킬',fix:1,pre:'+'},
 hpRegen:{n:'초당 체력 회복',f:L=>1+L*.15},
 mpRegen:{n:'내공 회복 속도',u:'%',f:L=>10+L*.5},
 kiRegen:{n:'초당 기력 회복',f:L=>1+L*.03},
 gf:{n:'금화 획득',u:'%',f:L=>10+L*.5},
 mf:{n:'아이템 발견',u:'%',f:L=>6+L*.3},
 exp:{n:'경험치 획득',u:'%',f:L=>3+L*.1},
 kiGain:{n:'기력 획득',u:'%',f:L=>6+L*.2},
 dr:{n:'받는 피해 감소',u:'%',f:L=>1+L*.05},
 thorns:{n:'가시 피해',f:L=>5+L*2},
 dodge:{n:'회피',u:'%',f:L=>1+L*.05},
 burnCh:{n:'타격 시 화상 확률',u:'%',f:L=>5+L*.1},chillCh:{n:'타격 시 빙결 확률',u:'%',f:L=>5+L*.1},shockCh:{n:'타격 시 감전 확률',u:'%',f:L=>5+L*.1},
 stunCh:{n:'타격 시 기절 확률',u:'%',f:L=>2+L*.05},
 cmdDmg:{n:'전용기 피해',u:'%',f:L=>10+L*.4},spDmg:{n:'필살기 피해',u:'%',f:L=>10+L*.4},dashDmg:{n:'돌진·달리기 공격 피해',u:'%',f:L=>10+L*.5},
 aoe:{n:'스킬 · 기술 범위',u:'%',f:L=>4+L*.12},pickR:{n:'줍기 범위',f:L=>20+L*.8},
 basicDmg:{n:'기본 공격 피해',u:'%',f:L=>6+L*.3},bossDmg:{n:'보스 대상 피해',u:'%',f:L=>6+L*.3},vsCtrl:{n:'제압된 적에게 피해',u:'%',f:L=>6+L*.3}};
const AF_POOL={
 weapon:['atk','atkPct','crit','critDmg','ls','fire','ice','bolt','str','dex','burnCh','chillCh','shockCh','stunCh','kiGain','skillDmg','cmdDmg','basicDmg','bossDmg'],
 armor:['hp','hpPct','def','defPct','dr','vit','thorns','hpRegen','dodge','spDmg'],
 helm:['hp','mp','def','crit','ene','mf','exp','vit','mpPct'],
 gloves:['atk','atkPct','crit','critDmg','ls','str','dex','kiGain','basicDmg','vsCtrl','aoe'],
 boots:['mspd','def','dex','dodge','hp','gf','mf','dashDmg','pickR'],
 belt:['hp','hpRegen','kiGain','def','str','vit','mpRegen','ki','kiRegen','pickR'],
 cape:['def','dr','cdr','ene','mp','dodge','fire','ice','bolt','hpPct'],
 neck:['allSkill','skillDmg','fire','ice','bolt','mp','mpRegen','mf','gf','exp','crit','allStat','aoe'],
 ring:['crit','ls','mp','gf','mf','str','dex','vit','ene','atk','critDmg','mpRegen','allStat'],
 book:['skillDmg','cdr','mpRegen','mp','ene','allSkill','tree0','tree1','tree2','cmdDmg','spDmg','aoe']};
const HI_AF={allSkill:1};                  /* 에픽 이상에서만 붙는 옵션 */
/* 이름 접두어 (레어) · 칭호 (에픽) */
const AF_PRE={aoe:'광활한',pickR:'끌어당기는',atk:'예리한',atkPct:'강맹한',hp:'강건한',hpPct:'장대한',mp:'현묘한',def:'견고한',defPct:'철벽의',crit:'필살의',critDmg:'잔혹한',ls:'흡혈의',mspd:'신속한',
 cdr:'민첩한',skillDmg:'현오한',fire:'화염의',ice:'한빙의',bolt:'뇌정의',allSkill:'천재의',str:'용맹한',dex:'날랜',vit:'굳센',ene:'총명한',gf:'부유한',mf:'행운의',exp:'현명한',
 kiGain:'투지의',dr:'수호의',thorns:'가시 돋친',dodge:'그림자의',hpRegen:'재생의',mpRegen:'명상의',allStat:'완전한',burnCh:'불타는',chillCh:'얼어붙은',shockCh:'번개 치는',stunCh:'묵직한'};
const EPIC_TITLE=['패왕','용린','천강','비룡','호표','맹호','적룡','청룡','백호','주작','현무','기린','응양','단봉','천위'];

/* ---------- 세트 ---------- */
/* 조각 옵션 [키, 배율] — 수치 = AF.f(레벨) × 배율 × 등급배율 */
const SETS={
 taoyuan:{n:'도원결의(桃園結義)',req:8,pieces:[
   {s:'helm',n:'도원 두건',af:[['hp',1],['vit',1]]},
   {s:'armor',n:'도원 전포',af:[['hp',1.2],['defPct',1],['dr',.8]]},
   {s:'ring',n:'도원 가락지',af:[['allStat',1],['ls',.8]]}],
  bonus:[[2,{hpPct:15}],[3,{allSkill:1,atkPct:15,exp:10}]]},
 taiping:{n:'황건 태평도(太平道)',req:15,pieces:[
   {s:'helm',n:'황건 두건',af:[['mp',1],['ene',1]]},
   {s:'neck',n:'태평 부적',af:[['bolt',1],['skillDmg',1]]},
   {s:'book',n:'태평요술 비급',af:[['tree1',1],['cdr',1]]},
   {s:'cape',n:'황천 망토',af:[['bolt',1],['mpPct',1]]}],
  bonus:[[2,{mpRegen:60}],[3,{bolt:30,shockCh:15}],[4,{procs:[{on:'cast',ch:30,act:'bolt3',v:1.2}]}]],
  txt:{4:'스킬 사용 시 30% 확률로 낙뢰 3연격'}},
 xiliang:{n:'서량 철기(西涼鐵騎)',req:25,pieces:[
   {s:'boots',n:'철기 장화',af:[['mspd',1],['dex',1]]},
   {s:'gloves',n:'철기 수갑',af:[['atkPct',1],['crit',1]]},
   {s:'belt',n:'철기 요대',af:[['hp',1],['kiGain',1]]},
   {s:'weapon',n:'서량 장창',af:[['atk',1],['dashDmg',1.5]]}],
  bonus:[[2,{mspd:12}],[3,{crit:8}],[4,{dashDmg:80,atkPct:20}]]},
 chibi:{n:'적벽 화공(赤壁火攻)',req:35,pieces:[
   {s:'weapon',n:'화공 대도',af:[['atk',1],['fire',1.2],['burnCh',1]]},
   {s:'gloves',n:'화선 수갑',af:[['fire',1],['atkPct',1]]},
   {s:'neck',n:'동남풍 부적',af:[['fire',1],['cdr',1]]}],
  bonus:[[2,{fire:35}],[3,{burnCh:25,burnPct:100}]],txt:{3:'화상 피해 2배'}},
 wolong:{n:'와룡(臥龍)',req:45,pieces:[
   {s:'cape',n:'와룡 학창의',af:[['ene',1],['mp',1],['dr',.8]]},
   {s:'ring',n:'와룡 가락지',af:[['mpRegen',1],['skillDmg',1]]},
   {s:'book',n:'팔괘 비급',af:[['allSkill',1],['cdr',1]]}],
  bonus:[[2,{cdr:15}],[3,{allSkill:2,mpPct:30}]]},
 wuhu:{n:'오호대장군(五虎大將)',req:60,pieces:[
   {s:'helm',n:'오호 투구',af:[['hp',1],['crit',1]]},
   {s:'armor',n:'오호 갑주',af:[['def',1.2],['hpPct',1]]},
   {s:'gloves',n:'오호 수갑',af:[['atkPct',1],['critDmg',1]]},
   {s:'boots',n:'오호 전화',af:[['mspd',1],['dodge',1]]},
   {s:'cape',n:'오호 전포',af:[['dr',1],['allStat',1]]}],
  bonus:[[2,{defPct:25}],[3,{atkPct:25}],[4,{dr:12}],[5,{allSkill:2,spDmg:50,kiGain:50}]]},
 wushuang:{n:'천하무쌍(天下無雙)',req:80,pieces:[
   {s:'helm',n:'무쌍 자금관',af:[['crit',1],['str',1.2]]},
   {s:'armor',n:'무쌍 수면갑',af:[['hpPct',1],['def',1.2]]},
   {s:'belt',n:'무쌍 사만대',af:[['ls',1],['kiGain',1]]},
   {s:'ring',n:'무쌍 가락지',af:[['critDmg',1],['atk',1]]}],
  bonus:[[2,{critDmg:50}],[3,{ls:4}],[4,{procs:[{on:'kill',ch:100,act:'buffAtk',v:40,dur:180,cd:0}]}]],txt:{4:'적 처치 시 3초간 공격력 +40%'}},
 qinglong:{n:'청룡의장(靑龍儀仗)',req:20,pieces:[
   {s:'weapon',n:'청룡 의장도',af:[['atk',1],['cmdDmg',1.2]]},
   {s:'cape',n:'청룡 전포',af:[['hp',1],['kiGain',1]]},
   {s:'ring',n:'청룡 옥가락지',af:[['crit',1],['str',1]]}],
  bonus:[[2,{cmdDmg:40,kiGain:30}],[3,{tree0:2,aoe:15,procs:[{on:'hit',ch:8,act:'gwave',v:1.6,cd:45}]}]],txt:{3:'제1계열 스킬 +2 · 기술 범위 +15% · 적중 시 8% 청룡파'}},
 baima:{n:'백마의종(白馬義從)',req:28,pieces:[
   {s:'boots',n:'백마 등자',af:[['mspd',1.2],['dex',1]]},
   {s:'gloves',n:'백마 고삐 장갑',af:[['atkPct',1],['crit',1]]},
   {s:'cape',n:'백마 흰 전포',af:[['dodge',1],['hp',1]]}],
  bonus:[[2,{mspd:15,crit:6,pickR:60}],[3,{dashDmg:60,aoe:20,dodge:8}]],txt:{3:'돌진 피해 +60% · 기술 범위 +20% · 회피 +8%'}},
 tengjia:{n:'남만 등갑(藤甲)',req:32,pieces:[
   {s:'armor',n:'등갑',af:[['def',1.3],['hpPct',1]]},
   {s:'helm',n:'등갑 투구',af:[['hp',1],['thorns',1.5]]},
   {s:'belt',n:'등나무 요대',af:[['hpRegen',1.2],['vit',1]]}],
  bonus:[[2,{dr:10,thorns:150}],[3,{hpPct:25,procs:[{on:'hurt',ch:25,act:'nova',v:1.8,cd:90}]}]],txt:{3:'최대 체력 +25% · 피격 시 25% 확률로 반격 충격파'}},
 jiangdong:{n:'강동 수군(江東水軍)',req:38,pieces:[
   {s:'gloves',n:'수군 장갑',af:[['ice',1],['atkPct',1]]},
   {s:'boots',n:'수군 장화',af:[['mspd',1],['chillCh',1]]},
   {s:'neck',n:'강동 호부',af:[['ice',1.2],['skillDmg',1]]},
   {s:'ring',n:'주유의 가락지',af:[['cdr',1],['ene',1]]}],
  bonus:[[2,{ice:30}],[3,{chillCh:20,vsCtrl:30}],[4,{allSkill:1,aoe:30}]],txt:{4:'모든 스킬 +1 · 스킬 · 기술 범위 +30%'}},
 bamen:{n:'팔문금쇄(八門金鎖)',req:50,pieces:[
   {s:'helm',n:'휴문 투구',af:[['hp',1],['def',1]]},
   {s:'armor',n:'생문 갑주',af:[['hpPct',1],['def',1]]},
   {s:'gloves',n:'상문 수갑',af:[['atkPct',1],['crit',1]]},
   {s:'boots',n:'두문 장화',af:[['mspd',1],['dodge',1]]},
   {s:'belt',n:'경문 요대',af:[['hpRegen',1],['kiGain',1]]},
   {s:'cape',n:'사문 전포',af:[['dr',1],['allStat',1]]}],
  bonus:[[2,{defPct:20}],[4,{dr:10,hpRegen:40}],[6,{allSkill:2,spDmg:60,basicDmg:40,aoe:25}]],txt:{6:'모든 스킬 +2 · 필살기 +60% · 기본기 +40% · 범위 +25%'}},
 tongque:{n:'동작대(銅雀臺)',req:55,pieces:[
   {s:'neck',n:'동작 옥패',af:[['skillDmg',1.2],['mp',1]]},
   {s:'ring',n:'동작 금가락지',af:[['mpRegen',1.2],['crit',1]]},
   {s:'book',n:'맹덕신서 원본',af:[['allSkill',1],['cdr',1]]}],
  bonus:[[2,{skillDmg:25}],[3,{mpRegen:100,cdr:15,procs:[{on:'cast',ch:25,act:'fireball',v:2}]}]],txt:{3:'내공 회복 +100% · 재사용 -15% · 스킬 사용 시 25% 화염구'}},
 tiangong:{n:'천공장군(天公將軍)',req:65,pieces:[
   {s:'weapon',n:'황천 구절장',af:[['atk',1],['bolt',1.3]]},
   {s:'helm',n:'황건 천관',af:[['ene',1.2],['mp',1]]},
   {s:'cape',n:'태평 도포',af:[['bolt',1],['dr',1]]},
   {s:'book',n:'태평청령서 사본',af:[['tree1',1],['skillDmg',1]]}],
  bonus:[[2,{bolt:40}],[3,{shockCh:30,skillDmg:20}],[4,{procs:[{on:'hit',ch:15,act:'bolt3',v:1.3,cd:40}]}]],txt:{4:'적중 시 15% 확률로 낙뢰 3연격'}},
 wushen:{n:'무신(武神)',req:75,pieces:[
   {s:'weapon',n:'무신 언월도',af:[['atk',1.2],['atkPct',1.2]]},
   {s:'armor',n:'무신 녹포',af:[['hpPct',1],['def',1.2]]},
   {s:'helm',n:'무신 녹건',af:[['crit',1],['hp',1]]},
   {s:'cape',n:'무신 전포',af:[['dr',1],['str',1.2]]},
   {s:'boots',n:'무신 전화',af:[['mspd',1],['dex',1]]}],
  bonus:[[2,{atkPct:20}],[3,{critDmg:60}],[4,{procs:[{on:'kill',ch:30,act:'gwave',v:2.4}]}],[5,{allSkill:3,aoe:25,spDmg:50}]],txt:{4:'처치 시 30% 확률로 청룡파',5:'모든 스킬 +3 · 범위 +25% · 필살기 +50%'}}};

/* ---------- 전용 · 신화 ---------- */
/* procs: on(hit/crit/kill/hurt/cast/special/lowhp) · ch 확률% · act 발동 효과 · v 위력 · cd 재발동 대기(프레임) */
const UNIQ={
 guan_w:{n:'청룡언월도·진(眞)',g:'excl',s:'weapon',h:'guan',req:30,af:[['atk',1.3],['atkPct',1.2],['allSkill',1],['crit',1]],pw:{cmdDmg:80},
  procs:[{on:'hit',ch:10,act:'gwave',v:2,cd:40}],txt:['전용기 피해 +80%','적중 시 10% 확률로 청룡파 발사']},
 guan_a:{n:'녹포 전포(綠袍)',g:'excl',s:'armor',h:'guan',req:55,af:[['hpPct',1.3],['def',1.3],['dr',1],['vit',1]],
  procs:[{on:'lowhp',ch:100,act:'drFor',v:50,dur:300,cd:1800}],txt:['체력 30% 이하 시 5초간 받는 피해 -50% (30초마다)']},
 zhang_w:{n:'장팔사모·진(眞)',g:'excl',s:'weapon',h:'zhang',req:30,af:[['atk',1.3],['atkPct',1.2],['allSkill',1],['stunCh',1.5]],pw:{spDmg:60},
  txt:['필살기 피해 +60%']},
 zhang_h:{n:'장판교 호두투구',g:'excl',s:'helm',h:'zhang',req:55,af:[['hp',1.4],['kiGain',1.5],['def',1.2],['vit',1]],
  procs:[{on:'hurt',ch:20,act:'nova',v:2,cd:120}],txt:['피격 시 20% 확률로 대갈(주변 기절)']},
 zhao_w:{n:'애각창·진(眞)',g:'excl',s:'weapon',h:'zhao',req:30,af:[['atk',1.3],['mspd',1.2],['crit',1.3],['allSkill',1]],
  procs:[{on:'crit',ch:20,act:'dragon',v:2.5,cd:60,col:'#bfe6ff'}],txt:['치명타 시 20% 확률로 백룡 발사']},
 zhao_a:{n:'청강 은갑',g:'excl',s:'armor',h:'zhao',req:55,af:[['def',1.3],['dodge',1.3],['hpPct',1],['dex',1]],
  procs:[{on:'kill',ch:100,act:'heal',v:3}],txt:['적 처치 시 체력 3% 회복']},
 huang_w:{n:'봉황궁(鳳凰弓)',g:'excl',s:'weapon',h:'huang',req:30,af:[['atk',1.3],['fire',1.6],['crit',1],['allSkill',1]],pw:{triArrow:1},
  txt:['연속기 마지막 불화살이 3발로 발사']},
 huang_g:{n:'노익장 활팔찌',g:'excl',s:'gloves',h:'huang',req:55,af:[['crit',1.3],['critDmg',1.3],['atkPct',1],['dex',1]],
  procs:[{on:'crit',ch:100,act:'burn',v:1}],txt:['치명타 시 대상에게 화상']},
 zhuge_w:{n:'백우선·진(眞)',g:'excl',s:'weapon',h:'zhuge',req:30,af:[['atk',1.2],['skillDmg',1.4],['bolt',1.4],['allSkill',1]],
  procs:[{on:'cast',ch:25,act:'bolt3',v:1.4}],txt:['스킬 사용 시 25% 확률로 낙뢰 3연격']},
 zhuge_b:{n:'팔진도 비급(八陣圖)',g:'excl',s:'book',h:'zhuge',req:55,af:[['allSkill',2],['cdr',1.3],['mpRegen',1.3],['ene',1]],
  procs:[{on:'cast',ch:12,act:'freeCast',v:1}],txt:['스킬 사용 시 12% 확률로 재사용 대기 초기화']},
 ma_w:{n:'호두삽금창(虎頭鏨金槍)',g:'excl',s:'weapon',h:'ma',req:30,af:[['atk',1.3],['atkPct',1.2],['mspd',1],['allSkill',1]],pw:{dashDmg:100},
  txt:['돌진·달리기 공격 피해 +100%']},
 ma_h:{n:'금마 사자투구',g:'excl',s:'helm',h:'ma',req:55,af:[['hp',1.3],['crit',1.2],['def',1.2],['str',1]],
  procs:[{on:'kill',ch:100,act:'buffAtk',v:20,dur:300,cd:0}],txt:['적 처치 시 5초간 공격력 +20%']},
 diao_w:{n:'폐월 쌍검(閉月)',g:'excl',s:'weapon',h:'diao',req:30,af:[['atk',1.2],['crit',1.3],['critDmg',1.2],['allSkill',1]],
  procs:[{on:'hit',ch:10,act:'stun',v:90}],txt:['적중 시 10% 확률로 매혹(1.5초 기절)']},
 diao_n:{n:'연환 목걸이(連環)',g:'excl',s:'neck',h:'diao',req:55,af:[['allSkill',1],['ice',1.4],['dodge',1.3],['mpPct',1]],pw:{vsCtrl:50},
  txt:['기절·빙결된 적에게 피해 +50%']},
 wei_w:{n:'반골 대도(反骨)',g:'excl',s:'weapon',h:'wei',req:30,af:[['atk',1.4],['atkPct',1.2],['fire',1],['allSkill',1]],
  procs:[{on:'kill',ch:100,act:'explode',v:1.5}],txt:['적 처치 시 화염 폭발']},
 wei_b:{n:'자오곡 비책(子午谷)',g:'excl',s:'book',h:'wei',req:55,af:[['tree1',2],['fire',1.5],['cdr',1],['str',1]],
  procs:[{on:'special',ch:100,act:'buffAtk',v:50,dur:600,cd:0}],txt:['필살기 사용 후 10초간 공격력 +50%']},
 lubu_w:{n:'방천화극·진(眞)',g:'excl',s:'weapon',h:'lubu',req:30,af:[['atk',1.5],['atkPct',1.5],['critDmg',1.2],['allSkill',1]],
  procs:[{on:'hit',ch:15,act:'redslash',v:1.6,cd:30}],txt:['적중 시 15% 확률로 추가 참격']},
 xu_w:{n:'개산대부(開山大斧)',g:'excl',s:'weapon',h:'xu',req:30,af:[['atk',1.4],['critDmg',1.4],['atkPct',1.2],['allSkill',1]],procs:[{on:'hit',ch:10,act:'nova',v:1.6,cd:60}],txt:['적중 시 10% 확률로 충격파']},
 gan_w:{n:'금범 쇄편(錦帆鎖鞭)',g:'excl',s:'weapon',h:'gan',req:30,af:[['atk',1.3],['crit',1.3],['mspd',1.2],['allSkill',1]],procs:[{on:'hit',ch:12,act:'bolt3',v:1,cd:50}],txt:['적중 시 12% 확률로 방울 낙뢰']},
 sun_w:{n:'궁요 비궁(弓腰飛弓)',g:'excl',s:'weapon',h:'sun',req:30,af:[['atk',1.2],['fire',1.5],['crit',1.3],['allSkill',1]],pw:{triArrow:1},procs:[{on:'crit',ch:20,act:'fireball',v:1.6,cd:40}],txt:['치명타 시 20% 확률로 화염시','연속기 마지막 화살 3발']},
 lubu_b:{n:'적토 마구(赤兎)',g:'excl',s:'boots',h:'lubu',req:55,af:[['mspd',2.5],['dashDmg',2],['def',1.2],['dex',1]],
  txt:['이동 속도 대폭 상승 · 돌진 피해 대폭 상승']},
 /* 신화: 모든 무장 */
 m_qixing:{n:'칠성보도(七星寶刀)',g:'myth',s:'weapon',req:65,af:[['atk',1.6],['crit',1.5],['critDmg',1.5],['allSkill',1],['atkPct',1.3]],spx:'qixing',
  procs:[{on:'crit',ch:25,act:'star7',v:1.3,cd:90}],txt:['치명타 시 25% 확률로 칠성 낙뢰 (7연격)','필살기 변경: 「칠성참(七星斬)」 — 북두칠성 7연참 후 거대 X참']},
 m_yitian:{n:'의천검(倚天劍)',g:'myth',s:'weapon',req:70,af:[['atk',1.7],['atkPct',1.5],['critDmg',1.3],['allSkill',1],['bossDmg',1.5]],spx:'yitian',
  txt:['필살기 변경: 「의천일섬(倚天一閃)」 — 하늘을 가르는 일섬, 화면 전체 초고위력']},
 m_guding:{n:'고정도(古錠刀)',g:'myth',s:'weapon',req:72,af:[['atk',1.6],['fire',2],['burnCh',1.5],['allSkill',1],['atkPct',1.2]],spx:'guding',
  txt:['필살기 변경: 「고정열풍참(古錠烈風斬)」 — 양방향 화염 회오리 4개']},
 m_cixiong:{n:'자웅일대검(雌雄一對劍)',g:'myth',s:'weapon',req:78,af:[['atk',1.6],['crit',1.5],['ls',1.5],['allSkill',1],['atkPct',1.3]],spx:'cixiong',
  txt:['필살기 변경: 「자웅쌍룡(雌雄雙龍)」 — 양방향 쌍룡 + 교차 폭발']},
 m_hualong:{n:'화룡극(火龍戟)',g:'myth',s:'weapon',req:85,af:[['atk',1.8],['fire',1.8],['atkPct',1.5],['allSkill',1],['critDmg',1.3]],spx:'hualong',
  txt:['필살기 변경: 「화룡승천(火龍昇天)」 — 도약 후 운석 화염비, 착지 대폭발']},
 m_bingpo:{n:'빙백창(氷魄槍)',g:'myth',s:'weapon',req:90,af:[['atk',1.8],['ice',2],['chillCh',1.5],['allSkill',2],['vsCtrl',1.5]],spx:'bingpo',
  txt:['필살기 변경: 「빙백천망(氷魄天網)」 — 전 화면 빙결 후 얼음 가시 3연 · 빙쇄']},
 m_hebi:{n:'화씨벽(和氏璧)',g:'myth',s:'neck',req:70,af:[['allSkill',2],['allStat',1.5],['mpPct',1.5],['skillDmg',1.3]],pw:{manaShield:20},
  txt:['받는 피해의 20%를 내공이 대신 받음']},
 m_taiping:{n:'태평청령도(太平淸領道)',g:'myth',s:'book',req:75,af:[['allSkill',3],['cdr',1.8],['skillDmg',1.8],['mpRegen',1.5]],
  procs:[{on:'cast',ch:25,act:'freeMana',v:1}],txt:['스킬 사용 시 25% 확률로 내공 소모 없음']},
 m_hoof:{n:'적토의 편자(赤兎蹄)',g:'myth',s:'boots',req:60,af:[['mspd',2.5],['dodge',1.5],['dex',1.5],['hp',1.2]],pw:{fireTrail:1},
  txt:['이동 시 불꽃 궤적을 남겨 적을 태움']},
 m_seal:{n:'전국 인끈(傳國綬)',g:'myth',s:'belt',req:80,af:[['hpPct',1.8],['dr',1.5],['hpRegen',1.5],['kiRegen',1.5]],pw:{cheatDeath:1},
  txt:['전장마다 한 번, 쓰러질 때 체력 50%로 부활']},
 m_jade:{n:'금루옥의(金縷玉衣)',g:'myth',s:'armor',req:90,af:[['def',2],['dr',2],['hpPct',1.6],['thorns',2]],
  procs:[{on:'hurt',ch:20,act:'shield',v:180,cd:600}],txt:['피격 시 20% 확률로 3초간 금강불괴']},
 m_phoenix:{n:'봉추의 깃(鳳雛羽)',g:'myth',s:'cape',req:70,af:[['fire',2],['cdr',1.5],['ene',1.5],['dr',1.2]],
  procs:[{on:'kill',ch:35,act:'fireball',v:2.2}],txt:['적 처치 시 35% 확률로 봉황 화염구 발사']},
 m_ruyi:{n:'여의주(如意珠)',g:'myth',s:'ring',req:85,af:[['crit',1.8],['ls',1.8],['mf',2],['gf',2]],
  procs:[{on:'kill',ch:8,act:'bonusDrop',v:1}],txt:['적 처치 시 8% 확률로 희귀 장비 추가 드랍']},
 m_crown:{n:'제왕 금관(帝王金冠)',g:'myth',s:'helm',req:95,af:[['allSkill',2],['allStat',2],['exp',2],['hpPct',1.3]],pw:{bossDmg:50},
  txt:['보스 대상 피해 +50%']},
 m_gauntlet:{n:'패왕 수갑(覇王)',g:'myth',s:'gloves',req:68,af:[['atkPct',2],['critDmg',1.8],['ls',1.5],['str',1.5]],
  procs:[{on:'hit',ch:6,act:'nova',v:2.2,cd:90}],txt:['적중 시 6% 확률로 패왕 충격파']}};
/* 세트 문장 (아이콘 구분 표시): [한자, 색] */
const SET_MARK={taoyuan:['桃','#ff8ab0'],taiping:['黃','#e8c020'],xiliang:['涼','#dfe8ff'],chibi:['赤','#ff5a2a'],wolong:['龍','#8ad8ff'],wuhu:['虎','#ffb040'],
  wushuang:['雙','#ff3a3a'],qinglong:['靑','#40e890'],baima:['白','#f4f4f4'],tengjia:['藤','#b08a4a'],jiangdong:['江','#4aa8ff'],bamen:['八','#c8a8ff'],
  tongque:['雀','#e0b040'],tiangong:['天','#c8a8ff'],wushen:['武','#5dffa0']};
/* 신화 무기 전용 필살기 이름 · 색 */
const MYTH_SP={qixing:{n:'칠성참',hz:'七星斬',col:'#ffe890'},yitian:{n:'의천일섬',hz:'倚天一閃',col:'#e8f4ff'},guding:{n:'고정열풍참',hz:'古錠烈風',col:'#ff7a2a'},
  cixiong:{n:'자웅쌍룡',hz:'雌雄雙龍',col:'#ff6aa0'},hualong:{n:'화룡승천',hz:'火龍昇天',col:'#ff5020'},bingpo:{n:'빙백천망',hz:'氷魄天網',col:'#9ae8ff'}};
/* ---------- 전용 장비: 무장마다 모든 부위(10종) 자동 보충 ---------- */
const EXCL_THEME={
 guan:{pre:'청룡',el:'phys',st:'str',procs:[{on:'hit',ch:8,act:'gwave',v:1.6,cd:50},{on:'kill',ch:30,act:'heal',v:3},{on:'hurt',ch:15,act:'drFor',v:30,dur:180,cd:600}]},
 zhang:{pre:'장판',el:'phys',st:'vit',procs:[{on:'hurt',ch:15,act:'nova',v:1.8,cd:120},{on:'hit',ch:6,act:'stun',v:60},{on:'kill',ch:100,act:'buffAtk',v:15,dur:240,cd:0}]},
 zhao:{pre:'상산',el:'ice',st:'dex',procs:[{on:'crit',ch:12,act:'dragon',v:2,cd:70,col:'#bfe6ff'},{on:'kill',ch:100,act:'heal',v:2},{on:'hurt',ch:12,act:'shield',v:120,cd:600}]},
 huang:{pre:'노익장',el:'fire',st:'dex',procs:[{on:'crit',ch:100,act:'burn',v:1},{on:'kill',ch:25,act:'fireball',v:1.8},{on:'cast',ch:15,act:'freeMana',v:1}]},
 zhuge:{pre:'와룡',el:'bolt',st:'ene',procs:[{on:'cast',ch:20,act:'bolt3',v:1.2},{on:'cast',ch:8,act:'freeCast',v:1},{on:'hurt',ch:15,act:'nova',v:1.4,cd:120}]},
 ma:{pre:'금마',el:'phys',st:'str',procs:[{on:'kill',ch:100,act:'buffAtk',v:15,dur:240,cd:0},{on:'hit',ch:8,act:'redslash',v:1.3,cd:40},{on:'crit',ch:20,act:'heal',v:2}]},
 diao:{pre:'폐월',el:'ice',st:'dex',procs:[{on:'hit',ch:8,act:'stun',v:80},{on:'kill',ch:100,act:'heal',v:2},{on:'crit',ch:15,act:'dragon',v:1.6,cd:80,col:'#ff8ad0'}]},
 wei:{pre:'반골',el:'fire',st:'str',procs:[{on:'kill',ch:100,act:'explode',v:1.3},{on:'hurt',ch:20,act:'drFor',v:30,dur:180,cd:600},{on:'hit',ch:10,act:'burn',v:1}]},
 xu:{pre:'대부',el:'phys',st:'str',procs:[{on:'hit',ch:8,act:'nova',v:1.4,cd:80},{on:'hurt',ch:15,act:'drFor',v:30,dur:180,cd:600},{on:'kill',ch:100,act:'buffAtk',v:15,dur:240,cd:0}]},
 gan:{pre:'금범',el:'bolt',st:'dex',procs:[{on:'hit',ch:10,act:'bolt3',v:1,cd:60},{on:'kill',ch:100,act:'heal',v:2},{on:'crit',ch:15,act:'stun',v:60}]},
 sun:{pre:'궁요',el:'fire',st:'dex',procs:[{on:'crit',ch:100,act:'burn',v:1},{on:'kill',ch:25,act:'fireball',v:1.6},{on:'cast',ch:12,act:'freeMana',v:1}]},
 lubu:{pre:'무쌍',el:'phys',st:'str',procs:[{on:'hit',ch:12,act:'redslash',v:1.5,cd:35},{on:'kill',ch:100,act:'buffAtk',v:20,dur:180,cd:0},{on:'crit',ch:10,act:'star7',v:1.1,cd:150}]}};
const EXCL_SLOT={armor:['전포',['hpPct','def','dr','vit'],45],helm:['관',['hp','crit','def','ene'],40],gloves:['수갑',['atkPct','critDmg','crit','str'],38],
 boots:['전화',['mspd','dodge','def','dex'],35],belt:['요대',['hp','kiGain','hpRegen','vit'],42],cape:['피풍',['dr','def','allStat','cdr'],48],
 neck:['패옥',['allSkill','skillDmg','crit','mp'],52],ring:['가락지',['crit','ls','atk','critDmg'],50],book:['비전서',['allSkill','cdr','skillDmg','mpRegen'],58]};
const PROC_TXT={gwave:'청룡파 발사',nova:'충격파',stun:'기절',buffAtk:'공격력 상승',dragon:'용 발사',heal:'체력 회복',shield:'금강불괴',burn:'화상',fireball:'화염구',freeMana:'내공 소모 없음',
  bolt3:'낙뢰 3연격',freeCast:'재사용 초기화',redslash:'추가 참격',explode:'화염 폭발',drFor:'받는 피해 감소',star7:'칠성 낙뢰'};
const ON_TXT={hit:'적중 시',crit:'치명타 시',kill:'적 처치 시',hurt:'피격 시',cast:'스킬 사용 시'};
for(const hid in EXCL_THEME){const T=EXCL_THEME[hid];let k=0;
  for(const sl in EXCL_SLOT){if(Object.values(UNIQ).some(u=>u.h===hid&&u.s===sl)){k++;continue}
    const [noun,afs,req]=EXCL_SLOT[sl],pr=T.procs[k%T.procs.length],af=afs.map((a,i)=>[a,i===0?1.3:1.1]);
    if(T.el!=='phys')af[3]=[T.el,1.4];else af[3]=[T.st,1.2];
    const tx=`${ON_TXT[pr.on]} ${pr.ch<100?pr.ch+'% 확률로 ':''}${PROC_TXT[pr.act]}${pr.act==='buffAtk'||pr.act==='drFor'?` (${pr.v}%, ${pr.dur/60}초)`:pr.act==='heal'?` ${pr.v}%`:''}`;
    UNIQ[`${hid}_${sl}`]={n:`${T.pre} ${noun}`,g:'excl',s:sl,h:hid,req:req+(k%3)*5,af,procs:[pr],txt:[tx]};k++}}
/* 무장 필살기 한자 이름 (컷인 일러스트) */
const HERO_SP_HZ={guan:'靑龍偃月斬',zhang:'長坂大喝',zhao:'白龍突擊',huang:'萬弓亂射',zhuge:'八陣雷擊',ma:'西涼旋風槍',diao:'閉月亂舞',wei:'反骨烈火斬',lubu:'無雙亂舞',xu:'大斧開山',gan:'錦帆賊風',sun:'弓腰亂射'};
/* 보스 전용 필살기 (분노 상태에서 컷인과 함께 발동) */
const BOSS_ULT={'장각':{n:'황천뇌신',hz:'黃天雷神',ty:'thunder',col:'#d070ff'},'여포':{n:'무쌍난무',hz:'無雙亂舞',ty:'musou',col:'#ff3a3a'},
  '허저':{n:'호치대붕격',hz:'虎痴大崩擊',ty:'quake',col:'#c8a060'},'장료':{n:'요래요래',hz:'遼來遼來',ty:'charge',col:'#6a9aff'},
  '조조':{n:'패왕의 호령',hz:'覇王號令',ty:'summon',col:'#ffd040'},'안량':{n:'하북참격',hz:'河北斬擊',ty:'charge',col:'#e0a030'},
  '하후돈':{n:'발시담안',hz:'拔矢啖眼',ty:'musou',col:'#4a8aff'},'하후연':{n:'질풍만시',hz:'疾風萬矢',ty:'arrows',col:'#80d0ff'},'방덕':{n:'결사일도',hz:'決死一刀',ty:'charge',col:'#a0a0c0'},'사마의':{n:'낭고천뢰',hz:'狼顧天雷',ty:'orbs',col:'#b050ff'},'하후은':{n:'청강일섬',hz:'靑釭一閃',ty:'charge',col:'#a8e0ff'}};
/* ---------- 전용 장비 확장: 무장마다 부위별 최소 5종 ----------
   부위별 5단계(예 · 보 · 신 · 패 · 천) — 요구 레벨 22 / 36 / 50 / 66 / 82, 단계가 오를수록 옵션 배율 · 발동 효과가 늘어난다.
   키는 `${무장}_${부위}_x${단계}` 로 고정 (저장 데이터 호환을 위해 결정적으로 생성) */
const EXCL_NOUN={weapon:null,armor:['전포','명광개','용린갑','금사갑','천위갑'],helm:['두건','봉시관','금관','용두관','천위관'],gloves:['수갑','철수','용조수','패왕수','천위수'],
 boots:['전화','운리화','비운화','천리화','천위화'],belt:['요대','사자대','옥대','금룡대','천위대'],cape:['피풍','전포','봉황피풍','용문피풍','천의'],
 neck:['패옥','호부','명주패','용주','천주'],ring:['가락지','인장','옥지환','용지환','천명환'],book:['비전서','병서','진법서','비급','천서']};
const EXCL_TIER=[['예','銳',22,1],['보','寶',36,1.08],['신','神',50,1.16],['패','覇',66,1.25],['천','天',82,1.35]];
const EXCL_XPROC=[{on:'crit',ch:10,act:'nova',v:1.5,cd:90},{on:'kill',ch:20,act:'fireball',v:1.6},{on:'hit',ch:6,act:'bolt3',v:1.1,cd:60},{on:'hurt',ch:10,act:'shield',v:120,cd:600},{on:'kill',ch:100,act:'heal',v:2},{on:'crit',ch:12,act:'redslash',v:1.4,cd:40}];
const EXCL_PW={weapon:{cmdDmg:40},armor:{dr:4},helm:{crit:4},gloves:{critDmg:25},boots:{mspd:8},belt:{kiGain:20},cape:{cdr:6},neck:{skillDmg:20},ring:{ls:2},book:{spDmg:35}};
const exclTxt=pr=>`${ON_TXT[pr.on]} ${pr.ch<100?pr.ch+'% 확률로 ':''}${PROC_TXT[pr.act]}${pr.act==='buffAtk'||pr.act==='drFor'?` (${pr.v}%, ${pr.dur/60}초)`:pr.act==='heal'?` ${pr.v}%`:''}`;
const exclHash=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
for(const hid in EXCL_THEME){
  const T=EXCL_THEME[hid],H=HEROES.find(h=>h.id===hid),names=new Set(Object.values(UNIQ).filter(u=>u.h===hid).map(u=>u.n));
  const SL=Object.assign({weapon:['병',['atk','atkPct','crit','critDmg'],30]},EXCL_SLOT);
  for(const sl in SL){
    const [noun0,afs]=SL[sl];
    EXCL_TIER.forEach(([ko,hz,req,mul],i)=>{
      const key=`${hid}_${sl}_x${i}`,hs=exclHash(key);
      let n=sl==='weapon'?`${H?H.weapon:T.pre}·${ko}(${hz})`:`${T.pre} ${EXCL_NOUN[sl][i]}`;if(names.has(n))n=`${T.pre} ${ko}${EXCL_NOUN[sl]?EXCL_NOUN[sl][i]:noun0}`;names.add(n);
      const af=afs.map((a,j)=>[a,(j===0?1.25:1.05)*mul]);
      af[3]=T.el!=='phys'?[T.el,1.35*mul]:[T.st,1.15*mul];
      const pool=AF_POOL[sl==='ring'?'ring':sl].filter(k=>!af.some(a=>a[0]===k)&&!HI_AF[k]&&!k.startsWith('tree'));
      if(i>=1&&pool.length)af.push([pool[hs%pool.length],.9*mul]);
      if(i>=3&&sl!=='weapon'&&!af.some(a=>a[0]==='allSkill'))af.push(['allSkill',1]);
      const procs=[T.procs[(hs+i)%T.procs.length]];if(i>=2)procs.push(EXCL_XPROC[(hs>>>3)%EXCL_XPROC.length]);
      const U={n,g:'excl',s:sl,h:hid,req,af,procs,txt:procs.map(exclTxt)};
      if(i===4){U.pw=Object.assign({},EXCL_PW[sl]);U.txt.push(Object.entries(U.pw).map(([k,v])=>`${AF[k]?AF[k].n:k} +${v}${AF[k]&&AF[k].u?AF[k].u:''}`).join(' · ')+' (천 등급 고유)')}
      UNIQ[key]=U;
    });
  }
}
const UNIQ_BY_G={excl:[],myth:[]};for(const k in UNIQ)UNIQ_BY_G[UNIQ[k].g].push(k);

/* ---------- 정예 몬스터 옵션 ---------- */
const ELITE={mighty:{n:'광폭',c:'#ff5040'},swift:{n:'신속',c:'#60c0ff'},tough:{n:'강철',c:'#d0d0d0'},fiery:{n:'화염',c:'#ff8a20'},
 vamp:{n:'흡혈',c:'#e03050'},thunder:{n:'뇌운',c:'#b090ff'},frost:{n:'한기',c:'#9ae8ff'}};

/* ---------- 소환수 모습 ---------- */
const SUMMON_LOOK={
 stone:{skin:'#9a9a9a',hair:'#555555',body:'#8a8a8a',sub:'#c0c0c0',pants:'#606060',boots:'#505050',hat:'helm',armor:'plate',weapon:'spear',face:'normal',scale:1.05},
 qiang:{skin:'#d9a878',hair:'#2a1a10',body:'#e8e0d0',sub:'#c9a227',pants:'#8a7a60',boots:'#5a4a30',hat:'helm2',armor:'plate',weapon:'spear',face:'fierce',cape:'#c9a227'}};

/* ---------- 무장별 능력치 시작값 (무력 · 민첩 · 체질 · 지력) ---------- */
const HATTR={xu:[27,14,27,10],gan:[22,28,18,12],sun:[16,30,15,19],guan:[25,15,25,10],zhang:[28,10,30,7],zhao:[20,28,18,12],huang:[20,25,18,14],zhuge:[10,15,15,40],
 ma:[22,24,20,10],diao:[14,32,14,18],wei:[27,12,28,8],lubu:[30,22,28,10]};

/* ---------- 스킬 트리 ---------- */
/* ty: basic/cmd/sp(기존 기술 강화 패시브) · proj/dash/nova/rain/chain/quake/whirl/leap/summon/buff(액티브) · passive/aura
   d+dr×(레벨-1) = 공격력 대비 피해 배율 · mp 내공 · cd 초 · mods {스탯:[1레벨값, 레벨당]} */
const TIER_LV=[1,6,12,20,30];
const ACTIVE_TY={proj:1,dash:1,nova:1,rain:1,chain:1,quake:1,whirl:1,leap:1,summon:1,buff:1};
const TREES={guan:['청룡도법','무신','의리'],zhang:['사모술','대갈','호걸'],zhao:['애각창술','은룡','담력'],huang:['궁술','화시','노익장'],
 zhuge:['선술','천문','와룡'],ma:['서량창술','서량기마','금마초'],diao:['쌍검무','폐월','절세'],wei:['대도술','열화','반골'],lubu:['방천화극','비장','비장군'],xu:['대부술','개산','철벽'],gan:['쇄편술','금범','수적'],sun:['궁요술','궁요','호희']};
const SKT={
 guan:[[
  {n:'청룡도법',ic:'刀',ty:'basic',v:8,f:'언월도를 다루는 법을 연마해 기본 공격이 강해진다.'},
  {n:'일도양단',ic:'斷',ty:'dash',d:2.2,dr:.2,mp:9,cd:2.5,dist:12,f:'한 걸음에 적진을 가르는 참격 돌진.'},
  {n:'청룡파',ic:'波',ty:'cmd',v:12,f:'전용기 「청룡파」(↓→+공격)를 강화한다.'},
  {n:'청룡승천',ic:'龍',ty:'proj',kind:'dragon',d:3.2,dr:.3,mp:20,cd:5,spd:10,pierce:1,knock:1,w:75,life:80,f:'청룡의 혼을 담은 거대한 참격을 날린다.'},
  {n:'청룡언월참',ic:'月',ty:'sp',v:10,f:'필살기 「청룡언월참」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'관성의 위엄',ic:'威',ty:'nova',d:1.3,dr:.12,mp:10,cd:4,r:150,stun:40,f:'위엄으로 주변 적을 짓눌러 기절시킨다.'},
  {n:'오관참장',ic:'關',ty:'whirl',d:.7,dr:.06,mp:16,cd:6,dur:90,r:110,f:'다섯 관문을 돌파하듯 회전하며 벤다. 이동 가능.'},
  {n:'무신 강림',ic:'神',ty:'buff',mods:{atkPct:[20,3],dr:[5,.5]},dur:15,mp:20,cd:30,f:'무신의 기운으로 공격력과 방어가 오른다.'},
  {n:'청룡뇌격',ic:'雷',ty:'rain',el:'bolt',hk:'bolt',d:1.2,dr:.1,mp:24,cd:7,cnt:8,spread:420,f:'언월도를 치켜들어 전방에 벼락을 부른다.'},
  {n:'무신일격',ic:'擊',ty:'leap',d:5,dr:.45,mp:38,cd:12,r:170,dist:220,f:'하늘 높이 뛰어올라 대지를 가르는 일격.'}],[
  {n:'미염공',ic:'髯',ty:'passive',mods:{hpPct:[5,1.5],def:[5,3]},f:'늠름한 기개로 체력과 방어력이 오른다.'},
  {n:'도원의 맹세',ic:'桃',ty:'aura',aura:'heal',v:.8,vr:.12,f:'[오라] 아군 전원의 체력이 매초 회복된다(최대 체력 %).'},
  {n:'춘추 독파',ic:'春',ty:'passive',mods:{crit:[3,.6],critDmg:[10,3]},f:'춘추를 읽으며 적의 허점을 꿰뚫는다.'},
  {n:'충의',ic:'忠',ty:'passive',mods:{dr:[3,.5],ls:[1,.2]},f:'꺾이지 않는 충의의 마음.'},
  {n:'천추의리',ic:'義',ty:'buff',mods:{dr:[30,1.5],atkPct:[30,3],kiRegen:[5,.5]},dur:10,mp:40,cd:60,party:1,f:'아군 전원에게 무신의 가호를 내린다.'}]],
 zhang:[[
  {n:'사모술',ic:'矛',ty:'basic',v:8,f:'장팔사모 다루는 법을 연마해 기본 공격이 강해진다.'},
  {n:'사모 찌르기',ic:'突',ty:'dash',d:2,dr:.18,mp:8,cd:2.5,dist:12,f:'사모를 내지르며 돌진한다.'},
  {n:'맹호돌진',ic:'虎',ty:'cmd',v:12,f:'전용기 「맹호돌진」(↓→+공격)을 강화한다.'},
  {n:'장팔난무',ic:'亂',ty:'whirl',d:.8,dr:.07,mp:18,cd:6,dur:80,r:120,f:'사모를 휘돌리며 주변을 쓸어버린다. 이동 가능.'},
  {n:'장판대갈',ic:'喝',ty:'sp',v:10,f:'필살기 「장판대갈」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'대갈일성',ic:'聲',ty:'nova',d:1.2,dr:.1,mp:10,cd:4,r:170,stun:50,f:'벼락같은 호통으로 주변 적을 기절시킨다.'},
  {n:'지진격',ic:'震',ty:'quake',hk:'rock',d:1.6,dr:.14,mp:14,cd:5,cnt:5,step:60,f:'대지를 내리쳐 바위를 솟구치게 한다.'},
  {n:'연인의 분노',ic:'怒',ty:'buff',mods:{atkPct:[25,3],mspd:[10,1]},dur:12,mp:18,cd:25,f:'분노로 공격력과 이동 속도가 오른다.'},
  {n:'천붕지열',ic:'崩',ty:'leap',d:4,dr:.36,mp:26,cd:8,r:160,dist:200,f:'뛰어올라 땅을 내리찍는다.'},
  {n:'만인지적',ic:'萬',ty:'nova',d:4.5,dr:.4,mp:40,cd:14,r:320,stun:60,f:'만 명을 상대하는 기세로 화면을 뒤흔든다.'}],[
  {n:'강골',ic:'骨',ty:'passive',mods:{hpPct:[6,1.5]},f:'강철 같은 뼈대로 최대 체력이 오른다.'},
  {n:'두주불사',ic:'酒',ty:'passive',mods:{kiGain:[10,3],hpRegen:[2,1]},f:'술기운으로 기력과 체력이 차오른다.'},
  {n:'투지',ic:'鬪',ty:'aura',aura:'dmg',d:.35,dr:.04,r:130,f:'[오라] 매초 주변 적에게 피해를 준다.'},
  {n:'철벽',ic:'壁',ty:'passive',mods:{defPct:[10,3],thorns:[10,6]},f:'방어력이 오르고 공격한 적에게 피해를 되돌린다.'},
  {n:'취권광란',ic:'醉',ty:'buff',mods:{ls:[4,.3],atkPct:[30,3],crit:[10,.5]},dur:12,mp:35,cd:45,f:'취기에 몸을 맡겨 광란의 전투를 벌인다.'}]],
 zhao:[[
  {n:'애각창술',ic:'槍',ty:'basic',v:8,f:'애각창 다루는 법을 연마해 기본 공격이 강해진다.'},
  {n:'칠탐반사',ic:'探',ty:'proj',kind:'eslash',d:1.2,dr:.1,mp:8,cd:1.5,cnt:3,spread:.9,spd:12,w:40,f:'창끝에서 세 줄기 창기를 뿜어낸다.'},
  {n:'창룡섬',ic:'閃',ty:'cmd',v:12,f:'전용기 「창룡섬」(↓→+공격)을 강화한다.'},
  {n:'백룡창',ic:'白',ty:'dash',d:2.8,dr:.25,mp:16,cd:5,dist:22,spd:13,f:'백룡처럼 적진을 관통한다.'},
  {n:'백룡돌격',ic:'突',ty:'sp',v:10,f:'필살기 「백룡돌격」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'한광창',ic:'寒',ty:'proj',kind:'wind',el:'ice',d:1.6,dr:.14,mp:8,cd:1.5,pierce:1,spd:10,w:34,f:'한기를 머금은 창기를 날려 적을 얼린다.'},
  {n:'빙룡진',ic:'氷',ty:'nova',el:'ice',d:1.5,dr:.13,mp:14,cd:5,r:160,f:'주변에 얼음 폭풍을 일으킨다.'},
  {n:'한빙 숙련',ic:'霜',ty:'passive',mods:{ice:[12,4],chillCh:[5,1]},f:'빙결 피해가 오르고 타격 시 적을 얼린다.'},
  {n:'설풍창무',ic:'雪',ty:'whirl',el:'ice',d:.8,dr:.07,mp:20,cd:7,dur:80,r:115,f:'눈보라처럼 회전하며 찌른다. 이동 가능.'},
  {n:'은룡강림',ic:'銀',ty:'proj',kind:'dragon',col:'#9ae8ff',el:'ice',d:5,dr:.45,mp:36,cd:12,spd:10,pierce:1,knock:1,w:80,life:80,f:'얼음의 은룡을 불러 적진을 휩쓴다.'}],[
  {n:'일신시담',ic:'膽',ty:'passive',mods:{dr:[3,.5],def:[5,3]},f:'온몸이 담덩어리. 받는 피해가 줄어든다.'},
  {n:'장판단기',ic:'單',ty:'buff',mods:{mspd:[20,1.5],dodge:[10,.8]},dur:15,mp:16,cd:25,f:'홀로 적진을 누비는 신속함.'},
  {n:'칠진칠출',ic:'出',ty:'passive',mods:{crit:[4,.6],critDmg:[8,3]},f:'적진을 일곱 번 드나든 무용.'},
  {n:'백마의 가호',ic:'馬',ty:'aura',aura:'heal',v:.8,vr:.12,f:'[오라] 아군 전원의 체력이 매초 회복된다.'},
  {n:'상산의 용',ic:'常',ty:'buff',mods:{atkPct:[25,3],crit:[10,.5],mspd:[15,1]},dur:12,mp:40,cd:50,party:1,f:'아군 전원의 공격·치명·속도가 오른다.'}]],
 huang:[[
  {n:'백보천양',ic:'弓',ty:'basic',v:8,f:'백 보 밖 버들잎을 꿰뚫는 솜씨. 기본 공격 강화.'},
  {n:'연주전',ic:'連',ty:'proj',kind:'farrow',d:1,dr:.09,mp:8,cd:1.2,cnt:3,spread:.5,spd:15,w:24,f:'화살 세 대를 부채꼴로 쏜다.'},
  {n:'삼연사',ic:'三',ty:'cmd',v:12,f:'전용기 「삼연사」(↓→+공격)를 강화한다.'},
  {n:'관통시',ic:'貫',ty:'proj',kind:'farrow',d:3,dr:.28,mp:16,cd:4,pierce:1,knock:1,spd:18,w:30,f:'모든 적을 꿰뚫는 강궁.'},
  {n:'만궁난사',ic:'萬',ty:'sp',v:10,f:'필살기 「만궁난사」를 강화하고 기력 소모를 줄인다.'}],[
  {n:'화전',ic:'火',ty:'proj',kind:'fireball',el:'fire',d:1.6,dr:.15,mp:9,cd:1.6,explode:70,spd:9,w:28,f:'불붙은 화살이 폭발한다.'},
  {n:'화우',ic:'雨',ty:'rain',el:'fire',hk:'fire',d:.9,dr:.08,mp:18,cd:6,cnt:8,spread:400,f:'불화살 비를 퍼붓는다.'},
  {n:'화공 숙련',ic:'炎',ty:'passive',mods:{fire:[12,4],burnCh:[5,1]},f:'화염 피해가 오르고 타격 시 화상을 입힌다.'},
  {n:'천궁난사',ic:'天',ty:'rain',hk:'arrow',d:1.1,dr:.1,mp:24,cd:7,cnt:16,spread:560,f:'하늘을 뒤덮는 화살비.'},
  {n:'봉황시',ic:'鳳',ty:'proj',kind:'fireball',el:'fire',d:5.2,dr:.45,mp:36,cd:12,explode:150,spd:9,w:40,f:'봉황의 불꽃을 담은 일시(一矢).'}],[
  {n:'노당익장',ic:'老',ty:'passive',mods:{hpPct:[5,1.2],def:[6,3]},f:'늙을수록 더욱 강건하다.'},
  {n:'명궁의 눈',ic:'眼',ty:'passive',mods:{crit:[4,.7],critDmg:[10,3]},f:'급소를 꿰뚫는 눈.'},
  {n:'백전노장',ic:'百',ty:'aura',aura:'stat',mods:{atkPct:[8,1.2]},f:'[오라] 아군 전원의 공격력이 오른다.'},
  {n:'강궁',ic:'强',ty:'passive',mods:{atkPct:[6,1.5]},f:'천 근 활을 당기는 완력.'},
  {n:'불로장생',ic:'壽',ty:'buff',mods:{hpRegen:[10,3],atkPct:[25,3],ls:[3,.2]},dur:15,mp:35,cd:45,f:'노익장의 기운이 폭발한다.'}]],
 zhuge:[[
  {n:'우선술',ic:'扇',ty:'basic',v:8,f:'백우선의 묘리로 기본 공격이 강해진다.'},
  {n:'돌풍',ic:'風',ty:'proj',kind:'wind',d:1.5,dr:.13,mp:8,cd:1.5,pierce:1,knock:1,spd:9,w:34,f:'부채로 돌풍을 일으켜 적을 밀어낸다.'},
  {n:'화계',ic:'火',ty:'cmd',v:12,f:'전용기 「화계」(↓→+공격)를 강화한다.'},
  {n:'팔진 석병',ic:'陣',ty:'summon',look:'stone',cnt:2,d:.9,dr:.08,mp:24,cd:20,dur:20,f:'팔진도의 돌 병사를 불러낸다.'},
  {n:'팔진뇌격',ic:'卦',ty:'sp',v:10,f:'필살기 「팔진뇌격」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'낙뢰',ic:'落',ty:'rain',el:'bolt',hk:'bolt',d:2,dr:.18,mp:8,cd:1.2,cnt:1,target:1,f:'가장 가까운 적에게 벼락을 내린다.'},
  {n:'연쇄뢰',ic:'鎖',ty:'chain',el:'bolt',d:1.4,dr:.12,mp:14,cd:3,cnt:4,f:'적과 적 사이를 뛰어다니는 번개.'},
  {n:'뇌정 숙련',ic:'霆',ty:'passive',mods:{bolt:[12,4],shockCh:[5,1]},f:'뇌전 피해가 오르고 타격 시 감전시킨다.'},
  {n:'동남풍',ic:'東',ty:'proj',kind:'tornado',d:.45,dr:.04,mp:26,cd:8,spd:5.5,life:100,w:70,f:'칠성단에서 빈 동남풍. 적을 빨아들인다.'},
  {n:'천뢰',ic:'天',ty:'rain',el:'bolt',hk:'bolt',d:1.5,dr:.13,mp:40,cd:12,cnt:12,target:1,f:'하늘의 벼락이 화면의 적을 모조리 친다.'}],[
  {n:'와룡의 지혜',ic:'智',ty:'passive',mods:{mpPct:[8,2],mpRegen:[10,4]},f:'최대 내공과 내공 회복 속도가 오른다.'},
  {n:'공성계',ic:'城',ty:'buff',mods:{dr:[25,1.5],thorns:[20,10]},dur:12,mp:18,cd:30,f:'성문을 열고 태연히 거문고를 탄다.'},
  {n:'천하삼분지계',ic:'計',ty:'passive',mods:{cdr:[3,.6],skillDmg:[5,2]},f:'재사용 대기가 줄고 스킬 피해가 오른다.'},
  {n:'목우유마',ic:'牛',ty:'aura',aura:'mp',v:.6,vr:.1,f:'[오라] 아군 전원의 내공이 매초 회복된다.'},
  {n:'출사표',ic:'表',ty:'buff',mods:{atkPct:[20,2.5],skillDmg:[25,3]},dur:15,mp:40,cd:50,party:1,f:'아군 전원의 공격력과 스킬 피해가 오른다.'}]],
 ma:[[
  {n:'서량창술',ic:'西',ty:'basic',v:8,f:'서량의 창술로 기본 공격이 강해진다.'},
  {n:'금마돌창',ic:'錦',ty:'dash',d:2.2,dr:.2,mp:9,cd:2.5,dist:14,f:'금마초의 번개같은 돌창.'},
  {n:'서량돌격',ic:'騎',ty:'cmd',v:12,f:'전용기 「서량돌격」(↓→+공격)을 강화한다.'},
  {n:'사자후창',ic:'獅',ty:'proj',kind:'eslash',col:'#fff0c0',d:3,dr:.28,mp:16,cd:4,pierce:1,knock:1,w:60,spd:12,f:'사자의 포효를 실은 창격파.'},
  {n:'서량선풍창',ic:'旋',ty:'sp',v:10,f:'필살기 「서량선풍창」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'선풍',ic:'風',ty:'proj',kind:'tornado',d:.3,dr:.03,mp:14,cd:5,spd:6,life:70,w:60,f:'작은 회오리를 날린다.'},
  {n:'철기돌파',ic:'鐵',ty:'dash',d:2.8,dr:.25,mp:18,cd:6,dist:28,spd:14,stun:40,f:'철기병처럼 적진을 꿰뚫고 기절시킨다.'},
  {n:'질풍',ic:'疾',ty:'passive',mods:{mspd:[4,1],dashDmg:[15,6]},f:'이동 속도와 돌진 피해가 오른다.'},
  {n:'강족 기병',ic:'羌',ty:'summon',look:'qiang',cnt:2,d:1.1,dr:.1,mp:28,cd:22,dur:18,f:'강족 기병을 불러 함께 싸운다.'},
  {n:'금마 폭풍',ic:'暴',ty:'whirl',d:1.1,dr:.1,mp:40,cd:14,dur:100,r:140,f:'폭풍처럼 회전하며 적을 휩쓴다.'}],[
  {n:'사자 투구',ic:'冑',ty:'passive',mods:{def:[8,4],hpPct:[4,1.2]},f:'방어력과 체력이 오른다.'},
  {n:'복수의 창',ic:'仇',ty:'passive',mods:{crit:[3,.6],atkPct:[4,1.2]},f:'원한이 창끝을 날카롭게 한다.'},
  {n:'서량의 바람',ic:'嵐',ty:'aura',aura:'stat',mods:{mspd:[5,.6],atkPct:[4,.8]},f:'[오라] 아군 전원의 속도와 공격력이 오른다.'},
  {n:'은갑',ic:'甲',ty:'passive',mods:{dr:[3,.5],defPct:[8,2]},f:'은빛 갑옷이 피해를 막는다.'},
  {n:'금마초 각성',ic:'覺',ty:'buff',mods:{atkPct:[35,3.5],mspd:[20,1],crit:[10,.5]},dur:12,mp:40,cd:50,f:'서량의 사자가 깨어난다.'}]],
 diao:[[
  {n:'쌍검술',ic:'劍',ty:'basic',v:8,f:'쌍검의 춤사위로 기본 공격이 강해진다.'},
  {n:'비화검',ic:'飛',ty:'proj',kind:'petal',d:1.4,dr:.12,mp:8,cd:1.5,pierce:1,spd:12,w:34,f:'꽃잎 검기가 날아갔다 되돌아온다.'},
  {n:'비화선',ic:'仙',ty:'cmd',v:12,f:'전용기 「비화선」(↓→+공격)을 강화한다.'},
  {n:'검무',ic:'舞',ty:'whirl',d:.6,dr:.05,mp:16,cd:6,dur:90,r:115,f:'아름다운 검무로 주변을 벤다. 이동 가능.'},
  {n:'폐월난무',ic:'閉',ty:'sp',v:10,f:'필살기 「폐월난무」를 강화하고 기력 소모를 줄인다.'}],[
  {n:'월광',ic:'光',ty:'nova',el:'ice',d:1.4,dr:.12,mp:10,cd:3.5,r:150,f:'차가운 달빛이 주변을 얼린다.'},
  {n:'매혹',ic:'魅',ty:'nova',d:.4,dr:.03,mp:16,cd:10,r:220,stun:120,f:'미소 한 번으로 주변 적을 넋 잃게 한다.'},
  {n:'월하 숙련',ic:'月',ty:'passive',mods:{ice:[12,4],chillCh:[5,1],vsCtrl:[10,3]},f:'빙결 피해와 제압된 적에게 주는 피해가 오른다.'},
  {n:'연환계',ic:'環',ty:'chain',el:'ice',d:1.5,dr:.13,mp:18,cd:4,cnt:5,f:'적과 적을 잇는 얼음 사슬.'},
  {n:'폐월수화',ic:'花',ty:'rain',el:'ice',hk:'ice',d:1.4,dr:.12,mp:38,cd:12,cnt:12,spread:500,f:'달이 숨고 꽃이 부끄러워하는 얼음꽃 폭풍.'}],[
  {n:'경국지색',ic:'色',ty:'passive',mods:{dodge:[4,.6],mspd:[5,.8]},f:'회피와 이동 속도가 오른다.'},
  {n:'연환지계',ic:'謀',ty:'passive',mods:{ls:[1.5,.2],critDmg:[8,3]},f:'생명력 흡수와 치명타 피해가 오른다.'},
  {n:'꽃향기',ic:'香',ty:'aura',aura:'heal',v:.8,vr:.12,f:'[오라] 아군 전원의 체력이 매초 회복된다.'},
  {n:'달빛 가호',ic:'護',ty:'buff',mods:{dr:[25,1.5],dodge:[15,.8]},dur:12,mp:20,cd:30,f:'달빛이 몸을 감싼다.'},
  {n:'경성경국',ic:'傾',ty:'buff',mods:{crit:[20,1],critDmg:[40,5],atkPct:[20,2]},dur:12,mp:40,cd:50,f:'성을 기울이고 나라를 기울이는 아름다움.'}]],
 wei:[[
  {n:'대도술',ic:'大',ty:'basic',v:8,f:'대도를 다루는 법을 연마해 기본 공격이 강해진다.'},
  {n:'내려찍기',ic:'墜',ty:'leap',d:2.2,dr:.2,mp:10,cd:3,r:110,dist:130,f:'뛰어올라 대도로 내려찍는다.'},
  {n:'지열참',ic:'裂',ty:'cmd',v:12,f:'전용기 「지열참」(↓→+공격)을 강화한다.'},
  {n:'반골참',ic:'反',ty:'proj',kind:'eslash',col:'#ff7a2a',el:'fire',d:3,dr:.28,mp:16,cd:4,pierce:1,knock:1,w:60,spd:12,f:'불꽃을 두른 대도의 참격파.'},
  {n:'반골열화참',ic:'烈',ty:'sp',v:10,f:'필살기 「반골열화참」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'화염참',ic:'炎',ty:'quake',el:'fire',hk:'fire',d:1.3,dr:.12,mp:10,cd:3,cnt:4,step:60,f:'땅을 가르며 불기둥이 솟는다.'},
  {n:'불기둥',ic:'柱',ty:'nova',el:'fire',d:1.8,dr:.16,mp:16,cd:5,r:150,f:'주변에 화염을 폭발시킨다.'},
  {n:'열화 숙련',ic:'火',ty:'passive',mods:{fire:[12,4],burnCh:[5,1]},f:'화염 피해가 오르고 타격 시 화상을 입힌다.'},
  {n:'자오곡 기습',ic:'襲',ty:'dash',el:'fire',d:3,dr:.26,mp:22,cd:7,dist:24,spd:13,f:'불꽃을 두르고 적진을 기습한다.'},
  {n:'겁화',ic:'劫',ty:'rain',el:'fire',hk:'fire',d:1.6,dr:.14,mp:40,cd:12,cnt:12,spread:520,f:'세상을 태우는 겁화가 쏟아진다.'}],[
  {n:'반골',ic:'骨',ty:'passive',mods:{atkPct:[6,1.5]},f:'뒤통수의 반골이 힘을 준다.'},
  {n:'광폭',ic:'狂',ty:'buff',mods:{atkPct:[25,3],mspd:[15,1],dr:[-10,0]},dur:12,mp:18,cd:25,f:'방어를 버리고 공격에 몰두한다.'},
  {n:'투혼',ic:'魂',ty:'passive',mods:{hpRegen:[3,1.5],ls:[1,.25]},f:'체력 회복과 생명력 흡수가 오른다.'},
  {n:'위압',ic:'壓',ty:'aura',aura:'dmg',el:'fire',d:.35,dr:.04,r:140,f:'[오라] 매초 주변 적을 불태운다.'},
  {n:'누가 나를 죽이랴',ic:'誰',ty:'buff',mods:{dr:[50,1.5],atkPct:[30,3]},dur:8,mp:40,cd:60,f:'"누가 감히 나를 죽이랴!"'}]],
 lubu:[[
  {n:'화극술',ic:'戟',ty:'basic',v:8,f:'방천화극 다루는 법을 연마해 기본 공격이 강해진다.'},
  {n:'방천참',ic:'方',ty:'proj',kind:'redslash',d:2,dr:.18,mp:10,cd:2,pierce:1,knock:1,w:60,spd:12,f:'붉은 참격파를 날린다.'},
  {n:'방천일섬',ic:'閃',ty:'cmd',v:12,f:'전용기 「방천일섬」(↓→+공격)을 강화한다.'},
  {n:'무쌍돌격',ic:'突',ty:'dash',d:3,dr:.28,mp:18,cd:5,dist:24,spd:14,f:'천하무쌍의 돌격.'},
  {n:'무쌍난무',ic:'無',ty:'sp',v:10,f:'필살기 「무쌍난무」를 강화하고 기력 소모를 줄인다.'}],[
  {n:'적토질주',ic:'赤',ty:'dash',d:1.8,dr:.16,mp:12,cd:4,dist:30,spd:16,f:'적토마처럼 전장을 가로지른다.'},
  {n:'원문사극',ic:'射',ty:'proj',kind:'farrow',d:3.4,dr:.3,mp:16,cd:4,pierce:1,knock:1,spd:20,w:30,f:'백오십 보 밖 화극을 맞힌 신궁.'},
  {n:'천하무쌍',ic:'雙',ty:'passive',mods:{atkPct:[8,2],critDmg:[10,3]},f:'천하에 짝이 없다.'},
  {n:'귀신난무',ic:'鬼',ty:'whirl',d:1,dr:.09,mp:30,cd:10,dur:90,r:140,f:'귀신처럼 휘몰아친다. 이동 가능.'},
  {n:'인중여포',ic:'人',ty:'leap',d:6,dr:.5,mp:45,cd:14,r:200,dist:240,f:'사람 중엔 여포. 전장을 뒤흔드는 도약.'}],[
  {n:'강철 육체',ic:'鋼',ty:'passive',mods:{hpPct:[6,1.5],def:[8,4]},f:'체력과 방어력이 오른다.'},
  {n:'투신',ic:'鬪',ty:'aura',aura:'dmg',d:.4,dr:.05,r:140,f:'[오라] 매초 주변 적에게 피해를 준다.'},
  {n:'흉폭',ic:'凶',ty:'passive',mods:{crit:[4,.6],critDmg:[12,3]},f:'치명타 확률과 피해가 오른다.'},
  {n:'적토마',ic:'兎',ty:'passive',mods:{mspd:[6,1],dashDmg:[15,6]},f:'이동 속도와 돌진 피해가 오른다.'},
  {n:'천하무적',ic:'敵',ty:'buff',mods:{atkPct:[40,4],dr:[30,1],crit:[15,.5]},dur:12,mp:45,cd:60,f:'천하에 적수가 없다.'}]]};

SKT.xu=[[
  {n:'대부술',ic:'斧',ty:'basic',v:8,f:'도끼 다루는 법을 연마해 기본 공격이 강해진다.'},
  {n:'부월돌진',ic:'突',ty:'dash',d:2.3,dr:.2,mp:9,cd:2.5,dist:12,f:'도끼를 앞세워 돌진한다.'},
  {n:'부월참',ic:'旋',ty:'cmd',v:12,f:'전용기 「부월참」(↓→+공격)을 강화한다.'},
  {n:'개산일격',ic:'山',ty:'leap',d:3.4,dr:.3,mp:18,cd:5,r:140,dist:160,f:'뛰어올라 산을 쪼개듯 내려찍는다.'},
  {n:'대부개산',ic:'開',ty:'sp',v:10,f:'필살기 「대부개산」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'지열부',ic:'裂',ty:'quake',hk:'rock',d:1.5,dr:.13,mp:12,cd:4,cnt:5,step:60,f:'도끼로 땅을 갈라 바위를 솟게 한다.'},
  {n:'분쇄',ic:'碎',ty:'nova',d:1.8,dr:.16,mp:16,cd:5,r:160,stun:30,f:'주변을 내려쳐 적을 기절시킨다.'},
  {n:'도끼 숙련',ic:'鋒',ty:'passive',mods:{critDmg:[12,4],atkPct:[4,1]},f:'치명타 피해와 공격력이 오른다.'},
  {n:'대부선풍',ic:'風',ty:'whirl',d:1,dr:.09,mp:22,cd:7,dur:90,r:130,f:'도끼를 휘돌리며 전진한다.'},
  {n:'천붕',ic:'崩',ty:'rain',hk:'rock',d:1.5,dr:.13,mp:40,cd:12,cnt:14,spread:520,f:'하늘이 무너지듯 바위가 쏟아진다.'}],[
  {n:'철벽',ic:'壁',ty:'passive',mods:{defPct:[10,3],dr:[2,.4]},f:'방어력이 오르고 받는 피해가 줄어든다.'},
  {n:'불굴',ic:'屈',ty:'buff',mods:{dr:[20,1.5],atkPct:[15,2]},dur:12,mp:18,cd:28,f:'굴하지 않는 투지.'},
  {n:'주아부의 풍모',ic:'亞',ty:'aura',aura:'stat',mods:{defPct:[6,1],atkPct:[4,.8]},f:'[오라] 아군의 방어 · 공격이 오른다.'},
  {n:'역발산',ic:'力',ty:'passive',mods:{hpPct:[6,1.5],str:[4,1]},f:'산을 뽑을 듯한 힘.'},
  {n:'서황의 결의',ic:'決',ty:'buff',mods:{atkPct:[30,3],crit:[10,.5]},dur:12,mp:40,cd:50,party:1,f:'아군 전원의 공격력 · 치명타가 오른다.'}]];
SKT.gan=[[
  {n:'쇄편술',ic:'鞭',ty:'basic',v:8,f:'쇄편 다루는 법을 연마해 기본 공격이 강해진다.'},
  {n:'편격',ic:'擊',ty:'proj',kind:'eslash',col:'#ffd84a',d:1.5,dr:.13,mp:8,cd:1.5,pierce:1,w:50,spd:14,f:'쇄편을 채찍처럼 뻗어 날린다.'},
  {n:'쇄편격',ic:'鎖',ty:'cmd',v:12,f:'전용기 「쇄편격」(↓→+공격)을 강화한다.'},
  {n:'방울 연쇄',ic:'鈴',ty:'chain',d:1.4,dr:.12,mp:14,cd:3,cnt:5,f:'방울 소리가 적과 적 사이를 튄다.'},
  {n:'금범적풍',ic:'帆',ty:'sp',v:10,f:'필살기 「금범적풍」을 강화하고 기력 소모를 줄인다.'}],[
  {n:'선풍편',ic:'旋',ty:'whirl',d:.8,dr:.07,mp:18,cd:6,dur:90,r:150,f:'쇄편을 크게 휘돌린다. 이동 가능.'},
  {n:'수적 기습',ic:'襲',ty:'dash',d:2.6,dr:.24,mp:16,cd:5,dist:24,spd:14,f:'물살을 가르듯 기습한다.'},
  {n:'방울 소리',ic:'響',ty:'passive',mods:{mspd:[5,1],dodge:[3,.5]},f:'이동 속도와 회피가 오른다.'},
  {n:'금범 폭풍',ic:'暴',ty:'nova',d:1.9,dr:.17,mp:24,cd:7,r:200,stun:40,f:'쇄편을 사방으로 휘몰아친다.'},
  {n:'백기야습',ic:'夜',ty:'rain',hk:'arrow',d:1.2,dr:.1,mp:38,cd:12,cnt:16,spread:560,f:'백 명의 기병으로 적진을 야습한다.'}],[
  {n:'강적',ic:'强',ty:'passive',mods:{crit:[3,.6],critDmg:[10,3]},f:'치명타 확률과 피해가 오른다.'},
  {n:'해적의 피',ic:'血',ty:'buff',mods:{ls:[4,.3],atkPct:[20,2.5]},dur:12,mp:20,cd:28,f:'싸울수록 피가 끓는다.'},
  {n:'금범의 기세',ic:'勢',ty:'aura',aura:'stat',mods:{atkPct:[5,.8],mspd:[4,.6]},f:'[오라] 아군의 공격력과 속도가 오른다.'},
  {n:'흡혈 쇄편',ic:'吸',ty:'passive',mods:{ls:[1,.3]},f:'생명력 흡수가 오른다.'},
  {n:'백기겁영',ic:'劫',ty:'buff',mods:{atkPct:[30,3],mspd:[20,1]},dur:12,mp:40,cd:50,party:1,f:'아군 전원의 공격력 · 속도가 오른다.'}]];
SKT.sun=[[
  {n:'궁요술',ic:'弓',ty:'basic',v:8,f:'활과 무예로 기본 공격이 강해진다.'},
  {n:'연환시',ic:'連',ty:'proj',kind:'farrow',d:.9,dr:.08,mp:8,cd:1.2,cnt:4,spread:.45,spd:15,w:24,f:'화살 네 대를 연달아 쏜다.'},
  {n:'역습시',ic:'逆',ty:'cmd',v:12,f:'전용기 「연환시」(↓→+공격)를 강화한다.'},
  {n:'관통 화살',ic:'貫',ty:'proj',kind:'farrow',d:3,dr:.28,mp:16,cd:4,pierce:1,knock:1,spd:19,w:30,f:'모든 적을 꿰뚫는 화살.'},
  {n:'궁요난사',ic:'姬',ty:'sp',v:10,f:'필살기 「궁요난사」를 강화하고 기력 소모를 줄인다.'}],[
  {n:'화염시',ic:'火',ty:'proj',kind:'fireball',el:'fire',d:1.6,dr:.15,mp:9,cd:1.6,explode:70,spd:9,w:28,f:'폭발하는 불화살.'},
  {n:'화살비',ic:'雨',ty:'rain',hk:'arrow',d:1,dr:.09,mp:18,cd:6,cnt:12,spread:460,f:'화살비를 퍼붓는다.'},
  {n:'궁요 숙련',ic:'藝',ty:'passive',mods:{fire:[10,4],crit:[2,.5]},f:'화염 피해와 치명타가 오른다.'},
  {n:'번개 연환시',ic:'雷',ty:'chain',el:'bolt',d:1.4,dr:.12,mp:16,cd:3.5,cnt:5,f:'번개를 머금은 화살이 튄다.'},
  {n:'봉황 난사',ic:'鳳',ty:'rain',el:'fire',hk:'fire',d:1.5,dr:.13,mp:40,cd:12,cnt:16,spread:560,f:'봉황 불화살이 하늘을 덮는다.'}],[
  {n:'날렵함',ic:'捷',ty:'passive',mods:{dodge:[4,.6],mspd:[5,.8]},f:'회피와 이동 속도가 오른다.'},
  {n:'궁요희의 춤',ic:'舞',ty:'buff',mods:{atkPct:[20,2.5],crit:[10,.5]},dur:12,mp:18,cd:28,f:'춤추듯 활을 쏜다.'},
  {n:'강동의 꽃',ic:'花',ty:'aura',aura:'heal',v:.8,vr:.12,f:'[오라] 아군 전원의 체력이 매초 회복된다.'},
  {n:'명궁',ic:'眼',ty:'passive',mods:{critDmg:[10,3],atkPct:[4,1]},f:'치명타 피해와 공격력이 오른다.'},
  {n:'오후의 영광',ic:'榮',ty:'buff',mods:{atkPct:[25,3],skillDmg:[20,3]},dur:15,mp:40,cd:50,party:1,f:'아군 전원의 공격력 · 스킬 피해가 오른다.'}]];
/* 스킬 사전 생성 + 자동 시너지 */
const SKILLS={},HSK={};
for(const hid in SKT){
  HSK[hid]=[];
  SKT[hid].forEach((tree,tr)=>tree.forEach((s,ti)=>{
    const id=`${hid}_${tr}${ti}`;
    Object.assign(s,{id,hero:hid,tr,ti,lv:TIER_LV[ti],max:20,el:s.el||'phys'});
    SKILLS[id]=s;HSK[hid].push(s);
  }));
  /* 액티브: 같은 계열의 다른 액티브 1레벨당 +6% · 필살/전용기: 1계열 액티브 1레벨당 +5% */
  for(const s of HSK[hid]){
    s.syn=[];
    if(ACTIVE_TY[s.ty]&&s.ty!=='buff'){for(const o of HSK[hid])if(o!==s&&o.tr===s.tr&&ACTIVE_TY[o.ty]&&o.ty!=='buff')s.syn.push([o.id,6])}
    if(s.ty==='cmd'||s.ty==='sp'){for(const o of HSK[hid])if(o.tr===0&&ACTIVE_TY[o.ty]&&o.ty!=='buff')s.syn.push([o.id,5])}
  }
}
