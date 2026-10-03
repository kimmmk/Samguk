'use strict';
/* ===== 효과음 · 음성 — 모두 WebAudio 실시간 합성 + 브라우저 TTS =====
   sfx(name, ...args) 로 호출. 음성: kiai(프로필, 종류) = 기합 합성, say(텍스트, 프로필) = 한국어 TTS */
let SBUS=null,NOISE=null;
function sndInit(){
  if(SBUS||!AC)return;
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=5;comp.connect(AC.destination);
  SBUS=AC.createGain();SBUS.gain.value=.85;SBUS.connect(comp);
  const len=AC.sampleRate*2,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;NOISE=b;
}
function envG(t,a,peak,dec,dest){const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);
  g.gain.exponentialRampToValueAtTime(.0001,t+a+dec);g.connect(dest||SBUS);return g}
function nz(t,dur,o={}){const s=AC.createBufferSource();s.buffer=NOISE;const f=AC.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f0||1000,t);
  if(o.f1)f.frequency.exponentialRampToValueAtTime(o.f1,t+dur);f.Q.value=o.q||1;const g=envG(t,o.a||.005,o.vol||.3,dur,o.dest);s.connect(f);f.connect(g);s.start(t,Math.random());s.stop(t+(o.a||.005)+dur+.05)}
function os(t,dur,o={}){const x=AC.createOscillator();x.type=o.type||'sine';x.frequency.setValueAtTime(o.f0||440,t);if(o.f1)x.frequency.exponentialRampToValueAtTime(o.f1,t+dur);
  const g=envG(t,o.a||.005,o.vol||.3,dur,o.dest);x.connect(g);x.start(t);x.stop(t+(o.a||.005)+dur+.05)}
