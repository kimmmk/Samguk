"""관절 각도 동작 라이브러리 (dnfai.fk 규격) — 프레임마다 무기 각도 w(도, 0 = 앞 수평, - = 위)를 함께 지정한다.
각도: 아래가 0, 앞(+x)이 +. aR,bR = 가까운 팔(무기 쥔 손) 어깨 · 팔꿈치, aL,bL = 먼 팔, tR,kR / tL,kL = 다리 허벅지 · 무릎.
"""
import math
ST = dict(lean=6, aR=20, bR=55, aL=40, bL=45, tR=-20, kR=6, tL=24, kL=-10, w=-15)
def P(**kw): d = dict(ST); d.update(kw); return d
def cyc(n): return [2 * math.pi * i / n for i in range(n)]

IDLE = [P(lean=6 + 1.5 * math.sin(f), kR=6 + 5 * (1 - math.cos(f)), kL=-10 - 5 * (1 - math.cos(f)), aR=20 + 3 * math.sin(f), aL=40 + 3 * math.sin(f), w=-15 + 2 * math.sin(f)) for f in cyc(4)]
WALK = [P(lean=8, tR=24 * math.sin(f), kR=8 + 16 * max(0, math.cos(f)), tL=-24 * math.sin(f), kL=-(8 + 16 * max(0, -math.cos(f))),
          aR=18 - 6 * math.sin(f), aL=40 + 10 * math.sin(f), w=-18) for f in cyc(6)]
RUN = [P(lean=20, tR=36 * math.sin(f), kR=10 + 34 * max(0, math.cos(f)), tL=-36 * math.sin(f), kL=-(10 + 34 * max(0, -math.cos(f))),
         aR=30, bR=45, aL=55, bL=30, w=-8) for f in cyc(4)]
# 공격: 무기 계열별
THRUST = [P(lean=-4, aR=-35, bR=100, aL=30, bL=60, tR=-28, kR=10, tL=26, kL=-12, w=-6),
          P(lean=10, aR=30, bR=50, aL=55, bL=30, tR=-32, kR=6, tL=34, kL=-24, dx=15, w=-4),
          P(lean=22, aR=80, bR=5, aL=75, bL=10, tR=-38, kR=4, tL=40, kL=-30, dx=40, w=0),
          P(lean=20, aR=82, bR=3, aL=76, bL=8, tR=-38, kR=4, tL=40, kL=-30, dx=42, w=0),
          P(lean=10, aR=45, bR=35, aL=50, bL=35, tR=-26, kR=6, tL=30, kL=-16, dx=15, w=-10)]
SLASH = [P(lean=-6, aR=160, bR=20, aL=150, bL=30, tR=-22, kR=8, tL=26, kL=-12, w=-125),
         P(lean=4, aR=130, bR=10, aL=120, bL=20, tR=-28, kR=6, tL=30, kL=-18, dx=10, w=-100),
         P(lean=16, aR=80, bR=-10, aL=70, bL=0, tR=-34, kR=4, tL=36, kL=-26, dx=25, w=-30),
         P(lean=22, aR=30, bR=-20, aL=25, bL=0, tR=-36, kR=4, tL=38, kL=-28, dx=30, w=20),
         P(lean=10, aR=30, bR=40, aL=40, bL=40, tR=-24, kR=6, tL=28, kL=-14, dx=15, w=-40)]
UPPER = [P(lean=14, aR=10, bR=20, aL=20, bL=30, tR=-30, kR=20, tL=30, kL=-30, w=55),       # 올려베기
         P(lean=6, aR=60, bR=10, aL=60, bL=20, tR=-30, kR=10, tL=30, kL=-20, dx=10, w=0),
         P(lean=-4, aR=140, bR=0, aL=120, bL=10, tR=-26, kR=6, tL=28, kL=-14, dx=15, w=-80),
         P(lean=-6, aR=165, bR=0, aL=150, bL=10, tR=-24, kR=6, tL=26, kL=-12, dx=15, w=-100),
         P(lean=4, aR=60, bR=30, aL=60, bL=30, tR=-24, kR=6, tL=28, kL=-14, dx=10, w=-30)]
