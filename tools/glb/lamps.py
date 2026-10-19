# Lampu prosedural dari foto + ukuran xionco.shop (Y2 VOID, Y3 AETHER) — seperti void_sky_b9.py tetapi satu pustaka.
# blender -b --factory-startup --python tools/glb/lamps.py -- <root situs> <id|all> [id...]
# Koordinat Blender: depan = −Y (glTF +Z), dinding/belakang = +Y, atas = +Z; meter.
#  • lampu dinding: titik paling belakang (y maks) = muka dinding (world.js stageLamp memasang dinding di sana)
#  • lampu gantung: kabel + kanopi di atas (stageLamp menggantung kanopi di plafon)
# Nama material menentukan pemancar di panggung (world.js: led|diffuser|lamp|light|bulb|kap|shade|acryl|opal|emit) —
# bagian yang tidak menyala JANGAN memakai kata itu. Semua material role 'baked' (tidak diwarnai / finishing ulang).
import bpy, bmesh, sys, os, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
root, which = argv[0], argv[1:]
V = mathutils.Vector

def lin(h):
    h = h.lstrip('#'); s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in s)
MATS = {}
def M(key):
    if key in MATS: return MATS[key]
    spec = {
        'brass': ('brass', '#c9a063', 1, .32, None), 'brass dark': ('brass dark', '#a07a45', 1, .38, None),
        'black': ('black metal', '#1d1d1d', .35, .5, None), 'stone': ('black stone', '#2a2a29', 0, .85, None),
        'chrome': ('chrome', '#d8d8d8', 1, .12, None), 'cable': ('cable', '#202020', 0, .6, None), 'steel': ('steel wire', '#bdbdbd', 1, .35, None),
        'led': ('led strip', '#fff4e4', 0, .5, '#ffd9a8'), 'opal': ('opal glass', '#f4efe6', 0, .35, '#ffe3bd'),
        'bulb': ('bulb', '#fff2dc', 0, .3, '#ffd59e'), 'crystal': ('crystal diffuser', '#f3ece0', 0, .08, '#ffe2b8'),
        'acryl': ('acryl wing', '#f6f0e4', 0, .3, '#ffe6c2'), 'frost': ('opal frosted', '#eeeae2', 0, .55, '#ffe3bd'),
        'gold in': ('gold inner', '#d9b06a', 1, .25, None), 'white': ('white metal', '#e9e6e0', .2, .45, None),
    }[key]
    m = bpy.data.materials.new(spec[0]); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(spec[1]), 1); b.inputs['Metallic'].default_value = spec[2]; b.inputs['Roughness'].default_value = spec[3]
    if spec[4]: b.inputs['Emission Color'].default_value = (*lin(spec[4]), 1); b.inputs['Emission Strength'].default_value = 1.5
    m['role'] = 'baked'; MATS[key] = m; return m

PARTS = []
def put(o, mk, smooth=True):
    o.data.materials.clear(); o.data.materials.append(M(mk))
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    PARTS.append(o); return o
def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); return o
def box(sx, sy, sz, c, mk, bevel=.0015):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = V((v.co.x * sx + c[0], v.co.y * sy + c[1], v.co.z * sz + c[2]))
    if bevel: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(bevel, min(sx, sy, sz) * .45), segments=2, affect='EDGES')
    return put(new_obj('box', bm), mk, smooth=False)
def lathe(prof, mk, seg=48, c=(0, 0, 0), axis=None, arc=(0, 2 * math.pi), cap=True):
    """prof: [(r, z)] dari bawah ke atas; axis: matriks rotasi opsional (sumbu lathe = Z lokal); arc: sudut (sebagian = cangkang)."""
    bm = bmesh.new(); rings = []; full = abs(arc[1] - arc[0] - 2 * math.pi) < 1e-6; n = seg if full else seg + 1
    for r, z in prof:
        ring = []
        for i in range(n):
            a = arc[0] + (arc[1] - arc[0]) * i / seg
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for i in range(seg):
            j = (i + 1) % n if full else i + 1
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    if cap and full:
        for ring, (r, z) in ((rings[0], prof[0]), (rings[-1], prof[-1])):
            if r > 1e-5: bm.faces.new(ring[::-1] if ring is rings[0] else ring)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = new_obj('lathe', bm)
    T = mathutils.Matrix.Translation(c) @ (axis.to_4x4() if axis else mathutils.Matrix())
    o.data.transform(T); return put(o, mk)
def cyl(r, z0, z1, mk, c=(0, 0), seg=32, axis=None, base=None):
    """silinder sepanjang Z (atau axis: matriks rotasi, base: titik awal)"""
    if axis is None: return lathe([(r, z0), (r, z1)], mk, seg, c=(c[0], c[1], 0))
    return lathe([(r, 0), (r, z1 - z0)], mk, seg, c=base, axis=axis)
def sphere(r, c, mk, seg=40):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    for v in bm.verts: v.co += V(c)
    return put(new_obj('sphere', bm), mk)
