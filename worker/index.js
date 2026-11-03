/* XIONCO — Worker situs (C111)
   Semua halaman & aset tetap file statis (env.ASSETS). Worker hanya dijalankan bila alamat tidak cocok dengan file,
   yaitu untuk API /api/prices yang dipakai /pricesubmit/: tim mengisi selisih harga (+/−, 0 = sama) dan catatan
   per kartu Customize. Disimpan di Cloudflare D1 (binding DB) — satu baris per simpan, riwayat tidak dihapus.

   GET  /api/prices?sub=kursi.sofa   → isian terakhir per kartu untuk jenis itu
   GET  /api/prices?all=1             → seluruh riwayat (untuk diringkas & diterapkan ke harga Customize)
   POST /api/prices  { sub, grp, opt, ctx, price, note, name, label, site }  → simpan satu kartu */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS price_submit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    sub TEXT NOT NULL, grp TEXT NOT NULL, opt TEXT NOT NULL, ctx TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT '', site INTEGER
  )`,
  'CREATE INDEX IF NOT EXISTS price_submit_key ON price_submit (sub, grp, opt, ctx)'
];
let ready = null;
const setup = (db) => (ready = ready || db.batch(SCHEMA.map((q) => db.prepare(q))).catch((e) => { ready = null; throw e; }));

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const ID = /^[A-Za-z0-9_.:-]{1,60}$/;
const str = (v, n) => String(v == null ? '' : v).slice(0, n);

async function prices(req, env, url) {
  if (!env.DB) return json({ ok: false, error: 'database belum terpasang' }, 503);
  await setup(env.DB);
  if (req.method === 'GET') {
    if (url.searchParams.get('all')) {
      const r = await env.DB.prepare('SELECT * FROM price_submit ORDER BY id LIMIT 20000').all();
      return json({ ok: true, rows: r.results });
    }
    const sub = url.searchParams.get('sub') || '';
    if (!ID.test(sub)) return json({ ok: false, error: 'sub' }, 400);
    const r = await env.DB.prepare('SELECT * FROM price_submit WHERE id IN (SELECT MAX(id) FROM price_submit WHERE sub = ?1 GROUP BY grp, opt, ctx)').bind(sub).all();
    return json({ ok: true, rows: r.results });
  }
  if (req.method === 'POST') {
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== url.host) return json({ ok: false, error: 'origin' }, 403);
    const text = await req.text();
    if (text.length > 8000) return json({ ok: false, error: 'besar' }, 413);
    let b; try { b = JSON.parse(text); } catch (e) { return json({ ok: false, error: 'json' }, 400); }
    const price = Number(b.price);
    if (![b.sub, b.grp, b.opt].every((v) => ID.test(String(v || ''))) || (b.ctx && !ID.test(String(b.ctx)))) return json({ ok: false, error: 'kunci' }, 400);
    if (!Number.isInteger(price) || Math.abs(price) > 1e10) return json({ ok: false, error: 'harga' }, 400);
    const site = Number.isFinite(Number(b.site)) && b.site !== null && b.site !== '' ? Math.round(Number(b.site)) : null;
    const r = await env.DB.prepare('INSERT INTO price_submit (sub, grp, opt, ctx, price, note, name, label, site) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) RETURNING *')
      .bind(b.sub, b.grp, b.opt, str(b.ctx, 60), price, str(b.note, 2000), str(b.name, 60), str(b.label, 200), site).first();
    return json({ ok: true, row: r });
  }
  return json({ ok: false, error: 'metode' }, 405);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/prices') {
      try { return await prices(req, env, url); } catch (e) { return json({ ok: false, error: 'server', detail: String(e && e.message || e).slice(0, 200) }, 500); }
    }
    return env.ASSETS.fetch(req);
  }
};
