'use strict';
/* ===== HD-2D 렌더링 (이 사본 전용) =====
   월드(배경 · 캐릭터 · 이펙트)를 640x360 픽셀 버퍼에 그린 뒤 최근접 확대로 도트 느낌을 살리고,
   그 위에 고해상도 후처리를 얹는다:
   · 피사계 심도: 배경(화면 위쪽)은 흐리게, 전장은 선명하게 (틸트 시프트)
   · 블룸: 밝은 부분이 번지는 빛
   · 빛줄기 · 색보정 · 비네트 · 떠다니는 먼지
   HUD · 대화창 · 메뉴 글자는 원래 해상도로 선명하게 그린다. */
window.HD2D_ON=false;window.HD2D_S=2/3;
const H2W=Math.round(W*HD2D_S),H2H=Math.round(H*HD2D_S);
const h2c=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const H2_LOW=h2c(H2W,H2H),H2_LX=H2_LOW.getContext('2d');
const H2_BLUR=h2c(H2W,H2H),H2_BX=H2_BLUR.getContext('2d');
const H2_BLOOM=h2c(H2W>>1,H2H>>1),H2_GX=H2_BLOOM.getContext('2d');
/* 장면별 색감 */
function h2Mood(){const bg=Wd&&Wd.S?Wd.S.bg:'plains';
  return{night:{grade:'rgba(110,140,255,.30)',ray:'200,215,255',bloom:.3},redcliff:{grade:'rgba(255,120,70,.32)',ray:'255,170,110',bloom:.32},
    pass:{grade:'rgba(150,170,190,.28)',ray:'220,230,240',bloom:.16},fortress:{grade:'rgba(255,150,100,.30)',ray:'255,200,150',bloom:.2},
    bridge:{grade:'rgba(200,230,210,.25)',ray:'240,250,230',bloom:.2}}[bg]||{grade:'rgba(255,200,140,.32)',ray:'255,236,190',bloom:.22}}
function hd2dBegin(){
  HD2D_ON=true;ctx=H2_LX;
  H2_LX.setTransform(1,0,0,1,0,0);H2_LX.globalAlpha=1;H2_LX.globalCompositeOperation='source-over';H2_LX.filter='none';
  H2_LX.fillStyle='#000';H2_LX.fillRect(0,0,H2W,H2H);H2_LX.setTransform(HD2D_S,0,0,HD2D_S,0,0);H2_LX.imageSmoothingEnabled=false;
}
function hd2dSplit(){if(!HD2D_ON)return;HD2D_ON=false;ctx=MAINCTX;hd2dPost()}
function hd2dPost(){
  const g=MAINCTX,M=h2Mood(),yy=v=>Math.max(0,Math.min(1,v/H));
  g.save();g.globalAlpha=1;g.globalCompositeOperation='source-over';
  /* 1) 도트 버퍼 확대 */
  g.imageSmoothingEnabled=false;g.drawImage(H2_LOW,0,0,W,H);
  /* 2) 피사계 심도: 위쪽 배경과 화면 맨 아래 전경만 흐림 */
  H2_BX.setTransform(1,0,0,1,0,0);H2_BX.globalCompositeOperation='source-over';H2_BX.clearRect(0,0,H2W,H2H);
  H2_BX.filter='blur(2.4px)';H2_BX.drawImage(H2_LOW,0,0);H2_BX.filter='none';
  H2_BX.globalCompositeOperation='destination-in';const m=H2_BX.createLinearGradient(0,0,0,H2H);
  m.addColorStop(0,'rgba(0,0,0,1)');m.addColorStop(yy(190),'rgba(0,0,0,.95)');m.addColorStop(yy(300),'rgba(0,0,0,0)');m.addColorStop(yy(528),'rgba(0,0,0,0)');m.addColorStop(1,'rgba(0,0,0,.55)');
  H2_BX.fillStyle=m;H2_BX.fillRect(0,0,H2W,H2H);H2_BX.globalCompositeOperation='source-over';
  g.imageSmoothingEnabled=true;g.drawImage(H2_BLUR,0,0,W,H);
  /* 3) 블룸 */
  H2_GX.globalCompositeOperation='source-over';H2_GX.clearRect(0,0,H2_BLOOM.width,H2_BLOOM.height);
  H2_GX.filter='brightness(1.1) contrast(3) saturate(1.3) blur(3px)';H2_GX.drawImage(H2_LOW,0,0,H2_BLOOM.width,H2_BLOOM.height);H2_GX.filter='none';
  g.globalCompositeOperation='lighter';g.globalAlpha=M.bloom;g.drawImage(H2_BLOOM,0,0,W,H);g.globalAlpha=1;
  /* 4) 빛줄기 */
  g.globalCompositeOperation='screen';const t=frame*.004;
  for(let i=0;i<5;i++){const x=150+i*200+Math.sin(t+i*1.7)*30,gr=g.createLinearGradient(x,0,x-170,H*.85);gr.addColorStop(0,`rgba(${M.ray},.12)`);gr.addColorStop(1,`rgba(${M.ray},0)`);
    g.fillStyle=gr;g.beginPath();g.moveTo(x-16,0);g.lineTo(x+20,0);g.lineTo(x-150,H*.85);g.lineTo(x-230,H*.85);g.closePath();g.fill()}
  /* 5) 색보정 · 비네트 */
  g.globalCompositeOperation='soft-light';g.fillStyle=M.grade;g.fillRect(0,0,W,H);
  g.globalCompositeOperation='source-over';const v=g.createRadialGradient(W/2,H*.56,H*.32,W/2,H*.56,H*.98);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(8,4,18,.58)');g.fillStyle=v;g.fillRect(0,0,W,H);
  /* 6) 떠다니는 먼지 */
  g.globalCompositeOperation='lighter';
  for(let i=0;i<28;i++){const x=((hash(i*3)*W+frame*.18*(1+hash(i)))%W+W)%W,y=hash(i*7)*H*.92+Math.sin(frame*.012+i)*18;g.globalAlpha=.18+.2*Math.sin(frame*.03+i*1.3);g.drawImage(glowSpr('#fff0c8'),x-4,y-4,8,8)}
  g.restore();g.imageSmoothingEnabled=false;
}
/* 매 프레임 시작 시 원래 캔버스로 복구 (도중 오류 대비) */
const _renderH2=render;
render=function(){ctx=MAINCTX;HD2D_ON=false;_renderH2()};
/* 군영 배경도 HD-2D 로 */
const _drawCampBGH2=drawCampBG;
drawCampBG=function(){hd2dBegin();try{_drawCampBGH2()}finally{hd2dSplit()}};