const HEAVY={glaive:1,halberd:1,bigdao:1,mace:1,snake:1,staff:1};
const SND={
  swing(t,w){if(HEAVY[w]){nz(t,.24,{f0:280,f1:1300,q:1.3,vol:.34,a:.03});os(t,.2,{f0:110,f1:55,vol:.07})}
    else if(w==='fan')nz(t,.2,{f0:600,f1:2200,q:.8,vol:.22,a:.02});
    else nz(t,.13,{f0:1500,f1:4200,q:1.5,vol:.26,a:.012})},
  hit(t,kind,big){
    if(kind==='blunt'){os(t,.15,{f0:150,f1:45,vol:.5});nz(t,.12,{type:'lowpass',f0:900,vol:.4})}
    else if(kind==='pierce'){nz(t,.07,{type:'highpass',f0:3000,vol:.3});os(t,.08,{type:'triangle',f0:900,f1:400,vol:.12});os(t,.1,{f0:140,f1:70,vol:.2})}
    else if(kind==='magic'){os(t,.2,{type:'sawtooth',f0:1200,f1:200,vol:.1});nz(t,.18,{f0:3000,f1:800,q:2,vol:.2})}
    else{nz(t,.09,{type:'highpass',f0:2500,vol:.36});os(t,.1,{type:'triangle',f0:1700,f1:1100,vol:.1});os(t,.12,{f0:130,f1:60,vol:.26})}
    if(big){os(t,.28,{f0:90,f1:35,vol:.5});nz(t,.25,{type:'lowpass',f0:700,f1:150,vol:.32})}},
  jump(t){nz(t,.12,{f0:500,f1:1800,q:2,vol:.12,a:.02})},
  land(t){os(t,.08,{f0:90,f1:50,vol:.22});nz(t,.08,{type:'lowpass',f0:500,vol:.14})},
  step(t){nz(t,.04,{type:'lowpass',f0:700,vol:.05})},
  thud(t){os(t,.2,{f0:80,f1:35,vol:.42});nz(t,.18,{type:'lowpass',f0:420,vol:.28})},
  break(t){nz(t,.25,{f0:3500,q:3,vol:.3});for(let i=0;i<4;i++)os(t+i*.03,.1,{type:'triangle',f0:rnd(1800,3200),vol:.08})},
  item(t){[0,4,7].forEach((s,i)=>os(t+i*.05,.12,{type:'square',f0:880*Math.pow(2,s/12),vol:.06}))},
  treasure(t){[0,4,7,12,16,19,24].forEach((s,i)=>os(t+i*.07,.3,{type:'triangle',f0:523*Math.pow(2,s/12),vol:.12}));nz(t,1.2,{type:'highpass',f0:6000,vol:.05,a:.2})},
  use(t){os(t,.2,{f0:600,f1:1300,vol:.12});os(t+.05,.2,{type:'triangle',f0:900,f1:1800,vol:.08})},
  heal(t){[0,4,7,11].forEach((s,i)=>os(t+i*.06,.6,{f0:660*Math.pow(2,s/12),vol:.08}))},
  power(t){os(t,.5,{type:'sawtooth',f0:110,f1:440,vol:.12});nz(t,.5,{f0:400,f1:3000,q:2,vol:.12,a:.1})},
  bomb(t){os(t,.7,{f0:120,f1:28,vol:.75});nz(t,.8,{type:'lowpass',f0:2400,f1:90,vol:.65,a:.003});nz(t+.05,.4,{type:'highpass',f0:2000,vol:.12})},
  fuse(t){nz(t,.35,{type:'highpass',f0:4500,vol:.08})},
  knife(t){nz(t,.16,{f0:2500,f1:5500,q:4,vol:.14})},
  bow(t){os(t,.12,{type:'triangle',f0:220,f1:170,vol:.22});nz(t,.14,{f0:2000,f1:4500,q:3,vol:.1})},
  whistle(t){os(t,.45,{f0:2600,f1:900,vol:.05})},
  lvl(t){[0,4,7,12,7,12].forEach((s,i)=>os(t+i*.06,.14,{type:'square',f0:523*Math.pow(2,s/12),vol:.07}))},
  sel(t){os(t,.05,{type:'square',f0:880,vol:.05})},
  ok(t){os(t,.07,{type:'square',f0:660,vol:.08});os(t+.06,.12,{type:'square',f0:990,vol:.08})},
  gong(t){nz(t,2,{type:'lowpass',f0:1400,f1:250,vol:.3});os(t,1.8,{f0:72,vol:.25});os(t,1.4,{type:'triangle',f0:214,f1:196,vol:.08})},
  boss(t){SND.gong(t);for(let i=0;i<4;i++)os(t+.3+i*.15,.18,{f0:90,f1:40,vol:.45})},
  bolt(t){nz(t,1,{type:'lowpass',f0:6000,f1:180,vol:.6,a:.002});for(let i=0;i<6;i++)nz(t+i*.035,.05,{type:'highpass',f0:3000,vol:.28});os(t,.6,{f0:60,f1:28,vol:.4})},
  fire(t){nz(t,.9,{type:'lowpass',f0:350,f1:1600,vol:.5,a:.05});for(let i=0;i<8;i++)nz(t+rnd(0,.6),.03,{type:'highpass',f0:3500,vol:.14})},
  wind(t){nz(t,.8,{f0:350,f1:2600,q:3,vol:.3,a:.12})},
  dragon(t){const x=AC.createOscillator(),f=AC.createBiquadFilter(),l=AC.createOscillator(),lg=AC.createGain();x.type='sawtooth';x.frequency.setValueAtTime(95,t);x.frequency.linearRampToValueAtTime(70,t+.9);
    l.frequency.value=18;lg.gain.value=14;l.connect(lg);lg.connect(x.frequency);f.type='lowpass';f.frequency.value=900;const g=envG(t,.08,.3,.9);x.connect(f);f.connect(g);x.start(t);x.stop(t+1.1);l.start(t);l.stop(t+1.1);
    nz(t,.9,{f0:600,q:2,vol:.2,a:.1})},
  roar(t){os(t,.9,{f0:70,f1:35,vol:.7});os(t,.7,{type:'sawtooth',f0:95,f1:60,vol:.14});nz(t,1,{type:'lowpass',f0:1500,f1:120,vol:.55})},
  charm(t){[12,16,19,24,28].forEach((s,i)=>os(t+i*.07,.5,{f0:523*Math.pow(2,s/12),vol:.07}))},
  slash(t){nz(t,.1,{type:'highpass',f0:3000,f1:6000,vol:.3});os(t,.08,{type:'triangle',f0:2400,f1:1500,vol:.08})},
  cutin(t){SND.gong(t);nz(t,.5,{f0:300,f1:4000,q:1.5,vol:.28,a:.3})},
  dash(t){nz(t,.3,{f0:700,f1:3000,q:1,vol:.24,a:.02})},
  magic(t){for(let i=0;i<5;i++)os(t+i*.04,.2,{f0:1400+i*300,vol:.05});nz(t,.3,{f0:2000,f1:5000,q:3,vol:.1})},
  rock(t){os(t,.5,{f0:60,f1:30,vol:.55});nz(t,.5,{type:'lowpass',f0:800,f1:100,vol:.45});for(let i=0;i<4;i++)nz(t+i*.05,.06,{f0:1500,q:2,vol:.15})},
  sp(t){os(t,.5,{type:'sawtooth',f0:110,f1:700,vol:.1})},
  hurt(t){os(t,.12,{type:'sawtooth',f0:160,f1:70,vol:.12})},
  noMp(t){os(t,.15,{type:'square',f0:200,f1:150,vol:.08})}
};
function sfx(n,a,b){if(!AC)return;sndInit();const f=SND[n];if(f)try{f(AC.currentTime,a,b)}catch(e){}}

