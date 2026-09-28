'use strict';
/* ===== 게임 진행: 전투 · 적 AI · 보스 국면 · 전장 이벤트 · 스킬 · 전리품 · 장면 흐름 ===== */
let G = null;          // 캠페인(저장 대상)
let B = null;          // 현재 전장
let SCENE = 'boot';
const TIPN = '안내';
const HAN_EL = { phys: null, fire: '#ff7a2a', ice: '#9ae8ff', bolt: '#c8a8ff' };
const heroOf = () => HEROES[G.pl.hero];
const heroIds = () => G ? [HEROES[G.pl.hero].id] : [];
function altSpeaker(n, alt) { return heroIds().some(id => HEROES.find(h => h.id === id).name === n) ? alt : n; }
function pickLine(v) { if (typeof v === 'string') return v; const hy = G && G.flags && G.flags.hy; if (hy && v['$' + hy]) return v['$' + hy]; for (const id of heroIds()) if (v[id]) return v[id]; return v.def || ''; }
function speakerName(n) { return n === '@' ? heroOf().name : n; }
function lookOf(name) {
  if (name === '@') return heroOf().look; if (NPC_LOOK[name]) return NPC_LOOK[name];
  const h = HEROES.find(h => h.name === name); if (h) return h.look;
  const s = STAGES.find(s => s.boss && s.boss.name === name); if (s) return s.boss.look;
  if (MIDBOSS.name === name) return MIDBOSS.look; return NPC_LOOK['병사'];
}
const newCampaign = (hi, diffIdx) => ({ diffIdx, cycle: 0, prog: 0, done: false, treasures: {}, clears: {}, flags: {}, lampSaved: null, pl: newPlayer(hi) });
const stageLvOf = si => Math.min(100, STAGE_LV[si] + G.cycle * 33);
const DIFF = () => DIFFS[G.diffIdx];

/* ---------------- 입력 ---------------- */
const keys = new Set(), hitK = {}, PRESS = {}, touchAx = { x: 0, z: 0 };
const KEYMAP = { KeyZ: 'atk', KeyJ: 'atk', KeyF: 'atk', KeyX: 'jump', KeyK: 'jump', KeyG: 'jump', Space: 'jump', KeyC: 'sp', KeyL: 'sp', KeyH: 'sp',
  KeyV: 'use', KeyU: 'use', KeyR: 'use', KeyE: 'swap', KeyQ: 'swap', KeyI: 'swap', ShiftLeft: 'dodge', KeyO: 'dodge', Digit1: 's1', Digit2: 's2', Digit3: 's3', Digit4: 's4', Digit5: 'msp',
  Enter: 'start', NumpadEnter: 'start', Tab: 'menu', KeyT: 'menu', KeyP: 'pause', Escape: 'esc', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyN: 'bgm', KeyB: 'mute' };
const DIRS = ['up', 'down', 'left', 'right'];
const dirHist = [];
addEventListener('keydown', e => {
  const a = KEYMAP[e.code];
  if (a || e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  initAudio(); keys.add(e.code);
  if (a) { hitK[a] = W.t; PRESS[a] = true; if (DIRS.includes(a)) { dirHist.push({ d: a, t: W.t, f: B && B.p ? B.p.facing : 1 }); if (dirHist.length > 12) dirHist.shift(); } }
  if (e.ctrlKey && e.altKey && e.shiftKey && G) cheat(e.code);
  UI.onKey(a, e);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const held = a => { for (const k of keys) if (KEYMAP[k] === a) return true; return (a === 'atk' && touchHold.atk); };
const hit = a => !!PRESS[a];
function pressVirtual(a) { hitK[a] = W.t; PRESS[a] = true; }
const touchHold = {};
function axis() {
  let x = 0, z = 0; if (held('left')) x -= 1; if (held('right')) x += 1; if (held('up')) z -= 1; if (held('down')) z += 1;
  x += touchAx.x; z += touchAx.z; x = clamp(x, -1, 1); z = clamp(z, -1, 1); const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; } return { x, z };
}
/* 커맨드 판정: ↓→ / ↓↑ (최근 0.3초) */
function cmdInput(facing) {
  const now = W.t, rec = dirHist.filter(h => now - h.t < .32); if (rec.length < 2) return null;
  const fw = facing > 0 ? 'right' : 'left', bw = facing > 0 ? 'left' : 'right';
  for (let i = rec.length - 1; i > 0; i--) { const a = rec[i - 1].d, b = rec[i].d;
    if (a === 'down' && (b === 'right' || b === 'left')) return { k: 'cmd', dir: b === 'right' ? 1 : -1 };
    if (a === 'down' && b === 'up') return { k: 'launch' }; }
  if (held('down') && (hit('right') || hit('left'))) return { k: 'cmd', dir: hit('right') ? 1 : -1 };
  return null;
}
function cheat(code) {
  const R = G.pl.rpg;
  if (code === 'KeyI') R.gold += 10000; if (code === 'KeyU') R.gold += 100000; if (code === 'KeyO') R.mats.stone += 10; if (code === 'KeyP') R.mats.frag += 10;
  if (code === 'KeyK' && G.pl.lvl < MAXLV) { G.pl.lvl++; R.statPts += 5; R.skillPts++; }
  if (code === 'KeyL') { for (const it of R.bag) it.rq = G.pl.lvl; for (const k in R.eq) R.eq[k].rq = G.pl.lvl; }
  UI.msg('비밀 코드 적용'); sfx('pick');
}

/* ---------------- 엔티티 ---------------- */
function mkFighter(look, o = {}) {
  const b = buildFighter(look, { elem: o.elem });
  const f = Object.assign({ ...b, look, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, facing: 1, rotY: Math.PI / 2, state: 'idle', st: 0, walkP: Math.random() * 6,
    hp: 1, maxhp: 1, pow: 1, invuln: 0, flashT: 0, dead: false, remove: false, hitIds: new Set(), combo: 0, cool: rand(.6, 1.6), scale: look.scale || 1,
    phase: Math.random() * 6, downLand: false, deathT: 0, status: {}, team: 'e', lv: 1 }, o);
  b.root.scale.setScalar(f.scale); world.add(b.root);
  if (o.mounted) mountHorse(f, o.horseCol || '#6a4a2a');
  return f;
}
function mountHorse(f, c) { if (f.horse) return; f.horse = buildHorse(c); f.root.add(f.horse.grp); f.mounted = true; }
function dismount(f) { if (!f.horse) return; f.root.remove(f.horse.grp); f.horse = null; f.mounted = false; dust(f.x, f.z, 20, 1.5); }
function setState(f, s) { f.state = s; f.st = 0; f.didSwing = false; }
function flashF(f) { if (f.flashT <= 0) for (const m of f.meshes) m.material = FLASH_MAT; f.flashT = .07; }
function halfW() { return B.camDist * Math.tan(camera.fov * Math.PI / 360) * camera.aspect - .9; }

/* ---------------- 전장 시작 ---------------- */
function startStage(si) {
  const S = STAGES[si], L = stageLvOf(si);
  disposeWorld(); UI.clearWorldUI();
  buildEnv(si, S.len * PX);
  const P = G.pl, h = heroOf();
  B = { si, S, lv: L, len: S.len * PX, t: 0, camX: 0, camDist: 16.5, lock: null, wave: 0, spawnQ: [], enemies: [], allies: [], proj: [], hz: [], loot: [], props: [], teles: [],
    talkQ: [], evDone: {}, bossSpawned: false, boss: null, clear: 0, clearT: 0, lives: DIFF().lives, combo: 0, comboT: 0, maxCombo: 0, escort: null, gate: null, chase: null,
    fireOn: false, arrowOn: false, failT: 0, jarCount: 0, jarsBroken: 0, wellHits: 0, midT: null, bossT: 0, cheatUsed: false, go: 0, score0: P.score, hySel: false };
  const p = mkFighter(heroLook(P), { team: 'p', elem: h.fx });
  Object.assign(p, { P, h, x: -2, z: .5, S: null, mp: 0, ki: 0, buffs: [], cds: {}, dodgeCd: 0, invuln: 1.5, itemT: 0, lastAtkT: -1, mash: 0, fear: 0, auraT: 0, runDir: 0 });
  B.p = p; refreshStats(p); p.hp = p.S.maxhp; p.mp = p.S.maxmp; p.ki = G.treasures.book ? p.S.maxki : Math.min(p.S.maxki, 30);
  (S.jars || []).forEach((jx, i) => makeJar(jx * PX, rand(-3.4, 3.4), S.countJars ? '秘' : null));
  if (S.countJars) B.jarCount = S.jars.length;
  if (S.well) makeWell(S.well * PX);
  stageEvInit(si);
  SCENE = 'battle'; bgmMode = 'field';
  UI.enterBattle();
  UI.banner(S.title.replace(/\s+/g, ' '), S.sub, `적 레벨 ${L} · ${DIFF().name}`, 3);
  updateCamera(1, true);
}
function heroLook(P) {
  const h = HEROES[P.hero], L = { ...h.look }, eq = P.rpg.eq;
  if (h.id === 'huang') L.backBow = true;
  const w = eq.weapon && eq.weapon.rq <= P.lvl ? eq.weapon : null;
  if (w && w.wt && w.wt !== HERO_WT[h.id]) { L.weapon = WT_MODEL[w.wt]; L.dual = false; }
  L.gear = gearLook(P, h.look);
  return L;
}
/* 강화 단계 전투 이펙트: 무기 +5 발광 · +7 광채 · +10 불꽃 · +13 뇌광 · +15 무지개 / 방어구 평균 +7 발밑 고리 · +10 상승 기류 · +13 오라 · +15 빛의 날개 */
const _tipV = new T.Vector3();
function gearFx(p, dt) {
  const g = p.look && p.look.gear; if (!g) return;
  const w = g.weapon;
  if (w && w.enh >= 5 && p.rig.wgrip) { p.wfxT = (p.wfxT || 0) - dt; if (p.wfxT <= 0) { p.wfxT = w.enh >= 10 ? .03 : .08;
      p.rig.wgrip.localToWorld(_tipV.set(0, 0, rand(.6, 1.9)));
      const c = w.enh >= 15 ? tmpC.setHSL((W.t * .5) % 1, .9, .6) : w.enh >= 13 ? tmpC.set('#c8a8ff') : w.enh >= 10 ? tmpC.set(pick(['#ff7a2a', '#ffb040'])) : w.enh >= 7 ? tmpC.set('#ffe890') : tmpC.set(w.glow || '#fff0c0');
      PA.emit(_tipV.x, _tipV.y, _tipV.z, rand(-.3, .3), w.enh >= 10 ? rand(.5, 1.5) : .3, rand(-.2, .2), w.enh >= 13 ? .25 : .5, w.enh >= 10 ? rand(.12, .25) : .1, c, 0, 1, 2.4);
      if (w.enh >= 13 && Math.random() < .15) PA.emit(_tipV.x, _tipV.y, _tipV.z, rand(-4, 4), rand(-4, 4), rand(-2, 2), .12, .15, tmpC.set('#ffffff'), 0, 0, 3); } }
  const a = g.aura || 0;
  if (a >= 7) { p.afxT = (p.afxT || 0) - dt; if (p.afxT <= 0) { p.afxT = a >= 13 ? .04 : .09; const ang = rand(0, 6.28), c = a >= 15 ? tmpC.setHSL((W.t * .3) % 1, .8, .7) : tmpC.set(a >= 13 ? '#ffd870' : '#fff0c0');
      PA.emit(p.x + Math.cos(ang) * .6, (p.y || 0) + .05, p.z + Math.sin(ang) * .35, 0, a >= 10 ? rand(1, 2.5) : .2, 0, a >= 10 ? .9 : .5, a >= 13 ? .2 : .12, c, 0, .5, 2);
      if (a >= 15) for (const s of [-1, 1]) { const k = rand(0, 1); PA.emit(p.x - p.facing * (.2 + k * .5), (p.y || 0) + 1.6 + Math.sin(k * 3) * .5, p.z + s * (.3 + k * .9), 0, .2, 0, .4, .18, tmpC.set('#fff6d0'), 0, 0, 2.4); } } }
}
function rebuildPlayerModel() {
  if (!B || !B.p) return; const p = B.p, L = heroLook(p.P), key = JSON.stringify(L.gear) + L.weapon; if (p._lookKey === key) return;
  world.remove(p.root); const b = buildFighter(L, { elem: p.h.fx }); Object.assign(p, { root: b.root, rig: b.rig, meshes: b.meshes, flags: b.flags, look: L, _lookKey: key }); b.root.scale.setScalar(p.scale); world.add(b.root);
}
function refreshStats(p) {
  const old = p.S; p.S = calcStats(p.P, p);
  if (old) { p.hp = Math.min(p.hp, p.S.maxhp); p.mp = Math.min(p.mp, p.S.maxmp); p.ki = Math.min(p.ki, p.S.maxki); }
}
function makeJar(x, z, mark) {
  const g = new T.Group(); g.position.set(x, 0, z);
  const pts = [[0, 0], [.26, .02], [.36, .28], [.33, .56], [.17, .76], [.2, .86], [.001, .86]].map(p => new T.Vector2(p[0], p[1]));
  if (STYLE.mc) { const tc = mark ? '#8a3a2a' : '#a8623a', t = pxTex('pot|' + tc, 8, 8, x => { fillN(x, 0, 0, 8, 8, tc, 'pot' + tc, .08); for (let i = 0; i < 8; i++) { P(x, i, 1, shade(tc, -.2)); P(x, i, 6, shade(tc, -.2)); } P(x, 3, 3, '#2a1a10'); P(x, 4, 4, '#2a1a10'); });
    const m = new T.Mesh(geo('mcpot', () => new T.BoxGeometry(.7, .8, .7)), mcMat(t)); m.position.y = .4; m.castShadow = true; g.add(m); }
  else { const lg = geo('jar', () => new T.LatheGeometry(pts, 16)), m = new T.Mesh(lg, toon(mark ? '#8a3a2a' : '#a8623a')); m.castShadow = true; g.add(m);
  const ol = new T.Mesh(lg, OUTLINE); ol.scale.setScalar(1.05); ol.position.y = -.02; g.add(ol); }
  if (mark) { const s = new T.Mesh(geo('jarmark', () => new T.PlaneGeometry(.34, .34)), new T.MeshBasicMaterial({ map: charTex(mark, '#f0e0b0', '#8a1a10', 128, 128), transparent: true })); s.position.set(0, .45, .35); g.add(s); }
  world.add(g); B.props.push({ kind: 'jar', g, x, z, hp: 1, mark });
}
function makeWell(x) {
  const g = new T.Group(); g.position.set(x, 0, -3.2);
  const m = new T.Mesh(geo('well', () => new T.CylinderGeometry(.9, 1, .9, 16, 1, true)), toon('#8a8078', { side: T.DoubleSide })); m.position.y = .45; m.castShadow = true; g.add(m);
  const w = new T.Mesh(geo('wellw', () => new T.CircleGeometry(.85, 20)), glowMat('#ffd8a0', 1.6)); w.rotation.x = -Math.PI / 2; w.position.y = .6; g.add(w);
  world.add(g); B.props.push({ kind: 'well', g, x, z: -3.2, hp: 14, glow: w });
}
function makeGate(x) {
  const g = new T.Group(); g.position.set(x, 0, 0);
  const door = new T.Mesh(new T.BoxGeometry(1.4, 7, 10), toon('#6a4020')); door.position.y = 3.5; door.castShadow = true; g.add(door);
  for (let k = -4; k <= 4; k += 2) { const band = new T.Mesh(geo('gband', () => new T.BoxGeometry(1.5, .3, 10.2)), toon('#2a2a2e')); band.position.y = 1 + (k + 4) * .7; g.add(band); }
  const top = new T.Mesh(new T.BoxGeometry(2, 1, 11), toon('#5a4a3a')); top.position.y = 7.4; g.add(top);
  world.add(g); const pr = { kind: 'gate', g, x, z: 0, hp: 30, maxhp: 30, door }; B.props.push(pr); return pr;
}
/* ---------------- 전장 목표 · 이벤트 ---------------- */
function stageEvInit(si) {
  if (si === 1) { const gx = 2150 * PX; B.gate = makeGate(gx); }
  if (si === 2) B.escort = mkNpc('미부인', B.p.x - 2.5, B.p.z, Math.round(380 * (1 + .06 * B.lv)));
  if (si === 4) B.chase = { t: 150 };
  if (si === 5) { B.escort = mkLamp(3.9, 0, Math.round(420 * (1 + .05 * B.lv))); }
}
function mkNpc(name, x, z, hp) { const f = mkFighter(lookOf(name), { team: 'n', npcName: name, hp, maxhp: hp, x, z, spd: 4.5 }); return f; }
function mkLamp(x, z, hp) {
  const g = new T.Group(); g.position.set(x, 0, z); const lamps = [];
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, st = new T.Mesh(geo('lampst', () => new T.CylinderGeometry(.05, .06, .5, 6)), toon('#6a4a20')); st.position.set(Math.cos(a) * .95, .25, Math.sin(a) * .3); g.add(st);
    const fl = new T.Mesh(geo('lampfl', () => new T.SphereGeometry(.1, 10, 8)), glowMat('#ffd070', 3)); fl.position.set(Math.cos(a) * .95, .58, Math.sin(a) * .3); fl.scale.y = 1.5; g.add(fl); lamps.push(fl); }
  world.add(g); return { lamp: true, g, lamps, x, z, y: 0, hp, maxhp: hp, dead: false, scale: 1, team: 'n', npcName: '칠성등', status: {}, invuln: 0, flashT: 0, meshes: [], state: 'idle' };
}
function stageEvTick(dt) {
  const S = STAGE_EV[B.si] || [], p = B.p, b = B.boss && !B.boss.dead ? B.boss : null;
  S.forEach((ev, k) => { if (B.evDone[k]) return; let go = false;
    if (ev.t != null && B.t * 60 >= ev.t) go = true; if (ev.wave != null && B.wave >= ev.wave) go = true; if (ev.boss && B.bossSpawned && b) go = true;
    if (ev.bossHp != null && b && b.hp <= b.maxhp * ev.bossHp) go = true;
    if (ev.gate === 'near' && B.gate && p.x > B.gate.x - 430 * PX) go = true; if (ev.gate === 'broken' && B.gate && B.gate.broken) go = true;
    if (ev.clear && B.clear === 3) go = true;
    if (!go) return; if ((ev.esc || ev.lamp) && !(B.escort && !B.escort.dead)) return;
    B.evDone[k] = true; queueTalk(ev);
    if (ev.fire) B.fireOn = true; if (ev.arrows) B.arrowOn = true; if (ev.flood) floodWave(); if (ev.ally) spawnStoryAlly(ev.ally);
  });
  /* 성문 */
  const gp = B.gate && !B.gate.broken ? B.gate : null;
  if (gp) { if (p.x > gp.x - 430 * PX && B.lock === null) { B.lock = gp.x - halfW() + 1.5; B.gateLock = true; }
    if (B.gateLock) { p.x = Math.min(p.x, gp.x - 1.2); B.gateSpawn = (B.gateSpawn || 0) - dt;
      if (B.gateSpawn <= 0 && B.enemies.filter(e => !e.dead).length < 4) { B.gateSpawn = 4; const e = spawnEnemy(Math.random() < .35 ? 'a' : Math.random() < .5 ? 'sh' : 's', 1); e.x = gp.x + 1; e.z = rand(-3.5, 3.5); dust(e.x, e.z, 12, 1.4, 0x9a9090); } } }
  if (B.escort) updEscort(B.escort, dt);
  /* 화공 불똥: 적도 탄다 */
  if (B.fireOn && !B.clear) { B.fireT = (B.fireT || 0) - dt; if (B.fireT <= 0) { B.fireT = 170 / 60;
    for (let k = 0; k < 3; k++) { const x = clamp(p.x + rand(-6, 6), B.camX - halfW() + 1, B.camX + halfW() - 1), z = rand(-3.8, 3.8), dmg = Math.round(8 + B.lv * 1.6);
      addHazard({ x, z, r: 70 * PX, delay: 62 / 60, owner: 'both', kind: 'fire', dmg, edmg: dmg * 3, dur: .5, c: '#ff7a2a' }); } } }
  if (B.arrowOn && !B.clear) { B.arrowT = (B.arrowT || 0) - dt; if (B.arrowT <= 0) { B.arrowT = 150 / 60;
    for (let k = 0; k < 2; k++) addHazard({ x: clamp(p.x + rand(-3.3, 3.3), B.camX - halfW() + 1, B.camX + halfW() - 1), z: clamp(p.z + rand(-.8, .8), -4, 4), r: 52 * PX, delay: 50 / 60, owner: 'e', kind: 'arrow', dmg: Math.round(6 + B.lv * 1.3), c: '#ff5a4a' }); } }
  if (B.chase && !B.bossSpawned && B.chase.t > 0) B.chase.t -= dt;
  if (B.failT) { B.failT += dt; if (B.failT > 3.3) { B.failT = 0; toCamp(B.failMsg || '퇴각했다.', true); } }
}
function queueTalk(ev) {
  const lines = ev.talk.map(([sp, l]) => { const n = typeof sp === 'function' ? sp() : sp; return { who: n, txt: pickLine(l) }; }).filter(l => l.txt);
  if (lines.length) B.talkQ.push({ lines, pause: !!ev.pause, i: 0, t: 0 });
}
function talkActive() { return B && B.talkQ.length ? B.talkQ[0] : null; }
function updTalk(dt) {
  const Q = talkActive(); if (!Q) return; const L = Q.lines[Q.i], dur = Math.max(2, L.txt.length * .1) + (Q.pause ? .7 : 0);
  if (Q.spoke !== Q.i) { Q.spoke = Q.i; Q.t = 0; if (L.who !== TIPN) speak(L.who === '@' ? heroOf().name : L.who, L.txt); else speak('안내', L.txt, { vol: .7 }); }
  Q.t += dt;
  const autoDone = Q.t >= dur && (!voiceBusy() || Q.t > dur + 9);
  if ((Q.t > .2 && (hit('start') || (Q.pause && hit('atk')))) || (!Q.pause && autoDone)) { Q.i++; Q.t = 0; if (Q.i >= Q.lines.length) { B.talkQ.shift(); if (hit('start')) voiceStop(); } }
}
function updEscort(n, dt) {
  if (n.lamp) { n.lamps.forEach((l, i) => { l.visible = !n.dead; l.scale.setScalar(.9 + Math.sin(W.t * 8 + i) * .15); });
    if (!n.dead && Math.random() < .3) PA.emit(n.x + rand(-1, 1), .6, n.z + rand(-.3, .3), 0, 1.2, 0, 1, .15, tmpC.set('#ffd070'), 0, 0, 2);
    if (B.lock !== null) { n.x = B.camX - halfW() + 3; } else n.x = Math.max(n.x, B.camX - halfW() + 3); n.g.position.x = n.x; if (n.flashT > 0) n.flashT -= dt; return; }
  n.st += dt; if (n.invuln > 0) n.invuln -= dt;
  if (n.dead) { physics(n, dt); pose(n, dt); return; }
  if (n.state === 'down') { physics(n, dt); if (n.downLand && n.st > .8) { setState(n, 'idle'); n.invuln = .7; } pose(n, dt); return; }
  if (n.state === 'hurt') { if (n.st > .3) setState(n, 'idle'); pose(n, dt); return; }
  const p = B.p, danger = B.enemies.some(e => !e.dead && Math.abs(e.x - n.x) < 2 && Math.abs(e.z - n.z) < .9);
  if (!danger && n.hp < n.maxhp) { n.regT = (n.regT || 0) + dt; if (n.regT > .5) { n.regT = 0; n.hp = Math.min(n.maxhp, n.hp + Math.ceil(n.maxhp * .004)); } }
  const tx = n.hide ? B.camX - halfW() + 1.5 : p.x - 2.8, tz = n.hide ? -3.8 : p.z;
  if (danger && !n.hide) { n.state = 'idle'; n.vx = n.vz = 0; }
  else { const dx = tx - n.x, dz = tz - n.z; if (Math.abs(dx) > .3 || Math.abs(dz) > .2) { n.state = 'walk'; n.vx = Math.sign(dx) * (Math.abs(dx) > .3 ? n.spd : 0); n.vz = Math.sign(dz) * (Math.abs(dz) > .2 ? n.spd * .7 : 0); if (dx) n.facing = Math.sign(dx); n.walkP += dt * 9; } else { n.state = 'idle'; n.vx = n.vz = 0; n.facing = 1; } }
  n.x += n.vx * dt; n.z = clamp(n.z + n.vz * dt, -4.3, 4.3); n.x = clamp(n.x, B.camX - halfW() + .5, B.camX + halfW() - .5);
  pose(n, dt);
}
function escortDown(n) {
  if (n.lamp) { UI.msg('칠성등이 꺼졌다… 사마의의 기세가 드높아진다!'); const b = B.enemies.find(e => e.boss && !e.dead); if (b) b.pow = Math.round(b.pow * 1.25); return; }
  UI.msg('미부인이 쓰러졌다… 퇴각하라!'); B.failT = .01; B.failMsg = '장판파 패전 — 미부인을 지키지 못했다. (다시 도전할 수 있다)';
}
function spawnStoryAlly(name) {
  const p = B.p, a = mkFighter(lookOf(name), { team: 'a', npcName: name, x: B.camX - halfW() + 1, z: p.z, hp: 9999, maxhp: 9999, pow: p.S.pow * 1.3, reach: 96 * PX, spd: 5, life: 30, facing: 1 });
  a.def = { reach: 96, spd: 3, range: 96 * PX }; B.allies.push(a);
}
function floodWave() {
  const p = B.p; W.shake = .6; W.flash = .4; sfx('boom');
  const m = new T.MeshBasicMaterial({ color: col('#8ac8ff').multiplyScalar(1.3), transparent: true, opacity: .7, depthWrite: false });
  const wall = new T.Mesh(new T.BoxGeometry(2.5, 2.2, 10), m); wall.position.set(B.camX + halfW() + 4, 1.1, 0); scene.add(wall);
  B.proj.push({ kind: 'flood', mesh: wall, mat: m, x: wall.position.x, y: 1, z: 0, vx: -18, vy: 0, vz: 0, team: 'p', from: p, dmg: pOf(p, 'skill') * 4, life: 4, r: 1.6, rz: 6, pierce: true, knock: true, hit: new Set() });
}
function addHazard(h) {
  const m = new T.ShaderMaterial({ uniforms: { uP: { value: 0 }, uC: { value: col(h.c || '#ff4a3a') } }, vertexShader: VS_UV, fragmentShader: TELE_FS, transparent: true, depthWrite: false });
  const mesh = new T.Mesh(geo('teleplane', () => { const g = new T.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2); return g; }), m); mesh.position.set(h.x, .05, h.z); mesh.scale.set(h.r, 1, h.r * .7); scene.add(mesh);
  Object.assign(h, { t: 0, mesh, m, fired: false, hit: new Set() }); B.hz.push(h); return h;
}
function updHazards(dt) {
  for (let i = B.hz.length - 1; i >= 0; i--) { const h = B.hz[i]; h.t += dt; if (!h.fired) h.m.uniforms.uP.value = h.t / h.delay;
    if (!h.fired && h.t >= h.delay) { h.fired = true; hazardFire(h); }
    if (h.fired && h.t >= h.delay + (h.dur || 0)) { scene.remove(h.mesh); h.m.dispose(); B.hz.splice(i, 1); } }
}
function hazardFire(h) {
  const k = h.kind;
  if (k === 'fire') { burst(h.x, .3, h.z, '#ff7a2a', 18, 4, .6, .4, 2.4); shockwave(h.x, h.z, h.r * 1.3, '#ff8a3a'); sfx('fire'); }
  else if (k === 'arrow') { for (let i = 0; i < 6; i++) PA.emit(h.x + rand(-.5, .5), 3, h.z + rand(-.3, .3), 0, -20, 0, .2, .12, tmpC.set('#e8d8c0'), 0, 0, 1.5); dust(h.x, h.z, 6); sfx('shoot'); }
  else if (k === 'bolt') lightning(h.x, h.z, h.c || '#c8a8ff');
  else if (k === 'slam') { shockwave(h.x, h.z, h.r * 1.3, h.c || '#ffb040'); dust(h.x, h.z, 20, 1.8); W.shake = .45; sfx('boom'); }
  else if (k === 'rock') { burst(h.x, .5, h.z, '#b8a890', 16, 5, .6, .3, 1.2); dust(h.x, h.z, 12, 1.4); sfx('heavy'); }
  const R = h.r * 1.05;
  if (h.owner === 'e' || h.owner === 'both') { for (const t of enemyTargetsAll()) if (!t.dead && Math.hypot(t.x - h.x, (t.z - h.z) * 1.3) < R + .3) hurtTarget(t, h.src || null, h.dmg, { knock: k !== 'arrow', dir: Math.sign(t.x - h.x) || 1, kb: 3, threat: true }); }
  if (h.owner === 'p' || h.owner === 'both') { for (const e of B.enemies) if (!e.dead && Math.hypot(e.x - h.x, (e.z - h.z) * 1.3) < R + .3) dealDamage(B.p, e, h.edmg || h.dmg, { knock: true, el: k === 'fire' ? 'fire' : k === 'bolt' ? 'bolt' : 'phys', noProc: true, dir: Math.sign(e.x - h.x) || 1 }); }
}
const enemyTargetsAll = () => { const L = [B.p]; if (B.escort && !B.escort.dead) L.push(B.escort); return L; };

