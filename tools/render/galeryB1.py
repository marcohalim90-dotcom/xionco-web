# ==========================================================================
#  XIONCO — Galeri versi B1 · "Paviliun Pagi" (23 Okt 2026; lingkungan BERBEDA dari v12)
#  Ide (dari subjek, bukan kategori): XIONCO memproduksi furnitur dari kayu tropis (meranti, jati, walnut) di Indonesia →
#  galeri = PAVILIUN TROPIS MODERN: satu lorong panjang (enfilade) 4 ruang-pameran yang dilalui lurus, dipisah dinding portal tebal;
#  cahaya utama matahari pagi lewat kisi jati (clerestory kanan) → garis-garis bayangan di lantai & dinding, taman dalam (courtyard)
#  di kiri lewat kaca penuh + vitrase; dinding limewash pasir, lantai terrazzo hangat, aksen tanah liat & zaitun; lampu 2700K tipis.
#  Kamera: dolly lurus pelan 1,45 m, lensa 28 mm, arah pandang hanya berubah SEDIKIT & monoton (tidak menoleh kiri-kanan), tanpa zoom.
#  Furnitur: beberapa dari katalog (SF3S 074, CUBIX 3S, HOUT, NORA + LOPHUS, SOMNO, QAZTAC, SYME, AETHER, SHUSIO W3, LUCID, KYOUKAI)
#  + aset CC0 Poly Haven (tanaman, vas, bingkai) + CC-BY (lampu meja, lampu dinding — kredit di assets/galeri/kredit.json).
#  Pakai:  blender -b --factory-startup -P tools/render/galeryB1.py -- [--size 1600x900] [--samples 96] [--frames 0-179] [--shots 0,60]
#          --check (statistik langkah kamera) · frame tersimpan output/galeri/galeryB1/fNNN.jpg (dilewati bila sudah ada → bisa dilanjutkan)
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

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galeryB1'))
SIZE = [int(v) for v in str(arg('size', '1600x900')).lower().split('x')]
SAMPLES = int(arg('samples', 96))
NF = int(arg('nf', 180))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
c = bpy.data.collections.new('galeryB1'); sc.collection.children.link(c)
B = lambda *a, **k: R.box(c, *a, **k)
rnd = random.Random(7)

# ---------------------------------------------------------------- ukuran paviliun (m) · +Y = arah jalan, X kiri(−)/kanan(+), Z atas
W = 7.2; HX = W / 2                     # lebar dalam
H = 3.5                                  # plafon
T = 0.24                                 # tebal dinding luar
PT = 0.5                                 # tebal dinding portal
L = 26.0                                 # panjang lorong
PORTALS = [6.6, 13.2, 19.8]              # y tengah dinding portal → 4 ruang
PW, PH = 3.4, 2.75                       # bukaan portal lebar × tinggi
K27 = R.kelvin(2950); K30 = R.kelvin(3100); SUNK = R.kelvin(5200)

