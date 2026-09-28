"""무기 단독 이미지 생성 (합성용): 가로로 놓인 긴 무기 한 자루 × 시드 4개."""
import os, torch, dnfai as D
from diffusers import StableDiffusionXLPipeline, AutoencoderKL, EulerAncestralDiscreteScheduler
OUT = os.path.join(D.HERE, 'weapon'); os.makedirs(OUT, exist_ok=True)
WEAPONS = {
  'zhao': 'no humans, weapon focus, still life, a single chinese spear, very long straight wooden shaft, silver leaf-shaped spearhead, red tassel below spearhead, lying horizontally, full length visible, simple background, white background, game item, detailed, masterpiece, high score, absurdres',
  'guan': 'no humans, weapon focus, still life, a single polearm, extremely long thin wooden pole, small curved single-edged broad blade mounted at the right end of the pole, golden guard, red tassel, lying horizontally, full length visible, simple background, white background, game item, detailed, masterpiece, high score, absurdres',
}
NEG = 'person, hand, human, multiple weapons, two weapons, broken, cropped, out of frame, text, watermark, shadow, scenery, colored background, lowres, blurry, worst quality, low quality'
dt = torch.float16
p = StableDiffusionXLPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', vae=AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt), torch_dtype=dt)
p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config); p.enable_model_cpu_offload()
for cid, pr in [('guan', WEAPONS['guan'])]:
    for seed in (11, 12, 13, 14):
        p(prompt=pr, negative_prompt=NEG, width=1536, height=640, num_inference_steps=30, guidance_scale=5.5, generator=torch.Generator('cpu').manual_seed(seed)).images[0].save(os.path.join(OUT, f'{cid}_{seed}.png'))
        print('gen', cid, seed, flush=True)
print('DONE', flush=True)
