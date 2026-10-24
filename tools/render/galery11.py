# ==========================================================================
#  XIONCO — Galeri v11: DIBUAT ULANG dari sketsa pemilik (22 Okt) — sudut kamera DAN bentuk/ukuran ruang & tembok
#  mengikuti gambar (skala 1 piksel = 0,05 m). Tidak memakai model versi sebelumnya.
#   Denah (piksel sketsa): kotak luar 42..442 × 62..606 · dinding tengah x=230 (y 145..443) · dinding atas T y=145
#   (x 150..312) · sekat kanan y=268 (x 230..350) · sekat kiri y=293 (x 140..230) · dinding bawah y=443 (x 42..320)
#   Ruang: lobi bawah 20 × 8,15 m · kanan: ruang besar 8,75 × 6 m + ruang kecil 6,15 × 4,1 m (dangkal, dekat kamera,
#   pajang sedikit barang) · kiri: dua ruang sama 7,4 × 4,5 m · dinding T sisi utara = dinding pajang produk (cam 5)
#  Kamera: 1 → 2 mundur MENYERONG (yaw 108° → 90°) · 2 → 3 geser kanan lurus mulus · 4 → 5 → 6 putar 180° ·
#  7 → 8 geser kanan lurus mulus · 8 → 1 tertutup dinding bawah → layar meredup singkat (viewer).
#  Arsitektur saja. --check (kehalusan) · --shots · --seq · --export (3D langsung → assets/galeri/g11)
# ==========================================================================
import bpy, sys, os, math, time, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib as R
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galery11'))
SIZE = [int(v) for v in str(arg('size', '960x540')).lower().split('x')]
SAMPLES = int(arg('samples', 24))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
c = bpy.data.collections.new('galery11'); sc.collection.children.link(c)
K = 0.05                                            # meter per piksel sketsa
H = 3.4; T = 0.22
WARM = R.kelvin(3000); SOFT = R.kelvin(3500); SUN = R.kelvin(4300)
def P(px, py): return Vector(((px - 42) * K, (606 - py) * K, 0))
def X(px): return (px - 42) * K
def Y(py): return (606 - py) * K

M = {
    'floor':   R.add_grout(R.tex_mat('lantai mikro semen', 'room-floor-concrete', 3.0, tint='#d6cabb', rough=0.3, coat=0.12, nstr=0.1, hsv=(0.5, 0.2, 1.3), mute=0.82),
                           w=1.2, h=1.2, gap=0.0014, col_hex='#bdb2a3', offset=0.0),
    'parquet': R.tex_mat('parket herringbone', 'ph-herringbone_parquet', 1.6, tint='#cfae8c', rmul=0.8, nstr=0.4, hsv=(0.5, 0.45, 1.6), coat=0.1, mute=0.45),
    'beige':   R.tex_mat('plester krem', 'room-wall-limewash', 2.6, tint='#ddcfbd', rmul=1.1, nstr=0.3),
    'cream':   R.tex_mat('plester krem muda', 'room-wall-limewash', 2.6, tint='#e8dfd2', rmul=1.1, nstr=0.3),
    'mauve':   R.tex_mat('plester mauve', 'room-wall-limewash', 2.6, tint='#8c6a5f', rmul=1.1, nstr=0.3),
    'terra':   R.tex_mat('plester terakota', 'room-wall-plaster', 2.6, tint='#a8705a', rmul=1.05, nstr=0.35, hsv=(0.5, 0.3, 1.25)),
    'band':    R.tex_mat('pita plester', 'room-wall-limewash', 2.6, tint='#a9998a', rmul=1.1, nstr=0.3),
    'char':    R.tex_mat('dinding arang', 'room-wall-limewash', 2.6, tint='#2c2724', rmul=1.0, nstr=0.2),
    'white':   R.tex_mat('plafon putih', 'room-wall-limewash', 3.0, tint='#efe9e0', rough=0.9, nstr=0.15),
    'walnut':  R.tex_mat('walnut', 'ph-smoked_walnut_veneer', 1.3, tint='#7a5238', rmul=0.8, nstr=0.4, rot=90, coat=0.1),
    'stone':   R.tex_mat('batu travertine', 'stone-travertine', 1.2, tint='#e6dccd', rough=0.45),
    'blind':   R.flat_mat('kerai', '#e2d8ca', 0.7),
    'glow':    R.emit_mat('cahaya belakang kerai', R.kelvin(5200), 1.4),
    'glow_w':  R.emit_mat('cahaya hangat', R.kelvin(3200), 0.9),
    'led':     R.emit_mat('led lis', R.kelvin(2900), 16.0),
    'dl':      R.emit_mat('downlight', R.kelvin(3000), 40.0),
    'rim':     R.flat_mat('bingkai downlight', '#d8d2c8', 0.4),
}
B = lambda *a, **k: R.box(c, *a, **k)