/* ---------------- 적 생성 ---------------- */
function spawnEnemy(t, side, opt = {}) {
  if (t === 'H') return spawnMid(side);
  const S = B.S, fac = FAC[S.fac], E = ETYPES[t], ex = FAC_EX[S.fac] || {}, D = DIFF();
  const look = { ...fac, weapon: E.weapon, scale: E.scale || 1 };
  if (E.officer) { look.hat = 'helm2'; look.helmc = look.helmc || '#8a90a0'; look.cape = fac.sub; look.armor = 'plate'; look.weapon = 'bigdao'; look.face = 'fierce'; look.beard = 'short'; }
  if (E.shield) { look.shield = true; look.shieldc = ex.shieldc; }
  if (E.banner) { look.weapon = 'flag'; look.flagt = ex.flagt; look.flagc = ex.shieldc; }
  if (Math.random() < .3 && !E.officer) look.beard = 'short';
  let lv = B.lv; const hpm = hpMulL(lv) * D.ehp * (G.cycle >= 3 ? 1 + .3 * (G.cycle - 2) : 1), pwm = powMulL(lv) * D.edmg * (G.cycle >= 3 ? 1 + .3 * (G.cycle - 2) : 1);
  const e = mkFighter(look, { team: 'e', etype: t, lv, maxhp: Math.round(E.hp * hpm), pow: E.pow * pwm, spd: E.spd * 60 * PX * 1.1, reach: E.reach * PX * (E.scale || 1), exp: E.exp, score: E.score,
    officer: !!E.officer, shield: !!E.shield, cavalry: !!E.cavalry, banner: !!E.banner, ranged: !!E.ranged, mounted: !!E.cavalry, horseCol: ex.mount, elem: '#ff6a4a' });
  e.hp = e.maxhp; e.cool = rand(.8, 1.8) / D.aggr;
  const hw = halfW(); e.x = opt.x ?? (B.camX + side * (hw + rand(1.5, 3))); e.z = opt.z ?? rand(-3.8, 3.8); e.facing = -side;
  const eliteCh = Math.min(.25, .05 + .03 * G.cycle + .008 * Math.max(0, ORDER.indexOf(B.si)));
  if (!opt.noElite && !E.banner && Math.random() < eliteCh) makeElite(e);
  if (B.escort && !B.escort.dead && !e.ranged && Math.random() < (B.escort.lamp ? .4 : .3)) e.hunt = true;
  B.enemies.push(e); return e;
}
function makeElite(e) {
  const keys = Object.keys(ELITE), n = 1 + (Math.random() < .4 + .15 * G.cycle ? 1 : 0) + (G.cycle >= 2 && Math.random() < .4 ? 1 : 0), mods = [];
  while (mods.length < n) { const k = pick(keys); if (!mods.includes(k)) mods.push(k); }
  e.elite = mods; e.lv += 2; e.maxhp = Math.round(e.maxhp * (mods.includes('tough') ? 3.6 : 2.4)); e.hp = e.maxhp; e.pow *= mods.includes('mighty') ? 1.6 : 1.2;
  e.exp *= 3; e.score *= 3; e.scale *= 1.12; e.root.scale.setScalar(e.scale);
  if (mods.includes('swift')) { e.spd *= 1.5; e.cdMul = .6; }
  e.eliteName = mods.map(k => ELITE[k].n).join(' · ');
}
function spawnMid(side) {
  const M = MIDBOSS, D = DIFF(), lv = B.lv + 1;
  const e = mkFighter(M.look, { team: 'e', boss: true, mid: true, name: M.name, title: M.title, lv, maxhp: Math.round(M.hp * hpMulL(lv) * D.ehp), pow: M.pow * powMulL(lv) * D.edmg, spd: M.spd * 60 * PX, reach: M.reach * PX * 1.2,
    exp: 150, score: M.score, poiseMax: M.poise, seq: ['dash', 'counter', 'wave', 'counter'], seqI: 0, elem: '#a8e0ff' });
  e.hp = e.maxhp; e.x = B.camX + halfW() + 2; e.z = 0; e.facing = -1; e.cool = 1.5; B.enemies.push(e); B.midT = 0;
  UI.banner('중간 보스', M.name, M.title, 2, 'boss'); queueTalk({ talk: [[M.name, M.line.replace(/"/g, '')]] });
  return e;
}
function spawnBoss() {
  const S = B.S, bd = S.boss, D = DIFF(), lv = B.lv + 1;
  const e = mkFighter(bd.look, { team: 'e', boss: true, name: bd.name, title: bd.title, lv, maxhp: Math.round(bd.hp * hpMulL(lv) * D.ehp * (G.cycle >= 3 ? 1 + .3 * (G.cycle - 2) : 1)),
    pow: bd.pow * powMulL(lv) * D.edmg, spd: bd.spd * 60 * PX, reach: bd.reach * PX * (bd.look.scale || 1.1), exp: 400, score: bd.score, poiseMax: bd.poise || 80, elem: (BOSS_ULT[bd.name] || {}).col || '#ff5a4a' });
  e.hp = e.maxhp; e.x = B.camX + halfW() + 2.5; e.z = 0; e.facing = -1; e.cool = 2; e.phases = BOSS_PHASES[bd.name] || null; e.phaseI = 0; e.seqI = 0; e.seq = e.phases ? e.phases[0].seq : bd.skills;
  B.enemies.push(e); B.boss = e; B.bossSpawned = true; B.bossT = 0; bgmMode = 'boss';
  UI.banner('강적 출현', bd.name, bd.title, 2.4, 'boss'); W.slow = .8;
  if (bd.escort) bd.escort.split(' ').forEach((t, i) => B.spawnQ.push({ t: .6 + i * .4, kind: t, side: i % 2 ? -1 : 1 }));
  if (B.chase) { if (B.chase.t > 0) { e.hp = Math.round(e.maxhp * .8); UI.msg('기습 성공! 조조가 허둥댄다 (체력 -20%)'); } else { for (let i = 0; i < 2; i++) { const s = spawnEnemy('o', 1); makeElite(s); } UI.msg('추격이 늦었다… 조조가 전열을 가다듬었다!'); } }
  if (B.escort && !B.escort.dead && !B.escort.lamp) B.escort.hide = true;
}

/* ---------------- 피해 계산 ---------------- */
function pOf(p, kind) {
  const S = p.S; let v = S.pow * S.wAtk * (1 + S.atkPct / 100) * (p.buf && p.buf.atk > 0 ? 1.5 : 1) * (p.perfT > 0 ? 1.5 : 1);
  if (kind === 'basic') v *= (1 + (S.basicDmg || 0) / 100) * (HERO_BAL[p.h.id] || 1); if (kind === 'cmd') v *= 1 + (S.cmdDmg || 0) / 100;
  if (kind === 'sp') v *= (1 + (S.spDmg || 0) / 100) * (G.treasures.book ? 1.3 : 1); if (kind === 'dash') v *= 1 + (S.dashDmg || 0) / 100;
  return v;
}
function dealDamage(p, e, base, o = {}) {
  if (e.dead || (e.invuln > 0 && !o.force)) return false;
  if (e.team === 'n') return false;
  const S = p.S;
  /* 반격 태세 (하후은) */
  if (e.counterT > 0) { e.counterT = 0; bossCounter(e); return false; }
  /* 방패병 */
  if (e.shield && !e.shieldBroken && !o.knock && !o.skill && (p.y || 0) < .8 && Math.sign(p.x - e.x) === e.facing && e.state !== 'down') {
    e.hp -= Math.max(1, Math.round(base * .15)); p.ki = Math.min(S.maxki, p.ki + 1); sfx('block'); sparks(e.x + e.facing * .5, 1.2, e.z + .3, '#ffffff', 8); blockFx(e); UI.dmg(e.x, 2.4, e.z, '막기', 'block'); return false; }
  if (e.shield && !e.shieldBroken && (o.knock || (p.y || 0) >= .8)) { e.shieldBroken = 6; UI.dmg(e.x, 2.6, e.z, '방패 파괴!', 'crit'); sfx('heavy'); }
  let dmg = base * rand(.9, 1.1), el = o.el || 'phys';
  if (el !== 'phys') dmg *= 1 + (S[el] || 0) / 100;
  if (e.status.shock > 0) dmg *= 1.25;
  if (e.status.chill > 0 || e.state === 'stun') dmg *= 1 + (S.vsCtrl || 0) / 100;
  if (e.boss) dmg *= 1 + (S.bossDmg || 0) / 100 + (S.pw.bossDmg || 0) / 100;
  if (e.barrier) dmg *= .15; if (e.rally > 0) dmg *= .8; if (e.groggy > 0) dmg *= 1.3;
  let react = '';
  if (el === 'bolt' && e.status.burn > 0) { dmg *= 1.3; react = '폭뢰'; setTimeout(() => { if (B) aoeP(p, e.x, e.z, 100 * PX, pOf(p, 'skill') * .8, { el: 'fire', noProc: true }); burst(e.x, 1, e.z, '#ffb040', 24, 6, .5, .4); }, 0); }
  else if (el === 'fire' && e.status.chill > 0) { dmg *= 1.5; react = '융해'; e.status.chill = 0; }
  else if (o.knock && el !== 'fire' && e.status.chill > 0) { dmg *= 1.6; react = '빙쇄'; e.status.chill = 0; }
  else if (el === 'ice' && e.status.shock > 0) { dmg *= 1.25; react = '초전도'; e.stunT = 1; }
  let crit = Math.random() * 100 < S.crit; if (crit) dmg *= 1 + S.critDmg / 100;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.lastHitT = W.t;
  if (e.boss) { e.dmgTaken = (e.dmgTaken || 0) + dmg; if (e.praying && e.dmgTaken - e.prayStart > e.maxhp * .06) { e.praying = false; e.groggy = 110 / 60; setState(e, 'stun'); UI.msg('기도를 끊었다!'); } }
  UI.dmg(e.x + rand(-.3, .3), (e.y || 0) + 1.8 * e.scale, e.z, String(dmg), crit ? 'crit' : 'n', el);
  if (react) UI.dmg(e.x, (e.y || 0) + 2.6 * e.scale, e.z, react, 'react');
  flashF(e); sparks(e.x - Math.sign(e.x - p.x) * .25, (e.y || 0) + 1.2 * e.scale, e.z + .3, HAN_EL[el] || p.h.fx, crit ? 22 : 12); hitFx(e, p, crit, el, o, dmg);
  W.hitstop = Math.max(W.hitstop, o.stop ?? (crit ? .08 : .045)); W.shake = Math.max(W.shake, o.knock ? .2 : .08);
  sfx(o.knock || crit ? 'heavy' : 'hit');
  p.ki = Math.min(S.maxki, p.ki + 2 * (1 + (S.kiGain || 0) / 100)); B.combo++; B.comboT = 2; B.maxCombo = Math.max(B.maxCombo, B.combo);
  if (S.ls) p.hp = Math.min(S.maxhp, p.hp + Math.min(S.maxhp * .04, dmg * S.ls / 100));
  /* 상태 이상 */
  const pc = k => Math.random() * 100 < (S[k] || 0);
  if (el === 'fire' && Math.random() < .4 || pc('burnCh')) e.status.burn = 3, e.status.burnDps = pOf(p, 'skill') * .35 * (1 + (S.burnPct || 0) / 100);
  if (el === 'ice' || pc('chillCh')) e.status.chill = e.boss ? 1 : 2;
  if (el === 'bolt' && Math.random() < .35 || pc('shockCh')) e.status.shock = 3;
  if (!e.boss && (pc('stunCh') || o.stun)) e.stunT = o.stun || .83;
  if (!o.noProc) { runProcs(p, 'hit', e); if (crit) runProcs(p, 'crit', e); }
  const dir = o.dir || Math.sign(e.x - p.x) || p.facing;
  if (e.hp <= 0) { killEnemy(e, p, dir, o); return true; }
  if (e.boss) {
    e.poise = (e.poise || 0) + dmg * (o.knock ? 2 : 1);
    if (e.poise >= (e.poiseMax || 80) * (e.maxhp / 400) && e.groggy <= 0 && !e.barrier) { e.poise = 0; e.groggy = e.mid ? 1.5 : 2; setState(e, 'stun'); UI.dmg(e.x, 3.2, e.z, '경직 파괴!', 'react'); sfx('heavy'); }
    if (e.state !== 'skill' && e.state !== 'stun' && e.poise > 20 && !o.knock) { /* 슈퍼아머 */ }
  } else if (e.stunT > 0 && e.state !== 'down') { setState(e, 'stun'); e.vx = 0; }
  else if (o.knock || o.launch) knockdown(e, dir, o.kb || 5, o.launch);
  else if (!(e.elite && e.state === 'eatk') && e.state !== 'charge') { setState(e, 'hurt'); e.vx = dir * (o.kb || 1.6); }
  if (e.flee) e.flee = 0;
  return true;
}
function knockdown(t, dir, kb, launch) {
  if (t.mounted && !t.boss) { dismount(t); t.cavalry = false; }
  setState(t, 'down'); t.vy = launch ? 11 : (t.boss ? 5 : 7); t.y = Math.max(t.y || 0, .02); t.vx = dir * kb * (t.boss ? .5 : 1); t.vz = 0; t.facing = -dir; t.downLand = false;
}
function killEnemy(e, p, dir, o) {
  e.hp = 0; e.dead = true; knockdown(e, dir, (o.kb || 4) + 2);
  if (e.decoy) { e.remove = true; dust(e.x, e.z, 24, 1.6, 0xc8c8d0); UI.dmg(e.x, 2.5, e.z, '분신!', 'block'); return; }
  const D = DIFF(), S = p.S;
  p.P.score += Math.round((e.score || 100) * D.score);
  const df = p.P.lvl - e.lv; let ex = (e.exp || 10) * expScale(e.lv);
  if (df > 3) ex *= Math.max(.1, 1 - (df - 3) * .12); if (df < -3) ex *= Math.min(1.5, 1 + (-df - 3) * .05); if (e.fledHalf) ex *= .5;
  gainExp(p, Math.round(ex * (1 + (S.exp || 0) / 100)));
  runProcs(p, 'kill', e);
  if (e.elite && e.elite.includes('fiery')) { aoeHazardBoom(e.x, e.z, e.pow * 1.4); }
  for (const d of rollDrops(e, S)) dropLoot(d, e.x, e.z);
  if ((e.officer || e.banner) && !e.boss) moraleBreak(e);
  if (!e.boss && Math.random() < .12 * D.drop) dropLoot({ kind: 'food', k: Math.random() < .75 ? 'bun' : 'chicken' }, e.x, e.z);
  if (!e.boss && Math.random() < .05 * D.drop) dropLoot({ kind: 'inv', k: pick(['knife', 'bomb', 'wine', 'elixir', 'tactic', 'haste', 'shield', 'tcharm']) }, e.x, e.z);
  if (e.officer) dropLoot({ kind: 'inv', k: pick(['knife', 'bomb', 'wine', 'elixir', 'tactic', 'haste', 'shield', 'tcharm']) }, e.x, e.z);
  if (e.mid) { if (B.midT != null && B.midT <= 25) { giveTreasure('sword'); } }
  if (e.boss && !e.mid) onBossDeath(e);
}
function aoeHazardBoom(x, z, dmg) { burst(x, .8, z, '#ff8a20', 30, 6, .6, .45); shockwave(x, z, 3, '#ff8a20'); sfx('boom'); for (const t of enemyTargetsAll()) if (Math.hypot(t.x - x, t.z - z) < 2.2) hurtTarget(t, null, dmg, { knock: true, dir: Math.sign(t.x - x) || 1 }); }
function moraleBreak(src) {
  const ch = src.banner ? .6 : .4;
  for (const e of B.enemies) if (!e.dead && !e.boss && e !== src && Math.abs(e.x - src.x) < 330 * PX && Math.random() < ch) { e.flee = 6; e.state = 'flee'; UI.dmg(e.x, 2.3, e.z, '도주!', 'block'); }
  UI.msg(src.banner ? '기수가 쓰러졌다! 적의 사기가 무너진다!' : '장교가 쓰러졌다! 적병이 동요한다!');
}
function gainExp(p, n) {
  const P = p.P; if (P.lvl >= MAXLV) return; P.exp += n;
  while (P.lvl < MAXLV && P.exp >= expNeed(P.lvl)) { P.exp -= expNeed(P.lvl); P.lvl++; P.rpg.statPts += 5; P.rpg.skillPts += 1;
    refreshStats(p); p.hp = p.S.maxhp; p.mp = p.S.maxmp; sfx('lvl'); pillar(p.x, p.z, '#ffe08a', 8, 1.2, .9); burst(p.x, 1, p.z, '#ffe08a', 40, 4, 1, .3); UI.banner('LEVEL UP', `Lv.${P.lvl}`, '능력치 +5 · 스킬 포인트 +1 (Tab)', 1.8, 'lvl'); }
}
function giveTreasure(k) {
  if (G.treasures[k]) return; G.treasures[k] = 1; const I = ITEMS[k];
  UI.banner('보물 획득', I.name, I.msg, 3.2, 'treasure'); UI.msg(`<img class="mi" src="${consIcon(k)}" alt="">보물 「${I.name}」 획득`); sfx('win'); pillar(B.p.x, B.p.z, '#ffd24a', 10, 1.6, 1.2);
  if (k === 'book') B.p.ki = B.p.S.maxki; refreshStats(B.p);
}
/* 플레이어 피격 */
function hurtTarget(t, src, dmg, o = {}) {
  if (!t || t.dead) return false;
  if (t.lamp) { if (t.invuln > 0) return false; t.hp -= Math.round(dmg); t.invuln = .25; if (t.hp <= 0) { t.hp = 0; t.dead = true; escortDown(t); } return true; }
  if (t.team === 'n') { if (t.invuln > 0 || t.state === 'down') return false; t.hp -= Math.round(dmg); flashF(t); if (t.hp <= 0) { t.hp = 0; t.dead = true; knockdown(t, o.dir || 1, 4); escortDown(t); } else if (o.knock) knockdown(t, o.dir || 1, 3); else { setState(t, 'hurt'); } return true; }
  if (t.team !== 'p') return false;
  const p = t, S = p.S;
  if (p.invuln > 0 || p.state === 'dodge' && p.st < .3) { if (p.state === 'dodge' && p.st < .25 && o.threat !== false && !p.perfDone) perfectDodge(p); return false; }
  if (p.state === 'down' && p.downLand) return false;
  if (Math.random() * 100 < S.dodge) { p.invuln = .2; UI.dmg(p.x, 2.4, p.z, '회피', 'block'); return false; }
  let d = dmg; if (src && src.rally > 0) d *= 1.25; if (G.treasures.seal) d *= .8;
  d *= 1 - Math.min(.75, S.def / (S.def + 40 + 12 * B.lv)); d *= 1 - clamp(S.dr, -50, 80) / 100;
  let noKnock = false; if (p.buf && p.buf.shield > 0) { d *= .3; noKnock = true; }
  if (S.pw.manaShield) { const ab = Math.min(p.mp, d * S.pw.manaShield / 100); p.mp -= ab; d -= ab; }
  d = Math.max(1, Math.round(d)); p.hp -= d;
  UI.dmg(p.x, 2.2, p.z, String(d), 'hurt'); flashF(p); W.shake = Math.max(W.shake, .15); sfx('hit'); hurtFx(p, d, src);
  p.ki = Math.min(S.maxki, p.ki + 5 * (1 + (S.kiGain || 0) / 100)); B.combo = 0;
  if (S.thorns && src && !src.dead && src.team === 'e') { src.hp -= S.thorns; if (src.hp <= 0) killEnemy(src, p, -src.facing, {}); }
  if (src && src.elite && src.elite.includes('vamp')) src.hp = Math.min(src.maxhp, src.hp + d);
  if (src && src.elite && src.elite.includes('frost')) p.slowT = 2.5;
  runProcs(p, 'hurt', src); if (p.hp < S.maxhp * .3) runProcs(p, 'lowhp', src);
  if (p.hp <= 0) {
    if (S.pw.cheatDeath && !B.cheatUsed) { B.cheatUsed = true; p.hp = Math.round(S.maxhp * .5); p.invuln = 2; UI.msg('전국 인끈의 가호 — 되살아났다!'); pillar(p.x, p.z, '#ffd24a', 10, 1.2, 1); return true; }
    p.hp = 0; p.dead = true; p.deathT = 0; knockdown(p, o.dir || -p.facing, 4); return true; }
  if (p.state === 'grabbed') return true;
  if (o.knock && !noKnock) knockdown(p, o.dir || -p.facing, o.kb || 3);
  else if (!noKnock && !['special', 'spin', 'skill', 'cast', 'xcmd'].includes(p.state)) { setState(p, 'hurt'); p.vx = (o.dir || 0) * 1.5; p.invuln = 22 / 60; }
  return true;
}
function perfectDodge(p) {
  p.perfDone = true; p.ki = Math.min(p.S.maxki, p.ki + 25); p.perfT = 2; W.hitstop = .1; UI.dmg(p.x, 2.8, p.z, '완벽 회피!', 'react'); sfx('special');
  shockwave(p.x, p.z, 3, '#9ae8ff');
  for (const e of B.enemies) if (!e.dead && !e.boss && Math.abs(e.x - p.x) < 220 * PX && Math.abs(e.z - p.z) < 2) { e.stunT = 34 / 60; setState(e, 'stun'); }
}

/* ---------------- 공격 판정 ---------------- */
function meleeP(p, o) {
  const reach = o.reach, hits = [];
  for (const e of B.enemies) { if (e.dead || p.hitIds.has(e)) continue;
    const rx = (e.x - p.x) * p.facing, dz = Math.abs(e.z - p.z), dy = Math.abs((e.y || 0) - (p.y || 0));
    const ok = o.spin ? Math.abs(e.x - p.x) < reach : (rx > -(o.back || .5) && rx < reach);
    if (ok && dz < (o.dz || 1) * (e.scale > 1.2 ? 1.3 : 1) && dy < 2.2) { p.hitIds.add(e); if (dealDamage(p, e, o.dmg, o)) hits.push(e); } }
  for (const pr of B.props) { if (pr.dead || p.hitIds.has(pr)) continue; const rx = (pr.x - p.x) * p.facing;
    if ((o.spin ? Math.abs(pr.x - p.x) < reach : rx > -.5 && rx < reach + (pr.kind === 'gate' ? 1 : 0)) && (Math.abs(pr.z - p.z) < 1.3 || pr.kind === 'gate')) { p.hitIds.add(pr); hitProp(pr, p); } }
  return hits;
}
function aoeP(p, x, z, r, dmg, o = {}) {
  for (const e of B.enemies) if (!e.dead && Math.hypot(e.x - x, (e.z - z) * 1.25) < r * (e.boss ? 1.2 : 1)) dealDamage(p, e, dmg, { ...o, dir: Math.sign(e.x - x) || p.facing });
  for (const pr of B.props) if (!pr.dead && Math.hypot(pr.x - x, pr.z - z) < r + (pr.kind === 'gate' ? 1.5 : 0)) hitProp(pr, p);
}
function hitProp(pr, p) {
  if (pr.kind === 'jar') { pr.dead = true; world.remove(pr.g); for (let i = 0; i < 14; i++) PN.emit(pr.x, .5, pr.z, rand(-3, 3), rand(2, 6), rand(-2, 2), rand(.6, 1), rand(.2, .4), tmpC.set('#a8623a'), 14, 1, 1); sfx('hit'); dust(pr.x, pr.z, 6);
    if (pr.mark) { B.jarsBroken++; if (B.jarsBroken >= B.jarCount) { giveTreasure('book'); } else UI.msg(`비서 항아리 ${B.jarsBroken} / ${B.jarCount}`); }
    const r = Math.random(); dropLoot(r < .35 ? { kind: 'food', k: 'bun' } : r < .5 ? { kind: 'food', k: 'chicken' } : r < .7 ? { kind: 'food', k: Math.random() < .6 ? 'silver' : 'gold' } : r < .78 ? { kind: 'food', k: 'gem' } : { kind: 'inv', k: pick(INV_KEYS) }, pr.x, pr.z); }
  else if (pr.kind === 'well') { pr.hp--; sfx('block'); sparks(pr.x, 1, pr.z, '#ffd8a0', 8); pr.glow.material.color.copy(col('#ffd8a0').multiplyScalar(1.6 + (14 - pr.hp) * .15));
    if (pr.hp <= 0) { pr.dead = true; giveTreasure('seal'); pillar(pr.x, pr.z, '#ffe8a0', 12, 1.5, 1); } }
  else if (pr.kind === 'gate') { pr.hp--; sfx('heavy'); W.shake = Math.max(W.shake, .15); for (let i = 0; i < 4; i++) PN.emit(pr.x - .7, rand(.5, 5), rand(-3, 3), rand(-5, -1), rand(2, 6), 0, .8, .3, tmpC.set('#6a4020'), 14, 1, 1);
    if (pr.hp <= 0) { pr.dead = true; pr.broken = true; B.gate.broken = true; B.gateLock = false; B.lock = null; world.remove(pr.g); W.shake = .8; W.flash = .4; sfx('boom');
      for (let i = 0; i < 40; i++) PN.emit(pr.x, rand(.5, 6), rand(-4, 4), rand(-6, 6), rand(3, 9), rand(-2, 2), 1.2, rand(.3, .6), tmpC.set(i % 2 ? '#6a4020' : '#2a2a2e'), 16, 1, 1); UI.banner('성문 돌파!', '', '', 1.6); } }
  else if (pr.kind === 'totem') { pr.hp--; sfx('block'); sparks(pr.x, 1.5, pr.z, '#d070ff', 10); if (pr.hp <= 0) { pr.dead = true; world.remove(pr.g); burst(pr.x, 1.5, pr.z, '#d070ff', 30, 5, .6, .4); const b = pr.owner; if (b && B.props.filter(q => q.kind === 'totem' && !q.dead && q.owner === b).length === 0) { b.barrier = false; b.groggy = 130 / 60; setState(b, 'stun'); UI.msg('결계가 깨졌다!'); } } }
}

/* ---------------- 투사체 ---------------- */
function projMesh(kind, c, s = 1) {
  if (kind === 'arrow' || kind === 'farrow') { const g = new T.Group();
    g.add(new T.Mesh(geo('ashaft', () => { const q = new T.CylinderGeometry(.02, .02, 1, 5); q.rotateZ(Math.PI / 2); return q; }), toon('#8a6a44')));
    g.add(new T.Mesh(geo('atip', () => { const q = new T.ConeGeometry(.05, .18, 6); q.rotateZ(-Math.PI / 2); q.translate(.57, 0, 0); return q; }), toon('#d0d4dc')));
    if (kind === 'farrow') { const f = new T.Mesh(geo('afire', () => new T.SphereGeometry(.16, 10, 8)), glowMat(c || '#ff8a2a', 3, true)); f.position.x = .5; f.scale.set(2, 1, 1); g.add(f); } return { mesh: g }; }
  if (kind === 'orb' || kind === 'fireball') { const m = glowMat(c, 3, true), g = new T.Mesh(geo('orbp', () => new T.SphereGeometry(.35, 16, 12)), m); g.scale.setScalar(s); return { mesh: g, mat: m }; }
  if (kind === 'knife') { const g = new T.Mesh(geo('knife', () => { const q = new T.ConeGeometry(.06, .5, 4); q.rotateZ(-Math.PI / 2); return q; }), toon('#dfe6ee')); return { mesh: g }; }
  if (kind === 'bomb') { const g = new T.Mesh(geo('bomb', () => new T.SphereGeometry(.22, 12, 10)), toon('#3a2a22')); return { mesh: g }; }
  if (kind === 'axe') { const g = new T.Group(); const a = new T.Mesh(geo('axeh', () => crescentGeo(.6, .55)), toon('#dfe6ee')); a.rotation.y = -Math.PI / 2; g.add(a); g.scale.setScalar(1.6); return { mesh: g }; }
  if (kind === 'tornado') { const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(1.6), transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
    const g = new T.Mesh(geo('tornado', () => { const q = new T.ConeGeometry(1.1, 3.2, 20, 6, true); q.rotateX(Math.PI); q.translate(0, 1.6, 0); return q; }), m); g.scale.setScalar(s); return { mesh: g, mat: m, spin: true }; }
  const m = slashMat(c, 1), g = new T.Group(), inner = new T.Mesh(SLASH_GEO.qi, m); g.add(inner); if (kind === 'dragon') { inner.scale.set(1.6, 1.6, 1.6); } return { mesh: g, mat: m, qi: true };
}
function fireProj(o) {
  const { mesh, mat, qi, spin } = projMesh(o.kind, o.c, o.s || 1);
  const pr = Object.assign({ y: 1.2, vy: 0, vz: 0, r: .6, rz: .85, life: 1.6, hit: new Set(), pierce: false, knock: false, grav: 0 }, o, { mesh, mat, qi, spin });
  if (qi) mesh.scale.set(Math.sign(o.vx || 1) * (o.s || 1), o.s || 1, o.s || 1);
  mesh.position.set(pr.x, pr.y, pr.z); scene.add(mesh); B.proj.push(pr); return pr;
}
function updProj(dt) {
  for (const o of B.proj) {
    o.life -= dt; o.t = (o.t || 0) + dt;
    if (o.homing && o.team === 'e') { const tg = B.p; o.vx += Math.sign(tg.x - o.x) * 8 * dt; o.vz += Math.sign(tg.z - o.z) * 4 * dt; const sp = Math.hypot(o.vx, o.vz), mx = o.maxV || 7; if (sp > mx) { o.vx *= mx / sp; o.vz *= mx / sp; } }
    if (o.boomer && o.t > o.boomer) { o.vx -= Math.sign(o.vx0) * 30 * dt; }
    o.vy -= o.grav * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.mesh.position.set(o.x, o.y, o.z);
    if (!o.qi && !o.spin) o.mesh.rotation.z = Math.atan2(o.vy, o.vx); if (o.spin) o.mesh.rotation.y += dt * 12; if (o.kind === 'axe') o.mesh.rotation.x += dt * 20;
    if (o.trail) PA.emit(o.x, o.y + rand(-.2, .2), o.z, -o.vx * .1, rand(0, 1), 0, .35, rand(.2, .4) * (o.s || 1), tmpC.set(o.trail), 0, 2, 2.2);
    if (o.kind === 'bomb' && o.y <= .2) { o.life = 0; burst(o.x, .5, o.z, '#ff9a40', 40, 7, .7, .5); shockwave(o.x, o.z, 3.2, '#ff9a40'); W.shake = .4; sfx('boom'); aoeP(B.p, o.x, o.z, 2.6, o.dmg, { knock: true, el: 'fire', noProc: true }); continue; }
    if (o.fall && o.y <= .1) { o.life = 0; o.onLand && o.onLand(o); continue; }
    if (o.team === 'p') {
      for (const e of B.enemies) { if (e.dead || o.hit.has(e)) continue;
        if (Math.abs(e.x - o.x) < o.r * Math.max(1, e.scale * .8) && Math.abs(e.z - o.z) < o.rz && o.y > (e.y || 0) - .3 && o.y < (e.y || 0) + 2.4 * e.scale) {
          o.hit.add(e); if (o.pull) { e.x = lerp(e.x, o.x, .5); e.z = lerp(e.z, o.z, .5); }
          dealDamage(o.from, e, o.dmg, { knock: o.knock, el: o.el, dir: Math.sign(o.vx) || 1, skill: o.skill, noProc: o.noProc, kb: o.kb });
          if (o.explode) { o.life = 0; burst(o.x, o.y, o.z, o.c || '#ff8a2a', 26, 6, .5, .4); shockwave(o.x, o.z, o.explode * 1.4, o.c || '#ff8a2a'); aoeP(o.from, o.x, o.z, o.explode, o.dmg * .6, { el: o.el, knock: true, noProc: true }); sfx('boom'); break; }
          if (!o.pierce) { o.life = 0; break; }
          if (o.multi) setTimeout(() => o.hit && o.hit.delete(e), o.multi * 1000); } }
      for (const pr of B.props) if (!pr.dead && !o.hit.has(pr) && Math.abs(pr.x - o.x) < o.r + (pr.kind === 'gate' ? .8 : 0) && (Math.abs(pr.z - o.z) < o.rz || pr.kind === 'gate')) { o.hit.add(pr); hitProp(pr, o.from); if (!o.pierce) o.life = 0; }
    } else {
      for (const t of enemyTargetsAll()) { if (t.dead || o.hit.has(t)) continue;
        if (Math.abs(t.x - o.x) < o.r && Math.abs(t.z - o.z) < o.rz && o.y > (t.y || 0) - .3 && o.y < (t.y || 0) + 2.3) { o.hit.add(t); hurtTarget(t, o.from, o.dmg, { knock: o.knock, dir: Math.sign(o.vx) || 1, threat: true }); if (!o.pierce) { o.life = 0; break; } } }
      for (const a of B.allies) if (!a.dead && a.hp < 9000 && !o.hit.has(a) && Math.abs(a.x - o.x) < o.r && Math.abs(a.z - o.z) < o.rz) { o.hit.add(a); a.hp -= o.dmg; if (!o.pierce) o.life = 0; }
    }
    if (Math.abs(o.x - B.camX) > 40) o.life = 0;
  }
  for (let i = B.proj.length - 1; i >= 0; i--) { const o = B.proj[i]; if (o.life <= 0) { scene.remove(o.mesh); if (o.mat) o.mat.dispose(); B.proj.splice(i, 1); } }
}

/* ---------------- 플레이어 ---------------- */
function updatePlayer(p, dt) {
  const S = p.S, P = p.P, h = p.h;
  p.st += dt; if (p.invuln > 0) p.invuln -= dt; if (p.dodgeCd > 0) p.dodgeCd -= dt; if (p.perfT > 0) p.perfT -= dt; if (p.fear > 0) p.fear -= dt; if (p.slowT > 0) p.slowT -= dt;
  /* 자원 회복 */
  p.mp = Math.min(S.maxmp, p.mp + S.mpRegen * dt); p.hp = Math.min(S.maxhp, p.hp + S.hpRegen * dt * (p.dead ? 0 : 1)); p.ki = Math.min(S.maxki, p.ki + S.kiRegen * dt);
  for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
  p.buf = p.buf || {}; for (const k in p.buf) if (p.buf[k] > 0) p.buf[k] -= dt;
  let bchg = false; for (let i = p.buffs.length - 1; i >= 0; i--) { p.buffs[i].t -= dt; if (p.buffs[i].t <= 0) { p.buffs.splice(i, 1); bchg = true; } } if (bchg) refreshStats(p);
  auraTick(p, dt); gearFx(p, dt);
  if (S.pw.fireTrail && Math.abs(p.vx) > 1 && Math.random() < .3) { PA.emit(p.x, .2, p.z, 0, 1, 0, .8, .4, tmpC.set('#ff7a2a'), 0, 0, 2); if (Math.random() < .1) aoeP(p, p.x, p.z, 1, p.S.pow * .3, { el: 'fire', noProc: true }); }
  if (p.dead) { if (p.downLand) p.deathT += dt; if (p.deathT > 1.4) playerDeath(p); return; }
  const ax = axis(), spdMul = (p.buf.haste > 0 ? 1.5 : 1) * (p.slowT > 0 ? .6 : 1), sp = S.spd * 60 * PX * spdMul;
  const canAct = ['idle', 'walk', 'run'].includes(p.state);
  /* 회피 */
  if (hit('dodge') && p.dodgeCd <= 0 && (p.y || 0) < .05 && ['idle', 'walk', 'run', 'attack', 'item'].includes(p.state)) {
    setState(p, 'dodge'); p.dodgeCd = 34 / 60; p.invuln = 18 / 60; p.perfDone = false; sfx('dodge');
    const moving = Math.hypot(ax.x, ax.z) > .2, back = !moving || Math.sign(ax.x) === -p.facing && Math.abs(ax.z) < .3;
    p.backstep = back; if (back) { p.vx = -p.facing * 7.5 * 60 * PX; p.vz = 0; } else { p.vx = ax.x * 9.5 * 60 * PX; p.vz = ax.z * 6 * 60 * PX * .7; p.rollDir = Math.sign(ax.x || p.facing) * p.facing; }
    return; }
  switch (p.state) {
    case 'idle': case 'walk': case 'run': {
      const run = p.runDir !== 0 && Math.sign(ax.x) === p.runDir && Math.abs(ax.x) > .3;
      if (!run) p.runDir = 0;
      const k = run ? 1.9 : 1; p.vx = ax.x * sp * k; p.vz = ax.z * sp * .7;
      if (Math.abs(ax.x) > .15) p.facing = Math.sign(ax.x);
      const moving = Math.hypot(ax.x, ax.z) > .1; p.state = run ? 'run' : moving ? 'walk' : 'idle'; if (moving) p.walkP += dt * S.spd * (run ? 4.4 : 3.3);
      if (run && Math.random() < .3) dust(p.x - p.facing * .3, p.z, 1, .5);
      /* 더블탭 달리기 */
      if (hit('right') || hit('left')) { const d = hit('right') ? 1 : -1; if (p.lastTap && p.lastTap.d === d && W.t - p.lastTap.t < .28) p.runDir = d; p.lastTap = { d, t: W.t }; }
      if (hit('atk') && hit('jump') || (hit('atk') && W.t - (hitK.jump || -9) < .09) || (hit('jump') && W.t - (hitK.atk || -9) < .09)) { if (tryspin(p)) break; }
      if (p.fear > 0) break;
      const cmd = hit('atk') ? cmdInput(p.facing) : null;
      if (cmd && cmd.k === 'cmd') { if (cmd.dir) p.facing = cmd.dir; startCmd(p); break; }
      if (cmd && cmd.k === 'x') { startXcmd(p, cmd.i, cmd.f); break; }
      if (cmd && cmd.k === 'launch') { startLaunch(p); break; }
      if (hit('jump')) { p.vy = 11; p.y = .01; setState(p, 'jump'); p.airAtk = false; p.jumpT = W.t; break; }
      if (hit('sp')) { startSpecial(p, held('up')); break; }
      if (hit('msp')) { startSpecial(p, true); break; }
      if (hit('atk')) { if (run) startDashAtk(p); else startAttack(p, 0); break; }
      if (hit('use')) useItem(p); if (hit('swap')) swapItem(p);
      for (let i = 0; i < 4; i++) if (hit('s' + (i + 1))) castHot(p, i);
      break; }
    case 'jump':
      p.vx = ax.x * sp * .9; p.vz = ax.z * sp * .55; if (Math.abs(ax.x) > .15 && !p.airAtk) p.facing = Math.sign(ax.x);
      if (hit('atk') && !p.airAtk && p.fear <= 0) { if (W.t - p.jumpT < .09) { if (tryspin(p)) break; } p.airAtk = true; p.airT = 0; p.hitIds.clear(); slash(p, 'chop', p.h.fx, { h: .9, s: reachOf(p) / 2.7, follow: true }); sfx('swing'); }
      if (p.airAtk) { p.airT += dt; if (p.airT > .07 && p.airT < .3) meleeP(p, { reach: reachOf(p) * .9, dz: 1, dmg: pOf(p, 'basic') * 1.2 * 1.6, kb: 4, knock: true }); }
      break;
    case 'attack': case 'dashatk': case 'launch':
      if (hit('sp') && p.st > p.atkDur * .4) { startSpecial(p, held('up')); break; }
      tickAttack(p, dt); break;
    case 'cmd': tickCmd(p, dt); break;
    case 'xcmd': tickXcmd(p, dt); break;
    case 'spin': p.vx = ax.x * sp * .6; p.vz = ax.z * sp * .4; if ((p.spinT = (p.spinT || 0) - dt) <= 0) { p.spinT = .13; p.hitIds.clear(); meleeP(p, { reach: reachOf(p) * 1.05, spin: true, dz: 1.6, dmg: pOf(p, 'basic') * .8, kb: 3, knock: p.st > .5 }); slash(p, 'spin', p.h.fx, { s: reachOf(p) / 3, life: .22, follow: true }); sfx('swing'); }
      if (p.st > 40 / 60) { setState(p, 'idle'); p.invuln = .2; } break;
    case 'special': tickSpecial(p, dt); break;
    case 'cast': tickCast(p, dt); break;
    case 'item': p.vx = 0; if (p.st > .35) setState(p, 'idle'); break;
    case 'dodge': p.vx *= Math.exp(-dt * 3); p.vz *= Math.exp(-dt * 3);
      if (p.st > 22 / 60) { setState(p, 'idle'); p.vx = p.vz = 0; } break;
    case 'hurt': p.vx *= Math.exp(-dt * 7); p.vz = 0; if (p.st > 14 / 60) setState(p, 'idle'); break;
    case 'grabbed': p.vx = p.vz = 0; if (hit('atk') || hit('jump')) { p.mash++; W.shake = .08; } break;
    case 'down': downTick(p, dt); break;
    case 'getup': p.vx = 0; if (p.st > .4) { setState(p, 'idle'); p.invuln = 70 / 60; } break;
  }
}
function reachOf(p) { return p.h.reach * PX * (p.S.wReach || 1) * (1 + (p.S.aoe || 0) / 300); }
function tryspin(p) {
  if (p.hp <= p.S.maxhp * .1) { UI.dmg(p.x, 2.4, p.z, '체력 부족', 'block'); return false; }
  p.hp -= p.S.maxhp * .06; setState(p, 'spin'); p.invuln = 40 / 60 + .05; p.hitIds.clear(); p.spinT = 0; p.y = 0; p.vy = 0;
  UI.dmg(p.x, 2.8, p.z, SPIN_NAME[p.h.id] || '회전베기', 'skill'); sfx('special'); shout(p.h.name, SPIN_NAME[p.h.id] || '회전베기'); return true;
}
const SPIN_NAME = { guan: '청룡회선', zhang: '회전베기', zhao: '연환창', huang: '공중 사격', zhuge: '팔괘 돌풍', ma: '도약 낙창', diao: '선녀 선회', wei: '열화 내려찍기', lubu: '천하일섬', xu: '대부 선풍', gan: '쇄편 선풍', sun: '백덤블링 사격' };
const HERO_BAL = { lubu: 1.1 };
function isBow(p) { return (p.S.wt || HERO_WT[p.h.id]) === 'bow'; }
function startAttack(p, i) {
  setState(p, 'attack'); p.combo = i; p.pose = i === 2 ? (p.h.id === 'zhao' || p.h.id === 'ma' ? 2 : 3) : i; p.queued = false; p.hitIds.clear();
  if (isBow(p)) p.pose = 5;
  p.atkDur = [17, 17, 24][i] / 60 / (p.S.wSpd || 1) * 1.25; p.windFrac = .3;
  p.vx = p.facing * (i === 2 ? 3 : 1.2); p.vz = 0;
}
function startDashAtk(p) { setState(p, 'dashatk'); p.pose = 2; p.combo = 9; p.atkDur = .45; p.windFrac = .15; p.hitIds.clear(); p.vx = p.facing * p.S.spd * 60 * PX * 1.9; slash(p, 'thrust', p.h.fx, { s: 1.1, follow: true, life: .35 }); sfx('swing'); }
function startLaunch(p) {
  if (p.ki < 10) { UI.dmg(p.x, 2.4, p.z, '기력 부족', 'block'); sfx('no'); return; }
  p.ki -= 10; setState(p, 'launch'); p.pose = 4; p.combo = 8; p.atkDur = .55; p.windFrac = .35; p.hitIds.clear(); p.lHits = 0;
  UI.dmg(p.x, 2.8, p.z, '승천격', 'skill');
  for (const e of B.enemies) if (!e.dead && !e.boss && Math.abs(e.x - p.x) < 4 && Math.abs(e.z - p.z) < 2.2) { e.x = lerp(e.x, p.x + p.facing * 1.4, .5); e.z = lerp(e.z, p.z, .6); }
}
function tickAttack(p, dt) {
  const u = p.st / p.atkDur, H = p.h;
  if (p.state === 'dashatk') { p.vx *= Math.exp(-dt * 4); if (p.st > .05 && p.st < .3) meleeP(p, { reach: reachOf(p) * 1.1, back: .8, dz: 1.2, dmg: pOf(p, 'dash') * 1.5, kb: 6, knock: true }); if (u >= 1) setState(p, 'idle'); return; }
  if (p.state === 'launch') { if (u > .2 && u < .75) { const k = Math.floor((u - .2) / .18); if (k > p.lHits) { p.lHits = k; p.hitIds.clear(); slash(p, 'rise', p.h.fx, { s: 1.1 }); sfx('swing');
        pillar(p.x + p.facing * 1.4, p.z, p.h.fx, 5, .4, .6); meleeP(p, { reach: reachOf(p) * 1.2, dz: 1.5, dmg: pOf(p, 'basic') * 1.3, kb: 1.5, launch: k >= 3, knock: k >= 3 }); } }
    if (u >= 1) setState(p, 'idle'); return; }
  p.vx *= Math.exp(-dt * 10);
  if (!p.didSwing && u >= p.windFrac) {
    p.didSwing = true; sfx('swing');
    const i = p.combo, bow = isBow(p);
    if (bow) { const n = i === 2 ? (p.S.pw.triArrow ? 3 : 1) : 1; for (let k = 0; k < n; k++) fireProj({ kind: i === 2 ? 'farrow' : 'arrow', team: 'p', from: p, x: p.x + p.facing * .6, z: p.z + (k - (n - 1) / 2) * .6, y: 1.35, vx: p.facing * 22, dmg: pOf(p, 'basic') * (i === 2 ? 1.6 : 1), knock: i === 2, el: i === 2 ? 'fire' : 'phys', r: .5, c: '#ff8a2a', trail: i === 2 ? '#ff8a2a' : null, pierce: i === 2 }); sfx('shoot'); }
    else { slash(p, ['chop', 'sweep', 'thrust'][i], p.h.fx, { s: reachOf(p) / 2.7, life: .26 });
      if (i === 2 && H.id === 'huang') { const n = p.S.pw.triArrow ? 3 : 1; for (let k = 0; k < n; k++) fireProj({ kind: 'farrow', team: 'p', from: p, x: p.x + p.facing * .6, z: p.z + (k - (n - 1) / 2) * .6, vx: p.facing * 22, dmg: pOf(p, 'basic') * 1.2, el: 'fire', c: '#ff8a2a', trail: '#ff8a2a', pierce: true, knock: true }); }
      if (i === 2 && H.id === 'zhuge') fireProj({ kind: 'wind', team: 'p', from: p, x: p.x + p.facing, z: p.z, vx: p.facing * 13, dmg: pOf(p, 'basic') * 1.3, knock: true, pierce: true, c: '#c7e8ff', s: .9, life: .9, r: 1 }); }
  }
  if (p.didSwing && u < p.windFrac + .35 && !isBow(p)) { const i = p.combo; meleeP(p, { reach: reachOf(p) * (i === 2 ? 1.12 : 1), dz: 1, dmg: pOf(p, 'basic') * (i === 2 ? 1.6 : 1), kb: [1.4, 1.6, 5][i], knock: i === 2 }); }
  if (hit('atk') && u > .3) p.queued = true;
  if (u >= 1) { if (p.queued && p.combo < 2) startAttack(p, p.combo + 1); else setState(p, 'idle'); }
}
/* ↓→ + 공격: 무장별 전용기 */
function startCmd(p) {
  const S = p.S, lv = effSkillLv(p.P, SKT[p.h.id][0][2], S), cost = Math.max(10, 20 - Math.floor(lv / 2));
  if (p.ki < cost) { UI.dmg(p.x, 2.4, p.z, '기력 부족', 'block'); sfx('no'); return; }
  p.ki -= cost; setState(p, 'cmd'); p.hitIds.clear(); p.cmdN = 0; p.pose = 1; p.atkDur = .5; p.windFrac = .3;
  UI.dmg(p.x, 2.9, p.z, p.h.cmd.name, 'skill'); sfx('special'); magicCircle(p.x, p.z, p.h.fx, 1.6); shout(p.h.name, p.h.cmd.name);
}
function tickCmd(p, dt) {
  const ty = p.h.cmd.type, d = pOf(p, 'cmd'), st = p.st, c = p.h.fx, f = p.facing;
  const once = key => { if (p['_' + key]) return false; p['_' + key] = true; return true; };
  if (st < .02) for (const k in p) if (k.startsWith('_')) delete p[k];
  switch (ty) {
    case 'gwave': p.pose = 0; p.atkDur = .6; if (st > .2 && once('a')) { fireProj({ kind: 'dragon', team: 'p', from: p, x: p.x + f, z: p.z, vx: f * 14, dmg: d * 2, knock: true, pierce: true, c, s: 1.2, r: 1.2, rz: 1.1, trail: c, life: 1.2 }); sfx('heavy'); } break;
    case 'charge': case 'lance': p.pose = 2; p.atkDur = .6; p.poseKind = 'dash'; if (st > .12 && st < .5) { p.vx = f * 20; meleeP(p, { reach: 1.8, back: 1, dz: 1.3, dmg: d * 1.8, kb: 7, knock: true }); if (Math.random() < .5) dust(p.x, p.z, 2, 1.2); if (once('s')) slash(p, 'thrust', c, { s: 1.3, follow: true, life: .45 }); } else p.vx *= .8; break;
    case 'flurry': p.pose = 2; p.atkDur = .75; if (st > .1 && st < .65) { const k = Math.floor((st - .1) / .07); if (k > p.cmdN) { p.cmdN = k; p.hitIds.clear(); slash(p, 'thrust', c, { s: 1.1, rz: rand(-.25, .25), life: .12 }); meleeP(p, { reach: reachOf(p) * 1.15, dz: 1.1, dmg: d * .6, kb: 1, knock: k >= 7, stop: .02 }); sfx('swing'); } } break;
    case 'triarrow': p.pose = 5; p.atkDur = .6; for (let k = 0; k < 3; k++) if (st > .15 + k * .12 && once('a' + k)) { fireProj({ kind: 'farrow', team: 'p', from: p, x: p.x + f * .6, z: p.z + (k - 1) * .4, vx: f * 24, dmg: d * 1.1, el: 'fire', pierce: true, knock: k === 2, c: '#ff8a2a', trail: '#ff8a2a' }); sfx('shoot'); } break;
    case 'fireball': p.poseKind = 'raise'; p.state = 'cmd'; p.pose = 0; p.atkDur = .6; if (st > .25 && once('a')) { fireProj({ kind: 'fireball', team: 'p', from: p, x: p.x + f, z: p.z, vx: f * 11, dmg: d * 1.8, el: 'fire', explode: 2.2, c: '#ff7a2a', trail: '#ff7a2a', s: 1.1 }); sfx('fire'); } break;
    case 'petal': p.pose = 1; p.atkDur = .6; if (st > .2 && once('a')) for (let k = 0; k < 3; k++) fireProj({ kind: 'qi', team: 'p', from: p, x: p.x + f, z: p.z + (k - 1) * .7, vx: f * 13, vx0: f, boomer: .5, dmg: d * 1, pierce: true, multi: .35, c: '#ff8ad0', trail: '#ffb0e0', s: .8, life: 1.2 }); break;
    case 'quake': p.pose = 0; p.atkDur = .8; for (let k = 0; k < 5; k++) if (st > .25 + k * .09 && once('q' + k)) { const x = p.x + f * (1.5 + k * 1.6); pillar(x, p.z, '#ff7a2a', 3.5, .5, .7); burst(x, .3, p.z, '#ff7a2a', 12, 4, .5, .35); aoeP(p, x, p.z, 1.3, d * 1.4, { launch: true, knock: true, el: 'fire' }); sfx('heavy'); } break;
    case 'redslash': p.pose = 1; p.atkDur = .6; if (st > .2 && once('a')) { fireProj({ kind: 'qi', team: 'p', from: p, x: p.x + f * 1.2, z: p.z, vx: f * 16, dmg: d * 2.2, knock: true, pierce: true, c: '#ff3a3a', trail: '#ff5a4a', s: 1.8, r: 1.3, rz: 1.3 }); W.shake = .25; sfx('heavy'); } break;
    case 'axethrow': p.pose = 0; p.atkDur = .6; if (st > .2 && once('a')) fireProj({ kind: 'axe', team: 'p', from: p, x: p.x + f, z: p.z, vx: f * 14, vx0: f, boomer: .45, dmg: d * 1.7, pierce: true, multi: .3, knock: true, r: .9, life: 1.4 }); break;
    case 'lash': p.pose = 1; p.atkDur = .55; if (st > .18 && once('a')) { slash(p, 'thrust', '#ffd84a', { s: 1.6, life: .3 }); for (const e of B.enemies) if (!e.dead && (e.x - p.x) * f > 0 && (e.x - p.x) * f < 6 && Math.abs(e.z - p.z) < 1.3) { if (!e.boss) { e.x = p.x + f * 1.3; e.z = p.z; } dealDamage(p, e, d * 1.3, { el: 'bolt', stun: .6 }); } sfx('zap'); } break;
    case 'backshot': p.pose = 5; p.atkDur = .7; if (st < .15) p.vx = -f * 12; else p.vx = 0; for (let k = 0; k < 5; k++) if (st > .2 + k * .08 && once('b' + k)) { fireProj({ kind: 'arrow', team: 'p', from: p, x: p.x + f * .6, z: p.z + rand(-.4, .4), vx: f * 24, dmg: d * .7, r: .5 }); sfx('shoot'); } break;
  }
  if (st > p.atkDur) { setState(p, 'idle'); p.poseKind = null; }
}
/* 필살기 */
const SP_POSE = { crescent: 'raise', roar: 'slam', dash: 'dash', rain: 'bow', thunder: 'raise', tornado: 'spin', charm: 'spin', fire: 'slam', musou: 'melee', axequake: 'slam', whipstorm: 'spin', bowdance: 'bow' };
function startSpecial(p, myth) {
  const S = p.S, spLv = effSkillLv(p.P, SKT[p.h.id][0][4], S);
  let cost = Math.max(30, 50 - spLv), type = p.h.sp, name = p.h.spName, hz = HERO_SP_HZ[p.h.id], c = p.h.fx;
  if (myth) { if (!S.spx) { UI.dmg(p.x, 2.4, p.z, '신화 무기 없음', 'block'); return; } if ((p.cds.myth || 0) > 0) { UI.dmg(p.x, 2.4, p.z, '재사용 대기', 'block'); return; }
    cost += 20; const M = MYTH_SP[S.spx]; type = 'myth_' + S.spx; name = M.n; hz = M.hz; c = M.col; }
  if (p.ki >= cost) p.ki -= cost; else { if (myth || p.hp <= S.maxhp * .15) { UI.dmg(p.x, 2.4, p.z, '기력 부족', 'block'); sfx('no'); return; } p.hp -= S.maxhp * .1; UI.dmg(p.x, 2.4, p.z, '체력 -10%', 'hurt'); }
  if (myth) p.cds.myth = 20;
  setState(p, 'special'); p.spType = type; p.spC = c; p.invuln = 99; p.hitIds.clear(); p.sp = { n: 0, tick: 0 }; p.poseKind = SP_POSE[type] || 'raise';
  UI.cutin(hz, name, p.h.name, c); W.slow = .55; sfx('special'); W.flash = .4; shout(p.h.name, name);
  runProcs(p, 'special');
}
function bgmBurst() { }
function tickSpecial(p, dt) {
  const st = p.st, s = p.sp, d = pOf(p, 'sp'), c = p.spC, f = p.facing, hw = halfW(), cx = B.camX;
  const onScreen = () => B.enemies.filter(e => !e.dead && Math.abs(e.x - cx) < hw + 1);
  const every = (iv, fn, until) => { if (st > until) return; s.tick -= dt; if (s.tick <= 0) { s.tick = iv; s.n++; fn(s.n); } };
  let end = 1.4;
  switch (p.spType) {
    case 'crescent': if (st > .3 && !s.a) { s.a = 1; fireProj({ kind: 'dragon', team: 'p', from: p, x: p.x + f, z: p.z, vx: f * 16, dmg: d * 6, knock: true, pierce: true, c, s: 2.6, r: 2.4, rz: 3.5, trail: c, life: 1.6, noProc: true }); W.shake = .5; sfx('boom'); } end = 1.3; break;
    case 'roar': if (!s.j) { s.j = 1; p.vy = 9; p.y = .02; } if (!s.a && st > .25 && (p.y || 0) <= .001) { s.a = 1; shockwave(p.x, p.z, 16, c); shockwave(p.x, p.z, 10, '#ffe0a0'); W.shake = .9; sfx('boom'); dust(p.x, p.z, 40, 2.5);
        for (const e of onScreen()) dealDamage(p, e, d * 5, { knock: true, stun: 1.2, noProc: true, dir: Math.sign(e.x - p.x) || 1 }); } end = 1.3; break;
    case 'dash': if (st > .15 && st < .95) { p.vx = f * 26; p.vz = axis().z * 3; meleeP(p, { reach: 2, back: 1.5, dz: 1.8, dmg: d * 3.5, knock: true, kb: 8, noProc: true }); for (let i = 0; i < 6; i++) PA.emit(p.x - f * rand(0, 2), rand(.4, 2), p.z + rand(-.5, .5), -f * rand(2, 6), 0, 0, .4, rand(.2, .5), tmpC.set(c), 0, 3, 2.2); if (!s.a) { s.a = 1; slash(p, 'thrust', c, { s: 2, follow: true, life: .8 }); } }
      else if (st >= .95) { p.vx *= .8; if (st > .95 && !s.b) { s.b = 1; p.hitIds.clear(); } } end = 1.3; break;
    case 'rain': every(.05, n => { const x = cx + rand(-hw, hw), z = rand(-3.8, 3.8); fireProj({ kind: 'farrow', team: 'p', from: p, x: x - f * 2, y: 12, z, vx: f * 4, vy: -26, dmg: d * .8, fall: true, c: '#ff8a2a', trail: '#ff8a2a', onLand: o => { burst(o.x, .3, o.z, '#ff8a2a', 10, 4, .4, .3); aoeP(p, o.x, o.z, 1.4, o.dmg, { el: 'fire', noProc: true, knock: Math.random() < .3 }); } }); }, 1.4); end = 1.8; break;
    case 'thunder': { const tg = onScreen(); every(.12, n => { const e = tg.length ? tg[n % tg.length] : null, x = e ? e.x : cx + rand(-hw, hw), z = e ? e.z : rand(-3.5, 3.5); lightning(x, z, c); aoeP(p, x, z, 1.8, d * 2.2, { el: 'bolt', knock: true, noProc: true }); }, 1.3); end = 1.6; break; }
    case 'tornado': case 'whipstorm': case 'charm': {
      const r = p.spType === 'whipstorm' ? 4.5 : 3.6; p.vx = axis().x * 3; p.vz = axis().z * 2;
      for (const e of B.enemies) if (!e.dead && !e.boss && Math.abs(e.x - p.x) < 8) { e.x = lerp(e.x, p.x, dt * 2); e.z = lerp(e.z, p.z, dt * 2); }
      every(.14, n => { p.hitIds.clear(); meleeP(p, { reach: r, spin: true, dz: 2.2, dmg: d * .7, knock: n % 6 === 0, noProc: true, stop: .02, el: p.spType === 'charm' ? 'ice' : 'phys' }); slash(p, 'spin', c, { s: r / 2.8, life: .22, follow: true, tilt: rand(-.2, .3) }); sfx('swing'); }, 1.4);
      for (let i = 0; i < 6; i++) { const a = rand(0, 6.28), rr = rand(1, r); PA.emit(p.x + Math.cos(a) * rr, rand(.2, 2.6), p.z + Math.sin(a) * rr * .6, -Math.sin(a) * 8, rand(1, 3), Math.cos(a) * 5, .35, rand(.15, .35), tmpC.set(p.spType === 'charm' ? pick(['#ff8ad0', '#ffd0e8']) : c), 0, 1, 2.5); }
      end = 1.6; break; }
    case 'fire': every(.1, n => { const x = p.x + f * (1 + n * 1.2); if (Math.abs(x - cx) > hw + 2) return; pillar(x, p.z, '#ff6a1a', 6, .6, 1); burst(x, .3, p.z, '#ff7a2a', 16, 5, .6, .4); aoeP(p, x, p.z, 1.8, d * 1.4, { el: 'fire', launch: true, knock: true, noProc: true }); sfx('fire'); }, 1.1); end = 1.5; break;
    case 'musou': every(.1, n => { p.hitIds.clear(); const x = cx + rand(-hw * .8, hw * .8); slash({ x, y: 0, z: rand(-2, 2), facing: pick([-1, 1]), scale: 1 }, pick(['chop', 'sweep', 'xcut']), c, { s: 1.8, life: .25, rz: rand(-.5, .5) }); aoeP(p, x, 0, 4, d * 1.1, { knock: n % 4 === 0, noProc: true, stop: .02 }); sfx('swing'); }, 1.3); end = 1.6; break;
    case 'axequake': if (!s.j) { s.j = 1; p.vy = 10; p.y = .02; } if (!s.a && st > .25 && (p.y || 0) <= .001) { s.a = 1; W.shake = .9; sfx('boom'); for (let k = 0; k < 8; k++) setTimeout(() => { if (!B) return; const x = p.x + f * (1.5 + k * 1.6); pillar(x, p.z, '#ffb040', 4, .5, .8); dust(x, p.z, 10, 1.5); aoeP(p, x, p.z, 1.8, d * 1.3, { knock: true, launch: true, noProc: true }); }, k * 70); } end = 1.5; break;
    case 'bowdance': if (st < .3) p.vy = st < .05 ? 8 : p.vy; every(.04, n => { fireProj({ kind: n % 3 ? 'arrow' : 'farrow', team: 'p', from: p, x: p.x, y: 1.4 + (p.y || 0), z: p.z + rand(-.5, .5), vx: f * 24 * rand(.8, 1.1), vz: rand(-3, 3), dmg: d * .6, r: .6, c: '#ff6a4a', trail: n % 3 ? null : '#ff6a4a', noProc: true }); if (n % 3 === 0) sfx('shoot'); }, 1.3); end = 1.6; break;
    default: mythSpecial(p, st, s, d, c, cx, hw); end = 1.8;
  }
  if (st > end && !s.fin) { s.fin = 1; s.finT = 0; }
  if (s.fin) { s.finT += dt; if (Math.random() < .6) { const x = cx + rand(-hw, hw), z = rand(-3.5, 3.5); burst(x, rand(.5, 2), z, c, 10, 5, .4, .4, 2.6); }
    if (s.finT > 1.0 && !s.boom) { s.boom = 1; W.flash = .8; W.shake = .7; sfx('boom'); for (const e of onScreen()) dealDamage(p, e, d * 1.5, { knock: true, noProc: true, force: true }); }
    if (s.finT > 1.25) { setState(p, 'idle'); p.invuln = .4; p.poseKind = null; } }
}
function mythSpecial(p, st, s, d, c, cx, hw) {
  const t = p.spType.slice(5), en = () => B.enemies.filter(e => !e.dead && Math.abs(e.x - cx) < hw + 1);
  if (t === 'qixing' && !s.a) { s.a = 1; for (let k = 0; k < 7; k++) setTimeout(() => { if (!B) return; const x = cx + (k - 3) * hw / 3.5, z = Math.sin(k) * 2; lightning(x, z, c, 1.3); aoeP(p, x, z, 2.4, d * 2.2, { el: 'bolt', knock: true, noProc: true }); }, k * 110); setTimeout(() => { if (!B) return; slash({ x: cx, y: 0, z: 0, facing: 1, scale: 1 }, 'xcut', c, { s: 4, life: .5 }); for (const e of en()) dealDamage(p, e, d * 4, { knock: true, noProc: true, force: true }); }, 900); }
  if (t === 'yitian' && st > .4 && !s.a) { s.a = 1; slash({ x: cx, y: 0, z: 0, facing: 1, scale: 1 }, 'thrust', c, { s: 8, life: .6 }); W.flash = 1; for (const e of en()) dealDamage(p, e, d * 6.5, { knock: true, noProc: true, force: true }); }
  if (t === 'guding' && !s.a) { s.a = 1; for (let k = 0; k < 4; k++) fireProj({ kind: 'tornado', team: 'p', from: p, x: p.x, z: p.z + (k % 2 ? -1 : 1), vx: (k < 2 ? 1 : -1) * 6, dmg: d * .6, pierce: true, multi: .25, el: 'fire', c: '#ff7a2a', s: 1.1, life: 1.6, r: 1.2, rz: 1.2 }); }
  if (t === 'cixiong' && !s.a) { s.a = 1; for (const dir of [-1, 1]) fireProj({ kind: 'dragon', team: 'p', from: p, x: p.x, z: p.z, vx: dir * 15, dmg: d * 4, pierce: true, knock: true, c: dir > 0 ? '#ff6aa0' : '#6ac8ff', trail: dir > 0 ? '#ff6aa0' : '#6ac8ff', s: 2, r: 2, rz: 3, life: 1.3 }); }
  if (t === 'hualong' && !s.a) { s.a = 1; p.vy = 12; for (let k = 0; k < 14; k++) setTimeout(() => { if (!B) return; const x = cx + rand(-hw, hw), z = rand(-3.5, 3.5); fireProj({ kind: 'fireball', team: 'p', from: p, x: x - 3, y: 14, z, vx: 5, vy: -22, dmg: d * 1.5, fall: true, c: '#ff5020', trail: '#ff5020', s: 1.2, onLand: o => { burst(o.x, .3, o.z, '#ff5020', 20, 6, .6, .5); shockwave(o.x, o.z, 3, '#ff7a2a'); aoeP(p, o.x, o.z, 2, o.dmg, { el: 'fire', knock: true, noProc: true }); sfx('boom'); } }); }, 200 + k * 70); }
  if (t === 'bingpo' && !s.a) { s.a = 1; W.flash = .6; for (const e of en()) { e.status.chill = 3; e.stunT = 2; setState(e, 'stun'); } for (let k = 0; k < 3; k++) setTimeout(() => { if (!B) return; for (const e of en()) { pillar(e.x, e.z, '#9ae8ff', 3, .5, .6); dealDamage(p, e, d * 1.6, { el: 'ice', knock: k === 2, noProc: true, force: true }); } }, 300 + k * 300); }
}
function magicCircle(x, z, c, r = 1.5) {
  const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(2), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, map: circleTex() });
  const mesh = new T.Mesh(geo('mc', () => { const g = new T.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2); return g; }), m); mesh.position.set(x, .06, z);
  addFx(mesh, .8, (fx, u) => { mesh.scale.setScalar(r * (.6 + easeOut(u * 2) * .4)); mesh.rotation.y += .05; m.opacity = 1 - smooth(.6, 1, u); }, m);
}
let _circleTex = null;
function circleTex() {
  if (_circleTex) return _circleTex; const [c, x] = makeCanvas(256, 256); x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(128, 128, 96, 0, 7); x.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.beginPath(); x.moveTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); x.lineTo(128 + Math.cos(a + 2.36) * 96, 128 + Math.sin(a + 2.36) * 96); x.stroke(); }
  x.font = '900 34px serif'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; '乾坤震巽坎離艮兌'.split('').forEach((ch, i) => { const a = i / 8 * Math.PI * 2; x.fillText(ch, 128 + Math.cos(a) * 107, 128 + Math.sin(a) * 107); });
  _circleTex = new T.CanvasTexture(c); _circleTex.userData.keep = true; return _circleTex;
}
/* ---------------- 액티브 스킬 ---------------- */
function skillMul(p, s) {
  const S = p.S, lv = effSkillLv(p.P, s, S), R = p.P.rpg;
  let syn = 0; for (const [id, v] of s.syn || []) syn += (R.sk[id] || 0) * v;
  const pts = SKT[p.h.id][s.tr].reduce((a, q) => a + (R.sk[q.id] || 0), 0), enh = R.enh[s.id] || 0;
  return (s.d + s.dr * (lv - 1)) * (1 + syn / 100) * (1 + enh * .08) * (1 + (S.skillDmg + pts) / 100);
}
function castHot(p, i) {
  const id = p.P.rpg.hot[i]; if (!id) { UI.msg(`${i + 1}번 단축키에 스킬이 없습니다 (Tab → 스킬)`); return; }
  const s = SKILLS[id], S = p.S, R = p.P.rpg; if (!s || !ACTIVE_TY[s.ty] || !(R.sk[id] > 0)) return;
  if ((p.cds[id] || 0) > 0) { sfx('no'); return; }
  const lv = effSkillLv(p.P, s, S), enh = R.enh[id] || 0, mp = s.mp * (1 + (lv - 1) * .05) * (enh >= 10 ? .7 : 1);
  const free = p.freeMana; p.freeMana = false;
  if (!free && p.mp < mp) { UI.dmg(p.x, 2.4, p.z, '내공 부족', 'block'); sfx('no'); return; }
  if (!free) p.mp -= mp;
  p.cds[id] = s.cd * (1 - S.cdr / 100) * (enh >= 10 ? .7 : 1);
  runProcs(p, 'cast');
  if (p.freeCast) { p.cds[id] = 0; p.freeCast = false; }
  const aw = enh >= 5;
  if (s.ti === 4) { UI.cutin(s.ic, s.n, '각성기 · ' + TREES[p.h.id][s.tr], p.h.fx); p.invuln = Math.max(p.invuln, 1); W.slow = .4; }
  else if (s.ti >= 2) { UI.super(s.n); W.hitstop = .12; }
  if (s.ti >= 2) shout(p.h.name, s.n);
  magicCircle(p.x, p.z, HAN_EL[s.el] || p.h.fx, 1.4); themeCastFx(p, s);
  p.castSk = s; p.castLv = lv; p.castAw = aw; setState(p, 'cast'); p.poseKind = { dash: 'dash', whirl: 'spin', leap: 'slam', proj: 'wave', nova: 'raise', rain: 'raise', chain: 'raise', quake: 'slam', summon: 'raise', buff: 'raise' }[s.ty];
  p.cs = { n: 0, tick: 0 }; p.hitIds.clear();
  if (s.ty === 'buff') { const mods = {}; for (const k in s.mods) mods[k] = s.mods[k][0] + s.mods[k][1] * (lv - 1); p.buffs = p.buffs.filter(b => b.id !== id); p.buffs.push({ id, mods, t: s.dur * (aw ? 1.5 : 1), n: s.n }); refreshStats(p);
    pillar(p.x, p.z, p.h.fx, 6, .9, 1.1); burst(p.x, 1, p.z, p.h.fx, 30, 4, .8, .3); UI.dmg(p.x, 3, p.z, s.n, 'skill'); sfx('special'); }
  UI.dmg(p.x, 3, p.z, s.n, 'skill');
}
function tickCast(p, dt) {
  const s = p.castSk, st = p.st, cs = p.cs, f = p.facing, dmg = pOf(p, 'skill') * skillMul(p, s), el = s.el || 'phys', c = HAN_EL[el] || s.col || p.h.fx, aw = p.castAw, aoeM = 1 + (p.S.aoe || 0) / 100;
  const once = k => { if (cs[k]) return false; cs[k] = 1; return true; };
  let end = .4;
  switch (s.ty) {
    case 'buff': end = .4; break;
    case 'proj': { end = .45; if (st > .12 && once('a')) { const n = (s.cnt || 1) + (aw ? 1 : 0), kind = s.kind === 'eslash' || s.kind === 'redslash' || s.kind === 'petal' ? 'qi' : s.kind === 'wind' ? 'qi' : s.kind;
      for (let k = 0; k < n; k++) { const off = n > 1 ? (k - (n - 1) / 2) * (s.spread || .6) * 1.2 : 0, spd = (s.spd || 10) * 60 * PX;
        fireProj({ kind, team: 'p', from: p, x: p.x + f * .8, z: p.z + off, vx: f * spd, dmg, el, pierce: !!s.pierce || kind === 'tornado', knock: !!s.knock, c: s.col || c, trail: s.col || c, skill: true,
          s: (s.w || 40) / 40 * (kind === 'dragon' ? 1.3 : 1) * aoeM, r: (s.w || 40) * PX * aoeM, rz: Math.max(.8, (s.w || 40) * PX * aoeM), life: (s.life || 60) / 60 * 1.3, explode: s.explode ? s.explode * PX * aoeM : 0,
          boomer: s.kind === 'petal' ? .45 : 0, vx0: f, multi: kind === 'tornado' ? .3 : s.kind === 'petal' ? .4 : 0, pull: kind === 'tornado' }); } sfx(el === 'fire' ? 'fire' : 'swing'); } break; }
    case 'dash': { const dur = (s.dist || 12) / 60 * 1.3 * (aw ? 1.25 : 1); end = dur + .2; if (st < dur) { p.vx = f * (s.spd || 12) * 60 * PX; p.vz = axis().z * 3; meleeP(p, { reach: 1.8, back: 1, dz: 1.3, dmg, el, knock: true, kb: 5, stun: s.stun ? s.stun / 60 : 0, skill: true });
        if (once('s')) slash(p, 'thrust', c, { s: 1.4, follow: true, life: dur + .1 }); PA.emit(p.x, rand(.5, 2), p.z, -f * 3, 0, 0, .3, .3, tmpC.set(c), 0, 2, 2);
        cs.tick -= dt; if (cs.tick <= 0 && cs.n < 5) { cs.tick = dur / 5; cs.n++; const x = p.x, z = p.z; setTimeout(() => { if (!B) return; burst(x, .5, z, c, 10, 4, .4, .3); aoeP(p, x, z, 1.2, dmg * .35, { el, noProc: true }); }, 250); } } else p.vx *= .8; break; }
    case 'nova': { const r = (s.r || 150) * PX * aoeM * (aw ? 1.25 : 1); end = .7; for (let k = 0; k < 3; k++) if (st > .12 + k * .15 && once('n' + k)) { shockwave(p.x, p.z, r * 1.2, c); burst(p.x, .6, p.z, c, 20, 6, .5, .35); aoeP(p, p.x, p.z, r, dmg * (k ? .5 : 1), { el, knock: k === 2, stun: s.stun ? s.stun / 60 : 0, skill: true }); sfx(k ? 'hit' : 'heavy'); } break; }
    case 'rain': { const n = (s.cnt || 8) + (aw ? 2 : 0); end = s.target ? .3 + n * .08 : 1.2; if (st > .15) { cs.tick -= dt; if (cs.tick <= 0 && cs.n < n) { cs.tick = s.target ? .08 : .9 / n; cs.n++;
        let x, z; if (s.target) { const tg = B.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < 14).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)); const e = tg[(cs.n - 1) % Math.max(1, tg.length)]; x = e ? e.x : p.x + f * rand(2, 8); z = e ? e.z : p.z + rand(-2, 2); }
        else { x = p.x + f * rand(1, (s.spread || 420) * PX); z = clamp(p.z + rand(-3, 3), -4, 4); }
        rainStrike(p, s.hk || el, x, z, dmg, el, c); } } break; }
    case 'chain': { end = .6; if (st > .15 && once('a')) { let cur = { x: p.x, z: p.z }; const used = new Set(), n = (s.cnt || 4) + (aw ? 2 : 0);
        for (let k = 0; k < n; k++) { const e = B.enemies.filter(q => !q.dead && !used.has(q) && Math.hypot(q.x - cur.x, q.z - cur.z) < 8).sort((a, b) => Math.hypot(a.x - cur.x, a.z - cur.z) - Math.hypot(b.x - cur.x, b.z - cur.z))[0]; if (!e) break; used.add(e);
          const from = { ...cur }; setTimeout(() => { if (!B) return; chainFx(from, e, c); dealDamage(p, e, dmg, { el, skill: true, stun: el === 'ice' ? .5 : 0 }); }, k * 80); cur = { x: e.x, z: e.z }; } sfx('zap'); } break; }
    case 'quake': { const n = (s.cnt || 5) + (aw ? 1 : 0); end = .3 + n * .1; for (let k = 0; k < n; k++) if (st > .15 + k * .09 && once('q' + k)) { const x = p.x + f * (1.4 + k * (s.step || 60) * PX * 1.2); pillar(x, p.z, c === p.h.fx && s.hk === 'rock' ? '#c8a878' : c, 3, .5, .7); burst(x, .3, p.z, s.hk === 'rock' ? '#b8a890' : c, 12, 5, .5, .35); aoeP(p, x, p.z, 1.3 * aoeM, dmg, { el, launch: true, knock: true, skill: true }); sfx('heavy'); } break; }
    case 'whirl': { const dur = (s.dur || 90) / 60 * (aw ? 1.5 : 1), r = (s.r || 120) * PX * aoeM; end = dur; const ax = axis(); p.vx = ax.x * p.S.spd * 60 * PX * .7; p.vz = ax.z * p.S.spd * 60 * PX * .5; if (Math.abs(ax.x) > .1) p.facing = Math.sign(ax.x);
      cs.tick -= dt; if (cs.tick <= 0) { cs.tick = .18; p.hitIds.clear(); meleeP(p, { reach: r, spin: true, dz: 1.8, dmg, el, kb: 2, skill: true, stop: .02 }); slash(p, 'spin', c, { s: r / 2.8, life: .2, follow: true, tilt: rand(-.2, .3) }); sfx('swing'); } p.poseKind = 'spin'; break; }
    case 'leap': { const r = (s.r || 150) * PX * aoeM; end = 1.1; if (once('j')) { p.vy = 11; p.y = .02; p.vx = f * (s.dist || 150) * PX / .78; }
      if (st > .2 && (p.y || 0) <= .001 && once('l')) { p.vx = 0; shockwave(p.x, p.z, r * 1.3, c); dust(p.x, p.z, 26, 2); W.shake = .5; sfx('boom'); aoeP(p, p.x, p.z, r, dmg, { el, knock: true, skill: true });
        setTimeout(() => { if (!B) return; shockwave(p.x, p.z, r * 1.8, c); aoeP(p, p.x, p.z, r * 1.5, dmg * .45, { el, noProc: true }); }, 250); } break; }
    case 'summon': { end = .6; if (st > .25 && once('a')) { const n = (s.cnt || 2) + (aw ? 1 : 0); for (let k = 0; k < n; k++) { const lk = SUMMON_LOOK[s.look] || SUMMON_LOOK.stone;
        const a = mkFighter(lk, { team: 'a', x: p.x + f * 1.5, z: clamp(p.z + (k - (n - 1) / 2) * 1.2, -4, 4), hp: p.S.maxhp * .5, maxhp: p.S.maxhp * .5, pow: dmg, spd: 5, reach: 2, life: s.dur * (aw ? 1.5 : 1), facing: f, mounted: s.look === 'qiang', horseCol: '#e8e0d0', summon: true });
        a.def = { range: 2 }; B.allies.push(a); pillar(a.x, a.z, p.h.fx, 5, .6, .7); } sfx('special'); } break; }
  }
  if (st > end) { setState(p, 'idle'); p.poseKind = null; }
}
function rainStrike(p, hk, x, z, dmg, el, c) {
  if (hk === 'bolt') { lightning(x, z, c); aoeP(p, x, z, 1.5, dmg, { el: 'bolt', knock: true, skill: true }); return; }
  const kind = hk === 'fire' ? 'fireball' : hk === 'ice' ? 'orb' : hk === 'rock' ? 'orb' : 'farrow', cc = hk === 'fire' ? '#ff7a2a' : hk === 'ice' ? '#9ae8ff' : hk === 'rock' ? '#a89878' : '#ffe0a0';
  fireProj({ kind, team: 'p', from: p, x: x - 2, y: 12, z, vx: 4, vy: -26, dmg, fall: true, c: cc, trail: hk === 'arrow' ? null : cc, s: kind === 'orb' ? .6 : .8,
    onLand: o => { burst(o.x, .3, o.z, cc, 12, 4, .4, .3); if (hk !== 'arrow') shockwave(o.x, o.z, 1.8, cc); aoeP(p, o.x, o.z, 1.4, o.dmg, { el, skill: true, knock: hk === 'rock' }); } });
}
function chainFx(a, e, c) {
  const pts = [], n = 8; for (let i = 0; i <= n; i++) { const k = i / n; pts.push(new T.Vector3(lerp(a.x, e.x, k) + (i && i < n ? rand(-.3, .3) : 0), 1.2 + (i && i < n ? rand(-.3, .3) : 0), lerp(a.z, e.z, k))); }
  const m = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(3), transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  const mesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, .05, 4), m);
  addFx(mesh, .25, (fx, u) => { m.opacity = 1 - u; }, m); setTimeout(() => mesh.geometry.dispose(), 400); burst(e.x, 1.2, e.z, c, 10, 4, .3, .25);
}
function auraTick(p, dt) {
  p.auraT -= dt; if (p.auraT > 0) return; p.auraT = 1;
  for (const s of HSK[p.h.id]) { if (s.ty !== 'aura') continue; const lv = effSkillLv(p.P, s, p.S); if (!lv) continue;
    if (s.aura === 'heal') { p.hp = Math.min(p.S.maxhp, p.hp + p.S.maxhp * (s.v + s.vr * (lv - 1)) / 100); if (B.escort && !B.escort.dead && !B.escort.lamp) B.escort.hp = Math.min(B.escort.maxhp, B.escort.hp + B.escort.maxhp * .004); }
    if (s.aura === 'mp') p.mp = Math.min(p.S.maxmp, p.mp + p.S.maxmp * (s.v + s.vr * (lv - 1)) / 100);
    if (s.aura === 'dmg') { const r = s.r * PX; for (const e of B.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < r) dealDamage(p, e, pOf(p, 'skill') * (s.d + s.dr * (lv - 1)), { el: s.el || 'phys', noProc: true, stop: 0 }); } }
}
/* 발동 효과 (procs) */
function runProcs(p, on, tgt) {
  const S = p.S; p.procCd = p.procCd || {};
  for (const pr of S.procs) { if (pr.on !== on) continue; const key = (pr.src || '') + pr.act + pr.on; if ((p.procCd[key] || 0) > W.t) continue;
    if (Math.random() * 100 >= pr.ch) continue; p.procCd[key] = W.t + (pr.cd ?? 20) / 60; doProc(p, pr, tgt); }
}
function doProc(p, pr, tgt) {
  const v = pr.v || 1, d = pOf(p, 'skill') * v, f = p.facing, x = tgt ? tgt.x : p.x + f * 2, z = tgt ? tgt.z : p.z;
  switch (pr.act) {
    case 'gwave': fireProj({ kind: 'dragon', team: 'p', from: p, x: p.x + f, z: p.z, vx: f * 14, dmg: d, pierce: true, knock: true, c: '#5dffa0', trail: '#5dffa0', noProc: true }); break;
    case 'nova': shockwave(p.x, p.z, 4, p.h.fx); aoeP(p, p.x, p.z, 3.2, d, { knock: true, stun: .6, noProc: true }); break;
    case 'stun': if (tgt && !tgt.boss && !tgt.dead) { tgt.stunT = v / 60; setState(tgt, 'stun'); } break;
    case 'buffAtk': p.buffs = p.buffs.filter(b => b.id !== 'proc' + pr.act); p.buffs.push({ id: 'proc' + pr.act, mods: { atkPct: v }, t: (pr.dur || 180) / 60 }); refreshStats(p); break;
    case 'drFor': p.buffs.push({ id: 'procdr' + W.t, mods: { dr: v }, t: (pr.dur || 180) / 60 }); refreshStats(p); break;
    case 'dragon': fireProj({ kind: 'dragon', team: 'p', from: p, x: p.x + f, z: p.z, vx: f * 15, dmg: d, pierce: true, knock: true, c: pr.col || '#bfe6ff', trail: pr.col || '#bfe6ff', noProc: true }); break;
    case 'heal': p.hp = Math.min(p.S.maxhp, p.hp + p.S.maxhp * v / 100); break;
    case 'shield': p.buf.shield = v / 60; UI.dmg(p.x, 2.8, p.z, '금강불괴', 'react'); break;
    case 'burn': if (tgt) { tgt.status.burn = 3; tgt.status.burnDps = pOf(p, 'skill') * .35; } break;
    case 'fireball': fireProj({ kind: 'fireball', team: 'p', from: p, x: p.x + f, z: p.z, vx: f * 12, dmg: d, el: 'fire', explode: 1.8, c: '#ff7a2a', trail: '#ff7a2a', noProc: true }); break;
    case 'freeMana': p.freeMana = true; break;
    case 'freeCast': p.freeCast = true; break;
    case 'bolt3': for (let k = 0; k < 3; k++) setTimeout(() => { if (!B) return; const e = tgt && !tgt.dead ? tgt : B.enemies.find(q => !q.dead); const xx = e ? e.x : x, zz = e ? e.z : z; lightning(xx, zz, '#c8a8ff'); aoeP(p, xx, zz, 1.4, d, { el: 'bolt', noProc: true }); }, k * 120); break;
    case 'star7': for (let k = 0; k < 7; k++) setTimeout(() => { if (!B) return; const xx = x + rand(-3, 3), zz = clamp(z + rand(-2, 2), -4, 4); lightning(xx, zz, '#ffe890'); aoeP(p, xx, zz, 1.4, d, { el: 'bolt', noProc: true }); }, k * 90); break;
    case 'redslash': slash(p, 'xcut', '#ff3a3a', { s: 1.3, life: .25 }); aoeP(p, p.x + f * 1.5, p.z, 2.2, d, { noProc: true }); break;
    case 'explode': if (tgt) { burst(tgt.x, 1, tgt.z, '#ff7a2a', 24, 6, .5, .4); shockwave(tgt.x, tgt.z, 3, '#ff7a2a'); aoeP(p, tgt.x, tgt.z, 2.2, d, { el: 'fire', noProc: true }); } break;
    case 'bonusDrop': if (tgt) dropLoot({ kind: 'gear', item: genItem(tgt.lv || B.lv, rollGrade('elite', p.S.mf)) }, tgt.x, tgt.z); break;
  }
}
/* 아이템 */
function useItem(p) {
  const k = INV_KEYS.filter(k => (p.P.inv[k] || 0) > 0)[p.P.sel % Math.max(1, INV_KEYS.filter(k => (p.P.inv[k] || 0) > 0).length)];
  if (!k) { UI.msg('사용할 아이템이 없습니다'); return; }
  p.P.inv[k]--; setState(p, 'item'); const f = p.facing; sfx('pick');
  switch (k) {
    case 'knife': fireProj({ kind: 'knife', team: 'p', from: p, x: p.x + f * .6, z: p.z, vx: f * 24, dmg: pOf(p, 'basic') * 1.4, r: .5 }); break;
    case 'bomb': fireProj({ kind: 'bomb', team: 'p', from: p, x: p.x + f * .5, y: 1.6, z: p.z, vx: f * 9, vy: 7, grav: 18, dmg: pOf(p, 'basic') * 3, r: .1 }); break;
    case 'wine': p.ki = Math.min(p.S.maxki, p.ki + 50); break;
    case 'elixir': p.hp = Math.min(p.S.maxhp, p.hp + p.S.maxhp * .6); pillar(p.x, p.z, '#9cf07a', 5, .8, .8); break;
    case 'tactic': p.buf.atk = 10; break; case 'haste': p.buf.haste = 10; break; case 'shield': p.buf.shield = 8; break;
    case 'tcharm': for (const e of B.enemies.filter(e => !e.dead && Math.abs(e.x - B.camX) < halfW() + 1)) { lightning(e.x, e.z, '#c8a8ff'); dealDamage(p, e, pOf(p, 'skill') * 2.5, { el: 'bolt', knock: true, noProc: true }); } break;
  }
  UI.dmg(p.x, 2.8, p.z, ITEMS[k].name, 'heal');
}
function swapItem(p) { const n = INV_KEYS.filter(k => (p.P.inv[k] || 0) > 0).length; p.P.sel = (p.P.sel + 1) % Math.max(1, n); sfx('ui'); }

