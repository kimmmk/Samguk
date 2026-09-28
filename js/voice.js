'use strict';
/* ===== 음성(TTS): 연의 속 인물의 나이 · 성격에 맞춘 목소리 =====
   브라우저 Web Speech API 의 한국어 음성을 쓴다. 남/녀 음성이 모두 있으면 성별로 고르고,
   한 가지뿐이면 음높이(pitch) · 빠르기(rate)로 나이와 성격을 표현한다.
   g: 성별 · p: 음높이(남성 음성 기준 1=보통) · r: 빠르기 · v: 크기 · note: 연기 방향 */
const VOICE_PROFILE = {
  '관우': { g: 'm', p: .72, r: .86, v: 1, note: '중년 · 위엄 · 과묵, 낮고 느리게' },
  '장비': { g: 'm', p: .62, r: 1.14, v: 1, note: '호쾌 · 다혈질, 우렁차고 빠르게' },
  '조운': { g: 'm', p: 1.02, r: 1.0, v: .95, note: '청년 · 침착 · 충직, 맑고 단정하게' },
  '황충': { g: 'm', p: .58, r: .84, v: 1, note: '칠순 노장 · 호탕, 굵고 느리게' },
  '제갈량': { g: 'm', p: .92, r: .88, v: .9, note: '와룡 · 차분한 지략가, 온화하고 느긋하게' },
  '마초': { g: 'm', p: 1.06, r: 1.1, v: 1, note: '젊은 맹장 · 격정, 힘차고 빠르게' },
  '초선': { g: 'f', p: 1.18, r: .92, v: .9, note: '절세미인 · 우아, 부드럽고 느리게' },
  '위연': { g: 'm', p: .66, r: 1.06, v: 1, note: '반골 · 거칠고 오만하게' },
  '여포': { g: 'm', p: .64, r: .94, v: 1, note: '천하무쌍 · 오만 · 위압, 낮고 여유롭게' },
  '서황': { g: 'm', p: .74, r: .96, v: 1, note: '강직한 명장, 무게 있게' },
  '감녕': { g: 'm', p: .98, r: 1.2, v: 1, note: '수적 출신 · 호탕 · 경박, 빠르고 가볍게' },
  '손상향': { g: 'f', p: 1.34, r: 1.12, v: 1, note: '활발한 공주, 높고 경쾌하게' },
  '유비': { g: 'm', p: .88, r: .9, v: .95, note: '인자한 군주, 따뜻하고 차분하게' },
  '미부인': { g: 'f', p: 1.14, r: .88, v: .85, note: '연약한 부인, 조용하고 애절하게' },
  '미축': { g: 'm', p: .96, r: .96, v: .9, note: '상인 출신 참모, 온화하게' },
  '황개': { g: 'm', p: .56, r: .9, v: 1, note: '노장 · 우직, 거칠고 굵게' },
  '장각': { g: 'm', p: .6, r: .82, v: 1, note: '광신 도사 · 노인, 음산하고 느리게' },
  '하후돈': { g: 'm', p: .6, r: 1.06, v: 1, note: '외눈 맹장 · 호전, 거칠게' },
  '하후연': { g: 'm', p: .82, r: 1.22, v: 1, note: '질풍 · 급한 성미, 빠르게' },
  '허저': { g: 'm', p: .5, r: .9, v: 1, note: '우직한 거한, 아주 굵고 둔하게' },
  '장료': { g: 'm', p: .78, r: 1.0, v: 1, note: '냉철한 명장, 단호하게' },
  '조조': { g: 'm', p: .78, r: .92, v: 1, note: '난세의 간웅 · 여유 · 교활, 느긋하게' },
  '안량': { g: 'm', p: .64, r: 1.06, v: 1, note: '하북 맹장 · 오만, 크게' },
  '방덕': { g: 'm', p: .66, r: .94, v: 1, note: '충절 · 비장, 무겁게' },
  '사마의': { g: 'm', p: .7, r: .84, v: .95, note: '낭고의 군사 · 음험 · 냉정, 낮고 느리게' },
  '하후은': { g: 'm', p: 1.0, r: 1.06, v: 1, note: '젊은 총신 · 자만' },
  '전령': { g: 'm', p: 1.02, r: 1.18, v: .95, note: '다급하게' }, '병사': { g: 'm', p: .96, r: 1.14, v: .95, note: '다급하게' },
  '안내': { g: 'f', p: 1.0, r: 1.04, v: .8, note: '담담한 안내' }, '__narrator': { g: 'f', p: .96, r: .92, v: .85, note: '이야기꾼' },
};
const VOICE = { on: getPref('voice', true), all: [], male: null, female: null, any: null, queueN: 0 };
function loadVoices() {
  if (!window.speechSynthesis) return;
  VOICE.all = speechSynthesis.getVoices().filter(v => /^ko/i.test(v.lang));
  const pick = re => VOICE.all.find(v => re.test(v.name));
  VOICE.male = pick(/InJoon|Hyunsu|Minsang|Bong|GookMin|Male|남/i) || null;
  VOICE.female = pick(/Heami|SunHi|Yuna|JiMin|Seoyeon|Female|여|Google/i) || null;
  VOICE.any = VOICE.all[0] || null;
}
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function voiceClean(t) {
  return String(t).replace(/\([^)]*\)/g, '').replace(/[「」『』"“”]/g, '').replace(/…+/g, ', ').replace(/—/g, ', ').replace(/[·]/g, ' ').replace(/\s+/g, ' ').trim();
}
function profileOf(who) {
  if (VOICE_PROFILE[who]) return VOICE_PROFILE[who];
  const h = HEROES.find(h => h.name === who); if (h && h.look.face === 'female') return { g: 'f', p: 1.15, r: 1, v: .95 };
  return { g: 'm', p: .8, r: 1, v: .95 };
}
function speak(who, text, o = {}) {
  if (!VOICE.on || !window.speechSynthesis || !text) return null;
  const t = voiceClean(text); if (!t) return null;
  const P = profileOf(who), u = new SpeechSynthesisUtterance(t);
  u.lang = 'ko-KR';
  let voice = null, pitch = P.p;
  if (P.g === 'm') { if (VOICE.male) { voice = VOICE.male; pitch = P.p * 1.05; } else { voice = VOICE.female || VOICE.any; pitch = P.p * .78; } }
  else { voice = VOICE.female || VOICE.any; pitch = P.p; }
  if (voice) u.voice = voice;
  u.pitch = clamp(pitch * (o.pitch || 1), .1, 2); u.rate = clamp(P.r * (o.rate || 1), .5, 1.8); u.volume = clamp((P.v || 1) * (o.vol ?? 1), 0, 1);
  if (o.interrupt !== false) speechSynthesis.cancel();
  VOICE.queueN++; u.onend = u.onerror = () => { VOICE.queueN = Math.max(0, VOICE.queueN - 1); };
  try { speechSynthesis.speak(u); } catch (e) { return null; }
  return u;
}
/* 기술 외침: 짧고 힘차게 */
function shout(who, name) { return speak(who, name + '!', { rate: 1.12, pitch: 1.04, vol: 1 }); }
const voiceBusy = () => !!(window.speechSynthesis && VOICE.on && (speechSynthesis.speaking || speechSynthesis.pending));
function voiceStop() { if (window.speechSynthesis) speechSynthesis.cancel(); VOICE.queueN = 0; }
function setVoice(on) { VOICE.on = on; setPref('voice', on); if (!on) voiceStop(); }
