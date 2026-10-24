# ==========================================================================
#  XIONCO — Galeri v10: sketsa kamera kedua pemilik (21 Okt), ukuran tetap v6 (v9 disimpan apa adanya).
#   Beda dari v9: cam 1 mulai dekat & MENYERONG ±20° ke sisi kiri-bawah lobi, lalu mundur sambil meluruskan (cam 2);
#   cam 5 menghadap lurus ke muka dinding atas (bentuk T) = dinding fitur penuh (Ruang marmer), bukan ceruk;
#   sisi kiri: Kamar · Bar · Lounge; ujung bawah: ceruk siap sofa.
#  ----- catatan v9:
#   lobi besar: mulai dekat & fokus sisi kiri → kamera mundur → geser melewati 2 ruang (keluarga, biliar) →
#   memutari ujung (belokan B 45°, 3 sudut sempit) → geser melewati 3 ruang (kamar, marmer, bar) →
#   memutari ujung bawah lewat lounge → mendekat lagi ke sisi kiri lobi (putaran mulus, tanpa layar gelap).
#   Ruang di satu sisi sejajar (seperti kamera 2–3 & 6–7 di sketsa); semua belokan di ujung = 45°.
#  (dasar v6) — tata letak B (kesepakatan pemilik 21 Okt):
#  "30–35 derajat" SELALU berarti kamera memutari dari LUAR & melihat ke dalam; ruang berikut miring MENJAUH.
#  Semua sambungan berderajat (kebanyakan ±32°, beberapa 45°), jumlah 360° → putaran mulus.
#  Kamera berjarak tetap dari ruang (tidak pernah mendekat/zoom), memutari sudut luar dengan lengkung pendek.
#  ----- catatan v3 (tetap berlaku):
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
#  blender -b --factory-startup -P galery10.py -- [--shots 0,8,20] [--size 960x540]
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

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galery10'))
SIZE = [int(v) for v in str(arg('size', '960x540')).lower().split('x')]
SAMPLES = int(arg('samples', 32))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
WARM = R.kelvin(3000); SOFT = R.kelvin(3500); SUN = R.kelvin(4300)

N = 9                          # jumlah sisi: 7 ruang + 2 jalan sempit → belok 40° tiap sudut
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

def room_lorong(c):
    """Jalan sempit (bukan ruang): dangkal & rendah, ceruk sofa di dinding belakang, satu lampu sorot saja."""
    Hc = 2.9; Dl = 2.8; B, dl, ww = mk(c)
    mat = R.tex_mat('plester hangat', 'room-wall-limewash', 2.6, tint='#b8a690', rmul=1.1, nstr=0.3)
    B('lantai', 0, S, 0, Dl + 0.8, -0.1, 0, M['floor'])
    B('plafon', 0, S, 0, Dl + 0.8, Hc, Hc + 0.15, M['white'])
    B('bulkhead', 0, S, 0, 0.5, 2.5, Hc, M['white'])
    B('sayap kiri', 0, 0.3, 0.5, Dl + 0.8, 0, Hc, mat); B('sayap kanan', S - 0.3, S, 0.5, Dl + 0.8, 0, Hc, mat)
    B('dinding belakang kiri', 0.3, 2.2, Dl, Dl + 0.2, 0, Hc, mat); B('dinding belakang kanan', 5.4, S - 0.3, Dl, Dl + 0.2, 0, Hc, mat)
    B('atas ceruk', 2.2, 5.4, Dl, Dl + 0.8, 2.4, Hc, mat)
    B('ceruk belakang', 2.2, 5.4, Dl + 0.6, Dl + 0.8, 0, 2.4, M['band'])
    B('ceruk sisi kiri', 2.0, 2.2, Dl, Dl + 0.8, 0, 2.4, mat); B('ceruk sisi kanan', 5.4, 5.6, Dl, Dl + 0.8, 0, 2.4, mat)
    R.spot(c, 'sorot jalan', (3.8, Dl + 0.25, 2.38), (3.8, Dl + 0.8, 0.6), 320, WARM, size=0.01, ang=88, blend=.35)
    B('cincin', 3.745, 3.855, Dl + 0.195, Dl + 0.305, 2.374, 2.38, M['rim'])
    B('cakram', 3.765, 3.835, Dl + 0.215, Dl + 0.285, 2.372, 2.374, M['dl'])
    return 'Jalan'

