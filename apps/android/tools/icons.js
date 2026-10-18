/* Ikon aplikasi Android + PWA dari logo XIONCO (wordmark emas di latar gelap).
   Pakai: node apps/android/tools/icons.js   (butuh sharp di tools/compress — cd tools/compress && npm install)
   Hasil: apps/android/app/src/main/res/mipmap-(dpi) (ikon biasa + adaptif) dan v5/icons/ (manifest PWA). */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const sharp = require(path.join(ROOT, 'tools/compress/node_modules/sharp'));
const src = fs.readFileSync(path.join(ROOT, 'v5/js/data.js'), 'utf8');
const LOGO = /XV\.LOGO = '([^']+)'/.exec(src)[1];
const BG = '#0f0c0a', GOLD = '#bfa274';
// wordmark 206 × 28 → selebar w di tengah kanvas s (pad untuk zona aman ikon adaptif)
const svg = (s, w, bg) => {
  const k = w / 206, x = (s - 206 * k) / 2, y = (s - 28 * k) / 2;
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' + (bg ? '<rect width="100%" height="100%" fill="' + BG + '"/>' : '') +
    '<path d="' + LOGO + '" fill="' + GOLD + '" transform="translate(' + x + ' ' + y + ') scale(' + k + ')"/></svg>');
};
const RES = path.join(ROOT, 'apps/android/app/src/main/res');
const D = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
(async () => {
  for (const [d, s] of Object.entries(D)) {
    const dir = path.join(RES, 'mipmap-' + d); fs.mkdirSync(dir, { recursive: true });
    await sharp(svg(s * 4, s * 4 * .72, true)).resize(s, s).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(svg(s * 4, s * 4 * .72, true)).resize(s, s).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    const f = Math.round(s * 108 / 48);   // ikon adaptif: kanvas 108dp, logo di zona aman 66dp
    await sharp(svg(f * 4, f * 4 * .5, false)).resize(f, f).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  const pwa = path.join(ROOT, 'v5/icons'); fs.mkdirSync(pwa, { recursive: true });
  for (const s of [192, 512]) {
    await sharp(svg(s * 2, s * 2 * .72, true)).resize(s, s).png().toFile(path.join(pwa, 'icon-' + s + '.png'));
    await sharp(svg(s * 2, s * 2 * .56, true)).resize(s, s).png().toFile(path.join(pwa, 'maskable-' + s + '.png'));
  }
  await sharp(svg(1024, 1024 * .72, true)).resize(512, 512).png().toFile(path.join(ROOT, 'apps/android/store/icon-512.png'));
  console.log('ikon selesai');
})();
