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
def throw(x, y, z, rot, hexc, w=0.55, l=1.3, mat=None):
    """Selendang TERLIPAT (28 Okt): 3 lapis kain bertepi bulat, sedikit bergeser — bukan papan tipis kaku."""
    w, l = min(w, 0.46), min(l, 0.62); m = mat or fab('selendang ' + hexc, hexc, 'fabric-woven', 0.25, 0.5)
    for k_ in range(3):
        ob = R.box(c, 'selendang', -w / 2 + k_ * 0.006, w / 2 - k_ * 0.004, -l / 2 + k_ * 0.01, l / 2, 0, 0.021, m, bevel=0.0095)
        ob.location = (x, y, z + k_ * 0.019); ob.rotation_euler = (0, 0, math.radians(rot + k_ * 1.5))
        sd = ob.modifiers.new('halus', 'SUBSURF'); sd.levels = 1; sd.render_levels = 2
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
R6X0 = x0 - T - 4.5; R6Y0, R6Y1 = Y(443) + T / 2, Y(293) - T / 2; R6O0, R6O1 = R6Y0 + 0.3, R6Y1 - 0.3   # Room 6 di luar tembok barat (C64): bukaan berbingkai
B('tembok barat', x0 - T, x0, y0, R6O0, 0, H, M['beige']); B('tembok barat b', x0 - T, x0, R6O1, y1, 0, H, M['beige']); B('ambang tembok barat r6', x0 - T, x0, R6O0, R6O1, 4.3, H, M['beige'])
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
# ---- PRODUK CUSTOMIZE (28 Okt, pemilik: "munculkan beberapa produk dari produk customize di setiap room"): model dibangun
#      oleh pembuat Customize situs (v5/js/maker.js, XMAKER.build) lalu diekspor ke data/source/render-lib/custom/<nama>/.
#      Hadap model: depan = -y Blender (rot 90 → +x, -90 → -x, 180 → +y). Bahan dikenali dari nama kunci pembuat
#      (fab… kain/kulit, wood… kayu, flute… kayu fluted, stone… batu, metal… logam, edge… tepi multiplek, dark… badan gelap).
CZD = os.path.join(R.ROOT, 'data', 'source', 'render-lib', 'custom')
def cz(name, x, y, rot=0.0, z=0.018, mats=None):
    piv, obs = R.place(c, os.path.join(CZD, name, name + '.glb'), (x, y, z), rot)
    for o in obs:
        for sl in o.material_slots:
            if not sl.material: continue
            for k_, m_ in (mats or {}).items():
                if sl.material.name.startswith(k_): sl.material = m_; break
    return piv, obs
def leather(name, hexc): return R.tex_mat(name, 'acg-Leather039', 0.6, tint=hexc, rough=0.45, nstr=0.7, sheen=0.05, hsv=(0.5, -0.15, 1.05))
def lacquer(name, hexc): return R.tex_mat(name, 'ph-smoked_walnut_veneer', 1.3, tint=hexc, rmul=0.55, nstr=0.15, rot=90, coat=0.35, hsv=(0.5, 0.0, 0.55))
def table_lamp(x, y, ztop, h=0.62, energy=140):
    """Lampu meja (Table Lamp, siotech2011, CC-BY) berkap linen menyala + pengganti ringan untuk 3D langsung."""
    t1 = R.sphere(c, 'kaki lampu meja', (x, y, ztop + 0.14), 0.13, R.flat_mat('keramik abu', '#4a4d52', 0.35), sz=1.1)
    t2 = R.cyl(c, 'kap lampu meja', x, y, ztop + 0.33, ztop + 0.56, 0.16, R.emit_mat('kap putih menyala', R.kelvin(2800), 6.0), seg=48)
    tag([t1, t2], 'live')
    tl, tlo = R.place(c, skf('table_lamp'), (x, y, ztop), 0, fit=('z', h)); tag([tl] + tlo, 'render')
    for sl in mats_of(tlo, 'PBR_Body'): sl.material = R.tex_mat('keramik lampu', 'ph-clay_plaster', 0.3, tint='#3b3d41', rough=0.18, nstr=0.3, coat=0.6)
    for sl in mats_of(tlo, 'Shade.001'): sl.material = M['brass']
    for sl in mats_of(tlo, 'Shade'):
        if sl.material.name.startswith('Shade') and not sl.material.name.startswith('Shade.001'):
            b_ = principled(sl.material); b_.inputs['Base Color'].default_value = R.srgb('#e9dfcf')
            b_.inputs['Emission Color'].default_value = R.kelvin(2800) + (1.0,); b_.inputs['Emission Strength'].default_value = 1.2
    R.point(c, 'lampu meja', (x, y, ztop + h * 0.72), energy, R.kelvin(2800), size=0.12)
def books_flat(x, y, z, rot=0.0, n=3, w=0.3):
    """Tumpukan buku tidur (sampul kain) di meja/konsol."""
    zz = z
    for k_ in range(n):
        hx = BOOKC[(k_ * 3 + int(x * 7)) % len(BOOKC)]; th = 0.035 + 0.01 * (k_ % 2); ww = w - 0.03 * k_
        ob = R.box(c, 'buku tidur', -ww / 2, ww / 2, -ww * 0.37, ww * 0.37, 0, th, bookmat(hx), bevel=0.003)
        ob.location = (x, y, zz); ob.rotation_euler.z = math.radians(rot + (k_ * 7 - 5)); zz += th
    return zz
def plant(name, x, y, h, rot=0.0, pot_hex=None, pr=0.22):
    z_ = 0.0
    if pot_hex: z_ = pot(x, y, pot_hex, pr, pr * 1.6) - 0.04
    return R.place(c, name, (x, y, z_), rot, fit=('z', h))
# dinding kanan lobi (biru tua): kabinet rendah + pigura + 2 sorot terfokus → geser kamera tidak melihat dinding gelap kosong
cab, cabo = cz('r1-sideboard', X(250), L1y1 - 0.26, 0, z=0.0, mats={'wood': lacquer('lak biru tua', DEEP), 'flute': lacquer('lak biru tua fluted', DEEP), 'edge': lacquer('lak biru tua tepi', DEEP), 'metal': M['brass']})   # Customize › Kabinet › Sideboard
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
def painting_at(xc, yc, zc, w, h, path, face, fm=None):
    """Lukisan kanvas di dinding: face '+y' (dinding selatan, muka ke utara) atau '-x' (dinding timur, muka ke barat); bingkai perunggu."""
    m = bpy.data.materials.new('lukisan ' + os.path.basename(path)); nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85; m['img'] = path
    za, zb = zc - h / 2, zc + h / 2
    if face == '+y':
        y = yc + 0.045; xa, xb = xc - w / 2, xc + w / 2; vs = [(xb, y, za), (xa, y, za), (xa, y, zb), (xb, y, zb)]
        B('bingkai lukisan', xa - 0.025, xb + 0.025, yc + 0.002, y - 0.002, za - 0.025, zb + 0.025, M['bronze'])
    elif face == '-y':
        y = yc - 0.045; xa, xb = xc - w / 2, xc + w / 2; vs = [(xa, y, za), (xb, y, za), (xb, y, zb), (xa, y, zb)]
        B('bingkai lukisan', xa - 0.025, xb + 0.025, y + 0.002, yc - 0.002, za - 0.025, zb + 0.025, fm or M['bronze'])
    elif face == '+x':
        x_ = xc + 0.045; ya, yb = yc - w / 2, yc + w / 2; vs = [(x_, yb, za), (x_, ya, za), (x_, ya, zb), (x_, yb, zb)]
        B('bingkai lukisan', xc + 0.002, x_ - 0.002, ya - 0.025, yb + 0.025, za - 0.025, zb + 0.025, fm or M['bronze'])
    else:
        x_ = xc - 0.045; ya, yb = yc - w / 2, yc + w / 2; vs = [(x_, ya, za), (x_, yb, za), (x_, yb, zb), (x_, ya, zb)]
        B('bingkai lukisan', x_ + 0.002, xc - 0.002, ya - 0.025, yb + 0.025, za - 0.025, zb + 0.025, M['bronze'])
    me = bpy.data.meshes.new('kanvas'); me.from_pydata(vs, [], [(0, 1, 2, 3)]); me.update()
    uv = me.uv_layers.new(name='UVMap')
    for li, (uu, vv) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = (uu, vv)
    ob = bpy.data.objects.new('kanvas lukisan', me); c.objects.link(ob); me.materials.append(m)
ART = os.path.join(R.ROOT, 'tools', 'render', 'art')
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
PROFM = [NAVYM]                                                        # bahan profil = bahan dinding ruang itu (28 Okt: dipakai Room 2–5)
def prof_y(yf, side, xa, xb, z0, z1, d):
    return B('profil', xa, xb, yf if side > 0 else yf - d, yf + d if side > 0 else yf, z0, z1, PROFM[0])
def prof_x(xf, side, ya, yb, z0, z1, d):
    return B('profil', xf if side > 0 else xf - d, xf + d if side > 0 else xf, ya, yb, z0, z1, PROFM[0])
def frame_x(xf, side, ya, yb, za, zb, w=0.03, d=0.014):
    for a_, b_, c_, e_ in ((ya, yb, za, za + w), (ya, yb, zb - w, zb), (ya, ya + w, za + w, zb - w), (yb - w, yb, za + w, zb - w)): prof_x(xf, side, a_, b_, c_, e_, d)
def frame_y(yf, side, xa, xb, za, zb, w=0.03, d=0.014):
    for a_, b_, c_, e_ in ((xa, xb, za, za + w), (xa, xb, zb - w, zb), (xa, xa + w, za + w, zb - w), (xb - w, xb, za + w, zb - w)): prof_y(yf, side, a_, b_, c_, e_, d)
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
def wall_x(xf, side, ya, yb, bays=(), dado=False, low=True):
    prof_x(xf, side, ya, yb, 0.0, 0.12, 0.016)
    if dado: prof_x(xf, side, ya, yb, 1.02, 1.06, 0.02)
    for a_, b_ in bays:
        if low: frame_x(xf, side, a_, b_, 0.28, 0.86)
        frame_x(xf, side, a_, b_, 1.24, H - 0.42)
    prof_x(xf, side, ya, yb, H - 0.16, H - 0.14, 0.02); prof_x(xf, side, ya, yb, H - 0.1, H, 0.06); prof_x(xf, side, ya, yb, H - 0.04, H, 0.1)
NF_ = NZY                                                              # utara: kanan ceruk → bidang lukisan dalam satu panel besar
wall_y(NF_, -1, x0 + 5.05, X(320), bays=[(x0 + 5.2, X(320) - 0.25)])
wall_y(NZY - ND, -1, x0 + FW, x0 + 5.05, skip=[(acx - aw / 2, acx + aw / 2)])   # dinding ceruk: polos + plint, dado, list plafon
wall_y(L1y0, +1, wx1, X(320), bays=[(wx1 + 0.2, X(320) - 0.25)])
wall_y(L1y0, +1, x0 + FW, wx0, dado=False)
wall_x(x0 + FW, +1, L1y0, bc0); wall_x(x0 + FW, +1, bc1, L1y1)

# ==========================================================================
#  ROOM 2 · ruang besar kanan — "PENTHOUSE LOOK" (referensi pemilik 28 Okt: data/source/galeri-ref/room2-penthouse-ccg.png)
#   cream + abu tua, aksen rich cognac · KYRIOS L super besar abu tua kaki emas (Customize, channel) di depan jendela
#   bervitrase cream (dinding cream di belakang sofa, cahaya dari skylight langit-langit — C17.1) · dinding barat: kisi abu tua setinggi plafon + TV + kabinet media
#   melayang + rak built-in LED · plafon turun ber-cove + lampu cincin · marmer abu, karpet wol cream · ottoman kulit cognac
# ==========================================================================
CREAM, DGREY, COGNAC = '#e6dccb', '#4b4641', '#74452b'                # abu tua hangat (28 Okt: dulu #4a4a4d terbaca biru)
r2x0, r2x1, r2y0, r2y1 = xe, X(350), Y(443) + T / 2, Y(268) - T / 2
floor_rect(r2x0, r2x1, r2y0, r2y1, R.add_grout(R.tex_mat('marmer abu ruang 2', 'stone-calacatta', 1.6, tint='#a9a6a1', rough=0.16, coat=0.25, nstr=0.08, hsv=(0.5, 0.25, 0.95)), w=1.2, h=1.2, gap=0.0012, col_hex='#7f7c78', offset=0.0))
DGM = wallmat('abu tua ruang 2', DGREY)
SLATM = R.tex_mat('kisi abu tua', 'ph-smoked_walnut_veneer', 1.0, tint='#3f3a35', rmul=0.9, nstr=0.25, rot=90, hsv=(0.5, 0.0, 0.5))
SHELFM = R.flat_mat('rak abu tua', '#3a3531', 0.55)
DUCO = R.flat_mat('duco abu tua', '#38332f', 0.32, coat=0.25)
NERO = R.tex_mat('marmer nero ruang 2', 'stone-nero', 0.9, rough=0.18, coat=0.35, nstr=0.1)
for m_, h_ in ((SLATM, '#3f3a35'), (NERO, '#2b2a2b'), (DGM, DGREY)): m_['flat'] = h_     # Galeri 3D langsung: warna rata = warna konsep (bukan rata-rata tekstur tanpa tint)
# --- dinding barat (belakang foto frontal): ceruk tengah = kisi + TV, kiri = rak built-in; sisi luar abu tua
cy0, cy1 = r2y0 + 1.0, r2y1 - 1.0
B('dinding belakang tengah mundur', xe - 0.05, xe + 0.012, cy0, cy1, 0, H - 0.6, DGM)
clad_x(xe, +1, r2y0, cy0, wallmat('abu tua kiri', DGREY), t=0.32); clad_x(xe, +1, cy1, r2y1, wallmat('abu tua kanan', DGREY), t=0.32)
B('kepala ceruk', xe, xe + 0.32, cy0, cy1, H - 0.6, H, wallmat('abu tua atas', DGREY))
clad_y(r2y0, +1, xe + 0.32, r2x1, wallmat('cream ruang 2', CREAM)); clad_y(r2y1, -1, xe + 0.32, r2x1, wallmat('cream ruang 2 b', CREAM))
B('sayap depan selatan', r2x1 - 0.5, r2x1, r2y0, r2y0 + 0.35, 0, H, wallmat('cream sayap', CREAM))
B('sayap depan utara', r2x1 - 0.5, r2x1, r2y1 - 0.35, r2y1, 0, H, wallmat('cream sayap b', CREAM))
sh0, sh1 = cy0 + 0.08, cy0 + 1.38                                      # rak built-in (2 lajur × 0,65 m) kiri TV, seperti referensi
sl0, sl1 = sh1 + 0.04, cy1                                             # panel kisi vertikal setinggi ceruk
k_ = 0; yy = sl0
while yy + 0.04 <= sl1:                                                # kisi 4 cm, celah 2 cm, timbul 4 cm
    B('kisi', xe + 0.012, xe + 0.052, yy, yy + 0.04, 0, H - 0.6, SLATM); yy += 0.06
SHD = 0.34; xs0 = xe + 0.012
B('punggung rak', xs0, xs0 + 0.01, sh0, sh1, 0, H - 0.6, SHELFM)
for yy in (sh0, (sh0 + sh1) / 2, sh1): B('tiang rak', xs0, xe + SHD, yy - 0.02, yy + 0.02, 0, H - 0.6, SHELFM)
B('kabinet rak bawah', xs0, xe + SHD, sh0, sh1, 0, 0.62, SHELFM)
for yy in (sh0 + 0.02, (sh0 + sh1) / 2, sh1 - 0.02): B('celah pintu rak', xe + SHD, xe + SHD + 0.003, yy - 0.002, yy + 0.002, 0.05, 0.58, gapm)
R2SH = [0.62 + k_ * 0.445 for k_ in range(9)]                          # 0,62 … 4,18 m
LED30 = R.emit_mat('led rak 3000K', R.kelvin(3000), 14.0)
for z in R2SH[1:]: B('ambalan', xs0, xe + SHD, sh0, sh1, z - 0.035, z, SHELFM)
def books_x(xb, ya, yb, zb):
    """books() untuk rak di dinding x = xb (punggung buku menghadap +x)."""
    B_ = _book_src(); y = ya; var = rnd.choice((0, 1, 2)); run = rnd.randint(3, 6)
    while True:
        bk = rnd.choice(B_); s_ = rnd.uniform(1.1, 1.32); tk = bk['ext'][bk['t']] * s_
        if y + tk > yb: break
        put_book(bk, (xb + bk['ext'][bk['d']] * s_ / 2, y + tk / 2, zb), ((0, 1, 0), (SPINE, 0, 0), (0, 0, 1)), s_, var)
        y += tk + 0.0015; run -= 1
        if run <= 0: var = rnd.choice((0, 1, 2)); run = rnd.randint(3, 6)
CREAMG = R.tex_mat('glasir cream ruang 2', 'ph-clay_plaster', 0.5, tint='#e9e1d3', rough=0.22, nstr=0.25, coat=0.5)
SPINEC = ['#d9cfbd', '#c3b39a', '#5c3b27', '#3a3633', '#e7ded0', '#a8957a']
def books_up(xb, ya, yb, zb, n=None):
    """Buku tegak bersampul kain polos (palet cream/cognac/arang) — tidak memakai set ensiklopedia Room 1."""
    y = ya; k = 0
    while y < yb - 0.02 and (n is None or k < n):
        t_ = rnd.uniform(0.022, 0.038); h_ = rnd.uniform(0.21, 0.27); d_ = rnd.uniform(0.15, 0.19)
        B('buku r2', xb, xb + d_, y, y + t_, zb, zb + h_, bookmat(SPINEC[(k * 5 + int(zb * 10)) % len(SPINEC)]), bevel=0.002); y += t_ + 0.002; k += 1
    return y
def deco(name, x, y, z, h, mat=None, rot=0):
    p_, o_ = R.place(c, name, (x, y, z), rot, fit=('z', h))
    if mat: R.recolor(o_, mat)
    return p_, o_
G2 = [['bk', 'vc'], ['pf', '-'], ['db', 'bg'], ['-', 'bk'], ['bp', 'pf'], ['bk', '-'], ['vc', 'bp'], ['-', 'db']]   # bawah → atas, lega (referensi: rak tidak penuh)
xc_ = xs0 + 0.16
for zi in range(len(R2SH) - 1):
    zb = R2SH[zi]; zt = R2SH[zi + 1] - 0.035
    for col in range(2):
        ya, yb = sh0 + col * 0.65 + 0.04, sh0 + (col + 1) * 0.65 - 0.04; ym = (ya + yb) / 2
        B('led rak', xe + SHD - 0.05, xe + SHD - 0.03, ya, yb, zt - 0.01, zt - 0.002, LED30)
        t_ = G2[zi][col]
        if t_ == 'bk': books_up(xs0 + 0.012, ya + 0.03, ya + 0.36, zb); deco('brass_pot_02', xc_, yb - 0.11, zb, 0.09)
        elif t_ == 'vc': deco('ceramic_vase_01', xc_, ym - 0.06, zb, 0.27, CREAMG); books_flat(xc_, yb - 0.12, zb, 90, 2, 0.2)
        elif t_ == 'pf': deco('standing_picture_frame_0%d' % (1 + zi % 2), xc_ - 0.04, ym, zb, 0.3, None, 90)
        elif t_ == 'db': deco('ceramic_vase_03', xc_, ym - 0.08, zb, 0.3, CREAMG); deco('brass_vase_03', xc_, yb - 0.1, zb, 0.16)
        elif t_ == 'bg': deco('brass_goblets', xc_, ym, zb, 0.16)
        elif t_ == 'bp': deco('brass_pot_01', xc_, ym + 0.05, zb, 0.15)
# --- TV + kabinet media melayang (Customize › Kabinet › TV, duco abu tua)
def realign(piv, obs, x, y, z):
    """Buang bagian 'ghost' (dinding bantu Customize) lalu pusatkan sisa model di (x, y) dengan dasar di z."""
    for o in list(obs):
        if o.type == 'MESH' and any(s.material and s.material.name.startswith('ghost') for s in o.material_slots):
            obs.remove(o); bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(v) for o in obs if o.type == 'MESH' for v in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    piv.location += Vector((x - (lo.x + hi.x) / 2, y - (lo.y + hi.y) / 2, z - lo.z)); bpy.context.view_layer.update()
    return hi.z - lo.z + z
