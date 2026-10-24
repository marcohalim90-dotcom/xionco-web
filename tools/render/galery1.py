# ==========================================================================
#  XIONCO — "galery1": ruang Galeri 3D mengikuti video referensi pemilik
#  (assets/galeri/ref = galery1). HANYA arsitektur: dinding, plafon, lantai,
#  pencahayaan & lampu sorot — tanpa furnitur / aksesoris (permintaan pemilik 21 Okt).
#
#  blender -b --factory-startup -P galery1.py -- [--shots 0,12,36] [--size 960x540]
#          [--samples 48] [--seq N] [--out folder] [--preview] [--blend]
#  --shots = nomor frame galery1 (0…164) → posisi kamera yang sama di jalur 3D.
#
#  Denah (meter): 7 zona berderet di sumbu X, kamera berjalan menyamping (+X) di
#  y = CAM_Y menghadap +Y. Panjang L → salinan deret di −L dan +L = putaran mulus.
#   Z1 Lobi 0–8 · Z2 Ruang keluarga 8–15 · Z3 Biliar 15–22.3 · Z4 Kamar 22.3–28.5
#   Z5 Ruang marmer 28.5–34 · Z6 Bar 34–41 · Z7 Lounge 41–47
# ==========================================================================
import bpy, sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib as R

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galery1'))
SIZE = [int(v) for v in str(arg('size', '960x540')).lower().split('x')]
SAMPLES = int(arg('samples', 48))
REF_N = 165                                   # jumlah frame galery1 (putaran penuh)
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
c = bpy.data.collections.new('galery1'); sc.collection.children.link(c)
L = 47.0                                      # panjang satu putaran
FRONT = -5.0
WARM = R.kelvin(3000); SOFT = R.kelvin(3500); DAY = R.kelvin(6000)

# ---------------------------------------------------------------- bahan
M = {
    'floor':   R.add_grout(R.tex_mat('lantai batu pucat', 'stone-carrara', 3.2, tint='#e9e1d5', rough=0.14, coat=0.25, spec=0.55),
                           w=1.2, h=1.2, gap=0.0016, col_hex='#cfc6b8', offset=0.0),
    'stone':   R.tex_mat('panel batu', 'stone-travertine', 1.2, tint='#efe6d8', rough=0.45),
    'floor_d': R.tex_mat('lantai marmer gelap', 'stone-nero', 2.4, tint='#9a9692', rough=0.12, coat=0.3),
    'beige':   R.tex_mat('plester krem', 'room-wall-limewash', 2.6, tint='#ddcdb9', rmul=1.1, nstr=0.3),
    'mauve':   R.tex_mat('plester mauve', 'room-wall-limewash', 2.6, tint='#8c6a5f', rmul=1.1, nstr=0.3),
    'terra':   R.tex_mat('plester terakota', 'room-wall-plaster', 2.6, tint='#a8705a', rmul=1.05, nstr=0.35, hsv=(0.5, 0.3, 1.25)),
    'dark':    R.tex_mat('plester gelap', 'room-wall-limewash', 2.6, tint='#3a3430', rmul=1.1, nstr=0.25),
    'char':    R.tex_mat('dinding arang', 'room-wall-limewash', 2.6, tint='#26221f', rmul=1.0, nstr=0.2),
    'white':   R.tex_mat('plafon putih', 'room-wall-limewash', 3.0, tint='#efe9e0', rough=0.9, nstr=0.15),
    'cblack':  R.flat_mat('plafon hitam', '#161412', 0.85),
    'walnut':  R.tex_mat('walnut', 'ph-smoked_walnut_veneer', 1.3, tint='#7a5238', rmul=0.8, nstr=0.4, rot=90, coat=0.1),
    'walnut_d': R.tex_mat('walnut gelap', 'ph-smoked_walnut_veneer', 1.3, tint='#4a3324', rmul=0.8, nstr=0.4, rot=90, coat=0.1),
    'marble':  R.tex_mat('marmer dinding', 'stone-calacatta', 2.2, tint='#e8d9c4', rough=0.2, coat=0.3, spec=0.6),
    'band':    R.tex_mat('pita plester', 'room-wall-limewash', 2.6, tint='#a9998a', rmul=1.1, nstr=0.3),
    'glow':    R.emit_mat('panel cahaya hangat', R.kelvin(3200), 2.6),
    'glow_lo': R.emit_mat('panel cahaya redup', R.kelvin(3000), 2.2),
    'led':     R.emit_mat('led lis', R.kelvin(2900), 16.0),
    'sky':     R.emit_mat('cahaya atas', R.kelvin(6800), 9.0),
    'dl':      R.emit_mat('downlight', R.kelvin(3000), 40.0),
    'rim':     R.flat_mat('bingkai downlight', '#d8d2c8', 0.4),
}

