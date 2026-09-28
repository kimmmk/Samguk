"""v3 동작 생성: 무기 없는 캐릭터(ControlNet 포즈 + LoRA + 참조) → 앞 프레임 바탕 img2img 로 떨림 줄이기 → 무기 합성(각도 · 손 위치 고정) → 도트.
실행: venv\\Scripts\\python anim3.py zhao [test]
"""
import os, sys, time, json, math, numpy as np, cv2, torch
import dnfai as D
from PIL import Image

cid = sys.argv[1]; TEST = 'test' in sys.argv[2:]
OUT = os.path.join(D.HERE, 'anim3', cid); os.makedirs(OUT, exist_ok=True)
CFG = {'zhao': dict(lw=.75, ip=.25, cs=1.0), 'guan': dict(lw=.65, ip=.2, cs=1.2)}[cid]
SEED = 23

# ---------- 무기 ----------
WEAPON = {  # 파일, 회전(도, 반시계), 날끝이 오른쪽이 되도록 좌우 반전, 원화 기준 길이(px), 손잡이 위치(자루 끝에서 비율)
  'zhao': dict(file='weapon/zhao_4.png', item=None, rot=0, flip=False, length=660, grip=.36),
  'guan': dict(file='weapon/guan13_item2.png', item=True, rot=90, flip=False, length=660, grip=.42),
}[cid]
def load_weapon():
    w = WEAPON
    im = Image.open(os.path.join(D.HERE, w['file'])).convert('RGBA')
    if not w['item']: im = Image.fromarray(D.cutout(im))
    if w['rot']: im = im.rotate(w['rot'], expand=True)
    if w['flip']: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.array(im); ys, xs = np.where(a[..., 3] > 0); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = w['length'] / im.width; return im.resize((w['length'], max(1, round(im.height * s))), Image.LANCZOS)
WPN = load_weapon()

# 동작별 무기 각도(도, 0 = 오른쪽 수평, - = 위로)
WANG = {'idle': [-15] * 4, 'walk': [-18] * 4, 'thrust': [-15, -6, -4, 0, 0, -10], 'slash': [-70, -125, -105, -35, 15, -45]}
ANIMS = {'idle': D.ANIMS['idle'], 'walk': [D.WALK[0], D.WALK[1], D.WALK[2], D.WALK[1]], 'thrust': D.ANIMS['thrust'], 'slash': D.ANIMS['slash']}
ATTACK = {'zhao': 'thrust', 'guan': 'slash'}[cid]
ORDER = ['idle', 'walk', ATTACK] if not TEST else ['idle', ATTACK]
STRENGTH = {'idle': .45, 'walk': .75, 'thrust': .82, 'slash': .85}
PADR, PADT = 480, 160  # 무기가 캔버스 밖으로 나가지 않도록 오른쪽 · 위를 넓혀 합성

