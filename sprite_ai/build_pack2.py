"""gen/<id> 의 AI 도트 프레임 → 도트 에디션 스프라이트 팩(sprites/ai_<팩 id>) + manifest 등록.
- 무장: 무장 id 로 등록 (기존 팩 대체)
- 병사: 위(魏)군 기준 프레임에서 파란색만 바꿔 4세력(en_<세력>_<병종>) 팩을 만든다
- 보스: boss_<id>, 촘촘한 도트(P=4)라 scale 로 크기를 맞춘다
실행: venv\\Scripts\\python build_pack2.py hero:zhao hero:guan foot:s foot:sp ... boss:lubu ...
"""
import os, sys, json, re, colorsys, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = r'C:\Users\audrl\OneDrive\Documents\카카오톡 받은 파일\삼국전기_RPG_DNF'
COLS, BASE_P = 10, 5
FACTION_HUE = {'wei': None, 'yellow': (48, 1.05, 1.08), 'dong': (356, 1.0, .82), 'yuan': (36, .75, .92)}  # (색상°, 채도 배율, 명도 배율)

def recolor(img, target):
    """파란 계열(색상 185~255°)만 목표 색으로 — 피부 · 금속 · 붉은 장식은 그대로."""
    if target is None: return img
    a = np.array(img).astype(np.float32) / 255; rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = d / (mx + 1e-6); v = mx
    m = (h > 185) & (h < 255) & (s > .18) & (v > .06) & (a[..., 3] > 0)
    th, sm, vm = target; hn = np.full_like(h, th / 60); sn = np.clip(s * sm, 0, 1); vn = np.clip(v * vm, 0, 1)
    c = vn * sn; x = c * (1 - np.abs(hn % 2 - 1)); z = np.zeros_like(c); i = np.floor(hn).astype(int) % 6
    sel = [(c, x, z), (x, c, z), (z, c, x), (z, x, c), (x, z, c), (c, z, x)]
    out = np.zeros_like(rgb)
    for k, (R, G, B) in enumerate(sel):
        mk = i == k; out[..., 0][mk] = R[mk]; out[..., 1][mk] = G[mk]; out[..., 2][mk] = B[mk]
    out += (vn - c)[..., None]
    rgb[m] = out[m]; a[..., :3] = rgb
    return Image.fromarray((a * 255).clip(0, 255).astype(np.uint8))

