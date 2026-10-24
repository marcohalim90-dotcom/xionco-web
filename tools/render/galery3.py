# ==========================================================================
#  XIONCO — Galeri v3 (galery1 versi 3) = v2 + belokan, bar & lorong diperbaiki (pemilik 21 Okt)
#   • belokan: 24 frame, kamera melintasi titik sudut (patah) sambil menoleh halus — tanpa sisa lorong di awal ruang
#   • lorong: lebar 2,2 m, plafon menyatu, ceruk ujung 3 × 1,4 m siap sofa, tetap 1 lampu sorot
#   • bar: tidak lagi gelap pekat — walnut gelap + arang, rak bercahaya LED di bawah ambalan (bukan kotak putih)
#   • --export = model 3D langsung (GLB warna rata + jalur kamera + lampu) untuk Galeri, tanpa render
#  Arahan v2 (tetap):
#   • kamera mundur jauh; dinding belakang BERLAPIS dengan jarak (bulkhead depan,
#     plafon bertingkat, panel fitur di depan dinding belakang, kolom, sayap dinding)
#   • banyak bayangan tegas: cahaya tajam lewat kerai + lampu sorot bertepi tegas
#   • pindah ruang = BELOKAN PATAH: ruang tersusun melingkar (poligon), di tiap sudut
#     kamera berhenti & berbelok beberapa frame sambil melihat LORONG SEMPIT
#     (1 lampu sorot, ceruk siap sofa), baru masuk ruang berikutnya
#   • lantai tenang, panel kayu maksimal 2 per ruang & tipis
#
#  blender -b --factory-startup -P galery3.py -- [--shots 0,8,20] [--size 960x540]
#          [--samples 32] [--seq] [--range a:b:s] [--skip] [--out folder] [--blend] [--export]
# ==========================================================================
import bpy, sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib as R
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galery3'))
SIZE = [int(v) for v in str(arg('size', '960x540')).lower().split('x')]
SAMPLES = int(arg('samples', 32))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
WARM = R.kelvin(3000); SOFT = R.kelvin(3500); SUN = R.kelvin(4300)

N = 7                          # jumlah ruang (sisi poligon)
S = 7.6                        # lebar ruang = panjang sisi
D = 7.0                        # kedalaman ruang (dari garis sisi ke dinding belakang)
H0 = 3.2                       # tinggi plafon aula (tempat kamera) & bulkhead depan
TH = 2 * math.pi / N           # sudut belok di tiap sudut (searah jarum jam)
CAM_IN = 2.2                   # kamera mundur ke dalam aula dari garis sisi
TW = math.tan(TH / 2)

