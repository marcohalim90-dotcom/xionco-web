# Model 3D turunan dari model katalog yang sudah ada + model prosedural sederhana (Y1, 19 Okt)
# blender -b --factory-startup --python tools/glb/derive.py -- <root situs> <tugas> [arg...]
#   cut-above <in> <out> <ymin> <z>        : buang muka kayu/logam di ujung kepala (y Blender > ymin) di atas tinggi z
#                                            (POEL tanpa headboard; kasur/bantal peraga tetap)
#   split-tables <in> <out-besar> <out-kecil> : set dua meja (ROULED) → satu file per meja (pulau dikelompokkan ke daun meja terdekat)
#   sofa-l <in3s> <out> <panjang2s> <dalam2s> : set L = sofa 3S + sofa 2S (dipotong dari 3S: sisi lengan kanan, panjang m)
#                                            diputar di depan kanan, sandaran segaris sisi kanan 3S (GUISE Set L 3+2)
#   pillows <in> <out> <besar> <kecil>       : dua bantal (m) dari satu model bantal, bersandar (CUBIX throw pillow set)
#   mirror-sheet <out> <w> <h> <tebal> <#warna>: lembar cermin akrilik berdiri sedikit bersandar
#   mirror-round <out> <diameter> <tebal> <lebar bingkai> : cermin bulat berbingkai besi hitam (MIERU)
# Material: role tetap dari extras sumber (kain diwarnai, kayu global); cermin = role 'baked' (tidak diwarnai ulang).
import bpy, bmesh, sys, os, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
root, task, A = argv[0], argv[1], argv[2:]
P = lambda p: p if os.path.isabs(p) else os.path.join(root, p)

def load(f):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=P(f))
    return [o for o in bpy.context.scene.objects if o.type == 'MESH']
def save(f, objs=None):
    os.makedirs(os.path.dirname(P(f)), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objs or [o for o in bpy.context.scene.objects if o.type == 'MESH']): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=P(f), export_format='GLB', export_extras=True, export_apply=True, use_selection=bool(objs),
                              export_image_format='WEBP', export_jpeg_quality=82)
    print('OUT', f, round(os.path.getsize(P(f)) / 1024), 'KB', flush=True)
def bake(o):   # transformasi diterapkan → koordinat dunia di data mesh
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
def bbox(objs):
    bpy.context.view_layer.update()
    vs = [o.matrix_world @ mathutils.Vector(c) for o in objs for c in o.bound_box]
    return mathutils.Vector([min(v[i] for v in vs) for i in range(3)]), mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
def role(mt): return (mt.get('role') if mt else None) or ''
def mat(name, rgb, metal, rough, role_='baked'):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    m['role'] = role_; return m
def hexrgb(h):
    h = h.lstrip('#'); s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in s)   # sRGB → linear

if task == 'cut-above':
    src, out, ymin, zc = A[0], A[1], float(A[2]), float(A[3])
    obs = load(src); n = 0
    for o in obs:
        bake(o); me = o.data; bm = bmesh.new(); bm.from_mesh(me)
        keep = {i for i, mt in enumerate(me.materials) if role(mt) not in ('wood', 'metal')}
        geom = [f for f in bm.faces if f.material_index not in keep and any(v.co.y > ymin for v in f.verts)]
        if geom:
            es = {e for f in geom for e in f.edges}; vs = {v for f in geom for v in f.verts}
            r = bmesh.ops.bisect_plane(bm, geom=list(vs) + list(es) + geom, plane_co=(0, 0, zc), plane_no=(0, 0, 1), clear_outer=True)
            dead = [f for f in bm.faces if f.material_index not in keep and all(v.co.y > ymin for v in f.verts) and all(v.co.z > zc + 1e-4 for v in f.verts)]
            bmesh.ops.delete(bm, geom=dead, context='FACES'); n += len(dead)
        bm.to_mesh(me); bm.free(); me.update()
    print('CUT sisa muka di atas', n, flush=True); save(out)

