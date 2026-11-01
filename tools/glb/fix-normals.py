# Seragamkan arah muka model SketchUp yang sudah terpasang (normal sebagian terbalik → pita warna beda di panggung, mis. lengan GUISE 1 Seater)
# blender -b --factory-startup --python tools/glb/fix-normals.py -- assets/items/<id>/model.glb [keluaran.glb] [--pillow]
#   → satukan titik, arahkan semua muka ke luar (recalc_face_normals), normal halus dihitung ulang (sudut sama dengan finish.py),
#     ekspor GLB (extras peran material tetap). Setelahnya: node tools/compress/compress.js <file.glb>
#   --pillow: pulau kain yang menjulang di atas dudukan (bantal sandaran CUBIX) dipindah ke material kain sendiri
#             (extras part 'pillow') → warna bantal bisa dipilih terpisah di situs (world.js tintModel)
#   --ray:    (27 Okt) panel SKP terbuka lolos dari recalc_face_normals (mis. panel depan GUISE, sisi dalam lengan KYRIOS
#             menghadap ke dalam → belang bergaris di panggung). Tiap muka ditembak sinar ke dua arah: bila sisi belakang
#             lolos ke luar sedangkan sisi depan menabrak badan model, muka dibalik.
#   --dry:    hanya laporkan (tanpa ekspor); --dry --ray --out-flip=<json> menulis pusat muka yang perlu dibalik
#             (koordinat glTF) untuk tools/glb/normal-fix.js — material & tekstur tidak lewat ekspor ulang Blender
import bpy, bmesh, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]
PILLOW = '--pillow' in argv; RAY = '--ray' in argv; DRY = '--dry' in argv
OUT_FLIP = next((a.split('=', 1)[1] for a in argv if a.startswith('--out-flip=')), None); FLIPS = []
# --ray-r=<m>: sinar dianggap "lolos" bila tidak menabrak dalam jarak ini (bawaan 50 m). Panel di rongga yang berhadapan
# dengan panel lain (sisi dalam lengan KYRIOS ↔ rangka lengan 14 cm di belakangnya) hanya terbedakan dengan jarak pendek (0,6)
RAY_R = float(next((a.split('=', 1)[1] for a in argv if a.startswith('--ray-r=')), 50))
argv = [a for a in argv if not a.startswith('--')]
src = argv[0]; dst = argv[1] if len(argv) > 1 else src
SMOOTH_DEG = 30
PILLOW_TOP = .55   # pulau kain yang puncaknya di atas 55 cm = bantal sandaran (dudukan CUBIX ±40 cm)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']

def pillow_mat(fab):
    name = fab.name + ' bantal'
    m = bpy.data.materials.get(name)
    if m: return m
    m = fab.copy(); m.name = name
    for k in fab.keys(): m[k] = fab[k]
    m['part'] = 'pillow'
    return m

def world_bvh():
    # model ubin (tools/glb/tile.py, extras xionco_tile {n0, pitch}): di file hanya ada SATU ubin → salinannya ditambahkan
    # ke BVH di posisi susunan panggung, supaya sinar tidak lolos lewat celah ubin yang belum tersusun
    tile = None
    for sc in bpy.data.scenes:
        x = sc.get('xionco_tile')
        if x: tile = x
    vs, ps = [], []
    for o in ms:
        mw = o.matrix_world
        reps = [0]
        if tile and o.name.startswith('tile'): reps = [i * float(tile['pitch']) for i in range(int(tile['n0']))]
        ps_x = o.parent.matrix_world.to_scale().x if o.parent else 1   # pitch dalam ruang induk ubin (KYRIOS: induk berskala 0,89)
        if len(reps) > 1: print('TILE', o.name, 'salinan BVH', len(reps), 'pitch', tile['pitch'], 'x', round(ps_x, 3))
        for dx in reps:
            k = len(vs); off = mw.copy(); off.translation.x += dx * ps_x
            vs.extend(off @ v.co for v in o.data.vertices)
            ps.extend([k + i for i in p.vertices] for p in o.data.polygons)
    return BVHTree.FromPolygons(vs, ps)

