/* Haluskan permukaan model 3D AI tanpa Blender (Z4): gelombang / lipatan palsu pada panel kain & kulit diratakan
   dengan Taubin smoothing (λ/μ, volume terjaga) hanya pada titik yang BUKAN tepi tajam (sudut normal antar muka < batas),
   sehingga piping, jahitan & sudut tetap tegas. Normal dihitung ulang (halus dalam satu komponen las, tepi tajam dipertahankan).
   node tools/glb/smooth.js <id|file.glb> [--mat=<regex>] [--iter=12] [--lambda=.5] [--feat=38] [--dry] [--out=<file>] [--keep-normal]
     --mat     material yang dihaluskan (bawaan: kain|fabric|kulit|leather|velvet|boucle|linen|pillow)
     --feat    batas sudut tepi tajam (derajat): titik di tepi yang lebih tajam tidak digeser
     --dry     hanya statistik kekasaran (tanpa menulis)
   Asli disalin ke data/source/glb-presmooth/<path> (lokal). Draco & WebP tetap. */
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
if (!target) { console.log('pakai: node tools/glb/smooth.js <id|file.glb> [--mat=regex] [--iter=12] [--lambda=.5] [--feat=38] [--dry]'); process.exit(1); }
const MAT = new RegExp(arg('mat', 'kain|fabric|kulit|leather|velvet|boucle|linen|pillow'), 'i');
const ITER = +arg('iter', 12), LAM = +arg('lambda', .5), MU = arg('mu', '') !== '' ? +arg('mu') : -(LAM + .03), FEAT = Math.cos(+arg('feat', 38) * Math.PI / 180);
// Taubin: λ > 0 mengecilkan, μ < 0 mengembalikan (pita lolos k = 1/λ + 1/μ; makin kecil k → gelombang makin lebar ikut rata). μ = 0 → Laplacian murni (menyusut)
const P = require(path.join(ROOT, 'data/products.json')).items;
const file = /\.glb$/i.test(target) ? path.resolve(target) : path.join(ROOT, (P.find((p) => p.id === target) || {}).model || '');
if (!fs.existsSync(file)) { console.error('model tidak ditemukan: ' + target); process.exit(1); }

function stats(pos, idx) {   // kekasaran: sudut rata-rata antar normal muka bertetangga (derajat) — makin kecil makin rata
  const n = pos.length / 3, fn = new Float32Array(idx.length), e = new Map(); let sum = 0, cnt = 0, big = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    let x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; const l = Math.hypot(x, y, z) || 1; fn[t] = x / l; fn[t + 1] = y / l; fn[t + 2] = z / l;
    for (let k = 0; k < 3; k++) { const i = idx[t + k], j = idx[t + (k + 1) % 3], key = i < j ? i + ':' + j : j + ':' + i; if (e.has(key)) { const t2 = e.get(key); const d = Math.max(-1, Math.min(1, fn[t] * fn[t2] + fn[t + 1] * fn[t2 + 1] + fn[t + 2] * fn[t2 + 2])); const ang = Math.acos(d) * 180 / Math.PI; sum += ang; cnt++; if (ang > 8) big++; } else e.set(key, t); }
  }
  return { verts: n, tris: idx.length / 3, meanAngle: +(sum / Math.max(1, cnt)).toFixed(2), pctOver8: +(100 * big / Math.max(1, cnt)).toFixed(1) };
}

