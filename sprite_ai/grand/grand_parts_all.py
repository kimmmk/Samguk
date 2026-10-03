"""그랑풍 전체 캐릭터 부품 일괄 분리 (autoparts.run 반복).
- 인페인팅 파이프라인은 한 번만 불러 재사용한다.
- 병사는 파란(위) 원화 하나로 인페인팅한 뒤, 세력 색(황건 48 · 동탁 356 · 원소 36)은 armless 를 복사해 색만 바꾼다.
실행: venv\\Scripts\\python grand\\grand_parts_all.py [id ...]   (id 를 주면 그것만)
"""
import os, sys, shutil, numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import autoparts as A
import dnfai as D
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
C = lambda f: os.path.join(HERE, 'cand', f); R = lambda f: os.path.join(ROOT, f)

_PIPE = {}
def inpaint_cached(src_rgb, mask, prompt):
    import cv2
    from diffusers import StableDiffusionXLInpaintPipeline, AutoencoderKL, EulerAncestralDiscreteScheduler
    if 'p' not in _PIPE:
        dt = torch.float16
        p = StableDiffusionXLInpaintPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', vae=AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt), torch_dtype=dt)
        p.vae.register_to_config(force_upcast=False); p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config); p.enable_model_cpu_offload(); _PIPE['p'] = p
    p = _PIPE['p']; m = mask.astype(np.uint8) * 255; pre = cv2.inpaint(src_rgb, m, 21, cv2.INPAINT_TELEA)
    return np.array(p(prompt=prompt, negative_prompt=D.NEG + ', arm, hand, fist, sleeve, gauntlet, shoulder pad, weapon, extra limbs, person', image=Image.fromarray(pre),
            mask_image=Image.fromarray(m), strength=.6, num_inference_steps=40, guidance_scale=5, padding_mask_crop=160, width=src_rgb.shape[1], height=src_rgb.shape[0],
            generator=torch.Generator('cpu').manual_seed(11)).images[0])
A.inpaint_arm = inpaint_cached

def horiz(src, out, rot=0, flip=False, key_bg=False):
    """무기 원본을 '가로 · 날이 오른쪽' 흰 배경 이미지로 맞춘다 (autoparts 는 오른쪽 끝을 무기 끝으로 본다)."""
    im = Image.open(src)
    if im.mode == 'RGBA': bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im); im = bg
    im = im.convert('RGB')
    if key_bg:                                           # 회색 배경 → 흰색 (모서리에서 비슷한 색을 채운다)
        import cv2
        a = np.array(im); m = np.zeros((a.shape[0] + 2, a.shape[1] + 2), np.uint8)
        for x, y in [(0, 0), (a.shape[1] - 1, 0), (0, a.shape[0] - 1), (a.shape[1] - 1, a.shape[0] - 1)]:
            cv2.floodFill(a, m, (x, y), (255, 255, 255), (16, 16, 16), (16, 16, 16), 4 | cv2.FLOODFILL_FIXED_RANGE)
        im = Image.fromarray(a)
    if rot: im = im.rotate(rot, expand=True, fillcolor='white')
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    pad = Image.new('RGB', (im.width + 80, im.height + 80), 'white'); pad.paste(im, (40, 40)); pad.save(out); return out

WD = os.path.join(HERE, 'work', 'weapons'); os.makedirs(WD, exist_ok=True)
def W(name, src, rot=0, flip=False, key_bg=False): return horiz(src, os.path.join(WD, name + '.png'), rot, flip, key_bg)

