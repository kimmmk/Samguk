"""그랑풍 SD 전체 캐릭터 원화 후보 일괄 생성 (흰 배경 · 3등신 게임 관절 뼈대) + 없는 무기(활 · 부채 · 도끼 · 채찍).
후보: cand/b_<id>_<seed>.png (시드 2개). 고른 뒤 autoparts.py 로 부품 분리.
"""
import os, sys, torch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dnfai as D
from PIL import Image
from animgen import load_pipe
from grand_gen import KP
from refgen_desc import SOLDIER, BOSS

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'cand'); os.makedirs(OUT, exist_ok=True)
STYLE = 'detailed armor, thick outline, cel shading, mobile game character, masterpiece, high score, absurdres'
CH = 'chibi, super deformed, solo, '
HEROES = {
  'guan':  '1boy, guan yu, majestic chinese general, red face, very long black beard, green hat, green robe over green and gold armor',
  'zhang': '1boy, zhang fei, fierce chinese general, wild spiky black hair, spiky black beard, black armor with red trim, glaring eyes',
  'huang': '1boy, huang zhong, old chinese general, white beard, white hair topknot, orange and brown armor',
  'zhuge': '1boy, zhuge liang, calm chinese strategist, white and purple robe, black taoist hat, long black hair',
  'ma':    '1boy, ma chao, young handsome chinese general, silver and white armor, gold trim, lion head helmet, white cape',
  'diao':  '1girl, diao chan, beautiful chinese dancer, pink dress, gold hair ornaments, long black hair',
  'wei':   '1boy, wei yan, fierce chinese general, dark red and black armor, horned helmet, short beard',
  'xu':    '1boy, xu huang, stern chinese general, dark blue armor, silver helmet, short beard',
  'gan':   '1boy, gan ning, wild chinese pirate general, spiky brown hair, red headband, yellow and black clothes, bells on belt',
  'sun':   '1girl, sun shangxiang, chinese princess warrior, red and gold armor dress, orange hair ponytail',
}
JOBS = {}
for k, d in HEROES.items(): JOBS[k] = (d + ', empty hands' + ('' if '1girl' in d else ', clenched fists'), 'style')
for k in ('s', 'sp', 'a', 'o', 'sh', 'fl'): JOBS['en_' + k] = (SOLDIER[k].replace('1boy, solo, ', '1boy, ') + ', blue uniform', 'style')
REFB = {'xiahouen': '19', 'zhangjiao': '7', 'xuchu': '7', 'zhangliao': '7', 'caocao': '19', 'simayi': '7', 'yanliang': '7', 'xiahoudun': '19', 'xiahouyuan': '7', 'pangde': '19'}
for k, sd in REFB.items(): JOBS['b_' + k] = (BOSS[k].replace('1boy, solo, ', '1boy, '), os.path.join(D.HERE, 'refs', f'boss_{k}_{sd}.png'))
WEAPONS = {
  'bow': 'a single chinese recurve bow, red and gold, string, lying horizontally',
  'fan': 'a single white feather fan, wooden handle, lying horizontally',
  'axe': 'a single large battle axe, long wooden handle, broad steel blade, lying horizontally',
  'whip': 'a single chain whip, segmented steel chain with handle, lying straight horizontally',
}
if __name__ == '__main__':
    only = sys.argv[1:]
    p = load_pipe(); blank = Image.new('RGB', (D.W, D.H), (236, 236, 236)); zstyle = Image.open(os.path.join(HERE, 'cand', 'zhao_sd_303.png')).convert('RGB')
    for cid, (desc, ref) in JOBS.items():
        if only and cid not in only: continue
        if ref == 'style': p.set_ip_adapter_scale(.3); ri = zstyle
        else: p.set_ip_adapter_scale(.35); ri = Image.open(ref).convert('RGB')
        for seed in (7, 31):
            fn = os.path.join(OUT, f'b_{cid}_{seed}.png')
            if os.path.exists(fn): continue
            p(prompt=f'full body, standing, from side, facing right, white background, simple background, {CH}{desc}, arms slightly away from body, {STYLE}',
              negative_prompt=D.NEG + ', weapon, spear, sword, holding weapon, realistic proportions, tall, long legs, flat colors, western cartoon, multiple people',
              image=blank, control_image=D.draw_pose(KP), strength=1.0, controlnet_conditioning_scale=.95, ip_adapter_image=ri,
              num_inference_steps=30, guidance_scale=5.5, width=D.W, height=D.H, generator=torch.Generator('cpu').manual_seed(seed)).images[0].save(fn)
            print('gen', cid, seed, flush=True)
    p.set_ip_adapter_scale(0.0)
    for k, d in WEAPONS.items():
        fn = os.path.join(OUT, f'w_{k}.png')
        if os.path.exists(fn) or (only and 'weapons' not in only): continue
        p(prompt=f'no humans, weapon focus, still life, {d}, full length visible, simple background, white background, game item, detailed, masterpiece, high score',
          negative_prompt='person, hand, multiple weapons, two weapons, cropped, text, watermark, shadow, lowres, blurry, worst quality',
          image=Image.new('RGB', (1536, 640), (128, 128, 128)), control_image=Image.new('RGB', (1536, 640)), strength=1.0, controlnet_conditioning_scale=0.0,
          ip_adapter_image=blank, num_inference_steps=30, guidance_scale=5.5, width=1536, height=640, generator=torch.Generator('cpu').manual_seed(5)).images[0].save(fn)
        print('weapon', k, flush=True)
    print('DONE', flush=True)
