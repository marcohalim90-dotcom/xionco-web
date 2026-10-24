# ==========================================================================
#  XIONCO — Galeri v8: ALUR & SUDUT kamera dari sketsa pemilik, UKURAN ruang dari video galery1
#  (pemilik 21 Okt: "sketsa = aturan angle kamera, bukan skala ruang; ulangi semua ukuran tembok,
#   kedalaman, posisi zoom in/out; panning mulus").  Denah (meter, x timur, y utara):
#   Ruang besar (Lobi) 20 × 8, plafon 3,4 · dinding tengah x=10 dari y 8 → 21 + blok ujung 1,2 m
#   Kanan: Ruang keluarga y 8–14,5, Ruang biliar y 14,5–21 (dalam 6,85), koridor kanan x 17–20
#   Kiri: Bar y 8–12,3, Ruang marmer 12,3–16,6, Kamar tidur 16,6–21, koridor kiri x 0–3
#   Atas: lorong y 21–28 (kamera memutari blok ujung dinding tengah = belokan B, jarak ±4 m)
#  Kamera: 1 dekat sisi kiri lobi (7,5 m) → 2 mundur (15,5 m) → naik koridor kanan menghadap kiri →
#  memutari ujung dinding tengah → turun koridor kiri menghadap kanan → peralihan gelap → kembali ke 1.
#  Jalur: spline halus, laju rata menurut panjang + putaran (tanpa sentakan).
# ==========================================================================
import bpy, sys, os, math, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib as R
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galery8'))
SIZE = [int(v) for v in str(arg('size', '960x540')).lower().split('x')]
SAMPLES = int(arg('samples', 24))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
c = bpy.data.collections.new('galery8'); sc.collection.children.link(c)
H = 3.4; T = 0.24
WARM = R.kelvin(3000); SOFT = R.kelvin(3500); SUN = R.kelvin(4300)

