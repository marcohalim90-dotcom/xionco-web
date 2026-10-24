# ==========================================================================
#  XIONCO — Galeri v7: denah & alur kamera dari sketsa pemilik (21 Okt)
#   • satu ruang besar di bawah: mulai fokus ke SISI KIRI ruang, kamera MUNDUR (cam 1 → 2)
#   • naik koridor kanan menghadap kiri (cam 2 → 3) melewati 2 ruang di kanan dinding tengah
#   • di atas, kamera MEMUTARI ujung dinding tengah (cam 3 → 4 → 5) = belokan B (dari luar, menghadap ke dalam)
#   • turun koridor kiri menghadap kanan (cam 5 → 6 → 7) melewati 3 ruang di kiri dinding tengah
#   • cam 7 → 1: dinding bawah menutup jalan → putaran lewat peralihan gelap singkat (viewer)
#  Koordinat sketsa (piksel, y ke bawah) → meter: X = (px − 52)·K, Y = (638 − py)·K.
#  Arsitektur saja (tanpa furnitur). --export = 3D langsung untuk Galeri; tanpa itu = render Cycles (--shots / --seq).
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

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galery7'))
SIZE = [int(v) for v in str(arg('size', '960x540')).lower().split('x')]
SAMPLES = int(arg('samples', 24))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
c = bpy.data.collections.new('galery7'); sc.collection.children.link(c)
K = float(arg('scale', 0.05))                       # meter per piksel sketsa
H = 3.4                                             # tinggi plafon
T = 0.22                                            # tebal dinding
WARM = R.kelvin(3000); SOFT = R.kelvin(3500); SUN = R.kelvin(4300)
def P(px, py): return Vector(((px - 52) * K, (638 - py) * K, 0))

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
    'black':   R.flat_mat('baja hitam', '#1b1a19', 0.4, 0.85),
    'glow':    R.emit_mat('cahaya belakang kerai', R.kelvin(5200), 1.4),
    'glow_w':  R.emit_mat('cahaya hangat', R.kelvin(3200), 2.6),
    'led':     R.emit_mat('led lis', R.kelvin(2900), 16.0),
    'dl':      R.emit_mat('downlight', R.kelvin(3000), 40.0),
    'rim':     R.flat_mat('bingkai downlight', '#d8d2c8', 0.4),
}
B = lambda *a, **k: R.box(c, *a, **k)

def wall(p0, p1, mat, h=H, t=T):
    """Dinding lurus dari titik sketsa p0 ke p1 (piksel), tebal t di tengah garis."""
    a, b = P(*p0), P(*p1); d = b - a; ln = d.length
    ob = R.box(c, 'dinding', 0, ln, -t / 2, t / 2, 0, h, mat)
    ob.matrix_world = Matrix.Translation(a) @ Matrix.Rotation(math.atan2(d.y, d.x), 4, 'Z')
    return ob

def downlight(x, y, aim=None, energy=140, ang=58, blend=.3):
    B('cincin dl', x - 0.055, x + 0.055, y - 0.055, y + 0.055, H - 0.006, H, M['rim'])
    B('cakram dl', x - 0.035, x + 0.035, y - 0.035, y + 0.035, H - 0.008, H - 0.006, M['dl'])
    R.spot(c, 'sorot', (x, y, H - 0.03), aim or (x, y, 0), energy, WARM, size=0.012, ang=ang, blend=blend)

def wash(pa, pb, normal, n=2, energy=190):
    """Sorot ke dinding antara titik sketsa pa–pb; normal = arah muka dinding (ke ruang)."""
    a, b = P(*pa), P(*pb)
    for k in range(n):
        q = a.lerp(b, (k + 0.5) / n); l = q + Vector(normal) * 0.42
        downlight(l.x, l.y, (q.x, q.y, 0.9), energy, ang=60, blend=.2)

