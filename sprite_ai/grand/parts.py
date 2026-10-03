"""SD 조운 원화 → 부품 PNG + 관절(rig.js). v2: 팔 · 다리 두 마디 + AI 인페인팅한 팔 없는 몸통.
- 몸통 · 망토 · 머리 · 허리갑 · 다리: 팔을 지우고 AI 로 다시 그린 원화(armless_11.png)에서 자른다
- 팔: 원래 원화에서 위팔 / 아래팔(+주먹) 으로 나눈다. 관절에서 겹치게 잘라 틈을 막는다
- 다리: 허벅지 / 정강이(+신발). 허벅지 윗부분은 허리갑 속으로 들어가게 위로 늘린다
게임 유닛: 발바닥 y=0, 목 y=-70 (원화 발바닥 1195, 목 585 → 1유닛 = 8.71px), 목 x=405 가 몸 중심.
"""
import os, sys, json, math, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dnfai as D
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'cand', 'zhao_sd_303.png'); BODY_SRC = os.path.join(HERE, 'cand', 'armless_11.png')
GAME = r'C:\Users\audrl\OneDrive\Documents\카카오톡 받은 파일\삼국전기_RPG_Grand'
OUT = os.path.join(GAME, 'grand', 'zhao'); os.makedirs(OUT, exist_ok=True)
FOOT_Y, NECK_Y, CX = 1195, 585, 405
K = (FOOT_Y - NECK_Y) / 70.0
def unit(p): return [round((p[0] - CX) / K, 2), round((p[1] - FOOT_Y) / K, 2)]

def cutout_line(im, close=5, tol=40):
    """외곽선 기준 배경 제거: 흰 갑옷 · 얼굴 · 바지가 밝은 배경과 색이 거의 같아 색만으로는 못 가른다.
    짙은 외곽선을 조금 두껍게 해 틈을 막고, 테두리에서 배경을 외곽선까지만 채운 뒤, 외곽선 바로 바깥의 밝은 테두리만 지운다."""
    a = np.array(im.convert('RGB')); h, w = a.shape[:2]
    lum = a.astype(np.float32) @ np.array([.299, .587, .114], np.float32)
    wall = cv2.dilate((lum < 120).astype(np.uint8), np.ones((close, close), np.uint8))
    free = (1 - wall).astype(np.uint8) * 255; m = np.zeros((h + 2, w + 2), np.uint8)
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2), (w - 1, h // 2)]:
        if free[y, x] == 255: cv2.floodFill(free, m, (x, y), 128)
    bg = free == 128
    bgc = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]).astype(np.int16), axis=0)
    halo = cv2.dilate(bg.astype(np.uint8), np.ones((close + 2, close + 2), np.uint8)).astype(bool) & (np.abs(a.astype(np.int16) - bgc).max(2) < tol)
    alpha = np.where(bg | halo, 0, 255).astype(np.uint8)
    return np.dstack([a, alpha])
orig = cutout_line(Image.open(SRC)); body = cutout_line(Image.open(BODY_SRC))
Image.fromarray(orig).save(os.path.join(HERE, 'cand', '_cut_orig.png')); Image.fromarray(body).save(os.path.join(HERE, 'cand', '_cut_body.png'))
H, W = orig.shape[:2]; A0 = orig[..., 3] > 0; A1 = body[..., 3] > 0
def poly(pts):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 1); return m.astype(bool)
def rect(x0, y0, x1, y1): return poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

# ---- 관절 (원화 좌표) ----
SH, EL, HA = (300, 650), (285, 748), (288, 870)                 # 어깨 · 팔꿈치 · 주먹 중심
HPF, KNF, FTF = (465, 885), (475, 1070), (480, 1195)            # 앞다리: 엉덩이 관절 · 무릎 · 발바닥
HPB, KNB, FTB = (340, 885), (300, 1070), (300, 1195)            # 뒷다리
SHB = (510, 650)                                                  # 먼 어깨(뒷팔을 붙이는 곳)
def ang(a, b): return math.atan2(-(b[0] - a[0]), b[1] - a[1])   # 게임 각도: 아래가 0, dir(a) = (-sin a, cos a)
def dist(a, b): return math.hypot(b[0] - a[0], b[1] - a[1]) / K

ARM = poly([(232, 612), (366, 612), (374, 700), (366, 908), (250, 908), (236, 800)])
FAR_HAND = rect(515, 775, 600, 910)
OV = 16   # 관절 겹침(px)
UPPER = ARM & rect(0, 0, W, EL[1] + OV); LOWER = ARM & rect(0, EL[1] - OV, W, H)
HEAD = rect(0, 0, W, 586) & ~poly([(250, 560), (330, 560), (330, 600), (250, 600)])
LEG_F = rect(405, 945, W, H); LEG_B = rect(228, 952, 405, H)
THIGH_F, SHIN_F = LEG_F & rect(0, 0, W, KNF[1] + OV), LEG_F & rect(0, KNF[1] - OV, W, H)
THIGH_B, SHIN_B = LEG_B & rect(0, 0, W, KNB[1] + OV), LEG_B & rect(0, KNB[1] - OV, W, H)
SKIRT = rect(318, 798, 575, 965) & ~LEG_F & ~LEG_B   # 왼쪽(망토 자리)은 빼서 회전해도 네모 모서리가 안 보이게
CAPE = rect(150, 560, 334, 965) & ~SKIRT
TORSO = rect(318, 584, 590, 802) & ~FAR_HAND

