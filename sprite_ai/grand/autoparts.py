"""그랑풍 SD 부품 자동 분리 (녹색 배경 원화용).
원화 → 크로마키 배경 제거 → 뼈대 관절 기준으로 픽셀마다 가장 가까운 뼈(두께 가중)에 배정 → 부품 PNG + rig.js.
보이는 팔(뒤쪽 x)을 지운 몸통은 AI 인페인팅(미리 채우기 + 약한 다시 그리기)으로 만든다.
실행: venv\\Scripts\\python grand\\autoparts.py <id> <원화 파일> <무기 이미지> <무기 길이(유닛)> <쥐는 위치 0~1> [inpaint 설명]
"""
import os, sys, json, math, time, numpy as np, cv2, torch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dnfai as D
from PIL import Image
from grand_gen import JOINTS as J0

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = r'C:\Users\audrl\OneDrive\Documents\카카오톡 받은 파일\삼국전기_RPG_Grand'

def chroma(im):
    """녹색 배경 제거: 테두리에서 이어진 녹색 영역을 지우고, 가장자리의 녹색 번짐을 줄인다."""
    a = np.array(im.convert('RGB')).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = ((g - np.maximum(r, b)) > 38) & (g > 90)
    f = green.astype(np.uint8) * 255; h, w = f.shape; m = np.zeros((h + 2, w + 2), np.uint8)
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2), (w - 1, h // 2)]:
        if f[y, x] == 255: cv2.floodFill(f, m, (x, y), 128)
    bg = f == 128
    edge = cv2.dilate(bg.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & ~bg
    soft = edge & ((g - np.maximum(r, b)) > 15)                          # 가장자리 녹색 섞인 픽셀
    bg |= cv2.morphologyEx(bg.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool) & ((g - np.maximum(r, b)) > 25)
    out = a.copy(); spill = (g > np.maximum(r, b)) & ~bg
    out[..., 1] = np.where(spill, np.maximum(r, b) + (g - np.maximum(r, b)) // 4, g)   # 녹색 번짐 억제
    alpha = np.where(bg, 0, np.where(soft, 150, 255)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)        # 떨어진 작은 얼룩 제거
    if n > 2:
        big = st[1:, cv2.CC_STAT_AREA].max()
        for k in range(1, n):
            if st[k, cv2.CC_STAT_AREA] < big * .02: alpha[lab == k] = 0
    return np.dstack([out.clip(0, 255).astype(np.uint8), alpha])

def cutout_line(im, close=5, tol=40):
    """흰 배경 원화: 짙은 외곽선을 막아 배경을 외곽선까지만 채워 지운다 (흰 갑옷 · 얼굴이 배경과 색이 같아도 안전)."""
    a = np.array(im.convert('RGB')); h, w = a.shape[:2]
    lum = a.astype(np.float32) @ np.array([.299, .587, .114], np.float32)
    wall = cv2.dilate((lum < 120).astype(np.uint8), np.ones((close, close), np.uint8))
    free = (1 - wall).astype(np.uint8) * 255; m = np.zeros((h + 2, w + 2), np.uint8)
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2), (w - 1, h // 2)]:
        if free[y, x] == 255: cv2.floodFill(free, m, (x, y), 128)
    bg = free == 128; bgc = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]).astype(np.int16), axis=0)
    halo = cv2.dilate(bg.astype(np.uint8), np.ones((close + 2, close + 2), np.uint8)).astype(bool) & (np.abs(a.astype(np.int16) - bgc).max(2) < tol)
    alpha = np.where(bg | halo, 0, 255).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
    if n > 2:
        big = st[1:, cv2.CC_STAT_AREA].max()
        for k in range(1, n):
            if st[k, cv2.CC_STAT_AREA] < big * .02: alpha[lab == k] = 0
    return np.dstack([a, alpha])
def cutout_any(im):
    a = np.array(im.convert('RGB')).astype(np.int16); b = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    return chroma(im) if ((b[:, 1] - np.maximum(b[:, 0], b[:, 2])) > 38).mean() > .5 else cutout_line(im)