def face(pa, pb, normal, mat, h=H - 0.6, off=0.02, z0=0.0):
    """Pelapis tipis di muka dinding (panel fitur / marmer / walnut tipis)."""
    a, b = P(*pa), P(*pb); d = b - a; ln = d.length
    nv = Vector(normal)
    ob = R.box(c, 'panel', 0, ln, 0, off + 0.04, z0, h, mat)
    ang = math.atan2(d.y, d.x); ob.matrix_world = Matrix.Translation(a + nv * (T / 2)) @ Matrix.Rotation(ang, 4, 'Z')
    if (Matrix.Rotation(ang, 4, 'Z') @ Vector((0, 1, 0))).dot(nv) < 0:
        ob.matrix_world = Matrix.Translation(a + nv * (T / 2)) @ Matrix.Rotation(ang, 4, 'Z') @ Matrix.Scale(-1, 4, Vector((0, 1, 0)))
    return ob

def blinds(pa, pb, normal, outward):
    """Jendela berkerai di dinding luar (pa–pb) + cahaya tajam dari luar → bayangan garis di lantai."""
    a, b = P(*pa), P(*pb); d = (b - a).normalized(); nv = Vector(normal); ov = Vector(outward)
    ln = (b - a).length
    z = 0.12
    while z < H - 0.45:
        ob = R.box(c, 'bilah kerai', 0, ln, -0.03, 0.03, -0.003, 0.003, M['blind'])
        ob.matrix_world = Matrix.Translation(a + nv * 0.14 + Vector((0, 0, z))) @ Matrix.Rotation(math.atan2(d.y, d.x), 4, 'Z') @ Matrix.Rotation(math.radians(32), 4, 'X')
        z += 0.09
    gl = R.box(c, 'kotak cahaya', 0, ln + 1.0, -0.03, 0.03, -0.2, H + 0.4, M['glow'])
    gl.matrix_world = Matrix.Translation(a - d * 0.5 + ov * 2.6) @ Matrix.Rotation(math.atan2(d.y, d.x), 4, 'Z')
    m = (a + b) / 2
    R.spot(c, 'cahaya tajam', tuple(m + ov * 5.0 + d * 2.0 + Vector((0, 0, 2.8))), tuple(m - ov * 3.6 - d * 0.8), 16000, SUN, size=0.02, ang=48, blend=.1)

# ---------------------------------------------------------------- lantai, plafon, dinding luar (persegi sketsa 52..528 × 48..638)
x0 = P(52, 638); x1 = P(528, 48)
B('lantai', x0.x - 0.3, x1.x + 0.3, x0.y - 0.3, x1.y + 0.3, -0.1, 0, M['floor'])
B('plafon', x0.x - 0.3, x1.x + 0.3, x0.y - 0.3, x1.y + 0.3, H, H + 0.15, M['white'])
# dinding luar dengan bukaan jendela (kerai) di selatan ruang besar & di utara
wall((52, 638), (300, 638), M['beige']); wall((420, 638), (528, 638), M['beige'])
B('ambang jendela bawah', P(300, 638).x, P(420, 638).x, P(300, 638).y - T / 2, P(300, 638).y + T / 2, H - 0.4, H, M['beige'])
blinds((300, 638), (420, 638), (0, 1, 0), (0, -1, 0))
wall((52, 48), (110, 48), M['beige']); wall((230, 48), (528, 48), M['beige'])
B('ambang jendela atas', P(110, 48).x, P(230, 48).x, P(110, 48).y - T / 2, P(110, 48).y + T / 2, H - 0.4, H, M['beige'])
blinds((110, 48), (230, 48), (0, -1, 0), (0, 1, 0))
wall((52, 48), (52, 638), M['beige']); wall((528, 48), (528, 638), M['beige'])

# ---------------------------------------------------------------- dinding dalam (sketsa)
wall((290, 145), (290, 476), M['cream'])          # dinding tengah
wall((52, 476), (443, 476), M['beige'])           # dinding bawah (ruang besar)
wall((290, 300), (443, 300), M['beige'])          # sekat kanan
wall((177, 237), (290, 237), M['beige'])          # sekat kiri atas
wall((177, 362), (290, 362), M['beige'])          # sekat kiri bawah

