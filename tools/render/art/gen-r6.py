# Lukisan abstrak & motif karpet bulat Room 6 (karya sendiri, prosedural; C62 referensi pemilik):
#   lukisan-r6-a.jpg / lukisan-r6-b.jpg — kanvas cream bertekstur, bidang organik terracotta / oker / cokelat + garis hitam tipis
#   karpet-r6.png — karpet bulat cream: busur konsentris hitam tipis, setengah cakram terracotta & cokelat, lajur garis
# Jalankan: blender -b --factory-startup -P tools/render/art/gen-r6.py
import bpy, os, math
import numpy as np
OUT = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(6)

def hexc(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
def noise2(h, w, cell, amp):
    """Butir halus: noise nilai bilinear beberapa oktaf."""
    out = np.zeros((h, w))
    for k, c in enumerate(cell):
        gh, gw = h // c + 2, w // c + 2
        g = rng.random((gh, gw))
        ys, xs = np.linspace(0, gh - 1.001, h), np.linspace(0, gw - 1.001, w)
        y0, x0 = ys.astype(int), xs.astype(int); fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
        a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; cc = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
        out += (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + cc * (1 - fx) * fy + d * fx * fy - 0.5) * amp / (k + 1)
    return out

def blob(img, cx, cy, R, col, seed, aa=1.6, grain=0.05):
    h, w, _ = img.shape
    r_ = np.random.default_rng(seed); ks = [(k, r_.uniform(0.04, 0.14) / k ** 0.6, r_.uniform(0, 6.28)) for k in range(2, 6)]
    yy, xx = np.mgrid[0:h, 0:w]; dx, dy = xx - cx, yy - cy
    th = np.arctan2(dy, dx); rr = np.hypot(dx, dy)
    Rt = R * (1 + sum(a * np.sin(k * th + p) for k, a, p in ks))
    m = np.clip((Rt - rr) / aa, 0, 1)[..., None]
    tone = col * (1 + noise2(h, w, (90, 30, 9), grain)[..., None])     # sapuan cat tidak rata
    img[:] = img * (1 - m) + tone * m

def stroke(img, pts, rad, col):
    h, w, _ = img.shape
    P = np.array(pts, float); t = np.linspace(0, 1, 2400)
    n = len(P) - 1; seg = np.minimum((t * n).astype(int), n - 1); u = t * n - seg
    p0 = P[np.maximum(seg - 1, 0)]; p1 = P[seg]; p2 = P[seg + 1]; p3 = P[np.minimum(seg + 2, n)]
    u2, u3 = u * u, u * u * u
    C = 0.5 * ((2 * p1) + (-p0 + p2) * u[:, None] + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2[:, None] + (-p0 + 3 * p1 - 3 * p2 + p3) * u3[:, None])
    for (x, y), k in zip(C, range(len(C))):
        rk = rad * (0.75 + 0.35 * math.sin(k / 160))                   # tebal garis sedikit bernapas (kuas)
        x0, x1, y0, y1 = int(x - rk - 2), int(x + rk + 3), int(y - rk - 2), int(y + rk + 3)
        if x1 < 0 or y1 < 0 or x0 >= w or y0 >= h: continue
        x0, y0 = max(x0, 0), max(y0, 0)
        yy, xx = np.mgrid[y0:min(y1, h), x0:min(x1, w)]
        m = np.clip(rk + 0.8 - np.hypot(xx - x, yy - y), 0, 1)[..., None]
        sub = img[y0:min(y1, h), x0:min(x1, w)]; sub[:] = sub * (1 - m) + col * m

def save(img, name, fmt='JPEG'):
    h, w, _ = img.shape
    im = bpy.data.images.new(name, w, h, alpha=False)
    px = np.concatenate([np.clip(img[::-1], 0, 1), np.ones((h, w, 1))], axis=2).astype(np.float32)
    im.pixels.foreach_set(px.ravel())
    im.filepath_raw = os.path.join(OUT, name); im.file_format = fmt
    if fmt == 'JPEG': bpy.context.scene.render.image_settings.quality = 92
    im.save(); print('[gen-r6]', name, w, h)

CREAM, TERRA, OCHRE, SAND, BROWN, INK = hexc('#e6dccb'), hexc('#b25e3f'), hexc('#cf9f52'), hexc('#d8bf8c'), hexc('#8a5537'), hexc('#262220')
W, H = 1200, 1600
def canvas():
    img = np.ones((H, W, 3)) * CREAM
    img *= 1 + noise2(H, W, (220, 60, 14, 4), 0.06)[..., None]          # kanvas plester bertekstur
    return img
a = canvas()
blob(a, 470, 560, 360, TERRA, 11); blob(a, 860, 1210, 250, SAND, 12); blob(a, 300, 1290, 120, BROWN, 13)
stroke(a, [(150, 250), (420, 330), (640, 520), (560, 760), (760, 900), (1010, 700), (1080, 380)], 3.4, INK)
save(a, 'lukisan-r6-a.jpg')
b = canvas()
blob(b, 620, 470, 330, OCHRE, 21); blob(b, 560, 1180, 380, TERRA, 22); blob(b, 980, 840, 110, BROWN, 23)
stroke(b, [(120, 980), (330, 820), (560, 900), (640, 640), (860, 560), (1060, 720), (1110, 1040)], 3.4, INK)
save(b, 'lukisan-r6-b.jpg')

# karpet bulat 2048²: pusat (1024, 1024), jari-jari 1000 px
S = 2048; c0 = S / 2; RR = 1000
rug = np.ones((S, S, 3)) * hexc('#d3c8b5'); rug *= 1 + noise2(S, S, (160, 40, 8), 0.05)[..., None]
yy, xx = np.mgrid[0:S, 0:S]
def ring_mask(cx, cy, r, wpx): return np.clip(wpx / 2 + 0.8 - np.abs(np.hypot(xx - cx, yy - cy) - r), 0, 1)
# busur konsentris hitam tipis (kiri): pusat di tepi kiri-tengah, hanya separuh atas-kanan
arcs = np.zeros((S, S))
for k in range(9): arcs = np.maximum(arcs, ring_mask(560, 1120, 120 + k * 52, 7))
arcs *= (xx > 560 - 900) * (yy < 1120 + 4)
rug = rug * (1 - arcs[..., None]) + INK * arcs[..., None]
# setengah cakram terracotta (tengah) & cokelat (bawah)
def half_disc(cx, cy, r, col, up=True):
    global rug
    d = np.hypot(xx - cx, yy - cy); m = np.clip(r - d, 0, 1.5) / 1.5
    m *= np.clip(((cy - yy) if up else (yy - cy)) + 1, 0, 1)
    rug = rug * (1 - m[..., None]) + col * m[..., None]
half_disc(1120, 1150, 300, TERRA, up=True); half_disc(1000, 2040, 560, BROWN, up=True)
# lajur garis lurus tipis (kanan)
lines = np.zeros((S, S))
for k in range(6): lines = np.maximum(lines, np.clip(4 + 0.8 - np.abs((yy - 0.18 * xx) - (930 + k * 40)), 0, 1))
lines *= (xx > 1350)
rug = rug * (1 - lines[..., None]) + INK * lines[..., None]
# tepi bulat: luar lingkaran = warna dasar (tak terlihat; mesh cakram memotong)
save(rug, 'karpet-r6.png', fmt='PNG')