# ---------------------------------------------------------------- bahan (satu dasar: pasir limewash · satu tinta: jati gelap · aksen: tanah liat & zaitun)
SAND = '#d8ccb6'; SANDL = '#e6ddcc'; CLAY = '#b48a67'; OLIVE = '#7f8165'; TEAK = '#7d5230'; TEAKD = '#5a3a22'
M = {
    'floor': R.tex_mat('terrazzo hangat', 'stone-terrazzo', 0.75, tint='#d9cfbf', rough=0.28, coat=0.14, nstr=0.25, hsv=(0.5, 0.3, 1.25), mute=0.55),   # serpihan halus & tenang
    'wall':  R.tex_mat('limewash pasir', 'room-wall-limewash', 2.2, tint=SAND, rmul=1.05, nstr=0.5, hsv=(0.5, 0.1, 1.2)),
    'wallL': R.tex_mat('limewash terang', 'room-wall-limewash', 2.2, tint=SANDL, rmul=1.05, nstr=0.4, hsv=(0.5, 0.1, 1.2)),
    'clay':  R.tex_mat('plester tanah liat', 'ph-clay_plaster', 1.6, tint=CLAY, rmul=1.0, nstr=0.7, hsv=(0.5, 0.25, 1.15)),
    'olive': R.tex_mat('limewash zaitun', 'room-wall-limewash', 2.2, tint=OLIVE, rmul=1.05, nstr=0.5, hsv=(0.5, 0.1, 1.1)),
    'ceil':  R.tex_mat('plafon limewash', 'room-wall-limewash', 3.0, tint='#ebe4d7', rough=0.92, nstr=0.2),
    'teak':  R.tex_mat('jati', 'wood-teak', 0.9, tint=TEAK, rmul=0.85, nstr=0.45, coat=0.06, rot=90),
    'teakd': R.tex_mat('jati gelap', 'wood-teak', 0.9, tint=TEAKD, rmul=0.85, nstr=0.45, coat=0.08, rot=90),
    'walnut': R.tex_mat('walnut', 'ph-smoked_walnut_veneer', 1.2, tint='#6b4830', rmul=0.8, nstr=0.4, coat=0.1),
    'conc':  R.tex_mat('beton halus', 'room-floor-concrete', 2.0, tint='#bdb3a4', rough=0.6, nstr=0.3, hsv=(0.5, 0.0, 1.1)),
    'gravel': R.tex_mat('kerikil taman', 'x-lantai-gravel', 1.2, tint='#cfc5b4', rough=0.95, nstr=1.0),
    'brass': R.flat_mat('kuningan', '#b08a4e', 0.3, 1.0),
    'black': R.flat_mat('baja hitam', '#1c1b1a', 0.45, 0.8),
    'glass': R.flat_mat('kaca', '#ffffff', 0.02),
    'led27': R.emit_mat('led 2700K', K27, 9.0),
    'ledw':  R.emit_mat('kap lampu', K27, 4.0),
    'sheer': R.sheer_mat('vitrase linen', '#efe8db', 0.5),
    'linen': R.tex_mat('linen krem', 'fabric-linen', 0.3, tint='#d9d0bf', rough=0.92, nstr=0.9, sheen=0.4, hsv=(0.5, 0.0, 1.4)),
}
gl = M['glass']; _nt = gl.node_tree; _N = _nt.nodes; _b = _N.get('Principled BSDF'); _b.inputs['Transmission Weight'].default_value = 1.0; _b.inputs['IOR'].default_value = 1.5
_out = _N.get('Material Output'); _lp = _N.new('ShaderNodeLightPath'); _tr = _N.new('ShaderNodeBsdfTransparent'); _mx = _N.new('ShaderNodeMixShader')
_nt.links.new(_b.outputs[0], _mx.inputs[1]); _nt.links.new(_tr.outputs[0], _mx.inputs[2]); _nt.links.new(_lp.outputs['Is Shadow Ray'], _mx.inputs['Fac']); _nt.links.new(_mx.outputs[0], _out.inputs['Surface'])
def fab(name, hexc, tset='fabric-linen', sc_=0.3, sheen=0.4): return R.tex_mat(name, tset, sc_, tint=hexc, rough=0.92, nstr=0.9, sheen=sheen, hsv=(0.5, 0.0, 1.45))

# ---------------------------------------------------------------- cangkang: lantai, plafon, dinding luar
B('lantai', -HX - T, HX + T, -T, L + T, -0.1, 0.0, M['floor'])
B('plafon', -HX - T, HX + T, -T, L + T, H, H + 0.3, M['ceil'])
B('tembok awal', -HX - T, HX + T, -T, 0.0, 0.0, H, M['wall'])
B('tembok akhir', -HX - T, HX + T, L, L + T, 0.0, H, M['wall'])

def wall_seg(name, x_in, side, ya, yb, za=0.0, zb=None, mat=None):
    """Potongan dinding luar setebal T di sisi x (side −1 kiri, +1 kanan) dari ya..yb, tinggi za..zb."""
    zb = H if zb is None else zb
    x0, x1 = (x_in - T, x_in) if side < 0 else (x_in, x_in + T)
    return B(name, x0, x1, ya, yb, za, zb, mat or M['wall'])

# kanan (+X): dinding penuh dengan CLERESTORY (jendela pita z 2.35–3.15) berkisi jati sepanjang lorong, dibagi per ruang oleh pilar
CLZ0, CLZ1 = 2.2, 3.2
for k in range(4):
    ya = (PORTALS[k - 1] + PT / 2 if k else 0.0); yb = (PORTALS[k] - PT / 2 if k < 3 else L)
    wall_seg('kanan bawah', HX, 1, ya, yb, 0, CLZ0)
    wall_seg('kanan atas', HX, 1, ya, yb, CLZ1, H)
    # kisi jati tegak di bukaan (40 × 60 mm tiap 150 mm) + kaca di belakangnya
    y = ya + 0.08
    while y < yb - 0.06:
        B('kisi', HX + 0.02, HX + 0.08, y, y + 0.045, CLZ0, CLZ1, M['teakd'], bevel=0.003); y += 0.15
    B('kaca clerestory', HX + 0.14, HX + 0.15, ya, yb, CLZ0, CLZ1, gl)
    B('ambang', HX - 0.01, HX + T, ya, yb, CLZ0 - 0.03, CLZ0, M['teak'], bevel=0.004)
    R.area(c, 'portal cl', (HX + 0.1, (ya + yb) / 2, (CLZ0 + CLZ1) / 2), (0, math.radians(90), 0), CLZ1 - CLZ0, yb - ya, 0, spread=180).data.cycles.is_portal = True

