/* ==========================================================================
   XIONCO — ekspor model untuk render foto Blender
   node export.js [jobs.json] [--force] [--only=id1,id2] [--chrome=C:/…/chrome.exe]

   • Menyalakan server statis kecil sendiri (folder repo) → tidak perlu tools/serve.js.
   • Membuka v5/index.html di Chrome tanpa layar (puppeteer-core), lalu untuk tiap job:
       cfg        → rancangan Customize dibangun dengan XC + XMAKER (sama persis dengan situs),
                    tekstur asli (assets/library/textures) ditunggu sampai termuat,
                    diekspor THREE.GLTFExporter (r147, CDN yang sama) sebagai GLB ber-skala meter
                    (lantai y = 0, tengah x/z = 0, depan menghadap +Z), tekstur tertanam.
       productId  → model GLB katalog (assets/items/<id>/model.glb) disalin apa adanya.
   • Hasil: output/glb/<id>.glb + <id>.json (ukuran, judul). Job yang GLB-nya sudah ada dilewati
     (lanjut dari yang terakhir) kecuali --force.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core belum terpasang. Jalankan: npm install  (di folder tools/render)'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'output', 'glb');
const argv = process.argv.slice(2);
const flag = f => argv.includes(f), opt = k => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const JOBS = path.resolve(argv.find(a => !a.startsWith('--')) || path.join(__dirname, 'jobs.json'));
const FORCE = flag('--force'), ONLY = opt('only') ? opt('only').split(',') : null;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.hdr': 'application/octet-stream', '.woff2': 'font/woff2' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); rsp.end(); return; }
      fs.stat(f, (err, st) => {
        if (err || !st.isFile()) { rsp.writeHead(404); rsp.end('not found'); return; }
        rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(f).pipe(rsp);
      });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
function findChrome() {
  const L = [opt('chrome'), process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  return L.find(f => fs.existsSync(f));
}

/* ---------------------------------------------------------------- dijalankan DI HALAMAN */
async function exportInPage(job) {
  const T = window.THREE, X = window.XC;
  if (!T.GLTFExporter) await new Promise((res, rej) => {
    const L = ['https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/exporters/GLTFExporter.js', 'https://unpkg.com/three@0.147.0/examples/js/exporters/GLTFExporter.js'];
    const go = i => { const s = document.createElement('script'); s.src = L[i]; s.onload = res; s.onerror = () => (i + 1 < L.length ? go(i + 1) : rej(new Error('GLTFExporter gagal dimuat'))); document.head.appendChild(s); };
    go(0);
  });
  if (window.XPARTS && XPARTS.loadPillow) await XPARTS.loadPillow();
  // konfigurasi: bawaan sub-kategori + nilai job (lewat XC.apply agar preset & aturan ikut), lalu dinormalkan
  let c = X.defaults(job.cfg.cat, job.cfg.sub);
  Object.keys(job.cfg).forEach(k => { if (k !== 'cat' && k !== 'sub') c = X.apply(c, k, job.cfg[k]) || c; });
  c = X.normalize(c);
  const kit = { T: T, rbox: (w, h, d, r, seg) => T.RoundedBoxGeometry ? new T.RoundedBoxGeometry(w, h, d, seg || 5, r) : new T.BoxGeometry(w, h, d), col: h => new T.Color(h).convertSRGBToLinear() };
  const b = XMAKER.build(c, kit);
  (b.motions || []).forEach(m => m.apply(job.open ? 1 : 0));   // pintu / laci: tertutup (atau terbuka bila job.open)
  // tunggu tekstur asli semua material
  const sets = new Set();
  b.group.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => { if (m && m.userData.tex) sets.add(m.userData.tex); }); });
  const miss = [];
  await Promise.all([...sets].map(s => XTEX.load(s).catch(() => miss.push(s))));
  await new Promise(r => setTimeout(r, 60));
  // pusatkan: tengah x/z = 0, lantai y = 0
  b.group.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(b.group), ctr = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
  const root = new T.Group(); root.name = job.id;
  b.group.position.set(-ctr.x, -box.min.y, -ctr.z); root.add(b.group);
  // InstancedMesh (paku hias, kancing) → mesh biasa: GLTFExporter r147 belum mengekspor instancing
  const inst = []; root.traverse(o => { if (o.isInstancedMesh) inst.push(o); });
  inst.forEach(im => {
    const g = new T.Group(), m4 = new T.Matrix4();
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m4); const m = new T.Mesh(im.geometry, im.material); m.applyMatrix4(m4); g.add(m); }
    g.position.copy(im.position); g.quaternion.copy(im.quaternion); g.scale.copy(im.scale); g.visible = im.visible;
    im.parent.add(g); im.parent.remove(im);
  });
  // material: roughness × faktor → tekstur metal-rough gabungan (G = roughness, B = 255), sekali per (peta, faktor);
  // albedo / normal asli ditulis JPEG; info yang tidak ada di glTF r147 (sheen kain) → extras untuk Blender
  const mrCache = new Map(), stash = [], mats = new Set();
  root.traverse(o => { stash.push([o, o.userData]); o.userData = {}; if (o.isMesh) { stash.push([o.geometry, o.geometry.userData]); o.geometry.userData = {}; [].concat(o.material).forEach(m => m && mats.add(m)); } });
  const mrTex = (rough, k) => {
    const key = rough.uuid + ':' + k.toFixed(3); if (mrCache.has(key)) return mrCache.get(key);
    const im = rough.image, cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { a[i + 1] = Math.min(255, a[i + 1] * k); a[i] = 0; a[i + 2] = 255; a[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    const t = rough.clone(); t.source = new T.Source(cv); t.userData = { mimeType: 'image/png' }; t.needsUpdate = true;
    mrCache.set(key, t); return t;
  };
  mats.forEach(m => {
    stash.push([m, m.userData]);
    const ex = { xtex: m.userData.tex || '' };
    if (m.sheen) { ex.sheen = +m.sheen.toFixed(3); ex.sheenRoughness = +m.sheenRoughness.toFixed(3); ex.sheenColor = '#' + m.sheenColor.getHexString(); }
    if (m.clearcoat) { ex.clearcoat = +m.clearcoat.toFixed(3); ex.clearcoatRoughness = +m.clearcoatRoughness.toFixed(3); }
    m.userData = ex;
    if (m.roughnessMap && !m.metalnessMap) { const k = Math.max(m.roughness, 0.0001); m.metalnessMap = m.roughnessMap = mrTex(m.roughnessMap, k); m.roughness = 1; }
    else if (m.roughness > 1) m.roughness = 1;
    ['map', 'normalMap'].forEach(k => { const t = m[k]; if (t && t.userData && t.userData.set) t.userData.mimeType = 'image/jpeg'; });
  });
  const glb = await new Promise((res, rej) => new T.GLTFExporter().parse(root, res, rej, { binary: true, onlyVisible: true, maxTextureSize: 2048 }));
  stash.forEach(([o, u]) => { o.userData = u; });
  b.dispose();
  const u8 = new Uint8Array(glb); let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), size: [size.x, size.y, size.z].map(v => +v.toFixed(3)), title: ((X.sub(c) || {}).l || c.sub) + (X.dimsText ? ' · ' + X.dimsText(c) : ''), sets: [...sets], missing: miss, cfg: c };
}

