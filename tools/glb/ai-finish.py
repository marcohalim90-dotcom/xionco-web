# Rapikan GLB hasil 3D AI (Tripo via fal.ai) untuk situs — dipanggil tools/ai3d.js
# blender -b --factory-startup --python tools/glb/ai-finish.py -- <mentah.glb> <keluar.glb> "<W × D × H cm>"
# - material diberi role 'baked' → world.js tidak mewarnai ulang tekstur foto
# - opaque, skala ke ukuran produk (seragam, pakai sisi horizontal terpanjang), alas di lantai, tengah di 0
# - diringankan bila > MAXTRI segitiga, tekstur maks 2048 px, WEBP
import bpy, sys, os, re, json, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
src, dst, dims = argv[0], argv[1], (argv[2] if len(argv) > 2 else '')
flags = (argv[3] if len(argv) > 3 else '').split(',')
# turn-90: depan model menghadap +X (Tripo P1) → putar agar depan menghadap kamera situs (-Y Blender = +Z glTF)
# wide: furnitur memanjang (sofa, meja, ranjang, kabinet) yang sisi panjangnya ke belakang → putar sama
MAXTRI = 60000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if not ms: raise SystemExit('Error: GLB tanpa mesh')

for m in bpy.data.materials:
    m['role'] = 'baked'
    b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    if not b: continue
    for l in list(b.inputs['Alpha'].links): m.node_tree.links.remove(l)
    b.inputs['Alpha'].default_value = 1.0
    if hasattr(m, 'blend_method'): m.blend_method = 'OPAQUE'

bpy.ops.object.select_all(action='DESELECT')
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
bpy.ops.object.make_single_user(object=True, obdata=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def bounds():
    mn = mathutils.Vector((1e9,) * 3); mx = -mn
    for o in ms:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co; mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
    return mn, mx

mn, mx = bounds(); sz = mx - mn
if 'turn-90' in flags or ('wide' in flags and sz.y > sz.x * 1.15):
    for o in ms: o.data.transform(mathutils.Matrix.Rotation(-1.5707963, 4, 'Z'))   # glTF diimpor ber-quaternion → putar data mesh langsung
    mn, mx = bounds(); sz = mx - mn
nums = [float(x.replace(',', '.')) for x in re.findall(r'\d+(?:[.,]\d+)?', dims)]
k = 1.0
if len(nums) >= 2 and max(sz.x, sz.y) > 0:
    k = (max(nums[0], nums[1]) / 100) / max(sz.x, sz.y)       # Blender Z-atas: X/Y = lebar/dalam
elif len(nums) == 1 and max(sz.x, sz.y) > 0:
    k = (nums[0] / 100) / max(sz.x, sz.y)                     # perkiraan lebar (cm) bila ukuran produk belum ada
elif max(sz) > 12: k = .01 if max(sz) < 1200 else .001          # tanpa ukuran: anggap auto_size Tripo (meter)
c = (mn + mx) / 2
for o in ms:
    o.location = ((o.location.x - c.x) * k, (o.location.y - c.y) * k, (o.location.z - mn.z) * k); o.scale *= k
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in ms)
if tris > MAXTRI:
    r = MAXTRI / tris
    for o in ms:
        md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = r; md.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dec')
tris2 = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in ms)
for im in bpy.data.images:
    if im.size[0] > 2048 or im.size[1] > 2048:
        f = 2048 / max(im.size); im.scale(int(im.size[0] * f), int(im.size[1] * f))

os.makedirs(os.path.dirname(dst), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_extras=True, export_apply=True,
                          export_image_format='WEBP', export_jpeg_quality=85)
mn, mx = bounds()
print('AIFIN ' + json.dumps({'tris': tris, 'tris_out': tris2, 'scale': round(k, 5),
                             'size_cm': [round((mx - mn)[i] * 100, 1) for i in (0, 1, 2)], 'kb': round(os.path.getsize(dst) / 1024)}), flush=True)