def torus(R, r, c, mk, rot=None, seg=96, sseg=16):
    bm = bmesh.new(); rings = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; ca, sa = math.cos(a), math.sin(a); ring = []
        for j in range(sseg):
            b = 2 * math.pi * j / sseg; ring.append(bm.verts.new(((R + r * math.cos(b)) * ca, (R + r * math.cos(b)) * sa, r * math.sin(b))))
        rings.append(ring)
    for i in range(seg):
        for j in range(sseg): bm.faces.new((rings[i][j], rings[(i + 1) % seg][j], rings[(i + 1) % seg][(j + 1) % sseg], rings[i][(j + 1) % sseg]))
    o = new_obj('torus', bm); o.data.transform(mathutils.Matrix.Translation(c) @ (rot.to_4x4() if rot else mathutils.Matrix())); return put(o, mk)
def ribbon(pts, w, t, mk, nrm=None):
    """pita persegi sepanjang titik pts; lebar w menurut nrm(i) (vektor satuan), tebal t"""
    bm = bmesh.new(); secs = []
    for i, p in enumerate(pts):
        tg = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized(); n = nrm(i) if nrm else V((0, 0, 1))
        n = (n - tg * n.dot(tg)).normalized(); b = tg.cross(n)
        secs.append([bm.verts.new(p + n * sw * w / 2 + b * st * t / 2) for sw, st in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for k in range(len(secs) - 1):
        for e in range(4): bm.faces.new((secs[k][e], secs[k][(e + 1) % 4], secs[k + 1][(e + 1) % 4], secs[k + 1][e]))
    bm.faces.new(secs[0][::-1]); bm.faces.new(secs[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return put(new_obj('ribbon', bm), mk)
def shell(o, t):   # beri ketebalan (cangkang terbuka)
    md = o.modifiers.new('sol', 'SOLIDIFY'); md.thickness = t; md.offset = 0
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier='sol'); return o
def hang(z_top, drop, can_r=.05, can_h=.025, mk='brass', xs=(0,), wire='cable', wr=.0015, can_box=None):
    """kabel dari z_top setinggi drop + kanopi bulat (atau kotak can_box=(sx,sy))"""
    for x in xs: cyl(wr, z_top, z_top + drop, wire, c=(x, 0), seg=10)
    if can_box: box(can_box[0], can_box[1], can_h, (sum(xs) / len(xs), 0, z_top + drop + can_h / 2), mk)
    else:
        for x in xs: cyl(can_r, z_top + drop, z_top + drop + can_h, mk, c=(x, 0))
ROT_Y = lambda a: mathutils.Matrix.Rotation(a, 3, 'Y')
ROT_X = lambda a: mathutils.Matrix.Rotation(a, 3, 'X')
ROT_Z = lambda a: mathutils.Matrix.Rotation(a, 3, 'Z')
TO_FRONT = ROT_X(math.pi / 2)    # sumbu Z lokal → −Y (menghadap depan)
TO_BACK = ROT_X(-math.pi / 2)    # sumbu Z lokal → +Y (ke dinding)

# ---------------------------------------------------------------- VOID (Y2)
def void_terra_s88():   # lampu lantai spiral ganda D25 × T135, alas bulat hitam
    cyl(.125, 0, .018, 'black', seg=64); cyl(.012, .018, .07, 'black')
    R, z0, z1, turns = .075, .07, 1.35, 1.15
    for ph in (0, math.pi):
        pts = [V((R * math.cos(ph + 2 * math.pi * turns * k / 120) * (.35 + .65 * min(1, k / 12)), R * math.sin(ph + 2 * math.pi * turns * k / 120) * (.35 + .65 * min(1, k / 12)), z0 + (z1 - z0) * k / 120)) for k in range(121)]
        rad = lambda i, P=pts: V((P[i].x, P[i].y, 0)).normalized() if V((P[i].x, P[i].y, 0)).length > 1e-4 else V((1, 0, 0))
        ribbon(pts, .024, .007, 'black', nrm=lambda i, P=pts: V((0, 0, 1)).cross(rad(i)).normalized())
        ribbon([p - rad(i) * .0045 for i, p in enumerate(pts)], .016, .003, 'led', nrm=lambda i, P=pts: V((0, 0, 1)).cross(rad(i)).normalized())
def void_sky_s7():   # gantung: terompet hitam D8,5, leher kuningan, total badan 21 cm
    lathe([(.0425, 0), (.041, .004), (.033, .015), (.022, .035), (.014, .06), (.0105, .085), (.0095, .10)], 'black', 64, cap=False); shell(PARTS[-1], .0015)
    lathe([(.04, .0015), (.032, .014), (.021, .034), (.0135, .058)], 'gold in', 64, cap=False)
    sphere(.014, (0, 0, .016), 'bulb'); cyl(.0095, .10, .21, 'brass'); hang(.21, .35)
def void_sky_s8():   # tetesan kristal D5 × 40 + topi kuningan runcing
    lathe([(0, 0), (.016, .004), (.024, .02), (.025, .035), (.021, .07), (.015, .14), (.0105, .24), (.008, .33), (.0065, .39), (0, .40)], 'crystal', 48)
    lathe([(.0075, .395), (.0095, .405), (.008, .42), (.0045, .44), (.0012, .465)], 'brass', 32); hang(.465, .3)
def void_cloud_gk_100():   # batang emas 81 × 8,5 × 4,5 berjarak 5,5 cm dari dinding, LED ke dinding
    box(.085, .045, .81, (0, -.0475, .405), 'brass', .002); box(.065, .003, .78, (0, -.0235, .405), 'led', 0)
    box(.03, .025, .06, (0, -.0125, .405), 'brass dark', .001)
def void_series_sky_b29():   # linear 140 × 3 × 5 kuningan, ujung silinder ø2 × 7,5, 2 kawat + kanopi bulat
    box(1.25, .03, .05, (0, 0, .025), 'brass', .002); box(1.2, .018, .002, (0, 0, -.0008), 'led', 0)
    for s in (-1, 1): cyl(.01, 0, .075, 'brass', axis=ROT_Y(s * math.pi / 2), base=(s * .625, 0, .025))
    hang(.05, .65, xs=(-.45, .45), wire='steel', wr=.001, can_r=.03, can_h=.02)
def void_sky_s9():   # batang kuningan + 7 bola opal (3 pasang + 1 bawah), L111 × W27
    cyl(.006, .06, 1.11, 'brass'); cyl(.05, 1.11, 1.13, 'brass')
    sphere(.06, (0, 0, 0), 'opal'); cyl(.012, .05, .075, 'brass')
    for k, z in enumerate((.22, .40, .58)):
        for s in (-1, 1):
            x = s * .075; sphere(.06, (x, (k % 2 - .5) * .01 * s, z), 'opal'); cyl(.005, 0, .02, 'brass', axis=ROT_Y(s * math.pi / 2), base=(0, 0, z)); cyl(.011, z - .006, z + .006, 'brass', c=(s * .02, 0))
def void_series_sky_w21():   # silinder ø6,5 × 37: bawah hitam bertekstur, celah ø4,5, atas kuningan; kop ø7,5
    cyl(.0325, 0, .165, 'stone', seg=48); cyl(.0225, .165, .21, 'black', seg=40); cyl(.0325, .21, .37, 'brass', seg=48)
    cyl(.022, -.002, 0, 'led', seg=32); hang(.37, .3, can_r=.0375, can_h=.02)
def void_cloud_bg7():   # lembaran hitam melengkung terpilin 10 × 48, tepi dalam bercahaya
    pts_e = []; bm = bmesh.new(); rows = []
    for k in range(49):
        z = .48 * k / 48; tw = math.radians(55) * math.sin(math.pi * (z / .48 - .5))
        row = []
        for i in range(13):
            a = math.radians(-80 + 160 * i / 12) + tw
            row.append(bm.verts.new((.05 * math.sin(a), -.05 - .05 * math.cos(a) + .05, z)))
        rows.append(row); pts_e.append(V(row[0].co) + V((0, -.002, 0)))
    for k in range(48):
        for i in range(12): bm.faces.new((rows[k][i], rows[k][i + 1], rows[k + 1][i + 1], rows[k + 1][i]))
    o = put(new_obj('daun', bm), 'black'); shell(o, .003)
    ribbon(pts_e, .006, .004, 'led', nrm=lambda i: V((1, 0, 0)))
    cyl(.012, 0, .03, 'black', axis=TO_BACK, base=(0, -.03, .24))
def void_series_sky_b10():   # marmer hijau 120 × 7 × 7 di atas pelat kuningan 150 × 8, 2 batang ke kanopi panjang
    mb = MARBLE(); box(1.5, .08, .008, (0, 0, .004), 'brass', .0015); box(1.46, .06, .002, (0, 0, -.0008), 'led', 0)
    o = box(1.2, .07, .07, (.15, 0, .043), 'black', .002); o.data.materials.clear(); o.data.materials.append(mb); uvbox(o, .6)
    for x in (-.25, .55): cyl(.004, .078, .62, 'brass', c=(x, 0), seg=12)
    box(.9, .05, .025, (.15, 0, .63), 'brass', .002)
def void_sky_vx1():   # kupu-kupu akrilik 17 × 17, badan & manik kuningan
    sphere(.016, (0, 0, .02), 'brass'); lathe([(0, -.01), (.012, .0), (.013, .02), (0, .035)], 'brass', 32)
    for s in (-1, 1):
        bm = bmesh.new(); c0 = bm.verts.new((0, 0, 0)); ring = []
        for i in range(19):
            a = math.radians(28 + 68 * i / 18); ring.append(bm.verts.new((s * .17 * math.cos(a), 0, .17 * math.sin(a))))
        for i in range(18): bm.faces.new((c0, ring[i], ring[i + 1]) if s > 0 else (c0, ring[i + 1], ring[i]))
        o = put(new_obj('sayap', bm), 'acryl', smooth=False); shell(o, .003)
        o.data.transform(mathutils.Matrix.Translation((0, 0, .02)) @ mathutils.Matrix.Rotation(s * math.radians(48), 4, 'Z'))
    for k in range(3): sphere(.011 - k * .001, (0, 0, .2 + k * .024), 'brass')
    cyl(.002, .035, .2, 'brass', seg=10); hang(.27, .3, can_r=.04)
def void_cloud_g8():   # dua kerucut hitam (jam pasir) ø16 × 40, dalam emas, lengan ke pelat bulat kuningan ø10
    yc = -.085
    for d in (1, -1):
        prof = [(.006, .2 + d * .012), (.08, .2 + d * .2)]
        lathe(prof if d > 0 else prof[::-1], 'black', 64, c=(0, yc, 0), cap=False); shell(PARTS[-1], .0015)
        lathe([(r * .97, z) for r, z in (prof if d > 0 else prof[::-1])], 'gold in', 64, c=(0, yc - 0, 0), cap=False)
        cyl(.012, .2 + d * .02 - .002, .2 + d * .02 + .002, 'bulb', c=(0, yc))
    sphere(.014, (0, yc, .2), 'brass'); cyl(.006, 0, .085, 'brass', axis=TO_BACK, base=(0, yc, .2)); cyl(.05, 0, .014, 'brass', axis=TO_BACK, base=(0, -.014, .2))
def void_cloud_sg1():   # lampu baca: pelat bulat kuningan ø8, tabung ø2,5 × 11 miring, sakelar hitam
    cyl(.04, 0, .015, 'brass', axis=TO_BACK, base=(0, -.015, .055), seg=48)
    ax = (ROT_Z(math.radians(-35)) @ ROT_X(math.radians(70)))   # Z lokal → depan-kanan sedikit turun
    cyl(.0125, 0, .11, 'brass', axis=ax, base=(0, -.015, .06)); tip = V((0, -.015, .06)) + ax @ V((0, 0, .11))
    cyl(.009, 0, .002, 'led', axis=ax, base=tuple(tip)); cyl(.006, 0, .006, 'black', axis=TO_FRONT, base=(-.02, -.015, .035))
def void_sky_vg1():   # bola kuningan ø20 terbuka di depan-bawah, bola opal menyembul; kanopi kuningan
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=.1)
    d = V((0, -.55, -.83)).normalized(); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.normalized().dot(d) > .62], context='VERTS')
    for v in bm.verts: v.co += V((0, 0, .1))
    o = put(new_obj('bola', bm), 'brass'); shell(o, .002)
    sphere(.085, tuple(V((0, 0, .1)) + d * .03), 'opal'); cyl(.008, .2, .225, 'brass'); hang(.225, .32)
