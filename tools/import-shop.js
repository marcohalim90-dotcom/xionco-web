/* ==========================================================================
   Impor katalog xionco.shop → Maison XIONCO v5
   Pakai:  node tools/import-shop.js [data/source/xionco-shop.json]

   Sumber: tabel HIG `databaseallitem_web` (produk xionco.shop) — diekspor lewat
           MCP hig ke data/source/xionco-shop.json (deskripsi HTML sudah jadi teks).
   Hasil:  v5/js/catalog.js   XV.CATEGORIES + XV.PRODUCTS (bawaan situs & database)
           data/products.json katalog yang dipublish (bawaan, updated: null)

   • Harga, harga coret, terjual, foto, dan VARIAN mengikuti xionco.shop.
   • Item v5 lama dipetakan ke produk shop (LEGACY) → id lama tetap dipakai, jadi
     aset (assets/items/<id>/…, mis. model.glb KYRIOS) & centang aset tidak hilang.
   • Kolom khusus v5 di data/products.json (model, modelRot, dims, leadTime, note)
     dipertahankan per id.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, process.argv[2] || 'data/source/xionco-shop.json');
const OUT_JS = path.join(ROOT, 'v5/js/catalog.js');
const OUT_DB = path.join(ROOT, 'data/products.json');
const SHOP = 'https://xionco.shop/products/';

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const IMG = src.imageBase || 'https://hig3141592653.my.id';

// produk v5 lama (urutan kurasi, nama & deskripsi yang sudah ditulis rapi)
function legacyProducts() {
  const file = path.join(ROOT, 'data/source/v5-legacy-products.js');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  return ctx.window.XV_LEGACY || [];
}
const LEGACY = legacyProducts();
const legacyById = Object.fromEntries(LEGACY.map((p) => [p.id, p]));

// id shop → id v5 lama
const LEGACY_MAP = {
  17: 'kyrios', 85: 'capra', 71: 'guise', 66: 'cameo', 24: 'astral', 54: 'orycto', 115: 'canis',
  39: 'eorde', 104: 'nora', 60: 'geom', 32: 'verk', 45: 'hout', 35: 'trapezo', 26: 'rouled',
  49: 'cubixct', 29: 'arze', 30: 'l7', 34: 'recta', 33: 'pluq', 36: 'hexter', 78: 'somno',
  25: 'poel', 109: 'ashara', 55: 'syme', 28: 'qaztac', 57: 'lucid', 40: 'kyoukai', 83: 'aether',
  42: 'uruz', 92: 'vazra', 97: 'vazratrack'
};
// kolom khusus v5 yang tidak boleh tertimpa impor
const KEEP = ['model', 'vmodels', 'modelRot', 'dims', 'leadTime', 'note'];

const CATEGORIES = [
  { id: 'seats', label: 'Seats', note: 'Sofa, kursi & ottoman' },
  { id: 'tables', label: 'Tables', note: 'Meja makan, kopi & kerja' },
  { id: 'bedframe', label: 'Bedframe', note: 'Tempat tidur' },
  { id: 'cabinet', label: 'Cabinet', note: 'Penyimpanan' },
  { id: 'lighting', label: 'Lighting', note: 'Lampu AETHER & VOID' },
  { id: 'decor', label: 'Decor', note: 'Aksesori & lifestyle' },
  { id: 'smart', label: 'Smart', note: 'Kelistrikan VAZRA' }
];
function catOf(k) {
  const has = (x) => k.indexOf(x) >= 0;
  if (has('Smart')) return 'smart';
  if (has('Lightings')) return 'lighting';
  if (has('Sofa') || has('Sofa Bed') || has('Chair') || has('Ottoman')) return 'seats';
  if (has('Bed')) return 'bedframe';
  if (has('Table') || has('Desk')) return 'tables';
  if (has('Cabinet')) return 'cabinet';
  if (has('Accent') || has('Lifestyle') || has('Hardware')) return 'decor';
  return null;
}

const full = (u) => !u ? '' : /^https?:/.test(u) ? u : IMG + (u[0] === '/' ? '' : '/') + u;
const num = (v) => { const n = +v; return isFinite(n) && n > 0 ? n : null; };
const hex = (h) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(h || '').trim()) ? String(h).trim().toLowerCase() : null;
const title = (s) => String(s || '').trim().replace(/\s+/g, ' ').replace(/\S+/g, (w) => /^[A-Z0-9.&]+$/.test(w) && w.length > 1 && !/\d/.test(w) ? w[0] + w.slice(1).toLowerCase() : w);
const slug = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const fabricName = (c) => title(String(c || '').split('|')[0].replace(/^\s*FABRIC\s+/i, ''));

function splitName(n, cat0) {
  const parts = String(n).replace(/\s+/g, ' ').trim().split(/\s*\|\s*|\s+[-–•]\s+/).map((s) => s.trim())
    .filter((s) => s && !/^(each|xionco)$/i.test(s));
  const name = (parts.shift() || n).toUpperCase();
  let type = parts.slice(0, 2).map(title).join(' · ');
  if (type.length > 46) type = type.slice(0, 44).replace(/\s+\S*$/, '') + '…';
  return { name, type: type || cat0 || '' };
}
function cleanDesc(t) {
  let s = String(t || '').split(/={3,}|\bIMPORTANT\b|\bPENTING\s*-|SYARAT\s*&|TERMS\s*&/i)[0];
  s = s.replace(/\*\s*Luar jabodetabek[^\n]*/i, '').replace(/\n{2,}/g, '\n').trim();
  if (s.length > 420) s = s.slice(0, 420).replace(/\s+\S*$/, '') + '…';
  return s;
}

