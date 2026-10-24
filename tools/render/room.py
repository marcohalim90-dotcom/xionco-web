# ==========================================================================
#  XIONCO — ruang Galeri foto-realistis di Blender (Cycles)       [GA0 → GA2]
#  blender -b --factory-startup -P room.py -- --out <folder> [--size 1600x900]
#          [--samples 256] [--cam 0] [--preview] [--blend]
#
#  • Arsitektur dari skrip (lantai travertine, dinding plester hangat, balok kayu
#    plafon, jendela setinggi plafon berbingkai baja, lampu lis wall-wash + downlight).
#  • Bahan = pustaka CC0 lokal assets/library/textures (proyeksi kotak, tanpa UV),
#    dekorasi CC0 Poly Haven (assets/library/polyhaven), langit Blender bawaan.
#  • Produk XIONCO = GLB situs (assets/items/<id>/...), ukuran asli toko; bahan
#    ditingkatkan (kilau kain, marmer bertekstur, tepi dibulatkan saat render).
#  • --preview = EEVEE cepat untuk cek susunan; tanpa itu Cycles + OIDN.
# ==========================================================================
import bpy, sys, os, math, time
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEX = os.path.join(ROOT, 'assets', 'library', 'textures')
PH = os.path.join(ROOT, 'assets', 'library', 'polyhaven')
OUT = arg('out', os.path.join(ROOT, 'output', 'galeri', 'ga0'))
SIZE = [int(v) for v in str(arg('size', '1600x900')).lower().split('x')]
SAMPLES = int(arg('samples', 256))
PREVIEW = bool(arg('preview', False))
CAM = int(arg('cam', 0))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
col = sc.collection

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)

# ---------------------------------------------------------------- bahan
_img = {}
def img(path, data=False):
    if path not in _img:
        im = bpy.data.images.load(path, check_existing=True)
        if data: im.colorspace_settings.name = 'Non-Color'
        _img[path] = im
    return _img[path]

def tex_mat(name, tset, scale=1.0, tint=None, rough=None, rmul=1.0, nstr=0.6, metal=0.0, coat=0.0, sheen=0.0, bevel=0.0, rot=0.0):
    """Bahan PBR dari pustaka lokal, proyeksi kotak koordinat objek (meter)."""
    m = bpy.data.materials.new(name); nt = m.node_tree; N = nt.nodes; Lk = nt.links
    b = N.get('Principled BSDF')
    d = os.path.join(TEX, tset)
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / scale, 1 / scale, 1 / scale)
    mp.inputs['Rotation'].default_value[2] = math.radians(rot)
    Lk.new(tc.outputs['Object'], mp.inputs['Vector'])
    def t(fn, data):
        n = N.new('ShaderNodeTexImage'); n.image = img(os.path.join(d, fn), data)
        n.projection = 'BOX'; n.projection_blend = 0.25
        Lk.new(mp.outputs[0], n.inputs['Vector']); return n
    a = t('albedo.webp', False)
    if tint:
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
        mx.inputs['Factor'].default_value = 1.0
        Lk.new(a.outputs['Color'], mx.inputs['A']); mx.inputs['B'].default_value = srgb(tint)
        Lk.new(mx.outputs['Result'], b.inputs['Base Color'])
    else:
        Lk.new(a.outputs['Color'], b.inputs['Base Color'])
    if rough is not None:
        b.inputs['Roughness'].default_value = rough
    elif os.path.exists(os.path.join(d, 'rough.webp')):
        r = t('rough.webp', True)
        if rmul != 1.0:
            mm = N.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = rmul; mm.use_clamp = True
            Lk.new(r.outputs['Color'], mm.inputs[0]); Lk.new(mm.outputs[0], b.inputs['Roughness'])
        else:
            Lk.new(r.outputs['Color'], b.inputs['Roughness'])
    nrm_out = None
    if os.path.exists(os.path.join(d, 'normal.webp')) and nstr > 0:
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr
        Lk.new(t('normal.webp', True).outputs['Color'], nm.inputs['Color']); nrm_out = nm.outputs['Normal']
    if bevel > 0:
        bv = N.new('ShaderNodeBevel'); bv.inputs['Radius'].default_value = bevel; bv.samples = 6
        if nrm_out: Lk.new(nrm_out, bv.inputs['Normal'])
        nrm_out = bv.outputs['Normal']
    if nrm_out: Lk.new(nrm_out, b.inputs['Normal'])
    b.inputs['Metallic'].default_value = metal
    if coat: b.inputs['Coat Weight'].default_value = coat
    if sheen: b.inputs['Sheen Weight'].default_value = sheen
    return m