def composite(char, pose, ang):
    """넓힌 캔버스에 캐릭터를 두고, 무기를 가까운 손(wR)에 쥐여 합성한 뒤 손을 다시 덮어 그린다. 날끝 좌표(넓힌 캔버스 기준)를 돌려준다."""
    CW, CH = D.W + PADR, D.H + PADT
    big = np.zeros((CH, CW, 4), np.uint8); big[PADT:, :D.W] = char
    kp = D.fk(pose); hx, hy = kp[4][0], kp[4][1] + PADT
    W_, H_ = WPN.size; g = WEAPON['grip'] * W_
    M = cv2.getRotationMatrix2D((g, H_ / 2), -ang, 1.0); M[0, 2] += hx - g; M[1, 2] += hy - H_ / 2
    w = cv2.warpAffine(np.array(WPN), M, (CW, CH), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    out = big.astype(np.float32); wa = w[..., 3:4].astype(np.float32) / 255
    out[..., :3] = out[..., :3] * (1 - wa) + w[..., :3] * wa; out[..., 3:4] = np.maximum(out[..., 3:4], w[..., 3:4])
    m = np.zeros(big.shape[:2], np.uint8); cv2.circle(m, (int(hx), int(hy)), 24, 255, -1); m = (m > 0) & (big[..., 3] > 0)
    out[m] = big[m]
    r = math.radians(ang); tip = (hx + (W_ - g) * math.cos(r), hy + (W_ - g) * math.sin(r))
    return out.astype(np.uint8), tip

# ---------- 생성 ----------
p = None
NOW = D.CHARS[cid]['desc'].replace(', holding spear', '').replace(', holding guandao', '') + ', empty hands, clenched fists'
NEGW = D.NEG + ', weapon, spear, polearm, sword, holding weapon, staff'
def prompt(): c = D.CHARS[cid]; return f"{c['token']}, full body, facing right, from side, white background, simple background, {NOW}, {D.BASE}, {D.Q}"
def gen(pose, init=None, strength=.6):
    global p
    if p is None:
        p = D.load_pipe_cn(cid, CFG['lw'], img2img=True)
        half = lambda m, args: tuple(a.half() if torch.is_tensor(a) and a.is_floating_point() else a for a in args)
        for net in (p.unet, p.controlnet):
            for mod in net.modules():
                if type(mod).__name__ == 'TimestepEmbedding': mod.register_forward_pre_hook(half)
    p.set_ip_adapter_scale(CFG['ip'])
    if init is None: init, strength = Image.new('RGB', (D.W, D.H), (236, 236, 236)), 1.0
    return p(prompt=prompt(), negative_prompt=NEGW, image=init, control_image=D.draw_pose(D.fk(pose)), strength=strength, controlnet_conditioning_scale=CFG['cs'],
             ip_adapter_image=D.ref_image(cid), num_inference_steps=30, guidance_scale=5, width=D.W, height=D.H, generator=torch.Generator('cpu').manual_seed(SEED)).images[0]

hd = {}
base = None
for an in ORDER:
    hd[an] = []; prev = None
    poses = ANIMS[an] if not TEST else [ANIMS[an][0]] + ([ANIMS[an][3]] if an != 'idle' else [])
    for i, pose in enumerate(poses):
        fn = os.path.join(OUT, f'{an}_{i}_hd.png')
        if not os.path.exists(fn):
            t = time.time()
            init = prev if prev is not None else base
            img = gen(pose, init, STRENGTH[an] if init is not None else None) if init is not None else gen(pose)
            img.save(fn); print('gen', an, i, round(time.time() - t), flush=True)
        img = Image.open(fn); prev = img
        if base is None: base = img
        hd[an].append(img)

# ---------- 무기 합성 · 도트 ----------
frames, tips = {}, {}
for an in ORDER:
    frames[an] = []; tips[an] = []
    poses = ANIMS[an] if not TEST else [ANIMS[an][0]] + ([ANIMS[an][3]] if an != 'idle' else [])
    angs = WANG[an] if not TEST else [WANG[an][0]] + ([WANG[an][3]] if an != 'idle' else [])
    for i, (img, pose, ang) in enumerate(zip(hd[an], poses, angs)):
        char = D.cutout(img); comp, tip = composite(char, pose, ang)
        Image.fromarray(comp).save(os.path.join(OUT, f'{an}_{i}_comp.png'))
        frames[an].append(D.pixel(comp)); tips[an].append([round((tip[0] - D.X0) / D.DOT_P), round((tip[1] - D.GROUND - PADT) / D.DOT_P)])
allf = [f for v in frames.values() for f in v]; pal = D.shared_palette(allf, 48); k = 0
for an in frames:
    for i in range(len(frames[an])): frames[an][i] = D.outline(pal[k]); k += 1
fh, fw = frames[ORDER[0]][0].shape[:2]
FPS = {'idle': 6, 'walk': 8, 'thrust': 10, 'slash': 10}
for an, fr in frames.items():
    sheet = Image.new('RGBA', (fw * len(fr), fh))
    for i, f in enumerate(fr): Image.fromarray(f).save(os.path.join(OUT, f'{an}_{i}_dot.png')); sheet.paste(Image.fromarray(f), (i * fw, 0))
    sheet.save(os.path.join(OUT, f'{an}_sheet.png'))
    gif = []
    for f in fr:
        bg = Image.new('RGBA', (fw * 3, fh * 3), (125, 144, 168, 255)); bg.alpha_composite(Image.fromarray(f).resize((fw * 3, fh * 3), Image.NEAREST)); gif.append(bg.convert('RGB'))
    gif[0].save(os.path.join(OUT, f'{an}.gif'), save_all=True, append_images=gif[1:], duration=int(1000 / FPS[an]), loop=0)
json.dump({'fw': fw, 'fh': fh, 'anchor': [D.X0 // D.DOT_P, (D.GROUND + PADT) // D.DOT_P], 'anims': {an: len(fr) for an, fr in frames.items()}, 'tips': tips, 'attack': ATTACK},
          open(os.path.join(OUT, 'meta.json'), 'w'))
print('DONE', OUT, fw, fh, flush=True)
