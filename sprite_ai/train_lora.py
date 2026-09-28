"""캐릭터 LoRA 학습 (SDXL · Animagine XL 4.0, 8GB 그래픽카드용).
- 텍스트 임베딩 · 잠재값을 미리 계산해 두고 UNet 만 올려 학습 (그래디언트 체크포인팅, fp16 자동 혼합정밀)
- 대상: UNet 어텐션 to_q/k/v/out, rank 16
실행: venv\\Scripts\\python train_lora.py zhao [steps]
"""
import os, sys, glob, random, time, math
os.environ.setdefault('HF_HOME', r'C:\Users\audrl\sprite_ai\hf'); os.environ.setdefault('HF_HUB_OFFLINE', '1')
import numpy as np, torch, torch.nn.functional as F
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = 'cagliostrolab/animagine-xl-4.0'
TW, TH = 624, 912
cid = sys.argv[1]; STEPS = int(sys.argv[2]) if len(sys.argv) > 2 else 1200
LR, RANK = 1e-4, 16
data_dir = os.path.join(HERE, 'dataset', cid, 'train'); out_dir = os.path.join(HERE, 'lora'); os.makedirs(out_dir, exist_ok=True)
torch.manual_seed(0); random.seed(0)

from diffusers import StableDiffusionXLPipeline, AutoencoderKL, DDPMScheduler, UNet2DConditionModel
from peft import LoraConfig
from peft.utils import get_peft_model_state_dict
from diffusers.utils import convert_state_dict_to_diffusers

# ---- 1) 캡션 임베딩 · 잠재값 미리 계산 ----
files = sorted(glob.glob(os.path.join(data_dir, '*.png')))
pipe = StableDiffusionXLPipeline.from_pretrained(MODEL, unet=None, vae=AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=torch.float16), torch_dtype=torch.float16)
pipe.text_encoder.to('cuda'); pipe.text_encoder_2.to('cuda'); pipe.vae.to('cuda')
items = []
with torch.no_grad():
    for f in files:
        cap = open(f[:-4] + '.txt', encoding='utf-8').read().strip()
        pe, _, ppe, _ = pipe.encode_prompt(cap, device='cuda', num_images_per_prompt=1, do_classifier_free_guidance=False)
        im = Image.open(f).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x = torch.from_numpy(np.array(im)).float().permute(2, 0, 1)[None] / 127.5 - 1
        lat = pipe.vae.encode(x.to('cuda', torch.float16)).latent_dist.sample() * pipe.vae.config.scaling_factor
        items.append((pe.cpu(), ppe.cpu(), lat.cpu()))
print('cached', len(items), flush=True)
del pipe; torch.cuda.empty_cache()

# ---- 2) UNet + LoRA ----
unet = UNet2DConditionModel.from_pretrained(MODEL, subfolder='unet', torch_dtype=torch.float16).to('cuda')
unet.requires_grad_(False); unet.enable_gradient_checkpointing()
unet.add_adapter(LoraConfig(r=RANK, lora_alpha=RANK, init_lora_weights='gaussian', target_modules=['to_k', 'to_q', 'to_v', 'to_out.0']))
params = [p for p in unet.parameters() if p.requires_grad]
for p in params: p.data = p.data.float()
opt = torch.optim.AdamW(params, lr=LR, weight_decay=1e-2)
sched = DDPMScheduler.from_pretrained(MODEL, subfolder='scheduler')
scaler = torch.amp.GradScaler('cuda')
tids = torch.tensor([[TH, TW, 0, 0, TH, TW]], dtype=torch.float16, device='cuda')
print('trainable', sum(p.numel() for p in params), flush=True)

def save(tag):
    sd = convert_state_dict_to_diffusers(get_peft_model_state_dict(unet))
    StableDiffusionXLPipeline.save_lora_weights(out_dir, unet_lora_layers=sd, weight_name=f'{cid}{tag}.safetensors', safe_serialization=True)

# ---- 3) 학습 ----
t0 = time.time(); ema = None
for step in range(1, STEPS + 1):
    pe, ppe, lat = random.choice(items); lat = lat.to('cuda', torch.float16)
    noise = torch.randn_like(lat); ts = torch.randint(0, sched.config.num_train_timesteps, (1,), device='cuda').long()
    noisy = sched.add_noise(lat, noise, ts)
    lr = LR * min(1, step / 50) * (.5 * (1 + math.cos(math.pi * step / STEPS)) * .9 + .1)
    for g in opt.param_groups: g['lr'] = lr
    with torch.autocast('cuda', dtype=torch.float16):
        pred = unet(noisy, ts, encoder_hidden_states=pe.to('cuda'), added_cond_kwargs={'text_embeds': ppe.to('cuda'), 'time_ids': tids}).sample
    loss = F.mse_loss(pred.float(), noise.float())
    scaler.scale(loss).backward(); scaler.unscale_(opt); torch.nn.utils.clip_grad_norm_(params, 1.0)
    scaler.step(opt); scaler.update(); opt.zero_grad(set_to_none=True)
    ema = loss.item() if ema is None else ema * .98 + loss.item() * .02
    if step % 50 == 0: print(f'step {step}/{STEPS} loss {ema:.4f} {time.time() - t0:.0f}s mem {torch.cuda.max_memory_allocated() / 1e9:.1f}GB', flush=True)
    if step in (STEPS // 2,): save(f'_s{step}')
save('')
print('DONE', os.path.join(out_dir, cid + '.safetensors'), flush=True)
