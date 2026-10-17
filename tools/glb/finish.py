# Rapikan GLB hasil SKP untuk situs: peran material (kain/kayu/besi/kaca), skala, ringankan, pasang ke assets/items/<id>/
# blender -b --factory-startup --python tools/glb/finish.py -- <folder skp-glb> <map.json> <root situs>
#   map.json: { "<slug skp>": "<id produk>" | {"id": "...", "variant": "<label varian>"} }
# Peran disimpan sebagai extras material (role) → world.js hanya mewarnai 'fabric' & mengganti finishing 'metal'.
import bpy, bmesh, sys, os, json, re, mathutils
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
src, mapf, root = argv[0], argv[1], argv[2]
MAP = json.load(open(mapf))
MAXTRI = 150000   # GUISE 110 rb segitiga: lebih baik utuh daripada diringankan (tufting rusak)
WOOD_SAT = .55    # kejenuhan maks tekstur kayu (foto walnut ±.53); tekstur SketchUp .66–.84 tampak merah di panggung
WOOD_LIGHT = (.80, .66, .43)   # kayu terang (sungkai CUBIX Terang) → rona birch kekuningan (rata-rata sRGB), serat dijaga
WOOD_SAT_MIN = .38  # kayu terang (sungkai CUBIX Terang, foto ±.31 tapi panggung mencerahkan): tekstur .23 tampak putih
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

def calm_wood(m):
    """Turunkan kejenuhan tekstur kayu yang terlalu oranye/merah (dibanding foto produk)."""
    b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    if not b or not b.inputs['Base Color'].is_linked: return
    n = b.inputs['Base Color'].links[0].from_node
    if n.type != 'TEX_IMAGE' or not n.image or n.image.get('calm'): return
    im = n.image; px = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4)
    rgb = px[:, :3]; mx = rgb.max(1); mn = rgb.min(1)
    sat = float(np.mean((mx - mn) / np.maximum(mx, 1e-4)))
    mean = rgb.mean(0)
    if float(mean @ np.array([.2126, .7152, .0722])) > .6:   # kayu terang: geser rata-rata ke rona birch (pemilik: bukan putih pucat)
        px[:, :3] = np.clip(rgb * (np.array(WOOD_LIGHT, dtype=np.float32) / np.maximum(mean, 1e-3)), 0, 1)
        im.pixels.foreach_set(px.ravel()); im.update(); im['calm'] = 1
        print('BIRCH', m.name, [round(float(v), 2) for v in mean], '->', WOOD_LIGHT, flush=True); return
    want = WOOD_SAT if sat > WOOD_SAT else WOOD_SAT_MIN if sat < WOOD_SAT_MIN else sat
    if want != sat:
        lum = (rgb @ np.array([.2126, .7152, .0722], dtype=np.float32))[:, None]
        px[:, :3] = np.clip(lum + (rgb - lum) * (want / max(sat, .02)), 0, 1)
        if want > sat: px[:, :3] *= .86   # kayu terang diredupkan: di panggung tampak lebih terang dari foto
        im.pixels.foreach_set(px.ravel()); im.update()
        print('CALM', m.name, round(sat, 2), '->', want, flush=True)
    im['calm'] = 1

SMOOTH_DEG = 30   # sudut maks antar muka yang dihaluskan; di atasnya tetap tajam (tepi dudukan, kaki, kotak)

def fix_normals(ms):
    """SketchUp = segitiga lepas dengan normal kasar/menyimpang (noda belang di lipatan GUISE, permukaan tidak mulus)
    → satukan titik, hapus normal bawaan, hitung ulang halus per sudut."""
    import math
    for o in ms:
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0002); bm.to_mesh(o.data); bm.free()
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        if o.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(SMOOTH_DEG))

def add_motions(ms, defs):
    """Bagian bergerak (pintu, flap, sandaran sofa bed) dipisah jadi objek sendiri, titik asalnya di engsel/rel,
    lalu diberi extras xc_motion → world.js membuatnya bergerak (klik kanan › Animate).
    def: {id, sel: [x0,x1,y0,y1,z0,z1] meter dari sudut min bbox (Blender: y = dalam dari depan, z = atas),
          pivot: [x,y,z] sama, axis + amt (radian, sumbu glTF) atau move: [dx,dy,dz] (meter, sumbu glTF)}"""
    mn = mathutils.Vector((1e9,) * 3); mx = -mn
    for o in ms:
        for c in o.bound_box:
            v = o.matrix_world @ mathutils.Vector(c); mn = mathutils.Vector(map(min, mn, v)); mx = mathutils.Vector(map(max, mx, v))
    for d in defs:
        s = d['sel']; lo = mn + mathutils.Vector((s[0], s[2], s[4])); hi = mn + mathutils.Vector((s[1], s[3], s[5])); parts = []
        for o in list(ms):
            vs = [o.matrix_world @ v.co for v in o.data.vertices]
            inside = [all(lo[i] - .002 <= v[i] <= hi[i] + .002 for i in range(3)) for v in vs]
            if not d.get('islands'):   # per muka: seluruh titik di dalam area (pintu & flap yang menyatu dengan badan)
                idx = [p.index for p in o.data.polygons if all(inside[k] for k in p.vertices)]
            # islands: per pulau mesh utuh (bantal, papan): ikut bila >= 60% titiknya di dalam area → dudukan tidak terpotong
            else:
              bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); seen = set(); idx = []
              for f0 in bm.faces:
                  if f0.index in seen: continue
                  isl, st = [], [f0]; seen.add(f0.index)
                  while st:
                      f = st.pop(); isl.append(f.index)
                      for e in f.edges:
                          for g in e.link_faces:
                              if g.index not in seen: seen.add(g.index); st.append(g)
                  vset = {v.index for i in isl for v in bm.faces[i].verts}
                  if sum(inside[k] for k in vset) >= .6 * len(vset): idx += isl
              bm.free()
            if not idx or len(idx) == len(o.data.polygons): continue
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
            bm = bmesh.from_edit_mesh(o.data); bm.faces.ensure_lookup_table()
            for i in idx: bm.faces[i].select_set(True)
            bmesh.update_edit_mesh(o.data); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
            parts += [x for x in bpy.context.selected_objects if x is not o]
        if not parts: print('MOTION none', d['id'], flush=True); continue
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts: p.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        if len(parts) > 1: bpy.ops.object.join()
        part = bpy.context.view_layer.objects.active; part.name = 'xcm_' + d['id']
        bpy.context.scene.cursor.location = mn + mathutils.Vector(d['pivot'])
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        part['xc_motion'] = {k: d[k] for k in ('id', 'axis', 'amt', 'move') if k in d}
        ms.append(part)
        print('MOTION', d['id'], len(part.data.polygons), flush=True)

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
    low = None if isinstance(tgt, str) else tgt.get('lowTo')
    mots = [] if isinstance(tgt, str) else tgt.get('motions', [])   # bagian bergerak (Animate)        # {"from": "MIDGREY", "to": "SUNGKAI", "below": .24}: muka di bawah tinggi (m) → material lain
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
            calm_wood(m)
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
    fix_normals(ms)
    if mots: add_motions(ms, mots)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in ms)
    if tris > MAXTRI:
        r = MAXTRI / tris
        for o in ms:   # SketchUp = segitiga lepas → satukan titik dulu, kalau tidak peringanan merobek permukaan
            bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0002); bm.to_mesh(o.data); bm.free()
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