def save_part(name, src, alpha, mask, pivot, extend_top=0):
    part = src.copy(); part[..., 3] = np.where(mask & alpha, part[..., 3], 0)
    n, lab, st, _ = cv2.connectedComponentsWithStats((part[..., 3] > 0).astype(np.uint8), 8)   # 떨어진 작은 조각 제거
    if n > 2:
        big = st[1:, cv2.CC_STAT_AREA].max()
        for k2 in range(1, n):
            if st[k2, cv2.CC_STAT_AREA] < big * .1: part[lab == k2, 3] = 0
    ys, xs = np.where(part[..., 3] > 0); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    crop = part[y0:y1, x0:x1]
    if extend_top:   # 윗줄을 위로 늘려 허리갑 속으로 이어지게
        top = np.zeros((extend_top, crop.shape[1], 4), np.uint8)
        for x in range(crop.shape[1]):
            col = np.where(crop[:, x, 3] > 0)[0]
            if len(col): top[:, x] = crop[col[0] + 2 if len(col) > 2 else col[0], x]
        top[..., 3] = (top[..., 3] * np.linspace(0, 1, extend_top)[:, None] ** .7).astype(np.uint8)   # 위로 갈수록 투명 — 줄무늬 경계가 안 보이게
        crop = np.concatenate([top, crop]); y0 -= extend_top
    Image.fromarray(crop).save(os.path.join(OUT, name + '.png'))
    px, py = pivot
    return {'file': name + '.png', 'x0': round((x0 - px) / K, 3), 'y0': round((y0 - py) / K, 3), 'w': round((x1 - x0) / K, 3), 'h': round(crop.shape[0] / K, 3)}

NECK = (CX, NECK_Y)
parts = {
  'head':   save_part('head', body, A1, HEAD, NECK),
  'torso':  save_part('torso', body, A1, TORSO, NECK),
  'skirt':  save_part('skirt', body, A1, SKIRT, (430, 800)),
  'cape':   save_part('cape', body, A1, CAPE, (330, 600)),
  'upper':  save_part('upper', orig, A0, UPPER, SH),
  'lower':  save_part('lower', orig, A0, LOWER, EL),
  'thighF': save_part('thighF', body, A1, THIGH_F, HPF, 50),
  'shinF':  save_part('shinF', body, A1, SHIN_F, KNF),
  'thighB': save_part('thighB', body, A1, THIGH_B, HPB, 50),
  'shinB':  save_part('shinB', body, A1, SHIN_B, KNB),
}
# 무기: 조운 창 → 손잡이에서 아래(+y)로
wp = Image.fromarray(D.cutout(Image.open(os.path.join(os.path.dirname(HERE), 'weapon', 'zhao_4.png'))))
a = np.array(wp); ys, xs = np.where(a[..., 3] > 0); wp = wp.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
L_UNIT, GRIP = 92, .34
wp = wp.rotate(-90, expand=True); s = L_UNIT * K / wp.height
wp = wp.resize((max(1, round(wp.width * s)), round(wp.height * s)), Image.LANCZOS); wp.save(os.path.join(OUT, 'weapon.png'))
parts['weapon'] = {'file': 'weapon.png', 'x0': round(-wp.width / 2 / K, 3), 'y0': round(-GRIP * L_UNIT, 3), 'w': round(wp.width / K, 3), 'h': L_UNIT}
# 쓰지 않게 된 v1 부품 파일 정리 대상 (arm · legF · legB) 은 rig 에서 빠진다
rig = {'id': 'zhao', 'version': 2, 'stamp': int(__import__('time').time()), 'px_per_unit': round(K, 3), 'parts': parts,
       'joints': {'neck': unit(NECK), 'shF': unit(SH), 'shB': unit(SHB), 'hipF': unit(HPF), 'hipB': unit(HPB), 'skirt': unit((430, 800)), 'cape': unit((330, 600))},
       'arm': {'l1': round(dist(SH, EL), 2), 'l2': round(dist(EL, HA), 2), 'r1': round(ang(SH, EL), 3), 'r2': round(ang(EL, HA), 3)},
       'legF': {'l1': round(dist(HPF, KNF), 2), 'l2': round(dist(KNF, FTF), 2), 'r1': round(ang(HPF, KNF), 3), 'r2': round(ang(KNF, FTF), 3)},
       'legB': {'l1': round(dist(HPB, KNB), 2), 'l2': round(dist(KNB, FTB), 2), 'r1': round(ang(HPB, KNB), 3), 'r2': round(ang(KNB, FTB), 3)},
       'tip': round((1 - GRIP) * L_UNIT, 2)}
json.dump(rig, open(os.path.join(OUT, 'rig.json'), 'w'), indent=1)
open(os.path.join(OUT, 'rig.js'), 'w', encoding='utf-8').write('/* 그랑풍 SD 조운 부품 · 관절 v2 (sprite_ai/grand/parts.py 로 생성) — 팔 · 다리 두 마디 */\nGRAND_REGISTER(' + json.dumps(rig) + ');\n')
for old in ('arm.png', 'legF.png', 'legB.png'):
    fp = os.path.join(OUT, old)
    if os.path.exists(fp): os.remove(fp)
print('DONE', rig['arm'], rig['legF'], rig['legB'])
