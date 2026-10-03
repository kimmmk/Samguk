"""그랑풍 배경 이미지 정리 → 삼국전기_RPG_Grand/grand/bg/<kind>_{sky,mid,ground}.png
- 하늘: 그대로 (게임이 화면 크기로 늘려 그림)
- 중경: 녹색 하늘을 지우고, 좌우 반전본을 이어 붙여 가로로 끊김 없이 반복되게 (2배 폭)
- 지면: 아래쪽 띠를 잘라 좌우 반전본을 이어 붙여 반복
실행: venv\\Scripts\\python grand\\bgprep.py fortress <하늘 파일> <중경 파일> <지면 파일>
"""
import os, sys, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from autoparts import chroma

GAME = r'C:\Users\audrl\OneDrive\Documents\카카오톡 받은 파일\삼국전기_RPG_Grand'
kind, sky, mid, ground = sys.argv[1:5]
OUT = os.path.join(GAME, 'grand', 'bg'); os.makedirs(OUT, exist_ok=True)
Image.open(sky).convert('RGB').save(os.path.join(OUT, f'{kind}_sky.png'))
def key_sky(im):
    """중경: 위쪽에서 이어진 하늘 · 구름 · 녹색 산을 지운다 (녹 · 청록 계열, 또는 밝고 채도 낮은 구름)."""
    import cv2
    a = np.array(im.convert('RGB')).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(2), a.min(2); sat = (mx - mn) / (mx + 1)
    skyish = ((g - r) > 8) | ((b - r) > 25) | ((mx > 185) & (sat < .22))
    f = skyish.astype(np.uint8) * 255; h, w = f.shape; m = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(0, w, 16):
        if f[0, x] == 255: cv2.floodFill(f, m, (x, 0), 128)
    bg = cv2.morphologyEx((f == 128).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)   # 떠 있는 작은 조각 제거
    if n > 2:
        big = st[1:, cv2.CC_STAT_AREA].max()
        for k in range(1, n):
            if st[k, cv2.CC_STAT_AREA] < big * .03: alpha[lab == k] = 0
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    return np.dstack([a.astype(np.uint8), alpha])
m = Image.fromarray(key_sky(Image.open(mid)))
a = np.array(m); ys = np.where(a[..., 3].max(1) > 0)[0]; m = m.crop((0, max(0, ys.min() - 4), m.width, m.height))
tile = Image.new('RGBA', (m.width * 2, m.height)); tile.paste(m, (0, 0)); tile.paste(m.transpose(Image.FLIP_LEFT_RIGHT), (m.width, 0))
tile.save(os.path.join(OUT, f'{kind}_mid.png'))
g = Image.open(ground).convert('RGB'); band = g.crop((0, int(g.height * .3), g.width, g.height))
gt = Image.new('RGB', (band.width * 2, band.height)); gt.paste(band, (0, 0)); gt.paste(band.transpose(Image.FLIP_LEFT_RIGHT), (band.width, 0))
gt.save(os.path.join(OUT, f'{kind}_ground.png'))
ab = np.array(tile)[..., 3]; rows = np.where(ab.max(1) > 0)[0]
print('DONE', kind, 'mid', tile.size, '불투명 아래끝 비율', round((rows.max() + 1) / tile.height, 3), 'ground', gt.size)
