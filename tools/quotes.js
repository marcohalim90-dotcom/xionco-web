/* ==========================================================================
   XIONCO — server penawaran (harga khusus) · TIRUAN LOKAL
   Dipakai tools/serve.js. Nanti diganti server sungguhan (database online) dengan API yang sama.

   Data: data/private/quotes.json (TIDAK ikut online — berisi nama & WhatsApp customer)

   Admin (Developer Settings, hanya localhost + header X-XIONCO):
     GET    /api/quotes              daftar penawaran (lengkap)
     POST   /api/quotes              buat / ubah  { code?, kind, title, sub, img, pid, v, s, cfg, qty, normal, price, days, maxUse, note, internal, customer, status }
     DELETE /api/quotes/<KODE>

   Publik (situs / customer):
     GET    /api/pub/q/<KODE>        → hanya data untuk customer (tanpa catatan internal / data customer)
     POST   /api/pub/q/<KODE>/order  → harga yang ditagih DIHITUNG DI SERVER dari data penawaran (angka dari browser diabaikan)

   Keamanan: kode acak 8 huruf (tanpa huruf mirip), batas percobaan kode salah per alamat (10 / menit),
   masa berlaku, batas pemakaian, status aktif / nonaktif.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data', 'private', 'quotes.json');
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // tanpa I, L, O, 0, 1
const FAIL = new Map();                          // alamat → [waktu gagal]
const LIMIT = 10, WINDOW = 60e3;

function load() {
  try { const d = JSON.parse(fs.readFileSync(FILE, 'utf8')); return Array.isArray(d.items) ? d : { app: 'XIONCO', kind: 'quotes', items: [] }; }
  catch (e) { return { app: 'XIONCO', kind: 'quotes', items: [] }; }
}
function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 2) + '\n', 'utf8'); fs.renameSync(tmp, FILE);
}
function newCode(db) {
  for (;;) {
    const b = crypto.randomBytes(8); let c = '';
    for (let i = 0; i < 8; i++) c += ABC[b[i] % ABC.length];
    if (!db.items.some((q) => q.code === c)) return c;
  }
}
function body(req) {
  return new Promise((ok) => {
    let s = '', n = 0;
    req.on('data', (c) => { n += c.length; if (n > 1024 * 1024) req.destroy(); else s += c; });
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { ok(null); } });
  });
}
const ip = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
function limited(req) {
  const k = ip(req), now = Date.now(), l = (FAIL.get(k) || []).filter((t) => now - t < WINDOW);
  FAIL.set(k, l); return l.length >= LIMIT;
}
function failed(req) { const k = ip(req); FAIL.set(k, (FAIL.get(k) || []).concat(Date.now())); }
// alasan penawaran tidak bisa dipakai (null = bisa)
function blocked(q) {
  if (q.status !== 'aktif') return [410, 'Penawaran ini sudah tidak aktif'];
  if (q.expires && Date.now() > q.expires) return [410, 'Penawaran ini sudah kedaluwarsa'];
  if (q.maxUse && (q.used || 0) >= q.maxUse) return [410, 'Penawaran ini sudah dipakai'];
  return null;
}
// yang boleh dilihat customer — tanpa catatan internal, data customer, statistik
function pub(q) {
  return { code: q.code, kind: q.kind, title: q.title, sub: q.sub || '', img: q.img || '', pid: q.pid || null, v: q.v, s: q.s, cfg: q.cfg || null,
    qty: q.qty || 1, normal: q.normal || 0, price: q.price, note: q.note || '', expires: q.expires || null };
}
const num = (v, d) => { v = Math.round(+v); return isFinite(v) && v >= 0 ? v : d; };

async function handle(req, res, p, send, isLocal) {
  // ---------- publik
  let m = p.match(/^\/api\/pub\/q\/([A-Za-z0-9]{4,16})(\/order)?$/);
  if (m) {
    if (limited(req)) return send(res, 429, { ok: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' });
    const code = m[1].toUpperCase(), db = load(), q = db.items.find((x) => x.code === code);
    if (!q) { failed(req); return send(res, 404, { ok: false, error: 'Kode penawaran tidak ditemukan' }); }
    const bad = blocked(q);
    if (bad) return send(res, bad[0], { ok: false, error: bad[1] });
    if (!m[2] && req.method === 'GET') {
      q.views = (q.views || 0) + 1; q.lastView = Date.now(); save(db);
      return send(res, 200, { ok: true, quote: pub(q) });
    }
    if (m[2] && req.method === 'POST') {
      await body(req);   // isi dari browser (mis. harga) sengaja diabaikan
      const qty = q.qty || 1, amount = q.price * qty, ref = 'QO-' + Date.now().toString(36).toUpperCase();
      q.used = (q.used || 0) + 1; q.orders = (q.orders || []).concat({ ref: ref, at: Date.now(), amount: amount }); save(db);
      return send(res, 200, { ok: true, code: q.code, unit: q.price, qty: qty, amount: amount, ref: ref });
    }
    return send(res, 405, { ok: false, error: 'Metode tidak didukung' });
  }
  // ---------- admin (Developer Settings)
  if (!isLocal(req)) return send(res, 403, { ok: false, error: 'Hanya dari localhost' });
  if (req.method !== 'GET' && req.headers['x-xionco'] !== '1') return send(res, 403, { ok: false, error: 'Header tidak valid' });
  if (p === '/api/quotes' && req.method === 'GET') return send(res, 200, { ok: true, items: load().items });
  if (p === '/api/quotes' && req.method === 'POST') {
    const d = await body(req); if (!d) return send(res, 400, { ok: false, error: 'JSON tidak valid' });
    const db = load(); let q = d.code ? db.items.find((x) => x.code === d.code) : null;
    const price = num(d.price, 0);
    if (!price) return send(res, 400, { ok: false, error: 'Isi harga khusus' });
    if (d.kind !== 'produk' && d.kind !== 'custom') return send(res, 400, { ok: false, error: 'Jenis penawaran tidak dikenal' });
    if (!q) { q = { code: newCode(db), created: Date.now(), views: 0, used: 0 }; db.items.unshift(q); }
    Object.assign(q, {
      kind: d.kind, title: String(d.title || '').slice(0, 120), sub: String(d.sub || '').slice(0, 200), img: String(d.img || '').slice(0, 2e6),
      pid: d.pid || null, v: d.v == null ? null : d.v, s: d.s == null ? null : d.s, cfg: d.cfg || null,
      qty: Math.max(1, num(d.qty, 1)), normal: num(d.normal, 0), price: price,
      maxUse: num(d.maxUse, 1), note: String(d.note || '').slice(0, 1000), internal: String(d.internal || '').slice(0, 1000),
      customer: { name: String((d.customer || {}).name || '').slice(0, 80), phone: String((d.customer || {}).phone || '').replace(/[^\d+]/g, '').slice(0, 20) },
      status: d.status === 'nonaktif' ? 'nonaktif' : 'aktif', updated: Date.now()
    });
    if (d.days != null) q.expires = num(d.days, 0) ? Date.now() + num(d.days, 7) * 864e5 : null;   // 0 = tanpa batas
    save(db); return send(res, 200, { ok: true, quote: q });
  }
  m = p.match(/^\/api\/quotes\/([A-Z0-9]+)$/);
  if (m && req.method === 'DELETE') { const db = load(); db.items = db.items.filter((x) => x.code !== m[1]); save(db); return send(res, 200, { ok: true }); }
  return send(res, 404, { ok: false, error: 'Tidak dikenal' });
}
module.exports = { handle: handle };
