# ==========================================================================
#  XIONCO — pustaka kecil untuk render ruang Galeri (Blender / Cycles)
#  Dipakai tools/render/galeri.py. Semua ukuran dalam meter, Z ke atas.
#  Tekstur dicari di assets/library/textures/<set> lalu data/source/render-lib/textures/<set>
#  (albedo / normal / rough, .webp / .jpg / .png). Proyeksi kotak koordinat objek → tanpa UV.
# ==========================================================================
import bpy, os, math
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEX_DIRS = [os.path.join(ROOT, 'assets', 'library', 'textures'), os.path.join(ROOT, 'data', 'source', 'render-lib', 'textures')]
MODEL_DIRS = [os.path.join(ROOT, 'assets', 'library', 'polyhaven'), os.path.join(ROOT, 'data', 'source', 'render-lib', 'polyhaven')]
ITEMS = os.path.join(ROOT, 'assets', 'items')

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)

def kelvin(k):
    """Warna lampu dari suhu (perkiraan, linear)."""
    t = k / 100.0
    r = 255 if t <= 66 else 329.7 * ((t - 60) ** -0.1332)
    g = 99.47 * math.log(t) - 161.1 if t <= 66 else 288.1 * ((t - 60) ** -0.0755)
    b = 255 if t >= 66 else (0 if t <= 19 else 138.5 * math.log(t - 10) - 305.0)
    c = [max(0, min(255, v)) / 255 for v in (r, g, b)]
    return tuple(v ** 2.2 for v in c)

# ---------------------------------------------------------------- bahan
_img = {}
def img(path, data=False):
    if path not in _img:
        im = bpy.data.images.load(path, check_existing=True)
        if data: im.colorspace_settings.name = 'Non-Color'
        _img[path] = im
    return _img[path]

def tex_file(tset, kind):
    for d in TEX_DIRS:
        for ext in ('.webp', '.jpg', '.png'):
            p = os.path.join(d, tset, kind + ext)
            if os.path.exists(p): return p
    return None

def tex_mat(name, tset, scale=1.0, tint=None, rough=None, rmul=1.0, nstr=0.6, metal=0.0, coat=0.0,
            sheen=0.0, bevel=0.0, rot=0.0, hsv=None, spec=None, mute=0.0):
    """Bahan PBR dari pustaka lokal. hsv=(hue, sat, val) diterapkan sebelum tint (val > 1 = lebih terang)."""
    m = bpy.data.materials.new(name); nt = m.node_tree; N = nt.nodes; Lk = nt.links
    b = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / scale, 1 / scale, 1 / scale)
    mp.inputs['Rotation'].default_value[2] = math.radians(rot)
    Lk.new(tc.outputs['Object'], mp.inputs['Vector'])
    def t(kind, data):
        p = tex_file(tset, kind)
        if not p: return None
        n = N.new('ShaderNodeTexImage'); n.image = img(p, data)
        n.projection = 'BOX'; n.projection_blend = 0.25
        Lk.new(mp.outputs[0], n.inputs['Vector']); return n
    a = t('albedo', False)
    col = a.outputs['Color'] if a else None
    if col is None:
        print('[rlib] tekstur tidak ada:', tset)
    if col is not None and hsv:
        hs = N.new('ShaderNodeHueSaturation')
        hs.inputs['Hue'].default_value, hs.inputs['Saturation'].default_value, hs.inputs['Value'].default_value = hsv
        Lk.new(col, hs.inputs['Color']); col = hs.outputs['Color']
    if tint:
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
        mx.inputs['Factor'].default_value = 1.0; mx.inputs['B'].default_value = srgb(tint)
        if col is not None: Lk.new(col, mx.inputs['A'])
        else: mx.inputs['A'].default_value = (1, 1, 1, 1)
        col = mx.outputs['Result']
    if col is not None and mute > 0 and tint:
        # redam pola: campur warna tekstur ke warna rata (lantai tenang, tidak belang)
        mm = N.new('ShaderNodeMix'); mm.data_type = 'RGBA'; mm.inputs['Factor'].default_value = mute
        Lk.new(col, mm.inputs['A']); mm.inputs['B'].default_value = srgb(tint); col = mm.outputs['Result']
    if col is not None: Lk.new(col, b.inputs['Base Color'])
    if rough is not None:
        b.inputs['Roughness'].default_value = rough
    else:
        r = t('rough', True)
        if r:
            mm = N.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = rmul; mm.use_clamp = True
            Lk.new(r.outputs['Color'], mm.inputs[0]); Lk.new(mm.outputs[0], b.inputs['Roughness'])
    nrm = None
    if nstr > 0:
        nt_ = t('normal', True)
        if nt_:
            nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr
            Lk.new(nt_.outputs['Color'], nm.inputs['Color']); nrm = nm.outputs['Normal']
    if bevel > 0:
        bv = N.new('ShaderNodeBevel'); bv.inputs['Radius'].default_value = bevel; bv.samples = 6
        if nrm: Lk.new(nrm, bv.inputs['Normal'])
        nrm = bv.outputs['Normal']
    if nrm: Lk.new(nrm, b.inputs['Normal'])
    b.inputs['Metallic'].default_value = metal
    m['flat'] = tint or '#bfb5a8'; m['rough'] = rough if rough is not None else 0.6; m['metal'] = metal   # untuk ekspor 3D langsung (warna rata)
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.05
    if sheen: b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Roughness'].default_value = 0.45
    if spec is not None: b.inputs['Specular IOR Level'].default_value = spec
    return m

