# Kemas urutan render → frame Galeri situs (WebP), frame yang belum dirender diisi frame terdekat sebelumnya.
#   python tools/render/pack-galeri.py <folder seq jpg> <set> [jumlah=165] [lebar=1120]
#   → assets/galeri/<set>/000.webp …
import glob, os, sys
from PIL import Image

src, name = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 165
width = int(sys.argv[4]) if len(sys.argv) > 4 else 1120
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
out = os.path.join(root, 'assets', 'galeri', name); os.makedirs(out, exist_ok=True)
have = {int(os.path.splitext(os.path.basename(f))[0]): f for f in glob.glob(os.path.join(src, '[0-9][0-9][0-9].jpg'))}
if not have: sys.exit('tidak ada frame di ' + src)
last = have[min(have)]; filled = 0; total = 0
for i in range(n):
    f = have.get(i)
    if f: last = f
    else: filled += 1
    im = Image.open(last).convert('RGB')
    if im.width != width: im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    p = os.path.join(out, '%03d.webp' % i); im.save(p, quality=80, method=5); total += os.path.getsize(p)
print('ok %d frame (%d diisi frame terdekat), %.1f MB -> %s' % (n, filled, total / 1e6, out))
