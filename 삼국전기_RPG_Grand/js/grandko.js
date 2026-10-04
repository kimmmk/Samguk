'use strict';
/* ===== 그랑풍: 기술명 한글 표시 · 스킬 그림 아이콘 =====
   · 컷인 서예 글씨 · 큰 글씨 효과 · 기술명 낙관 등 화면에 그리는 한자 기술명을 한글로 바꿔 보여 준다
   · 스킬 아이콘(한자 한 글자)을 스킬 종류 · 투사체 · 속성에 맞는 그림 아이콘으로 바꾼다 */

/* ---------- 한자 → 한글 ---------- */
const KO_CH={靑:'청',龍:'룡',偃:'언',月:'월',斬:'참',長:'장',坂:'판',大:'대',喝:'갈',白:'백',突:'돌',擊:'격',萬:'만',弓:'궁',亂:'난',射:'사',八:'팔',陣:'진',雷:'뇌',
 西:'서',涼:'량',旋:'선',風:'풍',槍:'창',閉:'폐',舞:'무',反:'반',骨:'골',烈:'열',火:'화',無:'무',雙:'쌍',斧:'부',開:'개',山:'산',錦:'금',帆:'범',賊:'적',腰:'요',
 七:'칠',星:'성',倚:'의',天:'천',一:'일',閃:'섬',古:'고',錠:'정',雌:'자',雄:'웅',昇:'승',氷:'빙',魄:'백',網:'망',黃:'황',神:'신',虎:'호',痴:'치',崩:'붕',遼:'요',
 來:'래',覇:'패',王:'왕',號:'호',令:'령',河:'하',北:'북',拔:'발',矢:'시',啖:'담',眼:'안',疾:'질',決:'결',死:'사',刀:'도',狼:'낭',顧:'고',釭:'강',地:'지',裂:'열',
 落:'낙',三:'삼',國:'국',闢:'벽',雲:'운',連:'연',霆:'정',鈞:'균',破:'파',走:'주',震:'진',脚:'각',猛:'맹',蛇:'사',矛:'모',銀:'은',追:'추',日:'일',卦:'괘',縮:'축',
 法:'법',符:'부',馬:'마',花:'화',飛:'비',燕:'연',下:'하',炎:'염',柱:'주',霸:'패',赤:'적',兎:'토',方:'방',石:'석',鎖:'쇄',鞭:'편',鈴:'령',環:'환',步:'보',合:'합',
 羞:'수',武:'무',專:'전',用:'용',回:'회',必:'필',殺:'살',技:'기'};
const KO_WORD={'喝':'일갈','喝!!':'일갈!!','斬':'일섬','炎':'화염','氷':'빙결','雷':'뇌전','武':'무예','鈴雷':'방울뇌','落雷':'낙뢰','天雷符':'천뢰부','狼顧天雷':'낭고천뢰',
 '必殺':'필살','昇天':'승천','專用':'전용','回旋':'회선','技':'기술'};
const HZ_RE=/[㐀-鿿豈-﫿]/;
function hz2ko(s){
  if(!s||!HZ_RE.test(s))return s;
  if(KO_WORD[s])return KO_WORD[s];
  let out='';for(const ch of s)out+=KO_CH[ch]||(HZ_RE.test(ch)?'':ch);return out||s;
}
/* 기술명 낙관 (그랑풍 이펙트) */
const _gpKanjiKO=gpKanji;
gpKanji=function(v,cx){if(!v.ko){v.ko=1;const k=hz2ko(v.txt);if(k!==v.txt){v.txt=k;if(k.length>=4)v.size=Math.round(v.size*.82)}}_gpKanjiKO(v,cx)};
/* 필살기 컷인 서예 글씨 */
const _drawCutinKO=drawCutin;
drawCutin=function(ci){if(ci&&ci.hz&&!ci.hzKo){ci.hzKo=1;ci.hz=hz2ko(ci.hz)}return _drawCutinKO(ci)};
/* 큰 글씨 효과 (喝!! · 無雙 · 開山 · 필살기 피날레 등) */
const _btKO=battleTick;
battleTick=function(){_btKO();const w=Wd;if(!w)return;for(const f of w.fx)if(f.type==='bigtext'&&!f.ko){f.ko=1;f.txt=hz2ko(f.txt)}};