def flat_mat(name, hexc, rough=0.5, metal=0.0, coat=0.0, emit=None, estr=0.0, spec=None, bevel=0.0):
    m = bpy.data.materials.new(name); N = m.node_tree.nodes; b = N.get('Principled BSDF')
    b.inputs['Base Color'].default_value = srgb(hexc); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    m['flat'] = hexc; m['rough'] = rough; m['metal'] = metal
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.04
    if spec is not None: b.inputs['Specular IOR Level'].default_value = spec
    if emit:
        b.inputs['Emission Color'].default_value = srgb(emit) if isinstance(emit, str) else tuple(emit) + (1.0,)
        b.inputs['Emission Strength'].default_value = estr
    if bevel:
        bv = N.new('ShaderNodeBevel'); bv.inputs['Radius'].default_value = bevel; bv.samples = 6
        m.node_tree.links.new(bv.outputs['Normal'], b.inputs['Normal'])
    return m

def emit_mat(name, color, strength):
    """Pemancar murni (strip LED, kotak cahaya di balik tirai)."""
    m = bpy.data.materials.new(name); nt = m.node_tree; N = nt.nodes
    out = N.get('Material Output'); N.remove(N.get('Principled BSDF'))
    e = N.new('ShaderNodeEmission'); e.inputs['Color'].default_value = tuple(color) + (1.0,) if len(color) == 3 else color
    e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], out.inputs['Surface'])
    m['emit'] = list(color)[:3]; m['estr'] = strength
    return m

def sheer_mat(name, hexc, opacity=0.55):
    """Tirai linen tipis: tembus cahaya + sebagian transparan."""
    m = bpy.data.materials.new(name); nt = m.node_tree; N = nt.nodes; Lk = nt.links
    out = N.get('Material Output'); b = N.get('Principled BSDF')
    b.inputs['Base Color'].default_value = srgb(hexc); b.inputs['Roughness'].default_value = 0.9
    b.inputs['Sheen Weight'].default_value = 0.3
    tl = N.new('ShaderNodeBsdfTranslucent'); tl.inputs['Color'].default_value = srgb(hexc)
    tr = N.new('ShaderNodeBsdfTransparent')
    m1 = N.new('ShaderNodeMixShader'); m1.inputs['Fac'].default_value = 0.55
    Lk.new(b.outputs[0], m1.inputs[1]); Lk.new(tl.outputs[0], m1.inputs[2])
    m2 = N.new('ShaderNodeMixShader'); m2.inputs['Fac'].default_value = 1 - opacity
    Lk.new(m1.outputs[0], m2.inputs[1]); Lk.new(tr.outputs[0], m2.inputs[2])
    Lk.new(m2.outputs[0], out.inputs['Surface'])
    m['flat'] = hexc; m['rough'] = 0.9; m['alpha'] = opacity
    return m

