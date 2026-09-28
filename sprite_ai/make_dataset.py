"""LoRA 학습용 데이터셋: 기준 그림(IP-Adapter) + 여러 자세로 생성 → 기준 그림과 닮은 순으로 골라 저장.
실행: venv\\Scripts\\python make_dataset.py zhao guan
"""
import os, sys, json, shutil, time, torch, numpy as np
import dnfai as D
from PIL import Image

KEEP = 20
def main(cids):
    p = D.load_pipe(ip=True)
    enc, proc = p.image_encoder, p.feature_extractor
    def emb(img):
        with torch.no_grad():
            x = proc(images=img, return_tensors='pt').pixel_values.to('cuda', torch.float16)
            enc.to('cuda'); e = enc(x).image_embeds.float(); enc.to('cpu')
        return torch.nn.functional.normalize(e, dim=-1)[0].cpu()
    for cid in cids:
        out = os.path.join(D.HERE, 'dataset', cid, 'raw'); os.makedirs(out, exist_ok=True)
        ref = D.ref_image(cid); er = emb(ref); scores = []
        for pi, pose in enumerate(D.DATASET_POSES):
            for seed in (101, 202, 303):
                fn = os.path.join(out, f'p{pi:02d}_s{seed}.png')
                if not os.path.exists(fn):
                    t = time.time(); D.generate(p, cid, pose, seed, ip_scale=.65, lora=False).save(fn)
                    print('gen', cid, pi, seed, round(time.time() - t), flush=True)
                img = Image.open(fn).convert('RGB'); scores.append((float(emb(img) @ er), fn))
        scores.sort(reverse=True)
        sel = os.path.join(D.HERE, 'dataset', cid, 'train'); os.makedirs(sel, exist_ok=True)
        cap = f"{D.CHARS[cid]['token']}, {D.CHARS[cid]['desc']}, full body, white background"
        for i, (s, fn) in enumerate(scores[:KEEP]):
            shutil.copy(fn, os.path.join(sel, f'{i:02d}.png')); open(os.path.join(sel, f'{i:02d}.txt'), 'w', encoding='utf-8').write(cap)
        for k in range(3):  # 기준 그림은 3번 넣어 비중을 높인다
            ref.save(os.path.join(sel, f'ref{k}.png')); open(os.path.join(sel, f'ref{k}.txt'), 'w', encoding='utf-8').write(cap)
        json.dump(scores, open(os.path.join(D.HERE, 'dataset', cid, 'scores.json'), 'w'), indent=1)
        print('selected', cid, [round(s, 3) for s, _ in scores[:KEEP]], 'min_all', round(scores[-1][0], 3), flush=True)
    print('DONE', flush=True)

if __name__ == '__main__':
    main(sys.argv[1:] or ['zhao', 'guan'])