# kiri (−X): dinding dengan dua bukaan kaca penuh ke TAMAN DALAM (ruang 2 & 4), sisanya dinding limewash
COURT = [(1.0, 5.9), (7.3, 12.6), (14.0, 17.6), (20.4, 25.2)]      # y0..y1 kaca taman (satu courtyard panjang di sisi kiri, tiap ruang punya bukaan)
_y = 0.0
for (ca, cb) in COURT + [(L, L)]:
    if ca > _y: wall_seg('kiri', -HX, -1, _y, ca)
    if cb > ca:
        wall_seg('kiri ambang atas', -HX, -1, ca, cb, 2.7, H)
        # kusen jati tipis + kaca + rel vitrase
        for yy in (ca, cb - 0.06): B('kusen', -HX - 0.12, -HX - 0.02, yy, yy + 0.06, 0, 2.7, M['teakd'], bevel=0.003)
        B('kusen atas', -HX - 0.12, -HX - 0.02, ca, cb, 2.64, 2.7, M['teakd']); B('kusen bawah', -HX - 0.12, -HX - 0.02, ca, cb, 0, 0.04, M['teakd'])
        ym = (ca + cb) / 2; B('kusen tengah', -HX - 0.12, -HX - 0.02, ym - 0.025, ym + 0.025, 0, 2.64, M['teakd'])
        B('kaca taman', -HX - 0.075, -HX - 0.065, ca, cb, 0.04, 2.64, gl)
        R.area(c, 'portal taman', (-HX - 0.05, ym, 1.35), (0, math.radians(-90), 0), 2.6, cb - ca, 0, spread=180).data.cycles.is_portal = True
        # vitrase: tirai linen tipis separuh dibuka (menumpuk di sisi dalam dekat portal)
        R.curtain(c, 'vitrase', -HX + 0.1, ca + 0.05, ca + (cb - ca) * 0.42, 0.02, 2.62, M['sheer'], folds_per_m=9, depth=0.06, axis='y')
        B('rel tirai', -HX + 0.02, -HX + 0.16, ca, cb, 2.62, 2.68, M['black'])
        # taman dalam: lantai kerikil, dinding taman limewash 3,4 m di luar, tanaman
        B('kerikil', -HX - 3.6, -HX - T, ca - 1.2, cb + 1.2, -0.1, -0.02, M['gravel'])
        B('tembok taman', -HX - 3.8, -HX - 3.6, ca - 1.6, cb + 1.6, -0.1, 3.4, M['wall'])
        B('tembok taman samping a', -HX - 3.8, -HX - T, ca - 1.6, ca - 1.4, -0.1, 3.4, M['wallL'])
        B('tembok taman samping b', -HX - 3.8, -HX - T, cb + 1.4, cb + 1.6, -0.1, 3.4, M['wallL'])
        R.place(c, 'pachira_aquatica_01', (-HX - 2.3, ca + 0.9, -0.02), 30, fit=('z', 2.6), pick=['bark_a', 'leaves_a'])
        R.place(c, 'calathea_orbifolia_01', (-HX - 1.2, cb - 0.8, -0.02), 10, fit=('z', 1.1), pick='_a')
        R.place(c, 'dry_branches_medium_01', (-HX - 2.9, cb - 0.3, -0.02), 60, fit=('z', 1.6), pick='_01_a')
    _y = cb

# dinding PORTAL (tebal 0,5 m): bukaan di tengah, sisi bukaan dilapis jati (ambang & tiang)
for k, py in enumerate(PORTALS):
    ya, yb = py - PT / 2, py + PT / 2
    B('portal kiri', -HX, -PW / 2, ya, yb, 0, H, M['wall']); B('portal kanan', PW / 2, HX, ya, yb, 0, H, M['wall'])
    B('portal atas', -PW / 2, PW / 2, ya, yb, PH, H, M['wall'])
    B('bingkai portal kiri', -PW / 2 - 0.02, -PW / 2 + 0.06, ya - 0.015, yb + 0.015, 0, PH + 0.06, M['teak'], bevel=0.004)
    B('bingkai portal kanan', PW / 2 - 0.06, PW / 2 + 0.02, ya - 0.015, yb + 0.015, 0, PH + 0.06, M['teak'], bevel=0.004)
    B('bingkai portal atas', -PW / 2 - 0.02, PW / 2 + 0.02, ya - 0.015, yb + 0.015, PH, PH + 0.06, M['teak'], bevel=0.004)
    R.area(c, 'portal bukaan', (0, py, PH / 2), (math.radians(90), 0, 0), PW, PH, 0, spread=180).data.cycles.is_portal = True

