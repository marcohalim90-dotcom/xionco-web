/* ==========================================================================
   XIONCO — Build preview 1 file HTML (untuk presentasi / dikirim ke executive)
   Pakai:  node tools/build-preview.js
   Hasil:  dist/XIONCO-Homepage-Preview.html
   - CSS & JS digabung ke dalam satu file (bisa dibuka dengan double-click)
   - Mode DEV dimatikan (tanpa tombol Grid/Intro/Ledger, tanpa shortcut G/L/R)
   - Pengecekan file aset dimatikan (tidak ada request ke assets/media)
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const V1 = path.join(ROOT, 'v1');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'XIONCO-Homepage-Preview.html');
const read = (p) => fs.readFileSync(path.join(V1, p), 'utf8');
const safeJs = (s) => s.replace(/<\/script/gi, '<\\/script');

let html = read('index.html');

// CSS
html = html.replace(
  /<link rel="stylesheet" href="assets\/css\/xionco\.css">/,
  () => '<style>\n' + read('assets/css/xionco.css') + '\n</style>'
);

// JS
const scripts = {
  'assets/js/config.js': (s) => s + '\n// --- preview build ---\nwindow.XIONCO_CONFIG.dev = false;\nwindow.XIONCO_CONFIG.probeAssets = false;\n',
  'assets/js/manifest.js': null,          // tidak dibutuhkan di preview
  'assets/js/scenes.js': (s) => s,
  'assets/js/xionco.js': (s) => s
};
for (const [src, transform] of Object.entries(scripts)) {
  const tag = new RegExp('<script src="' + src.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '"></script>\\n?');
  if (!tag.test(html)) throw new Error('Script tag tidak ditemukan: ' + src);
  html = html.replace(tag, () => transform ? '<script>\n' + safeJs(transform(read(src))) + '\n</script>\n' : '');
}

// hapus dock & HUD developer dari preview
html = html.replace(/\s*<div class="hud"[^>]*><\/div>/, '');
html = html.replace(/\s*<div class="devdock"[\s\S]*?<\/div>\n/, '\n');

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
html = html.replace('<head>', '<head>\n  <!-- XIONCO Homepage — preview build ' + stamp + ' (dibuat oleh tools/build-preview.js) -->');

// Developer Settings & database lokal tidak ikut ke file presentasi
html = html.replace(/<script src="(\.\.\/)?shared\/[^"]+"><\/script>\n?/g, '');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('OK → ' + path.relative(ROOT, OUT) + '  (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
