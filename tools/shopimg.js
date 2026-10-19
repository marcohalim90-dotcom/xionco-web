/* Foto referensi xionco.shop (Developer Settings › Foto referensi) — API lokal:
   GET  /api/shopimg         → { index: data/source/shop-img/_index.json, job: status unduhan }
   POST /api/shopimg/sync    → unduh foto yang belum ada (body { again: true } = unduh ulang semua) — berjalan di latar */
const path = require('path'), fs = require('fs');
const shop = require('./shop-images');
const job = { running: false, done: 0, total: 0, fail: 0, new: 0, at: null, error: null };
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
function body(req) { return new Promise((ok) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { ok({}); } }); }); }
async function handle(req, res, p, send) {
  if (p === '/api/shopimg' && req.method === 'GET') return send(res, 200, { ok: true, index: read(path.join(shop.OUT, '_index.json'), { items: {} }), job });
  if (p === '/api/shopimg/sync' && req.method === 'POST') {
    if (job.running) return send(res, 409, { ok: false, error: 'Masih mengunduh', job });
    const b = await body(req);
    Object.assign(job, { running: true, done: 0, total: 0, fail: 0, new: 0, error: null, at: Date.now() });
    shop.run({ again: !!b.again, progress: (s) => Object.assign(job, { done: s.done, total: s.total, fail: s.fail, new: s.new }) })
      .then(() => { job.running = false; job.at = Date.now(); }, (e) => { job.running = false; job.error = String(e.message).slice(0, 200); });
    return send(res, 200, { ok: true, job });
  }
  return send(res, 404, { ok: false, error: 'Tidak dikenal' });
}
module.exports = { handle };
