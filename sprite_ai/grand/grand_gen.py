"""그랑풍 SD 조운 원화 후보 생성 — 게임 렌더러(sdart2.js) 관절 위치에 맞춘 3등신 오픈포즈 뼈대로 포즈를 고정한다.
관절(게임 유닛 → 원화 px, 1유닛 = 8px, 발바닥 y=1150, 몸 중심 x=400):
  목(0,-70) · 엉덩이(0,-40) · 앞어깨(+9.5,-65) · 뒤어깨(-8.5,-65) · 다리 관절(±3.6,-40) · 팔 길이 24 · 다리 길이 40
"""
import os, sys, math, json, torch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dnfai as D
from PIL import Image
from animgen import load_pipe

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'cand'); os.makedirs(OUT, exist_ok=True)
U, FX, FY = 8, 400, 1150
def P(x, y): return (FX + x * U, FY + y * U)
def rot(o, ang, L):  # 아래가 0도, 앞(+x)이 +
    return (o[0] + math.sin(math.radians(ang)) * L * U, o[1] + math.cos(math.radians(ang)) * L * U)
# 기준 자세(부품 분리용): 팔다리를 몸에서 조금 띄운 차렷
neck, hip = P(0, -70), P(0, -40)
shF, shB = P(9.5, -65), P(-8.5, -65)
elF, haF = rot(shF, 22, 12), rot(shF, 22, 24)
elB, haB = rot(shB, -18, 12), rot(shB, -18, 24)
hpF, hpB = P(3.6, -40), P(-3.6, -40)
knF, ftF = rot(hpF, 8, 19), rot(hpF, 8, 38)
knB, ftB = rot(hpB, -8, 19), rot(hpB, -8, 38)
nose = P(9.5, -82); eyeR, eyeL = P(8, -85), P(12.5, -84.5); ear = P(1, -84)
# 오픈포즈 18점 (앞쪽 = 오른쪽 R)
KP = [nose, neck, shF, elF, haF, shB, elB, haB, hpF, knF, ftF, hpB, knB, ftB, eyeR, eyeL, ear, None]
JOINTS = dict(neck=neck, hip=hip, shF=shF, shB=shB, hpF=hpF, hpB=hpB, haF=haF, haB=haB, ftF=ftF, ftB=ftB, elF=elF, knF=knF, nose=nose, U=U, FX=FX, FY=FY)

DESC = ('chibi, super deformed, 1boy, solo, zhao yun, young handsome chinese general, silver and white armor, gold trim, blue cape, '
        'silver helmet with red plume, empty hands, clenched fists, arms slightly away from body')
PROMPT = f'full body, standing, from side, facing right, white background, simple background, {DESC}, thick outline, cel shading, mobile game character, masterpiece, high score, absurdres'
NEG = D.NEG + ', weapon, spear, sword, holding weapon, realistic proportions, tall, long legs'

if __name__ == '__main__':
    json.dump({k: v for k, v in JOINTS.items()}, open(os.path.join(HERE, 'joints.json'), 'w'), indent=1)
    D.draw_pose(KP).save(os.path.join(OUT, '_pose.png'))
    p = load_pipe(); ref = Image.open(os.path.join(D.HERE, 'out', 'zhao_attack_23_hd.png')).convert('RGB')
    for seed in (101, 202, 303, 404, 505, 606):
        fn = os.path.join(OUT, f'zhao_sd_{seed}.png')
        if os.path.exists(fn): continue
        p.set_ip_adapter_scale(.4)
        p(prompt=PROMPT, negative_prompt=NEG, image=Image.new('RGB', (D.W, D.H), (236, 236, 236)), control_image=D.draw_pose(KP), strength=1.0,
          controlnet_conditioning_scale=.95, ip_adapter_image=ref, num_inference_steps=30, guidance_scale=5.5, width=D.W, height=D.H,
          generator=torch.Generator('cpu').manual_seed(seed)).images[0].save(fn)
        print('gen', seed, flush=True)
    print('DONE', flush=True)