def downlight(x, y, aim=None, energy=140, ang=58, blend=.3):
    B('cincin dl', x - 0.055, x + 0.055, y - 0.055, y + 0.055, H - 0.006, H, M['rim'])
    B('cakram dl', x - 0.035, x + 0.035, y - 0.035, y + 0.035, H - 0.008, H - 0.006, M['dl'])
    R.spot(c, 'sorot', (x, y, H - 0.03), aim or (x, y, 0), energy, WARM, size=0.012, ang=ang, blend=blend)

def wash_x(xw, side, y0, y1, n=2, energy=190):
    for k in range(n):
        y = y0 + (y1 - y0) * (k + 0.5) / n
        downlight(xw + side * 0.45, y, (xw, y, 0.9), energy, ang=60, blend=.2)

def wash_y(yw, side, x0, x1, n=2, energy=190):
    for k in range(n):
        x = x0 + (x1 - x0) * (k + 0.5) / n
        downlight(x, yw + side * 0.45, (x, yw, 0.9), energy, ang=60, blend=.2)

def blinds_y(x0, x1, yw, inward, energy=16000):
    """Jendela berkerai di dinding luar y = yw (inward +1: ruang di utara) + cahaya tajam dari luar → bayangan garis."""
    z = 0.12
    while z < H - 0.45:
        ob = R.box(c, 'bilah kerai', x0, x1, -0.03, 0.03, -0.003, 0.003, M['blind'])
        ob.location = (0, yw + inward * 0.14, z); ob.rotation_euler.x = math.radians(32 * inward)
        z += 0.09
    B('kotak cahaya', x0 - 0.5, x1 + 0.5, yw - inward * 2.65, yw - inward * 2.6, -0.2, H + 0.4, M['glow'])
    xm = (x0 + x1) / 2
    R.spot(c, 'cahaya tajam', (xm - 2.2, yw - inward * 5.0, 2.8), (xm - 0.9, yw + inward * 3.6, 0), energy, SUN, size=0.02, ang=48, blend=.1)

def plinth(x, y, w, d, h, mat=None):
    """Alas pajang produk (nanti produk XIONCO di atasnya) + sorot tegas dari atas."""
    B('alas', x - w / 2, x + w / 2, y - d / 2, y + d / 2, 0, h, mat or M['stone'], bevel=0.01)
    downlight(x, y, (x, y, h), 160, ang=34, blend=.25)

# ---------------------------------------------------------------- lantai, plafon, tembok luar (kotak 42..442 × 62..606)
x0, x1, y0, y1 = X(42), X(442), Y(606), Y(62)
B('lantai', x0 - 0.3, x1 + 0.3, y0 - 0.3, y1 + 0.3, -0.1, 0, M['floor'])
B('plafon', x0 - 0.3, x1 + 0.3, y0 - 0.3, y1 + 0.3, H, H + 0.15, M['white'])
# selatan (lobi) dengan jendela berkerai; utara dengan jendela berkerai di atas dinding T
wx0, wx1 = X(250), X(350)
B('tembok selatan kiri', x0 - T, wx0, y0 - T, y0, 0, H, M['beige']); B('tembok selatan kanan', wx1, x1 + T, y0 - T, y0, 0, H, M['beige'])
B('ambang selatan', wx0, wx1, y0 - T, y0, H - 0.4, H, M['beige']); blinds_y(wx0, wx1, y0 - 0.11, +1)
nx0, nx1 = X(60), X(140)
B('tembok utara kiri', x0 - T, nx0, y1, y1 + T, 0, H, M['beige']); B('tembok utara kanan', nx1, x1 + T, y1, y1 + T, 0, H, M['beige'])
B('ambang utara', nx0, nx1, y1, y1 + T, H - 0.4, H, M['beige']); blinds_y(nx0, nx1, y1 + 0.11, -1)
B('tembok barat', x0 - T, x0, y0, y1, 0, H, M['beige'])
B('tembok timur', x1, x1 + T, y0, y1, 0, H, M['beige'])

