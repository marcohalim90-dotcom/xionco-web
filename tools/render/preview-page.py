# Bangun halaman pratinjau Galeri (satu berkas HTML, frame tertanam base64):
#   python tools/render/preview-page.py <folder seq> <keluar.html> [judul]
# Gulir mouse / touchpad / geser jari = kamera bergeser; putaran tanpa ujung.
import base64, glob, os, sys

src, out = sys.argv[1], sys.argv[2]
title = sys.argv[3] if len(sys.argv) > 3 else 'Galeri XIONCO — pratinjau'
frames = sorted(glob.glob(os.path.join(src, 'f*.jpg')))
data = ['data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode() for f in frames]
js_frames = ',\n'.join('"%s"' % d for d in data)
html = '''<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%(title)s</title>
<style>
  :root { --bg: #141210; --ink: #e9dfcf; --mute: #a39887; --gold: #c9a46a; }
  html, body { margin: 0; height: 100%%; background: var(--bg); color: var(--ink); font: 10.5px/1.4 Inter, system-ui, sans-serif; overflow: hidden; overscroll-behavior: none; }
  canvas { position: fixed; inset: 0; width: 100%%; height: 100%%; touch-action: none; }
  .hud { position: fixed; left: 16px; right: 16px; bottom: 14px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; letter-spacing: .04em; }
  .bar { position: fixed; left: 16px; right: 16px; bottom: 6px; height: 2px; background: rgba(233,223,207,.15); }
  .bar i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--gold); width: 0; }
  .tag { color: var(--mute); text-transform: uppercase; }
  .hint { position: fixed; top: 14px; left: 50%%; transform: translateX(-50%%); color: var(--mute); transition: opacity .6s; }
</style></head><body>
<canvas id="c"></canvas>
<div class="hint" id="hint">Gulir atau geser untuk berjalan · pratinjau kasar</div>
<div class="hud"><span class="tag" id="room">Ruang 1</span><span class="tag">XIONCO · Galeri</span></div>
<div class="bar"><i id="bar"></i></div>
<script>
const F = [%(frames)s];
const ROOMS = %(rooms)d, N = F.length;
const cv = document.getElementById('c'), cx = cv.getContext('2d');
const imgs = F.map(s => { const i = new Image(); i.src = s; return i; });
let pos = 0, vel = 0, target = 0;
function size() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener('resize', size); size();
function frame(k) { return imgs[((k %% N) + N) %% N]; }
function cover(img, a) {
  const r = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
  const w = img.naturalWidth * r, h = img.naturalHeight * r;
  cx.globalAlpha = a; cx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
}
function draw() {
  const k = Math.floor(pos), t = pos - k;
  const a = frame(k), b = frame(k + 1);
  if (a.complete) cover(a, 1);
  if (b.complete && t > 0.01) cover(b, t);          // campuran halus antar frame
  cx.globalAlpha = 1;
  const p = ((pos %% N) + N) %% N;
  document.getElementById('bar').style.width = (p / N * 100) + '%%';
  document.getElementById('room').textContent = 'Ruang ' + (Math.floor((p + N / ROOMS / 2) / (N / ROOMS)) %% ROOMS + 1) + ' / ' + ROOMS;
}
function tick() { pos += (target - pos) * 0.12; draw(); requestAnimationFrame(tick); }
addEventListener('wheel', e => { e.preventDefault(); target += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.02; hide(); }, { passive: false });
let tx = null;
addEventListener('pointerdown', e => { tx = e.clientX; });
addEventListener('pointermove', e => { if (tx === null) return; target -= (e.clientX - tx) * 0.06; tx = e.clientX; hide(); });
addEventListener('pointerup', () => { tx = null; });
addEventListener('keydown', e => { if (e.key === 'ArrowRight') target += 2; if (e.key === 'ArrowLeft') target -= 2; });
function hide() { document.getElementById('hint').style.opacity = 0; }
imgs[0].onload = draw; tick();
</script></body></html>''' % {'title': title, 'frames': js_frames, 'rooms': int(sys.argv[4]) if len(sys.argv) > 4 else 2}
open(out, 'w', encoding='utf8').write(html)
print('ok', len(frames), 'frame,', round(len(html) / 1e6, 1), 'MB ->', out)
