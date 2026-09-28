'use strict';
/* ===== BGM — WebAudio 실시간 합성 시퀀서 (5음계 창작곡) =====
   멜로디 문자열: 한 글자 = 8분음표. '0'~'9','a'~'c' = 음계 인덱스, '-' = 늘임, '.' = 쉼표. 8글자 = 1마디.
   b = 마디별 베이스 음계 인덱스, bp = 베이스 리듬(r 근음, o 옥타브, f 5도, . 쉼),
   d = 드럼(k 킥, s 스네어, h 하이햇, x 킥+햇, t 스네어+햇), fill = 마지막 마디 드럼 */
const MAJ=[0,2,4,7,9],MIN=[0,3,5,7,10];
const TRACKS={
  title:{bpm:112,root:62,sc:MAJ,lead:'sawtooth',cut:2200,gong:true,
    m:'3-5-6-8-7-6-5---3-5-6-5-3-2-1---5-6-8-9-8-7-6-5-6-5-3-2-3-------',b:[0,4,3,3,0,4,1,0],bp:'r..or..o',d:'k.h.s.h.',fill:'k.s.s.ss'},
  select:{bpm:132,root:62,sc:MAJ,lead:'square',cut:2600,
    m:'5.5.6.8.9.8.6---5.6.5.3.2.3.5---6.6.8.9.a.9.8.6.5.6.8.6.5---5---',b:[0,3,0,1,4,3,0,0],bp:'r.o.r.o.',d:'khshkhsh'},
  st0:{bpm:126,root:62,sc:MAJ,lead:'square',cut:2400,gong:true,
    m:'0-1-3-5-4-3-1---3-4-5-4-3-1-0---5-5-6-8-6-5-4-3-4-3-1-3-0---.---',b:[0,4,3,0,0,4,1,0],bp:'r.or.or.',d:'k.h.s.hh',fill:'k.s.ssss'},
  st1:{bpm:140,root:57,sc:MIN,lead:'sawtooth',cut:2000,gong:true,
    m:'5-5-7-8-7-5-4---3-4-5-3-2-1-0---5-7-8-a-9-8-7-5-7-5-4-2-3-------',b:[0,2,3,0,0,2,4,3],bp:'rrorrror',d:'kkhskkhs',fill:'ksksssss'},
  st2:{bpm:134,root:60,sc:MAJ,lead:'square',cut:2600,gong:true,
    m:'3-3-5-6-8-6-5-3-5-6-8-9-8-------9-8-6-5-6-5-3-2-3-5-6-5-3-------',b:[0,0,3,3,4,1,0,0],bp:'r.o.r.or',d:'k.hsk.hs',fill:'k.s.ssss'},
  st3:{bpm:152,root:55,sc:MIN,lead:'sawtooth',cut:2200,gong:true,
    m:'0.0.3.5.4.3.5---5.5.7.8.7.5.4---8.7.5.7.8.a.9.8.7.5.4.3.5---5---',b:[0,0,2,4,0,1,2,0],bp:'rorororo',d:'k.skk.sk',fill:'kskskkss'},
  st4:{bpm:118,root:57,sc:MIN,lead:'triangle',cut:1800,gong:true,
    m:'5---4-3-2---0---1-2-3-5-4---3---5---7-8-7---5---4-3-2-1-0-------',b:[0,2,1,4,0,3,2,0],bp:'r..r.o..',d:'k..sk.s.'},
  st5:{bpm:96,root:52,sc:MIN,lead:'triangle',cut:1600,gong:true,
    m:'7---5---4-5-3---2---1-2-3-------5---7---8-7-5---4-3-2-1-0-------',b:[0,2,1,3,0,2,4,0],bp:'r...o...',d:'k...h...'},
  boss:{bpm:164,root:57,sc:MIN,lead:'sawtooth',cut:2800,gong:true,
    m:'0.3.0.4.0.5.4.3.0.3.0.4.5.7.8.7.a.9.8.7.8.7.5.4.5.4.3.2.3.2.1.0.',b:[0,0,0,3,4,3,2,0],bp:'rrororor',d:'kskskkss',fill:'ssssssss'},
  clear:{bpm:150,root:62,sc:MAJ,lead:'square',cut:3000,
    m:'5.5.5.8---9-8-9-a---------------',b:[0,3,4,0],bp:'r.r.r.o.',d:'k.k.k.s.'},
  story:{bpm:80,root:62,sc:MAJ,lead:'triangle',cut:1600,
    m:'5---6---8---6-5-3---5---6-------5---3---2---1-2-3-------0-------',b:[0,4,3,4,1,1,0,0],bp:'r...o...',d:'........'},
  ending:{bpm:88,root:64,sc:MAJ,lead:'triangle',cut:2000,gong:true,
    m:'3-5-6-8-9-------8-6-5-6-8-------9-8-6-5-6-5-3-2-3-5-3-2-0-------',b:[0,4,3,0,4,1,3,0],bp:'r..o.r..',d:'k...s...'},
  cont:{bpm:100,root:52,sc:MIN,lead:'triangle',cut:1400,
    m:'0-1-2---3-2-1---0-.-0-.-0-------',b:[0,4,0,0],bp:'r...r...',d:'k...k...'}
};
const MUS={cur:null,step:0,next:0,bus:null,fx:null,noise:null,on:store.get('kov_bgm')!=='0'};
function musInit(){
  if(MUS.bus||!AC)return;
  MUS.bus=AC.createGain();MUS.bus.gain.value=MUS.on?.3:0;MUS.bus.connect(AC.destination);
  MUS.fx=AC.createGain();MUS.fx.connect(MUS.bus);
  const dl=AC.createDelay(),fb=AC.createGain(),wet=AC.createGain();dl.delayTime.value=.27;fb.gain.value=.3;wet.gain.value=.28;
  MUS.fx.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(MUS.bus);
  const len=AC.sampleRate,buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;MUS.noise=buf;
}
function setBGM(n){if(MUS.cur===n)return;MUS.cur=n;MUS.step=0;if(AC)MUS.next=AC.currentTime+.08}
function toggleBGM(){MUS.on=!MUS.on;store.set('kov_bgm',MUS.on?'1':'0');if(MUS.bus)MUS.bus.gain.setTargetAtTime(MUS.on?.3:0,AC.currentTime,.05)}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function mTone(type,midi,t,dur,vol,dest,opt){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=mtof(midi);
  let out=o;
  if(opt&&opt.cut){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=opt.cut;f.Q.value=1;o.connect(f);out=f}
  if(opt&&opt.vib&&dur>.25){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=5.5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(18,t+Math.min(.3,dur));l.connect(lg);lg.connect(o.detune);l.start(t);l.stop(t+dur+.05)}
  if(opt&&opt.slide){o.frequency.setValueAtTime(mtof(midi-1),t);o.frequency.exponentialRampToValueAtTime(mtof(midi),t+.05)}
  out.connect(g);g.connect(dest);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.setTargetAtTime(vol*.65,t+.03,.12);g.gain.setTargetAtTime(0,t+dur,.05);
  o.start(t);o.stop(t+dur+.3);
}
function mNoise(t,dur,vol,type,freq,dest){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=MUS.noise;f.type=type;f.frequency.value=freq;
  s.connect(f);f.connect(g);g.connect(dest);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.start(t,Math.random()*.5);s.stop(t+dur+.02)}
