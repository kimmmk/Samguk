'use strict';
/* ===== 이펙트 · 파티클 ===== */
const PT=[];
const GLOW=new Map();
function glowSpr(col){let c=GLOW.get(col);if(c)return c;c=mkC(64,64);const g=c.getContext('2d');
  const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.22,col);gr.addColorStop(.55,col+'55');gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);GLOW.set(col,c);return c}
function emit(o){if(PT.length>900)return;PT.push(Object.assign({t:0,life:30,x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,size:6,col:'#ffffff',type:'glow',drag:1,add:true,rot:0},o))}
function burst(x,y,z,col,n,spd,o){o=o||{};for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),s=rnd(.3,1)*spd;
  emit(Object.assign({x,y,z,vx:Math.cos(a)*s,vz:Math.sin(a)*s,vy:rnd(-.6,.6),col,life:rnd(18,34),size:rnd(4,9),drag:.93,type:'sq'},o))}}
function glowFlash(x,y,z,col,size,life){emit({x,y,z,col,size,life:life||10,type:'glow',grow:true})}
function updParticles(){
  for(let i=PT.length-1;i>=0;i--){const p=PT[i];p.t++;
    p.x+=p.vx;p.y+=p.vy;p.z+=p.vz;p.vz-=p.g;p.vx*=p.drag;p.vz*=p.drag;p.rot+=.2;
    if(p.type==='petal'){p.vx+=Math.sin(p.t*.1+p.x)*.05}
    if(p.orbit){p.oa+=p.orbit.w;p.x=p.orbit.cx()+Math.cos(p.oa)*p.orbit.r;p.y=p.orbit.cy()+Math.sin(p.oa)*p.orbit.r*.35;p.z+=p.vz}
    if(p.z<0&&p.g>0){p.z=0;p.vz*=-.3;p.vx*=.6}
    if(p.t>=p.life)PT.splice(i,1)}
}
function drawParticles(cx,layer){
  for(const p of PT){
    if((p.add?1:0)!==layer)continue;
    const sx=p.x-cx,sy=p.y-p.z,a=1-p.t/p.life;
    switch(p.type){
      case'glow':{const s=p.size*(p.grow?(.4+p.t/p.life*1.2):(.5+a*.5));ctx.globalAlpha=Math.min(1,a*1.3);ctx.drawImage(glowSpr(p.col),sx-s,sy-s,s*2,s*2);break}
      case'sq':{const s=Math.max(1,Math.round(p.size*a*.8));ctx.globalAlpha=Math.min(1,a*1.5);ctx.fillStyle=p.col;ctx.fillRect(Math.round(sx-s/2),Math.round(sy-s/2),s,s);
        if(s>=4){ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(Math.round(sx-s/2),Math.round(sy-s/2),Math.ceil(s/2),1)}break}
      case'shard':{ctx.globalAlpha=Math.min(1,a*1.6);ctx.save();ctx.translate(sx,sy);ctx.rotate(p.rot);const s=p.size;ctx.fillStyle=p.col;ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.35,0);ctx.lineTo(0,s);ctx.lineTo(-s*.35,0);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillRect(-.5,-s*.7,1,s*.7);ctx.restore();break}
      case'spark':{ctx.globalAlpha=a;ctx.strokeStyle=p.col;ctx.lineWidth=p.size*a;line(sx,sy,sx-p.vx*3,sy+p.vz*3);break}
      case'petal':{ctx.globalAlpha=Math.min(1,a*2);ctx.save();ctx.translate(sx,sy);ctx.rotate(p.rot);ctx.fillStyle=p.col;ctx.fillRect(-4,-2,8,4);ctx.fillStyle='#fff0f8';ctx.fillRect(-1,-2,3,2);ctx.restore();break}
      case'smoke':{ctx.globalAlpha=a*.45;ctx.fillStyle=p.col;const s=p.size*(1+p.t/p.life*1.5);ctx.fillRect(Math.round(sx-s),Math.round(sy-s),Math.round(s*2),Math.round(s*2));
        ctx.globalAlpha=a*.25;ctx.fillRect(Math.round(sx-s*.7),Math.round(sy-s*1.25),Math.round(s*1.4),Math.round(s*.3));break}
      case'heart':{ctx.globalAlpha=a;txt('♥',sx,sy,p.size*2,p.col);break}
    }
  }
  ctx.globalAlpha=1;
}
function drawParticleLayers(cx){drawParticles(cx,0);ctx.globalCompositeOperation='lighter';drawParticles(cx,1);ctx.globalCompositeOperation='source-over'}

