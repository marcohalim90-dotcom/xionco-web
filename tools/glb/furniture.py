# Furnitur prosedural (Y5: meja & kabinet) dari foto + ukuran xionco.shop — kotak, rangka besi, papan.
# blender -b --factory-startup --python tools/glb/furniture.py -- <root situs> <id[|varian]|all> [...]
# Koordinat Blender (m): depan = −Y, atas = +Z, alas di z = 0, tengah di x = 0.
# Kayu = material berlabel extras xc_wood (gelap/terang) + role 'wood' + UV kotak 1 m → di situs ikut Developer Settings › Kayu koleksi.
# Warna cat / besi / kaca = role 'baked' (tidak diwarnai ulang); kain = role 'fabric' (ikut varian warna).
import bpy, bmesh, sys, os, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
root, which = argv[0], argv[1:]
V = mathutils.Vector

def lin(h):
    h = h.lstrip('#'); s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in s)
MATS = {}
SPEC = {   # kunci: (nama, hex, metal, rough, role, alpha)
    'gelap': ('kayu gelap', '#7a4a30', 0, .55, 'wood', 1), 'terang': ('kayu terang', '#cdb08a', 0, .55, 'wood', 1),
    'black': ('besi hitam', '#1c1c1c', .3, .55, 'baked', 1), 'blackpanel': ('panel hitam', '#232323', 0, .7, 'baked', 1),
    'brass': ('kuningan', '#c9a063', 1, .3, 'baked', 1), 'glass': ('kaca', '#cfd8d6', 0, .05, 'glass', .3), 'smoke': ('kaca gelap', '#2b2b2b', .1, .08, 'baked', 1),
    'cream': ('cat krem gloss', '#cbbfb5', 0, .25, 'baked', 1), 'grey': ('cat abu', '#8c8d8e', 0, .6, 'baked', 1), 'dark': ('cat abu gelap', '#3a3b3d', 0, .45, 'baked', 1),
    'white': ('cat putih gloss', '#f0efec', 0, .2, 'baked', 1), 'green': ('cat hijau tua', '#3b4a49', 0, .65, 'baked', 1), 'fabric': ('kain linen', '#c4b8a6', 0, .9, 'fabric', 1),
    'marble': ('marmer putih', '#e9e6e1', 0, .25, 'baked', 1), 'led': ('led strip', '#fff1dc', 0, .5, 'baked', 1),
}
LIBSCALE = {'fabric-linen': .45, 'fabric-boucle': .35, 'fabric-velvet': .45, 'leather-faux': .5}
def libmat(k):
    import numpy as np
    spec, role = (k[4:].split('@') + ['fabric'])[:2]; setname, hx = spec.split('#'); hx = '#' + hx
    d = os.path.join(os.path.abspath(root), 'assets', 'library', 'textures', setname)
    m = bpy.data.materials.new(setname + ' ' + hx); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    if os.path.exists(os.path.join(d, 'albedo.webp')):
        a = nt.nodes.new('ShaderNodeTexImage'); a.image = bpy.data.images.load(os.path.join(d, 'albedo.webp'))
        px = np.empty(len(a.image.pixels), dtype=np.float32); a.image.pixels.foreach_get(px); px = px.reshape(-1, 4)
        want = np.array(lin(hx), dtype=np.float32); mu = px[:, :3].mean(0); px[:, :3] = np.clip(px[:, :3] * (want / np.maximum(mu, 1e-3)), 0, 1)
        im2 = bpy.data.images.new(setname + '-tint', a.image.size[0], a.image.size[1]); im2.pixels.foreach_set(px.ravel()); im2.pack(); a.image = im2
        nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (*lin(hx), 1)   # kulit pustaka: hanya normal/rough, warna rata
    if os.path.exists(os.path.join(d, 'normal.webp')):
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(os.path.join(d, 'normal.webp')); n.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = .6; nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Metallic'].default_value = 0; b.inputs['Roughness'].default_value = .68 if 'leather' in setname else .92
    m['role'] = role; m['lib'] = setname; m['uvs'] = LIBSCALE.get(setname, .5); MATS[k] = m; return m
WOODLIB = {'walnut': ('wood-walnut', '#673e2f', .75, 'gelap')}   # kayu bertekstur pustaka (sama dengan finish.py WOOD_DARK)
def woodlib(k):
    import numpy as np
    setname, hx, ctr, cls = WOODLIB[k]; d = os.path.join(os.path.abspath(root), 'assets', 'library', 'textures', setname)
    m = bpy.data.materials.new('%s %s x%s %s (lib)' % (setname, hx, ctr, cls)); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    a = nt.nodes.new('ShaderNodeTexImage'); a.image = bpy.data.images.load(os.path.join(d, 'albedo.webp'))
    px = np.empty(len(a.image.pixels), dtype=np.float32); a.image.pixels.foreach_get(px); px = px.reshape(-1, 4); mu = px[:, :3].mean(0)
    px[:, :3] = mu + (px[:, :3] - mu) * ctr; px[:, :3] = np.clip(px[:, :3] * (np.array(lin(hx), dtype=np.float32) / np.maximum(mu, 1e-3)), 0, 1)
    im2 = bpy.data.images.new(setname + '-tint', a.image.size[0], a.image.size[1]); im2.pixels.foreach_set(px.ravel()); im2.pack(); a.image = im2
    nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(os.path.join(d, 'normal.webp')); n.image.colorspace_settings.name = 'Non-Color'
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = .5; nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = .5; m['role'] = 'wood'; m['lib'] = setname; m['xc_wood'] = cls; MATS[k] = m; return m
def M(k):
    if k in MATS: return MATS[k]
    if k in WOODLIB: return woodlib(k)
    if k.startswith('lib:'): return libmat(k)
    n, hx, me, ro, role, al = SPEC[k]
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(hx), 1); b.inputs['Metallic'].default_value = me; b.inputs['Roughness'].default_value = ro
    if al < 1:
        b.inputs['Alpha'].default_value = al
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED'
    if k == 'led': b.inputs['Emission Color'].default_value = (*lin('#ffd9a8'), 1); b.inputs['Emission Strength'].default_value = 1.5
    m['role'] = role
    if role == 'wood': m['xc_wood'] = k
    MATS[k] = m; return m
PARTS = []
MOVE = []   # bagian bergerak: (id, [objek], pivot (x,y,z) Blender, spek xc_motion) -> objek terpisah 'xcm_<id>' (world.js: klik / Animate)
def mover(mid, objs, pivot, **spec): MOVE.append((mid, list(objs), pivot, spec)); return objs
def rod(x0, x1, y, z, r=.0125, mk='steel'):   # pipa gantungan baju (sumbu X)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=r, radius2=r, depth=x1 - x0)
    for v in bm.verts: v.co = V(((x0 + x1) / 2 + v.co.z, y + v.co.x, z + v.co.y))
    return obj(bm, mk, smooth=True)