# cove LED 2700K tipis sepanjang tepi plafon kiri & kanan tiap ruang (lembut) + lis plafon
for k in range(4):
    ya = (PORTALS[k - 1] + PT / 2 if k else 0.0) + 0.3; yb = (PORTALS[k] - PT / 2 if k < 3 else L) - 0.3
    for sx in (-1, 1):
        x = sx * (HX - 0.22)
        B('cove', x - 0.015, x + 0.015, ya, yb, H - 0.012, H, M['led27'])
        R.area(c, 'cahaya cove', (x, (ya + yb) / 2, H - 0.03), (0, 0, 0), 0.08, yb - ya, 14 * (yb - ya) / 6, color=K27, spread=140)

# ---------------------------------------------------------------- cahaya utama: matahari pagi (lampu Sun) + langit lembut (HDRI CC0)
wd = bpy.data.worlds.new('langit'); sc.world = wd; wd.use_nodes = True; wn = wd.node_tree.nodes; wl = wd.node_tree.links
env = wn.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(os.path.join(R.ROOT, 'data', 'source', 'render-lib', 'hdri', 'kloofendal_overcast_puresky_2k.hdr'))
bg = wn['Background']; bg.inputs['Strength'].default_value = float(arg('sky', 2.8)); wl.new(env.outputs['Color'], bg.inputs['Color'])
SUN_EL, SUN_AZ = float(arg('sunel', 31)), float(arg('sunaz', 9))      # dari KANAN (+X, hampir tegak lurus lorong) → lewat kisi clerestory, garis cahaya melintang di lantai (dicek ray-cast)
sd = bpy.data.lights.new('matahari', 'SUN'); sd.energy = float(arg('sun', 6.0)); sd.color = SUNK; sd.angle = math.radians(1.1)
so = bpy.data.objects.new('matahari', sd); c.objects.link(so)
dirv = Vector((math.cos(math.radians(SUN_EL)) * math.cos(math.radians(SUN_AZ)), math.cos(math.radians(SUN_EL)) * math.sin(math.radians(SUN_AZ)), math.sin(math.radians(SUN_EL))))
so.rotation_euler = (-dirv).to_track_quat('-Z', 'Y').to_euler(); so.location = (0, L / 2, 10)

# ---------------------------------------------------------------- perangkat & aksesoris
SKF = os.path.join(R.ROOT, 'data', 'source', 'render-lib', 'sketchfab')
def skf(name): return os.path.join(SKF, name, name + '.glb')
def put(pid, x, y, rot=0.0, z=0.0, **kw): return R.place(c, pid, (x, y, z), rot, **kw)
def rug(cx, cy, w, d, hexc, tset='ph-poly_wool_herringbone', rot=0.0, hsv=(0.5, 0.15, 1.25)):
    ob = B('karpet', -w / 2, w / 2, -d / 2, d / 2, 0, 0.016, R.tex_mat('karpet ' + hexc, tset, 0.45, tint=hexc, rough=0.97, nstr=1.0, sheen=0.5, hsv=hsv), bevel=0.007)
    ob.location = (cx, cy, 0); ob.rotation_euler.z = math.radians(rot); return ob
def pot(x, y, hexc='#c9b9a2', r=0.26, h=0.5):
    return R.pot(c, 'pot', x, y, r, r * 0.82, h, R.tex_mat('pot ' + hexc, 'ph-clay_plaster', 0.5, tint=hexc, rough=0.75, nstr=0.6, hsv=(0.5, 0.2, 1.2)))
def plant(kind, x, y, h, pot_hex='#c9b9a2', r=0.25, rot=0, pick='_a'):
    ph = pot(x, y, pot_hex, r, r * 1.9); R.place(c, kind, (x, y, ph - 0.03), rot, fit=('z', h), pick=pick)
