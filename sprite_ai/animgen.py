"""공통 동작 생성기 (무장 · 병사 · 보스).
job(dict) 하나로: 기준 그림(IP-Adapter) + 선택 LoRA + ControlNet 오픈포즈 → 무기 없이 생성 → 무기 합성 → 혼합 도트 → 공통 팔레트 → gen/<id>/.
- 기준 프레임(대기 0)을 먼저 그리고, 나머지는 그 기준에서 img2img(strength) 로 그려 모습은 유지하되 자세는 크게 바꾼다.
실행: venv\\Scripts\\python animgen.py <job 이름들…>   (jobs.py 의 JOBS)
"""
import os, sys, time, json, math, numpy as np, cv2, torch
import dnfai as D
from PIL import Image

PADL, PADR, PADT = 300, 480, 160
def load_pipe(lora=None, lora_w=.75):
    from diffusers import StableDiffusionXLControlNetImg2ImgPipeline, ControlNetModel, AutoencoderKL, EulerAncestralDiscreteScheduler
    from transformers import CLIPVisionModelWithProjection
    dt = torch.float16
    cn = ControlNetModel.from_pretrained('xinsir/controlnet-openpose-sdxl-1.0', torch_dtype=dt)
    vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt)
    ie = CLIPVisionModelWithProjection.from_pretrained('h94/IP-Adapter', subfolder='models/image_encoder', torch_dtype=dt)
    p = StableDiffusionXLControlNetImg2ImgPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', controlnet=cn, vae=vae, image_encoder=ie, torch_dtype=dt)
    p.vae.register_to_config(force_upcast=False)
    p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config)
    p.load_ip_adapter('h94/IP-Adapter', subfolder='sdxl_models', weight_name='ip-adapter-plus_sdxl_vit-h.safetensors', image_encoder_folder=None)
    if lora:
        p.load_lora_weights(os.path.join(D.HERE, 'lora'), weight_name=lora + '.safetensors', adapter_name='char'); p.fuse_lora(lora_scale=lora_w); p.unload_lora_weights()
    p.unet.enable_layerwise_casting(storage_dtype=torch.float8_e4m3fn, compute_dtype=dt)
    p.controlnet.enable_layerwise_casting(storage_dtype=torch.float8_e4m3fn, compute_dtype=dt)
    half = lambda m, args: tuple(a.half() if torch.is_tensor(a) and a.is_floating_point() else a for a in args)
    for net in (p.unet, p.controlnet):
        for mod in net.modules():
            if type(mod).__name__ == 'TimestepEmbedding': mod.register_forward_pre_hook(half)
    p.enable_model_cpu_offload(); p.vae.enable_slicing(); p.vae.enable_tiling()
    return p