# ---------------------------------------------------------------- tembok dalam (persis sketsa)
B('dinding tengah', X(230) - T / 2, X(230) + T / 2, Y(443), Y(145), 0, H, M['cream'])
B('dinding T', X(150), X(312), Y(145) - T / 2, Y(145) + T / 2, 0, H, M['cream'])
B('sekat kanan', X(230), X(350), Y(268) - T / 2, Y(268) + T / 2, 0, H, M['beige'])
B('sekat kiri', X(140), X(230), Y(293) - T / 2, Y(293) + T / 2, 0, H, M['beige'])
B('dinding bawah', X(42), X(320), Y(443) - T / 2, Y(443) + T / 2, 0, H, M['beige'])

# ---------------------------------------------------------------- LOBI (ruang besar bawah): fokus sisi kiri (cam 1 menyerong)
B('dinding barat mauve', x0, x0 + 0.03, Y(600), Y(450), 0, H, M['mauve'])
B('panel krem berdiri', x0 + 1.3, x0 + 1.5, Y(590), Y(465), 0, H - 0.6, M['cream'])
B('led panel', x0 + 1.5, x0 + 1.52, Y(590), Y(465), H - 0.62, H - 0.6, M['led'])
pp = P(130, 470); B('pilar mauve', pp.x - 0.4, pp.x + 0.4, pp.y - 0.4, pp.y + 0.4, 0, H, M['mauve'])
wash_x(x0 + 1.52, +1, Y(590), Y(465), 2, 220)
downlight(pp.x + 0.9, pp.y, (pp.x + 0.4, pp.y, 1.0), 150, ang=55)
B('panel walnut tipis', X(42) + 0.03, X(42) + 0.07, Y(530), Y(500), 0, H - 0.4, M['walnut'])
for px in (120, 220, 320, 410):
    for py in (480, 560): q = P(px, py); downlight(q.x, q.y, energy=75)
R.area(c, 'isi lobi', tuple(P(242, 525) + Vector((0, 0, H - 0.05))), (0, 0, 0), 8.0, 4.0, 160, SOFT)

# ---------------------------------------------------------------- KANAN: ruang besar (y 268..443) — dinding tengah sisi timur
B('lantai parket', X(230) + T / 2, X(350), Y(443) + T / 2, Y(268) - T / 2, -0.1, 0.002, M['parquet'])
B('panel fitur', X(230) + T / 2, X(230) + T / 2 + 0.06, Y(430), Y(280), 0, 2.7, M['cream'])
B('led panel', X(230) + T / 2 + 0.06, X(230) + T / 2 + 0.08, Y(430), Y(280), 2.68, 2.7, M['led'])
B('kolom walnut tipis', X(230) + T / 2, X(230) + T / 2 + 0.4, Y(440) - 0.02, Y(440) + 0.38, 0, H, M['walnut'])
wash_x(X(230) + T / 2 + 0.06, +1, Y(430), Y(280), 3, 200)
R.area(c, 'isi ruang besar kanan', tuple(P(290, 355) + Vector((0, 0, H - 0.05))), (0, 0, 0), 3.0, 4.0, 60, SOFT)
# ---------------------------------------------------------------- KANAN: ruang kecil (y 145..268, sampai x 312) — pajang sedikit barang
B('dinding terakota', X(230) + T / 2, X(230) + T / 2 + 0.03, Y(266), Y(147), 0, H, M['terra'])
for (px, py) in ((268, 230), (268, 182)): q = P(px, py); plinth(q.x, q.y, 0.9, 0.9, 0.45)
R.area(c, 'isi ruang kecil', tuple(P(270, 206) + Vector((0, 0, H - 0.05))), (0, 0, 0), 2.0, 2.0, 25, SOFT)

# ---------------------------------------------------------------- ATAS: dinding T sisi utara = dinding pajang produk (cam 5)
yN = Y(145) + T / 2
for (a_, b_) in ((160, 205), (208, 252), (255, 300)):
    xa, xb = X(a_), X(b_)
    B('ceruk pajang', xa, xb, yN, yN + 0.02, 0.0, 0.0001, M['band'])
    B('panel batu ceruk', xa + 0.1, xb - 0.1, yN, yN + 0.03, 0.55, 2.7, M['stone'])
    q = Vector(((xa + xb) / 2, yN + 0.55, 0)); plinth(q.x, q.y, (xb - xa) - 0.6, 0.6, 0.55)
    B('led ceruk', xa + 0.1, xb - 0.1, yN + 0.03, yN + 0.05, 2.68, 2.7, M['led'])
