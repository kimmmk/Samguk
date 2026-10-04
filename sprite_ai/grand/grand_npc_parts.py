"""그랑풍 NPC 부품 분리 + 아군 병사 · 전령(초록 군복 색 변환) + 팩 목록 갱신.
실행: venv\\Scripts\\python grand\\grand_npc_parts.py <npc_pick.json>
  json: {"pick": {"liubei": "n_liubei_7.png", ...}, "mirror": ["liubei", ...]}
"""
import os, sys, json, shutil, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import grand_parts_all as GP
A = GP.A
HERE = GP.HERE; C = GP.C; R = GP.R
cfg = json.load(open(sys.argv[1], encoding='utf-8'))
PICK, MIR = cfg.get('pick', {}), set(cfg.get('mirror', []))
GP.MIRROR.update(json.load(open(os.path.join(HERE, 'parts_pick.json'), encoding='utf-8')).get('mirror', []))
WD = GP.WD
wp = {'sword': R('refs/w_sword_5.png'), 'bigdao': R('refs/w_bigdao_5.png'), 'fan': os.path.join(WD, 'fan.png'),
      'baby': GP.W('baby', C('w_baby.png'), key_bg=True), 'spear': R('weapon/zhao_4.png'), 'flag': os.path.join(WD, 'flag.png')}
P_CL = 'chinese clothes, robe, detailed, clean lineart, cel shading'
J = {  # id: (무기, 길이, 쥐는 위치, 인페인팅 설명, 무기 없앰)
  'liubei':   ('sword', 52, .15, 'green and gold robe, light armor', False),
  'mifuren':  ('baby', 30, .5, 'light purple and white dress', False),
  'huanggai': ('bigdao', 80, .3, 'red lamellar armor', False),
  'mizhu':    ('sword', 40, .15, 'brown silk robe', True),
  'fazheng':  ('fan', 34, .3, 'dark green robe', False)}
only = sys.argv[2:]
for cid, (w, l, g, prm, strip) in J.items():
    if only and cid not in only: continue
    if cid not in PICK: print('SKIP', cid, flush=True); continue
    src = C(PICK[cid])
    if cid in MIR:
        src = GP.mirrored(src); f0 = os.path.join(HERE, 'work', cid, 'armless.png')
        if os.path.exists(f0) and os.path.getmtime(f0) < os.path.getmtime(src): os.remove(f0)
    try:
        A.run(cid, src, wp[w], l, g, f'{prm}, {P_CL}')
        if strip:   # 무기 없는 인물: rig 에서 무기 부품 제거
            rp = os.path.join(A.GAME, 'grand', cid, 'rig.js'); t = open(rp, encoding='utf-8').read()
            m = re.search(r'GRAND_REGISTER\((.*)\);', t, re.S); rig = json.loads(m.group(1)); rig['parts'].pop('weapon', None)
            open(rp, 'w', encoding='utf-8').write(t[:m.start()] + 'GRAND_REGISTER(' + json.dumps(rig) + ');\n')
    except Exception as e: print('FAIL', cid, repr(e)[:300], flush=True)
# 아군(유비군) 병사 · 전령: 위(파랑) 원화 → 초록
for cid, tok, w, l, g in [('ally_sp', 'sp', 'spear', 84, .36), ('ally_fl', 'fl', 'flag', 92, .25)]:
    if only and cid not in only: continue
    src = C(GP.PICK.get('en_' + tok, f'b_en_{tok}_7.png')) if GP.PICK else C(f'b_en_{tok}_7.png')
    pk = json.load(open(os.path.join(HERE, 'parts_pick.json'), encoding='utf-8')).get('pick', {})
    src = C(pk.get('en_' + tok, f'b_en_{tok}_7.png'))
    if 'en_' + tok in GP.MIRROR: src = GP.mirrored(src)
    b = os.path.join(HERE, 'work', f'wei_{tok}', 'armless.png'); d = os.path.join(HERE, 'work', cid)
    if os.path.exists(b): os.makedirs(d, exist_ok=True); shutil.copy(b, os.path.join(d, 'armless.png'))
    try: A.run(cid, src, wp[w], l, g, 'green uniform, ' + GP.P_ARMOR, hue=125)
    except Exception as e: print('FAIL', cid, repr(e)[:300], flush=True)
G = os.path.join(A.GAME, 'grand'); ids = sorted(d for d in os.listdir(G) if os.path.exists(os.path.join(G, d, 'rig.js')))
open(os.path.join(G, 'manifest.js'), 'w', encoding='utf-8').write('/* 그랑풍 부품 팩 목록 — sprite_ai/grand/grand_parts_all.py 가 자동 생성 */' + chr(10) + 'window.GRAND_MANIFEST=' + json.dumps(ids) + ';' + chr(10))
print('ALL DONE', len(ids), 'packs', flush=True)
