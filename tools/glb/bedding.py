# Ganti sprei & bantal ranjang katalog yang kaku/rata dengan tempat tidur nyata (selimut menjuntai + bantal empuk)
# dari model "Queen-bed" (lugher3d.com, CC-BY, Objaverse) — data/source/render-lib/sketchfab/bed_queen (lokal).
#   blender -b --factory-startup -P tools/glb/bedding.py -- <root situs> [file ...]
# Konfigurasi data/source/bedding.json: { "<path glb>": {"mat": ["nama material tempat tidur lama", ...]} }
# Per file: muka tempat tidur lama dihapus → kasur baru (kotak bertepi bulat) setinggi kasur lama + selimut & bantal
# dipetakan ke tapak kasur (lebar/panjang), bantal di sisi kepala (dari letak bantal lama). Linen putih (role baked).
import bpy, bmesh, sys, os, json, math
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
ROOT = os.path.abspath(argv[0]); only = argv[1:]
CFG = json.load(open(os.path.join(ROOT, 'data', 'source', 'bedding.json'), encoding='utf8'))
SRC = os.path.join(ROOT, 'data', 'source', 'render-lib', 'sketchfab', 'bed_queen', 'bed_queen.glb')
PILLOWS = ['queen_bed4', 'queen_bed6']; DUVET = 'polySurface285047'   # 2 bantal besar (foto toko: 2 bantal); 1 bantal bila kasur < 110 cm

def lin(h): h = h.lstrip('#'); return tuple(((int(h[i:i + 2], 16) / 255 + .055) / 1.055) ** 2.4 for i in (0, 2, 4))
def mat(name, hx, rough):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(hx), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = 0
    m['role'] = 'baked'; return m

