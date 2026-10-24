# Image → 3D gratis lewat Space resmi Hugging Face (anonim, kuota GPU harian terbatas) — cadangan bila saldo fal.ai habis.
#   python -I tools/hf3d.py <trellis2|hunyuan21> <foto> <keluar.glb>
# TRELLIS 2: microsoft/TRELLIS.2 (start_session → preprocess_image → image_to_3d 1536 → extract_glb)
# Hunyuan3D 2.1: tencent/Hunyuan3D-2.1 (generation_all: bentuk + tekstur)
import sys, shutil, os, json
from gradio_client import Client, handle_file
# token HF milik pemilik (opsional, kuota GPU lebih besar): data/private/hf.json {"token": "..."} — tidak pernah dicetak / online
_f = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'private', 'hf.json')
TOKEN = json.load(open(_f)).get('token') if os.path.exists(_f) else None
which, photo, out = sys.argv[1:4]
if which == 'trellis2':
    c = Client('microsoft/TRELLIS.2', token=TOKEN, verbose=False)
    c.predict(api_name='/start_session')
    pre = c.predict(handle_file(photo), api_name='/preprocess_image')
    c.predict(handle_file(pre), 0, '1536', api_name='/image_to_3d')
    glb, dl = c.predict(300000, 2048, api_name='/extract_glb')
    src = dl or glb
else:
    c = Client('tencent/Hunyuan3D-2.1', token=TOKEN, verbose=False)
    r = c.predict(handle_file(photo), None, None, None, None, 30, 5.0, 1234, 384, True, 8000, False, api_name='/generation_all')
    src = r[1] or r[0]   # file kedua = bertekstur
    src = src if isinstance(src, str) else src.get('value') or src.get('path')
shutil.copyfile(src, out)
print('HF3D', which, out)