def flat_mat(name, hexc, rough=0.5, metal=0.0, emit=None, estr=0.0):
    m = bpy.data.materials.new(name); b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = srgb(hexc); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = srgb(emit); b.inputs['Emission Strength'].default_value = estr
    return m

def add_grout(m, w=1.2, h=0.6, gap=0.0045, col_hex='#a89880'):
    """Nat ubin: Brick Texture (offset 0) dikalikan ke warna + sedikit kasar di nat."""
    nt = m.node_tree; N = nt.nodes; Lk = nt.links; b = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); br = N.new('ShaderNodeTexBrick')
    br.offset = 0.5; br.squash = 1.0
    br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = gap
    br.inputs['Brick Width'].default_value = w; br.inputs['Row Height'].default_value = h
    br.inputs['Mortar Smooth'].default_value = 0.2
    br.inputs['Color1'].default_value = (1, 1, 1, 1); br.inputs['Color2'].default_value = (1, 1, 1, 1)
    br.inputs['Mortar'].default_value = srgb(col_hex)
    Lk.new(tc.outputs['Object'], br.inputs['Vector'])
    src = b.inputs['Base Color'].links[0].from_socket
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
    Lk.new(src, mx.inputs['A']); Lk.new(br.outputs['Color'], mx.inputs['B']); Lk.new(mx.outputs['Result'], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; bump.inputs['Distance'].default_value = 0.002
    Lk.new(br.outputs['Fac'], bump.inputs['Height'])
    if b.inputs['Normal'].links: Lk.new(b.inputs['Normal'].links[0].from_socket, bump.inputs['Normal'])
    Lk.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def sheer_mat(name, hexc):
    """Tirai linen tipis: tembus cahaya + sebagian transparan."""
    m = bpy.data.materials.new(name); nt = m.node_tree; N = nt.nodes; Lk = nt.links
    out = N.get('Material Output'); b = N.get('Principled BSDF')
    b.inputs['Base Color'].default_value = srgb(hexc); b.inputs['Roughness'].default_value = 0.9
    b.inputs['Sheen Weight'].default_value = 0.3
    tl = N.new('ShaderNodeBsdfTranslucent'); tl.inputs['Color'].default_value = srgb(hexc)
    tr = N.new('ShaderNodeBsdfTransparent')
    m1 = N.new('ShaderNodeMixShader'); m1.inputs['Fac'].default_value = 0.55
    Lk.new(b.outputs[0], m1.inputs[1]); Lk.new(tl.outputs[0], m1.inputs[2])
    m2 = N.new('ShaderNodeMixShader'); m2.inputs['Fac'].default_value = 0.35
    Lk.new(m1.outputs[0], m2.inputs[1]); Lk.new(tr.outputs[0], m2.inputs[2])
    Lk.new(m2.outputs[0], out.inputs['Surface'])
    return m

M = {
    'floor':  add_grout(tex_mat('lantai travertine', 'stone-travertine', 2.6, tint='#f1e7d8', rough=0.4, coat=0.12, rot=90)),
    'sheer':  sheer_mat('tirai linen', '#efe6d8'),
    'wall':   tex_mat('dinding plester', 'room-wall-limewash', 2.4, tint='#e9d9c4', rmul=1.1, nstr=0.35),
    'ceil':   tex_mat('plafon', 'room-wall-limewash', 3.0, tint='#eee2d2', rough=0.9, nstr=0.2),
    'beam':   tex_mat('balok kayu', 'x-kayu-ash-veneer', 1.2, tint='#9a7a5e', rmul=0.9, nstr=0.5, rot=90),
    'rug':    tex_mat('karpet', 'fabric-woven', 0.35, tint='#cdbda6', rough=0.95, nstr=0.8, sheen=0.4),
    'art':    tex_mat('lukisan tekstur', 'x-tembok-white-stucco-02', 0.9, tint='#8a7563', rough=0.85, nstr=2.2),
    'artfr':  flat_mat('bingkai lukisan', '#2a2420', 0.6),
    'steel':  flat_mat('baja jendela', '#1d1c1b', 0.35, 0.9),
    'outside': tex_mat('teras luar', 'x-batu-travertine-003', 1.4, tint='#e8dccb', rough=0.6),
    'led':    flat_mat('led', '#000000', 1.0, emit='#ffd9a8', estr=18.0),
    'shelf':  tex_mat('ambalan kayu', 'x-kayu-ash-veneer', 1.0, tint='#6e533d', rmul=0.8, nstr=0.4),
}

# ---------------------------------------------------------------- geometri
def box(name, x0, x1, y0, y1, z0, z1, mat):
    v = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob); me.materials.append(mat)
    return ob