tvy = (sl0 + sl1) / 2 + 0.05
md2, md2o = cz('r2-media', xe + 0.3, tvy, 90, mats={'paint': DUCO, 'edge': DUCO, 'metal': M['brass']})
ztm = realign(md2, md2o, xe + 0.052 + 0.21, tvy, 0.26)
B('tv bingkai', xe + 0.055, xe + 0.085, tvy - 0.73, tvy + 0.73, 1.12, 1.95, R.flat_mat('tv hitam', '#0b0b0c', 0.35))
B('tv layar', xe + 0.085, xe + 0.087, tvy - 0.715, tvy + 0.715, 1.135, 1.935, R.flat_mat('layar tv', '#060708', 0.08, coat=0.6))
def lathe(name, prof, x, y, z, mat, seg=96, closed=False):
    """Benda putar dari profil [(r, h), …] — kap, kaki lampu, cincin."""
    vs, fs, n = [], [], len(prof)
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for r_, h_ in prof: vs.append((x + r_ * math.cos(a), y + r_ * math.sin(a), z + h_))
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(n - (0 if closed else 1)):
            k2 = (k + 1) % n; fs.append((i * n + k, j * n + k, j * n + k2, i * n + k2))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); c.objects.link(ob); me.materials.append(mat); return ob
def glass_mat(name, hexc, rough=0.06):
    m = bpy.data.materials.new(name); b_ = m.node_tree.nodes.get('Principled BSDF')
    b_.inputs['Base Color'].default_value = R.srgb(hexc); b_.inputs['Roughness'].default_value = rough
    b_.inputs['Transmission Weight'].default_value = 1.0; b_.inputs['IOR'].default_value = 1.5
    m['flat'] = hexc; return m
AMBERG = glass_mat('kaca amber', '#e8a050', 0.04)
la_x, la_y = xe + 0.27, tvy - 1.0
LS = 1.35                                                             # tinggi lampu ±52 cm
lathe('kaki lampu kaca amber', [(r_ * LS, h_ * LS) for r_, h_ in [(0.0, 0.0), (0.085, 0.0), (0.088, 0.008), (0.05, 0.03), (0.026, 0.07), (0.02, 0.19), (0.028, 0.215), (0.0, 0.215)]], la_x, la_y, ztm, AMBERG)
_dome = [(LS * 0.18 * math.sin(math.radians(t)), LS * (0.245 + 0.15 * math.cos(math.radians(t)))) for t in range(0, 91, 5)] + [(LS * 0.182, LS * 0.24)]
sh_ = lathe('kap lampu kaca amber', _dome, la_x, la_y, ztm, AMBERG)
sd_ = sh_.modifiers.new('tebal kaca', 'SOLIDIFY'); sd_.thickness = 0.004
R.sphere(c, 'bola lampu amber', (la_x, la_y, ztm + 0.3 * LS), 0.04, R.emit_mat('bola lampu 2200K', R.kelvin(2200), 160.0))
R.point(c, 'lampu amber', (la_x, la_y, ztm + 0.3 * LS), 110, R.kelvin(2200), size=0.03)
books_flat(xe + 0.27, tvy + 0.85, ztm, 90, 3, 0.3)
R.place(c, 'ceramic_vase_04', (xe + 0.27, tvy + 1.05, ztm), 0, fit=('z', 0.26))
washer_x(xe + 0.0, +1, cy0 + 0.1, cy1 - 0.1, 420)                     # pencuci dinding → kisi bergaris cahaya & bayangan
# --- dinding selatan cream di belakang sofa (28 Okt, C17.1: "di samping kiri ga mungkin jendela" → tanpa jendela) — bingkai panel
PROFM[0] = wallmat('profil cream selatan ruang 2', CREAM); wall_y(r2y0 + 0.03, +1, xe + 0.32, r2x1 - 0.5, bays=[(xe + 0.6, (xe + r2x1) / 2 - 0.08), ((xe + r2x1) / 2 + 0.08, r2x1 - 0.8)], dado=False); PROFM[0] = NAVYM
# --- cahaya dari LANGIT-LANGIT: skylight memanjang di atas sofa (kaca susu + kisi baja hitam), menyapu dinding cream ke bawah
SKW = 0.95; sk0, sk1 = xe + 0.87, r2x1 - 0.55
B('skylight kaca susu', sk0, sk1, r2y0 + 0.03, r2y0 + SKW, H - 0.012, H - 0.004, R.emit_mat('skylight ruang 2', R.kelvin(5200), float(arg('sky', 2.2))))
for xx in [sk0 + (sk1 - sk0) * k / 6 for k in range(7)]: B('kisi skylight', xx - 0.018, xx + 0.018, r2y0 + 0.03, r2y0 + SKW, H - 0.07, H - 0.012, M['black'])
B('kisi skylight', sk0, sk1, r2y0 + SKW / 2 - 0.018, r2y0 + SKW / 2 + 0.018, H - 0.07, H - 0.012, M['black'])
R.area(c, 'cahaya skylight ruang 2', ((sk0 + sk1) / 2, r2y0 + SKW / 2 + 0.03, H - 0.09), (math.radians(-12), 0, 0), sk1 - sk0, SKW - 0.05, float(arg('r2sky', 750)), R.kelvin(4700), spread=110)
# --- plafon turun ber-cove (lampu tersembunyi menyinari plafon) + lampu gantung cincin
SOFF = M['white']; COVE = R.emit_mat('led cove', R.kelvin(2700), float(arg('cove', 18)))
bw = 0.55; zb0, zb1 = H - 0.34, H - 0.14
B('plafon turun', xe, sk0, r2y0, r2y0 + SKW + 0.05, zb0, zb1, M['white']); B('plafon turun', sk1, r2x1, r2y0, r2y0 + SKW + 0.05, zb0, zb1, M['white'])   # sudut skylight
B('lis skylight', sk0, sk1, r2y0 + SKW, r2y0 + SKW + 0.05, zb0, H, M['white'])                          # sisi sumur cahaya
for (a_, b_, c_, d_, ins) in ((xe, r2x1, r2y1 - bw, r2y1, 'y-'), (xe, xe + bw + 0.32, r2y0 + SKW + 0.05, r2y1 - bw, 'x+'), (r2x1 - bw, r2x1, r2y0 + SKW + 0.05, r2y1 - bw, 'x-')):
    B('plafon turun', a_, b_, c_, d_, zb0, zb1, SOFF)
    if ins == 'y+': B('cove', a_ + bw, b_ - bw, d_ - 0.06, d_ - 0.03, zb1, zb1 + 0.012, COVE)
    elif ins == 'y-': B('cove', a_ + bw, b_ - bw, c_ + 0.03, c_ + 0.06, zb1, zb1 + 0.012, COVE)
    elif ins == 'x+': B('cove', b_ - 0.06, b_ - 0.03, c_, d_, zb1, zb1 + 0.012, COVE)
    else: B('cove', a_ + 0.03, a_ + 0.06, c_, d_, zb1, zb1 + 0.012, COVE)
# --- SOFA pilihan pemilik (C18.1 "ganti sofanya dengan ini, ada di customize"; data/source/galeri-ref/room2-sofa-customize.png):
#     Customize › Sofa chaise, sandaran bantal biscuit + dudukan biscuit, lengan miring, linen sand, kaki lurus champagne, list
#     kuningan, storage di bawah dudukan, konsol cup holder, 4 bantal kontras + 2 bolster. Disesuaikan ruang: lebar 380 → 310 cm,
#     chaise dicerminkan (kiri) agar ujung chaise mengarah ke kamera seperti referensi. Bantal kontras: arang & cognac (aksen).
LINEN = fab('linen sand ruang 2', '#b8a68a', 'fabric-linen', 0.3, 0.3)
PILC = fab('bantal arang ruang 2', '#2a2826', 'ph-velour_velvet', 0.3, 0.7); PILK = fab('bantal cognac ruang 2', '#6a3d25', 'ph-velour_velvet', 0.3, 0.7)
CHAMP = R.flat_mat('champagne', '#c7aa78', 0.3, 1.0)
sfx, sfy = (xe + 0.33 + r2x1) / 2, r2y0 + 0.36 + 1.0
sf, sfo = cz('r2-sofa-c', sfx, sfy, 180, mats={'fab#2b2a29': PILC, 'fab': LINEN, 'metalchampagne': CHAMP, 'metalbrass': M['brass'], 'wood': M['walnut']})
_pil = sorted([o for o in sfo if o.type == 'MESH' and any(sl.material is PILC for sl in o.material_slots)], key=lambda o: (o.matrix_world.translation.x, o.matrix_world.translation.y))
for k_, o in enumerate(_pil):                                           # mesh bantal dipakai bersama → bahan per OBJEK
    for sl in o.material_slots:
        if sl.material is PILC: sl.link = 'OBJECT'; sl.material = PILK if k_ % 3 == 1 else PILC   # 2 cognac, 4 arang (aksen porsi kecil)
for m_, h_ in ((LINEN, '#b8a68a'), (PILC, '#2a2826'), (PILK, '#6a3d25'), (CREAMG, '#e9e1d3')): m_['flat'] = h_
zs = 0.43
throw(sfx + 1.15, sfy + 0.55, zs, 4, COGNAC, 0.46, 0.62, mat=PILK)                 # selendang cognac tua di ujung chaise
# --- meja kopi marmer nero + ottoman kulit cognac + meja samping, karpet wol cream tebal
rug(sfx - 0.15, sfy + 0.55, 3.0, 3.4, '#ddd3c2', tset='acg-Carpet016', hsv=(0.5, 0.45, 1.0), sheen=0.12)
cfx, cfy = sfx - 0.55, r2y0 + 0.36 + 1.05 + 0.75
t2, t2o = cz('r2-coffee', cfx, cfy, 0, mats={'stone': NERO, 'wood': NERO, 'metal': M['brass']})   # Customize › Meja › Coffee table (batu nero)
tz2 = R.top_of(t2o)
B('nampan kuningan', cfx + 0.05, cfx + 0.47, cfy - 0.14, cfy + 0.14, tz2, tz2 + 0.015, M['brass'], bevel=0.004)
R.place(c, 'brass_goblets', (cfx + 0.2, cfy, tz2 + 0.015), 0, fit=('z', 0.13))
deco('ceramic_vase_01', cfx + 0.38, cfy + 0.03, tz2 + 0.015, 0.22, CREAMG)
zb_ = books_flat(cfx - 0.28, cfy - 0.02, tz2, 8, 3, 0.32); R.place(c, 'brass_pot_02', (cfx - 0.28, cfy - 0.02, zb_), 0, fit=('z', 0.07))
ot, oto = cz('r2-ottoman-c', cfx + 0.15, cfy + 1.05, 0, mats={'fab': LINEN, 'metal': CHAMP})   # Customize › Ottoman (modul ottoman storage sofa pemilik)
sd2, sd2o = cz('r5-side', r2x1 - 0.42, cfy + 1.35, 0, mats={'stone': NERO, 'wood': NERO, 'metal': M['brass']})   # Customize › Meja › Side table (nero)
R.place(c, 'brass_vase_04', (r2x1 - 0.42, cfy + 1.35, R.top_of(sd2o)), 0, fit=('z', 0.22)); books_flat(r2x1 - 0.42, cfy + 1.35, R.top_of(sd2o), 30, 2, 0.24) if False else None
# --- dinding utara (cream): konsol walnut + lukisan + 2 lampu dinding kuningan + lampu meja; pohon di sudut
csx, csy = (xe + 0.32 + r2x1 - 0.5) / 2, r2y1 - 0.03 - 0.21
cs, cso = cz('r2-console', csx, csy, 0)                                 # Customize › Meja › Console
ztc = R.top_of(cso)
deco('ceramic_vase_03', csx + 0.52, csy, ztc, 0.5, CREAMG); deco('ceramic_vase_01', csx + 0.25, csy + 0.02, ztc, 0.28, CREAMG)
deco('standing_picture_frame_02', csx - 0.1, csy + 0.04, ztc, 0.32)
zb_ = books_flat(csx - 0.55, csy, ztc, 0, 3, 0.3); deco('brass_pot_01', csx - 0.55, csy, zb_, 0.12)
painting_at(csx, r2y1 - 0.03, 2.05, 1.0, 1.25, os.path.join(ART, 'lukisan-ruang2.jpg'), '-y')
for sx_ in (csx - 0.42, csx + 0.42): R.spot(c, 'sorot lukisan r2', (sx_, r2y1 - 0.85, H - 0.36), (sx_ * 0.5 + csx * 0.5, r2y1 - 0.03, 2.0), 60, R.kelvin(3000), size=0.02, ang=24, blend=.15)
ph_ = pot(r2x1 - 0.85, r2y1 - 0.55, CREAM, 0.3, 0.55); R.place(c, 'pachira_aquatica_01', (r2x1 - 0.85, r2y1 - 0.55, ph_ - 0.05), 0, fit=('z', 2.1))
# --- lampu: sorot terfokus di meja kopi & ottoman (bayangan kontras), cincin gantung
downlight(cfx, cfy, (cfx, cfy, 0.4), 120, ang=24)
downlight(cfx + 0.15, cfy + 1.05, (cfx + 0.15, cfy + 1.05, 0.4), 70, ang=22)
downlight(csx, r2y1 - 0.75, (csx, r2y1 - 0.04, 1.95), 110, ang=22)
OPAL = R.emit_mat('difuser opal cincin', R.kelvin(2700), 11.0); BLKA = R.flat_mat('aluminium hitam', '#141312', 0.45, 0.6)
rx_, ry_ = cfx + 0.1, cfy + 0.35
for rr_, zz_ in ((0.62, 2.95), (0.4, 2.78)):
    lathe('cincin lampu', [(rr_ - 0.012, 0.0), (rr_ + 0.012, 0.0), (rr_ + 0.012, 0.035), (rr_ - 0.012, 0.035)], rx_, ry_, zz_, BLKA, seg=160, closed=True)
    lathe('difuser cincin', [(rr_ - 0.009, -0.002), (rr_ + 0.009, -0.002)], rx_, ry_, zz_, OPAL, seg=160)
    for a in (30, 150, 270):
        ax_, ay_ = rx_ + rr_ * math.cos(math.radians(a)), ry_ + rr_ * math.sin(math.radians(a))
        R.cyl(c, 'kabel baja', ax_, ay_, zz_ + 0.035, H, 0.0016, R.flat_mat('baja kabel', '#8c8a86', 0.3, 1.0), seg=8)
        R.cyl(c, 'kanopi', ax_, ay_, H - 0.012, H, 0.035, BLKA, seg=32)

# ==========================================================================
#  ROOM 3 · ruang kecil kanan (beige + greige, aksen dry sage) — referensi dicari Claude di Chrome (29 Okt, C28):
#  home-designing.com "a slice of luxury in beige and green interiors" (salinan pribadi: data/private/galeri-ref/room3-ref-*.jpg).
#  Koreksi pemilik C33 (29 Okt): tambah sorot & aksesori (terlalu kosong), kabinet = GLIZA (katalog) + TV, panel di dinding,
#  tanaman kurang mencolok, hijau bantal & stool diganti (dry sage kusam), tambah cermin.
# ==========================================================================
GREIGE, BEIGE3, SAGE = '#a49c90', '#ddd3c5', '#a2a58e'                     # dry sage kusam berdebu (dulu #8f9b80 terlalu hijau)
r3x0, r3x1, r3y0, r3y1 = xe, X(312), Y(268) + T / 2, Y(145) - T / 2
r3y = (r3y0 + r3y1) / 2
R3W = wallmat('beige hangat ruang 3', BEIGE3); R3G = wallmat('greige ruang 3', '#c6bdb0')
R3FL = wallmat('panel bergaris greige ruang 3', '#b9b0a2')
R3TP = R.tex_mat('panel batu greige tv ruang 3', 'stone-travertine', 1.1, tint='#c2b8aa', rough=0.55, nstr=0.25, hsv=(0.5, 0.15, 1.0))
R3MB = R.add_grout(R.tex_mat('marmer abu beige ruang 3', 'stone-calacatta', 1.5, tint='#c9c2b8', rough=0.2, coat=0.15, nstr=0.08, hsv=(0.5, 0.15, 0.98)), w=1.2, h=1.2, gap=0.0012, col_hex='#9e978d', offset=0.0)
R3SK = R.flat_mat('plint gelap ruang 3', '#3b3733', 0.5)
for m_, h_ in ((R3W, BEIGE3), (R3G, '#c6bdb0'), (R3FL, '#b9b0a2'), (R3TP, '#c2b8aa'), (R3MB, '#c9c2b8')): m_['flat'] = h_
floor_rect(r3x0, r3x1, r3y0, r3y1, R3MB)
# --- dinding belakang (barat): strip bergaris · panel TV batu greige ber-LED tersembunyi · plester beige (sisi kursi)
FLY1 = r3y0 + 0.5; TPY0, TPY1 = FLY1 + 0.06, FLY1 + 2.2
B('dasar panel bergaris', xe, xe + 0.03, r3y0, FLY1, 0, H, R3FL)
R.flutes(c, 'panel bergaris ruang 3', r3y0 + 0.01, FLY1 - 0.01, xe + 0.03, 0.0, H - 0.02, R3FL, pitch=0.05, depth=0.016, axis='y', facing=+1)
clad_x(xe, +1, FLY1, r3y1, R3W, t=0.02)
B('panel tv batu ruang 3', xe + 0.02, xe + 0.07, TPY0, TPY1, 0.0, H - 0.5, R3TP, bevel=0.004)
LEDP = R.emit_mat('led panel tv ruang 3 2600K', R.kelvin(2600), float(arg('r3pled', 14.0)))
for ya_, yb_, za_, zb_ in ((TPY0 + 0.02, TPY0 + 0.035, 0.05, H - 0.55), (TPY1 - 0.035, TPY1 - 0.02, 0.05, H - 0.55), (TPY0 + 0.02, TPY1 - 0.02, H - 0.565, H - 0.55)):
    B('led tersembunyi panel tv', xe + 0.021, xe + 0.024, ya_, yb_, za_, zb_, LEDP)   # di balik tepi panel → pendar di dinding
clad_y(r3y0, +1, xe + 0.02, r3x1, R3W, t=0.02); clad_y(r3y1, -1, xe + 0.02, r3x1, R3G, t=0.02)   # dinding samping: beige (selatan) · greige (utara)
# profil dinding (C34 "buat profil2 pada tembok"): plint, list pinggang, bingkai panel bawah & atas, list plafon bertingkat — warna dinding masing-masing
PROFM[0] = wallmat('profil beige ruang 3', '#d6cbbc'); wall_x(xe + 0.02, +1, TPY1 + 0.02, r3y1 - 0.02, bays=[(TPY1 + 0.16, r3y1 - 0.16)], dado=True, low=True)
wall_y(r3y0 + 0.02, +1, xe + 0.05, r3x1, bays=[(xe + 0.3, r3x1 - 0.3)])
PROFM[0] = wallmat('profil greige ruang 3', '#bdb4a6'); wall_y(r3y1 - 0.02, -1, xe + 0.05, r3x1, bays=[(xe + 0.3, 7.1), (7.22, r3x1 - 0.22)], dado=False)
PROFM[0] = NAVYM
for m_, h_ in ((bpy.data.materials['profil beige ruang 3'], '#d6cbbc'), (bpy.data.materials['profil greige ruang 3'], '#bdb4a6')): m_['flat'] = h_
# celah LED plafon sepanjang dinding belakang + sorot sapu dinding (bayangan rusuk & tepi panel tegas)
B('celah led plafon ruang 3', xe + 0.14, xe + 0.2, r3y0 + 0.05, r3y1 - 0.05, H - 0.012, H, R.emit_mat('led celah ruang 3 2600K', R.kelvin(2600), 10.1))
for yy_ in (r3y0 + 0.25, TPY0 + 0.35, TPY1 - 0.35, TPY1 + 0.5, r3y1 - 0.45):
    R.spot(c, 'sapu dinding ruang 3', (xe + 0.17, yy_, H - 0.04), (xe + 0.02, yy_, 0.9), float(arg('r3wash', 480)), R.kelvin(2700), size=0.006, ang=34, blend=0.12)
