# Rapikan GLB hasil SKP untuk situs: peran material (kain/kayu/besi/kaca), skala, ringankan, pasang ke assets/items/<id>/
# blender -b --factory-startup --python tools/glb/finish.py -- <folder skp-glb> <map.json> <root situs>
#   map.json: { "<slug skp>": "<id produk>" | {"id": "...", "variant": "<label varian>"} }
# Peran disimpan sebagai extras material (role) → world.js hanya mewarnai 'fabric' & mengganti finishing 'metal'.
import bpy, bmesh, sys, os, json, re, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
src, mapf, root = argv[0], argv[1], argv[2]
MAP = json.load(open(mapf))
MAXTRI = 60000
WOOD = re.compile(r'(sungkai|kayu|mindi|wood|veneer|kyokai|oak|walnut|teak|jati)', re.I)
GLASS = re.compile(r'(glass|kaca|translucent)', re.I)
FABRIC = re.compile(r'(midgrey|kulit|leather|fabric|velvet|boucle|orycto|green|red|yellow|^\*|color m00|pillow)', re.I)

def role(m):
    n = m.name
    if GLASS.search(n): return 'glass'
    if WOOD.search(n): return 'wood'
    if FABRIC.search(n): return 'fabric'
    bsdf = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    tex = bsdf and bsdf.inputs['Base Color'].is_linked
    if bsdf and not tex:
        c = bsdf.inputs['Base Color'].default_value
        lum = .3 * c[0] + .59 * c[1] + .11 * c[2]
        if lum < .08: return 'metal'          # besi hitam (SketchUp <auto>)
        if 'gold' in n.lower(): return 'metal'
        return 'paint'
    if 'gold' in n.lower(): return 'metal'
    return 'fabric'

def mirror_mat(ms, matname):
    """Lengkapi detail simetris yang tertinggal di SKP (mis. piping hanya di satu lengan):
    muka ber-material matname yang tak punya pasangan cermin (sumbu X, tengah bbox) diduplikasi ke sisi seberang."""
    from mathutils import kdtree
    mn = min(min((o.matrix_world @ mathutils.Vector(c)).x for c in o.bound_box) for o in ms)
    mx = max(max((o.matrix_world @ mathutils.Vector(c)).x for c in o.bound_box) for o in ms)
    cx = (mn + mx) / 2; added = 0
    for o in ms:
        idx = [i for i, m in enumerate(o.data.materials) if m and m.name == matname]
        if not idx: continue
        bm = bmesh.new(); bm.from_mesh(o.data); cl = cx - o.matrix_world.translation.x   # rotasi/skala sudah diterapkan
        fs = [f for f in bm.faces if f.material_index in idx]
        kd = kdtree.KDTree(len(fs))
        for i, f in enumerate(fs): kd.insert(f.calc_center_median(), i)
        kd.balance()
        lone = []
        for f in fs:
            c = f.calc_center_median(); m = mathutils.Vector((2 * cl - c.x, c.y, c.z))
            if abs(c.x - cl) < .01: continue
            if kd.find(m)[2] > .004: lone.append(f)
        if lone:
            d = bmesh.ops.duplicate(bm, geom=lone)
            nf = [g for g in d['geom'] if isinstance(g, bmesh.types.BMFace)]
            for v in [g for g in d['geom'] if isinstance(g, bmesh.types.BMVert)]: v.co.x = 2 * cl - v.co.x
            bmesh.ops.reverse_faces(bm, faces=nf); added += len(nf)
        bm.to_mesh(o.data); bm.free(); o.data.update()
    print('MIRROR', matname, 'added', added, flush=True)

