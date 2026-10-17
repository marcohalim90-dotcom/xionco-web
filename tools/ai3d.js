/* ==========================================================================
   XIONCO — 3D AI (Tripo lewat fal.ai) untuk Developer Settings › 3D katalog
   Dipakai oleh tools/serve.js (hanya localhost). Alur per produk:
     foto (xionco.shop / upload) → fal.ai queue → unduh GLB → Blender (tools/glb/ai-finish.py)
     → assets/items/<id>/model-ai.glb
   Key fal.ai disimpan di data/private/ai3d.json (TIDAK ikut online) dan tidak pernah dikirim balik ke browser.
   Foto upload, GLB mentah & status pekerjaan: data/source/ai3d/ (lokal saja, .gitignore).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONF = path.join(ROOT, 'data', 'private', 'ai3d.json');
const WORK = path.join(ROOT, 'data', 'source', 'ai3d');
const JOBS = path.join(WORK, '_jobs.json');
const BLENDER = process.env.BLENDER || 'C:/Users/Marco/AppData/Local/Programs/Blender/blender-5.2.2-windows-x64/blender.exe';
const PARALLEL = 3;          // permintaan fal.ai bersamaan
const POLL_MS = 4000;
const FACES = 60000;    // cukup halus untuk web, ringan di HP (dibatasi lagi per model: faces)

/* model yang bisa dipilih (endpoint fal.ai). multi = endpoint multiview (2–4 foto) */
const MODELS = {
  'h3.1': { l: 'Tripo H3.1', d: 'Paling detail (terbaru). Multiview bila ≥ 2 foto.', image: 'tripo3d/h3.1/image-to-3d', multi: 'tripo3d/h3.1/multiview-to-3d', geo: true,
            cost: (o) => (o.texture === 'detailed' ? .4 : .3) + (o.geometry === 'detailed' ? .2 : 0) },
  'p2': { l: 'Tripo P2', d: 'Topologi rapi, PBR. 1 foto. Mahal.', image: 'tripo3d/p2/image-to-3d', faces: 50000, cost: (o) => o.texture === 'detailed' ? 1.2 : 1.1 },
  'p1': { l: 'Tripo P1', d: 'Cepat, mesh siap pakai. 1 foto.', image: 'tripo3d/p1/image-to-3d', faces: 20000, cost: () => .5 },
  'v2.5': { l: 'Tripo v2.5', d: 'Versi lama, murah. Multiview bila ≥ 2 foto.', image: 'tripo3d/tripo/v2.5/image-to-3d', multi: 'tripo3d/tripo/v2.5/multiview-to-3d',
            cost: (o) => o.texture === 'detailed' ? .4 : .3 }
};
const DEF = { model: 'h3.1', texture: 'standard', geometry: 'standard' };

/* ---------------------------------------------------------------- simpan */
function readJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function writeJSON(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(o, null, 2) + '\n'); fs.renameSync(t, f); }
const conf = () => Object.assign({}, DEF, readJSON(CONF, {}));
const db = readJSON(JOBS, { jobs: {}, sel: {} });
db.jobs = db.jobs || {}; db.sel = db.sel || {}; db.done = db.done || {};   // done: centang manual "sudah selesai"
let saveT = 0;
function saveDb() { clearTimeout(saveT); saveT = setTimeout(() => writeJSON(JOBS, JSON.parse(JSON.stringify(db, (k, v) => k[0] === '_' ? undefined : v))), 150); }
const safeId = (id) => /^[a-z0-9][a-z0-9-]{0,80}$/.test(id) ? id : null;
function scrub(msg) { const k = conf().key; msg = String(msg || '').slice(0, 400); return k ? msg.split(k).join('•••') : msg; }

