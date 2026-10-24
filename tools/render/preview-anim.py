# Pratinjau animasi dari frame render: python tools/render/preview-anim.py <folder frame> <keluaran.webp> [lebar=960] [fps=12]
#   frame f000.jpg, f001.jpg, … → WebP animasi (diputar di browser/WhatsApp) + lembar kontak <keluaran>-lembar.jpg
import glob, os, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 960
fps = float(sys.argv[4]) if len(sys.argv) > 4 else 12
fs = sorted(glob.glob(os.path.join(src, 'f[0-9][0-9][0-9].jpg')))
ims = [Image.open(f).convert('RGB') for f in fs]
ims = [im.resize((W, round(im.height * W / im.width)), Image.LANCZOS) for im in ims]
ims[0].save(out, save_all=True, append_images=ims[1:], duration=int(1000 / fps), loop=0, quality=82, method=4)
n = len(ims); cols = 4; step = max(1, n // 12); pick = ims[::step][:12]
tw, th = W // 2, ims[0].height // 2
sh = Image.new('RGB', (tw * cols, th * ((len(pick) + cols - 1) // cols)))
for k, im in enumerate(pick): sh.paste(im.resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
sh.save(os.path.splitext(out)[0] + '-lembar.jpg', quality=86)
print('%d frame -> %s (%.1f MB)' % (n, out, os.path.getsize(out) / 1e6))
