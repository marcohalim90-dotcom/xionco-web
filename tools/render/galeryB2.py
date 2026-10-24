# ==========================================================================
#  XIONCO — Galeri versi B2 · "Malam Marmer" (23 Okt 2026) — konsep LAWAN dari B1 (siang, kayu, pasir): galeri malam hotel mewah.
#  Ide: XIONCO sebagai rumah mode furnitur → galeri malam ala lobi hotel kelas atas: lantai marmer hitam mengilap (pantulan),
#  dinding calacatta, kolom & lis kuningan sampanye, ROTUNDA berkubah dengan oculus (cahaya bulan) + lampu gantung kristal
#  di atas KOLAM PANTUL, lalu lorong MEMBELOK 25° (ruang berikut miring — seperti kesepakatan "B") ke salon beludru zamrud
#  berperapian, berakhir di suite dengan ranjang di ceruk walnut. Semua cahaya 2700K + bulan 5000K dari oculus.
#  Kamera: dolly kecepatan tetap, jalur Bezier halus melewati rotunda (kolam & lampu gantung di sisi kiri), arah pandang
#  hanya berputar SATU arah (0° → +25°, monoton), tanpa zoom.
#  Furnitur katalog: CANIS (Grand Zen), 2 KYRIOS 1S, ASTRAL 1S ×2, CUBIX CT, PLUQ, POEL, ASHARA 54 ×2, SYME, AETHER lampu lantai,
#  NORA bar stool ×3 (bar kecil di rotunda) + aset CC0 Poly Haven (lampu gantung kristal, vas, meja bundar, tanaman) + CC-BY (lampu dinding, lampu meja).
#  Pakai:  blender -b --factory-startup -P tools/render/galeryB2.py -- [--size 1600x900] [--samples 96] [--frames 0-199] [--shots 0,70,130,190] [--top]
# ==========================================================================
import bpy, sys, os, math, time, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib as R
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galeryB2'))
SIZE = [int(v) for v in str(arg('size', '1600x900')).lower().split('x')]
SAMPLES = int(arg('samples', 96)); NF = int(arg('nf', 200))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
c = bpy.data.collections.new('galeryB2'); sc.collection.children.link(c)
B = lambda *a, **k: R.box(c, *a, **k)
rnd = random.Random(11)
K27 = R.kelvin(2700); K30 = R.kelvin(3000); MOON = R.kelvin(5200)

# ---------------------------------------------------------------- bahan: dasar marmer hitam & calacatta · tinta walnut · aksen kuningan sampanye & beludru zamrud
M = {
    'nero':   R.tex_mat('marmer nero', 'stone-nero', 2.4, tint='#2a2a2c', rough=0.08, coat=0.6, nstr=0.1, hsv=(0.5, 0.2, 1.1)),
    'cala':   R.tex_mat('marmer calacatta', 'stone-calacatta', 2.8, tint='#e8e3da', rough=0.16, coat=0.35, nstr=0.15, hsv=(0.5, 0.6, 1.05)),
    'calaD':  R.tex_mat('calacatta gelap', 'stone-calacatta', 2.8, tint='#cfc9bd', rough=0.2, coat=0.3, nstr=0.15, hsv=(0.5, 0.7, 0.95)),
    'plaster': R.tex_mat('plester gelap', 'room-wall-limewash', 2.4, tint='#5a534b', rmul=1.0, nstr=0.5, hsv=(0.5, 0.1, 1.0)),
    'ceil':   R.tex_mat('plafon gelap', 'room-wall-limewash', 3.0, tint='#3c3733', rough=0.9, nstr=0.2),
    'walnut': R.tex_mat('walnut', 'ph-smoked_walnut_veneer', 1.1, tint='#5e3d2a', rmul=0.75, nstr=0.4, coat=0.25),
    'walnutV': R.tex_mat('walnut tegak', 'ph-smoked_walnut_veneer', 1.1, tint='#5e3d2a', rmul=0.75, nstr=0.4, coat=0.25, rot=90),
    'brass':  R.flat_mat('kuningan sampanye', '#c9a76a', 0.22, 1.0),
    'brassD': R.flat_mat('kuningan tua', '#8f6f3e', 0.3, 1.0),
    'black':  R.flat_mat('baja hitam', '#141313', 0.4, 0.8),
    'velvet': R.tex_mat('beludru zamrud', 'fabric-velvet', 0.35, tint='#1e5a45', rough=0.75, nstr=0.8, sheen=0.9, hsv=(0.5, 0.2, 1.2)),
    'velvetB': R.tex_mat('beludru burgundy', 'fabric-velvet', 0.35, tint='#5a1f2a', rough=0.75, nstr=0.8, sheen=0.9, hsv=(0.5, 0.2, 1.2)),
    'leather': R.tex_mat('kulit cognac', 'leather-fine', 0.4, tint='#6e4428', rough=0.5, nstr=0.6),
    'led27':  R.emit_mat('led 2700K', K27, 10.0),
    'fire':   R.emit_mat('bara api', (1.0, 0.38, 0.08), 0.9),
    'candle': R.emit_mat('nyala lilin', (1.0, 0.6, 0.25), 30.0),
    'linen':  R.tex_mat('linen gading', 'fabric-linen', 0.3, tint='#ddd3c2', rough=0.92, nstr=0.9, sheen=0.4, hsv=(0.5, 0.0, 1.4)),
}
# kaca & air: tembus untuk sinar bayangan (kaustik mati)
def glassy(name, hexc, rough, ior=1.5):
    m = R.flat_mat(name, hexc, rough); nt = m.node_tree; N = nt.nodes; b = N.get('Principled BSDF')
    b.inputs['Transmission Weight'].default_value = 1.0; b.inputs['IOR'].default_value = ior
    out = N.get('Material Output'); lp = N.new('ShaderNodeLightPath'); tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
    nt.links.new(b.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs['Fac']); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m, b, nt