/* ---------------------------------------------------------------- foto → input fal.ai */
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
function imageInput(u) {
  if (/^https?:\/\//.test(u)) return u;                                   // foto xionco.shop: fal.ai mengambil langsung
  const f = path.resolve(ROOT, u.replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || f.includes(path.join('data', 'private'))) throw new Error('Foto tidak diizinkan');
  const buf = fs.readFileSync(f);
  return 'data:' + (MIME[path.extname(f).toLowerCase()] || 'image/png') + ';base64,' + buf.toString('base64');
}
function buildInput(o, views) {
  const M = MODELS[o.model] || MODELS[DEF.model];
  // multiview butuh urutan tetap [depan, kiri, belakang, kanan] → pakai foto berurutan dari depan sampai slot kosong pertama
  const seq = []; for (const v of views) { if (!v) break; seq.push(v); }
  const useMulti = M.multi && seq.length >= 2;
  const tex = o.texture === 'detailed', FACE_LIMIT = Math.min(FACES, M.faces || FACES);
  let input;
  if (o.model === 'h3.1') {
    input = { texture: true, pbr: true, texture_quality: tex ? 'detailed' : 'standard', geometry_quality: o.geometry === 'detailed' ? 'detailed' : 'standard', auto_size: true, face_limit: FACE_LIMIT };
    if (useMulti) input.image_urls = seq.map(imageInput); else input.image_url = imageInput(views[0]);
  } else if (o.model === 'p2') {
    input = { image_url: imageInput(views[0]), texture: true, pbr: true, texture_quality: tex ? 'detailed' : 'standard', auto_size: true, face_limit: FACE_LIMIT };
  } else if (o.model === 'p1') {
    input = { image_url: imageInput(views[0]), texture: true, face_limit: FACE_LIMIT };
  } else {
    input = { texture: tex ? 'HD' : 'standard', pbr: true, auto_size: true, face_limit: FACE_LIMIT };
    if (useMulti) ['front', 'left', 'back', 'right'].forEach((k, i) => { if (seq[i]) input[k + '_image_url'] = imageInput(seq[i]); });
    else input.image_url = imageInput(views[0]);
  }
  return { endpoint: useMulti ? M.multi : M.image, input, multi: useMulti, nviews: useMulti ? seq.length : 1, cost: +M.cost(o).toFixed(2) };
}

/* ---------------------------------------------------------------- fal.ai queue */
async function fal(url, opt) {
  const key = conf().key; if (!key) throw new Error('Key fal.ai belum diisi (Pengaturan)');
  const r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Key ' + key, 'Content-Type': 'application/json' }, (opt || {}).headers) }));
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
  if (!r.ok) {
    let d = j && (j.detail || j.error || j.message);
    if (Array.isArray(d)) d = d.map((x) => (x.loc ? x.loc[x.loc.length - 1] + ': ' : '') + x.msg).join('; ');   // 422 validasi → kalimat singkat
    const why = { 401: 'key ditolak', 403: 'key tidak punya akses / saldo habis', 422: 'input ditolak', 429: 'terlalu banyak permintaan' }[r.status];
    throw new Error('fal.ai ' + r.status + (why ? ' (' + why + ')' : '') + ': ' + (typeof d === 'string' ? d : JSON.stringify(d || txt)));
  }
  return j;
}
async function download(url, file) {
  const r = await fetch(url); if (!r.ok) throw new Error('Unduh gagal ' + r.status);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
function blender(args) {
  return new Promise((res, rej) => {
    if (!fs.existsSync(BLENDER)) return rej(new Error('Blender tidak ditemukan (atur env BLENDER)'));
    const p = spawn(BLENDER, ['-b', '--factory-startup', '--python', path.join(ROOT, 'tools', 'glb', 'ai-finish.py'), '--'].concat(args), { windowsHide: true });
    let out = ''; p.stdout.on('data', (d) => out += d); p.stderr.on('data', (d) => out += d);
    p.on('close', (code) => { const m = out.match(/^AIFIN (.+)$/m); if (code === 0 && m) res(JSON.parse(m[1])); else rej(new Error('Blender: ' + (out.match(/Error.*$/m) || ['gagal (' + code + ')'])[0])); });
  });
}

/* ---------------------------------------------------------------- ukuran target
   Ukuran produk (dims) dibaca saat merapikan → isi ukuran di Katalog lalu "Rapikan ulang" tanpa kredit baru.
   Tanpa ukuran: model ber-auto_size (H3.1/P2/v2.5) memakai ukuran Tripo; P1 (tanpa skala) memakai perkiraan lebar per jenis. */
function guessCm(p) {
  const t = String(p.type || '').toLowerCase() + ' ' + String(p.name || '').toLowerCase();
  if (p.cat === 'seats') return /stool/.test(t) ? 45 : /ottoman|pouf/.test(t) ? 80 : /bench/.test(t) ? 150 : /sectional|l-shape|corner|modular/.test(t) ? 290 : /armchair|lounge/.test(t) ? 90 : /chair/.test(t) ? 55 : 210;
  if (p.cat === 'tables') return /dining/.test(t) ? 160 : /desk|workstation/.test(t) ? 140 : /side|bedside/.test(t) ? 50 : /nesting/.test(t) ? 90 : /console/.test(t) ? 120 : 105;
  if (p.cat === 'bedframe') return 190;
  if (p.cat === 'cabinet') return /wardrobe/.test(t) ? 150 : /nightstand|bedside/.test(t) ? 50 : /tv|media/.test(t) ? 180 : 90;
  if (p.cat === 'lighting') return /floor|standing/.test(t) ? 45 : /track/.test(t) ? 70 : 40;
  return 45;
}
function target(job) {
  const p = ((readJSON(path.join(ROOT, 'data', 'products.json'), {}).items) || []).find((x) => x.id === job.id) || {};
  const t = String(p.type || '').toLowerCase();
  // furnitur memanjang: sisi terpanjang harus lebar (X), bukan ke belakang
  const wide = (['seats', 'tables', 'bedframe', 'cabinet'].includes(p.cat) && !/stool|chair|ottoman|pouf|side|nightstand/.test(t)) ? 'wide' : '';
  return [p.dims || (job.model === 'p1' ? String(guessCm(p)) : ''), job.model === 'p1' ? 'turn-90' : wide];   // P1: depan selalu ke +X (dicek CAPRA & LOPHUS)
}
/* kompres model situs bila alatnya terpasang (cd tools/compress && npm install); gagal → file tetap dipakai apa adanya */
function compressGlb(file) {
  const tool = path.join(ROOT, 'tools/compress/compress.js');
  if (!fs.existsSync(path.join(ROOT, 'tools/compress/node_modules'))) return Promise.resolve();
  return new Promise((ok) => require('child_process').execFile(process.execPath, [tool, file], { cwd: ROOT, timeout: 180000 }, () => ok()));
}
async function finish(job) {
  const rel = 'assets/items/' + job.id + '/model-ai.glb';
  const info = await blender([path.join(ROOT, job.raw), path.join(ROOT, rel)].concat(target(job)));
  await compressGlb(path.join(ROOT, rel));   // Draco + WebP (tools/compress) agar ringan di situs
  set(job, { status: 'selesai', file: rel, info, done: Date.now(), error: null });
}

/* ---------------------------------------------------------------- pekerjaan */
const ACTIVE = ['tunggu', 'kirim', 'antri', 'proses', 'unduh', 'rapikan'];
function set(job, patch) { Object.assign(job, patch, { at: Date.now() }); saveDb(); }
async function run(job) {
  try {
    if (!job.request_id) {
      set(job, { status: 'kirim' });
      const o = conf(), b = buildInput(o, job.views);
      Object.assign(job, { endpoint: b.endpoint, multi: b.multi, nviews: b.nviews, cost: b.cost, model: o.model });
      const q = await fal('https://queue.fal.run/' + b.endpoint, { method: 'POST', body: JSON.stringify(b.input) });
      set(job, { status: 'antri', request_id: q.request_id, status_url: q.status_url, response_url: q.response_url, queue: q.queue_position });
    }
    for (;;) {
      const s = await fal(job.status_url, { method: 'GET' });
      if (s.status === 'COMPLETED') break;
      set(job, { status: s.status === 'IN_PROGRESS' ? 'proses' : 'antri', queue: s.queue_position });
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    set(job, { status: 'unduh' });
    const out = await fal(job.response_url, { method: 'GET' });
    const mesh = out.model_mesh || (out.model_urls && (out.model_urls.pbr_model || out.model_urls.base_model));
    if (!mesh || !mesh.url) throw new Error('Hasil tanpa model');
    const dir = path.join(WORK, job.id), stamp = Date.now().toString(36);
    const raw = path.join(dir, 'raw-' + stamp + '.glb');
    await download(mesh.url, raw);
    if (out.rendered_image && out.rendered_image.url) { try { await download(out.rendered_image.url, path.join(dir, 'preview.webp')); job.preview = 'data/source/ai3d/' + job.id + '/preview.webp'; } catch (e) {} }
    set(job, { status: 'rapikan', raw: path.relative(ROOT, raw).split(path.sep).join('/') });
    await finish(job);
  } catch (e) {
    set(job, { status: 'gagal', error: scrub(e.message) });
  }
  pump();
}
function pump() {
  const busy = Object.values(db.jobs).filter((j) => ['kirim', 'antri', 'proses', 'unduh', 'rapikan'].includes(j.status) && j._live).length;
  const wait = Object.values(db.jobs).filter((j) => j.status === 'tunggu').sort((a, b) => a.started - b.started);
  for (let i = 0; i < Math.min(PARALLEL - busy, wait.length); i++) { wait[i]._live = true; run(wait[i]); }
}
// server dimulai ulang: lanjutkan yang sudah di antrean fal.ai, yang lain diulang
Object.values(db.jobs).forEach((j) => {
  if (!ACTIVE.includes(j.status)) return;
  if (j.response_url) { j._live = true; run(j); }
  else { delete j.request_id; j.status = 'tunggu'; }
});
pump();

/* ---------------------------------------------------------------- HTTP */
function body(req, max) {
  return new Promise((res, rej) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > max) { rej(new Error('Terlalu besar')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => res(Buffer.concat(chunks))); req.on('error', rej);
  });
}
function pub(j) { const o = {}; for (const k in j) if (k[0] !== '_' && k !== 'status_url' && k !== 'response_url') o[k] = j[k]; return o; }
function uploads(id) {
  const d = path.join(WORK, id); if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => /^up-.*\.(png|jpe?g|webp)$/i.test(f)).sort().map((f) => 'data/source/ai3d/' + id + '/' + f);
}

async function handle(req, res, p, send) {
  try {
    if (p === '/api/ai3d/config' && req.method === 'GET') {
      const c = conf(), models = {};
      for (const k in MODELS) models[k] = { l: MODELS[k].l, d: MODELS[k].d, multi: !!MODELS[k].multi, geo: !!MODELS[k].geo,
        cost: { standard: MODELS[k].cost({ texture: 'standard', geometry: 'standard' }), detailed: MODELS[k].cost({ texture: 'detailed', geometry: 'standard' }), geo: MODELS[k].geo ? .2 : 0 } };
      return send(res, 200, { ok: true, hasKey: !!c.key, keyTail: c.key ? c.key.slice(-4) : '', model: c.model, texture: c.texture, geometry: c.geometry, models, blender: fs.existsSync(BLENDER) });
    }
    if (p === '/api/ai3d/config' && req.method === 'PUT') {
      const b = JSON.parse((await body(req, 1e5)).toString() || '{}'), c = readJSON(CONF, {});
      if (typeof b.key === 'string' && b.key.trim()) c.key = b.key.trim();
      if (b.clearKey) delete c.key;
      if (b.model && MODELS[b.model]) c.model = b.model;
      if (b.texture === 'standard' || b.texture === 'detailed') c.texture = b.texture;
      if (b.geometry === 'standard' || b.geometry === 'detailed') c.geometry = b.geometry;
      writeJSON(CONF, c);
      return send(res, 200, { ok: true, hasKey: !!c.key });
    }
    if (p === '/api/ai3d/test' && req.method === 'POST') {
      // cek key: status permintaan palsu → 401/403 = key salah, 404/422 = key diterima
      const key = conf().key; if (!key) return send(res, 200, { ok: false, error: 'Key belum diisi' });
      const r = await fetch('https://queue.fal.run/tripo3d/h3.1/image-to-3d/requests/00000000-0000-0000-0000-000000000000/status', { headers: { Authorization: 'Key ' + key } });
      return send(res, 200, { ok: r.status !== 401 && r.status !== 403, code: r.status });
    }
    if (p === '/api/ai3d/jobs' && req.method === 'GET') {
      const jobs = {}, up = {};
      for (const id in db.jobs) jobs[id] = pub(db.jobs[id]);
      if (fs.existsSync(WORK)) fs.readdirSync(WORK).forEach((id) => { if (safeId(id)) { const u = uploads(id); if (u.length) up[id] = u; } });
      return send(res, 200, { ok: true, jobs, sel: db.sel, uploads: up, done: db.done });
    }
    let m;
    if ((m = p.match(/^\/api\/ai3d\/sel\/([^/]+)$/)) && req.method === 'PUT') {
      const id = safeId(m[1]); if (!id) return send(res, 400, { ok: false, error: 'ID tidak valid' });
      const b = JSON.parse((await body(req, 1e5)).toString() || '{}');
      db.sel[id] = (Array.isArray(b.views) ? b.views : []).slice(0, 4).map((v) => typeof v === 'string' && v ? v : null);
      saveDb(); return send(res, 200, { ok: true });
    }
    if ((m = p.match(/^\/api\/ai3d\/done\/([^/]+)$/)) && req.method === 'PUT') {   // centang / lepas Done manual
      const id = safeId(m[1]); if (!id) return send(res, 400, { ok: false, error: 'ID tidak valid' });
      const b = JSON.parse((await body(req, 1e4)).toString() || '{}');
      if (b.on) db.done[id] = Date.now(); else delete db.done[id];
      saveDb(); return send(res, 200, { ok: true, done: db.done });
    }
    if ((m = p.match(/^\/api\/ai3d\/upload\/([^/]+)$/)) && req.method === 'POST') {
      const id = safeId(m[1]); if (!id) return send(res, 400, { ok: false, error: 'ID tidak valid' });
      const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[String(req.headers['content-type']).split(';')[0]];
      if (!ext) return send(res, 400, { ok: false, error: 'Hanya PNG, JPG atau WEBP' });
      const buf = await body(req, 20 * 1024 * 1024), f = path.join(WORK, id, 'up-' + Date.now().toString(36) + ext);
      fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf);
      return send(res, 200, { ok: true, url: 'data/source/ai3d/' + id + '/' + path.basename(f) });
    }
    if ((m = p.match(/^\/api\/ai3d\/upload\/([^/]+)\/(up-[a-z0-9]+\.(?:png|jpg|webp))$/)) && req.method === 'DELETE') {
      const id = safeId(m[1]); if (!id) return send(res, 400, { ok: false });
      const f = path.join(WORK, id, m[2]); if (fs.existsSync(f)) fs.unlinkSync(f);
      return send(res, 200, { ok: true });
    }
    if ((m = p.match(/^\/api\/ai3d\/run\/([^/]+)$/)) && req.method === 'POST') {
      const id = safeId(m[1]); if (!id) return send(res, 400, { ok: false, error: 'ID tidak valid' });
      if (!conf().key) return send(res, 400, { ok: false, error: 'Isi key fal.ai di Pengaturan dulu' });
      const cur = db.jobs[id]; if (cur && ACTIVE.includes(cur.status)) return send(res, 409, { ok: false, error: 'Masih berjalan' });
      const b = JSON.parse((await body(req, 1e5)).toString() || '{}');
      const views = (Array.isArray(b.views) ? b.views : []).slice(0, 4).map((v) => typeof v === 'string' && v ? v : null);
      if (!views[0]) return send(res, 400, { ok: false, error: 'Foto depan wajib' });
      const prev = cur && cur.status === 'selesai' ? { file: cur.file, done: cur.done } : cur && cur.last;
      db.jobs[id] = { id, status: 'tunggu', views, dims: String(b.dims || ''), started: Date.now(), at: Date.now(), last: prev || null, runs: ((cur && cur.runs) || 0) + 1 };
      saveDb(); pump();
      return send(res, 200, { ok: true, job: pub(db.jobs[id]) });
    }
    if ((m = p.match(/^\/api\/ai3d\/refinish\/([^/]+)$/)) && req.method === 'POST') {   // rapikan ulang dari GLB mentah (ukuran/arah) — tanpa kredit
      const j = db.jobs[safeId(m[1]) || '']; if (!j || !j.raw || ACTIVE.includes(j.status)) return send(res, 400, { ok: false, error: 'Tidak bisa dirapikan ulang' });
      set(j, { status: 'rapikan' });
      try { await finish(j); } catch (e) { set(j, { status: 'selesai', error: null }); return send(res, 500, { ok: false, error: scrub(e.message) }); }
      return send(res, 200, { ok: true, job: pub(j) });
    }
    if ((m = p.match(/^\/api\/ai3d\/cancel\/([^/]+)$/)) && req.method === 'POST') {
      const j = db.jobs[safeId(m[1]) || '']; if (!j) return send(res, 404, { ok: false });
      if (j.status === 'tunggu') { j.status = 'batal'; saveDb(); }
      else if (j.request_id && ['antri'].includes(j.status)) { try { await fal(j.status_url.replace(/\/status$/, '/cancel'), { method: 'PUT' }); } catch (e) {} }
      return send(res, 200, { ok: true });
    }
    send(res, 404, { ok: false, error: 'Tidak dikenal' });
  } catch (e) { send(res, 500, { ok: false, error: scrub(e.message) }); }
}
module.exports = { handle };
