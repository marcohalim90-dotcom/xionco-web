/* Perbaikan normal tanpa ekspor ulang Blender (27 Okt) — material, tekstur & extras GLB tidak tersentuh.
   Pakai:  node tools/glb/normal-fix.js <in.glb> [out.glb] [--flip=<json>] [--soften=<derajat>] [--mesh=<regex>]
   --flip=<json>     balik muka yang pusatnya tercantum (koordinat dunia glTF, dari
                     blender -b --python tools/glb/fix-normals.py -- <in.glb> --ray --dry --out-flip=<json>)
                     → panel SKP yang menghadap ke dalam (GUISE: panel depan bawah dudukan bergaris)
   --soften=<deg>    muka tegak (normal mendatar) yang bersudut < deg dengan tetangganya diberi normal halus bersama
                     → alur zig-zag datar tampil sebagai alur lembut (KYRIOS: sisi dalam lengan belang tegak)
   --mesh=<regex>    batasi ke node/mesh yang namanya cocok (bawaan: semua)
   Asli disalin ke data/source/glb-orig/<path>.pre-normalfix.glb (lokal). Hasil: Draco (kuantisasi sama dengan compress.js). */
'use strict';
const fs = require('fs'), path = require('path');
const NM = path.resolve(__dirname, '../compress/node_modules');
const { NodeIO } = require(NM + '/@gltf-transform/core');
const { ALL_EXTENSIONS } = require(NM + '/@gltf-transform/extensions');
const { draco, unweld, weld } =require(NM + '/@gltf-transform/functions');
const draco3d = require(NM + '/draco3dgltf');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2), opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const files = args.filter((a) => !a.startsWith('--')), src = path.resolve(files[0]), dst = path.resolve(files[1] || files[0]);
const FLIP = opt('flip') ? JSON.parse(fs.readFileSync(opt('flip'), 'utf8')) : null;
const SOFT = opt('soften') ? +opt('soften') : 0, MESH = opt('mesh') ? new RegExp(opt('mesh')) : null;

