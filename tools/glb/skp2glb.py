# SKP → GLB massal (Blender + add-on SketchUp Importer dimuat sementara, tidak dipasang permanen)
# Pakai: set BLENDER_USER_SCRIPTS=<folder sementara berisi addons/sketchup_importer> lalu
#   blender -b --factory-startup --python tools/glb/skp2glb.py -- - <folder_skp> <folder_out> [nama1,nama2]
#   (add-on rilis RedHaloStudio, GitHub — hanya diaktifkan dalam sesi ini, preferensi tidak disimpan)
# Hasil per file: <out>/<slug>/model.glb + info.json (ukuran cm, jumlah segitiga, material, objek dibuang)
import bpy, sys, os, json, re, math, time, traceback, importlib, addon_utils
argv = sys.argv[sys.argv.index('--') + 1:]
addon_dir, src, out = argv[0], argv[1], argv[2]
only = set(x.strip().lower() for x in argv[3].split(',')) if len(argv) > 3 and argv[3] else None
def enable():
    addon_utils.enable('sketchup_importer', default_set=True, persistent=False)
enable()

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
# objek bantu yang dibuang: figur manusia, kamera, teks/dimensi, bidang lantai besar
JUNK = re.compile(r'(sumele|person|people|human|man|woman|figure|orang|manusia|dimension|text|camera|section|guide|ground|floor|lantai)', re.I)
os.makedirs(out, exist_ok=True)
files = sorted(f for f in os.listdir(src) if f.lower().endswith('.skp'))
report = []
for f in files:
    name = os.path.splitext(f)[0]
    if only and name.lower() not in only: continue
    t0 = time.time(); od = os.path.join(out, slug(name)); os.makedirs(od, exist_ok=True)
    rec = {'file': f, 'name': name, 'slug': slug(name)}
    try:
        for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
        for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.collections, bpy.data.cameras):
            for x in list(coll): coll.remove(x)
        bpy.ops.import_scene.skp(filepath=os.path.join(src, f))
        removed = []
        for o in list(bpy.context.scene.objects):
            if o.type not in ('MESH', 'EMPTY') or JUNK.search(o.name) or (o.type == 'MESH' and o.data and JUNK.search(o.data.name)):
                if o.type in ('CAMERA', 'LIGHT') or JUNK.search(o.name) or (o.data and JUNK.search(getattr(o.data, 'name', ''))):
                    removed.append(o.name); bpy.data.objects.remove(o, do_unlink=True)
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        # bidang datar raksasa (lantai/latar) yang jauh lebih besar dari furnitur dibuang
        import mathutils
        def bb(o):
            pts = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
            return [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]
        for o in list(meshes):
            mn, mx = bb(o)
            if (mx[2] - mn[2]) < .005 and max(mx[0] - mn[0], mx[1] - mn[1]) > 4:
                removed.append(o.name); bpy.data.objects.remove(o, do_unlink=True); meshes.remove(o)
        if not meshes: raise RuntimeError('tidak ada mesh')
        mn = [1e9] * 3; mx = [-1e9] * 3; tris = 0
        for o in meshes:
            a, b = bb(o); mn = [min(mn[i], a[i]) for i in range(3)]; mx = [max(mx[i], b[i]) for i in range(3)]
            tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
        rec.update({'w_cm': round((mx[0] - mn[0]) * 100, 1), 'd_cm': round((mx[1] - mn[1]) * 100, 1), 'h_cm': round((mx[2] - mn[2]) * 100, 1),
                    'tris': tris, 'objects': len(meshes), 'materials': sorted({s.material.name for o in meshes for s in o.material_slots if s.material}), 'removed': removed[:40]})
        bpy.ops.export_scene.gltf(filepath=os.path.join(od, 'model.glb'), export_format='GLB', export_apply=True, use_visible=True)
        rec['ok'] = True
    except Exception as e:
        rec['ok'] = False; rec['error'] = str(e); traceback.print_exc()
    rec['sec'] = round(time.time() - t0, 1)
    json.dump(rec, open(os.path.join(od, 'info.json'), 'w'), indent=1)
    report.append(rec); print('SKP2GLB', json.dumps(rec)[:400], flush=True)
json.dump(report, open(os.path.join(out, '_report.json'), 'w'), indent=1)
print('SKP2GLB DONE', len(report))
