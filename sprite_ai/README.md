# sprite_ai — AI 던파풍 도트 스프라이트 파이프라인

도트 에디션의 AI 스프라이트 팩(`sprites/ai_*`: 무장 2 · 병사 24 · 보스 11)을 만든 스크립트입니다.
기준 그림 → (무장은 캐릭터 LoRA) → 관절 포즈대로 동작 프레임 생성 → 무기 합성 → 혼합 도트 변환 → 게임 스프라이트 팩.

## 환경 (RTX 2070 8GB 에서 확인)

모델 · 가상환경 · 학습 결과 · 생성물은 저장소에 없습니다. 아래 순서로 다시 준비합니다. 스크립트는 모델 위치를 `C:\Users\audrl\sprite_ai\hf`로 가정하므로(`dnfai.py`의 `HF_HOME`), 다른 곳에 두면 그 줄을 고칩니다.

```
python -m venv venv
venv\Scripts\python -m pip install torch==2.11.0+cu128 --index-url https://download.pytorch.org/whl/cu128
venv\Scripts\python -m pip install -r requirements.txt
```

필요한 모델(약 13GB, Hugging Face에서 `HF_HOME` 아래로 받음):

| 모델 | 용도 |
|---|---|
| `cagliostrolab/animagine-xl-4.0` | 애니풍 SDXL 이미지 모델 |
| `xinsir/controlnet-openpose-sdxl-1.0` | 포즈 고정(팔 · 무기 자세까지 따름) |
| `h94/IP-Adapter` (`models/image_encoder`, `sdxl_models/ip-adapter-plus_sdxl_vit-h.safetensors`) | 기준 그림 참조 |
| `madebyollin/sdxl-vae-fp16-fix` | fp16 VAE |
| `TencentARC/t2i-adapter-openpose-sdxl-1.0` | 가벼운 포즈 모듈(초기 실험용) |

## 현재 방식 (v4: animgen)

| 단계 | 명령 | 결과 |
|---|---|---|
| 1. 무장 LoRA | `make_dataset.py zhao guan` → `train_lora.py zhao 1200` (guan 도) | `lora/<id>.safetensors` (무장만. 병사 · 보스는 기준 그림만 사용) |
| 2. 병사 · 보스 기준 그림 · 무기 | `refgen.py` (창병 다시: `sp_ref.py`) | `refs/` — 고른 것은 저장소에 포함, `jobs.py`에 지정 |
| 3. 동작 프레임 | `animgen.py zhao guan en_s en_sp … boss_lubu …` | `gen/<id>/` 원화 · 도트 · `meta.json` |
| 4. 게임 팩 | `build_pack2.py hero:zhao hero:guan foot:s … boss:lubu …` | `sprites/ai_<팩 id>` + `manifest.js` 등록 |

- 동작은 `motions.py`(관절 각도 + 프레임별 무기 각도)에 있습니다. 무장: 대기 · 걷기 · 달리기 · 1타(찌르기/베기) · 2타(올려베기) · 3타(내려찍기) · 점프 · 점프공격 · 피격 · 쓰러짐 · 회피 · 스킬 · 승리 (46프레임). 병사: 대기 · 걷기 · 공격 · 피격 · 쓰러짐(+ 궁병 활쏘기). 보스: + 스킬.
- 매 프레임을 새로 그리고(강도 1.0) 모습은 기준 그림 · LoRA · 같은 시드로 유지합니다. 무기는 따로 그린 한 자루를 손 위치 · 프레임별 각도로 합성합니다.
- 병사는 위(魏)군 파란 옷으로 만들고, 팩을 만들 때 파란색만 바꿔 황건 · 동탁 · 원소를 만듭니다.
- 쓰러짐은 AI가 누운 자세를 못 그려서, 피격 프레임을 발 기준으로 눕혀 만듭니다.
- 보스는 원화 4px = 도트 1px(무장 · 병사는 5px)로 촘촘하게 만들고, 팩 배율로 크기를 맞춥니다.
- `build_pack2.py`의 `GAME` 경로는 도트 에디션 폴더 위치로 맞춥니다.

## 이어서 할 일 (보류 중)

- **관우 3차 생성**: 2차(`guan2`)는 몸 동작은 커졌지만 등 뒤에 두 번째 칼이 그려져 게임 팩에는 1차(`guan`)를 쓰고 있습니다. 등 뒤 무기를 억제한 3차 설정(`guan3`)이 `jobs.py`에 있습니다.
  `venv\Scripts\python animgen.py guan3` → 결과 확인 → `venv\Scripts\python build_pack2.py hero:guan3=guan`
- 생성은 프레임마다 저장되므로, 도중에 멈춰도 같은 명령을 다시 실행하면 이미 만든 프레임은 건너뛰고 이어서 합니다.
- 기병(말 탄 병사)과 여포 · 안량의 기마 구간은 AI 팩이 없어 코드 그림(부드러운 도트 필터)을 씁니다.

## 파일

| 파일 | 내용 |
|---|---|
| `dnfai.py` | 공통: 관절 각도(FK) → 오픈포즈 뼈대 · 배경 제거 · 혼합 도트 변환(PixelOE + 실루엣 외곽선) · 공통 팔레트 · 파이프라인 로더 |
| `motions.py` | 동작 라이브러리 (무장 · 병사 · 보스 세트) |
| `animgen.py` | 공통 동작 생성기 (ControlNet + IP-Adapter + 선택 LoRA, fp8 저장, 무기 합성) |
| `jobs.py` | 무장 · 병사 · 보스 작업 설정 (설명 · 기준 그림 · 무기 · 동작) |
| `refgen.py`, `refgen_desc.py`, `sp_ref.py` | 병사 · 보스 기준 그림과 무기 이미지 생성 |
| `build_pack2.py` | 도트 프레임 → 게임 스프라이트 팩 (세력 색 바꾸기, 쓰러짐 프레임, 보스 배율) |
| `make_dataset.py`, `train_lora.py` | 무장 LoRA 데이터셋 · 학습 |
| `refs/*.png` | 고른 병사 · 보스 기준 그림과 합성용 무기 |
| `out/*_hd.png`, `weapon/*.png` | 무장 기준 그림(조운 찌르기 23번, 관우 전투 자세 23번)과 무장 무기 |
| `anim3.py`, `build_pack.py`, `gen_weapon.py`, `gen_samples.py`, `make_anim.py`, `sweep.py`, `test_cn.py`, `test_one.py` | 이전 단계 · 실험용 |

## 알려진 한계

- 프레임마다 새로 그려 동작은 크지만, 망토 · 옷 주름 같은 세부가 프레임마다 조금씩 달라집니다.
- 게임에 넣을 최종 품질은 프레임별 손질이 필요합니다.
