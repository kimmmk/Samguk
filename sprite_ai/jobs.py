"""animgen.py 작업 목록: 무장 · 병사 · 보스 설정."""
import motions as M

W_SPEAR = dict(file='weapon/zhao_4.png', item=False, length=660, grip=.36)
W_GUANDAO = dict(file='weapon/guan13_item2.png', item=True, rot=90, length=660, grip=.42)
HERO_ANIM = lambda st: M.hero_set(st)

JOBS = {
  'zhao': dict(id='zhao', kind='hero', token='zhaoyun_dnf', lora='zhao', lora_w=.75, ip=.35, cs=1.2, strength=1.0, seed=23,
               desc='1boy, solo, zhao yun, young handsome chinese general, silver armor, gold trim, blue cape, silver helmet, red plume, empty hands, clenched fists',
               ref='out/zhao_attack_23_hd.png', weapon=W_SPEAR, anims=HERO_ANIM('thrust')),
  'guan': dict(id='guan', kind='hero', token='guanyu_dnf', lora='guan', lora_w=.65, ip=.3, cs=1.25, strength=1.0, seed=23,
               desc='1boy, solo, guan yu, muscular chinese general, red face, long black beard, green hat, green robe, golden armor, empty hands, clenched fists',
               ref='out/guan_stance_23_hd.png', ref_flip=True, weapon=W_GUANDAO, anims=HERO_ANIM('slash')),
}
# 시험용: 조운 대기 1장 + 걷기
JOBS['zhao_t'] = dict(JOBS['zhao'], id='zhao_t', strength=1.0, cs=1.2, anims={'idle': M.IDLE[:1], 'walk': M.WALK})

# ---------------- 병사 (위군 파란 옷 기준 · 세력은 build_pack2 에서 색만 바꾼다) ----------------
from refgen_desc import SOLDIER, BOSS
W = {
  'sword':   dict(file='refs/w_sword_5.png', length=300, grip=.1),
  'dao':     dict(file='refs/w_dao_9.png', length=300, grip=.07),
  'bigdao':  dict(file='refs/w_bigdao_9.png', length=520, grip=.1),
  'halberd': dict(file='refs/w_halberd_5.png', length=700, grip=.35),
  'mace':    dict(file='refs/w_mace_9.png', flip=True, length=380, grip=.15),
  'staff':   dict(file='refs/w_staff_9.png', flip=True, length=600, grip=.35),
  'flag':    dict(file='refs/w_flag_5.png', flip=True, length=640, grip=.35),
  'spear':   dict(W_SPEAR, length=560),
}
def arch(d): d = dict(d); d['attack1'] = M.SHOOT; return d
FOOT = {'s': ('en_s_19', 'sword', 'slash'), 'sp': ('en_sp2_53', 'spear', 'thrust'), 'a': ('en_a_7', None, 'slash'),
        'o': ('en_o_7', 'dao', 'slash'), 'sh': ('en_sh_7', 'sword', 'slash'), 'fl': ('en_fl_7', 'flag', 'thrust')}
for k, (ref, wp, st) in FOOT.items():
    an = M.foot_set(st, archer=(k == 'a'))
    if k == 'a': an = arch(an)
    JOBS['en_' + k] = dict(id='en_' + k, kind='foot', ip=.55, cs=1.2, strength=1.0, seed=31, desc=SOLDIER[k], ref=f'refs/{ref}.png',
                           weapon=W[wp] if wp else None, anims=an, colors=40)
# ---------------- 보스 (촘촘한 도트 P=3) ----------------
BOSSJ = {'xiahouen': ('19', 'sword', 'slash'), 'zhangjiao': ('7', 'staff', 'slash'), 'lubu': ('7', 'halberd', 'thrust'), 'xuchu': ('7', 'mace', 'slash'),
         'zhangliao': ('7', 'halberd', 'thrust'), 'caocao': ('19', 'sword', 'slash'), 'simayi': ('7', None, 'slash'), 'yanliang': ('7', 'bigdao', 'slash'),
         'xiahoudun': ('19', 'spear', 'thrust'), 'xiahouyuan': ('7', None, 'slash'), 'pangde': ('19', 'bigdao', 'slash')}
for k, (sd, wp, st) in BOSSJ.items():
    an = M.boss_set(st)
    if k == 'xiahouyuan': an = arch(an)
    JOBS['boss_' + k] = dict(id='boss_' + k, kind='boss', ip=.55, cs=1.2, strength=1.0, seed=31, P=4, desc=BOSS[k], ref=f'refs/boss_{k}_{sd}.png',
                             weapon=W[wp] if wp else None, anims=an, colors=56)
# 관우 재생성: LoRA 약하게 · 포즈 강하게 · 머리 위 막대(모자 장식) 억제
JOBS['guan2'] = dict(JOBS['guan'], id='guan2', lora_w=.5, ip=.2, cs=1.45,
                     desc='1boy, solo, guan yu, muscular chinese general, red face, long black beard, small green cap, green robe, golden armor, empty hands, clenched fists')
JOBS['guan2']['neg_extra'] = 'tall hat, pole above head, feather'

JOBS['boss_zhangliao']['cut_tol'] = 48   # 기준 그림 배경이 고르지 않은 회색이라 배경 제거 허용치를 높인다
# 관우 3차: 등 뒤 두 번째 무기 · 머리 위 장식 억제
JOBS['guan3'] = dict(JOBS['guan2'], id='guan3', lora_w=.6, ip=.22, cs=1.35,
                     neg_extra='sword on back, blade on back, weapon on back, second weapon, tall hat, pole above head, feather, plume')
JOBS['guan3']['trim_head'] = 125   # 머리 위 장식을 후처리로 잘라 낸다 (animgen 참고)
