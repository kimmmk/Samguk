"""AI 동작 프레임(anim3/<id>) → 도트 에디션 스프라이트 팩(sprites/ai_<id>).
같은 무장 id 로 등록해 기존 팩을 덮어쓴다. manifest 에서 ai_<id> 를 빼면 원래 팩으로 돌아간다.
실행: venv\\Scripts\\python build_pack.py zhao guan
"""
import os, sys, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = r'C:\Users\audrl\OneDrive\Documents\카카오톡 받은 파일\삼국전기_RPG_DNF'
COLS = 10
for cid in sys.argv[1:] or ['zhao', 'guan']:
    src = os.path.join(HERE, 'anim3', cid); meta = json.load(open(os.path.join(src, 'meta.json')))
    fw, fh, atk = meta['fw'], meta['fh'], meta['attack']
    order = ['idle', 'walk', atk]; frames = []; idx = {}
    for an in order:
        idx[an] = []
        for i in range(meta['anims'][an]): idx[an].append(len(frames)); frames.append((an, i))
    rows = (len(frames) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (fw * COLS, fh * rows))
    for k, (an, i) in enumerate(frames): sheet.paste(Image.open(os.path.join(src, f'{an}_{i}_dot.png')).convert('RGBA'), ((k % COLS) * fw, (k // COLS) * fh))
    out = os.path.join(GAME, 'sprites', 'ai_' + cid); os.makedirs(out, exist_ok=True)
    sheet.save(os.path.join(out, 'body.png'))
    A = idx[atk]
    anims = {'idle': {'frames': idx['idle'], 'loop': True, 'fps': 6}, 'walk': {'frames': idx['walk'], 'loop': True, 'fps': 8}, 'run': {'frames': idx['walk'], 'loop': True, 'fps': 13},
             'attack1': {'frames': A}, 'attack2': {'frames': A}, 'attack3': {'frames': A}, 'dashatk': {'frames': A[2:], 'dur': 24}, 'cmd': {'frames': A, 'dur': 26},
             'cast': {'frames': A[:3], 'dur': 30}, 'special': {'frames': A + A[::-1], 'dur': 60}, 'jatk': {'frames': A[2:], 'dur': 10}, 'rise': {'frames': A, 'dur': 20}}
    tips = [meta['tips'][an][i] for an, i in frames]
    d = {'id': cid, 'base': f'sprites/ai_{cid}/', 'name': 'AI ' + cid, 'fw': fw, 'fh': fh, 'cols': COLS, 'anchor': meta['anchor'], 'scale': 1,
         'layers': ['body'], 'sheets': {'body': 'body.png'}, 'anims': anims, 'tips': tips}
    open(os.path.join(out, 'anim.js'), 'w', encoding='utf-8').write(
        f"/* AI 생성 스프라이트 팩 ({cid}) — sprite_ai 파이프라인(LoRA · ControlNet · 무기 합성 · 혼합 도트)으로 만든 대기 · 걷기 · 공격 동작.\n"
        f"   무장 id '{cid}' 로 등록되어 기존 팩을 대신한다. sprites/manifest.js 에서 \"ai_{cid}\" 를 빼면 원래대로. 없는 동작은 대기로 대신한다. */\n"
        f"SPR_REGISTER({json.dumps(d, ensure_ascii=False)});\n")
    print('pack', cid, fw, fh, len(frames), 'frames ->', out)
# manifest 에 추가 (원래 팩 뒤에 불러와 덮어쓰도록 끝에 둔다)
mf = os.path.join(GAME, 'sprites', 'manifest.js'); s = open(mf, encoding='utf-8').read()
import re
lst = json.loads(re.search(r'SPRITE_MANIFEST=(\[.*?\]);', s).group(1))
for cid in sys.argv[1:] or ['zhao', 'guan']:
    if 'ai_' + cid in lst: lst.remove('ai_' + cid)
    lst.append('ai_' + cid)
s = re.sub(r'SPRITE_MANIFEST=\[.*?\];', 'SPRITE_MANIFEST=' + json.dumps(lst) + ';', s); open(mf, 'w', encoding='utf-8').write(s)
print('manifest', lst[-3:])