function variantsOf(row) {
  const list = (row.listvariant || []).map((v) => {
    const raw = String(v.variant || '').trim();
    const m = raw.match(/^(Fabric|Faux|Leather)\s*-\s*(.+)$/i);
    const group = m ? (/faux/i.test(m[1]) ? 'Faux leather' : title(m[1].toUpperCase())) : '';
    const subsRaw = (v.subvariant || []).map((s) => ({
      label: String(s.subvariant || '').trim(), price: num(s.price), was: num(s.price_coret),
      img: full(s.imageurl), hex: hex(s.hexcode), on: !!s.checked
    })).filter((s) => s.label);
    // satu sub-varian berkode internal (mis. "SK") tidak perlu dipilih pembeli
    const subs = subsRaw.length > 1 ? subsRaw : [];
    const first = subsRaw.find((s) => s.on) || subsRaw[0] || {};
    return {
      key: raw, label: title(m ? m[2] : raw), group,
      fabric: fabricName(v.colorhig || first.colorhig), hex: hex(v.hexcode) || first.hex || null,
      price: num(v.price) || first.price || null, was: num(v.price_coret) || first.was || null,
      img: full(v.imageurl) || first.img || '', on: !!v.checked, subs
    };
  }).filter((v) => v.key);
  const def = Math.max(0, list.findIndex((v) => v.key === row.main_produk), list.findIndex((v) => v.on));
  return { list, def: list.length ? Math.min(def, list.length - 1) : -1 };
}

const used = new Set(LEGACY.map((p) => p.id));
function uniqueId(base) { let id = base || 'item', k = 2; while (used.has(id)) id = base + '-' + k++; used.add(id); return id; }

const shopItems = src.rows.map((row) => {
  const k = row.katagori || [];
  const cat = catOf(k);
  const legacyId = LEGACY_MAP[row.id];
  const lg = legacyId && legacyById[legacyId];
  const nm = splitName(row.namaproduk, k[0]);
  const v = variantsOf(row);
  const price = num(row.main_price), was = num(row.price_coret);
  const images = Array.from(new Set((row.imageurl || []).map(full).filter(Boolean)));
  return {
    id: legacyId || uniqueId(slug(row.namaproduk)),
    cat: cat || (lg && lg.cat) || 'decor',
    name: lg ? lg.name : nm.name,
    type: lg ? lg.type : nm.type,
    price,
    was: was && price && was > price ? was : null,
    from: false,
    img: images[0] || (lg ? lg.img : ''),
    images,
    variants: v.list,
    variant: v.def,
    sold: row.totalterjual || 0,
    desc: (lg && lg.desc) || cleanDesc(row.deskripsi),
    url: SHOP + slug(row.namaproduk),
    shopId: row.id,
    shopName: row.namaproduk,
    bg: 'white',
    status: cat ? 'aktif' : 'draft'
  };
});