M = {
    'floor':   R.add_grout(R.tex_mat('lantai mikro semen', 'room-floor-concrete', 3.0, tint='#d6cabb', rough=0.3, coat=0.12, nstr=0.1, hsv=(0.5, 0.2, 1.3), mute=0.82),
                           w=1.2, h=1.2, gap=0.0014, col_hex='#bdb2a3', offset=0.0),
    'beige':   R.tex_mat('plester krem', 'room-wall-limewash', 2.6, tint='#ddcfbd', rmul=1.1, nstr=0.3),
    'cream':   R.tex_mat('plester krem muda', 'room-wall-limewash', 2.6, tint='#e8dfd2', rmul=1.1, nstr=0.3),
    'mauve':   R.tex_mat('plester mauve', 'room-wall-limewash', 2.6, tint='#8c6a5f', rmul=1.1, nstr=0.3),
    'terra':   R.tex_mat('plester terakota', 'room-wall-plaster', 2.6, tint='#a8705a', rmul=1.05, nstr=0.35, hsv=(0.5, 0.3, 1.25)),
    'band':    R.tex_mat('pita plester', 'room-wall-limewash', 2.6, tint='#a9998a', rmul=1.1, nstr=0.3),
    'char':    R.tex_mat('dinding arang', 'room-wall-limewash', 2.6, tint='#2c2724', rmul=1.0, nstr=0.2),
    'white':   R.tex_mat('plafon putih', 'room-wall-limewash', 3.0, tint='#efe9e0', rough=0.9, nstr=0.15),
    'walnut':  R.tex_mat('walnut', 'ph-smoked_walnut_veneer', 1.3, tint='#7a5238', rmul=0.8, nstr=0.4, rot=90, coat=0.1),
    'marble':  R.tex_mat('marmer dinding', 'stone-calacatta', 2.2, tint='#e8d9c4', rough=0.2, coat=0.3, spec=0.6),
    'blind':   R.flat_mat('kerai', '#e2d8ca', 0.7),
    'glow':    R.emit_mat('cahaya belakang kerai', R.kelvin(5200), 1.4),
    'glow_w':  R.emit_mat('cahaya hangat', R.kelvin(3200), 4.0),
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
    """Sorot ke dinding tegak di x = xw (side = +1: muka menghadap timur, −1: barat), antara y0..y1."""
    for k in range(n):
        y = y0 + (y1 - y0) * (k + 0.5) / n
        downlight(xw + side * 0.45, y, (xw, y, 0.9), energy, ang=60, blend=.2)

def blinds_y(x0, x1, yw, inward, energy=16000):
    """Jendela berkerai di dinding luar y = yw (inward = +1 ruang di utara, −1 di selatan) + cahaya tajam dari luar."""
    z = 0.12
    while z < H - 0.45:
        ob = R.box(c, 'bilah kerai', x0, x1, -0.03, 0.03, -0.003, 0.003, M['blind'])
        ob.location = (0, yw + inward * 0.14, z); ob.rotation_euler.x = math.radians(32 * inward)
        z += 0.09
    B('kotak cahaya', x0 - 0.5, x1 + 0.5, yw - inward * 2.65, yw - inward * 2.6, -0.2, H + 0.4, M['glow'])
    xm = (x0 + x1) / 2
    R.spot(c, 'cahaya tajam', (xm - 2.2, yw - inward * 5.0, 2.8), (xm - 0.9, yw + inward * 3.6, 0), energy, SUN, size=0.02, ang=48, blend=.1)

# ---------------------------------------------------------------- lantai, plafon, dinding luar
B('lantai', -0.4, 20.4, -0.4, 28.4, -0.1, 0, M['floor'])
B('plafon', -0.4, 20.4, -0.4, 28.4, H, H + 0.15, M['white'])
B('dinding selatan kiri', -0.24, 8.0, -0.24, 0, 0, H, M['beige']); B('dinding selatan kanan', 11.0, 20.24, -0.24, 0, 0, H, M['beige'])
B('ambang jendela selatan', 8.0, 11.0, -0.24, 0, H - 0.4, H, M['beige']); blinds_y(8.0, 11.0, -0.12, +1)
B('dinding utara kiri', -0.24, 3.0, 28, 28.24, 0, H, M['beige']); B('dinding utara kanan', 7.0, 20.24, 28, 28.24, 0, H, M['beige'])
B('ambang jendela utara', 3.0, 7.0, 28, 28.24, H - 0.4, H, M['beige']); blinds_y(3.0, 7.0, 28.12, -1)
B('dinding barat', -0.24, 0, 0, 28, 0, H, M['beige'])
B('dinding timur', 20, 20.24, 0, 28, 0, H, M['beige'])

# ---------------------------------------------------------------- dinding dalam
B('dinding ruang besar utara', 3.0, 17.0, 8.0 - T / 2, 8.0 + T / 2, 0, H, M['beige'])
B('dinding tengah', 10.0 - 0.15, 10.0 + 0.15, 8.0, 21.0, 0, H, M['cream'])
B('blok ujung', 9.25, 10.75, 21.0, 22.2, 0, H, M['beige'])                 # dikitari kamera di lorong atas
B('sekat kanan', 10.15, 16.4, 14.5 - 0.12, 14.5 + 0.12, 0, H, M['beige'])
B('sekat kiri atas', 3.6, 9.85, 16.6 - 0.12, 16.6 + 0.12, 0, H, M['beige'])
B('sekat kiri bawah', 3.6, 9.85, 12.3 - 0.12, 12.3 + 0.12, 0, H, M['beige'])

# ---------------------------------------------------------------- LOBI (ruang besar, fokus sisi kiri = dinding barat)
B('dinding barat mauve', 0, 0.03, 0.4, 7.6, 0, H, M['mauve'])
B('panel krem berdiri', 1.35, 1.55, 1.8, 6.2, 0, H - 0.6, M['cream'])
B('led panel', 1.55, 1.57, 1.8, 6.2, H - 0.62, H - 0.6, M['led'])
B('pilar mauve', 4.2, 5.0, 5.4, 6.2, 0, H, M['mauve']); B('soffit mauve', 4.2, 5.0, 6.2, 7.88, H - 0.45, H, M['mauve'])
wash_x(1.55, +1, 1.8, 6.2, 2, 220)
downlight(4.6, 4.9, (4.6, 5.4, 1.0), 150, ang=55)
B('ceruk lantai barat', 0.03, 0.6, 0.6, 1.4, 0, 2.6, M['walnut'])          # panel walnut tipis (kayu 1)
for x in (6.5, 10.5, 14.5):
    for y in (2.5, 5.5): downlight(x, y, energy=80)
R.area(c, 'isi lobi', (10, 4, H - 0.05), (0, 0, 0), 8.0, 4.0, 160, SOFT)

# ---------------------------------------------------------------- RUANG KELUARGA (kanan bawah, menghadap barat ke dinding tengah)
B('panel fitur', 10.15, 10.21, 8.9, 13.6, 0, 2.7, M['cream']); B('led panel', 10.21, 10.23, 8.9, 13.6, 2.68, 2.7, M['led'])
B('kolom walnut tipis', 10.15, 10.55, 13.75, 14.15, 0, H, M['walnut'])     # kayu 1
wash_x(10.21, +1, 8.9, 13.6, 2, 200)
R.area(c, 'isi keluarga', (13.5, 11.2, H - 0.05), (0, 0, 0), 3.0, 3.0, 60, SOFT)
# ---------------------------------------------------------------- RUANG BILIAR (kanan atas): balok walnut + dinding terakota
B('dinding terakota', 10.15, 10.18, 14.62, 20.9, 0, H, M['terra'])
wash_x(10.18, +1, 14.8, 20.7, 3, 220)
y = 15.0
while y < 20.9: B('balok', 10.15, 17.0, y - 0.05, y + 0.05, H - 0.16, H, M['walnut']); y += 0.6
R.area(c, 'isi biliar', (13.5, 17.7, H - 0.2), (0, 0, 0), 3.0, 3.0, 50, SOFT)
# ---------------------------------------------------------------- LORONG ATAS: blok ujung disorot, lampu lorong
downlight(10.0, 23.1, (10.0, 22.2, 1.0), 230, ang=55, blend=.2)
for x in (3.0, 16.5): downlight(x, 24.0, energy=70)
for x in (6.5, 13.5): downlight(x, 26.2, energy=70)
# ---------------------------------------------------------------- KAMAR (kiri atas): pita kepala ranjang
B('pita kepala', 9.79, 9.85, 17.3, 20.3, 0, 1.2, M['band'])
wash_x(9.79, -1, 17.1, 20.5, 2, 180)
# ---------------------------------------------------------------- RUANG MARMER (kiri tengah): panel marmer berdiri + cahaya celah
B('cahaya celah', 9.83, 9.85, 12.8, 16.1, 0.3, H - 0.6, M['glow_w'])
B('panel marmer', 9.05, 9.2, 13.0, 15.9, 0, H - 0.5, M['marble'])
wash_x(9.05, -1, 13.0, 15.9, 2, 190)
# ---------------------------------------------------------------- BAR (kiri bawah): dinding arang + rak bercahaya + walnut bergaris
B('dinding arang', 9.82, 9.85, 8.12, 12.18, 0, H, M['char'])
for (y0, y1) in ((8.6, 10.0), (10.4, 11.8)):
    B('rak bercahaya', 9.8, 9.82, y0, y1, 0.85, 2.8, M['glow_w'])
    for z in (0.85, 1.5, 2.15, 2.78): B('ambalan', 9.5, 9.8, y0, y1, z, z + 0.025, M['walnut'])
    B('sisi rak', 9.5, 9.8, y0 - 0.03, y0, 0.85, 2.8, M['char']); B('sisi rak', 9.5, 9.8, y1, y1 + 0.03, 0.85, 2.8, M['char'])
for y in (9.3, 11.1): downlight(8.6, y, (9.6, y, 1.4), 120, ang=46)
# koridor
for y in (10.0, 14.5, 19.0): downlight(1.5, y, energy=70); downlight(18.5, y, energy=70)

sc.world = bpy.data.worlds.new('gelap')
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass

# ---------------------------------------------------------------- jalur kamera (sudut dari sketsa pemilik, posisi dari ukuran nyata)
#  yaw: 90 = menghadap barat (kiri sketsa), 180 = selatan, 270 = timur
KEYS = [((7.5, 4.0), 90),            # 1 dekat: fokus sisi kiri lobi
        ((15.5, 4.0), 90),           # 2 mundur (zoom out)
        ((18.5, 6.4), 90),           # menyamping ke koridor kanan
        ((18.6, 11.2), 90),          # ruang keluarga
        ((18.6, 17.7), 90),          # ruang biliar
        ((18.2, 23.2), 118),         # 3 → mulai memutari ujung dinding tengah (lorong atas 7 m)
        ((14.6, 25.4), 150),         # 4
        ((10.0, 26.3), 180),
        ((5.4, 25.4), 210),          # 5
        ((1.8, 23.2), 242),
        ((1.4, 18.8), 270),          # 6 kamar
        ((1.4, 14.45), 270),         # ruang marmer
        ((1.4, 10.15), 270),         # 7 bar
        ((1.5, 8.6), 270)]
NF = int(arg('nf', 320))
def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
pts = [(Vector((x, y, 0)), math.radians(a)) for (x, y), a in KEYS]
dense = []                                                     # sampel rapat sepanjang spline (posisi + yaw)
for i in range(len(pts) - 1):
    p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(len(pts) - 1, i + 2)]
    for k in range(60):
        t = k / 60
        dense.append((catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)))
