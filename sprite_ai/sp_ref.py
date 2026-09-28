"""창병 기준 그림 다시 만들기 (원뿔 투구 대신 작은 둥근 철모) — 시드 4개."""
import os, time, torch, dnfai as D, motions as M
from PIL import Image
from animgen import load_pipe
from refgen_desc import SOLDIER
p = load_pipe(); blank = Image.new('RGB', (D.W, D.H), (236, 236, 236)); p.set_ip_adapter_scale(0.0)
for seed in (41, 53, 67, 79):
    fn = os.path.join(D.HERE, 'refs', f'en_sp2_{seed}.png')
    if os.path.exists(fn): continue
    p(prompt=f"full body, facing right, from side, white background, simple background, {SOLDIER['sp']}, {D.BASE}, {D.Q}", negative_prompt=D.NEG + ', conical hat, tall hat, pointed hat',
      image=blank, control_image=D.draw_pose(D.fk(M.ST)), strength=1.0, controlnet_conditioning_scale=1.0, ip_adapter_image=blank,
      num_inference_steps=30, guidance_scale=5, width=D.W, height=D.H, generator=torch.Generator('cpu').manual_seed(seed)).images[0].save(fn)
    print('ref', seed, flush=True)
print('SPREFDONE', flush=True)
