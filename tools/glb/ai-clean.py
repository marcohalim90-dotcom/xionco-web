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
# WOODSPLIT (argumen ke-6): {"wood": {"#hex": "gelap"|"terang"|"natural"}, "keep": ["#hex", ...]}
# Muka yang warna teksturnya (di titik tengah UV) paling dekat ke kluster kayu dipindah ke material kayu berlabel kelas
# (extras xc_wood) dengan UV kotak dalam meter → di situs ikut pengaturan global Developer Settings › Kayu koleksi,
# sama seperti komponen kayu model SketchUp. Dua putaran penghalusan tetangga agar tidak berbintik.
SPLIT = json.loads(argv[5]) if len(argv) > 5 and argv[5] else None
if SPLIT and SPLIT.get('wood'):
    import numpy as np, bmesh
    names = list(SPLIT['wood'].keys()) + list(SPLIT.get('keep', []))
    lin = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32) ** 2.2
    CEN = np.stack([lin(h) for h in names]); CLS = [SPLIT['wood'].get(h) for h in names]   # None = bukan kayu
    mats = {}
    def woodmat(cls):
        if cls in mats: return mats[cls]
        m = bpy.data.materials.new('kayu ' + cls + ' (AI)'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
        h = {'gelap': (.40, .24, .18), 'terang': (.80, .65, .48), 'natural': (.68, .46, .22)}.get(cls, (.5, .35, .25))
        b.inputs['Base Color'].default_value = tuple(v ** 2.2 for v in h) + (1,); b.inputs['Metallic'].default_value = 0; b.inputs['Roughness'].default_value = .5
        m['xc_wood'] = cls; m['role'] = 'wood'; mats[cls] = m; return m
    for o in ms:
        me = o.data
        if not me.uv_layers or not me.materials: continue
        img = None
        for m in me.materials:
            if not m or not m.use_nodes: continue
            b = m.node_tree.nodes.get('Principled BSDF')
            if b and b.inputs['Base Color'].is_linked and b.inputs['Base Color'].links[0].from_node.type == 'TEX_IMAGE': img = b.inputs['Base Color'].links[0].from_node.image
        if not img: continue
        W, H = img.size; px = np.empty(W * H * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(H, W, 4)[:, :, :3]
        uv = me.uv_layers.active.data; nf = len(me.polygons); lab = [None] * nf
        for p in me.polygons:
            u = sum(uv[i].uv[0] for i in p.loop_indices) / p.loop_total; v = sum(uv[i].uv[1] for i in p.loop_indices) / p.loop_total
            x = int((u % 1) * (W - 1)); y = int((v % 1) * (H - 1))
            c = px[max(0, y - 1):y + 2, max(0, x - 1):x + 2].reshape(-1, 3).mean(0)
            lab[p.index] = CLS[int(((CEN - c) ** 2).sum(1).argmin())]
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        nb = [[g.index for e in f.edges for g in e.link_faces if g.index != f.index] for f in bm.faces]; bm.free()
        for _ in range(2):   # penghalusan: ikut mayoritas tetangga (sambungan atlas / bintik)
            new = lab[:]
            for i in range(nf):
                if not nb[i]: continue
                cnt = {}
                for j in nb[i]: cnt[lab[j]] = cnt.get(lab[j], 0) + 1
                best = max(cnt, key=cnt.get)
                if best != lab[i] and cnt[best] >= .66 * len(nb[i]): new[i] = best
            lab = new
        idx = {}
        for i, cls in enumerate(lab):
            if not cls: continue
            m = woodmat(cls)
            if m.name not in [x.name for x in me.materials if x]: me.materials.append(m)
            idx.setdefault(cls, [k for k, x in enumerate(me.materials) if x and x.name == m.name][0])
            me.polygons[i].material_index = idx[cls]
        n = sum(1 for c in lab if c)
        if n:   # UV kotak 1 m HANYA untuk muka kayu (muka lain tetap memakai UV atlas aslinya)
            mw = o.matrix_world
            for p in me.polygons:
                if not lab[p.index]: continue
                nrm = (mw.to_3x3() @ p.normal); ax = max(range(3), key=lambda k: abs(nrm[k]))
                a, b2 = [k for k in range(3) if k != ax]
                for li in p.loop_indices:
                    co = mw @ me.vertices[me.loops[li].vertex_index].co
                    uv[li].uv = (co[a], co[b2])
        print('WOODSPLIT', o.name, n, 'dari', nf, 'muka kayu', {c: lab.count(c) for c in set(lab) if c}, flush=True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True, export_image_format='WEBP', export_extras=True)
print('AICLEAN', src, '->', dst, sum(len(o.data.polygons) for o in ms))