# --- GLIZA (katalog XIONCO, 249 × 44 × 39 cm: alas walnut berbentuk L + kotak hitam doff) + TV 65" di panel
GLZ = os.path.join(R.ROOT, 'assets', 'items', 'gliza-tv-cabinet-stand', 'model.glb')
gz3, gz3o = R.place(c, GLZ, (xe + 0.5, (TPY0 + TPY1) / 2, 0.0), 90, scale=2.49 / 2.166)
ztg = realign(gz3, gz3o, xe + 0.07 + 0.37, (TPY0 + TPY1) / 2 - 0.05, 0.0)
bpy.context.view_layer.update()
_bx = [o.matrix_world @ Vector(v) for o in gz3o if o.type == 'MESH' and any(s.material and 'hitam' in s.material.name for s in o.material_slots) for v in o.bound_box]
gby0, gby1 = (min(p.y for p in _bx), max(p.y for p in _bx)) if _bx else (TPY0 + 0.6, TPY1 - 0.1)
gbz = max(p.z for p in _bx) if _bx else ztg; gbx = (min(p.x for p in _bx) + max(p.x for p in _bx)) / 2 if _bx else xe + 0.45
tvy3 = (TPY0 + TPY1) / 2                                                  # TV di tengah panel batu (C34), bukan di tengah kotak GLIZA
B('tv bingkai ruang 3', xe + 0.075, xe + 0.105, tvy3 - 0.73, tvy3 + 0.73, 1.2, 2.03, R.flat_mat('tv hitam ruang 3', '#0b0b0c', 0.35))
B('tv layar ruang 3', xe + 0.105, xe + 0.107, tvy3 - 0.715, tvy3 + 0.715, 1.215, 2.015, R.flat_mat('layar tv ruang 3', '#060708', 0.08, coat=0.6))
# aksesori di atas GLIZA (palet beige · greige · hitam, tanpa kuningan Room 2): vas keramik, buku, tempat lilin, mangkuk kayu, patung bulat
BOOK3 = [R.flat_mat('sampul buku cream', '#e4dccd', 0.7), R.flat_mat('sampul buku greige', '#b5ab9c', 0.7), R.flat_mat('sampul buku arang', '#4a4642', 0.7)]
def books3(x, y, z, rot, n=3):
    zz = z
    for k_ in range(n):
        th = (0.035, 0.028, 0.03, 0.025)[k_ % 4]; ob = B('buku ruang 3', -0.14, 0.14, -0.1, 0.1, zz, zz + th, BOOK3[k_ % 3], bevel=0.003)
        ob.location = (x, y, 0); ob.rotation_euler.z = math.radians(rot + k_ * 6); zz += th
    return zz
CER3 = R.flat_mat('keramik greige matte ruang 3', '#c9bfb0', 0.62)
_v1, _v1o = R.place(c, 'ceramic_vase_01', (gbx, gby0 + 0.22, gbz), 0, fit=('z', 0.42)); R.recolor(_v1o, CER3)
_v2, _v2o = R.place(c, 'ceramic_vase_02', (gbx + 0.02, gby0 + 0.42, gbz), 0, fit=('z', 0.22)); R.recolor(_v2o, R.flat_mat('keramik cream ruang 3', '#e8e0d3', 0.3, coat=0.4))
zb3 = books3(gbx, gby1 - 0.35, gbz, 8, 3)
R.place(c, 'wooden_bowl_01', (gbx, gby1 - 0.35, zb3), 0, fit=('x', 0.2))
CNDL = R.flat_mat('tempat lilin hitam', '#1d1c1b', 0.35, 0.9)
for k_, hh_ in enumerate((0.3, 0.24)):
    cx_, cy_ = gbx - 0.04 + k_ * 0.05, gby1 - 0.12 - k_ * 0.06
    lathe('tempat lilin', [(0.0, 0.0), (0.04, 0.0), (0.042, 0.006), (0.012, 0.02), (0.008, hh_ - 0.03), (0.016, hh_ - 0.02), (0.016, hh_), (0.0, hh_)], cx_, cy_, gbz, CNDL)
    R.cyl(c, 'lilin', cx_, cy_, gbz + hh_, gbz + hh_ + 0.09, 0.011, R.flat_mat('lilin gading', '#efe7d8', 0.6))
def top_at(x, y, z0=1.5):
    """Tinggi permukaan teratas di (x, y) — tembak sinar ke bawah."""
    bpy.context.view_layer.update(); hit_, loc_, *_ = sc.ray_cast(bpy.context.evaluated_depsgraph_get(), Vector((x, y, z0)), Vector((0, 0, -1)))
    return loc_.z if hit_ else 0.0
_sy = (r3y0 + gby0) / 2                                                    # alas walnut yang menjorok di selatan kotak hitam
books3(gbx + 0.04, _sy + 0.05, top_at(gbx + 0.04, _sy + 0.05, 0.6), -4, 2)
# --- sisi kursi: lukisan sendiri (lebih kecil), kursi wingback quilted greige, bantal & bangku dry sage kusam, lampu lantai
LKY = (TPY1 + r3y1) / 2
painting_at(xe + 0.022, LKY, 2.15, 1.0, 1.35, os.path.join(ART, 'lukisan-ruang3.jpg'), '+x', fm=R.flat_mat('bingkai tipis gelap', '#2e2a26', 0.4, 0.6))
R.spot(c, 'sorot lukisan ruang 3', (xe + 1.6, LKY - 0.2, H - 0.05), (xe + 0.02, LKY, 2.15), float(arg('r3art', 520)), R.kelvin(2700), size=0.004, ang=13, blend=0.05)
SAGEV = fab('beludru dry sage ruang 3', '#a6a891', 'ph-velour_velvet', 0.3, 0.45); SAGEV['flat'] = '#a6a891'
wg3, wg3o = cz('r3-wing', xe + 0.72, LKY + 0.05, 65, mats={'fab': fab('boucle greige ruang 3', '#a59d90', 'acg-Fabric084', 0.22, 0.12), 'wood': R.tex_mat('ash muda', 'ph-smoked_walnut_veneer', 1.3, tint='#d8cbb4', rmul=0.8, nstr=0.3, hsv=(0.5, 0.0, 2.2))})
_pl3, _pl3o = R.place(c, 'throw_pillows_01', (xe + 0.8, LKY + 0.02, 0.46), 65, fit=('z', 0.3), pick='pillow02'); R.recolor(_pl3o, SAGEV)
R.spot(c, 'sorot kursi ruang 3', (xe + 2.0, LKY - 0.9, H - 0.05), (xe + 0.72, LKY + 0.05, 0.6), float(arg('r3chair', 400)), R.kelvin(2700), size=0.004, ang=14, blend=0.06)
STL3 = R.flat_mat('keramik dry sage kusam', SAGE, 0.75)
STY = LKY + 0.62                                                          # bangku di sisi utara kursi
lathe('bangku drum sage', [(0.0, 0.0), (0.17, 0.0), (0.175, 0.01), (0.15, 0.12), (0.14, 0.26), (0.15, 0.4), (0.185, 0.47), (0.19, 0.5), (0.0, 0.5)], xe + 0.98, STY, 0.0, STL3)
books3(xe + 0.98, STY, 0.5, 20, 2)
R.place(c, 'ceramic_pot', (xe + 0.94, STY + 0.08, 0.555), 0, fit=('z', 0.09))
LMPB = R.flat_mat('perunggu gelap lampu lantai', '#4a3f35', 0.35, 1.0)
lx3, ly3 = xe + 0.3, LKY - 0.62                                            # lampu lantai di sisi selatan kursi, kepala condong ke kursi
R.cyl(c, 'alas lampu lantai', lx3, ly3, 0.0, 0.02, 0.14, LMPB); R.cyl(c, 'tiang lampu lantai', lx3, ly3, 0.02, 1.5, 0.008, LMPB)
B('lengan lampu lantai', lx3 - 0.006, lx3 + 0.006, ly3, ly3 + 0.28, 1.49, 1.5, LMPB)
R.cyl(c, 'kepala lampu lantai', lx3, ly3 + 0.3, 1.46, 1.5, 0.075, LMPB); R.cyl(c, 'difuser lampu lantai', lx3, ly3 + 0.3, 1.455, 1.46, 0.068, R.emit_mat('difuser lampu lantai', R.kelvin(2600), 8.0))
R.spot(c, 'lampu lantai ruang 3', (lx3, ly3 + 0.3, 1.44), (lx3 + 0.3, ly3 + 0.6, 0.45), 70, R.kelvin(2600), size=0.01, ang=50, blend=0.2)
RUG3 = R.tex_mat('karpet tali greige', 'ph-poly_wool_herringbone', 0.5, tint='#d2c9bb', rough=0.97, nstr=1.0, sheen=0.3, hsv=(0.5, 0.1, 1.75)); RUG3['flat'] = '#cfc6b8'
lathe('karpet bulat anyaman tali', [(0.0, 0.016)] + [(r_ / 100 * 0.9, 0.009 + 0.008 * abs(math.sin(math.pi * r_ / 3.2))) for r_ in range(2, 100)] + [(0.9, 0.004), (0.9, 0.0)], xe + 1.3, LKY - 0.2, 0.0, RUG3, seg=160)
# lampu gantung piring putih di atas sisi kursi (cahaya dari plafon, C17.1)
DISC = R.flat_mat('piring lampu putih susu', '#efeae2', 0.45)
pcx, pcy, pz = xe + 1.2, LKY - 0.3, 2.55
R.cyl(c, 'kabel lampu gantung', pcx, pcy, pz + 0.05, H, 0.002, M['black']); R.cyl(c, 'kanopi lampu gantung', pcx, pcy, H - 0.025, H, 0.06, DISC)
lathe('piring lampu gantung', [(0.0, 0.07), (0.05, 0.068), (0.2, 0.04), (0.3, 0.012), (0.31, 0.0), (0.0, 0.0)], pcx, pcy, pz, DISC)
R.cyl(c, 'difuser lampu gantung', pcx, pcy, pz - 0.004, pz, 0.24, R.emit_mat('difuser gantung 2600K', R.kelvin(2600), 5.0))
R.spot(c, 'lampu gantung ruang 3', (pcx, pcy, pz - 0.02), (pcx, pcy, 0.0), float(arg('r3pend', 128)), R.kelvin(2600), size=0.06, ang=95, blend=0.4)
R.point(c, 'lampu gantung atas ruang 3', (pcx, pcy, pz + 0.1), 17.4, R.kelvin(2600), size=0.1)
# (cermin lengkung dibuang 29 Okt, C37 "hilangkan cerminnya")
mcx = 7.72
# --- tanaman (daun diredam, tidak mencolok) dalam pot batu greige di sudut tenggara
_p3, _p3o = plant('potted_plant_02', r3x1 - 0.36, r3y0 + 0.36, 1.05, 30)
R.recolor(_p3o, R.tex_mat('pot batu greige ruang 3', 'ph-white_plaster_02', 0.5, tint='#bdb4a7', rough=0.75, nstr=0.6, hsv=(0.5, 0.2, 1.2)), name_has=['_pot'])
for sl in [sl for o in _p3o for sl in o.material_slots if sl.material and 'leaves' in sl.material.name]:
    m_ = sl.material; b_ = principled(m_); lk_ = b_.inputs['Base Color'].links
    if lk_ and not m_.get('muted'):
        hs_ = m_.node_tree.nodes.new('ShaderNodeHueSaturation'); hs_.inputs['Saturation'].default_value = 0.5; hs_.inputs['Value'].default_value = 0.82
        m_.node_tree.links.new(lk_[0].from_socket, hs_.inputs['Color']); m_.node_tree.links.new(hs_.outputs['Color'], b_.inputs['Base Color']); m_['muted'] = 1; m_['flat'] = '#6d7360'
# --- sorot tambahan (C33): benda di GLIZA, kursi, cermin, tanaman, karpet — berkas sempit bertepi tegas, 2700K
K27 = R.kelvin(2700)
downlight(xe + 0.95, gby0 + 0.3, (gbx, gby0 + 0.3, gbz + 0.2), 218, ang=20, blend=.08, color=K27)
downlight(xe + 0.95, gby1 - 0.3, (gbx, gby1 - 0.3, gbz + 0.1), 218, ang=20, blend=.08, color=K27)
for wx_ in (6.95, 7.95):                                                  # sapu dinding samping berprofil (utara & selatan)
    downlight(wx_, r3y1 - 0.45, (wx_, r3y1 - 0.03, 1.5), 384, ang=24, blend=.08, color=K27); downlight(wx_, r3y0 + 0.45, (wx_, r3y0 + 0.03, 1.5), 384, ang=24, blend=.08, color=K27)
for dy_ in (-0.55, 0.55): downlight(xe + 1.05, LKY + dy_, (xe + 0.8, LKY + dy_ * 0.6, 0.5), 384, ang=22, blend=.08, color=K27)   # sisi kursi & bangku
downlight(xe + 0.95, (gby0 + gby1) / 2, (gbx, (gby0 + gby1) / 2, gbz), 218, ang=22, blend=.1, color=K27)                 # tengah GLIZA
downlight(r3x1 - 0.55, r3y0 + 0.55, (r3x1 - 0.36, r3y0 + 0.36, 0.9), 179, ang=24, blend=.1, color=K27)
downlight(xe + 1.3, LKY - 0.2, (xe + 1.3, LKY - 0.2, 0.0), 141, ang=30, blend=.15, color=K27)
downlight(xe + 1.6, (TPY0 + TPY1) / 2, (xe + 0.08, tvy3, 2.4), 154, ang=24, blend=.1, color=K27)   # cahaya ke panel di atas TV
for o in [o for o in sc.objects if o.type == 'LIGHT' and o.name.split('.')[0] in ('sapu dinding ruang 3', 'sorot lukisan ruang 3', 'lampu lantai ruang 3', 'lampu gantung ruang 3', 'lampu gantung atas ruang 3', 'sorot kursi ruang 3')]:
    o['livek'] = 3200; o['livee'] = 0.6    # 29 Okt C39: umum seperti sebelumnya, terang ditambah lewat sorot

# ---------------------------------------------------------------- KORIDOR 3 PODIUM (G4 · Dinding pajang, kamera 5)
#  Referensi pemilik 28 Okt (data/source/galeri-ref/koridor-podium-ref.png): "ikuti ini semua profilannya juga" → dinding abu
#  hangat berpanel profil DUA TINGKAT (panel bawah · list pinggang · panel atas tinggi), plint & list plafon cream bertingkat,
#  plafon turun bertingkat ber-cove LED + sorot kecil, lampu dinding lengan kuningan + kap kain gading berpasangan, lantai marmer
#  besar dipasang memanjang, konsol walnut bertopi marmer + vas hortensia putih + cermin berbingkai kayu, di ujung sofa kecil
#  Customize cream + 4 pigura 2×2 + 2 lampu meja. Barang di 3 podium tetap yang lama sampai pemilik mengirim gantinya (C23.2).
import bmesh, random
yN = Y(145) + T / 2; KY0, KY1 = yN, y1; KYM = (KY0 + KY1) / 2               # koridor utara: muka dinding T ↔ tembok utara
KGRY, KTRIM, KCRM = '#9a968f', '#aaa59d', '#ddd6ca'                         # abu hangat dinding · bingkai panel · plint/list cream
KWALL = wallmat('abu hangat koridor', KGRY); KFR = wallmat('profil abu koridor', KTRIM); KCR = R.flat_mat('cat cream koridor', KCRM, 0.45)
KMARB = R.add_grout(R.tex_mat('marmer koridor', 'stone-calacatta', 1.4, tint='#d2cbc0', rough=0.12, coat=0.3, nstr=0.08, hsv=(0.5, 0.2, 1.0)), w=1.2, h=0.6, gap=0.0012, col_hex='#a8a097', offset=0.5)
KMARBT = R.tex_mat('marmer podium koridor', 'stone-calacatta', 0.8, tint='#e3ddd3', rough=0.16, coat=0.25, nstr=0.05)
KPOD = R.flat_mat('cat podium cream', '#d6cdbf', 0.5)
SHADE = R.flat_mat('kap kain gading', '#ebdfcb', 0.92, emit=R.kelvin(2450), estr=0.8); SHADE['emit'] = list(R.kelvin(2700)); SHADE['estr'] = 2.2   # 3D langsung: kap menyala
KCERAM = R.tex_mat('keramik cream koridor', 'ph-clay_plaster', 0.3, tint='#d6c9b3', rough=0.25, nstr=0.2, coat=0.5)
MIRROR = R.flat_mat('cermin', '#e6e6e3', 0.02, 1.0)
for m_, h_ in ((KWALL, KGRY), (KFR, KTRIM), (KMARB, '#cfc8bd'), (KMARBT, '#ddd6cb'), (KCERAM, '#d6c9b3'), (MIRROR, '#9aa0a3')): m_['flat'] = h_
floor_rect(x0, x1, KY0, KY1, KMARB)
ZS = 4.40                                                                  # bawah plafon turun koridor

def kp_y(yf, s, xa, xb, za, zb, d, m, bv=0.004):
    return B('profil koridor', xa, xb, yf if s > 0 else yf - d, yf + d if s > 0 else yf, za, zb, m, bevel=bv)
def kp_x(xf, s, ya, yb, za, zb, d, m, bv=0.004):
    return B('profil koridor', xf if s > 0 else xf - d, xf + d if s > 0 else xf, ya, yb, za, zb, m, bevel=bv)
def kframe(face, f, s, a, b, za, zb, m=None, k=1.0):
    """Bingkai panel profil 2 lapis (strip datar + manik menonjol), seperti list panel di referensi."""
    P_, m = (kp_y if face == 'y' else kp_x), (m or KFR)
    for w_, d_, ins in ((0.055 * k, 0.010, 0.0), (0.022 * k, 0.022, 0.028 * k)):
        a2, b2, z2, z3 = a + ins, b - ins, za + ins, zb - ins
        P_(f, s, a2, b2, z2, z2 + w_, d_, m); P_(f, s, a2, b2, z3 - w_, z3, d_, m)
        P_(f, s, a2, a2 + w_, z2 + w_, z3 - w_, d_, m); P_(f, s, b2 - w_, b2, z2 + w_, z3 - w_, d_, m)
def kwall(face, f, s, a, b, bays, low=True, lows=None):
    """Satu bidang dinding koridor: cat abu hangat, plint cream, panel bawah, list pinggang, panel atas, list plafon bertingkat."""
    P_ = kp_y if face == 'y' else kp_x
    (clad_y if face == 'y' else clad_x)(f, s, a, b, KWALL, 0.0, ZS + 0.02, t=0.012)
    f2 = f + s * 0.012
    P_(f2, s, a, b, 0.0, 0.17, 0.018, KCR, 0.006); P_(f2, s, a, b, 0.17, 0.19, 0.026, KCR, 0.006)          # plint 19 cm
    P_(f2, s, a, b, 0.96, 1.02, 0.024, KFR, 0.008); P_(f2, s, a, b, 1.02, 1.04, 0.014, KFR, 0.004)          # list pinggang
    P_(f2, s, a, b, ZS - 0.24, ZS - 0.22, 0.016, KCR); P_(f2, s, a, b, ZS - 0.15, ZS - 0.06, 0.04, KCR, 0.01)
    P_(f2, s, a, b, ZS - 0.06, ZS, 0.075, KCR, 0.012)                                                       # list plafon 3 tingkat
    for ba, bb in (lows if lows is not None else bays):
        if low: kframe(face, f2, s, ba, bb, 0.30, 0.84)
    for ba, bb in bays: kframe(face, f2, s, ba, bb, 1.18, ZS - 0.40)
    return f2
