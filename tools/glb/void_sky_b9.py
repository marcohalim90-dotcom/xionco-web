# VOID SERIES · Sky B9 — lampu gantung linear: batang marmer hijau + list kuningan + diffuser LED, 2 kabel, kanopi kuningan.
# Ukuran: lampu marmer linear sejenis di pasaran (L 100/120/150 × W 8 × H 6–7 cm) → 120 × 8 × 7 cm, list kuningan 1,2 cm. Wajah ke −Y (glTF +Z).
import bpy, bmesh, sys, math
argv = sys.argv[sys.argv.index('--') + 1:]
marble_png, out_glb, out_png = argv[0], argv[1], argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
L, D, H, BR = 1.20, .080, .070, .012          # batang: panjang, dalam, tinggi, tebal list kuningan
DROP, CX = .63, .36                            # panjang kabel, posisi kabel dari tengah
CW, CD, CH = .32, .06, .03                     # kanopi

def mat(name, col, metal=0, rough=.5, emit=None, img=None, scale=1):
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; b = n['Principled BSDF']
    b.inputs['Base Color'].default_value = col + (1,); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = emit + (1,); b.inputs['Emission Strength'].default_value = 2.0
    if img:
        t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(img)
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m
M_MARBLE = mat('marmer hijau', (.12, .25, .2), 0, .22, img=marble_png)
M_BRASS = mat('kuningan', (.66, .48, .24), 1, .32)
M_STEEL = mat('kabel baja', (.78, .78, .78), 1, .35)
M_LED = mat('diffuser LED', (1, .97, .92), 0, .6, emit=(1, .86, .66))

def box(name, sx, sy, sz, loc, m, bevel=.002, uv=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.active_object; o.name = name
    o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 3; bpy.ops.object.modifier_apply(modifier='bv')
    if uv:   # UV kotak dalam meter / uv → serat marmer menerus di sepanjang batang
        bm = bmesh.new(); bm.from_mesh(o.data); lay = bm.loops.layers.uv.verify()
        for f in bm.faces:
            nx, ny, nz = (abs(c) for c in f.normal)
            for l in f.loops:
                co = l.vert.co
                u, v = (co.y, co.z) if nx > max(ny, nz) else (co.x, co.z) if ny > nz else (co.x, co.y)
                l[lay].uv = ((u + 1) / uv, (v + 1) / uv)
        bm.to_mesh(o.data); bm.free()
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o

def cyl(name, r, z0, z1, x, m, seg=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=z1 - z0, location=(x, 0, (z0 + z1) / 2)); o = bpy.context.active_object; o.name = name
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o

parts = []
parts.append(box('list kuningan', L, D, BR, (0, 0, BR / 2), M_BRASS, .0015))
parts.append(box('batang marmer', L - .004, D - .004, H - BR, (0, 0, BR + (H - BR) / 2), M_MARBLE, .002, uv=.6))
parts.append(box('diffuser', L - .03, D - .022, .002, (0, 0, -.0006), M_LED, 0))
for s in (-1, 1):
    parts.append(cyl('grip', .008, H, H + .02, s * CX, M_BRASS))
    parts.append(cyl('kabel', .0011, H + .02, H + DROP, s * CX, M_STEEL, 12))
for s in (-1, 1): parts.append(cyl('kanopi', .05, H + DROP, H + DROP + .025, s * CX, M_BRASS, 32))   # kanopi bulat per kabel

bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[1]; bpy.ops.object.join()
ob = bpy.context.active_object; ob.name = 'void-series-sky-b9'
print('TRIS', sum(len(p.vertices) - 2 for p in ob.data.polygons), 'SIZE', [round(x, 3) for x in ob.dimensions])
bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', use_selection=True, export_apply=True)

# render cek
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.scene.collection.objects.link(cam); bpy.context.scene.camera = cam
w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.93, .91, .88, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0; bpy.context.scene.world = w
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (.9, .2, .5); bpy.context.scene.collection.objects.link(sun)
sc = bpy.context.scene; sc.render.resolution_x = 900; sc.render.resolution_y = 600; sc.view_settings.view_transform = 'Standard'
import mathutils
for nm, loc, tgt in (('a', (.9, -1.6, .55), (0, 0, .33)), ('b', (.25, -.35, .12), (0, 0, .03))):
    cam.location = loc; cam.rotation_euler = (mathutils.Vector(tgt) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = out_png.replace('.png', '-' + nm + '.png'); bpy.ops.render.render(write_still=True)