def void_cloud_cl03():   # dua kaca buram ø10 (atas tinggi, bawah pendek) + cincin kuningan, total 34
    yc = -.07
    lathe([(0, .16), (.05, .16), (.05, .31), (.044, .33), (.03, .338), (0, .34)], 'frost', 48, c=(0, yc, 0))
    lathe([(0, 0), (.03, .002), (.044, .01), (.05, .03), (.05, .11), (0, .11)], 'frost', 48, c=(0, yc, 0))
    cyl(.047, .11, .16, 'brass', c=(0, yc), seg=48); cyl(.01, 0, .025, 'brass', axis=TO_BACK, base=(0, yc + .045, .135))
    box(.035, .012, .08, (0, -.006, .135), 'brass', .002)
def void_sky_v4():   # tabung kuningan ø2,5 × 45,7, LED di bawah
    cyl(.0125, 0, .457, 'brass'); cyl(.009, -.002, 0, 'led'); hang(.457, .3, can_r=.04, can_h=.018)
def void_cloud_az8():   # cincin emas ø28, cakram hitam di depan bawah, bola opal di atas; 28 × 48
    torus(.13, .005, (0, -.035, .3), 'brass', rot=ROT_X(math.pi / 2))
    cyl(.1, 0, .02, 'black', axis=TO_FRONT, base=(0, -.045, .14), seg=64); cyl(.07, 0, .003, 'led', axis=TO_BACK, base=(0, -.045, .14), seg=48)
    sphere(.05, (0, -.035, .43 + .05), 'opal'); cyl(.006, .425, .44, 'brass', c=(0, -.035))
    cyl(.012, 0, .025, 'black', axis=TO_BACK, base=(0, -.025, .14))
