"""Lukisan abstrak besar untuk dinding kanan lobi (dibuat sendiri, tanpa aset luar). Hasil: tools/render/art/lukisan-lobi.jpg"""
import os, numpy as np
from PIL import Image, ImageFilter
W, H = 1536, 1024
rng = np.random.default_rng(11)
def noise(scale, seed):
    r = np.random.default_rng(seed); s = r.random((H // scale + 2, W // scale + 2))
    return np.asarray(Image.fromarray((s * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255
def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); u, v = xx / W, yy / H
img = np.ones((H, W, 3), np.float32) * hexc('#e4d8c4')
img *= (0.94 + 0.08 * noise(64, 1))[..., None]
def lay(mask, col, soft=6):
    m = np.asarray(Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(soft)), np.float32) / 255
    m = m * (0.94 + 0.06 * noise(24, int(soft * 7)))                 # tekstur sapuan
    global img; img = img * (1 - m[..., None]) + hexc(col) * m[..., None]
# lengkung besar biru tua (kiri) + bidang beige tua + blok black cherry + garis emas
cx, cy = 0.30, 1.05
r = np.hypot((u - cx) * W / H, v - cy)
lay((r < 0.78) & (r > 0.40), '#1d2a40', 4)
lay((r <= 0.40), '#2c3a52', 10)
lay((u > 0.55) & (u < 0.86) & (v > 0.16) & (v < 0.70) + 0, '#c9b393', 14)
lay((u > 0.62) & (u < 0.78) & (v > 0.48) & (v < 0.86), '#4a1520', 6)
lay((np.abs(v - (0.30 + 0.25 * u)) < 0.004) & (u > 0.20) & (u < 0.92), '#b8894a', 1.5)
lay(np.hypot((u - 0.82) * W / H, v - 0.24) < 0.06, '#b8894a', 3)
# serat kanvas
grain = noise(2, 99) * 0.035 - 0.0175
img = np.clip(img + grain[..., None], 0, 1)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art', 'lukisan-lobi.jpg')
Image.fromarray((img * 255).astype(np.uint8)).save(out, quality=88); print(out)
# gradasi cahaya panel belakang rak (LED di bawah ambalan → terang di atas, memudar ke bawah), dipakai sebagai emisi
g = np.linspace(0, 1, 512)[::-1][:, None]                          # baris 0 = atas
a = np.exp(-g * 3.2)
top, bot = hexc('#ffd3a1'), hexc('#14110e')                         # 4000K (putih hangat)
glow = bot + (top - bot) * a[..., None]
glow = np.repeat(glow, 16, axis=1)
out2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art', 'glow-rak.png')
Image.fromarray((np.clip(glow, 0, 1) * 255).astype(np.uint8)).save(out2); print(out2)
