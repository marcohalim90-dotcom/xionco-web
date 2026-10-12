/* ==========================================================================
   XIONCO — buat checkpoint (salinan aman sebelum merombak)
   Pakai:  node tools/checkpoint.js v5 "sebelum rombak koleksi"
           node tools/checkpoint.js v5 "catatan" --versi 5.02.01   (nomor manual)
   Penomoran: <mayor>.<minor>.<patch>  →  checkpoint pertama v5 = 5.01.01,
   berikutnya 5.01.02, 5.01.03, … Versi mayor baru (v6) hanya bila sudah
   benar-benar berbeda.
   Hasil:  checkpoints/5.01.01/ + entri baru di shared/versions.js
           → langsung muncul di Developer Settings › Versi
   Versi lama tidak pernah dihapus atau ditimpa.
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const vi = args.indexOf('--versi');
let manual = null;
if (vi >= 0) { manual = args[vi + 1]; args.splice(vi, 2); }
const [folder, ...noteParts] = args;
const note = noteParts.join(' ').trim() || 'Checkpoint';
if (!folder || !/^v\d+$/.test(folder)) {
  console.error('Pakai: node tools/checkpoint.js <v5|v6|…> "catatan" [--versi 5.01.01]');
  process.exit(1);
}
const major = +folder.slice(1);
const src = path.join(ROOT, folder);
if (!fs.existsSync(path.join(src, 'index.html'))) { console.error('Folder tidak ditemukan: ' + folder); process.exit(1); }

// daftar versi
const reg = path.join(ROOT, 'shared', 'versions.js');
const txt = fs.readFileSync(reg, 'utf8');
const m = txt.match(/\/\*VERSIONS\*\/([\s\S]*?)\/\*END\*\//);
if (!m) { console.error('Penanda daftar versi tidak ditemukan di shared/versions.js'); process.exit(1); }
const list = JSON.parse(m[1]);

// nomor versi berikutnya
const re = new RegExp('^' + major + '\\.(\\d{2})\\.(\\d{2})$');
const pad = (n) => String(n).padStart(2, '0');
let ver = manual;
if (ver) {
  if (!re.test(ver)) { console.error('Format nomor harus ' + major + '.MM.PP, contoh ' + major + '.01.01'); process.exit(1); }
} else {
  const nums = list.map((v) => v.id.match(re)).filter(Boolean).map((x) => [+x[1], +x[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const last = nums[nums.length - 1];
  ver = last ? major + '.' + pad(last[0]) + '.' + pad(last[1] + 1) : major + '.01.01';
}
if (list.some((v) => v.id === ver)) { console.error('Versi ' + ver + ' sudah ada'); process.exit(1); }
const dest = path.join(ROOT, 'checkpoints', ver);
if (fs.existsSync(dest)) { console.error('Folder sudah ada: checkpoints/' + ver); process.exit(1); }

// salin folder
(function copy(a, b) {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const s = path.join(a, e.name), d = path.join(b, e.name);
    if (e.isDirectory()) copy(s, d); else fs.copyFileSync(s, d);
  }
})(src, dest);

// checkpoint satu tingkat lebih dalam → perbaiki tautan ke folder bersama & aset
const idx = path.join(dest, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').split('../shared/').join('../../shared/'), 'utf8');
const app = path.join(dest, 'js', 'app.js');
if (fs.existsSync(app)) fs.writeFileSync(app, fs.readFileSync(app, 'utf8').split("return '../' + p;").join("return '../../' + p;"), 'utf8');

// tambahkan ke daftar versi (tepat di bawah versi induknya)
const now = new Date();
const entry = {
  id: ver,
  name: 'Versi ' + ver,
  title: note,
  path: 'checkpoints/' + ver + '/index.html',
  date: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()),
  type: 'checkpoint',
  note: 'Salinan ' + folder + ' pada saat ini: ' + note
};
const at = list.findIndex((v) => v.id === folder);
list.splice(at >= 0 ? at + 1 : 0, 0, entry);
fs.writeFileSync(reg, txt.replace(m[0], '/*VERSIONS*/' + JSON.stringify(list, null, 2) + '/*END*/'), 'utf8');

console.log('Checkpoint dibuat: Versi ' + ver + '  →  checkpoints/' + ver + '/');
console.log('Terdaftar di Developer Settings › Versi');