def seq(meta, an): return [(an, i) for i in range(meta['anims'].get(an, 0))]
def build(kind, gid, pack_id, target=None, extra=None):
    src = os.path.join(HERE, 'gen', gid); meta = json.load(open(os.path.join(src, 'meta.json')))
    fw, fh, P = meta['fw'], meta['fh'], meta['P']
    frames = [(an, i) for an, n in meta['anims'].items() for i in range(n)]; idx = {k: j for j, k in enumerate(frames)}
    rows = (len(frames) + COLS - 1) // COLS; sheet = Image.new('RGBA', (fw * COLS, fh * rows))
    ax, ay = meta['anchor']
    def laid(im, deg):
        """AI 가 옆으로 누운 자세를 못 그려서, 피격 프레임을 발 기준으로 뒤로 눕혀 날아감 · 쓰러짐 프레임을 만든다."""
        r = im.rotate(deg, resample=Image.NEAREST, center=(ax, ay))
        a = np.array(r); ys = np.where(a[..., 3].max(1) > 0)[0]
        if len(ys) and deg > 60: r = Image.fromarray(np.roll(a, ay - ys.max(), axis=0))   # 누운 몸이 땅에 닿게
        return r
    hurt0 = os.path.join(src, 'hurt_0_dot.png')
    for j, (an, i) in enumerate(frames):
        if an == 'down' and os.path.exists(hurt0): im = laid(Image.open(hurt0).convert('RGBA'), 40 if i == 0 else 84)
        else: im = Image.open(os.path.join(src, f'{an}_{i}_dot.png')).convert('RGBA')
        sheet.paste(recolor(im, target), ((j % COLS) * fw, (j // COLS) * fh))
    F = lambda *ans: [idx[k] for an in ans for k in seq(meta, an)]
    loop = lambda fr, fps: {'frames': fr, 'loop': True, 'fps': fps}
    A = {'idle': loop(F('idle'), 6), 'walk': loop(F('walk'), 9), 'run': loop(F('run') or F('walk'), 13),
         'hurt': {'frames': F('hurt')}, 'fall': {'frames': F('down')[:1], 'dur': 30}, 'down': {'frames': F('down')[1:] or F('down'), 'dur': 50}, 'stun': loop(F('hurt'), 4)}
    if kind == 'hero':
        A.update({'attack1': {'frames': F('attack1')}, 'attack2': {'frames': F('attack2')}, 'attack3': {'frames': F('attack3')},
                  'dashatk': {'frames': F('attack1')[1:], 'dur': 24}, 'jump': {'frames': F('jump')}, 'jatk': {'frames': F('jatk'), 'dur': 10},
                  'rise': {'frames': F('attack2'), 'dur': 20}, 'spin': {'frames': F('attack2') + F('attack3'), 'dur': 32}, 'cmd': {'frames': F('attack3'), 'dur': 26},
                  'cast': {'frames': F('cast'), 'dur': 30}, 'special': {'frames': F('attack1', 'attack2', 'attack3', 'win'), 'dur': 60},
                  'dodge': {'frames': F('dodge'), 'dur': 22}, 'backstep': {'frames': F('dodge'), 'dur': 22}, 'win': {'frames': F('win'), 'dur': 50}, 'use': {'frames': F('cast'), 'dur': 14}})
    else:
        A.update({'attack1': {'frames': F('attack1'), 'dur': 24 if kind == 'boss' else 34}, 'cast': loop(F('cast') or F('attack1')[:2], 8)})
        if meta['anims'].get('shoot'): A['shoot'] = {'frames': F('shoot'), 'dur': 34}
    out = os.path.join(GAME, 'sprites', 'ai_' + pack_id); os.makedirs(out, exist_ok=True); sheet.save(os.path.join(out, 'body.png'))
    d = {'id': pack_id, 'base': f'sprites/ai_{pack_id}/', 'name': 'AI ' + pack_id, 'fw': fw, 'fh': fh, 'cols': COLS, 'anchor': meta['anchor'],
         'scale': round(P / BASE_P * (.85 if kind == 'boss' else 1), 4),   # 보스: 게임이 1.5배쯤 키워 그리므로 6등신 AI 그림은 조금 줄인다
         'layers': ['body'], 'sheets': {'body': 'body.png'}, 'anims': A, 'tips': meta['tips']}
    open(os.path.join(out, 'anim.js'), 'w', encoding='utf-8').write(
        f"/* AI 생성 스프라이트 팩 ({pack_id}) — sprite_ai 파이프라인(ControlNet 포즈 · 기준 그림 · 무기 합성 · 혼합 도트)으로 만든 동작.\n"
        f"   '{pack_id}' 로 등록되어 기존 팩을 대신한다. sprites/manifest.js 에서 \"ai_{pack_id}\" 를 빼면 원래대로. */\nSPR_REGISTER({json.dumps(d, ensure_ascii=False)});\n")
    print('pack', pack_id, fw, fh, len(frames), 'scale', d['scale'], flush=True); return 'ai_' + pack_id

if __name__ == '__main__':
    added = []
    for a in sys.argv[1:]:
        kind, gid = a.split(':')
        if kind == 'hero': src, _, pid = gid.partition('='); added.append(build('hero', src, pid or src))
        elif kind == 'foot':
            for fac, tgt in FACTION_HUE.items(): added.append(build('foot', 'en_' + gid, f'en_{fac}_{gid}', tgt))
        elif kind == 'boss': added.append(build('boss', 'boss_' + gid, 'boss_' + gid))
    mf = os.path.join(GAME, 'sprites', 'manifest.js'); s = open(mf, encoding='utf-8').read()
    lst = json.loads(re.search(r'SPRITE_MANIFEST=(\[.*?\]);', s).group(1))
    for k in added:
        if k in lst: lst.remove(k)
        lst.append(k)
    s = re.sub(r'SPRITE_MANIFEST=\[.*?\];', 'SPRITE_MANIFEST=' + json.dumps(lst) + ';', s); open(mf, 'w', encoding='utf-8').write(s)
    print('manifest +', len(added), flush=True)
