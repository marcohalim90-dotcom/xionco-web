# XIONCO — proses tekstur yang di-Acc: JPG 1K → WebP 1024 px (albedo, normal, rough) ke folder set.
# Pakai: python tools/staging_tex.py <folder_set> <albedo.jpg> <normal.jpg|''> <rough.jpg|''>
#       python tools/staging_tex.py <folder_set>            → hanya buat thumb.webp + HEX dari albedo.webp yang ada
import sys, os
from PIL import Image
out, maps = sys.argv[1], dict(zip(('albedo', 'normal', 'rough'), sys.argv[2:5]))
os.makedirs(out, exist_ok=True)
for name, src in maps.items():
    if not src or not os.path.exists(src):
        continue
    im = Image.open(src)
    im = im.convert('L' if name == 'rough' else 'RGB')
    if max(im.size) > 1024:
        im.thumbnail((1024, 1024), Image.LANCZOS)
    im.save(os.path.join(out, name + '.webp'), 'WEBP', quality=88, method=6)
# gambar kecil untuk kartu pilihan + warna rata-rata (dipakai sebagai warna cadangan & nama warna)
a = os.path.join(out, 'albedo.webp')
if os.path.exists(a):
    im = Image.open(a).convert('RGB')
    t = im.copy(); t.thumbnail((128, 128), Image.LANCZOS); t.save(os.path.join(out, 'thumb.webp'), 'WEBP', quality=82, method=6)
    r, g, b = im.resize((1, 1), Image.BOX).getpixel((0, 0))
    print('HEX #%02x%02x%02x' % (r, g, b))
print('ok')
