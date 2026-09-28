"""던파풍 캐릭터 샘플: OpenPose 포즈 고정 → Animagine XL 4.0 원화 → 배경 제거 → 혼합 도트 변환(PixelOE + 실루엣 외곽선).
실행: C:\\Users\\audrl\\sprite_ai\\venv\\Scripts\\python gen_samples.py
"""
import os, sys, math
os.environ.setdefault('HF_HOME', r'C:\Users\audrl\sprite_ai\hf')
import numpy as np, cv2, torch
from PIL import Image, ImageDraw, ImageFont
from diffusers import StableDiffusionXLAdapterPipeline, T2IAdapter, AutoencoderKL, EulerAncestralDiscreteScheduler
from pixeloe.legacy.pixelize import pixelize

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
W, H = 832, 1216

# ---------- OpenPose 뼈대 (18점, 오른쪽을 보는 3/4 측면) ----------
LIMBS = [[2,3],[2,6],[3,4],[4,5],[6,7],[7,8],[2,9],[9,10],[10,11],[2,12],[12,13],[13,14],[2,1],[1,15],[15,17],[1,16],[16,18]]
COLORS = [[255,0,0],[255,85,0],[255,170,0],[255,255,0],[170,255,0],[85,255,0],[0,255,0],[0,255,85],[0,255,170],[0,255,255],[0,170,255],[0,85,255],[0,0,255],[85,0,255],[170,0,255],[255,0,255],[255,0,170],[255,0,85]]
POSES = {
  # nose, neck, Rsh, Rel, Rwr, Lsh, Lel, Lwr, Rhip, Rkn, Rank, Lhip, Lkn, Lank, Reye, Leye, Rear, Lear
  'stance': [(470,252),(430,345),(372,356),(352,488),(418,572),(488,350),(546,456),(566,548),(398,628),(345,830),(318,1050),(472,628),(548,826),(604,1046),(478,236),(506,238),(438,246),None],
  'attack': [(548,290),(488,372),(430,384),(570,420),(700,430),(548,378),(590,470),(652,470),(432,652),(356,860),(250,1060),(498,652),(630,836),(712,1046),(556,274),(582,276),(514,282),None],
}
def draw_pose(kp, sc=.74):
    kp = [None if p is None else ((p[0]-416)*sc+416, p[1]*sc+H*(1-sc)*.62) for p in kp]
    c = np.zeros((H, W, 3), np.uint8)
    for i, (a, b) in enumerate(LIMBS):
        A, B = kp[a-1], kp[b-1]
        if A is None or B is None: continue
        mx, my = (A[0]+B[0])/2, (A[1]+B[1])/2; L = math.hypot(A[0]-B[0], A[1]-B[1]); ang = math.degrees(math.atan2(A[1]-B[1], A[0]-B[0]))
        poly = cv2.ellipse2Poly((int(mx), int(my)), (int(L/2), 6), int(ang), 0, 360, 1)
        cv2.fillConvexPoly(c, poly, [int(v*.6) for v in COLORS[i]])
    for i, p in enumerate(kp):
        if p is not None: cv2.circle(c, (int(p[0]), int(p[1])), 6, COLORS[i], -1)
    return Image.fromarray(c)

# ---------- 캐릭터 ----------
Q = 'detailed face, sharp eyes, masterpiece, high score, great score, absurdres'
BASE = 'full body, standing, solo focus, character only, isolated on white, fighting stance, from side, facing right, looking to the side, dynamic pose, detailed armor, ornate, simple background, white background, no shadow, anime coloring, sharp focus'
NEG = 'scenery, sky, clouds, landscape, mountains, wind effects, speed lines, dramatic lighting, cinematic, light rays, dust, smoke, particles, gradient background, colored background, close-up, upper body, lowres, bad anatomy, bad hands, extra digits, missing fingers, text, watermark, signature, error, cropped, out of frame, worst quality, low quality, blurry, chibi, multiple views, reference sheet, border, frame, ground shadow, scenery, background objects'
CHARS = {
  'guan': ('관우', '1boy, solo, guan yu, three kingdoms, tall muscular chinese general, red face, very long black beard, green headscarf, green robe over golden armor, gold shoulder armor, holding guandao, green crescent blade polearm'),
  'zhao': ('조운', '1boy, solo, zhao yun, three kingdoms, young handsome chinese general, silver white armor with gold trim, blue cape, white helmet with red plume, holding long spear'),
}