P_ARMOR = 'chinese armor, torso, clothes, detailed, clean lineart, cel shading'
def build():
    wp = {
      'glaive': W('glaive', R('weapon/guan13_item2.png'), rot=-90),
      'spear': R('weapon/zhao_4.png'), 'halberd': R('refs/w_halberd_5.png'), 'bigdao': R('refs/w_bigdao_5.png'), 'sword': R('refs/w_sword_5.png'),
      'dao': W('dao', R('refs/w_dao_5.png'), flip=True), 'staff': W('staff', R('refs/w_staff_5.png'), flip=True), 'mace': W('mace', R('refs/w_mace_5.png'), flip=True),
      'flag': W('flag', R('refs/w_flag_5.png'), flip=True),
      'fan': W('fan', C('w_fan.png'), flip=FLIP.get('fan', False), key_bg=True), 'axe': W('axe', C('w_axe.png'), flip=FLIP.get('axe', False), key_bg=True),
      'whip': W('whip', C('w_whip.png'), flip=FLIP.get('whip', False), key_bg=True), 'bow': W('bow', C('w_bow.png'), key_bg=True),
    }
    # id: (원화, 무기, 길이(유닛), 쥐는 위치, 인페인팅 설명, 색상(None=그대로))
    J = {
      'guan':  (C('b_guan_7.png'), 'glaive', 100, .4, 'green robe, green and gold armor', None),
      'zhang': (C('b_zhang_7.png'), 'spear', 100, .36, 'black armor with red trim', None),
      'huang': (C('b_huang_31.png'), 'dao', 60, .16, 'orange and brown armor', None),
      'zhuge': (C('b_zhuge_7.png'), 'fan', 34, .3, 'white and purple robe', None),
      'ma':    (C('b_ma_7.png'), 'spear', 92, .34, 'silver and white armor, gold trim', None),
      'diao':  (C('b_diao_7.png'), 'sword', 52, .15, 'pink dress', None),
      'wei':   (C('b_wei_7.png'), 'bigdao', 80, .3, 'dark red and black armor', None),
      'xu':    (C('b_xu_7.png'), 'axe', 76, .3, 'dark blue armor', None),
      'gan':   (C('b_gan_7.png'), 'whip', 84, .1, 'yellow and black clothes', None),
      'sun':   (C(PICK.get('sun', 'b_sun_7.png')), 'bow', 62, .5, 'red and gold armor dress', None),
      # 보스
      'b_xiahouen':   (C('b_b_xiahouen_7.png'), 'sword', 54, .15, 'blue armor', None),
      'b_zhangjiao':  (C('b_b_zhangjiao_7.png'), 'staff', 86, .4, 'yellow taoist robe', None),
      'b_xuchu':      (C('b_b_xuchu_7.png'), 'mace', 80, .3, 'bare chest, fur', None),
      'b_zhangliao':  (C('b_b_zhangliao_7.png'), 'halberd', 100, .38, 'dark blue armor', None),
      'b_caocao':     (C('b_b_caocao_7.png'), 'sword', 56, .15, 'black and gold armor', None),
      'b_simayi':     (C('b_b_simayi_7.png'), 'fan', 36, .3, 'dark purple robe', None),
      'b_yanliang':   (C('b_b_yanliang_7.png'), 'bigdao', 86, .3, 'brown and gold armor', None),
      'b_xiahoudun':  (C('b_b_xiahoudun_7.png'), 'spear', 96, .34, 'blue armor', None),
      'b_xiahouyuan': (C('b_b_xiahouyuan_7.png'), 'bow', 64, .5, 'blue armor', None),
      'b_pangde':     (C('b_b_pangde_7.png'), 'bigdao', 86, .3, 'dark grey armor', None),
      'lubu':         (C('lubu_w7.png'), 'halberd', 100, .38, 'red and gold ornate armor, red cape', None),
    }
    for k, v in list(J.items()):
        if k in PICK: J[k] = (C(PICK[k]),) + v[1:]
    # 병사: 위(파랑) 원본 + 세력 색
    SOLD = {'s': ('sword', 46, .15), 'sp': ('spear', 84, .36), 'a': ('bow', 56, .5), 'o': ('dao', 58, .16), 'sh': ('sword', 46, .15), 'fl': ('flag', 92, .25)}
    HUE = {'wei': None, 'yellow': 48, 'dong': 356, 'yuan': 36}
    for tok, (w, l, g) in SOLD.items():
        for fac, hue in HUE.items():
            cid = f'{fac}_{tok}'
            if cid == 'dong_sp': continue                    # 수직 슬라이스 때 만든 것 유지
            J[cid] = (C(PICK.get('en_' + tok, f'b_en_{tok}_7.png')), w, l, g, 'blue uniform, ' + P_ARMOR, hue, f'wei_{tok}')
    return wp, J