B = lambda *a, **k: R.box(c, *a, **k)

def downlight(x, y, z, aim=None, energy=140, ang=58, blend=.5):
    """Lampu sorot plafon: cincin + cakram bercahaya kecil + lampu spot nyata."""
    B('cincin dl', x - 0.055, x + 0.055, y - 0.055, y + 0.055, z - 0.006, z, M['rim'])
    B('cakram dl', x - 0.035, x + 0.035, y - 0.035, y + 0.035, z - 0.008, z - 0.006, M['dl'])
    R.spot(c, 'sorot', (x, y, z - 0.03), aim or (x, y, 0), energy, WARM, size=0.025, ang=ang, blend=blend)

def wallwash(x, y_wall, z, energy=170):
    """Sorot dekat dinding → pola 'scallop' di dinding."""
    downlight(x, y_wall - 0.45, z, (x, y_wall, 0.9), energy, ang=62, blend=.65)

def ceiling(x0, x1, y0, y1, z, mat):
    B('plafon', x0, x1, y0, y1, z, z + 0.15, mat)

# ---------------------------------------------------------------- lantai & dinding depan (menerus)
B('lantai', 0, L, FRONT - 0.3, 12, -0.1, 0, M['floor'])                 # hanya satu panjang L: salinan deret menyambung tanpa tumpang tindih
B('dinding depan', 0, L, FRONT - 0.2, FRONT, 0, 3.4, M['beige'])

# ==========================================================================
#  Z1 LOBI 0–8: lorong gelap dalam di kiri (ceruk bercahaya di ujung), pilar mauve
#  + soffit, panel kayu bercahaya di tengah, kolom putih di kanan
# ==========================================================================
H1 = 3.2
ceiling(0, 8, FRONT, 5.5, H1, M['white'])
# lorong gelap x 0–3.6, dalam sampai y 9
ceiling(0, 3.6, 5.5, 9.2, H1, M['cblack'])
B('lorong dinding ujung', 0, 3.6, 9.0, 9.2, 0, H1, M['dark'])
B('lorong dinding kiri', -0.2, 0, 5.5, 9.2, 0, H1, M['dark'])
B('lorong ceruk belakang', 1.2, 2.4, 9.2, 9.6, 0.35, 2.4, M['dark'])
B('ceruk lantai', 1.2, 2.4, 8.95, 9.2, 0.0, 0.35, M['walnut_d'])
R.spot(c, 'sorot ceruk', (1.8, 9.0, H1 - 0.05), (1.8, 9.4, 0.4), 120, WARM, ang=40, blend=.4)
for y in (6.4, 7.8):
    downlight(1.8, y, H1, energy=60)
# dinding belakang lobi x 3.6–8 (y 5.5): kotak kayu dengan panel bercahaya
B('dinding belakang lobi', 3.6, 8.0, 5.5, 5.7, 0, H1, M['beige'])
B('rangka kayu', 4.4, 6.6, 5.3, 5.5, 0.0, 2.7, M['walnut'])
B('ceruk kayu dalam', 4.6, 6.4, 5.28, 5.3, 0.2, 2.5, M['walnut_d'])
B('panel batu', 5.0, 6.0, 5.27, 5.28, 0.9, 2.3, M['stone'])
R.spot(c, 'sorot panel', (5.5, 4.9, 2.62), (5.5, 5.27, 1.4), 70, WARM, ang=70, blend=.7)
# pilar mauve + soffit ke belakang
B('pilar mauve', 3.2, 4.1, 1.7, 2.6, 0, H1, M['mauve'])
B('soffit mauve', 3.2, 4.1, 2.6, 5.5, H1 - 0.45, H1, M['mauve'])
wallwash(3.65, 1.7, H1, 130)
B('kolom putih', 7.55, 7.95, 1.4, 1.8, 0, H1, M['white'])
for x in (1.6, 5.4):
    for y in (0.4, 3.0):
        downlight(x, y, H1, energy=110)
R.area(c, 'isi lobi', (5.2, 1.0, H1 - 0.05), (0, 0, 0), 4.0, 4.0, 220, SOFT)

