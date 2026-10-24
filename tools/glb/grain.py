# Arah serat kayu per KOMPONEN + garis sambung (permintaan pemilik 23 Okt 2026).
#   blender -b --factory-startup -P tools/glb/grain.py -- in.glb out.glb [--nobisect] [--report file.json]
# Kayu = material berlabel xc_wood (extras). Untuk tiap muka kayu:
#   1. (model kotak, mis. rangka CUBIX) mesh kayu dipotong di bidang sambungan — koordinat unik sisi-sisi komponen —
#      supaya tiang & palang yang menyatu dalam satu mesh menjadi bagian terpisah;
#   2. arah komponen = sumbu DI BIDANG MUKA dengan "tali busur" terpanjang (sinar dari sedikit di dalam muka sampai keluar komponen);
#      muka ujung (end grain) hanya bila batangnya ramping (< 16 cm) dan jauh lebih panjang ke arah normal.
#      Tiang/tangan tegak → serat tegak; palang, rel & daun meja → serat mendatar sepanjang komponen;
#   3. UV dalam meter: U = sepanjang serat (tekstur kayu pustaka berserat searah U), V = arah lain di bidang muka;
#      tiap komponen (wilayah bersambung dengan arah sama) diberi geser acak → sambungan antar komponen terlihat.
# Ulang aman (idempoten): UV dihitung ulang dari geometri; pemotongan tidak menambah apa-apa bila sudah terpotong.
import bpy, bmesh, sys, os, json, math, random, hashlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, DST = argv[0], argv[1]
NOBISECT = '--nobisect' in argv
REPORT = argv[argv.index('--report') + 1] if '--report' in argv else None
MAXPLANES = 64          # lebih dari ini per sumbu = bentuk organik (model AI) → tanpa pemotongan (CUBIX AC: 29–32 bidang karena tepi tumpul)
MAXBISECT = 6000        # muka kayu maksimum untuk dipotong

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
bpy.context.view_layer.update()
meshes = [o for o in sc.objects if o.type == 'MESH']

def is_wood(m):
    return m is not None and (m.get('xc_wood') or m.get('role') == 'wood')

# satuan: ukuran model → meter (sama dengan deteksi satuan panggung)
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in meshes:
    for c in o.bound_box:
        p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
wide = max(hi - lo)
U = 1.0 if wide < 30 else (0.01 if wide < 3000 else 0.001)
salt = os.path.basename(os.path.dirname(SRC)) + '/' + os.path.basename(SRC)
rep = {'file': salt, 'unit': U, 'objects': []}