// urutan: kurasi v5 lebih dulu, lalu sisanya per kategori & terlaris
const byLegacy = Object.fromEntries(shopItems.filter((p) => legacyById[p.id]).map((p) => [p.id, p]));
const out = [];
LEGACY.forEach((lg) => {
  if (byLegacy[lg.id]) out.push(byLegacy[lg.id]);
  else if (lg.id === 'cubix') out.push(Object.assign({}, lg, { status: 'aktif', variants: [], variant: -1, images: [], sold: 0 }));
  else out.push(Object.assign({}, lg, { status: 'draft', variants: [], variant: -1, images: [], sold: 0, note: 'Tidak ada di xionco.shop (Okt 2026)' }));
});
const ORDER = CATEGORIES.map((c) => c.id);
shopItems.filter((p) => !legacyById[p.id])
  .sort((a, b) => (ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat)) || (b.sold - a.sold))
  .forEach((p) => out.push(p));

// kolom khusus v5 dari database yang ada
let prev = {};
try { (JSON.parse(fs.readFileSync(OUT_DB, 'utf8')).items || []).forEach((p) => { prev[p.id] = p; }); } catch (e) {}
out.forEach((p) => KEEP.forEach((k) => { if (prev[p.id] && prev[p.id][k] != null && prev[p.id][k] !== '') p[k] = prev[p.id][k]; }));
// produk lokal (local: true — mis. dari file SKP, belum ada di xionco.shop) tetap dipertahankan
Object.values(prev).filter((p) => p.local && !out.some((o) => o.id === p.id)).forEach((p) => out.push(p));

const stamp = new Date().toISOString().slice(0, 10);
const js = '/* ==========================================================================\n' +
  '   Katalog Maison XIONCO v5 — DIBUAT OTOMATIS oleh tools/import-shop.js (' + stamp + ')\n' +
  '   Sumber: xionco.shop (HIG databaseallitem_web). Jangan diedit tangan —\n' +
  '   ubah lewat Developer Settings › Katalog, atau impor ulang.\n' +
  '   ========================================================================== */\n' +
  'window.XV = window.XV || {};\n' +
  'XV.CATEGORIES = ' + JSON.stringify(CATEGORIES, null, 1) + ';\n' +
  'XV.PRODUCTS = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(OUT_JS, js);

const EXTRA = { status: 'aktif', dims: '', leadTime: '', customizable: false, stock: 'Ready', note: '' };
const CUSTOM_CATS = ['seats', 'tables', 'bedframe', 'cabinet'];
const items = out.map((p) => Object.assign({}, EXTRA, { customizable: CUSTOM_CATS.indexOf(p.cat) >= 0 }, p));
fs.writeFileSync(OUT_DB, JSON.stringify({ app: 'XIONCO', kind: 'products', updated: null, items }, null, 2) + '\n');

const act = out.filter((p) => p.status === 'aktif');
console.log('OK  ' + out.length + ' item (' + act.length + ' aktif, ' + (out.length - act.length) + ' draft) · ' +
  out.filter((p) => p.variants && p.variants.length).length + ' punya varian');
console.log('    → ' + path.relative(ROOT, OUT_JS) + ' (' + Math.round(fs.statSync(OUT_JS).size / 1024) + ' KB), ' + path.relative(ROOT, OUT_DB));
CATEGORIES.forEach((c) => console.log('    ' + c.id.padEnd(9) + act.filter((p) => p.cat === c.id).length));