function mKick(t){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
  g.gain.setValueAtTime(.55,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.connect(g);g.connect(MUS.bus);o.start(t);o.stop(t+.2)}
function mSnare(t){mNoise(t,.13,.22,'bandpass',1800,MUS.bus);mTone('triangle',55,t,.05,.12,MUS.bus)}
function mHat(t){mNoise(t,.035,.07,'highpass',7000,MUS.bus)}
function mGong(t){mNoise(t,1.8,.12,'lowpass',900,MUS.bus);mTone('sine',38,t,1.2,.12,MUS.bus)}
function musStep(T,s,t,dt){
  const len=T.m.length,i=s%len,bars=len/8,bar=Math.floor(i/8),sb=i%8;
  const c=T.m[i];
  if(c!=='-'&&c!=='.'){let n=1;while(T.m[(i+n)%len]==='-'&&n<16)n++;
    const idx=parseInt(c,36),midi=T.root+T.sc[idx%5]+12*Math.floor(idx/5),dur=n*dt*.95;
    mTone(T.lead,midi,t,dur,T.lead==='triangle'?.2:.1,MUS.fx,{cut:T.cut,vib:true,slide:n>2});
    mTone('triangle',midi-12,t,dur,.07,MUS.bus)}
  const bc=(T.bp||'r.o.r.o.')[sb];
  if(bc!=='.'){const deg=T.b[bar%T.b.length];let m=T.root-24+T.sc[deg%5]+12*Math.floor(deg/5);if(bc==='o')m+=12;if(bc==='f')m+=7;mTone('triangle',m,t,dt*.85,.26,MUS.bus)}
  const d=((bar===bars-1&&T.fill)?T.fill:(T.d||'........'))[sb];
  if(d==='k'||d==='x')mKick(t);if(d==='s'||d==='t')mSnare(t);if(d==='h'||d==='x'||d==='t')mHat(t);
  if(i===0&&T.gong)mGong(t);
}
setInterval(()=>{
  if(!AC||!MUS.cur)return;musInit();
  const T=TRACKS[MUS.cur];if(!T)return;
  const dt=60/T.bpm/2;
  if(MUS.next<AC.currentTime)MUS.next=AC.currentTime+.05;
  while(MUS.next<AC.currentTime+.15){if(MUS.on)musStep(T,MUS.step,MUS.next,dt);MUS.step++;MUS.next+=dt}
},25);
