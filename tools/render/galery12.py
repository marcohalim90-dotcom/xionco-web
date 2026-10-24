# ==========================================================================
#  XIONCO — Galeri v12 (DITIMPA sesuai arahan pemilik 22 Okt; versi baru hanya bila pemilik minta)
#   • denah & kamera dari sketsa v11, seluruh denah DIPERKECIL (0,04 m/piksel, dulu 0,05) → furnitur lebih terlihat
#   • plafon super tinggi 4,8 m · lampu sorot TERFOKUS (kerucut sempit, tepi tegas); Room 2: pencuci dinding rata
#   • warna per ruang di SEMUA dinding & lantai; Room 2–5 dinding berlapis (maju–mundur), Room 1 tidak
#   • Room 1 (lobi): dinding biru tua kiri–belakang–kanan, panel dinding (kiri) + lemari buku built-in penuh rak,
#     LED 3500K tiap rak, isi buku/teko/cawan (rapi), tanaman daun bulat di sudut, tirai beige di kiri, meja eksekutif
#     biru tua (kaca 8 mm tepi hijau, 2 kaki pilar bergaris), lampu meja sorot perunggu, buku terbuka, tumpukan buku,
#     laptop, mouse, cangkir; kursi eksekutif beige membelakangi rak; lantai kayu cokelat muda serat halus;
#     2 sofa miring (black cherry & beige + 1 bantal black cherry), karpet hampir seluruh ruang; banyak bayangan kontras
#   • Room 2: KYRIOS L super besar, dalam lega, abu tua, kaki emas
#  Arsitektur + furnitur, TANPA render (3D langsung). --check · --export · --shots
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

OUT = arg('out', os.path.join(R.ROOT, 'output', 'galeri', 'galery12'))
SIZE = [int(v) for v in str(arg('size', '960x540')).lower().split('x')]
SAMPLES = int(arg('samples', 24))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
c = bpy.data.collections.new('galery12'); sc.collection.children.link(c)
Kx = float(arg('kx', 0.032)); Ky = float(arg('ky', 0.04))         # meter per piksel: timur–barat dipendekkan (bangunan terlalu panjang)
H = 4.8; T = 0.2
WARM = R.kelvin(3000); K35 = R.kelvin(3500); SOFT = R.kelvin(3500); SUN = R.kelvin(4300)
def P(px, py): return Vector(((px - 42) * Kx, (606 - py) * Ky, 0))
def X(px): return (px - 42) * Kx
def Y(py): return (606 - py) * Ky
B = lambda *a, **k: R.box(c, *a, **k)

# ---------------------------------------------------------------- bahan
def wallmat(name, hexc): return R.tex_mat(name, 'acg-Plaster001', 2.0, tint=hexc, rmul=1.05, nstr=0.45, hsv=(0.5, 0.0, 1.25))   # plester halus (ambientCG CC0)
def fab(name, hexc, tset='fabric-linen', sc_=0.3, sheen=0.4): return R.tex_mat(name, tset, sc_, tint=hexc, rough=0.92, nstr=0.9, sheen=sheen, hsv=(0.5, 0.0, 1.45))
def floor_stone(name, hexc): return R.add_grout(R.tex_mat(name, 'room-floor-concrete', 3.0, tint=hexc, rough=0.3, coat=0.12, nstr=0.1, hsv=(0.5, 0.2, 1.3), mute=0.8), w=1.2, h=1.2, gap=0.0014, col_hex='#b5aa9b', offset=0.0)
M = {
    'floor':   floor_stone('lantai koridor', '#d6cabb'),
    'beige':   wallmat('plester krem', '#ddcfbd'),
    'white':   R.tex_mat('plafon putih', 'room-wall-limewash', 3.0, tint='#efe9e0', rough=0.9, nstr=0.15),
    'walnut':  R.tex_mat('walnut', 'ph-smoked_walnut_veneer', 1.3, tint='#7a5238', rmul=0.8, nstr=0.4, rot=90, coat=0.1),
    'stone':   R.tex_mat('batu travertine', 'stone-travertine', 1.2, tint='#e6dccd', rough=0.45),
    'blind':   R.flat_mat('kerai', '#e2d8ca', 0.7),
    'glow':    R.emit_mat('cahaya belakang tirai', R.kelvin(5200), 1.4),
    'led':     R.emit_mat('led lis', R.kelvin(2900), 16.0),
    'led35':   R.emit_mat('led rak 3500K', R.kelvin(3500), 9.0),
    'led30':   R.emit_mat('led rak 4000K', R.kelvin(4000), 26.0),           # LED rak 4000K, lebih terang (permintaan pemilik)
    'dl':      R.emit_mat('downlight', R.kelvin(3000), 40.0),
    'rim':     R.flat_mat('bingkai downlight', '#d8d2c8', 0.4),
    'bronze':  R.flat_mat('perunggu', '#6e4a2c', 0.32, 1.0),
    'brass':   R.flat_mat('kuningan', '#b8894a', 0.28, 1.0),
    'black':   R.flat_mat('baja hitam', '#1b1a19', 0.4, 0.85),
}

# ---------------------------------------------------------------- lampu (TERFOKUS: kerucut sempit, tepi tegas)
def downlight(x, y, aim=None, energy=180, ang=32, blend=.12, color=WARM):
    B('cincin dl', x - 0.05, x + 0.05, y - 0.05, y + 0.05, H - 0.006, H, M['rim'])
    B('cakram dl', x - 0.032, x + 0.032, y - 0.032, y + 0.032, H - 0.008, H - 0.006, M['dl'])
    R.spot(c, 'sorot', (x, y, H - 0.03), aim or (x, y, 0), energy * (H / 3.4) ** 1.3, color, size=0.008, ang=ang, blend=blend)
def spot_wall_x(xw, side, y, energy=200, z=1.3):
    """Sorot TERFOKUS ke dinding x = xw → berkas sempit bertepi tegas (bukan sebaran lebar)."""
    downlight(xw + side * 0.45, y, (xw, y, z), energy, ang=20, blend=.1)
def spot_wall_y(yw, side, x, energy=200, z=1.3):
    downlight(x, yw + side * 0.45, (x, yw, z), energy, ang=20, blend=.1)
def washer_x(xw, side, y0, y1, energy=420, n=5):
    """Pencuci dinding RATA: celah lampu linear di plafon + deretan n sorot lebar & lembut yang saling tumpang tindih."""
    B('celah washer', min(xw + side * 0.18, xw + side * 0.32), max(xw + side * 0.18, xw + side * 0.32), y0, y1, H - 0.02, H, M['led'])
    for k in range(n):
        y = y0 + (y1 - y0) * (k + 0.5) / n
        R.spot(c, 'washer', (xw + side * 0.32, y, H - 0.05), (xw, y, 0.6), energy / n * 1.6 * (H / 3.4) ** 1.3, WARM, size=0.05, ang=80, blend=.95)

def blinds_or_curtain_y(x0, x1, yw, inward, curtain_hex=None, energy=16000):
    """Bukaan di dinding luar y = yw + cahaya tajam dari luar. curtain_hex → tirai berlipit (bukan kerai)."""
    if curtain_hex:
        yi = yw + 0.1 * (1 - inward)                                       # muka dalam dinding
        cm = R.sheer_mat('tirai ' + curtain_hex, curtain_hex, opacity=0.92); cm['alpha'] = 1.0
        for a_, b_ in ((x0 - 0.45, x0 + 0.25), (x1 - 0.25, x1 + 0.45)):    # tirai TERBUKA: terkumpul di kiri & kanan jendela
            R.curtain(c, 'tirai', yi + inward * 0.2, a_, b_, 0.02, H - 0.1, cm, folds_per_m=14, depth=0.06, axis='x')
        R.curtain(c, 'vitrase', yi + inward * 0.1, x0 - 0.05, x1 + 0.05, 0.02, H - 0.1, R.sheer_mat('vitrase', '#efe9df', opacity=0.42), folds_per_m=7, depth=0.03, axis='x')
        B('rel tirai', x0 - 0.5, x1 + 0.5, yi + inward * 0.06, yi + inward * 0.28, H - 0.05, H, M['black'])
        fy0, fy1 = yw - 0.02, yw + 0.02                                    # kusen baja hitam tipis (seperti referensi)
        for xx in [x0 + (x1 - x0) * k / 6 for k in range(7)]: B('kusen tegak', xx - 0.02, xx + 0.02, fy0, fy1, 0, H - 0.3, M['black'])
        for zz in (0.0, 2.9, H - 0.34): B('kusen datar', x0, x1, fy0, fy1, zz, zz + 0.04, M['black'])
        B('kotak cahaya', x0 - 0.5, x1 + 0.5, yw - inward * 2.65, yw - inward * 2.6, -0.2, H + 0.4, M['glow'])
        # cahaya siang lewat vitrase: lampu area besar (render) + pengganti lembut untuk 3D langsung (dihapus saat render)
        R.area(c, 'cahaya siang jendela', ((x0 + x1) / 2, yi + inward * 0.35, (H - 0.3) / 2), (math.radians(90 * inward), 0, 0), x1 - x0, H - 0.5, float(arg('win', 2600)), R.kelvin(4800), spread=160)
        for k in range(4):
            xx = x0 + (x1 - x0) * (k + 0.5) / 4
            o = R.spot(c, 'cahaya jendela (3D langsung)', (xx, yi + inward * 0.25, 3.4), (xx + 0.6, yi + inward * 4.2, 0.0), 420, R.kelvin(4800), size=1.0, ang=150, blend=1.0)
            o['live'] = True
        return
    else:
        z = 0.12
        while z < H - 0.45:
            ob = R.box(c, 'bilah kerai', x0, x1, -0.03, 0.03, -0.003, 0.003, M['blind'])
            ob.location = (0, yw + inward * 0.14, z); ob.rotation_euler.x = math.radians(32 * inward); z += 0.09
    B('kotak cahaya', x0 - 0.5, x1 + 0.5, yw - inward * 2.65, yw - inward * 2.6, -0.2, H + 0.4, M['glow'])
    xm = (x0 + x1) / 2
    R.spot(c, 'cahaya tajam', (xm - 2.2, yw - inward * 5.0, 3.2), (xm - 0.9, yw + inward * 3.4, 0), energy, SUN, size=0.02, ang=44, blend=.1)