# ---------------------------------------------------------------- isi tiap ruang (arsitektur + cahaya)
# RUANG BESAR (Lobi): fokus sisi kiri — dinding kiri mauve + panel krem berdiri bebas + pilar; cahaya kerai dari selatan
face((52, 600), (52, 500), (1, 0, 0), M['mauve'], h=H, off=0.0)
pa, pb = P(70, 590), P(70, 512)
B('panel fitur', pa.x + 0.9, pa.x + 1.1, pb.y, pa.y, 0, H - 0.6, M['cream'])
B('led panel', pa.x + 1.1, pa.x + 1.12, pb.y, pa.y, H - 0.62, H - 0.6, M['led'])
pp = P(120, 520); B('pilar mauve', pp.x - 0.38, pp.x + 0.38, pp.y - 0.38, pp.y + 0.38, 0, H, M['mauve'])
for py in (530, 575): q = P(70, py); downlight(q.x + 1.55, q.y, (q.x + 1.12, q.y, 0.9), 210, ang=60, blend=.2)
for px in (180, 300, 420):
    q = P(px, 557); downlight(q.x, q.y, energy=90)
R.area(c, 'isi ruang besar', tuple(P(290, 557) + Vector((0, 0, H - 0.05))), (0, 0, 0), 6.0, 3.0, 120, SOFT)
# KANAN BAWAH (Ruang keluarga): dinding tengah krem + panel fitur + kolom walnut tipis
face((290, 470), (290, 310), (1, 0, 0), M['cream'], h=2.7)
wash((290, 460), (290, 320), (1, 0, 0), 2, 190)
q = P(290, 330); B('kolom walnut', q.x + 0.11, q.x + 0.5, q.y - 0.2, q.y + 0.2, 0, H, M['walnut'])
R.area(c, 'isi keluarga', tuple(P(366, 388) + Vector((0, 0, H - 0.05))), (0, 0, 0), 3.0, 3.0, 60, SOFT)
# KANAN ATAS (Ruang biliar): balok walnut di plafon + dinding terakota disorot
face((290, 295), (290, 150), (1, 0, 0), M['terra'], h=H, off=0.0)
wash((290, 290), (290, 155), (1, 0, 0), 3, 210)
for py in range(160, 300, 14):
    a_, b_ = P(292, py), P(441, py); B('balok', a_.x, b_.x, a_.y - 0.05, a_.y + 0.05, H - 0.16, H, M['walnut'])
# ATAS: ujung dinding tengah (dikitari kamera) — muka ujung disorot
q = P(290, 145); downlight(q.x, q.y + 0.9, (q.x, q.y + 0.1, 1.0), 220, ang=55, blend=.2)
for px in (150, 290, 430):
    q = P(px, 96); downlight(q.x, q.y, energy=80)
# KIRI ATAS (Kamar tidur): pita kepala ranjang + sorot
face((290, 160), (290, 230), (-1, 0, 0), M['band'], h=1.2)
wash((290, 160), (290, 230), (-1, 0, 0), 2, 180)
# KIRI TENGAH (Ruang marmer): panel marmer berdiri + cahaya di celah
face((290, 248), (290, 352), (-1, 0, 0), M['glow_w'], h=H - 0.7, off=0.0, z0=0.25)
qa, qb = P(290, 250), P(290, 350); B('panel marmer', qa.x - 0.75, qa.x - 0.6, qb.y, qa.y, 0, H - 0.5, M['marble'])
wash((275, 252), (275, 348), (-1, 0, 0), 2, 190)
# KIRI BAWAH (Bar): dinding arang + rak bercahaya + walnut bergaris tipis
face((290, 372), (290, 470), (-1, 0, 0), M['char'], h=H, off=0.0)
for (pa_, pb_) in (((290, 380), (290, 420)), ((290, 428), (290, 466))):
    a_, b_ = P(*pa_), P(*pb_)
    B('rak bercahaya', a_.x - 0.13, a_.x - 0.11, b_.y, a_.y, 0.85, 2.8, M['glow_w'])
    for z in (0.85, 1.5, 2.15, 2.78): B('ambalan', a_.x - 0.42, a_.x - 0.11, b_.y, a_.y, z, z + 0.025, M['walnut'])