dense.append(pts[-1])
cost = [0.0]                                                   # laju rata: jarak + putaran (1 rad ≈ 2,4 m)
for a, b in zip(dense, dense[1:]): cost.append(cost[-1] + (b[0] - a[0]).length + abs(b[1] - a[1]) * 2.4)
TOT = cost[-1]
import bisect
def cam_pose(f):
    s = TOT * (f % NF) / NF
    k = min(len(dense) - 2, max(0, bisect.bisect_right(cost, s) - 1))
    t = (s - cost[k]) / max(1e-9, cost[k + 1] - cost[k])
    p = dense[k][0].lerp(dense[k + 1][0], t); yaw = dense[k][1] + (dense[k + 1][1] - dense[k][1]) * t
    return Vector((p.x, p.y, 0)), yaw
def frame_of(key_index):
    target = pts[key_index][0]; kk = min(range(len(dense)), key=lambda k: (dense[k][0] - target).length)
    return int(round(cost[kk] / TOT * NF))
ROOMS = [(0, 'Lobi'), (frame_of(3) - 14, 'Ruang keluarga'), (frame_of(4) - 14, 'Ruang biliar'), (frame_of(6) - 10, 'Lorong atas'),
         (frame_of(10) - 14, 'Kamar tidur'), (frame_of(11) - 12, 'Ruang marmer'), (frame_of(12) - 12, 'Bar')]

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
print('[galery8] %d frame · titik kunci di frame %s' % (NF, [frame_of(i) for i in range(len(pts))]))

