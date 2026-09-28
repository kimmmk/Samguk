'use strict';
/* ===== 공통: 캔버스 · 입력 · 사운드 · 유틸 ===== */
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const W=960,H=540,GT=345,GB=520,PR=2;/* 논리 960x540 · 실제 렌더 1920x1080 (PR배) */
const FONT="'Noto Serif KR','Nanum Myeongjo','Batang','Malgun Gothic',serif";
const HANJA="'KaiTi','STKaiti','BiauKai','Noto Serif KR','Batang',serif";
const MONO="'Consolas','Courier New',monospace";
function fit(){const s=Math.min(innerWidth/W,innerHeight/H);cv.style.width=W*s+'px';cv.style.height=H*s+'px';cv.style.marginTop=Math.max(0,(innerHeight-H*s)/2)+'px'}
addEventListener('resize',fit);fit();
ctx.imageSmoothingEnabled=false;

/* 입력 */
/* keys/pressed = 두 플레이어 합산(메뉴·1인용), KP/PP = 플레이어별(2인용) */
const keys={},pressed={},keyHist=[],KP=[{},{}],PP=[{},{}];
const SYSK={Enter:'start',Space:'start',KeyP:'pause',Escape:'pause',KeyN:'bgm',KeyB:'voice'};
const P1K={KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down',KeyF:'atk',KeyJ:'atk',KeyZ:'atk',KeyG:'jump',KeyK:'jump',KeyX:'jump',
  KeyH:'sp',KeyL:'sp',KeyC:'sp',KeyR:'item',KeyU:'item',KeyV:'item',KeyE:'swap',KeyI:'swap',KeyQ:'swap',
  Digit1:'sk1',Digit2:'sk2',Digit3:'sk3',Digit4:'sk4',Digit5:'msp',Tab:'menu',KeyT:'menu',ShiftLeft:'dodge',KeyO:'dodge'};
const P2K={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Comma:'atk',Numpad1:'atk',Period:'jump',Numpad2:'jump',
  Slash:'sp',Numpad3:'sp',KeyM:'item',Numpad0:'item',Semicolon:'swap',NumpadAdd:'swap',Numpad4:'swap',
  BracketLeft:'sk1',BracketRight:'sk2',Quote:'sk3',Backslash:'sk4',Numpad7:'sk1',Numpad8:'sk2',Numpad9:'sk3',Numpad6:'sk4',Minus:'msp',NumpadMultiply:'msp',Equal:'menu',NumpadSubtract:'menu',NumpadDecimal:'menu',ShiftRight:'dodge',Numpad5:'dodge'};
let ctrlHeld=false;addEventListener('blur',()=>{ctrlHeld=false});
addEventListener('keydown',e=>{
  ctrlHeld=e.ctrlKey;
  /* 히든 코드: Ctrl+Alt+Shift + I(금화) / O(강화석) / P(비급 조각) / L(착용 레벨 = 캐릭터 레벨) / K(레벨 +1) / U(금화 +100000) */
  if(e.ctrlKey&&e.altKey&&e.shiftKey&&(e.code==='KeyI'||e.code==='KeyO'||e.code==='KeyP'||e.code==='KeyL'||e.code==='KeyK'||e.code==='KeyU')){e.preventDefault();if((!e.repeat||e.code==='KeyK')&&window.cheatCode)cheatCode(e.code);return}
  let a,pl;if(SYSK[e.code]){a=SYSK[e.code];pl=-1}else if(P1K[e.code]){a=P1K[e.code];pl=0}else if(P2K[e.code]){a=P2K[e.code];pl=1}else return;
  e.preventDefault();audioInit();
  if(!keys[a]){pressed[a]=true;keyHist.push(a);if(keyHist.length>12)keyHist.shift()}keys[a]=true;
  if(pl>=0){if(!KP[pl][a])PP[pl][a]=true;KP[pl][a]=true}
});
addEventListener('keyup',e=>{
  ctrlHeld=e.ctrlKey;
  let a,pl;if(SYSK[e.code]){a=SYSK[e.code];pl=-1}else if(P1K[e.code]){a=P1K[e.code];pl=0}else if(P2K[e.code]){a=P2K[e.code];pl=1}else return;
  if(pl>=0){KP[pl][a]=false;keys[a]=!!(KP[0][a]||KP[1][a])}else keys[a]=false;
});
function hit(k){if(pressed[k]){pressed[k]=false;return true}return false}
function clearPressed(){for(const k in pressed)pressed[k]=false;for(const P of PP)for(const k in P)P[k]=false}

