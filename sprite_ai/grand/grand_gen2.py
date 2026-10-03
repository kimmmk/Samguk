"""수직 슬라이스 원화 후보: 동탁군 창병 · 여포(보스) · 호뢰관 배경.
- 캐릭터: grand_gen.py 와 같은 3등신 뼈대(게임 관절 규격) + 진한 녹색 배경(색으로 깔끔하게 지우기 위해)
- 배경: 하늘(고정) · 성벽(녹색 배경에서 잘라 중경으로) · 돌바닥(반복 지면)
"""
import os, sys, torch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dnfai as D
from PIL import Image
from animgen import load_pipe
from grand_gen import KP

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'cand'); os.makedirs(OUT, exist_ok=True)
STYLE = 'thick outline, cel shading, mobile game character, masterpiece, high score, absurdres'
GREEN = 'white background, simple background'   # 녹색 배경은 화풍이 무너져 흰 배경 + 외곽선 기준 배경 제거로
CHARS = {
  'dong_sp': ('chibi, super deformed, 1boy, solo, chinese foot soldier, dong zhuo army, red lamellar armor, black cloth, round iron helmet with red tassel, '
              'stern face, detailed armor, empty hands, clenched fists, arms slightly away from body, no cape'),
  'lubu':    ('chibi, super deformed, 1boy, solo, lu bu, fierce chinese warlord, golden helmet with two long pheasant tail feathers, red and gold ornate armor, '
              'red cape, angry eyes, empty hands, clenched fists, arms slightly away from body'),
}
BGS = {
  'fortress_sky':    ('no humans, scenery, dusk sky, orange and purple clouds, distant mountains silhouette, warm sunset glow, wide panorama, painted mobile game background, '
                      'anime background art, masterpiece', 1344, 768),
  'fortress_mid':    ('no humans, scenery, ancient chinese fortress wall with a large gate tower, red banners, stone wall, tiled roof, side view, horizontal panorama, '
                      'painted mobile game background, anime background art, solid green sky, green background, masterpiece', 1536, 640),
  'fortress_ground': ('no humans, top-down view, grey stone pavement texture, square flagstones, cracks, moss between stones, flat floor texture, '
                      'painted game texture, anime background art, masterpiece', 1536, 640),
}
NEG_BG = 'people, person, character, text, watermark, signature, lowres, blurry, worst quality, low quality, frame, border'
if __name__ == '__main__':
    p = load_pipe(); blank = Image.new('RGB', (D.W, D.H), (236, 236, 236)); p.set_ip_adapter_scale(0.0)
    REF = {'lubu': os.path.join(D.HERE, 'refs', 'boss_lubu_7.png'), 'dong_sp': os.path.join(HERE, 'cand', 'zhao_sd_303.png')}   # 병사는 SD 조운을 화풍 기준으로
    for cid, desc in CHARS.items():
        ref = Image.open(REF[cid]).convert('RGB') if cid in REF else blank; p.set_ip_adapter_scale({'lubu': .35, 'dong_sp': .3}.get(cid, 0.0))
        for seed in ((7, 19, 31, 43) if cid != 'dong_sp' else (51, 63, 77, 89)):
            fn = os.path.join(OUT, f'{cid}_w{seed}.png')
            if os.path.exists(fn): continue
            p(prompt=f'full body, standing, from side, facing right, {GREEN}, {desc}, {STYLE}', negative_prompt=D.NEG + ', weapon, spear, sword, holding weapon, realistic proportions, tall, long legs, flat colors, western cartoon',
              image=blank, control_image=D.draw_pose(KP), strength=1.0, controlnet_conditioning_scale=.95, ip_adapter_image=ref,
              num_inference_steps=30, guidance_scale=5.5, width=D.W, height=D.H, generator=torch.Generator('cpu').manual_seed(seed)).images[0].save(fn)
            print('gen', cid, seed, flush=True)
    p.set_ip_adapter_scale(0.0)
    for bid, (pr, w, h) in BGS.items():
        for seed in (3, 9):
            fn = os.path.join(OUT, f'{bid}_{seed}.png' if bid != 'fortress_ground' else f'{bid}_t{seed}.png')
            if os.path.exists(fn): continue
            p(prompt=pr, negative_prompt=NEG_BG, image=Image.new('RGB', (w, h), (128, 128, 128)), control_image=Image.new('RGB', (w, h)), strength=1.0,
              controlnet_conditioning_scale=0.0, ip_adapter_image=blank, num_inference_steps=30, guidance_scale=5.5, width=w, height=h,
              generator=torch.Generator('cpu').manual_seed(seed)).images[0].save(fn)
            print('bg', bid, seed, flush=True)
    print('DONE', flush=True)
