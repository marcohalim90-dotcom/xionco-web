/* ==========================================================================
   Samakan ukuran model 3D katalog dengan ukuran resmi xionco.shop (X10)
   Pakai:  node tools/glb/fit.js            → semua entri data/source/fit3d.json
           node tools/glb/fit.js <path.glb> → satu entri
           node tools/glb/fit.js --dry      → hanya tampilkan faktor
   data/source/fit3d.json: { "<path glb>": { "to": [W, D, H] cm, "from": "<path glb sumber>" (opsional, mis. varian
   ukuran POEL dibuat dari model dasar), "why": "catatan" } }
   - Ukuran sekarang diukur seperti panggung (tools/spec/measure.js: satuan + modelRot) → faktor per sumbu.
     Diskalakan dari ukuran SEKARANG ke target, jadi aman dijalankan berulang (kedua kali faktornya 1).
   - Skala ditaruh di node akar (translasi ikut diskalakan); node, extras (xc_motion, xc_wood, xionco_tile —
     pitch ikut diskalakan) & material tidak berubah. Kompresi Draco dipertahankan.
   ========================================================================== */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const req = (m) => require(path.join(ROOT, 'tools/compress/node_modules', m));
const { NodeIO } = req('@gltf-transform/core');
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions');
const draco3d = req('draco3dgltf');
const { bbox } = require('../spec/measure.js');

const UNITS = [1, .01, .0254, .001];
const sizeFor = (p) => {   // sama dengan tools/spec/measure.js / v5/js/world.js
  const t = (p.type || '').toLowerCase();
  if (p.cat === 'seats') return /chair/.test(t) && !/arm/.test(t) ? .55 : /sectional/.test(t) ? 2.9 : /armchair/.test(t) ? 1.1 : 2.1;
  if (p.cat === 'tables') return /dining/.test(t) ? 1.6 : /desk|workstation/.test(t) ? 1.4 : /side/.test(t) ? .5 : /nesting/.test(t) ? .9 : 1.05;
  if (p.cat === 'bedframe') return 2.0;
  if (p.cat === 'cabinet') return /wardrobe/.test(t) ? 1.5 : /nightstand/.test(t) ? .5 : /kitchenette/.test(t) ? 1.8 : .9;
  if (p.cat === 'decor') return /panel/.test(t) ? 1.3 : /towel/.test(t) ? .55 : .45;
  return /track/.test(t) ? .7 : .3;
};

(async () => {
  const dry = process.argv.includes('--dry'), one = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/source/fit3d.json'), 'utf8')).models;
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8')).items;
  const prodOf = (rel) => items.find((p) => p.model === rel || Object.values(p.vmodels || {}).includes(rel));
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule()
  });
  for (const [rel, e] of Object.entries(MAP)) {
    if (one && path.resolve(one) !== path.join(ROOT, rel)) continue;
    const srcRel = e.from || rel, p = prodOf(rel) || prodOf(srcRel);
    if (!p) { console.log('LEWATI', rel, '(produk tidak ditemukan)'); continue; }
    const s = bbox(path.join(ROOT, srcRel)), r = ((+p.modelRot || 0) % 180 + 180) % 180, swap = Math.abs(r - 90) < 1;
    if (r && !swap) { console.log('LEWATI', rel, '(modelRot ' + p.modelRot + ' bukan kelipatan 90)'); continue; }
    const wide = Math.max(s.x, s.z) || 1; let u = 1, best = Infinity;
    UNITS.forEach((k) => { const er = Math.abs(Math.log(wide * k / sizeFor(p))); if (er < best) { best = er; u = k; } });
    const cur0 = { x: s.x * u * 100, y: s.y * u * 100, z: s.z * u * 100 }, [W, D, H] = e.to.map((v, i) => v == null ? [swap ? cur0.z : cur0.x, swap ? cur0.x : cur0.z, cur0.y][i] : v), cur = { x: s.x * u * 100, y: s.y * u * 100, z: s.z * u * 100 };
    const f = [(swap ? D : W) / cur.x, H / cur.y, (swap ? W : D) / cur.z];
    const fmt = (v) => Math.round(v * 10) / 10;
    console.log((dry ? 'UJI   ' : 'SKALA ') + rel.padEnd(62) + ' ' + [cur.x, cur.z, cur.y].map(fmt).join(' × ') + ' → ' + e.to.join(' × ') + '  faktor ' + f.map((v) => v.toFixed(3)).join(' / '));
    if (dry || f.every((v) => Math.abs(v - 1) < .002)) continue;
    const doc = await io.read(path.join(ROOT, srcRel)), sc = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    sc.listChildren().forEach((n) => {   // akar: T·R·S → F·T·R·S; R harus sumbu-ke-sumbu (permutasi) agar tetap TRS
      const q = n.getRotation(), t = n.getTranslation(), sc0 = n.getScale();
      const R = [[1 - 2 * (q[1] * q[1] + q[2] * q[2]), 2 * (q[0] * q[1] - q[2] * q[3]), 2 * (q[0] * q[2] + q[1] * q[3])],
        [2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[0] * q[0] + q[2] * q[2]), 2 * (q[1] * q[2] - q[0] * q[3])],
        [2 * (q[0] * q[2] - q[1] * q[3]), 2 * (q[1] * q[2] + q[0] * q[3]), 1 - 2 * (q[0] * q[0] + q[1] * q[1])]];
      // faktor di ruang lokal node: F' = Rᵀ F R (diagonal bila R permutasi sumbu)
      const L = [0, 1, 2].map((i) => [0, 1, 2].reduce((a, k) => a + R[k][i] * R[k][i] * f[k], 0));
      const off = [0, 1, 2].some((i) => [0, 1, 2].some((j) => i !== j && Math.abs([0, 1, 2].reduce((a, k) => a + R[k][i] * R[k][j] * f[k], 0)) > 1e-4));
      if (off) throw new Error(rel + ': node akar "' + n.getName() + '" berputar miring — tidak bisa diskalakan per sumbu');
      n.setTranslation([t[0] * f[0], t[1] * f[1], t[2] * f[2]]).setScale([sc0[0] * L[0], sc0[1] * L[1], sc0[2] * L[2]]);
      const nx = n.getExtras() || {}, mo = nx.xc_motion;   // geseran bagian bergerak (ruang induk = adegan) ikut diskalakan
      if (mo && mo.move) n.setExtras(Object.assign({}, nx, { xc_motion: Object.assign({}, mo, { move: mo.move.map((v, i) => v * f[i]) }) }));
    });
    const ex = sc.getExtras() || {};
    if (ex.xionco_tile && ex.xionco_tile.pitch) { const T0 = ex.xionco_tile; ex.xionco_tile = Object.assign({}, T0, { pitch: T0.pitch * f[0] }, T0.cutL != null ? { cutL: T0.cutL * f[0], cutR: T0.cutR * f[0] } : {}); sc.setExtras(ex); }
    const out = path.join(ROOT, rel); fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out + '.tmp', await io.writeBinary(doc)); fs.renameSync(out + '.tmp', out);
    const b = bbox(out); console.log('      hasil ' + [b.x, b.z, b.y].map((v) => fmt(v * u * 100)).join(' × '));
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