def void_series_sky_b8(n=3):   # rel hitam 140/180 × 2, n lampu emas 35 × 8,5 × 6 di bawah, kop hitam 60 × 6 × 3
    L = 1.4 if n == 3 else 1.8; box(L, .02, .02, (0, 0, .07), 'black', .002)
    for i in range(n):
        x = (i - (n - 1) / 2) * (L - .4) / max(1, n - 1) if n > 1 else 0
        box(.35, .085, .06, (x, 0, .03), 'brass', .003); box(.33, .065, .002, (x, 0, -.0008), 'led', 0); box(.02, .02, .02, (x, 0, .065), 'black', .001)
    hang(.08, .6, xs=(-.25, .25), wire='steel', wr=.001, can_box=(.6, .06), mk='black', can_h=.03)
def void_cloud_g2():   # setengah kerucut runcing 37 × 10 (bawah hitam, atas emas), dudukan bulat hitam
    prof = [(.05 * (1 - (k / 30) ** 1.6) + .002, .37 * k / 30) for k in range(31)]
    lo, hi = [p for p in prof if p[1] <= .16], [p for p in prof if p[1] >= .15]
    for part, mk in ((lo, 'black'), (hi, 'brass')):
        lathe(part, mk, 48, c=(0, -.035, 0), arc=(math.pi, 2 * math.pi), cap=False); shell(PARTS[-1], .002)
    box(.006, .004, .33, (0, -.03, .17), 'led', 0)
    cyl(.03, 0, .035, 'black', axis=TO_BACK, base=(0, -.035, .08), seg=40)
