/* ==========================================================================
   XIONCO — paket render Galeri untuk GPU sewaan (tools/render/cloud/README.md)
   Pakai:  node tools/render/cloud/pack.js        (atau klik dua kali pack.cmd)
   Hasil:  output/cloud/xionco-render.tar  (±0,85 GB; isi = yang dibaca skrip Galeri, tanpa output lama)
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'output', 'cloud');
const TAR = path.join(OUT, 'xionco-render.tar');

// yang dibaca skrip Galeri (rlib.py, galery*.py): lihat os.path.join(R.ROOT, …) di skrip
const PARTS = [
  ...fs.readdirSync(path.join(ROOT, 'tools', 'render')).filter((f) => f.endsWith('.py')).map((f) => 'tools/render/' + f),
  'tools/render/art', 'tools/render/cloud/run-gpu.sh',
  'assets/items', 'assets/library', 'assets/galeri/sets.json',
  'data/products.json', 'data/source/render-lib',
].filter((p) => fs.existsSync(path.join(ROOT, p)));

fs.mkdirSync(OUT, { recursive: true });
// tar bawaan Windows (bsdtar) mengerti C:\…; tar Git Bash tidak
const tarExe = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const t0 = Date.now();
const r = spawnSync(tarExe, ['-cf', TAR, '--exclude', '__pycache__', '--exclude', 'node_modules', '-C', ROOT, ...PARTS], { stdio: 'inherit' });
if (r.status !== 0) { console.error('Gagal membuat paket (tar keluar dengan kode ' + r.status + ')'); process.exit(1); }
const mb = fs.statSync(TAR).size / 1048576;
console.log('Paket siap: ' + TAR);
console.log('Ukuran ' + mb.toFixed(0) + ' MB · ' + PARTS.length + ' bagian · ' + ((Date.now() - t0) / 1000).toFixed(0) + ' dtk');
