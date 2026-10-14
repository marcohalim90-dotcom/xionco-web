# ==========================================================================
#  XIONCO — render foto produk di Blender (Cycles)
#  blender -b --factory-startup -P render.py -- --glb <file.glb> --out <folder>
#          [--views 34,front,side,detail] [--size 1600x1200] [--samples 128]
#          [--look dark|ivory] [--hdri <file.hdr>] [--force] [--png]
#
#  • GLB dari export.js (skala meter, depan glTF +Z → Blender -Y, lantai z = 0)
#  • Studio: dinding cyclorama melengkung (gelap hangat XIONCO / ivory), HDRI CC0 untuk
#    cahaya lingkungan & pantulan, lampu kunci area lembut kanan-depan, lampu rim belakang,
#    bayangan kontak alami di lantai. Warna: AgX.
#  • Kamera tetap di depan; OBJEK yang diputar per tampilan (3/4, depan, samping) sehingga
#    latar & cahaya selalu konsisten. Kamera dibingkai otomatis dari batas objek.
#  • Hasil: <out>/<view>.webp + .jpg (dan .png bila --png). Tampilan yang .webp-nya sudah
#    ada dilewati (bisa dilanjutkan) kecuali --force.
# ==========================================================================
import bpy, sys, os, math, time
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if '--' + name in argv:
        i = argv.index('--' + name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
GLB = arg('glb')
OUT = arg('out')
VIEWS = [v for v in str(arg('views', '34,front,side,detail')).split(',') if v]
SIZE = [int(v) for v in str(arg('size', '1600x1200')).lower().split('x')]
SAMPLES = int(arg('samples', 128))
LOOK = str(arg('look', 'dark'))
HDRI = arg('hdri', 'studio_small_09_2k.hdr')
FORCE = bool(arg('force', False))
KEEP_PNG = bool(arg('png', False))
SHEEN = float(arg('sheen', 0.3))          # pengali kilau serat velvet (extras.sheen dari situs)
VT = arg('transform', 'AgX')               # AgX (bawaan) atau Filmic / Standard
LOOKNAME = arg('lookname', None)
if not GLB or not OUT:
    print('pakai: blender -b -P render.py -- --glb file.glb --out folder'); sys.exit(2)
os.makedirs(OUT, exist_ok=True)
todo = [v for v in VIEWS if FORCE or not os.path.exists(os.path.join(OUT, v + '.webp'))]
if not todo:
    print('[render] semua tampilan sudah ada, dilewati:', OUT); sys.exit(0)

# warna latar (sRGB) per tampilan studio
LOOKS = {
    'dark':  {'wall': (0.078, 0.066, 0.056), 'rough': 0.5, 'hdri': 0.25, 'key': 1.0, 'rim': 0.9},
    'ivory': {'wall': (0.83, 0.80, 0.75),    'rough': 0.7, 'hdri': 0.45, 'key': 0.85, 'rim': 0.5},
}
L = LOOKS.get(LOOK, LOOKS['dark'])
def srgb2lin(c):
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)

# ---------------------------------------------------------------- adegan kosong + impor
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.abspath(GLB))
objs = [o for o in sc.objects if o.type == 'MESH']
if not objs:
    print('[render] GLB tanpa mesh:', GLB); sys.exit(3)
# satu induk untuk diputar
pivot = bpy.data.objects.new('XIONCO_pivot', None); sc.collection.objects.link(pivot)
for o in sc.objects:
    if o.parent is None and o is not pivot:
        mw = o.matrix_world.copy(); o.parent = pivot; o.matrix_world = mw

def bounds():
    bpy.context.view_layer.update()
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, p.x), min(lo.y, p.y), min(lo.z, p.z))); hi = Vector((max(hi.x, p.x), max(hi.y, p.y), max(hi.z, p.z)))
    return lo, hi
lo, hi = bounds()
# letakkan di lantai, tengah (pivot tetap di titik asal agar putaran mengelilingi pusat objek)
off = Matrix.Translation(Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)))
for o in pivot.children:
    o.matrix_world = off @ o.matrix_world
lo, hi = bounds()
size = hi - lo
R = max(size.x, size.y, size.z)
print('[render] objek %.2f x %.2f x %.2f m' % (size.x, size.y, size.z))

# ---------------------------------------------------------------- material: info tambahan dari export.js (extras)
for m in bpy.data.materials:
    if not m.use_nodes: continue
    bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    try:
        sh = float(m.get('sheen', 0) or 0)
        if sh > 0 and 'Sheen Weight' in bsdf.inputs:     # velvet / chenille / kain berbulu halus
            bsdf.inputs['Sheen Weight'].default_value = min(1.0, sh * SHEEN)
            bsdf.inputs['Sheen Roughness'].default_value = float(m.get('sheenRoughness', 0.5))
            hx = str(m.get('sheenColor', '#ffffff')).lstrip('#')
            if len(hx) == 6 and 'Sheen Tint' in bsdf.inputs:
                c = tuple(int(hx[i:i + 2], 16) / 255 for i in (0, 2, 4))
                bsdf.inputs['Sheen Tint'].default_value = (c[0], c[1], c[2], 1.0)
    except Exception as e:
        print('  (sheen dilewati:', m.name, e, ')')

