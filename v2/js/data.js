/* ==========================================================================
   XIONCO v2 — Data (produk, harga, gambar, konten)
   Sumber: xionco.com (gambar & nama produk) dan xionco.shop (harga, Okt 2026).
   Gambar dipanggil langsung dari xionco.com (website milik XIONCO sendiri).
   ========================================================================== */
window.XV = window.XV || {};

XV.WA = '6282240408055';                       // WhatsApp resmi (xionco.com)
XV.SHOP = 'https://xionco.shop/';
XV.IMG = 'https://www.xionco.com/wp-content/uploads/';

/* Logo XIONCO (path asli dari xionco.com/logo.svg, viewBox 0 0 206 28) */
XV.LOGO = 'M0.584 0.971998H5.012L21.968 27H17.504L0.584 0.971998ZM0.224 27L9.26 12.852L10.952 16.236L4.544 27H0.224ZM11.06 11.592L17.396 0.971998H21.608L12.932 14.508L11.06 11.592ZM38.3221 0.971998H41.8141V27H38.3221V0.971998ZM59.0615 14.004C59.0615 12.204 59.3975 10.512 60.0695 8.928C60.7655 7.32 61.7255 5.904 62.9495 4.68C64.1735 3.432 65.5775 2.46 67.1615 1.764C68.7695 1.044 70.4975 0.684 72.3455 0.684C74.1695 0.684 75.8735 1.044 77.4575 1.764C79.0655 2.46 80.4815 3.432 81.7055 4.68C82.9535 5.904 83.9255 7.32 84.6215 8.928C85.3175 10.512 85.6655 12.204 85.6655 14.004C85.6655 15.852 85.3175 17.58 84.6215 19.188C83.9255 20.796 82.9535 22.212 81.7055 23.436C80.4815 24.636 79.0655 25.584 77.4575 26.28C75.8735 26.952 74.1695 27.288 72.3455 27.288C70.4975 27.288 68.7695 26.952 67.1615 26.28C65.5775 25.608 64.1735 24.672 62.9495 23.472C61.7255 22.272 60.7655 20.868 60.0695 19.26C59.3975 17.652 59.0615 15.9 59.0615 14.004ZM62.6615 14.04C62.6615 15.408 62.9135 16.692 63.4175 17.892C63.9215 19.068 64.6175 20.112 65.5055 21.024C66.3935 21.936 67.4255 22.656 68.6015 23.184C69.7775 23.688 71.0495 23.94 72.4175 23.94C73.7615 23.94 75.0215 23.688 76.1975 23.184C77.3735 22.656 78.3935 21.936 79.2575 21.024C80.1215 20.112 80.8055 19.068 81.3095 17.892C81.8135 16.692 82.0655 15.396 82.0655 14.004C82.0655 12.636 81.8135 11.352 81.3095 10.152C80.8055 8.928 80.1095 7.86 79.2215 6.948C78.3335 6.036 77.3015 5.328 76.1255 4.824C74.9495 4.296 73.6895 4.032 72.3455 4.032C70.9775 4.032 69.7055 4.296 68.5295 4.824C67.3535 5.352 66.3215 6.072 65.4335 6.984C64.5455 7.896 63.8615 8.964 63.3815 10.188C62.9015 11.388 62.6615 12.672 62.6615 14.04ZM125.475 27.828L105.351 7.416L106.359 7.668L106.431 27H102.939V0.179998H103.119L123.027 20.664L122.199 20.484L122.127 0.971998H125.583V27.828H125.475ZM163.575 25.056C163.143 25.344 162.555 25.668 161.811 26.028C161.067 26.388 160.191 26.688 159.183 26.928C158.199 27.168 157.119 27.288 155.943 27.288C153.927 27.264 152.103 26.904 150.471 26.208C148.863 25.512 147.495 24.564 146.367 23.364C145.239 22.164 144.363 20.784 143.739 19.224C143.139 17.64 142.839 15.96 142.839 14.184C142.839 12.24 143.151 10.452 143.775 8.82C144.423 7.164 145.323 5.736 146.475 4.536C147.627 3.312 148.983 2.364 150.543 1.692C152.127 1.02 153.855 0.684 155.727 0.684C157.287 0.684 158.703 0.899999 159.975 1.332C161.247 1.74 162.339 2.232 163.251 2.808L161.847 6.048C161.127 5.568 160.251 5.112 159.219 4.68C158.211 4.248 157.083 4.032 155.835 4.032C154.563 4.032 153.363 4.284 152.235 4.788C151.107 5.292 150.111 6 149.247 6.912C148.383 7.824 147.699 8.892 147.195 10.116C146.715 11.316 146.475 12.612 146.475 14.004C146.475 15.42 146.691 16.74 147.123 17.964C147.579 19.164 148.215 20.208 149.031 21.096C149.871 21.984 150.879 22.68 152.055 23.184C153.231 23.688 154.551 23.94 156.015 23.94C157.335 23.94 158.511 23.736 159.543 23.328C160.575 22.92 161.427 22.464 162.099 21.96L163.575 25.056ZM179.226 14.004C179.226 12.204 179.562 10.512 180.234 8.928C180.93 7.32 181.89 5.904 183.114 4.68C184.338 3.432 185.742 2.46 187.326 1.764C188.934 1.044 190.662 0.684 192.51 0.684C194.334 0.684 196.038 1.044 197.622 1.764C199.23 2.46 200.646 3.432 201.87 4.68C203.118 5.904 204.09 7.32 204.786 8.928C205.482 10.512 205.83 12.204 205.83 14.004C205.83 15.852 205.482 17.58 204.786 19.188C204.09 20.796 203.118 22.212 201.87 23.436C200.646 24.636 199.23 25.584 197.622 26.28C196.038 26.952 194.334 27.288 192.51 27.288C190.662 27.288 188.934 26.952 187.326 26.28C185.742 25.608 184.338 24.672 183.114 23.472C181.89 22.272 180.93 20.868 180.234 19.26C179.562 17.652 179.226 15.9 179.226 14.004ZM182.826 14.04C182.826 15.408 183.078 16.692 183.582 17.892C184.086 19.068 184.782 20.112 185.67 21.024C186.558 21.936 187.59 22.656 188.766 23.184C189.942 23.688 191.214 23.94 192.582 23.94C193.926 23.94 195.186 23.688 196.362 23.184C197.538 22.656 198.558 21.936 199.422 21.024C200.286 20.112 200.97 19.068 201.474 17.892C201.978 16.692 202.23 15.396 202.23 14.004C202.23 12.636 201.978 11.352 201.474 10.152C200.97 8.928 200.274 7.86 199.386 6.948C198.498 6.036 197.466 5.328 196.29 4.824C195.114 4.296 193.854 4.032 192.51 4.032C191.142 4.032 189.87 4.296 188.694 4.824C187.518 5.352 186.486 6.072 185.598 6.984C184.71 7.896 184.026 8.964 183.546 10.188C183.066 11.388 182.826 12.672 182.826 14.04Z';

