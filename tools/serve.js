/* ==========================================================================
   XIONCO — server lokal (tanpa dependensi) + database folder lokal
   Pakai:  node tools/serve.js        → http://localhost:5173
           PORT=8080 node tools/serve.js
   / → versi terbaru (v5)   Versi 1: /v1/   Versi 2: /v2/   … Versi 5: /v5/

   Database Developer Settings disimpan sebagai file di folder data/:
     data/products.json         katalog item         (ikut online saat di-push)
     data/checks.json           centang aset manual  (ikut online)
     data/private/customs.json  pesanan custom + data pelanggan (TIDAK ikut online)
     data/history/              cadangan otomatis setiap kali disimpan (lokal saja)
   API hanya menerima permintaan dari localhost.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = +process.env.PORT || 5173;
const DATA = path.join(ROOT, 'data');
const HIST = path.join(DATA, 'history');
const KEEP = 30;                                   // cadangan per file
const DB = {
  products: path.join(DATA, 'products.json'),
  checks: path.join(DATA, 'checks.json'),
  customs: path.join(DATA, 'private', 'customs.json')
};
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8', '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream', '.pdf': 'application/pdf'
};

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function isLocalHost(req) {
  const h = String(req.headers.host || '').replace(/:\d+$/, '');
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}
function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function backup(name, file) {
  if (!fs.existsSync(file)) return;
  fs.mkdirSync(HIST, { recursive: true });
  fs.copyFileSync(file, path.join(HIST, name + '-' + stamp() + '.json'));
  const old = fs.readdirSync(HIST).filter((f) => f.startsWith(name + '-')).sort();
  old.slice(0, Math.max(0, old.length - KEEP)).forEach((f) => fs.unlinkSync(path.join(HIST, f)));
}
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}
function listAssets() {
  const base = path.join(ROOT, 'assets'), out = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name !== 'README.md') out.push(path.relative(ROOT, p).split(path.sep).join('/'));
    }
  })(base);
  return out;
}

function api(req, res, p) {
  if (!isLocalHost(req)) return send(res, 403, { ok: false, error: 'Hanya dari localhost' });
  // penulisan butuh header khusus → permintaan dari situs lain diblokir browser (CORS)
  if (req.method !== 'GET' && req.headers['x-xionco'] !== '1') return send(res, 403, { ok: false, error: 'Header tidak valid' });

  if (p === '/api/db' && req.method === 'GET') {
    const files = {};
    for (const k of Object.keys(DB)) files[k] = fs.existsSync(DB[k]) ? fs.statSync(DB[k]).mtimeMs : null;
    return send(res, 200, { ok: true, writable: true, files: files });
  }
  if (p === '/api/assets' && req.method === 'GET') return send(res, 200, { ok: true, files: listAssets() });

  const m = p.match(/^\/api\/db\/([a-z]+)$/);
  if (!m || !DB[m[1]]) return send(res, 404, { ok: false, error: 'Tidak dikenal' });
  const name = m[1], file = DB[name];

  if (req.method === 'GET') {
    if (!fs.existsSync(file)) return send(res, 404, { ok: false, error: 'Belum ada' });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(file));
  }
  if (req.method === 'PUT') {
    let body = '', size = 0;
    req.on('data', (c) => { size += c.length; if (size > 8 * 1024 * 1024) req.destroy(); else body += c; });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(body); } catch (e) { return send(res, 400, { ok: false, error: 'JSON tidak valid' }); }
      if (!data || data.app !== 'XIONCO' || data.kind !== name) return send(res, 400, { ok: false, error: 'Format tidak sesuai' });
      try {
        backup(name, file);
        writeAtomic(file, JSON.stringify(data, null, 2) + '\n');
        send(res, 200, { ok: true, saved: path.relative(ROOT, file).split(path.sep).join('/'), at: Date.now() });
      } catch (e) { send(res, 500, { ok: false, error: e.message }); }
    });
    return;
  }
  send(res, 405, { ok: false, error: 'Metode tidak didukung' });
}

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (p.indexOf('/api/') === 0) return api(req, res, p);
  if (p.indexOf('/data/private/') === 0 || p.indexOf('/data/history/') === 0) { res.writeHead(403); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 — tidak ditemukan'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('XIONCO lokal siap:');
  console.log('  Utama   → http://localhost:' + PORT + '/  (langsung ke versi 5)');
  console.log('  Versi 1 → http://localhost:' + PORT + '/v1/');
  console.log('  Versi 2 → http://localhost:' + PORT + '/v2/');
  console.log('  Versi 3 → http://localhost:' + PORT + '/v3/');
  console.log('  Versi 4 → http://localhost:' + PORT + '/v4/');
  console.log('  Versi 5 → http://localhost:' + PORT + '/v5/');
  console.log('  Database → data/ (Developer Settings menyimpan langsung ke folder ini)');
});
