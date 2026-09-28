"""던파풍 AI 스프라이트 공통 모듈.
- 관절 각도(FK)로 OpenPose 뼈대를 만든다 → 동작 프레임을 정확히 지정
- 파이프라인: Animagine XL 4.0 + T2I-Adapter(오픈포즈) + IP-Adapter Plus(기준 그림) + 캐릭터 LoRA
- 배경 제거 · 고정 배율 혼합 도트 변환(PixelOE + 실루엣 외곽선) · 프레임 공통 팔레트
"""
import os, math
os.environ.setdefault('HF_HOME', r'C:\Users\audrl\sprite_ai\hf')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
import numpy as np, cv2, torch
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 832, 1216
GROUND, X0, S = 1110, 400, .78
SEG = dict(torso=280, upper=118, fore=108, thigh=215, shin=215)

# ---------------- 캐릭터 ----------------
Q = 'masterpiece, high score, absurdres'
BASE = 'detailed armor, detailed face, anime coloring'
NEG = ('facing left, from front, scenery, sky, clouds, speed lines, cinematic lighting, particles, colored background, close-up, upper body, cropped, '
       'lowres, bad anatomy, bad hands, extra arms, two weapons, text, watermark, worst quality, low quality, blurry, chibi, multiple views, ground shadow')
CHARS = {
  'zhao': dict(name='조운', token='zhaoyun_dnf', ref='out/zhao_attack_23_hd.png', flip=False,
               desc='1boy, solo, zhao yun, young handsome chinese general, silver armor, gold trim, blue cape, silver helmet, red plume, holding spear'),
  'guan': dict(name='관우', token='guanyu_dnf', ref='out/guan_stance_23_hd.png', flip=True,
               desc='1boy, solo, guan yu, muscular chinese general, red face, long black beard, green hat, green robe, golden armor, holding guandao'),
}
def prompt(cid, lora=True):
    c = CHARS[cid]; return f"{c['token'] + ', ' if lora else ''}full body, facing right, from side, white background, simple background, {c['desc']}, {BASE}, {Q}"
def ref_image(cid):
    c = CHARS[cid]; im = Image.open(os.path.join(HERE, c['ref'])).convert('RGB')
    return im.transpose(Image.FLIP_LEFT_RIGHT) if c['flip'] else im

# ---------------- 관절 각도 → 오픈포즈 뼈대 ----------------
LIMBS = [[2,3],[2,6],[3,4],[4,5],[6,7],[7,8],[2,9],[9,10],[10,11],[2,12],[12,13],[13,14],[2,1],[1,15],[15,17],[1,16],[16,18]]
COLORS = [[255,0,0],[255,85,0],[255,170,0],[255,255,0],[170,255,0],[85,255,0],[0,255,0],[0,255,85],[0,255,170],[0,255,255],[0,170,255],[0,85,255],[0,0,255],[85,0,255],[170,0,255],[255,0,255],[255,0,170],[255,0,85]]
def fk(p):
    """p: lean · aR,bR(가까운 팔: 어깨 각, 팔꿈치 굽힘) · aL,bL(먼 팔) · tR,kR,tL,kL(다리) · head · dx. 각도는 도(°), 아래가 0, 앞(+x)이 +."""
    r = math.radians; L = {k: v * S for k, v in SEG.items()}; g = lambda k, d: p.get(k, d)
    lean = r(g('lean', 6))
    def leg(hx, t, k):
        kn = (hx + L['thigh'] * math.sin(r(t)), L['thigh'] * math.cos(r(t)))
        return kn, (kn[0] + L['shin'] * math.sin(r(t + k)), kn[1] + L['shin'] * math.cos(r(t + k)))
    kR, aRk = leg(-26 * S, g('tR', -20), g('kR', 6)); kL, aLk = leg(26 * S, g('tL', 24), g('kL', -10))
    ox, oy = X0 + g('dx', 0), GROUND - max(aRk[1], aLk[1])
    P = lambda q: (ox + q[0], oy + q[1])
    rot = lambda x, y, a: (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a))
    neck = (math.sin(lean) * L['torso'], -math.cos(lean) * L['torso'])
    def off(x, y, a=lean): d = rot(x * S, y * S, a); return (neck[0] + d[0], neck[1] + d[1])
    shR, shL = off(-44, 10), off(44, 5)
    def arm(sh, a, b):
        el = (sh[0] + L['upper'] * math.sin(r(a)), sh[1] + L['upper'] * math.cos(r(a)))
        return el, (el[0] + L['fore'] * math.sin(r(a + b)), el[1] + L['fore'] * math.cos(r(a + b)))
    eR, wR = arm(shR, g('aR', 20), g('bR', 55)); eL, wL = arm(shL, g('aL', 40), g('bL', 45))
    ha = lean + r(g('head', 0)); nose = off(36, -92, ha)
    kp = [nose, neck, shR, eR, wR, shL, eL, wL, (-26 * S, 0), kR, aRk, (26 * S, 0), kL, aLk,
          (nose[0] - 6 * S, nose[1] - 16 * S), (nose[0] + 18 * S, nose[1] - 14 * S), off(-30, -80, ha), None]
    return [None if q is None else P(q) for q in kp]
