/* Model 3D AI berkayu → komponen kayu berlabel kelas (sama seperti model SketchUp).
   Pakai: node tools/glb/ai-wood.js [id ...]
   - Peta: data/source/ai3d/wood-map.json (kluster warna tekstur asli → gelap/terang/natural; keep = bukan kayu; fixed = koreksi warna bukan kayu)
   - Sumber: data/source/glb-orig/items/<id>/model-ai.glb (asli Tripo) → ai-clean.py (bukan logam + pemisahan kayu) → assets/items/<id>/model-ai.glb
   - Warna, tekstur & serat kayu TIDAK dibakar: di situs diambil dari data/wood.json (Developer Settings › Kayu koleksi),
     jadi mengubah kelas kayu di sana langsung berlaku untuk model AI juga — tidak perlu menjalankan ini lagi.
     Jalankan ulang hanya bila peta atau model aslinya berubah. Lalu dikompres (tools/compress). */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const BLENDER = process.env.BLENDER || 'C:/Users/Marco/AppData/Local/Programs/Blender/blender-5.2.2-windows-x64/blender.exe';
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/source/ai3d/wood-map.json'), 'utf8')).models;
const only = process.argv.slice(2);
let n = 0;
for (const id of Object.keys(map)) {
  if (only.length && only.indexOf(id) < 0) continue;
  const m = map[id], src = path.join(ROOT, 'data/source/glb-orig/items', id, 'model-ai.glb'), dst = path.join(ROOT, 'assets/items', id, 'model-ai.glb');
  if (!fs.existsSync(src)) { console.log('lewati', id, '(asli tidak ada)'); continue; }
  // koreksi warna bukan kayu: semua kluster lain (keep + kayu) jadi jangkar agar tidak ikut bergeser sebelum pemisahan
  const fixed = (m.fixed || []).concat((m.keep || []).concat(Object.keys(m.wood || {})).filter((h) => !(m.fixed || []).some((f) => f[0] === h)).map((h) => [h, h]));
  const split = { wood: m.wood || {}, keep: m.keep || [] };
  try {
    const out = execFileSync(BLENDER, ['-b', '--factory-startup', '--python', path.join(ROOT, 'tools/glb/ai-clean.py'), '--', src, dst, '0', '0', (m.fixed || []).length ? JSON.stringify(fixed) : '', JSON.stringify(split)], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26 });
    const w = (/WOODSPLIT .* (\d+) dari (\d+)/.exec(out) || []);
    n++; console.log('kayu', id.padEnd(24), w[1] ? w[1] + '/' + w[2] + ' muka → ' + Object.values(m.wood || {}).filter((v, i, a) => a.indexOf(v) === i).join('/') : '(tidak ada muka kayu?)');
  } catch (e) { console.log('GAGAL', id, String(e.stderr || e.message).slice(-200)); }
}
try { execFileSync(process.execPath, [path.join(ROOT, 'tools/compress/compress.js')], { stdio: 'ignore', timeout: 900000 }); } catch (e) { console.log('kompres gagal', e.message.slice(0, 120)); }
console.log(n + ' model AI: komponen kayu berlabel');
