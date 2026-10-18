/* Gambar kategori xionco.shop (filter Koleksi) → assets/kats/<slug>.webp 240 px (asli PNG s/d 1,2 MB per gambar)
   Pakai: node tools/kat-img.js */
const fs = require('fs'), path = require('path');
const sharp = require(path.join(__dirname, 'compress/node_modules/sharp'));
const OUT = path.join(__dirname, '../assets/kats');
const KATS = ['sofa', 'bed', 'sofa-bed', 'desk', 'cabinet', 'table', 'chair', 'ottoman', 'hardware', 'lightings', 'lifestyle', 'smart', 'accent'];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const k of KATS) {
    const r = await fetch('https://hig3141592653.my.id/assets/katagoriproduk/' + k + '.png?v=2026-01-09');
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).resize(240, 240, { fit: 'cover' }).webp({ quality: 80 }).toFile(path.join(OUT, k + '.webp'));
    console.log(k, Math.round(buf.length / 1024) + ' KB →', Math.round(fs.statSync(path.join(OUT, k + '.webp')).size / 1024) + ' KB');
  }
})();