function smoothPrim(pos, idx, nor) {
  const n = pos.length / 3;
  // las titik kembar (seam UV) → id las
  const key = new Map(), wid = new Int32Array(n); let W = 0; const wv = [];
  for (let i = 0; i < n; i++) { const k = (Math.round(pos[i * 3] * 2e4)) + ',' + (Math.round(pos[i * 3 + 1] * 2e4)) + ',' + (Math.round(pos[i * 3 + 2] * 2e4)); let w = key.get(k); if (w == null) { w = W++; key.set(k, w); wv.push([]); } wid[i] = w; wv[w].push(i); }
  const adj = Array.from({ length: W }, () => new Set());
  const fnorm = (p, t) => { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3; const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]; return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; };
  for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = wid[idx[t + k]], b = wid[idx[t + (k + 1) % 3]]; if (a !== b) { adj[a].add(b); adj[b].add(a); } }
  // normal las (berbobot luas) → tepi tajam: tetangga dengan normal berbeda > FEAT ⇒ titik dikunci
  const wn = () => { const N = new Float32Array(W * 3); for (let t = 0; t < idx.length; t += 3) { const f = fnorm(pos, t); for (let k = 0; k < 3; k++) { const w = wid[idx[t + k]]; N[w * 3] += f[0]; N[w * 3 + 1] += f[1]; N[w * 3 + 2] += f[2]; } } for (let w = 0; w < W; w++) { const l = Math.hypot(N[w * 3], N[w * 3 + 1], N[w * 3 + 2]) || 1; N[w * 3] /= l; N[w * 3 + 1] /= l; N[w * 3 + 2] /= l; } return N; };
  const N0 = wn(), fixed = new Uint8Array(W);
  // tepi tajam dari sudut antar MUKA yang berbagi sisi (lebih peka dari normal las)
  const edge = new Map();
  for (let t = 0; t < idx.length; t += 3) { const f = fnorm(pos, t), l = Math.hypot(f[0], f[1], f[2]) || 1; f[0] /= l; f[1] /= l; f[2] /= l; for (let k = 0; k < 3; k++) { const a = wid[idx[t + k]], b = wid[idx[t + (k + 1) % 3]]; if (a === b) continue; const kk = a < b ? a + ':' + b : b + ':' + a; const o = edge.get(kk); if (o) { if (o[0] * f[0] + o[1] * f[1] + o[2] * f[2] < FEAT) { fixed[a] = fixed[b] = 1; } } else edge.set(kk, f); } }
  // batas (sisi hanya 1 muka) juga dikunci
  const cntE = new Map(); for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = wid[idx[t + k]], b = wid[idx[t + (k + 1) % 3]]; if (a === b) continue; const kk = a < b ? a + ':' + b : b + ':' + a; cntE.set(kk, (cntE.get(kk) || 0) + 1); }
  cntE.forEach((c, kk) => { if (c === 1) { const [a, b] = kk.split(':'); fixed[+a] = fixed[+b] = 1; } });
  let nFixed = 0; for (let w = 0; w < W; w++) nFixed += fixed[w];
  // posisi las
  const wp = new Float32Array(W * 3); for (let w = 0; w < W; w++) { const i = wv[w][0]; wp[w * 3] = pos[i * 3]; wp[w * 3 + 1] = pos[i * 3 + 1]; wp[w * 3 + 2] = pos[i * 3 + 2]; }
  const step = (f) => { const out = new Float32Array(wp); for (let w = 0; w < W; w++) { if (fixed[w] || !adj[w].size) continue; let x = 0, y = 0, z = 0; adj[w].forEach((v) => { x += wp[v * 3]; y += wp[v * 3 + 1]; z += wp[v * 3 + 2]; }); const m = adj[w].size; out[w * 3] += f * (x / m - wp[w * 3]); out[w * 3 + 1] += f * (y / m - wp[w * 3 + 1]); out[w * 3 + 2] += f * (z / m - wp[w * 3 + 2]); } wp.set(out); };
  const wp0 = new Float32Array(wp);
  for (let i = 0; i < ITER; i++) { step(LAM); if (MU) step(MU); }
  let dsum = 0, dmax = 0; for (let w = 0; w < W; w++) { const d = Math.hypot(wp[w * 3] - wp0[w * 3], wp[w * 3 + 1] - wp0[w * 3 + 1], wp[w * 3 + 2] - wp0[w * 3 + 2]); dsum += d; if (d > dmax) dmax = d; }
  for (let w = 0; w < W; w++) wv[w].forEach((i) => { pos[i * 3] = wp[w * 3]; pos[i * 3 + 1] = wp[w * 3 + 1]; pos[i * 3 + 2] = wp[w * 3 + 2]; });
  // normal baru: halus (las) kecuali titik tepi tajam → normal asli dipertahankan
  if (nor && !has('keep-normal')) { const N1 = wn(); for (let w = 0; w < W; w++) { if (fixed[w]) continue; wv[w].forEach((i) => { nor[i * 3] = N1[w * 3]; nor[i * 3 + 1] = N1[w * 3 + 1]; nor[i * 3 + 2] = N1[w * 3 + 2]; }); } }
  return { welded: W, fixed: nFixed, dMean: +(dsum / W * 1000).toFixed(2), dMax: +(dmax * 1000).toFixed(1) };
}

(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
  const doc = await io.read(file);
  let touched = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const m = prim.getMaterial(), name = m ? m.getName() : '';
    const P0 = prim.getAttribute('POSITION'), I = prim.getIndices(), N = prim.getAttribute('NORMAL');
    if (!P0 || !I) continue;
    const pos = P0.getArray(), idx = I.getArray(), nor = N ? N.getArray() : null;
    const s0 = stats(pos, idx);
    if (!MAT.test(name)) { console.log('  lewat   ', name.padEnd(30), JSON.stringify(s0)); continue; }
    if (has('dry')) { console.log('  statistik', name.padEnd(30), JSON.stringify(s0)); continue; }
    const p2 = new Float32Array(pos), n2 = nor ? new Float32Array(nor) : null;
    const r = smoothPrim(p2, idx, n2);
    const s1 = stats(p2, idx);
    P0.setArray(p2); if (n2) N.setArray(n2);
    const T = prim.getAttribute('TANGENT'); if (T) prim.setAttribute('TANGENT', null);
    console.log('  halus   ', name.padEnd(30), 'sudut rata ' + s0.meanAngle + '° → ' + s1.meanAngle + '°, >8°: ' + s0.pctOver8 + '% → ' + s1.pctOver8 + '%, titik dikunci ' + r.fixed + '/' + r.welded + ', geser rata ' + r.dMean + ' mm (maks ' + r.dMax + ' mm)');
    touched++;
  }
  if (has('dry') || !touched) { console.log(touched ? '' : 'tidak ada material cocok (--mat)'); return; }
  const out = arg('out', file);
  if (out === file) { const bak = path.join(ROOT, 'data/source/glb-presmooth', path.relative(ROOT, file)); if (!fs.existsSync(bak)) { fs.mkdirSync(path.dirname(bak), { recursive: true }); fs.copyFileSync(file, bak); } }
  await doc.transform(draco({ method: 'edgebreaker' }));
  await io.write(out, doc);
  console.log('ditulis ' + path.relative(ROOT, out) + ' (' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB)');
})().catch((e) => { console.error(e); process.exit(1); });
