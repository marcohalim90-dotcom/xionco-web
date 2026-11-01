"""Lukisan abstrak Ruang 2 & Ruang 5 Galeri v12 (dibuat sendiri, tanpa aset luar; 28 Okt). Palet = konsep warna ruang pemilik:
   Ruang 2 cream + abu tua, aksen rich cognac · Ruang 5 abu muda + beige kecokelatan, aksen deep charcoal.
   Hasil: tools/render/art/lukisan-ruang2.jpg, lukisan-ruang5.jpg"""
import os, numpy as np
from PIL import Image, ImageFilter
W, H = 1200, 1500
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); u, v = xx / W, yy / H
def noise(scale, seed):
    r = np.random.default_rng(seed); s = r.random((H // scale + 2, W // scale + 2))
    return np.asarray(Image.fromarray((s * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255
def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255
def paint(base, layers, name):
    img = np.ones((H, W, 3), np.float32) * hexc(base); img *= (0.95 + 0.07 * noise(64, 1))[..., None]
    for k, (mask, col, soft) in enumerate(layers):
        m = np.asarray(Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(soft)), np.float32) / 255
        m = m * (0.93 + 0.07 * noise(20, 10 + k))
        img = img * (1 - m[..., None]) + hexc(col) * m[..., None]
    img = np.clip(img + (noise(2, 99) * 0.035 - 0.0175)[..., None], 0, 1)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art', name)
    Image.fromarray((img * 255).astype(np.uint8)).save(out, quality=88); print(out)
asp = W / H
# Ruang 2: busur abu tua besar dari bawah, bidang cream tua, satu cakram kognak kecil (aksen porsi kecil), garis tipis arang
r = np.hypot((u - 0.42) * asp, v - 1.0)
paint('#e8dfcf', [((r < 0.62) & (r > 0.36), '#4a4a4d', 5), (r <= 0.36, '#6b6966', 9),
                  ((u > 0.12) & (u < 0.58) & (v > 0.12) & (v < 0.42), '#d6c8b2', 12),
                  (np.hypot((u - 0.70) * asp, v - 0.30) < 0.11, '#8a4a24', 4),
                  ((np.abs(u - 0.78) < 0.003) & (v > 0.18) & (v < 0.86), '#2f2f31', 1.2)], 'lukisan-ruang2.jpg')
# Ruang 5: dua bidang beige kecokelatan bertumpuk, setengah lingkaran arang, bidang abu muda
r5 = np.hypot((u - 0.5) * asp, v - 0.62)
paint('#d2cfca', [((u > 0.08) & (u < 0.62) & (v > 0.10) & (v < 0.55), '#a48b72', 10),
                  ((u > 0.38) & (u < 0.90) & (v > 0.36) & (v < 0.80), '#bfa98f', 10),
                  ((r5 < 0.22) & (v > 0.62), '#2c2c2e', 4),
                  ((np.abs(v - 0.62) < 0.0025) & (u > 0.10) & (u < 0.90), '#2c2c2e', 1.2)], 'lukisan-ruang5.jpg')
