"""동작이 뼈대를 따르게 하는 설정 찾기: (참조 세기, LoRA 세기, 포즈 세기) 조합 비교."""
import os, time, dnfai as D
from PIL import Image
OUT = os.path.join(D.HERE, 'out', 'sweep'); os.makedirs(OUT, exist_ok=True)
SETS = [(.25, .75, 1.2), (0, .8, 1.4), (.2, .6, 1.6)]
TESTS = [('zhao', D.ANIMS['thrust'][3]), ('guan', D.ANIMS['slash'][1])]
for cid, pose in TESTS:
    p = D.load_pipe(ip=True, lora=os.path.join(D.HERE, 'lora', cid + '.safetensors'))
    for ip, lw, ad in SETS:
        p.set_adapters(['char'], adapter_weights=[lw]); t = time.time()
        D.generate(p, cid, pose, 23, ip_scale=ip, lora=True, ad_scale=ad).save(os.path.join(OUT, f'{cid}_ip{ip}_l{lw}_a{ad}.png'))
        print('gen', cid, ip, lw, ad, round(time.time() - t), flush=True)
    del p
ims = sorted(os.listdir(OUT)); tiles = [Image.open(os.path.join(OUT, f)).convert('RGB').resize((277, 405)) for f in ims if f.endswith('.png') and not f.startswith('_')]
s = Image.new('RGB', (277 * 3 + 277, 405 * 2), (40, 44, 54))
s.paste(D.draw_pose(D.fk(TESTS[0][1])).resize((277, 405)), (0, 0)); s.paste(D.draw_pose(D.fk(TESTS[1][1])).resize((277, 405)), (0, 405))
order = [f for f in ims if f.endswith('.png') and not f.startswith('_')]
for f, t in zip(order, tiles):
    r = 0 if f.startswith('zhao') else 1; c = [f'_ip{ip}_l{lw}_a{ad}.png' for ip, lw, ad in SETS].index(f[4:])
    s.paste(t, (277 * (c + 1), 405 * r))
s.save(os.path.join(OUT, '_sweep.png')); print('DONE', flush=True)