def tube(name, pts, r, mat):
    """Pipa lengkung (lengan lampu) → mesh."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1)
    for p_, q_ in zip(sp.points, pts): p_.co = (*q_, 1.0)
    sp.order_u = 3; sp.use_endpoint_u = True; sp.resolution_u = 16
    ob = bpy.data.objects.new(name, cu); c.objects.link(ob); bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob, do_unlink=True); me.materials.clear(); me.materials.append(mat)
    for p_ in me.polygons: p_.use_smooth = True
    mo = bpy.data.objects.new(name, me); c.objects.link(mo); return mo
def sconce_y(x, yf, s, zc=2.05, energy=32):
    """Lampu dinding: pelat kuningan, lengan S, mangkuk lilin, kap empire kain gading menyala; cahaya ke atas & bawah."""
    yy = lambda d: yf + s * d
    B('pelat lampu dinding', x - 0.038, x + 0.038, min(yy(0), yy(0.016)), max(yy(0), yy(0.016)), zc - 0.30, zc - 0.10, M['brass'], bevel=0.012)
    tube('lengan lampu dinding', [(x, yy(0.012), zc - 0.21), (x, yy(0.10), zc - 0.27), (x, yy(0.19), zc - 0.21), (x, yy(0.21), zc - 0.11)], 0.0075, M['brass'])
    R.cyl(c, 'mangkuk lampu dinding', x, yy(0.21), zc - 0.115, zc - 0.075, 0.024, M['brass'])
    R.cyl(c, 'lilin lampu dinding', x, yy(0.21), zc - 0.075, zc + 0.0, 0.011, KCR)
    sh = lathe('kap lampu dinding', [(0.135, 0.0), (0.12, 0.08), (0.088, 0.22)], x, yy(0.21), zc - 0.10, SHADE)
    sh.modifiers.new('tebal', 'SOLIDIFY').thickness = 0.003
    R.point(c, 'lampu dinding koridor', (x, yy(0.21), zc - 0.0), energy, R.kelvin(2700), size=0.02)
OPAL = R.flat_mat('kaca opal CL03', '#eadcc6', 0.45, emit=R.kelvin(2350), estr=1.35); OPAL['emit'] = list(R.kelvin(3500)); OPAL['estr'] = 1.3   # 29 Okt C25: putih hangat, lebih redup
def lathe_y(name, prof, x, y, z, s, mat, seg=64):
    """Benda putar dengan sumbu tegak lurus dinding ±y (pelat & lengan lampu dinding)."""
    ob = lathe(name, prof, 0.0, 0.0, 0.0, mat, seg=seg); ob.rotation_euler.x = math.radians(-90 * s); ob.location = (x, y, z); return ob
def cl03_y(x, yf, s, zc=1.95):
    """VOID CLOUD CL03 (katalog XIONCO, 10 × 12 × 34 cm): pelat bulat & lengan kuningan, cincin kuningan di tengah, dua kaca opal
    beku (atas lebih panjang, ujung membulat). Cahaya keluar ke atas & ke bawah → berkas bertepi tegas di dinding (seperti foto toko)."""
    yy = lambda d: yf + s * d; e = float(arg('kcl', 36))
    lathe_y('pelat CL03', [(0.0, 0.0), (0.047, 0.0), (0.047, 0.006), (0.043, 0.016), (0.0, 0.018)], x, yf, zc, s, M['brass'])
    lathe_y('lengan CL03', [(0.0085, 0.016), (0.0085, 0.064)], x, yf, zc, s, M['brass'])
    R.cyl(c, 'cincin CL03', x, yy(0.07), zc - 0.018, zc + 0.018, 0.03, M['brass'])
    lathe('kaca atas CL03', [(0.026, 0.0), (0.042, 0.012), (0.05, 0.03), (0.05, 0.12), (0.046, 0.148), (0.034, 0.165), (0.0, 0.172)], x, yy(0.07), zc + 0.018, OPAL)
    lathe('kaca bawah CL03', [(0.0, -0.134), (0.034, -0.128), (0.046, -0.112), (0.05, -0.09), (0.05, -0.03), (0.042, -0.012), (0.026, 0.0)], x, yy(0.07), zc - 0.018, OPAL)
    R.spot(c, 'lampu CL03', (x, yy(0.07), zc + 0.2), (x, yy(0.07), H), e, R.kelvin(2600), size=0.025, ang=105, blend=0.3)
    R.spot(c, 'lampu CL03', (x, yy(0.07), zc - 0.16), (x, yy(0.07), 0.0), e * 0.8, R.kelvin(2600), size=0.025, ang=100, blend=0.3)
KDLM = R.emit_mat('downlight koridor 2400K', R.kelvin(2400), 30.0)
def kdl(x, y, aim, energy=150, ang=22, blend=.12):
    """Sorot kecil tertanam di plafon turun (z = ZS), berkas terfokus."""
    B('cincin dl', x - 0.045, x + 0.045, y - 0.045, y + 0.045, ZS - 0.006, ZS, M['rim'])
    B('cakram dl', x - 0.03, x + 0.03, y - 0.03, y + 0.03, ZS - 0.008, ZS - 0.006, KDLM)
    R.spot(c, 'sorot koridor', (x, y, ZS - 0.03), aim, energy * (ZS / 3.4) ** 1.3, R.kelvin(2500), size=0.008, ang=ang, blend=blend)

# --- dinding: muka utara dinding T (3 podium), tembok utara (konsol + cermin, mengapit jendela), ujung barat (sofa), ujung timur
PC = [(X(160) + X(205)) / 2, (X(208) + X(252)) / 2, (X(255) + X(300)) / 2]   # pusat 3 podium
B('dinding T sambungan', X(140), X(150), Y(145) - T / 2, Y(145) + T / 2, 0, H, M['beige'])   # tutup celah 32 cm ke tepi Room 4 (dulu tampak hitam dari koridor)
kwall('y', yN, +1, X(140), X(312), [(p_ - 0.55, p_ + 0.55) for p_ in PC])
clad_x(X(140), -1, Y(145) - T / 2 - 0.1, yN + 0.012, KWALL, 0.0, ZS + 0.02, t=0.012); kdl(X(140) - 0.35, KY0 + 0.2, (X(140), Y(145), 1.3), 90, ang=30, blend=.1); clad_x(X(312), +1, Y(145) - T / 2, yN + 0.012, KWALL, 0.0, ZS + 0.02, t=0.012)
KCX = 3.4                                                                  # konsol + cermin di tembok utara (barat jendela)
kwall('y', y1, -1, x0, X(250), [(0.35, 1.75), (KCX - 0.85, KCX + 0.85), (5.05, X(250) - 0.3)])
kwall('y', y1, -1, X(330), x1, [(X(330) + 0.35, 11.0), (11.4, x1 - 0.35)])
kwall('x', x0, +1, KY0 - 0.1, KY1, [(KYM - 0.95, KYM + 0.95)], lows=[(KY0 + 0.3, KYM - 0.06), (KYM + 0.06, KY1 - 0.3)])
kwall('x', x1, -1, KY0 - 0.1, KY1, [(KY0 + 0.35, KYM - 0.1), (KYM + 0.1, KY1 - 0.35)])
for xs_ in (X(150) + 0.245, (PC[0] + PC[1]) / 2, (PC[1] + PC[2]) / 2, X(312) - 0.26): cl03_y(xs_, yN + 0.012, +1)
for xs_ in (KCX - 1.25, KCX + 1.25): cl03_y(xs_, y1 - 0.012, -1)

# --- plafon turun bertingkat: bingkai keliling + 2 balok silang → 3 kotak; tingkat ke-2 + cove LED 2700K tersembunyi
SW, STP = 0.42, 0.14
KCOVE = R.emit_mat('cove koridor 2300K', R.kelvin(2300), float(arg('kcove', 24.0)))   # 29 Okt C26: plafon lebih hangat
B('plafon turun koridor', x0, x1, KY0, KY0 + SW, ZS, H, M['white']); B('plafon turun koridor', x0, x1, KY1 - SW, KY1, ZS, H, M['white'])
TRAYS = [(x0 + SW, 3.2), (3.7, 8.4), (8.9, x1 - SW)]
for a_, b_ in ((x0, x0 + SW), (3.2, 3.7), (8.4, 8.9), (x1 - SW, x1)): B('balok plafon koridor', a_, b_, KY0 + SW, KY1 - SW, ZS, H, M['white'])
for ta, tb in TRAYS:
    qa, qb = KY0 + SW, KY1 - SW
    for xa_, xb_, ya_, yb_ in ((ta, tb, qa, qa + STP), (ta, tb, qb - STP, qb), (ta, ta + STP, qa + STP, qb - STP), (tb - STP, tb, qa + STP, qb - STP)):
        B('plafon tingkat 2', xa_, xb_, ya_, yb_, 4.58, 4.70, M['white'])
    for xa_, xb_, ya_, yb_ in ((ta, tb, qa, qa + 0.03), (ta, tb, qb - 0.03, qb), (ta, ta + 0.03, qa + 0.03, qb - 0.03), (tb - 0.03, tb, qa + 0.03, qb - 0.03)):
        B('led cove koridor', xa_, xb_, ya_, yb_, 4.70, 4.712, KCOVE)

# --- 3 podium berprofil (badan cream satin, plint & list cream, topi marmer) + barang lama (sementara, C23.2)
for k_, p_ in enumerate(PC):
    pa, pb, q0, q1 = p_ - 0.42, p_ + 0.42, yN + 0.25, yN + 0.85
    B('podium plint', pa - 0.03, pb + 0.03, q0 - 0.03, q1 + 0.03, 0.0, 0.1, KCR, bevel=0.006)
    B('podium badan', pa, pb, q0, q1, 0.1, 0.9, KPOD, bevel=0.004)
    B('podium list atas', pa - 0.022, pb + 0.022, q0 - 0.022, q1 + 0.022, 0.9, 0.95, KCR, bevel=0.01)
    B('podium marmer', pa - 0.035, pb + 0.035, q0 - 0.035, q1 + 0.035, 0.95, 1.0, KMARBT, bevel=0.006)
    kframe('y', q1, +1, pa + 0.08, pb - 0.08, 0.2, 0.82, KCR, k=0.7)
    kframe('x', pa, -1, q0 + 0.08, q1 - 0.08, 0.2, 0.82, KCR, k=0.7); kframe('x', pb, +1, q0 + 0.08, q1 - 0.08, 0.2, 0.82, KCR, k=0.7)
    kdl(p_, KY0 + 0.24, (p_, yN + 0.55, 1.12), float(arg('kpod', 110)), ang=20)
    R.spot(c, 'sorot bayangan podium', (p_ + 0.45, KY1 - 0.5, ZS - 0.05), (p_, yN + 0.55, 1.25), float(arg('khard', 380)), R.kelvin(2600), size=0.004, ang=13, blend=0.06)   # bayangan tegas ke panel
put('aether-k40', PC[0], yN + 0.55, 0, z=1.0)
R.place(c, 'marble_bust_01', (PC[1], yN + 0.55, 1.0), 180, fit=('z', 0.52))
R.place(c, 'antique_ceramic_vase_01', (PC[2], yN + 0.55, 1.0), 0, fit=('z', 0.5))

# --- konsol walnut bertopi marmer + cermin berbingkai kayu + vas hortensia putih (tembok utara)
ky1 = y1 - 0.012 - 0.04; ky0 = ky1 - 0.42
for lx in (KCX - 0.56, KCX + 0.56):
    for ly in (ky0 + 0.04, ky1 - 0.04): B('kaki konsol', lx - 0.025, lx + 0.025, ly - 0.025, ly + 0.025, 0.0, 0.13, M['walnut'], bevel=0.006)
B('badan konsol', KCX - 0.6, KCX + 0.6, ky0, ky1, 0.13, 0.84, M['walnut'], bevel=0.004)
for cx_ in ((KCX - 0.585, KCX - 0.006), (KCX + 0.006, KCX + 0.585)):
    for za_, zb_ in ((0.15, 0.37), (0.385, 0.605), (0.62, 0.825)):
        B('muka laci konsol', cx_[0], cx_[1], ky0 - 0.012, ky0, za_, zb_, M['walnut'], bevel=0.004)
        R.sphere(c, 'kenop laci', ((cx_[0] + cx_[1]) / 2, ky0 - 0.024, (za_ + zb_) / 2), 0.014, M['brass'])
B('topi marmer konsol', KCX - 0.625, KCX + 0.625, ky0 - 0.03, ky1, 0.84, 0.87, KMARBT, bevel=0.008)
my0, my1 = y1 - 0.012 - 0.036 - 0.045, y1 - 0.012 - 0.036
for xa_, xb_, za_, zb_ in ((KCX - 0.47, KCX + 0.47, 1.10, 1.18), (KCX - 0.47, KCX + 0.47, 2.42, 2.50), (KCX - 0.47, KCX - 0.39, 1.18, 2.42), (KCX + 0.39, KCX + 0.47, 1.18, 2.42)):
    B('bingkai cermin', xa_, xb_, my0, my1, za_, zb_, M['walnut'], bevel=0.01)
B('cermin', KCX - 0.39, KCX + 0.39, my0 + 0.02, my0 + 0.024, 1.18, 2.42, MIRROR)
B('punggung cermin', KCX - 0.39, KCX + 0.39, my0 + 0.024, my1, 1.18, 2.42, M['walnut'])
_v, _vo = R.place(c, 'ceramic_vase_04', (KCX - 0.2, (ky0 + ky1) / 2, 0.87), 0, fit=('z', 0.3))
R.recolor(_vo, R.tex_mat('keramik beige vas koridor', 'ph-clay_plaster', 0.3, tint='#cdb99c', rough=0.55, nstr=0.3))
B('kotak kayu kecil', KCX + 0.22, KCX + 0.42, (ky0 + ky1) / 2 - 0.06, (ky0 + ky1) / 2 + 0.07, 0.87, 0.95, M['walnut'], bevel=0.006)
def hydrangea(cx, cy, cz, seed=5):
    """Rangkaian hortensia putih: 7 kepala bunga, tiap kepala ±95 kuntum pipih di permukaan bola + beberapa daun."""
    rnd = random.Random(seed); PW = [R.flat_mat('kelopak hortensia putih', '#efede6', 0.62), R.flat_mat('kelopak hortensia hijau muda', '#e4e7d8', 0.62)]
    heads = [(cx, cy, cz + 0.15, 0.085)] + [(cx + 0.12 * math.cos(a_), cy + 0.12 * math.sin(a_), cz + 0.07 + rnd.uniform(-0.02, 0.03), 0.078) for a_ in [2 * math.pi * k / 6 + 0.3 for k in range(6)]]
    for hi, (hx, hy, hz, hr) in enumerate(heads):
        bm = bmesh.new(); n = 95
        for i in range(n):
            zz = 1 - 1.55 * (i + 0.5) / n; rr = math.sqrt(max(0.0, 1 - zz * zz)); th = i * 2.39996
            nv = Vector((rr * math.cos(th), rr * math.sin(th), zz)).normalized()
            p = Vector((hx, hy, hz)) + nv * hr * rnd.uniform(0.94, 1.04)
            mt = Matrix.Translation(p) @ nv.to_track_quat('Z', 'Y').to_matrix().to_4x4() @ Matrix.Diagonal((1.0, 1.0, 0.42, 1.0))
            bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.0175 * rnd.uniform(0.85, 1.1), matrix=mt)
        me = bpy.data.meshes.new('hortensia'); bm.to_mesh(me); bm.free()
        for p_ in me.polygons: p_.use_smooth = True
        ob = bpy.data.objects.new('kepala hortensia', me); c.objects.link(ob); me.materials.append(PW[hi % 2])
    LEAF = R.flat_mat('daun hortensia', '#55603f', 0.55)
    for k in range(6):
        a_ = 2 * math.pi * k / 6 + 0.05
        lf = R.sphere(c, 'daun hortensia', (cx + 0.19 * math.cos(a_), cy + 0.19 * math.sin(a_), cz - 0.0), 0.075, LEAF, sz=0.08)
        lf.scale.y = 0.45; lf.rotation_euler = (0, math.radians(18), a_)
hydrangea(KCX - 0.2, (ky0 + ky1) / 2, 0.87 + 0.3)
kdl(KCX, KY1 - 0.24, (KCX, ky0 + 0.15, 0.9), 110, ang=26)

# --- ujung barat: sofa kecil Customize (2 dudukan, lengan english, sandaran tight, linen, kaki walnut bubut) + 4 pigura + 2 lampu meja
SFAB = fab('linen cream koridor', '#d8cfc1', 'fabric-linen', 0.3, 0.35); SFAB['flat'] = '#d8cfc1'
st_, sto_ = cz('kr-settee', x0 + 0.53, KYM, 90, mats={'fab': SFAB, 'wood': M['walnut']})
for k_, (dy_, dz_) in enumerate(((-0.27, 2.17), (0.27, 2.17), (-0.27, 1.63), (0.27, 1.63))):
    painting_at(x0 + 0.014, KYM + dy_, dz_, 0.44, 0.44, os.path.join(ART, 'cetak-koridor-%d.jpg' % (k_ + 1)), '+x', fm=M['brass'])
def klamp(x, y, zt):
    lathe('kaki lampu meja koridor', [(0.0, 0.0), (0.06, 0.0), (0.066, 0.01), (0.05, 0.022), (0.085, 0.09), (0.096, 0.15), (0.08, 0.22), (0.036, 0.28), (0.03, 0.305), (0.016, 0.315), (0.011, 0.40), (0.0, 0.40)], x, y, zt, KCERAM)
    sh = lathe('kap lampu meja koridor', [(0.17, 0.0), (0.13, 0.24)], x, y, zt + 0.33, SHADE); sh.modifiers.new('tebal', 'SOLIDIFY').thickness = 0.003
    R.point(c, 'lampu meja koridor', (x, y, zt + 0.46), 55, R.kelvin(2700), size=0.05)
for sy_ in (-1, 1):
    tx_, ty_ = x0 + 0.34, KYM + sy_ * 1.18
    R.cyl(c, 'alas meja samping', tx_, ty_, 0.0, 0.03, 0.16, M['walnut']); R.cyl(c, 'tiang meja samping', tx_, ty_, 0.03, 0.56, 0.032, M['walnut'])
    R.cyl(c, 'daun meja samping', tx_, ty_, 0.56, 0.6, 0.23, M['walnut'])
    klamp(tx_, ty_, 0.6)
for dy_ in (-0.45, 0.45): kdl(x0 + 0.42, KYM + dy_, (x0 + 0.01, KYM + dy_, 1.9), 85, ang=24, blend=.08)
# 3D langsung: lampu koridor diekspor lebih netral (3800K) — 2700K membuat dinding abu terbaca cokelat di panggung web
for o in [o for o in sc.objects if o.type == 'LIGHT' and o.name.split('.')[0] in ('lampu CL03', 'sorot koridor', 'lampu meja koridor', 'sorot bayangan podium')]:
    o['livek'] = 3000; o['livee'] = {'lampu CL03': 0.12, 'sorot bayangan podium': 0.55}.get(o.name.split('.')[0], 1.0)   # panggung web lebih silau dari Cycles

# ==========================================================================
#  ROOM 4 · kiri atas — RUANG DUDUK (29 Okt, C43–C47): 4 referensi pemilik (data/source/galeri-ref/room4-ref-forest.webp + 3 di Catatan user)
#  Palet: Olivine 18-0316 (hijau hutan tua) · Chocolate Cremoso 19-1117 (walnut) · Oat Milk 13-0003 + abu batu; konsep C2.2 grey + beige, aksen dark forest green.
#  Dinding belakang sofa hijau tua berprofil + lukisan sendiri + lampu dinding hitam atas-bawah; ceruk rak walnut; dinding utara semen halus berlapis (C48: ganti ubin batu);
#  sofa linen beige Customize + bantal hijau tua/taupe/cokelat + selendang hijau tua; kursi lounge walnut kulit hitam; meja kopi walnut; meja samping
#  drum batu + lampu jamur; konsol walnut melayang + 3 cetak hutan sendiri; pouf hijau tua; lantai herringbone oak muda + karpet abu; sorot rel hitam,
#  lampu gantung piring linen, lampu lantai kap linen; 2700K, terang dari sorot (C39); tanpa jendela & cermin.
# ==========================================================================
GREY4, BEIGE4, FOREST = '#7d7a73', '#cfc8bc', '#2f3d30'
OLIVE4, TAUPE4, CHOC4 = '#4f5a48', '#8a7f70', '#5a3e30'
r4x0, r4x1, r4y0, r4y1 = X(140), xw, Y(293) + T / 2, Y(145) - T / 2
r4y = (r4y0 + r4y1) / 2
R4F = R.tex_mat('lantai herringbone oak ruang 4', 'ph-herringbone_parquet', 1.0, tint='#cdb595', rough=0.5, nstr=0.4, hsv=(0.5, 0.3, 1.3)); R4F['flat'] = '#c9b393'
floor_rect(r4x0, r4x1, r4y0, r4y1, R4F)
R4G = wallmat('hijau hutan tua ruang 4', OLIVE4); R4O = wallmat('oat milk ruang 4', BEIGE4)
# C48 (29 Okt): ubin batu 60×30 terbaca seperti bata → plester semen halus (microcement) tanpa nat, belang lembut diredam
R4S = R.tex_mat('semen halus ruang 4', 'room-floor-concrete', 2.6, tint='#aca79d', rough=0.72, nstr=0.15, hsv=(0.5, 0.0, 1.25), mute=0.6); R4S['flat'] = '#9f9a91'
R4J = R.flat_mat('celah bayangan ruang 4', '#2a2826', 0.9)
for m_, h_ in ((R4G, OLIVE4), (R4O, BEIGE4)): m_['flat'] = h_
GY0, GY1 = r4y0 + 0.55, r4y0 + 4.3                                         # bidang hijau di dinding belakang (timur)
NY0, NY1 = GY1 + 0.05, GY1 + 0.7                                          # ceruk rak walnut
# DINDING BERLAPIS (C48): lapis 0 = dinding oat; lapis 1 = panel hijau maju DG dengan celah bayangan gelap di kedua sisi;
# lapis 2 = bidang tengah hijau maju lagi DR di belakang sofa (lukisan di atasnya); utara: semen dasar + lempeng semen maju + LED cove
DG, DR = 0.08, 0.035
clad_x(xw, -1, r4y0, GY0, R4O, t=0.012)
B('celah bayangan hijau', xw - 0.02, xw, GY0 - 0.04, GY1 + 0.04, 0.0, H - 0.02, R4J)
B('panel hijau maju', xw - DG, xw - 0.012, GY0, GY1, 0.0, H - 0.02, R4G)
B('panel hijau tengah maju', xw - DG - DR, xw - DG, GY0 + 0.95, GY1 - 0.95, 1.18, H - 0.5, R4G, bevel=0.004)
clad_y(r4y0, +1, r4x0, xw, R4O, t=0.012)
clad_x(xw, -1, NY1, r4y1, R4S, t=0.012)                                    # sudut timur laut: semen halus
clad_y(r4y1, -1, r4x0 + 0.45, xw, R4S, t=0.012)                            # dinding utara: semen halus (lapis dasar)
SLX0, SLX1, SLZ = r4x0 + 0.75, xw - 0.3, H - 1.15
B('lempeng semen maju', SLX0, SLX1, r4y1 - 0.012 - 0.14, r4y1 - 0.012, 0.06, SLZ, R4S, bevel=0.006)   # lapis 1 utara
B('celah plint semen', SLX0 + 0.03, SLX1 - 0.03, r4y1 - 0.012 - 0.12, r4y1 - 0.012, 0.0, 0.06, R4J)  # plint tersembunyi → lempeng melayang
B('led cove lempeng semen', SLX0 + 0.04, SLX1 - 0.04, r4y1 - 0.012 - 0.03, r4y1 - 0.012 - 0.015, SLZ, SLZ + 0.008, R.emit_mat('led cove semen 2700K', R.kelvin(2700), 9.0))
B('sayap depan', r4x0, r4x0 + 0.45, r4y1 - 0.3, r4y1, 0, H, R4O)
# profil: bidang hijau (plint, list pinggang, bingkai bawah & atas, list plafon) senada hijau; dinding selatan oat milk
PROFM[0] = wallmat('profil hijau ruang 4', '#56614f'); wall_x(xw - DG, -1, GY0, GY1, bays=[(GY0 + 0.15, GY0 + 0.85), (GY1 - 0.85, GY1 - 0.15)], dado=True, low=True)
PROFM[0] = wallmat('profil oat ruang 4', '#c8c0b3'); wall_y(r4y0 + 0.012, +1, r4x0 + 0.05, xw - 0.02, bays=[(r4x0 + 0.35, xw - 0.35)])
PROFM[0] = NAVYM
for nm_, h_ in (('profil hijau ruang 4', '#56614f'), ('profil oat ruang 4', '#c8c0b3')): bpy.data.materials[nm_]['flat'] = h_
# ceruk rak walnut built-in (antara bidang hijau & ubin batu)
WN = M['walnut']; nd4 = 0.36
B('ceruk rak sisi a', xw - nd4, xw, NY0, NY0 + 0.03, 0.0, 3.1, WN); B('ceruk rak sisi b', xw - nd4, xw, NY1 - 0.03, NY1, 0.0, 3.1, WN)
B('ceruk rak punggung', xw - 0.03, xw, NY0, NY1, 0.0, 3.1, WN); B('ceruk rak atas', xw - nd4, xw, NY0, NY1, 3.07, 3.1, WN)
B('ceruk rak bawah', xw - nd4, xw, NY0, NY1, 0.0, 0.42, WN, bevel=0.004)
LED4 = R.emit_mat('led rak walnut 2700K', R.kelvin(2700), 10.0)
for zs_ in (0.95, 1.5, 2.05, 2.6, 3.07):
    if zs_ < 3: B('papan rak walnut', xw - nd4, xw - 0.03, NY0 + 0.03, NY1 - 0.03, zs_, zs_ + 0.03, WN, bevel=0.003)
    B('led bawah rak walnut', xw - nd4 + 0.03, xw - nd4 + 0.045, NY0 + 0.04, NY1 - 0.04, zs_ - 0.004, zs_, LED4)   # LED tersembunyi di bawah tiap rak
CHAR4 = R.flat_mat('keramik arang ruang 4', '#3a3836', 0.55); OATC = R.flat_mat('keramik oat ruang 4', '#d9d1c4', 0.5, coat=0.2)
nyc = (NY0 + NY1) / 2
_a, _ao = R.place(c, 'ceramic_vase_01', (xw - 0.18, nyc - 0.08, 0.98), 0, fit=('z', 0.3)); R.recolor(_ao, OATC)
books3(xw - 0.2, nyc + 0.12, 0.98, 90, 2)
_b, _bo = R.place(c, 'ceramic_vase_03', (xw - 0.18, nyc, 1.53), 0, fit=('z', 0.22)); R.recolor(_bo, CHAR4)
books3(xw - 0.2, nyc, 2.08, 90, 3)
_c, _co = R.place(c, 'ceramic_pot', (xw - 0.18, nyc, 2.63), 0, fit=('z', 0.16)); R.recolor(_co, OATC)
# sofa linen beige (Customize › Sofa › lurus 3 dudukan, alas platform walnut) + bantal hijau tua/taupe/cokelat + selendang hijau tua
SFY = (GY0 + GY1) / 2
LIN4 = fab('linen beige ruang 4', '#d4c8b5', 'fabric-linen', 0.3, 0.35); LIN4['flat'] = '#d4c8b5'
sf4, sf4o = cz('r4-sofa', xw - DG - 0.03 - 0.48, SFY, -90, mats={'fab': LIN4, 'wood': WN})
# C49: bantal & selendang dihapus pemilik ("bantal … berantakan … hilangkan saja semuanya")
# lukisan sendiri di atas sofa + 2 lampu dinding hitam atas-bawah
painting_at(xw - DG - DR - 0.002, SFY, 2.15, 1.2, 1.2, os.path.join(ART, 'lukisan-ruang4.jpg'), '-x', fm=R.flat_mat('bingkai hitam tipis ruang 4', '#1e1d1c', 0.4, 0.5))
BLK4 = R.flat_mat('lampu dinding hitam doff', '#1b1a19', 0.5, 0.6)
for sy_ in (GY0 + 0.5, GY1 - 0.5):
    R.cyl(c, 'pelat lampu dinding hitam', xw - DG - 0.01, sy_, 1.84, 2.02, 0.035, BLK4); R.cyl(c, 'badan lampu dinding hitam', xw - DG - 0.065, sy_, 1.82, 2.04, 0.04, BLK4)
    B('lengan lampu dinding hitam', xw - DG - 0.055, xw - DG, sy_ - 0.008, sy_ + 0.008, 1.92, 1.94, BLK4)
    for zz_, aim_ in ((2.045, H), (1.815, 0.0)):
        R.cyl(c, 'cincin cahaya lampu dinding', xw - DG - 0.065, sy_, zz_ - 0.003, zz_, 0.033, R.emit_mat('cincin cahaya 2700K', R.kelvin(2700), 12.0))
        R.spot(c, 'lampu dinding hitam ruang 4', (xw - DG - 0.065, sy_, zz_ + (0.02 if aim_ > 1 else -0.02)), (xw - DG - 0.065, sy_, aim_), 38, R.kelvin(2700), size=0.012, ang=36, blend=0.15)
# meja kopi walnut (Customize › Meja › Coffee, slab) + mangkuk batu + buku; meja samping drum batu + lampu jamur
CFX = xw - 1.82                                                            # C48: jarak sofa–meja kopi 0,27 → 0,42 m
cf4, cf4o = cz('r4-coffee', CFX, SFY, -90, mats={'wood': WN})
zcf = R.top_of(cf4o)
STN4 = R.tex_mat('batu abu meja ruang 4', 'ph-marble_01', 0.6, tint='#8e8a83', rough=0.55, nstr=0.4, hsv=(0.5, 0.0, 0.9)); STN4['flat'] = '#8a867f'
lathe('mangkuk batu', [(0.0, 0.0), (0.09, 0.0), (0.17, 0.05), (0.2, 0.1), (0.19, 0.105), (0.16, 0.06), (0.0, 0.03)], CFX, SFY - 0.28, zcf, STN4, closed=True)
books3(CFX - 0.02, SFY + 0.22, zcf, 84, 2)
lathe('meja samping drum batu', [(0.0, 0.0), (0.2, 0.0), (0.21, 0.02), (0.2, 0.5), (0.22, 0.53), (0.22, 0.55), (0.0, 0.55)], xw - 0.32, GY1 + 0.05 - 0.27, 0.0, STN4)
mlx, mly = xw - 0.32, GY1 - 0.22
lathe('kaki lampu jamur', [(0.0, 0.0), (0.06, 0.0), (0.05, 0.02), (0.022, 0.05), (0.02, 0.2), (0.0, 0.2)], mlx, mly, 0.55, R.flat_mat('batu gelap lampu jamur', '#55524d', 0.5))
lathe('kap lampu jamur', [(0.0, 0.2), (0.07, 0.195), (0.12, 0.17), (0.14, 0.13), (0.142, 0.12), (0.0, 0.12)], mlx, mly, 0.55, R.flat_mat('kap jamur opal', '#ece4d6', 0.5, emit=R.kelvin(2500), estr=1.4))
R.point(c, 'lampu jamur ruang 4', (mlx, mly, 0.55 + 0.1), 35, R.kelvin(2500), size=0.04)
# lampu lantai kap linen di ujung selatan sofa
flx, fly = xw - 0.32, GY0 + 0.15
R.cyl(c, 'alas lampu lantai linen', flx, fly, 0.0, 0.02, 0.15, BLK4); R.cyl(c, 'tiang lampu lantai linen', flx, fly, 0.02, 1.42, 0.009, BLK4)
_sh = lathe('kap lampu lantai linen', [(0.21, 0.0), (0.19, 0.3)], flx, fly, 1.32, R.flat_mat('kap linen menyala', '#e8dfcf', 0.9, emit=R.kelvin(2500), estr=0.9)); _sh.modifiers.new('tebal', 'SOLIDIFY').thickness = 0.003
R.point(c, 'lampu lantai linen ruang 4', (flx, fly, 1.45), 55, R.kelvin(2500), size=0.06)
# kursi lounge walnut kulit hitam (Customize › Armchair › rangka kayu) + pouf rajut hijau tua
# C49: kursi lounge kayu dihapus pemilik
lathe('pouf rajut hijau tua', [(0.0, 0.0), (0.26, 0.0), (0.28, 0.04)] + [(0.29 + 0.006 * math.sin(k_ * 1.3), 0.04 + 0.3 * k_ / 12) for k_ in range(13)] + [(0.27, 0.37), (0.2, 0.4), (0.0, 0.41)],
      r4x0 + 0.55, GY1 - 0.1, 0.0, fab('rajut hijau tua pouf', '#46574a', 'acg-Fabric030', 0.25, 0.4))
rug(xw - 1.6, SFY, 2.3, 3.2, '#a9a49b', tset='acg-Carpet016', rot=90, hsv=(0.5, 0.3, 1.0), sheen=0.1)
# konsol walnut melayang di dinding selatan + 3 cetak hutan sendiri + vas
CSX = (r4x0 + xw) / 2                                                       # C49: konsol + 3 cetak di tengah dinding selatan
cs4, cs4o = cz('r3-console', CSX, r4y0 + 0.3, 180, mats={'wood': WN, 'edge': WN, 'metal': BLK4})
cs4.scale = (0.68, 0.66, 0.62)                                              # C48 lebih slim: 2,2 × 0,42 × 0,35 → 1,5 × 0,28 × 0,22 m
zcs = realign(cs4, cs4o, CSX, r4y0 + 0.012 + 0.14, 0.42)
for k_, dx_ in enumerate((-0.56, 0.0, 0.56)):
    painting_at(CSX + dx_, r4y0 + 0.012, 1.75, 0.46, 0.62, os.path.join(ART, 'cetak-hutan-%d.jpg' % (k_ + 1)), '+y', fm=WN)
_d, _do = R.place(c, 'ceramic_vase_03', (CSX - 0.55, r4y0 + 0.15, zcs), 0, fit=('z', 0.32)); R.recolor(_do, CHAR4)
_e, _eo = R.place(c, 'ceramic_vase_01', (CSX - 0.37, r4y0 + 0.16, zcs), 0, fit=('z', 0.24)); R.recolor(_eo, OATC)
books3(CSX + 0.42, r4y0 + 0.15, zcs, 0, 3)
# tanaman (daun diredam) dalam pot hitam di sudut timur laut, dekat ubin batu
_p4, _p4o = plant('potted_plant_04', xw - 0.4, r4y1 - 0.5, 1.2, 0)
R.recolor(_p4o, R.flat_mat('pot keramik hitam ruang 4', '#262523', 0.45), name_has=['pot'])
for sl in [sl for o in _p4o for sl in o.material_slots if sl.material and not sl.material.name.startswith('pot keramik')]:
    m_ = sl.material; b_ = principled(m_); lk_ = b_.inputs['Base Color'].links
    if lk_ and not m_.get('muted'):
        hs_ = m_.node_tree.nodes.new('ShaderNodeHueSaturation'); hs_.inputs['Saturation'].default_value = 0.55; hs_.inputs['Value'].default_value = 0.85
        m_.node_tree.links.new(lk_[0].from_socket, hs_.inputs['Color']); m_.node_tree.links.new(hs_.outputs['Color'], b_.inputs['Base Color']); m_['muted'] = 1; m_['flat'] = '#626a58'
# lampu gantung piring linen di atas meja kopi
DSC4 = R.flat_mat('piring linen gantung', '#e2d9ca', 0.85)
pgx, pgy, pgz = CFX, SFY, 2.6
R.cyl(c, 'kabel lampu gantung ruang 4', pgx, pgy, pgz + 0.06, H, 0.002, BLK4); R.cyl(c, 'kanopi ruang 4', pgx, pgy, H - 0.025, H, 0.055, BLK4)
lathe('piring linen lampu gantung', [(0.0, 0.07), (0.06, 0.068), (0.42, 0.02), (0.44, 0.0), (0.0, 0.0)], pgx, pgy, pgz, DSC4)
R.cyl(c, 'difuser lampu gantung ruang 4', pgx, pgy, pgz - 0.004, pgz, 0.3, R.emit_mat('difuser gantung ruang 4', R.kelvin(2600), 4.0))
R.spot(c, 'lampu gantung ruang 4', (pgx, pgy, pgz - 0.02), (pgx, pgy, 0.0), 120, R.kelvin(2600), size=0.08, ang=90, blend=0.4)
# sorot rel hitam di plafon (C44 ref 2): satu rel memanjang + 6 kepala sorot berkas sempit → terang dari sorot, bayangan tegas
rlx = xw - 1.35
B('rel sorot hitam', rlx - 0.018, rlx + 0.018, GY0 - 0.3, NY1, H - 0.035, H, BLK4)
K27 = R.kelvin(2700)
for (hy_, aim_, e_, ang_) in ((SFY, (xw - DG - DR, SFY, 2.15), 380, 15), (SFY - 0.75, (xw - DG - 0.55, SFY - 0.7, 0.5), 260, 20), (SFY + 0.75, (xw - DG - 0.55, SFY + 0.7, 0.5), 260, 20),
                              (GY0 - 0.2, (r4x0 + 0.5, GY0 + 0.42, 0.55), 280, 18), (NY1 - 0.1, (xw - 0.2, nyc, 1.8), 240, 16), (GY0 + 0.4, (CSX, r4y0, 1.7), 260, 22)):
    R.cyl(c, 'kepala sorot rel', rlx, hy_, H - 0.18, H - 0.035, 0.032, BLK4)
    R.spot(c, 'sorot rel ruang 4', (rlx, hy_, H - 0.2), aim_, e_, K27, size=0.005, ang=ang_, blend=0.07)
for wx_ in (SLX0 + 0.35, (SLX0 + SLX1) / 2, SLX1 - 0.35): R.spot(c, 'sorot dinding batu ruang 4', (wx_, r4y1 - 0.4, H - 0.05), (wx_, r4y1 - 0.16, 1.3), 420, R.kelvin(2700), size=0.005, ang=26, blend=0.12)   # sapu lempeng semen → tepi lapis & bayangan tegas
for o in [o for o in sc.objects if o.type == 'LIGHT' and o.name.split('.')[0] in ('sorot dinding batu ruang 4', 'sorot rel ruang 4', 'lampu dinding hitam ruang 4', 'lampu jamur ruang 4', 'lampu lantai linen ruang 4', 'lampu gantung ruang 4')]:
    o['livek'] = 3200; o['livee'] = 0.6

# ==========================================================================
#  ROOM 5 · kiri bawah — KAMAR TIDUR japandi hangat (30 Okt, C55–C58; referensi pemilik data/private/galeri-ref/room5-ref-kamar-1/2)
#  abu muda + beige kecokelatan, aksen deep charcoal (C2.2). Plester berawan boleh, bukan pola bata (C57.1). Lingkaran hanya di
#  dinding (C57.2). Redup seperti referensi: cahaya dari LED tersembunyi (C57.3). Satu ottoman arang (C57.4).
#  Dinding timur 3 lapis: sayap plester abu muda maju 35 cm (selatan: ceruk rak batu, utara: celah LED + kayu apung) mengapit
#  panel beige kecokelatan 12 cm berceruk bulat Ø 2,6 m ber-LED di atas ranjang platform Customize (headboard panel dinding + nakas).
# ==========================================================================
LGREY, BROWNB, CHAR = '#c9c4bc', '#b09c86', '#2c2c2e'
r5x0, r5x1, r5y0, r5y1 = X(140), xw, Y(443) + T / 2, Y(293) - T / 2
r5y = (r5y0 + r5y1) / 2
def plaster5(name, hexc, sc_=2.6): return R.tex_mat(name, 'ph-clay_plaster', sc_, tint=hexc, rough=0.9, nstr=0.3, hsv=(0.5, 0.0, 2.0))   # plester berawan halus
PL5, PB5 = plaster5('plester abu muda r5', LGREY), plaster5('plester beige kecokelatan r5', BROWNB)
OAK5 = R.tex_mat('oak beige kecokelatan r5', 'wood-oak', 1.0, tint='#b8a084', rough=0.6, nstr=0.3, hsv=(0.5, 0.75, 1.0))
LED5 = R.emit_mat('led 2700K r5', R.kelvin(2700), 9.0)
STN5 = R.tex_mat('batu ceruk r5', 'x-batu-travertine-003', 0.9, tint='#9d9384', rough=0.85, nstr=1.4, hsv=(0.5, 0.4, 1.0))
floor_rect(r5x0, r5x1, r5y0, r5y1, R.tex_mat('lantai plester r5', 'room-floor-concrete', 3.0, tint='#bab4ab', rough=0.55, nstr=0.12, hsv=(0.5, 0.0, 1.2), mute=0.55))
clad_y(r5y0, +1, r5x0, xw - 0.35, PL5); clad_y(r5y1, -1, r5x0, xw - 0.35, PL5)
XF5, XS5 = xw - 0.12, xw - 0.35                       # muka panel ranjang · muka sayap
FA5, FB5 = r5y - 1.95, r5y + 1.95                     # panel beige kecokelatan 3,9 m (ranjang super king 3,36 m dengan nakas)
B('dinding belakang r5', xw - 0.03, xw, r5y0, r5y1, 0, H - 0.01, PL5)
# panel ranjang + ceruk bulat (boolean, diterapkan) — dasar ceruk = dinding belakang yang sedikit lebih terang
CC5 = (r5y, 2.4); CR5 = 1.3                          # Ø 2,6 m (C59: lingkaran kurang besar)
pan5 = B('panel ranjang beige r5', XF5, xw - 0.03, FA5, FB5, 0, H - 0.01, PB5)
bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=CR5, depth=0.5, location=(xw - 0.06, CC5[0], CC5[1]), rotation=(0, math.radians(90), 0))
cut5 = bpy.context.active_object
bo_ = pan5.modifiers.new('ceruk bulat', 'BOOLEAN'); bo_.object = cut5; bo_.operation = 'DIFFERENCE'; bo_.solver = 'EXACT'
with bpy.context.temp_override(object=pan5, active_object=pan5, selected_objects=[pan5]): bpy.ops.object.modifier_apply(modifier='ceruk bulat')
bpy.data.objects.remove(cut5, do_unlink=True)
bv_ = pan5.modifiers.new('tepi lembut', 'BEVEL'); bv_.width = 0.012; bv_.segments = 3; bv_.limit_method = 'ANGLE'
bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=CR5 + 0.02, depth=0.01, location=(xw - 0.035, CC5[0], CC5[1]), rotation=(0, math.radians(90), 0))
d5 = bpy.context.active_object; d5.name = 'dasar ceruk bulat'; d5.data.materials.append(plaster5('plester ceruk r5', '#c4b4a0'))
for cl_ in list(d5.users_collection): cl_.objects.unlink(d5)
c.objects.link(d5)
bpy.ops.mesh.primitive_torus_add(major_radius=CR5 - 0.014, minor_radius=0.012, major_segments=192, minor_segments=10, location=(xw - 0.05, CC5[0], CC5[1]), rotation=(0, math.radians(90), 0))
hl5 = bpy.context.active_object; hl5.name = 'led cincin ceruk'; hl5.data.materials.append(R.emit_mat('led cincin r5', R.kelvin(2700), 38.0))
for cl_ in list(hl5.users_collection): cl_.objects.unlink(hl5)
c.objects.link(hl5)
# halo: cincin LED di sudut bibir & dasar ceruk + lampu titik kecil TEPAT di cincin (bintiknya tertutup kilau cincin) → dasar plester tersapu cahaya
for k_ in range(28):
    a_ = 2 * math.pi * k_ / 28
    R.point(c, 'halo ceruk r5', (xw - 0.05, CC5[0] + (CR5 - 0.014) * math.cos(a_), CC5[1] + (CR5 - 0.014) * math.sin(a_)), 1.6, R.kelvin(2700), size=0.01).visible_camera = False
# sayap selatan: ceruk rak berdinding batu, 3 ambalan oak, LED di bawah tiap ambalan (referensi 2)
NY0, NY1, NZ0, NZ1 = r5y0 + 0.2, FA5 - 0.2, 0.45, H - 0.3     # ceruk rak sampai dekat plafon (C60.2)
B('sayap selatan r5', XS5, xw - 0.03, r5y0, NY0, 0, H - 0.01, PL5); B('sayap selatan r5 b', XS5, xw - 0.03, NY1, FA5, 0, H - 0.01, PL5)
B('sayap selatan bawah', XS5, xw - 0.03, NY0, NY1, 0, NZ0, PL5); B('sayap selatan atas', XS5, xw - 0.03, NY0, NY1, NZ1, H - 0.01, PL5)
B('ceruk batu r5', xw - 0.06, xw - 0.03, NY0, NY1, NZ0, NZ1, STN5)
shz5 = [NZ0 + k_ * (NZ1 - NZ0) / 7 for k_ in range(8)]  # 7 ruang setinggi ±58 cm
for z_ in shz5[1:-1]: B('ambalan oak r5', XS5 + 0.01, xw - 0.06, NY0, NY1, z_ - 0.035, z_, OAK5, bevel=0.003)
for z_ in shz5[1:]:
    B('led ambalan r5', xw - 0.12, xw - 0.1, NY0 + 0.02, NY1 - 0.02, z_ - 0.041, z_ - 0.035, LED5)
    R.spot(c, 'sorot ceruk r5', (xw - 0.11, (NY0 + NY1) / 2, z_ - 0.05), (xw - 0.05, (NY0 + NY1) / 2, z_ - 0.75), 9, R.kelvin(2700), size=0.03, ang=110, blend=0.6)
ny5 = (NY0 + NY1) / 2
# barang rak berukuran nyata (C59: dulu terlalu besar): 15–30 cm, satu–dua per ruang, berselang kiri-kanan
v1, v1o = R.place(c, 'ceramic_vase_01', (xw - 0.19, ny5 + 0.08, NZ0), 20, fit=('z', 0.3)); R.recolor(v1o, CER)
R.place(c, 'wooden_bowl_02', (xw - 0.19, ny5 - 0.14, NZ0), 0, fit=('x', 0.13))
v2, v2o = R.place(c, 'ceramic_vase_04', (xw - 0.19, ny5 - 0.1, shz5[1]), 0, fit=('z', 0.2)); R.recolor(v2o, CER3)
v5, v5o = R.place(c, 'ceramic_pot', (xw - 0.19, ny5 + 0.11, shz5[2]), 0, fit=('z', 0.12)); R.recolor(v5o, CER3)
v6, v6o = R.place(c, 'ceramic_vase_02', (xw - 0.19, ny5 - 0.12, shz5[2]), 0, fit=('z', 0.16)); R.recolor(v6o, CER)
v3, v3o = R.place(c, 'ceramic_vase_03', (xw - 0.19, ny5 + 0.04, shz5[3]), 0, fit=('z', 0.24)); R.recolor(v3o, CER)
v7, v7o = R.place(c, 'jug_01', (xw - 0.19, ny5 - 0.09, shz5[4]), 30, fit=('z', 0.2)); R.recolor(v7o, CER3)
R.place(c, 'wooden_bowl_01', (xw - 0.19, ny5 + 0.13, shz5[4]), 0, fit=('x', 0.12))
v8, v8o = R.place(c, 'antique_ceramic_vase_01', (xw - 0.19, ny5 + 0.06, shz5[5]), 0, fit=('z', 0.26)); R.recolor(v8o, CER)
v9, v9o = R.place(c, 'ceramic_vase_02', (xw - 0.19, ny5 - 0.08, shz5[6]), 0, fit=('z', 0.18)); R.recolor(v9o, CER3)
# sayap utara: celah cahaya tegak setinggi plafon + undakan rendah + kayu apung (referensi 1)
SY0, SY1 = FB5 + 0.3, FB5 + 0.65
B('sayap utara r5', XS5, xw - 0.03, FB5, SY0, 0, H - 0.01, PL5); B('sayap utara r5 b', XS5, xw - 0.03, SY1, r5y1, 0, H - 0.01, PL5)
B('undakan r5', xw - 0.85, XS5, FB5, r5y1, 0, 0.15, PL5, bevel=0.01); B('undakan celah r5', XS5, xw - 0.03, SY0, SY1, 0, 0.15, PL5)
LEDS5 = R.emit_mat('led celah 2700K r5', R.kelvin(2700), 45.0)
for y_ in (SY0 + 0.004, SY1 - 0.016): B('led celah r5', XS5 + 0.015, XS5 + 0.04, y_, y_ + 0.012, 0.15, H - 0.05, LEDS5)
def gnarl(name, pts, rads, mat, lump=1.0):
    """Batang kayu apung: kurva NURBS berjari-jari per titik → mesh, diberi lekuk acak."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = 5
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1)
    for p_, q_, r_ in zip(sp.points, pts, rads): p_.co = (*q_, 1.0); p_.radius = r_
    sp.order_u = 3; sp.use_endpoint_u = True; sp.resolution_u = 24
    ob = bpy.data.objects.new(name, cu); c.objects.link(ob); bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob, do_unlink=True)
    from mathutils import noise as nz_
    for v in me.vertices: v.co += v.normal * lump * (0.012 * nz_.noise(v.co * 9.0) + 0.004 * nz_.noise(v.co * 40.0))
    me.materials.append(mat)
    for p_ in me.polygons: p_.use_smooth = True
    mo = bpy.data.objects.new(name, me); c.objects.link(mo); return mo