# ==========================================================================
#  Z2 RUANG KELUARGA 8–15: dinding belakang krem, dua ceruk berbingkai kayu
#  bercahaya, sumur cahaya di plafon tengah, kolom putih
# ==========================================================================
H2 = 3.2
ceiling(8, 10.3, FRONT, 5.5, H2, M['white']); ceiling(12.7, 15, FRONT, 5.5, H2, M['white'])
ceiling(10.3, 12.7, FRONT, 3.2, H2, M['white']); ceiling(10.3, 12.7, 5.0, 5.5, H2, M['white'])
# sumur cahaya 2,4 × 1,8 naik ke z 4,6
B('sumur kiri', 10.15, 10.3, 3.2, 5.0, H2, 4.6, M['white']); B('sumur kanan', 12.7, 12.85, 3.2, 5.0, H2, 4.6, M['white'])
B('sumur depan', 10.3, 12.7, 3.05, 3.2, H2, 4.6, M['white']); B('sumur belakang', 10.3, 12.7, 5.0, 5.15, H2, 4.6, M['white'])
B('langit sumur', 10.3, 12.7, 3.2, 5.0, 4.6, 4.62, M['sky'])
R.area(c, 'cahaya sumur', (11.5, 4.1, 4.5), (0, 0, 0), 2.3, 1.7, 420, DAY)
B('dinding belakang', 8.0, 15.0, 5.5, 5.7, 0, H2, M['beige'])
for (x0, x1) in ((8.4, 10.2), (12.8, 14.6)):
    B('bingkai ceruk', x0, x1, 5.1, 5.5, 0.0, 2.75, M['walnut'])
    B('ceruk dalam', x0 + 0.12, x1 - 0.12, 5.05, 5.1, 0.95, 2.6, M['walnut_d'])
    B('ceruk bawah', x0 + 0.08, x1 - 0.08, 4.95, 5.1, 0.0, 0.85, M['walnut'])
    B('panel ceruk', x0 + 0.45, x1 - 0.45, 5.04, 5.05, 1.15, 2.4, M['stone'])
    R.spot(c, 'sorot ceruk', ((x0 + x1) / 2, 4.7, 2.62), ((x0 + x1) / 2, 5.05, 1.5), 70, WARM, ang=70, blend=.7)
    B('led ceruk', x0 + 0.14, x1 - 0.14, 5.06, 5.09, 2.56, 2.58, M['led'])
B('kolom putih 2', 14.6, 15.0, 1.6, 2.0, 0, H2, M['white'])
for x in (8.9, 14.1):
    for y in (0.6, 3.2):
        downlight(x, y, H2, energy=110)
for x in (9.3, 13.7):
    wallwash(x, 5.0, H2, 150)
R.area(c, 'isi keluarga', (11.5, 0.5, H2 - 0.05), (0, 0, 0), 5.0, 4.0, 260, SOFT)

# ==========================================================================
#  Z3 BILIAR 15–22,3: plafon balok walnut, dinding belakang krem dengan 3 sorot,
#  dinding kiri tegak lurus berceruk (lemari bercahaya), blok dinding tebal di kanan
# ==========================================================================
H3 = 3.4
ceiling(15, 22.3, FRONT, 5.4, H3, M['white'])
y = FRONT + 0.4
while y < 5.3:
    B('balok', 15.0, 22.3, y - 0.06, y + 0.06, H3 - 0.2, H3, M['walnut']); y += 0.55
B('dinding belakang', 15.0, 22.3, 5.2, 5.4, 0, H3, M['beige'])
# dinding kiri (menghadap +X) berceruk
B('dinding ceruk kiri', 15.0, 15.35, 0.9, 5.2, 0, H3, M['beige'])
for k, (y0, y1) in enumerate(((1.2, 2.3), (2.5, 3.6), (3.8, 4.9))):
    B('ceruk lemari', 15.35, 15.65, y0, y1, 0.0, 2.6, M['walnut'])
    B('panel lemari', 15.66, 15.67, y0 + 0.15, y1 - 0.15, 0.9, 2.4, M['stone'])
    R.spot(c, 'sorot lemari', (15.95, (y0 + y1) / 2, 2.55), (15.66, (y0 + y1) / 2, 1.5), 55, WARM, ang=70, blend=.7)
for x in (16.8, 18.6, 20.4):
    wallwash(x, 5.2, H3 - 0.2, 190)
B('blok kanan', 21.3, 22.3, 0.8, 5.2, 0, H3, M['beige'])
for x in (17.0, 19.6):
    downlight(x, 1.2, H3 - 0.2, energy=120)
R.area(c, 'isi biliar', (18.6, 1.0, H3 - 0.25), (0, 0, 0), 5.0, 4.0, 260, SOFT)

