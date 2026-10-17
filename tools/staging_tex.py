# XIONCO — proses tekstur yang di-Acc: JPG 1K → WebP 1024 px (albedo, normal, rough) ke folder set.
# Pakai: python tools/staging_tex.py <folder_set> <albedo.jpg> <normal.jpg|''> <rough.jpg|''>
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
print('ok')
