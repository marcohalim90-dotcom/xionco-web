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

const HIDE = ['x-coin', 'capra', 'capra-signature-series'];   // diarsip (data tetap ada)

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
    }
  });

  Object.keys(MODEL).forEach((id) => { if (byId[id]) fill(byId[id], 'model', MODEL[id]); });
  HIDE.forEach((id) => { if (byId[id]) byId[id].status = 'arsip'; });
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