/* 무기 궤적 */
function drawTrail(tr,cx,col){
  if(tr.length<2)return;
  ctx.globalCompositeOperation='lighter';
  for(let i=1;i<tr.length;i++){const a=tr[i-1],b=tr[i],al=i/tr.length;
    ctx.globalAlpha=al*.75;ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(a.tx-cx,a.ty);ctx.lineTo(b.tx-cx,b.ty);ctx.lineTo(b.mx-cx,b.my);ctx.lineTo(a.mx-cx,a.my);ctx.closePath();ctx.fill();
    ctx.globalAlpha=al;ctx.strokeStyle='#ffffff';ctx.lineWidth=2;line(a.tx-cx,a.ty,b.tx-cx,b.ty)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}

/* 번개 */
function boltPath(x0,y0,x1,y1,jag,seed){const pts=[[x0,y0]];const n=10;for(let i=1;i<n;i++){const k=i/n;pts.push([x0+(x1-x0)*k+(hash(seed+i*3.7)-.5)*jag,y0+(y1-y0)*k])}pts.push([x1,y1]);return pts}
function drawBolt(x,y,col,a,seed,w){
  const pts=boltPath(x+(hash(seed)-.5)*40,-10,x,y,36,seed);
  ctx.globalCompositeOperation='lighter';
  for(const [lw,c,al] of[[w*3,col,a*.35],[w,col,a],[Math.max(1,w/3),'#ffffff',a]]){ctx.strokeStyle=c;ctx.globalAlpha=al;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const p of pts)ctx.lineTo(p[0],p[1]);ctx.stroke()}
  ctx.globalAlpha=a*.8;ctx.lineWidth=2;ctx.strokeStyle=col;
  for(let b=0;b<3;b++){const i=2+((hash(seed+b*9)*6)|0),p=pts[i];ctx.beginPath();ctx.moveTo(p[0],p[1]);let bx=p[0],by=p[1];for(let k=0;k<4;k++){bx+=(hash(seed+b*5+k)-.5)*40;by+=12;ctx.lineTo(bx,by)}ctx.stroke()}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}