/* ---------------------------------------------------------------- utama */
(async () => {
  const spec = JSON.parse(fs.readFileSync(JOBS, 'utf8'));
  const jobs = (spec.jobs || spec).filter(j => !ONLY || ONLY.includes(j.id));
  fs.mkdirSync(OUT, { recursive: true });
  const todo = jobs.filter(j => FORCE || !fs.existsSync(path.join(OUT, j.id + '.glb')));
  console.log('[ekspor] ' + jobs.length + ' job, ' + (jobs.length - todo.length) + ' sudah ada (dilewati), ' + todo.length + ' dibuat');
  if (!todo.length) return;
  const exe = findChrome();
  if (!exe) { console.error('[ekspor] Chrome / Edge tidak ditemukan. Isi variabel CHROME atau --chrome=path'); process.exit(3); }
  const srv = await serve(), port = srv.address().port;
  const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--disable-gpu-vsync'] });
  let failed = 0;
  try {
    const p = await browser.newPage(); await p.setViewport({ width: 1280, height: 800 });
    p.on('pageerror', e => console.log('  [halaman] ' + e.message));
    await p.evaluateOnNewDocument(() => { try { sessionStorage.setItem('xc_intro', '1'); } catch (e) {} });
    await p.goto('http://127.0.0.1:' + port + '/v5/index.html#/', { waitUntil: 'load', timeout: 90000 });
    await p.waitForFunction(() => window.THREE && window.XC && window.XMAKER && window.XTEX && window.XV, { timeout: 90000 });
    await new Promise(r => setTimeout(r, 1500));   // katalog (XVDB)     XV_PRODUCTS: await new Promise(r => setTimeout(r, 1500)); tekstur awal
    for (let i = 0; i < todo.length; i++) {
      const j = todo[i], t0 = Date.now(), dst = path.join(OUT, j.id + '.glb');
      process.stdout.write('[ekspor ' + (i + 1) + '/' + todo.length + '] ' + j.id + ' ... ');
      try {
        if (j.productId) {
          const pr = await p.evaluate(id => { const x = (window.XV.PRODUCTS || []).filter(q => q.id === id)[0]; return x ? { model: x.model || '', name: x.name, type: x.type } : null; }, j.productId);
          if (!pr) throw new Error('produk "' + j.productId + '" tidak ada di katalog');
          if (!pr.model) throw new Error('produk "' + j.productId + '" belum punya model 3D (assets/items/' + j.productId + '/model.glb)');
          // model bermodul channel (tools/glb/tile.py, *-tiles.glb) → render memakai model utuh aslinya bila ada
          let srcModel = pr.model; const whole = pr.model.replace(/-tiles.glb$/, '.glb');
          if (whole !== pr.model && fs.existsSync(path.join(ROOT, whole))) srcModel = whole;
          fs.copyFileSync(path.join(ROOT, srcModel), dst);
          fs.writeFileSync(path.join(OUT, j.id + '.json'), JSON.stringify({ id: j.id, productId: j.productId, title: pr.name + ' — ' + pr.type, source: srcModel }, null, 1));
        } else if (j.cfg && j.cfg.cat) {
          const r = await p.evaluate(exportInPage, j);
          fs.writeFileSync(dst, Buffer.from(r.b64, 'base64'));
          fs.writeFileSync(path.join(OUT, j.id + '.json'), JSON.stringify({ id: j.id, title: r.title, size_m: r.size, textures: r.sets, missing: r.missing, cfg: r.cfg }, null, 1));
          if (r.missing.length) process.stdout.write('(tekstur gagal: ' + r.missing.join(', ') + ') ');
        } else throw new Error('job perlu "cfg" (dengan cat & sub) atau "productId"');
        console.log('OK ' + (fs.statSync(dst).size / 1048576).toFixed(1) + ' MB, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
      } catch (e) { failed++; console.log('GAGAL: ' + e.message); }
    }
  } finally { await browser.close(); srv.close(); }
  if (failed) { console.log('[ekspor] ' + failed + ' job gagal'); process.exitCode = 1; }
})().catch(e => { console.error('[ekspor] ' + (e && e.stack || e)); process.exit(1); });