/* Kategori koleksi (urutan = urutan di galeri horizontal) */
XV.CATEGORIES = [
  { id: 'seats',    label: 'Seats',    note: 'Sofa & kursi' },
  { id: 'tables',   label: 'Tables',   note: 'Meja makan, kopi & kerja' },
  { id: 'bedframe', label: 'Bedframe', note: 'Tempat tidur' },
  { id: 'cabinet',  label: 'Cabinet',  note: 'Penyimpanan' },
  { id: 'decor',    label: 'Decor & Light', note: 'Lampu & aksesori' },
  { id: 'smart',    label: 'Smart',    note: 'Kelistrikan VAZRA' }
];

/* Produk — price null = "Tanya harga" (belum ada di xionco.shop)
   bg: 'white' → gambar berlatar putih (di-blend multiply di kartu terang)
       'dark'  → foto berlatar hitam (tampil sebagai kartu gelap)            */
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

/* Museboard (foto proyek dari xionco.com) */
XV.MUSE = [
  { img: '2025/08/2-4.png', title: 'Electrical solution', note: 'Meeting room · VAZRA' },
  { img: '2025/08/3-4.png', title: 'Idea comes true', note: 'Dari sketsa ke produksi' },
  { img: '2025/08/4-4.png', title: 'Let there be light', note: 'Commercial lighting' },
  { img: '2025/08/5-2.png', title: 'Custom ceiling', note: 'Ruang rapat' },
  { img: '2025/08/6-2.png', title: 'Lighting design', note: 'Koridor hotel' },
  { img: '2025/08/7-1.png', title: 'Luxurious', note: 'Living room' },
  { img: '2025/05/XIONCO-HERO-PRODUCT-II-1.png', title: 'Leather detail', note: 'Material honesty' },
  { img: '2025/05/ChatGPT-Image-May-16-2025-06_29_52-AM.png', title: 'Solid wood', note: 'Jepara · Mantingan' },
  { img: '2023/06/HERO-PHOTO-PRODUCT-XIONCO-2023-4.png', title: 'Living with light', note: 'AETHER series' }
];

/* For Business — layanan */
XV.SERVICES = [
  { n: '01', title: 'Space Plan', note: 'Tata ruang & alur kerja kantor, retail, hospitality', img: '2025/08/Solusi-Design-untuk-Project-Anda.jpg' },
  { n: '02', title: 'Product', note: 'Furnitur standar & custom dalam jumlah besar', img: '2025/08/1-3.png' },
  { n: '03', title: 'Interior', note: 'Desain & visualisasi interior lengkap', img: '2025/08/9.png' },
  { n: '04', title: 'Built-in', note: 'Kabinet, panel dinding, plafon & kelistrikan custom', img: '2025/08/8.png' }
];

XV.CLIENTS = ['SOGO', 'H&M', 'BRI', 'BCA', 'TRANS7', 'NEO SOHO', 'FORBES INDONESIA'];

