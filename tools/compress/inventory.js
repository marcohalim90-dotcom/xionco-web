/* Inventaris material semua model katalog: jenis (SKP/AI), material, peran, label kayu, warna rata-rata.
   Pakai: node tools/compress/inventory.js > inventaris.txt */
const { NodeIO } = require('@gltf-transform/core'), { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const draco3d = require('draco3dgltf'), sharp = require('sharp'), path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8')).items.filter((p) => p.model && p.status !== 'arsip' && p.status !== 'nonaktif');
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
  const seen = {};
  for (const p of P) {
    const files = [p.model].concat(Object.values(p.vmodels || {}));
    for (const f of files) {
      if (seen[f]) continue; seen[f] = 1;
      let d; try { d = await io.read(path.join(ROOT, f)); } catch (e) { console.log(p.id, f, 'GAGAL', e.message); continue; }
      const out = [];
      for (const m of d.getRoot().listMaterials()) {
        const ex = m.getExtras() || {}, t = m.getBaseColorTexture();
        let c = m.getBaseColorFactor().slice(0, 3).map((v) => Math.pow(v, 1 / 2.2) * 255);
        if (t) { try { const s = await sharp(Buffer.from(t.getImage())).resize(32, 32).removeAlpha().raw().toBuffer(); const a = [0, 0, 0]; for (let i = 0; i < s.length; i += 3) { a[0] += s[i]; a[1] += s[i + 1]; a[2] += s[i + 2]; } c = a.map((v, i) => v / (s.length / 3) * c[i] / 255); } catch (e) {} }
        out.push((m.getName() || '?').slice(0, 26) + '[' + (ex.role || '-') + (ex.xc_wood ? ':' + ex.xc_wood : '') + (t ? ',tex' : '') + (m.getMetallicFactor() > .5 ? ',metal' : '') + ' ' + hex(c) + ']');
      }
      console.log((/model-ai/.test(f) ? 'AI ' : 'SKP') + ' ' + p.id.padEnd(46) + (f === p.model ? '' : '(' + path.basename(f) + ') ') + out.join(' '));
    }
  }
})();