/* 복합 이펙트 (Wd.fx) */
function drawFx(f,cx){
  const sx=f.x-cx,sy=f.y-(f.z||0),a=1-f.t/f.life;
  switch(f.type){
    case'spark':{ctx.globalCompositeOperation='lighter';ctx.strokeStyle=f.col||'#fff2a0';ctx.globalAlpha=a;ctx.lineWidth=f.big?5:3;
      for(let i=0;i<8;i++){const an=i*Math.PI/4+f.x*.1,r1=4+f.t*3,r2=r1+(f.big?22:14);line(sx+Math.cos(an)*r1,sy+Math.sin(an)*r1,sx+Math.cos(an)*r2,sy+Math.sin(an)*r2)}
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break}
    case'num':txt(f.txt,sx,sy-f.t*.8,f.crit?30:f.big?24:f.small?14:18,f.col,'center',MONO,['#000',4]);break;
    case'hline':{const k=f.t/f.life,wd=k<.45?1+k*4:3+(k-.45)*160*(1-k),al=k<.45?.9:Math.max(0,1-(k-.45)/.55);
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=al;const gg=ctx.createLinearGradient(0,f.y-wd,0,f.y+wd);gg.addColorStop(0,'rgba(0,0,0,0)');gg.addColorStop(.5,f.col);gg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gg;ctx.fillRect(0,f.y-wd,W,wd*2);ctx.fillStyle='#ffffff';ctx.fillRect(0,f.y-Math.max(1,wd*.12),W*Math.min(1,k*3),Math.max(2,wd*.24));
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';break}
    case'rune':{const k=f.t/f.life,al=k<.15?k/.15:Math.max(0,1-(k-.15)/.85),r=f.r*(.75+.25*Math.min(1,k*5)),rot=f.t*.07,T2=Math.PI*2;
      ctx.save();ctx.translate(sx,f.y);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=al;ctx.strokeStyle=f.col;ctx.fillStyle=f.col;
      ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,r,r*.34,0,0,T2);ctx.stroke();
      ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,r*.8,r*.8*.34,0,0,T2);ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,r*.45,r*.45*.34,0,0,T2);ctx.stroke();
      for(let i=0;i<24;i++){const an=rot+i/24*T2;ctx.fillStyle=i%3?f.col:'#ffffff';ctx.fillRect(Math.round(Math.cos(an)*r*.9)-1,Math.round(Math.sin(an)*r*.9*.34)-1,i%3?2:3,i%3?2:3)}
      ctx.strokeStyle=f.col;ctx.beginPath();for(let i=0;i<=5;i++){const an=-rot*1.4+i*T2*2/5,px=Math.cos(an)*r*.78,py=Math.sin(an)*r*.78*.34;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py)}ctx.stroke();
      ctx.globalAlpha=al*.35;ctx.drawImage(glowSpr(f.col),-r,-r*.4,r*2,r*.8);
      ctx.restore();break}
    case'chainl':{if(f.t<(f.delay||0))break;const k=1-(f.t-(f.delay||0))/Math.max(1,f.life-(f.delay||0)),pts=boltPath(f.x-cx,f.y,f.x2-cx,f.y2,28,f.x*.13+f.t);
      ctx.globalCompositeOperation='lighter';for(const [lw,c,al] of [[9,f.col,k*.35],[3,f.col,k],[1.5,'#ffffff',k]]){ctx.strokeStyle=c;ctx.globalAlpha=al;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const q of pts)ctx.lineTo(q[0],q[1]);ctx.stroke()}
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';break}
    case'text':ctx.globalAlpha=Math.min(1,a*2);txt(f.txt,sx,sy-f.t*.6,f.size||20,f.col,'center',FONT,['#000',5]);ctx.globalAlpha=1;break;
    case'ring':{if(f.t<(f.delay||0))break;const k=(f.t-(f.delay||0))/(f.life-(f.delay||0));ctx.globalCompositeOperation='lighter';ctx.strokeStyle=f.col||'#ffe6a0';ctx.globalAlpha=1-k;ctx.lineWidth=14*(1-k)+2;
      ctx.beginPath();ctx.ellipse(sx,f.y,(f.r||300)*k,(f.r||300)*k*.38,0,0,Math.PI*2);ctx.stroke();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break}
    case'bigtext':{const k=f.t/f.life,s=k<.15?2.2-k/.15*1.2:1;ctx.globalAlpha=Math.min(1,a*2.5);ctx.save();ctx.translate(sx,sy);ctx.scale(s,s);ctx.rotate(-.08);
      txt(f.txt,0,0,f.size||80,f.col||'#fff','center',HANJA,[f.stroke||'#600',10]);ctx.restore();ctx.globalAlpha=1;break}
    case'crack':{ctx.strokeStyle=`rgba(30,15,5,${a})`;ctx.lineWidth=4;for(const c of f.segs){ctx.beginPath();ctx.moveTo(sx,f.y);let x=sx,y=f.y;for(const s of c){x+=s[0];y+=s[1];ctx.lineTo(x,y)}ctx.stroke()}
      ctx.strokeStyle=`rgba(255,160,80,${a*.8})`;ctx.lineWidth=1.5;for(const c of f.segs){ctx.beginPath();ctx.moveTo(sx,f.y);let x=sx,y=f.y;for(const s of c){x+=s[0];y+=s[1];ctx.lineTo(x,y)}ctx.stroke()}break}
    case'bagua':{const r=Math.min(1,f.t/12)*180,al=Math.min(1,a*2);ctx.save();ctx.translate(sx,f.y);ctx.scale(1,.38);ctx.rotate(f.t*.05);
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=al*.6;ctx.strokeStyle='#8ad8ff';ctx.lineWidth=6;
      ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.72,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4);for(let l=0;l<3;l++){const broken=hash(i*3+l)<.5;ctx.fillStyle='#bff0ff';
        if(broken){ctx.fillRect(-26,-r*.94+l*12,20,6);ctx.fillRect(6,-r*.94+l*12,20,6)}else ctx.fillRect(-26,-r*.94+l*12,52,6)}ctx.restore()}
      ctx.fillStyle='#4aa8ff';ctx.globalAlpha=al*.25;circ(0,0,r*.6);ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break}
    case'slashX':{const k=f.t/f.life,len=f.len||260;ctx.globalCompositeOperation='lighter';ctx.save();ctx.translate(sx,sy);ctx.rotate(f.ang);
      const w=Math.max(0,(1-k))*16,x0=-len/2+(k<.3?(1-k/.3)*len:0);
      ctx.fillStyle=f.col||'#ff4040';ctx.globalAlpha=1-k;ctx.beginPath();ctx.moveTo(x0,0);ctx.lineTo(0,-w);ctx.lineTo(len/2,0);ctx.lineTo(0,w);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(x0,0);ctx.lineTo(0,-w/3);ctx.lineTo(len/2,0);ctx.lineTo(0,w/3);ctx.closePath();ctx.fill();
      ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break}
    case'pillar':{ctx.globalCompositeOperation='lighter';const w=(f.w||50)*(1-f.t/f.life*.5);const g=ctx.createLinearGradient(sx-w,0,sx+w,0);
      g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,f.col||'#ffe080');g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(sx-w,0,w*2,f.y+10);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break}
    case'rays':{ctx.save();ctx.translate(sx,sy);ctx.rotate(f.t*.03);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,a*1.5)*.5;ctx.fillStyle='#ffd860';
      for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-14,-220);ctx.lineTo(14,-220);ctx.fill()}ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break}
    case'after':ctx.globalAlpha=a*.55;renderModel(ctx,f.look,f.pose,sx,f.y,f.sc||((f.look.scale||1)>=1.1?1.95:1.3),f.facing,{tint:f.tint||'rgba(160,220,255,.55)'});ctx.globalAlpha=1;break;
    case'flashc':{ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;const s=(f.r||120)*(.5+f.t/f.life);ctx.drawImage(glowSpr(f.col||'#ffffff'),sx-s,sy-s,s*2,s*2);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break}
    case'smoke':for(let i=0;i<6;i++){ctx.fillStyle=`rgba(120,90,140,${a*.6})`;circ(sx+Math.cos(i)*f.t,f.y-40+Math.sin(i*2)*f.t*.8,14+f.t*.4)}break;
    case'debris':ctx.fillStyle=f.col;ctx.fillRect(Math.round(sx/3)*3-3,Math.round(sy/3)*3-3,6,6);break;
  }
}