elif task == 'split-tables':
    src, outB, outS = A[0], A[1], A[2]
    obs = load(src)
    for o in obs: bake(o)
    tops = []   # daun meja: pulau kayu
    for o in obs:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
    parts = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in parts:
        mn, mx = bbox([o])
        used = {p.material_index for p in o.data.polygons}
        if any(role(o.data.materials[i]) == 'wood' for i in used if i < len(o.data.materials)) and (mx.x - mn.x) > .3: tops.append(((mn + mx) / 2, (mx.x - mn.x) / 2, mx.z))
    tops.sort(key=lambda t: -t[1]); print('DAUN', [(round(c.x, 3), round(c.y, 3), round(r, 3), round(z, 3)) for c, r, z in tops], flush=True)
    big = tops[0]; small = next(t for t in tops[1:] if math.hypot(t[0].x - big[0].x, t[0].y - big[0].y) > .05)   # daun bisa terdiri dari beberapa pulau (muka + list tepi)
    near = lambda t, c: math.hypot(t[0].x - c[0].x, t[0].y - c[0].y) < .05
    thr = max(t[2] for t in tops if near(t, small)) + .005   # rangka meja kecil berakhir di bawah daunnya; yang lebih tinggi = meja besar
    grp = {0: [], 1: []}
    for o in parts:
        mn, mx = bbox([o]); c = (mn + mx) / 2
        d = [math.hypot(c.x - t[0].x, c.y - t[0].y) - t[1] for t in (big, small)]
        # rangka kaki: pulau di bawah daun; pilih meja yang lingkarannya memuat pusat pulau (lebih tinggi menang bila dua-duanya)
        k = 0 if d[0] < d[1] else 1
        if d[0] <= .02 and d[1] <= .02: k = 0 if mx.z > thr else 1
        grp[k].append(o)
    for k, out in ((0, outB), (1, outS)):
        bpy.ops.object.select_all(action='DESELECT')
        for o in grp[k]: o.select_set(True)
        b0, b1 = bbox(grp[k]); print('MEJA', k, len(grp[k]), 'pulau', [round((b1 - b0)[i] * 100, 1) for i in range(3)], flush=True); save(out, grp[k])

elif task == 'sofa-l':
    src, out, L2, D2 = A[0], A[1], float(A[2]), float(A[3])
    obs = load(src)
    for o in obs: bake(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    s3 = bpy.context.view_layer.objects.active; mn, mx = bbox([s3])
    s2 = s3.copy(); s2.data = s3.data.copy(); bpy.context.collection.objects.link(s2)
    cut = mx.x - L2   # 2S = ujung kanan 3S sepanjang L2 (lengan kanan ikut), tepi potong menempel muka depan 3S
    bm = bmesh.new(); bm.from_mesh(s2.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(cut, 0, 0), plane_no=(-1, 0, 0), clear_outer=True)
    for v in bm.verts: v.co.y = mn.y + (v.co.y - mn.y) * D2 / (mx.y - mn.y)   # dalam 2S
    bm.to_mesh(s2.data); bm.free(); s2.data.update()
    # putar −90° di sumbu Z: lengan (+x) → depan (−y), sandaran (+y) → kanan (+x); potongan menempel depan 3S (y = mn.y)
    R = mathutils.Matrix.Rotation(-math.pi / 2, 4, 'Z')
    s2.data.transform(mathutils.Matrix.Translation((-cut, -mn.y, 0))); s2.data.transform(R)
    b0, b1 = bbox([s2]); s2.data.transform(mathutils.Matrix.Translation((mx.x - b1.x, mn.y - b1.y, 0))); s2.data.update()
    s2.name = 'guise-2s'; s3.name = 'guise-3s'
    b0, b1 = bbox([s2, s3]); print('SET L', [round((b1 - b0)[i] * 100, 1) for i in range(3)], flush=True)
    save(out)

elif task == 'pillows':
    src, out, big, sml = A[0], A[1], float(A[2]), float(A[3])
    obs = load(src)
    for o in obs: bake(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    p1 = bpy.context.view_layer.objects.active; mn, mx = bbox([p1]); w, h = mx.x - mn.x, mx.z - mn.z
    p1.data.transform(mathutils.Matrix.Translation(-mathutils.Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))))
    p2 = p1.copy(); p2.data = p1.data.copy(); bpy.context.collection.objects.link(p2)
    for o, s, tilt, pos in ((p1, big, 9, (0, .06, 0)), (p2, sml, 13, (.13, -.1, 0))):
        k = s / max(w, h); o.data.transform(mathutils.Matrix.Diagonal((k, k, k, 1)))
        o.data.transform(mathutils.Matrix.Rotation(math.radians(tilt), 4, 'X'))   # bersandar ke belakang
        o.data.transform(mathutils.Matrix.Rotation(math.radians(-8 if o is p2 else 4), 4, 'Z'))
        b0, b1 = bbox([o]); o.data.transform(mathutils.Matrix.Translation((pos[0], pos[1], -b0.z))); o.data.update()
    save(out)