LEATHERS = ['#3a3430', '#6b5540', '#8c7356', '#2a2f3a', '#a08a6a']
def books(x, y, z, n=3, w=0.22, d=0.16, rot=0.0):
    """Tumpukan n buku (kotak kulit berbeda warna), sedikit bergeser & berputar."""
    zz = z
    for k in range(n):
        hx = LEATHERS[(k + int(x * 7 + y * 3)) % len(LEATHERS)]; t = 0.03 + 0.012 * (k % 2)
        ob = B('buku', -w / 2, w / 2, -d / 2, d / 2, 0, t, R.tex_mat('buku ' + hx, 'leather-fine', 0.3, tint=hx, rough=0.55, nstr=0.6), bevel=0.003)
        ob.location = (x + rnd.uniform(-0.012, 0.012), y + rnd.uniform(-0.012, 0.012), zz); ob.rotation_euler.z = math.radians(rot + rnd.uniform(-7, 7)); zz += t
    return zz
def slat_wall(x_face, side, ya, yb, z0, z1, pitch=0.09, w=0.045, d=0.04, mat=None):
    """Panel kisi jati tegak di muka dinding x (side = arah menghadap)."""
    mat = mat or M['teak']; y = ya + 0.02
    while y < yb - w:
        B('bilah', x_face if side > 0 else x_face - d, x_face + d if side > 0 else x_face, y, y + w, z0, z1, mat, bevel=0.003); y += pitch
def wall_lamp(x, y, z=1.75, side=1):
    """Lampu dinding AETHER CLOUD K60 (katalog) menempel di dinding x: cahaya garis tegak di dinding (wall-wash tipis)."""
    try:
        piv, obs = put('aether', x + side * 0.05, y, 90 if side > 0 else -90, z=z - 0.3)
    except Exception as e: print('[B1] aether', e)
    R.spot(c, 'cahaya dinding', (x + side * 0.1, y, z - 0.05), (x, y, z - 1.2), 140, K27, size=0.03, ang=78, blend=0.9)
    R.spot(c, 'cahaya dinding atas', (x + side * 0.1, y, z + 0.05), (x, y, z + 1.2), 110, K27, size=0.03, ang=78, blend=0.9)
def pendant(x, y, z_bottom, r=0.26, h=0.3):
    """Lampu gantung drum linen: kap tembus cahaya + bola lampu di dalam + kabel hitam."""
    R.cyl(c, 'kap linen', x, y, z_bottom, z_bottom + h, r, M['linen'], seg=48)
    R.cyl(c, 'kap dalam', x, y, z_bottom + 0.01, z_bottom + h - 0.01, r - 0.004, M['ledw'], seg=48)
    R.cyl(c, 'kabel', x, y, z_bottom + h, H, 0.004, M['black'], seg=12)
    R.cyl(c, 'rozet', x, y, H - 0.02, H, 0.05, M['black'], seg=24)
    R.point(c, 'cahaya gantung', (x, y, z_bottom + h * 0.5), 140, K27, size=0.07)

# ================================================================ RUANG 1 · BERANDA (y 0 – 6.35): taman di kiri; kanan: panel kisi jati + konsol SHUSIO, lukisan, bangku, tanaman besar
y0, y1 = 0.0, PORTALS[0] - PT / 2
slat_wall(HX, -1, 0.5, 3.9, 0.0, CLZ0 - 0.04, mat=M['teak'])                                # panel kisi jati di dinding kanan (di bawah clerestory)
try: put('shusio-w3-console-table', HX - 0.34, 2.2, -90)
except Exception as e: print('[B1] shusio', e)
R.place(c, 'brass_vase_02', (HX - 0.32, 1.75, 0.85), 0, fit=('z', 0.34))
R.place(c, 'ceramic_vase_01', (HX - 0.36, 2.55, 0.85), 15, fit=('z', 0.27))
books(HX - 0.32, 2.15, 0.85, 3, rot=90)
R.spot(c, 'sorot konsol', (HX - 0.9, 2.2, H - 0.05), (HX - 0.3, 2.2, 0.9), 160, K30, size=0.05, ang=46, blend=0.75)
try:
    art = R.tex_mat('lukisan', 'x-tembok-wallpaper-002-c', 1.0, tint='#9a8468', rough=0.8, nstr=0.3)
    B('bingkai lukisan', HX - 0.05, HX - 0.03, 4.3, 5.9, 0.95, 2.05, M['walnut'], bevel=0.004)
    B('kanvas', HX - 0.031, HX - 0.03, 4.35, 5.85, 1.0, 2.0, art)
    R.spot(c, 'sorot lukisan', (HX - 0.7, 5.1, H - 0.05), (HX, 5.1, 1.5), 150, K30, size=0.04, ang=44, blend=0.7)