def load_pipe():
    dt = torch.float16
    # 8GB 그래픽 메모리에 맞추려고 가벼운 T2I-Adapter(오픈포즈)로 포즈를 고정한다
    ad = T2IAdapter.from_pretrained('TencentARC/t2i-adapter-openpose-sdxl-1.0', torch_dtype=dt)
    vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt)
    p = StableDiffusionXLAdapterPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', adapter=ad, vae=vae, torch_dtype=dt)
    p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config)
    p.enable_model_cpu_offload(); p.vae.enable_slicing(); p.vae.enable_tiling()
    return p

# ---------- 배경 제거 (테두리에서 이어진 흰 배경) ----------
def cutout(img, tol=30):
    """테두리 색(흰색 · 회색 등 단색 배경)과 비슷하고 테두리에서 이어진 영역을 투명하게."""
    a = np.array(img.convert('RGB'))
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]).astype(np.int16); bgc = np.median(border, axis=0)
    near = (np.abs(a.astype(np.int16) - bgc).max(axis=2) < tol).astype(np.uint8) * 255
    m = np.zeros((a.shape[0]+2, a.shape[1]+2), np.uint8); f = near.copy()
    for (x, y) in [(0,0),(a.shape[1]-1,0),(0,a.shape[0]-1),(a.shape[1]-1,a.shape[0]-1),(a.shape[1]//2,0)]:
        if f[y, x] == 255: cv2.floodFill(f, m, (x, y), 128)
    alpha = np.where(f == 128, 0, 255).astype(np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((3,3), np.uint8))
    return np.dstack([a, alpha])

# ---------- 혼합 도트 변환 ----------
def hybrid(rgba, char_h=150):
    ys, xs = np.where(rgba[..., 3] > 0); y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    pad = 24; rgba = rgba[max(0,y0-pad):y1+pad, max(0,x0-pad):x1+pad]
    P = max(2, round((y1 - y0) / char_h))
    h, w = rgba.shape[:2]; h -= h % P; w -= w % P; rgba = rgba[:h, :w]
    a = rgba[..., 3:4].astype(np.float32) / 255
    rgb = (rgba[..., :3] * a + 190 * (1 - a)).astype(np.uint8)
    sm = pixelize(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), mode='contrast', target_size=(w // P, h // P), patch_size=P, thickness=1, no_upscale=True)
    sm = cv2.cvtColor(sm, cv2.COLOR_BGR2RGB)
    al = (cv2.resize(rgba[..., 3], (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_AREA) > 120).astype(np.float32)
    k = np.array([[0,1,0],[1,0,1],[0,1,0]], np.float32)
    s = cv2.filter2D(sm.astype(np.float32) * al[..., None], -1, k, borderType=cv2.BORDER_CONSTANT); n = cv2.filter2D(al, -1, k, borderType=cv2.BORDER_CONSTANT)
    ring = (n > 0) & (al == 0); out = np.dstack([sm, (al * 255).astype(np.uint8)])
    dark = s / np.maximum(n, 1)[..., None] * .28 + np.array([11, 5, 15])
    out[ring, :3] = np.clip(dark[ring], 0, 255).astype(np.uint8); out[ring, 3] = 255
    er = cv2.erode(al, np.ones((3,3), np.uint8), borderType=cv2.BORDER_CONSTANT); edge = (al > 0) & (er == 0)
    out[edge, :3] = (out[edge, :3] * .8).astype(np.uint8)
    return out

if __name__ == '__main__':
    which = sys.argv[1:] or list(CHARS)
    pipe = load_pipe()
    for pn, kp in POSES.items(): draw_pose(kp).save(os.path.join(OUT, f'pose_{pn}.png'))
    for cid in which:
        name, desc = CHARS[cid]
        for pn, kp in POSES.items():
            for seed in (11, 23):
                g = torch.Generator('cpu').manual_seed(seed)
                img = pipe(prompt=f'white background, simple background, {desc}, {BASE}, {Q}', negative_prompt=NEG, image=draw_pose(kp), adapter_conditioning_scale=1.0,
                           num_inference_steps=30, guidance_scale=5, width=W, height=H, generator=g).images[0]
                tag = f'{cid}_{pn}_{seed}'; img.save(os.path.join(OUT, tag + '_hd.png'))
                rgba = cutout(img); Image.fromarray(rgba).save(os.path.join(OUT, tag + '_cut.png'))
                Image.fromarray(hybrid(rgba)).save(os.path.join(OUT, tag + '_dot.png'))
                print('done', tag, flush=True)
