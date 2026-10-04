"""그랑풍 NPC 원화 후보 생성 (유비 · 미부인 · 황개 · 미축 · 법정) + 아기 포대기(미부인 소품).
후보: cand/n_<id>_<seed>.png · cand/w_baby.png
"""
import os, sys, torch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dnfai as D
from PIL import Image
from animgen import load_pipe
from grand_gen import KP

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'cand')
STYLE = 'detailed clothes, thick outline, cel shading, mobile game character, masterpiece, high score, absurdres'
NPC = {
  'liubei':   '1boy, liu bei, benevolent chinese lord, long black hair in topknot with small crown, short black beard, green and gold robe over light armor, gentle face, empty hands',
  'mifuren':  '1girl, lady mi, chinese noble lady, light purple and white hanfu dress, black hair in elegant bun with hairpin, gentle worried face, empty hands',
  'huanggai': '1boy, huang gai, old chinese general, long white beard, red lamellar armor, bronze helmet, stern old face, empty hands, clenched fists',
  'mizhu':    '1boy, mi zhu, chinese merchant official, brown silk robe, black scholar hat, short beard, kind smile, empty hands',
  'fazheng':  '1boy, fa zheng, chinese strategist, dark green robe, black scholar hat, thin mustache, sharp clever eyes, empty hands',
}
if __name__ == '__main__':
    p = load_pipe(); blank = Image.new('RGB', (D.W, D.H), (236, 236, 236)); ref = Image.open(os.path.join(OUT, 'zhao_sd_303.png')).convert('RGB')
    p.set_ip_adapter_scale(.3)
    for cid, desc in NPC.items():
        for seed in (7, 31, 55):
            fn = os.path.join(OUT, f'n_{cid}_{seed}.png')
            if os.path.exists(fn): continue
            p(prompt=f'full body, standing, from side, facing right, white background, simple background, chibi, super deformed, solo, {desc}, arms slightly away from body, {STYLE}',
              negative_prompt=D.NEG + ', weapon, spear, sword, holding weapon, realistic proportions, tall, long legs, flat colors, western cartoon, multiple people, baby',
              image=blank, control_image=D.draw_pose(KP), strength=1.0, controlnet_conditioning_scale=.95, ip_adapter_image=ref,
              num_inference_steps=30, guidance_scale=5.5, width=D.W, height=D.H, generator=torch.Generator('cpu').manual_seed(seed)).images[0].save(fn)
            print('gen', cid, seed, flush=True)
    p.set_ip_adapter_scale(0.0)
    fn = os.path.join(OUT, 'w_baby.png')
    if not os.path.exists(fn):
        p(prompt='no humans, object focus, a swaddled baby bundle wrapped in white and red cloth, sleeping baby face visible at one end, lying horizontally, simple background, white background, game item, detailed, masterpiece',
          negative_prompt='person, adult, hand, multiple, cropped, text, watermark, lowres, blurry, worst quality',
          image=Image.new('RGB', (1536, 640), (128, 128, 128)), control_image=Image.new('RGB', (1536, 640)), strength=1.0, controlnet_conditioning_scale=0.0,
          ip_adapter_image=blank, num_inference_steps=30, guidance_scale=5.5, width=1536, height=640, generator=torch.Generator('cpu').manual_seed(5)).images[0].save(fn)
        print('weapon baby', flush=True)
    print('DONE', flush=True)
