/* Potong mesh lurus di satu ketinggian (27 Okt, sprei SOMNO / POEL "garisnya berantakan, kesannya digunting-gunting").
   Sebab: tools/glb/bedding.py (drape 'mattress') menekan juntaian selimut di bawah bibir rangka menjadi pita ±1 cm
   (z = batas + (batas − z) × 0,05) → lipatan bertumpuk, tepi bawah bergerigi. Alat ini membuang pita itu dengan memotong
   tiap segitiga di bidang y = potong (bukan menghapus segitiga) → ujung selimut lurus & rapi. Material/tekstur tidak disentuh.
   Pakai:  node tools/glb/clip-y.js <in.glb> [out.glb] [--node=selimut] [--y=<m>]
   Tanpa --y: batas atas pita dicari otomatis (bin 1 mm dari titik terendah; pita = bin padat, berakhir saat jumlah titik
   turun di bawah 1/12 bin terpadat), dipotong 1,2 cm di atasnya (lipatan sisa tepat di atas pita juga mencuat).
   Asli disalin ke data/source/glb-orig/<path>.pre-clip.glb (hanya file di assets/, lokal). */
'use strict';
const fs = require('fs'), path = require('path');
const NM = path.resolve(__dirname, '../compress/node_modules');
const { NodeIO } = require(NM + '/@gltf-transform/core');
const { ALL_EXTENSIONS } = require(NM + '/@gltf-transform/extensions');
const { draco, unweld, weld } = require(NM + '/@gltf-transform/functions');
const draco3d = require(NM + '/draco3dgltf');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2), opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const files = args.filter((a) => !a.startsWith('--')), src = path.resolve(files[0]), dst = path.resolve(files[1] || files[0]);
const NODE = opt('node') || 'selimut';

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule()
  });
  const doc = await io.read(src);
  await doc.transform(unweld());
  const nodes = doc.getRoot().listNodes().filter((n) => n.getName() === NODE && n.getMesh());
  if (!nodes.length) throw new Error('node "' + NODE + '" tidak ada');
  const wy = (M, q) => M[1] * q[0] + M[5] * q[1] + M[9] * q[2] + M[13];
  // batas potong otomatis: ujung atas pita padat di bawah
  let cut = opt('y') != null ? +opt('y') : null;
  if (cut == null) {
    const ys = [];
    nodes.forEach((n) => { const M = n.getWorldMatrix(); n.getMesh().listPrimitives().forEach((p) => { const P = p.getAttribute('POSITION'); for (let i = 0; i < P.getCount(); i++) ys.push(wy(M, P.getElement(i, []))); }); });
    const mn = Math.min(...ys), H = [];
    ys.forEach((y) => { const b = Math.floor((y - mn) * 1000); H[b] = (H[b] || 0) + 1; });
    const peak = Math.max(...H.slice(0, 20).map((v) => v || 0));
    let b = 0; while (b < 40 && (H[b] || 0) >= peak / 12) b++;
    cut = mn + b / 1000 + .012;   // 1,2 cm di atas pita: sisa lipatan tepat di atas pita juga ikut terbuang (SOMNO diuji di panggung)
    console.log('pita', mn.toFixed(4), '…', (mn + b / 1000).toFixed(4), 'm (' + ys.filter((y) => y < cut).length + ' titik dari ' + ys.length + ')');
  }
  let kept = 0, cutT = 0, drop = 0;
  for (const n of nodes) {
    const M = n.getWorldMatrix();
    for (const p of n.getMesh().listPrimitives()) {
      const sem = p.listSemantics(), at = sem.map((s) => p.getAttribute(s)), P = p.getAttribute('POSITION'), N = P.getCount();
      const out = sem.map(() => []), put = (vals) => vals.forEach((v, k) => out[k].push(...v));
      const vert = (i) => at.map((a) => a.getElement(i, []));
      const lerpV = (A, B, t) => A.map((a, k) => a.map((x, j) => x + (B[k][j] - x) * t));
      for (let t = 0; t < N; t += 3) {
        const V = [vert(t), vert(t + 1), vert(t + 2)], d = [t, t + 1, t + 2].map((i) => wy(M, P.getElement(i, [])) - cut);
        const nin = d.filter((x) => x >= 0).length;
        if (nin === 3) { V.forEach(put); kept++; continue; }
        if (nin === 0) { drop++; continue; }
        // Sutherland–Hodgman terhadap bidang y = potong, lalu kipas segitiga
        const poly = [];
        for (let k = 0; k < 3; k++) {
          const a = k, b = (k + 1) % 3;
          if (d[a] >= 0) poly.push(V[a]);
          if ((d[a] >= 0) !== (d[b] >= 0)) poly.push(lerpV(V[a], V[b], d[a] / (d[a] - d[b])));
        }
        for (let k = 1; k + 1 < poly.length; k++) { put(poly[0]); put(poly[k]); put(poly[k + 1]); }
        cutT++;
      }
      sem.forEach((s, k) => {
        const a = at[k], arr = new Float32Array(out[k]);
        if (s === 'NORMAL') for (let i = 0; i < arr.length; i += 3) { const L = Math.hypot(arr[i], arr[i + 1], arr[i + 2]) || 1; arr[i] /= L; arr[i + 1] /= L; arr[i + 2] /= L; }
        a.setArray(arr);
      });
      if (p.getIndices()) p.setIndices(null);
    }
  }
  console.log('potong y =', cut.toFixed(4), 'm · utuh', kept, '· dibelah', cutT, '· dibuang', drop, 'segitiga');
  const relA = path.relative(path.join(ROOT, 'assets'), src), bak = path.join(ROOT, 'data/source/glb-orig', relA + '.pre-clip.glb');
  if (!relA.startsWith('..') && !path.isAbsolute(relA) && !fs.existsSync(bak)) { fs.mkdirSync(path.dirname(bak), { recursive: true }); fs.copyFileSync(src, bak); }
  await doc.transform(weld(), draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8, quantizeGeneric: 12 }));
  fs.writeFileSync(dst, await io.writeBinary(doc));
  console.log('OK', path.relative(ROOT, dst), (fs.statSync(dst).size / 1048576).toFixed(2) + ' MB');
})();
