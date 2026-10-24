/* Serat kayu per komponen untuk SEMUA model katalog berkayu (material extras xc_wood).
   node tools/glb/grain-all.js [id-atau-path ...]
   - Sumber selalu salinan sebelum-serat di data/source/glb-pregrain/<item>/<file> (dibuat sekali; aman diulang).
   - Blender tools/glb/grain.py → assets/items/... lalu kompres Draco + WebP (tools/compress/compress.js).
   - Cek: nama node, extras node/material/scene, ekstensi glTF sebelum = sesudah; selisih dicetak sebagai PERINGATAN. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), ITEMS = path.join(ROOT, 'assets/items'), PRE = path.join(ROOT, 'data/source/glb-pregrain');
const BLENDER = require('../blender-path').BLENDER;   // env BLENDER → PATH → folder pemasangan umum
const list = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => { const p = path.join(d, e.name); return e.isDirectory() ? list(p) : /\.glb$/i.test(e.name) ? [p] : []; });
const json = (f) => { const b = fs.readFileSync(f), n = b.readUInt32LE(12); return JSON.parse(b.slice(20, 20 + n).toString()); };
const woody = (j) => (j.materials || []).some((m) => m.extras && m.extras.xc_wood);
function sig(j) {
  const ex = (o) => o && o.extras ? Object.keys(o.extras).sort().join(',') : '';
  return {
    nodes: (j.nodes || []).map((n) => n.name + '[' + ex(n) + ']').sort().join('|'),
    mats: (j.materials || []).map((m) => m.name + '[' + ex(m) + (m.extras && m.extras.xc_wood ? '=' + m.extras.xc_wood : '') + ']').sort().join('|'),
    scene: (j.scenes || []).map(ex).join('|'),
    ext: (j.extensionsUsed || []).filter((x) => x !== 'KHR_draco_mesh_compression').sort().join(',')
  };
}
/* data/source/glb-pregrain/_done.json mencatat ukuran+waktu file hasil. Bila file di assets berubah (model DIBANGUN ULANG oleh
   finish.py / ai-wood.js / fit.js / furniture.py), salinan sumber diperbarui dulu dari file baru → jalankan lagi setelah rebuild.
   node tools/glb/grain-all.js --stamp → hanya catat file sekarang sebagai hasil (tanpa proses). */
const DONE = path.join(PRE, '_done.json'), done = fs.existsSync(DONE) ? JSON.parse(fs.readFileSync(DONE, 'utf8')) : {};
const stamp = (f) => { const st = fs.statSync(f); return st.size + ':' + Math.round(st.mtimeMs); };
const STAMP = process.argv.includes('--stamp');
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = list(ITEMS).filter((f) => !/\.tmp$/.test(f) && (!want.length || want.some((w) => f.split(path.sep).join('/').includes(w))) && woody(json(f)));
let ok = 0, warn = 0;
for (const f of files) {
  const rel = path.relative(ITEMS, f).split(path.sep).join('/'), pre = path.join(PRE, rel);
  if (STAMP) { done[rel] = stamp(f); continue; }
  const rebuilt = done[rel] && done[rel] !== stamp(f);   // file assets bukan hasil terakhir kita → model dibangun ulang
  if (!fs.existsSync(pre) || rebuilt) { fs.mkdirSync(path.dirname(pre), { recursive: true }); fs.copyFileSync(f, pre); if (rebuilt) console.log('sumber baru', rel); }
  const s0 = sig(json(pre));
  try {
    const out = execFileSync(BLENDER, ['-b', '--factory-startup', '-P', path.join(__dirname, 'grain.py'), '--', pre, f], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 900000 });
    const lines = out.split('\n').filter((l) => /^\[serat\] (?!selesai)/.test(l));
    execFileSync('node', [path.join(ROOT, 'tools/compress/compress.js'), f], { encoding: 'utf8' });
    const s1 = sig(json(f)), diff = Object.keys(s0).filter((k) => s0[k] !== s1[k]);
    if (diff.length) { warn++; console.log('PERINGATAN', rel, diff.map((k) => k + ': ' + s0[k].slice(0, 160) + '  ->  ' + s1[k].slice(0, 160)).join(' || ')); }
    ok++; done[rel] = stamp(f); fs.writeFileSync(DONE, JSON.stringify(done, null, 1));
    console.log('serat', rel.padEnd(80), lines.map((l) => { const m = l.match(/'regions': (\d+).*'axes': (\{[^}]*\})/); return m ? m[1] + ' komponen ' + m[2] : ''; }).join(' ; '));
  } catch (e) {
    fs.copyFileSync(pre, f); console.log('GAGAL (dikembalikan)', rel, (e.stderr || e.message || '').toString().slice(-400));
  }
}
if (STAMP) { fs.writeFileSync(DONE, JSON.stringify(done, null, 1)); console.log('dicatat', Object.keys(done).length, 'file'); }
else console.log('\n' + ok + ' dari ' + files.length + ' model diproses, ' + warn + ' peringatan.');