# ---------------------------------------------------------------- studio: cyclorama melengkung
def cyclorama(width, depth, height, radius, col, rough):
    prof = []   # (y, z) dari depan ke belakang: lantai → lengkung → dinding
    prof.append((-depth, 0.0)); prof.append((depth * 0.25, 0.0))
    for i in range(1, 17):
        a = i / 16 * math.pi / 2
        prof.append((depth * 0.25 + math.sin(a) * radius, radius - math.cos(a) * radius))
    prof.append((depth * 0.25 + radius, height))
    verts, faces = [], []
    for x in (-width / 2, width / 2):
        for (y, z) in prof: verts.append((x, y, z))
    n = len(prof)
    for i in range(n - 1): faces.append((i, i + 1, n + i + 1, n + i))
    me = bpy.data.meshes.new('cyclorama'); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new('cyclorama', me); sc.collection.objects.link(ob)
    mat = bpy.data.materials.new('cyclorama'); mat.use_nodes = True
    b = mat.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*srgb2lin(col), 1.0)
    b.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = 0.35
    ob.data.materials.append(mat)
    return ob
cyclorama(max(14, R * 9), max(6, R * 4), max(7, R * 4), max(1.6, R * 1.1), L['wall'], L['rough'])

# ---------------------------------------------------------------- HDRI (CC0, assets/library/hdri)
world = bpy.data.worlds.new('XIONCO'); sc.world = world; world.use_nodes = True
nt = world.node_tree; nt.nodes.clear()
hp = HDRI if os.path.isabs(str(HDRI)) else os.path.join(ROOT, 'assets', 'library', 'hdri', str(HDRI))
bg = nt.nodes.new('ShaderNodeBackground'); out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(bg.outputs[0], out.inputs[0])
if os.path.exists(hp):
    env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hp)
    mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
    mp.inputs['Rotation'].default_value[2] = math.radians(-60)   # softbox ke kanan-depan
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], env.inputs[0]); nt.links.new(env.outputs[0], bg.inputs[0])
    bg.inputs['Strength'].default_value = L['hdri']
else:
    print('[render] HDRI tidak ada, latar abu-abu:', hp)
    bg.inputs['Color'].default_value = (0.05, 0.045, 0.04, 1); bg.inputs['Strength'].default_value = 1

# ---------------------------------------------------------------- lampu (relatif ukuran objek)
def area(name, loc, size, energy, color=(1, 1, 1), spread=180):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'DISK'; ld.size = size; ld.energy = energy; ld.color = color
    try: ld.spread = math.radians(spread)   # sorot terarah: objek terang, latar meredup ke tepi
    except Exception: pass
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
    tgt = Vector((0, 0, size_z * 0.45)); d = tgt - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob
size_z = size.z
k = max(1.0, R / 1.6)
EK = float(arg('light', 1.25))   # pengali terang lampu (uji: --light 0.7)
area('key', (2.4 * k, -2.8 * k, 3.0 * k), 2.6 * k, 100 * k * k * L['key'] * EK, (1.0, 0.95, 0.88), 75)
area('rim', (-2.6 * k, 2.4 * k, 2.6 * k), 2.0 * k, 55 * k * k * L['rim'] * EK, (0.92, 0.95, 1.0), 90)
area('fill', (-3.2 * k, -2.2 * k, 1.4 * k), 3.0 * k, 18 * k * k * EK, (1.0, 0.97, 0.93))

