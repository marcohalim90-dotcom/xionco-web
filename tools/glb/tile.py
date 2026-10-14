# Potong model sofa/bench bermodul channel menjadi 3 bagian untuk disusun ulang di situs:
#   endL  = sisi kiri sampai jahitan cutL
#   tile  = satu lajur channel [cutL, cutL + pitch] (diulang n kali)
#   endR  = sisi kanan mulai jahitan cutR
# Potongan tepat di lembah jahitan → sambungan tidak terlihat.
# Pakai: blender -b --python tools/glb/tile.py -- in.glb out.glb pitch cutL cutR
#   contoh KYRIOS: -- assets/items/kyrios/model.glb assets/items/kyrios/model-tiles.glb 0.176 -0.352 0.352
import bpy, bmesh, sys
argv = sys.argv[sys.argv.index('--') + 1:]
src, dst, pitch, cutL, cutR = argv[0], argv[1], float(argv[2]), float(argv[3]), float(argv[4])
n0 = round((cutR - cutL) / pitch)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
# terapkan transformasi supaya potongan di ruang dunia
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def cut(obj, lo, hi):
    """sisakan bagian lo <= x <= hi (None = tak terbatas)"""
    bm = bmesh.new(); bm.from_mesh(obj.data)
    if lo is not None:
        g = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=g, plane_co=(lo, 0, 0), plane_no=(1, 0, 0), clear_inner=True)
    if hi is not None:
        g = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=g, plane_co=(hi, 0, 0), plane_no=(1, 0, 0), clear_outer=True)
    bm.to_mesh(obj.data); bm.free()

parts = {'endL': (None, cutL), 'tile': (cutL, cutL + pitch), 'endR': (cutR, None)}
roots = {}
for key in parts:
    root = bpy.data.objects.new(key, None); bpy.context.scene.collection.objects.link(root); roots[key] = root
for o in meshes:
    for key, (lo, hi) in parts.items():
        c = o.copy(); c.data = o.data.copy(); c.name = key + '__' + o.name
        bpy.context.scene.collection.objects.link(c)
        cut(c, lo, hi)
        c.parent = roots[key]
    bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene
sc['xionco_tile'] = {'axis': 'x', 'pitch': pitch, 'cutL': cutL, 'cutR': cutR, 'n0': n0}
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_extras=True, export_apply=True)
print('TILES OK', dst, 'pitch', pitch, 'n0', n0)
