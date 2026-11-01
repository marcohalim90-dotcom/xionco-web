# Gabung urutan frame JPG jadi MP4 H.264 lewat sequencer Blender (ffmpeg bawaan Blender, tanpa instal apa pun).
# blender -b --factory-startup -P tools/render/encode-mp4.py -- <folder frame> <keluaran.mp4> [fps]
import bpy, os, sys
a = sys.argv[sys.argv.index('--') + 1:]
src, out, fps = a[0], a[1], int(a[2]) if len(a) > 2 else 24
files = sorted(f for f in os.listdir(src) if f.startswith('f') and f.lower().endswith('.jpg'))
sc = bpy.context.scene
sc.sequence_editor_create()
st = sc.sequence_editor.strips.new_image('jalur', os.path.join(src, files[0]), 1, 1)
for f in files[1:]: st.elements.append(f)
img = bpy.data.images.load(os.path.join(src, files[0])); w, h = img.size
r = sc.render
r.resolution_x, r.resolution_y, r.resolution_percentage = w, h, 100
r.fps = fps; sc.frame_start = 1; sc.frame_end = len(files)
r.image_settings.media_type = 'VIDEO'
r.image_settings.file_format = 'FFMPEG'
r.ffmpeg.format = 'MPEG4'; r.ffmpeg.codec = 'H264'; r.ffmpeg.constant_rate_factor = 'HIGH'
r.filepath = out
bpy.ops.render.render(animation=True)
print('[encode] %d frame -> %s' % (len(files), out), flush=True)
