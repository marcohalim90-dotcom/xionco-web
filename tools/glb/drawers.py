# Laci tarik untuk model SKP yang lacinya hanya muka (mis. kabinet laci VERK): muka + pegangan dipisah jadi objek xcm_<id>
# (extras xc_motion, maju lurus), diberi kotak laci (sisi, punggung, alas) dan panel muka badan di baliknya dibuka.
#   blender -b --factory-startup -P tools/glb/drawers.py -- <root situs> [file ...]
# Konfigurasi data/source/drawers.json: { "<glb di assets>": {"src": "<glb sumber sebelum serat>", "x": [x0, x1], "y": [muka0, muka1],
#   "depth": kedalaman badan dari muka, "pull": tarik (m), "z": [[z0, z1] per laci, atas → bawah]} }  — meter dari sudut min bbox (Blender).
# Urutan sesudahnya: grain-all.js (serat + kompres).
import bpy, bmesh, sys, os, json, mathutils
V = mathutils.Vector
argv = sys.argv[sys.argv.index('--') + 1:]
ROOT = os.path.abspath(argv[0]); only = argv[1:]
CFG = json.load(open(os.path.join(ROOT, 'data', 'source', 'drawers.json'), encoding='utf8'))

def lin(h): h = h.lstrip('#'); return tuple(((int(h[i:i + 2], 16) / 255 + .055) / 1.055) ** 2.4 for i in (0, 2, 4))
def inmat():
    m = bpy.data.materials.get('dalam laci') or bpy.data.materials.new('dalam laci'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*lin('#2c2a28'), 1); b.inputs['Roughness'].default_value = .75
    m['role'] = 'baked'; return m
def boxmesh(bm, x0, x1, y0, y1, z0, z1):
    r = bmesh.ops.create_cube(bm, size=1)
    for v in r['verts']: v.co = V(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))

for rel, c in CFG.items():
    if rel.startswith('_') or (only and not any(o in rel for o in only)): continue
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, c['src']))
    sc = bpy.context.scene; bpy.context.view_layer.update()
    ms = [o for o in sc.objects if o.type == 'MESH']
    mn = V((1e9,) * 3)
    for o in ms:
        for p in o.bound_box: mn = V(map(min, mn, o.matrix_world @ V(p)))
    X0, X1 = c['x']; Y0, Y1 = c['y']; e = .002; zs = c['z']
    inb = lambda p, x0, x1, y0, y1, z0, z1: x0 - e <= p.x <= x1 + e and y0 - e <= p.y <= y1 + e and z0 - e <= p.z <= z1 + e
    for o in ms: o.data.transform(o.matrix_world); o.matrix_world = mathutils.Matrix.Identity(4)
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    bm = bmesh.new(); bm.from_mesh(body.data); bm.faces.ensure_lookup_table()
    rel_ = lambda v: v.co - mn
    # panel muka badan di balik laci (satu bidang setinggi semua laci) → dibuka agar rongga laci terlihat saat ditarik
    zA, zB = min(z[0] for z in zs), max(z[1] for z in zs)
    front = [f for f in bm.faces if all(inb(rel_(v), X0, X1, Y1 - .002, Y1 + .003, zA, zB) for v in f.verts) and abs(f.normal.y) > .9
             and (max(rel_(v).z for v in f.verts) - min(rel_(v).z for v in f.verts)) > .9 * (zB - zA)]
    groups = []
    for z0, z1 in zs:
        groups.append([f for f in bm.faces if f not in front and all(inb(rel_(v), X0, X1, Y0 - .01, Y1 + .0005, z0, z1) for v in f.verts)])
    bmesh.ops.delete(bm, geom=front, context='FACES')
    newbms = []
    for g in groups:   # salin muka laci ke mesh sendiri lalu hapus dari badan
        nb = bmesh.new(); vm = {}
        for f in g:
            vs = [vm.setdefault(v.index, nb.verts.new(v.co)) for v in f.verts]
            nf = nb.faces.new(vs); nf.material_index = f.material_index; nf.smooth = f.smooth
        newbms.append(nb)
    bmesh.ops.delete(bm, geom=[f for g in groups for f in g], context='FACES')
    bm.to_mesh(body.data); bm.free(); body.data.update()
    im = inmat(); D = c['depth']; pull = c['pull']
    for i, ((z0, z1), nb) in enumerate(zip(zs, newbms)):
        k = len(nb.verts)
        t = .012; xa, xb = mn.x + X0 + .02, mn.x + X1 - .02; ya, yb = mn.y + Y1, mn.y + Y1 + D - .04; za, zb = mn.z + z0 + .015, mn.z + z1 - .035
        for bx in ((xa, xa + t, ya, yb, za, zb), (xb - t, xb, ya, yb, za, zb), (xa + t, xb - t, yb - t, yb, za, zb), (xa + t, xb - t, ya, yb - t, za, za + .008)): boxmesh(nb, *bx)
        me = bpy.data.meshes.new('laci'); nb.to_mesh(me); nb.free()
        for m in body.data.materials: me.materials.append(m)
        me.materials.append(im)
        for p in me.polygons:
            if p.index >= len(me.polygons) - 24: p.material_index = len(me.materials) - 1
        o = bpy.data.objects.new('xcm_laci%d' % (i + 1), me); sc.collection.objects.link(o)
        piv = V((mn.x + (X0 + X1) / 2, mn.y + Y1, mn.z + z0))
        me.transform(mathutils.Matrix.Translation(-piv)); o.location = piv
        o['xc_motion'] = {'id': 'laci%d' % (i + 1), 'move': [0, 0, pull], 'dur': .8 + .06 * i, 'order': 2}
        print('[laci]', rel, o.name, len(me.polygons), 'muka', flush=True)
    print('[laci]', rel, 'panel muka dibuka', len(front), flush=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, rel), export_format='GLB', export_extras=True, export_image_format='AUTO')