except Exception as e: print('[B1] lukisan', e)
try: put('shusio-5-shoe-storage-bench-minimalis', HX - 0.4, 5.1, -90)
except Exception as e: print('[B1] shusio5', e)
plant('pachira_aquatica_01', -2.65, 0.7, 2.3, '#b9a890', 0.3, 40, pick=['bark_b', 'leaves_b'])
plant('anthurium_botany_01', 2.6, 6.0, 0.9, '#8f8470', 0.22, 0, pick='_01_a')
rug(-0.2, 3.3, 2.6, 4.4, '#c7b9a3', rot=0)
R.place(c, 'wicker_basket_01', (HX - 0.5, 0.65, 0.0), 20, fit=('x', 0.5))

# ================================================================ RUANG 2 · RUANG DUDUK (y 6.85 – 12.95): sofa SF3S 074 & CUBIX, karpet, meja HOUT, lampu lantai AETHER
ya, yb = PORTALS[0] + PT / 2, PORTALS[1] - PT / 2; ym = (ya + yb) / 2
B('dinding aksen tanah liat', HX - 0.03, HX, ya, yb, 0, CLZ0, M['clay'])                      # dinding kanan bawah: plester tanah liat
rug(0.9, ym, 3.6, 4.6, '#cfc3ae', rot=0)
try: put('sf3s-074', 2.45, ym - 0.1, -90)                                                        # sofa menghadap taman (kiri)
except Exception as e: print('[B1] sf3s', e)
try: put('cubix-series-3-seaters-ac-al-ac-kayu-terang', -1.45, ym + 0.1, 90)                   # CUBIX berhadapan (menghadap kanan)
except Exception as e: print('[B1] cubix', e)
try: put('hout-portable-coffee-table', 0.55, ym, 0)
except Exception as e: print('[B1] hout', e)
R.place(c, 'wooden_bowl_01', (0.55, ym + 0.12, 0.37), 0, fit=('x', 0.26))
books(0.55, ym - 0.2, 0.37, 2, rot=10)
try: put('aether-standing-side-floor-lamp', 2.9, yb - 1.0, 0)
except Exception as e: print('[B1] aether lantai', e)
R.point(c, 'cahaya lampu lantai', (2.9, yb - 1.0, 1.45), 45, K27, size=0.05)
try: put('recta-st62019', 2.5, ya + 1.1, 0)
except Exception as e: print('[B1] recta st', e)
R.place(c, 'ceramic_vase_03', (2.5, ya + 1.1, 0.6), 0, fit=('z', 0.3))
plant('calathea_orbifolia_01', -2.6, yb - 0.9, 1.1, '#4a4844', 0.26, 0)
# tiga bingkai gambar kecil berderet di dinding tanah liat
for i, yy in enumerate((ya + 1.6, ya + 2.9, ya + 4.2)):
    try: R.place(c, 'hanging_picture_frame_02', (HX - 0.04, yy, 1.35), -90, fit=('z', 0.62))
    except Exception as e: print('[B1] frame', e)
R.spot(c, 'sorot gambar', (HX - 0.6, ya + 2.9, H - 0.05), (HX, ya + 2.9, 1.3), 120, K30, size=0.04, ang=40, blend=0.7)

# ================================================================ RUANG 3 · RUANG MAKAN (y 13.45 – 19.55): NORA + 6 LOPHUS, lampu gantung linen, LUCID & kredensa
ya, yb = PORTALS[1] + PT / 2, PORTALS[2] - PT / 2; ym = (ya + yb) / 2
B('dinding aksen zaitun', HX - 0.03, HX, ya, yb, 0, CLZ0, M['olive'])                           # dinding kanan bawah zaitun (balik kredensa)
try:
    DX = 1.95
    tp, tob = put('nora-dining-table', DX, ym, 90)
    tz = R.top_of(tob)
    R.place(c, 'ceramic_vase_02', (DX, ym + 0.35, tz), 0, fit=('z', 0.3)); R.place(c, 'carved_wooden_plate', (DX, ym - 0.35, tz), 0, fit=('x', 0.3))
except Exception as e: print('[B1] nora', e)
for (xx, yy, rr) in ((DX - 0.95, ym - 0.9, 90), (DX - 0.95, ym, 90), (DX - 0.95, ym + 0.9, 90), (DX + 0.95, ym - 0.9, -90), (DX + 0.95, ym, -90), (DX + 0.95, ym + 0.9, -90)):   # kursi kiri menghadap +X, kanan −X
    try: put('lophus-dining-chair', xx, yy, rr + rnd.uniform(-4, 4))
    except Exception as e: print('[B1] lophus', e)
