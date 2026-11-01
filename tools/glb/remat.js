/* Pindahkan segitiga ke material lain berdasarkan ketinggian & arah muka (27 Okt, SYME: "seharusnya tidak ada atasan
   sungkai" — papan atas lemari kayu terang → warna panel pintu, sesuai foto toko; sisi kayu tetap utuh sampai atas).
   Pakai:  node tools/glb/remat.js <in.glb> [out.glb] --from=<material> --to=<material> --ymin=<m> [--ymax=<m>] [--keep-x]
   - segitiga dipindah bila SEMUA titiknya di rentang ymin…ymax (dunia)
   - --keep-x: muka yang menghadap samping (±x) tidak dipindah (ujung papan tetap sewarna sisi)
   Material tujuan harus sudah ada di file. Asli disalin ke data/source/glb-orig/<path>.pre-remat.glb (file di assets/). */
'use strict';
const fs = require('fs'), path = require('path');
const NM = path.resolve(__dirname, '../compress/node_modules');
const { NodeIO } = require(NM + '/@gltf-transform/core');
const { ALL_EXTENSIONS } = require(NM + '/@gltf-transform/extensions');
const { draco, unweld, weld, prune } = require(NM + '/@gltf-transform/functions');
const draco3d = require(NM + '/draco3dgltf');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2), opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const files = args.filter((a) => !a.startsWith('--')), src = path.resolve(files[0]), dst = path.resolve(files[1] || files[0]);
const FROM = opt('from'), TO = opt('to'), YMIN = +opt('ymin'), YMAX = opt('ymax') != null ? +opt('ymax') : 1e9, KEEPX = args.includes('--keep-x');

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule()
  });
  const doc = await io.read(src);
  const to = doc.getRoot().listMaterials().find((m) => m.getName() === TO);
  if (!to) throw new Error('material tujuan "' + TO + '" tidak ada');
  await doc.transform(unweld());
  let moved = 0, kept = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      if (!p.getMaterial() || p.getMaterial().getName() !== FROM) continue;
      const sem = p.listSemantics(), at = sem.map((s) => p.getAttribute(s)), P = p.getAttribute('POSITION'), N = P.getCount();
      const A = sem.map(() => []), B = sem.map(() => []);
      for (let t = 0; t < N; t += 3) {
        const v = [t, t + 1, t + 2].map((i) => { const q = P.getElement(i, []); return [0, 1, 2].map((j) => M[j] * q[0] + M[4 + j] * q[1] + M[8 + j] * q[2] + M[12 + j]); });
        const inY = v.every((w) => w[1] >= YMIN && w[1] <= YMAX);
        const e1 = v[1].map((x, j) => x - v[0][j]), e2 = v[2].map((x, j) => x - v[0][j]);
        const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], L = Math.hypot(...cr) || 1;
        const side = Math.abs(cr[0] / L) > .9;
        const dstA = inY && !(KEEPX && side) ? B : A;
        if (dstA === B) moved++; else kept++;
        [t, t + 1, t + 2].forEach((i) => at.forEach((a, k) => dstA[k].push(...a.getElement(i, []))));
      }
      if (!B[0].length) continue;
      const q = doc.createPrimitive().setMaterial(to).setMode(p.getMode());
      sem.forEach((s, k) => {
        const a = at[k];
        q.setAttribute(s, doc.createAccessor().setType(a.getType()).setArray(new Float32Array(B[k])).setBuffer(a.getBuffer()));
        a.setArray(new Float32Array(A[k]));
      });
      mesh.addPrimitive(q);
    }
  }
  console.log('dipindah ke "' + TO + '":', moved, 'segitiga · tetap "' + FROM + '":', kept);
  const relA = path.relative(path.join(ROOT, 'assets'), src), bak = path.join(ROOT, 'data/source/glb-orig', relA + '.pre-remat.glb');
  if (!relA.startsWith('..') && !path.isAbsolute(relA) && !fs.existsSync(bak)) { fs.mkdirSync(path.dirname(bak), { recursive: true }); fs.copyFileSync(src, bak); }
  await doc.transform(weld(), prune({ keepLeaves: true, keepAttributes: true, keepExtras: true }), draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8, quantizeGeneric: 12 }));
  fs.writeFileSync(dst, await io.writeBinary(doc));
  console.log('OK', path.relative(ROOT, dst), (fs.statSync(dst).size / 1048576).toFixed(2) + ' MB');
})();
