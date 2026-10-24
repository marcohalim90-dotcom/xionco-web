/* Koreksi kayu per model (Z4 "kayu pucat"): material berlabel kelas kayu (extras xc_wood) diberi penyesuaian lokal
   xc_wood_adj = { k, hex, ctr, rough, scale } yang digabung world.js woodMat di atas pengaturan kelas (Developer Settings › Kayu koleksi).
   k = pengali kecerahan (0.82 = 18 % lebih gelap); hex/ctr/rough/scale = menimpa nilai kelas hanya untuk model ini.
   node tools/glb/wood-adj.js <id|file.glb> [--k=.82] [--hex=#b89a74] [--ctr=1] [--rough=.5] [--scale=1] [--mat=<regex>] [--clear] [--show]
   Draco & WebP tetap (ditulis ulang lewat gltf-transform). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const NM = path.join(ROOT, 'tools/compress/node_modules');
const { NodeIO } = require(path.join(NM, '@gltf-transform/core'));
const { ALL_EXTENSIONS } = require(path.join(NM, '@gltf-transform/extensions'));
const { draco } = require(path.join(NM, '@gltf-transform/functions'));
const draco3d = require(path.join(NM, 'draco3dgltf'));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = (k) => process.argv.includes('--' + k);
const target = process.argv[2];
if (!target) { console.log('pakai: node tools/glb/wood-adj.js <id|file.glb> --k=.82 [--hex=] [--ctr=] [--rough=] [--scale=] [--mat=regex] [--clear] [--show]'); process.exit(1); }
const P = require(path.join(ROOT, 'data/products.json')).items;
const file = /\.glb$/i.test(target) ? path.resolve(target) : path.join(ROOT, (P.find((p) => p.id === target) || {}).model || '');
if (!fs.existsSync(file)) { console.error('model tidak ditemukan: ' + target); process.exit(1); }
const MAT = arg('mat', '') ? new RegExp(arg('mat'), 'i') : null;
const adj = {};
['k', 'ctr', 'rough', 'scale'].forEach((k) => { if (arg(k, '') !== '') adj[k] = +arg(k); });
if (arg('hex', '')) adj.hex = arg('hex');

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
  const doc = await io.read(file);
  let n = 0;
  for (const m of doc.getRoot().listMaterials()) {
    const ex = m.getExtras() || {};
    if (!ex.xc_wood || (MAT && !MAT.test(m.getName()))) continue;
    if (has('show') || (!has('clear') && !Object.keys(adj).length)) { console.log('  ' + m.getName().padEnd(30), 'xc_wood=' + ex.xc_wood, 'adj=' + JSON.stringify(ex.xc_wood_adj || null)); continue; }
    const nx = Object.assign({}, ex);
    if (has('clear')) delete nx.xc_wood_adj; else nx.xc_wood_adj = Object.assign({}, ex.xc_wood_adj || {}, adj);
    m.setExtras(nx); n++;
    console.log('  ' + m.getName().padEnd(30), 'xc_wood=' + ex.xc_wood, '→ adj=' + JSON.stringify(nx.xc_wood_adj || null));
  }
  if (!n) return;
  await doc.transform(draco({ method: 'edgebreaker' }));
  await io.write(file, doc);
  console.log('ditulis ' + path.relative(ROOT, file) + ' (' + (fs.statSync(file).size / 1024).toFixed(0) + ' KB)');
})().catch((e) => { console.error(e); process.exit(1); });