def room_sudut(c):
    """Segmen pendek di ujung putaran (lebar 4 m): ceruk dangkal hangat + satu lampu sorot."""
    Hc = 3.0; Dl = 2.2; B, dl, ww = mk(c)
    mat = R.tex_mat('plester hangat', 'room-wall-limewash', 2.6, tint='#b8a690', rmul=1.1, nstr=0.3)
    B('lantai', 0, S, 0, Dl + 0.6, -0.1, 0, M['floor']); B('plafon', 0, S, 0, Dl + 0.6, Hc, Hc + 0.15, M['white'])
    B('bulkhead', 0, S, 0, 0.4, 2.6, Hc, M['white'])
    B('sayap kiri', 0, 0.3, 0.4, Dl + 0.6, 0, Hc, mat); B('sayap kanan', S - 0.3, S, 0.4, Dl + 0.6, 0, Hc, mat)
    B('dinding belakang', 0.3, S - 0.3, Dl + 0.4, Dl + 0.6, 0, Hc, M['band'])
    R.spot(c, 'sorot sudut', (S / 2, Dl - 0.1, Hc - 0.05), (S / 2, Dl + 0.4, 0.7), 260, WARM, size=0.01, ang=80, blend=.3)
    B('cincin', S / 2 - 0.055, S / 2 + 0.055, Dl - 0.155, Dl - 0.045, Hc - 0.006, Hc, M['rim'])
    B('cakram', S / 2 - 0.035, S / 2 + 0.035, Dl - 0.135, Dl - 0.065, Hc - 0.008, Hc - 0.006, M['dl'])
    return 'Sudut'

ROOMS = [room_lobi, room_lorong, room_keluarga, room_biliar, room_kamar, room_lorong, room_marmer, room_bar, room_lounge]

# ---------------------------------------------------------------- tata letak B (KESEPAKATAN PEMILIK 21 Okt)
#  "30–35 derajat" = B: kamera MEMUTARI DARI LUAR & melihat ke dalam, ruang berikut miring MENJAUH.
#  Poligon cembung berlawanan jarum jam; ruang di sisi dalam (kiri arah jalan), kamera di luar.
#  Sudut belok per sambungan: kebanyakan 32°, beberapa 45°; jumlah = 360° (putaran kembali mulus).
#  Antar ruang ada celah baji (blok dinding pejal) supaya dinding samping yang menyempit ke dalam tidak bertabrakan.
#  (nama, pembangun, lebar, sudut belok SETELAH segmen ini). Sisi panjang lurus (0°), ujung 4 × 45° = 180°.
#  kedua sisi panjang sama (26,2 m) & ujung atas = ujung bawah → bentuk simetris, putaran ujung sama panjang
SEGS = [('lobi', room_lobi, 11.0, 0), ('keluarga', room_keluarga, 7.6, 0), ('biliar', room_biliar, 7.6, 45),
        ('sudut', room_sudut, 4.0, 45), ('marmer', room_marmer, 7.6, 45), ('sudut', room_sudut, 4.0, 45),
        ('kamar', room_kamar, 8.7, 0), ('bar', room_bar, 8.7, 0), ('lounge', room_lounge, 8.8, 45),
        ('sudut', room_sudut, 4.0, 45), ('atas', room_sudut, 7.6, 45), ('sudut', room_sudut, 4.0, 45)]
