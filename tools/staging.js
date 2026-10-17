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

async function getJSON(u) { const r = await fetch(u, { headers: { 'User-Agent': 'XIONCO-local/1.0' } }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u); return r.json(); }
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
  const r = await fetch(u, { headers: { 'User-Agent': 'XIONCO-local/1.0' } }); if (!r.ok) throw new Error('Unduh gagal (' + r.status + ')');
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
    await run('tar', ['-xf', z, '-C', raw]);   // Windows 10+ & Git Bash: tar membuka .zip
    const files = fs.readdirSync(raw), find = (re) => { const n = files.find((f) => re.test(f)); return n ? path.join(raw, n) : null; };
    maps.albedo = find(/_Color\.jpg$/i); maps.normal = find(/_NormalGL\.jpg$/i); maps.rough = find(/_Roughness\.jpg$/i);
  }
  if (!maps.albedo) throw new Error('Peta warna tidak ditemukan');
  const set = 'x-' + x.group + '-' + slug(x.name).slice(0, 40), dir = path.join(LIB, set);
  await run('python', [PY, dir, maps.albedo || '', maps.normal || '', maps.rough || '']);
  fs.writeFileSync(path.join(dir, 'LICENSE.txt'), [
    'Set      : ' + set, 'Asset    : ' + x.name + ' (' + x.id + ')', 'Author   : ' + (x.author || x.src), 'Source   : ' + x.page,
    'Download : ' + urls.join('\n           '), 'License  : CC0 1.0 Universal (public domain) - https://creativecommons.org/publicdomain/zero/1.0/',
    'Real size: ' + Math.round(x.size[0] * 1000) + ' x ' + Math.round(x.size[1] * 1000) + ' mm',
    'Processed: 1K JPG → WebP 1024 px (albedo warna asli, normal OpenGL, roughness). Disetujui di Developer Settings › Aset material.'].join('\n') + '\n');
  const ap = readJSON(APPROVED, { items: [] }); ap.items = ap.items.filter((a) => a.set !== set);
  ap.items.push({ set: set, name: x.name, group: x.group, src: x.src, size: x.size, maps: (maps.albedo ? 'a' : '') + (maps.normal ? 'n' : '') + (maps.rough ? 'r' : ''), at: Date.now() });
  writeJSON(APPROVED, ap);
  return set;
}
function unapprove(x) {
  if (!x.set) return;
  const dir = path.join(LIB, x.set); if (dir.startsWith(LIB) && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const ap = readJSON(APPROVED, { items: [] }); ap.items = ap.items.filter((a) => a.set !== x.set); writeJSON(APPROVED, ap);
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
        approve(x).then((set) => { const i2 = readJSON(INDEX, idx); const y = i2.items.find((i) => i.id === x.id); y.status = 'acc'; y.set = set; y.at = Date.now(); writeJSON(INDEX, i2); })
          .catch((e) => { const i2 = readJSON(INDEX, idx); const y = i2.items.find((i) => i.id === x.id); y.status = 'gagal'; y.error = e.message; writeJSON(INDEX, i2); });
        return send(res, 200, { ok: true, item: x });
      }
      if (b.status !== 'acc' && x.status === 'acc') unapprove(x);
      x.status = b.status; x.at = Date.now(); if (b.status !== 'acc') x.set = null; writeJSON(INDEX, idx);
      return send(res, 200, { ok: true, item: x });
    }
  } catch (e) { return send(res, 500, { ok: false, error: e.message }); }
  return send(res, 404, { ok: false, error: 'Tidak dikenal' });
}
module.exports = { handle: handle };