# ---------------------------------------------------------------- perangkat furnitur
def put(pid, x, y, rot=0.0, z=0.018, **kw):
    piv, obs = R.place(c, pid, (x, y, z), rot, **kw); return piv, obs
def rug(cx, cy, w, d, hexc, tset='ph-poly_wool_herringbone', rot=0.0, hsv=(0.5, 0.2, 1.3), sheen=0.5):
    ob = B('karpet', -w / 2, w / 2, -d / 2, d / 2, 0, 0.018, R.tex_mat('karpet ' + hexc, tset, 0.4, tint=hexc, rough=0.97, nstr=1.0, sheen=sheen, hsv=hsv), bevel=0.008)
    ob.location = (cx, cy, 0); ob.rotation_euler.z = math.radians(rot); return ob
def pillows(x, y, z, rot, hexes, step=0.42, axis='y'):
    for k, hx in enumerate(hexes):
        off = (k - (len(hexes) - 1) / 2) * step
        px, py = (x, y + off) if axis == 'y' else (x + off, y)
        p, po = R.place(c, 'throw_pillows_01', (px, py, z), rot + (k * 9 - 6), fit=('z', 0.38), pick='pillow01' if k % 2 == 0 else 'pillow02')
        R.recolor(po, fab('bantal ' + hx, hx, 'ph-velour_velvet', 0.3, 0.8))
def throw(x, y, z, rot, hexc, w=0.55, l=1.3):
    ob = R.box(c, 'selendang', -w / 2, w / 2, -l / 2, l / 2, 0, 0.025, fab('selendang ' + hexc, hexc, 'fabric-woven', 0.25, 0.5), bevel=0.01)
    ob.location = (x, y, z); ob.rotation_euler = (0, math.radians(8), math.radians(rot))
def pot(x, y, hexc='#cfc0ab', r=0.26, h=0.5):
    return R.pot(c, 'pot', x, y, r, r * 0.8, h, R.tex_mat('pot ' + hexc, 'ph-white_plaster_02', 0.5, tint=hexc, rough=0.7, nstr=0.6, hsv=(0.5, 0.2, 1.2)))
def clad_x(xf, side, ya, yb, mat, z0=0.0, z1=None, t=0.03):
    return B('pelapis', xf if side > 0 else xf - t, xf + t if side > 0 else xf, min(ya, yb), max(ya, yb), z0, z1 or H - 0.02, mat)
def clad_y(yf, side, xa, xb, mat, z0=0.0, z1=None, t=0.03):
    return B('pelapis', min(xa, xb), max(xa, xb), yf if side > 0 else yf - t, yf + t if side > 0 else yf, z0, z1 or H - 0.02, mat)
def floor_rect(x0_, x1_, y0_, y1_, mat):
    B('lantai ruang', min(x0_, x1_), max(x0_, x1_), min(y0_, y1_), max(y0_, y1_), -0.1, 0.003, mat)

# ---------------------------------------------------------------- lantai, plafon, tembok luar
x0, x1, y0, y1 = X(42), X(442), Y(606), Y(62)
B('lantai', x0 - 0.3, x1 + 0.3, y0 - 0.3, y1 + 0.3, -0.1, 0, M['floor'])
B('plafon', x0 - 0.3, x1 + 0.3, y0 - 0.3, y1 + 0.3, H, H + 0.15, M['white'])
NAVY = '#2c3b4d'; NAVYM = wallmat('biru tua', NAVY)                    # Blue Fantastic (referensi pemilik)
DEEP = '#1b2632'                                                      # Abyssal Anchorfish Blue → badan lemari
wx0, wx1 = X(70), X(215)                                              # jendela kiri lobi BESAR (tirai beige + vitrase) = cahaya utama
B('tembok selatan kiri', x0 - T, wx0, y0 - T, y0, 0, H, NAVYM); B('tembok selatan kanan', wx1, x1 + T, y0 - T, y0, 0, H, M['beige'])
B('ambang selatan', wx0, wx1, y0 - T, y0, H - 0.3, H, NAVYM)
blinds_or_curtain_y(wx0, wx1, y0 - 0.1, +1, curtain_hex='#d9ccb6')
nx0, nx1 = X(250), X(330)                                             # jendela atas (di belakang kamera 5)
B('tembok utara kiri', x0 - T, nx0, y1, y1 + T, 0, H, M['beige']); B('tembok utara kanan', nx1, x1 + T, y1, y1 + T, 0, H, M['beige'])
B('ambang utara', nx0, nx1, y1, y1 + T, H - 0.6, H, M['beige']); blinds_or_curtain_y(nx0, nx1, y1 + 0.1, -1)
B('tembok barat', x0 - T, x0, y0, y1, 0, H, M['beige'])
B('tembok timur', x1, x1 + T, y0, y1, 0, H, M['beige'])

# ---------------------------------------------------------------- tembok dalam (bentuk sketsa)
XS = X(230); xe = XS + T / 2; xw = XS - T / 2
B('dinding tengah', XS - T / 2, XS + T / 2, Y(443), Y(145), 0, H, M['beige'])
B('dinding T', X(150), X(312), Y(145) - T / 2, Y(145) + T / 2, 0, H, M['beige'])
B('sekat kanan', XS, X(350), Y(268) - T / 2, Y(268) + T / 2, 0, H, M['beige'])
B('sekat kiri', X(140), XS, Y(293) - T / 2, Y(293) + T / 2, 0, H, M['beige'])
B('dinding bawah', X(42), X(320), Y(443) - T / 2, Y(443) + T / 2, 0, H, M['beige'])

# ==========================================================================
#  ROOM 1 · LOBI — ruang kerja eksekutif (biru tua + beige, aksen black cherry)
# ==========================================================================
BEIGE, CHERRY = '#d9ccba', '#6e141c'                                  # black cherry: merah tua kecokelatan (tidak keunguan)
L1y0, L1y1 = Y(606), Y(443) - T / 2                                   # selatan … utara lobi
L1x1 = X(260)                                                         # zona ruang kerja (barat)
floor_rect(x0, X(320), L1y0, L1y1, R.tex_mat('lantai kayu cokelat muda', 'room-floor-oakwide', 1.6, tint='#c79f78', rmul=0.8, nstr=0.35, hsv=(0.5, 0.6, 1.35), coat=0.1))

clad_y(Y(443) - T / 2, -1, x0, X(320), NAVYM)                         # kanan (utara)
clad_y(L1y0, +1, wx1, X(320), NAVYM)                                  # kiri (selatan) di kanan jendela
# dinding belakang biru tua TEBAL 0,45 m; lemari buku built-in masuk ke ceruknya; panel moulding di muka dinding (kiri)
pw0, pw1 = L1y0 + 0.35, L1y0 + 2.05
FW = 0.45                                                             # tebal dinding palsu = dalam lemari
B('panel dinding', x0 + FW, x0 + FW + 0.03, pw0, pw1, 0.15, H - 0.5, NAVYM)
for (za, zb) in ((0.35, 1.25), (1.45, H - 0.7)):
    for side_ in (0, 1):
        ya = pw0 + 0.12 if side_ == 0 else (pw0 + pw1) / 2 + 0.06; yb = (pw0 + pw1) / 2 - 0.06 if side_ == 0 else pw1 - 0.12
        for (aa, bb, cc, dd) in ((ya, yb, za, za + 0.03), (ya, yb, zb - 0.03, zb), (ya, ya + 0.03, za, zb), (yb - 0.03, yb, za, zb)):
            B('moulding', x0 + FW + 0.03, x0 + FW + 0.055, aa, bb, cc, dd, NAVYM)
bc0, bc1, bcd, bch = L1y0 + 2.25, L1y1 - 0.3, 0.42, 3.9
B('dinding tebal kiri', x0, x0 + FW, L1y0, bc0, 0, H, NAVYM)
B('dinding tebal kanan', x0, x0 + FW, bc1, L1y1, 0, H, NAVYM)
B('dinding tebal atas lemari', x0, x0 + FW, bc0, bc1, bch + 0.06, H, NAVYM)
BOOKB = wallmat('biru tua rak', DEEP)
def tex_plane_x(name, x, ya, yb, za, zb, mat):
    """Bidang menghadap +x dengan UV (0..1) — untuk panel cahaya belakang rak."""
    me = bpy.data.meshes.new(name); me.from_pydata([(x, ya, za), (x, yb, za), (x, yb, zb), (x, ya, zb)], [], [(0, 1, 2, 3)]); me.update()
    uv = me.uv_layers.new(name='UVMap')
    for li, (uu, vv) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = (uu, vv)
    ob = bpy.data.objects.new(name, me); c.objects.link(ob); me.materials.append(mat); return ob
GLOWP = os.path.join(R.ROOT, 'tools', 'render', 'art', 'glow-rak.png')
GLOWM = bpy.data.materials.new('cahaya panel rak'); _nt = GLOWM.node_tree; _b = _nt.nodes.get('Principled BSDF')
_t = _nt.nodes.new('ShaderNodeTexImage'); _t.image = bpy.data.images.load(GLOWP); _t.extension = 'EXTEND'
_b.inputs['Base Color'].default_value = R.srgb('#121820'); _b.inputs['Roughness'].default_value = 0.9
_nt.links.new(_t.outputs['Color'], _b.inputs['Emission Color']); _b.inputs['Emission Strength'].default_value = 2.2; GLOWM['img'] = GLOWP
B('rak belakang', x0 + 0.03, x0 + 0.06, bc0, bc1, 0, bch, BOOKB)
ncol = 3; colw = (bc1 - bc0) / ncol; CABH = 0.8
B('kabinet bawah', x0 + 0.06, x0 + bcd, bc0, bc1, 0, CABH, BOOKB)               # pintu rata tertutup
gapm = R.flat_mat('celah pintu', '#0c1117', 0.8)
for k_ in range(ncol * 2 + 1):
    yy = bc0 + k_ * colw / 2; B('celah pintu', x0 + bcd, x0 + bcd + 0.004, yy - 0.003, yy + 0.003, 0.06, CABH - 0.03, gapm)