def draw_pose(kp):
    c = np.zeros((H, W, 3), np.uint8)
    for i, (a, b) in enumerate(LIMBS):
        A, B = kp[a-1], kp[b-1]
        if A is None or B is None: continue
        mx, my = (A[0]+B[0])/2, (A[1]+B[1])/2; Ln = math.hypot(A[0]-B[0], A[1]-B[1]); ang = math.degrees(math.atan2(A[1]-B[1], A[0]-B[0]))
        cv2.fillConvexPoly(c, cv2.ellipse2Poly((int(mx), int(my)), (int(Ln/2), 6), int(ang), 0, 360, 1), [int(v*.6) for v in COLORS[i]])
    for i, q in enumerate(kp):
        if q is not None: cv2.circle(c, (int(q[0]), int(q[1])), 6, COLORS[i], -1)
    return Image.fromarray(c)

STANCE = dict(lean=6, aR=20, bR=55, aL=40, bL=45, tR=-20, kR=6, tL=24, kL=-10)
def lerp(a, b, t): return {k: a.get(k, STANCE.get(k, 0)) * (1 - t) + b.get(k, STANCE.get(k, 0)) * t for k in set(a) | set(b) | set(STANCE)}
ANIMS = {
  'idle': [dict(STANCE, lean=6 + 1.5 * math.sin(i / 4 * 2 * math.pi), kR=6 + 5 * (1 - math.cos(i / 4 * 2 * math.pi)), kL=-10 - 5 * (1 - math.cos(i / 4 * 2 * math.pi)),
                aR=20 + 3 * math.sin(i / 4 * 2 * math.pi), aL=40 + 3 * math.sin(i / 4 * 2 * math.pi)) for i in range(4)],
  'thrust': [STANCE,
             dict(lean=-4, aR=-35, bR=100, aL=30, bL=60, tR=-28, kR=10, tL=26, kL=-12),
             dict(lean=10, aR=30, bR=50, aL=55, bL=30, tR=-32, kR=6, tL=34, kL=-24, dx=15),
             dict(lean=22, aR=80, bR=5, aL=75, bL=10, tR=-38, kR=4, tL=40, kL=-30, dx=40),
             dict(lean=20, aR=82, bR=3, aL=76, bL=8, tR=-38, kR=4, tL=40, kL=-30, dx=42),
             dict(lean=10, aR=45, bR=35, aL=50, bL=35, tR=-26, kR=6, tL=30, kL=-16, dx=15)],
  'slash': [STANCE,
            dict(lean=-6, aR=160, bR=20, aL=150, bL=30, tR=-22, kR=8, tL=26, kL=-12),
            dict(lean=4, aR=130, bR=10, aL=120, bL=20, tR=-28, kR=6, tL=30, kL=-18, dx=10),
            dict(lean=16, aR=80, bR=-10, aL=70, bL=0, tR=-34, kR=4, tL=36, kL=-26, dx=25),
            dict(lean=22, aR=30, bR=-20, aL=25, bL=0, tR=-36, kR=4, tL=38, kL=-28, dx=30),
            dict(lean=10, aR=30, bR=40, aL=40, bL=40, tR=-24, kR=6, tL=28, kL=-14, dx=15)],
}
WALK = [dict(STANCE, tR=a, kR=8, tL=-a, kL=4, aR=18, aL=38) for a in (-24, 0, 24)]
DATASET_POSES = [STANCE, ANIMS['idle'][2]] + ANIMS['thrust'][1:5] + ANIMS['slash'][1:5] + WALK