out = []
for slug, tgt in MAP.items():
    f = os.path.join(src, slug, 'model.glb')
    if not os.path.exists(f): print('MISS', slug); continue
    pid = tgt if isinstance(tgt, str) else tgt['id']; variant = None if isinstance(tgt, str) else tgt.get('variant')
    mirror = None if isinstance(tgt, str) else tgt.get('mirrorMat')
    remap = {} if isinstance(tgt, str) else tgt.get('remap', {})   # {"<auto>": "SUNGKAI"}: muka tanpa material SKP → material yang benar
    low = None if isinstance(tgt, str) else tgt.get('lowTo')        # {"from": "MIDGREY", "to": "SUNGKAI", "below": .24}: muka di bawah tinggi (m) → material lain
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f)
    ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    # skala: furnitur > 12 m pasti satuan mm/cm
    mn = mathutils.Vector((1e9,) * 3); mx = -mn
    for o in ms:
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c); mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
    big = max(mx - mn)
    k = .001 if big > 120 else .01 if big > 12 else 1
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
        hit = []; lowset = set()
        if low and low['from'] in bpy.data.materials and low['to'] in bpy.data.materials:
            names = [sl.material.name if sl.material else '' for sl in o.material_slots]
            if low['to'] not in names: o.data.materials.append(bpy.data.materials[low['to']]); names.append(low['to'])
            fi, ti = names.index(low['from']) if low['from'] in names else -1, names.index(low['to'])
            mw = o.matrix_world
            for pl in o.data.polygons:
                if pl.material_index == fi and (mw @ pl.center).z < low['below']: pl.material_index = ti; lowset.add(pl.index)
        for i, sl in enumerate(o.material_slots):
            if sl.material and sl.material.name in remap and remap[sl.material.name] in bpy.data.materials:
                sl.material = bpy.data.materials[remap[sl.material.name]]; hit.append(i)
        if hit or lowset:   # muka tanpa material di SKP juga tanpa UV → proyeksi kotak (1 UV = 0,6 m) agar tekstur tampil benar
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            for grp in (False, True):   # kain lebih rapat (0,25 m), kayu 0,6 m
                sel = [pl for pl in o.data.polygons if (pl.material_index in hit or pl.index in lowset) and bool(FABRIC.search(o.material_slots[pl.material_index].material.name)) == grp]
                if not sel: continue
                for pl in o.data.polygons: pl.select = False
                for pl in sel: pl.select = True
                bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE')
                bpy.ops.uv.cube_project(cube_size=(.25 if grp else .6) / max(o.scale)); bpy.ops.object.mode_set(mode='OBJECT')
    for rk in remap:
        if rk in bpy.data.materials and not bpy.data.materials[rk].users: bpy.data.materials.remove(bpy.data.materials[rk])
    roles = {}
    for m in bpy.data.materials:
        r = role(m); roles[m.name] = r; m['role'] = r
        b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
        if not b: continue
        if r != 'glass':   # tekstur SketchUp sering membawa kanal alpha → glTF 'BLEND' (tembus pandang, urutan kacau): paksa opaque
            for l in list(b.inputs['Alpha'].links): m.node_tree.links.remove(l)
            b.inputs['Alpha'].default_value = 1.0
        if r == 'metal':
            b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = .35
            if b.inputs['Base Color'].is_linked:   # tekstur logam (mis. emas SketchUp) → warna polos, tak belang saat dipotong/diganti finishing
                for l in list(b.inputs['Base Color'].links): m.node_tree.links.remove(l)
                b.inputs['Base Color'].default_value = (.80, .58, .26, 1) if 'gold' in m.name.lower() else (.05, .048, .045, 1)
            else:
                c = b.inputs['Base Color'].default_value
                if c[0] + c[1] + c[2] < .1: b.inputs['Base Color'].default_value = (.035, .033, .031, 1)
        elif r == 'glass':
            b.inputs['Roughness'].default_value = .04
            if 'Transmission Weight' in b.inputs: b.inputs['Transmission Weight'].default_value = 1.0
            b.inputs['Alpha'].default_value = .35; m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
        elif r == 'wood':
            b.inputs['Roughness'].default_value = .55
        elif r == 'fabric':
            b.inputs['Roughness'].default_value = .9
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms: o.select_set(True)
    bpy.ops.object.make_single_user(object=True, obdata=True)   # mesh dipakai bersama (komponen SketchUp) → salinan tunggal
    bpy.context.view_layer.objects.active = ms[0]
    if k != 1:
        for o in ms: o.scale *= k; o.location *= k
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mirror: mirror_mat(ms, mirror)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in ms)
    if tris > MAXTRI:
        r = MAXTRI / tris
        for o in ms:
            md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = r; md.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dec')
    tris2 = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in ms)
    od = os.path.join(root, 'assets', 'items', pid); os.makedirs(od, exist_ok=True)
    name = 'model.glb' if not variant else 'model-' + re.sub(r'[^a-z0-9]+', '-', variant.lower()).strip('-') + '.glb'
    bpy.ops.export_scene.gltf(filepath=os.path.join(od, name), export_format='GLB', export_extras=True, export_apply=True,
                              export_image_format='WEBP', export_jpeg_quality=82)
    rec = {'slug': slug, 'id': pid, 'variant': variant, 'file': 'assets/items/' + pid + '/' + name, 'scale': k, 'tris': tris, 'tris_out': tris2,
           'size_cm': [round((mx - mn)[i] * k * 100, 1) for i in range(3)], 'roles': roles, 'kb': round(os.path.getsize(os.path.join(od, name)) / 1024)}
    out.append(rec); print('FIN', json.dumps(rec)[:300], flush=True)
json.dump(out, open(os.path.join(src, '_installed.json'), 'w'), indent=1)
print('FIN DONE', len(out))