/* ---------------- 전리품 ---------------- */
function dropLoot(d, x, z) {
  const hw = halfW(); x = clamp(x + rand(-.8, .8), B.camX - hw + 1, B.camX + hw - 1); z = clamp(z + rand(-.6, .6), -4, 4);
  const g = new T.Group(); g.position.set(x, 0, z); let c = '#ffd060';
  if (d.kind === 'gear') { c = GRADES[d.item.g].c; const m = new T.Mesh(geo('lootbox', () => new T.OctahedronGeometry(.22, 0)), toon(c, { emissive: c, ei: .5 })); m.position.y = .5; g.add(m);
    const pm = new T.MeshBasicMaterial({ color: col(c).multiplyScalar(1.6), transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
    const beam = new T.Mesh(geo('beam', () => { const q = new T.CylinderGeometry(.12, .3, 5, 12, 1, true); q.translate(0, 2.5, 0); return q; }), pm); beam.scale.y = .4 + GRADES[d.item.g].rank * .25; g.add(beam); d.beamMat = pm; }
  else if (d.kind === 'coin') { const m = new T.Mesh(geo('coin', () => { const q = new T.CylinderGeometry(.16, .16, .05, 14); q.rotateX(Math.PI / 2); return q; }), toon('#f2c64a', { emissive: '#f2a020', ei: .4 })); m.position.y = .35; g.add(m); }
  else if (d.kind === 'mat') { c = d.m === 'stone' ? '#8ad8ff' : '#e0a0ff'; const m = new T.Mesh(geo('mat', () => new T.IcosahedronGeometry(.16, 0)), toon(c, { emissive: c, ei: .6 })); m.position.y = .4; g.add(m); }
  else { const k = d.k, colr = { bun: '#fff4e2', chicken: '#c8742e', gold: '#f2c64a', silver: '#d8dce8', gem: '#bfe8ff' }[k] || '#c8a0ff';
    const m = new T.Mesh(geo('food' + (k === 'chicken' ? 'c' : 'b'), () => new T.SphereGeometry(k === 'chicken' ? .3 : .22, 14, 10)), toon(colr, k === 'gem' || k === 'gold' ? { emissive: colr, ei: .5 } : {})); m.position.y = .22; m.scale.y = .75; m.castShadow = true; g.add(m);
    if (d.kind === 'inv') { const lbl = new T.Mesh(geo('invring', () => { const q = new T.RingGeometry(.35, .45, 24); q.rotateX(-Math.PI / 2); return q; }), glowMat('#c8a0ff', 1.6, true)); lbl.position.y = .04; g.add(lbl); } }
  world.add(g); const L = { ...d, x, z, g, t: 0, vy: 4, y: .5 }; B.loot.push(L); if (d.kind === 'gear') UI.lootLabel(L); return L;
}
function updLoot(dt) {
  const p = B.p, pr = p.S.pickR * PX;
  for (let i = B.loot.length - 1; i >= 0; i--) { const L = B.loot[i]; L.t += dt;
    if (L.t < .5) { L.vy -= 20 * dt; L.y = Math.max(0, L.y + L.vy * dt); } L.g.position.set(L.x, L.y + Math.sin(L.t * 3) * .06, L.z); L.g.children[0].rotation.y += dt * 2;
    const dx = p.x - L.x, dz = p.z - L.z, dist = Math.hypot(dx, dz), magnet = B.clear || dist < pr;
    if (L.t > .4 && magnet && !p.dead) { const k = Math.min(1, dt * (B.clear ? 3 : 8)); L.x += dx * k; L.z += dz * k; }
    if (L.t > .4 && dist < .7 && !p.dead) { pickLoot(p, L); world.remove(L.g); if (L.beamMat) L.beamMat.dispose(); UI.removeLootLabel(L); B.loot.splice(i, 1); } }
}
function pickLoot(p, L) {
  const P = p.P, R = P.rpg;
  if (L.kind === 'gear') { const bagN = R.bag.filter(b => b.g === L.item.g).length; if (bagN >= 100) { const y = dismantleYield(L.item); R.mats.stone += y.stone; R.mats.frag += y.frag; UI.msg(`가방이 가득 차 자동 분해: ${L.item.n}`); }
    else { R.bag.push(L.item); UI.msg(`<img class="mi" src="${itemIcon(L.item)}" alt=""><span style="color:${GRADES[L.item.g].c}">${L.item.n}</span> 획득${canWear(P, L.item) ? '' : ' <span class="bad">(착용 불가)</span>'}`); } sfx('gear'); }
  else if (L.kind === 'coin') { R.gold += L.v; UI.dmg(p.x, 2.4, p.z, `+${L.v}`, 'gold'); sfx('pick'); }
  else if (L.kind === 'mat') { R.mats[L.m] += L.v; UI.dmg(p.x, 2.4, p.z, `${L.m === 'stone' ? '강화석' : '비급 조각'} +${L.v}`, 'heal'); sfx('pick'); }
  else if (L.kind === 'food') { const k = L.k, I = ITEMS[k];
    if (k === 'bun') p.hp = Math.min(p.S.maxhp, p.hp + 30); if (k === 'chicken') p.hp = Math.min(p.S.maxhp, p.hp + 70);
    if (k === 'gold') P.score += 1000; if (k === 'silver') P.score += 500; if (k === 'gem') P.score += 3000; UI.dmg(p.x, 2.4, p.z, `${I.name} ${I.msg}`, 'heal'); sfx('pick'); }
  else if (L.kind === 'inv') { const I = ITEMS[L.k]; P.inv[L.k] = Math.min(I.max, (P.inv[L.k] || 0) + I.n); UI.dmg(p.x, 2.4, p.z, `${I.name} +${I.n}`, 'heal'); UI.msg(`<img class="mi" src="${consIcon(L.k)}" alt="">${I.name} +${I.n}`); sfx('pick'); }
}

/* ---------------- 적 AI ---------------- */
function updEnemies(dt) {
  const p = B.p, D = DIFF(), tokCap = [2, 2, 3, 4][G.diffIdx];
  const melee = B.enemies.filter(e => !e.dead && !e.boss && !e.ranged && !e.banner && !e.flee && !e.cavalry).sort((a, b) => (Math.abs(a.x - p.x) - (a.token ? 3.2 : 0)) - (Math.abs(b.x - p.x) - (b.token ? 3.2 : 0)));
  melee.forEach((e, i) => { e.token = i < tokCap; e.slot = i; });
  for (const e of B.enemies) enemyTick(e, dt, D);
  /* 기수 사기 진작 */
  for (const e of B.enemies) if (e.banner && !e.dead) { e.rallyT = (e.rallyT || 0) - dt; if (e.rallyT <= 0) { e.rallyT = .5; for (const q of B.enemies) if (!q.dead && q !== e && Math.abs(q.x - e.x) < 250 * PX && Math.abs(q.z - e.z) < 100 * PX * 1.5) q.rally = .75; } }
}
function targetOf(e) { if (e.hunt && B.escort && !B.escort.dead) return B.escort; const ally = B.allies.filter(a => !a.dead && a.hp < 9000).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
  if (ally && Math.abs(ally.x - e.x) < Math.abs(B.p.x - e.x) * .6) return ally; return B.p; }
function enemyTick(e, dt, D) {
  e.st += dt; e.cool -= dt * (e.rally > 0 ? 1.4 : 1) * D.aggr; if (e.invuln > 0) e.invuln -= dt; if (e.rally > 0) e.rally -= dt; if (e.shieldBroken > 0) { e.shieldBroken -= dt; if (e.shieldBroken <= 0) e.shieldBroken = 0; }
  statusTick(e, dt); if (e.dead) { downTick(e, dt); return; }
  if (e.stunT > 0) { e.stunT -= dt; if (e.state !== 'down') { e.state = 'stun'; e.vx *= .8; } if (e.stunT <= 0 && e.state === 'stun') setState(e, 'idle'); return; }
  if (e.groggy > 0) { e.groggy -= dt; e.state = 'stun'; e.vx = 0; if (e.groggy <= 0) setState(e, 'idle'); return; }
  if (e.boss) { bossTick(e, dt, D); return; }
  const tg = targetOf(e), chill = e.status.chill > 0 ? .5 : 1, sp = e.spd * chill * (e.rally > 0 ? 1.15 : 1);
  if (e.elite && e.elite.includes('thunder')) { e.thT = (e.thT || 4) - dt; if (e.thT <= 0) { e.thT = 4; addHazard({ x: B.p.x, z: B.p.z, r: 1.4, delay: .8, owner: 'e', kind: 'bolt', dmg: e.pow * 1.2, c: '#b090ff', src: e }); } }
  switch (e.state) {
    case 'idle': case 'walk': case 'guard': case 'rally': {
      if (B.clear || tg.dead) { e.vx = e.vz = 0; e.state = 'idle'; break; }
      if (e.flee > 0) { e.state = 'flee'; break; }
      e.facing = tg.x > e.x ? 1 : -1; const side = e.x < tg.x ? -1 : 1; let tx, tz;
      if (e.ranged) { tx = tg.x + side * 6.5; tz = tg.z + (e.slot % 2 ? .3 : -.3); }
      else if (e.banner) { tx = tg.x + side * rand(220, 330) * PX; tz = tg.z * .5; }
      else if (e.cavalry) { tx = tg.x + side * 7; tz = e.z; }
      else if (e.token || tg !== B.p) { tx = tg.x + side * e.reach * .8; tz = tg.z; }
      else { const k = e.slot || 0; tx = tg.x + side * (165 + (k % 3) * 42) * PX; tz = clamp(tg.z + (k % 2 ? 1 : -1) * 46 * PX * 1.4 + Math.sin(W.t + k) * .3, -4, 4); }
      const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
      if (d > .3) { e.vx = dx / d * sp; e.vz = dz / d * sp * .7; e.state = e.banner ? 'rally' : 'walk'; e.walkP += dt * sp * 2.4; } else { e.vx = e.vz = 0; e.state = e.banner ? 'rally' : 'idle'; }
      e.shieldUp = e.shield && !e.shieldBroken;
      if (e.cool <= 0 && tg.state !== 'down') { const adx = Math.abs(tg.x - e.x), adz = Math.abs(tg.z - e.z);
        if (e.ranged) { if (adz < 1 && adx < 12) { setState(e, 'eshoot'); e.vx = e.vz = 0; } }
        else if (e.cavalry) { setState(e, 'charge'); e.chDir = tg.x > e.x ? 1 : -1; e.chZ = tg.z; e.vx = e.vz = 0; addLane(e.chZ, 44 / 60); }
        else if (!e.banner && (e.token || tg !== B.p) && adx < e.reach + .3 && adz < .75) { setState(e, 'eatk'); e.combo = e.etype === 'sp' ? 2 : 0; e.pose = e.combo; e.atkDur = e.officer ? 1.1 : .95; e.windFrac = .55; e.hitIds.clear(); e.vx = e.vz = 0; } }
      break; }
    case 'flee': e.flee -= dt; e.facing = e.x > B.p.x ? 1 : -1; e.vx = e.facing * e.spd * 1.3; e.vz = 0; e.walkP += dt * 10; e.state = 'flee';
      if (Math.abs(e.x - B.camX) > halfW() + 2) { e.dead = true; e.remove = true; e.fledHalf = true; gainExp(B.p, Math.round((e.exp || 10) * expScale(e.lv) * .5)); } if (e.flee <= 0) setState(e, 'idle'); break;
    case 'eatk': { e.vx *= Math.exp(-dt * 8); const u = e.st / e.atkDur;
      if (!e.didSwing && u >= e.windFrac) { e.didSwing = true; sfx('swing'); slash(e, e.combo === 2 ? 'thrust' : 'chop', e.elite ? '#ffb040' : '#ff6a4a', { s: e.reach / 2.4, life: .22 }); enemyMelee(e, e.reach + .3, e.pow * (e.rally > 0 ? 1.25 : 1), e.officer); }
      if (u >= 1) { setState(e, 'idle'); e.cool = rand(1, 2.2) * (e.cdMul || 1); } break; }
    case 'eshoot': e.vx = e.vz = 0; if (!e.didSwing && e.st > .6) { e.didSwing = true; fireProj({ kind: 'arrow', team: 'e', from: e, x: e.x + e.facing * .6, y: 1.35, z: e.z, vx: e.facing * 15, vz: clamp((B.p.z - e.z) * .8, -1.5, 1.5), dmg: e.pow, r: .5 }); sfx('shoot'); }
      if (e.st > 1) { setState(e, 'idle'); e.cool = rand(1.8, 3.2) * (e.cdMul || 1); } break;
    case 'charge': if (e.st < 44 / 60) { e.z = lerp(e.z, e.chZ, dt * 6); e.facing = e.chDir; }
      else { e.vx = e.chDir * 10 * 60 * PX; e.vz = 0; e.walkP += dt * 14; if (Math.random() < .5) dust(e.x, e.z, 2, 1.2); enemyMelee(e, 1.6, e.pow * 1.5, true, true);
        if (Math.abs(e.x - B.camX) > halfW() + 1.5 || e.st > 3) { e.chDir = -e.chDir; setState(e, 'idle'); e.cool = rand(220, 340) / 60 / D.aggr; e.hitIds.clear(); } } break;
    case 'hurt': e.vx *= Math.exp(-dt * 7); e.vz = 0; if (e.st > .38) setState(e, 'idle'); break;
    case 'stun': e.vx = 0; if (e.st > .6) setState(e, 'idle'); break;
    case 'down': downTick(e, dt); break;
    case 'getup': e.vx = 0; if (e.st > .45) { setState(e, 'idle'); e.invuln = .3; e.cool = Math.max(e.cool, .5); } break;
  }
}
function enemyMelee(e, reach, dmg, knock, once) {
  for (const t of enemyTargetsAll()) { if (t.dead || e.hitIds.has(t)) continue; const rx = (t.x - e.x) * e.facing;
    if (rx > -.8 && rx < reach * (e.scale || 1) && Math.abs(t.z - e.z) < .95 * (e.scale || 1) && Math.abs((t.y || 0) - (e.y || 0)) < 1.8) { e.hitIds.add(t); hurtTarget(t, e, dmg, { knock, dir: e.facing, threat: true }); } }
  for (const a of B.allies) { if (a.dead || e.hitIds.has(a) || a.hp > 9000) continue; const rx = (a.x - e.x) * e.facing; if (rx > -.5 && rx < reach && Math.abs(a.z - e.z) < 1) { e.hitIds.add(a); a.hp -= dmg; flashF(a); if (a.hp <= 0) { a.dead = true; knockdown(a, e.facing, 3); } } }
}
function addLane(z, life) {
  const m = new T.MeshBasicMaterial({ color: col('#ff3a2a').multiplyScalar(1.4), transparent: true, opacity: .4, depthWrite: false });
  const mesh = new T.Mesh(geo('lane', () => { const g = new T.PlaneGeometry(1, 1.2); g.rotateX(-Math.PI / 2); return g; }), m); mesh.position.set(B.camX, .05, z); mesh.scale.x = halfW() * 2 + 4;
  addFx(mesh, life + .3, (fx, u) => { m.opacity = .2 + .3 * Math.abs(Math.sin(fx.t * 20)); }, m);
}
function statusTick(e, dt) {
  const s = e.status;
  if (s.burn > 0) { s.burn -= dt; s.bt = (s.bt || 0) - dt; if (s.bt <= 0) { s.bt = 1 / 3; const d = Math.max(1, Math.round((s.burnDps || 2) / 3)); e.hp -= d; UI.dmg(e.x, 2, e.z, String(d), 'burn'); if (e.hp <= 0 && !e.dead) killEnemy(e, B.p, e.facing, {}); } if (Math.random() < .3) PA.emit(e.x + rand(-.3, .3), rand(.5, 1.8) * e.scale, e.z, 0, 1.5, 0, .5, .3, tmpC.set('#ff7a2a'), 0, 0, 2); }
  if (s.chill > 0) { s.chill -= dt; if (Math.random() < .2) PA.emit(e.x + rand(-.3, .3), rand(.3, 1.8), e.z, 0, .5, 0, .6, .15, tmpC.set('#bfefff'), 0, 0, 1.6); }
  if (s.shock > 0) { s.shock -= dt; if (Math.random() < .15) PA.emit(e.x + rand(-.4, .4), rand(.5, 1.8), e.z, rand(-2, 2), rand(-2, 2), 0, .12, .2, tmpC.set('#c8a8ff'), 0, 0, 3); }
}
function downTick(f, dt) {
  if (!f.downLand) return; f.vx *= Math.exp(-dt * 6);
  if (f.dead) { f.deathT += dt; if (f.team !== 'p' && f.deathT > .55) { const k = clamp((f.deathT - .55) / .5, 0, 1); f.root.scale.setScalar(f.scale * (1 - k * .92));
      for (let i = 0; i < 3; i++) PA.emit(f.x + rand(-.6, .6), rand(.1, .6), f.z + rand(-.4, .4), rand(-.3, .3), rand(1.5, 3), rand(-.3, .3), rand(.5, .9), rand(.12, .3), tmpC.set(f.boss ? '#ffd24a' : '#ff9a70'), 0, 1, 1.8);
      if (k >= 1) f.remove = true; } }
  else if (f.st > (f.team === 'p' ? .6 : .9)) setState(f, 'getup');
}
function physics(f, dt) {
  f.x += f.vx * dt; f.z += f.vz * dt;
  if ((f.y || 0) > 0 || f.vy > 0) { f.vy -= 28 * dt; f.y = (f.y || 0) + f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; onLand(f); } }
  f.z = clamp(f.z, -4.3, 4.3);
}
function onLand(f) {
  if (f.state === 'down') { f.downLand = true; f.st = 0; f.vx *= .35; dust(f.x, f.z, f.boss ? 16 : 8, f.boss ? 1.6 : 1); W.shake = Math.max(W.shake, f.boss ? .3 : .08); }
  else if (f.state === 'jump') { setState(f, 'idle'); f.airAtk = false; dust(f.x, f.z, 4, .6); }
}
/* ---------------- 보스 ---------------- */
function bossTick(e, dt, D) {
  const p = B.p;
  if (e.mid) B.midT += dt;
  if (e.phases && !e.mid) { const nx = e.phases[e.phaseI + 1]; if (nx && e.hp <= e.maxhp * nx.hp && e.state !== 'down') bossPhase(e, e.phaseI + 1); }
  if (e.pray) { e.prayT -= dt; if (e.praying && e.prayT > 0) { e.hp = Math.min(e.maxhp, e.hp + e.maxhp * .004 * dt * 10); if (Math.random() < .3) PA.emit(e.x + rand(-1, 1), rand(0, 3), e.z, 0, 2, 0, .8, .3, tmpC.set('#ffe070'), 0, 0, 2); } else { e.pray = false; e.praying = false; } }
  if (e.counterT > 0) e.counterT -= dt;
  switch (e.state) {
    case 'idle': case 'walk': {
      if (B.clear || p.dead) { e.vx = e.vz = 0; e.state = 'idle'; break; }
      e.facing = p.x > e.x ? 1 : -1; const side = e.x < p.x ? -1 : 1, tx = p.x + side * e.reach * .7, tz = p.z, dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz), sp = e.spd * (e.mounted ? 1.3 : 1) * (e.status.chill > 0 ? .5 : 1);
      if (d > .3) { e.vx = dx / d * sp; e.vz = dz / d * sp * .7; e.state = 'walk'; e.walkP += dt * sp * 2.4; } else { e.vx = e.vz = 0; e.state = 'idle'; }
      e.mcool = (e.mcool || 1.5) - dt * D.aggr;
      if (e.cool <= 0) { const sk = e.seq[e.seqI % e.seq.length]; e.seqI++; bossSkill(e, sk); e.cool = (e.phaseI > 0 ? 160 + rand(0, 60) : 240 + rand(0, 60)) / 60 / D.aggr * (e.mid ? .7 : 1); }
      else if (e.mcool <= 0 && Math.abs(p.x - e.x) < e.reach + .5 && Math.abs(p.z - e.z) < 1) { e.mcool = rand(1.4, 2.4); bossSkill(e, 'melee'); }
      break; }
    case 'skill': bossSkillTick(e, dt); break;
    case 'hurt': e.vx *= .9; if (e.st > .3) setState(e, 'idle'); break;
    case 'down': downTick(e, dt); break;
    case 'getup': if (e.st > .45) { setState(e, 'idle'); e.invuln = .5; } break;
    case 'stun': e.vx = 0; if (e.st > 1.2 && e.groggy <= 0) setState(e, 'idle'); break;
    default: setState(e, 'idle');
  }
}
function bossPhase(e, i) {
  e.phaseI = i; const ph = e.phases[i]; e.seq = ph.seq; e.seqI = 0; e.poise = 0; e.invuln = 70 / 60; setState(e, 'idle'); e.cool = 1.2;
  if (ph.line) queueTalk({ talk: [[e.name, ph.line.replace(/"/g, '')]] });
  UI.msg(`${e.name} — 제${i + 1}국면`); W.flash = .35; shockwave(e.x, e.z, 5, e.elem);
  if (ph.enter === 'mount') { mountHorse(e, e.name === '여포' ? '#8a1a10' : '#4a3a2a'); UI.msg(`${e.name}이(가) 말에 올랐다!`); }
  if (ph.enter === 'dismount') dismount(e);
  if (ph.enter === 'barrier') { e.barrier = true; for (let k = 0; k < 3; k++) makeTotem(e, B.camX + (k - 1) * halfW() * .6, k === 1 ? -3.2 : 3); }
  if (ph.enter === 'decoy') makeDecoys(e);
}
function makeTotem(owner, x, z) {
  const g = new T.Group(); g.position.set(x, 0, z);
  const m = new T.Mesh(geo('totem', () => new T.CylinderGeometry(.25, .3, 2.6, 8)), toon('#e8c020', { emissive: '#d070ff', ei: .5 })); m.position.y = 1.3; m.castShadow = true; g.add(m);
  const s = new T.Mesh(geo('totemmark', () => new T.PlaneGeometry(.4, 1.4)), new T.MeshBasicMaterial({ map: charTex('符', '#f0e0a0', '#a01a10', 128, 384) })); s.position.set(0, 1.5, .31); g.add(s);
  world.add(g); B.props.push({ kind: 'totem', g, x, z, hp: 5, owner });
}
function makeDecoys(e) {
  for (let k = 0; k < 2; k++) { const d = mkFighter(e.look, { team: 'e', decoy: true, boss: true, mid: true, name: e.name, lv: e.lv, maxhp: 1, hp: 1, pow: e.pow * .5, spd: e.spd, reach: e.reach, exp: 0, score: 0, poiseMax: 9999, seq: ['wave', 'dash'], seqI: k, x: e.x + (k ? 3 : -3), z: clamp(e.z + (k ? 2 : -2), -4, 4) });
    d.hp = 1; d.cool = 1 + k; B.enemies.push(d); dust(d.x, d.z, 16, 1.5, 0xc8c8d0); }
}
function bossSkill(e, sk) {
  if (sk === 'ult') { const U = BOSS_ULT[e.name]; if (U) { UI.cutin(U.hz, U.n, e.name, U.col); W.slow = .5; shout(e.name, U.n); } }
  if (sk === 'summon' && B.enemies.filter(q => !q.dead).length >= 7) sk = 'wave';
  setState(e, 'skill'); e.skill = sk; e.sk = {}; e.hitIds.clear(); e.vx = e.vz = 0; e.facing = B.p.x > e.x ? 1 : -1;
  e.poseKind = { dash: 'dash', charge3: 'dash', slam: 'slam', grab: 'melee', wave: 'wave', melee: 'melee', counter: 'counter', pray: 'pray', roar: 'raise' }[sk] || 'raise';
}
function bossSkillTick(e, dt) {
  const p = B.p, st = e.st, sk = e.sk, pw = e.pow, c = e.elem, sc = e.scale;
  const done = cd => { setState(e, 'idle'); if (cd != null) e.mcool = cd; e.poseKind = null; };
  switch (e.skill) {
    case 'melee':
      if (!sk.a && st > .42) { sk.a = 1; slash(e, 'chop', c, { s: 1 }); sfx('swing'); e.hitIds.clear(); enemyMelee(e, e.reach + .3, pw, false); e.vx = e.facing * 2; }
      if (!sk.b && st > 1) { sk.b = 1; slash(e, 'sweep', c, { s: 1.1 }); sfx('heavy'); e.hitIds.clear(); enemyMelee(e, e.reach + .6, pw * 1.2, true); }
      if (st > 1.45) done(rand(1, 2)); break;
    case 'dash':
      if (!sk.t) { sk.t = 1; sk.dir = e.facing; sk.z = p.z; addLane(sk.z, 32 / 60); }
      if (st < 32 / 60) e.z = lerp(e.z, sk.z, dt * 8);
      else if (st < 32 / 60 + 50 / 60) { e.vx = sk.dir * 11.5 * 60 * PX; if (!sk.s) { sk.s = 1; sfx('heavy'); slash(e, 'thrust', c, { s: 1.3, follow: true, life: .6 }); } enemyMelee(e, 1.8, pw * 1.4, true); if (Math.random() < .5) dust(e.x, e.z, 2, 1.2);
        if (Math.abs(e.x - B.camX) > halfW() - .5 && Math.sign(e.x - B.camX) === sk.dir) e.vx = 0; }
      else { e.vx *= .8; if (st > 1.6) done(); } break;
    case 'charge3': {
      const k = Math.floor(st / 1.5), t = st - k * 1.5; if (k >= 3) { done(); e.vx = 0; break; }
      if (!sk['c' + k]) { sk['c' + k] = 1; sk.dir = k % 2 ? -1 : 1; sk.z = p.z; e.x = sk.dir > 0 ? B.camX - halfW() - 1 : B.camX + halfW() + 1; e.z = sk.z; e.facing = sk.dir; addLane(sk.z, 28 / 60); e.hitIds.clear(); }
      if (t > 28 / 60) { e.vx = sk.dir * 17 * 60 * PX; enemyMelee(e, 1.8, pw * 1.5, true); if (Math.random() < .6) dust(e.x, e.z, 2, 1.3); } else e.vx = 0; break; }
    case 'wave': if (!sk.w && st > .45) { sk.w = 1; fireProj({ kind: 'qi', team: 'e', from: e, x: e.x + e.facing * 1.2, y: 1.2 * sc * .9, z: e.z, vx: e.facing * 8.5 * 60 * PX, dmg: pw * 1.2, knock: true, pierce: true, c, trail: c, s: 1.1 * sc, r: 1, rz: 1.1 }); sfx('heavy'); }
      if (st > 1) done(); break;
    case 'slam':
      if (!sk.j) { sk.j = 1; sk.tx = p.x; sk.tz = p.z; addHazard({ x: sk.tx, z: sk.tz, r: 160 * PX, delay: 62 / 60, owner: 'e', kind: 'slam', dmg: pw * 1.3, c: '#ff4a3a', src: e }); e.vy = 13; e.y = .02; e.vx = (sk.tx - e.x) / .93; e.vz = (sk.tz - e.z) / .93; }
      if (!sk.l && st > .3 && (e.y || 0) <= 0) { sk.l = 1; sk.lt = st; e.vx = e.vz = 0; }
      if (sk.l && st - sk.lt > .6 || st > 3) done(); break;
    case 'bolt':
      if (!sk.a) { sk.a = 1; dust(e.x, e.z, 14, 1.2, 0xc8b0ff); e.x = clamp(p.x + rand(-5, 5), B.camX - halfW() + 1, B.camX + halfW() - 1); e.z = clamp(p.z + rand(-2, 2), -4, 4); burst(e.x, 1.5, e.z, c, 20, 4, .5, .3); }
      for (let k = 0; k < 3; k++) if (st > .3 + k * .45 && !sk['b' + k]) { sk['b' + k] = 1; addHazard({ x: p.x, z: p.z, r: 1.5, delay: 42 / 60, owner: 'e', kind: 'bolt', dmg: pw * 1.3, c, src: e }); }
      if (st > 2) done(); break;
    case 'orb': if (!sk.o && st > .4) { sk.o = 1; for (let k = 0; k < 3; k++) fireProj({ kind: 'orb', team: 'e', from: e, x: e.x + e.facing, y: 1.4, z: e.z + (k - 1) * 1.2, vx: e.facing * 4, vz: (k - 1) * 1.2, homing: true, maxV: 6, dmg: pw, knock: false, c, trail: c, s: .8, life: 4, r: .7, rz: .7 }); sfx('zap'); } if (st > 1) done(); break;
    case 'summon': if (!sk.s && st > .6) { sk.s = 1; const n = Math.min(3, 7 - B.enemies.filter(q => !q.dead).length); for (let k = 0; k < n; k++) B.spawnQ.push({ kind: k === 2 && B.lv > 10 ? 'a' : 's', t: k * .3, side: k % 2 ? 1 : -1 }); shockwave(e.x, e.z, 3, c); sfx('special'); } if (st > 1.2) done(); break;
    case 'grab':
      if (!sk.w) { sk.w = 1; addHazard({ x: e.x + e.facing * 1.4, z: e.z, r: 1.3, delay: 28 / 60, owner: 'x', kind: 'none', dmg: 0, c: '#ff4a3a' }); }
      if (!sk.g && st > 28 / 60) { sk.g = 1; e.vx = e.facing * 8; const rx = (p.x - e.x) * e.facing;
        if (rx > -.3 && rx < 2.2 && Math.abs(p.z - e.z) < 1 && !p.dead && p.invuln <= 0 && p.state !== 'down') { setState(p, 'grabbed'); p.mash = 0; sk.caught = 1; sk.ct = st; UI.msg('붙잡혔다! 공격 키를 연타하라!'); } }
      if (sk.g) e.vx *= .85;
      if (sk.caught) { p.x = e.x + e.facing * 1.1; p.z = e.z; p.y = 1.2;
        if (p.mash >= 8) { setState(p, 'jump'); p.vy = 6; p.vx = -e.facing * 4; sk.caught = 0; e.groggy = 80 / 60; setState(e, 'stun'); UI.dmg(e.x, 3, e.z, '탈출!', 'react'); p.invuln = 1; break; }
        if (st - sk.ct > 100 / 60) { sk.caught = 0; p.y = .5; setState(p, 'idle'); shockwave(p.x, p.z, 3, c); W.shake = .6; sfx('boom'); hurtTarget(p, e, pw * 2.2, { knock: true, dir: e.facing }); done(); } break; }
      if (st > 1.2) done(); break;
    case 'lanes': if (!sk.l) { sk.l = 1; const zs = [-3, 0, 3].sort(() => Math.random() - .5); zs.forEach((z, k) => setTimeout(() => { if (!B || B.clear) return; addLane(z, 44 / 60); const r = spawnEnemy('cv', k % 2 ? -1 : 1, { z, noElite: true }); r.cool = 0; r.lane = true; r.x = k % 2 ? B.camX + halfW() + 1 : B.camX - halfW() - 1; setState(r, 'charge'); r.chDir = k % 2 ? -1 : 1; r.chZ = z; r.pow = e.pow * 1.3 / 1.5; r.exp = 0; }, k * 400)); } if (st > 1.4) done(); break;
    case 'roar': if (!sk.r && st > .4) { sk.r = 1; shockwave(e.x, e.z, 300 * PX, '#8ab8ff'); W.shake = .5; sfx('boom'); if (Math.hypot(p.x - e.x, p.z - e.z) < 300 * PX && p.invuln <= 0) { p.fear = 80 / 60; UI.dmg(p.x, 2.8, p.z, '공포', 'hurt'); } } if (st > 1.1) done(); break;
    case 'pray': if (!sk.p) { sk.p = 1; e.pray = true; e.praying = true; e.prayT = 150 / 60; e.prayStart = e.dmgTaken || 0; UI.msg('장각이 태평 기도를 올린다 — 때려서 끊어라!'); } if (st > 2.6 || !e.praying) { e.praying = false; done(); } break;
    case 'counter': if (!sk.c) { sk.c = 1; e.counterT = 56 / 60; UI.dmg(e.x, 3, e.z, '반격 태세!', 'react'); } if (st > 56 / 60 + .1) done(); break;
    case 'counterhit': if (!sk.h && st > .15) { sk.h = 1; slash(e, 'spin', c, { s: 1.6, life: .3 }); sfx('heavy'); for (const t of enemyTargetsAll()) if (Math.hypot(t.x - e.x, t.z - e.z) < 170 * PX) hurtTarget(t, e, e.pow * 1.8, { knock: true, dir: Math.sign(t.x - e.x) || 1 }); } if (st > .6) done(); break;
    case 'illusion': if (!sk.i && st > .4) { sk.i = 1; for (let k = 0; k < 3; k++) { const x = B.camX + (k - 1) * halfW() * .7, z = k === 1 ? -3 : 3; burst(x, 1.5, z, c, 20, 3, .6, .3); for (let j = 0; j < 3; j++) setTimeout(() => { if (!B) return; fireProj({ kind: 'orb', team: 'e', from: e, x, y: 1.4, z, vx: Math.sign(B.p.x - x) * 5, vz: (B.p.z - z) * .4, homing: true, maxV: 6, dmg: pw, c, trail: c, s: .7, life: 3.5, r: .7 }); }, j * 220); } sfx('zap'); } if (st > 1.4) done(); break;
    case 'volley': if (!sk.v && st > .4) { sk.v = 1; for (let k = 0; k < 6; k++) addHazard({ x: clamp(p.x + rand(-2.5, 2.5), B.camX - halfW() + 1, B.camX + halfW() - 1), z: clamp(p.z + rand(-1.5, 1.5), -4, 4), r: 1.2, delay: .8 + k * .08, owner: 'e', kind: 'arrow', dmg: pw * .9, src: e }); sfx('shoot'); } if (st > 1.2) done(); break;
    case 'decoy': if (!sk.d) { sk.d = 1; makeDecoys(e); } if (st > .8) done(); break;
    case 'ult': bossUlt(e, st, sk, dt); break;
    default: done();
  }
}
function bossCounter(e) { setState(e, 'skill'); e.skill = 'counterhit'; e.sk = {}; e.poseKind = 'melee'; }
function bossUlt(e, st, sk, dt) {
  const U = BOSS_ULT[e.name] || { ty: 'musou', col: e.elem }, pw = e.pow, c = U.col, p = B.p, hw = halfW();
  const done = () => { setState(e, 'idle'); e.poseKind = null; };
  switch (U.ty) {
    case 'thunder': if (!sk.a && st > .5) { sk.a = 1; addHazard({ x: p.x, z: p.z, r: 1.8, delay: .7, owner: 'e', kind: 'bolt', dmg: pw * 1.4, c, src: e }); for (let k = 0; k < 4; k++) addHazard({ x: B.camX + rand(-hw, hw), z: rand(-3.5, 3.5), r: 1.6, delay: .9 + k * .15, owner: 'e', kind: 'bolt', dmg: pw * 1.2, c, src: e }); } if (st > 2.2) done(); break;
    case 'musou': case 'charge': { const n = U.ty === 'musou' ? 4 : 3, k = Math.floor(st / .9), t = st - k * .9; e.poseKind = 'dash';
      if (k >= n) { if (!sk.f) { sk.f = 1; e.poseKind = 'wave'; slash(e, 'xcut', c, { s: 2.2, life: .4 }); for (const tt of enemyTargetsAll()) if (Math.abs(tt.x - e.x) < 5) hurtTarget(tt, e, pw * 1.2, { knock: true, dir: Math.sign(tt.x - e.x) || 1 }); W.shake = .5; } if (st > n * .9 + .6) done(); break; }
      if (!sk['k' + k]) { sk['k' + k] = 1; sk.dir = p.x > e.x ? 1 : -1; e.facing = sk.dir; sk.z = p.z; addLane(sk.z, .3); e.hitIds.clear(); }
      if (t > .3) { e.z = lerp(e.z, sk.z, dt * 10); e.vx = sk.dir * 22; enemyMelee(e, 1.8, pw * 1.5, true); if (U.ty === 'charge' && t > .6 && !sk['w' + k]) { sk['w' + k] = 1; fireProj({ kind: 'qi', team: 'e', from: e, x: e.x, y: 1.2, z: e.z, vx: -sk.dir * 14, dmg: pw, knock: true, pierce: true, c, trail: c, s: 1.1, r: 1 }); } } else e.vx = 0;
      if (Math.abs(e.x - B.camX) > hw) e.x = B.camX + Math.sign(e.x - B.camX) * hw; break; }
    case 'quake': if (!sk.j) { sk.j = 1; e.vy = 14; e.y = .02; e.vx = (p.x - e.x) / 1; } if (!sk.l && st > .3 && (e.y || 0) <= 0) { sk.l = 1; e.vx = 0; W.shake = 1; sfx('boom'); shockwave(e.x, e.z, 12, c); for (let k = 0; k < 10; k++) addHazard({ x: B.camX + rand(-hw, hw), z: rand(-3.8, 3.8), r: 1.4, delay: .5 + k * .08, owner: 'e', kind: 'rock', dmg: pw * 1.3, src: e }); for (const t of enemyTargetsAll()) if (Math.hypot(t.x - e.x, t.z - e.z) < 5) hurtTarget(t, e, pw * 1.6, { knock: true, dir: Math.sign(t.x - e.x) || 1 }); } if (st > 2.4) done(); break;
    case 'summon': if (!sk.s && st > .5) { sk.s = 1; for (let k = 0; k < 4; k++) { const s2 = spawnEnemy(k < 2 ? 'o' : 'sh', k % 2 ? 1 : -1); s2.exp *= .5; } shockwave(e.x, e.z, 6, c); W.shake = .5; sfx('boom'); for (let k = 0; k < 6; k++) addHazard({ x: B.camX + rand(-hw, hw), z: rand(-3.5, 3.5), r: 1.4, delay: .8 + k * .12, owner: 'e', kind: 'arrow', dmg: pw, src: e }); } if (st > 1.8) done(); break;
    case 'arrows': if (st > .4 && st < 2) { sk.t = (sk.t || 0) - dt; if (sk.t <= 0) { sk.t = .12; addHazard({ x: clamp(p.x + rand(-3, 3), B.camX - hw + 1, B.camX + hw - 1), z: clamp(p.z + rand(-2, 2), -4, 4), r: 1.2, delay: .6, owner: 'e', kind: 'arrow', dmg: pw, src: e }); } } if (st > 2.6) done(); break;
    case 'orbs': if (!sk.a && st > .4) { sk.a = 1; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; fireProj({ kind: 'orb', team: 'e', from: e, x: e.x, y: 1.4, z: e.z, vx: Math.cos(a) * 5, vz: Math.sin(a) * 2.5, homing: k % 2 === 0, maxV: 5, dmg: pw, c, trail: c, s: .8, life: 4, r: .7 }); } for (let k = 0; k < 4; k++) addHazard({ x: p.x + rand(-3, 3), z: clamp(p.z + rand(-2, 2), -4, 4), r: 1.6, delay: 1 + k * .2, owner: 'e', kind: 'bolt', dmg: pw * 1.2, c, src: e }); sfx('zap'); } if (st > 2.2) done(); break;
    default: done();
  }
}
function onBossDeath(b) {
  W.slow = 1.6; W.shake = .6; W.flash = .8; burst(b.x, 1.5, b.z, b.elem, 80, 8, 1.2, .4, 3);
  for (const e of B.enemies) if (!e.dead) { e.hp = 0; e.dead = true; knockdown(e, Math.sign(e.x - b.x) || 1, 5); }
  B.spawnQ = []; B.clear = 3; B.clearT = 0; B.lock = null; bgmMode = 'camp';
  const S = B.S; if (S.boss && S.boss.name === '여포' && B.bossT <= 60) giveTreasure('horse');
  const secs = B.t, bonus = Math.max(0, Math.round((600 - secs) * 20 * DIFF().score)); B.timeBonus = bonus; B.p.P.score += bonus;
  if (B.escort && !B.escort.dead && !B.escort.lamp) { const g = 600 * (ORDER.indexOf(B.si) + 1) * (1 + G.cycle); G.pl.rpg.gold += g; UI.msg(`미부인과 아두를 지켜냈다! 금화 +${g}`); }
  if (B.escort && B.escort.lamp) G.lampSaved = !B.escort.dead;
  UI.banner('승리', `${S.title.replace(/\s+/g, ' ')} 평정`, `시간 보너스 +${bonus.toLocaleString('ko-KR')} · 최대 콤보 ${B.maxCombo}`, 4, 'win'); sfx('win');
}
function playerDeath(p) {
  if (B.lives > 0) { B.lives--; p.dead = false; p.hp = p.S.maxhp; p.deathT = 0; setState(p, 'idle'); p.invuln = 3; p.y = 0;
    shockwave(p.x, p.z, 7, p.h.fx); burst(p.x, 1, p.z, p.h.fx, 60, 6, .9, .4, 3); sfx('special'); W.flash = .6;
    for (const e of B.enemies) if (!e.dead && Math.abs(e.x - p.x) < 9) { if (e.boss) e.invuln = .5; else knockdown(e, Math.sign(e.x - p.x) || 1, 6); } return; }
  if (!B.failT) { B.failT = .01; const lost = Math.round(G.pl.rpg.gold * .1); G.pl.rpg.gold -= lost; B.failMsg = `패전… 군영으로 후퇴했다. (금화 -${lost})`; UI.banner('패퇴', '군영으로 후퇴한다', `금화 -${lost} · 경험치와 장비는 유지된다`, 3.2, 'boss'); }
}

/* ---------------- 아군(소환 · 원군) ---------------- */
function updAllies(dt) {
  for (const a of B.allies) {
    a.st += dt; if (a.life != null) { a.life -= dt; if (a.life <= 0 && !a.dead) { a.dead = true; a.remove = true; burst(a.x, 1, a.z, '#ffffff', 16, 3, .5, .3); } }
    if (a.dead) { if (a.state === 'down') downTick(a, dt); else a.remove = true; physics(a, dt); pose(a, dt); continue; }
    const tg = B.enemies.filter(e => !e.dead).sort((q, r) => Math.abs(q.x - a.x) - Math.abs(r.x - a.x))[0];
    if (a.state === 'eatk') { const u = a.st / .7; if (!a.didSwing && u > .5) { a.didSwing = true; slash(a, 'chop', '#ffe8a0', { s: .9, life: .2 }); sfx('swing');
        for (const e of B.enemies) if (!e.dead && (e.x - a.x) * a.facing > -.5 && (e.x - a.x) * a.facing < (a.reach || 2.4) && Math.abs(e.z - a.z) < 1) dealDamage(B.p, e, a.pow, { noProc: true, knock: Math.random() < .3 }); }
      if (u >= 1) { setState(a, 'idle'); a.cool = rand(.5, 1); } }
    else if (tg) { a.facing = tg.x > a.x ? 1 : -1; const dx = tg.x - a.facing * 1.6 - a.x, dz = tg.z - a.z, d = Math.hypot(dx, dz); a.cool -= dt;
      if (d > .4) { a.vx = dx / d * a.spd; a.vz = dz / d * a.spd * .7; a.state = 'walk'; a.walkP += dt * 10; } else { a.vx = a.vz = 0; a.state = 'idle'; if (a.cool <= 0) { setState(a, 'eatk'); a.pose = 0; a.combo = 0; a.atkDur = .7; a.windFrac = .5; } } }
    else { const dx = B.p.x - a.facing * 2 - a.x; a.vx = Math.abs(dx) > .5 ? Math.sign(dx) * a.spd : 0; a.vz = (B.p.z - a.z) * .5; a.state = Math.abs(a.vx) > .1 ? 'walk' : 'idle'; if (a.vx) a.facing = Math.sign(a.vx); a.walkP += dt * 8; }
    if (a.state === 'eatk') { a.vx = a.vz = 0; }
    physics(a, dt); pose(a, dt);
  }
  for (let i = B.allies.length - 1; i >= 0; i--) if (B.allies[i].remove) { world.remove(B.allies[i].root); B.allies.splice(i, 1); }
}

/* ---------------- 전장 업데이트 ---------------- */
function updateBattle(dt) {
  const p = B.p;
  const talk = talkActive(); updTalk(dt);
  if (talk && talk.pause) { pose(p, dt); B.enemies.forEach(e => pose(e, dt)); return; }
  B.t += dt; if (B.bossSpawned) B.bossT += dt; if (B.comboT > 0) { B.comboT -= dt; if (B.comboT <= 0) B.combo = 0; }
  updatePlayer(p, dt);
  updEnemies(dt); updAllies(dt);
  physics(p, dt);
  const hw = halfW(); p.x = clamp(p.x, Math.max(-6, B.camX - hw), Math.min(B.len + 3, B.camX + hw));
  const alive = B.enemies.filter(e => !e.dead && e.state !== 'charge');
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) { const a = alive[i], b = alive[j], dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz, md = .75 * (a.scale + b.scale) / 2;
    if (d2 < md * md && d2 > 1e-4) { const d = Math.sqrt(d2), push = (md - d) * .5; a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push; } }
  for (const e of B.enemies) { physics(e, dt); if (!e.entered && Math.abs(e.x - B.camX) < hw) e.entered = true; if (e.entered && !e.dead && e.state !== 'charge' && e.state !== 'flee' && !e.lane) e.x = clamp(e.x, B.camX - hw - .5, B.camX + hw + .5); }
  updProj(dt); updHazards(dt); updLoot(dt); stageEvTick(dt);
  if (!B || SCENE !== 'battle') return;
  /* 웨이브 */
  if (!B.clear) {
    const W0 = B.S.waves;
    if (B.lock === null && B.wave < W0.length) { const [wx, list] = W0[B.wave]; if (B.camX >= wx * PX - 1 || p.x > wx * PX + 3) {
      B.lock = Math.max(B.camX, wx * PX - 1); B.wave++; const ks = list.split(' '); const ex = DIFF().extra; for (let k = 0; k < ex; k++) ks.push(pick(['s', 'sp', 'a']));
      ks.forEach((k, j) => B.spawnQ.push({ kind: k, t: j * .45, side: k === 'H' ? 1 : (j % 2 ? -1 : 1) })); } }
    if (B.lock === null && B.wave >= W0.length && !B.bossSpawned && B.camX >= B.len - hw - 3 && !(B.gate && !B.gate.broken)) { B.lock = B.len - hw - 2; spawnBoss(); queueTalk({ talk: [[B.S.boss.name, B.S.boss.line.replace(/"/g, '')]] }); }
    for (let i = B.spawnQ.length - 1; i >= 0; i--) { const q = B.spawnQ[i]; q.t -= dt; if (q.t <= 0) { spawnEnemy(q.kind, q.side); B.spawnQ.splice(i, 1); } }
    if (B.lock !== null && !B.gateLock && !B.bossSpawned && B.spawnQ.length === 0 && B.enemies.every(e => e.dead)) { B.lock = null; B.go = 3; }
  } else { B.clearT += dt; if (hit('start') && B.clearT > 1.5 && !talkActive()) { finishStage(); return; } }
  if (B.go > 0) B.go -= dt;
  for (let i = B.enemies.length - 1; i >= 0; i--) { const e = B.enemies[i]; if (e.remove) { world.remove(e.root); UI.removeEnemyUI(e); B.enemies.splice(i, 1); } }
  pose(p, dt); const blink = p.invuln > 0 && p.invuln < 90 && !['down', 'special', 'spin', 'dodge', 'cast'].includes(p.state); p.root.visible = !blink || Math.floor(W.t * 20) % 2 === 0;
  for (const e of B.enemies) pose(e, dt);
  if (B.p.P.lvl && hit('menu')) UI.openChar('equip');
}
function finishStage() {
  const si = B.si, S = B.S, P = G.pl;
  for (const L of B.loot) { pickLoot(B.p, L); world.remove(L.g); UI.removeLootLabel(L); } B.loot = [];
  const key = `${G.cycle}:${si}`, first = !G.clears[key];
  if (first) { G.clears[key] = true; P.rpg.skillPts += 1; P.rpg.statPts += 5; }
  const ordI = ORDER.indexOf(si);
  let after = null;
  if (si === 4 && first) after = 'choice';
  if (ordI === G.prog && ordI >= 0) G.prog++;
  if (si === ORDER[ORDER.length - 1] && !G.done) { if (G.treasures.book && G.treasures.seal && G.treasures.sword) { G.prog = ORDER.length; UI.msg('세 보물이 공명한다… 비장(秘章)이 열렸다!'); } else after = 'ending3'; }
  if (si === 5) after = 'endingTrue';
  toCamp(first ? `${S.title.replace(/\s+/g, ' ')} 첫 평정 — 스킬 포인트 +1 · 능력치 +5` : `${S.title.replace(/\s+/g, ' ')} 평정`, false, after);
}
/* ---------------- 장면 전환 ---------------- */
function toCamp(msg, fail, after) {
  if (B) { UI.clearWorldUI(); } B = null;
  SCENE = 'camp'; bgmMode = 'camp';
  disposeWorld(); buildEnv('camp', 40);
  saveGame(0);
  UI.enterCamp(msg, fail);
  if (after === 'choice') UI.openChoice(HY_CHOICE, o => { G.flags.hy = o.k; UI.msg(o.after); saveGame(0); });
  if (after === 'ending3') UI.ending(false);
  if (after === 'endingTrue') { setPref('lubu', true); UI.ending(true); }
}
function nextStageIdx() { if (G.prog < ORDER.length) return ORDER[G.prog]; if (G.prog === ORDER.length && !G.done) return 5; return null; }
function newCycle() { G.cycle++; G.prog = 0; G.done = false; G.treasures = {}; G.flags = {}; G.lampSaved = null; UI.msg(`윤회 — ${cycleName(G.cycle)} 시작! 적 레벨 +33`); saveGame(0); }

/* ---------------- 카메라 ---------------- */
const camPos = new T.Vector3(0, 3, 12), camLook = new T.Vector3(0, 1.3, 0);
function updateCamera(dt, snap) {
  let asp = innerWidth / innerHeight; if (!isFinite(asp) || asp <= 0) asp = 16 / 9; const k = clamp(1.55 / asp, 1, 2.4);
  if (!isFinite(camPos.x + camPos.y + camPos.z)) camPos.set(0, 3, 12); if (!isFinite(camLook.x + camLook.y + camLook.z)) camLook.set(0, 1.3, 0);
  if (SCENE === 'battle' && B) {
    B.camDist = 16.5 * k; const p = B.p;
    if (B.lock !== null) B.camX = lerp(B.camX, B.lock, 1 - Math.exp(-dt * 4)); else B.camX = Math.max(B.camX, lerp(B.camX, p.x + 1.5, 1 - Math.exp(-dt * 5)));
    B.camX = Math.min(B.camX, B.len - halfW() + 2);
    camPos.set(B.camX, 5.2 * Math.sqrt(k), B.camDist); camLook.set(B.camX, 1.5, -.8);
  } else if (SCENE === 'camp') { const wide = asp > 1.1; const tp = new T.Vector3(wide ? 1.2 : 5, 3.2, 12.5 * k), tl = new T.Vector3(wide ? 2.2 : 5, 1.6, 0);
    camPos.lerp(tp, snap ? 1 : 1 - Math.exp(-dt * 2)); camLook.lerp(tl, snap ? 1 : 1 - Math.exp(-dt * 2)); }
  else { const M = MENU; const wide = asp > 1.1; let tp, tl;
    if (SCENE === 'select' && M.heroes[M.sel]) { const f = M.heroes[M.sel]; tp = new T.Vector3(f.x - (wide ? 1.1 : 0), 1.75, f.z + 4.4 * k); tl = new T.Vector3(f.x - (wide ? .75 : 0), wide ? 1.3 : 1, f.z); }
    else { tp = new T.Vector3((wide ? -2.6 : 0) + Math.sin(W.t * .15) * .6, 2.8, 12.5 * k); tl = new T.Vector3(wide ? -2 : 0, wide ? 2 : 1.3, 0); }
    camPos.lerp(tp, snap ? 1 : 1 - Math.exp(-dt * 3)); camLook.lerp(tl, snap ? 1 : 1 - Math.exp(-dt * 3)); }
  const sh = W.shake; camera.position.set(camPos.x + rand(-1, 1) * sh * .5, camPos.y + rand(-1, 1) * sh * .4, camPos.z); camera.lookAt(camLook.x + rand(-1, 1) * sh * .15, camLook.y, camLook.z);
  W.shake = Math.max(0, W.shake - dt * 1.8); sky.position.copy(camera.position);
  const cx = camLook.x; sun.position.set(cx + sunDir.x * 60, Math.max(12, sunDir.y * 60 + 8), sunDir.z * 60); sun.target.position.set(cx, 0, 0);
  if (ENV.key === 3 || ENV.rain) { pointLights[0].position.set(cx - 6, 5, -7); pointLights[1].position.set(cx + 8, 5, -7); }
}

/* ---------------- 메뉴(타이틀 · 무장 선택) 3D ---------------- */
const MENU = { heroes: [], sel: 0, ring: null };
function enterMenu() {
  B = null; disposeWorld(); buildEnv(0, 60); SCENE = 'title'; bgmMode = 'field';
  const list = HEROES.map((h, i) => i).filter(i => !HEROES[i].hidden || getPref('lubu', false));
  MENU.list = list; const n = list.length;
  MENU.heroes = list.map((hi, k) => { const h = HEROES[hi], L = { ...h.look }; if (h.id === 'huang') L.backBow = true; const f = mkFighter(L, { team: 'm', elem: h.fx, hi }); f.x = (k - (n - 1) / 2) * 1.6; f.z = 0; f.demoT = rand(1, 6); f.h = h; return f; });
  const ring = new T.Mesh(geo('selring', () => { const g = new T.RingGeometry(.75, .95, 48); g.rotateX(-Math.PI / 2); return g; }), new T.MeshBasicMaterial({ color: col(HEROES[0].fx).multiplyScalar(2), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
  ring.position.y = .05; ring.visible = false; world.add(ring); MENU.ring = ring;
}
function updateMenu(dt) {
  const n = MENU.heroes.length;
  MENU.heroes.forEach((f, k) => {
    const sel = SCENE === 'select' && k === MENU.sel, tx = (k - (n - 1) / 2) * 1.6, tz = SCENE === 'select' ? (sel ? 1.8 : -.9) : (k % 2 ? -.6 : .4);
    const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz); f.st += dt;
    if (f.state === 'idle' || f.state === 'walk') {
      if (d > .08) { f.x += dx / d * 4 * dt; f.z += dz / d * 4 * dt; f.state = 'walk'; f.walkP += dt * 9; if (Math.abs(dx) > .05) f.facing = Math.sign(dx); }
      else { f.state = 'idle'; f.facing = SCENE === 'select' ? (sel ? 1 : (k < MENU.sel ? 1 : -1)) : (k < n / 2 ? 1 : -1); }
      f.demoT -= dt; if (f.state === 'idle' && f.demoT <= 0 && (sel || SCENE === 'title')) { setState(f, 'attack'); f.combo = 0; f.pose = 0; f.atkDur = .4; f.windFrac = .3; f.demoN = 0; f.demoT = sel ? 3.2 : rand(6, 11); }
    } else if (f.state === 'attack') { const u = f.st / f.atkDur; if (!f.didSwing && u > .3) { f.didSwing = true; slash(f, ['chop', 'sweep', 'thrust'][f.combo], f.h.fx, { s: f.h.reach * PX / 2.7 }); }
      if (u >= 1) { if (f.combo < 2 && sel) { setState(f, 'attack'); f.combo++; f.pose = f.combo === 2 ? 3 : f.combo; f.atkDur = f.combo === 2 ? .55 : .4; f.windFrac = .3; } else setState(f, 'idle'); } }
    pose(f, dt); if (sel && f.state === 'idle') { f.selRot = lerp(f.selRot ?? f.rotY, -.25, 1 - Math.exp(-dt * 5)); f.root.rotation.y = f.selRot; } else f.selRot = f.rotY;
    if (sel && MENU.ring) { MENU.ring.visible = true; MENU.ring.position.x = f.x; MENU.ring.position.z = f.z; MENU.ring.rotation.y += dt; if (Math.random() < .5) PA.emit(f.x + rand(-.8, .8), .1, f.z + rand(-.5, .5), 0, rand(1, 2.5), 0, 1.1, rand(.1, .22), col(f.h.fx), 0, 0, 2); }
  });
  if (SCENE !== 'select' && MENU.ring) MENU.ring.visible = false;
}
/* 군영 3D */
const CAMP = { hero: null, npcs: [] };
function buildCampActors() {
  const P = G.pl, L = heroLook(P); CAMP.hero = mkFighter(L, { team: 'm', x: 5.5, z: 3, facing: -1, h: heroOf() });
  CAMP.npcs = [];
  const pr = G.done ? 9 : Math.min(G.prog || 0, 9), ids = heroIds(), list = [['유비', 3]]; if (pr >= 3 && !ids.includes('zhuge')) list.push(['제갈량', 9.5]); list.push(['미축', 12.5]);
  for (const [n, x] of list) { const f = mkFighter(lookOf(n), { team: 'm', x, z: -1.5, facing: x < 6 ? 1 : -1, npcName: n }); CAMP.npcs.push(f); }
}
function updateCamp(dt) { if (CAMP.hero) pose(CAMP.hero, dt); CAMP.npcs.forEach(f => { f.st += dt; pose(f, dt); }); }

/* ---------------- 메인 루프 ---------------- */
function resize() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight), pr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / (w * h))));
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const sc = h * pr / (2 * Math.tan(camera.fov * Math.PI / 360)); PA.mat.uniforms.uScale.value = sc; PN.mat.uniforms.uScale.value = sc;
}
addEventListener('resize', resize);
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min((now - last) / 1000, .05); last = now; W.t += rdt;
  let dt = rdt; if (W.hitstop > 0) { W.hitstop -= rdt; dt *= .06; } if (W.slow > 0) { W.slow -= rdt; dt *= .3; }
  const paused = UI.paused();
  try {
    if (!paused) {
      if (SCENE === 'battle' && B) updateBattle(dt);
      else if (SCENE === 'title' || SCENE === 'select') updateMenu(dt);
      else if (SCENE === 'camp') updateCamp(dt);
    }
    const allF = SCENE === 'battle' && B ? [B.p, ...B.enemies, ...B.allies, ...(B.escort && !B.escort.lamp ? [B.escort] : [])] : SCENE === 'camp' ? [CAMP.hero, ...CAMP.npcs] : MENU.heroes;
    for (const f of allF) if (f && f.flashT > 0) { f.flashT -= rdt; if (f.flashT <= 0) for (const m of f.meshes) m.material = m.userData.mat; }
    if (!paused) { updateFx(dt); PA.update(dt); PN.update(dt); ambientTick(dt, camLook.x); animateEnv(dt); }
    updateCamera(rdt); UI.frame(rdt); bgmTick(rdt);
  } catch (err) { console.error(err); }
  for (const k in PRESS) delete PRESS[k];
  W.flash = Math.max(0, W.flash - rdt * 2.2);
  const expo = (W.exposure + W.flash * .9) * (1 - (W.dim || 0) * .45);
  if (gradePass) gradePass.uniforms.uExposure.value = expo; else renderer.toneMappingExposure = expo * .85;
  if (bloomPass) bloomPass.strength = .45 + W.flash * .6;
  if (composer) composer.render(); else renderer.render(scene, camera);
}