function mulPoint(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }
function mulDir(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z]; }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* indeks pusat muka --flip (sel 1 mm) */
const flipCell = new Map();
if (FLIP) FLIP.forEach((c, i) => { const k = c.slice(0, 3).map((v) => Math.round(v * 1000)).join(','); flipCell.set(k, (flipCell.get(k) || []).concat(i)); });
function flipHit(c, n) {   // pusat sama (< 1 mm) DAN arah normal sama — lapisan berlawanan di tempat yang sama tidak ikut dibalik
  const b = c.map((v) => Math.round(v * 1000));
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const l = flipCell.get((b[0] + dx) + ',' + (b[1] + dy) + ',' + (b[2] + dz)); if (!l) continue;
    for (const i of l) if (len(sub(FLIP[i], c)) < .001 && (FLIP[i].length < 6 || dot(FLIP[i].slice(3), n) > .9)) return i;
  }
  return -1;
}

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule()
  });
  const doc = await io.read(src);
  await doc.transform(unweld());   // tiap sudut muka berdiri sendiri → normal per muka bisa diubah tanpa mengganggu tetangga
  const used = new Set(); let flipped = 0, softened = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    if (MESH && !MESH.test(node.getName()) && !MESH.test(mesh.getName())) continue;
    const M = node.getWorldMatrix(), Ni = M;   // skala seragam di model katalog → arah normal cukup diputar dengan matriks yang sama
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue;
      const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'); if (!P || !N) continue;
      const n = P.getCount() / 3, attrs = prim.listSemantics().map((s) => prim.getAttribute(s));
      const pw = [], fn = [], fa = [];
      for (let t = 0; t < n; t++) {
        const v = [0, 1, 2].map((k) => { const p = P.getElement(3 * t + k, []); return mulPoint(M, p[0], p[1], p[2]); });
        const cr = cross(sub(v[1], v[0]), sub(v[2], v[0])), L = len(cr);
        pw.push(v); fn.push(L > 1e-12 ? cr.map((x) => x / L) : [0, 0, 0]); fa.push(L / 2);
      }
      /* 1) balik muka yang tercantum: tukar sudut 2 & 3 (semua atribut) + normal dinegasikan */
      if (FLIP) for (let t = 0; t < n; t++) {
        const c = [0, 1, 2].map((k) => (pw[t][0][k] + pw[t][1][k] + pw[t][2][k]) / 3), i = flipHit(c, fn[t]);
        if (i < 0) continue;
        used.add(i); flipped++;
        for (const a of attrs) { const e1 = a.getElement(3 * t + 1, []), e2 = a.getElement(3 * t + 2, []); a.setElement(3 * t + 1, e2); a.setElement(3 * t + 2, e1); }
        for (let k = 0; k < 3; k++) { const e = N.getElement(3 * t + k, []); N.setElement(3 * t + k, e.map((x) => -x)); }
        [pw[t][1], pw[t][2]] = [pw[t][2], pw[t][1]]; fn[t] = fn[t].map((x) => -x);
      }
      /* 2) normal halus untuk muka tegak: rata-rata (bobot luas) muka tegak di titik yang sama dengan sudut < SOFT */
      if (SOFT) {
        const cos = Math.cos(SOFT * Math.PI / 180), vert = fn.map((f) => Math.abs(f[1]) < .35 && len(f) > 0);
        const at = new Map(), key = (p) => p.map((x) => Math.round(x * 1e4)).join(',');
        for (let t = 0; t < n; t++) if (vert[t]) for (let k = 0; k < 3; k++) { const q = key(pw[t][k]); (at.get(q) || at.set(q, []).get(q)).push(t); }
        const inv = (() => {   // dunia → lokal untuk arah: transpos bagian rotasi (dibagi skala²)
          const s2 = M[0] * M[0] + M[1] * M[1] + M[2] * M[2];
          return (d) => [(M[0] * d[0] + M[1] * d[1] + M[2] * d[2]) / s2, (M[4] * d[0] + M[5] * d[1] + M[6] * d[2]) / s2, (M[8] * d[0] + M[9] * d[1] + M[10] * d[2]) / s2];
        })();
        for (let t = 0; t < n; t++) {
          if (!vert[t]) continue;
          let changed = false;
          for (let k = 0; k < 3; k++) {
            const s = [0, 0, 0], nb = at.get(key(pw[t][k]));
            for (const g of nb) if (dot(fn[g], fn[t]) > cos) { s[0] += fn[g][0] * fa[g]; s[1] += fn[g][1] * fa[g]; s[2] += fn[g][2] * fa[g]; }
            const L = len(s); if (!L) continue;
            const w = inv(s.map((x) => x / L)), Lw = len(w), old = N.getElement(3 * t + k, []);
            const nw = w.map((x) => x / Lw);
            if (Math.abs(dot(nw, old) - 1) > 1e-4) changed = true;
            N.setElement(3 * t + k, nw);
          }
          if (changed) softened++;
        }
      }
    }
  }
  if (FLIP) {
    console.log('balik', flipped, 'muka (daftar ' + FLIP.length + ', cocok ' + used.size + ')');
    FLIP.forEach((c, i) => { if (!used.has(i)) console.log('  tidak cocok:', JSON.stringify(c)); });
  }
  if (SOFT) console.log('halus', softened, 'muka tegak (<' + SOFT + '°)');
  const relA = path.relative(path.join(ROOT, 'assets'), src), bak = path.join(ROOT, 'data/source/glb-orig', relA + '.pre-normalfix.glb');
  if (!relA.startsWith('..') && !path.isAbsolute(relA) && !fs.existsSync(bak)) { fs.mkdirSync(path.dirname(bak), { recursive: true }); fs.copyFileSync(src, bak); }   // hanya file di assets/
  await doc.transform(weld(), draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8, quantizeGeneric: 12 }));
  fs.writeFileSync(dst, await io.writeBinary(doc));
  console.log('OK', path.relative(ROOT, dst), (fs.statSync(dst).size / 1048576).toFixed(2) + ' MB');
})();