for o in meshes:
    me = o.data
    widx = {i for i, m in enumerate(me.materials) if is_wood(m)}
    if not widx: continue
    if me.users > 1: o.data = me = me.copy()          # instance bersama → UV per posisi dunia butuh mesh sendiri
    bm = bmesh.new(); bm.from_mesh(me)
    wf = [f for f in bm.faces if f.material_index in widx]
    info = {'name': o.name, 'faces0': len(wf), 'bisect': 0}
    # ---- 1. potong di bidang sambungan (hanya geometri kayu, sumbu lokal objek)
    if not NOBISECT and len(wf) <= MAXBISECT:
        vs = {v for f in wf for v in f.verts}
        ext = [max(v.co[k] for v in vs) - min(v.co[k] for v in vs) for k in range(3)]
        tol = max(1e-6, 2e-3 * max(ext))
        planes = []
        for k in range(3):
            cs = sorted(v.co[k] for v in vs); uniq = []
            for x in cs:
                if not uniq or x - uniq[-1] > tol: uniq.append(x)
            planes.append(uniq)
        if all(len(p) <= MAXPLANES for p in planes):
            for k in range(3):
                for x in planes[k][1:-1]:
                    wf = [f for f in bm.faces if f.material_index in widx]
                    geom = list({v for f in wf for v in f.verts}) + list({e for f in wf for e in f.edges}) + wf
                    no = Vector((0, 0, 0)); no[k] = 1; co = Vector((0, 0, 0)); co[k] = x
                    r = bmesh.ops.bisect_plane(bm, geom=geom, dist=tol * .25, plane_co=co, plane_no=no)
                    info['bisect'] += len(r.get('geom_cut', []))
    bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
    wf = [f for f in bm.faces if f.material_index in widx]
    # ---- 2. arah komponen per muka (BVH muka kayu, koordinat dunia)
    mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
    wv = {v.index: mw @ v.co for f in wf for v in f.verts}
    order = {vi: k for k, vi in enumerate(wv)}
    bvh = BVHTree.FromPolygons([wv[vi] for vi in wv], [[order[v.index] for v in f.verts] for f in wf], all_triangles=False)
    diag = (hi - lo).length * 2; eps = 6e-4 / U
    lab = {}; CH = {}; NRM = {}; AREA = {}; STRONG = {}
    DENSE = info['bisect'] == 0 and len(wf) > 2000                # mesh rapat/organik (model AI)
    SR = 3.0 if DENSE else 1.8
    for f in wf:
        c = mw @ f.calc_center_median(); n = (nm @ f.normal).normalized()
        if n.length < .5: lab[f.index] = 2; continue
        p = c - n * eps; ch = []
        for k in range(3):
            d = Vector((0, 0, 0)); d[k] = 1; hs = []
            for s in (1, -1):
                hit = bvh.ray_cast(p, d * s, diag)
                hs.append(hit[3] if hit[0] is not None else None)
            # mesh terbuka (muka tersembunyi dihapus SketchUp, mis. atas palang di bawah dudukan): sinar lolos → pakai sisi lawan ×2
            ch.append(hs[0] + hs[1] if None not in hs else (2 * (hs[0] or hs[1]) if (hs[0] or hs[1]) else 0.0))
        CH[f.index] = ch; NRM[f.index] = n; AREA[f.index] = f.calc_area()
    def sax(n): k = max(range(3), key=lambda q: abs(n[q])); return k * 2 + (n[k] > 0)
    if DENSE:   # mesh AI bergelombang/berlapis dalam: tali busur dirata-rata dengan tetangga searah (hilangkan anomali lokal)
        nb = {f.index: [g.index for e in f.edges for g in e.link_faces if g.index != f.index and g.index in CH and sax(NRM[g.index]) == sax(NRM[f.index])] for f in wf if f.index in CH}
        for _ in range(5):
            CH = {i_: [(CH[i_][k] + sum(CH[j_][k] for j_ in js)) / (1 + len(js)) for k in range(3)] for i_, js in nb.items()}
    for f in wf:
        if f.index not in CH: continue
        ch = CH[f.index]; n = NRM[f.index]
        ax = max(range(3), key=lambda k: abs(n[k])); ip = [k for k in range(3) if k != ax]
        m = max(ip, key=lambda k: ch[k]); m2 = [k for k in ip if k != m][0]
        # serat selalu searah bidang muka; muka UJUNG (end grain) hanya untuk ujung batang ramping (ujung kaki, ujung palang)
        endg = ch[ax] > 1.5 * ch[m] and ch[m] * U < .16
        lab[f.index] = ax if endg else m
        STRONG[f.index] = endg or ch[m] >= SR * ch[m2]           # arah jelas: batang/palang/tiang
    # ---- 2b. muka RAGU (papan lebar hampir persegi: daun meja bulat/segi banyak, panel kabinet, dudukan lengkung model AI)
    #      digabung per permukaan mulus (normal tetangga < 25°) lalu diberi SATU arah bersama dari tali busur berbobot luas.
    #      Muka berarah jelas tidak ikut → sambungan tiang–palang tetap.
    seen = set(); COS = math.cos(math.radians(38 if DENSE else 25))
    for f in wf:
        if f.index in seen or STRONG.get(f.index, True): continue
        patch = [f]; seen.add(f.index); k_ = 0
        while k_ < len(patch):
            g = patch[k_]; k_ += 1
            for e in g.edges:
                for h in e.link_faces:
                    if h.index in seen or h.index not in lab or STRONG.get(h.index, True): continue
                    if NRM[h.index].dot(NRM[g.index]) < COS: continue
                    seen.add(h.index); patch.append(h)
        nsum = Vector((0, 0, 0)); tot = [0.0, 0.0, 0.0]
        for g in patch:
            nsum += NRM[g.index] * AREA[g.index]
            for k in range(3): tot[k] += CH[g.index][k] * AREA[g.index]
        axp = max(range(3), key=lambda k: abs(nsum[k])); ipp = [k for k in range(3) if k != axp]
        # ukuran NYATA permukaan (bukan tali busur: palang yang menembus tiang terbaca pendek)
        pts = [mw @ v.co for g in patch for v in g.verts]
        ext = {k: max(q[k] for q in pts) - min(q[k] for q in pts) for k in ipp}
        a1 = max(ipp, key=lambda k: ext[k])
        best = a1
        if axp != 2 and 2 in ipp and ext[2] >= .8 * ext[a1]: best = 2      # panel tegak yang hampir persegi → serat tegak
        for g in patch:
            ng = NRM[g.index]; axg = max(range(3), key=lambda k: abs(ng[k]))
            lab[g.index] = best if best != axg else max([k for k in range(3) if k != axg], key=lambda k: ext.get(k, tot[k]))
    if DENSE:   # daun/dudukan (muka menghadap atas/bawah) mesh AI = satu papan → satu arah per permukaan bersambung
        seen = set()
        for f in wf:
            if f.index in seen or f.index not in CH or sax(NRM[f.index]) // 2 != 2: continue
            sx = sax(NRM[f.index]); patch = [f]; seen.add(f.index); k_ = 0
            while k_ < len(patch):
                g = patch[k_]; k_ += 1
                for e in g.edges:
                    for h in e.link_faces:
                        if h.index in seen or h.index not in CH or sax(NRM[h.index]) != sx: continue
                        seen.add(h.index); patch.append(h)
            tot = [sum(CH[g.index][k] * AREA[g.index] for g in patch) for k in (0, 1)]
            best = 0 if tot[0] >= tot[1] else 1
            for g in patch: lab[g.index] = best
    if DENSE:                                                      # bintik sisa di mesh rapat: ikut mayoritas tetangga
        nb = {f.index: [g.index for e in f.edges for g in e.link_faces if g.index != f.index and g.index in lab] for f in wf}
        for _ in range(3):
            new = dict(lab)
            for i_, js in nb.items():
                if not js: continue
                cnt = {}
                for j_ in js: cnt[lab[j_]] = cnt.get(lab[j_], 0) + 1
                b_ = max(cnt, key=cnt.get)
                if b_ != lab[i_] and cnt[b_] >= .6 * len(js): new[i_] = b_
            lab = new
    # ---- 3. wilayah komponen (bersambung, arah sama) → geser acak; UV meter dengan U sepanjang serat
    region = {}; rid = 0
    for f in wf:
        if f.index in region: continue
        stack = [f]; region[f.index] = rid
        while stack:
            g = stack.pop()
            for e in g.edges:
                for h in e.link_faces:
                    if h.index in lab and h.index not in region and lab[h.index] == lab[g.index]:
                        region[h.index] = rid; stack.append(h)
        rid += 1
    uvl = bm.loops.layers.uv.active or bm.loops.layers.uv.new('UVMap')
    seed = int(hashlib.md5((salt + o.name).encode()).hexdigest()[:8], 16)
    offs = {}
    for f in wf:
        r = region[f.index]
        if r not in offs:
            rr = random.Random(seed + r * 7919); offs[r] = (rr.random() * 3.0, rr.random() * 3.0)
        du, dv = offs[r]
        n = nm @ f.normal; ax = max(range(3), key=lambda k: abs(n[k])); a, b = [k for k in range(3) if k != ax]
        g = lab[f.index]
        if g == ax: ua, va = a, b                       # ujung serat (muka potong) — pola serat melintang
        else: ua, va = g, (b if g == a else a)
        for l in f.loops:
            co = (mw @ l.vert.co) * U
            l[uvl].uv = (co[ua] + du, co[va] + dv)
    info.update(faces=len(wf), regions=rid, axes={'xyz'[k]: sum(1 for f in wf if lab[f.index] == k) for k in range(3)})
    bm.to_mesh(me); bm.free(); me.update()
    rep['objects'].append(info)
    print('[serat]', o.name, info, flush=True)

os.makedirs(os.path.dirname(os.path.abspath(DST)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=DST, export_format='GLB', export_extras=True, export_image_format='AUTO', export_yup=True, export_apply=False)
if REPORT: json.dump(rep, open(REPORT, 'w'), indent=1)
print('[serat] selesai', SRC, '->', DST, flush=True)