M['glass'], _, _ = glassy('kaca', '#ffffff', 0.02)
M['water'], wb_, wnt = glassy('air kolam', '#dfe9e6', 0.01, 1.33)
nz = wnt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 14.0; nz.inputs['Detail'].default_value = 6
bp = wnt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.06; bp.inputs['Distance'].default_value = 0.01
wnt.links.new(nz.outputs['Fac'], bp.inputs['Height']); wnt.links.new(bp.outputs['Normal'], wb_.inputs['Normal'])

# ---------------------------------------------------------------- alat: bingkai koordinat berputar (ruang yang miring), aksesori
def transform_new(before, origin, ang_deg):
    """Semua objek yang dibuat sesudah `before` diputar ang° di sekitar (0,0) lalu dipindah ke origin (ruang miring)."""
    rz = Matrix.Rotation(math.radians(ang_deg), 4, 'Z'); o3 = Vector((origin[0], origin[1], 0))
    for o in [o for o in bpy.data.objects if o not in before and o.parent is None]:
        o.matrix_world = Matrix.Translation(o3) @ rz @ o.matrix_world
SKF = os.path.join(R.ROOT, 'data', 'source', 'render-lib', 'sketchfab')
def skf(name): return os.path.join(SKF, name, name + '.glb')
def put(pid, x, y, rot=0.0, z=0.0, **kw): return R.place(c, pid, (x, y, z), rot, **kw)
def rug(cx, cy, w, d, hexc, tset='ph-poly_wool_herringbone', rot=0.0, hsv=(0.5, 0.15, 1.1)):
    ob = B('karpet', -w / 2, w / 2, -d / 2, d / 2, 0, 0.016, R.tex_mat('karpet ' + hexc, tset, 0.45, tint=hexc, rough=0.97, nstr=1.0, sheen=0.5, hsv=hsv), bevel=0.007)
    ob.location = (cx, cy, 0); ob.rotation_euler.z = math.radians(rot); return ob
def pot(x, y, hexc='#2b2a28', r=0.26, h=0.5):
    return R.pot(c, 'pot', x, y, r, r * 0.82, h, R.tex_mat('pot ' + hexc, 'ph-clay_plaster', 0.5, tint=hexc, rough=0.6, nstr=0.5, hsv=(0.5, 0.2, 1.1)))
def plant(kind, x, y, h, pot_hex='#2b2a28', r=0.25, rot=0, pick='_a'):
    ph = pot(x, y, pot_hex, r, r * 1.9); R.place(c, kind, (x, y, ph - 0.03), rot, fit=('z', h), pick=pick)
def column(x, y, h, r=0.2):
    R.cyl(c, 'alas kolom', x, y, 0, 0.12, r + 0.1, M['black'], seg=48); R.cyl(c, 'kolom', x, y, 0.12, h - 0.14, r, M['brass'], seg=64)
    R.cyl(c, 'kepala kolom', x, y, h - 0.14, h, r + 0.08, M['brassD'], seg=48)
    R.spot(c, 'sorot kolom', (x, y, 0.14), (x, y, h), 120, K27, size=0.03, ang=40, blend=0.8)
def wall_light(x, y, z, rot, side_vec):
    try: R.place(c, skf('wall_light'), (x, y, z), rot, fit=('x', 0.56))
    except Exception as e: print('[B2] wall light', e)
    R.spot(c, 'cahaya dinding', (x + side_vec[0] * 0.12, y + side_vec[1] * 0.12, z + 0.1), (x - side_vec[0] * 0.05, y - side_vec[1] * 0.05, z + 1.4), 90, K27, size=0.03, ang=80, blend=0.9)
    R.spot(c, 'cahaya dinding bawah', (x + side_vec[0] * 0.12, y + side_vec[1] * 0.12, z - 0.1), (x - side_vec[0] * 0.05, y - side_vec[1] * 0.05, z - 1.4), 70, K27, size=0.03, ang=80, blend=0.9)
def painting(cx, cy, zc, w, h, rot, tset, tint, side_vec):
    """Lukisan berbingkai kuningan di dinding; rot = putaran bidang (0 = bidang menghadap −Y)."""
    before = set(bpy.data.objects)
    B('bingkai', -w / 2 - 0.035, w / 2 + 0.035, -0.04, 0.0, zc - h / 2 - 0.035, zc + h / 2 + 0.035, M['brassD'], bevel=0.004)
    B('kanvas', -w / 2, w / 2, -0.041, -0.04, zc - h / 2, zc + h / 2, R.tex_mat('lukisan ' + tset, tset, 1.0, tint=tint, rough=0.8, nstr=0.3))
    transform_new(before, (cx, cy), rot)
    R.spot(c, 'sorot lukisan', (cx + side_vec[0] * 0.9, cy + side_vec[1] * 0.9, 3.3), (cx, cy, zc), 140, K30, size=0.04, ang=42, blend=0.7)