for py in (395, 445): q = P(240, py); downlight(q.x, q.y, (q.x + 1.5, q.y, 1.2), 110, ang=46)
# koridor kiri & kanan: downlight
for py in (180, 300, 420):
    q = P(115, py); downlight(q.x, q.y, energy=70)
for py in (180, 300, 420, 520):
    q = P(486, py); downlight(q.x, q.y, energy=70)

sc.world = bpy.data.worlds.new('gelap')
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass

# ---------------------------------------------------------------- jalur kamera dari sketsa (cam 1…7)
#  yaw: 90° = menghadap kiri (barat), 180° = bawah, 270° = kanan (timur). Disusun berurutan (tanpa lompatan sudut).
KEYS = [((240, 550), 90), ((498, 550), 90), ((498, 400), 90), ((498, 177), 90), ((470, 85), 125), ((385, 80), 150),
        ((290, 78), 180), ((190, 80), 210), ((115, 95), 240), ((90, 206), 270), ((90, 348), 270), ((90, 440), 270)]
pts = [(P(*p), math.radians(y)) for p, y in KEYS]
# panjang tiap ruas: jarak + putaran (putaran diberi waktu agar tidak terburu-buru)
w_ = []
for (a, ya), (b, yb) in zip(pts, pts[1:]): w_.append((b - a).length + abs(yb - ya) * 2.2)
NF = int(arg('nf', 300))
tot = sum(w_)
def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
def cam_pose(f):
    f = f % NF; s = tot * f / NF; i = 0
    while i < len(w_) - 1 and s > w_[i]: s -= w_[i]; i += 1
    t = min(1.0, s / w_[i])
    p0 = pts[max(0, i - 1)][0]; p1 = pts[i][0]; p2 = pts[i + 1][0]; p3 = pts[min(len(pts) - 1, i + 2)][0]
    p = catmull(p0, p1, p2, p3, t)
    ys = [y for _, y in pts]
    yaw = catmull(ys[max(0, i - 1)], ys[i], ys[i + 1], ys[min(len(ys) - 1, i + 2)], t)
    return Vector((p.x, p.y, 0)), yaw
ROOMS = [(0, 'Lobi'), (0.27, 'Ruang keluarga'), (0.37, 'Ruang biliar'), (0.52, 'Lorong atas'), (0.66, 'Kamar tidur'), (0.84, 'Ruang marmer'), (0.94, 'Bar')]

cd = bpy.data.cameras.new('kamera'); cd.lens = float(arg('lens', 24)); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
CAM_Z = float(arg('camz', 1.4))
def cam_at(f):
    p, yaw = cam_pose(f); cam.location = (p.x, p.y, CAM_Z); cam.rotation_euler = (math.radians(90), 0, yaw)

R.color_management(sc, float(arg('exposure', 1.0)), float(arg('wb', 4300)))
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
R.cycles(sc, SAMPLES)
json.dump({'n': NF, 'rooms': [[int(r * NF), n] for r, n in ROOMS]}, open(os.path.join(OUT, 'rooms.json'), 'w'))
print('[galery7] %d frame, panjang jalur %.1f m' % (NF, sum((b - a).length for (a, _), (b, _) in zip(pts, pts[1:]))))

if arg('export'):
    dst = os.path.join(R.ROOT, 'assets', 'galeri', 'g7'); os.makedirs(dst, exist_ok=True)
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
    print('[galery7] ekspor: %s (%.1f MB), %d frame, %d lampu' % (glb, os.path.getsize(glb) / 1e6, NF, len(lights)))
elif arg('seq'):
    sd = os.path.join(OUT, 'seq'); os.makedirs(sd, exist_ok=True)
    rng = [int(v) for v in str(arg('range', '0:%d:1' % NF)).split(':')]
    for k in range(*rng):
        cam_at(k); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(sd, '%03d' % k), webp=False)
        print('[galery7] frame %d/%d %.1f s' % (k + 1, NF, time.time() - t0), flush=True)
else:
    for s_ in str(arg('shots', '0,30,60,110,140,170,200,240,280')).split(','):
        cam_at(float(s_)); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s_))), webp=False)
        print('[galery7] frame %s %.1f s' % (s_, time.time() - t0), flush=True)
