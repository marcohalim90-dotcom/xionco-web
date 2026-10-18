/* ==========================================================================
   Ambil data produk terbaru langsung dari xionco.shop (halaman mobile, data produk ada di payload Next.js)
   Pakai:  node tools/fetch-shop.js            → semua produk di data/source/xionco-shop.json
           node tools/fetch-shop.js 17 49      → hanya id tertentu
   Hasil:  data/source/xionco-shop-live.json  { fetched, rows: { <id>: initialProduct } }
   Dipakai tools/import-shop.js untuk menyamakan gambar utama (main_img_display / category_img_display),
   urutan foto, varian & kategori dengan toko. Alamat produk = /products/<slug nama produk>.
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data/source/xionco-shop.json');
const OUT = path.join(ROOT, 'data/source/xionco-shop-live.json');
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';   // toko hanya untuk mobile
// slug toko: karakter selain huruf/angka/spasi dibuang (bukan diganti), lalu spasi → '-' (mis. 'Seater(AC)' → 'seaterac', '3+2' → '32')
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-');

// objek JSON mulai dari indeks '{' (abaikan isi string)
function objAt(s, i) {
  let d = 0, q = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') j++; else if (c === '"') q = false; continue; }
    if (c === '"') q = true; else if (c === '{') d++; else if (c === '}' && --d === 0) return s.slice(i, j + 1);
  }
  return null;
}
function parse(html) {
  const all = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)].map((m) => JSON.parse('"' + m[1] + '"')).join('');
  const k = all.indexOf('"initialProduct":');
  if (k < 0) return null;
  const p = JSON.parse(objAt(all, all.indexOf('{', k)));
  // teks panjang (deskripsi) disimpan terpisah sebagai referensi "$28" → baris "28:T…,<html>"
  if (typeof p.diskripsi === 'string' && /^\$\w+$/.test(p.diskripsi)) {
    const ref = p.diskripsi.slice(1), m = new RegExp('(?:^|\\n)' + ref + ':T[0-9a-f]+,').exec(all);
    if (m) { const st = m.index + m[0].length, nx = all.slice(st).search(/\n?[0-9a-f]+:(?:\[|T|I|\{|")/); p.diskripsi = all.slice(st, nx < 0 ? undefined : st + nx); }
  }
  return p;
}

async function one(row, tries) {
  const url = 'https://xionco.shop/products/' + slug(row.namaproduk);
  for (let t = 0; t < (tries || 3); t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'id-ID' } });
      if (r.status === 404) return { err: '404', url };
      const p = parse(await r.text());
      if (p && p.id) return { p, url };
    } catch (e) { /* coba lagi */ }
    await new Promise((res) => setTimeout(res, 800 * (t + 1)));
  }
  return { err: 'gagal', url };
}

(async () => {
  const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const only = process.argv.slice(2).map(Number);
  let prev = { rows: {} };
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  const rows = src.rows.filter((r) => !only.length || only.indexOf(r.id) >= 0);
  let ok = 0, bad = [];
  for (let i = 0; i < rows.length; i += 4) {   // 4 sekaligus, sopan ke server toko
    const res = await Promise.all(rows.slice(i, i + 4).map((r) => one(r)));
    res.forEach((x, k) => {
      const r = rows[i + k];
      if (x.p) { prev.rows[r.id] = Object.assign(x.p, { _url: x.url }); ok++; } else bad.push(r.id + ' ' + r.namaproduk + ' (' + x.err + ')');
    });
    process.stdout.write('.');
  }
  prev.fetched = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(prev, null, 1));
  console.log('\n' + ok + ' produk diambil' + (bad.length ? ', gagal: \n  ' + bad.join('\n  ') : ''));
})();