def recolor(rgba, hue, sm=1.0, vm=1.0):
    """파란 계열(185~255°)만 목표 색상으로 — 세력 색 바꾸기 (피부 · 금속 · 붉은 장식은 그대로)."""
    import colorsys
    a = rgba.astype(np.float32) / 255; rgb = a[..., :3]; mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60; s_ = d / (mx + 1e-6)
    m = (h > 185) & (h < 255) & (s_ > .15) & (a[..., 3] > 0)
    v2 = np.clip(mx * vm, 0, 1); s2 = np.clip(s_ * sm, 0, 1); c = v2 * s2; hn = hue / 60; x = c * (1 - abs(hn % 2 - 1)); z = np.zeros_like(c)
    i = int(hn) % 6; R, G, B = [(c, x, z), (x, c, z), (z, c, x), (z, x, c), (x, z, c), (c, z, x)][i]
    out = np.stack([R, G, B], -1) + (v2 - c)[..., None]; rgb[m] = out[m]; a[..., :3] = rgb
    return (a * 255).clip(0, 255).astype(np.uint8)

def seg_dist(h, w, p, q, ext=0):
    """점 p→q 선분(끝을 ext 만큼 늘림)까지 거리 지도."""
    p, q = np.array(p, np.float32), np.array(q, np.float32); d = q - p; L = np.linalg.norm(d) + 1e-6; u = d / L
    q = q + u * ext; d = q - p; L2 = (d * d).sum()
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); t = np.clip(((xx - p[0]) * d[0] + (yy - p[1]) * d[1]) / L2, 0, 1)
    return np.hypot(xx - (p[0] + t * d[0]), yy - (p[1] + t * d[1]))

def ang(a, b): return math.atan2(-(b[0] - a[0]), b[1] - a[1])

def inpaint_arm(src_rgb, mask, prompt):
    from diffusers import StableDiffusionXLInpaintPipeline, AutoencoderKL, EulerAncestralDiscreteScheduler
    dt = torch.float16
    p = StableDiffusionXLInpaintPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', vae=AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt), torch_dtype=dt)
    p.vae.register_to_config(force_upcast=False); p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config); p.enable_model_cpu_offload()
    m = mask.astype(np.uint8) * 255; pre = cv2.inpaint(src_rgb, m, 21, cv2.INPAINT_TELEA)
    out = p(prompt=prompt, negative_prompt=D.NEG + ', arm, hand, fist, sleeve, gauntlet, shoulder pad, weapon, extra limbs, person', image=Image.fromarray(pre),
            mask_image=Image.fromarray(m), strength=.6, num_inference_steps=40, guidance_scale=5, padding_mask_crop=160, width=src_rgb.shape[1], height=src_rgb.shape[0],
            generator=torch.Generator('cpu').manual_seed(11)).images[0]
    del p; torch.cuda.empty_cache(); return np.array(out)

