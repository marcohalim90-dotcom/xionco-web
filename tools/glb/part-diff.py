# Bagian varian = selisih dua model produk (mis. VERK Laci − VERK tanpa laci = kabinet laci)
# blender -b --factory-startup --python tools/glb/part-diff.py -- <base.glb> <full.glb> <out-part.glb> [tol_m=0.004] [snap]
#   snap: daun (permukaan kayu teratas setinggi meja) bagian disejajarkan dengan daun base — tinggi atas sama
#   (bagian diskalakan tegak dari lantai) dan tepi depan/belakang sama (digeser maju/mundur)
# • full disejajarkan ke base (geser X/Y/Z terbaik dari kandidat sudut bbox, dinilai jarak titik base ke permukaan full)
# • muka full yang jauh (> tol) dari permukaan base = bagian varian → diekspor dalam KOORDINAT BASE (glTF),
#   jadi di situs cukup ditempel ke model base tanpa pergeseran (world.js XW.setPart).
import bpy, bmesh, sys, mathutils
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
base_f, full_f, out_f = a[0], a[1], a[2]
TOL = float(a[3]) if len(a) > 3 else .004
SNAP = len(a) > 4 and a[4] == 'snap'
bpy.ops.wm.read_factory_settings(use_empty=True)
def load(f):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=f)
    return [o for o in bpy.context.scene.objects if o not in before]
base = [o for o in load(base_f) if o.type == 'MESH']; full = [o for o in load(full_f) if o.type == 'MESH']
def bm_of(objs):
    bm = bmesh.new()
    for o in objs:
        t = bmesh.new(); t.from_mesh(o.data); t.transform(o.matrix_world); me = bpy.data.meshes.new('t'); t.to_mesh(me); t.free(); bm.from_mesh(me)
    return bm
bb = bm_of(base); bf = bm_of(full)
def box(bm): return (mathutils.Vector([min(v.co[i] for v in bm.verts) for i in range(3)]), mathutils.Vector([max(v.co[i] for v in bm.verts) for i in range(3)]))
(b0, b1), (f0, f1) = box(bb), box(bf)
tf = BVHTree.FromBMesh(bf)
samp = list(bb.verts)[::max(1, len(bb.verts) // 1500)]
best = None
for dx in (b0.x - f0.x, b1.x - f1.x, (b0.x + b1.x - f0.x - f1.x) / 2):
    for dy in (b0.y - f0.y, b1.y - f1.y, (b0.y + b1.y - f0.y - f1.y) / 2):
        dz = b0.z - f0.z
        off = mathutils.Vector((dx, dy, dz)); err = 0
        for v in samp:
            h = tf.find_nearest(v.co - off); err += min(h[3], .05) if h[0] else .05
        if best is None or err < best[0]: best = (err / len(samp), off)
off = best[1]
print('SEJAJAR geser', [round(x, 4) for x in off], 'galat rata-rata %.4f m' % best[0], flush=True)
tb = BVHTree.FromBMesh(bb)
# tandai muka full yang bukan bagian base, geser full ke koordinat base
for o in full: o.matrix_world = mathutils.Matrix.Translation(off) @ o.matrix_world
bpy.context.view_layer.update()
keep = 0
for o in full:
    bm = bmesh.new(); bm.from_mesh(o.data); mw = o.matrix_world
    drop = []
    for fc in bm.faces:
        c = mw @ fc.calc_center_median(); h = tb.find_nearest(c)
        if h[0] is not None and h[3] <= TOL: drop.append(fc)
    bmesh.ops.delete(bm, geom=drop, context='FACES'); keep += len(bm.faces)
    bm.to_mesh(o.data); bm.free()
def wood_top(objs, zmax=1.0):   # daun meja: muka kayu menghadap atas, setinggi meja (< zmax)
    rows = []
    for o in objs:
        mw = o.matrix_world
        for p in o.data.polygons:
            mt = o.data.materials[p.material_index] if o.data.materials else None
            if not mt or mt.get('role') != 'wood' or (mw.to_3x3() @ p.normal).z < .9: continue
            c = mw @ p.center
            if .4 < c.z < zmax: rows.append((c.z, [mw @ o.data.vertices[v].co for v in p.vertices]))
    if not rows: return None
    z = max(r[0] for r in rows); vs = [v for r in rows if abs(r[0] - z) < .004 for v in r[1]]
    return z, min(v.y for v in vs), max(v.y for v in vs)
if SNAP:
    bt, pt = wood_top(base), wood_top(full)
    if bt and pt:
        k = bt[0] / pt[0]; dy = bt[1] - pt[1]
        for o in full: o.matrix_world = mathutils.Matrix.Translation((0, dy, 0)) @ mathutils.Matrix.Scale(k, 4, (0, 0, 1)) @ o.matrix_world
        bpy.context.view_layer.update()
        print('SNAP daun: tinggi %.4f → %.4f (skala tegak %.4f), geser dalam %.4f m' % (pt[0], bt[0], k, dy), flush=True)
for o in base: bpy.data.objects.remove(o, do_unlink=True)
for o in list(bpy.context.scene.objects):
    if o.type == 'MESH' and not o.data.polygons: bpy.data.objects.remove(o, do_unlink=True)
print('BAGIAN', keep, 'muka', flush=True)
bpy.ops.export_scene.gltf(filepath=out_f, export_format='GLB', export_apply=True, export_extras=True)
print('PART', out_f)
