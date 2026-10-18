/* Ukuran & material produk (Developer Settings › Ukuran & material) — API lokal:
   GET  /api/specs          → { specs: data/specs.json, m3d: data/specs-3d.json }
   PUT  /api/specs {items}  → simpan baris per produk (items[id].rows menggantikan baris lama produk itu)
   POST /api/specs/measure  → ukur ulang semua model 3D (tools/spec/measure.js) */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), FILE = path.join(ROOT, 'data', 'specs.json'), M3D = path.join(ROOT, 'data', 'specs-3d.json');
const measure = require('./spec/measure');
const ID = /^[a-z0-9-]{1,120}$/;
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
function body(req) { return new Promise((ok) => { let s = ''; req.on('data', (c) => { s += c; if (s.length > 4e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { ok({}); } }); }); }
const TXT = ['k', 'src', 'frame', 'uph', 'finish', 'legs', 'other', 'note', 'model'];
function cleanRow(r) {
  const o = {};
  TXT.forEach((k) => { if (r[k] != null && String(r[k]).trim()) o[k] = String(r[k]).trim().slice(0, 300); });
  ['w', 'd', 'h'].forEach((k) => { const v = parseFloat(String(r[k] == null ? '' : r[k]).replace(',', '.')); if (isFinite(v) && v > 0 && v < 10000) o[k] = Math.round(v * 10) / 10; });
  if (!o.k) o.k = 'Utama';
  return o;
}
async function handle(req, res, p, send) {
  if (p === '/api/specs' && req.method === 'GET') return send(res, 200, { ok: true, specs: read(FILE, { items: {} }), m3d: read(M3D, { models: {} }) });
  if (p === '/api/specs' && req.method === 'PUT') {
    const b = await body(req), cur = read(FILE, { note: '', items: {} });
    cur.note = 'Ukuran resmi (cm) & material per produk / ukuran — Developer Settings › Ukuran & material; dibandingkan dengan model 3D (data/specs-3d.json)';
    cur.items = cur.items || {};
    Object.keys(b.items || {}).forEach((id) => {
      if (!ID.test(id)) return;
      const rows = (b.items[id] && b.items[id].rows || []).slice(0, 40).map(cleanRow);
      if (rows.length) cur.items[id] = Object.assign({}, cur.items[id], { rows, at: new Date().toISOString() });   // overview / isi paket / perawatan tetap
      else if (cur.items[id]) delete cur.items[id].rows;
    });
    cur.updated = new Date().toISOString();
    fs.writeFileSync(FILE, JSON.stringify(cur, null, 1) + '\n');
    return send(res, 200, { ok: true, specs: cur });
  }
  if (p === '/api/specs/measure' && req.method === 'POST') {
    try { const r = measure.run(); return send(res, 200, { ok: true, n: r.n, bad: r.bad, m3d: r.out }); }
    catch (e) { return send(res, 500, { ok: false, error: e.message }); }
  }
  return send(res, 404, { ok: false, error: 'Tidak dikenal' });
}
module.exports = { handle };