# ---------------------------------------------------------------- bahan
M = {
    'floor':   R.add_grout(R.tex_mat('lantai mikro semen', 'room-floor-concrete', 3.0, tint='#d6cabb', rough=0.3, coat=0.12, nstr=0.1, hsv=(0.5, 0.2, 1.3), mute=0.82),
                           w=1.2, h=1.2, gap=0.0014, col_hex='#bdb2a3', offset=0.0),
    'parquet': R.tex_mat('parket herringbone', 'ph-herringbone_parquet', 1.6, tint='#cfae8c', rmul=0.8, nstr=0.4, hsv=(0.5, 0.45, 1.6), coat=0.1, mute=0.45),
    'floor_d': R.tex_mat('lantai gelap', 'room-floor-concrete', 3.0, tint='#5a524b', rough=0.28, coat=0.15, nstr=0.1, mute=0.8),
    'beige':   R.tex_mat('plester krem', 'room-wall-limewash', 2.6, tint='#ddcfbd', rmul=1.1, nstr=0.3),
    'cream':   R.tex_mat('plester krem muda', 'room-wall-limewash', 2.6, tint='#e8dfd2', rmul=1.1, nstr=0.3),
    'mauve':   R.tex_mat('plester mauve', 'room-wall-limewash', 2.6, tint='#8c6a5f', rmul=1.1, nstr=0.3),
    'terra':   R.tex_mat('plester terakota', 'room-wall-plaster', 2.6, tint='#a8705a', rmul=1.05, nstr=0.35, hsv=(0.5, 0.3, 1.25)),
    'dark':    R.tex_mat('plester gelap', 'room-wall-limewash', 2.6, tint='#3a3430', rmul=1.1, nstr=0.25),
    'char':    R.tex_mat('dinding arang', 'room-wall-limewash', 2.6, tint='#26221f', rmul=1.0, nstr=0.2),
    'white':   R.tex_mat('plafon putih', 'room-wall-limewash', 3.0, tint='#efe9e0', rough=0.9, nstr=0.15),
    'cblack':  R.flat_mat('plafon hitam', '#161412', 0.85),
    'walnut':  R.tex_mat('walnut', 'ph-smoked_walnut_veneer', 1.3, tint='#7a5238', rmul=0.8, nstr=0.4, rot=90, coat=0.1),
    'marble':  R.tex_mat('marmer dinding', 'stone-calacatta', 2.2, tint='#e8d9c4', rough=0.2, coat=0.3, spec=0.6),
    'band':    R.tex_mat('pita plester', 'room-wall-limewash', 2.6, tint='#a9998a', rmul=1.1, nstr=0.3),
    'blind':   R.flat_mat('kerai', '#e2d8ca', 0.7),
    'black':   R.flat_mat('baja hitam', '#1b1a19', 0.4, 0.85),
    'glow':    R.emit_mat('cahaya belakang kerai', R.kelvin(5200), 1.4),
    'glow_w':  R.emit_mat('cahaya hangat', R.kelvin(3200), 2.6),
    'led':     R.emit_mat('led lis', R.kelvin(2900), 16.0),
    'dl':      R.emit_mat('downlight', R.kelvin(3000), 40.0),
    'rim':     R.flat_mat('bingkai downlight', '#d8d2c8', 0.4),
}