# ruang: X kanan, Y menjauh dari kamera, Z atas (meter)
X0, X1, Y0, Y1, H = -3.6, 3.6, -4.0, 3.2, 3.3
T = 0.2
box('lantai', X0 - T, X1 + T, Y0 - T, Y1 + T, -0.1, 0, M['floor'])
box('teras', -400, X0 - T, -400, 400, -0.12, -0.02, M['outside'])          # teras luar sampai cakrawala
box('dinding taman', -11.5, -11.0, -30, 30, -0.1, 1.1, M['wall'])          # pagar taman rendah
box('plafon', X0 - T, X1 + T, Y0 - T, Y1 + T, H, H + 0.15, M['ceil'])
box('dinding belakang', X0 - T, X1 + T, Y1, Y1 + T, 0, H, M['wall'])
box('dinding depan', X0 - T, X1 + T, Y0 - T, Y0, 0, H, M['wall'])
box('dinding kanan', X1, X1 + T, Y0, Y1, 0, H, M['wall'])
# dinding kiri dengan jendela setinggi 2,9 m (y 0,0 … 2,8)
WY0, WY1, WZ = 0.0, 2.8, 2.9
box('dinding kiri a', X0 - T, X0, Y0, WY0, 0, H, M['wall'])
box('dinding kiri b', X0 - T, X0, WY1, Y1, 0, H, M['wall'])
box('dinding kiri atas', X0 - T, X0, WY0, WY1, WZ, H, M['wall'])
for y in (WY0, (WY0 + WY1) / 2, WY1):                                 # tiang baja
    box('mullion', X0 - 0.12, X0 - 0.07, y - 0.025, y + 0.025, 0, WZ, M['steel'])
for z in (0.0, 2.2, WZ - 0.04):
    box('transom', X0 - 0.12, X0 - 0.07, WY0, WY1, z, z + 0.04, M['steel'])
def curtain(name, ya, yb, folds_per_m=7, depth=0.045):
    n = max(8, int((yb - ya) * folds_per_m * 6)); verts = []; faces = []
    for i in range(n + 1):
        yy = ya + (yb - ya) * i / n
        xx = X0 + 0.16 + depth * math.sin(i / n * (yb - ya) * folds_per_m * 2 * math.pi)
        verts += [(xx, yy, 0.02), (xx, yy, WZ - 0.02)]
    for i in range(n): faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); col.objects.link(ob); me.materials.append(M['sheer'])