def load_weapon(w):
    im = Image.open(os.path.join(D.HERE, w['file'])).convert('RGBA')
    if not w.get('item'): im = Image.fromarray(D.cutout(im))
    if w.get('rot'): im = im.rotate(w['rot'], expand=True)
    if w.get('flip'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.array(im); ys, xs = np.where(a[..., 3] > 0); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return im.resize((w['length'], max(1, round(im.height * w['length'] / im.width))), Image.LANCZOS)

def composite(char, pose, wpn, grip):
    CW, CH = PADL + D.W + PADR, D.H + PADT
    big = np.zeros((CH, CW, 4), np.uint8); big[PADT:, PADL:PADL + D.W] = char
    ang = pose.get('w')
    if wpn is None or ang is None: return big, None
    kp = D.fk(pose); hx, hy = kp[4][0] + PADL, kp[4][1] + PADT
    W_, H_ = wpn.size; g = grip * W_
    M = cv2.getRotationMatrix2D((g, H_ / 2), -ang, 1.0); M[0, 2] += hx - g; M[1, 2] += hy - H_ / 2
    w = cv2.warpAffine(np.array(wpn), M, (CW, CH), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    behind = math.cos(math.radians(ang)) < -.2   # 무기가 몸 뒤쪽을 향하면 몸 뒤에 그린다
    out = big.astype(np.float32); wa = w[..., 3:4].astype(np.float32) / 255
    if behind:
        ba = big[..., 3:4].astype(np.float32) / 255
        out[..., :3] = big[..., :3] * ba + w[..., :3] * wa * (1 - ba); out[..., 3:4] = np.maximum(big[..., 3:4], w[..., 3:4])
    else:
        out[..., :3] = out[..., :3] * (1 - wa) + w[..., :3] * wa; out[..., 3:4] = np.maximum(out[..., 3:4], w[..., 3:4])
        m = np.zeros(big.shape[:2], np.uint8); cv2.circle(m, (int(hx), int(hy)), 24, 255, -1); m = (m > 0) & (big[..., 3] > 0); out[m] = big[m]
    r = math.radians(ang); return out.astype(np.uint8), (hx + (W_ - g) * math.cos(r), hy + (W_ - g) * math.sin(r))

def run(job, p=None):
    out = os.path.join(D.HERE, 'gen', job['id']); os.makedirs(out, exist_ok=True)
    wpn = load_weapon(job['weapon']) if job.get('weapon') else None
    tok = job.get('token')
    prompt = f"{tok + ', ' if tok else ''}full body, facing right, from side, white background, simple background, {job['desc']}, {D.BASE}, {D.Q}"
    neg = D.NEG + (', weapon, spear, polearm, sword, holding weapon, staff' if wpn is not None else '')
    if job.get('neg_extra'): neg += ', ' + job['neg_extra']
    ref = Image.open(os.path.join(D.HERE, job['ref'])).convert('RGB')
    if job.get('ref_flip'): ref = ref.transpose(Image.FLIP_LEFT_RIGHT)
    anims = job['anims']; S = job.get('strength', .9); base = None
    for an, poses in anims.items():
        for i, pose in enumerate(poses):
            fn = os.path.join(out, f'{an}_{i}_hd.png')
            if os.path.exists(fn):
                if base is None: base = Image.open(fn).convert('RGB')
                continue
            if p is None: p = load_pipe(job.get('lora'), job.get('lora_w', .75))
            p.set_ip_adapter_scale(job.get('ip', .35)); t = time.time()
            init, s = (base, S) if base is not None else (Image.new('RGB', (D.W, D.H), (236, 236, 236)), 1.0)
            img = p(prompt=prompt, negative_prompt=neg, image=init, control_image=D.draw_pose(D.fk(pose)), strength=s, controlnet_conditioning_scale=job.get('cs', 1.0),
                    ip_adapter_image=ref, num_inference_steps=30, guidance_scale=5, width=D.W, height=D.H, generator=torch.Generator('cpu').manual_seed(job.get('seed', 23))).images[0]
            img.save(fn); print('gen', job['id'], an, i, round(time.time() - t), flush=True)
            if base is None: base = img
    # 무기 합성 · 도트
    P = job.get('P', D.DOT_P); frames = []; keys = []; tips = []
    for an, poses in anims.items():
        for i, pose in enumerate(poses):
            char = D.cutout(Image.open(os.path.join(out, f'{an}_{i}_hd.png')), job.get('cut_tol', 30))
            if job.get('trim_head'):
                # 머리 위로 솟은 장식(LoRA 가 외형으로 익힌 모자 술 · 세운 칼날)을 코보다 trim_head px 위로 전부 잘라 낸다.
                # 머리 위로 든 손은 코보다 약 100px 위까지라 남는다. 무기는 이 뒤에 합성하므로 영향 없음.
                kp = D.fk(pose); nx, ny = kp[0]; lim = int(ny - job['trim_head'])
                # 실제 머리 꼭대기: 머리 주변에서 폭 30px 이상이 25줄 넘게 이어지기 시작하는 줄 — 그보다 아래는 자르지 않는다
                win = (char[:, max(0, int(nx - 90)):int(nx + 80), 3] > 0).sum(1); top = None
                for r in range(max(0, int(ny - 300)), int(ny) - 25):
                    if (win[r:r + 25] >= 30).all(): top = r; break
                if top is not None: lim = min(lim, top - 6)
                if lim > 0: char[:lim, :, 3] = 0
                # 잘라 내고 남아 떠 있는 조각 제거: 가장 큰 덩어리(몸)의 8% 미만인 분리된 조각을 지운다
                n, lab, st, _ = cv2.connectedComponentsWithStats((char[..., 3] > 0).astype(np.uint8), 8)
                if n > 2:
                    big = st[1:, cv2.CC_STAT_AREA].max()
                    for k in range(1, n):
                        if st[k, cv2.CC_STAT_AREA] < big * .08: char[lab == k, 3] = 0
            comp, tip = composite(char, pose, wpn, (job.get('weapon') or {}).get('grip', .4))
            frames.append(D.pixel(comp, P)); keys.append((an, i))
            if tip is None: kp = D.fk(pose); tip = (kp[4][0] + PADL, kp[4][1] + PADT)
            tips.append([round((tip[0] - D.X0 - PADL) / P), round((tip[1] - D.GROUND - PADT) / P)])
    pal = D.shared_palette(frames, job.get('colors', 48)); frames = [D.outline(f) for f in pal]
    for (an, i), f in zip(keys, frames): Image.fromarray(f).save(os.path.join(out, f'{an}_{i}_dot.png'))
    fh, fw = frames[0].shape[:2]
    json.dump({'id': job['id'], 'fw': fw, 'fh': fh, 'P': P, 'anchor': [(D.X0 + PADL) // P, (D.GROUND + PADT) // P],
               'anims': {an: len(v) for an, v in anims.items()}, 'tips': tips}, open(os.path.join(out, 'meta.json'), 'w'))
    print('DONE', job['id'], fw, fh, len(frames), flush=True)
    return p

if __name__ == '__main__':
    from jobs import JOBS
    names = sys.argv[1:]; p = None; last_lora = object()
    for n in names:
        job = JOBS[n]
        if job.get('lora') != last_lora and p is not None: del p; torch.cuda.empty_cache(); p = None   # LoRA 가 바뀌면 다시 불러온다
        last_lora = job.get('lora')
        try: p = run(job, p)
        except Exception as e: print('FAIL', n, repr(e)[:300], flush=True); p = None; torch.cuda.empty_cache()
    print('ALLDONE', flush=True)