def run(cid, src, wfile, w_len, w_grip, inp_prompt, w_rot=-90, w_flip=False, hue=None):
    OUT = os.path.join(GAME, 'grand', cid); os.makedirs(OUT, exist_ok=True); WORK = os.path.join(HERE, 'work', cid); os.makedirs(WORK, exist_ok=True)
    im = Image.open(src).convert('RGB'); rgba = cutout_any(im); H, W = rgba.shape[:2]; S = rgba[..., 3] > 0
    if hue is not None: rgba = recolor(rgba, hue, .95, .78)
    j = {k: tuple(v) for k, v in J0.items() if isinstance(v, (list, tuple))}
    neck, hip = j['neck'], j['hip']
    # 보이는 팔 = 뒤쪽(x 작은) 팔 → 게임의 앞팔(무기 쥔 팔). 숨은 팔(앞쪽 x)은 버리고 뒷팔은 앞팔 사본을 쓴다
    shV, elV, haV = j['shB'], j.get('elB', None) or j['shB'], j['haB']
    elV = tuple(np.add(shV, np.subtract(haV, shV)) * 0 + (np.array(shV) + (np.array(haV) - np.array(shV)) * .47))
    shH, haH = j['shF'], j['haF']
    knB = tuple(np.array(j['hpB']) + (np.array(j['ftB']) - np.array(j['hpB'])) * .5); knF = tuple(np.array(j['hpF']) + (np.array(j['ftF']) - np.array(j['hpF'])) * .5)
    bones = {  # 이름: (시작, 끝, 끝 연장, 두께 가중)
      'torso': (neck, hip, 0, 95), 'upper': (shV, elV, 0, 46), 'lower': (elV, haV, 40, 46), 'hidden': (shH, haH, 40, 44),
      'thighF': (j['hpF'], knF, 0, 50), 'shinF': (knF, j['ftF'], 30, 50), 'thighB': (j['hpB'], knB, 0, 50), 'shinB': (knB, j['ftB'], 30, 50)}
    names = list(bones); Dm = np.stack([seg_dist(H, W, b[0], b[1], b[2]) / b[3] for b in bones.values()])
    lab = Dm.argmin(0); body = S & (np.arange(H)[:, None] >= neck[1])
    P = {n: body & (lab == i) for i, n in enumerate(names)}
    head = S & (np.arange(H)[:, None] < neck[1])
    # 몸통 → 허리 아래는 허리갑, 등 뒤로 튀어나온 부분은 망토
    tor = P['torso']; xs = np.arange(W)[None, :]; ys = np.arange(H)[:, None]
    back_x = neck[0] - 70; cape = tor & (xs < back_x) & (ys > neck[1] + 10)
    skirt = tor & ~cape & (ys > hip[1] - 55); torso = tor & ~cape & ~skirt
    for k in ('thighF', 'thighB'): P[k] &= ys > hip[1] - 40
    # 관절 겹침: 위 · 아래 마디를 서로 14px 넓힌다
    def grow(a, b): return (cv2.dilate(a.astype(np.uint8), np.ones((29, 29), np.uint8)).astype(bool) & (a | b))
    upper, lower = grow(P['upper'], P['lower']), grow(P['lower'], P['upper'])
    thF, shF2 = grow(P['thighF'], P['shinF']), grow(P['shinF'], P['thighF']); thB, shB2 = grow(P['thighB'], P['shinB']), grow(P['shinB'], P['thighB'])
    # 보이는 팔을 지운 몸통(AI 인페인팅)
    arm = upper | lower; hole = cv2.dilate(arm.astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool) & ~cv2.dilate((thF | thB | shF2 | shB2).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    fn = os.path.join(WORK, 'armless.png')
    if not os.path.exists(fn):
        t = time.time(); Image.fromarray(inpaint_arm(np.array(im), hole, inp_prompt)).save(fn); print('inpaint', round(time.time() - t), flush=True)
    rgba2 = cutout_any(Image.open(fn)); S2 = rgba2[..., 3] > 0
    if hue is not None: rgba2 = recolor(rgba2, hue, .95, .78)
    torso2 = (torso | (hole & (ys < hip[1] - 55) & (xs >= back_x))) & S2; cape2 = (cape | (hole & (xs < back_x))) & S2
    foot = int(np.where(S.any(1))[0].max()); K = (foot - neck[1]) / 70.0; CX = neck[0]
    def unit(p): return [round((p[0] - CX) / K, 2), round((p[1] - foot) / K, 2)]
    def save(name, src_rgba, mask, pivot, extend_top=0):
        part = src_rgba.copy(); part[..., 3] = np.where(mask, part[..., 3], 0)
        n, labs, st, _ = cv2.connectedComponentsWithStats((part[..., 3] > 0).astype(np.uint8), 8)
        if n > 2:
            big = st[1:, cv2.CC_STAT_AREA].max()
            for k in range(1, n):
                if st[k, cv2.CC_STAT_AREA] < big * .1: part[labs == k, 3] = 0
        if not (part[..., 3] > 0).any(): return None
        yy, xx = np.where(part[..., 3] > 0); x0, y0, x1, y1 = xx.min(), yy.min(), xx.max() + 1, yy.max() + 1; crop = part[y0:y1, x0:x1]
        if extend_top:
            top = np.zeros((extend_top, crop.shape[1], 4), np.uint8)
            for x in range(crop.shape[1]):
                col = np.where(crop[:, x, 3] > 0)[0]
                if len(col): top[:, x] = crop[col[min(2, len(col) - 1)], x]
            top[..., 3] = (top[..., 3] * np.linspace(0, 1, extend_top)[:, None] ** .7).astype(np.uint8); crop = np.concatenate([top, crop]); y0 -= extend_top
        Image.fromarray(crop).save(os.path.join(OUT, name + '.png'))
        return {'file': name + '.png', 'x0': round((x0 - pivot[0]) / K, 3), 'y0': round((y0 - pivot[1]) / K, 3), 'w': round((x1 - x0) / K, 3), 'h': round(crop.shape[0] / K, 3)}
    skp, cpp = (hip[0] + 25, hip[1] - 55), (back_x + 10, neck[1] + 15)
    parts = {'head': save('head', rgba2, head & S2, neck), 'torso': save('torso', rgba2, torso2, neck), 'skirt': save('skirt', rgba2, skirt & S2, skp),
             'cape': save('cape', rgba2, cape2, cpp), 'upper': save('upper', rgba, upper, shV), 'lower': save('lower', rgba, lower, elV),
             'thighF': save('thighF', rgba2, thF & S2, j['hpF'], 40), 'shinF': save('shinF', rgba2, shF2 & S2, knF),
             'thighB': save('thighB', rgba2, thB & S2, j['hpB'], 40), 'shinB': save('shinB', rgba2, shB2 & S2, knB)}
    parts = {k: v for k, v in parts.items() if v}
    # 무기
    wp = Image.fromarray(D.cutout(Image.open(wfile))); a = np.array(wp); yy, xx = np.where(a[..., 3] > 0); wp = wp.crop((xx.min(), yy.min(), xx.max() + 1, yy.max() + 1))
    if w_flip: wp = wp.transpose(Image.FLIP_LEFT_RIGHT)
    wp = wp.rotate(w_rot, expand=True); sc = w_len * K / wp.height; wp = wp.resize((max(1, round(wp.width * sc)), round(wp.height * sc)), Image.LANCZOS); wp.save(os.path.join(OUT, 'weapon.png'))
    parts['weapon'] = {'file': 'weapon.png', 'x0': round(-wp.width / 2 / K, 3), 'y0': round(-w_grip * w_len, 3), 'w': round(wp.width / K, 3), 'h': w_len}
    d = lambda p, q: round(math.hypot(q[0] - p[0], q[1] - p[1]) / K, 2)
    rig = {'id': cid, 'version': 2, 'stamp': int(time.time()), 'px_per_unit': round(K, 3), 'parts': parts,
           'joints': {'neck': unit(neck), 'shF': unit(shV), 'shB': unit(shH), 'hipF': unit(j['hpF']), 'hipB': unit(j['hpB']), 'skirt': unit(skp), 'cape': unit(cpp)},
           'arm': {'l1': d(shV, elV), 'l2': d(elV, haV), 'r1': round(ang(shV, elV), 3), 'r2': round(ang(elV, haV), 3)},
           'legF': {'l1': d(j['hpF'], knF), 'l2': d(knF, j['ftF']), 'r1': round(ang(j['hpF'], knF), 3), 'r2': round(ang(knF, j['ftF']), 3)},
           'legB': {'l1': d(j['hpB'], knB), 'l2': d(knB, j['ftB']), 'r1': round(ang(j['hpB'], knB), 3), 'r2': round(ang(knB, j['ftB']), 3)},
           'tip': round((1 - w_grip) * w_len, 2)}
    open(os.path.join(OUT, 'rig.js'), 'w', encoding='utf-8').write(f'/* 그랑풍 SD 부품 · 관절 ({cid}) — sprite_ai/grand/autoparts.py 로 자동 생성 */\nGRAND_REGISTER(' + json.dumps(rig) + ');\n')
    # 확인용 미리보기: 부품 색 겹치기
    prev = np.array(im).copy(); cols = [(255, 80, 80), (80, 200, 80), (240, 200, 60), (80, 120, 255), (255, 0, 255), (200, 0, 160), (0, 220, 220), (0, 140, 160), (160, 100, 40), (120, 70, 30)]
    for (n2, mk), c in zip([('head', head), ('torso', torso2), ('skirt', skirt), ('cape', cape2), ('upper', upper), ('lower', lower), ('thighF', thF), ('shinF', shF2), ('thighB', thB), ('shinB', shB2)], cols):
        mm = mk & S; prev[mm] = (prev[mm] * .5 + np.array(c) * .5).astype(np.uint8)
    Image.fromarray(prev).resize((W // 2, H // 2)).save(os.path.join(WORK, 'parts_preview.png'))
    print('DONE', cid, {k: (v['w'], v['h']) for k, v in parts.items()}, flush=True)

if __name__ == '__main__':
    a = sys.argv[1:]
    run(a[0], a[1], a[2], float(a[3]), float(a[4]), a[5] if len(a) > 5 else '', w_flip=len(a) > 6 and a[6] == 'flip', hue=float(a[7]) if len(a) > 7 else None)