box('rel tirai', X0 + 0.08, X0 + 0.24, WY0 - 0.2, WY1 + 0.2, WZ - 0.02, WZ + 0.02, M['steel'])
curtain('tirai kanan', 1.5, WY1 + 0.15, folds_per_m=9)
curtain('tirai kiri', WY0 - 0.15, 0.45, folds_per_m=11)
# balok kayu plafon (arah X), tiap 0,75 m
y = Y0 + 0.4
while y < Y1 - 0.2:
    box('balok', X0, X1, y - 0.07, y + 0.07, H - 0.22, H, M['beam']); y += 0.75
# celah lampu wall-wash di atas dinding belakang: bibir plafon turun + strip LED tersembunyi
box('bibir plafon', X0, X1, Y1 - 0.32, Y1 - 0.26, H - 0.3, H, M['ceil'])
box('led belakang', X0 + 0.1, X1 - 0.1, Y1 - 0.25, Y1 - 0.2, H - 0.06, H - 0.04, M['led'])
# lukisan tekstur di atas sofa
box('lukisan', -0.55, 1.15, Y1 - 0.05, Y1, 1.15, 2.25, M['art'])
box('bingkai', -0.58, 1.18, Y1 - 0.035, Y1 - 0.001, 1.12, 2.28, M['artfr'])
# ambalan rendah di dinding kanan (konsol mengambang)
box('konsol', X1 - 0.42, X1, 0.3, 2.6, 0.38, 0.62, M['shelf'])

