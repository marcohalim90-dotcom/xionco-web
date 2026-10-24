# Unduh aset CC0 Poly Haven ke pustaka lokal (model glTF 2K & tekstur 2K).
#   python tools/fetch-polyhaven.py models brass_vase_01 ...   → data/source/render-lib/polyhaven/<id>/
#   python tools/fetch-polyhaven.py textures marble_01 ...      → data/source/render-lib/textures/ph-<id>/ (albedo/normal/rough.jpg)
import json, os, sys, urllib.request
UA = {'User-Agent': 'xionco-galeri/1.0'}
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LIB = os.path.join(ROOT, 'data', 'source', 'render-lib')   # hanya untuk render Galeri — lokal, tidak online
LICENSE = 'Sumber: Poly Haven (https://polyhaven.com/a/{id}) — lisensi CC0 1.0 (domain publik), bebas dipakai komersial tanpa atribusi.\n'

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()

def save(url, path):
    if os.path.exists(path): return 0
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = get(url); open(path, 'wb').write(data); return len(data)

def model(aid, res='2k'):
    f = json.loads(get('https://api.polyhaven.com/files/' + aid))
    g = f['gltf'].get(res) or f['gltf'].get('1k')
    d = os.path.join(LIB, 'polyhaven', aid); n = 0
    n += save(g['gltf']['url'], os.path.join(d, os.path.basename(g['gltf']['url'])))
    for rel, inc in g['gltf'].get('include', {}).items():
        n += save(inc['url'], os.path.join(d, rel))
    open(os.path.join(d, 'LICENSE.txt'), 'w', encoding='utf8').write(LICENSE.format(id=aid))
    return n

def texture(aid, res='2k'):
    f = json.loads(get('https://api.polyhaven.com/files/' + aid))
    d = os.path.join(LIB, 'textures', 'ph-' + aid); n = 0
    for key, out in (('Diffuse', 'albedo'), ('nor_gl', 'normal'), ('Rough', 'rough')):
        m = f.get(key, {}).get(res) or f.get(key, {}).get('1k')
        if not m: continue
        fmt = m.get('jpg') or m.get('png')
        n += save(fmt['url'], os.path.join(d, out + os.path.splitext(fmt['url'])[1]))
    open(os.path.join(d, 'LICENSE.txt'), 'w', encoding='utf8').write(LICENSE.format(id=aid))
    return n

if __name__ == '__main__':
    kind, ids = sys.argv[1], sys.argv[2:]
    tot = 0
    for aid in ids:
        try:
            n = (model if kind == 'models' else texture)(aid); tot += n
            print('%-28s %6.1f MB' % (aid, n / 1e6), flush=True)
        except Exception as e:
            print('%-28s GAGAL %s' % (aid, e), flush=True)
    print('total %.1f MB' % (tot / 1e6))