# ==========================================================================
#  Z4 KAMAR 22,3–28,5: dinding kepala ranjang krem + pita gelap bawah, dua sorot,
#  ceruk lemari bercahaya di kanan
# ==========================================================================
H4 = 3.0
ceiling(22.3, 28.5, FRONT, 5.2, H4, M['white'])
B('dinding belakang', 22.3, 28.5, 5.0, 5.2, 0, H4, M['beige'])
B('pita bawah', 22.9, 26.2, 4.95, 5.0, 0, 1.15, M['band'])
for x in (23.6, 25.5):
    wallwash(x, 5.0, H4, 160)
B('ceruk lemari kamar', 26.6, 28.1, 5.0, 5.7, 0, 2.6, M['beige'])
B('dinding ceruk', 26.6, 28.1, 5.7, 5.9, 0, H4, M['beige'])
B('atas ceruk', 26.6, 28.1, 5.0, 5.9, 2.6, H4, M['beige'])
B('sisi ceruk kiri', 26.4, 26.6, 5.0, 5.9, 0, H4, M['beige'])
B('sisi ceruk kanan', 28.1, 28.3, 5.0, 5.9, 0, H4, M['beige'])
B('led lemari', 26.7, 28.0, 5.55, 5.6, 2.55, 2.58, M['led'])
B('kolom kamar', 28.3, 28.5, 0.8, 5.9, 0, H4, M['beige'])
for x in (23.3, 27.3):
    downlight(x, 1.4, H4, energy=100)
R.area(c, 'isi kamar', (25.4, 1.0, H4 - 0.05), (0, 0, 0), 4.5, 4.0, 200, SOFT)

# ==========================================================================
#  Z5 RUANG MARMER 28,5–34: dinding marmer hangat, lis cahaya plafon,
#  cekungan plafon bundar dengan cincin LED
# ==========================================================================
H5 = 3.0
ceiling(28.5, 34, FRONT, 5.0, H5, M['white'])
B('dinding belakang', 28.5, 34.0, 4.8, 5.0, 0, H5, M['beige'])
B('marmer', 30.2, 34.0, 4.75, 4.8, 0, H5 - 0.2, M['marble'])
B('lis plafon', 28.5, 34.0, 4.45, 4.8, H5 - 0.2, H5, M['white'])
B('led lis', 28.6, 33.9, 4.72, 4.75, H5 - 0.22, H5 - 0.21, M['led'])
R.cyl(c, 'cincin led bundar', 31.6, 2.6, H5 - 0.02, H5, 0.62, M['led'])
R.cyl(c, 'cekungan bundar', 31.6, 2.6, H5 - 0.025, H5 - 0.015, 0.58, M['white'])
R.spot(c, 'sorot bundar', (31.6, 2.6, H5 - 0.05), (31.6, 2.6, 0), 160, WARM, ang=80, blend=.8)
for x in (29.4, 33.4):
    wallwash(x, 4.75, H5, 150)
R.area(c, 'isi marmer', (31.2, 0.8, H5 - 0.05), (0, 0, 0), 4.5, 4.0, 240, SOFT)

# ==========================================================================
#  Z6 BAR 34–41: gelap — dinding arang, plafon hitam, lantai marmer gelap,
#  panel walnut bergaris, tiga ceruk rak bercahaya, dinding bilah kayu kanan
# ==========================================================================
H6 = 3.3
ceiling(34, 41, FRONT, 5.2, H6, M['cblack'])
B('dinding belakang bar', 34.0, 41.0, 5.0, 5.2, 0, H6, M['char'])
for (x0, x1) in ((34.3, 35.5), (37.7, 38.4)):
    B('panel walnut', x0, x1, 4.9, 5.0, 0, H6, M['walnut'])
    R.flutes(c, 'walnut garis', x0 + 0.01, x1 - 0.01, 4.9, 0.0, H6, M['walnut'], pitch=0.05, depth=0.016)
for (x0, x1) in ((35.7, 37.5), (38.6, 39.7)):
    B('cahaya rak', x0, x1, 4.985, 5.0, 0.9, 2.75, M['glow'])               # dinding belakang rak bercahaya
    B('sisi rak kiri', x0 - 0.04, x0, 4.65, 5.0, 0.9, 2.75, M['walnut'])
    B('sisi rak kanan', x1, x1 + 0.04, 4.65, 5.0, 0.9, 2.75, M['walnut'])
    for z in (0.9, 1.5, 2.1, 2.71):
        B('ambalan', x0, x1, 4.65, 4.985, z, z + 0.035, M['walnut'])
    R.area(c, 'cahaya rak', ((x0 + x1) / 2, 4.75, 1.8), (math.radians(-90), 0, 0), x1 - x0, 1.8, 22, R.kelvin(3200), spread=150)