/* ---------- 음성 ---------- */
const VOICE={on:store.get('kov_voice')!=='0',ko:null};
function loadVoices(){if(!window.speechSynthesis)return;const vs=speechSynthesis.getVoices();VOICE.ko=vs.find(v=>/ko/i.test(v.lang)&&/Heami|SunHi|Female/i.test(v.name))||vs.find(v=>/ko/i.test(v.lang))||null}
if(window.speechSynthesis){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
function toggleVoice(){VOICE.on=!VOICE.on;store.set('kov_voice',VOICE.on?'1':'0');if(!VOICE.on&&window.speechSynthesis)speechSynthesis.cancel()}
/* 무장별 목소리: f0 = 기합 기본 음높이, fs = 포먼트 배율, pitch/rate = TTS */
const VPROF={guan:{f0:98,fs:.9,pitch:.5,rate:1.05},zhang:{f0:82,fs:.85,pitch:.1,rate:1.15},zhao:{f0:130,fs:1,pitch:1,rate:1.25},
  huang:{f0:105,fs:.95,pitch:.45,rate:1.0},zhuge:{f0:120,fs:1,pitch:.85,rate:1.0},ma:{f0:135,fs:1.02,pitch:1.05,rate:1.3},
  diao:{f0:270,fs:1.25,pitch:1.7,rate:1.2},wei:{f0:88,fs:.88,pitch:.25,rate:1.2},lubu:{f0:92,fs:.9,pitch:.3,rate:1.1},xu:{f0:86,fs:.88,pitch:.2,rate:1.05},gan:{f0:125,fs:1,pitch:.9,rate:1.3},sun:{f0:290,fs:1.3,pitch:1.8,rate:1.25},
  enemy:{f0:115,fs:1,pitch:.6,rate:1.2},boss:{f0:90,fs:.9,pitch:.2,rate:1.05}};
const VOWEL={a:[800,1200,2500],e:[500,1800,2500],o:[450,850,2600],u:[350,700,2400],i:[300,2200,3000]};
/* 기합 합성: 톱니파 성대음 → 3개 포먼트 필터 (모음) + 숨소리 노이즈 */
function kiai(prof,kind){
  if(!AC||!VOICE.on)return;sndInit();
  const P=prof||VPROF.enemy,t=AC.currentTime;
  const K={atk:{d:.16,v:'a',p:1,e:.85},big:{d:.34,v:'a',p:1.2,e:.8},hurt:{d:.22,v:'u',p:1.35,e:.75},die:{d:.8,v:'a',p:1.15,e:.55},jump:{d:.12,v:'e',p:1.1,e:.9},cast:{d:.28,v:'o',p:1.05,e:.9}}[kind]||{d:.16,v:'a',p:1,e:.85};
  const f0=P.f0*K.p*rnd(.94,1.06);
  const src=AC.createOscillator();src.type='sawtooth';src.frequency.setValueAtTime(f0,t);src.frequency.exponentialRampToValueAtTime(f0*K.e,t+K.d);
  const jit=AC.createOscillator(),jg=AC.createGain();jit.frequency.value=7;jg.gain.value=f0*.03;jit.connect(jg);jg.connect(src.frequency);
  const out=envG(t,.02,.38,K.d);
  VOWEL[K.v].forEach((F,i)=>{const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=F*P.fs;bp.Q.value=i?12:6;const g=AC.createGain();g.gain.value=[1,.6,.25][i];src.connect(bp);bp.connect(g);g.connect(out)});
  nz(t,.06,{type:'highpass',f0:1800,vol:.18});
  src.start(t);src.stop(t+K.d+.1);jit.start(t);jit.stop(t+K.d+.1);
}
/* 한국어 TTS 외침 (Windows 한국어 음성 사용, 없으면 무음) */
function say(text,prof){
  if(!VOICE.on||!window.speechSynthesis)return;
  const P=prof||VPROF.enemy;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';if(VOICE.ko)u.voice=VOICE.ko;
    u.pitch=P.pitch;u.rate=P.rate||1.2;u.volume=1;speechSynthesis.speak(u)}catch(e){}
}
