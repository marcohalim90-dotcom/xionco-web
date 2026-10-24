# Unduh bahan CC0 ambientCG ke pustaka lokal (hanya untuk render Galeri — lokal, tidak online).
#   python tools/fetch-ambientcg.py Fabric084 Leather039 ...   → data/source/render-lib/textures/acg-<id>/ (albedo/normal/rough[/disp].jpg)
import io, os, sys, urllib.request, zipfile
UA = {'User-Agent': 'xionco-galeri/1.0'}
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LIB = os.path.join(ROOT, 'data', 'source', 'render-lib', 'textures')
LICENSE = 'Sumber: ambientCG (https://ambientcg.com/view?id={id}) — lisensi CC0 1.0 (domain publik), bebas dipakai komersial tanpa atribusi.\n'
MAP = {'_Color.': 'albedo', '_NormalGL.': 'normal', '_Roughness.': 'rough', '_Displacement.': 'disp'}

def material(aid, res='2K'):
    d = os.path.join(LIB, 'acg-' + aid)
    if os.path.exists(os.path.join(d, 'albedo.jpg')): return 0
    url = 'https://ambientcg.com/get?file=%s_%s-JPG.zip' % (aid, res)
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()
    os.makedirs(d, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for n in z.namelist():
            for key, out in MAP.items():
                if key in n and n.lower().endswith('.jpg'):
                    open(os.path.join(d, out + '.jpg'), 'wb').write(z.read(n))
    open(os.path.join(d, 'LICENSE.txt'), 'w', encoding='utf8').write(LICENSE.format(id=aid))
    return len(data)

if __name__ == '__main__':
    for a in sys.argv[1:]:
        print(a, material(a))
