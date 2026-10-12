/* ==========================================================================
   Maison XIONCO (v5) — Build 1 file HTML untuk presentasi / dibagikan
   Pakai:  node tools/build-preview-v5.js
   Hasil:  dist/XIONCO-v5-Maison.html
   - v5.css, data.js, cutout.js, world.js, app.js digabung ke dalam satu file
   - Three.js, GSAP, font, dan foto produk tetap dimuat dari internet (butuh koneksi)
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const V = path.join(ROOT, 'v5');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'XIONCO-v5-Maison.html');
const read = (p) => fs.readFileSync(path.join(V, p), 'utf8');
const safeJs = (s) => s.replace(/<\/script/gi, '<\\/script');

let html = read('index.html');

const cssTag = /<link rel="stylesheet" href="css\/v5\.css">/;
if (!cssTag.test(html)) throw new Error('Tag CSS tidak ditemukan: css/v5.css');
html = html.replace(cssTag, () => '<style>\n' + read('css/v5.css') + '\n</style>');

for (const src of ['js/data.js', 'js/cutout.js', 'js/world.js', 'js/app.js']) {
  const tag = new RegExp('<script src="' + src.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '"></script>\\n?');
  if (!tag.test(html)) throw new Error('Script tag tidak ditemukan: ' + src);
  html = html.replace(tag, () => '<script>\n' + safeJs(read(src)) + '\n</script>\n');
}

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
html = html.replace('<head>', '<head>\n  <!-- Maison XIONCO v5 — build ' + stamp + ' (tools/build-preview-v5.js) -->');

// Developer Settings & database lokal tidak ikut ke file presentasi
html = html.replace(/<script src="(\.\.\/)?shared\/[^"]+"><\/script>\n?/g, '');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('OK → ' + path.relative(ROOT, OUT) + '  (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