def void_series_cloud_g1():   # jam pasir kuningan 6 × 5,5 × 35,5 (tengah ø2,5), LED atas & bawah
    yc = -.035; prof = [(.03 - .0175 * math.sin(math.pi * k / 24), .355 * k / 24) for k in range(25)]
    lathe(prof, 'brass', 48, c=(0, yc, 0))
    for z in (-.001, .3551): cyl(.022, z, z + .002, 'led', c=(0, yc), seg=32)
    box(.025, .012, .05, (0, -.006, .1775), 'brass dark', .001)

_mb = []
def MARBLE():   # material marmer hijau dari model B9 (tekstur sama)
    if _mb: return _mb[0]
    f = os.path.join(root, 'assets/items/void-series-sky-b9/model.glb'); before = set(bpy.data.materials)
    bpy.ops.import_scene.gltf(filepath=f)
    m = next((x for x in bpy.data.materials if x not in before and 'marmer' in x.name.lower()), None) or M('stone')
    for o in [o for o in bpy.context.scene.objects if o not in PARTS and o.type == 'MESH']: bpy.data.objects.remove(o)
    m['role'] = 'baked'; _mb.append(m); return m
def uvbox(o, s):
    bm = bmesh.new(); bm.from_mesh(o.data); lay = bm.loops.layers.uv.verify()
    for f in bm.faces:
        nx, ny, nz = (abs(c) for c in f.normal)
        for l in f.loops:
            co = l.vert.co; u, v = (co.y, co.z) if nx > max(ny, nz) else (co.x, co.z) if ny > nz else (co.x, co.y); l[lay].uv = ((u + 1) / s, (v + 1) / s)
    bm.to_mesh(o.data); bm.free()

