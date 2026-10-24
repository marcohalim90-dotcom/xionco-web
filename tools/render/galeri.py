# ==========================================================================
#  XIONCO — Galeri: deretan ruang mewah, kamera bergeser ke samping   [GA1 → GA2]
#  blender -b --factory-startup -P galeri.py -- [--shots c1,t12,c2] [--size 1280x720]
#          [--samples 96] [--preview] [--out folder] [--blend]
#
#  Konsep (pemilik, 21 Okt): gulir = kamera bergeser kanan/kiri melewati 5 ruangan
#  berderet; setelah ruang terakhir muncul lagi ruang pertama (salinan) → putaran mulus.
#  Tiap ruang dibangun di koleksinya sendiri dalam koordinat lokal:
#     x 0…W (lebar), y −3,5 (belakang kamera) … D (dinding belakang), z 0…H
#  lalu ditaruh sebagai instance koleksi berderet (pitch = W + tebal partisi).
#  Tanpa pemandangan luar: jendela = tirai / kerai di depan kotak cahaya.
# ==========================================================================
import bpy, sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib as R
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'ga1'))
SIZE = [int(v) for v in str(arg('size', '1280x720')).lower().split('x')]
SAMPLES = int(arg('samples', 96))
PREVIEW = bool(arg('preview', False))
SHOTS = str(arg('shots', 'c1,t12,c2')).split(',')
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
W, D, T = 7.5, 5.4, 0.5           # lebar ruang, kedalaman, tebal partisi
FRONT = -3.0                       # dinding di belakang kamera
PART_FRONT = 0.7                   # ujung depan partisi (kamera lewat di depannya)
WARM = R.kelvin(2900); NEUTRAL = R.kelvin(4200); DAY = R.kelvin(5200)