N = len(SEGS)
ANG = [math.radians(a) for _, _, _, a in SEGS]
WRS = [w for _, _, w, _ in SEGS]
WR = 7.6
DEP = [2.8 if k in ('sudut', 'atas') else 6.3 for k, _, _, _ in SEGS]         # kedalaman sampai belakang dinding samping
ROOM_D = 6.0                                                         # D untuk pembangun ruang
# celah di sudut: cukup sebesar kedalaman ruang yang LEBIH DANGKAL (dinding samping bertemu di belakang ruang dangkal → tidak tumpang tindih)
GAP = [2 * math.tan(ANG[i] / 2) * (min(DEP[i], DEP[(i + 1) % N]) + 0.45) for i in range(N)]
LEN = [WRS[i] + GAP[i - 1] / 2 + GAP[i] / 2 for i in range(N)]
PHI = [0.0]
for i in range(N - 1): PHI.append(PHI[-1] + ANG[i])
U = [Vector((math.cos(p), math.sin(p), 0)) for p in PHI]
NRM = [Vector((-math.sin(p), math.cos(p), 0)) for p in PHI]          # ke dalam (kiri arah jalan)
# tutup poligon: tambahkan panjang ekstra pada dua sisi (dipilih yang paling kecil & positif)
Rv = sum((U[i] * LEN[i] for i in range(N)), Vector((0, 0, 0)))
best = None
for j in range(N):
    for k in range(j + 1, N):
        det = U[j].x * U[k].y - U[j].y * U[k].x
        if abs(det) < 1e-6: continue
        ej = (-Rv.x * U[k].y + Rv.y * U[k].x) / det; ek = (-U[j].x * Rv.y + U[j].y * Rv.x) / det
        if ej >= -1e-6 and ek >= -1e-6 and (best is None or ej + ek < best[0]): best = (ej + ek, j, k, ej, ek)
EXTRA = [0.0] * N
if best: EXTRA[best[1]] = best[3]; EXTRA[best[2]] = best[4]
print('[galery10] sudut', [round(math.degrees(a), 1) for a in ANG], 'ekstra', [round(e, 2) for e in EXTRA])
V = [Vector((0, 0, 0))]
for i in range(N): V.append(V[-1] + U[i] * (LEN[i] + EXTRA[i]))
ORG = [V[i] + U[i] * (GAP[i - 1] / 2) for i in range(N)]            # sudut depan-kiri ruang i
def rotz(a): return Matrix.Rotation(a, 4, 'Z')