for px in (100, 380): q = P(px, 105); downlight(q.x, q.y, energy=80)

# ---------------------------------------------------------------- KIRI: dua ruang sama besar (y 145..293 & 293..443) — sisi barat dinding tengah
xw = X(230) - T / 2
B('pita kepala (ruang kiri atas)', xw - 0.06, xw, Y(280), Y(160), 0, 1.2, M['band'])
wash_x(xw - 0.06, -1, Y(280), Y(160), 2, 190)
R.area(c, 'isi kiri atas', tuple(P(185, 219) + Vector((0, 0, H - 0.05))), (0, 0, 0), 2.5, 3.0, 45, SOFT)
B('dinding arang (ruang kiri bawah)', xw - 0.03, xw, Y(440), Y(296), 0, H, M['char'])
for (a_, b_) in ((300, 360), (376, 436)):
    ya, yb = Y(b_), Y(a_)
    B('rak bercahaya', xw - 0.05, xw - 0.03, ya, yb, 0.85, 2.8, M['glow_w'])
    for z in (0.85, 1.5, 2.15, 2.78): B('ambalan', xw - 0.33, xw - 0.03, ya, yb, z, z + 0.025, M['walnut'])
for py in (330, 405): q = P(190, py); downlight(q.x, q.y, (xw - 0.2, q.y, 1.4), 120, ang=46)
# koridor
for py in (180, 330): q = P(95, py); downlight(q.x, q.y, energy=70)
for py in (180, 330, 420): q = P(398, py); downlight(q.x, q.y, energy=70)

sc.world = bpy.data.worlds.new('gelap')
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass

# ---------------------------------------------------------------- jalur kamera (titik & arah dari sketsa; kamera di tepi tembok → 0,3 m di dalam)
#  yaw: 90 = menghadap kiri (barat), 180 = bawah (selatan), 270 = kanan (timur)
KEYS = [((230, 518), 108),           # 1 dekat, menyerong ke kiri-bawah
        ((330, 503), 99),
        ((424, 487), 90),            # 2 (mundur menyerong selesai)
        ((424, 395), 90),            #   ruang besar kanan
        ((424, 310), 90),            # 3
        ((424, 205), 90),            #   ruang kecil kanan
        ((420, 118), 118),
        ((404, 90), 140),            # 4
        ((310, 82), 165),
        ((216, 82), 180),            # 5 dinding pajang produk
        ((122, 82), 197),
        ((72, 92), 216),             # 6
        ((58, 125), 248),
        ((56, 195), 270),            # 7
        ((56, 357), 270),            # 8
        ((56, 425), 270)]
pts = [(P(*p), math.radians(a)) for p, a in KEYS]
def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
dense = []
for i in range(len(pts) - 1):
    p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(len(pts) - 1, i + 2)]
    for k in range(80):
        t = k / 80
        dense.append((catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)))
dense.append(pts[-1])
# laju dihaluskan (jarak + putaran), seperti v9
dist_ = [0.0] + [(dense[k][0] - dense[k - 1][0]).length for k in range(1, len(dense))]
rate_ = [1.0] + [(dist_[k] + abs(dense[k][1] - dense[k - 1][1]) * float(arg('yawcost', 4.0))) / max(1e-6, dist_[k]) if dist_[k] > 1e-6 else 1.0 for k in range(1, len(dense))]
Wn = int(arg('smooth', 50)); n_ = len(rate_)
pre = [0.0]
for r_ in rate_: pre.append(pre[-1] + r_)
rate_s = [(pre[min(n_, k + Wn + 1)] - pre[max(0, k - Wn)]) / (min(n_, k + Wn + 1) - max(0, k - Wn)) for k in range(n_)]
cost = [0.0]
for k in range(1, len(dense)): cost.append(cost[-1] + dist_[k] * rate_s[k])
TOT = cost[-1]
NF = int(arg('nf', 420))
def cam_pose(f):
    s = TOT * (f % NF) / NF
    k = min(len(dense) - 2, max(0, bisect.bisect_right(cost, s) - 1))
    t = (s - cost[k]) / max(1e-9, cost[k + 1] - cost[k])
    p = dense[k][0].lerp(dense[k + 1][0], t); yaw = dense[k][1] + (dense[k + 1][1] - dense[k][1]) * t
    return Vector((p.x, p.y, 0)), yaw