def candles(x, y, z, n=3):
    for k in range(n):
        xx = x + rnd.uniform(-0.12, 0.12); yy = y + rnd.uniform(-0.1, 0.1); h = rnd.uniform(0.08, 0.2)
        R.cyl(c, 'lilin', xx, yy, z, z + h, 0.03, M['linen'], seg=20); R.cyl(c, 'api', xx, yy, z + h, z + h + 0.02, 0.006, M['candle'], seg=10)
        R.point(c, 'cahaya lilin', (xx, yy, z + h + 0.03), 1.6, (1.0, 0.6, 0.25), size=0.01)
def downlight(x, y, h, energy=150, ang=48, color=K27):
    R.cyl(c, 'cincin dl', x, y, h - 0.006, h, 0.055, M['black'], seg=24); R.cyl(c, 'cakram dl', x, y, h - 0.008, h - 0.006, 0.035, M['led27'], seg=24)
    R.spot(c, 'downlight', (x, y, h - 0.02), (x, y, 0), energy, color, size=0.02, ang=ang, blend=0.5)
def cove_rect(x0, x1, y0, y1, h, energy=20):
    for (xa, xb, ya, yb) in ((x0 + 0.15, x0 + 0.18, y0 + 0.3, y1 - 0.3), (x1 - 0.18, x1 - 0.15, y0 + 0.3, y1 - 0.3)):
        B('cove', xa, xb, ya, yb, h - 0.012, h, M['led27'])
        R.area(c, 'cahaya cove', ((xa + xb) / 2, (ya + yb) / 2, h - 0.03), (0, 0, 0), 0.08, yb - ya, energy * (yb - ya) / 6, color=K27, spread=140)

# ================================================================ RUANG 1 · VESTIBUL (y 0 – 7.2, lebar 6.4, tinggi 4.4): calacatta, pilaster kuningan bergaris, 2 ASTRAL kulit
VW, VH, VL = 6.4, 4.4, 7.2; HX = VW / 2
B('lantai vestibul', -HX - 0.3, HX + 0.3, -0.3, VL, -0.1, 0.0, M['nero'])
B('plafon vestibul', -HX - 0.3, HX + 0.3, -0.3, VL, VH, VH + 0.3, M['ceil'])
B('tembok awal', -HX - 0.3, HX + 0.3, -0.3, 0.0, 0.0, VH, M['cala'])
for sx in (-1, 1):
    B('tembok vestibul', sx * HX if sx > 0 else -HX - 0.3, HX + 0.3 if sx > 0 else -HX, 0.0, VL, 0.0, VH, M['cala'])
    # pilaster kuningan bergaris (fluted) 3 buah per sisi
    for yy in (1.4, 3.6, 5.8):
        R.flutes(c, 'pilaster', yy - 0.3, yy + 0.3, sx * (HX - 0.02), 0.1, VH - 0.1, M['brass'], pitch=0.04, depth=0.015, axis='y', facing=-sx)
        B('alas pilaster', sx * HX - (0.06 if sx > 0 else 0), sx * HX + (0 if sx > 0 else 0.06), yy - 0.34, yy + 0.34, 0, 0.1, M['black'])
    B('lis kuningan', sx * HX - (0.012 if sx > 0 else 0), sx * HX + (0 if sx > 0 else 0.012), 0, VL, 1.05, 1.08, M['brass'])    # lis dado kuningan
cove_rect(-HX, HX, 0.0, VL, VH, 50)
for xx in (-1.8, 1.8):
    for yy in (1.4, 3.6, 5.8): downlight(xx, yy, VH, 140)
try:
    put('astral', -2.3, 3.0, 55); put('astral', -2.3, 5.2, 125)
    tp, tob = R.place(c, 'coffee_table_round_01', (-2.25, 4.1, 0.0), 0, fit=('x', 0.7)); tp.scale.z *= 0.5 / tp['size'][2]
    R.place(c, 'brass_vase_01', (-2.25, 4.1, R.top_of(tob)), 0, fit=('z', 0.3))
except Exception as e: print('[B2] astral', e)
try: put('pluq', 2.35, 2.5, 90)                                                       # PLUQ sebagai meja konsol rendah di kanan
except Exception as e: print('[B2] pluq', e)
R.place(c, 'ceramic_vase_03', (2.35, 2.1, 0.48), 0, fit=('z', 0.34)); candles(2.35, 2.9, 0.48, 3)
painting(HX - 0.02, 4.6, 1.9, 1.5, 1.9, 90, 'x-tembok-wallpaper-002-c', '#6b5a4a', (-1, 0))
painting(-HX + 0.02, 1.6, 1.9, 1.1, 1.5, -90, 'x-kain-fabric-059', '#4a5a5a', (1, 0))
wall_light(HX - 0.02, 2.5, 1.95, 90, (-1, 0)); wall_light(-HX + 0.02, 6.4, 1.95, -90, (1, 0))
plant('calathea_orbifolia_01', 2.6, 6.4, 1.2, '#2b2a28', 0.26, 0)
R.area(c, 'portal vestibul', (0, VL, 1.9), (math.radians(90), 0, 0), 3.6, 3.8, 0).data.cycles.is_portal = True