# laporan kehalusan: perubahan posisi & sudut per frame (cek sebelum dikirim)
if arg('check'):
    st, sy = [], []
    prev = cam_pose(0)
    for k in range(1, NF):
        cur = cam_pose(k); st.append((cur[0] - prev[0]).length); sy.append(abs(math.degrees(cur[1] - prev[1]))); prev = cur
    print('[cek] langkah posisi/frame min %.3f maks %.3f m · putaran/frame maks %.2f°' % (min(st), max(st), max(sy)))

if arg('export'):
    dst = os.path.join(R.ROOT, 'assets', 'galeri', 'g8'); os.makedirs(dst, exist_ok=True)
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
    print('[galery8] ekspor: %s (%.1f MB), %d frame, %d lampu' % (glb, os.path.getsize(glb) / 1e6, NF, len(lights)))
elif arg('seq'):
    sd = os.path.join(OUT, 'seq'); os.makedirs(sd, exist_ok=True)
    rng = [int(v) for v in str(arg('range', '0:%d:1' % NF)).split(':')]
    for k in range(*rng):
        cam_at(k); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(sd, '%03d' % k), webp=False)
        print('[galery8] frame %d/%d %.1f s' % (k + 1, NF, time.time() - t0), flush=True)
elif not arg('check'):
    for s_ in str(arg('shots', '0,20,40,60,90,120,150,170,190,210,240,270,300')).split(','):
        cam_at(float(s_)); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s_))), webp=False)
        print('[galery8] frame %s %.1f s' % (s_, time.time() - t0), flush=True)
