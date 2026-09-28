'use strict';
/* ===== UI: HUD · 대화 · 컷인 · 타이틀 · 무장 선택 · 스토리 · 군영 · 캐릭터 창 · 상인 · 대장간 · 도박장 · 저장 ===== */
const SLOT_GLYPH = { weapon: '武', armor: '甲', helm: '冑', gloves: '手', boots: '靴', belt: '帶', cape: '袍', neck: '珠', ring: '環', ring1: '環', ring2: '環', book: '書' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = (() => {
  const fx = $('#fx'), NUMS = [], BARS = new Map(), LOOTL = new Map(), TAGS = new Map();
  let modal = null, pauseOn = false, banT = 0, msgs = [], titleSel = 0, diffIdx = getPref('diff', 1), konami = [], campSel = 0, storyIdx = null, storyT = 0, campTalkT = 0, bubble = null;
  AUDIO.bgm = getPref('bgm', true); AUDIO.sfx = getPref('sfx', true);
  const _v = new T.Vector3();
  const toScreen = (x, y, z) => { _v.set(x, y, z).project(camera); return [(_v.x * .5 + .5) * innerWidth, (-_v.y * .5 + .5) * innerHeight, _v.z]; };
  const show = (id, on = true) => { const el = $(id); if (el) el.hidden = !on; };
  const screens = ['#title', '#select', '#story', '#camp'];
  function onlyScreen(id) { screens.forEach(s => show(s, s === id)); }

  /* ---------- 공용 ---------- */
  function dmg(x, y, z, text, cls, el) {
    const d = document.createElement('div'); d.className = 'dn ' + cls + (el && el !== 'phys' ? ' el-' + el : ''); d.textContent = text; fx.appendChild(d);
    NUMS.push({ el: d, x, y, z, t: 0, vx: rand(-.5, .5), life: cls === 'skill' ? 1.3 : .9 });
  }
  function msg(html) { const box = $('#msgs'), d = document.createElement('div'); d.className = 'msg'; d.innerHTML = html; box.appendChild(d); msgs.push({ el: d, t: 0 }); while (box.children.length > 5) { box.firstChild.remove(); msgs.shift(); } }
  function banner(a, b, c, dur, cls = '') { const el = $('#banner'); $('#ban-a').textContent = a; $('#ban-b').textContent = b; $('#ban-c').textContent = c || ''; el.className = cls; el.hidden = false; void el.offsetWidth; el.classList.add('show'); banT = dur; }
  function cutin(hz, name, sub, c) { const el = $('#cutin'); $('#cut-hz').textContent = hz; $('#cut-n').textContent = name; $('#cut-s').textContent = sub || ''; el.style.setProperty('--cc', c); el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 1100); }
  function superFlash(n) { const el = $('#super'); el.textContent = n; el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 700); }
  function clearWorldUI() { fx.innerHTML = ''; NUMS.length = 0; BARS.clear(); LOOTL.clear(); TAGS.clear(); bubble = null; }
  function lootLabel(L) { const d = document.createElement('div'); d.className = 'lootl'; d.style.color = GRADES[L.item.g].c; d.innerHTML = `<img src="${itemIcon(L.item)}" alt="">${esc(L.item.n)}`; if (!canWear(G.pl, L.item)) d.classList.add('bad'); fx.appendChild(d); LOOTL.set(L, d); }
  function removeLootLabel(L) { const d = LOOTL.get(L); if (d) { d.remove(); LOOTL.delete(L); } }
  function removeEnemyUI(e) { const b = BARS.get(e); if (b) { b.remove(); BARS.delete(e); } }

  /* ---------- HUD ---------- */
  function enterBattle() {
    onlyScreen(null); show('#hud'); show('#touch', isTouch); closeModal(); pauseOn = false; show('#pause', false);
    const h = heroOf(); $('#hud-hz').textContent = h.name[0] === '제' ? '諸' : ({ guan: '關', zhang: '張', zhao: '趙', huang: '黃', zhuge: '諸', ma: '馬', diao: '貂', wei: '魏', lubu: '呂', xu: '徐', gan: '甘', sun: '孫' })[h.id];
    $('#hud-pt').style.setProperty('--pc', h.fx); $('#hud-name').textContent = h.name; $('#hud-ch').textContent = B.S.title.replace(/\s+/g, ' '); $('#hud-sname').textContent = B.S.sub;
    renderHot(); $('#spk-img').src = heroSpIcon(h); $('#spk').title = `필살기 「${h.spName}」`;
  }
  function renderHot() {
    const R = G.pl.rpg, box = $('#hot'); box.innerHTML = '';
    for (let i = 0; i < 4; i++) { const id = R.hot[i], s = id ? SKILLS[id] : null; const d = document.createElement('div'); d.className = 'hk' + (s ? '' : ' empty'); d.innerHTML = `${s ? `<img src="${skillIcon(s)}" alt="${s.n}" draggable="false">` : ''}<i class="cd"></i><small>${i + 1}</small>`; d.title = s ? s.n : '비어 있음'; box.appendChild(d); }
  }
  let hudT = 0;
  function hudFrame(dt) {
    if (!B) return; const p = B.p, S = p.S, P = p.P, R = P.rpg;
    $('#hp-i').style.width = (p.hp / S.maxhp * 100) + '%'; $('#hp-t').textContent = `${Math.ceil(p.hp)} / ${S.maxhp}`; $('#hpbar').classList.toggle('low', p.hp / S.maxhp < .3);
    $('#mp-i').style.width = (p.mp / S.maxmp * 100) + '%'; $('#ki-i').style.width = (p.ki / S.maxki * 100) + '%'; $('#ki-t').textContent = Math.floor(p.ki);
    $('#xp-i').style.width = (P.lvl >= MAXLV ? 100 : P.exp / expNeed(P.lvl) * 100) + '%';
    $('#hud-lv').textContent = `Lv.${P.lvl}`; $('#hud-lives').textContent = '◆'.repeat(Math.max(0, B.lives)) || '—';
    hudT -= dt; if (hudT <= 0) { hudT = .15;
      $('#hud-score').textContent = P.score.toLocaleString('ko-KR'); $('#hud-gold').textContent = R.gold.toLocaleString('ko-KR');
      const inv = $('#inv'), have = INV_KEYS.filter(k => (P.inv[k] || 0) > 0), sel = have.length ? have[P.sel % have.length] : null;
      inv.innerHTML = INV_KEYS.map(k => `<div class="iv ${k === sel ? 'on' : ''} ${(P.inv[k] || 0) ? '' : 'none'}" title="${ITEMS[k].name} — ${ITEMS[k].desc}"><img src="${consIcon(k)}" alt="${ITEMS[k].name}"><small>${P.inv[k] || 0}</small></div>`).join('');
      const bf = $('#buffs'), list = []; for (const b of p.buffs) list.push(`<span>${esc(b.n || '강화')} ${Math.ceil(b.t)}s</span>`); if (p.buf) { if (p.buf.atk > 0) list.push(`<span class="r">병법서 ${Math.ceil(p.buf.atk)}s</span>`); if (p.buf.haste > 0) list.push(`<span class="b">신행부 ${Math.ceil(p.buf.haste)}s</span>`); if (p.buf.shield > 0) list.push(`<span class="g">금강 ${Math.ceil(p.buf.shield)}s</span>`); }
      if (p.perfT > 0) list.push('<span class="b">완벽 회피</span>'); if (p.fear > 0) list.push('<span class="r">공포</span>'); bf.innerHTML = list.join('');
      let obj = ''; if (B.chase && !B.bossSpawned) { const s = Math.max(0, Math.ceil(B.chase.t)); obj = `<span class="${s < 30 ? 'warn' : ''}">조조 추격 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</span>`; }
      if (B.gate && !B.gate.broken && B.gateLock) obj = `성문 ${B.gate.hp} / ${B.gate.maxhp}`;
      if (B.escort && !B.escort.dead) obj = `${B.escort.lamp ? '칠성등' : '미부인'} ${Math.ceil(B.escort.hp)} / ${B.escort.maxhp}` + (B.escort.hp < B.escort.maxhp * .35 ? ' <span class="warn">위험!</span>' : '');
      if (B.S.countJars && !G.treasures.book) obj += `${obj ? ' · ' : ''}<span class="dim">秘 ${B.jarsBroken}/${B.jarCount}</span>`;
      $('#hud-obj').innerHTML = obj; }
    R.hot.forEach((id, i) => { const el = $('#hot').children[i]; if (!el || !id) return; const s = SKILLS[id], cd = p.cds[id] || 0, full = s.cd * (1 - S.cdr / 100);
      el.querySelector('.cd').style.height = (cd > 0 ? cd / full * 100 : 0) + '%'; el.classList.toggle('nomp', p.mp < s.mp); });
    const spc = Math.max(30, 50 - effSkillLv(P, SKT[p.h.id][0][4], S)); $('#sp-ring').setAttribute('stroke-dashoffset', String(226.2 * (1 - Math.min(1, p.ki / spc)))); $('#spk').classList.toggle('ready', p.ki >= spc);
    const cb = $('#combo'); if (B.combo >= 2) { cb.hidden = false; $('#combo-n').textContent = B.combo; const c = B.combo; $('#combo-r').textContent = c >= 200 ? '天下無雙' : c >= 100 ? '一騎當千' : c >= 50 ? 'EXCELLENT' : c >= 25 ? 'GREAT' : c >= 10 ? 'GOOD' : ''; } else cb.hidden = true;
    const b = B.boss && !B.boss.remove && !B.boss.dead ? B.boss : B.enemies.find(e => e.mid && !e.decoy && !e.dead);
    if (b) { show('#bossbar'); $('#boss-name').textContent = b.name; $('#boss-title').textContent = b.title + (b.phases ? ` · 제${b.phaseI + 1}국면` : ''); const r = b.hp / b.maxhp; b.lag = Math.max(r, (b.lag ?? 1) - dt * .35);
      $('#boss-hp').style.width = r * 100 + '%'; $('#boss-lag').style.width = b.lag * 100 + '%'; $('#boss-poise').style.width = Math.min(100, (b.poise || 0) / ((b.poiseMax || 80) * (b.maxhp / 400)) * 100) + '%';
      $('#boss-ticks').innerHTML = (b.phases || []).slice(1).map(ph => `<i style="left:${ph.hp * 100}%"></i>`).join(''); $('#bossbar').classList.toggle('groggy', b.groggy > 0); $('#bossbar').classList.toggle('barrier', !!b.barrier); }
    else show('#bossbar', false);
    show('#go', B.go > 0 && !B.lock && !B.clear); show('#clearp', B.clear === 3 && B.clearT > 1.5 && !talkActive());
    /* 대화창 */
    const Q = talkActive(); const tb = $('#talk');
    if (Q) { tb.hidden = false; const L = Q.lines[Q.i], n = Math.min(L.txt.length, Math.floor(Q.t * 42)); const tip = L.who === TIPN || L.who === '안내';
      tb.classList.toggle('tip', tip); $('#talk-who').textContent = tip ? '◆ 전술 안내' : speakerName(L.who); $('#talk-txt').textContent = L.txt.slice(0, n); $('#talk-next').hidden = n < L.txt.length;
      $('#talk-next').textContent = Q.pause ? '▼ ENTER' : 'ENTER ▶'; const lk = tip ? null : lookOf(L.who); $('#talk-pt').hidden = tip; if (lk) { $('#talk-pt').style.setProperty('--pc', lk.body || '#888'); $('#talk-pt').textContent = speakerName(L.who)[0]; } }
    else tb.hidden = true;
  }
  function worldUI(dt) {
    for (let i = NUMS.length - 1; i >= 0; i--) { const n = NUMS[i]; n.t += dt; n.y += dt * 1.3 * Math.max(0, 1 - n.t * 1.2); n.x += n.vx * dt;
      const [sx, sy] = toScreen(n.x, n.y, n.z), u = n.t / n.life, sc = u < .12 ? .6 + u / .12 * .6 : 1.2 - Math.min(.2, (u - .12) * .6);
      n.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(${sc})`; n.el.style.opacity = String(1 - smooth(.7, 1, u)); if (u >= 1) { n.el.remove(); NUMS.splice(i, 1); } }
    if (!B) { campBubbles(dt); return; }
    const live = new Set();
    for (const e of [...B.enemies, ...(B.escort && !B.escort.lamp ? [B.escort] : [])]) {
      if (e.dead || e.remove || (e.boss && !e.decoy && !e.mid) || e.decoy) continue; const named = e.elite || e.officer || e.mid || e.team === 'n';
      if (!named && e.hp >= e.maxhp) continue; live.add(e); let b = BARS.get(e);
      if (!b) { b = document.createElement('div'); b.className = 'ebar' + (e.team === 'n' ? ' ally' : '') + (e.elite ? ' elite' : ''); b.innerHTML = `<span>${e.team === 'n' ? e.npcName : e.elite ? e.eliteName : e.mid ? e.name : e.officer ? '장교' : ''}</span><i></i>`; fx.appendChild(b); BARS.set(e, b); }
      const [sx, sy] = toScreen(e.x, (e.y || 0) + 2.35 * e.scale + (e.mounted ? 1 : 0), e.z); b.style.transform = `translate(${sx - 30}px,${sy}px)`; b.lastChild.style.width = (e.hp / e.maxhp * 100) + '%'; }
    for (const [e, b] of BARS) if (!live.has(e)) { b.remove(); BARS.delete(e); }
    for (const [L, d] of LOOTL) { const [sx, sy] = toScreen(L.x, 1.4 + L.y, L.z); d.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-100%)`; }
  }
  /* ---------- 컷인 · 배너 · 메시지 ---------- */
  function frame(dt) {
    worldUI(dt); if (modal === '캐릭터') pvFrame(dt);
    if (banT > 0) { banT -= dt; if (banT <= 0) show('#banner', false); }
    for (let i = msgs.length - 1; i >= 0; i--) { msgs[i].t += dt; if (msgs[i].t > 5) { msgs[i].el.remove(); msgs.splice(i, 1); } }
    if (SCENE === 'battle') hudFrame(dt);
    if (SCENE === 'story') storyFrame(dt);
  }

  /* ---------- 타이틀 ---------- */
  const TITLE_ITEMS = () => [
    { k: 'new', n: '새로 시작', d: '무장을 골라 새 이야기를 시작한다' },
    { k: 'cont', n: '이어하기', d: '저장 기록(자동 저장 + 슬롯 3개)에서 이어한다' },
    { k: 'diff', n: `난이도 〈 ${DIFFS[diffIdx].name} 〉`, d: DIFFS[diffIdx].desc },
    { k: 'bgm', n: `배경음악 〈 ${AUDIO.bgm ? '켜기' : '끄기'} 〉`, d: '절차 생성 오음계 배경음악' },
    { k: 'sfx', n: `효과음 〈 ${AUDIO.sfx ? '켜기' : '끄기'} 〉`, d: '타격음 · 기합 · 효과음' },
    { k: 'voice', n: `음성 〈 ${VOICE.on ? '켜기' : '끄기'} 〉`, d: voiceDesc() },
    { k: 'help', n: '조작 · 커맨드 안내', d: '조작키 · 커맨드 기술 · RPG 시스템 요약' }];
  function renderTitle() {
    const it = TITLE_ITEMS(); $('#tmenu').innerHTML = it.map((m, i) => `<button class="tm ${i === titleSel ? 'on' : ''}" data-i="${i}">${m.n}</button>`).join('');
    $('#tdesc').textContent = it[titleSel].d;
    $('#tmenu').querySelectorAll('.tm').forEach(b => { b.onclick = () => { titleSel = +b.dataset.i; titleAct(0, true); }; b.onmouseenter = () => { titleSel = +b.dataset.i; renderTitle(); }; });
  }
  function titleAct(dir, enter) {
    const k = TITLE_ITEMS()[titleSel].k; initAudio();
    if (k === 'diff') { diffIdx = (diffIdx + (dir || 1) + 4) % 4; setPref('diff', diffIdx); }
    else if (k === 'bgm') { AUDIO.bgm = !AUDIO.bgm; setPref('bgm', AUDIO.bgm); }
    else if (k === 'sfx') { AUDIO.sfx = !AUDIO.sfx; setPref('sfx', AUDIO.sfx); }
    else if (k === 'voice') { setVoice(!VOICE.on); if (VOICE.on) speak('관우', '음성을 켰소. 인물마다 목소리가 다르오.'); }
    else if (enter && k === 'new') { toSelect(); return; }
    else if (enter && k === 'cont') { openSlots('load'); return; }
    else if (enter && k === 'help') { openHelp(); return; }
    sfx('ui'); renderTitle();
  }
  function toTitle() { closeModal(); show('#hud', false); show('#touch', false); show('#pause', false); pauseOn = false; clearWorldUI(); enterMenu(); onlyScreen('#title'); renderTitle(); updateCamera(1, true); }
  /* ---------- 무장 선택 ---------- */
  function toSelect() { SCENE = 'select'; onlyScreen('#select'); buildCards(); setSel(MENU.sel); sfx('ui'); }
  function buildCards() {
    const nav = $('#cards'); nav.innerHTML = '';
    MENU.list.forEach((hi, k) => { const h = HEROES[hi], b = document.createElement('button'); b.className = 'card'; b.style.setProperty('--c', h.fx);
      b.innerHTML = `<b>${h.name[0] === '제' ? '諸' : h.name[0]}</b><span>${h.name}</span><small>${h.weapon}</small>`;
      b.onclick = () => { initAudio(); if (MENU.sel === k) startNew(); else setSel(k); }; nav.appendChild(b); });
  }
  function setSel(k) {
    MENU.sel = clamp(k, 0, MENU.list.length - 1); const h = HEROES[MENU.list[MENU.sel]]; sfx('ui');
    $('#sel-name').innerHTML = `${h.name}<em>${h.zi !== '—' ? '자 ' + h.zi : ''}</em>`; $('#sel-sub').textContent = `${h.title} · ${h.weapon}`;
    $('#st-pw').style.width = (h.pow / 17 * 100) + '%'; $('#st-sp').style.width = (h.spd / 4.3 * 100) + '%'; $('#st-rc').style.width = (h.reach / 122 * 100) + '%'; $('#st-hp').style.width = (h.hp / 150 * 100) + '%';
    $('#sel-desc').innerHTML = h.desc.map(esc).join('<br>'); $('#sel-cmd').textContent = `전용기 ↓→+공격 「${h.cmd.name}」 · 필살기 「${h.spName}」`;
    [...$('#cards').children].forEach((c, i) => c.setAttribute('aria-pressed', i === MENU.sel ? 'true' : 'false'));
    if (MENU.ring) MENU.ring.material.color.copy(col(h.fx).multiplyScalar(2)); MENU.heroes[MENU.sel].demoT = .4;
  }
  function startNew() { const hi = MENU.list[MENU.sel]; G = newCampaign(hi, diffIdx); ITEM_ID = 1; sfx('ui'); openStory(ORDER[0]); }
  /* ---------- 스토리 ---------- */
  function openStory(si) {
    storyIdx = si; storyT = 0; const S = STAGES[si]; SCENE = 'story'; onlyScreen('#story'); show('#hud', false);
    if (!MENU.heroes.length && SCENE === 'story') { /* 배경 유지 */ }
    $('#st-ch').textContent = S.title.replace(/\s+/g, ' '); $('#st-sub').textContent = S.sub; $('#st-lv').textContent = `적 레벨 ${stageLvOf(si)} · ${DIFF().name} · ${cycleName(G.cycle)}`;
    $('#st-lines').innerHTML = S.story.map(l => `<p class="${l.startsWith('—') ? 'hint' : ''}">${esc(l)}</p>`).join(''); [...$('#st-lines').children].forEach(p => p.style.opacity = 0);
    voiceStop(); S.story.forEach(l => speak('__narrator', l, { interrupt: false }));
  }
  function storyFrame(dt) { storyT += dt; [...$('#st-lines').children].forEach((p, i) => { p.style.opacity = String(clamp((storyT - i * .7) / .6, 0, 1)); }); }
  function storyGo() { if (storyT < .4) return; const lines = $('#st-lines').children.length; if (storyT < lines * .7) { storyT = lines * .7 + .6; return; } voiceStop(); sfx('special'); onlyScreen(null); startStage(storyIdx); }
  /* ---------- 군영 ---------- */
  const CAMP_MENU = () => { const nx = nextStageIdx(); return [
    { k: 'go', n: G.done ? `윤회 — ${cycleName(G.cycle + 1)}` : nx != null ? `출진 — ${STAGES[nx].title.replace(/\s+/g, ' ')}` : '출진', d: G.done ? '적 레벨 +33 · 더 좋은 장비. 숨겨진 보물 · 첫 평정 보상을 다시 얻는다.' : nx != null ? STAGES[nx].sub : '' },
    { k: 'stages', n: '전장 선택', d: '평정한 전장에 다시 나가 경험치와 장비를 모은다' },
    { k: 'char', n: '장비 · 스킬 · 능력치', d: 'Tab — 캐릭터 창' }, { k: 'smith', n: '대장간', d: '강화 +0~+15 · 재련 · 분해 · 스킬 강화' },
    { k: 'shop', n: '상인', d: '보급품 · 강화 재료 · 보따리 · 비급서' }, { k: 'gacha', n: '도박장', d: '천명 보물함 · 비급 복주머니' },
    { k: 'save', n: '저장하기', d: '슬롯 1~3에 저장' }, { k: 'title', n: '타이틀로', d: '군영 진입 시 자동 저장됨' }]; };
  function enterCamp(m, fail) {
    closeModal(); onlyScreen('#camp'); show('#hud', false); show('#touch', false); pauseOn = false; show('#pause', false); campSel = 0;
    buildCampActors(); renderCamp(); if (m) msg(esc(m).replace(/&lt;(\/?span[^&]*)&gt;/g, '<$1>')); updateCamera(1, true); campTalkT = 0; bubble = null;
  }
  function renderCamp() {
    const P = G.pl, R = P.rpg, h = heroOf(), items = CAMP_MENU();
    $('#cmenu').innerHTML = items.map((m, i) => `<button class="tm ${i === campSel ? 'on' : ''}" data-i="${i}">${esc(m.n)}</button>`).join('');
    $('#cdesc').textContent = items[campSel].d;
    $('#cmenu').querySelectorAll('.tm').forEach(b => { b.onclick = () => { campSel = +b.dataset.i; campAct(); }; b.onmouseenter = () => { campSel = +b.dataset.i; $('#cmenu').querySelectorAll('.tm').forEach((x, i) => x.classList.toggle('on', i === campSel)); $('#cdesc').textContent = items[campSel].d; }; });
    $('#c-hero').innerHTML = `<b>${h.name}</b> Lv.${P.lvl} <small>${cycleName(G.cycle)} · ${DIFF().name}</small>`;
    $('#c-res').innerHTML = `<span>금화 <b>${R.gold.toLocaleString('ko-KR')}</b></span><span>강화석 <b>${R.mats.stone}</b></span><span>비급 조각 <b>${R.mats.frag}</b></span><span>전투력 <b>${power(P).toLocaleString('ko-KR')}</b></span>`;
    const tr = ['book', 'seal', 'sword', 'horse'].map(k => `<span class="tr ${G.treasures[k] ? 'on' : ''}" title="${ITEMS[k].name}${G.treasures[k] ? ' (획득)' : ' (미획득)'}"><img src="${consIcon(k)}" alt="${ITEMS[k].name}"></span>`).join('');
    const prog = ORDER.map((si, i) => `<i class="${G.clears[`${G.cycle}:${si}`] ? 'done' : i === G.prog ? 'now' : ''}" title="${STAGES[si].title}"></i>`).join('');
    $('#c-prog').innerHTML = `<div class="pr">${prog}</div><div class="trs">${tr}</div>`;
    const pts = R.statPts || R.skillPts ? `<span class="pts">능력치 ${R.statPts} · 스킬 ${R.skillPts} 포인트</span>` : ''; $('#c-pts').innerHTML = pts;
  }
  function campAct() {
    const k = CAMP_MENU()[campSel].k; sfx('ui');
    if (k === 'go') { if (G.done) { newCycle(); renderCamp(); return; } const nx = nextStageIdx(); if (nx != null) openStory(nx); }
    else if (k === 'stages') openStages(); else if (k === 'char') openChar('equip'); else if (k === 'smith') openChar('smith');
    else if (k === 'shop') openShop(); else if (k === 'gacha') openGacha(); else if (k === 'save') openSlots('save'); else if (k === 'title') toTitle();
  }
  function campBubbles(dt) {
    if (SCENE !== 'camp' || !CAMP.npcs.length || modal) { if (bubble) { bubble.remove(); bubble = null; } return; }
    campTalkT += dt; const pr = G.done ? 9 : Math.min(G.prog || 0, 9), TT = CAMP_TALK[pr], k = Math.floor(campTalkT / 6) % TT.length, [who, line] = TT[k];
    const npc = CAMP.npcs.find(n => n.npcName === who) || CAMP.npcs[0];
    if (!bubble) { bubble = document.createElement('div'); bubble.className = 'bubble'; fx.appendChild(bubble); }
    const txt = pickLine(line); if (bubble.dataset.k !== String(k)) { bubble.dataset.k = k; bubble.innerHTML = `<small>${who}</small>${esc(txt)}`; if (campTalkT > 1) speak(who, txt, { vol: .85 }); }
    const [sx, sy] = toScreen(npc.x, 2.6, npc.z); const u = (campTalkT % 6) / 6; bubble.style.opacity = String(Math.min(1, u * 12, (1 - u) * 12)); bubble.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-100%)`;
  }
  function openStages() {
    const list = [...ORDER, 5].filter(si => G.clears[`${G.cycle}:${si}`] || si === nextStageIdx() || (si === 5 && G.clears[`${G.cycle}:5`]));
    openModal('전장 선택', `<div class="stlist">${list.map(si => `<button class="stb" data-s="${si}"><b>${STAGES[si].title.replace(/\s+/g, ' ')}</b><span>${STAGES[si].sub}</span><small>적 Lv.${stageLvOf(si)} ${G.clears[`${G.cycle}:${si}`] ? '· 평정' : '· 미평정'}</small></button>`).join('')}</div>`);
    $('#panel').querySelectorAll('.stb').forEach(b => b.onclick = () => { closeModal(); openStory(+b.dataset.s); });
  }
  /* ---------- 모달 ---------- */
  function openModal(title, html, cls = '') { modal = title; $('#p-title').textContent = title; $('#p-body').innerHTML = html; $('#panel').className = 'panel ' + cls; show('#panel'); }
  function closeModal() { modal = null; show('#panel', false); tipHide(); if (SCENE === 'camp' && G) { renderCamp(); afterGearSoft(); } if (SCENE === 'battle' && B) { refreshStats(B.p); rebuildPlayerModel(); renderHot(); } }
  $('#p-close').onclick = () => { sfx('ui'); closeModal(); };
  /* ---------- 캐릭터 창 ---------- */
  let charTab = 'equip', gradeTab = 'all', bagPage = 0, selItem = null, slotFilter = null, smithSel = null;
  function openChar(tab) { charTab = tab || charTab; openModal('캐릭터', '<div class="ctabs" id="ctabs"></div><div id="cbody"></div>', 'wide'); renderChar(); }
  function renderChar() {
    const inCamp = SCENE === 'camp', tabs = [['equip', '장비'], ['skill', '스킬'], ['stat', '능력치'], ...(inCamp ? [['smith', '대장간']] : []), ['sys', '시스템']];
    if (!inCamp && charTab === 'smith') charTab = 'equip';
    const R = G.pl.rpg; $('#ctabs').innerHTML = tabs.map(([k, n]) => `<button class="${k === charTab ? 'on' : ''}" data-k="${k}">${n}${k === 'skill' && R.skillPts ? ` <em>${R.skillPts}</em>` : ''}${k === 'stat' && R.statPts ? ` <em>${R.statPts}</em>` : ''}</button>`).join('');
    $('#ctabs').querySelectorAll('button').forEach(b => b.onclick = () => { charTab = b.dataset.k; sfx('ui'); renderChar(); });
    ({ equip: renderEquip, skill: renderSkill, stat: renderStat, smith: renderSmith, sys: renderSys })[charTab]();
  }
  const icon = (it, extra = '') => { if (!it) return ''; const G0 = GRADES[it.g], mk = it.set && SET_MARK[it.set];
    return `<div class="ico ${extra} ${G.pl && !canWear(G.pl, it) ? 'bad' : ''}" style="--gc:${G0.c}" data-slot="${slotType(it.s)}"><img src="${itemIcon(it)}" alt="${esc(it.n)}" draggable="false">${it.e ? `<i>+${it.e}</i>` : ''}${mk ? `<u style="color:${mk[1]}">${mk[0]}</u>` : ''}${it.nw ? '<s>NEW</s>' : ''}${it.lk ? '<em>🔒</em>' : ''}${G.pl && !canWear(G.pl, it) ? `<small>${it.h && it.h !== heroOf().id ? '전용' : 'Lv.' + it.rq}</small>` : ''}</div>`; };
  function renderEquip() {
    const P = G.pl, R = P.rpg, inCamp = SCENE === 'camp';
    const eqHtml = EQ_SLOTS.map(sl => { const it = R.eq[sl]; return `<button class="eqs ${slotFilter === sl ? 'on' : ''}" data-sl="${sl}"><span>${SLOTS[slotType(sl)].n}</span>${it ? icon(it) : `<div class="ico empty"><img src="${slotIcon(sl)}" alt="" draggable="false"></div>`}</button>`; }).join('');
    let bag = R.bag.slice(); if (gradeTab !== 'all') bag = bag.filter(b => b.g === gradeTab); if (slotFilter) bag = bag.filter(b => b.s === slotType(slotFilter));
    bag.sort((a, b) => GRADES[b.g].rank - GRADES[a.g].rank || b.il - a.il);
    const per = 40, pages = Math.max(1, Math.ceil(bag.length / per)); bagPage = clamp(bagPage, 0, pages - 1);
    const gt = ['all', ...GRADE_ORDER].map(g => `<button class="${g === gradeTab ? 'on' : ''}" data-g="${g}" style="${g !== 'all' ? `color:${GRADES[g].c}` : ''}">${g === 'all' ? '전체' : GRADES[g].n}${R.bag.some(b => b.nw && (g === 'all' || b.g === g)) ? '<i class="dot"></i>' : ''}</button>`).join('');
    $('#cbody').innerHTML = `<div class="eqwrap"><div class="eqleft"><div class="pw">전투력 <b>${power(P).toLocaleString('ko-KR')}</b> <small class="dim">드래그로 회전 · 칸에 올리면 해당 부위 표시</small></div><div class="pvbox" id="pvbox"></div><div class="eqgrid">${eqHtml}</div>
      <div class="row"><button class="btn" id="b-rec">추천 장착</button>${slotFilter ? '<button class="btn ghost" id="b-unf">부위 필터 해제</button>' : ''}</div>
      <div class="gold">금화 ${R.gold.toLocaleString('ko-KR')} · 강화석 ${R.mats.stone} · 비급 조각 ${R.mats.frag}</div></div>
      <div class="eqright"><div class="gtabs">${gt}</div><div class="bag">${bag.slice(bagPage * per, bagPage * per + per).map(it => `<button class="bs ${selItem === it ? 'on' : ''}" data-id="${it.id}">${icon(it)}</button>`).join('') || '<p class="dim">비어 있음</p>'}</div>
      <div class="row pg"><button class="btn ghost" id="b-prev">◀</button><span>${bagPage + 1} / ${pages} · ${bag.length}개</span><button class="btn ghost" id="b-next">▶</button>
      ${gradeTab !== 'all' ? `<button class="btn ghost" id="b-bdis">${GRADES[gradeTab].n} 일괄 분해</button>${inCamp ? `<button class="btn ghost" id="b-bsell">${GRADES[gradeTab].n} 일괄 판매</button>` : ''}` : ''}</div>
      <div class="itemact" id="itemact"></div></div></div>`;
    pvMount($('#pvbox'));
    $('#cbody').querySelectorAll('.eqs').forEach(b => { b.onclick = () => { const sl = b.dataset.sl; if (slotFilter === sl && R.eq[sl]) { selItem = R.eq[sl]; } slotFilter = slotFilter === sl ? null : sl; renderEquip(); showItemAct(R.eq[sl], sl); };
      b.onmouseenter = e => { pvHighlight(slotType(b.dataset.sl)); if (R.eq[b.dataset.sl]) tipShow(R.eq[b.dataset.sl], e); }; b.onmouseleave = () => { tipHide(); pvHighlight(slotFilter ? slotType(slotFilter) : null); }; });
    $('#cbody').querySelectorAll('.bs').forEach(b => { const it = R.bag.find(x => x.id === +b.dataset.id); b.onclick = () => { selItem = it; it.nw = false; renderEquip(); showItemAct(it); }; b.onmouseenter = e => { pvHighlight(slotType(it.s)); tipShow(it, e, true); }; b.onmouseleave = () => { tipHide(); pvHighlight(null); }; });
    $('#cbody').querySelectorAll('.gtabs button').forEach(b => b.onclick = () => { gradeTab = b.dataset.g; bagPage = 0; renderEquip(); });
    $('#b-rec').onclick = () => { const n = recommendEquip(P); msg(n ? `추천 장착 — ${n}개 교체` : '이미 최적의 장착입니다'); sfx(n ? 'gear' : 'ui'); afterGear(); };
    if ($('#b-unf')) $('#b-unf').onclick = () => { slotFilter = null; renderEquip(); };
    $('#b-prev').onclick = () => { bagPage--; renderEquip(); }; $('#b-next').onclick = () => { bagPage++; renderEquip(); };
    if ($('#b-bdis')) $('#b-bdis').onclick = () => bulk('dis'); if ($('#b-bsell')) $('#b-bsell').onclick = () => bulk('sell');
    if (selItem && (R.bag.includes(selItem) || Object.values(R.eq).includes(selItem))) showItemAct(selItem);
  }
  let bulkArm = null;
  function bulk(kind) {
    const R = G.pl.rpg, list = R.bag.filter(b => b.g === gradeTab && !b.lk && (!slotFilter || b.s === slotType(slotFilter)));
    if (!list.length) { msg('처리할 장비가 없습니다'); return; }
    if (bulkArm !== kind + gradeTab) { bulkArm = kind + gradeTab; msg(`${list.length}개를 ${kind === 'dis' ? '분해' : '판매'}합니다 — 한 번 더 누르면 확정`); return; }
    bulkArm = null; let g = 0, st = 0, fr = 0; for (const it of list) { if (kind === 'sell') g += sellPrice(it); else { const y = dismantleYield(it); st += y.stone; fr += y.frag; } }
    R.bag = R.bag.filter(b => !list.includes(b)); R.gold += g; R.mats.stone += st; R.mats.frag += fr; msg(kind === 'sell' ? `판매 — 금화 +${g}` : `분해 — 강화석 +${st} · 비급 조각 +${fr}`); sfx('gear'); renderEquip();
  }
  function showItemAct(it, sl) {
    const box = $('#itemact'); if (!box) return; if (!it) { box.innerHTML = ''; return; }
    const P = G.pl, R = P.rpg, eqd = Object.values(R.eq).includes(it), inCamp = SCENE === 'camp';
    box.innerHTML = `<div class="tipin"><img class="tipimg" src="${itemIcon(it)}" alt="">${itemTip(it, P)}</div>${!eqd ? compareHtml(it) : ''}<div class="row">
      ${eqd ? '<button class="btn" id="a-uneq">장착 해제</button>' : `<button class="btn" id="a-eq" ${canWear(P, it) ? '' : 'disabled'}>장착</button>`}
      <button class="btn ghost" id="a-lock">${it.lk ? '잠금 해제' : '잠금'}</button>
      ${!eqd && !it.lk ? '<button class="btn ghost" id="a-dis">분해</button>' : ''}${!eqd && !it.lk && inCamp ? `<button class="btn ghost" id="a-sell">판매 ${sellPrice(it)}</button>` : ''}</div>`;
    if ($('#a-eq')) $('#a-eq').onclick = () => { equip(P, it, slotFilter && slotType(slotFilter) === it.s ? slotFilter : null); sfx('gear'); afterGear(); };
    if ($('#a-uneq')) $('#a-uneq').onclick = () => { const k = Object.keys(R.eq).find(k => R.eq[k] === it); unequip(P, k); sfx('ui'); afterGear(); };
    $('#a-lock').onclick = () => { it.lk = !it.lk; renderEquip(); };
    if ($('#a-dis')) $('#a-dis').onclick = () => { const y = dismantleYield(it); R.mats.stone += y.stone; R.mats.frag += y.frag; R.bag = R.bag.filter(b => b !== it); selItem = null; msg(`분해 — 강화석 +${y.stone} · 비급 조각 +${y.frag}`); sfx('hit'); renderEquip(); };
    if ($('#a-sell')) $('#a-sell').onclick = () => { R.gold += sellPrice(it); R.bag = R.bag.filter(b => b !== it); selItem = null; sfx('pick'); renderEquip(); };
  }
  function compareHtml(it) {
    const P = G.pl, R = P.rpg; if (!canWear(P, it)) return ''; const sl = slotFor(it, P), old = R.eq[sl];
    const a = calcStats(P); R.eq[sl] = it; const b = calcStats(P); if (old) R.eq[sl] = old; else delete R.eq[sl];
    const keys = [['pow', '공격력'], ['maxhp', '최대 체력'], ['def', '방어력'], ['crit', '치명타'], ['maxmp', '최대 내공'], ['atkPct', '공격력%']];
    const d = keys.map(([k, n]) => { const v = (b[k] || 0) - (a[k] || 0); return Math.abs(v) >= .1 ? `<span class="${v > 0 ? 'up' : 'dn2'}">${n} ${v > 0 ? '▲' : '▼'}${Math.abs(v) < 10 ? v.toFixed(1) : Math.round(v)}</span>` : ''; }).join('');
    return `<div class="cmp">장착 시 변화 ${d || '<span class="dim">변화 없음</span>'}</div>`;
  }
  function afterGearSoft() { if (SCENE === 'camp' && CAMP.hero) { world.remove(CAMP.hero.root); CAMP.hero = mkFighter(heroLook(G.pl), { team: 'm', x: 5.5, z: 3, facing: -1, h: heroOf() }); } }
  function afterGear() { if (SCENE === 'battle' && B) { refreshStats(B.p); rebuildPlayerModel(); } if (SCENE === 'camp') { world.remove(CAMP.hero.root); CAMP.hero = mkFighter(heroLook(G.pl), { team: 'm', x: 5.5, z: 3, facing: -1, h: heroOf() }); } renderChar(); }
  const tip = $('#tip');
  function tipShow(it, e, cmp) { tip.innerHTML = `<img class="tipimg" src="${itemIcon(it)}" alt="">` + itemTip(it, G.pl) + (cmp ? compareHtml(it) : ''); tip.hidden = false; const r = e.currentTarget.getBoundingClientRect(); const x = r.right + 10 + 300 > innerWidth ? r.left - 310 : r.right + 10; tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.min(innerHeight - tip.offsetHeight - 10, r.top) + 'px'; }
  function tipHide() { tip.hidden = true; }
  function renderSkill() {
    const P = G.pl, R = P.rpg, h = heroOf(), S = calcStats(P);
    const cols = SKT[h.id].map((tree, tr) => `<div class="tree"><h4>${TREES[h.id][tr]} <small>${tree.reduce((a, s) => a + (R.sk[s.id] || 0), 0)}pt</small></h4>${tree.map(s => {
      const r = R.sk[s.id] || 0, eff = effSkillLv(P, s, S), act = ACTIVE_TY[s.ty], lock = P.lvl < s.lv, can = canLearn(P, s), hot = R.hot.indexOf(s.id);
      const tyN = { basic: '패시브 · 기본기', cmd: '패시브 · 전용기', sp: '패시브 · 필살기', passive: '패시브', aura: '오라', buff: '강화', proj: '투사체', dash: '돌진', nova: '광역', rain: '낙하', chain: '연쇄', quake: '지면', whirl: '회전', leap: '도약', summon: '소환' }[s.ty];
      return `<div class="sk ${r ? 'got' : ''} ${lock ? 'lock' : ''}"><div class="sic" style="--c:${HAN_EL[s.el] || h.fx}"><img src="${skillIcon(s)}" alt="${s.n}" draggable="false">${R.enh[s.id] ? `<i>+${R.enh[s.id]}</i>` : ''}</div>
        <div class="sinfo"><b>${s.n}</b><small>${tyN} · Lv.${s.lv}+ · ${r}/${s.max}${eff > r ? ` (+${eff - r})` : ''}</small><p>${esc(s.f)}${act && s.ty !== 'buff' && s.d ? ` <span class="dim">피해 ${(s.d + s.dr * Math.max(0, eff - 1)).toFixed(1)}배 · 내공 ${Math.round(s.mp * (1 + (Math.max(1, eff) - 1) * .05))} · ${s.cd}초</span>` : act ? ` <span class="dim">내공 ${s.mp} · ${s.cd}초</span>` : ''}</p></div>
        <div class="sbtn"><button class="btn sm" data-learn="${s.id}" ${can ? '' : 'disabled'}>+</button>${act && r ? [0, 1, 2, 3].map(i => `<button class="hkb ${hot === i ? 'on' : ''}" data-hot="${s.id}" data-i="${i}">${i + 1}</button>`).join('') : ''}</div></div>`; }).join('')}</div>`).join('');
    $('#cbody').innerHTML = `<p class="pts">스킬 포인트 <b>${R.skillPts}</b> · 단계별 습득 레벨 1 / 6 / 12 / 20 / 30 · 액티브 스킬은 1~4 단축키에 지정</p><div class="trees">${cols}</div>`;
    $('#cbody').querySelectorAll('[data-learn]').forEach(b => b.onclick = () => { const s = SKILLS[b.dataset.learn]; if (!canLearn(P, s)) return; R.sk[s.id] = (R.sk[s.id] || 0) + 1; R.skillPts--; sfx('lvl');
      if (ACTIVE_TY[s.ty] && R.sk[s.id] === 1 && !R.hot.includes(s.id)) { const i = R.hot.indexOf(null); if (i >= 0) R.hot[i] = s.id; } if (B) refreshStats(B.p); renderChar(); });
    $('#cbody').querySelectorAll('[data-hot]').forEach(b => b.onclick = () => { const id = b.dataset.hot, i = +b.dataset.i, j = R.hot.indexOf(id); if (j >= 0) R.hot[j] = null; R.hot[i] = id; sfx('ui'); renderChar(); });
  }
  function renderStat() {
    const P = G.pl, R = P.rpg, S = calcStats(P);
    const at = [['str', '무력', '공격력 +0.4'], ['dex', '민첩', '치명 · 회피 · 이동 · 방어'], ['vit', '체질', '체력 +3 · 방어 · 회복'], ['ene', '지력', '내공 +2.5 · 스킬 피해 +0.8%']];
    const f = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('ko-KR');
    const rows = [['공격력', f(S.pow, 1)], ['공격력 %', f(S.atkPct, 1) + '%'], ['최대 체력', f(S.maxhp)], ['최대 내공', f(S.maxmp)], ['최대 기력', f(S.maxki)], ['방어력', f(S.def)], ['치명타', f(S.crit, 1) + '%'], ['치명타 피해', f(S.critDmg) + '%'],
      ['회피', f(S.dodge, 1) + '%'], ['이동 속도', '+' + f(S.mspd, 1) + '%'], ['받는 피해 감소', f(S.dr, 1) + '%'], ['재사용 감소', f(S.cdr, 1) + '%'], ['스킬 피해', '+' + f(S.skillDmg, 1) + '%'], ['생명력 흡수', f(S.ls, 1) + '%'],
      ['화염 · 빙결 · 뇌전', `${f(S.fire || 0)} · ${f(S.ice || 0)} · ${f(S.bolt || 0)}%`], ['전용기 · 필살 · 기본', `${f(S.cmdDmg || 0)} · ${f(S.spDmg || 0)} · ${f(S.basicDmg || 0)}%`], ['초당 체력 회복', f(S.hpRegen, 1)], ['금화 · 아이템 발견', `${f(S.gf || 0)} · ${f(S.mf || 0)}%`]];
    const sets = Object.entries(S.sets).filter(([k, n]) => n >= 2).map(([k, n]) => `<span class="set on">${SETS[k].n} ${n}부위</span>`).join('');
    const trs = ['book', 'seal', 'sword', 'horse'].filter(k => G.treasures[k]).map(k => `<span class="tr on"><img src="${consIcon(k)}" alt="">${ITEMS[k].name}</span>`).join('') + (G.flags.hy ? `<span class="tr on">${G.flags.hy === 'gi' ? '義 의리의 증표' : '覇 패도의 증표'}</span>` : '');
    $('#cbody').innerHTML = `<div class="stwrap"><div><p class="pts">능력치 포인트 <b>${R.statPts}</b> <small class="dim">(Shift 클릭 +5 · Ctrl 클릭 전부)</small></p>
      ${at.map(([k, n, d]) => `<div class="atr"><b>${n}</b><span>${R[k]}${S[k] !== R[k] ? ` <em>(${Math.round(S[k])})</em>` : ''}</span><small>${d}</small><button class="btn sm" data-at="${k}" ${R.statPts ? '' : 'disabled'}>+</button></div>`).join('')}
      <p class="lvl">Lv.${P.lvl} · 경험치 ${P.exp.toLocaleString('ko-KR')} / ${expNeed(P.lvl).toLocaleString('ko-KR')}</p><div class="trs">${trs}</div><div>${sets}</div></div>
      <div class="derived">${rows.map(([n, v]) => `<div><span>${n}</span><b>${v}</b></div>`).join('')}</div></div>`;
    $('#cbody').querySelectorAll('[data-at]').forEach(b => b.onclick = e => { const n = e.ctrlKey ? R.statPts : e.shiftKey ? Math.min(5, R.statPts) : 1; R[b.dataset.at] += n; R.statPts -= n; sfx('ui'); if (B) refreshStats(B.p); renderChar(); });
  }
  function renderSmith() {
    const P = G.pl, R = P.rpg, all = [...Object.values(R.eq), ...R.bag.filter(b => GRADES[b.g].rank >= 1 || b.e)].filter(Boolean);
    if (smithSel && !all.includes(smithSel)) smithSel = null;
    const it = smithSel;
    let act = '<p class="dim">왼쪽에서 장비를 고르세요.</p>';
    if (it) { const c = enhCost(it), rc = rerollCost(it), y = dismantleYield(it), e = it.e || 0, eqd = Object.values(R.eq).includes(it);
      act = `<div class="tipin"><img class="tipimg" src="${itemIcon(it)}" alt="">${itemTip(it, P)}</div><div class="smith">
        <div><b>강화 +${e} → +${Math.min(15, e + 1)}</b><small>성공률 ${e >= 15 ? '-' : ENH_RATE[e] + '%'} · 금화 ${c.gold} · 강화석 ${c.stone}${e >= 7 ? ' · 실패 시 1단계 하락' : ''}</small><button class="btn" id="s-enh" ${e >= 15 ? 'disabled' : ''}>강화</button></div>
        <div><b>재련</b><small>레어 · 에픽 옵션 재설정 · 금화 ${rc.gold} · 비급 조각 ${rc.frag}</small><button class="btn ghost" id="s-rr" ${it.g === 'rare' || it.g === 'epic' ? '' : 'disabled'}>재련</button></div>
        <div><b>분해</b><small>강화석 +${y.stone} · 비급 조각 +${y.frag}</small><button class="btn ghost" id="s-dis" ${eqd || it.lk ? 'disabled' : ''}>분해</button></div></div>`; }
    const h = heroOf(), sks = HSK[h.id].filter(s => ACTIVE_TY[s.ty] && R.sk[s.id]);
    $('#cbody').innerHTML = `<div class="eqwrap"><div class="eqleft"><div class="pvbox" id="pvbox"></div><p class="gold">금화 ${R.gold.toLocaleString('ko-KR')} · 강화석 ${R.mats.stone} · 비급 조각 ${R.mats.frag}</p><div class="bag">${all.map(x => `<button class="bs ${x === it ? 'on' : ''}" data-id="${x.id}">${icon(x)}</button>`).join('')}</div></div>
      <div class="eqright">${act}<h4 class="sh">스킬 강화 (+0 ~ +10)</h4><div class="senh">${sks.map(s => { const e = R.enh[s.id] || 0, c = senhCost(e); return `<div><b><img class="sei" src="${skillIcon(s)}" alt="">${s.n} +${e}</b><small>${e >= 10 ? '최대' : `성공 ${SENH_RATE[e]}% · 금화 ${c.gold} · 조각 ${c.frag}`}${e >= 5 ? ' · 각성 I' : ''}</small><button class="btn sm" data-se="${s.id}" ${e >= 10 ? 'disabled' : ''}>강화</button></div>`; }).join('') || '<p class="dim">배운 액티브 스킬이 없습니다.</p>'}</div></div></div>`;
    pvMount($('#pvbox')); pvHighlight(it ? slotType(it.s) : null);
    $('#cbody').querySelectorAll('.bs').forEach(b => { const x = all.find(q => q.id === +b.dataset.id); b.onclick = () => { smithSel = x; renderSmith(); }; b.onmouseenter = e => { pvHighlight(slotType(x.s)); tipShow(x, e); }; b.onmouseleave = () => { tipHide(); pvHighlight(it ? slotType(it.s) : null); }; });
    if ($('#s-enh')) $('#s-enh').onclick = () => { const r = enhance(P, it); msg(r.msg); sfx(r.ok ? (r.up ? 'lvl' : 'no') : 'no'); if (r.up) { if (CAMP.hero) pillar(CAMP.hero.x, CAMP.hero.z, GRADES[it.g].c, 6, .8, .8); PV.flash = 1; afterGearSoft(); } renderSmith(); };
    if ($('#s-rr')) $('#s-rr').onclick = () => { const r = reroll(P, it); msg(r.msg); sfx(r.ok ? 'gear' : 'no'); renderSmith(); };
    if ($('#s-dis')) $('#s-dis').onclick = () => { const y = dismantleYield(it); R.mats.stone += y.stone; R.mats.frag += y.frag; R.bag = R.bag.filter(b => b !== it); smithSel = null; msg(`분해 — 강화석 +${y.stone} · 비급 조각 +${y.frag}`); renderSmith(); };
    $('#cbody').querySelectorAll('[data-se]').forEach(b => b.onclick = () => { const id = b.dataset.se, e = R.enh[id] || 0, c = senhCost(e); if (R.gold < c.gold || R.mats.frag < c.frag) { msg('금화 또는 비급 조각이 부족합니다'); sfx('no'); return; }
      R.gold -= c.gold; R.mats.frag -= c.frag; if (Math.random() * 100 < SENH_RATE[e]) { R.enh[id] = e + 1; msg(`${SKILLS[id].n} +${e + 1} 강화 성공!${e + 1 === 5 ? ' — 각성 I' : e + 1 === 10 ? ' — 각성 II' : ''}`); sfx('lvl'); } else { msg('스킬 강화 실패 (재료 소모)'); sfx('no'); } renderSmith(); });
  }
  function renderSys() {
    const inB = SCENE === 'battle';
    $('#cbody').innerHTML = `<div class="sys"><div class="slots">${[1, 2, 3].map(i => `<div class="slot"><b>슬롯 ${i}</b><small>${esc(slotInfo(i) || '비어 있음')}</small><button class="btn sm" data-sv="${i}">저장</button></div>`).join('')}</div>
      ${inB ? '<p class="dim">전장 도중 저장하면 그 전장은 처음부터 다시 하게 됩니다.</p><button class="btn ghost" id="sy-ret">군영으로 귀환 (전장 포기)</button>' : ''}
      <div class="row"><button class="btn ghost" id="sy-help">조작 · 커맨드 안내</button><button class="btn ghost" id="sy-bgm">배경음악 ${AUDIO.bgm ? '끄기' : '켜기'}</button><button class="btn ghost" id="sy-sfx">효과음 ${AUDIO.sfx ? '끄기' : '켜기'}</button><button class="btn ghost" id="sy-voice">음성 ${VOICE.on ? '끄기' : '켜기'}</button></div><p class="dim">${esc(voiceDesc())}</p><div class="row"><button class="btn ghost" id="sy-title">타이틀로</button></div></div>`;
    $('#cbody').querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { saveGame(+b.dataset.sv) ? msg(`슬롯 ${b.dataset.sv}에 저장했습니다`) : msg('저장 실패 — 브라우저 저장소를 사용할 수 없습니다'); sfx('pick'); renderSys(); });
    if ($('#sy-ret')) $('#sy-ret').onclick = () => { closeModal(); toCamp('귀환 부적으로 군영에 돌아왔다.'); };
    $('#sy-help').onclick = openHelp; $('#sy-title').onclick = () => { closeModal(); toTitle(); };
    $('#sy-bgm').onclick = () => { AUDIO.bgm = !AUDIO.bgm; setPref('bgm', AUDIO.bgm); renderSys(); }; $('#sy-sfx').onclick = () => { AUDIO.sfx = !AUDIO.sfx; setPref('sfx', AUDIO.sfx); renderSys(); }; $('#sy-voice').onclick = () => { setVoice(!VOICE.on); renderSys(); };
  }
  /* ---------- 장비 미리보기 (별도 렌더러) ---------- */
  const PV = { r: null, scene: null, cam: null, f: null, key: '', rot: .5, drag: null, hl: null, flash: 0, focus: new T.Vector3(0, 1.05, 0), dist: 4.6, tFocus: 1.05, tDist: 4.6 };
  const HLM = new Map();
  function pvInit() {
    if (PV.r) return; const c = document.createElement('canvas'); c.className = 'pvc';
    PV.r = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); PV.r.outputEncoding = T.sRGBEncoding; PV.r.toneMapping = T.ACESFilmicToneMapping; PV.r.toneMappingExposure = 1.2;
    PV.scene = new T.Scene(); PV.scene.add(new T.HemisphereLight(0xfff0dc, 0x3a3a58, 1.05));
    const d = new T.DirectionalLight(0xfff4e8, 1.15); d.position.set(2, 4, 5); PV.scene.add(d); const b = new T.DirectionalLight(0x8ab8ff, .8); b.position.set(-3, 2.5, -4); PV.scene.add(b);
    PV.cam = new T.PerspectiveCamera(28, 1, .1, 50);
    const fl = new T.Mesh(new T.CircleGeometry(.85, 48), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .4 })); fl.rotation.x = -Math.PI / 2; PV.scene.add(fl);
    const ring = new T.Mesh(new T.RingGeometry(.8, .86, 64), new T.MeshBasicMaterial({ color: 0xecd08c, transparent: true, opacity: .7 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .005; PV.scene.add(ring);
    c.addEventListener('pointerdown', e => { PV.drag = { x: e.clientX, r: PV.rot }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => { if (PV.drag) PV.rot = PV.drag.r + (e.clientX - PV.drag.x) * .012; });
    c.addEventListener('pointerup', () => { PV.drag = null; }); c.addEventListener('pointercancel', () => { PV.drag = null; });
  }
  function pvMount(host) { if (!host) return; pvInit(); host.innerHTML = ''; host.appendChild(PV.r.domElement); pvBuild(); }
  function pvBuild() {
    const L = heroLook(G.pl), key = JSON.stringify(L.gear) + L.weapon + G.pl.hero; if (PV.f && PV.key === key) return;
    if (PV.f) PV.scene.remove(PV.f.root); HLM.clear();
    const b = buildFighter(L, { elem: heroOf().fx }); PV.f = { ...b, look: L, state: 'idle', st: 0, phase: 0, facing: 1, rotY: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, scale: 1 };
    PV.scene.add(b.root); PV.key = key; const h = PV.hl; PV.hl = undefined; pvHighlight(h);
  }
  const FOCUS = { helm: [1.78, 1.5], armor: [1.4, 2.4], gloves: [1.05, 2.4], boots: [.35, 2.2], belt: [1.1, 2], cape: [1.35, 2.8], neck: [1.5, 1.8], weapon: [1.2, 4], ring: [1.05, 2.4], book: [1.05, 4.6] };
  function pvHighlight(slot) {
    if (!PV.f) { PV.hl = slot; return; } if (PV.hl === slot) return; PV.hl = slot;
    for (const m of PV.f.meshes) m.material = m.userData.mat;
    const fo = slot && FOCUS[slot]; PV.tFocus = fo ? fo[0] : 1.05; PV.tDist = fo ? fo[1] : 4.6;
    if (!slot) return;
    for (const m of PV.f.meshes) if (m.userData.slot === slot || (slot === 'ring' && m.userData.slot === 'gloves')) { const o = m.userData.mat; if (!o || !o.isMaterial) continue;
      let h = HLM.get(o); if (!h) { h = o.clone(); h.onBeforeCompile = o.onBeforeCompile; h.customProgramCacheKey = o.customProgramCacheKey; if (!h.emissive) h.emissive = new T.Color(); h.emissive.set('#ffc850'); h.emissiveIntensity = .5; HLM.set(o, h); } m.material = h; }
  }
  function pvFrame(dt) {
    if (!PV.f || !PV.r || !PV.r.domElement.isConnected) return;
    const el = PV.r.domElement, w = el.clientWidth | 0, h = el.clientHeight | 0; if (w < 2 || h < 2) return;
    const pr = Math.min(2, devicePixelRatio || 1); if (el.width !== Math.round(w * pr) || el.height !== Math.round(h * pr)) { PV.r.setPixelRatio(pr); PV.r.setSize(w, h, false); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); }
    PV.f.st += dt; pose(PV.f, dt); if (!PV.drag) PV.rot += dt * .35; PV.f.root.rotation.y = PV.rot; PV.f.root.position.set(0, 0, 0);
    const pulse = .35 + .3 * Math.sin(W.t * 6) + PV.flash; PV.flash = Math.max(0, PV.flash - dt * 1.5); for (const m of HLM.values()) m.emissiveIntensity = pulse;
    PV.focus.y = lerp(PV.focus.y, PV.tFocus, 1 - Math.exp(-dt * 6)); PV.dist = lerp(PV.dist, PV.tDist, 1 - Math.exp(-dt * 6));
    PV.cam.position.set(0, PV.focus.y + .25, PV.dist); PV.cam.lookAt(0, PV.focus.y, 0); PV.r.render(PV.scene, PV.cam);
  }
  function voiceDesc() { if (!window.speechSynthesis) return '이 브라우저는 음성 합성을 지원하지 않습니다.'; if (!VOICE.all.length) return '한국어 음성을 찾지 못했습니다 — Windows 설정 → 시간 및 언어 → 음성에서 한국어 음성을 설치하세요. (Edge 권장)';
    return `인물의 나이 · 성격에 맞춘 목소리 · 남성 음성: ${VOICE.male ? VOICE.male.name : '없음(음높이로 표현)'} · 여성 음성: ${VOICE.female ? VOICE.female.name : '없음'}`; }
  /* ---------- 저장 슬롯 ---------- */
  function openSlots(mode) {
    const rows = [0, 1, 2, 3].map(i => { const info = slotInfo(i); if (mode === 'save' && i === 0) return ''; return `<div class="slot"><b>${i === 0 ? '자동 저장' : '슬롯 ' + i}</b><small>${esc(info || '비어 있음')}</small><button class="btn sm" data-s="${i}" ${mode === 'load' && !info ? 'disabled' : ''}>${mode === 'load' ? '불러오기' : '저장'}</button></div>`; }).join('');
    openModal(mode === 'load' ? '이어하기' : '저장하기', `<div class="slots">${rows}</div>`);
    $('#panel').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const i = +b.dataset.s;
      if (mode === 'save') { saveGame(i); msg(`슬롯 ${i}에 저장했습니다`); openSlots('save'); return; }
      const d = loadSlot(i); if (!d) return; G = { diffIdx: d.diffIdx, cycle: d.cycle || 0, prog: d.prog || 0, done: !!d.done, treasures: d.treasures || {}, clears: d.clears || {}, flags: d.flags || {}, lampSaved: d.lampSaved, pl: d.pl };
      ITEM_ID = d.iid || 1 + Math.max(0, ...d.pl.rpg.bag.map(b => b.id), ...Object.values(d.pl.rpg.eq).map(b => b.id)); closeModal(); toCamp('저장 기록을 불러왔다.'); });
  }
  /* ---------- 상인 ---------- */
  function openShop() {
    const P = G.pl, R = P.rpg, L = P.lvl;
    openModal('상인', `<p class="gold">금화 <b>${R.gold.toLocaleString('ko-KR')}</b> · 강화석 ${R.mats.stone} · 비급 조각 ${R.mats.frag} <small class="dim">장비 판매는 캐릭터 창 장비 탭에서</small></p>
      <div class="shop">${SHOP.map((s, i) => { const pr = s.p(L, P); const ic = s.inv ? consIcon(s.inv) : s.mat ? consIcon(s.mat) : s.box ? consIcon(s.box === 'gold' ? 'gold' : 'silver') : s.sp ? consIcon('tactic') : consIcon('elixir'); return `<div class="si"><img class="sic2" src="${ic}" alt=""><b>${s.n}</b><small>${s.d}${s.inv ? ` · 보유 ${P.inv[s.inv] || 0}` : ''}</small><button class="btn sm" data-b="${i}" ${R.gold >= pr ? '' : 'disabled'}>${pr.toLocaleString('ko-KR')}</button></div>`; }).join('')}</div><div id="shopres"></div>`);
    $('#panel').querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const s = SHOP[+b.dataset.b], pr = s.p(L, P); if (R.gold < pr) return; R.gold -= pr; let res = s.n + ' 구입';
      if (s.inv) P.inv[s.inv] = Math.min(ITEMS[s.inv].max, (P.inv[s.inv] || 0) + s.q); if (s.mat) R.mats[s.mat]++;
      if (s.box) { const g = rollGrade(s.box === 'gold' ? 'gold' : 'silk', 0); const it = genItem(P.lvl, g === 'myth' && P.lvl < 55 && s.box === 'gold' ? 'excl' : g); R.bag.push(it); res = `<span style="color:${GRADES[it.g].c}">${it.n}</span> 획득!`; }
      if (s.sp) { R.skillPts++; R.books = (R.books || 0) + 1; } if (s.reset) { resetPoints(P); res = '포인트를 모두 돌려받았다'; }
      sfx('gear'); openShop(); $('#shopres').innerHTML = `<p class="res">${res}</p>`; });
  }
  function resetPoints(P) { const R = P.rpg, A = HATTR[HEROES[P.hero].id]; R.statPts = (P.lvl - 1) * 5 + Object.keys(G.clears).length * 5; R.str = A[0]; R.dex = A[1]; R.vit = A[2]; R.ene = A[3];
    let sp = 0; for (const k in R.sk) sp += R.sk[k]; R.skillPts += sp - 1; R.sk = {}; R.sk[`${HEROES[P.hero].id}_00`] = 1; R.hot = [null, null, null, null]; }
  /* ---------- 도박장 ---------- */
  function openGacha(results) {
    const P = G.pl, R = P.rpg, cost = 600 + 40 * P.lvl, pouch = 300 + 15 * P.lvl;
    openModal('도박장 — 천명 뽑기', `<p class="gold">금화 <b>${R.gold.toLocaleString('ko-KR')}</b> · 천장까지 ${50 - (R.pity || 0)}회</p>
      <div class="gacha"><div><b>천명 보물함</b><small>레어 55% · 에픽 30% · 세트 8% · 전용 5% · 신화 2%<br>10회: 1회 무료 · 세트 이상 1개 보장 · 50회 천장</small>
      <div class="row"><button class="btn" id="g1" ${R.gold >= cost ? '' : 'disabled'}>1회 ${cost.toLocaleString('ko-KR')}</button><button class="btn" id="g10" ${R.gold >= cost * 9 ? '' : 'disabled'}>10회 ${(cost * 9).toLocaleString('ko-KR')}</button></div></div>
      <div><b>비급 복주머니</b><small>강화석 · 비급 조각 · 금화 환급 · 비급서 · 대박</small><div class="row"><button class="btn ghost" id="gp" ${R.gold >= pouch ? '' : 'disabled'}>${pouch.toLocaleString('ko-KR')}</button></div></div></div>
      <div class="gres">${(results || []).map(it => typeof it === 'string' ? `<p class="res">${it}</p>` : `<div class="gr" style="--gc:${GRADES[it.g].c}">${icon(it)}<span style="color:${GRADES[it.g].c}">${esc(it.n)}</span></div>`).join('')}</div>`);
    const pull = n => { const out = []; let guaranteed = false; for (let i = 0; i < n; i++) { R.pity = (R.pity || 0) + 1; let g = R.pity >= 50 ? rollGrade('pity') : rollGrade('gacha');
        if (n === 10 && i === 9 && !guaranteed && GRADES[g].rank < 3) g = rollGrade('gacha10'); if (GRADES[g].rank >= 3) guaranteed = true; if (g === 'excl' || g === 'myth') R.pity = 0;
        const it = genItem(Math.max(P.lvl, 5), g, { heroes: [heroOf().id] }); if (R.bag.filter(b => b.g === it.g).length >= 100) { const y = dismantleYield(it); R.mats.stone += y.stone; R.mats.frag += y.frag; } else R.bag.push(it); out.push(it); }
      sfx(out.some(x => GRADES[x.g].rank >= 4) ? 'win' : 'gear'); return out; };
    $('#g1').onclick = () => { R.gold -= cost; openGacha(pull(1)); }; $('#g10').onclick = () => { R.gold -= cost * 9; openGacha(pull(10)); };
    $('#gp').onclick = () => { R.gold -= pouch; const r = Math.random() * 100; let t;
      if (r < 50) { const n = 1 + (Math.random() * 3 | 0); R.mats.stone += n; t = `강화석 +${n}`; } else if (r < 80) { const n = 1 + (Math.random() * 2 | 0); R.mats.frag += n; t = `비급 조각 +${n}`; }
      else if (r < 92) { R.gold += pouch * 2; t = `금화 ${pouch * 2} 환급!`; } else if (r < 97) { R.skillPts++; t = '비급서 — 스킬 포인트 +1!'; } else { R.mats.stone += 10; R.mats.frag += 3; t = '대박! 강화석 +10 · 비급 조각 +3'; }
      sfx('pick'); openGacha([t]); };
  }
  /* ---------- 도움말 ---------- */
  function openHelp() {
    openModal('조작 · 커맨드 안내', `<div class="help"><h4>조작</h4><table><tr><td>이동</td><td>방향키 / WASD</td></tr><tr><td>공격</td><td>Z · J · F (연타 3단 콤보)</td></tr><tr><td>점프</td><td>X · K · G · Space (점프 중 공격 = 점프 공격)</td></tr>
      <tr><td>필살기</td><td>C · L · H (↑+필살 / 5 = 신화 무기 필살기)</td></tr><tr><td>아이템 사용 / 전환</td><td>V · U · R / E · Q · I</td></tr><tr><td>회피</td><td>왼쪽 Shift · O (방향키로 구르기, 없으면 백스텝)</td></tr>
      <tr><td>단축 스킬</td><td>1 · 2 · 3 · 4</td></tr><tr><td>캐릭터 창</td><td>Tab · T</td></tr><tr><td>대사 넘기기</td><td>Enter</td></tr><tr><td>일시정지</td><td>P · Esc</td></tr><tr><td>배경음 / 음성</td><td>N / B</td></tr></table>
      <h4>커맨드</h4><table>${CMDLIST.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
      <h4>RPG</h4><p>전장 → 군영 → 전장을 반복하며 성장한다. 레벨업마다 능력치 5 · 스킬 1 포인트. 무장마다 3계열 × 5단계 스킬 트리. 장비 등급: 노멀 &lt; 레어 &lt; 에픽 &lt; 세트 &lt; 전용 &lt; 신화.
      원소 반응 — 폭뢰(화상+뇌전) · 융해(빙결+화염) · 빙쇄(빙결+강타) · 초전도(감전+빙결). 방패병은 뒤 · 공중 · 강공격으로, 기병의 붉은 돌격선은 옆 줄로 피한다. 기수를 쓰러뜨리면 적이 도주한다.</p></div>`);
  }
  /* ---------- 화용도 선택 · 결말 ---------- */
  function openChoice(def, cb) {
    let idx = 0; const render = () => { openModal(def.title, `<div class="choice"><div class="clines">${def.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>${def.opts.map((o, i) => `<button class="copt ${i === idx ? 'on' : ''}" data-i="${i}"><b>${o.n}</b>${o.d.map(d => `<small>${esc(d)}</small>`).join('')}</button>`).join('')}</div>`, 'choicep');
      $('#p-close').hidden = true; $('#panel').querySelectorAll('.copt').forEach(b => b.onclick = () => { $('#p-close').hidden = false; closeModal(); cb(def.opts[+b.dataset.i]); UI._choice = null; }); };
    UI._choice = { render, next: d => { idx = (idx + d + def.opts.length) % def.opts.length; render(); }, pick: () => { $('#p-close').hidden = false; closeModal(); cb(def.opts[idx]); UI._choice = null; } }; render();
  }
  function ending(trueEnd) {
    G.done = true; saveGame(0); const h = heroOf(), P = G.pl;
    const lines = trueEnd ? ['칠성등의 불꽃이 다시 타올랐다.', '사마의의 군세는 별빛 아래 흩어지고, 한 황실은 다시 일어설 기회를 얻었다.', '— 진(眞) 결말 「한실부흥(漢室復興)」 —'] : ['번성의 물길이 천하를 흔들었다.', '위 · 촉 · 오 세 나라가 솥발처럼 맞선 채, 난세는 새 국면을 맞는다.', '— 결말 「천하삼분(天下三分)」 —'];
    const hy = G.flags.hy === 'gi' ? '화용도에서 목숨을 건진 조조는 끝내 운장을 잊지 못했다 — "그대는 진정한 의인이었소."' : G.flags.hy === 'pae' ? '사로잡힌 조조가 압송되자 위는 조비와 사마의의 손에 넘어갔다. 난세는 새 얼굴로 이어진다.' : '';
    openModal(trueEnd ? '한실부흥' : '천하삼분', `<div class="ending">${lines.map(l => `<p>${esc(l)}</p>`).join('')}${hy ? `<p class="dim">${esc(hy)}</p>` : ''}<p class="hq">${esc(h.end)}</p>
      <p>${h.name} Lv.${P.lvl} · 전공 ${P.score.toLocaleString('ko-KR')}</p>${trueEnd ? '<p class="gold">히든 무장 「여포」가 해금되었다!</p>' : '<p class="dim">— 세 보물(書 · 璽 · 劍)을 모두 모으면 숨겨진 장이 열린다.</p>'}
      <p class="dim">군영에서 「윤회」로 다음 회차(적 레벨 +33)를 시작할 수 있다.</p></div>`, 'endp');
    sfx('win');
  }
  /* ---------- 일시정지 ---------- */
  function togglePause() { if (SCENE !== 'battle') return; if (modal) { closeModal(); return; } pauseOn = !pauseOn; show('#pause', pauseOn); if (pauseOn) $('#pause-cmd').innerHTML = CMDLIST.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join(''); }
  $('#pz-resume').onclick = () => togglePause(); $('#pz-char').onclick = () => { togglePause(); openChar('equip'); }; $('#pz-camp').onclick = () => { togglePause(); toCamp('귀환 부적으로 군영에 돌아왔다.'); }; $('#pz-title').onclick = () => { togglePause(); toTitle(); };
  /* ---------- 키 처리 ---------- */
  function onKey(a, e) {
    if (a === 'bgm') { AUDIO.bgm = !AUDIO.bgm; setPref('bgm', AUDIO.bgm); msg(`배경음악 ${AUDIO.bgm ? '켜기' : '끄기'}`); return; }
    if (a === 'mute') { setVoice(!VOICE.on); msg(`음성 ${VOICE.on ? '켜기' : '끄기'}`); return; }
    if (UI._choice) { if (a === 'up' || a === 'left') UI._choice.next(-1); if (a === 'down' || a === 'right') UI._choice.next(1); if (a === 'start' || a === 'atk') UI._choice.pick(); return; }
    if (modal) { if (a === 'esc' || (a === 'menu' && modal === '캐릭터')) { sfx('ui'); closeModal(); } return; }
    if (SCENE === 'title') { const n = TITLE_ITEMS().length; if (a === 'up') { titleSel = (titleSel + n - 1) % n; renderTitle(); sfx('ui'); } if (a === 'down') { titleSel = (titleSel + 1) % n; renderTitle(); sfx('ui'); }
      if (a === 'left' || a === 'right') titleAct(a === 'left' ? -1 : 1, false); if (a === 'start' || a === 'atk') titleAct(1, true); return; }
    if (SCENE === 'select') { konami.push(a); konami = konami.slice(-8); if (konami.join() === 'up,up,down,down,left,right,left,right' && !getPref('lubu', false)) { setPref('lubu', true); msg('히든 무장 「여포」 해금!'); sfx('win'); enterMenu(); SCENE = 'select'; toSelect(); return; }
      if (a === 'left') setSel((MENU.sel + MENU.list.length - 1) % MENU.list.length); if (a === 'right') setSel((MENU.sel + 1) % MENU.list.length); if (a === 'start' || a === 'atk') startNew(); if (a === 'esc' || a === 'jump') { SCENE = 'title'; onlyScreen('#title'); renderTitle(); } return; }
    if (SCENE === 'story') { if (a === 'start' || a === 'atk') storyGo(); return; }
    if (SCENE === 'camp') { const n = CAMP_MENU().length; if (a === 'up') { campSel = (campSel + n - 1) % n; renderCamp(); sfx('ui'); } if (a === 'down') { campSel = (campSel + 1) % n; renderCamp(); sfx('ui'); } if (a === 'start' || a === 'atk') campAct(); if (a === 'menu') openChar('equip'); return; }
    if (SCENE === 'battle') { if (a === 'pause' || a === 'esc') togglePause(); if (a === 'menu' && !pauseOn) { openChar('equip'); } }
  }
  /* ---------- 터치 ---------- */
  const isTouch = matchMedia('(pointer: coarse)').matches;
  (() => { const stick = $('#stick'), knob = stick.querySelector('i'); let sid = null, sc = { x: 0, y: 0 };
    const move = e => { let dx = e.clientX - sc.x, dy = e.clientY - sc.y; const m = Math.hypot(dx, dy), R0 = 50; if (m > R0) { dx *= R0 / m; dy *= R0 / m; } touchAx.x = Math.abs(dx) > 8 ? dx / R0 : 0; touchAx.z = Math.abs(dy) > 8 ? dy / R0 : 0; knob.style.transform = `translate(${dx}px,${dy}px)`; };
    stick.addEventListener('pointerdown', e => { initAudio(); sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); sc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; move(e); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === sid) move(e); });
    const end = e => { if (e.pointerId === sid) { sid = null; touchAx.x = touchAx.z = 0; knob.style.transform = ''; } }; stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    document.querySelectorAll('[data-k]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); const a = b.dataset.k; pressVirtual(a); if (a === 'menu') onKey('menu'); if (a === 'pause') onKey('pause'); })); })();
  $('#gl').addEventListener('pointerdown', () => { initAudio(); if (SCENE === 'story') storyGo(); if (SCENE === 'battle' && B && talkActive()) pressVirtual('start'); if (SCENE === 'battle' && B && B.clear === 3) pressVirtual('start'); });
  $('#st-go').onclick = () => storyGo(); $('#sel-go').onclick = () => startNew(); $('#sel-back').onclick = () => { SCENE = 'title'; onlyScreen('#title'); renderTitle(); };
  $('#clearp').onclick = () => pressVirtual('start');
  return { dmg, msg, banner, cutin, super: superFlash, clearWorldUI, lootLabel, removeLootLabel, removeEnemyUI, enterBattle, enterCamp, openChar, openChoice, ending, frame, onKey, toTitle,
    paused: () => !!modal || pauseOn, _choice: null };
})();

/* ---------------- 시작 ---------------- */
resize();
const bootGame = () => { UI.toTitle(); requestAnimationFrame(frame); };
if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('900 100px "Noto Serif KR"'), new Promise(r => setTimeout(r, 1500))]).then(bootGame, bootGame); else bootGame();
