/* Audit model 3D katalog: tangkap layar panggung situs (Chrome tanpa layar) untuk tiap produk, 2 sudut (depan & serong),
   lalu susun lembar banding dengan foto toko (data/source/shop-img). Memakai puppeteer-core dari tools/render & sharp dari tools/compress.
   node tools/glb/audit-shots.js [--only=id1,id2] [--ai] [--out=<folder>] [--url=http://localhost:5173/v5/] [--sheet-only]
     --ai      : hanya produk bermodel AI (model-ai.glb) — bawaan bila --only kosong
     --all     : semua produk bermodel 3D
   Hasil: <out>/shots/<id>-a.jpg (depan), <id>-b.jpg (serong), <out>/sheet-NN.jpg (6 produk per lembar: foto 1 · foto 2 · depan · serong) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const puppeteer = require(path.join(ROOT, 'tools/render/node_modules/puppeteer-core'));
const sharp = require(path.join(ROOT, 'tools/compress/node_modules/sharp'));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = (k) => process.argv.includes('--' + k);
const URL0 = arg('url', 'http://localhost:5173/v5/');
const OUT = path.resolve(arg('out', path.join(ROOT, 'data/source/audit')));
const ONLY = arg('only', '') ? arg('only').split(',') : null;
const P = require(path.join(ROOT, 'data/products.json')).items;
const SHOP = require(path.join(ROOT, 'data/source/shop-img/_index.json')).items;
const list = P.filter((p) => p.model && p.status === 'aktif' && (ONLY ? ONLY.includes(p.id) : has('all') ? true : /model-ai\.glb$/.test(p.model)));
const skipped = P.filter((p) => p.model && p.status !== 'aktif' && (ONLY ? ONLY.includes(p.id) : has('all') ? true : /model-ai\.glb$/.test(p.model)));
if (skipped.length) console.log('dilewati (tidak aktif): ' + skipped.map((p) => p.id + ':' + p.status).join(', '));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((f) => fs.existsSync(f));
const W = 1600, H = 900;
const wait = (t) => new Promise((r) => setTimeout(r, t));

async function shots() {
  if (!CHROME) throw new Error('Chrome/Edge tidak ditemukan');
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  let b = null, pg = null, n = 0;
  const PER_BROWSER = 12;   // SwiftShader bocor memori → Chrome dibuka ulang tiap 12 produk
  // tunggu N frame yang BENAR-BENAR digambar (SwiftShader bisa < 2 fps → menunggu waktu saja tidak cukup)
  const frames = (k) => pg.evaluate((k) => new Promise((r) => { const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), k);
  const open = async () => {
    if (b) { try { await b.close(); } catch (e) {} }
    b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=' + W + ',' + H] });
    pg = await b.newPage(); await pg.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    pg.on('pageerror', (e) => console.log('  [page]', e.message));
    await pg.goto(URL0, { waitUntil: 'load', timeout: 120000 });
    await pg.waitForFunction(() => window.XW && XW.state, { timeout: 60000 });
    await pg.evaluate(() => {
      XW.setQuality(1, true);   // bayangan nyala, tanpa pasca-proses & dpr 1 (SwiftShader lambat); dikunci
      // penanda model yang BENAR-BENAR sudah tampil (showModel selesai) — hash & modelInfo saja masih bisa milik produk sebelumnya
      const o = XW.showModel; window.__shown = null;
      XW.showModel = function (p) { const pr = o.apply(this, arguments); window.__shown = { id: p.id, done: false }; if (pr && pr.then) pr.then(() => { if (window.__shown && window.__shown.id === p.id) window.__shown.done = true; }); return pr; };
    });
    await frames(4); n = 0;
  };
  const shoot = async (p) => {
    await pg.evaluate((id) => { window.__shown = null; location.hash = '#/p/' + id; }, p.id);
    await pg.waitForFunction((id) => window.__shown && window.__shown.id === id && window.__shown.done && XW.kind() === 'model' && XW.modelInfo(), { timeout: 60000, polling: 300 }, p.id);
    await wait(1500); await frames(4);   // tekstur, bayangan (waktu + frame nyata)
    // animasi naik/tenggelam (GSAP) selesai dulu — di SwiftShader frame sangat lambat, tween bisa masih berjalan
    try { await pg.waitForFunction(() => !(window.gsap && gsap.globalTimeline.getChildren(true, true, true).some((t) => t.isActive() && t.vars && t.vars.y != null)), { timeout: 40000, polling: 500 }); } catch (e) {}
    await frames(4);
    await pg.evaluate(() => { XW.state.spin = 0; XW.state.spinV = 0; });
    await frames(3);
    await pg.screenshot({ path: path.join(OUT, 'shots', p.id + '-a.jpg'), type: 'jpeg', quality: 88 });
    await pg.evaluate(() => { XW.state.spin = -0.62; XW.state.spinV = 0; });
    await frames(3);
    await pg.screenshot({ path: path.join(OUT, 'shots', p.id + '-b.jpg'), type: 'jpeg', quality: 88 });
    await pg.evaluate(() => { XW.state.spin = 0; });
  };
  for (const p of list) {
    const done = path.join(OUT, 'shots', p.id + '-b.jpg');
    if (!has('force') && fs.existsSync(done)) { console.log(p.id.padEnd(34), 'sudah ada'); continue; }
    const t0 = Date.now();
    if (!b || n >= PER_BROWSER) await open();
    try { await shoot(p); n++; console.log(p.id.padEnd(34), ((Date.now() - t0) / 1000).toFixed(1) + 's'); }
    catch (e) {
      console.log(p.id.padEnd(34), 'gagal: ' + e.message.split('\n')[0] + ' → Chrome dibuka ulang, coba sekali lagi');
      try { await open(); await shoot(p); n++; console.log(p.id.padEnd(34), 'ok (ulang)'); } catch (e2) { console.log(p.id.padEnd(34), 'gagal lagi: ' + e2.message.split('\n')[0]); }
    }
  }
  if (b) await b.close();
}

/* lembar banding: tiap baris = id + nama | foto 1 | foto 2 | depan | serong (tinggi 300 px) */
async function sheets() {
  const CH = 300, CW = 300, SW = 420, LW = 230, PAD = 8, ROWS = 6;
  const rowW = LW + CW * 2 + SW * 2 + PAD * 6, rowH = CH + PAD;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fit = async (file, w, h) => {
    try { return await sharp(file).resize(w, h, { fit: 'contain', background: '#1b1917' }).jpeg().toBuffer(); }
    catch (e) { return await sharp({ create: { width: w, height: h, channels: 3, background: '#1b1917' } }).jpeg().toBuffer(); }
  };
  const crop = async (file, w, h) => {   // tangkapan layar: ambil bagian tengah panggung (lebar 60 %, tinggi 90 %)
    try { return await sharp(file).extract({ left: Math.round(W * .27), top: Math.round(H * .06), width: Math.round(W * .56), height: Math.round(H * .86) }).resize(w, h, { fit: 'contain', background: '#1b1917' }).jpeg().toBuffer(); }
    catch (e) { return fit(file, w, h); }
  };
  let n = 0;
  for (let i = 0; i < list.length; i += ROWS) {
    const grp = list.slice(i, i + ROWS), comps = [], svg = [];
    for (let r = 0; r < grp.length; r++) {
      const p = grp[r], y = r * rowH + PAD, sh = SHOP[p.id] || {};
      const ph = (sh.images || []).filter((im) => im.kind === 'galeri').slice(0, 2).map((im) => path.join(ROOT, 'data/source/shop-img', p.id, im.t || im.f));
      let x = PAD;
      svg.push('<text x="' + (x + 6) + '" y="' + (y + 28) + '" font-size="22" font-weight="600" fill="#f2ede6">' + esc(p.name) + '</text>');
      svg.push('<text x="' + (x + 6) + '" y="' + (y + 54) + '" font-size="15" fill="#b8b0a6">' + esc(p.id) + '</text>');
      svg.push('<text x="' + (x + 6) + '" y="' + (y + 78) + '" font-size="15" fill="#b8b0a6">' + esc(p.type || '') + '</text>');
      svg.push('<text x="' + (x + 6) + '" y="' + (y + 102) + '" font-size="15" fill="#b8b0a6">' + esc((p.dims || '')) + '</text>');
      x += LW + PAD;
      for (let k = 0; k < 2; k++) { comps.push({ input: await fit(ph[k] || '', CW, CH), left: x, top: y }); x += CW + PAD; }
      comps.push({ input: await crop(path.join(OUT, 'shots', p.id + '-a.jpg'), SW, CH), left: x, top: y }); x += SW + PAD;
      comps.push({ input: await crop(path.join(OUT, 'shots', p.id + '-b.jpg'), SW, CH), left: x, top: y });
    }
    const hgt = grp.length * rowH + PAD;
    const txt = Buffer.from('<svg width="' + rowW + '" height="' + hgt + '" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:Segoe UI,Arial,sans-serif}</style>' + svg.join('') + '</svg>');
    comps.push({ input: txt, left: 0, top: 0 });
    const f = path.join(OUT, 'sheet-' + String(++n).padStart(2, '0') + '.jpg');
    await sharp({ create: { width: rowW, height: hgt, channels: 3, background: '#0f0e0d' } }).composite(comps).jpeg({ quality: 86 }).toFile(f);
    console.log(f, grp.map((p) => p.id).join(', '));
  }
}

(async () => {
  console.log(list.length + ' produk → ' + OUT);
  if (!has('sheet-only')) await shots();
  await sheets();
})().catch((e) => { console.error(e); process.exit(1); });
