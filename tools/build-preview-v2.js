/* ==========================================================================
   XIONCO v2 — Build preview 1 file HTML (untuk presentasi / dikirim ke executive)
   Pakai:  node tools/build-preview-v2.js
   Hasil:  dist/XIONCO-v2-Preview.html
   - v2.css, data.js, app.js digabung ke dalam satu file (bisa dibuka dengan double-click)
   - GSAP / Lenis, font, dan foto produk tetap dimuat dari internet (butuh koneksi)
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const V2 = path.join(ROOT, 'v2');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'XIONCO-v2-Preview.html');
const read = (p) => fs.readFileSync(path.join(V2, p), 'utf8');
const safeJs = (s) => s.replace(/<\/script/gi, '<\\/script');

let html = read('index.html');

// CSS
const cssTag = /<link rel="stylesheet" href="css\/v2\.css">/;
if (!cssTag.test(html)) throw new Error('Tag CSS tidak ditemukan: css/v2.css');
html = html.replace(cssTag, () => '<style>\n' + read('css/v2.css') + '\n</style>');

// JS
for (const src of ['js/data.js', 'js/app.js']) {
  const tag = new RegExp('<script src="' + src.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '"></script>\\n?');
  if (!tag.test(html)) throw new Error('Script tag tidak ditemukan: ' + src);
  html = html.replace(tag, () => '<script>\n' + safeJs(read(src)) + '\n</script>\n');
}

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
html = html.replace('<head>', '<head>\n  <!-- XIONCO v2 — preview build ' + stamp + ' (dibuat oleh tools/build-preview-v2.js) -->');

// Developer Settings & database lokal tidak ikut ke file presentasi
html = html.replace(/<script src="(\.\.\/)?shared\/[^"]+"><\/script>\n?/g, '');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('OK → ' + path.relative(ROOT, OUT) + '  (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
