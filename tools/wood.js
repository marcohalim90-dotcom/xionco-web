/* Kayu koleksi (Developer Settings › Kayu koleksi) — API lokal:
   GET /api/wood → data/wood.json · PUT /api/wood {classes} → simpan
   POST /api/wood/ai → jalankan tools/glb/ai-wood.js di belakang (model 3D AI ikut warna baru) · GET /api/wood/ai → status */
const fs = require('fs'), path = require('path'), { execFile } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), FILE = path.join(ROOT, 'data', 'wood.json');
const HEX = /^#[0-9a-f]{6}$/i, SET = /^[a-z0-9-]{3,60}$/;
let job = { run: false, at: 0, log: '' };
function body(req) { return new Promise((ok) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { ok({}); } }); }); }
function clean(c) {
  const num = (v, a, b, d) => { v = +v; return isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
  return { l: String(c.l || '').slice(0, 30), set: SET.test(c.set) ? c.set : 'wood-oak', hex: HEX.test(c.hex) ? c.hex.toLowerCase() : '#9a7a5a',
    ctr: num(c.ctr, .2, 2, 1), rough: num(c.rough, .1, 1, .5), normal: num(c.normal, 0, 1.5, .35), scale: num(c.scale, .3, 3, 1) };
}
async function handle(req, res, p, send) {
  if (p === '/api/wood' && req.method === 'GET') return send(res, 200, Object.assign({ ok: true }, JSON.parse(fs.readFileSync(FILE, 'utf8'))));
  if (p === '/api/wood' && req.method === 'PUT') {
    const b = await body(req), cur = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    ['gelap', 'terang', 'natural'].forEach((k) => { if (b.classes && b.classes[k]) cur.classes[k] = clean(Object.assign({}, cur.classes[k], b.classes[k])); });
    cur.updated = new Date().toISOString();
    fs.writeFileSync(FILE, JSON.stringify(cur, null, 2) + '\n');
    return send(res, 200, Object.assign({ ok: true }, cur));
  }
  if (p === '/api/wood/ai' && req.method === 'GET') return send(res, 200, Object.assign({ ok: true }, job));
  if (p === '/api/wood/ai' && req.method === 'POST') {
    if (job.run) return send(res, 200, Object.assign({ ok: true }, job));
    job = { run: true, at: Date.now(), log: '' };
    execFile(process.execPath, [path.join(ROOT, 'tools/glb/ai-wood.js')], { cwd: ROOT, timeout: 1800000 }, (e, so, se) => { job.run = false; job.log = String(so || '') + (e ? '\nGAGAL: ' + (se || e.message).slice(-300) : ''); job.done = Date.now(); });
    return send(res, 200, Object.assign({ ok: true }, job));
  }
  return send(res, 404, { ok: false, error: 'Tidak dikenal' });
}
module.exports = { handle };
