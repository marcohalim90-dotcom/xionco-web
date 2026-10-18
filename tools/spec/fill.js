/* ==========================================================================
   Isi tabel Ukuran & material dari deskripsi xionco.shop lalu bandingkan dengan model 3D
   Pakai:  node tools/spec/fill.js            (setelah node tools/fetch-shop.js & node tools/spec/measure.js)
   Hasil:  data/specs.json — baris bersumber "xionco.shop" ditulis ulang; baris yang diisi/diubah manual
           (sumber lain) dipertahankan. Temuan (auto) dihitung terhadap data/specs-3d.json.
   Deskripsi toko: "Overall Dimension : P 195cm x L 85cm x T 73cm" (P = lebar, L = dalam, T = tinggi),
   daftar per ukuran "P (92 / 122 / 162) x L 207 x T 100", "ø 70cm x T 44cm", "180 x 90 x 75 cm",
   lalu "Bahan Material: * Rangka : … * Kaki : … * Busa : … * Finishing : …".
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = 'xionco.shop (deskripsi)';
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return d; } };
const text = (h) => String(h || '').replace(/<br\b[^>]*>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const num = (s) => { const v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : null; };
const NOT_MAIN = /pack|package|kemasan|glass|kaca|frame size|tray|storage|storange|kop|available|cable|kabel|thickness|tebal|bantal|pillow|each|lampu|lamp\b|area tidur/i;

// ---------- ukuran ----------
function dimsOf(val) {
  const v = val.replace(/×/g, 'x').replace(/\s+/g, ' ');
  const mm = /\bmm\b/i.test(v) && !/\bcm\b/i.test(v) ? .1 : 1;
  let m = v.match(/P\s*\(?\s*([\d.,\s/]+?)\s*(?:cm)?\s*\)?\s*(?:cm)?\s*x\s*L\s*\(?\s*([\d.,\s/]+?)\s*(?:cm)?\s*\)?\s*(?:cm)?\s*x\s*T\s*\(?\s*([\d.,\s/]+)/i);
  if (m) {
    const L = (s) => s.split('/').map(num).filter((x) => x != null);
    const a = L(m[1]), b = L(m[2]), c = L(m[3]), n = Math.max(a.length, b.length, c.length);
    return Array.from({ length: n }, (x, i) => ({ w: (a[i] || a[0]) * mm, d: (b[i] || b[0]) * mm, h: (c[i] || c[0]) * mm }));
  }
  m = v.match(/(?:ø|diameter|\bd)\s*([\d.,]+)\s*(?:cm)?\s*x\s*(?:t|h)?\s*([\d.,]+)/i);
  if (m) return [{ w: num(m[1]) * mm, d: num(m[1]) * mm, h: num(m[2]) * mm, round: true }];
  m = v.match(/([\d.,]+)\s*(?:cm|mm)?\s*x\s*([\d.,]+)\s*(?:cm|mm)?\s*x\s*([\d.,]+)/i);
  if (m) return [{ w: num(m[1]) * mm, d: num(m[2]) * mm, h: num(m[3]) * mm }];
  m = v.match(/^([\d.,]+)\s*(?:cm)?\s*x\s*([\d.,]+)\s*(?:cm)?\s*\(?diameter/i);
  if (m) return [{ w: num(m[2]) * mm, d: num(m[2]) * mm, h: num(m[1]) * mm }];
  m = v.match(/width\s*([\d.,]+).*?depth\s*([\d.,]+)/i);
  if (m) return [{ w: num(m[1]) * mm, d: num(m[2]) * mm }];
  return [];
}
// ---------- material ----------
const MAT = [
  ['legs', /^(kaki|leg(?!\s*frame)|base|alas)\b/i],
  ['uph', /(upholster|fabric|kain|kulit|leather|busa|foam|cushion|shade)/i],
  ['finish', /(finish|coating|table ?top|^top|hpl|tabletop)/i],
  ['frame', /(rangka|frame(?!\s*size)|struktur|body|badan|divan|ambalan|^material|main material|inner)/i]
];
function parse(desc, vlabels) {
  const isVar = (k) => (vlabels || []).some((v) => v.toLowerCase() === String(k).toLowerCase().trim());
  const lines = text(desc).split('\n').map((s) => s.replace(/^[\s*•\-–]+/, '').trim()).filter(Boolean);
  const dims = [], mats = { frame: [], uph: [], finish: [], legs: [] }, extra = [];
  let section = '';
  lines.forEach((l) => {
    const k = l.indexOf(':'), key = k > 0 ? l.slice(0, k).trim() : '', val0 = k > 0 ? l.slice(k + 1).trim() : l;
    if (/^={2,}/.test(l)) { section = ''; return; }
    if (k < 0 && l.length < 40 && !/\d\s*x\s*\d/i.test(l) && /seat|ottoman|set|type|tipe|ukuran|size/i.test(l)) { section = l; return; }   // judul bagian
    if (key.length > 60 || /IMPORTANT|toleransi|jangan|lap dengan/i.test(l)) return;
    const val = val0.split(/\s(?:kap|kop|each|lamp)\b[^:]*:/i)[0];   // ukuran sekunder sesudah titik dua kedua dibuang
    const isDim = /dimen|ukuran|overall|^size/i.test(key) || (!key && /^P\s*\(?\s*\d/i.test(val));
    if (isDim && !NOT_MAIN.test(key)) {
      const d = dimsOf(val);
      if (!d.length && /\d/.test(val) && val.length < 90) { extra.push((key || 'Dimensi') + ': ' + val); return; }   // ukuran 2 angka (lampu) → catatan
      if (d.length) { dims.push({ label: (key.replace(/overall|dimensions?|dimensi|product|ukuran|\(.*?\)/gi, '').trim() || section).trim(), d, section, open: (val.match(/\(([^)]*terbuka[^)]*)\)/i) || [])[1] }); return; }
    }
    if (key && isVar(key) && dimsOf(val).length) { dims.push({ label: key, d: dimsOf(val), section }); return; }   // ukuran per varian
    if (key && /^P\s*\d/i.test(val) && dimsOf(val).length) { extra.push(key + ': ' + val); return; }   // modul (sectional)
    if (key && /tinggi|ketinggian|panjang|lebar|area|tebal|thickness|frame size|glass|tray|storage|cable|kabel/i.test(key) && /\d/.test(val) && val.length < 80) { extra.push({ t: key + ': ' + val, section }); return; }
    if (key && val && val.length < 160) { for (const [col, re] of MAT) if (re.test(key)) { mats[col].push((col === 'uph' || col === 'finish') && !/^(upholstery|fabric|finishing)$/i.test(key) ? key + ': ' + val : val); return; } }
  });
  return { dims, mats, extra };
}
// ---------- teks halaman produk: Overview (cerita), isi paket, perawatan ----------
// blok dipisah "===": kebijakan (ongkir / syarat / toleransi warna) dibuang, blok spesifikasi sudah dibaca parse()
const POLICY = /imitasi|peringatan|ongkir|jabodetabek|syarat|ketentuan|\bPENTING\b|IMPORTANT|toleransi|hubungi admin|info penting|returning|garansi resmi/i;
const SPEC_KEY = /dimen|ukuran|material|finish|frame|rangka|kaki|leg\b|busa|top|size|tebal|thickness|tinggi|ketinggian|kedalaman|panjang|lebar|process|style|coating|upholster|cushion|lumen|watt|volt|beam|cri|lifespan|warranty|weight|color temp|shade|body|packing|packaging|kapasitas|garansi/i;
function textParts(desc, title) {
  const blocks = text(desc).split(/\n\s*={2,}\s*(?:\n|$)/);
  const overview = [], box = [], care = [];
  blocks.forEach((b) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length || /^(SPESIFIKASI|SPECIFICATION)/i.test(lines[0]) || (POLICY.test(b) && lines.length <= 3 && !/\d+\s*x\s/i.test(b))) return;
    let inCare = false, inBox = false;
    lines.forEach((l, i) => {
      const t = l.replace(/^[\s*•\-–]+/, '').trim();
      if (!t || POLICY.test(t) || /^\d{4}\s+XIONCO$/i.test(t) || /^(dimension|dimensi|bahan material|material|spesifikasi produk|specification)\s*:?$/i.test(t)) return;
      if (/^care instructions?/i.test(t)) { inCare = true; return; }
      if (inCare || /^(jangan|lap |lap dengan|bersihkan|hindari|tidak disarankan|gunakan kain)/i.test(t)) { care.push(t); return; }
      if (/^termasuk di dalam/i.test(t) || /^what'?s in the box/i.test(t)) {   // judul isi paket umum dibuang, yang spesifik (mis. "DELUXE 1 seater") dipakai
        inBox = true; if (!/^termasuk di dalam(nya)?\s*:?$/i.test(t) && !/^what/i.test(t)) box.push(t.replace(/\s*:\s*$/, '')); return;
      }
      if (/^\d+\s*x\s+\S/i.test(t) || (inBox && /^\d/.test(t) && t.length < 80 && t.indexOf(':') < 0)) { box.push(t); return; }
      inBox = false;
      if (i === 0 && (/\|\s*XIONCO|XIONCO$/i.test(t) || (title && t.toLowerCase().indexOf(String(title).toLowerCase().slice(0, 8)) === 0 && t.length < 90))) return;   // judul toko
      const k = t.indexOf(':'); if (k > 0 && k < 45 && SPEC_KEY.test(t.slice(0, k))) return;
      if (dimsOf(t).length && t.length < 80) return;
      overview.push(t);
    });
  });
  const ov = Array.from(new Set(overview)).join('\n').slice(0, 1800);
  return { overview: ov, box: Array.from(new Set(box)).slice(0, 12), care: Array.from(new Set(care)).slice(0, 8) };
}
// ---------- bandingkan (sama dengan shared/devkit/specs.js) ----------
const tol = (a, b) => Math.abs(a - b) <= Math.max(2, b * .03);
function finding(m, r) {
  if (!m || !(r.w && r.d && r.h)) return '';
  const ok = tol(m.w, r.w) && tol(m.d, r.d) && tol(m.h, r.h);
  if (ok) return '';
  if (tol(m.h, r.h) && tol(m.w, r.d) && tol(m.d, r.w)) return 'Lebar & dalam model 3D tertukar (3D ' + m.w + ' × ' + m.d + ' vs ' + r.w + ' × ' + r.d + ')';
  return [['w', 'W (lebar)'], ['d', 'D (dalam)'], ['h', 'H (tinggi)']].filter(([k]) => !tol(m[k], r[k]))
    .map(([k, l]) => { const d = Math.round((m[k] - r[k]) * 10) / 10; return l + ' 3D ' + (d > 0 ? '+' : '') + d + ' cm (' + m[k] + ' vs ' + r[k] + ')'; }).join(' · ');
}

// catatan penjelas (bukan kesalahan ukur): model 3D mewakili bentuk lain dari ukuran resmi
const NOTE = {
  rouled: 'Model 3D = Complete Set (ø70 + ø55 bersarang); ukuran resmi per meja',
  'void-series-sky-b9': 'Tinggi model 3D termasuk kabel gantung & kop; ukuran resmi = badan lampu',
  eorde: 'Sectional modular — ukuran resmi per modul (lihat catatan); model 3D = susunan L 5 seater'
};
function run() {
  const db = read('data/products.json', { items: [] }), live = (read('data/source/xionco-shop-live.json', { rows: {} })).rows;
  const specs = read('data/specs.json', { items: {} }), m3d = read('data/specs-3d.json', { models: {} }).models;
  specs.items = specs.items || {};
  const stat = { filled: 0, nodata: [], diff: [] };
  db.items.filter((p) => p.status === 'aktif').forEach((p) => {
    const L = p.shopId && live[p.shopId];
    const keep = ((specs.items[p.id] || {}).rows || []).filter((r) => r.src && r.src.indexOf('xionco.shop') !== 0 && r.src !== 'Situs (dimensi)');
    const sizes = (p.variants || []).filter((v) => !v.hex && !/fabric|faux|leather/i.test(v.group || '') && !/^(terang|gelap)$/i.test(v.label)).map((v) => v.label);
    const def = (p.variants || [])[p.variant] ? p.variants[p.variant].label : sizes[0];
    const rows = [];
    let info = { dims: [], mats: { frame: [], uph: [], finish: [], legs: [] }, extra: [] };
    if (L) info = parse(L.diskripsi, (p.variants || []).map((v) => v.label));
    // pelapis dari varian toko bila deskripsi tidak menyebut (mis. "FABRIC VIENNA BLACK | UPHOLSTERY")
    if (!info.mats.uph.length && L) {
      const fam = Array.from(new Set((L.listvariant || []).map((v) => String(v.colorhig || '').split('|')[0].trim()).filter((s) => /fabric|faux|leather|kulit/i.test(s))
        .map((s) => s.replace(/\b(BLACK|BLUE|CUSTARD|GRAPHITE|IVORY|MID GREY|CANYON|D\. ?GREY|PEANUT|SNOW|VL\. ?GREY|L\. ?GREY|KIWI|MOSS|RED|GREY)\b.*$/i, '').trim())));
      if (fam.length) info.mats.uph.push(fam.join(' · '));
    }
    const mat = {}; Object.keys(info.mats).forEach((k) => { if (info.mats[k].length) mat[k] = Array.from(new Set(info.mats[k])).join(' · ').slice(0, 300); });
    const me0 = (p.name + ' ' + p.type).toLowerCase(), dg = (me0.match(/(\d)\s*(?:s\b|seat)/) || [])[1];
    const mySec = (sec) => { sec = String(sec || '').toLowerCase(); if (!sec) return false; if (/ottoman/.test(sec)) return /ottoman/.test(me0); const d = (sec.match(/(\d)\s*seat/) || [])[1]; return d ? d === dg && !/ottoman/.test(me0) : false; };
    const hasSec = info.dims.some((g) => mySec(g.section));
    if (hasSec) info.dims = info.dims.filter((g) => mySec(g.section));
    const other = Array.from(new Set(info.extra.filter((x) => typeof x === 'string' || !hasSec || !x.section || mySec(x.section)).map((x) => typeof x === 'string' ? x : x.t))).slice(0, 8).join(' · ');
    // baris ukuran: daftar per ukuran → varian ukuran sesuai urutan; label "Diameter 70" → varian bernama sama
    const flat = [], used = {};
    info.dims.forEach((g) => g.d.forEach((d, i) => flat.push({ label: g.d.length > 1 ? sizes[i] || 'Ukuran ' + (i + 1) : g.label, d, open: g.open })));
    if (flat.length) {
      const byNum = (d) => sizes.find((s) => { const n = parseFloat(s); return isFinite(n) && (n === d.w || n === d.d || n === d.h); });   // varian '170cm' ↔ ukuran 170
      const match = (lab, d) => sizes.find((s) => lab && (s.toLowerCase() === lab.toLowerCase() || lab.toLowerCase().indexOf(s.toLowerCase()) >= 0 || s.toLowerCase().indexOf(lab.toLowerCase()) >= 0)) || (d && byNum(d));
      const me = (p.name + ' ' + p.type).toLowerCase(), digit = (me.match(/(\d)\s*(?:s\b|seat)/) || [])[1];
      const mine = (lab) => { lab = String(lab || '').toLowerCase(); if (!lab) return false; if (/ottoman/.test(lab)) return /ottoman/.test(me); const d = (lab.match(/(\d)\s*seat/) || [])[1]; return d ? d === digit && !/ottoman/.test(me) : false; };
      let main = flat.find((x) => mine(x.label)) || flat.find((x) => !x.label || /^(overall)?$/i.test(x.label)) || flat.find((x) => match(x.label) === def) || flat[0];
      rows.push(Object.assign({ k: 'Utama', src: SRC }, main.d.w ? { w: main.d.w, d: main.d.d, h: main.d.h } : {}, mat,
        { other: [match(main.label, main.d) ? 'ukuran ' + match(main.label, main.d) : '', main.open ? 'terbuka: ' + main.open : '', other].filter(Boolean).join(' · ') }));
      if (match(main.label, main.d)) used[match(main.label, main.d)] = 1;   // varian yang sudah diwakili baris Utama
      flat.filter((x) => x !== main).forEach((x, i) => { const k = match(x.label, x.d) || x.label || 'Ukuran ' + (i + 2); if (rows.some((r) => r.k === k)) return; rows.push(Object.assign({ k, src: SRC }, x.d.w ? { w: x.d.w, d: x.d.d, h: x.d.h } : {})); });
    } else if (L && /\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*cm/i.test(L.namaproduk)) {   // ukuran di nama produk (mis. ACRYLIC MIRROR 122 x 244 cm)
      const nd = dimsOf(L.namaproduk)[0] || {}, two = String(L.namaproduk).match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/i);
      rows.push(Object.assign({ k: 'Utama', src: 'xionco.shop (nama produk)' }, nd.w ? { w: nd.w, d: nd.d, h: nd.h } : {}, mat, { other: [two ? 'Ukuran: ' + two[1] + ' × ' + two[2] + ' cm' : '', other].filter(Boolean).join(' · ') }));
    } else if (p.dims) {
      const m = String(p.dims).replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/);
      rows.push(Object.assign({ k: 'Utama', src: 'Situs (dimensi)' }, m ? { w: +m[1], d: +m[2], h: +m[3] } : {}, mat, other ? { other } : {}));
    } else if (Object.keys(mat).length) rows.push(Object.assign({ k: 'Utama', src: SRC }, mat, other ? { other } : {}));
    // ukuran lain yang belum punya baris (varian ukuran tanpa angka di deskripsi)
    sizes.forEach((s) => { if (!used[s] && !rows.some((r) => r.k === s) && rows.length) rows.push({ k: s, src: SRC }); });
    Object.keys(p.vmodels || {}).forEach((k) => { if (!rows.some((r) => r.k === k)) rows.push({ k, src: SRC }); });
    if (NOTE[p.id] && rows[0] && !rows[0].note) rows[0].note = NOTE[p.id];
    // temuan terhadap model 3D
    rows.forEach((r) => {
      Object.keys(r).forEach((k) => { if (r[k] === '' || r[k] == null) delete r[k]; });
      ['w', 'd', 'h'].forEach((k) => { if (r[k]) r[k] = Math.round(r[k] * 10) / 10; });
      const mf = r.k === 'Utama' ? p.model : (p.vmodels || {})[r.k], f = mf && finding(m3d[mf], r);
      if (f) { r.auto = f; stat.diff.push(p.name + (p.type ? ' · ' + p.type : '') + ' [' + r.k + ']: ' + f); } else delete r.auto;
    });
    const all = keep.concat(rows.filter((r) => !keep.some((k) => k.k === r.k)));
    const tx = L ? textParts(L.diskripsi, L.namaproduk) : { overview: '', box: [], care: [] };
    const prev = specs.items[p.id] || {};
    if (all.length || tx.overview) {
      specs.items[p.id] = Object.assign({}, prev, { rows: all, at: new Date().toISOString() });
      ['overview', 'box', 'care'].forEach((k) => { if (prev[k + 'Manual']) return; if (tx[k] && tx[k].length) specs.items[p.id][k] = tx[k]; else delete specs.items[p.id][k]; });   // *Manual: diubah tangan, jangan ditimpa
      stat.filled++;
    } else stat.nodata.push(p.id);
    if (!rows.some((r) => r.w)) stat.nodata.push(p.id + ' (tanpa angka ukuran)');
  });
  specs.note = 'Ukuran resmi (cm) & material per produk / ukuran — Developer Settings › Ukuran & material; dibandingkan dengan model 3D (data/specs-3d.json)';
  specs.updated = new Date().toISOString();
  fs.writeFileSync(path.join(ROOT, 'data/specs.json'), JSON.stringify(specs, null, 1) + '\n');
  return stat;
}
module.exports = { run, parse, textParts };
if (require.main === module) {
  const s = run();
  console.log(s.filled + ' produk terisi');
  console.log('Tanpa angka ukuran (' + s.nodata.length + '): ' + s.nodata.join(', '));
  console.log('TEMUAN (' + s.diff.length + '):\n  ' + s.diff.join('\n  '));
}