def coll(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c

# ---------------------------------------------------------------- perangkat bangun (koordinat lokal ruang)
#  x 0…S sepanjang sisi (kanan di layar), y 0…D ke belakang (menjauh dari kamera), z ke atas
def mk(c):
    B = lambda *a, **k: R.box(c, *a, **k)
    def downlight(x, y, z, aim=None, energy=140, ang=58, blend=.35, size=0.012):
        B('cincin dl', x - 0.055, x + 0.055, y - 0.055, y + 0.055, z - 0.006, z, M['rim'])
        B('cakram dl', x - 0.035, x + 0.035, y - 0.035, y + 0.035, z - 0.008, z - 0.006, M['dl'])
        R.spot(c, 'sorot', (x, y, z - 0.03), aim or (x, y, 0), energy, WARM, size=size, ang=ang, blend=blend)
    def wallwash(x, y_wall, z, energy=180):
        downlight(x, y_wall - 0.4, z, (x, y_wall, 0.9), energy, ang=60, blend=.2)
    return B, downlight, wallwash

def shell(c, H, floor, wall_l, wall_r, ceil=None, bulk=True):
    """Lantai, plafon, sayap dinding kiri/kanan (tepi depan y=0,9), bulkhead depan (lapis 1)."""
    B = lambda *a, **k: R.box(c, *a, **k)
    B('lantai', 0, S, 0, D + 0.3, -0.1, 0, floor)
    B('plafon', 0, S, 0, D + 0.3, H, H + 0.15, ceil or M['white'])
    B('sayap kiri', 0, 0.3, 0.9, D + 0.3, 0, H, wall_l)
    B('sayap kanan', S - 0.3, S, 0.9, D + 0.3, 0, H, wall_r)
    if bulk:
        B('bulkhead depan', 0, S, 0, 0.9, H0 - 0.3 if H > H0 else H - 0.3, H, M['white'])

def window_blinds(c, x0, x1, H, sill=0.0, head=None, sun_from=(-2.2, 5.0), energy=16000, wall=None, walls=True):
    """Bukaan di dinding belakang (y=D) dengan kerai horizontal + cahaya tajam dari belakang → bayangan garis.
    walls=False → dinding kiri/kanan bukaan dibangun sendiri oleh ruang."""
    B = lambda *a, **k: R.box(c, *a, **k)
    head = head or H - 0.25; wall = wall or M['beige']
    if walls:
        B('dinding blk kiri', 0.3, x0, D, D + 0.3, 0, H, wall)
        B('dinding blk kanan', x1, S - 0.3, D, D + 0.3, 0, H, wall)
    B('dinding blk atas', x0, x1, D, D + 0.3, head, H, wall)
    if sill > 0: B('dinding blk bawah', x0, x1, D, D + 0.3, 0, sill, M['beige'])
    z = sill + 0.05
    while z < head - 0.04:
        ob = R.box(c, 'bilah kerai', x0 + 0.04, x1 - 0.04, -0.03, 0.03, -0.003, 0.003, M['blind'])
        ob.location = (0, D + 0.12, z); ob.rotation_euler.x = math.radians(32)
        z += 0.09
    B('kotak cahaya', x0 - 0.5, x1 + 0.5, D + 2.6, D + 2.65, -0.2, H + 0.5, M['glow'])
    xm = (x0 + x1) / 2
    R.spot(c, 'cahaya tajam', (xm + sun_from[0], D + sun_from[1], 2.9), (xm + sun_from[0] * 0.4, D - 3.6, 0), energy, SUN, size=0.02, ang=48, blend=.1)

def layer_ceiling(c, x0, x1, y0, y1, H, up=0.35):
    """Plafon bertingkat: bukaan naik 0,35 m dengan lis LED tersembunyi."""
    B = lambda *a, **k: R.box(c, *a, **k)
    B('cerukan plafon', x0, x1, y0, y1, H + 0.15, H + 0.15 + up, M['white'])
    B('led tingkat', x0 + 0.05, x1 - 0.05, y0 + 0.04, y0 + 0.07, H + 0.02, H + 0.035, M['led'])

# ==========================================================================
#  7 ruang (urutan galery1)
# ==========================================================================
def room_lobi(c):
    H = 3.6; B, dl, ww = mk(c)
    shell(c, H, M['floor'], M['beige'], M['beige'])
    B('dinding belakang', 0.3, S - 0.3, D, D + 0.3, 0, H, M['mauve'])                 # lapis 3
    B('panel fitur', 2.2, 5.4, D - 1.3, D - 1.1, 0, H - 0.6, M['cream'])                # lapis 2: berdiri bebas
    B('led panel', 2.25, 5.35, D - 1.1, D - 1.08, H - 0.62, H - 0.6, M['led'])
    B('pilar mauve', 1.0, 1.75, 3.0, 3.75, 0, H, M['mauve'])
    B('soffit', 1.0, 1.75, 3.75, D, H - 0.5, H, M['mauve'])
    B('panel walnut tipis', 6.0, 6.9, D - 0.05, D, 0.0, H - 0.4, M['walnut'])          # kayu 1
    layer_ceiling(c, 2.0, S - 1.0, 1.4, D - 0.3, H)
    for x in (2.8, 4.8): ww(x, D - 1.3, H, 200)
    ww(1.38, 3.0, H, 150); ww(6.45, D, H, 150)
    for x in (2.6, 5.4): dl(x, 2.2, H, energy=90)
    R.area(c, 'isi', (S / 2, 2.5, H - 0.1), (0, 0, 0), 4.0, 3.0, 70, SOFT)
    return 'Lobi'

def room_keluarga(c):
    H = 3.4; B, dl, ww = mk(c)
    shell(c, H, M['parquet'], M['cream'], M['cream'])
    window_blinds(c, 5.3, 7.0, H, wall=M['cream'])                                      # kanan: kerai + cahaya tajam
    B('panel fitur', 1.0, 4.4, D - 0.16, D, 0, 2.7, M['cream'])                          # lapis menonjol
    B('led panel', 1.02, 4.38, D - 0.17, D - 0.16, 2.685, 2.695, M['led'])
    B('kolom walnut', 4.75, 5.15, D - 0.36, D, 0, H, M['walnut'])                        # kayu 1 (tipis 0,4 lebar)
    B('dinding balik kiri', 0.3, 1.2, 2.2, 2.4, 0, H, M['cream'])                        # sayap pendek → lapisan depan
    layer_ceiling(c, 1.0, S - 0.8, 1.6, D - 0.6, H)
    B('rel linear', 1.6, 6.0, 3.6, 3.63, H - 0.03, H, M['black'])
    for x in (2.4, 3.4): R.spot(c, 'spot rel', (x, 3.6, H - 0.06), (x, D, 1.1), 110, WARM, size=0.01, ang=36, blend=.3)
    R.area(c, 'isi', (S / 2, 2.0, H - 0.1), (0, 0, 0), 4.0, 3.0, 60, SOFT)
    return 'Ruang keluarga'

def room_biliar(c):
    H = 3.6; B, dl, ww = mk(c)
    shell(c, H, M['floor'], M['beige'], M['beige'], bulk=True)
    window_blinds(c, 0.9, 2.6, H, sun_from=(2.2, 5.0), walls=False)
    B('dinding blk kiri', 0.3, 0.9, D, D + 0.3, 0, H, M['beige'])
    B('dinding blk tengah', 2.6, 3.4, D, D + 0.3, 0, H, M['beige'])
    B('dinding blk kanan', 6.6, S - 0.3, D, D + 0.3, 0, H, M['beige'])
    B('atas ceruk', 3.4, 6.6, D, D + 1.1, 3.0, H, M['beige'])                          # dinding belakang mundur 0,9 m (lapis 3)
    B('ceruk dinding', 3.4, 6.6, D + 0.9, D + 1.1, 0, 3.0, M['band'])
    B('ceruk sisi kiri', 3.2, 3.4, D, D + 1.1, 0, 3.0, M['beige']); B('ceruk sisi kanan', 6.6, 6.8, D, D + 1.1, 0, 3.0, M['beige'])
    B('lantai ceruk', 3.4, 6.6, D + 0.3, D + 0.9, -0.1, 0, M['floor'])
    y = 1.0
    while y < D:
        B('balok', 0.3, S - 0.3, y - 0.05, y + 0.05, H - 0.16, H, M['walnut']); y += 0.6   # struktur plafon (bukan display)
    for x in (4.2, 5.8): ww(x, D + 0.9, 3.0, 170)
    R.area(c, 'isi', (S / 2, 2.0, H - 0.2), (0, 0, 0), 4.0, 3.0, 60, SOFT)
    return 'Ruang biliar'

def room_kamar(c):
    H = 3.2; B, dl, ww = mk(c)
    shell(c, H, M['floor'], M['beige'], M['beige'])
    B('dinding belakang', 0.3, S - 0.3, D, D + 0.3, 0, H, M['beige'])
    B('panel kepala', 1.6, 5.4, D - 0.12, D, 0, 1.25, M['band'])                       # lapis kepala ranjang
    B('panel kepala atas', 1.4, 5.6, D - 0.18, D, 2.55, 2.62, M['walnut'])            # kayu 1 tipis
    B('dinding lemari', 5.9, S - 0.3, D - 1.6, D - 1.4, 0, H, M['beige'])            # lapis depan kanan
    B('led lemari', 6.0, S - 0.4, D - 1.4, D - 1.38, H - 0.4, H - 0.38, M['led'])
    for x in (2.3, 4.7): ww(x, D - 0.12, H, 170)
    dl(6.6, D - 0.6, H, energy=120, ang=50)
    R.area(c, 'isi', (S / 2, 2.0, H - 0.1), (0, 0, 0), 4.0, 3.0, 55, SOFT)
    return 'Kamar tidur'

def room_marmer(c):
    H = 3.4; B, dl, ww = mk(c)
    shell(c, H, M['floor'], M['cream'], M['cream'])
    B('dinding belakang', 0.3, S - 0.3, D, D + 0.3, 0, H, M['cream'])
    B('dinding marmer', 2.0, 5.6, D - 0.9, D - 0.75, 0, H - 0.5, M['marble'])          # berdiri bebas di depan (lapis 2)
    B('cahaya belakang marmer', 2.1, 5.5, D - 0.02, D, 0.2, H - 0.6, M['glow_w'])      # dinding belakang bersinar di celah
    R.cyl(c, 'cincin led', S / 2, 2.6, H - 0.02, H, 0.62, M['led'])
    R.cyl(c, 'cekungan', S / 2, 2.6, H - 0.025, H - 0.015, 0.58, M['white'])
    R.spot(c, 'sorot bundar', (S / 2, 2.6, H - 0.05), (S / 2, 2.6, 0), 150, WARM, size=0.01, ang=70, blend=.4)
    for x in (2.8, 4.8): ww(x, D - 0.9, H, 190)
    R.area(c, 'isi', (S / 2, 2.0, H - 0.1), (0, 0, 0), 4.0, 3.0, 60, SOFT)
    return 'Ruang marmer'

def room_bar(c):
    H = 3.4; B, dl, ww = mk(c)
    wal_d = R.tex_mat('walnut gelap', 'ph-smoked_walnut_veneer', 1.3, tint='#5a3c2a', rmul=0.8, nstr=0.4, rot=90, coat=0.12)
    shell(c, H, M['floor_d'], wal_d, wal_d, ceil=R.flat_mat('plafon cokelat gelap', '#2a221d', 0.8))
    B('dinding belakang', 0.3, S - 0.3, D, D + 0.3, 0, H, M['char'])
    B('panel walnut bergaris', 0.9, 1.7, D - 0.04, D, 0, H, M['walnut'])                # kayu 1 (tipis)
    R.flutes(c, 'garis', 0.91, 1.69, D - 0.04, 0.0, H, M['walnut'], pitch=0.05, depth=0.01)
    stone = R.tex_mat('batu rak', 'stone-travertine', 1.0, tint='#b9a68e', rough=0.5)
    for (x0, x1) in ((2.3, 4.5), (5.0, 6.7)):                                          # rak: ceruk batu + LED di bawah ambalan
        B('ceruk rak', x0, x1, D - 0.02, D, 0.85, 2.85, stone)
        B('sisi', x0 - 0.03, x0, D - 0.32, D, 0.85, 2.85, M['black']); B('sisi', x1, x1 + 0.03, D - 0.32, D, 0.85, 2.85, M['black'])
        for z in (0.85, 1.5, 2.15, 2.82):
            B('ambalan', x0, x1, D - 0.32, D - 0.02, z, z + 0.025, wal_d)
            if z < 2.8: B('led ambalan', x0 + 0.02, x1 - 0.02, D - 0.3, D - 0.27, z + 0.62, z + 0.632, M['led'])
    B('dinding belakang tengah', 4.5, 5.0, D - 0.12, D, 0, H, wal_d)
    for x in (1.3, 3.4, 5.85): dl(x, D - 1.4, H, energy=120, ang=44)
    for x in (2.5, 5.0): dl(x, 2.2, H, energy=90, ang=50)
    R.area(c, 'isi', (S / 2, 2.0, H - 0.1), (0, 0, 0), 4.0, 3.0, 70, WARM)
    return 'Bar'

def room_lounge(c):
    H = 3.4; B, dl, ww = mk(c)
    shell(c, H, M['floor'], M['dark'], M['dark'], ceil=M['cblack'])
    B('dinding belakang', 0.3, S - 0.3, D, D + 0.3, 0, H, M['dark'])
    B('blok terakota', 1.6, 5.8, D - 1.6, D - 0.9, 0, H, M['terra'])                    # lapis 2 tebal
    for x in (2.4, 3.7, 5.0): ww(x, D - 1.6, H, 240)
    R.spot(c, 'sorot belakang', (6.6, D - 0.4, H - 0.05), (6.6, D, 0.8), 120, WARM, size=0.01, ang=50)
    R.area(c, 'isi', (S / 2, 2.0, H - 0.1), (0, 0, 0), 4.0, 3.0, 25, WARM)
    return 'Lounge'

ROOMS = [room_lobi, room_keluarga, room_biliar, room_kamar, room_marmer, room_bar, room_lounge]

# ---------------------------------------------------------------- lorong sempit di tiap sudut (koordinat lokal sudut)
#  asal = titik sudut luar poligon, +y = garis bagi ke luar, x kanan
def corridor(c, k):
    B = lambda *a, **k2: R.box(c, *a, **k2)
    Hc = 3.0; w = 1.1; s0 = (w + 0.25) / TW; s1 = s0 + 3.2; nd = 1.4; nw = 1.5
    far = s1 + nd + 1.0
    # lantai & plafon baji: mengisi celah antar ruang sampai mulut lorong; plafon setinggi aula (menyatu)
    me = bpy.data.meshes.new('lantai baji'); me.from_pydata([(0, 0, 0), (-far * TW, far, 0), (far * TW, far, 0)], [], [(0, 2, 1)])
    ob = bpy.data.objects.new('lantai baji', me); c.objects.link(ob); me.materials.append(M['floor'])
    me = bpy.data.meshes.new('plafon baji'); me.from_pydata([(0, 0, H0), (-far * TW, far, H0), (far * TW, far, H0)], [], [(0, 1, 2)])
    ob = bpy.data.objects.new('plafon baji', me); c.objects.link(ob); me.materials.append(M['white'])
    mat = [M['beige'], M['cream'], M['beige'], M['beige'], M['cream'], M['beige'], M['beige']][k]
    # dinding mulut lorong (menutup sisa baji di kiri/kanan, setinggi aula) + ambang atas
    B('mulut kiri', -s0 * TW - 0.05, -w, s0 - 0.2, s0, 0, H0, mat)
    B('mulut kanan', w, s0 * TW + 0.05, s0 - 0.2, s0, 0, H0, mat)
    B('ambang mulut', -w, w, s0 - 0.2, s0, Hc, H0, mat)
    B('dinding lorong kiri', -w - 0.2, -w, s0, s1, 0, Hc, mat)
    B('dinding lorong kanan', w, w + 0.2, s0, s1, 0, Hc, mat)
    # ceruk ujung (siap sofa) sedikit lebih lebar
    B('ujung kiri', -nw, -w, s1 - 0.2, s1, 0, Hc, mat); B('ujung kanan', w, nw, s1 - 0.2, s1, 0, Hc, mat)
    B('ceruk sisi kiri', -nw - 0.2, -nw, s1 - 0.2, s1 + nd, 0, Hc, mat); B('ceruk sisi kanan', nw, nw + 0.2, s1 - 0.2, s1 + nd, 0, Hc, mat)
    B('ceruk belakang', -nw - 0.2, nw + 0.2, s1 + nd, s1 + nd + 0.2, 0, Hc, M['band'])
    B('plafon lorong', -nw - 0.2, nw + 0.2, s0 - 0.2, s1 + nd + 0.2, Hc, Hc + 0.12, M['white'])
    B('lantai lorong', -nw - 0.2, nw + 0.2, s0 - 0.2, s1 + nd + 0.2, -0.1, 0.0005, M['floor'])
    # satu lampu sorot: ke dinding ujung ceruk (tempat sofa nanti)
    yl = s1 + nd - 0.45
    R.spot(c, 'sorot lorong', (0, yl, Hc - 0.05), (0, s1 + nd, 0.8), 190, WARM, size=0.01, ang=62, blend=.3)
    B('cincin', -0.055, 0.055, yl - 0.055, yl + 0.055, Hc - 0.006, Hc, M['rim'])
    B('cakram', -0.035, 0.035, yl - 0.035, yl + 0.035, Hc - 0.008, Hc - 0.006, M['dl'])

# ---------------------------------------------------------------- tata letak cincin (searah jarum jam)
def rotz(a): return Matrix.Rotation(a, 4, 'Z')
V = [Vector((0, 0, 0))]
for i in range(N):
    t = rotz(-TH * i) @ Vector((1, 0, 0, 0))
    V.append(V[-1] + Vector((t.x, t.y, 0)) * S)
labels = []
for i, fn in enumerate(ROOMS):
    c = coll('ruang %d' % i); labels.append(fn(c))
    inst = bpy.data.objects.new('ruang %d' % i, None); inst.instance_type = 'COLLECTION'; inst.instance_collection = c
    inst.matrix_world = Matrix.Translation(V[i]) @ rotz(-TH * i); sc.collection.objects.link(inst)
    R._layer_coll(c).exclude = True
    cc = coll('lorong %d' % i); corridor(cc, i)
    inst = bpy.data.objects.new('lorong %d' % i, None); inst.instance_type = 'COLLECTION'; inst.instance_collection = cc
    # sudut di akhir sisi i: garis bagi luar = arah rata-rata normal ruang i & i+1
    ang = -TH * i - TH / 2                     # +y lokal sudut = normal diputar setengah belokan
    inst.matrix_world = Matrix.Translation(V[i + 1]) @ rotz(ang); sc.collection.objects.link(inst)
    R._layer_coll(cc).exclude = True
# aula tengah (lantai & plafon poligon dalam) + cahaya isi lembut
hall = coll('aula')
me = bpy.data.meshes.new('lantai aula'); me.from_pydata([tuple(v) for v in V[:N]], [], [tuple(range(N))[::-1]])
ob = bpy.data.objects.new('lantai aula', me); hall.objects.link(ob); me.materials.append(M['floor'])
me = bpy.data.meshes.new('plafon aula'); me.from_pydata([(v.x, v.y, H0) for v in V[:N]], [], [tuple(range(N))])
ob = bpy.data.objects.new('plafon aula', me); hall.objects.link(ob); me.materials.append(M['white'])
ctr = sum(V[:N], Vector((0, 0, 0))) / N
R.area(hall, 'isi aula', (ctr.x, ctr.y, H0 - 0.1), (0, 0, 0), 3.0, 3.0, 40, SOFT)

sc.world = bpy.data.worlds.new('gelap')
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass

# ---------------------------------------------------------------- jalur kamera: lurus di tiap sisi, belok patah di sudut
FS, FT = int(arg('fs', 18)), int(arg('ft', 24))     # frame per sisi lurus / per belokan
NF = N * (FS + FT)
inr = S / (2 * TW)                                   # jari-jari dalam poligon
k_in = (inr - CAM_IN) / inr                          # poligon kamera = poligon diperkecil ke pusat
VC = [ctr + (v - ctr) * k_in for v in V]
def smooth(t): return t * t * (3 - 2 * t)
def cam_pose(f):
    f = f % NF; i = int(f // (FS + FT)); u = f - i * (FS + FT)
    yaw0 = -TH * i                                   # arah pandang ruang i = +y lokal diputar
    A0, A1 = 0.16, 0.84                              # bagian lurus (tanpa sisa lorong di awal ruang)
    if u < FS:                                       # menyamping lurus sepanjang sisi i
        t = u / FS; p = VC[i].lerp(VC[i + 1], A0 + (A1 - A0) * t); yaw = yaw0
    else:                                            # belokan patah: ke titik sudut lalu keluar, menoleh halus selama FT frame
        t = (u - FS) / FT
        a = VC[i].lerp(VC[i + 1], A1); v = VC[i + 1]; b = VC[(i + 1) % N].lerp(VC[(i + 1) % N + 1], A0)
        p = a.lerp(v, smooth(t * 2)) if t < 0.5 else v.lerp(b, smooth(t * 2 - 1))
        yaw = yaw0 - TH * smooth(t)
    return p, yaw

cd = bpy.data.cameras.new('kamera'); cd.lens = float(arg('lens', 24)); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.shift_y = float(arg('shift', 0.0)); cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
CAM_Z = float(arg('camz', 1.4))
def cam_at(f):
    p, yaw = cam_pose(f)
    cam.location = (p.x, p.y, CAM_Z); cam.rotation_euler = (math.radians(90), 0, yaw)

R.color_management(sc, float(arg('exposure', 1.0)), float(arg('wb', 4300)))
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
if arg('preview'): R.eevee(sc)
else: R.cycles(sc, SAMPLES)
if arg('blend'): bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'galery3.blend'))
# label ruang per frame (untuk sets.json situs)
import json
json.dump({'n': NF, 'rooms': [[i * (FS + FT), labels[i]] for i in range(N)]}, open(os.path.join(OUT, 'rooms.json'), 'w'))
print('[galery3] %d frame, %d ruang' % (NF, N))