def prism(c, name, pts, z0, z1, mat):
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if area < 0: pts = pts[::-1]
    n = len(pts); v = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    f = [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    ob = bpy.data.objects.new(name, me); c.objects.link(ob); me.materials.append(mat); return ob

labels = []
for i, (kind, fn, wseg, _a) in enumerate(SEGS):
    S = wseg; D = ROOM_D                                             # pembangun ruang membaca S & D global
    c = coll('ruang %d' % i); labels.append(fn(c))
    inst = bpy.data.objects.new('ruang %d' % i, None); inst.instance_type = 'COLLECTION'; inst.instance_collection = c
    inst.matrix_world = Matrix.Translation(ORG[i]) @ rotz(PHI[i]); sc.collection.objects.link(inst)
    R._layer_coll(c).exclude = True

# blok sudut pejal + aula cincin di luar poligon (tempat kamera)
dunia = coll('dunia')
BLOK_MAT = [M['terra'], M['mauve'], M['beige'], M['walnut'], M['beige'], M['mauve'], M['terra'], M['beige'], M['walnut'], M['mauve']]
for i in range(N):
    j = (i + 1) % N
    if ANG[i] < 1e-6: continue                                       # ruang sejajar: dinding samping saling menempel
    A0 = ORG[i] + U[i] * WRS[i]; V0 = V[i + 1]; B0 = ORG[j]
    bis = (NRM[i] + NRM[j]).normalized()                            # garis bagi ke dalam
    RS = 1.4 if min(DEP[i], DEP[j]) > 3 else 0.6                       # blok mundur dari garis depan → kedalaman
    A = A0 + NRM[i] * RS; Bp = B0 + NRM[j] * RS; Vv = V0 + bis * (RS / math.cos(ANG[i] / 2))
    dmin = min(DEP[i], DEP[j]); Ab = A0 + NRM[i] * dmin; Bb = B0 + NRM[j] * dmin          # blok sampai kedalaman ruang yang dangkal
    prism(dunia, 'blok sudut', [(A.x, A.y), (Vv.x, Vv.y), (Bp.x, Bp.y), (Bb.x, Bb.y), (Ab.x, Ab.y)], 0, 3.9, BLOK_MAT[i % len(BLOK_MAT)])
    # lantai & plafon ceruk di depan blok (di antara garis depan dan muka blok yang mundur)
    for z, name, mat in ((0.0, 'lantai ceruk sudut', M['floor']), (H0, 'plafon ceruk sudut', M['white'])):
        pts_ = [A0, V0, B0, Bp, Vv, A]
        me = bpy.data.meshes.new(name); me.from_pydata([(q.x, q.y, z) for q in pts_], [], [tuple(range(6))]); me.update()
        if (me.polygons[0].normal.z > 0) != (z == 0): me.polygons[0].flip()
        obj = bpy.data.objects.new(name, me); dunia.objects.link(obj); me.materials.append(mat)
    # pilar ramping di titik sudut depan (seperti kolom putih di galery1) — lewat di latar depan saat berbelok
    pc = V0 + bis * 0.45; pu = U[i].lerp(U[j], 0.5).normalized(); pn = Vector((-pu.y, pu.x, 0))
    pp = [pc + pu * 0.32 + pn * 0.32, pc - pu * 0.32 + pn * 0.32, pc - pu * 0.32 - pn * 0.32, pc + pu * 0.32 - pn * 0.32]
    prism(dunia, 'pilar sudut', [(q.x, q.y) for q in pp], 0, H0, M['cream'])
    for (P0, P1, nn) in ((A, Vv, NRM[i]), (Vv, Bp, NRM[j])):         # satu sorot per muka blok (pola tegas)
        if (P1 - P0).length < 0.8: continue
        m = (P0 + P1) / 2; lp = m - nn * 0.45
        R.spot(dunia, 'sorot blok', (lp.x, lp.y, H0 - 0.04), (m.x, m.y, 0.9), 220, WARM, size=0.012, ang=60, blend=.2)
        R.box(dunia, 'cincin', lp.x - 0.055, lp.x + 0.055, lp.y - 0.055, lp.y + 0.055, H0 - 0.006, H0, M['rim'])
        R.box(dunia, 'cakram', lp.x - 0.035, lp.x + 0.035, lp.y - 0.035, lp.y + 0.035, H0 - 0.008, H0 - 0.006, M['dl'])
HALL = 5.2
def offset_poly(dist):
    """Titik sudut poligon digeser ke luar sejauh dist (perpotongan garis sisi yang digeser)."""
    out = []
    for i in range(N):
        p = i - 1
        a0 = V[p % N] - NRM[p % N] * dist; d0 = U[p % N]
        a1 = V[i] - NRM[i] * dist; d1 = U[i]
        det = d0.x * d1.y - d0.y * d1.x
        if abs(det) < 1e-9: out.append(a1); continue                 # sisi sejajar (ruang berdampingan)
        t = ((a1.x - a0.x) * d1.y - (a1.y - a0.y) * d1.x) / det
        out.append(a0 + d0 * t)
    return out
O = offset_poly(HALL)
for i in range(N):
    a, b, oa, ob_ = V[i], V[(i + 1) % N], O[i], O[(i + 1) % N]
    for z, name, mat, rev in ((0.0, 'lantai aula', M['floor'], True), (H0, 'plafon aula', M['white'], False)):
        vs = [(a.x, a.y, z), (b.x, b.y, z), (ob_.x, ob_.y, z), (oa.x, oa.y, z)]
        me = bpy.data.meshes.new(name); me.from_pydata(vs, [], [(0, 1, 2, 3) if not rev else (3, 2, 1, 0)]); me.update()
        if (me.polygons[0].normal.z > 0) != (z == 0): me.polygons[0].flip()
        obj = bpy.data.objects.new(name, me); dunia.objects.link(obj); me.materials.append(mat)
    d = (ob_ - oa); ln = d.length; ang = math.atan2(d.y, d.x)
    w = R.box(dunia, 'dinding luar', 0, ln, -0.2, 0, 0, H0, M['beige']); w.matrix_world = Matrix.Translation(oa) @ rotz(ang)
    mid = (a + b) / 2 - NRM[i] * 2.4
    R.area(dunia, 'isi aula', (mid.x, mid.y, H0 - 0.05), (0, 0, 0), 3.0, 2.0, 30, SOFT)

sc.world = bpy.data.worlds.new('gelap')
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass

# ---------------------------------------------------------------- jalur kamera: di luar poligon, jarak tetap, memutari sudut (lengkung)
CAM_OUT = float(arg('camout', 2.6)); RC = float(arg('rc', 8.0))
C = offset_poly(CAM_OUT)                                             # titik sudut jalur kamera (sebelum dilengkungkan)
pts = []                                                             # (posisi, yaw) rapat sepanjang jalur
for i in range(N):
    j = (i + 1) % N
    th = ANG[i]; t = RC * math.tan(th / 2)
    t_out_prev = C[i] + U[i] * (RC * math.tan(ANG[i - 1] / 2))
    t_in = C[j] - U[i] * t
    seg = (t_in - t_out_prev).length; steps = max(2, int(seg / 0.05))
    slow = 1.0 if SEGS[i][0] in ('sudut', 'atas') else float(arg('slow', 1.5))   # melambat di depan ruang
    for k in range(steps): pts.append((t_out_prev.lerp(t_in, k / steps), PHI[i], slow))
    ctr_ = t_in + NRM[i] * RC                                        # pusat lengkung (belok ke kiri)
    steps = max(2, int(RC * th / 0.05))
    for k in range(steps):
        a = th * k / steps
        r0 = t_in - ctr_
        pts.append((ctr_ + rotz(a) @ r0, PHI[i] + a, 1.0))
pts.append((pts[0][0], pts[0][1] + 2 * math.pi, pts[0][2]))         # tutup putaran (yaw +360°, tanpa lompatan)
cum = [0.0]
for k in range(1, len(pts)): cum.append(cum[-1] + (pts[k][0] - pts[k - 1][0]).length)
PLEN = cum[-1]
NF = int(arg('nf', 540))
S0 = WR / 2 + (RC * math.tan(ANG[-1] / 2) * 0)                      # frame 0 = tengah ruang pertama
import bisect
def at_s(s):
    s %= PLEN
    k = max(0, bisect.bisect_right(cum, s) - 1)
    if k >= len(pts) - 1: return pts[-1]
    t = (s - cum[k]) / max(1e-9, cum[k + 1] - cum[k])
    (p0, y0, _a), (p1, y1, _b) = pts[k], pts[k + 1]
    return p0.lerp(p1, t), y0 + (y1 - y0) * t
# s untuk tengah ruang 0: proyeksi pusat ruang ke jalur
# dolly lobi: sampel jalur di depan lobi ditarik ke dalam (mendekat) dengan jendela kosinus, puncak di sisi kiri lobi
FOCUS_X, PULL, SPAN = 4.2, float(arg('pull', 2.2)), 7.0             # meter dari tepi kiri lobi / jarak mendekat / lebar jendela
newpts = []
for p, yw, sl in pts:
    u = (p - ORG[0]).dot(U[0]); v = (p - ORG[0]).dot(NRM[0])
    if v < 0 and -SPAN < u - FOCUS_X < SPAN and abs(((yw - PHI[0]) + math.pi) % (2 * math.pi) - math.pi) < 0.3:
        w = 0.5 * (1 + math.cos(math.pi * (u - FOCUS_X) / SPAN))
        p = p + NRM[0] * (PULL * w)
        yw = yw + math.radians(float(arg('tilt0', 20))) * w          # cam 1 menyerong ke sisi kiri lobi
    newpts.append((p, yw, sl))
pts = newpts
cum = [0.0]
# tempo: tiap langkah = jarak × (lambat di depan ruang) + putaran × yawcost; laju itu DIHALUSKAN (rata-rata
# bergerak ±3 m) supaya kamera tidak mendadak cepat/lambat saat masuk/keluar belokan → panning mulus
dist_ = [0.0] + [(pts[k][0] - pts[k - 1][0]).length for k in range(1, len(pts))]
rate_ = [1.0] + [(dist_[k] * pts[k][2] + abs(pts[k][1] - pts[k - 1][1]) * float(arg('yawcost', 5.0))) / max(1e-6, dist_[k]) if dist_[k] > 1e-6 else 1.0 for k in range(1, len(pts))]
Wn = int(arg('smooth', 60)); n_ = len(rate_)
pre = [0.0]
for r_ in rate_ + rate_ + rate_: pre.append(pre[-1] + r_)
rate_s = [(pre[n_ + k + Wn + 1] - pre[n_ + k - Wn]) / (2 * Wn + 1) for k in range(n_)]
for k in range(1, len(pts)):
    cum.append(cum[-1] + dist_[k] * rate_s[k])
PLEN = cum[-1]
c0 = ORG[0] + U[0] * FOCUS_X - NRM[0] * (CAM_OUT - PULL)
SBASE = min(range(len(pts)), key=lambda k: (pts[k][0] - c0).length); SBASE = cum[SBASE]
def cam_pose(f):
    p, yaw = at_s(SBASE + PLEN * (f % NF) / NF)
    return Vector((p.x, p.y, 0)), yaw
ROOM_F = []
for i in range(N):
    if SEGS[i][0] in ('sudut', 'atas'): ROOM_F.append(None); continue
    ci = ORG[i] + U[i] * 0.6 - NRM[i] * CAM_OUT
    kk = min(range(len(pts)), key=lambda k: (pts[k][0] - ci).length)
    ROOM_F.append(int(round(((cum[kk] - SBASE) % PLEN) / PLEN * NF)) % NF)
ROOM_F[0] = 0
lab_rooms = [[ROOM_F[i], labels[i]] for i in range(N) if ROOM_F[i] is not None]

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
if arg('blend'): bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'galery10.blend'))
# label ruang per frame (untuk sets.json situs)
import json
json.dump({'n': NF, 'rooms': lab_rooms}, open(os.path.join(OUT, 'rooms.json'), 'w'))
print('[galery10] %d frame, %d ruang' % (NF, N))