x = 40.0
while x < 41.0:
    B('bilah kayu', x, x + 0.04, 0.6, 5.0, 0, H6, M['walnut_d']); x += 0.08
for x in (35.2, 37.6, 39.4):
    downlight(x, 2.6, H6, energy=90, ang=45)
R.area(c, 'isi bar', (37.5, 0.8, H6 - 0.05), (0, 0, 0), 4.5, 3.5, 110, WARM)

# ==========================================================================
#  Z7 LOUNGE 41–47: blok dinding terakota menghadap kamera disorot 3 lampu,
#  plafon hitam, latar gelap; kembali ke lobi (krem) di ujung kanan
# ==========================================================================
H7 = 3.3
ceiling(41, 47, FRONT, 5.2, H7, M['cblack'])
B('dinding belakang lounge', 41.0, 47.0, 5.0, 5.2, 0, H7, M['dark'])
B('blok terakota', 41.6, 45.6, 3.6, 4.4, 0, H7, M['terra'])
for x in (42.3, 43.6, 44.9):
    wallwash(x, 3.6, H7, 220)
B('peralihan krem', 46.2, 47.0, 1.0, 5.0, 0, H7, M['beige'])
downlight(43.6, 1.0, H7, energy=80)
R.area(c, 'isi lounge', (44.0, 0.5, H7 - 0.05), (0, 0, 0), 4.0, 3.0, 90, WARM)

# ---------------------------------------------------------------- deret + salinan untuk putaran
sc.world = bpy.data.worlds.new('gelap')
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass
for i, off in enumerate((-L, 0.0, L)):
    inst = bpy.data.objects.new('galery1 %d' % i, None)
    inst.instance_type = 'COLLECTION'; inst.instance_collection = c
    inst.location = (off, 0, 0); sc.collection.objects.link(inst)
R._layer_coll(c).exclude = True

# ---------------------------------------------------------------- kamera: berjalan menyamping, sedikit menoleh
cd = bpy.data.cameras.new('kamera'); cd.lens = float(arg('lens', 22)); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.shift_y = float(arg('shift', -0.04)); cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
CAM_Y, CAM_Z, X0 = float(arg('camy', -2.2)), float(arg('camz', 1.45)), float(arg('x0', 3.0))
# titik kunci: frame galery1 → posisi kamera x (dicocokkan dengan video; di antaranya linear)
KEYS = [(0, 3.6), (12, 11.5), (24, 14.6), (36, 18.4), (54, 21.2), (78, 25.2), (96, 31.0), (114, 34.4), (126, 37.6), (150, 43.4), (165, 3.6 + L)]
def x_of(f):
    f = f % REF_N
    for (fa, xa), (fb, xb) in zip(KEYS, KEYS[1:]):
        if fa <= f <= fb: return xa + (xb - xa) * (f - fa) / (fb - fa)
    return KEYS[0][1]
def cam_at(f):
    """f = nomor frame galery1 (boleh pecahan) → posisi & arah kamera."""
    x = x_of(f)
    yaw = math.radians(float(arg('yaw', 6)) * math.sin(2 * math.pi * f / REF_N * 7))   # menoleh halus seperti video
    cam.location = (x, CAM_Y, CAM_Z)
    cam.rotation_euler = (math.radians(90), 0, -yaw)

R.color_management(sc, float(arg('exposure', 1.0)), float(arg('wb', 4300)))
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
if arg('preview'): R.eevee(sc)
else: R.cycles(sc, SAMPLES)
if arg('blend'): bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'galery1.blend'))

SEQ = int(arg('seq', 0))
if SEQ:
    sd = os.path.join(OUT, 'seq'); os.makedirs(sd, exist_ok=True)
    rng = [int(v) for v in str(arg('range', '0:%d:1' % SEQ)).split(':')]   # mis. --range 47:165:2 (lanjutkan / pratinjau cepat)
    for k in range(*rng):
        if arg('skip') and os.path.exists(os.path.join(sd, '%03d.jpg' % k)): continue
        cam_at(REF_N * k / SEQ)
        t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(sd, '%03d' % k), webp=False)
        print('[galery1] frame %d/%d %.1f s' % (k + 1, SEQ, time.time() - t0), flush=True)
else:
    for s in str(arg('shots', '0,12,36,78,96,126,150')).split(','):
        cam_at(float(s))
        t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s))), webp=False)
        print('[galery1] frame %s %.1f s' % (s, time.time() - t0), flush=True)
