/* ==========================================================================
   XIONCO — pembuat gambar garis kartu Customize (jalankan ulang setiap spesifikasi / model berubah)

   Pakai (server lokal harus jalan: node tools/serve.js):
     node tools/icons/build.js                 → semua kategori
     node tools/icons/build.js kursi/sofa      → hanya sub tertentu (manifest digabung)
   Butuh puppeteer-core (npm i -g puppeteer-core, atau NODE_PATH ke node_modules yang memilikinya)
   dan Chrome (CHROME=path untuk mengganti lokasi bawaan).

   Hasil: assets/cz-icons/<cat>/<sub>/<group>__<opt>.png   gambar 3D per sub (garis dasar)
          assets/cz-icons/<cat>/<sub>/<group>__<opt>.a.png garis bagian yang dijelaskan (lapis aksen, manifest.acc)
          assets/cz-icons/_sym/<group>__<opt>.png           simbol bersama (bahan, isian, …)
          assets/cz-icons/_jenis/<cat>.png · <cat>__<sub>.png
          assets/cz-icons/manifest.json                     peta pilihan → file (dibaca app.js)
   PNG 240 × 240, 4-bit berpalet: hitam dengan 16 tingkat alfa (garis anti-alias), latar transparan.
   Di situs ditampilkan sebagai CSS mask-image → warna garis mengikuti tema (emas saat dipilih).
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) {
  try { puppeteer = require('puppeteer'); } catch (e2) { console.error('puppeteer-core tidak ditemukan — npm i puppeteer-core (atau set NODE_PATH)'); process.exit(1); }
}
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'cz-icons');
const URL = process.env.ICON_URL || 'http://127.0.0.1:5173/tools/icons/render.html';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const N = 240;

/* ---------------- PNG 4-bit berpalet + tRNS */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(alpha) {
  const row = N / 2, raw = Buffer.alloc((row + 1) * N);
  for (let y = 0; y < N; y++) {
    raw[y * (row + 1)] = 0;
    for (let x = 0; x < N; x += 2) {
      const a = Math.round(alpha[y * N + x] / 17), b = Math.round(alpha[y * N + x + 1] / 17);
      raw[y * (row + 1) + 1 + x / 2] = (a << 4) | b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 4; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = Buffer.alloc(48, 0), trns = Buffer.alloc(16); for (let i = 0; i < 16; i++) trns[i] = i * 17;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('tRNS', trns),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9, strategy: zlib.constants.Z_DEFAULT_STRATEGY })), chunk('IEND', Buffer.alloc(0))]);
}
const blank = (a) => !a || !a.some((v) => v > 20);

(async () => {
  const t0 = Date.now();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=d3d11', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 960 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.XPARTS && XPARTS.loadPillow && XPARTS.loadPillow());
  await page.waitForFunction(() => !window.XPARTS || !XPARTS.pillowReady || XPARTS.pillowReady(), { timeout: 15000 }).catch(() => console.warn('bantal hias CC0 tidak termuat — bantal prosedural dipakai'));

  if (!ONLY.length) fs.rmSync(OUT, { recursive: true, force: true });
  const manPath = path.join(OUT, 'manifest.json');
  let man = { v: '', size: N, jenis: {}, subs: {}, acc: {} };
  if (ONLY.length && fs.existsSync(manPath)) man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
  man.acc = man.acc || {};   // lapis aksen (bagian yang dijelaskan, tampil emas): <rel>.a.png
  const jobs = (await page.evaluate(() => PLAN.jobs())).filter((j) => !ONLY.length || ONLY.some((o) => (j.cat + '/' + (j.sub || '')).startsWith(o) || o === j.cat));
  const syms = new Set(), log = [], counts = {};
  const write = (rel, a) => { const f = path.join(OUT, rel + '.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, png(a)); };
  for (const sk of Object.keys(man.subs)) if (ONLY.some((o) => sk.startsWith(o))) man.subs[sk] = {};
  let n = 0, skipped = 0;
  for (const j of jobs) {
    const res = await page.evaluate((j) => PLAN.run(j).map((r) => ({ id: r.id, a: r.a ? ICON.b64(r.a) : null, acc: r.acc ? ICON.b64(r.acc) : null, sym: r.sym || null, note: r.note || '', skip: !!r.skip })), j);
    for (const r of res) {
      const a = r.a ? Buffer.from(r.a, 'base64') : null;
      if (j.kind === 'cat' || j.kind === 'sub') {
        const rel = '_jenis/' + (j.kind === 'cat' ? j.cat : j.cat + '__' + j.sub);
        if (!blank(a)) { write(rel, a); man.jenis[j.kind === 'cat' ? j.cat : j.cat + '/' + j.sub] = 1; n++; }
        else log.push(rel + ': kosong');
        continue;
      }
      if (r.skip) { skipped++; continue; }   // pilihan tidak pernah tampil di sub ini
      const sk = j.cat + '/' + j.sub, key = j.group + '__' + r.id;
      man.subs[sk] = man.subs[sk] || {};
      counts[j.cat] = counts[j.cat] || { d3: 0, sym: 0, none: 0 };
      if (!blank(a)) {
        const rel = j.cat + '/' + j.sub + '/' + key, acc = r.acc ? Buffer.from(r.acc, 'base64') : null;
        write(rel, a); man.subs[sk][key] = ''; counts[j.cat].d3++; n++;
        if (acc && !blank(acc)) { write(rel + '.a', acc); man.acc[rel] = 1; counts[j.cat].acc = (counts[j.cat].acc || 0) + 1; n++; } else delete man.acc[rel];
      }
      else if (r.sym) { syms.add(r.sym); man.subs[sk][key] = '_sym/' + r.sym.replace(/[/:]/g, '_'); counts[j.cat].sym++; }
      else { counts[j.cat].none++; log.push(sk + ' ' + key + ': TANPA GAMBAR ' + r.note); }
      if (r.note) log.push(sk + ' ' + key + ': ' + r.note);
    }
    process.stdout.write('\r' + (jobs.indexOf(j) + 1) + '/' + jobs.length + '  ' + (j.cat + '/' + (j.sub || '') + ' ' + (j.group || '')).padEnd(40));
  }
  // simbol bersama
  for (const k of syms) {
    const b = await page.evaluate((k) => ICON.svgAlpha(SYMBOLS[k].svg).then(ICON.b64), k);
    write('_sym/' + k.replace(/[/:]/g, '_'), Buffer.from(b, 'base64')); n++;
  }
  // versi = hash isi semua file
  const h = crypto.createHash('sha1');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.png')) h.update(fs.readFileSync(f)); });
  walk(OUT);
  man.v = h.digest('hex').slice(0, 10);
  fs.writeFileSync(manPath, JSON.stringify(man));
  fs.writeFileSync(path.join(__dirname, 'last-build.log'), log.join('\n') + '\n');
  let bytes = 0; const sizeOf = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) sizeOf(f); else bytes += fs.statSync(f).size; }); sizeOf(OUT);
  console.log('\nselesai: ' + n + ' file baru, ' + syms.size + ' simbol, ' + skipped + ' pilihan tak terjangkau dilewati, total ' + (bytes / 1024).toFixed(0) + ' KB, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  console.log(JSON.stringify(counts));
  if (errs.length) console.log('page errors:', errs.slice(0, 10));
  await browser.close();
})();