for rel, conf in CFG.items():
    if rel.startswith('_') or (only and not any(o in rel for o in only)): continue
    f = os.path.join(ROOT, rel)
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
    sc = bpy.context.scene; bpy.context.view_layer.update()
    ms = [o for o in sc.objects if o.type == 'MESH']
    # ---- 1. tempat tidur lama: tapak, tinggi kasur, sisi kepala; lalu dihapus
    pts, ups, pil = [], {}, []
    for o in ms:
        mw = o.matrix_world; idx = {i for i, m in enumerate(o.data.materials) if m and m.name in conf['mat']}
        if not idx: continue
        for p in o.data.polygons:
            if p.material_index not in idx: continue
            vs = [mw @ o.data.vertices[v].co for v in p.vertices]; pts += vs
            n = (mw.to_3x3() @ p.normal).normalized(); c = sum(vs, Vector()) / len(vs)
            if n.z > .9: ups[round(c.z, 2)] = ups.get(round(c.z, 2), 0) + p.area
    if not pts: print('[sprei] lewati (material tidak ada)', rel, flush=True); continue
    X0, X1 = min(p.x for p in pts), max(p.x for p in pts); Y0, Y1 = min(p.y for p in pts), max(p.y for p in pts); Z0 = min(p.z for p in pts)
    zt = max(ups, key=ups.get)                                              # permukaan datar terluas = atas kasur
    for o in ms:
        mw = o.matrix_world; idx = {i for i, m in enumerate(o.data.materials) if m and m.name in conf['mat']}
        if not idx: continue
        for p in o.data.polygons:
            if p.material_index in idx:
                c = mw @ p.center
                if c.z > zt + .04: pil.append(c)
    yc = (Y0 + Y1) / 2
    head = (1 if sum(c.y for c in pil) / len(pil) > yc else -1) if pil else (conf.get('head', 1))
    for o in ms:
        idx = {i for i, m in enumerate(o.data.materials) if m and m.name in conf['mat']}
        if not idx: continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[p for p in bm.faces if p.material_index in idx], context='FACES')
        bm.to_mesh(o.data); bm.free(); o.data.update()
    W, Lb = X1 - X0, Y1 - Y0; Lb_ = Lb
    # sisi luar rangka di bawah atas kasur (tanpa sandaran kepala): selimut menjuntai DI LUAR rangka, bukan tertutup dindingnya
    fx0, fx1, fy0, fy1 = X0, X1, Y0, Y1
    for o in ms:
        mw = o.matrix_world
        for v in o.data.vertices:
            c = mw @ v.co
            if c.z <= zt + .02 and X0 - .15 < c.x < X1 + .15 and Y0 - .15 < c.y < Y1 + .15:
                fx0, fx1, fy0, fy1 = min(fx0, c.x), max(fx1, c.x), min(fy0, c.y), max(fy1, c.y)
    # bibir rangka (tertinggi di bawah atas kasur, selain sisi kepala)
    zf = Z0
    for o in ms:
        mw = o.matrix_world
        for v in o.data.vertices:
            c = mw @ v.co
            if c.z <= zt and X0 - .15 < c.x < X1 + .15 and Y0 - .15 < c.y < Y1 + .15 and abs(c.y - (Y1 if head == 1 else Y0)) > .3 * Lb_: zf = max(zf, c.z)
    if conf.get('drape', 'frame') == 'frame':      # selimut menjuntai di luar rangka (POEL: rangka rendah, foto: selimut menutup sisi kasur)
        DX0, DX1 = fx0 - .012, fx1 + .012
        DY0, DY1 = (Y0, fy1 + .012) if head == -1 else (fy0 - .012, Y1)      # kaki ikut rangka, kepala tetap di bantal
    else:                                          # 'mattress' (SOMNO): selimut selebar kasur, juntaian tertahan di bibir rangka → rangka berlapis tetap terlihat
        DX0, DX1, DY0, DY1 = X0, X1, Y0, Y1
    # ---- 2. kasur baru (seprai putih) dari alas sampai atas kasur
    sheet = mat('seprai putih', '#efede8', .9); duv = mat('selimut ' + conf.get('duvet', '#f3f1ec'), conf.get('duvet', '#f3f1ec'), .88); pmat = mat('bantal putih', '#f6f4ef', .8)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    zk = zt - .05                                                           # atas kasur sedikit di bawah selimut (tidak tembus)
    for v in bm.verts: v.co = Vector(((X0 + X1) / 2 + v.co.x * (W - .03), yc + v.co.y * (Lb - .03), (Z0 + zk) / 2 + v.co.z * (zk - Z0)))
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(.035, (zk - Z0) * .3), segments=4, affect='EDGES')
    me = bpy.data.meshes.new('kasur'); bm.to_mesh(me); bm.free(); ko = bpy.data.objects.new('kasur', me); sc.collection.objects.link(ko); me.materials.append(sheet)
    for p in me.polygons: p.use_smooth = True
    # ---- 3. selimut & bantal Queen-bed: panjang sumbu X sumber (kepala di −X) → sumbu Y kita (kepala = head)
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=SRC); new = [o for o in bpy.data.objects if o not in before]
    pk = PILLOWS if W >= 1.1 else PILLOWS[:1]
    keep = [o for o in new if o.type == 'MESH' and (DUVET in o.name or any(k in o.name for k in pk))]
    bpy.context.view_layer.update()
    for o in keep: mwc = o.matrix_world.copy(); o.parent = None; o.matrix_world = mwc   # lepas dari induk (skala/rotasi tetap) sebelum induk dihapus
    for o in new:
        if o not in keep: bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()
    dv = [o for o in keep if DUVET in o.name][0]
    dvs = [dv.matrix_world @ v.co for v in dv.data.vertices]; ztop = max(v.z for v in dvs)
    top = [v for v in dvs if v.z > ztop - .12 * (ztop - min(v.z for v in dvs))]   # bidang atas selimut ≈ tapak kasur sumber
    sx0, sx1 = min(v.x for v in top), max(v.x for v in top); sy0, sy1 = min(v.y for v in top), max(v.y for v in top)
    kx = (DY1 - DY0) / (sx1 - sx0); ky = (DX1 - DX0) / (sy1 - sy0); kz = (kx + ky) / 2
    # matriks: x_src → y_kita (−x_src = kepala), y_src → x_kita, z skala rata; mesh.transform ikut memutar normal
    A = Matrix(((0, ky, 0, 0), (-head * kx, 0, 0, 0), (0, 0, kz, 0), (0, 0, 0, 1)))
    M = Matrix.Translation(Vector(((DX0 + DX1) / 2, (DY0 + DY1) / 2, zt + .012))) @ A @ Matrix.Translation(-Vector(((sx0 + sx1) / 2, (sy0 + sy1) / 2, ztop)))
    for o in keep:
        me2 = o.data.copy(); me2.transform(M @ o.matrix_world)
        if M.to_3x3().determinant() < 0: me2.flip_normals()   # pemetaan memantulkan → normal dibalik agar menghadap luar
        o.data = me2; o.matrix_world = Matrix.Identity(4)
        if DUVET in o.name and conf.get('drape') == 'mattress' and zf > Z0 + .03:   # juntaian berhenti di bibir rangka (terlipat sedikit)
            for v in me2.vertices:
                if v.co.z < zf + .015: v.co.z = zf + .015 + (zf + .015 - v.co.z) * .05
        if DUVET not in o.name:   # bantal: lebar ikut skala panjang (ukuran bantal nyata, tidak melar di kasur lebar)
            cx = sum(v.co.x for v in me2.vertices) / len(me2.vertices)
            for v in me2.vertices: v.co.x = cx + (v.co.x - cx) * kx / ky
            if len(pk) == 1:
                for v in me2.vertices: v.co.x += (DX0 + DX1) / 2 - cx
        me2.materials.clear(); me2.materials.append(duv if DUVET in o.name else pmat)
        for p in me2.polygons: p.use_smooth = True
        # peringanan: bantal 47 rb muka → ±9 rb; selimut ±28 rb (tepi juntai tetap rapi)
        r = .2 if DUVET not in o.name else .8
        md = o.modifiers.new('ringan', 'DECIMATE'); md.ratio = r
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='ringan')
        o.name = 'selimut' if DUVET in o.name else 'bantal tidur'
    print('[sprei]', rel, 'tapak %.2f x %.2f m, selimut %.2f x %.2f m, kasur %.2f..%.2f, kepala %+d, k=(%.3f, %.3f)' % (W, Lb, DX1 - DX0, DY1 - DY0, Z0, zt, head, kx, ky), flush=True)
    bpy.ops.export_scene.gltf(filepath=f, export_format='GLB', export_extras=True, export_image_format='AUTO', export_apply=True)
