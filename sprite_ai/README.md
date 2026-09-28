# sprite_ai — AI 던파풍 도트 스프라이트 파이프라인

도트 에디션의 `sprites/ai_zhao`, `sprites/ai_guan` 팩을 만든 스크립트입니다.
기준 그림 한 장 → 캐릭터 LoRA 학습 → 관절 포즈대로 동작 프레임 생성 → 무기 합성 → 혼합 도트 변환 → 게임 스프라이트 팩.

## 환경 (RTX 2070 8GB 에서 확인)

모델 · 가상환경 · 학습 결과는 저장소에 없습니다. 아래 순서로 다시 준비합니다. 스크립트는 모델 위치를 `C:\Users\audrl\sprite_ai\hf`로 가정하므로(`dnfai.py`의 `HF_HOME`), 다른 곳에 두면 그 줄을 고칩니다.

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

## 실행 순서

| 단계 | 명령 | 결과 |
|---|---|---|
| 1. 학습용 데이터셋 | `venv\Scripts\python make_dataset.py zhao guan` | 기준 그림을 참조해 자세별로 36장 생성 → 닮은 20장 선택 (`dataset/`) |
| 2. 캐릭터 LoRA 학습 | `venv\Scripts\python train_lora.py zhao 1200` (guan 도 같이) | `lora/zhao.safetensors` (약 26분) |
| 3. 무기 이미지 | `venv\Scripts\python gen_weapon.py` | `weapon/` — 합성에 쓰는 무기는 저장소에 포함 |
| 4. 동작 프레임 | `venv\Scripts\python anim3.py zhao` (guan 도 같이) | 대기 · 걷기 · 공격 도트 프레임, 시트, GIF (`anim3/`) |
| 5. 게임 팩 | `venv\Scripts\python build_pack.py zhao guan` | 도트 에디션 `sprites/ai_<id>` + `manifest.js` 등록 |

`build_pack.py`의 `GAME` 경로는 도트 에디션 폴더 위치로 맞춥니다.

## 파일

| 파일 | 내용 |
|---|---|
| `dnfai.py` | 공통 모듈: 캐릭터 설정 · 관절 각도(FK) → 오픈포즈 뼈대 · 동작 키프레임 · 파이프라인 로더(ControlNet + IP-Adapter + LoRA, fp8 저장) · 배경 제거 · 고정 배율 혼합 도트 변환(PixelOE + 실루엣 외곽선) · 공통 팔레트 |
| `make_dataset.py` | LoRA 학습용 데이터셋 생성 · 선택 |
| `train_lora.py` | SDXL UNet LoRA 학습(8GB용: 임베딩 · 잠재값 미리 계산, 그래디언트 체크포인팅) |
| `anim3.py` | 최종 동작 생성: 무기 없이 생성 → 앞 프레임 바탕 img2img → 무기 합성 → 도트 |
| `gen_weapon.py` | 합성용 무기 단독 생성 |
| `build_pack.py` | 도트 프레임 → 게임 스프라이트 팩 |
| `out/*_hd.png` | 기준 그림(조운 찌르기 23번, 관우 전투 자세 23번) |
| `weapon/*.png` | 합성에 쓰는 무기(조운 창, 관우 언월도) |
| `gen_samples.py`, `make_anim.py`, `sweep.py`, `test_cn.py`, `test_one.py` | 이전 단계 · 실험용(첫 샘플, v2 동작, 설정 비교) |

## 알려진 한계

- 앞 프레임을 바탕으로 이어 그려 떨림은 적지만 몸 동작이 작습니다(걷기에서 다리가 거의 안 움직임).
- 게임에 넣을 최종 품질은 프레임별 손질이 필요합니다.