DW5 = R.tex_mat('kayu apung r5', 'ph-smoked_walnut_veneer', 0.35, tint='#6b5848', rough=0.82, nstr=1.2, rot=90, hsv=(0.5, 0.5, 1.1))
dx5, dy5 = (XS5 + xw - 0.03) / 2, (SY0 + SY1) / 2       # tepat di tengah celah cahaya, di antara 2 garis LED (C60.3)
R.cyl(c, 'alas kayu apung', dx5, dy5, 0.15, 0.18, 0.12, R.flat_mat('alas arang', CHAR, 0.6))
gnarl('kayu apung', [(dx5, dy5, 0.17), (dx5 + 0.025, dy5 - 0.02, 0.55), (dx5 - 0.03, dy5 + 0.025, 1.0), (dx5 + 0.035, dy5 - 0.01, 1.45), (dx5 - 0.015, dy5 + 0.03, 1.85),
                    (dx5 + 0.03, dy5 + 0.01, 2.25), (dx5 - 0.01, dy5 - 0.02, 2.6)], [0.075, 0.06, 0.05, 0.042, 0.033, 0.022, 0.008], DW5)   # ±2,6 m (C60.3: lebih tinggi)
gnarl('cabang kayu apung', [(dx5 - 0.02, dy5 + 0.02, 1.25), (dx5 - 0.06, dy5 + 0.07, 1.5), (dx5 - 0.07, dy5 + 0.08, 1.78)], [0.03, 0.02, 0.008], DW5)
gnarl('cabang kayu apung', [(dx5 + 0.02, dy5 - 0.01, 1.95), (dx5 + 0.05, dy5 - 0.08, 2.15), (dx5 + 0.04, dy5 - 0.1, 2.32)], [0.022, 0.014, 0.006], DW5)
# ranjang platform Customize: 200 × 200 super king (C59: kasur kurang besar), headboard panel kayu + nakas melayang, dasar melayang LED, kayu oak
bd5, bd5o = cz('r5-bed', XF5 - 1.09, r5y, -90, z=0.0, mats={'fab#cdbfa8': fab('linen alas ranjang r5', '#b7ab9a', 'fabric-linen', 0.3, 0.3),
               'linen': fab('linen sprei r5', '#cbc4b8', 'fabric-linen', 0.3, 0.35), 'wood': OAK5, 'flute': OAK5,
               'metal': R.flat_mat('perunggu gelap r5', '#3b342d', 0.4, metal=1.0), 'dark': R.flat_mat('alas gelap r5', '#26231f', 0.7),
               'glow': R.emit_mat('led bawah ranjang r5', R.kelvin(2700), 4.0)})