pendant(DX, ym - 0.55, 1.95); pendant(DX, ym + 0.55, 1.95)
try:
    sp, sob = put('recta-w-series-sb-62011-sideboard-buffet-lemari-cabinet-industrial-xionco', HX - 0.33, ya + 1.1, -90)
    sz = R.top_of(sob)
    R.place(c, 'brass_vase_04', (HX - 0.33, ya + 0.6, sz), 0, fit=('z', 0.36)); R.place(c, 'ceramic_vase_04', (HX - 0.33, ya + 1.55, sz), 0, fit=('z', 0.28))
    R.place(c, 'dry_branches_medium_01', (HX - 0.33, ya + 0.6, sz + 0.25), 30, fit=('z', 0.8), pick='_01_c')
except Exception as e: print('[B1] kredensa', e)
try:
    lp, lob = put('lucid', -HX + 0.24, yb - 1.0, 90)
    for k, zz in enumerate((0.42, 0.78, 1.14, 1.5)):
        books(-HX + 0.24, yb - 1.0 + (0.18 if k % 2 else -0.15), zz, 2 + k % 2, rot=90 + k * 5)
    R.place(c, 'brass_vase_03', (-HX + 0.24, yb - 1.25, 1.14), 0, fit=('z', 0.22))
except Exception as e: print('[B1] lucid', e)
wall_lamp(HX, yb - 0.7, 1.75, side=-1)
rug(DX - 0.3, ym, 3.8, 3.6, '#bfb6a2', rot=0, hsv=(0.5, 0.1, 1.2))

# ================================================================ RUANG 4 · KAMAR (y 20.05 – 26): SOMNO + 2 QAZTAC + lampu meja, kisi jati di dinding akhir, SYME, bangku kaki ranjang
ya, yb = PORTALS[2] + PT / 2, L; ym = (ya + yb) / 2
x = -2.6
while x < 2.6 - 0.045:
    B('bilah akhir', x, x + 0.045, L - 0.04, L, 0.0, H - 0.02, M['teak'], bevel=0.003); x += 0.09
B('panel kepala', -1.9, 1.9, L - 0.12, L - 0.04, 0.0, 1.35, M['walnut'], bevel=0.004)         # panel walnut setinggi 1,35 m di balik ranjang
try: put('somno', 0.0, L - 0.12 - 0.86, 0)
except Exception as e: print('[B1] somno', e)
for sx in (-1, 1):
    try:
        qp, qob = put('qaztac', sx * 1.05, L - 0.33, 0)
        R.place(c, skf('table_lamp'), (sx * 1.05, L - 0.33, R.top_of(qob)), 0, fit=('z', 0.5))
        R.point(c, 'cahaya meja', (sx * 1.05, L - 0.33, R.top_of(qob) + 0.32), 28, K27, size=0.05)
    except Exception as e: print('[B1] qaztac', e)
for sx in (-1.62, 1.62):
    R.spot(c, 'cahaya baca', (sx, L - 0.3, 1.9), (sx, L - 0.05, 1.0), 90, K27, size=0.03, ang=70, blend=0.9)
try: put('syme', HX - 0.34, ya + 1.75, -90)
except Exception as e: print('[B1] syme', e)
try: put('tesse-kursi-puff-ottoman', 1.35, L - 2.6, 20)
except Exception as e: print('[B1] tesse', e)
rug(0.0, L - 2.3, 3.6, 2.6, '#c9c0ad', rot=0)
plant('anthurium_botany_01', HX - 0.6, L - 1.0, 1.0, '#a39784', 0.24, 0, pick='_01_b')
B('dinding aksen kamar', HX - 0.03, HX, ya, yb, 0, CLZ0, M['clay'])
wall_lamp(HX, L - 2.2, 1.75, side=-1)

# ---------------------------------------------------------------- realisme bahan (variasi kilap & kerut halus) — dari v12
def realism(m):
    nt = m.node_tree
    if nt is None or m.get('emit'): return
    b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b is None or b.inputs['Transmission Weight'].default_value > 0.5: return
    rough = b.inputs['Roughness']; kain = any(k in m.name.lower() for k in ('sofa', 'bantal', 'kulit', 'kain', 'karpet', 'tirai', 'linen', 'fabric', 'selimut', 'seprai'))
    if not rough.is_linked and rough.default_value > 0.08:
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6.0; nz.inputs['Detail'].default_value = 8
        mr = nt.nodes.new('ShaderNodeMapRange'); r0 = rough.default_value
        mr.inputs['To Min'].default_value = max(0.02, r0 - 0.1); mr.inputs['To Max'].default_value = min(1.0, r0 + 0.1)
        nt.links.new(nz.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], rough)
    if kain:
        b.inputs['Specular IOR Level'].default_value = 0.15
    nin = b.inputs['Normal']; prev = nin.links[0].from_socket if nin.is_linked else None
    nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 3.0 if kain else 240.0; nz2.inputs['Detail'].default_value = 10
    if kain: nz2.inputs['Distortion'].default_value = 2.5
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.3 if kain else 0.07; bp.inputs['Distance'].default_value = 0.01 if kain else 0.0012
    nt.links.new(nz2.outputs['Fac'], bp.inputs['Height'])
    if prev is not None: nt.links.new(prev, bp.inputs['Normal'])
    nt.links.new(bp.outputs['Normal'], nin)
