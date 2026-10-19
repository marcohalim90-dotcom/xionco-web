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
def M(k):
    if k in MATS: return MATS[k]
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
def obj(bm, mk, name='part', smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    mt = M(mk); o.data.materials.append(mt)
    for p in o.data.polygons: p.use_smooth = smooth
    uvbox(o, mt.get('uvs', 1.0))
    PARTS.append(o); return o
def uvbox(o, s=1.0):   # UV kotak dalam meter (serat kayu menerus)
    me = o.data; me.uv_layers.new(name='UVMap') if not me.uv_layers else None
    uv = me.uv_layers.active.data
    for p in me.polygons:
        n = p.normal; ax = max(range(3), key=lambda k: abs(n[k])); a, b = [k for k in range(3) if k != ax]
        if ax == 2: a, b = 0, 1
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
BUILD.update({
    'astral': astral, 'astral-ottoman': astral_ottoman,
    'geom': lambda: geom('white'), 'geom|hitam': lambda: geom('blackpanel'), 'geom|abu-abu': lambda: geom('grey'),
    'scandus-dining-table': scandus,
    'vazratrack': lambda: vazratrack(1.0, 4), 'vazratrack|pw-50-cm': lambda: vazratrack(.5, 2), 'vazratrack|pws-usb': lambda: vazra_puck('usb'), 'vazratrack|pws-eu': lambda: vazra_puck('eu'),
    'sf3s-101-1-seater': lambda: sf101(1), 'sf3s-101-2-seater': lambda: sf101(2), 'sf3s-101-3-seater': lambda: sf101(3),
})

ids = list(BUILD) if which == ['all'] else which
for key in ids:
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); PARTS.clear()
    BUILD[key]()
    pid, var = (key.split('|') + [None])[:2]
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS: o.select_set(True)
    bpy.context.view_layer.objects.active = PARTS[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = pid
    out = os.path.join(root, 'assets/items', pid, 'model.glb' if not var else 'model-' + var + '.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_extras=True)
    print('FURN', key, 'cm', [round(x * 100, 1) for x in ob.dimensions], 'tris', sum(len(p.vertices) - 2 for p in ob.data.polygons), round(os.path.getsize(out) / 1024), 'KB', flush=True)
