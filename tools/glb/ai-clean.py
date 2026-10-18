# Bersihkan model 3D AI (Tripo) untuk situs: permukaan bergelombang/"sompel" dihaluskan, material bukan logam.
# blender -b --factory-startup --python tools/glb/ai-clean.py -- <in.glb> <out.glb> [smooth=0] [iter=0] [recolor json]
#   • satukan titik kembar → Laplacian smooth (volume dijaga, tepi tajam tetap: hanya muka yang hampir sejajar)
#   • normal halus dengan batas sudut 40° (tepi kotak tetap tegas)
#   • material: metallic 0 (Tripo menulis 1 → kain/kayu tampak seperti logam kotor), peta metal/roughness dilepas,
#     roughness .78, normal map dilemahkan (.45) agar kerutan palsu tidak menonjol
import bpy, bmesh, sys, math, json
argv = sys.argv[sys.argv.index('--') + 1:]
src, dst = argv[0], argv[1]
LAM = float(argv[2]) if len(argv) > 2 else 0   # smoothing bawaan mati: uji 17 Okt tidak membantu, kaki kawat menipis
IT = int(argv[3]) if len(argv) > 3 else 0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in ms:
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0004)
    bm.to_mesh(o.data); bm.free()
    if LAM > 0 and IT > 0:
        md = o.modifiers.new('ls', 'LAPLACIANSMOOTH'); md.lambda_factor = LAM; md.lambda_border = 0; md.iterations = IT
        md.use_volume_preserve = True; md.use_normalized = True
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='ls')
    for p in o.data.polygons: p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = o; bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    except Exception:
        pass
for m in bpy.data.materials:
    if not m.use_nodes: continue
    b = m.node_tree.nodes.get('Principled BSDF')
    if not b: continue
    for k in ('Metallic', 'Roughness'):
        for l in list(b.inputs[k].links): m.node_tree.links.remove(l)
    b.inputs['Metallic'].default_value = 0.0
    b.inputs['Roughness'].default_value = .78
    nm = b.inputs['Normal'].links[0].from_node if b.inputs['Normal'].is_linked else None
    if nm and nm.type == 'NORMAL_MAP': nm.inputs['Strength'].default_value = .45
# warna per bagian mengikuti foto produk: recolor = [[dari, ke], ...] (hex sRGB). Pasangan dari == ke = jangkar (warna itu tetap).
# Tiap piksel ditimbang ke warna "dari" terdekat (lunak, σ .09 linear) lalu dikalikan rasio ke/dari → serat & bayangan tekstur tetap.
RECOLOR = json.loads(argv[4]) if len(argv) > 4 and argv[4] else []
if RECOLOR:
    import numpy as np
    lin = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32) ** 2.2
    F = np.stack([lin(a) for a, b in RECOLOR]); K = np.stack([lin(b) for a, b in RECOLOR]) / np.maximum(F, 1e-3)
    for im in [i for i in bpy.data.images if i.size[0] >= 256 and i.colorspace_settings.name != 'Non-Color']:
        px = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4)
        d = ((px[:, None, :3] - F[None]) ** 2).sum(2); w = np.exp(-d / (2 * .09 ** 2)); w /= np.maximum(w.sum(1, keepdims=True), 1e-6)
        px[:, :3] = np.clip(px[:, :3] * (w @ K), 0, 1)
        im.pixels.foreach_set(px.ravel()); im.update(); im.pack()
        print('RECOLOR', im.name, len(RECOLOR), flush=True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True, export_image_format='WEBP')
print('AICLEAN', src, '->', dst, sum(len(o.data.polygons) for o in ms))