def escapes(bvh, c, d):
    # 16 sinar di belahan arah d (lurus + 5 × 35° + 10 × 65°): berapa yang lolos ke luar tanpa menabrak model.
    # 27 Okt: 5 sinar tidak cukup untuk panel di dalam rongga (sisi dalam lengan KYRIOS: sinar lurus menabrak lengan seberang)
    t = d.orthogonal().normalized(); b = d.cross(t)
    dirs = [d]
    for ang, k in ((.61, 5), (1.13, 10)):
        for i in range(k):
            ph = 2 * math.pi * (i + .5 * (k == 10)) / k
            dirs.append((d * math.cos(ang) + (t * math.cos(ph) + b * math.sin(ph)) * math.sin(ang)).normalized())
    o0 = c + d * .0005
    return sum(1 for r in dirs if bvh.ray_cast(o0, r, RAY_R)[0] is None)

def ray_flip(o, bm, bvh):
    mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
    flip, area = [], 0
    for f in bm.faces:
        a = f.calc_area()
        if a < 1e-9: continue
        c = mw @ f.calc_center_median(); n = (nm @ f.normal).normalized()
        em = escapes(bvh, c, -n)
        if em >= 3 and escapes(bvh, c, n) <= max(1, em // 4): flip.append(f); area += a   # belakang jelas lebih "terbuka" dari depan
    if flip:
        lo = [min((mw @ v.co)[i] for f in flip for v in f.verts) for i in range(3)]
        hi = [max((mw @ v.co)[i] for f in flip for v in f.verts) for i in range(3)]
        print('RAY', o.name, len(flip), 'muka dibalik', '%.0f cm2' % (area * 1e4), 'bbox', [round(x, 2) for x in lo], [round(x, 2) for x in hi])
        for f in flip:   # pusat muka dalam koordinat glTF (Y atas) → tools/glb/normal-fix.js --flip <json>
            c = mw @ f.calc_center_median(); d = (nm @ f.normal).normalized()   # normal sebelum dibalik (menghadap ke dalam)
            FLIPS.append([round(c.x, 5), round(c.z, 5), round(-c.y, 5), round(d.x, 4), round(d.z, 4), round(-d.y, 4)])
        if not DRY: bmesh.ops.reverse_faces(bm, faces=flip)
    else: print('RAY', o.name, 0, 'muka dibalik')

def view_flip():
    # --view (27 Okt, KYRIOS): model "difoto" dari ±160 arah (berkas sinar sejajar 140 × 140, tidak dari bawah lantai).
    # Tiap muka dihitung berapa kali terkena dari DEPAN (sisi normal) dan dari BELAKANG. Muka yang lebih sering terlihat
    # dari belakang = terbalik → dibalik. Tidak bergantung letak (panel berhadapan di rongga lengan pun benar).
    # Memakai urutan titik ASLI file (tanpa recalc) → daftar cocok 1:1 dengan tools/glb/normal-fix.js --flip.
    tile = None
    for sc in bpy.data.scenes:
        if sc.get('xionco_tile'): tile = sc.get('xionco_tile')
    vs, ps, own = [], [], []
    for oi, o in enumerate(ms):
        mw = o.matrix_world; reps = [0]
        if tile and o.name.startswith('tile'): reps = [i * float(tile['pitch']) for i in range(int(tile['n0']))]
        ps_x = o.parent.matrix_world.to_scale().x if o.parent else 1
        for dx in reps:
            k = len(vs); off = mw.copy(); off.translation.x += dx * ps_x
            vs.extend(off @ v.co for v in o.data.vertices)
            for p in o.data.polygons: ps.append([k + i for i in p.vertices]); own.append((oi, p.index))
    bvh = BVHTree.FromPolygons(vs, ps)
    lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
    ctr = (lo + hi) / 2; R = (hi - lo).length / 2 + .05; G = 140
    cnt = {}
    n_dir = 320; gold = math.pi * (3 - math.sqrt(5)); views = 0
    for i in range(n_dir):
        z = 1 - 2 * (i + .5) / n_dir; r = math.sqrt(1 - z * z); th = gold * i
        d = Vector((r * math.cos(th), r * math.sin(th), z))   # arah sinar (Blender: Z atas)
        if d.z > .2: continue   # sinar ke atas = melihat dari bawah lantai
        views += 1
        u = d.orthogonal().normalized(); w = d.cross(u)
        base = ctr - d * (R * 3)
        for a in range(G):
            fa = (a / (G - 1) * 2 - 1) * R
            for b in range(G):
                org = base + u * fa + w * ((b / (G - 1) * 2 - 1) * R)
                loc, nrm, idx, dist = bvh.ray_cast(org, d, R * 6)
                if idx is None: continue
                key = own[idx]; c = cnt.get(key)
                if c is None: c = cnt[key] = [0, 0]
                c[0 if d.dot(nrm) < 0 else 1] += 1
    print('VIEW', views, 'arah,', len(cnt), 'muka terlihat')
    for oi, o in enumerate(ms):
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed(); n = 0; area = 0
        for p in o.data.polygons:
            c = cnt.get((oi, p.index))
            if not c or c[1] < 2 or c[1] <= c[0]: continue
            n += 1; area += p.area
            ce = mw @ p.center; d = (nm @ p.normal).normalized()
            FLIPS.append([round(ce.x, 5), round(ce.z, 5), round(-ce.y, 5), round(d.x, 4), round(d.z, 4), round(-d.y, 4)])
        print('VIEW', o.name, n, 'muka terlihat dari belakang', '%.0f cm2' % (area * 1e4 * mw.to_scale().x ** 2))
    if OUT_FLIP:
        import json
        with open(OUT_FLIP, 'w') as fh: json.dump(FLIPS, fh)
        print('FLIPS', len(FLIPS), '→', OUT_FLIP)
    sys.exit(0)

if '--view' in sys.argv: view_flip()
BVH = world_bvh() if RAY else None
for o in ms:
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0002)
    nf = len(bm.faces)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if RAY: bm.normal_update(); ray_flip(o, bm, BVH)
    moved = 0
    if PILLOW:
        mats = o.data.materials
        fab_idx = [i for i, m in enumerate(mats) if m and m.get('role') == 'fabric' and m.get('part') != 'pillow']
        mw = o.matrix_world
        seen = set()
        for f0 in bm.faces:
            if f0.index in seen or f0.material_index not in fab_idx: continue
            # pulau kain terhubung (lewat tepi) dengan material yang sama
            isl, stack = [], [f0]; seen.add(f0.index)
            while stack:
                f = stack.pop(); isl.append(f)
                for e in f.edges:
                    for g in e.link_faces:
                        if g.index not in seen and g.material_index == f0.material_index: seen.add(g.index); stack.append(g)
            top = max((mw @ v.co).z for f in isl for v in f.verts)
            bot = min((mw @ v.co).z for f in isl for v in f.verts)
            if top > PILLOW_TOP and bot > .2:
                pm = pillow_mat(mats[f0.material_index])
                if pm.name not in [m.name for m in mats if m]: mats.append(pm)
                pi = [m.name if m else '' for m in mats].index(pm.name)
                for f in isl: f.material_index = pi
                moved += len(isl)
    bm.to_mesh(o.data); bm.free()
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    if o.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(SMOOTH_DEG))
    print('FIX', o.name, nf, 'faces', ('bantal %d muka' % moved) if PILLOW else '')
if DRY:
    if RAY and OUT_FLIP:
        import json
        with open(OUT_FLIP, 'w') as fh: json.dump(FLIPS, fh)
        print('FLIPS', len(FLIPS), '→', OUT_FLIP)
    sys.exit(0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_extras=True, export_apply=True, export_image_format='WEBP', export_jpeg_quality=82)
print('OK', dst)