def add_grout(m, w=1.2, h=0.6, gap=0.0045, col_hex='#a89880', offset=0.5):
    """Nat ubin: Brick Texture dikalikan ke warna + sedikit cekung."""
    nt = m.node_tree; N = nt.nodes; Lk = nt.links; b = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); br = N.new('ShaderNodeTexBrick')
    br.offset = offset; br.squash = 1.0
    br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = gap
    br.inputs['Brick Width'].default_value = w; br.inputs['Row Height'].default_value = h
    br.inputs['Mortar Smooth'].default_value = 0.2
    br.inputs['Color1'].default_value = (1, 1, 1, 1); br.inputs['Color2'].default_value = (1, 1, 1, 1)
    br.inputs['Mortar'].default_value = srgb(col_hex)
    Lk.new(tc.outputs['Object'], br.inputs['Vector'])
    src = b.inputs['Base Color'].links[0].from_socket
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
    Lk.new(src, mx.inputs['A']); Lk.new(br.outputs['Color'], mx.inputs['B']); Lk.new(mx.outputs['Result'], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; bump.inputs['Distance'].default_value = 0.002
    Lk.new(br.outputs['Fac'], bump.inputs['Height'])
    if b.inputs['Normal'].links: Lk.new(b.inputs['Normal'].links[0].from_socket, bump.inputs['Normal'])
    Lk.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

# ---------------------------------------------------------------- geometri
def box(coll, name, x0, x1, y0, y1, z0, z1, mat, bevel=0.0):
    v = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob); me.materials.append(mat)
    if bevel:
        md = ob.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 3; md.limit_method = 'ANGLE'
        for p in me.polygons: p.use_smooth = True
        try: md.harden_normals = True
        except Exception: pass
    return ob

def cyl(coll, name, x, y, z0, z1, r, mat, seg=48, rot_x=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
    ob = bpy.context.active_object; ob.name = name
    for c in ob.users_collection: c.objects.unlink(ob)
    coll.objects.link(ob); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def sphere(coll, name, loc, r, mat, sz=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=r, location=loc)
    ob = bpy.context.active_object; ob.name = name; ob.scale.z = sz
    for c in ob.users_collection: c.objects.unlink(ob)
    coll.objects.link(ob); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def flutes(coll, name, x0, x1, y, z0, z1, mat, pitch=0.045, depth=0.018, axis='x', facing=-1):
    """Panel bergaris (fluted): rusuk setengah silinder berderet di depan bidang y (axis x) atau x (axis y)."""
    n = max(1, int(round((x1 - x0) / pitch))); seg = 8; verts = []; faces = []
    for i in range(n):
        a0 = x0 + i * (x1 - x0) / n; a1 = a0 + (x1 - x0) / n
        base = len(verts)
        for j in range(seg + 1):
            th = math.pi * j / seg
            u = a0 + (a1 - a0) * (1 - math.cos(th)) / 2; d = math.sin(th) * depth * facing
            for z in (z0, z1):
                verts.append((u, y + d, z) if axis == 'x' else (y + d, u, z))
        for j in range(seg):
            k = base + 2 * j; faces.append((k, k + 2, k + 3, k + 1) if facing < 0 else (k, k + 1, k + 3, k + 2))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob); me.materials.append(mat)
    return ob

def curtain(coll, name, x, ya, yb, z0, z1, mat, folds_per_m=8, depth=0.05, axis='y'):
    """Tirai berlipit sepanjang sumbu y (di bidang x) atau sumbu x (di bidang y=x param)."""
    L = yb - ya; n = max(8, int(L * folds_per_m * 6)); verts = []; faces = []
    for i in range(n + 1):
        u = ya + L * i / n; w = x + depth * math.sin(i / n * L * folds_per_m * 2 * math.pi)
        for z in (z0, z1):
            verts.append((w, u, z) if axis == 'y' else (u, w, z))
    for i in range(n): faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob); me.materials.append(mat)
    return ob

# ---------------------------------------------------------------- impor model → pivot di lantai, pusat bawah
_PROD = None
def _find_model(path):
    global _PROD
    if os.path.isabs(path) and os.path.exists(path): return path
    if _PROD is None:
        import json
        try: _PROD = {p['id']: p.get('model') for p in json.load(open(os.path.join(ROOT, 'data', 'products.json'), encoding='utf8'))['items']}
        except Exception: _PROD = {}
    if _PROD.get(path):                       # id produk → model yang dipakai situs
        return os.path.join(ROOT, _PROD[path].replace('/', os.sep))
    for d in [ITEMS] + MODEL_DIRS:
        p = os.path.join(d, path)
        if os.path.isdir(p):
            for f in sorted(os.listdir(p)):
                if f.endswith(('.glb', '.gltf')): return os.path.join(p, f)
        if os.path.exists(p): return p
    raise FileNotFoundError(path)