# ---------------------------------------------------------------- impor GLB → ditaruh di lantai
def place(path, loc, rot=0.0, scale=1.0, name=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    piv = bpy.data.objects.new(name or os.path.basename(os.path.dirname(path)), None); col.objects.link(piv)
    for o in new:
        if o.parent is None:
            mw = o.matrix_world.copy(); o.parent = piv; o.matrix_world = mw
    bpy.context.view_layer.update()
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in new:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    for o in piv.children:
        o.location -= Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    piv.scale = (scale,) * 3
    piv.rotation_euler = (0, 0, math.radians(rot))
    piv.location = Vector(loc)
    s = (hi - lo) * scale
    print('[room] %-28s %.2f x %.2f x %.2f m' % (piv.name, s.x, s.y, s.z))
    return piv, new

IT = os.path.join(ROOT, 'assets', 'items')
sofa, sofa_obs = place(os.path.join(IT, 'guise', 'model.glb'), (0.3, 2.68, 0), 0, name='GUISE 3 Seater')
table, table_obs = place(os.path.join(IT, 'eorde-coffee-table', 'model.glb'), (0.3, 1.45, 0), 0, name='EORDE coffee table')
lamp, _ = place(os.path.join(IT, 'aether-standing-side-floor-lamp', 'model.glb'), (1.72, 2.8, 0), 0, name='AETHER standing lamp')
plant, _ = place(os.path.join(PH, 'potted_plant_01', 'model.glb'), (-1.45, 2.75, 0), 20, name='tanaman')
vase, _ = place(os.path.join(PH, 'ceramic_vase_01', 'model.glb'), (0.55, 1.42, 0.0), 0, name='vas')
plant2, _ = place(os.path.join(PH, 'potted_plant_04', 'model.glb'), (X1 - 0.21, 0.75, 0.62), 0, name='tanaman kecil')
pil, pil_obs = place(os.path.join(PH, 'throw_pillows_01', 'throw_pillows_01_1k.gltf'), (-0.35, 2.66, 0.40), -8, name='bantal')
pil_m = tex_mat('bantal boucle', 'fabric-boucle', 0.25, tint='#cdbb9f', rough=0.95, nstr=1.0, sheen=0.5)
for o in pil_obs:
    if o.type == 'MESH':
        for sl in o.material_slots: sl.material = pil_m
box('karpet', -1.15, 1.75, 0.55, 2.55, 0, 0.012, M['rug'])

# vas di atas daun meja: tinggi meja dari batasnya
bpy.context.view_layer.update()
top = max((o.matrix_world @ Vector(c)).z for o in table_obs if o.type == 'MESH' for c in o.bound_box)
vase.location.z = top

# bahan produk ditingkatkan
for m in bpy.data.materials:
    if not m.node_tree: continue
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b: continue
    role = m.get('role', '')
    if role == 'fabric':
        b.inputs['Sheen Weight'].default_value = 0.35; b.inputs['Sheen Roughness'].default_value = 0.45
        b.inputs['Roughness'].default_value = 0.9
    nm = m.name.lower()
    if 'marmer' in nm:
        new = tex_mat('marmer meja', 'stone-carrara', 0.8, tint='#f3eee6', rough=0.18, coat=0.3, bevel=0.003)
        for o in table_obs:
            if o.type == 'MESH':
                for i, s in enumerate(o.material_slots):
                    if s.material == m: o.material_slots[i].material = new
    if 'kuningan' in nm:
        b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.28

# ---------------------------------------------------------------- cahaya
world = bpy.data.worlds.new('langit'); sc.world = world
wn = world.node_tree.nodes; wl = world.node_tree.links
bg = wn.get('Background') or wn.new('ShaderNodeBackground')
sky = wn.new('ShaderNodeTexSky')
SUN_EL, SUN_AZ = 26.0, 200.0                                   # matahari sore masuk dari jendela kiri
for st in ('MULTIPLE_SCATTERING', 'SINGLE_SCATTERING', 'NISHITA', 'HOSEK_WILKIE'):
    try: sky.sky_type = st; break
    except Exception: pass
try:
    sky.sun_disc = False; sky.sun_elevation = math.radians(SUN_EL); sky.sun_rotation = math.radians(SUN_AZ)
except Exception: pass
wl.new(sky.outputs[0], bg.inputs['Color']); bg.inputs['Strength'].default_value = float(arg('sky', 0.22))
# matahari: cahaya hangat menembus jendela kiri ke lantai & sofa
sun_d = bpy.data.lights.new('matahari', 'SUN'); sun_d.energy = 5.5; sun_d.angle = math.radians(0.9)
sun_d.color = (1.0, 0.86, 0.70)
sun = bpy.data.objects.new('matahari', sun_d); col.objects.link(sun)
el = math.radians(SUN_EL); dirv = Vector((math.cos(el) * 0.93, math.cos(el) * 0.37, -math.sin(el))).normalized()
sun.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
# portal jendela: Cycles mengarahkan sampel langit ke bukaan → interior cepat bersih
pd = bpy.data.lights.new('portal', 'AREA'); pd.shape = 'RECTANGLE'; pd.size = WY1 - WY0; pd.size_y = WZ
try: pd.cycles.is_portal = True
except Exception: pass
po = bpy.data.objects.new('portal', pd); col.objects.link(po)
po.location = (X0 - 0.1, (WY0 + WY1) / 2, WZ / 2); po.rotation_euler = (0, math.radians(90), 0)
# downlight sorot ke dinding belakang (scallop) dan lampu isi hangat lembut
def spot(name, loc, aim, energy, size=0.06, blend=0.6, ang=70):
    d = bpy.data.lights.new(name, 'SPOT'); d.energy = energy; d.shadow_soft_size = size
    d.spot_size = math.radians(ang); d.spot_blend = blend; d.color = (1.0, 0.82, 0.62)
    o = bpy.data.objects.new(name, d); col.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
for x in (-1.9, 0.3, 2.5):
    spot('downlight', (x, Y1 - 0.45, H - 0.23), (x, Y1, 0.6), 120)
spot('downlight konsol', (X1 - 0.5, 1.45, H - 0.23), (X1, 1.45, 0.5), 90)
fl = bpy.data.lights.new('isi', 'AREA'); fl.shape = 'RECTANGLE'; fl.size = 4.0; fl.size_y = 3.0; fl.energy = 60
fl.color = (1.0, 0.9, 0.78)
fo = bpy.data.objects.new('isi', fl); col.objects.link(fo); fo.location = (0.2, -1.0, H - 0.25)

# ---------------------------------------------------------------- kamera (tetap tegak: garis vertikal lurus)
CAMS = [
    {'pos': (2.55, -1.75, 1.32), 'look': (-1.1, 2.5), 'lens': 22, 'shift': 0.04},
    {'pos': (-1.75, -2.3, 1.38), 'look': (0.55, 2.6), 'lens': 21, 'shift': 0.03},
    {'pos': (1.55, 0.35, 1.05), 'look': (-0.2, 2.75), 'lens': 35, 'shift': -0.06},
    {'pos': (2.2, -0.9, 1.30), 'look': (-0.4, 2.4), 'lens': 24, 'shift': 0.02},
]
cv = CAMS[CAM % len(CAMS)]
cd = bpy.data.cameras.new('kamera'); cd.lens = cv['lens']; cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.shift_y = cv['shift']
cam = bpy.data.objects.new('kamera', cd); col.objects.link(cam); sc.camera = cam
cam.location = cv['pos']
fwd = Vector((cv['look'][0] - cv['pos'][0], cv['look'][1] - cv['pos'][1], 0)).normalized()
cam.rotation_euler = (math.radians(90), 0, math.atan2(-fwd.x, fwd.y))
cd.clip_start = 0.05; cd.clip_end = 100

# ---------------------------------------------------------------- render
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
vs = sc.view_settings
try: vs.view_transform = 'AgX'
except Exception: pass
for lk in ('AgX - Medium High Contrast', 'Medium High Contrast', 'None'):
    try: vs.look = lk; break
    except Exception: pass
vs.exposure = float(arg('exposure', 0.0))
try:
    vs.use_white_balance = True; vs.white_balance_temperature = float(arg('wb', 7600)); vs.white_balance_tint = 0
except Exception as e: print('[room] white balance n/a', e)
if PREVIEW:
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    try: sc.eevee.taa_render_samples = 32; sc.eevee.use_raytracing = True
    except Exception: pass
else:
    sc.render.engine = 'CYCLES'; cy = sc.cycles; cy.device = 'CPU'
    cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.015
    cy.use_denoising = True
    try: cy.denoiser = 'OPENIMAGEDENOISE'; cy.denoising_prefilter = 'ACCURATE'
    except Exception: pass
    cy.max_bounces = 10; cy.diffuse_bounces = 4; cy.glossy_bounces = 3; cy.transmission_bounces = 6
    cy.transparent_max_bounces = 8; cy.sample_clamp_indirect = 8.0; cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    sc.render.threads_mode = 'AUTO'
if arg('blend'):
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'ruang.blend'))
t0 = time.time()
bpy.ops.render.render(write_still=False)
dt = time.time() - t0
base = os.path.join(OUT, ('preview' if PREVIEW else 'render') + '-cam%d' % CAM)
ims = sc.render.image_settings
ims.file_format = 'PNG'; ims.color_mode = 'RGB'; ims.color_depth = '8'
bpy.data.images['Render Result'].save_render(filepath=base + '.png', scene=sc)
try:
    ims.file_format = 'WEBP'; ims.quality = 88
    bpy.data.images['Render Result'].save_render(filepath=base + '.webp', scene=sc)
except Exception as e:
    print('[room] webp gagal', e)
print('[room] %s %dx%d sampel %d: %.1f s' % ('EEVEE' if PREVIEW else 'Cycles CPU', SIZE[0], SIZE[1], SAMPLES, dt), flush=True)
