"""Turunkan lengan manikin skala (assets/library/mannequin) dari A-pose / T-pose ke pose santai manusia normal.
Pakai:  blender -b --python tools/glb/mannequin-arms.py -- <in.glb> <out.glb> <preset>
Preset: pria | wanita | manikin (ambang torso, sendi bahu, sudut putar — dari analisis sebaran vertex 25 Okt 2026).
Vertex lengan (|x| di luar torso, dalam rentang tinggi lengan) diputar di bidang depan (XZ Blender) mengitari sendi bahu,
bobot halus (smoothstep) di pangkal lengan agar bahu tidak patah. Ekspor GLB Draco seperti aslinya."""
import bpy, sys, math

PRESET = {
    # tx/fx: ambang & lebar peralihan |x| (m) · px/pz: sendi bahu (m) · z0/z1: rentang tinggi lengan · deg: sudut diturunkan
    'pria':    dict(tx=.215, fx=.275, px=.19, pz=1.36, z0=.60, z1=1.46, deg=24),
    'wanita':  dict(tx=.175, fx=.235, px=.17, pz=1.34, z0=.55, z1=1.44, deg=17),
    'manikin': dict(tx=.19,  fx=.25,  px=.18, pz=1.32, z0=1.18, z1=1.44, deg=80),
}

def smooth(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

def run(src, dst, name):
    P = PRESET[name]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    obs = [o for o in bpy.data.objects if o.type == 'MESH']
    assert len(obs) == 1, obs
    o = obs[0]; me = o.data
    # bekukan transformasi objek supaya koordinat vertex = koordinat dunia
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    zs = [v.co.z for v in me.vertices]; H = max(zs) - min(zs)
    k = 1.7 / H   # skala ke 170 cm bila belum
    th = math.radians(P['deg']); n = 0
    # normal kustom asli (hasil bake dari mesh halus) dipertahankan & ikut diputar — mesh ini low-poly,
    # normal yang dihitung ulang tampak bersegi
    loops = [v.vector.copy() for v in me.corner_normals]
    rot = {}   # indeks vertex → (sisi, sudut putar)
    for v in me.vertices:
        x, y, z = v.co.x * k, v.co.y * k, v.co.z * k
        ax = abs(x)
        if ax <= P['tx'] or z < P['z0'] or z > P['z1']:
            continue
        w = smooth((ax - P['tx']) / (P['fx'] - P['tx']))
        s = 1 if x > 0 else -1
        dx, dz = ax - P['px'], z - P['pz']
        r = math.hypot(dx, dz)
        a = math.atan2(dx, -dz)          # sudut dari arah lurus ke bawah, positif = menjauh dari badan
        a2 = a - th * w
        nx, nz = P['px'] + r * math.sin(a2), P['pz'] - r * math.cos(a2)
        v.co.x, v.co.z = s * nx / k, nz / k
        rot[v.index] = (s, th * w); n += 1
    for p in me.polygons:
        for li in p.loop_indices:
            rr = rot.get(me.loops[li].vertex_index)
            if not rr: continue
            s, ph = rr; nv = loops[li]
            cx, sx = math.cos(ph), math.sin(ph)
            loops[li] = type(nv)((nv.x * cx + s * nv.z * sx, nv.y, -s * nv.x * sx + nv.z * cx))
    me.normals_split_custom_set([(l.x, l.y, l.z) for l in loops])
    me.update()
    # laporan sebaran baru
    N = 20; zs = [v.co.z for v in me.vertices]; mn = min(zs); H = max(zs) - mn
    bk = [0.0] * N
    for v in me.vertices:
        i = min(N - 1, int((v.co.z - mn) / H * N)); bk[i] = max(bk[i], abs(v.co.x))
    print('DONE', name, 'moved', n, 'bands', ' '.join('%d%%:%d' % (i * 5, b / H * 170) for i, b in enumerate(bk)))
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=7, export_apply=True, export_yup=True,
                              export_animations=False, export_skins=False, export_morph=False)

argv = sys.argv[sys.argv.index('--') + 1:]
run(argv[0], argv[1], argv[2])
