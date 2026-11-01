/* ==========================================================================
   XIONCO — mesin waktu versi git (Developer Settings › Versi › Versi git)
   GET  /api/gitver        → 10 versi v5 terakhir dari git + versi yang sedang dipilih untuk v5-b
   POST /api/gitver/load   { hash } → v5-b menunjuk ke versi itu
   /v5-b/                  → dialihkan ke http://127.0.0.1:<port>/gv/<hash>/v5/
   /gv/<hash>/<path>       → file APA ADANYA pada versi itu: kode, data produk (warna, variant, harga),
                             model 3D, tekstur, plugin Developer Settings. Jadi benar-benar seperti dulu,
                             bukan kode lama yang membaca data hari ini.
   Dibuka di 127.0.0.1 (bukan localhost) → penyimpanan browser terpisah: pengaturan & isi Ruang di v5
   tidak ikut terbawa dan tidak tertimpa. Hanya baca: tidak ada yang bisa disimpan ke versi lama.
   Folder v5 (versi kerja) tidak pernah disentuh. Salinan file disimpan di data/history/gv/ (lokal saja).
   ========================================================================== */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MARKDIR = path.join(ROOT, 'v5-b');
const MARK = path.join(MARKDIR, '.gitver.json');
const CACHE = path.join(ROOT, 'data', 'history', 'gv');

function git(args, raw) {
  return execFileSync('git', args, { cwd: ROOT, encoding: raw ? 'buffer' : 'utf8', maxBuffer: 512 * 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
}
function list() {
  return git(['log', '-n', '10', '--format=%H%x1f%h%x1f%ad%x1f%s', '--date=format:%Y-%m-%d %H:%M', '--', 'v5']).split('\n').filter(Boolean).map((l) => {
    const [hash, short, date, subject] = l.split('\x1f');
    return { hash, short, date, subject };
  });
}
function current() {
  try { return JSON.parse(fs.readFileSync(MARK, 'utf8')); } catch (e) { return null; }
}
function select(v) {
  // v5-b dulu berisi salinan file; sekarang hanya penanda versi (file lama dibuang)
  if (fs.existsSync(MARKDIR)) for (const f of fs.readdirSync(MARKDIR)) if (f !== '.gitver.json') fs.rmSync(path.join(MARKDIR, f), { recursive: true, force: true });
  fs.mkdirSync(MARKDIR, { recursive: true });
  fs.writeFileSync(MARK, JSON.stringify(Object.assign({}, v, { at: new Date().toISOString() }), null, 2) + '\n');
}
function url(port, h) { return 'http://127.0.0.1:' + port + '/gv/' + h + '/v5/'; }

// file pada versi tertentu (disalin sekali ke data/history/gv/<hash>/ lalu dibaca dari sana)
function blob(hash, rel) {
  const out = path.join(CACHE, hash, rel);
  if (!out.startsWith(path.join(CACHE, hash))) return null;
  if (fs.existsSync(out)) return fs.readFileSync(out);
  let buf;
  try { buf = git(['cat-file', 'blob', hash + ':' + rel], true); } catch (e) { return null; }
  try { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf); } catch (e) {}
  return buf;
}
function isDir(hash, rel) {
  try { return git(['cat-file', '-t', hash + ':' + rel]).trim() === 'tree'; } catch (e) { return false; }
}
const commits = {};
function isCommit(hash) {
  if (commits[hash] != null) return commits[hash];
  try { return (commits[hash] = git(['cat-file', '-t', hash]).trim() === 'commit'); } catch (e) { return (commits[hash] = false); }
}

// /gv/<hash>/<path>
function serveVersion(req, res, p, types) {
  const m = p.match(/^\/gv\/([0-9a-f]{40})(\/.*)?$/);
  if (!m || !isCommit(m[1])) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 — versi tidak ditemukan'); }
  const hash = m[1];
  let rel = (m[2] || '/').replace(/^\/+/, '');
  if (rel.split('/').some((s) => s === '..') || /^data\/(private|history)\//.test(rel)) { res.writeHead(403); return res.end(); }
  // API versi lama: tidak ada folder database → situs memakai data/*.json versi itu (hanya baca)
  if (rel.indexOf('api/') === 0) { res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify({ ok: false, error: 'Versi lama hanya untuk dilihat' })); }
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const buf = blob(hash, rel);
  if (!buf) {
    if (isDir(hash, rel)) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 — tidak ada di versi ini');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(rel).toLowerCase()] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
  res.end(buf);
}

function handle(req, res, p, send, port) {
  if (p === '/api/gitver' && req.method === 'GET') {
    try { const cur = current(); return send(res, 200, { ok: true, list: list(), current: cur, url: cur ? url(port, cur.hash) : null }); } catch (e) { return send(res, 500, { ok: false, error: 'Git tidak bisa dibaca: ' + e.message }); }
  }
  if (p === '/api/gitver/load' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      let hash;
      try { hash = JSON.parse(body).hash; } catch (e) { return send(res, 400, { ok: false, error: 'JSON tidak valid' }); }
      let v;
      try { v = list().filter((x) => x.hash === hash)[0]; } catch (e) { return send(res, 500, { ok: false, error: 'Git tidak bisa dibaca: ' + e.message }); }
      if (!v) return send(res, 400, { ok: false, error: 'Versi tidak ada di daftar' });
      try { select(v); send(res, 200, { ok: true, current: current(), url: url(port, v.hash) }); } catch (e) { send(res, 500, { ok: false, error: 'Gagal memilih: ' + e.message }); }
    });
    return;
  }
  send(res, 405, { ok: false, error: 'Metode tidak didukung' });
}
// /v5-b/ → versi yang dipilih (bagian #… tetap dibawa browser)
function redirectB(req, res, port) {
  const cur = current();
  if (!cur) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Belum ada versi dipilih — Developer Settings › Versi › Versi git'); }
  res.writeHead(302, { Location: url(port, cur.hash), 'Cache-Control': 'no-store' });
  res.end();
}

module.exports = { handle, serveVersion, redirectB, list, current };