SMASH = [P(lean=-10, aR=170, bR=10, aL=160, bL=10, tR=-20, kR=20, tL=24, kL=-24, w=-150),  # 내려찍기
         P(lean=0, aR=160, bR=0, aL=150, bL=0, tR=-26, kR=10, tL=30, kL=-18, dx=10, w=-110),
         P(lean=20, aR=90, bR=0, aL=85, bL=0, tR=-36, kR=30, tL=40, kL=-50, dx=30, w=-20),
         P(lean=30, aR=50, bR=0, aL=45, bL=0, tR=-40, kR=40, tL=44, kL=-60, dx=35, w=25),
         P(lean=14, aR=40, bR=30, aL=45, bL=30, tR=-28, kR=12, tL=32, kL=-22, dx=20, w=-20)]
JUMP = [P(lean=10, tR=-50, kR=90, tL=40, kL=-20, aR=40, bR=40, aL=70, bL=20, w=-35),
        P(lean=4, tR=-10, kR=20, tL=20, kL=-10, aR=60, bR=30, aL=80, bL=10, w=-20)]
JATK = [P(lean=-5, tR=-50, kR=90, tL=40, kL=-30, aR=160, bR=10, aL=150, bL=10, w=-120),
        P(lean=15, tR=-40, kR=80, tL=40, kL=-40, aR=90, bR=0, aL=85, bL=0, w=-10),
        P(lean=25, tR=-30, kR=70, tL=40, kL=-50, aR=40, bR=0, aL=40, bL=0, w=45)]
HURT = [P(lean=-18, head=-15, aR=-20, bR=50, aL=10, bL=40, tR=-30, kR=10, tL=18, kL=-4, w=-150),
        P(lean=-12, head=-8, aR=-10, bR=50, aL=20, bL=40, tR=-28, kR=12, tL=22, kL=-8, w=-160)]
DOWN = [P(lean=-55, head=-10, aR=-60, bR=20, aL=-40, bL=20, tR=10, kR=30, tL=50, kL=10, w=200),
        P(lean=-86, head=0, aR=-100, bR=10, aL=-80, bL=10, tR=80, kR=0, tL=86, kL=0, w=180)]
DODGE = [P(lean=-14, aR=-10, bR=70, aL=20, bL=60, tR=-40, kR=20, tL=10, kL=-20, dx=-10, w=-160),
         P(lean=-20, aR=-20, bR=70, aL=10, bL=60, tR=-50, kR=30, tL=20, kL=-30, dx=-30, w=-165),
         P(lean=-8, aR=0, bR=60, aL=30, bL=50, tR=-30, kR=12, tL=24, kL=-14, dx=-20, w=-150)]
CAST = [P(lean=0, aR=10, bR=40, aL=60, bL=40, w=-80),
        P(lean=-4, aR=0, bR=30, aL=100, bL=10, w=-85),
        P(lean=8, aR=10, bR=30, aL=95, bL=0, dx=10, w=-80)]
WIN = [P(lean=-2, aR=160, bR=5, aL=30, bL=60, tR=-18, kR=4, tL=22, kL=-6, w=-95),
       P(lean=-4, aR=170, bR=0, aL=40, bL=60, tR=-18, kR=4, tL=22, kL=-6, w=-92)]
SHOOT = [P(lean=4, aL=85, bL=0, aR=60, bR=60, w=None),
         P(lean=2, aL=90, bL=0, aR=90, bR=120, w=None),
         P(lean=0, aL=90, bL=0, aR=95, bR=150, w=None),
         P(lean=6, aL=90, bL=0, aR=40, bR=60, w=None)]
ATTACK = {'thrust': THRUST, 'slash': SLASH}

def hero_set(style):
    """무장: 1타(찌르기/베기) · 2타(올려베기) · 3타(내려찍기) 등 전체."""
    return {'idle': IDLE, 'walk': WALK, 'run': RUN, 'attack1': ATTACK[style], 'attack2': UPPER, 'attack3': SMASH,
            'jump': JUMP, 'jatk': JATK, 'hurt': HURT, 'down': DOWN, 'dodge': DODGE, 'cast': CAST, 'win': WIN}
def foot_set(style, archer=False):
    d = {'idle': IDLE[:3], 'walk': WALK[::2] + WALK[1:2], 'attack1': ATTACK[style][:4], 'hurt': HURT, 'down': DOWN}
    if archer: d['shoot'] = SHOOT
    return d
def boss_set(style):
    return {'idle': IDLE[:3], 'walk': WALK[::2] + WALK[1:2], 'attack1': ATTACK[style][:4], 'cast': CAST, 'hurt': HURT, 'down': DOWN}