def mirrored(src):
    """왼쪽을 보고 그려진 원화를 오른쪽 보기로: 뼈대 중심선(x=FX)을 기준으로 좌우 반전 → 관절 위치가 그대로 맞는다."""
    from grand_gen import FX
    out = os.path.join(HERE, 'work', 'mirror', os.path.basename(src)); os.makedirs(os.path.dirname(out), exist_ok=True)
    im = Image.open(src).convert('RGB'); fl = im.transpose(Image.FLIP_LEFT_RIGHT); sh = (im.width - 1) - 2 * FX   # x -> 2FX - x
    c = Image.new('RGB', im.size, 'white'); c.paste(fl, (-sh, 0)); c.save(out); return out

FLIP = {}   # 생성된 무기 방향 확인 후 채움 (날이 왼쪽이면 True)
MIRROR = set()   # 왼쪽을 보고 그려진 원화 (id 또는 en_<병종>)
PICK = {}   # 원화 후보 고르기 (기본 _7)
if __name__ == '__main__':
    import json
    cfg = os.path.join(HERE, 'parts_pick.json')
    if os.path.exists(cfg): c = json.load(open(cfg, encoding='utf-8')); FLIP.update(c.get('flip', {})); PICK.update(c.get('pick', {})); MIRROR.update(c.get('mirror', []))
    wp, J = build(); only = sys.argv[1:]
    order = sorted(J, key=lambda k: (len(J[k]) > 6, not k.startswith('wei_'), k))   # 병사 원본(wei_*)이 색 바꾼 것보다 먼저
    for cid in order:
        if only and cid not in only: continue
        v = J[cid]; src, w, l, g, prm, hue = v[:6]; base = v[6] if len(v) > 6 else None
        if not os.path.exists(src): print('SKIP (원화 없음)', cid, src, flush=True); continue
        tok = cid.split('_', 1)[1] if base else None
        if cid in MIRROR or (tok and 'en_' + tok in MIRROR):
            src = mirrored(src)
            if not base or base == cid:                        # 반전 전 인페인팅 결과는 버린다
                f0 = os.path.join(HERE, 'work', cid, 'armless.png')
                if os.path.exists(f0) and os.path.getmtime(f0) < os.path.getmtime(src): os.remove(f0)
        if base and base != cid:                               # 같은 원화의 armless 재사용
            b = os.path.join(HERE, 'work', base, 'armless.png'); d = os.path.join(HERE, 'work', cid)
            if os.path.exists(b): os.makedirs(d, exist_ok=True); shutil.copy(b, os.path.join(d, 'armless.png'))
        try: A.run(cid, src, wp[w], l, g, f'{prm}, {P_ARMOR}', hue=hue)
        except Exception as e: print('FAIL', cid, repr(e)[:300], flush=True)
    # 게임이 읽을 팩 목록 (rig.js 가 있는 폴더)
    G = os.path.join(A.GAME, 'grand'); ids = sorted(d for d in os.listdir(G) if os.path.exists(os.path.join(G, d, 'rig.js')))
    open(os.path.join(G, 'manifest.js'), 'w', encoding='utf-8').write('/* 그랑풍 부품 팩 목록 — sprite_ai/grand/grand_parts_all.py 가 자동 생성 */' + chr(10) + 'window.GRAND_MANIFEST=' + json.dumps(ids) + ';' + chr(10))
    print('ALL DONE', len(ids), 'packs', flush=True)