if arg('check'):
    st_, sy_ = [], []
    prev = cam_pose(0)
    for k in range(1, NF + 1):
        cur = cam_pose(k); st_.append((cur[0] - prev[0]).length); sy_.append(abs(math.degrees(cur[1] - prev[1])) % 360); prev = cur
    sy_ = [min(x, 360 - x) for x in sy_]
    print('[cek] langkah posisi/frame min %.3f maks %.3f m · putaran/frame maks %.2f° · lompatan terbesar di frame %d' % (min(st_), max(st_), max(sy_), st_.index(max(st_))))
    sys.exit(0)
if arg('export'):
    # ===== 3D langsung untuk Galeri: GLB warna rata + jalur kamera + daftar lampu (tanpa render)
    import json as _j
    dst = arg('export') if isinstance(arg('export'), str) else os.path.join(R.ROOT, 'assets', 'galeri', 'g10')
    os.makedirs(dst, exist_ok=True)
    yup = lambda v: [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
    lights = []
    srcs_ = [(o.matrix_world, o.instance_collection.all_objects) for o in sc.objects if o.instance_type == 'COLLECTION' and o.instance_collection]
    srcs_.append((Matrix.Identity(4), [o for o in sc.objects if o.type == 'LIGHT']))   # lampu langsung di adegan (blok sudut, aula)
    for inst_mw, obs_ in srcs_:
        for ob in obs_:
            if ob.type != 'LIGHT': continue
            mw = inst_mw @ ob.matrix_basis                  # matrix_world tidak dihitung untuk koleksi yang dikecualikan
            d = ob.data; dirv = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
            Lj = {'t': d.type, 'p': yup(mw.translation), 'd': yup(dirv), 'c': [round(x, 3) for x in d.color], 'e': round(d.energy, 1)}
            if d.type == 'SPOT': Lj['a'] = round(d.spot_size, 3); Lj['b'] = round(d.spot_blend, 2)
            if d.type == 'AREA': Lj['s'] = [round(d.size, 2), round(d.size_y, 2)]
            lights.append(Lj)
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
    print('[galery10] ekspor: %s (%.1f MB), %d frame, %d lampu' % (glb, os.path.getsize(glb) / 1e6, NF, len(lights)))
elif arg('seq'):
    sd = os.path.join(OUT, 'seq'); os.makedirs(sd, exist_ok=True)
    rng = [int(v) for v in str(arg('range', '0:%d:1' % NF)).split(':')]
    for k in range(*rng):
        if arg('skip') and os.path.exists(os.path.join(sd, '%03d.jpg' % k)): continue
        cam_at(k)
        t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(sd, '%03d' % k), webp=False)
        print('[galery10] frame %d/%d %.1f s' % (k + 1, NF, time.time() - t0), flush=True)
else:
    for s in str(arg('shots', '8,16,21,34,47,60')).split(','):
        cam_at(float(s))
        t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s))), webp=False)
        print('[galery10] frame %s %.1f s' % (s, time.time() - t0), flush=True)