elif task == 'mirror-sheet':
    out, w, h, t, col = A[0], float(A[1]), float(A[2]), float(A[3]), A[4]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object; o.name = 'acrylic-mirror'
    o.scale = (w, max(t, .002), h); bpy.ops.object.transform_apply(scale=True)
    face = mat('mirror ' + col, hexrgb(col), 1.0, .035); edge = mat('mirror edge', hexrgb('#3a3a3a'), .2, .5)
    o.data.materials.append(edge)
    # muka cermin = objek tersendiri 'xc_mirror' (extras xc_mirror = warna) → world.js memasang pantulan nyata (Reflector) di sini
    bpy.ops.mesh.primitive_plane_add(size=1, rotation=(math.pi / 2, 0, 0)); g = bpy.context.active_object; g.name = 'xc_mirror'
    g.scale = (w - .002, h - .002, 1); bpy.ops.object.transform_apply(scale=True, rotation=True)   # skala lokal XY (sebelum rotasi ke tegak)
    for v in g.data.vertices: v.co.y = -max(t, .002) / 2 - .0003
    for p in g.data.polygons:
        if p.normal.y > 0: p.flip()
    g.data.materials.append(face); g['xc_mirror'] = col
    for ob in (o, g):
        ob.data.transform(mathutils.Matrix.Translation((0, 0, h / 2)))
        ob.data.transform(mathutils.Matrix.Rotation(math.radians(-4), 4, 'X'))   # sedikit bersandar ke belakang
    b0, b1 = bbox([o, g])
    for ob in (o, g): ob.data.transform(mathutils.Matrix.Translation((0, 0, -b0.z)))
    save(out)

elif task == 'mirror-round':
    out, dia, t, fw = A[0], float(A[1]), float(A[2]), float(A[3])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    R = dia / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=R - fw + .003, depth=.004, rotation=(math.pi / 2, 0, 0)); g = bpy.context.active_object; g.name = 'mieru-glass'
    g.data.materials.append(mat('mirror glass', hexrgb('#d6d8d8'), 1.0, .03))
    g['xc_mirror'] = '#d6d8d8'   # world.js: pantulan nyata pada muka depan kaca
    # bingkai besi: cincin lebar fw (radial), tebal t
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=R, depth=t, rotation=(math.pi / 2, 0, 0)); f = bpy.context.active_object; f.name = 'mieru-frame'
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=R - fw, depth=t * 2, rotation=(math.pi / 2, 0, 0)); hole = bpy.context.active_object
    md = f.modifiers.new('cut', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = hole
    bpy.context.view_layer.objects.active = f; bpy.ops.object.modifier_apply(modifier='cut'); bpy.data.objects.remove(hole)
    f.data.materials.clear(); f.data.materials.append(mat('iron black', hexrgb('#1c1c1c'), .55, .45))   # baked: tetap hitam (role metal diganti finishing panggung)
    g.location.y = -t / 2 + .005   # kaca sedikit masuk dari muka depan bingkai
    for o in (g, f): o.location.z += R; bpy.context.view_layer.objects.active = o; o.select_set(True)
    for o in (g, f): bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    save(out)