/* 저장 */
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

/* 오디오 컨텍스트 (효과음·음성은 sound.js, BGM은 music.js) */
let AC=null;
function audioInit(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume()}

/* 유틸 */
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function shade(hex,amt){const c=parseInt(hex.slice(1),16);const f=v=>clamp(v+amt,0,255);
  return '#'+((1<<24)|(f(c>>16)<<16)|(f((c>>8)&255)<<8)|f(c&255)).toString(16).slice(1)}
function line(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function circ(x,y,r){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);ctx.fill()}
function ell(x,y,rx,ry){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);ctx.fill()}
function txt(s,x,y,size,col,align='center',font=FONT,stroke=null){ctx.font=`bold ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';
  if(stroke){ctx.lineWidth=stroke[1];ctx.strokeStyle=stroke[0];ctx.lineJoin='round';ctx.strokeText(s,x,y)}ctx.fillStyle=col;ctx.fillText(s,x,y)}
function mkC(w,h,cpu){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));
  /* cpu: 픽셀을 자주 읽는 작업용 캔버스 (세밀화 원본) — CPU 메모리에 두어 getImageData 를 빠르게 */
  if(cpu){const gc=c.getContext;c.getContext=function(t,o){return gc.call(this,t,Object.assign({willReadFrequently:true},o))}}
  return c}

/* ---------- 도트 세밀화: 저해상도 캔버스를 R배로 키우며 경계 명암 · 미세 질감을 더한다 ---------- */
function ihash(x,y,s){let h=(x*374761393+y*668265263+(s|0)*2246822519)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296}
function refineCanvas(src,R,o){
  o=o||{};R=R||3;
  const w=src.width,h=src.height,sd=src.getContext('2d').getImageData(0,0,w,h).data;
  const out=mkC(w*R,h*R),og=out.getContext('2d'),id=og.createImageData(w*R,h*R),d=id.data,OW=w*R;
  const grain=o.grain==null?9:o.grain,hl=o.hl==null?16:o.hl,sh=o.sh==null?20:o.sh,th=o.th==null?34:o.th,seed=o.seed||0;
  const diff=(i,x,y)=>{if(x<0||y<0||x>=w||y>=h)return o.inner?0:999;const j=(y*w+x)*4;if(sd[j+3]<16)return 999;return Math.abs(sd[i]-sd[j])+Math.abs(sd[i+1]-sd[j+1])+Math.abs(sd[i+2]-sd[j+2])};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,al=sd[i+3];if(al<16)continue;
    const up=diff(i,x,y-1)>th,dn=diff(i,x,y+1)>th,lf=diff(i,x-1,y)>th,rt=diff(i,x+1,y)>th;
    for(let sy=0;sy<R;sy++)for(let sx=0;sx<R;sx++){
      const X=x*R+sx,Y=y*R+sy;let k=(ihash(X,Y,seed)-.5)*grain;
      if(up&&sy===0)k+=hl;if(lf&&sx===0)k+=hl*.45;if(dn&&sy===R-1)k-=sh;if(rt&&sx===R-1)k-=sh*.55;
      if(o.metal&&((X-Y+OW*4)%(R*6))<2)k+=26;
      const q=(Y*OW+X)*4;d[q]=Math.max(0,Math.min(255,sd[i]+k));d[q+1]=Math.max(0,Math.min(255,sd[i+1]+k));d[q+2]=Math.max(0,Math.min(255,sd[i+2]+k));d[q+3]=al}
  }
  og.putImageData(id,0,0);return out;
}