for m in list(bpy.data.materials):
    if m.users:
        try: realism(m)
        except Exception as e: print('[realism]', m.name, e)

# ---------------------------------------------------------------- kamera: dolly lurus pelan, arah pandang hanya bergeser sedikit & monoton, tanpa zoom
CAM_Z = float(arg('camz', 1.45)); LENS = float(arg('lens', 28))
Y0, Y1 = 0.9, 21.3                                                    # berhenti ±2,9 m sebelum kaki ranjang → seluruh kamar terlihat
def ease(u): return u * u * (3 - 2 * u)
def cam_pose(f):
    u = (f % NF) / NF
    y = Y0 + (Y1 - Y0) * u                                            # kecepatan tetap (scroll = jarak)
    x = -0.2 - 0.3 * math.sin(2 * math.pi * u) ** 1 * (1 if u > 0.5 else 0.5)   # jalur: tengah-kiri; menjauhi meja makan (kanan) di ruang 3, kembali ke tengah di kamar
    yaw = math.radians(6.0 - 11.0 * ease(u))                            # +6° (menoleh sedikit ke taman kiri) → −5° (ke kanan di kamar); monoton
    return Vector((x, y, CAM_Z)), yaw
cd = bpy.data.cameras.new('kamera'); cd.lens = LENS; cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'; cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
def cam_at(f):
    p, yaw = cam_pose(f); cam.location = p; cam.rotation_euler = (math.radians(90.5), 0, yaw)
def room_frame(y): return int(round((y - Y0) / (Y1 - Y0) * NF))
ROOMS = [(0, 'Beranda'), (room_frame(PORTALS[0] - 1.4), 'Ruang duduk'), (room_frame(PORTALS[1] - 1.4), 'Ruang makan'), (room_frame(PORTALS[2] - 1.4), 'Kamar')]
json.dump({'n': NF, 'rooms': [[f, n] for f, n in ROOMS]}, open(os.path.join(OUT, 'rooms.json'), 'w'))

R.color_management(sc, float(arg('exposure', 0.5)), float(arg('wb', 6600)))
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
R.cycles(sc, SAMPLES, threshold=float(arg('thr', 0.02)))
sc.cycles.use_light_tree = True
print('[B1] %d frame · ruang %s · objek %d' % (NF, ROOMS, len(c.objects)), flush=True)

if arg('check'):
    st_ = [(cam_pose(k + 1)[0] - cam_pose(k)[0]).length for k in range(NF - 1)]
    print('[cek] langkah/frame min %.3f maks %.3f m · yaw %.1f° → %.1f°' % (min(st_), max(st_), math.degrees(cam_pose(0)[1]), math.degrees(cam_pose(NF - 1)[1]))); sys.exit(0)

if arg('top'):
    cd.type = 'ORTHO'; cd.ortho_scale = L + 4; cam.location = (0, L / 2, 40); cam.rotation_euler = (0, 0, math.radians(-90))
    sc.render.resolution_x, sc.render.resolution_y = 1800, 600; sc.cycles.samples = 16
    for o in [o for o in c.objects if o.name.startswith('plafon')]: o.hide_render = True
    bpy.ops.render.render(write_still=False); R.save(sc, os.path.join(OUT, 'tes-atas'), webp=False); print('[B1] tampak atas'); sys.exit(0)
if arg('frames'):                                                     # render urutan, lewati yang sudah ada (bisa dilanjutkan)
    a, b = [int(v) for v in str(arg('frames')).split('-')]
    for f in range(a, b + 1):
        p = os.path.join(OUT, 'f%03d' % f)
        if os.path.exists(p + '.jpg'): continue
        cam_at(f); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, p, webp=False)
        print('[B1] frame %d/%d %.0f s' % (f, NF, time.time() - t0), flush=True)
else:
    for s_ in str(arg('shots', '0,60,110,160')).split(','):
        cam_at(int(s_)); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'tes-f%03d' % int(s_)), webp=False)
        print('[B1] tes frame %s %.1f s' % (s_, time.time() - t0), flush=True)