if arg('export'):
    # ===== 3D langsung untuk Galeri: GLB warna rata + jalur kamera + daftar lampu (tanpa render)
    import json as _j
    dst = arg('export') if isinstance(arg('export'), str) else os.path.join(R.ROOT, 'assets', 'galeri', 'g3')
    os.makedirs(dst, exist_ok=True)
    yup = lambda v: [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
    lights = []
    for inst in [o for o in sc.objects if o.instance_type == 'COLLECTION' and o.instance_collection]:
        for ob in inst.instance_collection.all_objects:
            if ob.type != 'LIGHT': continue
            mw = inst.matrix_world @ ob.matrix_basis                  # matrix_world tidak dihitung untuk koleksi yang dikecualikan
            d = ob.data; dirv = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
            L = {'t': d.type, 'p': yup(mw.translation), 'd': yup(dirv), 'c': [round(x, 3) for x in d.color], 'e': round(d.energy, 1)}
            if d.type == 'SPOT': L['a'] = round(d.spot_size, 3); L['b'] = round(d.spot_blend, 2)
            if d.type == 'AREA': L['s'] = [round(d.size, 2), round(d.size_y, 2)]
            lights.append(L)
    for o in list(sc.objects):
        if o.type == 'LIGHT': o.select_set(False)
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.instance_type == 'COLLECTION' and o.instance_collection: o.select_set(True)
    bpy.context.view_layer.objects.active = None
    srcs = [o.instance_collection for o in sc.objects if o.instance_type == 'COLLECTION' and o.instance_collection]
    bpy.ops.object.duplicates_make_real()
    for cl in set(srcs):                                           # sumber instance (koordinat lokal) jangan ikut diekspor
        for ob in list(cl.objects): bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.collections.remove(cl)
    for o in list(sc.objects):
        if o.type in ('LIGHT', 'CAMERA') or (o.type == 'EMPTY'): bpy.data.objects.remove(o, do_unlink=True)
    for m in bpy.data.materials:                                   # bahan → Principled rata (glTF tidak kenal proyeksi kotak)
        nt = m.node_tree
        if nt is None: continue
        N_ = nt.nodes; N_.clear()
        out = N_.new('ShaderNodeOutputMaterial'); b = N_.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs['Surface'])
        if m.get('emit'):
            b.inputs['Base Color'].default_value = (0, 0, 0, 1)
            b.inputs['Emission Color'].default_value = tuple(m['emit']) + (1.0,); b.inputs['Emission Strength'].default_value = float(m.get('estr', 1)) * 0.25
        else:
            b.inputs['Base Color'].default_value = R.srgb(m.get('flat', '#bfb5a8'))
            b.inputs['Roughness'].default_value = float(m.get('rough', 0.6)); b.inputs['Metallic'].default_value = float(m.get('metal', 0.0))
    glb = os.path.join(dst, 'scene.glb')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False, export_lights=False, export_cameras=False,
                              export_apply=True, export_yup=True)
    frames = []
    for k in range(NF):
        p, yaw = cam_pose(k)
        f = Vector((-math.sin(yaw), math.cos(yaw), 0))
        frames.append(yup((p.x, p.y, CAM_Z)) + [round(f.x, 4), round(-f.y, 4)])
    hfov = 2 * math.degrees(math.atan(18 / float(arg('lens', 24))))
    _j.dump({'n': NF, 'hfov': round(hfov, 2), 'frames': frames}, open(os.path.join(dst, 'path.json'), 'w'))
    _j.dump(lights, open(os.path.join(dst, 'lights.json'), 'w'))
    print('[galery3] ekspor: %s (%.1f MB), %d frame, %d lampu' % (glb, os.path.getsize(glb) / 1e6, NF, len(lights)))
elif arg('seq'):
    sd = os.path.join(OUT, 'seq'); os.makedirs(sd, exist_ok=True)
    rng = [int(v) for v in str(arg('range', '0:%d:1' % NF)).split(':')]
    for k in range(*rng):
        if arg('skip') and os.path.exists(os.path.join(sd, '%03d.jpg' % k)): continue
        cam_at(k)
        t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(sd, '%03d' % k), webp=False)
        print('[galery3] frame %d/%d %.1f s' % (k + 1, NF, time.time() - t0), flush=True)
else:
    for s in str(arg('shots', '8,16,21,34,47,60')).split(','):
        cam_at(float(s))
        t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s))), webp=False)
        print('[galery3] frame %s %.1f s' % (s, time.time() - t0), flush=True)
