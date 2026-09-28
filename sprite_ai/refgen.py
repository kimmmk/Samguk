"""병사 · 보스 기준 그림과 합성용 무기 이미지 생성 (시드 2개씩 → 사람이 골라 jobs.py 에 지정)."""
import os, sys, time, torch
import dnfai as D, motions as M
from PIL import Image
from animgen import load_pipe

from refgen_desc import SOLDIER, BOSS
WEAPON = {
  'sword': 'a single chinese straight sword, jian, silver blade, gold guard, red tassel',
  'dao': 'a single chinese broadsword, dao, curved single-edged blade, gold guard',
  'halberd': 'a single chinese halberd, ji, very long red shaft, crescent side blade and spear tip, red tassel',
  'mace': 'a single heavy iron mace, spiked iron ball head, long wooden handle',
  'bigdao': 'a single chinese great blade polearm, long shaft, huge broad curved blade',
  'staff': 'a single taoist staff, long wooden staff, golden ring head with small rings',
  'flag': 'a single war banner flag on a long pole, blue flag with golden trim, red tassel',
}
OUT = os.path.join(D.HERE, 'refs'); os.makedirs(OUT, exist_ok=True)
p = load_pipe(); blank = Image.new('RGB', (D.W, D.H), (236, 236, 236))
def gen(desc, seed, w=D.W, h=D.H, pose=True, neg=D.NEG):
    p.set_ip_adapter_scale(0.0)
    ctrl = D.draw_pose(D.fk(M.ST)) if pose else Image.new('RGB', (w, h))
    return p(prompt=desc, negative_prompt=neg, image=Image.new('RGB', (w, h), (236, 236, 236)), control_image=ctrl, strength=1.0,
             controlnet_conditioning_scale=1.0 if pose else 0.0, ip_adapter_image=blank, num_inference_steps=30, guidance_scale=5,
             width=w, height=h, generator=torch.Generator('cpu').manual_seed(seed)).images[0]
for grp, table in (('en', SOLDIER), ('boss', BOSS)):
    for k, desc in table.items():
        for seed in (7, 19):
            fn = os.path.join(OUT, f'{grp}_{k}_{seed}.png')
            if os.path.exists(fn): continue
            t = time.time(); gen(f'full body, facing right, from side, white background, simple background, {desc}, {D.BASE}, {D.Q}', seed).save(fn)
            print('ref', grp, k, seed, round(time.time() - t), flush=True)
for k, desc in WEAPON.items():
    for seed in (5, 9):
        fn = os.path.join(OUT, f'w_{k}_{seed}.png')
        if os.path.exists(fn): continue
        gen(f'no humans, weapon focus, still life, {desc}, lying horizontally, full length visible, simple background, white background, game item, detailed, {D.Q}',
            seed, 1536, 640, pose=False, neg='person, hand, human, multiple weapons, two weapons, cropped, out of frame, text, watermark, shadow, scenery, lowres, blurry, worst quality').save(fn)
        print('weapon', k, seed, flush=True)
print('REFDONE', flush=True)
