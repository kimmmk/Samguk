"""LoRA + 기준 그림 + 관절 포즈로 동작 프레임 생성 → 도트 스프라이트 시트 · GIF.
실행: venv\\Scripts\\python make_anim.py zhao [lora 이름]
"""
import os, sys, time, json, numpy as np, torch
import dnfai as D
from PIL import Image, ImageDraw, ImageFont

cid = sys.argv[1]; lora_name = sys.argv[2] if len(sys.argv) > 2 else cid
ATTACK = {'zhao': 'thrust', 'guan': 'slash'}[cid]
SEED = {'zhao': 23, 'guan': 23}[cid]
LORA = os.path.join(D.HERE, 'lora', lora_name + '.safetensors')
OUT = os.path.join(D.HERE, 'anim2', cid); os.makedirs(OUT, exist_ok=True)
CROP = (0, 0, 830, 1215)        # 원화 전체를 같은 영역으로 잘라 발 위치를 고정
FPS = {'idle': 6, ATTACK: 10}

CFG = {'zhao': dict(lw=.75, ip=.25, cs=1.0), 'guan': dict(lw=.6, ip=.2, cs=1.3)}[cid]
p = None
frames = {}
for an in ('idle', ATTACK):
    frames[an] = []
    for i, pose in enumerate(D.ANIMS[an]):
        fn = os.path.join(OUT, f'{an}_{i}_hd.png')
        if not os.path.exists(fn):
            if p is None: p = D.load_pipe_cn(lora_name, CFG['lw'])
            t = time.time(); D.generate_cn(p, cid, pose, SEED, ip_scale=CFG['ip'], cn_scale=CFG['cs']).save(fn); print('gen', an, i, round(time.time() - t), flush=True)
        rgba = D.cutout(Image.open(fn))[CROP[1]:CROP[3], CROP[0]:CROP[2]]
        Image.fromarray(rgba).save(os.path.join(OUT, f'{an}_{i}_cut.png'))
        frames[an].append(D.pixel(rgba))
allf = [f for v in frames.values() for f in v]
pal = D.shared_palette(allf, 48); k = 0
for an in frames:
    for i in range(len(frames[an])): frames[an][i] = D.outline(pal[k]); k += 1

# 시트 · GIF
fh, fw = frames['idle'][0].shape[:2]
for an, fr in frames.items():
    sheet = Image.new('RGBA', (fw * len(fr), fh))
    for i, f in enumerate(fr): Image.fromarray(f).save(os.path.join(OUT, f'{an}_{i}_dot.png')); sheet.paste(Image.fromarray(f), (i * fw, 0))
    sheet.save(os.path.join(OUT, f'{an}_sheet.png'))
    Z = 3; gif = []
    for f in fr:
        bg = Image.new('RGBA', (fw * Z, fh * Z), (125, 144, 168, 255)); im = Image.fromarray(f).resize((fw * Z, fh * Z), Image.NEAREST); bg.alpha_composite(im); gif.append(bg.convert('RGB'))
    gif[0].save(os.path.join(OUT, f'{an}.gif'), save_all=True, append_images=gif[1:], duration=int(1000 / FPS[an]), loop=0)
    hd = [Image.open(os.path.join(OUT, f'{an}_{i}_cut.png')).convert('RGBA') for i in range(len(fr))]
    hg = []
    for h in hd:
        bg = Image.new('RGBA', h.size, (125, 144, 168, 255)); bg.alpha_composite(h); hg.append(bg.convert('RGB').resize((h.width // 2, h.height // 2)))
    hg[0].save(os.path.join(OUT, f'{an}_hd.gif'), save_all=True, append_images=hg[1:], duration=int(1000 / FPS[an]), loop=0)
json.dump({'fw': fw, 'fh': fh, 'anchor': [(D.X0 - CROP[0]) // D.DOT_P, (D.GROUND - CROP[1]) // D.DOT_P], 'anims': {an: len(fr) for an, fr in frames.items()}}, open(os.path.join(OUT, 'meta.json'), 'w'))
print('DONE', OUT, fw, fh, flush=True)
