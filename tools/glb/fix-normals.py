# Seragamkan arah muka model SketchUp yang sudah terpasang (normal sebagian terbalik → pita warna beda di panggung, mis. lengan GUISE 1 Seater)
# blender -b --factory-startup --python tools/glb/fix-normals.py -- assets/items/<id>/model.glb [keluaran.glb] [--pillow]
#   → satukan titik, arahkan semua muka ke luar (recalc_face_normals), normal halus dihitung ulang (sudut sama dengan finish.py),
#     ekspor GLB (extras peran material tetap). Setelahnya: node tools/compress/compress.js <file.glb>
#   --pillow: pulau kain yang menjulang di atas dudukan (bantal sandaran CUBIX) dipindah ke material kain sendiri
#             (extras part 'pillow') → warna bantal bisa dipilih terpisah di situs (world.js tintModel)
import bpy, bmesh, sys, math
argv = sys.argv[sys.argv.index('--') + 1:]
PILLOW = '--pillow' in argv; argv = [a for a in argv if not a.startswith('--')]
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

for o in ms:
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0002)
    nf = len(bm.faces)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
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
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_extras=True, export_apply=True, export_image_format='WEBP', export_jpeg_quality=82)
print('OK', dst)