for o in list(bd5o):                                  # selimut rata & selendang lipat bawaan diganti selimut kain sungguhan
    if o.material_slots and o.material_slots[0].material and o.material_slots[0].material.name.startswith(('fab#9f9483', 'fab#b8a68a')):
        bd5o.remove(o); bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.update()
def bbw(o):
    bb = [o.matrix_world @ Vector(v) for v in o.bound_box]
    return Vector([min(v[i] for v in bb) for i in range(3)]), Vector([max(v[i] for v in bb) for i in range(3)])
mat5 = [bbw(o) for o in bd5o if o.material_slots and o.material_slots[0].material and o.material_slots[0].material.name.startswith('linen sprei')]
mlo5 = Vector([min(a[0][i] for a in mat5) for i in range(3)]); mhi5 = Vector([max(a[1][i] for a in mat5) for i in range(3)])
# bantal balok bawaan Customize dibuang → bantal tidur sungguhan (C60.1)
for o in list(bd5o):
    if o.material_slots and o.material_slots[0].material and o.material_slots[0].material.name.startswith('linen sprei'):
        lo_, hi_ = bbw(o)
        if (hi_.x - lo_.x) < 0.8 and (hi_.y - lo_.y) < 0.8: bd5o.remove(o); bpy.data.objects.remove(o, do_unlink=True)
mtop5 = max(bbw(o)[1].z for o in bd5o if o.material_slots and o.material_slots[0].material and o.material_slots[0].material.name.startswith('linen sprei'))
def pillow5(name, a, b, t, loc, rot, mat, flat=1.0, dent=0.0, seed=1):
    """Bantal tidur: dua muka menggembung (isi dakron) bertemu di jahitan tepi, sisi tengah tertarik ke dalam sehingga sudut
    meruncing, kusut halus dekat jahitan, cekung kepala opsional. a = panjang (sumbu y lokal), b = lebar (x lokal), t = tebal."""
    from mathutils import noise as nz_
    bm = bmesh.new(); nu, nv = 44, 30; off = Vector((seed * 3.1, seed * 1.7, 0.4))
    def P(u, v, side):
        f = max(0.0, (1 - abs(u) ** 2.6) * (1 - abs(v) ** 2.6)) ** 0.55
        x = v * b / 2 * (1 - 0.11 * (1 - u * u)); y = u * a / 2 * (1 - 0.08 * (1 - v * v))
        z = t / 2 * f * (1.0 if side > 0 else flat)
        if side > 0: z -= dent * math.exp(-(u * u / 0.35 + v * v / 0.45))
        q = Vector((x, y, 0))
        w = (1 - f) ** 1.5 * f * 4.0                                   # kusut paling kuat di lereng dekat jahitan
        z += side * (0.006 * nz_.noise(q * 7 + off) * (0.4 + w) + 0.0025 * nz_.noise(q * 23 + off))
        return Vector((x, y, z if side > 0 else -z))
    g = {}
    for side in (1, -1):
        for i in range(nu + 1):
            for j in range(nv + 1):
                u, v = -1 + 2 * i / nu, -1 + 2 * j / nv
                g[side, i, j] = bm.verts.new(P(u, v, side))
        for i in range(nu):
            for j in range(nv):
                q4 = [g[side, i, j], g[side, i + 1, j], g[side, i + 1, j + 1], g[side, i, j + 1]]
                bm.faces.new(q4 if side > 0 else q4[::-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mat)
    for p_ in me.polygons: p_.use_smooth = True
    ob = bpy.data.objects.new(name, me); c.objects.link(ob)
    ob.location = loc; ob.rotation_euler = rot
    sd_ = ob.modifiers.new('halus', 'SUBSURF'); sd_.levels = 1; sd_.render_levels = 2
    return ob
PLW5 = fab('sarung bantal linen putih gading r5', '#d6d0c4', 'fabric-linen', 0.3, 0.35)
PLB5 = fab('sarung bantal linen oatmeal r5', '#bfae95', 'fabric-linen', 0.3, 0.35)
LT5 = math.radians(45)                                  # bantal belakang bersandar ke headboard 45° (C61.1: tidak terlalu tegak, tidak terlalu datar)
for k_, sy_ in enumerate((-1, 1)):
    p0 = Vector((mhi5.x + 0.12 - 0.52 * math.cos(LT5) - 0.095 * math.sin(LT5), r5y + sy_ * 0.43, mtop5 + 0.03))   # punggung tepi atas di muka headboard
    nb_ = Vector((math.cos(LT5), 0, math.sin(LT5)))     # arah lebar bantal: naik ke headboard
    pillow5('bantal sandar r5', 0.76, 0.52, 0.19, p0 + nb_ * 0.26, (0, -LT5, math.radians(sy_ * 1.5)), PLB5, flat=1.0, seed=3 + k_)
for k_, sy_ in enumerate((-1, 1)):                      # bantal tidur rebah di depannya, sedikit terangkat di belakang
    pillow5('bantal tidur r5', 0.74, 0.5, 0.15, Vector((mhi5.x - 0.69, r5y + sy_ * 0.41, mtop5 + 0.035)), (0, -math.radians(7), math.radians(-sy_ * 2.5)), PLW5,
            flat=0.35, dent=0.018, seed=7 + k_)
ns5 = [bbw(o) for o in bd5o if o.material_slots and o.material_slots[0].material == OAK5]
def nstop(side):                                       # nakas = papan oak tertinggi di luar lebar kasur, di bawah 0,8 m → (z puncak, x, y tengah)
    bs = [(hi.z, (lo.x + hi.x) / 2, (lo.y + hi.y) / 2) for lo, hi in ns5 if hi.z < 0.8 and (hi.x - lo.x) > 0.25 and ((lo.y > mhi5.y + 0.02) if side > 0 else (hi.y < mlo5.y - 0.02))]
    return max(bs) if bs else (0.55, XF5 - 0.22, r5y + side * 1.2)
def duvet5(x0, x1, y0, y1, z0, mat, seed=5):
    """Selimut linen: simulasi kain Blender di atas kasur & bantal → kusut dan menjuntai alami, tidak tembus (C49.1)."""
    nx, ny = 56, 76
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=nx, y_subdivisions=ny, size=1.0, location=((x0 + x1) / 2, (y0 + y1) / 2, z0))
    ob = bpy.context.active_object; ob.name = 'selimut linen r5'
    for cl_ in list(ob.users_collection): cl_.objects.unlink(ob)
    c.objects.link(ob)
    rnd = random.Random(seed); bumps = [((rnd.uniform(x0, x1), rnd.uniform(y0, y1)), rnd.uniform(0.05, 0.13), rnd.uniform(0.08, 0.22)) for _ in range(16)]
    sx, sy = x1 - x0, y1 - y0
    for v in ob.data.vertices:
        wx, wy = (x0 + x1) / 2 + v.co.x * sx, (y0 + y1) / 2 + v.co.y * sy
        v.co.x, v.co.y = v.co.x * sx, v.co.y * sy
        v.co.z = sum(hb * math.exp(-((wx - p[0]) ** 2 + (wy - p[1]) ** 2) / (2 * rr * rr)) for p, hb, rr in bumps)
    for o in bd5o: o.modifiers.new('tabrak', 'COLLISION').settings.thickness_outer = 0.006
    cm_ = ob.modifiers.new('kain', 'CLOTH'); s_ = cm_.settings
    s_.quality = 6; s_.mass = 0.18; s_.tension_stiffness = 10; s_.compression_stiffness = 10; s_.shear_stiffness = 5; s_.bending_stiffness = 0.03
    s_.air_damping = 1.5; cm_.collision_settings.distance_min = 0.006; cm_.collision_settings.use_self_collision = True
    cm_.collision_settings.self_distance_min = 0.004; cm_.point_cache.frame_start = 1; cm_.point_cache.frame_end = 60
    t_ = time.time(); sc.frame_set(1)
    for f_ in range(2, 61): sc.frame_set(f_)
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mw = ob.matrix_world.copy(); bpy.data.objects.remove(ob, do_unlink=True); sc.frame_set(1)
    for o in bd5o:
        for md_ in [m_ for m_ in o.modifiers if m_.type == 'COLLISION']: o.modifiers.remove(md_)
    me.transform(mw); me.materials.clear(); me.materials.append(mat)
    for p_ in me.polygons: p_.use_smooth = True
    du = bpy.data.objects.new('selimut linen r5', me); c.objects.link(du)
    so_ = du.modifiers.new('tebal', 'SOLIDIFY'); so_.thickness = 0.012; so_.offset = 1.0
    sd_ = du.modifiers.new('halus', 'SUBSURF'); sd_.levels = 1; sd_.render_levels = 2
    print('[galery12] selimut kain r5 %.1f s' % (time.time() - t_), flush=True)
    return du
