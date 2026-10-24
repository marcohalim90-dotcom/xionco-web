# Kemas render Galeri B1 → frame situs: output/galeri/galeryB1/fNNN.jpg → assets/galeri/b1/NNN.webp (lebar 1280, kualitas 82)
# + daftarkan/segarkan versi "b1" di assets/galeri/sets.json (ruang dari rooms.json). Frame yang belum dirender diisi frame terdekat sebelumnya.
#   python tools/render/pack-b1.py [lebar=1280]
import glob, json, os, sys
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'output', 'galeri', 'galeryB1'); OUT = os.path.join(ROOT, 'assets', 'galeri', 'b1'); os.makedirs(OUT, exist_ok=True)
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1280
info = json.load(open(os.path.join(SRC, 'rooms.json'))); n = info['n']
have = {int(os.path.basename(f)[1:4]): f for f in glob.glob(os.path.join(SRC, 'f[0-9][0-9][0-9].jpg'))}
if not have: sys.exit('belum ada frame')
last = have[min(have)]; filled = 0; total = 0
for i in range(n):
    f = have.get(i)
    if f: last = f
    else: filled += 1
    p = os.path.join(OUT, '%03d.webp' % i)
    if f and os.path.exists(p) and os.path.getmtime(p) > os.path.getmtime(f): total += os.path.getsize(p); continue
    im = Image.open(last).convert('RGB')
    if im.width != W: im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    im.save(p, quality=82, method=5); total += os.path.getsize(p)
sets_p = os.path.join(ROOT, 'assets', 'galeri', 'sets.json'); sets = json.load(open(sets_p, encoding='utf8'))
entry = {'id': 'b1', 'title': 'Galeri B1', 'note': 'Paviliun Pagi · render Cycles · 4 ruang · cahaya matahari lewat kisi jati', 'n': n, 'rooms': info['rooms']}
sets = [s for s in sets if s['id'] != 'b1'] + [entry]
json.dump(sets, open(sets_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('ok %d frame (%d diisi frame terdekat), %.1f MB -> %s; sets.json: b1 (%d ruang)' % (n, filled, total / 1e6, OUT, len(info['rooms'])))
