/* Anggaran performa situs (Q8) — diukur otomatis di Chrome tanpa cache, seperti pengunjung baru.
   Pakai:  node tools/perf/budget.js [alamat]        (bawaan http://localhost:5173/v5/)
   Siapkan sekali:  cd tools/perf && npm install
   Hasil: tabel LULUS / GAGAL per langkah; kode keluar 1 bila ada yang gagal (bisa dipakai sebelum push). */
const puppeteer = require('puppeteer-core'), fs = require('fs');
const URL0 = process.argv[2] || 'http://localhost:5173/v5/';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
const MB = 1048576;
const BUDGET = {
  beranda: { mb: 3, dtk: 3.5 },        // unduhan & waktu siap halaman pertama
  produk: { mb: 8 },                  // kumulatif setelah membuka Koleksi + satu produk
  customize: { mb: 10 },
  memori: 150,                        // MB memori JS tertinggi
  fps: 30                             // terendah
};

(async () => {
  if (!CHROME) { console.log('Chrome tidak ditemukan'); process.exit(2); }
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 });
  const cdp = await p.target().createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  let total = 0; cdp.on('Network.loadingFinished', (e) => { total += e.encodedDataLength; });
  const w = (t) => new Promise((r) => setTimeout(r, t));
  const rows = [], fail = [];
  const check = (name, val, max, unit, low) => { const ok = low ? val >= max : val <= max; rows.push([name, val.toFixed(1) + ' ' + unit, (low ? '≥ ' : '≤ ') + max + ' ' + unit, ok ? 'LULUS' : 'GAGAL']); if (!ok) fail.push(name); };
  const snap = () => p.evaluate(() => new Promise((ok) => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else ok({ fps: n / 2, heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }); })(); }));
  let heapMax = 0, fpsMin = 999;
  const note = (s) => { heapMax = Math.max(heapMax, s.heap); fpsMin = Math.min(fpsMin, s.fps); };

  await p.goto(URL0, { waitUntil: 'networkidle2' }); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  total = 0; const t0 = Date.now();
  await p.goto(URL0, { waitUntil: 'networkidle0' });
  const ready = (Date.now() - t0) / 1000; note(await snap());
  check('Beranda · unduhan', total / MB, BUDGET.beranda.mb, 'MB'); check('Beranda · siap', ready, BUDGET.beranda.dtk, 'dtk');
  await p.evaluate(() => { location.hash = '#/koleksi'; }); await w(6000);
  await p.evaluate(() => window.XVOpen && XVOpen('kyrios')); await w(5000); note(await snap());
  check('Koleksi + produk · unduhan', total / MB, BUDGET.produk.mb, 'MB');
  await p.evaluate(() => { location.hash = '#/customize'; }); await w(6000); note(await snap());
  check('Customize · unduhan', total / MB, BUDGET.customize.mb, 'MB');
  check('Memori JS tertinggi', heapMax / MB, BUDGET.memori, 'MB'); check('FPS terendah', fpsMin, BUDGET.fps, 'fps', true);
  const gpu = await p.evaluate(() => { const c = document.querySelector('canvas'), g = c && (c.getContext('webgl2') || c.getContext('webgl')), d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; });
  await b.close();
  console.log('\nAnggaran performa · ' + URL0 + '\nGPU: ' + gpu + '\n');
  rows.forEach((r) => console.log(r[0].padEnd(30), r[1].padStart(10), '  batas', r[2].padEnd(10), ' ', r[3]));
  console.log(fail.length ? '\n' + fail.length + ' melewati batas: ' + fail.join(', ') : '\nSemua dalam batas.');
  process.exit(fail.length ? 1 : 0);
})();