/* 투사체 */
function drawProj(o,cx){
  const sx=o.x-cx,sy=o.y-o.z,d=Math.sign(o.vx)||1;
  if(o.kind==='dragon'){
    ctx.globalCompositeOperation='lighter';
    const hist=o.hist||[];
    for(let i=0;i<hist.length;i++){const h=hist[i],k=i/hist.length,r=8+k*22;ctx.globalAlpha=.25+k*.5;ctx.drawImage(glowSpr(o.col||'#40ff90'),h[0]-cx-r,h[1]-r,r*2,r*2)}
    ctx.save();ctx.translate(sx,sy);ctx.scale(d,1);
    ctx.globalAlpha=.55;ctx.fillStyle=o.col||'#50ff90';ctx.beginPath();ctx.arc(-10,0,78,-1.25,1.25);ctx.arc(-50,0,62,1.15,-1.15,true);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#eafff0';ctx.beginPath();ctx.arc(-10,0,70,-1.1,1.1);ctx.arc(-30,0,58,1.0,-1.0,true);ctx.fill();
    ctx.fillStyle=o.col||'#2aff80';ctx.beginPath();ctx.moveTo(60,-6);ctx.lineTo(84,-20);ctx.lineTo(76,0);ctx.lineTo(84,18);ctx.lineTo(60,6);ctx.fill();ctx.fillStyle='#ffffff';circ(70,-6,3);
    ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;return;
  }
  if(o.kind==='tornado'){
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<12;i++){const y=o.y-i*14,r=16+i*6,ph=frame*.5+i;ctx.globalAlpha=.18+.04*i;ctx.strokeStyle=i%2?(o.col2||'#dfeaff'):(o.col||'#9ac8ff');ctx.lineWidth=5;
      ctx.beginPath();ctx.ellipse(sx+Math.sin(ph*.3)*6,y,r,r*.3,0,ph%(Math.PI*2),ph%(Math.PI*2)+4.5);ctx.stroke()}
    ctx.globalAlpha=.5;ctx.drawImage(glowSpr(o.col||'#9ac8ff'),sx-60,o.y-150,120,160);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;return;
  }
  if(o.kind==='bomb'){ctx.save();ctx.translate(sx,sy);ctx.rotate(frame*.3);ctx.fillStyle='#222';ctx.fillRect(-9,-9,18,18);ctx.fillStyle='#555';ctx.fillRect(-9,-9,18,4);ctx.fillStyle='#c02020';ctx.fillRect(-9,-2,18,4);
    ctx.restore();ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr('#ffb040'),sx-10,sy-22,20,20);ctx.globalCompositeOperation='source-over';return}
  if(o.kind==='petal'){ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr('#ff8ad0'),sx-40,sy-40,80,80);ctx.globalCompositeOperation='source-over';
    for(let i=0;i<6;i++){const a=frame*.5+i*Math.PI/3;ctx.save();ctx.translate(sx+Math.cos(a)*18,sy+Math.sin(a)*10);ctx.rotate(a);ctx.fillStyle=i%2?'#ff8ad0':'#ffd0e8';ctx.fillRect(-7,-3,14,6);ctx.restore()}return}
  if(o.kind==='axe'){ctx.save();ctx.translate(sx,sy);ctx.rotate(frame*.55*d);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5;ctx.drawImage(glowSpr(o.col||'#ffb040'),-34,-34,68,68);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#6a4020';ctx.fillRect(-2,-22,4,40);ctx.fillStyle='#d8e0e8';ctx.beginPath();ctx.moveTo(2,-20);ctx.lineTo(20,-26);ctx.lineTo(24,-8);ctx.lineTo(20,8);ctx.lineTo(2,0);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillRect(18,-22,3,24);ctx.restore();return}
  if(o.kind==='eball'){const c=o.col||'#ffffff';ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr(c),sx-34,sy-34,68,68);
    for(let i=0;i<6;i++){const a=frame*.3+i*Math.PI/3,r=14+Math.sin(frame*.2+i)*3;ctx.fillStyle=i%2?c:'#ffffff';ctx.fillRect(Math.round(sx+Math.cos(a)*r)-1,Math.round(sy+Math.sin(a)*r*.6)-1,2,2)}
    ctx.fillStyle=c;circ(sx,sy,8);ctx.fillStyle='#ffffff';circ(sx-1,sy-1,4);ctx.globalCompositeOperation='source-over';return}
  if(o.kind==='eslash'){const c=o.col||'#ffffff';ctx.save();ctx.translate(sx,sy);ctx.scale(d,1);ctx.globalCompositeOperation='lighter';
    const R0=Math.max(30,o.w);ctx.drawImage(glowSpr(c),-R0*1.2,-R0*1.1,R0*2.2,R0*2.2);
    for(let i=0;i<5;i++){ctx.globalAlpha=.5-i*.08;ctx.strokeStyle=i%2?'#ffffff':c;ctx.lineWidth=1;const yy=(i-2)*R0*.28;ctx.beginPath();ctx.moveTo(-R0*1.6-i*8,yy);ctx.lineTo(-R0*.6,yy);ctx.stroke()}
    ctx.globalAlpha=.6;ctx.fillStyle=c;
    ctx.beginPath();ctx.arc(-10,0,Math.max(30,o.w),-1.3,1.3);ctx.arc(-10-Math.max(30,o.w)*.5,0,Math.max(30,o.w)*.8,1.2,-1.2,true);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(-10,0,Math.max(30,o.w)*.9,-1.05,1.05);ctx.arc(-24,0,Math.max(30,o.w)*.8,1,-1,true);ctx.fill();
    ctx.restore();ctx.globalCompositeOperation='source-over';return}
  if(o.kind==='fireball'){ctx.globalCompositeOperation='lighter';for(let i=0;i<4;i++)ctx.drawImage(glowSpr(i%2?'#ff6020':'#ffc040'),sx-d*i*10-24+i*2,sy-24+i*2,48-i*4,48-i*4);
    ctx.fillStyle='#fff8d0';circ(sx,sy,8);ctx.globalCompositeOperation='source-over';return}
  ctx.save();ctx.translate(sx,sy);ctx.scale(d,1);
  switch(o.kind){
    case'gwave':ctx.globalCompositeOperation='lighter';{const g=ctx.createLinearGradient(-60,0,20,0);g.addColorStop(0,'rgba(80,255,150,0)');g.addColorStop(1,'rgba(160,255,200,.9)');
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-60,50);ctx.quadraticCurveTo(0,-30,24,-50+Math.sin(frame*.6)*6);ctx.quadraticCurveTo(10,0,30,50);ctx.fill();
      ctx.drawImage(glowSpr('#50ff90'),-30,-40,70,100)}break;
    case'redslash':ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,40,30,.55)';ctx.beginPath();ctx.arc(-20,0,90,-1.3,1.3);ctx.arc(-70,0,72,1.2,-1.2,true);ctx.fill();
      ctx.fillStyle='#fff0e0';ctx.beginPath();ctx.arc(-20,0,82,-1.1,1.1);ctx.arc(-40,0,72,1,-1,true);ctx.fill();break;
    case'arrow':ctx.strokeStyle='#d8c8a0';ctx.lineWidth=2;line(-18,0,14,0);ctx.fillStyle='#ccc';ctx.beginPath();ctx.moveTo(14,-3);ctx.lineTo(20,0);ctx.lineTo(14,3);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-20,-3,5,6);break;
    case'farrow':ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr('#ff9a30'),-30,-14,44,28);ctx.strokeStyle='#ffe0a0';ctx.lineWidth=3;line(-24,0,18,0);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(16,-4);ctx.lineTo(24,0);ctx.lineTo(16,4);ctx.fill();break;
    case'knife':ctx.rotate(frame*.6);ctx.fillStyle='#e8eef4';ctx.fillRect(-10,-2,20,4);ctx.fillStyle='#c02020';ctx.fillRect(-12,-2,4,4);break;
    case'wind':ctx.globalCompositeOperation='lighter';for(let i=0;i<4;i++){ctx.strokeStyle=`rgba(170,225,255,${.9-i*.2})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(-i*10,0,14+i*6,-1.2+frame*.3,1.8+frame*.3);ctx.stroke()}ctx.drawImage(glowSpr('#8ad8ff'),-26,-26,52,52);break;
    case'orb':ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr('#c050ff'),-26,-26,52,52);ctx.fillStyle='#f6e0ff';circ(0,0,6);break;
    case'swave':ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(120,170,255,.55)';ctx.beginPath();ctx.arc(-6,0,38,-1.3,1.3);ctx.arc(-24,0,30,1.2,-1.2,true);ctx.fill();
      ctx.fillStyle='#eaf2ff';ctx.beginPath();ctx.arc(-6,0,33,-1.1,1.1);ctx.arc(-15,0,28,1,-1,true);ctx.fill();break;
  }
  ctx.restore();ctx.globalCompositeOperation='source-over';
}

/* 위험지대 (벼락·화살비·충격파·화염기둥) */
function drawHz(z,cx){
  const sx=z.x-cx,k=z.t/z.delay;
  if(z.t<z.delay){
    if(z.kind==='arrow'){const ay=z.y-60-(1-k)*420;ctx.globalCompositeOperation='lighter';ctx.drawImage(glowSpr('#ffb040'),sx-12,ay-10,24,50);
      ctx.strokeStyle='#fff0c0';ctx.lineWidth=3;line(sx-4,ay,sx+2,ay+36);ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(255,200,80,.25)';ell(sx,z.y,z.r*.6,z.r*.24)}
    else if(z.kind==='fire'||z.kind==='boom'){ctx.fillStyle=`rgba(255,120,30,${.2+k*.4})`;ell(sx,z.y,z.r*k,z.r*k*.35)}
    else if(z.kind==='rock'){ctx.fillStyle=`rgba(90,60,30,${.3+k*.4})`;ell(sx,z.y,z.r*k,z.r*k*.35)}
    else if(z.kind!=='slam'){ctx.strokeStyle=`rgba(255,${z.owner==='p'?220:60},60,${.5+.4*Math.sin(z.t*.6)})`;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(sx,z.y,z.r*k,z.r*k*.4,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(sx,z.y,z.r,z.r*.4,0,0,Math.PI*2);ctx.stroke()}
  }else{
    const dur=z.dur||16,a=1-(z.t-z.delay)/dur;
    if(z.kind==='bolt'){drawBolt(sx,z.y,z.owner==='p'?'#6ac8ff':'#d070ff',a,z.x*.37+z.y,7);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;ctx.drawImage(glowSpr(z.owner==='p'?'#6ac8ff':'#d070ff'),sx-z.r*1.3,z.y-z.r*.6,z.r*2.6,z.r*1.2);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
    else if(z.kind==='ice'){const up=Math.min(1,(z.t-z.delay)/4)*a;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*.7;ctx.drawImage(glowSpr('#9ae8ff'),sx-z.r,z.y-z.r*.9,z.r*2,z.r*1.2);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      for(let i=-2;i<=2;i++){const h=(64-Math.abs(i)*16)*up;ctx.fillStyle=i%2?'#bff0ff':'#e8fbff';ctx.beginPath();ctx.moveTo(sx+i*14-8,z.y);ctx.lineTo(sx+i*14+(i*2),z.y-h);ctx.lineTo(sx+i*14+8,z.y);ctx.fill()}}
    else if(z.kind==='slam'){ctx.strokeStyle=`rgba(200,160,100,${a})`;ctx.lineWidth=10;const r=z.r*(1-a*.6);ctx.beginPath();ctx.ellipse(sx,z.y,r,r*.4,0,0,Math.PI*2);ctx.stroke()}
    else if(z.kind==='fire'){ctx.globalCompositeOperation='lighter';const hgt=260*Math.min(1,(z.t-z.delay)/5)*(.6+a*.4);
      const g=ctx.createLinearGradient(0,z.y-hgt,0,z.y);g.addColorStop(0,'rgba(255,60,0,0)');g.addColorStop(.4,'rgba(255,120,20,.8)');g.addColorStop(1,'rgba(255,240,160,1)');
      ctx.globalAlpha=a;ctx.fillStyle=g;const w=z.r*.7*(1+Math.sin(z.t*.8)*.1);ctx.beginPath();ctx.moveTo(sx-w,z.y);ctx.quadraticCurveTo(sx-w*.3,z.y-hgt*.6,sx,z.y-hgt);ctx.quadraticCurveTo(sx+w*.3,z.y-hgt*.6,sx+w,z.y);ctx.fill();
      ctx.drawImage(glowSpr('#ff7a2a'),sx-w*1.6,z.y-60,w*3.2,90);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
    else if(z.kind==='boom'){const k2=(z.t-z.delay)/dur;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;
      ctx.drawImage(glowSpr('#ff9030'),sx-z.r*1.6*(.5+k2),z.y-z.r*2*(.5+k2),z.r*3.2*(.5+k2),z.r*2.4*(.5+k2));ctx.drawImage(glowSpr('#ffffff'),sx-z.r*.6,z.y-z.r,z.r*1.2,z.r);
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.strokeStyle=`rgba(255,200,120,${a})`;ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(sx,z.y,z.r*(.4+k2),z.r*(.4+k2)*.38,0,0,Math.PI*2);ctx.stroke()}
    else if(z.kind==='rock'){const up=Math.min(1,(z.t-z.delay)/4)*a;ctx.fillStyle='#6a5236';
      for(let i=-2;i<=2;i++){const h=(70-Math.abs(i)*18)*up;ctx.beginPath();ctx.moveTo(sx+i*16-10,z.y);ctx.lineTo(sx+i*16,z.y-h);ctx.lineTo(sx+i*16+10,z.y);ctx.fill();
        ctx.fillStyle='#9a7a50';ctx.fillRect(sx+i*16-2,z.y-h,3,h*.6);ctx.fillStyle='#6a5236'}
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*.6;ctx.drawImage(glowSpr('#ff7a2a'),sx-50,z.y-30,100,50);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
    else if(z.kind==='arrow'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;ctx.drawImage(glowSpr('#ffb040'),sx-z.r,z.y-z.r*.5,z.r*2,z.r);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.strokeStyle='#e8d8b0';ctx.lineWidth=2;line(sx,z.y-30,sx+4,z.y)}
  }
}

/* 필살기 컷인 */
function drawCutin(ci){
  const h=ci.h,t=ci.t,dur=ci.dur,col=ci.col||h.fx,boss=!!ci.boss,dir=boss?-1:1,T2=Math.PI*2;
  const inK=easeOut(Math.min(1,t/10)),outK=t>dur-8?(t-(dur-8))/8:0,zoom=1+t/dur*.12;
  /* 화면 암전 + 속도감 */
  ctx.fillStyle=`rgba(0,0,0,${.72*Math.min(1,t/4)})`;ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.translate(dir*((1-inK)*-W+outK*W*1.3),0);
  /* 사선 무대 (일러스트 캔버스) */
  const y0=H/2-150,y1=H/2+120;
  ctx.beginPath();if(!boss){ctx.moveTo(-60,y0+40);ctx.lineTo(W+60,y0-10);ctx.lineTo(W+60,y1-40);ctx.lineTo(-60,y1+10)}else{ctx.moveTo(-60,y0-10);ctx.lineTo(W+60,y0+40);ctx.lineTo(W+60,y1+10);ctx.lineTo(-60,y1-40)}ctx.closePath();
  ctx.save();ctx.clip();
  const g=ctx.createLinearGradient(boss?W:0,0,boss?0:W,0);g.addColorStop(0,shade(col,-20));g.addColorStop(.45,shade(col,-110));g.addColorStop(1,'#050208');ctx.fillStyle=g;ctx.fillRect(-60,0,W+120,H);
  /* 방사형 광선 */
  const cx0=boss?W-270:270,cy0=H/2-20;ctx.globalCompositeOperation='lighter';
  for(let i=0;i<24;i++){const a=i/24*T2+t*.03*dir,a2=a+.07;ctx.fillStyle=hexA(col,i%2?.10:.18);ctx.beginPath();ctx.moveTo(cx0,cy0);ctx.lineTo(cx0+Math.cos(a)*900,cy0+Math.sin(a)*900);ctx.lineTo(cx0+Math.cos(a2)*900,cy0+Math.sin(a2)*900);ctx.fill()}
  ctx.globalAlpha=.8;ctx.drawImage(glowSpr(col),cx0-220,cy0-220,440,440);ctx.globalAlpha=1;
  /* 속도선 */
  ctx.strokeStyle='#ffffff';for(let i=0;i<46;i++){const yy=hash(i)*H,len=120+hash(i+5)*260,x=((hash(i+3)*W*2-t*90*dir)%(W*1.8)+W*1.8)%(W*1.8)-250;ctx.globalAlpha=.15+hash(i*9)*.4;ctx.lineWidth=1+hash(i*4)*2;line(x,yy,x+len*dir,yy-24*dir)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  /* 먹 붓터치 */
  ctx.fillStyle='rgba(0,0,0,.55)';for(let i=0;i<5;i++){const bx=(boss?W-120:120)+(hash(i*7)*2-1)*260,by=cy0+(hash(i*11)*2-1)*120,bw=180+hash(i)*220;
    ctx.beginPath();ctx.moveTo(bx-bw/2,by);for(let k=0;k<=12;k++){const q=k/12;ctx.lineTo(bx-bw/2+bw*q,by-8-Math.sin(q*Math.PI)*16+hash(i*31+k)*8)}for(let k=12;k>=0;k--){const q=k/12;ctx.lineTo(bx-bw/2+bw*q,by+6+Math.sin(q*Math.PI)*10-hash(i*17+k)*8)}ctx.fill()}
  /* 거대한 한자 서예 */
  if(ci.hz){ctx.globalAlpha=.22;const hz=ci.hz.slice(0,4),fs=hz.length>2?150:200;txt(hz,boss?300:W-300,cy0+10,fs,'#ffffff','center',HANJA);ctx.globalAlpha=1}
  /* 입자 (꽃잎 · 불티) */
  ctx.globalCompositeOperation='lighter';for(let i=0;i<40;i++){const px=((hash(i*3)*W+t*(6+hash(i)*10)*-dir)%W+W)%W,py=(hash(i*5)*H+t*(1+hash(i*2)*3))%H,s=2+hash(i*7)*4;ctx.fillStyle=i%3?col:'#ffffff';ctx.globalAlpha=.4+hash(i)*.5;ctx.fillRect(px,py,s,s)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  /* 인물 일러스트: 잔상 + 림라이트 + 본체 */
  const look=ci.look||h.look,pose=boss?poseOf({look,state:'skill',t:Math.min(t,20),anim:t}):poseOf({look,state:'special',t:Math.min(t,14),h,anim:0});
  const mx=boss?W-250:250,my=H/2+260,sc=3.7*zoom;
  ctx.save();ctx.translate(mx,my);ctx.scale(zoom,zoom);ctx.translate(-mx,-my);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55;ctx.drawImage(glowSpr(col),mx-230,my-560,460,560);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  for(let k=3;k>=1;k--){ctx.globalAlpha=.16*k;renderModel(ctx,look,pose,mx-dir*k*26,my,3.7,dir,{tint:hexA(col,.8)})}
  ctx.globalAlpha=1;renderModel(ctx,look,pose,mx+dir*3,my-3,3.7,dir,{tint:'rgba(255,255,255,.85)'});
  renderModel(ctx,look,pose,mx,my,3.7,dir,{});
  ctx.restore();
  ctx.restore();
  /* 무대 테두리 */
  ctx.strokeStyle='#ffffff';ctx.lineWidth=5;ctx.beginPath();if(!boss){ctx.moveTo(-60,y0+40);ctx.lineTo(W+60,y0-10)}else{ctx.moveTo(-60,y0-10);ctx.lineTo(W+60,y0+40)}ctx.stroke();
  ctx.beginPath();if(!boss){ctx.moveTo(-60,y1+10);ctx.lineTo(W+60,y1-40)}else{ctx.moveTo(-60,y1-40);ctx.lineTo(W+60,y1+10)}ctx.stroke();
  ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();if(!boss){ctx.moveTo(-60,y0+50);ctx.lineTo(W+60,y0)}else{ctx.moveTo(-60,y0);ctx.lineTo(W+60,y0+50)}ctx.stroke();
  /* 기술명 */
  const nm=ci.name||h.spName,tx=(boss?330:630)+dir*Math.max(0,10-t)*-50,ty=H/2-30;
  ctx.save();ctx.translate(tx,ty);ctx.transform(1,0,-.18*dir,1,0,0);
  const fsz=nm.length>5?60:74;
  txt(nm,6,6,fsz,'rgba(0,0,0,.6)','center',FONT);
  txt(nm,0,0,fsz,'#ffffff','center',FONT,[shade(col,-150),12]);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.25*Math.sin(t*.5);txt(nm,0,0,fsz,col,'center',FONT);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(ci.hz)txt(ci.hz,0,fsz*.72,24,col,'center',HANJA,['#000',5]);
  txt(ci.sub||`${h.name}`,0,fsz*.72+30,17,'#ffffff','center',FONT,['#000',4]);
  ctx.restore();
  ctx.restore();
  /* 발동 섬광 */
  if(outK>0){ctx.fillStyle=`rgba(255,255,255,${(1-outK)*.55})`;ctx.fillRect(0,0,W,H)}
  if(t<3){ctx.fillStyle=`rgba(255,255,255,${.6-t*.2})`;ctx.fillRect(0,0,W,H)}
}
/* 필살기 진행 중 시네마 연출 (레터박스 · 색 비네트) */
function drawCine(c){
  const k=Math.min(1,c.t/8,Math.max(0,(c.dur-c.t)/12)),bh=Math.round(34*k);
  const g=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,hexA(c.col,.35*k));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh);
  ctx.fillStyle=hexA(c.col,.8*k);ctx.fillRect(0,bh,W,2);ctx.fillRect(0,H-bh-2,W,2);
}

/* 슈퍼 플래시 (KOF 스타일 기술 발동 정지 연출) */
function drawSuperFlash(sf,cx){
  const k=sf.t/sf.dur,sx=sf.x-cx,sy=sf.y-(sf.z||0)-60;
  ctx.fillStyle=`rgba(0,0,0,${.55*Math.min(1,sf.t/3)*(k>.8?(1-k)/.2:1)})`;ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=.9;ctx.drawImage(glowSpr(sf.col),sx-90,sy-90,180,180);
  ctx.strokeStyle=sf.col;ctx.lineWidth=2;
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2+sf.t*.05,r0=60+hash(i)*40,r1=r0+120+hash(i*3)*260;ctx.globalAlpha=.25+hash(i*7)*.4;line(sx+Math.cos(a)*r0,sy+Math.sin(a)*r0*.7,sx+Math.cos(a)*r1,sy+Math.sin(a)*r1*.7)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const bx=W/2-260+(1-Math.min(1,sf.t/5))*-300;
  ctx.save();ctx.beginPath();ctx.moveTo(bx,70);ctx.lineTo(bx+540,58);ctx.lineTo(bx+520,118);ctx.lineTo(bx-20,130);ctx.closePath();
  ctx.fillStyle='rgba(0,0,0,.8)';ctx.fill();ctx.strokeStyle=sf.col;ctx.lineWidth=3;ctx.stroke();ctx.restore();
  txt(sf.name,bx+260,94,40,'#ffffff','center',FONT,[shade(sf.col,-130),8]);
}
