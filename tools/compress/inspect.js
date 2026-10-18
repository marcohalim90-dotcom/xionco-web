/* daftar material di GLB: nama, warna dasar, tekstur, metal/rough — node tools/compress/inspect.js <id...> */
const { NodeIO } = require('@gltf-transform/core'), { ALL_EXTENSIONS } = require('@gltf-transform/extensions'), draco3d = require('draco3dgltf'), path = require('path');
const P = require('../../data/products.json').items;
(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
  for (const id of process.argv.slice(2)) {
    const p = P.find((x) => x.id === id); if (!p || !p.model) { console.log(id, '— tanpa model'); continue; }
    const doc = await io.read(path.join(__dirname, '../..', p.model));
    console.log('\n' + id + '  ' + p.model + '  varian: ' + (p.variants || []).map((v) => v.label + (v.hex ? v.hex : '')).join(', ') + (p.modelRot ? ' rot ' + p.modelRot : ''));
    doc.getRoot().listMaterials().forEach((m) => { const c = m.getBaseColorFactor().map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)); console.log('  ', (m.getName() || '?').padEnd(28), 'rgb(' + c.slice(0, 3).join(',') + ')', m.getBaseColorTexture() ? 'tex' : '', 'm' + m.getMetallicFactor().toFixed(2), 'r' + m.getRoughnessFactor().toFixed(2), m.getDoubleSided() ? '2s' : ''); });
  }
})();
