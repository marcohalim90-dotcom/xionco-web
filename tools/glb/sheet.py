# Render pratinjau semua GLB di folder (workbench, 3/4 depan) → <out>/<slug>.png
# blender -b --factory-startup --python tools/glb/sheet.py -- <folder_glb> <out>
import bpy, sys, os, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]; os.makedirs(out, exist_ok=True)
for d in sorted(os.listdir(src)):
    f = os.path.join(src, d, 'model.glb')
    if not os.path.exists(f): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f)
    ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    mn = mathutils.Vector((1e9,) * 3); mx = -mn
    for o in ms:
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c); mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
    ctr = (mn + mx) / 2; size = max((mx - mn).length, 1e-3)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.scene.collection.objects.link(cam)
    cam.data.lens = 50
    dirv = mathutils.Vector((.62, -1.0, .55)).normalized()
    cam.location = ctr + dirv * size * 1.55
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc = bpy.context.scene; sc.camera = cam
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.display.shading.show_cavity = True; sc.display.shading.show_shadows = True
    sc.render.resolution_x = 480; sc.render.resolution_y = 360; sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w'); sc.world.color = (.82, .8, .76)
    sc.render.filepath = os.path.join(out, d + '.png')
    bpy.ops.render.render(write_still=True)
    print('SHEET', d)
