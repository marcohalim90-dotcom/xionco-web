/* ==========================================================================
   XIONCO — aset material & tekstur untuk DIREVIEW sebelum dipakai (Developer Settings › Aset material)
   Sumber: Poly Haven (polyhaven.com) & ambientCG (ambientcg.com) — keduanya CC0 1.0 (domain publik).
   - Pindai: katalog + thumbnail saja (tidak mengunduh tekstur) → data/source/staging/index.json (lokal)
   - Acc: unduh peta 1K (warna, normal, roughness) → WebP 1024 di assets/library/textures/<set>/ + LICENSE.txt,
          dicatat di assets/library/textures/_approved.json (siap dipakai pilihan material situs)
   - Tolak: hanya ditandai, tidak pernah diunduh
   API (localhost + header X-XIONCO): GET /api/staging · POST /api/staging/scan · PUT /api/staging/item {id, status}
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STAGE = path.join(ROOT, 'data', 'source', 'staging');
const INDEX = path.join(STAGE, 'index.json');
const LIB = path.join(ROOT, 'assets', 'library', 'textures');
const APPROVED = path.join(LIB, '_approved.json');
const PY = path.join(__dirname, 'staging_tex.py');

// kelompok material (label di Developer Settings)
const ACG = { Fabric: 'kain', Carpet: 'kain', Leather: 'kulit', Wood: 'kayu', Planks: 'kayu', PaintedWood: 'kayu', Cork: 'kayu',
  WoodFloor: 'lantai', Tiles: 'lantai', Porcelain: 'lantai', Marble: 'batu', Granite: 'batu', Travertine: 'batu', Terrazzo: 'batu',
  Metal: 'logam', Concrete: 'tembok', Plaster: 'tembok', PaintedPlaster: 'tembok', Paint: 'tembok', Wallpaper: 'tembok', Bricks: 'tembok', Wicker: 'anyaman' };
const PH_SKIP = ['terrain', 'aerial', 'road', 'asphalt', 'snow', 'sand', 'gravel', 'cobblestone', 'bark', 'roofing', 'collection: moon', 'food'];
function phGroup(c) {
  const has = (k) => c.includes(k);
  if (PH_SKIP.some(has)) return null;
  if (['fabric', 'cotton', 'wool', 'fleece', 'denim', 'velvet', 'satin', 'crepe', 'jacquard', 'knitted', 'corduroy', 'carpet', 'hessian', 'stretchy', 'fur'].some(has)) return has('woven') && !has('fabric') ? 'anyaman' : 'kain';
  if (has('leather') || has('suede')) return 'kulit';
  if (has('metal')) return 'logam';
  if (has('tiles')) return 'lantai';
  if (has('wood') || has('raw wood')) return has('floor') ? 'lantai' : 'kayu';
  if (has('plaster-concrete') || has('plaster') || has('concrete') || has('brick') || has('wall')) return 'tembok';
  if (has('floor')) return 'lantai';
  if (has('rock') && (has('clean') || has('indoor'))) return 'batu';
  return null;
}
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
function writeJSON(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(o, null, 1) + '\n'); fs.renameSync(t, f); }
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function getJSON(u) {
  for (let i = 0; ; i++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': 'XIONCO-local/1.0' }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u); return await r.json(); }
    catch (e) { if (i >= 3) throw e; await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); }
  }
}
async function scan() {
  const old = readJSON(INDEX, { items: [] }), keep = {};
  old.items.forEach((x) => { keep[x.id] = x; });
  const items = [];
  // Poly Haven
  const ph = await getJSON('https://api.polyhaven.com/assets?t=textures');
  for (const id of Object.keys(ph)) {
    const a = ph[id], g = phGroup(a.categories || []); if (!g) continue;
    const dm = a.dimensions || [1000, 1000];
    items.push({ id: 'ph:' + id, src: 'Poly Haven', name: a.name, group: g, tags: (a.categories || []).concat(a.tags || []).slice(0, 12), thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/' + id + '.png?width=256&height=256',
      page: 'https://polyhaven.com/a/' + id, size: [+(dm[0] / 1000).toFixed(3), +(dm[1] / 1000).toFixed(3)], author: Object.keys(a.authors || {}).join(', '), date: (a.date_published || 0) * 1000 });
  }
  // ambientCG (per kategori, semua halaman)
  for (const cat of Object.keys(ACG)) {
    let url = 'https://ambientcg.com/api/v2/full_json?type=Material&category=' + cat + '&limit=100&include=previewData,displayData,dimensionsData,tagData';
    for (let guard = 0; url && guard < 10; guard++) {
      const j = await getJSON(url);
      (j.foundAssets || []).forEach((a) => {
        const pv = a.previewImage || {};
        items.push({ id: 'acg:' + a.assetId, src: 'ambientCG', name: a.displayName || a.assetId, group: ACG[cat], tags: (a.tags || []).slice(0, 12), thumb: pv['256-PNG'] || pv['128-PNG'] || '',
          page: 'https://ambientcg.com/view?id=' + a.assetId, size: [+((a.dimensionX || 100) / 100).toFixed(3), +((a.dimensionY || a.dimensionX || 100) / 100).toFixed(3)], author: 'ambientCG (Lennart Demes)', date: Date.parse(a.releaseDate) || 0 });
      });
      url = j.nextPageHttp || null;
    }
  }
  const seen = {}, out = [];
  items.forEach((x) => { if (seen[x.id]) return; seen[x.id] = 1; const k = keep[x.id]; if (k) { x.status = k.status; x.set = k.set; x.at = k.at; x.error = k.error; } else x.status = 'baru'; out.push(x); });
  out.sort((a, b) => (b.date || 0) - (a.date || 0));
  const idx = { scanned: Date.now(), items: out }; writeJSON(INDEX, idx); return idx;
}

/* ---------------------------------------------------------------- Acc: unduh + proses */
async function download(u, f) {
  let r, err;
  for (let i = 0; i < 4; i++) {
    try { r = await fetch(u, { headers: { 'User-Agent': 'XIONCO-local/1.0' }, signal: AbortSignal.timeout(90000) }); if (r.ok) break; err = new Error('Unduh gagal (' + r.status + ')'); } catch (e) { err = e; }
    r = null; await new Promise((ok) => setTimeout(ok, 1500 * (i + 1)));
  }
  if (!r) throw err;
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
}
function run(cmd, args) { return new Promise((ok, no) => execFile(cmd, args, { maxBuffer: 1 << 24 }, (e, so, se) => e ? no(new Error((se || e.message).slice(-300))) : ok(so))); }
async function approve(x) {
  const raw = path.join(STAGE, 'raw', x.id.replace(':', '-')); fs.mkdirSync(raw, { recursive: true });
  const maps = {}, urls = [];
  if (x.src === 'Poly Haven') {
    const id = x.id.slice(3), fl = await getJSON('https://api.polyhaven.com/files/' + id);
    const pick = (k) => fl[k] && fl[k]['1k'] && fl[k]['1k'].jpg && fl[k]['1k'].jpg.url;
    const want = { albedo: pick('Diffuse') || pick('diff'), normal: pick('nor_gl'), rough: pick('Rough') || pick('rough') };
    for (const k of Object.keys(want)) if (want[k]) { const f = path.join(raw, k + '.jpg'); await download(want[k], f); maps[k] = f; urls.push(want[k]); }
  } else {
    const id = x.id.slice(4), u = 'https://ambientcg.com/get?file=' + id + '_1K-JPG.zip', z = path.join(raw, id + '.zip');
    await download(u, z); urls.push(u);
    await run('python', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', z, raw]);   // tar Git Bash membaca C: sebagai host → pakai zipfile
    const files = fs.readdirSync(raw), find = (re) => { const n = files.find((f) => re.test(f)); return n ? path.join(raw, n) : null; };
    maps.albedo = find(/_Color\.jpg$/i); maps.normal = find(/_NormalGL\.jpg$/i); maps.rough = find(/_Roughness\.jpg$/i);
  }
  if (!maps.albedo) throw new Error('Peta warna tidak ditemukan');
  const set = 'x-' + x.group + '-' + slug(x.name).slice(0, 40), dir = path.join(LIB, set);
  const pyOut = await run('python', [PY, dir, maps.albedo || '', maps.normal || '', maps.rough || '']), hm = /HEX (#[0-9a-f]{6})/i.exec(pyOut);
  fs.writeFileSync(path.join(dir, 'LICENSE.txt'), [
    'Set      : ' + set, 'Asset    : ' + x.name + ' (' + x.id + ')', 'Author   : ' + (x.author || x.src), 'Source   : ' + x.page,
    'Download : ' + urls.join('\n           '), 'License  : CC0 1.0 Universal (public domain) - https://creativecommons.org/publicdomain/zero/1.0/',
    'Real size: ' + Math.round(x.size[0] * 1000) + ' x ' + Math.round(x.size[1] * 1000) + ' mm',
    'Processed: 1K JPG → WebP 1024 px (albedo warna asli, normal OpenGL, roughness). Disetujui di Developer Settings › Aset material.'].join('\n') + '\n');
  const ap = readJSON(APPROVED, { items: [] }); ap.items = ap.items.filter((a) => a.set !== set);
  ap.items.push({ set: set, name: x.name, group: x.group, src: x.src, size: x.size, maps: (maps.albedo ? 'a' : '') + (maps.normal ? 'n' : '') + (maps.rough ? 'r' : ''), hex: hm ? hm[1] : null, at: Date.now() });
  writeJSON(APPROVED, ap); publish();
  return set;
}
function unapprove(x) {
  if (!x.set) return;
  const dir = path.join(LIB, x.set); if (dir.startsWith(LIB) && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const ap = readJSON(APPROVED, { items: [] }); ap.items = ap.items.filter((a) => a.set !== x.set); writeJSON(APPROVED, ap); publish();
}

/* v5/js/texlib-extra.js — daftar tekstur yang di-Acc untuk situs (dibaca texlib.js & custom-spec.js saat halaman dimuat).
   Nama tampil dibuat dari jenis + warna (mis. "Travertine Krem 2"); harga memakai faktor per kelompok (bisa diubah di sini). */
const EXTRA_JS = path.join(ROOT, 'v5', 'js', 'texlib-extra.js');
const FACTOR = { kain: 1.1, kayu: 1.08, batu: 1.5, logam: 1.12, tembok: 1, lantai: 1 };
function colorName(hex) {
  if (!hex) return '';
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, sat = d < .001 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0; if (d > .001) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  if (l < .16) return 'Hitam'; if (sat < .12) return l > .78 ? 'Putih' : l > .55 ? 'Abu muda' : l > .32 ? 'Abu' : 'Arang';
  if (h < 15 || h >= 340) return l < .35 ? 'Marun' : 'Merah'; if (h < 40) return l > .62 ? 'Krem' : sat > .6 && l > .38 ? 'Oranye' : l < .35 ? 'Coklat tua' : 'Coklat';
  if (h < 65) return l > .62 ? 'Krem' : 'Mustard'; if (h < 160) return l < .3 ? 'Hijau tua' : 'Hijau'; if (h < 200) return 'Toska';
  if (h < 255) return l < .3 ? 'Navy' : 'Biru'; if (h < 300) return 'Ungu'; return 'Pink';
}
function publish() {
  const ap = readJSON(APPROVED, { items: [] }), seen = {};
  const NAMA = { 'Fabric': 'Kain', 'Metal': 'Logam', 'Wood': 'Kayu', 'Tiles': 'Keramik', 'Bricks': 'Bata', 'Brick': 'Bata', 'Carpet': 'Karpet', 'Granite': 'Granit',
    'White Stucco': 'Stucco', 'Brick Floor': 'Lantai bata', 'Blue Plaster Wall': 'Plester', 'Blue Plaster Weathered': 'Plester tua', 'Exterior Wall Cladding': 'Cladding',
    'Worn Concrete Floor': 'Beton tua', 'Rebar Reinforced Concrete': 'Beton', 'Patterned Brick Wall': 'Bata motif', 'Concrete Wall': 'Beton', 'Concrete': 'Beton',
    'Brushed Concrete': 'Beton sikat', 'Stone Tiles': 'Ubin batu', 'Dark Brick Wall': 'Bata gelap', 'Gravel Embedded Concrete': 'Beton kerikil', 'Square Pavers': 'Paving',
    'Gravel Floor': 'Kerikil', 'Gravel': 'Kerikil', 'Interior Tiles': 'Ubin', 'Plank Flooring': 'Papan', 'Old Linoleum Flooring': 'Linoleum', 'Pebble Embedded Concrete': 'Beton koral',
    'Coated Pine': 'Pinus', 'Grey Lati Veneer': 'Veneer Lati', 'Silver Oak Veneer': 'Veneer Oak', 'Smoke Speckled Veneer': 'Veneer Smoke', 'Ash Veneer': 'Veneer Ash',
    'Bi Stretch': 'Stretch', 'Caban': 'Wol caban', 'Cotton Jersey': 'Jersey katun', 'Crepe Georgette': 'Georgette', 'Crepe Satin': 'Satin', 'Denim Fabric': 'Denim' };
  const base = (n) => { const b = String(n).replace(/\b(\d+|[A-C])\b/g, '').replace(/\s+/g, ' ').trim(); return NAMA[b] || b; };
  const list = ap.items.map((a) => {
    let cn = colorName(a.hex); if (a.group === 'logam') cn = cn.replace(/^(Krem|Mustard)$/, 'Emas').replace(/^(Oranye|Coklat)$/, 'Tembaga');
    let l = (base(a.name) + ' ' + cn).trim(); seen[l] = (seen[l] || 0) + 1; return { a: a, l: l };
  }).map((o, i, all) => {
    const many = all.filter((x) => x.l === o.l).length > 1, n = all.slice(0, i + 1).filter((x) => x.l === o.l).length;
    const a = o.a; return { set: a.set, g: a.group, l: many ? o.l + ' ' + n : o.l, src: a.name, s: a.size && a.size[0] ? [a.size[0], a.size[1] || a.size[0]] : [1, 1], m: a.maps || 'anr', hex: a.hex || '#999999', f: FACTOR[a.group] || 1 };
  });
  fs.writeFileSync(EXTRA_JS, '/* dibuat otomatis oleh tools/staging.js dari assets/library/textures/_approved.json — jangan diubah manual */\nwindow.XTEX_EXTRA = ' + JSON.stringify(list) + ';\n');
  return list.length;
}
/* lengkapi hex & thumb untuk set lama yang belum punya, lalu terbitkan */
async function refreshExtra() {
  const ap = readJSON(APPROVED, { items: [] });
  for (const a of ap.items) {
    const dir = path.join(LIB, a.set);
    if (a.hex && fs.existsSync(path.join(dir, 'thumb.webp'))) continue;
    const o = await run('python', [PY, dir]); const m = /HEX (#[0-9a-f]{6})/i.exec(o); if (m) a.hex = m[1];
  }
  writeJSON(APPROVED, ap); return publish();
}
/* antrean Acc: satu aset diproses dalam satu waktu */
let queue = Promise.resolve();
function enqueue(x) {
  const job = queue.then(() => approve(x));
  queue = job.catch(() => {});
  return job;
}
function markDone(id, set, err) {
  const i2 = readJSON(INDEX, { items: [] }); const y = i2.items.find((i) => i.id === id); if (!y) return;
  if (err) { y.status = 'gagal'; y.error = err.message; } else { y.status = 'acc'; y.set = set; y.at = Date.now(); y.error = null; }
  writeJSON(INDEX, i2);
}
/* ulangi semua yang gagal (dipanggil dari tombol / node tools/staging.js --ulang) */
function retryFailed() {
  const idx = readJSON(INDEX, { items: [] }), bad = idx.items.filter((x) => x.status === 'gagal');
  bad.forEach((x) => { x.status = 'proses'; x.error = null; }); writeJSON(INDEX, idx);
  return Promise.all(bad.map((x) => enqueue(x).then((set) => markDone(x.id, set), (e) => markDone(x.id, null, e)))).then(() => bad.length);
}
let scanning = null;
function body(req) { return new Promise((ok) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { ok({}); } }); }); }
async function handle(req, res, p, send) {
  if (req.method !== 'GET' && req.headers['x-xionco'] !== '1') return send(res, 403, { ok: false, error: 'Header tidak valid' });
  try {
    if (p === '/api/staging' && req.method === 'GET') {
      let idx = readJSON(INDEX, null);
      if (!idx) { scanning = scanning || scan().finally(() => { scanning = null; }); idx = await scanning; }
      return send(res, 200, { ok: true, scanned: idx.scanned, items: idx.items });
    }
    if (p === '/api/staging/scan' && req.method === 'POST') { scanning = scanning || scan().finally(() => { scanning = null; }); const idx = await scanning; return send(res, 200, { ok: true, scanned: idx.scanned, n: idx.items.length }); }
    if (p === '/api/staging/item' && req.method === 'PUT') {
      const b = await body(req), idx = readJSON(INDEX, { items: [] }), x = idx.items.find((i) => i.id === b.id);
      if (!x) return send(res, 404, { ok: false, error: 'Aset tidak ditemukan' });
      if (!['baru', 'acc', 'tolak'].includes(b.status)) return send(res, 400, { ok: false, error: 'Status tidak dikenal' });
      if (b.status === 'acc' && x.status !== 'acc') {
        x.status = 'proses'; x.error = null; writeJSON(INDEX, idx);
        enqueue(x).then((set) => markDone(x.id, set), (e) => markDone(x.id, null, e));
        return send(res, 200, { ok: true, item: x });
      }
      if (b.status !== 'acc' && x.status === 'acc') unapprove(x);
      x.status = b.status; x.at = Date.now(); if (b.status !== 'acc') x.set = null; writeJSON(INDEX, idx);
      return send(res, 200, { ok: true, item: x });
    }
  } catch (e) { return send(res, 500, { ok: false, error: e.message }); }
  return send(res, 404, { ok: false, error: 'Tidak dikenal' });
}
module.exports = { handle: handle, retryFailed: retryFailed, publish: publish };
if (require.main === module && process.argv[2] === '--terbitkan') refreshExtra().then((n) => console.log('texlib-extra.js: ' + n + ' tekstur'));
if (require.main === module && process.argv[2] === '--ulang') retryFailed().then((n) => { const idx = readJSON(INDEX, { items: [] }); console.log(n + ' diulang → acc ' + idx.items.filter((x) => x.status === 'acc').length + ', gagal ' + idx.items.filter((x) => x.status === 'gagal').length); });