# ---------------- 파이프라인 ----------------
def load_pipe(ip=True, lora=None):
    from diffusers import StableDiffusionXLAdapterPipeline, T2IAdapter, AutoencoderKL, EulerAncestralDiscreteScheduler
    from transformers import CLIPVisionModelWithProjection
    dt = torch.float16
    ad = T2IAdapter.from_pretrained('TencentARC/t2i-adapter-openpose-sdxl-1.0', torch_dtype=dt)
    vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt)
    kw = {}
    if ip: kw['image_encoder'] = CLIPVisionModelWithProjection.from_pretrained('h94/IP-Adapter', subfolder='models/image_encoder', torch_dtype=dt)
    p = StableDiffusionXLAdapterPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', adapter=ad, vae=vae, torch_dtype=dt, **kw)
    p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config)
    if ip: p.load_ip_adapter('h94/IP-Adapter', subfolder='sdxl_models', weight_name='ip-adapter-plus_sdxl_vit-h.safetensors', image_encoder_folder=None)
    if lora: p.load_lora_weights(os.path.dirname(lora), weight_name=os.path.basename(lora), adapter_name='char')
    p.enable_model_cpu_offload(); p.vae.enable_slicing(); p.vae.enable_tiling()
    return p
def load_pipe_cn(cid, lora_w=.75, img2img=False):
    """ControlNet 오픈포즈(팔 · 무기 자세를 강하게 따름) + IP-Adapter + 캐릭터 LoRA(합쳐 넣음). 가중치를 fp8 로 저장해 8GB 에 맞춘다."""
    from diffusers import StableDiffusionXLControlNetPipeline, StableDiffusionXLControlNetImg2ImgPipeline, ControlNetModel, AutoencoderKL, EulerAncestralDiscreteScheduler
    from transformers import CLIPVisionModelWithProjection
    dt = torch.float16
    cls = StableDiffusionXLControlNetImg2ImgPipeline if img2img else StableDiffusionXLControlNetPipeline
    cn = ControlNetModel.from_pretrained('xinsir/controlnet-openpose-sdxl-1.0', torch_dtype=dt)
    vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt)
    ie = CLIPVisionModelWithProjection.from_pretrained('h94/IP-Adapter', subfolder='models/image_encoder', torch_dtype=dt)
    p = cls.from_pretrained('cagliostrolab/animagine-xl-4.0', controlnet=cn, vae=vae, image_encoder=ie, torch_dtype=dt)
    p.vae.register_to_config(force_upcast=False)
    p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config)
    p.load_ip_adapter('h94/IP-Adapter', subfolder='sdxl_models', weight_name='ip-adapter-plus_sdxl_vit-h.safetensors', image_encoder_folder=None)
    p.load_lora_weights(os.path.join(HERE, 'lora'), weight_name=cid + '.safetensors', adapter_name='char'); p.fuse_lora(lora_scale=lora_w); p.unload_lora_weights()
    p.unet.enable_layerwise_casting(storage_dtype=torch.float8_e4m3fn, compute_dtype=dt)
    p.controlnet.enable_layerwise_casting(storage_dtype=torch.float8_e4m3fn, compute_dtype=dt)
    p.enable_model_cpu_offload(); p.vae.enable_slicing(); p.vae.enable_tiling()
    return p
def generate_cn(p, cid, pose, seed, ip_scale=.25, cn_scale=1.0, steps=30, cfg=5.0):
    p.set_ip_adapter_scale(ip_scale)
    return p(prompt=prompt(cid), negative_prompt=NEG, image=draw_pose(fk(pose)), controlnet_conditioning_scale=cn_scale, ip_adapter_image=ref_image(cid),
             num_inference_steps=steps, guidance_scale=cfg, width=W, height=H, generator=torch.Generator('cpu').manual_seed(seed)).images[0]