/* 스킬 미리보기 · 목록: 괄호 속 한자 이름 빼기 */
const _pvItemsKO=pvItems;
pvItems=function(ps){const L=_pvItemsKO(ps);for(const it of L)if(it.n)it.n=it.n.replace(/\s*\([^)]*[㐀-鿿][^)]*\)/g,'');return L};

/* ---------- 스킬 그림 아이콘 ---------- */
function skPicto(s,col,on){
  const W_=on?'#ffffff':'#a89a8a',C=on?col:'#7a6a5a';
  const L=(pts,w,c)=>{ctx.strokeStyle=c||W_;ctx.lineWidth=w||3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke()};
  const F=(pts,c)=>{ctx.fillStyle=c||C;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()};
  const O=(x,y,r,c,fill)=>{ctx.beginPath();ctx.arc(x,y,r,0,7);if(fill){ctx.fillStyle=c;ctx.fill()}else{ctx.strokeStyle=c;ctx.stroke()}};
  const head=(x,y,a,c)=>F([[x,y],[x-Math.cos(a-.5)*7,y-Math.sin(a-.5)*7],[x-Math.cos(a+.5)*7,y-Math.sin(a+.5)*7]],c||W_);
  const el=s.hk==='arrow'?'arrow':s.el||'phys';
  switch(s.ty){
    case'basic':L([[-13,13],[13,-13]],4);L([[13,13],[-13,-13]],4);L([[-16,6],[-6,16]],3,C);L([[16,6],[6,16]],3,C);break;
    case'cmd':L([[-15,-13],[-3,5],[15,5]],4);head(16,5,0);L([[-15,-13],[-11,-13]],3,C);O(-15,-13,3,C,1);break;
    case'sp':{F(Array.from({length:16},(_,i)=>{const a=i/16*6.283,r=i%2?7:17;return[Math.cos(a)*r,Math.sin(a)*r]}),C);O(0,0,5,W_,1);break}
    case'passive':{const k=Object.keys(s.mods||{})[0]||'',g=/atk|str|basic|cmd|sp/.test(k)?'atk':/hp|vit|regen|ls/i.test(k)?'hp':/crit/.test(k)?'crit':/mp|ene|ki/.test(k)?'mp':/mspd|dodge|dex/.test(k)?'spd':/skill|cdr|aoe|tree/.test(k)?'book':'def';
      if(g==='atk'){L([[-12,12],[10,-10]],4);L([[4,-14],[14,-4]],3,C);head(13,-13,-.78,C)}
      else if(g==='hp'){ctx.fillStyle=C;ctx.beginPath();ctx.moveTo(0,14);ctx.bezierCurveTo(-18,2,-12,-16,0,-6);ctx.bezierCurveTo(12,-16,18,2,0,14);ctx.fill();L([[-5,-1],[5,-1]],2.5);L([[0,-6],[0,4]],2.5)}
      else if(g==='crit'){ctx.lineWidth=2.5;O(0,0,13,W_);O(0,0,7,C);O(0,0,2.5,C,1);L([[-17,0],[-10,0]],2);L([[10,0],[17,0]],2);L([[0,-17],[0,-10]],2);L([[0,10],[0,17]],2)}
      else if(g==='mp'){F([[0,-15],[9,2],[6,11],[0,14],[-6,11],[-9,2]],C);ctx.lineWidth=2;ctx.strokeStyle=W_;ctx.beginPath();ctx.arc(0,5,5,3.6,5.8);ctx.stroke()}
      else if(g==='spd'){F([[-14,8],[2,-12],[14,-14],[6,0],[12,2],[-2,12]],C);for(const y of[-4,4])L([[-17,y+6],[-10,y]],2)}
      else if(g==='book'){F([[-14,-11],[-1,-8],[-1,13],[-14,10]],C);F([[14,-11],[1,-8],[1,13],[14,10]],C);L([[0,-8],[0,13]],2);L([[-10,-3],[-4,-2]],1.5);L([[4,-2],[10,-3]],1.5)}
      else{F([[0,-16],[13,-10],[11,6],[0,16],[-11,6],[-13,-10]],C);L([[0,-16],[13,-10],[11,6],[0,16],[-11,6],[-13,-10],[0,-16]],2);L([[-6,-1],[0,6],[7,-6]],3)}
      break}
    case'aura':O(0,0,7,C,1);ctx.lineWidth=2;O(0,0,11,W_);for(let i=0;i<8;i++){const a=i/8*6.283;L([[Math.cos(a)*14,Math.sin(a)*14],[Math.cos(a)*19,Math.sin(a)*19]],2.5)}break;
    case'buff':ctx.lineWidth=2;O(0,2,15,C);if(s.party){for(const dx of[-9,0,9]){L([[dx,10],[dx,-4]],3);head(dx,-7,-Math.PI/2)}}else{L([[0,12],[0,-8]],4);head(0,-12,-Math.PI/2)}break;
    case'dash':L([[-6,0],[15,0]],4);head(17,0,0);for(const y of[-8,0,8])L([[-17,y],[-9,y]],2,C);break;
    case'nova':O(0,0,4,W_,1);ctx.lineWidth=2.5;O(0,0,10,C);ctx.lineWidth=2;O(0,0,16,W_);break;
    case'rain':for(let i=0;i<4;i++){const x=-12+i*8,y=-14+(i%2)*6;
        if(el==='bolt')L([[x+3,y],[x-1,y+8],[x+3,y+8],[x-1,y+17]],2.4,C);else if(el==='arrow'){L([[x+4,y],[x-2,y+16]],2,W_);head(x-2,y+17,1.9,C)}
        else if(el==='fire')F([[x,y+17],[x-4,y+10],[x,y],[x+4,y+10]],C);else if(el==='ice')F([[x,y],[x+3,y+8],[x,y+17],[x-3,y+8]],C);else L([[x+4,y],[x-2,y+16]],3,C)}
      L([[-17,17],[17,17]],2);break;
    case'chain':{const P=[[-14,10],[0,-10],[14,8]];for(const p of P)O(p[0],p[1],4,C,1);L([[-14,10],[-9,0],[-4,2],[0,-10],[5,-1],[9,1],[14,8]],2.5);break}
    case'quake':L([[-17,12],[17,12]],3);L([[0,12],[-3,4],[2,-2],[-1,-10]],2.5,C);L([[-8,12],[-12,4]],2,C);L([[8,12],[12,3],[10,-3]],2,C);F([[-14,-4],[-10,-10],[-6,-5]],W_);F([[8,-10],[12,-15],[15,-9]],W_);break;
    case'whirl':ctx.lineWidth=3.5;ctx.strokeStyle=W_;ctx.beginPath();ctx.arc(0,0,13,-.3,4.9);ctx.stroke();head(Math.cos(4.9)*13,Math.sin(4.9)*13,4.9+Math.PI/2);ctx.lineWidth=2;ctx.strokeStyle=C;ctx.beginPath();ctx.arc(0,0,7,1,6);ctx.stroke();break;
    case'leap':ctx.setLineDash([3,3]);ctx.lineWidth=2.5;ctx.strokeStyle=W_;ctx.beginPath();ctx.moveTo(-16,12);ctx.quadraticCurveTo(-4,-22,10,8);ctx.stroke();ctx.setLineDash([]);
      F(Array.from({length:10},(_,i)=>{const a=i/10*6.283,r=i%2?3:8;return[11+Math.cos(a)*r,11+Math.sin(a)*r]}),C);break;
    case'summon':for(const [dx,sc] of[[-8,1],[8,.85]]){O(dx,-8*sc,4.5*sc,W_,1);F([[dx-7*sc,14],[dx-5*sc,-2*sc],[dx+5*sc,-2*sc],[dx+7*sc,14]],C)}L([[13,-14],[13,4]],2);break;
    case'proj':{const k=s.kind||'orb';
      if(k==='dragon'){ctx.lineWidth=4;ctx.strokeStyle=C;ctx.beginPath();ctx.moveTo(-16,10);ctx.bezierCurveTo(-8,-14,4,14,14,-6);ctx.stroke();O(14,-6,4.5,W_,1);L([[14,-6],[19,-12]],2);L([[14,-6],[20,-4]],2)}
      else if(k==='farrow'||k==='arrow'){L([[-15,8],[13,-6]],3);head(16,-8,-.46);L([[-15,8],[-18,3]],2,C);L([[-15,8],[-17,13]],2,C)}
      else if(k==='fireball'){F([[-17,-3],[-2,-8],[-4,0],[-2,8],[-17,3]],C);O(5,0,9,C,1);O(5,0,5,'#fff2c0',1)}
      else if(k==='tornado'){for(let i=0;i<5;i++){ctx.lineWidth=2.5;ctx.strokeStyle=i%2?C:W_;ctx.beginPath();ctx.ellipse(0+(i%2?2:-2),12-i*6,4+i*3,2+i*.6,0,0,7);ctx.stroke()}}
      else if(k==='petal'){for(let i=0;i<5;i++){const a=i/5*6.283;ctx.fillStyle=C;ctx.beginPath();ctx.ellipse(Math.cos(a)*8,Math.sin(a)*8,7,4,a,0,7);ctx.fill()}O(0,0,4,W_,1)}
      else if(k==='eslash'||k==='wind'||k==='redslash'){ctx.fillStyle=k==='redslash'?'#ff5060':C;ctx.beginPath();ctx.arc(-4,0,16,-1.2,1.2);ctx.arc(-10,0,13,1.05,-1.05,true);ctx.closePath();ctx.fill();if(k==='wind')for(const y of[-6,6])L([[-17,y],[-9,y]],2)}
      else{for(const [dx,a] of[[-14,.3],[-8,.6]]){ctx.globalAlpha=a;O(dx,0,4,C,1)}ctx.globalAlpha=1;O(5,0,8,C,1);O(5,0,4,W_,1)}
      break}
    default:O(0,0,10,C,1);
  }
}
drawSkillIcon=function(s,ps,x,y,sz,o){
  o=o||{};const col=skCol(s,ps),rk=ps.rpg.sk[s.id]||0,on=!!(rk||o.hot);
  const g=ctx.createLinearGradient(0,y,0,y+sz);g.addColorStop(0,shade(col,-60));g.addColorStop(1,shade(col,-130));ctx.fillStyle=g;ctx.fillRect(x,y,sz,sz);
  ctx.save();ctx.beginPath();ctx.rect(x,y,sz,sz);ctx.clip();ctx.translate(x+sz/2,y+sz/2);const k=sz/48;ctx.scale(k,k);
  if(on){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;ctx.drawImage(glowSpr(col),-24,-24,48,48);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=3*k;skPicto(s,col,on);ctx.restore();
  if(!rk&&!o.hot){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x,y,sz,sz)}
  ctx.strokeStyle=o.sel?'#ffe060':ACTIVE_TY[s.ty]?col:'#8a7a5a';ctx.lineWidth=o.sel?3:ACTIVE_TY[s.ty]?2:1;ctx.strokeRect(x+.5,y+.5,sz-1,sz-1);
  if(!ACTIVE_TY[s.ty]&&sz>30){ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.strokeRect(x+3.5,y+3.5,sz-7,sz-7)}
};
