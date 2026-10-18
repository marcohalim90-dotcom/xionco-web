/* Terapkan kayu koleksi (data/wood.json) ke semua model 3D AI sekaligus.
   Pakai: node tools/glb/ai-wood.js            (atau tombol di Developer Settings › Kayu koleksi)
   - Peta warna per model: data/source/ai3d/wood-map.json (kluster tekstur asli → kelas gelap/terang/natural)
   - Sumber: data/source/glb-orig/items/<id>/model-ai.glb (asli Tripo) → ai-clean.py (bukan logam + recolor) → assets/items/<id>/model-ai.glb
   - Lalu dikompres (tools/compress). Model SketchUp tidak perlu: warnanya dari label kelas saat tampil. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const BLENDER = process.env.BLENDER || 'C:/Users/Marco/AppData/Local/Programs/Blender/blender-5.2.2-windows-x64/blender.exe';
const wood = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/wood.json'), 'utf8')).classes;
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/source/ai3d/wood-map.json'), 'utf8')).models;
const only = process.argv.slice(2);
let n = 0;
for (const id of Object.keys(map)) {
  if (only.length && only.indexOf(id) < 0) continue;
  const m = map[id], src = path.join(ROOT, 'data/source/glb-orig/items', id, 'model-ai.glb'), dst = path.join(ROOT, 'assets/items', id, 'model-ai.glb');
  if (!fs.existsSync(src)) { console.log('lewati', id, '(asli tidak ada)'); continue; }
  const pairs = (m.keep || []).map((h) => [h, h]).concat(Object.keys(m.wood || {}).map((h) => [h, (wood[m.wood[h]] || wood.gelap).hex]), m.fixed || []);
  try {
    execFileSync(BLENDER, ['-b', '--factory-startup', '--python', path.join(ROOT, 'tools/glb/ai-clean.py'), '--', src, dst, '0', '0', JSON.stringify(pairs)], { stdio: 'ignore', timeout: 300000 });
    n++; console.log('kayu', id, Object.values(m.wood || {}).filter((v, i, a) => a.indexOf(v) === i).join('/'));
  } catch (e) { console.log('GAGAL', id, e.message.slice(0, 120)); }
}
try { execFileSync(process.execPath, [path.join(ROOT, 'tools/compress/compress.js')], { stdio: 'ignore', timeout: 600000 }); } catch (e) { console.log('kompres gagal', e.message.slice(0, 120)); }
console.log(n + ' model AI diperbarui');