duvet5(mlo5.x - 0.12, mhi5.x - 0.97, mlo5.y - 0.3, mhi5.y + 0.3, 0.5, fab('linen selimut r5', '#bdb4a6', 'fabric-linen', 0.32, 0.35))
# nakas utara: vas batu arang + ranting kering menjulur ke ceruk bulat · nakas selatan: lampu gantung silinder arang + keramik kecil
(zn5, xn5, yn5), (zs5, xs5, ys5) = nstop(+1), nstop(-1)
print('[galery12] nakas r5 utara %.2f %.2f %.2f · selatan %.2f %.2f %.2f · kasur %s..%s' % (zn5, xn5, yn5, zs5, xs5, ys5, tuple(round(v, 2) for v in mlo5), tuple(round(v, 2) for v in mhi5)), flush=True)
lathe('vas batu arang r5', [(0.0, 0.0), (0.075, 0.0), (0.115, 0.06), (0.13, 0.17), (0.115, 0.27), (0.075, 0.33), (0.052, 0.345), (0.056, 0.37), (0.045, 0.37)],
      xn5, yn5, zn5, CER)
def twigs5(base, lean, L0, seed=4):
    """Ranting kering halus bertunas (referensi 1): 3 batang dari mulut vas, bercabang 3 tingkat, condong ke ceruk bulat."""
    rnd = random.Random(seed); TW = R.flat_mat('ranting r5', '#4a3d33', 0.75); BUD = R.flat_mat('tunas r5', '#8f7c69', 0.7)
    def grow(p0, d, L, r, lvl):
        pts, q, dd = [p0.copy()], p0.copy(), d.copy()
        for i_ in range(5):
            dd = (dd + Vector((rnd.uniform(-.22, .22), rnd.uniform(-.22, .22), rnd.uniform(-.02, .12)))).normalized(); q = q + dd * (L / 5); pts.append(q.copy())
        gnarl('ranting r5', [tuple(v) for v in pts], [r * (1 - 0.75 * k / 5) for k in range(6)], TW, lump=0.0)
        if lvl < 2:
            for k_ in range(3 if lvl == 0 else 2):
                sp = pts[rnd.randint(2, 4)]; nd = (dd + Vector((rnd.uniform(-.9, .9), rnd.uniform(-.9, .9), rnd.uniform(.1, .5)))).normalized()
                grow(sp, nd, L * rnd.uniform(.4, .6), r * .55, lvl + 1)
        for v in pts[2:]:
            if rnd.random() < 0.7: R.sphere(c, 'tunas r5', tuple(v + Vector((rnd.uniform(-.01, .01), rnd.uniform(-.01, .01), .004))), 0.0055, BUD)
    for k_ in range(3):
        d0 = (lean + Vector((rnd.uniform(-.25, .25), rnd.uniform(-.25, .25), 0))).normalized()
        grow(base + Vector((rnd.uniform(-.015, .015), rnd.uniform(-.015, .015), 0)), d0, L0 * rnd.uniform(.8, 1.1), 0.007, 0)
twigs5(Vector((xn5, yn5, zn5 + 0.33)), Vector((0.0, -0.45, 1.0)), 0.95)
v4, v4o = R.place(c, 'ceramic_vase_02', (xs5 + 0.04, ys5 + 0.1, zs5), 0, fit=('z', 0.2)); R.recolor(v4o, CER3)
bw5, bw5o = R.place(c, 'wooden_bowl_02', (xs5 - 0.04, ys5 - 0.1, zs5), 0, fit=('x', 0.16))
PDX5, PDY5, PDZ5 = xs5 - 0.05, ys5 - 0.02, 1.5
CHM5 = R.flat_mat('arang doff r5', CHAR, 0.55)
R.cyl(c, 'kabel lampu gantung r5', PDX5, PDY5, PDZ5 + 0.3, H, 0.003, CHM5, seg=12)
R.cyl(c, 'lampu gantung silinder r5', PDX5, PDY5, PDZ5, PDZ5 + 0.3, 0.065, CHM5, seg=64)
R.cyl(c, 'kaca lampu gantung r5', PDX5, PDY5, PDZ5 - 0.002, PDZ5 + 0.004, 0.055, R.emit_mat('cahaya lampu gantung r5', R.kelvin(2600), 12.0), seg=48)
R.spot(c, 'lampu gantung r5', (PDX5, PDY5, PDZ5 - 0.01), (PDX5, PDY5, 0), 30, R.kelvin(2600), size=0.04, ang=70, blend=0.5)
# LED di balik puncak headboard menyapu panel beige ke atas (referensi 2)
R.area(c, 'led headboard r5', (XF5 - 0.03, r5y, mhi5.z + 0.62), (math.radians(180), 0, 0), 0.04, 3.3, 45, R.kelvin(2700), spread=150)
# batu alam pipih di kaki ranjang + mangkuk kayu
def stone5(cx, cy, lx, ly, h, mat, seed=11):
    from mathutils import noise as nz_
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.0, location=(cx, cy, 0))
    ob = bpy.context.active_object; ob.name = 'batu alam r5'
    for cl_ in list(ob.users_collection): cl_.objects.unlink(ob)
    c.objects.link(ob)
    off = Vector((seed * 1.7, seed * 0.3, 0))
    for v in ob.data.vertices:
        p = v.co.copy(); p.x *= lx / 2; p.y *= ly / 2; p.z = (p.z * 0.5 + 0.5) * h * 1.25
        p += v.normal * (0.035 * nz_.noise(v.co * 2.2 + off) + 0.01 * nz_.noise(v.co * 9 + off))
        p.z = min(p.z, h + 0.006 * nz_.noise(v.co * 6 + off)); p.z = max(p.z, 0.0)
        v.co = p
    ob.data.materials.append(mat)
    for p_ in ob.data.polygons: p_.use_smooth = True
    return ob
st5 = stone5(mlo5.x - 0.25, r5y + 0.05, 0.36, 0.92, 0.3, R.tex_mat('batu alam r5', 'x-batu-travertine-001', 0.5, tint='#cbc1b1', rough=0.85, nstr=1.6, hsv=(0.5, 0.35, 1.05)))
R.place(c, 'wooden_bowl_01', (mlo5.x - 0.25, r5y + 0.22, R.top_of([st5]) - 0.01), 0, fit=('x', 0.24))
# karpet anyaman jute (beige kecokelatan) di bawah kaki ranjang · ottoman beludru arang di sudut utara (satu-satunya aksen duduk)
rug(mlo5.x + 0.55, r5y, 1.9, 3.3, '#a58f72', tset='weave-cord', hsv=(0.5, 0.4, 1.0), sheen=0.15)
ot5, ot5o = cz('r5-ottoman', XS5 - 1.25, FB5 + 0.35, 0, mats={'fab': fab('beludru arang r5', CHAR, 'ph-velour_velvet', 0.3, 0.8), 'dark': R.flat_mat('alas ottoman r5', '#1c1b1a', 0.6)})
# ==========================================================================
#  ROOM 6 · Barat (G7, 30 Okt, C61–C65): RUANG DUDUK TERRACOTTA HANGAT — referensi pemilik data/private/galeri-ref/room6-ref-1/2.
#  Letak B (C64): di luar tembok barat, berhadapan dengan Room 5; tembok barat dibuka berbingkai, kamera berputar 180° di akhir jalur.
#  Versi 2 (C65 "terlalu jelek.. ulangi lagi"): kedua referensi punya JENDELA bervitrase → jendela tinggi di dinding selatan dengan tirai
#  zaitun + matahari tajam yang menembus kusen (garis bayangan di lantai & dinding, ref 1); dinding belakang cat terracotta halus (bukan
#  plester belang) + cove di plafon turun (ref 2); sofa chaise Customize empuk membulat (lengan bulat gemuk, sandaran bantal besar,
#  dudukan satu bantal) berwarna karat suede; karpet bulat krem bertekstur; lantai oak terang matte; lampu drum rotan di depan-kiri
#  (tidak menutupi lukisan); 2 lukisan abstrak sendiri di tengah sofa (C49.2); pohon pachira; kabinet oak rendah (ref 1).
# ==========================================================================
TERRA6, CREAM6, OLIVE6 = '#9a5036', '#ddd1bd', '#5e5c3a'
r6x0, r6x1 = R6X0, x0 - T                                # muka dinding belakang · bidang bukaan (muka dalam tembok barat)
r6y0, r6y1 = R6Y0, R6Y1; r6y = (r6y0 + r6y1) / 2
PT6 = wallmat('cat terracotta r6', TERRA6); PC6 = wallmat('limewash cream r6', CREAM6)
OAK6 = R.tex_mat('oak terang r6', 'wood-oak', 1.0, tint='#cdb08c', rough=0.55, nstr=0.3, hsv=(0.5, 0.6, 1.1))
floor_rect(r6x0, x0, r6y0, r6y1, R.tex_mat('parket herringbone r6', 'ph-herringbone_parquet', 2.4, tint='#d2bb9c', rough=0.6, nstr=0.3, hsv=(0.5, 0.35, 1.2)))
B('dinding belakang r6', r6x0 - T, r6x0, r6y0 - T, r6y1 + T, 0, H, PT6)
B('dinding utara r6', r6x0, r6x1, r6y1, r6y1 + T, 0, H, PC6)
# dinding selatan dengan jendela tinggi (lantai → 4,3 m) bervitrase + tirai zaitun terbuka (ref 1 & 2)
WX0, WX1 = r6x0 + 0.55, r6x0 + 2.75
B('dinding selatan r6 a', r6x0, WX0, r6y0 - T, r6y0, 0, H, PC6); B('dinding selatan r6 b', WX1, r6x1, r6y0 - T, r6y0, 0, H, PC6)
B('ambang jendela r6', WX0, WX1, r6y0 - T, r6y0, 4.3, H, PC6)
_pre6 = set(c.objects); blinds_or_curtain_y(WX0, WX1, r6y0 - 0.1, +1, curtain_hex=OLIVE6)
for o_ in set(c.objects) - _pre6:                          # cahaya langit jendela setengah → matahari & bayangan kusen yang bicara
    if o_.type == 'LIGHT' and o_.data.type == 'AREA': o_.data.energy *= float(arg('r6sky', 0.5))
# matahari sore menembus jendela: sorot tajam dari luar (tenggara, tinggi) → garis kusen jatuh di lantai, karpet & dinding terracotta
R.spot(c, 'matahari r6', (WX1 + 0.6, r6y0 - 2.3, 4.25), (r6x0 + 0.5, r6y0 + 2.9, 0.2), float(arg('r6sun', 45000)), SUN, size=0.02, ang=60, blend=0.05)   # di depan kotak cahaya langit (kotak itu menghalangi)
B('plafon r6', r6x0 - T, x0, r6y0 - T, r6y1 + T, H, H + 0.15, M['white'])
B('kusen bukaan r6 selatan', r6x1 - 0.02, x0 + 0.02, R6O0 - 0.04, R6O0, 0, 4.3, PC6); B('kusen bukaan r6 utara', r6x1 - 0.02, x0 + 0.02, R6O1, R6O1 + 0.04, 0, 4.3, PC6)
B('ambang bukaan r6', r6x1 - 0.02, x0 + 0.02, R6O0 - 0.04, R6O1 + 0.04, 4.26, 4.3, PC6)
# plafon turun di sepanjang dinding belakang + celah cove 12 cm: LED tersembunyi menyapu terracotta ke bawah (ref 2)
ZS6 = 4.35
B('plafon turun r6 belakang', r6x0 + 0.12, r6x0 + 0.75, r6y0, r6y1, ZS6, H, M['white']); B('plafon turun r6 utara', r6x0 + 0.75, r6x1, r6y1 - 0.45, r6y1, ZS6, H, M['white'])
B('led cove r6', r6x0 + 0.13, r6x0 + 0.15, r6y0 + 0.05, r6y1 - 0.05, ZS6 + 0.05, ZS6 + 0.07, R.emit_mat('led cove 2700K r6', R.kelvin(2700), 30.0))
R.area(c, 'cove dinding terracotta r6', (r6x0 + 0.07, r6y, ZS6 + 0.02), (0, 0, 0), 0.08, r6y1 - r6y0 - 0.2, float(arg('r6cove', 160)), R.kelvin(2700), spread=110)
B('plint r6', r6x0, r6x0 + 0.015, r6y0, r6y1, 0, 0.08, PT6, bevel=0.003)
# sofa chaise Customize empuk (lengan bulat gemuk, sandaran bantal besar, dudukan satu bantal) — karat suede, punggung 10 cm dari dinding
SFD6 = 1.70; SBX = r6x0 + 0.1
SUEDE6 = R.tex_mat('suede karat r6', 'ph-velour_velvet', 0.3, tint='#8a412c', rough=0.88, nstr=0.7, sheen=0.25, hsv=(0.5, 0.0, 1.0))
sf6, sf6o = cz('r6-sofa', SBX + SFD6 / 2, r6y + 0.15, 90, z=0.0, mats={'fab': SUEDE6, 'dark': R.flat_mat('alas sofa r6', '#2a2522', 0.6)})
bpy.context.view_layer.update()
# bantal sofa rapi (ref 1): zaitun · cream · zaitun bersandar + 1 guling cream di chaise
PO6 = fab('bantal linen zaitun r6', '#55573a', 'fabric-linen', 0.3, 0.4); PCR6 = fab('bantal linen cream r6', '#d9cfbd', 'fabric-linen', 0.3, 0.4)
for k_, (dy_, m_) in enumerate(((-1.05, PO6), (-0.62, PCR6), (0.5, PO6), (0.92, PCR6))):
    pillow5('bantal sofa r6', 0.5, 0.5, 0.17, Vector((SBX + 0.42, r6y + 0.15 + dy_, 0.74)), (0, math.radians(70), math.radians((k_ - 1.5) * 4)), m_, flat=1.0, seed=31 + k_)
# 2 lukisan abstrak sendiri, tepat di tengah sofa (C49.2), bingkai oak tipis
for k_, s_ in enumerate((-1, 1)):
    painting_at(r6x0, r6y + 0.15 + s_ * 0.6, 1.95, 1.0, 1.33, os.path.join(R.ROOT, 'tools', 'render', 'art', 'lukisan-r6-%s.jpg' % 'ab'[k_]), '+x', fm=OAK6)
    R.spot(c, 'sorot lukisan r6', (r6x0 + 1.2, r6y + 0.15 + s_ * 0.6, ZS6 - 0.02), (r6x0, r6y + 0.15 + s_ * 0.6, 1.9), float(arg('r6art', 30)), R.kelvin(3000), size=0.01, ang=28, blend=0.4)
# karpet bulat bermotif sendiri (krem + busur hitam + setengah cakram terracotta & cokelat), bertekstur bulu pendek
RG6 = (r6x0 + 2.0, r6y - 0.15); RR6 = 1.5
bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=RR6, depth=0.016, location=(RG6[0], RG6[1], 0.008))
rg6 = bpy.context.active_object; rg6.name = 'karpet bulat r6'
for cl_ in list(rg6.users_collection): cl_.objects.unlink(rg6)
c.objects.link(rg6)
uv_ = rg6.data.uv_layers.active or rg6.data.uv_layers.new(name='UVMap')
for p_ in rg6.data.polygons:
    for li_ in p_.loop_indices:
        v_ = rg6.data.vertices[rg6.data.loops[li_].vertex_index].co
        uv_.data[li_].uv = (0.5 + v_.y / (2 * RR6) * 0.98, 0.5 - v_.x / (2 * RR6) * 0.98)   # dari kamera (menghadap −x): kanan gambar = +y, atas gambar = jauh
mrg = bpy.data.materials.new('karpet bulat r6'); nt_ = mrg.node_tree; bs_ = nt_.nodes.get('Principled BSDF')
ti_ = nt_.nodes.new('ShaderNodeTexImage'); ti_.image = bpy.data.images.load(os.path.join(R.ROOT, 'tools', 'render', 'art', 'karpet-r6.png'))
nt_.links.new(ti_.outputs['Color'], bs_.inputs['Base Color']); bs_.inputs['Roughness'].default_value = 0.97
nz_ = nt_.nodes.new('ShaderNodeTexNoise'); nz_.inputs['Scale'].default_value = 900.0; bm_ = nt_.nodes.new('ShaderNodeBump'); bm_.inputs['Strength'].default_value = 0.35
nt_.links.new(nz_.outputs['Fac'], bm_.inputs['Height']); nt_.links.new(bm_.outputs['Normal'], bs_.inputs['Normal'])   # bulu pendek: tidak datar seperti plastik
try: bs_.inputs['Sheen Weight'].default_value = 0.5
except Exception: pass
mrg['img'] = ti_.image.filepath; mrg['flat'] = '#d3c8b5'; rg6.data.materials.append(mrg)
bv6 = rg6.modifiers.new('tepi', 'BEVEL'); bv6.width = 0.007; bv6.segments = 2
# meja kopi bulat: daun oak Ø 80 cm + kaki silinder plester abu (ref 2) + baki, lilin, vas kecil
TBX6, TBY6 = SBX + 1.5, r6y - 0.35
R.cyl(c, 'kaki meja kopi r6', TBX6, TBY6, 0.016, 0.36, 0.22, R.tex_mat('plester abu meja r6', 'ph-clay_plaster', 0.6, tint='#a29d95', rough=0.8, nstr=0.4), seg=96)
R.cyl(c, 'daun meja kopi r6', TBX6, TBY6, 0.36, 0.4, 0.4, OAK6, seg=128)
R.cyl(c, 'baki meja kopi r6', TBX6 + 0.05, TBY6 - 0.05, 0.4, 0.415, 0.15, R.flat_mat('baki hitam r6', '#1f1c1a', 0.4), seg=64)
for dx_, dy_, h_ in ((0.02, -0.08, 0.09), (0.09, -0.01, 0.06)): R.cyl(c, 'lilin r6', TBX6 + dx_, TBY6 + dy_, 0.415, 0.415 + h_, 0.032, R.flat_mat('lilin cream r6', '#e6dcc9', 0.6), seg=32)
R.place(c, 'ceramic_vase_04', (TBX6 - 0.14, TBY6 + 0.12, 0.4), 0, fit=('z', 0.18))
# lampu drum rotan besar di depan-kiri (ref 1) — tidak menutupi lukisan dari sudut foto
PDX6, PDY6, PDZ6 = r6x0 + 1.8, r6y - 0.95, 2.2
bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=0.34, depth=0.4, end_fill_type='NOTHING', location=(PDX6, PDY6, PDZ6 + 0.2))
dr6 = bpy.context.active_object; dr6.name = 'kap drum rotan r6'
for cl_ in list(dr6.users_collection): cl_.objects.unlink(dr6)
c.objects.link(dr6); dr6.data.materials.append(R.tex_mat('anyaman rotan r6', 'weave-rattan', 0.35, tint='#c9a46e', rough=0.7, nstr=1.0))
so6 = dr6.modifiers.new('tebal', 'SOLIDIFY'); so6.thickness = 0.006
for zz_ in (PDZ6, PDZ6 + 0.4): R.cyl(c, 'cincin kap rotan r6', PDX6, PDY6, zz_ - 0.006, zz_ + 0.006, 0.342, R.flat_mat('rotan tepi r6', '#b08a55', 0.6), seg=128)
R.cyl(c, 'diffuser kap rotan r6', PDX6, PDY6, PDZ6 + 0.05, PDZ6 + 0.054, 0.32, R.emit_mat('diffuser rotan r6', R.kelvin(2700), 3.0), seg=96)
R.cyl(c, 'kabel lampu rotan r6', PDX6, PDY6, PDZ6 + 0.4, H, 0.004, M['black'], seg=12)
R.cyl(c, 'kanopi lampu rotan r6', PDX6, PDY6, H - 0.03, H, 0.06, M['black'], seg=32)
R.point(c, 'lampu rotan r6', (PDX6, PDY6, PDZ6 + 0.2), float(arg('r6pend', 40)), R.kelvin(2700), size=0.12).visible_camera = False
# lampu lantai lengkung + meja samping oak di kiri sofa (ref 2)
SDX6, SDY6 = SBX + 0.32, r6y - 1.7
R.cyl(c, 'meja samping r6', SDX6, SDY6, 0.0, 0.5, 0.2, OAK6, seg=96)
R.place(c, 'potted_plant_04', (SDX6, SDY6, 0.5), 20, fit=('z', 0.32))
LBX6, LBY6 = SBX + 0.2, r6y - 2.25
R.cyl(c, 'alas lampu lantai r6', LBX6, LBY6, 0.0, 0.03, 0.15, R.tex_mat('marmer hitam lampu r6', 'stone-nero', 0.5, rough=0.3), seg=64)
LMP6 = R.flat_mat('besi hitam lampu r6', '#1d1b1a', 0.4, metal=1.0)
gnarl('tiang lampu lengkung r6', [(LBX6, LBY6, 0.03), (LBX6, LBY6, 0.9), (LBX6 + 0.05, LBY6 + 0.05, 1.55), (LBX6 + 0.28, LBY6 + 0.28, 1.88), (LBX6 + 0.55, LBY6 + 0.55, 1.82)],
      [0.012] * 5, LMP6, lump=0.0)