def obj(bm, mk, name='part', smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    mt = M(mk); o.data.materials.append(mt)
    for p in o.data.polygons: p.use_smooth = smooth
    uvbox(o, mt.get('uvs', 1.0))
    PARTS.append(o); return o
def uvbox(o, s=1.0):   # UV kotak dalam meter; U (arah serat) mengikuti sisi TERPANJANG tiap potongan (tiang tegak = serat tegak)
    me = o.data; me.uv_layers.new(name='UVMap') if not me.uv_layers else None
    uv = me.uv_layers.active.data
    ex = [max(v.co[k] for v in me.vertices) - min(v.co[k] for v in me.vertices) for k in range(3)] if me.vertices else [1, 1, 1]
    for p in me.polygons:
        n = p.normal; ax = max(range(3), key=lambda k: abs(n[k])); a, b = [k for k in range(3) if k != ax]
        if ex[b] > ex[a]: a, b = b, a
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co; uv[li].uv = (co[a] / s, co[b] / s)
def box(x0, x1, y0, y1, z0, z1, mk, bev=.0015, vround=0, soft=0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = V(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    if vround:   # sudut tegak membulat (meja/kabinet bersudut lengkung)
        es = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-6]
        bmesh.ops.bevel(bm, geom=es, offset=vround, segments=8, affect='EDGES')
    if soft: bev = 0   # bantal: dibulatkan lewat modifier Bevel (lebih stabil daripada bmesh.ops.bevel di semua tepi)
    if bev: bmesh.ops.bevel(bm, geom=[e for e in bm.edges if e.calc_length() > bev * 3], offset=bev, segments=2, affect='EDGES')
    o = obj(bm, mk, smooth=False)
    if soft:
        md = o.modifiers.new('bv', 'BEVEL'); md.width = soft; md.segments = 6; md.limit_method = 'NONE'; md.use_clamp_overlap = True
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='bv')
        uvbox(o, o.data.materials[0].get('uvs', 1.0))
    if vround or soft:   # halus hanya di lengkung; muka datar besar tetap rata (tanpa garis bayangan)
        for p in o.data.polygons: p.use_smooth = max(abs(c) for c in p.normal) < .999
    return o
def bx(cx, cy, cz, sx, sy, sz, mk, **k): return box(cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2, mk, **k)
def bar(a, b, t, mk, t2=None):   # batang persegi dari a ke b
    a, b = V(a), V(b); d = b - a; L = d.length; d.normalize(); up = V((0, 0, 1)) if abs(d.z) < .9 else V((1, 0, 0))
    n = d.cross(up).normalized(); s = d.cross(n); t2 = t2 or t
    bm = bmesh.new(); vs = [bm.verts.new(a + d * e + n * sw * t / 2 + s * st * t2 / 2) for e in (0, L) for sw, st in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for k in range(4): bm.faces.new((vs[k], vs[(k + 1) % 4], vs[4 + (k + 1) % 4], vs[4 + k]))
    bm.faces.new(vs[:4][::-1]); bm.faces.new(vs[4:]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return obj(bm, mk)
def lathe(prof, mk, seg=72, c=(0, 0, 0)):
    bm = bmesh.new(); rings = [[bm.verts.new((c[0] + r * math.cos(2 * math.pi * i / seg), c[1] + r * math.sin(2 * math.pi * i / seg), c[2] + z)) for i in range(seg)] for r, z in prof]
    for k in range(len(rings) - 1):
        for i in range(seg): bm.faces.new((rings[k][i], rings[k][(i + 1) % seg], rings[k + 1][(i + 1) % seg], rings[k + 1][i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return obj(bm, mk, smooth=True)
def frame(W, D, H, t=.015, mk='black', levels=(), z0=0):
    """rangka besi persegi: 4 tiang + persegi di z0, H dan tiap level"""
    x, y = W / 2 - t / 2, D / 2 - t / 2
    for sx in (-1, 1):
        for sy in (-1, 1): bx(sx * x, sy * y, z0 + H / 2, t, t, H, mk, bev=.001)
    for z in (z0 + t / 2, z0 + H - t / 2) + tuple(levels):
        bx(0, -y, z, W, t, t, mk, bev=.001); bx(0, y, z, W, t, t, mk, bev=.001); bx(-x, 0, z, t, D, t, mk, bev=.001); bx(x, 0, z, t, D, t, mk, bev=.001)
def board(W, D, z, th, mk, inset=0, cx=0, cy=0): return bx(cx, cy, z + th / 2, W - 2 * inset, D - 2 * inset, th, mk)
def doors(x0, x1, y, z0, z1, n, mk, gap=.003, handle=None):   # pintu/laci di muka depan (garis celah)
    w = (x1 - x0) / n
    for i in range(n): box(x0 + i * w + gap / 2, x0 + (i + 1) * w - gap / 2, y - .018, y, z0 + gap / 2, z1 - gap / 2, mk, bev=.0012)

# ---------------------------------------------------------------- RECTA (rangka besi hitam + ambalan hitam/kayu)
def recta_st(W, D, H, shelves):
    frame(W, D, H, .015, levels=[s for s in shelves if s < H - .02])
    for z in shelves: board(W, D, z - .012 if z >= H - .02 else z, .012, 'blackpanel', inset=.004)
def recta_st62022(): recta_st(.5, .5, .5, [.5])
def recta_st62020(): recta_st(.35, .35, 1.0, [1.0, .62, .14])
def recta_st62019(): recta_st(.4, .4, .6, [.6, .32])
def recta_ct62021(): recta_st(1.0, .36, .73, [.73, .42])
def recta_cb62018(): recta_st(1.0, .36, 1.68, [1.68, 1.28, .88, .48, .06])
def recta_w_ct62012():   # rangka 150 × 40 × 85 + 2 ambalan hitam + kotak laci kayu di bawah
    W, D, H = 1.5, .4, .85; frame(W, D, H, .02, levels=[.5, .27])
    board(W, D, H - .012, .012, 'blackpanel', inset=.004); board(W, D, .5, .012, 'blackpanel', inset=.004)
    box(-W / 2 + .02, W / 2 - .02, -D / 2 + .02, D / 2 - .02, .03, .27, 'terang', bev=.002)
    box(-W / 2 + .025, W / 2 - .025, -D / 2 + .005, -D / 2 + .02, .035, .265, 'terang', bev=.0015)   # muka laci
def recta_w_sb62011():   # rangka + atas hitam + kabinet kayu 3 pintu
    W, D, H = 1.5, .4, .85; frame(W, D, H, .02, levels=[.62])
    board(W, D, H - .012, .012, 'blackpanel', inset=.004)
    box(-W / 2 + .02, W / 2 - .02, -D / 2 + .035, D / 2 - .02, .03, .62, 'terang', bev=.002)
    doors(-W / 2 + .025, W / 2 - .025, -D / 2 + .035, .035, .615, 3, 'terang')

# ---------------------------------------------------------------- meja makan & kopi
def vava():   # daun 180 × 90 × 4 sungkai, kaki papan bentuk Λ di tiap ujung
    W, D, H, th = 1.8, .9, .75, .04; box(-W / 2, W / 2, -D / 2, D / 2, H - th, H, 'terang', bev=.008)
    for s in (-1, 1):
        ax = s * .58
        for k in (-1, 1): bar((ax, 0, H - th - .002), (ax + k * .24, 0, .012), .09, 'terang', t2=.07)
def halved():   # kaca 200 × 100 × 0,8 di atas balok sungkai + sirip kaca gelap
    W, D, H = 2.0, 1.0, .75; box(-W / 2, W / 2, -D / 2, D / 2, H - .008, H, 'glass', bev=0)
    box(-.72, .5, -.17, .17, 0, H - .008, 'terang', bev=.003); box(.5, .515, -.3, .3, 0, H - .008, 'smoke', bev=.001)
def uas45():   # daun 186 × 86 × 3 + 4 kaki papan sungkai
    W, D, H, th = 1.86, .86, .75, .03; box(-W / 2, W / 2, -D / 2, D / 2, H - th, H, 'terang', bev=.003)
    for sx in (-1, 1):
        for sy in (-1, 1): box(sx * (W / 2 - .02) - (.08 if sx > 0 else 0), sx * (W / 2 - .02) + (0 if sx > 0 else .08), sy * (D / 2 - .03) - .02, sy * (D / 2 - .03) + .02, 0, H - th, 'terang', bev=.002)
def nora_dining():   # daun putih gloss 186 × 86 × 4, apron & 4 kaki besi hitam sedikit miring
    W, D, H, th = 1.86, .86, .75, .04; box(-W / 2, W / 2, -D / 2, D / 2, H - th, H, 'white', bev=.004)
    for sx in (-1, 1):
        for sy in (-1, 1): bar((sx * (W / 2 - .2), sy * (D / 2 - .1), H - th), (sx * (W / 2 - .17), sy * (D / 2 - .07), 0), .022, 'black', t2=.03)
def ietei():   # daun mindi 115 × 60 × 2, kotak terbuka di bawah daun, kaki hitam meruncing
    W, D, H, th = 1.15, .6, .43, .02; box(-W / 2, W / 2, -D / 2, D / 2, H - th, H, 'gelap', bev=.003)
    box(-.32, .32, -.2, .22, H - th - .085, H - th - .07, 'gelap'); box(-.32, -.305, -.2, .22, H - th - .085, H - th, 'gelap'); box(.305, .32, -.2, .22, H - th - .085, H - th, 'gelap'); box(-.32, .32, .205, .22, H - th - .085, H - th, 'gelap')
    for sx in (-1, 1):
        for sy in (-1, 1): bar((sx * (W / 2 - .12), sy * (D / 2 - .08), H - th), (sx * (W / 2 - .07), sy * (D / 2 - .05), 0), .03, 'black')
def hout_portable():   # meja samping bentuk C: papan atas & bawah kayu, rangka besi 20 mm di belakang & sisi
    W, D, H, t = .46, .3, .6, .02
    box(-W / 2, W / 2, -D / 2, D / 2, H - .018, H, 'gelap', bev=.002); box(-W / 2, W / 2, -D / 2, D / 2, .02, .038, 'gelap', bev=.002)
    for z in (H - .028, .01):
        bx(0, D / 2 - t / 2, z, W, t, t, 'black', bev=.001); bx(-W / 2 + t / 2, 0, z, t, D, t, 'black', bev=.001); bx(W / 2 - t / 2, 0, z, t, D, t, 'black', bev=.001)
    for sx in (-1, 1): bx(sx * (W / 2 - t / 2), D / 2 - t / 2, H / 2, t, t, H - .02, 'black', bev=.001)
def ct62024():   # daun bundar trambesi ø70 × 10 + kaki kerucut kayu; T44
    lathe([(0, .34), (.33, .34), (.35, .355), (.35, .425), (.335, .44), (0, .44)], 'terang')
    lathe([(0, 0), (.17, 0), (.165, .02), (.13, .34), (0, .34)], 'terang')
def eorde_coffee():   # badan abu 112 × 112 bersudut bulat, daun putih tipis, alas kuningan menjorok
    S, H = 1.12, .36; box(-S / 2, S / 2, -S / 2, S / 2, .05, H - .009, 'grey', bev=.004, vround=.12)
    box(-S / 2 + .004, S / 2 - .004, -S / 2 + .004, S / 2 - .004, H - .009, H, 'marble', bev=.002, vround=.116)
    box(-S / 2 + .05, S / 2 - .05, -S / 2 + .05, S / 2 - .05, 0, .05, 'brass', bev=.002, vround=.08)
    box(-.39, .39, -S / 2 - .002, -S / 2 + .01, .1, .28, 'grey', bev=.002)   # muka laci 78 × 25 (garis)

# ---------------------------------------------------------------- kabinet
def ashara():   # nakas krem gloss 3 laci dengan list kuningan, alas gelap menjorok
    W, D, H = .6, .45, .5; box(-W / 2, W / 2, -D / 2, D / 2, .03, H, 'cream', bev=.004, vround=.025)
    box(-W / 2 + .02, W / 2 - .02, -D / 2 + .02, D / 2 - .02, 0, .03, 'dark', bev=.002)
    for z in (.03 + (H - .03) / 3, .03 + 2 * (H - .03) / 3): box(-W / 2 - .0005, W / 2 + .0005, -D / 2 - .0015, D / 2 + .0005, z - .003, z + .003, 'brass', bev=.001, vround=.025)
def shusio_w3():   # konsol oak 150 × 40 × 85: 3 pintu, ruang terbuka bawah
    W, D, H, t = 1.5, .4, .85, .02
    box(-W / 2, -W / 2 + t, -D / 2, D / 2, 0, H, 'terang'); box(W / 2 - t, W / 2, -D / 2, D / 2, 0, H, 'terang')
    box(-W / 2 + t, W / 2 - t, -D / 2, D / 2, H - t, H, 'terang'); box(-W / 2 + t, W / 2 - t, -D / 2, D / 2, 0, t, 'terang')
    box(-W / 2 + t, W / 2 - t, -D / 2 + .02, D / 2, .2, .2 + t, 'terang'); box(-W / 2 + t, W / 2 - t, D / 2 - .012, D / 2, t, H - t, 'terang')
    doors(-W / 2 + t, W / 2 - t, -D / 2 + .018, .2 + t, H - t, 3, 'terang')
def eorde_curio():   # TV kabinet abu gelap 183 × 39 × 28, kaki 3,8, muka kaca gelap 3 ruang, daun marmer putih
    W, D, H, lg = 1.83, .39, .28, .038; box(-W / 2 + .03, W / 2 - .03, -D / 2 + .03, D / 2 - .03, 0, lg, 'dark')
    box(-W / 2, W / 2, -D / 2, D / 2, lg, H - .012, 'dark', bev=.003); box(-W / 2, W / 2, -D / 2, D / 2, H - .012, H, 'grey', bev=.002)
    for i in range(3):
        x = (i - 1) * .61; box(x - .3, x + .3, -D / 2 - .002, -D / 2 + .004, lg + .02, H - .03, 'smoke', bev=.001)
        box(x - .28, x + .28, -D / 2 + .01, -D / 2 + .012, H - .045, H - .04, 'led', bev=0)
def poel_modular(kind='wardrobe', module='Door'):   # rangka besi 12 mm 84 × 45 × 201 + kayu mindi gelap
    W, D, H, t = .84, .45, 2.01, .012; mz = .8
    frame(W, D, H, t, levels=[mz])
    board(W, D, H - .02, .02, 'gelap', inset=0)
    if kind == 'wardrobe': bar((-W / 2 + t, 0, H - .1), (W / 2 - t, 0, H - .1), .016, 'black')
    else:
        for z in (1.15, 1.5): board(W, D, z, .02, 'gelap', inset=t)
    board(W, D, mz - .02, .02, 'gelap', inset=t)
    if module == 'Shelves':
        for z in (.05, .42): board(W, D, z, .02, 'gelap', inset=t)
    else:
        box(-W / 2 + t, W / 2 - t, -D / 2 + .03, D / 2 - t, .04, mz - .02, 'gelap')
        if module == 'Door': doors(-W / 2 + t, W / 2 - t, -D / 2 + .03, .04, mz - .02, 2, 'gelap')
        else:
            for z0, z1 in ((.04, .4), (.4, mz - .02)): box(-W / 2 + t + .002, W / 2 - t - .002, -D / 2 + .012, -D / 2 + .03, z0 + .002, z1 - .002, 'gelap', bev=.0012)
def shusio5():   # bangku sepatu oak 150 × 50 × 43: 2 baris × 5 kotak, dudukan kain 12 cm, alas hitam
    W, D, H, t = 1.5, .5, .43, .018; zb = .02; zc = .31
    box(-W / 2 + .02, W / 2 - .02, -D / 2 + .02, D / 2 - .02, 0, zb, 'black', bev=.001)
    for z in (zb, (zb + zc) / 2, zc - t): box(-W / 2, W / 2, -D / 2, D / 2, z, z + t, 'terang')
    for i in range(6): x = -W / 2 + i * (W - t) / 5; box(x, x + t, -D / 2, D / 2, zb, zc, 'terang')
    box(-W / 2, W / 2, D / 2 - .01, D / 2, zb, zc, 'terang')
    box(-W / 2 + .005, W / 2 - .005, -D / 2 + .005, D / 2 - .005, zc, H, 'fabric', bev=.025)
def aobo_cube(x, z, kind):   # modul 40 × 30 × 40: open oak / green door / green open / green drawers
    w, d, h, t = .4, .3, .4, .015
    mk = 'terang' if kind == 'terang' else 'green'
    box(x - w / 2, x + w / 2, -d / 2, d / 2, z, z + t, mk); box(x - w / 2, x + w / 2, -d / 2, d / 2, z + h - t, z + h, mk)
    box(x - w / 2, x - w / 2 + t, -d / 2, d / 2, z, z + h, mk); box(x + w / 2 - t, x + w / 2, -d / 2, d / 2, z, z + h, mk)
    box(x - w / 2, x + w / 2, d / 2 - t, d / 2, z, z + h, mk)
    if kind == 'door': box(x - w / 2 + .002, x + w / 2 - .002, -d / 2 - .016, -d / 2, z + .002, z + h - .002, 'green', bev=.0012)
    if kind == 'drawer':
        for z0, z1 in ((z, z + h / 2), (z + h / 2, z + h)): box(x - w / 2 + .002, x + w / 2 - .002, -d / 2 - .016, -d / 2, z0 + .002, z1 - .002, 'green', bev=.0012)
def aobo(v='A2'):
    if v == 'A1': aobo_cube(0, 0, 'terang')
    elif v == 'A2': aobo_cube(0, 0, 'door'); aobo_cube(0, .4, 'door')
    elif v == 'A3': aobo_cube(0, 0, 'open')
    elif v == 'A4': aobo_cube(-.2, 0, 'drawer'); aobo_cube(.2, 0, 'drawer')
    else:   # C2: dinding modul 4 × 5 seperti foto utama (baris tengah terbuka, 2 kotak oak)
        for c in range(4):
            for r in range(5):
                x, z = (c - 1.5) * .4, r * .4
                aobo_cube(x, z, ('terang' if c >= 2 else 'open') if r == 2 else 'door')

BUILD = {
    'recta-st62022': recta_st62022, 'recta-st62020': recta_st62020, 'recta-st62019': recta_st62019, 'recta-ct62021': recta_ct62021, 'recta-cb62018': recta_cb62018,
    'recta-w-series-ct-62012-console-table-rak-cabinet-industrial-xionco': recta_w_ct62012,
    'recta-w-series-sb-62011-sideboard-buffet-lemari-cabinet-industrial-xionco': recta_w_sb62011,
    'vava-dining-table': vava, 'halved-dining-table': halved, 'uas-45-dining-table': uas45, 'nora-dining-table': nora_dining,
    'ietei-coffee-table': ietei, 'hout-portable-coffee-table': hout_portable, 'ct62024-coffee-table': ct62024, 'eorde-coffee-table': eorde_coffee,
    'ashara-54-nightstand': ashara, 'shusio-w3-console-table': shusio_w3, 'eorde-curio-tv-cabinet': eorde_curio,
    'shusio-5-shoe-storage-bench-minimalis': shusio5,
    'poel-modular-wardrobe': lambda: poel_modular('wardrobe', 'Door'), 'poel-modular-wardrobe|drawer': lambda: poel_modular('wardrobe', 'Drawer'),
    'poel-modular-wardrobe|shelves': lambda: poel_modular('wardrobe', 'Shelves'),
    'poel-modular-cabinet': lambda: poel_modular('cabinet', 'Shelves'), 'poel-modular-cabinet|door': lambda: poel_modular('cabinet', 'Door'),
    'poel-modular-cabinet|drawer': lambda: poel_modular('cabinet', 'Drawer'),
    'aobo-cabinet-and-wardrobe': lambda: aobo('A2'), 'aobo-cabinet-and-wardrobe|a1': lambda: aobo('A1'), 'aobo-cabinet-and-wardrobe|a3': lambda: aobo('A3'),
    'aobo-cabinet-and-wardrobe|a4': lambda: aobo('A4'), 'aobo-cabinet-and-wardrobe|c2': lambda: aobo('C2'),
}
# ---------------------------------------------------------------- SYME · lemari pintu geser 228 x 63 x 213 (foto xionco.shop)
# Luar: sisi & atas oak (kayu terang), alas hitam menjorok, 2 pintu geser abu slate (rel depan/belakang) dengan list kuningan di tepi.
# Dalam putih melamin: Signature = 2 ruang (rak atas + gantungan); Prestige = kiri rak + kolom sempit 2 rak + gantungan pendek,
# kanan rak atas + gantungan + rak + 3 laci (foto varian img-6 / img-7). Kedua pintu bergeser (xc_motion move).
SPEC.update({'slate': ('panel abu slate', '#3f4042', 0, .62, 'baked', 1), 'mel': ('melamin putih', '#eeede9', 0, .55, 'baked', 1),
             'melshade': ('celah laci', '#c9c8c3', 0, .7, 'baked', 1)})
def syme(v='Signature'):
    W, D, H, ts, t = 2.28, .63, 2.13, .025, .018
    Wi, zb, zt = W - 2 * ts, .05, H - ts                     # lebar dalam, alas (plint) & bawah papan atas
    yB = D / 2 - .012; yF = -D / 2 + .078                     # punggung & muka dalam (di belakang dua rel pintu)
    for sx in (-1, 1): box(sx * (W / 2 - ts / 2) - ts / 2, sx * (W / 2 - ts / 2) + ts / 2, -D / 2, D / 2, 0, zt, 'terang', bev=.0015)
    box(-W / 2, W / 2, -D / 2, D / 2, zt, H, 'terang', bev=.0015)
    box(-Wi / 2, Wi / 2, -D / 2 + .022, D / 2 - .01, 0, zb, 'black', bev=.001)                 # plint hitam menjorok
    box(-Wi / 2, Wi / 2, yB, D / 2, zb, zt, 'mel', bev=0)                                       # punggung
    box(-Wi / 2, Wi / 2, -D / 2 + .075, yB, zb, zb + t, 'mel', bev=.001)                        # alas dalam (di belakang rel: tidak terlihat di bawah pintu)
    box(-Wi / 2, Wi / 2, -D / 2 + .004, -D / 2 + .075, zb, zb + .004, 'black', bev=.0005)       # rel bawah
    box(-t / 2, t / 2, yF, yB, zb + t, zt, 'mel', bev=.001)                                     # sekat tengah
    box(-Wi / 2, Wi / 2, -D / 2 + .004, -D / 2 + .075, zt - .03, zt, 'black', bev=.0008)        # kotak rel atas
    sh = lambda x0, x1, z: box(x0, x1, yF, yB, z, z + t, 'mel', bev=.001)
    ry = (yF + yB) / 2 - .02
    L0, L1, R0, R1 = -Wi / 2, -t / 2, t / 2, Wi / 2
    if v == 'Signature':
        for x0, x1 in ((L0, L1), (R0, R1)): sh(x0, x1, 1.72); rod(x0 + .01, x1 - .01, ry, 1.59)
    else:
        sh(L0, L1, 1.72); sh(L0, L1, 1.39)
        xd = L0 + .35; box(xd, xd + t, yF, yB, zb + t, 1.39, 'mel', bev=.001)                  # sekat kolom sempit
        rod(L0 + .01, xd - .01, ry, 1.28); sh(L0, xd, .96); sh(L0, xd, .62)
        rod(xd + t + .01, L1 - .01, ry, 1.28)
        sh(R0, R1, 1.72); rod(R0 + .01, R1 - .01, ry, 1.59); sh(R0, R1, .65)
        xa, xb = R0 + .094, R1 - .133                                                           # unit 3 laci di bawah rak
        for x in (xa - t, xb): box(x, x + t, yF, yB, zb + t, .65, 'mel', bev=.001)
        z0, z1 = zb + t + .004, .645; hd = (z1 - z0) / 3
        for i in range(3):   # laci tarik: muka + kotak laci (sisi, punggung, alas) bergerak maju bersama
            za, zc = z0 + i * hd + .0015, z0 + (i + 1) * hd - .0015; yd = yF + .016
            parts = [box(xa + .002, xb - .002, yF - .002, yd, za, zc, 'mel', bev=.0012),
                     box((xa + xb) / 2 - .12, (xa + xb) / 2 + .12, yF - .0025, yF + .002, zc - .03, zc - .012, 'melshade', bev=.0005)]   # lekuk pegangan
            zl, zh = za + .012, zc - .04
            for x in (xa + .013, xb - .025): parts.append(box(x, x + .012, yd, yd + .44, zl, zh, 'mel', bev=.0008))
            parts += [box(xa + .025, xb - .025, yd + .428, yd + .44, zl, zh, 'mel', bev=.0008), box(xa + .025, xb - .025, yd, yd + .428, zl, zl + .008, 'melshade', bev=0)]
            mover('laci%d' % (3 - i), parts, ((xa + xb) / 2, yF, za), move=[0, 0, .34], dur=.8 + .08 * i, order=2, needs='pintuKanan')
    # pintu geser: kiri di rel depan -> geser ke kanan; kanan di rel belakang -> geser ke kiri
    wd = Wi / 2 + .02; zd0, zd1 = zb + .002, zt - .032
    for nm, x0, y0, sgn in (('pintuKiri', -Wi / 2, -D / 2 + .006, 1), ('pintuKanan', Wi / 2 - wd, -D / 2 + .040, -1)):
        x1 = x0 + wd; y1 = y0 + .028
        parts = [box(x0, x1, y0, y1, zd0, zd1, 'slate', bev=.0015)]
        for xe in (x0, x1 - .006): parts.append(box(xe, xe + .006, y0 - .0015, y0 + .002, zd0 + .004, zd1 - .004, 'brass', bev=.0004))   # list kuningan tepi pintu
        # excl: dua pintu satu rel ganda — tak bisa terbuka bersamaan (Animate membuka pintu kanan → ruang laci terlihat)
        mover(nm, parts, ((x0 + x1) / 2, y0, zd0), move=[sgn * (Wi - wd), 0, 0], dur=1.1, excl='pintu', order=1 if nm == 'pintuKanan' else 3)
# ---------------------------------------------------------------- GLIZA · meja TV 249 × 44 × 39 (SKP + foto xionco.shop)
# Alas kayu walnut (papan + plint menjorok) dengan sandaran tegak di kiri; kabinet hitam 3 laci di atasnya, menjorok ke kanan.
# Komponen terpisah: kabinet hitam bisa digeser di atas alas kayu (teleskopik), tiap laci ditarik (laci = anak kabinet).
SPEC.update({'gzblack': ('cat hitam doff', '#1d1c1b', 0, .6, 'paint', 1), 'gzin': ('dalam laci hitam', '#2c2a28', 0, .75, 'baked', 1)})
def gliza():
    X = lambda v: v - 1.2435; Y = lambda v: v - .222
    bb = lambda x0, x1, y0, y1, z0, z1, mk, **k: box(X(x0), X(x1), Y(y0), Y(y1), z0, z1, mk, **k)
    bb(0, 1.847, .01, .444, .031, .118, 'walnut', bev=.0015)                 # papan alas
    bb(.026, 1.821, .036, .418, 0, .031, 'walnut', bev=.001)                 # plint menjorok
    bb(0, .641, .413, .444, .118, .359, 'walnut', bev=.0015)                 # sandaran tegak kiri
    t = .018; c = []                                                        # kabinet hitam (muka terbuka di belakang laci)
    c += [bb(.641, 2.487, 0, .413, .365, .39, 'gzblack', bev=.0015), bb(.641, 2.487, .004, .413, .119, .137, 'gzblack', bev=.001)]
    c += [bb(.641, .641 + t, .004, .413, .137, .365, 'gzblack', bev=.001), bb(2.487 - t, 2.487, .004, .413, .137, .365, 'gzblack', bev=.001)]
    c += [bb(.641 + t, 2.487 - t, .395, .413, .137, .365, 'gzblack', bev=0)]
    c += [bb(x - t / 2, x + t / 2, .03, .395, .137, .365, 'gzblack', bev=0) for x in (1.2605, 1.872)]
    mover('kabinet', c, (X(1.564), Y(0), .119), move=[-.6, 0, 0], dur=1.5, order=1)
    for i, (a, b) in enumerate(((.642, 1.259), (1.262, 1.870), (1.874, 2.481))):
        p = [bb(a, b, 0, .022, .139, .364, 'gzblack', bev=.0012)]
        zl, zh = .152, .30
        for x in (a + .024, b - .036): p.append(bb(x, x + .012, .022, .37, zl, zh, 'gzin', bev=.0008))
        p += [bb(a + .036, b - .036, .358, .37, zl, zh, 'gzin', bev=.0008), bb(a + .036, b - .036, .022, .358, zl, zl + .008, 'gzin', bev=0)]
        mover('laci%d' % (i + 1), p, (X((a + b) / 2), Y(0), .139), move=[0, 0, .3], dur=.85 + .07 * i, order=2, parent='kabinet')
# ---------------------------------------------------------------- Y6 · barang kecil (EACH lifestyle, SOMNO, VAZRA)
SPEC.update({
    'ppwhite': ('PP putih doff', '#ecebe7', 0, .6, 'baked', 1), 'ceramic': ('keramik glasir putih', '#f3f1ec', 0, .18, 'baked', 1),
    'bluepat': ('keramik biru putih', '#c9d4e2', 0, .2, 'baked', 1), 'bamboo': ('tutup bambu', '#c49a62', 0, .5, 'baked', 1),
    'steel': ('baja', '#b9bbbd', 1, .3, 'baked', 1), 'matte': ('hitam doff', '#1e1e1f', 0, .55, 'baked', 1),
    'pillow': ('kain bantal putih', '#eeece8', 0, .92, 'baked', 1), 'cream2': ('krem payung', '#e6dccb', 0, .6, 'baked', 1),
    'smokeclear': ('PP asap', '#6f665b', 0, .12, 'baked', 1), 'tissue': ('tisu', '#f6f5f2', 0, .9, 'baked', 1),
    'beech': ('kayu hanger', '#d2a97a', 0, .5, 'baked', 1),
})
def pillow(W, D, T, mk='pillow'):   # bantal: kotak menggembung (tengah tebal, tepi tipis)
    bm = bmesh.new(); nx, ny = 28, 20; grid = []
    for i in range(nx + 1):
        row = []
        for j in range(ny + 1):
            u, v = i / nx * 2 - 1, j / ny * 2 - 1; k = (1 - u ** 4) * (1 - v ** 4)
            row.append((W / 2 * u * (1 - .04 * v * v), D / 2 * v * (1 - .04 * u * u), T / 2 * (.12 + .88 * k ** .6)))
        grid.append(row)
    top = [[bm.verts.new(p) for p in r] for r in grid]; bot = [[bm.verts.new((p[0], p[1], -p[2])) for p in r] for r in grid]
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1])); bm.faces.new((bot[i][j], bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j]))
    edge = [(i, 0) for i in range(nx)] + [(nx, j) for j in range(ny)] + [(i, ny) for i in range(nx, 0, -1)] + [(0, j) for j in range(ny, 0, -1)]
    for k in range(len(edge)):
        a, b = edge[k], edge[(k + 1) % len(edge)]; bm.faces.new((top[a[0]][a[1]], bot[a[0]][a[1]], bot[b[0]][b[1]], top[b[0]][b[1]]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = obj(bm, mk, smooth=True); o.data.transform(mathutils.Matrix.Translation((0, 0, T / 2))); return o
def tubepath(pts, r, mk, seg=10):
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        tg = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized(); a = V((0, 0, 1)) if abs(tg.z) < .9 else V((1, 0, 0))
        n = tg.cross(a).normalized(); b = tg.cross(n)
        rings.append([bm.verts.new(p + (n * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg): bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return obj(bm, mk, smooth=True)
def vazra_switch(n=1, outlet=False):   # pelat 8,6 × 8,6 hitam dengan list emas, berdiri (dipasang di dinding)
    s, t = .086, .01
    box(-s / 2, s / 2, 0, t, 0, s, 'brass', bev=.002); box(-s / 2 + .002, s / 2 - .002, -.002, t - .002, .002, s - .002, 'matte', bev=.002)
    if outlet:
        lathe([(.024, 0), (.024, .006)], 'matte', 48, c=(0, 0, 0)); PARTS[-1].data.transform(mathutils.Matrix.Translation((0, -.002, s / 2)) @ mathutils.Matrix.Rotation(math.pi / 2, 4, 'X'))
        for x in (-.0095, .0095): lathe([(.0025, 0), (.0025, .004)], 'steel', 16); PARTS[-1].data.transform(mathutils.Matrix.Translation((x, -.008, s / 2)) @ mathutils.Matrix.Rotation(math.pi / 2, 4, 'X'))
    else:
        w = (s - .012) / n
        for i in range(n):
            x0 = -s / 2 + .006 + i * w; box(x0 + .001, x0 + w - .001, -.006, -.002, .008, s - .008, 'matte', bev=.0015)
def trash_bin(): lathe([(0, 0), (.105, 0), (.122, .27), (.12, .28), (0, .28)], 'ppwhite'); lathe([(0, .279), (.095, .279), (.095, .2805), (0, .2805)], 'matte')
def hanger():
    W, h = .44, .2; pts = [V((-W / 2 + W * k / 20, 0, .03 + h * .55 * (1 - abs(k / 10 - 1)) ** .9)) for k in range(21)]
    tubepath(pts, .008, 'beech', 12); bar((-W / 2 + .01, 0, .03), (W / 2 - .01, 0, .03), .012, 'beech')
    tubepath([V((0, 0, .03 + h * .55)), V((0, 0, .03 + h * .55 + .05))] + [V((.025 * math.sin(math.pi * k / 10), 0, .03 + h * .55 + .05 + .025 * (1 - math.cos(math.pi * k / 10)))) for k in range(11)], .0022, 'steel', 8)
def powerbank():
    box(-.035, .035, -.014, .014, 0, .1285, 'matte', bev=.006, vround=.008)
    tubepath([V((.02 + .012 * math.sin(math.pi * k / 16), 0, .1285 + .05 * math.sin(math.pi * k / 16))) for k in range(17)], .002, 'matte', 8)
def ramen_bowl():
    lathe([(0, 0), (.035, 0), (.04, .012), (.07, .045), (.1, .085), (.102, .09), (.095, .09), (.066, .05), (.03, .014), (0, .014)], 'bluepat')
def bidet():
    bar((0, 0, .32), (.03, 0, .2), .022, 'matte', t2=.026); bar((0, 0, .32), (.055, 0, .345), .028, 'matte', t2=.03)
    tubepath([V((.03 + .018 * math.cos(k / 3), .018 * math.sin(k / 3), .2 - k * .0028)) for k in range(55)], .004, 'matte', 8)
def bottle(): lathe([(0, 0), (.036, 0), (.037, .01), (.037, .215), (.034, .23), (0, .23)], 'matte'); lathe([(0, .23), (.033, .23), (.033, .262), (0, .262)], 'steel')
def plate(): lathe([(0, 0), (.08, 0), (.085, .006), (.115, .014), (.135, .022), (.134, .024), (.11, .017), (.08, .009), (0, .009)], 'ceramic')
def tissue_box():
    box(-.115, .115, -.065, .065, 0, .085, 'smokeclear', bev=.004); box(-.11, .11, -.06, .06, .005, .08, 'tissue', bev=.004)
    box(-.117, .117, -.067, .067, .085, .1, 'bamboo', bev=.004); box(-.05, .05, -.012, .012, .1, .125, 'tissue', bev=.006)
def charger():
    box(-.03, .03, -.015, .015, 0, .065, 'ppwhite', bev=.005)
    for x in (-.009, .009): bar((x, .015, .02), (x, .03, .02), .004, 'steel')
def umbrella(): lathe([(0, 0), (.022, 0), (.026, .03), (.024, .24), (.018, .27), (0, .275)], 'cream2'); lathe([(0, .275), (.013, .275), (.013, .37), (0, .37)], 'bamboo')
def storage_tray(s):
    W, D, H = {'s': (.26, .18, .09), 'm': (.32, .22, .12), 'l': (.38, .27, .15)}[s]; t = .004
    box(-W / 2, W / 2, -D / 2, D / 2, 0, t, 'ppwhite', bev=.002)
    for sy in (-1, 1): box(-W / 2, W / 2, sy * D / 2 - (t if sy > 0 else 0), sy * D / 2 + (0 if sy > 0 else t), 0, H, 'ppwhite', bev=.0015)
    for sx in (-1, 1):
        box(sx * W / 2 - (t if sx > 0 else 0), sx * W / 2 + (0 if sx > 0 else t), -D / 2, D / 2, 0, H * .62, 'ppwhite', bev=.0015)
        box(sx * W / 2 - (t if sx > 0 else 0), sx * W / 2 + (0 if sx > 0 else t), -D / 2, -D * .22, H * .62, H, 'ppwhite', bev=.0015)
        box(sx * W / 2 - (t if sx > 0 else 0), sx * W / 2 + (0 if sx > 0 else t), D * .22, D / 2, H * .62, H, 'ppwhite', bev=.0015)
def drinking_glass(): lathe([(0, 0), (.035, 0), (.043, .12), (.039, .12), (.032, .006), (0, .006)], 'ceramic')
def earphone():
    for s in (-1, 1):
        sphere_ = lathe([(0, 0), (.009, .002), (.01, .01), (.007, .018), (0, .02)], 'ppwhite', 24, c=(s * .05, 0, .02)); bar((s * .05, 0, .02), (s * .05, 0, .06), .005, 'ppwhite')
    tubepath([V((.13 * math.cos(math.pi * 2 * k / 48) * .5, .06 * math.sin(math.pi * 2 * k / 48), .002)) for k in range(49)], .0015, 'ppwhite', 6)
def batteries(n, aa=True):
    r, h = (.00725, .0505) if aa else (.00525, .0445)
    for i in range(n):
        x = (i - (n - 1) / 2) * (r * 2.2)
        lathe([(0, 0), (r, 0), (r, h - .004), (r * .95, h - .002), (0, h - .002)], 'matte', 32, c=(x, 0, 0)); lathe([(0, h - .002), (r * .45, h - .002), (r * .45, h + .0012), (0, h + .0012)], 'steel', 16, c=(x, 0, 0))

BUILD.update({
    'vazra': lambda: vazra_switch(1), 'vazra|2-gang-1-way': lambda: vazra_switch(2), 'vazra|3-gang-1-way': lambda: vazra_switch(3), 'vazra|european-outlet': lambda: vazra_switch(outlet=True),
    'trash-bin-each': trash_bin, 'clothes-hanger-each': hanger, 'powerbank-each': powerbank, 'ramen-bowl-each': ramen_bowl,
    'somno-bed-pillow': lambda: pillow(.71, .51, .15), 'somno-bed-pillow-king-size': lambda: pillow(.91, .61, .17), 'bed-pillow-each': lambda: pillow(.70, .50, .1),
    'bidet-spray-each': bidet, 'botol-minum-pintar-each': bottle, 'plate-each': plate, 'tissue-box-each': tissue_box, 'charger-each': charger,
    'folding-umbrella-each': umbrella, 'storage-tray-each': lambda: storage_tray('s'), 'storage-tray-each|m': lambda: storage_tray('m'), 'storage-tray-each|l': lambda: storage_tray('l'),
    'drinking-glass-each': drinking_glass, 'earphone-each': earphone,
    'vazra-rechargeable-usb-type-c-aa-battery-baterai': lambda: batteries(2, True), 'vazra-rechargeable-usb-type-c-aa-battery-baterai|4-pcs': lambda: batteries(4, True),
    'vazra-rechargeable-usb-type-c-aaa-battery-baterai': lambda: batteries(2, False), 'vazra-rechargeable-usb-type-c-aaa-battery-baterai|4-pcs': lambda: batteries(4, False),
})

# ---------------------------------------------------------------- Z2 · bentuk kotak yang tadinya AI (rapi, prosedural)
SPEC.update({'piping': ('piping putih', '#e9e7e2', 0, .5, 'baked', 1)})
ASTRAL_SKIN = 'lib:leather-faux#2e2e2e@fabric'
def piping_loop(pts, r=.0035):   # piping putih: tabung tipis sepanjang titik (tertutup)
    tubepath([V(p) for p in pts] + [V(pts[0])], r, 'piping', 8)
def astral():   # kursi kotak 80 × 80 × 70, lengan & sandaran setinggi, kulit sintetis hitam, piping putih, alas kayu gelap 5 cm menjorok
    W, D, H, A, lg = .8, .8, .7, .14, .05
    box(-W / 2 + .05, W / 2 - .05, -D / 2 + .05, D / 2 - .05, 0, lg, 'gelap', bev=.003)
    box(-W / 2 + A, W / 2 - A, D / 2 - .16, D / 2, lg, H, ASTRAL_SKIN, bev=.012)                      # sandaran
    for sx in (-1, 1): box(sx * W / 2 - (A if sx > 0 else 0), sx * W / 2 + (0 if sx > 0 else A), -D / 2, D / 2, lg, H - .02, ASTRAL_SKIN, bev=.012)   # lengan
    box(-W / 2 + A, W / 2 - A, -D / 2, D / 2 - .16, lg, .26, ASTRAL_SKIN, bev=.01)                     # badan dudukan
    box(-W / 2 + A + .004, W / 2 - A - .004, -D / 2 + .01, D / 2 - .17, .26, .38, ASTRAL_SKIN, soft=.025)   # bantal dudukan 12 cm
    for sx in (-1, 1):   # piping: keliling muka luar lengan (atas & depan), garis bawah lengan
        x = sx * (W / 2 + .0035)
        piping_loop([(x, -D / 2, lg + .07), (x, -D / 2, H - .02), (x, D / 2, H - .02), (x, D / 2, lg + .07)])
        x2 = sx * (W / 2 - A - .0035)
        tubepath([V((x2, -D / 2 - .003, lg + .07)), V((x2, -D / 2 - .003, H - .02))], .0035, 'piping', 8)
    tubepath([V((-W / 2, -D / 2 - .0035, lg + .07)), V((W / 2, -D / 2 - .0035, lg + .07))], .0035, 'piping', 8)
def astral_ottoman():   # kubus 55 × 55 × 40, piping putih keliling ±1/3 tinggi, alas kayu gelap
    S, H, lg = .55, .4, .05
    box(-S / 2 + .04, S / 2 - .04, -S / 2 + .04, S / 2 - .04, 0, lg, 'gelap', bev=.003)
    box(-S / 2, S / 2, -S / 2, S / 2, lg, H, ASTRAL_SKIN, bev=.018)
    z = lg + .07; e = S / 2 + .0035
    piping_loop([(-e, -e, z), (e, -e, z), (e, e, z), (-e, e, z)])
def geom(top='white'):   # daun 160 × 80 × 2,5 + dua kuda-kuda kawat segitiga
    W, D, H, th, r = 1.6, .8, .75, .025, .006
    box(-W / 2, W / 2, -D / 2, D / 2, H - th, H, top, bev=.002)
    wire = 'white' if top == 'white' else 'black'
    for cx in (-.5, .5):
        a, b, c = V((cx - .17, -.28, 0)), V((cx + .17, -.28, 0)), V((cx, -.28, H - th))
        a2, b2, c2 = V((cx - .17, .28, 0)), V((cx + .17, .28, 0)), V((cx, .28, H - th))
        for p, q in ((a, c), (b, c), (a, b), (a2, c2), (b2, c2), (a2, b2), (c, c2), (a, b2), (b, a2), (a, a2), (b, b2)):
            tubepath([p, q], r, wire, 8)
def scandus():   # daun HPL oak 180 × 90 × 3 + kaki U besi hitam 8 × 4
    W, D, H, th = 1.8, .9, .75, .03
    box(-W / 2, W / 2, -D / 2, D / 2, H - th, H, 'terang', bev=.003)
    for sx in (-1, 1):
        x = sx * (W / 2 - .17)
        for sy in (-1, 1): box(x - .02, x + .02, sy * (D / 2 - .06) - .04, sy * (D / 2 - .06) + .04, 0, H - th, 'black', bev=.002)
        box(x - .02, x + .02, -D / 2 + .02, D / 2 - .02, 0, .04, 'black', bev=.002)
        box(x - .02, x + .02, -D / 2 + .02, D / 2 - .02, H - th - .04, H - th, 'black', bev=.002)
def vazra_socket(x, y, z):   # soket bundar hitam ø6 dengan cincin perak
    lathe([(0, 0), (.03, 0), (.03, .014), (.027, .018), (0, .018)], 'matte', 48, c=(x, y, z))
    lathe([(.0245, .0175), (.0265, .0175), (.0265, .0185), (.0245, .0185)], 'steel', 48, c=(x, y, z))
    for dx in (-.007, .007): box(x + dx - .001, x + dx + .001, y - .004, y + .004, z + .0175, z + .0186, 'steel', bev=0)
def vazratrack(L=1.0, n=4):   # rel listrik aluminium hitam (L × 8,6 × 2,2) + soket
    box(-L / 2, L / 2, -.043, .043, 0, .022, 'matte', bev=.003)
    box(-L / 2 + .01, L / 2 - .01, -.012, .012, .0215, .0225, 'steel', bev=0)   # alur rel
    for i in range(n): vazra_socket(-L / 2 + L * (i + .5) / n, 0, .022)
def vazra_puck(kind):
    vazra_socket(0, 0, 0)
    if kind == 'usb':
        for dx in (-.008, .008): box(dx - .004, dx + .004, -.0012, .0012, .018, .0186, 'black', bev=0)
SF101 = 'lib:fabric-linen#c2b9ac@fabric'
def sf101_module(x0, w):   # modul SF3S 101: alas kayu terang 11 cm menjorok, dudukan & sandaran bantal empuk
    D, lg = .78, .11
    box(x0 + .012, x0 + w - .012, -D / 2 + .015, D / 2 - .015, 0, lg, 'terang', bev=.004)
    box(x0 + .006, x0 + w - .006, -D / 2 + .005, D / 2 - .005, lg, lg + .2, SF101, soft=.045)            # dudukan
    box(x0 + .02, x0 + w - .02, D / 2 - .19, D / 2 - .005, lg + .2 - .02, .65, SF101, soft=.05)          # bantal sandaran
def sf101(n):
    w = 1.125
    for i in range(n): sf101_module(-n * w / 2 + i * w, w)
BUILD.update({'syme': lambda: syme('Signature'), 'syme|prestige': lambda: syme('Prestige'), 'gliza-tv-cabinet-stand': gliza})
BUILD.update({
    'astral': astral, 'astral-ottoman': astral_ottoman,
    'geom': lambda: geom('white'), 'geom|hitam': lambda: geom('blackpanel'), 'geom|abu-abu': lambda: geom('grey'),
    'scandus-dining-table': scandus,
    'vazratrack': lambda: vazratrack(1.0, 4), 'vazratrack|pw-50-cm': lambda: vazratrack(.5, 2), 'vazratrack|pws-usb': lambda: vazra_puck('usb'), 'vazratrack|pws-eu': lambda: vazra_puck('eu'),
    'sf3s-101-1-seater': lambda: sf101(1), 'sf3s-101-2-seater': lambda: sf101(2), 'sf3s-101-3-seater': lambda: sf101(3),
})

# ---------------------------------------------------------------- K7 · dibuat ulang dari NOL (bukan 3D AI): SF3S 074, SF2S 084, QAZTAC, LOPHUS
# Ukuran resmi xionco.shop, proporsi diukur dari siluet foto depan / atas / 3/4 toko (semua foto).
# ubox: jok berbentuk kotak bersudut bulat merata (r), mahkota atas (crown), perut depan (bulge), condong (lean), tirus (taper),
#        sedikit tak-rata kain (noise) → empuk, bukan balok. sweep: batang kayu melengkung (kaki/tiang belakang) berpenampang elips.
def ubox(x0, x1, y0, y1, z0, z1, mk, r=.03, crown=0, bulge=0, lean=0, taper=1, step=.03, seg=6, noise=.0012, seed=0, trap=0):
    rr = min(r, (x1 - x0) * .49, (y1 - y0) * .49, (z1 - z0) * .49)
    def ticks(a0, a1):
        L = a1 - a0; e = [rr * (1 - math.cos(math.pi / 2 * i / seg)) for i in range(seg + 1)]
        n = max(1, round((L - 2 * rr) / step)); mid = [rr + (L - 2 * rr) * k / n for k in range(1, n)]
        out = []
        for v in [a0 + q for q in e] + [a0 + q for q in mid] + [a1 - q for q in reversed(e)]:
            if not out or v - out[-1] > 1e-7: out.append(v)
        return out
    X, Y, Z = ticks(x0, x1), ticks(y0, y1), ticks(z0, z1)
    bm = bmesh.new(); vm = {}
    def vt(x, y, z):
        k = (round(x, 7), round(y, 7), round(z, 7))
        if k not in vm: vm[k] = bm.verts.new((x, y, z))
        return vm[k]
    def grid(A, B, f):
        for i in range(len(A) - 1):
            for j in range(len(B) - 1):
                try: bm.faces.new([vt(*f(A[i], B[j])), vt(*f(A[i + 1], B[j])), vt(*f(A[i + 1], B[j + 1])), vt(*f(A[i], B[j + 1]))])
                except ValueError: pass
    grid(X, Y, lambda a, b: (a, b, z1)); grid(X, Y, lambda a, b: (a, b, z0)); grid(X, Z, lambda a, b: (a, y0, b))
    grid(X, Z, lambda a, b: (a, y1, b)); grid(Y, Z, lambda a, b: (x0, a, b)); grid(Y, Z, lambda a, b: (x1, a, b))
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2; W, D, H = x1 - x0, y1 - y0, z1 - z0
    cl = lambda v, a, b: max(a, min(b, v))
    for v in bm.verts:
        p = v.co; q = V((cl(p.x, x0 + rr, x1 - rr), cl(p.y, y0 + rr, y1 - rr), cl(p.z, z0 + rr, z1 - rr))); d = p - q
        if d.length > 1e-9: p = q + d.normalized() * rr
        u, w_, h = (p.x - cx) / (W / 2), (p.y - cy) / (D / 2), (p.z - z0) / H
        fu, fv = max(0, 1 - u * u) ** 1.3, max(0, 1 - w_ * w_) ** 1.3
        p.z += crown * fu * fv * cl((p.z - cz) / (H / 2), 0, 1) ** 2                                   # mahkota atas (empuk)
        p.y -= bulge * fu * max(0, 1 - (2 * h - 1) ** 2) * cl((cy - p.y) / (D / 2), 0, 1) ** 2         # perut muka depan
        p.y += lean * h                                                                                  # condong ke belakang
        if taper != 1: s = taper + (1 - taper) * h; p.x = cx + (p.x - cx) * s; p.y = cy + (p.y - cy) * s
        if trap: p.x = cx + (p.x - cx) * (1 - trap * cl((p.y - y0) / D, 0, 1))   # trapesium: belakang lebih sempit
        if noise:   # tak-rata halus kain (deterministik), tidak di alas
            n = math.sin(p.x * 61 + seed) * math.sin(p.y * 47 + 1.3 * seed) * math.sin(p.z * 53 + 2.1) + .5 * math.sin(p.x * 23 - p.z * 31 + seed)
            dv = V((p.x - cx, p.y - cy, (p.z - cz) * .6)); p += dv.normalized() * noise * n * cl(h * 4, 0, 1)
        v.co = p
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return obj(bm, mk, smooth=True)
def sweep(pts, rs, mk, seg=18, sx=1.0, sy=1.0, cap=True, sq=1.0, sxs=None):   # sxs: faktor arah-nr per titik (penampang elips berubah)
    bm = bmesh.new(); rings = []; prev = None; n = len(pts)
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        a = prev if prev is not None else (V((1, 0, 0)) if abs(t.x) < .9 else V((0, 1, 0)))
        nr = (a - t * a.dot(t)).normalized(); prev = nr; b = t.cross(nr)
        qi = sq[i] if isinstance(sq, (list, tuple)) else sq
        se = lambda c: math.copysign(abs(c) ** qi, c)   # superelips (sq per titik boleh)
        fx = sx * (sxs[i] if sxs else 1)
        rings.append([bm.verts.new(p + nr * se(math.cos(2 * math.pi * k / seg)) * rs[i] * fx + b * se(math.sin(2 * math.pi * k / seg)) * rs[i] * sy) for k in range(seg)])
    for k in range(n - 1):
        for i in range(seg): bm.faces.new((rings[k][i], rings[k][(i + 1) % seg], rings[k + 1][(i + 1) % seg], rings[k + 1][i]))
    if cap: bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return obj(bm, mk, smooth=True)
def bez(ctrl, n=24):   # kurva Bezier (titik kontrol V) → n+1 titik
    out = []
    for i in range(n + 1):
        t = i / n; pts = list(ctrl)
        while len(pts) > 1: pts = [pts[k] * (1 - t) + pts[k + 1] * t for k in range(len(pts) - 1)]
        out.append(pts[0])
    return out

def sf3s074():   # 185 × 80 × 81 · kotak minimalis: lengan balok bulat, dudukan bangku tunggal, sandaran rapat bulat, plint menjorok + kaki hitam
    W, D, H = 1.85, .80, .81; F = 'lib:fabric-linen#9b9b99@fabric'; aw = .185; zp = .065
    for sx in (-1, 1):
        for sy in (-1, 1): lathe([(0, 0), (.019, 0), (.021, .004), (.021, .013), (0, .013)], 'black', 32, c=(sx * (W / 2 - .07), sy * (D / 2 - .07), 0))
    ubox(-W / 2 + .012, W / 2 - .012, -D / 2 + .014, D / 2 - .014, .012, zp + .004, F, r=.012, noise=0)                 # plint menjorok
    for sx in (-1, 1):                                                                                                       # lengan
        xa, xb = (-W / 2, -W / 2 + aw) if sx < 0 else (W / 2 - aw, W / 2)
        ubox(xa, xb, -D / 2, D / 2, zp, .65, F, r=.018, crown=.002, bulge=.002, seed=sx)
    ubox(-W / 2 + aw - .004, W / 2 - aw + .004, -D / 2 + .004, D / 2 - .15, zp, .42, F, r=.022, crown=.008, bulge=.003, seed=3)   # dudukan bangku
    ubox(-W / 2 + aw - .002, W / 2 - aw + .002, D / 2 - .215, D / 2 - .006, zp, H - .003, F, r=.035, crown=.003, bulge=.005, lean=.02, seed=5)  # sandaran

def sf2s084():   # 175 × 80 × 80 · kaki oak bulat, badan + lengan tipis kotak, 2 bantal duduk & 2 bantal sandaran empuk
    W, D, H = 1.75, .80, .80; F = 'lib:fabric-linen#d6d0c6@fabric'; aw = .145; zl, zb = .175, .265
    for sx in (-1, 1):
        for sy in (-1, 1):
            lathe([(0, 0), (.0155, 0), (.0168, .003), (.0245, zl - .004), (.025, zl), (0, zl)], 'terang', 36, c=(sx * (W / 2 - .07), sy * (D / 2 - .075), 0))
    ubox(-W / 2 + aw - .01, W / 2 - aw + .01, -D / 2 + .012, D / 2 - .01, zl, zb, F, r=.014, crown=0, noise=.0006, seed=1)   # rangka dudukan
    for sx in (-1, 1):
        xa, xb = (-W / 2, -W / 2 + aw) if sx < 0 else (W / 2 - aw, W / 2)
        ubox(xa, xb, -D / 2, D / 2, zl, .56, F, r=.032, crown=.003, bulge=.002, seed=2 + sx)                             # lengan
    ubox(-W / 2 + aw, W / 2 - aw, D / 2 - .13, D / 2 - .01, zb - .01, .6, F, r=.03, noise=.0008, seed=4)                  # rangka sandaran
    xi = W / 2 - aw - .004
    for k, (xa, xb) in enumerate(((-xi, -.003), (.003, xi))):
        ubox(xa, xb, -D / 2 + .022, D / 2 - .2, zb - .004, .428, F, r=.03, crown=.012, bulge=.004, seed=6 + k)              # bantal duduk
        ubox(xa + .008, xb - .008, D / 2 - .255, D / 2 - .115, .405, H - .012, F, r=.038, crown=.008, bulge=.01, lean=.045, seed=9 + k)  # bantal sandaran

def qaztac():   # 55 × 40 × 50 · rangka baja hitam pipa kotak 2,5 cm (dua sisi loop), atas & kotak laci & rak bawah walnut, laci tarik
    W, D, H, t = .55, .40, .50, .025; K = 'walnut'
    for sx in (-1, 1):
        xa, xb = (-W / 2, -W / 2 + t) if sx < 0 else (W / 2 - t, W / 2)
        for ya, yb in ((-D / 2, -D / 2 + t), (D / 2 - t, D / 2)): box(xa, xb, ya, yb, 0, H, 'black', bev=.003)          # tiang depan / belakang
        for za, zb in ((0, t), (H - t, H)): box(xa, xb, -D / 2 + t, D / 2 - t, za, zb, 'black', bev=.003)               # rel bawah (sled) / atas
    xi = W / 2 - t; zt = H - .036; zc = .305; tw = .015
    box(-xi, xi, -D / 2, D / 2, zt, H, K, bev=.002)                                                                       # daun atas
    for sx in (-1, 1): box(sx * xi - (tw if sx > 0 else 0), sx * xi + (tw if sx < 0 else 0), -D / 2 + .02, D / 2, zc, zt, K, bev=.0015)   # sisi kotak laci
    box(-xi + tw, xi - tw, -D / 2 + .02, D / 2, zc, zc + tw, K, bev=.0015); box(-xi + tw, xi - tw, D / 2 - tw, D / 2, zc + tw, zt, K, bev=.0015)
    box(-xi, xi, -D / 2 + .012, D / 2 - .012, .082, .1, K, bev=.002)                                              # rak bawah
    for sx in (-1, 1): box(sx * xi - (.004 if sx > 0 else 0), sx * xi + (.004 if sx < 0 else 0), -D / 2 + t, D / 2 - t, .07, .082, 'black', bev=.001)  # siku penopang rak
    zf0, zf1 = zc + .003, zt - .002; p = [box(-xi + .002, xi - .002, -D / 2, -D / 2 + .02, zf0, zf1, K, bev=.002)]        # muka laci (tanpa pegangan, push)
    zl, zh = zf0 + .015, zf1 - .03; xs = xi - tw - .006
    for x in (-xs, xs - .012): p.append(box(x, x + .012, -D / 2 + .02, D / 2 - .03, zl, zh, K, bev=.001))
    p += [box(-xs + .012, xs - .012, D / 2 - .042, D / 2 - .03, zl, zh, K, bev=.001), box(-xs + .012, xs - .012, -D / 2 + .02, D / 2 - .042, zl, zl + .008, K, bev=0)]
    mover('laci', p, (0, -D / 2, zf0), move=[0, 0, .26], dur=.9, order=2)

def lophus():   # 47 × 48 × 80 · kursi "elbow" mengikuti foto toko (01/02/05/06 resolusi penuh):
    # busur sandaran bulat, ujung potong rata menjorok, tengah menebal (lensa); tiang belakang melengkung, paling tebal di dudukan,
    # kaki belakang "pedang" (lebar dari samping); kaki depan persegi tirus tegak; apron depan & samping melengkung; jok 6,5 cm tepi tegas
    W, D, H = .47, .48, .80; K = 'walnut'; F = 'lib:fabric-linen#5b5957@fabric'; zs = .40
    yP = D / 2 - .05                                                                  # garis tiang belakang di ketinggian dudukan
    for sx in (-1, 1):
        ubox(sx * .195 - .023, sx * .195 + .023, -D / 2 + .01, -D / 2 + .056, 0, zs, K, r=.006, taper=.72, noise=0, step=.05)   # kaki depan
        lo = bez([V((sx * .188, D / 2 + .028, 0)), V((sx * .185, yP + .03, .2)), V((sx * .184, yP + .004, zs))], 16)
        up = bez([V((sx * .184, yP + .004, zs)), V((sx * .18, yP - .042, .6)), V((sx * .188, yP + .002, .748))], 16)[1:]   # cembung ke depan (pemilik: bukan cekung)
        pts = lo + up; m = len(pts) - 1; nlo = len(lo) - 1
        rs = [(.0165 + .0095 * (i / nlo) ** .8) if i <= nlo else (.026 - .0095 * ((i - nlo) / (m - nlo)) ** .9) for i in range(m + 1)]
        dep = [(1.45 - .4 * (i / nlo)) if i <= nlo else 1.0 for i in range(m + 1)]   # kaki bawah lebih dalam (pedang) dari samping
        sweep(pts, rs, K, seg=24, sxs=dep)
    # busur: penampang bulat ±3,5 cm di ujung, tengah ±7 cm tinggi (lensa: bawah turun lebih banyak, atas naik sedikit), denah melengkung
    n = 48; pts, hs, dp, qs = [], [], [], []
    for i in range(n + 1):
        s_ = i / n * 2 - 1; w_ = .52; bump = ((1 + math.cos(math.pi * s_ / w_)) / 2) ** .75 if abs(s_) < w_ else 0   # tonjolan bulat di tengah, ujung lurus rata (foto 02)
        top, bot = .786 + .022 * bump, .752 - .036 * bump
        pts.append(V((s_ * .243, yP + .025 - .045 * s_ * s_, (top + bot) / 2))); hs.append((top - bot) / 2); dp.append((.0175 + .006 * bump) / ((top - bot) / 2)); qs.append(.62 + .38 * bump)
    sweep(pts, hs, K, seg=32, sxs=dp, sq=qs)   # penampang bulat-persegi (ujung busur tampak balok di foto 02)
    # apron depan & samping melengkung (tepi bawah cekung), belakang lurus; sedikit masuk dari muka kaki
    def apron(p0, p1, dz0, dz1):
        bm = bmesh.new(); L = (p1 - p0).length; ux = (p1 - p0).normalized(); top, bot = [], []
        for k in range(25):
            t = k / 24; q = p0 + (p1 - p0) * t; top.append((q, zs)); bot.append((q, zs - dz0 + (dz0 - dz1) * math.sin(math.pi * t) ** 1.2))
        nn = V((-ux.y, ux.x, 0)) * .009
        ring = lambda off: [bm.verts.new((q.x + off.x, q.y + off.y, z)) for (q, z) in top + bot[::-1]]
        a_, b_ = ring(-nn), ring(nn); Ln = len(a_); bm.faces.new(a_[::-1]); bm.faces.new(b_)
        for k in range(Ln): bm.faces.new((a_[k], a_[(k + 1) % Ln], b_[(k + 1) % Ln], b_[k]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); obj(bm, K)
    yf = -D / 2 + .036
    apron(V((-.176, yf, 0)), V((.176, yf, 0)), .072, .036)
    for sx in (-1, 1): apron(V((sx * .19, -D / 2 + .056, 0)), V((sx * .184, yP - .022, 0)), .066, .04)
    box(-.165, .165, yP - .012, yP + .006, zs - .05, zs, K, bev=.002)
    box(-.2, .2, -D / 2 + .03, yP - .01, zs - .014, zs, K, bev=.002)                                                     # papan dudukan
    ubox(-W / 2 + .004, W / 2 - .004, -D / 2 + .002, yP + .012, zs, .466, F, r=.017, crown=.004, bulge=.002, seed=2, trap=.05, step=.025)   # jok
BUILD.update({'sf3s-074': sf3s074, 'sf2s-084': sf2s084, 'qaztac': qaztac, 'lophus-dining-chair': lophus})

ids = list(BUILD) if which == ['all'] else which
for key in ids:
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); PARTS.clear(); MOVE.clear()
    BUILD[key]()
    pid, var = (key.split('|') + [None])[:2]
    moving = {o.name for _, obs, _, _ in MOVE for o in obs}
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:
        if o.name not in moving: o.select_set(True)
    bpy.context.view_layer.objects.active = [o for o in PARTS if o.name not in moving][0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = pid
    movers = []
    for mid, obs, pv, spec in MOVE:   # pintu/laci: satu objek per bagian, titik asal di pivot, extras xc_motion
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs: o.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        if len(obs) > 1: bpy.ops.object.join()
        m = bpy.context.active_object; m.name = 'xcm_' + mid
        bpy.context.scene.cursor.location = V(pv); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        m['xc_motion'] = dict(id=mid, **{k: v for k, v in spec.items() if k != 'parent'}); movers.append(m)
    for (mid, _, _, spec), m in zip(MOVE, movers):   # parent: laci ikut kabinet yang digeser (anak glTF, gerak lokal)
        if spec.get('parent'):
            pa = bpy.data.objects['xcm_' + spec['parent']]; m.parent = pa; m.matrix_parent_inverse = pa.matrix_world.inverted()
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    for m in movers: m.select_set(True)
    out = os.path.join(root, 'assets/items', pid, 'model.glb' if not var else 'model-' + var + '.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_extras=True)
    print('FURN', key, 'cm', [round(x * 100, 1) for x in ob.dimensions], 'gerak', len(movers), 'tris', sum(len(p.vertices) - 2 for p in ob.data.polygons), round(os.path.getsize(out) / 1024), 'KB', flush=True)
