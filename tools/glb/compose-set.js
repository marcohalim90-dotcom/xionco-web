/* Set dari model varian (27 Okt, ROULED): satu GLB berisi tiap varian sebagai node bernama → panggung menampilkan /
   menyembunyikan bagian per varian (products.json vshow) tanpa ganti produk, dan bagian set bisa bergerak (xc_motion).
   Pakai:  node tools/glb/compose-set.js <out.glb> --part=<nama>:<file.glb>[@cx,cz] ... [--motion=<nama>:dx,dy,dz[:dur]]
   - @cx,cz : pusat tapak bagian dipindah ke (cx, cz) meter (koordinat glTF); tanpa @ = posisi asli file
   - --motion : extras xc_motion { id: nama, move: [dx,dy,dz], dur } di node bagian (klik / Animate = buka-tutup)
   Material sama digabung (dedup), ukuran & serat kayu = file varian apa adanya → set = gabungan varian yang sama persis.
   Hasil: Draco (kuantisasi sama dengan compress.js). */
'use strict';
const fs = require('fs'), path = require('path');
const NM = path.resolve(__dirname, '../compress/node_modules');
const { NodeIO } = require(NM + '/@gltf-transform/core');
const { ALL_EXTENSIONS } = require(NM + '/@gltf-transform/extensions');
const { mergeDocuments, dedup, prune, unpartition, draco } = require(NM + '/@gltf-transform/functions');
const draco3d = require(NM + '/draco3dgltf');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2), out = path.resolve(args.find((a) => !a.startsWith('--')));
const parts = args.filter((a) => a.startsWith('--part=')).map((a) => {
  const m = a.slice(7).match(/^([^:]+):([^@]+)(?:@(-?[\d.]+),(-?[\d.]+))?$/);
  return { name: m[1], file: path.resolve(ROOT, m[2]), at: m[3] != null ? [+m[3], +m[4]] : null };
});
/* --lift=<nama>:y0,y1,dy[:all] : titik bagian itu dengan tinggi y0…y1 (dunia) digeser naik dy meter (pinggulan tepi
   tetap); tanpa :all hanya titik NON-kayu (rangka). Boleh berulang, dijalankan berurutan.
   ROULED (spesifikasi toko: daun 16 mm, rangka 12 × 12 mm): di model daun ø70 28 mm + cincin 22 mm (39,0–44 cm) dan daun ø55
   31 mm + cincin 20 mm → dirampingkan (daun 70: 42,4–44, cincin 41,2–42,4; daun 55: 38,4–40, cincin 37,2–38,4) sehingga
   daun 55 masuk ke bawah daun 70 dengan celah ±12 mm (dulu 1 mm → permukaan berdempet berkedip). */
const lifts = {};
args.filter((a) => a.startsWith('--lift=')).forEach((a) => { const [n, v, all] = a.slice(7).split(':'); (lifts[n] = lifts[n] || []).push({ r: v.split(',').map(Number), all: all === 'all' }); });
const motions = {};
args.filter((a) => a.startsWith('--motion=')).forEach((a) => { const [n, mv, dur] = a.slice(9).split(':'); motions[n] = { id: n, move: mv.split(',').map(Number), dur: dur ? +dur : 1.1 }; });

function bounds(nodes) {   // tapak (x, z) & tinggi dunia semua mesh di bawah node
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const walk = (n) => {
    const mesh = n.getMesh(), M = n.getWorldMatrix();
    if (mesh) for (const p of mesh.listPrimitives()) {
      const P = p.getAttribute('POSITION');
      for (let i = 0; i < P.getCount(); i++) {
        const q = P.getElement(i, []), w = [0, 1, 2].map((k) => M[k] * q[0] + M[4 + k] * q[1] + M[8 + k] * q[2] + M[12 + k]);
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], w[k]); hi[k] = Math.max(hi[k], w[k]); }
      }
    }
    n.listChildren().forEach(walk);
  };
  nodes.forEach(walk);
  return { lo, hi };
}

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule()
  });
  let doc = null, scene = null;
  for (const pt of parts) {
    const d = await io.read(pt.file);
    if (!doc) { doc = d; scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0]; }
    else mergeDocuments(doc, d);
    const scenes = doc.getRoot().listScenes(), sc = scenes[scenes.length - 1];
    const roots = sc.listChildren(), grp = doc.createNode(pt.name);
    roots.forEach((n) => { sc.removeChild(n); grp.addChild(n); });
    scene.addChild(grp);
    if (sc !== scene) sc.dispose();
    if (pt.at) {
      const b = bounds([grp]), cx = (b.lo[0] + b.hi[0]) / 2, cz = (b.lo[2] + b.hi[2]) / 2;
      grp.setTranslation([pt.at[0] - cx, 0, pt.at[1] - cz]);
    }
    for (const lf of lifts[pt.name] || []) {
      const [y0, y1, dy] = lf.r, seen = new Set(); let moved = 0;   // accessor dipakai bersama beberapa node: tiap titik digeser sekali
      const walk = (n) => {
        const mesh = n.getMesh();
        if (mesh) {
          const M = n.getWorldMatrix(), sy = Math.hypot(M[4], M[5], M[6]);   // skala tinggi node (tanpa putaran miring di model katalog)
          for (const p of mesh.listPrimitives()) {
            if (!lf.all && /wood|kayu/i.test(p.getMaterial() ? p.getMaterial().getName() : '')) continue;
            const P = p.getAttribute('POSITION');
            if (seen.has(P)) continue; seen.add(P);
            for (let i = 0; i < P.getCount(); i++) {
              const q = P.getElement(i, []), wy = M[1] * q[0] + M[5] * q[1] + M[9] * q[2] + M[13];
              if (wy >= y0 && wy <= y1) { q[1] += dy / sy; P.setElement(i, q); moved++; }
            }
          }
        }
        n.listChildren().forEach(walk);
      };
      walk(grp);
      console.log(pt.name.padEnd(6), 'lift', moved, 'titik', lf.all ? 'semua' : 'rangka', y0, '…', y1, '+' + dy);
    }
    if (motions[pt.name]) grp.setExtras(Object.assign({}, grp.getExtras(), { xc_motion: motions[pt.name] }));
    const b = bounds([grp]);
    console.log(pt.name.padEnd(6), path.relative(ROOT, pt.file), 'tapak x', b.lo[0].toFixed(3), '…', b.hi[0].toFixed(3), 'z', b.lo[2].toFixed(3), '…', b.hi[2].toFixed(3), 'tinggi', b.hi[1].toFixed(3), motions[pt.name] ? 'gerak ' + JSON.stringify(motions[pt.name].move) : '');
  }
  await doc.transform(unpartition(), dedup(), prune({ keepLeaves: true, keepAttributes: true, keepExtras: true }),
    draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8, quantizeGeneric: 12 }));
  fs.writeFileSync(out, await io.writeBinary(doc));
  console.log('OK', path.relative(ROOT, out), (fs.statSync(out).size / 1048576).toFixed(2) + ' MB', 'material', doc.getRoot().listMaterials().map((m) => m.getName()).join(' | '));
})();