# ---------------------------------------------------------------- kamera
cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = SIZE[0], SIZE[1]; sc.render.resolution_percentage = 100
cam_d.sensor_fit = 'HORIZONTAL'; cam_d.sensor_width = 36
VIEW = {   # putar objek (derajat, + = sisi kanan objek menghadap kamera), elevasi kamera, lensa, isi bingkai
    '34':     {'rot': 32, 'el': 13, 'lens': 60, 'fill': 0.80},
    'front':  {'rot': 0, 'el': 7, 'lens': 70, 'fill': 0.82},
    'side':   {'rot': 90, 'el': 7, 'lens': 70, 'fill': 0.80},
    'detail': {'rot': 26, 'el': 18, 'lens': 90, 'fill': 1.0, 'detail': True},
}
def corners(lo, hi):
    return [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
def frame(view):
    v = VIEW.get(view, VIEW['34'])
    pivot.rotation_euler = (0, 0, math.radians(v['rot']))
    lo, hi = bounds()
    el = math.radians(v['el']); cam_d.lens = v['lens']
    fwd = Vector((0, math.cos(el), -math.sin(el)))                    # kamera menghadap +Y, sedikit menunduk
    right = Vector((1, 0, 0)); up = right.cross(fwd).normalized()
    aspect = SIZE[0] / SIZE[1]
    tw = (cam_d.sensor_width / 2) / cam_d.lens; th = tw / aspect
    if v.get('detail'):
        # detail: sudut depan-atas sisi kanan (lengan / tepi / pegangan), ±40% lebar objek, ruang tajam sempit
        s = hi - lo
        # titik permukaan nyata: sinar dari depan ke beberapa titik (sudut kanan-atas dulu, lalu ke tengah)
        # sampai mengenai objek — kursi / kaki ramping tidak meleset ke ruang kosong
        dg = bpy.context.evaluated_depsgraph_get()
        tgt = None
        for fx, fz in ((0.84, 0.78), (0.75, 0.7), (0.66, 0.62), (0.84, 0.55), (0.5, 0.7), (0.5, 0.5), (0.35, 0.6), (0.5, 0.3)):
            aim = Vector((lo.x + s.x * fx, lo.y, lo.z + s.z * fz))
            hit, loc, *_ = sc.ray_cast(dg, aim - fwd * (R * 3), fwd)
            if hit: tgt = loc; break
        if tgt is None: tgt = (lo + hi) / 2
        span = max(0.45, min(s.x, s.z) * 0.75)
        dist = span / 2 / th
        cam.location = tgt - fwd * dist
        cam.rotation_euler = fwd.to_track_quat('-Z', 'Y').to_euler()
        cam_d.dof.use_dof = True; cam_d.dof.focus_distance = dist; cam_d.dof.aperture_fstop = 8.0
        return
    cam_d.dof.use_dof = False
    ctr = (lo + hi) / 2; ctr.z = lo.z + (hi.z - lo.z) * 0.47
    pts = corners(lo, hi)
    def fits(d):
        c = ctr - fwd * d
        for p in pts:
            q = p - c; z = q.dot(fwd)
            if z <= 0.05: return False
            if abs(q.dot(right)) / z > tw * v['fill'] or abs(q.dot(up)) / z > th * v['fill']: return False
        return True
    a, b = 0.2, 200.0
    for _ in range(60):
        m = (a + b) / 2
        if fits(m): b = m
        else: a = m
    cam.location = ctr - fwd * b
    cam.rotation_euler = fwd.to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- Cycles + GPU bila ada
sc.render.engine = 'CYCLES'
cy = sc.cycles
dev = 'CPU'
try:
    pr = bpy.context.preferences.addons['cycles'].preferences
    for t in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
        try:
            pr.compute_device_type = t
        except Exception:
            continue
        pr.get_devices()
        gpus = [d for d in pr.devices if d.type == t]
        if gpus:
            for d in pr.devices: d.use = d.type == t
            cy.device = 'GPU'; dev = t + ' (' + ', '.join(d.name for d in gpus) + ')'
            break
except Exception as e:
    print('[render] deteksi GPU gagal:', e)
cy.samples = SAMPLES
cy.use_adaptive_sampling = True
cy.use_denoising = True
try: cy.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
cy.max_bounces = 8; cy.diffuse_bounces = 3; cy.glossy_bounces = 3; cy.transparent_max_bounces = 8
sc.render.film_transparent = False
vs = sc.view_settings
for vt in (VT, 'AgX', 'Filmic'):
    try: vs.view_transform = vt; break
    except Exception: pass
for lk in ([LOOKNAME] if LOOKNAME else []) + ['AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Base Contrast', 'None']:
    try: vs.look = lk; break
    except Exception: pass
vs.exposure = 0.0
print('[render] warna:', vs.view_transform, '/', vs.look)
print('[render] perangkat:', dev, '| sampel', SAMPLES, '|', SIZE[0], 'x', SIZE[1], '| tampilan', ','.join(todo))

# ---------------------------------------------------------------- render per tampilan
img_set = sc.render.image_settings
def save(path, fmt, **kw):
    img_set.file_format = fmt
    for k2, v2 in kw.items(): setattr(img_set, k2, v2)
    bpy.data.images['Render Result'].save_render(filepath=path, scene=sc)
total = time.time()
for view in todo:
    t0 = time.time()
    frame(view)
    bpy.ops.render.render(write_still=False)
    base = os.path.join(OUT, view)
    save(base + '.png', 'PNG', color_mode='RGB', color_depth='8', compression=15)
    save(base + '.jpg', 'JPEG', color_mode='RGB', quality=92)
    try:
        save(base + '.webp', 'WEBP', color_mode='RGB', quality=90)
    except Exception as e:
        print('[render] WebP tidak didukung Blender ini, hanya PNG/JPG:', e)
        os.replace(base + '.png', base + '.webp.png')
    if not KEEP_PNG and os.path.exists(base + '.png'): os.remove(base + '.png')
    print('[render] %s/%s  %.1f s' % (os.path.basename(OUT.rstrip('/\\')), view, time.time() - t0), flush=True)
print('[render] selesai %d tampilan dalam %.1f s' % (len(todo), time.time() - total))