def room_coll(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c

# bahan bersama
M = {
    'walnut':   R.tex_mat('walnut asap', 'ph-smoked_walnut_veneer', 1.4, tint='#8a6248', rmul=0.75, nstr=0.4, rot=90, coat=0.15),
    'walnut_d': R.tex_mat('walnut gelap', 'ph-smoked_walnut_veneer', 1.4, tint='#5a3d2b', rmul=0.75, nstr=0.4, rot=90, coat=0.15),
    'ceil':     R.tex_mat('plafon', 'room-wall-limewash', 3.0, tint='#efe7dc', rough=0.92, nstr=0.15),
    'brass':    R.flat_mat('kuningan', '#b8894a', 0.28, 1.0),
    'bronze':   R.flat_mat('perunggu', '#6b4a2e', 0.32, 1.0),
    'black':    R.flat_mat('baja hitam', '#1b1a19', 0.4, 0.85),
    'led':      R.emit_mat('led hangat', WARM, 14.0),
    'glow':     R.emit_mat('kotak cahaya', R.kelvin(4600), 5.0),
}

def partition(c, x0, H, mat):
    """Partisi di tepi kanan ruang: tembok tebal berlapis walnut, ujung depan bergaris."""
    R.box(c, 'partisi', x0, x0 + T, PART_FRONT, D + 0.2, 0, H, mat)
    R.flutes(c, 'partisi garis', x0 + 0.02, x0 + T - 0.02, PART_FRONT, 0.02, H - 0.02, mat, pitch=0.05, depth=0.016)

def shell(c, H, floor, wall, ceil=None):
    R.box(c, 'lantai', 0, W + T, FRONT, D + 0.2, -0.1, 0, floor)
    R.box(c, 'plafon', 0, W + T, FRONT, D + 0.2, H, H + 0.12, ceil or M['ceil'])
    R.box(c, 'dinding belakang', 0, W + T, D, D + 0.2, 0, H, wall)
    R.box(c, 'dinding depan', 0, W + T, FRONT - 0.2, FRONT, 0, H, wall)

# ==========================================================================
#  LOOK 1 — Grand living (ref. pemilik #1): marmer krem mengilap, kaca perunggu
#  gelap, walnut bergaris, sofa L krem, vas kuningan & ranting kering
# ==========================================================================
def look1():
    c = room_coll('L1 grand living'); H = 4.0
    floor = R.add_grout(R.tex_mat('marmer krem', 'stone-calacatta', 2.6, tint='#f1e6d6', rough=0.07, coat=0.35, spec=0.6),
                        w=1.2, h=1.2, gap=0.0015, col_hex='#cbbda9', offset=0.0)
    wall = R.tex_mat('dinding plester krem', 'ph-white_plaster_02', 2.2, tint='#e9dccb', rmul=1.1, nstr=0.25, hsv=(0.5, 0.2, 1.35))
    shell(c, H, floor, wall)
    # dinding belakang kiri: panel kaca perunggu gelap mengilap + strip kuningan + lampu lis atas
    glass = R.flat_mat('kaca perunggu', '#2a1f18', 0.04, 0.0, spec=1.0)
    R.box(c, 'kaca perunggu', 0.0, 3.0, D - 0.06, D, 0.0, H - 0.25, glass)
    for x in (0.0, 1.0, 2.0, 3.0):
        R.box(c, 'strip kuningan', x - 0.012, x + 0.012, D - 0.08, D - 0.05, 0.0, H - 0.25, M['brass'])
    R.box(c, 'bibir lis', 0.0, 3.02, D - 0.35, D, H - 0.25, H, M['ceil'])
    R.box(c, 'led lis', 0.02, 2.98, D - 0.3, D - 0.27, H - 0.27, H - 0.26, M['led'])
    # tengah: panel walnut bergaris setinggi plafon
    R.box(c, 'panel walnut', 3.0, 4.2, D - 0.12, D, 0.0, H, M['walnut'])
    R.flutes(c, 'walnut garis', 3.02, 4.18, D - 0.12, 0.0, H, M['walnut'], pitch=0.06, depth=0.02)
    # kanan: pintu kaca setinggi plafon tertutup tirai linen di depan kotak cahaya
    R.box(c, 'kotak cahaya', 4.2, 7.3, D - 0.02, D, 0.0, H - 0.3, M['glow'])
    for x in (4.2, 5.23, 6.27, 7.3):
        R.box(c, 'kusen', x - 0.025, x + 0.025, D - 0.1, D - 0.03, 0.0, H - 0.3, M['bronze'])
    R.box(c, 'ambang atas', 4.2, 7.3, D - 0.1, D - 0.03, H - 0.33, H - 0.28, M['bronze'])
    sheer = R.sheer_mat('tirai linen', '#efe5d6', opacity=0.8)
    R.curtain(c, 'tirai', D - 0.25, 4.15, 7.4, 0.01, H - 0.05, sheer, folds_per_m=7, depth=0.05, axis='x')
    R.box(c, 'rel tirai', 4.1, 7.45, D - 0.33, D - 0.17, H - 0.03, H, M['black'])
    R.area(c, 'cahaya tirai', (5.75, D - 0.45, H / 2 - 0.1), (math.radians(-90), 0, 0), 3.1, H - 0.4, 180, DAY, spread=120)
    # plafon: slot lampu linear + downlight
    R.box(c, 'slot linear', 0.8, 6.7, 2.3, 2.36, H - 0.02, H, M['led'])
    for x in (1.5, 3.6, 5.8):
        R.spot(c, 'downlight', (x, D - 0.7, H - 0.05), (x, D, 1.0), 170, WARM, ang=55)
    for x in (2.4, 4.6):
        R.spot(c, 'downlight meja', (x, 2.8, H - 0.05), (x, 2.8, 0), 140, WARM, ang=70)
    R.area(c, 'isi plafon', (3.75, 1.6, H - 0.1), (0, 0, 0), 5.0, 4.0, 140, R.kelvin(3300))
    R.area(c, 'isi depan', (3.75, -2.4, 2.4), (math.radians(90), 0, 0), 5.0, 2.0, 70, R.kelvin(3400))
    # karpet tebal taupe
    rug = R.tex_mat('karpet taupe', 'ph-poly_wool_herringbone', 0.4, tint='#a08b76', rough=0.97, nstr=1.0, sheen=0.6, hsv=(0.5, 0.0, 1.2))
    R.box(c, 'karpet', 1.2, 6.2, 1.7, 4.95, 0, 0.018, rug, bevel=0.008)
    # produk
    sofa, so = R.place(c, 'guise-sofa-set-l-3-2', (2.45, 4.2, 0.018), 0, name='GUISE Sofa Set L')
    R.fabric_upgrade(so, '#d9ccba', 'fabric-linen', 0.3)
    arm, ao = R.place(c, 'kyrios-1-seater', (5.7, 3.0, 0.018), -38, name='KYRIOS 1 Seater')
    R.fabric_upgrade(ao, '#cab596', 'fabric-boucle', 0.25)
    tb, to = R.place(c, 'eorde-coffee-table', (3.7, 2.6, 0.018), 0, name='EORDE coffee table')
    side, sdo = R.place(c, 'recta-st62019', (3.85, 4.7, 0.018), 0, name='RECTA ST62019')
    lamp, _ = R.place(c, 'oz-floor-lamp-stand', (1.0, 4.85, 0.0), 0, name='OZ floor lamp')
    R.point(c, 'cahaya OZ', (1.0, 4.85, 1.25), 25, WARM, size=0.12)
    # dekor CC0
    ttop = R.top_of(to)
    R.place(c, 'brass_vase_01', (3.4, 2.5, ttop), 0, fit=('z', 0.34))
    R.place(c, 'brass_vase_04', (3.95, 2.75, ttop), 30, fit=('z', 0.22))
    R.place(c, 'book_encyclopedia_set_01', (4.05, 2.3, ttop), 80, fit=('x', 0.32))
    stop = R.top_of(sdo)
    R.place(c, 'ceramic_vase_03', (3.85, 4.7, stop), 0, fit=('z', 0.3))
    R.place(c, 'brass_vase_03', (4.55, D - 0.5, 0.0), 0, fit=('z', 0.62))
    R.place(c, 'brass_vase_02', (4.95, D - 0.42, 0.0), 20, fit=('z', 0.42))
    potm = R.tex_mat('pot keramik', 'ph-white_plaster_02', 0.5, tint='#cfc0ab', rough=0.7, nstr=0.6, hsv=(0.5, 0.2, 1.2))
    ph = R.pot(c, 'pot pachira', 6.85, 4.4, 0.3, 0.24, 0.55, potm)
    R.place(c, 'pachira_aquatica_01', (6.85, 4.4, ph - 0.05), 40, fit=('z', 1.8), pick='_d')
    # bantal beludru taupe & cokelat di sandaran sofa
    for (x, y, r, col, pk) in ((1.85, 4.95, -8, '#a68a72', 'pillow01'), (2.35, 4.98, 5, '#6b5240', 'pillow02'), (3.0, 4.95, 10, '#b9a48f', 'pillow01')):
        p, po = R.place(c, 'throw_pillows_01', (x, y, 0.40), r, fit=('z', 0.45), pick=pk)
        R.recolor(po, R.tex_mat('bantal ' + col, 'ph-velour_velvet', 0.3, tint=col, rough=0.8, nstr=0.6, sheen=0.8, hsv=(0.5, 0.0, 1.1)))
    partition(c, W, H, M['walnut_d'])
    return c

# ==========================================================================
#  LOOK 2 — Quiet luxury (ref. pemilik #2): dinding krem, parket herringbone,
#  plafon bertingkat + rel lampu linear, kolom walnut, sofa empuk krem (CUBIX)
# ==========================================================================
def look2():
    c = room_coll('L2 quiet luxury'); H = 3.6
    floor = R.tex_mat('parket herringbone', 'ph-herringbone_parquet', 1.6, tint='#f3e3d0', rmul=0.8, nstr=0.5, hsv=(0.5, 0.5, 1.6), coat=0.12)
    wall = R.tex_mat('plester krem', 'room-wall-limewash', 2.4, tint='#e9dccb', rmul=1.1, nstr=0.3)
    shell(c, H, floor, wall)
    # plafon bertingkat: bingkai turun 0,3 m di keliling, tengah lebih tinggi
    drop = 0.3
    R.box(c, 'bingkai plafon belakang', 0, W, D - 0.9, D, H - drop, H, M['ceil'])
    R.box(c, 'bingkai plafon depan', 0, W, FRONT, 0.5, H - drop, H, M['ceil'])
    R.box(c, 'bingkai plafon kiri', 0, 0.8, 0.5, D - 0.9, H - drop, H, M['ceil'])
    R.box(c, 'bingkai plafon kanan', W - 0.8, W, 0.5, D - 0.9, H - drop, H, M['ceil'])
    R.box(c, 'led tingkat', 0.82, W - 0.82, D - 0.94, D - 0.9, H - drop + 0.02, H - drop + 0.035, M['led'])
    # rel lampu linear hitam
    R.box(c, 'rel linear', 1.1, 6.4, 2.0, 2.035, H - 0.035, H, M['black'])
    for x in (2.6, 2.9, 4.4, 4.7):
        R.spot(c, 'spot rel', (x, 2.0, H - 0.06), (x, D, 1.0), 110, WARM, ang=40, blend=0.4)
    R.area(c, 'isi plafon', (3.75, 2.0, H - 0.05), (0, 0, 0), 4.6, 3.4, 170, R.kelvin(3400))
    R.area(c, 'isi depan', (3.75, -2.4, 2.2), (math.radians(90), 0, 0), 5.0, 2.0, 120, R.kelvin(3500))
    # dinding fitur di belakang sofa (menonjol 6 cm, lampu tersembunyi di atas)
    R.box(c, 'panel fitur', 1.25, 5.35, D - 0.06, D, 0.0, 2.6, wall)
    R.box(c, 'led panel', 1.27, 5.33, D - 0.075, D - 0.06, 2.585, 2.595, M['led'])
    # kolom walnut setinggi plafon
    R.box(c, 'kolom walnut', 5.65, 6.1, D - 0.36, D, 0.0, H, M['walnut'], bevel=0.004)
    # jendela kanan: kerai vertikal tipis di depan kotak cahaya
    R.box(c, 'kotak cahaya', 6.12, W - 0.02, D - 0.02, D, 0.0, H - drop, M['glow'])
    blind = R.flat_mat('kerai linen', '#e9dfd1', 0.9)
    x = 6.18
    while x < W - 0.06:
        ob = R.box(c, 'kerai', -0.0425, 0.0425, -0.005, 0.005, 0.02, H - drop - 0.02, blind)
        ob.location = (x, D - 0.17, 0); ob.rotation_euler.z = math.radians(55)
        x += 0.09
    R.area(c, 'cahaya kerai', (6.8, D - 0.5, 1.6), (math.radians(-90), 0, 0), 1.3, 3.0, 110, DAY, spread=120)
    # lampu dinding berlengan panjang di atas sofa (tiang hitam + lengan + kap kecil)
    R.box(c, 'tiang lampu', 1.6, 1.63, D - 0.09, D - 0.06, 0.95, 2.45, M['black'])
    R.box(c, 'lengan tarik', 1.6, 1.63, D - 0.3, D - 0.09, 2.1, 2.13, M['black'])
    R.box(c, 'lengan lampu', 1.6, 3.0, D - 0.3, D - 0.27, 2.1, 2.13, M['black'])
    R.cyl(c, 'kap lampu', 2.97, D - 0.285, 1.95, 2.1, 0.075, M['black'])
    R.spot(c, 'cahaya lampu dinding', (2.97, D - 0.285, 1.93), (2.9, D - 0.4, 0.5), 60, WARM, ang=85, blend=0.8)
    R.place(c, 'hanging_picture_frame_02', (4.45, D - 0.08, 1.65), 0, fit=('x', 0.5))
    # karpet wol
    rug = R.tex_mat('karpet wol', 'ph-poly_wool_herringbone', 0.35, tint='#e2d8ca', rough=0.97, nstr=1.0, sheen=0.5, hsv=(0.5, 0.2, 1.45))
    R.box(c, 'karpet', 1.1, 5.7, 1.9, 5.0, 0, 0.016, rug, bevel=0.006)
    # produk
    sofa, so = R.place(c, 'cubix-series-3-seaters-ac-al-ac-kayu-terang', (3.55, D - 0.6, 0.016), 0, name='CUBIX 3 Seater')
    R.fabric_upgrade(so, '#e5e1db', 'fabric-boucle', 0.22, sheen=0.5)
    s1, s1o = R.place(c, 'cubix-series-1-seater-al-kayu-terang', (2.285, D - 0.6, 0.016), 0, name='CUBIX 1 Seater AL')
    R.fabric_upgrade(s1o, '#e5e1db', 'fabric-boucle', 0.22, sheen=0.5)
    ot, oo = R.place(c, 'cubix-series-ottoman-kayu-terang', (1.4, 2.5, 0.016), 15, name='CUBIX Ottoman')
    R.fabric_upgrade(oo, '#272523', 'fabric-boucle', 0.22, sheen=0.5)
    ct, cto = R.place(c, 'rouled', (3.3, 2.95, 0.016), 0, name='ROULED')
    st, sto = R.place(c, 'cubix-series-meja-sudut-side', (5.0, D - 0.6, 0.016), 0, name='CUBIX side table')
    arm, ao = R.place(c, 'kyrios-1-seater', (5.35, 2.45, 0.016), -143, name='KYRIOS 1 Seater')
    R.fabric_upgrade(ao, '#3f3f41', 'fabric-boucle', 0.25, sheen=0.6)
    cab, cbo = R.place(c, 'gliza-tv-cabinet-stand', (0.3, D - 1.45, 0.0), 90, name='GLIZA')
    # dekor
    ttop = R.top_of(cto)
    R.place(c, 'ceramic_vase_02', (3.15, 2.9, ttop), 0, fit=('z', 0.26))
    R.place(c, 'carved_wooden_plate', (3.5, 3.05, ttop), 0, fit=('x', 0.3))
    stop = R.top_of(sto)
    R.place(c, 'ceramic_vase_04', (5.0, D - 0.6, stop), 0, fit=('z', 0.22))
    ctop = R.top_of(cbo)
    R.place(c, 'anthurium_botany_01', (0.3, D - 0.75, ctop), 0, fit=('z', 0.5), pick='_b')
    R.place(c, 'standing_picture_frame_02', (0.3, D - 1.9, ctop), 90, fit=('z', 0.28))
    potm = R.tex_mat('pot gelap', 'ph-white_plaster_02', 0.5, tint='#4a4038', rough=0.75, nstr=0.6)
    ph = R.pot(c, 'pot calathea', 6.75, 3.6, 0.24, 0.2, 0.42, potm)
    R.place(c, 'calathea_orbifolia_01', (6.75, 3.6, ph - 0.04), 0, fit=('z', 0.75), pick='_a')
    partition(c, W, H, M['walnut_d'])
    return c

# ---------------------------------------------------------------- susun deretan
looks = [look1(), look2()]
PITCH = W + T
sc.world = bpy.data.worlds.new('gelap'); sc.world.color = (0.0, 0.0, 0.0)
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass
order = [looks[-1]] + looks + [looks[0]]            # salinan di kedua ujung → putaran tanpa sambungan
for i, c in enumerate(order):
    inst = bpy.data.objects.new('deret %d %s' % (i, c.name), None)
    inst.instance_type = 'COLLECTION'; inst.instance_collection = c
    inst.location = ((i - 1) * PITCH, 0, 0); sc.collection.objects.link(inst)
for c in looks:
    R._layer_coll(c).exclude = True

# ---------------------------------------------------------------- kamera
cd = bpy.data.cameras.new('kamera'); cd.lens = float(arg('lens', 26)); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.shift_y = float(arg('shift', 0.0)); cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
CAM_Y, CAM_Z = float(arg('camy', -1.6)), float(arg('camz', 1.25))
cam.rotation_euler = (math.radians(90), 0, 0)
def shot_x(s):
    """c1 = tengah ruang 1, t12 = peralihan ruang 1→2 (tepat di partisi), dst."""
    if s.startswith('c'): return (int(s[1:]) - 1) * PITCH + W / 2
    if s.startswith('t'): return (int(s[1]) - 1) * PITCH + W + T / 2
    return float(s)

R.color_management(sc, float(arg('exposure', 0.0)), float(arg('wb', 4600)))
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
if PREVIEW: R.eevee(sc)
else: R.cycles(sc, SAMPLES)
if arg('blend'): bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'galeri.blend'))
SEQ = int(arg('seq', 0))
if SEQ:
    # kamera bergeser dari tengah ruang 1 sejauh len(looks) × pitch (putaran penuh), frame terakhir = frame pertama
    sd = os.path.join(OUT, 'seq'); os.makedirs(sd, exist_ok=True)
    x0 = shot_x('c1'); span = len(looks) * PITCH
    for f in range(SEQ):
        cam.location = (x0 + span * f / SEQ, CAM_Y, CAM_Z)
        t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(sd, 'f%03d' % f), webp=False)
        print('[galeri] frame %d/%d %.1f s' % (f + 1, SEQ, time.time() - t0), flush=True)
    SHOTS = []
for s in SHOTS:
    cam.location = (shot_x(s), CAM_Y, CAM_Z)
    t0 = time.time(); bpy.ops.render.render(write_still=False)
    R.save(sc, os.path.join(OUT, ('pv-' if PREVIEW else '') + s), webp=False)
    print('[galeri] %s %s %dx%d: %.1f s' % (s, 'EEVEE' if PREVIEW else 'Cycles', SIZE[0], SIZE[1], time.time() - t0), flush=True)