B('celah atas kabinet', x0 + bcd, x0 + bcd + 0.004, bc0, bc1, CABH - 0.035, CABH - 0.03, gapm)
for k_ in range(ncol + 1):
    yy = bc0 + k_ * colw; B('tiang rak', x0, x0 + bcd + 0.01, yy - 0.03, yy + 0.03, 0, bch, BOOKB)
import random
rnd = random.Random(7)
def soft(ob, lv=2):
    """Bentuk empuk berlekuk: subdivisi saat render (viewport/ekspor 0 → GLB tetap ringan)."""
    md = ob.modifiers.new('lembut', 'SUBSURF'); md.levels = 0; md.render_levels = lv
    for p_ in ob.data.polygons: p_.use_smooth = True
    return ob
# ---- BUKU ASLI (Poly Haven book_encyclopedia_set_01, CC0): 20 buku kulit bertulisan emas, dipakai ulang (mesh dibagi)
from mathutils import Matrix
SKF = os.path.join(R.ROOT, 'data', 'source', 'render-lib', 'sketchfab')   # model CC-BY (Objaverse), kredit di CREDITS.json
def skf(name): return os.path.join(SKF, name, name + '.glb')
def tag(objs, key):
    for o in objs:
        o[key] = True
        for ch in o.children_recursive: ch[key] = True
def mats_of(objs, name):
    return [sl for o in objs for sl in o.material_slots if sl.material and sl.material.name.startswith(name)]
