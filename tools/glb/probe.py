# Ukur profil channel model sofa (lebar = sumbu X setelah impor glTF: X kanan, Y atas → di Blender: X, Z atas, -Y depan)
import bpy, sys, json, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
src = argv[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
deps = bpy.context.evaluated_depsgraph_get()
mn = mathutils.Vector((1e9,) * 3); mx = -mn
for o in objs:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c); mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
print('BOUNDS', [round(v, 3) for v in mn], [round(v, 3) for v in mx])
scene = bpy.context.scene
def cast(origin, d):
    hit, loc, nor, idx, ob, m = scene.ray_cast(deps, origin, d)
    return loc if hit else None
W = mx.x - mn.x; H = mx.z - mn.z; D = mx.y - mn.y
res = {}
# sandaran: tembak dari depan (−Y → +Y? depan glTF +Z → Blender −Y) pada beberapa tinggi
for name, zf in [('back60', .78), ('back70', .88), ('seat', None)]:
    prof = []
    for i in range(401):
        x = mn.x + W * i / 400
        if zf is not None:
            p = cast(mathutils.Vector((x, mn.y - 1, mn.z + H * zf)), mathutils.Vector((0, 1, 0)))
            prof.append(round(p.y, 4) if p else None)
        else:
            p = cast(mathutils.Vector((x, mn.y + D * .35, mx.z + 1)), mathutils.Vector((0, 0, -1)))
            prof.append(round(p.z, 4) if p else None)
    res[name] = prof
res['bounds'] = [list(mn), list(mx)]
json.dump(res, open(argv[1], 'w'))
print('OK')
