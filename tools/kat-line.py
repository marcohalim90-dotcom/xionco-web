# Gambar garis kategori Koleksi (kotak Filter) — gaya sama dengan gambar garis Customize (assets/cz-icons):
# garis hitam di latar transparan, ditampilkan sebagai CSS mask (warna mengikuti tema, emas saat dipilih).
# python tools/kat-line.py  →  assets/kats/line/<kunci>.png (240 × 240)
#  • kategori furnitur: memakai gambar Customize yang sudah ada (dipotong rapat & diskalakan agar mengisi kartu)
#  • kategori tanpa padanan furnitur (Hardware, Lightings, Lifestyle, Smart, Accent): digambar di sini
import os, math
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CZ = os.path.join(ROOT, 'assets', 'cz-icons'); OUT = os.path.join(ROOT, 'assets', 'kats', 'line'); os.makedirs(OUT, exist_ok=True)
N, S = 240, 4                       # ukuran akhir & supersampling
W = 3.1 * S                         # tebal garis (setara gambar Customize)

def fit(im, pad=.1):   # potong ke isi lalu pusatkan dengan margin
    a = im.getchannel('A'); bb = a.getbbox()
    im = im.crop(bb); w, h = im.size; k = (N * (1 - 2 * pad)) / max(w, h)
    im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    o = Image.new('RGBA', (N, N), (0, 0, 0, 0)); o.alpha_composite(im, ((N - im.width) // 2, (N - im.height) // 2)); return o
FROM = {
    'sofa': '_jenis/kursi__sofa', 'bed': '_jenis/divan__platform', 'sofa-bed': '_jenis/divan__daybed', 'desk': '_jenis/meja__desk',
    'cabinet': '_jenis/kabinet__sideboard', 'table': '_jenis/meja__dining', 'chair': '_jenis/kursi__dining', 'ottoman': '_jenis/kursi__ottoman',
    'sub-1s': '_jenis/kursi__armchair', 'sub-2s': 'kursi/sofa/seats__2', 'sub-3s': 'kursi/sofa/seats__3', 'sub-set': 'kursi/sofa/shape__lkanan',
}
for k, f in FROM.items():
    fit(Image.open(os.path.join(CZ, f + '.png')).convert('RGBA')).save(os.path.join(OUT, k + '.png'), optimize=True)

def canvas(): im = Image.new('RGBA', (N * S, N * S), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def P(x, y): return (x * S, y * S)
def line(d, pts, w=W, close=False):
    pts = [P(*p) for p in pts] + ([P(*pts[0])] if close else [])
    d.line(pts, fill=(0, 0, 0, 255), width=round(w), joint='curve')
    for p in (pts[0], pts[-1]): r = w / 2; d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=(0, 0, 0, 255))
def ell(d, cx, cy, rx, ry, a0=0, a1=360, w=W, n=64):
    line(d, [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)], w)
def save(im, k): fit(im.resize((N, N), Image.LANCZOS), .1).save(os.path.join(OUT, k + '.png'), optimize=True)

# Hardware: panel bilah dinding (KYOUKAI) tampak 3/4
im, d = canvas(); x0, x1, sk = 60, 180, 22
line(d, [(x0, 40 + sk), (x1, 40), (x1, 200), (x0, 200 + sk)], close=True)
for i in range(1, 9):
    x = x0 + (x1 - x0) * i / 9; y = 40 + sk - sk * i / 9; line(d, [(x, y + 4), (x, y + 156)], W * .75)
line(d, [(x1, 40), (x1 + 8, 44), (x1 + 8, 202), (x1, 200)])
save(im, 'hardware')
# Lightings: lampu gantung kubah
im, d = canvas()
line(d, [(120, 20), (120, 92)], W * .8); line(d, [(104, 20), (136, 20)]); line(d, [(112, 92), (128, 92), (128, 100), (112, 100)], close=True)
pts = [(120 + 64 * math.cos(math.radians(a)), 100 + 70 * (1 - math.sin(math.radians(a))) * .0 + 58 * (1 - math.cos(math.radians((a - 180) / 2)) ) * 0) for a in range(0, 1)]
dome = [(120 - 8 - 56 * math.sin(math.radians(t)), 100 + 62 * (1 - math.cos(math.radians(t)))) for t in range(0, 91, 3)]
line(d, dome); line(d, [(240 - x, y) for x, y in dome]); ell(d, 120, 162, 64, 13)
ell(d, 120, 167, 40, 8, 0, 180, W * .6)
save(im, 'lightings')
# Lifestyle: vas & mangkuk
im, d = canvas()
prof = [(28, 0), (34, 18), (36, 46), (30, 74), (18, 92), (14, 104), (18, 112)]
base_y = 200
line(d, [(92 - r, base_y - z) for r, z in [(p[0], p[1] * 1.15) for p in prof]]); line(d, [(92 + r, base_y - z) for r, z in [(p[0], p[1] * 1.15) for p in prof]])
ell(d, 92, base_y, 28, 6, 0, 180); ell(d, 92, base_y - 129, 18, 4.5)
ell(d, 170, 168, 42, 9); line(d, [(128, 168), (136, 186), (152, 198), (188, 198), (204, 186), (212, 168)])
save(im, 'lifestyle')
# Smart: pelat saklar dua tombol (VAZRA) tampak 3/4
im, d = canvas(); sk = 14
line(d, [(56, 54 + sk), (184, 54), (184, 182), (56, 182 + sk)], close=True)
line(d, [(68, 66 + sk), (172, 66), (172, 170), (68, 170 + sk)], close=True, w=W * .7)
line(d, [(120, 60 + sk * .5), (120, 176 + sk * .5)], W * .7)
for xa, xb in ((80, 110), (130, 160)):   # tombol rocker tegak + garis tekan
    ya = 92 + sk * (1 - (xa - 56) / 128); yb = 92 + sk * (1 - (xb - 56) / 128)
    line(d, [(xa, ya), (xb, yb), (xb, yb + 58), (xa, ya + 58)], close=True, w=W * .65)
    line(d, [(xa + 4, ya + 29 - 1), (xb - 4, yb + 29 - 1)], W * .4)
save(im, 'smart')
# Accent: bantal hias (sudut runcing, sisi menggembung, kerut di sudut, sedikit perspektif)
im, d = canvas()
C4 = [(58, 72), (178, 56), (188, 172), (64, 190)]
def bez(p0, p1, c, n=24): return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]) for t in [i / n for i in range(n + 1)]]
cx, cy = sum(p[0] for p in C4) / 4, sum(p[1] for p in C4) / 4; pts = []
for i in range(4):
    p0, p1 = C4[i], C4[(i + 1) % 4]; mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    pts += bez(p0, p1, (mx + (mx - cx) * .32, my + (my - cy) * .32))
line(d, pts, close=True)
for (x, y) in C4:   # kerut kecil dari tiap sudut ke tengah
    line(d, [(x + (cx - x) * .12, y + (cy - y) * .12), (x + (cx - x) * .3, y + (cy - y) * .3)], W * .55)
line(d, bez((96, 122), (150, 116), (124, 112)), W * .5)
save(im, 'accent')
# Semua: empat kotak (kisi katalog)
im, d = canvas()
for (x, y) in ((50, 50), (128, 50), (50, 128), (128, 128)): line(d, [(x, y), (x + 62, y), (x + 62, y + 62), (x, y + 62)], close=True)
save(im, 'all')
print('ok', sorted(os.listdir(OUT)))
