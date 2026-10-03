"""AI 인페인팅: SD 조운 원화에서 팔을 지우고 그 자리를 몸통 · 망토로 다시 그린다 → 팔 없는 몸통 원화 (부품 분리용).
팔 영역은 parts.py 와 같은 다각형을 12px 넓혀 쓴다. 후보 3장 (시드별).
"""
import os, sys, numpy as np, cv2, torch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dnfai as D
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'cand'); SRC = os.path.join(OUT, 'zhao_sd_303.png')
ARM = [(232, 612), (366, 612), (374, 700), (366, 908), (250, 908), (236, 800)]
img = Image.open(SRC).convert('RGB'); H, W = img.height, img.width
m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(ARM, np.int32)], 255); m = cv2.dilate(m, np.ones((25, 25), np.uint8))
mask = Image.fromarray(m); mask.save(os.path.join(OUT, '_arm_mask.png'))
# 1) 미리 채우기: 팔 자리를 둘레 색(망토 파랑 · 갑옷 흰색)으로 번지듯 채운다 — AI 가 새 물체를 지어내지 않고 질감만 다듬게
pre = cv2.inpaint(np.array(img), m, 21, cv2.INPAINT_TELEA); img = Image.fromarray(pre); img.save(os.path.join(OUT, '_prefill.png'))

from diffusers import StableDiffusionXLInpaintPipeline, AutoencoderKL, EulerAncestralDiscreteScheduler
dt = torch.float16
p = StableDiffusionXLInpaintPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', vae=AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt), torch_dtype=dt)
p.vae.register_to_config(force_upcast=False)
p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config); p.enable_model_cpu_offload()
PROMPT = ('chibi, super deformed, 1boy, solo, zhao yun, chinese general, silver and white armor, gold trim, blue cape hanging behind body, '
          'blue cloth cape with folds behind the body, side of white armor torso, full body, from side, facing right, white background, thick outline, cel shading, mobile game character, masterpiece, high score')
NEG = D.NEG + ', arm, hand, fist, sleeve, gauntlet, shoulder pad, weapon, extra limbs'
for seed in (11, 22, 33):
    out = p(prompt=PROMPT, negative_prompt=NEG, image=img, mask_image=mask, strength=.6, num_inference_steps=40, guidance_scale=5,
            padding_mask_crop=160, width=W, height=H, generator=torch.Generator('cpu').manual_seed(seed)).images[0]
    out.save(os.path.join(OUT, f'armless_{seed}.png')); print('inpaint', seed, flush=True)
print('DONE', flush=True)
