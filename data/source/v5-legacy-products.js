/* Produk Maison XIONCO v5 SEBELUM impor xionco.shop (sumber: xionco.com, Okt 2026).
   Hanya dibaca tools/import-shop.js — nama & deskripsi yang sudah dikurasi, urutan tampil,
   dan item yang tidak ada di xionco.shop. Tidak dimuat oleh situs. */
var XV = {};
XV.PRODUCTS = [
  // Seats
  { id: 'kyrios', cat: 'seats', name: 'KYRIOS', type: 'Sofa · 3 seater', price: 3978000, was: 7625000, img: '2024/07/XC.com-Thumbnail-4-1.png', bg: 'white',
    desc: 'Velvet tufted dengan base berlapis kuningan. Seri GUISE KYRIOS: tegas, dalam, dan hangat.', url: 'https://www.xionco.com/product/guise-kyrios-three-seat/' },
  { id: 'capra', cat: 'seats', name: 'CAPRA Deluxe', type: 'Sofa · faux leather premium', price: 2808000, was: 5382000, img: '2025/02/CAPRA_DELUXE_disp_1-removebg-preview.png',
    desc: 'Sofa kulit minimalis dengan rangka kayu solid. Tersedia 1, 2 dan 3 seater.', url: 'https://www.xionco.com/product/capra-deluxe-series/' },
  { id: 'guise', cat: 'seats', name: 'GUISE Signature', type: 'Sofa · 3 seater', price: 4068000, img: '2024/07/XC.com-Thumbnail-4.png', bg: 'white',
    desc: 'Proporsi rendah, jahitan tufting presisi, kaki kayu tapered.', url: 'https://www.xionco.com/product/guise-3-seater-2/' },
  { id: 'cameo', cat: 'seats', name: 'CAMEO', type: 'Sofa · 3 seater', price: 4592000, img: '2023/06/CAMEO.png',
    desc: 'Garis bersih, dudukan dalam, kaki baja ramping. Diam, tapi tidak membosankan.', url: 'https://www.xionco.com/product/cameo/' },
  { id: 'astral', cat: 'seats', name: 'ASTRAL Signature', type: 'Sofa · 1–3 seater', price: 2200000, from: true, img: '2023/06/XC.com-Thumbnail-7.png', bg: 'white',
    desc: 'Silhouette hitam dengan piping kontras. Salah satu seri terlaris XIONCO.', url: 'https://www.xionco.com/product/cubix-group-child-2-3/' },
  { id: 'orycto', cat: 'seats', name: 'ORYCTO', type: 'Sofa · 3 seater', price: 3481000, img: '2023/11/XC.com-Thumbnail-5.png', bg: 'white',
    desc: 'Lengan kulit, bantalan lebar, nyaman untuk ruang keluarga.', url: 'https://www.xionco.com/product/orycto-leather-arm-couch-three-seat-sofa-kulit-minimalis-xionco/' },
  { id: 'canis', cat: 'seats', name: 'CANIS', type: 'Grand Zen Luxury Sofa', price: null, img: '2022/09/XC.com-Thumbnail-8.png', bg: 'white',
    desc: 'Panel kayu di sandaran berfungsi sebagai meja kerja, rak display, dan penyimpanan.', url: 'https://www.xionco.com/product/canis/' },
  { id: 'cubix', cat: 'seats', name: 'CUBIX Modular', type: 'Armchair · Armless · Ottoman', price: null, img: '2022/09/XC.com-Thumbnail-5.png', bg: 'white',
    desc: 'Modul bebas susun. Konfigurasikan sendiri di Custom Studio.', url: 'https://www.xionco.com/product/cubix-series/', studio: true },
  { id: 'eorde', cat: 'seats', name: 'EORDE Sectional', type: 'Sofa · 5 seater · 2 electrical', price: 24800000, img: '2024/09/Sofa-Sectional_Main-View_Open.png', bg: 'dark',
    desc: 'Sectional dengan dua dudukan elektrik dan meja tersembunyi. Flagship XIONCO.', url: 'https://www.xionco.com/product/eorde-sofa-sectional-5-seater-2-electrical/' },
  { id: 'nora', cat: 'seats', name: 'NORA', type: 'Dining chair', price: null, img: '2023/06/NORA-DC.png',
    desc: 'Rangka baja hitam dengan dudukan empuk. Pasangan meja GEOM.', url: 'https://www.xionco.com/product/nora-chair/' },

  // Tables
  { id: 'geom', cat: 'tables', name: 'GEOM', type: 'Dining table', price: 1850000, img: '2023/06/GEOM.png',
    desc: 'Kaki geometris dari baja; daun meja HPL putih tulang.', url: 'https://www.xionco.com/product/geom-meja-makan/' },
  { id: 'verk', cat: 'tables', name: 'VERK', type: 'Integrated desk', price: 2574000, img: '2024/07/XC.com-Thumbnail-24.png', bg: 'white',
    desc: 'Meja kerja dengan rak terintegrasi. Satu bidang, semua kebutuhan.', url: 'https://www.xionco.com/product/verk-2/' },
  { id: 'hout', cat: 'tables', name: 'HOUT', type: 'Scandustrial coffee table', price: 1420000, img: '2022/09/XC.com-Thumbnail-25.png', bg: 'white',
    desc: 'Kayu hangat di atas rangka baja tipis.', url: 'https://www.xionco.com/product/hout/' },
  { id: 'trapezo', cat: 'tables', name: 'TRAPEZO', type: 'Collaborative desk', price: 1230000, img: '2023/06/XC.com-Thumbnail-19.png', bg: 'white',
    desc: 'Bentuk trapesium untuk ruang kerja kolaboratif.', url: 'https://www.xionco.com/product/trapezo/' },
  { id: 'rouled', cat: 'tables', name: 'ROULED', type: 'Nesting coffee table', price: 1075000, img: '2022/09/XC.com-Thumbnail-20.png', bg: 'white',
    desc: 'Dua meja bulat yang saling bersarang.', url: 'https://www.xionco.com/product/rouled-2/' },
  { id: 'cubixct', cat: 'tables', name: 'CUBIX CT', type: 'Coffee table · glass', price: 1120000, img: '2024/07/XC.com-Thumbnail-16.png', bg: 'white',
    desc: 'Rangka kayu terbuka dengan kaca bening.', url: 'https://www.xionco.com/product/cubix-meja-tamu-coffee-table/' },
  { id: 'arze', cat: 'tables', name: 'ARZE', type: 'Personal workstation', price: 1269000, img: '2022/09/XC.com-Thumbnail-27.png', bg: 'white',
    desc: 'Meja kerja ringkas dengan rak atas.', url: 'https://www.xionco.com/product/arze/' },
  { id: 'l7', cat: 'tables', name: 'L7', type: 'Personal workstation', price: 1110000, img: '2024/12/XC.com-Thumbnail-18.png', bg: 'white',
    desc: 'Siluet miring yang ringan, untuk sudut kerja di rumah.', url: 'https://www.xionco.com/product/l7-meja-kantor/' },
  { id: 'recta', cat: 'tables', name: 'RECTA', type: 'Coffee table', price: 915000, img: '2022/09/RECTA.png',
    desc: 'Kaca dan baja hitam. Hampir tidak terlihat.', url: 'https://www.xionco.com/product/recta/' },
  { id: 'pluq', cat: 'tables', name: 'PLUQ', type: 'Coffee table', price: 820000, img: '2023/06/PLUQ.png',
    desc: 'Daun meja organik di atas kaki kayu gelap.', url: 'https://www.xionco.com/product/belt/' },
  { id: 'hexter', cat: 'tables', name: 'HEXTER', type: 'Modular side table', price: 635000, img: '2022/09/XC.com-Thumbnail-21.png', bg: 'white',
    desc: 'Heksagonal, bisa disusun berdampingan.', url: 'https://www.xionco.com/product/hexter/' },

  // Bedframe
  { id: 'somno', cat: 'bedframe', name: 'SOMNO', type: 'Platform bed', price: 2040000, img: '2023/06/WhatsApp-Image-2024-08-03-at-16.14.45.jpeg', bg: 'white',
    desc: 'Headboard berlapis kain, platform rendah.', url: 'https://www.xionco.com/product/somno/' },
  { id: 'poel', cat: 'bedframe', name: 'POEL', type: 'Platform bed · divan', price: 1800000, img: '2024/12/POEL-308x322-1.png',
    desc: 'Rangka baja dengan headboard kayu.', url: 'https://www.xionco.com/product/poel-platform-bed-tempat-tidur-divan-minimalis/' },
  { id: 'ashara', cat: 'bedframe', name: 'ASHARA 34', type: 'Adjustable bed · electrical', price: null, img: '2024/09/Dipan_Nakes_Main.png', bg: 'dark',
    desc: 'Sandaran elektrik yang bisa diatur. Tidur, membaca, bekerja.', url: 'https://www.xionco.com/product/ashara-34-adjustable-bed-electrical/' },

  // Cabinet
  { id: 'syme', cat: 'cabinet', name: 'SYME', type: 'Wardrobe', price: 9922500, img: '2023/06/345173b5-6001-4c72-bfbf-d0856762145a-removebg-preview.png',
    desc: 'Pintu geser gelap dengan aksen kuningan.', url: 'https://www.xionco.com/product/syme/' },
  { id: 'qaztac', cat: 'cabinet', name: 'QAZTAC', type: 'Industrial nightstand', price: 1250000, img: '2024/07/QAZTAC-Thumbnail-3-e1734703263864.png',
    desc: 'Laci kayu dalam rangka baja hitam.', url: 'https://www.xionco.com/product/qaztac-meja-tempat-tidur-nakas/' },
  { id: 'lucid', cat: 'cabinet', name: 'LUCID', type: 'Open shelf', price: 1150000, img: '2023/06/LUCID.png',
    desc: 'Rangka terbuka, ringan secara visual.', url: 'https://www.xionco.com/product/nora-stool/' },
  { id: 'regale', cat: 'cabinet', name: 'REGALE', type: 'Kitchenette', price: null, img: '2024/09/REGALE-Thumbnail-6.png',
    desc: 'Kitchen set ringkas untuk apartemen dan pantry kantor.', url: 'https://www.xionco.com/product/regale-kitchenette-kitchen-set-concepted-dapur-minimalis-xionco/' },

  // Decor & light
  { id: 'aether', cat: 'decor', name: 'AETHER Cloud K100', type: 'Wall light', price: 354000, from: true, img: '2023/06/AETHER-K100.png',
    desc: 'Garis cahaya vertikal. Seri AETHER: Cloud, Hill, Sky, Terra.', url: 'https://www.xionco.com/product/aether-series/' },
  { id: 'aetherk80', cat: 'decor', name: 'AETHER K80', type: 'Floor light', price: null, img: '2023/06/AETHER-K80.png',
    desc: 'Lampu lantai ramping dengan diffuser bulat.', url: 'https://www.xionco.com/product/aether-series/' },
  { id: 'uruz', cat: 'decor', name: 'URUZ II', type: 'Steel towel rack', price: 550000, img: '2023/06/URUZ.png',
    desc: 'Baja hitam, garis minimal.', url: 'https://www.xionco.com/product/uruz/' },
  { id: 'kyoukai', cat: 'decor', name: 'KYOUKAI', type: 'Wall slat panel', price: null, img: '2023/06/KYOUKAI.png',
    desc: 'Panel kisi kayu untuk dinding dan partisi.', url: 'https://www.xionco.com/product/kyoukai/' },

  // Smart
  { id: 'vazra', cat: 'smart', name: 'VAZRA', type: 'Power switch & outlet', price: 132000, img: '2024/07/ad7dd3e0-5728-45d8-98cb-29ca095aff47-removebg-preview.png',
    desc: 'Saklar dan stop kontak modular berdesain monolitik.', url: 'https://www.xionco.com/product/vazra-power-switch-and-outlet/' },
  { id: 'vazratrack', cat: 'smart', name: 'VAZRA Power Track', type: 'Socket track', price: null, img: '2024/12/Vazra_power_track_disp_1-removebg-preview.png',
    desc: 'Rel listrik untuk meja meeting: geser, pasang, selesai.', url: 'https://www.xionco.com/product/vazra-series-power-track-socket-stop-kontak/' }
];

window.XV_LEGACY = XV.PRODUCTS;