def generate(p, cid, pose, seed, ip_scale=.6, lora=True, steps=30, cfg=5.0, ad_scale=1.0):
    kw = {}
    if ip_scale is not None: p.set_ip_adapter_scale(ip_scale); kw['ip_adapter_image'] = ref_image(cid)
    return p(prompt=prompt(cid, lora), negative_prompt=NEG, image=draw_pose(fk(pose)), adapter_conditioning_scale=ad_scale,
             num_inference_steps=steps, guidance_scale=cfg, width=W, height=H, generator=torch.Generator('cpu').manual_seed(seed), **kw).images[0]

# ---------------- 배경 제거 ----------------
def cutout(img, tol=30):
    a = np.array(img.convert('RGB'))
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]).astype(np.int16); bgc = np.median(border, axis=0)
    near = (np.abs(a.astype(np.int16) - bgc).max(axis=2) < tol).astype(np.uint8) * 255
    m = np.zeros((a.shape[0]+2, a.shape[1]+2), np.uint8); f = near.copy()
    for (x, y) in [(0,0),(a.shape[1]-1,0),(0,a.shape[0]-1),(a.shape[1]-1,a.shape[0]-1),(a.shape[1]//2,0)]:
        if f[y, x] == 255: cv2.floodFill(f, m, (x, y), 128)
    bg = (f == 128)
    # 몸 · 망토 · 무기에 둘러싸인 배경(구멍)도 제거 — 배경색과 가까운 큰 덩어리
    n, lab, st, _ = cv2.connectedComponentsWithStats(near, 8)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 600: bg |= (lab == i)
    alpha = cv2.morphologyEx(np.where(bg, 0, 255).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3,3), np.uint8))
    return np.dstack([a, alpha])

# ---------------- 고정 배율 혼합 도트 변환 ----------------
DOT_P = 5  # 원화 5px → 도트 1px (몸 약 700px → 약 140px)
def pixel(rgba, P=DOT_P):
    from pixeloe.legacy.pixelize import pixelize
    h, w = rgba.shape[:2]; h -= h % P; w -= w % P; rgba = rgba[:h, :w]
    a = rgba[..., 3:4].astype(np.float32) / 255
    rgb = (rgba[..., :3] * a + 190 * (1 - a)).astype(np.uint8)
    sm = pixelize(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), mode='contrast', target_size=(w // P, h // P), patch_size=P, thickness=1, no_upscale=True)
    sm = cv2.cvtColor(sm, cv2.COLOR_BGR2RGB)
    al = (cv2.resize(rgba[..., 3], (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_AREA) > 120).astype(np.uint8) * 255
    return np.dstack([sm, al])
def outline(img):
    rgb = img[..., :3].astype(np.float32); m = (img[..., 3] > 0).astype(np.float32)
    k = np.array([[0,1,0],[1,0,1],[0,1,0]], np.float32)
    s = cv2.filter2D(rgb * m[..., None], -1, k, borderType=cv2.BORDER_CONSTANT); n = cv2.filter2D(m, -1, k, borderType=cv2.BORDER_CONSTANT)
    ring = (n > 0) & (m == 0); out = img.copy()
    out[ring, :3] = np.clip(s[ring] / n[ring][:, None] * .28 + np.array([11, 5, 15]), 0, 255).astype(np.uint8); out[ring, 3] = 255
    er = cv2.erode(m, np.ones((3,3), np.uint8), borderType=cv2.BORDER_CONSTANT); edge = (m > 0) & (er == 0)
    out[edge, :3] = (out[edge, :3] * .8).astype(np.uint8)
    return out
def shared_palette(frames, k=48):
    """모든 프레임을 같은 k색 팔레트로 — 프레임 사이 색 깜빡임을 줄인다."""
    px = np.concatenate([f[f[..., 3] > 0][:, :3] for f in frames]).astype(np.float32)
    if len(px) > 200000: px = px[np.random.RandomState(0).choice(len(px), 200000, replace=False)]
    _, _, cent = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .5), 3, cv2.KMEANS_PP_CENTERS)
    out = []
    for f in frames:
        g = f.copy(); m = g[..., 3] > 0; c = g[m][:, :3].astype(np.float32)
        d = ((c[:, None, :] - cent[None]) ** 2).sum(-1); g[m, :3] = cent[d.argmin(1)].astype(np.uint8); out.append(g)
    return out
