"""ControlNet(오픈포즈) + fp8 저장으로 메모리 절약 — 팔 · 무기 자세를 따르는지 확인."""
import os, time, torch, dnfai as D
from PIL import Image
from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel, AutoencoderKL, EulerAncestralDiscreteScheduler
from transformers import CLIPVisionModelWithProjection
OUT = os.path.join(D.HERE, 'out', 'sweep'); dt = torch.float16
def load(cid, lw):
    cn = ControlNetModel.from_pretrained('xinsir/controlnet-openpose-sdxl-1.0', torch_dtype=dt)
    vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=dt)
    ie = CLIPVisionModelWithProjection.from_pretrained('h94/IP-Adapter', subfolder='models/image_encoder', torch_dtype=dt)
    p = StableDiffusionXLControlNetPipeline.from_pretrained('cagliostrolab/animagine-xl-4.0', controlnet=cn, vae=vae, image_encoder=ie, torch_dtype=dt)
    p.scheduler = EulerAncestralDiscreteScheduler.from_config(p.scheduler.config)
    p.load_ip_adapter('h94/IP-Adapter', subfolder='sdxl_models', weight_name='ip-adapter-plus_sdxl_vit-h.safetensors', image_encoder_folder=None)
    p.load_lora_weights(os.path.join(D.HERE, 'lora'), weight_name=cid + '.safetensors', adapter_name='char')
    p.fuse_lora(lora_scale=lw); p.unload_lora_weights()
    p.unet.enable_layerwise_casting(storage_dtype=torch.float8_e4m3fn, compute_dtype=dt)
    p.controlnet.enable_layerwise_casting(storage_dtype=torch.float8_e4m3fn, compute_dtype=dt)
    p.enable_model_cpu_offload(); p.vae.enable_slicing(); p.vae.enable_tiling()
    return p
for cid, pose in [('zhao', D.ANIMS['thrust'][3]), ('guan', D.ANIMS['slash'][1])]:
    p = load(cid, .75)
    for ip, cs in [(.25, 1.0), (.4, .9)]:
        p.set_ip_adapter_scale(ip); t = time.time()
        img = p(prompt=D.prompt(cid), negative_prompt=D.NEG, image=D.draw_pose(D.fk(pose)), controlnet_conditioning_scale=cs, ip_adapter_image=D.ref_image(cid),
                num_inference_steps=30, guidance_scale=5, width=D.W, height=D.H, generator=torch.Generator('cpu').manual_seed(23)).images[0]
        img.save(os.path.join(OUT, f'cn_{cid}_ip{ip}_c{cs}.png')); print('gen', cid, ip, cs, round(time.time() - t), round(torch.cuda.max_memory_allocated() / 1e9, 1), flush=True)
    del p; torch.cuda.empty_cache()
fs = [f for f in sorted(os.listdir(OUT)) if f.startswith('cn_')]
s = Image.new('RGB', (277 * len(fs), 405)); [s.paste(Image.open(os.path.join(OUT, f)).convert('RGB').resize((277, 405)), (i * 277, 0)) for i, f in enumerate(fs)]
s.save(os.path.join(OUT, '_cn.png')); print('DONE', fs, flush=True)