R.sphere(c, 'kap lampu lantai r6', (LBX6 + 0.58, LBY6 + 0.58, 1.64), 0.14, R.emit_mat('kaca opal lampu r6', R.kelvin(2800), 2.0))
R.point(c, 'lampu lantai r6', (LBX6 + 0.58, LBY6 + 0.58, 1.62), float(arg('r6floor', 20)), R.kelvin(2800), size=0.14).visible_camera = False
# kabinet oak rendah di dinding selatan (depan, ref 1) + vas terracotta & buku
KB6 = (r6x0 + 3.05, r6x0 + 4.2)
B('kabinet oak r6', KB6[0], KB6[1], r6y0, r6y0 + 0.42, 0.16, 0.68, OAK6, bevel=0.006)
for k_ in range(1, 3): B('garis pintu kabinet r6', KB6[0] + (KB6[1] - KB6[0]) * k_ / 3 - 0.002, KB6[0] + (KB6[1] - KB6[0]) * k_ / 3 + 0.002, r6y0 + 0.418, r6y0 + 0.423, 0.18, 0.66, R.flat_mat('celah kabinet r6', '#5a4632', 0.7))
v6a, v6ao = R.place(c, 'ceramic_vase_01', (KB6[0] + 0.25, r6y0 + 0.22, 0.68), 0, fit=('z', 0.32)); R.recolor(v6ao, R.flat_mat('keramik terracotta r6', '#b06a4c', 0.6))
books_flat(KB6[0] + 0.75, r6y0 + 0.22, 0.68, rot=90, n=3, w=0.3)
def plant_in_pot(name, x, y, h, rot, pot_hex, pr, pick=None):
    """Tanaman dalam pot: batang (titik terendah model) dipindah tepat ke tengah pot — bbox tajuk yang miring tidak menggeser batang."""
    zt = pot(x, y, pot_hex, pr, pr * 1.6) - 0.04
    piv, obs = R.place(c, name, (x, y, zt), rot, fit=('z', h), pick=pick); bpy.context.view_layer.update()
    vs = [o.matrix_world @ v.co for o in obs if o.type == 'MESH' for v in o.data.vertices]
    zl = min(v.z for v in vs); low = [v for v in vs if v.z < zl + 0.06]
    piv.location.x += x - sum(v.x for v in low) / len(low); piv.location.y += y - sum(v.y for v in low) / len(low)
    return piv, obs
# pohon pachira di sudut belakang-utara dalam pot keramik cream (ref 1–2)
plant_in_pot('pachira_aquatica_01', r6x0 + 0.55, r6y1 - 0.5, 2.2, 10, '#d9cdb9', 0.26, pick='_d')
# PROFIL DINDING Room 2–5 (28 Okt): profil minimalis yang disetujui pemilik di Room 1 (plint, list plafon bertingkat, bingkai
# panel) dalam warna dinding masing-masing → dinding 4,8 m tidak lagi bidang kosong datar
PROFM[0] = wallmat('profil cream ruang 2', CREAM); wall_y(r2y1 - 0.03, -1, xe + 0.32, r2x1 - 0.5, bays=[(csx - 1.25, csx + 1.25)])
PROFM[0] = NAVYM
# CAHAYA Room 2–5 (28 Okt, ulang sesuai skill archviz & blender-lighting-lookdev): Room 2–5 tanpa jendela → dulu hanya lampu
# titik hangat → datar & oranye. Kini resep interior: KUNCI = panel cahaya besar lembut 4500K dari sisi terbuka (lorong), 35° ke
# bawah (bayangan lembut berarah); ISI = plafon luas ±⅓ kunci, 4000K; PRAKTIS hangat 2700–2800K (lampu meja, lampu dinding,
# lampu lukisan) di daya nyata; SOROT 3000K hanya aksen produk. Lampu plafon bulat tinggal perlengkapan (tanpa lampu titik).
RKEY = float(arg('rkey', 0.8)); RFILL = float(arg('rfill', 0.3))
def room_light(xa, xb, ya, yb, side, key=900, fill=140):
    xa, xb = min(xa, xb), max(xa, xb); ya, yb = min(ya, yb), max(ya, yb)
    for gx in (xa + (xb - xa) * 0.3, xa + (xb - xa) * 0.7):
        for gy in (ya + (yb - ya) * 0.28, ya + (yb - ya) * 0.72):
            R.cyl(c, 'lampu plafon', gx, gy, H - 0.03, H, 0.24, M['rim'], seg=48)
            R.cyl(c, 'lampu plafon menyala', gx, gy, H - 0.035, H - 0.03, 0.2, R.emit_mat('lampu plafon', GENK, 2.0), seg=48)
    kx = (xb + 0.5) if side > 0 else (xa - 0.5)                       # side +1: sisi terbuka di timur (Room 2–3), −1: barat (Room 4–5)
    R.area(c, 'kunci ruang', (kx, (ya + yb) / 2, 3.7), (0, math.radians(55 * side), 0), 2.2, (yb - ya) * 0.9, key * RKEY, R.kelvin(4500), spread=120)
    R.area(c, 'isi plafon', ((xa + xb) / 2, (ya + yb) / 2, H - 0.05), (0, 0, 0), (xb - xa) * 0.85, (yb - ya) * 0.85, fill * RFILL, R.kelvin(4000))
room_light(r2x0, r2x1, r2y0, r2y1, +1, float(arg('r2key', 450)), float(arg('r2fill', 140)))
R.area(c, 'isi koridor', ((TRAYS[1][0] + TRAYS[1][1]) / 2, KYM, ZS - 0.03), (0, 0, 0), 4.0, 2.0, float(arg('kfill', 150)), R.kelvin(2900))['livek'] = 3300
room_light(r3x0, r3x1, r3y0, r3y1, +1, float(arg('r3key', 94)), float(arg('r3fill', 35)))
room_light(r4x0, r4x1, r4y0, r4y1, -1, float(arg('r4key', 150)), float(arg('r4fill', 60)))
room_light(r5x0, r5x1, r5y0, r5y1, -1, float(arg('r5key', 60)), float(arg('r5fill', 18)))   # redup seperti referensi kamar (C57.3)
room_light(r6x0, x0, r6y0, r6y1, +1, float(arg('r6key', 110)), float(arg('r6fill', 45)))   # Room 6: sisi terbuka di timur (bukaan tembok barat)
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
        ((404, 118), 118), ((392, 92), 140), ((310, 78), 165), ((216, 70), 180), ((122, 72), 197), ((84, 96), 216),
        ((74, 128), 248), ((72, 195), 270), ((72, 357), 270), ((72, 425), 270),
        ((92, 416), 315), ((114, 396), 380), ((123, 376), 430), ((123, 366), 450)]   # akhir: putar 180° (arah tetap) → menghadap Room 6 di barat (C64)
NKOLD = 18                                                           # jumlah titik kunci sebelum Room 6 → kecepatan jalur lama dipertahankan
def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
def build_path(keys):
    """Titik kunci → (pts, dense, cost): posisi Catmull-Rom, arah pandang monoton (Hermite Fritsch–Carlson: tidak menoleh kiri-kanan),
    biaya = jarak + putaran × yawcost, dihaluskan → kecepatan layar rata."""
    pts_ = [(P(*p), math.radians(a)) for p, a in keys]; ys = [q[1] for q in pts_]; n = len(ys)
    def tan(k):
        if k == 0 or k == n - 1: return 0.0
        d0, d1 = ys[k] - ys[k - 1], ys[k + 1] - ys[k]
        return 0.0 if d0 * d1 <= 0 else 2 * d0 * d1 / (d0 + d1)
    def yaw_mono(i, t):
        y0, y1, m0, m1 = ys[i], ys[i + 1], tan(i), tan(i + 1)
        h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
        return h00 * y0 + h10 * m0 + h01 * y1 + h11 * m1
    dn = []
    for i in range(len(pts_) - 1):
        p0 = pts_[max(0, i - 1)]; p1 = pts_[i]; p2 = pts_[i + 1]; p3 = pts_[min(len(pts_) - 1, i + 2)]
        for k in range(80):
            t = k / 80; dn.append((catmull(p0[0], p1[0], p2[0], p3[0], t), yaw_mono(i, t)))
    dn.append(pts_[-1])
    dist_ = [0.0] + [(dn[k][0] - dn[k - 1][0]).length for k in range(1, len(dn))]
    rate_ = [1.0] + [(dist_[k] + abs(dn[k][1] - dn[k - 1][1]) * float(arg('yawcost', 3.2))) / max(1e-6, dist_[k]) if dist_[k] > 1e-6 else 1.0 for k in range(1, len(dn))]
    Wn = int(arg('smooth', 50)); n_ = len(rate_); pre = [0.0]
    for r_ in rate_: pre.append(pre[-1] + r_)
    rate_s = [(pre[min(n_, k + Wn + 1)] - pre[max(0, k - Wn)]) / (min(n_, k + Wn + 1) - max(0, k - Wn)) for k in range(n_)]
    cs = [0.0]
    for k in range(1, len(dn)): cs.append(cs[-1] + dist_[k] * rate_s[k])
    return pts_, dn, cs
# jalur lama (lobi → Room 5) dihitung PERSIS seperti sebelum Room 6 → frame 0–420 tidak berubah (video v12-Render tetap cocok)
pts_o, dense_o, cost_o = build_path(KEYS[:NKOLD]); TOT_o = cost_o[-1]; CPF = TOT_o / 420.0
# sambungan Room 6 (C64): dari titik kunci lama ke-17 (terakhir) lewat putaran 180°; titik kunci ke-16 hanya sebagai arah masuk
pts_x, dense_x, cost_x = build_path(KEYS[NKOLD - 2:]); X0_ = cost_x[80]
NF = int(arg('nf', 0)) or 420 + int(math.ceil((cost_x[-1] - X0_) / CPF))
pts = [(P(*p), math.radians(a)) for p, a in KEYS]; dense = dense_o; TOT = TOT_o + (cost_x[-1] - X0_)
print('[galery12] jalur %.2f (lama %.2f = 420 frame) → %d frame' % (TOT, TOT_o, NF), flush=True)
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
    if f >= NZ: return r2_zoom(f), 0.0, 0.0
    u = f / NZ; e = u * u * (3 - 2 * u); zf = Z0 + (1 - Z0) * e
    p, yaw = cam_pose(f); fw = Vector((-math.sin(yaw), math.cos(yaw), 0)); rt = Vector((math.cos(yaw), math.sin(yaw), 0))
    d = ZQ - Vector((p.x, p.y, CAM_Z)); th = math.tan(math.atan(18 / LENS))
    w = (zf - 1) / (Z0 - 1)
    return zf, d.dot(rt) / d.dot(fw) / th * w, d.z / d.dot(fw) / th * w
R2Z = float(arg('r2zoom', 0.86))                                     # Ruang besar: sedikit zoom out (28 Okt, C20.1) — sudut lebih lebar, jalur tetap
KZZ = float(arg('kzoom', 0.8))                                      # Koridor 3 podium: kamera lebih mundur + sudut lebih lebar (29 Okt, C24)
def r2_zoom(f):
    for fa, fb, zz, rp in ((frame_of(4), frame_of(7) - 10, R2Z, 10.0), (frame_of(9) - 6, frame_of(14), KZZ, 14.0)):
        if fa < f < fb:
            u = min(1.0, (f - fa) / rp, (fb - f) / rp); return 1.0 + (zz - 1.0) * u * u * (3 - 2 * u)
    return 1.0
def cam_main(f):
    f = f % NFM
    if f <= 420: dn, cs, s = dense_o, cost_o, min(TOT_o, CPF * f)                       # jalur lama, biaya per frame tetap
    else: dn, cs, s = dense_x, cost_x, min(cost_x[-1], X0_ + CPF * (f - 420))         # sambungan putaran ke Room 6
    k = min(len(dn) - 2, max(0, bisect.bisect_right(cs, s) - 1))
    t = (s - cs[k]) / max(1e-9, cs[k + 1] - cs[k])
    return Vector((*dn[k][0].lerp(dn[k + 1][0], t).xy, 0)), dn[k][1] + (dn[k + 1][1] - dn[k][1]) * t
def frame_of(ki):
    if ki < NKOLD:
        target = pts[ki][0]; kk = min(range(len(dense_o)), key=lambda k: (dense_o[k][0] - target).length)
        return NZ + int(round(cost_o[kk] / CPF))
    kk = (ki - (NKOLD - 2)) * 80
    return NZ + 420 + int(round((cost_x[min(kk, len(cost_x) - 1)] - X0_) / CPF))
ROOMS = [(0, 'Lobi'), (frame_of(5) - 12, 'Ruang besar'), (frame_of(7) - 10, 'Ruang kecil'), (frame_of(10), 'Dinding pajang'),
         (frame_of(15) - 6, 'Ruang kiri atas'), (frame_of(16) - 14, 'Ruang kiri bawah'), (frame_of(19), 'Ruang barat')]
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

for m_ in bpy.data.materials:                                          # Room 2: warna rata 3D langsung = warna konsep (tint), bukan rata-rata tekstur
    n_ = m_.name
    if n_ in ('abu tua kiri', 'abu tua kanan', 'abu tua atas'): m_['flat'] = DGREY
    elif n_ in ('cream ruang 2', 'cream ruang 2 b', 'cream sayap', 'cream sayap b', 'profil cream selatan ruang 2', 'profil cream ruang 2'): m_['flat'] = CREAM
    elif n_ == 'marmer abu ruang 2': m_['flat'] = '#9f9b96'
if arg('export'):
    import numpy as _np
    dst = os.path.join(R.ROOT, 'assets', 'galeri', 'g12'); os.makedirs(dst, exist_ok=True)
    yup = lambda v: [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
    bpy.context.view_layer.update()
    lights = []
    for ob in [o for o in sc.objects if o.type == 'LIGHT']:
        mw = ob.matrix_world; d = ob.data; dirv = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
        Lj = {'t': d.type, 'p': yup(mw.translation), 'd': yup(dirv), 'c': [round(x, 3) for x in (R.kelvin(ob['livek']) if ob.get('livek') else d.color)], 'e': round(d.energy * float(ob.get('livee', 1.0)), 1)}
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
    # FOTO PER RUANG (28 Okt, pemilik: "buat foto screenshot pada setiap room dan sudah terender. tidak render full"):
    # satu foto diam per ruang dari sisi lorong/jalur galeri, dibingkai agar seluruh tata ruang terlihat. --stills [nama,…]
    def look(px, py, tx, ty, lens=28, z=1.3, ex=-1.35, wb=4400, pitch=0.0, shift=-0.1):
        """wb per foto: Room 2–5 diterangi lampu hangat tanpa cahaya jendela → keseimbangan putih 4100K agar warna konsep
        (cream, greige, abu, beige kecokelatan) tetap terbaca, cahaya tetap hangat."""
        return (px, py, math.atan2(-(tx - px), ty - py), lens, z, ex, wb, pitch, shift)
    STILLS = {
        'ruang1-lobi': None,                                             # = frame 0 jalur (posisi awal yang dipilih pemilik)
        'ruang1-lobi-2': look(9.6, 1.4, 5.6, 5.6, 24, z=1.45, ex=-1.6, wb=5000, shift=-0.05),   # sisi kanan lobi: sideboard Customize + lukisan + sofa
        'ruang2-besar': look(12.4, 9.6, 6.5, 9.9, 22, shift=0.02),
        'ruang2-34': look(11.5, 12.6, 6.8, 8.3, 22, shift=0.04),
        'ruang3-kecil': look(10.6, 13.9, 6.9, 16.3, 28, ex=-0.94, wb=3900),
        'dinding-pajang': look(6.0, 21.4, 6.0, 18.5, 22, z=1.5, shift=-0.04, ex=-0.95, wb=3800),
        'koridor': look(9.6, KYM - 0.3, 0.0, KYM + 0.05, 28, z=1.45, shift=0.1, ex=-0.95, wb=3800),
        'ruang4-kiri-atas': look(0.9, 13.0, 5.2, 15.8, 26, ex=-0.35, wb=3900),
        'ruang6-barat': look(1.3, r6y + 1.2, r6x0 + 0.4, r6y - 0.9, 24, z=1.3, ex=-2.3, wb=4800, pitch=0, shift=-0.06),   # ruang duduk terracotta: 3/4 dari dalam ruang (seperti ref 1)
        'ruang5-kiri-bawah': look(0.45, 9.85, 5.9, 9.5, 21, z=1.4, ex=-0.1, wb=4300, pitch=-3, shift=0.04),   # kamar tidur: menghadap dinding ranjang (seperti referensi 2)
        'cek-ruang4-selatan': look(2.2, 16.9, 4.6, 12.6, 24, ex=-0.35, wb=3900),    # cek saja (konsol, dinding selatan); tidak ikut --stills tanpa nama
        'cek-ruang4-utara': look(2.0, 13.4, 5.0, 18.3, 24, ex=-0.35, wb=3900),     # cek saja (dinding semen berlapis)
    }
    if arg('stills'):
        want = [k for k in STILLS if (arg('stills') is True and not k.startswith('cek-')) or k in str(arg('stills')).split(',')]
        for k in want:
            if STILLS[k] is None: cam_at(0.0); R.color_management(sc, float(arg('exposure', -1.6)), float(arg('wb', 5000)))
            else:
                px, py, yaw, lens, z, ex, wb, pitch, shift = STILLS[k]; R.color_management(sc, ex + float(arg('exadd', 0.0)), wb)
                cam.location = (px, py, z); cam.rotation_euler = (math.radians(90 + pitch), 0, yaw); cd.lens = lens; cd.shift_x = 0; cd.shift_y = shift
            t0 = time.time(); bpy.ops.render.render(write_still=False)
            R.save(sc, os.path.join(OUT, 'foto-' + k), webp=False)
            print('[galery12] foto %s %.1f s' % (k, time.time() - t0), flush=True)
        sys.exit(0)
    # --shots a-b = rentang frame (mis. 0-385 untuk Room 1 → Room 4); --skipdone melompati frame yang sudah ada (lanjut bila terputus)
    shots = [str(f_) for p_ in str(arg('shots', '0,30,60')).split(',') for f_ in (range(int(p_.split('-')[0]), int(p_.split('-')[1]) + 1) if '-' in p_ else [p_])]
    sc.render.use_persistent_data = len(shots) > 1
    for s_ in shots:
        if arg('skipdone') and any(os.path.exists(os.path.join(OUT, 'f%03d' % int(float(s_)) + e_)) for e_ in ('.jpg', '.png')): continue
        cam_at(float(s_)); t0 = time.time(); bpy.ops.render.render(write_still=False)
        R.save(sc, os.path.join(OUT, 'f%03d' % int(float(s_))), webp=False)
        print('[galery12] frame %s %.1f s' % (s_, time.time() - t0), flush=True)