BUILD = {
    'void-terra-s88': void_terra_s88, 'void-sky-s7': void_sky_s7, 'void-sky-s8': void_sky_s8, 'void-cloud-gk-100': void_cloud_gk_100,
    'void-series-sky-b29': void_series_sky_b29, 'void-sky-s9': void_sky_s9, 'void-series-sky-w21': void_series_sky_w21, 'void-cloud-bg7': void_cloud_bg7,
    'void-series-sky-b10': void_series_sky_b10, 'void-sky-vx1': void_sky_vx1, 'void-cloud-g8': void_cloud_g8, 'void-cloud-sg1': void_cloud_sg1,
    'void-sky-vg1': void_sky_vg1, 'void-cloud-cl03': void_cloud_cl03, 'void-sky-v4': void_sky_v4, 'void-cloud-az8': void_cloud_az8,
    'void-series-sky-b8': lambda: void_series_sky_b8(3), 'void-series-sky-b8|4': lambda: void_series_sky_b8(4),
    'void-cloud-g2': void_cloud_g2, 'void-series-cloud-g1': void_series_cloud_g1,
}
# ---------------------------------------------------------------- AETHER + OZ (Y3)
def tube(pts, r, mk, seg=12):   # tabung bulat sepanjang titik
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        tg = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = V((0, 0, 1)) if abs(tg.z) < .9 else V((1, 0, 0)); n = tg.cross(a).normalized(); b = tg.cross(n)
        rings.append([bm.verts.new(p + (n * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg): bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return put(new_obj('tube', bm), mk)
def bar_between(a, b, w, t, mk, up=V((0, -1, 0))):   # batang persegi dari a ke b (lebar w ke arah up, tebal t)
    a, b = V(a), V(b); d = (b - a); L = d.length; d.normalize(); n = (up - d * up.dot(d)).normalized(); s = d.cross(n)
    bm = bmesh.new(); vs = []
    for e in (0, L):
        for sw, st in ((-1, -1), (1, -1), (1, 1), (-1, 1)): vs.append(bm.verts.new(a + d * e + n * sw * w / 2 + s * st * t / 2))
    for k in range(4): bm.faces.new((vs[k], vs[(k + 1) % 4], vs[4 + (k + 1) % 4], vs[4 + k]))
    bm.faces.new(vs[:4][::-1]); bm.faces.new(vs[4:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return put(new_obj('bar', bm), mk, smooth=False)
M_EXTRA = {'wood': ('teak wood', '#b98652', 0, .62, None), 'walnut': ('walnut end', '#6b3f24', 0, .55, None), 'cement': ('grey cement', '#6e6c69', 0, .92, None),
           'fabric w': ('opal fabric shade', '#efe9df', 0, .9, '#ffe2b8'), 'fabric b': ('black fabric', '#1b1b1b', 0, .9, None)}
_M0 = M
def M(key):
    if key in M_EXTRA and key not in MATS:
        s = M_EXTRA[key]; m = bpy.data.materials.new(s[0]); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(s[1]), 1); b.inputs['Metallic'].default_value = s[2]; b.inputs['Roughness'].default_value = s[3]
        if s[4]: b.inputs['Emission Color'].default_value = (*lin(s[4]), 1); b.inputs['Emission Strength'].default_value = 1.2
        m['role'] = 'baked'; MATS[key] = m
    return _M0(key)

def linear_pendant(L, W, H, ends=None, drop=.6, can=(.6, .04, .025), rnd=.004):   # batang linear hitam + diffuser bawah
    box(L, W, H, (0, 0, H / 2), 'black', rnd); box(L - .02, W - .012, .002, (0, 0, -.0008), 'led', 0)
    if ends:
        for s in (-1, 1): box(.012, W + .001, H + .001, (s * (L / 2 - .006), 0, H / 2), ends, .001)
    hang(H, drop, xs=(-L * .3, L * .3), wire='steel', wr=.001, can_box=(can[0], can[1]), can_h=can[2], mk='black')
def aether_series_sky_b83(): linear_pendant(1.8, .04, .04, ends='walnut', can=(.6, .04, .03))
def aether_sky_r150(): linear_pendant(1.2, .15, .055, rnd=.012, can=(.12, .04, .02))
def aether_sky_r100(): linear_pendant(1.2, .10, .04, rnd=.01, can=(.12, .04, .02))
def aether_cloud_sq2():   # alas persegi hitam + kepala kubus diputar 45°, lensa di depan
    box(.06, .04, .12, (0, -.02, .06), 'black', .003)
    o = box(.085, .085, .085, (0, 0, 0), 'black', .004)
    T = mathutils.Matrix.Translation((.0, -.085, .085)) @ mathutils.Matrix.Rotation(math.radians(18), 4, 'Z') @ mathutils.Matrix.Rotation(math.radians(45), 4, 'Y')
    o.data.transform(T)
    lens_ax = (mathutils.Matrix.Rotation(math.radians(18), 3, 'Z') @ TO_FRONT)
    tip = V((0, -.085, .085)) + lens_ax @ V((0, 0, .0425))
    cyl(.027, 0, .004, 'black', axis=lens_ax, base=tuple(tip)); cyl(.02, .004, .006, 'bulb', axis=lens_ax, base=tuple(tip))
def wall_bar(L, W, D, gap=.015, back='led', vertical=True):   # batang dinding hitam, LED di belakang (sapuan dinding)
    box(W, D, L, (0, -gap - D / 2, L / 2), 'black', .002); box(W * .7, .002, L - .02, (0, -gap + .001, L / 2), back, 0)
    box(W * .5, gap, .05, (0, -gap / 2, L / 2), 'black', .001)
def aether_series_cloud_r7(L=1.7): wall_bar(L, .05, .01, .03)
def aether_series_cloud_rx7(): wall_bar(1.0, .08, .01, .03)
def aether_cloud_ae2():   # kerikil hitam asimetris 20 × 20 × 10, cahaya ke dinding di belakang
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1)
    for v in bm.verts:
        x, y, z = v.co; v.co = V((x * .1 * (1 + .12 * z), y * .018, z * .095))
    o = put(new_obj('kerikil', bm), 'black'); o.data.transform(mathutils.Matrix.Translation((0, -.075, .1)) @ mathutils.Matrix.Rotation(math.radians(-14), 4, 'X') @ mathutils.Matrix.Rotation(math.radians(10), 4, 'Y'))
    cyl(.07, 0, .003, 'led', axis=TO_BACK, base=(0, -.058, .1), seg=48); cyl(.015, 0, .058, 'black', axis=TO_BACK, base=(0, -.058, .1))
def aether_series_cloud_m1():   # batang hitam 100,5 × ø1,5 + pelat oval hitam 14 × 6 × 3 + tanduk emas
    yc = -.03; cyl(.0075, 0, 1.005, 'black', c=(0, yc)); box(.004, .002, .98, (0, yc + .0078, .5025), 'led', 0)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=20, radius=1)
    for v in bm.verts: v.co = V((v.co.x * .03, v.co.y * .015, v.co.z * .07))
    o = put(new_obj('pelat', bm), 'black'); o.data.transform(mathutils.Matrix.Translation((0, yc + .005, .46)))
    for s in (-1, 1):   # tanduk: batang utama + dua cabang
        base = V((0, yc - .012, .47)); p1 = base + V((s * .03, -.004, .05)); p2 = p1 + V((s * .02, 0, .045))
        tube([base, p1, p2], .0028, 'brass', 10); tube([p1, p1 + V((s * .035, -.002, .012))], .0022, 'brass', 8); tube([base + V((s * .012, 0, .02)), base + V((s * .045, -.003, .03))], .002, 'brass', 8)
    cyl(.012, 0, .03, 'black', axis=TO_BACK, base=(0, yc, .46))
def aether_cloud_ae8():   # cakram semen abu ø16 + bola opal ø12 di depan kanan
    cyl(.08, 0, .035, 'cement', axis=TO_FRONT, base=(-.02, -.0, .1), seg=64); sphere(.06, (.035, -.095, .1), 'opal')
    cyl(.012, 0, .04, 'brass dark', axis=TO_FRONT, base=(.02, -.03, .1))
def aether_sky_v3():   # piringan hitam ø30 dengan leher runcing, LED di bawah
    lathe([(0, 0), (.15, 0), (.149, .005), (.04, .02), (.012, .07), (.006, .19), (.004, .2), (0, .2)], 'black', 64)
    cyl(.14, -.002, 0, 'led', seg=64); hang(.2, .35, can_r=.035, can_h=.015, mk='black')
def aether_cloud_b83():   # lengan kotak hitam di dinding + lampu kotak 31 × 4,5 × 7,5 berputar, ujung kayu, LED depan
    box(.15, .045, .045, (-.05, -.0225, .1), 'black', .002)
    yc = -.045 - .04; R = mathutils.Matrix.Rotation(math.radians(-32), 4, 'Y')
    parts = [box(.31, .075, .045, (0, 0, 0), 'black', .002), box(.012, .076, .046, (.155, 0, 0), 'walnut', .001), box(.012, .076, .046, (-.155, 0, 0), 'walnut', .001), box(.28, .002, .03, (0, -.038, 0), 'led', 0)]
    for o in parts: o.data.transform(mathutils.Matrix.Translation((.04, yc, .1)) @ R)
def aether_terra_x3():   # alas silinder hitam, tiang ramping, kepala piringan ø20 dengan LED bawah; T135
    cyl(.05, 0, .2, 'black', seg=48); cyl(.008, .2, 1.3, 'black'); cyl(.012, 1.1, 1.32, 'black')
    cyl(.1, 1.32, 1.35, 'black', seg=64); cyl(.085, 1.318, 1.32, 'led', seg=48)
def oz(shade='w'):   # rangka kayu jati 30 × 30 × 130 (batang 3 × 3, silang jam pasir) + kap drum ø45 × 20
    a, h, t = .15, 1.3, .03; C = [V((-a, -a, 0)), V((a, -a, 0)), V((a, a, 0)), V((-a, a, 0))]
    for z in (t / 2, h - t / 2):
        for i in range(4): bar_between(C[i] + V((0, 0, z)), C[(i + 1) % 4] + V((0, 0, z)), t, t, 'wood', up=V((0, 0, 1)))
    for i in range(4): bar_between(C[i] + V((0, 0, t)), C[(i + 2) % 4] + V((0, 0, h - t)), t, t, 'wood', up=V((0, 0, 1)))
    cyl(.008, h - .03, h + .02, 'brass dark'); sk = 'fabric w' if shade == 'w' else 'fabric b'
    lathe([(.225, h), (.225, h + .2)], sk, 72, cap=False); shell(PARTS[-1], .003)
    lathe([(.218, h + .002), (.218, h + .198)], 'fabric w' if shade == 'w' else 'gold in', 72, cap=False)
    sphere(.03, (0, 0, h + .07), 'bulb')
def aether_sky_v1_ceiling_lamp():   # kap drum kain hitam ø45 × 20, leher emas, LED bawah
    lathe([(.225, 0), (.225, .2)], 'fabric b', 72, cap=False); shell(PARTS[-1], .003)
    lathe([(.218, .002), (.218, .198)], 'gold in', 72, cap=False); cyl(.2, .02, .022, 'led', seg=64)
    cyl(.01, .2, .26, 'brass'); hang(.26, .4, can_r=.05, can_h=.02, mk='black')
def aether_series_sky_v2():   # piringan datar hitam ø35 × 4, leher emas, LED bawah, batang ke kanopi bulat
    lathe([(0, 0), (.175, 0), (.175, .03), (.16, .04), (0, .04)], 'black', 72); cyl(.16, -.002, 0, 'led', seg=64)
    cyl(.012, .04, .1, 'brass'); hang(.1, .45, can_r=.05, can_h=.02, mk='black', wr=.003, wire='black')
def aether_terra_x4():   # lampu busur: alas bulat ø32, tiang + busur, kap drum hitam menggantung; T180
    cyl(.16, 0, .025, 'black', seg=64); cyl(.012, .025, 1.25, 'black')
    pts = [V((-.8 * (1 - math.cos(math.pi / 2 * k / 30)) * .9, 0, 1.25 + .55 * math.sin(math.pi / 2 * k / 30))) for k in range(31)]
    pts += [V((-.72 - .1 * math.sin(math.pi / 2 * k / 10), 0, 1.8 - .1 * (1 - math.cos(math.pi / 2 * k / 10)))) for k in range(1, 11)]
    tube(pts, .007, 'black', 10); tip = pts[-1]
    lathe([(.16, tip.z - .27), (.16, tip.z - .09)], 'fabric b', 64, c=(tip.x, 0, 0), cap=False); shell(PARTS[-1], .003)
    lathe([(.155, tip.z - .268), (.155, tip.z - .092)], 'gold in', 64, c=(tip.x, 0, 0), cap=False)
    cyl(.006, tip.z - .1, tip.z, 'black', c=(tip.x, 0)); cyl(.14, tip.z - .2, tip.z - .198, 'led', c=(tip.x, 0), seg=48)
def aether_cloud_q1():   # cincin oval (stadion) hitam lebar 9 × tinggi 40 dengan LED dalam, kabel ke kanopi
    def stad(r, n=48):
        top = [V((r * math.cos(math.pi * k / n), 0, .358 + r * math.sin(math.pi * k / n))) for k in range(n + 1)]
        bot = [V((r * math.cos(math.pi + math.pi * k / n), 0, .042 + r * math.sin(math.pi + math.pi * k / n))) for k in range(n + 1)]
        P = top + bot; P.append(P[0]); return P
    tube(stad(.038), .0065, 'black', 12); tube([p + V((0, -.004, 0)) for p in stad(.031)], .0022, 'led', 8)
    hang(.4, .4, can_r=.04, can_h=.015, mk='black')
def aether_series_sky_z1():   # dua garis zig-zag hitam berlampu 140 × 20, kawat ke kop hitam
    for pts in ([(-.70, .18), (-.43, 0), (-.16, .18), (.0, .07)], [(-.04, 0), (.24, .2), (.48, 0), (.70, .18)]):
        P = [V((x, 0, z)) for x, z in pts]
        for a, b in zip(P, P[1:]):
            bar_between(a, b, .02, .02, 'black', up=V((0, -1, 0)))
            bar_between(a + V((0, 0, -.0105)), b + V((0, 0, -.0105)), .012, .002, 'led', up=V((0, -1, 0)))
        for p in (P[0], P[-1]): cyl(.001, p.z, .75, 'steel', c=(p.x, 0), seg=8)
    box(.3, .05, .03, (0, 0, .765), 'black', .002)
def aether_series_magnetic_track_light():   # rel magnet 100 cm + lampu grille, spotlight, floodlight (set peraga)
    box(1.0, .025, .06, (0, 0, .03), 'black', .002)
    box(.23, .026, .024, (-.28, 0, -.012), 'black', .001)
    for i in range(6): box(.025, .016, .004, (-.37 + i * .036, 0, -.025), 'bulb', 0)
    box(.315, .026, .024, (.22, 0, -.012), 'black', .001); box(.3, .016, .002, (.22, 0, -.025), 'led', 0)
    cyl(.004, -.02, 0, 'black', c=(-.02, 0)); cyl(.022, -.13, -.02, 'black', c=(-.02, 0), seg=32); cyl(.014, -.132, -.13, 'bulb', c=(-.02, 0))
    hang(.06, .25, xs=(-.4, .4), wire='steel', wr=.001, can_r=.02, can_h=.015, mk='black')

BUILD_Y3 = {
    'aether-series-sky-b83': aether_series_sky_b83, 'aether-sky-r150': aether_sky_r150, 'aether-sky-r100': aether_sky_r100, 'aether-cloud-sq2': aether_cloud_sq2,
    'aether-series-cloud-r7': lambda: aether_series_cloud_r7(1.7), 'aether-series-cloud-r7|100cm': lambda: aether_series_cloud_r7(1.0),
    'aether-series-cloud-rx7': aether_series_cloud_rx7, 'aether-cloud-ae2': aether_cloud_ae2, 'aether-series-cloud-m1': aether_series_cloud_m1,
    'aether-cloud-ae8': aether_cloud_ae8, 'aether-sky-v3': aether_sky_v3, 'aether-cloud-b83': aether_cloud_b83, 'aether-terra-x3': aether_terra_x3,
    'oz-floor-lamp-stand': lambda: oz('w'), 'oz-floor-lamp-stand|black': lambda: oz('b'), 'aether-sky-v1-ceiling-lamp': aether_sky_v1_ceiling_lamp,
    'aether-series-sky-v2': aether_series_sky_v2, 'aether-terra-x4': aether_terra_x4, 'aether-cloud-q1': aether_cloud_q1,
    'aether-series-sky-z1': aether_series_sky_z1, 'aether-series-magnetic-track-light': aether_series_magnetic_track_light,
}
BUILD.update(BUILD_Y3)

ids = list(BUILD) if which == ['all'] else which
for key in ids:
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); PARTS.clear(); _mb.clear()
    BUILD[key]()
    pid, var = (key.split('|') + [None])[:2]
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS: o.select_set(True)
    bpy.context.view_layer.objects.active = PARTS[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = pid
    out = os.path.join(root, 'assets/items', pid, 'model.glb' if not var else 'model-' + var + '.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_extras=True, export_image_format='WEBP')
    print('LAMP', key, 'cm', [round(x * 100, 1) for x in ob.dimensions], 'tris', sum(len(p.vertices) - 2 for p in ob.data.polygons), round(os.path.getsize(out) / 1024), 'KB', flush=True)