def principled(m): return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
def recolor_dark(m, hexc, lo=0.16, hi=0.3):
    """Ubah bagian GELAP tekstur (kulit hitam) jadi warna hexc, bagian terang (krom) tetap — detail tekstur & normal tetap."""
    nt = m.node_tree; b = principled(m); lk = b.inputs['Base Color'].links
    if not lk: b.inputs['Base Color'].default_value = R.srgb(hexc); return m
    src = lk[0].from_socket
    bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(src, bw.inputs['Color'])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = lo; mr.inputs['From Max'].default_value = hi
    mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = 0.0; nt.links.new(bw.outputs['Val'], mr.inputs['Value'])
    ma = nt.nodes.new('ShaderNodeMath'); ma.operation = 'MULTIPLY_ADD'; ma.inputs[1].default_value = 3.2; ma.inputs[2].default_value = 0.62
    nt.links.new(bw.outputs['Val'], ma.inputs[0])
    vs = nt.nodes.new('ShaderNodeVectorMath'); vs.operation = 'SCALE'; vs.inputs[0].default_value = R.srgb(hexc)[:3]; nt.links.new(ma.outputs[0], vs.inputs['Scale'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; nt.links.new(mr.outputs['Result'], mx.inputs['Factor'])
    nt.links.new(src, mx.inputs['A']); nt.links.new(vs.outputs['Vector'], mx.inputs['B']); nt.links.new(mx.outputs['Result'], b.inputs['Base Color'])
    m['flat'] = hexc; return m
_BOOKS = []
def _book_src():
    if _BOOKS: return _BOOKS
    piv, obs = R.place(c, 'book_encyclopedia_set_01', (0, 0, -80), 0)
    bpy.context.view_layer.update()
    for o in obs:
        me = o.data.copy(); me.transform(o.matrix_world.to_3x3().normalized().to_4x4())   # orientasi dunia, tanpa skala/posisi
        vs = [v.co for v in me.vertices]
        lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
        ext = hi - lo; order = sorted(range(3), key=lambda i: ext[i])                 # tebal < dalam < tinggi
        _BOOKS.append({'me': me, 'lo': lo, 'hi': hi, 't': order[0], 'd': order[1], 'h': order[2], 'ext': ext})
    for o in obs + [piv]: bpy.data.objects.remove(o, do_unlink=True)
    return _BOOKS
_bv = {}
def book_var(m, k):
    """Varian warna sampul (0 asli cokelat, 1 hampir hitam, 2 taupe/krem, 3 biru tua) — huruf emas tetap terbaca."""
    if m is None or 'cover' not in m.name.lower(): return m
    key = (m.name, k)
    if key in _bv: return _bv[key]
    m2 = m.copy(); nt = m2.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    lk = b.inputs['Base Color'].links
    if lk:
        src = lk[0].from_socket; hs = nt.nodes.new('ShaderNodeHueSaturation')
        hs.inputs['Hue'].default_value, hs.inputs['Saturation'].default_value, hs.inputs['Value'].default_value = {0: (0.5, 0.7, 0.8), 1: (0.5, 0.3, 0.38), 2: (0.5, 0.3, 1.55), 3: (0.03, 0.55, 0.42)}[k]
        nt.links.new(src, hs.inputs['Color']); nt.links.new(hs.outputs['Color'], b.inputs['Base Color'])
    m2['flat'] = {0: '#4a3428', 1: '#2a2420', 2: '#a8957a', 3: '#2a3346'}[k]; _bv[key] = m2; return m2
SPINE = float(arg('spine', -1))                                         # +1/-1: punggung buku menghadap keluar rak
def put_book(bk, pos, rot_cols, s_, var):
    """rot_cols: arah dunia untuk sumbu (tebal, dalam, tinggi) buku. pos = titik tengah-bawah buku di dunia."""
    Rm = Matrix.Identity(3)
    for ax, key in zip(rot_cols, ('t', 'd', 'h')):
        for r_ in range(3): Rm[r_][bk[key]] = ax[r_]
    if Rm.determinant() < 0:
        for r_ in range(3): Rm[r_][bk['t']] *= -1
    ctr = (bk['lo'] + bk['hi']) / 2; ctr[bk['h']] = bk['lo'][bk['h']] if Rm[2][bk['h']] > 0 else bk['hi'][bk['h']]
    if rot_cols[2][2] == 0:                                                # buku rebah: titik bawah = sisi tebal
        ctr[bk['t']] = bk['lo'][bk['t']] if Rm[2][bk['t']] > 0 else bk['hi'][bk['t']]
    M_ = Matrix.Translation(Vector(pos)) @ (Rm.to_4x4() @ Matrix.Scale(s_, 4)) @ Matrix.Translation(-ctr)
    ob = bpy.data.objects.new('buku', bk['me']); c.objects.link(ob); ob.matrix_world = M_
    for sl in ob.material_slots:
        m0 = sl.material; sl.link = 'OBJECT'; sl.material = book_var(m0, var)
    return ob
def books(ya, yb, zb, xd=0.08):
    """Deret buku tegak, punggung menghadap +x; varian warna per kelompok (seperti set)."""
    B_ = _book_src(); y = ya; var = rnd.choice((0, 1, 2, 3)); run = rnd.randint(3, 7)
    while True:
        bk = rnd.choice(B_); s_ = rnd.uniform(1.15, 1.42); tk = bk['ext'][bk['t']] * s_
        if y + tk > yb: break
        put_book(bk, (x0 + 0.06 + bk['ext'][bk['d']] * s_ / 2, y + tk / 2, zb), ((0, 1, 0), (SPINE, 0, 0), (0, 0, 1)), s_, var)
        y += tk + 0.0015; run -= 1
        if run <= 0: var = rnd.choice((0, 1, 2, 3)); run = rnd.randint(3, 7)
def hstack(ya, yb, zb, n=3, xc=None, rotz=0.0):
    """Tumpukan buku rebah; kembali: tinggi atas tumpukan."""
    B_ = _book_src(); z = zb; yc = (ya + yb) / 2; xc = x0 + 0.21 if xc is None else xc
    for k_ in range(n):
        bk = rnd.choice(B_); s_ = rnd.uniform(1.15, 1.35); a_ = math.radians(rotz + rnd.uniform(-4, 4))
        put_book(bk, (xc, yc, z), ((0, 0, 1), (math.cos(a_), math.sin(a_), 0), (-math.sin(a_), math.cos(a_), 0)), s_, rnd.choice((0, 1, 2)))
        z += bk['ext'][bk['t']] * s_ + 0.001
    return z
BOOKC = ['#2a2f3a', '#3b3530', '#6b5540', '#8c7356', '#c9b99a', '#4a3a2c', '#1f2733', '#a08a6a', '#d8ccb4']
_bm = {}
def bookmat(hx):
    if hx not in _bm: _bm[hx] = R.flat_mat('buku ' + hx, hx, 0.8)
    return _bm[hx]
CER = R.tex_mat('keramik gelap', 'ph-clay_plaster', 0.5, tint='#3a3735', rough=0.72, nstr=1.0, hsv=(0.5, 0.3, 1.2))
CER2 = R.tex_mat('keramik batu', 'x-batu-travertine-003', 0.6, tint='#5d5750', rough=0.8, nstr=1.0)
CER3 = R.tex_mat('keramik krem', 'ph-clay_plaster', 0.5, tint='#ddd3c3', rough=0.3, nstr=0.5, coat=0.4)
NROW = 5; shelves = [CABH + k_ * (bch - CABH) / NROW for k_ in range(NROW + 1)]
for z in shelves[1:]: B('ambalan', x0, x0 + bcd + 0.01, bc0, bc1, z - 0.045, z, BOOKB)
def vessel(xc, yc, zb, r, mat):
    R.sphere(c, 'guci', (xc, yc, zb + r * 0.85), r, mat, sz=0.85)
    R.cyl(c, 'leher guci', xc, yc, zb + r * 1.55, zb + r * 1.95, r * 0.42, mat)
def bowl(xc, yc, zb, r, mat):
    R.sphere(c, 'mangkuk', (xc, yc, zb + 0.01), r, mat, sz=0.38)
GRID = [['bv', 'b', 'v'], ['v', 'bv', 'b'], ['b', 'sb', 'tp'], ['bv', 'b', 'v'], ['sb', 'v', 'b']]   # bawah → atas, rapi
for zi in range(NROW):
    zb, zt = shelves[zi] + (0.0 if zi == 0 else 0.0), shelves[zi + 1] - 0.045
    for col in range(ncol):
        ya, yb = bc0 + col * colw + 0.03, bc0 + (col + 1) * colw - 0.03
        tex_plane_x('panel cahaya rak', x0 + 0.062, ya, yb, zb, zt, GLOWM)              # cahaya hangat memudar ke bawah
        B('led rak', x0 + bcd - 0.06, x0 + bcd - 0.035, ya, yb, zt - 0.012, zt - 0.002, M['led30'])   # LED strip di tiap rak
        ym = (ya + yb) / 2; t_ = GRID[zi][col]
        if t_ == 'b': books(ya + 0.02, yb - 0.02, zb)
        elif t_ == 'bv': books(ya + 0.02, ym + 0.05, zb); vessel(x0 + 0.21, yb - 0.22, zb, 0.12, CER)
        elif t_ == 'v':                                                # guci gelap / pot keramik glasir (Poly Haven) + mangkuk kayu ukir (Poly Haven)
            if col == 1: R.place(c, 'ceramic_pot', (x0 + 0.21, ym - 0.12, zb), rnd.uniform(0, 360), fit=('z', 0.24))
            else: vessel(x0 + 0.21, ym - 0.12, zb, 0.15, CER)
            R.place(c, 'wooden_bowl_01', (x0 + 0.22, yb - 0.18, zb), rnd.uniform(0, 360), fit=('x', 0.24))
        elif t_ == 'sb': zt_ = hstack(ya + 0.1, ya + 0.4, zb); vessel(x0 + 0.21, ya + 0.25, zt_, 0.07, CER); books(ym + 0.1, yb - 0.02, zb)
        else:                                                          # teko keramik + cawan
            R.sphere(c, 'teko', (x0 + 0.21, ym - 0.12, zb + 0.09), 0.09, CER3, sz=0.85)
            R.cyl(c, 'cerat', x0 + 0.21, ym - 0.24, zb + 0.08, zb + 0.13, 0.012, CER3)
            bowl(x0 + 0.21, ym + 0.16, zb, 0.1, CER)
# tanaman daun bulat di sudut (calathea orbifolia)
ph_ = pot(x0 + FW + 0.45, L1y0 + 0.55, '#cdbfa9', 0.3, 0.5); R.place(c, 'calathea_orbifolia_01', (x0 + FW + 0.45, L1y0 + 0.55, ph_ - 0.04), 20, fit=('z', 1.25), pick='_a')
# meja kerja eksekutif: badan biru tua, daun kaca 8 mm tepi hijau, 2 kaki pilar bergaris (flute) — membelakangi rak
dx0, dx1 = x0 + 1.35, x0 + 2.25; dy0, dy1 = (bc0 + bc1) / 2 - 1.15, (bc0 + bc1) / 2 + 1.15
glass = R.flat_mat('kaca 8mm tepi hijau', '#7fa391', 0.05, 0.0, spec=1.0)
B('daun kaca 8 mm', dx0, dx1, dy0, dy1, 0.742, 0.75, glass)
B('rangka daun biru', dx0 + 0.03, dx1 - 0.03, dy0 + 0.03, dy1 - 0.03, 0.70, 0.742, NAVYM)
for yc in (dy0 + 0.35, dy1 - 0.35):
    R.cyl(c, 'kaki pilar', (dx0 + dx1) / 2, yc, 0, 0.70, 0.17, NAVYM, seg=64)
    for k_ in range(20):                                               # garis (flute) di pilar
        a_ = 2 * math.pi * k_ / 20
        R.box(c, 'rusuk', -0.006, 0.006, -0.006, 0.006, 0.02, 0.68, NAVYM).location = ((dx0 + dx1) / 2 + math.cos(a_) * 0.172, yc + math.sin(a_) * 0.172, 0)
# di atas meja: lampu sorot perunggu, buku terbuka, tumpukan buku, laptop, mouse, cangkir
tz = 0.75; mx = (dx0 + dx1) / 2
_dl, _dlo = R.place(c, skf('desk_lamp'), (dx0 + 0.3, dy1 - 0.32, tz), 90, fit=('z', 0.44))   # banker lamp kuningan (CC-BY)
R.spot(c, 'lampu meja', (dx0 + 0.36, dy1 - 0.32, tz + 0.3), (dx0 + 0.55, dy1 - 0.5, tz), 90, R.kelvin(2900), size=0.01, ang=60, blend=.4)
hstack(dy0 + 0.2, dy0 + 0.42, tz, 3, xc=dx0 + 0.3, rotz=8)
hstack(dy0 + 0.5, dy0 + 0.66, tz, 2, xc=dx0 + 0.3, rotz=-12)
pg = R.flat_mat('halaman buku', '#efe7d8', 0.8)
for sgn in (-1, 1):                                                   # buku terbuka (dua halaman sedikit terangkat)
    ob = R.box(c, 'halaman', -0.13, 0.13, 0 if sgn > 0 else -0.17, 0.17 if sgn > 0 else 0, 0, 0.012, pg); ob.location = (mx + 0.05, (dy0 + dy1) / 2 - 0.35, tz); ob.rotation_euler = (math.radians(6 * sgn), 0, math.radians(90))
lap = R.flat_mat('aluminium laptop', '#5b5d60', 0.35, 0.8)
R.place(c, skf('macbook'), (mx - 0.02, (dy0 + dy1) / 2 + 0.22, tz + 0.001), 97, fit=('x', 0.304))   # MacBook tertutup (CC-BY)
R.box(c, 'mouse', -0.03, 0.03, -0.05, 0.05, 0, 0.03, R.flat_mat('mouse', '#2b2b2c', 0.5), bevel=0.012).location = (mx + 0.05, (dy0 + dy1) / 2 + 0.5, tz)
R.cyl(c, 'cangkir', mx + 0.25, dy0 + 0.75, tz, tz + 0.09, 0.04, R.flat_mat('cangkir', '#ece5d8', 0.3))
# kursi eksekutif: model "Executive Office Chair" (subhashssimon, CC-BY) — besar & tegas, kulit diubah beige, menghadap meja (+x)
_ec, _eco = R.place(c, skf('exec_chair'), (x0 + 0.95, (dy0 + dy1) / 2, 0.0), 90, fit=('z', 1.3))
for sl in mats_of(_eco, ''):
    if not sl.material.get('_rc'): recolor_dark(sl.material, '#cdbda3'); sl.material['_rc'] = 1
# karpet hampir seluruh ruang + 2 sofa miring
rug(x0 + FW + (L1x1 - x0 - FW) / 2 + 0.1, (L1y0 + L1y1) / 2, (L1x1 - x0 - FW) - 0.9, (L1y1 - L1y0) - 1.4, '#e0cfb2', tset='acg-Carpet016', hsv=(0.5, 0.5, 1.05), sheen=0.08)
def arc_block(name, cx, cy, ri, ro, a0, a1, z0, z1, mat, seg=28, bevel=0.04):
    """Blok lengkung (sektor cincin) — sandaran melingkar."""
    v = []
    for k_ in range(seg + 1):
        a_ = a0 + (a1 - a0) * k_ / seg; ca, sa = math.cos(a_), math.sin(a_)
        v += [(cx + ri * ca, cy + ri * sa, z0), (cx + ro * ca, cy + ro * sa, z0), (cx + ro * ca, cy + ro * sa, z1), (cx + ri * ca, cy + ri * sa, z1)]
    f = []
    for k_ in range(seg):
        a, b_ = 4 * k_, 4 * (k_ + 1)
        for q in range(4): f.append((a + q, a + (q + 1) % 4, b_ + (q + 1) % 4, b_ + q))
    f += [(3, 2, 1, 0), (4 * seg, 4 * seg + 1, 4 * seg + 2, 4 * seg + 3)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update(); me.validate()
    ob = bpy.data.objects.new(name, me); c.objects.link(ob); me.materials.append(mat)
    for p_ in me.polygons: p_.use_smooth = True
    md = ob.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 4; md.limit_method = 'ANGLE'
    return ob
def round_bevel(ob, w):
    md = ob.modifiers.new('bevel', 'BEVEL'); md.width = w; md.segments = 5; md.limit_method = 'ANGLE'; return ob
def small_sofa(cx, cy, face_deg, hexc, tset, cushion=None):
    """Sofa kecil bulat (model "Sofa Chair", PatelDev, CC-BY): dudukan bulat, sandaran melingkar. face_deg = arah hadap (0 = timur, 90 = utara)."""
    piv, obs = R.place(c, skf('sofa_chair'), (cx, cy, 0.0), face_deg + 90, fit=('x', 0.95))
    fm = fab('sofa ' + hexc, hexc, tset, 0.22, 0.08)
    def kind(m):                                                       # kenali bagian dari warna bahan asli (nama bisa bentrok antar model)
        col = principled(m).inputs['Base Color'].default_value
        if col[1] > col[0] + 0.03 and max(col[:3]) < 0.3: return 'kain'
        if min(col[:3]) > 0.95: return 'bantal'
        return 'kaki'
    for o in list(obs):
        ks = {kind(sl.material) for sl in o.material_slots if sl.material}
        if 'bantal' in ks:
            if cushion:
                for sl in o.material_slots: sl.material = fab('bantal ' + cushion, cushion, 'acg-Fabric030', 0.25, 0.3)
            else: bpy.data.objects.remove(o, do_unlink=True)
            continue
        for sl in o.material_slots:
            if sl.material: sl.material = fm if kind(sl.material) == 'kain' else M['brass']
    return piv
dcy = (dy0 + dy1) / 2
# dinding kanan lobi (biru tua): kabinet rendah + pigura + 2 sorot terfokus → geser kamera tidak melihat dinding gelap kosong
cab, cabo = put('gliza-tv-cabinet-stand', X(250), L1y1 - 0.26, 180, z=0.0)
R.place(c, 'ceramic_vase_03', (X(250) - 0.7, L1y1 - 0.26, R.top_of(cabo)), 0, fit=('z', 0.34))
R.place(c, 'brass_vase_01', (X(250) + 0.6, L1y1 - 0.26, R.top_of(cabo)), 0, fit=('z', 0.3))
NZY = L1y1 - 0.03; ND = 0.2                                         # muka dinding utara, dalam ceruk
acx, aw, ah = x0 + 3.2, 1.8, 2.7                                      # ceruk lengkung di belakang sofa beige
lay = B('lapisan dinding ceruk', x0 + FW, x0 + 5.05, NZY - ND, NZY, 0, H, NAVYM)
cut1 = R.box(c, 'potong', acx - aw / 2, acx + aw / 2, NZY - ND - 0.2, NZY + 0.05, -0.1, ah, M['black'])
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=aw / 2, depth=ND + 0.5, location=(acx, NZY - ND / 2, ah), rotation=(math.pi / 2, 0, 0))
cut2 = bpy.context.active_object
for ct in (cut1, cut2):
    md = lay.modifiers.new('ceruk', 'BOOLEAN'); md.object = ct; md.operation = 'DIFFERENCE'; md.solver = 'EXACT'
bpy.context.view_layer.update(); _ev = lay.evaluated_get(bpy.context.evaluated_depsgraph_get())
_me = bpy.data.meshes.new_from_object(_ev); lay.modifiers.clear(); lay.data = _me
for ct in (cut1, cut2): bpy.data.objects.remove(ct, do_unlink=True)
MIR = R.flat_mat('cermin antik', '#d6cfc2', 0.035, 1.0); MIR['flat'] = '#9a9284'; MIR['metal'] = 0.25; MIR['rough'] = 0.22   # 3D langsung: kaca gelap berkilau
def disc_y(name, x, y, z, r, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=r, depth=depth, location=(x, y, z), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.active_object; ob.name = name
    for cl in ob.users_collection: cl.objects.unlink(ob)
    c.objects.link(ob); ob.data.materials.append(mat); return ob
disc_y('bingkai cermin', acx, NZY - 0.012, 2.05, 0.64, 0.024, M['brass'])
disc_y('cermin bulat', acx, NZY - 0.02, 2.05, 0.615, 0.024, MIR)
SHADE = R.emit_mat('kap lampu dinding', R.kelvin(2700), 5.0)
for sx in (acx - aw / 2 - 0.5, acx + aw / 2 + 0.5):                    # lampu dinding kuningan (seperti referensi)
    yf = NZY - ND
    _wl, _wlo = R.place(c, skf('wall_light'), (sx, yf - 0.13, 1.72), 0, fit=('x', 0.56))   # lampu dinding kuningan 2 kap (CC-BY)
    _wl.location.y = yf - _wl['size'][1] / 2
    R.spot(c, 'lampu dinding bawah', (sx, yf - 0.16, 1.88), (sx, yf - 0.6, 0), 120, R.kelvin(2700), size=0.12, ang=165, blend=1.0)   # cahaya lembut, bukan kerucut
    R.spot(c, 'lampu dinding atas', (sx, yf - 0.16, 2.14), (sx, yf - 0.2, H), 80, R.kelvin(2700), size=0.12, ang=150, blend=1.0)
def painting_y(xc, yw, zc, w, h, path):
    """Lukisan kanvas besar di dinding utara (muka ke -y), bingkai perunggu tipis. Teksturnya ikut ke ekspor 3D langsung."""
    m = bpy.data.materials.new('lukisan'); nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85; m['img'] = path
    y = yw - 0.09; xa, xb, za, zb = xc - w / 2, xc + w / 2, zc - h / 2, zc + h / 2
    me = bpy.data.meshes.new('kanvas'); me.from_pydata([(xa, y, za), (xb, y, za), (xb, y, zb), (xa, y, zb)], [], [(0, 1, 2, 3)]); me.update()
    uv = me.uv_layers.new(name='UVMap')
    for li, (uu, vv) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = (uu, vv)
    ob = bpy.data.objects.new('kanvas lukisan', me); c.objects.link(ob); me.materials.append(m)
    B('bingkai lukisan', xa - 0.025, xb + 0.025, y + 0.002, yw - 0.03, za - 0.025, zb + 0.025, M['bronze'])
painting_y(X(250), L1y1, 2.05, 2.7, 1.8, os.path.join(R.ROOT, 'tools', 'render', 'art', 'lukisan-lobi.jpg'))
B('lampu lukisan', X(250) - 0.45, X(250) + 0.45, L1y1 - 0.2, L1y1 - 0.15, 3.03, 3.07, M['brass'])
B('lengan lampu lukisan', X(250) - 0.01, X(250) + 0.01, L1y1 - 0.2, L1y1 - 0.03, 3.07, 3.09, M['brass'])
R.spot(c, 'lampu lukisan', (X(250), L1y1 - 0.2, 3.0), (X(250), L1y1, 1.6), 90, R.kelvin(2900), size=0.3, ang=100, blend=.9)
small_sofa(x0 + 3.2, dcy - 1.3, 90, CHERRY, 'acg-Fabric030')                  # selatan, menghadap utara
small_sofa(x0 + 3.2, dcy + 1.3, -90, BEIGE, 'acg-Fabric084', cushion=CHERRY)          # utara, menghadap selatan, 1 bantal black cherry
# cahaya Room 1: terfokus & kontras (rak berLED, sorot ke panel & sofa, lampu meja, cahaya tirai)
downlight(x0 + FW + 0.9, L1y0 + 0.55, (x0 + FW + 0.45, L1y0 + 0.55, 0.9), 200, ang=18, blend=.1)   # dinding tanaman: 1 sorot terfokus
downlight((dx0 + dx1) / 2, (dy0 + dy1) / 2, ((dx0 + dx1) / 2, (dy0 + dy1) / 2, tz), 150, ang=34, blend=.35)   # sorot ke-2 (maks. 2 di Room 1)
# lampu meja samping sofa beige (kap putih, seperti referensi) — cahaya lembut
stx, sty = x0 + 3.2 + 0.9, dcy + 1.3 + 0.35
_mt, _mto = R.place(c, 'coffee_table_round_01', (stx, sty, 0.0), 0, fit=('x', 0.58)); _mt.scale.z *= 0.55 / _mt['size'][2]   # tinggi meja samping 55 cm           # meja samping marmer (Poly Haven CC0)
_t1 = R.sphere(c, 'kaki lampu meja', (stx, sty, 0.52 + 0.14), 0.14, R.flat_mat('keramik abu', '#4a4d52', 0.35), sz=1.1)
_t2 = R.cyl(c, 'kap lampu meja', stx, sty, 0.86, 1.12, 0.17, R.emit_mat('kap putih menyala', R.kelvin(2800), 6.0), seg=48)
tag([_t1, _t2], 'live')                                                      # pengganti ringan untuk 3D langsung
_tl, _tlo = R.place(c, skf('table_lamp'), (stx, sty, R.top_of(_mto)), 0, fit=('z', 0.66)); tag([_tl] + _tlo, 'render')
for sl in mats_of(_tlo, 'PBR_Body'): sl.material = R.tex_mat('keramik lampu', 'ph-clay_plaster', 0.3, tint='#3b3d41', rough=0.18, nstr=0.3, coat=0.6)
for sl in mats_of(_tlo, 'Shade.001'): sl.material = M['brass']
for sl in mats_of(_tlo, 'Shade'):
    if sl.material.name.startswith('Shade') and not sl.material.name.startswith('Shade.001'):
        _sm = sl.material; _b = principled(_sm); _b.inputs['Base Color'].default_value = R.srgb('#e9dfcf')
        _b.inputs['Emission Color'].default_value = R.kelvin(2800) + (1.0,); _b.inputs['Emission Strength'].default_value = 1.2
R.point(c, 'lampu meja samping', (stx, sty, R.top_of(_mto) + 0.48), 150, R.kelvin(2800), size=0.12)
R.area(c, 'isi lobi', (X(260), (L1y0 + L1y1) / 2, H - 0.05), (0, 0, 0), 4.0, 3.0, 60, R.kelvin(3200))
R.area(c, 'isi lobi barat', (x0 + 2.2, (L1y0 + L1y1) / 2, H - 0.05), (0, 0, 0), 3.0, 4.0, 40, R.kelvin(3200))
# lampu plafon BIASA untuk penerangan umum (bukan sorot): 6 lampu bulat rata plafon, cahaya lebar — daya disetel pemilik (--gen)
GEN = float(arg('gen', 35)); GENK = R.kelvin(float(arg('genk', 3000)))   # netral → dinding tetap terbaca biru
for gx in (x0 + 1.9, x0 + 4.6, x0 + 7.3):
    for gy in (L1y0 + 1.6, L1y1 - 1.6):
        R.cyl(c, 'lampu plafon', gx, gy, H - 0.03, H, 0.24, M['rim'], seg=48)
        R.cyl(c, 'lampu plafon menyala', gx, gy, H - 0.035, H - 0.03, 0.2, R.emit_mat('lampu plafon', GENK, 6.0), seg=48)
        R.point(c, 'lampu plafon', (gx, gy, H - 0.3), GEN, GENK, size=0.3)

# profil dinding minimalis senada (referensi pemilik): plint 12 cm, list dado, bingkai panel, list plafon bertingkat
def prof_y(yf, side, xa, xb, z0, z1, d):
    return B('profil', xa, xb, yf if side > 0 else yf - d, yf + d if side > 0 else yf, z0, z1, NAVYM)
def prof_x(xf, side, ya, yb, z0, z1, d):
    return B('profil', xf if side > 0 else xf - d, xf + d if side > 0 else xf, ya, yb, z0, z1, NAVYM)
def frame_y(yf, side, xa, xb, za, zb, w=0.03, d=0.014):
    for a_, b_, c_, e_ in ((xa, xb, za, za + w), (xa, xb, zb - w, zb), (xa, xa + w, za, zb), (xb - w, xb, za, zb)): prof_y(yf, side, a_, b_, c_, e_, d)
def wall_y(yf, side, xa, xb, bays=(), skip=(), dado=True):
    """Satu bidang dinding menghadap ±y: plint, list plafon bertingkat, list dado (kecuali di 'skip'), bingkai panel per bay."""
    segs = [(xa, xb)]
    for sa, sb in skip:
        segs = [q for a_, b_ in segs for q in ((a_, min(b_, sa)), (max(a_, sb), b_)) if q[1] - q[0] > 0.02]
    for a_, b_ in segs:
        prof_y(yf, side, a_, b_, 0.0, 0.12, 0.016)
        if dado: prof_y(yf, side, a_, b_, 1.02, 1.06, 0.02)
    prof_y(yf, side, xa, xb, H - 0.16, H - 0.14, 0.02); prof_y(yf, side, xa, xb, H - 0.1, H, 0.06); prof_y(yf, side, xa, xb, H - 0.04, H, 0.1)
    for a_, b_ in bays: frame_y(yf, side, a_, b_, 0.28, 0.86); frame_y(yf, side, a_, b_, 1.24, H - 0.42)
def wall_x(xf, side, ya, yb, bays=()):
    prof_x(xf, side, ya, yb, 0.0, 0.12, 0.016)
    prof_x(xf, side, ya, yb, H - 0.16, H - 0.14, 0.02); prof_x(xf, side, ya, yb, H - 0.1, H, 0.06); prof_x(xf, side, ya, yb, H - 0.04, H, 0.1)
NF_ = NZY                                                              # utara: kanan ceruk → bidang lukisan dalam satu panel besar
wall_y(NF_, -1, x0 + 5.05, X(320), bays=[(x0 + 5.2, X(320) - 0.25)])
wall_y(NZY - ND, -1, x0 + FW, x0 + 5.05, skip=[(acx - aw / 2, acx + aw / 2)])   # dinding ceruk: polos + plint, dado, list plafon
wall_y(L1y0, +1, wx1, X(320), bays=[(wx1 + 0.2, X(320) - 0.25)])
wall_y(L1y0, +1, x0 + FW, wx0, dado=False)
wall_x(x0 + FW, +1, L1y0, bc0); wall_x(x0 + FW, +1, bc1, L1y1)

# ==========================================================================
#  ROOM 2 · ruang besar kanan (cream + abu tua, aksen rich cognac) — KYRIOS L super besar, kaki emas
# ==========================================================================
CREAM, DGREY, COGNAC = '#e6dccb', '#4a4a4d', '#8a4a24'
r2x0, r2x1, r2y0, r2y1 = xe, X(350), Y(443) + T / 2, Y(268) - T / 2
floor_rect(r2x0, r2x1, r2y0, r2y1, floor_stone('lantai cream ruang 2', '#e2d7c5'))
# dinding berlapis: belakang abu tua dengan ceruk tengah MUNDUR 0,3 m + sayap pelapis maju (cream)
cy0, cy1 = r2y0 + 1.0, r2y1 - 1.0
B('dinding belakang tengah mundur', XS - 0.1 - 0.0, xe, cy0, cy1, 0, H - 0.6, wallmat('abu tua ceruk', DGREY))
clad_x(xe, +1, r2y0, cy0, wallmat('abu tua kiri', DGREY), t=0.32); clad_x(xe, +1, cy1, r2y1, wallmat('abu tua kanan', DGREY), t=0.32)
B('kepala ceruk', xe, xe + 0.32, cy0, cy1, H - 0.6, H, wallmat('abu tua atas', DGREY))
clad_y(r2y0, +1, xe + 0.32, r2x1, wallmat('cream ruang 2', CREAM)); clad_y(r2y1, -1, xe + 0.32, r2x1, wallmat('cream ruang 2 b', CREAM))
B('sayap depan selatan', r2x1 - 0.5, r2x1, r2y0, r2y0 + 0.35, 0, H, wallmat('cream sayap', CREAM))   # lapis depan
B('sayap depan utara', r2x1 - 0.5, r2x1, r2y1 - 0.35, r2y1, 0, H, wallmat('cream sayap b', CREAM))
washer_x(xe + 0.0, +1, cy0 + 0.1, cy1 - 0.1, 520)                     # pencuci dinding LINEAR → rata
rug((r2x0 + r2x1) / 2 + 0.25, (r2y0 + r2y1) / 2, 3.8, 4.6, '#5a5a5d')
# KYRIOS L: bagian panjang menempel ceruk (diperbesar 1,55 × panjang, 1,35 × dalam) + bagian balik (L) di utara
kL, kLo = put('kyrios', xe + 0.35 + 0.62, (cy0 + cy1) / 2 - 0.35, 90)
kL.scale = (1.55, 1.35, 1.0)
R.fabric_upgrade(kLo, DGREY, 'velour' if False else 'fabric-boucle', 0.22, sheen=0.6)
kyc = (cy0 + cy1) / 2 - 0.35                                          # pusat bagian panjang (panjang 1,95 × 1,55 = 3,0 m)
kR, kRo = put('kyrios', xe + 1.5 + 0.83, kyc + 1.51 - 0.58, 0)       # bagian balik L di ujung utara, menghadap selatan
kR.scale = (0.85, 1.35, 1.0)
R.fabric_upgrade(kRo, DGREY, 'fabric-boucle', 0.22, sheen=0.6)
for o in kLo + kRo:
    for s in o.material_slots:
        if s.material and 'brass' in s.material.name.lower(): s.material = M['brass']        # kaki emas
pillows(xe + 0.9, (cy0 + cy1) / 2 - 0.8, 0.46, 90, ['#6e6e70', COGNAC], step=0.7)
throw(xe + 0.95, (cy0 + cy1) / 2 - 1.95, 0.6, 90, COGNAC)
t2, t2o = put('rouled', xe + 2.35, (cy0 + cy1) / 2 - 0.6, 0)
R.place(c, 'ceramic_vase_02', (xe + 2.3, (cy0 + cy1) / 2 - 0.65, R.top_of(t2o)), 0, fit=('z', 0.28))
a2, a2o = put('capra-signature-1s', r2x1 - 0.85, r2y0 + 1.0, -150); R.fabric_upgrade(a2o, COGNAC, 'leather-faux', 0.4, sheen=0.1)
ph_ = pot(r2x1 - 0.85, r2y1 - 0.7, '#4a4a4d', 0.24, 0.45); R.place(c, 'calathea_orbifolia_01', (r2x1 - 0.85, r2y1 - 0.7, ph_ - 0.04), 0, fit=('z', 0.8), pick='_a')
downlight(xe + 2.35, (cy0 + cy1) / 2 - 0.6, (xe + 2.35, (cy0 + cy1) / 2 - 0.6, 0.45), 130, ang=26)
downlight(r2x1 - 0.85, r2y0 + 1.0, (r2x1 - 0.85, r2y0 + 1.0, 0.4), 130, ang=26)

# ==========================================================================
#  ROOM 3 · ruang kecil kanan (beige + greige, aksen dry sage) — dinding berlapis + pajangan sedikit
# ==========================================================================
GREIGE, BEIGE3, SAGE = '#a49c90', '#ddd0bd', '#9caa8a'
r3x0, r3x1, r3y0, r3y1 = xe, X(312), Y(268) + T / 2, Y(145) - T / 2
floor_rect(r3x0, r3x1, r3y0, r3y1, floor_stone('lantai greige ruang 3', '#c9c0b3'))
B('dinding belakang mundur greige', xe, xe + 0.02, r3y0 + 0.7, r3y1 - 0.7, 0, H, wallmat('greige', GREIGE))
clad_x(xe, +1, r3y0, r3y0 + 0.7, wallmat('beige maju', BEIGE3), t=0.28); clad_x(xe, +1, r3y1 - 0.7, r3y1, wallmat('beige maju b', BEIGE3), t=0.28)
clad_y(r3y0, +1, xe + 0.28, r3x1, wallmat('beige ruang 3', BEIGE3)); clad_y(r3y1, -1, xe + 0.28, r3x1, wallmat('beige ruang 3 b', BEIGE3))
for k_, deco in enumerate(('ceramic_vase_03', 'brass_vase_02')):
    yy = r3y0 + 1.4 + k_ * 2.0
    B('alas', xe + 0.6, xe + 1.3, yy - 0.35, yy + 0.35, 0, 0.5, M['stone'], bevel=0.01)
    R.place(c, deco, (xe + 0.95, yy, 0.5), 0, fit=('z', 0.38)); downlight(xe + 0.95, yy, (xe + 0.95, yy, 0.5), 150, ang=24)
ot3, ot3o = put('cubix-series-ottoman-kayu-terang', xe + 1.85, (r3y0 + r3y1) / 2, 15); R.fabric_upgrade(ot3o, SAGE, 'fabric-boucle', 0.22, sheen=0.5)
downlight(xe + 1.85, (r3y0 + r3y1) / 2, (xe + 1.85, (r3y0 + r3y1) / 2, 0.4), 120, ang=26)

# ---------------------------------------------------------------- DINDING PAJANG (sisi utara dinding T, kamera 5)
yN = Y(145) + T / 2
for k_, (a_, b_) in enumerate(((160, 205), (208, 252), (255, 300))):
    xa, xb = X(a_), X(b_)
    B('ceruk batu', xa + 0.1, xb - 0.1, yN, yN + 0.03, 1.0, 3.0, M['stone'])
    B('alas galeri', xa + 0.3, xb - 0.3, yN + 0.25, yN + 0.85, 0, 1.0, M['stone'], bevel=0.01)
    downlight((xa + xb) / 2, yN + 0.55, ((xa + xb) / 2, yN + 0.55, 1.0), 170, ang=24)
q = Vector(((X(160) + X(205)) / 2, yN + 0.55, 0)); put('aether-k40', q.x, q.y, 0, z=1.0)
q = Vector(((X(208) + X(252)) / 2, yN + 0.55, 0)); R.place(c, 'brass_candleholders', (q.x, q.y, 1.0), 0, fit=('z', 0.32))
q = Vector(((X(255) + X(300)) / 2, yN + 0.55, 0)); R.place(c, 'ceramic_vase_04', (q.x, q.y, 1.0), 0, fit=('z', 0.28))

# ==========================================================================
#  ROOM 4 · kiri atas (abu + beige, aksen dark forest green) — dinding berlapis
# ==========================================================================
GREY4, BEIGE4, FOREST = '#9b9a97', '#d6c9b6', '#1f3b2c'
r4x0, r4x1, r4y0, r4y1 = X(140), xw, Y(293) + T / 2, Y(145) - T / 2
floor_rect(r4x0, r4x1, r4y0, r4y1, floor_stone('lantai beige ruang 4', '#d3c7b6'))
B('panel kepala maju', xw - 0.12, xw, r4y0 + 1.0, r4y1 - 1.0, 0, 2.6, wallmat('beige kepala', BEIGE4))
clad_x(xw, -1, r4y0, r4y1, wallmat('abu ruang 4', GREY4))
clad_y(r4y0, +1, r4x0, xw, wallmat('abu ruang 4 s', GREY4)); clad_y(r4y1, -1, r4x0, xw, wallmat('abu ruang 4 n', GREY4))
B('sayap depan', r4x0, r4x0 + 0.45, r4y1 - 0.3, r4y1, 0, H, wallmat('beige sayap 4', BEIGE4))
r4y = (r4y0 + r4y1) / 2
bd, bdo = put('somno', xw - 0.12 - 0.9, r4y, -90); R.fabric_upgrade(bdo, BEIGE4, 'fabric-linen', 0.3)
pillows(xw - 0.5, r4y, 0.55, -90, [FOREST, BEIGE4, FOREST], step=0.42)
throw(xw - 1.45, r4y, 0.58, 0, FOREST, 1.4, 0.55)
for dy in (-1.05, 1.05):
    ns, nso = put('ashara-54-nightstand', xw - 0.42, r4y + dy, -90)
    R.place(c, 'ceramic_vase_04' if dy < 0 else 'book_encyclopedia_set_01', (xw - 0.42, r4y + dy, R.top_of(nso)), 0, fit=('z', 0.22) if dy < 0 else ('x', 0.28))
for yy in (r4y - 0.8, r4y + 0.8): spot_wall_x(xw - 0.12, -1, yy, 190, z=1.8)

# ==========================================================================
#  ROOM 5 · kiri bawah (abu muda + beige kecokelatan, aksen deep charcoal) — dinding berlapis
# ==========================================================================
LGREY, BROWNB, CHAR = '#c9c7c2', '#a48b72', '#2c2c2e'
r5x0, r5x1, r5y0, r5y1 = X(140), xw, Y(443) + T / 2, Y(293) - T / 2
floor_rect(r5x0, r5x1, r5y0, r5y1, floor_stone('lantai abu muda ruang 5', '#cfccc6'))
B('ceruk beige kecokelatan', xw - 0.02, xw, r5y0 + 0.9, r5y1 - 0.9, 0, H, wallmat('beige kecokelatan', BROWNB))
clad_x(xw, -1, r5y0, r5y0 + 0.9, wallmat('abu muda maju', LGREY), t=0.3); clad_x(xw, -1, r5y1 - 0.9, r5y1, wallmat('abu muda maju b', LGREY), t=0.3)
clad_y(r5y0, +1, r5x0, xw - 0.3, wallmat('abu muda 5', LGREY)); clad_y(r5y1, -1, r5x0, xw - 0.3, wallmat('abu muda 5 b', LGREY))
r5y = (r5y0 + r5y1) / 2
rug(xw - 1.35, r5y, 2.4, 3.2, '#d4cfc7')
s5, s5o = put('astral-2-seater', xw - 0.55, r5y, -90); R.fabric_upgrade(s5o, '#cbbfae', 'fabric-linen', 0.3)
pillows(xw - 0.6, r5y, 0.44, -90, [CHAR, LGREY], step=0.5)
o5, o5o = put('astral-ottoman', xw - 1.75, r5y, 0); R.fabric_upgrade(o5o, CHAR, 'fabric-boucle', 0.22, sheen=0.5)
R.place(c, 'hanging_picture_frame_02', (xw - 0.04, r5y, 1.8), -90, fit=('x', 0.9))
for yy in (r5y - 0.9, r5y + 0.9): spot_wall_x(xw - 0.02, -1, yy, 190, z=1.8)
downlight(xw - 1.75, r5y, (xw - 1.75, r5y, 0.4), 120, ang=26)
# koridor
for py in (180, 330): q = P(95, py); downlight(q.x, q.y, energy=90, ang=40)
for py in (180, 330, 420): q = P(398, py); downlight(q.x, q.y, energy=90, ang=40)

sc.world = bpy.data.worlds.new('gelap')
try: sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
except Exception: pass

# ---------------------------------------------------------------- jalur kamera (sketsa v11; skala ikut denah)
def PX(xm, ym): return (42 + xm / Kx, 606 - ym / Ky)                # meter → piksel sketsa (untuk titik kunci dalam meter)
dcy_px = 606 - dcy / Ky
YS = 84.0                                                            # arah pandang awal: ke tengah meja & rak (pilihan pemilik)
_fw = (-math.sin(math.radians(YS)), math.cos(math.radians(YS)))
_c1 = (6.2, 3.85)                                                    # posisi awal: tengah (sofa black cherry kiri, beige kanan)
def _on(d): return PX(_c1[0] + _fw[0] * d, _c1[1] + _fw[1] * d)
KEYS = [(_on(0.0), YS), (_on(-1.5), YS),                             # 1 tengah → mundur LURUS (arah tetap)
        (PX(9.5, 4.0), 85.5), (PX(10.95, 4.65), 88),                 #   lalu bergeser ke koridor, arah pandang hanya bertambah
        ((408, 470), 90), ((408, 395), 90), ((408, 310), 90), ((408, 205), 90),
        ((404, 118), 118), ((392, 92), 140), ((310, 80), 165), ((216, 74), 180), ((122, 80), 197), ((84, 96), 216),
        ((74, 128), 248), ((72, 195), 270), ((72, 357), 270), ((72, 425), 270)]
pts = [(P(*p), math.radians(a)) for p, a in KEYS]
def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
def yaw_mono(i, t):
    """Arah pandang monoton (Hermite Fritsch–Carlson): tidak melewati lalu balik → kamera tidak menoleh kiri-kanan."""
    ys = [q[1] for q in pts]; n = len(ys)
    def tan(k):
        if k == 0 or k == n - 1: return 0.0
        d0, d1 = ys[k] - ys[k - 1], ys[k + 1] - ys[k]
        return 0.0 if d0 * d1 <= 0 else 2 * d0 * d1 / (d0 + d1)
    y0, y1, m0, m1 = ys[i], ys[i + 1], tan(i), tan(i + 1)
    h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
    return h00 * y0 + h10 * m0 + h01 * y1 + h11 * m1
dense = []
for i in range(len(pts) - 1):
    p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(len(pts) - 1, i + 2)]
    for k in range(80):
        t = k / 80; dense.append((catmull(p0[0], p1[0], p2[0], p3[0], t), yaw_mono(i, t)))
dense.append(pts[-1])
dist_ = [0.0] + [(dense[k][0] - dense[k - 1][0]).length for k in range(1, len(dense))]
rate_ = [1.0] + [(dist_[k] + abs(dense[k][1] - dense[k - 1][1]) * float(arg('yawcost', 3.2))) / max(1e-6, dist_[k]) if dist_[k] > 1e-6 else 1.0 for k in range(1, len(dense))]
Wn = int(arg('smooth', 50)); n_ = len(rate_)
pre = [0.0]
for r_ in rate_: pre.append(pre[-1] + r_)
rate_s = [(pre[min(n_, k + Wn + 1)] - pre[max(0, k - Wn)]) / (min(n_, k + Wn + 1) - max(0, k - Wn)) for k in range(n_)]
cost = [0.0]
for k in range(1, len(dense)): cost.append(cost[-1] + dist_[k] * rate_s[k])
TOT = cost[-1]
NF = int(arg('nf', 420))
# INTRO: zoom LENSA di posisi pandang pemilik (sofa & meja tetap di tengah, tanpa menoleh) + sedikit mundur lurus
NZ = int(arg('nz', 0)); ZD = float(arg('zd', 1.1)); LENS = float(arg('lens', 28)); Z0 = float(arg('z0', 1.9))
ZQ = Vector((x0 + 3.2, dcy + 1.3, 0.5))                              # titik zoom: sofa beige (bantal black cherry)
NFM = NF - NZ
def cam_pose(f):
    f = f % NF
    if f < NZ:
        a_ = Vector((*P(*_on(ZD)).xy, 0)); b_ = Vector((*dense[0][0].xy, 0))
        v0 = (cam_main(1)[0] - cam_main(0)[0]).length
        m1 = min(3.0, v0 * NZ / max(1e-6, (b_ - a_).length)); u = f / NZ
        q = (-2 * u ** 3 + 3 * u ** 2) + (u ** 3 - u ** 2) * m1   # Hermite: mulai diam, akhir menyambung kecepatan jalur
        return a_.lerp(b_, q), math.radians(YS)
    return cam_main(f - NZ)
def zoom_at(f):
    """Zoom geser (lensa shift): arah kamera TETAP, bagian sofa diperbesar lalu melebar ke tampilan penuh.
    Hasil (zf, cu, cv): perbesaran & pusat potongan dalam satuan setengah-lebar gambar normal."""
    f = f % NF
    if f >= NZ: return 1.0, 0.0, 0.0
    u = f / NZ; e = u * u * (3 - 2 * u); zf = Z0 + (1 - Z0) * e
    p, yaw = cam_pose(f); fw = Vector((-math.sin(yaw), math.cos(yaw), 0)); rt = Vector((math.cos(yaw), math.sin(yaw), 0))
    d = ZQ - Vector((p.x, p.y, CAM_Z)); th = math.tan(math.atan(18 / LENS))
    w = (zf - 1) / (Z0 - 1)
    return zf, d.dot(rt) / d.dot(fw) / th * w, d.z / d.dot(fw) / th * w
def cam_main(f):
    s = TOT * (f % NFM) / NFM
    k = min(len(dense) - 2, max(0, bisect.bisect_right(cost, s) - 1))
    t = (s - cost[k]) / max(1e-9, cost[k + 1] - cost[k])
    return Vector((*dense[k][0].lerp(dense[k + 1][0], t).xy, 0)), dense[k][1] + (dense[k + 1][1] - dense[k][1]) * t
def frame_of(ki):
    target = pts[ki][0]; kk = min(range(len(dense)), key=lambda k: (dense[k][0] - target).length)
    return NZ + int(round(cost[kk] / TOT * NFM))
ROOMS = [(0, 'Lobi'), (frame_of(5) - 12, 'Ruang besar'), (frame_of(7) - 10, 'Ruang kecil'), (frame_of(10), 'Dinding pajang'),
         (frame_of(15) - 6, 'Ruang kiri atas'), (frame_of(16) - 14, 'Ruang kiri bawah')]
cd = bpy.data.cameras.new('kamera'); cd.lens = float(arg('lens', 28)); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.clip_start = 0.05; cd.clip_end = 200
cam = bpy.data.objects.new('kamera', cd); sc.collection.objects.link(cam); sc.camera = cam
CAM_Z = float(arg('camz', 1.45))
def cam_at(f):
    p, yaw = cam_pose(f); cam.location = (p.x, p.y, CAM_Z); cam.rotation_euler = (math.radians(90), 0, yaw)
    zf, cu, cv = zoom_at(f); cd.lens = LENS * zf; cd.shift_x = cu * zf / 2; cd.shift_y = cv * zf / 2
R.color_management(sc, float(arg('exposure', -1.6)), float(arg('wb', 5000)))   # dikalibrasi tes render frame 0 (22 Okt)
sc.render.resolution_x, sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
R.cycles(sc, SAMPLES)
json.dump({'n': NF, 'rooms': [[f, n] for f, n in ROOMS]}, open(os.path.join(OUT, 'rooms.json'), 'w'))
print('[galery12] %d frame · titik kunci di frame %s' % (NF, [frame_of(i) for i in range(len(pts))]))

if arg('check'):
    st_, sy_ = [], []; prev = cam_pose(0)
    for k in range(1, NF - 1):
        cur = cam_pose(k); st_.append((cur[0] - prev[0]).length); sy_.append(abs(math.degrees(cur[1] - prev[1]))); prev = cur
    print('[cek] langkah posisi/frame min %.3f maks %.3f m · putaran/frame maks %.2f°' % (min(st_), max(st_), max(sy_))); sys.exit(0)

if arg('export'):
    import numpy as _np
    dst = os.path.join(R.ROOT, 'assets', 'galeri', 'g12'); os.makedirs(dst, exist_ok=True)
    yup = lambda v: [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
    bpy.context.view_layer.update()
    lights = []
    for ob in [o for o in sc.objects if o.type == 'LIGHT']:
        mw = ob.matrix_world; d = ob.data; dirv = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
        Lj = {'t': d.type, 'p': yup(mw.translation), 'd': yup(dirv), 'c': [round(x, 3) for x in d.color], 'e': round(d.energy, 1)}
        if d.type == 'SPOT': Lj['a'] = round(d.spot_size, 3); Lj['b'] = round(d.spot_blend, 2)
        lights.append(Lj)
    for o in list(sc.objects):
        if o.type in ('LIGHT', 'CAMERA') or o.get('render'): bpy.data.objects.remove(o, do_unlink=True)
    def _hex(c3): return '#%02x%02x%02x' % tuple(int(max(0, min(1, v)) * 255) for v in c3)
    def _lin2srgb(v): return (12.92 * v) if v <= 0.0031308 else (1.055 * v ** (1 / 2.4) - 0.055)
    for m in bpy.data.materials:
        nt = m.node_tree
        if nt is None or m.get('flat') or m.get('emit'): continue
        b0 = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None); col = None
        im = next((n.image for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name != 'Non-Color'), None)
        if im is not None and im.size[0] > 0:
            try:
                px = _np.empty(im.size[0] * im.size[1] * im.channels, dtype=_np.float32); im.pixels.foreach_get(px)
                col = px.reshape(-1, im.channels)[::53, :3].mean(axis=0).tolist()
            except Exception: col = None
        if col is None and b0 is not None: col = [_lin2srgb(v) for v in list(b0.inputs['Base Color'].default_value)[:3]]
        if col is not None: m['flat'] = _hex(col)
        if b0 is not None: m['rough'] = float(b0.inputs['Roughness'].default_value); m['metal'] = float(b0.inputs['Metallic'].default_value)
    for m in bpy.data.materials:
        nt = m.node_tree
        if nt is None or m.get('img'): continue
        N_ = nt.nodes; N_.clear()
        out = N_.new('ShaderNodeOutputMaterial'); b = N_.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs['Surface'])
        if m.get('emit'):
            b.inputs['Base Color'].default_value = (0, 0, 0, 1)
            b.inputs['Emission Color'].default_value = tuple(m['emit']) + (1.0,); b.inputs['Emission Strength'].default_value = float(m.get('estr', 1)) * 0.25
        else:
            b.inputs['Base Color'].default_value = R.srgb(m.get('flat', '#bfb5a8'))
            b.inputs['Roughness'].default_value = float(m.get('rough', 0.6)); b.inputs['Metallic'].default_value = float(m.get('metal', 0.0))
            if float(m.get('alpha', 1.0)) < 0.99:
                b.inputs['Alpha'].default_value = float(m['alpha'])
                for at_, v_ in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
                    try: setattr(m, at_, v_)
                    except Exception: pass
    for o in [o for o in sc.objects if o.type == 'MESH' and o.name.startswith('buku') and any(sl.link == 'OBJECT' for sl in o.material_slots)]:
        mats = [sl.material for sl in o.material_slots]; o.data = o.data.copy()   # Draco: tiap buku mesh sendiri (bahan varian per objek)
        for i_, sl in enumerate(o.material_slots): sl.link = 'DATA'; o.data.materials[i_] = mats[i_]
    glb = os.path.join(dst, 'scene.glb')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False, export_lights=False, export_cameras=False, export_apply=True, export_yup=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    frames = []
    for k in range(NF):
        p, yaw = cam_pose(k); fv = Vector((-math.sin(yaw), math.cos(yaw), 0))
        frames.append(yup((p.x, p.y, CAM_Z)) + [round(fv.x, 4), round(-fv.y, 4)] + [round(v_, 4) for v_ in zoom_at(k)])
    json.dump({'n': NF, 'hfov': round(2 * math.degrees(math.atan(18 / float(arg('lens', 28)))), 2), 'frames': frames, 'fadeLoop': True}, open(os.path.join(dst, 'path.json'), 'w'))
    json.dump(lights, open(os.path.join(dst, 'lights.json'), 'w'))
    print('[galery12] ekspor: %s (%.1f MB), %d frame, %d lampu' % (glb, os.path.getsize(glb) / 1e6, NF, len(lights)))
else:
    for o in [o for o in sc.objects if o.get('live')]: bpy.data.objects.remove(o, do_unlink=True)
    def realism(m):
        nt = m.node_tree
        if nt is None or m.get('emit'): return
        b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if b is None: return
        rough = b.inputs['Roughness']; kain = any(k in m.name.lower() for k in ('sofa', 'bantal', 'kulit', 'kain', 'karpet', 'tirai'))
        if not rough.is_linked and b.inputs['Roughness'].default_value > 0.08:      # variasi kilap (sidik jari, debu, aus)
            nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6.0; nz.inputs['Detail'].default_value = 8
            mr = nt.nodes.new('ShaderNodeMapRange'); r0 = rough.default_value
            mr.inputs['To Min'].default_value = max(0.02, r0 - 0.12); mr.inputs['To Max'].default_value = min(1.0, r0 + 0.12)
            nt.links.new(nz.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], rough)
        if kain:                                                                      # kain: tanpa pantulan seperti plastik, kilau serat berwarna kain
            b.inputs['Specular IOR Level'].default_value = 0.12
            if m.get('flat'): b.inputs['Sheen Tint'].default_value = R.srgb(m['flat'])
        if m.name.startswith('kaca 8mm'):                                             # kaca bening 8 mm bertepi hijau (bukan plastik)
            b.inputs['Base Color'].default_value = R.srgb('#d6ebe1'); b.inputs['Transmission Weight'].default_value = 1.0
            b.inputs['IOR'].default_value = 1.52; b.inputs['Roughness'].default_value = 0.02; return
        nin = b.inputs['Normal']; prev = nin.links[0].from_socket if nin.is_linked else None
        nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 3.0 if kain else 260.0; nz2.inputs['Detail'].default_value = 10
        if kain:                                                                      # kerut kain lembut
            nz2.inputs['Distortion'].default_value = 2.5
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35 if kain else 0.08; bp.inputs['Distance'].default_value = 0.01 if kain else 0.0015
        nt.links.new(nz2.outputs['Fac'], bp.inputs['Height'])
        if prev is not None: nt.links.new(prev, bp.inputs['Normal'])
        nt.links.new(bp.outputs['Normal'], nin)
    for m in list(bpy.data.materials):
        if m.users and m.get('flat') != '#000000':
            try: realism(m)
            except Exception as e: print('[realism]', m.name, e)
    for s_ in str(arg('shots', '0,30,60')).split(','):
        cam_at(float(s_)); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s_))), webp=False)
        print('[galery12] frame %s %.1f s' % (s_, time.time() - t0), flush=True)
