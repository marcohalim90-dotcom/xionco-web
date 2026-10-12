/* ==========================================================================
   XIONCO — server lokal (tanpa dependensi)
   Pakai:  node tools/serve.js        → http://localhost:5173
           PORT=8080 node tools/serve.js
   / → versi terbaru (v5)   Versi 1: /v1/   Versi 2: /v2/   … Versi 5: /v5/
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = +process.env.PORT || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
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
});