# ================================================================ RUANG 2 · ROTUNDA (pusat (−1.0, 13.0), r 6.6, tinggi 7.6, oculus r 2.2): kolam pantul, lampu gantung, 10 kolom kuningan, ceruk lukisan & bangku beludru
CX, CY, RR, RH = -1.0, 13.0, 6.6, 7.6
OPEN = [(-90 - 16, -90 + 16), (115 - 19, 115 + 19)]                      # bukaan (derajat): masuk dari vestibul (selatan), keluar ke salon (115°)
def in_open(a):
    a = (a + 180) % 360 - 180
    return any(lo <= a <= hi for lo, hi in OPEN)
NSEG = 72
for k in range(NSEG):
    a0 = -180 + 360 * k / NSEG; am = a0 + 180 / NSEG
    if in_open(am): continue
    ln = 2 * math.pi * (RR + 0.15) / NSEG + 0.02
    ob = B('dinding rotunda', -ln / 2, ln / 2, -0.15, 0.15, 0, RH, M['cala'])
    ob.location = (CX + (RR + 0.15) * math.cos(math.radians(am)), CY + (RR + 0.15) * math.sin(math.radians(am)), 0); ob.rotation_euler.z = math.radians(am + 90)
B('lantai rotunda', CX - RR - 1, CX + RR + 1, CY - RR - 1, CY + RR + 1, -0.1, 0.0, M['nero'])
# plafon cincin dengan oculus: 48 bilah dari r 2.2 ke r 7.0
OC = 2.2
for k in range(48):
    am = 360 * k / 48; ln = 2 * math.pi * 7.2 / 48 + 0.03
    ob = B('plafon rotunda', OC, RR + 0.6, -ln / 2, ln / 2, RH, RH + 0.4, M['ceil'])
    ob.location = (CX, CY, 0); ob.rotation_euler.z = math.radians(am)
R.cyl(c, 'bibir oculus', CX, CY, RH - 0.25, RH + 0.4, OC + 0.12, M['brassD'], seg=72)
R.cyl(c, 'lubang oculus', CX, CY, RH - 0.26, RH + 0.41, OC, M['glass'], seg=72)                   # kaca penutup oculus
R.area(c, 'bulan', (CX, CY, RH + 0.6), (0, 0, 0), 4.2, 4.2, float(arg('moon', 2200)), color=MOON, spread=40, shape='DISK')   # cahaya bulan turun lewat oculus
R.area(c, 'portal oculus', (CX, CY, RH - 0.3), (0, 0, 0), OC * 2, OC * 2, 0, shape='DISK').data.cycles.is_portal = True
# kolam pantul (r 1.7) di sisi kiri jalur: bibir nero, air, dasar nero, lampu bawah air
PX_, PY_ = CX - 2.7, CY - 0.9                                                     # kolam di kiri jalur (jarak ≥ 0,7 m dari kamera)
R.cyl(c, 'bibir kolam', PX_, PY_, 0.0, 0.2, 1.95, M['nero'], seg=96)
R.cyl(c, 'ruang kolam', PX_, PY_, 0.02, 0.21, 1.72, R.flat_mat('dasar kolam', '#0f1416', 0.3), seg=96)
R.cyl(c, 'air', PX_, PY_, 0.03, 0.175, 1.71, M['water'], seg=96)
for k in range(6):
    a = math.radians(60 * k); R.point(c, 'lampu kolam', (PX_ + 1.3 * math.cos(a), PY_ + 1.3 * math.sin(a), 0.07), 4.0, K30, size=0.03)
try:
    ch, cho = R.place(c, 'Chandelier_03', (PX_, PY_, 4.3), 0, fit=('z', 1.5))
    for k in range(5):
        a = math.radians(72 * k); R.point(c, 'cahaya gantung', (PX_ + 0.35 * math.cos(a), PY_ + 0.35 * math.sin(a), 4.9), 110, K27, size=0.04)
    R.point(c, 'cahaya gantung tengah', (PX_, PY_, 5.2), 160, K27, size=0.06)
    R.cyl(c, 'rantai', PX_, PY_, 5.8, RH - 0.25, 0.012, M['brassD'], seg=12)
except Exception as e: print('[B2] chandelier', e)
# 10 kolom kuningan di cincin r 5.4 (lewati bukaan)
for k in range(10):
    a = -180 + 36 * k + 18
    if in_open(a) or in_open(a + 4) or in_open(a - 4): continue
    column(CX + 5.4 * math.cos(math.radians(a)), CY + 5.4 * math.sin(math.radians(a)), RH - 0.4, 0.21)
