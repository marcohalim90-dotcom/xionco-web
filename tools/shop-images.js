/* ==========================================================================
   Foto referensi produk dari xionco.shop (Developer Settings › Foto referensi)
   Pakai:  node tools/shop-images.js            → unduh semua foto yang belum ada
           node tools/shop-images.js --ulang    → unduh ulang semuanya
           node tools/shop-images.js <id> ...   → produk tertentu saja
   Sumber: data/source/xionco-shop-live.json (tools/fetch-shop.js) — per produk toko:
     galeri (main_img / imageurl), foto tiap varian (listvariant[].imageurl), dan gambar di deskripsi.
   Hasil (lokal saja, .gitignore): data/source/shop-img/<id produk>/NN-<jenis>.<ext> + thumbnail _t/*.webp (360 px)
     data/source/shop-img/_index.json  { fetched, items: { <id>: { name, type, shopId, status, images: [{ f, t, url, kind, label }] } } }
   <id produk> = id katalog (data/products.json, lewat shopId); produk toko tanpa padanan → "shop-<shopId>".
   ========================================================================== */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'source', 'shop-img');
const HOST = 'https://hig3141592653.my.id';
const PAR = 8;
let sharp = null; try { sharp = require(path.join(ROOT, 'tools', 'compress', 'node_modules', 'sharp')); } catch (e) {}

const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const abs = (u) => /^https?:\/\//.test(u) ? u : HOST + (u[0] === '/' ? '' : '/') + u;
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function plan(only) {
  const live = read(path.join(ROOT, 'data', 'source', 'xionco-shop-live.json'), { rows: {} }).rows;
  const items = read(path.join(ROOT, 'data', 'products.json'), { items: [] }).items;
  const byShop = {}; items.forEach((p) => { if (p.shopId != null) (byShop[p.shopId] = byShop[p.shopId] || []).push(p); });
  const out = {};
  Object.entries(live).forEach(([sid, q]) => {
    const ps = byShop[sid] || [{ id: 'shop-' + sid, name: q.namaproduk, type: '', status: 'toko' }];
    const seen = new Set(), list = [];
    const push = (u, kind, label) => { if (!u) return; const a = abs(String(u).trim()); const key = a.replace(/^https?:\/\/[^/]+/, ''); if (seen.has(key)) return; seen.add(key); list.push({ url: a, kind, label: label || '' }); };
    (Array.isArray(q.main_img) ? q.main_img : []).forEach((u) => push(u, 'galeri'));
    (Array.isArray(q.imageurl) ? q.imageurl : []).forEach((u) => push(u, 'galeri'));
    (q.listvariant || []).forEach((v) => push(v.imageurl, 'varian', v.variant || v.colorhig));
    (String(q.diskripsi || '').match(/(?:https?:\/\/[^"' )]+|\/assets\/[^"' )]+)\.(?:png|jpe?g|webp)/gi) || []).forEach((u) => push(u, 'deskripsi'));
    ps.forEach((p) => {
      if (only.length && only.indexOf(p.id) < 0) return;
      out[p.id] = { name: p.name || q.namaproduk, type: p.type || '', shopName: q.namaproduk, shopId: +sid, status: p.status || '', images: list.map((x, i) => {
        const ext = (x.url.match(/\.(png|jpe?g|webp)(?:\?|$)/i) || [, 'png'])[1].toLowerCase().replace('jpeg', 'jpg');
        const f = String(i + 1).padStart(2, '0') + '-' + x.kind + (x.label ? '-' + slug(x.label) : '') + '.' + ext;
        return Object.assign({}, x, { f, t: '_t/' + f.replace(/\.[a-z]+$/, '.webp') });
      }) };
    });
  });
  return out;
}
async function get(url, file) {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (XIONCO referensi)' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer()); if (b.length < 200) throw new Error('kosong');
      fs.writeFileSync(file, b); return b.length;
    } catch (e) { if (k === 2) throw e; await new Promise((ok) => setTimeout(ok, 800 * (k + 1))); }
  }
}
async function run(opts) {
  opts = opts || {};
  const items = plan(opts.only || []), jobs = [];
  Object.entries(items).forEach(([id, it]) => it.images.forEach((im) => jobs.push({ id, im })));
  const stat = { total: jobs.length, done: 0, new: 0, fail: 0, bytes: 0, errors: [] };
  const report = opts.progress || (() => {});
  let i = 0;
  async function worker() {
    while (i < jobs.length) {
      const { id, im } = jobs[i++], dir = path.join(OUT, id), file = path.join(dir, im.f), th = path.join(dir, im.t);
      fs.mkdirSync(path.join(dir, '_t'), { recursive: true });
      try {
        if (opts.again || !fs.existsSync(file) || fs.statSync(file).size < 200) { stat.bytes += await get(im.url, file); stat.new++; }
        if (sharp && (opts.again || !fs.existsSync(th))) await sharp(file).resize(360, 360, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(th);
        const m = sharp ? await sharp(file).metadata() : null; if (m) { im.w = m.width; im.h = m.height; }
        im.kb = Math.round(fs.statSync(file).size / 1024);
      } catch (e) { stat.fail++; im.err = String(e.message).slice(0, 80); stat.errors.push(id + '/' + im.f + ': ' + im.err); }
      stat.done++; report(stat);
    }
  }
  await Promise.all(Array.from({ length: PAR }, worker));
  const idxFile = path.join(OUT, '_index.json'), prev = read(idxFile, { items: {} });
  const idx = { note: 'Foto referensi xionco.shop per produk — tools/shop-images.js (lokal saja)', fetched: new Date().toISOString(), items: Object.assign({}, opts.only && opts.only.length ? prev.items : {}, items) };
  fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1) + '\n');
  return stat;
}
module.exports = { run, plan, OUT };
if (require.main === module) {
  const args = process.argv.slice(2), only = args.filter((a) => !a.startsWith('--'));
  let last = 0;
  run({ only, again: args.includes('--ulang'), progress: (s) => { if (s.done - last >= 50 || s.done === s.total) { last = s.done; console.log(s.done + '/' + s.total + ' · baru ' + s.new + ' · gagal ' + s.fail); } } })
    .then((s) => { console.log('selesai: ' + s.total + ' foto, ' + s.new + ' diunduh (' + (s.bytes / 1048576).toFixed(1) + ' MB), ' + s.fail + ' gagal'); s.errors.slice(0, 20).forEach((e) => console.log('  ' + e)); });
}