def place(coll, path, loc, rot=0.0, scale=1.0, name=None, fit=None, pick=None, rotx=0.0):
    """Impor GLB/glTF ke koleksi `coll`. fit=(axis, meter) menskalakan agar ukuran sumbu itu = meter.
    pick='_d' → hanya objek akar yang namanya mengandung teks itu (berkas Poly Haven berisi beberapa varian).
    rotx = putar sumber di sumbu X dulu (ranting yang tersimpan rebah)."""
    path = _find_model(path)
    lc = _layer_coll(coll); prev = bpy.context.view_layer.active_layer_collection
    bpy.context.view_layer.active_layer_collection = lc
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    bpy.context.view_layer.active_layer_collection = prev
    new = [o for o in bpy.data.objects if o not in before]
    if pick:
        keep = set()
        for o in new:
            if o.parent is None and any(k in o.name for k in ([pick] if isinstance(pick, str) else pick)):
                keep.add(o); keep.update(o.children_recursive)
        for o in [o for o in new if o not in keep]: bpy.data.objects.remove(o, do_unlink=True)
        new = [o for o in new if o in keep]
    if rotx:
        for o in new:
            if o.parent is None: o.rotation_euler.x += math.radians(rotx)
        bpy.context.view_layer.update()
    piv = bpy.data.objects.new(name or os.path.basename(os.path.dirname(path)), None); coll.objects.link(piv)
    for o in new:
        if o.parent is None:
            mw = o.matrix_world.copy(); o.parent = piv; o.matrix_world = mw
    bpy.context.view_layer.update()
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in new:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    for o in piv.children:
        o.location -= Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    s = hi - lo
    if fit:
        ax, meters = fit; scale = meters / max(1e-6, {'x': s.x, 'y': s.y, 'z': s.z}[ax])
    piv.scale = (scale,) * 3
    piv.rotation_euler = (0, 0, math.radians(rot))
    piv.location = Vector(loc)
    piv['size'] = [s.x * scale, s.y * scale, s.z * scale]
    print('[galeri] %-30s %.2f x %.2f x %.2f m' % (piv.name, s.x * scale, s.y * scale, s.z * scale))
    return piv, [o for o in new if o.type == 'MESH']

def _layer_coll(coll, lc=None):
    lc = lc or bpy.context.view_layer.layer_collection
    if lc.collection == coll: return lc
    for ch in lc.children:
        r = _layer_coll(coll, ch)
        if r: return r
    return None

def top_of(objs):
    bpy.context.view_layer.update()
    return max((o.matrix_world @ Vector(c)).z for o in objs for c in o.bound_box)

def recolor(objs, mat, only_role=None, name_has=None):
    """Ganti bahan pada objek (semua slot, atau slot dengan role / nama tertentu)."""
    for o in objs:
        for s in o.material_slots:
            m = s.material
            if m is None: continue
            if only_role and m.get('role') != only_role: continue
            if name_has and not any(k in m.name.lower() for k in name_has): continue
            s.material = mat

def fabric_upgrade(objs, hexc, tset='fabric-linen', scale=0.35, sheen=0.4, role='fabric'):
    """Kain produk → kain pustaka (tekstur halus + kilau serat) berwarna varian toko."""
    m = tex_mat('kain ' + hexc, tset, scale, tint=hexc, rough=0.92, nstr=0.9, sheen=sheen, hsv=(0.5, 0.0, 1.45))
    for o in objs:
        for s in o.material_slots:
            if s.material and (s.material.get('role') == role or 'kain' in s.material.name.lower() or 'MIDGREY' in s.material.name):
                print('[galeri]   kain →', s.material.name); s.material = m
    return m

def pot(coll, name, x, y, r_top, r_bot, h, mat):
    """Pot silinder meruncing (tanaman tanpa pot), kembali: tinggi atas pot."""
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=r_bot, radius2=r_top, depth=h, location=(x, y, h / 2))
    ob = bpy.context.active_object; ob.name = name
    for c in ob.users_collection: c.objects.unlink(ob)
    coll.objects.link(ob); ob.data.materials.append(mat)
    md = ob.modifiers.new('bevel', 'BEVEL'); md.width = 0.01; md.segments = 3
    for p in ob.data.polygons: p.use_smooth = True
    return h