# ceruk di dinding: lukisan tinggi & bangku beludru bergantian (posisi di antara kolom)
slot = 0
for k in range(10):
    a = -180 + 36 * k
    if in_open(a) or in_open(a + 10) or in_open(a - 10): continue
    wx, wy = CX + (RR - 0.03) * math.cos(math.radians(a)), CY + (RR - 0.03) * math.sin(math.radians(a))
    inward = (-math.cos(math.radians(a)), -math.sin(math.radians(a)))
    if slot % 2 == 0:
        painting(wx, wy, 2.4, 1.6, 2.6, a + 90, ['x-tembok-wallpaper-001-a', 'x-kain-fabric-061', 'x-tembok-blue-plaster-wall'][slot // 2 % 3], ['#5a4a3a', '#3b4a52', '#2f3a4a'][slot // 2 % 3], inward)
    else:
        before = set(bpy.data.objects)
        B('bangku beludru', -0.9, 0.9, -0.3, 0.3, 0.14, 0.5, M['velvet'] if slot % 4 == 1 else M['velvetB'], bevel=0.03)
        for bx in (-0.75, 0.75): B('kaki bangku', bx - 0.03, bx + 0.03, -0.25, 0.25, 0, 0.14, M['brass'])
        transform_new(before, (wx + inward[0] * 0.55, wy + inward[1] * 0.55), a + 90)
    slot += 1
# bar kecil kuningan+nero di sisi kanan rotunda (NORA bar stool ×3)
bx0, by0 = CX + 3.9, CY + 1.2
before = set(bpy.data.objects)
B('meja bar', -1.3, 1.3, -0.3, 0.3, 0.0, 1.05, M['nero'], bevel=0.004); B('lis bar', -1.3, 1.3, -0.31, -0.3, 0.95, 1.05, M['brass'])
for xx in (-0.8, 0.0, 0.8):
    try: put('nora-bar-stool', xx, -0.75, 0)
    except Exception as e: print('[B2] stool', e)
R.place(c, 'brass_vase_04', (0.9, 0.05, 1.05), 0, fit=('z', 0.3)); candles(-0.8, 0.0, 1.05, 2)
transform_new(before, (bx0, by0), -52)
cove_ring = None
for k in range(24):   # cove melingkar di kaki kubah
    am = 360 * k / 24
    if in_open(am): continue
    R.area(c, 'cove rotunda', (CX + (RR - 0.3) * math.cos(math.radians(am)), CY + (RR - 0.3) * math.sin(math.radians(am)), RH - 0.5), (0, 0, 0), 0.1, 1.6, 34, color=K27, spread=140)
    if k % 2 == 0 and not in_open(am + 8) and not in_open(am - 8): downlight(CX + 4.3 * math.cos(math.radians(am)), CY + 4.3 * math.sin(math.radians(am)), RH, 320, 30)
    ob = B('cove ring', -0.8, 0.8, -0.02, 0.02, RH - 0.48, RH - 0.46, M['led27']); ob.location = (CX + (RR - 0.3) * math.cos(math.radians(am)), CY + (RR - 0.3) * math.sin(math.radians(am)), 0); ob.rotation_euler.z = math.radians(am + 90)
plant('pachira_aquatica_01', CX + 4.6, CY - 3.6, 2.6, '#2b2a28', 0.32, 20, pick=['bark_a', 'leaves_a'])
plant('anthurium_botany_01', CX + 4.2, CY + 3.4, 1.0, '#2b2a28', 0.24, 0, pick='_01_a')
R.area(c, 'portal rotunda keluar', (CX + RR * math.cos(math.radians(115)), CY + RR * math.sin(math.radians(115)), 1.9), (math.radians(90), 0, math.radians(115 - 90)), 3.6, 3.8, 0).data.cycles.is_portal = True

# ================================================================ RUANG 3 & 4 · SALON + SUITE (sumbu miring 25°, mulai di bukaan rotunda 115°)
EX, EY = CX + (RR + 0.15) * math.cos(math.radians(115)), CY + (RR + 0.15) * math.sin(math.radians(115))
ANG = 25.0                                                               # sumbu lokal y' = arah 25° ke kiri dari +Y
SW, SH, SL = 9.0, 4.4, 9.5; XL = -1.3                                   # lebar salon, tinggi, panjang; jalur kamera di x' = −1.3 (lewat bukaan rotunda)
UL = 6.8; TOT_L = SL + UL
before_salon = set(bpy.data.objects)
# cangkang lokal: lantai nero + karpet, plafon, dinding walnut (kiri) & calacatta (kanan), dinding akhir ceruk walnut
B('lantai salon', -SW / 2 - 0.3, SW / 2 + 0.3, -0.6, TOT_L + 0.3, -0.1, 0.0, M['nero'])
B('plafon salon', -SW / 2 - 0.3, SW / 2 + 0.3, -0.6, TOT_L + 0.3, SH, SH + 0.3, M['ceil'])
B('tembok kiri salon', -SW / 2 - 0.3, -SW / 2, -0.6, TOT_L + 0.3, 0, SH, M['walnutV'])
B('tembok kanan salon', SW / 2, SW / 2 + 0.3, -0.6, TOT_L + 0.3, 0, SH, M['cala'])
B('tembok akhir salon', -SW / 2 - 0.3, SW / 2 + 0.3, TOT_L, TOT_L + 0.3, 0, SH, M['walnutV'])
# lis kuningan tegak tiap 1,2 m di dinding walnut + perapian linear di dinding kiri (y' 2.6–5.4)
yy = 0.6
while yy < TOT_L - 0.3:
    B('lis walnut', -SW / 2 - 0.004, -SW / 2 + 0.01, yy, yy + 0.02, 0.1, SH - 0.1, M['brass']); yy += 1.2
B('badan perapian', -SW / 2 - 0.02, -SW / 2 + 0.45, 2.4, 5.6, 0.0, 1.5, M['nero'], bevel=0.003)
B('rongga perapian', -SW / 2 + 0.2, -SW / 2 + 0.46, 2.7, 5.3, 0.32, 0.92, R.flat_mat('rongga', '#1a1412', 0.9))
B('bara', -SW / 2 + 0.22, -SW / 2 + 0.44, 2.8, 5.2, 0.33, 0.37, M['fire'])
for k in range(14): B('batu lava', -SW / 2 + 0.24 + rnd.uniform(0, 0.16), -SW / 2 + 0.3 + rnd.uniform(0, 0.1), 2.85 + k * 0.165, 2.95 + k * 0.165, 0.34, 0.42, M['black'], bevel=0.01)
B('kaca perapian', -SW / 2 + 0.455, -SW / 2 + 0.46, 2.7, 5.3, 0.32, 0.92, M['glass'])
R.area(c, 'cahaya perapian', (-SW / 2 + 0.5, 4.0, 0.6), (0, math.radians(90), 0), 0.5, 2.4, 170, color=(1.0, 0.5, 0.18), spread=160)
B('mantel', -SW / 2 - 0.02, -SW / 2 + 0.5, 2.3, 5.7, 1.5, 1.56, M['brassD'], bevel=0.003)
painting(-SW / 2 + 0.02, 4.0, 2.75, 2.2, 1.6, -90, 'x-tembok-wallpaper-001-a', '#4b4036', (1, 0))
candles(-SW / 2 + 0.25, 3.0, 1.56, 3); R.place(c, 'brass_vase_02', (-SW / 2 + 0.25, 5.0, 1.56), 0, fit=('z', 0.3))
# kelompok duduk: CANIS menghadap perapian (ke −X'), 2 KYRIOS 1S berhadapan, CUBIX CT di tengah, karpet besar
rug(1.5, 4.2, 5.0, 4.6, '#2c3230', rot=0, hsv=(0.5, 0.1, 1.0))
try: put('canis', 2.9, 4.2, -90, fit=('x', 2.94))
except Exception as e: print('[B2] canis', e)
for yy_, rr in ((2.3, 180), (6.1, 0)):
    try: put('kyrios-1-seater', 0.9, yy_, rr)
    except Exception as e: print('[B2] kyrios', e)
try:
    tp, tob = put('cubixct', 1.6, 4.2, 90)
    R.place(c, 'wooden_bowl_01', (1.6, 4.4, R.top_of(tob)), 0, fit=('x', 0.26)); candles(1.5, 3.9, R.top_of(tob), 2)
except Exception as e: print('[B2] cubixct', e)
try: put('aether-standing-side-floor-lamp', 3.9, 7.6, 0)
except Exception as e: print('[B2] aether', e)
R.point(c, 'cahaya lampu lantai', (3.9, 7.6, 1.45), 40, K27, size=0.05)
plant('calathea_orbifolia_01', 3.8, 0.9, 1.2, '#2b2a28', 0.26, 0)
painting(SW / 2 - 0.02, 3.2, 2.0, 1.4, 1.8, 90, 'x-kain-fabric-061', '#3b4a52', (-1, 0)); painting(SW / 2 - 0.02, 6.4, 2.0, 1.4, 1.8, 90, 'x-tembok-blue-plaster-wall', '#2f3a4a', (-1, 0))
cove_rect(-SW / 2, SW / 2, 0.0, SL, SH, 120)
for xx in (-2.5, 0.3, 3.0):
    for yy in (1.6, 4.2, 6.8, 8.6): downlight(xx, yy, SH, 380)
wall_light(SW / 2 - 0.02, 1.4, 1.95, 90, (-1, 0)); wall_light(SW / 2 - 0.02, 8.2, 1.95, 90, (-1, 0))
# portal salon → suite (dinding tebal 0.5 dengan bukaan 3.4 × 2.8, dilapis walnut)
B('portal suite kiri', -SW / 2, XL - 1.7, SL - 0.25, SL + 0.25, 0, SH, M['walnutV']); B('portal suite kanan', XL + 1.7, SW / 2, SL - 0.25, SL + 0.25, 0, SH, M['walnutV'])
B('portal suite atas', XL - 1.7, XL + 1.7, SL - 0.25, SL + 0.25, 2.8, SH, M['walnutV'])
for xx in (XL - 1.7, XL + 1.7 - 0.05): B('bingkai suite', xx, xx + 0.05, SL - 0.27, SL + 0.27, 0, 2.85, M['brass'])
B('bingkai suite atas', XL - 1.7, XL + 1.7, SL - 0.27, SL + 0.27, 2.8, 2.85, M['brass'])
R.area(c, 'portal suite', (XL, SL, 1.4), (math.radians(90), 0, 0), 3.4, 2.8, 0).data.cycles.is_portal = True
# SUITE (y' SL..TOT_L): ranjang POEL di ceruk walnut dinding akhir, 2 ASHARA + lampu meja, SYME di kanan, bangku beludru, karpet
by = TOT_L - 0.36 - 0.86; bxc = XL + 1.6
B('ceruk kepala', bxc - 1.6, bxc + 1.6, TOT_L - 0.25, TOT_L, 0, 2.6, M['velvet'], bevel=0.0)                                 # panel beludru di balik ranjang
for xx in (bxc - 1.62, bxc + 1.6): B('bingkai ceruk', xx, xx + 0.02, TOT_L - 0.26, TOT_L, 0, 2.62, M['brass'])
B('bingkai ceruk atas', bxc - 1.62, bxc + 1.62, TOT_L - 0.26, TOT_L, 2.6, 2.62, M['brass'])
B('kepala ranjang', bxc - 1.0, bxc + 1.0, TOT_L - 0.35, TOT_L - 0.27, 0.0, 1.25, M['walnut'], bevel=0.004); B('lis kepala', bxc - 1.0, bxc + 1.0, TOT_L - 0.355, TOT_L - 0.27, 1.25, 1.28, M['brass'])
try: put('somno', bxc, by, 0)
except Exception as e: print('[B2] poel', e)
for sx in (-1, 1):
    try:
        np_, nob = put('ashara-54-nightstand', bxc + sx * 1.05, TOT_L - 0.55, 0)
        R.place(c, skf('table_lamp'), (bxc + sx * 1.05, TOT_L - 0.55, R.top_of(nob)), 0, fit=('z', 0.5))
        R.point(c, 'cahaya meja', (bxc + sx * 1.05, TOT_L - 0.55, R.top_of(nob) + 0.32), 26, K27, size=0.05)
    except Exception as e: print('[B2] ashara', e)
try: put('syme', SW / 2 - 0.34, SL + 2.0, -90)
except Exception as e: print('[B2] syme', e)
before = set(bpy.data.objects)
B('bangku beludru', -0.7, 0.7, -0.25, 0.25, 0.14, 0.46, M['velvetB'], bevel=0.03)
for bx in (-0.6, 0.6): B('kaki bangku', bx - 0.03, bx + 0.03, -0.2, 0.2, 0, 0.14, M['brass'])
transform_new(before, (bxc, by - 1.45), 0)
rug(bxc - 0.6, TOT_L - 2.9, 4.4, 3.2, '#3a3531', rot=0, hsv=(0.5, 0.1, 1.0))
wall_light(-SW / 2 + 0.02, TOT_L - 2.2, 1.95, -90, (1, 0))
plant('anthurium_botany_01', SW / 2 - 0.7, TOT_L - 0.8, 1.0, '#2b2a28', 0.24, 0, pick='_01_b')
cove_rect(-SW / 2, SW / 2, SL, TOT_L, SH, 100)
for xx in (-2.5, 0.5, 3.0):
    for yy in (SL + 1.6, SL + 4.2): downlight(xx, yy, SH, 300)
transform_new(before_salon, (EX, EY), ANG)

# ---------------------------------------------------------------- langit malam & realisme bahan
wd = bpy.data.worlds.new('malam'); sc.world = wd; wd.use_nodes = True
bgn = wd.node_tree.nodes['Background']; bgn.inputs['Color'].default_value = (0.02, 0.03, 0.06, 1); bgn.inputs['Strength'].default_value = 0.7
def realism(m):
    nt = m.node_tree
    if nt is None or m.get('emit'): return
    b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b is None or b.inputs['Transmission Weight'].default_value > 0.5: return
    rough = b.inputs['Roughness']; kain = any(k in m.name.lower() for k in ('sofa', 'bantal', 'kulit', 'kain', 'karpet', 'tirai', 'linen', 'fabric', 'beludru', 'selimut', 'seprai'))
    if not rough.is_linked and rough.default_value > 0.08:
        nz_ = nt.nodes.new('ShaderNodeTexNoise'); nz_.inputs['Scale'].default_value = 6.0; nz_.inputs['Detail'].default_value = 8
        mr = nt.nodes.new('ShaderNodeMapRange'); r0 = rough.default_value
        mr.inputs['To Min'].default_value = max(0.02, r0 - 0.08); mr.inputs['To Max'].default_value = min(1.0, r0 + 0.08)
        nt.links.new(nz_.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], rough)
    if kain: b.inputs['Specular IOR Level'].default_value = 0.15
    nin = b.inputs['Normal']; prev = nin.links[0].from_socket if nin.is_linked else None
    nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 3.0 if kain else 240.0; nz2.inputs['Detail'].default_value = 10
    if kain: nz2.inputs['Distortion'].default_value = 2.5
    bp_ = nt.nodes.new('ShaderNodeBump'); bp_.inputs['Strength'].default_value = 0.3 if kain else 0.05; bp_.inputs['Distance'].default_value = 0.01 if kain else 0.001
    nt.links.new(nz2.outputs['Fac'], bp_.inputs['Height'])
    if prev is not None: nt.links.new(prev, bp_.inputs['Normal'])
    nt.links.new(bp_.outputs['Normal'], nin)
for m in list(bpy.data.materials):
    if m.users and m.name not in ('air kolam', 'kaca'):
        try: realism(m)
        except Exception as e: print('[realism]', m.name, e)

# ---------------------------------------------------------------- kamera: lurus (vestibul) → Bezier melewati rotunda (kolam di kiri) → lurus di sumbu 25° (salon → suite)
CAM_Z = float(arg('camz', 1.45)); LENS = float(arg('lens', 28))
def bez(p0, p1, p2, p3, t): return p0 * (1 - t) ** 3 + p1 * 3 * t * (1 - t) ** 2 + p2 * 3 * t * t * (1 - t) + p3 * t ** 3
rz = Matrix.Rotation(math.radians(ANG), 2, 'Z')
def loc2w(xl, yl): v = rz @ Vector((xl, yl)); return Vector((EX + v.x, EY + v.y))
P0 = Vector((0.0, 7.2)); P3 = loc2w(XL, 0.3); d3 = rz @ Vector((0, 1)); P1 = Vector((0.0, 11.0)); P2 = P3 - d3 * 3.2
A0 = Vector((0.0, 0.8)); END = loc2w(XL, SL + 3.2)                         # berhenti di suite ±3,3 m sebelum ranjang
poly = [A0, P0] + [bez(P0, P1, P2, P3, k / 60) for k in range(1, 61)] + [END]
segl = [(poly[i + 1] - poly[i]).length for i in range(len(poly) - 1)]; cum = [0.0]
for l_ in segl: cum.append(cum[-1] + l_)
TOT = cum[-1]
def ease(u): return u * u * (3 - 2 * u)
def cam_pose(f):
    s = TOT * ((f % NF) / NF)
    i = max(0, min(len(segl) - 1, next((k for k in range(len(segl)) if cum[k + 1] >= s), len(segl) - 1)))
    t = (s - cum[i]) / max(1e-9, segl[i]); p = poly[i].lerp(poly[i + 1], t)
    # arah pandang: 0° di vestibul → bertambah monoton ke 25° (= sumbu salon) sepanjang rotunda, lalu tetap
    u0, u1 = cum[1] / TOT, cum[len(poly) - 2] / TOT; u = (s / TOT - u0) / max(1e-6, u1 - u0)
    yaw = math.radians(ANG * ease(max(0.0, min(1.0, u))))
    return Vector((p.x, p.y, CAM_Z)), yaw
cd = bpy.data.cameras.new('kamera'); cd.lens = LENS; cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'; cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
def cam_at(f):
    p, yaw = cam_pose(f); cam.location = p; cam.rotation_euler = (math.radians(90.5), 0, yaw)
def frame_at_s(s): return int(round(s / TOT * NF))
sR = cum[1] - 0.6; sS = cum[len(poly) - 2]; sU = sS + SL - 1.2
ROOMS = [(0, 'Vestibul'), (frame_at_s(sR), 'Rotunda'), (frame_at_s(sS), 'Salon'), (frame_at_s(sU), 'Suite')]
json.dump({'n': NF, 'rooms': [[f, n] for f, n in ROOMS]}, open(os.path.join(OUT, 'rooms.json'), 'w'))

R.color_management(sc, float(arg('exposure', 1.2)), float(arg('wb', 5000)))
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
R.cycles(sc, SAMPLES, threshold=float(arg('thr', 0.02))); sc.cycles.use_light_tree = True
sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
print('[B2] %d frame · panjang jalur %.1f m · ruang %s · objek %d' % (NF, TOT, ROOMS, len(c.objects)), flush=True)

if arg('check'):
    st_ = [(cam_pose(k + 1)[0] - cam_pose(k)[0]).length for k in range(NF - 1)]; yw = [math.degrees(cam_pose(k)[1]) for k in range(NF)]
    print('[cek] langkah/frame min %.3f maks %.3f m · yaw %.1f° → %.1f° (maks putaran/frame %.2f°)' % (min(st_), max(st_), yw[0], yw[-1], max(abs(yw[k + 1] - yw[k]) for k in range(NF - 1)))); sys.exit(0)
if arg('top'):
    cd.type = 'ORTHO'; cd.ortho_scale = 40; cam.location = (-2, 16, 60); cam.rotation_euler = (0, 0, 0)
    sc.render.resolution_x, sc.render.resolution_y = 1400, 1400; sc.cycles.samples = 16
    for o in [o for o in c.objects if o.name.startswith('plafon')]: o.hide_render = True
    bpy.ops.render.render(write_still=False); R.save(sc, os.path.join(OUT, 'tes-atas'), webp=False); print('[B2] tampak atas'); sys.exit(0)
if arg('frames'):
    a, b = [int(v) for v in str(arg('frames')).split('-')]
    for f in range(a, b + 1):
        p = os.path.join(OUT, 'f%03d' % f)
        if os.path.exists(p + '.jpg'): continue
        cam_at(f); t0 = time.time(); bpy.ops.render.render(write_still=False); R.save(sc, p, webp=False)
        print('[B2] frame %d/%d %.0f s' % (f, NF, time.time() - t0), flush=True)
else:
    for s_ in str(arg('shots', '0,70,130,190')).split(','):
        cam_at(int(s_)); t0 = time.time(); bpy.ops.render.render(write_still=False); R.save(sc, os.path.join(OUT, 'tes-f%03d' % int(s_)), webp=False)
        print('[B2] tes frame %s %.1f s' % (s_, time.time() - t0), flush=True)
