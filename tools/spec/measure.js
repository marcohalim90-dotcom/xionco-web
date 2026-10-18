/* ==========================================================================
   Ukur model 3D katalog (Developer Settings › Ukuran & material)
   Pakai:  node tools/spec/measure.js
   Hasil:  data/specs-3d.json  { measured, models: { "<path glb>": { w, d, h, unit } } }  (cm, setelah modelRot)
   Ukuran dihitung dari kotak batas GLB (min/max POSITION tiap primitive × transformasi node) dengan
   satuan yang sama seperti panggung (v5/js/world.js: UNITS + sizeFor — m / cm / inci / mm terdekat ke
   ukuran wajar kategori), lalu diputar modelRot. W = lebar (sumbu X), D = dalam (Z), H = tinggi (Y).
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'data/specs-3d.json');

// --- sama dengan v5/js/world.js ---
const UNITS = [1, .01, .0254, .001];
function sizeFor(p) {
  const t = (p.type || '').toLowerCase();
  if (p.cat === 'seats') return /chair/.test(t) && !/arm/.test(t) ? .55 : /sectional/.test(t) ? 2.9 : /armchair/.test(t) ? 1.1 : 2.1;
  if (p.cat === 'tables') return /dining/.test(t) ? 1.6 : /desk|workstation/.test(t) ? 1.4 : /side/.test(t) ? .5 : /nesting/.test(t) ? .9 : 1.05;
  if (p.cat === 'bedframe') return 2.0;
  if (p.cat === 'cabinet') return /wardrobe/.test(t) ? 1.5 : /nightstand/.test(t) ? .5 : /kitchenette/.test(t) ? 1.8 : .9;
  if (p.cat === 'decor') return /panel/.test(t) ? 1.3 : /towel/.test(t) ? .55 : .45;
  return /track/.test(t) ? .7 : .3;
}

// --- matriks 4×4 kolom-utama (glTF) ---
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation || [0, 0, 0], [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
const apply = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };   // accessor normalized (kuantisasi)

function gltfJson(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error('bukan GLB');
  const len = b.readUInt32LE(12);
  return JSON.parse(b.slice(20, 20 + len).toString('utf8'));
}
function bbox(file) {
  const g = gltfJson(file), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const visit = (ni, parent) => {
    const n = g.nodes[ni], m = mul(parent, trs(n));
    if (n.mesh != null) g.meshes[n.mesh].primitives.forEach((pr) => {
      const a = g.accessors[pr.attributes.POSITION]; if (!a || !a.min || !a.max) return;
      const k = a.normalized ? NORM[a.componentType] || 1 : 1, mn = a.min.map((v) => v / k), mx = a.max.map((v) => v / k);
      for (let i = 0; i < 8; i++) {
        const p = apply(m, [i & 1 ? mx[0] : mn[0], i & 2 ? mx[1] : mn[1], i & 4 ? mx[2] : mn[2]]);
        for (let j = 0; j < 3; j++) { lo[j] = Math.min(lo[j], p[j]); hi[j] = Math.max(hi[j], p[j]); }
      }
    });
    (n.children || []).forEach((c) => visit(c, m));
  };
  ((g.scenes || [])[g.scene || 0] || { nodes: g.nodes.map((n, i) => i) }).nodes.forEach((ni) => visit(ni, I4()));
  return { x: hi[0] - lo[0], y: hi[1] - lo[1], z: hi[2] - lo[2] };
}

function measure(p, rel) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) return { err: 'file tidak ada' };
  const s = bbox(f), r = ((+p.modelRot || 0) % 180 + 180) % 180, swap = Math.abs(r - 90) < 1;   // diputar 90° → lebar/dalam bertukar
  let x = s.x, z = s.z;
  if (r && !swap) { const c = Math.abs(Math.cos(r * Math.PI / 180)), sn = Math.abs(Math.sin(r * Math.PI / 180)); x = s.x * c + s.z * sn; z = s.x * sn + s.z * c; }
  else if (swap) { x = s.z; z = s.x; }
  const want = sizeFor(p), wide = Math.max(x, z) || 1;
  let u = 1, best = Infinity;
  UNITS.forEach((k) => { const e = Math.abs(Math.log(wide * k / want)); if (e < best) { best = e; u = k; } });
  const cm = (v) => Math.round(v * u * 1000) / 10;
  return { w: cm(x), d: cm(z), h: cm(s.y), unit: { 1: 'm', .01: 'cm', .0254: 'inci', .001: 'mm' }[u] };
}

function run() {
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
  const models = {};
  let n = 0, bad = [];
  db.items.filter((p) => p.status === 'aktif').forEach((p) => {
    const files = [p.model].concat(Object.values(p.vmodels || {})).filter(Boolean);
    files.forEach((rel) => {
      if (models[rel]) return;
      try { const m = measure(p, rel); if (m.err) bad.push(rel + ' (' + m.err + ')'); else { models[rel] = m; n++; } } catch (e) { bad.push(rel + ' (' + e.message + ')'); }
    });
  });
  const out = { note: 'Ukuran model 3D katalog (cm) — dibuat tools/spec/measure.js; dibandingkan dengan data/specs.json di Developer Settings › Ukuran & material', measured: new Date().toISOString(), models };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  return { n, bad, out };
}
module.exports = { run, bbox };
if (require.main === module) { const r = run(); console.log(r.n + ' model diukur' + (r.bad.length ? '; gagal: ' + r.bad.join(', ') : '')); }