# ---------------------------------------------------------------- lampu
def area(coll, name, loc, rot, sx, sy, energy, color=(1, 1, 1), spread=180, shape='RECTANGLE'):
    d = bpy.data.lights.new(name, 'AREA'); d.shape = shape; d.size = sx; d.size_y = sy; d.energy = energy; d.color = color
    try: d.spread = math.radians(spread)
    except Exception: pass
    o = bpy.data.objects.new(name, d); coll.objects.link(o); o.location = loc; o.rotation_euler = rot
    o.visible_camera = False
    return o

def spot(coll, name, loc, aim, energy, color, size=0.05, blend=0.55, ang=60):
    d = bpy.data.lights.new(name, 'SPOT'); d.energy = energy; d.shadow_soft_size = size
    d.spot_size = math.radians(ang); d.spot_blend = blend; d.color = color
    o = bpy.data.objects.new(name, d); coll.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o

def point(coll, name, loc, energy, color, size=0.05):
    d = bpy.data.lights.new(name, 'POINT'); d.energy = energy; d.shadow_soft_size = size; d.color = color
    o = bpy.data.objects.new(name, d); coll.objects.link(o); o.location = loc
    return o

# ---------------------------------------------------------------- render
def color_management(sc, exposure=0.0, wb=None):
    vs = sc.view_settings
    try: vs.view_transform = 'AgX'
    except Exception: pass
    for lk in ('AgX - Medium High Contrast', 'Medium High Contrast', 'None'):
        try: vs.look = lk; break
        except Exception: pass
    vs.exposure = exposure
    if wb:
        try: vs.use_white_balance = True; vs.white_balance_temperature = wb; vs.white_balance_tint = 0
        except Exception: pass

def use_gpu():
    """Render sewaan (tools/render/cloud): pakai GPU bila ada (OptiX > CUDA > HIP > oneAPI), selain itu None → CPU.
    Aktif hanya dengan argumen --gpu atau env XC_GPU=1, jadi render di komputer sendiri tetap CPU seperti biasa."""
    import sys
    if '--gpu' not in sys.argv and os.environ.get('XC_GPU') != '1': return None
    try: prefs = bpy.context.preferences.addons['cycles'].preferences
    except Exception as e: print('[gpu] cycles prefs tidak ada:', e); return None
    for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
        try: prefs.compute_device_type = kind
        except Exception: continue
        for fn in ('refresh_devices', 'get_devices'):
            try: getattr(prefs, fn)(); break
            except Exception: pass
        devs = [d for d in prefs.devices if d.type == kind]
        if not devs: continue
        for d in prefs.devices: d.use = d.type == kind
        print('[gpu] %s: %s' % (kind, ', '.join(d.name for d in devs)), flush=True)
        return kind
    print('[gpu] tidak ada GPU yang didukung → CPU', flush=True)
    return None

def cycles(sc, samples, threshold=0.015):
    sc.render.engine = 'CYCLES'; cy = sc.cycles; cy.device = 'GPU' if use_gpu() else 'CPU'
    cy.samples = samples; cy.use_adaptive_sampling = True; cy.adaptive_threshold = threshold
    cy.use_denoising = True
    try: cy.denoiser = 'OPENIMAGEDENOISE'; cy.denoising_prefilter = 'ACCURATE'
    except Exception: pass
    cy.max_bounces = 10; cy.diffuse_bounces = 4; cy.glossy_bounces = 4; cy.transmission_bounces = 6
    cy.transparent_max_bounces = 12; cy.sample_clamp_indirect = 6.0
    cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.0
    sc.render.threads_mode = 'AUTO'

def eevee(sc, samples=32):
    ids = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in ids else 'BLENDER_EEVEE_NEXT'
    try: sc.eevee.taa_render_samples = samples; sc.eevee.use_raytracing = True
    except Exception: pass

def save(sc, path, webp=True):
    ims = sc.render.image_settings
    ims.file_format = 'JPEG'; ims.color_mode = 'RGB'; ims.quality = 92
    bpy.data.images['Render Result'].save_render(filepath=path + '.jpg', scene=sc)
    if webp:
        try:
            ims.file_format = 'WEBP'; ims.quality = 86
            bpy.data.images['Render Result'].save_render(filepath=path + '.webp', scene=sc)
        except Exception as e:
            print('[rlib] webp gagal', e)