/* Pabrik (dari halaman About xionco.com) */
XV.FACTORIES = [
  { n: '01', place: 'Jepara · Mantingan', role: 'Pengolahan kayu', text: 'Curing bahan baku dan pembuatan komponen kayu.', lon: 110.67, lat: -6.59 },
  { n: '02', place: 'Cirendeu', role: 'Finishing & metal', text: 'Finishing, pengelasan, lini multiboard / HPL.', lon: 106.76, lat: -6.31 },
  { n: '03', place: 'Pondok Pinang I', role: 'Upholstery', text: 'Jahit, busa, dan pelapisan kain / kulit.', lon: 106.78, lat: -6.27 },
  { n: '04', place: 'Pondok Pinang II', role: 'Final & packaging', text: 'Quality control, pengemasan, dan pengiriman.', lon: 106.79, lat: -6.28 }
];

/* Custom Studio — CUBIX Modular (harga = ESTIMASI DEMO, bukan harga resmi) */
XV.STUDIO = {
  seatPrice: 1250000,
  armPrice: 450000,
  ottomanPrice: 890000,
  seatW: 72, armW: 16, depth: 86, height: 74,
  fabrics: [
    { id: 'fb01', code: 'FB 01', name: 'Graphite', color: '#4a4846', type: 'fabric' },
    { id: 'fb02', code: 'FB 02', name: 'Ash', color: '#8d8a86', type: 'fabric' },
    { id: 'fb03', code: 'FB 03', name: 'Oat', color: '#c7bba7', type: 'fabric' },
    { id: 'fb04', code: 'FB 04', name: 'Sand', color: '#b39b78', type: 'fabric' },
    { id: 'fb05', code: 'FB 05', name: 'Moss', color: '#5f6450', type: 'fabric' },
    { id: 'fb06', code: 'FB 06', name: 'Clay', color: '#8e5d45', type: 'fabric' },
    { id: 'fl01', code: 'FL 01', name: 'Ink Leather', color: '#262423', type: 'leather' },
    { id: 'fl02', code: 'FL 02', name: 'Cognac Leather', color: '#7b4a2c', type: 'leather' }
  ],
  leatherFactor: 1.2,
  bases: [
    { id: 'oak', name: 'Oak', color: '#c8a678', add: 0 },
    { id: 'walnut', name: 'Walnut', color: '#5a3d2b', add: 250000 },
    { id: 'steel', name: 'Black steel', color: '#1d1c1b', add: 150000 },
    { id: 'brass', name: 'Brass', color: '#b8924f', add: 450000 }
  ]
};

/* Ukuran thumbnail WordPress yang tersedia di xionco.com (sudah dicek satu per satu).
   Kartu, museboard, keranjang & pencarian memakai versi kecil; hero & quick view memakai file asli. */
XV.SIZES = {
  '2025/08/2-4.png': [1024, 768], '2025/08/3-4.png': [1024, 768], '2025/08/4-4.png': [1024, 768],
  '2025/08/5-2.png': [1024, 768], '2025/08/6-2.png': [1024, 768], '2025/08/7-1.png': [1024, 768],
  '2025/05/XIONCO-HERO-PRODUCT-II-1.png': [1024, 768],
  '2025/05/ChatGPT-Image-May-16-2025-06_29_52-AM.png': [768],
  '2023/06/HERO-PHOTO-PRODUCT-XIONCO-2023-4.png': [768],
  '2024/07/XC.com-Thumbnail-4-1.png': [1024, 768], '2024/07/XC.com-Thumbnail-4.png': [768],
  '2023/06/CAMEO.png': [768], '2023/06/XC.com-Thumbnail-7.png': [1024, 768],
  '2023/11/XC.com-Thumbnail-5.png': [1024, 768], '2022/09/XC.com-Thumbnail-8.png': [1024, 768],
  '2024/09/Sofa-Sectional_Main-View_Open.png': [1024, 768], '2023/06/NORA-DC.png': [1024, 768],
  '2023/06/GEOM.png': [768], '2024/07/XC.com-Thumbnail-24.png': [1024, 768],
  '2022/09/XC.com-Thumbnail-25.png': [1024, 768], '2023/06/XC.com-Thumbnail-19.png': [1024, 768],
  '2022/09/XC.com-Thumbnail-20.png': [1024, 768], '2024/07/XC.com-Thumbnail-16.png': [1024, 768],
  '2022/09/XC.com-Thumbnail-27.png': [1024, 768], '2024/12/XC.com-Thumbnail-18.png': [1024, 768],
  '2022/09/RECTA.png': [768], '2023/06/PLUQ.png': [768], '2022/09/XC.com-Thumbnail-21.png': [1024, 768],
  '2023/06/WhatsApp-Image-2024-08-03-at-16.14.45.jpeg': [768], '2024/09/Dipan_Nakes_Main.png': [1024, 768],
  '2023/06/LUCID.png': [768], '2024/09/REGALE-Thumbnail-6.png': [768], '2023/06/AETHER-K100.png': [768],
  '2023/06/AETHER-K80.png': [768], '2023/06/URUZ.png': [768], '2023/06/KYOUKAI.png': [768]
};
