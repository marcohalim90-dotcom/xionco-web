/* Kompres model 3D situs (Q4): geometri Draco + tekstur WebP (maks 1024 px).
   Pakai:  node tools/compress/compress.js            → semua GLB situs (assets/items, library/polyhaven, library/mannequin) yang belum dikompres
           node tools/compress/compress.js --manifest → hanya tulis ulang assets/manifest.json (daftar file Paket HD)
           node tools/compress/compress.js <file.glb>  → satu file
   - File asli disalin dulu ke data/source/glb-orig/<path> (hanya lokal, tidak ikut online).
   - Nama node, extras (mis. xionco_tile) & material tetap — tidak ada join/flatten, jadi kode panggung tetap cocok.
   - File yang sudah memakai KHR_draco_mesh_compression dilewati (aman dijalankan berulang).
   Siapkan sekali:  cd tools/compress && npm install */
const fs = require('fs'), path = require('path');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS, EXTTextureWebP } = require('@gltf-transform/extensions');
const { dedup, prune, draco } = require('@gltf-transform/functions');
const draco3d = require('draco3dgltf'), sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['assets/items', 'assets/library/polyhaven', 'assets/library/mannequin'].map((d) => path.join(ROOT, d)), ORIG = path.join(ROOT, 'data/source/glb-orig');
const MAX = 1024;

function list(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? list(p) : /\.glb$/i.test(e.name) ? [p] : [];
  });
}
/* tekstur → WebP, sisi terpanjang maks MAX px (warna sRGB; alpha dipertahankan) */
async function webpTextures(doc) {
  const tex = doc.getRoot().listTextures(); if (!tex.length) return;
  for (const t of tex) {
    const img = t.getImage(); if (!img || t.getMimeType() === 'image/webp') continue;
    let p = sharp(Buffer.from(img)); const m = await p.metadata();
    if (Math.max(m.width, m.height) > MAX) p = p.resize(MAX, MAX, { fit: 'inside' });
    const out = await p.webp({ quality: 86 }).toBuffer();
    t.setImage(new Uint8Array(out)).setMimeType('image/webp'); if (t.getURI()) t.setURI(t.getURI().replace(/.(png|jpe?g)$/i, '.webp'));
  }
  doc.createExtension(EXTTextureWebP).setRequired(true);
}
/* assets/manifest.json — isi Paket HD (Pengaturan › Unduh paket HD): model 3D, tekstur & ikon kartu.
   HDRI tidak ikut (besar, hanya mode Realistis); model mentah AI (raw-*) juga tidak. */
function manifest() {
  const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
  const files = ['assets/items', 'assets/library', 'assets/cz-icons'].flatMap((d) => walk(path.join(ROOT, d)))
    .map((p) => path.relative(ROOT, p).split(path.sep).join('/'))
    .filter((p) => /\.(glb|gltf|bin|webp|jpe?g|png)$/i.test(p) && !/\/hdri\/|\/raw-/i.test(p))
    .map((p) => ({ p: p, b: fs.statSync(path.join(ROOT, p)).size }));
  const out = { updated: new Date().toISOString(), bytes: files.reduce((a, x) => a + x.b, 0), files: files };
  fs.writeFileSync(path.join(ROOT, 'assets/manifest.json'), JSON.stringify(out));
  console.log('manifest: ' + files.length + ' file, ' + mb(out.bytes));
}
const mb = (n) => (n / 1048576).toFixed(2) + ' MB';

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule()
  });
  if (process.argv[2] === '--manifest') { manifest(); return; }
  const files = process.argv[2] ? [path.resolve(process.argv[2])] : DIRS.flatMap(list);
  let before = 0, after = 0, done = 0, skip = 0;
  for (const f of files) {
    const size0 = fs.statSync(f).size;
    let doc;
    try { doc = await io.read(f); } catch (e) { console.log('GAGAL baca', path.relative(ROOT, f), e.message); continue; }
    if (doc.getRoot().listExtensionsUsed().some((x) => x.extensionName === 'KHR_draco_mesh_compression')) { skip++; continue; }
    const rel = path.relative(ROOT, f), bak = path.join(ORIG, path.relative(path.join(ROOT, 'assets'), f));
    if (!fs.existsSync(bak)) { fs.mkdirSync(path.dirname(bak), { recursive: true }); fs.copyFileSync(f, bak); }
    await webpTextures(doc);   // tekstur dulu (sebelum encoder Draco dimuat ke memori)
    await doc.transform(
      dedup(), prune({ keepLeaves: true, keepAttributes: true, keepExtras: true }),
      draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8, quantizeGeneric: 12 })
    );
    const tmp = f + '.tmp';
    fs.writeFileSync(tmp, await io.writeBinary(doc));   // selalu GLB biner (io.write memilih format dari ekstensi)
    const size1 = fs.statSync(tmp).size;
    if (size1 >= size0) { fs.unlinkSync(tmp); console.log('tetap  ', rel, mb(size0), '(hasil tidak lebih kecil)'); before += size0; after += size0; continue; }
    fs.renameSync(tmp, f);
    before += size0; after += size1; done++;
    console.log('kompres', rel.padEnd(70), mb(size0).padStart(9), '→', mb(size1).padStart(9));
  }
  console.log('\n' + done + ' file dikompres, ' + skip + ' sudah terkompres. Total ' + mb(before) + ' → ' + mb(after));
  if (!process.argv[2]) manifest();
})();
