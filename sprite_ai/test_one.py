import time, sys, torch, gen_samples as G
from PIL import Image
t = time.time(); p = G.load_pipe(); print('load', round(time.time() - t), flush=True)
name, desc = G.CHARS['guan']; t = time.time()
cb = lambda i, ts, lat: print('step', i, round(time.time() - t), flush=True)
img = p(prompt=f'white background, simple background, {desc}, {G.BASE}, {G.Q}', negative_prompt=G.NEG, image=G.draw_pose(G.POSES['stance']), adapter_conditioning_scale=1.0,
        num_inference_steps=28, guidance_scale=5.5, width=G.W, height=G.H, generator=torch.Generator('cpu').manual_seed(11),
        callback=cb, callback_steps=1).images[0]
print('gen', round(time.time() - t), flush=True)
img.save('out/test_guan_hd.png'); rgba = G.cutout(img); Image.fromarray(rgba).save('out/test_guan_cut.png')
Image.fromarray(G.hybrid(rgba)).save('out/test_guan_dot.png'); print('DONE', flush=True)
