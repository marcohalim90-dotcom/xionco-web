/* ==========================================================================
   XIONCO — kurasi katalog di atas data xionco.shop
   Beberapa produk di xionco.shop tersusun lain dari yang dimaksud pemilik (Okt 2026):
   - CAPRA: 2 tipe (Signature / Deluxe), tiap ukuran halaman sendiri: Signature 1S/2S/3S, Deluxe 1S/2S/3S/Ottoman
   - CUBIX: halaman per produk (AC, AL, OT, 2 seater AC-AC, 3 seater AC-AL-AC, coffee, side);
     kayu Terang (sungkai) / Gelap (oak) = varian di halaman yang sama (bukan halaman terpisah),
     lalu warna kain sebagai sub-pilihan
   - X-COIN bukan produk → disembunyikan
   Dipanggil otomatis oleh tools/import-shop.js; juga bisa langsung:  node tools/curate.js
   (mengubah data/products.json). Aman diulang (idempoten). Kolom yang diubah pemilik di
   Developer Settings (model, dims, …) hanya diisi bila masih kosong.
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const HIDE = ['x-coin', 'capra', 'capra-signature-series',
  'astral-1-seater', 'aether-k60'];   // diarsip (data tetap ada) — dua terakhir: duplikat lokal SKP tanpa foto/harga dari ASTRAL 1 Seater & AETHER K60
// kategori xionco.shop untuk produk lokal (tanpa halaman toko) / produk yang kategorinya kosong di toko
const KATS_OF = { seats: ['Sofa'], tables: ['Table'], bedframe: ['Bed'], cabinet: ['Cabinet'], lighting: ['Lightings'], decor: ['Accent'], smart: ['Smart'] };

const CAPRA = {
  'capra-signature-1s': ['CAPRA SIGNATURE 1S', 'Sofa · 1 seat', 1], 'capra-signature-2s': ['CAPRA SIGNATURE 2S', 'Sofa · 2 seat', 2],
  'capra-signature-3s': ['CAPRA SIGNATURE 3S', 'Sofa · 3 seat', 3], 'capra-deluxe-1s': ['CAPRA DELUXE 1S', 'Sofa · 1 seat', 1],
  'capra-deluxe-2s': ['CAPRA DELUXE 2S', 'Sofa · 2 seat', 2], 'capra-deluxe-3s': ['CAPRA DELUXE 3S', 'Sofa · 3 seat', 3]
};
// [halaman Terang (xionco.shop), halaman Gelap lama (lokal, dari SKP), nama, tipe, kalimat pembuka]
const CUBIX = [
  ['cubix-series-1-seater-ac-kayu-terang', 'cubix-series-1-seater-ac-kayu-gelap', 'CUBIX AC', 'Armchair · 1 seat', 'Modul armchair (AC): dua sandaran berbentuk siku. Dapat 1 bantal besar dan 1 bantal kecil.'],
  ['cubix-series-1-seater-al-kayu-terang', 'cubix-series-1-seater-al-kayu-gelap', 'CUBIX AL', 'Armless · 1 seat', 'Modul armless (AL): satu sandaran seperti palang. Dapat 1 bantal besar dan 1 bantal kecil.'],
  ['cubix-series-ottoman-kayu-terang', 'cubix-series-ottoman-kayu-gelap', 'CUBIX OT', 'Ottoman', 'Modul ottoman (OT) tanpa sandaran — pijakan kaki atau dudukan tambahan.'],
  ['cubix-series-2-seater-ac-ac-kayu-terang', 'cubix-series-2-seater-ac-ac-kayu-gelap', 'CUBIX 2 SEATER', 'Sofa · AC-AC', 'Sofa 2 seater CUBIX: susunan bawaan AC-AC.'],
  ['cubix-series-3-seaters-ac-al-ac-kayu-terang', 'cubix-series-3-seaters-ac-al-ac-kayu-gelap', 'CUBIX 3 SEATER', 'Sofa · AC-AL-AC', 'Sofa 3 seater CUBIX: susunan bawaan AC-AL-AC.'],
  ['cubixct', null, 'CUBIX COFFEE TABLE', 'Coffee table · kaca', 'Coffee table CUBIX: rangka kayu terbuka dengan top kaca.'],
  ['cubix-series-meja-sudut-side', null, 'CUBIX SIDE TABLE', 'Side table · kaca', 'Side table CUBIX: rangka kayu terbuka dengan top kaca.']
];
const WOOD = [['Terang', 'Kayu sungkai'], ['Gelap', 'Kayu oak']];
// model 3D yang sudah ada → halaman barunya (diisi hanya bila kosong)
const MODEL = { 'capra-deluxe-3s': 'assets/items/capra-deluxe-3s/model-ai.glb', 'capra-signature-3s': 'assets/items/capra-signature-3s/model-ai.glb',
  // 3D AI yang sudah di-approve (Developer Settings › 3D katalog) + VOID dimodelkan ulang di Blender
  'void-series-sky-b9': 'assets/items/void-series-sky-b9/model.glb', 'aether-series-cloud-m1': 'assets/items/aether-series-cloud-m1/model-ai.glb',
  'barione-3-seater': 'assets/items/barione-3-seater/model-ai.glb', 'sf3s-048': 'assets/items/sf3s-048/model-ai.glb', 'delune-series-sw04': 'assets/items/delune-series-sw04/model-ai.glb',
  'scandus-dining-table': 'assets/items/scandus-dining-table/model-ai.glb', 'cruiseo-dining-table': 'assets/items/cruiseo-dining-table/model-ai.glb' };

function curate(items) {
  const byId = {}; items.forEach((p) => { byId[p.id] = p; });
  const fill = (p, k, v) => { if (p[k] == null || p[k] === '') p[k] = v; };

  // CAPRA Deluxe Ottoman: belum ada halamannya → dari varian "Ottoman" halaman CAPRA Deluxe gabungan
  const dl = byId.capra, ov = dl && (dl.variants || []).find((v) => /ottoman/i.test(v.label));
  if (ov && !byId['capra-deluxe-ottoman']) {
    const p = Object.assign({}, dl, { id: 'capra-deluxe-ottoman', price: ov.price, was: ov.was, img: ov.img, images: [ov.img], variants: [], variant: -1, sold: 0, model: '', vmodels: undefined, url: dl.url, local: true });   // local: dipertahankan import berikutnya
    items.splice(items.indexOf(dl) + 1, 0, p); byId[p.id] = p;
  }
  const ot = byId['capra-deluxe-ottoman'];
  if (ot) Object.assign(ot, { name: 'CAPRA DELUXE OTTOMAN', type: 'Ottoman', cat: 'seats', status: 'aktif', customizable: true, desc: 'Ottoman seri CAPRA Deluxe — faux leather premium dengan rangka kayu solid.' });

  Object.keys(CAPRA).forEach((id) => {
    const p = byId[id]; if (!p) return;
    const [name, type, n] = CAPRA[id];
    Object.assign(p, { name, type, cat: 'seats', status: 'aktif', customizable: true });
    p.desc = String(p.desc || '').replace(/\b\d\s*Seater\b/i, n + ' Seater');   // deskripsi xionco.shop kadang salah jumlah seat
  });

  CUBIX.forEach(([tid, gid, name, type, lead]) => {
    const p = byId[tid]; if (!p) return;
    const g = gid && byId[gid];
    Object.assign(p, { name, type, status: 'aktif', customizable: true, series: 'cubix' });
    if (p.desc && p.desc.indexOf(lead) !== 0) p.desc = lead + '\n' + p.desc.replace(/^CUBIX SERIES[^\n]*\n/, '');
    if (g) {
      // kain dari xionco.shop (varian warna) → sub-pilihan di bawah kayu Terang & Gelap
      const fab = (p.variants || []).every((v) => v.hex) ? p.variants : null;
      if (fab && fab.length) {
        const subs = (photo) => fab.map((v) => ({ label: v.label, hex: v.hex, price: v.price || p.price, was: v.was || p.was, img: photo ? v.img : '' }));
        p.variants = WOOD.map(([lab, fabric], i) => ({ key: lab, label: lab, group: '', fabric, hex: null, price: p.price, was: p.was, img: i ? '' : p.img, nophoto: !!i, on: true, subs: subs(!i) }));   // foto Gelap menyusul (panel foto disembunyikan)
        p.variant = 0; p.vTitle = 'Kayu'; p.sTitle = 'Warna kain';
      }
      p.vmodels = Object.assign({}, p.vmodels || {}); fill(p.vmodels, 'Gelap', g.model);
      g.status = 'arsip'; g.note = 'Digabung ke ' + tid + ' (varian Gelap)';
    } else if ((p.variants || []).some((v) => v.label === 'Terang')) {
      p.vTitle = 'Kayu';
      p.variants.forEach((v) => { const w = WOOD.find((x) => x[0] === v.label); if (w) v.fabric = w[1]; });
      p.variant = p.variants.findIndex((v) => v.label === 'Terang');   // varian awal = Terang, sama dengan foto utama (toko memilih Gelap → model 3D beda dari foto)
    }
  });

  Object.keys(MODEL).forEach((id) => { if (byId[id]) fill(byId[id], 'model', MODEL[id]); });
  HIDE.forEach((id) => { if (byId[id]) byId[id].status = 'arsip'; });
  // AETHER: xionco.shop 83 = CLOUD K60 (60 cm), 82 = CLOUD K100 (100 cm). Model 102 cm lama (item aether) milik K100;
  // model K60 (61 cm) ada di item lokal aether-k60 (arsip, duplikat tanpa foto/harga)
  if (byId.aether && byId.aether.shopId === 83) {
    Object.assign(byId.aether, { name: 'AETHER CLOUD', type: 'K60 · Wall light', model: 'assets/items/aether-k60/model.glb', dims: '7 × 10 × 61 cm' });
    if (byId['aether-cloud-k100']) Object.assign(byId['aether-cloud-k100'], { name: 'AETHER CLOUD', type: 'K100 · Wall light', model: 'assets/items/aether/model.glb', dims: '7 × 11 × 102 cm' });
  }
  // VERK: varian Laci = meja yang sama + kabinet laci → di panggung hanya kabinetnya yang ditambahkan (tools/glb/part-diff.py)
  if (byId.verk && fs.existsSync(path.resolve(__dirname, '..', 'assets/items/verk/part-laci.glb'))) byId.verk.vparts = { Laci: 'assets/items/verk/part-laci.glb' };
  // POEL: satu model per lebar varian (tools/glb/fit.js dari model dasar 90cm, data/source/fit3d.json)
  if (byId.poel) { const vm = {}; [120, 160, 180, 200].forEach((w) => { const f = 'assets/items/poel/model-' + w + 'cm.glb'; if (fs.existsSync(path.resolve(__dirname, '..', f))) vm[w + 'cm'] = f; }); if (Object.keys(vm).length) byId.poel.vmodels = vm; }
  // AETHER M1: model AI (lampu cincin) salah → model prosedural asli (tools/glb/lamps.py); cadangan: batang K100
  if (byId['aether-series-cloud-m1']) byId['aether-series-cloud-m1'].model = fs.existsSync(path.resolve(__dirname, '..', 'assets/items/aether-series-cloud-m1/model.glb')) ? 'assets/items/aether-series-cloud-m1/model.glb' : 'assets/items/aether/model.glb';
  // Y1 · model turunan (tools/glb/derive.py) & prosedural — dipasang hanya bila file ada
  const has = (f) => fs.existsSync(path.resolve(__dirname, '..', f));
  const Y1 = {
    'poel-platform-bed-no-headrest': 'assets/items/poel-platform-bed-no-headrest/model.glb',
    'guise-sofa-set-l-3-2': 'assets/items/guise-sofa-set-l-3-2/model.glb',
    'cubix-series-throw-pillow-set': 'assets/items/cubix-series-throw-pillow-set/model.glb',
    'mieru-round-wall-mirror': 'assets/items/mieru-round-wall-mirror/model.glb'
  };
  items.filter((p) => /^acrylic-mirror-/.test(p.id)).forEach((p) => { Y1[p.id] = 'assets/items/' + p.id + '/model.glb'; });
  Object.keys(Y1).forEach((id) => { if (byId[id] && !byId[id].model && has(Y1[id])) byId[id].model = Y1[id]; });
  // OZ: nama merek BERSENI hanya di belakang layar (shopName/url) — pembeli melihat OZ (nama, id tautan #/p/, deskripsi)
  const oz = byId['berseni-oz-floor-lamp-stand'] || byId['oz-floor-lamp-stand'];
  items.forEach((p) => { if (p.desc) p.desc = String(p.desc).replace(/[ \t]*[\\|\u2022][ \t]*BERSENI\b/gi, ''); });   // semua produk (mis. AIERU)
  if (oz) { delete byId[oz.id]; Object.assign(oz, { id: 'oz-floor-lamp-stand', name: 'OZ', type: 'Floor Lamp Stand', desc: String(oz.desc || '').replace(/[ \t]*[\\|\u2022][ \t]*BERSENI\b/gi, '') }); byId[oz.id] = oz; }
  // model prosedural / turunan di assets/items/<id>/model.glb (tools/glb/lamps.py, derive.py) → dipakai bila produk belum punya model
  items.forEach((p) => { const f = 'assets/items/' + p.id + '/model.glb', fa = 'assets/items/' + p.id + '/model-ai.glb'; if (!p.model && has(f)) p.model = f; else if (!p.model && has(fa)) p.model = fa; });   // model-ai.glb = 3D AI (tools/ai3d.js)
  // Y3 · varian model lampu & posisi pengecualian (nama CLOUD tapi digantung / rel lintasan di plafon)
  [['aether-series-cloud-r7', { '100cm': 'assets/items/aether-series-cloud-r7/model-100cm.glb' }], ['oz-floor-lamp-stand', { Black: 'assets/items/oz-floor-lamp-stand/model-black.glb' }]].forEach(([id, vm]) => { if (byId[id] && Object.values(vm).every(has)) byId[id].vmodels = vm; });
  ['aether-cloud-q1', 'aether-series-magnetic-track-light'].forEach((id) => { if (byId[id]) byId[id].mount = 'ceiling'; });
  // Y5 · varian modul furnitur prosedural (tools/glb/furniture.py): model-<varian>.glb
  [['poel-modular-wardrobe', ['Drawer', 'Shelves']], ['poel-modular-cabinet', ['Door', 'Drawer']], ['aobo-cabinet-and-wardrobe', ['A1', 'A3', 'A4', 'C2']],
   ['vazra', ['2 Gang 1 Way', '3 Gang 1 Way', 'European Outlet']], ['storage-tray-each', ['M', 'L']],
   ['vazra-rechargeable-usb-type-c-aa-battery-baterai', ['4 pcs']], ['vazra-rechargeable-usb-type-c-aaa-battery-baterai', ['4 pcs']]].forEach(([id, vs]) => {
    const vm = {}; vs.forEach((v) => { const f = 'assets/items/' + id + '/model-' + v.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.glb'; if (has(f)) vm[v] = f; }); if (byId[id] && Object.keys(vm).length) byId[id].vmodels = vm;
  });
  if (byId['void-series-sky-b8'] && has('assets/items/void-series-sky-b8/model-4.glb')) byId['void-series-sky-b8'].vmodels = { '4 Lamps': 'assets/items/void-series-sky-b8/model-4.glb' };
  // ASTRAL 1 Seater = model SketchUp asli (ASTRAL 1 SEATER.skp, tersimpan di item arsip astral-1-seater) — bukan AI / prosedural
  if (byId.astral && has('assets/items/astral-1-seater/model.glb')) { byId.astral.model = 'assets/items/astral-1-seater/model.glb'; delete byId.astral.modelRot; }
  // Z2 · model AI bentuk kotak diganti model prosedural rapi (tools/glb/furniture.py) — model.glb menang atas model-ai.glb
  ['astral-ottoman', 'geom', 'scandus-dining-table', 'vazratrack', 'sf3s-101-1-seater', 'sf3s-101-2-seater', 'sf3s-101-3-seater'].forEach((id) => { const f = 'assets/items/' + id + '/model.glb'; if (byId[id] && has(f)) { byId[id].model = f; delete byId[id].modelRot; } });
  [['geom', ['Hitam', 'Abu-abu']], ['vazratrack', ['Pw 50 cm', 'PWS• Usb', 'PWS• Eu']]].forEach(([id, vs]) => { const vm = {}; vs.forEach((v) => { const f = 'assets/items/' + id + '/model-' + v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.glb'; if (has(f)) vm[v] = f; }); if (byId[id] && Object.keys(vm).length) byId[id].vmodels = vm; });
  // ROULED: satu meja per varian (ø70 / ø55), Complete Set = dua meja bersarang
  ['rouled', 'rouled-nested-coffee-table'].forEach((id) => { const p = byId[id]; if (!p || !has('assets/items/rouled/model-70.glb')) return; p.model = 'assets/items/rouled/model-70.glb'; p.vmodels = { 'Diameter 55': 'assets/items/rouled/model-55.glb', 'Complete Set': 'assets/items/rouled/model.glb' }; });
  // POEL tanpa headboard: satu model per lebar varian
  if (byId['poel-platform-bed-no-headrest']) { const vm = {}; [120, 160, 180, 200].forEach((w) => { const f = 'assets/items/poel-platform-bed-no-headrest/model-' + w + 'cm.glb'; if (has(f)) vm[w + ' cm'] = f; }); if (Object.keys(vm).length) byId['poel-platform-bed-no-headrest'].vmodels = vm; }
  const Y4ROT = {"capra-deluxe-2s":180,"capra-signature-1s":-90,"delune-series-sw14":-90,"aieru-wood-dining-stool":90};   // Y4: model AI yang menghadap salah arah (derajat, sama seperti modelRot panggung)
  Object.keys(Y4ROT).forEach((id) => { if (byId[id]) byId[id].modelRot = Y4ROT[id]; });
  // ASTRAL lama = xionco.shop 'ASTRAL - 1 Seater' (dulu bernama Signature 1–3 seater)
  if (byId.astral && byId.astral.shopId === 24) Object.assign(byId.astral, { name: 'ASTRAL', type: '1 Seater' });
  // kategori Koleksi = kategori xionco.shop (p.kats dari impor); kosong → dari kategori internal
  items.forEach((p) => { if (!p.kats || !p.kats.length) p.kats = (KATS_OF[p.cat] || ['Accent']).concat(p.cat === 'seats' && /ottoman/i.test(p.name + ' ' + p.type) ? ['Ottoman'] : []); });
  // Acrylic Mirror selalu paling bawah (urutan katalog)
  const mir = items.filter((p) => /^acrylic-mirror/.test(p.id)); if (mir.length) { const rest = items.filter((p) => mir.indexOf(p) < 0); items.length = 0; rest.concat(mir).forEach((p) => items.push(p)); }
  return items;
}
module.exports = { curate };

if (require.main === module) {
  const f = path.resolve(__dirname, '..', 'data', 'products.json'), db = JSON.parse(fs.readFileSync(f, 'utf8'));
  curate(db.items);
  fs.writeFileSync(f, JSON.stringify(db, null, 2) + '\n');
  const act = db.items.filter((p) => p.status === 'aktif');
  console.log('OK  ' + db.items.length + ' item, ' + act.length + ' aktif');
  act.filter((p) => /^(capra|cubix)/.test(p.id)).forEach((p) => console.log('    ' + p.id.padEnd(46) + p.name.padEnd(22) + (p.variants || []).map((v) => v.label + (v.subs && v.subs.length ? '(' + v.subs.length + ')' : '')).join(' ')));
}