def frame_of(ki):
    target = pts[ki][0]; kk = min(range(len(dense)), key=lambda k: (dense[k][0] - target).length)
    return int(round(cost[kk] / TOT * NF))
ROOMS = [(0, 'Lobi'), (frame_of(3) - 12, 'Ruang besar'), (frame_of(5) - 10, 'Ruang kecil'), (frame_of(8), 'Dinding pajang'),
         (frame_of(13) - 6, 'Ruang kiri atas'), (frame_of(14) - 14, 'Ruang kiri bawah')]

cd = bpy.data.cameras.new('kamera'); cd.lens = float(arg('lens', 24)); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
CAM_Z = float(arg('camz', 1.45))
def cam_at(f):
    p, yaw = cam_pose(f); cam.location = (p.x, p.y, CAM_Z); cam.rotation_euler = (math.radians(90), 0, yaw)

R.color_management(sc, float(arg('exposure', 1.0)), float(arg('wb', 4300)))
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
R.cycles(sc, SAMPLES)
json.dump({'n': NF, 'rooms': [[f, n] for f, n in ROOMS]}, open(os.path.join(OUT, 'rooms.json'), 'w'))
print('[galery11] %d frame · kamera sketsa di frame: 1=%d 2=%d 3=%d 4=%d 5=%d 6=%d 7=%d 8=%d' % (NF, frame_of(0), frame_of(2), frame_of(4), frame_of(7), frame_of(9), frame_of(11), frame_of(13), frame_of(14)))

if arg('check'):
    st_, sy_ = [], []
    prev = cam_pose(0)
    for k in range(1, NF - 1):
        cur = cam_pose(k); st_.append((cur[0] - prev[0]).length); sy_.append(abs(math.degrees(cur[1] - prev[1]))); prev = cur
    print('[cek] langkah posisi/frame min %.3f maks %.3f m · putaran/frame maks %.2f°' % (min(st_), max(st_), max(sy_)))
    sys.exit(0)

if arg('export'):
    dst = os.path.join(R.ROOT, 'assets', 'galeri', 'g11'); os.makedirs(dst, exist_ok=True)
    yup = lambda v: [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
    bpy.context.view_layer.update()
    lights = []
    for ob in [o for o in sc.objects if o.type == 'LIGHT']:
        mw = ob.matrix_world; d = ob.data; dirv = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
        Lj = {'t': d.type, 'p': yup(mw.translation), 'd': yup(dirv), 'c': [round(x, 3) for x in d.color], 'e': round(d.energy, 1)}
        if d.type == 'SPOT': Lj['a'] = round(d.spot_size, 3); Lj['b'] = round(d.spot_blend, 2)
        lights.append(Lj)
    for o in list(sc.objects):
        if o.type in ('LIGHT', 'CAMERA'): bpy.data.objects.remove(o, do_unlink=True)
    for m in bpy.data.materials:
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
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False, export_lights=False, export_cameras=False, export_apply=True, export_yup=True)
    frames = []
    for k in range(NF):
        p, yaw = cam_pose(k); fv = Vector((-math.sin(yaw), math.cos(yaw), 0))
        frames.append(yup((p.x, p.y, CAM_Z)) + [round(fv.x, 4), round(-fv.y, 4)])
    json.dump({'n': NF, 'hfov': round(2 * math.degrees(math.atan(18 / float(arg('lens', 24)))), 2), 'frames': frames, 'fadeLoop': True}, open(os.path.join(dst, 'path.json'), 'w'))
    json.dump(lights, open(os.path.join(dst, 'lights.json'), 'w'))
    print('[galery11] ekspor: %s (%.1f MB), %d frame, %d lampu' % (glb, os.path.getsize(glb) / 1e6, NF, len(lights)))
elif arg('seq'):
    sd = os.path.join(OUT, 'seq'); os.makedirs(sd, exist_ok=True)
    rng = [int(v) for v in str(arg('range', '0:%d:1' % NF)).split(':')]
    for k in range(*rng):
        cam_at(k); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(sd, '%03d' % k), webp=False)
        print('[galery11] frame %d/%d %.1f s' % (k + 1, NF, time.time() - t0), flush=True)
else:
    for s_ in str(arg('shots', '0,30,60')).split(','):
        cam_at(float(s_)); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s_))), webp=False)
        print('[galery11] frame %s %.1f s' % (s_, time.time() - t0), flush=True)
